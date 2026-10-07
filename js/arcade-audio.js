/**
 * LATER, GATORS // POSTPONEMENT PARLOR (1989 COIN-OP EDITION)
 * Procedural 8-Bit Chiptune Synthesizer Engine (Web Audio API)
 * Zero external audio assets; 100% procedural square/triangle/noise synthesis.
 */

(function () {
    'use strict';

    let audioCtx = null;
    let soundEnabled = true;

    // Load saved sound preference
    try {
        const saved = localStorage.getItem('lg_arcade_sound');
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
     * Play an authentic 2-tone arcade coin drop chime (e.g. Mario/Street Fighter coin insert)
     * High B5 (987 Hz) followed immediately by E6 (1318 Hz) with sweet square-wave decay
     */
    const playCoinSound = () => {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Tone 1: B5 (987.77 Hz)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'square';
            osc1.frequency.setValueAtTime(987.77, now);
            gain1.gain.setValueAtTime(0.18, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.12);

            // Tone 2: E6 (1318.51 Hz) - slightly delayed
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(1318.51, now + 0.08);
            gain2.gain.setValueAtTime(0.0001, now);
            gain2.gain.setValueAtTime(0.22, now + 0.08);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.08);
            osc2.stop(now + 0.45);
        } catch (e) {
            console.debug('Arcade audio error:', e);
        }
    };

    /**
     * 8-Bit Jump / Action Blip (for SAME / 2P CO-OP)
     */
    const playBlipSound = () => {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(650, now + 0.1);

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.13);
        } catch (e) {}
    };

    /**
     * 8-Bit 1-UP / Shield Jingle (for VALID)
     */
    const play1UpSound = () => {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            const notes = [330, 392, 659, 523, 587, 784];
            notes.forEach((freq, idx) => {
                const noteTime = now + (idx * 0.045);
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, noteTime);

                gain.gain.setValueAtTime(0.12, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.08);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(noteTime);
                osc.stop(noteTime + 0.09);
            });
        } catch (e) {}
    };

    /**
     * 8-Bit Fatality / Game Over Buzz (for RIP)
     */
    const playFatalitySound = () => {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(45, now + 0.28);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.32);
        } catch (e) {}
    };

    /**
     * 8-Bit Panic Siren / Klaxon (for Panic Mode)
     */
    const playPanicSiren = () => {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            for (let i = 0; i < 3; i++) {
                const startT = now + (i * 0.14);
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(550, startT);
                osc.frequency.linearRampToValueAtTime(880, startT + 0.07);
                osc.frequency.linearRampToValueAtTime(550, startT + 0.13);

                gain.gain.setValueAtTime(0.25, startT);
                gain.gain.exponentialRampToValueAtTime(0.01, startT + 0.13);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(startT);
                osc.stop(startT + 0.14);
            }
        } catch (e) {}
    };

    /**
     * 8-Bit Stage Clear Victory Fanfare (for Redemption Wire)
     */
    const playStageClearFanfare = () => {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Classic fanfare progression
            const melody = [
                { f: 523.25, d: 0.1 },  // C5
                { f: 523.25, d: 0.1 },  // C5
                { f: 523.25, d: 0.1 },  // C5
                { f: 659.25, d: 0.25 }, // E5
                { f: 783.99, d: 0.18 }, // G5
                { f: 1046.50, d: 0.45 } // C6
            ];

            let curr = now;
            melody.forEach(m => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(m.f, curr);

                gain.gain.setValueAtTime(0.18, curr);
                gain.gain.exponentialRampToValueAtTime(0.001, curr + m.d);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(curr);
                osc.stop(curr + m.d + 0.05);

                curr += m.d * 0.9;
            });
        } catch (e) {}
    };

    // Public API
    window.ArcadeAudio = {
        playCoinSound,
        playBlipSound,
        play1UpSound,
        playFatalitySound,
        playPanicSiren,
        playStageClearFanfare,
        isSoundEnabled: () => soundEnabled,
        setSoundEnabled: (val) => {
            soundEnabled = !!val;
            try {
                localStorage.setItem('lg_arcade_sound', soundEnabled ? 'true' : 'false');
            } catch (e) {}
        },
        toggleSound: () => {
            soundEnabled = !soundEnabled;
            try {
                localStorage.setItem('lg_arcade_sound', soundEnabled ? 'true' : 'false');
            } catch (e) {}
            if (soundEnabled) playCoinSound();
            return soundEnabled;
        }
    };
})();
