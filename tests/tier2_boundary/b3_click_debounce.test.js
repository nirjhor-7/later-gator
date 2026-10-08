/**
 * Tier 2 — Boundary 3: Rapid Double-Click Debouncing
 * Tests synchronous button disabling, request debouncing, and UI stability
 * when buttons are clicked in rapid succession.
 */

const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('../infra/test_runner');
const { CDPClient } = require('../infra/cdp_client');
const { TestServer } = require('../infra/test_server');

describe('Tier 2 — B3: Rapid Double-Click Debouncing', () => {
    let server;
    let client;
    let serverUrl;

    beforeAll(async () => {
        server = new TestServer();
        // Add artificial delay to verify disabled state during flight
        server.setDelayMs(200);
        serverUrl = await server.start(8189);
        client = new CDPClient({ cdpPort: 9479 });
        await client.launch(serverUrl);
        await new Promise(r => setTimeout(r, 800));
    });

    afterAll(async () => {
        if (client) await client.close();
        if (server) await server.stop();
    });

    beforeEach(async () => {
        server.reset();
        server.setDelayMs(200);
        await client.type('#task-input', '');
    });

    test('B3-1: Rapid clicks on submit button create exactly one task', async () => {
        await client.type('#task-input', 'Debounce test task for cosmic portal');

        // Rapid click 5 times within 50ms
        await client.evaluate(`
            (() => {
                const btn = document.getElementById('later-btn');
                for (let i = 0; i < 5; i++) {
                    btn.click();
                }
            })()
        `);

        // Wait for network response
        await new Promise(r => setTimeout(r, 600));

        // Exactly one task should be created
        expect(server.createdTasks.length).toBe(1);
    });

    test('B3-2: Submit button disables synchronously upon first click', async () => {
        await client.type('#task-input', 'Testing synchronous button disable');

        const wasDisabled = await client.evaluate(`
            (() => {
                const btn = document.getElementById('later-btn');
                btn.click();
                return btn.disabled;
            })()
        `);

        expect(wasDisabled).toBe(true);
        await new Promise(r => setTimeout(r, 400));
    });

    test('B3-3: Rapid clicking on reaction buttons avoids corrupting state', async () => {
        client.clearErrors();
        await client.evaluate(`
            (() => {
                const stamp = document.querySelector('.reaction-stamp-btn, .feed-stamp-btn, .reaction-capsule');
                if (stamp) {
                    for (let i = 0; i < 5; i++) stamp.click();
                }
            })()
        `);
        await new Promise(r => setTimeout(r, 400));
        const errors = client.getConsoleErrors();
        expect(errors.length).toBe(0);
    });

    test('B3-4: Rapid mobile tab toggling preserves consistent active tab class', async () => {
        await client.setViewport(390, 844, true);
        await client.evaluate(`
            (() => {
                const t1 = document.getElementById('tab-dispatch-btn');
                const t2 = document.getElementById('tab-wire-btn');
                const t3 = document.getElementById('tab-stats-btn');
                if (t1 && t2 && t3) {
                    t1.click(); t2.click(); t3.click(); t2.click();
                }
            })()
        `);
        await new Promise(r => setTimeout(r, 200));

        // Active tab must be the last one clicked (#tab-wire-btn)
        const wireActive = await client.evaluate(`
            (() => {
                const btn = document.getElementById('tab-wire-btn');
                return btn ? btn.classList.contains('active') : false;
            })()
        `);
        expect(wireActive).toBe(true);
        await client.setViewport(1440, 900, false);
    });

    test('B3-5: UI remains fully responsive after event bursts', async () => {
        await client.type('#task-input', 'Post-burst responsiveness verification');
        const typedVal = await client.getValue('#task-input');
        expect(typedVal).toContain('Post-burst');
    });
});
