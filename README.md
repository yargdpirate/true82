# TRUE 82

**AI agents: read `AGENT-HANDOFF.md` before doing anything.** It is the current source of truth. The old `CONTEXT.md` (a 2026-07-04 snapshot and decision log) is retired to `docs/history/CONTEXT-2026-07.md`.

An "82-0"-style NBA draft game driven by advanced metrics — draft 5 players
(2G/2F/1C) from random franchise/era tickets, simulate an 82-game season, chase
82-0. Live at **https://true82.net**.

## Stack
Vanilla JS/HTML/CSS. **Zero build step** — what's in the repo is what ships.
Cloudflare Pages (static hosting + auto-deploy) · Pages Functions (`functions/`)
· D1 (analytics) · KV (games counter).

## Files
| File | What it is |
|---|---|
| `index.html` | Shell: intro mount, footer, disclaimer. ~3 KB |
| `app.js` | The game UI, modes and flow. ~6,500 lines. The season engine lives in `sim-core.js` |
| `styles.css` | All styling. The generated THEME block at the top is the only place colors and fonts are written; then the shared pieces (`.t-btn`, `.t-chip`, `.t-card`, `.t-sheet`, `.t-head`...). Read `docs/STYLE-GUIDE.md` |
| `site_data.json` | 21,525 player-season rows + `meta` (cols, scoring constants). Crests/aliases deliberately NOT in here |
| `crests.json` | Team-era crest images (base64 WebP), fetched in background, never blocks play |
| `logo.png` | 9.8 KB quantized logo (replaced a 140 KB inline base64; the header shows `masthead.png` since v52) |
| `favicon.ico`, `icon.svg`, `apple-touch-icon.png`, `icon-192/512.png`, `icon-mask.png`, `manifest.webmanifest` | The app icons (v57), drawn for favicon scale by `node tools/icons.js` from the theme's inks |
| `analytics.js` | Cookieless client tracker → `/api/event` |
| `test.js` | Headless logic harness — `node test.js`, 61 checks (incl. the style law and reel pacing). Run before changing game logic or styles |
| `tools/` | `theme-core.js` (the theme's one source), `theme.js` (writes the theme block), `style-law.js` (the enforced style rules), `stylefix.js` (puts a graft on the theme) |
| `docs/STYLE-GUIDE.md`, `docs/style-guide.html` | The style guide and its live page: tokens, shared pieces, section headers, how to add a mode |
| `functions/api/event.js` | POST ingestion → D1 (allowlists, clamps, swallows errors) |
| `functions/api/games.js` | KV games-played counter (accrues via POST; no longer displayed) |
| `functions/api/stats.js` | Public footer stats from D1: per-mode finished drafts + Presti 82-0 incl. Hot Hand |
| `functions/avocado.js` | Analytics dashboard at `/avocado` (env `DASH_KEY` gates it) |
| `og-image.png` | 1200×630 social card (generated from logo + design tokens) |
| `robots.txt` | Public crawl allowed; /api/, /avocado, and the .md dev docs disallowed |
| `sitemap.xml` | Homepage + the four explainer pages |
| `404.html` | Real 404s for unknown paths (its presence disables Pages' SPA fallback, which soft-404'd everything to the homepage) |
| `how-it-works/` `faq/` `can-you-go-82-0/` `what-is-bpm/` | Static SEO explainer pages (each an `index.html`; no analytics.js on purpose) |
| `AGENT-HANDOFF.md` | Current architecture, recent changes, invariants, validation. **Start here** |
| `reel-riso.js` | v48 riso season reel (cosmetic; `?riso=0` falls back to chips) |
| `results-riso.js` | v50 results print, THE SHAPE OF A SEASON, and the share poster (cosmetic; `?riso=0` falls back to the plain record) |
| `docs/ballot/` | The owner's tag-ballot package: brief, handoff, prototypes, and the scout-claims GitHub Action (reference, not installed) |
| `docs/MODES.md` | Deep mechanics reference (engine, modes, pricing, Hot Hand) |
| `docs/POPUPS.md` | Player-facing mode-blurb copy drafts |
| `docs/history/` | Per-task records: return handoffs, per-change deploy notes, patch manifests, superseded docs. Kept for the record, not current guidance |
| `docs/concepts/` | Design concepts. `print-shop.html` is the risograph makeover: five animated plates, opens directly in a browser |
| `docs/reprint-lab/` | The Reprint Lab: masthead + whole-site redesign explorer on real snapshots of every screen, 17 looks, one self-contained `reprint-lab.html` (see its README) |

## Local preview
Serve over HTTP — `python3 -m http.server` in the repo root, then open
localhost:8000. Opening `index.html` as a file breaks `fetch()`.

## Deploy
Push to GitHub main → Cloudflare Pages auto-deploys (~2 min). true82.net is bound
to the Pages project; the pre-migration Worker still exists but is deprecated and
serves nothing. Revert = revert the commit on GitHub.

## Bindings (Pages project → Settings → Bindings)
`DB` → D1 database `true82` (analytics) · `GAMES` → KV namespace (counter).
Both degrade gracefully if unbound: analytics, the footer stat line, and the
counter silently no-op — they never 500 and never affect gameplay. Note Pages
keeps **separate Production and Preview binding sets** — verify on Production.

## Data
Player/team data from Basketball-Reference / Stathead (Sports Reference LLC).
Independent, non-commercial fan project; full disclaimer in the site footer.

## Looks like a bug — isn't
- `prefersReduce()` / `reducedMotion()` return `false` unconditionally. Deliberate:
  Windows commonly reports prefers-reduced-motion and it killed every animation
  including the whole Hot Hand sequence. Known a11y tradeoff.
- `?clutch=1` forces the full Hot Hand sequence — shipped QA hook, on purpose.
- Heat-check analytics volume is near-zero — those events only fire on the
  exactly-81-wins path, by design.
- `event.js` swallows insert errors on purpose but exposes the reason in an
  `x-t82-err` response header (`curl -si` to see it).
- Multiple `session_end` rows per sid are expected; the dashboard takes MAX per sid.
- A crest can pop onto the first ticket a beat late on slow connections — that's
  `refreshTicketArt()` painting late-arriving data, not a flicker bug.
- Everything in this repo is publicly served at `true82.net/<path>` (including
  this file and everything under docs/). Policy: **no secrets in the repo, ever.**
