/**
 * LATER, GATORS // THE GLOBAL PROCRASTINATION JOURNAL
 * Evasion Engine Dictionaries & Editorial Censorship / Content Moderation
 */

(function () {
    'use strict';

    // Starter evasive slogans for dynamic dispatch button
    const STARTER_EVASION_PHRASES = [
        "NOT MY PROBLEM TODAY",
        "REFER TO FUTURE ME",
        "A PROBLEM FOR MONDAY",
        "TABLE FOR TOMORROW",
        "DECREE AN EMERGENCY NAP",
        "CONSULT THE CEILING FIRST",
        "SLEEP ON IT INDEFINITELY",
        "SWEPT UNDER THE RUG",
        "COMMENCE PROCRASTINATION",
        "ABSOLUTELY NOT",
        "FORWARD TO THE VOID",
        "LET FATE DECIDE",
        "FILE UNDER 'LATER'",
        "DISMISS WITH PREJUDICE",
        "TAKE TO MY FAINTING COUCH",
        "I RESPECTFULLY DECLINE",
        "MAYBE IN ANOTHER LIFE",
        "LET THE UNIVERSE HANDLE IT"
    ];

    const RANK_10_PRESTIGE_PHRASES = [
        "OFFICIALLY DEFER",
        "PUNT INTO NEXT WEEK",
        "BANISH TO NEXT QUARTER",
        "SOLEMNLY POSTPONE"
    ];

    const RANK_25_PRESTIGE_PHRASES = [
        "POSTPONE SINE DIE",
        "EXECUTIVE ORDER: DELAY",
        "STRATEGIC INACTION",
        "AUTHORIZE TACTICAL SLOTH"
    ];

    const RANK_50_PRESTIGE_PHRASES = [
        "BY ROYAL DECREE: NO",
        "DECLARE A NATIONAL HOLIDAY",
        "DIPLOMATIC IMMUNITY INVOKED",
        "STATE-SPONSORED DAWDLING"
    ];

    const RANK_100_PRESTIGE_PHRASES = [
        "SUPREME INACTION DECLARED",
        "TRANSCENDENT SLOTH ACHIEVED",
        "SOVEREIGN RIGHT TO DO NOTHING",
        "APPOINTED AMBASSADOR OF DELAY"
    ];

    // Reactive task detection pairs
    const TASK_REACTIVE_PAIRS = [
        {
            keywords: ['email', 'inbox', 'reply', 'mail'],
            later: "MARK AS UNREAD FOREVER",
            panic: "SEND TYPO-RIDDEN REPLY"
        },
        {
            keywords: ['study', 'exam', 'homework', 'thesis', 'reading', 'read', 'assignment'],
            later: "CLOSE BOOK RESPECTFULLY",
            panic: "CRAM AT 3:00 AM"
        },
        {
            keywords: ['laundry', 'clothes', 'fold', 'wash'],
            later: "THE CHAIR IS MY CLOSET",
            panic: "WEAR IT INSIDE OUT"
        },
        {
            keywords: ['gym', 'workout', 'exercise', 'run', 'cardio', 'weights'],
            later: "DECLARE A REST CENTURY",
            panic: "DO 1 PUSHUP AND QUIT"
        },
        {
            keywords: ['sleep', 'nap', 'bed', 'rest', 'tired'],
            later: "COMMENCE UNCONSCIOUSNESS",
            panic: "JUST ONE MORE REEL"
        },
        {
            keywords: ['exist', 'existing', 'life choices', 'alive', 'life'],
            later: "PAUSE REALITY FOR 5 MIN",
            panic: "EXISTENTIAL DREAD"
        },
        {
            keywords: ['work', 'project', 'client', 'spreadsheet', 'excel', 'bug', 'code', 'deploy'],
            later: "BANISH TO NEXT SPRINT",
            panic: "TYPE VERY FAST AND PRAY"
        },
        {
            keywords: ['clean', 'dishes', 'room', 'trash', 'chores'],
            later: "STRATEGIC DUST ACCUMULATION",
            panic: "SHOVE UNDER BED"
        }
    ];

    // Common task keywords used for smart detection and field auto-correction
    const COMMON_TASK_KEYWORDS = [
        'sleep', 'sleeping', 'study', 'studying', 'work', 'working',
        'laundry', 'doing laundry', 'gym', 'going to gym', 'taxes',
        'doing taxes', 'homework', 'dishes', 'doing dishes', 'emails',
        'replying to emails', 'cleaning', 'cleaning room', 'life choices',
        'my life choices', 'existing', 'too tired to type', 'nothing',
        'procrastinating', 'assignment', 'paper', 'essay', 'workout'
    ];

    // Editorial Board censorship warning messages
    const FUNNY_CENSOR_MESSAGES = [
        "THE EDITOR-IN-CHIEF REFUSES TO PRINT SUCH SCANDALOUS LANGUAGE.",
        "REDACTED BY THE DEPARTMENT OF DECENCY: KEEP IT CIVIL, CITIZEN.",
        "OUR TYPESETTERS ARE BLUSHING. MIND YOUR MANNERS.",
        "TRANSMISSION REJECTED: THIS IS A RESPECTABLE PROCRASTINATION JOURNAL.",
        "CENSORSHIP NOTICE: WASH YOUR KEYBOARD OUT WITH SOAP."
    ];

    // Regex for inline broadsheet redacting
    const NSFW_REGEX = /\b(sex|sexual|anal|porn|porno|hentai|nude|nudes|boob|boobs|tit|tits|penis|dick|dicks|cock|cocks|vagina|pussy|pussies|clit|clitoris|masturbat\w*|horny|orgasm|orgasms|ejaculat\w*|ass|asshole|assholes|butthole|anus|blowjob\w*|handjob\w*|rimjob\w*|deepthroat\w*|creampie\w*|pegging|cum|cumming|onlyfans|fuck\w*|bitch\w*|cunt\w*|whore\w*|slut\w*|dildo\w*|shit\w*|shite\w*|bullshit\w*|horseshit\w*|dipshit\w*|shithole\w*|batshit\w*|apeshit\w*|fart\w*|queef\w*|poop\w*|turd\w*|diarrhe\w*|diarrho\w*|crap\w*|piss\w*)\b/gi;

    /**
     * Checks if text contains vulgarities, sexual content, or racial slurs
     */
    function containsInappropriate(str) {
        if (!str) return false;
        const lower = str.toLowerCase();

        const explicitWords = [
            // Sexual acts & phrases
            /\b(sex|sexual|sexy|anal|blowjob\w*|handjob\w*|rimjob\w*|footjob\w*|titfuck\w*)\b/i,
            /\b(deepthroat\w*|gangbang\w*|creampie\w*|pegging|pegged|fingering)\b/i,
            /\b(masturbat\w*|wank\w*|circlejerk\w*|orgasm\w*|ejaculat\w*|bukkake)\b/i,
            /\b(cum|cums|cumming|cumshot\w*|squirt\w*)\b/i,
            /\b(threesome\w*|foursome\w*|orgy|orgies|gloryhole\w*|bdsm|bondage|erotic\w*)\b/i,
            /\b(jerk\s*off|jerking\s*off|jack\s*off|jacking\s*off)\b/i,

            // Genitalia & anatomy
            /\b(penis\w*|cock|cocks|cocksucker\w*|dick|dicks|dickhead\w*)\b/i,
            /\b(vagina\w*|pussy|pussies|clit|clitoris|labia)\b/i,
            /\b(tits|titties|boob|boobs|boobies|areola\w*)\b/i,
            /\b(asshole\w*|butthole\w*|anus\w*|ballsack\w*|testicle\w*)\b/i,
            /\b(dildo\w*|vibrator\w*|fleshlight\w*|buttplug\w*)\b/i,

            // Adult industry / pornography
            /\b(porn|porno|pornography|hentai|xxx|onlyfans|pornhub|xvideos|redtube|xhamster)\b/i,
            /\b(nude|nudes|naked|stripper\w*|hooker\w*|prostitute\w*|escort\w*|milf\w*|dilf\w*|horny|boner\w*)\b/i,

            // Profanity & vulgar terms
            /\b(fuck\w*|fck|fuk|f\*ck|motherfuck\w*)\b/i,
            /\b(bitch\w*|b!tch)\b/i,
            /\b(cunt\w*)\b/i,
            /\b(whore\w*|slut\w*)\b/i,
            /\b(bastard\w*)\b/i,

            // Bodily excretions, vulgarities & scatological terms
            /\b(fart\w*|queef\w*)\b/i,
            /\b(shit\w*|shite\w*|bullshit\w*|horseshit\w*|dipshit\w*|shithole\w*|batshit\w*|apeshit\w*|sh\*t|sh!t|sh1t|shyt)\b/i,
            /\b(poop\w*|p00p\w*|turd\w*|diarrhe\w*|diarrho\w*)\b/i,
            /\b(crap\w*|crappy\w*|cr@p|cr\*p)\b/i,
            /\b(piss\w*|pissed\w*|pissing\w*|p!ss|p\*ss)\b/i,

            // Common spaced / leetspeak / elongated obfuscations
            /\b(s[\s._\-*]*[3e][\s._\-*]*x+)\b/i,
            /\b([4a][\s._\-*]*n[\s._\-*]*[4a][\s._\-*]*l)\b/i,
            /\b(p[\s._\-*]*[0o][\s._\-*]*r[\s._\-*]*n)\b/i,
            /\b(f[\s._\-*]*[u*][\s._\-*]*c[\s._\-*]*k+)\b/i,
            /\b(d[\s._\-*]*[1!i][\s._\-*]*c[\s._\-*]*k+)\b/i,
            /\b(b[\s._\-*]*[1!i][\s._\-*]*t[\s._\-*]*c[\s._\-*]*h+)\b/i,
            /\b(c[\s._\-*]*[u*][\s._\-*]*n[\s._\-*]*t+)\b/i,
            /\b(p[\s._\-*]*[u*][\s._\-*]*s+[\s._\-*]*[y!1])\b/i,
            /\b(s[\s._\-*]*h[\s._\-*]*[i!1y*][\s._\-*]*t+)\b/i,
            /\b(f[\s._\-*]*[a@*][\s._\-*]*r[\s._\-*]*t+)\b/i,
            /\b(p[\s._\-*]*[o0*][\s._\-*]*[o0*][\s._\-*]*p+)\b/i,
            /\b(p[\s._\-*]*[i!1*][\s._\-*]*s+)\b/i,
            /\b(s+h+[i1!y*]+t+)\b/i,
            /\b(f+a+r+t+s*)\b/i,
            /\b(p+o+o+p+s*)\b/i
        ];

        for (const rx of explicitWords) {
            if (rx.test(lower)) return true;
        }

        // Severe racial / identity slurs (checked against collapsed text)
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

        const severeSlurs = [
            /n+[i1l]+[g9]+[e3a4r]+/i,
            /n+i+g+[ae]+/i,
            /f+a+g+[o0e3]*t?/i,
            /k+i+k+e/i,
            /c+h+i+n+k/i,
            /s+p+i+c/i,
            /r+e+t+a+r+d/i
        ];

        for (const rx of severeSlurs) {
            if (rx.test(collapsed) || rx.test(normalized) || rx.test(deDuplicated)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Detects pure keyboard smash or non-meaningful gibberish
     */
    function isGibberish(text) {
        if (!text) return true;
        const clean = text.trim();
        if (clean.length < 3) return true;

        // Normalizing expressive elongation: "studyiiiiing" -> "studying"
        const deElongated = clean.replace(/(.)\1{2,}/gi, "$1");

        // Common keyboard home-row / sequential key walks
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

        if (/^(.)\1+$/i.test(clean.replace(/\s+/g, ""))) return true;

        const words = deElongated.split(/\s+/);
        let validWords = 0;

        for (const w of words) {
            const lettersOnly = w.replace(/[^a-z]/gi, "");
            if (!lettersOnly) continue;

            if (["no", "so", "ugh", "ah", "ha", "eh"].includes(lettersOnly.toLowerCase())) {
                validWords++;
                continue;
            }

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

    // Public Interface
    const GatorEvasion = {
        STARTER_EVASION_PHRASES,
        RANK_10_PRESTIGE_PHRASES,
        RANK_25_PRESTIGE_PHRASES,
        RANK_50_PRESTIGE_PHRASES,
        RANK_100_PRESTIGE_PHRASES,
        TASK_REACTIVE_PAIRS,
        COMMON_TASK_KEYWORDS,
        FUNNY_CENSOR_MESSAGES,
        NSFW_REGEX,
        containsInappropriate,
        isGibberish,
        censorNsfwText,
        censorNsfwHtml
    };

    window.GatorEvasion = GatorEvasion;
    window.STARTER_EVASION_PHRASES = STARTER_EVASION_PHRASES;
    window.RANK_10_PRESTIGE_PHRASES = RANK_10_PRESTIGE_PHRASES;
    window.RANK_25_PRESTIGE_PHRASES = RANK_25_PRESTIGE_PHRASES;
    window.RANK_50_PRESTIGE_PHRASES = RANK_50_PRESTIGE_PHRASES;
    window.RANK_100_PRESTIGE_PHRASES = RANK_100_PRESTIGE_PHRASES;
    window.TASK_REACTIVE_PAIRS = TASK_REACTIVE_PAIRS;
    window.COMMON_TASK_KEYWORDS = COMMON_TASK_KEYWORDS;
    window.FUNNY_CENSOR_MESSAGES = FUNNY_CENSOR_MESSAGES;
    window.containsInappropriate = containsInappropriate;
    window.isGibberish = isGibberish;
    window.censorNsfwText = censorNsfwText;
    window.censorNsfwHtml = censorNsfwHtml;
})();
