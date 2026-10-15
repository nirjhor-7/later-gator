const { createClient } = require('@supabase/supabase-js');

let supabase = null;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
if (process.env.SUPABASE_URL && supabaseKey) {
    supabase = createClient(process.env.SUPABASE_URL, supabaseKey);
}

// In-memory cache for recent triumphs
let inMemoryTriumphs = [];

// Helper to unpack a triumph stored in tasks table fallback
function parseTaskTriumph(row) {
    if (!row || typeof row.text !== 'string' || !row.text.startsWith('[CONQUERED]')) return null;
    try {
        const jsonStr = row.text.replace(/^\[CONQUERED\]\s*/, '');
        const data = JSON.parse(jsonStr);
        return {
            id: row.id,
            task_id: data.taskId ? String(data.taskId) : null,
            text: data.text || '',
            author_name: row.city || data.author_name || 'Anonymous',
            country: row.country || data.country || 'Parts Unknown',
            avoided_duration: data.avoidedDuration || data.avoided_duration || 'Several grueling days',
            time_taken: null,
            lore: null,
            commendation_title: data.commendationTitle || data.commendation_title || 'Order of the 11th-Hour Miracle',
            praise_count: row.same_count != null ? row.same_count : (data.praise || 0),
            cheers_count: row.valid_count != null ? row.valid_count : (data.cheers || 0),
            respect_count: row.rip_count != null ? row.rip_count : (data.respect || 0),
            created_at: row.created_at
        };
    } catch (e) {
        return null;
    }
}

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
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

        let dbTriumphs = [];

        if (supabase) {
            // 1. Try dedicated 'triumphs' table first
            try {
                const { data, error } = await supabase
                    .from('triumphs')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(60);

                if (!error && Array.isArray(data) && data.length > 0) {
                    dbTriumphs = data;
                }
            } catch (err) {}

            // 2. Query 'tasks' table for resilient [CONQUERED] records (ensures persistence even without triumphs table)
            try {
                const { data: taskRows, error: taskErr } = await supabase
                    .from('tasks')
                    .select('id, text, city, country, same_count, valid_count, rip_count, created_at')
                    .like('text', '[CONQUERED]%')
                    .order('created_at', { ascending: false })
                    .limit(60);

                if (!taskErr && Array.isArray(taskRows)) {
                    const parsedTasks = taskRows.map(parseTaskTriumph).filter(Boolean);
                    const existingIds = new Set(dbTriumphs.map(t => String(t.id)));
                    parsedTasks.forEach(pt => {
                        if (!existingIds.has(String(pt.id))) {
                            dbTriumphs.push(pt);
                            existingIds.add(String(pt.id));
                        }
                    });
                }
            } catch (err) {}
        }

        // Merge in-memory triumphs
        const dbIds = new Set(dbTriumphs.map(d => String(d.id)));
        const memOnly = inMemoryTriumphs.filter(m => !dbIds.has(String(m.id)));
        const finalTriumphs = [...memOnly, ...dbTriumphs].sort((a, b) => {
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });

        return res.status(200).json(finalTriumphs);
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
                const taskColMap = { praise: 'same_count', cheers: 'valid_count', respect: 'rip_count' };
                const taskCol = taskColMap[reactionType];

                // Update in-memory
                const memItem = inMemoryTriumphs.find(t => String(t.id) === String(triumphId));
                if (memItem) {
                    memItem[col] = isRemove ? Math.max(0, (memItem[col] || 0) - 1) : (memItem[col] || 0) + 1;
                }

                if (supabase) {
                    // Try triumphs table
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

                    // Try tasks table fallback
                    try {
                        const { data: tRow } = await supabase
                            .from('tasks')
                            .select(taskCol)
                            .eq('id', triumphId)
                            .maybeSingle();

                        if (tRow) {
                            const currentVal = tRow[taskCol] || 0;
                            const updatedVal = isRemove ? Math.max(0, currentVal - 1) : currentVal + 1;
                            const updateObj = {};
                            updateObj[taskCol] = updatedVal;
                            await supabase.from('tasks').update(updateObj).eq('id', triumphId);
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

            const cleanText = String(text).trim().replace(/^\[(PANIC|CONQUERED)\]\s*/i, '');
            const cleanName = (name || 'Anonymous').trim();
            const cleanCountry = (country || 'Parts Unknown').trim();
            const cleanAvoided = avoidedDuration || 'Several grueling days';
            const cleanTitle = commendationTitle || 'Order of the 11th-Hour Miracle';

            const newTriumph = {
                id: Date.now(),
                task_id: taskId ? String(taskId) : null,
                text: cleanText,
                author_name: cleanName,
                country: cleanCountry,
                avoided_duration: cleanAvoided,
                time_taken: null,
                lore: null,
                commendation_title: cleanTitle,
                praise_count: 0,
                cheers_count: 0,
                respect_count: 0,
                created_at: new Date().toISOString()
            };

            if (supabase) {
                // Remove from active tasks table so it graduates off the wire
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

                // 1. Attempt insert into dedicated 'triumphs' table
                let savedToTriumphsTable = false;
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
                        savedToTriumphsTable = true;
                    }
                } catch (dbErr) {}

                // 2. If dedicated table is not available, persist permanently in 'tasks' table
                if (!savedToTriumphsTable) {
                    try {
                        const payload = {
                            type: 'triumph',
                            taskId: newTriumph.task_id,
                            text: newTriumph.text,
                            avoidedDuration: newTriumph.avoided_duration,
                            commendationTitle: newTriumph.commendation_title,
                            praise: 0,
                            cheers: 0,
                            respect: 0
                        };
                        const { data: fallbackRow, error: fallbackErr } = await supabase
                            .from('tasks')
                            .insert([{
                                text: `[CONQUERED] ${JSON.stringify(payload)}`,
                                city: newTriumph.author_name,
                                country: newTriumph.country,
                                ip_address: '127.0.0.1'
                            }])
                            .select()
                            .single();

                        if (!fallbackErr && fallbackRow) {
                            newTriumph.id = fallbackRow.id;
                        }
                    } catch (fbErr) {
                        console.error('Fallback save to tasks table failed:', fbErr.message);
                    }
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
