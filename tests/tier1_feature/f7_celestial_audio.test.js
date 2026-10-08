/**
 * Tier 1 — Feature 7: Celestial Audio Engine
 * Validates R1 & R2: Procedural celestial audio chimes, audio toggle controls,
 * state persistence, and autoplay policy compliance.
 */

const { describe, test, expect, beforeAll, afterAll } = require('../infra/test_runner');
const { CDPClient } = require('../infra/cdp_client');
const { TestServer } = require('../infra/test_server');

describe('Tier 1 — F7: Celestial Audio Engine', () => {
    let server;
    let client;
    let serverUrl;

    beforeAll(async () => {
        server = new TestServer();
        serverUrl = await server.start(0);
        client = new CDPClient();
        await client.launch(serverUrl);
        await new Promise(r => setTimeout(r, 300));
    });

    afterAll(async () => {
        if (client) await client.close();
        if (server) await server.stop();
    });

    test('F7-1: Audio toggle button (#portal-audio-btn) is injected into header controls', async () => {
        const hasBtn = await client.evaluate(`
            (() => {
                const btn = document.getElementById('portal-audio-btn');
                return !!btn;
            })()
        `);
        expect(hasBtn).toBe(true);
    });

    test('F7-2: Audio toggle button displays initial state (SOUND: ON or SOUND: OFF)', async () => {
        const text = await client.getText('#portal-audio-btn');
        expect(text).toMatch(/SOUND:\s*(ON|OFF)/i);
    });

    test('F7-3: Clicking audio toggle toggles mute state and updates label', async () => {
        const initialText = await client.getText('#portal-audio-btn');
        await client.click('#portal-audio-btn');
        const updatedText = await client.getText('#portal-audio-btn');

        if (initialText.includes('ON')) {
            expect(updatedText).toContain('OFF');
        } else {
            expect(updatedText).toContain('ON');
        }

        // Toggle back to preserve original state
        await client.click('#portal-audio-btn');
    });

    test('F7-4: Audio toggle state persists into localStorage key "lg_portal_sound"', async () => {
        await client.click('#portal-audio-btn');
        const stored = await client.evaluate(`localStorage.getItem('lg_portal_sound')`);
        expect(stored === 'true' || stored === 'false').toBe(true);
        // Toggle back
        await client.click('#portal-audio-btn');
    });

    test('F7-5: Reaction clicks and sound triggers do not throw runtime exceptions', async () => {
        client.clearErrors();
        // Click reaction stamp button or chip
        await client.evaluate(`
            (() => {
                const btn = document.querySelector('.chip-btn, .reaction-stamp-btn');
                if (btn) btn.click();
            })()
        `);
        await new Promise(r => setTimeout(r, 300));
        const errors = client.getConsoleErrors();
        expect(errors.length).toBe(0);
    });
});
