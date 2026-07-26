-- 0012_trait_editorial_v1.sql
-- MANUAL TAGS (owner request, 2026-07-26): editorial seed rulings so the
-- results-screen roster wears labels on day one, before any question reaches
-- the 25-vote community threshold. These are DESK rulings, not votes: no row
-- ever enters trait_votes_v1 or trait_consensus_v1, the ledger stays pure,
-- and the moment a question's COMMUNITY consensus settles (qualifies or
-- does_not_qualify at volume), the community ruling supersedes the desk row
-- in every label read. Only consensus-obvious calls are seeded; the marquee
-- fights (2008 Kobe iso defense above all) are deliberately absent so the
-- product's central arguments stay live. Requires 0011. Additive, idempotent.

CREATE TABLE IF NOT EXISTS trait_editorial_v1 (
  question_id TEXT PRIMARY KEY,
  verdict TEXT NOT NULL CHECK (verdict IN ('qualifies','does_not_qualify')),
  note TEXT,
  created_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO trait_editorial_v1 (question_id, verdict, note, created_at) VALUES
  -- Earned labels: the calls nobody argues
  ('stephen-curry-2016-super-three-point-shooter', 'qualifies', 'unanimous MVP, the gravity the trait is named for', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('klay-thompson-2016-three-point-shooter',       'qualifies', '42% on elite volume', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('reggie-miller-1997-three-point-shooter',       'qualifies', 'the era archetype', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('kawhi-leonard-2019-iso-defender',              'qualifies', 'the Giannis wall', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('draymond-green-2017-team-defender',            'qualifies', 'DPOY, the defense''s voice', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('kevin-garnett-2004-team-defender',             'qualifies', 'MVP anchor of a top defense', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('rudy-gobert-2021-rim-protector',               'qualifies', 'DPOY', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('hakeem-olajuwon-1994-rim-protector',           'qualifies', 'MVP + DPOY season', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('ben-wallace-2004-rim-protector',               'qualifies', 'DPOY', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('giannis-antetokounmpo-2021-rim-pressurer',     'qualifies', 'the whole offense is downhill', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('nikola-jokic-2023-playmaker',                  'qualifies', 'best passing big ever, title run', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('steve-nash-2005-playmaker',                    'qualifies', 'MVP for exactly this', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('klay-thompson-2016-off-ball-scorer',           'qualifies', 'the movement-shooting archetype', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('kevin-durant-2014-tough-shot-maker',           'qualifies', 'MVP on unguardable pull-ups', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('dirk-nowitzki-2011-tough-shot-maker',          'qualifies', 'the one-legged fadeaway title', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('damian-lillard-2020-clutch',                   'qualifies', 'Dame Time is the brand', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('ben-simmons-2021-switchable-defender',         'qualifies', 'DPOY runner-up, guards 1 through 5', CAST(strftime('%s','now') AS INTEGER) * 1000),
  -- Anti-labels: the obvious icks, worn as crossed tags
  ('ben-simmons-2021-clutch',                      'does_not_qualify', 'the pass under the rim', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('james-harden-2019-team-defender',              'does_not_qualify', 'the off-ball possessions are the tape', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('carmelo-anthony-2013-iso-defender',            'does_not_qualify', 'scoring title, matador defense', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('russell-westbrook-2017-three-point-shooter',   'does_not_qualify', '34% on pull-up volume is not gravity', CAST(strftime('%s','now') AS INTEGER) * 1000);
