-- TRUE 82 analytics v3 (v39)
-- Apply ONCE to the same D1 database bound to Pages/Workers as DB.
-- This assumes analytics v2 / migration 0004 already added run_id, reason,
-- franchise, decade, player_spend, and reroll_spend.
--
-- Example:
--   npx wrangler d1 execute YOUR_DB_NAME --remote --file=migrations/0006_analytics_v3.sql

ALTER TABLE events ADD COLUMN build TEXT;
ALTER TABLE events ADD COLUMN page TEXT;
ALTER TABLE events ADD COLUMN entry TEXT;
ALTER TABLE events ADD COLUMN surface TEXT;
ALTER TABLE events ADD COLUMN action TEXT;
ALTER TABLE events ADD COLUMN outcome TEXT;
ALTER TABLE events ADD COLUMN source TEXT;
ALTER TABLE events ADD COLUMN host TEXT;
ALTER TABLE events ADD COLUMN challenge TEXT;
ALTER TABLE events ADD COLUMN daily_num INTEGER;
ALTER TABLE events ADD COLUMN ordinal INTEGER;
ALTER TABLE events ADD COLUMN slot TEXT;
ALTER TABLE events ADD COLUMN player TEXT;
ALTER TABLE events ADD COLUMN season INTEGER;
ALTER TABLE events ADD COLUMN amount REAL;
ALTER TABLE events ADD COLUMN value REAL;
ALTER TABLE events ADD COLUMN engaged_ms INTEGER;
ALTER TABLE events ADD COLUMN active_days INTEGER;
ALTER TABLE events ADD COLUMN streak INTEGER;
ALTER TABLE events ADD COLUMN days_since_last INTEGER;
ALTER TABLE events ADD COLUMN campaign_source TEXT;
ALTER TABLE events ADD COLUMN campaign_medium TEXT;
ALTER TABLE events ADD COLUMN campaign_name TEXT;
ALTER TABLE events ADD COLUMN campaign_content TEXT;
ALTER TABLE events ADD COLUMN nav_type TEXT;
ALTER TABLE events ADD COLUMN error_code TEXT;
ALTER TABLE events ADD COLUMN http_status INTEGER;
ALTER TABLE events ADD COLUMN detail TEXT;
ALTER TABLE events ADD COLUMN ttfb_ms INTEGER;
ALTER TABLE events ADD COLUMN lcp_ms INTEGER;
ALTER TABLE events ADD COLUMN cls REAL;
ALTER TABLE events ADD COLUMN inp_ms INTEGER;
ALTER TABLE events ADD COLUMN elapsed_ms INTEGER;
ALTER TABLE events ADD COLUMN official INTEGER;
ALTER TABLE events ADD COLUMN practice INTEGER;
ALTER TABLE events ADD COLUMN target_wins INTEGER;
ALTER TABLE events ADD COLUMN target_net REAL;
ALTER TABLE events ADD COLUMN result_delta INTEGER;
ALTER TABLE events ADD COLUMN visible_ms INTEGER;
ALTER TABLE events ADD COLUMN interaction_count INTEGER;
ALTER TABLE events ADD COLUMN search_count INTEGER;
ALTER TABLE events ADD COLUMN share_intents INTEGER;
ALTER TABLE events ADD COLUMN share_completions INTEGER;
ALTER TABLE events ADD COLUMN scroll_pct INTEGER;
ALTER TABLE events ADD COLUMN browser TEXT;
ALTER TABLE events ADD COLUMN os TEXT;
ALTER TABLE events ADD COLUMN language TEXT;
ALTER TABLE events ADD COLUMN local_hour INTEGER;
ALTER TABLE events ADD COLUMN connection TEXT;
ALTER TABLE events ADD COLUMN screen TEXT;

CREATE INDEX IF NOT EXISTS idx_events_name_ts ON events(name, ts);
CREATE INDEX IF NOT EXISTS idx_events_build_ts ON events(build, ts);
CREATE INDEX IF NOT EXISTS idx_events_run_id ON events(run_id);
CREATE INDEX IF NOT EXISTS idx_events_sid_ts ON events(sid, ts);
CREATE INDEX IF NOT EXISTS idx_events_run_name ON events(run_id, name);
CREATE INDEX IF NOT EXISTS idx_events_mode_name_ts ON events(mode, name, ts);
CREATE INDEX IF NOT EXISTS idx_events_variant_name_ts ON events(variant, name, ts);
CREATE INDEX IF NOT EXISTS idx_events_surface_name_ts ON events(surface, name, ts);
CREATE INDEX IF NOT EXISTS idx_events_entry_ts ON events(entry, ts);
CREATE INDEX IF NOT EXISTS idx_events_campaign_ts ON events(campaign_name, ts);
