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
            .select('country, created_at')
            .not('country', 'is', null)
            .order('created_at', { ascending: false })
            .limit(2000);

        if (error) throw error;

        const countryMap = {};
        if (tasks) {
            tasks.forEach(t => {
                const c = (t.country || '').trim();
                if (c && c.toLowerCase() !== 'unknown' && c.toLowerCase() !== 'parts unknown') {
                    const norm = c.toUpperCase();
                    if (!countryMap[norm]) {
                        countryMap[norm] = {
                            country: norm,
                            count: 0,
                            latest: new Date(t.created_at).getTime() || 0
                        };
                    }
                    countryMap[norm].count += 1;
                }
            });
        }

        const sorted = Object.values(countryMap)
            .sort((a, b) => {
                if (b.count !== a.count) {
                    return b.count - a.count;
                }
                return b.latest - a.latest;
            })
            .slice(0, 7)
            .map(({ country, count }) => ({ country, count }));

        return res.status(200).json(sorted);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
