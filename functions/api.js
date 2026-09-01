const { createClient } = require('@supabase/supabase-js');

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
    // Handle CORS preflight just in case
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (!supabase) {
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: "Supabase not configured in Netlify Env Vars. Please check your Netlify settings." })
        };
    }

    const path = event.path;
    const method = event.httpMethod;

    try {
        // 1. Weekly Most Neglected Task
        if (method === 'GET' && path.endsWith('/stats/weekly')) {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const { data: tasks, error } = await supabase
                .from('tasks')
                .select('text')
                .gte('created_at', sevenDaysAgo.toISOString());
                
            if (error) throw error;
            
            if (!tasks || tasks.length === 0) {
                return { statusCode: 200, headers, body: JSON.stringify({ text: 'Nothing yet!', count: 0 }) };
            }

            const counts = {};
            let maxTask = { text: 'Nothing yet!', count: 0 };
            tasks.forEach(task => {
                const normalized = task.text.toLowerCase().trim();
                counts[normalized] = (counts[normalized] || 0) + 1;
                if (counts[normalized] > maxTask.count) {
                    maxTask = { text: task.text, count: counts[normalized] }; 
                }
            });
            return { statusCode: 200, headers, body: JSON.stringify(maxTask) };
        }

        // 2. Main Stats (Active Users & Total Tasks)
        if (method === 'GET' && path.endsWith('/stats')) {
            const sessionId = event.queryStringParameters ? event.queryStringParameters.session : null;
            
            if (sessionId) {
                await supabase.from('active_users').upsert({ session_id: sessionId, last_seen: new Date().toISOString() });
            }

            const { count: totalTasks } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
            
            const twentySecondsAgo = new Date(Date.now() - 20000).toISOString();
            const { count: activeCount } = await supabase.from('active_users').select('*', { count: 'exact', head: true }).gte('last_seen', twentySecondsAgo);
            
            const { count: totalVisitors } = await supabase.from('active_users').select('*', { count: 'exact', head: true });
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    totalPostponed: totalTasks || 0,
                    currentlyProcrastinating: activeCount || 1,
                    totalVisitors: totalVisitors || 1
                })
            };
        }

        // 3. Get public feed tasks
        if (method === 'GET' && path.endsWith('/tasks')) {
            const { data: tasks, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(50);
            if (error) throw error;
            return { statusCode: 200, headers, body: JSON.stringify(tasks) };
        }

        // 4. Submit a new task
        if (method === 'POST' && path.endsWith('/tasks')) {
            const body = JSON.parse(event.body);
            const { text, name, country } = body;
            
            if (!text || text.trim() === '') return { statusCode: 400, headers, body: JSON.stringify({ error: 'Task text required' }) };
            
            const finalName = (name && name.trim() !== '') ? name.trim() : 'Anonymous';
            const finalCountry = (country && country !== 'Unknown') ? country : 'Parts Unknown';

            const { data: newTask, error } = await supabase
                .from('tasks')
                .insert([{ text: text.trim(), city: finalName, country: finalCountry }])
                .select()
                .single();
                
            if (error) throw error;
            return { statusCode: 201, headers, body: JSON.stringify(newTask) };
        }

        // 5. Fallback Route
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Route not found', path: event.path }) };
        
    } catch (err) {
        console.error(err);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal Server Error', details: err.message }) };
    }
};
