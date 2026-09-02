const { createClient } = require('@supabase/supabase-js');

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

export default async function handler(req, res) {
    if (!supabase) {
        return res.status(500).json({ error: "Supabase Env Vars missing in Vercel" });
    }

    if (req.method === 'GET') {
        try {
            const { data: tasks, error } = await supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
                
            if (error) throw error;
            return res.status(200).json(tasks);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (req.method === 'POST') {
        try {
            const { text, name, country } = req.body;
            
            // Anti-bot honeypot
            if (req.headers['x-gator-token'] !== 'chomp-chomp') {
                return res.status(403).json({ error: "No gators allowed." });
            }

            if (!text || text.trim() === '') return res.status(400).json({ error: 'Task required' });
            
            const finalName = (name && name.trim() !== '') ? name.trim() : 'Anonymous';
            const finalCountry = (country && country !== 'Unknown') ? country : 'Parts Unknown';

            const { data: newTask, error } = await supabase
                .from('tasks')
                .insert([{ text: text.trim(), city: finalName, country: finalCountry }])
                .select()
                .single();
                
            if (error) throw error;
            return res.status(201).json(newTask);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
