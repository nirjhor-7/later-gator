// ============================================================
// /api/gator — Bureau of Idleness Gator Tag Unified API Handler
// Consolidates check, claim, login, logout, me, dossier, notify
// into a single Serverless Function to stay well under Vercel limits.
// ============================================================

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// ── Supabase client ──────────────────────────────────────────
function getSupabase() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) return null;
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

// ── Password hashing (scrypt) ────────────────────────────────
async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, 64, (err, dk) => {
            if (err) reject(err);
            else resolve(dk.toString('hex'));
        });
    });
    return `${salt}:${hash}`;
}

async function verifyPassword(password, stored) {
    if (!stored || !stored.includes(':')) return false;
    const [salt, storedHash] = stored.split(':');
    const hash = await new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, 64, (err, dk) => {
            if (err) reject(err);
            else resolve(dk.toString('hex'));
        });
    });
    try {
        return crypto.timingSafeEqual(
            Buffer.from(storedHash, 'hex'),
            Buffer.from(hash, 'hex')
        );
    } catch {
        return false;
    }
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function normalizeTag(tag) {
    return (tag || '').toLowerCase().trim().replace(/\s+/g, '_');
}

function validateTag(tag) {
    if (!tag || tag.length < 3 || tag.length > 24) {
        return 'Tag must be 3–24 characters.';
    }
    if (!/^[a-z0-9_]+$/.test(tag)) {
        return 'Only letters, numbers, and underscores allowed.';
    }
    const reserved = ['admin', 'bureau', 'wire', 'system', 'later_gator',
        'moderator', 'support', 'gator', 'the_gator', 'latergators'];
    if (reserved.includes(tag)) {
        return 'That tag is reserved by the Bureau. Try another.';
    }
    return null;
}

function isClean(tag) {
    const bad = /\b(fuck|shit|cunt|cock|dick|pussy|ass(?:hole)?|bitch|nigger|faggot|retard)\w*/i;
    return !bad.test(tag);
}

async function verifySession(supabase, token) {
    if (!token) return null;
    try {
        const { data, error } = await supabase
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

// Rate limit stores
const checkRateMap = new Map();
const loginRateMap = new Map();

// ── Action Handlers ──────────────────────────────────────────

async function handleCheck(req, res, supabase) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const rawIp = (req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
    const now = Date.now();
    const history = (checkRateMap.get(rawIp) || []).filter(t => now - t < 10000);
    if (history.length >= 30) return res.status(429).json({ error: 'Slow down, gator.' });
    history.push(now);
    checkRateMap.set(rawIp, history);

    const raw = (req.query.tag || '').trim();
    const tag = normalizeTag(raw);
    const validationError = validateTag(tag);
    if (validationError) return res.status(200).json({ available: false, reason: validationError });

    const { data } = await supabase
        .from('gator_tags')
        .select('tag')
        .eq('tag', tag)
        .maybeSingle();

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ available: !data });
}

async function handleClaim(req, res, supabase) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { tag: rawTag, password, email, sessionId } = req.body || {};

    if (!rawTag || !password) {
        return res.status(400).json({ error: 'Tag and password are required.' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const tag = normalizeTag(rawTag);
    const displayTag = rawTag.trim().slice(0, 24);
    const tagError = validateTag(tag);
    if (tagError) return res.status(400).json({ error: tagError });
    if (!isClean(tag)) return res.status(400).json({ error: 'The Bureau rejects that tag on moral grounds.' });

    const notifyEmail = (email && email.trim()) ? email.trim().toLowerCase() : null;

    // Check uniqueness
    const { data: existing } = await supabase
        .from('gator_tags')
        .select('tag')
        .eq('tag', tag)
        .maybeSingle();

    if (existing) {
        return res.status(409).json({ error: 'TAG_TAKEN', message: 'That tag is already claimed. Try another.' });
    }

    const passwordHash = await hashPassword(password);
    const token = generateToken();

    const { data: newGator, error: insertErr } = await supabase
        .from('gator_tags')
        .insert({ tag, display_tag: displayTag, password_hash: passwordHash, notify_email: notifyEmail })
        .select('gator_id')
        .single();

    if (insertErr || !newGator) {
        return res.status(500).json({ error: 'Failed to register. Try again.' });
    }

    const gatorId = newGator.gator_id;

    // Create session
    await supabase.from('gator_sessions').insert({ token, gator_id: gatorId, tag });

    // Transfer anonymous stamps from sessionId -> gatorId
    if (sessionId) {
        await supabase
            .from('user_reactions')
            .update({ gator_id: gatorId })
            .eq('session_id', sessionId)
            .is('gator_id', null);
        await supabase
            .from('tasks')
            .update({ author_gator_id: gatorId })
            .eq('session_id', sessionId)
            .is('author_gator_id', null);
    }

    return res.status(200).json({ ok: true, token, gatorId, displayTag, tag, notifyEmail: !!notifyEmail });
}

async function handleLogin(req, res, supabase) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const rawIp = (req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
    const now = Date.now();
    const history = (loginRateMap.get(rawIp) || []).filter(t => now - t < 60000);
    if (history.length >= 10) {
        return res.status(429).json({ error: 'Too many attempts. The Bureau suggests a short break.' });
    }
    history.push(now);
    loginRateMap.set(rawIp, history);

    const { tag: rawTag, password } = req.body || {};
    if (!rawTag || !password) {
        return res.status(400).json({ error: 'Tag and password are required.' });
    }

    const tag = normalizeTag(rawTag);

    const { data: operative } = await supabase
        .from('gator_tags')
        .select('gator_id, display_tag, password_hash, notify_email')
        .eq('tag', tag)
        .maybeSingle();

    if (!operative) {
        return res.status(401).json({ error: 'Wrong tag or password. No record of that operative.' });
    }

    const valid = await verifyPassword(password, operative.password_hash);
    if (!valid) {
        return res.status(401).json({ error: 'Wrong tag or password. No record of that operative.' });
    }

    const token = generateToken();
    await supabase.from('gator_sessions').insert({
        token,
        gator_id: operative.gator_id,
        tag,
    });

    return res.status(200).json({
        ok: true,
        token,
        gatorId: operative.gator_id,
        displayTag: operative.display_tag,
        tag,
        notifyEmail: !!operative.notify_email,
    });
}

async function handleMe(req, res, supabase) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    res.setHeader('Cache-Control', 'no-store');

    const token = req.query.token;
    const session = await verifySession(supabase, token);
    if (!session) return res.status(200).json({ ok: false });

    const { data: operative } = await supabase
        .from('gator_tags')
        .select('display_tag, notify_email')
        .eq('gator_id', session.gatorId)
        .maybeSingle();

    return res.status(200).json({
        ok: true,
        gatorId: session.gatorId,
        tag: session.tag,
        displayTag: operative?.display_tag || session.tag,
        notifyEmail: !!(operative?.notify_email),
    });
}

async function handleLogout(req, res, supabase) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { token } = req.body || {};
    if (token) await supabase.from('gator_sessions').delete().eq('token', token);
    return res.status(200).json({ ok: true });
}

async function handleDossier(req, res, supabase) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    res.setHeader('Cache-Control', 'no-store');

    const token = req.query.token;
    const session = await verifySession(supabase, token);
    if (!session) return res.status(401).json({ ok: false, error: 'Not signed in.' });

    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, text, city, same_count, valid_count, rip_count, created_at')
        .eq('author_gator_id', session.gatorId)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) return res.status(500).json({ error: 'Could not retrieve dossier.' });

    const totalSympathy = (tasks || []).reduce((sum, t) =>
        sum + (t.same_count || 0) + (t.valid_count || 0) + (t.rip_count || 0), 0);

    return res.status(200).json({
        ok: true,
        gatorId: session.gatorId,
        tag: session.tag,
        dispatches: tasks || [],
        totalSympathy,
    });
}

// ── Main Multiplexer ─────────────────────────────────────────
module.exports = async function handler(req, res) {
    const supabase = getSupabase();
    if (!supabase) return res.status(500).json({ error: 'Database unavailable' });

    // Determine sub-action from rewrite query param or path
    const pathParts = req.url.split('?')[0].split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1] || '';
    const action = (req.query.action || (lastPart !== 'gator' ? lastPart : '')).toLowerCase();

    switch (action) {
        case 'check':
            return handleCheck(req, res, supabase);
        case 'claim':
            return handleClaim(req, res, supabase);
        case 'login':
            return handleLogin(req, res, supabase);
        case 'logout':
            return handleLogout(req, res, supabase);
        case 'me':
            return handleMe(req, res, supabase);
        case 'dossier':
            return handleDossier(req, res, supabase);
        default:
            return res.status(404).json({ error: `Unknown action: ${action}` });
    }
};
