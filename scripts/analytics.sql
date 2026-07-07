-- TRUE 82 — the commercial analytics pack (2026-07-06).
-- THE FINDING: capture already exists in two consent-free spines. The RUNS
-- table is the account-holder retention spine (user_id + created_ts on every
-- verified submission — real since the audit); the EVENTS table is the
-- anonymous engagement funnel (ephemeral sids by design — do NOT add user ids
-- there; that drags the product toward the consent bucket).
-- Run any of these via: wrangler d1 execute t82 --command "$(sed -n 'Xp' ...)"
-- or wire them into a keyed read-only /api/admin endpoint (see RUNBOOK).
-- Timestamps are ms; 86400000 = 1 day.

-- THE SURFACE LAW (use this cut everywhere): a "classic" run is three
-- different games depending on WHERE it happened. Derive surface as:
--   CASE WHEN official LIKE 'lg|%' THEN 'league'
--        WHEN official IS NOT NULL THEN 'daily'
--        WHEN week IS NOT NULL     THEN 'weekly'
--        ELSE 'casual' END
-- Pure mode difficulty = CASUAL ONLY. Dailies report separately (one shared
-- seed/day clusters variance). Weeklies/league analyze per challenge_id,
-- never pooled into mode stats. All submitted-run stats are SURVIVOR-BIASED
-- (stranded runs never submit); aggregate strand rate lives in events
-- (game_start vs game_complete), without challenge granularity.

-- 1) DAU / WAU (signed GMs who submitted at least one run)
SELECT date(created_ts/1000,'unixepoch') d, COUNT(DISTINCT user_id) dau
  FROM runs WHERE user_id IS NOT NULL GROUP BY d ORDER BY d DESC LIMIT 30;
SELECT strftime('%Y-W%W', created_ts/1000,'unixepoch') wk, COUNT(DISTINCT user_id) wau
  FROM runs WHERE user_id IS NOT NULL GROUP BY wk ORDER BY wk DESC LIMIT 12;

-- 2) RETENTION COHORTS — the number that decides if this is a business.
-- Users grouped by first-run week; share active again 1 / 2 / 4 weeks later.
WITH firsts AS (
  SELECT user_id, MIN(created_ts) f FROM runs WHERE user_id IS NOT NULL GROUP BY user_id
), act AS (SELECT DISTINCT user_id, created_ts FROM runs WHERE user_id IS NOT NULL)
SELECT strftime('%Y-W%W', f/1000,'unixepoch') cohort, COUNT(*) size,
  ROUND(100.0*SUM(EXISTS(SELECT 1 FROM act a WHERE a.user_id=firsts.user_id
    AND a.created_ts >= f+7*86400000  AND a.created_ts < f+14*86400000))/COUNT(*),1) AS w1_pct,
  ROUND(100.0*SUM(EXISTS(SELECT 1 FROM act a WHERE a.user_id=firsts.user_id
    AND a.created_ts >= f+14*86400000 AND a.created_ts < f+21*86400000))/COUNT(*),1) AS w2_pct,
  ROUND(100.0*SUM(EXISTS(SELECT 1 FROM act a WHERE a.user_id=firsts.user_id
    AND a.created_ts >= f+28*86400000 AND a.created_ts < f+35*86400000))/COUNT(*),1) AS w4_pct
FROM firsts GROUP BY cohort ORDER BY cohort DESC LIMIT 12;

-- 3) MODE-HOOK RETENTION — which mode's first-timers come back? (Your "esp
-- with new modes" question, answered per cohort-mode.)
WITH firsts AS (
  SELECT user_id, MIN(created_ts) f,
         (SELECT CASE WHEN r2.official LIKE 'lg|%' THEN 'league'
                      WHEN r2.official IS NOT NULL THEN 'daily'
                      WHEN r2.week IS NOT NULL THEN 'weekly' ELSE r2.mode END
            FROM runs r2 WHERE r2.user_id=runs.user_id ORDER BY r2.created_ts LIMIT 1) first_hook
  FROM runs WHERE user_id IS NOT NULL GROUP BY user_id)
SELECT first_hook, COUNT(*) users,
  ROUND(100.0*SUM(EXISTS(SELECT 1 FROM runs a WHERE a.user_id=firsts.user_id
    AND a.created_ts >= f+7*86400000))/COUNT(*),1) AS ever_returned_after_w1_pct
FROM firsts GROUP BY first_hook ORDER BY users DESC;

-- 4) HABIT DEPTH: runs per active user per week, by surface
SELECT strftime('%Y-W%W', created_ts/1000,'unixepoch') wk,
  ROUND(1.0*COUNT(*)/COUNT(DISTINCT user_id),2) runs_per_user,
  SUM(official IS NOT NULL AND official NOT LIKE 'lg|%') dailies,
  SUM(week IS NOT NULL) weeklies, SUM(official LIKE 'lg|%') league_runs,
  SUM(official IS NULL AND week IS NULL) casual
FROM runs WHERE user_id IS NOT NULL GROUP BY wk ORDER BY wk DESC LIMIT 12;

-- 5) WEEKLY-CHALLENGE HEALTH — which manifest entries actually drive play
SELECT week, challenge_id, COUNT(DISTINCT user_id) players, COUNT(*) attempts,
  ROUND(AVG(wins),1) avg_wins, MAX(wins) best
FROM runs WHERE week IS NOT NULL GROUP BY week, challenge_id ORDER BY week DESC;

-- 6) LEAGUE HEALTH — formation funnel + the no-show rate (retention's canary)
SELECT status, COUNT(*) leagues,
  ROUND(AVG((SELECT COUNT(*) FROM league_members m WHERE m.league_id=leagues.id)),1) avg_members
FROM leagues GROUP BY status;
SELECT ROUND(100.0*SUM(score_a IS NULL)+SUM(score_b IS NULL),0)/(2.0*COUNT(*)) AS noshow_pct,
  COUNT(*) matchups FROM league_results;

-- 7) DUEL VIRALITY — invites that landed
SELECT status, COUNT(*) FROM matches GROUP BY status;

-- 8) SIGN-IN FUNNEL PROXY — anonymous vs signed submissions per day
SELECT date(created_ts/1000,'unixepoch') d,
  SUM(user_id IS NULL) anon, SUM(user_id IS NOT NULL) signed
FROM runs GROUP BY d ORDER BY d DESC LIMIT 30;

-- 9) CHURN LIST — signed GMs quiet 14+ days (win-back candidates)
SELECT u.tag, u.display_name, date(MAX(r.created_ts)/1000,'unixepoch') last_run
FROM runs r JOIN users u ON u.id=r.user_id
GROUP BY r.user_id HAVING MAX(r.created_ts) < (strftime('%s','now')-14*86400)*1000
ORDER BY last_run;

-- 10) ANONYMOUS SESSION FUNNEL (events spine) — visits, plays, completion
SELECT date(ts/1000,'unixepoch') d,
  SUM(name='session_start') sessions, SUM(name='game_start') starts,
  SUM(name='game_complete') completes
FROM events GROUP BY d ORDER BY d DESC LIMIT 30;

-- 11) MODE DIFFICULTY BY PATCH — the version-fenced WR question, surfaced
SELECT core_version,
  CASE WHEN official LIKE 'lg|%' THEN 'league'
       WHEN official IS NOT NULL THEN 'daily'
       WHEN week IS NOT NULL     THEN 'weekly' ELSE 'casual' END AS surface,
  mode, COUNT(*) runs, ROUND(AVG(wins),2) avg_wins,
  ROUND(100.0*SUM(wins=82)/COUNT(*),2) immortal_pct
FROM runs WHERE verified=1
GROUP BY core_version, surface, mode ORDER BY core_version DESC, surface, mode;

-- 12) PATCH TIMELINE — every chart's fences: when each version lived
SELECT core_version, COUNT(*) runs,
  date(MIN(created_ts)/1000,'unixepoch') first_seen,
  date(MAX(created_ts)/1000,'unixepoch') last_seen
FROM runs GROUP BY core_version ORDER BY core_version;

-- 13) PICK POPULARITY — by person, cut by surface + patch (min-n guarded)
SELECT json_extract(p.value,'$[0]') AS player, r.core_version,
  CASE WHEN r.official LIKE 'lg|%' THEN 'league'
       WHEN r.official IS NOT NULL THEN 'daily'
       WHEN r.week IS NOT NULL     THEN 'weekly' ELSE 'casual' END AS surface,
  COUNT(*) picked, ROUND(AVG(r.wins),2) avg_wins_when_picked
FROM runs r, json_each(r.picks) p WHERE r.verified=1
GROUP BY player, r.core_version, surface
HAVING picked >= 10 ORDER BY picked DESC LIMIT 100;

-- 14) OVERTUNED DETECTOR — pick rate x win-delta vs the mode/version baseline.
-- Big positive delta at high pick rate = nerf candidate; observational, not
-- causal (good players pick good players) — treat as a WATCHLIST, not a verdict.
WITH base AS (
  SELECT mode, core_version, AVG(wins) mu, COUNT(*) n
  FROM runs WHERE verified=1 GROUP BY mode, core_version
), by_player AS (
  SELECT json_extract(p.value,'$[0]') player, r.mode, r.core_version,
    COUNT(*) picked, AVG(r.wins) w
  FROM runs r, json_each(r.picks) p WHERE r.verified=1
  GROUP BY player, r.mode, r.core_version
)
SELECT b.player, b.mode, b.core_version, b.picked,
  ROUND(100.0*b.picked/base.n,1) pick_rate_pct,
  ROUND(b.w-base.mu,2) win_delta
FROM by_player b JOIN base USING (mode, core_version)
WHERE b.picked >= 15 ORDER BY win_delta DESC LIMIT 50;

-- 15) SEASON-LEVEL VERSION OF #14 (name|year) + cap price paid — is the
-- board UNDERPRICING a specific season? High delta + low avg cost = repricing candidate.
WITH base AS (
  SELECT mode, core_version, AVG(wins) mu, COUNT(*) n
  FROM runs WHERE verified=1 AND mode='cap' GROUP BY mode, core_version
)
SELECT json_extract(p.value,'$[0]')||' '||json_extract(p.value,'$[1]') season,
  r.core_version, COUNT(*) picked,
  ROUND(AVG(json_extract(p.value,'$[3]')),1) avg_cost,
  ROUND(AVG(r.wins)-base.mu,2) win_delta
FROM runs r JOIN base ON base.mode=r.mode AND base.core_version=r.core_version,
  json_each(r.picks) p
WHERE r.verified=1 AND r.mode='cap'
GROUP BY season, r.core_version HAVING picked >= 10
ORDER BY win_delta DESC LIMIT 50;

-- Scale note for 13-15: json_each at query time is fine ad hoc for years at
-- this project's scale. If it ever drags (100k+ runs), materialize a
-- run_picks table via one backfill INSERT...SELECT — an optimization for
-- later, never a reason to collect differently now.

-- ═══════════ PLAYER META & DIVERSITY (the balance-designer's board) ═══════════
-- Denominator note: "never drafted" needs the full player universe, which
-- lives in site_data.json, not D1. As of 2026-07-06 the dataset holds the
-- number printed by:  node -e "const T=require('./sim-core.js');T.initData(
-- JSON.parse(require('fs').readFileSync('site_data.json','utf8')));
-- console.log(T.t.BEST_BY_NAME.size)"
-- distinct_picked (#18) divided by that = your draft-coverage %.

-- 16) THE MANDATORY-GROUP DETECTOR — is there a set of K players where you
-- basically must own one to go 82-0? Reports the top-K immortal cores AND
-- the share of ALL immortal runs containing at least one of them.
-- Tune K by editing LIMIT 5. >80% coverage at small K = monoculture; the
-- meta has a required ingredient and diversity levers should aim at it.
WITH imm AS (SELECT id, mode, core_version, picks FROM runs WHERE verified=1 AND wins=82),
topk AS (
  SELECT json_extract(p.value,'$[0]') player, COUNT(*) n
  FROM imm, json_each(imm.picks) p
  GROUP BY player ORDER BY n DESC LIMIT 5
)
SELECT (SELECT COUNT(*) FROM imm) immortal_runs,
  (SELECT GROUP_CONCAT(player || ' (' || n || ')') FROM topk) top_k,
  ROUND(100.0 * (SELECT COUNT(*) FROM imm WHERE EXISTS (
    SELECT 1 FROM json_each(imm.picks) p
    WHERE json_extract(p.value,'$[0]') IN (SELECT player FROM topk)
  )) / MAX(1,(SELECT COUNT(*) FROM imm)), 1) pct_immortals_containing_topk;

-- 16b) same detector, per mode x patch (cap pricing SHOULD hold this lower
-- than classic — if it doesn't, the pricing curve isn't doing its job)
WITH imm AS (SELECT id, mode, core_version, picks FROM runs WHERE verified=1 AND wins=82),
topk AS (
  SELECT mode, core_version, json_extract(p.value,'$[0]') player,
    COUNT(*) n, ROW_NUMBER() OVER (PARTITION BY mode, core_version ORDER BY COUNT(*) DESC) rk
  FROM imm, json_each(imm.picks) p GROUP BY mode, core_version, player
)
SELECT i.mode, i.core_version, COUNT(*) immortals,
  ROUND(100.0*SUM(EXISTS(SELECT 1 FROM json_each(i.picks) p
    WHERE json_extract(p.value,'$[0]') IN
      (SELECT player FROM topk t WHERE t.mode=i.mode AND t.core_version=i.core_version AND t.rk<=5)
  ))/COUNT(*),1) pct_with_top5
FROM imm i GROUP BY i.mode, i.core_version ORDER BY i.core_version DESC, i.mode;

-- 17) THE SADNESS INDEX — "basically never makes it": drafted plenty, never
-- pays off. High picks + zero immortal share + negative win delta = either a
-- trap price, a bad stat line the engine hates, or a beloved name the numbers
-- don't back. These are your BUFF/reprice candidates (and Tribune material).
WITH base AS (SELECT mode, core_version, AVG(wins) mu FROM runs WHERE verified=1 GROUP BY mode, core_version),
per AS (
  SELECT json_extract(p.value,'$[0]') player, r.mode, r.core_version,
    COUNT(*) picked, AVG(r.wins) w,
    SUM(r.wins=82) immortal_appearances
  FROM runs r, json_each(r.picks) p WHERE r.verified=1
  GROUP BY player, r.mode, r.core_version
)
SELECT per.player, per.mode, per.core_version, per.picked,
  per.immortal_appearances,
  ROUND(100.0*per.immortal_appearances/per.picked,2) immortal_rate_pct,
  ROUND(per.w - base.mu, 2) win_delta
FROM per JOIN base USING (mode, core_version)
WHERE per.picked >= 15
ORDER BY immortal_rate_pct ASC, win_delta ASC LIMIT 50;

-- 18) CONCENTRATION / LONG TAIL — how much of the game flows through how few
-- names. Reports distinct players ever drafted (divide by the dataset
-- denominator above for coverage %) and the pick share of the top 20 / 100.
WITH pc AS (
  SELECT json_extract(p.value,'$[0]') player, COUNT(*) n
  FROM runs r, json_each(r.picks) p WHERE r.verified=1 GROUP BY player
), tot AS (SELECT SUM(n) t, COUNT(*) distinct_players FROM pc)
SELECT tot.distinct_players, tot.t total_picks,
  ROUND(100.0*(SELECT SUM(n) FROM (SELECT n FROM pc ORDER BY n DESC LIMIT 20))/tot.t,1)  top20_pick_share_pct,
  ROUND(100.0*(SELECT SUM(n) FROM (SELECT n FROM pc ORDER BY n DESC LIMIT 100))/tot.t,1) top100_pick_share_pct
FROM tot;

-- 19) DIVERSITY BY SURFACE — does the weekly manifest actually widen the
-- meta? Distinct players per 1,000 picks; weeklies should CRUSH casual here.
-- If they don't, the challenge filters aren't biting.
SELECT
  CASE WHEN r.official LIKE 'lg|%' THEN 'league'
       WHEN r.official IS NOT NULL THEN 'daily'
       WHEN r.week IS NOT NULL     THEN 'weekly' ELSE 'casual' END surface,
  COUNT(*) picks, COUNT(DISTINCT json_extract(p.value,'$[0]')) distinct_players,
  ROUND(1000.0*COUNT(DISTINCT json_extract(p.value,'$[0]'))/COUNT(*),1) distinct_per_1k_picks
FROM runs r, json_each(r.picks) p WHERE r.verified=1
GROUP BY surface ORDER BY distinct_per_1k_picks DESC;

-- 20) DECADE SHARE BY PATCH — is one era eating the game? Watch drift across
-- versions; a decade creeping past ~35% of casual picks is a lever moment.
SELECT r.core_version,
  (json_extract(p.value,'$[1]')/10)*10 decade,
  COUNT(*) picks,
  ROUND(100.0*COUNT(*)/SUM(COUNT(*)) OVER (PARTITION BY r.core_version),1) share_pct
FROM runs r, json_each(r.picks) p
WHERE r.verified=1 AND r.official IS NULL AND r.week IS NULL   -- casual = the unforced meta
GROUP BY r.core_version, decade ORDER BY r.core_version DESC, share_pct DESC;

-- 21) CRUTCH PAIRS — duos that co-occur in immortal runs (the formula-lineup
-- detector). Pairwise self-join: fine ad hoc on immortals only; don't point
-- it at all runs once you're big.
WITH imm AS (SELECT id, picks FROM runs WHERE verified=1 AND wins=82)
SELECT json_extract(a.value,'$[0]') p1, json_extract(b.value,'$[0]') p2, COUNT(*) together
FROM imm, json_each(imm.picks) a, json_each(imm.picks) b
WHERE json_extract(a.value,'$[0]') < json_extract(b.value,'$[0]')
GROUP BY p1, p2 HAVING together >= 5
ORDER BY together DESC LIMIT 25;
