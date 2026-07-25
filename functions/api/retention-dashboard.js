// GET /api/retention-dashboard — legacy detailed retention view for TRUE 82 v40.
// The primary retention cards now also live inside /avocado. DASH_KEY remains the gate.

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") return new Response("method", { status: 405 });
  const url = new URL(request.url);
  if (env.DASH_KEY && url.searchParams.get("k") !== env.DASH_KEY) return new Response("not found", { status: 404 });
  if (!env.DB) return html(page("TRUE 82 · retention", card("No D1 binding", "Bind the production analytics database as <code>DB</code>.")));

  const errors = [];
  async function rows(label, sql, binds = []) {
    try {
      let stmt = env.DB.prepare(sql);
      if (binds.length) stmt = stmt.bind(...binds);
      const result = await stmt.all();
      return result.results || [];
    } catch (e) {
      errors.push({ label, message: String(e && e.message || e) });
      return [];
    }
  }
  async function one(label, sql, binds = []) {
    try {
      let stmt = env.DB.prepare(sql);
      if (binds.length) stmt = stmt.bind(...binds);
      return await stmt.first();
    } catch (e) {
      errors.push({ label, message: String(e && e.message || e) });
      return null;
    }
  }

  const schema = await rows("retention_schema", "PRAGMA table_info(retention_events_v1)");
  if (!schema.length) {
    const body = `
      ${header(url, "90")}
      ${card("Retention migration not applied", `
        <p>Run <code>migrations/0008_retention_events_v1.sql</code> against the same D1 database bound to this site.</p>
        <p class="muted">This migration creates a separate table only. Existing game and analytics tables are not altered.</p>`)}
      ${notes()}`;
    return html(page("TRUE 82 · retention", body));
  }

  const allowed = new Set(["30", "90", "180", "365", "all"]);
  const range = allowed.has(url.searchParams.get("days")) ? url.searchParams.get("days") : "90";
  const startDay = range === "all" ? "0000-01-01" : isoDay(Date.now() - (Number(range) - 1) * 86400000);
  const startTs = range === "all" ? 0 : Date.now() - Number(range) * 86400000;

  const maxRow = await one("max_day", "SELECT MAX(local_day) AS max_day, COUNT(*) AS events FROM retention_events_v1");
  const dataDay = maxRow && maxRow.max_day ? String(maxRow.max_day) : isoDay(Date.now());

  const summary = await one("retention_summary", `
    WITH firsts AS (
      SELECT visitor_id, MIN(local_day) AS first_day
      FROM retention_events_v1
      WHERE event_name='game_start'
      GROUP BY visitor_id
    ), scoped AS (
      SELECT * FROM firsts WHERE first_day>=?
    ), flags AS (
      SELECT s.visitor_id, s.first_day,
        EXISTS(SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=s.visitor_id AND e.event_name='game_start' AND e.local_day=date(s.first_day,'+1 day')) AS d1_start,
        EXISTS(SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=s.visitor_id AND e.event_name='game_complete' AND e.local_day=date(s.first_day,'+1 day')) AS d1_finish,
        EXISTS(SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=s.visitor_id AND e.event_name='game_start' AND e.local_day=date(s.first_day,'+3 day')) AS d3_start,
        EXISTS(SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=s.visitor_id AND e.event_name='game_start' AND e.local_day=date(s.first_day,'+7 day')) AS d7_start,
        EXISTS(SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=s.visitor_id AND e.event_name='game_start' AND e.local_day>s.first_day AND e.local_day<=date(s.first_day,'+7 day')) AS w1_start,
        EXISTS(SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=s.visitor_id AND e.event_name='game_start' AND e.local_day>s.first_day AND e.local_day<=date(s.first_day,'+30 day')) AS m1_start
      FROM scoped s
    )
    SELECT COUNT(*) AS new_players,
      SUM(CASE WHEN first_day<=date(?,'-1 day') THEN 1 ELSE 0 END) AS d1_eligible,
      SUM(CASE WHEN first_day<=date(?,'-1 day') THEN d1_start ELSE 0 END) AS d1_started,
      SUM(CASE WHEN first_day<=date(?,'-1 day') THEN d1_finish ELSE 0 END) AS d1_finished,
      SUM(CASE WHEN first_day<=date(?,'-3 day') THEN 1 ELSE 0 END) AS d3_eligible,
      SUM(CASE WHEN first_day<=date(?,'-3 day') THEN d3_start ELSE 0 END) AS d3_started,
      SUM(CASE WHEN first_day<=date(?,'-7 day') THEN 1 ELSE 0 END) AS d7_eligible,
      SUM(CASE WHEN first_day<=date(?,'-7 day') THEN d7_start ELSE 0 END) AS d7_started,
      SUM(CASE WHEN first_day<=date(?,'-7 day') THEN w1_start ELSE 0 END) AS w1_started,
      SUM(CASE WHEN first_day<=date(?,'-30 day') THEN 1 ELSE 0 END) AS m1_eligible,
      SUM(CASE WHEN first_day<=date(?,'-30 day') THEN m1_start ELSE 0 END) AS m1_started
    FROM flags`, [startDay, dataDay, dataDay, dataDay, dataDay, dataDay, dataDay, dataDay, dataDay, dataDay, dataDay]) || {};

  const cohorts = await rows("daily_cohorts", `
    WITH firsts AS (
      SELECT visitor_id, MIN(local_day) AS first_day
      FROM retention_events_v1
      WHERE event_name='game_start'
      GROUP BY visitor_id
    )
    SELECT f.first_day,
      COUNT(*) AS new_players,
      SUM(CASE WHEN f.first_day<=date(?,'-1 day') THEN 1 ELSE 0 END) AS d1_eligible,
      SUM(CASE WHEN f.first_day<=date(?,'-1 day') AND EXISTS(
        SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=f.visitor_id AND e.event_name='game_start' AND e.local_day=date(f.first_day,'+1 day')
      ) THEN 1 ELSE 0 END) AS d1_started,
      SUM(CASE WHEN f.first_day<=date(?,'-1 day') AND EXISTS(
        SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=f.visitor_id AND e.event_name='game_complete' AND e.local_day=date(f.first_day,'+1 day')
      ) THEN 1 ELSE 0 END) AS d1_finished,
      SUM(CASE WHEN f.first_day<=date(?,'-7 day') THEN 1 ELSE 0 END) AS d7_eligible,
      SUM(CASE WHEN f.first_day<=date(?,'-7 day') AND EXISTS(
        SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=f.visitor_id AND e.event_name='game_start' AND e.local_day=date(f.first_day,'+7 day')
      ) THEN 1 ELSE 0 END) AS d7_started
    FROM firsts f
    WHERE f.first_day>=?
    GROUP BY f.first_day
    ORDER BY f.first_day DESC
    LIMIT 31`, [dataDay, dataDay, dataDay, dataDay, dataDay, startDay]);

  const byMode = await rows("retention_by_first_mode", `
    WITH ranked AS (
      SELECT visitor_id, local_day AS first_day, COALESCE(mode,'unknown') AS first_mode,
        ROW_NUMBER() OVER (PARTITION BY visitor_id ORDER BY ts, id) AS rn
      FROM retention_events_v1
      WHERE event_name='game_start'
    ), firsts AS (
      SELECT visitor_id, first_day, first_mode FROM ranked WHERE rn=1 AND first_day>=?
    )
    SELECT first_mode,
      COUNT(*) AS new_players,
      SUM(CASE WHEN first_day<=date(?,'-1 day') THEN 1 ELSE 0 END) AS eligible,
      SUM(CASE WHEN first_day<=date(?,'-1 day') AND EXISTS(
        SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=firsts.visitor_id AND e.event_name='game_start' AND e.local_day=date(firsts.first_day,'+1 day')
      ) THEN 1 ELSE 0 END) AS returned,
      SUM(CASE WHEN first_day<=date(?,'-7 day') THEN 1 ELSE 0 END) AS w1_eligible,
      SUM(CASE WHEN first_day<=date(?,'-7 day') AND EXISTS(
        SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=firsts.visitor_id AND e.event_name='game_start' AND e.local_day>firsts.first_day AND e.local_day<=date(firsts.first_day,'+7 day')
      ) THEN 1 ELSE 0 END) AS w1_returned
    FROM firsts
    GROUP BY first_mode
    ORDER BY new_players DESC`, [startDay, dataDay, dataDay, dataDay, dataDay]);

  const byEntry = await rows("retention_by_entry", `
    WITH ranked AS (
      SELECT visitor_id, local_day AS first_day, COALESCE(NULLIF(entry,''),'unknown') AS first_entry,
        ROW_NUMBER() OVER (PARTITION BY visitor_id ORDER BY ts, id) AS rn
      FROM retention_events_v1
      WHERE event_name='game_start'
    ), firsts AS (
      SELECT visitor_id, first_day, first_entry FROM ranked WHERE rn=1 AND first_day>=?
    )
    SELECT first_entry,
      COUNT(*) AS new_players,
      SUM(CASE WHEN first_day<=date(?,'-1 day') THEN 1 ELSE 0 END) AS eligible,
      SUM(CASE WHEN first_day<=date(?,'-1 day') AND EXISTS(
        SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=firsts.visitor_id AND e.event_name='game_start' AND e.local_day=date(firsts.first_day,'+1 day')
      ) THEN 1 ELSE 0 END) AS returned
    FROM firsts
    GROUP BY first_entry
    ORDER BY new_players DESC
    LIMIT 12`, [startDay, dataDay, dataDay]);

  const activity = await rows("active_day_distribution", `
    WITH days AS (
      SELECT visitor_id, COUNT(DISTINCT local_day) AS active_days
      FROM retention_events_v1
      WHERE event_name='game_start'
      GROUP BY visitor_id
    ), scoped AS (
      SELECT d.* FROM days d
      WHERE EXISTS(SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=d.visitor_id AND e.event_name='game_start' AND e.local_day>=?)
    )
    SELECT CASE WHEN active_days>=8 THEN '8+' ELSE CAST(active_days AS TEXT) END AS bucket,
      COUNT(*) AS players
    FROM scoped
    GROUP BY CASE WHEN active_days>=8 THEN '8+' ELSE CAST(active_days AS TEXT) END
    ORDER BY CASE bucket WHEN '1' THEN 1 WHEN '2' THEN 2 WHEN '3' THEN 3 WHEN '4' THEN 4 WHEN '5' THEN 5 WHEN '6' THEN 6 WHEN '7' THEN 7 ELSE 8 END`, [startDay]);

  const streaks = await rows("consecutive_streaks", `
    WITH days AS (
      SELECT DISTINCT visitor_id, local_day
      FROM retention_events_v1
      WHERE event_name='game_start'
    ), numbered AS (
      SELECT visitor_id, local_day,
        julianday(local_day) - ROW_NUMBER() OVER (PARTITION BY visitor_id ORDER BY local_day) AS grp
      FROM days
    ), runs AS (
      SELECT visitor_id, COUNT(*) AS streak FROM numbered GROUP BY visitor_id, grp
    ), best AS (
      SELECT visitor_id, MAX(streak) AS best_streak FROM runs GROUP BY visitor_id
    )
    SELECT CASE
      WHEN best_streak=1 THEN '1 day'
      WHEN best_streak=2 THEN '2 days'
      WHEN best_streak=3 THEN '3 days'
      WHEN best_streak BETWEEN 4 AND 6 THEN '4–6 days'
      ELSE '7+ days' END AS bucket,
      COUNT(*) AS players
    FROM best
    WHERE EXISTS(SELECT 1 FROM retention_events_v1 e WHERE e.visitor_id=best.visitor_id AND e.event_name='game_start' AND e.local_day>=?)
    GROUP BY bucket
    ORDER BY MIN(best_streak)`, [startDay]);

  const returnLag = await rows("first_return_lag", `
    WITH days AS (
      SELECT DISTINCT visitor_id, local_day
      FROM retention_events_v1
      WHERE event_name='game_start'
    ), ranked AS (
      SELECT visitor_id, local_day,
        ROW_NUMBER() OVER (PARTITION BY visitor_id ORDER BY local_day) AS rn
      FROM days
    ), paired AS (
      SELECT visitor_id,
        MAX(CASE WHEN rn=1 THEN local_day END) AS first_day,
        MAX(CASE WHEN rn=2 THEN local_day END) AS second_day
      FROM ranked WHERE rn<=2 GROUP BY visitor_id
    )
    SELECT CASE
      WHEN second_day IS NULL THEN 'No return yet'
      WHEN julianday(second_day)-julianday(first_day)=1 THEN 'Next day'
      WHEN julianday(second_day)-julianday(first_day)<=3 THEN '2–3 days'
      WHEN julianday(second_day)-julianday(first_day)<=7 THEN '4–7 days'
      WHEN julianday(second_day)-julianday(first_day)<=30 THEN '8–30 days'
      ELSE '31+ days' END AS bucket,
      COUNT(*) AS players
    FROM paired
    WHERE first_day>=?
    GROUP BY bucket
    ORDER BY CASE bucket WHEN 'Next day' THEN 1 WHEN '2–3 days' THEN 2 WHEN '4–7 days' THEN 3 WHEN '8–30 days' THEN 4 WHEN '31+ days' THEN 5 ELSE 6 END`, [startDay]);

  const dailyTrend = await rows("new_returning_trend", `
    WITH firsts AS (
      SELECT visitor_id, MIN(local_day) AS first_day
      FROM retention_events_v1 WHERE event_name='game_start' GROUP BY visitor_id
    ), activity AS (
      SELECT DISTINCT visitor_id, local_day
      FROM retention_events_v1 WHERE event_name='game_start' AND local_day>=?
    )
    SELECT a.local_day,
      SUM(CASE WHEN a.local_day=f.first_day THEN 1 ELSE 0 END) AS new_players,
      SUM(CASE WHEN a.local_day>f.first_day THEN 1 ELSE 0 END) AS returning_players,
      COUNT(*) AS active_players
    FROM activity a JOIN firsts f USING(visitor_id)
    GROUP BY a.local_day
    ORDER BY a.local_day DESC
    LIMIT 31`, [startDay]);

  const retentionVisits = await one("retention_visit_coverage", `
    SELECT COUNT(DISTINCT sid) AS visits, COUNT(DISTINCT visitor_id) AS browsers
    FROM retention_events_v1
    WHERE event_name='visit' AND local_day>=?`, [startDay]) || {};

  const sidecarSchema = await rows("sidecar_schema", "PRAGMA table_info(analytics_events_v4)");
  let allVisits = null;
  if (sidecarSchema.length) {
    allVisits = await one("all_visit_coverage", `
      SELECT COUNT(DISTINCT sid) AS visits
      FROM analytics_events_v4
      WHERE name='session_start' AND ts>=?`, [startTs]);
  }

  const d1StartRate = rate(summary.d1_started, summary.d1_eligible);
  const d1FinishRate = rate(summary.d1_finished, summary.d1_eligible);
  const d3Rate = rate(summary.d3_started, summary.d3_eligible);
  const d7Rate = rate(summary.d7_started, summary.d7_eligible);
  const w1Rate = rate(summary.w1_started, summary.d7_eligible);
  const m1Rate = rate(summary.m1_started, summary.m1_eligible);
  const repeatPlayers = activity.reduce((n, r) => n + (String(r.bucket) === "1" ? 0 : Number(r.players || 0)), 0);
  const activePlayers = activity.reduce((n, r) => n + Number(r.players || 0), 0);

  const body = `
    ${header(url, range)}
    <div class="notice"><strong>What this answers:</strong> among eligible same-browser players, how many start or finish another game on the next calendar day—and how that changes by first mode and entry path.</div>
    <section class="metrics">
      ${metric("New identified players", fmt(summary.new_players), `First-ever game starts in this ${range === "all" ? "all-time" : range + "-day"} view`)}
      ${metric("D1 played again", d1StartRate, `${fmt(summary.d1_started)} of ${fmt(summary.d1_eligible)} mature cohorts`)}
      ${metric("D1 finished again", d1FinishRate, `${fmt(summary.d1_finished)} of ${fmt(summary.d1_eligible)} mature cohorts`)}
      ${metric("D3 exact return", d3Rate, `${fmt(summary.d3_started)} of ${fmt(summary.d3_eligible)}`)}
      ${metric("D7 exact return", d7Rate, `${fmt(summary.d7_started)} of ${fmt(summary.d7_eligible)}`)}
      ${metric("Returned within 7 days", w1Rate, `${fmt(summary.w1_started)} of ${fmt(summary.d7_eligible)}`)}
      ${metric("Returned within 30 days", m1Rate, `${fmt(summary.m1_started)} of ${fmt(summary.m1_eligible)}`)}
      ${metric("Played on 2+ days", pct(repeatPlayers, activePlayers), `${fmt(repeatPlayers)} of ${fmt(activePlayers)} identified players`)}
    </section>

    ${coverageCard(retentionVisits, allVisits)}
    ${tableCard("Daily acquisition and return", "Each row follows browsers whose first game start happened that day. Recent rows are correctly marked immature.",
      ["First day", "New", "D1 played", "D1 finished", "D7 played"],
      cohorts.map((r) => [
        esc(r.first_day), fmt(r.new_players),
        Number(r.d1_eligible) ? `${rate(r.d1_started, r.d1_eligible)} <small>${fmt(r.d1_started)}/${fmt(r.d1_eligible)}</small>` : '<span class="pending">not mature</span>',
        Number(r.d1_eligible) ? `${rate(r.d1_finished, r.d1_eligible)} <small>${fmt(r.d1_finished)}/${fmt(r.d1_eligible)}</small>` : '<span class="pending">not mature</span>',
        Number(r.d7_eligible) ? `${rate(r.d7_started, r.d7_eligible)} <small>${fmt(r.d7_started)}/${fmt(r.d7_eligible)}</small>` : '<span class="pending">not mature</span>'
      ]))}

    <div class="two">
      ${tableCard("Retention by first mode", "Which first experience is most likely to create another day of play.",
        ["First mode", "New", "D1", "Within 7d"],
        byMode.map((r) => [modeLabel(r.first_mode), fmt(r.new_players), rate(r.returned, r.eligible), rate(r.w1_returned, r.w1_eligible)]))}
      ${tableCard("Retention by first entry", "Especially useful for comparing challenge links and campaigns with direct traffic.",
        ["First entry", "New", "D1"],
        byEntry.map((r) => [label(r.first_entry), fmt(r.new_players), rate(r.returned, r.eligible)]))}
    </div>

    <div class="two">
      ${tableCard("Distinct active days", "How many separate calendar days each identified browser has started a game.",
        ["Active days", "Players", "Share"],
        activity.map((r) => [esc(r.bucket), fmt(r.players), pct(r.players, activePlayers)]))}
      ${tableCard("Best consecutive streak", "A direct measure of day-after-day habit formation.",
        ["Best streak", "Players"], streaks.map((r) => [esc(r.bucket), fmt(r.players)]))}
    </div>

    <div class="two">
      ${tableCard("Time to first return", "The gap between a browser's first and second distinct game-start day.",
        ["First return", "Players"], returnLag.map((r) => [esc(r.bucket), fmt(r.players)]))}
      ${tableCard("Daily active mix", "New versus already-seen browsers among daily game starters.",
        ["Day", "New", "Returning", "Total"], dailyTrend.map((r) => [esc(r.local_day), fmt(r.new_players), fmt(r.returning_players), fmt(r.active_players)]))}
    </div>

    ${errors.length ? diagnostics(errors) : ""}
    ${notes()}`;

  return html(page("TRUE 82 · retention", body));
}

function header(url, range) {
  const key = url.searchParams.get("k") || "";
  const link = (days, text) => `<a class="${range === days ? "active" : ""}" href="/api/retention-dashboard?k=${encodeURIComponent(key)}&days=${days}">${text}</a>`;
  return `<header>
    <div><p class="eyebrow">TRUE 82 · PRIVATE ANALYTICS</p><h1>Same-browser retention</h1><p class="sub">Forward-only cohorts from the isolated v40 retention stream.</p></div>
    <nav>${link("30", "30d")}${link("90", "90d")}${link("180", "180d")}${link("365", "1y")}${link("all", "All")}
      <a href="/avocado?k=${encodeURIComponent(key)}">Avocado ↗</a></nav>
  </header>`;
}

function coverageCard(retentionVisits, allVisits) {
  const identified = Number(retentionVisits && retentionVisits.visits || 0);
  const total = allVisits ? Number(allVisits.visits || 0) : null;
  const coverage = total === null ? "not available" : rate(identified, total);
  return card("Measurement coverage", `
    <div class="coverage"><strong>${esc(coverage)}</strong><span>of ordinary analytics visits also created an eligible retention visit</span></div>
    <p class="muted">Identified visits: ${fmt(identified)}${total === null ? "" : ` · all session starts: ${fmt(total)}`}. Excluded consent regions, unknown/Tor geolocation, explicit site opt-outs, blocked storage, and failed policy requests are absent. DNT/GPC are observed but no longer suppress strictly first-party retention measurement.</p>`);
}

function notes() {
  return `<section class="card notes"><h2>Interpretation limits</h2>
    <p>This is <strong>same-browser retention</strong>, not person-level identity. A different device/browser, cleared site data, private browsing, or the 180-day rotation appears as a new browser.</p>
    <p>Exact D1 means another game start on the next local calendar date. “Within 7 days” is broader and usually more stable at low traffic. No historical rows can be backfilled.</p>
    <p>The retention stream uses a random first-party TRUE 82 browser id with a secure cookie and local-storage fallback for up to 400 days. It is disabled in consent regions, unknown/Tor geolocation, and after the explicit TRUE 82 opt-out. DNT/GPC are observed but do not suppress strictly first-party product analytics. It is not used for advertising or cross-site tracking.</p>
  </section>`;
}

function diagnostics(errors) {
  return `<section class="card danger"><h2>Diagnostics</h2>${errors.map((e) => `<p><code>${esc(e.label)}</code> ${esc(e.message)}</p>`).join("")}</section>`;
}

function tableCard(title, subtitle, headers, data) {
  const rows = data.length ? data.map((r) => `<tr>${r.map((x) => `<td>${x == null || x === "" ? "—" : x}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${headers.length}" class="muted">No eligible data yet.</td></tr>`;
  return `<section class="card"><h2>${esc(title)}</h2><p class="muted">${esc(subtitle)}</p><div class="scroll"><table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

function metric(title, value, note) {
  return `<article class="metric"><span>${esc(title)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`;
}
function card(title, body) { return `<section class="card"><h2>${esc(title)}</h2>${body}</section>`; }
function modeLabel(v) { return ({ classic: "Classic", pro: "Pro", cap: "Presti", kaman: "Kaman", unknown: "Unknown" })[String(v)] || label(v); }
function label(v) { return esc(String(v || "unknown").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())); }
function fmt(v) { const n = Number(v); return Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : "0"; }
function pct(a, b) { const x = Number(a || 0), y = Number(b || 0); return y > 0 ? `${(100 * x / y).toFixed(x && 100 * x / y < 10 ? 1 : 0)}%` : "—"; }
function rate(a, b) { return pct(a, b); }
function isoDay(ms) { return new Date(ms).toISOString().slice(0, 10); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }
function html(body) { return new Response(body, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store, max-age=0", "x-robots-tag": "noindex, nofollow", "x-content-type-options": "nosniff" } }); }
function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title><style>
  :root{--ink:#17231d;--muted:#657068;--paper:#f5f2e8;--card:#fffdf7;--green:#184d38;--lime:#c8e36b;--line:#d9d8cd;--danger:#8d2b22}
  *{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.45 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body:before{content:"";display:block;height:7px;background:var(--green)}main{max-width:1220px;margin:auto;padding:28px 18px 60px}header{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;margin-bottom:20px}.eyebrow{margin:0 0 4px;color:var(--green);font-size:12px;font-weight:900;letter-spacing:.13em}h1{font-size:clamp(31px,5vw,54px);line-height:.96;margin:0;letter-spacing:-.05em}h2{font-size:18px;margin:0 0 7px}.sub,.muted{color:var(--muted)}.sub{margin:9px 0 0}nav{display:flex;flex-wrap:wrap;gap:7px;justify-content:flex-end}nav a{color:var(--green);background:#fff;border:1px solid var(--line);padding:7px 10px;border-radius:999px;text-decoration:none;font-weight:750}nav a.active{background:var(--green);color:white;border-color:var(--green)}.notice{background:var(--green);color:white;border-radius:14px;padding:14px 17px;margin:0 0 14px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:10px}.metric,.card{background:var(--card);border:1px solid var(--line);box-shadow:0 3px 0 rgba(23,35,29,.05);border-radius:14px}.metric{padding:15px;display:flex;min-height:128px;flex-direction:column}.metric span{font-weight:800;color:var(--green)}.metric strong{font-size:30px;line-height:1;margin:15px 0 8px;letter-spacing:-.04em}.metric small{color:var(--muted);margin-top:auto}.card{padding:17px;margin:10px 0}.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.two>.card{margin:0}.scroll{overflow:auto;margin-top:12px}table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}th,td{text-align:right;padding:9px 8px;border-bottom:1px solid #e5e3d9;white-space:nowrap}th:first-child,td:first-child{text-align:left}th{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)}td small{color:var(--muted);margin-left:3px}.pending{color:#9a7215}.coverage{display:flex;align-items:baseline;gap:12px}.coverage strong{font-size:34px;color:var(--green)}.notes p{max-width:900px}.danger{border-color:#e2aaa5;color:var(--danger)}code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#ebe9df;padding:2px 5px;border-radius:5px}@media(max-width:850px){header{align-items:flex-start;flex-direction:column}.metrics{grid-template-columns:repeat(2,1fr)}nav{justify-content:flex-start}.two{grid-template-columns:1fr}}@media(max-width:480px){main{padding:20px 10px 50px}.metrics{grid-template-columns:1fr 1fr}.metric{min-height:118px;padding:12px}.metric strong{font-size:25px}.card{padding:13px}th,td{padding:8px 6px}}
  </style></head><body><main>${body}</main></body></html>`;
}
