# Later, Gators — Project Rules & Guidelines

## 1. Deployment & Branching Protocol
- **Staging-First Workflow:** Do not push experimental or breaking changes directly to `main`.
- Always develop, test, and verify on the `staging` branch (`https://later-gator-git-staging-nirjhor-7.vercel.app`).
- Promote to `main` (`https://www.latergators.live`) only after verification and user sign-off.
- Keep both `staging` and `main` synced after production merges.

## 2. Social Previews & Cache Invalidation
- Standard domain: `https://www.latergators.live/` (canonical with www).
- Twitter/X, Discord, and Facebook aggressively cache link preview images by exact URL.
- When updating OpenGraph or Twitter Card images, use unique asset paths (e.g. `latergators-banner.png`) and update version query strings (`?v=N`) across all meta tags in `index.html`.

## 3. Input & Form Visual Hierarchy
- **Hero Task Input First:** The main task textarea (`#task-input`) is the primary interface.
- **Quick Preset Chips Attached to Task:** The preset chips (`TOO TIRED TO TYPE? CHOOSE:`) must sit directly below `#task-input`.
- **Byline Above Actions:** The author alias input (`#user-name` with `[ BY: ]`) sits below the preset chips, immediately preceding the action buttons (`#later-btn` and `#panic-btn`).

## 4. Content Moderation & Safety Guardrails
- Maintain dual-layer moderation (both `script.js` and `api/tasks.js` `containsInappropriate`):
  - Block explicit sexual acts, anatomy, adult industry terms, severe profanity, and spaced/leetspeak obfuscations.
  - Preserve benign words (`analysis`, `analyze`, `canal`, `sussex`, `semester`, etc.).
- Client rejects immediately with an input-shake animation and 1890s broadsheet censure message without hitting the API.
- Server returns HTTP 400 Bad Request.
- `GET /api/tasks` automatically purges any flagged tasks from both the response and Supabase table.

## 5. Canvas Image Viral Attribution
- Every downloadable canvas artifact (Postponement Certificate, Sloth Press Pass) must include the canonical footer text:
  `LATER, GATORS // THE GLOBAL PROCRASTINATION JOURNAL // LATERGATORS.LIVE`
