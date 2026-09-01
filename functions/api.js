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
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (!supabase) {
        return { 
            statusCode: 500, headers, 
            body: JSON.stringify({ error: "Supabase not configured in Netlify Env Vars." })
        };
    }

    const action = event.queryStringParameters.action;

    try {
        if (action === 'getWeekly') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const { data: tasks, error } = await supabase
                .from('tasks').select('text').gte('created_at', sevenDaysAgo.toISOString());
                
            if (error) throw error;
            if (!tasks || tasks.length === 0) return { statusCode: 200, headers, body: JSON.stringify({ text: 'Nothing yet!', count: 0 }) };

            const counts = {};
            let maxTask = { text: 'Nothing yet!', count: 0 };
            tasks.forEach(task => {
                const normalized = task.text.toLowerCase().trim();
                counts[normalized] = (counts[normalized] || 0) + 1;
                if (counts[normalized] > maxTask.count) maxTask = { text: task.text, count: counts[normalized] }; 
            });
            return { statusCode: 200, headers, body: JSON.stringify(maxTask) };
        }

        if (action === 'getStats') {
            const sessionId = event.queryStringParameters.session;
            if (sessionId) {
                await supabase.from('active_users').upsert({ session_id: sessionId, last_seen: new Date().toISOString() });
            }

            const { count: totalTasks } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
            const twentySecondsAgo = new Date(Date.now() - 20000).toISOString();
            const { count: activeCount } = await supabase.from('active_users').select('*', { count: 'exact', head: true }).gte('last_seen', twentySecondsAgo);
            const { count: totalVisitors } = await supabase.from('active_users').select('*', { count: 'exact', head: true });
            
            return {
                statusCode: 200, headers,
                body: JSON.stringify({
                    totalPostponed: totalTasks || 0,
                    currentlyProcrastinating: activeCount || 1,
                    totalVisitors: totalVisitors || 1
                })
            };
        }

        if (action === 'getTasks') {
            const { data: tasks, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(50);
            if (error) throw error;
            return { statusCode: 200, headers, body: JSON.stringify(tasks) };
        }

        if (action === 'postTask') {
            const body = JSON.parse(event.body);
            const { text, name, country } = body;
            
            if (!text || text.trim() === '') return { statusCode: 400, headers, body: JSON.stringify({ error: 'Task text required' }) };
            
            const finalName = (name && name.trim() !== '') ? name.trim() : 'Anonymous';
            const finalCountry = (country && country !== 'Unknown') ? country : 'Parts Unknown';

            const { data: newTask, error } = await supabase
                .from('tasks').insert([{ text: text.trim(), city: finalName, country: finalCountry }]).select().single();
                
            if (error) throw error;
            return { statusCode: 201, headers, body: JSON.stringify(newTask) };
        }

        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Action not found', action }) };
        
    } catch (err) {
        console.error(err);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal Server Error', details: err.message }) };
    }
};
