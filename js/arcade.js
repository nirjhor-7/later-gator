/**
 * LATER, GATORS // THE POSTPONEMENT PARLOR
 * OPTION A: ARCADE CABINET CONTROLLER & TACTILE ENGINE
 */

(function () {
    'use strict';

    // 1. Initial Arcade Enhancements
    function initArcade() {
        setupHeaderControls();
        setupAudioHooks();
        setupFloatingCombos();
        setupKonamiCode();
        applyArcadeLabels();

        // Observe DOM mutations to continuously enhance dynamically rendered feed cards
        const observer = new MutationObserver(() => {
            enhanceDynamicFeedCards();
        });
        const feedWrap = document.querySelector('.newspaper-grid') || document.body;
        observer.observe(feedWrap, { childList: true, subtree: true });
        enhanceDynamicFeedCards();
    }

    // 2. Setup Header Controls (CRT Toggle & Audio Toggle)
    function setupHeaderControls() {
        const metaRight = document.querySelector('.meta-col-right') || document.querySelector('.meta-row-right');
        if (!metaRight) return;

        // Ensure CRT toggle exists
        let crtBtn = document.getElementById('arcade-crt-toggle-btn');
        if (!crtBtn) {
            crtBtn = document.createElement('button');
            crtBtn.type = 'button';
            crtBtn.id = 'arcade-crt-toggle-btn';
            crtBtn.className = 'arcade-btn crt-toggle-btn';
            crtBtn.title = 'Toggle CRT Phosphor Scanlines';
            metaRight.insertBefore(crtBtn, metaRight.firstChild);
        }

        // Check saved CRT mode
        const savedCrt = localStorage.getItem('lg_arcade_crt');
        const isCrtOff = savedCrt === 'off';
        if (isCrtOff) {
            document.body.classList.add('crt-off');
            crtBtn.textContent = 'CRT: OFF';
        } else {
            document.body.classList.remove('crt-off');
            crtBtn.textContent = 'CRT: ON';
        }

        crtBtn.addEventListener('click', () => {
            const nowOff = document.body.classList.toggle('crt-off');
            crtBtn.textContent = nowOff ? 'CRT: OFF' : 'CRT: ON';
            try {
                localStorage.setItem('lg_arcade_crt', nowOff ? 'off' : 'on');
            } catch (e) {}
            if (window.ArcadeAudio) window.ArcadeAudio.playBlipSound();
        });

        // Ensure Audio toggle exists
        let audioBtn = document.getElementById('arcade-audio-toggle-btn');
        if (!audioBtn) {
            audioBtn = document.createElement('button');
            audioBtn.type = 'button';
            audioBtn.id = 'arcade-audio-toggle-btn';
            audioBtn.className = 'arcade-btn audio-toggle-btn';
            audioBtn.title = 'Toggle 8-Bit Procedural Sound FX';
            metaRight.insertBefore(audioBtn, crtBtn.nextSibling);
        }

        const isMuted = window.ArcadeAudio && !window.ArcadeAudio.isSoundEnabled();
        audioBtn.textContent = isMuted ? 'AUDIO: MUTE' : 'AUDIO: 8-BIT';

        audioBtn.addEventListener('click', () => {
            if (window.ArcadeAudio) {
                const enabled = window.ArcadeAudio.toggleSound();
                audioBtn.textContent = enabled ? 'AUDIO: 8-BIT' : 'AUDIO: MUTE';
            }
        });
    }

    // 3. Hook Audio into Form, Reactions & Actions
    function setupAudioHooks() {
        // Later / Post button (Supports both #later-btn and #post-task-btn)
        const postBtn = document.getElementById('later-btn') || document.getElementById('post-task-btn');
        if (postBtn) {
            postBtn.addEventListener('click', () => {
                const input = document.getElementById('task-input');
                if (input && input.value.trim().length > 0) {
                    if (window.ArcadeAudio) window.ArcadeAudio.playCoinSound();
                }
            });
        }

        // Panic button
        const panicBtn = document.getElementById('panic-btn');
        if (panicBtn) {
            panicBtn.addEventListener('click', () => {
                if (window.ArcadeAudio) window.ArcadeAudio.playPanicSiren();
            });
        }

        // Global reaction listener with event delegation
        document.addEventListener('click', (e) => {
            const reactionBtn = e.target.closest('.reaction-stamp-btn');
            if (reactionBtn) {
                const type = reactionBtn.getAttribute('data-type');
                if (window.ArcadeAudio) {
                    if (type === 'same') window.ArcadeAudio.playBlipSound();
                    else if (type === 'valid') window.ArcadeAudio.play1UpSound();
                    else if (type === 'rip') window.ArcadeAudio.playFatalitySound();
                }
                triggerFloatingScore(reactionBtn, type);
                return;
            }

            const resolveBtn = e.target.closest('.feed-resolve-btn');
            if (resolveBtn) {
                if (window.ArcadeAudio) window.ArcadeAudio.playStageClearFanfare();
                triggerFloatingText(resolveBtn, 'STAGE CLEAR! +500 PTS', '#00ff66');
                return;
            }

            const chipBtn = e.target.closest('.chip-btn');
            if (chipBtn) {
                if (window.ArcadeAudio) window.ArcadeAudio.playBlipSound();
                return;
            }

            const fabBtn = e.target.closest('.mobile-fab-post');
            if (fabBtn) {
                if (window.ArcadeAudio) window.ArcadeAudio.playCoinSound();
                return;
            }
        });
    }

    // 4. Floating Arcade Combo Points
    function setupFloatingCombos() {
        const style = document.createElement('style');
        style.textContent = `
            .arcade-combo-float {
                position: fixed;
                font-family: 'Press Start 2P', monospace;
                font-size: 0.65rem;
                font-weight: 700;
                pointer-events: none;
                z-index: 10000;
                animation: arcadeFloatUp 0.85s cubic-bezier(0.1, 0.9, 0.2, 1) forwards;
                text-shadow: 0 0 8px rgba(0,0,0,0.9), 0 0 14px currentColor;
            }
            @keyframes arcadeFloatUp {
                0% {
                    opacity: 1;
                    transform: translateY(0) scale(0.9);
                }
                60% {
                    opacity: 1;
                    transform: translateY(-28px) scale(1.15);
                }
                100% {
                    opacity: 0;
                    transform: translateY(-48px) scale(0.9);
                }
            }
            .konami-banner {
                position: fixed;
                top: 24px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(90deg, #ff0077, #00f0ff);
                color: #fff;
                font-family: 'Press Start 2P', monospace;
                font-size: 0.80rem;
                padding: 14px 22px;
                border-radius: 8px;
                border: 3px solid #ffbe00;
                box-shadow: 0 0 30px rgba(0, 240, 255, 0.8);
                z-index: 99999;
                text-align: center;
                animation: arcadePulse 0.5s infinite alternate;
            }
        `;
        document.head.appendChild(style);
    }

    function triggerFloatingScore(btn, type) {
        let text = '+100 PTS';
        let color = '#00f0ff';
        if (type === 'same') {
            text = '2P CO-OP! +100';
            color = '#00f0ff';
        } else if (type === 'valid') {
            text = '1-UP SHIELD! 🛡️';
            color = '#00ff66';
        } else if (type === 'rip') {
            text = 'FATALITY! 💀';
            color = '#ff0077';
        }
        triggerFloatingText(btn, text, color);
    }

    function triggerFloatingText(element, text, color) {
        const rect = element.getBoundingClientRect();
        const floatEl = document.createElement('div');
        floatEl.className = 'arcade-combo-float';
        floatEl.textContent = text;
        floatEl.style.color = color;
        floatEl.style.left = `${rect.left + (rect.width / 2) - 40}px`;
        floatEl.style.top = `${rect.top - 12}px`;
        document.body.appendChild(floatEl);

        setTimeout(() => {
            floatEl.remove();
        }, 900);
    }

    // 5. Konami Code Easter Egg (↑ ↑ ↓ ↓ ← → ← → B A)
    function setupKonamiCode() {
        const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        let idx = 0;

        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            const expected = code[idx].toLowerCase();

            if (key === expected) {
                idx++;
                if (idx === code.length) {
                    idx = 0;
                    triggerKonamiUnlock();
                }
            } else {
                idx = 0;
            }
        });
    }

    function triggerKonamiUnlock() {
        if (window.ArcadeAudio) {
            window.ArcadeAudio.playStageClearFanfare();
            setTimeout(() => {
                if (window.ArcadeAudio) window.ArcadeAudio.playCoinSound();
            }, 600);
        }

        const banner = document.createElement('div');
        banner.className = 'konami-banner';
        banner.innerHTML = '★ 99 CREDITS UNLOCKED! ★<br><span style="font-size: 0.65rem; color: #ffbe00;">GOD-TIER PROCRASTINATOR STATUS ACHIEVED</span>';
        document.body.appendChild(banner);

        setTimeout(() => {
            banner.remove();
        }, 4000);
    }

    // 6. Dynamic Arcade Labels & Atmosphere
    function applyArcadeLabels() {
        // Masthead Sub
        const sub = document.getElementById('masthead-sub');
        if (sub) sub.textContent = 'THE POSTPONEMENT PARLOR // 1989 COIN-OP PORTAL';

        // Tagline
        const tagline = document.getElementById('masthead-tagline');
        if (tagline) {
            const tFull = tagline.querySelector('.tagline-full');
            const tShort = tagline.querySelector('.tagline-short');
            if (tFull) tFull.textContent = 'THE GLOBAL ARCADE OF CHRONIC POSTPONEMENT • INSERT COIN TO DODGE YOUR BOSS';
            if (tShort) tShort.textContent = 'THE POSTPONEMENT PARLOR // INSERT COIN';
        }

        // Ticker Badge
        const tBadgeFull = document.querySelector('.ticker-badge-full');
        if (tBadgeFull) tBadgeFull.textContent = 'RADAR TELEMETRY';
        const tBadgeShort = document.querySelector('.ticker-badge-short');
        if (tBadgeShort) tBadgeShort.textContent = 'RADAR';

        // Section Title: Input Box
        const inputTitle = document.querySelector('#box-input .section-title');
        if (inputTitle) inputTitle.textContent = 'INSERT TOKEN // SELECT YOUR BOSS';

        // Placeholder in task textarea
        const taskInput = document.getElementById('task-input');
        if (taskInput) {
            taskInput.placeholder = '> WHAT IMPENDING BOSS ARE YOU DODGING?';
        }

        // Quick Chips Label
        const chipsLabel = document.querySelector('.chips-label');
        if (chipsLabel) chipsLabel.textContent = 'CHOOSE YOUR BOSS ENCOUNTER:';

        // Quick Chips
        const chips = document.querySelectorAll('.chip-btn');
        const bossNames = {
            'Sleep': '⚔️ SLEEP GOBLIN',
            'Study': '📜 STUDY BEHOLDER',
            'Replying to emails': '✉️ EMAIL SLIME',
            'Doing laundry': '🧺 LAUNDRY HYDRA',
            'Exercise': '🏋️ GYM TROLL',
            'Writing': '📝 ESSAY GOLEM'
        };
        chips.forEach(chip => {
            const dt = chip.getAttribute('data-task');
            if (bossNames[dt]) {
                chip.textContent = bossNames[dt];
            }
        });

        // Submit Button & Panic Button Label Enforcers
        const laterBtnText = document.getElementById('later-btn-text');
        const panicBtnText = document.getElementById('panic-btn-text');

        const updateArcadeActionButtons = () => {
            if (laterBtnText && (laterBtnText.textContent.includes('POST TO THE WIRE') || laterBtnText.textContent.includes('POST TO WIRE'))) {
                laterBtnText.textContent = 'DODGE ATTACK ↵ (CAST DELAY SPELL)';
            }
            if (panicBtnText && (panicBtnText.textContent.includes('DO IT NOW') || panicBtnText.textContent.includes('PANIC MODE'))) {
                panicBtnText.textContent = 'RAGE QUIT // PANIC FINISHER';
            }
        };

        updateArcadeActionButtons();

        if (laterBtnText) {
            const btnObs = new MutationObserver(updateArcadeActionButtons);
            btnObs.observe(laterBtnText, { childList: true, characterData: true, subtree: true });
            if (panicBtnText) {
                btnObs.observe(panicBtnText, { childList: true, characterData: true, subtree: true });
            }
        }

        // Mobile FAB Button
        const fab = document.querySelector('.mobile-fab-post');
        if (fab) {
            fab.textContent = '+ INSERT COIN';
        }

        // Lead Story Eyebrow
        const leadEyebrow = document.querySelector('.eyebrow-full');
        if (leadEyebrow) leadEyebrow.textContent = '★ CHALLENGER APPROACHING: WORLD BOSS OF THE DAY ★';
        const leadEyebrowShort = document.querySelector('.eyebrow-short');
        if (leadEyebrowShort) leadEyebrowShort.textContent = '★ WORLD BOSS ★';

        const leadPrompt = document.querySelector('.lead-stamp-prompt');
        if (leadPrompt) leadPrompt.textContent = 'SUPPORT COMBATANT:';

        // Wire Section Title
        const wireTitleFull = document.querySelector('.wire-title-full');
        if (wireTitleFull) wireTitleFull.textContent = 'THE SPECTATOR ARENA';
        const wireTitleShort = document.querySelector('.wire-title-short');
        if (wireTitleShort) wireTitleShort.textContent = 'ARENA';

        // Wire Nav Tabs
        const tabAvoidLabel = document.querySelector('#tab-wire-avoiding .tab-label-full');
        if (tabAvoidLabel) tabAvoidLabel.textContent = 'ACTIVE COMBATS';
        const tabAvoidShort = document.querySelector('#tab-wire-avoiding .tab-label-short');
        if (tabAvoidShort) tabAvoidShort.textContent = 'ACTIVE';

        const tabDoneLabel = document.querySelector('#tab-wire-accomplished .tab-label-full');
        if (tabDoneLabel) {
            const countBadge = document.getElementById('triumphs-count-badge');
            const cnt = countBadge ? countBadge.textContent : '0';
            tabDoneLabel.innerHTML = `STAGE CLEARS (<span class="tab-badge" id="triumphs-count-badge">${cnt}</span>)`;
        }
        const tabDoneShort = document.querySelector('#tab-wire-accomplished .tab-label-short');
        if (tabDoneShort) {
            const countBadgeShort = document.getElementById('triumphs-count-badge-short');
            const cnt = countBadgeShort ? countBadgeShort.textContent : '0';
            tabDoneShort.innerHTML = `CLEARS (<span class="tab-badge-short" id="triumphs-count-badge-short">${cnt}</span>)`;
        }

        // Leaderboard Meta
        const leadMeta = document.querySelector('.leaderboard-meta');
        if (leadMeta) leadMeta.textContent = 'ALL-TIME HIGH SCORE TABLE (LEADING SLOTH ARCADES)';

        // Total Procrastinators Label
        const counterLabel = document.querySelector('.counter-label');
        if (counterLabel) counterLabel.textContent = 'TOTAL TOKENS INSERTED:';
    }

    // Enhance dynamically rendered feed cards
    function enhanceDynamicFeedCards() {
        document.querySelectorAll('.reaction-stamp-btn:not(.arcade-enhanced)').forEach(btn => {
            btn.classList.add('arcade-enhanced');
            const type = btn.getAttribute('data-type');
            const countSpan = btn.querySelector('.reaction-count');
            const cnt = countSpan ? countSpan.textContent : '0';

            if (type === 'same') {
                btn.innerHTML = `2P CO-OP <span class="reaction-count">${cnt}</span>`;
            } else if (type === 'valid') {
                btn.innerHTML = `1-UP <span class="reaction-count">${cnt}</span>`;
            } else if (type === 'rip') {
                btn.innerHTML = `FATALITY <span class="reaction-count">${cnt}</span>`;
            }
        });

        document.querySelectorAll('.feed-clip-btn:not(.arcade-enhanced)').forEach(btn => {
            btn.classList.add('arcade-enhanced');
            btn.textContent = 'TICKET';
        });

        document.querySelectorAll('.feed-ididit-btn:not(.arcade-enhanced)').forEach(btn => {
            btn.classList.add('arcade-enhanced');
            btn.textContent = 'STAGE CLEAR! 🏆';
        });
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initArcade);
    } else {
        initArcade();
    }
})();
