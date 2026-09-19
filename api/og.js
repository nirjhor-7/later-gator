const { createClient } = require('@supabase/supabase-js');
const { Resvg } = require('@resvg/resvg-js');

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

// Escape XML special characters for safe SVG embedding
function escapeXml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// Word-wrap text into lines
function wrapText(text, maxCharsPerLine = 38, maxLines = 3) {
    const words = (text || '').trim().split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (testLine.length <= maxCharsPerLine) {
            currentLine = testLine;
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
            if (lines.length >= maxLines - 1) break;
        }
    }
    if (currentLine && lines.length < maxLines) {
        lines.push(currentLine);
    }
    if (lines.length >= maxLines && words.length > 0) {
        const last = lines[lines.length - 1];
        if (!last.endsWith('...')) {
            lines[lines.length - 1] = last.replace(/[.,!?;]*$/, '') + '...';
        }
    }
    return lines;
}

module.exports = async function handler(req, res) {
    try {
        const query = req.query || (req.url ? Object.fromEntries(new URL(req.url, 'http://localhost').searchParams) : {});
        let taskText = (query.task || query.t || '').trim();
        let author = (query.author || query.by || '').trim();
        let rank = (query.rank || query.r || '').trim();

        // If no custom task was provided, fetch the top Chief Transgression from Supabase
        if (!taskText && supabase) {
            try {
                const { data: topTasks } = await supabase
                    .from('tasks')
                    .select('text, city, same_count, valid_count, rip_count')
                    .order('same_count', { ascending: false })
                    .limit(1);

                if (topTasks && topTasks[0] && topTasks[0].text) {
                    taskText = topTasks[0].text.replace('[PANIC] ', '');
                    author = author || topTasks[0].city || 'ANONYMOUS';
                }
            } catch (e) {}
        }

        if (!taskText) {
            taskText = "Staring at the ceiling instead of starting on today's urgent priorities.";
        }
        if (!author) {
            author = "ANONYMOUS IN PARTS UNKNOWN";
        }
        if (!rank) {
            rank = "CERTIFIED PROCRASTINATOR";
        }

        const safeTask = escapeXml(taskText);
        const safeAuthor = escapeXml(author.toUpperCase());
        const safeRank = escapeXml(rank.toUpperCase());

        // Typography calculations based on text length
        const charCount = safeTask.length;
        let fontSize = 40;
        let lineHeight = 52;
        let maxChars = 38;

        if (charCount <= 45) {
            fontSize = 48;
            lineHeight = 60;
            maxChars = 32;
        } else if (charCount <= 90) {
            fontSize = 38;
            lineHeight = 50;
            maxChars = 40;
        } else {
            fontSize = 32;
            lineHeight = 42;
            maxChars = 46;
        }

        const wrappedLines = wrapText(taskText, maxChars, 3);
        const startY = 370 - ((wrappedLines.length - 1) * lineHeight) / 2;

        const textTspans = wrappedLines.map((line, idx) => {
            return `<tspan x="600" y="${startY + (idx * lineHeight)}">${escapeXml(line)}</tspan>`;
        }).join('');

        const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <!-- Newsprint Paper Tint -->
  <rect width="100%" height="100%" fill="#f4efe6"/>

  <!-- BroadSheet Dual Borders -->
  <rect x="24" y="24" width="1152" height="582" fill="none" stroke="#1b1b1b" stroke-width="4"/>
  <rect x="34" y="34" width="1132" height="562" fill="none" stroke="#1b1b1b" stroke-width="1.5"/>

  <!-- Corner Dots -->
  <circle cx="29" cy="29" r="4" fill="#1b1b1b"/>
  <circle cx="1171" cy="29" r="4" fill="#1b1b1b"/>
  <circle cx="29" cy="601" r="4" fill="#1b1b1b"/>
  <circle cx="1171" cy="601" r="4" fill="#1b1b1b"/>

  <!-- Top Metadata Header -->
  <text x="600" y="65" font-family="monospace" font-weight="bold" font-size="14" fill="#1b1b1b" text-anchor="middle" letter-spacing="3">
    VOL. 1 • THE GLOBAL PROCRASTINATION JOURNAL • OFFICIAL WIRE TRANSMISSION
  </text>
  <line x1="50" y1="80" x2="1150" y2="80" stroke="#1b1b1b" stroke-width="1.5"/>

  <!-- Newspaper Headline -->
  <text x="600" y="155" font-family="sans-serif" font-weight="900" font-size="82" fill="#1b1b1b" text-anchor="middle" letter-spacing="3">
    LATER, GATORS
  </text>
  <text x="600" y="190" font-family="monospace" font-weight="bold" font-size="13" fill="#555555" text-anchor="middle" letter-spacing="4">
    PUBLISHED DAILY (EVENTUALLY) // BUREAU OF IDLENESS
  </text>

  <!-- Distressed Red Rubber Stamp in Upper Right -->
  <g transform="translate(1015, 135) rotate(12)">
    <rect x="-95" y="-30" width="190" height="60" fill="none" stroke="#b91c1c" stroke-width="3" stroke-dasharray="7 2.5" rx="3"/>
    <text x="0" y="-7" font-family="monospace" font-size="10.5" font-weight="900" fill="#b91c1c" text-anchor="middle" letter-spacing="1">★ OFFICIAL ★</text>
    <text x="0" y="10" font-family="monospace" font-size="12.5" font-weight="900" fill="#b91c1c" text-anchor="middle" letter-spacing="1">APPROVED</text>
    <text x="0" y="22" font-family="monospace" font-size="8" fill="#b91c1c" text-anchor="middle" letter-spacing="1">PERMIT #9402</text>
  </g>

  <!-- Alligator Crest in Upper Left -->
  <g transform="translate(85, 110) scale(0.65)">
    <path d="M10,25 Q15,18 28,19 Q38,14 55,16 Q72,12 88,22 Q96,24 99,28 Q92,30 85,29 Q70,36 50,34 Q32,35 22,30 Q14,32 10,25 Z" fill="#1b1b1b"/>
    <polygon points="32,18 35,12 38,18" fill="#8b0000"/>
    <polygon points="42,16 45,10 48,16" fill="#8b0000"/>
    <polygon points="52,15 55,9 58,15" fill="#8b0000"/>
    <polygon points="62,15 65,9 68,15" fill="#8b0000"/>
    <polygon points="72,16 75,11 78,16" fill="#8b0000"/>
    <circle cx="76" cy="18" r="2" fill="#f4efe6"/>
    <circle cx="76.5" cy="18" r="1" fill="#1b1b1b"/>
  </g>

  <!-- Thick Ornamental Rule -->
  <line x1="50" y1="210" x2="1150" y2="210" stroke="#1b1b1b" stroke-width="3"/>
  <line x1="50" y1="216" x2="1150" y2="216" stroke="#1b1b1b" stroke-width="1"/>

  <!-- Chief Transgression Eyebrow -->
  <rect x="410" y="240" width="380" height="30" fill="#1b1b1b"/>
  <text x="600" y="260" font-family="monospace" font-weight="bold" font-size="12.5" fill="#f4efe6" text-anchor="middle" letter-spacing="2">
    ★ TODAY'S CHIEF TRANSGRESSION ★
  </text>

  <!-- Confession Body Text -->
  <text font-family="serif" font-weight="bold" font-size="${fontSize}" fill="#1b1b1b" text-anchor="middle" font-style="italic">
    ${textTspans}
  </text>

  <!-- Sub-deck Byline -->
  <text x="600" y="480" font-family="monospace" font-weight="bold" font-size="14" fill="#8b0000" text-anchor="middle" letter-spacing="1.5">
    DISPATCHED BY: ${safeAuthor} • CLEARANCE: ${safeRank}
  </text>

  <!-- Bottom Divider & Footer -->
  <line x1="50" y1="535" x2="1150" y2="535" stroke="#1b1b1b" stroke-width="1.5"/>
  <text x="600" y="570" font-family="monospace" font-weight="bold" font-size="13" fill="#1b1b1b" text-anchor="middle" letter-spacing="3">
    THE GLOBAL PROCRASTINATION JOURNAL • TRANSMIT TO COWORKERS AT LATERGATORS.LIVE
  </text>
</svg>
        `;

        const resvg = new Resvg(svg, {
            fitTo: { mode: 'width', value: 1200 }
        });
        const pngData = resvg.render();
        const pngBuffer = pngData.asPng();

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
        return res.status(200).send(pngBuffer);

    } catch (err) {
        console.error('OG Image Generation Error:', err);
        if (typeof res.json === 'function') {
            return res.status(500).json({ error: err.message });
        }
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).send(JSON.stringify({ error: err.message }));
    }
};
