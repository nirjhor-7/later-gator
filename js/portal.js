/**
 * LATER, GATORS // THE COSMIC PORTAL
 * Humane Audio Engine & Portal Atmosphere Controller
 */

(function () {
    'use strict';
    console.log("PORTAL_JS_TOP_LOADED");

    // 1. Procedural Soft Celestial Audio Engine
    let audioCtx = null;
    let soundEnabled = true;
    let lastSendSoundTime = 0;

    try {
        const saved = localStorage.getItem('lg_portal_sound');
        if (saved !== null) {
            soundEnabled = saved === 'true';
        }
    } catch (e) {}

    const getAudioContext = () => {
        if (!audioCtx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) audioCtx = new AudioCtx();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
        return audioCtx;
    };

    /**
     * Soft celestial chime for sending an avoided task into the void
     * Gentle dual-sine chime (E5: 659Hz -> A5: 880Hz) with smooth reverb decay
     */
    const playPortalSendSound = () => {
        if (!soundEnabled) return;
        const nowMs = Date.now();
        if (nowMs - lastSendSoundTime < 250) return;
        lastSendSoundTime = nowMs;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Tone 1: E5
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(659.25, now);
            gain1.gain.setValueAtTime(0.12, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.85);

            // Tone 2: A5 harmonic
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(880.00, now + 0.08);
            gain2.gain.setValueAtTime(0.0001, now);
            gain2.gain.setValueAtTime(0.14, now + 0.08);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.08);
            osc2.stop(now + 1.25);
        } catch (e) {}
    };

    /**
     * Soft droplet ping for reactions (SAME, VALID, RIP)
     */
    const playStarlightDroplet = () => {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now); // D5
            osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12); // D6

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.24);
        } catch (e) {}
    };

    /**
     * Gentle chord for Stage Clear / Conquered At Last
     */
    const playReliefChime = () => {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            const chord = [523.25, 659.25, 783.99, 1046.50]; // C Major
            chord.forEach((freq, idx) => {
                const noteTime = now + (idx * 0.06);
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, noteTime);

                gain.gain.setValueAtTime(0.07, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.9);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(noteTime);
                osc.stop(noteTime + 0.95);
            });
        } catch (e) {}
    };

    // Intercept and replace legacy mechanical thud with celestial procedural sound
    const harmonizeLegacyAudio = () => {
        if (typeof window !== 'undefined') {
            if (window.GatorAudio) {
                window.GatorAudio.playRubberStampSound = playPortalSendSound;
                window.GatorAudio.playStampSlamSound = playPortalSendSound;
            }
            window.playRubberStampSound = playPortalSendSound;
            window.playStampSlamSound = playPortalSendSound;
        }
    };
    harmonizeLegacyAudio();

    // Export PortalAudio interface
    if (typeof window !== 'undefined') {
        window.PortalAudio = {
            playPortalSendSound,
            playStarlightDroplet,
            playReliefChime,
            getAudioContext,
            isSoundEnabled: () => soundEnabled,
            setSoundEnabled: (val) => {
                soundEnabled = !!val;
                try {
                    localStorage.setItem('lg_portal_sound', soundEnabled ? 'true' : 'false');
                } catch (e) {}
                const btn = document.getElementById('portal-audio-btn');
                if (btn) btn.textContent = soundEnabled ? 'SOUND: ON' : 'SOUND: OFF';
            }
        };
    }

    // 2. Setup Portal Ambience & Controls
    function initPortal() {
        harmonizeLegacyAudio();
        setupHeaderAudioControl();
        setupAudioEventListeners();
        applyHumaneLabels();

        // Enforce labels cleanly without infinite mutation loops
        let isEnforcing = false;
        const debouncedEnforce = () => {
            if (isEnforcing) return;
            isEnforcing = true;
            requestAnimationFrame(() => {
                enforceDynamicLabels();
                harmonizeLegacyAudio();
                isEnforcing = false;
            });
        };

        const feedEl = document.getElementById('feed-container');
        if (feedEl) {
            const observer = new MutationObserver(debouncedEnforce);
            observer.observe(feedEl, { childList: true });
        }
        enforceDynamicLabels();
    }

    // Header audio toggle pill
    function setupHeaderAudioControl() {
        const metaRight = document.querySelector('.meta-col-right') || document.querySelector('.meta-row-right');
        if (!metaRight) return;

        let soundBtn = document.getElementById('portal-audio-btn');
        if (!soundBtn) {
            soundBtn = document.createElement('button');
            soundBtn.type = 'button';
            soundBtn.id = 'portal-audio-btn';
            soundBtn.className = 'portal-control-btn';
            soundBtn.title = 'Toggle Ambient Portal Chimes';
            metaRight.insertBefore(soundBtn, metaRight.firstChild);
        }

        soundBtn.textContent = soundEnabled ? 'SOUND: ON' : 'SOUND: OFF';
    }

    // Document-level delegation for portal audio toggle
    document.addEventListener('click', (e) => {
        const btn = e.target && e.target.closest('#portal-audio-btn');
        if (btn) {
            soundEnabled = !soundEnabled;
            try {
                localStorage.setItem('lg_portal_sound', soundEnabled ? 'true' : 'false');
            } catch (err) {}
            btn.textContent = soundEnabled ? 'SOUND: ON' : 'SOUND: OFF';
            if (soundEnabled) playStarlightDroplet();
        }
    });

    // Audio Event Listeners
    function setupAudioEventListeners() {
        const postBtn = document.getElementById('later-btn') || document.getElementById('post-task-btn');
        if (postBtn) {
            postBtn.addEventListener('click', () => {
                const input = document.getElementById('task-input');
                if (input && input.value.trim().length > 0) {
                    playPortalSendSound();
                }
            });
        }

        document.addEventListener('click', (e) => {
            if (e.target.closest('.reaction-stamp-btn')) {
                playStarlightDroplet();
            } else if (e.target.closest('.feed-conquer-btn, .feed-resolve-btn, .feed-shred-btn')) {
                playReliefChime();
            } else if (e.target.closest('.chip-btn')) {
                playStarlightDroplet();
            } else if (e.target.closest('.mobile-fab-post')) {
                playPortalSendSound();
            }
        });

        const midnightBtn = document.getElementById('midnight-toggle-btn');
        if (midnightBtn) {
            midnightBtn.addEventListener('click', () => {
                setTimeout(() => {
                    applyHumaneLabels();
                    enforceDynamicLabels();
                }, 20);
            });
        }
    }

    // Apply Humane, Relatable Portal Copy
    function applyHumaneLabels() {
        // Masthead Sub & Tagline
        const sub = document.getElementById('masthead-sub');
        if (sub) sub.textContent = 'PUBLISHED DAILY (EVENTUALLY)';

        const tagline = document.getElementById('masthead-tagline');
        if (tagline) {
            const tFull = tagline.querySelector('.tagline-full');
            const tShort = tagline.querySelector('.tagline-short');
            if (tFull) tFull.textContent = 'THE OFFICIAL RECORD OF DELAYS';
            if (tShort) tShort.textContent = 'THE OFFICIAL RECORD OF DELAYS';
        }

        // Ticker Badge
        const tBadgeFull = document.querySelector('.ticker-badge-full');
        if (tBadgeFull) tBadgeFull.textContent = 'TELEGRAPH';
        const tBadgeShort = document.querySelector('.ticker-badge-short');
        if (tBadgeShort) tBadgeShort.textContent = 'TELEGRAPH';

        // Input Desk Title & Subtitle
        const inputTitle = document.querySelector('#box-input .section-title');
        if (inputTitle) inputTitle.textContent = 'CONFESS AN AVOIDED BURDEN';

        const taskInput = document.getElementById('task-input');
        if (taskInput) {
            taskInput.placeholder = "Type what you're supposed to be doing right now...";
        }

        // Quick Chips Label
        const chipsLabel = document.querySelector('.chips-label');
        if (chipsLabel) chipsLabel.textContent = 'TOO TIRED TO THINK? CHOOSE AN AVOIDED TASK:';

        // Lead Story Eyebrow
        const leadEyebrow = document.querySelector('.eyebrow-full');
        if (leadEyebrow) leadEyebrow.textContent = "✦ TODAY'S MOST SYMPATHIZED CONFESSION ✦";
        const leadEyebrowShort = document.querySelector('.eyebrow-short');
        if (leadEyebrowShort) leadEyebrowShort.textContent = '✦ CHIEF CONFESSION ✦';

        const leadPrompt = document.querySelector('.lead-stamp-prompt');
        if (leadPrompt) leadPrompt.textContent = 'CAST SOLIDARITY:';

        // Wire Title
        const wireTitleFull = document.querySelector('.wire-title-full');
        if (wireTitleFull) wireTitleFull.textContent = 'THE WIRE';
        const wireTitleShort = document.querySelector('.wire-title-short');
        if (wireTitleShort) wireTitleShort.textContent = 'THE WIRE';

        // Wire Tabs
        const tabAvoidLabel = document.querySelector('#tab-wire-avoiding .tab-label-full');
        if (tabAvoidLabel) tabAvoidLabel.textContent = 'CURRENTLY AVOIDING';
        const tabAvoidShort = document.querySelector('#tab-wire-avoiding .tab-label-short');
        if (tabAvoidShort) tabAvoidShort.textContent = 'AVOIDING';

        const tabDoneLabel = document.querySelector('#tab-wire-accomplished .tab-label-full');
        if (tabDoneLabel) {
            const countBadge = document.getElementById('triumphs-count-badge');
            const cnt = countBadge ? countBadge.textContent : '0';
            tabDoneLabel.innerHTML = `CONQUERED AT LAST (<span class="tab-badge" id="triumphs-count-badge">${cnt}</span>)`;
        }
        const tabDoneShort = document.querySelector('#tab-wire-accomplished .tab-label-short');
        if (tabDoneShort) {
            const countBadgeShort = document.getElementById('triumphs-count-badge-short');
            const cnt = countBadgeShort ? countBadgeShort.textContent : '0';
            tabDoneShort.innerHTML = `CONQUERED (<span class="tab-badge-short" id="triumphs-count-badge-short">${cnt}</span>)`;
        }

        // Leaderboard Meta
        const leadMeta = document.querySelector('.leaderboard-meta');
        if (leadMeta) leadMeta.textContent = 'GLOBAL PROCRASTINATION INDEX (WHERE EARTH DELAYS MOST)';

        // Total Visitors
        const counterLabel = document.querySelector('.counter-label');
        if (counterLabel) counterLabel.textContent = 'TOTAL UNIQUE PROCRASTINATORS VISITING:';

        // Telegraph Dispatch (Share box)
        const dispatchTitle = document.querySelector('#box-dispatch .section-title');
        if (dispatchTitle) dispatchTitle.textContent = 'INVITE TIRED FRIENDS TO THE WIRE';

        const dispatchBanner = document.querySelector('.dispatch-banner-text');
        if (dispatchBanner) dispatchBanner.textContent = 'MANDATE: SPREAD STRATEGIC RELIEF';

        const dispatchPitch = document.querySelector('.dispatch-desk-pitch');
        if (dispatchPitch) {
            dispatchPitch.innerHTML = 'Solitary procrastination is stressful. <strong>Collective procrastination is a sanctuary.</strong> Invite your colleagues before someone schedules another Monday morning sync.';
        }

        // Footer Quote & Credit
        const footerQuote = document.getElementById('footer-quote');
        if (footerQuote) footerQuote.textContent = '"The stars have existed for billions of years. Your deadline can wait twenty minutes."';

        const footerCredit = document.querySelector('.footer-credit');
        if (footerCredit) footerCredit.textContent = '// BUILT BY NIRJHOR INSTEAD OF SLEEPING • A TRANQUIL SANCTUARY FOR PROCRASTINATORS';

        // Share button
        const shareBtn = document.getElementById('footer-share-btn');
        if (shareBtn) {
            const fFull = shareBtn.querySelector('.footer-share-full');
            if (fFull) fFull.textContent = 'SHARE THE WIRE WITH PARTNERS IN CRIME';
        }
    }

    // Enforce dynamic button labels across re-renders
    function enforceDynamicLabels() {
        const sub = document.getElementById('masthead-sub');
        if (sub && (sub.textContent.includes('GASLIGHT') || sub.textContent.includes('ORBITAL') || sub.textContent.includes('ANONYMOUS WIRE'))) {
            sub.textContent = 'PUBLISHED DAILY (EVENTUALLY)';
        }

        const laterBtnText = document.getElementById('later-btn-text');
        if (laterBtnText && (laterBtnText.textContent.includes('POST TO THE WIRE') || laterBtnText.textContent.includes('POST TO WIRE') || laterBtnText.textContent.includes('DODGE ATTACK') || laterBtnText.textContent.includes('SEND INTO THE VOID'))) {
            laterBtnText.textContent = 'POST TO THE FRONT PAGE ➔';
        }

        const panicBtnText = document.getElementById('panic-btn-text');
        if (panicBtnText && (panicBtnText.textContent.includes('DO IT NOW') || panicBtnText.textContent.includes('PANIC MODE') || panicBtnText.textContent.includes('RAGE QUIT') || panicBtnText.textContent.includes('RETURN TO EARTH'))) {
            panicBtnText.textContent = 'RETURN TO WORK (PANIC MODE)';
        }

        const fab = document.querySelector('.mobile-fab-post');
        if (fab && !fab.textContent.includes('CONFESS DELAY')) {
            fab.textContent = 'CONFESS DELAY';
        }

        // Active dispatch owner buttons
        document.querySelectorAll('.feed-conquer-btn').forEach(btn => {
            if (!btn.classList.contains('portal-styled')) {
                btn.classList.add('portal-styled');
                btn.textContent = '★ I CONQUERED IT!';
            }
        });
        document.querySelectorAll('.feed-shred-btn').forEach(btn => {
            if (!btn.classList.contains('portal-styled')) {
                btn.classList.add('portal-styled');
                btn.textContent = '✂ SHRED GUILT';
            }
        });
        document.querySelectorAll('.feed-resolve-btn:not(.feed-conquer-btn)').forEach(btn => {
            if (!btn.classList.contains('portal-styled')) {
                btn.classList.add('portal-styled');
                btn.textContent = '★ I CONQUERED IT!';
            }
        });
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPortal);
    } else {
        initPortal();
    }
})();
