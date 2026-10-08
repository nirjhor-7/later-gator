/**
 * Adversarial Milestone 1 Empirical Stress Test Harness
 * 
 * Conducts exhaustive testing for:
 * 1. Prohibited terms (exact, case variations, plurals, substrings) across repository files.
 * 2. Hidden HTML attributes (aria-label, placeholder, title, data-*) in static markup & rendered DOM.
 * 3. User input edge cases: typing and submitting prohibited words, verifying zero UI breakage,
 *    zero console errors, zero uncaught exceptions, and graceful handling.
 * 4. API stress testing with prohibited terms and payloads.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { TestServer } = require('./infra/test_server');

const REPO_ROOT = path.resolve(__dirname, '..');
const PROHIBITED_BASES = ['martian', 'alien', 'cryo', 'warp', 'starfleet', 'astronaut', 'payload'];

// 1. Static Scan
function runStaticScan() {
    console.log('=== [PHASE 1] ADVERSARIAL STATIC SCAN ===');
    const targetExtensions = ['.html', '.css', '.js', '.json', '.md'];
    const excludeDirs = ['node_modules', '.git', '.agents'];
    
    const substringRegex = new RegExp(`(${PROHIBITED_BASES.join('|')})`, 'gi');
    const findings = [];
    const prodFiles = [];

    function walkDir(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relPath = path.relative(REPO_ROOT, fullPath);

            if (entry.isDirectory()) {
                if (excludeDirs.includes(entry.name)) continue;
                walkDir(fullPath);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (targetExtensions.includes(ext) || ['dev.js', 'script.js'].includes(entry.name)) {
                    // Exclude test suite and test harness files from failing on word list definitions
                    if (relPath.startsWith('tests/')) return;
                    prodFiles.push(relPath);

                    const content = fs.readFileSync(fullPath, 'utf8');
                    const lines = content.split('\n');

                    lines.forEach((line, idx) => {
                        const matches = line.match(substringRegex);
                        if (matches) {
                            findings.push({
                                file: relPath,
                                line: idx + 1,
                                matches,
                                text: line.trim()
                            });
                        }
                    });
                }
            }
        }
    }

    walkDir(REPO_ROOT);

    console.log(`Scanned ${prodFiles.length} production files across repository.`);
    console.log(`Prohibited term occurrences detected: ${findings.length}`);
    if (findings.length > 0) {
        findings.forEach(f => {
            console.error(`  VIOLATION: ${f.file}:${f.line} -> [${f.matches.join(', ')}] "${f.text.slice(0, 100)}"`);
        });
    }

    // Explicit scan of hidden attributes in index.html
    const indexHtml = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
    const attrRegex = /(aria-label|placeholder|title|alt|data-[a-z0-9-]+)\s*=\s*["']([^"']+)["']/gi;
    let attrMatch;
    const attrFindings = [];
    while ((attrMatch = attrRegex.exec(indexHtml)) !== null) {
        const attrName = attrMatch[1];
        const attrVal = attrMatch[2];
        const m = attrVal.match(substringRegex);
        if (m) {
            attrFindings.push({ attr: attrName, val: attrVal, matches: m });
        }
    }
    console.log(`Hidden HTML attributes scanned in index.html. Violations: ${attrFindings.length}`);

    return {
        passed: findings.length === 0 && attrFindings.length === 0,
        prodFilesScanned: prodFiles.length,
        findings,
        attrFindings
    };
}

// 2. Headless Chrome CDP Live Testing & User Input Edge Cases
async function runHeadlessEdgeCases(serverUrl) {
    console.log('\n=== [PHASE 2] HEADLESS CDP RENDERED DOM & USER INPUT EDGE CASES ===');
    const tmpDir = `/tmp/cdp_adv_${Date.now()}`;
    fs.mkdirSync(tmpDir, { recursive: true });
    const cdpPort = Math.floor(13000 + Math.random() * 15000);
    const chrome = spawn('chromium', [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--window-size=1440,900',
        `--user-data-dir=${tmpDir}`,
        `--remote-debugging-port=${cdpPort}`,
        serverUrl
    ]);

    let target = null;
    for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 100));
        try {
            const list = await new Promise((res, rej) => {
                http.get(`http://127.0.0.1:${cdpPort}/json/list`, r => {
                    let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
                }).on('error', rej);
            });
            target = list.find(p => p.type === 'page');
            if (target) break;
        } catch (e) {}
    }

    if (!target) {
        chrome.kill();
        fs.rmSync(tmpDir, { recursive: true, force: true });
        throw new Error('Could not connect to headless chromium');
    }

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(res => ws.onopen = res);

    const consoleMessages = [];
    const uncaughtExceptions = [];
    let msgId = 1;

    ws.addEventListener('message', (ev) => {
        let data;
        try { data = JSON.parse(ev.data); } catch (e) { return; }

        if (data.method === 'Runtime.consoleAPICalled') {
            consoleMessages.push({
                type: data.params.type,
                text: data.params.args.map(a => a.value !== undefined ? a.value : (a.description || '')).join(' ')
            });
        }
        if (data.method === 'Runtime.exceptionThrown') {
            uncaughtExceptions.push(data.params.exceptionDetails);
        }
    });

    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const curId = msgId++;
        const timer = setTimeout(() => {
            ws.removeEventListener('message', handler);
            reject(new Error(`Timeout waiting for ${method} (id=${curId})`));
        }, 8000);
        const handler = ev => {
            let d;
            try { d = JSON.parse(ev.data); } catch (e) { return; }
            if (d.id === curId) {
                clearTimeout(timer);
                ws.removeEventListener('message', handler);
                if (d.error) reject(new Error(d.error.message || JSON.stringify(d.error)));
                else resolve(d);
            }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: curId, method, params }));
    });

    async function evaluate(expression) {
        const res = await send('Runtime.evaluate', {
            expression,
            returnByValue: true
        });
        if (res.result && res.result.exceptionDetails) {
            console.error('EVAL ERROR for:', expression, JSON.stringify(res.result.exceptionDetails));
            throw new Error(res.result.exceptionDetails.text || 'CDP evaluation exception');
        }
        return (res.result && res.result.result) ? res.result.result.value : undefined;
    }

    await send('Runtime.enable');

    // Wait until document.body is available
    for (let i = 0; i < 30; i++) {
        const ready = await evaluate('document.readyState === "complete" && !!document.body');
        if (ready) break;
        await new Promise(r => setTimeout(r, 100));
    }

    // Test 2.1: Scan live rendered DOM innerText
    console.log('[Step 2.1] Inspecting live rendered DOM innerText for prohibited words...');
    const liveText = await evaluate('document.body.innerText') || '';
    const prohibitedRegex = new RegExp(`\\b(${PROHIBITED_BASES.join('|')})s?\\b`, 'gi');
    const domTextMatches = liveText.match(prohibitedRegex) || [];
    console.log(`Live DOM text prohibited word matches: ${domTextMatches.length}`);

    // Test 2.2: Scan all rendered attributes
    console.log('[Step 2.2] Inspecting all rendered DOM attributes...');
    const liveAttrs = await evaluate(`
        (() => {
            const findings = [];
            const regex = /(${PROHIBITED_BASES.join('|')})/i;
            document.querySelectorAll('*').forEach(el => {
                for (const attr of el.attributes) {
                    if (regex.test(attr.value)) {
                        findings.push({ tag: el.tagName, attr: attr.name, value: attr.value });
                    }
                }
            });
            return findings;
        })()
    `) || [];
    console.log(`Live DOM attributes prohibited word matches: ${liveAttrs.length}`);

    // Test 2.3: User input edge case - typing prohibited words into textarea
    console.log('[Step 2.3] Testing User Input Edge Case: Typing prohibited words into #task-input...');
    const testPhrase1 = "Escaping the starfleet warp core with an astronaut and martian cryo payload";
    const inputResult = await evaluate(`
        (() => {
            const input = document.getElementById('task-input');
            if (!input) return { error: '#task-input not found' };
            input.value = ${JSON.stringify(testPhrase1)};
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            
            const counter = document.getElementById('task-char-count');
            return {
                val: input.value,
                counterText: counter ? counter.textContent : null,
                valid: input.checkValidity()
            };
        })()
    `);
    console.log('Typing test result:', inputResult);

    const errorsAfterTyping = consoleMessages.filter(m => m.type === 'error');
    console.log(`Console errors after typing: ${errorsAfterTyping.length}`);

    // Test 2.4: Submitting the task containing prohibited words
    console.log('[Step 2.4] Testing User Input Edge Case: Submitting prohibited words via "SEND INTO THE VOID"...');
    const submitResult = await evaluate(`
        (() => {
            const submitBtn = document.getElementById('later-btn');
            if (!submitBtn) return { error: '#later-btn not found' };

            submitBtn.click();
            return { clicked: true };
        })()
    `);
    console.log('Submission click result:', submitResult);

    await new Promise(r => setTimeout(r, 600));

    const postSubmitCheck = await evaluate(`
        (() => {
            const input = document.getElementById('task-input');
            const wireItems = Array.from(document.querySelectorAll('.feed-item .headline')).map(h => h.textContent);
            const foundInWire = wireItems.some(text => text.includes("starfleet") || text.includes("payload"));
            const laterBtn = document.getElementById('later-btn');
            return {
                textareaVal: input ? input.value : null,
                buttonDisabled: laterBtn ? laterBtn.disabled : null,
                foundInWire,
                wireCount: wireItems.length
            };
        })()
    `);
    console.log('Post-submission state check:', postSubmitCheck);

    const errorsAfterSubmit = consoleMessages.filter(m => m.type === 'error');
    console.log(`Total console errors during submission: ${errorsAfterSubmit.length}`);
    console.log(`Uncaught exceptions: ${uncaughtExceptions.length}`);

    // Test 2.5: Submitting prohibited words with Panic button
    console.log('[Step 2.5] Testing Panic button submission with prohibited terms...');
    const panicResult = await evaluate(`
        (() => {
            const input = document.getElementById('task-input');
            const panicBtn = document.getElementById('panic-btn');
            if (!input || !panicBtn) return { error: 'Input or panic btn missing' };

            input.value = "Alien astronaut crying over taxes in cryo mode";
            input.dispatchEvent(new Event('input', { bubbles: true }));
            panicBtn.click();
            return { panicClicked: true };
        })()
    `);
    console.log('Panic submission result:', panicResult);
    await new Promise(r => setTimeout(r, 600));

    // Test 2.6: XSS attempt with prohibited words
    console.log('[Step 2.6] Testing XSS attempt with prohibited words...');
    const xssPayload = "<script>window._xss_escaped=true</script> alien payload warp";
    const xssResult = await evaluate(`
        (() => {
            const input = document.getElementById('task-input');
            const submitBtn = document.getElementById('later-btn');
            input.value = ${JSON.stringify(xssPayload)};
            input.dispatchEvent(new Event('input', { bubbles: true }));
            submitBtn.click();
            return {
                xssExecuted: window._xss_escaped === true
            };
        })()
    `);
    console.log('XSS execution check (should be false):', xssResult);

    ws.close();
    chrome.kill();
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}

    return {
        domTextMatches: domTextMatches.length,
        liveAttrsMatches: liveAttrs.length,
        typingHandledGracefully: inputResult && !inputResult.error,
        submissionHandledGracefully: postSubmitCheck && postSubmitCheck.buttonDisabled === false,
        consoleErrors: errorsAfterSubmit.length,
        uncaughtExceptions: uncaughtExceptions.length,
        xssPrevented: xssResult && xssResult.xssExecuted === false
    };
}

// 3. API direct test with prohibited terms
async function runApiStressTest(serverUrl) {
    console.log('\n=== [PHASE 3] API DIRECT ADVERSARIAL STRESS TEST ===');
    const parsed = new URL(serverUrl);
    function post(endpoint, data) {
        return new Promise((resolve, reject) => {
            const payloadStr = JSON.stringify(data);
            const req = http.request({
                hostname: parsed.hostname,
                port: parsed.port,
                path: endpoint,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payloadStr)
                }
            }, res => {
                let resData = '';
                res.on('data', chunk => resData += chunk);
                res.on('end', () => {
                    try {
                        resolve({ status: res.statusCode, body: JSON.parse(resData) });
                    } catch (e) {
                        resolve({ status: res.statusCode, body: resData });
                    }
                });
            });
            req.on('error', reject);
            req.write(payloadStr);
            req.end();
        });
    }

    const testCases = [
        { name: 'Direct prohibited task text', payload: { text: "Testing warp cryo payload submission" } },
        { name: 'Prohibited words in alias', payload: { text: "Avoid doing taxes", name: "Alien Martian" } },
        { name: 'Plural and compound forms', payload: { text: "Dodging astronauts and starfleets" } }
    ];

    const results = [];
    for (const tc of testCases) {
        try {
            const res = await post('/api/tasks', tc.payload);
            console.log(`API Test [${tc.name}]: HTTP ${res.status}`, res.body.success ? '-> Success' : res.body);
            results.push({ name: tc.name, status: res.status, success: res.body.success === true });
        } catch (err) {
            console.error(`API Test [${tc.name}] Failed:`, err.message);
            results.push({ name: tc.name, error: err.message, success: false });
        }
    }

    return results;
}

// Master execution
async function main() {
    let server = null;
    try {
        const staticResults = runStaticScan();

        server = new TestServer();
        const serverUrl = await server.start(8383);
        console.log(`TestServer started on: ${serverUrl}`);

        const headlessResults = await runHeadlessEdgeCases(serverUrl);
        const apiResults = await runApiStressTest(serverUrl);

        await server.stop();

        console.log('\n========================================');
        console.log('✦ ADVERSARIAL CHALLENGE SUMMARY ✦');
        console.log('========================================');
        console.log('Static Scan Passed:', staticResults.passed);
        console.log('Live DOM Prohibited Text Matches:', headlessResults.domTextMatches);
        console.log('Live DOM Prohibited Attribute Matches:', headlessResults.liveAttrsMatches);
        console.log('Typing Prohibited Words Handled Gracefully:', headlessResults.typingHandledGracefully);
        console.log('Submitting Prohibited Words Handled Gracefully:', headlessResults.submissionHandledGracefully);
        console.log('Console Errors:', headlessResults.consoleErrors);
        console.log('Uncaught Exceptions:', headlessResults.uncaughtExceptions);
        console.log('XSS Injection Prevented:', headlessResults.xssPrevented);
        console.log('API Direct Tests Passed:', apiResults.every(r => r.success));

        const overallPass = (
            staticResults.passed &&
            headlessResults.domTextMatches === 0 &&
            headlessResults.liveAttrsMatches === 0 &&
            headlessResults.typingHandledGracefully &&
            headlessResults.submissionHandledGracefully &&
            headlessResults.consoleErrors === 0 &&
            headlessResults.uncaughtExceptions === 0 &&
            headlessResults.xssPrevented &&
            apiResults.every(r => r.success)
        );

        console.log('\nFINAL VERDICT:', overallPass ? 'APPROVE' : 'CHALLENGE_FAILED');
        process.exit(overallPass ? 0 : 1);
    } catch (err) {
        if (server) await server.stop();
        console.error('Fatal error in stress test execution:', err);
        process.exit(1);
    }
}

main();
