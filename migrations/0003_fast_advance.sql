-- TRUE 82 — 0003: league pacing. The week clock moves to explicit columns so
-- fast-advance leagues can open a week the moment everyone's played
-- (league-core.advanceDecision is the single source of the law).
ALTER TABLE leagues ADD COLUMN week_opened_ts INTEGER;
ALTER TABLE leagues ADD COLUMN fast_advance INTEGER DEFAULT 0;
-- backfill any league started under 0002 (clock-derived weeks): week 1 opened
-- at start_ts; already-settled weeks advance it by the settled count.
UPDATE leagues SET week_opened_ts = start_ts + COALESCE(settled_through,0)*604800000
 WHERE week_opened_ts IS NULL AND start_ts IS NOT NULL;
