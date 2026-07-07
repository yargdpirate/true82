-- TRUE 82 — migrations/0001_accounts.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Apply by hand, PREVIEW D1 FIRST (repo law — see RUNBOOK.md):
--   wrangler d1 execute true82 --env preview --file=migrations/0001_accounts.sql
--   wrangler d1 execute true82 --remote --file=migrations/0001_accounts.sql
-- Everything here is ADDITIVE beside the existing `events` table; the KV
-- counter is untouched. Fail-soft writes follow event.js's pattern.
--
-- Spec: ACCOUNTS.md §3. As-built deltas from the original spec text (all
-- documented back into §3): runs gains data_version (gap ruling §14.2),
-- challenge_id + week (the Weekly, §5.5).

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  tag TEXT UNIQUE NOT NULL,            -- e.g. '4F2K' (no-confusable alphabet)
  display_name TEXT NOT NULL,          -- filtered; 'GM-<tag>' fallback
  title TEXT, frame TEXT, banner TEXT, -- equipped cosmetics (ids live in code)
  created_ts INTEGER, last_seen_ts INTEGER
);

CREATE TABLE IF NOT EXISTS sid_links ( -- anonymous-history stitching
  sid TEXT NOT NULL, user_id INTEGER NOT NULL, linked_ts INTEGER,
  PRIMARY KEY (sid, user_id)
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,                 -- client UUID (dedupe on stitch)
  user_id INTEGER, sid TEXT,
  mode TEXT, seed INTEGER, core_version INTEGER,
  data_version INTEGER,                -- dataset stamp (update-day rule §14.2)
  challenge_id TEXT,                   -- weekly ruleset id (challenges.js)
  week TEXT,                           -- ISO week label '2026-W28' when weekly
  official TEXT,                       -- daily label '2026-07-06|cap' or NULL
  verified INTEGER DEFAULT 0,
  wins INTEGER, net REAL,
  hh_seg INTEGER, hh_win INTEGER,      -- wheel segment index / boosted to 82?
  budget_used INTEGER, cap_left INTEGER, rerolls INTEGER, skips INTEGER,
  actions TEXT, rng_draws INTEGER,     -- replay payload (JSON array of ops)
  picks TEXT,                          -- JSON [[name,season,slot,cost],...]
  created_ts INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_runs_official ON runs(user_id, official)
  WHERE official IS NOT NULL;          -- first official attempt counts, once
CREATE INDEX IF NOT EXISTS idx_runs_board ON runs(official, wins DESC, net DESC)
  WHERE verified = 1;
CREATE INDEX IF NOT EXISTS idx_runs_weekly ON runs(week, challenge_id, wins DESC, net DESC)
  WHERE verified = 1 AND week IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_runs_user ON runs(user_id, created_ts);

CREATE TABLE IF NOT EXISTS hof (       -- snapshot card, survives schema drift
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, run_id TEXT,
  card TEXT NOT NULL,                  -- JSON: lineup, record, headline, date
  ts INTEGER
);

CREATE TABLE IF NOT EXISTS achievements (
  user_id INTEGER NOT NULL, ach_id TEXT NOT NULL, run_id TEXT, ts INTEGER,
  PRIMARY KEY (user_id, ach_id)
);

CREATE TABLE IF NOT EXISTS notebook (  -- sparse; states only move UP
  user_id INTEGER NOT NULL, ps TEXT NOT NULL,   -- 'name|season'
  state INTEGER NOT NULL,              -- 1 drafted, 2 contender(75+), 3 immortal(82-0)
  ts INTEGER, PRIMARY KEY (user_id, ps)
);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,                 -- short invite slug
  name TEXT NOT NULL, owner INTEGER, created_ts INTEGER
);
CREATE TABLE IF NOT EXISTS group_members (
  group_id TEXT NOT NULL, user_id INTEGER NOT NULL, joined_ts INTEGER,
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS matches (   -- one row per duel; append-only actions
  id TEXT PRIMARY KEY, mode TEXT, seed INTEGER, core_version INTEGER,
  status TEXT,                         -- open|active|complete|resigned (archived is a READ of stale active — zero-cron)
  p1 INTEGER NOT NULL, p2 INTEGER,
  turn INTEGER,                        -- user id to move
  actions TEXT,                        -- JSON [{u,op,ts},...]
  state TEXT,                          -- JSON snapshot for fast reads
  quips TEXT,                          -- JSON [{u,qid,ts},...]
  winner INTEGER, rematch_of TEXT,
  created_ts INTEGER, updated_ts INTEGER
);
CREATE INDEX IF NOT EXISTS idx_matches_turn ON matches(turn, status);
CREATE INDEX IF NOT EXISTS idx_matches_p1 ON matches(p1, updated_ts);
CREATE INDEX IF NOT EXISTS idx_matches_p2 ON matches(p2, updated_ts);
