# RETURN HANDOFF - THE DYNASTY, ALPHA (v48.0)

Base: the v47.21 poll density package. Cumulative. BUILD_V -> `v48`,
`app.js` key `20260802-dynasty-v48`. Files changed: `app.js`,
`index.html`. Nothing else - no styles.css, no worker, no migration, and
the engine trio (sim-core / challenges / daily-core) is untouched and
absent from this package as always.

## What the mode is

Classic drafting and the realized 82, wrapped in permanent scarcity.
Bank a season by hitting the win target and all five player-seasons on
that roster retire for the rest of the run. Seasons retire, players
don't: bank 2016 Curry and 2021 Curry still plays. The pool only
shrinks, the target climbs 76 -> 80, the run ends the first time you
miss. One localStorage object is the whole state.

## The three design decisions that shaped the build

### 1. The scarcity rule IS a challenge

The brief said "modify the draft pool before simulation." The codebase
already has exactly one first-class mechanism for that: the challenge
object. `dyChallenge(run)` builds `{ id: "dynasty", name, blurb,
filter }` and rides the same `newGame(mode, seed, ch)` door the weekly
twists use (app.js line ~2883 is the precedent). That one decision buys,
for free: engine-enforced legality (`applyPick` and `pickBlock` both
consult `ch.filter`, "the engine stays the single source of legality"),
the barred-card rendering, the shake-and-explain deny UX ("SEASON 3
\u00B7 TARGET 77 says no"), analytics tagging (`p.challenge =
"dynasty"` on every event), and the rules-sheet TWIST panel. MODE stays
`"classic"`; the engine never learns the word dynasty, so zero
`MODE ===` branches anywhere can break.

### 2. Dynasty seasons REALIZE (one condition amended)

v42's arming gate excluded all challenge runs from ANY GIVEN NIGHT, with
the comment "challenges stay analytic until their own adaptations." This
is that adaptation. The gate is factored into a named predicate so the
harness executes it for real (standing lesson):

    function seasonArmEligible() {
      return (MODE === "classic" || MODE === "cap") && !G.social &&
        (!G.ch || G.ch.id === "dynasty") && !!(window.T82 && T82.simSeason);
    }

Truth-tabled in h4: plain classic T, dynasty T, any other challenge F,
daily F, presti T, pro F, missing simSeason F. Every pre-existing
combination behaves exactly as before.

### 3. The verdict settles at COMPUTE time

`dySettle(e)` runs inside `showResults` the moment `season.wins` exists,
BEFORE the reel plays. The reel is presentation; the localStorage write
already happened. Consequences, all deliberate:

- Reloading during the reel or ceremony cannot un-live a season. The
  "watch the reel, see the loss coming, reload, redraft" cheese does not
  exist.
- Reloading mid-DRAFT costs only the redraft: nothing commits until a
  season completes, so there is no corrupt intermediate state.
- The post-season Heat Check at a realized 81 still fires (fun kept) but
  cannot change the verdict: 81 passes every threshold and the settle
  already banked the raw realized wins. The 81 -> 82 boost stays what it
  always was, display.
- `dySettle` is idempotent (`G.dySettled`) and also guards the analytic
  fallback path at the top of `finishRunTail`, so a cached pre-v42
  sim-core still produces a settled season instead of a dead mode.

## Where scarcity is enforced (five layers, outermost first)

1. `currentPoolRows` omits a player whose every eligible season in the
   dealt cell is banked (same "don't shade, omit" doctrine as the
   785-minute rule).
2. `dyFixDefaults` runs at that same choke point (both render paths pass
   through it) and bumps any RETIRED default year to the player's best
   LEGAL season, honoring the active OBPM/DBPM sort metric. Pure
   `G.yearByName` writes, the exact mechanism the dropdown itself uses,
   replay-safe by construction.
3. The year dropdown renders banked seasons `disabled` with a
   "\u00B7 RETIRED" tag: visible scar tissue, unpickable at the control.
4. The change handler ignores a retired value defensively.
5. `ch.filter` at the engine boundary: even if every UI layer failed,
   `applyPick` says no. `pickBlock` mirrors it as `barred` so the card
   greys and the deny copy explains.

A dealt cell with literally zero legal players would render an empty
board (the existing team/era skips are the way out). With hundreds of
player-seasons per cell and five retiring per banked season, the alpha
cannot realistically reach that; if deep runs ever do, the fix is an
auto-redeal guard in the deal path, noted here so it isn't rediscovered.

## Surfaces

- **Home door** under Presti: "\uD83D\uDC51 Dynasty \u00B7 how long can
  you keep it alive?", switching to "Season N waits" when an active run
  exists. Wired into the mode-impression tile list.
- **The gate** (`renderDynastyGate`, no player data needed): fresh pitch
  / resume card (seasons deep, all-time, rafters count, next target) /
  obituary. END THE DYNASTY is a two-tap arm-and-confirm. `?dynasty=1`
  deep-opens it, `?dynasty=reset` wipes.
- **Draft strip**: the mode panel gains a DYNASTY branch ahead of the
  generic challenge one: "\uD83D\uDC51 DYNASTY / SEASON 3 \u00B7 TARGET
  77" with the rafters count in the sub line.
- **Verdict panel**, injected above the record board on results. Banked:
  stamp, "78 and 4. Needed 77.", RETIRED TO THE RAFTERS with the five,
  running totals, DRAFT SEASON N+1. Fallen: THE DYNASTY FALLS, the
  needed/got line, every banked roster as the hall, all-time record,
  START A NEW DYNASTY, SHARE THE OBITUARY (native share, clipboard
  fallback).
- **Replay doors closed**: a settled season never reruns. The results
  "Run it back" action is hidden by the verdict injector; the Heat Check
  overlay's RUN IT BACK and the Tribune's RUN IT BACK are suppressed for
  dynasty runs (each would have silently started a plain Classic run).

## What a dynasty run does NOT touch

Percentile fetch skipped (`scheduleSharePct` returns early: the open
classic pool is the wrong yardstick for a shrinking-pool run, and it
keeps alpha runs out of that pool). Nothing submits to leaderboards or
accounts; no replay-verify path exists or is needed. `game_complete`
still writes with `challenge: "dynasty"`, so /avocado can slice it; if
the percentile pool's worker does not already exclude challenge-tagged
runs, that is a worker-side question for whenever dynasty leaves
preview, not an alpha problem.

## Thresholds

`DY_THRESH = [76, 76, 77, 77, 78, 78, 79, 80]`, season 9+ holds 80.
The brief's "D6+: 78-80" is read as a two-step ramp. Balance the mode by
editing this one array. `?dythr=NN` overrides every threshold for fast
loop-testing (app-side only, never persisted).

## Validation

`h4-dynasty.js`: 65 checks, real extracted functions (brace-matched from
the shipped app.js) running in real Chromium over a faithful T82 stub -
the engine trio is not in the package, so the stub mirrors the observed
API surface (`POOLS` cell = Map(name -> representative row); season
lists behind `poolYearsEligible`; `resolveRow` honors `G.yearByName`).
Covered: threshold ladder + clamp + ?dythr; full lifecycle
fresh -> banked -> idempotent settle -> continue -> filter -> fall ->
obituary -> rebirth; the five-layer scarcity stack including the
metric-aware default fixer; verdict/obituary DOM + wiring + share text;
all three gate states + two-tap abandon; the arming truth table; the
belt path for an engine that dropped the challenge arg; corrupt/future
storage degrading to fresh; cache-key/BUILD_V parity; em-dash scan over
the new user-facing strings. Regression: h1-h3 rerun green (80 + 111 +
22), total 278 checks across the four suites, run against the extracted
package. Screenshots of the gate and both verdicts render under the
real styles.css.

## Known edges, written down so they're chosen not discovered

- An 81-win dynasty season shows the Heat-Check-boosted 82-0 on the
  record board while the history stores the raw 81. Only occurs at 81,
  which banks either way. Cosmetic; noted.
- `expWins` (the analytic tally) is carried but unused, as everywhere
  else. "Expected 79, ran 76, needed 77" is a ready-made obituary line
  if the mode graduates.
- The mode is standalone and single-device by design: state is one
  localStorage key, so a different browser is a different dynasty.
  Accounts sync is a post-alpha question.
- The "weakest surviving team" optimization the brief wants emerges from
  visible scarcity (RETIRED rows, the rafters count, the climbing
  target); nothing numerical nudges it. If self-play shows players
  hoarding too little, the lever is the threshold array, per the brief.
