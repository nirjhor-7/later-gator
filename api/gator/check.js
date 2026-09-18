// GET /api/gator/check?tag=lazy_knight
// Returns { available: true|false, error? }
const { getSupabase, normalizeTag, validateTag } = require('./_auth');

const checkRateMap = new Map();

module.exports = async function handler(req, res) {
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

    const supabase = getSupabase();
    if (!supabase) return res.status(500).json({ error: 'Database unavailable' });

    const { data } = await supabase
        .from('gator_tags')
        .select('tag')
        .eq('tag', tag)
        .maybeSingle();

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ available: !data });
};
