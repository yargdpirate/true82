// GET /avocado — private, no-store analytics viewer for TRUE 82.
// Reads anonymous event aggregates from D1. The optional DASH_KEY remains the gate.

const TRACKED_MODES = ["classic", "pro", "cap"];
const MODE_LABEL = { classic: "Classic", pro: "Pro", cap: "Presti", kaman: "Kaman" };

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
  const q = async (sql, binds = []) => {
    try {
      let stmt = env.DB.prepare(sql);
      if (binds.length) stmt = stmt.bind(...binds);
      const r = await stmt.all();
      return r.results || [];
    } catch (e) {
      queryErrors.push(String(e && e.message || e).slice(0, 160));
      return [];
    }
  };
  const one = async (sql, binds = []) => {
    try {
      let stmt = env.DB.prepare(sql);
      if (binds.length) stmt = stmt.bind(...binds);
      return await stmt.first();
    } catch (e) {
      queryErrors.push(String(e && e.message || e).slice(0, 160));
      return null;
    }
  };

  const schema = await q(`PRAGMA table_info(events)`);
  const cols = new Set(schema.map((r) => r.name));
  const hasV2 = ["run_id", "reason", "franchise", "decade", "player_spend", "reroll_spend"].every((c) => cols.has(c));
  const recapSchema = await q(`PRAGMA table_info(recaps)`);
  const hasRecaps = recapSchema.length > 0;

  const scope = dateScope(url);
  const W = scope.all ? "1=1" : "ts>=? AND ts<?";
  const B = scope.all ? [] : [scope.start, scope.end];
  const modesSql = "('classic','pro','cap')";

  const funnelSql = hasV2
    ? `SELECT mode,
         SUM(name='game_start') starts,
         COUNT(DISTINCT CASE WHEN name='game_start' THEN sid END) visits,
         SUM(name='game_complete') finishes,
         COUNT(DISTINCT CASE WHEN name='game_complete' THEN sid END) finish_visits,
         SUM(name='run_abandon' AND reason='start_over') startovers,
         SUM(name='run_abandon' AND reason='page_exit') exits
       FROM events WHERE ${W} AND mode IN ${modesSql}
         AND name IN ('game_start','game_complete','run_abandon') GROUP BY mode`
    : `SELECT mode,
         SUM(name='game_start') starts,
         COUNT(DISTINCT CASE WHEN name='game_start' THEN sid END) visits,
         SUM(name='game_complete') finishes,
         COUNT(DISTINCT CASE WHEN name='game_complete' THEN sid END) finish_visits,
         0 startovers, 0 exits
       FROM events WHERE ${W} AND mode IN ${modesSql}
         AND name IN ('game_start','game_complete') GROUP BY mode`;

  const sessionSql = `WITH scoped AS (SELECT * FROM events WHERE ${W}),
    ends AS (
      SELECT sid, MAX(duration) duration, MAX(max_round) max_round
      FROM scoped WHERE name='session_end' GROUP BY sid
    ), starts AS (
      SELECT sid, COUNT(*) games FROM scoped
      WHERE name='game_start' AND mode IN ${modesSql} GROUP BY sid
    )
    SELECT ends.sid, ends.duration, ends.max_round, starts.games
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

  const [
    winCounts, hhHits, modeMix, funnelModes, roundFunnel,
    hcAction, hcSeg, shareByU, deviceMix, referrers, donateMix,
    sessionRows, corrRows, newspaperRows,
    dailyFunnelRows, dailyShareRows, dailyByBaseRows
  ] = await Promise.all([
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
    q(`SELECT COALESCE(undefeated,0) u, COUNT(*) c FROM events WHERE ${W}
       AND name='share' AND mode IN ${modesSql} GROUP BY u`, B),
    q(`SELECT COALESCE(device,'?') d, COUNT(*) c FROM events WHERE ${W}
       AND name='session_start' GROUP BY d ORDER BY c DESC`, B),
    q(`SELECT referrer, COUNT(*) c FROM events WHERE ${W} AND name='session_start'
       AND referrer IS NOT NULL AND referrer<>'' GROUP BY referrer ORDER BY c DESC LIMIT 8`, B),
    q(`SELECT COALESCE(variant,'?') variant, COUNT(*) c FROM events WHERE ${W}
       AND name='donate_click' AND (mode IS NULL OR mode IN ${modesSql})
       GROUP BY variant ORDER BY c DESC`, B),
    q(sessionSql, B),
    q(corrSql, B),
    q(`SELECT name, COALESCE(variant,'?') variant, COUNT(*) c FROM events WHERE ${W}
       AND name IN ('recap_presented','recap_unwrap','recap_full_read','recap_action')
       AND mode IN ${modesSql} GROUP BY name,variant`, B),
    // THE DAILY funnel. The daily has no mode of its own (it inherits the
    // challenge base), so every daily event is identified by its variant
    // prefix. These pull the daily back out of the base-mode totals.
    q(`SELECT name,
         COUNT(*) c,
         COUNT(DISTINCT sid) sids,
         SUM(CASE WHEN variant LIKE 'daily-practice:%' THEN 1 ELSE 0 END) practice
       FROM events WHERE ${W}
         AND name IN ('daily_gate_view','game_start','game_complete')
         AND variant LIKE 'daily%'
       GROUP BY name`, B),
    q(`SELECT name, COALESCE(variant,'?') variant, COUNT(*) c, COUNT(DISTINCT sid) sids
       FROM events WHERE ${W} AND name IN ('share','share_click') AND variant LIKE 'daily%'
       GROUP BY name, variant ORDER BY c DESC`, B),
    q(`SELECT COALESCE(mode,'?') base,
         SUM(CASE WHEN variant LIKE 'daily%' THEN 1 ELSE 0 END) daily,
         SUM(CASE WHEN variant IS NULL OR variant NOT LIKE 'daily%' THEN 1 ELSE 0 END) standalone
       FROM events WHERE ${W} AND name='game_start' AND mode IN ${modesSql}
       GROUP BY mode`, B)
  ]);

  const [
    sessionsRow, startsRow, trackedStartsRow, startSidsRow, completesRow,
    shownRow, errorsRow, loadRow
  ] = await Promise.all([
    one(`SELECT COUNT(*) c FROM events WHERE ${W} AND name='session_start'`, B),
    one(`SELECT COUNT(*) c FROM events WHERE ${W} AND name='game_start'`, B), // includes Kaman by design
    one(`SELECT COUNT(*) c FROM events WHERE ${W} AND name='game_start' AND mode IN ${modesSql}`, B),
    one(`SELECT COUNT(DISTINCT sid) c FROM events WHERE ${W} AND name='game_start' AND mode IN ${modesSql}`, B),
    one(`SELECT COUNT(*) c FROM events WHERE ${W} AND name='game_complete' AND mode IN ${modesSql}`, B),
    one(`SELECT COUNT(*) c FROM events WHERE ${W} AND name='heatcheck_shown' AND mode IN ${modesSql}`, B),
    one(`SELECT COUNT(*) c FROM events WHERE ${W} AND name='data_error'`, B),
    one(`SELECT ROUND(AVG(load_ms)) ms FROM events WHERE ${W} AND name='data_ready'`, B)
  ]);

  const [prestiRows, exposureRows, startOverRows] = hasV2 ? await Promise.all([
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
  ]) : [[], [], []];

  const sessions = cnt(sessionsRow);
  const startsAll = cnt(startsRow);
  const trackedStarts = cnt(trackedStartsRow);
  const startSids = cnt(startSidsRow);
  const completesN = cnt(completesRow);
  const shown = cnt(shownRow);
  const errors = cnt(errorsRow);

  // Outcomes by mode, using grouped counts so the dashboard does not pull one row/game.
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

  // Funnel and visit-level engagement.
  const bouncePct = pct(sessions - startSids, sessions);
  const startRate = pct(startSids, sessions);
  const completeRate = pct(completesN, trackedStarts);
  const funnelMap = {};
  funnelModes.forEach((r) => { funnelMap[r.mode] = r; });

  const durations = sessionRows.map((r) => (+r.duration || 0) / 1000).sort(numSort);
  const gamesPerVisit = sessionRows.map((r) => +r.games || 0).sort(numSort);
  const deepest = sessionRows.map((r) => +r.max_round || 0).sort(numSort);
  const corrPts = corrRows.map((r) => [+r.avg_wins || 0, +r.games || 0]);
  const corr = corrPts.length >= 2 ? round2(pearson(corrPts)) : null;
  const winByDepth = engagementBuckets(corrRows);

  // Heat Check and sharing.
  const pulled = pick(hcAction, "pulled", 1);
  const skipped = pick(hcAction, "pulled", 0);
  const pullRate = pct(pulled, shown);
  const hitTotal = hcSeg.reduce((s, r) => s + (+r.h || 0), 0);
  const segMax = Math.max(1, ...hcSeg.map((r) => +r.c || 0));
  const shareU = pick(shareByU, "u", 1), shareO = pick(shareByU, "u", 0), shareTotal = shareU + shareO;

  // Newspaper.
  const recapPresented = eventCount(newspaperRows, "recap_presented");
  const recapOpened = eventCount(newspaperRows, "recap_unwrap");
  const recapFull = eventCount(newspaperRows, "recap_full_read");
  const recapActions = {};
  newspaperRows.filter((r) => r.name === "recap_action").forEach((r) => { recapActions[r.variant] = +r.c || 0; });

  const modeMax = Math.max(1, ...modeMix.map((r) => +r.c || 0));
  const devMax = Math.max(1, ...deviceMix.map((r) => +r.c || 0));
  const refMax = Math.max(1, ...referrers.map((r) => +r.c || 0));
  const donateTotal = donateMix.reduce((s, r) => s + (+r.c || 0), 0);
  const donateMax = Math.max(1, ...donateMix.map((r) => +r.c || 0));
  const DONATE_ACTIVE = new Set([
    "Fund my caffeine dependency", "Feed my GOAT herd", "Fuel the token furnace",
    "Help me pay the luxury tax", "Money me. Money now.",
    "100% goes to girlfriend", "Fund weekly challenges",
    "Keep developing the game", "Prove my parents wrong"
  ]);

  const cards = [];

  cards.push(card("Outcomes by mode", `
    <table>
      <thead><tr><th>mode</th><th>games</th><th>median W</th><th>mean W</th><th>82–0</th><th>82–0 w/ HH</th></tr></thead>
      <tbody>${modeRows.some((r) => r.n) ? modeRows.map((r) =>
        `<tr><td class="k">${esc(MODE_LABEL[r.mode])}</td><td>${r.n}</td><td class="big">${r.n ? r.median : "—"}</td><td>${r.n ? r.mean : "—"}</td><td>${r.undefPct}%</td><td>${r.w82Pct}%</td></tr>`
      ).join("") : emptyRow(6)}</tbody>
    </table>
    <p class="muted">Kaman is excluded. “w/ HH” adds successful Hot Hand conversions to natural 82–0 runs.</p>`));

  cards.push(card("Win distribution · by mode", distroSets.map((set) => {
    const bins = winBins(set.counts), max = Math.max(1, ...bins.map((b) => b.c));
    return `<div class="mode-block"><div class="sub">${esc(set.label)}</div>${sum(set.counts)
      ? bins.map((b) => bar(b.label, b.c, max)).join("")
      : muted("no completed games")}</div>`;
  }).join(""), "wide"));

  cards.push(card("Funnel · per visit", `
    <div class="stat3">
      ${stat(sessions, "visits")}${stat(startRate + "%", "started tracked mode")}${stat(completeRate + "%", "runs finished")}
    </div>
    <p class="muted">bounce (no Classic, Pro, or Presti start): <b>${bouncePct}%</b>. Kaman starts appear only in the initiated-games chart.</p>
    <table class="compact"><thead><tr><th>mode</th><th>visits</th><th>starts</th><th>finishes</th><th>finish %</th><th>start over</th><th>page exit</th></tr></thead>
    <tbody>${TRACKED_MODES.map((m) => {
      const r = funnelMap[m] || {};
      return `<tr><td class="k">${MODE_LABEL[m]}</td><td>${+r.visits || 0}</td><td>${+r.starts || 0}</td><td>${+r.finishes || 0}</td><td>${pct(+r.finishes || 0, +r.starts || 0)}%</td><td>${+r.startovers || 0}</td><td>${+r.exits || 0}</td></tr>`;
    }).join("")}</tbody></table>
    <div class="sub">round reached · by mode</div>
    ${TRACKED_MODES.map((m) => roundBars(m, roundFunnel)).join("")}
    ${hasV2 ? "" : `<p class="warn">Apply <code>migrations/0004_analytics_v2.sql</code> to separate Start over from real page exits.</p>`}`));

  // ---- THE DAILY: the funnel you actually asked about ----
  {
    const dfMap = {};
    (dailyFunnelRows || []).forEach((r) => { dfMap[r.name] = r; });
    const gate = dfMap["daily_gate_view"] || { c: 0, sids: 0 };
    const start = dfMap["game_start"] || { c: 0, sids: 0, practice: 0 };
    const done = dfMap["game_complete"] || { c: 0, sids: 0, practice: 0 };
    const gateN = +gate.c || 0, startN = +start.c || 0, doneN = +done.c || 0;
    const practiceStarts = +start.practice || 0;
    const firstStarts = Math.max(0, startN - practiceStarts);
    // v28 split: share_click = tapped a share button (intent); share = the OS
    // sheet resolved or the clipboard verifiably took it (completed). Like
    // daily_gate_view before it, share_click only begins collecting at the
    // v28 deploy, so early intent counts will read low against share history.
    const shareTotal = (dailyShareRows || []).filter((r) => r.name === "share")
      .reduce((a, r) => a + (+r.c || 0), 0);
    const intentTotal = (dailyShareRows || []).filter((r) => r.name === "share_click")
      .reduce((a, r) => a + (+r.c || 0), 0);
    // Percentages anchor to game_start (the first step with full history):
    // daily_gate_view only began collecting at the v27 deploy, so basing % on
    // it would divide days of history by minutes of it. Once gate history
    // accrues, gateN drives the true top-of-funnel and its own % lights up.
    const haveGate = gateN > 0;
    const baseN = haveGate ? gateN : startN;
    const baseLabel = haveGate ? "of gate" : "of draft";
    // Fold the per-day variants (daily:8, daily-menu:8...) into entry paths
    // (daily, daily-menu, daily-link) so shares group by HOW, not WHICH day.
    const pathMap = {};
    (dailyShareRows || []).filter((r) => r.name === "share").forEach((r) => {
      const path = String(r.variant || "?").replace(/:\d+$/, "");
      pathMap[path] = (pathMap[path] || 0) + (+r.c || 0);
    });
    const sharePaths = Object.keys(pathMap).map((k) => ({ path: k, c: pathMap[k] })).sort((a, b) => b.c - a.c);
    const shareMax = sharePaths.reduce((m, r) => Math.max(m, r.c), 0);
    cards.push(card("THE DAILY · funnel", `
    <table><thead><tr><th>step</th><th>events</th><th>people</th><th>${baseLabel}</th></tr></thead>
    <tbody>
      <tr><td class="k">Tapped THE DAILY (gate seen)</td><td>${gateN}</td><td>${+gate.sids || 0}</td><td>${haveGate ? "100%" : "—"}</td></tr>
      <tr><td class="k">Entered the draft (game_start)</td><td>${startN}</td><td>${+start.sids || 0}</td><td class="big">${pct(startN, baseN)}%</td></tr>
      <tr><td class="k">Finished the season</td><td>${doneN}</td><td>${+done.sids || 0}</td><td>${pct(doneN, baseN)}%</td></tr>
      <tr><td class="k">Tapped share (intent)</td><td>${intentTotal}</td><td>—</td><td>${pct(intentTotal, baseN)}%</td></tr>
      <tr><td class="k">Shared the daily</td><td>${shareTotal}</td><td>—</td><td>${pct(shareTotal, baseN)}%</td></tr>
    </tbody></table>
    <p class="muted">Among draft entries: <b>${firstStarts}</b> first attempts · <b>${practiceStarts}</b> practice reruns. Finish rate ${pct(doneN, startN)}% of drafts started.</p>
    ${haveGate
      ? `<p class="muted">Gate-to-draft drop-off: <b>${pct(Math.max(0, gateN - startN), gateN)}%</b> leave on the instructions screen.</p>`
      : '<p class="muted">Gate views (daily_gate_view) began collecting at the v27 deploy, so the top step has no back-history yet and percentages anchor to draft entries for now. Give it a day, then gate-to-draft drop-off appears here.</p>'}
    <p class="muted">The intent step (share_click) began collecting at the v28 deploy; completed-share history predates it, so intent can read lower than shares until it accrues.</p>
    <p class="muted">Daily shares by entry path:</p>
    ${sharePaths.length ? sharePaths.map((r) => bar(esc(r.path), r.c, shareMax)).join("") : muted("no daily shares in range")}`, "wide"));
  }

  // ---- base-mode totals, split daily vs standalone ----
  {
    const rowsByBase = {};
    (dailyByBaseRows || []).forEach((r) => { rowsByBase[r.base] = r; });
    cards.push(card("Games initiated · daily vs standalone", `
    <p class="muted">Your Classic/Pro/Presti totals include daily runs (a daily inherits its challenge's base mode). This splits them.</p>
    <table><thead><tr><th>base mode</th><th>standalone</th><th>daily</th><th>daily %</th></tr></thead>
    <tbody>${TRACKED_MODES.map((m) => {
      const r = rowsByBase[m] || { standalone: 0, daily: 0 };
      const sN = +r.standalone || 0, dN = +r.daily || 0;
      return `<tr><td class="k">${MODE_LABEL[m]}</td><td>${sN}</td><td>${dN}</td><td>${pct(dN, sN + dN)}%</td></tr>`;
    }).join("")}</tbody></table>`));
  }

  cards.push(card("Start-over bailout board", hasV2
    ? bailoutBoard(exposureRows, startOverRows)
    : `<p class="warn">Analytics v2 migration required. New events already fail soft, but team/era bailout dimensions cannot be stored until the columns exist.</p>`, "wide"));

  cards.push(card("Engagement · medians", `
    <div class="stat3">
      ${stat(durations.length ? round1(median(durations)) + "s" : "—", "median visit")}
      ${stat(gamesPerVisit.length ? median(gamesPerVisit) : "—", "median games / visit")}
      ${stat(deepest.length ? median(deepest) : "—", "median deepest round")}
    </div>
    <p class="muted">Per-visit average wins vs tracked games initiated: ${corr === null
      ? "<b>n/a</b> (need at least two visits with a finish)"
      : `<b>r = ${corr}</b> across ${corrPts.length} visits ${corrWord(corr)}. This uses the full 0–82 result, not an 82–0 flag.`}</p>
    <div class="sub">median result by games initiated that visit</div>
    ${winByDepth.length ? winByDepth.map((r) => bar(r.label, r.median, 82, `${r.median} W · n=${r.n}`)).join("") : muted("not enough completed visits")}`));

  cards.push(card("Presti economy", hasV2 ? prestiEconomy(prestiRows) : `
    <p class="warn">Apply analytics migration 0004. Historical <code>budget_used</code> accidentally excluded rerolls, so old rows cannot be split reliably.</p>`));

  cards.push(card("Newspaper", `
    <div class="stat3">
      ${stat(recapPresented, "presented")}${stat(pct(recapOpened, recapPresented) + "%", "opened")}${stat(pct(recapFull, recapOpened) + "%", "full-read proxy")}
    </div>
    <p class="muted">Full read = article bottom reached or the completed story stayed visible for a length-aware 7–12 second dwell.</p>
    <div class="sub">button actions</div>
    ${actionBars(recapActions, recapPresented)}`));

  cards.push(card("Heat Check", `
    <div class="stat3">
      ${stat(shown, "shown")}${stat(pullRate + "%", "pull rate")}${stat(hitTotal, "hit 82–0")}
    </div>
    <p class="muted">pulled <b>${pulled}</b> · skipped <b>${skipped}</b></p>
    <div class="sub">segment landed · hits</div>
    ${hcSeg.length ? hcSeg.map((r) => bar(r.segment, +r.c || 0, segMax, `${r.c}${(+r.h || 0) ? " · " + r.h : ""}`)).join("") : muted("no spins yet")}`));

  cards.push(card("Sharing", `
    <div class="stat3">
      ${stat(shareTotal, "shares")}${stat(pct(shareTotal, completesN) + "%", "of finishes")}${stat(pct(shareU, shareTotal) + "%", "were 82–0")}
    </div>
    <p class="muted">undefeated shares <b>${shareU}</b> vs other <b>${shareO}</b>. Kaman is excluded.</p>`));

  const RW = scope.all ? "1=1" : "created_ts>=? AND created_ts<?";
  const recapTotals = hasRecaps ? await one(
    `SELECT COUNT(*) c, COALESCE(SUM(views_raw),0) vr, COALESCE(SUM(views_human),0) vh FROM recaps WHERE ${RW}`, B) : null;
  const recapTop = hasRecaps ? await q(
    `SELECT id,nickname,wins,views_human,views_raw FROM recaps WHERE ${RW}
     ORDER BY views_human DESC,views_raw DESC,created_ts DESC LIMIT 5`, B) : [];
  const refStarts = hasRecaps ? await one(
    `SELECT COUNT(*) c FROM events WHERE ${W} AND name='game_start' AND variant LIKE 'recap:%'`, B) : null;
  cards.push(card("Tribune share pages", hasRecaps ? `
    <div class="stat3">
      ${stat(cnt(recapTotals), "editions published")}${stat(recapTotals ? +recapTotals.vh || 0 : 0, "human opens")}${stat(cnt(refStarts), "games started via link")}
    </div>
    <table class="compact"><thead><tr><th>edition</th><th>record</th><th>opens</th><th>fetches</th></tr></thead>
    <tbody>${recapTop.length ? recapTop.map((r) => { const rid=String(r.id||""); const href=/^[A-Z0-9][A-Za-z0-9_-]{4}$/.test(rid)?"/"+rid:"/r/"+rid; return `<tr><td><a href="${esc(href)}">${esc(r.nickname || r.id)}</a></td><td>${+r.wins || 0}–${82 - (+r.wins || 0)}</td><td>${+r.views_human || 0}</td><td>${+r.views_raw || 0}</td></tr>`; }).join("") : emptyRow(4)}</tbody></table>
    <p class="muted">Fetches include unfurl crawlers; opens use the in-page human beacon. Referral starts are attributed once, to the first game launched after the shared link is opened.</p>`
    : muted("Migration 0005 (recaps) has not been applied; share pages are not being stored.")));

  cards.push(card("Games initiated · mode", modeMix.length
    ? modeMix.map((r) => bar(MODE_LABEL[r.mode] || r.mode, +r.c || 0, modeMax)).join("") +
      `<p class="muted">This is the only game-level chart that includes Kaman.</p>`
    : muted("no starts yet")));

  cards.push(card("Donate clicks", donateTotal ? `
    <div class="stat3">
      ${stat(donateTotal, "clicks")}${stat(donateMix.length, "messages used")}${stat(pct(donateTotal, completesN) + "%", "of finishes")}
    </div>
    <div class="sub">by message</div>
    ${donateMix.map((r) => bar(r.variant + (DONATE_ACTIVE.has(r.variant) ? "" : " · retired"), +r.c || 0, donateMax)).join("")}`
    : muted("no donate clicks yet")));

  cards.push(card("Traffic & tech", `
    <div class="sub">device</div>
    ${deviceMix.length ? deviceMix.map((r) => bar(r.d, +r.c || 0, devMax)).join("") : muted("—")}
    <div class="sub">top referrers</div>
    ${referrers.length ? referrers.map((r) => bar(shortRef(r.referrer), +r.c || 0, refMax)).join("") : muted("(direct / none)")}
    <p class="muted">median-oriented engagement is above · avg load <b>${loadRow && loadRow.ms != null ? loadRow.ms + " ms" : "—"}</b> · load errors <b>${errors}</b></p>`));

  const migrationWarning = hasV2 ? "" : `
    <div class="migration"><b>Analytics v2 migration required.</b> Run <code>migrations/0004_analytics_v2.sql</code> against the same D1 database bound to this deployment. Existing analytics continue through the legacy fallback, but spend splits and bailout reasons remain unavailable until then.</div>`;
  const queryWarning = queryErrors.length ? `<div class="migration bad"><b>Dashboard query warning:</b> ${esc(queryErrors[0])}</div>` : "";

  const header = `
    <div class="head">
      <div><h1>TRUE 82 <span class="dot">·</span> analytics</h1>
        <div class="muted">${sessions.toLocaleString()} visits · ${startsAll.toLocaleString()} games initiated · ${completesN.toLocaleString()} tracked games finished · ${esc(scope.label)}</div></div>
      <button class="refresh" onclick="location.reload()">refresh</button>
    </div>
    ${dateFilters(url, scope)}${migrationWarning}${queryWarning}`;

  const buildStamp = `<p class="muted" style="text-align:center;margin-top:28px;opacity:.6">build v27.1 · daily-funnel-fix · ${new Date().toISOString().slice(0,16).replace("T"," ")} UTC</p>`;
  return html(page("TRUE 82 · analytics", header + `<div class="grid">${cards.join("")}</div>` + buildStamp));
}

/* ---------- dashboard calculations ---------- */
function cnt(row) { return row && row.c != null ? +row.c : 0; }
function round1(n) { return Math.round((+n || 0) * 10) / 10; }
function round2(n) { return Math.round((+n || 0) * 100) / 100; }
function pct(n, d) { return d ? round1(100 * n / d) : 0; }
function sum(a) { return a.reduce((s, x) => s + (+x || 0), 0); }
function numSort(a, b) { return a - b; }
function pick(rows, key, val) { const r = rows.find((x) => +x[key] === val); return r ? +r.c || 0 : 0; }
function median(sorted) {
  if (!sorted.length) return 0;
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : round1((sorted[m - 1] + sorted[m]) / 2);
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
function weightedMean(counts) {
  const n = sum(counts);
  return n ? counts.reduce((s, c, w) => s + c * w, 0) / n : 0;
}
function winBins(counts) {
  const range = (lo, hi) => counts.slice(lo, hi + 1).reduce((s, c) => s + c, 0);
  const out = [
    { label: "<64", c: range(0, 63) },
    { label: "64–69", c: range(64, 69) },
    { label: "70–75", c: range(70, 75) }
  ];
  for (let w = 76; w <= 82; w++) out.push({ label: String(w), c: counts[w] || 0 });
  return out;
}
function pearson(pts) {
  const n = pts.length;
  const sx = pts.reduce((s, p) => s + p[0], 0), sy = pts.reduce((s, p) => s + p[1], 0);
  const sxx = pts.reduce((s, p) => s + p[0] * p[0], 0), syy = pts.reduce((s, p) => s + p[1] * p[1], 0);
  const sxy = pts.reduce((s, p) => s + p[0] * p[1], 0);
  const cov = n * sxy - sx * sy, dx = Math.sqrt(n * sxx - sx * sx), dy = Math.sqrt(n * syy - sy * sy);
  return dx && dy ? cov / (dx * dy) : 0;
}
function corrWord(r) { const a = Math.abs(r); return a < 0.1 ? "(flat)" : a < 0.3 ? "(weak)" : a < 0.6 ? "(moderate)" : "(strong)"; }
function engagementBuckets(rows) {
  const groups = {};
  rows.forEach((r) => {
    const g = +r.games || 0, label = g >= 5 ? "5+" : String(g);
    (groups[label] = groups[label] || []).push(+r.avg_wins || 0);
  });
  return ["1", "2", "3", "4", "5+"].filter((k) => groups[k] && groups[k].length).map((k) => {
    const a = groups[k].sort(numSort);
    return { label: k + (k === "1" ? " game" : " games"), median: median(a), n: a.length };
  });
}
function eventCount(rows, name) { return rows.filter((r) => r.name === name).reduce((s, r) => s + (+r.c || 0), 0); }
function shortRef(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return String(u || "").slice(0, 32); } }
function human(s) { return String(s || "?").replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); }

function roundBars(mode, rows) {
  const a = rows.filter((r) => r.mode === mode), max = Math.max(1, ...a.map((r) => +r.c || 0));
  return `<div class="mini-mode"><b>${MODE_LABEL[mode]}</b>${a.length ? a.map((r) => bar("R" + r.round, +r.c || 0, max)).join("") : muted("no rounds")}</div>`;
}

function prestiEconomy(rows) {
  const done = rows.filter((r) => r.name === "game_complete");
  const abandoned = rows.filter((r) => r.name === "run_abandon");
  if (!done.length && !abandoned.length) return muted("No analytics-v2 Presti results yet.");
  const med = (arr, key) => arr.length ? median(arr.map((r) => +r[key] || 0).sort(numSort)) : null;
  const pp = med(done, "player_spend"), rr = med(done, "reroll_spend");
  const ap = med(abandoned, "player_spend"), ar = med(abandoned, "reroll_spend");
  return `<div class="stat3">
      ${stat(pp == null ? "—" : "$" + pp, "median players")}
      ${stat(rr == null ? "—" : "$" + rr, "median rerolls")}
      ${stat(pp == null || rr == null ? "—" : "$" + (pp + rr), "median combined")}
    </div>
    <p class="muted">Completed runs: <b>${done.length}</b>. Reroll share of the two medians: <b>${pp == null || rr == null ? "—" : pct(rr, pp + rr) + "%"}</b>.</p>
    <p class="muted">Abandoned Presti runs: <b>${abandoned.length}</b>${abandoned.length ? ` · median before exit: <b>$${ap} players / $${ar} rerolls</b>` : ""}.</p>`;
}

function actionBars(actions, denom) {
  const order = [
    ["skip_results", "Skip to results"],
    ["run_it_back", "Run it back"],
    ["get_results", "Get results"],
    ["backdrop_dismiss", "Backdrop dismiss"]
  ];
  const max = Math.max(1, ...order.map(([k]) => actions[k] || 0));
  if (!order.some(([k]) => actions[k])) return muted("No action-level newspaper data yet.");
  return order.map(([k, label]) => bar(label, actions[k] || 0, max, `${actions[k] || 0} · ${pct(actions[k] || 0, denom)}%`)).join("");
}

function bailoutBoard(exposures, bails) {
  if (!exposures.length) return muted("No analytics-v2 deal exposure data yet.");
  const expMap = new Map(), bailMap = new Map();
  exposures.forEach((r) => expMap.set(`${r.mode}|${r.franchise}|${r.decade}`, +r.c || 0));
  bails.forEach((r) => bailMap.set(`${r.mode}|${r.franchise}|${r.decade}`, +r.c || 0));

  function aggregate(mode, kind) {
    const map = new Map();
    exposures.filter((r) => r.mode === mode).forEach((r) => {
      const key = kind === "team" ? r.franchise : kind === "era" ? String(r.decade) : `${r.franchise}|${r.decade}`;
      const old = map.get(key) || { key, exposure: 0, bails: 0 };
      old.exposure += +r.c || 0;
      old.bails += bailMap.get(`${r.mode}|${r.franchise}|${r.decade}`) || 0;
      map.set(key, old);
    });
    return [...map.values()].map((x) => ({ ...x, rate: x.exposure ? 100 * x.bails / x.exposure : 0 }))
      .filter((x) => x.bails > 0)
      .sort((a, b) => b.rate - a.rate || b.bails - a.bails || b.exposure - a.exposure);
  }

  return TRACKED_MODES.map((mode) => {
    const teams = aggregate(mode, "team").slice(0, 5);
    const eras = aggregate(mode, "era").slice(0, 5);
    const pairs = aggregate(mode, "pair").slice(0, 5);
    const fmt = (kind, x) => kind === "team" ? human(x.key) : kind === "era" ? x.key + "s" : human(x.key.split("|")[0]) + " · " + x.key.split("|")[1] + "s";
    const rows = (title, kind, a) => `<div class="bail-col"><div class="sub">${title}</div>${a.length
      ? a.map((x) => bar(fmt(kind, x), x.rate, 100, `${x.bails}/${x.exposure} · ${round1(x.rate)}%`)).join("")
      : muted("no Start over bails yet")}</div>`;
    return `<div class="bail-mode"><h3>${MODE_LABEL[mode]}</h3><div class="bail-grid">${rows("franchises", "team", teams)}${rows("eras", "era", eras)}${rows("team + era", "pair", pairs)}</div></div>`;
  }).join("") + `<p class="muted">Rate = explicit Start over clicks ÷ times that deal was shown. Page exits are excluded because they may reflect ordinary interruption rather than ragequit intent.</p>`;
}

/* ---------- date scope ---------- */
function dateScope(url) {
  const now = Date.now(), day = 86400000;
  const r = url.searchParams.get("range") || "1w";
  const presets = {
    "1d": [1, "last 24 hours"], "3d": [3, "last 3 days"], "1w": [7, "last 7 days"],
    "2w": [14, "last 14 days"], "1mo": [30, "last 30 days"], "3mo": [90, "last 90 days"]
  };
  if (r === "all") return { range: "all", all: true, label: "all time", from: "", to: "" };
  if (r === "custom") {
    const from = validDate(url.searchParams.get("from")), to = validDate(url.searchParams.get("to"));
    if (from && to) {
      const start = Date.parse(from + "T00:00:00Z"), end = Date.parse(to + "T00:00:00Z") + day;
      if (Number.isFinite(start) && Number.isFinite(end) && start < end) {
        return { range: "custom", all: false, start, end, from, to, label: `${from} through ${to} UTC` };
      }
    }
  }
  const p = presets[r] || presets["1w"];
  return { range: presets[r] ? r : "1w", all: false, start: now - p[0] * day, end: now, from: "", to: "", label: p[1] };
}
function validDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) ? s : ""; }
function dateFilters(url, scope) {
  const key = url.searchParams.get("k");
  const href = (range) => {
    const p = new URLSearchParams();
    if (key) p.set("k", key);
    p.set("range", range);
    return "?" + p.toString();
  };
  const choices = [["1d", "1d"], ["3d", "3d"], ["1w", "1w"], ["2w", "2w"], ["1mo", "1mo"], ["3mo", "3mo"], ["all", "all"]];
  return `<section class="filters"><div class="filter-row"><span class="filter-label">date</span>${choices.map(([v, label]) =>
    `<a class="chip${scope.range === v ? " on" : ""}" href="${esc(href(v))}">${label}</a>`).join("")}</div>
    <form class="custom" method="get">${key ? `<input type="hidden" name="k" value="${esc(key)}">` : ""}<input type="hidden" name="range" value="custom">
      <label>from <input type="date" name="from" value="${esc(scope.from)}" required></label>
      <label>to <input type="date" name="to" value="${esc(scope.to)}" required></label>
      <button type="submit" class="chip${scope.range === "custom" ? " on" : ""}">custom</button>
    </form>
    <p class="muted scope-note">Patch filtering is intentionally not active yet. The planned patch selector will be a mutually exclusive scope, never combined with these dates.</p></section>`;
}

/* ---------- rendering ---------- */
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function stat(v, label) { return `<div class="s"><div class="sv">${esc(v)}</div><div class="sl">${esc(label)}</div></div>`; }
function bar(label, value, max, sub) {
  const w = max && value ? Math.max(2, Math.round(100 * value / max)) : 0;
  return `<div class="row"><span class="rl" title="${esc(label)}">${esc(label)}</span><span class="rt"><span class="fill" style="width:${w}%"></span></span><span class="rv">${esc(sub != null ? sub : value)}</span></div>`;
}
function card(title, body, cls) { return `<section class="card${cls ? " " + cls : ""}"><h2>${esc(title)}</h2>${body}</section>`; }
function muted(t) { return `<p class="muted">${esc(t)}</p>`; }
function emptyRow(cols) { return `<tr><td colspan="${cols}" class="muted">no data yet</td></tr>`; }
function html(body) {
  return new Response(body, { headers: { "content-type": "text/html;charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
}
function page(title, inner) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${esc(title)}</title><style>
:root{--ink:#101418;--tunnel:#1A2027;--tunnel2:#2b3540;--chalk:#E8E4D8;--dim:#9AA0A6;--maple:#B98A4F;--amber:#FFB52E;--whistle:#E2654E;--ok:#8FB99B}
*{box-sizing:border-box}body{margin:0;background:var(--ink);color:var(--chalk);font:15px/1.5 Barlow,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1180px;margin:0 auto;padding:22px 16px 60px}.head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin:6px 2px 14px}
h1{font:700 26px/1 'Barlow Condensed',sans-serif;letter-spacing:.02em;margin:0 0 6px;text-transform:uppercase}.dot{color:var(--maple)}
h2{font:700 13px/1 'Barlow Condensed',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin:0 0 12px}h3{font:700 15px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.08em;margin:18px 0 4px}
.muted{color:var(--dim);font-size:13px;margin:10px 0 0}.muted b{color:var(--chalk)}code{font-family:'IBM Plex Mono',monospace;color:var(--maple)}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}@media(max-width:760px){.grid{grid-template-columns:1fr}.wide{grid-column:auto!important}}
.card{min-width:0;background:var(--tunnel);border:1px solid var(--tunnel2);border-radius:12px;padding:16px}.wide{grid-column:1/-1}.refresh{background:none;border:1px solid var(--tunnel2);color:var(--dim);font:600 12px 'IBM Plex Mono',monospace;padding:7px 12px;border-radius:8px;cursor:pointer}.refresh:active{border-color:var(--maple);color:var(--chalk)}
table{width:100%;border-collapse:collapse;font-size:14px;display:block;overflow-x:auto}thead,tbody{display:table;width:100%;table-layout:auto}th{text-align:right;font:600 11px 'IBM Plex Mono',monospace;letter-spacing:.05em;color:var(--dim);text-transform:uppercase;padding:0 6px 8px;white-space:nowrap}th:first-child,td:first-child{text-align:left}td{text-align:right;padding:6px;border-top:1px solid var(--tunnel2);font-family:'IBM Plex Mono',monospace;white-space:nowrap}td.k{color:var(--chalk)}td.big{color:var(--amber);font-weight:600}
.stat3{display:flex;gap:10px;margin-bottom:4px}.s{flex:1;min-width:0;background:var(--ink);border:1px solid var(--tunnel2);border-radius:9px;padding:11px 8px;text-align:center}.sv{font:600 21px 'IBM Plex Mono',monospace;color:var(--chalk)}.sl{font-size:10.5px;color:var(--dim);margin-top:3px;letter-spacing:.02em}
.sub{font:600 11px 'IBM Plex Mono',monospace;letter-spacing:.08em;color:var(--dim);text-transform:uppercase;margin:14px 0 8px}.row{display:flex;align-items:center;gap:9px;margin:5px 0}.rl{flex:0 0 110px;font-size:12px;color:var(--dim);font-family:'IBM Plex Mono',monospace;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rt{flex:1;height:16px;background:var(--ink);border-radius:5px;overflow:hidden}.fill{display:block;height:100%;background:linear-gradient(90deg,var(--maple),var(--amber));border-radius:5px}.rv{flex:0 0 92px;font:600 11px 'IBM Plex Mono',monospace;color:var(--chalk);white-space:nowrap}
.mode-block+.mode-block{border-top:1px solid var(--tunnel2);margin-top:15px;padding-top:2px}.mini-mode{margin:8px 0 14px}.mini-mode>b{display:block;font:600 12px 'IBM Plex Mono',monospace;color:var(--chalk);margin-bottom:5px}.bail-mode+.bail-mode{border-top:1px solid var(--tunnel2);margin-top:16px}.bail-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}@media(max-width:900px){.bail-grid{grid-template-columns:1fr}.stat3{flex-wrap:wrap}.s{min-width:30%}}.bail-col .rl{flex-basis:130px}
.filters{background:var(--tunnel);border:1px solid var(--tunnel2);border-radius:12px;padding:12px 14px;margin-bottom:14px}.filter-row,.custom{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.custom{margin-top:9px}.filter-label{font:600 11px 'IBM Plex Mono',monospace;text-transform:uppercase;color:var(--dim);margin-right:4px}.chip{display:inline-block;border:1px solid var(--tunnel2);background:var(--ink);color:var(--dim);text-decoration:none;border-radius:8px;padding:6px 10px;font:600 12px 'IBM Plex Mono',monospace;cursor:pointer}.chip.on,.chip:hover{border-color:var(--amber);color:var(--chalk)}.custom label{font:11px 'IBM Plex Mono',monospace;color:var(--dim)}.custom input{margin-left:5px;background:var(--ink);border:1px solid var(--tunnel2);color:var(--chalk);border-radius:6px;padding:5px}.scope-note{margin-top:8px}.migration{border:1px solid var(--whistle);background:rgba(226,101,78,.08);border-radius:10px;padding:10px 12px;margin:0 0 14px;color:var(--chalk);font-size:13px}.migration.bad{border-color:var(--amber)}.warn{color:#f1b0a3;font-size:13px}
</style></head><body><div class="wrap">${inner}</div></body></html>`;
}
