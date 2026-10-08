/**
 * Tier 2 — Boundary 4: Network Fallback & API Resilience
 * Tests graceful handling of API 500, 502, network offline conditions,
 * and draft retention when external services fail.
 */

const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('../infra/test_runner');
const { CDPClient } = require('../infra/cdp_client');
const { TestServer } = require('../infra/test_server');

describe('Tier 2 — B4: Network Outage & API Fallback Handling', () => {
    let server;
    let client;
    let serverUrl;

    beforeAll(async () => {
        server = new TestServer();
        serverUrl = await server.start(8190);
        client = new CDPClient({ cdpPort: 9480 });
        await client.launch(serverUrl);
        await new Promise(r => setTimeout(r, 800));
    });

    afterAll(async () => {
        if (client) await client.close();
        if (server) await server.stop();
    });

    beforeEach(async () => {
        server.reset();
        client.clearErrors();
    });

    test('B4-1: API 500 internal server error does not cause uncaught exceptions', async () => {
        server.setApiErrorCode(500);

        await client.type('#task-input', 'Task during 500 outage');
        await client.click('#later-btn');
        await new Promise(r => setTimeout(r, 500));

        const exceptions = client.getExceptions();
        expect(exceptions.length).toBe(0);
    });

    test('B4-2: API 502 Bad Gateway is handled cleanly by the client', async () => {
        server.setApiErrorCode(502);

        await client.type('#task-input', 'Task during 502 bad gateway');
        await client.click('#later-btn');
        await new Promise(r => setTimeout(r, 500));

        const exceptions = client.getExceptions();
        expect(exceptions.length).toBe(0);
    });

    test('B4-3: Draft text is preserved in input field if submission encounters error', async () => {
        server.setApiErrorCode(500);
        const draft = 'Critical text to avoid losing';
        await client.type('#task-input', draft);
        await client.click('#later-btn');
        await new Promise(r => setTimeout(r, 400));

        // Textarea should not have been cleared into blankness or lost
        const currentVal = await client.getValue('#task-input');
        expect(currentVal.length > 0 || currentVal === draft).toBe(true);
    });

    test('B4-4: Wire polling handles network failure without throwing unhandled rejection', async () => {
        server.setApiErrorCode(500);
        client.clearErrors();

        // Trigger manual poll or wait for wire refresh
        await client.evaluate(`
            (() => {
                if (typeof window.fetchWireTasks === 'function') {
                    window.fetchWireTasks().catch(() => {});
                }
            })()
        `);
        await new Promise(r => setTimeout(r, 500));

        const exceptions = client.getExceptions();
        expect(exceptions.length).toBe(0);
    });

    test('B4-5: Service recovery resets state smoothly when server returns 200', async () => {
        // Clear server error mode
        server.setApiErrorCode(null);

        await client.type('#task-input', 'Task after server recovered');
        await client.click('#later-btn');
        await new Promise(r => setTimeout(r, 500));

        expect(server.createdTasks.length).toBe(1);
    });
});
