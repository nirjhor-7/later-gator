/**
 * Chrome DevTools Protocol (CDP) Client
 * Uses Chromium browser session WebSocket with Target.sendMessageToTarget
 * for 100% reliable headless browser automation.
 */

const { spawn } = require('child_process');
const http = require('http');

class CDPClient {
    constructor(options = {}) {
        this.cdpPort = options.cdpPort || Math.floor(11000 + Math.random() * 20000);
        this.chromeProcess = null;
        this.ws = null;
        this.sessionId = null;
        this.targetId = null;
        this.browserMsgId = 1;
        this.targetMsgId = 1000;
        this.pendingBrowserCallbacks = new Map();
        this.pendingTargetCallbacks = new Map();
        this.consoleErrors = [];
        this.allConsoleLogs = [];
        this.uncaughtExceptions = [];
    }

    async launch(initialUrl = 'http://localhost:3000/') {
        const args = [
            '--headless=new',
            '--no-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--disable-background-networking',
            '--no-first-run',
            `--remote-debugging-port=${this.cdpPort}`,
            initialUrl
        ];

        this.chromeProcess = spawn('chromium', args, { stdio: 'ignore' });

        // Wait for page target in /json/list
        let pageTarget = null;
        for (let i = 0; i < 40; i++) {
            await new Promise(r => setTimeout(r, 100));
            try {
                const list = await new Promise((res, rej) => {
                    const req = http.get(`http://127.0.0.1:${this.cdpPort}/json/list`, r => {
                        let data = '';
                        r.on('data', c => data += c);
                        r.on('end', () => {
                            try { res(JSON.parse(data)); } catch (e) { res([]); }
                        });
                    });
                    req.on('error', rej);
                    req.setTimeout(500, () => req.destroy());
                });
                pageTarget = list && list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
                if (pageTarget) break;
            } catch (e) {}
        }

        if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
            this.kill();
            throw new Error(`Failed to find page target in Chromium CDP on port ${this.cdpPort}`);
        }

        this.targetId = pageTarget.id;
        this.ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

        this.ws.addEventListener('message', (ev) => {
            let data;
            try { data = JSON.parse(ev.data); } catch (e) { return; }

            // Target callbacks
            if (data.id && this.pendingTargetCallbacks.has(data.id)) {
                const { resolve, reject } = this.pendingTargetCallbacks.get(data.id);
                this.pendingTargetCallbacks.delete(data.id);
                if (data.error) reject(new Error(data.error.message || JSON.stringify(data.error)));
                else resolve(data.result);
                return;
            }

            // Browser callbacks fallback
            if (data.id && this.pendingBrowserCallbacks.has(data.id)) {
                const { resolve, reject } = this.pendingBrowserCallbacks.get(data.id);
                this.pendingBrowserCallbacks.delete(data.id);
                if (data.error) reject(new Error(data.error.message || JSON.stringify(data.error)));
                else resolve(data.result);
                return;
            }

            // Handle runtime events
            if (data.method === 'Runtime.consoleAPICalled') {
                const type = data.params.type;
                const text = (data.params.args || []).map(a => a.value !== undefined ? a.value : (a.description || '')).join(' ');
                this.allConsoleLogs.push({ type, text });
                if (type === 'error') {
                    this.consoleErrors.push({ text, type, args: data.params.args });
                }
            } else if (data.method === 'Runtime.exceptionThrown') {
                const details = data.params.exceptionDetails;
                this.uncaughtExceptions.push({
                    text: details.text,
                    description: details.exception ? details.exception.description : '',
                    lineNumber: details.lineNumber,
                    columnNumber: details.columnNumber,
                    url: details.url
                });
            } else if (data.method === 'Inspector.detached') {
                console.error('INSPECTOR DETACHED:', data.params);
            }
        });

        this.ws.addEventListener('close', (ev) => {
            // Cancel pending promises if WS closes
            for (const [id, cb] of this.pendingTargetCallbacks.entries()) {
                cb.reject(new Error(`WebSocket closed (${ev.code}: ${ev.reason}) while waiting for id=${id}`));
            }
            this.pendingTargetCallbacks.clear();
        });

        await new Promise((resolve, reject) => {
            if (this.ws.readyState === 1) return resolve();
            this.ws.addEventListener('open', () => resolve(), { once: true });
            this.ws.addEventListener('error', (e) => reject(e), { once: true });
        });

        // Enable essential domains
        await this.sendTarget('Page.enable');
        await this.sendTarget('Runtime.enable');
    }

    sendBrowser(method, params = {}) {
        return this.sendTarget(method, params);
    }

    sendTarget(method, params = {}) {
        const id = this.targetMsgId++;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingTargetCallbacks.delete(id);
                reject(new Error(`Timed out waiting for target response to ${method} (id=${id})`));
            }, 6000);
            this.pendingTargetCallbacks.set(id, {
                resolve: (val) => { clearTimeout(timer); resolve(val); },
                reject: (err) => { clearTimeout(timer); reject(err); }
            });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async navigate(url, waitMs = 800) {
        await this.sendTarget('Page.navigate', { url });
        await new Promise(r => setTimeout(r, waitMs));
    }

    async setViewport(width, height, isMobile = false) {
        await this.sendTarget('Emulation.setDeviceMetricsOverride', {
            width,
            height,
            deviceScaleFactor: 1,
            mobile: isMobile
        });
        try {
            await this.evaluate('window.dispatchEvent(new Event("resize"))');
        } catch (e) {}
        await new Promise(r => setTimeout(r, 100));
    }

    async evaluate(expr, awaitPromise = false) {
        let code = typeof expr === 'function' ? `(${expr.toString()})()` : expr;
        const res = await this.sendTarget('Runtime.evaluate', {
            expression: code,
            returnByValue: true,
            awaitPromise
        });
        if (res && res.exceptionDetails) {
            throw new Error(`Evaluation failed: ${res.exceptionDetails.text} (${res.exceptionDetails.exception?.description || ''})`);
        }
        return res?.result?.value;
    }

    async waitForFunction(fnCode, timeoutMs = 5000, intervalMs = 100) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            try {
                const val = await this.evaluate(fnCode);
                if (val) return val;
            } catch (e) {}
            await new Promise(r => setTimeout(r, intervalMs));
        }
        throw new Error(`Timed out waiting for function: ${fnCode}`);
    }

    async waitForSelector(selector, timeoutMs = 5000) {
        return this.waitForFunction(`!!document.querySelector(${JSON.stringify(selector)})`, timeoutMs);
    }

    async click(selector) {
        const code = `
            (() => {
                const el = document.querySelector(${JSON.stringify(selector)});
                if (!el) throw new Error("Element not found: " + ${JSON.stringify(selector)});
                el.scrollIntoView({ block: 'center' });
                el.click();
                return true;
            })()
        `;
        return this.evaluate(code);
    }

    async type(selector, text) {
        const code = `
            (() => {
                const el = document.querySelector(${JSON.stringify(selector)});
                if (!el) throw new Error("Element not found: " + ${JSON.stringify(selector)});
                el.focus();
                el.value = ${JSON.stringify(text)};
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                return el.value;
            })()
        `;
        return this.evaluate(code);
    }

    async getText(selector) {
        return this.evaluate(`
            (() => {
                const el = document.querySelector(${JSON.stringify(selector)});
                return el ? el.textContent.trim() : null;
            })()
        `);
    }

    async getValue(selector) {
        return this.evaluate(`
            (() => {
                const el = document.querySelector(${JSON.stringify(selector)});
                return el ? el.value : null;
            })()
        `);
    }

    async getComputedStyle(selector, prop) {
        return this.evaluate(`
            (() => {
                const el = document.querySelector(${JSON.stringify(selector)});
                if (!el) return null;
                const style = window.getComputedStyle(el);
                return style.getPropertyValue(${JSON.stringify(prop)}) || style[${JSON.stringify(prop)}];
            })()
        `);
    }

    async getScrollMetrics() {
        return this.evaluate(`
            (() => ({
                scrollWidth: document.documentElement.scrollWidth,
                clientWidth: document.documentElement.clientWidth,
                scrollHeight: document.documentElement.scrollHeight,
                clientHeight: document.documentElement.clientHeight,
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight
            }))()
        `);
    }

    getConsoleErrors() {
        return [...this.consoleErrors];
    }

    getExceptions() {
        return [...this.uncaughtExceptions];
    }

    clearErrors() {
        this.consoleErrors = [];
        this.uncaughtExceptions = [];
    }

    kill() {
        if (this.ws) {
            try { this.ws.close(); } catch (e) {}
            this.ws = null;
        }
        if (this.chromeProcess) {
            try { this.chromeProcess.kill('SIGKILL'); } catch (e) {}
            this.chromeProcess = null;
        }
    }

    async close() {
        this.kill();
    }
}

module.exports = { CDPClient };
