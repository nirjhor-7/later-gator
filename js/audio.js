/**
 * LATER, GATORS // THE GLOBAL PROCRASTINATION JOURNAL
 * Procedural Audio Synthesizer Engine (Web Audio API)
 * Zero external audio assets; 100% procedurally synthesized tactile sounds.
 */

(function () {
    'use strict';

    let sharedAudioCtx = null;
    let midnightNoiseBufferOn = null;
    let midnightNoiseBufferOff = null;
    let stampSlamBuffer = null;
    let rubberStampBuffer = null;

    const getSharedAudioContext = () => {
        if (!sharedAudioCtx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) sharedAudioCtx = new AudioCtx();
        }
        if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
            sharedAudioCtx.resume().catch(() => {});
        }
        return sharedAudioCtx;
    };
    const getCamoAudioContext = getSharedAudioContext;

    /**
     * Tactile Rubber Stamp Sound Generator
     * Low mechanical strike + paper slap impact noise burst.
     */
    const playRubberStampSound = () => {
        try {
            const ctx = getSharedAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;

            // Low thud / rubber stamp mechanical strike
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(28, now + 0.12);

            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);

            // Paper slap / impact noise burst (cached)
            if (!rubberStampBuffer) {
                const bufLen = Math.floor(ctx.sampleRate * 0.04);
                rubberStampBuffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
                const data = rubberStampBuffer.getChannelData(0);
                for (let i = 0; i < bufLen; i++) {
                    data[i] = (Math.random() * 2 - 1) * 0.15;
                }
            }
            const noise = ctx.createBufferSource();
            noise.buffer = rubberStampBuffer;
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.2, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            noise.connect(noiseGain);
            noiseGain.connect(ctx.destination);
            noise.start(now);
        } catch (e) {
            // Audio optional, fail gracefully
        }
    };

    /**
     * Heavy Physical Wooden Rubber Stamp Slam Sound
     * 150Hz -> 30Hz exponential pitch drop + bandpass filtered wood snap.
     */
    const playStampSlamSound = () => {
        try {
            const ctx = getSharedAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;

            // 1. Low thud impact
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

            gain.gain.setValueAtTime(0.45, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.085);

            // 2. High snap / slap burst for tactile wood-on-paper feeling (cached)
            if (!stampSlamBuffer) {
                const bufferSize = Math.floor(ctx.sampleRate * 0.025);
                stampSlamBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = stampSlamBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
                }
            }
            const noise = ctx.createBufferSource();
            noise.buffer = stampSlamBuffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 550;
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.3, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.025);

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(ctx.destination);
            noise.start(now);
        } catch (e) {}
    };

    /**
     * Mechanical Slacker Counter Click Sound
     * Frequency rises slightly with higher click counts.
     */
    const playClickerSound = (clickerCount = 0) => {
        try {
            const ctx = getSharedAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            const baseFreq = 160 + Math.min((clickerCount || 0) * 2, 400);
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.035);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.035);
        } catch (e) {}
    };

    /**
     * Warm 1890s Gaslight / Candle Ignition Sound
     * Soft hiss strike + nocturnal bell resonance.
     */
    const playMidnightGaslightSound = (isActivating = true) => {
        try {
            const ctx = getSharedAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const duration = isActivating ? 0.22 : 0.14;

            // 1. Cached soft breathy gaslight strike hiss
            let buffer = isActivating ? midnightNoiseBufferOn : midnightNoiseBufferOff;
            if (!buffer) {
                const bufferSize = Math.floor(ctx.sampleRate * duration);
                buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
                }
                if (isActivating) midnightNoiseBufferOn = buffer;
                else midnightNoiseBufferOff = buffer;
            }

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(isActivating ? 320 : 440, now);
            filter.frequency.exponentialRampToValueAtTime(isActivating ? 140 : 220, now + duration);

            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.2, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(ctx.destination);
            noise.start(now);

            // 2. Warm nocturnal resonance chime
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.type = 'sine';
            const freq = isActivating ? 523.25 : 392.0; // C5 or G4
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + duration);
            oscGain.gain.setValueAtTime(0.1, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc.connect(oscGain);
            oscGain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {}
    };

    /**
     * Mechanical Typewriter / Keyboard Click Sound (Office Camouflage)
     */
    const playKeyClick = (isReturnOrSpace = false) => {
        try {
            const ctx = getCamoAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            filter.type = 'bandpass';
            if (isReturnOrSpace) {
                filter.frequency.setValueAtTime(320, now);
                filter.Q.setValueAtTime(2.2, now);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(140, now);
                osc.frequency.exponentialRampToValueAtTime(45, now + 0.05);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.05);
            } else {
                const baseFreq = 750 + Math.random() * 850;
                filter.frequency.setValueAtTime(baseFreq, now);
                filter.Q.setValueAtTime(3.0, now);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(baseFreq, now);
                osc.frequency.exponentialRampToValueAtTime(180, now + 0.024);
                const volume = 0.04 + Math.random() * 0.04;
                gain.gain.setValueAtTime(volume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.024);
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.024);
            }
        } catch (e) {}
    };

    /**
     * Deep Exhausted Sigh Sound Effect (Office Camouflage)
     */
    const playExhaustedSigh = (buttonEl) => {
        try {
            const ctx = getCamoAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            const duration = 1.9;

            const bufferSize = Math.floor(ctx.sampleRate * duration);
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noiseSource = ctx.createBufferSource();
            noiseSource.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(850, now);
            filter.frequency.exponentialRampToValueAtTime(170, now + duration);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.09, now + 0.35);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            noiseSource.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            noiseSource.start(now);
            noiseSource.stop(now + duration);

            if (buttonEl) {
                const orig = buttonEl.textContent;
                buttonEl.textContent = '☕ *SIGH*';
                buttonEl.classList.add('playing');
                setTimeout(() => {
                    buttonEl.textContent = orig;
                    buttonEl.classList.remove('playing');
                }, duration * 1000);
            }
        } catch (e) {}
    };

    /**
     * Bureaucratic Paper Shuffle Sound Effect (Office Camouflage)
     */
    const playPaperShuffle = () => {
        try {
            const ctx = getCamoAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            const duration = 0.65;

            const bufferSize = Math.floor(ctx.sampleRate * duration);
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                const env = Math.sin((i / bufferSize) * Math.PI);
                const jitter = Math.sin(i * 0.05) * 0.5 + 0.5;
                data[i] = (Math.random() * 2 - 1) * env * jitter;
            }

            const noiseSource = ctx.createBufferSource();
            noiseSource.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1400, now);
            filter.Q.setValueAtTime(1.8, now);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.12, now + 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            noiseSource.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            noiseSource.start(now);
            noiseSource.stop(now + duration);
        } catch (e) {}
    };

    // Public Interface
    const GatorAudio = {
        getCamoAudioContext,
        playRubberStampSound,
        playStampSlamSound,
        playClickerSound,
        playMidnightGaslightSound,
        playKeyClick,
        playExhaustedSigh,
        playPaperShuffle
    };

    window.GatorAudio = GatorAudio;
    window.playRubberStampSound = playRubberStampSound;
    window.playStampSlamSound = playStampSlamSound;
    window.playClickerSound = playClickerSound;
    window.playMidnightGaslightSound = playMidnightGaslightSound;
    window.playKeyClick = playKeyClick;
    window.playExhaustedSigh = playExhaustedSigh;
    window.playPaperShuffle = playPaperShuffle;
})();
