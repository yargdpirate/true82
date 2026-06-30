// POST /api/event — cookieless event ingestion -> D1.
// Stores only behavioral fields plus a coarse, server-derived device/country.
// Never stores the raw IP or the User-Agent string. Bind your D1 database as "DB".

const NAMES = new Set([
  "session_start", "session_end", "data_ready", "data_error",
  "game_start", "round_advance", "game_complete", "replay", "share",
  "heatcheck_shown", "heatcheck_action", "heatcheck_result", "donate_click"
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

  const num = (v) => (v === null || v === undefined || v === "" || isNaN(Number(v)) ? null : Number(v));
  const int = (v) => { const n = num(v); return n === null ? null : Math.trunc(n); };
  const bit = (v) => (v === true || v === 1 || v === "1" ? 1 : (v === false || v === 0 || v === "0" ? 0 : null));
  const str = (v, set, max) => {
    if (typeof v !== "string") return null;
    if (set && !set.has(v)) return null;
    return v.slice(0, max || 64);
  };

  const ua = request.headers.get("user-agent") || "";
  const device = /Tablet|iPad/i.test(ua) ? "tablet" : (/Mobi|Android|iPhone/i.test(ua) ? "mobile" : "desktop");
  const country = (request.cf && request.cf.country) || null;

  const r = {
    ts: Date.now(),
    sid: b.sid.slice(0, 64),
    name: b.name,
    mode: str(b.mode, MODES, 16),
    round: int(b.round),
    wins: int(b.wins),
    net: num(b.net),
    undefeated: bit(b.undefeated),
    budget_used: int(b.budget_used),
    roster_value: int(b.roster_value),
    segment: str(b.segment, null, 16),
    variant: str(b.variant, null, 80),
    pulled: bit(b.pulled),
    hit_82: bit(b.hit_82),
    duration: int(b.duration),
    games_played: int(b.games_played),
    max_round: int(b.max_round),
    load_ms: int(b.load_ms),
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
  } catch (e) { /* swallow: analytics must never surface an error to the player */ }

  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
