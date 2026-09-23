const { createClient } = require('@supabase/supabase-js');

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

// In-memory rate limiter per IP: max 25 reaction clicks per 10 seconds
const reactionRateMap = new Map();

module.exports = async function handler(req, res) {
    if (!supabase) {
        return res.status(500).json({ error: 'Database credentials missing' });
    }

    // ── GET: Return all reactions this session has made ──────────────────────
    if (req.method === 'GET') {
        const sessionId = req.query.sessionId;
        const gatorId = req.query.gatorId;
        if (!sessionId && !gatorId) {
            return res.status(200).json({ reactions: {} });
        }
        try {
            let query = supabase.from('user_reactions').select('task_id, reaction_type');
            if (gatorId) {
                query = query.eq('gator_id', gatorId);
            } else {
                query = query.eq('session_id', sessionId);
            }
            const { data, error } = await query;

            if (error) {
                return res.status(200).json({ reactions: {} });
            }

            const reactions = {};
            (data || []).forEach(row => {
                reactions[row.task_id] = row.reaction_type;
            });
            return res.status(200).json({ reactions });
        } catch (err) {
            return res.status(200).json({ reactions: {} });
        }
    }


    // ── POST: Record / remove a reaction ─────────────────────────────────────
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { taskId, reactionType, action, sessionId, gatorId } = req.body || {};


        if (!taskId) {
            return res.status(400).json({ error: 'Task ID required' });
        }

        const validReactions = ['same', 'valid', 'rip'];
        if (!validReactions.includes(reactionType)) {
            return res.status(400).json({ error: 'Invalid reaction type. Must be same, valid, or rip.' });
        }

        const rawIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
        const clientIp = rawIp.split(',')[0].trim() || 'unknown';

        // Velocity protection
        const now = Date.now();
        const userHistory = reactionRateMap.get(clientIp) || [];
        const recentRequests = userHistory.filter(ts => now - ts < 10000);
        if (recentRequests.length >= 25) {
            return res.status(429).json({ error: 'Stamping too quickly! Relax.' });
        }
        recentRequests.push(now);
        reactionRateMap.set(clientIp, recentRequests);

        const colName = `${reactionType}_count`;
        const delta = action === 'remove' ? -1 : 1;

        // ── 1. Update global reaction counts on the task ──────────────────────
        // Read current counts first
        const { data: task, error: fetchErr } = await supabase
            .from('tasks')
            .select('id, same_count, valid_count, rip_count')
            .eq('id', taskId)
            .single();

        if (fetchErr || !task) {
            return res.status(200).json({
                ok: true,
                status: 'optimistic_fallback',
                message: 'Recorded locally',
                reactionType,
                action: action || 'add'
            });
        }

        const currentVal = (task[colName] != null ? task[colName] : 0);
        const newVal = Math.max(0, currentVal + delta);
        const updateObj = {};
        updateObj[colName] = newVal;

        await supabase.from('tasks').update(updateObj).eq('id', taskId);

        // ── 2. Update per-session reaction record ─────────────────────────────
        // IMPORTANT: delete filter includes reaction_type to prevent
        // switching races from nuking the newly-added reaction
        if (sessionId || gatorId) {
            if (action === 'remove') {
                let q = supabase.from('user_reactions').delete();
                if (gatorId) {
                    q = q.eq('gator_id', gatorId).eq('task_id', taskId).eq('reaction_type', reactionType);
                } else {
                    q = q.eq('session_id', sessionId).eq('task_id', taskId).eq('reaction_type', reactionType);
                }
                await q;
            } else {
                const upsertPayload = { task_id: taskId, reaction_type: reactionType };
                if (gatorId) {
                    upsertPayload.gator_id = gatorId;
                    await supabase.from('user_reactions').upsert(
                        upsertPayload,
                        { onConflict: 'gator_id,task_id' }
                    );
                }
                if (sessionId) {
                    await supabase.from('user_reactions').upsert(
                        { ...upsertPayload, session_id: sessionId },
                        { onConflict: 'session_id,task_id' }
                    );
                }
            }
        }

        // ── 3. Re-read counts after write for accurate response ───────────────
        const { data: updated } = await supabase
            .from('tasks')
            .select('same_count, valid_count, rip_count')
            .eq('id', taskId)
            .single();

        const freshCounts = updated || task;

        return res.status(200).json({
            ok: true,
            taskId,
            reactionType,
            counts: {
                same: freshCounts.same_count || 0,
                valid: freshCounts.valid_count || 0,
                rip: freshCounts.rip_count || 0
            }
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
