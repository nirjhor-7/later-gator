/**
 * LATER, GATORS // THE GLOBAL PROCRASTINATION JOURNAL
 * Broadsheet Canvas Renderers
 * Generates high-resolution downloadable certificates, press passes, and newspaper clippings.
 */

(function () {
    'use strict';

    /**
     * Word wrap helper for HTML5 Canvas 2D
     */
    const wrapCanvasText = (ctx, text, maxWidth) => {
        if (!text) return [];
        const words = text.split(/\s+/);
        const lines = [];
        let currentLine = words[0] || '';

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + ' ' + word).width;
            if (width < maxWidth) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }
        return lines;
    };

    /**
     * Generates Official Certificate of Postponement (1200x800)
     */
    const generateCertificateImage = (taskText, isPanicMode, holderName, options = {}) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');

        const currentGator = window.currentGator || null;
        const postponementsCount = options.postponementsCount !== undefined
            ? options.postponementsCount
            : (window.postponementsCount || 0);
        const sympathyCount = options.sympathyCount !== undefined
            ? options.sympathyCount
            : (options.totalSympathyCount !== undefined ? options.totalSympathyCount : (window.totalSympathyCount || 0));
        const timeStolenSeconds = options.timeStolenSeconds !== undefined
            ? options.timeStolenSeconds
            : (window.timeStolenSeconds || 0);

        const censorFn = (window.GatorEvasion && window.GatorEvasion.censorNsfwText)
            || window.censorNsfwText
            || ((str) => str);

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
        ctx.fillText('LATER, GATORS  //  GLOBAL PROCRASTINATION JOURNAL', 600, 105);

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

        // Check for verified Gator Tag
        const gatorTag = (currentGator && (currentGator.displayTag || currentGator.tag))
            ? (currentGator.displayTag || currentGator.tag).replace(/^@/, '')
            : (holderName && holderName.includes('@') ? holderName.match(/@([A-Za-z0-9_]+)/)?.[1] : null);

        let displayHolder = (holderName && holderName.trim() !== '') ? holderName.trim().toUpperCase() : 'ANONYMOUS PROCRASTINATOR';
        displayHolder = displayHolder.replace(/^\[[^\]]+\]\s*/, '');
        if (gatorTag) {
            if (!holderName || holderName.trim() === '' || holderName.toUpperCase() === 'ANONYMOUS' || holderName.toUpperCase() === `@${gatorTag.toUpperCase()}`) {
                displayHolder = `@${gatorTag.toUpperCase()}`;
            } else if (!displayHolder.includes('@')) {
                displayHolder = `@${gatorTag.toUpperCase()} (${displayHolder})`;
            }
        }

        // Metadata
        ctx.font = '700 15px "Space Mono", monospace';
        ctx.textAlign = 'left';
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();
        ctx.fillText(`DATE: ${dateStr}`, 100, 225);
        ctx.textAlign = 'right';
        const refNum = Math.floor(100000 + Math.random() * 900000);
        const refId = gatorTag ? `TAG: @${gatorTag.toUpperCase()} • REF: LG-${refNum}` : `REF: LG-${refNum}`;
        ctx.fillText(refId, 1100, 225);

        // Declaration
        ctx.textAlign = 'center';
        ctx.font = '400 17px "Space Mono", monospace';
        ctx.fillText('THIS INSTRUMENT CONFIRMS THAT THE BEARER:', 600, 275);

        ctx.font = '900 24px "Space Mono", monospace';
        ctx.fillText(`[ ${displayHolder} ]`, 600, 312);

        const currentRank = (typeof window.getSlackerRank === 'function'
            ? window.getSlackerRank(postponementsCount, sympathyCount, timeStolenSeconds)
            : 'ACCREDITED DELAYER').replace('RANK: ', '').trim();
        const dispatchWord = postponementsCount === 1 ? 'DISPATCH' : 'DISPATCHES';
        const sympathyStr = sympathyCount > 0 ? ` • ${sympathyCount} SYMPATHY` : '';

        ctx.font = '700 11px "Space Mono", monospace';
        if (gatorTag) {
            ctx.fillStyle = '#b91c1c';
            ctx.fillText(`★ VERIFIED BUREAU OPERATIVE // ${currentRank} • ${postponementsCount} ${dispatchWord} FILED${sympathyStr} ★`, 600, 334);
            ctx.fillStyle = '#111111';
        } else {
            ctx.fillStyle = '#555555';
            ctx.fillText(`★ ACCREDITED CLEARANCE: ${currentRank} • ${postponementsCount} ${dispatchWord} FILED${sympathyStr} ★`, 600, 334);
            ctx.fillStyle = '#111111';
        }

        ctx.font = '400 17px "Space Mono", monospace';
        const verbDeclaration = isPanicMode ? 'HAS BROKEN DOWN AND UNDERTAKEN EMERGENCY EFFORTS ON:' : 'HAS OFFICIALLY AND LAWFULLY DODGED THE OBLIGATION DECLARED BELOW:';
        ctx.fillText(verbDeclaration, 600, 370);

        // Task Box
        ctx.fillStyle = '#EBEBEB';
        ctx.fillRect(140, 400, 920, 100);
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 3;
        ctx.strokeRect(140, 400, 920, 100);

        ctx.fillStyle = '#111111';
        ctx.font = '900 28px "Space Mono", monospace';
        let safeTask = `"${censorFn((taskText || '').trim())}"`;
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
        ctx.fillText(isPanicMode ? 'URGENT RESCHEDULING' : 'BUREAU OF PROCRASTINATION // VALID', 0, 24);
        ctx.restore();

        // Footer note with live domain
        ctx.fillStyle = '#111111';
        ctx.textAlign = 'center';
        ctx.font = '700 13px "Space Mono", monospace';
        ctx.fillText('LATER, GATORS // THE GLOBAL PROCRASTINATION JOURNAL // LATERGATORS.LIVE', 600, 734);

        return canvas;
    };

    /**
     * Generates Official Sloth Credential & Press Pass (1000x620)
     */
    const generateCredentialCard = (targetCanvas, holderName, rankName, clicks, timeStr, options = {}) => {
        const canvas = targetCanvas || document.createElement('canvas');
        canvas.width = 1000;
        canvas.height = 620;
        const ctx = canvas.getContext('2d');

        const currentGator = window.currentGator || null;

        // Background: Newsprint parchment
        const isSepia = document.body && document.body.classList.contains('sepia-edition');
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
        ctx.font = '700 14px "Space Mono", monospace';
        ctx.fillText('★ BUREAU OF STRATEGIC PROCRASTINATION & INACTION ★', 500, 68);

        ctx.font = '900 38px "Big Shoulders Display", sans-serif';
        ctx.fillText('OFFICIAL SLOTH CREDENTIAL & PRESS PASS', 500, 110);

        ctx.font = '700 13px "Space Mono", monospace';
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
        ctx.font = '700 13px "Space Mono", monospace';
        ctx.fillText('CREDENTIAL DOSSIER // CLASSIFIED IDLE', 60, 182);

        ctx.beginPath();
        ctx.moveTo(60, 188);
        ctx.lineTo(360, 188);
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Field 1: OPERATIVE / HOLDER
        const gatorTag = (currentGator && (currentGator.displayTag || currentGator.tag))
            ? (currentGator.displayTag || currentGator.tag).replace(/^@/, '')
            : (holderName && holderName.includes('@') ? holderName.match(/@([A-Za-z0-9_]+)/)?.[1] : null);

        let cleanHolder = (holderName || 'ANONYMOUS SLACKER').trim().toUpperCase();
        if (gatorTag) {
            if (!holderName || cleanHolder === 'ANONYMOUS SLACKER' || cleanHolder === `@${gatorTag.toUpperCase()}` || cleanHolder === gatorTag.toUpperCase()) {
                cleanHolder = `@${gatorTag.toUpperCase()}`;
            } else if (!cleanHolder.includes('@')) {
                cleanHolder = `@${gatorTag.toUpperCase()} (${cleanHolder})`;
            }
        }

        ctx.font = '700 12px "Space Mono", monospace';
        ctx.fillStyle = gatorTag ? '#b91c1c' : '#555555';
        ctx.fillText(gatorTag ? 'OPERATIVE / GATOR TAG [★ VERIFIED]:' : 'OPERATIVE / ACCREDITED HOLDER:', 60, 214);
        ctx.font = '900 18px "Space Mono", monospace';
        ctx.fillStyle = '#111111';
        ctx.fillText(cleanHolder.length > 28 ? cleanHolder.substring(0, 26) + '...' : cleanHolder, 60, 236);

        // Field 2: SLACKER RANK
        ctx.font = '700 12px "Space Mono", monospace';
        ctx.fillStyle = '#555555';
        ctx.fillText('ACCREDITED SLACKER RANK:', 60, 270);
        ctx.font = '900 16px "Space Mono", monospace';
        ctx.fillStyle = '#111111';
        ctx.fillText(rankName.toUpperCase(), 60, 292);

        // Field 3: RECORD OF NON-PERFORMANCE
        ctx.font = '700 12px "Space Mono", monospace';
        ctx.fillStyle = '#555555';
        ctx.fillText('RECORD OF NON-PERFORMANCE:', 60, 326);
        ctx.font = '700 13px "Space Mono", monospace';
        ctx.fillStyle = '#111111';
        const dispWord = clicks === 1 ? 'DISPATCH' : 'DISPATCHES';
        const sympathyVal = (typeof options === 'object' && options && options.sympathyCount !== undefined)
            ? options.sympathyCount
            : (typeof options === 'number' ? options : (window.totalSympathyCount || 0));
        const sympathyText = sympathyVal > 0 ? ` • ${sympathyVal} SYMPATHY` : '';
        ctx.fillText(`${clicks} ${dispWord} FILED${sympathyText} • ${timeStr} STOLEN`, 60, 348);

        // Field 4: IDENTIFIER & DATE
        ctx.font = '700 12px "Space Mono", monospace';
        ctx.fillStyle = '#555555';
        ctx.fillText('CLEARANCE CODE & ISSUE DATE:', 60, 382);
        ctx.font = '700 13px "Space Mono", monospace';
        ctx.fillStyle = '#111111';
        const certCode = `SLOTH-${Math.abs(((clicks + 1) * 7919) ^ 0xABCD).toString(16).toUpperCase().padStart(8, '0')}`;
        const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase();
        const tagClearance = gatorTag ? `TAG: @${gatorTag.toUpperCase()} • ` : '';
        ctx.fillText(`${certCode} • ${tagClearance}${dateStr}`, 60, 404);

        // Legal Mandate Box
        ctx.fillStyle = 'rgba(17, 17, 17, 0.04)';
        ctx.fillRect(60, 430, 550, 98);
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 1;
        ctx.strokeRect(60, 430, 550, 98);

        ctx.fillStyle = '#111111';
        ctx.font = '700 12px "Space Mono", monospace';
        ctx.fillText('LEGAL EXEMPTION CLAUSE // ARTICLE 404:', 72, 452);
        ctx.font = '400 11px "Space Mono", monospace';
        ctx.fillText('The bearer of this press pass is certified in strategic procrastination.', 72, 471);
        ctx.fillText('All superiors, urgent Slack pings, and calendar invites are legally voided.', 72, 487);
        ctx.fillText('Attempting to force productivity violates the 1890 Inaction Treaty.', 72, 503);

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
        ctx.font = '700 12px "Space Mono", monospace';
        ctx.fillText('★ BUREAU OF IDLENESS ★', 0, -22);
        ctx.font = '900 19px "Space Mono", monospace';
        ctx.fillText('DIPLOMATIC IMMUNITY', 0, 4);
        ctx.font = '700 11px "Space Mono", monospace';
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
        ctx.font = '700 11px "Space Mono", monospace';
        ctx.fillText('HIGH CHANCELLOR OF DELAY', 775, 392);

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
        ctx.font = '700 11px "Space Mono", monospace';
        ctx.fillText(`* LG-${certCode} *`, 775, 495);

        // Footer note
        ctx.textAlign = 'center';
        ctx.font = '700 12px "Space Mono", monospace';
        ctx.fillText('LATER, GATORS // THE INDEPENDENT PROCRASTINATION JOURNAL // LATERGATORS.LIVE', 500, 556);

        return canvas;
    };

    /**
     * Generates Broadsheet Newspaper Wire Clipping (1000x650)
     */
    const generateNewspaperClipping = (targetCanvas, task) => {
        const canvas = targetCanvas || document.createElement('canvas');
        if (!task) return canvas;
        canvas.width = 1000;
        canvas.height = 650;
        const ctx = canvas.getContext('2d');
        const W = 1000;
        const H = 650;

        ctx.clearRect(0, 0, W, H);

        const currentGator = window.currentGator || null;
        const userStamps = window.userStamps || {};

        // Detect current edition styling
        const isSepia = document.body && document.body.classList.contains('sepia-edition');
        const isMidnight = document.body && document.body.classList.contains('midnight-edition');

        let paperColor = '#f6f2e7';
        let paperShadow = 'rgba(0, 0, 0, 0.32)';
        let inkPrimary = '#111111';
        let inkSecondary = '#4a4742';
        let borderColor = '#111111';
        let accentRed = '#b91c1c';
        let noticeBg = 'rgba(0, 0, 0, 0.035)';
        let isDark = false;

        if (isSepia) {
            paperColor = '#e5d1b1';
            paperShadow = 'rgba(38, 26, 14, 0.45)';
            inkPrimary = '#261a0e';
            inkSecondary = '#5a4533';
            borderColor = '#261a0e';
            accentRed = '#991b1b';
            noticeBg = 'rgba(38, 26, 14, 0.06)';
        } else if (isMidnight) {
            paperColor = '#0d1117';
            paperShadow = 'rgba(0, 0, 0, 0.8)';
            inkPrimary = '#eae4d5';
            inkSecondary = '#9e9686';
            borderColor = '#a89f8d';
            accentRed = '#ef4444';
            noticeBg = 'rgba(255, 255, 255, 0.05)';
            isDark = true;
        }

        // Draw torn deckle-edge paper sheet with realistic ripped fibers
        ctx.save();
        ctx.shadowColor = paperShadow;
        ctx.shadowBlur = 24;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 10;

        ctx.beginPath();
        ctx.moveTo(28, 28);
        for (let x = 28; x <= 972; x += 4) {
            const rip = Math.sin(x * 0.05) * 3.5 + Math.sin(x * 0.17) * 2.2 + ((x * 7) % 5 - 2) * 0.7;
            ctx.lineTo(x, 26 + rip);
        }
        ctx.lineTo(974, 622);
        for (let x = 974; x >= 26; x -= 4) {
            const rip = Math.sin(x * 0.06 + 1.4) * 3.8 + Math.sin(x * 0.22) * 2.4 + ((x * 11) % 5 - 2) * 0.7;
            ctx.lineTo(x, 624 + rip);
        }
        ctx.lineTo(26, 28);
        ctx.closePath();

        ctx.fillStyle = paperColor;
        ctx.fill();
        ctx.restore();

        // Clip inside the torn paper to render grain and content
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(28, 28);
        for (let x = 28; x <= 972; x += 4) {
            const rip = Math.sin(x * 0.05) * 3.5 + Math.sin(x * 0.17) * 2.2 + ((x * 7) % 5 - 2) * 0.7;
            ctx.lineTo(x, 26 + rip);
        }
        ctx.lineTo(974, 622);
        for (let x = 974; x >= 26; x -= 4) {
            const rip = Math.sin(x * 0.06 + 1.4) * 3.8 + Math.sin(x * 0.22) * 2.4 + ((x * 11) % 5 - 2) * 0.7;
            ctx.lineTo(x, 624 + rip);
        }
        ctx.lineTo(26, 28);
        ctx.closePath();
        ctx.clip();

        // Subtle newsprint fiber texture
        ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.018)' : 'rgba(0, 0, 0, 0.025)';
        for (let y = 30; y < 620; y += 4) {
            ctx.fillRect(26, y, 948, 1);
        }

        // Broadsheet inner border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(52, 50, 896, 548);

        ctx.lineWidth = 1;
        ctx.strokeRect(57, 55, 886, 538);

        // Corner ornaments
        ctx.fillStyle = borderColor;
        [[49, 47], [945, 47], [49, 595], [945, 595]].forEach(([x, y]) => {
            ctx.fillRect(x, y, 6, 6);
        });

        // 1. Masthead
        ctx.textAlign = 'center';
        ctx.fillStyle = inkSecondary;
        ctx.font = '700 12px "Space Mono", monospace';
        ctx.fillText('★ THE GLOBAL PROCRASTINATION JOURNAL // WIRE CLIPPING ARCHIVE ★', 500, 84);

        ctx.font = '900 36px "Big Shoulders Display", sans-serif';
        ctx.fillStyle = inkPrimary;
        ctx.fillText('DAILY DISPATCH OF AVOIDED LABOR', 500, 122);

        // Masthead Metadata bar
        const createdDate = task.created_at ? new Date(task.created_at) : new Date();
        const dateStr = createdDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase();
        ctx.font = '700 11px "Space Mono", monospace';
        ctx.fillStyle = inkSecondary;
        ctx.fillText(`DISPATCH #${task.id || 'WIRE'} • FILED: ${dateStr} • SPECIAL WIRE RECORD`, 500, 145);

        // Double rule under masthead
        ctx.beginPath();
        ctx.moveTo(68, 158);
        ctx.lineTo(932, 158);
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(68, 163);
        ctx.lineTo(932, 163);
        ctx.lineWidth = 1;
        ctx.stroke();

        // 2. Dispatch Section
        const rawText = (task.text || '').trim();
        const isPanic = rawText.startsWith('[PANIC]');
        const cleanHeadline = rawText.replace(/^\[PANIC\]\s*/, '').replace(/[\r\n]+/g, ' ');

        // Category Tag
        ctx.textAlign = 'left';
        if (isPanic) {
            ctx.font = '900 12px "Space Mono", monospace';
            ctx.fillStyle = accentRed;
            ctx.fillText('◆ HIGH-PANIC TRANSMISSION // CODE RED DELAY', 80, 192);
        } else {
            ctx.font = '700 12px "Space Mono", monospace';
            ctx.fillStyle = inkSecondary;
            ctx.fillText('OFFICIAL CONFESSION RECORD // UNFINISHED BUSINESS:', 80, 192);
        }

        // Dispatch Headline Text with Dynamic Typography
        const maxWidth = 560;
        const cleanLen = cleanHeadline.length;
        let headlineFontSize = 54;
        if (cleanLen > 110) headlineFontSize = 22;
        else if (cleanLen > 75) headlineFontSize = 26;
        else if (cleanLen > 40) headlineFontSize = 32;
        else if (cleanLen > 18) headlineFontSize = 42;
        else headlineFontSize = 54;

        ctx.font = `900 ${headlineFontSize}px "Big Shoulders Display", sans-serif`;
        ctx.fillStyle = inkPrimary;

        let wrappedLines = wrapCanvasText(ctx, `“${cleanHeadline}”`, maxWidth);
        if (wrappedLines.length > 4) {
            wrappedLines = wrappedLines.slice(0, 4);
            const last = wrappedLines[3];
            wrappedLines[3] = last.replace(/”?$/, '') + '...”';
        }
        const lineHeight = Math.round(headlineFontSize * 1.15);
        const textHeight = wrappedLines.length * lineHeight;

        let subdeck = '';
        if (wrappedLines.length <= 2) {
            subdeck = isPanic
                ? '— EMERGENCY SUSPENSION OF LABOR // CODE RED STAY GRANTED —'
                : '— FORMALLY LOGGED FOR INDEFINITE DELAY // STATUTE 404 —';
        }

        const zoneTop = 205;
        const zoneBottom = 345;
        const contentHeight = textHeight + (subdeck ? 26 : 0);
        const startY = zoneTop + Math.max(0, Math.round((zoneBottom - zoneTop - contentHeight) / 2)) + Math.round(headlineFontSize * 0.82);

        let curY = startY;
        wrappedLines.forEach(line => {
            ctx.fillText(line, 80, curY);
            curY += lineHeight;
        });

        if (subdeck) {
            ctx.font = '700 10px "Space Mono", monospace';
            ctx.fillStyle = isPanic ? accentRed : inkSecondary;
            ctx.fillText(subdeck, 80, curY + 6);
            curY += 22;
        }

        // 3. Byline & Operative Dossier
        const authorRaw = (task.city || 'Anonymous').trim();
        const country = (task.country || 'Parts Unknown').toUpperCase();
        let authorClean = authorRaw;
        let rankTag = '';
        const flairMatch = authorRaw.match(/^\[(.*?)\]\s*(.*)$/);
        if (flairMatch) {
            rankTag = `[${flairMatch[1].toUpperCase()}] `;
            authorClean = flairMatch[2] || 'Anonymous';
        }

        let gatorTag = null;
        if (authorClean.startsWith('@')) {
            gatorTag = authorClean.replace(/^@/, '');
        } else if (task.author_tag || task.gator_tag) {
            gatorTag = (task.author_tag || task.gator_tag).replace(/^@/, '');
        } else if (currentGator && (task.author_gator_id === currentGator.gatorId || task.gatorId === currentGator.gatorId)) {
            gatorTag = (currentGator.displayTag || currentGator.tag).replace(/^@/, '');
        }

        const dossierY = Math.max(curY + 16, 352);

        // Dividing rule above dossier
        ctx.beginPath();
        ctx.moveTo(80, dossierY);
        ctx.lineTo(600, dossierY);
        ctx.lineWidth = 1;
        ctx.strokeStyle = borderColor;
        ctx.stroke();

        ctx.font = '700 11px "Space Mono", monospace';
        if (gatorTag) {
            ctx.fillStyle = accentRed;
            ctx.fillText('★ VERIFIED OPERATIVE // GATOR TAG:', 80, dossierY + 22);

            ctx.font = '900 13px "Space Mono", monospace';
            ctx.fillStyle = inkPrimary;
            const tagFormatted = authorClean.startsWith('@') ? authorClean.toUpperCase() : `@${gatorTag.toUpperCase()}${authorClean && authorClean !== 'ANONYMOUS' ? ` (${authorClean.toUpperCase()})` : ''}`;
            ctx.fillText(`${rankTag}${tagFormatted} IN ${country}`, 80, dossierY + 40);
        } else {
            ctx.fillStyle = inkSecondary;
            ctx.fillText('OPERATIVE / ORIGIN:', 80, dossierY + 22);

            ctx.font = '700 13px "Space Mono", monospace';
            ctx.fillStyle = inkPrimary;
            ctx.fillText(`${rankTag}${authorClean.toUpperCase()} IN ${country}`, 80, dossierY + 40);
        }

        // Time / Sympathy counts
        const sameCount = task.same_count || (userStamps[task.id] === 'same' ? 1 : 0);
        const validCount = task.valid_count || (userStamps[task.id] === 'valid' ? 1 : 0);
        const ripCount = task.rip_count || (userStamps[task.id] === 'rip' ? 1 : 0);

        ctx.font = '700 11px "Space Mono", monospace';
        ctx.fillStyle = inkSecondary;
        ctx.fillText(`PUBLIC SYMPATHY: [ SAME: ${sameCount} ] • [ VALID: ${validCount} ] • [ RIP: ${ripCount} ]`, 80, dossierY + 62);

        // 4. Legal / Inaction Exemption Box
        const boxY = dossierY + 76;
        ctx.fillStyle = noticeBg;
        ctx.fillRect(80, boxY, 520, 62);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(80, boxY, 520, 62);
        ctx.setLineDash([]);

        ctx.font = '700 10px "Space Mono", monospace';
        ctx.fillStyle = inkPrimary;
        ctx.fillText('LEGAL DEFERRAL MANDATE // STATUTE 404:', 92, boxY + 18);
        ctx.font = '400 10px "Space Mono", monospace';
        ctx.fillStyle = inkSecondary;
        ctx.fillText('This dispatch has been entered into the Official Archive of Idleness.', 92, boxY + 34);
        ctx.fillText('Any attempt to enforce immediate action is stayed by international sloth privilege.', 92, boxY + 48);

        // 5. Huge Angled Red Rubber Stamp on the Right
        ctx.save();
        ctx.translate(768, 335);
        ctx.rotate(-13 * Math.PI / 180);

        const stampColor = accentRed;
        ctx.strokeStyle = stampColor;
        ctx.lineWidth = 3.5;
        ctx.strokeRect(-140, -56, 280, 112);

        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(-133, -49, 266, 98);
        ctx.setLineDash([]);

        ctx.fillStyle = stampColor;
        ctx.textAlign = 'center';
        ctx.font = '700 11px "Space Mono", monospace';
        ctx.fillText('★ BUREAU OF STRATEGIC INACTION ★', 0, -26);

        ctx.font = '900 23px "Space Mono", monospace';
        ctx.fillText('VERIFIED UNFINISHED', 0, 4);

        ctx.font = '700 11px "Space Mono", monospace';
        ctx.fillText('// ACTION PERMANENTLY DEFERRED //', 0, 24);

        ctx.font = '700 9px "Space Mono", monospace';
        if (gatorTag) {
            ctx.fillText(`OPERATIVE: @${gatorTag.toUpperCase()} • NO EXTENSION`, 0, 39);
        } else {
            ctx.fillText(`STAMP ID: #LG-${task.id || '99'} • NO EXTENSION GRANTED`, 0, 39);
        }

        // Ink bleed splatter / distressed micro marks inside stamp
        ctx.fillStyle = stampColor;
        for (let s = 0; s < 18; s++) {
            const sx = (Math.sin(s * 91) * 125);
            const sy = (Math.cos(s * 47) * 45);
            const sr = 0.5 + (s % 3) * 0.5;
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // 6. Barcode Simulation (Bottom Right)
        const barStartX = 650;
        const barY = 445;
        const barHeight = 40;
        const barPattern = [3, 1, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 1, 2, 3, 2, 1, 4, 2];
        let curBarX = barStartX;
        ctx.fillStyle = borderColor;
        barPattern.forEach((w, idx) => {
            if (idx % 2 === 0) {
                ctx.fillRect(curBarX, barY, w * 1.8, barHeight);
            }
            curBarX += w * 1.8 + 2.5;
        });
        ctx.textAlign = 'center';
        ctx.font = '700 10px "Space Mono", monospace';
        ctx.fillText(gatorTag ? `* WIRE-${task.id || '0000'} // @${gatorTag.toUpperCase()} *` : `* WIRE-${task.id || '0000'} *`, 775, barY + barHeight + 16);

        // 7. Broadside Footer
        ctx.beginPath();
        ctx.moveTo(68, 560);
        ctx.lineTo(932, 560);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = borderColor;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.font = '700 11px "Space Mono", monospace';
        ctx.fillStyle = inkSecondary;
        ctx.fillText('LATER, GATORS // THE INDEPENDENT PROCRASTINATION JOURNAL • LATERGATORS.LIVE • @thelatergators', 500, 580);

        ctx.restore(); // end torn-paper clip
        return canvas;
    };

    // Public Interface
    const GatorCanvas = {
        wrapCanvasText,
        generateCertificateImage,
        generateCredentialCard,
        generateNewspaperClipping
    };

    window.GatorCanvas = GatorCanvas;
    window.wrapCanvasText = wrapCanvasText;
    window.generateCertificateImage = generateCertificateImage;
    window.generateCredentialCard = generateCredentialCard;
    window.generateNewspaperClipping = generateNewspaperClipping;
})();
