CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  tag TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  title TEXT,
  frame TEXT,
  banner TEXT,
  created_ts INTEGER,
  last_seen_ts INTEGER
);

CREATE TABLE IF NOT EXISTS sid_links (
  sid TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  linked_ts INTEGER,
  PRIMARY KEY (sid, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sid_links_user ON sid_links(user_id);

CREATE TABLE IF NOT EXISTS local_claims (
  user_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  days INTEGER,
  streak INTEGER,
  ts INTEGER,
  PRIMARY KEY (user_id, kind)
);
