// GET /avocado — private, no-store analytics viewer for TRUE 82.
// Reads anonymous first-party event aggregates from D1. DASH_KEY remains the gate.
// Ordinary event analytics remains session-scoped. The isolated retention stream
// uses a random first-party browser id so Avocado can measure forward-only,
// same-browser day-level cohorts without accounts, fingerprints, or third parties.

const TRACKED_MODES = ["classic", "pro", "cap"];
const ALL_MODES = ["classic", "pro", "cap", "kaman"];
const MODE_LABEL = { classic: "Classic", pro: "Pro", cap: "Presti", kaman: "Kaman", daily: "The Daily" };
const V3_REQUIRED = [
  "build", "page", "entry", "surface", "action", "outcome", "source", "host", "challenge",
  "daily_num", "ordinal", "slot", "player", "season", "amount", "value", "engaged_ms",
  "active_days", "streak", "days_since_last", "campaign_source", "campaign_medium",
  "campaign_name", "campaign_content", "nav_type", "error_code", "http_status", "detail",
  "ttfb_ms", "lcp_ms", "cls", "inp_ms", "elapsed_ms", "official", "practice",
  "target_wins", "target_net", "result_delta", "visible_ms", "interaction_count",
  "search_count", "share_intents", "share_completions", "scroll_pct", "browser", "os",
  "language", "local_hour", "connection", "screen"
];

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") return new Response("method", { status: 405 });
  const url = new URL(request.url);
  if (env.DASH_KEY && url.searchParams.get("k") !== env.DASH_KEY) return new Response("not found", { status: 404 });
  if (!env.DB) {
    return html(page("TRUE 82 · analytics",
      `<div class="card"><p class="muted">No D1 binding found. Bind the analytics database as <code>DB</code>.</p></div>`));
  }

  const queryErrors = [];
  let querySeq = 0;
  // Cloudflare D1 permits only a small number of simultaneous statements per
  // Worker invocation. Avocado has many independent cards, so cap the fan-out
  // rather than letting Promise.all open every query at once.
  const withDbSlot = queryLimiter(5);
  const q = (sql, binds = [], label = "") => {
    const queryId = label || `q${String(++querySeq).padStart(2, "0")}`;
    return withDbSlot(async () => {
    try {
      let stmt = env.DB.prepare(sql);
      if (binds.length) stmt = stmt.bind(...binds);
      const r = await stmt.all();
      return r.results || [];
    } catch (e) {
      queryErrors.push(queryFailure(queryId, e, sql));
      return [];
    }
    });
  };
  const one = (sql, binds = [], label = "") => {
    const queryId = label || `q${String(++querySeq).padStart(2, "0")}`;
    return withDbSlot(async () => {
    try {
      let stmt = env.DB.prepare(sql);
      if (binds.length) stmt = stmt.bind(...binds);
      return await stmt.first();
    } catch (e) {
      queryErrors.push(queryFailure(queryId, e, sql));
      return null;
    }
    });
  };

  const schema = await q(`PRAGMA table_info(events)`);
  const cols = new Set(schema.map((r) => r.name));
  const hasV2 = ["run_id", "reason", "franchise", "decade", "player_spend", "reroll_spend"].every((c) => cols.has(c));
  const hasV3 = V3_REQUIRED.every((c) => cols.has(c));
  const V40_REQUIRED = ["t_usage", "t_spacing", "b_spacing", "t_backd", "t_wingd", "t_rim", "t_glass", "t_creator", "t_age"];
  const hasV40 = V40_REQUIRED.every((c) => cols.has(c));
  const recapSchema = await q(`PRAGMA table_info(recaps)`);
  const hasRecaps = recapSchema.length > 0;
  const retentionSchema = await q(`PRAGMA table_info(retention_events_v1)`, [], "retention_schema");
  const coverageSchema = await q(`PRAGMA table_info(retention_coverage_v1)`, [], "retention_coverage_schema");
  const hasRetention = retentionSchema.length > 0;
  const hasRetentionCoverage = coverageSchema.length > 0;

  const scope = dateScope(url);
  const dateW = scope.all ? "1=1" : "ts>=? AND ts<?";
  const dateB = scope.all ? [] : [scope.start, scope.end];
  const requestedBuild = hasV3 ? cleanBuild(url.searchParams.get("build")) : "";
  const W = dateW + (requestedBuild ? " AND build=?" : "");
  const B = dateB.concat(requestedBuild ? [requestedBuild] : []);
  const modesSql = "('classic','pro','cap')";

  // v40 CURVES API: machine-readable win histograms for the balance bench,
  // so the tether reads the live game instead of hand-transcribed
  // screenshots. Same date/build scoping as the cards; JSON out.
  if (url.searchParams.get("api") === "curves") {
    const rows = await q(
      `SELECT mode, wins, COUNT(*) c FROM events
       WHERE ${W} AND name='game_complete' AND wins IS NOT NULL
         AND mode IN ('classic','pro','cap')
         AND (practice IS NULL OR practice=0)
       GROUP BY mode, wins`, B);
    const modes = {};
    for (const r of rows) {
      const m = String(r.mode), w = String(r.wins);
      (modes[m] = modes[m] || {})[w] = +r.c || 0;
    }
    return new Response(JSON.stringify({
      generated: new Date().toISOString(),
      scope: scope.all ? "all-time" : { start: scope.start, end: scope.end },
      build: requestedBuild || "all",
      practice_excluded: true,
      modes
    }), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
  }
  const allModesSql = "('classic','pro','cap','kaman')";
  const now = Date.now();

  const funnelSql = hasV2
    ? `SELECT mode,
         SUM(CASE WHEN name='game_start' THEN 1 ELSE 0 END) starts,
         COUNT(DISTINCT CASE WHEN name='game_start' THEN sid END) visits,
         SUM(CASE WHEN name='game_complete' THEN 1 ELSE 0 END) finishes,
         COUNT(DISTINCT CASE WHEN name='game_complete' THEN sid END) finish_visits,
         SUM(CASE WHEN name='run_abandon' AND reason='start_over' THEN 1 ELSE 0 END) startovers,
         SUM(CASE WHEN name='run_abandon' AND reason='page_exit' THEN 1 ELSE 0 END) exits
       FROM events WHERE ${W} AND mode IN ${modesSql}
         AND name IN ('game_start','game_complete','run_abandon') GROUP BY mode`
    : `SELECT mode,
         SUM(CASE WHEN name='game_start' THEN 1 ELSE 0 END) starts,
         COUNT(DISTINCT CASE WHEN name='game_start' THEN sid END) visits,
         SUM(CASE WHEN name='game_complete' THEN 1 ELSE 0 END) finishes,
         COUNT(DISTINCT CASE WHEN name='game_complete' THEN sid END) finish_visits,
         0 startovers, 0 exits
       FROM events WHERE ${W} AND mode IN ${modesSql}
         AND name IN ('game_start','game_complete') GROUP BY mode`;

  const sessionSql = `WITH scoped AS (SELECT * FROM events WHERE ${W}),
    ends AS (
      SELECT sid, MAX(duration) duration, ${hasV3 ? "MAX(engaged_ms)" : "NULL"} engaged_ms, MAX(max_round) max_round,
             ${hasV3 ? "MAX(interaction_count)" : "NULL"} interactions, ${hasV3 ? "MAX(scroll_pct)" : "NULL"} scroll_pct
      FROM scoped WHERE name='session_end' GROUP BY sid
    ), starts AS (
      SELECT sid, COUNT(*) games FROM scoped
      WHERE name='game_start' AND mode IN ${modesSql} GROUP BY sid
    )
    SELECT ends.sid, ends.duration, ends.engaged_ms, ends.max_round, ends.interactions, ends.scroll_pct, starts.games
    FROM ends JOIN starts USING(sid)`;

  const corrSql = `WITH scoped AS (SELECT * FROM events WHERE ${W}),
    starts AS (
      SELECT sid, COUNT(*) games FROM scoped
      WHERE name='game_start' AND mode IN ${modesSql} GROUP BY sid
    ), wins AS (
      SELECT sid, AVG(wins) avg_wins FROM scoped
      WHERE name='game_complete' AND mode IN ${modesSql} AND wins IS NOT NULL GROUP BY sid
    )
    SELECT starts.sid, starts.games, wins.avg_wins FROM starts JOIN wins USING(sid)`;

  const corePromise = Promise.all([
    q(`SELECT mode, wins, COUNT(*) c, SUM(COALESCE(undefeated,0)) u
       FROM events WHERE ${W} AND name='game_complete' AND mode IN ${modesSql}
       GROUP BY mode,wins ORDER BY mode,wins`, B),
    q(`SELECT mode, COUNT(*) c FROM events WHERE ${W} AND name='heatcheck_result'
       AND hit_82=1 AND mode IN ${modesSql} GROUP BY mode`, B),
    q(`SELECT COALESCE(mode,'?') mode, COUNT(*) c FROM events
       WHERE ${W} AND name='game_start' GROUP BY mode ORDER BY c DESC`, B),
    q(funnelSql, B),
    q(`SELECT mode, round, COUNT(*) c FROM events WHERE ${W}
       AND name='round_advance' AND mode IN ${modesSql} GROUP BY mode,round ORDER BY mode,round`, B),
    q(`SELECT pulled, COUNT(*) c FROM events WHERE ${W} AND name='heatcheck_action'
       AND mode IN ${modesSql} GROUP BY pulled`, B),
    q(`SELECT COALESCE(segment,'?') segment, COUNT(*) c, SUM(COALESCE(hit_82,0)) h
       FROM events WHERE ${W} AND name='heatcheck_result' AND mode IN ${modesSql}
       GROUP BY segment ORDER BY c DESC`, B),
    q(sessionSql, B),
    q(corrSql, B),
    q(`SELECT name, COALESCE(variant,'?') variant, COALESCE(segment,'?') segment, COUNT(*) c FROM events WHERE ${W}
       AND name IN ('recap_presented','recap_unwrap','recap_full_read','recap_action','recap_skip','recap_read','recap_shown')
       AND (mode IS NULL OR mode IN ${allModesSql}) GROUP BY name,variant,segment`, B),
    q(`SELECT COALESCE(mode,'?') base,
         SUM(CASE WHEN variant LIKE 'daily%' THEN 1 ELSE 0 END) daily,
         SUM(CASE WHEN variant IS NULL OR variant NOT LIKE 'daily%' THEN 1 ELSE 0 END) standalone
       FROM events WHERE ${W} AND name='game_start' AND mode IN ${modesSql}
       GROUP BY mode`, B),
    one(`SELECT COUNT(*) c FROM events WHERE ${W} AND name='session_start'`, B),
    one(`SELECT COUNT(*) c FROM events WHERE ${W} AND name='game_start'`, B),
    one(`SELECT COUNT(*) c FROM events WHERE ${W} AND name='game_start' AND mode IN ${modesSql}`, B),
    one(`SELECT COUNT(DISTINCT sid) c FROM events WHERE ${W} AND name='game_start' AND mode IN ${modesSql}`, B),
    one(`SELECT COUNT(*) c FROM events WHERE ${W} AND name='game_complete' AND mode IN ${modesSql}`, B),
    one(`SELECT COUNT(*) c FROM events WHERE ${W} AND name='heatcheck_shown' AND mode IN ${modesSql}`, B),
    one(`SELECT COUNT(*) c FROM events WHERE ${W} AND name='data_error'`, B),
    one(`SELECT ROUND(AVG(load_ms)) ms FROM events WHERE ${W} AND name='data_ready'`, B)
  ]);

  const v2Promise = hasV2 ? Promise.all([
    q(`SELECT name, reason, player_spend, reroll_spend FROM events WHERE ${W}
       AND mode='cap' AND name IN ('game_complete','run_abandon')
       AND player_spend IS NOT NULL AND reroll_spend IS NOT NULL`, B),
    q(`SELECT mode, franchise, decade, COUNT(*) c FROM events WHERE ${W}
       AND name IN ('round_advance','deal_view') AND mode IN ${modesSql}
       AND franchise IS NOT NULL AND decade IS NOT NULL
       GROUP BY mode,franchise,decade`, B),
    q(`SELECT mode, franchise, decade, COUNT(*) c FROM events WHERE ${W}
       AND name='run_abandon' AND reason='start_over' AND mode IN ${modesSql}
       AND franchise IS NOT NULL AND decade IS NOT NULL
       GROUP BY mode,franchise,decade`, B)
  ]) : Promise.resolve([[], [], []]);

  const v3Promise = hasV3 ? Promise.all([
    // Live ingestion pulse is intentionally global rather than range/build scoped.
    q(`SELECT name, MAX(ts) last_seen,
         SUM(CASE WHEN ts>=? THEN 1 ELSE 0 END) c1h,
         SUM(CASE WHEN ts>=? THEN 1 ELSE 0 END) c24h
       FROM events WHERE name IN ('session_start','home_view','data_ready','data_error','game_start','game_complete','share_click','share_result','perf_summary','client_error')
       GROUP BY name`, [now - 3600000, now - 86400000]),
    q(`SELECT COALESCE(NULLIF(build,''),'pre-v39 / unknown') build, COUNT(*) c,
         COUNT(DISTINCT sid) visits, MAX(ts) last_seen
       FROM events WHERE ${dateW} GROUP BY COALESCE(NULLIF(build,''),'pre-v39 / unknown') ORDER BY c DESC`, dateB),
    q(`WITH scoped AS (SELECT * FROM events WHERE ${W}),
       sessions AS (
         SELECT sid,
           COALESCE(MAX(NULLIF(entry,'')),'unknown') entry,
           COALESCE(MAX(NULLIF(page,'')),'unknown') page,
           COALESCE(MAX(NULLIF(campaign_source,'')),'') campaign_source,
           COALESCE(MAX(NULLIF(campaign_medium,'')),'') campaign_medium,
           COALESCE(MAX(NULLIF(campaign_name,'')),'') campaign_name,
           COALESCE(MAX(NULLIF(campaign_content,'')),'') campaign_content
         FROM scoped WHERE name='session_start' GROUP BY sid
       ), flags AS (
         SELECT sid,
           MAX(CASE WHEN name='game_start' THEN 1 ELSE 0 END) started,
           MAX(CASE WHEN name='game_complete' THEN 1 ELSE 0 END) finished,
           MAX(CASE WHEN name='share_click' THEN 1 ELSE 0 END) intended,
           MAX(CASE
             WHEN name='share_result' AND outcome='success' THEN 1
             WHEN (build IS NULL OR build='') AND name='share' THEN 1
             ELSE 0 END) shared
         FROM scoped GROUP BY sid
       )
       SELECT sessions.entry bucket, COUNT(*) visits,
         SUM(COALESCE(flags.started,0)) starters, SUM(COALESCE(flags.finished,0)) finishers,
         SUM(COALESCE(flags.intended,0)) intents, SUM(COALESCE(flags.shared,0)) sharers
       FROM sessions LEFT JOIN flags USING(sid)
       GROUP BY sessions.entry ORDER BY visits DESC`, B),
    q(`WITH scoped AS (SELECT * FROM events WHERE ${W}),
       sessions AS (
         SELECT sid,
           COALESCE(MAX(NULLIF(campaign_source,'')),'') cs,
           COALESCE(MAX(NULLIF(campaign_medium,'')),'') cm,
           COALESCE(MAX(NULLIF(campaign_name,'')),'') cn,
           COALESCE(MAX(NULLIF(campaign_content,'')),'') cc
         FROM scoped WHERE name='session_start' GROUP BY sid
       ), flags AS (
         SELECT sid, MAX(CASE WHEN name='game_start' THEN 1 ELSE 0 END) started,
           MAX(CASE WHEN name='game_complete' THEN 1 ELSE 0 END) finished
         FROM scoped GROUP BY sid
       )
       SELECT cs,cm,cn,cc,COUNT(*) visits,SUM(COALESCE(started,0)) starters,SUM(COALESCE(finished,0)) finishers
       FROM sessions LEFT JOIN flags USING(sid)
       WHERE cs<>'' OR cm<>'' OR cn<>'' OR cc<>''
       GROUP BY cs,cm,cn,cc ORDER BY visits DESC LIMIT 20`, B),
    q(`WITH scoped AS (SELECT * FROM events WHERE ${W}),
       sessions AS (
         SELECT sid, COALESCE(MAX(NULLIF(page,'')),'unknown') page
         FROM scoped WHERE name='session_start' GROUP BY sid
       ), flags AS (
         SELECT sid, MAX(CASE WHEN name='game_start' THEN 1 ELSE 0 END) started,
           MAX(CASE WHEN name='game_complete' THEN 1 ELSE 0 END) finished,
           MAX(CASE WHEN name='link_out' THEN 1 ELSE 0 END) linked
         FROM scoped GROUP BY sid
       )
       SELECT page,COUNT(*) visits,SUM(COALESCE(started,0)) starters,SUM(COALESCE(finished,0)) finishers,SUM(COALESCE(linked,0)) linked
       FROM sessions LEFT JOIN flags USING(sid) GROUP BY page ORDER BY visits DESC`, B),
    q(`WITH x AS (
       SELECT sid,name,mode,action,variant,run_id,
         CASE
           WHEN name IN ('mode_impression','mode_select') AND action LIKE 'daily%' THEN 'daily'
           WHEN name IN ('game_start','game_complete') AND variant LIKE 'daily%' THEN 'daily'
           WHEN mode='cap' THEN 'cap'
           WHEN mode='classic' THEN 'classic'
           WHEN mode='pro' THEN 'pro'
           WHEN mode='kaman' THEN 'kaman'
           ELSE NULL END bucket
       FROM events WHERE ${W} AND name IN ('mode_impression','mode_select','game_start','game_complete')
       )
       SELECT bucket,
         SUM(CASE WHEN name='mode_impression' THEN 1 ELSE 0 END) impressions,
         COUNT(DISTINCT CASE WHEN name='mode_impression' THEN sid END) impression_people,
         SUM(CASE WHEN name='mode_select' THEN 1 ELSE 0 END) selections,
         COUNT(DISTINCT CASE WHEN name='mode_select' THEN sid END) select_people,
         SUM(CASE WHEN name='game_start' THEN 1 ELSE 0 END) starts,
         COUNT(DISTINCT CASE WHEN name='game_start' THEN sid END) start_people,
         SUM(CASE WHEN name='game_complete' THEN 1 ELSE 0 END) finishes
       FROM x WHERE bucket IS NOT NULL GROUP BY bucket ORDER BY starts DESC`, B),
    q(`WITH scoped AS (
         SELECT * FROM events WHERE ${W} AND (
           variant LIKE 'daily%' OR name LIKE 'daily_gate%' OR (name='referral_open' AND action='daily_link')
         )
       ),
       gate AS (SELECT DISTINCT sid FROM scoped WHERE name='daily_gate_view'),
       gate_start AS (SELECT DISTINCT sid FROM scoped WHERE name='daily_gate_start'),
       official_start AS (
         SELECT DISTINCT sid FROM scoped WHERE name='game_start' AND variant LIKE 'daily%'
           AND COALESCE(practice,CASE WHEN variant LIKE 'daily-practice:%' THEN 1 ELSE 0 END)=0
       ),
       official_done AS (
         SELECT DISTINCT sid FROM scoped WHERE name='game_complete' AND variant LIKE 'daily%'
           AND COALESCE(practice,CASE WHEN variant LIKE 'daily-practice:%' THEN 1 ELSE 0 END)=0
       ),
       intent AS (SELECT DISTINCT sid FROM scoped WHERE name='share_click' AND variant LIKE 'daily%'),
       shared AS (
         SELECT DISTINCT sid FROM scoped
         WHERE variant LIKE 'daily%' AND (
           (name='share_result' AND outcome='success') OR
           ((build IS NULL OR build='') AND name='share')
         )
       )
       SELECT
         (SELECT COUNT(*) FROM scoped WHERE name='daily_gate_view') gate_events,
         (SELECT COUNT(*) FROM gate) gate_people,
         (SELECT COUNT(*) FROM scoped WHERE name='daily_gate_start') gate_start_events,
         (SELECT COUNT(*) FROM gate_start) gate_start_people,
         (SELECT COUNT(*) FROM scoped WHERE name='game_start' AND variant LIKE 'daily%' AND COALESCE(practice,CASE WHEN variant LIKE 'daily-practice:%' THEN 1 ELSE 0 END)=0) start_events,
         (SELECT COUNT(*) FROM official_start) start_people,
         (SELECT COUNT(*) FROM official_start s JOIN gate g USING(sid)) matched_start_people,
         (SELECT COUNT(*) FROM official_start s LEFT JOIN gate g USING(sid) WHERE g.sid IS NULL) unanchored_start_people,
         (SELECT COUNT(*) FROM scoped WHERE name='game_complete' AND variant LIKE 'daily%' AND COALESCE(practice,CASE WHEN variant LIKE 'daily-practice:%' THEN 1 ELSE 0 END)=0) done_events,
         (SELECT COUNT(*) FROM official_done) done_people,
         (SELECT COUNT(*) FROM official_done d JOIN gate g USING(sid)) matched_done_people,
         (SELECT COUNT(*) FROM scoped WHERE name='game_start' AND variant LIKE 'daily%' AND COALESCE(practice,CASE WHEN variant LIKE 'daily-practice:%' THEN 1 ELSE 0 END)=1) practice_start_events,
         (SELECT COUNT(DISTINCT sid) FROM scoped WHERE name='game_start' AND variant LIKE 'daily%' AND COALESCE(practice,CASE WHEN variant LIKE 'daily-practice:%' THEN 1 ELSE 0 END)=1) practice_start_people,
         (SELECT COUNT(*) FROM scoped WHERE name='game_complete' AND variant LIKE 'daily%' AND COALESCE(practice,CASE WHEN variant LIKE 'daily-practice:%' THEN 1 ELSE 0 END)=1) practice_done_events,
         (SELECT COUNT(DISTINCT sid) FROM scoped WHERE name='game_complete' AND variant LIKE 'daily%' AND COALESCE(practice,CASE WHEN variant LIKE 'daily-practice:%' THEN 1 ELSE 0 END)=1) practice_done_people,
         (SELECT COUNT(*) FROM scoped WHERE name='share_click' AND variant LIKE 'daily%') intent_events,
         (SELECT COUNT(*) FROM intent) intent_people,
         (SELECT COUNT(*) FROM intent i JOIN gate g USING(sid)) matched_intent_people,
         (SELECT COUNT(*) FROM scoped WHERE variant LIKE 'daily%' AND (
           (name='share_result' AND outcome='success') OR
           ((build IS NULL OR build='') AND name='share')
         )) share_events,
         (SELECT COUNT(*) FROM shared) share_people,
         (SELECT COUNT(*) FROM shared s JOIN gate g USING(sid)) matched_share_people`, B),
    q(`WITH scoped AS (SELECT * FROM events WHERE ${W}), steps AS (
       SELECT sid,
         CASE
           WHEN name='referral_open' AND action='daily_link' AND outcome='current' THEN 'link_open_current'
           WHEN name='referral_open' AND action='daily_link' AND outcome='stale' THEN 'link_open_stale'
           WHEN name='daily_gate_view' AND variant LIKE 'daily-link:%' THEN 'gate_seen'
           WHEN name='daily_gate_start' AND variant LIKE 'daily-link:%' THEN 'gate_started'
           WHEN name='game_start' AND variant LIKE 'daily-link:%' THEN 'game_started'
           WHEN name='game_complete' AND variant LIKE 'daily-link:%' THEN 'game_finished'
           WHEN name='results_view' AND variant LIKE 'daily-link:%' AND outcome='beat' THEN 'beat_sender'
           WHEN name='results_view' AND variant LIKE 'daily-link:%' AND outcome='tie' THEN 'tied_sender'
           WHEN name='results_view' AND variant LIKE 'daily-link:%' AND outcome='lost' THEN 'lost_to_sender'
           WHEN name='share_click' AND variant LIKE 'daily-link:%' THEN 'reshare_intent'
           WHEN name='share_result' AND outcome='success' AND variant LIKE 'daily-link:%' THEN 'reshared'
           WHEN (build IS NULL OR build='') AND name='share' AND variant LIKE 'daily-link:%' THEN 'reshared'
           ELSE NULL END step
       FROM scoped WHERE (name='referral_open' AND action='daily_link') OR variant LIKE 'daily-link:%'
       )
       SELECT step,COUNT(*) c,COUNT(DISTINCT sid) people FROM steps WHERE step IS NOT NULL GROUP BY step`, B),
    q(`WITH scoped AS (
         SELECT sid,ts,outcome,active_days,streak,days_since_last
         FROM events WHERE ${W} AND name='return_profile'
       ), latest AS (
         SELECT sid,MAX(ts) ts FROM scoped GROUP BY sid
       )
       SELECT s.outcome,s.active_days,s.streak,s.days_since_last,COUNT(*) c
       FROM scoped s JOIN latest l ON l.sid=s.sid AND l.ts=s.ts
       GROUP BY s.outcome,s.active_days,s.streak,s.days_since_last`, B),
    q(`SELECT name,COALESCE(NULLIF(action,''),'—') action,COALESCE(NULLIF(outcome,''),'—') outcome,
         COUNT(*) c,COUNT(DISTINCT run_id) runs
       FROM events WHERE ${W} AND name IN ('player_select','draft_pick','pick_denied','search_use','sort_change','year_change','lineup_change','reroll','round_advance')
       GROUP BY name,action,outcome ORDER BY c DESC`, B),
    q(`SELECT player,season,mode,slot,COUNT(*) c
       FROM events WHERE ${W} AND name='draft_pick' AND player IS NOT NULL
       GROUP BY player,season,mode,slot ORDER BY c DESC LIMIT 20`, B),
    q(`SELECT COALESCE(NULLIF(action,''),'unknown') action,COUNT(*) c,COUNT(DISTINCT run_id) runs
       FROM events WHERE ${W} AND name='pick_denied' GROUP BY action ORDER BY c DESC LIMIT 16`, B),
    q(`SELECT COALESCE(NULLIF(action,''),'unknown') action,COALESCE(NULLIF(outcome,''),'unknown') outcome,
         COUNT(*) c,SUM(COALESCE(amount,0)) spend,COUNT(DISTINCT run_id) runs
       FROM events WHERE ${W} AND name='reroll' GROUP BY action,outcome ORDER BY c DESC`, B),
    q(`SELECT name,COALESCE(NULLIF(action,''),'unknown') action,COALESCE(NULLIF(outcome,''),'unknown') outcome,
         COUNT(*) c,COUNT(DISTINCT run_id) runs,COUNT(DISTINCT sid) people
       FROM events WHERE ${W} AND name IN ('results_view','result_section_view','replay','percentile_result','percentile_error')
       GROUP BY name,action,outcome ORDER BY c DESC`, B),
    q(`WITH share_events AS (
         SELECT CASE
             WHEN name='share_click' THEN 'share_click'
             WHEN name='share_result' AND outcome='success' THEN 'share_complete'
             WHEN (build IS NULL OR build='') AND name='share' THEN 'share_complete'
             WHEN name='share_result' THEN 'share_result'
             ELSE name END event_name,
           COALESCE(NULLIF(outcome,''),'unknown') outcome,
           COALESCE(NULLIF(action,''),'unknown') action,
           COALESCE(NULLIF(surface,''),'unknown') surface,
           COALESCE(NULLIF(device,''),'unknown') device,
           COALESCE(NULLIF(browser,''),'unknown') browser,
           COALESCE(NULLIF(mode,''),'unknown') mode,
           COALESCE(wins,-1) wins,net,value percentile,sid,
           CASE WHEN variant LIKE 'daily-link:%' THEN 'daily-link'
                WHEN variant LIKE 'daily-practice:%' THEN 'daily-practice'
                WHEN variant LIKE 'daily%' THEN 'daily'
                WHEN variant LIKE 'recap:%' THEN 'tribune-referral'
                ELSE 'standalone' END path
         FROM events WHERE ${W} AND (
           name='share_click' OR name='share_result' OR
           ((build IS NULL OR build='') AND name='share')
         )
       )
       SELECT event_name name,outcome,action,surface,device,browser,mode,wins,net,percentile,path,
         COUNT(*) c,COUNT(DISTINCT sid) people
       FROM share_events
       GROUP BY event_name,outcome,action,surface,device,browser,mode,wins,net,percentile,path
       ORDER BY c DESC`, B),
    q(`SELECT name,COALESCE(NULLIF(action,''),'unknown') action,COALESCE(NULLIF(outcome,''),'unknown') outcome,
         COALESCE(NULLIF(variant,''),'unknown') variant,COALESCE(NULLIF(segment,''),'unknown') segment,
         COUNT(*) c,ROUND(AVG(duration),0) avg_ms
       FROM events WHERE ${W} AND name IN ('recap_presented','recap_unwrap','recap_read','recap_full_read','recap_action','recap_skip','recap_generation','recap_publish','recap_shown')
       GROUP BY name,action,outcome,variant,segment ORDER BY c DESC`, B),
    q(`SELECT COALESCE(NULLIF(host,''),'unknown') host,COALESCE(NULLIF(surface,''),'unknown') surface,
         COALESCE(NULLIF(action,''),'unknown') action,COALESCE(NULLIF(detail,''),'') detail,
         COUNT(*) c,COUNT(DISTINCT sid) people
       FROM events WHERE ${W} AND name='link_out'
       GROUP BY host,surface,action,detail ORDER BY c DESC LIMIT 30`, B),
    Promise.all([
      q(`SELECT 'device' kind,COALESCE(NULLIF(device,''),'unknown') v,COUNT(*) c FROM events WHERE ${W} AND name='session_start' GROUP BY device`, B, "environment_device"),
      q(`SELECT 'browser' kind,COALESCE(NULLIF(browser,''),'unknown') v,COUNT(*) c FROM events WHERE ${W} AND name='session_start' GROUP BY browser`, B, "environment_browser"),
      q(`SELECT 'os' kind,COALESCE(NULLIF(os,''),'unknown') v,COUNT(*) c FROM events WHERE ${W} AND name='session_start' GROUP BY os`, B, "environment_os"),
      q(`SELECT 'country' kind,COALESCE(NULLIF(country,''),'unknown') v,COUNT(*) c FROM events WHERE ${W} AND name='session_start' GROUP BY country`, B, "environment_country"),
      q(`SELECT 'connection' kind,COALESCE(NULLIF(connection,''),'unknown') v,COUNT(*) c FROM events WHERE ${W} AND name='session_start' GROUP BY connection`, B, "environment_connection"),
      q(`SELECT 'nav_type' kind,COALESCE(NULLIF(nav_type,''),'unknown') v,COUNT(*) c FROM events WHERE ${W} AND name='session_start' GROUP BY nav_type`, B, "environment_navigation"),
      q(`SELECT 'local_hour' kind,COALESCE(CAST(local_hour AS TEXT),'unknown') v,COUNT(*) c FROM events WHERE ${W} AND name='session_start' GROUP BY local_hour`, B, "environment_local_hour")
    ]).then((parts) => parts.flat()),
    one(`SELECT COUNT(*) c,
         ROUND(AVG(ttfb_ms),0) ttfb,ROUND(AVG(lcp_ms),0) lcp,ROUND(AVG(inp_ms),0) inp,
         ROUND(AVG(cls),3) cls,ROUND(AVG(load_ms),0) load_ms,ROUND(AVG(duration),0) dcl
       FROM events WHERE ${W} AND name='perf_summary'`, B),
    q(`SELECT COALESCE(NULLIF(action,''),'unknown') action,COALESCE(NULLIF(error_code,''),'unknown') error_code,
         COALESCE(NULLIF(source,''),'') source,COALESCE(http_status,0) http_status,COUNT(*) c,
         MAX(ts) last_seen
       FROM events WHERE ${W} AND name='client_error'
       GROUP BY action,error_code,source,http_status ORDER BY c DESC,last_seen DESC LIMIT 20`, B),
    q(`SELECT COALESCE(NULLIF(variant,''),'unknown') message,COUNT(*) c
       FROM events WHERE ${W} AND name IN ('feedback_click','donate_click') GROUP BY message ORDER BY c DESC`, B),
    one(`SELECT
         COUNT(DISTINCT CASE WHEN name='session_start' THEN sid END) visits,
         COUNT(DISTINCT CASE WHEN name='first_interaction' THEN sid END) interacted,
         ROUND(AVG(CASE WHEN name='first_interaction' THEN elapsed_ms END),0) avg_first_ms,
         COUNT(DISTINCT CASE WHEN name='home_view' THEN sid END) home_people,
         COUNT(DISTINCT CASE WHEN name='data_ready' THEN sid END) ready_people,
         COUNT(DISTINCT CASE WHEN name='data_error' THEN sid END) error_people
       FROM events WHERE ${W}`, B),
    q(`WITH scoped AS (SELECT * FROM events WHERE ${W}),
       sessions AS (
         SELECT sid,COALESCE(MAX(NULLIF(referrer,'')),'direct') referrer
         FROM scoped WHERE name='session_start' GROUP BY sid
       ), flags AS (
         SELECT sid,
           MAX(CASE WHEN name='game_start' THEN 1 ELSE 0 END) started,
           MAX(CASE WHEN name='game_complete' THEN 1 ELSE 0 END) finished,
           MAX(CASE WHEN name='share_result' AND outcome='success' THEN 1 ELSE 0 END) shared
         FROM scoped GROUP BY sid
       )
       SELECT referrer,COUNT(*) visits,SUM(COALESCE(started,0)) starters,
         SUM(COALESCE(finished,0)) finishers,SUM(COALESCE(shared,0)) sharers
       FROM sessions LEFT JOIN flags USING(sid)
       GROUP BY referrer ORDER BY visits DESC LIMIT 20`, B),
    q(`SELECT daily_num,
         COALESCE(MAX(NULLIF(challenge,'')),'unknown') challenge,
         COALESCE(MAX(CASE WHEN name='game_start' THEN NULLIF(mode,'') END),'unknown') base,
         SUM(CASE WHEN name='game_start' AND COALESCE(practice,CASE WHEN variant LIKE 'daily-practice:%' THEN 1 ELSE 0 END)=0 THEN 1 ELSE 0 END) official_starts,
         COUNT(DISTINCT CASE WHEN name='game_start' AND COALESCE(practice,CASE WHEN variant LIKE 'daily-practice:%' THEN 1 ELSE 0 END)=0 THEN sid END) official_people,
         SUM(CASE WHEN name='game_complete' AND COALESCE(practice,CASE WHEN variant LIKE 'daily-practice:%' THEN 1 ELSE 0 END)=0 THEN 1 ELSE 0 END) official_finishes,
         SUM(CASE WHEN name='game_start' AND COALESCE(practice,CASE WHEN variant LIKE 'daily-practice:%' THEN 1 ELSE 0 END)=1 THEN 1 ELSE 0 END) practice_starts,
         SUM(CASE WHEN name='game_complete' AND COALESCE(practice,CASE WHEN variant LIKE 'daily-practice:%' THEN 1 ELSE 0 END)=1 THEN 1 ELSE 0 END) practice_finishes,
         SUM(CASE WHEN name='share_click' THEN 1 ELSE 0 END) intents,
         SUM(CASE WHEN name='share_result' AND outcome='success' THEN 1 ELSE 0 END) shares,
         SUM(CASE WHEN name='referral_open' AND action='daily_link' AND outcome='current' THEN 1 ELSE 0 END) current_opens,
         SUM(CASE WHEN name='game_start' AND variant LIKE 'daily-link:%' THEN 1 ELSE 0 END) linked_starts,
         SUM(CASE WHEN name='game_complete' AND variant LIKE 'daily-link:%' THEN 1 ELSE 0 END) linked_finishes,
         SUM(CASE WHEN name='results_view' AND variant LIKE 'daily-link:%' AND outcome='beat' THEN 1 ELSE 0 END) beats
       FROM events WHERE ${W} AND daily_num IS NOT NULL
         AND (variant LIKE 'daily%' OR name LIKE 'daily_gate%' OR (name='referral_open' AND action='daily_link'))
       GROUP BY daily_num ORDER BY daily_num DESC LIMIT 45`, B),
    q(`SELECT name,COALESCE(NULLIF(surface,''),'unknown') surface,
         COALESCE(NULLIF(action,''),'unknown') action,COALESCE(NULLIF(outcome,''),'unknown') outcome,
         COUNT(*) c,COUNT(DISTINCT sid) people,ROUND(AVG(duration),0) avg_ms
       FROM events WHERE ${W} AND name IN ('ui_click','feature_select','rules_open','rules_close','daily_gate_action')
       GROUP BY name,surface,action,outcome ORDER BY c DESC LIMIT 40`, B),
    q(`SELECT name,COALESCE(NULLIF(action,''),'unknown') action,
         COALESCE(NULLIF(outcome,''),'unknown') outcome,COALESCE(NULLIF(error_code,''),'unknown') error_code,
         COALESCE(http_status,0) http_status,COUNT(*) c,MAX(ts) last_seen
       FROM events WHERE ${W} AND (
         name IN ('client_error','data_error','share_error','percentile_error') OR
         (name='share_result' AND outcome='error') OR
         (name='recap_publish' AND (outcome='error' OR action='blocked')) OR
         (name='recap_generation' AND outcome='fallback')
       )
       GROUP BY name,action,outcome,error_code,http_status
       ORDER BY c DESC,last_seen DESC LIMIT 30`, B),
    q(`SELECT COALESCE(NULLIF(build,''),'pre-v39 / unknown') build,
         COUNT(DISTINCT CASE WHEN name='session_start' THEN sid END) visits,
         SUM(CASE WHEN name='game_start' THEN 1 ELSE 0 END) starts,
         SUM(CASE WHEN name='game_complete' THEN 1 ELSE 0 END) finishes,
         SUM(CASE WHEN name='share_click' THEN 1 ELSE 0 END) intents,
         SUM(CASE
           WHEN COALESCE(NULLIF(build,''),'')='' AND name='share' THEN 1
           WHEN name='share_result' AND outcome='success' THEN 1
           ELSE 0 END) shares,
         SUM(CASE WHEN name IN ('client_error','data_error','share_error','percentile_error') THEN 1 ELSE 0 END) errors,
         MAX(ts) last_seen
       FROM events WHERE ${dateW}
       GROUP BY COALESCE(NULLIF(build,''),'pre-v39 / unknown')
       ORDER BY last_seen DESC`, dateB),
    q(`SELECT ttfb_ms,lcp_ms,inp_ms,cls,load_ms
       FROM events WHERE ${W} AND name='perf_summary'
       ORDER BY ts DESC LIMIT 5000`, B),
    q(`SELECT COALESCE(NULLIF(mode,''),'unknown') mode,
         CASE WHEN variant LIKE 'daily-link:%' THEN 'daily-link'
              WHEN variant LIKE 'daily-practice:%' THEN 'daily-practice'
              WHEN variant LIKE 'daily%' THEN 'daily'
              ELSE 'standalone' END path,
         COALESCE(NULLIF(outcome,''),'unknown') outcome,
         amount query_len,ordinal result_count
       FROM events WHERE ${W} AND name='search_use'
       ORDER BY ts DESC LIMIT 10000`, B),
    q(`SELECT COALESCE(NULLIF(mode,''),'unknown') mode,
         CASE WHEN variant LIKE 'daily-link:%' THEN 'daily-link'
              WHEN variant LIKE 'daily-practice:%' THEN 'daily-practice'
              WHEN variant LIKE 'daily%' THEN 'daily'
              ELSE 'standalone' END path,
         COALESCE(NULLIF(reason,''),'unknown') reason,COALESCE(round,0) round,
         COUNT(*) c,ROUND(AVG(duration),0) avg_ms,ROUND(AVG(ordinal),2) avg_picks,
         ROUND(AVG(value),2) avg_rerolls,ROUND(AVG(amount),2) avg_searches
       FROM events WHERE ${W} AND name='run_abandon'
       GROUP BY mode,path,reason,round ORDER BY c DESC`, B),
    q(`WITH scoped AS (
         SELECT sid,ts,name,elapsed_ms FROM events WHERE ${W}
           AND name IN ('first_interaction','mode_select','daily_gate_start','game_start','game_complete')
       ), milestones AS (
         SELECT sid,MAX(ts) last_ts,
           MIN(CASE WHEN name='first_interaction' THEN elapsed_ms END) first_interaction_ms,
           MIN(CASE WHEN name='mode_select' THEN elapsed_ms END) mode_select_ms,
           MIN(CASE WHEN name='daily_gate_start' THEN elapsed_ms END) daily_gate_start_ms,
           MIN(CASE WHEN name='game_start' THEN elapsed_ms END) game_start_ms,
           MIN(CASE WHEN name='game_complete' THEN elapsed_ms END) game_complete_ms
         FROM scoped GROUP BY sid
       )
       SELECT * FROM milestones ORDER BY last_ts DESC LIMIT 10000`, B),
    q(`SELECT name,COALESCE(NULLIF(mode,''),'unknown') mode,
         CASE WHEN variant LIKE 'daily-link:%' THEN 'daily-link'
              WHEN variant LIKE 'daily-practice:%' THEN 'daily-practice'
              WHEN variant LIKE 'daily%' THEN 'daily'
              ELSE 'standalone' END path,
         COALESCE(NULLIF(reason,''),'') reason,duration,ordinal picks,value rerolls,amount searches
       FROM events WHERE ${W} AND name IN ('game_complete','run_abandon') AND duration IS NOT NULL
       ORDER BY ts DESC LIMIT 10000`, B)
  ]) : Promise.resolve(Array(32).fill([]));

  const retentionStartDay = scope.all ? "0000-01-01" : new Date(scope.start).toISOString().slice(0, 10);
  const retentionEndDay = scope.all ? "9999-12-31" : new Date(scope.end).toISOString().slice(0, 10);
  const retentionPromise = hasRetention ? (async () => {
    const maxDayRow = await one(`SELECT MAX(local_day) max_day, COUNT(*) events
      FROM retention_events_v1 WHERE local_day>=? AND local_day<?`, [retentionStartDay, retentionEndDay], "retention_max_day") || {};
    const dataDay = maxDayRow.max_day || new Date().toISOString().slice(0, 10);
    return Promise.all([
      Promise.resolve(maxDayRow),
      one(`WITH firsts AS (
          SELECT visitor_id, MIN(local_day) first_day
          FROM retention_events_v1 WHERE event_name='game_start' GROUP BY visitor_id
        ), scoped AS (
          SELECT * FROM firsts WHERE first_day>=? AND first_day<?
        ), flags AS (
          SELECT s.visitor_id,s.first_day,
            EXISTS(SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=s.visitor_id AND e.event_name='game_start' AND e.local_day=date(s.first_day,'+1 day')) d1_start,
            EXISTS(SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=s.visitor_id AND e.event_name='game_complete' AND e.local_day=date(s.first_day,'+1 day')) d1_finish,
            EXISTS(SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=s.visitor_id AND e.event_name='game_start' AND e.local_day=date(s.first_day,'+3 day')) d3_start,
            EXISTS(SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=s.visitor_id AND e.event_name='game_start' AND e.local_day=date(s.first_day,'+7 day')) d7_start,
            EXISTS(SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=s.visitor_id AND e.event_name='game_start' AND e.local_day>s.first_day AND e.local_day<=date(s.first_day,'+7 day')) w1_start,
            EXISTS(SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=s.visitor_id AND e.event_name='game_start' AND e.local_day>s.first_day AND e.local_day<=date(s.first_day,'+30 day')) m1_start
          FROM scoped s
        )
        SELECT COUNT(*) new_players,
          SUM(CASE WHEN first_day<=date(?,'-1 day') THEN 1 ELSE 0 END) d1_eligible,
          SUM(CASE WHEN first_day<=date(?,'-1 day') THEN d1_start ELSE 0 END) d1_started,
          SUM(CASE WHEN first_day<=date(?,'-1 day') THEN d1_finish ELSE 0 END) d1_finished,
          SUM(CASE WHEN first_day<=date(?,'-3 day') THEN 1 ELSE 0 END) d3_eligible,
          SUM(CASE WHEN first_day<=date(?,'-3 day') THEN d3_start ELSE 0 END) d3_started,
          SUM(CASE WHEN first_day<=date(?,'-7 day') THEN 1 ELSE 0 END) d7_eligible,
          SUM(CASE WHEN first_day<=date(?,'-7 day') THEN d7_start ELSE 0 END) d7_started,
          SUM(CASE WHEN first_day<=date(?,'-7 day') THEN w1_start ELSE 0 END) w1_started,
          SUM(CASE WHEN first_day<=date(?,'-30 day') THEN 1 ELSE 0 END) m1_eligible,
          SUM(CASE WHEN first_day<=date(?,'-30 day') THEN m1_start ELSE 0 END) m1_started
        FROM flags`, [retentionStartDay,retentionEndDay,dataDay,dataDay,dataDay,dataDay,dataDay,dataDay,dataDay,dataDay,dataDay,dataDay], "retention_summary"),
      q(`WITH firsts AS (
          SELECT visitor_id,MIN(local_day) first_day FROM retention_events_v1
          WHERE event_name='game_start' GROUP BY visitor_id
        )
        SELECT f.first_day,COUNT(*) new_players,
          SUM(CASE WHEN f.first_day<=date(?,'-1 day') THEN 1 ELSE 0 END) d1_eligible,
          SUM(CASE WHEN f.first_day<=date(?,'-1 day') AND EXISTS(
            SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=f.visitor_id AND e.event_name='game_start' AND e.local_day=date(f.first_day,'+1 day')) THEN 1 ELSE 0 END) d1_started,
          SUM(CASE WHEN f.first_day<=date(?,'-1 day') AND EXISTS(
            SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=f.visitor_id AND e.event_name='game_complete' AND e.local_day=date(f.first_day,'+1 day')) THEN 1 ELSE 0 END) d1_finished,
          SUM(CASE WHEN f.first_day<=date(?,'-7 day') THEN 1 ELSE 0 END) d7_eligible,
          SUM(CASE WHEN f.first_day<=date(?,'-7 day') AND EXISTS(
            SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=f.visitor_id AND e.event_name='game_start' AND e.local_day=date(f.first_day,'+7 day')) THEN 1 ELSE 0 END) d7_started
        FROM firsts f WHERE f.first_day>=? AND f.first_day<?
        GROUP BY f.first_day ORDER BY f.first_day DESC LIMIT 31`, [dataDay,dataDay,dataDay,dataDay,dataDay,retentionStartDay,retentionEndDay], "retention_cohorts"),
      q(`WITH ranked AS (
          SELECT visitor_id,local_day first_day,COALESCE(mode,'unknown') first_mode,
            ROW_NUMBER() OVER (PARTITION BY visitor_id ORDER BY ts,id) rn
          FROM retention_events_v1 WHERE event_name='game_start'
        ), firsts AS (
          SELECT visitor_id,first_day,first_mode FROM ranked
          WHERE rn=1 AND first_day>=? AND first_day<?
        )
        SELECT first_mode,COUNT(*) new_players,
          SUM(CASE WHEN first_day<=date(?,'-1 day') THEN 1 ELSE 0 END) eligible,
          SUM(CASE WHEN first_day<=date(?,'-1 day') AND EXISTS(
            SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=firsts.visitor_id AND e.event_name='game_start' AND e.local_day=date(firsts.first_day,'+1 day')) THEN 1 ELSE 0 END) returned,
          SUM(CASE WHEN first_day<=date(?,'-7 day') THEN 1 ELSE 0 END) w1_eligible,
          SUM(CASE WHEN first_day<=date(?,'-7 day') AND EXISTS(
            SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=firsts.visitor_id AND e.event_name='game_start' AND e.local_day>firsts.first_day AND e.local_day<=date(firsts.first_day,'+7 day')) THEN 1 ELSE 0 END) w1_returned
        FROM firsts GROUP BY first_mode ORDER BY new_players DESC`, [retentionStartDay,retentionEndDay,dataDay,dataDay,dataDay,dataDay], "retention_by_mode"),
      q(`WITH ranked AS (
          SELECT visitor_id,local_day first_day,COALESCE(NULLIF(entry,''),'unknown') first_entry,
            ROW_NUMBER() OVER (PARTITION BY visitor_id ORDER BY ts,id) rn
          FROM retention_events_v1 WHERE event_name='game_start'
        ), firsts AS (
          SELECT visitor_id,first_day,first_entry FROM ranked
          WHERE rn=1 AND first_day>=? AND first_day<?
        )
        SELECT first_entry,COUNT(*) new_players,
          SUM(CASE WHEN first_day<=date(?,'-1 day') THEN 1 ELSE 0 END) eligible,
          SUM(CASE WHEN first_day<=date(?,'-1 day') AND EXISTS(
            SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=firsts.visitor_id AND e.event_name='game_start' AND e.local_day=date(firsts.first_day,'+1 day')) THEN 1 ELSE 0 END) returned
        FROM firsts GROUP BY first_entry ORDER BY new_players DESC LIMIT 12`, [retentionStartDay,retentionEndDay,dataDay,dataDay], "retention_by_entry"),
      q(`WITH days AS (
          SELECT visitor_id,COUNT(DISTINCT local_day) active_days
          FROM retention_events_v1 WHERE event_name='game_start' GROUP BY visitor_id
        ), scoped AS (
          SELECT d.* FROM days d WHERE EXISTS(
            SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=d.visitor_id AND e.event_name='game_start' AND e.local_day>=? AND e.local_day<?)
        )
        SELECT CASE WHEN active_days>=8 THEN '8+' ELSE CAST(active_days AS TEXT) END bucket,COUNT(*) players
        FROM scoped GROUP BY CASE WHEN active_days>=8 THEN '8+' ELSE CAST(active_days AS TEXT) END
        ORDER BY CASE bucket WHEN '1' THEN 1 WHEN '2' THEN 2 WHEN '3' THEN 3 WHEN '4' THEN 4 WHEN '5' THEN 5 WHEN '6' THEN 6 WHEN '7' THEN 7 ELSE 8 END`, [retentionStartDay,retentionEndDay], "retention_active_days"),
      q(`WITH days AS (
          SELECT DISTINCT visitor_id,local_day FROM retention_events_v1 WHERE event_name='game_start'
        ), numbered AS (
          SELECT visitor_id,local_day,julianday(local_day)-ROW_NUMBER() OVER (PARTITION BY visitor_id ORDER BY local_day) grp FROM days
        ), runs AS (
          SELECT visitor_id,COUNT(*) streak FROM numbered GROUP BY visitor_id,grp
        ), best AS (
          SELECT visitor_id,MAX(streak) best_streak FROM runs GROUP BY visitor_id
        )
        SELECT CASE WHEN best_streak=1 THEN '1 day' WHEN best_streak=2 THEN '2 days' WHEN best_streak=3 THEN '3 days'
          WHEN best_streak BETWEEN 4 AND 6 THEN '4–6 days' ELSE '7+ days' END bucket,COUNT(*) players,MIN(best_streak) sort_key
        FROM best WHERE EXISTS(
          SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=best.visitor_id AND e.event_name='game_start' AND e.local_day>=? AND e.local_day<?)
        GROUP BY bucket ORDER BY sort_key`, [retentionStartDay,retentionEndDay], "retention_streaks"),
      q(`WITH firsts AS (
          SELECT visitor_id,MIN(local_day) first_day FROM retention_events_v1 WHERE event_name='game_start' GROUP BY visitor_id
        ), activity AS (
          SELECT DISTINCT visitor_id,local_day FROM retention_events_v1
          WHERE event_name='game_start' AND local_day>=? AND local_day<?
        )
        SELECT a.local_day,
          SUM(CASE WHEN a.local_day=f.first_day THEN 1 ELSE 0 END) new_players,
          SUM(CASE WHEN a.local_day>f.first_day THEN 1 ELSE 0 END) returning_players,
          COUNT(*) active_players
        FROM activity a JOIN firsts f USING(visitor_id)
        GROUP BY a.local_day ORDER BY a.local_day DESC LIMIT 31`, [retentionStartDay,retentionEndDay], "retention_daily_mix")
    ]);
  })() : Promise.resolve([{},null,[],[],[],[],[],[]]);

  const coveragePromise = hasRetentionCoverage ? Promise.all([
    one(`SELECT COUNT(*) checks,
        SUM(CASE WHEN decision='enabled' THEN 1 ELSE 0 END) enabled,
        SUM(CASE WHEN decision='disabled' THEN 1 ELSE 0 END) disabled,
        SUM(CASE WHEN gpc=1 THEN 1 ELSE 0 END) gpc,
        SUM(CASE WHEN dnt=1 THEN 1 ELSE 0 END) dnt,
        SUM(CASE WHEN decision='enabled' AND (gpc=1 OR dnt=1) THEN 1 ELSE 0 END) measured_signals,
        SUM(CASE WHEN storage_ok=0 THEN 1 ELSE 0 END) storage_blocked,
        SUM(CASE WHEN device='mobile' THEN 1 ELSE 0 END) mobile
      FROM retention_coverage_v1 WHERE ${dateW}`, dateB, "retention_coverage_summary"),
    q(`SELECT reason,decision,COUNT(*) c FROM retention_coverage_v1 WHERE ${dateW}
      GROUP BY reason,decision ORDER BY c DESC`, dateB, "retention_coverage_reasons"),
    q(`SELECT COALESCE(identity_source,'none') identity_source,COUNT(*) c FROM retention_coverage_v1
      WHERE ${dateW} AND decision='enabled' GROUP BY identity_source ORDER BY c DESC`, dateB, "retention_identity_sources"),
    q(`SELECT COALESCE(browser,'Other') browser,COALESCE(device,'unknown') device,COUNT(*) checks,
        SUM(CASE WHEN decision='enabled' THEN 1 ELSE 0 END) enabled,
        SUM(CASE WHEN gpc=1 OR dnt=1 THEN 1 ELSE 0 END) signals
      FROM retention_coverage_v1 WHERE ${dateW}
      GROUP BY browser,device ORDER BY checks DESC LIMIT 14`, dateB, "retention_browser_coverage")
  ]) : Promise.resolve([null,[],[],[]]);

  const [core, v2, v3, retention, retentionCoverage] = await Promise.all([corePromise, v2Promise, v3Promise, retentionPromise, coveragePromise]);
  const [
    winCounts, hhHits, modeMix, funnelModes, roundFunnel, hcAction, hcSeg,
    sessionRows, corrRows, newspaperRowsLegacy, dailyByBaseRows,
    sessionsRow, startsRow, trackedStartsRow, startSidsRow, completesRow, shownRow, errorsRow, loadRow
  ] = core;
  const [prestiRows, exposureRows, startOverRows] = v2;
  const [
    heartbeatRows = [], buildRows = [], acquisitionRows = [], campaignRows = [], pageRows = [], modeDiscoveryRows = [],
    dailyFunnelRows = [], dailyReferralRows = [], returnRows = [], draftRows = [], topPickRows = [], denyRows = [],
    rerollRows = [], resultRows = [], shareRows = [], recapRowsV3 = [], linkRows = [], techRows = [], perfRow = null,
    clientErrorRows = [], feedbackRows = [], interactionRow = null, referrerRows = [], dailyBoardRows = [],
    uiRows = [], errorRows = [], buildCompareRows = [], perfRawRows = [], searchDetailRows = [],
    abandonDetailRows = [], milestoneRows = [], runTimingRows = []
  ] = v3;
  const [retentionMax = {}, retentionSummary = null, retentionCohorts = [], retentionByMode = [], retentionByEntry = [], retentionActivity = [], retentionStreaks = [], retentionDailyMix = []] = retention;
  const [coverageSummary = null, coverageReasons = [], retentionIdentitySources = [], retentionBrowserCoverage = []] = retentionCoverage;

  const sessions = cnt(sessionsRow);
  const startsAll = cnt(startsRow);
  const trackedStarts = cnt(trackedStartsRow);
  const startSids = cnt(startSidsRow);
  const completesN = cnt(completesRow);
  const shown = cnt(shownRow);
  const errors = cnt(errorsRow);

  // Outcomes by mode, using grouped counts so the dashboard never pulls one row/game.
  const countMaps = {};
  TRACKED_MODES.forEach((m) => { countMaps[m] = Array(83).fill(0); });
  const undefByMode = {};
  winCounts.forEach((r) => {
    if (!countMaps[r.mode]) return;
    const w = Math.max(0, Math.min(82, +r.wins || 0));
    countMaps[r.mode][w] += +r.c || 0;
    undefByMode[r.mode] = (undefByMode[r.mode] || 0) + (+r.u || 0);
  });
  const hhByMode = {};
  hhHits.forEach((r) => { hhByMode[r.mode] = +r.c || 0; });
  const modeRows = TRACKED_MODES.map((m) => {
    const counts = countMaps[m], n = sum(counts), undef = undefByMode[m] || 0;
    return { mode: m, n, median: weightedMedian(counts), mean: round1(weightedMean(counts)),
      undefPct: pct(undef, n), w82Pct: pct(undef + (hhByMode[m] || 0), n) };
  });
  const allCounts = Array(83).fill(0);
  TRACKED_MODES.forEach((m) => countMaps[m].forEach((c, w) => { allCounts[w] += c; }));
  const distroSets = [{ mode: "all", label: "All tracked modes", counts: allCounts }]
    .concat(TRACKED_MODES.map((m) => ({ mode: m, label: MODE_LABEL[m], counts: countMaps[m] })));

  // Core funnel and visit-level engagement.
  const bouncePct = pct(Math.max(0, sessions - startSids), sessions);
  const startRate = pct(startSids, sessions);
  const completeRate = pct(completesN, trackedStarts);
  const funnelMap = {};
  funnelModes.forEach((r) => { funnelMap[r.mode] = r; });
  const durations = sessionRows.map((r) => (+r.duration || 0) / 1000).sort(numSort);
  const engaged = sessionRows.filter((r) => r.engaged_ms != null).map((r) => (+r.engaged_ms || 0) / 1000).sort(numSort);
  const gamesPerVisit = sessionRows.map((r) => +r.games || 0).sort(numSort);
  const deepest = sessionRows.map((r) => +r.max_round || 0).sort(numSort);
  const interactions = sessionRows.filter((r) => r.interactions != null).map((r) => +r.interactions || 0).sort(numSort);
  const scrolls = sessionRows.filter((r) => r.scroll_pct != null).map((r) => +r.scroll_pct || 0).sort(numSort);
  const corrPts = corrRows.map((r) => [+r.avg_wins || 0, +r.games || 0]);
  const corr = corrPts.length >= 2 ? round2(pearson(corrPts)) : null;
  const winByDepth = engagementBuckets(corrRows);

  const pulled = pick(hcAction, "pulled", 1);
  const skipped = pick(hcAction, "pulled", 0);
  const pullRate = pct(pulled, shown);
  const hitTotal = hcSeg.reduce((s, r) => s + (+r.h || 0), 0);
  const segMax = Math.max(1, ...hcSeg.map((r) => +r.c || 0));
  const modeMax = Math.max(1, ...modeMix.map((r) => +r.c || 0));

  // One canonical sharing definition everywhere: v39+ uses share_result=success;
  // pre-v39 rows fall back to the legacy share event in the query above.
  const canonicalShareRows = hasV3 ? shareRows.filter((r) => r.mode !== "kaman") : [];
  const kamanShareRows = hasV3 ? shareRows.filter((r) => r.mode === "kaman") : [];
  const shareKpis = hasV3 ? shareSummary(canonicalShareRows) : null;
  const dailyRefMap = hasV3 ? Object.fromEntries(dailyReferralRows.map((r) => [r.step, r])) : {};
  const dailyCurrentOpens = +(dailyRefMap.link_open_current && dailyRefMap.link_open_current.people) || 0;
  const dailyLinkedStarts = +(dailyRefMap.game_started && dailyRefMap.game_started.people) || 0;
  const dailyLinkedFinishes = +(dailyRefMap.game_finished && dailyRefMap.game_finished.people) || 0;
  const dailyReshares = +(dailyRefMap.reshared && dailyRefMap.reshared.people) || 0;

  const cards = [];

  // -------------------- owner decision board --------------------
  if (hasV3) {
    const dailyFunnel = dailyFunnelRows[0] || {};
    const qualityWarnings = [];
    if (trackedStarts && completesN > trackedStarts) qualityWarnings.push("Tracked finishes exceed starts in this scope; the date/build boundary may be splitting runs or duplicate completion events are landing.");
    if (shareKpis.intents && shareKpis.completed > shareKpis.intents) qualityWarnings.push("Completed shares exceed share intents; old and new share definitions may be mixed in the selected build.");
    if (sessions && startSids > sessions) qualityWarnings.push("Starting visits exceed session starts; session_start coverage is incomplete for this scope.");
    if (dailyCurrentOpens && dailyLinkedStarts > dailyCurrentOpens) qualityWarnings.push("Friend-link starts exceed current-link opens; referral_open coverage is missing or the selected date boundary split the funnel.");
    if (+dailyFunnel.unanchored_start_people > 0) qualityWarnings.push(`${+dailyFunnel.unanchored_start_people} Daily starting visits have no matching gate row.`);
    const growthSteps = [
      growthStep("Visit → game start", startSids, sessions, "Make the front door and mode choice clearer."),
      growthStep("Start → finish", completesN, trackedStarts, "Reduce draft friction or shorten the path to a result."),
      growthStep("Finish → share intent", shareKpis.intents, completesN, "Make the result feel more brag-worthy and the share CTA harder to miss."),
      growthStep("Share intent → handoff", shareKpis.completed, shareKpis.intents, "Fix share-sheet/copy friction or improve the share payload preview."),
      growthStep("Friend open → start", dailyLinkedStarts, dailyCurrentOpens, "Strengthen the challenge gate and sender-versus-recipient framing."),
      growthStep("Friend start → finish", dailyLinkedFinishes, dailyLinkedStarts, "Make referred players reach the payoff faster."),
      growthStep("Friend finish → reshare", dailyReshares, dailyLinkedFinishes, "Give recipients a stronger reason to pass the challenge onward.")
    ].filter((r) => r.d >= 5).sort((a, b) => a.rate - b.rate);
    const weakest = growthSteps[0];
    cards.push(card("Growth scorecard · what matters", `
      <div class="stat4">${stat(startRate + "%", "visits that start")}${stat(completeRate + "%", "starts that finish")}${stat(pct(shareKpis.intents, completesN) + "%", "finishes with share intent")}${stat(pct(shareKpis.completed, shareKpis.intents) + "%", "intents handed off")}</div>
      <div class="stat4">${stat(pct(dailyLinkedStarts, dailyCurrentOpens) + "%", "friend opens that start")}${stat(pct(dailyLinkedFinishes, dailyLinkedStarts) + "%", "friend starts that finish")}${stat(pct(dailyReshares, dailyLinkedFinishes) + "%", "friend finishes reshared")}${stat(round2(dailyCurrentOpens ? dailyReshares / dailyCurrentOpens : 0), "reshares per friend open")}</div>
      ${weakest ? `<div class="decision"><b>Fix first: ${esc(weakest.label)} (${weakest.rate}%).</b> ${esc(weakest.advice)}</div>` : `<p class="muted">More traffic is needed before the dashboard can identify a reliable weakest conversion step.</p>`}
      ${qualityWarnings.length ? `<div class="quality bad"><b>Instrumentation checks:</b><br>${qualityWarnings.map(esc).join("<br>")}</div>` : `<div class="quality"><b>Instrumentation checks passed:</b> no impossible funnel relationships detected in this scope.</div>`}
      <table><thead><tr><th>conversion step</th><th>made it</th><th>eligible</th><th>rate</th></tr></thead><tbody>
        ${growthSteps.length ? growthSteps.map((r) => `<tr><td class="k">${esc(r.label)}</td><td>${r.n}</td><td>${r.d}</td><td class="${r===weakest?"warncell":""}">${r.rate}%</td></tr>`).join("") : emptyRow(4)}
      </tbody></table>
      <p class="muted">This is the executive view: acquisition, play completion, share motivation, handoff reliability, and the Daily friend-to-friend loop. Rates are shown only in the leak ranking once a step has at least five eligible visits/runs.</p>`, "wide priority"));
  }

  // -------------------- same-browser retention --------------------
  if (hasRetention && retentionSummary) {
    const rs = retentionSummary || {};
    const identifiedPlayers = +rs.new_players || 0;
    const repeatPlayers = retentionActivity.reduce((n, r) => n + (String(r.bucket) === "1" ? 0 : (+r.players || 0)), 0);
    const coverageChecks = coverageSummary ? +coverageSummary.checks || 0 : 0;
    const coverageEnabled = coverageSummary ? +coverageSummary.enabled || 0 : 0;
    const d1Text = maturePct(rs.d1_started, rs.d1_eligible);
    const d1FinishText = maturePct(rs.d1_finished, rs.d1_eligible);
    const d7Text = maturePct(rs.d7_started, rs.d7_eligible);
    const w1Text = maturePct(rs.w1_started, rs.d7_eligible);
    cards.push(card("Retention · does the game create another day?", `
      <div class="stat4">${stat(d1Text,"D1 played again")}${stat(d1FinishText,"D1 finished again")}${stat(d7Text,"exact D7")}${stat(w1Text,"returned within 7d")}</div>
      <div class="stat4">${stat(identifiedPlayers,"new identified browsers")}${stat(repeatPlayers,"played on 2+ days")}${stat(maturePct(repeatPlayers,identifiedPlayers),"repeat-day share")}${stat(coverageChecks?maturePct(coverageEnabled,coverageChecks):"—","measurement coverage")}</div>
      <div class="decision"><b>The survival number is D1 played again.</b> It counts browsers that started a game on the very next local calendar day. D1 finished again is the stricter product-quality version.</div>
      <p class="muted">Forward-only, same-browser cohorts. Recent cohorts are excluded from denominators until they have had enough time to return. Retention deliberately spans build changes and therefore ignores the build chip above.</p>`, "wide priority"));

    cards.push(card("Retention cohorts · first game day", `
      <table><thead><tr><th>first day</th><th>new</th><th>D1 played</th><th>D1 finished</th><th>D7 played</th></tr></thead><tbody>
        ${retentionCohorts.length ? retentionCohorts.map((r)=>`<tr><td class="k">${esc(r.first_day)}</td><td>${+r.new_players||0}</td><td>${+r.d1_eligible?`${pct(+r.d1_started||0,+r.d1_eligible||0)}% · ${+r.d1_started||0}/${+r.d1_eligible||0}`:'<span class="pending">not mature</span>'}</td><td>${+r.d1_eligible?`${pct(+r.d1_finished||0,+r.d1_eligible||0)}% · ${+r.d1_finished||0}/${+r.d1_eligible||0}`:'<span class="pending">not mature</span>'}</td><td>${+r.d7_eligible?`${pct(+r.d7_started||0,+r.d7_eligible||0)}% · ${+r.d7_started||0}/${+r.d7_eligible||0}`:'<span class="pending">not mature</span>'}</td></tr>`).join("") : emptyRow(5)}
      </tbody></table>
      <p class="muted">Do not judge a cohort that says “not mature.” At low traffic, use the multi-day total above and the within-7-day number before reacting to one noisy date.</p>`, "wide"));

    cards.push(card("Retention · first experience", `
      <div class="sub">by first mode</div>
      <table><thead><tr><th>mode</th><th>new</th><th>D1</th><th>within 7d</th></tr></thead><tbody>
        ${retentionByMode.length ? retentionByMode.map((r)=>`<tr><td class="k">${esc(MODE_LABEL[r.first_mode]||human(r.first_mode))}</td><td>${+r.new_players||0}</td><td>${maturePct(r.returned,r.eligible)}</td><td>${maturePct(r.w1_returned,r.w1_eligible)}</td></tr>`).join("") : emptyRow(4)}
      </tbody></table>
      <div class="sub">by first entry</div>
      <table><thead><tr><th>entry</th><th>new</th><th>D1</th></tr></thead><tbody>
        ${retentionByEntry.length ? retentionByEntry.map((r)=>`<tr><td class="k">${esc(human(r.first_entry))}</td><td>${+r.new_players||0}</td><td>${maturePct(r.returned,r.eligible)}</td></tr>`).join("") : emptyRow(3)}
      </tbody></table>
      <p class="muted">This tells you whether The Daily/challenge traffic creates a habit or merely a one-time click, and which first mode deserves the homepage emphasis.</p>`, "wide"));

    const activityMax = Math.max(1,...retentionActivity.map((r)=>+r.players||0));
    const streakMax = Math.max(1,...retentionStreaks.map((r)=>+r.players||0));
    cards.push(card("Habit depth · active days and streaks", `
      <div class="sub">distinct days with a game start</div>${retentionActivity.length?retentionActivity.map((r)=>bar(String(r.bucket)+" days",+r.players||0,activityMax)).join(""):muted("no repeat-day data yet")}
      <div class="sub">best consecutive-day streak</div>${retentionStreaks.length?retentionStreaks.map((r)=>bar(r.bucket,+r.players||0,streakMax)).join(""):muted("no streak data yet")}
      <div class="sub">daily active mix</div>
      <table><thead><tr><th>day</th><th>new</th><th>returning</th><th>active</th></tr></thead><tbody>
        ${retentionDailyMix.length?retentionDailyMix.slice(0,14).map((r)=>`<tr><td class="k">${esc(r.local_day)}</td><td>${+r.new_players||0}</td><td>${+r.returning_players||0}</td><td>${+r.active_players||0}</td></tr>`).join(""):emptyRow(4)}
      </tbody></table>`, "wide"));
  } else {
    cards.push(card("Retention · deployment status", `<p class="warn"><b>Retention table not detected.</b> Run <code>migrations/0008_retention_events_v1.sql</code>, then deploy the retention client and endpoints. Existing gameplay tables are untouched.</p>`, "wide"));
  }

  if (hasRetentionCoverage && coverageSummary) {
    const cs = coverageSummary || {};
    const checks = +cs.checks || 0, enabled = +cs.enabled || 0;
    const reasonMax = Math.max(1,...coverageReasons.map((r)=>+r.c||0));
    const sourceMax = Math.max(1,...retentionIdentitySources.map((r)=>+r.c||0));
    cards.push(card("Retention measurement coverage · pushed hard", `
      <div class="stat4">${stat(checks,"identity checks")}${stat(maturePct(enabled,checks),"enabled")}${stat(+cs.measured_signals||0,"DNT/GPC visits still measured")}${stat(+cs.mobile||0,"mobile checks")}</div>
      <div class="quality"><b>Aggressive boundary:</b> DNT and GPC are recorded but no longer suppress strictly first-party product analytics. Explicit TRUE 82 opt-out, EEA/UK/Swiss traffic, and unknown/Tor geolocation remain disabled.</div>
      <div class="sub">policy outcomes</div>${coverageReasons.length?coverageReasons.map((r)=>bar(`${human(r.reason)} · ${r.decision}`,+r.c||0,reasonMax)).join(""):muted("no policy checks yet")}
      <div class="sub">identity continuity source</div>${retentionIdentitySources.length?retentionIdentitySources.map((r)=>bar(human(r.identity_source),+r.c||0,sourceMax)).join(""):muted("no enabled identities yet")}
      <div class="sub">browser/device coverage</div>
      <table><thead><tr><th>browser</th><th>device</th><th>checks</th><th>enabled</th><th>DNT/GPC</th></tr></thead><tbody>
        ${retentionBrowserCoverage.length?retentionBrowserCoverage.map((r)=>`<tr><td class="k">${esc(r.browser)}</td><td>${esc(r.device)}</td><td>${+r.checks||0}</td><td>${maturePct(r.enabled,r.checks)}</td><td>${+r.signals||0}</td></tr>`).join(""):emptyRow(5)}
      </tbody></table>
      <p class="muted">Cookie is the primary identity on Safari/Chrome iOS; local storage is the fallback/cache. “Local recovery” means a valid same-site id existed locally when the first-party cookie was absent. Storage-blocked checks: <b>${+cs.storage_blocked||0}</b>.</p>`, "wide"));
  } else {
    cards.push(card("Retention coverage diagnostics", `<p class="warn">Run <code>migrations/0009_retention_coverage_v1.sql</code> to see exclusions, DNT/GPC incidence, identity source, and Safari/Chrome iOS measurement coverage.</p>`, "wide"));
  }

  // -------------------- health and instrumentation --------------------
  if (hasV3) {
    const heartMap = Object.fromEntries((heartbeatRows || []).map((r) => [r.name, r]));
    const heartOrder = ["session_start", "home_view", "data_ready", "data_error", "game_start", "game_complete", "share_click", "share_result", "perf_summary", "client_error"];
    cards.push(card("Live pulse · ingestion", `
      <table><thead><tr><th>event</th><th>last seen</th><th>1h</th><th>24h</th></tr></thead>
      <tbody>${heartOrder.map((name) => {
        const r = heartMap[name] || {};
        const age = r.last_seen ? ageText(now - (+r.last_seen || 0)) : "never";
        const stale = !r.last_seen || now - (+r.last_seen || 0) > 6 * 3600000;
        return `<tr><td class="k">${esc(name)}</td><td class="${stale ? "warncell" : "okcell"}">${esc(age)}</td><td>${+r.c1h || 0}</td><td>${+r.c24h || 0}</td></tr>`;
      }).join("")}</tbody></table>
      <p class="muted">This card ignores the dashboard date/build filter so a dead event pipeline is visible immediately. Quiet share rows are not alarming by themselves; stale session/home/data rows are.</p>`, "wide"));

    const currentBuildRows = buildRows || [];
    const buildMax = Math.max(1, ...currentBuildRows.map((r) => +r.c || 0));
    const v3Events = currentBuildRows.filter((r) => r.build !== "pre-v39 / unknown").reduce((s, r) => s + (+r.c || 0), 0);
    const allEvents = currentBuildRows.reduce((s, r) => s + (+r.c || 0), 0);
    const buildVisits = currentBuildRows.reduce((s, r) => s + (+r.visits || 0), 0);
    cards.push(card("Instrumentation · builds", `
      <div class="stat3">${stat(allEvents, "events in date range")}${stat(buildVisits ? round1(allEvents / buildVisits) : "—", "events / visit")}${stat(pct(v3Events, allEvents) + "%", "version-tagged")}</div>
      ${currentBuildRows.length ? currentBuildRows.map((r) => bar(r.build, +r.c || 0, buildMax, `${r.c} · ${r.visits} visits`)).join("") : muted("no events")}
      <p class="muted">Use the build filter above to inspect a coherent release instead of blending incompatible event definitions. Unknown is expected for pre-v39 history.</p>`));

    cards.push(card("Build comparison · regression check", `
      <table><thead><tr><th>build</th><th>visits</th><th>starts</th><th>finishes</th><th>finish %</th><th>share</th><th>errors</th><th>last</th></tr></thead><tbody>
        ${buildCompareRows.length ? buildCompareRows.map((r) => `<tr><td class="k">${esc(r.build)}</td><td>${+r.visits||0}</td><td>${+r.starts||0}</td><td>${+r.finishes||0}</td><td>${pct(+r.finishes||0,+r.starts||0)}%</td><td>${+r.shares||0}/${+r.intents||0}</td><td>${+r.errors||0}</td><td>${r.last_seen?esc(ageText(now-(+r.last_seen||0))):"—"}</td></tr>`).join("") : emptyRow(8)}
      </tbody></table>
      <p class="muted">This comparison obeys the date range but deliberately ignores the selected build chip, so a bad deployment remains visible beside the one before it.</p>`, "wide"));
  }

  // -------------------- acquisition and navigation --------------------
  if (hasV3) {
    const acqMax = Math.max(1, ...acquisitionRows.map((r) => +r.visits || 0));
    cards.push(card("Acquisition · entry path", `
      <table><thead><tr><th>entry</th><th>visits</th><th>started</th><th>finished</th><th>shared</th></tr></thead>
      <tbody>${acquisitionRows.length ? acquisitionRows.map((r) => `<tr><td class="k">${esc(human(r.bucket))}</td><td>${r.visits}</td><td>${r.starters} · ${pct(r.starters,r.visits)}%</td><td>${r.finishers} · ${pct(r.finishers,r.visits)}%</td><td>${r.sharers} · ${pct(r.sharers,r.visits)}%</td></tr>`).join("") : emptyRow(5)}</tbody></table>
      <div class="sub">visit volume</div>${acquisitionRows.length ? acquisitionRows.map((r) => bar(human(r.bucket), +r.visits || 0, acqMax)).join("") : muted("no sessions")}
      <p class="muted">A visit id lasts only until reload/tab close. “Campaign” comes from UTM tags; “internal” is a play click from one of TRUE 82’s explainer pages; Daily and Tribune links have their own entry buckets.</p>`, "wide"));

    cards.push(card("Campaigns · qualified traffic", `
      <table><thead><tr><th>campaign</th><th>visits</th><th>start %</th><th>finish %</th></tr></thead>
      <tbody>${campaignRows.length ? campaignRows.map((r) => {
        const label = campaignLabel(r);
        return `<tr><td class="k" title="${esc(label)}">${esc(shortText(label,42))}</td><td>${r.visits}</td><td>${pct(r.starters,r.visits)}%</td><td>${pct(r.finishers,r.visits)}%</td></tr>`;
      }).join("") : emptyRow(4)}</tbody></table>
      <p class="muted">Tag every creator, community, newsletter, or sponsorship link. Internal explainer CTAs also appear here under <code>true82 / internal / site_nav</code>.</p>`));

    cards.push(card("Referrer origins · qualified traffic", `
      <table><thead><tr><th>origin</th><th>visits</th><th>start %</th><th>finish %</th><th>share %</th></tr></thead>
      <tbody>${referrerRows.length ? referrerRows.map((r) => `<tr><td class="k" title="${esc(r.referrer)}">${esc(shortText(r.referrer,42))}</td><td>${+r.visits||0}</td><td>${pct(+r.starters||0,+r.visits||0)}%</td><td>${pct(+r.finishers||0,+r.visits||0)}%</td><td>${pct(+r.sharers||0,+r.visits||0)}%</td></tr>`).join("") : emptyRow(5)}</tbody></table>
      <p class="muted">Only the referrer origin is stored—never its path, query string, post title, channel name, or message contents. Direct visits include browsers that suppress the referrer.</p>`));

    cards.push(card("Pages · where visits happen", `
      <table><thead><tr><th>page</th><th>visits</th><th>started</th><th>finished</th><th>outbound</th></tr></thead>
      <tbody>${pageRows.length ? pageRows.map((r) => `<tr><td class="k">${esc(human(r.page))}</td><td>${r.visits}</td><td>${r.starters}</td><td>${r.finishers}</td><td>${r.linked}</td></tr>`).join("") : emptyRow(5)}</tbody></table>
      <p class="muted">A click from an explainer into the game is attributed on the new game-page visit through its <code>src</code> token; no cross-page durable identifier is used.</p>`));
  }

  // -------------------- home and mode discovery --------------------
  if (hasV3) {
    const discoveryMap = Object.fromEntries(modeDiscoveryRows.map((r) => [r.bucket, r]));
    const discoveryOrder = ["daily", "classic", "cap", "pro", "kaman"];
    cards.push(card("Home · mode discovery", `
      <table><thead><tr><th>choice</th><th>seen</th><th>selected</th><th>starts</th><th>finishes</th></tr></thead>
      <tbody>${discoveryOrder.map((k) => {
        const r = discoveryMap[k] || {};
        const seen = +r.impression_people || 0, selected = +r.select_people || 0, starts = +r.start_people || 0;
        return `<tr><td class="k">${esc(MODE_LABEL[k] || human(k))}</td><td>${seen}</td><td>${selected} · ${pct(selected,seen)}%</td><td>${starts}</td><td>${+r.finishes || 0}</td></tr>`;
      }).join("")}</tbody></table>
      <p class="muted">“Seen” uses actual tile visibility, not merely a page load. Daily inherits Classic/Pro/Presti under the hood, but is normalized to its own choice here.</p>`, "wide"));

    const genericClicks = uiRows.filter((r) => r.name === "ui_click");
    const helpActions = uiRows.filter((r) => r.name !== "ui_click");
    const genericMax = Math.max(1, ...genericClicks.map((r) => +r.c || 0));
    cards.push(card("Controls · what visitors actually tap", `
      <div class="sub">top generic controls</div>
      ${genericClicks.length ? genericClicks.slice(0,20).map((r) => bar(`${human(r.surface)} · ${human(r.action)}`,+r.c||0,genericMax,`${+r.people||0} visits`)).join("") : muted("no v39 control clicks yet")}
      <div class="sub">help / hidden feature actions</div>
      <table><thead><tr><th>event</th><th>surface</th><th>action</th><th>count</th><th>visits</th><th>avg open</th></tr></thead><tbody>
        ${helpActions.length ? helpActions.map((r) => `<tr><td class="k">${esc(human(r.name))}</td><td>${esc(human(r.surface))}</td><td>${esc(human(r.action))}</td><td>${+r.c||0}</td><td>${+r.people||0}</td><td>${r.avg_ms!=null&&+r.avg_ms>0?Math.round(+r.avg_ms)+" ms":"—"}</td></tr>`).join("") : emptyRow(6)}
      </tbody></table>
      <p class="muted">Generic click rows deliberately store a stable control id/class, not button text or player names. Dedicated game events remain the source of truth for funnels.</p>`, "wide"));
  }

  // -------------------- Daily --------------------
  if (hasV3) {
    const d = (dailyFunnelRows && dailyFunnelRows[0]) || {};
    const gatePeople = +d.gate_people || 0;
    const rows = [
      ["Gate seen", +d.gate_events || 0, gatePeople, gatePeople ? "100%" : "—"],
      ["Pressed start", +d.gate_start_events || 0, +d.gate_start_people || 0, gatePeople ? pct(Math.min(gatePeople,+d.gate_start_people||0),gatePeople)+"%" : "—"],
      ["Official draft started", +d.start_events || 0, +d.start_people || 0, gatePeople ? pct(+d.matched_start_people||0,gatePeople)+"%" : "—"],
      ["Official season finished", +d.done_events || 0, +d.done_people || 0, gatePeople ? pct(+d.matched_done_people||0,gatePeople)+"%" : "—"],
      ["Share intent", +d.intent_events || 0, +d.intent_people || 0, gatePeople ? pct(+d.matched_intent_people||0,gatePeople)+"%" : "—"],
      ["Share completed", +d.share_events || 0, +d.share_people || 0, gatePeople ? pct(+d.matched_share_people||0,gatePeople)+"%" : "—"]
    ];
    cards.push(card("THE DAILY · honest funnel", `
      <table><thead><tr><th>step</th><th>events</th><th>visits</th><th>of gate</th></tr></thead>
      <tbody>${rows.map((r,i) => `<tr><td class="k">${esc(r[0])}</td><td>${r[1]}</td><td>${r[2]}</td><td${i===2 ? ' class="big"' : ''}>${r[3]}</td></tr>`).join("")}</tbody></table>
      <div class="stat3">${stat(+d.practice_start_events || 0, "practice starts")}${stat(+d.practice_done_events || 0, "practice finishes")}${stat(+d.unanchored_start_people || 0, "starts lacking gate row")}</div>
      <p class="muted">Percentages count only visits that were observed at the gate and then reached each later step. Practice is reported separately, so reruns can never push the funnel over 100%. “Lacking gate row” flags old-build coverage gaps or an unexpected bypass.</p>`, "wide"));

    cards.push(card("THE DAILY · board ledger", `
      <table><thead><tr><th>daily</th><th>rule / base</th><th>official</th><th>finish %</th><th>practice</th><th>share</th><th>friend link</th><th>beat</th></tr></thead><tbody>
        ${dailyBoardRows.length ? dailyBoardRows.slice(0,21).map((r) => {
          const os=+r.official_starts||0, of=+r.official_finishes||0, ps=+r.practice_starts||0, pf=+r.practice_finishes||0;
          return `<tr><td class="k">#${+r.daily_num||0}</td><td title="${esc(r.challenge)}">${esc(shortText(human(r.challenge),24))} · ${esc(MODE_LABEL[r.base]||human(r.base))}</td><td>${os} · ${+r.official_people||0} visits</td><td>${pct(of,os)}%</td><td>${pf}/${ps}</td><td>${+r.shares||0}/${+r.intents||0}</td><td>${+r.linked_starts||0}/${+r.current_opens||0}</td><td>${+r.beats||0}</td></tr>`;
        }).join("") : emptyRow(8)}
      </tbody></table>
      <p class="muted">Official and practice runs are separated board by board. “Friend link” is challenge game starts ÷ current-link opens; a stale Daily link is excluded from that denominator.</p>`, "wide"));
  } else {
    cards.push(card("THE DAILY · funnel", `<p class="warn">Apply <code>migrations/0006_analytics_v3.sql</code> to get a gate-matched, practice-separated funnel. The old event counts remain in the base-mode split below.</p>`, "wide"));
  }

  {
    const rowsByBase = {};
    (dailyByBaseRows || []).forEach((r) => { rowsByBase[r.base] = r; });
    cards.push(card("Games initiated · daily vs standalone", `
      <p class="muted">Classic/Pro/Presti totals include Daily runs because each Daily board inherits a base mode. This reconciles the two views.</p>
      <table><thead><tr><th>base mode</th><th>standalone</th><th>daily</th><th>daily %</th></tr></thead>
      <tbody>${TRACKED_MODES.map((m) => {
        const r = rowsByBase[m] || { standalone: 0, daily: 0 };
        const sN = +r.standalone || 0, dN = +r.daily || 0;
        return `<tr><td class="k">${MODE_LABEL[m]}</td><td>${sN}</td><td>${dN}</td><td>${pct(dN, sN + dN)}%</td></tr>`;
      }).join("")}</tbody></table>`));
  }

  if (hasV3) {
    const refMap = Object.fromEntries(dailyReferralRows.map((r) => [r.step, r]));
    const refOrder = [
      ["link_open_current","Current link opened"], ["link_open_stale","Expired/stale link opened"],
      ["gate_seen","Challenge gate seen"], ["gate_started","Pressed start"], ["game_started","Game started"],
      ["game_finished","Game finished"], ["beat_sender","Beat sender"], ["tied_sender","Tied sender"],
      ["lost_to_sender","Lost to sender"], ["reshare_intent","Next challenge intent"], ["reshared","Next challenge shared"]
    ];
    const currentOpen = +(refMap.link_open_current && refMap.link_open_current.people) || 0;
    cards.push(card("Daily friend-link loop", `
      <table><thead><tr><th>step</th><th>events</th><th>visits</th><th>of current opens</th></tr></thead>
      <tbody>${refOrder.map(([key,label]) => { const r=refMap[key]||{}; return `<tr><td class="k">${esc(label)}</td><td>${+r.c||0}</td><td>${+r.people||0}</td><td>${currentOpen && key!=="link_open_stale" ? pct(+r.people||0,currentOpen)+"%" : (key==="link_open_current" ? "100%" : "—")}</td></tr>`; }).join("")}</tbody></table>
      <p class="muted">This is the complete anonymous viral loop: link open → challenge start → finish → outcome → another share. A reload creates a new visit, so the figures are visit-level rather than person-level.</p>`, "wide"));

    const ret = returnSummary(returnRows);
    cards.push(card("Return behavior · Daily local-history proxy", `
      <div class="stat3">${stat(ret.total, "visits profiled")}${stat(ret.returning, "had Daily history")}${stat(pct(ret.returning,ret.total)+"%", "return proxy")}</div>
      <div class="sub">days since last recorded Daily</div>${ret.dayBuckets.length ? ret.dayBuckets.map((r) => bar(r.label,r.c,ret.dayMax,`${r.c} · ${pct(r.c,ret.returning)}%`)).join("") : muted("no return history yet")}
      <div class="sub">active Daily days in the 14-day feature store</div>${ret.activeBuckets.length ? ret.activeBuckets.map((r) => bar(r.label,r.c,ret.activeMax)).join("") : muted("—")}
      <div class="sub">current streak</div>${ret.streakBuckets.length ? ret.streakBuckets.map((r) => bar(r.label,r.c,ret.streakMax)).join("") : muted("—")}
      <p class="muted"><b>Not a true D1/D7 cohort.</b> No durable analytics id exists. This reports coarse counts from The Daily’s already-existing local game history; clearing storage, changing devices, or using another browser starts fresh.</p>`, "wide"));
  }

  // -------------------- game funnel and outcomes --------------------
  cards.push(card("Funnel · per visit", `
    <div class="stat3">${stat(sessions, "visits")}${stat(startRate + "%", "started tracked mode")}${stat(completeRate + "%", "runs finished")}</div>
    <p class="muted">Bounce (no Classic, Pro, or Presti start): <b>${bouncePct}%</b>. Kaman starts appear only in initiated-games charts.</p>
    <table><thead><tr><th>mode</th><th>visits</th><th>starts</th><th>finishes</th><th>finish %</th><th>start over</th><th>page exit</th></tr></thead>
    <tbody>${TRACKED_MODES.map((m) => {
      const r = funnelMap[m] || {};
      return `<tr><td class="k">${MODE_LABEL[m]}</td><td>${+r.visits || 0}</td><td>${+r.starts || 0}</td><td>${+r.finishes || 0}</td><td>${pct(+r.finishes || 0, +r.starts || 0)}%</td><td>${+r.startovers || 0}</td><td>${+r.exits || 0}</td></tr>`;
    }).join("")}</tbody></table>
    <div class="sub">round reached · by mode</div>${TRACKED_MODES.map((m) => roundBars(m, roundFunnel)).join("")}
    ${hasV2 ? "" : `<p class="warn">Analytics v2 columns are missing, so Start over cannot be separated from exits.</p>`}`, "wide"));

  if (hasV3) {
    const abandonedDurations = metricValues(runTimingRows.filter((r) => r.name === "run_abandon"), "duration");
    const abandonTotal = abandonDetailRows.reduce((sumN, r) => sumN + (+r.c || 0), 0);
    const startOverN = abandonDetailRows.filter((r) => r.reason === "start_over").reduce((sumN, r) => sumN + (+r.c || 0), 0);
    const pageExitN = abandonDetailRows.filter((r) => r.reason === "page_exit").reduce((sumN, r) => sumN + (+r.c || 0), 0);
    cards.push(card("Run abandonment · where drafts stop", `
      <div class="stat3">${stat(abandonTotal,"abandoned runs")}${stat(startOverN,"explicit Start over")}${stat(pageExitN,"page/tab exits")}</div>
      <p class="muted">Median time before abandonment: <b>${abandonedDurations.length ? esc(timeText(median(abandonedDurations))) : "—"}</b>. A page exit is sent with <code>sendBeacon</code> when available; browser termination can still lose a small number of exits.</p>
      <table><thead><tr><th>mode / path</th><th>reason</th><th>round</th><th>count</th><th>avg time</th><th>picks</th><th>rerolls</th><th>searches</th></tr></thead><tbody>
        ${abandonDetailRows.length ? abandonDetailRows.slice(0,24).map((r) => `<tr><td class="k">${esc(runPathLabel(r.mode,r.path))}</td><td>${esc(human(r.reason))}</td><td>${+r.round||0}</td><td>${+r.c||0}</td><td>${r.avg_ms!=null?esc(timeText(+r.avg_ms)):"—"}</td><td>${r.avg_picks!=null?round1(+r.avg_picks):"—"}</td><td>${r.avg_rerolls!=null?round1(+r.avg_rerolls):"—"}</td><td>${r.avg_searches!=null?round1(+r.avg_searches):"—"}</td></tr>`).join("") : emptyRow(8)}
      </tbody></table>
      <p class="muted">Terminal rows also carry the current team/era, spend split, completed picks, rerolls, searches, and run duration. The separate bailout board below aggregates team/era patterns.</p>`, "wide"));
  }

  cards.push(card("Outcomes by mode", `
    <table><thead><tr><th>mode</th><th>games</th><th>median W</th><th>mean W</th><th>82–0</th><th>82–0 w/ HH</th></tr></thead>
    <tbody>${modeRows.some((r) => r.n) ? modeRows.map((r) =>
      `<tr><td class="k">${esc(MODE_LABEL[r.mode])}</td><td>${r.n}</td><td class="big">${r.n ? r.median : "—"}</td><td>${r.n ? r.mean : "—"}</td><td>${r.undefPct}%</td><td>${r.w82Pct}%</td></tr>`
    ).join("") : emptyRow(6)}</tbody></table>
    <p class="muted">Kaman is excluded. “w/ HH” adds successful Heat Check conversions to natural 82–0 runs.</p>`));

  cards.push(card("Win distribution · by mode", distroSets.map((set) => {
    const bins = winBins(set.counts), max = Math.max(1, ...bins.map((b) => b.c));
    return `<div class="mode-block"><div class="sub">${esc(set.label)}</div>${sum(set.counts)
      ? bins.map((b) => bar(b.label, b.c, max)).join("") : muted("no completed games")}</div>`;
  }).join(""), "wide"));

  // ---- v40: Heat Check · clutch and charity ----
  {
    const hcShown = await one(`SELECT COUNT(*) c FROM events WHERE ${W} AND name='heatcheck_shown' AND mode IN ${modesSql}`, B);
    const hcAct = await q(`SELECT pulled, COUNT(*) c FROM events WHERE ${W} AND name='heatcheck_action' AND mode IN ${modesSql} GROUP BY pulled`, B);
    const hcDecl = await one(`SELECT COUNT(*) c FROM events WHERE ${W} AND name='heatcheck_declined' AND mode IN ${modesSql}`, B);
    const hcSegs = await q(`SELECT COALESCE(segment,'?') segment, COUNT(*) c, SUM(COALESCE(hit_82,0)) h
       FROM events WHERE ${W} AND name='heatcheck_result' AND mode IN ${modesSql} GROUP BY segment ORDER BY c DESC`, B);
    const shownN = +((hcShown || {}).c) || 0;
    const pulledN = hcAct.filter((r) => +r.pulled === 1).reduce((a, r) => a + (+r.c || 0), 0);
    const declinedN = +((hcDecl || {}).c) || 0;
    const silentN = hcAct.filter((r) => +r.pulled === 0).reduce((a, r) => a + (+r.c || 0), 0);
    const segMax = Math.max(1, ...hcSegs.map((r) => +r.c || 0));
    const hit82 = hcSegs.reduce((a, r) => a + (+r.h || 0), 0);
    cards.push(card("Heat Check · clutch and charity", shownN
      ? `<div class="stat3">${stat(shownN, "shown (81-0 moments)")}${stat(pct(pulledN, shownN) + "%", "pulled the ball")}${stat(pct(hit82, Math.max(1, pulledN)) + "%", "of pulls hit 82-0")}</div>
         <div class="stat3">${stat(declinedN, "refused the charity")}${stat(silentN, "silent skips")}${stat(pct(declinedN + silentN, shownN) + "%", "walked away at 81")}</div>
         <div class="sub">where the wheel landed</div>${hcSegs.map((r) => bar(r.segment, +r.c || 0, segMax, `${r.c} spins · ${r.h} hit 82`)).join("")}
         <p class="muted">"I don't want your charity" ships in v37+ clients; silent skips before that are inferred from un-pulled dismissals. Both leave the record at 81–0.</p>`
      : muted("no 81-0 moments in this scope yet")));
  }

  // ---- v40: Scoring Card · tax incidence (the fences, measured live) ----
  {
    const TAXES = [["t_usage", "Usage"], ["t_spacing", "Spacing"], ["t_backd", "Backcourt D"], ["t_wingd", "Wing D"], ["t_rim", "Rim protection"], ["t_glass", "Glass"], ["t_creator", "No creator"], ["t_age", "Mileage"]];
    if (!hasV40) {
      cards.push(card("Scoring Card · tax incidence", muted("Analytics v40 migration required (migrations/0007_tax_telemetry.sql). Rows collect the moment it lands; no backfill.")));
    } else {
      const sums = TAXES.map(([c]) => `SUM(CASE WHEN ${c}>0 THEN 1 ELSE 0 END) f_${c}, AVG(CASE WHEN ${c}>0 THEN ${c} END) a_${c}`).join(", ");
      const taxRows = await q(`SELECT mode, COUNT(*) n, ${sums},
           AVG(COALESCE(b_spacing,0)) avg_bonus,
           AVG(${TAXES.map(([c]) => `COALESCE(${c},0)`).join("+")}) avg_total
         FROM events WHERE ${W} AND name='game_complete' AND mode IN ${modesSql} AND t_usage IS NOT NULL
         GROUP BY mode ORDER BY mode`, B);
      cards.push(card("Scoring Card · tax incidence", taxRows.length
        ? taxRows.map((r) => `<div class="mode-block"><div class="sub">${esc(String(r.mode))} · ${+r.n} taxed completes · avg total tax ${(+r.avg_total || 0).toFixed(2)} · avg spacing bonus ${(+r.avg_bonus || 0).toFixed(2)}</div>
            ${TAXES.map(([c, label]) => bar(label, +r["f_" + c] || 0, Math.max(1, +r.n), `${pct(+r["f_" + c] || 0, +r.n)}% fire · avg ${r["a_" + c] != null ? (+r["a_" + c]).toFixed(2) : "—"}`)).join("")}</div>`).join("")
        : muted("no v40 rows yet — the Scoring Card starts recording at the first post-deploy finish"), "wide"));
    }
  }

  // ---- v40: Pool coverage · the half that never gets picked ----
  {
    const cov = await one(`SELECT COUNT(DISTINCT player || '|' || COALESCE(season,'')) ps, COUNT(DISTINCT player) p, COUNT(*) picks
       FROM events WHERE ${W} AND name='draft_pick' AND player IS NOT NULL`, B);
    const POOL_ROWS = 21525, POOL_NAMES = 3509;   // site_data.json pool size at v39/v40 build time
    const ps = +((cov || {}).ps) || 0, pn = +((cov || {}).p) || 0, pk = +((cov || {}).picks) || 0;
    cards.push(card("Pool coverage · the half that never gets picked", pk
      ? `<div class="stat3">${stat(pct(ps, POOL_ROWS) + "%", "of " + POOL_ROWS + " player-seasons ever drafted")}${stat(pct(pn, POOL_NAMES) + "%", "of " + POOL_NAMES + " players ever drafted")}${stat(pk, "total picks in scope")}</div>
         <p class="muted">The owner's thesis, measured: balance simulations weight what humans actually pick, and this is the honest denominator. Pool constants are build-time; re-pin them when the dataset refreshes.</p>`
      : muted("no draft_pick rows in this scope")));
  }

  cards.push(card("Engagement · medians", `
    <div class="stat3">${stat(durations.length ? round1(median(durations)) + "s" : "—", "wall-clock visit")}${stat(engaged.length ? round1(median(engaged)) + "s" : "—", "foreground active")}${stat(gamesPerVisit.length ? median(gamesPerVisit) : "—", "games / visit")}</div>
    <div class="stat3">${stat(deepest.length ? median(deepest) : "—", "deepest round")}${stat(interactions.length ? median(interactions) : "—", "control clicks")}${stat(scrolls.length ? median(scrolls) + "%" : "—", "max page scroll")}</div>
    <p class="muted">Foreground active time stops accruing after 30 seconds without input; wall-clock time still includes inactive foreground and background time. Per-visit average wins vs tracked games initiated: ${corr === null ? "<b>n/a</b>" : `<b>r = ${corr}</b> across ${corrPts.length} visits ${corrWord(corr)}.`}</p>
    <div class="sub">median result by games initiated that visit</div>${winByDepth.length ? winByDepth.map((r) => bar(r.label, r.median, 82, `${round1(r.median)} W · n=${r.n}`)).join("") : muted("not enough completed visits")}`));

  if (hasV3) {
    const milestoneDefs = [
      ["first_interaction_ms", "first interaction"],
      ["mode_select_ms", "mode selected"],
      ["daily_gate_start_ms", "Daily start pressed"],
      ["game_start_ms", "first game started"],
      ["game_complete_ms", "first game finished"]
    ];
    const terminalDefs = [
      ["Daily completed", (r) => r.name === "game_complete" && /^daily/.test(r.path)],
      ["Classic completed", (r) => r.name === "game_complete" && r.path === "standalone" && r.mode === "classic"],
      ["Presti completed", (r) => r.name === "game_complete" && r.path === "standalone" && r.mode === "cap"],
      ["Pro completed", (r) => r.name === "game_complete" && r.path === "standalone" && r.mode === "pro"],
      ["Start over", (r) => r.name === "run_abandon" && r.reason === "start_over"],
      ["Page/tab exit", (r) => r.name === "run_abandon" && r.reason === "page_exit"]
    ];
    cards.push(card("Time to value · visit and run milestones", `
      <div class="sub">from page open</div>
      <table><thead><tr><th>milestone</th><th>median</th><th>p75</th><th>visits</th></tr></thead><tbody>
        ${milestoneDefs.map(([key,label]) => {
          const vals=metricValues(milestoneRows,key);
          return `<tr><td class="k">${esc(label)}</td><td>${vals.length?esc(timeText(median(vals))):"—"}</td><td>${vals.length?esc(timeText(quantile(vals,.75))):"—"}</td><td>${vals.length}</td></tr>`;
        }).join("")}
      </tbody></table>
      <div class="sub">run duration</div>
      <table><thead><tr><th>run group</th><th>median</th><th>p75</th><th>runs</th></tr></thead><tbody>
        ${terminalDefs.map(([label,test]) => {
          const vals=metricValues(runTimingRows.filter(test),"duration");
          return `<tr><td class="k">${esc(label)}</td><td>${vals.length?esc(timeText(median(vals))):"—"}</td><td>${vals.length?esc(timeText(quantile(vals,.75))):"—"}</td><td>${vals.length}</td></tr>`;
        }).join("")}
      </tbody></table>
      <p class="muted">Visit milestones use the earliest matching event in each in-memory visit. Run duration starts at <code>game_start</code>. Tables use up to the latest 10,000 rows in the selected scope.</p>`, "wide"));
  }

  // -------------------- draft behavior --------------------
  if (hasV3) {
    const draftSummary = summarizeDraft(draftRows);
    cards.push(card("Draft behavior · actions per started run", `
      <table><thead><tr><th>action</th><th>events</th><th>runs</th><th>per start</th></tr></thead>
      <tbody>${draftSummary.length ? draftSummary.map((r) => `<tr><td class="k">${esc(r.label)}</td><td>${r.c}</td><td>${r.runs}</td><td>${round2(r.c/Math.max(1,trackedStarts))}</td></tr>`).join("") : emptyRow(4)}</tbody></table>
      <p class="muted">Search records query length and result count only, never the typed player name. Player selections and drafted players are game content, not identity.</p>`));

    const searchTotal = searchDetailRows.length;
    const searchZero = searchDetailRows.filter((r) => r.outcome === "zero_results").length;
    const queryLens = metricValues(searchDetailRows,"query_len");
    const resultCounts = metricValues(searchDetailRows,"result_count");
    const searchGroupsMap = {};
    searchDetailRows.forEach((r) => {
      const label = runPathLabel(r.mode,r.path);
      const g = searchGroupsMap[label] || (searchGroupsMap[label] = { label, rows: [], zero: 0 });
      g.rows.push(r);
      if (r.outcome === "zero_results") g.zero += 1;
    });
    const searchGroups = Object.values(searchGroupsMap).sort((a,b) => b.rows.length-a.rows.length);
    cards.push(card("Search behavior · query text never stored", `
      <div class="stat3">${stat(searchTotal,"searches")}${stat(pct(searchZero,searchTotal)+"%","zero-result")}${stat(queryLens.length?median(queryLens)+" chars":"—","median query length")}</div>
      <p class="muted">Median returned pool size: <b>${resultCounts.length?round1(median(resultCounts)):"—"}</b>. Only character count, number of matching rows, mode/path, and whether the search returned zero results are sent.</p>
      <table><thead><tr><th>mode / path</th><th>searches</th><th>zero %</th><th>median chars</th><th>median results</th></tr></thead><tbody>
        ${searchGroups.length ? searchGroups.map((g) => { const lens=metricValues(g.rows,"query_len"), results=metricValues(g.rows,"result_count"); return `<tr><td class="k">${esc(g.label)}</td><td>${g.rows.length}</td><td>${pct(g.zero,g.rows.length)}%</td><td>${lens.length?round1(median(lens)):"—"}</td><td>${results.length?round1(median(results)):"—"}</td></tr>`; }).join("") : emptyRow(5)}
      </tbody></table>
      <p class="muted">This card uses up to the latest 10,000 search events in scope. It cannot reveal which player was typed, by design.</p>`, "wide"));

    const pickMax = Math.max(1, ...topPickRows.map((r) => +r.c || 0));
    cards.push(card("Drafted most often", topPickRows.length
      ? topPickRows.slice(0,15).map((r) => bar(`${r.player} · ${r.season} · ${MODE_LABEL[r.mode] || r.mode}`, +r.c || 0, pickMax, `${r.c} · ${r.slot || "?"}`)).join("")
      : muted("no v39 draft-pick rows yet")));

    const denyMax = Math.max(1, ...denyRows.map((r) => +r.c || 0));
    const rerollMax = Math.max(1, ...rerollRows.map((r) => +r.c || 0));
    cards.push(card("Draft friction · denials and rerolls", `
      <div class="sub">denied picks</div>${denyRows.length ? denyRows.map((r) => bar(shortText(human(r.action),28),+r.c||0,denyMax,`${r.c} · ${r.runs} runs`)).join("") : muted("none recorded")}
      <div class="sub">rerolls</div>${rerollRows.length ? rerollRows.map((r) => bar(`${human(r.action)} · ${human(r.outcome)}`,+r.c||0,rerollMax,`${r.c}${+r.spend ? " · $"+round1(r.spend) : ""}`)).join("") : muted("none recorded")}`));
  }

  cards.push(card("Presti economy", hasV2 ? prestiEconomy(prestiRows) : `<p class="warn">Analytics v2 columns are required for player/reroll spend splits.</p>`));
  cards.push(card("Start-over bailout board", hasV2 ? bailoutBoard(exposureRows, startOverRows) : `<p class="warn">Analytics v2 columns are required for team/era bailout dimensions.</p>`, "wide"));

  // -------------------- results and sharing --------------------
  if (hasV3) {
    const resultsTotal = resultRows.filter((r) => r.name === "results_view").reduce((s,r)=>s+(+r.runs||+r.c||0),0);
    const sections = resultRows.filter((r) => r.name === "result_section_view");
    const sectionOrder = ["summary","two_way","roster","goat_climb","scoring_card","replay"];
    const sectionMap = Object.fromEntries(sections.map((r) => [r.action,r]));
    const replayN = resultRows.filter((r)=>r.name==="replay").reduce((s,r)=>s+(+r.c||0),0);
    const pctOk = resultRows.filter((r)=>r.name==="percentile_result").reduce((s,r)=>s+(+r.c||0),0);
    const pctErr = resultRows.filter((r)=>r.name==="percentile_error").reduce((s,r)=>s+(+r.c||0),0);
    cards.push(card("Results · section reach", `
      <div class="stat3">${stat(resultsTotal,"result runs")}${stat(replayN,"replays")}${stat(pct(replayN,resultsTotal)+"%","replay / result")}</div>
      ${sectionOrder.map((k) => { const r=sectionMap[k]||{}; const n=+r.runs||+r.c||0; return bar(human(k),n,Math.max(1,resultsTotal),`${n} · ${pct(n,resultsTotal)}%`); }).join("")}
      <p class="muted">Section reach begins with v39. Percentile API: <b>${pctOk}</b> successes · <b>${pctErr}</b> errors.</p>`));

    // Kaman is a hidden guaranteed-82–0 easter egg. Keep its raw events for
    // operational visibility, but never let them inflate the canonical share
    // conversion rate or the record/rank propensity tables.
    const sh = shareKpis;
    const kamanSh = shareSummary(kamanShareRows);
    const shareByResult = shareResultBreakdown(canonicalShareRows,allCounts);
    const shareByPercentile = sharePercentileBreakdown(canonicalShareRows);
    cards.push(card("Sharing · intent to handoff", `
      <div class="stat3">${stat(sh.intents,"intents")}${stat(sh.completed,"completed")}${stat(pct(sh.completed,sh.intents)+"%","completion / intent")}</div>
      <p class="muted">Canceled native sheets: <b>${sh.canceled}</b> · errors/manual reveal: <b>${sh.errors}</b> · completed shares per tracked finish: <b>${pct(sh.completed,completesN)}%</b>.</p>
      <div class="sub">by surface / path</div>${sh.paths.length ? sh.paths.map((r)=>bar(r.label,r.intents,Math.max(1,sh.pathMax),`${r.completed}/${r.intents} · ${pct(r.completed,r.intents)}%`)).join("") : muted("no v39 share intent yet")}
      <div class="sub">completion method</div>${sh.methods.length ? sh.methods.map((r)=>bar(human(r.action),r.c,sh.methodMax,`${r.c} · ${pct(r.c,sh.completed)}%`)).join("") : muted("—")}
      <div class="sub">device / browser health</div>${sh.devices.length ? sh.devices.map((r)=>bar(r.label,r.intents,sh.deviceMax,`${r.completed}/${r.intents} · ${pct(r.completed,r.intents)}%`)).join("") : muted("—")}
      <div class="sub">by result · does credential value create intent?</div>
      <table><thead><tr><th>record</th><th>finishes</th><th>intents</th><th>intent / finish</th><th>completed</th></tr></thead><tbody>
        ${shareByResult.length ? shareByResult.map((r)=>`<tr><td class="k">${esc(r.label)}</td><td>${r.finishes||"—"}</td><td>${r.intents}</td><td>${r.finishes?pct(r.intents,r.finishes)+"%":"—"}</td><td>${r.completed} · ${pct(r.completed,r.intents)}%</td></tr>`).join("") : emptyRow(5)}
      </tbody></table>
      <div class="sub">by Top X% rank available at tap</div>
      <table><thead><tr><th>rank</th><th>intents</th><th>completed</th><th>completion</th></tr></thead><tbody>
        ${shareByPercentile.length ? shareByPercentile.map((r)=>`<tr><td class="k">${esc(r.label)}</td><td>${r.intents}</td><td>${r.completed}</td><td>${pct(r.completed,r.intents)}%</td></tr>`).join("") : emptyRow(4)}
      </tbody></table>
      <p class="muted">Canonical rates exclude Kaman so the numerator and denominator both match tracked Classic/Pro/Presti finishes. Kaman easter-egg telemetry: <b>${kamanSh.intents}</b> intents · <b>${kamanSh.completed}</b> completed. Rank is attached only when the percentile response arrived before the tap; “rank not ready” exposes that latency rather than guessing.</p>`, "wide"));
  } else {
    const oldShareRows = await q(`SELECT COALESCE(undefeated,0) u, COUNT(*) c FROM events WHERE ${W} AND name='share' AND mode IN ${modesSql} GROUP BY u`, B);
    const shareU = pick(oldShareRows, "u", 1), shareO = pick(oldShareRows, "u", 0), total = shareU + shareO;
    cards.push(card("Sharing", `<div class="stat3">${stat(total,"shares")}${stat(pct(total,completesN)+"%","of finishes")}${stat(pct(shareU,total)+"%","were 82–0")}</div><p class="muted">Apply analytics v3 for intent, cancellation, method, surface, path, device, and browser diagnostics.</p>`));
  }

  // -------------------- Tribune and AI recap --------------------
  const recapRows = hasV3 ? recapRowsV3 : newspaperRowsLegacy;
  const recapPresented = countNamed(recapRows, "recap_presented");
  const recapOpened = countNamed(recapRows, "recap_unwrap");
  const recapFull = countNamed(recapRows, "recap_full_read");
  const recapActions = {};
  recapRows.filter((r) => r.name === "recap_action").forEach((r) => {
    const key = r.variant && r.variant !== "unknown" ? r.variant : r.action;
    recapActions[key] = (recapActions[key] || 0) + (+r.c || 0);
  });
  cards.push(card("Newspaper · in-game", `
    <div class="stat3">${stat(recapPresented,"presented")}${stat(pct(recapOpened,recapPresented)+"%","opened")}${stat(pct(recapFull,recapOpened)+"%","full-read proxy")}</div>
    <p class="muted">Full read = article bottom reached or completed story stayed visible for a length-aware 7–12 second foreground dwell.</p>
    <div class="sub">button actions</div>${actionBars(recapActions, recapPresented)}`));

  if (hasV3) {
    const genStart = recapRowsV3.filter((r)=>r.name==="recap_generation"&&r.action==="start").reduce((s,r)=>s+(+r.c||0),0);
    const genApi = recapRowsV3.filter((r)=>r.name==="recap_generation"&&r.outcome==="api").reduce((s,r)=>s+(+r.c||0),0);
    const genFallback = recapRowsV3.filter((r)=>r.name==="recap_generation"&&r.outcome==="fallback").reduce((s,r)=>s+(+r.c||0),0);
    const publishOk = recapRowsV3.filter((r)=>r.name==="recap_publish"&&r.outcome==="success").reduce((s,r)=>s+(+r.c||0),0);
    const publishErr = recapRowsV3.filter((r)=>r.name==="recap_publish"&&r.outcome==="error").reduce((s,r)=>s+(+r.c||0),0);
    const avgApiMs = weightedAverage(recapRowsV3.filter((r)=>r.name==="recap_generation"&&r.outcome==="api"),"avg_ms","c");
    cards.push(card("Tribune · generation reliability", `
      <div class="stat3">${stat(genStart,"generation starts")}${stat(pct(genApi,genApi+genFallback)+"%","AI success")}${stat(avgApiMs ? Math.round(avgApiMs)+" ms" : "—","avg AI completion")}</div>
      <p class="muted">AI editions <b>${genApi}</b> · local fallback <b>${genFallback}</b> · publish success <b>${publishOk}</b> · publish errors <b>${publishErr}</b>.</p>`));
  }

  const RW = scope.all ? "1=1" : "created_ts>=? AND created_ts<?";
  const RB = scope.all ? [] : [scope.start, scope.end];
  const recapTotals = hasRecaps ? await one(
    `SELECT COUNT(*) c,
       SUM(CASE WHEN COALESCE(views_raw,0)=0 AND COALESCE(views_human,0)=0 THEN 1 ELSE 0 END) orphan,
       SUM(CASE WHEN COALESCE(views_raw,0)>0 AND COALESCE(views_human,0)=0 THEN 1 ELSE 0 END) fetched_no_human,
       SUM(CASE WHEN COALESCE(views_human,0)>0 THEN 1 ELSE 0 END) opened_editions,
       COALESCE(SUM(views_raw),0) vr,COALESCE(SUM(views_human),0) vh
     FROM recaps WHERE ${RW}`, RB) : null;
  const recapTop = hasRecaps ? await q(
    `SELECT id,nickname,wins,views_human,views_raw FROM recaps WHERE ${RW}
     ORDER BY views_human DESC,views_raw DESC,created_ts DESC LIMIT 8`, RB) : [];
  const refStarts = hasRecaps ? await one(
    `SELECT COUNT(*) c FROM events WHERE ${W} AND name='game_start' AND variant LIKE 'recap:%'`, B) : null;
  cards.push(card("Tribune share pages", hasRecaps ? `
    <div class="stat3">${stat(cnt(recapTotals),"editions minted")}${stat(recapTotals ? +recapTotals.vh||0 : 0,"in-page open beacons")}${stat(cnt(refStarts),"games started via link")}</div>
    <div class="stat3">${stat(recapTotals ? +recapTotals.orphan||0 : 0,"never fetched")}${stat(recapTotals ? +recapTotals.fetched_no_human||0 : 0,"fetched, no beacon")}${stat(recapTotals ? +recapTotals.opened_editions||0 : 0,"editions opened")}</div>
    <table><thead><tr><th>edition</th><th>record</th><th>beacons</th><th>fetches</th></tr></thead>
    <tbody>${recapTop.length ? recapTop.map((r) => { const rid=String(r.id||""); const href=/^[A-Z0-9][A-Za-z0-9_-]{4}$/.test(rid)?"/"+rid:"/r/"+rid; return `<tr><td><a href="${esc(href)}">${esc(shortText(r.nickname || r.id,36))}</a></td><td>${+r.wins || 0}–${82-(+r.wins||0)}</td><td>${+r.views_human||0}</td><td>${+r.views_raw||0}</td></tr>`; }).join("") : emptyRow(4)}</tbody></table>
    <p class="muted">“Never fetched” means no GET ever reached the edition. “Fetched, no beacon” includes unfurl crawlers and other non-browser loads; it is not automatically a proven send. In-page open beacons mean JavaScript ran on the edition page; reloads can count again, so this is not unique people. Referral starts are attributed to the first game launched after opening the edition.</p>` : muted("The recaps table is unavailable; apply the Tribune migration."), "wide"));

  // -------------------- outbound / feedback / tech --------------------
  if (hasV3) {
    const linkMax = Math.max(1, ...linkRows.map((r)=>+r.c||0));
    const bb = linkRows.filter((r)=>/basketball-reference\.com$/i.test(r.host)).reduce((s,r)=>s+(+r.c||0),0);
    const linkTotal = linkRows.reduce((s,r)=>s+(+r.c||0),0);
    cards.push(card("Outbound links · Sports Reference thesis", `
      <div class="stat3">${stat(linkTotal,"outbound clicks")}${stat(bb,"Basketball-Reference")}${stat(pct(bb,completesN)+"%","BBRef clicks / finish")}</div>
      ${linkRows.length ? linkRows.map((r)=>bar(`${r.host} · ${human(r.surface)} · ${human(r.action)}`,+r.c||0,linkMax,`${r.c} · ${r.people} visits`)).join("") : muted("no outbound clicks yet")}
      <p class="muted">Only destination host, stable in-app surface/action, and a sanitized path class are stored; no full outbound URL or search term is retained.</p>`, "wide"));

    const fbTotal = feedbackRows.reduce((s,r)=>s+(+r.c||0),0);
    const fbMax = Math.max(1,...feedbackRows.map((r)=>+r.c||0));
    cards.push(card("Feedback clicks", fbTotal ? `<div class="stat3">${stat(fbTotal,"clicks")}${stat(feedbackRows.length,"messages")}${stat(pct(fbTotal,completesN)+"%","of finishes")}</div>${feedbackRows.map((r)=>bar(shortText(r.message,34),+r.c||0,fbMax)).join("")}` : muted("no feedback clicks yet")));

    const interaction = interactionRow || {};
    cards.push(card("Front door · interaction and data", `
      <div class="stat3">${stat(+interaction.visits||0,"visits")}${stat(pct(+interaction.interacted||0,+interaction.visits||0)+"%","interacted")}${stat(interaction.avg_first_ms!=null ? Math.round(+interaction.avg_first_ms)+" ms" : "—","avg first action")}</div>
      <p class="muted">Home rendered for <b>${+interaction.home_people||0}</b> visits · data ready for <b>${+interaction.ready_people||0}</b> · data error for <b>${+interaction.error_people||0}</b>.</p>`));

    const techKinds = ["device","browser","os","country","connection","nav_type","local_hour"];
    const techHtml = techKinds.map((kind)=>{
      const rows=techRows.filter((r)=>r.kind===kind).sort((a,b)=>(+b.c||0)-(+a.c||0)).slice(0,kind==="local_hour"?24:10);
      const max=Math.max(1,...rows.map((r)=>+r.c||0));
      return `<div class="tech-col"><div class="sub">${esc(human(kind))}</div>${rows.length?rows.map((r)=>bar(kind==="local_hour"&&r.v!=="unknown"?`${String(r.v).padStart(2,"0")}:00`:r.v,+r.c||0,max)).join(""):muted("—")}</div>`;
    }).join("");
    cards.push(card("Traffic & environment", `<div class="tech-grid">${techHtml}</div>`, "wide"));

    const ttfbVals=metricValues(perfRawRows,"ttfb_ms"), lcpVals=metricValues(perfRawRows,"lcp_ms"), inpVals=metricValues(perfRawRows,"inp_ms"), clsVals=metricValues(perfRawRows,"cls"), loadVals=metricValues(perfRawRows,"load_ms");
    cards.push(card("Performance · anonymous page summaries", `
      <table><thead><tr><th>metric</th><th>median</th><th>p75</th><th>samples</th></tr></thead><tbody>
        ${metricTableRow("TTFB",ttfbVals,"ms")}${metricTableRow("LCP",lcpVals,"ms")}${metricTableRow("INP",inpVals,"ms")}${metricTableRow("Load",loadVals,"ms")}${metricTableRow("CLS",clsVals,"")}
      </tbody></table>
      <p class="muted">Up to the latest 5,000 page summaries in scope. Browser support varies; unavailable metrics stay null rather than becoming fake zeroes. Current arithmetic means: TTFB <b>${perfRow&&perfRow.ttfb!=null?perfRow.ttfb+" ms":"—"}</b> · LCP <b>${perfRow&&perfRow.lcp!=null?perfRow.lcp+" ms":"—"}</b> · INP <b>${perfRow&&perfRow.inp!=null?perfRow.inp+" ms":"—"}</b>.</p>`));

    const errorTotal=errorRows.reduce((s,r)=>s+(+r.c||0),0);
    cards.push(card("Errors & fallbacks · all tracked paths", `
      <div class="stat3">${stat(errorTotal,"events")}${stat(sessions?round2(1000*errorTotal/sessions):"—","per 1K visits")}${stat(errorRows.length,"signatures")}</div>
      <table><thead><tr><th>type</th><th>action</th><th>outcome/code</th><th>status</th><th>count</th><th>last</th></tr></thead><tbody>
        ${errorRows.length ? errorRows.map((r)=>`<tr><td class="k">${esc(human(r.name))}</td><td>${esc(human(r.action))}</td><td>${esc(shortText((r.outcome&&r.outcome!=="unknown"?r.outcome+" · ":"")+r.error_code,34))}</td><td>${+r.http_status||"—"}</td><td>${+r.c||0}</td><td>${r.last_seen?esc(ageText(now-(+r.last_seen||0))):"—"}</td></tr>`).join("") : emptyRow(6)}
      </tbody></table>
      <p class="muted">Includes client/resource exceptions, game-data failures, share/percentile errors, blocked or failed Tribune publishing, and local Tribune fallbacks. Messages are capped and scrubbed of URLs and long token-like strings.</p>`, "wide"));
  } else {
    cards.push(card("Traffic & tech", `<p class="muted">Average data load <b>${loadRow && loadRow.ms != null ? loadRow.ms+" ms" : "—"}</b> · load errors <b>${errors}</b>. Apply analytics v3 for entry, campaign, page, browser, OS, performance, outbound, and scrubbed error diagnostics.</p>`));
  }

  if (!hasV3) cards.push(card("Heat Check", `
    <div class="stat3">${stat(shown,"shown")}${stat(pullRate+"%","pull rate")}${stat(hitTotal,"hit 82–0")}</div>
    <p class="muted">pulled <b>${pulled}</b> · skipped <b>${skipped}</b></p>
    <div class="sub">segment landed · hits</div>${hcSeg.length ? hcSeg.map((r)=>bar(r.segment,+r.c||0,segMax,`${r.c}${(+r.h||0)?" · "+r.h:""}`)).join("") : muted("no spins yet")}`));

  cards.push(card("Games initiated · mode", modeMix.length
    ? modeMix.map((r)=>bar(MODE_LABEL[r.mode]||r.mode,+r.c||0,modeMax)).join("") + `<p class="muted">This raw game-level chart includes Kaman. Daily runs remain inside their inherited base mode; use the split above.</p>`
    : muted("no starts yet")));

  const migrationWarnings = [];
  if (!hasV2) migrationWarnings.push(`<b>Analytics v2 columns are missing.</b> Spend/bailout detail cannot be stored.`);
  if (!hasV3) migrationWarnings.push(`<b>Analytics v3 migration required.</b> Apply <code>migrations/0006_analytics_v3.sql</code>; the endpoint fails soft, but v39 cards cannot populate until the columns exist.`);
  const migrationWarning = migrationWarnings.length ? `<div class="migration">${migrationWarnings.join("<br>")}</div>` : "";
  const debugOn = url.searchParams.get("debug") === "1";
  if (queryErrors.length || debugOn) {
    cards.push(card("Dashboard diagnostics", `
      <div class="stat4">${stat(queryErrors.length,"failed queries")}${stat(querySeq,"queries attempted")}${stat(hasRetention?"yes":"no","retention schema")}${stat(hasRetentionCoverage?"yes":"no","coverage schema")}</div>
      ${queryErrors.length ? `<table><thead><tr><th>query</th><th>error</th><th>statement</th></tr></thead><tbody>${queryErrors.map((e)=>`<tr><td class="k">${esc(e.id)}</td><td class="warncell">${esc(e.message)}</td><td title="${esc(e.statement)}">${esc(shortText(e.statement,90))}</td></tr>`).join("")}</tbody></table>` : `<p class="okcell">All dashboard queries completed successfully.</p>`}
      <p class="muted">Append <code>&amp;debug=1</code> to keep this card visible after the error is gone. Query ids and SQL summaries identify the exact failing card without exposing data or changing the database.</p>`, "wide diagnostics"));
  }
  const firstQueryError = queryErrors[0];
  const queryWarning = firstQueryError ? `<div class="migration bad"><b>Dashboard query warning [${esc(firstQueryError.id)}]:</b> ${esc(firstQueryError.message)}${queryErrors.length>1?` <span class="muted">(${queryErrors.length} queries reported errors)</span>`:""}</div>` : "";

  const header = `<div class="head"><div><h1>TRUE 82 <span class="dot">·</span> analytics</h1>
      <div class="muted">${sessions.toLocaleString()} visits · ${startsAll.toLocaleString()} games initiated · ${completesN.toLocaleString()} tracked games finished · ${esc(scope.label)}${requestedBuild?` · build ${esc(requestedBuild)}`:""}</div></div>
      <button class="refresh" onclick="location.reload()">refresh</button></div>
    ${filters(url,scope,buildRows,requestedBuild,hasV3)}${migrationWarning}${queryWarning}`;

  const privacyNote = `<section class="privacy"><b>Privacy boundary:</b> ordinary product analytics remains anonymous and session-scoped. The separate retention stream uses one random first-party TRUE 82 browser id, stored in a secure first-party cookie with local-storage fallback for up to 400 days. No account, fingerprint, IP-derived id, ad network, sale/sharing, or cross-site enrichment. Consent regions, unknown/Tor geolocation, and explicit site opt-out are disabled; DNT/GPC are observed but do not suppress first-party product measurement.</section>`;
  const buildStamp = `<p class="muted" style="text-align:center;margin-top:28px;opacity:.65">dashboard v42.2 · first-party retention · ${new Date().toISOString().slice(0,16).replace("T"," ")} UTC</p>`;
  return html(page("TRUE 82 · analytics", header + privacyNote + `<div class="grid">${cards.join("")}</div>` + buildStamp));
}

/* ---------- dashboard calculations ---------- */
function queryLimiter(max) {
  let active = 0;
  const waiting = [];
  return async function withSlot(run) {
    if (active >= max) await new Promise((resolve) => waiting.push(resolve));
    active += 1;
    try { return await run(); }
    finally {
      active -= 1;
      const next = waiting.shift();
      if (next) next();
    }
  };
}
function queryFailure(id, error, sql) {
  const message = String(error && error.message || error || "unknown D1 error").slice(0, 260);
  const statement = String(sql || "").replace(/\s+/g, " ").trim().slice(0, 220);
  return { id, message, statement };
}
function growthStep(label, n, d, advice) {
  return { label, n: +n || 0, d: +d || 0, rate: pct(n, d), advice };
}
function cnt(row) { return row && row.c != null ? +row.c : 0; }
function round1(n) { return Math.round((+n || 0) * 10) / 10; }
function round2(n) { return Math.round((+n || 0) * 100) / 100; }
function pct(n, d) { return d ? round1(100 * (+n || 0) / (+d || 1)) : 0; }
function maturePct(n, d) { return +d > 0 ? `${pct(n,d)}%` : "—"; }
function sum(a) { return a.reduce((s, x) => s + (+x || 0), 0); }
function numSort(a, b) { return a - b; }
function pick(rows, key, val) { const r = rows.find((x) => +x[key] === val); return r ? +r.c || 0 : 0; }
function median(sorted) {
  if (!sorted.length) return 0;
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : round1((sorted[m - 1] + sorted[m]) / 2);
}
function quantile(sorted, p) {
  if (!sorted.length) return null;
  const at = Math.max(0, Math.min(sorted.length - 1, (sorted.length - 1) * p));
  const lo = Math.floor(at), hi = Math.ceil(at);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
}
function metricValues(rows, key) {
  return (rows || []).filter((r) => r[key] !== null && r[key] !== undefined && Number.isFinite(+r[key]))
    .map((r) => +r[key]).sort(numSort);
}
function metricFmt(n, suffix) {
  if (n === null || n === undefined || !Number.isFinite(+n)) return "—";
  return suffix === "ms" ? Math.round(+n) + " ms" : String(Math.round((+n) * 1000) / 1000);
}
function metricTableRow(label, values, suffix) {
  return `<tr><td class="k">${esc(label)}</td><td>${metricFmt(quantile(values,.5),suffix)}</td><td>${metricFmt(quantile(values,.75),suffix)}</td><td>${values.length}</td></tr>`;
}
function weightedMedian(counts) {
  const n = sum(counts);
  if (!n) return 0;
  const a = (n - 1) / 2, b = n / 2;
  let seen = 0, lo = 0, hi = 0, gotLo = false;
  for (let i = 0; i < counts.length; i++) {
    seen += counts[i];
    if (!gotLo && seen > a) { lo = i; gotLo = true; }
    if (seen > b) { hi = i; break; }
  }
  return n % 2 ? hi : round1((lo + hi) / 2);
}
function weightedMean(counts) { const n = sum(counts); return n ? counts.reduce((s,c,w)=>s+c*w,0)/n : 0; }
function weightedAverage(rows, valueKey, countKey) {
  const d = rows.reduce((s,r)=>s+(+r[countKey]||0),0);
  return d ? rows.reduce((s,r)=>s+(+r[valueKey]||0)*(+r[countKey]||0),0)/d : 0;
}
function winBins(counts) {
  const range = (lo, hi) => counts.slice(lo, hi + 1).reduce((s, c) => s + c, 0);
  const out = [{ label: "<64", c: range(0,63) }, { label: "64–69", c: range(64,69) }, { label: "70–75", c: range(70,75) }];
  for (let w=76; w<=82; w++) out.push({ label:String(w), c:counts[w]||0 });
  return out;
}
function pearson(pts) {
  const n=pts.length, sx=pts.reduce((s,p)=>s+p[0],0), sy=pts.reduce((s,p)=>s+p[1],0);
  const sxx=pts.reduce((s,p)=>s+p[0]*p[0],0), syy=pts.reduce((s,p)=>s+p[1]*p[1],0), sxy=pts.reduce((s,p)=>s+p[0]*p[1],0);
  const cov=n*sxy-sx*sy, dx=Math.sqrt(n*sxx-sx*sx), dy=Math.sqrt(n*syy-sy*sy);
  return dx&&dy ? cov/(dx*dy) : 0;
}
function corrWord(r) { const a=Math.abs(r); return a<.1?"(flat)":a<.3?"(weak)":a<.6?"(moderate)":"(strong)"; }
function engagementBuckets(rows) {
  const groups={};
  rows.forEach((r)=>{ const g=+r.games||0,label=g>=5?"5+":String(g); (groups[label]=groups[label]||[]).push(+r.avg_wins||0); });
  return ["1","2","3","4","5+"].filter((k)=>groups[k]&&groups[k].length).map((k)=>{ const a=groups[k].sort(numSort); return { label:k+(k==="1"?" game":" games"),median:median(a),n:a.length }; });
}
function countNamed(rows, name) { return (rows||[]).filter((r)=>r.name===name).reduce((s,r)=>s+(+r.c||0),0); }
function shortText(s,n) { s=String(s==null?"":s); return s.length>n?s.slice(0,Math.max(1,n-1))+"…":s; }
function human(s) { return String(s||"?").replace(/[_-]+/g," ").replace(/\b\w/g,(c)=>c.toUpperCase()); }
function runPathLabel(mode,path) {
  const base=MODE_LABEL[mode]||human(mode);
  if(path==="daily-link")return "Friend link · "+base;
  if(path==="daily-practice")return "Daily practice · "+base;
  if(path==="daily")return "The Daily · "+base;
  return base;
}
function timeText(ms) {
  const n=+ms;
  if(!Number.isFinite(n))return "—";
  if(n<1000)return Math.round(n)+" ms";
  if(n<60000)return round1(n/1000)+"s";
  const m=Math.floor(n/60000),s=Math.round((n%60000)/1000);
  return m+"m"+(s?" "+s+"s":"");
}
function ageText(ms) {
  if (!Number.isFinite(ms) || ms<0) return "now";
  if (ms<60000) return Math.max(0,Math.round(ms/1000))+"s ago";
  if (ms<3600000) return Math.round(ms/60000)+"m ago";
  if (ms<86400000) return round1(ms/3600000)+"h ago";
  return round1(ms/86400000)+"d ago";
}
function campaignLabel(r) { return [r.cs||"—",r.cm||"—",r.cn||"—",r.cc||"—"].join(" / "); }
function roundBars(mode, rows) {
  const a=rows.filter((r)=>r.mode===mode), max=Math.max(1,...a.map((r)=>+r.c||0));
  return `<div class="mini-mode"><b>${MODE_LABEL[mode]}</b>${a.length?a.map((r)=>bar("R"+r.round,+r.c||0,max)).join(""):muted("no rounds")}</div>`;
}
function prestiEconomy(rows) {
  const done=rows.filter((r)=>r.name==="game_complete"), abandoned=rows.filter((r)=>r.name==="run_abandon");
  if (!done.length&&!abandoned.length) return muted("No analytics-v2 Presti results yet.");
  const med=(arr,key)=>arr.length?median(arr.map((r)=>+r[key]||0).sort(numSort)):null;
  const pp=med(done,"player_spend"), rr=med(done,"reroll_spend"), ap=med(abandoned,"player_spend"), ar=med(abandoned,"reroll_spend");
  return `<div class="stat3">${stat(pp==null?"—":"$"+pp,"median players")}${stat(rr==null?"—":"$"+rr,"median rerolls")}${stat(pp==null||rr==null?"—":"$"+(pp+rr),"median combined")}</div>
    <p class="muted">Completed runs: <b>${done.length}</b>. Reroll share of the two medians: <b>${pp==null||rr==null?"—":pct(rr,pp+rr)+"%"}</b>.</p>
    <p class="muted">Abandoned Presti runs: <b>${abandoned.length}</b>${abandoned.length?` · median before exit: <b>$${ap} players / $${ar} rerolls</b>`:""}.</p>`;
}
function actionBars(actions, denom) {
  const order=[["skip_results","Skip to results"],["run_it_back","Run it back"],["get_results","Get results"],["backdrop_dismiss","Backdrop dismiss"],["share_article","Share article"]];
  const extra=Object.keys(actions).filter((k)=>!order.some(([x])=>x===k)).map((k)=>[k,human(k)]);
  const rows=order.concat(extra), max=Math.max(1,...rows.map(([k])=>actions[k]||0));
  if (!rows.some(([k])=>actions[k])) return muted("No action-level newspaper data yet.");
  return rows.filter(([k])=>actions[k]).map(([k,label])=>bar(label,actions[k]||0,max,`${actions[k]||0} · ${pct(actions[k]||0,denom)}%`)).join("");
}
function bailoutBoard(exposures,bails) {
  if (!exposures.length) return muted("No analytics-v2 deal exposure data yet.");
  const bailMap=new Map(); bails.forEach((r)=>bailMap.set(`${r.mode}|${r.franchise}|${r.decade}`,+r.c||0));
  function aggregate(mode,kind) {
    const map=new Map();
    exposures.filter((r)=>r.mode===mode).forEach((r)=>{ const key=kind==="team"?r.franchise:kind==="era"?String(r.decade):`${r.franchise}|${r.decade}`; const old=map.get(key)||{key,exposure:0,bails:0}; old.exposure+=+r.c||0; old.bails+=bailMap.get(`${r.mode}|${r.franchise}|${r.decade}`)||0; map.set(key,old); });
    return [...map.values()].map((x)=>({...x,rate:x.exposure?100*x.bails/x.exposure:0})).filter((x)=>x.bails>0).sort((a,b)=>b.rate-a.rate||b.bails-a.bails||b.exposure-a.exposure);
  }
  return TRACKED_MODES.map((mode)=>{
    const teams=aggregate(mode,"team").slice(0,5), eras=aggregate(mode,"era").slice(0,5), pairs=aggregate(mode,"pair").slice(0,5);
    const fmt=(kind,x)=>kind==="team"?human(x.key):kind==="era"?x.key+"s":human(x.key.split("|")[0])+" · "+x.key.split("|")[1]+"s";
    const rows=(title,kind,a)=>`<div class="bail-col"><div class="sub">${title}</div>${a.length?a.map((x)=>bar(fmt(kind,x),x.rate,100,`${x.bails}/${x.exposure} · ${round1(x.rate)}%`)).join(""):muted("no Start over bails yet")}</div>`;
    return `<div class="bail-mode"><h3>${MODE_LABEL[mode]}</h3><div class="bail-grid">${rows("franchises","team",teams)}${rows("eras","era",eras)}${rows("team + era","pair",pairs)}</div></div>`;
  }).join("")+`<p class="muted">Rate = explicit Start over clicks ÷ times that deal was shown. Page exits are excluded because they may be ordinary interruption.</p>`;
}
function returnSummary(rows) {
  let total=0,returning=0; const day={"same day":0,"1 day":0,"2–7 days":0,"8–14 days":0,"15+ days":0}, active={"0":0,"1":0,"2–3":0,"4–7":0,"8–14":0,"15+":0}, streak={"0":0,"1":0,"2–3":0,"4–7":0,"8+":0};
  rows.forEach((r)=>{ const c=+r.c||0; total+=c; if ((r.outcome||"").indexOf("returning")!==-1) returning+=c; const d=+r.days_since_last; if (Number.isFinite(d)&&r.days_since_last!=null) day[d===0?"same day":d===1?"1 day":d<=7?"2–7 days":d<=14?"8–14 days":"15+ days"]+=c; const a=+r.active_days||0; active[a===0?"0":a===1?"1":a<=3?"2–3":a<=7?"4–7":a<=14?"8–14":"15+"]+=c; const s=+r.streak||0; streak[s===0?"0":s===1?"1":s<=3?"2–3":s<=7?"4–7":"8+"]+=c; });
  const arr=(obj)=>Object.entries(obj).map(([label,c])=>({label,c})).filter((r)=>r.c>0);
  const dayBuckets=arr(day),activeBuckets=arr(active),streakBuckets=arr(streak);
  return {total,returning,dayBuckets,activeBuckets,streakBuckets,dayMax:Math.max(1,...dayBuckets.map((r)=>r.c)),activeMax:Math.max(1,...activeBuckets.map((r)=>r.c)),streakMax:Math.max(1,...streakBuckets.map((r)=>r.c))};
}
function summarizeDraft(rows) {
  const labels={player_select:"player selections",draft_pick:"confirmed picks",pick_denied:"denied picks",search_use:"searches",sort_change:"sort changes",year_change:"season changes",lineup_change:"lineup changes",reroll:"rerolls",round_advance:"rounds dealt"};
  const map={}; rows.forEach((r)=>{ const x=map[r.name]||(map[r.name]={name:r.name,c:0,runs:0}); x.c+=+r.c||0; x.runs=Math.max(x.runs,+r.runs||0); });
  return Object.values(map).map((r)=>({...r,label:labels[r.name]||human(r.name)})).sort((a,b)=>b.c-a.c);
}
function shareSummary(rows) {
  const intents=rows.filter((r)=>r.name==="share_click").reduce((s,r)=>s+(+r.c||0),0);
  const completed=rows.filter((r)=>r.name==="share_complete").reduce((s,r)=>s+(+r.c||0),0);
  // share_cancel/share_error are emitted alongside the canonical share_result
  // row. Count only share_result here so one failed handoff is never doubled.
  const canceled=rows.filter((r)=>r.name==="share_result"&&r.outcome==="cancel").reduce((s,r)=>s+(+r.c||0),0);
  const errors=rows.filter((r)=>r.name==="share_result"&&r.outcome==="error").reduce((s,r)=>s+(+r.c||0),0);
  const pathMap={};
  rows.forEach((r)=>{ if (r.name!=="share_click"&&r.name!=="share_complete") return; const key=`${r.surface} · ${r.path}`; const x=pathMap[key]||(pathMap[key]={label:human(r.surface)+" · "+human(r.path),intents:0,completed:0}); if(r.name==="share_click")x.intents+=+r.c||0; else x.completed+=+r.c||0; });
  const paths=Object.values(pathMap).sort((a,b)=>b.intents-a.intents);
  const methodMap={}; rows.filter((r)=>r.name==="share_complete").forEach((r)=>{ const x=methodMap[r.action]||(methodMap[r.action]={action:r.action,c:0}); x.c+=+r.c||0; });
  const methods=Object.values(methodMap).sort((a,b)=>b.c-a.c);
  const deviceMap={}; rows.forEach((r)=>{ if(r.name!=="share_click"&&r.name!=="share_complete")return; const key=`${r.device} · ${r.browser}`; const x=deviceMap[key]||(deviceMap[key]={label:key,intents:0,completed:0}); if(r.name==="share_click")x.intents+=+r.c||0; else x.completed+=+r.c||0; });
  const devices=Object.values(deviceMap).sort((a,b)=>b.intents-a.intents).slice(0,12);
  return {intents,completed,canceled,errors,paths,methods,devices,pathMax:Math.max(1,...paths.map((r)=>r.intents)),methodMax:Math.max(1,...methods.map((r)=>r.c)),deviceMax:Math.max(1,...devices.map((r)=>r.intents))};
}
function shareResultBreakdown(rows,counts) {
  const defs=[
    {key:"82",label:"82–0",finishes:counts[82]||0},
    {key:"81",label:"81–1",finishes:counts[81]||0},
    {key:"80",label:"80–2",finishes:counts[80]||0},
    {key:"79",label:"79–3",finishes:counts[79]||0},
    {key:"78",label:"78–4",finishes:counts[78]||0},
    {key:"77",label:"77–5",finishes:counts[77]||0},
    {key:"under77",label:"76 wins or fewer",finishes:counts.slice(0,77).reduce((s,c)=>s+(+c||0),0)},
    {key:"unknown",label:"record unavailable",finishes:0}
  ];
  const map=Object.fromEntries(defs.map((d)=>[d.key,Object.assign({intents:0,completed:0},d)]));
  (rows||[]).forEach((r)=>{
    if((r.name!=="share_click"&&r.name!=="share_complete")||r.mode==="kaman")return;
    const w=+r.wins;
    const key=Number.isFinite(w)&&w>=0?(w>=77?String(Math.min(82,Math.round(w))):"under77"):"unknown";
    const x=map[key]||map.unknown;
    if(r.name==="share_click")x.intents+=+r.c||0;else x.completed+=+r.c||0;
  });
  return defs.map((d)=>map[d.key]).filter((r)=>r.finishes||r.intents||r.completed);
}
function sharePercentileBreakdown(rows) {
  const defs=[
    {key:"top1",label:"Top 1%"},{key:"top5",label:"Top 2–5%"},{key:"top10",label:"Top 6–10%"},
    {key:"top25",label:"Top 11–25%"},{key:"top50",label:"Top 26–50%"},{key:"lower",label:"Below top 50%"},
    {key:"unknown",label:"rank not ready"}
  ];
  const map=Object.fromEntries(defs.map((d)=>[d.key,Object.assign({intents:0,completed:0},d)]));
  (rows||[]).forEach((r)=>{
    if(r.name!=="share_click"&&r.name!=="share_complete")return;
    const v=+r.percentile;
    const key=!Number.isFinite(v)||r.percentile==null?"unknown":v<=1?"top1":v<=5?"top5":v<=10?"top10":v<=25?"top25":v<=50?"top50":"lower";
    const x=map[key];
    if(r.name==="share_click")x.intents+=+r.c||0;else x.completed+=+r.c||0;
  });
  return defs.map((d)=>map[d.key]).filter((r)=>r.intents||r.completed);
}

/* ---------- filters ---------- */
function dateScope(url) {
  const now=Date.now(),day=86400000,r=url.searchParams.get("range")||"1w";
  const presets={"1d":[1,"last 24 hours"],"3d":[3,"last 3 days"],"1w":[7,"last 7 days"],"2w":[14,"last 14 days"],"1mo":[30,"last 30 days"],"3mo":[90,"last 90 days"]};
  if(r==="all")return{range:"all",all:true,label:"all time",from:"",to:""};
  if(r==="custom"){
    const from=validDate(url.searchParams.get("from")),to=validDate(url.searchParams.get("to"));
    if(from&&to){const start=Date.parse(from+"T00:00:00Z"),end=Date.parse(to+"T00:00:00Z")+day;if(Number.isFinite(start)&&Number.isFinite(end)&&start<end)return{range:"custom",all:false,start,end,from,to,label:`${from} through ${to} UTC`};}
  }
  const p=presets[r]||presets["1w"];return{range:presets[r]?r:"1w",all:false,start:now-p[0]*day,end:now,from:"",to:"",label:p[1]};
}
function validDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(String(s||""))?s:"";}
function cleanBuild(s){s=String(s||"");return /^[A-Za-z0-9_.-]{1,32}$/.test(s)?s:"";}
function filters(url,scope,buildRows,selectedBuild,hasV3){
  const key=url.searchParams.get("k");
  const baseParams=()=>{const p=new URLSearchParams();if(key)p.set("k",key);p.set("range",scope.range);if(scope.range==="custom"){p.set("from",scope.from);p.set("to",scope.to);}if(selectedBuild)p.set("build",selectedBuild);return p;};
  const rangeHref=(range)=>{const p=baseParams();p.set("range",range);if(range!=="custom"){p.delete("from");p.delete("to");}return"?"+p.toString();};
  const buildHref=(build)=>{const p=baseParams();if(build)p.set("build",build);else p.delete("build");return"?"+p.toString();};
  const choices=[["1d","1d"],["3d","3d"],["1w","1w"],["2w","2w"],["1mo","1mo"],["3mo","3mo"],["all","all"]];
  const builds=(buildRows||[]).map((r)=>r.build).filter((b)=>b&&b!=="pre-v39 / unknown").slice(0,8);
  return `<section class="filters"><div class="filter-row"><span class="filter-label">date</span>${choices.map(([v,l])=>`<a class="chip${scope.range===v?" on":""}" href="${esc(rangeHref(v))}">${l}</a>`).join("")}</div>
    <form class="custom" method="get">${key?`<input type="hidden" name="k" value="${esc(key)}">`:""}${selectedBuild?`<input type="hidden" name="build" value="${esc(selectedBuild)}">`:""}<input type="hidden" name="range" value="custom"><label>from <input type="date" name="from" value="${esc(scope.from)}" required></label><label>to <input type="date" name="to" value="${esc(scope.to)}" required></label><button type="submit" class="chip${scope.range==="custom"?" on":""}">custom</button></form>
    ${hasV3?`<div class="filter-row build-row"><span class="filter-label">build</span><a class="chip${selectedBuild?"":" on"}" href="${esc(buildHref(""))}">all</a>${builds.map((b)=>`<a class="chip${selectedBuild===b?" on":""}" href="${esc(buildHref(b))}">${esc(b)}</a>`).join("")}</div><p class="muted scope-note">Date and build filters combine. The live pulse remains global so a broken deployment cannot hide behind the selected scope.</p>`:""}</section>`;
}

/* ---------- rendering ---------- */
function esc(s){return String(s==null?"":s).replace(/[&<>\"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function stat(v,label){return `<div class="s"><div class="sv">${esc(v)}</div><div class="sl">${esc(label)}</div></div>`;}
function bar(label,value,max,sub){const w=max&&value?Math.max(2,Math.round(100*value/max)):0;return `<div class="row"><span class="rl" title="${esc(label)}">${esc(label)}</span><span class="rt"><span class="fill" style="width:${w}%"></span></span><span class="rv">${esc(sub!=null?sub:value)}</span></div>`;}
function card(title,body,cls){return `<section class="card${cls?" "+cls:""}"><h2>${esc(title)}</h2>${body}</section>`;}
function muted(t){return `<p class="muted">${esc(t)}</p>`;}
function emptyRow(cols){return `<tr><td colspan="${cols}" class="muted">no data yet</td></tr>`;}
function html(body){return new Response(body,{headers:{"content-type":"text/html;charset=utf-8","cache-control":"no-store","x-robots-tag":"noindex, nofollow","x-content-type-options":"nosniff","referrer-policy":"no-referrer"}});}
function page(title,inner){return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title><style>
:root{--ink:#101418;--tunnel:#1A2027;--tunnel2:#2b3540;--chalk:#E8E4D8;--dim:#9AA0A6;--maple:#B98A4F;--amber:#FFB52E;--whistle:#E2654E;--ok:#8FB99B}
*{box-sizing:border-box}body{margin:0;background:var(--ink);color:var(--chalk);font:15px/1.5 Barlow,system-ui,sans-serif;-webkit-font-smoothing:antialiased}.wrap{max-width:1240px;margin:0 auto;padding:22px 16px 60px}.head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin:6px 2px 14px}h1{font:700 26px/1 'Barlow Condensed',sans-serif;letter-spacing:.02em;margin:0 0 6px;text-transform:uppercase}.dot{color:var(--maple)}h2{font:700 13px/1 'Barlow Condensed',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin:0 0 12px}h3{font:700 15px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.08em;margin:18px 0 4px}.muted{color:var(--dim);font-size:13px;margin:10px 0 0}.muted b{color:var(--chalk)}code{font-family:'IBM Plex Mono',monospace;color:var(--maple)}a{color:#9bb7ff}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}@media(max-width:790px){.grid{grid-template-columns:1fr}.wide{grid-column:auto!important}}.card{min-width:0;background:var(--tunnel);border:1px solid var(--tunnel2);border-radius:12px;padding:16px}.card.priority{border-color:rgba(255,181,46,.7);box-shadow:0 0 0 1px rgba(255,181,46,.08) inset}.wide{grid-column:1/-1}.refresh{background:none;border:1px solid var(--tunnel2);color:var(--dim);font:600 12px 'IBM Plex Mono',monospace;padding:7px 12px;border-radius:8px;cursor:pointer}.refresh:active{border-color:var(--maple);color:var(--chalk)}table{width:100%;border-collapse:collapse;font-size:14px;display:block;overflow-x:auto}thead,tbody{display:table;width:100%;table-layout:auto}th{text-align:right;font:600 11px 'IBM Plex Mono',monospace;letter-spacing:.05em;color:var(--dim);text-transform:uppercase;padding:0 6px 8px;white-space:nowrap}th:first-child,td:first-child{text-align:left}td{text-align:right;padding:6px;border-top:1px solid var(--tunnel2);font-family:'IBM Plex Mono',monospace;white-space:nowrap}td.k{color:var(--chalk)}td.big{color:var(--amber);font-weight:600}.warncell{color:#f1b0a3}.okcell{color:var(--ok)}.stat3,.stat4{display:flex;gap:10px;margin-bottom:8px}.stat4 .s{min-width:0}.decision{margin:12px 0;background:rgba(255,181,46,.08);border-left:3px solid var(--amber);border-radius:5px;padding:10px 12px;color:var(--chalk)}.decision b{color:var(--amber)}.quality{margin:10px 0 12px;background:rgba(143,185,155,.07);border-left:3px solid var(--ok);border-radius:5px;padding:9px 12px;color:var(--dim);font-size:12.5px}.quality b{color:var(--ok)}.quality.bad{background:rgba(226,101,78,.08);border-color:var(--whistle);color:var(--chalk)}.quality.bad b{color:#f1b0a3}.s{flex:1;min-width:0;background:var(--ink);border:1px solid var(--tunnel2);border-radius:9px;padding:11px 8px;text-align:center}.sv{font:600 21px 'IBM Plex Mono',monospace;color:var(--chalk)}.sl{font-size:10.5px;color:var(--dim);margin-top:3px;letter-spacing:.02em}.sub{font:600 11px 'IBM Plex Mono',monospace;letter-spacing:.08em;color:var(--dim);text-transform:uppercase;margin:14px 0 8px}.row{display:flex;align-items:center;gap:9px;margin:5px 0}.rl{flex:0 0 145px;font-size:12px;color:var(--dim);font-family:'IBM Plex Mono',monospace;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rt{flex:1;height:16px;background:var(--ink);border-radius:5px;overflow:hidden}.fill{display:block;height:100%;background:linear-gradient(90deg,var(--maple),var(--amber));border-radius:5px}.rv{flex:0 0 116px;font:600 11px 'IBM Plex Mono',monospace;color:var(--chalk);white-space:nowrap}.mode-block+.mode-block{border-top:1px solid var(--tunnel2);margin-top:15px;padding-top:2px}.mini-mode{margin:8px 0 14px}.mini-mode>b{display:block;font:600 12px 'IBM Plex Mono',monospace;color:var(--chalk);margin-bottom:5px}.bail-mode+.bail-mode{border-top:1px solid var(--tunnel2);margin-top:16px}.bail-grid,.tech-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.filters{background:var(--tunnel);border:1px solid var(--tunnel2);border-radius:12px;padding:12px 14px;margin-bottom:14px}.filter-row,.custom{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.custom,.build-row{margin-top:9px}.filter-label{font:600 11px 'IBM Plex Mono',monospace;text-transform:uppercase;color:var(--dim);margin-right:4px}.chip{display:inline-block;border:1px solid var(--tunnel2);background:var(--ink);color:var(--dim);text-decoration:none;border-radius:8px;padding:6px 10px;font:600 12px 'IBM Plex Mono',monospace;cursor:pointer}.chip.on,.chip:hover{border-color:var(--amber);color:var(--chalk)}.custom label{font:11px 'IBM Plex Mono',monospace;color:var(--dim)}.custom input{margin-left:5px;background:var(--ink);border:1px solid var(--tunnel2);color:var(--chalk);border-radius:6px;padding:5px}.scope-note{margin-top:8px}.migration{border:1px solid var(--whistle);background:rgba(226,101,78,.08);border-radius:10px;padding:10px 12px;margin:0 0 14px;color:var(--chalk);font-size:13px}.migration.bad{border-color:var(--amber)}.warn{color:#f1b0a3;font-size:13px}.privacy{background:#141a20;border-left:3px solid var(--ok);padding:10px 13px;margin:0 0 14px;border-radius:4px;color:var(--dim);font-size:12.5px}.privacy b{color:var(--chalk)}@media(max-width:940px){.bail-grid,.tech-grid{grid-template-columns:1fr 1fr}.stat3,.stat4{flex-wrap:wrap}.s{min-width:30%}}@media(max-width:560px){.wrap{padding:14px 10px 50px}.head{align-items:flex-start}.bail-grid,.tech-grid{grid-template-columns:1fr}.stat4 .s{min-width:46%}.rl{flex-basis:112px}.rv{flex-basis:100px}.sv{font-size:19px}.card{padding:14px 12px}}
</style></head><body><div class="wrap">${inner}</div></body></html>`;}
