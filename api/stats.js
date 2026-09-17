const { createClient } = require('@supabase/supabase-js');

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

module.exports = async function handler(req, res) {
    if (!supabase) return res.status(500).json({ error: "Supabase Env Vars missing in Vercel" });

    // Handle HEAD probes gracefully
    if (req.method === 'HEAD') {
        res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60');
        return res.status(200).end();
    }

    // ── POST: Lightweight Non-Blocking Presence Heartbeat ─────────────────────
    if (req.method === 'POST') {
        try {
            let body = req.body;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch (e) { body = {}; }
            }
            const sessionId = body?.sessionId || body?.session;
            if (!sessionId) {
                return res.status(200).json({ ok: true, tracked: false });
            }

            const now = new Date().toISOString();
            const { error: upsertErr } = await supabase
                .from('active_users')
                .upsert({ session_id: sessionId, last_seen: now }, { onConflict: 'session_id' });

            if (upsertErr) {
                // Fallback if table lacks unique index on session_id
                const { data: existing } = await supabase
                    .from('active_users')
                    .select('session_id')
                    .eq('session_id', sessionId)
                    .limit(1);

                if (existing && existing.length > 0) {
                    await supabase.from('active_users').update({ last_seen: now }).eq('session_id', sessionId);
                } else {
                    await supabase.from('active_users').insert({ session_id: sessionId, last_seen: now });
                }
            }
            return res.status(200).json({ ok: true, tracked: true });
        } catch (e) {
            return res.status(200).json({ ok: false, error: e.message });
        }
    }

    // ── GET: Blazing Fast Edge-Cached Global Stats ────────────────────────────
    if (req.method === 'GET') {
        try {
            res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60');

            // Backward compatibility: If an old client sends ?session=..., record it in the background
            const sessionId = req.query.session;
            if (sessionId && req.query.dev !== 'true') {
                const now = new Date().toISOString();
                supabase
                    .from('active_users')
                    .upsert({ session_id: sessionId, last_seen: now }, { onConflict: 'session_id' })
                    .then(() => {})
                    .catch(() => {});
            }

            const twentySecondsAgo = new Date(Date.now() - 20000).toISOString();

            // Run all 3 count queries simultaneously via Promise.all!
            const [
                { count: totalTasks },
                { count: activeCount },
                { count: totalVisitors }
            ] = await Promise.all([
                supabase.from('tasks').select('*', { count: 'exact', head: true }),
                supabase.from('active_users').select('*', { count: 'exact', head: true }).gte('last_seen', twentySecondsAgo),
                supabase.from('active_users').select('*', { count: 'exact', head: true })
            ]);

            return res.status(200).json({
                totalPostponed: totalTasks || 0,
                currentlyProcrastinating: activeCount || 1,
                totalVisitors: totalVisitors || 1
            });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
