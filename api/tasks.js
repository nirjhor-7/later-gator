const crypto = require('crypto');
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

    // 1. Direct word boundary check for explicit sexual terms, acts, anatomy & profanity
    const explicitWords = [
        // Sexual acts & phrases
        /\b(sex|sexual|sexy|anal|blowjob\w*|handjob\w*|rimjob\w*|footjob\w*|titfuck\w*)\b/i,
        /\b(deepthroat\w*|gangbang\w*|creampie\w*|pegging|pegged|fingering)\b/i,
        /\b(masturbat\w*|wank\w*|circlejerk\w*|orgasm\w*|ejaculat\w*|bukkake)\b/i,
        /\b(cum|cums|cumming|cumshot\w*|squirt\w*)\b/i,
        /\b(threesome\w*|foursome\w*|orgy|orgies|gloryhole\w*|bdsm|bondage|erotic\w*)\b/i,
        /\b(jerk\s*off|jerking\s*off|jack\s*off|jacking\s*off)\b/i,
        
        // Genitalia & anatomy
        /\b(penis\w*|cock|cocks|cocksucker\w*|dick|dicks|dickhead\w*)\b/i,
        /\b(vagina\w*|pussy|pussies|clit|clitoris|labia)\b/i,
        /\b(tits|titties|boob|boobs|boobies|areola\w*)\b/i,
        /\b(asshole\w*|butthole\w*|anus\w*|ballsack\w*|testicle\w*)\b/i,
        /\b(dildo\w*|vibrator\w*|fleshlight\w*|buttplug\w*)\b/i,
        
        // Adult industry / pornography
        /\b(porn|porno|pornography|hentai|xxx|onlyfans|pornhub|xvideos|redtube|xhamster)\b/i,
        /\b(nude|nudes|naked|stripper\w*|hooker\w*|prostitute\w*|escort\w*|milf\w*|dilf\w*|horny|boner\w*)\b/i,
        
        // Profanity & vulgar terms
        /\b(fuck\w*|fck|fuk|f\*ck|motherfuck\w*)\b/i,
        /\b(bitch\w*|b!tch)\b/i,
        /\b(cunt\w*)\b/i,
        /\b(whore\w*|slut\w*)\b/i,
        /\b(bastard\w*)\b/i,

        // Bodily excretions, vulgarities & scatological terms
        /\b(fart\w*|queef\w*)\b/i,
        /\b(shit\w*|shite\w*|bullshit\w*|horseshit\w*|dipshit\w*|shithole\w*|batshit\w*|apeshit\w*|sh\*t|sh!t|sh1t|shyt)\b/i,
        /\b(poop\w*|p00p\w*|turd\w*|diarrhe\w*|diarrho\w*)\b/i,
        /\b(crap\w*|crappy\w*|cr@p|cr\*p)\b/i,
        /\b(piss\w*|pissed\w*|pissing\w*|p!ss|p\*ss)\b/i,

        // 2. Common spaced / leetspeak / elongated obfuscations with word boundaries
        /\b(s[\s._\-*]*[3e][\s._\-*]*x+)\b/i,
        /\b([4a][\s._\-*]*n[\s._\-*]*[4a][\s._\-*]*l)\b/i,
        /\b(p[\s._\-*]*[0o][\s._\-*]*r[\s._\-*]*n)\b/i,
        /\b(f[\s._\-*]*[u*][\s._\-*]*c[\s._\-*]*k+)\b/i,
        /\b(d[\s._\-*]*[1!i][\s._\-*]*c[\s._\-*]*k+)\b/i,
        /\b(b[\s._\-*]*[1!i][\s._\-*]*t[\s._\-*]*c[\s._\-*]*h+)\b/i,
        /\b(c[\s._\-*]*[u*][\s._\-*]*n[\s._\-*]*t+)\b/i,
        /\b(p[\s._\-*]*[u*][\s._\-*]*s+[\s._\-*]*[y!1])\b/i,
        /\b(s[\s._\-*]*h[\s._\-*]*[i!1y*][\s._\-*]*t+)\b/i,
        /\b(f[\s._\-*]*[a@*][\s._\-*]*r[\s._\-*]*t+)\b/i,
        /\b(p[\s._\-*]*[o0*][\s._\-*]*[o0*][\s._\-*]*p+)\b/i,
        /\b(p[\s._\-*]*[i!1*][\s._\-*]*s+)\b/i,
        /\b(s+h+[i1!y*]+t+)\b/i,
        /\b(f+a+r+t+s*)\b/i,
        /\b(p+o+o+p+s*)\b/i
    ];

    for (const rx of explicitWords) {
        if (rx.test(lower)) return true;
    }

    // 3. Severe racial / identity slurs (checked against collapsed text)
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

    const severeSlurs = [
        /n+[i1l]+[g9]+[e3a4r]+/i,
        /n+i+g+[ae]+/i,
        /f+a+g+[o0e3]*t?/i,
        /k+i+k+e/i,
        /c+h+i+n+k/i,
        /s+p+i+c/i,
        /r+e+t+a+r+d/i
    ];

    for (const rx of severeSlurs) {
        if (rx.test(collapsed) || rx.test(normalized) || rx.test(deDuplicated)) {
            return true;
        }
    }

    return false;
}

function isGibberish(text) {
    if (!text) return true;
    const clean = text.trim();
    if (clean.length < 3) return true;

    // Normalizing expressive elongation:
    // e.g. "studyiiiiiiing" -> "studying", "sleeeeeep" -> "sleep"
    const deElongated = clean.replace(/(.)\1{2,}/gi, "$1");

    // Common keyboard home-row / sequential key walks (pure smash)
    const mashes = [
        /asdf/i, /sdfg/i, /dfgh/i, /ghjk/i, /hjkl/i,
        /qwerty/i, /werty/i, /ertyu/i, /rtyui/i,
        /zxcv/i, /xcvb/i, /cvbn/i,
        /asdw/i, /qweasd/i, /asdasd/i, /dsad/i, /fdsa/i,
        /lkjh/i, /poiu/i, /mnbv/i
    ];
    for (const m of mashes) {
        if (m.test(clean) || m.test(deElongated)) return true;
    }

    // Only flag repeated characters if there is NO other substantial word (e.g. "aaaaa", "zzzzzz")
    if (/^(.)\1+$/i.test(clean.replace(/\s+/g, ""))) return true;

    // Check individual words
    const words = deElongated.split(/\s+/);
    let validWords = 0;

    for (const w of words) {
        const lettersOnly = w.replace(/[^a-z]/gi, "");
        if (!lettersOnly) continue;

        // Expressive conversational procrastination words
        if (["no", "so", "ugh", "ah", "ha", "eh"].includes(lettersOnly.toLowerCase())) {
            validWords++;
            continue;
        }

        // Must have vowels if length >= 4
        if (lettersOnly.length >= 4 && !/[aeiouy]/i.test(lettersOnly)) {
            return true;
        }

        if (lettersOnly.length >= 7) {
            const vowels = (lettersOnly.match(/[aeiouy]/gi) || []).length;
            if (vowels / lettersOnly.length < 0.15) return true;
        }

        validWords++;
    }

    return validWords === 0;
}

let supabase = null;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
if (process.env.SUPABASE_URL && supabaseKey) {
    supabase = createClient(process.env.SUPABASE_URL, supabaseKey);
}

function getSecret() {
    return process.env.DELETE_SECRET
        || process.env.SUPABASE_SERVICE_ROLE_KEY
        || process.env.SUPABASE_SERVICE_KEY
        || process.env.SUPABASE_KEY
        || process.env.SUPABASE_ANON_KEY
        || 'later-gator-stateless-delete-key-v1';
}

function generateDeleteToken(taskId) {
    if (!taskId) return null;
    const secret = getSecret();
    return crypto.createHmac('sha256', secret).update(`delete_task_${taskId}`).digest('hex');
}

function verifyDeleteToken(taskId, token) {
    if (!taskId || !token || typeof token !== 'string') return false;
    const expected = generateDeleteToken(taskId);
    if (!expected || token.length !== expected.length) return false;
    try {
        return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
    } catch {
        return false;
    }
}

async function verifySession(supabaseClient, token) {
    if (!token || !supabaseClient) return null;
    try {
        const { data, error } = await supabaseClient
            .from('gator_sessions')
            .select('gator_id, tag, expires_at')
            .eq('token', token)
            .single();
        if (error || !data) return null;
        if (new Date(data.expires_at) < new Date()) return null;
        return { gatorId: data.gator_id, tag: data.tag };
    } catch {
        return null;
    }
}

async function verifyDeleteAuthorization(supabaseClient, taskId, authHeader, clientIp) {
    if (!supabaseClient) {
        return { authorized: false, error: "Database unavailable.", status: 500 };
    }
    if (!taskId) {
        return { authorized: false, error: "Missing dispatch ID.", status: 400 };
    }

    const parsedId = typeof taskId === 'number' ? taskId : parseInt(taskId, 10);
    if (isNaN(parsedId)) {
        return { authorized: false, error: "Invalid dispatch ID.", status: 400 };
    }

    const { data: task, error } = await supabaseClient
        .from('tasks')
        .select('id, author_gator_id, ip_address')
        .eq('id', parsedId)
        .maybeSingle();

    if (error || !task) {
        return { authorized: false, error: "Dispatch not found.", status: 404 };
    }

    const token = typeof authHeader === 'string'
        ? authHeader.replace(/^Bearer\s+/i, '').trim()
        : null;

    // 1. Authenticated Gator Session check
    if (token) {
        const session = await verifySession(supabaseClient, token);
        if (session && session.gatorId) {
            // If the dispatch was authored by a registered Gator, enforce strict ID match
            if (task.author_gator_id) {
                if (task.author_gator_id === session.gatorId) {
                    return { authorized: true, method: 'gator_session', session, task };
                }
                return { authorized: false, error: "Forbidden: You do not own this dispatch.", status: 403 };
            }
            // If the dispatch was anonymous, allow if delete token or IP matches
            if (verifyDeleteToken(parsedId, token) || (task.ip_address && clientIp && clientIp !== 'unknown' && task.ip_address === clientIp)) {
                return { authorized: true, method: 'gator_claimed_or_ip', session, task };
            }
        }

        // 2. Cryptographic Deletion Token check (for anonymous creators)
        if (verifyDeleteToken(parsedId, token)) {
            // If task belongs to an authenticated Gator, raw delete token is not accepted unless authorized above
            if (!task.author_gator_id) {
                return { authorized: true, method: 'delete_token', task };
            }
        }
    }

    // 3. Fallback: IP-based verification for anonymous dispatches (author_gator_id IS NULL)
    if (!task.author_gator_id && task.ip_address && clientIp && clientIp !== 'unknown' && task.ip_address === clientIp) {
        return { authorized: true, method: 'ip_match', task };
    }

    // 4. Missing or unauthorized
    if (!token && (!clientIp || clientIp === 'unknown')) {
        return { authorized: false, error: "Missing authorization token.", status: 401 };
    }

    return { authorized: false, error: "Forbidden: You do not own this dispatch.", status: 403 };
}

async function handler(req, res) {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Gator-Token, x-gator-token');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (!supabase) {
        return res.status(500).json({ error: "Supabase Env Vars missing in Vercel" });
    }

    // Handle HEAD probes gracefully
    if (req.method === 'HEAD') {
        res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=59');
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        try {
            if (req.query._t) {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            } else {
                res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=59');
            }
            let queryLimit = 150;
            if (req.query.limit) {
                if (req.query.limit === 'all') {
                    queryLimit = 1000;
                } else {
                    const parsed = parseInt(req.query.limit, 10);
                    if (!isNaN(parsed) && parsed > 0) {
                        queryLimit = Math.min(parsed, 1000);
                    }
                }
            }

            let { data: tasks, error } = await supabase
                .from('tasks')
                .select('id, text, city, country, same_count, valid_count, rip_count, created_at, ip_address')
                .order('created_at', { ascending: false })
                .limit(queryLimit);
                
            if (error) throw error;

            // Instantly purge any banned IP tasks, inappropriate language, or gibberish from the public feed
            const badTaskIds = [];
            const cleanTasks = (tasks || []).filter(t => {
                const isBanned = HARDCODED_BANNED_IPS.has(t.ip_address);
                const isInappropriate = containsInappropriate(t.text) || containsInappropriate(t.city);
                const isJunk = isGibberish((t.text || '').replace('[PANIC] ', ''));
                if (isBanned || isInappropriate) {
                    badTaskIds.push(t.id);
                    return false;
                }
                return !isJunk;
            });

            if (badTaskIds.length > 0) {
                // Asynchronously purge banned/inappropriate tasks from database
                supabase.from('tasks').delete().in('id', badTaskIds).then(() => {}).catch(() => {});
            }

            // Strip ip_address from public feed response to reduce payload and protect client privacy
            const publicTasks = cleanTasks.map(({ ip_address, ...rest }) => rest);

            return res.status(200).json(publicTasks);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (req.method === 'POST') {
        try {
            const { text, name, country, gatorId, sessionId } = req.body;

            
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

            // Gibberish & keyboard mash detection with suggestion
            const TASK_SUGGESTIONS = [
                "Sleep",
                "Study",
                "Replying to emails",
                "Doing laundry",
                "Going to gym",
                "My life choices",
                "Too tired to type"
            ];

            if (isGibberish(cleanText)) {
                const suggestion = TASK_SUGGESTIONS[Math.floor(Math.random() * TASK_SUGGESTIONS.length)];
                return res.status(400).json({ 
                    error: `KEYBOARD SMASH DETECTED. DID YOU MEAN: "${suggestion.toUpperCase()}"?`,
                    suggestion: suggestion
                });
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
            
            const insertPayload = {
                text: cleanText,
                city: finalName,
                country: finalCountry,
                ip_address: clientIp,
            };
            if (gatorId) insertPayload.author_gator_id = gatorId;

            const { data: newTask, error } = await supabase
                .from('tasks')
                .insert([insertPayload])
                .select()
                .single();
                
            if (error) throw error;

            // Register for milestone communiqués if gator has an email
            if (gatorId && newTask) {
                const { data: gator } = await supabase
                    .from('gator_tags')
                    .select('notify_email')
                    .eq('gator_id', gatorId)
                    .maybeSingle();
                if (gator && gator.notify_email) {
                    await supabase.from('dispatch_notifications').upsert(
                        { task_id: String(newTask.id), gator_id: gatorId, notify_email: gator.notify_email, last_milestone: 0 },
                        { onConflict: 'task_id' }
                    );
                }
            }

            const deleteToken = generateDeleteToken(newTask.id);

            return res.status(201).json({
                ...newTask,
                delete_token: deleteToken
            });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (req.method === 'DELETE') {
        try {
            // Extract task ID from query, body, or URL
            let rawTaskId = null;
            if (req.query && req.query.id) {
                rawTaskId = req.query.id;
            } else if (req.body && req.body.id) {
                rawTaskId = req.body.id;
            } else if (req.url && req.url.includes('?')) {
                try {
                    const parsedUrl = new URL(req.url, 'http://localhost');
                    rawTaskId = parsedUrl.searchParams.get('id');
                } catch (e) {}
            }

            if (!rawTaskId) {
                return res.status(400).json({ error: "Missing dispatch ID for shredding." });
            }

            const taskId = parseInt(rawTaskId, 10);
            if (isNaN(taskId)) {
                return res.status(400).json({ error: "Invalid dispatch ID." });
            }

            // Client IP
            const rawIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '';
            const clientIp = rawIp.split(',')[0].trim() || 'unknown';

            // Extract auth token from Authorization header, X-Delete-Token, query, or body
            let authHeader = req.headers['authorization']
                || req.headers['Authorization']
                || req.headers['x-delete-token']
                || req.headers['X-Delete-Token']
                || req.query?.token
                || req.body?.token
                || null;

            if (!authHeader && req.url && req.url.includes('?')) {
                try {
                    const parsedUrl = new URL(req.url, 'http://localhost');
                    authHeader = parsedUrl.searchParams.get('token');
                } catch (e) {}
            }

            // Verify ownership: session must be valid, delete token must match, or IP must match anonymous task
            const authResult = await verifyDeleteAuthorization(supabase, taskId, authHeader, clientIp);
            if (!authResult.authorized) {
                return res.status(authResult.status || 403).json({ error: authResult.error });
            }

            // 1. Delete dependent notifications and reactions first to prevent foreign key errors
            try {
                await supabase.from('dispatch_notifications').delete().eq('task_id', String(taskId));
            } catch (e) {}
            try {
                await supabase.from('user_reactions').delete().eq('task_id', String(taskId));
            } catch (e) {}

            // 2. Delete task from tasks table
            const { data: deletedRows, error: deleteError } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId)
                .select();

            if (deleteError) {
                console.error('Delete error in Supabase:', deleteError);
                throw deleteError;
            }

            return res.status(200).json({
                success: true,
                message: "Dispatched guilt expunged from the wire.",
                id: taskId,
                deletedCount: (deletedRows && deletedRows.length) || 1
            });
        } catch (err) {
            console.error('Server error handling DELETE /api/tasks:', err);
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

handler.verifySession = verifySession;
handler.generateDeleteToken = generateDeleteToken;
handler.verifyDeleteToken = verifyDeleteToken;
handler.verifyDeleteAuthorization = verifyDeleteAuthorization;

module.exports = handler;
