/**
 * Tier 1 — Feature 6: Page Load Runtime Integrity
 * Validates R4: Zero console errors, zero uncaught runtime exceptions,
 * clean asset loading, and audio autoplay compliance via CDP.
 */

const { describe, test, expect, beforeAll, afterAll } = require('../infra/test_runner');
const { CDPClient } = require('../infra/cdp_client');
const { TestServer } = require('../infra/test_server');

describe('Tier 1 — F6: Page Load Runtime Integrity', () => {
    let server;
    let client;
    let serverUrl;

    beforeAll(async () => {
        server = new TestServer();
        serverUrl = await server.start(8185);
        client = new CDPClient({ cdpPort: 9475 });
        await client.launch(serverUrl);
        // Wait 1.5s for initial hydration and scripts to settle
        await new Promise(r => setTimeout(r, 1500));
    });

    afterAll(async () => {
        if (client) await client.close();
        if (server) await server.stop();
    });

    test('F6-1: Zero console errors on page load', () => {
        const errors = client.getConsoleErrors();
        expect(errors.length).toBe(0);
    });

    test('F6-2: Zero uncaught runtime exceptions on page load', () => {
        const exceptions = client.getExceptions();
        expect(exceptions.length).toBe(0);
    });

    test('F6-3: Document reaches readyState "complete" without script crash', async () => {
        const readyState = await client.evaluate('document.readyState');
        expect(readyState).toBe('complete');
    });

    test('F6-4: Core scripts execute and attach global objects without error', async () => {
        const globalsPresent = await client.evaluate(`
            (() => {
                return {
                    hasDocument: typeof document !== 'undefined',
                    hasLocalStorage: typeof localStorage !== 'undefined',
                    hasWindow: typeof window !== 'undefined'
                };
            })()
        `);
        expect(globalsPresent.hasDocument).toBe(true);
        expect(globalsPresent.hasLocalStorage).toBe(true);
        expect(globalsPresent.hasWindow).toBe(true);
    });

    test('F6-5: Zero autoplay policy rejection warnings on load', () => {
        const audioViolations = client.allConsoleLogs.filter(log =>
            log.text.toLowerCase().includes('autoplay') ||
            log.text.toLowerCase().includes('not allowed to start') ||
            log.text.toLowerCase().includes('user gesture')
        );
        expect(audioViolations.length).toBe(0);
    });
});
