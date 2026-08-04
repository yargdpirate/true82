# RETURN HANDOFF - THE REDRAFT (v49, alpha)

Base: the v48.1 dynasty-v2 tree, cumulative. `BUILD_V` goes to `v49`;
`app.js` key `20260803-redraft-v49`; meta `t82-build` `v49`. Files changed:
`app.js`, `index.html`. No styles.css, no worker, no migration, no D1 paste.
The engine trio stays untouched and outside the package, as always.

## What it is

The Redraftables experience, playable. One human, two rival GMs (MERCER
drafts the best player alive; QUINCY drafts the team), a snake draft over one
shared board of the viable 2016 entering class, five a side, every pick
exclusive, all seasons selectable per player with the engine's best as the
default. Then three real 82-game seasons and a podium. RUN IT BACK reshuffles
the seats. `?redraft=1` deep-opens the gate. Door sits under Dynasty.

## The architecture decision that shaped everything

The draft is ENTIRELY app-side. It never touches `newGame`, `dealRound`,
`applyPick`, or a franchise+decade cell, because the shared pool is not a
cell and cannot be made one from a package (the Dynasty open-pool wall, same
shape). Three roster arrays, a snake sequence, and legality built from the
same primitives Classic already trusts: `rowBuckets`, the 2/2/1 caps,
`valueOf`, the 785-minute floor.

The engine enters exactly at the finish: per team, a throwaway
`T82.newState("classic")` G, `T82.engine` for the analytic verdict, then
`armSeasonSim` + `simSeason` so each team's 82 realizes from its OWN fresh
rng stream. No shared seeds, no replay path, no leaderboard writes, so
nothing the replay law protects is touched. The classic `PG_CAP` (0.991) is
re-asserted before evaluation in case Presti (which uncaps) ran last. If a
cached pre-v42 sim-core has no `simSeason`, the podium degrades to the
analytic projection and the copy says "projected" instead of "played out."

## The pool

`SD_CLASSES` is one config object: a label, a blurb, and twenty names.
Adding the next class is a copy-paste. At first entry the mode unions every
eligible season those names have ANYWHERE in the dataset (785+ minutes,
deduped by season+team so a traded year keeps both stints, best season by
`valueOf`, position buckets = the union across seasons). Names that fail to
resolve against live data are dropped and listed in the console; the gate
refuses to start below fifteen resolved players and says so on screen.

**Verify the twenty against live data on first deploy.** I could not: the
package carries no player data. The likely misses are punctuation and
diacritics ("Derrick Jones Jr.", any Hernangomez-style name if you ever add
one). The console line names every miss; fixing is editing one array.

## Nobody can be stranded

The one genuinely new algorithm. Before any pick, human or AI, a Hall's-
condition check over the three position types proves every team can still
legally finish against the remaining supply. A pick that would leave some
team unable to fill a slot renders as a tray deny naming the position
("That strands the board at center."), and the AI filters the same way. So
stealing the last center stays legal right up until it makes the board
unfinishable, which is exactly the tension the mode exists for, minus the
failure state. The math is exact for this shape (players unrestricted by
team, three bucket types, seven subset checks) and the property test drives
250 fully random drafts through it without a single incomplete roster.

## The rival GMs

Ordinary game logic, per the brief. Every legal (player, slot) pair is
scored: engine value of his best qualifying season, plus a need term (how
open that slot still is for this GM), plus a scarcity term (how close that
position is to running dry board-wide), plus persona jitter inside a tie
band so games differ. MERCER runs value-heavy with a wide band; QUINCY runs
need-and-scarcity-heavy with a narrow one. Three numbers per GM
(`needW`, `scW`, `jitter` in `SD_GMS`) are the entire personality system and
the entire tuning surface. AI beats land on an 850ms timer so you SEE the
picks happen; if a rival takes the player you had selected, the banner says
YOUR GUY and the analytics row says `steal`.

## What lands in /avocado

`showdown_state` with actions `start` (seat order, pool size), `pick`,
`ai_pick`, `steal`, `pick_denied`, `complete` (outcome win/loss, the three
records, your rank), `rematch`; plus `mode_impression` on the gate and door.
`steal` count per game is the number to watch: it is the emotional metric
the mode is betting on. Deliberately NOT emitting `game_start`/
`game_complete`: those assume a single-run shape and would pollute the
classic funnel.

## THE 8-PLAYER LINEUP QUESTION, PROPERLY

You asked what it would take to run 8-player lineups instead of 5. Two very
different answers depending on what "lineup" means.

**A. The sim actually plays eight.** That is not a mode, it is a fork of the
game. The model has no concept of minutes or rotation: BPM is per-minute
impact and every number downstream (BASELINE 3.98, the spacing math, the
usage budget, duo-defense, rim protection, the taxes) is calibrated for
exactly five players at 2-2-1. Eight bodies means a minutes model, which
means re-deriving the baseline and every tax, which means the live human
win-rate tether starts over from zero data. It is also a sim-core change,
which ships outside every package and sits under the replay law, so every
historical replay, leaderboard row, percentile pool, comp rung, and the
locked v33 share format (a vertical FIVE) forks with it. Scale: bigger than
Any Given Night and the scoring pass combined, plus a long live re-tuning
tail. It cannot even be started from a package. I would not do it to find
out whether drafting eight is fun; there is a cheap way to find that out.

**B. Draft eight, field five.** Buildable on the chassis this build just
shipped, engine untouched. `SD_CFG` already parameterizes `rosterSize` and
the caps precisely so this is a config question: set rosterSize 8, widen the
pool to ~30 names, loosen bench caps, and add the one real piece of work: a
best-legal-five evaluator that tries the at-most C(8,5)=56 lineup
combinations per team through `T82.engine` (analytic and pure, so brute
force is instant) or lets you set your own starting five with the engine
auto-filling. Plus a starters/bench render. That is roughly one build of
this size, zero engine risk, zero law breakage. The honest caveat: the sim
only ever plays five, so bench picks are competitively inert. They matter
only if a wrinkle makes them matter (an injury roll that knocks out a
starter and promotes the next man, for instance), and THAT is a design
question to decide before building, not a technical one.

Recommendation in one line: A is a different game; B is one session on this
chassis and worth doing only once a bench has a reason to exist.

## Validation

`h5-redraft`: **72 checks**, real extracted functions in real Chromium over
the stub (extended with a fictional class spread across cells, a traded
season, a sub-785 monster season, and F/C flexes so the strand guard has
real work). Covers pool resolution (union, dedupe, filter, missing-name
drop, caching); snake properties over 40 shuffles; the strand-guard truth
table (flex-at-F infeasible, same man at C fine, deny copy names the
position, AI never routes a center body to forward across 60 draws, tray
denial without applying or advancing); the 250-draft property test with
random human play (all complete, all 2/2/1, no duplicates, denials actually
fired); persona determinism at zero jitter and variety with it; the full
verdict path (ranking, realized-vs-analytic, PG_CAP re-assert, analytics
outcome); the analytic fallback when `simSeason` is absent; the full draft
screen driven through REAL click handlers including two rival beats on real
timers, the TAKEN rows, the returning clock, and the steal event; gate,
thin-pool refusal, rematch; share format; an em-dash scan over every new
surface; and shipped-file wiring + key parity. `h4-dynasty-v2` re-run on the
v49 file: 133/133, so Dynasty survived the insertion. Both suites plus the
visual pass (gate, mid-draft board with live tray, podium at 320/360/390/430
under real styles.css and real fonts) run green against the EXTRACTED
package, not just the working tree.

## Known edges, chosen not discovered

- Mid-draft reload loses the draft. In-memory by design for the alpha, same
  price as Dynasty; a sessionStorage resume is ~20 lines if self-play says
  it matters.
- No season reel on the podium. Three reels would bury the comparison, and
  the comparison IS the payoff here. If one reel earns its way in, it is the
  human team's only, after the podium.
- The flash banner shows only the LAST rival pick between your turns; the
  greyed TAKEN rows carry the full history.
- The class list ships unverified against live data (see The pool). The
  mode fails soft and tells you exactly which names to fix.
- AI season choice is always the player's best qualifying season for the
  slot; rivals never make a boutique year pick. Fine for scarcity pressure,
  worth revisiting only if players start reading the GMs as dumb.
- One pool, one class. The config is plural-ready (`SD_CLASSES`), the gate
  is not: a class picker is UI work for when there are two.
