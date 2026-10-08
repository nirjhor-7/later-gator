const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PROD_API = 'https://www.latergators.live';

const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
    // CORS headers for local prototyping
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Gator-Token, x-gator-token');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
    let pathname = parsedUrl.pathname;

    // Proxy API requests to live production so local testing has real live dispatches
    if (pathname.startsWith('/api/')) {
        const targetUrl = new URL(pathname + parsedUrl.search, PROD_API);
        const headers = { ...req.headers, host: targetUrl.host };
        delete headers['content-length'];

        const proxyReq = https.request(targetUrl, {
            method: req.method,
            headers
        }, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error('API Proxy error:', err.message);
            if (!res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'API Proxy unavailable' }));
            } else {
                res.destroy();
            }
        });

        req.pipe(proxyReq);
        return;
    }

    // Serve static files
    if (pathname === '/') pathname = '/index.html';
    const filePath = path.join(__dirname, pathname);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        // Disable caching for local development
        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        });

        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🐊 LATER, GATORS LOCAL DEV SERVER (experiment/new-ui)`);
    console.log(`======================================================`);
    console.log(`Local URL : http://localhost:${PORT}`);
    console.log(`API Proxy : Proxied to ${PROD_API}`);
    console.log(`Live Reload & No-Cache: Enabled`);
    console.log(`======================================================\n`);
});
