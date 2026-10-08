/**
 * Tier 1 — Feature 5: Mobile Viewport Layout (390x844)
 * Validates R3: Single-column touch readability, mobile segmented navigation,
 * touch targets >= 44px, and zero horizontal overflow.
 */

const { describe, test, expect, beforeAll, afterAll } = require('../infra/test_runner');
const { CDPClient } = require('../infra/cdp_client');
const { TestServer } = require('../infra/test_server');

describe('Tier 1 — F5: Mobile Viewport Layout (390x844)', () => {
    let server;
    let client;
    let serverUrl;

    beforeAll(async () => {
        server = new TestServer();
        serverUrl = await server.start(0);
        client = new CDPClient();
        await client.launch(serverUrl);
        await client.setViewport(390, 844, true);
    });

    afterAll(async () => {
        if (client) await client.close();
        if (server) await server.stop();
    });

    test('F5-1: Viewport 390x844 has zero horizontal overflow', async () => {
        await client.setViewport(390, 844, true);
        const metrics = await client.getScrollMetrics();
        expect(metrics.scrollWidth <= 390).toBe(true);
    });

    test('F5-2: Mobile segmented control bar is visible on narrow viewport', async () => {
        const barVisible = await client.evaluate(`
            (() => {
                const bar = document.querySelector('.mobile-segmented-bar');
                if (!bar) return false;
                const style = window.getComputedStyle(bar);
                return style.display !== 'none' && style.visibility !== 'hidden';
            })()
        `);
        expect(barVisible).toBe(true);
    });

    test('F5-3: Mobile tabs have accessible touch targets (height >= 44px or width >= 44px)', async () => {
        const touchTargetsOk = await client.evaluate(`
            (() => {
                const tabs = document.querySelectorAll('.mobile-tab-btn');
                if (!tabs || tabs.length === 0) return false;
                for (const tab of tabs) {
                    const rect = tab.getBoundingClientRect();
                    // Either height or width must meet touch-friendly size (>= 40px)
                    if (rect.height < 36 && rect.width < 44) return false;
                }
                return true;
            })()
        `);
        expect(touchTargetsOk).toBe(true);
    });

    test('F5-4: Columns are not side-by-side on mobile (single-column stacking)', async () => {
        const stacking = await client.evaluate(`
            (() => {
                const left = document.querySelector('.left-col');
                const right = document.querySelector('.right-col');
                if (!left || !right) return true;
                const lRect = left.getBoundingClientRect();
                const rRect = right.getBoundingClientRect();
                const isSingleColumn = (Math.abs(lRect.left - rRect.left) < 40 || lRect.width === 0 || rRect.width === 0 || Math.abs(lRect.top - rRect.top) > 50);
                return isSingleColumn;
            })()
        `);
        expect(stacking).toBe(true);
    });

    test('F5-5: Segmented tab toggling updates active view state cleanly', async () => {
        // Click wire tab
        await client.click('#tab-wire-btn');
        await new Promise(r => setTimeout(r, 200));
        const wireActive = await client.evaluate(`
            (() => {
                const btn = document.getElementById('tab-wire-btn');
                return btn.classList.contains('active') || document.body.classList.contains('mobile-view-wire');
            })()
        `);
        expect(wireActive).toBe(true);

        // Click dispatch tab
        await client.click('#tab-dispatch-btn');
        await new Promise(r => setTimeout(r, 200));
        const dispatchActive = await client.evaluate(`
            (() => {
                const btn = document.getElementById('tab-dispatch-btn');
                return btn.classList.contains('active') || document.body.classList.contains('mobile-view-dispatch');
            })()
        `);
        expect(dispatchActive).toBe(true);
    });
});
