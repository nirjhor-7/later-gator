/**
 * Tier 2 — Boundary 2: Empty & Whitespace Rejection
 * Tests that empty inputs, spaces, and multi-line whitespace are rejected,
 * preventing blank task submissions and maintaining feed integrity.
 */

const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('../infra/test_runner');
const { CDPClient } = require('../infra/cdp_client');
const { TestServer } = require('../infra/test_server');

describe('Tier 2 — B2: Empty & Whitespace-Only Submission Rejection', () => {
    let server;
    let client;
    let serverUrl;

    beforeAll(async () => {
        server = new TestServer();
        serverUrl = await server.start(8188);
        client = new CDPClient({ cdpPort: 9478 });
        await client.launch(serverUrl);
        await new Promise(r => setTimeout(r, 800));
    });

    afterAll(async () => {
        if (client) await client.close();
        if (server) await server.stop();
    });

    beforeEach(async () => {
        server.reset();
        await client.type('#task-input', '');
    });

    test('B2-1: Empty input submission displays validation prompt without creating task', async () => {
        await client.type('#task-input', '');
        await client.click('#later-btn');
        await new Promise(r => setTimeout(r, 200));

        const msg = await client.getText('#status-message');
        expect(msg.length > 0).toBe(true);
        expect(server.createdTasks.length).toBe(0);
    });

    test('B2-2: Spaces-only input submission is rejected', async () => {
        await client.type('#task-input', '     ');
        await client.click('#later-btn');
        await new Promise(r => setTimeout(r, 200));

        const msg = await client.getText('#status-message');
        expect(msg.length > 0).toBe(true);
        expect(server.createdTasks.length).toBe(0);
    });

    test('B2-3: Tabs and newlines whitespace submission is rejected', async () => {
        await client.type('#task-input', '\t\n   \n\t');
        await client.click('#later-btn');
        await new Promise(r => setTimeout(r, 200));

        expect(server.createdTasks.length).toBe(0);
    });

    test('B2-4: Panic mode button also rejects whitespace-only submission', async () => {
        await client.type('#task-input', '   ');
        await client.click('#panic-btn');
        await new Promise(r => setTimeout(r, 200));

        expect(server.createdTasks.length).toBe(0);
    });

    test('B2-5: Feed card list length is unaffected by rejected whitespace attempts', async () => {
        const initialFeedCount = await client.evaluate(`
            (() => document.querySelectorAll('.feed-item').length)()
        `);

        await client.type('#task-input', '   ');
        await client.click('#later-btn');
        await new Promise(r => setTimeout(r, 200));

        const postFeedCount = await client.evaluate(`
            (() => document.querySelectorAll('.feed-item').length)()
        `);

        expect(postFeedCount).toBe(initialFeedCount);
    });
});
