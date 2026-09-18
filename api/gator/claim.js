// POST /api/gator/claim
// Body: { tag, password, email? }
// Creates account, returns { ok, token, gatorId, displayTag }
const { getSupabase, hashPassword, generateToken, normalizeTag, validateTag } = require('./_auth');

// Simple profanity check reuse
function isClean(tag) {
    const bad = /\b(fuck|shit|cunt|cock|dick|pussy|ass(?:hole)?|bitch|nigger|faggot|retard)\w*/i;
    return !bad.test(tag);
}

module.exports = async function handler(req, res) {
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

    const supabase = getSupabase();
    if (!supabase) return res.status(500).json({ error: 'Database unavailable' });

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

    // Insert new operative
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

    // Transfer anonymous stamps from sessionId → gatorId
    if (sessionId) {
        await supabase
            .from('user_reactions')
            .update({ gator_id: gatorId })
            .eq('session_id', sessionId)
            .is('gator_id', null);
        // Transfer task authorship
        await supabase
            .from('tasks')
            .update({ author_gator_id: gatorId })
            .eq('session_id', sessionId)
            .is('author_gator_id', null);
    }

    return res.status(200).json({ ok: true, token, gatorId, displayTag, tag, notifyEmail: !!notifyEmail });
};
