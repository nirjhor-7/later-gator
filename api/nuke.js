const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        
        // Delete all rows in active_users to completely reset the unique visitor and active user ghost count
        const { error } = await supabase
            .from('active_users')
            .delete()
            .neq('session_id', 'impossible');

        if (error) throw error;

        return res.status(200).json({ 
            success: true, 
            message: "DATABASE NUKED SUCCESSFULLY. All ghost users and duplicate visitors have been erased. You can now close this tab and refresh the main site!" 
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
