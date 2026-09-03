const { createClient } = require('@supabase/supabase-js');

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    if (!supabase) return res.status(500).json({ error: "Supabase Env Vars missing in Vercel" });

    try {
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select('country')
            .not('country', 'is', null)
            .limit(2000);

        if (error) throw error;

        const counts = {};
        if (tasks) {
            tasks.forEach(t => {
                const c = (t.country || '').trim();
                if (c && c.toLowerCase() !== 'unknown' && c.toLowerCase() !== 'parts unknown') {
                    const norm = c.toUpperCase();
                    counts[norm] = (counts[norm] || 0) + 1;
                }
            });
        }

        const sorted = Object.entries(counts)
            .map(([country, count]) => ({ country, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return res.status(200).json(sorted);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
