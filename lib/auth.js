// ============================================================
// Shared auth utilities — no external dependencies
// Uses Node.js built-in crypto (scrypt + randomBytes)
// ============================================================

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) return null;
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

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
        return 'Tag must be 3\u201324 characters.';
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

module.exports = {
    getSupabase, hashPassword, verifyPassword,
    generateToken, normalizeTag, validateTag, verifySession,
};
