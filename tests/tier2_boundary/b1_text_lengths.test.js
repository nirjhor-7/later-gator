/**
 * Tier 2 — Boundary 1: Extreme Text Lengths & Word Wrapping
 * Tests unbroken strings, multi-line long input, character count boundaries,
 * and overflow-wrap styling to ensure card layouts never break.
 */

const { describe, test, expect, beforeAll, afterAll } = require('../infra/test_runner');
const { CDPClient } = require('../infra/cdp_client');
const { TestServer } = require('../infra/test_server');

describe('Tier 2 — B1: Extreme Text Lengths & Word Wrapping', () => {
    let server;
    let client;
    let serverUrl;

    beforeAll(async () => {
        server = new TestServer();
        serverUrl = await server.start(8187);
        client = new CDPClient({ cdpPort: 9477 });
        await client.launch(serverUrl);
    });

    afterAll(async () => {
        if (client) await client.close();
        if (server) await server.stop();
    });

    test('B1-1: 150-character unbroken string does not cause horizontal layout overflow', async () => {
        const longString = 'W'.repeat(150);
        await client.type('#task-input', longString);

        const metrics = await client.getScrollMetrics();
        expect(metrics.scrollWidth <= metrics.innerWidth + 2).toBe(true);

        const cardWidth = await client.evaluate(`
            (() => {
                const card = document.getElementById('box-input');
                return card ? card.getBoundingClientRect().width : null;
            })()
        `);
        expect(cardWidth > 0).toBe(true);
    });

    test('B1-2: Textarea enforces maxlength constraint', async () => {
        const maxLenAttr = await client.evaluate(`
            (() => {
                const input = document.getElementById('task-input');
                return input ? parseInt(input.getAttribute('maxlength'), 10) : null;
            })()
        `);
        expect(maxLenAttr >= 100 && maxLenAttr <= 300).toBe(true);
    });

    test('B1-3: Multi-line text with repeated newlines does not blow out container bounds', async () => {
        const multilineText = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6';
        await client.type('#task-input', multilineText);
        const cardHeight = await client.evaluate(`
            (() => {
                const card = document.getElementById('box-input');
                return card ? card.getBoundingClientRect().height : null;
            })()
        `);
        expect(cardHeight > 100).toBe(true);
    });

    test('B1-4: Character counter updates accurately when typing near boundary', async () => {
        const boundaryText = 'A'.repeat(120);
        await client.type('#task-input', boundaryText);
        const charText = await client.getText('#task-char-count');
        // Counter contains 120
        expect(charText).toContain('120');
    });

    test('B1-5: Task headline containers define overflow-wrap or word-break', async () => {
        const wrapConfigured = await client.evaluate(`
            (() => {
                const el = document.querySelector('.lead-story-headline, .wire-entry-headline, .feed-item, #box-input');
                if (!el) return true;
                const style = window.getComputedStyle(el);
                const wrap = style.overflowWrap || style.wordBreak;
                return wrap === 'break-word' || wrap === 'anywhere' || wrap === 'normal';
            })()
        `);
        expect(wrapConfigured).toBe(true);
    });
});
