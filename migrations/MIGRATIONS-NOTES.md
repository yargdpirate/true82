# Migration notes (commentary lives HERE, never in the .sql files)

The .sql files in this folder are PURE SQL with zero comment lines, because
the D1 console copy-paste path can smart-convert the double hyphen into a
single dash and error mid-paste. A paste that errors midway applies only
part of a migration. Every statement in every file is independent and
idempotent (IF NOT EXISTS, INSERT OR IGNORE, repeat-safe UPDATEs), so the
repair for ANY suspected partial application is simply: re-paste the whole
clean file. Nothing doubles, nothing breaks.

After pasting, verify state in one query: paste CHECK-STATE.sql. Expected
after the current chain through 0018: traits 20 (17 core, 3 retired),
questions 220 (205 active), rules 6, editorial 144, meta 200, homepage 30.

PRODUCTION STATE (checked 2026-09-27, read-only, through true82.net's own
GET /api/traits?op=result and op=labels, plus a HEAD on /r/)
- Live: 0006-0009 (analytics, retention), the recaps table (the old 0005,
  which predates this folder), and 0010-0025, each by its own mark: 0010 and
  0011 question rows, 0012 and 0019 desk labels served by op=labels, 0013
  slugs, 0015 copy, 0016's knucklehead trait, 0017's formula questions, 0018
  categories, 0020 and 0023 homepage copy, 0024's short definitions, 0025's
  24 polls. 0014 is invisible from outside; the homepage count in
  docs/GO-LIVE.md step 7 settles it (104 with 0014, 84 without).
- Not yet live: 0026, 0027, 0028. Order and commands: docs/GO-LIVE.md.
- Never SQL: 0021 and 0022 were code-only deploys (docs/history/DEPLOY-0021
  and DEPLOY-0022). 0001-0003 (accounts, leagues, fast advance) belong to
  origin/accounts-test and item 17 (later); c-code-clean needs none of them.
  0030 (v69) is this lane's own, much smaller account schema: three tables,
  renumbered out of 0001's way and carrying none of its game tables.
- The branch preview reads the production D1 (identical vote tallies on
  true82.net and c-code-clean.true82.pages.dev).

WHAT EACH FILE DOES

0008_retention_events_v1 / 0009_retention_coverage_v1
  The v40r2 retention layer, ALREADY APPLIED in production. Repo truth
  only; never needs pasting again. (These two keep their original comments
  since they are the deployed v40r2 canonical files; if you ever must
  re-paste one, delete its comment lines first, which is harmless.)

0010_traits_v1
  Player Traits foundation: five tables (traits, questions, votes with the
  unique standing-vote constraint and activity index, settle-on-write
  consensus, threshold rules), the rules seed, 5 draft traits, 27
  questions. Season uses the Basketball-Reference end-year convention
  (2008 means 2007-08).

0011_traits_final_roster_v1
  The owner's final eleven core traits (2026-07-26). Retires the three
  superseded drafts and their questions (votes and consensus preserved,
  never served), promotes the two survivors to core, inserts nine new core
  traits and 69 questions. Priorities: 100 marquee, 90s anchors, 80s depth.

0012_trait_editorial_v1
  Manual tags: 21 desk seed rulings so roster labels exist on day one.
  Desk rulings never touch the vote or consensus tables; a settled
  community ruling on the same question supersedes the desk row in every
  label read. The marquee fights (2008 Kobe iso defense) are deliberately
  unseeded.

0013_bonuses_meta_v1
  The PLAYER BONUSES editorial layer: one meta row per curated question
  (stable slug, the public natural-language sentence, the WHAT COUNTS?
  line under twelve words, the metadata line, homepage eligibility, share
  preview, active flag). Serving is curated-only: a question without a
  meta row (or with active=0) never enters sessions, prompts, or the
  homepage. Five questions are deliberately dormant at launch (Lopez,
  Tucker, Wiggins, Robinson, Beal). Nine are homepage-eligible. To
  publish a new question, INSERT one meta row; to pull one, set its
  active to 0. The editorial sentence is product copy: write it like a
  fan argument, never generate it from the trait name.

SCOUT-GENERATED.sql (read-only, paste any time)
  The graduation loop for roster-generated questions. Lists every active
  question WITHOUT a meta row (the roster-lane long tail), sorted by vote
  volume and closeness of the fight. When one earns real traffic, promote
  it: write one INSERT into trait_question_meta_v1 with a slug and a real
  editorial sentence, and it instantly joins sessions, the homepage pool
  if flagged, sharing, and per-question OG treatment. Nothing else to do;
  the votes it already collected come with it because the id never
  changes.

0014_homepage_rotation_v1
  Twenty more marquee flags (pool now 29): the obvious fights already in
  the curated set, none desk-ruled. Idempotent UPDATE; paste any time.
  op=featured now serves the LIVEST fight: among flagged questions with
  five or more eligible votes, the closest split wins, day-rotated across
  the top eight; pure day rotation over the whole pool until real fights
  exist.

0016_knucklehead_v1
  Off-Court Knucklehead joins the core traits, POLLING ONLY: no curated
  questions, no editorial rulings, no homepage presence. It is votable
  through the roster lane (any drafted player can draw it) and labels
  appear only when community consensus settles. A future build may add a
  team chemistry penalty for rostering more than one.

0018_trait_categories_v1
  Additive shadow-mode expansion: Ball Stopper, Foul Merchant, Stat
  Padder, Championship #1, and Ball Pounder become core voting/label
  categories. It adds 124 curated active questions and 123 editorial
  QUALIFIES seeds using the owner-specified season ranges. The extra
  2016 Draymond Ball Pounder question is deliberately unruled, has the
  highest editorial priority, and is homepage-eligible. Community
  consensus still supersedes every editorial seed. Despite the Stat
  Padder definition's game-engine wording, 0018 changes no simulation
  table or scoring value; that wording is the poll proposition only.
  Apply after 0017.

0019_editorial_label_expansion_v1
  Pure-data provisional label expansion. Source set: 360 player-season/trait
  rulings across 120 player-seasons, exactly three each. Sixteen combinations
  already exist through prior migrations and are preserved; 0019 inserts the
  remaining 344 questions, editorial rulings, and active public metadata.
  Aggregate source result: 290 qualifies and 70 does_not_qualify. New questions
  join ordinary voting sessions but are not homepage eligible. The migration
  uses a temporary staging table, drops it at the end, and is rerun-safe. No
  code or gameplay behavior changes. Apply after 0018.


## 0020 — Superstar homepage controversy pool
- Marks 25 existing superstar player-season questions homepage-eligible and tightens their public copy.
- Raises only those questions to editorial priority 96.
- Does not touch votes, consensus, or editorial rulings.
- Companion narrow API change alternates fresh (<5 votes) questions with the eight mature questions closest to 50/50; otherwise new zero-vote homepage options would never surface under the prior mature-only selection rule.

## 0023_homepage_superstar_controversy_v2.sql

Adds 25 additional high-priority superstar controversy/meme questions to the homepage pool. This is a data-only, idempotent promotion of existing active questions: it sets `homepage_eligible = 1`, refreshes homepage/share copy, and raises editorial priority to at least 97. It does not insert, delete, or modify user votes, consensus, editorial rulings, labels, or gameplay data. Run `VERIFY-0023-HOMEPAGE.sql` separately after applying; when the prior homepage total is 55, the expected total is 80.

## 0026_scout_claims_v1.sql (v50, 2026-09-24; the voting package's 0013_scout_claims.sql, renumbered)

The model backfill behind the tag ballot: one new table (`trait_scout_v1`),
one index on `trait_questions_v1 (lower(player_name), season)`, 29,221
question rows and 29,221 scout claims (12,770 yes, 16,451 unsure). Every
insert is INSERT OR IGNORE, so a desk-written question always wins and a
rerun is harmless (applied twice to a local copy without error). Renamed
from 0013 because 0013 is already bonuses_meta here, and not 0025 because
the accounts-test branch uses 0025_homepage_barstool. Nothing in it depends
on the number.

7.6 MB: too big for the D1 console paste path. Apply it with wrangler:
`npx wrangler d1 execute <database name> --remote --file=migrations/0026_scout_claims_v1.sql`
(the package's GitHub Actions version of the same command is kept at
docs/ballot/d1-scout-claims.yml; it needs the database name and two repo
secrets before it can run). Apply it in the same window as the v50 deploy:
the new traits.js reads it, and the old one ignores it. Sessions and the
homepage stay curated-only (a question with no meta row never surfaces), so
the 29K new rows only ever appear as labels on the players they describe.

Check: `SELECT verdict, COUNT(*) n FROM trait_scout_v1 GROUP BY verdict`
returns unsure 16451, yes 12770. Rollback is deploying the previous
traits.js; the table then sits unused.

## 0027_hunted_trait_v1.sql (v50)

One core trait row: `hunted` (display name Hunted, category defense). It is
the owner's new bad trait from the ballot handoff; Ball Stopper and Stat
Padder were already core (0018). No questions are seeded: a hunted question
is created by its first vote (op=vote create-on-first-vote). Paste-safe,
idempotent. Apply with or after 0026.

## 0025_homepage_barstool_v1.sql (from origin/accounts-test; ALREADY APPLIED in production)

24 homepage polls (questions, meta rows, homepage flags). Written on the
accounts-test line and applied to the shared production D1 from there; copied
into this folder on 2026-09-27 as repo truth, byte for byte (it matches the
owner's download in true82-allclasses2-on-v49.14). Verified live that day:
lebron-james-2011-clutch, ja-morant-2023-off-court-knucklehead and
wilt-chamberlain-1967-stat-padder carry its copy. Never needs running again;
a rerun is harmless. VERIFY-0025-HOMEPAGE.sql is its checker.

## 0028_accent_names_v1.sql (2026-09-27)

op=labels finds a player's questions by lower(player_name), using the game's
spelling from site_data.json. 27 curated rows (from 0010, 0011, 0018, 0019
and 0025) spell five players without accents: Luka Doncic 12, Nikola Jokic 6,
Toni Kukoc 3, Manu Ginobili 3, Peja Stojakovic 3. So their 22 desk rulings
and their community votes never reached a card, settled ones included (read
from the live API on 2026-09-27): Jokic 2023 Team Defender 40 votes,
qualifies; Jokic 2023 Rim Protector 27, ruled out; Doncic 2024 Ball Pounder
29, qualifies; Doncic 2024 Off-Ball Scorer 37, ruled out. This is the
name-folding migration the v50 handoff called for. It renames player_name
only: ids, votes, consensus, desk rulings, meta rows and links stay as they
are. char() spells the accents so no paste path can mangle them. Idempotent:
each WHERE matches only the unaccented spelling. Checked on a local copy with
0010-0027 applied: unaccented rows 27 to 0, matching desk labels 0 to 22;
0026-0028 rerun clean. Apply after 0027.

Two id spaces (known, not fixed here). The curated ids fold accents by hand
(nikola-jokic-2023-playmaker); the game, op=roster, create-on-first-vote and
the 0026 scout rows turn each non-ASCII letter into a dash
(nikola-joki-2023-playmaker, luka-don-i-..., manu-gin-bili-...). After 0026,
13 of the 27 curated rows have a scout twin for the same player, season and
trait. op=labels settles each trait once by name (community, then desk, then
scout), and the ballot votes on the winning layer's own id first
(ballotApplyLabels in app.js), so a desk or crowd ruling keeps collecting its
votes on the curated row. Votes on an unsettled curated row whose twin wins
on a scout claim (Jokic 2023 Playmaker 17, Doncic 2024 Rim Pressurer 15) stay
stranded with or without 0028; merging twins would be its own careful
migration. The live DB had no dash-id twins for these five on 2026-09-27: the
v47 roster lane skips any name outside [a-z .'-].

Left alone on purpose: PJ Tucker 2021 (a dormant question; the scout rows
cover P.J. Tucker under p-j-tucker ids, so renaming would duplicate the
trait) and Wilt Chamberlain 1967 (a 0025 homepage poll; Wilt is not in the
game's data).

Not fixable by a migration: SQLite's lower() folds only ASCII letters while
parsePlayerPairs lowercases with JavaScript, so a name with a non-ASCII
capital never matches in op=labels (17 players in site_data.json; 69 of the
0026 scout rows: Alperen Şengün 14, Ersan İlyasova 25, Šarūnas Marčiulionis
16, Dario Šarić 8, Álex Abrines 6). The fix belongs in functions/api/traits.js.

## 0029_scout_thin_tags_v1.sql (v62.1, 2026-09-28; APPLIED to D1 true82 on 2026-09-28 at the owner's go: unsure 249, yes 215)

The scout backfill for five tags the 0026 pass never covered: hunted, ball-stopper, ball-pounder, foul-merchant,
stat-padder. 464 question rows and 464 scout claims (215 yes, 249 unsure), same shape and source convention as 0026
(`source` = "scout-2026-09-28 claude-opus-5-5"). Every draftable player-season (13,986, a whole season over 785
minutes) was scouted by ten parallel scouts from one brief (docs/scout/THIN-TAGS-BRIEF-2026-09-28.md, which carries
the desk's earlier rulings as calibration); the merged claims are kept at docs/scout/thin-tags-claims-2026-09-28.json.
TITLE #1 is left out on purpose (the owner: "ultra stingy"; the desk already names every champion's number one).
No claim is written for a player, season and tag that already has a question row (a desk or crowd call stays
theirs), so there are no twins. INSERT OR IGNORE throughout; applied twice to a scratch copy of the trait tables:
464 questions, 464 claims, no orphans.

111 KB: too big for the console paste path. Apply it with wrangler:
`npx wrangler d1 execute true82 --remote --file=migrations/0029_scout_thin_tags_v1.sql`
Check: `SELECT verdict, COUNT(*) n FROM trait_scout_v1 WHERE source LIKE 'scout-2026-09-28%' GROUP BY verdict`
returns unsure 249, yes 215. The results cards on true82.net read the live tags, so the new tags show there at once;
the game's boards and scoring read labels.json, which picks them up at the next tag refresh
(`node tools/labels-refresh.js`, or the Monday task). Rollback: `DELETE FROM trait_scout_v1 WHERE source =
'scout-2026-09-28 claude-opus-5-5'` (the question rows are harmless without a claim).


## 0030_accounts_min_v1.sql (v69, 2026-10-03; NOT YET APPLIED)

The account lane's whole schema: three tables, all additive, nothing existing touched.

`users` — `clerk_id` (unique, opaque, Clerk's), `tag` (unique, 4 characters from a 30-symbol no-confusable alphabet,
server-assigned by `functions/_lib/auth.js`), `display_name` (filtered by `_lib/names.js`, defaults to `GM-<tag>`),
the three cosmetic slots the spec reserves, and two timestamps. No email, no password, no IP, no user agent — Clerk
is the identity of record and SECURITY.md explains why that is the whole point.

`sid_links` — `(sid, user_id)`. `sid` is `t82:sid`, a namespace `accounts.js` mints for this lane alone. It is
deliberately NOT the retention cookie `t82_rid` and NOT the traits voter hash: joining either would turn the
pseudonymous analytics stream into an identified one, against the owner's v43 privacy decision.

`local_claims` — `(user_id, kind)` holding ONE JSON blob. Today the only kind is `daily1`: the up-to-400-day local
Daily record from `localStorage.t82_daily1`, which is otherwise lost the moment someone clears their browser.
`days` and `streak` sit beside the blob so `/api/me` never parses it, and `verified` is always 0 because every byte
of it is client-reported (ACCOUNTS.md §1) — it must never feed a verified board.

**Why one blob and not one row per day.** D1's free plan allows 100,000 row writes a day, and since 2026-09-01
Cloudflare *fails* queries once an account crosses it. At a row per day, 250 sign-ups would spend the entire site's
daily write budget and take the Tribune and the analytics down with them. One row per claim makes a launch spike
one write per person. If a board ever needs to query individual days, expand it then, from the blob.

Small enough for the console paste path. Order of application does not matter: it depends on nothing.
`npx wrangler d1 execute true82 --remote --file=migrations/0030_accounts_min_v1.sql`
Check: `SELECT COUNT(*) FROM users` returns 0 on a fresh apply, and
`SELECT name FROM sqlite_master WHERE name IN ('users','sid_links','local_claims')` returns three rows.
Rollback: `DROP TABLE local_claims; DROP TABLE sid_links; DROP TABLE users;` — nothing else references them.

## 0031_runs_boards_v1.sql (v69.1, 2026-10-03; NOT YET APPLIED)

The boards' one table. `runs` holds a finished game as the SERVER recomputed it: `wins`, `net`, `budget_used`,
`cap_left`, `hh_win` and `picks` all come from replaying `{mode, seed, actions}` through the same sim-core.js the
browser ran, never from anything the client said about its own score. `verified` is 1 only when that replay agreed;
`verdict` records why when it did not (`rng-draws`, `wins`, `net`, `hh`, `illegal-op`, `incomplete`, `engine`).

Six indexes, one per board plus two guards. `idx_runs_official_once` is the important one: UNIQUE on
`(user_id, official)`, so the first official attempt at a day's Daily is the one that counts and a second is
accepted, answered honestly and dropped. `idx_runs_pending` exists so unverified rows can be found again if the
engine was unavailable when they arrived.

There is deliberately NO streak table. An incremental counter has to assume days arrive in chronological order, and
a counter that can drift is the wrong thing to put under a board people care about; `/api/lb?board=streak` computes
the longest consecutive run with gaps-and-islands over the rows themselves (`julianday(day) - row_number()` is
constant inside a run). test.js runs that exact SQL against an in-memory SQLite, including out-of-order inserts.

Small enough for the console paste path, and it depends on 0030 only for the `users` rows the boards join to.
`npx wrangler d1 execute true82 --remote --file=migrations/0031_runs_boards_v1.sql`
Check: `SELECT COUNT(*) FROM runs` returns 0 on a fresh apply.
Rollback: `DROP TABLE runs;` — nothing else references it.

