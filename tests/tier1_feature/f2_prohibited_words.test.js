/**
 * Tier 1 — Feature 2: Prohibited Sci-Fi Jargon Scanner
 * Validates R2: Strictly authentic humane copy & zero occurrences of
 * prohibited sci-fi words: martian, alien, cryo, warp, starfleet, astronaut, payload.
 */

const fs = require('fs');
const path = require('path');
const { describe, test, expect, beforeAll, afterAll } = require('../infra/test_runner');
const { CDPClient } = require('../infra/cdp_client');
const { TestServer } = require('../infra/test_server');

const REPO_ROOT = path.resolve(__dirname, '../..');
const PROHIBITED_WORDS = ['martian', 'alien', 'cryo', 'warp', 'starfleet', 'astronaut', 'payload'];

function scanTextForProhibitedWords(text, label = '') {
    const found = [];
    for (const word of PROHIBITED_WORDS) {
        const regex = new RegExp(`\\b${word}s?\\b`, 'gi');
        const matches = text.match(regex);
        if (matches && matches.length > 0) {
            found.push({ word, count: matches.length, matches });
        }
    }
    return found;
}

describe('Tier 1 — F2: Prohibited Sci-Fi Jargon Scanner', () => {
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

    test('F2-1: Zero prohibited words in "index.html"', () => {
        const content = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
        const violations = scanTextForProhibitedWords(content, 'index.html');
        expect(violations.length).toBe(0);
    });

    test('F2-2: Zero prohibited words in "portal.css"', () => {
        const content = fs.readFileSync(path.join(REPO_ROOT, 'portal.css'), 'utf8');
        const violations = scanTextForProhibitedWords(content, 'portal.css');
        expect(violations.length).toBe(0);
    });

    test('F2-3: Zero prohibited words in "js/portal.js"', () => {
        const content = fs.readFileSync(path.join(REPO_ROOT, 'js/portal.js'), 'utf8');
        const violations = scanTextForProhibitedWords(content, 'js/portal.js');
        expect(violations.length).toBe(0);
    });

    test('F2-4: Zero prohibited words in rendered live DOM body text', async () => {
        const bodyText = await client.evaluate('document.body.textContent');
        const violations = scanTextForProhibitedWords(bodyText, 'DOM textContent');
        expect(violations.length).toBe(0);
    });

    test('F2-5: Zero prohibited words in rendered DOM attributes (placeholder, aria-label, title)', async () => {
        const attributeTexts = await client.evaluate(`
            (() => {
                const attrs = [];
                document.querySelectorAll('*').forEach(el => {
                    if (el.hasAttribute('placeholder')) attrs.push(el.getAttribute('placeholder'));
                    if (el.hasAttribute('aria-label')) attrs.push(el.getAttribute('aria-label'));
                    if (el.hasAttribute('title')) attrs.push(el.getAttribute('title'));
                    if (el.hasAttribute('alt')) attrs.push(el.getAttribute('alt'));
                });
                return attrs.join(' ');
            })()
        `);
        const violations = scanTextForProhibitedWords(attributeTexts, 'DOM attributes');
        expect(violations.length).toBe(0);
    });

    test('F2-6: Zero prohibited words in burden chips and quick selections', async () => {
        const chipsText = await client.evaluate(`
            (() => {
                const chips = Array.from(document.querySelectorAll('.chip-btn, .burden-chips button'));
                return chips.map(c => c.textContent).join(' ');
            })()
        `);
        const violations = scanTextForProhibitedWords(chipsText, 'burden chips');
        expect(violations.length).toBe(0);
    });
});
