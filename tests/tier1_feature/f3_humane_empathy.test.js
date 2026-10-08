/**
 * Tier 1 — Feature 3: Authentic Humane Content & Procrastination Empathy
 * Validates R2: Real, everyday human struggles across four key categories:
 * 1) Sleep evasion, 2) Tax paperwork, 3) Chore avoidance, 4) Work burnout,
 * alongside empathetic sanctuary framing and solidarity reactions.
 */

const { describe, test, expect, beforeAll, afterAll } = require('../infra/test_runner');
const { CDPClient } = require('../infra/cdp_client');
const { TestServer } = require('../infra/test_server');

describe('Tier 1 — F3: Authentic Humane Content & Procrastination Empathy', () => {
    let server;
    let client;
    let serverUrl;

    beforeAll(async () => {
        server = new TestServer();
        serverUrl = await server.start(8182);
        client = new CDPClient({ cdpPort: 9472 });
        await client.launch(serverUrl);
    });

    afterAll(async () => {
        if (client) await client.close();
        if (server) await server.stop();
    });

    test('F3-1: Sleep evasion content is prominently present in chips, prompts, or feed', async () => {
        const hasSleepContent = await client.evaluate(`
            (() => {
                const text = document.body.textContent.toLowerCase();
                return text.includes('sleep') || text.includes('bed') || text.includes('3 am');
            })()
        `);
        expect(hasSleepContent).toBe(true);
    });

    test('F3-2: Tax paperwork & bureaucracy content is represented in prompts, chips, or feed', async () => {
        const hasTaxContent = await client.evaluate(`
            (() => {
                const text = document.body.textContent.toLowerCase();
                return text.includes('tax') || text.includes('form') || text.includes('paperwork') || text.includes('bureau');
            })()
        `);
        expect(hasTaxContent).toBe(true);
    });

    test('F3-3: Chore avoidance (laundry, dishes, cleaning) is represented in chips or feed', async () => {
        const hasChoreContent = await client.evaluate(`
            (() => {
                const text = document.body.textContent.toLowerCase();
                return text.includes('laundry') || text.includes('clean') || text.includes('dishes') || text.includes('chore');
            })()
        `);
        expect(hasChoreContent).toBe(true);
    });

    test('F3-4: Work burnout & corporate fatigue (emails, meetings) is represented in chips or feed', async () => {
        const hasBurnoutContent = await client.evaluate(`
            (() => {
                const text = document.body.textContent.toLowerCase();
                return text.includes('email') || text.includes('meeting') || text.includes('work') || text.includes('deadlines');
            })()
        `);
        expect(hasBurnoutContent).toBe(true);
    });

    test('F3-5: Celestial sanctuary welcoming framing copy welcomes tired Earthlings', async () => {
        const sanctuaryCopy = await client.evaluate(`
            (() => {
                const text = document.body.textContent;
                const matchesSanctuary = text.includes('EARTH') || text.includes('SANCTUARY') || text.includes('EARTHLING') || text.includes('VOID');
                return matchesSanctuary;
            })()
        `);
        expect(sanctuaryCopy).toBe(true);
    });

    test('F3-6: Empathy reactions (SAME, VALID, RIP) are rendered on confession feed cards', async () => {
        const reactionButtons = await client.evaluate(`
            (() => {
                const stamps = Array.from(document.querySelectorAll('.reaction-stamp-btn, .reaction-capsule, .feed-stamp-btn, .lead-stamp-btn'));
                const texts = stamps.map(b => b.textContent.toUpperCase()).join(' ');
                return {
                    hasSame: texts.includes('SAME'),
                    hasValid: texts.includes('VALID'),
                    hasRip: texts.includes('RIP')
                };
            })()
        `);
        expect(reactionButtons.hasSame).toBe(true);
        expect(reactionButtons.hasValid).toBe(true);
        expect(reactionButtons.hasRip).toBe(true);
    });
});
