-- TRUE 82 cookieless analytics — D1 schema.
-- One wide, nullable event table. Each row is one behavioral event keyed to an
-- ephemeral in-memory session id (no cookie, no device storage). The server stamps ts,
-- derives a coarse device/country, and never stores the raw IP or User-Agent.
CREATE TABLE IF NOT EXISTS events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ts            INTEGER NOT NULL,   -- server epoch ms
  sid           TEXT    NOT NULL,   -- ephemeral session uuid (dies on tab close)
  name          TEXT    NOT NULL,   -- allowlisted event name
  mode          TEXT,               -- classic | pro | cap | kaman
  round         INTEGER,            -- round_advance: 1..5
  wins          INTEGER,            -- game_complete: 0..82
  net           REAL,               -- game_complete net rating
  undefeated    INTEGER,            -- 0/1
  budget_used   INTEGER,            -- cap mode: $ spent incl. rerolls
  roster_value  INTEGER,            -- cap mode: $ on the five players
  segment       TEXT,               -- heatcheck_result: COLD..SUPERNOVA
  variant       TEXT,               -- donate_click: which CTA message was shown
  pulled        INTEGER,            -- heatcheck_action: 0/1
  hit_82        INTEGER,            -- heatcheck_result: 0/1
  duration      INTEGER,            -- session_end: ms
  games_played  INTEGER,            -- session_end
  max_round     INTEGER,            -- session_end
  load_ms       INTEGER,            -- data_ready
  referrer      TEXT,               -- session_start
  device        TEXT,               -- mobile | tablet | desktop (server-derived)
  country       TEXT,               -- coarse, from Cloudflare
  viewport      TEXT                -- sm | md | lg
);
CREATE INDEX IF NOT EXISTS idx_events_name      ON events(name);
CREATE INDEX IF NOT EXISTS idx_events_sid       ON events(sid);
CREATE INDEX IF NOT EXISTS idx_events_ts        ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_name_mode ON events(name, mode);

-- Migration note: if you already ran this file once (the table already exists),
-- don't re-run the CREATE TABLE — just add the new column instead:
--   ALTER TABLE events ADD COLUMN variant TEXT;
