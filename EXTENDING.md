# TRUE 82 — EXTENDING.md: the rails

Every extension below is a groove already cut. Follow the groove; the tests
tell you when you've left it. **The prime directive: `node test.js` (157) and
`node scripts/validate_challenges.js --full` green before anything ships.**

## Add a weekly challenge
1. One entry in `challenges.js` (copy a neighbor). Hooks: `filter(row,t)` /
   `pick(S,row,slot,t)` / `deal(S,t)→{decs,frs}` / `cfg{}` (whitelist in the
   header — NET_SD/BASELINE/REPLACEMENT/HH are never hookable).
2. Obey the creative doctrine (file header): mechanics permutations with a
   mid-draft punchline, never data slices. Author against the measured
   distribution facts in the header.
3. `node scripts/validate_challenges.js --full` → 0 failing (SPCY = fine).
4. That's it — rotation, verification, boards, and leagues pick it up.

## Add a new official run type (the daily/weekly/league pattern)
1. Label grammar first (e.g. `cup|<id>|<round>`), minted seed via
   `dailySeed(secret, label)`.
2. A branch in run.js's official chain: validate context server-side, re-mint
   the seed, set `official = label`. The UNIQUE(user_id, official) index
   gives you one-attempt for free.
3. Client: a `G.<tag>` on newGame + a dialect line in accounts.js submitRun.
4. **Extend the §14b tripwire with both sides' strings** — this is mandatory,
   it's what caught the last dialect drift.

## League knobs (where each law lives)
- Pacing / advancement → `league-core.advanceDecision` (ONLY here).
- Pairings → `league-core.schedule` (circle method; §10c owns its invariants).
- Tiebreaks → `league-core.standings` (tie-GROUP h2h — read the comment
  before "simplifying" it).
- Week challenge draw → `challengeIndex` + `poolFilter`.
- Playoffs someday: extra weeks after `season_weeks` with a bracket schedule
  fn; the settle loop and results table need nothing new.

## Achievements (tables exist since 0001)
Pattern: a manifest like challenges.js (`achievements.js`: id, name, blurb,
`check(run|match|league) → bool`), evaluated inside run.js/match-move after
verification, INSERT OR IGNORE into the achievements table, surfaced on the
Arena. №36 checks `mode==='kaman' && duel` — the lobby doesn't offer kaman
duels yet; add it behind the same easter-egg spirit.

## Balance changes (difficulty, pricing, taxes, odds)
1. **Bump `T82.VERSION`** — even if replays stay intact. Every run stores
   core_version; the bump is the analytics patch fence (queries #11–#15).
2. **Land at a week boundary** with no live duels you care about: open
   matches and league weeks resolve with CURRENT scoring.
3. **Never tune a challenge in place.** Same id + different cfg poisons
   every historical comparison — retire the id, add `<name>_v2`, revalidate
   (`--full`). Same root cause as BUGHUNT §0's mid-season manifest edge.
4. After deploy, run analytics #12 to confirm the new version fence exists.

## New endpoint checklist
json() helper (200-always, x-t82-err) · getAuth (never trust, always
fail-soft) · `.bind()` everything · caps on every array/string ·
optimistic-lock every UPDATE that races · add to test §14 import list ·
smoke curl + playbook row in RUNBOOK · consider the tripwire.

## Dashboards / admin
Read-only, keyed by ADMIN_KEY, SQL from `scripts/analytics.sql` — spec'd in
RUNBOOK §Analytics as a Sonnet task on purpose. Never add user ids to the
events table (consent-free by design — SECURITY.md posture depends on it).
