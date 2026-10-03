# TRUE 82 — Mode & Engine Mechanics (dev reference)

TL;DR: One shared engine scores every roster (sum of BPM-derived value minus
usage/spacing/defense taxes → win probability → 82-game record). The four modes
differ only in pool presentation, season selection, skip economy, and pricing.
Presti (cap) adds the entire pricing/reroll economy and is the only mode with the
Hot Hand. Kaman is a hard-coded 82-0 gag. Constants below were read from app.js
on 2026-07-03; if code and this doc disagree, code wins.

Read this file only when touching engine or mode logic. Everyday state lives in
AGENT-HANDOFF.md.

---

## Shared structure (all modes)

- 5 rounds, one pick per round. Roster slots: 2 G, 2 F, 1 C (`BUCKET_CAP`;
  `CFG.ROUNDS` is derived from it).
- Each round deals a **ticket**: a random franchise + decade ("era") whose pool
  has at least one draftable player. Fresh eras are preferred round-to-round
  (`seenDec`); repeats only when every era's been used. Franchise variety via
  `seenFr`.
- **Skips** are dimension-rerolls: Skip team = same era, different franchise;
  Skip era = same franchise, different era. In classic/pro each is a per-GAME
  counter (1 and 1); era-skip targets exclude already-seen decades. In cap both
  are unlimited but cost $1 (and are exempt from the seen-decade exclusion).
- A player can never be drafted twice across the whole game (`G.drafted`, by
  name — by season in kaman).
- **Career-wide position eligibility** (`CAREER_BUCKETS`, built in `initData`):
  a player is eligible at every position where ANY season of his career has
  ≥20% share (`POS_THRESHOLD`); players who never clear 20% anywhere fall back
  to the union of their per-season max-share positions. Used by pool filtering,
  the G/F/C tags, and the draft-tray swap system.
- **Position swap** (draft screen only): any drafted player with a legal move
  wears a SWAP pill; tap → MOVING; legal destinations (open slot he can play, or
  a teammate where a two-way swap is legal) show HERE. Legality =
  career-eligibility both directions; counts respect `capOf` (kaman: C×5).

## The engine (`engine(pickRows, slots)`)

Per-player value: `valueOf(row) = bpm_star − SC.REPLACEMENT`.

Team score:
```
score = Σ valueOf
      − USAGE_RATE · max(0, Σusage − USAGE_BUDGET)          (usage tax)
      − SPACING_TAX · max(0, SPACERS_REQ − Σsp)             (spacing tax)
      + SPACING_BONUS · max(0, Σsp − SPACERS_REQ)           (spacing bonus)
      − backcourt defense tax − wing defense tax
```
Defense taxes are **slot-dependent** (this is why results-screen swaps are
banned): if BOTH G-slot players' DBPM ≤ `GD_BOTTOM10` → `BACKCOURT_D_TAX_10`;
else both ≤ `GD_BOTTOM25` → `BACKCOURT_D_TAX_25`. Same ladder for the two
F-slot players with `FD_*` / `WING_D_TAX_*`.

Record:
```
net  = score − BASELINE                (BASELINE = meta.scoring.BASELINE, 3.98)
p    = Φ(net / NET_SD)                 (per-game win prob; Φ via erf)
projW    = 82p
winTally = min(82, ceil(82p))          (proj > 81 counts as 82-0)
p82      = p⁸² + 82·p⁸¹·(1−p)          (binomial P(≥81 wins), the "82-0 chance")
```
All constants live in `site_data.json → meta.scoring` and load at runtime —
nothing about the model is hardcoded in JS except the erf approximation
(Abramowitz–Stegun 7.1.26, verified) and the formulas above.

## Mode differences

| | classic | pro | cap "Presti" | kaman |
|---|---|---|---|---|
| Pool rows show | full stats + chips + player tags | name + season, no tags | name + season + price, no tags (v64) | Kaman seasons |
| Season choice | player picks any season (year control) | locked random per player (`assignProSeasons`) | locked random per player, re-rollable | each season IS a pick |
| Team/era skips | 1 + 1 per game | 1 + 1 per game | unlimited, $1 each | none |
| Year rerolls | — | — | "Skip yrs" $1, whole board | — |
| Pricing / budget | — | — | $50 cap, full economy below | — |
| Default sort | minutes | A–Z | cost | — |
| Hot Hand | no | no | **yes** | no (own results path) |
| Result | engine | engine | engine (+ possible boost) | hard-coded 82-0 |

- **classic** — the teaching mode: full stat lines, badges/chips, pick any season.
- **pro** — same pools, but each player is silently locked to a random season and
  no stats are shown; you're drafting from memory of who was good when.
- **Pro and Presti hide the player tags** on the board and in the tray (Presti since v64, the owner's call:
  both are drafted from memory). The tags still count in the score, and the results cards show them.
- **kaman** — pool = every Chris Kaman season (one row per season,
  `KAMAN_SEASONS`), slots become C×5 (`capOf`), picks store no franchise/era,
  `renderKamanResults` declares 82-0 unconditionally and logs
  `game_complete {wins:82, undefeated:1}`.

## Presti (cap) deep-dive

Budget: `CAP_BUDGET = 50`. Spending = picks + rerolls; both draw from the same
budget, and `G.maxCap` tracks the shrinking ceiling. Affordability floor
everywhere: an action is blocked if it would leave < $1 per remaining pick
(`capAffordable`, `chargeReroll`).

**Pricing** (per board, in `assignCapPool`): each pool player locks to a random
season (avoiding an immediate same-year repeat when alternatives exist), then:
```
capCost(v) = max(1, round(0.26 · max(v,1)² · capRoll))
capRoll:  55% normal   ×(0.85–1.15)
          25% bargain  ×(0.55–0.80)   ← depth decays, see below
          20% gouged   ×(1.25–1.60)
```
Calibrated by Monte Carlo so optimal play sneaks an 82-0 roster under the cap
~1 in 50 boards, and stars cost a third-plus of the cap.

**Mispricing pass** (`capMisprice`) makes cost a noisy signal: among value-2–4
marginals NOT in the board's top-5 by value (top-5 are shielded),
`CAP_TRAP = 0.50` chance → repriced into the premium band (overlapping the real
top-3 costs). **The $1 gem (v63.1, the owner):** a board that sets `CAP_GEM`
keeps the flat per-player gem chance its copy promises; every other board gets
at most one gem, as luck's rebate: if its top five rolled over their fair price
(the curve with an even roll, under the ceiling), a gem appears with chance
(paid/fair − 1)/`CAP_GEM_SPAN` (0.3), capped at 1; at or under fair, none. About
11% of boards (27% before). Then 2–4 sub-value-2 players get lifted to $2–$6 so
"$1 = junk" stops being a tell. **Ceiling:** `CAP_CEIL` $26 (v63.1; $23 before),
$24 in a fire sale.

**Rerolls** (`chargeReroll`): every paid spin (Skip team / Skip era / Skip yrs)
costs $1 and rolls ONE die: < 0.075 → REFUND (dollar back, button flash);
0.075–0.15 → **FIRE SALE**; else nothing.

**Fire sale** (`effCost`): while active, every price on the current board is −$2
with a $1 floor — affordability, sorting, the confirm bar, and the charge all use
the effective price; display shows red strikethrough base + green sale price.
Cleared by ANY reroll or by making the pick. Announced by all three cost buttons
flashing red "FIRE SALE" with a ⬇️ burst (`flashFireSale`).

**Bargain decay**: `assignCapPool` computes `decay = 0.65^yearRerollN`; the
bargain multiplier becomes `1 − (1−m)·decay` — full-strength on a fresh board,
65% / 42% / 27% … of the original discount depth on successive "Skip yrs"
presses, converging on fair price. `yearRerollN` resets on a new round, team
skip, or era skip. Normal and gouged bands are never decayed.

## Hot Hand / Heat Check (cap only)

Overlay fires on every completed cap draft under 82-0 (`hhEligible`), unless
the season already had its mid-season Heat Check (below). Two paths:

- **≤80 wins (or any non-81):** eyebrow "See Your Results"; overlay carries
  `hh-reveal` (fully opaque backdrop) and starts opaque (created with `in`, no
  entrance fade); pulling the ball dunks it, flames flash, overlay fades out to
  the results already rendered underneath. No spin, no boost, **no heatcheck
  analytics**.
- **Exactly 81 (`winTally === GAMES_IN_SEASON − 1`), or `?clutch=1`
  (`FORCE_CLUTCH`):** the full sequence — name reel picks the "hot" player
  (`hhPickHot`: weighted by value², min weight 0.5²), heat wheel spins a segment
  (`hhSpinSeg`), win bar climbs, verdict.

Wheel (`HH_SEGMENTS`, odds sum 100) — v68: a flat 0.1 staircase, and the odds
here now match the code (they did not before):
| Segment | ×mult | odds |
|---|---|---|
| COLD | 0.9 | 6 |
| WARM | 1.0 | 14 |
| HOT | 1.1 | 42 |
| ON FIRE | 1.2 | 23 |
| SUPERNOVA | 1.3 | 15 |

Spin: `newNet = net + (m − 1) · valueOf(hot) · HH_BONUS_SCALE(0.67)`.

**The record rule (v68.1, the owner, 2026-10-02: "move from the real 81").**
The spin moves the record the season actually PLAYED, never the projection's.
In plain words:

- The spin's *projected change* is how many whole wins it moves the five's
  projected record: `hhWins(newNet) − hhWins(net)` (a five at +19.0 projects
  78-4; a spin to +20.1 projects 79-3: a change of +1).
- **HOT, ON FIRE, SUPERNOVA** can only raise the played record, by that
  change: `min(82, played + max(0, change))`.
- **WARM** never moves it.
- **COLD** can only lower it, by that change: `played + min(0, change)`.
- **The 82-0 save** is the raised record reaching 82: an 81 is saved exactly
  when the spin lifts the projection by a win or more.

One function holds it, `hhRecord(played, net, newNet, m)` in sim-core.js; the
game's Heat Check (app.js `hotHand`) and the replay verifier (`finish()`) both
run it, so a submitted run verifies. Why: Presti plays the season out game by
game, so many 81-1s are lucky (the five projects 78 to 80), and v68 set the
record from the spun projection: a HOT "+0.4, caught fire" dropped a lucky
81-1 to 78-4. On a board that does not play its season out (the Daily, a
challenge) the record IS the projection, so the rule gives exactly what v68
gave (the spun projection) for any spin that raises the net.

The record, the print, the comp line, the GOAT Climb, the ledger, the share
text and the Daily's official record all follow `G.hotWins` (the rule's
record) and `G.hotNewNet` (the spun net, shown as the net rating's second
number; it moves by the formula even when the record does not). When the
Heat Check leaves the totals alone (WARM, refused, never offered), the share
text and the Tribune read the results' own record (`resultsEngine()`: the e
renderResults was given, so a played-out season's record), never a fresh
`engine()`, which is the projection. A spin that moves the net but not the
record re-specs the share poster too (its foot prints NET).

**SKIP (v68.1).** Before the pull, "skip →" refuses, exactly like I DON'T
WANT YOUR CHARITY (op `hx`). After the pull the spin is committed (the replay
applies it), so "skip →" skips the show, never the spin: `applyOutcome()` (the
same once-only step the reveal runs) lands the record, the totals and the
results, then the card closes. A COLD cannot be dodged by skipping, and a
save is never thrown away.

**The neutral rung is WARM, not index 0.** Anything that asks "did the spin move
anything" must read `seg.m !== 1`, never `segIdx > 0`: COLD is 0.9 and takes
value away. WARM is exactly ×1, so `newNet === net` and the record stays put.

**Who reaches which Heat Check (standalone Presti).** A five drafted above
`HH_MID_NET` (+20, a projection of 79 and up) that loses any game gets the
**mid-season** Heat Check at that first loss (see below), never the
post-season one. So on a standalone Presti run every post-season Heat Check is
a five at +20 or below that played 81-1: a lucky 81 (projection 79 or less).

**What the rule does to the save rate** (bot drafts on the real data, each
five weighted by its 81-1 odds, 2026-10-02): on those post-season spins v68
lowered the record 86% of the time (every rung but WARM) and never saved;
v68.1 saves 45%, leaves 81-1 53%, and lowers it 2% (COLD only). The weaker the
lucky five, the easier the save, because the projection's win steps are
narrower lower down (a projection of 75: 55%; 78: 45%; 79: 6%). An honest 81
(the Daily) saves as in v68, about 8 to 9% of spins (9.0% on 587 bot fives
projecting 81). `HH_BONUS_SCALE` is the one
knob that moves both without touching the staircase.

**COLD costs.** COLD lowers the played record by the projected change (often
0, sometimes 1 or 2). Refusing the spin (I DON'T WANT YOUR CHARITY, op `hx`)
applies nothing and keeps the 81. Percentile rank is unaffected either way:
`/api/percentile` ranks the RAW engine net, written before the Hot Hand
touches anything.

## Mid-season Heat Check (standalone Presti, since v47.15)

A standalone Presti season (the reel plays it, op `ss`) whose five is drafted
above +20 net (`HH_MID_NET`; `?midhot=1` waives the bar on a test build) pauses
on its first realized loss and offers the spin (its two draws come right after
the season's 82). One per season, and it replaces the post-season one. HOT or
better re-rolls the saved game and the rest of the season at the boosted
nightly rate, `phi(newNet / NET_SD)` (uncapped, never below the rate it
played); anything cooler, or a refusal, lets the loss land and the season
stand as played.

v68.1 (`hhMidReroll`): the re-roll reuses each night's own draw (kept by
`simSeason` as `season.u`) instead of `Math.random`. A night is a win when its
draw is under the new rate, so every win the season played stays a win; the
saved game's draw (a loss, somewhere in [rate, 1)) is stretched back over
[0, 1), so it is saved at the full new rate, as before. Each re-rolled night
still wins at exactly the boosted rate, so the odds are unchanged (82-0 on
about 22% of boosts either way); what is gone is the boost that ended WORSE
than the season played (about 15% of HOT-or-better boosts did, with
`Math.random`), and a replay can now follow it.

**The verifier.** Since v68.1 `finish()` plays out an armed Presti season
(it used to judge Presti on the projection: another record and 82 fewer
draws), runs the mid-season Heat Check where the game does, and the
post-season one at exactly 81 wins played (the projection's 81 on the Daily).
test.js checks the game and the verifier reach the same record with the same
draws on 2,800 real Presti runs, spun and refused.

## Analytics (for context when touching game events)

Client (`analytics.js`): cookieless, in-memory sid only; events —
session_start/end, data_ready/error, game_start, round_advance, game_complete
(cap adds budget_used, roster_value), replay, share, heatcheck_shown/action/
result (clutch path only), donate_click. session_end re-arms on return/bfcache;
dashboard aggregates MAX per sid. Server (`event.js`) allowlists names/modes,
clamps every numeric, never errors to the player.

---

## Deep Cuts — skip unless the condition applies

- **Only if verifying the math:** erf is Abramowitz–Stegun 7.1.26 (constants
  verified against the reference); `p82 = p⁸² + 82p⁸¹(1−p)` is exactly
  P(X ≥ 81), X ~ Binomial(82, p) — "one loss still counts as the 82-0 chase"
  matches `winTally`'s ceil.
- **Only if rebalancing prices:** the 0.26 quadratic makes a value-10 player
  ~$26 pre-roll (half the cap); the fat bargain/gouge tails are what create
  read-the-board skill. Comment in code says tuned via sim vs the real pool;
  nudging `CAP_GEM`/`CAP_TRAP` is safe, reshaping `capRoll` bands changes the
  1-in-50 calibration.
- **Only if touching the reveal flow:** the results screen is fully rendered
  BENEATH the overlay before it appears — the non-clutch dismiss and "skip →"
  before the pull just remove the overlay (at 81 the skip also refuses, op
  `hx`); "skip →" after the pull first applies the spin (`applyOutcome`).
- **Only if editing site_data:** `meta.cols` order defines `IDX`; columns pos,
  port, rim, pm, ht are currently unread (see the Open list in docs/history/CONTEXT-2026-07.md) — do not
  reorder cols without regenerating IDX assumptions everywhere.
