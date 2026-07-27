-- TRUE 82 aggressive first-party retention coverage diagnostics.
-- SAFE / IDEMPOTENT: creates one separate aggregate diagnostics table and indexes.
-- It does not alter or rewrite gameplay or existing analytics tables.

CREATE TABLE IF NOT EXISTS retention_coverage_v1 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  local_day TEXT NOT NULL,
  sid TEXT,
  decision TEXT NOT NULL,
  reason TEXT NOT NULL,
  country TEXT,
  device TEXT,
  browser TEXT,
  gpc INTEGER NOT NULL DEFAULT 0,
  dnt INTEGER NOT NULL DEFAULT 0,
  cookie_present INTEGER NOT NULL DEFAULT 0,
  local_present INTEGER NOT NULL DEFAULT 0,
  storage_ok INTEGER,
  identity_source TEXT
);

CREATE INDEX IF NOT EXISTS idx_rcv1_day
  ON retention_coverage_v1(local_day);
CREATE INDEX IF NOT EXISTS idx_rcv1_decision_day
  ON retention_coverage_v1(decision, local_day);
CREATE INDEX IF NOT EXISTS idx_rcv1_reason_day
  ON retention_coverage_v1(reason, local_day);
CREATE INDEX IF NOT EXISTS idx_rcv1_browser_day
  ON retention_coverage_v1(browser, local_day);
CREATE INDEX IF NOT EXISTS idx_rcv1_sid
  ON retention_coverage_v1(sid);
