document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('task-input');
    const userNameInput = document.getElementById('user-name');
    const taskCharCount = document.getElementById('task-char-count');
    const laterBtn = document.getElementById('later-btn');
    const panicBtn = document.getElementById('panic-btn');
    const laterBtnText = document.getElementById('later-btn-text');
    const panicBtnText = document.getElementById('panic-btn-text');
    const shufflePhraseBtn = document.getElementById('shuffle-phrase-btn');
    const statusMessage = document.getElementById('status-message');
    const feedContainer = document.getElementById('feed-container');
    const statCurrent = document.getElementById('stat-current');
    const statTotal = document.getElementById('stat-total');
    const statVisitors = document.getElementById('stat-visitors');

    // Slacker Rank, Time Stolen & Sympathy Reactions (Global Local State)
    // Clear out legacy clicker count if present
    try { localStorage.removeItem('lg_clicker_count'); } catch (e) {}

    let postponementsCount = (() => {
        try { return parseInt(localStorage.getItem('lg_postponements_count') || '0', 10); } catch (e) { return 0; }
    })();

    let timeStolenSeconds = (() => {
        try { return parseInt(localStorage.getItem('lg_time_stolen_seconds') || '0', 10); } catch (e) { return 0; }
    })();

    let totalSympathyCount = (() => {
        try { return parseInt(localStorage.getItem('lg_total_sympathy') || '0', 10); } catch (e) { return 0; }
    })();

    let myTaskIds = (() => {
        try {
            const raw = localStorage.getItem('lg_my_task_ids');
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    })();
    const optToRealIdMap = new Map();

    // Active time spent on site avoiding work (increments every 5s while tab is visible)
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            timeStolenSeconds += 5;
            window.timeStolenSeconds = timeStolenSeconds;
            try { localStorage.setItem('lg_time_stolen_seconds', timeStolenSeconds.toString()); } catch (e) {}
        }
    }, 5000);

    const formatTimeStolen = (secs) => {
        const s = secs || 0;
        if (s < 60) return `~${Math.max(s, 5)}s`;
        if (s < 3600) {
            const mins = Math.round(s / 60);
            return `~${mins}m`;
        }
        const hrs = (s / 3600).toFixed(1);
        return `~${hrs}h`;
    };

    const getSlackerScore = (dispatches, sympathy, timeSecs) => {
        const curDisp = dispatches !== undefined ? dispatches : ((window.postponementsCount !== undefined) ? window.postponementsCount : postponementsCount);
        let curSymp = sympathy !== undefined ? sympathy : ((window.totalSympathyCount !== undefined) ? window.totalSympathyCount : totalSympathyCount);
        let curTime = timeSecs !== undefined ? timeSecs : ((window.timeStolenSeconds !== undefined) ? window.timeStolenSeconds : timeStolenSeconds);

        if (typeof curSymp === 'object' && curSymp !== null) {
            curTime = curSymp.timeSecs !== undefined ? curSymp.timeSecs : curTime;
            curSymp = curSymp.sympathy !== undefined ? curSymp.sympathy : ((window.totalSympathyCount !== undefined) ? window.totalSympathyCount : totalSympathyCount);
        }
        return (Number(curDisp) || 0) * 10 + (Number(curSymp) || 0) * 3 + Math.floor((Number(curTime) || 0) / 120);
    };

    const getSlackerRank = (dispatches, sympathy, timeSecs) => {
        const curDisp = dispatches !== undefined ? dispatches : ((window.postponementsCount !== undefined) ? window.postponementsCount : postponementsCount);
        let curSymp = sympathy !== undefined ? sympathy : ((window.totalSympathyCount !== undefined) ? window.totalSympathyCount : totalSympathyCount);
        let curTime = timeSecs !== undefined ? timeSecs : ((window.timeStolenSeconds !== undefined) ? window.timeStolenSeconds : timeStolenSeconds);

        if (typeof curSymp === 'object' && curSymp !== null) {
            curTime = curSymp.timeSecs !== undefined ? curSymp.timeSecs : curTime;
            curSymp = curSymp.sympathy !== undefined ? curSymp.sympathy : ((window.totalSympathyCount !== undefined) ? window.totalSympathyCount : totalSympathyCount);
        }
        const score = getSlackerScore(curDisp, curSymp, curTime);
        if (score >= 800 || curDisp >= 25) return "RANK: TRANSCENDENT VOID DWELLER ✦";
        if (score >= 400 || curDisp >= 15) return "RANK: SUPREME TIME BENDER ★★★";
        if (score >= 200 || curDisp >= 8) return "RANK: ARCHBISHOP OF APATHY ★★";
        if (score >= 100 || curDisp >= 5) return "RANK: GRAND MASTER OF DELAY ★";
        if (score >= 50 || curDisp >= 3) return "RANK: EXECUTIVE SLOTH";
        if (score >= 25 || curDisp >= 2) return "RANK: PROFESSIONAL TIME BANDIT";
        if (score >= 10 || curDisp >= 1 || curTime >= 60) return "RANK: CERTIFIED PROCRASTINATOR";
        return "RANK: NOVICE DODGER";
    };

    // Expose rank calculations for external canvas/pass renderers
    window.getSlackerRank = getSlackerRank;
    window.getSlackerScore = getSlackerScore;
    window.postponementsCount = postponementsCount;
    window.timeStolenSeconds = timeStolenSeconds;
    window.totalSympathyCount = totalSympathyCount;
    window.myTaskIds = myTaskIds;

    // Sub-modules & Services (Audio, Evasion, Canvas)
    const GatorAudio = window.GatorAudio || {};
    const GatorEvasion = window.GatorEvasion || {};
    const GatorCanvas = window.GatorCanvas || {};

    // Backward compatibility aliases
    let clickerCount = postponementsCount;
    const getClickerRank = () => getSlackerRank(postponementsCount, totalSympathyCount, timeStolenSeconds);
    const formatWastedTime = () => formatTimeStolen(timeStolenSeconds);

    // ==========================================
    // THE EVASION ENGINE (DYNAMIC SUBMIT BUTTON & TASK-REACTIVE SYSTEM)
    // ==========================================
    const STARTER_EVASION_PHRASES = GatorEvasion.STARTER_EVASION_PHRASES || [];
    const RANK_10_PRESTIGE_PHRASES = GatorEvasion.RANK_10_PRESTIGE_PHRASES || [];
    const RANK_25_PRESTIGE_PHRASES = GatorEvasion.RANK_25_PRESTIGE_PHRASES || [];
    const RANK_50_PRESTIGE_PHRASES = GatorEvasion.RANK_50_PRESTIGE_PHRASES || [];
    const RANK_100_PRESTIGE_PHRASES = GatorEvasion.RANK_100_PRESTIGE_PHRASES || [];
    const TASK_REACTIVE_PAIRS = GatorEvasion.TASK_REACTIVE_PAIRS || [];

    let currentActiveEvasionPhrase = "NOT MY PROBLEM TODAY";
    let isTaskReactiveActive = false;

    const getAvailableEvasionPool = () => {
        let pool = [...STARTER_EVASION_PHRASES];
        const score = getSlackerScore();
        if (score >= 5 || postponementsCount >= 2) pool = pool.concat(RANK_10_PRESTIGE_PHRASES);
        if (score >= 20 || postponementsCount >= 5) pool = pool.concat(RANK_25_PRESTIGE_PHRASES);
        if (score >= 40 || postponementsCount >= 10) pool = pool.concat(RANK_50_PRESTIGE_PHRASES);
        if (score >= 75 || postponementsCount >= 20) pool = pool.concat(RANK_100_PRESTIGE_PHRASES);
        return pool;
    };

    const setButtonLabels = (laterText = "POST TO THE WIRE ➔", panicText = "⚡ DO IT NOW (PANIC MODE)") => {
        if (laterBtnText) {
            laterBtnText.textContent = "POST TO THE WIRE ➔";
        } else if (laterBtn) {
            laterBtn.textContent = "POST TO THE WIRE ➔";
        }

        if (panicBtnText) {
            panicBtnText.textContent = panicText || "⚡ DO IT NOW (PANIC MODE)";
        } else if (panicBtn) {
            panicBtn.textContent = panicText || "⚡ DO IT NOW (PANIC MODE)";
        }
    };

    const rollEvasionPhrase = (isUserInitiated = false) => {
        const pool = getAvailableEvasionPool();
        const candidates = pool.filter(p => p !== currentActiveEvasionPhrase);
        const selected = candidates.length > 0
            ? candidates[Math.floor(Math.random() * candidates.length)]
            : pool[0];

        currentActiveEvasionPhrase = selected;
        isTaskReactiveActive = false;
        setButtonLabels("POST TO THE WIRE ➔", "⚡ DO IT NOW (PANIC MODE)");

        if (isUserInitiated && shufflePhraseBtn) {
            shufflePhraseBtn.classList.remove('spinning');
            void shufflePhraseBtn.offsetWidth;
            shufflePhraseBtn.classList.add('spinning');
            setTimeout(() => {
                shufflePhraseBtn.classList.remove('spinning');
            }, 450);
        }
    };

    const updateTaskReactiveButtons = (rawText) => {
        if (!rawText || rawText.trim().length === 0) {
            if (isTaskReactiveActive) {
                setButtonLabels("POST TO THE WIRE ➔", "⚡ DO IT NOW (PANIC MODE)");
                isTaskReactiveActive = false;
            }
            return;
        }

        const lower = rawText.toLowerCase().trim();
        let matched = null;

        for (const item of TASK_REACTIVE_PAIRS) {
            for (const kw of item.keywords) {
                if (lower.includes(kw)) {
                    matched = item;
                    break;
                }
            }
            if (matched) break;
        }

        if (matched) {
            isTaskReactiveActive = true;
            setButtonLabels("POST TO THE WIRE ➔", matched.panic || "⚡ DO IT NOW (PANIC MODE)");
        } else if (isTaskReactiveActive) {
            setButtonLabels("POST TO THE WIRE ➔", "⚡ DO IT NOW (PANIC MODE)");
            isTaskReactiveActive = false;
        }
    };

    // Roll initial starter phrase on page load
    rollEvasionPhrase(false);

    if (shufflePhraseBtn) {
        shufflePhraseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            rollEvasionPhrase(true);
            if (navigator.vibrate) {
                try { navigator.vibrate(10); } catch (e) {}
            }
        });
    }

    // Common task keywords used for smart detection and field auto-correction
    const COMMON_TASK_KEYWORDS = GatorEvasion.COMMON_TASK_KEYWORDS || [];

    // Local Alias Auto-Retention (Permanent local identity with task-keyword sanitizer)
    if (userNameInput) {
        try {
            const savedName = localStorage.getItem('lg_user_name');
            if (savedName) {
                // If savedName is a task keyword, purge it from local storage so the user is not permanently named "Work" or "Sleep"
                if (COMMON_TASK_KEYWORDS.includes(savedName.toLowerCase().trim())) {
                    localStorage.removeItem('lg_user_name');
                    userNameInput.value = '';
                } else {
                    userNameInput.value = savedName;
                }
            }
        } catch (e) {}

        userNameInput.addEventListener('input', () => {
            try {
                localStorage.setItem('lg_user_name', userNameInput.value.trim());
            } catch (e) {}
        });
    }

    // Broadsheet Character Counter
    const taskInputWrap = document.getElementById('task-input-wrap');
    const updateCharCount = () => {
        if (!taskCharCount || !taskInput) return;
        const len = taskInput.value.length;
        taskCharCount.textContent = `[ ${len} / 150 LETTERS ]`;
        taskCharCount.classList.toggle('near-limit', len >= 130);
        if (taskInputWrap) {
            taskInputWrap.classList.toggle('has-value', len > 0);
        }
    };

    if (taskInput) {
        taskInput.addEventListener('input', () => {
            updateCharCount();
            updateTaskReactiveButtons(taskInput.value);
        });
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

    // Tactile Rubber Stamp Sound Generator (Web Audio API via GatorAudio)
    const playRubberStampSound = () => {
        if (GatorAudio.playRubberStampSound) GatorAudio.playRubberStampSound();
    };

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



    // Post box placeholder left empty to avoid redundancy with the 'WHAT ARE YOU AVOIDING?' header
    taskInput.placeholder = "";

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

    // ==========================================
    // RUBBER STAMP REACTIONS (SYMPATHY STAMPS)
    // ==========================================

    // Stable anonymous session ID — generated once, persists forever in localStorage
    const getSessionId = () => {
        try {
            let sid = localStorage.getItem('lg_session_id');
            if (!sid) {
                sid = 'sid_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
                localStorage.setItem('lg_session_id', sid);
            }
            return sid;
        } catch (e) {
            return 'sid_anon';
        }
    };
    const SESSION_ID = getSessionId();

    // Gator Account State (HN-Style Auth)
    let currentGator = (() => {
        try {
            return JSON.parse(localStorage.getItem('lg_gator_user') || 'null');
        } catch (e) {
            return null;
        }
    })();
    let gatorToken = localStorage.getItem('lg_gator_token') || null;

    let userStamps = (() => {
        try {
            return JSON.parse(localStorage.getItem('lg_user_stamps') || '{}');
        } catch (e) {
            return {};
        }
    })();

    window.currentGator = currentGator;
    window.userStamps = userStamps;

    const saveUserStamps = () => {
        try {
            localStorage.setItem('lg_user_stamps', JSON.stringify(userStamps));
            window.userStamps = userStamps;
        } catch (e) {}
    };

    const syncAllReactionButtonsInDOM = () => {
        document.querySelectorAll('.feed-reactions').forEach(container => {
            const taskId = container.getAttribute('data-task-id');
            if (!taskId) return;
            const myStamp = userStamps[taskId] || userStamps[String(taskId)] || userStamps[Number(taskId)] || null;
            ['same', 'valid', 'rip'].forEach(type => {
                const btn = container.querySelector(`.reaction-stamp-btn[data-type="${type}"]`);
                if (btn) {
                    if (myStamp === type) {
                        btn.classList.add('stamped');
                        if (!btn.style.getPropertyValue('--stamp-rot')) {
                            const defaultRot = ((taskId * 17) % 7 - 3.2).toFixed(2);
                            btn.style.setProperty('--stamp-rot', `${defaultRot}deg`);
                        }
                    } else {
                        btn.classList.remove('stamped');
                        btn.style.removeProperty('--stamp-rot');
                    }
                }
            });
        });
    };

    // On load, fetch reactions (by sessionId and/or gatorId) from server and merge into userStamps
    const syncSessionReactionsFromServer = async () => {
        try {
            let url = `/api/react?sessionId=${encodeURIComponent(SESSION_ID)}`;
            if (currentGator && currentGator.gatorId) {
                url += `&gatorId=${encodeURIComponent(currentGator.gatorId)}`;
            }
            const res = await fetch(url);
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.reactions && typeof data.reactions === 'object') {
                const serverReactions = data.reactions;
                // Merge server state into local — server reactions augment local stamps,
                // but NEVER delete local stamps on this device.
                let hasChanges = false;
                for (const [taskId, rType] of Object.entries(serverReactions)) {
                    if (rType && userStamps[taskId] !== rType) {
                        userStamps[taskId] = rType;
                        hasChanges = true;
                    }
                }
                if (hasChanges) {
                    saveUserStamps();
                    syncAllReactionButtonsInDOM();
                }
            }
        } catch (e) {
            // Fall back to localStorage silently
        }
    };
    // Defer session reactions sync so initial render is completely unblocked
    setTimeout(() => {
        syncSessionReactionsFromServer();
    }, 1500);


    // Synthesize physical wooden rubber stamp slam sound (Web Audio API via GatorAudio)
    const playStampSlamSound = () => {
        if (GatorAudio.playStampSlamSound) GatorAudio.playStampSlamSound();
    };

    let lastTopTaskId = null;
    let renderedTopId = null;
    let renderedCount = 0;
    const allKnownTasks = new Map();
    let refreshClippingTheme = () => {};

    const buildFeedItemHtml = (task, isNew) => {
        if (task && task.id) {
            allKnownTasks.set(Number(task.id), task);
        }
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
        let rawText = task.text || '';

        if (rawText.startsWith('[PANIC] ')) {
            isPanic = true;
            rawText = rawText.replace('[PANIC] ', '');
        }

        let verb = "";
        const numericId = parseInt(task.id, 10) || 0;
        if (isPanic) {
            const verbIndex = Math.abs(numericId) % panicVerbs.length;
            verb = panicVerbs[verbIndex];
        } else {
            const verbIndex = Math.abs(numericId) % evasionVerbs.length;
            verb = evasionVerbs[verbIndex];
        }

        const animationClass = isNew ? 'slide-in' : '';

        // User reaction status for this dispatch
        const myStamp = userStamps[task.id] || userStamps[String(task.id)] || userStamps[Number(task.id)] || null;
        const defaultRot = ((Math.abs(numericId) * 17) % 7 - 3.2).toFixed(2);
        const sameCount = Math.max(task.same_count != null ? task.same_count : 0, myStamp === 'same' ? 1 : 0);
        const validCount = Math.max(task.valid_count != null ? task.valid_count : 0, myStamp === 'valid' ? 1 : 0);
        const ripCount = Math.max(task.rip_count != null ? task.rip_count : 0, myStamp === 'rip' ? 1 : 0);

        return `
        <div class="feed-item ${animationClass}" data-task-id="${task.id}">
            <div class="feed-item-meta">${censorNsfwHtml(locationString)} ${verb}:</div>
            <div class="feed-item-text">${censorNsfwHtml(escapeHtml(rawText))}</div>
            <div class="feed-item-footer">
                <span class="feed-item-time" data-created-at="${escapeHtml(task.created_at || '')}">${timeAgo(task.created_at)}</span>
                <div class="feed-reactions" data-task-id="${task.id}">
                    <button type="button" class="reaction-stamp-btn ${myStamp === 'same' ? 'stamped' : ''}" ${myStamp === 'same' ? `style="--stamp-rot: ${defaultRot}deg;"` : ''} data-type="same" title="I am doing this right now">
                        [ SAME <span class="reaction-count">${sameCount}</span> ]
                    </button>
                    <button type="button" class="reaction-stamp-btn ${myStamp === 'valid' ? 'stamped' : ''}" ${myStamp === 'valid' ? `style="--stamp-rot: ${defaultRot}deg;"` : ''} data-type="valid" title="Completely justifiable excuse">
                        [ VALID <span class="reaction-count">${validCount}</span> ]
                    </button>
                    <button type="button" class="reaction-stamp-btn ${myStamp === 'rip' ? 'stamped' : ''}" ${myStamp === 'rip' ? `style="--stamp-rot: ${defaultRot}deg;"` : ''} data-type="rip" title="Thoughts and prayers for your deadline">
                        [ RIP <span class="reaction-count">${ripCount}</span> ]
                    </button>
                    <button type="button" class="feed-clip-btn" data-task-id="${task.id}" title="Print & Clip Newspaper Snippet" aria-label="Clip Dispatch">
                        ✂ CLIP
                    </button>
                    ${((Array.isArray(myTaskIds) && (myTaskIds.includes(Number(task.id)) || myTaskIds.includes(String(task.id)))) || (typeof task.id === 'string' && task.id.startsWith('opt-'))) ? `
                    <button type="button" class="feed-shred-btn" data-task-id="${task.id}" title="Expunge & Shred This Dispatch from the Wire" aria-label="Shred Dispatch">
                        🗄️ SHRED
                    </button>` : ''}
                </div>
            </div>
        </div>`;
    };

    const prependFeedTask = (task) => {
        if (!feedContainer) return null;
        if (task && task.id) {
            allKnownTasks.set(task.id, task);
        }

        // Clean up empty / loading placeholder
        const emptyEl = feedContainer.querySelector('.loading, .feed-item:not([data-task-id])');
        if (emptyEl) emptyEl.remove();

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = buildFeedItemHtml(task, true);
        const newEl = tempDiv.firstElementChild;
        if (!newEl) return null;

        newEl.classList.add('fresh-wire-dispatch');

        const firstExisting = feedContainer.querySelector('.feed-item[data-task-id]');
        if (firstExisting) {
            feedContainer.insertBefore(newEl, firstExisting);
        } else {
            feedContainer.prepend(newEl);
        }

        // Smooth scroll to top of feed so user immediately sees their dispatch
        feedContainer.scrollTo({ top: 0, behavior: 'smooth' });
        return newEl;
    };

    const updateRelativeTimestamps = () => {
        if (!feedContainer) return;
        const timeEls = feedContainer.querySelectorAll('.feed-item-time[data-created-at]');
        timeEls.forEach(el => {
            const createdAt = el.getAttribute('data-created-at');
            if (createdAt) {
                el.textContent = timeAgo(createdAt);
            }
        });
    };

    const buildFeedEndBannerHtml = () => `
        <div class="feed-end-banner">
            <div class="feed-end-divider">
                <span class="feed-end-ornament">✦</span>
                <span class="feed-end-text">END OF WIRE ARCHIVES • DISPATCH NO. 1</span>
                <span class="feed-end-ornament">✦</span>
            </div>
            <button type="button" class="feed-back-to-top-btn" id="feed-back-to-top-btn" title="Jump to the latest incoming dispatch" aria-label="Return to latest dispatch">
                ▲ RETURN TO LATEST DISPATCH
            </button>
        </div>
    `;

    const renderFeed = (tasks) => {
        if (!tasks || tasks.length === 0) {
            feedContainer.innerHTML = '<div class="feed-item">No transmissions received yet.</div>';
            renderedTopId = null;
            renderedCount = 0;
            return;
        }

        tasks.forEach(t => {
            if (t && t.id) allKnownTasks.set(Number(t.id), t);
        });

        // Clean up any optimistic items that match text of newly arrived server tasks
        const existingOptItems = feedContainer.querySelectorAll('.feed-item[data-task-id^="opt-"]');
        existingOptItems.forEach(optEl => {
            const optText = optEl.querySelector('.feed-item-text')?.textContent || '';
            const matchingReal = tasks.find(t => (t.text || '').replace('[PANIC] ', '') === optText);
            if (matchingReal) {
                optEl.remove();
            }
        });

        const existingItems = feedContainer.querySelectorAll('.feed-item[data-task-id]:not([data-task-id^="opt-"])');

        // Check if DOM is missing older historical tasks (e.g. after fast initial localStorage cache paint)
        const lastExistingItem = existingItems.length > 0 ? existingItems[existingItems.length - 1] : null;
        const currentDomBottomId = lastExistingItem ? Number(lastExistingItem.getAttribute('data-task-id')) : null;
        const targetOldestId = (tasks.length > 0 && tasks[tasks.length - 1]?.id) ? Number(tasks[tasks.length - 1].id) : null;
        const missingHistorical = currentDomBottomId !== null && targetOldestId !== null && currentDomBottomId > targetOldestId;

        // 1. Initial Load, reset when empty, or rehydrate when server returns full history beyond local cache
        if (existingItems.length === 0 || renderedTopId === null || missingHistorical) {
            const prevScrollTop = feedContainer.scrollTop;
            const isScrolled = prevScrollTop > 20;

            const feedHtml = tasks.map(t => buildFeedItemHtml(t, false)).join('') + buildFeedEndBannerHtml();
            feedContainer.innerHTML = feedHtml;

            if (isScrolled) {
                feedContainer.scrollTop = prevScrollTop;
            }

            renderedTopId = tasks[0].id;
            renderedCount = tasks.length;
            lastTopTaskId = tasks[0].id;
            return;
        }

        // 2. Incremental updates: Check if new tasks arrived
        const newTasks = tasks.filter(t => t.id > renderedTopId);

        if (newTasks.length > 0) {
            if (newTasks.length < 15) {
                // Smoothly prepend only newly arrived transmissions without wiping DOM!
                const prevScrollTop = feedContainer.scrollTop;
                const isScrolled = prevScrollTop > 40;

                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = newTasks.map(t => buildFeedItemHtml(t, true)).join('');

                const firstExisting = feedContainer.querySelector('.feed-item[data-task-id]');
                const fragment = document.createDocumentFragment();
                const newEls = Array.from(tempDiv.children);
                newEls.forEach(el => fragment.appendChild(el));

                if (firstExisting) {
                    feedContainer.insertBefore(fragment, firstExisting);
                } else {
                    feedContainer.appendChild(fragment);
                }

                // If user was scrolled down reading archives, preserve their exact viewport offset!
                if (isScrolled) {
                    let addedHeight = 0;
                    newEls.forEach(el => { addedHeight += el.offsetHeight; });
                    feedContainer.scrollTop = prevScrollTop + addedHeight;
                }

                renderedTopId = tasks[0].id;
                renderedCount = tasks.length;
                lastTopTaskId = tasks[0].id;
            } else {
                // Large batch gap: perform full clean render
                const prevScrollTop = feedContainer.scrollTop;
                const isScrolled = prevScrollTop > 20;

                const feedHtml = tasks.map(t => buildFeedItemHtml(t, false)).join('') + buildFeedEndBannerHtml();
                feedContainer.innerHTML = feedHtml;

                if (isScrolled) {
                    feedContainer.scrollTop = prevScrollTop;
                }

                renderedTopId = tasks[0].id;
                renderedCount = tasks.length;
                lastTopTaskId = tasks[0].id;
            }
        }

        // 3. In-place refresh of reaction counts for all rendered tasks
        tasks.forEach(task => {
            const reactionsEl = feedContainer.querySelector(`.feed-reactions[data-task-id="${task.id}"]`);
            if (reactionsEl) {
                const lastStampedAt = recentLocalStamps.get(Number(task.id)) || 0;
                if (Date.now() - lastStampedAt < 5000) {
                    // Skip in-place count overwrite for recently stamped task to allow server write propagation (FIX 6)
                    return;
                }
                const myStamp = userStamps[task.id] || userStamps[String(task.id)] || userStamps[Number(task.id)] || null;
                const sameEl = reactionsEl.querySelector('[data-type="same"] .reaction-count');
                const validEl = reactionsEl.querySelector('[data-type="valid"] .reaction-count');
                const ripEl = reactionsEl.querySelector('[data-type="rip"] .reaction-count');

                if (sameEl) sameEl.textContent = Math.max(task.same_count != null ? task.same_count : 0, myStamp === 'same' ? 1 : 0);
                if (validEl) validEl.textContent = Math.max(task.valid_count != null ? task.valid_count : 0, myStamp === 'valid' ? 1 : 0);
                if (ripEl) ripEl.textContent = Math.max(task.rip_count != null ? task.rip_count : 0, myStamp === 'rip' ? 1 : 0);
            }
        });
    };

    // ==========================================
    // SYNCHRONIZED REACTION STAMPS (WIRE & LEAD STORY)
    // ==========================================
    const inFlightReactions = new Set();
    const lastReactionTime = new Map();
    const recentLocalStamps = new Map();

    const syncReactionInDOM = (taskId, reactionType, isStamped, newCount, clearedType = null, rot = null) => {
        const containers = document.querySelectorAll(`.feed-reactions[data-task-id="${taskId}"]`);
        containers.forEach(container => {
            const btn = container.querySelector(`.reaction-stamp-btn[data-type="${reactionType}"]`);
            if (btn) {
                if (isStamped) {
                    btn.classList.add('stamped');
                    if (rot) {
                        btn.style.setProperty('--stamp-rot', `${rot}deg`);
                    } else if (!btn.style.getPropertyValue('--stamp-rot')) {
                        const defaultRot = ((taskId * 17) % 7 - 3.2).toFixed(2);
                        btn.style.setProperty('--stamp-rot', `${defaultRot}deg`);
                    }
                } else {
                    btn.classList.remove('stamped');
                    btn.style.removeProperty('--stamp-rot');
                }
                const countEl = btn.querySelector('.reaction-count');
                if (countEl && newCount != null) {
                    countEl.textContent = newCount;
                }
            }

            if (clearedType) {
                const prevBtn = container.querySelector(`.reaction-stamp-btn[data-type="${clearedType}"]`);
                if (prevBtn) {
                    prevBtn.classList.remove('stamped');
                    prevBtn.style.removeProperty('--stamp-rot');
                    const prevCountEl = prevBtn.querySelector('.reaction-count');
                    if (prevCountEl) {
                        const val = parseInt(prevCountEl.textContent, 10) || 0;
                        prevCountEl.textContent = Math.max(0, val - 1);
                    }
                }
            }
        });
    };

    const handleReactionClick = async (btn) => {
        const reactionsContainer = btn.closest('.feed-reactions');
        if (!reactionsContainer) return;

        const rawTaskId = reactionsContainer.getAttribute('data-task-id');
        // FIX 5: Prevent clicking stamps on optimistic cards before server assignment
        if (!rawTaskId || rawTaskId.startsWith('opt-')) {
            return;
        }

        const taskId = parseInt(rawTaskId, 10);
        const reactionType = btn.getAttribute('data-type');
        if (!taskId || isNaN(taskId) || taskId <= 0 || !reactionType) return;

        // FIX 1 & FIX 8: Concurrency lock & 300ms cooldown per task
        const now = Date.now();
        const lastClick = lastReactionTime.get(taskId) || 0;
        if (inFlightReactions.has(taskId) || (now - lastClick < 300)) {
            return;
        }
        lastReactionTime.set(taskId, now);
        inFlightReactions.add(taskId);

        // Auto-archive welcome memo on first stamp
        if (typeof window.__lgDismissMemo === 'function') window.__lgDismissMemo();

        // Lock pointer-events on buttons for this task during flight
        const relatedBtns = document.querySelectorAll(`.feed-reactions[data-task-id="${taskId}"] .reaction-stamp-btn`);
        relatedBtns.forEach(b => b.style.setProperty('pointer-events', 'none'));

        // Save snapshot of previous state for rollback on error (FIX 10)
        const prevActiveType = userStamps[taskId] || userStamps[String(taskId)] || userStamps[Number(taskId)] || null;
        const isAlreadyStamped = btn.classList.contains('stamped');
        const countEl = btn.querySelector('.reaction-count');
        const currentCount = countEl ? parseInt(countEl.textContent, 10) || 0 : 0;

        let prevClearedCount = null;
        if (!isAlreadyStamped && prevActiveType && prevActiveType !== reactionType) {
            const prevActiveBtn = reactionsContainer.querySelector(`.reaction-stamp-btn[data-type="${prevActiveType}"]`);
            if (prevActiveBtn) {
                const cEl = prevActiveBtn.querySelector('.reaction-count');
                prevClearedCount = cEl ? parseInt(cEl.textContent, 10) || 0 : 0;
            }
        }

        recentLocalStamps.set(taskId, now);

        // 1. Tactile sound & mobile vibration
        playStampSlamSound();
        if (navigator.vibrate) {
            try { navigator.vibrate(14); } catch (err) {}
        }

        // 2. Physical rubber stamp tilt (-3.2° to +3.8°) & slam animation
        const rot = (Math.random() * 7 - 3.2).toFixed(2);
        btn.style.setProperty('--stamp-rot', `${rot}deg`);

        btn.classList.remove('stamp-slam');
        void btn.offsetWidth;
        btn.classList.add('stamp-slam');

        // Micro ink splatter burst particles
        if (!isAlreadyStamped) {
            const burst = document.createElement('span');
            burst.className = 'ink-splatter-burst';
            for (let i = 0; i < 5; i++) {
                const drop = document.createElement('span');
                drop.className = 'ink-drop';
                const angle = Math.random() * Math.PI * 2;
                const dist = 10 + Math.random() * 16;
                const dx = (Math.cos(angle) * dist).toFixed(1);
                const dy = (Math.sin(angle) * dist).toFixed(1);
                const scale = (0.35 + Math.random() * 0.45).toFixed(2);
                drop.style.left = '50%';
                drop.style.top = '50%';
                drop.style.setProperty('--drop-x', `${dx}px`);
                drop.style.setProperty('--drop-y', `${dy}px`);
                drop.style.setProperty('--drop-scale', scale);
                burst.appendChild(drop);
            }
            btn.appendChild(burst);
            setTimeout(() => { burst.remove(); }, 480);
        }

        // 3. Optimistic toggle
        let action = 'add';
        let clearedType = null;
        let newCount = currentCount;

        if (isAlreadyStamped) {
            action = 'remove';
            delete userStamps[taskId];
            newCount = Math.max(0, currentCount - 1);
            btn.style.removeProperty('--stamp-rot');
            syncReactionInDOM(taskId, reactionType, false, newCount);
        } else {
            if (prevActiveType && prevActiveType !== reactionType) {
                clearedType = prevActiveType;
            }
            userStamps[taskId] = reactionType;
            newCount = currentCount + 1;
            syncReactionInDOM(taskId, reactionType, true, newCount, clearedType, rot);
        }

        saveUserStamps();

        // 4. Background sync to /api/react with rollback on failure
        try {
            // FIX 2a: If switching stamps, await removal of old stamp before adding new one
            if (clearedType) {
                const clearPayload = { taskId, reactionType: clearedType, action: 'remove', sessionId: SESSION_ID };
                if (currentGator && currentGator.gatorId) clearPayload.gatorId = currentGator.gatorId;
                const clearRes = await fetch('/api/react', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(clearPayload)
                });
                if (!clearRes.ok) {
                    console.warn('Removal of previous stamp returned HTTP', clearRes.status);
                }
            }

            const reactPayload = { taskId, reactionType, action, sessionId: SESSION_ID };
            if (currentGator && currentGator.gatorId) reactPayload.gatorId = currentGator.gatorId;
            const res = await fetch('/api/react', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reactPayload)
            });

            if (res.ok) {
                const data = await res.json();
                if (data && data.counts && data.counts[reactionType] != null) {
                    syncReactionInDOM(taskId, reactionType, !isAlreadyStamped, data.counts[reactionType], null, rot);
                    // Also update cleared type count if present in server response
                    if (clearedType && data.counts[clearedType] != null) {
                        const containers = document.querySelectorAll(`.feed-reactions[data-task-id="${taskId}"]`);
                        containers.forEach(c => {
                            const prevEl = c.querySelector(`.reaction-stamp-btn[data-type="${clearedType}"] .reaction-count`);
                            if (prevEl) prevEl.textContent = data.counts[clearedType];
                        });
                    }
                }
            } else {
                throw new Error(`API responded with status ${res.status}`);
            }
        } catch (err) {
            console.error('Reaction sync failed, rolling back optimistic state:', err);
            // FIX 10: Rollback optimistic updates on failure
            if (prevActiveType) {
                userStamps[taskId] = prevActiveType;
            } else {
                delete userStamps[taskId];
            }
            saveUserStamps();

            // Revert DOM state
            syncReactionInDOM(taskId, reactionType, isAlreadyStamped, currentCount);
            if (clearedType && prevClearedCount != null) {
                syncReactionInDOM(taskId, clearedType, true, prevClearedCount);
            }

            // Visual rejection shake feedback
            btn.classList.remove('stamp-slam');
            btn.classList.add('stamp-rejected');
            setTimeout(() => {
                btn.classList.remove('stamp-rejected');
            }, 600);
        } finally {
            inFlightReactions.delete(taskId);
            relatedBtns.forEach(b => b.style.removeProperty('pointer-events'));
        }
    };


    const handleClipClick = (clipBtn) => {
        const taskIdStr = clipBtn.getAttribute('data-task-id');
        const taskId = parseInt(taskIdStr, 10);
        let task = allKnownTasks.get(taskId);

        if (!task) {
            // Fallback from DOM element
            const feedItem = clipBtn.closest('.feed-item') || clipBtn.closest('.lead-story-banner');
            if (feedItem) {
                const textEl = feedItem.querySelector('.feed-item-text') || feedItem.querySelector('.lead-story-headline');
                const metaEl = feedItem.querySelector('.feed-item-meta') || feedItem.querySelector('.lead-story-byline');
                const text = textEl ? textEl.textContent.replace(/^"|"$/g, '') : 'Undisclosed avoided task';
                let city = 'Wire Slacker';
                let country = 'Parts Unknown';
                let authorTag = null;
                if (metaEl) {
                    const metaText = metaEl.textContent || '';
                    const tagMatch = metaText.match(/@([a-zA-Z0-9_]+)/);
                    if (tagMatch) {
                        authorTag = tagMatch[1];
                        city = `@${tagMatch[1]}`;
                    }
                    const inMatch = metaText.match(/\bIN\s+([^:]+):?/i);
                    if (inMatch) {
                        country = inMatch[1].trim();
                    }
                }
                task = {
                    id: taskId || Date.now(),
                    text: text,
                    city: city,
                    country: country,
                    author_tag: authorTag,
                    created_at: new Date().toISOString()
                };
            }
        }

        if (task) {
            playClickerSound();
            openClippingModal(task);
        }
    };

    if (feedContainer) {
        feedContainer.addEventListener('click', (e) => {
            const topBtn = e.target.closest('#feed-back-to-top-btn, .feed-back-to-top-btn');
            if (topBtn) {
                e.preventDefault();
                e.stopPropagation();
                scrollToLatestDispatch();
                return;
            }

            const clipBtn = e.target.closest('.feed-clip-btn');
            if (clipBtn) {
                e.preventDefault();
                e.stopPropagation();
                handleClipClick(clipBtn);
                return;
            }

            const shredBtn = e.target.closest('.feed-shred-btn');
            if (shredBtn) {
                e.preventDefault();
                e.stopPropagation();
                handleFeedShredClick(shredBtn);
                return;
            }

            const btn = e.target.closest('.reaction-stamp-btn');
            if (btn) {
                e.preventDefault();
                e.stopPropagation();
                handleReactionClick(btn);
            }
        });
    }

    // High-performance smooth scroll (240ms cubic ease-out)
    function fastSmoothScroll(target, to = 0, duration = 240) {
        if (!target) return;
        const isWin = (target === window || target === document.documentElement || target === document.body);
        const start = isWin ? (window.pageYOffset || document.documentElement.scrollTop || 0) : target.scrollTop;
        if (Math.abs(start - to) < 2) return;
        const startTime = performance.now();
        const change = to - start;

        function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            const val = start + change * ease;
            if (isWin) {
                window.scrollTo(0, val);
            } else {
                target.scrollTop = val;
            }
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }
        requestAnimationFrame(step);
    }

    const scrollToLatestDispatch = () => {
        if (typeof playClickerSound === 'function') playClickerSound();
        if (navigator.vibrate) {
            try { navigator.vibrate(15); } catch (err) {}
        }
        if (feedContainer && feedContainer.scrollTop > 0) {
            fastSmoothScroll(feedContainer, 0, 240);
        }
        if (window.innerWidth <= 768) {
            const wireBox = document.getElementById('box-wire');
            if (wireBox) {
                const rect = wireBox.getBoundingClientRect();
                const targetScrollY = window.pageYOffset + rect.top - 8;
                if (Math.abs(window.pageYOffset - targetScrollY) > 5) {
                    fastSmoothScroll(window, Math.max(0, targetScrollY), 240);
                }
            } else if (window.scrollY > 0) {
                fastSmoothScroll(window, 0, 240);
            }
        } else if (window.scrollY > 0) {
            fastSmoothScroll(window, 0, 240);
        }
    };

    // Floating Jump to Latest Dispatch Indicator
    const wireJumpLatestBtn = document.getElementById('wire-jump-latest-btn');

    const updateJumpLatestVisibility = (forceHide = false) => {
        if (!wireJumpLatestBtn) return;
        if (forceHide) {
            wireJumpLatestBtn.classList.remove('visible');
            return;
        }

        const feedScroll = feedContainer ? feedContainer.scrollTop : 0;
        const isMobile = window.innerWidth <= 768;
        const isWireTab = !isMobile || document.body.classList.contains('mobile-view-wire');

        if (!isWireTab) {
            wireJumpLatestBtn.classList.remove('visible');
            return;
        }

        // Only reveal when the reader has crawled significantly deep into the archives (750px+ down)
        // Prevents button from popping up near the top or during standard page browsing
        const isDeep = feedScroll > 750 || (isMobile && window.scrollY > 900);

        if (isDeep) {
            wireJumpLatestBtn.classList.add('visible');
        } else if (feedScroll < 400 && (!isMobile || window.scrollY < 550)) {
            wireJumpLatestBtn.classList.remove('visible');
        }
    };

    if (feedContainer) {
        feedContainer.addEventListener('scroll', () => updateJumpLatestVisibility(false), { passive: true });
    }
    window.addEventListener('scroll', () => updateJumpLatestVisibility(false), { passive: true });

    if (wireJumpLatestBtn) {
        wireJumpLatestBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            wireJumpLatestBtn.classList.remove('visible');
            scrollToLatestDispatch();
        });
    }

    // ==========================================
    // FRONT-PAGE LEAD STORY OF THE DAY (CROWN DISPATCH)
    // ==========================================
    const leadStoryBanner = document.getElementById('lead-story-banner');
    const leadHeadline = document.getElementById('lead-story-headline');
    const leadByline = document.getElementById('lead-story-byline');
    const leadBadge = document.getElementById('lead-story-badge');
    const leadReactions = document.getElementById('lead-reactions');
    const leadClipBtn = document.getElementById('lead-clip-btn');

    if (leadStoryBanner) {
        leadStoryBanner.addEventListener('click', (e) => {
            const clipBtn = e.target.closest('.lead-clip-btn, .feed-clip-btn');
            if (clipBtn) {
                e.preventDefault();
                e.stopPropagation();
                handleClipClick(clipBtn);
                return;
            }

            const btn = e.target.closest('.reaction-stamp-btn');
            if (btn) {
                e.preventDefault();
                e.stopPropagation();
                handleReactionClick(btn);
            }
        });
    }

    if (leadClipBtn) {
        leadClipBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleClipClick(leadClipBtn);
        });
    }

    const renderLeadStory = (tasks = []) => {
        if (!leadStoryBanner || !leadHeadline) return;

        if (!tasks || tasks.length === 0) {
            leadHeadline.textContent = '"AWAITING TODAY\'S CHIEF TRANSMISSIONS FROM THE WIRE..."';
            leadByline.textContent = 'DISPATCHED BY: ANONYMOUS IN PARTS UNKNOWN';
            leadBadge.textContent = '★ AWAITING TRANSMISSIONS';
            return;
        }

        // Filter valid substantive non-link dispatches
        const validTasks = tasks.filter(t => {
            const raw = (t.text || '').replace(/^\[PANIC\]\s*/, '').trim();
            return raw.length >= 4 && !/(https?:\/\/|www\.)/i.test(raw);
        });

        const pool = validTasks.length > 0 ? validTasks : tasks;

        // Rank by engagement score: SAME (3x) + VALID (2x) + RIP (1x)
        let topTask = null;
        let highestScore = -1;

        for (const t of pool) {
            const same = t.same_count || 0;
            const valid = t.valid_count || 0;
            const rip = t.rip_count || 0;
            const score = (same * 3) + (valid * 2) + (rip * 1);
            if (score > highestScore) {
                highestScore = score;
                topTask = t;
            }
        }

        // Fallback: If no tasks have stamps yet, pick the most substantial recent dispatch
        if (highestScore <= 0 || !topTask) {
            topTask = pool.slice(0, 15).sort((a, b) => (b.text || '').length - (a.text || '').length)[0] || pool[0];
            highestScore = 0;
        }

        if (!topTask) return;
        allKnownTasks.set(Number(topTask.id), topTask);

        // Populate headline
        let choreText = (topTask.text || '').trim();
        choreText = choreText.replace(/^\[PANIC\]\s*/, '');
        choreText = censorNsfwText(choreText.replace(/[\r\n]+/g, ' '));
        leadHeadline.textContent = `"${choreText.toUpperCase()}"`;

        // Populate byline
        const rawAuthor = (topTask.city || 'Anonymous').trim();
        const country = (topTask.country || 'Parts Unknown').toUpperCase();
        let displayName = rawAuthor;
        let rankFlair = '';
        const flairMatch = rawAuthor.match(/^\[(.*?)\]\s*(.*)$/);
        if (flairMatch) {
            rankFlair = `[${flairMatch[1].toUpperCase()}] `;
            displayName = flairMatch[2] || 'Anonymous';
        }
        leadByline.textContent = `DISPATCHED BY: ${rankFlair}${displayName.toUpperCase()} IN ${country}`;

        // Populate badge
        if (highestScore > 0) {
            leadBadge.textContent = `🏆 ${highestScore} ENGAGEMENT PTS • #1 MOST SYMPATHIZED`;
        } else {
            leadBadge.textContent = `★ TODAY'S FRONT-PAGE SELECTION`;
        }

        // Populate reaction buttons
        leadReactions.setAttribute('data-task-id', topTask.id);
        if (leadClipBtn) {
            leadClipBtn.setAttribute('data-task-id', topTask.id);
        }

        const myStamp = userStamps[topTask.id] || userStamps[String(topTask.id)] || userStamps[Number(topTask.id)] || null;
        const defaultRot = ((topTask.id * 17) % 7 - 3.2).toFixed(2);
        const sameCount = Math.max(topTask.same_count != null ? topTask.same_count : 0, myStamp === 'same' ? 1 : 0);
        const validCount = Math.max(topTask.valid_count != null ? topTask.valid_count : 0, myStamp === 'valid' ? 1 : 0);
        const ripCount = Math.max(topTask.rip_count != null ? topTask.rip_count : 0, myStamp === 'rip' ? 1 : 0);

        const sameBtn = leadReactions.querySelector('[data-type="same"]');
        const validBtn = leadReactions.querySelector('[data-type="valid"]');
        const ripBtn = leadReactions.querySelector('[data-type="rip"]');
        const isRecentLeadStamp = (Date.now() - (recentLocalStamps.get(Number(topTask.id)) || 0)) < 5000;

        if (sameBtn) {
            sameBtn.className = `reaction-stamp-btn ${myStamp === 'same' ? 'stamped' : ''}`;
            if (myStamp === 'same') sameBtn.style.setProperty('--stamp-rot', `${defaultRot}deg`);
            else sameBtn.style.removeProperty('--stamp-rot');
            if (!isRecentLeadStamp) {
                const c = sameBtn.querySelector('.reaction-count');
                if (c) c.textContent = sameCount;
            }
        }
        if (validBtn) {
            validBtn.className = `reaction-stamp-btn ${myStamp === 'valid' ? 'stamped' : ''}`;
            if (myStamp === 'valid') validBtn.style.setProperty('--stamp-rot', `${defaultRot}deg`);
            else validBtn.style.removeProperty('--stamp-rot');
            if (!isRecentLeadStamp) {
                const c = validBtn.querySelector('.reaction-count');
                if (c) c.textContent = validCount;
            }
        }
        if (ripBtn) {
            ripBtn.className = `reaction-stamp-btn ${myStamp === 'rip' ? 'stamped' : ''}`;
            if (myStamp === 'rip') ripBtn.style.setProperty('--stamp-rot', `${defaultRot}deg`);
            else ripBtn.style.removeProperty('--stamp-rot');
            if (!isRecentLeadStamp) {
                const c = ripBtn.querySelector('.reaction-count');
                if (c) c.textContent = ripCount;
            }
        }
    };

    const updateUserSympathyFromFeed = (tasksList) => {
        const tasks = Array.isArray(tasksList) ? tasksList : Array.from(allKnownTasks.values());
        if (!Array.isArray(tasks) || tasks.length === 0) return;
        const currentMyIds = (Array.isArray(window.myTaskIds) && window.myTaskIds.length > 0) ? window.myTaskIds : myTaskIds;
        if (!Array.isArray(currentMyIds) || currentMyIds.length === 0) return;

        let sympathySum = 0;
        const idSet = new Set(currentMyIds.map(Number));
        for (const t of tasks) {
            if (t && idSet.has(Number(t.id))) {
                sympathySum += (Number(t.same_count) || 0) + (Number(t.valid_count) || 0) + (Number(t.rip_count) || 0);
            }
        }

        if (sympathySum > totalSympathyCount) {
            totalSympathyCount = sympathySum;
            window.totalSympathyCount = totalSympathyCount;
            try { localStorage.setItem('lg_total_sympathy', totalSympathyCount.toString()); } catch (e) {}
            if (typeof updateClickerUI === 'function') updateClickerUI();
        }
    };
    window.updateUserSympathyFromFeed = updateUserSympathyFromFeed;

    const fetchTasks = async (forceFresh = false) => {
        try {
            const url = `/api/tasks?limit=all&_t=${Date.now()}`;
            const response = await fetch(url);
            if (response.ok) {
                const tasks = await response.json();
                renderFeed(tasks);
                renderTicker(tasks);
                renderLeadStory(tasks);
                updateUserSympathyFromFeed(tasks);
                if (Array.isArray(tasks) && tasks.length > 0) {
                    try {
                        localStorage.setItem('lg_cached_tasks', JSON.stringify(tasks.slice(0, 500)));
                    } catch (e) {}
                }
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
            if (feedContainer && !feedContainer.querySelector('.feed-item[data-task-id]')) {
                feedContainer.innerHTML = '<div class="loading">Connection severed.</div>';
            }
        }
    };

    // ==========================================
    // BREAKING NEWS TELEGRAPH WIRE TICKER (LIVE ONLY)
    // ==========================================
    const tickerTrack = document.getElementById('ticker-track');
    let lastTickerTasksHash = "";

    const renderTicker = (tasks = []) => {
        if (!tickerTrack) return;

        if (!tasks || tasks.length === 0) {
            tickerTrack.innerHTML = `
                <div class="ticker-item">
                    <span class="ticker-tag">[TELEGRAPH]</span>
                    <span class="ticker-text">AWAITING LIVE TRANSMISSIONS FROM THE WIRE...</span>
                    <span class="ticker-bullet">•</span>
                </div>
            `.repeat(4);
            return;
        }

        const topId = tasks[0].id;
        const currentHash = `${topId}_${tasks.length}`;
        if (lastTickerTasksHash === currentHash && tickerTrack.children.length > 0) {
            return;
        }
        lastTickerTasksHash = currentHash;

        // Extract real user submissions from the live public wire
        const liveItems = tasks.slice(0, 20).map(t => {
            const rawAuthor = (t.city || 'ANONYMOUS').trim();
            const country = t.country ? ` (${t.country.toUpperCase()})` : '';
            
            let displayName = rawAuthor;
            let tag = "DISPATCH";

            const flairMatch = rawAuthor.match(/^\[(.*?)\]\s*(.*)$/);
            if (flairMatch) {
                tag = flairMatch[1].toUpperCase();
                displayName = flairMatch[2] || 'ANONYMOUS';
            }

            let isPanic = false;
            let chore = (t.text || '').trim();
            if (chore.startsWith('[PANIC] ')) {
                isPanic = true;
                chore = chore.replace('[PANIC] ', '');
                if (!flairMatch) tag = "PANIC";
            }

            chore = censorNsfwText(chore.replace(/[\r\n]+/g, ' '));
            const shortChore = chore.length > 60 ? chore.substring(0, 58) + '...' : chore;

            return {
                tag: tag,
                isPanic: isPanic,
                text: `${displayName.toUpperCase()}${country}: "${shortChore.toUpperCase()}"`
            };
        });

        // Ensure track has enough items to fill wide desktop screens before repeating
        let fullList = [...liveItems];
        while (fullList.length < 8 && fullList.length > 0) {
            fullList = fullList.concat(liveItems);
        }

        const html = fullList.map(item => `
            <div class="ticker-item">
                <span class="ticker-tag">[${escapeHtml(item.tag)}]</span>
                <span class="ticker-text">${escapeHtml(item.text)}</span>
                <span class="ticker-bullet">•</span>
            </div>
        `).join('');

        // Duplicate the string for seamless 0% -> -50% continuous marquee loop
        tickerTrack.innerHTML = html + html;
    };

    // Initial placeholder until dispatches load
    renderTicker([]);

    // Check if the user has set the secret developer flag
    const isDeveloper = localStorage.getItem('is_nirjhor') === 'true';

    // Use localStorage so the visitor is tracked forever, not just for one tab session
    let sessionId = localStorage.getItem('later_gator_visitor');
    if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('later_gator_visitor', sessionId);
    }

    // Lightweight non-blocking presence heartbeat (runs in background, never delays stats)
    const sendHeartbeat = () => {
        if (isDeveloper) return;
        try {
            const payload = JSON.stringify({ sessionId });
            if (navigator.sendBeacon) {
                navigator.sendBeacon('/api/stats', payload);
            } else {
                fetch('/api/stats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload,
                    keepalive: true
                }).catch(() => {});
            }
        } catch (e) {}
    };

    // Blazing fast edge-cached stats fetch (no user query params = 99% Edge Cache HIT)
    const fetchStats = async () => {
        try {
            const response = await fetch('/api/stats');
            if (response.ok) {
                const stats = await response.json();
                if (statCurrent && stats.currentlyProcrastinating != null) {
                    updateStat('stat-current', stats.currentlyProcrastinating.toLocaleString());
                }
                if (statTotal && stats.totalPostponed != null) {
                    updateStat('stat-total', stats.totalPostponed.toLocaleString());
                }
                if (statVisitors && stats.totalVisitors != null) {
                    updateStat('stat-visitors', stats.totalVisitors.toString().padStart(4, '0'));
                }
                try {
                    localStorage.setItem('lg_cached_stats', JSON.stringify(stats));
                } catch (e) {}
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
                if (data && data.count > 0 && typeof data.text === 'string' && data.text.trim()) {
                    let taskName = data.text;
                    if (taskName.startsWith('[PANIC] ')) taskName = taskName.replace('[PANIC] ', '');
                    
                    shameContainer.style.display = 'block';
                    shameTask.innerHTML = `"${censorNsfwHtml(escapeHtml(taskName))}"`;
                    shameCount.textContent = data.count;
                    try {
                        localStorage.setItem('lg_cached_weekly', JSON.stringify(data));
                    } catch (e) {}
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
                        const cName = typeof c === 'string' ? c : (c && c.country ? c.country : 'PARTS UNKNOWN');
                        const cCount = typeof c === 'object' && c && c.count != null ? c.count : '';
                        return `
                        <div class="leaderboard-row">
                            <span class="leaderboard-rank">${rank}.</span>
                            <span class="leaderboard-country" title="${escapeHtml(cName)}">${escapeHtml(cName)}</span>
                            <span class="leaderboard-dots"></span>
                            <span class="leaderboard-count">${cCount}</span>
                        </div>
                        `;
                    }).join('');
                    try {
                        localStorage.setItem('lg_cached_countries', JSON.stringify(countries));
                    } catch (e) {}
                }
            }
        } catch (error) {
            console.error('Failed to fetch country leaderboard:', error);
        }
    };

    const fetchAll = () => {
        sendHeartbeat();
        fetchTasks();
        fetchStats();
        fetchWeeklyStats();
        fetchCountries();
    };

    const FUNNY_CENSOR_MESSAGES = GatorEvasion.FUNNY_CENSOR_MESSAGES || [];
    const containsInappropriate = (str) => GatorEvasion.containsInappropriate ? GatorEvasion.containsInappropriate(str) : false;
    const isGibberish = (text) => GatorEvasion.isGibberish ? GatorEvasion.isGibberish(text) : false;

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
        } else if (postponementsCount >= 10 || getSlackerScore() >= 50) {
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
        let name = userNameInput ? userNameInput.value.trim() : (document.getElementById('user-name') ? document.getElementById('user-name').value.trim() : '');

        // Smart Correction 1: If user typed their task into the byline field and left task blank
        if (!text && name) {
            text = name;
            taskInput.value = text;
            name = '';
            if (userNameInput) userNameInput.value = '';
            const uEl = document.getElementById('user-name');
            if (uEl) uEl.value = '';
        }

        // Smart Correction 2: If byline is a known common task and text looks like an author name
        if (name && COMMON_TASK_KEYWORDS.includes(name.toLowerCase().trim())) {
            if (!text) {
                text = name;
                name = '';
                taskInput.value = text;
                if (userNameInput) userNameInput.value = '';
                const uEl = document.getElementById('user-name');
                if (uEl) uEl.value = '';
            } else if (text.length <= 25 && !COMMON_TASK_KEYWORDS.includes(text.toLowerCase().trim())) {
                // Invert: task was put in name field, and author name was put in task field
                const temp = text;
                text = name;
                name = temp;
                taskInput.value = text;
                if (userNameInput) userNameInput.value = name;
                const uEl = document.getElementById('user-name');
                if (uEl) uEl.value = name;
            }
        }

        if (name) {
            try { localStorage.setItem('lg_user_name', name); } catch(e) {}
        }
        
        if (!text) {
            statusMessage.textContent = "PLEASE SPECIFY A TASK TO DELAY.";
            taskInput.focus();
            return;
        }

        // Friendly Inappropriate Language / Explicit Sex Content Check
        if (containsInappropriate(text) || containsInappropriate(name)) {
            const funny = FUNNY_CENSOR_MESSAGES[Math.floor(Math.random() * FUNNY_CENSOR_MESSAGES.length)];
            statusMessage.textContent = funny;
            taskInput.classList.remove('input-shake');
            void taskInput.offsetWidth;
            taskInput.classList.add('input-shake');
            setTimeout(() => { statusMessage.textContent = ""; }, 5000);
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
        activeBtn.disabled = true;

        if (isPanic) {
            text = `[PANIC] ${text}`;
        }

        // Attach verified Gator Tag to author name if authenticated
        let submittedAuthorName = name;
        if (currentGator && (currentGator.displayTag || currentGator.tag)) {
            const myTag = `@${currentGator.displayTag || currentGator.tag}`;
            if (!submittedAuthorName || submittedAuthorName.trim() === '' || submittedAuthorName.trim().toLowerCase() === 'anonymous') {
                submittedAuthorName = myTag;
            } else if (!submittedAuthorName.startsWith('@')) {
                submittedAuthorName = `${myTag} (${submittedAuthorName})`;
            }
        }

        // Increment and persist postponements tally on every submission
        postponementsCount++;
        clickerCount = postponementsCount;
        try { localStorage.setItem('lg_postponements_count', postponementsCount.toString()); } catch (e) {}

        currentRawTask = submittedText;
        currentIsPanic = isPanic;
        currentSubmittedName = submittedAuthorName;

        const optId = 'opt-' + Date.now();
        const optimisticTask = {
            id: optId,
            text: text,
            city: submittedAuthorName || 'Anonymous',
            country: (currentGator && (currentGator.displayTag || currentGator.tag)) ? 'Bureau Operative' : 'Local Dispatch',
            created_at: new Date().toISOString(),
            same_count: 0,
            valid_count: 0,
            rip_count: 0
        };

        // 1. INSTANTLY prepend to the live wire feed (0ms latency!)
        const optEl = prependFeedTask(optimisticTask);

        // 2. INSTANT STAMP SLAM & DESK SHOCKWAVE (Zero latency!)
        triggerRubberStamp(isPanic);

        if (isPanic) {
            if (panicBtnText) panicBtnText.textContent = "FINE. DOING IT.";
            else panicBtn.textContent = "FINE. DOING IT.";
            statusMessage.textContent = "FINE. WE BELIEVE IN YOU. PROBABLY.";
        } else {
            if (laterBtnText) laterBtnText.textContent = "POSTED TO THE WIRE ✓";
            else laterBtn.textContent = "POSTED TO THE WIRE ✓";
            statusMessage.textContent = "SUCCESSFULLY POSTED TO THE WIRE.";
        }

        // Auto-archive welcome memo on first dispatch
        if (typeof window.__lgDismissMemo === 'function') window.__lgDismissMemo();

        // 3. Dispatch network request in parallel
        const postPayload = { text, name: submittedAuthorName, sessionId: SESSION_ID };
        if (currentGator && currentGator.gatorId) {
            postPayload.gatorId = currentGator.gatorId;
        }
        const postPromise = fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Gator-Token': 'chomp-chomp'
            },
            body: JSON.stringify(postPayload)
        }).catch(err => ({ ok: false, error: err }));

        // 4. Hold stamp proudly on screen for ~1100ms, then smoothly dissolve
        setTimeout(async () => {
            dismissRubberStamp(() => {
                taskInput.value = '';
                updateCharCount();
                activeBtn.disabled = false;
                statusMessage.textContent = "";

                // Reset button text
                if (laterBtnText) laterBtnText.textContent = "POST TO THE WIRE ➔";
                if (panicBtnText) panicBtnText.textContent = "⚡ DO IT NOW (PANIC MODE)";
                rollEvasionPhrase(false);

                // Reveal official share slip & certificate
                showShareSlip(submittedText, isPanic);
            });

            try {
                const response = await postPromise;
                if (response && response.ok) {
                    const newTask = await response.json().catch(() => null);
                    if (newTask && newTask.id) {
                        allKnownTasks.delete(optId);
                        allKnownTasks.set(Number(newTask.id), newTask);
                        const numId = Number(newTask.id);
                        if (!myTaskIds.includes(numId)) {
                            myTaskIds.push(numId);
                            window.myTaskIds = myTaskIds;
                            try { localStorage.setItem('lg_my_task_ids', JSON.stringify(myTaskIds)); } catch (e) {}
                        }
                        if (optEl && optEl.parentNode) {
                            optEl.setAttribute('data-task-id', newTask.id);
                            const clipBtn = optEl.querySelector('.feed-clip-btn');
                            if (clipBtn) clipBtn.setAttribute('data-task-id', newTask.id);
                            const rxContainer = optEl.querySelector('.feed-reactions');
                            if (rxContainer) rxContainer.setAttribute('data-task-id', newTask.id);
                            const feedShredBtn = optEl.querySelector('.feed-shred-btn');
                            if (feedShredBtn) feedShredBtn.setAttribute('data-task-id', newTask.id);
                        }
                        optToRealIdMap.set(optId, newTask.id);
                        optToRealIdMap.set(String(optId), newTask.id);
                        renderedTopId = Math.max(renderedTopId || 0, Number(newTask.id));
                    }
                    fetchTasks(true);
                    fetchStats();
                    if (typeof fetchDossier === 'function') fetchDossier();
                } else if (response && response.json) {
                    const errData = await response.json().catch(() => ({}));
                    if (errData.error) {
                        if (optEl && optEl.parentNode) optEl.remove();
                        allKnownTasks.delete(optId);
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
    const getShareUrl = () => window.location.origin && window.location.origin !== 'null' ? window.location.origin : 'https://latergators.live';

    const generateCertificateImage = (taskText, isPanicMode, holderName) => {
        const curDisp = (window.postponementsCount !== undefined) ? window.postponementsCount : postponementsCount;
        const curSymp = (window.totalSympathyCount !== undefined) ? window.totalSympathyCount : totalSympathyCount;
        const curTime = (window.timeStolenSeconds !== undefined) ? window.timeStolenSeconds : timeStolenSeconds;
        return GatorCanvas.generateCertificateImage
            ? GatorCanvas.generateCertificateImage(taskText, isPanicMode, holderName, {
                postponementsCount: curDisp,
                totalSympathyCount: curSymp,
                sympathyCount: curSymp,
                timeStolenSeconds: curTime
            })
            : document.createElement('canvas');
    };
    window.generateCertificateImage = generateCertificateImage;

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
        currentShareText = `I ${actionVerb} "${plainCensored}" on @thelatergators (https://latergators.live) alongside the rest of the world. ${punchline}`;
        
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
                if (currentRawTask && navigator.canShare) {
                    const canvas = generateCertificateImage(currentRawTask, currentIsPanic, currentSubmittedName);
                    canvas.toBlob(async (blob) => {
                        if (blob) {
                            const file = new File([blob], 'postponement-certificate.png', { type: 'image/png' });
                            if (navigator.canShare({ files: [file] })) {
                                await navigator.share({
                                    title: 'LATER, GATORS — Official Postponement Notice',
                                    text: currentShareText,
                                    files: [file]
                                });
                                return;
                            }
                        }
                        await navigator.share({
                            title: 'LATER, GATORS — Official Postponement Notice',
                            text: currentShareText,
                            url: getShareUrl()
                        });
                    });
                } else {
                    await navigator.share({
                        title: 'LATER, GATORS — Official Postponement Notice',
                        text: currentShareText,
                        url: getShareUrl()
                    });
                }
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
            if (window.innerWidth <= 768 && typeof window.setMobileTab === 'function') {
                window.setMobileTab('wire');
            }
        });
    }

    if (shareXBtn) {
        shareXBtn.addEventListener('click', () => {
            if (currentRawTask) {
                const canvas = generateCertificateImage(currentRawTask, currentIsPanic, currentSubmittedName);
                const link = document.createElement('a');
                link.download = `official-postponement-certificate-${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
            const tweetText = `${currentShareText}\n\nOfficially sealed on @thelatergators:`;
            const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(getShareUrl())}`;
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

    // ──────────────────────────────────────────────────────────────────
    // BUREAU CONFIDENTIAL GUILT DISPOSAL UNIT (SHREDDER & BLAST FURNACE)
    // ──────────────────────────────────────────────────────────────────
    const disposalModal = document.getElementById('disposal-modal');
    const disposalBackdrop = document.getElementById('disposal-backdrop');
    const disposalCloseBtn = document.getElementById('disposal-close-btn');
    const modeShredderBtn = document.getElementById('mode-shredder-btn');
    const modeFurnaceBtn = document.getElementById('mode-furnace-btn');
    const disposalChamber = document.getElementById('disposal-chamber');
    const disposalMemoSheet = document.getElementById('disposal-memo-sheet');
    const disposalTaskText = document.getElementById('disposal-task-text');
    const disposalTaskMeta = document.getElementById('disposal-task-meta');
    const shredderStripsContainer = document.getElementById('shredder-strips-container');
    const shredderMouth = document.getElementById('shredder-mouth');
    const furnaceStage = document.getElementById('furnace-stage');
    const furnaceDoorLeft = document.getElementById('furnace-door-left');
    const furnaceDoorRight = document.getElementById('furnace-door-right');
    const furnaceFireBack = document.getElementById('furnace-fire-back');
    const furnaceFireMid = document.getElementById('furnace-fire-mid');
    const furnaceFireFront = document.getElementById('furnace-fire-front');
    const furnaceEmbers = document.getElementById('furnace-embers');
    const furnaceHeatFlash = document.getElementById('furnace-heat-flash');
    const disposalAbsolutionCard = document.getElementById('disposal-absolution-card');
    const absolutionMsg = document.getElementById('absolution-msg');
    const absolutionHeadline = document.getElementById('absolution-headline');
    const absolutionCode = document.getElementById('absolution-code');
    const shredTallyNumber = document.getElementById('shred-tally-number');
    const absolutionDismissBtn = document.getElementById('absolution-dismiss-btn');
    const disposalControls = document.getElementById('disposal-controls');
    const disposalCrankBtn = document.getElementById('disposal-crank-btn');
    const crankBtnIcon = document.getElementById('crank-btn-icon');
    const crankBtnText = document.getElementById('crank-btn-text');

    let currentDisposalItem = { text: '', taskId: null, source: 'wire' };
    let disposalMode = 'shredder';
    try {
        const savedMode = localStorage.getItem('lg_disposal_mode');
        if (savedMode === 'furnace' || savedMode === 'shredder') disposalMode = savedMode;
    } catch (e) {}

    let shredTally = 0;
    try {
        shredTally = parseInt(localStorage.getItem('lg_guilt_shredded_count') || '0', 10);
    } catch (e) {}

    const updateDisposalMode = (mode) => {
        disposalMode = mode;
        try { localStorage.setItem('lg_disposal_mode', mode); } catch (e) {}

        if (mode === 'shredder') {
            if (modeShredderBtn) modeShredderBtn.classList.add('active');
            if (modeFurnaceBtn) modeFurnaceBtn.classList.remove('active');
            if (disposalChamber) disposalChamber.classList.remove('mode-furnace');
            if (shredderMouth) shredderMouth.style.display = 'flex';
            if (furnaceStage) furnaceStage.style.display = 'none';
            if (crankBtnIcon) crankBtnIcon.textContent = '⚙️';
            if (crankBtnText) crankBtnText.textContent = 'CRANK MECHANICAL SHREDDER';
        } else {
            if (modeFurnaceBtn) modeFurnaceBtn.classList.add('active');
            if (modeShredderBtn) modeShredderBtn.classList.remove('active');
            if (disposalChamber) disposalChamber.classList.add('mode-furnace');
            if (shredderMouth) shredderMouth.style.display = 'none';
            if (furnaceStage) furnaceStage.style.display = 'block';
            if (crankBtnIcon) crankBtnIcon.textContent = '🔥';
            if (crankBtnText) crankBtnText.textContent = 'IGNITE BLAST FURNACE (1400°F)';
        }
    };

    const resetDisposalChamber = () => {
        if (disposalMemoSheet) {
            disposalMemoSheet.classList.remove('feeding-down', 'incinerating');
            disposalMemoSheet.style.display = 'block';
        }
        if (disposalChamber) {
            disposalChamber.classList.remove('rumbling', 'chattering');
        }
        if (shredderMouth) {
            shredderMouth.classList.remove('spinning');
        }
        if (shredderStripsContainer) {
            shredderStripsContainer.innerHTML = '';
            shredderStripsContainer.style.display = 'none';
        }
        if (furnaceDoorLeft) furnaceDoorLeft.classList.remove('door-slam');
        if (furnaceDoorRight) furnaceDoorRight.classList.remove('door-slam');
        if (furnaceFireBack) furnaceFireBack.classList.remove('blazing');
        if (furnaceFireMid) furnaceFireMid.classList.remove('blazing');
        if (furnaceFireFront) furnaceFireFront.classList.remove('blazing');
        if (furnaceEmbers) furnaceEmbers.innerHTML = '';
        if (furnaceHeatFlash) furnaceHeatFlash.classList.remove('flash');

        if (disposalChamber) disposalChamber.style.display = 'flex';
        if (disposalControls) disposalControls.style.display = 'block';
        if (disposalAbsolutionCard) disposalAbsolutionCard.style.display = 'none';
        if (disposalCrankBtn) {
            disposalCrankBtn.disabled = false;
        }
    };

    const openDisposalUnit = ({ text, taskId = null, source = 'wire' }) => {
        if (!disposalModal || !taskId) return;

        let cleanText = (text || '').trim();
        if (!cleanText) {
            const fallbacks = [
                "FOLDING THE MOUNTAIN OF LAUNDRY",
                "REPLYING TO THAT 3-WEEK-OLD EMAIL",
                "DOING TAXES & PAPERWORK",
                "DECIDING WHAT TO DO WITH MY LIFE",
                "ORGANIZING THE DESK INSTEAD OF WORKING",
                "CHECKING SOCIAL MEDIA FOR THE 40TH TIME TODAY"
            ];
            cleanText = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }

        currentDisposalItem = { text: cleanText, taskId, source: 'wire' };

        if (disposalTaskText) disposalTaskText.textContent = `"${cleanText.toUpperCase()}"`;
        if (disposalTaskMeta) {
            disposalTaskMeta.textContent = `Live Wire Dispatch (ID #${taskId}) • Action: Obliterate & Expunge • Archive: Struck`;
        }

        if (shredTallyNumber) shredTallyNumber.textContent = String(shredTally);

        resetDisposalChamber();
        updateDisposalMode(disposalMode);

        disposalModal.style.display = 'flex';
    };

    const closeDisposalUnit = () => {
        if (disposalModal) disposalModal.style.display = 'none';
        resetDisposalChamber();
    };

    const executeDestruction = () => {
        if (!disposalCrankBtn || disposalCrankBtn.disabled) return;
        disposalCrankBtn.disabled = true;

        const isFurnace = disposalMode === 'furnace';

        if (isFurnace) {
            if (window.GatorAudio && typeof window.GatorAudio.playFurnaceSound === 'function') {
                window.GatorAudio.playFurnaceSound(2.6);
            }

            // 1. Initial heat flash burst
            if (furnaceHeatFlash) {
                furnaceHeatFlash.classList.remove('flash');
                void furnaceHeatFlash.offsetWidth;
                furnaceHeatFlash.classList.add('flash');
            }

            // 2. Heavy industrial chamber vibration
            if (disposalChamber) {
                disposalChamber.classList.add('rumbling');
            }

            // 3. Ignite roaring fire flame layers
            if (furnaceFireBack) furnaceFireBack.classList.add('blazing');
            if (furnaceFireMid) furnaceFireMid.classList.add('blazing');
            if (furnaceFireFront) furnaceFireFront.classList.add('blazing');

            // 4. Hyper-realistic progressive paper incinerate
            if (disposalMemoSheet) {
                disposalMemoSheet.classList.add('incinerating');
            }

            // 5. Generate dynamic floating embers, sparks, and ash particles
            if (furnaceEmbers) {
                furnaceEmbers.innerHTML = '';
                const particleCount = 38;
                for (let i = 0; i < particleCount; i++) {
                    const particle = document.createElement('div');
                    const rand = Math.random();
                    const type = rand < 0.45 ? 'spark' : (rand < 0.8 ? 'ember' : 'ash');
                    const size = type === 'spark' ? (2.5 + Math.random() * 3) : (type === 'ember' ? (4 + Math.random() * 4) : (5 + Math.random() * 5));
                    const left = 8 + Math.random() * 84;
                    const bottom = 12 + Math.random() * 45;
                    const driftX = (Math.random() * 80 - 40).toFixed(0);
                    const duration = (0.7 + Math.random() * 0.9).toFixed(2);
                    const delay = (0.05 + Math.random() * 1.0).toFixed(2);

                    particle.className = `furnace-ember ${type}`;
                    particle.style.width = `${size.toFixed(1)}px`;
                    particle.style.height = `${size.toFixed(1)}px`;
                    particle.style.left = `${left.toFixed(1)}%`;
                    particle.style.bottom = `${bottom.toFixed(1)}px`;
                    particle.style.setProperty('--drift-x', `${driftX}px`);
                    particle.style.animationDuration = `${duration}s`;
                    particle.style.animationDelay = `${delay}s`;

                    furnaceEmbers.appendChild(particle);
                }
            }

            // 6. Heavy Iron blast doors slam shut at ~1.9s
            setTimeout(() => {
                if (furnaceDoorLeft) furnaceDoorLeft.classList.add('door-slam');
                if (furnaceDoorRight) furnaceDoorRight.classList.add('door-slam');
                if (furnaceHeatFlash) {
                    furnaceHeatFlash.classList.remove('flash');
                    void furnaceHeatFlash.offsetWidth;
                    furnaceHeatFlash.classList.add('flash');
                }
            }, 1900);

        } else {
            if (window.GatorAudio && typeof window.GatorAudio.playShredderSound === 'function') {
                window.GatorAudio.playShredderSound(2.4);
            }

            if (disposalChamber) {
                disposalChamber.classList.add('chattering');
            }
            if (shredderMouth) {
                shredderMouth.classList.add('spinning');
            }

            if (shredderStripsContainer) {
                shredderStripsContainer.innerHTML = '';
                shredderStripsContainer.style.display = 'block';
                for (let i = 0; i < 14; i++) {
                    const strip = document.createElement('div');
                    strip.className = 'shred-strip slicing';
                    strip.style.left = `${(i * 7)}%`;
                    strip.style.setProperty('--strip-rot', `${(Math.random() * 12 - 6).toFixed(1)}deg`);
                    strip.style.animationDelay = `${(0.12 + i * 0.04).toFixed(2)}s`;

                    const lines = document.createElement('span');
                    lines.className = 'strip-text-lines';
                    strip.appendChild(lines);

                    shredderStripsContainer.appendChild(strip);
                }
            }
            if (disposalMemoSheet) disposalMemoSheet.classList.add('feeding-down');
        }

        setTimeout(async () => {
            let targetId = currentDisposalItem.taskId;
            if (targetId && String(targetId).startsWith('opt-') && optToRealIdMap.has(String(targetId))) {
                targetId = optToRealIdMap.get(String(targetId));
            }

            if (targetId) {
                // 1. Instantly animate and remove from wire feed in DOM
                if (feedContainer) {
                    const feedItems = feedContainer.querySelectorAll(`.feed-item[data-task-id="${targetId}"], .feed-item[data-task-id="${currentDisposalItem.taskId}"]`);
                    feedItems.forEach(item => {
                        item.classList.add('shredding-out');
                        setTimeout(() => { if (item.parentNode) item.remove(); }, 620);
                    });
                }

                // 2. Clear from in-memory records and local storage tracking
                allKnownTasks.delete(Number(targetId));
                allKnownTasks.delete(String(targetId));
                if (currentDisposalItem.taskId) {
                    allKnownTasks.delete(Number(currentDisposalItem.taskId));
                    allKnownTasks.delete(String(currentDisposalItem.taskId));
                }

                myTaskIds = myTaskIds.filter(id => String(id) !== String(targetId) && String(id) !== String(currentDisposalItem.taskId));
                window.myTaskIds = myTaskIds;
                try { localStorage.setItem('lg_my_task_ids', JSON.stringify(myTaskIds)); } catch (e) {}

                // Purge from cached tasks in localStorage
                try {
                    const rawCache = localStorage.getItem('lg_cached_tasks');
                    if (rawCache) {
                        const cached = JSON.parse(rawCache);
                        if (Array.isArray(cached)) {
                            const updated = cached.filter(t => 
                                String(t.id) !== String(targetId) && String(t.id) !== String(currentDisposalItem.taskId)
                            );
                            localStorage.setItem('lg_cached_tasks', JSON.stringify(updated));
                        }
                    }
                } catch (e) {}

                // 3. Remove from dossier if operative dossier open
                if (dossierListEl) {
                    const dossierItems = dossierListEl.querySelectorAll(`.dossier-item[data-task-id="${targetId}"], .dossier-item[data-task-id="${currentDisposalItem.taskId}"]`);
                    dossierItems.forEach(d => d.remove());
                }

                // 4. Send DELETE to backend database and AWAIT
                try {
                    const delRes = await fetch(`/api/tasks?id=${encodeURIComponent(targetId)}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Gator-Token': 'chomp-chomp'
                        },
                        body: JSON.stringify({ id: targetId })
                    });
                    if (!delRes.ok) {
                        const err = await delRes.text().catch(() => '');
                        console.error('Failed to expunge task on server:', delRes.status, err);
                    } else {
                        console.log('Task successfully shredded from database archives:', targetId);
                    }
                } catch (netErr) {
                    console.error('Network error during task shredding:', netErr);
                }

                fetchStats();
                if (typeof window.fetchDossier === 'function') window.fetchDossier();
                fetchTasks(true);
            }

            shredTally++;
            try { localStorage.setItem('lg_guilt_shredded_count', String(shredTally)); } catch (e) {}
            if (shredTallyNumber) shredTallyNumber.textContent = String(shredTally);

            if (disposalChamber) disposalChamber.style.display = 'none';
            if (disposalControls) disposalControls.style.display = 'none';

            if (absolutionMsg) {
                absolutionMsg.textContent = isFurnace
                    ? "Your avoided task was incinerated at 1,400°F and permanently expunged from the wire archives. No trace remains in the bureau."
                    : "Your avoided task was sliced into 14 confetti strips and permanently expunged from the wire archives. No trace remains in the bureau.";
            }

            if (absolutionHeadline) {
                absolutionHeadline.textContent = "EXPUNGED FROM THE WIRE";
            }
            if (absolutionCode) {
                absolutionCode.textContent = `PERMIT #${Math.floor(1000 + Math.random() * 9000)}-ABSOLVED`;
            }

            if (disposalAbsolutionCard) disposalAbsolutionCard.style.display = 'block';
            if (window.GatorAudio && typeof window.GatorAudio.playStampSlamSound === 'function') {
                window.GatorAudio.playStampSlamSound();
            }
        }, 2550);
    };

    function handleFeedShredClick(feedShredBtn) {
        let taskId = feedShredBtn.getAttribute('data-task-id');
        if (!taskId) return;
        if (taskId.startsWith('opt-') && optToRealIdMap.has(taskId)) {
            taskId = optToRealIdMap.get(taskId);
        }
        const feedItem = feedShredBtn.closest('.feed-item');
        let taskText = '';
        if (feedItem) {
            const textEl = feedItem.querySelector('.feed-item-text');
            if (textEl) taskText = textEl.textContent.trim();
        }
        if (!taskText && allKnownTasks.has(Number(taskId))) {
            const known = allKnownTasks.get(Number(taskId));
            taskText = (known.text || '').replace('[PANIC] ', '').trim();
        }
        openDisposalUnit({
            text: taskText || 'AVOIDED DISPATCH',
            taskId: taskId,
            source: 'wire'
        });
    }

    if (modeShredderBtn) modeShredderBtn.addEventListener('click', () => updateDisposalMode('shredder'));
    if (modeFurnaceBtn) modeFurnaceBtn.addEventListener('click', () => updateDisposalMode('furnace'));
    if (disposalCrankBtn) disposalCrankBtn.addEventListener('click', executeDestruction);
    if (disposalCloseBtn) disposalCloseBtn.addEventListener('click', closeDisposalUnit);
    if (disposalBackdrop) disposalBackdrop.addEventListener('click', closeDisposalUnit);
    if (absolutionDismissBtn) absolutionDismissBtn.addEventListener('click', closeDisposalUnit);

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

    // Global keyboard shortcuts (Esc to dismiss open dialogs, R to roll fresh evasion phrase)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const credModal = document.getElementById('credential-modal');
            if (credModal && credModal.style.display !== 'none') {
                credModal.style.display = 'none';
            }
            if (shareCard && shareCard.style.display !== 'none') {
                shareCard.style.display = 'none';
                if (window.innerWidth <= 768 && typeof window.setMobileTab === 'function') {
                    window.setMobileTab('wire');
                }
            }
            if (disposalModal && disposalModal.style.display !== 'none') {
                closeDisposalUnit();
            }
        } else if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (activeTag !== 'input' && activeTag !== 'textarea') {
                e.preventDefault();
                rollEvasionPhrase(true);
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

    const censorNsfwHtml = (str) => GatorEvasion.censorNsfwHtml ? GatorEvasion.censorNsfwHtml(str) : str;
    const censorNsfwText = (str) => GatorEvasion.censorNsfwText ? GatorEvasion.censorNsfwText(str) : str;

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
            const rawQuote = footerQuotes[Math.floor(Math.random() * footerQuotes.length)];
            // Replace hyphens inside words with non-breaking hyphens (\u2011) so words like "to-do" or "to-ignore" never break across lines
            const formatted = rawQuote.replace(/(\w)-(\w)/g, '$1\u2011$2');
            quoteElement.textContent = `"${formatted}"`;
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
                title: 'LATER, GATORS — Global Procrastination Journal',
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
                    const originalHTML = footerShareBtn.innerHTML;
                    footerShareBtn.innerHTML = '<span class="footer-share-copied">[&nbsp;LINK COPIED — GO DISTRACT THEM!&nbsp;]</span>';
                    setTimeout(() => {
                        footerShareBtn.innerHTML = originalHTML;
                    }, 2500);
                } catch (err) {
                    prompt('Copy this link to distract your friends:', shareUrl);
                }
            }
        });
    }

    // Telegraph Dispatch Desk (Viral Distribution)
    const dispatchXBtn = document.getElementById('dispatch-x-btn');
    const dispatchFbBtn = document.getElementById('dispatch-fb-btn');
    const dispatchIgBtn = document.getElementById('dispatch-ig-btn');

    if (dispatchXBtn) {
        dispatchXBtn.addEventListener('click', () => {
            const tweet = `Solitary procrastination is a misdemeanor. Collective procrastination is an executive movement. What are you putting off today? @thelatergators`;
            const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(getShareUrl())}`;
            window.open(url, '_blank', 'noopener,noreferrer');
        });
    }

    if (dispatchFbBtn) {
        dispatchFbBtn.addEventListener('click', () => {
            const shareUrl = getShareUrl();
            const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
            window.open(url, '_blank', 'noopener,noreferrer');
        });
    }

    if (dispatchIgBtn) {
        let igResetTimer = null;
        const origIgHtml = dispatchIgBtn.innerHTML;
        dispatchIgBtn.addEventListener('click', async () => {
            const shareUrl = getShareUrl();
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'LATER, GATORS — Bureau of Strategic Inaction',
                        text: 'Solitary procrastination is a misdemeanor. Collective procrastination is an executive movement.',
                        url: shareUrl
                    });
                    return;
                } catch (err) {
                    // User dismissed native share sheet or unhandled error; fall through to link copy
                }
            }

            const copySuccess = () => {
                if (igResetTimer) clearTimeout(igResetTimer);
                const label = dispatchIgBtn.querySelector('.dispatch-btn-label');
                if (label) {
                    label.textContent = 'LINK COPIED! PASTE IN IG STORY';
                } else {
                    dispatchIgBtn.textContent = '✓ LINK COPIED! PASTE IN IG STORY';
                }
                igResetTimer = setTimeout(() => {
                    dispatchIgBtn.innerHTML = origIgHtml;
                    igResetTimer = null;
                }, 2500);
            };

            try {
                await navigator.clipboard.writeText(shareUrl);
                copySuccess();
            } catch (err) {
                try {
                    const ta = document.createElement('textarea');
                    ta.value = shareUrl;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    copySuccess();
                } catch (e) {
                    const label = dispatchIgBtn.querySelector('.dispatch-btn-label');
                    if (label) {
                        label.textContent = 'LINK: ' + shareUrl;
                    } else {
                        dispatchIgBtn.textContent = '✓ LINK: ' + shareUrl;
                    }
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
                updateTaskReactiveButtons(taskInput.value);
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
                updateTaskReactiveButtons(taskInput.value);
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
        alibis: document.getElementById('tab-alibis'),
        oracle: document.getElementById('tab-oracle'),
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

    // --- Option 2: The Do-Nothing Clicker (Supercharged) ---
    const clickerBtn = document.getElementById('clicker-btn');
    const clickerCountEl = document.getElementById('clicker-count');
    const clickerTimeEl = document.getElementById('clicker-time');
    const clickerRankEl = document.getElementById('clicker-rank');
    const clickerQuoteEl = document.getElementById('clicker-quote');
    const clickerResetBtn = document.getElementById('clicker-reset-btn');
    const clickerParticlesEl = document.getElementById('clicker-particles');
    const defconStatusEl = document.getElementById('defcon-status');
    const defconFillEl = document.getElementById('defcon-meter-fill');

    const CLICK_PARTICLES = [
        "+1 MINUTE DODGED",
        "TAXES DELAYED",
        "NAP DECLARED",
        "SLACK MUTED",
        "EXCEL CLOSED",
        "BOSS CONFUSED",
        "WILLPOWER: 0%",
        "MEETING SKIPPED",
        "STILL SNOOZING",
        "FUTURE ME'S PROBLEM",
        "DIPLOMATIC IMMUNITY",
        "INERTIA ACHIEVED"
    ];

    const spawnClickerParticle = () => {
        if (!clickerParticlesEl) return;
        const particle = document.createElement('div');
        particle.className = 'clicker-particle';
        const text = CLICK_PARTICLES[Math.floor(Math.random() * CLICK_PARTICLES.length)];
        particle.textContent = text;
        const xOffset = (Math.random() * 80 - 40);
        particle.style.setProperty('--x-offset', `${xOffset}px`);
        particle.style.left = `${Math.max(10, Math.min(75, 40 + xOffset))}%`;
        particle.style.top = '10px';
        clickerParticlesEl.appendChild(particle);
        setTimeout(() => { particle.remove(); }, 900);
    };

    const updateDefconMeter = (count) => {
        if (!defconStatusEl || !defconFillEl) return;
        let title = "DEFCON 5 (MILD DELAY)";
        let pct = Math.min(100, Math.max(8, (count / 100) * 100));

        if (count >= 100) {
            title = "DEFCON 1 (TOTAL INERTIA)";
        } else if (count >= 50) {
            title = "DEFCON 2 (MASTER OF DELAY)";
        } else if (count >= 25) {
            title = "DEFCON 3 (CHRONIC IDLE)";
        } else if (count >= 10) {
            title = "DEFCON 4 (CALCULATED NAP)";
        }

        defconStatusEl.textContent = title;
        defconFillEl.style.width = `${pct}%`;
    };

    const CLICKER_QUOTES = [
        "\"Every click is another responsibility successfully dodged.\"",
        "\"Your to-do list is trembling in existential fear.\"",
        "\"Productivity has officially left the premises.\"",
        "\"They can't ask you to work if you are busy clicking this.\"",
        "\"Look at that momentum. Absolutely zero progress made.\"",
        "\"A masterclass in strategic unproductivity.\"",
        "\"Your boss is probably crying somewhere.\"",
        "\"Tomorrow is looking very busy at this rate.\"",
        "\"Sloth is not a bug; it is an executive lifestyle choice.\"",
        "\"Somewhere, a deadline just missed you.\"",
        "\"You are doing the Lord's work (nothing).\"",
        "\"The hardest part of doing nothing is knowing when you are done.\"",
        "\"Congratulations, you have achieved Olympic-grade avoidance.\""
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

    let prevRank = getClickerRank(clickerCount);

    const playClickerSound = () => {
        if (GatorAudio.playClickerSound) GatorAudio.playClickerSound(clickerCount);
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
                if (!taskInput || taskInput.value.trim() === '') {
                    rollEvasionPhrase(false);
                }
            }
        }

        if (clickerQuoteEl) {
            const qIdx = Math.floor(clickerCount / 4) % CLICKER_QUOTES.length;
            clickerQuoteEl.textContent = CLICKER_QUOTES[qIdx];
        }

        updateDefconMeter(clickerCount);
        checkUnlockables();
    };

    // --- Progressive Unlockables & Slacker Perks ---
    const claimPassBtn = document.getElementById('claim-pass-btn');
    const sepiaToggleBtn = document.getElementById('sepia-toggle-btn');
    const camoSection = document.getElementById('camo-section');
    const camoTypingBtn = document.getElementById('camo-typing-btn');
    const camoSighBtn = document.getElementById('camo-sigh-btn');
    const camoPaperBtn = document.getElementById('camo-paper-btn');
    const camoStopBtn = document.getElementById('camo-stop-btn');
    const secretColumn = document.getElementById('secret-column');

    let closeCredentialModal = () => {};
    let closeClippingModal = () => {};
    let closeBureauModal = () => {};
    let openCredentialModal = () => {};
    let openClippingModal = () => {};
    let openBureauModal = () => {};

    const syncModalOverflow = () => {
        const cModal = document.getElementById('credential-modal');
        const clModal = document.getElementById('clipping-modal');
        const bModal = document.getElementById('bureau-modal');
        const anyOpen = (cModal && cModal.style.display === 'flex') ||
                        (clModal && clModal.style.display === 'flex') ||
                        (bModal && bModal.style.display === 'flex');
        document.body.style.overflow = anyOpen ? 'hidden' : '';
    };

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
            postponementsCount++;
            clickerCount = postponementsCount;
            try { localStorage.setItem('lg_postponements_count', postponementsCount.toString()); } catch (e) {}
            playClickerSound();
            spawnClickerParticle();
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
            if (confirm("Reset your postponement tally back to zero?")) {
                postponementsCount = 0;
                clickerCount = 0;
                try { localStorage.setItem('lg_postponements_count', '0'); } catch (e) {}
                prevRank = getClickerRank(0);
                updateClickerUI();
            }
        });
    }

    // ==========================================
    // THE MIDNIGHT EDITION (NOCTURNAL BROADSHEET)
    // ==========================================
    const midnightToggleBtn = document.getElementById('midnight-toggle-btn');
    const midnightBtnText = document.getElementById('midnight-btn-text');
    const mastheadVol = document.getElementById('masthead-vol');
    const mastheadSub = document.getElementById('masthead-sub');

    // Synthesize warm gaslight / candle ignition sound (Web Audio API via GatorAudio)
    const playMidnightGaslightSound = (isActivating) => {
        if (GatorAudio.playMidnightGaslightSound) GatorAudio.playMidnightGaslightSound(isActivating);
    };

    const applySepiaMode = (enable) => {
        document.body.classList.add('theme-transitioning');
        document.body.classList.toggle('sepia-edition', enable);
        document.documentElement.classList.toggle('sepia-edition', enable);
        if (sepiaToggleBtn) {
            sepiaToggleBtn.textContent = enable ? '[ 📜 1890s PRINT: ON ]' : '[ 📜 1890s PRINT: OFF ]';
        }
        if (enable) {
            if (document.body.classList.contains('midnight-edition')) {
                applyMidnightMode(false, false);
            }
            if (mastheadVol) mastheadVol.textContent = '1890s ED.';
            if (mastheadSub) mastheadSub.textContent = 'PRINTED ON RAGGED LINEN NEWSPRINT // PRICE: TWO CENTS';
        } else {
            if (!document.body.classList.contains('midnight-edition')) {
                if (mastheadVol) mastheadVol.textContent = 'VOL. 1';
                if (mastheadSub) mastheadSub.textContent = 'PUBLISHED DAILY (EVENTUALLY)';
            }
        }
        if (taskInput) {
            taskInput.placeholder = "";
        }
        try {
            localStorage.setItem('lg_sepia_mode', enable ? 'true' : 'false');
        } catch (e) {}
        refreshClippingTheme();
        requestAnimationFrame(() => {
            document.body.classList.remove('theme-transitioning');
        });
    };

    const applyMidnightMode = (enable, playSound = false) => {
        document.body.classList.add('theme-transitioning');
        if (enable) {
            document.body.classList.add('midnight-edition');
            document.documentElement.classList.add('midnight-edition');
            // If sepia mode was on, turn off sepia so themes do not clash
            if (document.body.classList.contains('sepia-edition')) {
                document.body.classList.remove('sepia-edition');
                document.documentElement.classList.remove('sepia-edition');
                if (sepiaToggleBtn) sepiaToggleBtn.textContent = '[ 📜 1890s PRINT: OFF ]';
            }
            if (midnightBtnText) midnightBtnText.textContent = 'MIDNIGHT: ON';
            if (mastheadVol) mastheadVol.textContent = 'MIDNIGHT ED.';
            if (mastheadSub) mastheadSub.textContent = 'PRINTED UNDER GASLIGHT FOR THE PROFOUNDLY AWAKE';
            if (taskInput) {
                taskInput.placeholder = "";
            }
        } else {
            document.body.classList.remove('midnight-edition');
            document.documentElement.classList.remove('midnight-edition');
            if (midnightBtnText) midnightBtnText.textContent = 'MIDNIGHT: OFF';
            const savedSepia = localStorage.getItem('lg_sepia_mode') === 'true';
            if (savedSepia) {
                applySepiaMode(true);
            } else {
                if (mastheadVol) mastheadVol.textContent = 'VOL. 1';
                if (mastheadSub) mastheadSub.textContent = 'PUBLISHED DAILY (EVENTUALLY)';
            }
            if (taskInput) {
                taskInput.placeholder = "";
            }
        }

        try {
            localStorage.setItem('lg_midnight_mode', enable ? 'true' : 'false');
        } catch (e) {}

        if (playSound) {
            setTimeout(() => playMidnightGaslightSound(enable), 0);
        }
        refreshClippingTheme();
        requestAnimationFrame(() => {
            document.body.classList.remove('theme-transitioning');
        });
    };

    const initMidnightMode = () => {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('theme') === 'standard' || urlParams.get('midnight') === '0' || urlParams.get('theme') === 'sepia') {
                applyMidnightMode(false, false);
                return;
            }
            if (urlParams.get('theme') === 'midnight' || urlParams.get('midnight') === '1') {
                applyMidnightMode(true, false);
                return;
            }
            const saved = localStorage.getItem('lg_midnight_mode');
            if (saved !== null) {
                applyMidnightMode(saved === 'true', false);
            } else {
                // Auto-detect late night: 11 PM (23:00) to 5 AM (05:00)
                const currentHour = new Date().getHours();
                if (currentHour >= 23 || currentHour < 5) {
                    applyMidnightMode(true, false);
                } else {
                    applyMidnightMode(false, false);
                }
            }
        } catch (e) {
            applyMidnightMode(false, false);
        }
    };
    initMidnightMode();

    if (midnightToggleBtn) {
        midnightToggleBtn.addEventListener('click', () => {
            const isCurrentlyMidnight = document.body.classList.contains('midnight-edition');
            applyMidnightMode(!isCurrentlyMidnight, true);
        });
    }

    // --- Perk 1: 1890s Sepia Newsprint Edition ---
    const restoreSepiaMode = () => {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('theme') === 'sepia') {
                applySepiaMode(true);
                return;
            }
            const isSepia = localStorage.getItem('lg_sepia_mode') === 'true';
            if (isSepia && !document.body.classList.contains('midnight-edition')) {
                applySepiaMode(true);
            }
        } catch (e) {}
    };
    restoreSepiaMode();

    if (sepiaToggleBtn) {
        sepiaToggleBtn.addEventListener('click', () => {
            const isCurrentlySepia = document.body.classList.contains('sepia-edition');
            applySepiaMode(!isCurrentlySepia);
        });
    }

    // --- Perk 2: Office Sound Camouflage (Web Audio API) ---
    let typingTimeout = null;
    let isTypingCamoActive = false;

    const getCamoAudioContext = () => GatorAudio.getCamoAudioContext ? GatorAudio.getCamoAudioContext() : null;

    const playKeyClick = (isReturnOrSpace = false) => {
        if (GatorAudio.playKeyClick) GatorAudio.playKeyClick(isReturnOrSpace);
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
        if (GatorAudio.playExhaustedSigh) GatorAudio.playExhaustedSigh(camoSighBtn);
    };

    const playPaperShuffle = () => {
        if (GatorAudio.playPaperShuffle) GatorAudio.playPaperShuffle();
        if (camoPaperBtn) {
            const orig = camoPaperBtn.textContent;
            camoPaperBtn.textContent = '📁 *SHUFFLE*';
            camoPaperBtn.classList.add('playing');
            setTimeout(() => {
                camoPaperBtn.textContent = orig;
                camoPaperBtn.classList.remove('playing');
            }, 650);
        }
    };

    if (camoTypingBtn) camoTypingBtn.addEventListener('click', startTypingCamouflage);
    if (camoSighBtn) camoSighBtn.addEventListener('click', playExhaustedSigh);
    if (camoPaperBtn) camoPaperBtn.addEventListener('click', playPaperShuffle);
    if (camoStopBtn) camoStopBtn.addEventListener('click', stopCamouflage);

    // --- Perk 3: Official Sloth Credential & Press Pass (Canvas via GatorCanvas) ---
    const generateCredentialCard = (targetCanvas, holderName, rankName, clicks, timeStr, options) => {
        return GatorCanvas.generateCredentialCard
            ? GatorCanvas.generateCredentialCard(targetCanvas, holderName, rankName, clicks, timeStr, options)
            : targetCanvas;
    };

    openCredentialModal = () => {
        if (!credentialModal || !credentialCanvas) return;
        closeBureauModal();
        closeClippingModal();

        const userNameInput = document.getElementById('user-name');
        let authorName = currentSubmittedName || (userNameInput ? userNameInput.value.trim() : '');
        if (!authorName && currentGator && (currentGator.displayTag || currentGator.tag)) {
            authorName = `@${(currentGator.displayTag || currentGator.tag).replace(/^@/, '')}`;
        }
        authorName = authorName || 'Anonymous Slacker';
        authorName = authorName.replace(/^\[[^\]]+\]\s*/, '');

        const curPostponements = (window.postponementsCount !== undefined) ? window.postponementsCount : postponementsCount;
        const curSympathy = (window.totalSympathyCount !== undefined) ? window.totalSympathyCount : totalSympathyCount;
        const curTime = (window.timeStolenSeconds !== undefined) ? window.timeStolenSeconds : timeStolenSeconds;

        const rankText = getSlackerRank(curPostponements, curSympathy, curTime).replace('RANK: ', '').trim();
        const timeStr = formatTimeStolen(curTime);

        generateCredentialCard(credentialCanvas, authorName, rankText, curPostponements, timeStr, {
            sympathyCount: curSympathy
        });

        const credentialShareBtn = document.getElementById('credential-share-btn');
        if (credentialShareBtn && navigator.share) {
            credentialShareBtn.style.display = 'inline-block';
        }

        credentialModal.style.display = 'flex';
        syncModalOverflow();
    };
    window.openCredentialModal = openCredentialModal;

    closeCredentialModal = () => {
        if (credentialModal) credentialModal.style.display = 'none';
        syncModalOverflow();
    };
    window.closeCredentialModal = closeCredentialModal;

    if (claimPassBtn) claimPassBtn.addEventListener('click', openCredentialModal);
    const headerPassBtn = document.getElementById('header-pass-btn');
    if (headerPassBtn) headerPassBtn.addEventListener('click', openCredentialModal);
    const bureauPassBtn = document.getElementById('bureau-pass-btn');
    if (bureauPassBtn) bureauPassBtn.addEventListener('click', () => {
        closeBureauModal();
        openCredentialModal();
    });
    const bureauGuestPassBtn = document.getElementById('bureau-guest-pass-btn');
    if (bureauGuestPassBtn) bureauGuestPassBtn.addEventListener('click', () => {
        closeBureauModal();
        openCredentialModal();
    });
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
            const curPostponements = (window.postponementsCount !== undefined) ? window.postponementsCount : postponementsCount;
            const curSympathy = (window.totalSympathyCount !== undefined) ? window.totalSympathyCount : totalSympathyCount;
            const curTime = (window.timeStolenSeconds !== undefined) ? window.timeStolenSeconds : timeStolenSeconds;

            const rankText = getSlackerRank(curPostponements, curSympathy, curTime).replace('RANK: ', '').trim();
            const timeStr = formatTimeStolen(curTime);
            const dispWord = curPostponements === 1 ? 'dispatch' : 'dispatches';
            const sympathyPhrase = curSympathy > 0 ? `, ${curSympathy} sympathy earned,` : '';
            const shareText = `I have been officially accredited as "${rankText}" with ${curPostponements} ${dispWord} filed${sympathyPhrase} and ${timeStr} stolen from work on Later, Gator. My diplomatic immunity is legally binding.`;
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
            if (credentialCanvas) {
                const link = document.createElement('a');
                link.download = `sloth-credential-pass-${Date.now()}.png`;
                link.href = credentialCanvas.toDataURL('image/png');
                link.click();
            }
            const curPostponements = (window.postponementsCount !== undefined) ? window.postponementsCount : postponementsCount;
            const curSympathy = (window.totalSympathyCount !== undefined) ? window.totalSympathyCount : totalSympathyCount;
            const curTime = (window.timeStolenSeconds !== undefined) ? window.timeStolenSeconds : timeStolenSeconds;

            const rankText = getSlackerRank(curPostponements, curSympathy, curTime).replace('RANK: ', '').trim();
            const timeStr = formatTimeStolen(curTime);
            const dispWord = curPostponements === 1 ? 'dispatch' : 'dispatches';
            const sympathyPhrase = curSympathy > 0 ? `, ${curSympathy} sympathy earned,` : '';
            const text = `I have been officially accredited as "${rankText}" with ${curPostponements} ${dispWord} filed${sympathyPhrase} and ${timeStr} stolen from work on @thelatergators. Diplomatic immunity granted.`;
            const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(getShareUrl())}`;
            window.open(url, '_blank', 'noopener,noreferrer');
        });
    }

    if (credentialCopyBtn) {
        credentialCopyBtn.addEventListener('click', async () => {
            const userNameInput = document.getElementById('user-name');
            let authorName = currentSubmittedName || (userNameInput ? userNameInput.value.trim() : '') || 'Anonymous Slacker';
            authorName = authorName.replace(/^\[[^\]]+\]\s*/, '');
            const curPostponements = (window.postponementsCount !== undefined) ? window.postponementsCount : postponementsCount;
            const curSympathy = (window.totalSympathyCount !== undefined) ? window.totalSympathyCount : totalSympathyCount;
            const curTime = (window.timeStolenSeconds !== undefined) ? window.timeStolenSeconds : timeStolenSeconds;

            const rankText = getSlackerRank(curPostponements, curSympathy, curTime).replace('RANK: ', '').trim();
            const timeStr = formatTimeStolen(curTime);
            const dispWord = curPostponements === 1 ? 'DISPATCH' : 'DISPATCHES';
            const sympathyText = curSympathy > 0 ? ` • ${curSympathy} SYMPATHY` : '';
            const summary = `★ OFFICIAL SLOTH CREDENTIAL // BUREAU OF IDLENESS ★\nBEARER: ${authorName.toUpperCase()}\nRANK: ${rankText}\nRECORD: ${curPostponements} ${dispWord} FILED${sympathyText} • ${timeStr} STOLEN FROM WORK\nSTATUS: FULL DIPLOMATIC IMMUNITY FROM WORK\nVERIFY: ${getShareUrl()}`;
            try {
                await navigator.clipboard.writeText(summary);
                credentialCopyBtn.textContent = "COPIED! ✓";
                setTimeout(() => { credentialCopyBtn.textContent = "COPY SUMMARY"; }, 2000);
            } catch (e) {
                credentialCopyBtn.textContent = "COPIED";
            }
        });
    }

    // ==========================================
    // VIRAL NEWSPAPER CLIPPING GENERATOR
    // ==========================================
    const clippingModal = document.getElementById('clipping-modal');
    const clippingBackdrop = document.getElementById('clipping-backdrop');
    const clippingCloseBtn = document.getElementById('clipping-close-btn');
    const clippingCanvas = document.getElementById('clipping-canvas');
    const clippingDownloadBtn = document.getElementById('clipping-download-btn');
    const clippingShareBtn = document.getElementById('clipping-share-btn');
    const clippingCopyBtn = document.getElementById('clipping-copy-btn');
    const clippingXBtn = document.getElementById('clipping-x-btn');

    let currentClippingTask = null;

    // Word wrap helper and clipping generator (Canvas via GatorCanvas)
    const wrapCanvasText = (ctx, text, maxWidth) => GatorCanvas.wrapCanvasText ? GatorCanvas.wrapCanvasText(ctx, text, maxWidth) : [];
    const generateNewspaperClipping = (canvas, task) => {
        return GatorCanvas.generateNewspaperClipping
            ? GatorCanvas.generateNewspaperClipping(canvas, task)
            : canvas;
    };

    openClippingModal = (task) => {
        if (!clippingModal || !clippingCanvas || !task) return;
        closeBureauModal();
        closeCredentialModal();
        currentClippingTask = task;
        generateNewspaperClipping(clippingCanvas, task);

        if (clippingShareBtn && navigator.share) {
            clippingShareBtn.style.display = 'inline-block';
        }

        clippingModal.style.display = 'flex';
        syncModalOverflow();
    };
    window.openClippingModal = openClippingModal;

    closeClippingModal = () => {
        if (clippingModal) clippingModal.style.display = 'none';
        currentClippingTask = null;
        syncModalOverflow();
    };
    window.closeClippingModal = closeClippingModal;

    refreshClippingTheme = () => {
        if (clippingModal && clippingModal.style.display === 'flex' && currentClippingTask && clippingCanvas) {
            generateNewspaperClipping(clippingCanvas, currentClippingTask);
        }
    };

    if (clippingCloseBtn) clippingCloseBtn.addEventListener('click', closeClippingModal);
    if (clippingBackdrop) clippingBackdrop.addEventListener('click', closeClippingModal);

    // Escape key closes modals
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (clippingModal && clippingModal.style.display === 'flex') {
                closeClippingModal();
            }
            if (credentialModal && credentialModal.style.display === 'flex') {
                closeCredentialModal();
            }
            const bModal = document.getElementById('bureau-modal');
            if (bModal && bModal.style.display === 'flex') {
                closeBureauModal();
            }
        }
    });

    if (clippingDownloadBtn && clippingCanvas) {
        clippingDownloadBtn.addEventListener('click', () => {
            if (!currentClippingTask) return;
            const link = document.createElement('a');
            link.download = `later-gator-dispatch-${currentClippingTask.id || 'clipping'}.png`;
            link.href = clippingCanvas.toDataURL('image/png');
            link.click();

            const orig = clippingDownloadBtn.textContent;
            clippingDownloadBtn.textContent = '[ CLIPPING DOWNLOADED ✓ ]';
            setTimeout(() => { clippingDownloadBtn.textContent = orig; }, 2500);
        });
    }

    if (clippingCopyBtn && clippingCanvas) {
        clippingCopyBtn.addEventListener('click', async () => {
            if (!currentClippingTask) return;
            const raw = (currentClippingTask.text || '').replace(/^\[PANIC\]\s*/, '').trim();
            const orig = clippingCopyBtn.textContent;

            if (clippingCanvas.toBlob && navigator.clipboard && navigator.clipboard.write) {
                try {
                    clippingCanvas.toBlob(async (blob) => {
                        if (!blob) throw new Error('Blob generation failed');
                        await navigator.clipboard.write([
                            new ClipboardItem({ 'image/png': blob })
                        ]);
                        clippingCopyBtn.textContent = '✓ IMAGE COPIED!';
                        setTimeout(() => { clippingCopyBtn.textContent = orig; }, 2500);
                    }, 'image/png');
                    return;
                } catch (err) {
                    console.warn('Clipboard image write failed, falling back to text:', err);
                }
            }

            // Fallback: copy citation text
            try {
                const quoteText = `“${raw}”\n— Verified Unfinished on @thelatergators (https://latergators.live)`;
                await navigator.clipboard.writeText(quoteText);
                clippingCopyBtn.textContent = '✓ CITATION COPIED!';
                setTimeout(() => { clippingCopyBtn.textContent = orig; }, 2500);
            } catch (e) {
                clippingCopyBtn.textContent = '✓ COPIED';
                setTimeout(() => { clippingCopyBtn.textContent = orig; }, 2500);
            }
        });
    }

    if (clippingXBtn && clippingCanvas) {
        clippingXBtn.addEventListener('click', () => {
            if (!currentClippingTask) return;
            // Also trigger PNG download so user has the graphic to attach to their tweet
            const link = document.createElement('a');
            link.download = `later-gator-dispatch-${currentClippingTask.id || 'clipping'}.png`;
            link.href = clippingCanvas.toDataURL('image/png');
            link.click();

            const raw = (currentClippingTask.text || '').replace(/^\[PANIC\]\s*/, '').trim();
            const snippet = raw.length > 100 ? raw.substring(0, 97) + '...' : raw;
            const text = `“${snippet}”\n\nFormally stamped as VERIFIED UNFINISHED on @thelatergators. The 1890 Inaction Treaty protects me.`;
            const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://latergators.live')}`;
            window.open(url, '_blank', 'noopener,noreferrer');
        });
    }

    if (clippingShareBtn && clippingCanvas) {
        clippingShareBtn.addEventListener('click', () => {
            if (!currentClippingTask || !navigator.share) return;
            const raw = (currentClippingTask.text || '').replace(/^\[PANIC\]\s*/, '').trim();
            const snippet = raw.length > 80 ? raw.substring(0, 77) + '...' : raw;
            const shareTitle = 'VERIFIED UNFINISHED DISPATCH // LATER, GATOR';
            const shareText = `“${snippet}” — Certified as VERIFIED UNFINISHED on @thelatergators:`;

            clippingCanvas.toBlob(async (blob) => {
                if (blob) {
                    try {
                        const file = new File([blob], `later-gator-dispatch-${currentClippingTask.id}.png`, { type: 'image/png' });
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            await navigator.share({
                                title: shareTitle,
                                text: shareText,
                                files: [file]
                            });
                            return;
                        }
                    } catch (e) {}
                }
                try {
                    await navigator.share({
                        title: shareTitle,
                        text: shareText,
                        url: 'https://latergators.live'
                    });
                } catch (e) {}
            }, 'image/png');
        });
    }

    // ==========================================
    // TAB 2: THE AIRTIGHT ALIBI DISPENSER
    // ==========================================
    const ALIBI_DATABASE = {
        work: [
            { text: "My local cache has desynchronized from the upstream repository, corrupting the cognitive build pipeline. Rebuilding takes 4 to 6 business days.", ref: "STATUTE 404 • REF #WRK-901 • CORRUPT CACHE" },
            { text: "I am actively analyzing cross-functional deliverables to identify synergistic blockers. Any sudden output right now could disrupt quarterly alignment.", ref: "STATUTE 102 • REF #WRK-382 • STRATEGIC SYNERGY" },
            { text: "Currently caught in an emergency asynchronous retrospective loop. Direct queries will bounce back with a 504 Gateway Timeout.", ref: "STATUTE 504 • REF #WRK-712 • ASYNC DEADLOCK" },
            { text: "I would love to prioritize this, but I am waiting on critical sign-offs from three executives who are currently out of office indefinitely.", ref: "STATUTE 203 • REF #WRK-419 • BLOCKED BY MGMT" },
            { text: "My mouse cursor froze inside an invisible modal overlay. Interacting with Slack or email will irrevocably compromise security protocols.", ref: "STATUTE 808 • REF #WRK-664 • MODAL TRAP" }
        ],
        school: [
            { text: "My primary textbook spontaneously combusted into philosophical irrelevance upon contact with reality. Requesting an indefinite extension.", ref: "DEAN DISPATCH • REF #SCH-101 • SYLLABUS DISPUTE" },
            { text: "I conducted profound preliminary research for 7 hours, concluding that the essay prompt presupposes an unprovable metaphysical premise.", ref: "ACADEMIC BOARD • REF #SCH-420 • ONTOLOGICAL CRISIS" },
            { text: "The dog did not eat my homework. The dog initiated a distributed denial of service attack against my home router. Pls understand.", ref: "CAMPUS IT • REF #SCH-883 • CANINE DDOS" },
            { text: "I submitted the assignment directly into the ether. If the portal claims it is missing, the portal has failed its own verification.", ref: "REGISTRAR • REF #SCH-919 • ETHER SUBMISSION" }
        ],
        social: [
            { text: "My social battery experienced catastrophic thermal throttling at 4:15 PM. Forced reboot requires a weighted blanket and 3 episodes of television.", ref: "SOCIETAL ACCORD • REF #SOC-500 • THERMAL THROTTLE" },
            { text: "I am trapped inside an unresolvable conversation with my cat regarding the redistribution of treats. Etiquette forbids early departure.", ref: "DOMESTIC PROTOCOL • REF #SOC-214 • FELINE DISPUTE" },
            { text: "I was already dressed and heading to the door, but gravity experienced a sudden localized spike in the living room sofa.", ref: "GRAVITATIONAL ANOMALY • REF #SOC-771 • SOFA SPIKE" },
            { text: "My psychic advised against traversing any doorway facing east today. Regrettably, your gathering is due east.", ref: "MYSTIC CODES • REF #SOC-333 • EASTWARD EMBARGO" }
        ],
        existential: [
            { text: "The bearer is unable to attend due to acute cognitive atmospheric interference. All inquiries are legally deferred to next Tuesday.", ref: "STATUTE 404 • REF #EXT-8912 • VERIFIED DELAY" },
            { text: "In 5 billion years the sun will engulf the earth, rendering this sprint review fundamentally trivial. Exercising proactive indifference.", ref: "COSMIC TRIBUNAL • REF #EXT-001 • SOLAR PREEMPTION" },
            { text: "I have achieved quantum superposition between working and not working. By observing me, you will collapse the wave function into complete slumber.", ref: "PHYSICS CODEX • REF #EXT-734 • SCHRÖDINGER SLOTH" },
            { text: "I am taking a mental sabbatical for the next 45 minutes to contemplate the geometry of dust motes in the afternoon sunbeam.", ref: "CONTEMPLATION ORDER • REF #EXT-404 • DUST MOTES" }
        ]
    };

    let currentAlibiCat = 'work';
    let currentAlibiIdx = 0;
    const alibiCatBtns = document.querySelectorAll('.alibi-cat-btn');
    const alibiTextEl = document.getElementById('alibi-text');
    const alibiRefEl = document.getElementById('alibi-ref');
    const alibiNextBtn = document.getElementById('alibi-next-btn');
    const alibiCopyBtn = document.getElementById('alibi-copy-btn');

    const renderAlibi = (animate = false) => {
        const catList = ALIBI_DATABASE[currentAlibiCat] || ALIBI_DATABASE.work;
        const item = catList[currentAlibiIdx % catList.length];
        if (!item) return;

        if (animate && alibiTextEl) {
            alibiTextEl.style.opacity = '0';
            setTimeout(() => {
                alibiTextEl.textContent = `"${item.text}"`;
                if (alibiRefEl) alibiRefEl.textContent = item.ref;
                alibiTextEl.style.opacity = '1';
            }, 120);
        } else {
            if (alibiTextEl) alibiTextEl.textContent = `"${item.text}"`;
            if (alibiRefEl) alibiRefEl.textContent = item.ref;
        }
    };

    alibiCatBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            alibiCatBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentAlibiCat = btn.getAttribute('data-cat') || 'work';
            currentAlibiIdx = Math.floor(Math.random() * (ALIBI_DATABASE[currentAlibiCat] || []).length);
            renderAlibi(true);
        });
    });

    if (alibiNextBtn) {
        alibiNextBtn.addEventListener('click', () => {
            const catList = ALIBI_DATABASE[currentAlibiCat] || ALIBI_DATABASE.work;
            currentAlibiIdx = (currentAlibiIdx + 1) % catList.length;
            renderAlibi(true);
        });
    }

    if (alibiCopyBtn) {
        alibiCopyBtn.addEventListener('click', async () => {
            const catList = ALIBI_DATABASE[currentAlibiCat] || ALIBI_DATABASE.work;
            const item = catList[currentAlibiIdx % catList.length];
            if (!item) return;
            const slackText = `> 🚨 *OFFICIAL ALIBI DISPATCH*:\n> "${item.text}"\n> — _${item.ref} via LaterGator.live_`;
            try {
                await navigator.clipboard.writeText(slackText);
                alibiCopyBtn.textContent = "[ COPIED TO SLACK! ✓ ]";
                setTimeout(() => { alibiCopyBtn.textContent = "[ 📋 COPY FOR SLACK ]"; }, 2000);
            } catch (e) {
                alibiCopyBtn.textContent = "[ COPIED! ]";
            }
        });
    }

    renderAlibi(false);

    // ==========================================
    // TAB 3: SLACKER'S DAILY ORACLE / HOROSCOPE
    // ==========================================
    const ORACLE_HOROSCOPES = {
        aries: {
            title: "♈ ARIES • THE IMPULSIVE REST",
            text: "Mars demands bold aggression, but your bed demands horizontal solidarity. Choose peace over emails. Any task attempted today will backfire into a 3-hour nap."
        },
        taurus: {
            title: "♉ TAURUS • THE STUBBORN COCOON",
            text: "Venus aligns with your comfort zone. Today is not the day to conquer mountains; it is the day to conquer snacks. If someone asks for a status update, chew louder."
        },
        gemini: {
            title: "♊ GEMINI • THE DUAL INACTION",
            text: "Both of your personalities have unanimously agreed: absolutely not. You will open 47 browser tabs with good intentions and read none of them. A flawless victory."
        },
        cancer: {
            title: "♋ CANCER • THE EMOTIONAL FORTRESS",
            text: "The Moon urges you to retreat into your shell. Seal the perimeters. The spreadsheet is toxic and lacks emotional maturity. Ignore it until next fiscal quarter."
        },
        leo: {
            title: "♌ LEO • THE REGAL SLACKER",
            text: "You are royalty, and royalty does not fill out Jira tickets. Bask in the spotlight of unearned confidence. Let the commoners deal with the deliverables."
        },
        virgo: {
            title: "♍ VIRGO • THE PERFECTIONIST'S PARALYSIS",
            text: "You cannot start until the desk is clean, the inbox is zeroed, and the lighting is cinematic. Since this will take until 2028, you are free to do nothing today."
        },
        libra: {
            title: "♎ LIBRA • THE DELICATE IMBALANCE",
            text: "Weighing the pros and cons of doing work has revealed that not doing work has zero calorie expenditure. The scales have spoken. Remain motionless."
        },
        scorpio: {
            title: "♏ SCORPIO • THE SHADOW RETREAT",
            text: "Plot in silence. If they can't see you, they can't assign you tasks. Set your Slack status to a cryptic moon emoji and vanish into the ether."
        },
        sagittarius: {
            title: "♐ SAGITTARIUS • THE RUNAWAY ARROW",
            text: "Your spirit yearns for wild horizons, or at least a 2-hour lunch break in the park. Run free. The project manager's ping cannot cross state lines."
        },
        capricorn: {
            title: "♑ CAPRICORN • THE STRATEGIC STRIKE",
            text: "Even workaholics need a strike day. Frame your complete inactivity as an 'executive resilience audit'. They will respect your visionary leadership."
        },
        aquarius: {
            title: "♒ AQUARIUS • THE REVOLUTIONARY IDLE",
            text: "By refusing to work today, you are subverting the capitalist industrial complex. Your nap is not laziness; it is high-concept political performance art."
        },
        pisces: {
            title: "♓ PISCES • THE DREAMLAND VOYAGE",
            text: "Neptune floods your consciousness with whimsical daydreams. You are technically at your desk, but your soul is swimming with neon dolphins in the year 3000."
        }
    };

    const oracleSelect = document.getElementById('oracle-sign-select');
    const oracleTitleEl = document.getElementById('oracle-sign-title');
    const oracleBodyEl = document.getElementById('oracle-body');
    const oracleRandomBtn = document.getElementById('oracle-random-btn');
    const oracleCopyBtn = document.getElementById('oracle-copy-btn');

    const renderOracle = (signKey, animate = false) => {
        const item = ORACLE_HOROSCOPES[signKey] || ORACLE_HOROSCOPES.aries;
        if (!item) return;

        if (animate && oracleBodyEl) {
            oracleBodyEl.style.opacity = '0';
            setTimeout(() => {
                if (oracleTitleEl) oracleTitleEl.textContent = item.title;
                oracleBodyEl.textContent = `"${item.text}"`;
                oracleBodyEl.style.opacity = '1';
            }, 120);
        } else {
            if (oracleTitleEl) oracleTitleEl.textContent = item.title;
            if (oracleBodyEl) oracleBodyEl.textContent = `"${item.text}"`;
        }
    };

    if (oracleSelect) {
        oracleSelect.addEventListener('change', () => {
            renderOracle(oracleSelect.value, true);
        });
    }

    if (oracleRandomBtn) {
        oracleRandomBtn.addEventListener('click', () => {
            const keys = Object.keys(ORACLE_HOROSCOPES);
            const randomKey = keys[Math.floor(Math.random() * keys.length)];
            if (oracleSelect) oracleSelect.value = randomKey;
            renderOracle(randomKey, true);
        });
    }

    if (oracleCopyBtn) {
        oracleCopyBtn.addEventListener('click', async () => {
            const signKey = oracleSelect ? oracleSelect.value : 'aries';
            const item = ORACLE_HOROSCOPES[signKey] || ORACLE_HOROSCOPES.aries;
            const copyMsg = `🔮 *CELESTIAL SLACKER ORACLE*:\n"${item.title}"\n${item.text}\n— via LaterGator.live`;
            try {
                await navigator.clipboard.writeText(copyMsg);
                oracleCopyBtn.textContent = "[ COPIED DESTINY! ✓ ]";
                setTimeout(() => { oracleCopyBtn.textContent = "[ 📋 COPY DESTINY ]"; }, 2000);
            } catch (e) {
                oracleCopyBtn.textContent = "[ COPIED! ]";
            }
        });
    }

    if (oracleSelect) {
        renderOracle(oracleSelect.value, false);
    }

    // --- Option 5: Front-Page Editorial 2-Panel Comic Strip ---
    const COMIC_STRIPS = [
        {
                "title": "EP. 1: THE SNOOZE TRAP",
                "tag1": "PANEL 1 • 07:00 AM",
                "speech1": "\"Just 5 more mins...\"",
                "tag2": "PANEL 2 • 11:45 AM",
                "speech2": "\"The math was wrong!\"",
                "caption": "\"5 minutes of morning sleep is legally equivalent to 4 hours in physical space.\"",
                "svg1": "\n        <svg viewBox=\"0 0 150 80\" width=\"100%\" height=\"100%\" xmlns=\"http://www.w3.org/2000/svg\">\n            <!-- Alarm clock table -->\n            <rect x=\"6\" y=\"30\" width=\"30\" height=\"36\" rx=\"3\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <circle cx=\"21\" cy=\"46\" r=\"10\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.5\"/>\n            <text x=\"21\" y=\"49\" font-family=\"'Space Mono', monospace\" font-size=\"5.5\" font-weight=\"700\" text-anchor=\"middle\" fill=\"var(--ink)\">07:00</text>\n            <path d=\"M15 34 C15 31 18 31 18 34 M24 34 C24 31 27 31 27 34\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"1.5\"/>\n            <path d=\"M7 36 C5 39 5 43 7 46 M35 36 C37 39 37 43 35 46\" fill=\"none\" stroke=\"#b91c1c\" stroke-width=\"1.5\"/>\n            <!-- Bed frame & pillow -->\n            <rect x=\"42\" y=\"44\" width=\"98\" height=\"26\" rx=\"4\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <ellipse cx=\"58\" cy=\"42\" rx=\"13\" ry=\"7\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.5\"/>\n            <!-- Sleeping Gator Head & Snout -->\n            <path d=\"M54 44 Q72 35 88 38 C94 39 94 45 88 47 Q74 48 58 48 Z\" fill=\"#40916c\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <circle cx=\"86\" cy=\"40\" r=\"1.2\" fill=\"var(--ink)\"/>\n            <!-- Sleepy eye -->\n            <path d=\"M64 40 Q68 37 72 40\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <!-- Cute little teeth -->\n            <path d=\"M78 47 L80 45 L82 47 L84 45 L86 47\" fill=\"none\" stroke=\"white\" stroke-width=\"1.2\"/>\n            <!-- Blanket -->\n            <path d=\"M48 47 Q85 41 138 46 L138 68 L48 68 Z\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <path d=\"M50 54 Q85 49 136 53 M50 61 Q85 56 136 60\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"1\" stroke-dasharray=\"3 2\"/>\n            <!-- Floating Zzz -->\n            <text x=\"96\" y=\"28\" font-family=\"'Space Mono', monospace\" font-size=\"8\" font-weight=\"700\" fill=\"#b91c1c\">z</text>\n            <text x=\"105\" y=\"21\" font-family=\"'Space Mono', monospace\" font-size=\"11\" font-weight=\"700\" fill=\"#b91c1c\">Z</text>\n            <text x=\"117\" y=\"14\" font-family=\"'Space Mono', monospace\" font-size=\"14\" font-weight=\"900\" fill=\"#b91c1c\">Z</text>\n        </svg>",
                "svg2": "\n        <svg viewBox=\"0 0 150 80\" width=\"100%\" height=\"100%\" xmlns=\"http://www.w3.org/2000/svg\">\n            <!-- Clock table 11:45 -->\n            <rect x=\"6\" y=\"30\" width=\"30\" height=\"36\" rx=\"3\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <circle cx=\"21\" cy=\"46\" r=\"10\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.5\"/>\n            <text x=\"21\" y=\"49\" font-family=\"'Space Mono', monospace\" font-size=\"5\" font-weight=\"700\" text-anchor=\"middle\" fill=\"#b91c1c\">11:45</text>\n            <!-- Sun blazing -->\n            <circle cx=\"132\" cy=\"16\" r=\"8\" fill=\"#eab308\" stroke=\"var(--ink)\" stroke-width=\"1.5\"/>\n            <path d=\"M132 5 L132 2 M132 27 L132 30 M121 16 L118 16 M143 16 L146 16 M124 8 L122 6 M140 24 L142 26 M124 24 L122 26 M140 8 L142 6\" stroke=\"var(--ink)\" stroke-width=\"1.5\"/>\n            <!-- Bed -->\n            <rect x=\"42\" y=\"48\" width=\"98\" height=\"22\" rx=\"4\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <!-- Gator sitting bolt upright in shock -->\n            <path d=\"M58 66 L58 32 Q68 22 84 22 Q92 22 96 28 C98 34 94 38 88 40 L84 42 L84 66 Z\" fill=\"#40916c\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <!-- Huge startled eyes -->\n            <circle cx=\"78\" cy=\"18\" r=\"6.5\" fill=\"white\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <circle cx=\"79\" cy=\"18\" r=\"2.5\" fill=\"var(--ink)\"/>\n            <circle cx=\"90\" cy=\"19\" r=\"5.5\" fill=\"white\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <circle cx=\"91\" cy=\"19\" r=\"2.2\" fill=\"var(--ink)\"/>\n            <!-- Open mouth in scream -->\n            <path d=\"M84 28 Q106 24 116 28 C118 31 114 34 106 36 L86 38 Z\" fill=\"#1b4332\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <path d=\"M88 28 L90 31 L92 28 L94 31 L96 28 M88 37 L90 34 L92 37 L94 34 L96 37\" fill=\"none\" stroke=\"white\" stroke-width=\"1.2\"/>\n            <!-- Gator hands on cheeks -->\n            <path d=\"M66 40 Q60 26 74 24 M76 42 Q84 28 88 28\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"2.5\" stroke-linecap=\"round\"/>\n            <!-- Sweat beads -->\n            <path d=\"M68 14 C66 12 66 8 68 6 C70 8 70 12 68 14 Z\" fill=\"#38bdf8\" stroke=\"var(--ink)\" stroke-width=\"1\"/>\n            <path d=\"M50 50 Q85 45 138 48 L138 68 L50 68 Z\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n        </svg>"
        },
        {
                "title": "EP. 2: SCHRÖDINGER'S INBOX",
                "tag1": "PANEL 1 • UNOPENED",
                "speech1": "\"If I don't look...\"",
                "tag2": "PANEL 2 • PURE BLISS",
                "speech2": "\"The crisis isn't real!\"",
                "caption": "\"Unopened emails exist in a superposition of both urgent and non-existent.\"",
                "svg1": "\n        <svg viewBox=\"0 0 150 80\" width=\"100%\" height=\"100%\" xmlns=\"http://www.w3.org/2000/svg\">\n            <!-- Desk -->\n            <line x1=\"8\" y1=\"62\" x2=\"142\" y2=\"62\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <!-- Laptop screen with 99+ emails -->\n            <rect x=\"18\" y=\"24\" width=\"38\" height=\"26\" rx=\"2\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <path d=\"M12 50 L62 50 L56 56 L18 56 Z\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.5\"/>\n            <!-- Red notification badge 99+ -->\n            <rect x=\"22\" y=\"28\" width=\"22\" height=\"12\" rx=\"2\" fill=\"#b91c1c\"/>\n            <text x=\"33\" y=\"37\" font-family=\"'Space Mono', monospace\" font-size=\"6\" font-weight=\"700\" text-anchor=\"middle\" fill=\"white\">✉ 99+</text>\n            <!-- Gator shielding eyes -->\n            <path d=\"M82 62 L82 34 Q90 26 104 26 Q116 26 122 34 L122 62 Z\" fill=\"#40916c\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <!-- Gator Snout -->\n            <path d=\"M96 36 Q118 36 126 40 C128 43 124 46 114 46 L96 46 Z\" fill=\"#40916c\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <!-- Hands covering eyes -->\n            <ellipse cx=\"94\" cy=\"30\" rx=\"6\" ry=\"8\" fill=\"#2d6a4f\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <ellipse cx=\"106\" cy=\"30\" rx=\"6\" ry=\"8\" fill=\"#2d6a4f\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <path d=\"M84 48 Q90 32 94 32 M114 48 Q110 32 106 32\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"2.2\"/>\n        </svg>",
                "svg2": "\n        <svg viewBox=\"0 0 150 80\" width=\"100%\" height=\"100%\" xmlns=\"http://www.w3.org/2000/svg\">\n            <!-- Desk with closed laptop -->\n            <line x1=\"8\" y1=\"62\" x2=\"142\" y2=\"62\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <rect x=\"18\" y=\"52\" width=\"34\" height=\"10\" rx=\"2\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <!-- Coffee mug on closed laptop -->\n            <rect x=\"28\" y=\"42\" width=\"10\" height=\"10\" rx=\"1\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.5\"/>\n            <path d=\"M38 44 C41 44 41 48 38 48\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"1.2\"/>\n            <!-- Gator lounging back with sunglasses -->\n            <!-- Chair back -->\n            <line x1=\"68\" y1=\"20\" x2=\"82\" y2=\"62\" stroke=\"var(--ink)\" stroke-width=\"4\"/>\n            <!-- Slumped Gator -->\n            <path d=\"M78 40 Q94 28 112 34 C120 37 124 45 116 52 Q96 58 84 56 Z\" fill=\"#40916c\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <!-- Cool Sunglasses -->\n            <rect x=\"98\" y=\"32\" width=\"8\" height=\"6\" rx=\"1\" fill=\"var(--ink)\"/>\n            <rect x=\"108\" y=\"34\" width=\"8\" height=\"6\" rx=\"1\" fill=\"var(--ink)\"/>\n            <line x1=\"106\" y1=\"35\" x2=\"108\" y2=\"35\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <!-- Content Smirk -->\n            <path d=\"M106 44 Q116 46 122 42\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <!-- Relaxed arms behind head -->\n            <path d=\"M86 38 Q94 24 102 26\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"2.5\" stroke-linecap=\"round\"/>\n            <text x=\"124\" y=\"24\" font-family=\"'Space Mono', monospace\" font-size=\"10\" font-weight=\"700\" fill=\"#40916c\">✨</text>\n        </svg>"
        },
        {
                "title": "EP. 3: THE 2:01 TRAGEDY",
                "tag1": "PANEL 1 • 02:00 PM",
                "speech1": "\"Starting promptly now.\"",
                "tag2": "PANEL 2 • 02:01 PM",
                "speech2": "\"Missed it. Next: 3:00.\"",
                "caption": "\"Work can only legally begin on timestamps ending in 0 or 5.\"",
                "svg1": "\n        <svg viewBox=\"0 0 150 80\" width=\"100%\" height=\"100%\" xmlns=\"http://www.w3.org/2000/svg\">\n            <!-- Wall clock showing 2:00 -->\n            <circle cx=\"28\" cy=\"28\" r=\"16\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <line x1=\"28\" y1=\"28\" x2=\"28\" y2=\"16\" stroke=\"var(--ink)\" stroke-width=\"2.2\" stroke-linecap=\"round\"/>\n            <line x1=\"28\" y1=\"28\" x2=\"38\" y2=\"28\" stroke=\"var(--ink)\" stroke-width=\"2.2\" stroke-linecap=\"round\"/>\n            <circle cx=\"28\" cy=\"28\" r=\"2\" fill=\"var(--ink)\"/>\n            <text x=\"28\" y=\"52\" font-family=\"'Space Mono', monospace\" font-size=\"6\" font-weight=\"700\" text-anchor=\"middle\" fill=\"var(--ink)\">02:00 PM</text>\n            <!-- Desk -->\n            <line x1=\"56\" y1=\"62\" x2=\"144\" y2=\"62\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <!-- Gator sitting alert and ready -->\n            <path d=\"M84 62 L84 34 Q92 24 108 24 Q118 24 124 34 L124 62 Z\" fill=\"#40916c\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <circle cx=\"98\" cy=\"28\" r=\"4.5\" fill=\"white\" stroke=\"var(--ink)\" stroke-width=\"1.5\"/>\n            <circle cx=\"99\" cy=\"28\" r=\"1.8\" fill=\"var(--ink)\"/>\n            <!-- Determined smile -->\n            <path d=\"M104 38 Q118 38 126 34\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <!-- Notebook and pencil ready -->\n            <rect x=\"64\" y=\"52\" width=\"20\" height=\"10\" rx=\"1\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.5\"/>\n            <line x1=\"88\" y1=\"46\" x2=\"78\" y2=\"54\" stroke=\"#b91c1c\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n        </svg>",
                "svg2": "\n        <svg viewBox=\"0 0 150 80\" width=\"100%\" height=\"100%\" xmlns=\"http://www.w3.org/2000/svg\">\n            <!-- Wall clock showing 2:01 -->\n            <circle cx=\"28\" cy=\"28\" r=\"16\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <line x1=\"28\" y1=\"28\" x2=\"29\" y2=\"16\" stroke=\"#b91c1c\" stroke-width=\"2.2\" stroke-linecap=\"round\"/>\n            <line x1=\"28\" y1=\"28\" x2=\"38\" y2=\"28\" stroke=\"var(--ink)\" stroke-width=\"2.2\" stroke-linecap=\"round\"/>\n            <circle cx=\"28\" cy=\"28\" r=\"2\" fill=\"var(--ink)\"/>\n            <text x=\"28\" y=\"52\" font-family=\"'Space Mono', monospace\" font-size=\"6\" font-weight=\"700\" text-anchor=\"middle\" fill=\"#b91c1c\">02:01 PM!</text>\n            <!-- Desk -->\n            <line x1=\"56\" y1=\"62\" x2=\"144\" y2=\"62\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <!-- Gator completely melted flat onto desk -->\n            <path d=\"M72 62 Q78 50 102 50 Q130 50 136 62 Z\" fill=\"#40916c\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <!-- Flat eyes closed in defeat -->\n            <line x1=\"90\" y1=\"55\" x2=\"98\" y2=\"55\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <line x1=\"106\" y1=\"55\" x2=\"114\" y2=\"55\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <!-- Dropped pencil on floor -->\n            <line x1=\"60\" y1=\"68\" x2=\"72\" y2=\"70\" stroke=\"#b91c1c\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>\n            <text x=\"122\" y=\"44\" font-family=\"'Space Mono', monospace\" font-size=\"8\" fill=\"#b91c1c\">💤</text>\n        </svg>"
        },
        {
                "title": "EP. 4: STRATEGIC HOUSEKEEPING",
                "tag1": "PANEL 1 • URGENT TASK",
                "speech1": "\"I must write now.\"",
                "tag2": "PANEL 2 • SUDDEN URGE",
                "speech2": "\"Baseboards need buffing!\"",
                "caption": "\"Never does a home shine brighter than on the eve of a major deadline.\"",
                "svg1": "\n        <svg viewBox=\"0 0 150 80\" width=\"100%\" height=\"100%\" xmlns=\"http://www.w3.org/2000/svg\">\n            <line x1=\"8\" y1=\"64\" x2=\"142\" y2=\"64\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <!-- Giant ominous calendar marked DEADLINE -->\n            <rect x=\"18\" y=\"16\" width=\"34\" height=\"42\" rx=\"2\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <rect x=\"18\" y=\"16\" width=\"34\" height=\"10\" fill=\"#b91c1c\"/>\n            <text x=\"35\" y=\"23\" font-family=\"'Space Mono', monospace\" font-size=\"5\" font-weight=\"700\" text-anchor=\"middle\" fill=\"white\">TODAY</text>\n            <text x=\"35\" y=\"42\" font-family=\"'Space Mono', monospace\" font-size=\"12\" font-weight=\"900\" text-anchor=\"middle\" fill=\"#b91c1c\">DUE</text>\n            <!-- Gator frozen in terror staring at blank page -->\n            <path d=\"M78 64 L78 36 Q86 26 102 26 Q114 26 120 36 L120 64 Z\" fill=\"#40916c\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <circle cx=\"94\" cy=\"30\" r=\"5\" fill=\"white\" stroke=\"var(--ink)\" stroke-width=\"1.5\"/>\n            <circle cx=\"95\" cy=\"30\" r=\"2\" fill=\"var(--ink)\"/>\n            <circle cx=\"106\" cy=\"30\" r=\"5\" fill=\"white\" stroke=\"var(--ink)\" stroke-width=\"1.5\"/>\n            <circle cx=\"107\" cy=\"30\" r=\"2\" fill=\"var(--ink)\"/>\n            <!-- Sweat -->\n            <path d=\"M84 20 C82 18 82 14 84 12 C86 14 86 18 84 20 Z\" fill=\"#38bdf8\" stroke=\"var(--ink)\" stroke-width=\"1\"/>\n            <line x1=\"60\" y1=\"64\" x2=\"72\" y2=\"64\" stroke=\"var(--ink)\" stroke-width=\"3\"/>\n        </svg>",
                "svg2": "\n        <svg viewBox=\"0 0 150 80\" width=\"100%\" height=\"100%\" xmlns=\"http://www.w3.org/2000/svg\">\n            <line x1=\"8\" y1=\"64\" x2=\"142\" y2=\"64\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <!-- Gator vigorously mopping floor with big joyful smile -->\n            <path d=\"M68 64 Q80 44 98 44 Q116 44 122 64 Z\" fill=\"#40916c\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <!-- Joyful squinting eyes -->\n            <path d=\"M86 48 Q90 44 94 48 M102 48 Q106 44 110 48\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <!-- Big happy grin -->\n            <path d=\"M88 54 Q100 60 114 54\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <!-- Broom/Mop -->\n            <line x1=\"42\" y1=\"20\" x2=\"68\" y2=\"64\" stroke=\"#854d0e\" stroke-width=\"2.5\" stroke-linecap=\"round\"/>\n            <path d=\"M38 18 L46 22 L42 26 L34 22 Z\" fill=\"#ca8a04\" stroke=\"var(--ink)\" stroke-width=\"1.2\"/>\n            <!-- Suds & Sparkles everywhere -->\n            <circle cx=\"34\" cy=\"60\" r=\"4\" fill=\"#bae6fd\" stroke=\"var(--ink)\" stroke-width=\"1\"/>\n            <circle cx=\"26\" cy=\"62\" r=\"3\" fill=\"#bae6fd\" stroke=\"var(--ink)\" stroke-width=\"1\"/>\n            <text x=\"54\" y=\"32\" font-family=\"'Space Mono', monospace\" font-size=\"11\" fill=\"#eab308\">✨</text>\n            <text x=\"124\" y=\"36\" font-family=\"'Space Mono', monospace\" font-size=\"13\" fill=\"#eab308\">✨</text>\n        </svg>"
        },
        {
                "title": "EP. 5: TO-DO LIST ZEN",
                "tag1": "PANEL 1 • HIGH AMBITION",
                "speech1": "\"Step 1: Write list [✓]\"",
                "tag2": "PANEL 2 • EXHAUSTED",
                "speech2": "\"Huge day. Need a nap.\"",
                "caption": "\"Documenting future labor burns an estimated 400 metaphorical calories.\"",
                "svg1": "\n        <svg viewBox=\"0 0 150 80\" width=\"100%\" height=\"100%\" xmlns=\"http://www.w3.org/2000/svg\">\n            <line x1=\"8\" y1=\"64\" x2=\"142\" y2=\"64\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <!-- Giant Clipboard -->\n            <rect x=\"22\" y=\"14\" width=\"38\" height=\"50\" rx=\"3\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <rect x=\"34\" y=\"10\" width=\"14\" height=\"6\" rx=\"1\" fill=\"var(--ink)\"/>\n            <text x=\"41\" y=\"24\" font-family=\"'Space Mono', monospace\" font-size=\"5.5\" font-weight=\"700\" text-anchor=\"middle\" fill=\"var(--ink)\">TO-DO</text>\n            <text x=\"26\" y=\"34\" font-family=\"'Space Mono', monospace\" font-size=\"5\" fill=\"#16a34a\" font-weight=\"700\">[✓] 1. LIST</text>\n            <text x=\"26\" y=\"44\" font-family=\"'Space Mono', monospace\" font-size=\"5\" fill=\"var(--ink)\">[ ] 2. WORK</text>\n            <text x=\"26\" y=\"54\" font-family=\"'Space Mono', monospace\" font-size=\"5\" fill=\"var(--ink)\">[ ] 3. LIFE</text>\n            <!-- Proud Gator pointing at item 1 -->\n            <path d=\"M84 64 L84 34 Q94 24 110 24 Q122 24 126 34 L126 64 Z\" fill=\"#40916c\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <circle cx=\"102\" cy=\"28\" r=\"4\" fill=\"white\" stroke=\"var(--ink)\" stroke-width=\"1.5\"/>\n            <circle cx=\"103\" cy=\"28\" r=\"1.6\" fill=\"var(--ink)\"/>\n            <path d=\"M84 44 L64 36\" stroke=\"var(--ink)\" stroke-width=\"2.5\" stroke-linecap=\"round\"/>\n        </svg>",
                "svg2": "\n        <svg viewBox=\"0 0 150 80\" width=\"100%\" height=\"100%\" xmlns=\"http://www.w3.org/2000/svg\">\n            <!-- Comfy Couch -->\n            <rect x=\"18\" y=\"40\" width=\"114\" height=\"24\" rx=\"4\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <rect x=\"12\" y=\"32\" width=\"14\" height=\"32\" rx=\"3\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <rect x=\"124\" y=\"32\" width=\"14\" height=\"32\" rx=\"3\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <!-- Gator sprawled upside down asleep on couch -->\n            <path d=\"M30 46 Q58 52 88 48 Q114 44 120 46 Z\" fill=\"#40916c\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <!-- Gator tail hanging off couch -->\n            <path d=\"M30 48 Q20 54 22 66\" fill=\"none\" stroke=\"#40916c\" stroke-width=\"4\" stroke-linecap=\"round\"/>\n            <path d=\"M30 48 Q20 54 22 66\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"1.5\" stroke-linecap=\"round\"/>\n            <!-- Ice pack on head -->\n            <ellipse cx=\"96\" cy=\"40\" rx=\"8\" ry=\"4\" fill=\"#38bdf8\" stroke=\"var(--ink)\" stroke-width=\"1.2\"/>\n            <!-- Snore bubbles -->\n            <text x=\"106\" y=\"26\" font-family=\"'Space Mono', monospace\" font-size=\"8\" fill=\"#b91c1c\">z</text>\n            <text x=\"114\" y=\"18\" font-family=\"'Space Mono', monospace\" font-size=\"12\" fill=\"#b91c1c\">Z</text>\n        </svg>"
        },
        {
                "title": "EP. 6: THE TEA CEREMONY",
                "tag1": "PANEL 1 • PREPARATION",
                "speech1": "\"Coffee first. Then work.\"",
                "tag2": "PANEL 2 • 3 HOURS LATER",
                "speech2": "\"Vibrating. Zero output.\"",
                "caption": "\"Work cannot commence until beverage temperature is within 0.1°C of perfection.\"",
                "svg1": "\n        <svg viewBox=\"0 0 150 80\" width=\"100%\" height=\"100%\" xmlns=\"http://www.w3.org/2000/svg\">\n            <line x1=\"8\" y1=\"64\" x2=\"142\" y2=\"64\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <!-- Coffee brewer / Kettle station -->\n            <rect x=\"18\" y=\"44\" width=\"22\" height=\"20\" rx=\"2\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <path d=\"M29 44 L29 32 L36 32\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <!-- Steam -->\n            <path d=\"M24 28 Q22 22 26 16 M32 28 Q34 22 30 16\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n            <!-- Gator carefully pouring -->\n            <path d=\"M72 64 L72 36 Q82 26 98 26 Q112 26 116 36 L116 64 Z\" fill=\"#40916c\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <circle cx=\"88\" cy=\"30\" r=\"4\" fill=\"white\" stroke=\"var(--ink)\" stroke-width=\"1.5\"/>\n            <circle cx=\"89\" cy=\"30\" r=\"1.6\" fill=\"var(--ink)\"/>\n            <!-- Kettle in hand -->\n            <path d=\"M72 44 L50 36\" stroke=\"var(--ink)\" stroke-width=\"2.5\" stroke-linecap=\"round\"/>\n            <ellipse cx=\"46\" cy=\"36\" rx=\"6\" ry=\"4\" fill=\"#ca8a04\" stroke=\"var(--ink)\" stroke-width=\"1.5\"/>\n        </svg>",
                "svg2": "\n        <svg viewBox=\"0 0 150 80\" width=\"100%\" height=\"100%\" xmlns=\"http://www.w3.org/2000/svg\">\n            <line x1=\"8\" y1=\"64\" x2=\"142\" y2=\"64\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <!-- Tower of 5 empty coffee mugs -->\n            <rect x=\"22\" y=\"54\" width=\"12\" height=\"10\" rx=\"1\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.5\"/>\n            <rect x=\"22\" y=\"44\" width=\"12\" height=\"10\" rx=\"1\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.5\"/>\n            <rect x=\"23\" y=\"34\" width=\"12\" height=\"10\" rx=\"1\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.5\"/>\n            <rect x=\"22\" y=\"24\" width=\"12\" height=\"10\" rx=\"1\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.5\"/>\n            <!-- Gator hyper-caffeinated with vibrating aura -->\n            <path d=\"M74 64 L74 32 Q84 20 102 20 Q118 20 122 32 L122 64 Z\" fill=\"#40916c\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <!-- Giant dilated eyes vibrating -->\n            <circle cx=\"92\" cy=\"24\" r=\"7\" fill=\"white\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <circle cx=\"92\" cy=\"24\" r=\"1.5\" fill=\"#b91c1c\"/>\n            <circle cx=\"106\" cy=\"24\" r=\"7\" fill=\"white\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <circle cx=\"106\" cy=\"24\" r=\"1.5\" fill=\"#b91c1c\"/>\n            <!-- Vibration speedlines -->\n            <path d=\"M64 26 L60 26 M64 34 L58 34 M132 26 L136 26 M132 34 L138 34\" stroke=\"#b91c1c\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>\n        </svg>"
        },
        {
                "title": "EP. 7: BROWSER TAB HOARD",
                "tag1": "PANEL 1 • QUICK QUESTION",
                "speech1": "\"Just 1 quick query.\"",
                "tag2": "PANEL 2 • 83 TABS OPEN",
                "speech2": "\"Why do ducks float??\"",
                "caption": "\"Every open tab is an emotional support document that must never be closed.\"",
                "svg1": "\n        <svg viewBox=\"0 0 150 80\" width=\"100%\" height=\"100%\" xmlns=\"http://www.w3.org/2000/svg\">\n            <line x1=\"8\" y1=\"64\" x2=\"142\" y2=\"64\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <!-- Clean single-tab browser window -->\n            <rect x=\"18\" y=\"20\" width=\"46\" height=\"34\" rx=\"2\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <rect x=\"18\" y=\"20\" width=\"46\" height=\"8\" fill=\"var(--ink)\"/>\n            <rect x=\"22\" y=\"22\" width=\"16\" height=\"4\" rx=\"1\" fill=\"var(--paper)\"/>\n            <circle cx=\"41\" cy=\"38\" r=\"6\" fill=\"none\" stroke=\"var(--ink)\" stroke-width=\"1.5\"/>\n            <line x1=\"45\" y1=\"42\" x2=\"49\" y2=\"46\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <!-- Gator sitting calmly -->\n            <path d=\"M84 64 L84 36 Q92 26 108 26 Q120 26 124 36 L124 64 Z\" fill=\"#40916c\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <circle cx=\"100\" cy=\"30\" r=\"4\" fill=\"white\" stroke=\"var(--ink)\" stroke-width=\"1.5\"/>\n            <circle cx=\"101\" cy=\"30\" r=\"1.6\" fill=\"var(--ink)\"/>\n        </svg>",
                "svg2": "\n        <svg viewBox=\"0 0 150 80\" width=\"100%\" height=\"100%\" xmlns=\"http://www.w3.org/2000/svg\">\n            <line x1=\"8\" y1=\"64\" x2=\"142\" y2=\"64\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <!-- Overloaded browser window with micro-tabs -->\n            <rect x=\"14\" y=\"16\" width=\"56\" height=\"38\" rx=\"2\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <!-- Tab row packed solid -->\n            <rect x=\"14\" y=\"16\" width=\"56\" height=\"8\" fill=\"#b91c1c\"/>\n            <line x1=\"18\" y1=\"16\" x2=\"18\" y2=\"24\" stroke=\"white\" stroke-width=\"1\"/>\n            <line x1=\"22\" y1=\"16\" x2=\"22\" y2=\"24\" stroke=\"white\" stroke-width=\"1\"/>\n            <line x1=\"26\" y1=\"16\" x2=\"26\" y2=\"24\" stroke=\"white\" stroke-width=\"1\"/>\n            <line x1=\"30\" y1=\"16\" x2=\"30\" y2=\"24\" stroke=\"white\" stroke-width=\"1\"/>\n            <line x1=\"34\" y1=\"16\" x2=\"34\" y2=\"24\" stroke=\"white\" stroke-width=\"1\"/>\n            <line x1=\"38\" y1=\"16\" x2=\"38\" y2=\"24\" stroke=\"white\" stroke-width=\"1\"/>\n            <line x1=\"42\" y1=\"16\" x2=\"42\" y2=\"24\" stroke=\"white\" stroke-width=\"1\"/>\n            <line x1=\"46\" y1=\"16\" x2=\"46\" y2=\"24\" stroke=\"white\" stroke-width=\"1\"/>\n            <line x1=\"50\" y1=\"16\" x2=\"50\" y2=\"24\" stroke=\"white\" stroke-width=\"1\"/>\n            <line x1=\"54\" y1=\"16\" x2=\"54\" y2=\"24\" stroke=\"white\" stroke-width=\"1\"/>\n            <line x1=\"58\" y1=\"16\" x2=\"58\" y2=\"24\" stroke=\"white\" stroke-width=\"1\"/>\n            <line x1=\"62\" y1=\"16\" x2=\"62\" y2=\"24\" stroke=\"white\" stroke-width=\"1\"/>\n            <line x1=\"66\" y1=\"16\" x2=\"66\" y2=\"24\" stroke=\"white\" stroke-width=\"1\"/>\n            <!-- Duck drawing on screen -->\n            <ellipse cx=\"42\" cy=\"36\" rx=\"6\" ry=\"4\" fill=\"#eab308\"/>\n            <circle cx=\"46\" cy=\"33\" r=\"3\" fill=\"#eab308\"/>\n            <!-- Gator lost in rabbit hole -->\n            <path d=\"M88 64 L88 34 Q98 24 114 24 Q126 24 130 34 L130 64 Z\" fill=\"#40916c\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <circle cx=\"106\" cy=\"28\" r=\"5\" fill=\"white\" stroke=\"var(--ink)\" stroke-width=\"1.5\"/>\n            <circle cx=\"106\" cy=\"28\" r=\"2\" fill=\"var(--ink)\"/>\n            <text x=\"100\" y=\"16\" font-family=\"'Space Mono', monospace\" font-size=\"9\" fill=\"#b91c1c\">?!</text>\n        </svg>"
        },
        {
                "title": "EP. 8: THE 11:59 SURGE",
                "tag1": "PANEL 1 • 11:58 PM",
                "speech1": "\"All hope is lost.\"",
                "tag2": "PANEL 2 • 11:59 PM",
                "speech2": "\"10,000 WPM UNLEASHED!\"",
                "caption": "\"Panic is nature's ultimate performance-enhancing drug.\"",
                "svg1": "\n        <svg viewBox=\"0 0 150 80\" width=\"100%\" height=\"100%\" xmlns=\"http://www.w3.org/2000/svg\">\n            <line x1=\"8\" y1=\"64\" x2=\"142\" y2=\"64\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <!-- Clock 11:58 -->\n            <rect x=\"18\" y=\"24\" width=\"34\" height=\"18\" rx=\"2\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <text x=\"35\" y=\"36\" font-family=\"'Space Mono', monospace\" font-size=\"7\" font-weight=\"900\" text-anchor=\"middle\" fill=\"#b91c1c\">11:58</text>\n            <!-- Gator weeping in despair -->\n            <path d=\"M78 64 Q84 48 106 48 Q128 48 132 64 Z\" fill=\"#40916c\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <!-- Tears streaming -->\n            <path d=\"M96 52 C94 56 94 62 96 64 M108 52 C110 56 110 62 108 64\" stroke=\"#38bdf8\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n        </svg>",
                "svg2": "\n        <svg viewBox=\"0 0 150 80\" width=\"100%\" height=\"100%\" xmlns=\"http://www.w3.org/2000/svg\">\n            <line x1=\"8\" y1=\"64\" x2=\"142\" y2=\"64\" stroke=\"var(--ink)\" stroke-width=\"2\"/>\n            <!-- 11:59 Clock -->\n            <rect x=\"8\" y=\"16\" width=\"32\" height=\"16\" rx=\"2\" fill=\"#b91c1c\"/>\n            <text x=\"24\" y=\"27\" font-family=\"'Space Mono', monospace\" font-size=\"6.5\" font-weight=\"900\" text-anchor=\"middle\" fill=\"white\">11:59</text>\n            <!-- Flames around keyboard -->\n            <path d=\"M26 62 Q28 50 32 54 Q36 44 40 56 Q44 48 48 62 Z\" fill=\"#f97316\"/>\n            <!-- Keyboard with smoke -->\n            <rect x=\"24\" y=\"58\" width=\"28\" height=\"6\" rx=\"1\" fill=\"var(--ink)\"/>\n            <!-- Multitasking God Mode Gator with 6 arms typing at lightspeed -->\n            <path d=\"M82 64 L82 32 Q92 20 108 20 Q122 20 126 32 L126 64 Z\" fill=\"#40916c\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <!-- Intense glowing eyes -->\n            <circle cx=\"98\" cy=\"26\" r=\"6\" fill=\"#facc15\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <circle cx=\"98\" cy=\"26\" r=\"2\" fill=\"var(--ink)\"/>\n            <circle cx=\"112\" cy=\"26\" r=\"6\" fill=\"#facc15\" stroke=\"var(--ink)\" stroke-width=\"1.8\"/>\n            <circle cx=\"112\" cy=\"26\" r=\"2\" fill=\"var(--ink)\"/>\n            <!-- Multi-arm blur lines -->\n            <path d=\"M82 36 L48 52 M82 42 L52 56 M82 48 L46 60 M124 36 L144 48 M124 42 L142 54 M124 48 L140 60\" stroke=\"var(--ink)\" stroke-width=\"2.2\" stroke-linecap=\"round\"/>\n            <text x=\"64\" y=\"24\" font-family=\"'Space Mono', monospace\" font-size=\"12\" fill=\"#eab308\">⚡</text>\n            <text x=\"126\" y=\"20\" font-family=\"'Space Mono', monospace\" font-size=\"12\" fill=\"#eab308\">⚡</text>\n        </svg>"
        }
];

    let comicIdx = 0;
    const comicTitleEl = document.getElementById('comic-title');
    const comicTag1El = document.getElementById('comic-panel-tag-1');
    const comicArt1El = document.getElementById('comic-art-1');
    const comicSpeech1El = document.getElementById('comic-speech-1');
    const comicTag2El = document.getElementById('comic-panel-tag-2');
    const comicArt2El = document.getElementById('comic-art-2');
    const comicSpeech2El = document.getElementById('comic-speech-2');
    const comicCaptionEl = document.getElementById('comic-caption');
    const comicPageNumEl = document.getElementById('comic-page-num');
    const comicPrevBtn = document.getElementById('comic-prev-btn');
    const comicNextBtn = document.getElementById('comic-next-btn');
    const comicRandomBtn = document.getElementById('comic-random-btn');
    const comicCopyBtn = document.getElementById('comic-copy-btn');
    const comicStripContainer = document.querySelector('.comic-strip-container');

    const renderComic = (idx, animate = false) => {
        const item = COMIC_STRIPS[idx];
        if (!item) return;
        if (comicTitleEl) comicTitleEl.textContent = item.title;
        if (comicTag1El) comicTag1El.textContent = item.tag1;
        if (comicArt1El) comicArt1El.innerHTML = item.svg1;
        if (comicSpeech1El) comicSpeech1El.textContent = item.speech1;
        if (comicTag2El) comicTag2El.textContent = item.tag2;
        if (comicArt2El) comicArt2El.innerHTML = item.svg2;
        if (comicSpeech2El) comicSpeech2El.textContent = item.speech2;
        if (comicCaptionEl) comicCaptionEl.textContent = item.caption;
        if (comicPageNumEl) comicPageNumEl.textContent = `STRIP ${idx + 1} OF ${COMIC_STRIPS.length}`;

        if (animate && comicStripContainer) {
            comicStripContainer.style.opacity = '0.35';
            comicStripContainer.style.transform = 'scale(0.99)';
            comicStripContainer.style.transition = 'opacity 0.12s ease, transform 0.12s ease';
            setTimeout(() => {
                comicStripContainer.style.opacity = '1';
                comicStripContainer.style.transform = 'scale(1)';
            }, 50);
        }
    };

    renderComic(comicIdx, false);

    if (comicPrevBtn) {
        comicPrevBtn.addEventListener('click', () => {
            comicIdx = (comicIdx - 1 + COMIC_STRIPS.length) % COMIC_STRIPS.length;
            renderComic(comicIdx, true);
        });
    }

    if (comicNextBtn) {
        comicNextBtn.addEventListener('click', () => {
            comicIdx = (comicIdx + 1) % COMIC_STRIPS.length;
            renderComic(comicIdx, true);
        });
    }

    if (comicRandomBtn) {
        comicRandomBtn.addEventListener('click', () => {
            if (COMIC_STRIPS.length <= 1) return;
            let nextIdx;
            do {
                nextIdx = Math.floor(Math.random() * COMIC_STRIPS.length);
            } while (nextIdx === comicIdx);
            comicIdx = nextIdx;
            renderComic(comicIdx, true);
        });
    }

    if (comicCopyBtn) {
        comicCopyBtn.addEventListener('click', async () => {
            const item = COMIC_STRIPS[comicIdx];
            if (!item) return;
            const copyMsg = `📰 *THE CHRONICLES OF LATER GATOR* — ${item.title}\n` +
                `[${item.tag1}]: ${item.speech1}\n` +
                `[${item.tag2}]: ${item.speech2}\n` +
                `> "${item.caption.replace(/^"|"$/g, '')}"\n` +
                `— via LaterGator.live`;
            try {
                await navigator.clipboard.writeText(copyMsg);
                comicCopyBtn.textContent = "COPIED! ✓";
                setTimeout(() => { comicCopyBtn.textContent = "📋 COPY"; }, 2000);
            } catch (e) {
                comicCopyBtn.textContent = "COPIED!";
                setTimeout(() => { comicCopyBtn.textContent = "📋 COPY"; }, 2000);
            }
        });
    }

    // High-performance video facade: click-to-load YouTube player
    const initVideoFacade = () => {
        const facade = document.getElementById('video-wrapper');
        if (!facade) return;
        const mountVideo = () => {
            const videoId = facade.getAttribute('data-video-id') || 'lry0hAerJs4';
            facade.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" title="Introducing Later, Gator!" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
            facade.classList.remove('video-facade');
            facade.removeAttribute('role');
            facade.removeAttribute('tabindex');
        };
        facade.addEventListener('click', mountVideo, { once: true });
        facade.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                mountVideo();
            }
        }, { once: true });
    };

    // Stale-While-Revalidate bootstrap from localStorage (instant 0ms first render)
    const restoreCachedData = () => {
        try {
            // 1. Stats
            const cachedStats = localStorage.getItem('lg_cached_stats');
            if (cachedStats) {
                const stats = JSON.parse(cachedStats);
                if (statCurrent && stats.currentlyProcrastinating != null) {
                    updateStat('stat-current', stats.currentlyProcrastinating.toLocaleString());
                }
                if (statTotal && stats.totalPostponed != null) {
                    updateStat('stat-total', stats.totalPostponed.toLocaleString());
                }
                if (statVisitors && stats.totalVisitors != null) {
                    updateStat('stat-visitors', stats.totalVisitors.toString().padStart(4, '0'));
                }
            }
            // 2. Feed & ticker
            const cachedTasks = localStorage.getItem('lg_cached_tasks');
            if (cachedTasks) {
                const tasks = JSON.parse(cachedTasks);
                if (Array.isArray(tasks) && tasks.length > 0) {
                    renderFeed(tasks);
                    renderTicker(tasks);
                    renderLeadStory(tasks);
                }
            }
            // 3. Weekly shame
            const cachedWeekly = localStorage.getItem('lg_cached_weekly');
            if (cachedWeekly) {
                const data = JSON.parse(cachedWeekly);
                if (data && data.count > 0 && typeof data.text === 'string' && data.text.trim() && shameContainer && shameTask && shameCount) {
                    let taskName = data.text;
                    if (taskName.startsWith('[PANIC] ')) taskName = taskName.replace('[PANIC] ', '');
                    shameContainer.style.display = 'block';
                    shameTask.innerHTML = `"${censorNsfwHtml(escapeHtml(taskName))}"`;
                    shameCount.textContent = data.count;
                }
            }
            // 4. Countries
            const cachedCountries = localStorage.getItem('lg_cached_countries');
            if (cachedCountries && countryLeaderboard) {
                const countries = JSON.parse(cachedCountries);
                if (Array.isArray(countries) && countries.length > 0) {
                    countryLeaderboard.innerHTML = countries.map((c, index) => {
                        const rank = String(index + 1).padStart(2, '0');
                        const cName = typeof c === 'string' ? c : (c && c.country ? c.country : 'PARTS UNKNOWN');
                        const cCount = typeof c === 'object' && c && c.count != null ? c.count : '';
                        return `
                        <div class="leaderboard-row">
                            <span class="leaderboard-rank">${rank}.</span>
                            <span class="leaderboard-country" title="${escapeHtml(cName)}">${escapeHtml(cName)}</span>
                            <span class="leaderboard-dots"></span>
                            <span class="leaderboard-count">${cCount}</span>
                        </div>
                        `;
                    }).join('');
                }
            }
        } catch (e) {}
    };

    // Decoupled Smart Polling (Standard-Time Automatic Cadence + Page Visibility)
    let heartbeatTimer = null;
    let tasksPollTimer = null;
    let statsPollTimer = null;
    let slowPollTimer = null;
    let timeTickerTimer = null;

    const startAllPolling = () => {
        stopAllPolling();
        // 0. Non-blocking presence heartbeat: 25s interval
        heartbeatTimer = setInterval(sendHeartbeat, 25000);
        // 1. Live Public Wire transmissions: standard 15s interval
        tasksPollTimer = setInterval(fetchTasks, 15000);
        // 2. Active user & total procrastination stats: 30s interval
        statsPollTimer = setInterval(fetchStats, 30000);
        // 3. Weekly shame & country leaderboard: 60s interval
        slowPollTimer = setInterval(() => {
            fetchWeeklyStats();
            fetchCountries();
        }, 60000);
        // 4. In-place relative timestamps updater: 30s interval
        timeTickerTimer = setInterval(updateRelativeTimestamps, 30000);
    };

    const stopAllPolling = () => {
        if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
        if (tasksPollTimer) { clearInterval(tasksPollTimer); tasksPollTimer = null; }
        if (statsPollTimer) { clearInterval(statsPollTimer); statsPollTimer = null; }
        if (slowPollTimer) { clearInterval(slowPollTimer); slowPollTimer = null; }
        if (timeTickerTimer) { clearInterval(timeTickerTimer); timeTickerTimer = null; }
    };

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAllPolling();
        } else {
            // Immediately refresh transmissions and stats when returning to the tab
            sendHeartbeat();
            fetchTasks();
            fetchStats();
            updateRelativeTimestamps();
            startAllPolling();
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
        startAllPolling();
    });

    // ==========================================
    // BUREAU OPERATIVE & THE DOSSIER (HN-STYLE AUTH)
    // ==========================================

    const bureauModal = document.getElementById('bureau-modal');
    const bureauBackdrop = document.getElementById('bureau-backdrop');
    const bureauCloseBtn = document.getElementById('bureau-close-btn');
    const headerAuthBtn = document.getElementById('header-auth-btn');
    const shareDossierPrompt = document.getElementById('share-dossier-prompt');
    const shareDossierMsg = document.getElementById('share-dossier-msg');
    const shareDossierBtn = document.getElementById('share-dossier-btn');

    const bureauGuestEl = document.getElementById('bureau-guest');
    const bureauOperativeEl = document.getElementById('bureau-operative');
    const bureauOpTagEl = document.getElementById('bureau-op-tag');
    const bureauLogoutBtn = document.getElementById('bureau-logout-btn');
    const dossierSummaryEl = document.getElementById('dossier-summary');
    const dossierListEl = document.getElementById('dossier-list');
    const dossierEmptyEl = document.getElementById('dossier-empty');

    const bureauTagInput = document.getElementById('bureau-tag-input');
    const bureauTagStatus = document.getElementById('bureau-tag-status');
    const bureauPwInput = document.getElementById('bureau-pw-input');
    const bureauEmailInput = document.getElementById('bureau-email-input');
    const bureauClaimBtn = document.getElementById('bureau-claim-btn');
    const bureauClaimError = document.getElementById('bureau-claim-error');

    const bureauLoginTag = document.getElementById('bureau-login-tag');
    const bureauLoginPw = document.getElementById('bureau-login-pw');
    const bureauLoginBtn = document.getElementById('bureau-login-btn');
    const bureauLoginError = document.getElementById('bureau-login-error');

    const bureauTabs = document.querySelectorAll('.bureau-tab');
    const bureauFormClaim = document.getElementById('bureau-form-claim');
    const bureauFormLogin = document.getElementById('bureau-form-login');

    let tagCheckTimeout = null;
    let isTagValid = false;

    openBureauModal = (preferredTab = null) => {
        if (!bureauModal) return;
        closeCredentialModal();
        closeClippingModal();
        bureauModal.style.display = 'flex';
        syncModalOverflow();

        if (preferredTab && bureauTabs) {
            bureauTabs.forEach(t => {
                if (t.getAttribute('data-btab') === preferredTab) {
                    t.click();
                }
            });
        }
        if (currentGator && gatorToken) {
            window.fetchDossier();
        }
    };
    window.openBureauModal = openBureauModal;

    closeBureauModal = () => {
        if (!bureauModal) return;
        bureauModal.style.display = 'none';
        syncModalOverflow();
    };
    window.closeBureauModal = closeBureauModal;

    window.fetchDossier = async () => {
        if (!gatorToken || !dossierListEl) return;
        try {
            const res = await fetch(`/api/gator?action=dossier&token=${encodeURIComponent(gatorToken)}`);
            if (res.status === 401) {
                logoutGator(false);
                return;
            }
            if (!res.ok) return;
            const data = await res.json();
            if (!data || !data.dispatches) return;

            const count = data.dispatches.length;
            const total = data.totalSympathy || 0;
            postponementsCount = Math.max(postponementsCount, count);
            clickerCount = postponementsCount;
            totalSympathyCount = Math.max(totalSympathyCount, total);
            window.postponementsCount = postponementsCount;
            window.totalSympathyCount = totalSympathyCount;
            try {
                localStorage.setItem('lg_postponements_count', postponementsCount.toString());
                localStorage.setItem('lg_total_sympathy', totalSympathyCount.toString());
            } catch (e) {}

            const operativeRank = getSlackerRank(postponementsCount, totalSympathyCount, timeStolenSeconds).replace('RANK: ', '');
            if (dossierSummaryEl) {
                dossierSummaryEl.textContent = `${count} ${count === 1 ? 'DISPATCH' : 'DISPATCHES'} • ${total} SYMPATHY • ${operativeRank}`;
            }

            if (count === 0) {
                if (dossierEmptyEl) dossierEmptyEl.style.display = 'block';
                dossierListEl.innerHTML = '';
            } else {
                let idsUpdated = false;
                data.dispatches.forEach(d => {
                    const nid = Number(d.id);
                    if (!isNaN(nid) && !myTaskIds.includes(nid)) {
                        myTaskIds.push(nid);
                        idsUpdated = true;
                    }
                });
                if (idsUpdated) {
                    window.myTaskIds = myTaskIds;
                    try { localStorage.setItem('lg_my_task_ids', JSON.stringify(myTaskIds)); } catch (e) {}
                    if (feedContainer) {
                        myTaskIds.forEach(id => {
                            const item = feedContainer.querySelector(`.feed-item[data-task-id="${id}"]`);
                            if (item && !item.querySelector('.feed-shred-btn')) {
                                const rx = item.querySelector('.feed-reactions');
                                if (rx) {
                                    const btn = document.createElement('button');
                                    btn.type = 'button';
                                    btn.className = 'feed-shred-btn';
                                    btn.setAttribute('data-task-id', String(id));
                                    btn.title = 'Expunge & Shred This Dispatch from the Wire';
                                    btn.setAttribute('aria-label', 'Shred Dispatch');
                                    btn.innerHTML = '🗄️ SHRED';
                                    rx.appendChild(btn);
                                }
                            }
                        });
                    }
                }
                if (dossierEmptyEl) dossierEmptyEl.style.display = 'none';
                dossierListEl.innerHTML = data.dispatches.map(t => {
                    const taskText = escapeHtml(t.task || t.text || '');
                    const same = t.same_count || 0;
                    const valid = t.valid_count || 0;
                    const rip = t.rip_count || 0;
                    return `
                        <div class="dossier-item" data-task-id="${t.id}">
                            <div class="dossier-item-task">"${taskText}"</div>
                            <div class="dossier-item-counts">
                                <span>[ SAME: ${same} ]</span>
                                <span>[ VALID: ${valid} ]</span>
                                <span>[ RIP: ${rip} ]</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch (e) {}
    };

    const updateBureauUI = () => {
        // Update top-right header button (HackerNews-style)
        if (headerAuthBtn) {
            if (currentGator && gatorToken) {
                headerAuthBtn.textContent = `[@${currentGator.displayTag || currentGator.tag}]`;
                headerAuthBtn.setAttribute('title', `Operative @${currentGator.displayTag || currentGator.tag} — Click to view Dossier`);
            } else {
                headerAuthBtn.textContent = '[ LOGIN ]';
                headerAuthBtn.setAttribute('title', 'Bureau of Idleness — Sign in or Claim Tag');
            }
        }

        // Update post-submission share prompt
        if (shareDossierMsg && shareDossierBtn) {
            if (currentGator && gatorToken) {
                shareDossierMsg.textContent = 'Dispatch recorded under your tag.';
                shareDossierBtn.textContent = '[ View Dossier ]';
            } else {
                shareDossierMsg.textContent = 'Want to track this confession?';
                shareDossierBtn.textContent = '[ Claim a Gator Tag ]';
            }
        }

        // Update modal body
        if (currentGator && gatorToken) {
            if (bureauGuestEl) bureauGuestEl.style.display = 'none';
            if (bureauOperativeEl) bureauOperativeEl.style.display = 'block';
            if (bureauOpTagEl) {
                bureauOpTagEl.textContent = `OPERATIVE: @${currentGator.displayTag || currentGator.tag}`;
            }
            const userNameInput = document.getElementById('user-name');
            if (userNameInput && !userNameInput.value.trim()) {
                userNameInput.value = `@${currentGator.displayTag || currentGator.tag}`;
            }
            window.fetchDossier();
        } else {
            if (bureauGuestEl) bureauGuestEl.style.display = 'block';
            if (bureauOperativeEl) bureauOperativeEl.style.display = 'none';
        }
    };

    const logoutGator = async (callApi = true) => {
        if (callApi && gatorToken) {
            fetch('/api/gator?action=logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: gatorToken })
            }).catch(() => {});
        }
        localStorage.removeItem('lg_gator_token');
        localStorage.removeItem('lg_gator_user');
        gatorToken = null;
        currentGator = null;
        window.currentGator = null;
        updateBureauUI();
    };

    const initBureauAuth = () => {
        // Wire opening and closing modal
        if (headerAuthBtn) {
            headerAuthBtn.addEventListener('click', () => openBureauModal());
        }
        if (shareDossierBtn) {
            shareDossierBtn.addEventListener('click', () => {
                if (currentGator && gatorToken) {
                    openBureauModal();
                } else {
                    openBureauModal('claim');
                }
            });
        }
        if (bureauCloseBtn) bureauCloseBtn.addEventListener('click', closeBureauModal);
        if (bureauBackdrop) bureauBackdrop.addEventListener('click', closeBureauModal);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && bureauModal && bureauModal.style.display !== 'none') {
                closeBureauModal();
            }
        });

        // 1. Check existing session
        if (gatorToken) {
            fetch(`/api/gator?action=me&token=${encodeURIComponent(gatorToken)}`)
                .then(r => r.json())
                .then(data => {
                    if (data && data.ok) {
                        currentGator = {
                            gatorId: data.gatorId,
                            tag: data.tag,
                            displayTag: data.displayTag,
                            notifyEmail: data.notifyEmail
                        };
                        localStorage.setItem('lg_gator_user', JSON.stringify(currentGator));
                        window.currentGator = currentGator;
                        updateBureauUI();
                        syncSessionReactionsFromServer();
                    } else {
                        logoutGator(false);
                    }
                })
                .catch(() => updateBureauUI());
        } else {
            updateBureauUI();
        }

        // 2. Tab switching inside modal
        bureauTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                bureauTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const mode = tab.getAttribute('data-btab');
                if (mode === 'login') {
                    if (bureauFormClaim) bureauFormClaim.style.display = 'none';
                    if (bureauFormLogin) bureauFormLogin.style.display = 'flex';
                } else {
                    if (bureauFormClaim) bureauFormClaim.style.display = 'flex';
                    if (bureauFormLogin) bureauFormLogin.style.display = 'none';
                }
                if (bureauClaimError) bureauClaimError.textContent = '';
                if (bureauLoginError) bureauLoginError.textContent = '';
            });
        });

        // 3. Live Tag Check
        const checkTagAvailability = () => {
            const raw = (bureauTagInput?.value || '').trim();
            if (raw.length < 3) {
                isTagValid = false;
                if (bureauTagStatus) bureauTagStatus.textContent = '';
                if (bureauClaimBtn) bureauClaimBtn.disabled = true;
                if (bureauClaimError) bureauClaimError.textContent = '';
                return;
            }

            if (!/^[a-zA-Z0-9_]+$/.test(raw)) {
                isTagValid = false;
                if (bureauTagStatus) bureauTagStatus.textContent = '❌';
                if (bureauClaimError) bureauClaimError.textContent = 'Only letters, numbers, and underscores.';
                if (bureauClaimBtn) bureauClaimBtn.disabled = true;
                return;
            }

            if (bureauTagStatus) bureauTagStatus.textContent = '⏳';
            if (bureauClaimError) bureauClaimError.textContent = '';

            fetch(`/api/gator?action=check&tag=${encodeURIComponent(raw)}`)
                .then(r => r.json())
                .then(data => {
                    if (data.available) {
                        isTagValid = true;
                        if (bureauTagStatus) bureauTagStatus.textContent = '✅';
                        if (bureauClaimError) bureauClaimError.textContent = '';
                        validateClaimForm();
                    } else {
                        isTagValid = false;
                        if (bureauTagStatus) bureauTagStatus.textContent = '❌';
                        if (bureauClaimError) bureauClaimError.textContent = data.reason || 'Occupied. Someone claimed that tag first.';
                        if (bureauClaimBtn) bureauClaimBtn.disabled = true;
                    }
                })
                .catch(() => {
                    if (bureauTagStatus) bureauTagStatus.textContent = '';
                });
        };

        const validateClaimForm = () => {
            const pw = bureauPwInput?.value || '';
            const canSubmit = isTagValid && pw.length >= 8;
            if (bureauClaimBtn) bureauClaimBtn.disabled = !canSubmit;
        };

        if (bureauTagInput) {
            bureauTagInput.addEventListener('input', () => {
                clearTimeout(tagCheckTimeout);
                tagCheckTimeout = setTimeout(checkTagAvailability, 320);
            });
        }

        if (bureauPwInput) {
            bureauPwInput.addEventListener('input', validateClaimForm);
        }

        // 4. Claim (Sign Up) Submit
        if (bureauClaimBtn) {
            bureauClaimBtn.addEventListener('click', async () => {
                const tag = (bureauTagInput?.value || '').trim();
                const password = bureauPwInput?.value || '';
                const email = (bureauEmailInput?.value || '').trim();

                if (!tag || password.length < 8) return;

                bureauClaimBtn.disabled = true;
                bureauClaimBtn.textContent = '[ CLAIMING... ]';
                if (bureauClaimError) bureauClaimError.textContent = '';

                try {
                    const res = await fetch('/api/gator?action=claim', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tag, password, email, sessionId: SESSION_ID })
                    });
                    const data = await res.json();
                    if (res.ok && data.ok) {
                        gatorToken = data.token;
                        currentGator = {
                            gatorId: data.gatorId,
                            tag: data.tag,
                            displayTag: data.displayTag,
                            notifyEmail: data.notifyEmail
                        };
                        localStorage.setItem('lg_gator_token', gatorToken);
                        localStorage.setItem('lg_gator_user', JSON.stringify(currentGator));
                        window.currentGator = currentGator;
                        updateBureauUI();
                        syncSessionReactionsFromServer();
                        playStampSlamSound();
                    } else {
                        if (bureauClaimError) {
                            bureauClaimError.textContent = data.error || 'Failed to claim tag. Try again.';
                        }
                    }
                } catch (e) {
                    if (bureauClaimError) bureauClaimError.textContent = 'Telegraph line down. Try again.';
                } finally {
                    if (bureauClaimBtn) {
                        bureauClaimBtn.textContent = '[ CLAIM MY TAG ]';
                        validateClaimForm();
                    }
                }
            });
        }

        // 5. Login (Sign In) Submit
        if (bureauLoginBtn) {
            bureauLoginBtn.addEventListener('click', async () => {
                const tag = (bureauLoginTag?.value || '').trim();
                const password = bureauLoginPw?.value || '';

                if (!tag || !password) {
                    if (bureauLoginError) bureauLoginError.textContent = 'Tag and password are required.';
                    return;
                }

                bureauLoginBtn.disabled = true;
                bureauLoginBtn.textContent = '[ REPORTING... ]';
                if (bureauLoginError) bureauLoginError.textContent = '';

                try {
                    const res = await fetch('/api/gator?action=login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tag, password })
                    });
                    const data = await res.json();
                    if (res.ok && data.ok) {
                        gatorToken = data.token;
                        currentGator = {
                            gatorId: data.gatorId,
                            tag: data.tag,
                            displayTag: data.displayTag,
                            notifyEmail: data.notifyEmail
                        };
                        localStorage.setItem('lg_gator_token', gatorToken);
                        localStorage.setItem('lg_gator_user', JSON.stringify(currentGator));
                        window.currentGator = currentGator;
                        updateBureauUI();
                        syncSessionReactionsFromServer();
                        playStampSlamSound();
                    } else {
                        if (bureauLoginError) {
                            bureauLoginError.textContent = data.error || 'Invalid credentials.';
                        }
                    }
                } catch (e) {
                    if (bureauLoginError) bureauLoginError.textContent = 'Telegraph line down. Try again.';
                } finally {
                    if (bureauLoginBtn) {
                        bureauLoginBtn.disabled = false;
                        bureauLoginBtn.textContent = '[ REPORT FOR DUTY ]';
                    }
                }
            });
        }

        // 6. Logout
        if (bureauLogoutBtn) {
            bureauLogoutBtn.addEventListener('click', () => {
                logoutGator(true);
            });
        }
    };

    // ==========================================
    // MOBILE VIEW SEGMENTED CONTROLLER (v3.0.0)
    // ==========================================
    const initMobileSegmentedController = () => {
        const tabDispatchBtn = document.getElementById('tab-dispatch-btn');
        const tabWireBtn = document.getElementById('tab-wire-btn');
        const tabStatsBtn = document.getElementById('tab-stats-btn');
        const mobileFabPost = document.getElementById('mobile-fab-post');
        const shareViewWireBtn = document.getElementById('share-view-wire-btn');

        const ALL_TABS = ['dispatch', 'wire', 'stats'];

        const setMobileTab = (tabName, smoothScroll = true) => {
            if (window.innerWidth > 768) return; // Keep desktop unconstrained

            // Remove all mobile-view-* body classes
            document.body.classList.remove('mobile-view-dispatch', 'mobile-view-wire', 'mobile-view-stats');

            // Deactivate all tab buttons
            if (tabDispatchBtn) tabDispatchBtn.classList.remove('active');
            if (tabWireBtn) tabWireBtn.classList.remove('active');
            if (tabStatsBtn) tabStatsBtn.classList.remove('active');

            if (tabName === 'wire') {
                document.body.classList.add('mobile-view-wire');
                if (tabWireBtn) tabWireBtn.classList.add('active');
            } else if (tabName === 'stats') {
                document.body.classList.add('mobile-view-stats');
                if (tabStatsBtn) tabStatsBtn.classList.add('active');
            } else {
                document.body.classList.add('mobile-view-dispatch');
                if (tabDispatchBtn) tabDispatchBtn.classList.add('active');
                tabName = 'dispatch';
            }

            try { sessionStorage.setItem('lg_mobile_tab', tabName); } catch(e) {}
            // Instant, non-blocking viewport reset (no sluggish scroll delay)
            if (smoothScroll && window.scrollY > 0) {
                window.scrollTo(0, 0);
            }
            if (typeof updateJumpLatestVisibility === 'function') updateJumpLatestVisibility(true);
        };

        if (tabDispatchBtn) {
            tabDispatchBtn.addEventListener('click', () => {
                if (navigator.vibrate) { try { navigator.vibrate(8); } catch(e) {} }
                setMobileTab('dispatch');
            });
        }
        if (tabWireBtn) {
            tabWireBtn.addEventListener('click', () => {
                if (navigator.vibrate) { try { navigator.vibrate(8); } catch(e) {} }
                setMobileTab('wire');
            });
        }
        if (tabStatsBtn) {
            tabStatsBtn.addEventListener('click', () => {
                if (navigator.vibrate) { try { navigator.vibrate(8); } catch(e) {} }
                setMobileTab('stats');
            });
        }
        if (mobileFabPost) {
            mobileFabPost.addEventListener('click', () => {
                setMobileTab('dispatch');
                if (taskInput) {
                    setTimeout(() => taskInput.focus(), 150);
                }
            });
        }
        if (shareViewWireBtn) {
            shareViewWireBtn.addEventListener('click', () => {
                if (shareCard) shareCard.style.display = 'none';
                setMobileTab('wire');
            });
        }

        // Initialize state on mobile screens
        if (window.innerWidth <= 768) {
            const savedTab = (() => {
                try { return sessionStorage.getItem('lg_mobile_tab'); } catch(e) { return null; }
            })();
            const validTabs = ['wire', 'stats'];
            setMobileTab(validTabs.includes(savedTab) ? savedTab : 'dispatch', false);
        }

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                document.body.classList.remove('mobile-view-dispatch', 'mobile-view-wire', 'mobile-view-stats');
            } else if (!ALL_TABS.some(t => document.body.classList.contains(`mobile-view-${t}`))) {
                setMobileTab('dispatch', false);
            }
        });

        // Expose globally for share card or external dispatch transitions
        window.setMobileTab = setMobileTab;
    };

    // ═══════════════════════════════════════════════════════════════════
    // BUREAU OF IDLENESS — NEW OPERATIVE GREETINGS & CONFESSIONAL
    // ═══════════════════════════════════════════════════════════════════
    const initWelcomeMemo = () => {
        const memoEl = document.getElementById('welcome-memo');
        if (!memoEl) return;

        const backdropEl = document.getElementById('welcome-backdrop');
        const stage1 = document.getElementById('welcome-stage-1');
        const stage2 = document.getElementById('welcome-stage-2');
        const dispatchTextEl = document.getElementById('welcome-dispatch-text');
        const caseNoEl = document.getElementById('welcome-case-no');
        const stampInkEl = document.getElementById('welcome-stamp-ink');
        const skipTo2Btn = document.getElementById('welcome-skip-to-2');
        const taskInput = document.getElementById('welcome-task-input');
        const charCountEl = document.getElementById('welcome-char-count');
        const dispatchBtn = document.getElementById('welcome-dispatch-btn');
        const lurkBtn = document.getElementById('welcome-lurk-btn');
        const closeBtn = document.getElementById('memo-close-btn');
        const pillsWrap = document.getElementById('welcome-pills');

        // Curated roster of relatable, humorous delays for Step 1
        const sampleDispatches = [
            { text: '"I am currently deep-cleaning behind the refrigerator with a toothbrush to avoid filing my taxes."', case: '#LG-404', same: 42, valid: 89, rip: 14 },
            { text: '"Staring blankly at terminal cursor while researching ergonomic mechanical keyboards I cannot afford."', case: '#LG-712', same: 67, valid: 112, rip: 8 },
            { text: '"Organizing my desktop wallpaper into color-coded folders instead of preparing client presentation."', case: '#LG-883', same: 53, valid: 94, rip: 19 },
            { text: '"Rereading the same 3-sentence email draft 14 times while eating dry cereal directly from the box."', case: '#LG-905', same: 78, valid: 124, rip: 25 },
            { text: '"Watching a 45-minute YouTube documentary on medieval castle sieges to avoid folding the laundry mountain."', case: '#LG-319', same: 91, valid: 153, rip: 11 }
        ];

        // Pick a random sample dispatch
        const chosen = sampleDispatches[Math.floor(Math.random() * sampleDispatches.length)];
        if (dispatchTextEl) dispatchTextEl.textContent = chosen.text;
        if (caseNoEl) caseNoEl.textContent = chosen.case;
        const tallySame = document.getElementById('welcome-tally-same');
        const tallyValid = document.getElementById('welcome-tally-valid');
        const tallyRip = document.getElementById('welcome-tally-rip');
        if (tallySame) tallySame.textContent = String(chosen.same);
        if (tallyValid) tallyValid.textContent = String(chosen.valid);
        if (tallyRip) tallyRip.textContent = String(chosen.rip);

        let memoDismissed = false;

        const dismissMemo = () => {
            if (memoDismissed) return;
            memoDismissed = true;
            try { localStorage.setItem('lg_welcomed', '1'); } catch (e) {}
            memoEl.classList.add('memo-hiding');
            if (backdropEl) {
                backdropEl.classList.remove('active');
            }
            setTimeout(() => {
                memoEl.style.display = 'none';
                memoEl.classList.remove('memo-hiding');
                if (backdropEl) backdropEl.style.display = 'none';
            }, 320);
        };

        window.__lgDismissMemo = dismissMemo;

        const advanceToStep2 = () => {
            if (!stage1 || !stage2) return;
            stage1.classList.add('stage-fade-out');
            setTimeout(() => {
                stage1.style.display = 'none';
                stage1.classList.remove('stage-fade-out');
                stage2.style.display = 'block';
                stage2.classList.add('stage-fade-in');
                setTimeout(() => {
                    stage2.classList.remove('stage-fade-in');
                    if (taskInput) taskInput.focus();
                }, 300);
            }, 240);
        };

        // Handle Step 1 Stamp Clicks
        const stampBtns = stage1 ? stage1.querySelectorAll('.welcome-stamp-btn') : [];
        stampBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const stampType = btn.getAttribute('data-type');
                // Play rubber stamp slam sound
                if (window.GatorAudio && typeof window.GatorAudio.playStampSlamSound === 'function') {
                    window.GatorAudio.playStampSlamSound();
                } else if (typeof window.playStampSlamSound === 'function') {
                    window.playStampSlamSound();
                }

                // Increment tally visually
                const tallyEl = btn.querySelector('.stamp-tally');
                if (tallyEl) {
                    const current = parseInt(tallyEl.textContent, 10) || 0;
                    tallyEl.textContent = String(current + 1);
                }

                // Ink stamp overlay
                if (stampInkEl) {
                    const stampLabels = {
                        same: '★ SAME — FILED ★',
                        valid: '★ VALIDATED ★',
                        rip: '★ REST IN PEACE ★'
                    };
                    stampInkEl.textContent = stampLabels[stampType] || '★ SYMPATHY FILED ★';
                    stampInkEl.classList.remove('stamped');
                    void stampInkEl.offsetWidth; // trigger reflow
                    stampInkEl.classList.add('stamped');
                }

                btn.style.transform = 'scale(0.95)';
                setTimeout(() => { btn.style.transform = ''; }, 150);

                // Advance to Step 2 after the stamp impact has been appreciated
                setTimeout(advanceToStep2, 600);
            });
        });

        if (skipTo2Btn) {
            skipTo2Btn.addEventListener('click', advanceToStep2);
        }

        // Handle Step 2 Excuse Pills
        if (pillsWrap) {
            const pillBtns = pillsWrap.querySelectorAll('.welcome-pill-btn:not(.welcome-pill-random)');
            pillBtns.forEach(p => {
                p.addEventListener('click', () => {
                    const text = p.getAttribute('data-text') || p.textContent.trim();
                    if (taskInput) {
                        taskInput.value = text;
                        if (charCountEl) charCountEl.textContent = `${text.length} / 150`;
                        taskInput.focus();
                    }
                    if (window.GatorAudio && typeof window.GatorAudio.playKeyClick === 'function') {
                        window.GatorAudio.playKeyClick(false);
                    }
                });
            });

            const randomPill = document.getElementById('welcome-pill-random');
            if (randomPill) {
                const randomExcuses = [
                    "Cleaning the kitchen baseboards to avoid my thesis",
                    "Googling how to become a lighthouse keeper",
                    "Down a Wikipedia rabbit hole about Bronze Age collapse",
                    "Overthinking my entire 5-year career trajectory",
                    "Refactoring code that already works perfectly",
                    "Tidying up pencil drawer instead of writing essay",
                    "Researching espresso machines for 3 consecutive hours",
                    "Starting a new hobby to avoid finishing old projects"
                ];
                randomPill.addEventListener('click', () => {
                    const rand = randomExcuses[Math.floor(Math.random() * randomExcuses.length)];
                    if (taskInput) {
                        taskInput.value = rand;
                        if (charCountEl) charCountEl.textContent = `${rand.length} / 150`;
                        taskInput.focus();
                    }
                    if (window.GatorAudio && typeof window.GatorAudio.playKeyClick === 'function') {
                        window.GatorAudio.playKeyClick(false);
                    }
                });
            }
        }

        // Character count live update
        if (taskInput) {
            taskInput.addEventListener('input', () => {
                if (charCountEl) charCountEl.textContent = `${taskInput.value.length} / 150`;
            });
            taskInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (dispatchBtn) dispatchBtn.click();
                }
            });
        }

        // Handle Dispatch to Wire
        if (dispatchBtn) {
            dispatchBtn.addEventListener('click', () => {
                let conf = (taskInput ? taskInput.value : '').trim();
                if (!conf) {
                    conf = "Overthinking what to write on Later Gators";
                }

                // 1. Play pneumatic whoosh sound!
                if (window.GatorAudio && typeof window.GatorAudio.playPneumaticWhooshSound === 'function') {
                    window.GatorAudio.playPneumaticWhooshSound();
                }

                // 2. Set into main #task-input and trigger submitTask
                const mainInput = document.getElementById('task-input');
                if (mainInput) {
                    mainInput.value = conf;
                    mainInput.dispatchEvent(new Event('input', { bubbles: true }));
                }

                // Dismiss modal
                dismissMemo();

                // Trigger main submission
                if (typeof submitTask === 'function') {
                    submitTask(false);
                } else {
                    const laterBtn = document.getElementById('later-btn');
                    if (laterBtn) laterBtn.click();
                }

                // On mobile, switch to WIRE tab so the user sees their post immediately
                if (window.innerWidth <= 768 && typeof window.setMobileTab === 'function') {
                    setTimeout(() => {
                        window.setMobileTab('wire', true);
                    }, 400);
                }
            });
        }

        if (lurkBtn) {
            lurkBtn.addEventListener('click', dismissMemo);
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', dismissMemo);
        }

        const shouldShowMemo = () => {
            try {
                if (new URLSearchParams(window.location.search).get('nomemo') === '1') return false;
            } catch (e) {}
            try {
                if (localStorage.getItem('lg_welcomed')) return false;
            } catch (e) {}
            if (currentGator && gatorToken) return false;
            if (Object.keys(userStamps).length > 0) return false;
            return true;
        };

        if (!shouldShowMemo()) return;

        // Show after a short delay so page content loads first
        setTimeout(() => {
            if (Object.keys(userStamps).length > 0) return;
            if (currentGator && gatorToken) return;
            try { if (localStorage.getItem('lg_welcomed')) return; } catch (e) {}

            if (backdropEl) {
                backdropEl.style.display = 'block';
                requestAnimationFrame(() => {
                    backdropEl.classList.add('active');
                });
                backdropEl.addEventListener('click', dismissMemo);
            }
            memoEl.style.display = 'block';
            if (window.GatorAudio && typeof window.GatorAudio.playPaperShuffle === 'function') {
                window.GatorAudio.playPaperShuffle();
            }
        }, 700);

        // Server sync dismissal safeguard for returning operatives
        setTimeout(() => {
            if (Object.keys(userStamps).length > 0) {
                dismissMemo();
            }
        }, 2200);
    };

    initWelcomeMemo();
    initMobileSegmentedController();
    initBureauAuth();
    initVideoFacade();
    restoreCachedData();

    fetchAll();
    startAllPolling();

    // Internal diagnostics & testing hook
    window.__lg_feed = {
        renderFeed,
        updateRelativeTimestamps,
        getTimers: () => ({ tasksPollTimer, statsPollTimer, slowPollTimer, timeTickerTimer })
    };
});
