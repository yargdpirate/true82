# TRUE 82 — Project Context

<!-- Maintenance: Current State is edited in place, keep it small. Decision Log
is append-only — new entries go above the marker below, existing entries are
never touched. Never regenerate this whole file. Log a new entry at the end of
any session that ships a real change; skip it for small back-and-forth. -->

## Current State (verified live 2026-07-03)

- **Live:** true82.net → Cloudflare Pages project (GitHub push = deploy, ~2 min).
  Old pre-migration Worker is orphaned — serves nothing, safe to delete.
- **Bindings:** `DB` → D1 `true82` verified working (analytics flowing; `/avocado`
  and the footer stat line both read it) · `GAMES` → KV **suspect on Production** —
  footer sat at 0 (see Open). Counter still pinged on every finish, no longer displayed.
- **Shipped & live:** payload split (crests.json background-loads; blocking payload
  −52%) · instant intro (mode taps queue until data lands) · backend hardening
  (KV guard, input clamps, x-t82-err, parallel dashboard queries, MAX-per-sid
  sessions) · Windows animation fix (reduced-motion ignored) · career-wide position
  eligibility · draft-screen position swap (SWAP/MOVING/HERE pills) · reroll economy
  (7.5% refund / 7.5% FIRE SALE −$2 floor $1) · bargain decay (×0.65ⁿ per year
  reroll) · Hot Hand gated to exactly 81 wins (≤80 = opaque "See Your Results"
  lever; overlay starts opaque, no entrance fade) · crest race fix + late paint ·
  cookieless analytics + /avocado dashboard · disclaimer rewrite (SR credit) ·
  test.js harness · donate labels v2 (+retired marking on /avocado) · footer stat
  line — contact on its own line, per-mode drafts + Presti WR incl HH stacked below it, via /api/stats;
  /avocado mode table gained a matching "82-0 w/ HH" column).
- **GEO Stage 1 — in THIS commit (first deploy):** static homepage content in
  index.html (visible H1 + intro + how-to + links inside #app; renderIntro()
  overwrites it on boot exactly as before, zero app.js change), upgraded head
  (canonical, title/description, full OG/Twitter set, new 1200×630 og-image.png),
  Organization + WebApplication/VideoGame JSON-LD (no ratings/reviews), persistent
  footer nav (survives hydration, hidden while drafting), four explainer pages as
  directory routes (/how-it-works/, /faq/ with matching FAQPage JSON-LD,
  /can-you-go-82-0/, /what-is-bpm/ — no analytics.js on purpose), robots.txt,
  sitemap.xml, and 404.html (flips Pages out of SPA fallback so unknown paths 404
  instead of soft-404'ing to the homepage). Pre-deploy the live site still serves
  the "GOATs"-title shell; verify all of this post-push.
- **Open:** `GAMES` KV binding looks unbound on **Production** — footer sat at 0, and
  code-wise only `!env.GAMES` yields a permanent 0. Definitive test:
  `curl -s -X POST https://true82.net/api/games` — a live binding must return
  `{"count":≥1}` on POST, so `{"count":0}` proves it's dead. Fix in Pages → Settings
  → Bindings on the **Production** env (Pages keeps Production/Preview sets separate;
  earlier "verified" may have been Preview). No code change needed; the footer no
  longer depends on it · set `DASH_KEY` env var → gates /avocado (currently public; code ready) ·
  delete orphaned Worker (optional) · build mode-info UI from docs/POPUPS.md copy ·
  dead-column strip in site_data (pos/port/rim/pm/ht, ~70 KB gz; upstream generator
  must adopt slim schema first) · dead-code purge (slotRailHtml, unused CFG keys,
  ~100 lines orphan CSS) · optional D1 index `idx_events_name_mode` · spot-check
  cf-cache-status: HIT on statics · **post-deploy GEO manuals (after this commit
  lands):** GSC domain property → submit https://true82.net/sitemap.xml →
  URL-inspect all 5 pages; Cloudflare Security Events: confirm Googlebot/
  Google-InspectionTool not WAF-challenged; spot-check a bogus URL returns a real
  404 (404.html should flip Pages off SPA fallback); confirm view-source of / shows
  the static intro and the "GOATs" title is gone · keep index.html's static intro
  copy in rough sync with renderIntro() on future positioning edits.
- **Settled (details in log — don't relitigate without new info):** swap is
  draft-only · reduced-motion deliberately ignored · refund/fire-sale = exclusive
  7.5/7.5 · decay 0.65ⁿ on bargain depth only · clutch = exactly 81 · KV counter
  stays separate from D1 (accrues undisplayed since footer v2) · module split
  declined (reopen: 2nd contributor or >3k
  lines) · ?clutch=1 stays.
- **Code map (grep names; line numbers drift):** app.js — `initData` (data parse,
  CAREER_BUCKETS, crest merge) · `engine` (season sim) · `chargeReroll` (reroll $ +
  refund/fire-sale) · `capRoll`/`capCost`/`assignCapPool`/`capMisprice` (pricing) ·
  `effCost` (fire-sale price) · `swapTargetsFor`/`doLineupMove`/`doLineupSwap`/
  `lineupRailHtml`/`bindLineupMoves` (position swap) · `hotHand`/`hhEligible`/
  `FORCE_CLUTCH` (overlay + clutch gate) · `refreshTicketArt` (late crest paint) ·
  `boot`/`loadCrests`/`start` (load flow) · `setFootStats`/`fetchFootStats`/
  `gameFinishedPings` (footer stat line). functions/: event.js (ingest),
  games.js (KV counter), api/stats.js (footer stats), avocado.js (dashboard + DASH_KEY).
- **Tests:** `node test.js` (41 checks) before touching game logic.
- **Mechanics reference:** `docs/MODES.md` — read only when touching engine/mode
  logic. Player-facing copy: `docs/POPUPS.md`.

## Decision Log
<!-- NEW ENTRIES ABOVE THIS LINE -->

### 2026-07-04 — Minor tuning: HH odds, footer layout, intro copy, donate button
Heat Check tier odds retuned: SUPERNOVA 20→14, HOT 25→28, ON FIRE 25→28 (COLD 5 /
WARM 25 unchanged; still sums to 100, hhSpinSeg reads %). Net effect: the top boost
(×2.0) is rarer, the two mid boosts (×1.35 / ×1.5) more common — a softer, more
frequent bump rather than occasional jackpots. 41/41 tests still pass.
Footer restructured on index.html: contact now sits alone on the first line (no
trailing separator); the D1 stat line moved to its own line below it and "Presti
winrate" shortened to "Presti WR"; the info nav (Play / How it works / …) moved
below the stats, restyled to match the contact line size (11px mono), left-justified
and bold (600 = heaviest loaded Plex Mono weight). #footStats became a block div with
`:empty{display:none}` so the zero-state (unbound DB / new DB) shows no gap. Nav CSS
change is shared, so content pages get the same left/bold/11px nav; their footer
order was left as-is (no stat line there). Intro copy: renderIntro's "1 role player"
→ "1 overqualified role player" (still bold); the four explainer pages keep their own
"one role player" prose, not synced (different register). Donate button (results top
bar) restyled to the presti-spin 3D bevel — done in CSS on `.donate-btn` rather than
adding the class, because `button.presti-spin` is element-scoped and the donate
control is an `<a>` (kept as an anchor so the href + donate_click analytics are
untouched). No app.js engine/mode/analytics/pricing/dashboard logic changed beyond
the odds table and the two copy/string edits.

### 2026-07-04 — GEO Stage 1: static SEO/entity foundations (first deploy)
Stage 1 of the GEO plan: make true82.net's initial HTML snippet-eligible and
entity-clear without touching gameplay. Zero changes to app.js, analytics, engine,
modes, Hot Hand, pricing, dashboard, or any functions/ file — verified byte-identical
to the pre-Stage-1 live repo; 41/41 tests pass. Split ~20% homepage hygiene / 35%
owned content, deferring the 45% off-domain work to later stages.

index.html: replaced the loading-only #app shell with visible static content (H1,
2-3 sentence description, how-to-play, links to the four explainer pages).
renderIntro() overwrites #app on boot exactly as before — the static block is the
initial-HTML version for crawlers, non-rendering AI parsers, no-JS, and link
discovery, NOT a second UI; renderIntro() already emits its own H1 so the rendered
DOM and the static block are both coherent. Keep the two in rough sync on future
positioning edits. Upgraded head: canonical, stronger title/description, full
OG/Twitter card set with a new 1200×630 og-image.png (the 800×188 logo cropped
badly at 2:1). Static JSON-LD: Organization + WebApplication/VideoGame in an @graph,
no aggregateRating/reviews (none exist). Persistent `.site-links` nav added to the
footer (outside #app, survives hydration, hidden while drafting via the existing
body.drafting rule).

Four explainer pages as clean directory routes (each an index.html): /how-it-works/,
/faq/ (FAQPage JSON-LD generated from the same strings as the visible text, 10 Q&As
— schema/visible match verified programmatically), /can-you-go-82-0/ (73-9/72-10/69-13
records and the ~1.5% perfect-season math verified), /what-is-bpm/. Answer-first,
POPUPS.md/MODES.md copy reused, Hot Hand trigger/odds and pricing internals kept at
the public "watch for surprises" tease level. Content pages deliberately do NOT load
analytics.js (a session_start with no game_start would pollute the D1 funnel).

robots.txt: allows public crawl, disallows /api/ + /avocado, references the sitemap;
also disallows the root .md docs (CONTEXT/README) + /docs/ — publicly served on
purpose per repo policy but they read like spoiler guides, so robots keeps them out
of results without unpublishing. sitemap.xml lists the 5 pages. 404.html: real 404s
for unknown paths. Its mere presence disables Cloudflare Pages' SPA fallback, which
otherwise returns the homepage with a 200 for every unknown path (infinite soft-404
homepage dupes — bad for indexing). Safe because the app is single-route with zero
history/pushState usage (grep-verified).

Deliberately skipped: llms.txt, nosnippet/max-snippet (would kill the snippet
eligibility this whole pass is for), _headers (robots-blocked routes never surface a
noindex header anyway; avocado.js self-noindexes), schema stuffing. Deferred:
/games-like-immaculate-grid/ (needs a careful hand-written comparison, not a thin
listicle), truew.net cross-link (add when confirmed ready). Post-deploy manuals
tracked in Current State → Open.

### 2026-07-03 — Footer v2: contact first, per-mode drafts + Presti winrate from D1
Footer line is now `Contact | N Presti drafts | N Classic drafts | N Pro drafts |
Presti winrate X%`, fed by new public `functions/api/stats.js` (D1, fail-soft zeros,
no-store; segments nowrap so mobile breaks at the pipes). Winrate counts 82-0 with
or without the Hot Hand: `game_complete.undefeated` (natural) + `heatcheck_result.
hit_82` for mode cap — the sets can't overlap because game_complete logs pre-boost
wins and HH fires only at exactly 81, so a boosted 82 exists solely as hit_82.
Client re-fetches 1.5 s after each finish so the count ticks up. An all-zero payload
renders NOTHING (a degraded deploy must not look like a dead game — that was the
exact failure mode of the old counter). Kaman excluded per spec. The 07-01 KV
decision stands: games.js untouched, POST still fires per finish, so the all-time
number keeps accruing undisplayed and stays continuous if ever re-shown. /avocado's
mode table gained an "82-0 w/ HH" column so the dashboard reproduces the footer's
number (its "undefeated" column stays natural-only — both are meaningful).

### 2026-07-03 — Donate labels v2
Removed "Prove my girlfriend wrong"; added "100% goes to girlfriend", "Fund weekly
challenges", "Keep developing the game", "Prove my parents wrong" — 9 in rotation.
The pipeline needed no change: event.js has no variant allowlist (80-char cap only)
and /avocado groups donate_click by whatever variant arrives. /avocado now marks
out-of-rotation labels "· retired" via a `DONATE_ACTIVE` set — KEEP IN SYNC with
`DONATE_MSGS` in app.js on future label edits (two lists, deliberate: functions
can't import app.js in a zero-build repo). Historical clicks on retired labels
stay in the data and on the card.

### 2026-07-03 — Documentation system established
README.md (internal), this file (edit-in-place state + append-only log),
docs/MODES.md (mechanics reference), docs/POPUPS.md (player copy). Protocol lives
in this file's header. Repo files are publicly served → no secrets policy.

### 2026-07-03 — Reveal overlay starts fully opaque
Created with the `in` class (entrance rAF fade removed); exit fade retained on
purpose — only the entrance transition was unwanted. Non-81 overlays also carry
`hh-reveal` (fully opaque backdrop) so results can't bleed through mid-drag.

### 2026-07-03 — Disclaimer rewrite
Removed the "judgment-proof finances" joke sentences. Added a Sports Reference /
Basketball-Reference / Stathead credit worded to be genuinely complimentary and
lawsuit-preventative: non-commercial, historical reference, no ownership claim.

### 2026-07-03 — Swap affordance v2: labeled pills
SWAP → MOVING → HERE verb flow replaced the quiet ⇄ corner chip. A bare glyph
couldn't self-explain; the word is the instruction. Only players with a legal move
wear a badge (honesty of affordance). Tokens lift + targets pulse dashed amber.

### 2026-07-02 — Hot Hand gated to exactly 81 wins
Full Heat Check (spin + possible boost) only at winTally === 81. ≤80 gets the same
lever titled "See Your Results" that just dismisses to results — no spin, no boost.
Rationale: the beat is "81-0, down in the 4th"; firing at 40 wins undercut it.
Considered ≤81 and configurable thresholds; rejected as diluting the moment.

### 2026-07-02 — ?clutch=1 QA hook shipped to prod
Exactly-81 is nearly impossible to draft on demand, so the clutch path was
untestable organically. FORCE_CLUTCH via URL param. No leaderboard, no stakes →
exploit risk ~0; QA value high. Deliberate.

### 2026-07-02 — heatcheck_* analytics fire only in the clutch path
Keeps pull-rate stats meaningful (a "reveal" pull isn't a heat-check decision).
Dashboard heat-check volume dropped to near-zero by design — not a pipeline bug.

### 2026-07-02 — Refund/fire-sale: mutually exclusive 7.5% / 7.5% slices
One roll per paid spin: <0.075 refund, 0.075–0.15 FIRE SALE, else nothing.
Independent rolls rejected — a simultaneous refund+sale on one press is incoherent.
(Refund was 12.5% before; the cut funds the new outcome.)

### 2026-07-02 — Bargain decay: ×0.65ⁿ on discount depth only
Each "Skip yrs" press shrinks the bargain band's depth (1−(1−m)·0.65ⁿ); resets on
new round / team skip / era skip. Rip-off band and CAP_GEM untouched — gems can't
hit shielded top-5 stars, and the exploit being killed was camping year-rerolls
for superstar discounts. Rejected: decaying gem odds (punishes cheap fills,
misses the exploit).

### 2026-07-02 — Position swap is draft-screen only; tap-tap, not drag
Results-screen swaps would retroactively change an already-simulated season
(backcourt/wing taxes are slot-dependent). Literal dragging rejected: 46 px tokens
fight page scroll on mobile; tap-to-select-then-tap-target is reliable.

### 2026-07-02 — prefers-reduced-motion deliberately ignored
Windows "Animation effects" off (common) reports prefers-reduced-motion, which
silently killed every spin, spray, and the entire Hot Hand sequence there. The
game IS the motion. prefersReduce()/reducedMotion() hardcoded false; CSS blocks
removed. Known, accepted a11y tradeoff — do not "fix" without a product decision.

### 2026-07-01 — Crests split out of site_data.json
Crests were 37% of the blocking payload (634 KB core vs 695 KB crests gz) and
purely decorative → separate background fetch; time-to-playable −52%. The load
race this created (initData clobbering merged crests) was fixed 07-02/03 by
merging in initData + refreshTicketArt late paint. The split itself stays.

### 2026-07-01 — app.js module split declined
Well-bannered, internally consistent file; a split forces the shared-globals
question (G, MODE, IDX, pool Maps) — real regression risk, zero user value.
REOPEN TRIGGERS: a second contributor, or app.js crossing ~3k lines. If reopened:
native ES modules (no bundler), split along existing banners, one state module.

### 2026-07-01 — Real rate limiting deferred to Cloudflare WAF
A soft same-host origin check DID ship in event.js (blocks lazy cross-site floods,
keeps preview deploys working) but curl can spoof it. Stricter in-code checks risk
silently dropping real data; proper rate limiting is an ops toggle, not code.

### 2026-07-01 — schema.sql and perfect-five.html deleted
Every repo-root file is publicly served → schema was live at /schema.sql.
perfect-five was a stale 3.5 MB pre-HotHand snapshot of the whole game that
incremented the public counter while emitting zero analytics (corrupting funnel
math) and duplicated the homepage for SEO. Git history preserves both.

### 2026-07-01 — games.js (KV counter) kept, not consolidated into D1
The KV count predates D1 — switching the footer to a D1 count would visibly reset
the public all-time number. Also isolates the public counter from the analytics
DB. It's 16 lines. Do not "helpfully" unify these.
