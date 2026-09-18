// GET /api/gator/me?token=TOKEN
// Returns { ok, gatorId, tag, displayTag, notifyEmail } or { ok: false }
const { getSupabase, verifySession } = require('../../lib/auth');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    res.setHeader('Cache-Control', 'no-store');

    const token = req.query.token;
    const supabase = getSupabase();
    if (!supabase) return res.status(500).json({ error: 'Database unavailable' });

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
};
