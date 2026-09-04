document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('task-input');
    const laterBtn = document.getElementById('later-btn');
    const panicBtn = document.getElementById('panic-btn');
    const statusMessage = document.getElementById('status-message');
    const feedContainer = document.getElementById('feed-container');
    const statCurrent = document.getElementById('stat-current');
    const statTotal = document.getElementById('stat-total');
    const statVisitors = document.getElementById('stat-visitors');

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

        // Separate classified ads from public wire tasks
        const communityAds = [];
        const wireTasks = [];

        tasks.forEach(task => {
            if (task.text && task.text.startsWith('[AD] ')) {
                const raw = task.text.replace('[AD] ', '');
                const colonIdx = raw.indexOf(':');
                let cat = 'NOTICE';
                let body = raw;
                if (colonIdx !== -1) {
                    cat = raw.substring(0, colonIdx).trim().toUpperCase();
                    body = raw.substring(colonIdx + 1).trim();
                }
                const name = (task.city || 'ANONYMOUS').toUpperCase();
                const country = (task.country || 'PARTS UNKNOWN').toUpperCase();
                communityAds.push({
                    category: cat,
                    text: body,
                    byline: `${name}, ${country}`
                });
            } else {
                wireTasks.push(task);
            }
        });

        if (communityAds.length > 0 && typeof updateClassifiedsData === 'function') {
            updateClassifiedsData(communityAds);
        }

        if (wireTasks.length === 0) {
            feedContainer.innerHTML = '<div class="feed-item">No transmissions received yet.</div>';
            return;
        }

        // Avoid re-rendering if data is identical (prevents scroll jumps while reading)
        if (renderedTopId === wireTasks[0].id && renderedCount === wireTasks.length) {
            return;
        }

        const prevScrollTop = feedContainer.scrollTop;
        const isScrolled = prevScrollTop > 20;

        const feedHtml = wireTasks.map(task => {
            const userName = task.city || 'Anonymous';
            const userCountry = task.country || 'Parts Unknown';
            const locationString = `REPORT: ${escapeHtml(userName).toUpperCase()} IN ${escapeHtml(userCountry).toUpperCase()}`;

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

    const submitTask = async (isPanic = false) => {
        let text = taskInput.value.trim();
        const name = document.getElementById('user-name').value.trim();
        
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

        if (isPanic) {
            text = `[PANIC] ${text}`;
        }

        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Gator-Token': 'chomp-chomp'
                },
                body: JSON.stringify({ text, name })
            });

            if (response.ok) {
                const submittedText = isPanic ? text.replace('[PANIC] ', '') : text;
                currentRawTask = submittedText;
                currentIsPanic = isPanic;
                currentSubmittedName = name;
                showShareSlip(submittedText, isPanic);

                if (isPanic) {
                    const inputSection = document.querySelector('.input-section');
                    inputSection.classList.remove('shake');
                    void inputSection.offsetWidth; // trigger reflow
                    inputSection.classList.add('shake');
                    
                    panicBtn.textContent = "FINE. DOING IT.";
                    statusMessage.textContent = "FINE. WE BELIEVE IN YOU. PROBABLY.";
                    
                    setTimeout(() => {
                        inputSection.classList.remove('shake');
                        panicBtn.textContent = "DO IT NOW (PANIC)";
                        taskInput.value = '';
                        statusMessage.textContent = "";
                    }, 2000);
                } else {
                    taskInput.classList.remove('fly-off');
                    void taskInput.offsetWidth;
                    taskInput.classList.add('fly-off');
                    
                    laterBtn.textContent = "POSTPONED";
                    statusMessage.textContent = "SUCCESSFULLY EVADED.";
                    
                    setTimeout(() => {
                        taskInput.value = '';
                        taskInput.classList.remove('fly-off');
                        laterBtn.textContent = "NOT MY PROBLEM TODAY";
                        statusMessage.textContent = "";
                    }, 1000);
                }

                fetchAll();
            } else {
                const errData = await response.json().catch(() => ({}));
                statusMessage.textContent = (errData.error || "TRANSMISSION REJECTED.").toUpperCase();
                setTimeout(() => { statusMessage.textContent = ""; }, 4000);
            }
        } catch (error) {
            console.error('Failed to submit task:', error);
            statusMessage.textContent = "SYSTEM ERROR. YOU MUST DO IT NOW.";
        }
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
        ctx.fillText('AUTHORIZED SIGNATURE // LATER-GATOR', 1060, 693);

        return canvas;
    };

    const showShareSlip = (task, isPanicMode) => {
        if (!shareCard) return;
        const clean = task.trim();
        shareCardTask.innerHTML = `"${censorNsfwHtml(escapeHtml(clean))}"`;
        
        const plainCensored = censorNsfwText(clean);
        const actionVerb = isPanicMode ? "am officially panicking about" : "just postponed";
        const punchline = isPanicMode ? "Wish me luck." : "Not my problem today.";
        currentShareText = `I ${actionVerb} "${plainCensored}" on Later, Gator alongside the rest of the world. ${punchline}`;
        
        shareCard.style.display = 'block';
    };

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
    
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitTask(false);
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
                taskInput.style.transition = 'background 0.2s';
                taskInput.style.background = 'rgba(17, 17, 17, 0.08)';
                setTimeout(() => { taskInput.style.background = ''; }, 300);
            }
        });
    }

    // The Classifieds Component
    const DEFAULT_CLASSIFIEDS = [
        { category: "WANTED", text: "2 grams of willpower. Missing since 9:00 AM. Generous reward of eternal gratitude.", byline: "ANONYMOUS, UNITED STATES" },
        { category: "FOR SALE", text: "Unused gym membership. Mint condition. Never witnessed a single drop of human sweat.", byline: "ALEX, UNITED KINGDOM" },
        { category: "LOST", text: "4 hours of life. Last seen watching street food videos on YouTube.", byline: "SARA, GERMANY" },
        { category: "SEEKING", text: "Someone to fold one single fitted sheet in exchange for a cool rock.", byline: "SAM, CANADA" },
        { category: "NOTICE", text: "All tasks scheduled for today have been officially postponed until further notice.", byline: "BUREAU OF SLOTH, BANGLADESH" },
        { category: "WANTED", text: "Motivation to open my 84 open browser tabs. Willing to trade my dignity.", byline: "CHRIS, SINGAPORE" },
        { category: "FOR SALE", text: "Completely unread textbook. Perfect for propping up a computer monitor.", byline: "STUDENT, MALTA" },
        { category: "SERVICES", text: "Professional staring into the void. 0 years experience. $0/hr.", byline: "DAVID, AUSTRALIA" },
        { category: "FOUND", text: "Sudden burst of ambition at 2:45 AM. Already vanished into thin air.", byline: "NIGHT OWL, BELARUS" },
        { category: "WANTED", text: "An adultier adult to handle whatever adult situation this is.", byline: "EMMA, FRANCE" },
        { category: "SEEKING", text: "Coffee strong enough to wake up my ancestors.", byline: "TIRED CITIZEN, INDONESIA" },
        { category: "NOTICE", text: "Due to a severe lack of interest, tomorrow has been canceled.", byline: "THE MANAGEMENT, GLOBAL" },
        { category: "LOST", text: "The plot. If found, please return to my desk immediately.", byline: "CONFUSED, UNITED STATES" },
        { category: "FOR SALE", text: "Unopened planner for 2026. Crisp pages, zero accomplishments recorded.", byline: "OPTIMIST, GERMANY" },
        { category: "WANTED", text: "A nap so deep it resets my entire life trajectory.", byline: "SLEEPY, BANGLADESH" }
    ];

    let allClassifieds = [...DEFAULT_CLASSIFIEDS];
    let classifiedsOffset = 0;
    const classifiedsList = document.getElementById('classifieds-list');
    const classifiedsShuffleBtn = document.getElementById('classifieds-shuffle-btn');
    const classifiedsToggleBtn = document.getElementById('classifieds-toggle-form-btn');
    const classifiedsFormWrapper = document.getElementById('classifieds-form-wrapper');
    const classifiedsCloseForm = document.getElementById('classifieds-close-form');
    const classifiedSubmitBtn = document.getElementById('classified-submit-btn');
    const classifiedCategory = document.getElementById('classified-category');
    const classifiedName = document.getElementById('classified-name');
    const classifiedText = document.getElementById('classified-text');
    const classifiedStatus = document.getElementById('classified-status');

    function updateClassifiedsData(communityAds) {
        if (!communityAds || communityAds.length === 0) return;
        allClassifieds = [...communityAds, ...DEFAULT_CLASSIFIEDS];
        renderClassifieds();
    }

    function renderClassifieds() {
        if (!classifiedsList) return;
        if (allClassifieds.length === 0) {
            classifiedsList.innerHTML = '<div class="classified-item">No dispatches currently listed.</div>';
            return;
        }

        const visibleAds = [];
        for (let i = 0; i < 3; i++) {
            const idx = (classifiedsOffset + i) % allClassifieds.length;
            visibleAds.push(allClassifieds[idx]);
        }

        classifiedsList.innerHTML = visibleAds.map(ad => {
            const tag = escapeHtml(ad.category || 'NOTICE').toUpperCase();
            const body = censorNsfwHtml(escapeHtml(ad.text || ''));
            const byline = censorNsfwHtml(escapeHtml(ad.byline || 'ANONYMOUS, GLOBAL').toUpperCase());

            return `
            <div class="classified-item">
                <div class="classified-body">
                    <span class="classified-tag">${tag}:</span> ${body}
                </div>
                <div class="classified-byline">— ${byline}</div>
            </div>
            `;
        }).join('');
    }

    if (classifiedsShuffleBtn) {
        classifiedsShuffleBtn.addEventListener('click', () => {
            classifiedsOffset = (classifiedsOffset + 3) % allClassifieds.length;
            if (classifiedsList) {
                classifiedsList.style.opacity = '0.3';
                setTimeout(() => {
                    renderClassifieds();
                    classifiedsList.style.opacity = '1';
                }, 120);
            } else {
                renderClassifieds();
            }
        });
    }

    if (classifiedsToggleBtn && classifiedsFormWrapper) {
        classifiedsToggleBtn.addEventListener('click', () => {
            const isHidden = classifiedsFormWrapper.style.display === 'none';
            classifiedsFormWrapper.style.display = isHidden ? 'block' : 'none';
            if (isHidden && classifiedText) classifiedText.focus();
        });
    }

    if (classifiedsCloseForm && classifiedsFormWrapper) {
        classifiedsCloseForm.addEventListener('click', () => {
            classifiedsFormWrapper.style.display = 'none';
        });
    }

    if (classifiedSubmitBtn) {
        classifiedSubmitBtn.addEventListener('click', async () => {
            const cat = (classifiedCategory ? classifiedCategory.value : 'NOTICE').trim();
            const text = (classifiedText ? classifiedText.value : '').trim();
            const name = (classifiedName ? classifiedName.value : '').trim();

            if (!text || text.length < 5) {
                if (classifiedStatus) classifiedStatus.textContent = "DISPATCH TOO BRIEF (MIN 5 CHARS).";
                return;
            }

            if (containsInappropriate(text) || containsInappropriate(name)) {
                if (classifiedStatus) classifiedStatus.textContent = "CLASSIFIED REJECTED BY DECENCY BOARD.";
                setTimeout(() => { if (classifiedStatus) classifiedStatus.textContent = ""; }, 3000);
                return;
            }

            if (classifiedStatus) classifiedStatus.textContent = "TRANSMITTING NOTICE...";

            try {
                const response = await fetch('/api/tasks', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Gator-Token': 'chomp-chomp'
                    },
                    body: JSON.stringify({
                        text: `[AD] ${cat}: ${text}`,
                        name: name
                    })
                });

                if (response.ok) {
                    if (classifiedStatus) classifiedStatus.textContent = "NOTICE PUBLISHED TO CLASSIFIEDS!";
                    if (classifiedText) classifiedText.value = '';
                    
                    const authorName = name !== '' ? name : 'Anonymous';
                    allClassifieds.unshift({
                        category: cat,
                        text: text,
                        byline: `${authorName.toUpperCase()}, BROADCAST`
                    });
                    classifiedsOffset = 0;
                    renderClassifieds();

                    setTimeout(() => {
                        if (classifiedStatus) classifiedStatus.textContent = "";
                        if (classifiedsFormWrapper) classifiedsFormWrapper.style.display = 'none';
                    }, 2000);
                    fetchAll();
                } else {
                    const errData = await response.json().catch(() => ({}));
                    if (classifiedStatus) classifiedStatus.textContent = (errData.error || "TRANSMISSION FAILED.").toUpperCase();
                }
            } catch (err) {
                if (classifiedStatus) classifiedStatus.textContent = "TRANSMISSION ERROR.";
            }
        });
    }

    renderClassifieds();

    fetchAll();
    setInterval(fetchAll, 10000);
});
