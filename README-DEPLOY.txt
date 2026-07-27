TRUE 82 V44 — RETENTION MERGE + PLAYER TRAITS — CURRENT DEPLOY

WHAT V44 IS:
  The forward merge of two async branches, plus one new mode.
  1. The v43 gameplay/frontend patch (ANY GIVEN NIGHT era code, info pages,
     event vocabulary) is the base.
  2. The deployed v40r2 retention layer (isolated retention_events_v1 +
     retention_coverage_v1, 400-day first-party HttpOnly cookie identity,
     Avocado v42.2) is preserved exactly as it runs in production. The v43
     localStorage retention experiment is RETIRED UNSHIPPED: its migration
     (0008_retention_identity.sql) is intentionally absent from this package
     and must never be applied.
  3. PLAYER TRAITS: community voting mode at /traits/ with its own D1 tables,
     API, homepage module, results-screen prompt, and Avocado cards.
  See ANALYTICS-V44-RETENTION-AND-TRAITS.md for the full contract.

DEPLOY IN THIS ORDER:
  v47 smoke: the homepage Player Bonuses card should glow amber and take
     five YES/NO votes right there (dots advance, compact result after
     each, VOTE ON 5 MORE at the end); the /bonuses/ page shows the three
     controls in one group and CHANGE VOTE under every result.
  0. The pasteable .sql files are PURE SQL, zero comment lines: some copy
     paths smart-convert the double hyphen into a dash and error mid-paste,
     leaving a migration PARTIALLY applied. If any earlier paste errored,
     just re-paste the clean file: every statement is idempotent and
     self-heals. Verify with one paste of migrations/CHECK-STATE.sql
     (expect traits 14, core 11, retired 3, questions 96, rules 6,
     editorial 21). Commentary lives in migrations/MIGRATIONS-NOTES.md.
  1. Apply migrations/0010_traits_v1.sql ONCE to the production D1 DB
     (Cloudflare console paste, same as always). It is additive and safe to
     re-run; it creates five trait tables and seeds 5 draft traits, 27
     questions, and the threshold rules. It touches no existing table.
     v46: FIRST open _routes.json at the repo root and add "/bonuses/*"
     to the include array (one line; this patch does not ship the file
     because your live copy may carry entries this workspace cannot see,
     and overwriting it could sever working function routes). Without it
     the direct question links never reach the slug function.
     Then paste migrations/0013_bonuses_meta_v1.sql (the curated
     Player Bonuses pool; pure SQL, rerun-safe). Smoke after deploy:
     open /bonuses/2008-kobe-elite-wing-defender directly (question loads
     with vote controls, page title carries the question), vote, check the
     result state and SHARE QUESTION, then confirm the homepage module
     shows one big rotating question with a VOTE button and the results
     screen shows the compact PLAYER BONUS card. Presti uncap check: start
     a cap-mode game and run T82.t.SC.PG_CAP in the console (expect 1);
     the Presti season now plays out on the reel like classic, and an 81-1
     landing should hand you the Heat Check lever (?clutch=1 forces it),
     then a classic game (expect the shipped value, 0.99 with v42-final
     data). Legacy /traits/ links redirect with their q intact. Feel checks
     on a phone: tapping YES should tick in your hand on any iPhone (iOS
     17.4 up, including 26.5) and any Android; the result landing adds a
     tick on Android and iOS up to 26.4; music or a podcast playing in
     the background must keep playing untouched through all of it. A
     shared marquee link (the nine homepage questions) should unfurl
     with its own typography card, not the generic brand image.
     v45: apply 0010, 0011, AND 0012_trait_editorial_v1.sql (desk seed
     rulings so roster labels exist on day one; community supersedes at
     volume). All three are rerun-safe. v45 also SHIPS styles.css for the
     first time since v40: it is the complete v42-final stylesheet and must
     land with the rest of the folder. After deploy run T82.t.SC.PG_CAP in
     the console: 0.99 means the data file is v42-final; 0.978 or undefined
     means site_data.json from true82-full-state-v42.zip still needs to be
     dropped into the repo (data only, no code).
     v44.1: ALSO apply migrations/0011_traits_final_roster_v1.sql after it
     (the owner's final eleven traits + anti-labels; additive, idempotent,
     vote-preserving). If 0010 is already live, 0011 alone completes v44.1.
     THESE ARE THE ONLY MIGRATIONS V44/V44.1 NEED. 0008_retention_events_v1 and
     0009_retention_coverage_v1 are already live from the v40r2 deploy and
     ship here only as repository truth.
  2. Drag the CONTENTS of this folder to the repository root and let
     Cloudflare Pages build the commit. DELETE migrations/
     0008_retention_identity.sql from the repo if a copy exists there from
     the v43 packaging: it belongs to the retired experiment.
  3. Load the game and confirm the footer reads v44.
  4. In the console run t82AnalyticsDebug() and confirm:
     - build: "v44"
     - retention.state: "enabled" on an ordinary U.S. browser
     - retention.identitySource: "cookie" on a reload
  5. Open /traits/, play five calls on a phone, confirm the ruling stamp,
     the completion screen, and MAKE 5 MORE CALLS serving fresh questions.
  6. Open /avocado?...&debug=1 and confirm: retention schema = yes, coverage
     schema = yes, the two Player Traits cards render, and there is no
     Dashboard query warning.
  7. Finish a game and confirm the results screen shows the disputed-call
     prompt once /api/traits has at least one question with 5+ votes (it
     ships hidden and fail-soft until then).

SAFETY:
  - Migration 0010 is additive only and idempotent (IF NOT EXISTS +
    INSERT OR IGNORE throughout).
  - Rolling the website back needs no database rollback; the trait tables
    are inert without the code.
  - Every traits surface fails soft: a dead /api/traits leaves the game,
    the results screen, and the homepage exactly as they were.
  - /api/event now inserts on the v40 schema first (the v43 tier is gone),
    so ordinary events stop attempting a doomed v43 insert per row.

PRIVACY BOUNDARY (v44):
  Ordinary product analytics remains anonymous and session-scoped. The
  separate retention stream uses one random first-party TRUE 82 browser id
  in a secure HttpOnly cookie with local-storage fallback, up to 400 days;
  disabled for EEA/UK/Swiss traffic, unknown/Tor geolocation, and the
  explicit site opt-out (t82RetentionOptOut() / t82RetentionOptIn()).
  DNT/GPC are recorded as diagnostics and do not suppress strictly
  first-party measurement. Player Traits votes are stored as anonymous
  tallies keyed by a one-way purpose-scoped hash; the raw retention id
  never enters the trait tables. The public disclosure in index.html,
  the FAQ, and the Avocado privacy note all state this model; keep them
  in sync with any future change.

OFFLINE CHECKS (this build):
  Syntax: node --check on every shipped client and Worker file: clean.
  Harness (lives outside the repo, true82-devtools style):
    node test-traits.js        38 checks: migration idempotence x2, seed
                               integrity, session serving, pinning, vote /
                               revote / duplicate, unsure exclusion,
                               threshold transitions (qualifies, disputed,
                               does not qualify), prompt selection, answered
                               rotation, burst fence, cadence fence, hostile
                               input, no-DB fail-soft.
    node test-integration.js   42 checks: traits funnel ingestion lands
                               first-try on schema v40, allowlist holds,
                               Avocado renders traits + retention + coverage
                               cards with no query warning behind DASH_KEY,
                               full jsdom five-call walk against the real
                               worker (stamps, completion, MAKE 5 MORE,
                               question rotation, funnel events, standing
                               rows), and the analytics<->retention hook
                               contract (subscriber preferred, no monkey-
                               patch, enriched run_id, no event leakage,
                               debug surfaces retention state).
  STILL OWED BEFORE PROMOTING TO MAIN: the legacy jsdom walk, analytics-
  smoke, and real-Chromium browser-smoke lanes live outside this package.
  Add the three new event names (traits_session, traits_question,
  traits_vote) to the analytics-smoke allowlist and give browser-smoke a
  /traits/ five-call path, then run all three lanes. A real iPhone Safari
  pass on /traits/ is strongly recommended: the no-scroll voting layout is
  the product.

-------------------------------------------------------------------------------
HISTORICAL DEPLOY NOTES FOLLOW
-------------------------------------------------------------------------------

TRUE 82 V43 RETENTION ANALYTICS — RETIRED BEFORE DEPLOY
  v43's localStorage retention experiment was superseded by the v40r2
  isolated backport, which the owner deployed to production directly. Its
  migration 0008_retention_identity.sql was never applied and is not part
  of this package. Do not apply it. The v43 gameplay and frontend work
  carries forward inside v44.

TRUE 82 V42.1 ANALYTICS PATCH NOTICE
  - Avocado dashboard repair was v42.1 and required NO new D1 migration.
  - Existing migrations 0006 and 0007 are still required only if they were
    never applied.
  - Use /avocado?...&debug=1 for query ids and SQL fingerprints.

HISTORICAL V39 BASE DEPLOY NOTES (analytics schema origin):

CURRENT AGENT HANDOFF:
  Read AGENT-HANDOFF.md before modifying this build. It documents the current
  UI hierarchy, Daily rules, engine invariants, and analytics privacy boundary.

TRUE 82 v39 — full live site with THE DAILY and cookieless analytics.
  First-deploy instructions, rollback law, and the beat-my-five link note
  are preserved in the repository history; the operative rules that survive:
  - The event endpoint fails soft to older schemas if a site deploy lands
    before a migration. The game does not fail.
  - Additive migrations cannot be re-run as written when they use ADD
    COLUMN; the retention and traits migrations use IF NOT EXISTS and are
    safe to re-run.
  - The critical version-coupled chain is analytics.js, app.js, index.html,
    functions/api/event.js, functions/avocado.js, and the migrations.
