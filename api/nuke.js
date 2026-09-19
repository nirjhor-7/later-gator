const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

function safeCompare(a, b) {
    if (!a || !b) return false;
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = async (req, res) => {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Require POST method for destructive database operations
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method not allowed. Destructive admin operations require POST with authorization.' 
        });
    }

    // Determine configured admin secret (ADMIN_SECRET, ADMIN_KEY, or SUPABASE_KEY)
    const validSecrets = [
        process.env.ADMIN_SECRET,
        process.env.ADMIN_KEY,
        process.env.SUPABASE_KEY
    ].filter(Boolean);

    if (validSecrets.length === 0) {
        return res.status(500).json({ 
            error: 'Admin authorization not configured on server.' 
        });
    }

    // Extract token from Authorization header, x-admin-key header, query string, or body
    const authHeader = req.headers['authorization'] || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const headerKey = req.headers['x-admin-key'] || '';
    const queryKey = req.query?.key || '';
    const bodyKey = (typeof req.body === 'object' && req.body !== null ? req.body.key : '') || '';

    const providedKey = bearerToken || headerKey || queryKey || bodyKey;

    const isAuthorized = validSecrets.some(sec => safeCompare(providedKey, sec));

    if (!isAuthorized) {
        return res.status(401).json({ 
            error: 'Unauthorized: Valid admin secret required to perform this action.' 
        });
    }

    // Require explicit confirmation parameter to prevent accidental invocation
    const confirm = req.query?.confirm === 'true' || (typeof req.body === 'object' && req.body !== null && req.body.confirm === true);
    if (!confirm) {
        return res.status(400).json({ 
            error: 'Confirmation required. Pass {"confirm": true} in body or ?confirm=true in query.' 
        });
    }

    try {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
            return res.status(500).json({ error: 'Supabase credentials missing on server' });
        }

        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        
        // Delete all rows in active_users to completely reset the unique visitor and active user ghost count
        const { error } = await supabase
            .from('active_users')
            .delete()
            .neq('session_id', 'impossible');

        if (error) throw error;

        return res.status(200).json({ 
            success: true, 
            message: "DATABASE NUKED SUCCESSFULLY. Active users and visitor records reset by authorized administrator." 
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
