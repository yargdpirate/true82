# TRUE 82 analytics v44 — the retention merge + Player Traits

This replaces ANALYTICS-V43-RETENTION.md, which documented the retired v43
localStorage experiment and instructed applying a migration that must never
run. Read this file plus AGENT-HANDOFF.md (V44 section) before touching
analytics, retention, or traits code.

## 1. What merged, and which side won each conflict

Two branches were built async and reconciled here:

- The **v43 patch** (gameplay ahead): app.js, analytics.js, event.js, info
  pages, Tribune share functions, plus its own localStorage retention
  experiment.
- The **v40r2 package** (production truth): the isolated retention layer the
  owner deployed live, plus Avocado v42.2.

Resolution, per the forward-branch handoff:

| Surface | Winner | Why |
| --- | --- | --- |
| Gameplay, UI, info pages, share functions | v43 | the ahead branch's work is preserved intact |
| Durable identity + retention stream | v40r2 | already live in production; cookie-anchored, 400-day, isolated tables |
| analytics.js identity code | neither | the v43 experiment is stripped out; one visitor-id system only |
| /api/identity | v40r2 | the v43 1.5 KB policy stub is replaced by the cookie/coverage Worker |
| /api/event | v43 minus the v43 tier | keeps the v43 event vocabulary; the visitor_id/local_day insert tier is removed so every row lands first-try on v40 |
| functions/avocado.js | v40r2 + traits | the two files were identical outside the retention block; v42.2's retention/coverage cards are the deployed superset. Two Player Traits cards added |
| Migration numbering | both v40 backports kept; v43's 0008 removed | production has 0008_retention_events_v1 + 0009_retention_coverage_v1 applied; 0008_retention_identity.sql belongs to the retired experiment and is intentionally absent |

## 2. The tracker hook (replaces the fragile wrap)

The v40r2 forward handoff required replacing the retention client's
monkey-patch of `window.t82track` with an explicit mechanism. v44 does that:

- `analytics.js` exposes `window.t82AnalyticsSubscribe(fn)`. Subscribers are
  called for every persisted event with the FINAL enriched props (run_id,
  mode, daily_num, official already resolved from run context). Every
  callback runs inside try/catch; a broken subscriber can never damage the
  ordinary stream.
- `retention-client.js` prefers the hook and keeps the original wrapper only
  as a fallback for a stale-cached analytics.js. Exactly one path attaches.
- Load order law is unchanged and now reads:
  `analytics.js -> retention-client.js -> sim-core.js -> challenges.js ->
  daily-core.js -> app.js`. The retention client must load before any
  gameplay script can emit.
- `t82AnalyticsDebug()` now carries a `retention` field mirroring
  `t82RetentionDebug()`, so one console call answers both streams.

## 3. Retention contract (unchanged from production)

Everything the owner deployed in v40r2 survives byte-meaningfully:
`retention_events_v1` (visit, game_start, game_complete, share_success,
referral_open; one canonical start / at most one completion per real run),
`retention_coverage_v1` diagnostics, the `t82_rid` HttpOnly cookie (400
days) with `t82_anon_retention_v1` local fallback, consent-region and
opt-out hard stops, DNT/GPC as diagnostics. Do not add a second visitor-id
system; extend this one.

## 4. Player Traits — data and analytics contract

### Tables (migrations/0010_traits_v1.sql)

- `traits_v1` — traits are rows, not columns. Five draft traits ship as
  status `experimental` (the final ten are an owner decision; see
  TRAITS-OWNER-DECISIONS.md).
- `trait_questions_v1` — one row per player-season x trait. `player_key` is
  reserved for the future engine join and is deliberately NULL for now.
- `trait_votes_v1` — one STANDING row per (question, voter_hash);
  `UNIQUE(question_id, voter_hash)` + upsert makes a revote a change, never
  a second ballot. `voter_class` is `visitor` (t82_rid present, hashed) or
  `session` (sid fallback: consent regions, opt-outs, cookie loss).
- `trait_consensus_v1` — settled on every write so all reads (session
  ranking, prompt, result, Avocado) are one indexed lookup.
- `trait_rules_v1` — thresholds live in configuration, never in code:
  min_eligible_votes 25, qualify at >= 62% yes, disqualify at <= 38% yes,
  disputed between; Not Sure counts and displays but never joins the ruling
  denominator. Anti-abuse: 40 calls per hash per 10 minutes, and a 1200 ms
  cadence floor between calls from one hash (the burst count alone is
  blind to upsert spam because a hash's row count is capped by the pool).

### Voter identity and privacy

The voter key is SHA-256 of `"t82-traits-v1|" + t82_rid` (or the sid under
`"t82-traits-sid|"`). The raw retention id never enters the trait tables.
Votes are game actions, not tracking: no region is blocked from playing;
regions without the durable cookie simply dedupe per visit. The public
privacy disclosure (index.html, FAQ, Avocado note) states this; keep all
three in sync.

### The endpoint (functions/api/traits.js)

- `GET ?op=session` — five questions: a `?q=` pin first, then a ranked mix
  of editorial priority, under-voted bonus, controversy bonus (closeness to
  50/50 once 5+ votes exist), and jitter; questions this voter answered
  rotate out until the pool runs thin, then revoting refills.
- `GET ?op=prompt` — the closest-to-50 fight with 5+ votes, for the
  results-screen COMMUNITY IS DIVIDED card; falls back to the loudest
  unheard question so a young database still prompts.
- `GET ?op=result&q=` — one question + snapshot.
- `POST {op:"vote"}` — validate, fence, upsert, settle, return the fresh
  snapshot. Outcomes: counted / changed / duplicate / rate_limited.
- Fail-soft law: every handled failure is a 200 JSON `{ok:false, reason}`.
  A dead endpoint leaves the game, homepage, and results screen untouched.

### Event vocabulary (ordinary stream; all ride existing v40 columns)

- `traits_session` — action: start | again | complete | exit | play_game |
  feed_error; source: home_module | results_prompt | link | direct |
  session; ordinal: calls made (complete/exit) or session number (start).
- `traits_question` — action: view | result_view; ordinal: position 1-5;
  challenge: question id; outcome on result_view: the ruling status.
- `traits_vote` — action: yes | no | unsure; outcome: counted | changed |
  duplicate | error; ordinal: position; challenge: question id; value:
  ms from question shown to tap.

No events-table migration was needed or made. The three names are on the
/api/event allowlist; they still need adding to the OUT-OF-REPO
analytics-smoke allowlist before the next full lane run.

### Doorways

- Homepage: the PLAYER TRAITS module (app.js `traitsModuleHtml`), with
  viewport-exposure `mode_impression` (action traits) and `feature_select`
  on click. Its CSS is injected by `ensureTraitsCss` so styles.css stays
  out of this patch; fold into styles.css on its next owner pass.
- Results: `traitsPromptSec` ships hidden and empty; `wireTraitsPrompt`
  reveals it only on a clean `op=prompt` answer. It rides
  `data-result-section` so section-reach tracking is free.
- Direct links: `/traits/?q=<question-id>` pins that question first;
  `?src=` rides both the analytics landing attribution and the traits
  funnel source field.

### Measurement spec (the forward handoff's ten-field method, condensed)

Hypothesis: a consequential judgment game creates repeat engagement and a
new shareable surface. Eligible population: homepage viewers (module
impression) and finishers (prompt impression). Exposure: viewport
impression, not render. Primary action: a vote. Success: session complete.
The decision number: **the share of completed sessions that start another
set** (traits_session again / complete) - the handoff names this the most
important retention signal. Failure split: feed_error vs vote error vs
exit-with-partial. Downstream: play_game clicks and, later, referral
entries from question links. Units are stated on the Avocado cards.
Decision rule: if ran-it-back holds above roughly a third once the pool
matures, expand the pool and ship question-level share cards; if
completion is high but ran-it-back is low, the pool is the problem, not
the mechanic; if entry is the leak, the homepage module earns a redesign
before the mode does.

## 5. Validation performed on this build

- `node --check` clean on every shipped client and Worker file.
- 38-check traits harness and 42-check integration harness, both green;
  full inventory in README-DEPLOY.txt (OFFLINE CHECKS). The harnesses run
  the real Worker modules and the real page against SQLite through a D1
  shim, including a full jsdom five-call walk and the hook contract.
- Still owed before promoting to main: the three out-of-repo lanes
  (legacy jsdom walk, analytics-smoke with the three new names,
  real-Chromium browser-smoke with a /traits/ path) and a real iPhone
  Safari pass on the no-scroll voting layout.

## 6. Engine integration is deliberately NOT in v44

sim-core.js is untouched; the replay law stands by construction. The
consensus table is the interface the engine will read. Shadow mode first,
then bounded effects behind a flag, per the product handoff and
TRAITS-OWNER-DECISIONS.md. Any scoring change re-runs the balance bench
against live curves before shipping.


## 7. v44.1 addendum: the final roster and anti-labels (2026-07-26)

Migration 0011 ships the owner's final eleven core traits and retires three
0010 drafts (wing-defender, primary-creator, help-defender; successors
iso-defender, playmaker, team-defender). Retirement serves nothing new and
deletes nothing: standing votes and consensus on retired questions persist,
retired pins degrade to a normal session, retired votes return
unknown_question. Post-0011 truth: 14 trait rows (11 core, 3 retired), 96
question rows, 81 active.

ANTI-LABEL rendering contract (traits/index.html): a qualifies ruling
stamps the TRAIT TAG itself; a does_not_qualify ruling stamps the same tag
with a drawn cross-out bar (class `anti`), aria-label `NOT <TAG>`, and a
why-line naming the ruling. Long tags (over 14 characters) downsize via
`longtag`. Disputed and unresolved stamps are unchanged. The result_view
analytics event already carried the status; nothing changed in the event
vocabulary.

Page build stamp: v44.1 (traits page only; no versioned asset changed, so
no cache-token or BUILD_V bump; index.html is untouched by this patch).


## 8. v45 addendum: editorial desk rulings + roster labels live (2026-07-26)

Migration 0012 creates `trait_editorial_v1`: per-question desk verdicts
(qualifies / does_not_qualify) with a note, seeded with 21 consensus-obvious
calls so the results roster wears labels before any question reaches 25
community votes. The ledger stays pure: editorial rulings never touch
trait_votes_v1 or trait_consensus_v1. `op=labels` merges the two sources
per question with COMMUNITY SUPREMACY: a settled community ruling always
replaces the desk row in the response; editorial rows carry `e: 1`.
The marquee disputes (2008 Kobe iso defense) are deliberately unseeded.
wireTraitsLabels renders both sources identically on the pick cards.


## 9. v46 addendum: the PLAYER BONUSES contract (2026-07-26)

The public product is PLAYER BONUSES; every internal name stays traits_*
(events, tables, the /api/traits endpoint) so the funnel and dashboards
read continuously across the rename. New in the contract:

Serving is curated-only. 0013's trait_question_meta_v1 is the launch pool:
sessions, the homepage module (op=featured, daily rotation over the nine
homepage_eligible rows), and the results prompt all serve only questions
with an active meta row. op=prompt accepts players= (name~season pairs,
the labels format) and prefers a disputed question about a drafted
player-season, then any curated question about a drafted name, then the
most divided question overall, then the loudest unheard.

Responses carry a display block alongside the legacy consensus payload:
mode (counts below min_eligible_votes, pct at or above), yes/no/unsure,
yes_pct, agree_pct (the share standing with this voter), and the internal
status. The client maps status to the four public chips (BONUS ACTIVE,
NO BONUS, STILL DISPUTED, BONUS PENDING) and never infers status from a
percentage. Votes by slug store the canonical question id.

New action values on the existing three event names: traits_question
gains next, try_again, share_open, share_copy; result_view sets value=1
when the early (counts) state showed. Session sources now include the
compact share referral (src=s arrives as source "s" is not allowlisted;
the page maps it through the existing source vocabulary as "share").
Entry via /bonuses/<slug> is a normal session start with its source.
