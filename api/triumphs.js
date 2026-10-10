const { createClient } = require('@supabase/supabase-js');

let supabase = null;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
if (process.env.SUPABASE_URL && supabaseKey) {
    supabase = createClient(process.env.SUPABASE_URL, supabaseKey);
}

// In-memory cache for recent triumphs
let inMemoryTriumphs = [];

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Gator-Token, x-gator-token');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ── GET: Fetch accomplished triumphs ─────────────────────────────────────
    if (req.method === 'GET') {
        res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=15');

        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('triumphs')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(60);

                if (!error && Array.isArray(data)) {
                    const dbIds = new Set(data.map(d => String(d.id)));
                    const memOnly = inMemoryTriumphs.filter(m => !dbIds.has(String(m.id)));
                    return res.status(200).json([...memOnly, ...data]);
                }
            } catch (err) {
                // Fall back gracefully to memory cache
            }
        }

        return res.status(200).json(inMemoryTriumphs);
    }

    // ── POST: Record a new triumph or community reaction ─────────────────────
    if (req.method === 'POST') {
        try {
            const token = req.headers['x-gator-token'] || req.headers['X-Gator-Token'];
            if (token !== 'chomp-chomp') {
                return res.status(403).json({ error: "No gators allowed." });
            }

            const body = req.body || {};

            // 1. Reaction action: praise, cheers, respect (react or remove)
            if (body.action === 'react' || body.action === 'remove') {
                const { triumphId, reactionType } = body;
                if (!triumphId || !['praise', 'cheers', 'respect'].includes(reactionType)) {
                    return res.status(400).json({ error: 'Invalid reaction request' });
                }

                const isRemove = body.action === 'remove';
                const col = `${reactionType}_count`;

                // Update in-memory
                const memItem = inMemoryTriumphs.find(t => String(t.id) === String(triumphId));
                if (memItem) {
                    memItem[col] = isRemove ? Math.max(0, (memItem[col] || 0) - 1) : (memItem[col] || 0) + 1;
                }

                if (supabase) {
                    try {
                        const { data } = await supabase
                            .from('triumphs')
                            .select(col)
                            .eq('id', triumphId)
                            .maybeSingle();

                        if (data) {
                            const currentVal = data[col] || 0;
                            const updatedVal = isRemove ? Math.max(0, currentVal - 1) : currentVal + 1;
                            const updateObj = {};
                            updateObj[col] = updatedVal;
                            await supabase.from('triumphs').update(updateObj).eq('id', triumphId);
                            return res.status(200).json({ ok: true, triumphId, reactionType, count: updatedVal });
                        }
                    } catch (e) {}
                }

                return res.status(200).json({
                    ok: true,
                    triumphId,
                    reactionType,
                    count: memItem ? memItem[col] : (isRemove ? 0 : 1)
                });
            }

            // 2. Create new accomplishment / triumph
            const {
                taskId,
                text,
                name,
                country,
                avoidedDuration,
                commendationTitle,
                gatorId
            } = body;

            if (!text) {
                return res.status(400).json({ error: 'Accomplishment text required' });
            }

            const cleanText = String(text).trim().replace(/^\[PANIC\]\s*/i, '');
            const cleanName = (name || 'Anonymous').trim();
            const cleanCountry = (country || 'Parts Unknown').trim();

            const newTriumph = {
                id: Date.now(),
                task_id: taskId ? String(taskId) : null,
                text: cleanText,
                author_name: cleanName,
                country: cleanCountry,
                avoided_duration: avoidedDuration || 'Several grueling days',
                time_taken: null,
                lore: null,
                commendation_title: commendationTitle || 'Order of the 11th-Hour Miracle',
                praise_count: 0,
                cheers_count: 0,
                respect_count: 0,
                created_at: new Date().toISOString()
            };

            // Remove from active tasks table so it graduates off the wire
            if (supabase) {
                if (taskId) {
                    try {
                        const parsedId = parseInt(taskId, 10);
                        if (!isNaN(parsedId)) {
                            await supabase.from('dispatch_notifications').delete().eq('task_id', String(parsedId));
                            await supabase.from('user_reactions').delete().eq('task_id', String(parsedId));
                            await supabase.from('tasks').delete().eq('id', parsedId);
                        }
                    } catch (delErr) {
                        console.warn('Could not auto-delete task from tasks table:', delErr.message);
                    }
                }

                // Insert into triumphs table
                try {
                    const insertRecord = {
                        task_id: newTriumph.task_id,
                        text: newTriumph.text,
                        author_name: newTriumph.author_name,
                        country: newTriumph.country,
                        avoided_duration: newTriumph.avoided_duration,
                        time_taken: null,
                        lore: null,
                        commendation_title: newTriumph.commendation_title,
                        praise_count: 0,
                        cheers_count: 0,
                        respect_count: 0
                    };
                    const { data: dbRow, error: insertErr } = await supabase
                        .from('triumphs')
                        .insert([insertRecord])
                        .select()
                        .single();

                    if (!insertErr && dbRow) {
                        newTriumph.id = dbRow.id;
                    }
                } catch (dbErr) {
                    console.warn('Could not save to triumphs table (fallback to memory):', dbErr.message);
                }
            }

            inMemoryTriumphs.unshift(newTriumph);
            if (inMemoryTriumphs.length > 100) inMemoryTriumphs.pop();

            return res.status(201).json({
                ok: true,
                message: "Triumph ratified by the Bureau of Accomplished Affairs!",
                triumph: newTriumph
            });

        } catch (err) {
            console.error('Server error in /api/triumphs:', err);
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
