CURRENT AGENT HANDOFF:
  Read AGENT-HANDOFF.md before modifying this build. It documents the current
  UI hierarchy, Daily rules, engine invariants, and analytics privacy boundary.

TRUE 82 v39 — full live site with THE DAILY and cookieless analytics.
This is the entire public site. Nothing needs to be merged into another build.
Duel/League/Weekly entry points remain hidden in the no-accounts live lane.

FIRST V39 DEPLOY — DO THIS IN ORDER:
  1. In the Cloudflare D1 console for the database bound to the site as DB,
     run migrations/0006_analytics_v3.sql once. It is additive only.
  2. Put the CONTENTS of this folder at the root of the deployment branch,
     commit once, and let Cloudflare Pages build the commit.
  3. Load the game and confirm the footer reads v39.
  4. Open /avocado with the existing DASH_KEY query. The Live pulse card
     should show fresh session_start, home_view, and data_ready rows with v39.
  5. Play one short test run and confirm game_start, game_complete, and the
     relevant share/result rows appear. Check the Build comparison card and
     confirm there is no Dashboard query warning before relying on any rate.
  6. Treat the new v39 cards as forward-only. Search detail, time-to-value,
     abandonment detail, section reach, and share-rank history start now.

ROLLBACK / SAFETY:
  - The event endpoint fails soft to the older schema if the site deploy lands
    before the migration. The game does not fail, but v39-only cards stay blank.
  - The migration cannot be re-run as written because SQLite rejects duplicate
    ADD COLUMN statements. Apply it once only.
  - The migration is additive, so rolling the client back does not require a
    database rollback.

ANALYTICS PRIVACY BOUNDARY:
  The analytics client creates no cookies, localStorage entry, sessionStorage
  entry, fingerprint, advertising id, account id, IP hash, or durable browser
  identifier. Visit and run ids are random and exist in page memory only.
  The Daily already stores its official result/streak locally for game
  functionality; v39 sends only coarse counts from that existing record.
  See ANALYTICS-V39.md for the exact event coverage and limitations. This
  technical design does not promise that every jurisdiction permits analytics
  without a notice or consent flow; retain the added privacy disclosure.

BEAT-MY-FIVE LINK:
  Links build from the page's own origin, so they work on preview and live HTTPS
  origins. They do not work from a local file URL.

CRITICAL VERSION-COUPLED CHAIN:
  analytics.js, app.js, index.html, functions/api/event.js,
  functions/avocado.js, migrations/0006_analytics_v3.sql

OFFLINE CHECKS:
  Keep true82-devtools-v39 beside this folder and run:
    node analytics-smoke.js
    python browser-smoke.py
    node audit.js 100 pool2
  browser-smoke.py requires Python Playwright plus Chromium and drives the real
  UI through search, abandonment, completion, share, outbound, and Daily paths.
  The older jsdom full UI walk additionally needs npm install in the devtools
  folder.
