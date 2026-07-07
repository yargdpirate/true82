# TRUE 82 — Accounts, Arena & Duels (the authoritative spec)

> START HERE for anything accounts-era. Read beside CONTEXT.md (history) and
> MODES.md (engine mechanics). If code and this doc disagree, code wins — then
> fix the doc. Decisions below were settled with Gray on 2026-07-05; the
> flip-switches he ruled on are marked ⚑. Sprint 0 is SHIPPED (see §2).

## 0. North star & product law

**North star:** "Every day there's one board worth arguing about. My Arena
remembers every genius pick, every cursed almost-perfect team, every obscure
player I learned to respect." Randomness gets the click; mastery gets the
month; identity gets the year.

**Engagement stance (settled):** identity mechanics over compulsion mechanics —
not just ethics, strategy. TRUE 82's premise is *the sim is fair and your
basketball knowledge matters*; hidden rigging, hostage streaks, or pay-shaped
randomness poisons exactly that, and with no monetization, compulsion buys
churn with goodwill. See §13 for the explicit not-building list.

**Laws (additions to repo law — fail-soft, secrets-on-both-envs, no bundler,
deploy by push, keep 404.html):**
1. **Anonymous-first, forever.** Login *unlocks* (boards, Arena, duels); it
   never gates or rewrites the live flow. Auth failure degrades to logged-out.
2. **Trust law.** Never adjust the engine, prices, odds, or the Hot Hand per
   user. Personalization may pick *what to show*, never *what happens*.
3. **Zero-cron law.** No scheduled jobs. Anything time-based (daily seeds,
   weekly champions, match archiving) is derived from the clock at read time.
4. **Moderation-surface law.** No public user free text anywhere. The only
   user-authored public strings are display names and group names — both
   filtered server-side. Duels talk in preset quips (§10).
5. **Seed-spine invariant** (block above `rf()` in app.js): only logged,
   replayable actions consume `G.rng`; cosmetics stay on Math.random forever;
   POOLS Map iteration order is part of the replay contract.

## 1. Settled decisions (don't relitigate without new input)

- **Auth = Clerk**, vanilla ClerkJS via CDN `<script>` (no bundler). Verified
  2026-07-05: free tier is **50,000 monthly *retained* users**, commercial use
  allowed, "First Day Free" (users who bounce inside 24h never count), small
  "Secured by Clerk" badge. ⚑ Gray accepted the badge. At the cap Clerk blocks
  *sign-ins*, which fail-softs to anonymous play — the game never breaks.
  Re-verify the exact CDN snippet against live Clerk docs at Sprint-1 wiring
  (that integration path drifts). Fallback provider if Clerk ever misfits:
  Firebase Auth (NOT Supabase — avoid second-database gravity).
- **JWT verification is networkless.** Pin Clerk's RS256 public key in env
  (`CLERK_JWT_KEY`, PEM) and verify session tokens in Functions with
  `crypto.subtle` — zero external calls on the hot path.
- **Display name ≠ login identity.** Non-unique names + server-assigned tag
  (`GRAY#4F2K`). Server-side profanity/slur wordlist at name-set; rejection
  falls back to `GM-####`. Friend-adding is link-based, so unique handles are
  unnecessary.
- **Stitching:** first login adopts the device's anonymous history —
  append-only, deduped by client run UUIDs; multiple devices may stitch into
  one account. One-way; no un-stitch.
- **Verified vs casual runs.** Official runs (daily boards, records boards,
  duels) are server-replayed from `{seed, actions}` and only the server's
  recomputation counts. Casual runs record client-reported, flagged
  `verified=0`, and feed personal stats + low-stakes achievements only.
- ⚑ **Order: Daily 82 ships before Duels** (daily de-risks the verification
  pipeline duels depend on).
- ⚑ **Duels use a shared contested table + the One-Jersey Rule:** the
  existing person-keyed `G.drafted` set becomes *match-scoped across both
  rosters* — once either GM drafts any season of a player, every other season
  of that person is dead for the whole match (shown as a SIGNED stamp).
  "Independent drafts, coordinated reveal" isn't lost — that's exactly what
  friend groups on the daily board already are.
- **Duels require an account** (the signup carrot); the invite link is the
  acquisition funnel — invitee claims a profile in-flow.
- **Rewards are cosmetic only, always:** titles, frames, banners, crest
  unlocks. Never gameplay power, never purchasable.
- **Streaks are weekly and forgiving** ("played 3 days this week"), never
  daily hostage counters. The lifetime-count achievement style (§7 №37) is
  the template.

## 2. Architecture

### 2.1 Seed spine — SHIPPED (Sprint 0, 2026-07-05)
`sim-core.js` (global `T82`, VERSION 1): `seedOf(label)` (FNV-1a + avalanche →
uint32), `autoSeed()`, `makeRng(seed)` (mulberry32 stream with draw counter
`n`), `queueRng(seq)` for tests. app.js consumes it through `rf()`/`ri()`;
`newGame(mode, seed)` seeds per game. Rerouted outcome draws: ticket era +
franchise, skip targets, reroll die, Pro/cap season locks, the whole cap
pricing pipeline (capRoll bands, gems/traps, weak-lift, shuffle), and both Hot
Hand draws (`hhPickHot`, `hhSpinSeg`). Cosmetics untouched. Harness: 57
checks, including a Math.random-poisoned priority proof and whole-board
`assignCapPool` replay. **Do not change the PRNG or draw order without
bumping `T82.VERSION`** — verified runs store the version so old replays stay
checkable.

### 2.2 Seed derivation
- Casual: `autoSeed()` per game (unpredictable; play feels identical to
  pre-Sprint-0).
- Daily: label `YYYY-MM-DD|mode` (UTC rollover; client shows a local
  countdown). Seed = first 4 bytes of `HMAC-SHA256(DAILY_SECRET, label)` as
  uint32, computed *at read time* in `GET /api/daily` — never derivable
  client-side before release, zero cron.
- Duels: seed = HMAC(DAILY_SECRET, `duel|` + matchId), minted at match create.

### 2.3 Action log (the replay unit)
Ordered array of compact ops, one per player input that can touch the stream
or the roster:

```
"k:<name>|<season>|<slot>"  pick — season is the classic year CHOICE (an
                            outcome!) and doubles as a replay-integrity check
                            in pro/cap; slot matters (slot-scoped D taxes)
"st" | "se" | "yr"          skip team | skip era | skip years (cap)
"mv:<i>,<slot>"             lineup move (pick i -> open slot) — no stream draw
"sw:<i>,<j>"                lineup swap                       — no stream draw
```

The core logs ops itself inside `applyPick`/skips/moves (replay pops its own
re-log so the submitted array stays canonical). A fabricated season →
`{ok:false, why:"illegal-op"}`; a *legal-but-different* season is a different
game and dies on the claim compare instead — both covered in test.js §9.

Client submits `{seed, mode, actions, rngDraws: G.rng.n, dataVersion,
challengeId?, claim:{wins,net,hh?}}`. `T82.replay` rebuilds the game headless
(newState → dealRound → ops → finish, HH from the stream at exactly 81);
`T82.verifyRun` compares the claim. `rngDraws` mismatch = early divergence signal. Any mismatch →
HTTP 200 `{ok:false, why:"replay"}` + `x-t82-err` (never a 500, repo law).

### 2.4 Stage-2 extraction — SHIPPED (Phase A, 2026-07-06)
`sim-core.js` is now **T82 VERSION 2: the complete headless game** (~38 KB).
State model: every public fn takes the state object `S` first (app.js passes
its global `G` — same shape). Tables live at module scope, built once by
`T82.initData(data)` (returns/holds `T82.t`: IDX, SC, CFG, POOLS, POOL_YEARS,
FR_BY_DEC, CAREER_BUCKETS, KAMAN_SEASONS, `dataVersion` = seedOf of
cols+count+span…). In the core: eligibility, the deal loop (`dealRound`),
skips (`skipTeam`/`skipEra`/`yearReroll`), the whole cap economy, `applyPick`,
lineup `moveSlot`/`swapSlots`, `engine`, Hot Hand resolution (`finish`), and
the verifier (`replay`, `verifyRun`). Challenge hooks (§5.5) plumb through
`S.ch`. app.js kept every original function NAME as a thin wrapper passing
`G` — zero call-site churn, the whole pre-existing harness stayed green
through the move. Bonus fix: `capPoolHasPick` now scans the raw pool (the old
one honored the UI search query — a stale no-match search could force 40
phantom re-deals on a skip).

Shipped alongside: `challenges.js` (manifest, §5.5), `functions/api/verify.js`
(stateless verification seam Phase B's /api/run builds on), and
`functions/_lib/data.js` (ASSETS fetch + one initData per isolate). Harness:
**85 checks** — full-game headless replays, tamper rejection (fabricated
season, inflated claim, rng-draw mismatch), every challenge hook type, and
**golden replay fixtures** frozen against the real dataset (dataVersion
2421484606): if a core change breaks a golden, the draw order changed —
that's a deliberate `T82.VERSION` bump, never an accident.

**Functions import path:** Pages bundles `functions/` with esbuild, which
interops the CJS export in sim-core — `import T82 from "../../sim-core.js"`.
VERIFY on a Preview branch before relying on it; fallback: mirror the file at
`functions/_shared/sim-core.js` with a checksum guard added to test.js.

**Data on the server:** `functions/_lib/data.js` loads `/site_data.json` via
`env.ASSETS.fetch`, parses once, caches at module scope (isolate-lifetime).
First-hit parse of ~2 MB may brush the free-tier CPU limit — MEASURE on
Preview; if it trips, generate `site_data.slim.json` (sim columns only) and
point the loader there (the sim never touches crest art).

### 2.5 Auth flow — server half SHIPPED (Phase B, 2026-07-06)
Client: ClerkJS from CDN with the publishable key (client-safe); after
sign-in, API calls attach `Authorization: Bearer <session token>` (ClerkJS
refreshes tokens itself). Server: `functions/_lib/auth.js` middleware —
verify RS256 vs `CLERK_JWT_KEY` (WebCrypto, networkless — re-verified vs
live Clerk docs 2026-07-06), claims exp/nbf (60s skew) + `azp` vs
`AUTHORIZED_PARTIES`, extract `sub`, upsert `users` (`ensureUser`: 4-char
no-confusable tag, widens on collision), expose `getAuth(request, env)`.
**Any** failure (bad token, missing key, Clerk down, D1 hiccup) → request
proceeds anonymous — covered by 7 real-keypair checks in test.js §13. Client
snippet (Phase D): current quickstart loads TWO scripts from the instance
Frontend API URL (`@clerk/ui@1` + `@clerk/clerk-js@6`,
`data-clerk-publishable-key`), then `Clerk.load({ui:{...}})` — exact snippet
in RUNBOOK.md §1.1. Claim-profile prompt appears on the
results screen after a strong run — the moment pride peaks — never as a wall.

### 2.6 Env vars (set on Production AND Preview — the split-env trap)
| var | side | notes |
|---|---|---|
| `CLERK_PUBLISHABLE_KEY` | client | safe to inline in index.html |
| `CLERK_JWT_KEY` | Functions | PEM public key, networkless verify |
| `DAILY_SECRET` | Functions | 32 random bytes; rotating it reseeds future days only |
| `AUTHORIZED_PARTIES` | Functions | comma-list of allowed `azp` origins (skip check if unset) |
| existing: `ANTHROPIC_API_KEY`, `DASH_KEY`, `RECAP_*` | Functions | unchanged |

## 3. Data model — D1 (new tables beside `events`; KV counter untouched)

**SHIPPED as `migrations/0001_accounts.sql` (Phase B, 2026-07-06).** As-built
deltas from the block below (kept for history): `runs` gained
`data_version` (§14.2), `challenge_id` + `week` (§5.5), plus
`idx_runs_weekly` and three `matches` indexes (turn / p1 / p2). The SQL file
is the source of truth.

Migrations as numbered SQL in `migrations/` applied by hand with
`wrangler d1 execute` — Preview DB first, then Production. Fail-soft writes
follow event.js's pattern (`x-t82-err`, swallow to the player).

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  tag TEXT UNIQUE NOT NULL,            -- e.g. '4F2K'
  display_name TEXT NOT NULL,          -- filtered; 'GM-####' fallback
  title TEXT, frame TEXT, banner TEXT, -- equipped cosmetics (ids from code)
  created_ts INTEGER, last_seen_ts INTEGER
);
CREATE TABLE sid_links (               -- anonymous-history stitching
  sid TEXT NOT NULL, user_id INTEGER NOT NULL, linked_ts INTEGER,
  PRIMARY KEY (sid, user_id)
);
CREATE TABLE runs (
  id TEXT PRIMARY KEY,                 -- client UUID (dedupe on stitch)
  user_id INTEGER, sid TEXT,
  mode TEXT, seed INTEGER, core_version INTEGER,
  official TEXT,                       -- daily label '2026-07-06|cap' or NULL
  verified INTEGER DEFAULT 0,
  wins INTEGER, net REAL,
  hh_seg INTEGER, hh_win INTEGER,      -- wheel segment index / boosted to 82?
  budget_used INTEGER, cap_left INTEGER, rerolls INTEGER, skips INTEGER,
  actions TEXT, rng_draws INTEGER,     -- replay payload (JSON)
  picks TEXT,                          -- JSON [[name,season,slot,cost],...]
  created_ts INTEGER
);
CREATE UNIQUE INDEX idx_runs_official ON runs(user_id, official)
  WHERE official IS NOT NULL;          -- first official attempt counts, once
CREATE INDEX idx_runs_board ON runs(official, wins DESC, net DESC)
  WHERE verified = 1;
CREATE INDEX idx_runs_user ON runs(user_id, created_ts);

CREATE TABLE hof (                     -- snapshot card, survives schema drift
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, run_id TEXT,
  card TEXT NOT NULL,                  -- JSON: lineup, record, headline, date
  ts INTEGER
);
CREATE TABLE achievements (
  user_id INTEGER NOT NULL, ach_id TEXT NOT NULL, run_id TEXT, ts INTEGER,
  PRIMARY KEY (user_id, ach_id)
);
CREATE TABLE notebook (                -- sparse; states only move UP
  user_id INTEGER NOT NULL, ps TEXT NOT NULL,   -- 'name|season'
  state INTEGER NOT NULL,              -- 1 drafted, 2 contender(75+), 3 immortal(82-0)
  ts INTEGER, PRIMARY KEY (user_id, ps)
);
CREATE TABLE groups (
  id TEXT PRIMARY KEY,                 -- short invite slug
  name TEXT NOT NULL, owner INTEGER, created_ts INTEGER
);
CREATE TABLE group_members (
  group_id TEXT NOT NULL, user_id INTEGER NOT NULL, joined_ts INTEGER,
  PRIMARY KEY (group_id, user_id)
);
CREATE TABLE matches (                 -- one row per duel; append-only actions
  id TEXT PRIMARY KEY, mode TEXT, seed INTEGER, core_version INTEGER,
  status TEXT,                         -- open|active|complete|resigned|archived*
  p1 INTEGER NOT NULL, p2 INTEGER,
  turn INTEGER,                        -- user id to move
  actions TEXT,                        -- JSON [{u,op,ts},...]
  state TEXT,                          -- JSON snapshot for fast reads
  quips TEXT,                          -- JSON [{u,qid,ts},...]
  winner INTEGER, rematch_of TEXT,
  created_ts INTEGER, updated_ts INTEGER
);
```
\* `archived` is never written by a job — a GET that finds an `active`/`open`
match idle >30 days MATERIALIZES the archive (and the forfeit, §14.3) in that
read. Read-triggered settle, zero-cron law intact.

**Notebook "Seen" state is client-only** (localStorage glow): every board
exposes ~15 player-seasons, so server-writing Seen would 15× the write volume
for the lowest-value state. Server states begin at Drafted.

## 4. Endpoints (all fail-soft: HTTP 200 `{ok:false}` on any error)

**Phase B shipped:** `/api/daily` · `/api/run` (daily-official + weekly +
casual branches, server-authoritative results, rank/percentile reply) ·
`/api/me` · `/api/claim` · `/api/name` · `/api/lb` (board REGISTRY — daily,
alltime, weekly, immortals, cleanest, cheapest, purist, fewest_skips;
scope=global|group:<id>) · `/api/hof` · `/api/notebook`, plus Phase A's
`/api/verify`. **Phase C shipped** `/api/match*` (create/read/join/move/quip/resign/
rematch). Smoke curls + debug playbooks: RUNBOOK.md.

| endpoint | method | contract |
|---|---|---|
| `/api/daily?mode=` | GET | `{ok, label, seed, endsInS}` — seed HMAC-derived at read |
| `/api/run` | POST | run doc (§2.3). `official` → replay-verify or reject; casual → record as-is |
| `/api/me` | GET | profile, equipped cosmetics, aggregates (games, wins drafted, cap used, most-picked by mode/season), pending duels ("your move" chip) |
| `/api/claim` | POST | `{sid}` → stitch anonymous history (append-only, UUID-deduped) |
| `/api/name` | POST | set display name (filter → `GM-####` fallback) |
| `/api/lb?board=&mode=&scope=` | GET | `scope=global\|group:<id>`; returns Top 82 + `me:{rank,pct,neighbors±3}` |
| `/api/hof` | GET/POST | save (server builds the card from the verified run) / list |
| `/api/notebook` | GET/POST | batch state advances; server clamps upward-only |
| `/api/match` | POST | create `{mode}` → `{id, link}` |
| `/api/match/:id` | GET | poll while match screen open; honor `If-None-Match` on `updated_ts` |
| `/api/match/:id/join·move·quip·resign·rematch` | POST | move = one op; server replays + validates turn/legality before append |
| `/api/recap` | POST | existing Tribune; gains the duel Finals-edition payload |

Rate limiting stays Cloudflare WAF (settled) — replay verification plus the
UNIQUE constraints are the real integrity layer.

## 5. Daily 82

One official board per mode per UTC day (kaman excluded — gag mode). First
*verified* submit per `(user, label)` is official; replays after are practice
(no `official` field). Result framing on the results screen, in order:
percentile line ("Top 18% of GMs today") → friends who've played → neighbors
±3 → link to the **Top 82** tab (global board capped at 82 rows, spectacle
only). Weekly group champion = best sum of daily percentiles, computed at
read. Share card: client-canvas PNG + copy text
("TRUE 82 Daily Presti — 78-4 with $3 left. Beat this seed: …"). Anonymous
players can *play* the daily seed; posting to the board is what needs the
account (the prompt writes itself).

### 5.5 The Weekly — challenge arena (DESIGN LOCKED 2026-07-06)

**SHIPPED (Phase D, 2026-07-06):** full manifest in `challenges.js` — 98
entries (classic/cap/pro mix), authored against measured dataset
distributions (counts in the file header). Every entry passes
`scripts/validate_challenges.js`: N seeded headless sims each (6 quick / 16
--full) under a deliberately mediocre median-value policy — a survivability
gate, not an optimizer. Miss-tolerance law: ONE strand at any n is tension,
not breakage (unlimited-attempt weeklies; a stranded run simply isn't
submitted); more than max(1, 10%) misses fails, zero score-spread fails.
Entries the gate flags SPCY (e.g. escalator, alphabet_gm) are intentionally
spicy and documented. Two core laws this shipped with: (1) pick-hooks fold
into rowDraftable, so deals route around hook-dead boards and solo ladders
can never soft-lock; (2) franchise-constrained deals pre-filter eras to those
an allowed franchise actually inhabits (the expansion-class 0% bug).
VALIDATOR LAW: no manifest edit ships without a clean
`node scripts/validate_challenges.js --full`.
**Rulesets vs arenas:** classic/pro/cap are *rulesets*; freeplay/daily/weekly/
duels are *arenas* that wear one. The Weekly wears ONE ruleset+permutation per
ISO week (UTC): **fixed RULES, infinite seeds, unlimited attempts, best
verified score counts** — the exact inverse of the daily's one-seed-for-all.

**Rotation, zero-cron:** ISO-week index mod manifest length picks the live
challenge (`T82CH.weeklyFor`). KV override `weekly:override:<YYYY-Www> → id`
(checked first in the API layer) pins or swaps any week without a deploy.

**The manifest is code:** `challenges.js`, one shared module loaded by
browser + tests + Functions (same law as sim-core) — a run verifies with the
EXACT hooks it was played with. Hook API: `filter(row,t)` pool eligibility ·
`pick(S,row,slot,t)` stateful pick legality · `deal(S,t)→{decs?,frs?}` deal
constraints · `cfg{}` whitelisted overlays (CAP_BUDGET, PRICE_MULT, CAP_GEM,
CAP_TRAP, TEAM_SKIPS, ERA_SKIPS, engine tax/threshold keys). Hooks must be
pure functions of (S,row,tables) — no Date/random/fetch — replay law.

**THE CREATIVE DOCTRINE (from the boss, 2026-07-06):** weeklies are fun
PERMUTATIONS of the game's own mechanics — pricing, eras, taxes, spacing,
usage, defense, franchises, draft order — never lazy data slices. A good
weekly has a punchline you discover mid-draft ("oh no, the usage tax"), not a
filter you read in the blurb. Starter 11 shipped in challenges.js sets the
bar (Inflation, Petty Cash, Short Kings, The Towers, Bricklayer Classic,
Green Light, Iron Men, The Stoppers, Nineties Only, Time Machine, Loyalty).

**Invariants:** 5 picks / 2G-2F-1C always (protects engine, UI, achievements)
· challenges shape the DRAFT, never the sim's fairness — NET_SD, BASELINE,
REPLACEMENT, Hot Hand are NOT hookable (Trust law) · base-mode mix across the
manifest ≈ 45% cap / 45% classic / 10% pro-as-spice · kaman never rotates in
(easter egg only).

**Start screen (Phase D):** daily strip up top ("Today's board — 14h left") +
three hero tiles — **Classic · Presti · This Week** — the weekly tile
self-markets from the manifest (name, blurb, rules chip, days left, your
best). Pro demotes to a quiet "more modes" row (kept alive for Perfect
Silence / Triple Immortal); kaman leaves the menu entirely. Duels enter via
invite links + the Arena, not the start screen.

**Phase D owes:** grow the manifest to ~100 with the headless validation
script (per-position pool viability per era, strand-rate sim, score-spread
sanity) + weekly leaderboard view + the tile.

## 6. Records boards (all SQL views over `runs WHERE verified=1`)

Immortal Count (82-0s, by mode) · Undefeated Rate (min 20 verified runs) ·
Cleanest Immortal (max `cap_left`, cap 82-0) · Purist Net (max `net` where
`hh_win=0`) · Fewest Skips to Perfection · Cheapest 82-0 (min `budget_used`) ·
Daily Top 82 (per label) · Weekly Group Champions. Adding a board later =
adding a query, never a feature.

## 7. The 41 — achievement manifest

One manifest file (`achievements.js`): `{id, name, tier, blurb, scope,
pred}` — adding one is adding an object, never a schema change. Run-scoped
predicates are re-derived server-side from the verified run; profile-scoped
computed on write. Numbering is display order in the Rafters.

**EASY (8)** — first-session teachers:
1 `opening_night` Opening Night — complete a game
2 `league_pass` League Pass — complete classic, pro, and cap
3 `contender` Contender — win 70+
4 `the_kaman_game` The Kaman Game — finish kaman mode
5 `signed` Signed — claim your GM profile
6 `cornerstone` Cornerstone — save your first Hall of Fame team
7 `opening_tip` Opening Tip — complete a Daily 82
8 `first_entry` First Entry — advance any Scouting Notebook state

**TEACHING (15)** — each one teaches a real mechanic:
9 `cap_whisperer` Cap Whisperer — 82-0 in cap with ≥$5 left
10 `dollar_myth` $1 Myth — 75+ with a $1 pick on the roster
11 `fire_sale_shopper` Fire Sale Shopper — 75+ with a pick bought during an active FIRE SALE
12 `house_money` House Money — a REFUND fired in a run you finished 80+
13 `era_scholar` Era Scholar — 75+ with five different decades
14 `decade_purist` Decade Purist — 78+ with all five from one decade
15 `memory_merchant` Memory Merchant — 75+ in pro
16 `no_safety_net` No Safety Net — 80+ in cap with zero paid rerolls
17 `swap_meet` Swap Meet — 78+ after using a lineup move or swap
18 `two_way_money` Two-Way Money — 75+ with all five DBPM ≥ 0
19 `space_race` Space Race — earn the spacing bonus and win 78+
20 `tax_free` Tax Free — 78+ with zero engine taxes
21 `bargain_banner` Bargain Bin Banner — 82-0 spending ≤$38 total
22 `year_chaser` Year Chaser — 78+ after 3+ "Skip yrs" presses on one board
23 `iron_five` Iron Five — 82-0 in classic

**SICKO (12)** — the long game:
24 `perfect_silence` Perfect Silence — 82-0 in pro
25 `triple_immortal` Triple Immortal — 82-0 in classic AND pro AND cap
26 `one_game_short` One Game Short — finish 81-1 after the wheel spun and missed
27 `supernova` SUPERNOVA — land the 2.0× segment
28 `chalk_eater` Chalk Eater — 82-0 where every pick was the top value on its board
29 `prestis_presti` Presti's Presti — 82-0 in cap with ≥$10 left
30 `prehistoric` Prehistoric — 78+ with all five picks pre-1980
31 `time_traveler` Time Traveler — 82-0 with no two picks within 15 years of each other
32 `max_contract` Max Contract — 82-0 carrying a single pick priced ≥$20
33 `weekly_crown` Weekly Crown — win a friend-group week
34 `first_blood` First Blood — win a duel
35 `regular_season` Regular Season — complete 20 official dailies (lifetime — forgiving, never consecutive)

**SECRET (6)** — unlisted until earned:
36 `co_immortals` Co-Immortals — finish a kaman duel (the Tribune declares co-champions)
37 `front_page` Front Page — generate a Tribune recap on an 82-0
38 `the_return` The Return — play again 30+ days after your last game (welcome back — the anti-FOMO badge)
39 `kaman_truther` Kaman Truther — draft Chris Kaman in a non-kaman mode
40 `blood_feud` Blood Feud — complete 10 duels against one rival
41 `the_steal` The Steal — in a duel, roster a player from a ticket your rival skipped

## 8. Scouting Notebook

Per player-season states (server): **Drafted → Contender (won 75+ with) →
Immortal (82-0'd with)**; "Seen" glows client-side only (§3). Progressive
reveal: Drafted shows the stat line; Contender adds engine badges; Immortal
unlocks the scout report + a historical note. Career strips ("won with 3 of
11 LeBron seasons"). Postgame drops at most one "new discovery" line. The
dataset's 21,525 player-seasons ARE the collection — the notebook is Marvel
Snap's collection road where the collectible is basketball knowledge.

## 9. The Arena (profile page)

One spatial metaphor, top to bottom: **Marquee** (name#tag, equipped title,
crest, tier frame) → **Rafters** (achievement banners hanging in rows; cloth
tiers bronze/silver/gold by difficulty, black for 82-0-class) → **Trophy
Shelf** (daily/weekly hardware, auto-populated) → **HOF Wall** (saved team
cards with generated headlines) → **Scouting Desk** (notebook entry) →
**Rivalry Rail** (per-opponent cards: "vs. Hanna · 3–2 · last meeting 81-1 to
79-3 · Rematch"). **Banner Night:** one-shot banner-raising ceremony on major
unlocks — tap to skip; reduced-motion stays deliberately ignored (settled).
Design language: existing styles.css tokens and the crest engine's framing;
no new fonts; gold-foil borders reserved for 80+. Titles (earned, equippable):
Cap Sicko · Tape Grinder · Midrange Apologist · Expansion GM · Kaman Truther ·
Presti Shark · Era Scholar.

## 10. Duel Draft — engine + API SHIPPED (Phase C, 2026-07-06)

**As built:** `duel-core.js` (shared module, same law as sim-core) — a duel is
ONE shared sim-core state (one seed/stream/ticket, one person-keyed drafted
set = the One-Jersey Rule for free, one fire-sale flag) plus TWO player
overlays (picks, filled, budget, skip counters) mounted into S per action, so
every core function runs unmodified. S.round is derived per mount: picks+1
for actions, picks for deals (the DEAL LAW comment — off-by-one here refuses
a fifth board). Ops carry {u:0|1, op, ts}; matches REBUILD from the op log
(the RNG is a closure; the log is the state). "fs" = forced skip, server-
gated on zero draftable rows. Resolution mounts P1-then-P2 through finish()
— mount order IS the HH draw law. Endpoints: POST /api/match ·
GET /api/match/:id (ETag/If-None-Match; forfeit MATERIALIZES on read —
read-triggered settle, still zero-cron) · POST :id/join·move·quip·resign·
rematch, all optimistic-locked on updated_ts (`why:"raced"`). Rematch: the
requester GIVES first move (consent-light swap). 14 state-machine checks in
test.js §10b incl. forged-mover detection + bit-identical replay. Client UI +
duel-core <script> tag land in Phase D.


**Table:** one live ticket at a time, shared. Strict alternation; a turn is
exactly one action: **pick** (any eligible, affordable player from the live
ticket → your open slot) or **skip** (team/era, +Skip-yrs in cap) — the skip
consumes your turn and the next ticket lands on your rival's turn. Lineup
moves/swaps are free (no turn, no stream draw), draft screen only as ever.

**Economy:** independent $50 caps in cap mode; classic/pro keep 1+1 skips per
player. **Forced skip** (no legal pick exists for you) is free and spends no
counters. **Fire sale is board state:** whoever triggers it pays; whoever
picks next enjoys it — even the rival. That's not a bug, it's the comedy.

**One-Jersey Rule (⚑):** the person-keyed drafted set is match-scoped —
drafting any season of a player kills every season of that person for both
GMs; dead rows render with a SIGNED stamp. Rerolled boards also exclude
signed persons.

**Resolution:** both rosters through `engine()` on the shared match state;
Hot Hand fires per roster at exactly 81, draws resolved P1-then-P2 from the
match stream. Winner: wins → `cap_left` (cap) → net → draw ("Co-Immortals"
if both 82-0). The Tribune prints a **Finals edition** (dual-team recap,
generated once, cached). Rematch auto-swaps who moves first.

**Pacing:** correspondence — rapid-fire or weeks apart, waits indefinitely.
No push notifications v1: the share link is the nudge, plus the "your move"
chip on the Arena (from `/api/me`). Polling only while the match screen is
open. Either GM may resign; 30-day-stale actives read as archived.

**Quips** (the only in-match communication; ids, not text, over the wire):
"Enjoy the lottery." · "My bench beats your starters." · "That's a fire sale
waiting to happen." · "Cap casualty." · "He was my third option anyway." ·
"Scoreboard. Eventually." · "Bold. Wrong, but bold." · "The Tribune will be
gentle. Probably." · "I've seen better boards in kaman mode." · "Skip it. I
dare you." · "You drafted the poster. I drafted the dunker." · "Save your
dollars — you'll need them." · "That contract ages like milk." · "Front
office material, this one." · "One jersey, friend. One jersey." · "I was
going to take him anyway." · "Your spacing is a rumor." · "Defense wins
duels." · "Nice pick. For me, next round." · "82 problems and you're all of
them."

**Modes v1:** classic + cap. Pro duels Phase 1.5 (memory + trash talk is a
great pairing). Kaman duels exist solely to award №36.

## 15. Phase D2 handoff — Arena + Duel screen (the last UI)

Everything below is BUILD-READY: engines, endpoints, and tests exist; this is
rendering work. A cold model should read CONTEXT.md → this section → the two
core files, then build. No new invariants are needed — do not invent any.

**15.1 Arena — SHIPPED (Phase D2b, 2026-07-06).** As built in `arena-ui.js`
(+ intro chip in app.js). Five parallel fetches (/api/me, lb daily/weekly/
immortals, /api/weekly), each section fail-soft independently — a dead strip
never blanks the banner. Anonymous = global boards + the sign-in funnel card
with the local unclaimed-run count. Inline display-name edit POSTs /api/name.
Opens with zero site data (instant, no queue). Corrections to the original
spec: the immortal shelf reads lb?board=immortals (hof.js is the POST that
MINTS a card, not a list); the your-move chip is count-only v1 (a match-list
endpoint lands with achievements). ~~Original spec follows:~~ New route in app.js:
`renderArena()` reachable from a small "Arena" chip on the intro (top-right).
Data: GET `/api/me` (identity, chips incl. yourMove count, most-picked, run
counts), GET `/api/lb?board=daily` + `?board=weekly` for rank strips, GET
`/api/hof` for the immortal shelf. Anonymous → sign-in card
(`T82ACC.signIn()`), plus the local-ledger count ("N unclaimed runs — sign in
to claim"). Layout: banner (tag + display name + `PATCH /api/name` inline
edit), chip rail, three board strips with me-rank highlighted (lb.js already
returns `me` + neighbors), Tribune teaser if hof rows exist. Keep it one
screen, zero polish debt: reuse .ticket/.section/.eyebrow classes.

**15.2 Duel screen — SHIPPED (Phase D2, 2026-07-06).** As built in
`duel-ui.js` (+ boot routing in app.js, `youWon` field added to GET
/api/match/:id so the client never guesses user-id mappings). THE RENDERING
LAW: the client rebuilds the match from (mode, seed, ops) via
T82DUEL.replayMatch on every change and renders that — the same state machine
that validates a move draws the screen, so they cannot disagree. ETag polling
5s while visible; any action forces a truth refetch; `raced`/`state-corrupt`
self-heal by resync. Board rows come from the enriched draftable() (name,
seasons[], legal slots[], live cost) — season <select> + per-slot pick
buttons. Deliberate v1 omissions: lineup mv/sw not surfaced (engine + server
support them), kaman duels not in the lobby (endpoint supports; №36 flow
later), spectators stay locked out (participants-only law). ~~Original
spec follows for reference:~~ Route on `?duel=<id>` (boot: parse location.search,
after DATA_READY call `renderDuel(id)`). Loop: GET `/api/match/:id` with
If-None-Match (poll 5s while visible; stop on hidden tab) → rebuild locally
via `T82DUEL.replayMatch({mode, seed, ops})` → render `M.S` with the MOVER
mounted (the existing draft renderer reads G; set a temporary
`G = M.S`-shaped view or refactor renderTicket to take S — prefer the
latter, it's one signature change). Chrome: turn banner ("Your move" /
"Waiting for <tag>"), opponent rail (their five, budget/skips in cap), quips
drawer (T82DUEL.QUIPS, POST :id/quip), action buttons mapping to POST
:id/move with the duel op grammar, forced-skip button gated on
`T82DUEL.draftable(M, youAre).length === 0`. On `why:"raced"` → refetch and
re-render (RUNBOOK row exists). Completion → both rosters + verdict + quip
history + Rematch button (POST :id/rematch → navigate to new id). Join flow:
open match + youAre === null → "Join this duel" (POST :id/join).

**15.3 Not in scope for D2:** achievements (tables exist, land with Arena
v2), pro duels (Phase 1.5), Tribune Finals edition (needs Tribune infra),
push notifications (never, v1).

## 16. Leagues — SHIPPED (Phase E, 2026-07-06)

**As built:** `league-core.js` (pure math, 13 checks in §10c) + migration
0002 + `/api/league` create · `/api/league/:id` GET **and settler** ·
`:id/join` · `:id/start` + a `league` official branch in run.js +
`league-ui.js` (?league= deep link, lobby with format/rounds pickers, forming
room, week card with one-attempt Play, standings, champion banner).

**The design, compressed:** 3–20 GMs; seats by join order at start; season =
(Neff−1)×rounds ISO weeks opening the NEXT Monday 00:00 UTC. Every week the
whole league plays ONE server-minted seed (`league|<id>|<w>`) under a
challenge drawn deterministically from the manifest (format filter gives
leagues personality — "Presti only" leagues exist). One attempt per week
rides the EXISTING runs UNIQUE(user_id, official) index via labels
`lg|<id>|<w>` — zero new enforcement code. Weeks settle ON READ (the
forfeit-on-read law): insert-once league_results rows + a settled_through
CAS make concurrent settlers no-op; opening the league IS the cron.
Standings are computed, never stored: 2/1/0 points → head-to-head recomputed
INSIDE each tied group → points-for → seat. Played beats absent; double
no-show is a scoreless draw; byes emit no row.

**Deferred (in order of value):** my-leagues list endpoint + Arena strip;
league board in lb.js; playoffs (top-4 bracket over 2 extra weeks — the
schedule math already supports arbitrary week counts); commissioner tools
(kick/rename/restart-as-rematch); late-join with prorated byes; week-end
reminder nudges (needs a notification story first).

## 11. Sprints

- **S0 — SHIPPED:** seed spine (§2.1). Metric: 57 checks green; casual play
  byte-identical in feel.
- **S1 — Identity:** Clerk wiring (verify CDN snippet), `users`/`sid_links`,
  claim + stitch, display names + filter, `/api/me`. Zero game-flow changes.
  Metric: claim rate after 75+ runs.
- **S2 — Verified runs + Arena shell:** stage-2 extraction (§2.4), `/api/run`
  with replay verification, personal stats, Arena scaffold. Metric: verify
  success rate ≥99.5% on legit runs; CPU measurement on Preview.
- **S3 — Daily 82 + boards:** `/api/daily`, official-run flow, percentile +
  Top 82 + records boards, share card. Metric: next-day return, daily
  completion, share clicks.
- **S4 — Rafters + HOF + Notebook:** manifest, Banner Night, HOF wall,
  notebook sync. Metric: time-to-first-achievement, notebook open rate,
  return-after-unlock.
- **S5 — Duels + groups:** match engine, invite links, quips, rivalry rail,
  Finals Tribune, group boards. Metric: invite conversion, matches completed,
  rematch rate.
- **Phase 2:** seasons as a pre-authored 52-week challenge rotation shipped
  once in code (highest-fiddle item, deliberately deferred) · 3+-player
  leagues · pro duels · push notifications · OG share images.

## 12. Ops additions

Migrations: Preview D1 first, always. New secrets ×2 envs, checklist in §2.6.
Test rule: `node test.js` (57) before touching app.js OR sim-core.js; the
S2 verifier gains a golden-replay fixture (recorded real game → must verify
forever; breaks = you changed draw order = bump `T82.VERSION`). Deploy via
push only; Preview branches for anything touching auth or verification.

## 13. Not building — ever

Paid loot boxes / paid rerolls / paid odds / paid streak-freezes (no
monetized randomness, full stop) · daily hostage streaks (weekly + lifetime
counts instead) · hidden per-user difficulty or pity-rigging (Trust law) ·
global-rank shaming (percentile-first framing) · free-text chat or bios
(Moderation-surface law) · service-worker push v1 · engagement email. The
compulsion research (Skinner-box doc) is kept as a map of what the
competition does to its players — TRUE 82 wins the other way.

## 14. Gap audit — rulings (2026-07-06, fold-in from design review)
1. **Anonymous identity gap** — analytics `sid` is in-memory/cookieless;
   nothing persists to stitch pre-account runs. FIX (BLOCKING before S1):
   client keeps a localStorage ledger of run UUIDs; "claim profile" posts the
   list; server attaches matching runs. Ledger is strictly-necessary storage
   (no banner), never repurposed for tracking — privacy paragraph covers it.
2. **Dataset versioning** — replay breaks across dataset updates. SHIPPED in
   core: `dataVersion` hash stamped in `T82.t`, carried in results, checked in
   /api/verify. Update-day rule (Phase B): new dataset lands at UTC rollover;
   prior file stays alive 24 h for verification, then graceful
   `why:"data-version"` reject ("this run predates today's data update").
3. **Duel abandonment** — archived-with-you-to-move = **forfeit loss**
   (prevents ghost-when-losing). Copy stays kind; the W is real.
4. **Account deletion** — Clerk webhook anonymizes the `users` row and
   orphans runs (they keep feeding global boards, nameless).
5. **Daily-board cheating stance** — unsolvable in principle (the seed must
   be served); verification kills *fabricated* results, not rehearsed ones.
   Global Top 82 = spectacle; friends/group boards = the real product.
   Optional quiet signal: log fetch-to-submit time, never act on it v1.
6. **Small rulings:** pre-checks before server replay (action cap 200,
   rngDraws sanity) — shipped in /api/verify · Chalk Eater achievement scoped
   to cap only · same-name players are one person (One-Jersey inherits —
   accepted) · ISO week is UTC · one duel quip per turn · iOS PWA standalone
   runs a separate localStorage silo (ledger claim covers it; note in copy).
