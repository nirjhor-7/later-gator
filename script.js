document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('task-input');
    const userNameInput = document.getElementById('user-name');
    const taskCharCount = document.getElementById('task-char-count');
    const laterBtn = document.getElementById('later-btn');
    const panicBtn = document.getElementById('panic-btn');
    const statusMessage = document.getElementById('status-message');
    const feedContainer = document.getElementById('feed-container');
    const statCurrent = document.getElementById('stat-current');
    const statTotal = document.getElementById('stat-total');
    const statVisitors = document.getElementById('stat-visitors');

    // Local Alias Auto-Retention (Permanent local identity)
    if (userNameInput) {
        try {
            const savedName = localStorage.getItem('lg_user_name');
            if (savedName) userNameInput.value = savedName;
        } catch (e) {}

        userNameInput.addEventListener('input', () => {
            try {
                localStorage.setItem('lg_user_name', userNameInput.value.trim());
            } catch (e) {}
        });
    }

    // Broadsheet Character Counter
    const updateCharCount = () => {
        if (!taskCharCount || !taskInput) return;
        const len = taskInput.value.length;
        taskCharCount.textContent = `[ ${len} / 150 LETTERS ]`;
        taskCharCount.classList.toggle('near-limit', len >= 130);
    };

    if (taskInput) {
        taskInput.addEventListener('input', updateCharCount);
        updateCharCount();
    }

    // Rubber Stamp Elements
    const stampOverlay = document.getElementById('stamp-overlay');
    const rubberStamp = document.getElementById('rubber-stamp');
    const stampHeader = document.getElementById('stamp-header');
    const stampTitle = document.getElementById('stamp-title');
    const stampSub = document.getElementById('stamp-sub');
    const stampMeta = document.getElementById('stamp-meta');
    const shareStampBadge = document.getElementById('share-stamp-badge');

    // Tactile Rubber Stamp Sound Generator (Synthesized Web Audio API)
    function playRubberStampSound() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            if (ctx.state === 'suspended') ctx.resume();

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

            // Paper slap / impact noise burst
            const bufLen = Math.floor(ctx.sampleRate * 0.04);
            const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < bufLen; i++) {
                data[i] = (Math.random() * 2 - 1) * 0.15;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buf;
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.2, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            noise.connect(noiseGain);
            noiseGain.connect(ctx.destination);
            noise.start(now);
        } catch (e) {
            // Audio optional, fail silently
        }
    }

    const updateStat = (id, newValue) => {
        const el = document.getElementById(id);
        if (el && el.textContent !== String(newValue)) {
            el.textContent = newValue;
            el.classList.remove('stat-pop');
            void el.offsetWidth; // Trigger reflow
            el.classList.add('stat-pop');
        }
    };
    
    // Hall of shame elements
    const shameContainer = document.getElementById('hall-of-shame');
    const shameTask = document.getElementById('shame-task');
    const shameCount = document.getElementById('shame-count');



    // Random placeholders
    const placeholders = [
        "Declare your intent to procrastinate here...",
        "What are you actively avoiding right now?",
        "Type the thing you'll definitely do tomorrow...",
        "What responsibility are you running from?",
        "Confess your neglected task...",
        "What is giving you low-level anxiety right now?",
        "Enter the chore you are currently ignoring..."
    ];
    taskInput.placeholder = placeholders[Math.floor(Math.random() * placeholders.length)];

    const evasionVerbs = [
        "POSTPONED",
        "EVADED",
        "IGNORED",
        "DODGED",
        "NEGLECTED",
        "PUSHED TO TOMORROW",
        "SUCCESSFULLY AVOIDED",
        "SHELVED",
        "PROCRASTINATED ON",
        "IS ACTIVELY IGNORING",
        "GHOSTED",
        "IS PRETENDING NOT TO SEE",
        "DECIDED NOT TO CARE ABOUT",
        "KICKED THE CAN DOWN THE ROAD ON",
        "SWIPED LEFT ON",
        "SAID 'MAYBE LATER' TO",
        "IS IN DENIAL ABOUT",
        "NOPED OUT OF",
        "IS RUNNING AWAY FROM",
        "ABANDONED ALL HOPE FOR",
        "HIT SNOOZE ON",
        "IS STRATEGICALLY DELAYING",
        "REFUSED TO ACKNOWLEDGE"
    ];

    const panicVerbs = [
        "IS IN EMERGENCY MODE FOR",
        "IS SCREAMING WHILE DOING",
        "IS DESPERATELY ATTEMPTING",
        "HAS FINALLY BEGUN",
        "IS PANICKING OVER"
    ];

    let lastTopTaskId = null;
    let renderedTopId = null;
    let renderedCount = 0;

    const renderFeed = (tasks) => {
        if (!tasks || tasks.length === 0) {
            feedContainer.innerHTML = '<div class="feed-item">No transmissions received yet.</div>';
            return;
        }

        // Avoid re-rendering if data is identical (prevents scroll jumps while reading)
        if (renderedTopId === tasks[0].id && renderedCount === tasks.length) {
            return;
        }

        const prevScrollTop = feedContainer.scrollTop;
        const isScrolled = prevScrollTop > 20;

        const feedHtml = tasks.map(task => {
            const userName = task.city || 'Anonymous';
            const userCountry = task.country || 'Parts Unknown';
            
            let displayName = userName;
            let rankFlairHtml = '';
            const flairMatch = userName.match(/^\[(.*?)\]\s*(.*)$/);
            if (flairMatch) {
                rankFlairHtml = `<span class="feed-rank-flair">${escapeHtml(flairMatch[1])}</span> `;
                displayName = flairMatch[2] || 'Anonymous';
            }

            const locationString = `REPORT: ${rankFlairHtml}${escapeHtml(displayName).toUpperCase()} IN ${escapeHtml(userCountry).toUpperCase()}`;

            let isPanic = false;
            let rawText = task.text;

            if (rawText.startsWith('[PANIC] ')) {
                isPanic = true;
                rawText = rawText.replace('[PANIC] ', '');
            }

            // Pick a random verb based on the task ID
            let verb = "";
            if (isPanic) {
                const verbIndex = task.id % panicVerbs.length;
                verb = panicVerbs[verbIndex];
            } else {
                const verbIndex = task.id % evasionVerbs.length;
                verb = evasionVerbs[verbIndex];
            }

            // Check if this is a newly arrived task
            const isNew = (lastTopTaskId !== null && task.id > lastTopTaskId);
            const animationClass = isNew ? 'slide-in' : '';

            return `
            <div class="feed-item ${animationClass}">
                <div class="feed-item-meta">${censorNsfwHtml(locationString)} ${verb}:</div>
                <div class="feed-item-text">${censorNsfwHtml(escapeHtml(rawText))}</div>
                <span class="feed-item-time">${timeAgo(task.created_at)}</span>
            </div>
            `;
        }).join('') + `
            <div style="text-align: center; padding: 18px 0 8px 0; font-size: 0.7rem; color: var(--ink-light); letter-spacing: 1px; font-family: 'Space Mono', monospace;">
                // END OF WIRE ARCHIVES — YOU REACHED DISPATCH NO. 1 //
            </div>
        `;

        feedContainer.innerHTML = feedHtml;

        // Preserve user scroll position if they were browsing history
        if (isScrolled) {
            feedContainer.scrollTop = prevScrollTop;
        }

        renderedTopId = tasks[0].id;
        renderedCount = tasks.length;
        if (tasks.length > 0) {
            lastTopTaskId = Math.max(lastTopTaskId || 0, tasks[0].id);
        }
    };

    const fetchTasks = async () => {
        try {
            const response = await fetch('/api/tasks');
            if (response.ok) {
                const tasks = await response.json();
                renderFeed(tasks);
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
            feedContainer.innerHTML = '<div class="loading">Connection severed.</div>';
        }
    };

    // Check if the user has set the secret developer flag
    const isDeveloper = localStorage.getItem('is_nirjhor') === 'true';

    // Use localStorage so the visitor is tracked forever, not just for one tab session
    let sessionId = localStorage.getItem('later_gator_visitor');
    if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('later_gator_visitor', sessionId);
    }

    const fetchStats = async () => {
        try {
            const devQuery = isDeveloper ? '&dev=true' : '';
            const response = await fetch(`/api/stats?session=${sessionId}${devQuery}`);
            if (response.ok) {
                const stats = await response.json();
                if (statCurrent) updateStat('stat-current', stats.currentlyProcrastinating.toLocaleString());
                if (statTotal) updateStat('stat-total', stats.totalPostponed.toLocaleString());
                if (statVisitors && stats.totalVisitors) {
                    updateStat('stat-visitors', stats.totalVisitors.toString().padStart(4, '0'));
                }
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const fetchWeeklyStats = async () => {
        try {
            const response = await fetch('/api/weekly');
            if (response.ok) {
                const data = await response.json();
                if (data.count > 0) {
                    let taskName = data.text;
                    if (taskName.startsWith('[PANIC] ')) taskName = taskName.replace('[PANIC] ', '');
                    
                    shameContainer.style.display = 'block';
                    shameTask.innerHTML = `"${censorNsfwHtml(escapeHtml(taskName))}"`;
                    shameCount.textContent = data.count;
                } else {
                    shameContainer.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Failed to fetch weekly stats:', error);
        }
    };

    const countryLeaderboard = document.getElementById('country-leaderboard');

    const fetchCountries = async () => {
        try {
            const response = await fetch('/api/countries');
            if (response.ok) {
                const countries = await response.json();
                if (countryLeaderboard) {
                    if (!countries || countries.length === 0) {
                        countryLeaderboard.innerHTML = '<div class="leaderboard-empty">Global sloth compiling...</div>';
                        return;
                    }
                    countryLeaderboard.innerHTML = countries.map((c, index) => {
                        const rank = String(index + 1).padStart(2, '0');
                        return `
                        <div class="leaderboard-row">
                            <span class="leaderboard-rank">${rank}.</span>
                            <span class="leaderboard-country" title="${escapeHtml(c.country)}">${escapeHtml(c.country)}</span>
                            <span class="leaderboard-dots"></span>
                            <span class="leaderboard-count">${c.count}</span>
                        </div>
                        `;
                    }).join('');
                }
            }
        } catch (error) {
            console.error('Failed to fetch country leaderboard:', error);
        }
    };

    const fetchAll = () => {
        fetchTasks();
        fetchStats();
        fetchWeeklyStats();
        fetchCountries();
    };

    const FUNNY_CENSOR_MESSAGES = [
        "THE EDITOR-IN-CHIEF REFUSES TO PRINT SUCH SCANDALOUS LANGUAGE.",
        "REDACTED BY THE DEPARTMENT OF DECENCY: KEEP IT CIVIL, CITIZEN.",
        "OUR TYPESETTERS ARE BLUSHING. MIND YOUR MANNERS.",
        "TRANSMISSION REJECTED: THIS IS A RESPECTABLE PROCRASTINATION JOURNAL.",
        "CENSORSHIP NOTICE: WASH YOUR KEYBOARD OUT WITH SOAP."
    ];

    function containsInappropriate(str) {
        if (!str) return false;
        const lower = str.toLowerCase();
        const vulgarWords = [
            /\b(fuck|fucking|fucker|fck|fuk|f\*ck)\b/i,
            /\b(bitch|bitches|b!tch)\b/i,
            /\b(cunt|cunts)\b/i,
            /\b(pussy|pussies)\b/i,
            /\b(dick|dicks)\b/i,
            /\b(asshole|assholes)\b/i,
            /\b(whore|whores|slut|sluts)\b/i
        ];
        for (const rx of vulgarWords) {
            if (rx.test(lower)) return true;
        }
        const collapsed = lower.replace(/[^a-z0-9]/g, '');
        const normalized = collapsed
            .replace(/[1!|]/g, 'i')
            .replace(/0/g, 'o')
            .replace(/3/g, 'e')
            .replace(/[4@]/g, 'a')
            .replace(/[5$]/g, 's')
            .replace(/7/g, 't')
            .replace(/8/g, 'b');
        const deDuplicated = normalized.replace(/(.)\1+/g, '$1');
        const severePatterns = [
            /n+[i1l]+[g9]+[e3a4r]+/i,
            /n+i+g+[ae]+/i,
            /f+a+g+[o0e3]*t?/i,
            /k+i+k+e/i,
            /c+h+i+n+k/i,
            /s+p+i+c/i,
            /r+e+t+a+r+d/i,
            /f+u+c+k/i,
            /b+i+t+c+h/i,
            /c+u+n+t/i
        ];
        for (const rx of severePatterns) {
            if (rx.test(lower) || rx.test(normalized) || rx.test(deDuplicated)) {
                return true;
            }
        }
        return false;
    }

    function isGibberish(text) {
        if (!text) return true;
        const clean = text.trim();
        if (clean.length < 3) return true;

        // Normalizing expressive elongation:
        // e.g. "studyiiiiiiing" -> "studying", "sleeeeeep" -> "sleep"
        const deElongated = clean.replace(/(.)\1{2,}/gi, "$1");

        // Common keyboard home-row / sequential key walks (pure smash)
        const mashes = [
            /asdf/i, /sdfg/i, /dfgh/i, /ghjk/i, /hjkl/i,
            /qwerty/i, /werty/i, /ertyu/i, /rtyui/i,
            /zxcv/i, /xcvb/i, /cvbn/i,
            /asdw/i, /qweasd/i, /asdasd/i, /dsad/i, /fdsa/i,
            /lkjh/i, /poiu/i, /mnbv/i
        ];
        for (const m of mashes) {
            if (m.test(clean) || m.test(deElongated)) return true;
        }

        // Only flag repeated characters if there is NO other substantial word (e.g. "aaaaa", "zzzzzz")
        if (/^(.)\1+$/i.test(clean.replace(/\s+/g, ""))) return true;

        // Check individual words
        const words = deElongated.split(/\s+/);
        let validWords = 0;

        for (const w of words) {
            const lettersOnly = w.replace(/[^a-z]/gi, "");
            if (!lettersOnly) continue;

            // Expressive conversational procrastination words
            if (["no", "so", "ugh", "ah", "ha", "eh"].includes(lettersOnly.toLowerCase())) {
                validWords++;
                continue;
            }

            // Must have vowels if length >= 4
            if (lettersOnly.length >= 4 && !/[aeiouy]/i.test(lettersOnly)) {
                return true;
            }

            if (lettersOnly.length >= 7) {
                const vowels = (lettersOnly.match(/[aeiouy]/gi) || []).length;
                if (vowels / lettersOnly.length < 0.15) return true;
            }

            validWords++;
        }

        return validWords === 0;
    }

    function triggerRubberStamp(isPanicMode = false) {
        if (!stampOverlay || !rubberStamp) return;

        playRubberStampSound();

        // Physical Haptic Feedback on Mobile
        if (navigator.vibrate) {
            try {
                navigator.vibrate(isPanicMode ? [40, 60, 80] : [30, 40, 50]);
            } catch (e) {}
        }

        const permitNum = Math.floor(1000 + Math.random() * 9000);
        if (isPanicMode) {
            if (stampHeader) stampHeader.textContent = "⚠ EMERGENCY DIRECTIVE ⚠";
            if (stampTitle) stampTitle.textContent = "PANIC MANDATE";
            if (stampSub) stampSub.textContent = "ACTION COMMENCING IMMEDIATELY";
            if (stampMeta) stampMeta.textContent = `CRISIS DIRECTIVE #${permitNum} • GODSPEED`;
            rubberStamp.className = "rubber-stamp stamped-panic";
        } else if (clickerCount >= 100) {
            if (stampHeader) stampHeader.textContent = "★ SUPREME DIPLOMATIC IMMUNITY ★";
            if (stampTitle) stampTitle.textContent = "LABOR EXEMPTION GRANTED";
            if (stampSub) stampSub.textContent = "BUREAU OF IDLENESS • GRAND MASTER";
            if (stampMeta) stampMeta.textContent = `PERMIT #${permitNum} • EXEMPT FROM ALL WORK`;
            rubberStamp.className = "rubber-stamp stamped-delay";
        } else {
            if (stampHeader) stampHeader.textContent = "★ OFFICIAL DISPATCH ★";
            if (stampTitle) stampTitle.textContent = "APPROVED FOR DELAY";
            if (stampSub) stampSub.textContent = "BUREAU OF PROCRASTINATION";
            if (stampMeta) stampMeta.textContent = `PERMIT #${permitNum} • VALID TODAY ONLY`;
            rubberStamp.className = "rubber-stamp stamped-delay";
        }

        // Show overlay first
        stampOverlay.style.display = "flex";

        // Trigger reflow to restart CSS animation cleanly
        void rubberStamp.offsetWidth;
        rubberStamp.classList.add('stamp-anim-slam');

        // Trigger physical desk shockwave
        const inputSection = document.querySelector('.input-section');
        if (inputSection) {
            inputSection.classList.remove('desk-impact');
            void inputSection.offsetWidth;
            inputSection.classList.add('desk-impact');
        }
    }

    function dismissRubberStamp(callback) {
        if (!rubberStamp || !stampOverlay) {
            if (callback) callback();
            return;
        }

        rubberStamp.classList.remove('stamp-anim-slam');
        void rubberStamp.offsetWidth;
        rubberStamp.classList.add('stamp-anim-fade');

        setTimeout(() => {
            stampOverlay.style.display = "none";
            rubberStamp.className = "rubber-stamp";
            if (callback) callback();
        }, 320);
    }

    const submitTask = async (isPanic = false) => {
        let text = taskInput.value.trim();
        const name = document.getElementById('user-name').value.trim();
        if (name) {
            try { localStorage.setItem('lg_user_name', name); } catch(e) {}
        }
        
        if (!text) {
            statusMessage.textContent = "PLEASE SPECIFY A TASK.";
            return;
        }

        // Friendly Inappropriate Language / Profanity Check
        if (containsInappropriate(text) || containsInappropriate(name)) {
            const funny = FUNNY_CENSOR_MESSAGES[Math.floor(Math.random() * FUNNY_CENSOR_MESSAGES.length)];
            statusMessage.textContent = funny;
            setTimeout(() => { statusMessage.textContent = ""; }, 4000);
            return;
        }

        // Gibberish & Keyboard Smash Detection with Interactive Suggestion
        const TASK_SUGGESTIONS = [
            "Sleep",
            "Study",
            "Replying to emails",
            "Doing laundry",
            "Going to gym",
            "My life choices",
            "Too tired to type"
        ];

        if (isGibberish(text)) {
            const suggestion = TASK_SUGGESTIONS[Math.floor(Math.random() * TASK_SUGGESTIONS.length)];
            statusMessage.innerHTML = `KEYBOARD SMASH DETECTED. DID YOU MEAN: <span class="suggestion-link" style="text-decoration: underline; cursor: pointer; font-weight: bold;">"${suggestion.toUpperCase()}"</span>?`;
            
            const link = statusMessage.querySelector('.suggestion-link');
            if (link) {
                link.addEventListener('click', () => {
                    taskInput.value = suggestion;
                    taskInput.focus();
                    statusMessage.textContent = "SUGGESTION APPLIED. HIT POSTPONE!";
                    setTimeout(() => { statusMessage.textContent = ""; }, 3000);
                });
            }
            return;
        }

        const submittedText = text;
        const activeBtn = isPanic ? panicBtn : laterBtn;
        const origBtnText = isPanic ? "DO IT NOW (PANIC)" : "NOT MY PROBLEM TODAY";
        activeBtn.disabled = true;

        if (isPanic) {
            text = `[PANIC] ${text}`;
        }

        // Automatically attach rank flair to author name if unlocked (Rank 10+)
        let submittedAuthorName = name;
        if (clickerCount >= 10) {
            const rawRank = getClickerRank(clickerCount).replace('RANK: ', '').trim();
            const cleanAuthor = name ? name : 'Anonymous';
            submittedAuthorName = `[${rawRank}] ${cleanAuthor}`;
        }

        currentRawTask = submittedText;
        currentIsPanic = isPanic;
        currentSubmittedName = name; // Certificate keeps original base name

        // 1. INSTANT STAMP SLAM & DESK SHOCKWAVE (Zero latency!)
        triggerRubberStamp(isPanic);

        if (isPanic) {
            activeBtn.textContent = "FINE. DOING IT.";
            statusMessage.textContent = "FINE. WE BELIEVE IN YOU. PROBABLY.";
        } else {
            activeBtn.textContent = "POSTPONED ✓";
            statusMessage.textContent = "SUCCESSFULLY EVADED.";
        }

        // 2. Dispatch network request in parallel
        const postPromise = fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Gator-Token': 'chomp-chomp'
            },
            body: JSON.stringify({ text, name: submittedAuthorName })
        }).catch(err => ({ ok: false, error: err }));

        // 3. Hold stamp proudly on screen for ~1100ms, then smoothly dissolve
        setTimeout(async () => {
            dismissRubberStamp(() => {
                taskInput.value = '';
                updateCharCount();
                activeBtn.textContent = origBtnText;
                activeBtn.disabled = false;
                statusMessage.textContent = "";

                // Reveal official share slip & certificate
                showShareSlip(submittedText, isPanic);
            });

            try {
                const response = await postPromise;
                if (response && response.ok) {
                    fetchAll();
                } else if (response && response.json) {
                    const errData = await response.json().catch(() => ({}));
                    if (errData.error) {
                        statusMessage.textContent = errData.error.toUpperCase();
                        setTimeout(() => { statusMessage.textContent = ""; }, 4000);
                    }
                }
            } catch (e) {
                // Background refresh error handled
            }
        }, 1100);
    };

    // Share Card Slip & Certificate Logic
    const shareCard = document.getElementById('share-card');
    const shareCardTask = document.getElementById('share-card-task');
    const shareCloseBtn = document.getElementById('share-close-btn');
    const shareCertBtn = document.getElementById('share-cert-btn');
    const shareXBtn = document.getElementById('share-x-btn');
    const shareFbBtn = document.getElementById('share-fb-btn');
    const shareWaBtn = document.getElementById('share-wa-btn');
    const shareCopyBtn = document.getElementById('share-copy-btn');

    let currentShareText = "";
    let currentRawTask = "";
    let currentIsPanic = false;
    let currentSubmittedName = "";
    const getShareUrl = () => window.location.origin && window.location.origin !== 'null' ? window.location.origin : 'https://later-gator.vercel.app';

    const generateCertificateImage = (taskText, isPanicMode, holderName) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');

        // Background: Crisp newsprint paper
        ctx.fillStyle = '#FAF9F6';
        ctx.fillRect(0, 0, 1200, 800);

        // Heavy Double Border
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 8;
        ctx.strokeRect(30, 30, 1140, 740);

        ctx.lineWidth = 2;
        ctx.strokeRect(44, 44, 1112, 712);

        // Corner squares
        ctx.lineWidth = 2;
        [[50, 50], [1130, 50], [50, 730], [1130, 730]].forEach(([x, y]) => {
            ctx.strokeRect(x, y, 20, 20);
        });

        // Header
        ctx.fillStyle = '#111111';
        ctx.textAlign = 'center';
        ctx.font = '700 20px "Space Mono", monospace';
        ctx.fillText('LATER, GATOR  //  GLOBAL PROCRASTINATION JOURNAL', 600, 105);

        ctx.font = '900 44px "Big Shoulders Display", sans-serif';
        const certTitle = isPanicMode ? 'EMERGENCY DISPATCH OF RELUCTANT ACTION' : 'OFFICIAL CERTIFICATE OF POSTPONEMENT';
        ctx.fillText(certTitle, 600, 160);

        // Lines
        ctx.beginPath();
        ctx.moveTo(100, 185);
        ctx.lineTo(1100, 185);
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(100, 191);
        ctx.lineTo(1100, 191);
        ctx.lineWidth = 1;
        ctx.stroke();

        // Metadata
        ctx.font = '700 15px "Space Mono", monospace';
        ctx.textAlign = 'left';
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();
        ctx.fillText(`DATE: ${dateStr}`, 100, 225);
        ctx.textAlign = 'right';
        const refId = 'REF: LG-' + Math.floor(100000 + Math.random() * 900000);
        ctx.fillText(refId, 1100, 225);

        // Declaration
        ctx.textAlign = 'center';
        ctx.font = '400 17px "Space Mono", monospace';
        const holder = (holderName && holderName.trim() !== '') ? holderName.trim().toUpperCase() : 'ANONYMOUS PROCRASTINATOR';
        ctx.fillText('THIS INSTRUMENT CONFIRMS THAT THE BEARER:', 600, 280);

        ctx.font = '900 24px "Space Mono", monospace';
        ctx.fillText(`[ ${holder} ]`, 600, 320);

        ctx.font = '400 17px "Space Mono", monospace';
        const verbDeclaration = isPanicMode ? 'HAS BROKEN DOWN AND UNDERTAKEN EMERGENCY EFFORTS ON:' : 'HAS OFFICIALLY AND LAWFULLY DODGED THE OBLIGATION DECLARED BELOW:';
        ctx.fillText(verbDeclaration, 600, 365);

        // Task Box
        ctx.fillStyle = '#EBEBEB';
        ctx.fillRect(140, 400, 920, 100);
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 3;
        ctx.strokeRect(140, 400, 920, 100);

        ctx.fillStyle = '#111111';
        ctx.font = '900 28px "Space Mono", monospace';
        let safeTask = `"${censorNsfwText(taskText.trim())}"`;
        if (safeTask.length > 50) safeTask = safeTask.substring(0, 47) + '..."';
        ctx.fillText(safeTask, 600, 460);

        // Legal Clause
        ctx.font = '400 14px "Space Mono", monospace';
        const statuteText = isPanicMode ? 'STATUTE 911: IMMEDIATE CRISIS MODE IN EFFECT.' : 'STATUTE 404: "NOT MY PROBLEM TODAY".';
        ctx.fillText(statuteText, 600, 545);
        ctx.fillText('ALL RESPONSIBILITY AND GUILT ARE TRANSFERRED TO TOMORROW.', 600, 570);
        ctx.fillText('ANY ATTEMPTS TO ENFORCE ACTION SHALL BE MET WITH DELAY TACTICS.', 600, 592);

        // Bottom Seals
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 2;
        ctx.strokeRect(140, 640, 220, 60);
        ctx.font = '700 13px "Space Mono", monospace';
        ctx.fillText('OFFICIAL BUREAU SEAL', 250, 665);
        ctx.font = '400 11px "Space Mono", monospace';
        ctx.fillText('VERIFIED INACTION', 250, 685);

        ctx.textAlign = 'right';
        ctx.font = '700 15px "Space Mono", monospace';
        ctx.fillText('Dr. Gator, Chief Delayer', 1060, 665);
        ctx.beginPath();
        ctx.moveTo(820, 675);
        ctx.lineTo(1060, 675);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.font = '400 12px "Space Mono", monospace';
        // Distressed Red Rubber Stamp on Certificate
        ctx.save();
        ctx.translate(920, 520);
        ctx.rotate(-11 * Math.PI / 180);
        const stampColor = isPanicMode ? '#b43403' : '#b91c1c';

        // Outer heavy border
        ctx.strokeStyle = stampColor;
        ctx.lineWidth = 4;
        ctx.strokeRect(-160, -42, 320, 84);

        // Inner dashed border
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(-153, -35, 306, 70);
        ctx.setLineDash([]);

        // Stamp Text
        ctx.fillStyle = stampColor;
        ctx.textAlign = 'center';
        ctx.font = '700 11px "Space Mono", monospace';
        ctx.fillText(isPanicMode ? '⚠ EMERGENCY DIRECTIVE ⚠' : '★ OFFICIAL DISPATCH ★', 0, -15);
        ctx.font = '900 20px "Space Mono", monospace';
        ctx.fillText(isPanicMode ? 'PANIC MANDATE' : 'APPROVED FOR DELAY', 0, 7);
        ctx.font = '700 10px "Space Mono", monospace';
        ctx.fillText('BUREAU OF PROCRASTINATION // VALID', 0, 24);
        ctx.restore();

        return canvas;
    };

    const showShareSlip = (task, isPanicMode) => {
        if (!shareCard) return;
        const clean = task.trim();
        shareCardTask.innerHTML = `"${censorNsfwHtml(escapeHtml(clean))}"`;
        
        if (shareStampBadge) {
            if (isPanicMode) {
                shareStampBadge.textContent = "⚠ PANIC MANDATE ISSUED";
                shareStampBadge.style.color = "#b43403";
                shareStampBadge.style.borderColor = "#b43403";
                shareStampBadge.style.outlineColor = "#b43403";
            } else {
                shareStampBadge.textContent = "★ APPROVED FOR DELAY";
                shareStampBadge.style.color = "#b91c1c";
                shareStampBadge.style.borderColor = "#b91c1c";
                shareStampBadge.style.outlineColor = "#b91c1c";
            }
        }

        const plainCensored = censorNsfwText(clean);
        const actionVerb = isPanicMode ? "am officially panicking about" : "just postponed";
        const punchline = isPanicMode ? "Wish me luck." : "Not my problem today.";
        currentShareText = `I ${actionVerb} "${plainCensored}" on Later, Gator alongside the rest of the world. ${punchline}`;
        
        const shareNativeBtn = document.getElementById('share-native-btn');
        if (shareNativeBtn && navigator.share) {
            shareNativeBtn.style.display = 'inline-block';
        }

        shareCard.style.display = 'block';
    };

    const shareNativeBtn = document.getElementById('share-native-btn');
    if (shareNativeBtn) {
        shareNativeBtn.addEventListener('click', async () => {
            if (!navigator.share) return;
            try {
                await navigator.share({
                    title: 'LATER, GATOR — Official Postponement Notice',
                    text: currentShareText,
                    url: getShareUrl()
                });
            } catch (e) {}
        });
    }

    if (shareCertBtn) {
        shareCertBtn.addEventListener('click', () => {
            if (!currentRawTask) return;
            const canvas = generateCertificateImage(currentRawTask, currentIsPanic, currentSubmittedName);
            const link = document.createElement('a');
            link.download = `official-postponement-certificate-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            const orig = shareCertBtn.textContent;
            shareCertBtn.textContent = '[ CERTIFICATE DOWNLOADED ✓ ]';
            setTimeout(() => {
                shareCertBtn.textContent = orig;
            }, 2500);
        });
    }

    if (shareCloseBtn) {
        shareCloseBtn.addEventListener('click', () => {
            if (shareCard) shareCard.style.display = 'none';
        });
    }

    if (shareXBtn) {
        shareXBtn.addEventListener('click', () => {
            const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(currentShareText)}&url=${encodeURIComponent(getShareUrl())}`;
            window.open(url, '_blank', 'noopener,noreferrer');
        });
    }

    if (shareFbBtn) {
        shareFbBtn.addEventListener('click', () => {
            const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}&quote=${encodeURIComponent(currentShareText)}`;
            window.open(url, '_blank', 'noopener,noreferrer,width=600,height=450');
        });
    }

    if (shareWaBtn) {
        shareWaBtn.addEventListener('click', () => {
            const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(currentShareText + ' ' + getShareUrl())}`;
            window.open(url, '_blank', 'noopener,noreferrer');
        });
    }

    if (shareCopyBtn) {
        shareCopyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(`${currentShareText} ${getShareUrl()}`);
                shareCopyBtn.textContent = "COPIED! ✓";
                setTimeout(() => {
                    shareCopyBtn.textContent = "COPY";
                }, 2000);
            } catch (err) {
                shareCopyBtn.textContent = "COPIED";
            }
        });
    }

    laterBtn.addEventListener('click', () => submitTask(false));
    panicBtn.addEventListener('click', () => submitTask(true));
    
    taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                submitTask(true); // Panic Mode
            } else if (!e.shiftKey) {
                e.preventDefault();
                submitTask(false); // Delay Mode
            }
        }
    });

    // Global keyboard shortcuts (Esc to dismiss open dialogs)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const credModal = document.getElementById('credential-modal');
            if (credModal && credModal.style.display !== 'none') {
                credModal.style.display = 'none';
            }
            if (shareCard && shareCard.style.display !== 'none') {
                shareCard.style.display = 'none';
            }
        }
    });

    function escapeHtml(unsafe) {
        return (unsafe || '')
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    const NSFW_REGEX = /\b(sex|porn|porno|nude|nudes|boob|boobs|tit|tits|penis|dick|dicks|vagina|pussy|pussies|masturbat\w*|horny|orgasm|orgasms|ass|asshole|assholes|blowjob|blowjobs|handjob|handjobs|cum|cumming|onlyfans|fuck\w*|bitch\w*|cunt\w*|whore\w*|slut\w*|dildo\w*)\b/gi;

    function censorNsfwHtml(str) {
        if (!str) return str;
        return str.replace(NSFW_REGEX, (match) => {
            if (match.length <= 1) return match;
            const first = match[0];
            const rest = match.slice(1);
            return `${first}<span class="nsfw-censor" title="CENSORED BY EDITORIAL BOARD">${rest}</span>`;
        });
    }

    function censorNsfwText(str) {
        if (!str) return str;
        return str.replace(NSFW_REGEX, (match) => {
            if (match.length <= 1) return match;
            const first = match[0];
            return `${first}${"█".repeat(match.length - 1)}`;
        });
    }

    function timeAgo(dateString) {
        let date = new Date(dateString);
        
        // Safari fallback for timestamp without timezone
        if (isNaN(date.getTime()) && !dateString.includes('Z') && !dateString.includes('+')) {
            date = new Date(dateString.replace(' ', 'T') + 'Z');
        }

        const seconds = Math.floor((new Date() - date) / 1000);
        
        if (isNaN(seconds)) return 'some time ago';
        
        if (seconds < 60) return 'just now';
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        
        const days = Math.floor(hours / 24);
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    }

    const footerQuotes = [
        "Tomorrow is a mystical land where 99% of all human productivity is stored.",
        "I'll stop procrastinating... tomorrow.",
        "Procrastination is the art of keeping up with yesterday.",
        "Why do today what you can put off until tomorrow?",
        "I put the 'pro' in procrastination.",
        "Hard work pays off after time, but laziness pays off now.",
        "I'm not procrastinating. I'm actively delaying.",
        "My to-do list is actually just a 'to-ignore' list.",
        "I will rule the world! ...Right after this nap.",
        "Nothing is impossible, but I do nothing every day.",
        "I meant to behave, but there were too many other options.",
        "I'm on energy-saving mode.",
        "Procrastinator? No, I'm a deadline connoisseur.",
        "Due tomorrow? Do tomorrow.",
        "I can't adult today. Please don't make me.",
        "I love deadlines. I love the whooshing noise they make.",
        "If at first you don't succeed, wait until the last minute.",
        "I'm not lazy, I'm just highly motivated to do nothing.",
        "The early bird can have the worm. I want to sleep.",
        "I am a person who wants to do a lot of things trapped in a body that doesn't.",
        "Someday is not a day of the week.",
        "Procrastination: because doing it now is too mainstream.",
        "I'll do it later. (Narrator: He did not do it later.)",
        "Currently experiencing a severe lack of motivation.",
        "I need a 6 month holiday, twice a year.",
        "I'm not running away from my problems, I'm walking away very slowly.",
        "My brain has too many tabs open.",
        "I'm busy doing nothing.",
        "I plan to be spontaneous tomorrow.",
        "I'm not procrastinating, I'm doing side quests.",
        "Why rush? We're all headed to the same grave.",
        "I am in a committed relationship with my bed.",
        "My favorite childhood memory is not paying bills.",
        "I'll get around to it... eventually.",
        "Procrastination is like a credit card: it's fun until you get the bill.",
        "I am currently under construction. Thank you for your patience.",
        "I put the 'later' in 'later gator'.",
        "I'll think about that tomorrow. Tomorrow is another day.",
        "My level of procrastination is so high, I haven't even started procrastinating yet.",
        "I'm currently unsupervised. I know, it freaks me out too.",
        "I am not early, I am not late. I arrive precisely when I intend to.",
        "I’ll do it when the stars align.",
        "My spirit animal is a sloth on a Sunday.",
        "I'm waiting for the panic monster to show up.",
        "I'm taking a proactive approach to doing nothing.",
        "My motivation went out for milk and never came back.",
        "I'm not delaying, I'm marinating.",
        "I excel at finding completely unrelated tasks to do.",
        "I'm allergic to deadlines.",
        "I'll finish this quote lat"
    ];

    const quoteElement = document.getElementById('footer-quote');
    if (quoteElement) {
        const updateQuote = () => {
            quoteElement.textContent = '"' + footerQuotes[Math.floor(Math.random() * footerQuotes.length)] + '"';
        };
        updateQuote();
        setInterval(updateQuote, 5000);
    }

    // Footer "Partners in Crime" Share Button
    const footerShareBtn = document.getElementById('footer-share-btn');
    if (footerShareBtn) {
        footerShareBtn.addEventListener('click', async () => {
            const shareUrl = getShareUrl();
            const shareData = {
                title: 'LATER, GATOR — Global Procrastination Journal',
                text: 'What are you putting off today? Join the worldwide procrastination broadcast on Later, Gator.',
                url: shareUrl
            };

            if (navigator.share) {
                try {
                    await navigator.share(shareData);
                } catch (err) {
                    // User dismissed share
                }
            } else {
                try {
                    await navigator.clipboard.writeText(shareUrl);
                    const originalText = footerShareBtn.textContent;
                    footerShareBtn.textContent = '[ LINK COPIED — GO DISTRACT THEM! ]';
                    setTimeout(() => {
                        footerShareBtn.textContent = originalText;
                    }, 2500);
                } catch (err) {
                    prompt('Copy this link to distract your friends:', shareUrl);
                }
            }
        });
    }

    // Quick Chips (Preset Tasks & Random Excuse Generator)
    const RANDOM_EXCUSES = [
        "Reorganizing desktop icons by color",
        "Researching the history of the fork",
        "Waiting for planetary alignment to wash dishes",
        "Mentally preparing to open my inbox",
        "Contemplating the finite nature of time",
        "Watching paint dry on the wall",
        "Staring blankly at the ceiling fan",
        "Drafting a strongly worded unsent email",
        "Reflecting on poor life decisions",
        "Waiting until the clock hits an even hour",
        "Sharpening all pencils in the house",
        "Practicing elevator etiquette in an empty room",
        "Re-reading the terms and conditions",
        "Calculating how much sleep I get if I sleep now",
        "Wondering who invented homework",
        "Checking the fridge for the fifth time",
        "Looking up average salaries in Antarctica",
        "Deep-cleaning the keyboard with a toothpick",
        "Untangling headphone wires that were coiled on purpose",
        "Investigating who closed my 84 open browser tabs",
        "Checking if the fridge light stays on when closed",
        "Reading the Wikipedia plot summary of a movie I'll never watch",
        "Looking at mansions on Zillow with zero dollars in checking",
        "Trying to remember what I was doing before I opened Reddit",
        "Testing how long I can hold my breath instead of working",
        "Googling the net worth of random child actors",
        "Rehearsing an imaginary argument in the shower from 2017",
        "Deciding which Spotify playlist fits the vibe of inaction",
        "Tracking a package that shipped 14 minutes ago",
        "Arranging spices in strict alphabetical order",
        "Watching a 40-minute documentary on medieval cheese making",
        "Counting the acoustic dots on my ceiling tiles",
        "Waiting for my phone battery to hit 100% before starting",
        "Waiting for my phone battery to drop to 1% before panicking",
        "Reading 5-star reviews for a pen I will never purchase",
        "Practicing my 19th-century presidential signature",
        "Peeling the fruit sticker off an apple in one clean piece",
        "Deciphering song lyrics I have misheard for a decade",
        "Contemplating becoming an alpaca farmer in Peru",
        "Waiting for my brain to download today's motivation patch",
        "Adjusting my desk chair height by 2 millimeters",
        "Investigating whether my cat leads a secret double life",
        "Analyzing the nutritional breakdown of potato chips at 3 AM",
        "Drafting a 5-year life plan that starts strictly on Monday",
        "Watching street food vendors in another continent chop onions",
        "Browsing antique Persian rugs I have no space for",
        "Waiting for the emotional fortitude to fold a fitted sheet",
        "Calculating the minimum passing grade down to the decimal",
        "Rehearsing my Nobel Prize acceptance speech in the mirror",
        "Staring at the wall until it turns into a productive task",
        "Waiting for a cosmic sign from the universe (this wasn't it)",
        "Re-reading an email I sent 3 days ago to admire my tone",
        "Looking up symptoms of a rare 14th-century nautical disease",
        "Planning the perfect outfit for when I have my life together",
        "Debating whether to take an 18-minute power nap or sleep until Friday",
        "Taking an online quiz to find out which type of bread I am",
        "Wiping my glasses for the eighth time in twenty minutes",
        "Searching for the font that best captures my existential dread",
        "Waiting for the kettle to boil so I can make tea I will forget to drink",
        "Cleaning my entire room so I can avoid studying for 20 minutes",
        "Organizing my Spotify playlists by emotional damage",
        "Writing a to-do list consisting entirely of things I already did",
        "Staring into the void until the void asks me to get back to work",
        "Calculating how much money I would have if I never bought coffee",
        "Waiting for my future self to deal with this because he is smarter"
    ];

    document.querySelectorAll('.chip-btn[data-task]').forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-task');
            if (taskInput) {
                taskInput.value = val;
                taskInput.focus();
                updateCharCount();
                if (navigator.vibrate) {
                    try { navigator.vibrate(8); } catch (e) {}
                }
                taskInput.style.transition = 'background 0.2s';
                taskInput.style.background = 'rgba(17, 17, 17, 0.08)';
                setTimeout(() => { taskInput.style.background = ''; }, 300);
            }
        });
    });

    const chipRandomBtn = document.getElementById('chip-random-btn');
    if (chipRandomBtn) {
        chipRandomBtn.addEventListener('click', () => {
            const randomExcuse = RANDOM_EXCUSES[Math.floor(Math.random() * RANDOM_EXCUSES.length)];
            if (taskInput) {
                taskInput.value = randomExcuse;
                taskInput.focus();
                updateCharCount();
                if (navigator.vibrate) {
                    try { navigator.vibrate(8); } catch (e) {}
                }
                taskInput.style.transition = 'background 0.2s';
                taskInput.style.background = 'rgba(17, 17, 17, 0.08)';
                setTimeout(() => { taskInput.style.background = ''; }, 300);
            }
        });
    }

    // ==========================================
    // DAILY DIVERSIONS (Options 2, 4, 5)
    // ==========================================
    
    // Tab Switching
    const divTabs = document.querySelectorAll('.div-tab');
    const tabPanels = {
        clicker: document.getElementById('tab-clicker'),
        weather: document.getElementById('tab-weather'),
        comic: document.getElementById('tab-comic')
    };

    const switchTab = (tabName) => {
        divTabs.forEach(t => {
            const isActive = t.getAttribute('data-tab') === tabName;
            t.classList.toggle('active', isActive);
            t.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        Object.keys(tabPanels).forEach(key => {
            if (tabPanels[key]) {
                if (key === tabName) {
                    tabPanels[key].style.display = 'flex';
                    tabPanels[key].classList.add('active');
                } else {
                    tabPanels[key].style.display = 'none';
                    tabPanels[key].classList.remove('active');
                }
            }
        });
        try { localStorage.setItem('lg_active_tab', tabName); } catch (e) {}
    };

    divTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            if (tabName) switchTab(tabName);
        });
    });

    const savedTab = (() => {
        try { return localStorage.getItem('lg_active_tab'); } catch (e) { return null; }
    })();
    if (savedTab && tabPanels[savedTab]) {
        switchTab(savedTab);
    }

    // --- Option 2: The Do-Nothing Clicker ---
    const clickerBtn = document.getElementById('clicker-btn');
    const clickerCountEl = document.getElementById('clicker-count');
    const clickerTimeEl = document.getElementById('clicker-time');
    const clickerRankEl = document.getElementById('clicker-rank');
    const clickerQuoteEl = document.getElementById('clicker-quote');
    const clickerResetBtn = document.getElementById('clicker-reset-btn');

    let clickerCount = (() => {
        try { return parseInt(localStorage.getItem('lg_clicker_count') || '0', 10); } catch (e) { return 0; }
    })();

    const CLICKER_QUOTES = [
        "\"Every click is another responsibility successfully dodged.\"",
        "\"Your to-do list is trembling in existential fear.\"",
        "\"Productivity has officially left the premises.\"",
        "\"They can't ask you to work if you are busy clicking this.\"",
        "\"Look at that momentum. Absolutely zero progress made.\"",
        "\"A masterclass in strategic unproductivity.\"",
        "\"Your boss is probably crying somewhere.\"",
        "\"Tomorrow is looking very busy at this rate.\"",
        "\"Due today? Sounds like a tomorrow problem.\"",
        "\"Hard work pays off in the future. Slacking pays off right now.\"",
        "\"You are single-handedly stabilizing the global sloth economy.\"",
        "\"Just tell them you are waiting on email replies.\"",
        "\"If at first you don't succeed, do what you're doing right now.\"",
        "\"Deadlines are merely helpful suggestions from the universe.\"",
        "\"Look at you go. Achieving absolutely nothing with great gusto.\"",
        "\"The art of doing nothing requires incredible commitment.\"",
        "\"A task postponed is a task that might solve itself.\"",
        "\"Currently operating at peak non-performance.\"",
        "\"A true master of the art of delay.\"",
        "\"Legend says you were once productive. A vicious rumor.\""
    ];

    const getClickerBtnText = (count) => {
        if (count >= 500) return "[ TRANSCENDENT SLOTH ]";
        if (count >= 200) return "[ DEFYING DEADLINES ]";
        if (count >= 100) return "[ UNSTOPPABLE SLACKER ]";
        if (count >= 50) return "[ ESCALATE AVOIDANCE ]";
        if (count >= 25) return "[ KEEP DODGING WORK ]";
        if (count >= 10) return "[ AVOID RESPONSIBILITY ]";
        return "[ CLICK TO DO NOTHING ]";
    };

    const getClickerRank = (count) => {
        if (count >= 1000) return "RANK: TRANSCENDENT VOID DWELLER ✦";
        if (count >= 500) return "RANK: SUPREME TIME BENDER ★★★";
        if (count >= 200) return "RANK: ARCHBISHOP OF APATHY ★★";
        if (count >= 100) return "RANK: GRAND MASTER OF DELAY ★";
        if (count >= 50) return "RANK: EXECUTIVE SLOTH";
        if (count >= 25) return "RANK: PROFESSIONAL TIME BANDIT";
        if (count >= 10) return "RANK: CERTIFIED PROCRASTINATOR";
        if (count >= 1) return "RANK: NOVICE DODGER";
        return "RANK: CASUAL SLACKER";
    };

    const formatWastedTime = (clicks) => {
        const secs = Math.round(clicks * 1.5);
        if (secs < 60) return `(~${secs}s)`;
        const mins = (secs / 60).toFixed(1);
        return `(~${mins}m)`;
    };

    let prevRank = getClickerRank(clickerCount);

    const playClickerSound = () => {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.035);
            gain.gain.setValueAtTime(0.09, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.035);
        } catch (e) {}
    };

    const updateClickerUI = () => {
        if (clickerCountEl) clickerCountEl.textContent = clickerCount;
        if (clickerTimeEl) clickerTimeEl.textContent = formatWastedTime(clickerCount);
        if (clickerBtn) clickerBtn.textContent = getClickerBtnText(clickerCount);

        const currentRank = getClickerRank(clickerCount);
        if (clickerRankEl) {
            clickerRankEl.textContent = currentRank;
            if (currentRank !== prevRank) {
                clickerRankEl.classList.remove('rank-promoted');
                void clickerRankEl.offsetWidth;
                clickerRankEl.classList.add('rank-promoted');
                prevRank = currentRank;
            }
        }

        if (clickerQuoteEl) {
            const qIdx = Math.floor(clickerCount / 4) % CLICKER_QUOTES.length;
            clickerQuoteEl.textContent = CLICKER_QUOTES[qIdx];
        }

        checkUnlockables();
    };

    // --- Progressive Unlockables & Slacker Perks ---
    const claimPassBtn = document.getElementById('claim-pass-btn');
    const sepiaToggleBtn = document.getElementById('sepia-toggle-btn');
    const camoSection = document.getElementById('camo-section');
    const camoTypingBtn = document.getElementById('camo-typing-btn');
    const camoSighBtn = document.getElementById('camo-sigh-btn');
    const camoStopBtn = document.getElementById('camo-stop-btn');
    const secretColumn = document.getElementById('secret-column');

    const credentialModal = document.getElementById('credential-modal');
    const credentialBackdrop = document.getElementById('credential-backdrop');
    const credentialCloseBtn = document.getElementById('credential-close-btn');
    const credentialCanvas = document.getElementById('credential-canvas');
    const credentialDownloadBtn = document.getElementById('credential-download-btn');
    const credentialXBtn = document.getElementById('credential-x-btn');
    const credentialCopyBtn = document.getElementById('credential-copy-btn');

    const checkUnlockables = () => {
        // Rank 10+ (>= 10 clicks): Press Pass claim button
        if (claimPassBtn) {
            claimPassBtn.style.display = (clickerCount >= 10) ? 'inline-block' : 'none';
        }
        // Rank 25+ (>= 25 clicks): Office Sound Camouflage
        if (camoSection) {
            camoSection.style.display = (clickerCount >= 25) ? 'flex' : 'none';
        }
        // Rank 50+ (>= 50 clicks): 1890s Newsprint Sepia Edition
        if (sepiaToggleBtn) {
            sepiaToggleBtn.style.display = (clickerCount >= 50) ? 'inline-block' : 'none';
        }
        // Rank 200+ (>= 200 clicks): Secret Gossip Column
        if (secretColumn) {
            secretColumn.style.display = (clickerCount >= 200) ? 'block' : 'none';
        }
    };

    updateClickerUI();

    if (clickerBtn) {
        clickerBtn.addEventListener('click', () => {
            clickerCount++;
            try { localStorage.setItem('lg_clicker_count', clickerCount.toString()); } catch (e) {}
            playClickerSound();
            if (navigator.vibrate) {
                try { navigator.vibrate(12); } catch (e) {}
            }
            if (clickerCountEl) {
                clickerCountEl.style.transform = 'scale(1.25)';
                setTimeout(() => { clickerCountEl.style.transform = 'scale(1)'; }, 100);
            }
            updateClickerUI();
        });
    }

    if (clickerResetBtn) {
        clickerResetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm("Reset your wasted clicks tally back to zero?")) {
                clickerCount = 0;
                try { localStorage.setItem('lg_clicker_count', '0'); } catch (e) {}
                prevRank = getClickerRank(0);
                updateClickerUI();
            }
        });
    }

    // --- Perk 1: 1890s Sepia Newsprint Edition ---
    const restoreSepiaMode = () => {
        try {
            const isSepia = localStorage.getItem('lg_sepia_mode') === 'true';
            if (isSepia) {
                document.body.classList.add('sepia-edition');
                if (sepiaToggleBtn) sepiaToggleBtn.textContent = '[ 📜 1890s PRINT: ON ]';
            }
        } catch (e) {}
    };
    restoreSepiaMode();

    if (sepiaToggleBtn) {
        sepiaToggleBtn.addEventListener('click', () => {
            const isSepia = document.body.classList.toggle('sepia-edition');
            sepiaToggleBtn.textContent = isSepia ? '[ 📜 1890s PRINT: ON ]' : '[ 📜 1890s PRINT: OFF ]';
            try {
                localStorage.setItem('lg_sepia_mode', isSepia ? 'true' : 'false');
            } catch (e) {}
        });
    }

    // --- Perk 2: Office Sound Camouflage (Web Audio API) ---
    let camoAudioCtx = null;
    let typingTimeout = null;
    let isTypingCamoActive = false;

    const getCamoAudioContext = () => {
        if (!camoAudioCtx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) camoAudioCtx = new AudioCtx();
        }
        if (camoAudioCtx && camoAudioCtx.state === 'suspended') {
            camoAudioCtx.resume();
        }
        return camoAudioCtx;
    };

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

    const scheduleNextKeystroke = () => {
        if (!isTypingCamoActive) return;

        const rand = Math.random();
        let delay = 65 + Math.random() * 140;
        let isReturn = false;

        if (rand < 0.05) {
            // Natural thinking pause
            delay = 600 + Math.random() * 650;
        } else if (rand < 0.16) {
            // Spacebar / return key
            isReturn = true;
            delay = 180 + Math.random() * 120;
        }

        playKeyClick(isReturn);
        typingTimeout = setTimeout(scheduleNextKeystroke, delay);
    };

    const startTypingCamouflage = () => {
        if (isTypingCamoActive) {
            stopCamouflage();
            return;
        }
        getCamoAudioContext();
        isTypingCamoActive = true;
        if (camoTypingBtn) {
            camoTypingBtn.classList.add('playing');
            camoTypingBtn.textContent = '⌨ TYPING...';
        }
        if (camoStopBtn) camoStopBtn.style.display = 'inline-block';
        scheduleNextKeystroke();
    };

    const stopCamouflage = () => {
        isTypingCamoActive = false;
        if (typingTimeout) {
            clearTimeout(typingTimeout);
            typingTimeout = null;
        }
        if (camoTypingBtn) {
            camoTypingBtn.classList.remove('playing');
            camoTypingBtn.textContent = '⌨ FAKE TYPING';
        }
        if (camoStopBtn) camoStopBtn.style.display = 'none';
    };

    const playExhaustedSigh = () => {
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

            if (camoSighBtn) {
                const orig = camoSighBtn.textContent;
                camoSighBtn.textContent = '☕ *SIGH*';
                camoSighBtn.classList.add('playing');
                setTimeout(() => {
                    camoSighBtn.textContent = orig;
                    camoSighBtn.classList.remove('playing');
                }, duration * 1000);
            }
        } catch (e) {}
    };

    if (camoTypingBtn) camoTypingBtn.addEventListener('click', startTypingCamouflage);
    if (camoSighBtn) camoSighBtn.addEventListener('click', playExhaustedSigh);
    if (camoStopBtn) camoStopBtn.addEventListener('click', stopCamouflage);

    // --- Perk 3: Official Sloth Credential & Press Pass ---
    const generateCredentialCard = (targetCanvas, holderName, rankName, clicks, timeStr) => {
        const canvas = targetCanvas || document.createElement('canvas');
        canvas.width = 1000;
        canvas.height = 620;
        const ctx = canvas.getContext('2d');

        // Background: Newsprint parchment
        const isSepia = document.body.classList.contains('sepia-edition');
        ctx.fillStyle = isSepia ? '#F6EED9' : '#FAF8F5';
        ctx.fillRect(0, 0, 1000, 620);

        // Heavy Broadsheet Border
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 7;
        ctx.strokeRect(18, 18, 964, 584);

        ctx.lineWidth = 2;
        ctx.strokeRect(28, 28, 944, 564);

        // Corner Ornaments
        ctx.fillStyle = '#111111';
        [[32, 32], [952, 32], [32, 572], [952, 572]].forEach(([x, y]) => {
            ctx.fillRect(x, y, 16, 16);
        });

        // Dashed inner rule
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(36, 36, 928, 548);
        ctx.setLineDash([]);

        // Header section
        ctx.textAlign = 'center';
        ctx.fillStyle = '#111111';
        ctx.font = '700 12px "Space Mono", monospace';
        ctx.fillText('★ BUREAU OF STRATEGIC PROCRASTINATION & INACTION ★', 500, 68);

        ctx.font = '900 38px "Big Shoulders Display", sans-serif';
        ctx.fillText('OFFICIAL SLOTH CREDENTIAL & PRESS PASS', 500, 110);

        ctx.font = '700 11px "Space Mono", monospace';
        ctx.fillText('INTERNATIONAL DISPATCH // DIPLOMATIC IMMUNITY FROM ALL LABOR', 500, 134);

        // Double rule
        ctx.beginPath();
        ctx.moveTo(45, 146);
        ctx.lineTo(955, 146);
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(45, 151);
        ctx.lineTo(955, 151);
        ctx.lineWidth = 1;
        ctx.stroke();

        // Left Column: Operative Dossier
        ctx.textAlign = 'left';
        ctx.font = '700 12px "Space Mono", monospace';
        ctx.fillText('CREDENTIAL DOSSIER // CLASSIFIED IDLE', 60, 182);

        ctx.beginPath();
        ctx.moveTo(60, 188);
        ctx.lineTo(360, 188);
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Field 1: OPERATIVE / HOLDER
        ctx.font = '700 10px "Space Mono", monospace';
        ctx.fillStyle = '#555555';
        ctx.fillText('OPERATIVE / ACCREDITED HOLDER:', 60, 214);
        ctx.font = '900 18px "Space Mono", monospace';
        ctx.fillStyle = '#111111';
        const cleanHolder = (holderName || 'ANONYMOUS SLACKER').trim().toUpperCase();
        ctx.fillText(cleanHolder.length > 28 ? cleanHolder.substring(0, 26) + '...' : cleanHolder, 60, 236);

        // Field 2: SLACKER RANK
        ctx.font = '700 10px "Space Mono", monospace';
        ctx.fillStyle = '#555555';
        ctx.fillText('ACCREDITED SLACKER RANK:', 60, 270);
        ctx.font = '900 16px "Space Mono", monospace';
        ctx.fillStyle = '#111111';
        ctx.fillText(rankName.toUpperCase(), 60, 292);

        // Field 3: DELAY RECORD
        ctx.font = '700 10px "Space Mono", monospace';
        ctx.fillStyle = '#555555';
        ctx.fillText('RECORD OF NON-PERFORMANCE:', 60, 326);
        ctx.font = '700 14px "Space Mono", monospace';
        ctx.fillStyle = '#111111';
        ctx.fillText(`${clicks} TASKS EVADED ${timeStr} • STRATEGIC NON-ACTION`, 60, 348);

        // Field 4: IDENTIFIER & DATE
        ctx.font = '700 10px "Space Mono", monospace';
        ctx.fillStyle = '#555555';
        ctx.fillText('CLEARANCE CODE & ISSUE DATE:', 60, 382);
        ctx.font = '700 12px "Space Mono", monospace';
        ctx.fillStyle = '#111111';
        const certCode = `SLOTH-${Math.abs((clicks * 7919) ^ 0xABCD).toString(16).toUpperCase().padStart(8, '0')}`;
        const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase();
        ctx.fillText(`${certCode} • ISSUED ${dateStr}`, 60, 404);

        // Legal Mandate Box
        ctx.fillStyle = 'rgba(17, 17, 17, 0.04)';
        ctx.fillRect(60, 430, 550, 95);
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 1;
        ctx.strokeRect(60, 430, 550, 95);

        ctx.fillStyle = '#111111';
        ctx.font = '700 10px "Space Mono", monospace';
        ctx.fillText('LEGAL EXEMPTION CLAUSE // ARTICLE 404:', 72, 452);
        ctx.font = '400 9.5px "Space Mono", monospace';
        ctx.fillText('The bearer of this press pass is certified in strategic procrastination.', 72, 472);
        ctx.fillText('All superiors, urgent Slack pings, and calendar invites are legally voided.', 72, 488);
        ctx.fillText('Attempting to force productivity violates the 1890 Inaction Treaty.', 72, 504);

        // Right Column: Distressed Red Rubber Stamp + Signature + Barcode
        ctx.save();
        ctx.translate(775, 260);
        ctx.rotate(-8 * Math.PI / 180);
        const stampColor = '#b91c1c';
        ctx.strokeStyle = stampColor;
        ctx.lineWidth = 3.5;
        ctx.strokeRect(-140, -52, 280, 104);

        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(-133, -45, 266, 90);
        ctx.setLineDash([]);

        ctx.fillStyle = stampColor;
        ctx.textAlign = 'center';
        ctx.font = '700 10px "Space Mono", monospace';
        ctx.fillText('★ BUREAU OF IDLENESS ★', 0, -22);
        ctx.font = '900 19px "Space Mono", monospace';
        ctx.fillText('DIPLOMATIC IMMUNITY', 0, 4);
        ctx.font = '700 9.5px "Space Mono", monospace';
        ctx.fillText('CERTIFIED SLACKER // FULL EXEMPTION', 0, 24);
        ctx.restore();

        // Signature line
        ctx.textAlign = 'center';
        ctx.font = '700 14px "Space Mono", monospace';
        ctx.fillStyle = '#111111';
        ctx.fillText('Dr. Gator', 775, 365);
        ctx.beginPath();
        ctx.moveTo(660, 375);
        ctx.lineTo(890, 375);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.font = '700 9px "Space Mono", monospace';
        ctx.fillText('HIGH CHANCELLOR OF DELAY', 775, 390);

        // Barcode simulation
        const barStartX = 660;
        const barY = 430;
        const barHeight = 45;
        const barPattern = [3, 1, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 1, 2, 3, 2, 1, 4, 2, 1, 3, 1, 4];
        let curX = barStartX;
        ctx.fillStyle = '#111111';
        barPattern.forEach((w, idx) => {
            if (idx % 2 === 0) {
                ctx.fillRect(curX, barY, w * 1.8, barHeight);
            }
            curX += w * 1.8 + 2.5;
        });
        ctx.font = '700 9px "Space Mono", monospace';
        ctx.fillText(`* LG-${certCode} *`, 775, 495);

        // Footer note
        ctx.textAlign = 'center';
        ctx.font = '700 10px "Space Mono", monospace';
        ctx.fillText('LATER, GATOR // THE INDEPENDENT PROCRASTINATION JOURNAL // LATERGATOR.WORLD', 500, 555);

        return canvas;
    };

    const openCredentialModal = () => {
        if (!credentialModal || !credentialCanvas) return;
        const userNameInput = document.getElementById('user-name');
        const authorName = currentSubmittedName || (userNameInput ? userNameInput.value.trim() : '') || 'Anonymous Slacker';
        const rankText = getClickerRank(clickerCount).replace('RANK: ', '').trim();
        const timeStr = formatWastedTime(clickerCount);

        generateCredentialCard(credentialCanvas, authorName, rankText, clickerCount, timeStr);

        const credentialShareBtn = document.getElementById('credential-share-btn');
        if (credentialShareBtn && navigator.share) {
            credentialShareBtn.style.display = 'inline-block';
        }

        credentialModal.style.display = 'flex';
    };

    const closeCredentialModal = () => {
        if (credentialModal) credentialModal.style.display = 'none';
    };

    if (claimPassBtn) claimPassBtn.addEventListener('click', openCredentialModal);
    if (credentialCloseBtn) credentialCloseBtn.addEventListener('click', closeCredentialModal);
    if (credentialBackdrop) credentialBackdrop.addEventListener('click', closeCredentialModal);

    if (credentialDownloadBtn && credentialCanvas) {
        credentialDownloadBtn.addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = `official-sloth-press-pass-${Date.now()}.png`;
            link.href = credentialCanvas.toDataURL('image/png');
            link.click();

            const orig = credentialDownloadBtn.textContent;
            credentialDownloadBtn.textContent = '[ PRESS PASS DOWNLOADED ✓ ]';
            setTimeout(() => {
                credentialDownloadBtn.textContent = orig;
            }, 2500);
        });
    }

    const credentialShareBtn = document.getElementById('credential-share-btn');
    if (credentialShareBtn) {
        credentialShareBtn.addEventListener('click', async () => {
            if (!navigator.share) return;
            const rankText = getClickerRank(clickerCount).replace('RANK: ', '').trim();
            const shareText = `I have been officially certified as "${rankText}" with ${clickerCount} tasks evaded on Later, Gator. My diplomatic immunity is legally binding.`;
            const shareUrl = getShareUrl();

            if (credentialCanvas && credentialCanvas.toBlob && navigator.canShare) {
                credentialCanvas.toBlob(async (blob) => {
                    if (blob) {
                        try {
                            const file = new File([blob], 'official-sloth-press-pass.png', { type: 'image/png' });
                            if (navigator.canShare({ files: [file] })) {
                                await navigator.share({
                                    title: 'OFFICIAL SLOTH CREDENTIAL',
                                    text: shareText,
                                    files: [file]
                                });
                                return;
                            }
                        } catch (e) {}
                    }
                    try {
                        await navigator.share({
                            title: 'OFFICIAL SLOTH CREDENTIAL',
                            text: shareText,
                            url: shareUrl
                        });
                    } catch (e) {}
                }, 'image/png');
            } else {
                try {
                    await navigator.share({
                        title: 'OFFICIAL SLOTH CREDENTIAL',
                        text: shareText,
                        url: shareUrl
                    });
                } catch (e) {}
            }
        });
    }

    if (credentialXBtn) {
        credentialXBtn.addEventListener('click', () => {
            const rankText = getClickerRank(clickerCount).replace('RANK: ', '').trim();
            const text = `I have been officially certified as "${rankText}" with ${clickerCount} tasks evaded on @LaterGator. My diplomatic immunity is legally binding.`;
            const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(getShareUrl())}`;
            window.open(url, '_blank', 'noopener,noreferrer');
        });
    }

    if (credentialCopyBtn) {
        credentialCopyBtn.addEventListener('click', async () => {
            const userNameInput = document.getElementById('user-name');
            const authorName = currentSubmittedName || (userNameInput ? userNameInput.value.trim() : '') || 'Anonymous Slacker';
            const rankText = getClickerRank(clickerCount).replace('RANK: ', '').trim();
            const timeStr = formatWastedTime(clickerCount);
            const summary = `★ OFFICIAL SLOTH CREDENTIAL // BUREAU OF IDLENESS ★\nBEARER: ${authorName.toUpperCase()}\nRANK: ${rankText}\nDIRECTIVES EVADED: ${clickerCount} ${timeStr}\nSTATUS: FULL DIPLOMATIC IMMUNITY FROM WORK\nVERIFY: ${getShareUrl()}`;
            try {
                await navigator.clipboard.writeText(summary);
                credentialCopyBtn.textContent = "COPIED! ✓";
                setTimeout(() => { credentialCopyBtn.textContent = "COPY SUMMARY"; }, 2000);
            } catch (e) {
                credentialCopyBtn.textContent = "COPIED";
            }
        });
    }

    // --- Option 4: Meteorological Outlook ---
    const WEATHER_REPORTS = [
        { condition: "HEAVY BRAIN FOG", temp: "98°F IN DENIAL", humidity: "100% AVOIDANCE", forecast: "Forecast: Scattered excuses turning into crippling guilt by midnight." },
        { condition: "SPARSE MOTIVATION", temp: "72°F ROOM TEMPERATURE", humidity: "88% LETHARGY", forecast: "Forecast: 100% chance of telling everyone 'I will start fresh on Monday'." },
        { condition: "COLD DEADLINE FRONT", temp: "34°F CHILLING APATHY", humidity: "95% DISTRACTION", forecast: "Forecast: Approaching deadline front moving at 0.0001 MPH. Bunker down with tea." },
        { condition: "PRESSURE COLLAPSE", temp: "84°F COMFORT ZONE", humidity: "92% RATIONALIZATION", forecast: "Forecast: Severe low-pressure system over personal willpower. Stay in bed." },
        { condition: "PRECIPITATION WARNING", temp: "77°F COFFEE JITTERS", humidity: "99% COGNITIVE EVASION", forecast: "Forecast: Heavy downpour of 4-hour YouTube rabbit holes on medieval castle doors." },
        { condition: "SOLAR FLARE ADVISORY", temp: "104°F PANIC SOUP", humidity: "100% RELUCTANCE", forecast: "Forecast: Astral interference detected. All productive work legally grounded." }
    ];

    let weatherIdx = 0;
    const weatherConditionEl = document.getElementById('weather-condition');
    const weatherTempEl = document.getElementById('weather-temp');
    const weatherHumidityEl = document.getElementById('weather-humidity');
    const weatherForecastEl = document.getElementById('weather-forecast');
    const weatherNextBtn = document.getElementById('weather-next-btn');

    const renderWeather = (idx) => {
        const item = WEATHER_REPORTS[idx];
        if (!item) return;
        if (weatherConditionEl) weatherConditionEl.textContent = item.condition;
        if (weatherTempEl) weatherTempEl.textContent = item.temp;
        if (weatherHumidityEl) weatherHumidityEl.textContent = item.humidity;
        if (weatherForecastEl) weatherForecastEl.textContent = item.forecast;
    };

    if (weatherNextBtn) {
        weatherNextBtn.addEventListener('click', () => {
            weatherIdx = (weatherIdx + 1) % WEATHER_REPORTS.length;
            renderWeather(weatherIdx);
        });
    }

    // --- Option 5: Front-Page Editorial ASCII Comic Strip ---
    const COMIC_STRIPS = [
        {
            ascii: "  _.~\"~._.~\"~._\n (   (•_•)     )\n  \\  <)  )╯   /\n   `~-.__.-~'",
            caption: "\"The early bird gets the worm. The second mouse gets the cheese. I am going back to sleep.\""
        },
        {
            ascii: "   \\   |   /\n     (•_•)  )\n     (  (\n    /    \\",
            caption: "\"[DEADLINE APPROACHING] If I don't look directly at it, it can't legally see me.\""
        },
        {
            ascii: " [ 2:00 PM: 5-MIN BREAK ]\n      ( -_-) zzz\n       (   )\n      /     \\",
            caption: "\"I planned to start at 2:05. It is now 2:06. Routine ruined. Must wait until 3:00.\""
        },
        {
            ascii: " ┌────────────┐\n │ TO-DO LIST │   (•_•)\n │ 1. [✓]LIST │   /)  )\n └────────────┘   /   \\",
            caption: "\"Step 1: Write to-do list. Step 2: Rest for 4 hours from the exertion of Step 1.\""
        },
        {
            ascii: "     (•_•)\n    /(   )\\   \"Why do today what\n      | |      can wait until next fiscal\n               quarter?\"",
            caption: "\"The Gator contemplating all the milestones he won't be reaching today.\""
        },
        {
            ascii: "   (•_•)     \"I am not procrastinating.\n  <)  )╯      I am giving my great ideas\n   /   \\      time to properly marinate.\"",
            caption: "\"Culinary theory applied to severe work avoidance.\""
        },
        {
            ascii: "  [ 11:59 PM ]\n     (⊙_⊙)    \"The deadline has arrived.\n    /(   )\\    Suddenly I am operating at\n      | |      10,000% efficiency.\"",
            caption: "\"Panic mode: Nature's ultimate performance-enhancing drug.\""
        }
    ];

    let comicIdx = 0;
    const comicAsciiEl = document.getElementById('comic-ascii');
    const comicCaptionEl = document.getElementById('comic-caption');
    const comicPageNumEl = document.getElementById('comic-page-num');
    const comicPrevBtn = document.getElementById('comic-prev-btn');
    const comicNextBtn = document.getElementById('comic-next-btn');

    const renderComic = (idx) => {
        const item = COMIC_STRIPS[idx];
        if (!item) return;
        if (comicAsciiEl) comicAsciiEl.textContent = item.ascii;
        if (comicCaptionEl) comicCaptionEl.textContent = item.caption;
        if (comicPageNumEl) comicPageNumEl.textContent = `STRIP ${idx + 1} OF ${COMIC_STRIPS.length}`;
    };

    renderComic(comicIdx);

    if (comicPrevBtn) {
        comicPrevBtn.addEventListener('click', () => {
            comicIdx = (comicIdx - 1 + COMIC_STRIPS.length) % COMIC_STRIPS.length;
            renderComic(comicIdx);
        });
    }

    if (comicNextBtn) {
        comicNextBtn.addEventListener('click', () => {
            comicIdx = (comicIdx + 1) % COMIC_STRIPS.length;
            renderComic(comicIdx);
        });
    }

    // Smart Polling (Page Visibility API to save battery and network)
    let pollInterval = null;

    const startPolling = () => {
        if (!pollInterval) {
            pollInterval = setInterval(fetchAll, 10000);
        }
    };

    const stopPolling = () => {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    };

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopPolling();
        } else {
            fetchAll();
            startPolling();
        }
    });

    // Telegraph Network Resilience (Offline / Online Status)
    window.addEventListener('offline', () => {
        if (statusMessage) {
            statusMessage.textContent = "⚡ TELEGRAPH CABLE DISRUPTED // OPERATING OFFLINE";
            setTimeout(() => {
                if (statusMessage.textContent.includes("TELEGRAPH")) statusMessage.textContent = "";
            }, 6000);
        }
    });

    window.addEventListener('online', () => {
        if (statusMessage) {
            statusMessage.textContent = "⚡ TELEGRAPH CONNECTION RESTORED";
            setTimeout(() => {
                if (statusMessage.textContent.includes("RESTORED")) statusMessage.textContent = "";
            }, 3000);
        }
        fetchAll();
    });

    fetchAll();
    startPolling();
});
