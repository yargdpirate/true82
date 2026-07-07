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
  · `ANTHROPIC_API_KEY` → **NOT SET YET** (secret; powers /api/recap AI recaps —
  feature falls back to local templates without it, nothing breaks).
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
- **BUGHUNT.md (the last note):** codebase-specific bug-angle field guide
  for future models — determinism/seams/races/auth/abuse/league classes +
  the hunting process. Writing it surfaced THREE live findings, triaged in
  its §0: manifest edits mid-league-season shift week challenges (fix:
  append-only law or store challenge_id per league-week), free duel ops
  re-arm quips (spam only), rematch fills the OPPONENT's open-match cap
  (mild grief). None block launch; all documented with fixes.
- **Security pass + league pacing (final Fable session, 2026-07-06):**
  CSRF gate in auth.js (cookie-sourced tokens on mutations need same-origin
  proof; Bearer untouched; frozen in §13), per-op length caps, anonymous
  runs need a sid to touch D1, open-match (20) + forming-league (10) caps,
  `_headers` security headers, wrangler.toml/.gitignore/.dev.vars.example
  secrets hygiene, SECURITY.md (threat model, blast-radius posture — D1
  holds no emails/passwords/IPs — Clerk+Cloudflare dashboard checklists,
  CSP recipe, rotation/deletion playbooks), EXTENDING.md (the rails).
  Fast-advance leagues: migration 0003, `advanceDecision` in league-core is
  the SINGLE pacing law (time path keeps Monday rhythm; fast path opens the
  next week the moment every matchup is in), pace picker at create.
  test.js → **157**.
- **Phase E: Leagues + analytics pack — in THIS commit:** full fantasy H2H
  league mode (league-core.js pure engine · migration 0002 · create/get+
  settle/join/start endpoints · run.js `league` branch · league-ui.js ·
  intro/deep-link wiring). Design: same-seed weeks from the manifest,
  one-attempt via the existing officials index (`lg|<id>|<w>` labels),
  ISO-Monday season clock, settle-on-read with insert-once results + CAS
  clock, computed standings with tie-GROUP h2h. test.js → **153** (§10c: 13
  league-math checks incl. full-RR pair coverage, odd-N bye distribution,
  h2h-overrules-pf). Analytics decision: NO new capture — runs table is the
  account retention spine (real since the audit), events stays consent-free
  by design; `scripts/analytics.sql` ships the 10-query commercial pack
  (cohort retention, mode-hook retention, league no-show canary, churn list).
- **Integration audit (2026-07-06, post-D2) — in THIS commit:** six seams
  read end-to-end, six findings, four code defects fixed, contracts frozen.
  F1 accounts.js→run.js dialect (nested objects vs flat flags — every
  daily/weekly would have stored CASUAL, silently; also response fields,
  dedup handling, + persistent device `sid` so /api/claim can stitch even
  with a lost ledger). F2 /api/daily now self-describes `mode` (intro strip
  called newGame(undefined)). F3 Arena reads lb's real `{top, me}` shape.
  F4 forfeit-materialize bumps updated_ts (pollers no longer 304 past the
  settle). F5 verified-sound: numeric seed round-trip, replay(payload, ch)
  signature, server-side week derivation, claim.js fields. F6 (caught BY the
  new freeze suite while it was being written): accounts.js read rp.S.rng.n
  — replay returns {ok, result, rngDraws}; every submission would have sent
  rngDraws: undefined, silently SKIPPING the draws check in verifyRun.
  test.js §14b CONTRACT FREEZE → **138 checks**: payload round-trip both
  directions, LIVE /api/daily + /api/weekly executions (no DB/Clerk needed),
  and a dialect tripwire greping both sides of the wire.
- **Accounts Phase D2b (Arena) — in THIS commit:** `arena-ui.js` — profile
  banner (mono GM tag, inline name edit via POST /api/name), your-move +
  since chips, Duel-a-friend button, three board strips (today / this-week
  with challenge self-marketing / Immortals) with me-rank lines, per-mode
  ledger + most-drafted. Per-section fail-soft; anonymous gets global boards
  + the claim funnel. Intro gains the \uD83C\uDFDF Arena chip (instant — no
  data dependency). ACCOUNTS §15.1 corrected: immortal shelf = lb immortals
  (hof.js mints cards, doesn't list). test.js unchanged (DOM module) → 132.
- **Accounts Phase D2a (duel screen) — in THIS commit:** `duel-ui.js` — the
  full correspondence client (?duel= deep link, ETag poll, lobby/create/join/
  share, season+slot pickers, quips drawer with one-per-turn UX, two-tap
  resign, rematch navigation, verdict banners). RENDERING LAW: client
  rebuilds via T82DUEL.replayMatch and renders that — validation and display
  share one state machine. draftable() enriched (seasons[]/slots[]/cost —
  POOL_YEARS holds ROW arrays, mapped through IDX.season). GET match now
  returns `youWon` (server-side, so resigned/archived verdicts never guess
  id mappings). Intro gains "Duel a friend"; renderIntro kills duel polls.
  test.js → **132**. Arena = next (spec §15.1).
- **Accounts Phase D1 (challenges + client) — in THIS commit:** full 98-entry
  weekly manifest (`challenges.js`, creative-doctrine permutations authored
  against measured distributions) + `scripts/validate_challenges.js` gate
  (miss-tolerant survivability sims; SPCY = intentional tension) +
  `/api/weekly` (override-aware tile endpoint) + `accounts.js` (Clerk
  two-script wiring behind CONFIG placeholders, local run ledger, claim
  stitch, THE SUBMISSION LAW: client replays its own game via T82.replay and
  submits core truth — UI state never touches a claim) + intro rework (daily
  strip, This-Week self-marketing tile, Pro demoted to quiet row, kaman OFF
  the menu — five quick taps on the title summon Him) + submit chokepoint in
  gameFinishedPings + runStatus chip. Core: pick-hooks folded into
  rowDraftable (solo ladders can't soft-lock); frs-constrained deals
  pre-filter eras. test.js → **131 checks**. Arena + duel screen = Phase D2
  (build spec: ACCOUNTS §15).
- **Accounts Phase C (Duel Draft) — in THIS commit:** `duel-core.js` (shared
  match engine: one sim-core state + two mounted overlays; strict alternation;
  One-Jersey free via the shared drafted set; forced-skip gate; P1-then-P2
  Hot Hand at resolve; rebuild-from-ops serialization law) + `/api/match*`
  endpoints (ETag polling, forfeit materialized on read, optimistic-lock
  races, consent-light rematch swap). test.js → **125 checks** (§10b duel
  state machine: 14 checks incl. forged-mover + bit-identical replay; §14 now
  imports all 12 endpoint modules). index.html does NOT yet load duel-core.js
  or challenges.js — Phase D wires the client.
- **Accounts Phase B (API layer) — in THIS commit:** `migrations/0001_accounts.sql`
  (full §3 schema + data_version/challenge_id/week) · `functions/_lib/auth.js`
  (WebCrypto RS256 Clerk verify, re-checked vs live docs; every failure →
  anonymous; tag-generating user upsert) · `_lib/daily.js` (HMAC seed minting,
  UTC labels + 26h grace, name filter) · endpoints: daily, run (official/
  weekly/casual, server-authoritative, rank reply), me, claim, name, lb
  (query-registry boards per §6), hof, notebook · RUNBOOK.md (deploy sequence,
  Clerk dashboard steps + current 2-script CDN snippet, smoke curls,
  symptom→cause playbooks, weekly KV pin, secret rotation). test.js → **108
  checks** (§13 real-RSA auth + HMAC seeds + name filter; §14 endpoint
  import-graph smoke = node rehearsal of the esbuild CJS interop). finish()
  now returns `picks` [[name,season,slot,cost],…] (additive; goldens intact).
- **Accounts Phase A (stage-2 extraction) — in THIS commit:** sim-core.js is
  T82 **VERSION 2**, the complete headless game (tables/initData, deal loop,
  skips, cap economy, applyPick, engine, Hot Hand, `replay`+`verifyRun`);
  app.js = UI shell of same-name wrappers passing `G` (zero call-site churn).
  Op grammar now `k:<name>|<season>|<slot>` (season = classic choice +
  integrity check; slot feeds D-taxes). `challenges.js` manifest (11 creative
  exemplars, hook API, ISO-week rotation) + `functions/api/verify.js`
  (stateless, fail-soft) + `functions/_lib/data.js` (ASSETS bootstrap).
  test.js → **85 checks** incl. full-game replays, tamper rejection, challenge
  hooks, and GOLDEN FIXTURES frozen vs the real dataset (dataVersion
  2421484606) — goldens breaking = draw order changed = deliberate VERSION
  bump only. Latent bug fixed en route: capPoolHasPick honored the UI search
  query (stale no-match search → 40 phantom re-deals on skip); core scans the
  raw pool. Docs: ACCOUNTS §2.3/§2.4 rewritten as-built, NEW §5.5 (Weekly
  design lock + creative doctrine), NEW §14 (gap-audit rulings); MODES.md HH
  odds drift fixed (5/25/28/28/14 — code wins).
- **Accounts Sprint 0 — shipped 2026-07-05:** `sim-core.js` (global `T82`: seedOf /
  autoSeed / makeRng / queueRng, VERSION 1, mulberry32) loads before app.js;
  every outcome-relevant draw now flows through `G.rng` via `rf()`/`ri()`, and
  `newGame(mode, seed)` accepts an optional seed (none -> autoSeed; casual play
  unchanged). Foundation for daily boards / duels / verified leaderboards —
  full spec in **ACCOUNTS.md**. Fail-soft: sim-core missing -> rf() falls back
  to Math.random. Test harness +10 checks (real count was 47, header said 41 —
  Tribune checks were never counted; now 57).
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
- **Open:** **set `ANTHROPIC_API_KEY`** (Pages → Settings → Environment variables,
  encrypted, on BOTH Production and Preview — same split-env trap as the KV binding)
  to switch season recaps from local templates to the thinking model; optional
  knobs: `RECAP_MODEL` (default claude-sonnet-4-6), `RECAP_HEADLINE_CAP` (default
  400/day, ~$0.012 each) and `RECAP_ARTICLE_CAP` (default 150/day, ~$0.03 each) →
  absolute worst case ≈ $10/day at both caps, typical day well under $1 ·
  `GAMES` KV binding looks unbound on **Production** — footer sat at 0, and
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
  sim-core.js — `T82` seeded-RNG core; app.js `rf`/`ri` (stream helpers + THE
  INVARIANT comment block, read it before touching any Math.random call) ·
  `newGame(mode, seed)`.
- **Tests:** `node test.js` (57 checks) before touching game logic in app.js OR sim-core.js.
- **Mechanics reference:** `docs/MODES.md` — read only when touching engine/mode
  logic. Player-facing copy: `docs/POPUPS.md`.

## Decision Log

### 2026-07-06 — Hardening: security is mostly what you refuse to store
The audit-grade finding: the strongest control was already architectural —
D1 never held emails, passwords, or IPs, so the breach blast radius is
pseudonymous scores and filtered display names. The one real hole was CSRF
via Clerk's cookie fallback; the fix rides the fail-soft law (unproven
cross-site mutations degrade to anonymous rather than erroring). Rate
limiting deliberately lives in Cloudflare's dashboard, not app code. Fast
advance was added by giving the week clock ONE owner (advanceDecision) —
endpoints ask, never decide — so future pacing ideas (playoff clocks,
holiday pauses) are a pure-function edit with tests, not a schema hunt.

### 2026-07-06 — Phase E: retention is a mechanic before it's a metric
Chose leagues over an analytics build because the league IS the answer to
"how often do they come back" — a Sunday matchup deadline outperforms any
dashboard. The analytics half resolved to a finding, not a feature: capture
already exists in two spines (runs = signed retention, events = anonymous
funnel, deliberately consent-free), so #5 ships as SQL. League design leaned
on maximal reuse: the officials UNIQUE index enforces one-attempt with zero
new code, the daily seed-minting pattern serves league weeks, the manifest
provides infinite weekly variety, and settle-on-read extends the zero-cron
law. Two engine subtleties worth the Fable hours: h2h tiebreaks recompute
inside the FULL tied group (pairwise h2h mis-crowns 3-way cycles), and one
red test was a wrong FIXTURE (an accidental cycle), not a wrong engine —
recomputing the fixture by hand before touching code saved a false "fix."

### 2026-07-06 — The audit: seams drift where summaries substitute for reading
Six phases with a mid-session compaction produced exactly the predicted bug
class: contract drift at client↔server seams, all silent. The two worst
(flat-vs-nested submission dialect; rngDraws read from a field that doesn't
exist) would have shipped a leaderboard product where no official run ever
counted and verification quietly weakened — no errors anywhere. The lasting
countermeasure is §14b: contracts are now EXECUTED in CI (payload built the
way the client builds it, pushed through verifyRun both directions; /api/
daily and /api/weekly called live as pure request→response), plus a dialect
tripwire that fails if either side of the wire changes vocabulary alone.
Law for future sessions: when a summary says "trust the shape," that is the
seam to read first.

### 2026-07-06 — Phase D2a: one state machine draws and judges
The duel screen renders what replayMatch rebuilds — never a hand-maintained
mirror — so a render can't disagree with a validation. Race handling follows:
any `raced` or `state-corrupt` answer just refetches truth and redraws (a
correspondence game can afford the round-trip; a shadow-state client would
have to reconcile). Verdicts for resigned/archived matches come from a new
server-computed `youWon` (the op log never encodes resignation, so the
rebuilt M can't know; and the client doesn't know user ids, only its index).
draftable() got enriched into full UI rows after discovering POOL_YEARS
stores row arrays, not years — one failing check caught the wrong assumption
before any UI was written on top of it.

### 2026-07-06 — Accounts Phase D1: the manifest, the gate, the submission law
98 weeklies authored against measured data (counts live in challenges.js
header) — creative doctrine enforced: mechanics permutations with mid-draft
punchlines, never data slices. The validator caught 10 broken designs before
any player could: strict price/height ladders degenerate at floors ($1) and
ceilings — non-strict or ±2-grace versions keep the theme; decade_ladder
needed a guided window; loyalty-family needed deep-franchise opening gates;
and expansion_class exposed a real core bug (frs-constrained deals burning
all 40 tries on eras the allowed franchises never inhabited — fresh-era
preference steered INTO them). Two lasting laws: pick-hooks fold into
rowDraftable so deals route around hook-dead boards (solo ladders cannot
soft-lock), and the client NEVER submits UI state — accounts.js replays the
finished game through T82.replay and submits the replay's wins/net/rngDraws,
so claims match server verification by construction (no Hot-Hand timing
coupling). Validator uses miss-tolerance (one strand at any n = tension, not
breakage) because weeklies are unlimited-attempt. Kaman left the intro menu;
five quick title-taps bring Him back.

### 2026-07-06 — Accounts Phase C: duels as one state, two overlays
The match engine reuses sim-core untouched: mount the mover's overlay
(picks/filled/budget/skips) into the shared S, run the same applyPick/skip/
charge functions, unmount. Drafted set stays shared → One-Jersey Rule needs
zero code. DEAL LAW: S.round derives as picks+1 for actions but picks for
deals (dealRound pre-increments; the off-by-one refuses a 4-pick player's
fifth board — caught in review, documented in the file). Matches serialize as
(mode, seed, ops) only — the RNG is a closure, so rebuild-from-ops is both
the storage format and the tamper check; server rebuilds on every move.
Forfeit (§14.3) materializes on GET (read-triggered settle keeps zero-cron
honest). Moves optimistic-lock on updated_ts → "raced" beats double-applies.
Rematch gives the requester's OPPONENT first move — consent-light. Fake
dataset grew to 14 persons so a 10-pick duel always finds bodies (the 4-and-4
"exhaustion" failure was the engine settling a genuinely dead board —
correct behavior, undersized fixture).

### 2026-07-06 — Accounts Phase B: the API layer, fail-soft everywhere
Auth: manual JWT verification per live Clerk docs (PEM public key env,
RS256 via WebCrypto, exp/nbf skew 60s, azp allow-list) — chosen over the SDK
so functions stay dependency-free and node-testable; anonymous IS the failure
mode, never an error. Daily seeds minted at read (HMAC(DAILY_SECRET, label)),
26h label grace on submit. /api/run: server result is authoritative on
verified runs; official daily re-derives the seed (client mismatch =
rejected); weekly enforces the active challenge (KV override → rotation);
anonymous official submits store as casual with note "sign-in-to-count" (the
account prompt writes itself). One composite score (wins + net/1000)
everywhere ranks are computed. lb.js is a literal query registry — §6's
"adding a board = adding a query" made structural. Achievements deliberately
deferred (tables ready; evaluation lands with the Arena). All 9 endpoint
modules import-smoke in node — the CJS interop rehearsal esbuild must match
on first Preview (RUNBOOK §2 has the check + fallback).

### 2026-07-06 — Accounts Phase A: stage-2 extraction — the whole game goes headless
**What/why:** Workers ban eval/vm, so the server verifier can't vm-load app.js
the way test.js does — the logic had to physically move. sim-core.js is now
**T82 VERSION 2**: tables + initData, eligibility, deal loop, skips, cap
economy, applyPick, engine, Hot Hand, `replay` + `verifyRun`. app.js keeps
every original function NAME as a thin wrapper passing global `G` (state model:
every core fn takes state `S` first; G *is* an S) — zero call-site churn, the
pre-existing 57 checks never went red during the move.
**Decisions locked:** op grammar is `k:<name>|<season>|<slot>` (classic year
choice is an outcome; season doubles as replay-integrity check in pro/cap;
slot feeds the D-taxes) · challenge hooks live IN the core (`S.ch`:
filter/pick/deal/cfg, tables passed to hooks) with the Trust law — NET_SD,
BASELINE, REPLACEMENT, Hot Hand not hookable · dataVersion hash stamped by
initData, checked by /api/verify · golden fixtures frozen vs the real dataset
(dataVersion 2421484606) — a golden breaking means draw order changed, which
means a deliberate VERSION bump, never an accident.
**Behavior fix (intentional):** capPoolHasPick scans the raw pool; the old one
honored the UI search query, so a stale no-match search could force 40 phantom
re-deals on a skip.
**Shipped files:** sim-core.js v2 · app.js (UI shell + CORE DELEGATION block) ·
challenges.js (starter 11 + creative doctrine + ISO-week rotation) ·
functions/api/verify.js (fail-soft, pre-checks before replay CPU) ·
functions/_lib/data.js (ASSETS bootstrap, one initData/isolate) · test.js →
85 checks (§9 full-game replays + tamper, §10 hooks, §11 goldens, §12 manifest
+ live weekly on real data). Docs: ACCOUNTS §2.3/§2.4 as-built, NEW §5.5
(Weekly design lock), NEW §14 (gap rulings); MODES.md HH odds 5/25/28/28/14
(code wins over the stale doc).

### 2026-07-05 — Accounts Sprint 0: seed spine — all outcome RNG behind G.rng
- **What:** new `sim-core.js` (T82) + app.js reroute of every outcome-relevant
  draw through `G.rng`: ticket era + franchise (`pick1`/`randFranchise`), skip
  targets, `chargeReroll` die, `assignProSeasons` + `assignCapPool` season
  locks, `capRoll` (all bands), `capMisprice` (gems/traps/weak-lift),
  `hhPickHot`, `hhSpinSeg`. `pick1` is now stream-backed; its one cosmetic
  caller (scramble-reel names) was split onto Math.random. `newGame(mode,
  seed)` seeds the stream; index.html loads sim-core.js before app.js.
- **Why:** given the same seed and the same ordered actions, a game now
  replays bit-identically — the foundation for daily shared boards, duels, and
  server-verified leaderboards. Full accounts-era spec: **ACCOUNTS.md**.
- **Invariant** (block above `rf()` in app.js): only logged, replayable
  actions consume G.rng; cosmetics stay on Math.random forever; POOLS Map
  iteration order is part of the replay contract.
- **Fail-soft:** sim-core absent -> `G.rng` null -> `rf()` falls back to
  Math.random (exactly the pre-Sprint-0 behavior).
- **Tests:** +10 seed-spine checks, incl. a Math.random-poisoned proof that
  the stream wins when present, and whole-board `assignCapPool` replay
  (same seed -> identical prices + year locks). Count drift fixed: 41 -> 57.

<!-- NEW ENTRIES ABOVE THIS LINE -->

### 2026-07-04 — Tribune v2: two-phase generation, paper-as-reveal, press-room loading
Redesign of the same-day Tribune entry below, before first deploy. Three changes:
**(1) Two-phase model calls.** The article no longer generates at season end — only
the nickname+dek do (`phase:"headline"`: thinking 700, ~$0.012). The four-sentence
story fires ONLY on READ MORE (`phase:"article"`: thinking 1400, ~$0.03), and the
request carries the nickname already in print (even a fallback one) so the story
never contradicts the headline. Assuming most readers skip, blended cost ≈ the
headline price. Separate KV caps: RECAP_HEADLINE_CAP 400/day, RECAP_ARTICLE_CAP
150/day → absolute ceiling ≈ $10/day, typical day well under $1.
**(2) The paper IS the reveal.** For every non-Heat-Check season (classic, pro, and
cap without a real spin pending) the Tribune replaces the old lever/ball-through-net
reveal gate: results render underneath, the overlay comes up OPAQUE (same radial
treatment as hh-reveal), and the record breaks as the headline stamps in. The lever
survives only when a real Heat Check is pending (81 wins in Presti / FORCE_CLUTCH);
after its ceremony the paper follows non-gated. hotHand's non-clutch reveal branch
is now dead code — left in place on purpose (FORCE_CLUTCH still exercises the
overlay; deleting it is a bigger diff for zero behavior). Drafted-82-0 fireworks
(fireWL) moved from the 360ms auto-burst to paper close, so the burst isn't wasted
under an opaque gate.
**(3) Press-room loading states.** While the headline generates, the paper shows
greeked typeset bars (shimmer sweep) under the masthead plus a mono teletype ticker
with blinking block cursor cycling HOT OFF THE PRESS / STOP THE PRESSES / SETTING
TYPE / INK STILL DRYING; the real headline lands with a rubber-stamp animation
(scale 1.5 + slight rotation → settle) and only then does READ MORE appear. The
article gets its own state: byline flips to "TELETYPE — STORY DEVELOPING", six
greeked body lines, ticker phrases swap to REWRITING THE LEDE / CALLING THE COPY
DESK / etc., and the finished text fades in like drying ink (blur+opacity).
**Buttons per spec:** all three are the raised presti-spin bevel — READ MORE sits ON
the paper re-inked to newsprint black-and-white (the bevel's custom props made the
monochrome variant a 4-line override), SKIP TO RESULTS and RUN IT BACK sit under
the paper in standard gold. Skip closes to results and leaves the EXTRA! chip
(reopen is a fast half-spin, headline/article instant from cache); backdrop tap =
skip; RUN IT BACK mirrors the Heat Check's replay (tracks `replay`, straight to
newGame). Timeouts: headline 12s server / 14s client, article 20s / 22s — every
miss stamps or inks the local fallback instead. Verified beyond the 47-check
harness with a throwaway jsdom smoke run (18 checks: gate → ghost → stamp → read →
teletype → ink → skip → chip → reopen), not shipped — the harness stays
dependency-free per repo rules.

### 2026-07-04 — The True 82 Tribune: AI season-recap newspaper
Every finished season (classic/pro/cap; kaman's meme page excluded) now ends with a
spinning newspaper front page: masthead, date line, headline "<NICKNAME> FINISH
<W>-<L>", italic dek, and a four-sentence SI-style story behind a READ THE STORY /
SKIP pair (skip leaves an EXTRA! chip to reopen; backdrop tap = skip).
**Architecture:** new `functions/api/recap.js` — the ONLY sane place for the model
call, since everything at repo root is public and an API key can never ship in
app.js. POST roster + engine fit signals → Claude (`claude-sonnet-4-6`, extended
thinking, 1400-token budget) → strict JSON {nickname, dek, article}, validated and
length-clamped server-side. Prompt encodes the product spec: nickname 2-4 words from
real-world reputation + composition (plural-reading, no franchise/player names),
exactly 4 sentences / 75-100 words, narrative not analysis, personality only where
famous, and a 14-band season-tier table (82 immortality · 81 heartbreak · 74+ broke
73-9 · 73 matched it · … · 0-82 perfect futility) driving tone.
**Fail-soft chain (repo rule):** no key ("unconfigured") / over budget / timeout
(20s server, 22s client) / bad parse → {ok:false}, and the client writes the edition
itself via localRecap(): rule-based nickname from the loudest fit signal (Matadors /
Five Alphas / Bricklayers / Splash Dynasty…), tier-toned 4-sentence template from
the same engine facts. The paper ALWAYS lands; the key only upgrades the prose.
**Cost control:** soft daily cap in the existing GAMES KV (`recapcap:<date>`, default
400, env `RECAP_DAILY_CAP`), fail-OPEN when KV is down/unbound — the dead Production
KV binding cannot break recaps. **Timing:** request fires at showResults; for a real
Heat Check spin (81 wins or FORCE_CLUTCH in cap) it defers to verdict() with
post-boost totals — key detail: ANY non-COLD segment moves the record, not just
82-hits, so finals come from segIdx>0 ? hhWins(newNet) : e.winTally. The overlay
never shows over the Heat Check (`.hh-overlay` gate); hotHand's dismiss() re-checks
and restarts the 25s freshness window — older-than-that responses become the chip
instead of yanking the reader mid-ledger. **Safety:** model output rendered with
textContent only (never innerHTML); server strips <>{}\ from every prompt-bound and
returned string. **Analytics:** recap_shown (segment = api|fallback, variant =
nickname — /avocado groups it automatically), recap_read, recap_skip; names added
to event.js allowlist, no D1 schema change. **Tests:** harness 41 → 47 (tier
boundaries, fit-note synthesis, fallback shape/4-sentence/word-count — the
4-sentence check caught a 5-sentence template bug pre-ship). Manual step to go
live-AI: set ANTHROPIC_API_KEY on Production AND Preview (see Open).

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
