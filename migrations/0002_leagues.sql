-- TRUE 82 — 0002: Leagues (fantasy H2H seasons). Additive, IF NOT EXISTS throughout.
-- Standings are COMPUTED from league_results — no denormalized W/L to race on.
-- league_results' PK makes settlement insert-once: concurrent settlers no-op.

CREATE TABLE IF NOT EXISTS leagues (
  id TEXT PRIMARY KEY,                 -- 8-char slug (share link: ?league=<id>)
  name TEXT,
  format TEXT,                         -- all | classic | cap | pro (manifest filter)
  rounds INTEGER DEFAULT 1,            -- 1 = single round robin, 2 = double
  status TEXT,                         -- forming | active | complete
  commissioner INTEGER NOT NULL,
  season_weeks INTEGER,                -- set at start: (Neff-1)*rounds
  start_ts INTEGER,                    -- week 1 Monday 00:00 UTC (ms)
  settled_through INTEGER DEFAULT 0,   -- monotonic; advanced by CAS on read
  created_ts INTEGER, updated_ts INTEGER
);
CREATE TABLE IF NOT EXISTS league_members (
  league_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  seat INTEGER,                        -- assigned at start (join order); NULL while forming
  joined_ts INTEGER,
  PRIMARY KEY (league_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_lm_user ON league_members(user_id);
CREATE TABLE IF NOT EXISTS league_results (
  league_id TEXT NOT NULL,
  week INTEGER NOT NULL,
  seat_a INTEGER NOT NULL,             -- the smaller seat of the pairing
  seat_b INTEGER NOT NULL,
  score_a REAL, score_b REAL,          -- composite (wins + net/1000); NULL = no-show
  winner_seat INTEGER,                 -- NULL = draw
  PRIMARY KEY (league_id, week, seat_a)
);
