// POST /api/retention — isolated same-browser retention stream for TRUE 82 v40.
// DNT/GPC do not disable this strictly first-party stream. Consent regions,
// unknown geolocation, and the explicit TRUE 82 opt-out remain hard stops.

const EVENTS = new Set(["visit", "game_start", "game_complete", "share_success", "referral_open"]);
const MODES = new Set(["classic", "pro", "cap", "kaman"]);
const CONSENT_REGIONS = new Set([
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE",
  "IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","IS","LI","NO",
  "GB","CH"
]);
const RID_COOKIE = "t82_rid";
const OPTOUT_COOKIE = "t82_ro";
const MAX_AGE_SECONDS = 400 * 86400;
const ID_RE = /^v1-[A-Za-z0-9-]{16,60}$/;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return new Response("method", { status: 405 });
  if (!env.DB) return noContent("off");

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) return noContent("cross-origin");
    } catch { return noContent("bad-origin"); }
  }

  const cookies = parseCookies(request.headers.get("cookie") || "");
  const country = String((request.cf && request.cf.country) || "").toUpperCase();
  if (cookies[OPTOUT_COOKIE] === "1") return noContent("site-opt-out");
  if (!country || country === "XX" || country === "T1" || CONSENT_REGIONS.has(country)) return noContent("policy");

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > 4096) return noContent("too-large");

  let raw, b;
  try {
    raw = await request.text();
    if (raw.length > 4096) return noContent("too-large");
    b = JSON.parse(raw);
  } catch { return noContent("bad-json"); }

  if (!b || typeof b !== "object" || Array.isArray(b)) return noContent("bad-event");
  if (!EVENTS.has(b.event_name)) return noContent("bad-event");
  const cookieId = validId(cookies[RID_COOKIE]);
  const bodyId = validId(b.visitor_id);
  const visitorId = cookieId || bodyId;
  if (!visitorId) return noContent("bad-id");
  if (typeof b.event_id !== "string" || !/^e-[A-Za-z0-9-]{16,60}$/.test(b.event_id)) return noContent("bad-event-id");
  if (typeof b.local_day !== "string" || !/^20\d{2}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(b.local_day)) return noContent("bad-day");

  const clean = (v, max = 80) => {
    if (typeof v !== "string") return null;
    const s = v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
    return s ? s.slice(0, max) : null;
  };
  const int = (v, lo, hi) => {
    if (v === null || v === undefined || v === "" || !Number.isFinite(Number(v))) return null;
    return Math.max(lo, Math.min(hi, Math.trunc(Number(v))));
  };
  const bit = (v) => v === true || v === 1 || v === "1" ? 1 : (v === false || v === 0 || v === "0" ? 0 : null);

  const ua = request.headers.get("user-agent") || "";
  const device = /Tablet|iPad/i.test(ua) ? "tablet" : (/Mobi|Android|iPhone/i.test(ua) ? "mobile" : "desktop");
  const browser = /Edg\//i.test(ua) ? "Edge"
    : /OPR\//i.test(ua) ? "Opera"
    : /SamsungBrowser\//i.test(ua) ? "Samsung"
    : /CriOS\//i.test(ua) ? "Chrome iOS"
    : /FxiOS\//i.test(ua) ? "Firefox iOS"
    : /Chrome\//i.test(ua) ? "Chrome"
    : /Firefox\//i.test(ua) ? "Firefox"
    : /Safari\//i.test(ua) ? "Safari" : "Other";

  const mode = clean(b.mode, 16);
  const row = {
    ts: Date.now(),
    event_id: b.event_id,
    visitor_id: visitorId,
    local_day: b.local_day,
    event_name: b.event_name,
    sid: clean(b.sid, 64),
    run_id: clean(b.run_id, 64),
    build: clean(b.build, 32),
    mode: mode && MODES.has(mode) ? mode : null,
    entry: clean(b.entry, 48),
    source: clean(b.source, 80),
    daily_num: int(b.daily_num, 0, 1000000),
    official: bit(b.official),
    country: country.slice(0, 2),
    device,
    browser
  };

  try {
    const fields = Object.keys(row);
    const sql = `INSERT OR IGNORE INTO retention_events_v1 (${fields.join(",")}) VALUES (${fields.map(() => "?").join(",")})`;
    await env.DB.prepare(sql).bind(...fields.map((k) => row[k])).run();
    const headers = {};
    if (!cookieId && bodyId) headers["set-cookie"] = `${RID_COOKIE}=${bodyId}; Max-Age=${MAX_AGE_SECONDS}; Path=/; Secure; HttpOnly; SameSite=Lax`;
    const signals = [];
    if (request.headers.get("sec-gpc") === "1") signals.push("gpc");
    if (/^(1|yes)$/i.test(request.headers.get("dnt") || "")) signals.push("dnt");
    if (signals.length) headers["x-t82-privacy-signals-observed"] = signals.join(",");
    return noContent(null, "retention-v2", headers);
  } catch (e) {
    return noContent(String(e && e.message || e));
  }
}

function parseCookies(raw) {
  const out = {};
  raw.split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i < 0) return;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = v;
  });
  return out;
}
function validId(v) { return typeof v === "string" && ID_RE.test(v) ? v : ""; }
function noContent(err, schema, extra = {}) {
  const headers = { "cache-control": "no-store", ...extra };
  if (schema) headers["x-t82-retention-schema"] = schema;
  if (err) headers["x-t82-retention-err"] = String(err).slice(0, 120);
  return new Response(null, { status: 204, headers });
}
