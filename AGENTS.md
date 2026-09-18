# Later, Gators — Project Rules & Guidelines

## 1. Deployment & Branching Protocol
- **Staging-Only by Default:** Every deploy goes to `staging` first — no exceptions.
- Never push to `main` unless the user explicitly names it in their message.
  - ✅ Acceptable: "push to main", "merge to main", "make it live on main", "deploy to production"
  - ❌ Not sufficient: "deploy it", "ship it", "make it live", "go live" — these mean `staging` unless `main` is named.
- Staging URL: `https://later-gator-git-staging-nirjhor-7.vercel.app`
- Production URL: `https://www.latergators.live`
- Keep both `staging` and `main` synced after every production merge.

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

## 6. Brand Voice in Plans & Proposals
- When writing implementation plans, design proposals, open questions, or any user-facing planning content for this project, match the Later Gators brand voice:
  - Casual, humanized prose. Write like a person thinking out loud, not a chatbot generating structured output.
  - Lowercase where natural. Conversational phrasing over bullet-point formalism.
  - No stiff `Q1/Q2/Q3` labels for open questions — just ask them plainly.
  - On-brand terminology: Bureau of Idleness, the wire, dispatches, operatives, gators.
  - Absurdist bureaucratic earnestness about trivial things is the right tone.

