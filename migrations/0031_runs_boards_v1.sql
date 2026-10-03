CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  user_id INTEGER,
  sid TEXT,
  mode TEXT NOT NULL,
  seed INTEGER,
  core_version INTEGER,
  data_version INTEGER,
  official TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  verdict TEXT,
  wins INTEGER,
  net REAL,
  budget_used INTEGER,
  cap_left INTEGER,
  hh_win INTEGER,
  actions TEXT,
  rng_draws INTEGER,
  picks TEXT,
  created_ts INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_runs_official_once ON runs(user_id, official) WHERE official IS NOT NULL AND user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_runs_rate ON runs(user_id, mode) WHERE verified = 1;

CREATE INDEX IF NOT EXISTS idx_runs_cheapest ON runs(mode, wins, budget_used) WHERE verified = 1;

CREATE INDEX IF NOT EXISTS idx_runs_net ON runs(mode, net DESC) WHERE verified = 1;

CREATE INDEX IF NOT EXISTS idx_runs_daily ON runs(official, wins DESC, net DESC) WHERE verified = 1 AND official IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_runs_pending ON runs(verified, created_ts) WHERE verified = 0;
