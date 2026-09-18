// POST /api/gator/notify (called by Vercel Cron — every 15 min)
// Checks dispatch_notifications for milestone crossings and sends Bureau Communiqués
// Requires RESEND_API_KEY env var. Silently skips if not configured.

const { createClient } = require('@supabase/supabase-js');

const MILESTONES = [5, 25, 100, 500, 1000];

const MILESTONE_SUBJECTS = {
    5:    'BUREAU COMMUNIQUÉ — FIRST SYMPATHIZERS HAVE FILED',
    25:   'BUREAU COMMUNIQUÉ — YOUR DISPATCH IS CIRCULATING ON THE WIRE',
    100:  'BUREAU ALERT — YOUR DISPATCH HAS GONE VIRAL',
    500:  'BUREAU ALERT — HISTORIC SYMPATHY LEVELS RECORDED',
    1000: 'BUREAU COMMUNIQUÉ — LEGENDARY STATUS CONFERRED',
};

function buildEmailHtml(displayTag, task, milestone, counts) {
    const tag = displayTag || 'ANONYMOUS ASSET';
    const totalSame = counts.same || 0;
    const totalValid = counts.valid || 0;
    const totalRip = counts.rip || 0;
    const total = totalSame + totalValid + totalRip;

    const barMax = Math.max(totalSame, totalValid, totalRip, 1);
    const bar = (n) => '█'.repeat(Math.round((n / barMax) * 12)) + '░'.repeat(12 - Math.round((n / barMax) * 12));

    const taskText = (task || '').length > 120 ? task.slice(0, 120) + '...' : task;

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f5f0e8;font-family:'Courier New',Courier,monospace;color:#1a1a1a;">
<div style="max-width:560px;margin:0 auto;background:#faf7f0;border:2px solid #1a1a1a;padding:32px;">

  <div style="text-align:center;border-bottom:3px double #1a1a1a;padding-bottom:16px;margin-bottom:24px;">
    <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#666;">The Later Gators Wire Service</div>
    <div style="font-size:10px;letter-spacing:2px;color:#666;">Bureau of Idleness — Dispatch Division</div>
    <div style="font-size:20px;font-weight:bold;margin-top:8px;letter-spacing:2px;">◆ COMMUNIQUÉ ◆</div>
  </div>

  <table style="width:100%;font-size:12px;letter-spacing:1px;margin-bottom:20px;">
    <tr><td style="color:#666;padding:2px 0;">OPERATIVE:</td><td style="font-weight:bold;">${tag}</td></tr>
    <tr><td style="color:#666;padding:2px 0;">CLASSIFICATION:</td><td>SYMPATHY BULLETIN — ${total} STAMPS</td></tr>
  </table>

  <div style="border:1px solid #1a1a1a;padding:16px;margin-bottom:20px;background:#fff8ee;">
    <div style="font-size:10px;letter-spacing:2px;color:#666;margin-bottom:8px;">YOUR FILED DISPATCH:</div>
    <div style="font-style:italic;line-height:1.5;">"${taskText}"</div>
  </div>

  <div style="font-size:13px;font-weight:bold;letter-spacing:1px;margin-bottom:12px;">
    HAS BEEN SYMPATHIZED BY ${total} FELLOW GATORS.
  </div>

  <div style="font-size:12px;margin-bottom:20px;line-height:2;">
    <div>▸ [ SAME ]&nbsp;&nbsp; ${bar(totalSame)} ${totalSame}</div>
    <div>▸ [ VALID ] ${bar(totalValid)} ${totalValid}</div>
    <div>▸ [ RIP ]&nbsp;&nbsp; ${bar(totalRip)} ${totalRip}</div>
  </div>

  <div style="border-top:2px solid #1a1a1a;border-bottom:2px solid #1a1a1a;padding:12px 0;text-align:center;margin-bottom:20px;font-weight:bold;font-size:13px;letter-spacing:1px;">
    THE BUREAU HEREBY CERTIFIES THAT YOU ARE<br>NOT ALONE IN YOUR EVASION.<br>
    <span style="font-weight:normal;font-size:11px;">YOU ARE, IN FACT, DEEPLY NORMAL.</span>
  </div>

  <div style="text-align:center;margin-bottom:20px;">
    <a href="https://www.latergators.live" style="display:inline-block;background:#1a1a1a;color:#faf7f0;padding:10px 24px;text-decoration:none;font-size:12px;letter-spacing:2px;">
      → VIEW ON THE WIRE
    </a>
  </div>

  <div style="font-size:10px;color:#999;text-align:center;border-top:1px solid #ccc;padding-top:12px;line-height:1.8;">
    TRANSMITTED BY THE LATER GATORS WIRE<br>
    @thelatergators · latergators.live<br>
    <a href="https://www.latergators.live/unsubscribe" style="color:#999;">UNSUBSCRIBE — ONE CLICK, NO QUESTIONS ASKED</a>
  </div>

</div>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
    // Allow Vercel cron (GET) or manual trigger (POST)
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_KEY) {
        return res.status(200).json({ ok: true, skipped: true, reason: 'RESEND_API_KEY not configured' });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

    // Get all tracked dispatches that have an email and haven't hit the max milestone
    const { data: tracked } = await supabase
        .from('dispatch_notifications')
        .select('task_id, gator_id, notify_email, last_milestone')
        .not('notify_email', 'is', null)
        .lt('last_milestone', 1000);

    if (!tracked || tracked.length === 0) {
        return res.status(200).json({ ok: true, processed: 0 });
    }

    let sent = 0;
    for (const row of tracked) {
        const { data: task } = await supabase
            .from('tasks')
            .select('task, same_count, valid_count, rip_count')
            .eq('id', row.task_id)
            .maybeSingle();

        if (!task) continue;

        const total = (task.same_count || 0) + (task.valid_count || 0) + (task.rip_count || 0);
        const nextMilestone = MILESTONES.find(m => m > row.last_milestone && total >= m);
        if (!nextMilestone) continue;

        // Get display tag
        let displayTag = 'ANONYMOUS ASSET';
        if (row.gator_id) {
            const { data: gator } = await supabase
                .from('gator_tags')
                .select('display_tag')
                .eq('gator_id', row.gator_id)
                .maybeSingle();
            if (gator) displayTag = gator.display_tag;
        }

        const html = buildEmailHtml(displayTag, task.task, nextMilestone, {
            same: task.same_count, valid: task.valid_count, rip: task.rip_count
        });

        // Send via Resend
        const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'wire@latergators.live',
                to: [row.notify_email],
                subject: MILESTONE_SUBJECTS[nextMilestone] || 'BUREAU COMMUNIQUÉ',
                html,
            }),
        });

        if (emailRes.ok) {
            await supabase
                .from('dispatch_notifications')
                .update({ last_milestone: nextMilestone })
                .eq('task_id', row.task_id);
            sent++;
        }
    }

    return res.status(200).json({ ok: true, processed: tracked.length, sent });
};
