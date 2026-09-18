// POST /api/gator/logout
// Body: { token }
// Deletes the session
const { getSupabase } = require('./_auth');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { token } = req.body || {};
    if (!token) return res.status(200).json({ ok: true });
    const supabase = getSupabase();
    if (supabase) await supabase.from('gator_sessions').delete().eq('token', token);
    return res.status(200).json({ ok: true });
};
