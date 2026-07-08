// POST /api/event — cookieless event ingestion -> D1.
// Stores only behavioral fields plus a coarse, server-derived device/country.
// Never stores the raw IP or the User-Agent string. Bind your D1 database as "DB".

const NAMES = new Set([
  "session_start", "session_end", "data_ready", "data_error",
  "game_start", "round_advance", "game_complete", "replay", "share",
  "heatcheck_shown", "heatcheck_action", "heatcheck_result", "donate_click",
  "recap_shown", "recap_read", "recap_skip"
]);
const MODES = new Set(["classic", "pro", "cap", "kaman"]);
const VIEWPORTS = new Set(["sm", "md", "lg"]);
const DEVICES = new Set(["mobile", "tablet", "desktop"]);

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return new Response("method", { status: 405 });
  if (!env.DB) return new Response(null, { status: 204 }); // analytics off; never break the page

  let b;
  try { b = await request.json(); } catch { return new Response(null, { status: 204 }); }
  if (!b || typeof b !== "object" || !NAMES.has(b.name) || typeof b.sid !== "string") {
    return new Response(null, { status: 204 });
  }

  // Number.isFinite rejects Infinity/NaN (isNaN did NOT: Number("1e999") === Infinity,
  // which would silently poison every AVG() on the dashboard).
  const num = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
  const int = (v) => { const n = num(v); return n === null ? null : Math.trunc(n); };
  const bit = (v) => (v === true || v === 1 || v === "1" ? 1 : (v === false || v === 0 || v === "0" ? 0 : null));
  const str = (v, set, max) => {
    if (typeof v !== "string") return null;
    if (set && !set.has(v)) return null;
    return v.slice(0, max || 64);
  };
  // Clamp numeric fields to sane ranges so one bad/garbage POST can't skew aggregates.
  const clamp = (n, lo, hi) => (n === null ? null : Math.max(lo, Math.min(hi, n)));

  const ua = request.headers.get("user-agent") || "";
  const device = /Tablet|iPad/i.test(ua) ? "tablet" : (/Mobi|Android|iPhone/i.test(ua) ? "mobile" : "desktop");
  const country = (request.cf && request.cf.country) || null;

  const r = {
    ts: Date.now(),
    sid: b.sid.slice(0, 64),
    name: b.name,
    mode: str(b.mode, MODES, 16),
    round: clamp(int(b.round), 1, 5),
    wins: clamp(int(b.wins), 0, 82),
    net: clamp(num(b.net), -100, 100),
    undefeated: bit(b.undefeated),
    budget_used: clamp(int(b.budget_used), 0, 1000),
    roster_value: clamp(int(b.roster_value), 0, 1000),
    segment: str(b.segment, null, 16),
    variant: str(b.variant, null, 80),
    pulled: bit(b.pulled),
    hit_82: bit(b.hit_82),
    duration: clamp(int(b.duration), 0, 86400000),
    games_played: clamp(int(b.games_played), 0, 1000),
    max_round: clamp(int(b.max_round), 0, 5),
    load_ms: clamp(int(b.load_ms), 0, 600000),
    referrer: str(b.referrer, null, 256),
    device: DEVICES.has(device) ? device : "desktop",
    country: country ? String(country).slice(0, 2) : null,
    viewport: str(b.viewport, VIEWPORTS, 4)
  };

  try {
    await env.DB.prepare(
      `INSERT INTO events
        (ts,sid,name,mode,round,wins,net,undefeated,budget_used,roster_value,
         segment,variant,pulled,hit_82,duration,games_played,max_round,load_ms,referrer,device,country,viewport)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      r.ts, r.sid, r.name, r.mode, r.round, r.wins, r.net, r.undefeated,
      r.budget_used, r.roster_value, r.segment, r.variant, r.pulled, r.hit_82, r.duration,
      r.games_played, r.max_round, r.load_ms, r.referrer, r.device, r.country, r.viewport
    ).run();
  } catch (e) {
    // Swallow so analytics never surfaces to the player, but expose the reason in a
    // header so a schema mismatch (e.g. missing column) is visible via `curl -si`.
    return new Response(null, { status: 204, headers: { "cache-control": "no-store", "x-t82-err": String(e && e.message).slice(0, 80) } });
  }

  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
