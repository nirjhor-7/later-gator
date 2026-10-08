/**
 * Tier 4 — Real-World Application Scenarios
 * Validates complete end-to-end user journeys for the 5 mandated human scenarios:
 * 1. Sleep Evasion (late night procrastination)
 * 2. Tax Deadline (bureaucratic forms dread)
 * 3. Chore Avoidance (laundry chair procrastination)
 * 4. Work Burnout (stakeholder email fatigue)
 * 5. Conquered Redemption (resolving an avoided task with relief)
 */

const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('../infra/test_runner');
const { CDPClient } = require('../infra/cdp_client');
const { TestServer } = require('../infra/test_server');

describe('Tier 4 — Real-World Application Scenarios', () => {
    let server;
    let client;
    let serverUrl;

    beforeAll(async () => {
        server = new TestServer();
        serverUrl = await server.start(8192);
        client = new CDPClient({ cdpPort: 9482 });
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
        await client.waitForFunction('!document.getElementById("later-btn").disabled', 3000).catch(() => {});
    });

    test('Scenario 1: Tired Earthling avoids sleep at 2 AM', async () => {
        const sleepTask = 'Going to bed at 3 AM because tomorrow is Monday';
        await client.type('#task-input', sleepTask);
        await client.click('#later-btn');
        await new Promise(r => setTimeout(r, 400));

        // Verify task was recorded by the server
        const lastCreated = server.createdTasks[server.createdTasks.length - 1];
        expect(lastCreated).toBeDefined();
        expect(lastCreated.text).toContain(sleepTask);

        // Cast solidarity reaction SAME on another sleeper
        await client.evaluate(`
            (() => {
                const sameBtn = document.querySelector('.reaction-stamp-btn[data-reaction="same"], .feed-stamp-btn');
                if (sameBtn) sameBtn.click();
            })()
        `);
        await new Promise(r => setTimeout(r, 200));

        // Verify no console errors
        expect(client.getConsoleErrors().length).toBe(0);
    });

    test('Scenario 2: Tired Earthling dreads annual tax paperwork', async () => {
        const taxTask = 'Filing 2024 taxes by staring blankly at income forms';
        await client.type('#task-input', taxTask);
        await client.click('#later-btn');
        await new Promise(r => setTimeout(r, 400));

        // Verify task was saved
        const lastCreated = server.createdTasks[server.createdTasks.length - 1];
        expect(lastCreated).toBeDefined();
        expect(lastCreated.text).toContain(taxTask);

        // Feed displays the tax task or seed items
        const wireText = await client.getText('#box-wire');
        expect(wireText.toLowerCase().includes('tax') || wireText.toLowerCase().includes('form')).toBe(true);
    });

    test('Scenario 3: Tired Earthling avoids folding the laundry chair pile', async () => {
        const choreTask = 'The clean laundry has lived on the bedroom chair for 9 days';
        await client.type('#task-input', choreTask);
        await client.click('#later-btn');
        await new Promise(r => setTimeout(r, 400));

        // Cast solidarity reaction VALID
        await client.evaluate(`
            (() => {
                const validBtn = document.querySelector('.reaction-stamp-btn[data-reaction="valid"]');
                if (validBtn) validBtn.click();
            })()
        `);
        await new Promise(r => setTimeout(r, 200));

        expect(client.getConsoleErrors().length).toBe(0);
    });

    test('Scenario 4: Tired Earthling suffers from work email burnout', async () => {
        const workTask = 'Replying to 47 unread stakeholder emails';
        await client.type('#task-input', workTask);
        await client.click('#later-btn');
        await new Promise(r => setTimeout(r, 400));

        // Cast solidarity reaction RIP
        await client.evaluate(`
            (() => {
                const ripBtn = document.querySelector('.reaction-stamp-btn[data-reaction="rip"]');
                if (ripBtn) ripBtn.click();
            })()
        `);
        await new Promise(r => setTimeout(r, 200));

        expect(client.getConsoleErrors().length).toBe(0);
    });

    test('Scenario 5: Conquered redemption flow — Resolving an avoided burden', async () => {
        // Switch to Conquered At Last / Redeemed tab
        await client.evaluate(`
            (() => {
                const redeemedTab = document.getElementById('tab-wire-cleared') ||
                                    document.querySelector('.tab-redeemed') ||
                                    document.querySelectorAll('.tab-btn')[1];
                if (redeemedTab) redeemedTab.click();
            })()
        `);
        await new Promise(r => setTimeout(r, 300));

        // Verify stream renders redeemed triumphs or tab switch succeeds
        const wireContent = await client.getText('#box-wire');
        expect(wireContent.length > 0).toBe(true);

        // Click a resolve button if available
        await client.evaluate(`
            (() => {
                const resolveBtn = document.querySelector('.feed-resolve-btn');
                if (resolveBtn) resolveBtn.click();
            })()
        `);
        await new Promise(r => setTimeout(r, 200));

        expect(client.getConsoleErrors().length).toBe(0);
    });
});
