// GET /avocado — unguessable-URL analytics viewer for TRUE 82.
// The path IS the gate (no auth). Reads aggregates from D1 (bind as "DB") and renders a
// self-contained dashboard. noindex + no-store so the page stays private and uncached.

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") return new Response("method", { status: 405 });
  const url = new URL(request.url);
  if (env.DASH_KEY && url.searchParams.get("k") !== env.DASH_KEY) return new Response("not found", { status: 404 });
  if (!env.DB) {
    return html(page("TRUE 82 · analytics",
      `<div class="card"><p class="muted">No D1 binding found. Create the database, then bind it as <code>DB</code> under Pages → Settings → Functions → D1 bindings.</p></div>`));
  }

  const q = (sql) => env.DB.prepare(sql).all().then((r) => r.results || []).catch(() => []);
  const one = (sql) => env.DB.prepare(sql).first().catch(() => null);

  const [completes, roundFunnel, modeMix, hcAction, hcSeg, shareByU, deviceMix, referrers, endRows, donateMix, hhHits] =
    await Promise.all([
      q(`SELECT mode, wins, undefeated, sid FROM events WHERE name='game_complete' ORDER BY ts DESC LIMIT 100000`),
      q(`SELECT round, COUNT(*) c FROM events WHERE name='round_advance' GROUP BY round ORDER BY round`),
      q(`SELECT COALESCE(mode,'?') mode, COUNT(*) c FROM events WHERE name='game_start' GROUP BY mode ORDER BY c DESC`),
      q(`SELECT pulled, COUNT(*) c FROM events WHERE name='heatcheck_action' GROUP BY pulled`),
      q(`SELECT COALESCE(segment,'?') segment, COUNT(*) c, SUM(COALESCE(hit_82,0)) h FROM events WHERE name='heatcheck_result' GROUP BY segment ORDER BY c DESC`),
      q(`SELECT COALESCE(undefeated,0) u, COUNT(*) c FROM events WHERE name='share' GROUP BY u`),
      q(`SELECT COALESCE(device,'?') d, COUNT(*) c FROM events WHERE name='session_start' GROUP BY d ORDER BY c DESC`),
      q(`SELECT referrer, COUNT(*) c FROM events WHERE name='session_start' AND referrer IS NOT NULL AND referrer<>'' GROUP BY referrer ORDER BY c DESC LIMIT 8`),
      q(`SELECT sid, games_played g FROM events WHERE name='session_end' AND games_played IS NOT NULL`),
      q(`SELECT COALESCE(variant,'?') variant, COUNT(*) c FROM events WHERE name='donate_click' GROUP BY variant ORDER BY c DESC`),
      q(`SELECT COALESCE(mode,'?') mode, COUNT(*) c FROM events WHERE name='heatcheck_result' AND hit_82=1 GROUP BY mode`)
    ]);

  // These headline queries are independent — run them in parallel instead of one-at-a-time.
  const [
    sessionsRow, startsRow, startSidsRow, completesRow, shownRow, errorsRow,
    loadRow, sessRow, prestiRow
  ] = await Promise.all([
    one(`SELECT COUNT(*) c FROM events WHERE name='session_start'`),
    one(`SELECT COUNT(*) c FROM events WHERE name='game_start'`),
    one(`SELECT COUNT(DISTINCT sid) c FROM events WHERE name='game_start'`),
    one(`SELECT COUNT(*) c FROM events WHERE name='game_complete'`),
    one(`SELECT COUNT(*) c FROM events WHERE name='heatcheck_shown'`),
    one(`SELECT COUNT(*) c FROM events WHERE name='data_error'`),
    one(`SELECT ROUND(AVG(load_ms)) ms FROM events WHERE name='data_ready'`),
    // Engagement per SESSION (max per sid) so a returning player who re-emits an updated
    // session_end is counted once, at their fullest, instead of undercounted.
    one(`SELECT ROUND(AVG(d)/1000.0,1) sec, ROUND(AVG(g),2) g, MAX(mr) mr FROM
           (SELECT sid, MAX(duration) d, MAX(games_played) g, MAX(max_round) mr
              FROM events WHERE name='session_end' GROUP BY sid)`),
    one(`SELECT ROUND(AVG(budget_used),1) bu, ROUND(AVG(roster_value),1) rv, COUNT(*) c FROM events WHERE name='game_complete' AND mode='cap'`)
  ]);
  const sessions   = cnt(sessionsRow);
  const starts     = cnt(startsRow);
  const startSids  = cnt(startSidsRow);
  const completesN = cnt(completesRow);
  const shown      = cnt(shownRow);
  const errors     = cnt(errorsRow);

  // ---- per-mode headline (median computed in JS from raw rows) ----
  const byMode = {};
  completes.forEach((r) => { const m = r.mode || "?"; (byMode[m] = byMode[m] || []).push({ wins: +r.wins || 0, undef: +r.undefeated || 0 }); });
  // Hot Hand 82s live only in heatcheck_result (game_complete logs pre-boost wins at
  // exactly 81), so natural + HH can be summed without double counting. The "w/ HH"
  // column is the same math the public footer's "Presti winrate" uses.
  const hhByMode = {};
  hhHits.forEach((r) => { hhByMode[r.mode || "?"] = +r.c || 0; });
  const modeRows = Object.keys(byMode).sort().map((m) => {
    const arr = byMode[m], wins = arr.map((a) => a.wins).sort((a, b) => a - b);
    const undef = arr.reduce((s, a) => s + a.undef, 0);
    return { mode: m, n: arr.length, median: median(wins), mean: round1(avg(wins)),
             undefPct: round1(100 * undef / (arr.length || 1)),
             w82Pct: round1(100 * (undef + (hhByMode[m] || 0)) / (arr.length || 1)) };
  });

  // ---- win distribution (all modes pooled) ----
  const hist = histogram(completes.map((r) => +r.wins || 0), 0, 82, 14);
  const histMax = Math.max(1, ...hist.map((b) => b.c));

  // ---- funnel + bounce ----
  const bouncePct = pct(sessions - startSids, sessions);
  const startRate = pct(startSids, sessions);
  const completeRate = pct(completesN, starts);
  const rfMax = Math.max(1, ...roundFunnel.map((r) => +r.c || 0), starts);

  // ---- heat check ----
  const pulled = pick(hcAction, "pulled", 1);
  const skipped = pick(hcAction, "pulled", 0);
  const pullRate = pct(pulled, shown);
  const hitTotal = hcSeg.reduce((s, r) => s + (+r.h || 0), 0);
  const segMax = Math.max(1, ...hcSeg.map((r) => +r.c || 0));

  // ---- sharing by outcome ----
  const shareU = pick(shareByU, "u", 1), shareO = pick(shareByU, "u", 0), shareTotal = shareU + shareO;

  // ---- #4 proxy: per-session avg wins vs games played in that session ----
  const winsBySid = {};
  completes.forEach((r) => { (winsBySid[r.sid] = winsBySid[r.sid] || []).push(+r.wins || 0); });
  const pts = [];
  endRows.forEach((r) => { const w = winsBySid[r.sid]; if (w && w.length) pts.push([avg(w), +r.g || 0]); });
  const corr = pts.length >= 2 ? round2(pearson(pts)) : null;

  const modeMax = Math.max(1, ...modeMix.map((r) => +r.c || 0));
  const devMax = Math.max(1, ...deviceMix.map((r) => +r.c || 0));
  const refMax = Math.max(1, ...referrers.map((r) => +r.c || 0));
  const donateTotal = donateMix.reduce((s, r) => s + (+r.c || 0), 0);
  const donateMax = Math.max(1, ...donateMix.map((r) => +r.c || 0));
  // Labels currently in rotation — KEEP IN SYNC with DONATE_MSGS in app.js.
  // Anything else in the data is a retired label kept for history and marked below.
  const DONATE_ACTIVE = new Set([
    "Fund my caffeine dependency", "Feed my GOAT herd", "Fuel the token furnace",
    "Help me pay the luxury tax", "Money me. Money now.",
    "100% goes to girlfriend", "Fund weekly challenges",
    "Keep developing the game", "Prove my parents wrong"
  ]);

  // ===================== render =====================
  const cards = [];

  cards.push(card("Outcomes by mode", `
    <table>
      <thead><tr><th>mode</th><th>games</th><th>median W</th><th>mean W</th><th>undefeated</th><th>82-0 w/ HH</th></tr></thead>
      <tbody>${modeRows.length ? modeRows.map((r) =>
        `<tr><td class="k">${esc(r.mode)}</td><td>${r.n}</td><td class="big">${r.median}</td><td>${r.mean}</td><td>${r.undefPct}%</td><td>${r.w82Pct}%</td></tr>`
      ).join("") : emptyRow(6)}</tbody>
    </table>
    <p class="muted">undefeated = drafted 82-0 · w/ HH also counts Hot Hand conversions — the footer's Presti winrate.</p>`));

  cards.push(card("Win distribution (all modes)",
    hist.some((b) => b.c) ? hist.map((b) => bar(`${b.lo}–${b.hi}`, b.c, histMax)).join("") : muted("no completed games yet")));

  cards.push(card("Funnel · per visit", `
    <div class="stat3">
      ${stat(sessions, "sessions")}${stat(startRate + "%", "started a game")}${stat(completeRate + "%", "finished it")}
    </div>
    <p class="muted">bounce (no game started): <b>${bouncePct}%</b> · play-through = finishes ÷ sessions = <b>${pct(completesN, sessions)}%</b></p>
    <div class="sub">round reached</div>
    ${roundFunnel.length ? roundFunnel.map((r) => bar("round " + r.round, +r.c || 0, rfMax)).join("") : muted("no rounds yet")}`));

  cards.push(card("Engagement", `
    <div class="stat3">
      ${stat(sessRow && sessRow.sec != null ? sessRow.sec + "s" : "—", "avg session")}
      ${stat(sessRow && sessRow.g != null ? sessRow.g : "—", "games / session")}
      ${stat(sessRow && sessRow.mr != null ? sessRow.mr : "—", "deepest round")}
    </div>
    <p class="muted">#4 proxy — within-visit win rate vs games played: ${corr === null
      ? "<b>n/a</b> (need ≥2 sessions with a finish)"
      : `<b>r = ${corr}</b> across ${pts.length} sessions ${corrWord(corr)}`}</p>`));

  cards.push(card("Heat Check", `
    <div class="stat3">
      ${stat(shown, "shown")}${stat(pullRate + "%", "pull rate")}${stat(hitTotal, "hit 82-0")}
    </div>
    <p class="muted">pulled <b>${pulled}</b> · skipped <b>${skipped}</b></p>
    <div class="sub">segment landed (· hits)</div>
    ${hcSeg.length ? hcSeg.map((r) => bar(r.segment, +r.c || 0, segMax, `${r.c}${(+r.h || 0) ? " · " + r.h : ""}`)).join("") : muted("no spins yet")}`));

  cards.push(card("Sharing", `
    <div class="stat3">
      ${stat(shareTotal, "shares")}${stat(pct(shareTotal, completesN) + "%", "of finishes")}${stat(pct(shareU, shareTotal) + "%", "were 82-0")}
    </div>
    <p class="muted">undefeated shares <b>${shareU}</b> vs other <b>${shareO}</b> — do perfect runs share more?</p>`));

  cards.push(card("Donate clicks", donateTotal ? `
    <div class="stat3">
      ${stat(donateTotal, "clicks")}${stat(donateMix.length, "messages used")}${stat(pct(donateTotal, completesN) + "%", "of finishes")}
    </div>
    <div class="sub">by message</div>
    ${donateMix.map((r) => bar(r.variant + (DONATE_ACTIVE.has(r.variant) ? "" : " · retired"), +r.c || 0, donateMax)).join("")}`
    : muted("no donate clicks yet")));

  cards.push(card("Presti economy", prestiRow && prestiRow.c ? `
    <div class="stat3">
      ${stat("$" + (prestiRow.rv != null ? prestiRow.rv : "—"), "avg roster $")}
      ${stat("$" + (prestiRow.bu != null ? prestiRow.bu : "—"), "avg spent (+rerolls)")}
      ${stat(prestiRow.c, "Presti games")}
    </div>
    <p class="muted">roster $ tracks whether players still overpay for priced traps or learn the value.</p>`
    : muted("no Presti games yet")));

  cards.push(card("Traffic & tech", `
    <div class="sub">device</div>
    ${deviceMix.length ? deviceMix.map((r) => bar(r.d, +r.c || 0, devMax)).join("") : muted("—")}
    <div class="sub">top referrers</div>
    ${referrers.length ? referrers.map((r) => bar(shortRef(r.referrer), +r.c || 0, refMax)).join("") : muted("(direct / none)")}
    <p class="muted">avg load <b>${loadRow && loadRow.ms != null ? loadRow.ms + " ms" : "—"}</b> · load errors <b>${errors}</b></p>`));

  const header = `
    <div class="head">
      <div><h1>TRUE 82 <span class="dot">·</span> analytics</h1>
        <div class="muted">${sessions.toLocaleString()} sessions · ${completesN.toLocaleString()} games finished · all-time</div></div>
      <button class="refresh" onclick="location.reload()">refresh</button>
    </div>`;

  return html(page("TRUE 82 · analytics", header + `<div class="grid">${cards.join("")}</div>`));
}

/* ---------- helpers ---------- */
function cnt(row) { return row && row.c != null ? +row.c : 0; }
function round1(n) { return Math.round((+n || 0) * 10) / 10; }
function round2(n) { return Math.round((+n || 0) * 100) / 100; }
function avg(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0; }
function pct(n, d) { return d ? round1(100 * n / d) : 0; }
function pick(rows, key, val) { const r = rows.find((x) => +x[key] === val); return r ? +r.c || 0 : 0; }
function median(sorted) { if (!sorted.length) return 0; const m = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[m] : round1((sorted[m - 1] + sorted[m]) / 2); }
function histogram(vals, lo, hi, bins) {
  const w = (hi - lo) / bins;
  const out = Array.from({ length: bins }, (_, i) => ({ lo: Math.round(lo + i * w), hi: Math.round(lo + (i + 1) * w), c: 0 }));
  vals.forEach((v) => { let i = Math.floor((v - lo) / w); if (i < 0) i = 0; if (i >= bins) i = bins - 1; out[i].c++; });
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
function shortRef(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return u.slice(0, 32); } }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function stat(v, label) { return `<div class="s"><div class="sv">${esc(v)}</div><div class="sl">${esc(label)}</div></div>`; }
function bar(label, value, max, sub) {
  const w = max ? Math.max(2, Math.round(100 * value / max)) : 0;
  return `<div class="row"><span class="rl">${esc(label)}</span><span class="rt"><span class="fill" style="width:${w}%"></span></span><span class="rv">${esc(sub != null ? sub : value)}</span></div>`;
}
function card(title, body) { return `<section class="card"><h2>${esc(title)}</h2>${body}</section>`; }
function muted(t) { return `<p class="muted">${esc(t)}</p>`; }
function emptyRow(cols) { return `<tr><td colspan="${cols}" class="muted">no data yet</td></tr>`; }

function html(body) {
  return new Response(body, { headers: { "content-type": "text/html;charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
}
function page(title, inner) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${esc(title)}</title><style>
:root{--ink:#101418;--tunnel:#1A2027;--tunnel2:#232B34;--chalk:#E8E4D8;--dim:#9AA0A6;--maple:#B98A4F;--amber:#FFB52E;--whistle:#E2654E;--ok:#8FB99B}
*{box-sizing:border-box}body{margin:0;background:var(--ink);color:var(--chalk);font:15px/1.5 Barlow,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:980px;margin:0 auto;padding:22px 16px 60px}
.head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin:6px 2px 20px}
h1{font:700 26px/1 'Barlow Condensed',sans-serif;letter-spacing:.02em;margin:0 0 6px;text-transform:uppercase}
.dot{color:var(--maple)}h2{font:700 13px/1 'Barlow Condensed',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin:0 0 12px}
.muted{color:var(--dim);font-size:13px;margin:10px 0 0}.muted b{color:var(--chalk)}code{font-family:'IBM Plex Mono',monospace;color:var(--maple)}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}@media(max-width:680px){.grid{grid-template-columns:1fr}}
.card{background:var(--tunnel);border:1px solid var(--tunnel2);border-radius:12px;padding:16px}
.refresh{background:none;border:1px solid var(--tunnel2);color:var(--dim);font:600 12px 'IBM Plex Mono',monospace;padding:7px 12px;border-radius:8px;cursor:pointer}
.refresh:active{border-color:var(--maple);color:var(--chalk)}
table{width:100%;border-collapse:collapse;font-size:14px}th{text-align:right;font:600 11px 'IBM Plex Mono',monospace;letter-spacing:.06em;color:var(--dim);text-transform:uppercase;padding:0 0 8px}
th:first-child,td:first-child{text-align:left}td{text-align:right;padding:6px 0;border-top:1px solid var(--tunnel2);font-family:'IBM Plex Mono',monospace}
td.k{color:var(--chalk);text-transform:capitalize}td.big{color:var(--amber);font-weight:600}
.stat3{display:flex;gap:10px;margin-bottom:4px}.s{flex:1;background:var(--ink);border:1px solid var(--tunnel2);border-radius:9px;padding:11px 10px;text-align:center}
.sv{font:600 22px 'IBM Plex Mono',monospace;color:var(--chalk)}.sl{font-size:11px;color:var(--dim);margin-top:3px;letter-spacing:.03em}
.sub{font:600 11px 'IBM Plex Mono',monospace;letter-spacing:.08em;color:var(--dim);text-transform:uppercase;margin:14px 0 8px}
.row{display:flex;align-items:center;gap:10px;margin:5px 0}.rl{flex:0 0 92px;font-size:12px;color:var(--dim);font-family:'IBM Plex Mono',monospace;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rt{flex:1;height:16px;background:var(--ink);border-radius:5px;overflow:hidden}.fill{display:block;height:100%;background:linear-gradient(90deg,var(--maple),var(--amber));border-radius:5px}
.rv{flex:0 0 56px;font:600 12px 'IBM Plex Mono',monospace;color:var(--chalk)}
</style></head><body><div class="wrap">${inner}</div></body></html>`;
}
