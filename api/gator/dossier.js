// GET /api/gator/dossier?token=TOKEN
// Returns the operative's filed dispatches with sympathy counts
const { getSupabase, verifySession } = require('./_auth');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    res.setHeader('Cache-Control', 'no-store');

    const token = req.query.token;
    const supabase = getSupabase();
    if (!supabase) return res.status(500).json({ error: 'Database unavailable' });

    const session = await verifySession(supabase, token);
    if (!session) return res.status(401).json({ ok: false, error: 'Not signed in.' });

    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, task, user_name, same_count, valid_count, rip_count, created_at')
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
};
