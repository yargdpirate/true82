// GET /api/identity — first-party same-browser retention identity for TRUE 82.
// POST /api/identity with {action:"optout"|"optin"} controls the site-specific opt-out.
// DNT/GPC are observed for diagnostics but do not disable strictly first-party analytics.

const CONSENT_REGIONS = new Set([
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE",
  "IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","IS","LI","NO",
  "GB","CH"
]);
const RID_COOKIE = "t82_rid";
const OPTOUT_COOKIE = "t82_ro";
const MAX_AGE_DAYS = 400;
const MAX_AGE_SECONDS = MAX_AGE_DAYS * 86400;
const ID_RE = /^v1-[A-Za-z0-9-]{16,60}$/;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET" && request.method !== "POST") return new Response("method", { status: 405 });

  const cookies = parseCookies(request.headers.get("cookie") || "");
  const country = String((request.cf && request.cf.country) || "").toUpperCase();
  const gpc = request.headers.get("sec-gpc") === "1" || request.headers.get("x-t82-gpc") === "1";
  const dnt = /^(1|yes)$/i.test(request.headers.get("dnt") || "") || request.headers.get("x-t82-dnt") === "1";
  const sid = cleanHeader(request.headers.get("x-t82-sid"), 64);
  const localId = validId(request.headers.get("x-t82-local-id"));
  const storageHeader = String(request.headers.get("x-t82-storage") || "").toLowerCase();
  const storageOk = storageHeader === "ok" ? 1 : (storageHeader === "blocked" ? 0 : null);
  const cookieId = validId(cookies[RID_COOKIE]);
  let action = "";

  if (request.method === "POST") {
    try {
      const text = await request.text();
      if (text.length <= 512) {
        const body = text ? JSON.parse(text) : {};
        action = body && typeof body.action === "string" ? body.action.toLowerCase() : "";
      }
    } catch {}
  }

  const headers = baseHeaders();
  if (action === "optout") {
    headers.append("set-cookie", expireCookie(RID_COOKIE));
    headers.append("set-cookie", `${OPTOUT_COOKIE}=1; Max-Age=${MAX_AGE_SECONDS}; Path=/; Secure; HttpOnly; SameSite=Lax`);
    scheduleCoverage(context, env, coverageRow(request, {
      sid, country, gpc, dnt, cookieId, localId, storageOk,
      decision: "disabled", reason: "site_opt_out", identitySource: "none"
    }));
    return json({ persistent: false, reason: "site_opt_out", max_age_days: MAX_AGE_DAYS, signals: { gpc, dnt } }, headers);
  }

  const optedOut = cookies[OPTOUT_COOKIE] === "1" && action !== "optin";
  if (action === "optin") headers.append("set-cookie", expireCookie(OPTOUT_COOKIE));

  let persistent = false;
  let reason = "unknown_region";
  let visitorId = "";
  let identitySource = "none";

  if (optedOut) {
    reason = "site_opt_out";
    headers.append("set-cookie", expireCookie(RID_COOKIE));
  } else if (!country || country === "XX" || country === "T1") {
    reason = "unknown_region";
    headers.append("set-cookie", expireCookie(RID_COOKIE));
  } else if (CONSENT_REGIONS.has(country)) {
    reason = "consent_region";
    headers.append("set-cookie", expireCookie(RID_COOKIE));
  } else {
    persistent = true;
    reason = (gpc || dnt) ? "eligible_privacy_signal" : "eligible";
    if (cookieId) {
      visitorId = cookieId;
      identitySource = "cookie";
    } else if (localId) {
      visitorId = localId;
      identitySource = "local_recovery";
    } else {
      visitorId = makeId();
      identitySource = "new";
    }
    headers.append("set-cookie", `${RID_COOKIE}=${visitorId}; Max-Age=${MAX_AGE_SECONDS}; Path=/; Secure; HttpOnly; SameSite=Lax`);
  }

  scheduleCoverage(context, env, coverageRow(request, {
    sid, country, gpc, dnt, cookieId, localId, storageOk,
    decision: persistent ? "enabled" : "disabled", reason, identitySource
  }));

  return json({
    persistent,
    reason,
    visitor_id: persistent ? visitorId : undefined,
    identity_source: identitySource,
    max_age_days: MAX_AGE_DAYS,
    signals: { gpc, dnt }
  }, headers);
}

function coverageRow(request, x) {
  const ua = request.headers.get("user-agent") || "";
  return {
    ts: Date.now(),
    local_day: cleanHeader(request.headers.get("x-t82-local-day"), 10) || new Date().toISOString().slice(0, 10),
    sid: x.sid,
    decision: x.decision,
    reason: x.reason,
    country: x.country ? x.country.slice(0, 2) : null,
    device: deviceName(ua),
    browser: browserName(ua),
    gpc: x.gpc ? 1 : 0,
    dnt: x.dnt ? 1 : 0,
    cookie_present: x.cookieId ? 1 : 0,
    local_present: x.localId ? 1 : 0,
    storage_ok: x.storageOk,
    identity_source: x.identitySource
  };
}

function scheduleCoverage(context, env, row) {
  if (!env || !env.DB) return;
  let work;
  try { work = env.DB.prepare(`INSERT INTO retention_coverage_v1
    (ts,local_day,sid,decision,reason,country,device,browser,gpc,dnt,cookie_present,local_present,storage_ok,identity_source)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      row.ts,row.local_day,row.sid,row.decision,row.reason,row.country,row.device,row.browser,
      row.gpc,row.dnt,row.cookie_present,row.local_present,row.storage_ok,row.identity_source
    ).run().catch(() => {}); }
  catch { return; }
  if (typeof context.waitUntil === "function") context.waitUntil(work);
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
function makeId() {
  const raw = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  return `v1-${String(raw).replace(/[^A-Za-z0-9-]/g, "").slice(0, 60)}`;
}
function cleanHeader(v, max) {
  if (typeof v !== "string") return null;
  const s = v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return s ? s.slice(0, max) : null;
}
function expireCookie(name) { return `${name}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Lax`; }
function baseHeaders() {
  const h = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, max-age=0",
    "x-content-type-options": "nosniff"
  });
  return h;
}
function json(value, headers) { return new Response(JSON.stringify(value), { headers }); }
function deviceName(ua) { return /Tablet|iPad/i.test(ua) ? "tablet" : (/Mobi|Android|iPhone/i.test(ua) ? "mobile" : "desktop"); }
function browserName(ua) {
  return /Edg\//i.test(ua) ? "Edge"
    : /OPR\//i.test(ua) ? "Opera"
    : /SamsungBrowser\//i.test(ua) ? "Samsung"
    : /CriOS\//i.test(ua) ? "Chrome iOS"
    : /FxiOS\//i.test(ua) ? "Firefox iOS"
    : /Chrome\//i.test(ua) ? "Chrome"
    : /Firefox\//i.test(ua) ? "Firefox"
    : /Safari\//i.test(ua) ? "Safari" : "Other";
}
