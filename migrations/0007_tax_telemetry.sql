-- TRUE 82 tax telemetry (v40)
-- Apply ONCE, after 0006_analytics_v3.sql, to the D1 database bound as DB.
-- Adds the Scoring Card to game_complete rows: every engine tax and the
-- spacing bonus, so the dashboard can watch the fences work on real humans
-- (fire rate + magnitude by mode/build) instead of trusting bench verdicts.
--
--   npx wrangler d1 execute YOUR_DB_NAME --remote --file=migrations/0007_tax_telemetry.sql

ALTER TABLE events ADD COLUMN t_usage REAL;
ALTER TABLE events ADD COLUMN t_spacing REAL;
ALTER TABLE events ADD COLUMN b_spacing REAL;
ALTER TABLE events ADD COLUMN t_backd REAL;
ALTER TABLE events ADD COLUMN t_wingd REAL;
ALTER TABLE events ADD COLUMN t_rim REAL;
ALTER TABLE events ADD COLUMN t_glass REAL;
ALTER TABLE events ADD COLUMN t_creator REAL;
ALTER TABLE events ADD COLUMN t_age REAL;
