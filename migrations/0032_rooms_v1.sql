CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  host_user_id INTEGER NOT NULL,
  cls TEXT NOT NULL,
  diff TEXT NOT NULL,
  seats INTEGER NOT NULL DEFAULT 3,
  board TEXT NOT NULL,
  order_json TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'open',
  created_ts INTEGER,
  closes_ts INTEGER
);

CREATE INDEX IF NOT EXISTS idx_rooms_host ON rooms(host_user_id, created_ts DESC);

CREATE TABLE IF NOT EXISTS room_members (
  room_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  seat INTEGER NOT NULL,
  joined_ts INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_room_members_once ON room_members(room_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_room_members_seat ON room_members(room_id, seat);

CREATE TABLE IF NOT EXISTS room_moves (
  room_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  seat INTEGER NOT NULL,
  player TEXT NOT NULL,
  season INTEGER NOT NULL,
  slot TEXT NOT NULL,
  created_ts INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_room_moves_seq ON room_moves(room_id, seq);

CREATE INDEX IF NOT EXISTS idx_room_moves_read ON room_moves(room_id, seq);
