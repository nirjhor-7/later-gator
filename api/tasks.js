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

            const clientIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';

            // 1. Check if they are already permanently banned
            if (clientIp !== 'unknown') {
                const { data: isBanned } = await supabase.from('banned_ips').select('ip').eq('ip', clientIp).limit(1);
                if (isBanned && isBanned.length > 0) {
                    return res.status(403).json({ error: "Your IP has been permanently banned from this sector." });
                }
            }

            // 2. Strict Input Validation & Auto-Ban Content Triggers
            const cleanText = (text || '').trim();
            const cleanName = (name || '').trim();
            
            if (!cleanText) return res.status(400).json({ error: 'Task required' });
            if (cleanText.length > 150 || cleanName.length > 50) return res.status(400).json({ error: 'Input too long' });

            const spamCheck = (cleanText + cleanName).toLowerCase();
            const containsLinks = /(http|https|www\.)/.test(spamCheck);
            const containsBotSig = spamCheck.includes('gyxubo');

            if (containsLinks || containsBotSig) {
                if (clientIp !== 'unknown') {
                    await supabase.from('banned_ips').insert({ ip: clientIp, reason: 'Content violation (links or bot signature)' });
                    await supabase.from('tasks').delete().eq('ip_address', clientIp); // Vaporize their previous posts
                }
                return res.status(403).json({ error: "Malicious input detected. IP Banned." });
            }

            // 3. Velocity Auto-Ban (Max 10 per minute)
            if (clientIp !== 'unknown') {
                const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
                const { count } = await supabase
                    .from('tasks')
                    .select('*', { count: 'exact', head: true })
                    .eq('ip_address', clientIp)
                    .gte('created_at', oneMinuteAgo);
                    
                if (count >= 10) {
                    // They spammed too fast, permanently ban them and vaporize their posts
                    await supabase.from('banned_ips').insert({ ip: clientIp, reason: 'Velocity violation (>10/min)' });
                    await supabase.from('tasks').delete().eq('ip_address', clientIp);
                    return res.status(429).json({ error: "Rate limit severely exceeded. IP Banned." });
                } else if (count >= 5) {
                    // Soft rate limit
                    return res.status(429).json({ error: "Rate limit exceeded. Chill out." });
                }
            }
            
            // 4. Duplicate Spam Auto-Ban (Posting exact same text 4 times)
            if (clientIp !== 'unknown') {
                const { data: recentTasks } = await supabase
                    .from('tasks')
                    .select('text')
                    .eq('ip_address', clientIp)
                    .order('created_at', { ascending: false })
                    .limit(3);
                
                if (recentTasks && recentTasks.length === 3) {
                    if (recentTasks[0].text === cleanText && recentTasks[1].text === cleanText && recentTasks[2].text === cleanText) {
                        await supabase.from('banned_ips').insert({ ip: clientIp, reason: 'Duplicate spam' });
                        await supabase.from('tasks').delete().eq('ip_address', clientIp);
                        return res.status(429).json({ error: "Spam detected. IP Banned." });
                    }
                }
            }
            
            const finalName = cleanName !== '' ? cleanName : 'Anonymous';
            const finalCountry = (country && country !== 'Unknown') ? country : 'Parts Unknown';
            
            const { data: newTask, error } = await supabase
                .from('tasks')
                .insert([{ text: cleanText, city: finalName, country: finalCountry, ip_address: clientIp }])
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
