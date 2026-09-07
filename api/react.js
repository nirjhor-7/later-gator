const { createClient } = require('@supabase/supabase-js');

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

// In-memory rate limiter per IP: max 25 reaction clicks per 10 seconds
const reactionRateMap = new Map();

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!supabase) {
        return res.status(500).json({ error: 'Database credentials missing' });
    }

    try {
        const { taskId, reactionType, action } = req.body || {};

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

        // Map reaction type to column name
        const colName = `${reactionType}_count`;
        const delta = action === 'remove' ? -1 : 1;

        // Fetch current counts from tasks table
        const { data: task, error: fetchErr } = await supabase
            .from('tasks')
            .select('id, same_count, valid_count, rip_count')
            .eq('id', taskId)
            .single();

        if (fetchErr) {
            // Column may not exist yet in Supabase (if SQL migration hasn't run yet)
            return res.status(200).json({
                ok: true,
                status: 'optimistic_fallback',
                message: 'Recorded locally (run SQL migration to enable global sync)',
                reactionType,
                action: action || 'add'
            });
        }

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const currentVal = (task[colName] != null ? task[colName] : 0);
        const newVal = Math.max(0, currentVal + delta);

        const updateObj = {};
        updateObj[colName] = newVal;

        const { error: updateErr } = await supabase
            .from('tasks')
            .update(updateObj)
            .eq('id', taskId);

        if (updateErr) {
            return res.status(200).json({
                ok: true,
                status: 'optimistic_fallback',
                reactionType,
                action: action || 'add'
            });
        }

        return res.status(200).json({
            ok: true,
            taskId,
            reactionType,
            counts: {
                same: reactionType === 'same' ? newVal : (task.same_count || 0),
                valid: reactionType === 'valid' ? newVal : (task.valid_count || 0),
                rip: reactionType === 'rip' ? newVal : (task.rip_count || 0)
            }
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
