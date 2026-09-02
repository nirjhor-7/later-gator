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

    const renderFeed = (tasks) => {
        if (tasks.length === 0) {
            feedContainer.innerHTML = '<div class="feed-item">No transmissions received yet.</div>';
            return;
        }

        feedContainer.innerHTML = tasks.map(task => {
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
                <div class="feed-item-meta">${locationString} ${verb}:</div>
                <div class="feed-item-text">${escapeHtml(rawText)}</div>
                <span class="feed-item-time">${timeAgo(task.created_at)}</span>
            </div>
            `;
        }).join('');

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
                    shameTask.textContent = `"${escapeHtml(taskName)}"`;
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

    const submitTask = async (isPanic = false) => {
        let text = taskInput.value.trim();
        const name = document.getElementById('user-name').value.trim();
        
        if (!text) {
            statusMessage.textContent = "PLEASE SPECIFY A TASK.";
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
            }
        } catch (error) {
            console.error('Failed to submit task:', error);
            statusMessage.textContent = "SYSTEM ERROR. YOU MUST DO IT NOW.";
        }
    };

    // Share Card Slip Logic
    const shareCard = document.getElementById('share-card');
    const shareCardTask = document.getElementById('share-card-task');
    const shareCloseBtn = document.getElementById('share-close-btn');
    const shareXBtn = document.getElementById('share-x-btn');
    const shareFbBtn = document.getElementById('share-fb-btn');
    const shareWaBtn = document.getElementById('share-wa-btn');
    const shareCopyBtn = document.getElementById('share-copy-btn');

    let currentShareText = "";
    const getShareUrl = () => window.location.origin && window.location.origin !== 'null' ? window.location.origin : 'https://later-gator.vercel.app';

    const showShareSlip = (task, isPanicMode) => {
        if (!shareCard) return;
        const clean = task.trim();
        shareCardTask.textContent = `"${clean}"`;
        
        const actionVerb = isPanicMode ? "am officially panicking about" : "just postponed";
        const punchline = isPanicMode ? "Wish me luck." : "Not my problem today.";
        currentShareText = `I ${actionVerb} "${clean}" on Later, Gator alongside the rest of the world. ${punchline}`;
        
        shareCard.style.display = 'block';
    };

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

    fetchAll();
    setInterval(fetchAll, 10000);
});
