const { createClient } = require('@supabase/supabase-js');
const geoip = require('geoip-lite');

const HARDCODED_BANNED_IPS = new Set([
    '119.40.93.246',
]);

const FUNNY_CENSOR_MESSAGES = [
    "THE EDITOR-IN-CHIEF REFUSES TO PRINT SUCH SCANDALOUS LANGUAGE.",
    "REDACTED BY THE DEPARTMENT OF DECENCY: KEEP IT CIVIL, CITIZEN.",
    "OUR TYPESETTERS ARE BLUSHING. MIND YOUR MANNERS.",
    "TRANSMISSION REJECTED: THIS IS A RESPECTABLE PROCRASTINATION JOURNAL.",
    "CENSORSHIP NOTICE: WASH YOUR KEYBOARD OUT WITH SOAP."
];

function containsInappropriate(str) {
    if (!str) return false;
    const lower = str.toLowerCase();

    // 1. Direct word boundary check for vulgar words
    const vulgarWords = [
        /\b(fuck|fucking|fucker|fck|fuk|f\*ck)\b/i,
        /\b(bitch|bitches|b!tch)\b/i,
        /\b(cunt|cunts)\b/i,
        /\b(pussy|pussies)\b/i,
        /\b(dick|dicks)\b/i,
        /\b(asshole|assholes)\b/i,
        /\b(whore|whores|slut|sluts)\b/i
    ];
    for (const rx of vulgarWords) {
        if (rx.test(lower)) return true;
    }

    // 2. Anti-obfuscation for slurs & severe profanity
    const collapsed = lower.replace(/[^a-z0-9]/g, '');
    const normalized = collapsed
        .replace(/[1!|]/g, 'i')
        .replace(/0/g, 'o')
        .replace(/3/g, 'e')
        .replace(/[4@]/g, 'a')
        .replace(/[5$]/g, 's')
        .replace(/7/g, 't')
        .replace(/8/g, 'b');

    const deDuplicated = normalized.replace(/(.)\1+/g, '$1');

    const severePatterns = [
        /n+[i1l]+[g9]+[e3a4r]+/i,
        /n+i+g+[ae]+/i,
        /f+a+g+[o0e3]*t?/i,
        /k+i+k+e/i,
        /c+h+i+n+k/i,
        /s+p+i+c/i,
        /r+e+t+a+r+d/i,
        /f+u+c+k/i,
        /b+i+t+c+h/i,
        /c+u+n+t/i
    ];

    for (const rx of severePatterns) {
        if (rx.test(lower) || rx.test(normalized) || rx.test(deDuplicated)) {
            return true;
        }
    }
    return false;
}

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

            // Instantly purge any banned IP tasks or inappropriate language from the public feed
            const cleanTasks = (tasks || []).filter(t => 
                !HARDCODED_BANNED_IPS.has(t.ip_address) && 
                !containsInappropriate(t.text) && 
                !containsInappropriate(t.city)
            );

            return res.status(200).json(cleanTasks);
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

            const rawIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '';
            const clientIp = rawIp.split(',')[0].trim() || 'unknown';

            // 0. Hardcoded Blacklist (Instant execution, 100% immune to DB / RLS issues)
            if (HARDCODED_BANNED_IPS.has(clientIp)) {
                await supabase.from('tasks').delete().eq('ip_address', clientIp);
                return res.status(403).json({ error: "Your IP has been permanently banned from this sector." });
            }

            // 1. Dynamic Database Blacklist Check
            if (clientIp !== 'unknown') {
                const { data: isBanned, error: banErr } = await supabase
                    .from('banned_ips')
                    .select('ip')
                    .eq('ip', clientIp)
                    .limit(1);

                if (isBanned && isBanned.length > 0) {
                    await supabase.from('tasks').delete().eq('ip_address', clientIp);
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
                    await supabase.from('tasks').delete().eq('ip_address', clientIp);
                }
                return res.status(403).json({ error: "Malicious input detected. IP Banned." });
            }

            // Inappropriate language & profanity filter (NO BAN - Just reject with witty broadsheet refusal)
            if (containsInappropriate(cleanText) || containsInappropriate(cleanName)) {
                const funnyError = FUNNY_CENSOR_MESSAGES[Math.floor(Math.random() * FUNNY_CENSOR_MESSAGES.length)];
                return res.status(400).json({ error: funnyError });
            }

            // 3. Multi-Tier Velocity & Cooldown Limiting
            if (clientIp !== 'unknown') {
                const now = Date.now();
                const twentySecAgo = new Date(now - 20000).toISOString();
                const oneMinuteAgo = new Date(now - 60000).toISOString();
                const oneHourAgo = new Date(now - 3600000).toISOString();

                // 20-second cooldown (stops automated burst scripts)
                const { count: count20s } = await supabase
                    .from('tasks')
                    .select('*', { count: 'exact', head: true })
                    .eq('ip_address', clientIp)
                    .gte('created_at', twentySecAgo);

                if (count20s && count20s >= 1) {
                    return res.status(429).json({ error: "Cooldown active. Wait 20 seconds before posting again." });
                }

                // 1-minute velocity limit
                const { count: count1m } = await supabase
                    .from('tasks')
                    .select('*', { count: 'exact', head: true })
                    .eq('ip_address', clientIp)
                    .gte('created_at', oneMinuteAgo);
                    
                if (count1m && count1m >= 5) {
                    await supabase.from('banned_ips').insert({ ip: clientIp, reason: 'Velocity violation (>5/min)' });
                    await supabase.from('tasks').delete().eq('ip_address', clientIp);
                    return res.status(429).json({ error: "Rate limit severely exceeded. IP Banned." });
                } else if (count1m && count1m >= 3) {
                    return res.status(429).json({ error: "Rate limit exceeded. Chill out." });
                }

                // 1-hour volume limit (stops slow-drip overnight bot spam)
                const { count: count1h } = await supabase
                    .from('tasks')
                    .select('*', { count: 'exact', head: true })
                    .eq('ip_address', clientIp)
                    .gte('created_at', oneHourAgo);

                if (count1h && count1h >= 20) {
                    await supabase.from('banned_ips').insert({ ip: clientIp, reason: 'Hourly limit violation (>20/hr)' });
                    await supabase.from('tasks').delete().eq('ip_address', clientIp);
                    return res.status(429).json({ error: "Hourly quota exceeded. IP Banned." });
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
            
            // Auto-detect country: 1. Vercel edge header, 2. geoip-lite fallback
            let countryCode = req.headers['x-vercel-ip-country'];
            if (!countryCode && clientIp !== 'unknown') {
                try {
                    const geo = geoip.lookup(clientIp);
                    if (geo && geo.country) countryCode = geo.country;
                } catch (e) {}
            }

            let finalCountry = 'Parts Unknown';
            if (countryCode) {
                try {
                    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
                    finalCountry = regionNames.of(countryCode) || countryCode;
                } catch(e) {
                    finalCountry = countryCode;
                }
            }
            
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
