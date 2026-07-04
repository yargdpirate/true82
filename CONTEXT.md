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
  line (contact | per-mode drafts | Presti winrate incl HH, via new /api/stats;
  /avocado mode table gained a matching "82-0 w/ HH" column).
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
  cf-cache-status: HIT on statics.
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
