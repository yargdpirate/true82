-- TRUE 82 v44: Player Traits community voting mode.
-- SAFE / IDEMPOTENT: creates five new isolated tables and their indexes, plus
-- seed rows via INSERT OR IGNORE. It never ALTERs, UPDATEs, DELETEs, DROPs,
-- copies, or rewrites events, analytics_events_v4, recaps, retention_events_v1,
-- or retention_coverage_v1. Safe to run before or after the code deploy and
-- safe to run more than once.
--
-- Traits are DATA, not columns (per the product handoff): add, pause, or
-- redefine a trait by editing rows, never by migrating schema.
--
-- SEED NOTE FOR THE OWNER: the five traits below are the handoff's own example
-- set, seeded as status='experimental' placeholders so the mode is playable.
-- The final set of 10 public traits is an owner decision the handoff says must
-- not be made silently during implementation. Swapping the set is row edits
-- plus new questions; no schema change.

CREATE TABLE IF NOT EXISTS traits_v1 (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  short_definition TEXT NOT NULL,
  category TEXT,
  definition_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'experimental',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS trait_questions_v1 (
  id TEXT PRIMARY KEY,
  trait_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  season INTEGER,
  season_label TEXT,
  player_key TEXT,
  prompt_override TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  editorial_priority INTEGER NOT NULL DEFAULT 0,
  definition_version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tqv1_status ON trait_questions_v1(status, editorial_priority);
CREATE INDEX IF NOT EXISTS idx_tqv1_trait ON trait_questions_v1(trait_id);

CREATE TABLE IF NOT EXISTS trait_votes_v1 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id TEXT NOT NULL,
  voter_hash TEXT NOT NULL,
  voter_class TEXT NOT NULL,
  response TEXT NOT NULL,
  source TEXT,
  changed INTEGER NOT NULL DEFAULT 0,
  abuse_state TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tvv1_unique ON trait_votes_v1(question_id, voter_hash);
CREATE INDEX IF NOT EXISTS idx_tvv1_hash_time ON trait_votes_v1(voter_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_tvv1_hash_activity ON trait_votes_v1(voter_hash, updated_at);
CREATE INDEX IF NOT EXISTS idx_tvv1_question ON trait_votes_v1(question_id);

CREATE TABLE IF NOT EXISTS trait_consensus_v1 (
  question_id TEXT PRIMARY KEY,
  eligible_votes INTEGER NOT NULL DEFAULT 0,
  yes_count INTEGER NOT NULL DEFAULT 0,
  no_count INTEGER NOT NULL DEFAULT 0,
  unsure_count INTEGER NOT NULL DEFAULT 0,
  yes_share REAL,
  status TEXT NOT NULL DEFAULT 'unresolved',
  rules_version INTEGER NOT NULL DEFAULT 1,
  calculated_at INTEGER
);

CREATE TABLE IF NOT EXISTS trait_rules_v1 (
  rule_key TEXT PRIMARY KEY,
  rule_value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Thresholds live in configuration, never in scoring code (handoff rule).
-- eligible = yes + no; Not Sure is counted and displayed but never rules.
INSERT OR IGNORE INTO trait_rules_v1 (rule_key, rule_value, updated_at) VALUES
  ('min_eligible_votes', '25', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('qualify_yes_share', '0.62', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('disqualify_yes_share', '0.38', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('vote_burst_limit_10min', '40', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('vote_min_spacing_ms', '1200', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('rules_version', '1', CAST(strftime('%s','now') AS INTEGER) * 1000);

-- DRAFT trait set: the handoff's five example labels, plain basketball terms.
INSERT OR IGNORE INTO traits_v1 (id, display_name, short_definition, category, definition_version, status, created_at, updated_at) VALUES
  ('three-point-shooter', 'Three-Point Shooter', 'Defenses had to guard him hard at the arc: real volume, real accuracy, real gravity.', 'spacing', 1, 'experimental', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('wing-defender', 'Wing Defender', 'You could put him on a high-level scoring wing for real possessions and live with it.', 'defense', 1, 'experimental', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('rim-protector', 'Rim Protector', 'Shots at the rim changed because he was there: contests, blocks, and altered drives.', 'defense', 1, 'experimental', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('primary-creator', 'Primary Creator', 'The offense could run through his hands: good shots for himself and others against a set defense.', 'creation', 1, 'experimental', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('help-defender', 'Help Defender', 'Away from his man he made the defense better: rotations, digs, and clean-up plays on time.', 'defense', 1, 'experimental', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000);

-- Seed question pool: recognizable players, deliberately disputed reputations,
-- a few near-consensus calibration calls, eras from the 90s to the 2020s.
-- season uses the Basketball-Reference end-year convention (2008 = 2007-08).
INSERT OR IGNORE INTO trait_questions_v1 (id, trait_id, player_name, season, season_label, status, editorial_priority, definition_version, created_at, updated_at) VALUES
  ('kobe-bryant-2008-wing-defender',            'wing-defender',       'Kobe Bryant',         2008, '2007-08', 'active', 100, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('nikola-jokic-2023-rim-protector',           'rim-protector',       'Nikola Jokic',        2023, '2022-23', 'active',  95, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('klay-thompson-2016-wing-defender',          'wing-defender',       'Klay Thompson',       2016, '2015-16', 'active',  90, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('kobe-bryant-2008-help-defender',            'help-defender',       'Kobe Bryant',         2008, '2007-08', 'active',  90, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('russell-westbrook-2017-three-point-shooter','three-point-shooter', 'Russell Westbrook',   2017, '2016-17', 'active',  85, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('james-harden-2019-wing-defender',           'wing-defender',       'James Harden',        2019, '2018-19', 'active',  85, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('rudy-gobert-2021-rim-protector',            'rim-protector',       'Rudy Gobert',         2021, '2020-21', 'active',  85, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('luka-doncic-2024-wing-defender',            'wing-defender',       'Luka Doncic',         2024, '2023-24', 'active',  80, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('draymond-green-2016-three-point-shooter',   'three-point-shooter', 'Draymond Green',      2016, '2015-16', 'active',  80, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('kyrie-irving-2016-primary-creator',         'primary-creator',     'Kyrie Irving',        2016, '2015-16', 'active',  80, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('carmelo-anthony-2013-primary-creator',      'primary-creator',     'Carmelo Anthony',     2013, '2012-13', 'active',  80, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('kobe-bryant-2006-three-point-shooter',      'three-point-shooter', 'Kobe Bryant',         2006, '2005-06', 'active',  75, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('lebron-james-2013-three-point-shooter',     'three-point-shooter', 'LeBron James',        2013, '2012-13', 'active',  75, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('karl-anthony-towns-2022-rim-protector',     'rim-protector',       'Karl-Anthony Towns',  2022, '2021-22', 'active',  75, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('james-harden-2019-help-defender',           'help-defender',       'James Harden',        2019, '2018-19', 'active',  75, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('carmelo-anthony-2013-wing-defender',        'wing-defender',       'Carmelo Anthony',     2013, '2012-13', 'active',  70, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('klay-thompson-2016-three-point-shooter',    'three-point-shooter', 'Klay Thompson',       2016, '2015-16', 'active',  60, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('anthony-davis-2020-rim-protector',          'rim-protector',       'Anthony Davis',       2020, '2019-20', 'active',  50, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('james-harden-2019-primary-creator',         'primary-creator',     'James Harden',        2019, '2018-19', 'active',  45, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('paul-george-2019-wing-defender',            'wing-defender',       'Paul George',         2019, '2018-19', 'active',  40, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('russell-westbrook-2017-primary-creator',    'primary-creator',     'Russell Westbrook',   2017, '2016-17', 'active',  40, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('draymond-green-2017-help-defender',         'help-defender',       'Draymond Green',      2017, '2016-17', 'active',  40, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('kevin-garnett-2004-help-defender',          'help-defender',       'Kevin Garnett',       2004, '2003-04', 'active',  40, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('reggie-miller-1997-three-point-shooter',    'three-point-shooter', 'Reggie Miller',       1997, '1996-97', 'active',  35, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('ben-wallace-2004-rim-protector',            'rim-protector',       'Ben Wallace',         2004, '2003-04', 'active',  35, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('steve-nash-2005-primary-creator',           'primary-creator',     'Steve Nash',          2005, '2004-05', 'active',  35, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('hakeem-olajuwon-1994-rim-protector',        'rim-protector',       'Hakeem Olajuwon',     1994, '1993-94', 'active',  30, 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000);
