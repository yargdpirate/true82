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


## v46: Player Bonuses editorial layer (2026-07-26)

The curated pool IS the product surface. All 76 launch questions carry an
editorially written sentence, slug, WHAT COUNTS? line, and metadata line
in 0013; five seeded questions launch dormant (Brook Lopez 2023, PJ
Tucker 2021, Andrew Wiggins 2022, Duncan Robinson 2020, Bradley Beal
2017) and can be published any time by inserting a meta row. Nine
questions rotate on the homepage (Kobe 08 wing defense, Jokic rim
protection, Luka defense, Draymond on centers, Klay gravity, MVP Harden
clutch, Playoff P clutch, 2013 LeBron clutch, DeRozan tough shots).
Extending the pool is an INSERT; pulling a question is active=0; the
sentence is copy, not generated text.

Per-question link previews ship as text metadata (title and description
carry the full question). Dedicated per-question OG IMAGES need an image
pipeline this stack does not have yet; the typography-only static brand
image stands in. Flagged as the one open follow-up from the spec.

PRESTI UNCAP (owner ruling, same date): cap mode plays without the Any
Given Night ceiling. Implemented as a per-run override of the data
constant (PG_CAP forced to 1 for cap-mode games, restored for everything
else), so it covers the analytic record today and game-by-game
realization whenever Presti gets it. The 99-in-100 rules line renders
only for classic, so no copy contradicts the uncap.


## v46 design pass + iOS haptics (owner ruling, 2026-07-26)

iOS haptics posture: the web's only door to the Taptic Engine is the
checkbox switch control. Real taps on a real switch fire on every iOS;
Apple patched SYNTHETIC toggles in iOS 26.5. So tap-moment haptics
(YES, NO, UNSURE, NEXT QUESTION, VOTE ON 5 MORE) work everywhere via
invisible switch overlays, while async moments (the result landing, the
completion double-tap, the game's timed reel ticks) reach iOS 17.4-26.4
and quietly do nothing on 26.5+. Nothing haptic touches an audio
session: playback never ducks. If Apple ships the proposed web haptics
API, upgrading is one function (hapticTick) in the page plus buzz() in
app.js.

The nine OG cards are generated from 0013's share_preview column, so
the image copy can never drift from the shipped data. To add a card for
a newly promoted homepage question: render a 1200x630 PNG in the same
style into /og/bonus-<slug>.png and add the slug to OG_CARDS in
functions/bonuses/[slug].js. Slugs without a card keep the brand image.
