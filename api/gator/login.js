// POST /api/gator/login
// Body: { tag, password }
// Returns { ok, token, gatorId, displayTag, notifyEmail }
const { getSupabase, verifyPassword, generateToken, normalizeTag } = require('./_auth');

const loginRateMap = new Map();

module.exports = async function handler(req, res) {
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
    const supabase = getSupabase();
    if (!supabase) return res.status(500).json({ error: 'Database unavailable' });

    const { data: operative } = await supabase
        .from('gator_tags')
        .select('gator_id, display_tag, password_hash, notify_email')
        .eq('tag', tag)
        .maybeSingle();

    // Generic error — don't reveal whether tag exists
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
};
