// /:id — publish and render signed TRUE 82 Tribune editions at five-character root URLs.
//
// POST /:id               Publish a signed AI edition (idempotent).
// POST /:id?open=1        Count one human page-open beacon.
// GET  /:id               Render the permanent newsprint share page.
// HEAD /:id               Probe existence without incrementing counters.
//
// Bindings:
//   DB              D1 database with migrations/0005_recaps.sql applied
//   RECAP_SIGN_KEY  secret shared with functions/api/recap.js

const SHARE_BUILD = "2026-07-11.tribune-share-debug-v2";

/* ---- share-page signature (KEEP BYTE-EQUIVALENT with functions/api/recap.js) ---- */
const SIGN_VERSION = "t82share.v2";
const sigClean = (s, max) => String(s == null ? "" : s).replace(/[<>{}\\]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
const sigNum = (v, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo; };
const modeKeyForSig = (m) => (m === "cap" ? "cap" : m === "pro" ? "pro" : "classic");
function canonicalShare(mode, wins, net, nickname, article, players) {
  return {
    mode: modeKeyForSig(mode),
    wins: Math.round(sigNum(wins, 0, 82)),
    net: sigNum(net, -100, 100).toFixed(1),
    nickname: sigClean(nickname, 48),
    article: sigClean(article, 700),
    players: (Array.isArray(players) ? players : []).slice(0, 5).map((p) => ({
      slot: sigClean(p && p.slot, 2) || "?",
      yr: Math.round(sigNum(p && p.yr, 1974, 2030)),
      name: sigClean(p && p.name, 40) || "Unknown",
      v: sigNum(p && p.v, -5, 25).toFixed(1)
    }))
  };
}
function shareSigMessage(mode, wins, net, nickname, article, players) {
  return SIGN_VERSION + "\n" + JSON.stringify(canonicalShare(mode, wins, net, nickname, article, players));
}
async function hmacHex(secret, msg) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
/* ---- end synced block -------------------------------------------------------- */

const MODE_LABEL = { classic: "Classic", pro: "Pro", cap: "Presti" };
const SLUG_RE = /^[A-Z0-9][A-Za-z0-9_-]{4}$/;

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = String(context.params && context.params.id || "");

  if (url.searchParams.get("share_health") === "1" && (request.method === "GET" || request.method === "HEAD")) {
    return shareHealth(env, request.method === "HEAD");
  }
  if (!SLUG_RE.test(id)) return plain("not found", 404);

  if (request.method === "POST" && url.searchParams.get("open") === "1") {
    if (!env.DB) return new Response(null, { status: 204, headers: noStoreHeaders() });
    try {
      await env.DB.prepare("UPDATE recaps SET views_human=views_human+1 WHERE id=?").bind(id).run();
    } catch (_) {}
    return new Response(null, { status: 204, headers: noStoreHeaders() });
  }

  if (request.method === "POST") return publish(request, env, id);
  if (request.method !== "GET" && request.method !== "HEAD") return plain("method", 405);
  if (!env.DB) return unavailablePage(request.method === "HEAD", 503);

  let row;
  try {
    row = await env.DB.prepare(
      "SELECT id,created_ts,mode,wins,net,nickname,article,players_json,views_raw,views_human,build FROM recaps WHERE id=?"
    ).bind(id).first();
  } catch (_) {
    return unavailablePage(request.method === "HEAD", 503);
  }

  if (!row) return soldOutPage(id, request.method === "HEAD");

  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers: pageHeaders() });
  }

  if (context.waitUntil) {
    context.waitUntil(env.DB.prepare("UPDATE recaps SET views_raw=views_raw+1 WHERE id=?").bind(id).run().catch(() => {}));
  }
  return new Response(renderEdition(row, url.origin), { status: 200, headers: pageHeaders() });
}

async function shareHealth(env, head) {
  let table = false;
  let dbError = null;
  if (env.DB) {
    try {
      const row = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='recaps'").first();
      table = !!(row && row.name === "recaps");
    } catch (e) {
      dbError = String(e && e.message || e).slice(0, 180);
    }
  }
  const body = {
    ok: !!(env.DB && env.RECAP_SIGN_KEY && table && !dbError),
    health: true,
    build: SHARE_BUILD,
    dbBound: !!env.DB,
    signKey: !!env.RECAP_SIGN_KEY,
    recapsTable: table,
    dbError: dbError
  };
  if (head) return new Response(null, { status: 200, headers: jsonHeaders() });
  return json(body, 200);
}

async function publish(request, env, id) {
  if (!env.DB) return json({ ok: false, reason: "db_unavailable" }, 503);
  if (!env.RECAP_SIGN_KEY) return json({ ok: false, reason: "signing_unavailable" }, 503);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 16000) return json({ ok: false, reason: "too_large" }, 413);

  let b;
  try { b = await request.json(); } catch (_) { return json({ ok: false, reason: "bad_json" }, 400); }
  if (!b || typeof b !== "object" || typeof b.sig !== "string" || !Array.isArray(b.players) || b.players.length !== 5) {
    return json({ ok: false, reason: "bad_payload" }, 400);
  }
  if (!/^(classic|pro|cap)$/.test(String(b.mode || ""))) return json({ ok: false, reason: "bad_mode" }, 400);

  const canon = canonicalShare(b.mode, b.wins, b.net, b.nickname, b.article, b.players);
  if (!canon.nickname || !canon.article || canon.players.length !== 5) return json({ ok: false, reason: "bad_payload" }, 400);

  let expected;
  try {
    expected = await hmacHex(env.RECAP_SIGN_KEY, shareSigMessage(b.mode, b.wins, b.net, b.nickname, b.article, b.players));
  } catch (_) {
    return json({ ok: false, reason: "signing_failed" }, 503);
  }
  if (!safeEqual(expected, String(b.sig).toLowerCase())) return json({ ok: false, reason: "bad_signature" }, 403);

  const now = Date.now();
  try {
    const playersJson = JSON.stringify(canon.players);
    const result = await env.DB.prepare(
      `INSERT OR IGNORE INTO recaps
       (id,created_ts,mode,wins,net,nickname,article,players_json,views_raw,views_human,build)
       VALUES (?,?,?,?,?,?,?,?,0,0,?)`
    ).bind(
      id, now, canon.mode, canon.wins, Number(canon.net), canon.nickname, canon.article,
      playersJson, SHARE_BUILD
    ).run();
    const created = !!(result && result.meta && result.meta.changes);
    if (!created) {
      const existing = await env.DB.prepare(
        "SELECT mode,wins,net,nickname,article,players_json FROM recaps WHERE id=?"
      ).bind(id).first();
      const same = !!existing && existing.mode === canon.mode && Number(existing.wins) === canon.wins &&
        Number(existing.net).toFixed(1) === canon.net && existing.nickname === canon.nickname &&
        existing.article === canon.article && existing.players_json === playersJson;
      if (!same) return json({ ok: false, reason: "id_collision" }, 409);
    }
    return json({ ok: true, id, created }, created ? 201 : 200);
  } catch (e) {
    const msg = String(e && e.message || "");
    const missing = /no such table|recaps/i.test(msg);
    return json({ ok: false, reason: missing ? "migration_0005_required" : "db_error" }, 503);
  }
}

function safeEqual(a, b) {
  if (!/^[a-f0-9]{64}$/.test(a) || !/^[a-f0-9]{64}$/.test(b) || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function renderEdition(row, origin) {
  let players = [];
  try { players = JSON.parse(row.players_json) || []; } catch (_) {}
  const wins = Math.max(0, Math.min(82, Number(row.wins) || 0));
  const losses = 82 - wins;
  const title = `The True 82 Tribune — ${row.nickname} finish ${wins}–${losses}!`;
  const description = String(row.article || "").slice(0, 180);
  const canonical = `${origin}/${encodeURIComponent(row.id)}`;
  const playUrl = `/?ref=${encodeURIComponent(row.id)}`;
  const date = new Date(Number(row.created_ts) || Date.now()).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  const roster = players.map((p) => `<li><span>${esc(p.slot)} · ${esc(p.yr)}</span><b>${esc(p.name)}</b><em>${esc(p.v)} value</em></li>`).join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="noindex,nofollow">
<link rel="canonical" href="${esc(canonical)}"><meta property="og:type" content="article"><meta property="og:site_name" content="TRUE 82">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(origin)}/og-image.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${esc(origin)}/og-image.png">
<style>${shareCss()}</style></head><body>
<main class="sheet"><header><div>${esc(date)}</div><h1>The True 82 Tribune</h1><div>SPORTS FINAL · 5¢</div></header>
<div class="rule"></div><p class="edition">SPECIAL EDITION · ${esc(MODE_LABEL[row.mode] || "TRUE 82")}</p>
<section class="hero"><div><p class="kicker">FINAL RECORD</p><div class="record">${wins}–${losses}!</div></div><h2>${esc(row.nickname)} finish ${wins}–${losses}!</h2></section>
<article><p class="byline">By the TRUE 82 sports desk</p><p>${esc(row.article)}</p></article>
<section class="roster"><h3>The five</h3><ul>${roster}</ul><p class="net">Projected net rating ${fmtSigned(row.net)}</p></section>
<a class="cta" href="${esc(playUrl)}">BUILD YOUR OWN FIVE →</a><footer>TRUE82.NET · THE 82–0 CHASE</footer></main>
<script>(function(){try{var k="t82-recap-open:${escJs(row.id)}";if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,"1");var u=location.pathname+"?open=1";if(navigator.sendBeacon){navigator.sendBeacon(u,new Blob(["1"],{type:"text/plain"}));}else{fetch(u,{method:"POST",keepalive:true,credentials:"same-origin"}).catch(function(){});}}catch(e){}})();</script>
</body></html>`;
}

function soldOutPage(id, head) {
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Edition unavailable · TRUE 82</title><style>${shareCss()}</style></head><body><main class="sheet missing"><header><div>ARCHIVE DESK</div><h1>The True 82 Tribune</h1><div>FINAL</div></header><div class="rule"></div><h2>This edition missed the press.</h2><p>The link may have arrived before the paper finished publishing, or the edition is no longer available.</p><a class="cta" href="/?ref=${encodeURIComponent(id)}">BUILD YOUR OWN FIVE →</a></main></body></html>`;
  return new Response(head ? null : body, { status: 404, headers: pageHeaders() });
}
function unavailablePage(head, status) {
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Pressroom unavailable · TRUE 82</title><style>${shareCss()}</style></head><body><main class="sheet missing"><header><div>PRESSROOM</div><h1>The True 82 Tribune</h1><div>HOLD</div></header><div class="rule"></div><h2>The archive is temporarily off press.</h2><a class="cta" href="/">PLAY TRUE 82 →</a></main></body></html>`;
  return new Response(head ? null : body, { status, headers: pageHeaders() });
}

function shareCss() {
  return `:root{color-scheme:light;--ink:#18130e;--paper:#f1e6cd;--amber:#f5ad24}*{box-sizing:border-box}body{margin:0;background:#11151a;color:var(--ink);font-family:Georgia,"Times New Roman",serif;padding:24px 12px}.sheet{width:min(720px,100%);margin:auto;background:radial-gradient(rgba(24,19,14,.055) 1px,transparent 1.2px) 0 0/5px 5px,linear-gradient(#f7efdc,var(--paper));padding:22px clamp(18px,5vw,44px) 28px;box-shadow:0 30px 80px #000b;border:1px solid #3d3328}.sheet header{display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:10px;font:600 10px ui-monospace,monospace;letter-spacing:.09em}.sheet header h1{font:700 clamp(24px,6vw,44px) Georgia,serif;letter-spacing:-.035em;text-align:center;margin:0;white-space:nowrap}.sheet header div:last-child{text-align:right}.rule{border-top:4px double var(--ink);margin:7px 0}.edition,.kicker,.byline,footer{font:600 10px ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase}.edition{text-align:center;margin:8px 0 18px}.hero{display:grid;grid-template-columns:minmax(150px,.7fr) 1.7fr;gap:24px;align-items:center;border-bottom:2px solid var(--ink);padding-bottom:18px}.record{font-size:clamp(46px,12vw,76px);font-weight:700;line-height:.9;letter-spacing:-.06em}.hero h2{font-size:clamp(32px,7vw,58px);line-height:.91;letter-spacing:-.045em;margin:0}.byline{border-bottom:1px solid #665b4d;padding-bottom:6px;margin-top:18px}article>p:last-child{font-size:clamp(18px,3vw,23px);line-height:1.52;text-align:justify}article>p:last-child:first-letter{float:left;font-size:58px;line-height:.75;padding:8px 7px 0 0;font-weight:700}.roster{border-top:3px double var(--ink);margin-top:22px;padding-top:10px}.roster h3{font-size:23px;margin:0 0 8px}.roster ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:6px 18px}.roster li{display:grid;grid-template-columns:64px 1fr auto;gap:7px;border-bottom:1px dotted #756a5b;padding:5px 0;align-items:baseline}.roster li span,.roster li em,.net{font:11px ui-monospace,monospace}.roster li em{font-style:normal;color:#51483e}.net{text-align:right}.cta{display:block;margin:24px 0 14px;background:var(--amber);color:#15110d;text-decoration:none;text-align:center;padding:16px 14px;font:800 19px system-ui,sans-serif;letter-spacing:.04em;border:2px solid #15110d;box-shadow:0 5px 0 #15110d;transform:translateY(-2px)}.cta:active{box-shadow:0 1px 0 #15110d;transform:translateY(2px)}footer{text-align:center}.missing{text-align:center}.missing h2{font-size:38px;margin:32px 0 10px}@media(max-width:560px){body{padding:8px}.sheet{padding:16px 14px 22px}.sheet header{grid-template-columns:1fr}.sheet header h1{grid-row:1;text-align:left}.sheet header div:last-child{text-align:left}.hero{grid-template-columns:1fr;gap:12px}.roster ul{grid-template-columns:1fr}.roster li{grid-template-columns:58px 1fr auto}}`;
}
function pageHeaders() {
  return new Headers({
    "content-type": "text/html;charset=utf-8",
    "cache-control": "no-store",
    "x-robots-tag": "noindex, nofollow",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-t82-share-build": SHARE_BUILD
  });
}
function jsonHeaders() { return new Headers({ "content-type": "application/json;charset=utf-8", "cache-control": "no-store", "x-t82-share-build": SHARE_BUILD }); }
function noStoreHeaders() { return new Headers({ "cache-control": "no-store", "x-t82-share-build": SHARE_BUILD }); }
function json(body, status) { return new Response(JSON.stringify(body), { status, headers: jsonHeaders() }); }
function plain(body, status) { return new Response(body, { status, headers: { "content-type": "text/plain;charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow", "x-t82-share-build": SHARE_BUILD } }); }
function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function escJs(v) { return String(v == null ? "" : v).replace(/[^A-Za-z0-9_-]/g, ""); }
function fmtSigned(v) { const n = Number(v) || 0; return (n >= 0 ? "+" : "") + n.toFixed(1); }
