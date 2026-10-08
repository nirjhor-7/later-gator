/**
 * Dedicated Test Server for E2E Tests
 * Serves static assets and provides controllable mock APIs for Later Gator.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8'
};

const DEFAULT_SEED_TASKS = [
    {
        id: 101,
        text: 'Going to bed at 3 AM because tomorrow is Monday',
        location: 'TOKYO, JAPAN',
        alias: 'Kenji',
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        same_count: 88,
        valid_count: 65,
        rip_count: 24,
        category: 'sleep'
    },
    {
        id: 102,
        text: 'Filing 2024 taxes by staring blankly at income forms',
        location: 'BERLIN, GERMANY',
        alias: 'Fritz',
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        same_count: 42,
        valid_count: 31,
        rip_count: 19,
        category: 'taxes'
    },
    {
        id: 103,
        text: 'The clean laundry has lived on the bedroom chair for 9 days',
        location: 'TORONTO, CANADA',
        alias: 'Chloe',
        created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        same_count: 55,
        valid_count: 40,
        rip_count: 12,
        category: 'chores'
    },
    {
        id: 104,
        text: 'Replying to 47 unread stakeholder emails',
        location: 'LONDON, UK',
        alias: 'Sarah',
        created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        same_count: 112,
        valid_count: 94,
        rip_count: 51,
        category: 'burnout'
    }
];

const DEFAULT_SEED_TRIUMPHS = [
    {
        id: 501,
        task_id: 103,
        task_text: 'Folded the laundry after it sat on the chair for 9 days',
        author_name: 'Chloe',
        country: 'CANADA',
        avoided_duration: '9 days, 6 hours',
        cleared_type: 'conquered',
        created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString()
    }
];

class TestServer {
    constructor(rootDir = path.resolve(__dirname, '../..')) {
        this.rootDir = rootDir;
        this.server = null;
        this.port = null;
        this.apiErrorCode = null;
        this.delayMs = 0;
        this.createdTasks = [];
        this.reactionsReceived = [];
        this.tasks = JSON.parse(JSON.stringify(DEFAULT_SEED_TASKS));
        this.triumphs = JSON.parse(JSON.stringify(DEFAULT_SEED_TRIUMPHS));
    }

    setApiErrorCode(code) {
        this.apiErrorCode = code;
    }

    setDelayMs(ms) {
        this.delayMs = ms;
    }

    reset() {
        this.apiErrorCode = null;
        this.delayMs = 0;
        this.createdTasks = [];
        this.reactionsReceived = [];
        this.tasks = JSON.parse(JSON.stringify(DEFAULT_SEED_TASKS));
        this.triumphs = JSON.parse(JSON.stringify(DEFAULT_SEED_TRIUMPHS));
    }

    start(port = 0) {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => this.handleRequest(req, res));
            this.server.on('error', reject);
            this.server.listen(port, '127.0.0.1', () => {
                this.port = this.server.address().port;
                resolve(`http://127.0.0.1:${this.port}`);
            });
        });
    }

    stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => resolve());
            } else {
                resolve();
            }
        });
    }

    async handleRequest(req, res) {
        // Set standard security & no-cache headers
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            return res.end();
        }

        const url = new URL(req.url, `http://127.0.0.1:${this.port}`);
        const pathname = url.pathname;

        // Simulate delay if configured
        if (this.delayMs > 0 && pathname.startsWith('/api/')) {
            await new Promise(r => setTimeout(r, this.delayMs));
        }

        // Handle API routes
        if (pathname.startsWith('/api/')) {
            if (this.apiErrorCode && (pathname === '/api/tasks' || pathname === '/api/stats' || pathname === '/api/react')) {
                res.writeHead(this.apiErrorCode, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: `Simulated server error (${this.apiErrorCode})` }));
            }

            if (pathname === '/api/tasks' && req.method === 'GET') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify(this.tasks));
            }

            if (pathname === '/api/tasks' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', () => {
                    try {
                        const parsed = JSON.parse(body || '{}');
                        const newTask = {
                            id: Date.now(),
                            text: parsed.text || '',
                            location: 'EARTH SANCTUARY',
                            alias: parsed.name || 'Tired Earthling',
                            created_at: new Date().toISOString(),
                            same_count: 0,
                            valid_count: 0,
                            rip_count: 0,
                            category: 'general'
                        };
                        this.createdTasks.push(newTask);
                        this.tasks.unshift(newTask);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, task: newTask }));
                    } catch (e) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Invalid payload' }));
                    }
                });
                return;
            }

            if (pathname === '/api/react' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', () => {
                    try {
                        const parsed = JSON.parse(body || '{}');
                        this.reactionsReceived.push(parsed);
                        const target = this.tasks.find(t => t.id === parsed.taskId);
                        if (target) {
                            if (parsed.reactionType === 'same') target.same_count = (target.same_count || 0) + 1;
                            if (parsed.reactionType === 'valid') target.valid_count = (target.valid_count || 0) + 1;
                            if (parsed.reactionType === 'rip') target.rip_count = (target.rip_count || 0) + 1;
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    } catch (e) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Invalid payload' }));
                    }
                });
                return;
            }

            if (pathname === '/api/stats' && req.method === 'GET') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    totalPostponed: 352,
                    currentlyProcrastinating: this.tasks.length,
                    totalVisitors: 6140,
                    totalTriumphs: this.triumphs.length,
                    leaderboard: [
                        { country: 'UNITED STATES', count: 120 },
                        { country: 'GERMANY', count: 85 },
                        { country: 'JAPAN', count: 70 }
                    ]
                }));
            }

            if (pathname === '/api/stats' && req.method === 'POST') {
                req.resume();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: true }));
            }

            if (pathname === '/api/triumphs' && req.method === 'GET') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify(this.triumphs));
            }

            req.resume();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify([]));
        }

        // Static file serving
        let relPath = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
        const filePath = path.join(this.rootDir, relPath);

        // Security check
        if (!filePath.startsWith(this.rootDir)) {
            res.writeHead(403);
            return res.end('Forbidden');
        }

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const mime = MIME_TYPES[ext] || 'application/octet-stream';

            res.writeHead(200, {
                'Content-Type': mime,
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
            });
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
        }
    }
}

module.exports = { TestServer, DEFAULT_SEED_TASKS, DEFAULT_SEED_TRIUMPHS };
