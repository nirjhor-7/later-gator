const { createClient } = require('@supabase/supabase-js');

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    if (!supabase) return res.status(500).json({ error: "Supabase Env Vars missing in Vercel" });

    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select('text')
            .gte('created_at', sevenDaysAgo.toISOString());
            
        if (error) throw error;
        if (!tasks || tasks.length === 0) return res.status(200).json({ text: 'Nothing yet!', count: 0 });

        const counts = {};
        let maxTask = { text: 'Nothing yet!', count: 0 };
        tasks.forEach(task => {
            const normalized = task.text.toLowerCase().trim();
            counts[normalized] = (counts[normalized] || 0) + 1;
            if (counts[normalized] > maxTask.count) maxTask = { text: task.text, count: counts[normalized] }; 
        });
        
        return res.status(200).json(maxTask);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
