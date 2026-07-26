# PLAYER TRAITS: owner decisions

## 1. The final roster: DECIDED (owner, 2026-07-26)

Eleven core traits, chosen from the angle "what does qualitative player talk
see that the statistical engine does not." Shipped by migration 0011:

  three-point-shooter         (0010 survivor, promoted to core)
  super-three-point-shooter   the other team gameplans around his gravity
  iso-defender                catch-all one-on-one stopper; supersedes wing-defender
  team-defender               rotations, communication, help on time; supersedes help-defender
  switchable-defender         takes the switch, guard to big, and holds
  rim-protector               (0010 survivor, promoted to core)
  playmaker                   creates advantages for teammates; supersedes primary-creator
  rim-pressurer               gets to the rim, again and again
  off-ball-scorer             dangerous without the ball in his hands
  tough-shot-maker            gets buckets without an advantage
  clutch                      the moment in his hands, and he wants it

Three 0010 drafts (wing-defender, primary-creator, help-defender) are
retired: their traits and questions stop serving, their standing votes and
consensus rows are preserved for analysis, and their best disputed cases are
re-homed as fresh questions under the successor traits. Old ?q= links to
retired questions degrade to a normal session; votes on them are refused.

ANTI-LABELS are also decided and shipped: a does_not_qualify ruling is not
the absence of the label, it is the trait tag rendered with a cross-out
(NOT CLUTCH is a ruling you wear). No schema was needed; the consensus
status already carried it. The traits page stamp does the rendering, with
an aria-label carrying the spoken form.

Engine posture confirmed: SHADOW MODE first. Rulings and labels accumulate
now; sim-core stays untouched until the pools mature (section 3).

The three-point-shooter pool doubles as the brigade canary: it is the one
trait with stat ground truth, so a community that rules prime shooters out
has measured its own capture rate.

## 2. Consensus thresholds (tunable, versioned)

Live values in `trait_rules_v1` (v44 defaults):

  min_eligible_votes      25     below this a question reads N MORE CALLS
  qualify_yes_share       0.62   at or above: QUALIFIES
  disqualify_yes_share    0.38   at or below: DOES NOT QUALIFY
  (between the two)              DISPUTED, the state the product wants
  vote_burst_limit_10min  40     per voter hash
  vote_min_spacing_ms     1200   cadence floor per voter hash

Not Sure is counted and displayed but never enters the ruling denominator.

Tuning guidance: watch the Avocado ledger card for two numbers. If almost
nothing reaches 25 eligible votes after a few weeks, lower
min_eligible_votes before touching the shares. If everything settles
QUALIFIES or DOES NOT QUALIFY and nothing stays DISPUTED, narrow the band
(0.58 / 0.42) so arguments stay alive. Changes are one UPDATE to
`trait_rules_v1`; consensus re-settles on each question's next vote, so
new thresholds phase in without a backfill job. Bump `rules_version` when
changing shares so later analysis can segment rulings by regime.

## 3. When votes touch the engine

Not in v44, on purpose. sim-core.js is untouched and the replay law holds
by construction. The path, in order, each step an owner decision:

  a. Shadow mode: read `trait_consensus_v1` in results copy only
     ("the community says your five has no wing defender"), zero scoring
     effect. Cheap, reversible, tests whether rulings feel legitimate.
  b. Bounded effects behind a flag: a capped lineup-fit adjustment from
     qualified traits, off by default, on for a labeled experiment.
  c. Any permanent scoring change re-runs the balance bench against live
     score curves before it ships. A community that can move ratings will
     eventually try to brigade one; the standing-vote model (one hash, one
     revisable call) plus the fences are the first defense, and capping
     effect size is the second.

## 4. Growing the question pool

27 questions ship. The pool is the product: ran-it-back (the number one
metric on the Avocado funnel card) dies when a returning voter sees
nothing new. Add questions as INSERT rows following the id convention
`player-name-endyear-trait-slug` (e.g. `draymond-green-2016-help-defender`);
`season_label` is the display string, `season` the end year, and
`editorial_priority` above 0 floats a marquee question into early slots.
Basketball-Reference links are derived from `player_name`, so spelling
matches BBref slugs. `player_key` stays NULL until the engine join lands;
do not invent values for it.

## 5. Housekeeping owed to future builds

  - The traits CSS is injected from app.js this build so styles.css could
    ship untouched; fold it into styles.css on that file's next owner pass
    and drop `ensureTraitsCss`.
  - If the homepage module underperforms (entry leak per the decision rule
    in ANALYTICS-V44-RETENTION-AND-TRAITS.md section 4), redesign the
    module before judging the mode.
  - The three out-of-repo test lanes still need their v44 additions before
    the next full lane run: the three event names in the analytics-smoke
    allowlist and a /traits/ five-call path in browser-smoke.
