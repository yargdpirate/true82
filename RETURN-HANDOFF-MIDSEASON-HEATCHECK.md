# RETURN HANDOFF - MID-SEASON HEAT CHECK (v47.15, gate fixed v47.17)

## v47.18 HOTFIX - the softlock at the pause (stacking), and the coverage fix

With the gate fixed, the ceremony fired - underneath the reel. `.reel-overlay`
sits at z-index 240; `.hh-overlay` at 90, set for the post-season moment when
the reel no longer exists. The two overlays had never coexisted before this
feature, so at the pause the Heat Check rendered as a dim ghost behind the
reel card, nothing was clickable, and SKIP was (correctly) inert while the
offer was pending: a full softlock, read as a crash. The 0-0 opener also
exposed an awkward copy read ("You're 0-0 ... stay perfect?").

Fixes:
- The mid overlay wears `.hh-overlay.hh-mid` with `z-index: 250` (the reel's
  240 is the stylesheet's max, so 250 is clean). Post-season overlay
  untouched at 90 - it still never meets the reel.
- Game-1 copy variant: "Game 1. Down entering the 4th quarter of the opener.
  Clutch heroics to start perfect?" - no 0-0 read. And to answer the live
  question that run raised: the trigger only fires on a REALIZED loss, so
  yes, game 1 was genuinely lost in that season (a few-percent event on a
  modest-net ?midhot=1 roster).
- The harness gap that let it escape: minimal CSS meant DOM order decided
  stacking and synthetic `.click()` bypassed hit-testing. The suite now
  loads the REAL styles.css, and the critical interactions use real
  Playwright clicks. New S12 reproduces the exact live failure: game-1
  trigger, asserts the ceremony stacks above the reel (250 > 240) and that a
  hit-test at the lever lands inside the ceremony, verifies the opener copy,
  confirms reel-SKIP is inert while the offer is pending, then saves the
  opener and runs the table end to end through real clicks.

Both `app.js` and `styles.css` changed; both cache keys move to
`?v=20260801-midheat-stack-v47`.

## v47.17 HOTFIX - why it never fired live, and the fix

The v47.15 trigger gate ANDed `hhEligible(e)` - an engine predicate whose
source ships outside this package and whose only other use guards the
exactly-81-wins post-season ceremony. It takes the RESULT, and on ordinary
losing Presti runs it evaluates false, so the mid-season trigger never armed
in production. It was a speculative safety addition, not owner spec, and the
harness never executed the gate (it forced the trigger directly; the gate had
only a static string check). Both are corrected:

- The gate is now the named `hhMidGate(e, season)` with transparent checks
  only: Presti (`MODE === "cap"`), standalone (`!G.duel`; social/challenge
  runs never reach the realized branch), a full five-man roster, the engine
  Hot Hand surface present, `season.losses > 0`, `!G.hhMidUsed`, and
  `FORCE_MIDHOT || e.net > 20`. `hhEligible` remains exactly where it
  belongs: the post-season 81-0 ceremony, untouched.
- With `?midhot=1` on, every gate component logs to the console
  (`[t82] mid heat gate ARMED/blocked {...}`), so a live "why didn't it
  fire" answers itself.
- The harness now extracts and truth-tables the REAL gate: 11 cases
  covering the happy path, classic/duel blocks, no-loss (even forced),
  the one-per-season law, the strict bar at exactly 20 vs 20.1, the
  midhot waiver, partial roster, and missing engine surface.

Live verification in 15 seconds: hard-reload, confirm
`typeof hotHandMid` is "function" in the console (proves the new app.js is
being served), then draft any losing Presti team at `/?midhot=1` and watch
the gate log arm and the reel freeze before the first L.

---

# ORIGINAL HANDOFF (v47.15)

Cumulative on the v47.14 poll-sharing package. BUILD_V stays "v47". Files
changed vs v47.14: `app.js` (all the new logic) and `index.html` (cache key
only). `styles.css` is untouched - the overlay reuses every existing `hh-*`
class, and the reel reuses every existing `reel-*` class. `bonuses/` and
`functions/` are untouched. The engine (`sim-core.js` et al.) ships as-is and
is reached only through the `T82.*` runtime surface.

## 1. Identification (done before any code)

- **The season animation is `showSeasonReel(season, e, done)`** - the game-by-
  game "THE SEASON" overlay that classic/Presti standalone runs already show.
  It received the realized `season.games` array (booleans, one per game) from
  `T82.simSeason`. As shipped it printed each month's final W-L line up front
  and scheduled the whole 82-square cascade at once, so it could neither pause
  on a specific square nor survive a re-roll. This package rewrites it as a
  cursor engine (advance/tick/openMonth/closeMonth/placeSquare) that walks one
  square at a time and can freeze.
- **`season.games`** is the realized truth: `simSeason` rolls all 82 before the
  reel runs, so "the first loss" is just the first `false`. Re-simming the tail
  means rewriting `season.games[gi..81]` in place, then re-deriving wins/losses.
- **The post-season Heat Check is `hotHand(e)`**, fired from `renderResults`
  only when `hhEligible(e)` and the run is exactly 81-0 (or `?clutch=1`). The
  new flow reuses its ceremony grammar (lever pull, name strip, heat wheel) and
  the whole `T82` Hot Hand surface: `hhPickHot`, `hhSpinSeg`, `HH_SEGMENTS`,
  `HH_BONUS_SCALE`, `valueOf`, `declineHeat`, `phi`, `SC.NET_SD`.

## 2. The three owner rulings this encodes (2026-07-31)

1. **One spin per season.** The offer itself burns it (`G.hhMidUsed = 1` the
   moment the screen opens), whether spun, whiffed, or declined. A later
   would-be loss never re-triggers.
2. **A save re-rolls, it does not guarantee.** After a Hot-or-better spin the
   boosted per-game win rate is applied to the saved game AND the whole
   remainder; a later loss can still land, and now it does.
3. **Post-season 81-0 Heat Check survives only for runs that never paused** -
   gated on `!G.hhMidUsed`. A clean unbeaten run, or a roster that was never
   mid-sim-eligible, can still get the end-of-season spin; a run that already
   took the mid-season shot cannot.

## 3. The flow

Standalone Presti (`MODE === "cap"`), roster net rating **strictly `> +20`**
going in, and the realized season contains at least one loss:

1. The reel walks square by square, month headers ticking live.
2. The instant the cursor reaches the index of the season's first loss, it
   **pauses before painting that square** and opens the Heat Check.
3. Eyebrow: `Game N. You're W-0 and down entering the 4th quarter. Clutch
   heroics to stay perfect?` (N = the game that would be lost; W = wins so far).
4. Pull the lever -> name strip -> heat wheel, identical choreography to the
   post-season ceremony.
5. **HOT or better** (`segIdx >= HH_MID_MIN_SEG`): the named starter catches
   fire (value x M), `newNet = e.net + (seg.m - 1) * hotV * HH_BONUS_SCALE`, the
   saved game plus the remainder re-sim at the boosted rate, BACK TO THE SEASON
   resumes the reel onto the new tail.
6. **Below HOT** (COLD / WARM), or charity-decline, or "the loss lands" skip:
   the loss paints and the reel plays out exactly as realized.

## 4. Gates (all AND-ed)

`MODE === "cap"` (Presti standalone; the outer branch already requires
`!G.social && !G.ch`, so dailies and challenges never reach here) AND `!G.duel`
AND `season.losses > 0` AND `!G.hhMidUsed` AND `hhEligible(e)` AND
`(FORCE_MIDHOT || e.net > 20)`.

- The `> +20` bar is **strict**. `?midhot=1` (FORCE_MIDHOT) waives only that net
  bar for QA, so the flow can be exercised on any losing Presti draft.
- `HH_MID_MIN_SEG` is resolved by label (`/hot/i` match, fallback index 2) so an
  engine reorder of the segment ladder can never silently move the "Hot or
  better" bar. Ladder: COLD 0, WARM 1, HOT 2, ON FIRE 3, SUPERNOVA 4.

## 5. The re-roll, and its determinism

```
p2 = phi(newNet / SC.NET_SD)                       // boosted per-game win prob
for i = gi .. 81: season.games[i] = Math.random() < p2   // saved game + tail
```

This is the engine's own win formula applied per game. It is **fresh,
non-seeded luck** by design - the point of "could still lose" is that the
remainder is genuinely re-rolled, not scripted. Consequence worth knowing: the
rest of the run's rng is seeded and replay-verifiable through the action
stream, but this `Math.random()` tail is not, so a mid-season save has **no
replay-verification path**. That is acceptable because the flow is
standalone-Presti only - there is no official/daily record to reproduce. A
**refusal** (charity or skip) still calls `T82.declineHeat(G)`, so the "hx" op
records and the refusal itself replays.

## 6. State protocol (`G.hot*`)

On a save, `applyMidBoost` sets `G.hotMid = {hotIdx, segIdx, seg, hotV, newNet,
gameNo}` plus the shared Hot Hand fields the results/share path already reads:
`G.hotIdx, G.hotLvl, G.hotValue, G.hotBase, G.hotNewNet, G.hotWins` (= realized
wins after the re-roll). `e.winTally` and `e.season` are rewritten to the
realized post-boost record before the finish path runs, so the record, the GOAT
Climb, and the W/L box are all correct from `renderResults` alone.
`applyMidBoostToResults(e)` (called in `finishRunTail` after render) adds only
what the record cannot show on its own: the hot-pick highlight, the split net
label, the climb re-plot to the realized wins, and the Scoring Card bonus row
("caught fire in Game N (value xM)"). `prepareRecap` receives the boosted net
and the {player, tier} when `G.hotMid` is set, so the Tribune ceremony matches.

## 7. Laws left intact

- **Leaderboards / percentile still ship raw pre-boost `e.net`.** The Hot Hand
  numbers are display-only for the run; the ranking never sees them, mid-sim or
  post-season. (`scheduleSharePct` / the stats POST read `e.net`, untouched.)
- **Month headers now tick live** square by square instead of printing the
  month's final line up front. This is a deliberate improvement, not a
  side-effect: the old up-front print both spoiled each month and could not have
  survived a re-roll.
- Copy law: zero em-dashes in the ceremony copy (eyebrow, verdict, reel lines).

## 8. Validation

`/home/claude/harness6` drives the REAL `showSeasonReel`, `hotHandMid`,
`applyMidBoostToResults`, and the reel commentary functions extracted from the
built `app.js` by brace matching, with the engine + visual-sugar deps stubbed
and `setTimeout` scaled so full 82-game seasons resolve in well under a second.
26 checks, S1-S10:

- pause fires before the first-loss square; header reads W-0 at the freeze;
  eyebrow carries the game number, the record, and "4th quarter"; no em-dash
- the offer burns the one spin on open
- charity decline -> loss lands, `declineHeat` recorded, no boost state
- COLD and WARM both -> NO SAVE (the mid bar is stricter than the post-season
  one, which pays any non-COLD)
- ON FIRE save -> saved game + hot remainder = 82-0, board shows 82 squares and
  zero L, month headers re-total to 82-0, boost state staged (Game 13)
- Hot+ save but ice-cold re-rolls -> 12-70 stands, and still exactly ONE overlay
  despite 70 later losses (the one-spin law)
- SKIP fast-forwards INTO the pause (it cannot dodge the offer), then closes the
  reel normally after resolution
- the results patcher folds the boost into a rendered results DOM: hot pick,
  split net label, ledger bonus row with game + multiplier, climb re-plot to 82
- static asserts: post-season gate carries `!G.hhMidUsed`; the net bar is strict

Full regression re-passed against these same files: trait presentation (21),
draft usability (24) + touch, poll widget (28), bonuses page (21), rules foot
(12). Every suite green.

## 9. Deploy

1. Drag the package contents into the repo root (flat), commit, let Pages
   deploy. NO D1 migration, NO console command.
2. Hard-reload once: `app.js` cache key moved to
   `?v=20260731-midseason-heat-v47`. `styles.css` and `bonuses/` are unchanged
   from v47.14 and need no bump.
3. Footer still reads "| v47".

Rollback: restore `app.js` and `index.html` from the v47.14 package. No data to
unwind (the flow writes nothing server-side except the existing `declineHeat`
"hx" op on refusals, which the contract already knows).

## 10. Smoke checklist

QA hooks: `?midhot=1` forces mid-sim eligibility on any losing Presti draft;
`?clutch=1` still forces the post-season 81-0 ceremony.

- [ ] Draft a Presti roster over +20 net that takes a loss (or append
      `?midhot=1`). The reel walks, then freezes right before the first L and
      the Heat Check opens naming the game number.
- [ ] Pull and land HOT or better: the starter catches fire, the saved game
      and everything after re-roll, and the reel resumes onto the new tail;
      the final record and the Scoring Card bonus row agree.
- [ ] Land COLD or WARM: NO SAVE, the L paints, the season finishes as it was.
- [ ] Decline (charity or "the loss lands"): the L paints, no boost.
- [ ] Hit SKIP during the walk: it jumps to the freeze and still shows the
      offer; you cannot skip past it.
- [ ] Take the mid-sim spin, then reach the end 82-0 or 81-x: NO second
      (post-season) Heat Check fires.
- [ ] A clean run that never paused (or `?clutch=1`): the post-season 81-0
      Heat Check still fires as before.
- [ ] The Top X% / percentile on the result reflects the RAW pre-boost net,
      not the boosted number.
