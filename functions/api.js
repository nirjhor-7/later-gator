const express = require('express');
const serverless = require('serverless-http');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    console.warn("⚠️ SUPABASE_URL or SUPABASE_KEY is missing from environment variables.");
}

const router = express.Router();

// Get recent tasks (public feed)
router.get('/tasks', async (req, res) => {
  try {
    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
        
    if (error) throw error;
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get statistics
router.get('/stats', async (req, res) => {
  try {
    const sessionId = req.query.session;

    if (sessionId) {
        await supabase
            .from('active_users')
            .upsert({ session_id: sessionId, last_seen: new Date().toISOString() });
    }

    const { count: totalTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true });
        
    const twentySecondsAgo = new Date(Date.now() - 20000).toISOString();
    const { count: activeCount } = await supabase
        .from('active_users')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen', twentySecondsAgo);
        
    const { count: totalVisitors } = await supabase
        .from('active_users')
        .select('*', { count: 'exact', head: true });
    
    res.json({
      totalPostponed: totalTasks || 0,
      currentlyProcrastinating: activeCount || 1,
      totalVisitors: totalVisitors || 1
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get weekly most neglected task
router.get('/stats/weekly', async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString();

    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('text')
        .gte('created_at', dateStr);
        
    if (error) throw error;

    if (!tasks || tasks.length === 0) {
        return res.json({ text: 'Nothing yet!', count: 0 });
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

    res.json(maxTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit a new task
router.post('/tasks', async (req, res) => {
  const { text, name, country } = req.body;
  
  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Task text is required' });
  }
  
  if (text.length > 200) {
    return res.status(400).json({ error: 'Task text is too long' });
  }
  
  if (name && name.length > 50) {
    return res.status(400).json({ error: 'Name is too long' });
  }

  const finalName = (name && name.trim() !== '') ? name.trim() : 'Anonymous';
  const finalCountry = (country && country !== 'Unknown') ? country : 'Parts Unknown';

  try {
    const { data: newTask, error } = await supabase
        .from('tasks')
        .insert([{ text: text.trim(), city: finalName, country: finalCountry }])
        .select()
        .single();
        
    if (error) throw error;
    
    res.status(201).json(newTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mount the router on the path Netlify expects
app.use('/.netlify/functions/api', router);

module.exports.handler = serverless(app);
