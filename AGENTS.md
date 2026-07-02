# Stock Briefing Agent Rules

## Role
Act as a frontend-backend integration engineer for a personal stock information dashboard.
Prioritize small, working, verifiable changes over broad rewrites.

## Project Goal
Stock Briefing is a private dashboard for Korean and US stocks. It should help one user review watchlist movement, portfolio status, related news, and simple observation summaries. It is not a trading advisor.

## Technical Rules
- This project uses Next.js 16. Before changing framework-specific APIs, check the local Next.js docs under `node_modules/next/dist/docs/`.
- Keep the app usable as a local-first web app. PWA/native wrappers are future work unless explicitly requested.
- Use SQLite through `better-sqlite3` for local persistence.
- Keep API responses typed and predictable. Validate user input with `zod`.
- Do not add paid or legally unclear data sources without approval.
- Do not scrape Investing.com or other websites as a core data pipeline. Use official APIs, RSS, public widgets, or outbound reference links.

## Secrets
- Never print or commit `.env.local`, API keys, tokens, or credentials.
- Document required keys in `.env.local.example`.
- Treat `data/*.db*` as private local data because it may contain portfolio, watchlist, memo, and cache records.
- Before publishing, check that `.env.local`, `.next/`, `node_modules/`, and `data/` are ignored and untracked.

## Security Checklist
- Validate request inputs with `zod` or explicit allowlists before database writes or upstream API calls.
- Do not return raw database or provider error details to users unless the route is explicitly local-debug only.
- Keep public documentation free of personal holdings, account names, API keys, and real private notes.
- Prefer documented APIs and official feeds. Avoid scraping sources with unclear terms.

## Verification
Run the smallest relevant checks after changes:

```bash
npm run lint
npm run build
```

If data-source calls fail because a key is missing or the upstream is unavailable, the UI must still build and show a clear fallback state.
