# Migration notes (commentary lives HERE, never in the .sql files)

The .sql files in this folder are PURE SQL with zero comment lines, because
the D1 console copy-paste path can smart-convert the double hyphen into a
single dash and error mid-paste. A paste that errors midway applies only
part of a migration. Every statement in every file is independent and
idempotent (IF NOT EXISTS, INSERT OR IGNORE, repeat-safe UPDATEs), so the
repair for ANY suspected partial application is simply: re-paste the whole
clean file. Nothing doubles, nothing breaks.

After pasting, verify state in one query: paste CHECK-STATE.sql. Expected
after 0010 + 0011 + 0012 + 0013: traits 15 (12 core, 3 retired), questions
96 (81 active), rules 6, editorial 21, meta 76, homepage 29 after 0014.

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
