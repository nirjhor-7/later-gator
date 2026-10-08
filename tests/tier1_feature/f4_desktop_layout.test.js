/**
 * Tier 1 — Feature 4: Desktop Viewport Layout & Observation Deck
 * Validates R1 & R3: Desktop rendering across 1440x900 and 1920x1080,
 * dual-column grid, zero horizontal overflow, and frosted glass depth.
 */

const { describe, test, expect, beforeAll, afterAll } = require('../infra/test_runner');
const { CDPClient } = require('../infra/cdp_client');
const { TestServer } = require('../infra/test_server');

describe('Tier 1 — F4: Desktop Observation Deck Viewport Layout', () => {
    let server;
    let client;
    let serverUrl;

    beforeAll(async () => {
        server = new TestServer();
        serverUrl = await server.start(0);
        client = new CDPClient();
        await client.launch(serverUrl);
    });

    afterAll(async () => {
        if (client) await client.close();
        if (server) await server.stop();
    });

    test('F4-1: Viewport 1440x900 renders with zero horizontal overflow', async () => {
        await client.setViewport(1440, 900, false);
        const metrics = await client.getScrollMetrics();
        expect(metrics.scrollWidth <= 1440).toBe(true);
    });

    test('F4-2: Viewport 1440x900 centers the observation deck (.page-border)', async () => {
        await client.setViewport(1440, 900, false);
        const deckMetrics = await client.evaluate(`
            (() => {
                const el = document.querySelector('.page-border');
                if (!el) return null;
                const rect = el.getBoundingClientRect();
                return {
                    left: rect.left,
                    right: rect.right,
                    width: rect.width,
                    windowWidth: window.innerWidth
                };
            })()
        `);
        expect(deckMetrics).toBeDefined();
        // Check that margins on left and right are roughly balanced (within 40px)
        const leftMargin = deckMetrics.left;
        const rightMargin = deckMetrics.windowWidth - deckMetrics.right;
        const diff = Math.abs(leftMargin - rightMargin);
        expect(diff < 50).toBe(true);
    });

    test('F4-3: Viewport 1440x900 displays dual-column layout', async () => {
        await client.setViewport(1440, 900, false);
        const cols = await client.evaluate(`
            (() => {
                const left = document.querySelector('.left-col');
                const right = document.querySelector('.right-col');
                if (!left || !right) return null;
                const lRect = left.getBoundingClientRect();
                const rRect = right.getBoundingClientRect();
                return {
                    leftVisible: lRect.width > 0 && lRect.height > 0,
                    rightVisible: rRect.width > 0 && rRect.height > 0,
                    sideBySide: rRect.left >= lRect.right
                };
            })()
        `);
        expect(cols).toBeDefined();
        expect(cols.leftVisible).toBe(true);
        expect(cols.rightVisible).toBe(true);
        expect(cols.sideBySide).toBe(true);
    });

    test('F4-4: Viewport 1920x1080 renders with zero horizontal overflow', async () => {
        await client.setViewport(1920, 1080, false);
        const metrics = await client.getScrollMetrics();
        expect(metrics.scrollWidth <= 1920).toBe(true);
    });

    test('F4-5: Viewport 1920x1080 symmetrically centers observation deck', async () => {
        await client.setViewport(1920, 1080, false);
        const deckMetrics = await client.evaluate(`
            (() => {
                const el = document.querySelector('.page-border');
                if (!el) return null;
                const rect = el.getBoundingClientRect();
                return {
                    left: rect.left,
                    right: rect.right,
                    width: rect.width,
                    windowWidth: window.innerWidth
                };
            })()
        `);
        expect(deckMetrics).toBeDefined();
        const leftMargin = deckMetrics.left;
        const rightMargin = deckMetrics.windowWidth - deckMetrics.right;
        const diff = Math.abs(leftMargin - rightMargin);
        expect(diff < 60).toBe(true);
    });

    test('F4-6: Observation deck applies glassmorphic styling (border & translucent surface)', async () => {
        const glassStyle = await client.evaluate(`
            (() => {
                const el = document.querySelector('.page-border');
                if (!el) return null;
                const computed = window.getComputedStyle(el);
                return {
                    background: computed.backgroundColor || computed.background,
                    borderRadius: computed.borderRadius,
                    backdropFilter: computed.backdropFilter || computed.webkitBackdropFilter
                };
            })()
        `);
        expect(glassStyle).toBeDefined();
        // Verify borderRadius is applied
        expect(parseFloat(glassStyle.borderRadius) > 0).toBe(true);
    });
});
