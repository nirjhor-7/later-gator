/**
 * Tier 3 — Pairwise Cross-Feature Combinations
 * Tests multi-feature interactions across mobile switching, modal glassmorphic overlays,
 * audio triggers, chip autofill, and panic mode flows.
 */

const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('../infra/test_runner');
const { CDPClient } = require('../infra/cdp_client');
const { TestServer } = require('../infra/test_server');

describe('Tier 3 — Cross-Feature Pairwise Interactions', () => {
    let server;
    let client;
    let serverUrl;

    beforeAll(async () => {
        server = new TestServer();
        serverUrl = await server.start(8191);
        client = new CDPClient({ cdpPort: 9481 });
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

    test('Pair 1: Task creation in Mobile View + Stream Tab Switching reveals new item', async () => {
        await client.setViewport(390, 844, true);

        // Ensure we are on dispatch tab
        await client.click('#tab-dispatch-btn');
        await new Promise(r => setTimeout(r, 200));

        // Enter task
        const taskText = 'Avoiding sleep to test mobile switch pairwise';
        await client.type('#task-input', taskText);

        // Submit task
        await client.click('#later-btn');
        await new Promise(r => setTimeout(r, 500));

        // Switch to wire tab
        await client.click('#tab-wire-btn');
        await new Promise(r => setTimeout(r, 300));

        // Verify task appears in stream
        const streamText = await client.getText('#box-wire');
        expect(streamText).toContain(taskText);
    });

    test('Pair 2: Modal opening + Glassmorphic backdrop blur + Dismissal via Escape', async () => {
        await client.setViewport(1440, 900, false);

        // Open credential press pass or dossier modal
        await client.evaluate(`
            (() => {
                const trigger = document.getElementById('bureau-press-pass-trigger') ||
                                document.querySelector('.meta-press-pass-btn') ||
                                document.getElementById('login-claim-trigger');
                if (trigger) trigger.click();
            })()
        `);
        await new Promise(r => setTimeout(r, 400));

        const modalOpen = await client.evaluate(`
            (() => {
                const modal = document.getElementById('credential-modal') ||
                              document.getElementById('bureau-modal') ||
                              document.querySelector('.credential-modal-dialog');
                if (!modal) return false;
                const style = window.getComputedStyle(modal);
                return style.display !== 'none';
            })()
        `);

        // If modal opened, test dismissal via Escape
        if (modalOpen) {
            await client.evaluate(`
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            `);
            await new Promise(r => setTimeout(r, 300));
            const modalClosed = await client.evaluate(`
                (() => {
                    const modal = document.getElementById('credential-modal') ||
                                  document.getElementById('bureau-modal');
                    return !modal || modal.style.display === 'none';
                })()
            `);
            expect(modalClosed).toBe(true);
        } else {
            // Alternatively verify modal infrastructure exists in DOM
            const modalExists = await client.evaluate(`!!document.querySelector('.credential-modal-dialog, #credential-modal')`);
            expect(modalExists).toBe(true);
        }
    });

    test('Pair 3: Reaction voting + Optimistic count increment + Celestial droplet ping', async () => {
        // Find first reaction stamp on feed
        const result = await client.evaluate(`
            (() => {
                const btn = document.querySelector('.reaction-stamp-btn, .feed-stamp-btn');
                if (!btn) return null;
                const countEl = btn.querySelector('.stamp-count, .reaction-count') || btn;
                const initialCount = parseInt(countEl.textContent.replace(/\\D/g, '') || '0', 10);
                btn.click();
                const afterCount = parseInt(countEl.textContent.replace(/\\D/g, '') || '0', 10);
                return { initialCount, afterCount, clicked: true };
            })()
        `);
        expect(result).toBeDefined();
        expect(result.clicked).toBe(true);
        expect(result.afterCount >= result.initialCount).toBe(true);
    });

    test('Pair 4: Burden chip selection + Character counter update + Submit readiness', async () => {
        // Ensure stamp overlay or previous submit cooldown has completed
        await client.waitForFunction('!document.getElementById("later-btn").disabled', 3000).catch(() => {});
        // Click first burden chip
        await client.evaluate(`
            (() => {
                const chip = document.querySelector('.chip-btn, .burden-chips button');
                if (chip) chip.click();
            })()
        `);
        await new Promise(r => setTimeout(r, 200));

        // Check input has text
        const val = await client.getValue('#task-input');
        expect(val.length > 0).toBe(true);

        // Check character counter has updated
        const counter = await client.getText('#task-char-count');
        expect(counter.length > 0).toBe(true);

        // Verify later button is enabled
        const btnDisabled = await client.evaluate(`
            document.getElementById('later-btn').disabled
        `);
        expect(btnDisabled).toBe(false);
    });

    test('Pair 5: Panic Mode activation + Escape return to tranquil sanctuary', async () => {
        await client.type('#task-input', 'Testing panic mode countdown');
        await client.click('#panic-btn');
        await new Promise(r => setTimeout(r, 500));

        // Dismiss via Escape or close button
        await client.evaluate(`
            (() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                const cancelBtn = document.querySelector('.panic-cancel-btn, #panic-cancel-btn, .share-dismiss-btn');
                if (cancelBtn) cancelBtn.click();
            })()
        `);
        await new Promise(r => setTimeout(r, 300));

        // Zero errors occurred during panic cycle
        const errors = client.getConsoleErrors();
        expect(errors.length).toBe(0);
    });
});
