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
