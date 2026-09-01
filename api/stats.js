const { createClient } = require('@supabase/supabase-js');

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    if (!supabase) return res.status(500).json({ error: "Supabase Env Vars missing in Vercel" });

    try {
        const sessionId = req.query.session;
        
        if (sessionId && req.query.dev !== 'true') {
            // Check if it exists first
            const { data: existing } = await supabase
                .from('active_users')
                .select('session_id')
                .eq('session_id', sessionId)
                .limit(1);
                
            if (existing && existing.length > 0) {
                // It exists, just update it
                await supabase.from('active_users').update({ last_seen: new Date().toISOString() }).eq('session_id', sessionId);
            } else {
                // It doesn't exist, insert it
                await supabase.from('active_users').insert({ session_id: sessionId, last_seen: new Date().toISOString() });
            }
        }

        const { count: totalTasks } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
        
        const twentySecondsAgo = new Date(Date.now() - 20000).toISOString();
        const { count: activeCount } = await supabase.from('active_users').select('*', { count: 'exact', head: true }).gte('last_seen', twentySecondsAgo);
        
        const { count: totalVisitors } = await supabase.from('active_users').select('*', { count: 'exact', head: true });
        
        return res.status(200).json({
            totalPostponed: totalTasks || 0,
            currentlyProcrastinating: activeCount || 1,
            totalVisitors: totalVisitors || 1
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
