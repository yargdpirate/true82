-- TRUE 82 v40 isolated same-browser retention stream.
-- SAFE / IDEMPOTENT: creates a separate table and indexes only.
-- It never ALTERs, UPDATEs, DELETEs, DROPs, copies, or rewrites `events` or
-- `analytics_events_v4`. Safe to run before or after the companion code deploy.

CREATE TABLE IF NOT EXISTS retention_events_v1 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  event_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  local_day TEXT NOT NULL,
  event_name TEXT NOT NULL,
  sid TEXT,
  run_id TEXT,
  build TEXT,
  mode TEXT,
  entry TEXT,
  source TEXT,
  daily_num INTEGER,
  official INTEGER,
  country TEXT,
  device TEXT,
  browser TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rev1_event_id
  ON retention_events_v1(event_id);
CREATE INDEX IF NOT EXISTS idx_rev1_visitor_day
  ON retention_events_v1(visitor_id, local_day);
CREATE INDEX IF NOT EXISTS idx_rev1_event_day
  ON retention_events_v1(event_name, local_day);
CREATE INDEX IF NOT EXISTS idx_rev1_mode_event_day
  ON retention_events_v1(mode, event_name, local_day);
CREATE INDEX IF NOT EXISTS idx_rev1_sid
  ON retention_events_v1(sid);
