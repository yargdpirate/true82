/* ============================================================
   PERFECT FIVE — app.js
   Vanilla JS, no build step. Scoring constants come from
   site_data.json meta.scoring at runtime; nothing about the
   model is hardcoded. Eras, spans, buckets, and rollable
   combos are derived from the data.

   Skips are dimension-rerolls:
     • Skip team  = same era, different franchise
     • Skip era   = same franchise, different era
   Eras and teams may repeat across rounds; the only draft
   limit is that a player can't be drafted twice (G.drafted),
   which holds across every franchise/era a player appears in.
   ============================================================ */

"use strict";

var CFG = {
  SITE_NAME: "PERFECT FIVE",
  DATA_URL: "site_data.json?v=sc-v42c",
  GAMES_IN_SEASON: 82,
  POS_THRESHOLD: 20,
  KAMAN_LO: 2004,
  KAMAN_HI: 2016
};

var BUCKETS = ["G", "F", "C"];
var BUCKET_NAME = { G: "Guard", F: "Forward", C: "Center" };
var BUCKET_CAP = { G: 2, F: 2, C: 1 };
CFG.ROUNDS = BUCKETS.reduce(function (s, b) { return s + BUCKET_CAP[b]; }, 0);
var MODE = "classic";

var META = null, SC = null, IDX = null;
var KAMAN_SEASONS = [];   // Kaman Mode: every Chris Kaman season (one row each), the entire draft pool
var CRESTS = {};   // "FRANCHISE|decade" -> data-URI of a custom era crest (optional)
var CREST_DEFAULT = null;  // optional data-URI shown for ANY combo lacking its own crest (temp/testing)
var BASELINE = 10;
var POOLS = new Map();
var POOL_YEARS = new Map();   // "FR|dec" -> Map(name -> [rows], chronological, one per season)
var DECADES = [];
var FR_BY_DEC = new Map();
var DEC_SPAN = new Map();
var SEASON_SPAN = null;
var TEAM2FR = {}, BEST_BY_NAME = new Map(), FRANCHISES = [];
var CAREER_BUCKETS = new Map();   // name -> {G,F,C}: every position the player EVER qualified at, career-wide
var G = null;

/* ---------- Tribune recap diagnostics ----------
   Always installed at app load so the console works before, during, and after
   a season. This is intentionally independent of G because newGame() replaces
   game state. No secrets or full article text are stored in the debug history. */
var T82_RECAP_BUILD = "2026-07-11.tribune-share-debug-v2";
var T82_RECAP_HISTORY = [];
var T82_RECAP_LAST = {
  build: T82_RECAP_BUILD,
  state: "idle",
  source: null,
  reason: null,
  message: "No Tribune request has started in this page load."
};

function recapDebugClone(v) {
  try { return JSON.parse(JSON.stringify(v)); } catch (e) { return v; }
}
function recapDebugEvent(name, fields) {
  var row = Object.assign({
    at: new Date().toISOString(),
    event: name,
    build: T82_RECAP_BUILD
  }, fields || {});
  T82_RECAP_HISTORY.push(row);
  if (T82_RECAP_HISTORY.length > 60) T82_RECAP_HISTORY.shift();
  return row;
}
function recapDebugSet(last) {
  T82_RECAP_LAST = Object.assign({ build: T82_RECAP_BUILD }, last || {});
  window.__T82_RECAP_DEBUG = T82_RECAP_LAST;
  return T82_RECAP_LAST;
}
function recapDebugPrint() {
  var snapshot = {
    build: T82_RECAP_BUILD,
    last: recapDebugClone(T82_RECAP_LAST),
    history: recapDebugClone(T82_RECAP_HISTORY),
    help: "Run t82RecapHealth() to verify the deployed Function, API-key binding, model, and timeout without spending tokens. Run t82RecapDebug('clear') to reset this page's history."
  };
  if (console && console.groupCollapsed) console.groupCollapsed("[tribune] recap diagnostics " + T82_RECAP_BUILD);
  if (console && console.log) {
    console.log("Last request:", snapshot.last);
    if (console.table && snapshot.history.length) console.table(snapshot.history);
    else console.log("History:", snapshot.history);
    console.log(snapshot.help);
  }
  if (console && console.groupEnd) console.groupEnd();
  return snapshot;
}
window.t82RecapDebug = function (action) {
  if (action === "clear") {
    T82_RECAP_HISTORY.length = 0;
    recapDebugSet({ state: "idle", source: null, reason: null, message: "Debug history cleared." });
  }
  return recapDebugPrint();
};
window.t82RecapHealth = function () {
  var started = Date.now();
  recapDebugEvent("health_start", { path: "/api/recap?health=1" });
  if (typeof fetch !== "function") return Promise.reject(new Error("fetch unavailable"));
  return fetch("/api/recap?health=1&_=" + Date.now(), {
    method: "GET",
    cache: "no-store",
    headers: { "accept": "application/json" }
  }).then(function (r) {
    return r.text().then(function (raw) {
      var body = null;
      try { body = JSON.parse(raw); } catch (e) { body = { ok: false, reason: "non_json", preview: raw.slice(0, 240) }; }
      var result = {
        state: "health",
        ok: !!(r.ok && body && body.ok),
        httpStatus: r.status,
        elapsedMs: Date.now() - started,
        body: body,
        cfRay: r.headers.get("cf-ray"),
        serverBuild: r.headers.get("x-t82-recap-build"),
        contentType: r.headers.get("content-type")
      };
      recapDebugEvent("health_result", result);
      if (console && console.log) console.log("[tribune] health", result);
      return result;
    });
  }).catch(function (err) {
    var result = { state: "health", ok: false, elapsedMs: Date.now() - started, reason: "network", error: String(err && err.message || err) };
    recapDebugEvent("health_error", result);
    if (console && console.error) console.error("[tribune] health failed", result);
    return result;
  });
};
recapDebugSet(T82_RECAP_LAST);
if (console && console.log) console.log("[tribune] diagnostics ready — t82RecapDebug() / t82RecapHealth() — build " + T82_RECAP_BUILD);


function shareDebugSnapshot() {
  var g = (typeof G !== "undefined" && G) ? G : null;
  var button = document.querySelector && document.querySelector(".np-share-article");
  var history = T82_RECAP_HISTORY.filter(function (row) { return /^share_/.test(String(row && row.event || "")); });
  return {
    build: T82_RECAP_BUILD,
    origin: (typeof location !== "undefined" && location.origin) || null,
    state: g ? {
      slug: g.recapSlug || null,
      published: !!g.recapPublished,
      publishPending: !!g.recapPublishPromise,
      publishError: recapDebugClone(g.recapPublishError || null),
      hasSignature: !!g.recapSig,
      headlineSource: g.recapHead && g.recapHead.source || null,
      articleSource: g.recapArt && g.recapArt.source || null
    } : null,
    button: button ? { text: button.textContent, disabled: !!button.disabled, title: button.title || null } : null,
    history: recapDebugClone(history),
    help: "Run await t82ShareHealth() before playing. After a failed button press, run t82ShareDebug(). The last share_publish_failed row includes the HTTP status and server reason."
  };
}
window.t82ShareDebug = function (action) {
  if (action === "clear") {
    for (var i = T82_RECAP_HISTORY.length - 1; i >= 0; i--) {
      if (/^share_/.test(String(T82_RECAP_HISTORY[i] && T82_RECAP_HISTORY[i].event || ""))) T82_RECAP_HISTORY.splice(i, 1);
    }
    if (typeof G !== "undefined" && G) G.recapPublishError = null;
  }
  var snapshot = shareDebugSnapshot();
  if (console && console.groupCollapsed) console.groupCollapsed("[tribune] article-share diagnostics " + T82_RECAP_BUILD);
  if (console && console.log) {
    console.log("Current state:", snapshot.state);
    console.log("Button:", snapshot.button);
    if (console.table && snapshot.history.length) console.table(snapshot.history);
    else console.log("History:", snapshot.history);
    console.log(snapshot.help);
  }
  if (console && console.groupEnd) console.groupEnd();
  return snapshot;
};
window.t82ShareHealth = function () {
  var started = Date.now();
  var path = "/A0000?share_health=1&_=" + Date.now();
  recapDebugEvent("share_health_start", { path: path, origin: location.origin });
  return fetch(path, { method: "GET", cache: "no-store", headers: { "accept": "application/json" } })
    .then(function (r) { return r.text().then(function (raw) {
      var body = null;
      try { body = JSON.parse(raw); } catch (e) { body = { ok: false, reason: "non_json", preview: raw.slice(0, 240) }; }
      var result = {
        state: "health", ok: !!(r.ok && body && body.ok), httpStatus: r.status,
        elapsedMs: Date.now() - started, body: body, cfRay: r.headers.get("cf-ray"),
        serverBuild: r.headers.get("x-t82-share-build"), contentType: r.headers.get("content-type")
      };
      recapDebugEvent("share_health_result", result);
      if (console && console.log) console.log("[tribune] share health", result);
      return result;
    }); })
    .catch(function (err) {
      var result = { state: "health", ok: false, elapsedMs: Date.now() - started, reason: "network", error: String(err && err.message || err) };
      recapDebugEvent("share_health_error", result);
      if (console && console.error) console.error("[tribune] share health failed", result);
      return result;
    });
};
if (console && console.log) console.log("[tribune] article-share diagnostics ready — t82ShareDebug() / t82ShareHealth()");

/* ---------- optional feature loading ---------- */

// Keep the first paint and critical site-data request lean. Duel/Arena/League
// code is loaded only when its screen is opened; league-core.js is server/test
// code and is intentionally not shipped to the browser at all.
var SCRIPT_LOADS = {};
function loadScriptOnce(src) {
  if (SCRIPT_LOADS[src]) return SCRIPT_LOADS[src];
  SCRIPT_LOADS[src] = new Promise(function (resolve) {
    if (typeof document === "undefined" || !document.createElement || !document.head) return resolve(false);
    var started = Date.now();
    var tag = document.createElement("script");
    tag.src = src;
    tag.async = true;
    tag.setAttribute("data-t82-feature", src);
    tag.onload = function () {
      analyticsTrack("data_ready", { action: "feature_script", source: src, outcome: "success", load_ms: Date.now() - started });
      resolve(true);
    };
    tag.onerror = function () {
      analyticsTrack("data_error", { action: "feature_script", source: src, outcome: "error", error_code: "script_load", load_ms: Date.now() - started });
      delete SCRIPT_LOADS[src]; resolve(false);
    };
    document.head.appendChild(tag);
  });
  return SCRIPT_LOADS[src];
}
function loadScriptChain(srcs) {
  return srcs.reduce(function (p, src) {
    return p.then(function (ok) { return ok ? loadScriptOnce(src) : false; });
  }, Promise.resolve(true));
}
function ensureDuelUI() {
  if (window.T82DUEL && window.T82DUI) return Promise.resolve(true);
  var missing = [];
  if (!window.T82DUEL) missing.push("duel-core.js");
  if (!window.T82DUI) missing.push("duel-ui.js");
  return loadScriptChain(missing)
    .then(function (ok) { return !!(ok && window.T82DUEL && window.T82DUI); });
}
function ensureArenaUI() {
  if (window.T82ARENA) return Promise.resolve(true);
  return loadScriptOnce("arena-ui.js").then(function (ok) { return !!(ok && window.T82ARENA); });
}
function ensureLeagueUI() {
  if (window.T82LGUI) return Promise.resolve(true);
  return loadScriptOnce("league-ui.js").then(function (ok) { return !!(ok && window.T82LGUI); });
}
function featureLoadFailed(btn, label) {
  if (btn) { btn.disabled = false; btn.textContent = label; }
}

/* ---------- math ---------- */




/* ---------- data ---------- */








/* ---------- eligibility helpers ---------- */










// Skip team: other UNUSED franchises in the SAME era that can fill an open slot

// Skip era: other UNUSED eras where the SAME franchise can fill an open slot



/* ---------- CORE DELEGATION (Stage 2 — accounts) ----------
   ALL game logic now lives in sim-core.js (global T82): tables, eligibility,
   the deal loop, skips, the cap economy, picks, the engine, Hot Hand, and the
   replay verifier. These same-name wrappers pass the global G, so every
   existing call site — and the whole test harness — works unchanged. app.js is
   the UI shell: rendering, input, overlays, cosmetics.
   THE SEED-SPINE INVARIANT moved with the code — read sim-core.js's header
   before touching ANYTHING random. Cosmetic randomness in this file stays on
   Math.random forever. */
var HH_SEGMENTS = T82.HH_SEGMENTS, HH_BONUS_SCALE = T82.HH_BONUS_SCALE;
var CAP_BUDGET = 50;   // mirror for copy/UI; the core owns the real budget (challenge-patchable)

function erf(x) { return T82.erf(null, x); }
function phi(x) { return T82.phi(null, x); }
function key(fr, dec) { return T82.key(null, fr, dec); }
function valueOf(row) { return T82.valueOf(null, row); }
function rowBuckets(row) { return T82.rowBuckets(null, row); }
function capOf(b) { return T82.capOf(G, b); }
function bucketOpen(b) { return T82.bucketOpen(G, b); }
function openBuckets() { return T82.openBuckets(G); }
function rowOpenBuckets(row) { return T82.rowOpenBuckets(G, row); }
function rowDraftable(row) { return T82.rowDraftable(G, row); }
function poolHasEligible(fr, dec) { return T82.poolHasEligible(G, fr, dec); }
function availableEras() { return T82.availableEras(G); }
function teamSkipTargets() { return T82.teamSkipTargets(G); }
function eraSkipTargets() { return T82.eraSkipTargets(G); }
function chargeReroll(spinId) { return T82.chargeReroll(G, spinId); }
function capRoll(d) { return T82.capRoll(G, d); }
function capCost(v, d) { return T82.capCost(G, v, d); }
function assignCapPool(avoid) { return T82.assignCapPool(G, avoid); }
function capMisprice(items) { return T82.capMisprice(G, items); }
function assignProSeasons() { return T82.assignProSeasons(G); }
function effCost(name) { return T82.effCost(G, name); }
function capAffordable(row) { return T82.capAffordable(G, row); }
function capPoolHasPick() { return T82.capPoolHasPick(G); }
function resolveRow(name) { return T82.resolveRow(G, name); }
function engine(rows, slots) { return T82.engine(G, rows, slots); }
function hhNet82() { return T82.hhNet82(G); }
function hhPickHot() { return T82.hhPickHot(G); }
function hhSpinSeg() { return T82.hhSpinSeg(G); }
function hhEligible(e) { return T82.hhEligible(G, e); }
function swapTargetsFor(i) { return T82.swapTargetsFor(G, i); }
function pickHasMoves(i) { return T82.pickHasMoves(G, i); }

function initData(data) {
  // Crests are UI: arrive separately (crests.json) and may land before OR after
  // this data. MERGE instead of reassign (load-race regression, see tests).
  if (data.crests) Object.keys(data.crests).forEach(function (k) { CRESTS[k] = data.crests[k]; });
  CREST_DEFAULT = data.crest_default || CREST_DEFAULT;
  CREST_POOL = null;
  var t = T82.initData(data);
  META = t.META; SC = t.SC; IDX = t.IDX; BASELINE = t.BASELINE;
  POOLS = t.POOLS; POOL_YEARS = t.POOL_YEARS; DECADES = t.DECADES;
  FR_BY_DEC = t.FR_BY_DEC; DEC_SPAN = t.DEC_SPAN; SEASON_SPAN = t.SEASON_SPAN;
  TEAM2FR = t.TEAM2FR; BEST_BY_NAME = t.BEST_BY_NAME; FRANCHISES = t.FRANCHISES;
  CAREER_BUCKETS = t.CAREER_BUCKETS; KAMAN_SEASONS = t.KAMAN_SEASONS;
}

// Product analytics state. analytics.js owns one random in-memory visit id and
// nothing durable: the v43 localStorage identity experiment was retired before
// it ever deployed. The durable same-browser id lives with retention-client.js
// and /api/identity (the v40r2 layer): a 400-day first-party HttpOnly cookie
// with a localStorage fallback, disabled in consent regions and by the site
// opt-out; DNT/GPC are recorded there as diagnostics only. Each game still
// receives a random in-memory run id. The Daily's separate 14-day
// game record remains feature state and only coarse counts leave the browser.
var ANALYTICS_RETURN_SENT = false;
var ANALYTICS_RULES_OPEN_TS = 0;
var ANALYTICS_SEARCH_TIMER = 0;
var ANALYTICS_HOME_N = 0;
var ANALYTICS_RESULT_OBSERVER = null;

function analyticsTrack(name, props) {
  if (window.t82track) window.t82track(name, props || {});
}
function analyticsDailyProfile() {
  if (!window.T82DAILY || !T82DAILY.getState) return null;
  try {
    var s = T82DAILY.getState();
    var keys = Object.keys((s && s.official) || {}).sort();
    var today = T82DAILY.dayKey();
    var last = keys.length ? keys[keys.length - 1] : "";
    var days = null;
    if (last) {
      var a = Date.parse(today + "T12:00:00Z"), b = Date.parse(last + "T12:00:00Z");
      if (Number.isFinite(a) && Number.isFinite(b)) days = Math.max(0, Math.round((a - b) / 86400000));
    }
    return {
      active_days: keys.length,
      streak: T82DAILY.streakFor(today),
      days_since_last: days,
      outcome: keys.length ? "returning_daily_player" : "no_daily_history"
    };
  } catch (e) { return null; }
}
function analyticsSendReturnProfile() {
  if (ANALYTICS_RETURN_SENT) return;
  ANALYTICS_RETURN_SENT = true;
  var p = analyticsDailyProfile();
  if (p) analyticsTrack("return_profile", p);
}
function analyticsVariant() {
  if (!G) return "";
  if (G.analyticsVariant) return G.analyticsVariant;
  if (G.social) return (G.social.target ? "daily-link:" : "daily:") + G.social.num;
  return "";
}

// analytics.js calls this lazily for every row, so UI screens and the current run
// are attached without another persistent identifier or duplicate event stream.
window.t82AnalyticsContext = function () {
  var p = { mode: MODE, screen: G && G.screen ? G.screen : (document.body.classList.contains("gating") ? "daily_gate" : "home") };
  if (!G) return p;
  var v = analyticsVariant();
  if (v) p.variant = v;
  if (G.ch && G.ch.id) p.challenge = G.ch.id;
  if (G.social) {
    p.daily_num = G.social.num;
    p.practice = G.analyticsPractice != null ? G.analyticsPractice : (/^daily-practice:/.test(v) ? 1 : 0);
    p.official = G.analyticsOfficial != null ? G.analyticsOfficial : (p.practice ? 0 : 1);
    if (G.social.target) {
      p.target_wins = G.social.target.w;
      p.target_net = G.social.target.n;
    }
  }
  return p;
};

// Anonymous run telemetry stays in memory until an actual event needs it. This gives
// page-exit and Start over events the current round/team/era plus an accurate Presti
// split without writing a row for every state mutation. The initial cap is UI-only
// metadata; changing it cannot affect replay determinism or the engine result.
function analyticsRunSnapshot(reason) {
  var p = { mode: MODE };
  if (!G) return p;
  p.round = Math.min(CFG.ROUNDS, G.round || 0);
  p.screen = G.screen || "";
  var v = analyticsVariant();
  if (v) p.variant = v;
  if (G.ch && G.ch.id) p.challenge = G.ch.id;
  if (G.social) {
    p.daily_num = G.social.num;
    p.practice = G.analyticsPractice != null ? G.analyticsPractice : (/^daily-practice:/.test(v) ? 1 : 0);
    p.official = G.analyticsOfficial != null ? G.analyticsOfficial : (p.practice ? 0 : 1);
    if (G.social.target) {
      p.target_wins = G.social.target.w;
      p.target_net = G.social.target.n;
    }
  }
  if (G.cur) {
    if (G.cur.fr) p.franchise = G.cur.fr;
    if (G.cur.dec != null) p.decade = G.cur.dec;
  }
  if (MODE === "cap") {
    var playerSpend = G.picks.reduce(function (sum, pick) { return sum + (pick.cost || 0); }, 0);
    var initialCap = typeof G.analyticsInitialCap === "number" ? G.analyticsInitialCap : G.maxCap;
    var rerollSpend = Math.max(0, initialCap - G.maxCap);
    p.player_spend = playerSpend;
    p.reroll_spend = rerollSpend;
    p.roster_value = playerSpend;                 // backward-compatible field
    p.budget_used = playerSpend + rerollSpend;   // corrected: total dollars spent
  }
  if (reason) p.reason = reason;
  return p;
}
function trackRunState() {
  analyticsTrack("run_state", analyticsRunSnapshot());
}
function trackDealView(source) {
  var p = analyticsRunSnapshot();
  p.action = source;
  analyticsTrack("deal_view", p);
}
function trackResultSections() {
  if (ANALYTICS_RESULT_OBSERVER && ANALYTICS_RESULT_OBSERVER.disconnect) {
    ANALYTICS_RESULT_OBSERVER.disconnect();
  }
  ANALYTICS_RESULT_OBSERVER = null;
  var nodes = Array.prototype.slice.call(document.querySelectorAll("[data-result-section]"));
  if (!nodes.length) return;
  var seen = Object.create(null);
  function mark(node) {
    var key = node && node.getAttribute("data-result-section");
    if (!key || seen[key]) return;
    seen[key] = 1;
    analyticsTrack("result_section_view", Object.assign(analyticsRunSnapshot(), {
      surface: "results", action: key
    }));
  }
  if (typeof IntersectionObserver !== "function") {
    nodes.forEach(mark);
    return;
  }
  ANALYTICS_RESULT_OBSERVER = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.2) return;
      mark(entry.target);
      obs.unobserve(entry.target);
    });
  }, { threshold: [0.2, 0.5] });
  nodes.forEach(function (node) { ANALYTICS_RESULT_OBSERVER.observe(node); });
}

function newGame(mode, seed, challenge, opts) {
  if (ANALYTICS_RESULT_OBSERVER && ANALYTICS_RESULT_OBSERVER.disconnect) {
    ANALYTICS_RESULT_OBSERVER.disconnect();
    ANALYTICS_RESULT_OBSERVER = null;
  }
  if (mode) MODE = mode;
  // Presti runs uncapped (owner ruling, 2026-07-26): cap mode is hard enough
  // without the Any Given Night ceiling, so a true murderers' row may project
  // and realize all 82. The constant lives in site data; override it per mode
  // here so every sim-core read sees the right ceiling for the run. Classic
  // keeps the shipped value untouched.
  try {
    if (window.T82 && T82.t && T82.t.SC) {
      T82.t.SC.PG_CAP = (MODE === "cap") ? 1 : 0.991;
    }
  } catch (e) {}
  G = T82.newState(MODE, seed, challenge || null);
  G.analyticsInitialCap = G.maxCap;
  if (opts && opts.social) G.social = opts.social;   // THE DAILY: {key,num,name,chId,target} rides the run
  if (opts && opts.practice != null) G.analyticsPractice = opts.practice ? 1 : 0;
  if (opts && opts.official != null) G.analyticsOfficial = opts.official ? 1 : 0;
  var shareRef = SHARE_REF;
  if (shareRef) SHARE_REF = "";  // one conversion per referred landing, not every replay in the visit
  var sv = opts && opts.variant;   // daily / daily-link / daily-practice start tags
  G.analyticsVariant = shareRef ? "recap:" + shareRef : (sv || "");
  G.analyticsStartedAt = Date.now();
  var startEvent = analyticsRunSnapshot();
  startEvent.surface = opts && opts.surface ? opts.surface : (G.social ? (/^daily-link:/.test(G.analyticsVariant) ? "referral" : "daily") : "home");
  startEvent.action = "start";
  analyticsTrack("game_start", startEvent);
  nextRound(true);
}
function nextRound(animate) {
  var r = T82.dealRound(G);
  if (r === "done") { showResults(); return; }
  dyDealGuard();   // v48.1: dynasty only, and it must sit between the deal and the render
  var snap = analyticsRunSnapshot();
  analyticsTrack("round_advance", snap);
  renderDraft(animate ? r : false);
}
function doTeamSkip() {
  var before = G && G.cur ? { fr: G.cur.fr, dec: G.cur.dec, budget: G.budget } : {};
  var f = T82.skipTeam(G);
  if (f) {
    var p = analyticsRunSnapshot();
    p.action = "team"; p.source = before.fr || ""; p.outcome = G.refundFlash ? "refund" : G.fireSaleFlash ? "fire_sale" : "normal";
    p.amount = Math.max(0, (before.budget == null ? G.budget : before.budget) - G.budget);
    analyticsTrack("reroll", p);
    trackDealView("team_reroll"); trackRunState(); renderDraft(f);
  }
}
function doEraSkip() {
  var before = G && G.cur ? { fr: G.cur.fr, dec: G.cur.dec, budget: G.budget } : {};
  var f = T82.skipEra(G);
  if (f) {
    var p = analyticsRunSnapshot();
    p.action = "era"; p.source = String(before.dec || ""); p.outcome = G.refundFlash ? "refund" : G.fireSaleFlash ? "fire_sale" : "normal";
    p.amount = Math.max(0, (before.budget == null ? G.budget : before.budget) - G.budget);
    analyticsTrack("reroll", p);
    trackDealView("era_reroll"); trackRunState(); renderDraft(f);
  }
}
function doYearReroll() {
  if (MODE !== "cap") return;
  var beforeBudget = G.budget;
  var f = T82.yearReroll(G);
  if (f) {
    var p = analyticsRunSnapshot();
    p.action = "years"; p.outcome = G.refundFlash ? "refund" : G.fireSaleFlash ? "fire_sale" : "normal";
    p.amount = Math.max(0, beforeBudget - G.budget);
    analyticsTrack("reroll", p);
    trackRunState(); renderDraft(f);
  }
}
/* Why a card can't be drafted right now, in the order the engine checks it.
   null = draftable. Challenge filters and pick-hooks were invisible to the cap
   card renderer before 2026-07-13, so hook-blocked cards drew live and the
   confirm tap died silently (the stuck-at-pick-2 bug on The Descent). The
   final rowDraftable catch-all guarantees this can never disagree with the
   engine: the engine stays the single source of legality. */
function pickBlock(row) {
  if (!row) return { tag: "gone", why: "That player is not on this board." };
  var name = row[IDX.name];
  if (G.drafted.has(name)) return { tag: "picked", why: "Already on your roster." };
  if (rowOpenBuckets(row).length === 0) return { tag: "full", why: "No open slot fits him." };
  if (G.ch && G.ch.filter && !G.ch.filter(row, T82.t)) return { tag: "barred", why: chBlockWhy() };
  if (MODE === "cap" && !capAffordable(row)) return { tag: "over", why: "Not enough cap space." };
  if (G.ch && G.ch.pick) {
    var obs = rowOpenBuckets(row), okp = false;
    for (var i = 0; i < obs.length; i++) if (G.ch.pick(G, row, obs[i], T82.t)) { okp = true; break; }
    if (!okp) return { tag: "blocked", why: chBlockWhy() };
  }
  if (!rowDraftable(row)) return { tag: "full", why: "No open slot fits him." };
  return null;
}
function chBlockWhy() { return (G.ch && G.ch.name ? G.ch.name : "The board rules") + " says no."; }
function bucketLegal(row, b) { return !(G.ch && G.ch.pick) || G.ch.pick(G, row, b, T82.t); }
// A rejected tap is never silent: shake and say why, then get out of the way.
function denyRow(node, why) {
  if (!node) return;
  if (why) node.setAttribute("title", why);
  node.classList.remove("deny");
  void node.offsetWidth;                 // restart the shake if they insist
  node.classList.add("deny");
  buzz(20);
  setTimeout(function () { node.classList.remove("deny"); }, 520);
}
function denyTray(msg) {
  var inner = el("trayInner");
  if (!inner) return;
  var note = inner.querySelector(".tray-deny");
  if (!note) {
    note = document.createElement("div");
    note.className = "tray-deny";
    inner.appendChild(note);
  }
  note.textContent = msg;
  denyRow(inner, null);
  clearTimeout(denyTray._t);
  denyTray._t = setTimeout(function () { if (note.parentNode) note.parentNode.removeChild(note); }, 1800);
}
function confirmPick(bucket) {
  if (!G.selected) {
    analyticsTrack("pick_denied", Object.assign(analyticsRunSnapshot(), { action: "no_player", slot: bucket }));
    denyTray("Pick a player first."); return;
  }
  var row = resolveRow(G.selected);
  if (!row) return;
  var selected = G.selected;
  var season = row[IDX.season];
  var cost = MODE === "cap" ? effCost(selected) : null;
  if (T82.applyPick(G, selected, season, bucket)) {
    var p = analyticsRunSnapshot();
    p.player = row[IDX.name]; p.season = season; p.slot = bucket;
    p.ordinal = G.picks.length; p.value = cost; p.source = G.cur && G.cur.fr;
    analyticsTrack("draft_pick", p);
    trackRunState(); nextRound(true); return;
  }
  analyticsTrack("pick_denied", Object.assign(analyticsRunSnapshot(), {
    action: "rule_block", player: row[IDX.name], season: season, slot: bucket
  }));
  denyTray(chBlockWhy());
}
function doLineupMove(pickIdx, bucket) {
  var p0 = G.picks[pickIdx], from = p0 && p0.slot, name = p0 && p0.row && p0.row[IDX.name];
  if (T82.moveSlot(G, pickIdx, bucket)) {
    analyticsTrack("lineup_change", Object.assign(analyticsRunSnapshot(), {
      action: "move", player: name, source: from, slot: bucket, ordinal: pickIdx + 1
    }));
    afterLineupChange();
  }
}
function doLineupSwap(i, j) {
  var a = G.picks[i], b = G.picks[j];
  if (T82.swapSlots(G, i, j)) {
    analyticsTrack("lineup_change", Object.assign(analyticsRunSnapshot(), {
      action: "swap", player: a && a.row && a.row[IDX.name], source: b && b.row && b.row[IDX.name],
      slot: a && a.slot, ordinal: i + 1, value: j + 1
    }));
    afterLineupChange();
  }
}

/* ---------- game (UI-side) ---------- */


   // stream-backed: era pick + skip targets are outcome-relevant





// Presti: rerolls are unlimited but each costs $1 of cap. Decrementing the remaining
// budget IS the cap drop (you reroll before spending that dollar). Blocked if it would
// leave too little to fill the open slots ($1 minimum per remaining pick).
// Two rare outcomes per paid spin (mutually exclusive): 7.5% REFUND (the dollar comes
// back) and 7.5% FIRE SALE (every price on this board drops $2, floor $1, until the
// next reroll or pick).






// Cap only: re-roll every player's locked season + price for the current team/era ($1).
// Each press shrinks bargain depth (see capRoll) so you can't camp the button waiting
// for a superstar discount; rip-offs keep their normal rate and size.


// Short press haptic for the Presti spin buttons. navigator.vibrate fires on
// Chrome/Android; iOS Safari ignores it (silent no-op). try/catch guards the few
// webviews that throw on the call.
function buzz(ms) {
  // Android: the real Vibration API. iOS Safari has no vibration API; the one
  // web door to the Taptic Engine is toggling an <input type="checkbox"
  // switch> (Safari 17.4+). Synthetic toggles were patched out in iOS 26.5,
  // so this programmatic path reaches iOS 17.4-26.4 and is a harmless no-op
  // beyond; tap-moment haptics on 26.5+ ride real switch overlays where they
  // matter (the Bonuses page). Neither path touches the audio session, so
  // music and podcasts are never ducked.
  try {
    if (navigator.vibrate && navigator.vibrate(ms || 15)) return;
  } catch (e) {}
  try {
    if (!buzz._sw) {
      var sw = document.createElement("input");
      sw.type = "checkbox";
      try { sw.setAttribute("switch", ""); } catch (e2) {}
      sw.setAttribute("aria-hidden", "true");
      sw.tabIndex = -1;
      sw.style.cssText = "position:fixed;left:-40px;top:-40px;width:1px;height:1px;opacity:0;pointer-events:none";
      document.body.appendChild(sw);
      buzz._sw = sw;
    }
    buzz._sw.click();
  } catch (e) {}
}

// Every true button except the deliberately flat Start over, compact Sort/info
// controls, and newspaper-object wrapper receives the same extruded 3D treatment.
// A tiny observer covers buttons created by later renders and lazy-loaded UIs.
var _buttonStyleObserver = null;
// v47.9: .tchip and .trait-info-btn are excluded. The observer was stamping
// presti-spin onto the v47.5 label BUTTONS; button.presti-spin's
// color:#2A1A05 (0,1,1) outranked .tchip's gold (0,1,0) while the injected
// .tchips button.tchip rule kept the near-transparent dark face, so every
// positive label rendered near-black on dark (.tchip.anti at (0,2,0) kept
// its red, which is why only the positive labels were unreadable). Trait
// chips own their full skin in ensureTraitsCss now.
// v47.21: .tm-flat is the general opt-out marker (the widget's IDK pass wears
// it). .hh-skip joins it as a BUG FIX, not a restyle: button.presti-spin is
// (0,1,1) and .hh-skip is (0,1,0), so the decorator was overriding the skip
// control's position:absolute, background:none and color - which is why it
// rendered as a stray amber slab floating mid-overlay on the left instead of
// the quiet top-right text link it was written as.
var BTN3D_EXCLUDE = "button:not(.startover-btn):not(.np-bundle):not(.sort-chip):not(.cap-info):not(.du-exit):not(.rs-close):not(.tchip):not(.trait-info-btn):not(.tm-sharebar):not(.tm-flat):not(.hh-skip)";
function decorate3dButtons(root) {
  if (!root) return;
  function add(node) {
    if (!node || !node.matches || !node.matches(BTN3D_EXCLUDE)) return;
    node.classList.add("presti-spin");
  }
  add(root);
  if (root.querySelectorAll) {
    var nodes = root.querySelectorAll(BTN3D_EXCLUDE);
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.add("presti-spin");
  }
}
function bindGlobalButtonStyle() {
  decorate3dButtons(document);
  if (_buttonStyleObserver || typeof MutationObserver === "undefined" || !document.documentElement) return;
  _buttonStyleObserver = new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      for (var j = 0; j < records[i].addedNodes.length; j++) decorate3dButtons(records[i].addedNodes[j]);
    }
  });
  _buttonStyleObserver.observe(document.documentElement, { childList: true, subtree: true });
}

/* Desktop draft scrolling (v47.10): while a Classic/Presti draft is open the
   page itself is locked (body.drafting overflow:hidden) and #pool is the only
   scroller, so a wheel or trackpad gesture over the utility bar, mode panel,
   pool head, or tray used to do nothing. One document-level wheel listener
   forwards those gestures into the pool. Tightly fenced: drafting only,
   classic/cap only, never over the pool itself (native handles it, so no
   double-scroll), never over inputs/selects/dialogs or any other scrollable
   region (the rules sheet has its own), never during the gate ceremony or the
   scramble, never a ctrlKey pinch-zoom or a horizontal-dominant swipe, and it
   only consumes when the pool can actually move that direction, so nothing is
   ever trapped. Everything is checked at event time; the pool node is looked
   up per event, so per-round re-renders need no rewiring. */
function wireDraftWheel() {
  document.addEventListener("wheel", function (ev) {
    var body = document.body;
    if (!body.classList.contains("drafting")) return;
    if (MODE !== "classic" && MODE !== "cap") return;
    if (body.classList.contains("rules-open") || body.classList.contains("gating")) return;
    if (ev.ctrlKey) return;                                   // trackpad pinch-zoom rides wheel+ctrl
    if (Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) return;    // horizontal swipe is not ours
    var pool = el("pool");
    if (!pool || pool.classList.contains("scrambling")) return;
    if (pool.scrollHeight <= pool.clientHeight + 1) return;   // nothing to scroll
    var t = ev.target;
    if (!t || !t.closest) return;
    if (t.closest("#pool")) return;                           // native scroll already owns this
    if (t.closest("input,textarea,select,[role=dialog]")) return;
    for (var n = t; n && n !== body; n = n.parentElement) {   // any OTHER scrollable region wins
      if (n !== pool && n.scrollHeight > n.clientHeight + 1) {
        var oy = getComputedStyle(n).overflowY;
        if (oy === "auto" || oy === "scroll") return;
      }
    }
    var dy = ev.deltaY;
    if (ev.deltaMode === 1) dy *= 32;                         // lines (Firefox)
    else if (ev.deltaMode === 2) dy *= pool.clientHeight;     // pages
    var atTop = pool.scrollTop <= 0;
    var atBottom = pool.scrollTop + pool.clientHeight >= pool.scrollHeight - 1;
    if ((dy < 0 && atTop) || (dy > 0 && atBottom)) return;    // can't consume; never trap
    pool.scrollTop += dy;
    ev.preventDefault();
  }, { passive: false });
}

// One delegated press-haptic for every raised button, so we don't have to wire
// each one. Capture phase + closest() catches taps on inner spans.
var _hapticsBound = false;
function bindHaptics() {
  if (_hapticsBound) return;
  _hapticsBound = true;
  document.addEventListener("pointerdown", function (e) {
    if (!e.target || !e.target.closest) return;
    var b = e.target.closest("button.presti-spin, a.btn");
    if (b && !b.disabled) buzz(15);
  }, true);
}

// Mobile tabs restore from bfcache/background with the DOM intact but sometimes on a different
// screen than the frozen paint, leaving the draft's body class (and its 100-176px #app bottom
// padding) applied when you're no longer drafting -> dead scroll space below the content. On
// every return to visibility, re-sync the two chrome classes to G (the source of truth). This
// is a no-op whenever they already match.
var _visBound = false;
function bindVisibilityResync() {
  if (_visBound) return;
  _visBound = true;
  function resync() {
    var drafting = !!(G && G.screen === "draft");
    document.body.classList.toggle("drafting", drafting);
    document.body.classList.toggle("has-pick", drafting && !!G.selected);
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") resync();
  });
  window.addEventListener("pageshow", resync);
}

// The 1-in-8 payoff: button turns green and reads "REFUND!" for 2.5s, then restores
// whatever label the re-rendered button is showing. Guarded so a later re-render
// that swaps the node out doesn't throw.
// A free spin lights up ALL THREE cost buttons (not just the one pressed) with the
// money-green flash + "REFUND!" text, and bolds the entire app for the moment.
function flashRefund() {
  var restores = [];
  ["skipTeam", "skipEra", "rerollYears"].forEach(function (id) {
    var btn = el(id);
    if (!btn) return;
    restores.push({ btn: btn, html: btn.innerHTML });   // chips: restore markup, not flat text
    btn.classList.add("refunded");
    btn.textContent = "REFUND!";
  });
  if (!restores.length) return;
  sprayFromEl(document.querySelector(".ticket-actions"), MONEY_EMOJI);   // 💵 spray from the cost buttons
  setTimeout(function () {
    restores.forEach(function (r) {
      if (!r.btn.isConnected) return;            // node replaced by a later render
      r.btn.classList.remove("refunded");
      r.btn.innerHTML = r.html;
    });
  }, 2500);
}

// FIRE SALE (7.5% per paid spin): the refund flash's evil twin — all three cost
// buttons go red and read "FIRE SALE", with a ⬇️ burst. The -$2 board discount
// itself is applied via effCost(); this is just the announcement.
function flashFireSale() {
  var restores = [];
  ["skipTeam", "skipEra", "rerollYears"].forEach(function (id) {
    var btn = el(id);
    if (!btn) return;
    restores.push({ btn: btn, html: btn.innerHTML });   // chips: restore markup, not flat text
    btn.classList.add("firesale");
    btn.textContent = "FIRE SALE";
  });
  if (!restores.length) return;
  sprayFromEl(document.querySelector(".ticket-actions"), DOWN_EMOJI);   // ⬇️ spray from the cost buttons
  setTimeout(function () {
    restores.forEach(function (r) {
      if (!r.btn.isConnected) return;            // node replaced by a later render
      r.btn.classList.remove("firesale");
      r.btn.innerHTML = r.html;
    });
  }, 2500);
}

/* ---------- Presti slot reels ----------
   On every Presti respin (player pick advances the round, or a manual team/era
   skip) the decade and franchise read out like slot reels: rapid decoy swaps that
   decelerate and land on the true value (already known — this is pure overlay,
   nothing async/loading). All motion is transform/opacity/filter via the Web
   Animations API, so it runs on the compositor with no per-frame JS loop. The
   three reels land in sequence — decade, then franchise, then crest — each with a
   haptic thump, which is what sells the "three little payoffs" feel. */

function prefersReduce() {
  // Deliberately always false. Windows machines commonly have "Animation effects"
  // switched off, which makes browsers report prefers-reduced-motion and was
  // silently killing every spin/spray/Hot-Hand sequence for those players.
  // The game IS the motion, so the OS flag is ignored.
  return false;
}

// One value-change frame on a text flap. Decoys get a quick blurred slide; the
// landing slides further and overshoots its scale, then settles (the "ka-chunk").
function animFlap(node, landing) {
  var kf = landing
    ? [{ transform: "translateY(70%) scale(.96)", filter: "blur(2px) brightness(1.55)", opacity: .5, offset: 0 },
       { transform: "translateY(0) scale(1.14)",  filter: "blur(0) brightness(1.55)",  opacity: 1, offset: .55 },
       { transform: "translateY(0) scale(1)",     filter: "blur(0) brightness(1)",     opacity: 1, offset: 1 }]
    : [{ transform: "translateY(40%)", filter: "blur(3px)", opacity: .25 },
       { transform: "translateY(0)",   filter: "blur(0)",   opacity: 1 }];
  node.animate(kf, {
    duration: landing ? 300 : 80,
    easing: landing ? "cubic-bezier(.16,.86,.3,1.04)" : "ease-out"
  });
}

// Spin one reel: decelerating decoy swaps starting at `startDelay`, landing on
// `final` exactly at startDelay + spinMs, then onLand (the haptic).
function setText(n, v) { n.textContent = v; }
function setImg(n, v) { n.src = v; }

function runReel(node, decoys, final, startDelay, spinMs, onLand, apply, animate) {
  if (!node) return;
  apply = apply || setText;
  animate = animate || animFlap;
  if (!decoys || !decoys.length) decoys = [final];
  var gaps = [], t = 55, total = 0;
  while (total + t < spinMs) { gaps.push(t); total += t; t *= 1.16; }  // each gap longer = slowing reel

  // Pre-build the decoy sequence so no two consecutive frames are identical (and the
  // last spin frame differs from `final`), so the reel reads as motion, not flicker.
  // With <2 distinct decoys there's nothing else to show, so it falls back to repeats.
  function pickNot(a, b) {
    if (decoys.length < 2) return decoys[0];
    var v, tries = 0;
    do { v = decoys[Math.floor(Math.random() * decoys.length)]; tries++; }
    while ((v === a || v === b) && tries < 12);
    return v;
  }
  var seq = [], prev = null;
  for (var i = 0; i < gaps.length; i++) {
    prev = pickNot(prev, i === gaps.length - 1 ? final : null);  // avoid the previous frame; on the last frame also avoid the landing value
    seq.push(prev);
  }

  if (seq.length) { apply(node, seq[0]); animate(node, false); }   // show a decoy right away so the real landing value never flashes pre-spin
  var acc = startDelay, idx = 0;
  gaps.forEach(function (g) {
    var val = seq[idx++];
    setTimeout(function () {
      if (!node.isConnected) return;
      apply(node, val);
      animate(node, false);
    }, acc);
    acc += g;
  });
  setTimeout(function () {
    if (!node.isConnected) return;     // a newer respin replaced the node
    apply(node, final);
    animate(node, true);
    if (onLand) onLand();
  }, startDelay + spinMs);
}

// Crest swap animation: quick scale on decoys, overshoot-settle on the landing.
function animCrest(img, landing) {
  var kf = landing
    ? [{ transform: "scale(.6) rotate(-6deg)", opacity: .4, offset: 0 },
       { transform: "scale(1.1) rotate(2deg)", opacity: 1, offset: .6 },
       { transform: "scale(1) rotate(0)",      opacity: 1, offset: 1 }]
    : [{ transform: "scale(.82)", opacity: .5 },
       { transform: "scale(1)",   opacity: 1 }];
  img.animate(kf, { duration: landing ? 320 : 80, easing: landing ? "cubic-bezier(.16,.86,.3,1.04)" : "ease-out" });
}

// Warmed sample of real crest data-URIs to flash through during a spin (decoys are
// unchained from the outcome). Built + decode-warmed once; reused every spin.
var CREST_POOL = null;
function crestPool(fr) {
  if (fr) {                                // era reroll: only THIS team's logos, across its decades
    var arr = [], seenF = {};
    for (var d = 0; d < DECADES.length; d++) {
      var c = CRESTS[key(fr, DECADES[d])];
      if (c && !seenF[c]) { seenF[c] = 1; arr.push(c); var im0 = new Image(); im0.src = c; }
    }
    return arr.length ? arr : null;
  }
  if (CREST_POOL) return CREST_POOL;
  var vals = [];
  for (var k in CRESTS) if (Object.prototype.hasOwnProperty.call(CRESTS, k)) vals.push(CRESTS[k]);
  CREST_POOL = [];
  var seen = {};
  for (var i = 0; i < vals.length && CREST_POOL.length < 18; i++) {
    var v = vals[Math.floor(Math.random() * vals.length)];
    if (seen[v]) continue;
    seen[v] = 1;
    CREST_POOL.push(v);
    var im = new Image(); im.src = v;   // warm the decode so swaps don't flicker
  }
  if (!CREST_POOL.length) CREST_POOL = null;   // no crests in data -> caller skips the reel
  return CREST_POOL;
}

// Sample of real player names to flash through while the pool rows spin.
var DECOY_NAMES = null;
function decoyNames() {
  if (DECOY_NAMES) return DECOY_NAMES;
  var all = [];
  if (typeof BEST_BY_NAME !== "undefined" && BEST_BY_NAME && BEST_BY_NAME.forEach) {
    BEST_BY_NAME.forEach(function (_v, k) { all.push(k); });
  }
  if (!all.length) all = ["—"];
  DECOY_NAMES = [];
  for (var i = 0; i < 40 && all.length; i++) DECOY_NAMES.push(all[Math.floor(Math.random() * all.length)]);
  return DECOY_NAMES;
}

// Roulette the draft-pool rows so the real names/years aren't shown until the spin
// settles. mode "full" spins name + year + price (new team/era); mode "years" spins
// only year + price (Skip yrs — same players). Lightweight: one shared decelerating
// loop doing plain text swaps, no per-row animation; rows dim + lock during the spin.
function scramblePool(mode, settleAt) {
  var pool = el("pool");
  if (!pool || prefersReduce()) return;
  var seasons = pool.querySelectorAll(".cap-season, .year-face:not(.year-fixed)");
  if (!seasons.length) return;            // nothing spinnable on this board
  var names = pool.querySelectorAll(".pr-name");
  var costs = pool.querySelectorAll(".cc-amt");   // the amount span inside the price box
  var dur = settleAt || 620;
  var decade = (G.cur && G.cur.dec) ? G.cur.dec : 1990;
  pool.classList.add("scrambling");

  // v23: every element is its own slot reel. Years sweep the whole dealt era
  // (team code held steady), prices sweep a cheap-heavy plausible book, names
  // flip through the decoy sheet — each with its own stagger, its own
  // decelerating clock, and the REAL value dropping back in on the last tick
  // (innerHTML snapshot, so carets and fire-sale strikes return intact).
  // Cosmetic only — must never touch G.rng.
  var yearVals = [];
  for (var y = 0; y < 10; y++) yearVals.push(shortSeason(decade + y));
  var priceVals = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 23].map(function (n) { return mHtml(fmtM(n)); });
  var nameVals = mode === "full" ? decoyNames() : [];

  var live = 0, landed = false;
  function finish() {
    if (landed) return;
    landed = true;
    if (!pool.isConnected) return;
    pool.classList.remove("scrambling");
    refreshPool();                        // truth re-render: belt over the per-reel restores
    buzz(20);                             // final thump as everything locks in
  }
  function reel(node, vals, keepTail) {
    var snap = node.innerHTML;            // the real value, markup and all
    var tail = "";
    if (keepTail) {
      var bare = node.textContent.trim().replace(/\s*\u25BE\s*$/, "");
      var m = bare.match(/\s(\S+)$/);
      if (m) tail = " " + m[1];           // "76-77 KCK": the KCK stays put
    }
    live++;
    var ticks = 7 + Math.floor(Math.random() * 4);
    var iv = Math.max(26, (dur * (0.8 + Math.random() * 0.14)) / 21);
    var t = 0;
    (function step() {
      if (!pool.isConnected) return;      // a newer render owns the pool now
      t++;
      if (t >= ticks) {
        node.innerHTML = snap;
        live--;
        if (live === 0) finish();
        return;
      }
      var vtxt = vals[Math.floor(Math.random() * vals.length)] + tail;
      if (vtxt.indexOf("<") !== -1) node.innerHTML = vtxt; else node.textContent = vtxt;
      iv *= 1.2;                          // each flip a beat slower: the reel decelerating
      setTimeout(step, iv);
    })();
  }
  var i;
  for (i = 0; i < seasons.length; i++) (function (n) { setTimeout(function () { reel(n, yearVals, true); }, Math.random() * 150); })(seasons[i]);
  for (i = 0; i < costs.length; i++) (function (n) { setTimeout(function () { reel(n, priceVals, false); }, Math.random() * 150); })(costs[i]);
  if (mode === "full") for (i = 0; i < names.length; i++) (function (n) { setTimeout(function () { reel(n, nameVals, false); }, Math.random() * 150); })(names[i]);
  setTimeout(finish, dur + 900);          // hard stop: the pool never stays locked
}

// Orchestrate the staggered reel landings for a respin (Classic / Pro / Presti).
// Returns the time (ms from now) the last ticket reel lands.
function spinReels(anim) {
  var decNode = el("flapDec"), frNode = el("flapFr"), artNode = el("flapArt");
  var SPIN = 620;       // each reel's spin length (start -> land)
  var STAGGER = 200;    // gap between consecutive landings
  if (prefersReduce()) {                 // accessible fallback: the existing pops
    if (anim.dec) reveal("flapDec");
    if (anim.fr)  reveal("flapFr");
    if (artNode) reveal("flapArt");
    return SPIN;
  }
  var decDecoys = DECADES.map(decLabel);
  var frDecoys  = FRANCHISES.map(titleCase);

  // clip the roll into a single-line reel-window while values fly past
  var roll = (decNode || frNode) ? (decNode || frNode).parentNode : null;
  if (roll) roll.classList.add("reeling");

  var slot = 0;
  if (anim.dec && decNode) {
    runReel(decNode, decDecoys, decNode.textContent, slot * STAGGER, SPIN, function () { buzz(12); });
    slot++;
  }
  if (anim.fr && frNode) {
    runReel(frNode, frDecoys, frNode.textContent, slot * STAGGER, SPIN, function () { buzz(12); });
    slot++;
  }
  var lastTextLand = slot > 0 ? (slot - 1) * STAGGER + SPIN : 0;
  // drop the clip-window after the final text reel settles, so long franchise names wrap/show in full
  if (roll) setTimeout(function () { roll.classList.remove("reeling"); }, lastTextLand + 360);

  // crest reels through random logos and lands one beat after the last text reel
  var crestLand = lastTextLand;
  if (artNode) {
    crestLand = slot * STAGGER + SPIN;
    var eraOnly = anim.dec && !anim.fr;   // team is fixed -> flash only this franchise's logos
    var cpool = crestPool(eraOnly ? G.cur.fr : null);
    runReel(artNode, cpool || [artNode.src], artNode.src, 0, crestLand, function () { buzz(18); }, setImg, animCrest);
  }
  return crestLand;
}


function lastNameKey(name) {
  var parts = String(name).split(" ");
  while (parts.length > 1 && /^(jr\.?|sr\.?|ii|iii|iv|v)$/i.test(parts[parts.length - 1])) parts.pop();
  return (parts[parts.length - 1] + " " + name).toLowerCase();
}

function cmpName(a, b) { var ka = lastNameKey(a[IDX.name]), kb = lastNameKey(b[IDX.name]); return ka < kb ? -1 : ka > kb ? 1 : 0; }
// Pro mode: lock each player to a RANDOM eligible season (not their peak), so you
// can't optimize the season blind. Populates G.yearByName, which resolveRow respects.


/* ---------- Salary Cap mode ----------
   $50 budget, seasons locked random, every player priced off that season's value with
   a steep quadratic curve + fat-tailed roll. Calibrated (Monte Carlo vs the real engine,
   1 team + 1 era skip) so even optimal play sneaks an 82-0 roster under the cap ~1 in 50
   boards — and so stars genuinely cost a third-plus of the cap, forcing real tradeoffs. */
// bargainDecay 1 = full-strength bargains; each "Skip yrs" press multiplies the
// discount DEPTH by 0.65 (65%, 42%, 27%... of the original), converging on fair
// price. The normal band and the gouged (rip-off) band are untouched.


// How aggressively cost lies about value (tuned against the real player pool via sim;
// these are safe to nudge). At these values a value-built roster costs the same as
// before (~+1%), but "buy the most expensive" and "$1 = junk" both stop working.
// Lock each pool player to a random season AND price it off that season's value,
// then run the mispricing pass so cost is a noisy signal you have to read past.

// Inject realistic mispricing. The 5 highest-VALUE players are shielded, so the cost of
// a value-built roster (the economy / odds of 82-0) is preserved; only the price signal
// gets noisy. Then: overprice some mediocre marginals into the premium tier (traps that
// blend in with real stars), drop a few marginals to $1 (gems), lift the incidental $1
// floor so a $1 tag now means "gem", and guarantee 2-4 weak players priced above $1.

// The price the player actually pays right now: base cost, minus $2 during an
// active FIRE SALE, never below $1.

// Affordable if it still leaves at least $1 for every remaining pick (never strand).



// Max minutes the player logged in any of his eligible seasons for this team/era,
// so a stud whose best-BPM season was injury-shortened isn't buried by a minutes sort.
function poolMaxMin(name) {
  var yrs = POOL_YEARS.get(key(G.cur.fr, G.cur.dec));
  var arr = yrs ? yrs.get(name) : null;
  var m = 0;
  if (arr) for (var i = 0; i < arr.length; i++) { var v = arr[i][IDX.mp]; if (v > m) m = v; }
  return m;
}
function sortPoolRows(rows) {
  var mode = G.sortMode || "min";
  if (mode === "az") {
    rows.sort(cmpName);
  } else if (mode === "obpm") {
    rows.sort(function (a, b) { return (b[IDX.obpm] - a[IDX.obpm]) || cmpName(a, b); });
  } else if (mode === "dbpm") {
    rows.sort(function (a, b) { return (b[IDX.dbpm] - a[IDX.dbpm]) || cmpName(a, b); });
  } else if (mode === "cost") {
    var dir = (G.costDir === "asc") ? 1 : -1;   // default desc = most money first
    rows.sort(function (a, b) {
      var ca = effCost(a[IDX.name]) || 0;
      var cb = effCost(b[IDX.name]) || 0;
      return (dir * (ca - cb)) || (poolMaxMin(b[IDX.name]) - poolMaxMin(a[IDX.name])) || cmpName(a, b);   // tiebreak: minutes, then alphabetical
    });
  } else {
    rows.sort(function (a, b) { return (poolMaxMin(b[IDX.name]) - poolMaxMin(a[IDX.name])) || cmpName(a, b); });
  }
}

function applyMetricYears(force) {
  // Classic only: sorting by OBPM/DBPM repicks each undrafted player's
  // default season to his best eligible year BY THAT METRIC, so the list
  // order and the selected years agree. Switching back to Min/A-Z (force)
  // restores the engine-value defaults. Non-force runs (each new deal) only
  // fill players without a hand-picked year, so mid-mode tweaks survive.
  // Pure client-side year choice: picks record their season, replay-safe.
  if (MODE !== "classic" || !G || !G.cur) return;
  var metric = G.sortMode === "obpm" ? IDX.obpm : G.sortMode === "dbpm" ? IDX.dbpm : null;
  if (!metric && !force) return;
  var pool = POOLS.get(key(G.cur.fr, G.cur.dec));
  if (!pool) return;
  pool.forEach(function (row, name) {
    if (G.drafted.has(name)) return;
    if (!metric) { delete G.yearByName[name]; return; }
    if (!force && G.yearByName[name] != null) return;
    var arr = T82.poolYearsEligible(G, name);
    if (!arr || !arr.length) return;
    var best = arr[0];
    for (var i = 1; i < arr.length; i++) if (arr[i][metric] > best[metric]) best = arr[i];
    G.yearByName[name] = best[IDX.season];
  });
}

function currentPoolRows() {
  if (MODE === "kaman") { return KAMAN_SEASONS.slice(); }
  var pool = POOLS.get(key(G.cur.fr, G.cur.dec));
  var rows = [];
  if (pool) pool.forEach(function (row, name) {
    if (G.drafted.has(name)) return;
    if (dyNameRetired(name)) return;   // v48.1: in the rafters, so gone from every cell for the rest of the run
    var yrs = T82.poolYearsEligible(G, name);
    if (!yrs.length) return;   // hide players with no eligible (>785-min) season this team/era — don't shade, omit
    rows.push(row);
  });
  var q = (G.query || "").trim().toLowerCase();
  if (q) rows = rows.filter(function (r) { return r[IDX.name].toLowerCase().indexOf(q) !== -1; });
  sortPoolRows(rows);
  return rows;
}

// The row to use for a player in the current cell: the user's chosen season if
// one is set (and still valid for this cell), otherwise the best season (default).




/* ---------- engine (position-independent) ---------- */



/* ---------- formatting ---------- */

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function titleCase(fr) { return fr.split(" ").map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }).join(" "); }
function decLabel(dec) { return "\u2019" + String(dec).slice(2) + "s"; }
// Optional custom era crest for the current franchise+decade. Keyed exactly like
// the draft pools: "FRANCHISE|decade" (e.g. "HEAT|1990"). A per-combo crest wins;
// otherwise CREST_DEFAULT (if set) applies to every combo; otherwise null.
function crestFor(fr, dec) { return CRESTS[key(fr, dec)] || CREST_DEFAULT || null; }

// If a draft ticket rendered BEFORE the crest data finished downloading (the intro
// is instant now, so that's possible), paint the logo in as soon as it exists.
function refreshTicketArt() {
  if (!G || G.screen !== "draft" || MODE === "kaman" || !G.cur) return;
  var crest = crestFor(G.cur.fr, G.cur.dec);
  if (!crest) return;
  var img = el("flapArt");
  if (img) { img.src = crest; return; }             // art node exists -> just repoint it
  var head = document.querySelector(".ticket-head");
  if (!head) return;
  var wrap = document.createElement("div");
  wrap.className = "ticket-art";
  wrap.innerHTML = '<img id="flapArt" class="crest-img flap" alt="' +
    esc(titleCase(G.cur.fr) + " " + decLabel(G.cur.dec)) + '" src="' + crest + '">';
  head.appendChild(wrap);
}
function decSpanStr(dec) { var s = DEC_SPAN.get(dec); return s ? (s[0] + "\u2013" + s[1]) : ""; }
function fmt1(x) { return x.toFixed(1); }
function signed1(x) { return (x >= 0 ? "+" : "") + x.toFixed(1); }
function shortSeason(season) {
  var y = +season;
  function d2(n) { return (n < 10 ? "0" : "") + n; }
  return d2((y - 1) % 100) + "-" + d2(y % 100);
}
function humanCount(n) {
  if (!isFinite(n)) return "\u221E";
  if (n >= 1e15) return "10^" + Math.round(Math.log10(n));
  if (n >= 1e12) return (n / 1e12).toFixed(1) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return Math.round(n).toString();
}
function fmtP82(p) {
  if (p >= 0.01) return (100 * p).toFixed(1) + "%";
  if (p >= 1e-4) return (100 * p).toFixed(2) + "%";
  if (p >= 1e-300) return "1 in " + humanCount(1 / p);
  return "\u22480";
}
function fmtStat(v, s) { return (v === null || v === undefined) ? "\u2014" + s : v.toFixed(1) + s; }
function statLine(row) {
  return fmtStat(row[IDX.ppg], "p") + " " + fmtStat(row[IDX.rpg], "r") + " " + fmtStat(row[IDX.apg], "a") +
    " " + fmtStat(row[IDX.spg], "s") + " " + fmtStat(row[IDX.bpg], "b") + " \u00B7 usg " + fmt1(row[IDX.usage]);
}
/* Engine shooter designations (AUTHORITATIVE SOURCE: row[IDX.sp], the same
   spacing column sim-core sums into e.sumSp for the spacing tax/bonus).
   These chips are the engine's OWN live classification, not community votes
   and not a legacy artifact: sp === 1 counts as one floor spacer, sp >= 1.5
   is the elite gunner who counts one and a half (rules-sheet SHOOTING copy).
   v47.9 unifies only the PRESENTATION with the community label chips: same
   3D slab, tappable, expands to an engine-vocabulary full name, joins the
   legend with an "engine" marker. The sp thresholds and data are untouched. */
var TRAIT_ENG_FULL = { "3PT": "Floor Spacer", "GRAVITY": "Elite Gunner" };
function engChipHtml(abbr, tab) {
  var full = TRAIT_ENG_FULL[abbr] || abbr;
  return '<button type="button" class="tchip eng" data-full="' + full + '" data-abbr="' + abbr + '"' +
    (tab === -1 ? ' tabindex="-1"' : "") +
    ' aria-pressed="false" aria-label="' + full + ", the engine\u2019s shooting designation. Tap for full label.\"" +
    ' title="' + full + '">' + abbr + "</button>";
}
function chipsFor(row, tab) {
  var out = [];
  if (row[IDX.sp] >= 1.5) out.push(engChipHtml("GRAVITY", tab));
  else if (row[IDX.sp] === 1) out.push(engChipHtml("3PT", tab));
  return out.length ? '<span class="chips">' + out.join("") + "</span>" : "";
}
function bucketTag(row) { return rowBuckets(row).join("/"); }

/* ---------- rendering: shared ---------- */

function el(id) { return document.getElementById(id); }

/* ---------- game money (2026-07-17, v12) ----------
   All in-game currency is millions. One formatter, used everywhere a dynamic
   amount is shown or written into generated text: bank, prices, cost chips,
   tray note, results, share text. Authored prose (daily-core copy layer,
   RULES_MODE) carries the M inline in the strings themselves. Rules: no
   space before M, trailing .0 dropped, one decimal max, U+2212 for negatives
   (never an em dash, never a hyphen in UI). Numbers in, strings out; never
   feed it an already-formatted string. */
function fmtM(n) {
  var v = Number(n);
  if (!isFinite(v)) v = 0;
  var neg = v < 0;
  var a = Math.abs(v);
  var r = Math.round(a * 10) / 10;
  var s = (r % 1 === 0) ? String(Math.round(r)) : r.toFixed(1);
  return (neg ? "\u2212" : "") + "$" + s + "M";
}
function mHtml(txt, tight) {
  // Display layer only: a lighter trailing M everywhere; a thin space after
  // the $ except where tight (the bank reads "$50M"). Underlying strings
  // (share text, copy, reels' textContent) stay "$17M".
  var t = String(txt).replace(/M$/, '<span class="m-lite">M</span>');
  return tight ? t : t.replace("$", "$\u2009");
}
function fmtMCost(n) {              // a positive cost rendered as a deduction: 1 -> "−$1M"
  return "\u2212" + fmtM(Math.abs(Number(n) || 0));
}
function app() { return el("app"); }

function renderPips() {
  // Two homes: the header pips (visible outside drafts) and the compact draft
  // utility bar's pips + PICK N OF 5 counter (2026-07-17 chrome rework). The
  // header is display:none while body.drafting, but keeping it painted costs
  // nothing and guards against a stale frame if the class ever lags a render.
  var box = el("roundPips");
  var bar = el("drPips");
  var count = el("drPickCount");
  if (!G || G.screen !== "draft") { if (box) box.innerHTML = ""; return; }
  var doneCount = G.round - 1;
  var nowIndex = G.round;
  var html = "";
  for (var i = 1; i <= CFG.ROUNDS; i++) {
    var cls = i <= doneCount ? "done" : (i === nowIndex ? "now" : "");
    html += "<span class=\"" + cls + "\"></span>";
  }
  if (box) box.innerHTML = html;
  if (bar) bar.innerHTML = html;
  if (count) count.textContent = "PICK " + Math.min(G.round, CFG.ROUNDS) + " OF " + CFG.ROUNDS;
}

/* ---------- intro ---------- */

function startOverBtnHtml() {
  return '<button class="startover-btn" id="startOverBtn" type="button">\u2039 Start over</button>';
}
function wireStartOver() {
  var b = el("startOverBtn");
  if (b) b.addEventListener("click", function () {
    // Only an unfinished draft is a bailout. Results/newspaper navigation is already
    // represented by game_complete and its own action events.
    if (G && G.screen === "draft") {
      analyticsTrack("run_abandon", Object.assign(analyticsRunSnapshot("start_over"), {
        surface: "draft", action: "start_over"
      }));
    }
    renderIntro();
  });
}

/* ---------- compact draft chrome (2026-07-17) ----------
   While a draft is live, body.drafting hides the big masthead (styles.css) and
   these two surfaces replace the old pile (Start over slab, daily/challenge
   strap, cap money bar, pro hint, and every draft-screen (i)):
   1. draftUtilityHtml: EXIT RUN + pick diamonds + PICK N OF 5 + hoop mark.
      The exit button keeps the startOverBtn id so wireStartOver and the
      run_abandon analytics event are untouched.
   2. modePanelHtml: identity on the left (Daily number + official pill, or
      the mode name, plus live money in Presti), one mechanical status line,
      and the HOW TO PLAY button, which opens the rules sheet.
   The rules sheet is THE single help surface for every mode: the daily law,
   today's rule, the game in 20 seconds, base-mode rules, and what the engine
   rewards, all in plain english with the engine's real numbers. */

function hoopMarkSvg() {
  return '<svg class="du-brand" viewBox="0 0 32 36" aria-hidden="true" focusable="false">' +
    '<path d="M16 1l1.9 3.9 4.3.6-3.1 3 .7 4.2L16 10.7l-3.8 2 .7-4.2-3.1-3 4.3-.6z" fill="var(--amber)"/>' +
    '<rect x="5" y="15" width="22" height="3.4" rx="1.7" fill="var(--maple)"/>' +
    '<path d="M9 18.4l4.4 13M23 18.4l-4.4 13M16 18.4v13M10.9 24h10.2M12.8 29.6h6.4" stroke="var(--maple)" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
  '</svg>';
}
function bookIconSvg() {
  // A drawn open book: ink cover, cream pages, faint text lines. Fixed colors
  // on purpose: it always sits on the gold presti-spin slab.
  return '<svg class="mp-book" viewBox="0 0 26 22" aria-hidden="true" focusable="false">' +
    '<path d="M13 3.4C11.2 1.8 8.5 1 5.4 1c-1.2 0-2.3.1-3.4.4-.6.1-1 .6-1 1.2v14.6c0 .8.8 1.4 1.6 1.2 1-.2 1.9-.3 2.8-.3 2.9 0 5.4.8 7.6 2.3 2.2-1.5 4.7-2.3 7.6-2.3.9 0 1.8.1 2.8.3.8.2 1.6-.4 1.6-1.2V2.6c0-.6-.4-1.1-1-1.2C22.9 1.1 21.8 1 20.6 1c-3.1 0-5.8.8-7.6 2.4z" fill="#2A1A05"/>' +
    '<path d="M12.1 4.6C10.6 3.5 8.4 2.9 5.9 2.9c-.9 0-1.8.1-2.7.3v13.1c.9-.2 1.8-.2 2.7-.2 2.3 0 4.4.5 6.2 1.5z" fill="#FFF3D6"/>' +
    '<path d="M13.9 4.6c1.5-1.1 3.7-1.7 6.2-1.7.9 0 1.8.1 2.7.3v13.1c-.9-.2-1.8-.2-2.7-.2-2.3 0-4.4.5-6.2 1.5z" fill="#FFF3D6"/>' +
    '<path d="M5.2 6.4c1.7-.2 3.3 0 4.8.6M5.2 9.2c1.7-.2 3.3 0 4.8.6M5.2 12c1.7-.2 3.3 0 4.8.6M16 7c1.5-.6 3.1-.8 4.8-.6M16 9.8c1.5-.6 3.1-.8 4.8-.6M16 12.6c1.5-.6 3.1-.8 4.8-.6" stroke="#2A1A05" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".55"/>' +
  '</svg>';
}
function draftUtilityHtml() {
  return '<div class="draft-utility" id="draftUtility">' +
    '<button class="du-exit" id="startOverBtn" type="button">\u2039 EXIT RUN</button>' +
    '<div class="du-mid">' +
      '<div class="round-pips du-pips" id="drPips" aria-hidden="true"></div>' +
      '<span class="du-count mono" id="drPickCount" aria-live="polite"></span>' +
    '</div>' +
    '<span class="du-brandbox">' + hoopMarkSvg() + '</span>' +
  '</div>';
}
function modePanelHtml() {
  if (MODE === "kaman") return "";   // the egg keeps its mystery
  var baseName = MODE === "cap" ? "PRESTI" : MODE === "pro" ? "PRO" : "CLASSIC";
  var copy = (window.T82DAILY && T82DAILY.DAILY_COPY) || {};
  var idHtml, sub = [], targetHtml = "";
  // v12: the bank gets its own slot between identity and the rules button,
  // big enough to read from a barstool. tickBank() animates it on spends.
  if (G.social) {
    var claimed = window.T82DAILY ? T82DAILY.officialFor(G.social.key) : null;
    idHtml = '<span class="mp-id">\uD83D\uDCC5 DAILY #' + G.social.num + '</span>' +
      (claimed ? '<span class="ds-pill ds-prac">PRACTICE RUN</span>'
               : '<span class="ds-pill ds-off">1 OFFICIAL ATTEMPT</span>');
    sub.push(baseName + " RULES");
    if (G.social.short) sub.push(esc(G.social.short));
    if (G.social.target) {
      targetHtml = '<div class="mp-target mono">BEAT ' + G.social.target.w + '-' +
        (CFG.GAMES_IN_SEASON - G.social.target.w) + ' \u00B7 NET ' + T82DAILY.signedNet(G.social.target.n) + '</div>';
    }
  } else if (G.ch && G.ch.id === "dynasty") {
    idHtml = '<span class="mp-id">\uD83D\uDC51 DYNASTY</span>' +
      '<span class="mp-name">' + esc(G.ch.name || "") + '</span>';
    sub.push("CLASSIC RULES");
    if (G.ch.blurb) sub.push(esc(G.ch.blurb));
  } else if (G.ch) {
    idHtml = '<span class="mp-id">' + (G.weekly ? "WEEKLY" : "CHALLENGE") + '</span>' +
      '<span class="mp-name">' + esc(G.ch.name || "") + '</span>';
    var chShort = (copy[G.ch.id] && copy[G.ch.id].s) || G.ch.blurb || "";
    sub.push(baseName + " RULES");
    if (chShort) sub.push(esc(chShort));
  } else if (MODE === "cap") {
    idHtml = '<span class="mp-id">PRESTI MODE</span>';
    sub.push("SALARY CAP \u00B7 SKIPS \u2212$1M");
  } else if (MODE === "pro") {
    idHtml = '<span class="mp-id">PRO MODE</span>';
    sub.push("NO STATS \u00B7 TAP \u25BE TO CHANGE SEASON");
  } else {
    idHtml = '<span class="mp-id">CLASSIC MODE</span>';
    sub.push("TAP THE YEAR \u25BE TO USE ANY SEASON");
  }
  // v29 (owner-directed, mockup-sourced; supersedes the V20 plaque doctrine):
  // the bank is a flat charcoal SCOREBOARD in the same panel slot — thin
  // amber outline like the price badges, no bronze, no gloss. Anatomy: BANK
  // label, the balance (#bankAmt, still the loudest thing), a transient
  // deduction chip (#bankDed — NOT #bankDelta; that id died with v19), and a
  // segmented budget meter whose fill is proportional truth (#bankFill).
  // G.meterMax pins the denominator to the run's starting cap at first
  // render, so challenge caps and reroll math can't skew the bar.
  var bankHtml = "";
  if (MODE === "cap") {
    if (typeof G.meterMax !== "number" || G.meterMax <= 0) G.meterMax = Math.max(G.budget, 1);
    // Render what is currently DISPLAYED, not the target: G.bankShown tracks
    // the odometer's on-screen value, so a re-render mid-animation redraws
    // the in-flight number and the chaser keeps counting — no snap, no
    // rewind. When the ticker is idle the two are equal anyway.
    var shownV = (typeof G.bankShown === "number") ? G.bankShown : G.budget;
    var bankPct = Math.max(0, Math.min(100, (shownV / G.meterMax) * 100));
    bankHtml = '<div class="mp-bank" id="mpBank"><span class="mpb-lab mono">BANK</span>' +
      '<b class="mpb-amt" id="bankAmt">' + mHtml(fmtM(shownV), true) + '</b>' +
      '<span class="mpb-delta mono" id="bankDed" aria-hidden="true"></span>' +
      '<div class="mpb-meter" aria-hidden="true"><i class="mpb-fill" id="bankFill" style="width:' + bankPct + '%"></i></div></div>';
  }
  var panelCls = 'mode-panel plq-frame plq-slim' + (MODE === "cap" ? ' cap-mode-panel' : '');
  return '<div class="' + panelCls + '" id="modePanel">' +
    '<div class="mp-left">' +
      '<div class="mp-row1">' + idHtml + '</div>' +
      '<div class="mp-row2 mono">' + sub.join(" \u00B7 ") + '</div>' +
      targetHtml +
    '</div>' +
    bankHtml +
    '<button class="mp-rules-btn presti-spin" id="rulesBtn" type="button" aria-haspopup="dialog" aria-label="How to play: the rules, today\u2019s twist, and how scoring works">' +
      '<span class="mp-book-wrap">' + bookIconSvg() + '</span>' +
      '<span class="mp-rules-text"><span class="mp-rules-main">HOW TO PLAY</span></span>' +
    '</button>' +
  '</div>';
}

/* ---------- draft viewport (2026-07-17, v12) ----------
   While drafting, the page no longer scrolls: body.drafting locks to 100dvh,
   #app is a flex column, and the pool is the one scrolling region. The tray
   stays fixed; the pool's scrollport runs behind it (bottom padding keeps the
   last card reachable) and a gradient fade above the tray makes the list read
   as continuing rather than ending. All sizes flow from the --tray-h CSS var,
   which tracks the real tray height (it grows when a pick is selected), so
   the fade and padding follow automatically. A one-time MORE PLAYERS cue
   shows on round 1 if the list overflows, and dies on the first scroll. */
var DRAFT_VP = { ro: null, off: null };
function setTrayVar() {
  var tray = document.querySelector(".tray");
  if (!tray) return;
  var h = tray.offsetHeight || 96;
  document.documentElement.style.setProperty("--tray-h", h + "px");
}
function initDraftViewport() {
  if (DRAFT_VP.ro) { try { DRAFT_VP.ro.disconnect(); } catch (e) {} DRAFT_VP.ro = null; }
  if (DRAFT_VP.off) { DRAFT_VP.off(); DRAFT_VP.off = null; }
  var tray = document.querySelector(".tray");
  var pool = el("pool");
  if (!tray || !pool) return;
  setTrayVar();
  if (typeof ResizeObserver === "function") {
    DRAFT_VP.ro = new ResizeObserver(setTrayVar);
    DRAFT_VP.ro.observe(tray);
  }
  var onResize = function () { setTrayVar(); };
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);
  var vv = window.visualViewport;
  if (vv && vv.addEventListener) vv.addEventListener("resize", onResize);
  DRAFT_VP.off = function () {
    window.removeEventListener("resize", onResize);
    window.removeEventListener("orientationchange", onResize);
    if (vv && vv.removeEventListener) vv.removeEventListener("resize", onResize);
  };
  // The one-time continuation cue: only on the opening board, only if there is
  // actually more below, and gone the instant the list moves.
  if (G && G.round === 1 && !G.moreCueDone && pool.scrollHeight > pool.clientHeight + 8) {
    var cue = document.createElement("div");
    cue.className = "pool-cue mono";
    cue.id = "poolCue";
    cue.textContent = "MORE PLAYERS \u2193";
    pool.parentNode.insertBefore(cue, pool.nextSibling);
    pool.addEventListener("scroll", function killCue() {
      G.moreCueDone = true;
      var c = el("poolCue");
      if (c && c.parentNode) c.parentNode.removeChild(c);
      pool.removeEventListener("scroll", killCue);
    }, { passive: true });
  }
}

/* ---------- the bank ticker (v29.1 single-writer chaser) ----------
   AUDIT FIX (owner report: the count rubber-banded). Root cause, threefold:
   tickBank runs on EVERY draft re-render (the master render tail), the old
   ticker treated G.bankShown as "target accepted" instead of "currently
   displayed", and each call span up its own interval closed over its own
   node. A re-render mid-count therefore snapped the markup to the final
   value, orphaned the live interval, and killed the count; skip-spam left
   rival intervals fighting over the same node; the rewind paint jumped the
   number back up whenever a frame slipped in. New model:
   - G.bankShown is the on-screen truth, updated on every paint; the panel
     builder renders it, so re-renders have continuity instead of a snap.
   - ONE writer: G.bankAnim. Every call clears it before starting another.
   - The interval re-resolves el("bankAmt") each tick, so re-renders never
     orphan the count; it dies only when the bank leaves the DOM or a new
     game replaces G.
   - A spend mid-count RETARGETS: the odometer chases the new balance from
     wherever it is, monotonic, one direction per leg. The chip shows the
     true transaction (new target minus previous target), not the leftover.
   Steps stay integer and few (<=4 over ~380ms). Reduced motion: instant
   paint, 240ms flash. Timing law: settle + flash clear inside ~560ms or
   the walk's 600ms settle assert races. */
function tickBank() {
  if (MODE !== "cap" || !G || !el("bankAmt")) return;
  var g = G;
  var to = g.budget;
  var box = el("bankAmt").closest(".mp-bank");
  if (box) {
    var remaining = 5 - ((g.picks && g.picks.length) || 0);
    var low = to <= remaining + 1;
    box.classList.toggle("bank-low", low);
    box.classList.toggle("bank-mid", !low && to <= 15);
    box.classList.toggle("bank-zero", to === 0);
  }
  var paint = function (v) {
    var n = el("bankAmt");
    if (!n) return false;
    n.innerHTML = mHtml(fmtM(v), true);
    g.bankShown = v;
    var fill = el("bankFill");
    if (fill) fill.style.width = Math.max(0, Math.min(100, (v / g.meterMax) * 100)) + "%";
    return true;
  };
  var stopAnim = function () {
    if (g.bankAnim) { clearInterval(g.bankAnim); g.bankAnim = null; }
    if (g.bankFlashT) { clearTimeout(g.bankFlashT); g.bankFlashT = null; }
  };
  var clearFlash = function () {
    var n = el("bankAmt"), b = n && n.closest(".mp-bank");
    if (b) b.classList.remove("bank-down", "bank-up");
  };
  var shown = (typeof g.bankShown === "number") ? g.bankShown : to;
  if (shown === to) {
    // settled, a money-free re-render, or a refund landing us back where the
    // display already sits: make sure no stale count or flash survives.
    if (g.bankAnim) { stopAnim(); clearFlash(); }
    g.bankAnimTo = null;
    paint(to);
    return;
  }
  // The chip reports the TRANSACTION: against the previous target when a
  // count is in flight (retarget), against the display when idle.
  var prevTarget = (g.bankAnim && typeof g.bankAnimTo === "number") ? g.bankAnimTo : shown;
  var chipD = to - prevTarget;
  var ded = el("bankDed");
  if (ded && chipD !== 0) {
    ded.textContent = chipD < 0 ? "\u2212$" + (-chipD) + "M" : "+$" + chipD + "M";
    ded.className = "mpb-delta mono show " + (chipD < 0 ? "neg" : "pos");
    if (g.bankDedT) clearTimeout(g.bankDedT);
    g.bankDedT = setTimeout(function () {
      if (ded.isConnected) ded.className = "mpb-delta mono";
    }, 900);
  }
  var dir = to < shown ? "bank-down" : "bank-up";
  if (box) {
    box.classList.remove(dir === "bank-down" ? "bank-up" : "bank-down");
    box.classList.add(dir);
  }
  stopAnim();
  g.bankAnimTo = to;
  if (prefersReduce()) {
    paint(to);
    g.bankAnimTo = null;
    g.bankFlashT = setTimeout(function () { clearFlash(); g.bankFlashT = null; }, 240);
    return;
  }
  var from = shown, d = to - from;
  var STEPS = Math.min(4, Math.abs(d)), i = 0, iv = Math.round(380 / STEPS);
  g.bankAnim = setInterval(function () {
    if (g !== G || !el("bankAmt")) { stopAnim(); return; }   // new game or no bank on this screen
    i++;
    paint(i >= STEPS ? to : Math.round(from + (d * i) / STEPS));
    if (i >= STEPS) {
      stopAnim();
      g.bankAnimTo = null;
      g.bankFlashT = setTimeout(function () { clearFlash(); g.bankFlashT = null; }, 180);
    }
  }, iv);
}

/* ---------- the rules sheet ----------
   Copy law: plain mechanics, real numbers, zero cryptic flavor. The per-board
   daily briefs live in daily-core DAILY_COPY; the gate's one-paragraph mode
   explainers live in daily-core MODE_TIP; the bullets here are the long form.
   If a mechanic or an engine constant (site_data meta.scoring) changes,
   update all three in the same commit. */
// v41 RULES SHEET COPY (owner-authored, owner-ordered). Section order is
// GAME BASICS -> HOW TO PLAY THIS MODE -> [today's rule box] -> NEED A
// REFRESHER -> WHAT WINS GAMES. RULES_STEPS and the standalone CHANGE THE
// YEARS box retired here: GAME BASICS covers the first, and each mode block
// now owns its own season/reroll instructions.
// COPY LAW: zero em-dashes (walk-pinned). Money reads plain, "$1M".
var RULES_BASICS = [
  "Draft a team of 2 guards, 2 forwards, and a center from 1974\u20132026. Assemble an actual coherent team.",
  "In each round, draft one player from a random NBA franchise + decade combo.",
  "The system uses real advanced stats to calculate an actual win-loss record.",
  "Try to go 82-0. Share to prove you know ball."
];
var RULES_MODE = {
  classic: [
    "Full player stats on every card. The season menu (\u25BE) under each name lets you pick any year of that player's career. The best overall season is selected by default, but worth changing to balance team offense/defense.",
    "One team skip and one era skip for the whole draft if there are no high-quality fits.",
    "Use the sort chips to order by A\u2013Z, Offensive BPM, Defensive BPM, or use the search box.",
    "Players are default sorted by peak minutes per game in a season.",
    "Shift player positions around at the bottom to fit in players."
  ],
  cap: [
    "You have a salary cap. $50M to draft your five.",
    "Player salaries vary greatly, with rip-offs, bargains, and bait choices included.",
    "Pay $1M to reroll decade, team, or player seasons within that combo. Unlimited rerolls, but every empty roster spot needs $1M held in reserve.",
    "Players are default sorted by salary; also sort by peak minutes played, A\u2013Z, or use the search box.",
    "Occasional random perks when rerolling era/team/player: REFUND (green) gives your dollar back. FIRE SALE (red) drops the next roll's player salaries by $2M."
  ],
  daily: [
    "One shared board per day. Everyone gets the same teams, the same players, the same prices.",
    "Your first finished run is your official score. Replays are practice and can never overwrite it.",
    "Today's rule appears below, and it beats the normal numbers wherever they disagree.",
    "Finish, then share: your link drops friends onto this exact board to beat your number."
  ],
  pro: [
    "No stats. Every card is a name, a position, and a randomized season.",
    "The season menu (\u25BE) still works, also blind. Change years at your own risk.",
    "The engine grades your five with the real numbers at the end. Memory against the receipts."
  ]
};
var RULES_ENGINE = [
  ["TALENT", "Every player adds his impact rating (BPM) over a replacement-level scrub. Star power is most of your score."],
  ["SHOOTING", "Three floor spacers is the target. Zero shooters costs about 6 net rating. Elite gunners count as one and a half."],
  ["ONE BALL", "Team usage above 110 gets taxed. Two high-usage alphas fit. Four is a turf war your net pays for."],
  ["DEFENSE", "If both guards, or both forwards, are minus defenders, the pair costs 2 to 3 net. And someone up front, a forward or your center, has to protect the rim, or that is 2 more."],
  ["THE DIRTY WORK", "Your five still have to rebound and somebody has to pass. A bottom-of-the-league board rate costs 2 to 3, no real playmaker costs 2, and more than one player past his 12th season costs 1."],
  ["THE MATH", "Net 0 is a 41-41 team, and one point of net is worth 2 to 3 wins in the middle. The 96 Bulls grade about +13. An 82-0 five needs about +27."]
];
// Campaign "howto": this surface reports separately from the info pages.
var BBREF_BPM_LEADERS = "https://www.basketball-reference.com/leaders/bpm_top_10.html";
function rulesRefresherHtml() {
  return '<p class="rs-ref-body">Our engine is based on BPM, so <a href="' +
    bbrefTag(BBREF_BPM_LEADERS, "howto") + '" target="_blank" rel="noopener">this page</a> is a good place to start. ' +
    'Check out <a href="' + bbrefTag("https://www.basketball-reference.com/", "howto") +
    '" target="_blank" rel="noopener">Basketball Reference</a> and Basketball Reference\u2019s Stathead for deeper dives. ' +
    'No affiliation, I just use them all the time, including the stats behind this site.</p>';
}
function rulesSheetHtml() {
  var isDaily = !!(G && G.social);
  var ch = G && G.ch;
  var baseKey = MODE === "cap" ? "cap" : MODE === "pro" ? "pro" : "classic";
  var baseName = MODE === "cap" ? "PRESTI" : MODE === "pro" ? "PRO" : "CLASSIC";
  var copy = (window.T82DAILY && T82DAILY.DAILY_COPY) || {};
  var h = '<div class="rs-head"><span class="rs-title">HOW TO PLAY</span>' +
    '<button class="rs-close" id="rulesClose" type="button" aria-label="Close the rules">\u2715</button></div>' +
    '<div class="rs-scroll">';

  // Block builders; assembly order depends on the mode. On the Daily the
  // daily-specific material (today's rule, then the Daily's own rules) leads
  // and GAME BASICS follows: a Daily player opening the sheet wants today,
  // not the tutorial (owner directive, v45).
  var basicsBlock = '<p class="rs-eyebrow">GAME BASICS</p><ul class="rs-list">' +
    RULES_BASICS.map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul>";
  var modeBlock = '<p class="rs-eyebrow">HOW TO PLAY THIS MODE (' + (isDaily ? "THE DAILY" : baseName) + ')</p><ul class="rs-list">' +
    (RULES_MODE[isDaily ? "daily" : baseKey] || []).map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul>";
  if (isDaily) {
    modeBlock += '<p class="rs-eyebrow">PLUS ' + baseName + ' MODE RULES</p><ul class="rs-list">' +
      (RULES_MODE[baseKey] || []).map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul>";
  }
  var todayBlock = "";
  if (isDaily) {
    var brief = G.social.gate || G.social.short || "";
    todayBlock = '<div class="rs-today plq-frame plq-slim">' +
      '<p class="rs-eyebrow rs-today-label">TODAY\u2019S RULE \u00B7 DAILY #' + G.social.num + '</p>' +
      '<p class="rs-today-name">' + esc(G.social.name) + '</p>' +
      (brief ? '<p class="rs-today-body">' + esc(brief) + '</p>' : '') +
      (G.social.target
        ? '<p class="rs-target mono">THE CHALLENGE: beat ' + G.social.target.w + '-' +
          (CFG.GAMES_IN_SEASON - G.social.target.w) + ', Net ' + T82DAILY.signedNet(G.social.target.n) + '.</p>'
        : '') +
      '</div>';
  }
  h += isDaily ? (todayBlock + modeBlock + basicsBlock) : (basicsBlock + modeBlock);
  if (!isDaily && ch) {
    var chBrief = (copy[ch.id] && copy[ch.id].g) || ch.blurb || "";
    h += '<div class="rs-today plq-frame plq-slim">' +
      '<p class="rs-eyebrow rs-today-label">' + (G.weekly ? "THIS WEEK\u2019S TWIST" : "THE TWIST") + '</p>' +
      '<p class="rs-today-name">' + esc(ch.name || "") + '</p>' +
      (chBrief ? '<p class="rs-today-body">' + esc(chBrief) + '</p>' : '') +
      '</div>';
  }

  h += '<div class="rs-ref"><p class="rs-eyebrow rs-ref-label">NEED A REFRESHER?</p>' + rulesRefresherHtml() + '</div>';

  var engineRules = RULES_ENGINE;
  if (baseKey === "classic" && !isDaily && !ch) {
    engineRules = RULES_ENGINE.concat([["ANY GIVEN NIGHT",
      "The season is played out one game at a time. No five wins a given night more than 99 times in 100, so a perfect season has to survive all 82."]]);
  }
  h += '<p class="rs-eyebrow">WHAT WINS GAMES</p><ul class="rs-list rs-engine">' +
    engineRules.map(function (r) { return "<li><strong>" + r[0] + ":</strong> " + r[1] + "</li>"; }).join("") + "</ul>" +
    ((isDaily || ch) ? '<p class="rs-note">Today\u2019s rule wins any conflict with the normal numbers above.</p>' : "");

  h += '</div><div class="rs-foot">' +
    '<a class="rs-got rs-ref-btn" href="' + bbrefTag(BBREF_BPM_LEADERS, "howto") + '" target="_blank" rel="noopener">STATS REFRESHER \u2197</a>' +
    '<button class="rs-got" id="rulesGotIt" type="button">GOT IT</button>' +
  '</div>';
  return h;
}
var RULES_PREV_FOCUS = null;
function rulesEscListener(ev) { if (ev.key === "Escape") closeRulesSheet("escape"); }
function closeRulesSheet(method) {
  var ov = el("rulesOverlay");
  if (!ov) return;
  analyticsTrack("rules_close", Object.assign(analyticsRunSnapshot(), {
    action: method || "button",
    duration: ANALYTICS_RULES_OPEN_TS ? Math.max(0, Date.now() - ANALYTICS_RULES_OPEN_TS) : null
  }));
  if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
  document.body.classList.remove("rules-open");
  document.removeEventListener("keydown", rulesEscListener);
  if (RULES_PREV_FOCUS && RULES_PREV_FOCUS.focus) { try { RULES_PREV_FOCUS.focus(); } catch (e) {} }
  RULES_PREV_FOCUS = null;
  ANALYTICS_RULES_OPEN_TS = 0;
}
function openRulesSheet() {
  if (el("rulesOverlay")) return;
  RULES_PREV_FOCUS = document.activeElement;
  var ov = document.createElement("div");
  ov.className = "rules-overlay";
  ov.id = "rulesOverlay";
  ov.setAttribute("role", "dialog");
  ov.setAttribute("aria-modal", "true");
  ov.setAttribute("aria-label", "How to play");
  ov.innerHTML = '<div class="rules-sheet plq-frame" id="rulesSheet">' + rulesSheetHtml() + '</div>';
  document.body.appendChild(ov);
  document.body.classList.add("rules-open");
  ov.addEventListener("click", function (ev2) { if (ev2.target === ov) closeRulesSheet("backdrop"); });
  el("rulesClose").addEventListener("click", function () { closeRulesSheet("x"); });
  el("rulesGotIt").addEventListener("click", function () { closeRulesSheet("got_it"); });
  document.addEventListener("keydown", rulesEscListener);
  try { el("rulesClose").focus(); } catch (e) {}
  ANALYTICS_RULES_OPEN_TS = Date.now();
  analyticsTrack("rules_open", Object.assign(analyticsRunSnapshot(), { action: "how_to_play" }));
}

/* ---------- donate ---------- */
var DONATE_URL = "https://www.paypal.com/ncp/payment/UJMRHNN2VBJES";
// Labels double as the donate_click analytics variant key. The /avocado donate card
// groups by whatever arrives, so edits here flow through automatically — but keep
// DONATE_ACTIVE in functions/avocado.js in sync so retired labels get marked there.
var DONATE_MSGS = [
  "Fund my caffeine dependency",
  "Feed my GOAT herd",
  "Fuel the token furnace",
  "Help me pay the luxury tax",
  "Money me. Money now.",
  "100% goes to girlfriend",
  "Fund weekly challenges",
  "Keep developing the game",
  "Prove my parents wrong"
];
function resultsTopBarHtml() {
  // v24: the rotating donate jokes are retired in favor of a straight line to
  // the mailbox. DONATE_MSGS/DONATE_URL stay defined for the /avocado history.
  var msg = "Feature requests? Bugs?";
  return '<div class="results-topbar">' +
    startOverBtnHtml() +
    '<a class="donate-btn" id="donateBtn" href="mailto:true82mailbox@gmail.com" data-msg="' + esc(msg) + '">' + esc(msg) + '</a>' +
  '</div>';
}
/* ---------- PLAYER BONUSES (v46; internal traits_* names unchanged) ---------- */
// The voting mode lives at /bonuses/ (per-question slugs at /bonuses/<slug>);
// app.js owns the two doorways: the homepage module (one curated rotating
// question from op=featured) and the compact results-screen prompt, which
// prefers a question about a player this user just drafted.
// Styling is injected here, scoped under .traits-*, so the shared styles.css
// stays untouched this build (fold into styles.css on its next owner pass).
var TRAITS_CSS_ID = "traitsCss";
var TRAIT_CARD_ABBR = {
  "Three-Point Shooter": "3PT",
  "Super Three-Point Shooter": "GRAV",
  "Iso Defender": "ISO-D",
  "Team Defender": "TEAM-D",
  "Rim Protector": "RIM-D",
  "Playmaker": "PLAY",
  "Clutch": "CLTCH",
  "Rim Pressurer": "RIM+",
  "Off-Ball Scorer": "OFF-B",
  "Switchable Defender": "SWCH-D",
  "Tough Shot Maker": "TSHOT",
  "Off-Court Knucklehead": "OFC-R",
  "Ball Stopper": "BSTOP",
  "Foul Merchant": "FOUL$",
  "Stat Padder": "STAT+",
  "Championship #1": "CH#1",
  "Ball Pounder": "BPOUND",
  // Retired v1 names stay readable if an old settled label ever surfaces.
  "Wing Defender": "WING-D",
  "Primary Creator": "CREATE",
  "Help Defender": "HELP-D"
};
var TRAIT_CARD_UI_SEEN_KEY = "t82_trait_card_ui_seen_v1";
var traitExpandedChip = null;
var traitDocDismissWired = false;

/* ---------- v49.5 THE VOTE STRIP (results roster only) ----------
   Tapping a community label chip opens one line under the chip row: an
   agree arm, the label, a disagree arm. Voting from the card is the whole
   point of the surface, so it posts to the same /api/traits op=vote the
   full page uses (source "card"), retires the question in the shared seen
   store, and reports back in place.

   ONE LINE IS A HARD CONSTRAINT (owner, 2026-08-06): SE-class widths are
   the majority of visits, so the strip must never wrap at 320. The arms are
   fixed-width, the text is the only flexible track, and TRAIT_STRIP_LABEL
   shortens the handful of labels that cannot fit next to two 42px arms in
   an SE card. Harness h9 measures every label at 320/360/375/390/430 and
   fails on a second line or an ellipsis.

   Engine chips (3PT, GRAVITY) are deliberately NOT votable: they are the
   engine's own shooting math, and the shipped legend says so. They keep the
   in-place expansion they have always had. */
// v49.7: the engine's shooting designations ARE votable now (owner ruling,
// 2026-08-07). They carry no consensus row of their own, so each maps to the
// community question that asks the same thing, and the vote pools with
// /bonuses/. The strip keeps the engine's own wording, which is what the chip
// promised: 3PT opens as FLOOR SPACER.
var TRAIT_ENG_QUESTION = {
  "3PT": "Three-Point Shooter",
  "GRAVITY": "Super Three-Point Shooter"
};
var TRAIT_VOTE_CUE_KEY = "t82_trait_vote_cue_v1";
var TRAIT_STRIP_LABEL = {
  "Super Three-Point Shooter": "SUPER SHOOTER",
  "Off-Court Knucklehead": "KNUCKLEHEAD",
  "Switchable Defender": "SWITCHABLE D",
  "Three-Point Shooter": "3PT SHOOTER",
  "Championship #1": "CHAMPIONSHIP 1"
};
var TRAIT_VOTE_MIN_GAP = 1300;   // the worker's cadence fence is 1200ms; queue just inside it
var traitCardVoteN = 0;          // votes cast from cards this page view; ordinal = brigade depth
// The card can vote before any poll session has started, so it mints the same
// shape of session id TM does and hands it back to TM if TM has none yet.
function traitCardSid() {
  if (!TM.sid) TM.sid = (Math.random().toString(36).slice(2, 10) + Date.now().toString(36)).slice(0, 16);
  return TM.sid;
}
var traitVoteQ = [], traitVoteBusy = false, traitVoteLast = 0;
function traitStripLabel(full) {
  return TRAIT_STRIP_LABEL[String(full || "")] || String(full || "").toUpperCase();
}
function traitArmSvg(down) {
  return '<svg viewBox="0 0 14 12" aria-hidden="true" focusable="false">' +
    (down ? '<path d="M7 12 0.5 2h13z"/>' : '<path d="M7 0 13.5 10h-13z"/>') + "</svg>";
}
function traitVoteStrip(chip) {
  var full = chip.getAttribute("data-full") || "";
  var qid = chip.getAttribute("data-qid") || "";
  var d = document.createElement("div");
  d.className = "tvote";
  d.setAttribute("data-qid", qid);
  d.setAttribute("role", "group");
  d.setAttribute("aria-label", "Vote on " + full);
  d.innerHTML =
    '<button type="button" class="tv-arm tv-yes tm-flat" data-vote="yes" aria-label="Agree, ' +
      esc(full) + ' fits">' + traitArmSvg(false) + "</button>" +
    '<span class="tv-txt">' + esc(traitStripLabel(full)) + "</span>" +
    '<button type="button" class="tv-arm tv-no tm-flat" data-vote="no" aria-label="Disagree, ' +
      esc(full) + ' does not fit">' + traitArmSvg(true) + "</button>";
  return d;
}
function closeTraitStrip() {
  var open = document.querySelector(".tvote");
  if (!open || !open.parentNode) return;
  // A strip that closes unvoted is the funnel's drop-off; value carries the
  // dwell so /avocado can see hesitation. A pending strip is a vote in
  // flight, not a dismissal.
  if (open.getAttribute("data-qid") && !open.classList.contains("voted") && !open.classList.contains("pending")) {
    var t0 = Number(open.getAttribute("data-t0")) || 0;
    analyticsTrack("traits_question", { surface: "card", action: "dismiss",
      challenge: open.getAttribute("data-qid"), value: t0 ? Date.now() - t0 : 0,
      source: "card", sid: traitCardSid() });
  }
  open.parentNode.removeChild(open);
}
// A chip is votable only where voting belongs (the results roster) and only
// when the labels payload gave it a question to vote on.
function traitChipVotable(chip) {
  if (!chip || !chip.getAttribute("data-qid")) return false;
  return !!(chip.closest && chip.closest('[data-result-section="roster"]'));
}
function openTraitStrip(chip) {
  closeTraitStrip();
  var sub = chip.closest ? chip.closest(".pr-sub") : null;
  var strip = traitVoteStrip(chip);
  if (sub && sub.parentNode) sub.parentNode.insertBefore(strip, sub.nextSibling);
  else chip.parentNode.appendChild(strip);
  return strip;
}
function traitVoteDone(strip, txt, resp) {
  if (!strip || !strip.parentNode) return;
  var t = strip.querySelector(".tv-txt");
  if (t) t.textContent = txt;
  strip.classList.remove("pending");
  strip.classList.add("voted");
  var arm = strip.querySelector(resp === "yes" ? ".tv-yes" : ".tv-no");
  if (arm) arm.classList.add("lit");
}
function traitVoteLine(d) {
  // Short by law: this line replaces the label inside the same one-line strip.
  if (!d) return "VOTE COUNTED";
  if (d.mode === "counts") return (d.yes || 0) + " YES \u00B7 " + (d.no || 0) + " NO";
  if (typeof d.yes_pct === "number") return d.yes_pct + "% SAY YES";
  return "VOTE COUNTED";
}
function traitVotePump() {
  if (traitVoteBusy || !traitVoteQ.length) return;
  var wait = TRAIT_VOTE_MIN_GAP - (Date.now() - traitVoteLast);
  if (wait > 0) { setTimeout(traitVotePump, wait); return; }
  var job = traitVoteQ.shift();
  traitVoteBusy = true;
  traitVoteLast = Date.now();
  var t0 = Date.now();
  fetch("/api/traits", {
    method: "POST", credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op: "vote", question_id: job.qid, response: job.resp, source: "card", sid: traitCardSid() })
  }).then(function (r) { return r.json(); }).then(function (x) {
    traitVoteBusy = false;
    if (x && x.ok) {
      tmSeenAdd(job.qid);
      analyticsTrack("traits_vote", { surface: "card", action: job.resp, ordinal: job.ord, challenge: job.qid,
        outcome: x.outcome, value: Date.now() - t0, source: "card", sid: traitCardSid() });
      traitVoteDone(job.strip, traitVoteLine(x.display), job.resp);
    } else if (x && x.reason === "rate_limited" && !job.retried) {
      job.retried = 1;                       // enthusiasm outrunning the fence, not an error
      traitVoteQ.unshift(job);
    } else {
      // The tap still reads real to the player; the miss is only for /avocado.
      analyticsTrack("traits_vote_error", { surface: "card", action: job.resp, ordinal: job.ord, challenge: job.qid,
        outcome: (x && x.reason) || "bad_reply", value: Date.now() - t0, source: "card", sid: traitCardSid() });
      traitVoteDone(job.strip, "VOTE COUNTED", job.resp);   // fail quiet: the tap still felt real
    }
    traitVotePump();
  }).catch(function () {
    traitVoteBusy = false;
    analyticsTrack("traits_vote_error", { surface: "card", action: job.resp, ordinal: job.ord, challenge: job.qid,
      outcome: "network", value: Date.now() - t0, source: "card", sid: traitCardSid() });
    traitVoteDone(job.strip, "VOTE COUNTED", job.resp);
    traitVotePump();
  });
}
function traitCardVote(strip, resp) {
  var qid = strip.getAttribute("data-qid");
  if (!qid || strip.classList.contains("voted") || strip.classList.contains("pending")) return;
  strip.classList.add("pending");
  buzz(10);
  var arm = strip.querySelector(resp === "yes" ? ".tv-yes" : ".tv-no");
  if (arm) arm.classList.add("lit");          // latch now, reconcile on reply
  traitCardVoteN += 1;                        // ordinal across the whole page view = brigade depth
  traitVoteQ.push({ qid: qid, resp: resp, strip: strip, ord: traitCardVoteN });
  traitVotePump();
}
function traitCardAbbr(full) {
  return TRAIT_CARD_ABBR[String(full || "")] || String(full || "");
}
function traitCardUiSeen() {
  try { return localStorage.getItem(TRAIT_CARD_UI_SEEN_KEY) === "1"; } catch (e) { return false; }
}
function markTraitCardUiSeen() {
  try { localStorage.setItem(TRAIT_CARD_UI_SEEN_KEY, "1"); } catch (e) {}
}
function setTraitChipExpanded(btn, on) {
  if (!btn) return;
  var full = btn.getAttribute("data-full") || "";
  var abbr = btn.getAttribute("data-abbr") || full;
  btn.classList.toggle("expanded", !!on);
  btn.setAttribute("aria-pressed", on ? "true" : "false");
  btn.textContent = on ? full : abbr;
  if (on) traitExpandedChip = btn;
  else if (traitExpandedChip === btn) traitExpandedChip = null;
}
function collapseTraitChip() {
  if (traitExpandedChip) {
    var c = traitExpandedChip;
    c.classList.remove("expanded");
    c.setAttribute("aria-pressed", "false");
    c.textContent = c.getAttribute("data-abbr") || c.getAttribute("data-full") || c.textContent;
    traitExpandedChip = null;
  }
  closeTraitStrip();
}
function stopTraitCardCue(sec) {
  if (!sec) return;
  sec.classList.remove("trait-card-cue");
  markTraitCardUiSeen();
}
function buildTraitLegendInto(panel, scope) {
  // One legend builder for every chip surface (results roster, classic draft
  // pool). Community labels list first; engine shooter designations follow
  // with an explicit "engine" marker so the two sources never blur.
  if (!panel || !scope) return;
  var seen = {}, rows = [], engRows = [], hasEng = false;
  var chips = scope.querySelectorAll(".tchip[data-full]");
  for (var i = 0; i < chips.length; i++) {
    var full = chips[i].getAttribute("data-full") || "";
    if (!full || seen[full]) continue;
    seen[full] = 1;
    var abbr = chips[i].getAttribute("data-abbr") || traitCardAbbr(full);
    var isEng = chips[i].classList.contains("eng");
    var line = '<div class="trait-legend-row"><b>' + esc(abbr) + '</b><span>' + esc(full) +
      (isEng ? " \u00B7 engine" : "") + "</span></div>";
    if (isEng) { engRows.push(line); hasEng = true; } else rows.push(line);
  }
  panel.innerHTML = '<div class="trait-legend-title">PLAYER LABELS</div>' +
    '<div class="trait-legend-grid">' + rows.concat(engRows).join("") + '</div>' +
    '<div class="trait-legend-note">Community votes confirm or overturn these labels. Crossed out = ruled out.' +
    (hasEng ? " 3PT and GRAVITY start as the engine\u2019s own shooting math. Tap one to back it or fight it." : "") + "</div>";
}
function buildTraitLegend(sec) { buildTraitLegendInto(sec && sec.querySelector("#traitLegend"), sec); }
// One shared open/close for every label-legend (i) button.
function traitInfoToggle(ib, legend) {
  collapseTraitChip();
  var opening = legend.hidden;
  legend.hidden = !opening;
  ib.setAttribute("aria-expanded", opening ? "true" : "false");
  ib.setAttribute("aria-label", opening ? "Close player label legend" : "Explain player labels");
  ib.textContent = opening ? "\u00d7" : "i";
}
// One document-level delegation for every trait chip everywhere (results
// cards, classic draft pool, Kaman cards): tap expands in place, tap
// elsewhere collapses. Draft-pool row selection guards itself against chip
// taps in its own listener, so a chip tap never drafts the player.
function wireTraitChipTaps() {
  if (traitDocDismissWired) return;
  traitDocDismissWired = true;
  document.addEventListener("click", function (ev) {
    var arm = ev.target.closest ? ev.target.closest(".tv-arm[data-vote]") : null;
    if (arm) {
      ev.preventDefault();
      var st = arm.closest(".tvote");
      if (st) traitCardVote(st, arm.getAttribute("data-vote"));
      return;
    }
    if (ev.target.closest && ev.target.closest(".tvote")) return;   // taps inside an open strip never dismiss it
    var chip = ev.target.closest ? ev.target.closest(".tchip[data-full]") : null;
    if (chip) {
      ev.preventDefault();
      var sec = chip.closest ? chip.closest(".traits-roster") : null;
      if (sec) stopTraitCardCue(sec); else markTraitCardUiSeen();
      var opening = !chip.classList.contains("expanded");
      if (traitExpandedChip && traitExpandedChip !== chip) collapseTraitChip();
      closeTraitStrip();
      if (traitChipVotable(chip)) {
        // The strip carries the full label, so the chip stays an abbreviation
        // and just wears the pressed state: the row never reflows.
        chip.classList.toggle("expanded", opening);
        chip.setAttribute("aria-pressed", opening ? "true" : "false");
        if (opening) {
          traitExpandedChip = chip;
          var st0 = openTraitStrip(chip);
          st0.setAttribute("data-t0", String(Date.now()));
          // One cue, once per device: the arms bounce so the first player to
          // open a strip learns they are buttons. Never repeats.
          try {
            if (localStorage.getItem(TRAIT_VOTE_CUE_KEY) !== "1") {
              localStorage.setItem(TRAIT_VOTE_CUE_KEY, "1");
              st0.classList.add("cue");
            }
          } catch (e) {}
          analyticsTrack("traits_question", { surface: "card", action: "view",
            challenge: chip.getAttribute("data-qid"), source: "card", sid: traitCardSid() });
        }
        else if (traitExpandedChip === chip) traitExpandedChip = null;
        return;
      }
      setTraitChipExpanded(chip, opening);
      return;
    }
    if (traitExpandedChip) collapseTraitChip();
    closeTraitStrip();
  });
}
function wireTraitCardUi() {
  var sec = document.querySelector('[data-result-section="roster"]');
  if (!sec) return;
  if (!sec.querySelector(".tchip[data-full]")) return;
  var info = sec.querySelector("#traitInfoBtn");
  var legend = sec.querySelector("#traitLegend");
  if (info) info.hidden = false;
  buildTraitLegend(sec);   // rebuilt on every call: labels land after the engine chips
  if (sec.getAttribute("data-trait-ui-wired") === "1") return;
  sec.setAttribute("data-trait-ui-wired", "1");
  wireTraitChipTaps();

  sec.addEventListener("click", function (ev) {
    var ib = ev.target.closest ? ev.target.closest("#traitInfoBtn") : null;
    if (ib && sec.contains(ib) && legend) {
      ev.preventDefault();
      stopTraitCardCue(sec);
      traitInfoToggle(ib, legend);
    }
  });

  if (!traitCardUiSeen()) {
    var fireCue = function () {
      if (traitCardUiSeen() || !document.body.contains(sec)) return;
      sec.classList.add("trait-card-cue");
      setTimeout(function () { sec.classList.remove("trait-card-cue"); }, 1500);
    };
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0] && entries[0].isIntersecting) { io.disconnect(); fireCue(); }
      }, { threshold: 0.28 });
      io.observe(sec);
    } else {
      setTimeout(fireCue, 350);
    }
  }
}
function ensureTraitsCss() {
  if (document.getElementById(TRAITS_CSS_ID)) return;
  var st = document.createElement("style");
  st.id = TRAITS_CSS_ID;
  st.textContent =
    ".traits-module{display:block;text-align:left;color:inherit;position:relative;" +
      "background:linear-gradient(180deg,#1a2129,#141a21);border:2px solid #FFB52E;border-radius:20px;" +
      "padding:15px 15px 13px;margin:12px 0;" +
      "box-shadow:0 0 0 1px rgba(255,181,46,.25),0 0 26px rgba(255,181,46,.16),0 14px 34px -18px rgba(0,0,0,.7)}" +
    ".traits-module .tm-top{display:flex;align-items:center;gap:9px}" +
    ".traits-module .tm-eyebrow{font-family:'IBM Plex Mono',monospace;font-size:12.5px;" +
      "letter-spacing:.2em;color:#FFB52E;text-decoration:none;display:inline-block}" +
    ".traits-module .tm-head:not([hidden]){display:block;text-align:center;font-family:'Barlow Condensed',sans-serif;" +
      "font-weight:700;font-size:22px;letter-spacing:.08em;color:#f2ede4;margin-bottom:9px}" +
    ".traits-module .tm-pips{align-items:center;gap:9px}" +
    ".traits-module .tm-pips span{width:13px;height:13px}" +
    ".traits-module .tm-pips span.done{width:16px;height:16px}" +
    ".traits-module .tm-new{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.14em;" +
      "color:#9fe870;border:1px solid #4d7a35;border-radius:7px;padding:2px 7px}" +
    ".traits-module .tm-call{display:block;font-family:'IBM Plex Mono',monospace;font-size:10.5px;" +
      "letter-spacing:.22em;color:#8b98a5;margin-top:8px}" +
    ".traits-module .tm-q{display:block;font-family:'Barlow Condensed',sans-serif;font-weight:700;" +
      "font-size:25px;line-height:1.05;margin-top:4px;text-transform:uppercase;" +
      "color:inherit;text-decoration:none}" +
    ".traits-module .tm-q:active{color:#FFB52E}" +
    ".traits-module .tm-def{display:block;font-size:13px;color:#8b98a5;margin-top:5px;" +
      "white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    /* v47.21: IDK narrows to exactly two thirds of its v47.19 width. Solve
       y/(2x+y) = (2/3)(2/12) = 1/9 and you get x = 4y, so 4:4:1 is the ratio -
       the width IDK gives up is split evenly back into YES/NO. Below ~350 the
       grid item's min-content width floors it a hair wider, which is the
       graceful end of the shrink rather than a clipped label. */
    ".traits-module .tm-votes{display:grid;grid-template-columns:4fr 4fr 1fr;gap:11px;margin-top:11px}" +
    ".traits-module .tm-vb.idk{font-size:14px;letter-spacing:.02em;padding:0 2px}" +
    ".traits-module .tm-vb{position:relative;height:52px;border:0;border-radius:13px;cursor:pointer;" +
      "font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:21px;letter-spacing:.1em;color:#1c1608;" +
      "background:linear-gradient(180deg,#FFC957,#F2A81F);" +
      "box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 3px 0 #9a6a12,0 7px 14px -6px rgba(0,0,0,.6)}" +
    ".traits-module .tm-vb.no{color:#2b0d09;background:linear-gradient(180deg,#F06A54,#D9422D);" +
      "box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 3px 0 #8c2317,0 7px 14px -6px rgba(0,0,0,.6)}" +
    /* v47.21: the pass reads as a dashed outline, not a slab. Flat by two
       mechanisms so neither can regress it alone - .tm-flat keeps the global
       3D decorator off it, and these rules kill the lift and the fill. */
    ".traits-module .tm-vb.idk{color:#9fabb7;background:none;border:1.5px dashed #4d5a67;box-shadow:none}" +
    ".traits-module .tm-vb.idk:active,.traits-module .tm-vb.idk.pressed{transform:none;box-shadow:none;" +
      "color:#FFB52E;border-color:#FFB52E}" +
    ".traits-module .tm-vb:active,.traits-module .tm-vb.pressed{transform:translateY(2px);" +
      "box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 1px 0 #9a6a12,0 4px 8px -5px rgba(0,0,0,.6)}" +
    ".traits-module .tm-vb.no:active,.traits-module .tm-vb.no.pressed{box-shadow:inset 0 1px 0 rgba(255,255,255,.2)," +
      "0 1px 0 #8c2317,0 4px 8px -5px rgba(0,0,0,.6)}" +
    ".traits-module.tm-locked .tm-vb{pointer-events:none;opacity:.55}" +
    ".traits-module.tm-locked .tm-vb.pressed{opacity:1}" +
    ".traits-module .tm-res{display:none;margin-top:12px;font-family:'Barlow Condensed',sans-serif;" +
      "font-weight:700;font-size:19px;letter-spacing:.05em}" +
    ".traits-module .tm-res b{color:#FFB52E}" +
    ".traits-module .tm-res .neg{color:#E5533C}" +
    ".traits-module .tm-foot{display:flex;align-items:center;margin-top:12px;justify-content:center}" +
    ".traits-module .tm-eyeb{color:#FFB52E;font-weight:700}" +
    /* v47.20 tag slot: the player-card chip exactly (gold face, ink text,
       7px radius, Barlow Condensed 700) with the 3D lift swapped for a gold
       hairline. The element a player portrait would later occupy.
       v47.21: it no longer floats inside the question - it rides the lead
       row opposite HELP BALANCE THE GAME, which hands the question back the
       line the float was costing it. */
    ".traits-module .tm-lead{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:24px}" +
    /* The lead only fits on one line beside the chip if the eyebrow gives
       up tracking on narrow phones. Measured: one line down to 360; at 320
       it wraps to two, which is still no taller than the two-clause
       subtitle it replaced. */
    "@media(max-width:389px){.traits-module .tm-eyebrow{font-size:12px;letter-spacing:.10em}}" +
    ".traits-module .tm-tag[hidden]{display:none}" +
    ".traits-module .tm-tag{flex:0 0 auto;display:inline-flex;align-items:center;" +
      "font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:12.5px;letter-spacing:.09em;" +
      "text-transform:uppercase;color:#1c1608;background:linear-gradient(180deg,#FFC957,#F2A81F);" +
      "border:1px solid #9a6a12;border-radius:7px;min-height:24px;padding:3px 8px 2px;line-height:1.1;white-space:nowrap}" +
    /* v47.19: the diamonds sit centered and larger; sharing moved to a thin,
       quiet 2D bar below them (excluded from the 3D decorator on purpose). */
    ".traits-module .tm-sharebar{display:block;width:100%;height:32px;margin-top:9px;appearance:none;-webkit-appearance:none;" +
      "background:none;border:1px solid #2c343d;border-radius:9px;cursor:pointer;" +
      "font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:.07em;color:#8b98a5;line-height:1}" +
    ".traits-module .tm-shlead{font-weight:700;color:#c9d2da}" +
    ".traits-module .tm-sharebar:active,.traits-module .tm-sharebar.flashed{color:#FFB52E;border-color:#FFB52E}" +
    ".traits-module .tm-sharebar:focus-visible{outline:2px solid #FFB52E;outline-offset:2px}" +
    ".traits-module .tm-dots{display:flex;gap:7px}" +
    ".traits-module .tm-dot{width:9px;height:9px;border-radius:50%;border:1.5px solid #4a5560;background:transparent}" +
    ".traits-module .tm-dot.on{background:#FFB52E;border-color:#FFB52E}" +
    ".traits-module .tm-count{font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.1em;color:#8b98a5}" +
    ".traits-module .tm-why:not([hidden]){display:block;font-size:12px;color:#68737e;margin-top:8px}" +
    ".traits-module .tm-open{position:absolute;top:16px;right:16px;font-family:'IBM Plex Mono',monospace;" +
      "font-size:11px;letter-spacing:.12em;color:#8b98a5;text-decoration:none;padding:6px 0 6px 8px}" +
    ".traits-module .tm-done{display:none;margin-top:13px}" +
    ".traits-module .tm-done .td-h{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:23px;letter-spacing:.06em}" +
    ".traits-module .tm-done .td-l{font-size:14px;color:#8b98a5;margin-top:3px}" +
    ".traits-module .tm-again{display:inline-flex;align-items:center;justify-content:center;margin-top:11px;text-decoration:none;" +
      "height:48px;padding:0 18px;border:0;border-radius:12px;cursor:pointer;" +
      "background:linear-gradient(180deg,#FFC957,#F2A81F);color:#1c1608;" +
      "font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:18px;letter-spacing:.1em;" +
      "box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 3px 0 #9a6a12}" +
    "@media (prefers-reduced-motion:reduce){.traits-module .tm-vb{transition:none}}" +
    ".traits-prompt{background:linear-gradient(180deg,#1a2129,#141a21);border:1.5px solid #FFB52E;border-radius:16px;" +
      "padding:16px;box-shadow:0 0 0 1px rgba(255,181,46,.18),0 0 18px rgba(255,181,46,.1)}" +
    ".traits-prompt .tp-eyebrow{font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.18em;color:#FFB52E}" +
    ".traits-prompt .tp-q{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:22px;margin:7px 0 5px;text-transform:uppercase}" +
    ".traits-prompt .tp-cta{display:inline-flex;align-items:center;justify-content:center;margin-top:9px;" +
      "min-width:96px;height:46px;padding:0 16px;border-radius:12px;text-decoration:none;" +
      "background:linear-gradient(180deg,#FFC957,#F2A81F);color:#1c1608;" +
      "font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:17px;letter-spacing:.12em;" +
      "box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 3px 0 #9a6a12}" +
    ".tchips{margin-top:6px;display:flex;flex-wrap:wrap;gap:5px}" +
    /* display:contents dissolves the wrapper's box so each label chip packs
       the .pr-sub flex line individually and only the true overflow wraps
       (v47.11); the span stays in the DOM for the dedupe guard and cache. */
    ".tchips-inline{display:contents}" +
    /* Trait chips wear the house slab (v47.9): ink text on a bright gold
       face, the site's own contrast law (dark text on amber, never
       amber-on-amber). Anti-labels are the red slab with the cross-out in
       the same ink. Chips own the whole skin here and are excluded from the
       global presti-spin decorator, so no outside button rule can repaint
       them into the old dark-on-dark. */
    ".tchip{position:relative;display:inline-flex;align-items:center;font-family:'Barlow Condensed',sans-serif;font-weight:700;" +
      "font-size:12.5px;letter-spacing:.09em;text-transform:uppercase;color:#1c1608;" +
      "background:linear-gradient(180deg,#FFC957,#F2A81F);border:0;border-radius:7px;" +
      "min-height:24px;padding:3px 8px 2px;line-height:1.1;white-space:nowrap;cursor:pointer;" +
      "appearance:none;-webkit-appearance:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent;" +
      "box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 2px 0 #9a6a12,0 5px 10px -8px #000;" +
      "transition:transform .1s ease,box-shadow .1s ease}" +
    ".tchip:active,.tchip.expanded{transform:translateY(2px);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 0 0 #9a6a12}" +
    ".tchip.anti{color:#2b0d09;background:linear-gradient(180deg,#F06A54,#D9422D);" +
      "box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 2px 0 #8c2317,0 5px 10px -8px #000}" +
    ".tchip.anti:active,.tchip.anti.expanded{transform:translateY(2px);box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 0 0 #8c2317}" +
    ".tchip.anti::after{content:'';position:absolute;left:6%;right:6%;top:50%;height:2px;margin-top:-1px;" +
      "background:#2b0d09;transform:rotate(-5deg);border-radius:1px;pointer-events:none}" +
    ".tchip:focus-visible{outline:2px solid #E8E4D8;outline-offset:2px}" +
    ".traits-roster-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px}" +
    ".traits-roster-head .eyebrow{margin:0}" +
    ".trait-info-btn{appearance:none;-webkit-appearance:none;width:27px;height:27px;flex:0 0 27px;padding:0;" +
      "display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:50%;" +
      "background:linear-gradient(180deg,#FFC957,#F2A81F);color:#1c1608;font-family:Georgia,serif;font-weight:700;" +
      "font-size:16px;line-height:1;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 2px 0 #9a6a12,0 5px 10px -7px #000;" +
      "touch-action:manipulation;-webkit-tap-highlight-color:transparent}" +
    ".trait-info-btn[hidden]{display:none}" +
    ".trait-info-btn:active,.trait-info-btn[aria-expanded=true]{transform:translateY(2px);box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 0 0 #9a6a12}" +
    ".pool-trait-info{margin-left:2px}" +
    ".trait-legend{margin:0 0 8px;padding:10px 11px;border:1px solid #46515c;border-radius:9px;background:#11171d;" +
      "box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}" +
    ".trait-legend-title{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.18em;color:#FFB52E;margin-bottom:7px}" +
    ".trait-legend-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 12px}" +
    ".trait-legend-row{display:flex;align-items:baseline;gap:7px;min-width:0;font-family:'Barlow Condensed',sans-serif;" +
      "font-size:13px;line-height:1.15;color:#d9d5ce}" +
    ".trait-legend-row b{flex:0 0 auto;color:#FFB52E;letter-spacing:.06em}" +
    ".trait-legend-row span{min-width:0}" +
    ".trait-legend-note{margin-top:8px;font-family:'IBM Plex Mono',monospace;font-size:9.5px;line-height:1.3;color:#7f8b96}" +
    "@keyframes traitChipPop{0%,100%{transform:translateY(0)}35%{transform:translateY(-4px)}65%{transform:translateY(1px)}}" +
    "@keyframes traitInfoPulse{0%,100%{transform:scale(1);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 2px 0 #74500d,0 0 0 0 rgba(255,181,46,0)}" +
      "45%{transform:scale(1.12);box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 2px 0 #74500d,0 0 0 6px rgba(255,181,46,.18)}}" +
    ".traits-roster.trait-card-cue .tchip{animation:traitChipPop .58s ease both}" +
    ".traits-roster.trait-card-cue .trait-info-btn{animation:traitInfoPulse 1.1s ease both}" +
    "@media(max-width:390px){.trait-legend-grid{grid-template-columns:1fr}}" +
    /* v49.5 the vote strip: one line, always. The arms are a fixed track and
       the label is the only elastic one, so nothing here can wrap. */
    /* v49.7 the arms read as buttons because they are RAISED on a RECESSED
       field: the strip sinks, the arms sit proud of it with a lit top edge
       and a hard bottom lip, and pressing drops them onto the floor. That
       contrast is the affordance, so no color shouting is needed. */
    ".tvote{display:flex;align-items:center;gap:6px;margin:7px 0 1px;width:100%;padding:4px;" +
      "background:rgba(0,0,0,.26);border:1px solid #2a343d;border-radius:12px;" +
      "box-shadow:inset 0 2px 5px rgba(0,0,0,.45);animation:tvIn .16s ease-out}" +
    ".tv-arm{flex:0 0 auto;width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;" +
      "padding:0;border:1px solid #5a6a7a;border-radius:10px;cursor:pointer;" +
      "background:linear-gradient(180deg,#2f3b47,#222c35);" +
      "box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 2px 0 #10161c;" +
      "transition:border-color .12s ease,background .12s ease;" +
      "-webkit-appearance:none;appearance:none;-webkit-tap-highlight-color:transparent}" +
    ".tv-arm svg{width:18px;height:16px;fill:#dfe9f2;pointer-events:none;transition:fill .12s ease}" +
    ".tv-arm:active{transform:translateY(2px);box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 0 0 #10161c}" +
    ".tv-yes:hover{border-color:#F2A81F}.tv-yes:hover svg{fill:#FFC957}" +
    ".tv-no:hover{border-color:#D9422D}.tv-no:hover svg{fill:#F06A54}" +
    ".tv-yes.lit{border-color:#FFC957;background:linear-gradient(180deg,#FFC957,#F2A81F);" +
      "box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 2px 0 #9a6a12}" +
    ".tv-yes.lit svg{fill:#1c1608}" +
    ".tv-no.lit{border-color:#F06A54;background:linear-gradient(180deg,#F06A54,#D9422D);" +
      "box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 2px 0 #8c2317}" +
    ".tv-no.lit svg{fill:#2b0d09}" +
    ".tvote.cue .tv-arm{animation:tvCue 1.5s ease-out 1}" +
    ".tvote.cue .tv-no{animation-delay:.12s}" +
    "@keyframes tvCue{0%,58%,100%{transform:none;border-color:#5a6a7a}" +
      "68%{transform:translateY(-3px);border-color:#8fa2b3}82%{transform:translateY(0);border-color:#8fa2b3}}" +
    ".tv-txt{flex:1 1 auto;min-width:0;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" +
      "font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:14px;letter-spacing:.06em;" +
      "line-height:1.1;color:#f2ede4;text-transform:uppercase}" +
    ".tvote.voted .tv-txt{color:#FFC957}" +
    "@keyframes tvIn{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}" +
    "@media(max-width:374px){.tv-arm{width:40px}.tv-txt{font-size:13px;letter-spacing:.03em}}" +
    "@media(prefers-reduced-motion:reduce){.tvote{animation:none}.tvote.cue .tv-arm{animation:none}" +
      ".traits-roster.trait-card-cue .tchip,.traits-roster.trait-card-cue .trait-info-btn{animation:none}" +
      ".tchip{transition:none}}";
  document.head.appendChild(st);
}
function traitsModuleHtml() {
  ensureTraitsCss();
  // Ships hidden; wireBonusesModule reveals it only with a live session in
  // hand, so the homepage never shows a stale or empty debate. The module IS
  // a voting surface (owner redesign, 2026-07-27): five quick YES/NO calls
  // run inline with progress dots; UNSURE and the full result hierarchy live
  // on /bonuses/, one tap away via FULL PAGE or the question itself.
  return '<section class="traits-module" id="traitsModule" hidden>' +
    '<span class="tm-head" id="tmHead" hidden>VOTE: DID WE GET IT WRONG?</span>' +
    '<div class="tm-lead">' +
      '<a class="tm-eyebrow" id="tmTitle" href="/bonuses/?src=home_module"><span class="tm-eyeb">HELP BALANCE THE GAME</span></a>' +
      '<span class="tm-tag" id="tmTag" hidden></span>' +
    "</div>" +
    '<span class="tm-call" id="tmCall" hidden></span>' +
    '<span class="tm-q" id="tmQ"></span>' +
    '<span class="tm-def" id="tmDef"></span>' +
    '<div class="tm-votes" id="tmVotes">' +
      '<button class="tm-vb" type="button" id="tmYes">YES</button>' +
      '<button class="tm-vb no" type="button" id="tmNo">NO</button>' +
      '<button class="tm-vb idk tm-flat" type="button" id="tmIdk">IDK</button>' +
    "</div>" +
    '<div class="tm-res" id="tmRes" aria-live="polite"></div>' +
    '<div class="tm-done" id="tmDone"></div>' +
    '<div class="tm-foot"><span class="round-pips tm-pips" id="tmDots" aria-hidden="true"></span></div>' +
    '<button class="tm-sharebar" type="button" id="tmShare" hidden>' +
      '<strong class="tm-shlead">Share Vote</strong> (please don\u2019t vote brigade)</button>' +
    "</section>";
}

// The inline home session: same worker, same voter, same analytics names as
// the full page (source home_module throughout). Compact result beat per
// vote, then the next question slides in; the fifth lands the completion
// state with VOTE ON 5 MORE. Any fetch trouble mid-run degrades to the
// FULL PAGE door instead of a dead card.
var TM = { qs: [], i: 0, sid: null, busy: false, source: "home_module", loader: null, wired: false };
// Question selection is keyed by the same first-party anonymous identity used
// for retention analytics. Wait briefly for that cookie/localStorage recovery
// handshake before requesting a feed; otherwise the first request can fall
// back to a one-visit sid and forget the browser's prior answer depth.
function traitsIdentityReady() {
  return new Promise(function (resolve) {
    var started = Date.now();
    (function check() {
      var d = null;
      try { d = typeof window.t82RetentionDebug === "function" ? window.t82RetentionDebug() : null; } catch (e) {}
      if (!d || d.state !== "pending" || Date.now() - started >= 2800) return resolve();
      setTimeout(check, 50);
    })();
  });
}
function tmHref(q) {
  return q && q.slug ? "/bonuses/" + q.slug + "?src=" + TM.source : "/bonuses/?src=" + TM.source;
}
function tmDots() {
  var d = el("tmDots");
  if (!d) return;
  var out = "";
  var total = Math.max(1, TM.qs.length);
  for (var k = 0; k < total; k++) {
    var on = k < TM.i || (k === TM.i && TM.qs[TM.i]);
    out += "<span" + (on ? ' class="done"' : "") + "></span>";
  }
  d.innerHTML = out;
}
function tmShowQuestion() {
  var q = TM.qs[TM.i];
  var mod = el("traitsModule");
  if (!q || !mod) return tmComplete();
  // v47.21: the tag rides the lead row, so the question is plain text again
  // (no innerHTML ordering dance) and gets its full width back.
  var tagAbbr = traitCardAbbr(q.trait_name || "");
  var tagEl = el("tmTag");
  if (tagEl) { tagEl.textContent = tagAbbr || ""; tagEl.hidden = !tagAbbr; }
  el("tmQ").textContent = (q.public_question || "").toUpperCase();
  el("tmDef").textContent = q.what_counts || "";
  el("tmRes").style.display = "none";
  el("tmVotes").style.display = "";
  mod.classList.remove("tm-locked");
  var sh = el("tmShare"); if (sh) sh.hidden = false;
  var y = el("tmYes"), nn = el("tmNo"), ik = el("tmIdk");
  y.classList.remove("pressed"); nn.classList.remove("pressed");
  if (ik) ik.classList.remove("pressed");
  tmDots();
  analyticsTrack("traits_question", { surface: "traits", action: "view", ordinal: TM.i + 1, challenge: q.id, source: TM.source, sid: TM.sid });
}
// Share the exact question on screen. Same canonical URL family the full
// page shares (/bonuses/<slug> when curated, ?q=<id> otherwise; src=s so the
// receiving session logs entry source "share"). Native share sheet when the
// browser has one, copy-to-clipboard with a COPIED beat otherwise. Pure
// navigation: no vote is written, the identity/vote path is untouched.
function tmShareQuestion() {
  var q = TM.qs[TM.i];
  var sh = el("tmShare");
  if (!q || !sh) return;
  var url = location.origin + "/bonuses/" + (q.slug || ("?q=" + encodeURIComponent(q.id))) + (q.slug ? "?src=s" : "&src=s");
  var text = "Vote on this one: " + (q.public_question || "");
  if (navigator.share) {
    navigator.share({ text: text, url: url }).then(function () {
      analyticsTrack("traits_question", { surface: "traits", action: "share_open", challenge: q.id, source: TM.source, sid: TM.sid });
    }).catch(function () {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text + "\n" + url).then(function () {
      if (!sh.dataset.labelHtml) sh.dataset.labelHtml = sh.innerHTML;
      sh.textContent = "COPIED";
      sh.classList.add("flashed");
      setTimeout(function () { sh.innerHTML = sh.dataset.labelHtml; sh.classList.remove("flashed"); }, 1400);
      analyticsTrack("traits_question", { surface: "traits", action: "share_copy", challenge: q.id, source: TM.source, sid: TM.sid });
    }).catch(function () {});
  }
}
function tmVote(resp, btn) {
  if (TM.busy) return;
  var q = TM.qs[TM.i];
  var mod = el("traitsModule");
  if (!q || !mod) return;
  TM.busy = true;
  mod.classList.add("tm-locked");
  btn.classList.add("pressed");
  buzz(10);
  var t0 = Date.now();
  fetch("/api/traits", {
    method: "POST", credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op: "vote", question_id: q.id, response: resp, source: TM.source, sid: TM.sid })
  }).then(function (r) { return r.json(); }).then(function (x) {
    TM.busy = false;
    if (!x || !x.ok || !x.display) return tmDegrade(q);
    tmSeenAdd(q.id);
    analyticsTrack("traits_vote", { surface: "traits", action: resp, ordinal: TM.i + 1, challenge: q.id, outcome: x.outcome, value: Date.now() - t0, source: TM.source, sid: TM.sid });
    tmResult(q, resp, x.display);
  }).catch(function () { TM.busy = false; tmDegrade(q); });
}
// IDK = a pass. Nothing is written server-side (an unsure lean is the full
// page's UNSURE vote; a pass is "stop asking me this one"): the id goes into
// the local seen store and the session moves on after a short pressed beat.
function tmPass(btn) {
  if (TM.busy) return;
  var q = TM.qs[TM.i];
  if (!q) return;
  btn.classList.add("pressed");
  buzz(6);
  tmSeenAdd(q.id);
  analyticsTrack("traits_vote", { surface: "traits", action: "pass", ordinal: TM.i + 1, challenge: q.id, source: TM.source, sid: TM.sid });
  TM.i++;
  setTimeout(function () { if (el("traitsModule")) tmShowQuestion(); }, 260);
}
function tmResult(q, resp, d) {
  var res = el("tmRes");
  el("tmVotes").style.display = "none";
  var line;
  if (d.mode === "counts") line = "<b>" + d.yes + " YES \u00B7 " + d.no + " NO</b> so far";
  else if ((d.yes_pct || 0) >= 50) line = "<b>" + d.yes_pct + "% SAY YES</b>";
  else line = '<span class="neg">' + (100 - d.yes_pct) + "% SAY NO</span>";
  var chip = d.status === "qualifies" ? " \u00B7 BONUS ACTIVE"
    : d.status === "does_not_qualify" ? " \u00B7 NO BONUS"
    : d.status === "disputed" ? " \u00B7 STILL DISPUTED" : "";
  res.innerHTML = line + chip;
  res.style.display = "block";
  buzz(10);
  analyticsTrack("traits_question", { surface: "traits", action: "result_view", ordinal: TM.i + 1, challenge: q.id, outcome: d.status, value: d.mode === "counts" ? 1 : 0, source: TM.source, sid: TM.sid });
  TM.i++;
  tmDots();
  var wait = 1500;
  try { if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) wait = 2100; } catch (e) {}
  setTimeout(function () { if (el("traitsModule")) tmShowQuestion(); }, wait);
}
function tmComplete() {
  var mod = el("traitsModule");
  if (!mod) return;
  el("tmQ").textContent = TM.qs.length + (TM.qs.length === 1 ? " VOTE IN" : " VOTES IN");
  el("tmDef").textContent = "";
  var doneTag = el("tmTag"); if (doneTag) { doneTag.textContent = ""; doneTag.hidden = true; }
  el("tmVotes").style.display = "none";
  el("tmRes").style.display = "none";
  var sh = el("tmShare"); if (sh) sh.hidden = true;
  var done = el("tmDone");
  done.style.display = "block";
  done.innerHTML = '<span class="td-l">Your votes helped set player bonuses.</span><br>' +
    '<a class="tm-again" id="tmAgain" href="/bonuses/?src=' + TM.source + '">VOTE ON 5 MORE</a>';
  tmDots();
  buzz([12, 70, 12]);
  analyticsTrack("traits_session", { surface: "traits", action: "complete", value: TM.qs.length, source: TM.source, sid: TM.sid });
}
function tmDegrade(q) {
  // The inline lane hit trouble; hand the run to the full page with the
  // current question pinned so nothing is lost.
  try { location.href = tmHref(q); } catch (e) {}
}
function tmStart(again) {
  var mod = el("traitsModule");
  if (!mod || !window.fetch || !TM.loader) return;
  TM.sid = (Math.random().toString(36).slice(2, 10) + Date.now().toString(36)).slice(0, 16);
  traitsIdentityReady().then(function () { return TM.loader(); }).then(function (x) {
    if (!x || !x.ok || !x.questions || !x.questions.length || !el("traitsModule")) return;
    // The API already tiers never-answered, answered-once, and exhausted
    // questions. Keep that order intact instead of independently hiding all
    // standing votes, which would defeat the intentional second-answer round.
    TM.qs = x.questions.filter(function (q) { return q.public_question; }).slice(0, 5);
    TM.i = 0;
    if (!TM.qs.length) return;
    var d = el("tmDone"); if (d) { d.style.display = "none"; d.innerHTML = ""; }
    if (!TM.wired) {
      TM.wired = true;
      el("tmYes").addEventListener("click", function () { tmVote("yes", el("tmYes")); });
      el("tmNo").addEventListener("click", function () { tmVote("no", el("tmNo")); });
      el("tmIdk").addEventListener("click", function () { tmPass(el("tmIdk")); });
      var shBtn = el("tmShare");
      if (shBtn) shBtn.addEventListener("click", tmShareQuestion);
    }
    tmShowQuestion();
    mod.hidden = false;
    analyticsTrack("traits_session", { surface: "traits", action: again ? "again" : "start", source: TM.source, sid: TM.sid });
    if (!again) analyticsTrack("mode_impression", { surface: TM.source === "home_module" ? "home" : "results", action: "traits", challenge: TM.qs[0].id });
  }).catch(function () {});
}
var TM_SEEN_KEY = "t82TraitsSeen";
function tmSeenList() {
  try {
    var a = JSON.parse(localStorage.getItem(TM_SEEN_KEY) || "[]");
    return Array.isArray(a) ? a.filter(function (x) { return typeof x === "string"; }) : [];
  } catch (e) { return []; }
}
function tmSeenAdd(id) {
  if (!id) return;
  try {
    var a = tmSeenList().filter(function (x) { return x !== id; });
    a.push(id);
    if (a.length > 400) a = a.slice(a.length - 400);
    localStorage.setItem(TM_SEEN_KEY, JSON.stringify(a));
  } catch (e) {}
}
function tmSessionLoader() {
  return fetch("/api/traits?op=featured", { credentials: "same-origin" })
    .then(function (r) { return r.json(); })
    .then(function (feat) {
      var pin = feat && feat.ok && feat.question ? feat.question.id : "";
      var ex = tmSeenList().filter(function (x) { return x !== pin; }).slice(-48);
      return fetch("/api/traits?op=session&sid=" + TM.sid + (pin ? "&q=" + encodeURIComponent(pin) : "") +
        (ex.length ? "&exclude=" + ex.map(encodeURIComponent).join(",") : ""), { credentials: "same-origin" })
        .then(function (r) { return r.json(); });
    });
}
function wireBonusesModule() {
  TM.source = "home_module";
  TM.loader = tmSessionLoader;
  TM.wired = false;
  tmStart(false);
}
// Fail-soft by construction: the section ships hidden and empty; only a clean
// /api/traits answer ever reveals it. Any network or schema failure leaves the
// results screen exactly as it was.
function wireTraitsPrompt() {
  var sec = el("traitsPromptSec");
  if (!sec || !window.fetch) return;
  // RATE YOUR FIVE (owner ruling, 2026-07-27): the results screen votes
  // inline on the players you just drafted. op=roster lazily makes any
  // drafted player votable in the shared question-id space; if the roster
  // lane comes back empty the card falls back to the curated session feed,
  // so the surface never dies.
  var pairs = "";
  try {
    pairs = picksInSlotOrder().map(function (en) {
      return encodeURIComponent(en.p.row[IDX.name]) + "~" + en.p.row[IDX.season] +
        (function (r) { var pv = IDX.pos !== undefined ? r[IDX.pos] : (IDX.position !== undefined ? r[IDX.position] : "");
          return pv ? "~" + encodeURIComponent(String(pv).slice(0, 3)) : ""; })(en.p.row);
    }).join(",");
  } catch (e) {}
  ensureTraitsCss();
  sec.innerHTML = traitsModuleHtml();
  sec.hidden = false;
  TM.source = "results_prompt";
  var tmT = el("tmTitle"); if (tmT) tmT.href = "/bonuses/?src=" + TM.source;
  TM.wired = false;
  TM.loader = function () {
    if (!pairs) return tmSessionLoader();
    return fetch("/api/traits?op=roster&sid=" + TM.sid + "&players=" + pairs, { credentials: "same-origin" })
      .then(function (r) { return r.json(); })
      .then(function (x) {
        var roster = x && x.ok && x.questions ? x.questions.slice(0, 5) : [];
        var sk = tmSeenList();
        roster = roster.filter(function (q) { return q && sk.indexOf(q.id) === -1; });
        if (roster.length >= 5) return { ok: true, questions: roster, rules: x.rules };
        // Preserve drafted-player questions first, then fill any open slots
        // from the broader under-two curated pool. This avoids forcing a third
        // roster repeat while other eligible questions remain.
        return tmSessionLoader().then(function (feed) {
          var merged = roster.slice(), ids = {};
          merged.forEach(function (q) { ids[q.id] = 1; });
          if (feed && feed.ok && feed.questions) feed.questions.forEach(function (q) {
            if (merged.length < 5 && q && !ids[q.id]) { ids[q.id] = 1; merged.push(q); }
          });
          return merged.length ? { ok: true, questions: merged, rules: (x && x.rules) || (feed && feed.rules) } : feed;
        });
      });
  };
  tmStart(false);
  var head = el("tmHead");
  if (head) head.hidden = false;
  var title = el("tmTitle");
  if (title) title.href = "/bonuses/?src=results_prompt";
}
// Shadow-mode labels on player cards: each card gets the community tags its
// player-season has EARNED (gold slab) or been RULED OUT of (red slab with
// the cross-out). Read-only, zero scoring effect, absent on any failure or
// when no ruling exists for the exact player-season. v47.9 placement: chips
// ride the SAME compact .pr-sub line as the engine 3PT/GRAVITY chip, beside
// the year/team info, instead of a separate row at the card's foot.
function traitLabelChipHtml(hh, tab) {
  var full = String(hh.t || "");
  var abbr = traitCardAbbr(full);
  var aria = (hh.anti ? "Ruled out: " : "") + full + ". Tap for full label.";
  return '<button type="button" class="tchip' + (hh.anti ? " anti" : "") + '"' +
    (tab === -1 ? ' tabindex="-1"' : "") +
    ' data-full="' + esc(full) + '" data-abbr="' + esc(abbr) + '"' +
    (hh.id ? ' data-qid="' + esc(hh.id) + '"' : "") +
    ' aria-label="' + esc(aria) + '" aria-pressed="false" title="' + esc(full) + '">' +
    esc(abbr) + "</button>";
}
// Presentation-only dedup: the engine's own shooter chip already sits on the
// same line, so a POSITIVE community shooter label of the same rank would
// just double it visually ("3PT 3PT"). Anti-labels always show; a community
// ruling AGAINST an engine designation is the fight this mode exists for.
// Data, votes, and the engine's sp column are untouched.
function traitLabelsAfterEngineFilter(hits, engAbbr) {
  if (!engAbbr) return hits;
  return hits.filter(function (hh) {
    if (hh.anti) return true;
    var t = String(hh.t || "");
    if (t === "Three-Point Shooter") return false;
    if (t === "Super Three-Point Shooter" && engAbbr === "GRAVITY") return false;
    return true;
  });
}
// Inject up to four label chips (the standing cap, applied after the engine
// dedup) into a card's first .pr-sub line. Works on results pick-cards and
// classic draft-pool rows alike; returns whether anything was added.
// The engine chip is drawn at render time, long before the labels call
// answers, so its question id is stamped on afterwards. Runs whether or not
// the player-season has any community labels of its own.
function stampEngineChipQid(container, qm) {
  if (!container || !qm) return false;
  var eng = container.querySelector(".tchip.eng");
  if (!eng || eng.getAttribute("data-qid")) return false;
  var qid = qm[TRAIT_ENG_QUESTION[eng.getAttribute("data-abbr") || ""] || ""];
  if (!qid) return false;
  eng.setAttribute("data-qid", qid);
  eng.setAttribute("aria-label", (eng.getAttribute("data-full") || "") +
    ", the engine\u2019s shooting designation. Tap to agree or disagree.");
  return true;
}
function applyLabelChips(container, hits, tab) {
  if (!container || !hits || !hits.length || container.querySelector(".tchips")) return false;
  var sub = container.querySelector(".pr-sub:not(.pr-stats)") || container;
  var engBtn = sub.querySelector(".tchip.eng");
  var use = traitLabelsAfterEngineFilter(hits, engBtn ? engBtn.getAttribute("data-abbr") : "").slice(0, 4);
  if (!use.length) return false;
  var wrap = document.createElement("span");
  wrap.className = "tchips tchips-inline";
  wrap.innerHTML = use.map(function (hh) { return traitLabelChipHtml(hh, tab); }).join("");
  sub.appendChild(wrap);
  return true;
}
function wireTraitsLabels(entries) {
  if (!window.fetch || !entries || !entries.length) return;
  var qs = entries.map(function (e) { return encodeURIComponent(e.name) + "~" + e.season; }).join(",");
  fetch("/api/traits?op=labels&players=" + qs, { credentials: "same-origin" })
    .then(function (r) { return r.json(); })
    .then(function (x) {
      if (!x || !x.ok || !x.labels) return;
      ensureTraitsCss();
      var added = 0;
      entries.forEach(function (e) {
        var key = String(e.name).toLowerCase() + "~" + e.season;
        var hits = x.labels[key];
        TRAIT_LABEL_CACHE[key] = hits || [];   // warm the draft-pool cache too
        var card = document.querySelector('.pick-card[data-pick="' + e.i + '"]');
        if (!card) return;
        if (stampEngineChipQid(card, x.qids && x.qids[key])) added += 1;
        if (!hits || !hits.length) return;
        if (applyLabelChips(card, hits, 0)) added += 1;
      });
      if (added) wireTraitCardUi();
    })
    .catch(function () {});
}

/* ---------- community labels on the classic draft pool (v47.9) ----------
   Same chips, same placement, same tap-to-expand and legend as the results
   cards, injected into each pool row's .pr-sub beside the year control and
   the engine chip. Labels are per player-SEASON, so every pool re-render
   (search, sort, year change, scramble settle) re-applies from a session
   cache keyed lower(name)~season; only unseen pairs hit /api/traits, one
   batched op=labels call per chunk of 60 (the worker reads the full settled
   set per request regardless, so 60 pairs cost what 8 did). Pool chips are
   tabindex=-1 on purpose: forty rows x four chips would bury keyboard
   navigation, and the pool-head legend carries every full name instead.
   Classic only (which includes Daily and weekly boards on a classic base);
   drafting rules, selection logic, and values are untouched. */
var TRAIT_LABEL_CACHE = {};     // key -> hits array ([] = fetched, none settled)
var TRAIT_LABEL_FETCHING = {};  // key -> 1 while a batch containing it is in flight
function poolLabelKey(name, season) { return String(name).toLowerCase() + "~" + season; }
function applyPoolLabelPass(pool) {
  var nodes = pool.querySelectorAll(".player-row[data-name]");
  var missing = [];
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i], name = node.getAttribute("data-name");
    var row = resolveRow(name);
    if (!row) continue;
    var key = poolLabelKey(name, row[IDX.season]);
    var hits = TRAIT_LABEL_CACHE[key];
    if (hits === undefined) {
      if (!TRAIT_LABEL_FETCHING[key]) missing.push({ key: key, name: name, season: row[IDX.season] });
    } else if (hits.length) {
      applyLabelChips(node, hits, -1);
    }
  }
  return missing;
}
function refreshPoolTraitLegend() {
  var pool = el("pool"), btn = el("poolTraitInfoBtn"), legend = el("poolTraitLegend");
  if (!pool || !btn || !legend) return;
  if (!pool.querySelector(".tchip[data-full]")) { btn.hidden = true; legend.hidden = true; return; }
  btn.hidden = false;
  buildTraitLegendInto(legend, pool);
}
function wireDraftPoolLabels() {
  if (MODE !== "classic") return;
  var pool = el("pool");
  if (!pool) return;
  ensureTraitsCss();
  var missing = applyPoolLabelPass(pool);
  refreshPoolTraitLegend();
  if (!missing.length || !window.fetch) return;
  for (var c = 0; c < missing.length; c += 60) {
    (function (chunk) {
      chunk.forEach(function (m) { TRAIT_LABEL_FETCHING[m.key] = 1; });
      var qs = chunk.map(function (m) { return encodeURIComponent(m.name) + "~" + m.season; }).join(",");
      fetch("/api/traits?op=labels&players=" + qs, { credentials: "same-origin" })
        .then(function (r) { return r.json(); })
        .then(function (x) {
          chunk.forEach(function (m) { delete TRAIT_LABEL_FETCHING[m.key]; });
          if (!x || !x.ok || !x.labels) return;
          chunk.forEach(function (m) { TRAIT_LABEL_CACHE[m.key] = x.labels[m.key] || []; });
          var p2 = el("pool");
          if (p2) { applyPoolLabelPass(p2); refreshPoolTraitLegend(); }
        })
        .catch(function () { chunk.forEach(function (m) { delete TRAIT_LABEL_FETCHING[m.key]; }); });
    })(missing.slice(c, c + 60));
  }
}

function wireDonate() {
  var b = el("donateBtn");
  if (b) b.addEventListener("click", function () {
    analyticsTrack("feedback_click", { variant: b.getAttribute("data-msg"), mode: MODE, surface: "results" });
  });
}

function renderIntro() {
  G = null;
  ANALYTICS_HOME_N += 1;
  if (window.T82DUI) T82DUI.stop();   // leaving a duel screen kills its poll
  document.body.classList.remove("drafting");
  document.body.classList.remove("gating");
  renderPips();
  // THE DAILY takes the third slot (Pro's old spot) when daily-core.js +
  // challenges.js are on the page; without them the classic Pro button renders
  // and nothing else changes (fail-soft, zero regression on an old deploy).
  var dailyBoard = null, dailyOfficial = null, dailyStreak = 0;
  if (window.T82DAILY && window.T82CH) {
    try {
      dailyBoard = T82DAILY.boardFor(T82DAILY.dayKey());
      dailyOfficial = T82DAILY.officialFor(dailyBoard.key);
      dailyStreak = T82DAILY.streakFor(dailyBoard.key);
    } catch (e) { dailyBoard = null; }
  }
  analyticsSendReturnProfile();
  var dailyDate = "";
  try { dailyDate = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }).toUpperCase(); } catch (e) {}
  // Tomorrow's board name is deterministic and free: anticipation is the
  // ethical retention lever. No countdowns, no streak threats, no guilt copy
  // anywhere on this surface; the streak renders as a patch you earned, never
  // a leash. Once today is played, the tile's PRIMARY action becomes
  // CHALLENGE A FRIEND: the retention surface feeds the share loop instead of
  // farming compulsive re-opens. RUN IT BACK · PRACTICE rides second (v28,
  // owner reversal of the v24 removal): practice is reachable from the tile
  // again, ghost-skinned so the share action stays the loudest thing here.
  var dailyTomorrow = null;
  try { dailyTomorrow = T82DAILY.boardFor(T82DAILY.dayKey(Date.now() + 86400000)); } catch (e) {}
  var dtStreak = dailyStreak >= 2 ? ' \u00B7 \uD83D\uDD25 ' + dailyStreak : '';
  // The plaque hierarchy, per spec: THE DAILY #N is by far the loudest text,
  // then the date, then today's board, then one short cryptic line. The
  // one-run law and the full variation brief moved to the gate screen, so the
  // plaque stays a poster, not a paragraph.
  var dtTitle = '<span class="dt-title">\uD83D\uDDD3\uFE0F THE DAILY #' + (dailyBoard ? dailyBoard.num : "") + '</span>';
  var dtDate = '<span class="dt-date mono">' + dailyDate + dtStreak + '</span>';
  var thirdSlotHtml;
  if (dailyBoard && dailyOfficial) {
    thirdSlotHtml =
      '<div class="daily-tile plq-frame is-played" role="group" aria-label="The Daily, played">' +
        dtTitle +
        '<span class="dt-result">\u2713 YOUR RUN ' + dailyOfficial.wins + '-' + (82 - dailyOfficial.wins) +
          ' \u00B7 Net ' + T82DAILY.signedNet(dailyOfficial.net) + '</span>' +
        '<span class="dt-actions">' +
          '<button class="dt-act dt-act-share" id="dailyChallengeBtn" data-share-label="CHALLENGE A FRIEND">CHALLENGE A FRIEND</button>' +
          '<button class="dt-act dt-act-ghost" id="dailyPracticeBtn">RUN IT BACK \u00B7 PRACTICE</button>' +
        '</span>' +
      '</div>';
  } else if (dailyBoard) {
    thirdSlotHtml =
      '<button class="daily-tile plq-frame" id="startDaily">' +
        dtTitle +
        '<span class="dt-board">' + esc(dailyBoard.name) + '</span>' +
      '</button>';
  } else {
    thirdSlotHtml = '<button class="btn btn-block more-modes" id="startPro">\uD83C\uDFC6 Pro \u00B7 pick the best seasons from memory</button>';
  }
  app().innerHTML =
    '<section class="ticket intro">' +
      '<div class="intro-toprow"><button class="arena-chip" id="arenaChip" type="button">\uD83C\uDFDF Arena</button></div>' +
      '<h1 class="intro-title" id="introTitle">Go 82\u20130</h1>' +
      '<p class="intro-lead">An \u201C82\u20130\u201D-style game, but driven by advanced metrics instead of just adding up counting stats. Pick a team that would actually win IRL. Try to go undefeated.</p>' +
      '<button class="daily-strip" id="dailyStrip" hidden></button>' +
      '<button class="btn btn-primary btn-block presti-spin" id="startClassic">\uD83C\uDFC0 Classic \u00B7 full stats</button>' +
      '<button class="btn btn-primary btn-block presti-spin" id="startCap">\uD83D\uDC10 Presti Mode \u00B7 Salary Cap &amp; Random</button>' +
      '<button class="btn btn-primary btn-block presti-spin weekly-tile" id="startWeekly" hidden>' +
        '<span class="wk-eyebrow">THIS WEEK</span><span class="wk-name" id="wkName"></span>' +
        '<span class="wk-blurb" id="wkBlurb"></span><span class="wk-meta" id="wkMeta"></span></button>' +
      thirdSlotHtml +
      (function () {
        var r = dyLoad();
        var label = r && r.active && r.history.length
          ? "\uD83D\uDC51 Dynasty \u00B7 Season " + r.dyn + " waits"
          : "\uD83D\uDC51 Dynasty \u00B7 how long can you keep it alive?";
        return '<button class="btn btn-block more-modes" id="startDynasty">' + label + '</button>';
      })() +
      '<button class="btn btn-block more-modes" id="startRedraft">\uD83D\uDD01 The Redraft \u00B7 nine classes, two rival GMs, one board</button>' +
      '<button class="btn btn-block more-modes" id="startDuel">\u2694\uFE0F Duel a friend \u00B7 correspondence</button>' +
      '<button class="btn btn-block more-modes" id="startLeague">\uD83C\uDFC6 Found a league \u00B7 season-long H2H</button>' +
      traitsModuleHtml() +
      '<p class="eyebrow">Draft</p>' +
      "<p>Five rounds. Each one deals a random NBA franchise and decade; draft one player who suited up for that team in that era, any season of his career. Fill 2 guards, 2 forwards, and a center. In Classic you can skip the team once and the era once.</p>" +
      '<p class="eyebrow">Winning</p>' +
      "<p>The engine grades your five on advanced impact (BPM), then converts net rating into an 82-game record. It rewards real stars, wants about <strong>3 shooters</strong>, and punishes ball-hog pileups and bad-defense pairs. Every draft screen has a <strong>HOW TO PLAY</strong> button with the full rules and the day's twist.</p>" +
    "</section>";
  analyticsTrack("home_view", {
    surface: "home", action: ANALYTICS_HOME_N === 1 ? "landing" : "return_to_menu",
    outcome: dailyOfficial ? "daily_played" : "daily_unplayed",
    streak: dailyStreak || 0,
    daily_num: dailyBoard ? dailyBoard.num : null
  });
  (function trackVisibleModeTiles() {
    var specs = [
      ["startClassic", "classic"], ["startCap", "cap"], ["startPro", "pro"],
      ["startDaily", "daily"], ["dailyChallengeBtn", "daily_share"], ["dailyPracticeBtn", "daily_practice"],
      ["startDuel", "duel"], ["startLeague", "league"], ["arenaChip", "arena"], ["startWeekly", "weekly"],
      ["startDynasty", "dynasty"], ["startRedraft", "showdown"]
    ];
    var seen = {};
    function mark(node, key) {
      if (!node || node.hidden || seen[key]) return;
      seen[key] = 1;
      analyticsTrack("mode_impression", { surface: "home", action: key, mode: key === "daily" && dailyBoard ? dailyBoard.base : (key === "cap" ? "cap" : key) });
    }
    if (typeof IntersectionObserver === "function") {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var key = entry.target.getAttribute("data-analytics-tile");
          mark(entry.target, key); obs.unobserve(entry.target);
        });
      }, { threshold: 0.35 });
      specs.forEach(function (s) { var n = el(s[0]); if (n && !n.hidden) { n.setAttribute("data-analytics-tile", s[1]); obs.observe(n); } });
    } else specs.forEach(function (s) { mark(el(s[0]), s[1]); });
  })();
  function start(mode) {
    analyticsTrack("mode_select", { mode: mode, surface: "home", action: mode });
    if (DATA_READY) { newGame(mode); return; }
    PENDING_MODE = mode;   // data still downloading — remember the choice and launch the moment it lands
    ["startClassic", "startPro", "startCap", "startDaily"].forEach(function (id) { var b = el(id); if (b) b.disabled = true; });
    var pressed = el(mode === "classic" ? "startClassic" : mode === "pro" ? "startPro" : "startCap");
    if (pressed) pressed.textContent = "Loading players\u2026";
  }
  function queue(fn, btn) {
    if (DATA_READY) { fn(); return; }
    PENDING_FN = fn;
    if (btn) btn.disabled = true;
  }
  el("startClassic").addEventListener("click", function () { start("classic"); });
  var proBtn = el("startPro");   // absent when THE DAILY holds the third slot
  if (proBtn) proBtn.addEventListener("click", function () { start("pro"); });
  el("startCap").addEventListener("click", function () { start("cap"); });
  el("startDynasty").addEventListener("click", function () {
    analyticsTrack("mode_select", { mode: "dynasty", surface: "home", action: "dynasty" });
    renderDynastyGate();   // the gate needs no player data; the launch inside it queues on DATA_READY
  });
  el("startRedraft").addEventListener("click", function () {
    analyticsTrack("mode_select", { mode: "showdown", surface: "home", action: "redraft" });
    renderShowdownGate();   // same shape as the dynasty gate: no player data needed to pitch
  });
  el("startDuel").addEventListener("click", function () {
    analyticsTrack("feature_select", { surface: "home", action: "duel" });
    var btn = el("startDuel"), label = btn.textContent;
    queue(function () {
      btn.disabled = true; btn.textContent = "Opening duel\u2026";
      ensureDuelUI().then(function (ok) {
        if (ok) T82DUI.lobby(); else featureLoadFailed(btn, label);
      });
    }, btn);
  });
  el("arenaChip").addEventListener("click", function () {   // no site data needed
    analyticsTrack("feature_select", { surface: "home", action: "arena" });
    var btn = el("arenaChip"), label = btn.textContent;
    btn.disabled = true; btn.textContent = "Opening\u2026";
    ensureArenaUI().then(function (ok) {
      if (ok) T82ARENA.route(); else featureLoadFailed(btn, label);
    });
  });
  // Only the door-out elements count as a feature select now that the module
  // votes inline; YES/NO taps report through the vote vocabulary instead.
  ["tmTitle"].forEach(function (id) {
    var door = el(id);
    if (door) door.addEventListener("click", function () {
      analyticsTrack("feature_select", { surface: "home", action: "traits" });
    });
  });
  wireBonusesModule();
  el("startLeague").addEventListener("click", function () {   // league office needs no site data
    analyticsTrack("feature_select", { surface: "home", action: "league" });
    var btn = el("startLeague"), label = btn.textContent;
    btn.disabled = true; btn.textContent = "Opening league\u2026";
    ensureLeagueUI().then(function (ok) {
      if (ok) T82LGUI.lobby(); else featureLoadFailed(btn, label);
    });
  });

  // THE DAILY: tile launch, plus the ?d= beat-my-five landing. A matching link
  // drops the receiver straight onto today's board with the target pinned (the
  // ten-second payoff is a fight, not a homepage). A stale link gets an honest
  // note and today's board one tap away.
  if (dailyBoard) {
    var dailyTile = el("startDaily");
    if (dailyTile) dailyTile.addEventListener("click", function () {
      if (dailyOfficial) {                       // practice rerun: they have read the gate
        analyticsTrack("mode_select", { mode: dailyBoard.base, surface: "home", action: "daily_practice", daily_num: dailyBoard.num, practice: 1 });
        queue(function () { startDailyRun(dailyBoard, null, "daily-practice:" + dailyBoard.num); }, dailyTile);
        return;
      }
      analyticsTrack("mode_select", { mode: dailyBoard.base, surface: "home", action: "daily", daily_num: dailyBoard.num, official: 1 });
      renderDailyGate(dailyBoard, null, "daily:" + dailyBoard.num);
    });
    var dailyChb = el("dailyChallengeBtn");
    if (dailyChb) dailyChb.addEventListener("click", function () {
      var off = T82DAILY.officialFor(dailyBoard.key);
      if (!off) return;
      var menuShareTrack = {
        mode: dailyBoard.base,
        wins: off.wins,
        net: off.net,
        value: (typeof off.pct === "number") ? off.pct : null,
        undefeated: off.wins >= CFG.GAMES_IN_SEASON ? 1 : 0,
        variant: "daily-menu:" + dailyBoard.num,
        surface: "daily_menu",
        action: "challenge_friend",
        daily_num: dailyBoard.num,
        challenge: dailyBoard.ch && dailyBoard.ch.id ? dailyBoard.ch.id : null,
        official: 1,
        practice: 0
      };
      if (window.t82track) {
        window.t82track("share_click", menuShareTrack);
      }
      shareOrCopy(T82DAILY.shareTextDaily(
        { key: dailyBoard.key, num: dailyBoard.num, name: dailyBoard.name },
        { wins: off.wins, net: off.net, five: off.five || [],
          emoji: shareEmojiFor(off.wins, (dailyBoard.ch && dailyBoard.ch.shareEmoji) || null, dailyBoard.base),
          comp: shareCompFor(off.wins),
          pct: (typeof off.pct === "number") ? off.pct : null }
      ), dailyChb, menuShareTrack);
    });
    var dailyPrb = el("dailyPracticeBtn");
    if (dailyPrb) dailyPrb.addEventListener("click", function () {
      // v28: the v24 removal reversed. Same launch as the results againBtn —
      // deterministic board rebuild, no gate (they read the law on the
      // official run), and the official record stays untouchable by law.
      analyticsTrack("mode_select", { mode: dailyBoard.base, surface: "daily_menu", action: "daily_practice", daily_num: dailyBoard.num, practice: 1 });
      queue(function () { startDailyRun(dailyBoard, null, "daily-practice:" + dailyBoard.num); }, dailyPrb);
    });
    var dl = DAILY_LINK;
    if (dl) {
      DAILY_LINK = null;   // one landing per visit, same law as ?ref
      if (dl.key === dailyBoard.key) {
        var tgt = (dl.w != null && dl.n != null) ? { w: dl.w, n: dl.n } : null;
        analyticsTrack("referral_open", {
          mode: dailyBoard.base, surface: "landing", action: "daily_link", outcome: "current",
          daily_num: dailyBoard.num, target_wins: tgt ? tgt.w : null, target_net: tgt ? tgt.n : null
        });
        // Flag now, fire after the rest of the intro is wired (the gate
        // replaces #app, and the header egg still needs its listener). The
        // receiver then reads what they were challenged to while data loads.
        DAILY_GATE_PENDING = { board: dailyBoard, tgt: tgt, tag: "daily-link:" + dailyBoard.num };
      } else if (dailyTile && dailyTile.parentNode) {
        analyticsTrack("referral_open", {
          mode: dailyBoard.base, surface: "landing", action: "daily_link", outcome: "stale",
          daily_num: T82DAILY.dayNum(dl.key)
        });
        var staleNote = document.createElement("p");
        staleNote.className = "daily-stale mono";
        staleNote.textContent = "That link was for Daily #" + T82DAILY.dayNum(dl.key) + ". Today's board is #" + dailyBoard.num + ".";
        dailyTile.parentNode.insertBefore(staleNote, dailyTile.nextSibling);
      }
    }
  }

  // kaman left the menu — five quick taps on the title bring Him back
  var kTaps = [], title = el("introTitle");
  if (title) title.addEventListener("click", function () {
    var now = Date.now();
    kTaps = kTaps.filter(function (t) { return now - t < 2500; });
    kTaps.push(now);
    if (kTaps.length >= 5) { kTaps = []; analyticsTrack("feature_select", { surface: "home", action: "kaman_egg", mode: "kaman" }); start("kaman"); }
  });

  // daily strip — the server mints today's seed; anonymous can play, sign-in makes it count
  if (window.T82ACC) T82ACC.fetchDaily().then(function (d) {
    var strip = el("dailyStrip");
    if (!strip || !d || !d.ok || G) return;
    var hrs = Math.max(1, Math.round((d.endsInS || 0) / 3600));
    var label = d.mode === "cap" ? "Presti" : d.mode.charAt(0).toUpperCase() + d.mode.slice(1);
    strip.textContent = "\uD83D\uDCC5 Today's board \u00B7 " + label + " \u00B7 " + hrs + "h left";
    strip.hidden = false;
    analyticsTrack("mode_impression", { mode: d.mode, surface: "home", action: "account_daily", source: d.label || "" });
    strip.addEventListener("click", function () {
      analyticsTrack("mode_select", { mode: d.mode, surface: "home", action: "account_daily", source: d.label || "" });
      queue(function () {
        newGame(d.mode, d.seed, null, { surface: "account_daily", variant: "account-daily" });
        if (G) G.official = { label: d.label };
      }, strip);
    });
  });

  // this-week tile — self-marketing: name, blurb, base chip, days left, your best
  if (window.T82ACC && window.T82CH) T82ACC.fetchWeekly().then(function (w) {
    var tile = el("startWeekly");
    if (!tile || !w || !w.ok || !T82CH.byId[w.challengeId] || G) return;
    var ch = T82CH.byId[w.challengeId];
    el("wkName").textContent = w.name;
    el("wkBlurb").textContent =
      (window.T82DAILY && T82DAILY.DAILY_COPY && T82DAILY.DAILY_COPY[w.id] && T82DAILY.DAILY_COPY[w.id].s) || w.blurb;
    var days = Math.max(1, Math.ceil((w.endsInS || 0) / 86400));
    var baseChip = w.base === "cap" ? "Presti rules" : w.base === "pro" ? "Pro rules" : "Classic rules";
    el("wkMeta").textContent = baseChip + " \u00B7 " + days + (days === 1 ? " day" : " days") + " left" +
      (w.best ? " \u00B7 your best: " + w.best.wins + " W" : "");
    tile.hidden = false;
    analyticsTrack("mode_impression", {
      mode: ch.base, surface: "home", action: "weekly", challenge: ch.id, source: String(w.week || w.id || "")
    });
    tile.addEventListener("click", function () {
      analyticsTrack("mode_select", {
        mode: ch.base, surface: "home", action: "weekly", challenge: ch.id, source: String(w.week || w.id || "")
      });
      queue(function () {
        newGame(ch.base, undefined, ch, { surface: "weekly", variant: "weekly:" + String(w.week || w.id || "") });
        if (G) G.weekly = { challengeId: ch.id, week: w.week };
      }, tile);
    });
  });

  // A beat-link landing flagged above fires here, once every intro listener
  // (header egg included) is wired, so nothing is left half-bound when the
  // gate replaces #app.
  if (DAILY_GATE_PENDING) {
    var dgp = DAILY_GATE_PENDING;
    DAILY_GATE_PENDING = null;
    renderDailyGate(dgp.board, dgp.tgt, dgp.tag);
  }
}

/* ---------- draft ---------- */

function slotRailHtml() {
  return '<div class="slot-rail">' + BUCKETS.map(function (b) {
    var full = G.filled[b] >= BUCKET_CAP[b];
    return '<span class="slot' + (full ? " filled" : "") + '">' + BUCKET_NAME[b] + ' <b>' + G.filled[b] + "/" + BUCKET_CAP[b] + "</b></span>";
  }).join("") + "</div>";
}

// Drafted-roster rail shown in the draft tray: the 2-2-1 slots fill with names as
// you pick. Structured as one container + five self-contained .lineup-slot cells
// (position badge + name, data-slot, filled/open state) so a later restyle into the
// token / Ultimate-Team look (#2) is CSS + markup only, no logic change.
function lineupInitials(name) {
  var parts = String(name).trim().split(/\s+/);
  var first = parts[0] ? parts[0][0] : "";
  var lp = parts.slice();
  while (lp.length > 1 && /^(jr\.?|sr\.?|ii|iii|iv|v)$/i.test(lp[lp.length - 1])) lp.pop();
  var last = lp.length > 1 ? lp[lp.length - 1][0] : "";
  return (first + last).toUpperCase();
}
function lineupLastName(name) {
  var parts = String(name).trim().split(/\s+/);
  while (parts.length > 1 && /^(jr\.?|sr\.?|ii|iii|iv|v)$/i.test(parts[parts.length - 1])) parts.pop();
  return parts[parts.length - 1];
}
/* ---------- lineup position moves / swaps ----------
   Any drafted player can be re-slotted at any time during the draft:
   tap his token (marked with a small ⇄ if he has a legal move) -> every legal
   destination lights up with a pulsing dashed ring + ⇄ -> tap one to move (open
   slot) or swap (another player's slot, if both are eligible both ways). Tap the
   same token again to cancel. Eligibility uses career-wide positions. */



function afterLineupChange() {
  G.moveIdx = null;
  // a move can open/close a bucket, which can flip pool eligibility and the current selection
  if (G.selected && MODE !== "kaman") {
    var r = resolveRow(G.selected);
    if (!r || !rowDraftable(r)) G.selected = null;
  }
  refreshPool();   // re-renders pool rows + tray
}



function lineupRailHtml() {
  var moving = G.moveIdx != null ? G.moveIdx : null;
  var targets = moving != null ? swapTargetsFor(moving) : null;
  var cells = [];
  BUCKETS.forEach(function (b) {
    var inB = G.picks.map(function (p, i) { return { p: p, i: i }; }).filter(function (e) { return e.p.slot === b; });
    for (var s = 0; s < capOf(b); s++) {
      var entry = inB[s];
      if (entry) {
        var nm = entry.p.row[IDX.name];
        var isMoving = moving === entry.i;
        var isTarget = targets && targets.picks[entry.i];
        var movable = isMoving || isTarget || pickHasMoves(entry.i);
        var cls = "lineup-slot filled" + (movable ? " movable" : "") + (isMoving ? " moving" : "") + (isTarget ? " swap-target" : "");
        var label = isTarget ? ("Swap " + nm + " with " + G.picks[moving].row[IDX.name])
                             : (isMoving ? ("Moving " + nm + " \u2014 tap a highlighted spot")
                                         : ("Swap " + nm + " to another position"));
        // Badge doubles as the affordance: SWAP (can move) -> MOVING (picked) -> HERE (a legal spot)
        var badge = "";
        if (movable) {
          var bt = isMoving ? "MOVING" : (isTarget ? "HERE" : "SWAP");
          var bcls = "ls-swap" + (isMoving ? " is-moving" : (isTarget ? " is-here" : ""));
          badge = '<span class="' + bcls + '" aria-hidden="true">' + bt +
                  (bt === "SWAP" ? '<i class="lss-a">\u21C4</i>' : "") + "</span>";
        }
        cells.push('<div class="' + cls + '" data-pick="' + entry.i + '" role="listitem"' +
          (movable ? ' tabindex="0" aria-label="' + esc(label) + '"' : "") + ">" +
          '<span class="ls-token">' + badge + esc(lineupInitials(nm)) +
            '<i class="ls-pos">' + b + "</i></span>" +
          '<span class="ls-name" title="' + esc(nm) + '">' + esc(lineupLastName(nm)) + "</span></div>");
      } else {
        var openTarget = targets && targets.open[b];
        var ocls = "lineup-slot open" + (openTarget ? " swap-target" : "");
        cells.push('<div class="' + ocls + '" data-slot="' + b + '" role="listitem"' +
          (openTarget ? ' tabindex="0" aria-label="Move ' + esc(G.picks[moving].row[IDX.name]) + " to " + BUCKET_NAME[b] + '"' : "") + ">" +
          '<span class="ls-token is-open">' +
            (openTarget ? '<span class="ls-swap is-here" aria-hidden="true">HERE</span>' : "") + b + "</span>" +
          '</div>');
      }
    }
  });
  return '<div class="lineup-rail" role="list" aria-label="Your lineup \u00B7 tap a SWAP badge to move a player between positions">' + cells.join("") + "</div>";
}

function trayHtml() {
  return lineupRailHtml();
}

function confirmHtml() {
  if (!G.selected) return "";
  var row = resolveRow(G.selected);
  if (!row) return "";
  var opts = rowOpenBuckets(row);
  if (!opts.length) return "";
  var yr = shortSeason(row[IDX.season]);
  var who = MODE === "kaman" ? "Chris Kaman" : esc(G.selected);
  // v20: the money math happens where the thumb is. The confirm line shows
  // the price AND what the bank holds after: "· $23M · leaves $27M".
  var costNote = "";
  if (MODE === "cap" && effCost(G.selected) != null) {
    var _c = effCost(G.selected);
    costNote = " \u00B7 " + fmtM(_c) + " \u00B7 leaves " + fmtM(G.budget - _c);
  }
  var spinCls = " presti-spin";   // casino skin on the draft/position buttons, all modes
  if (opts.length === 1) {
    var ok1 = bucketLegal(row, opts[0]);
    return (costNote ? '<div class="confirm-label">' + who + " " + yr + costNote + "</div>" : "") +
      '<button class="confirm-btn' + spinCls + '" data-bucket="' + opts[0] + '"' +
      (ok1 ? "" : ' disabled title="' + esc(chBlockWhy()) + '"') + '>Draft your player</button>';
  }
  return '<div class="confirm-label">Assign ' + who + " " + yr + costNote + " to:</div>" +
    '<div class="confirm-multi">' + opts.map(function (b) {
      var ok = bucketLegal(row, b);
      return '<button class="confirm-btn' + spinCls + '" data-bucket="' + b + '"' +
        (ok ? "" : ' disabled title="' + esc(chBlockWhy()) + '"') + '>' + BUCKET_NAME[b] + "</button>";
    }).join("") + "</div>";
}

function bindConfirm() {
  var inner = el("trayInner");
  if (!inner) return;
  inner.querySelectorAll(".confirm-btn").forEach(function (b) {
    b.addEventListener("click", function () { confirmPick(b.getAttribute("data-bucket")); });
  });
}
function bindLineupMoves() {
  var inner = el("trayInner");
  if (!inner) return;
  function act(cell) {
    if (cell.hasAttribute("data-pick")) {
      var i = parseInt(cell.getAttribute("data-pick"), 10);
      if (isNaN(i)) return;
      if (G.moveIdx === i) { G.moveIdx = null; updateTray(); return; }              // tap again = cancel
      if (G.moveIdx != null && swapTargetsFor(G.moveIdx).picks[i]) { doLineupSwap(G.moveIdx, i); buzz(15); return; }
      if (pickHasMoves(i)) { G.moveIdx = i; buzz(8); updateTray(); return; }
      G.moveIdx = null; updateTray();
    } else if (cell.hasAttribute("data-slot") && G.moveIdx != null) {
      var b = cell.getAttribute("data-slot");
      if (swapTargetsFor(G.moveIdx).open[b]) { doLineupMove(G.moveIdx, b); buzz(15); }
    }
  }
  inner.querySelectorAll(".lineup-slot").forEach(function (cell) {
    cell.addEventListener("click", function () { act(cell); });
    cell.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter" && ev.key !== " " && ev.key !== "Spacebar") return;
      ev.preventDefault();
      act(cell);
    });
  });
}
function updateTray() {
  var inner = el("trayInner");
  if (!inner) return;
  document.body.classList.toggle("has-pick", !!G.selected);
  inner.innerHTML = trayHtml() + confirmHtml();
  bindConfirm();
  bindLineupMoves();
}

/* the season picker shown in each player row (only when >1 season exists) */
function yearControlHtml(name, row) {
  // v12: the year is a styled face with a transparent native <select> stretched
  // over it. Same handler, same a11y, but the face is plain text, so the year
  // reel can spin it in every mode, and the gold caret makes "you can change
  // this" visible instead of implied.
  var arr = T82.poolYearsEligible(G, name);   // only eligible (>785-min) seasons in the dropdown
  var curTxt = shortSeason(row[IDX.season]) + " " + esc(row[IDX.team]);
  if (!arr || arr.length <= 1) {
    return '<span class="year-face year-fixed">' + curTxt + "</span>";
  }
  var cur = row[IDX.season];
  // v48.1: every season of a surviving player is legal again. Retirement is
  // player-level now, so a retired man is not in this list at all: he is not
  // on the board. The v48 per-option RETIRED tag is gone with the rule.
  var opts = arr.map(function (r) {
    var s = r[IDX.season];
    return '<option value="' + s + '"' + (s === cur ? " selected" : "") + ">" +
      shortSeason(s) + " " + esc(r[IDX.team]) + "</option>";
  }).join("");
  return '<span class="year-wrap"><span class="year-face">' + curTxt +
    ' <b class="yf-caret">\u25BE</b></span>' +
    '<select class="year-sel" data-name="' + esc(name) + '" aria-label="Season for ' + esc(name) + '">' + opts + "</select></span>";
}

/* one draft-pool row (a div[role=button] so it can legally contain the <select>) */
function poolRowHtml(bestRow) {
  if (MODE === "kaman") return kamanRowHtml(bestRow);
  if (MODE === "cap") return capRowHtml(bestRow);
  var name = bestRow[IDX.name];
  var row = resolveRow(name);
  var block = pickBlock(row);
  var open = !block;
  var sel = (G.selected === name) && open;
  var cls = "player-row" + (sel ? " sel" : "") + (open ? "" : " off");
  var tag = bucketTag(row) + (block ? " \u00B7 " + block.tag : "");
  var sub1 = yearControlHtml(name, row) + (MODE === "classic" ? chipsFor(row, -1) : "");
  var sub2 = (MODE === "classic") ? '<span class="pr-sub pr-stats">' + statLine(row) + "</span>" : "";
  return '<div class="' + cls + '" role="button" tabindex="0" data-name="' + esc(name) + '" aria-pressed="' + sel + '"' +
    (open ? "" : ' aria-disabled="true" title="' + esc(block.why) + '"') + ">" +
    '<span class="pr-top"><span class="pr-name">' + esc(name) + "</span>" +
    '<span class="pr-pos">' + tag + "</span></span>" +
    '<span class="pr-sub">' + sub1 + "</span>" + sub2 + "</div>";
}

// Kaman Mode pool row: each row is one Chris Kaman season (selected by season).
function kamanRowHtml(row) {
  var season = row[IDX.season];
  var open = rowDraftable(row);
  var sel = (G.selected === String(season)) && open;
  var cls = "player-row" + (sel ? " sel" : "") + (open ? "" : " off");
  return '<div class="' + cls + '" role="button" tabindex="0" data-season="' + season + '" aria-pressed="' + sel + '"' +
    (open ? "" : ' aria-disabled="true"') + ">" +
    '<span class="pr-top"><span class="pr-name">Chris Kaman ' + shortSeason(season) + "</span>" +
    '<span class="pr-pos">C \u00B7 ' + esc(row[IDX.team]) + (open ? "" : " \u00B7 picked") + "</span></span>" +
    '<span class="pr-sub">' + chipsFor(row, -1) + "</span>" +
    '<span class="pr-sub pr-stats">' + statLine(row) + "</span></div>";
}

// Salary Cap pool row: locked season, no stats — just the name, the year, and a price tag.
// During a FIRE SALE the base price shows struck through in red with the -$2 price in green.
function capRowHtml(bestRow) {
  var name = bestRow[IDX.name];
  var row = resolveRow(name);
  var block = pickBlock(row);
  var open = !block;
  var sel = (G.selected === name) && open;
  var cost = G.costByName ? G.costByName[name] : null;
  var eff = effCost(name);
  // The price action box (v12): a compact right-side DRAFT + $NM box that makes
  // the cost unmissable. Purely visual affordance: the ROW stays the single
  // interactive control (role=button, whole surface tappable, one tab stop),
  // and the box takes its pressed look from the row's active/selected state.
  var costHtml = "";
  if (cost != null) {
    var amt = (G.fireSale && eff < cost)
      ? '<s class="cost-old">' + mHtml(fmtM(cost)) + '</s><b class="cost-new">' + mHtml(fmtM(eff)) + '</b>'
      : mHtml(fmtM(cost));
    costHtml = '<span class="cc-amt">' + amt + '</span>';   // v22: the number is the whole message
  }
  var why = block ? " \u00B7 " + block.tag : "";
  var cls = "player-row cap-row" + (sel ? " sel" : "") + (open ? "" : " off");
  return '<div class="' + cls + '" role="button" tabindex="0" data-name="' + esc(name) + '" aria-pressed="' + sel + '"' +
    (open ? "" : ' aria-disabled="true" title="' + esc(block.why) + '"') + ">" +
    '<span class="cap-main">' +
      '<span class="pr-name">' + esc(name) + '</span>' +
      '<span class="cap-meta">' +
        '<span class="pr-pos">' + bucketTag(row) + why + '</span>' +
        '<span class="cap-season">' + shortSeason(row[IDX.season]) + ' ' + esc(row[IDX.team]) + '</span>' +
      '</span>' +
    '</span>' +
    '<span class="cap-cost">' + costHtml + '</span>' +
  '</div>';
}

function poolInnerHtml(rows) { return rows.map(poolRowHtml).join(""); }

function selectRow(node) {
  var pool = el("pool");
  if (!pool) return;
  var prev = pool.querySelector(".player-row.sel");
  if (prev && prev !== node) { prev.classList.remove("sel"); prev.setAttribute("aria-pressed", "false"); }
  node.classList.add("sel");
  node.setAttribute("aria-pressed", "true");
  G.selected = MODE === "kaman" ? node.getAttribute("data-season") : node.getAttribute("data-name");
  var row = resolveRow(G.selected);
  if (row) analyticsTrack("player_select", Object.assign(analyticsRunSnapshot(), {
    player: row[IDX.name], season: row[IDX.season], value: MODE === "cap" ? effCost(G.selected) : null,
    ordinal: G.round || 0
  }));
  updateTray();
}

/* re-render just the pool (no ticket/flap) after a season change */
function refreshPool() {
  var pool = el("pool");
  if (!pool) return;
  traitExpandedChip = null;   // the expanded chip's node just got rebuilt
  pool.innerHTML = poolBodyHtml(currentPoolRows());
  updateTray();
  wireDraftPoolLabels();      // classic only inside; re-applies from cache
}

function renderDraft(anim) {
  G.screen = "draft";
  G.query = "";                 // fresh filter on each new round / skip (sort persists)
  document.body.classList.add("drafting");   // hides the masthead: the utility bar takes over (styles.css)
  document.body.classList.remove("gating");
  var rows = currentPoolRows();
  var codes = {};
  rows.forEach(function (r) { codes[r[IDX.team]] = true; });
  var codeStr = Object.keys(codes).sort().join("/");

  var canReroll = MODE !== "cap" || (G.budget - 1 >= CFG.ROUNDS - G.round + 1);  // leave $1 per remaining pick
  var teamSkippable = MODE !== "kaman" && (MODE === "cap" ? canReroll : G.teamSkips > 0) && teamSkipTargets().length > 0;
  var eraSkippable = MODE !== "kaman" && (MODE === "cap" ? canReroll : G.eraSkips > 0) && eraSkipTargets().length > 0;
  var yearRerollable = MODE === "cap" && canReroll;
  var spinCls = " presti-spin";   // casino skin on the skip buttons, all modes

  var poolHtml = poolBodyHtml(rows);

  var crest = MODE === "kaman" ? null : crestFor(G.cur.fr, G.cur.dec);
  var artHtml = crest
    ? '<div class="ticket-art"><img id="flapArt" class="crest-img flap" alt="' +
        esc(titleCase(G.cur.fr) + " " + decLabel(G.cur.dec)) + '" src="' + crest + '"></div>'
    : "";

  var ticketHtml;
  if (MODE === "kaman") {
    ticketHtml = '<section class="ticket kaman-ticket"><div class="kaman-big" id="kamanBig">KAMAN</div></section>';
  } else {
    ticketHtml = '<section class="ticket">' +
      '<div class="ticket-head">' +
        '<div class="ticket-headtext">' +
          '<div class="ticket-roll">' +
            '<span class="ticket-dec" id="flapDec">' + decLabel(G.cur.dec) + "</span>" +
            '<span class="ticket-fr" id="flapFr">' + esc(titleCase(G.cur.fr)) + "</span>" +
          "</div>" +
          '<p class="ticket-sub">' + decSpanStr(G.cur.dec) + " \u00B7 as " + esc(codeStr) + "</p>" +
        "</div>" +
        artHtml +
      "</div>" +
      '<div class="ticket-actions' + (MODE === "cap" ? " ta-cap" : "") + '">' +
        (MODE === "cap"
          ? '<button class="skip-btn' + spinCls + '" id="skipTeam"' + (teamSkippable ? "" : " disabled") + '><span class="sk-lab">SKIP TEAM</span><span class="sk-chip">' + mHtml(fmtMCost(1)) + "</span></button>" +
            '<button class="skip-btn' + spinCls + '" id="skipEra"' + (eraSkippable ? "" : " disabled") + '><span class="sk-lab">SKIP ERA</span><span class="sk-chip">' + mHtml(fmtMCost(1)) + "</span></button>" +
            '<button class="skip-btn presti-spin" id="rerollYears"' + (yearRerollable ? "" : " disabled") + '><span class="sk-lab">SKIP YRS</span><span class="sk-chip">' + mHtml(fmtMCost(1)) + "</span></button>"
          : '<button class="skip-btn' + spinCls + '" id="skipTeam"' + (teamSkippable ? "" : " disabled") + ">Skip team \u00B7 " + G.teamSkips + " left</button>" +
            '<button class="skip-btn' + spinCls + '" id="skipEra"' + (eraSkippable ? "" : " disabled") + ">Skip era \u00B7 " + G.eraSkips + " left</button>") +
      "</div>" +
    "</section>";
  }

  applyMetricYears(false);   // a fresh deal under OBPM/DBPM sorting starts on metric years

  var poolHeadHtml;
  if (MODE === "kaman") {
    poolHeadHtml = '<div class="pool-head"><span class="pool-count">pick a Kaman season \u00B7 repeats welcome</span></div>';
  } else {
    var chips = MODE === "cap" ? [["cost", "$"], ["min", "Min"], ["az", "A\u2013Z"]] : [["min", "Min"], ["az", "A\u2013Z"]];
    if (MODE === "classic") chips.push(["obpm", "OBPM"], ["dbpm", "DBPM"]);
    var chipsHtml = chips.map(function (c) {
      var label = c[1];
      if (c[0] === "cost" && G.sortMode === "cost") label = "$ " + (G.costDir === "asc" ? "\u2191" : "\u2193");
      return '<button class="sort-chip' + (G.sortMode === c[0] ? " active" : "") + '" data-sort="' + c[0] + '">' + label + "</button>";
    }).join("");
    poolHeadHtml = '<div class="pool-head pool-head-tools">' +
      '<div class="sort-chips" id="sortChips">' + chipsHtml + "</div>" +
      '<input type="search" id="poolSearch" class="pool-search" placeholder="search player name..." autocomplete="off" spellcheck="false">' +
      (MODE === "classic"
        ? '<button class="trait-info-btn pool-trait-info" id="poolTraitInfoBtn" type="button" aria-label="Explain player labels" aria-controls="poolTraitLegend" aria-expanded="false" title="Player label legend" hidden>i</button>'
        : "") +
      "</div>" +
      (MODE === "classic" ? '<div class="trait-legend pool-trait-legend" id="poolTraitLegend" hidden></div>' : "");
  }

  // Compact draft chrome (2026-07-17): utility bar + mode panel replace the
  // old Start over slab, daily/challenge strap, cap money bar, pro hint, and
  // every draft-screen (i). The rule that used to live on the strap is on the
  // panel's status row, and the full brief is one HOW TO PLAY tap away, so it
  // is still visible at the moment it blocks a pick.
  app().innerHTML =
    draftUtilityHtml() +
    modePanelHtml() +
    ticketHtml +
    poolHeadHtml +
    '<div class="pool" id="pool">' + poolHtml + "</div>" +
    '<div class="pool-fade" id="poolFade" aria-hidden="true"></div>' +
    '<div class="tray"><div class="tray-inner" id="trayInner"></div></div>';

  updateTray();
  renderPips();   // the utility bar's pips + PICK N OF 5 live inside the fresh markup

  wireStartOver();
  var rulesBtn = el("rulesBtn");
  if (rulesBtn) rulesBtn.addEventListener("click", openRulesSheet);
  initDraftViewport();
  tickBank();
  var searchEl = el("poolSearch");
  if (searchEl) {
    searchEl.addEventListener("input", function () {
      G.query = searchEl.value; refreshPool();
      clearTimeout(ANALYTICS_SEARCH_TIMER);
      ANALYTICS_SEARCH_TIMER = setTimeout(function () {
        var qlen = String(G.query || "").trim().length;
        if (!qlen) return;
        analyticsTrack("search_use", Object.assign(analyticsRunSnapshot(), {
          amount: qlen, ordinal: currentPoolRows().length,
          outcome: currentPoolRows().length ? "results" : "zero_results"
        }));
      }, 500);
    });
  }
  var chipRow = el("sortChips");
  if (chipRow) {
    chipRow.addEventListener("click", function (ev) {
      var b = ev.target.closest(".sort-chip");
      if (!b) return;
      var mode = b.getAttribute("data-sort");
      if (mode === "cost" && G.sortMode === "cost") {
        G.costDir = (G.costDir === "asc") ? "desc" : "asc";   // re-click flips most/least money
      } else {
        G.sortMode = mode;
        applyMetricYears(true);
      }
      analyticsTrack("sort_change", Object.assign(analyticsRunSnapshot(), {
        action: G.sortMode, outcome: G.sortMode === "cost" ? G.costDir : "selected"
      }));
      chipRow.querySelectorAll(".sort-chip").forEach(function (c) {
        c.classList.toggle("active", c.getAttribute("data-sort") === G.sortMode);
      });
      var costChip = chipRow.querySelector('.sort-chip[data-sort="cost"]');
      if (costChip) costChip.textContent = (G.sortMode === "cost") ? ("$ " + (G.costDir === "asc" ? "\u2191" : "\u2193")) : "$";
      refreshPool();
    });
  }
  if (teamSkippable) el("skipTeam").addEventListener("click", doTeamSkip);
  if (eraSkippable) el("skipEra").addEventListener("click", doEraSkip);
  if (yearRerollable) el("rerollYears").addEventListener("click", doYearReroll);
  el("pool").addEventListener("click", function (ev) {
    if (ev.target.closest(".year-sel")) return;     // the dropdown handles its own taps
    if (ev.target.closest(".tchip")) return;        // label chips expand via the document handler, never draft
    var btn = ev.target.closest(".player-row");
    if (!btn) return;
    if (btn.classList.contains("off")) {
      analyticsTrack("pick_denied", Object.assign(analyticsRunSnapshot(), {
        action: btn.getAttribute("title") || "disabled_card", player: btn.getAttribute("data-name") || "",
        season: parseInt(btn.getAttribute("data-season"), 10) || null
      }));
      denyRow(btn, btn.getAttribute("title") || ""); return;
    }
    selectRow(btn);
  });
  el("pool").addEventListener("keydown", function (ev) {
    var t = ev.target;
    if (!t.classList || !t.classList.contains("player-row")) return;  // not the card (e.g. the <select>)
    if (ev.key !== "Enter" && ev.key !== " " && ev.key !== "Spacebar") return;
    if (t.classList.contains("off")) {
      ev.preventDefault();
      analyticsTrack("pick_denied", Object.assign(analyticsRunSnapshot(), {
        action: t.getAttribute("title") || "disabled_card", player: t.getAttribute("data-name") || "",
        season: parseInt(t.getAttribute("data-season"), 10) || null
      }));
      denyRow(t, t.getAttribute("title") || ""); return;
    }
    ev.preventDefault();
    selectRow(t);
  });
  el("pool").addEventListener("change", function (ev) {
    var s = ev.target;
    if (!s.classList || !s.classList.contains("year-sel")) return;
    var name = s.getAttribute("data-name");
    var season = parseInt(s.value, 10);
    if (isNaN(season)) return;
    G.yearByName[name] = season;
    analyticsTrack("year_change", Object.assign(analyticsRunSnapshot(), {
      player: name, season: season, action: "season_menu"
    }));
    if (G.selected === name && !rowDraftable(resolveRow(name))) G.selected = null;  // chosen year fits no open slot
    refreshPool();
  });

  var poolInfo = el("poolTraitInfoBtn"), poolLegend = el("poolTraitLegend");
  if (poolInfo && poolLegend) {
    wireTraitChipTaps();
    poolInfo.addEventListener("click", function (ev) {
      ev.preventDefault();
      traitInfoToggle(poolInfo, poolLegend);
    });
  }
  wireDraftPoolLabels();

  if (MODE === "cap") {
    if (G.refundFlash) { flashRefund(); G.refundFlash = null; }
    if (G.fireSaleFlash) { flashFireSale(); G.fireSaleFlash = null; }
  }

  if (anim) {
    if (MODE === "kaman") {
      if (anim.kaman) reveal("kamanBig");   // nothing to reel through — keep the pop
    } else if (anim.years) {
      scramblePool("years", 620);           // spin the pool years (+ prices in Presti)
    } else if (anim.dec || anim.fr) {
      var crestLand = spinReels(anim);       // ticket slot-reels: Classic / Pro / Presti
      scramblePool(MODE === "cap" ? "full" : "years", crestLand + 120);   // v12: pool roulette, every mode
    }
    window.scrollTo(0, 0);
  }
}

/* reveal animation: a quick pop on the true value — never shows a wrong one */
function reveal(id) {
  var node = el(id);
  if (!node) return;
  node.classList.remove("flap");
  void node.offsetWidth; // force reflow so the animation restarts
  node.classList.add("flap");
}

/* ---------- results ---------- */

function ledgerRow(label, why, amt, isTax) {
  var amtHtml = isTax ? '<span class="ledger-amt tax">\u2212' + fmt1(amt) + "</span>" : '<span class="ledger-amt zero">\u2713 0.0</span>';
  return '<div class="ledger-row"><span>' + label + '<span class="why">' + why + "</span></span>" + amtHtml + "</div>";
}

function ledgerCreditRow(label, why, amt) {
  return '<div class="ledger-row"><span>' + label + '<span class="why">' + why + "</span></span>" +
    '<span class="ledger-amt good">+' + fmt1(amt) + "</span></div>";
}

// Two-way profile: team offense = sum of pick OBPM, defense = sum of pick DBPM.
// OBPM/DBPM are defined so a league-average player is ~0, so the 5-man sum reads as
// "BPM above five average players" on each end. Bars are scaled per end (defense has a
// genuinely narrower real-world spread than offense), so "elite defense" fills its bar
// even though its raw number is smaller than an elite offense. These describe the
// roster's two ends and are separate from the win projection (they sum to total team
// BPM, not the net rating).
function twoWayTier(val, t) {
  // t = [eliteMin, strongMin, solidMin, avgMin]
  if (val >= t[0]) return ["Elite", "tier-elite"];
  if (val >= t[1]) return ["Strong", "tier-strong"];
  if (val >= t[2]) return ["Solid", "tier-solid"];
  if (val >= t[3]) return ["Average", "tier-avg"];
  return ["Weak", "tier-weak"];
}
function twoWayRow(label, val, fullAt, tiers, cls) {
  var tier = twoWayTier(val, tiers);
  var fill;
  if (val > 0) {
    var pct = Math.min(100, (val / fullAt) * 100);
    fill = '<div class="tw-fill ' + cls + '" style="width:' + pct.toFixed(1) + '%"></div>';
  } else {
    // nothing earned on this end \u2014 a tiny red nub instead of an empty track
    fill = '<div class="tw-fill tw-nub"></div>';
  }
  return '<div class="tw-row">' +
    '<div class="tw-top"><span class="tw-end">' + label + "</span>" +
      '<span class="tw-tier ' + tier[1] + '">' + tier[0] + "</span></div>" +
    '<div class="tw-track">' + fill + "</div>" +
    "</div>";
}
function twoWayHtml(e) {
  // Ceilings = ~95th percentile of 5-man team OBPM/DBPM from a Monte-Carlo of strong,
  // realistic drafts (so a top-~5% offense/defense pegs the bar). Tier breakpoints are
  // pulled from the same run: Elite ~p95, Strong ~p75, Solid ~p45, then Average / Weak.
  var off = twoWayRow("Offense", e.sumObpm, 25, [22, 16, 8, 0], "tw-off");
  var def = twoWayRow("Defense", e.sumDbpm, 10, [9, 6, 3, 0], "tw-def");
  return '<div class="twoway">' + off + def + "</div>";
}

// The historical comp ladder (owner sheet, 2026-07-19). This SUPERSEDES
// META.legends: values were recut (Hamptons 5 to 78, the Celts Big 3 split
// into OG/'08) and three old pins retired. One team per win value; 70 is a
// deliberate gap. Feeds both the GOAT Climb pins and the results comp line.
// bbT/bbP (v34): every rung links out — real teams to their season page,
// composites to the owner-delegated best-year pick (noted inline), player
// clones to the player. Feeds the climb tags and the results comp line;
// the SHARE comp stays plain text by law.
var HISTORY_COMPS = [
  { label: "Dream Team", wins: 81 },
  { label: "Redeem Team", wins: 80 },
  { label: "OG Death Lineup", wins: 79, bbT: "GSW/2016" },
  { label: "Hamptons 5", wins: 78, bbT: "GSW/2017" },
  { label: "Shaqobe Core", wins: 77, bbT: "LAL/2000" },
  { label: "OG Celts Big 3", wins: 76, bbT: "BOS/1986" },
  { label: "\u201908 Celts Big 3", wins: 75, bbT: "BOS/2008" },
  { label: "3-peat Bulls Core", wins: 74, bbT: "CHI/1992" },
  { label: "\u201916 Warriors", wins: 73, bbT: "GSW/2016" },
  { label: "\u201996 Bulls", wins: 72, bbT: "CHI/1996" },
  { label: "Lob City Lineup", wins: 71, bbT: "LAC/2014" },
  { label: "Prime Wilt Core", wins: 70, bbT: "PHI/1967" },
  { label: "\u201972 Lakers", wins: 69, bbT: "LAL/1972" },
  { label: "Fo' Fo' Fo' Co'", wins: 68, bbT: "PHI/1983" },
  { label: "\u201986 Celtics", wins: 67, bbT: "BOS/1986" },
  { label: "Heatles", wins: 66, bbT: "MIA/2013" },
  { label: "\u201916 Spurs", wins: 65, bbT: "SAS/2016" },
  { label: "The Last Shot Jazz", wins: 64, bbT: "UTA/1997" },
  { label: "Bad Boy Pistons", wins: 63, bbT: "DET/1989" },
  { label: "Beautiful Game Spurs", wins: 62, bbT: "SAS/2014" }
];
function compEntryHref(entry, camp) {
  if (entry.bbT) return bbrefTag("https://www.basketball-reference.com/teams/" + entry.bbT + ".html", camp);
  if (entry.bbP) return bbrefTag("https://www.basketball-reference.com/players/" + entry.bbP.charAt(0) + "/" + entry.bbP + ".html", camp);
  return null;
}

function climbHtml(e, winsOverride) {
  // Same-win teams share one pin and one combined tag ("Redeem Team · Prime
  // Wilt Core 80") instead of stacking on top of each other.
  var legends = (function () {
    var out = [], byW = {};
    HISTORY_COMPS.forEach(function (L) {
      if (byW[L.wins]) { byW[L.wins].parts.push(L); byW[L.wins].label += " \u00B7 " + L.label; return; }
      var t = { label: L.label, wins: L.wins, parts: [L] };
      byW[L.wins] = t; out.push(t);
    });
    return out;
  })();
  // v34: each label segment is its own outbound anchor (campaign "climb") —
  // merged tags like "Redeem Team \u00B7 Prime Wilt Core" get two doors, not one.
  function tagLabelHtml(t) {
    return t.parts.map(function (L) {
      var h = compEntryHref(L, "climb");
      return h ? '<a class="cl-link" href="' + h + '" target="_blank" rel="noopener">' + esc(L.label) + "</a>" : esc(L.label);
    }).join(" \u00B7 ");
  }
  var G82 = CFG.GAMES_IN_SEASON;
  var FLOOR = 62, TOP = G82, TEAM_TOP = 73;     // 73 = highest real team ('16 Warriors)
  var LADDER_TOP = legends.reduce(function (m, L) { return Math.max(m, L.wins); }, TEAM_TOP);  // top pin sets the scale
  var youWins = (typeof winsOverride === "number") ? winsOverride
    : CFG.GAMES_IN_SEASON * T82.phi(null, e.net / T82.t.SC.NET_SD);   // v42: the pin rides NET (continuous quality wins); Hot Hand override still honored
  var below = youWins < FLOOR;

  // Layout in pixels so per-win spacing in the cluster stays fixed (~18px/win) no matter how
  // many pins there are; the track height ADAPTS. A below-floor five needs a little room under
  // the Spurs for its marker, an on-board five ends flush at the Spurs. The empty
  // LADDER_TOP->82 span compresses into the top band. RX must equal --rail-x.
  var PX_PER_WIN = 200 / 11;                    // the original 62->73 cluster spacing
  var BAND_PX = 15, CLUSTER_PX = Math.round((LADDER_TOP - FLOOR) * PX_PER_WIN), FLOOR_PX = BAND_PX + CLUSTER_PX;
  var BOTTOM_PX = below ? 50 : 14, TRACK_PX = FLOOR_PX + BOTTOM_PX;
  var Y_SUMMIT = 0, RX = 56;
  var Y_TEAMTOP = BAND_PX / TRACK_PX * 100, Y_FLOOR = FLOOR_PX / TRACK_PX * 100;
  function yPct(w) {
    if (w <= LADDER_TOP) return Y_TEAMTOP + (LADDER_TOP - w) / (LADDER_TOP - FLOOR) * (Y_FLOOR - Y_TEAMTOP);
    return (TOP - w) / (TOP - LADDER_TOP) * Y_TEAMTOP;   // compressed band (LADDER_TOP..82)
  }

  var youY = below ? 0 : Math.max(0, Math.min(Y_FLOOR, yPct(youWins)));

  // Rank + nearest comp BY WIN TOTAL. No emphasis when below the floor or when the five
  // already tops the board (nobody to compare against).
  var rank = legends.filter(function (L) { return L.wins > youWins; }).length + 1;
  var total = legends.length + 1;
  var compIdx = -1;
  if (!below && rank !== 1) {
    var best = Infinity;
    legends.forEach(function (L, i) { var dd = Math.abs(L.wins - youWins); if (dd < best) { best = dd; compIdx = i; } });
  }
  var comp = compIdx >= 0 ? legends[compIdx] : null;

  var pins = legends.map(function (L, i) {
    var y = yPct(L.wins).toFixed(2);
    var isC = i === compIdx;
    var rec = L.wins + "\u2013" + (G82 - L.wins);
    return '<span class="climb-pin' + (isC ? " comp" : "") + '" style="top:' + y + '%" title="' + esc(L.label) + " " + rec + '"></span>' +
      '<span class="climb-tag' + (isC ? " comp" : "") + '" style="top:' + y + '%">' + tagLabelHtml(L) + "</span>";
  }).join("");

  // Plain straight rail, summit to floor, amber fill from the dot down to the floor. The
  // 62->73 cluster and compressed 73->82 band still set the scale; no axis-break marker.
  var railD = "M" + RX + "," + Y_SUMMIT + "L" + RX + "," + Y_FLOOR;
  var fillSvg = "";
  if (!below && youY < Y_FLOOR) {
    fillSvg = '<path class="fill-path" d="M' + RX + "," + youY.toFixed(2) + "L" + RX + "," + Y_FLOOR + '"/>';
  }
  var railSvg = '<svg class="climb-svg" viewBox="0 0 100 100" preserveAspectRatio="none">' +
    '<path class="rail-path" d="' + railD + '"/>' + fillSvg + "</svg>";

  var youMarker;
  if (below) {
    youMarker = '<div class="climb-you below" style="top:' + ((FLOOR_PX + 22) / TRACK_PX * 100).toFixed(2) + '%">' +
        '<span class="cy-arrow">\u25BC</span>' +
        '<span class="cy-label">YOUR FIVE</span>' +
      "</div>";
  } else {
    youMarker = '<div class="climb-you" style="top:' + youY.toFixed(2) + '%">' +
        '<span class="cy-dot"></span>' +
        '<span class="cy-label">YOUR FIVE</span>' +
      "</div>";
  }

  return '<div class="climb"><div class="goat-fw" id="goatFw" aria-hidden="true"></div>' +
    '<div class="climb-track" style="height:' + TRACK_PX + 'px">' +
      railSvg +
      pins +
      '<div class="climb-summit-cap" id="climbSummit">82\u20130</div>' +
      youMarker +
    "</div></div>";
}

/* ---------- 82-0 goat fireworks ---------- */

function reducedMotion() {
  return false;   // see prefersReduce() — OS reduced-motion flag is deliberately ignored
}
var FW_EMOJI = ["\uD83D\uDC10", "\uD83C\uDFC0", "\uD83C\uDFC6"];   // goat, basketball, trophy
function goatBurst(box, cx, cy, emojis, o) {
  emojis = emojis || FW_EMOJI; o = o || {};
  var count = o.count || 20, cone = o.cone || 1.9, life = o.life || 1700;
  for (var i = 0; i < count; i++) {
    var g = document.createElement("span");
    g.className = "goat-particle";
    g.textContent = emojis[(Math.random() * emojis.length) | 0];
    var ang = o.up ? (-Math.PI / 2 + (Math.random() - 0.5) * cone)   // upward fan (cone width) vs all directions
                   : (Math.random() * Math.PI * 2),
        dist = (o.distMin || 60) + Math.random() * (o.distSpan || 130);
    g.style.left = cx + "px";
    g.style.top = cy + "px";
    g.style.fontSize = (15 + Math.random() * 16).toFixed(0) + "px";
    g.style.setProperty("--dx", (Math.cos(ang) * dist).toFixed(0) + "px");
    g.style.setProperty("--dy", (Math.sin(ang) * dist).toFixed(0) + "px");
    g.style.setProperty("--rot", (Math.random() * 120 - 60).toFixed(0) + "deg");
    g.style.animationDelay = (Math.random() * (o.stagger || 0.07)).toFixed(3) + "s";
    if (o.dur) g.style.animationDuration = o.dur + "s";       // longer = rises higher and lingers before fading
    box.appendChild(g);
    (function (node) { setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, life); })(g);
  }
}
function fireGoats(box) {
  var w = box.clientWidth || 300, h = box.clientHeight || 280;
  for (var b = 0; b < 9; b++) {
    (function (k) {
      setTimeout(function () {
        goatBurst(box, w * (0.2 + Math.random() * 0.6), h * (0.18 + Math.random() * 0.58));
      }, k * 180);
    })(b);
  }
}
// Perfect-record (82-0) emoji explosion inside the results W/L box - the same burst Kaman uses.
function fireWL() { var b = el("wlFw"); if (b && !reducedMotion()) fireGoats(b); }

var MONEY_EMOJI = ["\uD83D\uDCB5"];   // 💵
var DOWN_EMOJI  = ["\u2B07\uFE0F"];   // ⬇️ fire-sale price drop
var FIRE_EMOJI  = ["\uD83D\uDD25"];   // 🔥
// One-shot single-burst spray (the 82-0 particle, a single pop) anchored at a screen point.
function emojiSpray(emojis, x, y, o) {
  if (reducedMotion()) return;
  var layer = document.createElement("div");
  layer.className = "spray-layer";
  document.body.appendChild(layer);
  goatBurst(layer, x, y, emojis, o);
  setTimeout(function () { if (layer.parentNode) layer.parentNode.removeChild(layer); }, (o && o.life ? o.life + 250 : 1900));
}
// Spray from the center of an element (viewport coords).
function sprayFromEl(elm, emojis, o) {
  if (!elm) return;
  var r = elm.getBoundingClientRect();
  emojiSpray(emojis, r.left + r.width / 2, r.top + r.height / 2, o);
}
// SUPERNOVA: five volcano plumes across the screen (center + two each side) from the label's height.
function supernovaErupt(label) {
  if (!label || reducedMotion()) return;
  var lr = label.getBoundingClientRect(), y = lr.top + lr.height / 2, W = window.innerWidth;
  var layer = document.createElement("div");
  layer.className = "spray-layer";
  document.body.appendChild(layer);
  var opts = { up: true, count: 30, cone: 0.6, distMin: 150, distSpan: 240, dur: 2.2, stagger: 0.3, life: 2600 };
  [0.1, 0.3, 0.5, 0.7, 0.9].forEach(function (fx) { goatBurst(layer, W * fx, y, FIRE_EMOJI, opts); });
  setTimeout(function () { if (layer.parentNode) layer.parentNode.removeChild(layer); }, 2850);
}
function setupGoatFireworks(autoArm) {
  var box = el("goatFw");
  if (!box) return;
  // Real 82-0: burst automatically when the graph scrolls into view.
  if (autoArm && !reducedMotion() && typeof IntersectionObserver !== "undefined") {
    var last = 0;
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting && Date.now() - last > 1600) { last = Date.now(); fireGoats(box); }
      }
    }, { threshold: 0.3 });
    io.observe(box);
  }
  // Test hook: tap the "82-0" summit cap five times in quick succession to fire it on any result.
  var cap = el("climbSummit");
  if (cap) {
    var taps = 0, t0 = 0;
    cap.addEventListener("click", function () {
      var now = Date.now();
      if (now - t0 > 2000) taps = 0;     // reset the streak if the taps slow down
      t0 = now;
      if (++taps >= 5) { taps = 0; fireGoats(box); }
    });
  }
}

/* ---------- Presti "Hot Hand": one luck-equalizing shot at 82-0 ----------
   A near-perfect roster gets a controlled, ~40-50% chance to flip to 82-0: one
   starter "catches fire" (value x M), net is recomputed (taxes don't move), and a
   cross of the 82-0 line fires the existing goat fireworks. Visual-first so it lands
   fully with sound off; buzz() is the only sugar layer (Android; silent on iOS). */


// Net at which the season flips to 82-0 (smallest net where ceil(82*phi(net/NET_SD)) hits 82).


// Weighted-random starter, biased hard toward value (your star tends to erupt; a
// near-certain whiff on the weakest pick stays rare).




// The overlay now fires on every drafted Presti result under 82-0, but only the
// exact-81 result gets the real Heat Check (spin + possible boost). Everything
// else gets the same lever pull as a "reveal my results" gate, then dismisses.


// QA hook: add ?clutch=1 to the URL to force the 81-win Heat Check sequence on any
// Presti result, so the clutch path can be tested without drafting an exact-81 team.
var FORCE_CLUTCH = !!(typeof location !== "undefined" && location.search && /[?&]clutch=1(&|$)/.test(location.search));
// QA hook: ?midhot=1 waives the +20 net gate so the mid-season Heat Check can
// be tested on any standalone Presti draft that realizes at least one loss.
var FORCE_MIDHOT = !!(typeof location !== "undefined" && location.search && /[?&]midhot=1(&|$)/.test(location.search));
// v47.15 MID-SEASON HEAT CHECK: "Hot or better" is the HOT segment's index in the
// engine's ladder (COLD 0, WARM 1, HOT 2, ON FIRE 3, SUPERNOVA 4). Resolved by
// label so an engine reorder can never silently move the bar.
var HH_MID_MIN_SEG = (function () {
  for (var i = 0; i < HH_SEGMENTS.length; i++) if (/hot/i.test(String(HH_SEGMENTS[i].label))) return i;
  return 2;
})();

function hotHand(e) {
  var clutch = FORCE_CLUTCH || e.winTally === CFG.GAMES_IN_SEASON - 1;   // exactly 81 wins
  var hotIdx = 0, segIdx = 0, seg = HH_SEGMENTS[0], hotV = 0, newNet = e.net, win = false;
  if (clutch) {
    hotIdx = hhPickHot(); segIdx = hhSpinSeg(); seg = HH_SEGMENTS[segIdx];
    hotV = valueOf(G.picks[hotIdx].row);
    var THRESH = hhNet82();
    newNet = e.net + (seg.m - 1) * hotV * HH_BONUS_SCALE;
    win = newNet > THRESH;
  }
  var names = G.picks.map(function (p) { return shareSurname(p.row[IDX.name]); });
  var ITEM = 54, COPIES = 6, targetFlat = (COPIES - 2) * names.length + hotIdx;

  var stripHtml = "", c, n, s;
  for (c = 0; c < COPIES; c++) for (n = 0; n < names.length; n++) stripHtml += '<div class="hh-name">' + esc(names[n]) + "</div>";
  var segHtml = "";
  for (s = 0; s < HH_SEGMENTS.length; s++) segHtml += '<div class="hh-seg lvl' + HH_SEGMENTS[s].lvl + '"></div>';

  var titleHtml = clutch
    ? '<div class="hh-eyebrow hh-clutch">You\u2019re 81\u20130 and down entering the 4th quarter. Clutch heroics to go undefeated?</div>'
    : '<div class="hh-eyebrow">See Your Results</div>';
  var stageHtml = clutch
    ? '<div class="hh-stage">' +
        '<div class="hh-step" id="hhStep1">' +
          '<div class="hh-window"><div class="hh-strip" id="hhStrip">' + stripHtml + '</div><span class="hh-payline"></span></div></div>' +
        '<div class="hh-step" id="hhStep2">' +
          '<div class="hh-heat">' + segHtml + '</div><div class="hh-heatlabel" id="hhHeatLabel">\u00B7</div></div>' +
        '<div class="hh-step" id="hhStep3">' +
          '<div class="hh-net" id="hhNet">' + signed1(e.net) + '</div>' +
          '<div class="hh-netcap">NET RATING</div>' +
          '<div class="hh-bar"><span class="hh-fill" id="hhFill"></span><span class="hh-fill-bonus" id="hhFillBonus"></span><span class="hh-thresh"></span></div></div>' +
        '<div class="hh-verdict" id="hhVerdict"></div>' +
        '<div class="hh-actions" id="hhActions">' +
          '<button class="hh-btn presti-spin" id="hhSee">SEE YOUR TEAM</button>' +
          (dyRun() ? '' : '<button class="hh-btn presti-spin" id="hhAgain">RUN IT BACK</button>') +
          '<a class="hh-btn hh-bref" id="hhBref" data-bb="' + esc(G.picks[hotIdx].row[IDX.name]) + '" data-bb-gl="' + G.picks[hotIdx].row[IDX.season] + '" data-camp="hothand" href="' + bbrefSearch(G.picks[hotIdx].row[IDX.name], "hothand") + '" target="_blank" rel="noopener">HIS REAL HEATERS \u2197</a>' +
        '</div>' +
      '</div>'
    : '';

  var ov = document.createElement("div");
  ov.className = "hh-overlay in" + (clutch ? "" : " hh-reveal");   // start opaque (no fade-in); "in" also = full opacity. non-81 gets opaque backdrop
  ov.innerHTML =
    '<button class="hh-skip" id="hhSkip">skip \u2192</button>' +
    '<div class="hh-card"><div class="goat-fw" id="hhFw" aria-hidden="true"></div>' +
      titleHtml +
      ballLeverHtml("hhLever", "hhArm", "Pull the basketball through the hoop") +
      (clutch ? '<button class="hh-charity" id="hhCharity">I DON\u2019T WANT YOUR CHARITY</button>' : '') +
      stageHtml + '</div>';
  document.body.appendChild(ov);
  if (clutch) {
    var fillEl = ov.querySelector("#hhFill"), bonusEl = ov.querySelector("#hhFillBonus");
    var baseFrac = Math.min(1, e.winTally / CFG.GAMES_IN_SEASON);   // wins you earned BEFORE the Hot Hand (gold, fixed)
    fillEl.style.transform = "scaleX(" + baseFrac.toFixed(4) + ")";
    bonusEl.style.left = (baseFrac * 100).toFixed(2) + "%";         // the bonus grows out from the base mark (red, glowing)
    bonusEl.style.width = "0%";
  }
  if (clutch) analyticsTrack("heatcheck_shown", Object.assign(analyticsRunSnapshot(), {
    surface: "heat_check", action: "offer", wins: e.winTally, net: e.net
  }));

  function dismiss() {
    if (!G.recapPayload) prepareRecap(e, e.winTally, e.net, null);   // ceremony skipped before verdict -> stage the payload so the bundle can pop (no model call yet)
    if (ov.parentNode) ov.parentNode.removeChild(ov);
    setTimeout(maybeShowRecap, 700);
  }
  function segs() { return ov.querySelectorAll(".hh-seg"); }

  function verdict() {
    analyticsTrack("heatcheck_result", Object.assign(analyticsRunSnapshot(), {
      surface: "heat_check", action: "spin_result", segment: seg.label,
      outcome: win ? "hit_82" : "miss", hit_82: win ? 1 : 0,
      wins: segIdx > 0 ? hhWins(newNet) : e.winTally,
      net: segIdx > 0 ? newNet : e.net
    }));
    // Final record is now known (any non-COLD segment moves it): stage the Tribune.
    prepareRecap(e,
      segIdx > 0 ? hhWins(newNet) : e.winTally,
      segIdx > 0 ? newNet : e.net,
      segIdx > 0 ? { player: shareSurname(G.picks[hotIdx].row[IDX.name]), tier: seg.label } : null);
    if (segIdx > 0) {                                            // COLD = nobody caught fire: no flame, no highlight, no boost
      G.hotIdx = hotIdx;
      G.hotLvl = seg.lvl;                                        // tier reached (WARM 1 ... SUPERNOVA 4) -> picks the share emoji
      G.hotValue = hotV * (1 + (seg.m - 1) * HH_BONUS_SCALE);    // the hot player's post-boost value
      G.hotBase = e.net; G.hotNewNet = newNet; G.hotWins = hhWins(newNet);   // post-boost totals (drive record/net/share)
      // THE DAILY: a boost that lands after the results render amends the SAME
      // run's official record (nonce-matched; a practice run can never steal
      // official) and refreshes the on-screen grade so the screenshot is honest.
      if (G.social && window.T82DAILY && G.social.nonce) {
        T82DAILY.recordOfficial(G.social.key, G.social.num, dailyResFromG(e), G.social.nonce);
        var dvEl = document.getElementById("dailyVerdict");
        if (dvEl) dvEl.textContent = T82DAILY.verdict(G.hotWins);
      }
      var card = document.querySelector('.pick-card[data-pick="' + hotIdx + '"]');
      if (card) {
        card.classList.add("hot-pick");
        var pv = card.querySelector(".pr-v");
        if (pv) pv.innerHTML = "<small>V</small>" + hotV.toFixed(2) + ' <span class="hot-bonus">+ ' + (G.hotValue - hotV).toFixed(2) + "</span>";
      }
      var rec = document.querySelector(".big");                  // updated W/L record (the win rate)
      if (rec) rec.textContent = G.hotWins + "\u2013" + (CFG.GAMES_IN_SEASON - G.hotWins);
      setEliteResultGlow(G.hotWins);
      var lbl = document.querySelector(".big-label");            // net rating = [base, gold] + [bonus, hot-hand red]
      if (lbl) lbl.innerHTML = 'net rating <span class="net-base">' + signed1(e.net) +
        '</span> <span class="net-bonus">+ ' + (newNet - e.net).toFixed(1) + "</span>";
      if (G.hotWins > e.winTally) {                              // boost moved the win total -> re-plot the GOAT Climb
        var cl = document.querySelector(".climb");
        if (cl) { cl.outerHTML = climbHtml(e, G.hotWins); setupGoatFireworks(G.hotWins >= CFG.GAMES_IN_SEASON); }
      }
      var ledgerEl = document.querySelector(".ledger");         // fold the Hot Hand bonus into the Scoring Card as the last step before net
      var totalRow = ledgerEl && ledgerEl.querySelector(".ledger-row.total");
      if (totalRow) {
        var bonusRow = document.createElement("div");
        bonusRow.className = "ledger-row";
        bonusRow.innerHTML = '<span>Hot Hand bonus<span class="why">' + seg.label + " \u2014 " +
          esc(shareSurname(G.picks[hotIdx].row[IDX.name])) + " caught fire (value \u00D7" + seg.m + ").</span></span>" +
          '<span class="ledger-amt hot">+' + fmt1(newNet - e.net) + "</span>";
        totalRow.parentNode.insertBefore(bonusRow, totalRow);
        var amtEl = totalRow.querySelector(".ledger-amt");
        if (amtEl) amtEl.textContent = signed1(newNet);
        var whyEl = totalRow.querySelector(".why");
        if (whyEl) whyEl.textContent = "Score " + fmt1(e.score) + " + Hot Hand " + fmt1(newNet - e.net) + " minus baseline " + fmt1(BASELINE) + ".";
      }
    }
    var v = ov.querySelector("#hhVerdict");
    var finalW = segIdx > 0 ? G.hotWins : e.winTally;   // wins are now the static reveal (ticker showed net rating)
    var netHtml = '<div class="hh-stamp' + (win ? '' : ' miss') + '">' + finalW + "\u2013" + (CFG.GAMES_IN_SEASON - finalW) + '</div><div class="hh-netcap">FINAL RECORD</div>';
    if (win) {
      ov.classList.add("won");
      v.innerHTML = netHtml;
      buzz(45);
      var fw = ov.querySelector("#hhFw"); if (fw && !reducedMotion()) fireGoats(fw);
    } else {
      ov.classList.add("missed");
      v.innerHTML = netHtml;
      buzz(10);
    }
    v.classList.add("on");
    ov.querySelector("#hhActions").classList.add("on");
  }

  // wins implied by a net rating - matches the engine's win formula exactly
  function hhWins(net) { return Math.min(CFG.GAMES_IN_SEASON, Math.ceil(CFG.GAMES_IN_SEASON * phi(net / SC.NET_SD))); }

  function climb() {
    ov.querySelector("#hhStep3").classList.add("on");
    var numEl = ov.querySelector("#hhNet"), start = e.net, dur = 1650, t0 = performance.now();
    (function frame(now) {
      if (!ov.parentNode) return;
      var t = Math.min(1, (now - t0) / dur), k = 1 - Math.pow(1 - t, 4.5);   // hard ease-out = crawl/stall near the line
      var val = start + (newNet - start) * k;                                 // net rating is what climbs on-screen now
      var w = hhWins(val);                                                    // wins tracked under the hood for the bar + verdict
      numEl.textContent = signed1(val);                                       // show NET RATING ticking; final record is revealed static at verdict
      var bonusFrac = Math.max(0, w / CFG.GAMES_IN_SEASON - baseFrac);        // bar still fills toward 82-0 in red
      bonusEl.style.width = (bonusFrac * 100).toFixed(2) + "%";
      if (w >= CFG.GAMES_IN_SEASON) numEl.classList.add("over");
      if (t < 1) requestAnimationFrame(frame); else verdict();
    })(t0);
  }

  function heat() {
    ov.querySelector("#hhStep2").classList.add("on");
    var cs = segs(), N = cs.length, label = ov.querySelector("#hhHeatLabel"), order = [], i, l;
    var laps = 4;                                                 // longer base spin (chaotic-test length)
    for (l = 0; l < laps; l++) for (i = 0; i < N; i++) order.push(i);
    for (i = 0; i <= segIdx; i++) order.push(i);                   // sweep up to the target

    var base = order.length;   // the smooth decel above ends exactly on segIdx

    // Ending pattern - every transition is to an ADJACENT slot (a wheel never teleports):
    //   65% clean stop - the decel just lands on the result
    //   20% back-tick  - overshoot one notch, then tick back onto the result
    //   15% burst      - it slows, then a quick lap re-accelerates and catches the result
    var roll = Math.random(), burst = false;
    if (roll < 0.65) {
      /* clean stop: nothing appended */
    } else if (roll < 0.85) {
      if (segIdx < N - 1) { order.push(segIdx + 1); order.push(segIdx); }   // overshoot up one, tick back
      else { order.push(segIdx - 1); order.push(segIdx); }                  // top slot: dip down one, tick back
    } else {
      burst = true;
      for (i = 1; i <= N; i++) order.push((segIdx + i) % N);                // one quick lap around, back onto segIdx
    }
    order[order.length - 1] = segIdx;                                       // the final rest is always the real result

    // gaps: smooth deceleration through the base sweep, then either drawn-out "settle"
    // ticks (clean / back-tick) or a re-accelerating burst that catches on the lock.
    var gaps = [], t = 38, last = order.length - 1;
    for (i = 0; i < order.length; i++) {
      if (i < base) { gaps.push(t * 1.5); t *= 1.085; }
      else if (burst) gaps.push((i === last - 1 ? 300 : 72 - (i - base) * 10) * 1.5);   // speed up (72,62,52..) then catch
      else gaps.push((250 + (i % 2) * 70 + Math.random() * 110) * 1.5);                 // uneven settle ticks
    }

    var acc = 0;
    order.forEach(function (ci, j) {
      setTimeout(function () {
        if (!ov.parentNode) return;
        for (var z = 0; z < N; z++) cs[z].classList.remove("lit");
        cs[ci].classList.add("lit");
        label.textContent = HH_SEGMENTS[ci].label;
        label.className = "hh-heatlabel lvl" + HH_SEGMENTS[ci].lvl;
        var fast = j < base || (burst && j < last - 1);
        label.style.transform = "scale(" + (fast ? 1.18 : 1) + ")";   // dice-block "grows when fast," shrinks into the lock
        buzz(j < base ? 5 : (fast ? 6 : 11));                         // light during the fast burst, chunky on settle ticks
        if (j === order.length - 1) {
          for (var f = 0; f <= segIdx; f++) cs[f].classList.add("fill");
          cs[segIdx].classList.add("result");
          buzz(segIdx === 4 ? 40 : 18);
          if (segIdx === 4) supernovaErupt(label);   // SUPERNOVA -> five volcano plumes across the screen
          else if (segIdx === 3) sprayFromEl(label, FIRE_EMOJI);   // ON FIRE -> simple radial flame burst (money-style)
          setTimeout(climb, 560);
        }
      }, acc);
      acc += gaps[j];
    });
  }

  function reel() {
    ov.querySelector("#hhStep1").classList.add("on");
    var strip = ov.querySelector("#hhStrip"), endY = -((targetFlat - 1) * ITEM);
    function land() {
      if (!ov.parentNode) return;
      var rows = strip.querySelectorAll(".hh-name");
      if (rows[targetFlat]) rows[targetFlat].classList.add("hot");
      buzz(18);
      setTimeout(heat, 470);
    }
    function glide(to, dur, ease) { strip.style.transition = "transform " + dur + "s " + ease; strip.style.transform = "translateY(" + to + "px)"; }
    var variant = Math.floor(Math.random() * 3);   // 0 normal, 1 overshoot-back, 2 stall-creep (all ~50% longer)
    if (variant === 1) {
      // Mario Party: blow past your guy by one name, hang, then tick BACK onto him
      requestAnimationFrame(function () { glide(endY - ITEM, 2.3, "cubic-bezier(.1,.72,.18,1)"); });
      setTimeout(function () { if (ov.parentNode) { glide(endY, 0.52, "cubic-bezier(.34,0,.3,1)"); buzz(8); } }, 2360);
      setTimeout(land, 2900);
    } else if (variant === 2) {
      // Mario Party: stall one name SHORT, hang on it, then creep forward onto him
      requestAnimationFrame(function () { glide(endY + ITEM, 2.2, "cubic-bezier(.08,.8,.1,1)"); });
      setTimeout(function () { if (ov.parentNode) { glide(endY, 0.66, "cubic-bezier(.5,0,.5,1)"); buzz(9); } }, 2620);
      setTimeout(land, 3300);
    } else {
      // normal: one long smooth deceleration with a soft settle
      requestAnimationFrame(function () { glide(endY, 2.6, "cubic-bezier(.12,.66,.18,1)"); });
      setTimeout(land, 2640);
    }
  }

  function run() { reel(); }   // animations are always on (see prefersReduce)

  // Pull the basketball down through the hoop (drag = embodied agency) or tap/Enter
  // (auto-dunk). Mechanic lives in wireBallPull (shared with THE DAILY gate);
  // this callback is the ceremony's own staging, verbatim.
  var lever = ov.querySelector("#hhLever"), arm = ov.querySelector("#hhArm");
  var pullState = wireBallPull(lever, arm, function () {
    if (clutch) analyticsTrack("heatcheck_action", Object.assign(analyticsRunSnapshot(), {
      surface: "heat_check", action: "pull", pulled: 1
    }));
    var chBtn = ov.querySelector("#hhCharity");
    if (chBtn) chBtn.classList.add("gone");                                  // the pull committed; the spin owns the outcome
    setTimeout(function () {
      if (!clutch) {                                                       // <=80 wins: the pull just reveals the results
        ov.classList.remove("in");                                         // fade the overlay away...
        setTimeout(dismiss, 470);                                          // ...then remove it (results are underneath)
        return;
      }
      ov.classList.add("lit"); run();                                      // exactly 81: the real Heat Check
    }, 640);
  });

  var charityBtn = ov.querySelector("#hhCharity");
  if (charityBtn) charityBtn.addEventListener("click", function () {
    if (pullState.fired()) return;                                           // spin already running; too late to refuse
    analyticsTrack("heatcheck_declined", Object.assign(analyticsRunSnapshot(), {
      surface: "heat_check", action: "decline"
    }));
    if (window.T82 && T82.declineHeat) T82.declineHeat(G);                   // "hx" — the refusal replays and verifies
    dismiss();
  });
  ov.querySelector("#hhSkip").addEventListener("click", function () {
    if (clutch && !pullState.fired()) {
      analyticsTrack("heatcheck_action", Object.assign(analyticsRunSnapshot(), {
        surface: "heat_check", action: "skip", pulled: 0
      }));
      if (window.T82 && T82.declineHeat) T82.declineHeat(G);                 // v37: silent skip at 81 was ALREADY a decline; now the contract knows it
    }
    dismiss();
  });
  var seeBtn = ov.querySelector("#hhSee");
  if (seeBtn) seeBtn.addEventListener("click", function () {
    dismiss();
    if (G.hotWins >= CFG.GAMES_IN_SEASON) fireWL();   // perfect record revealed -> emoji explosion in the W/L box
  });
  var againBtn = ov.querySelector("#hhAgain");
  if (againBtn) againBtn.addEventListener("click", function () {
    analyticsTrack("replay", Object.assign(analyticsRunSnapshot(), {
      surface: "heat_check", action: "run_it_back"
    }));
    dismiss(); newGame();
  });
}

/* ---------- the ball pull (shared mechanic) ----------
   Drag the basketball down through the hoop until it ignites; tap/Enter
   auto-dunks. ONE implementation drives both the Heat Check ceremony and THE
   DAILY gate so the feel can never drift between them. TRAVEL/RELEASE/ignite
   thresholds are the ceremony's original numbers, untouched. onFire runs once,
   right after ignition; any staging delay belongs to the caller. */
function wireBallPull(lever, arm, onFire) {
  var TRAVEL = 150, RELEASE_AT = 0.97, dragging = false, startY = 0, pull = 0, fired = false;
  function setPull(p) {
    pull = p < 0 ? 0 : p > 1 ? 1 : p;
    arm.style.transform = "translateY(" + (pull * TRAVEL).toFixed(1) + "px)";
    if (pull >= 0.9) lever.classList.add("ignited"); else if (!fired) lever.classList.remove("ignited");
  }
  function fire() {
    if (fired) return; fired = true;
    lever.classList.add("pulling");
    arm.style.transition = "transform .28s cubic-bezier(.4,0,.7,1)";       // dunk it the rest of the way down
    setPull(1); lever.classList.add("ignited"); buzz(34);                  // through the net, catches fire
    onFire();
  }
  lever.addEventListener("pointerdown", function (ev) {
    if (fired) return;
    dragging = true; startY = ev.clientY; arm.style.transition = "none"; lever.classList.add("pulling"); buzz(8);
    if (lever.setPointerCapture) try { lever.setPointerCapture(ev.pointerId); } catch (e2) {}
  });
  lever.addEventListener("pointermove", function (ev) {
    if (!dragging || fired) return;
    setPull((ev.clientY - startY) / TRAVEL);
    if (pull >= RELEASE_AT) { dragging = false; fire(); }   // reached the bottom -> auto-release, no cursor-up needed (desktop fix)
  });
  lever.addEventListener("pointerup", function () { if (dragging && !fired) { dragging = false; fire(); } });
  lever.addEventListener("pointercancel", function () { if (dragging && !fired) { dragging = false; lever.classList.remove("pulling", "ignited"); arm.style.transition = "transform .3s ease"; setPull(0); } });
  lever.addEventListener("keydown", function (ev) { if ((ev.key === "Enter" || ev.key === " ") && !fired) { ev.preventDefault(); fire(); } });
  return { fired: function () { return fired; } };
}
// The lever's art, one source: basketball (behind), rim + net (in front),
// flames (hidden until ignition), and the bouncing PULL DOWN hint.
function ballLeverHtml(leverId, armId, ariaLabel) {
  return '<div class="hh-lever" id="' + leverId + '" role="button" tabindex="0" aria-label="' + esc(ariaLabel) + '">' +
    '<span class="hh-fire" aria-hidden="true"><i></i><i></i><i></i></span>' +
    '<span class="hh-ball" id="' + armId + '">' +
      '<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">' +
        '<defs><radialGradient id="hhBg" cx="38%" cy="30%" r="78%">' +
          '<stop offset="0%" stop-color="#ffcb84"/><stop offset="48%" stop-color="#e8802a"/><stop offset="100%" stop-color="#a64e10"/>' +
        '</radialGradient></defs>' +
        '<circle cx="24" cy="24" r="22" fill="url(#hhBg)" stroke="#6e3208" stroke-width="1"/>' +
        '<path d="M2 24H46M24 2V46M8 7Q24 24 8 41M40 7Q24 24 40 41" fill="none" stroke="#6e3208" stroke-width="1.5" stroke-linecap="round"/>' +
      '</svg>' +
    '</span>' +
    '<span class="hh-hoop" aria-hidden="true">' +
      '<svg viewBox="0 0 96 76" width="96" height="76">' +
        '<g fill="none" stroke="#e6e0d2" stroke-width="1" opacity="0.8">' +
          '<path d="M16 20 L36 62"/><path d="M32 20 L42 62"/><path d="M48 20 L48 62"/><path d="M64 20 L54 62"/><path d="M80 20 L60 62"/>' +
          '<path d="M24 36 Q48 40 72 36"/><path d="M31 50 Q48 54 65 50"/>' +
        '</g>' +
        '<ellipse cx="48" cy="16" rx="35" ry="9" fill="none" stroke="#e0531a" stroke-width="4"/>' +
      '</svg>' +
    '</span>' +
    '<span class="hh-lever-hint">PULL DOWN<b>\u2193</b></span>' +
  '</div>';
}

function picksInSlotOrder() {
  return G.picks.map(function (p, i) { return { p: p, i: i }; }).sort(function (a, b) { return BUCKETS.indexOf(a.p.slot) - BUCKETS.indexOf(b.p.slot); });
}

function shareModeLabel() { return MODE === "kaman" ? "Kaman Mode" : MODE === "pro" ? "Pro" : MODE === "cap" ? "Presti" : "Classic"; }
function shareSurname(nm) {
  var parts = String(nm).trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  var rest = parts.slice(1);
  while (rest.length > 1 && /^(jr\.?|sr\.?|ii|iii|iv|v)$/i.test(rest[rest.length - 1])) rest.pop();
  return parts[0].charAt(0) + ". " + rest.join(" ");
}

// Five-character root URLs keep the newspaper link as short as the domain allows:
// true82.net/A7k_Q. The first character is uppercase or numeric so _routes.json can
// invoke only these dynamic root paths without putting ordinary static assets through
// a Function. Publication begins as soon as a signed AI edition settles, allowing the
// client to retry the extraordinarily rare five-character collision before SHARE is tapped.
var RECAP_ID_FIRST = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
var RECAP_ID_REST = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function mintRecapSlug() {
  var out = "";
  try {
    var a = new Uint8Array(5);
    crypto.getRandomValues(a);
    out = RECAP_ID_FIRST.charAt(a[0] % RECAP_ID_FIRST.length);
    for (var i = 1; i < a.length; i++) out += RECAP_ID_REST.charAt(a[i] % RECAP_ID_REST.length);
  } catch (e) {
    out = RECAP_ID_FIRST.charAt(Math.floor(Math.random() * RECAP_ID_FIRST.length));
    while (out.length < 5) out += RECAP_ID_REST.charAt(Math.floor(Math.random() * RECAP_ID_REST.length));
  }
  return out.slice(0, 5);
}
function recapShareHost() {
  try {
    var host = String(location.hostname || "").toLowerCase();
    if (host === "true82.net" || host === "www.true82.net") return "true82.net";
    return String(location.origin || "https://true82.net").replace(/^https?:\/\//, "").replace(/\/$/, "");
  } catch (e) { return "true82.net"; }
}
function sharePublishMessage(detail) {
  var reason = String(detail && detail.reason || "");
  if (reason === "migration_0005_required") return "Article storage needs migration 0005.";
  if (reason === "db_unavailable") return "The D1 DB binding is missing in this environment.";
  if (reason === "signing_unavailable") return "RECAP_SIGN_KEY is missing in this environment.";
  if (reason === "bad_signature") return "The article signature could not be verified.";
  if (reason === "bad_payload" || reason === "bad_mode") return "The article payload was rejected.";
  if (reason === "route_not_deployed" || Number(detail && detail.httpStatus) === 404) return "The five-character article route is not deployed here.";
  if (reason === "network") return "The article publish request could not reach Cloudflare.";
  if (reason === "db_error") return "D1 rejected the article write.";
  if (reason) return "Article link failed: " + reason + ".";
  return "Article link could not be prepared.";
}
function publishRecap() {
  if (!G || !G.recapSig || !G.recapPayload) {
    var pre = { reason: "missing_signature_or_payload" };
    if (G) G.recapPublishError = pre;
    recapDebugEvent("share_publish_blocked", pre);
    analyticsTrack("recap_publish", { mode: MODE, surface: "newspaper", action: "blocked", outcome: pre.reason });
    return Promise.resolve(false);
  }
  if (!G.recapHead || G.recapHead.source !== "api" || !G.recapArt || G.recapArt.source !== "api") {
    var sourceFail = { reason: "local_fallback", headlineSource: G.recapHead && G.recapHead.source, articleSource: G.recapArt && G.recapArt.source };
    G.recapPublishError = sourceFail;
    recapDebugEvent("share_publish_blocked", sourceFail);
    analyticsTrack("recap_publish", { mode: MODE, surface: "newspaper", action: "blocked", outcome: sourceFail.reason });
    return Promise.resolve(false);
  }
  if (G.recapPublished) return Promise.resolve(true);
  if (G.recapPublishPromise) return G.recapPublishPromise;

  var token = G, pay = G.recapPayload;
  var body = {
    sig: G.recapSig,
    mode: pay.mode,
    wins: pay.wins,
    net: pay.net,
    nickname: G.recapHead.nickname,
    article: G.recapArt.article,
    players: pay.players
  };
  function setShareState(state) {
    if (token === G && G.npShareState) G.npShareState(state);
  }
  function fail(detail) {
    if (token !== G) return false;
    G.recapPublishError = detail || { reason: "unknown" };
    recapDebugEvent("share_publish_failed", G.recapPublishError);
    analyticsTrack("recap_publish", {
      mode: MODE, surface: "newspaper", action: "publish", outcome: "error",
      error_code: String(G.recapPublishError.reason || "unknown"), http_status: G.recapPublishError.httpStatus || null,
      duration: G.recapPublishError.elapsedMs || null
    });
    setShareState("failed");
    return false;
  }
  function attempt(remaining) {
    if (token !== G) return Promise.resolve(false);
    if (!G.recapSlug) G.recapSlug = mintRecapSlug();
    var slug = G.recapSlug;
    var route = "/" + slug;
    var started = Date.now();
    setShareState("preparing");
    G.recapPublishError = null;
    recapDebugEvent("share_publish_start", { slug: slug, route: route, origin: location.origin, remaining: remaining });
    return fetch(route, {
      method: "POST",
      keepalive: true,
      credentials: "same-origin",
      headers: { "content-type": "application/json", "accept": "application/json" },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.text().then(function (raw) {
        if (token !== G) return false;
        var parsed = null;
        try { parsed = raw ? JSON.parse(raw) : null; } catch (e) {}
        var detail = {
          slug: slug, route: route, origin: location.origin, httpStatus: res.status,
          elapsedMs: Date.now() - started, reason: parsed && parsed.reason || null,
          response: parsed || (raw ? raw.slice(0, 240) : null),
          serverBuild: res.headers.get("x-t82-share-build"), cfRay: res.headers.get("cf-ray"),
          contentType: res.headers.get("content-type")
        };
        if (res.status === 409 && remaining > 0 && detail.reason === "id_collision") {
          recapDebugEvent("share_publish_collision", detail);
          G.recapSlug = mintRecapSlug();
          return attempt(remaining - 1);
        }
        if (res.ok && parsed && parsed.ok) {
          G.recapPublished = 1;
          G.recapPublishError = null;
          recapDebugEvent("share_publish_ready", detail);
          analyticsTrack("recap_publish", {
            mode: MODE, surface: "newspaper", action: "publish", outcome: "success",
            http_status: res.status, duration: detail.elapsedMs
          });
          setShareState("ready");
          return true;
        }
        if (res.status === 404 && !detail.reason) detail.reason = "route_not_deployed";
        if (!detail.reason && (!parsed || typeof parsed !== "object")) detail.reason = "non_json_response";
        return fail(detail);
      });
    }).catch(function (err) {
      return fail({ slug: slug, route: route, origin: location.origin, elapsedMs: Date.now() - started, reason: "network", message: String(err && err.message || err) });
    });
  }
  try {
    G.recapPublishPromise = attempt(5).then(function (ok) {
      if (token === G) G.recapPublishPromise = null;
      return ok;
    }, function (err) {
      if (token === G) G.recapPublishPromise = null;
      return fail({ reason: "promise_rejection", message: String(err && err.message || err) });
    });
  } catch (e) {
    if (token === G) G.recapPublishPromise = null;
    return Promise.resolve(fail({ reason: "setup", message: String(e && e.message || e) }));
  }
  return G.recapPublishPromise;
}
/* ---------- SHARE FORMAT LAW v2 (2026-07-19, owner-locked) ----------
   TRUE 82 {#N | Classic Mode | Presti Mode | Pro Mode}
   {emoji }REC | {comp}
   Top X%                      <- omitted when /api/percentile has no sample
   (blank)
   'YY Surname  x5             <- years are the flex; slot badges retired
   (blank)
   {beat link | recap link | true82.net}
   One shape for every mode. daily-core's shareTextDaily formats the daily
   from parts built HERE (HISTORY_COMPS and the emoji bands live in this
   file; daily-core loads before app.js and never reaches back into it).
   Laws carried forward: en-dash on an undefeated record, money (if it ever
   returns to a share) stays plain "$17M", U+2212 for negatives, no
   em-dashes anywhere in shipped copy.
   Emojis are TONE, not data: no rails, no boxes, nothing that needs a
   legend. The median band is deliberately EMPTY — scarcity is the signal.
   Bands below are the session-direction defaults; per-mode sets go in
   SHARE_EMOJI_BY_MODE and a particular daily may carry its own via
   ch.shareEmoji = [{min,e},...], which wins outright. */
var SHARE_EMOJI_BANDS = [
  { min: 82, e: "\uD83D\uDC10" },   // goat
  { min: 78, e: "\uD83C\uDFC6" },   // trophy
  { min: 70, e: "\uD83D\uDD25" },   // fire
  { min: 45, e: "" },               // the median mass: clean, on purpose
  { min: 0,  e: "\uD83E\uDD76" }    // disaster ice
];
var SHARE_EMOJI_BY_MODE = { /* cap: [...], classic: [...], pro: [...] — owner to fill */ };
function shareEmojiFor(wins, chBands, mode) {
  var bands = (chBands && chBands.length) ? chBands
            : (SHARE_EMOJI_BY_MODE[mode || MODE] || SHARE_EMOJI_BANDS);
  for (var i = 0; i < bands.length; i++) if (wins >= bands[i].min) return bands[i].e || "";
  return "";
}
// TIE LAW (proposed, awaiting owner ratification): landing exactly on a tier
// reads "Tied the {team}" — 66-16 did not beat the Heatles, it matched them,
// and "Tied" is its own flex. To adopt the sketch's >= reading instead,
// delete the first branch inside the loop. Below the 62-win floor the comp
// segment is omitted (line 2 is emoji + record). HISTORY_COMPS is descending,
// so the first hit is the highest tier and same-win tiers resolve to the
// first team listed (the V25 comp-line law).
// COMP ARTICLE LAW (v33): "the" is prepended unless the label starts with a
// digit ("3-peat Bulls Core" reads bare) or already carries its own article ("The
// Last Shot Jazz" — the old concat shipped "the The"). One helper, used by
// the share comp AND the results climb line, so the surfaces can't drift.
function compArticle(label) {
  var c = label.charAt(0);
  if (c >= "0" && c <= "9") return label;
  if (/^the\b/i.test(label)) return label;
  return "the " + label;
}
// Comps key on REALIZED WINS (owner ruling, 2026-07-26): the ladder is one
// rung per win from 81 down, so every record maps to exactly one name and
// 76 wins always sits just under the Shaqobe Core. The v42 NET-keyed
// selection is retired: on the flat top of the phi curve it bunched most
// good seasons among the first few names. The Tied tier stays retired;
// GOAT alone stays keyed on the REALIZED perfect season.
function shareCompFor(wins, undefeated) {
  if (undefeated) return "Greatest of all GOATs";
  for (var i = 0; i < HISTORY_COMPS.length; i++) {
    if (HISTORY_COMPS[i].wins < wins) return "Better than " + compArticle(HISTORY_COMPS[i].label);
  }
  return "";
}
function shareHeadCtx() {
  return MODE === "cap" ? "Presti Mode" : MODE === "pro" ? "Pro Mode"
       : MODE === "kaman" ? "Kaman Mode" : "Classic Mode";
}
function shareRecord(wins) {
  var undef = wins >= CFG.GAMES_IN_SEASON;
  return wins + (undef ? "\u2013" : "-") + (CFG.GAMES_IN_SEASON - wins);
}
function shareLine2(wins, emoji) {
  var comp = shareCompFor(wins, wins >= CFG.GAMES_IN_SEASON);
  var pctTail = (typeof G.sharePct === "number") ? " \u2022 Top " + G.sharePct + "%" : "";
  var body = comp ? comp + pctTail : (pctTail ? pctTail.slice(3) : "");
  return (emoji ? emoji + " " : "") + shareRecord(wins) + (body ? " | " + body : "");
}
function shareText(e) {
  var hot = (typeof G.hotNewNet === "number");                   // Hot Hand boost (any non-COLD) applies to the shared totals
  var wins = hot ? G.hotWins : e.winTally;
  var lines = ["TRUE 82 " + shareHeadCtx(), shareLine2(wins, shareEmojiFor(wins, null, MODE))];
  var rows = picksInSlotOrder().map(function (entry) {
    var p = entry.p;
    var flame = "";
    if (entry.i === G.hotIdx) {                                  // COLD never sets G.hotIdx; WARM stays emoji-free
      if (G.hotLvl === 4) flame = " \uD83C\uDF0B";               // SUPERNOVA -> volcano
      else if (G.hotLvl >= 2) flame = " \uD83D\uDD25";           // HOT / ON FIRE -> fire
    }
    return "'" + String(p.row[IDX.season]).slice(-2) + " " + shareSurname(p.row[IDX.name]) + flame;
  });
  var tail = (G.recapPublished && G.recapSlug) ? "\uD83D\uDCF0 " + recapShareHost() + "/" + G.recapSlug : "true82.net";
  return lines.join("\n") + "\n\n" + rows.join("\n") + "\n\n" + tail;
}

function shareButtonLabel(b) {
  if (!b) return "SHARE YOUR TEAM";
  return b.getAttribute("data-share-label") || (b.id === "shareTeamBtn" ? "SHARE YOUR TEAM" : "SHARE");
}
function flashShareBtn(msg, button) {
  var b = button || el("shareTeamBtn");
  if (!b) return;
  var reset = shareButtonLabel(b);
  b.textContent = msg;
  setTimeout(function () { if (b && b.isConnected !== false) b.textContent = reset; }, 1600);
}
function revealShareText(txt, button) {
  var box = el("shareTextOut");
  if (!box) {
    box = document.createElement("textarea");
    box.id = "shareTextOut";
    box.className = "share-out";
    box.setAttribute("readonly", "");
    box.rows = 9;
    var btn = button || el("shareTeamBtn");
    if (btn && btn.parentNode) btn.parentNode.insertBefore(box, btn.nextSibling);
    else { var app = document.getElementById("app"); if (app) app.appendChild(box); }
  }
  box.value = txt;
  box.style.display = "block";
  try { box.focus(); box.select(); box.setSelectionRange(0, txt.length); } catch (e) {}
  flashShareBtn("\u2193 SELECT & COPY", button);
}
function legacyCopy(txt) {
  var ta = document.createElement("textarea");
  ta.value = txt;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "-1000px";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  var ok = false;
  try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
  if (ta.parentNode) ta.parentNode.removeChild(ta);
  return ok;
}
function copyToClipboard(txt) {
  // best-effort copy; resolves true if the text reached the clipboard
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(txt).then(function () { return true; }, function () { return legacyCopy(txt); });
  }
  return Promise.resolve(legacyCopy(txt));
}
// Tap = open the native OS share sheet (the Wordle experience — Messages, Mail, etc.)
// AND drop the text on the clipboard. Clipboard fires first so it lands within the same
// user gesture as the share call. If the platform can't share (or it's blocked, e.g. a
// sandboxed preview), we still copy and flash COPIED!, and if even clipboard is blocked we
// reveal an on-page selectable box so the text is always reachable.
// FUNNEL SPLIT (v28): callers emit "share_click" at the tap (intent); the
// completed "share" fires HERE, at most once, when the payload verifiably
// left the building — the OS sheet resolved, or (no sheet on this platform /
// sheet broken) the clipboard write succeeded. A DISMISSED sheet counts as
// intent only, even though the clipboard has the text: they looked at the
// door and backed out. The reveal-box fallback never counts.
function shareOrCopy(txt, button, track) {
  var done = false;
  var eventProps = function (method, outcome, err) {
    var p = Object.assign({}, track || {});
    p.action = method;
    p.outcome = outcome;
    if (err) p.error_code = String(err.name || err.message || err).slice(0, 80);
    return p;
  };
  var completed = function (method) {
    if (done) return; done = true;
    if (track && window.t82track) {
      window.t82track("share", eventProps(method, "success"));
      window.t82track("share_result", eventProps(method, "success"));
    }
  };
  var failed = function (method, outcome, err) {
    if (!track || !window.t82track) return;
    window.t82track(outcome === "cancel" ? "share_cancel" : "share_error", eventProps(method, outcome, err));
    window.t82track("share_result", eventProps(method, outcome, err));
  };
  var copyP = copyToClipboard(txt);
  var copiedFlash = function () { copyP.then(function (ok) { if (ok) flashShareBtn("COPIED!", button); }); };
  if (navigator.share) {
    var sp;
    try { sp = navigator.share({ text: txt }); }
    catch (e) { failed("native_share", "error", e); sp = null; }
    if (sp && sp.then) {
      sp.then(function () { completed("native_share"); copiedFlash(); }, function (err) {
        if (err && err.name === "AbortError") { failed("native_share", "cancel", err); copiedFlash(); return; }  // user dismissed the sheet: intent only
        copyP.then(function (ok) {
          if (ok) { completed("clipboard_fallback"); flashShareBtn("COPIED!", button); }
          else { failed("manual_reveal", "error", err); revealShareText(txt, button); }
        });
      });
      return;
    }
  }
  copyP.then(function (ok) {
    if (ok) { completed("clipboard"); flashShareBtn("COPIED!", button); }
    else { failed("manual_reveal", "error", null); revealShareText(txt, button); }
  });
}

/* ---------- season recap: The True 82 Tribune ----------
   Every finished season stages a wrapped sports extra. Pressing READ STORY is the
   engagement event: one POST /api/recap {phase:"edition"} requests the nickname
   and complete article while a fixed 3.1-second pressroom reveal runs. A client
   deadline typesets local fallback copy before the cover settles, so the paper
   always opens complete. Model text enters through textContent only. */

var RECAP_TIERS = [
  [82, "perfect"], [81, "heartbreak"], [74, "record"], [73, "matched"],
  [70, "historic"], [65, "great"], [58, "contender"], [50, "solid"],
  [42, "forgettable"], [33, "mediocre"], [20, "bad"], [8, "awful"], [1, "shame"], [0, "futile"]
];
function recapTier(w) { for (var i = 0; i < RECAP_TIERS.length; i++) if (w >= RECAP_TIERS[i][0]) return RECAP_TIERS[i][1]; return "futile"; }

// Human-readable composition signals from the engine result — the same facts the
// Scoring Card shows, phrased for a writer instead of a ledger.
function recapFitNotes(e) {
  var n = [];
  if (e.usageTax > 0) n.push("shot demand runs over budget: too many high-usage scorers sharing one ball");
  if (e.spacingBonus > 0) n.push("surplus shooting: extra floor-spacers stretch every defense");
  else if (e.spacingTax > 0) n.push("only " + e.sumSp + " of " + SC.SPACERS_REQ + " required floor-spacers: the floor shrinks in the half court");
  if (e.backDefTax > 0) n.push("both starting guards rank bottom-" + e.backDefTier + "% defensively: the perimeter leaks");
  if (e.wingDefTax > 0) n.push("both forwards rank bottom-" + e.wingDefTier + "% defensively: the frontcourt gets attacked");
  if (!n.length) n.push("a balanced five: no structural weakness the model could tax");
  return n;
}

function buildRecapPayload(e, finalWins, finalNet, hh) {
  return {
    mode: MODE,
    wins: finalWins,
    net: Math.round(finalNet * 10) / 10,
    hh: hh || null,
    players: picksInSlotOrder().map(function (x) {
      var r = x.p.row;
      return { slot: x.p.slot, yr: r[IDX.season], name: r[IDX.name], v: Math.round(valueOf(r) * 10) / 10 };
    }),
    notes: recapFitNotes(e)
  };
}

// Rule-based fallback copy. Nickname from the loudest fit signal, story from a
// tier-toned template. Deliberately plain next to the model's prose, never broken.
function localHeadline(p) {
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  var w = p.wins, l = 82 - w;
  var byV = p.players.slice().sort(function (a, b) { return b.v - a.v; });
  var noteStr = (p.notes[0] || "").toLowerCase();
  var nick;
  if (w >= 82) nick = pick(["The Inevitables", "The Perfect Machine", "The Immortals"]);
  else if (w === 0) nick = pick(["The Winless Wonders", "The Empty Column"]);
  else if (noteStr.indexOf("guards rank") >= 0 || noteStr.indexOf("forwards rank") >= 0) nick = pick(["The Matadors", "The Turnstiles", "The Open Doors"]);
  else if (noteStr.indexOf("one ball") >= 0) nick = pick(["The Five Alphas", "The One-Ball Army"]);
  else if (noteStr.indexOf("floor shrinks") >= 0) nick = pick(["The Bricklayers", "The Cramped Quarters"]);
  else if (noteStr.indexOf("surplus shooting") >= 0) nick = pick(["The Splash Dynasty", "The Greenlight Five"]);
  else nick = pick(["The Company Men", "The Blueprint", "The Working Class"]);
  return { nickname: nick, source: "fallback" };
}
function localArticle(p) {
  var w = p.wins, l = 82 - w, tier = recapTier(w);
  var byV = p.players.slice().sort(function (a, b) { return b.v - a.v; });
  var star = byV[0].name, second = byV[1].name;
  var noteStr = (p.notes[0] || "").toLowerCase();
  var open = {
    perfect: "The final buzzer confirmed it: 82-0, a season without a single loss.",
    heartbreak: "It ends 81-1, one win from immortality and forever short of it.",
    record: "At " + w + "-" + l + ", this team did what no NBA season ever had and buried the 73-win mark.",
    matched: "At 73-9, this team walked all the way up to history and signed its name beside it.",
    historic: "A " + w + "-win season put this group in company only a handful of teams have ever kept.",
    great: "At " + w + "-" + l + ", this was a genuinely feared team that never quite touched legend.",
    contender: "The " + w + "-" + l + " record reads like what it was: a real contender, start to finish.",
    solid: "It closed " + w + "-" + l + ", the kind of good season nobody will bring up in five years.",
    forgettable: "At " + w + "-" + l + ", the season lived just north of .500 and south of anyone's memory.",
    mediocre: w + "-" + l + " is the treadmill: never bad enough to look away, never good enough to matter.",
    bad: "The season closed " + w + "-" + l + ", and the post-mortem writes itself.",
    awful: "At " + w + "-" + l + ", this was one of the roughest seasons in memory.",
    shame: w + "-" + l + " puts this team beneath the famous tankers, and they weren't even trying to lose.",
    futile: "It ends 0-82, a season of perfect futility that history will never let go of."
  }[tier];
  var mid = (p.notes.length && noteStr.indexOf("balanced") < 0)
    ? "Around him, the fit told the story: " + p.notes[0].replace(":", " \u2014") + "."
    : "Around him the pieces fit cleanly, with no structural flaw to hide.";
  var close = w >= 65 ? "With " + second + " giving the nights their shape, the record came to feel less like luck than arithmetic."
    : w >= 42 ? "Even with " + second + " steadying the group, the record landed exactly where the construction deserved."
    : "Not even " + second + " could hold it together, and the roster's flaws wrote the record all season long.";
  return {
    article: open + " " + star + " carried the nightly burden and set the terms of the fight. " + mid + " " + close,
    source: "fallback"
  };
}

// Stage the recap payload at season end — pure local work, zero tokens. The model
// request fires only when READ STORY opens the bundle (or the rare 82-0 auto-open),
// so skipping the wrapped edition costs nothing. First writer wins, ensuring the
// Heat Check verdict's post-boost totals beat the ceremony-skip fallback.
function prepareRecap(e, finalWins, finalNet, hh) {
  if (G.recapPayload) return;
  G.recapPayload = buildRecapPayload(e, finalWins, finalNet, hh);
  G.recapWins = finalWins;
}

// One edition request per opened bundle. The unwrap click is the event-driven
// engagement signal: it buys a nickname and the complete four-sentence story in
// a single round trip, which is faster and cheaper than serial headline/article
// calls. The three-second reveal masks normal latency without becoming a network
// deadline; slower valid responses stay in press, while real failures fall back.
function requestEdition() {
  if (G.recapReq || !G.recapPayload) return;
  G.recapReq = 1;
  G.recapArtReq = 1;
  G.recapArtIntent = "unwrap";

  var token = G, settled = false, started = Date.now(), httpStatus = 0;
  var requestId = "r" + started.toString(36) + "-" + Math.random().toString(36).slice(2, 9);
  var fallbackHead = localHeadline(G.recapPayload);
  var fallbackArt = localArticle(G.recapPayload);
  analyticsTrack("recap_generation", {
    mode: MODE, wins: G.recapPayload.wins, surface: "newspaper", action: "start"
  });
  var debug = recapDebugSet({
    build: T82_RECAP_BUILD,
    state: "requesting",
    phase: "edition",
    requestId: requestId,
    startedAt: new Date(started).toISOString(),
    elapsedMs: 0,
    source: null,
    reason: null,
    httpStatus: null,
    payload: {
      mode: G.recapPayload.mode,
      wins: G.recapPayload.wins,
      playerCount: G.recapPayload.players && G.recapPayload.players.length
    }
  });
  recapDebugEvent("edition_request_start", {
    requestId: requestId,
    mode: debug.payload.mode,
    wins: debug.payload.wins,
    playerCount: debug.payload.playerCount
  });

  function finishDebug(state, source, reason) {
    debug.state = state;
    debug.elapsedMs = Date.now() - started;
    debug.source = source || null;
    debug.reason = reason || null;
    debug.httpStatus = httpStatus || null;
    recapDebugSet(debug);
  }

  function settle(d, reason) {
    if (settled || token !== G) return;
    settled = true;
    var apiCopy = !!(d && d.ok && d.nickname && d.article);
    if (apiCopy) {
      G.recapHead = { nickname: String(d.nickname), source: d.source || "api" };
      G.recapArt = { article: String(d.article), source: d.source || "api" };
      if (d.sig && typeof d.sig === "string") {
        G.recapSig = d.sig;
        if (!G.recapSlug) G.recapSlug = mintRecapSlug();
        publishRecap();   // pre-publish + collision retry so SHARE ARTICLE has a live five-character URL
      }
      debug.nickname = String(d.nickname);
      debug.articleChars = String(d.article).length;
      debug.server = d.diagnostic || null;
      finishDebug("settled", "api", null);
      recapDebugEvent("edition_api_ready", {
        requestId: requestId,
        elapsedMs: debug.elapsedMs,
        httpStatus: debug.httpStatus,
        nickname: debug.nickname,
        articleChars: debug.articleChars,
        signed: !!G.recapSig,
        model: debug.responseHeaders && debug.responseHeaders.model,
        cfRay: debug.responseHeaders && debug.responseHeaders.cfRay
      });
      if (console && console.log) console.log("[tribune] AI edition ready", recapDebugClone(debug));
      analyticsTrack("recap_generation", {
        mode: MODE, wins: G.recapPayload.wins, surface: "newspaper", action: "complete",
        outcome: "api", duration: debug.elapsedMs, http_status: debug.httpStatus
      });
    } else {
      G.recapHead = Object.assign({}, fallbackHead, { source: "fallback" });
      G.recapArt = Object.assign({}, fallbackArt, { source: "fallback" });
      debug.responseBody = d ? {
        ok: d.ok,
        reason: d.reason,
        phase: d.phase,
        model: d.model,
        requestId: d.requestId,
        elapsedMs: d.elapsedMs,
        providerStatus: d.providerStatus,
        providerErrorType: d.providerErrorType,
        providerMessage: d.providerMessage
      } : null;
      finishDebug("settled", "fallback", reason || (d && d.reason) || "invalid_response");
      recapDebugEvent("edition_fallback", {
        requestId: requestId,
        elapsedMs: debug.elapsedMs,
        httpStatus: debug.httpStatus,
        reason: debug.reason,
        model: debug.responseHeaders && debug.responseHeaders.model,
        cfRay: debug.responseHeaders && debug.responseHeaders.cfRay
      });
      if (console && console.warn) console.warn("[tribune] local edition used", recapDebugClone(debug));
      analyticsTrack("recap_generation", {
        mode: MODE, wins: G.recapPayload.wins, surface: "newspaper", action: "complete",
        outcome: "fallback", duration: debug.elapsedMs, http_status: debug.httpStatus,
        error_code: String(debug.reason || "invalid_response")
      });
    }
    stampHeadline();
    inkInArticle();
    if (G.npEditionReady) G.npEditionReady();
  }

  var ac = (typeof AbortController !== "undefined") ? new AbortController() : null;
  // The opening animation is only a latency mask. The Function gets 28 seconds;
  // this client guard is deliberately longer so its explicit reason normally
  // reaches the browser before a client-side abort.
  var timer = setTimeout(function () {
    if (ac) ac.abort();
    settle(null, "client_timeout_32s");
  }, 32000);

  if (console && console.log) console.log("[tribune] requesting AI edition", recapDebugClone(debug));
  try {
    fetch("/api/recap", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        "accept": "application/json",
        "x-t82-recap-id": requestId
      },
      body: JSON.stringify(Object.assign({ phase: "edition" }, G.recapPayload)),
      signal: ac ? ac.signal : undefined
    }).then(function (r) {
      httpStatus = r.status;
      debug.responseHeaders = {
        contentType: r.headers.get("content-type"),
        cacheControl: r.headers.get("cache-control"),
        cfRay: r.headers.get("cf-ray"),
        requestId: r.headers.get("x-t82-recap-id"),
        serverBuild: r.headers.get("x-t82-recap-build"),
        model: r.headers.get("x-t82-recap-model"),
        result: r.headers.get("x-t82-recap-result"),
        reason: r.headers.get("x-t82-recap-reason"),
        serverTiming: r.headers.get("server-timing")
      };
      recapDebugEvent("edition_response_headers", Object.assign({
        requestId: requestId,
        httpStatus: r.status
      }, debug.responseHeaders));
      return r.text().then(function (raw) { return { response: r, raw: raw }; });
    }).then(function (packet) {
      clearTimeout(timer);
      var d;
      try {
        d = JSON.parse(packet.raw);
      } catch (parseErr) {
        debug.responsePreview = packet.raw.slice(0, 300);
        settle(null, "response_not_json");
        return;
      }
      debug.responseShape = {
        ok: !!d.ok,
        hasNickname: !!d.nickname,
        hasArticle: !!d.article,
        hasSig: !!d.sig,
        reason: d.reason || null,
        source: d.source || null,
        model: d.model || null,
        requestId: d.requestId || null,
        elapsedMs: d.elapsedMs || null
      };
      recapDebugEvent("edition_response_body", Object.assign({ requestId: requestId }, debug.responseShape));
      if (d && d.ok && d.nickname && d.article) settle(d, null);
      else settle(d, d && d.reason ? d.reason : "invalid_response");
    }).catch(function (err) {
      clearTimeout(timer);
      var reason = err && err.name === "AbortError" ? "client_timeout_32s" : "network_error";
      debug.fetchError = { name: err && err.name, message: String(err && err.message || err) };
      recapDebugEvent("edition_fetch_error", { requestId: requestId, reason: reason, error: debug.fetchError.message });
      settle(null, reason);
    });
  } catch (err) {
    clearTimeout(timer);
    debug.fetchError = { name: err && err.name, message: String(err && err.message || err) };
    recapDebugEvent("edition_request_setup_error", { requestId: requestId, error: debug.fetchError.message });
    settle(null, "request_setup");
  }
}

// Post-Heat-Check path only: the spin ceremony already revealed the results, so
// the paper follows it once, non-gated.
function maybeShowRecap() {
  if (!G.recapPayload || G.recapAuto || G.screen !== "results") return;
  if (document.querySelector(".hh-overlay") || document.querySelector(".np-overlay")) return;
  G.recapAuto = 1;
  showNewspaper(false);
}

function recapChip() {}   // removed: the newspaper is one-and-done now — no reopen chip after dismissal

var NP_TICK_HEAD = ["HOT OFF THE PRESS", "STOP THE PRESSES", "SETTING TYPE", "INK STILL DRYING"];
var NP_TICK_ART = ["REWRITING THE LEDE", "CALLING THE COPY DESK", "TELETYPE INCOMING", "HOLDING PAGE ONE"];

function showNewspaper(gate) {
  if (!G.recapPayload) return;
  var chip = document.getElementById("npChip"); if (chip) chip.remove();
  if (document.querySelector(".np-overlay")) return;
  var wins = G.recapWins, losses = CFG.GAMES_IN_SEASON - wins;

  var ov = document.createElement("div"); ov.className = "np-overlay" + (gate ? " np-gate" : "");
  var stage = document.createElement("div"); stage.className = "np-stage";
  var paper = document.createElement("div"); paper.className = "np-paper";
  paper.setAttribute("role", "dialog"); paper.setAttribute("aria-label", "Season recap");
  function div(cls, txt) { var x = document.createElement("div"); x.className = cls; if (txt != null) x.textContent = txt; return x; }

  var mast = div("np-mast");
  mast.appendChild(div("np-mast-side", npDate()));
  mast.appendChild(div("np-mast-name", "The True 82 Tribune"));
  mast.appendChild(div("np-mast-side np-right", "SPORTS FINAL \u00B7 5\u00A2"));
  paper.appendChild(mast);
  if (wins >= CFG.GAMES_IN_SEASON || wins === 0) paper.appendChild(div("np-banner", wins ? "HISTORY: A PERFECT SEASON" : "HISTORY: A PERFECT DISASTER"));

  var headWrap = div("np-headwrap");
  paper.appendChild(headWrap);
  var ticker = div("np-ticker", NP_TICK_HEAD[0]);
  paper.appendChild(ticker);

  var art = div("np-article");
  paper.appendChild(art);

  var acts = div("np-actions");
  var read = document.createElement("button"); read.type = "button"; read.className = "presti-spin np-read np-share-article"; read.textContent = "PREPARING LINK…"; read.disabled = true; read.setAttribute("data-share-label", "SHARE ARTICLE");
  var shareNote = div("np-share-note", "Preparing a permanent article link…");
  acts.appendChild(read); acts.appendChild(shareNote);
  paper.appendChild(acts);

  var under = div("np-under");
  var skip = document.createElement("button"); skip.type = "button"; skip.className = "presti-spin np-underbtn"; skip.textContent = "SKIP TO RESULTS";
  var again = document.createElement("button"); again.type = "button"; again.className = "presti-spin np-underbtn"; again.textContent = "RUN IT BACK";
  under.appendChild(skip); under.appendChild(again);
  if (dyRun()) again.style.display = "none";   // v48: a dynasty season is settled; a rerun here would be a plain classic run in disguise

  // Three physical sheets remain on one stage. The wrapped cover carries a clear
  // ink-black READ STORY action. On activation, the tie releases, the cover lifts,
  // backing sheets fan away, a press sweep travels down the page, and this real
  // Tribune expands underneath. There is no object swap and no spin animation.
  var bundle = null, autoT = null, openingT = null, statusTimers = [];
  var fullReadTimer = null, fullReadTracked = false, fullReadScrollBound = false;
  var recapOpenedAt = 0;
  if (!G.recapReq) {
    paper.classList.add("np-hidden");
    bundle = document.createElement("button");
    bundle.type = "button";
    bundle.className = "np-bundle";
    bundle.setAttribute("aria-label", "Read the True 82 Tribune season story");

    var stack = div("np-stack");
    var back2 = div("np-sheet np-sheet-back np-sheet-back-2"); back2.setAttribute("aria-hidden", "true");
    var back1 = div("np-sheet np-sheet-back np-sheet-back-1"); back1.setAttribute("aria-hidden", "true");
    var top = div("np-sheet np-sheet-top");

    var bmast = div("np-bundle-mast");
    bmast.appendChild(div("np-bundle-side", npDate()));
    bmast.appendChild(div("np-bundle-name", "The True 82 Tribune"));
    bmast.appendChild(div("np-bundle-side np-right", "SPORTS FINAL \u00B7 5\u00A2"));
    top.appendChild(bmast);

    var kicker = div("np-bundle-kicker");
    kicker.appendChild(div("np-bundle-extra", "EXTRA"));
    kicker.appendChild(div("np-bundle-kicker-copy", "THE SEASON EDITION \u00B7 FIVE PICKS, ONE VERDICT"));
    top.appendChild(kicker);

    var face = div("np-bundle-face");
    var teaser = div("np-bundle-teaser");
    teaser.appendChild(div("np-bundle-teaser-head", wins >= 81 ? "HISTORY DESK" : wins === 0 ? "DISASTER DESK" : "FRONT OFFICE"));
    teaser.appendChild(div("np-bundle-copyline"));
    teaser.appendChild(div("np-bundle-copyline short"));
    teaser.appendChild(div("np-bundle-copyline"));
    teaser.appendChild(div("np-bundle-copyline tiny"));
    face.appendChild(teaser);

    var stamp = div("np-bundle-stamp");
    stamp.appendChild(div("np-bundle-eyebrow", wins >= CFG.GAMES_IN_SEASON ? "HISTORY" : wins === 0 ? "DISASTER" : "FINAL EDITION"));
    stamp.appendChild(div("np-bundle-rec", wins + "\u2013" + losses + "!"));
    stamp.appendChild(div("np-bundle-sub", "PROJECTED RECORD"));
    face.appendChild(stamp);

    var box = div("np-bundle-box");
    box.appendChild(div("np-bundle-box-head", "EDITION NOTES"));
    box.appendChild(div("np-bundle-box-row", shareModeLabel().toUpperCase()));
    box.appendChild(div("np-bundle-box-row", "NET " + signed1(G.recapPayload.net)));
    box.appendChild(div("np-bundle-box-row", "5-MAN FINAL"));
    face.appendChild(box);
    top.appendChild(face);

    var folio = div("np-bundle-folio");
    folio.appendChild(div("np-bundle-hint", "SPECIAL SEASON EDITION"));
    folio.appendChild(div("np-bundle-foldnote", "PAGE ONE INSIDE"));
    top.appendChild(folio);

    var cta = div("np-bundle-cta");
    cta.appendChild(div("np-bundle-cta-kicker", "OPEN THE FINAL EDITION"));
    cta.appendChild(div("np-bundle-cta-main", "READ STORY  \u2192"));
    top.appendChild(cta);

    top.appendChild(div("np-fold-shadow"));
    top.appendChild(div("np-twine-h")); top.appendChild(div("np-twine-v")); top.appendChild(div("np-twine-knot"));
    stack.appendChild(back2); stack.appendChild(back1); stack.appendChild(top);
    bundle.appendChild(stack);
  } else {
    stage.classList.add("np-opened");
    paper.classList.add("open", "story-ready", "ready");
  }

  var pressFx = div("np-press-fx");
  pressFx.setAttribute("aria-hidden", "true");
  pressFx.appendChild(div("np-press-sweep"));
  var pressStatus = div("np-press-status", "BREAKING THE TWINE");
  pressFx.appendChild(pressStatus);

  if (bundle) stage.appendChild(bundle);
  stage.appendChild(paper);
  stage.appendChild(pressFx);
  ov.appendChild(stage); ov.appendChild(under);
  document.body.appendChild(ov);
  if (!G.recapPresentedTracked) {
    G.recapPresentedTracked = 1;
    analyticsTrack("recap_presented", Object.assign(analyticsRunSnapshot(), {
      surface: "newspaper", action: "bundle_presented", wins: wins
    }));
  }
  buzz(20);

  var tickTimer = setInterval(function () {
    var arr = paper.classList.contains("printing-art") ? NP_TICK_ART : NP_TICK_HEAD;
    ticker.textContent = arr[Math.floor(Date.now() / 1400) % arr.length];
  }, 1400);

  function clearStatusTimers() {
    for (var i = 0; i < statusTimers.length; i++) clearTimeout(statusTimers[i]);
    statusTimers.length = 0;
  }
  function close(fireworksOk) {
    clearInterval(tickTimer);
    clearTimeout(autoT);
    clearTimeout(openingT);
    clearTimeout(fullReadTimer);
    clearStatusTimers();
    if (ov.parentNode) ov.parentNode.removeChild(ov);
    if (fireworksOk && G.recapGateFw) { G.recapGateFw = 0; setTimeout(fireWL, 260); }
  }
  function setPressStatus(txt) {
    pressStatus.textContent = txt;
  }
  function trackRecapAction(variant) {
    analyticsTrack("recap_action", Object.assign(analyticsRunSnapshot(), {
      surface: "newspaper", action: variant, variant: variant
    }));
  }
  // "Full read" is an engagement proxy, not an eye-tracker: count it once when the
  // reader either reaches the article bottom or keeps the finished edition visible
  // for a length-aware dwell (7-12 seconds). This is materially stricter than unwrap.
  function markFullRead(signal) {
    if (fullReadTracked || !ov.parentNode || !G.recapArt) return;
    fullReadTracked = true;
    clearTimeout(fullReadTimer);
    analyticsTrack("recap_full_read", Object.assign(analyticsRunSnapshot(), {
      surface: "newspaper", action: signal, variant: signal,
      segment: (G.recapHead && G.recapHead.source) || "unknown",
      duration: recapOpenedAt ? Math.max(0, Date.now() - recapOpenedAt) : null
    }));
  }
  function armFullRead() {
    if (fullReadTracked || fullReadTimer || !ov.parentNode || !G.recapArt ||
        !stage.classList.contains("np-opened") || !paper.classList.contains("story-ready")) return;
    if (!fullReadScrollBound) {
      fullReadScrollBound = true;
      paper.addEventListener("scroll", function () {
        if (paper.scrollHeight - paper.scrollTop - paper.clientHeight <= 28) markFullRead("article_bottom");
      }, { passive: true });
    }
    var words = String(G.recapArt.article || "").trim().split(/\s+/).filter(Boolean).length;
    var delay = Math.max(7000, Math.min(12000, words * 140));
    fullReadTimer = setTimeout(function dwellCheck() {
      fullReadTimer = null;
      if (document.visibilityState === "hidden") {
        fullReadTimer = setTimeout(dwellCheck, 1500);
        return;
      }
      markFullRead("visible_dwell");
    }, delay);
  }

  function buildGhostArticle() {
    art.textContent = "";
    art.appendChild(div("np-byline", "TRIBUNE WIRE \u2014 FINAL COPY IN PROGRESS"));
    var g = div("np-ghostbody");
    for (var i = 0; i < 7; i++) g.appendChild(div("np-gline" + (i === 6 ? " short" : "")));
    art.appendChild(g);
  }

  // A deliberately paced 3.1-second pressroom reveal. The click is the Option-B
  // engagement event, so the combined edition request starts at frame one. The
  // animation masks normal latency, but it no longer aborts a healthy request:
  // slower editions remain visibly "in press" until AI copy or a real failure.
  function unwrap(auto) {
    if (!bundle || G.recapReq) return;
    clearTimeout(autoT);
    recapOpenedAt = Date.now();
    analyticsTrack("recap_unwrap", Object.assign(analyticsRunSnapshot(), {
      surface: "newspaper", action: auto ? "auto" : "tap", wins: wins,
      segment: auto ? "auto" : "tap"
    }));
    if (!G.recapReadTracked) {
      G.recapReadTracked = 1;
      analyticsTrack("recap_read", Object.assign(analyticsRunSnapshot(), {
        surface: "newspaper", action: "story_opened"
      }));
    }

    var b = bundle;
    bundle = null;
    b.disabled = true;
    ov.classList.add("np-is-opening");
    stage.classList.add("np-opening");
    b.classList.add("np-opening-bundle");
    paper.classList.remove("np-hidden");
    paper.classList.add("np-revealing", "open", "printing-art");
    buildGhostArticle();
    requestEdition();

    statusTimers.push(setTimeout(function () { setPressStatus("LIFTING PAGE ONE"); }, 620));
    statusTimers.push(setTimeout(function () { setPressStatus("RUNNING THE PRESSES"); }, 1320));
    statusTimers.push(setTimeout(function () { setPressStatus("SETTING THE FINAL EDITION"); }, 2180));

    openingT = setTimeout(function () {
      if (b.parentNode) b.parentNode.removeChild(b);
      stage.classList.remove("np-opening");
      stage.classList.add("np-opened");
      paper.classList.remove("np-revealing");
      paper.classList.add("np-settled");
      ov.classList.remove("np-is-opening");
      if (G.recapHead && G.recapArt) {
        G.npStamp();
        G.npInk();
        G.npEditionReady();
      } else {
        stage.classList.add("np-awaiting-copy");
        paper.classList.add("np-awaiting-copy");
        pressStatus.textContent = "FINAL COPY INCOMING";
      }
      armFullRead();
      buzz(18);
    }, 3100);
  }

  if (bundle) {
    bundle.addEventListener("click", function () { unwrap(false); });
    // v32 (owner-directed): the edition NEVER opens itself — not even a
    // perfect 82-0. Publishing a public /r/{slug} URL is a side effect of
    // opening the paper, so opening must always be a deliberate tap on the
    // bundle (or the READ STORY action). The old auto-unwrap at 82 wins was
    // removed here; no win count auto-opens or auto-publishes anymore.
  }

  skip.addEventListener("click", function () {
    if (stage.classList.contains("np-opening")) return;
    trackRecapAction("skip_results");
    analyticsTrack("recap_skip", Object.assign(analyticsRunSnapshot(), {
      surface: "newspaper", action: "skip_results"
    }));
    close(true);
  });
  again.addEventListener("click", function () {
    if (stage.classList.contains("np-opening")) return;
    trackRecapAction("run_it_back");
    analyticsTrack("replay", Object.assign(analyticsRunSnapshot(), {
      surface: "newspaper", action: "run_it_back"
    }));
    close(false);
    newGame();
  });
  ov.addEventListener("click", function (ev) {
    if (ev.target === ov && !stage.classList.contains("np-opening")) {
      trackRecapAction("backdrop_dismiss");
      analyticsTrack("recap_skip", Object.assign(analyticsRunSnapshot(), {
        surface: "newspaper", action: "backdrop_dismiss"
      }));
      close(true);
    }
  });

  read.addEventListener("click", function () {
    if (!G.recapPublished) {
      G.recapPublishPromise = null;                 // an explicit retry always starts a fresh request
      G.npShareState("preparing");
      publishRecap().then(function (ok) {
        if (ok) flashShareBtn("LINK READY — TAP AGAIN", read);
        else if (console && console.warn) console.warn("[tribune] article link retry failed", window.t82ShareDebug());
      });
      return;
    }
    trackRecapAction("share_article");
    var e2 = engine(G.picks.map(function (p) { return p.row; }), G.picks.map(function (p) { return p.slot; }));
    var sw = (typeof G.hotNewNet === "number") ? G.hotWins : e2.winTally;
    var sn = (typeof G.hotNewNet === "number") ? G.hotNewNet : e2.net;
    var rTrack = { mode: MODE, wins: sw, net: sn,
      value: (typeof G.sharePct === "number") ? G.sharePct : null,
      undefeated: sw >= CFG.GAMES_IN_SEASON ? 1 : 0,
      variant: "tribune_article", surface: "newspaper", action: "share_article" };
    if (window.t82track) window.t82track("share_click", rTrack);
    shareOrCopy(shareText(e2), read, rTrack);
  });

  // The in-paper action is the canonical article share. It stays visibly present
  // while its five-character link is prepared, then becomes an active gold control.
  G.npShareState = function (state) {
    if (!ov.parentNode) return;
    read.classList.toggle("np-share-ready", state === "ready");
    read.classList.toggle("np-share-failed", state === "failed" || state === "unavailable");
    if (state === "ready") {
      read.disabled = false; read.textContent = "SHARE ARTICLE"; read.title = "";
      shareNote.textContent = "Permanent link ready: " + recapShareHost() + "/" + G.recapSlug;
    } else if (state === "failed") {
      read.disabled = false; read.textContent = "RETRY ARTICLE LINK";
      shareNote.textContent = sharePublishMessage(G.recapPublishError);
      read.title = shareNote.textContent + " Run t82ShareDebug() for details.";
    } else if (state === "unavailable") {
      read.disabled = true; read.textContent = "ARTICLE LINK UNAVAILABLE";
      shareNote.textContent = "Only signed AI editions can be published.";
    } else {
      read.disabled = true; read.textContent = "PREPARING LINK…"; read.title = "";
      shareNote.textContent = "Preparing a permanent article link…";
    }
  };

  // Fill-in renderers live on G so the edition request can finish without holding
  // stale DOM refs across games. All model output remains textContent-only.
  G.npEditionReady = function () {
    if (!ov.parentNode) return;
    stage.classList.remove("np-awaiting-copy");
    paper.classList.remove("np-awaiting-copy");
    if (stage.classList.contains("np-opening")) return;
    stage.classList.add("np-copy-ready");
    pressStatus.textContent = "FINAL EDITION READY";
    statusTimers.push(setTimeout(function () { stage.classList.remove("np-copy-ready"); }, 1050));
  };
  G.npStamp = function () {
    if (!ov.parentNode || !G.recapHead) return;
    headWrap.textContent = "";
    var h = div("np-head np-stamp", String(G.recapHead.nickname).toUpperCase() + " FINISH " + wins + "\u2013" + losses + "!");
    headWrap.appendChild(h);
    if (G.recapHead.dek) headWrap.appendChild(div("np-dek", G.recapHead.dek));
    paper.classList.add("ready");
    if (!G.recapShownTracked) {
      G.recapShownTracked = 1;
      analyticsTrack("recap_shown", Object.assign(analyticsRunSnapshot(), {
        surface: "newspaper", action: "edition_ready", wins: wins,
        segment: G.recapHead.source || "api", variant: String(G.recapHead.nickname).slice(0, 78)
      }));
    }
  };
  G.npInk = function () {
    if (!ov.parentNode || !G.recapArt) return;
    paper.classList.remove("printing-art");
    paper.classList.add("story-ready", "open", "ready");
    ticker.style.display = "none";
    art.textContent = "";
    art.appendChild(div("np-byline", "From the Tribune wire desk"));
    var body = document.createElement("p"); body.className = "np-body ink-in";
    body.innerHTML = bbrefLinkifyArticle(G.recapArt.article,
      picksInSlotOrder().map(function (en) { return en.p.row[IDX.name]; }), "article");
    art.appendChild(body);
    if (G.recapSig && G.recapHead && G.recapHead.source === "api" && G.recapArt.source === "api") {
      G.npShareState(G.recapPublished ? "ready" : "preparing");
      publishRecap();
    } else {
      G.npShareState("unavailable");
    }
    armFullRead();
  };

  if (G.recapHead) G.npStamp();
  else {
    var gh = div("np-headghost");
    gh.appendChild(div("np-gline")); gh.appendChild(div("np-gline")); gh.appendChild(div("np-gline short"));
    headWrap.appendChild(gh);
  }
  if (G.recapArt) G.npInk();
  G.recapShown = 1;

  function npDate() {
    var m = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"], t = new Date();
    return m[t.getMonth()] + " " + t.getDate() + ", " + t.getFullYear();
  }
}
function stampHeadline() { if (G.npStamp) G.npStamp(); }
function inkInArticle() { if (G.npInk) G.npInk(); }

function setEliteResultGlow(wins) {
  var share = document.getElementById("shareTeamBtn");
  if (share) share.classList.toggle("elite-result", wins === 81 || wins === 82);
}

/* ---------- v48.1 THE DYNASTY v2 (alpha) ----------
   "How long can I keep the greatest franchise in history alive?"
   Classic drafting and the realized 82, wrapped in permanent scarcity:
   every player on a BANKED roster retires for the rest of the run. The
   whole player, every season, every team. The pool only shrinks, so the
   problem drifts from "strongest possible five" toward "the weakest five
   that still survives."

   WHY v2 EXISTS. v48.0 retired player SEASONS. The owner self-played it and
   returned a clean negative: losing 2016 Curry while 2015 and 2017 Curry sit
   right there is not scarcity, it is a keystroke, and the draft stayed "who
   was good, which years was he great, take those." Three changes answer it,
   and nothing else was added on purpose:
     1. the retirement key is the NAME (dyRowKey), which is the rule change;
     2. dead cells cannot end a run: doubled skips plus dyDealGuard, because
        player-level scarcity spends a man out of EVERY cell at once and the
        owner's second complaint was thin cells ending runs on their own;
     3. DY_THRESH drops a rung and climbs slower, since the shrinking pool is
        now supposed to be the difficulty by itself.
   THE QUESTION THE ALPHA ASKS, and the only one: at round six, with the
   obvious names gone and the full forward class of a decade in front of you,
   is remembering who was quietly great fun or is it homework? ?dyburn=N
   exists so that question can be asked in one draft instead of five seasons.
   Rotating per-round constraints are the known fix if the EARLY rounds turn
   out to be the boring part. They are deliberately not here: that is a
   different problem and this build should not answer two questions at once.

   ARCHITECTURE (the engine stays a black box):
   - The scarcity rule IS a challenge. dyChallenge() builds a challenge
     object whose filter() rejects retired rows; it rides the same
     newGame(mode, seed, ch) door the weekly twists use, so the engine
     enforces legality exactly as it does for every other challenge, and
     pickBlock/denyRow explain a barred card for free. MODE stays
     "classic": the engine never learns the word dynasty.
   - The season REALIZES. v42 reserved this exact door ("daily boards,
     challenges, and pro stay analytic until their own adaptations");
     seasonArmEligible() is that adaptation, admitting only ch.id
     "dynasty" among challenge runs.
   - The verdict settles at COMPUTE time (dySettle inside showResults,
     the moment realized wins exist), not at presentation time. Reloading
     during the reel or the ceremony cannot un-live a season: the reel is
     replay, the localStorage write already happened. A mid-DRAFT reload
     costs nothing but the redraft, because nothing commits until a
     season completes.
   - State is one versioned localStorage object (t82Dynasty). No D1, no
     worker, no accounts coupling in the alpha; percentile fetch is
     skipped (the open classic pool is the wrong yardstick for a
     shrinking-pool run, and it keeps alpha runs out of that pool).
   QA: ?dynasty=1 opens the gate, ?dynasty=reset wipes the run,
   ?dythr=NN overrides every threshold (app-side only). */
var DY_KEY = "t82Dynasty";
var DY_VER = 2;   // v1 retired "Name|Season"; v2 retires "Name". dyLoad migrates v1 forward.
/* THE BALANCE LEVER. Player-level scarcity removes five whole careers per
   banked season instead of five single years, so the ladder that made sense
   for v48's season-level rule is now punishing on top of a pool that already
   shrinks hard. Lowered a rung across the board and the climb slowed from
   four steps to three: the difficulty is supposed to come from the empty
   pool, not from the number moving away from you at the same time. Nine and
   beyond hold the last rung. Balance the mode by editing this one array;
   ?dythr=NN flattens the whole ladder for a fast read. */
var DY_THRESH = [74, 74, 75, 75, 76, 76, 77, 77];
var DY_SKIPS = 2;         // per season, vs Classic's 1. See dyDealGuard for why.
var DY_CELL_FLOOR = 5;    // fewer legal cards than this and the deal is re-rolled on the house
var DY_REDEAL_MAX = 6;
var DY_BURN = [];         // ?dyburn=N: players pre-retired for QA, in memory only
var DY_QA = (function () {
  var q = {};
  try {
    var p = new URLSearchParams(location.search);
    if (p.get("dynasty") === "reset") q.reset = 1;
    if (p.get("dynasty") === "1") q.open = 1;
    var t = parseInt(p.get("dythr") || "", 10);
    if (t >= 1 && t <= 82) q.thr = t;
    var b = parseInt(p.get("dyburn") || "", 10);
    if (b >= 1 && b <= 400) q.burn = b;
  } catch (e) {}
  return q;
})();
var DY_ACTIVE = null;   // the run object for the season in flight; only meaningful while G.ch.id is "dynasty"
function dyThreshold(d) {
  if (DY_QA.thr) return DY_QA.thr;
  return d <= DY_THRESH.length ? DY_THRESH[d - 1] : DY_THRESH[DY_THRESH.length - 1];
}
/* A v1 run in flight is migrated, not thrown away: "Name|Season" collapses to
   "Name", deduped. The owner's own alpha run survives the rule change, and it
   survives it in the strict direction (every banked season of a player becomes
   that whole player), which is exactly what v2 means. */
function dyMigrate(r) {
  if (r.v === DY_VER) return r;
  if (r.v !== 1) return null;
  var seen = {}, out = [];
  r.retired.forEach(function (k) {
    var n = String(k).split("|")[0];
    if (n && !seen[n]) { seen[n] = 1; out.push(n); }
  });
  r.retired = out;
  r.v = DY_VER;
  r.migratedFrom = 1;
  return r;
}
function dyLoad() {
  try {
    var r = JSON.parse(localStorage.getItem(DY_KEY) || "null");
    if (r && (r.v === 1 || r.v === DY_VER) && Array.isArray(r.retired) && Array.isArray(r.history)) return dyMigrate(r);
  } catch (e) {}
  return null;
}
function dySave(r) { try { r.updatedAt = Date.now(); localStorage.setItem(DY_KEY, JSON.stringify(r)); } catch (e) {} }
function dyWipe() { DY_ACTIVE = null; try { localStorage.removeItem(DY_KEY); } catch (e) {} }
function dyFresh() { return { v: DY_VER, active: 1, dyn: 1, retired: [], history: [], fell: null, startedAt: Date.now(), updatedAt: Date.now() }; }
/* v48.1 THE WHOLE CHANGE: the retirement key is the NAME. v48 keyed
   "Name|Season", so banking 2016 Curry left 2015 Curry on the board and the
   draft stayed "who was good, which years was he great, take those" (owner
   verdict after self-play). Player-level scarcity is the version of the rule
   that actually bites. Everything below is consequence. */
function dyRowKey(row) { return row[IDX.name]; }
function dyRun() { return G && G.ch && G.ch.id === "dynasty" && DY_ACTIVE ? DY_ACTIVE : null; }
function dyNameRetired(name) {
  if (DY_BURN.length && DY_BURN.indexOf(name) !== -1) return true;   // QA only, never persisted
  var r = dyRun();
  return !!(r && r.retired.indexOf(name) !== -1);
}
function dyRafters(r) { return (r ? r.retired.length : 0) + DY_BURN.length; }
function dyAllTime(r) {
  var w = 0, l = 0;
  r.history.forEach(function (h) { w += h.w; l += h.l; });
  if (r.fell) { w += r.fell.w; l += r.fell.l; }
  return { w: w, l: l };
}
function dyChallenge(run) {
  var thr = dyThreshold(run.dyn);
  var n = dyRafters(run);
  var burned = DY_BURN;   // captured so the filter stays self-contained, exactly as run is
  return {
    id: "dynasty",
    name: "SEASON " + run.dyn + " \u00B7 TARGET " + thr,
    blurb: "Win " + thr + " of 82 to bank the season. " + (n
      ? n + (n === 1 ? " player hangs" : " players hang") + " in the rafters."
      : "Every player you bank retires for the rest of the run."),
    filter: function (row) {
      var nm = row[IDX.name];
      return run.retired.indexOf(nm) === -1 && burned.indexOf(nm) === -1;
    }
  };
}
function dyStartSeason() {
  var run = dyLoad();
  if (!run || !run.active) { run = dyFresh(); dySave(run); }
  DY_ACTIVE = run;
  if (DY_QA.burn) dyQaBurn(DY_QA.burn);
  analyticsTrack("dynasty_state", {
    surface: "dynasty", action: run.history.length ? "continue" : "start",
    value: run.dyn, ordinal: dyRafters(run)
  });
  var ch = dyChallenge(run);
  newGame("classic", null, ch, { surface: "dynasty", variant: "dynasty:" + run.dyn });
  if (G && !G.ch) { G.ch = ch; renderDraft(false); }   // belt only: newGame's third arg is the weekly door and lands on G.ch
}
/* Dynasty hands out DOUBLE Classic's skips. This is the player-facing half of
   the dead-cell answer: the owner's second complaint about Classic is that a
   franchise-and-decade cell holding one or two viable players can end a run
   for reasons that have nothing to do with how you played, and player-level
   scarcity makes that worse because burning LeBron burns him out of every
   cell he appears in, not just one. Two team skips and two era skips is
   generous without turning the draft into fishing. Pure state, written after
   newGame: if a future sim-core stops reading these counters the mode simply
   falls back to Classic's 1 and 1. */
function dyGrantSkips() {
  if (!dyRun() || !G || G.dySkipsGranted) return;
  G.dySkipsGranted = 1;   // once per season: the counters decrement across the five rounds like Classic's
  if (typeof G.teamSkips === "number") G.teamSkips = DY_SKIPS;
  if (typeof G.eraSkips === "number") G.eraSkips = DY_SKIPS;
}
/* The automatic half of the dead-cell answer. Skips are the player's lever;
   this is the floor underneath it, so a cell that cannot field a board never
   reaches the screen in the first place and never has to be paid for.

   It re-rolls through the ENGINE'S OWN skip, borrowing a counter and putting
   it back, rather than reaching into the deal: the re-roll consumes rng and
   rides the action stream exactly as a hand-tapped skip does, so the seed
   spine and the replay path stay intact by construction. Legality is counted
   with the real pickBlock, not a lookalike, so the floor means "cards you can
   actually draft right now for the slots you still have open" and not "rows
   in the cell". Bounded, and it accepts a thin board over an endless hunt:
   the guarantee it owes is that the board is never empty. */
function dyLegalCount() {
  var rows = currentPoolRows(), n = 0;
  for (var i = 0; i < rows.length; i++) if (!pickBlock(resolveRow(rows[i][IDX.name]))) n++;
  return n;
}
function dyFreeSkip(kind) {
  var counter = kind === "team" ? "teamSkips" : "eraSkips";
  var targets = kind === "team" ? teamSkipTargets() : eraSkipTargets();
  if (!targets || !targets.length) return false;
  var saved = G[counter], savedBudget = G.budget;
  if (typeof saved === "number") G[counter] = Math.max(saved, 1);
  var f = kind === "team" ? T82.skipTeam(G) : T82.skipEra(G);
  if (typeof saved === "number") G[counter] = saved;         // the house pays for this one
  if (G.budget !== savedBudget) G.budget = savedBudget;      // classic has no bank; belt for any cap-based future
  return !!f;
}
function dyDealGuard() {
  if (!dyRun()) return;
  dyGrantSkips();
  G.query = "";   // renderDraft clears it too, but the count must see the whole cell, not last round's filter
  var tries = 0, moved = 0;
  while (dyLegalCount() < DY_CELL_FLOOR && tries < DY_REDEAL_MAX) {
    tries++;
    if (!dyFreeSkip("team") && !dyFreeSkip("era")) break;
    moved++;
  }
  if (moved) analyticsTrack("dynasty_state", {
    surface: "dynasty", action: "redeal", value: moved,
    ordinal: G.round || 0, amount: dyLegalCount()
  });
}
/* ?dyburn=N pre-retires the N most valuable players in memory (never saved).
   The alpha's whole question is whether the draft is interesting at round six
   with the obvious names gone, and without this you have to win five seasons
   to see round six once. Sorted by the engine's own valueOf so the burn takes
   the same players real play would. */
function dyQaBurn(n) {
  DY_BURN = [];
  try {
    var all = [];
    BEST_BY_NAME.forEach(function (row, name) { all.push([name, valueOf(row)]); });
    all.sort(function (a, b) { return b[1] - a[1]; });
    for (var i = 0; i < Math.min(n, all.length); i++) DY_BURN.push(all[i][0]);
  } catch (e) { DY_BURN = []; }
}
/* The verdict locks the moment realized wins exist. Idempotent: the armed
   path settles inside showResults and the analytic fallback settles at
   finishRunTail; whichever runs first wins and the other is a no-op. */
function dySettle(e) {
  var run = dyRun();
  if (!run || G.dySettled) return;
  G.dySettled = 1;
  var thr = dyThreshold(run.dyn);
  var w = e.winTally, l = CFG.GAMES_IN_SEASON - w;
  var five = G.picks.map(function (p) {
    return { k: dyRowKey(p.row), n: p.row[IDX.name], s: p.row[IDX.season], slot: p.slot };
  });
  var snap = { d: run.dyn, w: w, l: l, thr: thr, net: Math.round(e.net * 10) / 10, five: five };
  if (w >= thr) {
    run.history.push(snap);
    five.forEach(function (f) { if (run.retired.indexOf(f.k) === -1) run.retired.push(f.k); });
    run.dyn += 1;
    G.dyVerdict = { banked: 1, snap: snap };
    analyticsTrack("dynasty_state", { surface: "dynasty", action: "banked", value: snap.d, wins: w, target_wins: thr, ordinal: dyRafters(run) });
  } else {
    run.active = 0;
    run.fell = snap;
    G.dyVerdict = { banked: 0, snap: snap };
    analyticsTrack("dynasty_state", { surface: "dynasty", action: "fell", value: snap.d, wins: w, target_wins: thr, ordinal: dyRafters(run) });
  }
  dySave(run);
}
/* v48.1: the whole player retires, so the NAME is the headline and the season
   he was used in drops to an annotation. v48 bolded the year, which is exactly
   the wrong emphasis now. */
function dyFiveHtml(five) {
  return five.map(function (f) {
    return '<span class="dyv-name"><b>' + esc(f.n) + '</b> <i class="dyv-yr">' + shortSeason(f.s) + '</i></span>';
  }).join("");
}
function dyVerdictHtml(v) {
  var s = v.snap, run = DY_ACTIVE || dyLoad() || dyFresh();
  var att = dyAllTime(run);
  if (v.banked) {
    return '<section class="section dy-verdict dy-banked" data-result-section="dynasty_verdict">' +
      '<p class="dyv-eyebrow">\uD83D\uDC51 THE DYNASTY</p>' +
      '<p class="dyv-stamp">SEASON ' + s.d + ' BANKED</p>' +
      '<p class="dyv-line">' + s.w + ' and ' + s.l + '. Needed ' + s.thr + '.</p>' +
      '<p class="dyv-eyebrow dyv-raft">RETIRED TO THE RAFTERS</p>' +
      '<div class="dyv-five">' + dyFiveHtml(s.five) + '</div>' +
      '<p class="dyv-sub">' + dyRafters(run) + ' player' + (dyRafters(run) === 1 ? "" : "s") + ' retired \u00B7 all time ' + att.w + ' and ' + att.l + '</p>' +
      '<button class="btn btn-primary btn-block presti-spin" id="dyContinueBtn">DRAFT SEASON ' + run.dyn + ' \u00B7 TARGET ' + dyThreshold(run.dyn) + '</button>' +
      '</section>';
  }
  var lived = run.history.length;
  var hall = run.history.map(function (h) {
    return '<div class="dyv-hall-row"><span class="dyv-hall-head">SEASON ' + h.d + ' \u00B7 ' + h.w + ' and ' + h.l + '</span>' +
      '<span class="dyv-hall-five">' + h.five.map(function (f) { return esc(f.n) + " " + shortSeason(f.s); }).join(" \u00B7 ") + '</span></div>';
  }).join("");
  return '<section class="section dy-verdict dy-fell" data-result-section="dynasty_verdict">' +
    '<p class="dyv-eyebrow">\uD83D\uDC51 THE DYNASTY</p>' +
    '<p class="dyv-stamp dyv-dead">THE DYNASTY FALLS</p>' +
    '<p class="dyv-line">Season ' + s.d + ' needed ' + s.thr + '. You won ' + s.w + '.</p>' +
    '<p class="dyv-sub">' + (lived
      ? 'It lived ' + lived + ' season' + (lived === 1 ? "" : "s") + ' \u00B7 all time ' + att.w + ' and ' + att.l
      : 'It never banked a season') + '</p>' +
    (hall ? '<p class="dyv-eyebrow dyv-raft">THE BANKED SEASONS</p><div class="dyv-hall">' + hall + '</div>' : '') +
    '<button class="btn btn-primary btn-block presti-spin" id="dyNewBtn">START A NEW DYNASTY</button>' +
    '<button class="dyv-share" id="dyShareBtn" type="button">SHARE THE OBITUARY</button>' +
    '</section>';
}
function dyShareObit() {
  var run = DY_ACTIVE || dyLoad();
  if (!run || !run.fell) return;
  var att = dyAllTime(run), lived = run.history.length;
  var txt = "TRUE 82 \u00B7 THE DYNASTY\n" +
    "It fell in Season " + run.fell.d + ": needed " + run.fell.thr + ", won " + run.fell.w + ".\n" +
    (lived ? "It lived " + lived + " season" + (lived === 1 ? "" : "s") + ". All time " + att.w + " and " + att.l + ".\n" : "") +
    "https://true82.net/";
  var btn = el("dyShareBtn");
  analyticsTrack("share_open", { surface: "dynasty", action: "obituary", value: lived });
  if (navigator.share) { navigator.share({ text: txt }).catch(function () {}); return; }
  try {
    navigator.clipboard.writeText(txt).then(function () {
      if (btn) { var t = btn.textContent; btn.textContent = "COPIED"; setTimeout(function () { btn.textContent = t; }, 1400); }
    });
  } catch (e) {}
}
function dyInjectVerdict() {
  var v = G.dyVerdict;
  if (!v) return;
  ensureDynastyCss();
  var root = app();
  if (!root) return;
  var board = root.querySelector(".board");
  if (board) board.insertAdjacentHTML("beforebegin", dyVerdictHtml(v));
  else root.insertAdjacentHTML("afterbegin", dyVerdictHtml(v));
  // A dynasty season is settled; it never reruns. The replay action would
  // quietly start a plain Classic run, so it goes away entirely here.
  var again = el("againBtn");
  if (again) { var box = again.closest(".actions"); if (box) box.hidden = true; else again.hidden = true; }
  var c = el("dyContinueBtn");
  if (c) c.addEventListener("click", function () { dyStartSeason(); });
  var nb = el("dyNewBtn");
  if (nb) nb.addEventListener("click", function () { dyWipe(); dyStartSeason(); });
  var sb = el("dyShareBtn");
  if (sb) sb.addEventListener("click", function () { dyShareObit(); });
}
function dyLaunch() {
  if (DATA_READY) { dyStartSeason(); return; }
  PENDING_FN = dyStartSeason;   // same queue contract as the daily and weekly launches
  var b = el("dyGoBtn");
  if (b) { b.disabled = true; b.textContent = "Loading players\u2026"; }
}
/* v48 could show scarcity inside the year dropdown, because only single
   seasons retired and the player stayed on the board wearing a RETIRED tag.
   v48.1 removes him from the board entirely, so the rule becomes invisible at
   exactly the moment it starts to matter. These two surfaces are the
   replacement: the full roll on the gate, and a name-aware answer in the
   draft when you go looking for someone you already spent. */
function dyRaftersRollHtml(run) {
  var names = (run ? run.retired : []).concat(DY_BURN);
  if (!names.length) return "";
  return '<div class="dy-roll"><p class="dyv-eyebrow">IN THE RAFTERS \u00B7 ' + names.length + '</p><p class="dy-roll-names">' +
    names.map(function (n) { return esc(n); }).join(" \u00B7 ") + '</p></div>';
}
function dyGoneNoteHtml() {
  var run = dyRun();
  if (!run) return "";
  var q = (G.query || "").trim().toLowerCase();
  if (!q) return "";
  var hits = run.retired.concat(DY_BURN).filter(function (n) { return n.toLowerCase().indexOf(q) !== -1; });
  if (!hits.length) return "";
  return '<div class="dy-gone"><span class="dy-gone-tag">IN THE RAFTERS</span>' +
    hits.slice(0, 8).map(function (n) { return '<span class="dy-gone-name">' + esc(n) + "</span>"; }).join("") +
    (hits.length > 8 ? '<span class="dy-gone-name">and ' + (hits.length - 8) + " more</span>" : "") + "</div>";
}
function poolBodyHtml(rows) { return poolInnerHtml(rows) + dyGoneNoteHtml(); }
function renderDynastyGate() {
  ensureDynastyCss();
  document.body.classList.remove("drafting");
  document.body.classList.remove("gating");
  var run = dyLoad();
  var inner;
  if (run && run.active && run.history.length) {
    var att = dyAllTime(run), nRaft = dyRafters(run);
    inner = '<p class="eyebrow">\uD83D\uDC51 DYNASTY \u00B7 IN PROGRESS</p>' +
      '<h1 class="intro-title">Season ' + run.dyn + ' waits</h1>' +
      '<p class="intro-lead">The run is ' + run.history.length + ' season' + (run.history.length === 1 ? "" : "s") + ' deep. All time ' + att.w + ' and ' + att.l + '. ' +
      nRaft + (nRaft === 1 ? ' player hangs' : ' players hang') + ' in the rafters, and the target is ' + dyThreshold(run.dyn) + ' wins.</p>' +
      dyRaftersRollHtml(run) +
      '<button class="btn btn-primary btn-block presti-spin" id="dyGoBtn">DRAFT SEASON ' + run.dyn + '</button>' +
      '<button class="dy-abandon" id="dyAbandonBtn" type="button">END THE DYNASTY</button>';
  } else if (run && !run.active && run.fell) {
    var att2 = dyAllTime(run), lived = run.history.length;
    inner = '<p class="eyebrow">\uD83D\uDC51 DYNASTY \u00B7 THE OBITUARY</p>' +
      '<h1 class="intro-title">It fell in Season ' + run.fell.d + '</h1>' +
      '<p class="intro-lead">Needed ' + run.fell.thr + ', won ' + run.fell.w + '. ' +
      (lived ? 'It lived ' + lived + ' season' + (lived === 1 ? "" : "s") + ', all time ' + att2.w + ' and ' + att2.l + '.' : 'It never banked a season.') + '</p>' +
      '<button class="btn btn-primary btn-block presti-spin" id="dyGoBtn">START A NEW DYNASTY</button>';
  } else {
    inner = '<p class="eyebrow">\uD83D\uDC51 DYNASTY \u00B7 ALPHA</p>' +
      '<h1 class="intro-title">How long can you keep it alive?</h1>' +
      '<p class="intro-lead">Classic rules, season after season. Bank a season by hitting the win target and all five players retire for the rest of the run. Not the season you used. The player. The pool only shrinks.</p>' +
      '<p class="intro-lead dy-fine">Bank LeBron and LeBron is gone, every year, every team. You get two team skips and two era skips a season. The run ends the first time you miss the target.</p>' +
      '<button class="btn btn-primary btn-block presti-spin" id="dyGoBtn">BEGIN THE DYNASTY</button>';
  }
  app().innerHTML = '<section class="ticket intro dy-gate">' + inner +
    '<button class="startover-btn dy-back" id="dyBackBtn" type="button">\u2039 Back</button></section>';
  analyticsTrack("mode_impression", { surface: "dynasty_gate", action: run && run.active && run.history.length ? "resume" : (run && run.fell ? "obituary" : "fresh") });
  el("dyGoBtn").addEventListener("click", function () {
    var r = dyLoad();
    if (r && !r.active) dyWipe();   // the obituary's button starts clean
    dyLaunch();
  });
  el("dyBackBtn").addEventListener("click", function () { renderIntro(); });
  var ab = el("dyAbandonBtn");
  if (ab) ab.addEventListener("click", function () {
    if (!ab.dataset.arm) {
      ab.dataset.arm = "1";
      ab.textContent = "TAP AGAIN TO END IT";
      setTimeout(function () { if (ab.isConnected) { delete ab.dataset.arm; ab.textContent = "END THE DYNASTY"; } }, 4000);
      return;
    }
    var r = dyLoad();
    analyticsTrack("dynasty_state", { surface: "dynasty", action: "abandon", value: r ? r.dyn : 0, ordinal: r ? r.retired.length : 0 });
    dyWipe();
    renderDynastyGate();
  });
}
function ensureDynastyCss() {
  if (document.getElementById("t82DynastyCss")) return;
  var st = document.createElement("style");
  st.id = "t82DynastyCss";
  st.textContent =
    ".dy-gate .intro-lead.dy-fine{font-size:14px;color:#8b98a5}" +
    ".dy-gate .btn{margin-top:12px}" +
    ".dy-abandon{display:block;margin:14px auto 0;background:none;border:1px dashed #4d5a67;border-radius:9px;" +
      "color:#9fabb7;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.1em;padding:10px 16px;cursor:pointer}" +
    ".dy-back{margin-top:16px}" +
    ".dy-verdict{position:relative;text-align:center;border:2px solid #FFB52E;border-radius:18px;padding:18px 16px 16px;" +
      "background:linear-gradient(180deg,#1a2129,#141a21);" +
      "box-shadow:0 0 0 1px rgba(255,181,46,.25),0 0 26px rgba(255,181,46,.16)}" +
    ".dy-verdict.dy-fell{border-color:#E5533C;box-shadow:0 0 0 1px rgba(229,83,60,.25),0 0 26px rgba(229,83,60,.14)}" +
    ".dyv-eyebrow{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.22em;color:#8b98a5}" +
    ".dyv-stamp{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:34px;line-height:1;" +
      "letter-spacing:.04em;color:#FFB52E;margin-top:6px;text-transform:uppercase}" +
    ".dyv-stamp.dyv-dead{color:#E5533C}" +
    ".dyv-line{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:20px;color:#f2ede4;margin-top:5px}" +
    ".dyv-raft{margin-top:12px}" +
    ".dyv-five{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 12px;margin-top:7px}" +
    ".dyv-name{font-size:14px;color:#c9d2da}" +
    ".dyv-name b{color:#FFB52E;font-weight:600}" +
    ".dyv-sub{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.08em;color:#8b98a5;margin-top:10px}" +
    ".dy-verdict .btn{margin-top:13px}" +
    ".dyv-share{display:block;width:100%;margin-top:10px;background:none;border:1px solid #2c343d;border-radius:11px;" +
      "height:44px;color:#c9d2da;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:17px;letter-spacing:.08em;cursor:pointer}" +
    ".dyv-hall{margin-top:7px;display:flex;flex-direction:column;gap:8px}" +
    ".dyv-hall-row{display:flex;flex-direction:column;gap:2px}" +
    ".dyv-hall-head{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.1em;color:#FFB52E}" +
    ".dyv-hall-five{font-size:13px;color:#a8b0b8}" +
    // v48.1
    ".dyv-yr{font-style:normal;color:#8b98a5}" +
    ".dy-roll{margin:14px 0 4px;text-align:left;border-top:1px solid #2a323b;padding-top:12px}" +
    ".dy-roll-names{margin-top:5px;font-size:13px;line-height:1.5;color:#a8b0b8;max-height:132px;overflow-y:auto;" +
      "border-bottom:1px solid #2a323b;padding-bottom:6px}" +
    ".dy-gone{margin:10px 4px 0;padding:9px 11px;border:1px dashed #4d5a67;border-radius:10px;" +
      "display:flex;flex-wrap:wrap;align-items:center;gap:8px}" +
    ".dy-gone-tag{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.16em;color:#FFB52E}" +
    ".dy-gone-name{font-size:13px;color:#8b98a5;text-decoration:line-through}";
  document.head.appendChild(st);
}


/* ---------- v49 THE REDRAFT (alpha) ----------
   "Class of 2016. Three GMs. One board."
   The Redraftables experience, playable: a snake draft against two computer
   GMs over one small, shared, exhaustible pool (the viable 2016 entering
   class), five players a team, exclusive picks, then the real engine settles
   the argument with three 82-game seasons and a podium.

   ARCHITECTURE (the engine stays a black box, again):
   - The draft is ENTIRELY app-side. It never touches newGame, dealRound,
     applyPick, or the cell machinery: the pool is not a franchise+decade
     cell and no amount of challenge-filter cleverness makes it one (the
     Dynasty open-pool wall, same shape). Three roster arrays, a snake
     sequence, and a legality check built from the same primitives Classic
     trusts: rowBuckets, BUCKET_CAP via SD_CFG, valueOf.
   - The ENGINE is used exactly twice per team, at the end: T82.engine on a
     throwaway classic newState G for the analytic verdict, then armSeasonSim
     + simSeason on that same throwaway G so each team's 82 realizes from its
     OWN fresh rng stream. No shared seeds, no replay path, no leaderboard
     submission, so the seed spine has nothing to protect here; the classic
     PG_CAP override is re-asserted first in case the previous run was
     Presti (which sets it to 1).
   - The pool is a UNION over POOL_YEARS: every eligible (785+ min) season a
     class member has anywhere in the dataset, deduped by season+team, best
     season by valueOf as the default, buckets = the union across those
     seasons. Names live in ONE config array (SD_CLASSES) so the next class
     is a copy-paste; names that fail to resolve against live data are
     dropped and console-logged, and the gate refuses to start below 15.
   - NOBODY CAN BE STRANDED. The one genuinely new algorithm: before any
     pick (human or AI) is allowed, a Hall's-condition check over the three
     bucket types proves every team can still legally finish against the
     remaining supply. A pick that would strand ANY team renders barred with
     deny copy naming the position. Stealing the last center is legal right
     up until it makes the board unfinishable; that is the tension the mode
     exists for, minus the bug.
   - SD_CFG carries rosterSize and the caps so an 8-man variant is a config
     question, not a rewrite. The sim still only fields five; see the
     handoff for what an 8-man lineup would actually cost.
   State is in-memory only. A mid-draft reload costs the draft, same price
   as Dynasty's mid-draft reload. QA: ?redraft=1 deep-opens the gate. */
var SD_CFG = { rosterSize: 5, caps: { G: 2, F: 2, C: 1 } };
var SD_CLASSES = {
  /* Entries may carry alternate spellings after a pipe: "Luka Doncic|Luka Dončić".
     The pool builder accepts ANY variant and displays the data's own name, so a
     diacritic or a Jr. suffix mismatch degrades to nothing instead of a hole. */
  "2016": {
    label: "CLASS OF 2016",
    blurb: "Simmons, Ingram, and the late-round heist.",
    names: [
      "Ben Simmons", "Brandon Ingram", "Jaylen Brown", "Pascal Siakam",
      "Domantas Sabonis", "Jamal Murray", "Dejounte Murray", "Malcolm Brogdon",
      "Fred VanVleet", "Buddy Hield", "Caris LeVert", "Jakob Poeltl",
      "Ivica Zubac", "Alex Caruso", "Dorian Finney-Smith", "Malik Beasley",
      "Gary Payton II", "Derrick Jones Jr.|Derrick Jones", "Marquese Chriss", "Taurean Prince"
    ],
    /* Real draft position, undrafted names simply absent. Board order only;
       the engine never reads this. */
    picks: { "Ben Simmons": 1, "Brandon Ingram": 2, "Jaylen Brown": 3, "Buddy Hield": 6, "Jamal Murray": 7, "Marquese Chriss": 8, "Jakob Poeltl": 9, "Domantas Sabonis": 11, "Taurean Prince": 12, "Malik Beasley": 19, "Caris LeVert": 20, "Pascal Siakam": 27, "Dejounte Murray": 29, "Ivica Zubac": 32, "Malcolm Brogdon": 36 }
  },
  "2017": {
    label: "CLASS OF 2017",
    blurb: "Two-way wings as far as the board sees.",
    names: [
      "Jayson Tatum", "Donovan Mitchell", "De'Aaron Fox", "Bam Adebayo",
      "Jarrett Allen", "Lauri Markkanen", "OG Anunoby", "John Collins",
      "Kyle Kuzma", "Derrick White", "Lonzo Ball", "Josh Hart",
      "Dillon Brooks", "Malik Monk", "Luke Kennard", "Jonathan Isaac",
      "Zach Collins", "Thomas Bryant", "Monte Morris"
    ],
    /* Real draft position, undrafted names simply absent. Board order only;
       the engine never reads this. */
    picks: { "Lonzo Ball": 2, "Jayson Tatum": 3, "De'Aaron Fox": 5, "Jonathan Isaac": 6, "Lauri Markkanen": 7, "Zach Collins": 10, "Malik Monk": 11, "Luke Kennard": 12, "Donovan Mitchell": 13, "Bam Adebayo": 14, "John Collins": 19, "Jarrett Allen": 22, "OG Anunoby": 23, "Kyle Kuzma": 27, "Derrick White": 29, "Josh Hart": 30, "Thomas Bryant": 42, "Dillon Brooks": 45, "Monte Morris": 51 }
  },
  "2018": {
    label: "CLASS OF 2018",
    blurb: "Three franchise guards and one ball. Good luck.",
    names: [
      "Luka Doncic|Luka Don\u010di\u0107", "Shai Gilgeous-Alexander", "Trae Young",
      "Jaren Jackson Jr.|Jaren Jackson", "Jalen Brunson", "Mikal Bridges",
      "Deandre Ayton", "Wendell Carter Jr.|Wendell Carter", "Marvin Bagley III|Marvin Bagley",
      "Michael Porter Jr.|Michael Porter", "Miles Bridges", "Kevin Huerter",
      "De'Anthony Melton", "Robert Williams", "Mitchell Robinson", "Collin Sexton",
      "Anfernee Simons", "Bruce Brown", "Gary Trent Jr.|Gary Trent",
      "Grayson Allen", "Donte DiVincenzo"
    ],
    /* Real draft position, undrafted names simply absent. Board order only;
       the engine never reads this. */
    picks: { "Deandre Ayton": 1, "Marvin Bagley III": 2, "Luka Doncic": 3, "Jaren Jackson Jr.": 4, "Trae Young": 5, "Wendell Carter Jr.": 7, "Collin Sexton": 8, "Mikal Bridges": 10, "Shai Gilgeous-Alexander": 11, "Miles Bridges": 12, "Michael Porter Jr.": 14, "Donte DiVincenzo": 17, "Kevin Huerter": 19, "Grayson Allen": 21, "Anfernee Simons": 24, "Robert Williams": 27, "Jalen Brunson": 33, "Mitchell Robinson": 36, "Gary Trent Jr.": 37, "Bruce Brown": 42, "De'Anthony Melton": 46 }
  },
  "2019": {
    label: "CLASS OF 2019",
    blurb: "Stars with asterisks, benches full of famous role players.",
    names: [
      "Ja Morant", "Zion Williamson", "Darius Garland", "Tyler Herro",
      "RJ Barrett", "De'Andre Hunter", "Cam Johnson|Cameron Johnson", "Brandon Clarke",
      "Grant Williams", "PJ Washington|P.J. Washington", "Keldon Johnson", "Nic Claxton|Nicolas Claxton",
      "Daniel Gafford", "Coby White", "Jordan Poole", "Naz Reid",
      "Terance Mann", "Matisse Thybulle", "Rui Hachimura", "Jaxson Hayes",
      "Nickeil Alexander-Walker"
    ],
    /* Real draft position, undrafted names simply absent. Board order only;
       the engine never reads this. */
    picks: { "Zion Williamson": 1, "Ja Morant": 2, "RJ Barrett": 3, "De'Andre Hunter": 4, "Darius Garland": 5, "Coby White": 7, "Jaxson Hayes": 8, "Rui Hachimura": 9, "Cam Johnson": 11, "PJ Washington": 12, "Tyler Herro": 13, "Nickeil Alexander-Walker": 17, "Matisse Thybulle": 20, "Brandon Clarke": 21, "Grant Williams": 22, "Jordan Poole": 28, "Keldon Johnson": 29, "Nic Claxton": 31, "Daniel Gafford": 38, "Terance Mann": 48 }
  },
  "2020": {
    label: "CLASS OF 2020",
    blurb: "Guards everywhere. Centers, four. Count them.",
    names: [
      "Anthony Edwards", "Tyrese Haliburton", "LaMelo Ball", "Desmond Bane",
      "Tyrese Maxey", "Immanuel Quickley", "Onyeka Okongwu", "Isaiah Stewart",
      "Precious Achiuwa", "Payton Pritchard", "Saddiq Bey", "Devin Vassell",
      "Aaron Nesmith", "Jaden McDaniels", "Cole Anthony", "Isaac Okoro",
      "Obi Toppin", "Deni Avdija", "James Wiseman", "Naji Marshall"
    ],
    /* Real draft position, undrafted names simply absent. Board order only;
       the engine never reads this. */
    picks: { "Anthony Edwards": 1, "James Wiseman": 2, "LaMelo Ball": 3, "Isaac Okoro": 5, "Onyeka Okongwu": 6, "Obi Toppin": 8, "Deni Avdija": 9, "Devin Vassell": 11, "Tyrese Haliburton": 12, "Aaron Nesmith": 14, "Cole Anthony": 15, "Isaiah Stewart": 16, "Saddiq Bey": 19, "Precious Achiuwa": 20, "Tyrese Maxey": 21, "Immanuel Quickley": 25, "Payton Pritchard": 26, "Jaden McDaniels": 28, "Desmond Bane": 30 }
  },
  "2021": {
    label: "CLASS OF 2021",
    blurb: "The playmaking bigs. And Reaves went undrafted.",
    names: [
      "Cade Cunningham", "Evan Mobley", "Scottie Barnes", "Franz Wagner",
      "Josh Giddey", "Alperen Sengun|Alperen \u015eeng\u00fcn", "Jalen Green", "Jonathan Kuminga",
      "Trey Murphy III|Trey Murphy", "Herbert Jones|Herb Jones", "Ayo Dosunmu", "Jalen Suggs",
      "Moses Moody", "Jalen Johnson", "Cam Thomas", "Bones Hyland|Nah'Shon Hyland",
      "Isaiah Jackson", "Quentin Grimes", "Austin Reaves", "Day'Ron Sharpe",
      "Davion Mitchell"
    ],
    /* Real draft position, undrafted names simply absent. Board order only;
       the engine never reads this. */
    picks: { "Cade Cunningham": 1, "Jalen Green": 2, "Evan Mobley": 3, "Scottie Barnes": 4, "Jalen Suggs": 5, "Josh Giddey": 6, "Jonathan Kuminga": 7, "Franz Wagner": 8, "Davion Mitchell": 9, "Moses Moody": 14, "Alperen Sengun": 16, "Trey Murphy III": 17, "Jalen Johnson": 20, "Isaiah Jackson": 22, "Quentin Grimes": 25, "Bones Hyland": 26, "Cam Thomas": 27, "Day'Ron Sharpe": 29, "Herbert Jones": 35, "Ayo Dosunmu": 38 }
  },
  "1996": {
    label: "CLASS OF 1996",
    blurb: "Kobe, Iverson, Nash, and the best undrafted player ever.",
    names: [
      "Kobe Bryant", "Allen Iverson", "Ray Allen", "Steve Nash",
      "Marcus Camby", "Stephon Marbury", "Antoine Walker", "Peja Stojakovic|Peja Stojakovi\u0107",
      "Jermaine O'Neal", "Zydrunas Ilgauskas|\u017dydr\u016bnas Ilgauskas", "Ben Wallace", "Derek Fisher",
      "Shareef Abdur-Rahim", "Kerry Kittles", "Erick Dampier", "Malik Rose"
    ],
    /* Real draft position, undrafted names simply absent. Board order only;
       the engine never reads this. */
    picks: { "Allen Iverson": 1, "Marcus Camby": 2, "Shareef Abdur-Rahim": 3, "Stephon Marbury": 4, "Ray Allen": 5, "Antoine Walker": 6, "Kerry Kittles": 8, "Erick Dampier": 10, "Kobe Bryant": 13, "Peja Stojakovic": 14, "Steve Nash": 15, "Jermaine O'Neal": 17, "Zydrunas Ilgauskas": 20, "Derek Fisher": 24, "Malik Rose": 44 }
  },
  "2003": {
    label: "CLASS OF 2003",
    blurb: "Four Hall of Famers at the top. Chris Kaman in the middle.",
    names: [
      "LeBron James", "Dwyane Wade", "Carmelo Anthony", "Chris Bosh",
      "David West", "Josh Howard", "Boris Diaw", "Kyle Korver",
      "Mo Williams|Maurice Williams", "Kirk Hinrich", "Chris Kaman", "Nick Collison",
      "Kendrick Perkins", "Zaza Pachulia", "Leandro Barbosa", "Udonis Haslem",
      "Matt Bonner", "Steve Blake", "T.J. Ford|TJ Ford"
    ],
    /* Real draft position, undrafted names simply absent. Board order only;
       the engine never reads this. */
    picks: { "LeBron James": 1, "Carmelo Anthony": 3, "Chris Bosh": 4, "Dwyane Wade": 5, "Chris Kaman": 6, "Kirk Hinrich": 7, "T.J. Ford": 8, "Nick Collison": 12, "David West": 18, "Boris Diaw": 21, "Kendrick Perkins": 27, "Leandro Barbosa": 28, "Josh Howard": 29, "Steve Blake": 38, "Zaza Pachulia": 42, "Matt Bonner": 45, "Mo Williams": 47, "Kyle Korver": 51 }
  },
  "2009": {
    label: "CLASS OF 2009",
    blurb: "Curry and Harden at the top. One real center if you squint.",
    names: [
      "Stephen Curry", "James Harden", "Blake Griffin", "DeMar DeRozan",
      "Jrue Holiday", "Ty Lawson", "Jeff Teague", "Darren Collison",
      "Brandon Jennings", "Tyreke Evans", "Ricky Rubio", "Taj Gibson",
      "DeMarre Carroll", "Danny Green", "Patrick Beverley", "Wesley Matthews",
      "Patty Mills|Patrick Mills", "DeJuan Blair", "Jordan Hill", "Jodie Meeks"
    ],
    /* Real draft position, undrafted names simply absent. Board order only;
       the engine never reads this. */
    picks: { "Blake Griffin": 1, "James Harden": 3, "Tyreke Evans": 4, "Ricky Rubio": 5, "Stephen Curry": 7, "Jordan Hill": 8, "DeMar DeRozan": 9, "Brandon Jennings": 10, "Jrue Holiday": 17, "Ty Lawson": 18, "Jeff Teague": 19, "Darren Collison": 21, "Taj Gibson": 26, "DeMarre Carroll": 27, "DeJuan Blair": 37, "Jodie Meeks": 41, "Patrick Beverley": 42, "Danny Green": 46, "Patty Mills": 55 }
  }
};
var SD_CLASS_ORDER = ["2016", "2017", "2018", "2019", "2020", "2021", "1996", "2003", "2009"];
var SD_CLASS_ID = "2016";
/* The two rival GMs. needW weights how hard roster need pulls against raw
   value; scW rewards grabbing a scarce position before it dries up; jitter
   is the tie-band within which the pick randomizes so games differ. These
   three numbers are the whole personality system, on purpose. */
var SD_GMS = [
  { name: "YOU", ai: 0 },
  { name: "MERCER", ai: 1, tag: "best player alive, every pick", needW: 0.2, scW: 0.25, jitter: 0.6 },
  { name: "QUINCY", ai: 1, tag: "drafts the team, not the name", needW: 1.5, scW: 0.9, jitter: 0.25 }
];
function sdParseQa(search) {
  try {
    var v = new URLSearchParams(search).get("redraft");
    if (!v) return {};
    return { open: 1, cls: /^\d{4}$/.test(v) ? v : null };   // ?redraft=1 opens; ?redraft=2018 opens ON that class
  } catch (e) { return {}; }
}
var SD_QA = sdParseQa(location.search);
var SD_POOLS = {};     // classId -> built pool, so switching classes never serves a stale board
var SD = null;         // the draft in flight; in-memory only
var SD_TIMER = 0;      // pending AI beat, so back-out can cancel it

function sdBuildPool() {
  var id = SD_CLASS_ID;
  if (SD_POOLS[id]) return SD_POOLS[id];
  var entries = SD_CLASSES[id].names;
  var variantOf = {}, i, j;
  for (i = 0; i < entries.length; i++) {
    var vs = entries[i].split("|");
    for (j = 0; j < vs.length; j++) variantOf[vs[j]] = i;
  }
  var recs = {};   // entry index -> rec, displayed under the DATA's own spelling
  POOL_YEARS.forEach(function (cell) {
    cell.forEach(function (rows, name) {
      var ei = variantOf[name];
      if (ei === undefined) return;
      var rec = recs[ei];
      if (!rec) { rec = { name: name, seasons: [], seen: {} }; recs[ei] = rec; }
      for (var k = 0; k < rows.length; k++) {
        var r = rows[k];
        if (r[IDX.mp] < 785) continue;   // the same eligibility floor as everywhere else
        var key = r[IDX.season] + "|" + r[IDX.team];
        if (rec.seen[key]) continue;
        rec.seen[key] = 1;
        rec.seasons.push(r);
      }
    });
  });
  var list = [], missing = [], byName = new Map();
  for (i = 0; i < entries.length; i++) {
    var rec2 = recs[i];
    if (!rec2 || !rec2.seasons.length) { missing.push(entries[i].split("|")[0]); continue; }
    rec2.seasons.sort(function (a, b) { return (a[IDX.season] - b[IDX.season]) || cmpName(a, b); });
    var best = rec2.seasons[0], bset = {};
    rec2.seasons.forEach(function (r) {
      if (valueOf(r) > valueOf(best)) best = r;
      rowBuckets(r).forEach(function (b) { bset[b] = 1; });
    });
    rec2.best = best;
    rec2.buckets = Object.keys(bset);
    var pm = 0;
    rec2.seasons.forEach(function (r) { if ((r[IDX.mp] || 0) > pm) pm = r[IDX.mp] || 0; });
    rec2.peakMp = pm;
    rec2.pick = (SD_CLASSES[id].picks && SD_CLASSES[id].picks[entries[i].split("|")[0]]) || null;
    delete rec2.seen;
    list.push(rec2);
    byName.set(rec2.name, rec2);
  }
  if (missing.length) try { console.info("[redraft] " + SD_CLASSES[id].label + " names not in live data, dropped:", missing.join(", ")); } catch (e) {}
  SD_POOLS[id] = { list: list, byName: byName, missing: missing };
  return SD_POOLS[id];
}
function sdShuffle(a) {
  a = a.slice();
  for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function sdFresh() {
  var seats = sdShuffle([0, 1, 2]);   // seats[k] = which GM drafts k-th in round 1
  var seq = [], r, k;
  for (r = 0; r < SD_CFG.rosterSize; r++) {
    for (k = 0; k < seats.length; k++) seq.push(seats[r % 2 ? seats.length - 1 - k : k]);
  }
  return {
    cls: SD_CLASS_ID, seats: seats, seq: seq, at: 0,
    rosters: [[], [], []],          // per GM: [{row, slot}]
    taken: {},                      // name -> gm index
    yearByName: {},                 // the human's season choices
    randByName: {},                 // the human's random default season per player, stable per draft
    selected: null, log: [], done: 0, verdict: null
  };
}
function sdRosterOpen(gi) {
  var used = { G: 0, F: 0, C: 0 };
  SD.rosters[gi].forEach(function (p) { used[p.slot]++; });
  var open = [];
  Object.keys(SD_CFG.caps).forEach(function (b) { if (used[b] < SD_CFG.caps[b]) open.push(b); });
  return open;
}
function sdOpenCount(gi, b) {
  var used = 0;
  SD.rosters[gi].forEach(function (p) { if (p.slot === b) used++; });
  return SD_CFG.caps[b] - used;
}
function sdAvailable() {
  return sdBuildPool().list.filter(function (p) { return SD.taken[p.name] == null; });
}
/* Board order is basketball, not the answer key: real draft position first,
   undrafted after them by their biggest season of minutes, names as the tie
   break. Ordering by valueOf leaked the engine's own board to the human
   (owner ruling 2026-08-05). The rival GMs never read this order. */
function sdBoardOrder(list) {
  return list.slice().sort(function (a, b) {
    var ap = a.pick != null, bp = b.pick != null;
    if (ap && bp && a.pick !== b.pick) return a.pick - b.pick;
    if (ap !== bp) return ap ? -1 : 1;
    if (!ap && !bp && a.peakMp !== b.peakMp) return (b.peakMp || 0) - (a.peakMp || 0);
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  });
}
/* The human's DEFAULT season is a random eligible year, stable for the whole
   draft, not the engine's favorite year. Knowing which season was the peak is
   the skill this mode tests; best-by-value as the default was an answer key
   (owner ruling 2026-08-05). Explicit dropdown choices still win, and the
   rival GMs still pick their own best rows through sdBestRowFor. */
function sdDefaultRow(rec) {
  if (!SD || !SD.randByName) return rec.best;
  var key = SD.randByName[rec.name];
  if (key == null) {
    var r0 = rec.seasons[Math.floor(Math.random() * rec.seasons.length)];
    key = r0[IDX.season] + "|" + r0[IDX.team];
    SD.randByName[rec.name] = key;
  }
  for (var i = 0; i < rec.seasons.length; i++) {
    var r = rec.seasons[i];
    if (r[IDX.season] + "|" + r[IDX.team] === key) return r;
  }
  return rec.best;   // belt: a stored key that stopped resolving against the pool
}
function sdChosenRow(name) {
  var rec = sdBuildPool().byName.get(name);
  if (!rec) return null;
  var want = SD.yearByName[name];
  if (want != null) for (var i = 0; i < rec.seasons.length; i++) {
    if (rec.seasons[i][IDX.season] === want) return rec.seasons[i];
  }
  return sdDefaultRow(rec);
}
/* Best season of a player that qualifies at bucket b: the row an AI drafts
   with, and the row the strand-guard credits him for. */
function sdBestRowFor(name, b) {
  var rec = sdBuildPool().byName.get(name);
  if (!rec) return null;
  var best = null;
  rec.seasons.forEach(function (r) {
    if (rowBuckets(r).indexOf(b) === -1) return;
    if (!best || valueOf(r) > valueOf(best)) best = r;
  });
  return best;
}
/* THE STRAND GUARD. Hypothetically give `name` to team gi at bucket b, then
   ask: can every team still finish? Needs are counted per bucket across all
   three teams; supply is every remaining player, credited at the UNION of
   buckets his eligible seasons reach (any season can be chosen, so the union
   is the honest capacity). Hall's condition over the 7 non-empty subsets of
   {G,F,C} is exact for this shape: feasible iff for every subset S,
   need(S) <= players who qualify somewhere in S. */
function sdHall(need, supplies) {
  // Hall's condition over the three bucket types. need = open-slot counts;
  // supplies = one bucket-array per available player. Returns the offending
  // subset when infeasible, null when a full legal assignment still exists.
  var subsets = [["G"], ["F"], ["C"], ["G", "F"], ["G", "C"], ["F", "C"], ["G", "F", "C"]];
  for (var s = 0; s < subsets.length; s++) {
    var S = subsets[s], nd = 0, sp = 0;
    S.forEach(function (bk) { nd += need[bk]; });
    supplies.forEach(function (bs) {
      for (var i = 0; i < S.length; i++) if (bs.indexOf(S[i]) !== -1) { sp++; return; }
    });
    if (nd > sp) return S;
  }
  return null;
}
function sdFeasibleAfter(name, gi, b) {
  var need = { G: 0, F: 0, C: 0 };
  for (var t = 0; t < 3; t++) {
    Object.keys(SD_CFG.caps).forEach(function (bk) {
      need[bk] += sdOpenCount(t, bk) - (t === gi && bk === b ? 1 : 0);
    });
  }
  var supplies = [];
  sdAvailable().forEach(function (p) { if (p.name !== name) supplies.push(p.buckets); });
  return sdHall(need, supplies);
}
/* Can this class field three complete legal teams at all? Run before any
   draft starts, so a center-starved class refuses at the gate with a reason
   instead of finishing a three-man draft. */
function sdClassViable(pool) {
  var need = {};
  Object.keys(SD_CFG.caps).forEach(function (b) { need[b] = SD_CFG.caps[b] * 3; });
  return sdHall(need, pool.list.map(function (p) { return p.buckets; }));
}
function sdStrandWhy(S) {
  var names = { G: "guard", F: "forward", C: "center" };
  return "That strands the board at " + S.map(function (b) { return names[b]; }).join(" and ") + ". Somebody could not finish.";
}
/* Card-level legality for the CURRENT drafter: null = pickable somewhere. */
function sdPickBlock(name, gi) {
  if (SD.taken[name] != null) return { tag: "taken", why: "Already drafted." };
  var open = sdRosterOpen(gi), okBucket = null, strand = null;
  for (var i = 0; i < open.length; i++) {
    var b = open[i];
    if (!sdBestRowFor(name, b)) continue;         // no season qualifies here
    var S = sdFeasibleAfter(name, gi, b);
    if (!S) { okBucket = b; break; }
    strand = S;
  }
  if (okBucket) return null;
  if (strand) return { tag: "strand", why: sdStrandWhy(strand) };
  return { tag: "full", why: "No open slot fits him." };
}
function sdApplyPick(gi, name, row, bucket) {
  SD.rosters[gi].push({ row: row, slot: bucket });
  SD.taken[name] = gi;
  SD.log.push({ gi: gi, name: name, s: row[IDX.season], slot: bucket, at: SD.at });
}
/* The rival GM. Score every legal (player, bucket) pair:
   value of his best qualifying season, plus how much this GM's roster needs
   the bucket, plus how scarce the bucket's remaining supply is against the
   whole board's remaining need. Randomize inside the persona's tie band. */
function sdAiChoose(gi) {
  // Robust to a persona-less seat (the human), so this doubles as an
  // autopick: missing weights read as zero and the tie band collapses.
  var gm = SD_GMS[gi] || {}, open = sdRosterOpen(gi), avail = sdAvailable();
  var needW = gm.needW || 0, scW = gm.scW || 0, jit = gm.jitter || 0;
  var need = { G: 0, F: 0, C: 0 }, t, cands = [];
  for (t = 0; t < 3; t++) Object.keys(need).forEach(function (b) { need[b] += sdOpenCount(t, b); });
  var supply = { G: 0, F: 0, C: 0 };
  avail.forEach(function (p) { p.buckets.forEach(function (b) { supply[b]++; }); });
  avail.forEach(function (p) {
    open.forEach(function (b) {
      var row = sdBestRowFor(p.name, b);
      if (!row) return;
      if (sdFeasibleAfter(p.name, gi, b)) return;   // the guard binds the AI exactly as it binds you
      var v = valueOf(row);
      var needScore = sdOpenCount(gi, b) / SD_CFG.caps[b];                     // 1 when the slot is wide open
      var scScore = need[b] > 0 ? Math.max(0, 1 - (supply[b] - need[b]) / 6) : 0;  // rises as slack drains
      cands.push({ name: p.name, row: row, b: b, score: v + needW * needScore + scW * scScore });
    });
  });
  if (!cands.length) return null;   // unreachable while the guard holds; belt for a corrupt state
  cands.sort(function (a, b) { return b.score - a.score; });
  var band = cands.filter(function (c) { return cands[0].score - c.score <= jit; });
  return band[Math.floor(Math.random() * band.length)] || cands[0];
}
function sdCurrentGm() { return SD.done ? -1 : SD.seq[SD.at]; }
function sdAdvance() {
  if (SD.at >= SD.seq.length) { sdFinish(); return; }
  var gi = SD.seq[SD.at];
  if (!SD_GMS[gi].ai) { SD.selected = null; renderShowdownDraft(); return; }
  renderShowdownDraft();   // show the board waiting on the rival
  SD_TIMER = setTimeout(function () {
    SD_TIMER = 0;
    if (!SD || SD.done) return;
    var c = sdAiChoose(gi);
    if (!c) { SD.at = SD.seq.length; sdFinish(); return; }
    var stolen = SD.watch === c.name;
    sdApplyPick(gi, c.name, c.row, c.b);
    analyticsTrack("showdown_state", {
      surface: "redraft", action: stolen ? "steal" : "ai_pick", mode: "showdown",
      player: c.name, season: c.row[IDX.season], slot: c.b, ordinal: SD.at + 1, source: SD_GMS[gi].name
    });
    SD.at++;
    SD.flash = { gi: gi, name: c.name, s: c.row[IDX.season], stolen: stolen };
    sdAdvance();
  }, 850);
}
function sdHumanPick(bucket) {
  var gi = sdCurrentGm();
  if (gi === -1 || SD_GMS[gi].ai || !SD.selected) return;
  var row = sdChosenRow(SD.selected);
  if (!row) return;
  if (rowBuckets(row).indexOf(bucket) === -1) { denyTraySd("His " + shortSeason(row[IDX.season]) + " season does not qualify at " + bucket + "."); return; }
  if (sdOpenCount(gi, bucket) <= 0) { denyTraySd("That slot is full."); return; }
  var S = sdFeasibleAfter(SD.selected, gi, bucket);
  if (S) { denyTraySd(sdStrandWhy(S)); return; }
  sdApplyPick(gi, SD.selected, row, bucket);
  analyticsTrack("showdown_state", {
    surface: "redraft", action: "pick", mode: "showdown",
    player: SD.selected, season: row[IDX.season], slot: bucket, ordinal: SD.at + 1
  });
  // watch = the last player you seriously considered. If you took him, the
  // threat is over; if you took someone ELSE, he stays watched, and a rival
  // grabbing him before your next turn is the steal the mode is built around.
  if (SD.watch === SD.selected) SD.watch = null;
  SD.selected = null; SD.flash = null;
  SD.at++;
  sdAdvance();
}
function denyTraySd(msg) {
  var inner = el("sdTray");
  if (!inner) return;
  var note = inner.querySelector(".tray-deny");
  if (!note) { note = document.createElement("div"); note.className = "tray-deny"; inner.appendChild(note); }
  note.textContent = msg;
  denyRow(inner, null);
  clearTimeout(denyTraySd._t);
  denyTraySd._t = setTimeout(function () { if (note.parentNode) note.parentNode.removeChild(note); }, 1800);
}
/* ---------- the verdict: three throwaway classic runs ---------- */
function sdFinish() {
  SD.done = 1;
  try { if (window.T82 && T82.t && T82.t.SC) T82.t.SC.PG_CAP = 0.991; } catch (e) {}   // classic ceiling, in case Presti ran last
  var teams = SD.rosters.map(function (roster, gi) {
    var rows = roster.map(function (p) { return p.row; });
    var slots = roster.map(function (p) { return p.slot; });
    var g = T82.newState("classic", (Date.now() + gi * 7919) % 2147483647, null);
    var e = T82.engine(g, rows, slots);
    var wins = e.winTally, realized = 0;   // records project straight from net; no per-game realization in this mode (owner ruling 2026-08-05, the luck spread was reading as verdict)
    return { gi: gi, name: SD_GMS[gi].name, roster: roster, e: e, net: Math.round(e.net * 10) / 10, wins: wins, losses: CFG.GAMES_IN_SEASON - wins, realized: realized };
  });
  teams.sort(function (a, b) { return (b.wins - a.wins) || (b.net - a.net) || (a.gi - b.gi); });
  SD.verdict = teams;
  analyticsTrack("showdown_state", {
    surface: "redraft", action: "complete", mode: "showdown", season: +SD.cls,
    outcome: teams[0].gi === 0 ? "win" : "loss", wins: teams[0].wins,
    value: teams.map(function (t) { return t.name + ":" + t.wins; }).join(" "),
    ordinal: teams.map(function (t) { return t.gi; }).indexOf(0) + 1
  });
  renderShowdownResults();
}
function sdShare() {
  var v = SD && SD.verdict;
  if (!v) return;
  var lines = v.map(function (t, i) { return (i + 1) + ". " + (t.gi === 0 ? "ME" : t.name) + " " + t.wins + " and " + t.losses; });
  var mine = v.map(function (t) { return t.gi; }).indexOf(0);
  var txt = "TRUE 82 \u00B7 THE REDRAFT \u00B7 " + SD_CLASSES[SD.cls].label + "\n" +
    lines.join("\n") + "\n" +
    (mine === 0 ? "I won the board." : "I want that draft back.") + "\n" +
    "https://true82.net/";
  analyticsTrack("share_open", { surface: "redraft", action: "podium", value: v[0].wins });
  var btn = el("sdShareBtn");
  if (navigator.share) { navigator.share({ text: txt }).catch(function () {}); return; }
  try {
    navigator.clipboard.writeText(txt).then(function () {
      if (btn) { var t = btn.textContent; btn.textContent = "COPIED"; setTimeout(function () { btn.textContent = t; }, 1400); }
    });
  } catch (e) {}
}
/* ---------- rendering ---------- */
/* The engine's own receipts, per team, so a podium argument can be settled
   by reading instead of trusting. Shooters is e.sumSp, the exact number the
   spacing tax is computed from; the taxes shown are the ones that separate
   drafted teams (spacing and the defense trio). Degrades to nothing on a
   cached pre-ledger core rather than printing undefined. */
function sdReceiptsHtml(e) {
  if (!e || e.sumSp === undefined) return "";
  var req = (typeof SC !== "undefined" && SC && SC.SPACERS_REQ) || 3;
  var bits = ["shooters " + fmt1(e.sumSp) + " of " + req];
  if (e.spacingBonus > 0) bits.push("spacing +" + fmt1(e.spacingBonus));
  else if (e.spacingTax > 0) bits.push("spacing -" + fmt1(e.spacingTax));
  var dTax = (e.backDefTax || 0) + (e.wingDefTax || 0) + (e.rimDefTax || 0);
  if (dTax > 0) bits.push("defense -" + fmt1(dTax));
  if (e.usageTax > 0) bits.push("usage -" + fmt1(e.usageTax));
  return '<span class="sd-receipts mono">' + bits.join(" \u00B7 ") + '</span>';
}
function sdRosterCardHtml(gi) {
  var gm = SD_GMS[gi];
  var mine = !gm.ai;
  var slots = [];
  Object.keys(SD_CFG.caps).forEach(function (b) {
    for (var i = 0; i < SD_CFG.caps[b]; i++) slots.push(b);
  });
  var byBucket = { G: [], F: [], C: [] };
  SD.rosters[gi].forEach(function (p) { byBucket[p.slot].push(p); });
  var fill = { G: 0, F: 0, C: 0 };
  var rows = slots.map(function (b) {
    var p = byBucket[b][fill[b]++];
    return '<span class="sd-slot' + (p ? " filled" : "") + '"><b>' + b + '</b> ' +
      (p ? esc(p.row[IDX.name]) + ' <i>' + shortSeason(p.row[IDX.season]) + '</i>' : "\u00B7\u00B7\u00B7") + '</span>';
  }).join("");
  var onClock = sdCurrentGm() === gi && !SD.done;
  return '<div class="sd-team' + (mine ? " sd-mine" : "") + (onClock ? " sd-clock" : "") + '">' +
    '<span class="sd-gm">' + gm.name + (onClock ? ' <i class="sd-otc">ON THE CLOCK</i>' : "") + '</span>' +
    '<span class="sd-slots">' + rows + '</span></div>';
}
function sdOrderStripHtml() {
  var total = SD.seq.length;
  var pos = Math.min(SD.at + 1, total);
  var round = Math.floor(Math.min(SD.at, total - 1) / 3) + 1;
  var names = SD.seats.map(function (gi) { return SD_GMS[gi].name; }).join(" \u2192 ");
  return '<div class="sd-strip"><span class="sd-pick mono">PICK ' + pos + ' OF ' + total + ' \u00B7 ROUND ' + round + (round % 2 === 0 ? " \u21A9" : "") + '</span>' +
    '<span class="sd-order mono">' + names + ' \u00B7 snake</span></div>';
}
function sdBoardRowHtml(p) {
  var gi = sdCurrentGm();
  var takenBy = SD.taken[p.name];
  if (takenBy != null) {
    var pk = null;
    for (var i = 0; i < SD.log.length; i++) if (SD.log[i].name === p.name) pk = SD.log[i];
    return '<div class="player-row off sd-taken"><span class="pr-top"><span class="pr-name">' + esc(p.name) + '</span>' +
      '<span class="pr-pos">TAKEN \u00B7 ' + SD_GMS[takenBy].name + '</span></span>' +
      '<span class="pr-sub">' + (pk ? shortSeason(pk.s) + " at " + pk.slot : "") + '</span></div>';
  }
  var row = sdChosenRow(p.name);
  var humanTurn = gi !== -1 && !SD_GMS[gi].ai;
  var block = humanTurn ? sdPickBlock(p.name, gi) : null;
  var open = humanTurn && !block;
  var sel = SD.selected === p.name && open;
  var cls = "player-row" + (sel ? " sel" : "") + (open ? "" : " off");
  var yrs = sdYearControlHtml(p, row);
  return '<div class="' + cls + '" role="button" tabindex="0" data-name="' + esc(p.name) + '" aria-pressed="' + sel + '"' +
    (open ? "" : ' aria-disabled="true"' + (block ? ' title="' + esc(block.why) + '"' : "")) + ">" +
    '<span class="pr-top"><span class="pr-name">' + esc(p.name) + '</span>' +
    '<span class="pr-pos">' + bucketTag(row) + (block ? " \u00B7 " + block.tag : "") + '</span></span>' +
    '<span class="pr-sub">' + yrs + '</span></div>';
}
function sdYearControlHtml(p, row) {
  var curTxt = shortSeason(row[IDX.season]) + " " + esc(row[IDX.team]);
  if (p.seasons.length <= 1) return '<span class="year-face year-fixed">' + curTxt + '</span>';
  var cur = row[IDX.season];
  var opts = p.seasons.map(function (r) {
    var s = r[IDX.season];
    return '<option value="' + s + '"' + (s === cur ? " selected" : "") + '>' + shortSeason(s) + " " + esc(r[IDX.team]) + '</option>';
  }).join("");
  return '<span class="year-wrap"><span class="year-face">' + curTxt + ' <b class="yf-caret">\u25BE</b></span>' +
    '<select class="year-sel" data-name="' + esc(p.name) + '" aria-label="Season for ' + esc(p.name) + '">' + opts + '</select></span>';
}
function sdTrayHtml() {
  var gi = sdCurrentGm();
  if (gi === -1) return "";
  if (SD_GMS[gi].ai) {
    var f = SD.flash;
    return '<div class="sd-wait">' + SD_GMS[gi].name + ' is on the clock\u2026' +
      (f ? ' <span class="sd-last">' + SD_GMS[f.gi].name + ' took ' + esc(f.name) + ' ' + shortSeason(f.s) + (f.stolen ? ' \u00B7 YOUR GUY' : '') + '</span>' : "") + '</div>';
  }
  if (!SD.selected) {
    var f2 = SD.flash;
    return '<div class="sd-hint">Pick a player.' +
      (f2 ? ' <span class="sd-last">' + SD_GMS[f2.gi].name + ' took ' + esc(f2.name) + ' ' + shortSeason(f2.s) + (f2.stolen ? ' \u00B7 YOUR GUY' : '') + '</span>' : "") + '</div>';
  }
  var row = sdChosenRow(SD.selected);
  var btns = Object.keys(SD_CFG.caps).map(function (b) {
    var ok = rowBuckets(row).indexOf(b) !== -1 && sdOpenCount(gi, b) > 0 && !sdFeasibleAfter(SD.selected, gi, b);
    return '<button class="btn sd-slotbtn presti-spin" data-slot="' + b + '"' + (ok ? "" : " disabled") + '>' + b + '</button>';
  }).join("");
  return '<div class="sd-confirm"><span class="sd-cname">' + esc(SD.selected) + ' <i>' + shortSeason(row[IDX.season]) + '</i></span>' +
    '<span class="sd-slotrow">' + btns + '</span></div>';
}
function renderShowdownDraft() {
  ensureShowdownCss();
  document.body.classList.add("drafting");
  document.body.classList.remove("gating");
  var pool = sdBuildPool();
  var avail = sdBoardOrder(pool.list.filter(function (p) { return SD.taken[p.name] == null; }));
  var takenList = SD.log.map(function (l) { return pool.byName.get(l.name); });
  var boardHtml = avail.map(sdBoardRowHtml).join("") + takenList.map(sdBoardRowHtml).join("");
  app().innerHTML =
    '<section class="ticket sd-head"><div class="sd-headrow">' +
      '<span class="sd-title">\uD83D\uDD01 THE REDRAFT</span><span class="sd-class mono">' + SD_CLASSES[SD.cls].label + '</span></div>' +
      sdOrderStripHtml() +
    '</section>' +
    '<div class="sd-teams">' + [0, 1, 2].map(function (k) { return sdRosterCardHtml(SD.seats[k]); }).join("") + '</div>' +
    '<div class="pool sd-pool" id="sdPool">' + boardHtml + '</div>' +
    '<div class="tray"><div class="tray-inner" id="sdTray">' + sdTrayHtml() + '</div></div>' +
    '<button class="startover-btn sd-back" id="sdBackBtn" type="button">\u2039 Abandon draft</button>';
  var poolEl = el("sdPool");
  poolEl.addEventListener("click", function (ev) {
    if (ev.target.closest(".year-sel")) return;
    var btn = ev.target.closest(".player-row");
    if (!btn) return;
    var name = btn.getAttribute("data-name");
    if (btn.classList.contains("off")) {
      analyticsTrack("showdown_state", { surface: "redraft", action: "pick_denied", mode: "showdown", player: name || "", source: btn.getAttribute("title") || "taken" });
      denyRow(btn, btn.getAttribute("title") || "");
      return;
    }
    SD.selected = name;
    SD.watch = name;   // if a rival takes this before you do, that is a steal
    renderShowdownDraft();
  });
  poolEl.addEventListener("change", function (ev) {
    var s = ev.target;
    if (!s.classList || !s.classList.contains("year-sel")) return;
    var season = parseInt(s.value, 10);
    if (isNaN(season)) return;
    SD.yearByName[s.getAttribute("data-name")] = season;
    analyticsTrack("year_change", { surface: "redraft", player: s.getAttribute("data-name"), season: season, action: "season_menu" });
    renderShowdownDraft();
  });
  var tray = el("sdTray");
  tray.addEventListener("click", function (ev) {
    var b = ev.target.closest(".sd-slotbtn");
    if (!b) return;
    if (b.disabled) return;
    sdHumanPick(b.getAttribute("data-slot"));
  });
  el("sdBackBtn").addEventListener("click", function () {
    if (SD_TIMER) { clearTimeout(SD_TIMER); SD_TIMER = 0; }
    SD = null;
    document.body.classList.remove("drafting");
    renderIntro();
  });
}
function renderShowdownResults() {
  ensureShowdownCss();
  document.body.classList.remove("drafting");
  var v = SD.verdict;
  var mine = v.map(function (t) { return t.gi; }).indexOf(0);
  var stamp = mine === 0 ? "YOU WIN THE REDRAFT" : v[0].name + " WINS THE REDRAFT";
  var podium = v.map(function (t, i) {
    var five = t.roster.map(function (p) {
      return '<span class="dyv-name"><b>' + esc(p.row[IDX.name]) + '</b> <i class="dyv-yr">' + shortSeason(p.row[IDX.season]) + ' ' + p.slot + '</i></span>';
    }).join("");
    return '<div class="sd-podium-row' + (t.gi === 0 ? " sd-mine" : "") + '">' +
      '<span class="sd-podium-head mono">' + (i + 1) + '. ' + (t.gi === 0 ? "YOU" : t.name) + ' \u00B7 ' + t.wins + ' and ' + t.losses + ' \u00B7 net ' + (t.net > 0 ? "+" : "") + t.net + '</span>' +
      sdReceiptsHtml(t.e) +
      '<span class="sd-podium-five">' + five + '</span></div>';
  }).join("");
  app().innerHTML =
    '<section class="section dy-verdict ' + (mine === 0 ? "dy-banked" : "dy-fell") + ' sd-verdict" data-result-section="showdown_verdict">' +
      '<p class="dyv-eyebrow">\uD83D\uDD01 THE REDRAFT \u00B7 ' + SD_CLASSES[SD.cls].label + '</p>' +
      '<p class="dyv-stamp' + (mine === 0 ? "" : " dyv-dead") + '">' + stamp + '</p>' +
      '<p class="dyv-line">' + (v[0].realized ? "Three seasons, played out." : "Three seasons, projected.") + '</p>' +
      '<div class="sd-podium">' + podium + '</div>' +
      '<button class="btn btn-primary btn-block presti-spin" id="sdAgainBtn">RUN IT BACK \u00B7 NEW SEATS</button>' +
      '<button class="dyv-share" id="sdShareBtn" type="button">SHARE THE PODIUM</button>' +
      '<button class="startover-btn sd-back" id="sdHomeBtn" type="button">\u2039 Back</button>' +
    '</section>';
  el("sdAgainBtn").addEventListener("click", function () {
    analyticsTrack("showdown_state", { surface: "redraft", action: "rematch", mode: "showdown" });
    sdStart();
  });
  el("sdShareBtn").addEventListener("click", sdShare);
  el("sdHomeBtn").addEventListener("click", function () { SD = null; renderIntro(); });
}
function renderShowdownGate(silent) {
  ensureShowdownCss();
  document.body.classList.remove("drafting");
  document.body.classList.remove("gating");
  var cls = SD_CLASSES[SD_CLASS_ID];
  var ready = DATA_READY ? sdBuildPool() : null;
  var thin = ready && ready.list.length < SD_CFG.rosterSize * 3;
  var stuck = ready && !thin ? sdClassViable(ready) : null;
  var chips = SD_CLASS_ORDER.map(function (id) {
    return '<button class="sd-chip' + (id === SD_CLASS_ID ? " on" : "") + '" data-cls="' + id + '" type="button">\u2019' + id.slice(2) + '</button>';
  }).join("");
  var posNames = { G: "guards", F: "forwards", C: "centers" };
  var tail;
  if (thin) {
    tail = '<p class="intro-lead dy-fine">This class came up short against live data (' + ready.list.length + ' resolved). Check the console for the missing names, then fix or trim the roster in SD_CLASSES.</p>';
  } else if (stuck) {
    tail = '<p class="intro-lead dy-fine">This class cannot field three legal teams: the data is short on ' +
      stuck.map(function (b) { return posNames[b]; }).join(" and ") + '. Check the console, then fix the roster in SD_CLASSES.</p>';
  } else {
    tail = (ready
      ? '<p class="sd-resolved mono">' + ready.list.length + ' players on the board' + (ready.missing.length ? ' \u00B7 ' + ready.missing.length + ' name' + (ready.missing.length > 1 ? "s" : "") + ' missing from the data (console)' : '') + '</p>'
      : '') +
      '<button class="btn btn-primary btn-block presti-spin" id="sdGoBtn">DRAFT THE CLASS</button>';
  }
  var inner = '<p class="eyebrow">\uD83D\uDD01 THE REDRAFT \u00B7 ALPHA</p>' +
    '<h1 class="intro-title">' + cls.label.charAt(0) + cls.label.slice(1).toLowerCase() + '. Three GMs. One board.</h1>' +
    '<div class="sd-chips" id="sdChips">' + chips + '</div>' +
    '<p class="intro-lead"><b>' + esc(cls.blurb) + '</b></p>' +
    '<p class="intro-lead dy-fine">A snake draft against two rival GMs over one shared pool. Five each, any season of their careers, every pick exclusive. MERCER drafts the best player alive, every pick. QUINCY drafts the team. Then the engine scores all three seasons and settles it.</p>' +
    tail;
  app().innerHTML = '<section class="ticket intro dy-gate">' + inner +
    '<button class="startover-btn dy-back" id="sdBackBtn2" type="button">\u2039 Back</button></section>';
  if (!silent) analyticsTrack("mode_impression", { surface: "redraft_gate", action: thin ? "thin_pool" : (stuck ? "unfieldable" : "fresh"), mode: "showdown", season: +SD_CLASS_ID });
  el("sdChips").addEventListener("click", function (ev) {
    var b = ev.target.closest(".sd-chip");
    if (!b) return;
    var id = b.getAttribute("data-cls");
    if (!SD_CLASSES[id] || id === SD_CLASS_ID) return;
    SD_CLASS_ID = id;
    analyticsTrack("showdown_state", { surface: "redraft_gate", action: "class_select", mode: "showdown", season: +id });
    renderShowdownGate(true);
  });
  var go = el("sdGoBtn");
  if (go) go.addEventListener("click", function () {
    if (DATA_READY) { sdStart(); return; }
    PENDING_FN = sdStart;   // same queue contract as the daily, weekly, and dynasty launches
    go.disabled = true; go.textContent = "Loading players\u2026";
  });
  el("sdBackBtn2").addEventListener("click", function () { renderIntro(); });
}
function sdStart() {
  var pool = sdBuildPool();
  if (pool.list.length < SD_CFG.rosterSize * 3 || sdClassViable(pool)) { renderShowdownGate(); return; }
  SD = sdFresh();
  analyticsTrack("showdown_state", {
    surface: "redraft", action: "start", mode: "showdown", season: +SD.cls,
    source: SD.seats.map(function (gi) { return SD_GMS[gi].name; }).join(">"), amount: pool.list.length
  });
  sdAdvance();
}
function ensureShowdownCss() {
  if (document.getElementById("t82ShowdownCss")) return;
  ensureDynastyCss();   // the verdict shell reuses the dynasty panel skin
  var st = document.createElement("style");
  st.id = "t82ShowdownCss";
  st.textContent =
    ".sd-head{padding:12px 14px}" +
    ".sd-headrow{display:flex;justify-content:space-between;align-items:baseline;gap:10px}" +
    ".sd-chips{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0 4px}" +
    ".sd-chip{font-family:'IBM Plex Mono',monospace;font-size:13px;letter-spacing:.06em;padding:7px 11px;min-height:36px;" +
      "border:1px solid #2a323b;border-radius:9px;background:#141a21;color:#8b98a5;cursor:pointer}" +
    ".sd-chip.on{border-color:#FFB52E;color:#FFB52E;box-shadow:0 0 0 1px rgba(255,181,46,.25)}" +
    ".sd-resolved{display:block;font-size:11px;letter-spacing:.08em;color:#5d6a77;margin:2px 0 10px}" +
    ".sd-title{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:21px;letter-spacing:.05em;color:#FFB52E}" +
    ".sd-class{font-size:11px;letter-spacing:.14em;color:#8b98a5}" +
    ".sd-strip{display:flex;justify-content:space-between;gap:8px;margin-top:8px;flex-wrap:wrap}" +
    ".sd-pick{font-size:11px;letter-spacing:.1em;color:#c9d2da}" +
    ".sd-order{font-size:11px;letter-spacing:.06em;color:#8b98a5}" +
    ".sd-teams{display:flex;flex-direction:column;gap:7px;margin:10px 0}" +
    ".sd-team{border:1px solid #2a323b;border-radius:12px;padding:8px 11px;background:#141a21}" +
    ".sd-team.sd-mine{border-color:#4d5a67}" +
    ".sd-team.sd-clock{border-color:#FFB52E;box-shadow:0 0 0 1px rgba(255,181,46,.25)}" +
    ".sd-gm{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.16em;color:#FFB52E;display:block}" +
    ".sd-otc{font-style:normal;color:#c9d2da;letter-spacing:.1em;font-size:10px}" +
    ".sd-slots{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:5px}" +
    ".sd-slot{font-size:12.5px;color:#5d6a77}" +
    ".sd-slot b{font-family:'IBM Plex Mono',monospace;font-size:10px;color:#8b98a5}" +
    ".sd-slot.filled{color:#c9d2da}" +
    ".sd-slot i{font-style:normal;color:#8b98a5}" +
    ".sd-taken .pr-name{text-decoration:line-through;color:#7d8894}" +
    ".sd-wait,.sd-hint{font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.06em;color:#c9d2da;padding:6px 2px}" +
    ".sd-last{display:block;margin-top:4px;color:#FFB52E;font-size:11px}" +
    ".sd-confirm{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:2px}" +
    ".sd-cname{font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:18px;color:#f2f5f7}" +
    ".sd-cname i{font-style:normal;color:#8b98a5;font-size:14px}" +
    ".sd-slotrow{display:flex;gap:8px}" +
    ".sd-slotbtn{min-width:52px;height:44px;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:18px}" +
    ".sd-back{margin:14px auto 0;display:block}" +
    ".sd-podium{margin-top:10px;display:flex;flex-direction:column;gap:12px;text-align:left}" +
    ".sd-podium-row{border:1px solid #2a323b;border-radius:12px;padding:9px 12px;background:#12181f}" +
    ".sd-podium-row.sd-mine{border-color:#FFB52E}" +
    ".sd-podium-head{display:block;font-size:12px;letter-spacing:.08em;color:#FFB52E}" +
    ".sd-receipts{display:block;margin-top:3px;font-size:10.5px;letter-spacing:.05em;color:#8b98a5}" +
    ".sd-podium-five{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:5px}" +
    ".sd-verdict .dyv-share{margin-top:10px}";
  document.head.appendChild(st);
}

function showResults() {
  G.screen = "results";
  if (MODE === "kaman") {
    renderKamanResults();
    var kp = Object.assign(analyticsRunSnapshot(), { mode: "kaman", wins: CFG.GAMES_IN_SEASON, undefeated: 1, surface: "results" });
    analyticsTrack("results_view", kp);
    analyticsTrack("game_complete", kp);
    gameFinishedPings();
    return;
  }
  var e = engine(G.picks.map(function (p) { return p.row; }), G.picks.map(function (p) { return p.slot; }));
  // v42 ANY GIVEN NIGHT: standalone Classic plays the season out game by
  // game. Presti realizes too (owner ruling, 2026-07-26): cap mode runs the
  // same 82-roll season, uncapped per the Presti PG_CAP override, so a true
  // murderers' row can literally win all 82 and a realized 81-1 hands the
  // Heat Check its intended stage. Hot Hand keys on e.winTally, which below
  // becomes the REALIZED record before the finish path runs, so the spin
  // fires on a literal 81 regardless of where the loss fell; the boost
  // rewrites the record through hhWins(newNet) exactly as before, and the
  // percentile still ships raw pre-boost e.net, which realization never
  // touches. Daily boards, challenges, and pro stay analytic until their
  // own adaptations. The arming op "ss" rides the action stream so replays
  // realize identically.
  if (seasonArmEligible()) {
    T82.armSeasonSim(G);
    var season = T82.simSeason(G, e);
    e.expWins = e.winTally;
    e.winTally = season.wins;
    e.season = season;
    dySettle(e);   // v48: the dynasty verdict locks the moment realized wins exist; the reel is presentation
    loadBbrefMap();                              // preload the map during the reel
    // v47.15 MID-SEASON HEAT CHECK (owner spec, 2026-07-31): a standalone Presti
    // roster drafted above +20 net that realizes a loss gets ONE shot to save
    // its perfect season the moment that first loss would land. The reel
    // pauses before the L square, the Heat Check fires with the game number,
    // and HOT or better re-rolls the saved game plus the whole remainder at
    // the boosted per-game win rate (the engine's own formula: phi(net/SD)).
    // Below HOT, the loss lands and the season plays out exactly as realized.
    // Duels, dailies, and challenges never enter this branch; the +20 gate is
    // strict; the raw pre-boost net still ships to percentile/leaderboards.
    var midTrigger = hhMidGate(e, season) ? { e: e } : null;
    scheduleSharePct(e);   // v49.4: start the percentile fetch now so the reel finale can wear the Top X% line
    showSeasonReel(season, e, function () { finishRunTail(e); }, midTrigger);
    return;
  }
  finishRunTail(e);
}
// v48: the dynasty is the first challenge-shaped run that realizes its
// season. v42 reserved exactly this door ("challenges stay analytic until
// their own adaptations"); every other challenge and the daily boards stay
// analytic through the !G.ch arm below.
function seasonArmEligible() {
  return (MODE === "classic" || MODE === "cap") && !G.social &&
    (!G.ch || G.ch.id === "dynasty") && !!(window.T82 && T82.simSeason);
}
function finishRunTail(e) {
  dySettle(e);   // analytic fallback path (sim-core without simSeason); idempotent with the armed settle
  renderResults(e, false);
  if (G.hotMid) applyMidBoostToResults(e);
  dyInjectVerdict();
  if (window.t82track) {
    var gc = analyticsRunSnapshot();
    gc.wins = e.winTally;
    gc.net = e.net;
    gc.undefeated = e.winTally >= CFG.GAMES_IN_SEASON ? 1 : 0;
    gc.surface = "results";
    // v40: the Scoring Card, wired to D1 — how often each fence fires on
    // real humans, and how hard. Rounded 2dp; zeros are real zeros.
    var r2 = function (x) { return Math.round((x || 0) * 100) / 100; };
    gc.t_usage = r2(e.usageTax); gc.t_spacing = r2(e.spacingTax); gc.b_spacing = r2(e.spacingBonus);
    gc.t_backd = r2(e.backDefTax); gc.t_wingd = r2(e.wingDefTax); gc.t_rim = r2(e.rimDefTax);
    gc.t_glass = r2(e.glassTax); gc.t_creator = r2(e.creatorTax); gc.t_age = r2(e.ageTax);
    if (G.social && G.social.target) {
      gc.result_delta = e.winTally - G.social.target.w;
      gc.outcome = e.winTally > G.social.target.w || (e.winTally === G.social.target.w && e.net > G.social.target.n + 1e-9)
        ? "beat" : (e.winTally === G.social.target.w && Math.abs(e.net - G.social.target.n) <= 1e-9 ? "tie" : "lost");
    }
    if (G.social && window.T82DAILY) {
      var off = T82DAILY.officialFor(G.social.key);
      gc.official = !!(G.social.nonce && off && off.nonce === G.social.nonce) ? 1 : 0;
      gc.practice = gc.official ? 0 : 1;
    }
    window.t82track("results_view", Object.assign({}, gc));
    window.t82track("game_complete", gc);
  }
  scheduleSharePct(e);
  loadBbrefMap().then(function () { upgradeBbrefLinks(); });   // v30: swap search hrefs for verified player pages
  gameFinishedPings();
}

/* ---------- v42 THE SEASON REEL (Any Given Night, classic) ----------
   v49.4 SCOREBOARD CUT (owner rulings, 2026-08-06): 82 realized games in
   seven month acts under a retro scoreboard (game, record, LIVE PACE), a
   prominent calendar explainer, and an event flash line. Wins sweep on a
   month tempo (compressed middle, slow April); losses land on their own
   beat with the story AT the square: the season's first loss gets the
   zero-died line, each month's first loss gets a blame line, win streaks
   flag at ten and every five after, skids flag at three. Month desk
   lines still close each act. The finale reuses the results comps plus
   the Top X% percentile; the fetch starts before the reel so the number
   is usually home by then. Cities are cut (owner, 2026-08-06); dates are
   the season calendar; blame is seed-hashed cosmetic flavor, never the
   rng stream. The reel is still the bbref-map preload window and still
   pauses square-exact for the Mid-Season Heat Check. One prominent SKIP.
   Copy law: zero em-dashes. */
var REEL_MONTHS = [["OCT", 5], ["NOV", 15], ["DEC", 15], ["JAN", 15], ["FEB", 11], ["MAR", 15], ["APR", 6]];
function reelDay(mi, gi) {
  var count = REEL_MONTHS[mi][1];
  var first = mi === 0 ? 21 : 1;
  var last = mi === 0 ? 31 : (mi === 6 ? 12 : (mi === 4 ? 27 : 29));
  if (count === 1) return first;
  return Math.round(first + gi * (last - first) / (count - 1));
}
function reelDate(gameIdx) {
  var g = gameIdx, mi = 0;
  while (mi < REEL_MONTHS.length - 1 && g >= REEL_MONTHS[mi][1]) { g -= REEL_MONTHS[mi][1]; mi++; }
  var mo = REEL_MONTHS[mi][0];
  return mo.charAt(0) + mo.slice(1).toLowerCase() + " " + reelDay(mi, g);
}
function reelHash(str) {
  var h = 2166136261;
  for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; }
  return h;
}
function reelLine(mi, mw, ml, runW, runL) {
  var mo = REEL_MONTHS[mi][0];
  if (runL === 0) {
    return ["Perfect through " + mo + ". " + runW + " and 0. History is watching.",
      "Not a blemish yet. " + runW + " straight.",
      "Still zero in the loss column. The building holds its breath.",
      runW + " and 0. Vegas quietly pulls the line.",
      "Undefeated through " + mo + ". Opposing coaches are burning film at 3am.",
      "Zero losses. The beat writers are drafting history columns.",
      runW + " straight. Every arena is a road playoff game now."][mi % 7];
  }
  if (ml === 0) return ["A spotless " + mw + " and 0 month steadies the run.",
    "Swept the month. " + mw + " and 0.",
    mw + " and 0. The rotation is humming and everybody eats.",
    "A perfect month. The film session is a highlight reel."][mi % 4];
  if (ml >= 5) return [mw + " and " + ml + ". The schedule bit back.",
    mw + " and " + ml + ". Somebody call a players-only meeting.",
    mw + " and " + ml + ". The trainer's room is standing room only.",
    mw + " and " + ml + ". Talk radio smells blood."][mi % 4];
  if (ml >= 3) return [mw + " and " + ml + ". Heavy legs, short rotations, long month.",
    mw + " and " + ml + ". Three time zones in nine nights will do that.",
    mw + " and " + ml + ". The bench got exposed.",
    mw + " and " + ml + ". Winnable ones got away late."][mi % 4];
  return [mw + " and " + ml + ". The engine hums.",
    mw + " and " + ml + ". Business handled, mostly.",
    mw + " and " + ml + ". A professional month.",
    mw + " and " + ml + ". Took care of the ones that mattered.",
    mw + " and " + ml + ". One clunker, otherwise clean."][mi % 5];
}
function reelBlame(gi) {
  var pk = G.picks[reelHash(String(G.seed || "x") + "b" + gi) % G.picks.length];
  var nm = bbrefLastName(pk.row[IDX.name]) || pk.row[IDX.name];
  var T = ["missed a buzzer beater", "no-showed", "had a flu game", "shot 4 for 19",
    "left his legs at the hotel", "got cooked on every switch", "airballed the game winner",
    "argued with the ref instead of getting back", "picked up two fouls in the first minute",
    "dribbled it off his foot with the game on the line", "got baited into a fourth-quarter tech",
    "bricked six free throws", "fell for every pump fake", "jogged back in transition all night",
    "threw the inbound to the wrong jersey", "forced a heat check down two",
    "lost his man on the last possession", "ate a poster and never recovered",
    "played matador defense in crunch time", "goaltended the dagger"];
  return nm + " " + T[reelHash(String(G.seed || "x") + "t" + gi) % T.length] + ".";
}
/* v47.17 GATE FIX: arm the mid-season trigger from transparent checks only.
   The v47.15 gate ANDed the engine's hhEligible(G, e), whose semantics are
   tuned to the exactly-81 post-season moment; on normal losing Presti runs
   it is false, which is why the feature never fired live. What the mid
   ceremony actually needs: Presti standalone (cap, not duel - social and
   challenge runs never reach the realized branch at all), a full five-man
   roster for the name strip, the engine's Hot Hand surface present, at
   least one realized loss to save, the one-per-season law, and the strict
   +20 bar (?midhot=1 waives ONLY that bar). With ?midhot=1 on, every gate
   component logs to the console so a live "why didn't it fire" is
   self-answering. */
function hhMidGate(e, season) {
  var parts = {
    presti: MODE === "cap",
    standalone: !G.duel,
    roster5: !!(G.picks && G.picks.length >= 5),
    engine: !!(window.T82 && T82.hhPickHot && T82.hhSpinSeg && HH_SEGMENTS && HH_SEGMENTS.length),
    hasLoss: !!(season && season.losses > 0),
    unused: !G.hhMidUsed,
    netBar: FORCE_MIDHOT || (e && e.net > 20)
  };
  var go = parts.presti && parts.standalone && parts.roster5 && parts.engine &&
           parts.hasLoss && parts.unused && parts.netBar;
  if (FORCE_MIDHOT && typeof console !== "undefined" && console.info) {
    console.info("[t82] mid heat gate", go ? "ARMED" : "blocked", parts,
      e ? "net " + e.net : "", season ? season.wins + "-" + season.losses : "");
  }
  return go;
}

/* ---------- v47.15 MID-SEASON HEAT CHECK overlay ----------
   Same ceremony grammar as the post-season Heat Check (lever pull, name
   strip, heat wheel), retold at the moment the first loss would land. One
   per season: the offer itself burns it (G.hhMidUsed), spun or refused.
   HOT or better hands back a boost; anything cooler, or a refusal, hands
   back null and the realized loss lands. All ids are hhm* so the two
   overlays can never cross-wire. */
function hotHandMid(e, gameNo, winsSoFar, onResolve) {
  G.hhMidUsed = 1;
  var hotIdx = hhPickHot(), segIdx = hhSpinSeg(), seg = HH_SEGMENTS[segIdx];
  var hotV = valueOf(G.picks[hotIdx].row);
  var qualifies = segIdx >= HH_MID_MIN_SEG;
  var newNet = e.net + (seg.m - 1) * hotV * HH_BONUS_SCALE;
  var names = G.picks.map(function (p) { return shareSurname(p.row[IDX.name]); });
  var ITEM = 54, COPIES = 6, targetFlat = (COPIES - 2) * names.length + hotIdx;
  var stripHtml = "", c, n2, s2;
  for (c = 0; c < COPIES; c++) for (n2 = 0; n2 < names.length; n2++) stripHtml += '<div class="hh-name">' + esc(names[n2]) + "</div>";
  var segHtml = "";
  for (s2 = 0; s2 < HH_SEGMENTS.length; s2++) segHtml += '<div class="hh-seg lvl' + HH_SEGMENTS[s2].lvl + '"></div>';

  var ov = document.createElement("div");
  ov.className = "hh-overlay in hh-mid";
  // v47.21: no skip control here. It was a SECOND decline door onto the same
  // handler as I DON'T WANT YOUR CHARITY (declineHeat + resolve(null)), and as
  // a relative-positioned flex child it shouldered the ceremony off centre.
  // The charity button is the one refusal; the card is now the only child, so
  // the overlay's align/justify centre it for real.
  ov.innerHTML =
    '<div class="hh-card"><div class="goat-fw" id="hhmFw" aria-hidden="true"></div>' +
      '<div class="hh-eyebrow hh-clutch">' + (winsSoFar > 0
        ? 'Game ' + gameNo + '. You\u2019re ' + winsSoFar + '\u20130 and down entering the 4th quarter. Clutch heroics to stay perfect?'
        : 'Game 1. Down entering the 4th quarter of the opener. Clutch heroics to start perfect?') + '</div>' +
      ballLeverHtml("hhmLever", "hhmArm", "Pull the basketball through the hoop") +
      '<button class="hh-charity" id="hhmCharity">I DON\u2019T WANT YOUR CHARITY</button>' +
      '<div class="hh-stage">' +
        '<div class="hh-step" id="hhmStep1">' +
          '<div class="hh-window"><div class="hh-strip" id="hhmStrip">' + stripHtml + '</div><span class="hh-payline"></span></div></div>' +
        '<div class="hh-step" id="hhmStep2">' +
          '<div class="hh-heat">' + segHtml + '</div><div class="hh-heatlabel" id="hhmHeatLabel">\u00B7</div></div>' +
        '<div class="hh-verdict" id="hhmVerdict"></div>' +
        '<div class="hh-actions" id="hhmActions">' +
          '<button class="hh-btn presti-spin" id="hhmBack">BACK TO THE SEASON</button>' +
        '</div>' +
      '</div></div>';
  document.body.appendChild(ov);
  analyticsTrack("heatcheck_shown", Object.assign(analyticsRunSnapshot(), {
    surface: "heat_check_mid", action: "offer", game_no: gameNo, wins: winsSoFar, net: e.net
  }));

  var resolved = false;
  function resolve(boost) {
    if (resolved) return;
    resolved = true;
    if (ov.parentNode) ov.parentNode.removeChild(ov);
    onResolve(boost);
  }
  function segs() { return ov.querySelectorAll(".hh-seg"); }

  function midVerdict() {
    analyticsTrack("heatcheck_result", Object.assign(analyticsRunSnapshot(), {
      surface: "heat_check_mid", action: "spin_result", segment: seg.label, game_no: gameNo,
      outcome: qualifies ? "saved" : "no_save", hit_82: 0,
      net: qualifies ? newNet : e.net
    }));
    var v = ov.querySelector("#hhmVerdict");
    if (qualifies) {
      ov.classList.add("won");
      v.innerHTML = '<div class="hh-stamp">' + esc(shareSurname(G.picks[hotIdx].row[IDX.name]).toUpperCase()) + " CATCHES FIRE</div>" +
        '<div class="hh-netcap">' + esc(seg.label) + " \u00B7 VALUE \u00D7" + seg.m + " \u00B7 NET " + signed1(e.net) + " \u2192 " + signed1(newNet) + "</div>";
      buzz(45);
      var fw = ov.querySelector("#hhmFw"); if (fw && !reducedMotion()) fireGoats(fw);
    } else {
      ov.classList.add("missed");
      v.innerHTML = '<div class="hh-stamp miss">NO SAVE</div>' +
        '<div class="hh-netcap">' + esc(seg.label) + " \u00B7 THE LOSS LANDS</div>";
      buzz(10);
    }
    v.classList.add("on");
    ov.querySelector("#hhmActions").classList.add("on");
    ov.querySelector("#hhmBack").addEventListener("click", function () {
      resolve(qualifies ? { hotIdx: hotIdx, segIdx: segIdx, seg: seg, hotV: hotV, newNet: newNet } : null);
    });
  }

  function heat() {
    ov.querySelector("#hhmStep2").classList.add("on");
    var cs = segs(), N = cs.length, label = ov.querySelector("#hhmHeatLabel"), order = [], i, l;
    var laps = 4;
    for (l = 0; l < laps; l++) for (i = 0; i < N; i++) order.push(i);
    for (i = 0; i <= segIdx; i++) order.push(i);
    var base = order.length;
    var roll = Math.random(), burst = false;
    if (roll < 0.65) { /* clean stop */ }
    else if (roll < 0.85) {
      if (segIdx < N - 1) { order.push(segIdx + 1); order.push(segIdx); }
      else { order.push(segIdx - 1); order.push(segIdx); }
    } else {
      burst = true;
      for (i = 1; i <= N; i++) order.push((segIdx + i) % N);
    }
    order[order.length - 1] = segIdx;
    var gaps = [], t = 38, last = order.length - 1;
    for (i = 0; i < order.length; i++) {
      if (i < base) { gaps.push(t * 1.5); t *= 1.085; }
      else if (burst) gaps.push((i === last - 1 ? 300 : 72 - (i - base) * 10) * 1.5);
      else gaps.push((250 + (i % 2) * 70 + Math.random() * 110) * 1.5);
    }
    var acc = 0;
    order.forEach(function (ci, j) {
      setTimeout(function () {
        if (!ov.parentNode) return;
        for (var z = 0; z < N; z++) cs[z].classList.remove("lit");
        cs[ci].classList.add("lit");
        label.textContent = HH_SEGMENTS[ci].label;
        label.className = "hh-heatlabel lvl" + HH_SEGMENTS[ci].lvl;
        var fast = j < base || (burst && j < last - 1);
        label.style.transform = "scale(" + (fast ? 1.18 : 1) + ")";
        buzz(j < base ? 5 : (fast ? 6 : 11));
        if (j === order.length - 1) {
          for (var f = 0; f <= segIdx; f++) cs[f].classList.add("fill");
          cs[segIdx].classList.add("result");
          buzz(segIdx === 4 ? 40 : 18);
          if (segIdx === 4) supernovaErupt(label);
          else if (segIdx === 3) sprayFromEl(label, FIRE_EMOJI);
          setTimeout(midVerdict, 560);
        }
      }, acc);
      acc += gaps[j];
    });
  }

  function reelSpin() {
    ov.querySelector("#hhmStep1").classList.add("on");
    var strip = ov.querySelector("#hhmStrip"), endY = -((targetFlat - 1) * ITEM);
    function land() {
      if (!ov.parentNode) return;
      var rows = strip.querySelectorAll(".hh-name");
      if (rows[targetFlat]) rows[targetFlat].classList.add("hot");
      buzz(18);
      setTimeout(heat, 470);
    }
    function glide(to, dur, ease) { strip.style.transition = "transform " + dur + "s " + ease; strip.style.transform = "translateY(" + to + "px)"; }
    var variant = Math.floor(Math.random() * 3);
    if (variant === 1) {
      requestAnimationFrame(function () { glide(endY - ITEM, 2.3, "cubic-bezier(.1,.72,.18,1)"); });
      setTimeout(function () { if (ov.parentNode) { glide(endY, 0.52, "cubic-bezier(.34,0,.3,1)"); buzz(8); } }, 2360);
      setTimeout(land, 2900);
    } else if (variant === 2) {
      requestAnimationFrame(function () { glide(endY + ITEM, 2.2, "cubic-bezier(.08,.8,.1,1)"); });
      setTimeout(function () { if (ov.parentNode) { glide(endY, 0.66, "cubic-bezier(.5,0,.5,1)"); buzz(9); } }, 2620);
      setTimeout(land, 3300);
    } else {
      requestAnimationFrame(function () { glide(endY, 2.6, "cubic-bezier(.12,.66,.18,1)"); });
      setTimeout(land, 2640);
    }
  }

  var lever = ov.querySelector("#hhmLever"), arm = ov.querySelector("#hhmArm");
  var pullState = wireBallPull(lever, arm, function () {
    analyticsTrack("heatcheck_action", Object.assign(analyticsRunSnapshot(), {
      surface: "heat_check_mid", action: "pull", pulled: 1, game_no: gameNo
    }));
    var chBtn = ov.querySelector("#hhmCharity"); if (chBtn) chBtn.classList.add("gone");
    setTimeout(function () { ov.classList.add("lit"); reelSpin(); }, 640);
  });
  ov.querySelector("#hhmCharity").addEventListener("click", function () {
    if (pullState.fired()) return;
    analyticsTrack("heatcheck_declined", Object.assign(analyticsRunSnapshot(), {
      surface: "heat_check_mid", action: "decline", game_no: gameNo
    }));
    if (window.T82 && T82.declineHeat) T82.declineHeat(G);
    resolve(null);
  });
}

/* Fold a mid-season boost into the rendered results. The realized record,
   climb wins and goat fireworks already came in through e.winTally, so this
   patches only what the record alone cannot tell: the split net label, the
   Scoring Card bonus row, the hot pick highlight, and the climb re-plot to
   the realized wins (the same override the post-season verdict applies). */
function applyMidBoostToResults(e) {
  var hm = G.hotMid;
  if (!hm) return;
  var card = document.querySelector('.pick-card[data-pick="' + hm.hotIdx + '"]');
  if (card) {
    card.classList.add("hot-pick");
    var pv = card.querySelector(".pr-v");
    if (pv) pv.innerHTML = "<small>V</small>" + hm.hotV.toFixed(2) + ' <span class="hot-bonus">+ ' + (G.hotValue - hm.hotV).toFixed(2) + "</span>";
  }
  var lbl = document.querySelector(".big-label");
  if (lbl) lbl.innerHTML = 'net rating <span class="net-base">' + signed1(e.net) +
    '</span> <span class="net-bonus">+ ' + (hm.newNet - e.net).toFixed(1) + "</span>";
  setEliteResultGlow(e.winTally);
  var cl = document.querySelector(".climb");
  if (cl) { cl.outerHTML = climbHtml(e, e.winTally); setupGoatFireworks(e.winTally >= CFG.GAMES_IN_SEASON); }
  var ledgerEl = document.querySelector(".ledger");
  var totalRow = ledgerEl && ledgerEl.querySelector(".ledger-row.total");
  if (totalRow) {
    var bonusRow = document.createElement("div");
    bonusRow.className = "ledger-row";
    bonusRow.innerHTML = '<span>Hot Hand bonus<span class="why">' + esc(hm.seg.label) + " \u2014 " +
      esc(shareSurname(G.picks[hm.hotIdx].row[IDX.name])) + " caught fire in Game " + hm.gameNo + " (value \u00D7" + hm.seg.m + ").</span></span>" +
      '<span class="ledger-amt hot">+' + fmt1(hm.newNet - e.net) + "</span>";
    totalRow.parentNode.insertBefore(bonusRow, totalRow);
    var amtEl = totalRow.querySelector(".ledger-amt");
    if (amtEl) amtEl.textContent = signed1(hm.newNet);
    var whyEl = totalRow.querySelector(".why");
    if (whyEl) whyEl.textContent = "Score " + fmt1(e.score) + " + Hot Hand " + fmt1(hm.newNet - e.net) + " minus baseline " + fmt1(BASELINE) + ".";
  }
}

function showSeasonReel(season, e, done, midTrigger) {
  var ov = document.createElement("div");
  ov.className = "reel-overlay";
  ov.innerHTML = '<div class="reel-card">' +
    '<div class="reel-head"><span class="reel-eyebrow">THE SEASON \u00B7 GAME BY GAME</span></div>' +
    '<div class="reel-board" id="reelBoard">' +
      '<div class="reel-cell"><span class="reel-cap">GAME</span><span class="reel-num mono" id="reelGame">0</span></div>' +
      '<div class="reel-cell reel-cell-mid"><span class="reel-cap">RECORD</span><span class="reel-num mono" id="reelRun">0\u20130</span></div>' +
      '<div class="reel-cell"><span class="reel-cap">PACE</span><span class="reel-num mono" id="reelPace">\u00B7</span></div>' +
    '</div>' +
    '<p class="reel-explain">Your 82 game season, October through April. One square is one game.</p>' +
    '<div class="reel-flash mono" id="reelFlash" aria-live="polite"></div>' +
    '<div class="reel-acts" id="reelActs"></div>' +
    '<button class="reel-skip" id="reelSkip" type="button">SKIP TO RESULTS \u2192</button></div>';
  document.body.appendChild(ov);
  var acts = ov.querySelector("#reelActs"), runEl = ov.querySelector("#reelRun");
  var gameEl = ov.querySelector("#reelGame"), paceEl = ov.querySelector("#reelPace");
  var boardEl = ov.querySelector("#reelBoard"), flashEl = ov.querySelector("#reelFlash");
  var finished = false, timers = [], flashT = 0;
  // v47.15 cursor engine, v49.4 scoreboard cut: one square per tick always,
  // so the Mid-Season Heat Check pause check stays square-exact under any
  // tempo. Losses get a hang BEFORE they land and a beat after the notable
  // ones; the scoreboard, pace, and event flash update inside placeSquare.
  var gi = 0, cw = 0, clx = 0, wStreak = 0, lStreak = 0, lossArmed = false;
  var mi = -1, monthLeft = 0, monthW = 0, monthL = 0, row = null, recEl = null;
  var triggerIdx = -1, overlayUp = false;
  if (midTrigger) { for (var g0 = 0; g0 < season.games.length; g0++) { if (!season.games[g0]) { triggerIdx = g0; break; } } }
  var midDone = (triggerIdx < 0);

  // Tempo is the arc: a watchable open, a compressed middle, a slow April.
  var MONTH_GAP = [52, 44, 22, 22, 22, 22, 115];
  var MONTH_LEAD = [650, 900, 420, 420, 420, 420, 780];

  function schedule(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function bump(n) { n.classList.remove("tick"); void n.offsetWidth; n.classList.add("tick"); }
  function flash(txt, hold) {
    flashEl.textContent = txt;
    flashEl.classList.add("on");
    clearTimeout(flashT);
    flashT = setTimeout(function () { flashEl.classList.remove("on"); }, hold || 2600);
  }

  function finishReel() {
    if (finished) return;
    if (overlayUp) return;                                    // the Heat Check owns the moment
    if (!midDone && triggerIdx >= 0) { fastForwardToPause(); return; }   // SKIP cannot dodge the spin
    finished = true;
    timers.forEach(clearTimeout);
    clearTimeout(flashT);
    ov.remove();
    done();
  }
  ov.querySelector("#reelSkip").addEventListener("click", function (ev) { ev.stopPropagation(); finishReel(); });

  function openMonth() {
    mi++;
    monthW = 0; monthL = 0; monthLeft = REEL_MONTHS[mi][1];
    row = document.createElement("div");
    row.className = "reel-act";
    row.innerHTML = '<div class="reel-mo-line"><span class="reel-mo">' + REEL_MONTHS[mi][0] + '</span>' +
      '<span class="reel-mo-rec mono">0\u20130</span></div>' +
      '<div class="reel-grid"></div>' +
      '<p class="reel-note reel-note-pending"></p>';
    row.__grid = row.querySelector(".reel-grid");
    recEl = row.querySelector(".reel-mo-rec");
    acts.appendChild(row);
    acts.scrollTop = acts.scrollHeight;
  }
  function closeMonth() {
    if (!row || row.__closed) return;
    row.__closed = true;
    var note = row.querySelector(".reel-note");
    note.textContent = reelLine(mi, monthW, monthL, cw, clx);
    note.classList.remove("reel-note-pending");
    acts.scrollTop = acts.scrollHeight;
  }
  // quiet=true is the fast-forward path: squares and totals land, no ceremony.
  function placeSquare(quiet) {
    var win = season.games[gi];
    var seasonFirstL = !win && clx === 0;
    var monthFirstL = !win && monthL === 0;
    var sq = document.createElement("span");
    sq.className = "reel-day " + (win ? "w" : "l");
    sq.textContent = win ? "W" : "L";
    if (!win && (seasonFirstL || monthFirstL) && !quiet) sq.classList.add("big");
    row.__grid.appendChild(sq);
    if (win) { cw++; monthW++; wStreak++; lStreak = 0; } else { clx++; monthL++; lStreak++; wStreak = 0; }
    gi++; monthLeft--;
    runEl.textContent = cw + "\u2013" + clx;
    gameEl.textContent = String(gi);
    paceEl.textContent = String(Math.max(0, Math.min(CFG.GAMES_IN_SEASON, Math.round(cw * CFG.GAMES_IN_SEASON / gi))));
    recEl.textContent = monthW + "\u2013" + monthL;
    boardEl.classList.toggle("perfect", clx === 0);
    if (!quiet) {
      bump(runEl); bump(paceEl);
      if (!win && seasonFirstL) { flash("The zero died. " + reelDate(gi - 1) + "."); buzz(16); }
      else if (!win && monthFirstL) { flash(reelBlame(gi - 1)); buzz(12); }
      else if (win && wStreak >= 10 && wStreak % 5 === 0) { flash(wStreak + " STRAIGHT WINS"); buzz(8); }
      else if (!win && lStreak === 3) { flash("Three straight losses."); buzz(10); }
    }
    return !win && (seasonFirstL || monthFirstL);
  }

  function advance() {
    if (finished) return;
    if (gi >= season.games.length) { schedule(closeMonth, 120); schedule(finale, 640); return; }
    if (mi >= 0) schedule(closeMonth, 120);
    schedule(function () { openMonth(); schedule(tick, 140); }, MONTH_LEAD[mi + 1]);
  }
  function tick() {
    if (finished) return;
    if (!midDone && gi === triggerIdx) { firePause(); return; }
    var willLose = !season.games[gi];
    if (willLose && !lossArmed) {
      lossArmed = true;                                        // the hang before a loss lands
      schedule(tick, (clx === 0 || monthL === 0) ? 460 : 150);
      return;
    }
    lossArmed = false;
    var big = placeSquare(false);
    if (monthLeft === 0) advance();
    else schedule(tick, big ? 520 : MONTH_GAP[mi]);
  }

  function applyMidBoost(boost) {
    var p2 = phi(boost.newNet / SC.NET_SD);
    for (var i = gi; i < season.games.length; i++) season.games[i] = Math.random() < p2;
    var w2 = 0;
    for (var j = 0; j < season.games.length; j++) { if (season.games[j]) w2++; }
    season.wins = w2; season.losses = season.games.length - w2;
    var eRef = midTrigger.e;
    eRef.winTally = season.wins; eRef.season = season;
    G.hotMid = { hotIdx: boost.hotIdx, segIdx: boost.segIdx, seg: boost.seg, hotV: boost.hotV, newNet: boost.newNet, gameNo: gi + 1 };
    G.hotIdx = boost.hotIdx;
    G.hotLvl = boost.seg.lvl;
    G.hotValue = boost.hotV * (1 + (boost.seg.m - 1) * HH_BONUS_SCALE);
    G.hotBase = eRef.net; G.hotNewNet = boost.newNet; G.hotWins = season.wins;
  }
  function firePause() {
    overlayUp = true;
    hotHandMid(midTrigger.e, gi + 1, gi, function (boost) {
      overlayUp = false; midDone = true;
      if (boost) applyMidBoost(boost);
      schedule(tick, 420);
    });
  }
  function fastForwardToPause() {
    timers.forEach(clearTimeout); timers = [];
    while (gi < triggerIdx) {
      if (mi < 0 || monthLeft === 0) { closeMonth(); openMonth(); }
      placeSquare(true);
    }
    if (mi < 0 || monthLeft === 0) { closeMonth(); openMonth(); }
    acts.scrollTop = acts.scrollHeight;
    firePause();
  }

  function finale() {
    if (finished) return;
    var undef = season.losses === 0;
    var comp = shareCompFor(season.wins, undef);
    var pct = (typeof G.sharePct === "number") ? G.sharePct : null;
    var line = undef ? "Eighty two and zero. Say it out loud."
      : comp ? comp + (pct !== null ? " \u2022 Top " + pct + "%" : "") + "."
      : pct !== null ? "Top " + pct + "% of all lineups."
      : "The verdict is in.";
    var fin = document.createElement("div");
    fin.className = "reel-final";
    fin.innerHTML = '<span class="reel-final-rec">' + season.wins + "\u2013" + season.losses + '</span>' +
      '<p class="reel-note">' + esc(line) + '</p>' +
      '<button class="reel-done" id="reelDone" type="button">SEE THE FULL RESULTS \u2192</button>';
    acts.appendChild(fin);
    fin.querySelector("#reelDone").addEventListener("click", function (ev) { ev.stopPropagation(); finishReel(); });
    acts.scrollTop = acts.scrollHeight;
  }

  advance();
}

/* ---------- SPORTSREF DEEP-LINK LAW (v30) ----------
   Direct player pages, verified — never a blind guess. bbref-map.json is
   built at dev time from the SAME upstream as site_data.json (sumitrodatta's
   Basketball-Reference datasets): p = name -> slug for every pool player the
   build could verify (season+team joins break name ties), a = names the pool
   genuinely cannot disambiguate (some pool entries merge two real careers —
   search is CORRECT for them, not a fallback), b = every slug base in
   history, so a post-dataset rookie gets a constructed {base}01 ONLY when
   the base is virgin; a contested base means 01 belongs to someone else.
   Anchors RENDER with the search URL (always right) and upgrade in place
   when the map lands — no race, no boot cost; the map is fetched once per
   session at finish time. Verified names also earn a season -> game-log
   link (/players/x/slug/gamelog/year — deterministic once the slug is
   verified). Regenerating the map: re-run the build against the upstream
   CSVs and bump the ?v= below. Referrer law unchanged: noopener, never
   noreferrer. */
var BBREF_MAP = null, BBREF_MAP_P = null;
function loadBbrefMap() {
  if (BBREF_MAP_P) return BBREF_MAP_P;
  var started = Date.now();
  var httpFailed = false;
  BBREF_MAP_P = fetch("/bbref-map.json?v=1")
    .then(function (r) {
      if (!r.ok) {
        httpFailed = true;
        analyticsTrack("data_error", { action: "bbref_map", source: "bbref-map.json", outcome: "http", http_status: r.status, load_ms: Date.now() - started });
        return null;
      }
      return r.json();
    })
    .then(function (d) {
      BBREF_MAP = (d && d.p) ? d : null;
      if (!httpFailed) {
        analyticsTrack(BBREF_MAP ? "data_ready" : "data_error", {
          action: "bbref_map", source: "bbref-map.json", outcome: BBREF_MAP ? "success" : "invalid",
          load_ms: Date.now() - started
        });
      }
      return BBREF_MAP;
    })
    .catch(function (err) {
      analyticsTrack("data_error", {
        action: "bbref_map", source: "bbref-map.json", outcome: "network",
        error_code: String(err && err.name || "fetch_error"), detail: String(err && err.message || err || "").slice(0, 180),
        load_ms: Date.now() - started
      });
      return null;
    });
  return BBREF_MAP_P;
}
// UTM CAMPAIGN LAW (v34): every Basketball-Reference link carries
// utm_source=true82.net AND utm_campaign={surface}, so Sports Reference's
// analytics shows SEGMENTED referral volume per product surface — the
// referrer header proves the origin, the campaign proves which door.
function bbrefTag(url, camp) {
  return url + (url.indexOf("?") === -1 ? "?" : "&") +
    "utm_source=true82.net&utm_campaign=" + (camp || "site");
}
function bbrefSearch(name, camp) {
  return bbrefTag("https://www.basketball-reference.com/search/?search=" + encodeURIComponent(name), camp);
}
function bbrefBaseGuess(name) {
  var ascii = (name.normalize ? name.normalize("NFD") : name).replace(/[\u0300-\u036f]/g, "");
  ascii = ascii.replace(/\s+(Jr|Sr|II|III|IV|V)\.?$/i, "");
  var parts = ascii.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  var first = parts[0].replace(/[^A-Za-z]/g, "").toLowerCase();
  var last = parts[parts.length - 1].replace(/[^A-Za-z]/g, "").toLowerCase();
  if (!first || !last) return null;
  return last.slice(0, 5) + first.slice(0, 2);
}
function bbrefHref(name, camp) {
  var m = BBREF_MAP;
  if (m) {
    var slug = m.p[name];
    if (slug) return bbrefTag("https://www.basketball-reference.com/players/" + slug.charAt(0) + "/" + slug + ".html", camp);
    if (m.a && m.a.indexOf(name) !== -1) return bbrefSearch(name, camp);
    var base = bbrefBaseGuess(name);
    if (base && m.b && m.b.indexOf(base) === -1) {
      return bbrefTag("https://www.basketball-reference.com/players/" + base.charAt(0) + "/" + base + "01.html", camp);
    }
  }
  return bbrefSearch(name, camp);
}
// Upgrade in place: every a[data-bb] gets its verified career href (campaign
// from data-camp); an anchor that ALSO carries data-bb-gl="{year}" (the Hot
// Hand button) gets that season's game log when the slug is verified,
// otherwise it keeps the search URL. Idempotent; no-ops until the map lands.
// ARTICLE LINKIFY LAW (v34): the Tribune article gets newspaper-style
// citations — the FIRST occurrence of each of the five's surnames becomes a
// career link (campaign "article"). Positions are claimed on the untouched
// escaped text and spliced from the end, so an inserted href can never be
// re-matched by a later surname. The server twin lives in functions/[id].js;
// change both in one commit.
function bbrefLastName(nm) {
  var parts = String(nm).trim().split(/\s+/);
  if (parts.length < 2) return null;
  var rest = parts.slice(1);
  while (rest.length > 1 && /^(jr\.?|sr\.?|ii|iii|iv|v)$/i.test(rest[rest.length - 1])) rest.pop();
  return rest.join(" ");
}
function bbrefLinkifyArticle(article, names, camp) {
  var text = esc(String(article || ""));
  var claims = [];
  for (var i = 0; i < names.length; i++) {
    var last = bbrefLastName(names[i]);
    if (!last) continue;
    var re = new RegExp("\\b" + last.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
    var from = 0, pos = -1;
    while (from < text.length) {
      var m = re.exec(text.slice(from));
      if (!m) break;
      var at = from + m.index;
      var clash = false;
      for (var k = 0; k < claims.length; k++) {
        if (at < claims[k].end && at + last.length > claims[k].start) { clash = true; break; }
      }
      if (!clash) { pos = at; break; }
      from = at + last.length;
    }
    if (pos !== -1) claims.push({ start: pos, end: pos + last.length, name: names[i], txt: last });
  }
  claims.sort(function (a, b) { return b.start - a.start; });
  for (var j = 0; j < claims.length; j++) {
    var c = claims[j];
    text = text.slice(0, c.start) +
      '<a class="art-bref" href="' + bbrefHref(c.name, camp) + '" target="_blank" rel="noopener">' + c.txt + "</a>" +
      text.slice(c.end);
  }
  return text;
}
function upgradeBbrefLinks() {
  if (!BBREF_MAP) return;
  var as = document.querySelectorAll("a[data-bb]");
  for (var i = 0; i < as.length; i++) {
    var a = as[i], nm = a.getAttribute("data-bb"), camp = a.getAttribute("data-camp") || "site";
    var gl = a.getAttribute("data-bb-gl");
    var slug = BBREF_MAP.p[nm];
    if (gl && slug && /^\d{4}$/.test(gl)) {
      a.setAttribute("href", bbrefTag("https://www.basketball-reference.com/players/" + slug.charAt(0) + "/" + slug + "/gamelog/" + gl, camp));
    } else {
      a.setAttribute("href", bbrefHref(nm, camp));
    }
  }
}
function renderResults(e, keepScroll) {
  // v30.2 hardening: if this render ever runs again (a future keepScroll
  // path), freshly built anchors must not quietly revert to search URLs.
  // The upgrade is idempotent and no-ops until the map has landed.
  setTimeout(function () { upgradeBbrefLinks(); }, 0);
  renderPips();
  var scrollY = keepScroll ? window.scrollY : 0;
  // SPORTSREF LAW (v30, supersedes v28's search-only rule): names render
  // with the search URL and UPGRADE to verified direct player pages when
  // bbref-map.json lands (see the deep-link law above renderResults);
  // verified seasons upgrade to that year's game log. Surfaces unchanged:
  // results five + Tribune editions in the game loop, never mid-draft.
  // Homepage credits carry utm_source=true82.net; deep links stay clean.
  // rel is noopener WITHOUT noreferrer on purpose: the site's
  // strict-origin-when-cross-origin policy hands Sports Reference a clean
  // true82.net referral for every click, which is the point.
  // v34 (owner ruling): the TEAM name links that season's team page
  // (/teams/{CODE}/{endYear} — deterministic, live immediately, no map
  // needed); the season game-log door is retired ("too hard to read every
  // game log"). Multi-team season codes (TOT/2TM style) stay plain text.
  function prTeamHtml(row, fr) {
    var code = String(row[IDX.team] || ""), yr = row[IDX.season];
    var linkable = /^[A-Z]{3}$/.test(code) && code !== "TOT";
    var team = esc(titleCase(fr));
    return '<span class="pr-yr">' + shortSeason(yr) + '</span> ' + (linkable
      ? '<a class="pr-team" href="' + bbrefTag("https://www.basketball-reference.com/teams/" + code + "/" + yr + ".html", "results_team") + '" target="_blank" rel="noopener">' + team + "</a>"
      : '<span>' + team + "</span>");
  }
  var picksHtml = picksInSlotOrder().map(function (entry) {
    var p = entry.p, i = entry.i, row = p.row, name = row[IDX.name];
    return '<div class="pick-card" data-pick="' + i + '">' +
      '<div class="pick-top"><span class="pr-name"><span class="slot-badge">' + p.slot + "</span>" +
        '<a class="pr-bref" data-bb="' + esc(name) + '" data-camp="results_five" href="' + bbrefSearch(name, "results_five") + '" target="_blank" rel="noopener">' + esc(name) + "</a></span>" +
      '<span class="pr-v"><small>V</small>' + valueOf(row).toFixed(2) + "</span></div>" +
      '<div class="pr-sub">' + prTeamHtml(row, p.fr) + chipsFor(row) + "</div>" +
      '<div class="pr-sub pr-stats">' + statLine(row) + "</div></div>";
  }).join("");

  var ledger = '<div class="ledger">' +
    '<div class="ledger-row"><span>Raw talent \u03A3V<span class="why">Sum of each pick\u2019s value over a replacement-level player.</span></span><span class="ledger-amt">' + fmt1(e.sumV) + "</span></div>" +
    ledgerRow("Usage tax", "\u03A3 usage " + fmt1(e.sumUsage) + " vs budget " + Math.round(SC.USAGE_BUDGET) + " \u2014 one ball; overlapping shot demand costs efficiency.", e.usageTax, e.usageTax > 0) +
    (e.spacingBonus > 0
      ? ledgerCreditRow("Spacing bonus", e.sumSp + " shooters \u2014 extra spacing stretches the defense past the requirement.", e.spacingBonus)
      : ledgerRow("Spacing tax", e.sumSp + " of " + SC.SPACERS_REQ + " required spacers \u2014 without shooting, the floor shrinks.", e.spacingTax, e.spacingTax > 0)) +
    (e.backDefTax > 0
      ? ledgerRow("Backcourt defense", "Both guards rank bottom-" + (e.backDefTier === 20 ? "20" : "33") + "% among guard defenders (DBPM) \u2014 the perimeter leaks.", e.backDefTax, true)
      : "") +
    (e.wingDefTax > 0
      ? ledgerRow("Wing defense", "Both forwards rank bottom-" + (e.wingDefTier === 20 ? "20" : "33") + "% among forward defenders (DBPM) \u2014 the frontcourt gets cooked.", e.wingDefTax, true)
      : "") +
    (e.rimDefTax > 0
      ? ledgerRow("Rim protection", "None of your two forwards or center ranks top-20% among frontcourt defenders (DBPM) \u2014 bad rim defense; the paint stays open.", e.rimDefTax, true)
      : "") +
    (e.glassTax > 0
      ? ledgerRow("Glass", "Your five don\u2019t rebound \u2014 era-adjusted board rate is bottom of the league; second chances all go the other way.", e.glassTax, true)
      : "") +
    (e.creatorTax > 0
      ? ledgerRow("No creator", "Nobody\u2019s era-adjusted assist rate says he can run an offense \u2014 good luck beating a set defense 82 times.", e.creatorTax, true)
      : "") +
    (e.ageTax > 0
      ? ledgerRow("Mileage", e.vetCount + " players past their " + SC.AGE_VET_YEAR + "th season \u2014 heavy legs; an 82-game schedule is the sixth defender.", e.ageTax, true)
      : "") +
    '<div class="ledger-row total"><span>Team score \u2192 net rating<span class="why">Score ' + fmt1(e.score) + " minus league baseline " + fmt1(BASELINE) + ".</span></span><span class=\"ledger-amt\">" + signed1(e.net) + "</span></div></div>";

  // THE DAILY results layer. The official-run law lives here: the first finish
  // of the day claims official (with a run nonce so a Heat Check landing after
  // this render can still amend its own totals); every later run is practice
  // and the share button always carries the official numbers. Storage gone?
  // officialFor returns null and this run shares itself: fail-soft.
  var daily = null;
  if (G.social && window.T82DAILY) {
    var dres = dailyResFromG(e);
    var dOfficial = T82DAILY.officialFor(G.social.key);
    if (!dOfficial) {
      if (!G.social.nonce) G.social.nonce = String(Date.now()) + "-" + Math.floor(Math.random() * 1e6);
      dOfficial = T82DAILY.recordOfficial(G.social.key, G.social.num, dres, G.social.nonce) || dres;
    }
    var dIsOfficial = !!(G.social.nonce && dOfficial && dOfficial.nonce === G.social.nonce);
    var dTargetHtml = "";
    if (G.social.target) {
      var tw = G.social.target.w, tn = G.social.target.n;
      var beat = dres.wins > tw || (dres.wins === tw && dres.net > tn + 1e-9);
      var tied = dres.wins === tw && Math.abs(dres.net - tn) <= 1e-9;
      dTargetHtml = '<div class="daily-target-line ' + (beat ? "dt-win" : "dt-hold") + '">Their five: ' +
        tw + "-" + (CFG.GAMES_IN_SEASON - tw) + " (Net " + T82DAILY.signedNet(tn) + ") \u00B7 " +
        (beat ? "You take the board." : tied ? "Dead heat. Run it back." : "They hold the board.") + "</div>";
    }
    daily = { res: dres, official: dOfficial, isOfficial: dIsOfficial, targetHtml: dTargetHtml };
    var postDailyProfile = analyticsDailyProfile();
    if (postDailyProfile) analyticsTrack("return_profile", Object.assign(postDailyProfile, {
      mode: G.social.base || MODE, surface: "results", action: "post_daily_finish",
      daily_num: G.social.num, official: dIsOfficial ? 1 : 0, practice: dIsOfficial ? 0 : 1
    }));
  }
  var boardEyebrow = daily
    ? "The Daily #" + G.social.num + " \u00B7 " + esc(G.social.name)
    : "Front office projection \u00B7 " + (MODE === "pro" ? "pro draft" : MODE === "cap" ? "salary cap" : "classic draft");
  // v24: the nested plaque is gone. Its ornate border moved to the board
  // itself, the OFFICIAL RUN stamp rides the top under the eyebrow, and the
  // challenge line (when present) keeps its old spot. Verdict + brand retired.
  var dailyBoardHtml = daily ? daily.targetHtml : "";
  var dailyHeadHtml = "";
  if (daily) {
    var dhlDot = ' <b class="dhl-dot">\u25CF</b> ';
    dailyHeadHtml = '<div class="daily-head-line">' +
      "THE DAILY #" + G.social.num + dhlDot +
      (daily.isOfficial
        ? "OFFICIAL RUN" + dhlDot + "LOCKED"
        : "PRACTICE RUN" + dhlDot + "OFFICIAL " + daily.official.wins + "-" + (CFG.GAMES_IN_SEASON - daily.official.wins)) +
    '</div>';
  }
  var compLadder = HISTORY_COMPS.slice().sort(function (a, b) { return a.wins - b.wins; });
  var compAbove = null;
  for (var ci = 0; ci < compLadder.length; ci++) {
    if (compLadder[ci].wins > e.winTally) { compAbove = compLadder[ci]; break; }
  }
  function compLinkHtml(prefix, entry) {
    var h = compEntryHref(entry, "climb");
    var lbl = compArticle(entry.label);
    if (!h) return esc(prefix + lbl);
    // the article word stays plain text; only the label itself is the anchor
    var lead = lbl.slice(0, lbl.length - entry.label.length);
    return esc(prefix + lead) + '<a class="cl-link" href="' + h + '" target="_blank" rel="noopener">' + esc(entry.label) + "</a>";
  }
  var compHtml = e.winTally >= CFG.GAMES_IN_SEASON
    ? esc("Greatest of all GOATs")
    : compAbove
      ? compLinkHtml("Almost as good as ", compAbove)
      : compLinkHtml("Better than ", compLadder[compLadder.length - 1]);
  var shareLabel = !daily ? "SHARE YOUR TEAM"
    : daily.isOfficial ? "SHARE THE DAILY"
    : "SHARE OFFICIAL (" + daily.official.wins + "-" + (CFG.GAMES_IN_SEASON - daily.official.wins) + ")";
  document.body.classList.remove("drafting");
  document.body.classList.remove("gating");
  app().innerHTML =
    resultsTopBarHtml() +
    '<section class="board' + (daily ? " plq-frame daily-framed" : "") + '" data-result-section="summary"><div class="goat-fw" id="wlFw" aria-hidden="true"></div>' +
    (daily ? dailyHeadHtml : '<p class="eyebrow">' + boardEyebrow + "</p>") +
      '<div class="big">' + e.winTally + "\u2013" + (CFG.GAMES_IN_SEASON - e.winTally) + "</div><div class=\"big-label\">net rating " + signed1(e.net) + "</div>" +
      '<div class="res-comp">' + compHtml + '</div>' +
      dailyBoardHtml +
      '<button class="btn btn-primary btn-block presti-spin' + ((e.winTally === 81 || e.winTally === 82) ? ' elite-result' : '') + '" id="shareTeamBtn" data-share-label="' + shareLabel + '">' + shareLabel + '</button></section>' +
    '<section class="section twoway-sec" data-result-section="two_way">' + twoWayHtml(e) + "</section>" +
    '<section class="section traits-roster" data-result-section="roster">' +
      '<div class="traits-roster-head"><p class="eyebrow">Your five</p>' +
        '<button class="trait-info-btn" id="traitInfoBtn" type="button" aria-label="Explain player labels" aria-controls="traitLegend" aria-expanded="false" title="Player label legend" hidden>i</button></div>' +
      '<div class="trait-legend" id="traitLegend" hidden></div>' + picksHtml +
      '<p class="bref-credit">Tap a name for the career, the team for that season \u00B7 <a href="https://www.basketball-reference.com/?utm_source=true82.net&utm_campaign=results_credit" target="_blank" rel="noopener">Basketball-Reference</a></p></section>' +
    '<section class="section" data-result-section="goat_climb"><p class="eyebrow">GOAT Climb</p>' + climbHtml(e) + "</section>" +
    '<section class="section" data-result-section="scoring_card"><p class="eyebrow">Scoring Card</p>' + ledger + "</section>" +
    '<section class="section traits-prompt" data-result-section="traits_prompt" id="traitsPromptSec" hidden></section>' +
    '<div class="actions" data-result-section="replay"><button class="btn btn-primary presti-spin" id="againBtn">' + (daily ? "Run it back \u00B7 practice" : "Run it back") + '</button></div>' +
    '<p class="run-status" id="runStatus"></p>';

  trackResultSections();
  wireTraitsPrompt();
  wireTraitCardUi();   // engine chips are in the initial markup; labels rebuild the legend when they land
  wireTraitsLabels(picksInSlotOrder().map(function (en) {
    return { i: en.i, name: en.p.row[IDX.name], season: en.p.row[IDX.season] };
  }));

  el("againBtn").addEventListener("click", function () {
    analyticsTrack("replay", Object.assign(analyticsRunSnapshot(), { surface: "results", action: daily ? "daily_practice" : "same_mode" }));
    if (daily) {
      // Same board, same modifier, target kept: a practice rematch, never a
      // fresh random game. boardFor is deterministic, so a rerun after local
      // midnight still rebuilds the board this run was played on.
      var rb = T82DAILY.boardFor(G.social.key);
      startDailyRun(rb, G.social.target || null, "daily-practice:" + rb.num);
      return;
    }
    newGame();
  });
  wireStartOver();
  wireDonate();
  el("shareTeamBtn").addEventListener("click", function () {
    var e2 = engine(G.picks.map(function (p) { return p.row; }), G.picks.map(function (p) { return p.slot; }));
    if (daily) {
      // THE DAILY share: always the official run, data-first (grade + five +
      // beat link, no Tribune slug, no nickname). The 5-square grade and the
      // named five are the payload; the AI layer stays in-session.
      var off = T82DAILY.officialFor(G.social.key) || daily.res;
      var dTrack = { mode: MODE, wins: off.wins, net: off.net,
        value: (typeof off.pct === "number") ? off.pct
          : (daily.isOfficial && typeof G.sharePct === "number") ? G.sharePct : null,
        undefeated: off.wins >= CFG.GAMES_IN_SEASON ? 1 : 0,
        // Preserve how this run was entered (official tile, friend link, or
        // practice). The payload still shares the locked official result.
        variant: analyticsVariant() || ("daily:" + G.social.num),
        surface: "results", action: "daily_result" };
      if (window.t82track) window.t82track("share_click", dTrack);
      // pct rides the official record once /api/percentile amends it; a
      // practice run shares the OFFICIAL numbers, so its own fresh G.sharePct
      // only applies when this run IS the official one. Fail-soft: no pct,
      // no line 3.
      shareOrCopy(T82DAILY.shareTextDaily(
        { key: G.social.key, num: G.social.num, name: G.social.name },
        { wins: off.wins, net: off.net,
          five: off.five && off.five.length ? off.five : dailyFiveLines(),
          emoji: shareEmojiFor(off.wins, (G.social && G.social.shareEmoji) || null, G.social.base),
          comp: shareCompFor(off.wins),
          pct: (typeof off.pct === "number") ? off.pct
             : (daily.isOfficial && typeof G.sharePct === "number") ? G.sharePct : null }
      ), null, dTrack);
      return;
    }
    var sw = (typeof G.hotNewNet === "number") ? G.hotWins : e2.winTally;
    var sn = (typeof G.hotNewNet === "number") ? G.hotNewNet : e2.net;
    var sTrack = { mode: MODE, wins: sw, net: sn,
      value: (typeof G.sharePct === "number") ? G.sharePct : null,
      undefeated: sw >= CFG.GAMES_IN_SEASON ? 1 : 0,
      surface: "results", action: "team_result" };
    if (window.t82track) window.t82track("share_click", sTrack);
    publishRecap();
    shareOrCopy(shareText(e2), null, sTrack);
  });
  setupGoatFireworks(e.winTally >= CFG.GAMES_IN_SEASON);
  // The Tribune is now the season-end ceremony. The Heat Check lever survives ONLY
  // when a real spin is pending (exactly 81 wins in Presti, or the QA flag) — its
  // old non-clutch "reveal my results" role is the paper's job now. For gated
  // papers the drafted-82-0 W/L burst waits for the paper to close.
  var clutchPending = hhEligible(e) && !G.hhMidUsed && (FORCE_CLUTCH || e.winTally === CFG.GAMES_IN_SEASON - 1);
  if (clutchPending) {
    hotHand(e);                       // recap request fires from verdict() with post-boost totals
  } else if (MODE !== "kaman") {
    prepareRecap(e, e.winTally,
      G.hotMid ? G.hotNewNet : e.net,
      G.hotMid ? { player: shareSurname(G.picks[G.hotMid.hotIdx].row[IDX.name]), tier: G.hotMid.seg.label } : null);   // payload only; the model call fires on unwrap
    G.recapAuto = 1;
    G.recapGateFw = e.winTally >= CFG.GAMES_IN_SEASON ? 1 : 0;
    showNewspaper(true);
  }
  window.scrollTo(0, scrollY);
}

/* ---------- Kaman Mode results (a maxed-out meme page) ---------- */
function kamanFlavor() {
  var lines = [
    "Kaman. Kaman Kaman. KAMAN! Kaman? Kaman Kaman Kaman\u2026 Kaman.",
    "KAMAN kaman Kaman KAMAN. Kaman Kaman? KAMAN!!! kaman \uD83E\uDDB4 Kaman.",
    "Kaman Kaman Kaman Kaman Kaman. Kaman. (Kaman.) KAMAN Kaman Kaman.",
    "kaman\u2026 Kaman?? KAMAN!! Kaman Kaman Kaman Kaman Kaman Kaman Kaman.",
    "Kaman Kaman. Kaman Kaman Kaman. Kaman Kaman Kaman Kaman. K\u00A0A\u00A0M\u00A0A\u00A0N.",
    "KAMAN. Kaman kaman KAMAN Kaman? Kaman!! Kaman Kaman \uD83E\uDDB4\uD83E\uDDB4\uD83E\uDDB4 Kaman.",
    "Kaman (Kaman) Kaman \u2014 Kaman Kaman KAMAN Kaman Kaman? KAMAN. kaman."
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}
function kamanBar(label) {
  return '<div class="tw-row">' +
    '<div class="tw-top"><span class="tw-end">' + label + "</span>" +
      '<span class="tw-tier tier-elite">CAVEMAN</span></div>' +
    '<div class="tw-track"><div class="tw-fill tw-off" style="width:100%"></div></div>' +
    "</div>";
}
function kamanShareText() {
  var rows = G.picks.map(function (p) {
    return "C '" + String(p.row[IDX.season]).slice(-2) + " " + shareSurname(p.row[IDX.name]);
  });
  return "\uD83C\uDFC0 TRUE 82 (Kaman Mode)\n\uD83C\uDFC6 82\u20130 |  Net +\u221E\n\n" + rows.join("\n") + "\n\ntrue82.net";
}
function renderKamanResults() {
  renderPips();
  document.body.classList.remove("drafting");
  document.body.classList.remove("gating");
  var picksHtml = G.picks.map(function (p) {
    var row = p.row, name = row[IDX.name];
    return '<div class="pick-card">' +
      '<div class="pick-top"><span class="pr-name"><span class="slot-badge">C</span>' + esc(name) + "</span>" +
      '<span class="pr-v"><small>V</small>\u221E</span></div>' +
      '<div class="pr-sub"><span>' + shortSeason(row[IDX.season]) + " \u00B7 Caveman Era</span>" + chipsFor(row) + "</div>" +
      '<div class="pr-sub pr-stats">' + statLine(row) + "</div></div>";
  }).join("");

  var ledger = '<div class="ledger">' +
    '<div class="ledger-row"><span>Kaman<span class="why">Kaman? Kaman kaman\u2026 KAMAN!</span></span><span class="ledger-amt">\u221E</span></div>' +
    '<div class="ledger-row"><span>kaman kaman<span class="why">kaman kaman KAMAN kaman? Kaman!</span></span><span class="ledger-amt zero">\u2713 kaman</span></div>' +
    '<div class="ledger-row"><span>KAMAN!<span class="why">KAMAN!! Kaman Kaman Kaman KAMAN!</span></span><span class="ledger-amt good">+\u221E</span></div>' +
    '<div class="ledger-row"><span>kaman?<span class="why">kaman\u2026 kaman? KAMAN?! KAMAN!!!</span></span><span class="ledger-amt good">+\u221E</span></div>' +
    '<div class="ledger-row total"><span>\u2192 KAMAN<span class="why">Kaman Kaman KAMAN. (kaman.) KAMAN!</span></span><span class="ledger-amt">+\u221E</span></div></div>';

  app().innerHTML =
    resultsTopBarHtml() +
    '<section class="board kaman-board" data-result-section="summary"><div class="goat-fw" id="goatFw" aria-hidden="true"></div>' +
      '<p class="eyebrow">Front office projection \u00B7 KAMAN MODE</p>' +
      '<div class="big">82\u20130</div><div class="big-label">net rating +\u221E</div>' +
      '<p class="kaman-flavor">' + kamanFlavor() + "</p>" +
      '<button class="btn btn-primary btn-block presti-spin elite-result" id="shareTeamBtn">SHARE YOUR TEAM</button></section>' +
    '<section class="section twoway-sec" data-result-section="two_way"><div class="twoway">' + kamanBar("Offense") + kamanBar("Defense") + "</div></section>" +
    '<section class="section" data-result-section="roster"><p class="eyebrow">Your five \u00B7 all centers, as nature intended</p>' + picksHtml + "</section>" +
    '<section class="section" data-result-section="scoring_card"><p class="eyebrow">Scoring Card</p>' + ledger + "</section>" +
    '<div class="actions" data-result-section="replay"><button class="btn btn-primary presti-spin" id="againBtn">Kaman</button></div>';

  trackResultSections();

  el("againBtn").addEventListener("click", function () {
    analyticsTrack("replay", Object.assign(analyticsRunSnapshot(), { surface: "results", action: "kaman_menu" }));
    renderIntro();
  });
  wireStartOver();
  wireDonate();
  el("shareTeamBtn").addEventListener("click", function () {
    var kt = { mode: "kaman", wins: CFG.GAMES_IN_SEASON, undefeated: 1, surface: "results", action: "kaman_result" };
    analyticsTrack("share_click", kt);
    shareOrCopy(kamanShareText(), null, kt);
  });
  setupGoatFireworks(true);
  window.scrollTo(0, 0);
}

/* ---------- boot ---------- */

function showError(msg) { app().innerHTML = '<div class="error-box">' + msg + "</div>"; }

var DATA_READY = false, PENDING_MODE = null, PENDING_FN = null;
var DUEL_ID = (function () {   // ?duel=<id> deep link (duel-ui.js routes it once data lands)
  try { return new URLSearchParams(location.search).get("duel"); } catch (e) { return null; }
})();
var LEAGUE_ID = (function () {   // ?league=<id> deep link — needs no site data, routes at boot
  try { return new URLSearchParams(location.search).get("league"); } catch (e) { return null; }
})();
var SHARE_REF = (function () {   // ?ref=<5-char id> attribution from a Tribune share page; consumed by the first game start
  try {
    var sp = new URLSearchParams(location.search);
    var r = (sp.get("ref") || "").slice(0, 5);
    if (!/^[A-Z0-9][A-Za-z0-9_-]{4}$/.test(r)) r = "";
    if (r && window.history && history.replaceState) {
      sp.delete("ref");
      var qs = sp.toString();
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
    }
    return r;
  } catch (e) { return ""; }
})();

/* ---------- THE DAILY (social) ----------
   One shared board per calendar day: same seed, same modifier, for everyone.
   All wiring here is guarded on window.T82DAILY (and T82CH for the modifier
   pool), so a page shipped without daily-core.js keeps the classic menu with
   the Pro button, untouched. daily-core.js owns the doctrine (seed, pool,
   grade, official-run law); app.js only wires screens. */
var DAILY_GATE_PENDING = null;    // set during intro wiring, fired at the end of renderIntro
var DAILY_LINK = (function () {   // ?d=YYYYMMDD&w=&n= beat-my-five landing; consumed by the first intro render
  try {
    if (!window.T82DAILY) return null;
    var p = T82DAILY.parseLink(location.search);
    if (p && window.history && history.replaceState) {
      var sp = new URLSearchParams(location.search);
      sp.delete("d"); sp.delete("w"); sp.delete("n");
      var qs = sp.toString();
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
    }
    return p;
  } catch (e) { return null; }
})();
// The five share lines ('YY Surname + flame), identical formatting to the
// shareText rows so a daily share never drifts from the house style. v2 law:
// slot badges are retired from shares; the year is the flex. Officials stored
// before v2 carry the old "G '16 Curry" lines — shareTextDaily strips the
// leading slot token at format time, so history shares in the new shape.
function dailyFiveLines() {
  return picksInSlotOrder().map(function (entry) {
    var p = entry.p, flame = "";
    if (entry.i === G.hotIdx) {                                  // COLD never sets G.hotIdx; WARM stays emoji-free
      if (G.hotLvl === 4) flame = " \uD83C\uDF0B";
      else if (G.hotLvl >= 2) flame = " \uD83D\uDD25";
    }
    return "'" + String(p.row[IDX.season]).slice(-2) + " " + shareSurname(p.row[IDX.name]) + flame;
  });
}
function dailyResFromG(e) {
  var hot = (typeof G.hotNewNet === "number");
  return { wins: hot ? G.hotWins : e.winTally, net: hot ? G.hotNewNet : e.net,
           five: dailyFiveLines(), chId: (G.social && G.social.chId) || null, hot: hot,
           cap: MODE === "cap" ? G.budget : null };   // "$X Cap Spc" in the paste, null hides the segment
}
/* ---------- THE DAILY gate ----------
   Between the tile and the draft: the law of the mode, today's variation in
   plain terms, the base-mode (i) explainer, and a ball-through-hoop start.
   The shot is a ceremony, not a skill check: every attempt drops (missing
   would be pure friction), the ball is a real focusable button, and the arc
   collapses to instant under prefers-reduced-motion. The read happens while
   site data loads in the background, so the gate costs zero wall-clock time
   on a cold visit. Practice reruns skip the gate; they have read it. */
function renderDailyGate(board, target, variantTag) {
  G = null;
  // Top of the daily funnel: the player tapped THE DAILY and is now looking at
  // the instructions gate. mode carries the base so daily can be split out of
  // the base-mode totals; variant marks the entry path.
  analyticsTrack("daily_gate_view", {
    mode: board.base, variant: variantTag || ("daily:" + board.num), daily_num: board.num,
    surface: "daily_gate", action: target ? "challenge" : "official",
    target_wins: target ? target.w : null, target_net: target ? target.n : null
  });
  if (window.T82DUI) T82DUI.stop();
  document.body.classList.remove("drafting");
  document.body.classList.add("gating");   // full-screen gate: masthead + footer hide (styles.css)
  renderPips();
  var baseName = board.base === "cap" ? "Presti" : board.base === "pro" ? "Pro" : "Classic";
  var tip = (window.T82DAILY && T82DAILY.MODE_TIP && T82DAILY.MODE_TIP[board.base]) || "";
  var dateStr = "";
  try { dateStr = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }).toUpperCase(); } catch (e) {}
  app().innerHTML =
    '<section class="gate">' +
      '<button class="gate-back" id="gateBack" aria-label="Back to menu">\u2190 back</button>' +
      '<p class="gate-eyebrow mono">\uD83D\uDCC5 THE DAILY #' + board.num + (dateStr ? ' \u00B7 ' + dateStr : '') + '</p>' +
      '<h2 class="gate-title">The Daily</h2>' +
      '<div class="gate-law">' +
        '<p>One attempt.</p>' +
        '<p>Everyone gets the same rolls.</p>' +
        '<p>Compare with friends to see who knows ball.</p>' +
      '</div>' +
      '<div class="gate-var plq-frame plq-slim">' +
        '<p class="gate-var-label mono">TODAY\u2019S VARIATION \u00B7 ' + baseName.toUpperCase() + ' MODE' +
          ' <button class="cap-info" id="gateInfo" aria-expanded="false" aria-label="How ' + baseName + ' Mode works">i</button></p>' +
        '<p class="gate-var-name">' + esc(board.name) + '</p>' +
        '<p class="gate-var-body">' + esc(board.gate || board.blurb || "") + '</p>' +
        '<div class="cap-tip" id="gateTip" hidden>' + esc(tip) + '</div>' +
        (target
          ? '<p class="gate-target mono">Their five went ' + target.w + '-' + (CFG.GAMES_IN_SEASON - target.w) +
            ' (Net ' + T82DAILY.signedNet(target.n) + '). Beat it.</p>'
          : '') +
      '</div>' +
      '<div class="gate-tipoff" id="gateTipoff">' +
        '<p class="gate-pull">DUNK THE BALL TO START ' +
          '<span class="gate-cue" aria-hidden="true"><i>\u2193</i><b class="gate-drag">DRAG</b></span></p>' +
        ballLeverHtml("gateLever", "gateArm", "Drag the basketball down through the hoop to start The Daily") +
        '<button class="gate-play-btn presti-spin" id="gatePlayBtn" type="button" aria-label="Start The Daily without using the dunk interaction">PLAY IT</button>' +
      '</div>' +
    '</section>';
  el("gateBack").addEventListener("click", function () {
    analyticsTrack("daily_gate_exit", { mode: board.base, variant: variantTag || ("daily:" + board.num), daily_num: board.num, action: "back" });
    renderIntro();
  });
  var gTip = el("gateTip");
  if (gTip) {
    // v34: the scout door lives INSIDE the existing info tip — zero new
    // rows, zero symmetry risk (owner constraint). Campaign "gate".
    var scout = document.createElement("p");
    scout.className = "gate-scout";
    scout.innerHTML = 'Scout the era on <a href="' + bbrefTag("https://www.basketball-reference.com/", "gate") + '" target="_blank" rel="noopener">Basketball Reference</a> \u2197';
    gTip.appendChild(scout);
  }
  var gInfo = el("gateInfo");
  if (gInfo) gInfo.addEventListener("click", function () {
    var t = el("gateTip");
    if (!t) return;
    var hidden = t.hasAttribute("hidden");
    if (hidden) { t.removeAttribute("hidden"); gInfo.setAttribute("aria-expanded", "true"); }
    else { t.setAttribute("hidden", ""); gInfo.setAttribute("aria-expanded", "false"); }
    analyticsTrack("daily_gate_action", {
      mode: board.base, variant: variantTag || ("daily:" + board.num), daily_num: board.num,
      action: hidden ? "info_open" : "info_close"
    });
  });
  // The real Hot Hand mechanic, wired to launch: pull the ball down through
  // the net, it ignites, the flames burn for a beat (and keep burning as the
  // loading state if site data is still on the way), then the draft begins.
  function launchFromGate(delay, btn, method) {
    if (btn) btn.disabled = true;
    analyticsTrack("daily_gate_start", {
      mode: board.base, variant: variantTag || ("daily:" + board.num), daily_num: board.num,
      action: method || "unknown", target_wins: target ? target.w : null, target_net: target ? target.n : null
    });
    setTimeout(function () {
      queue(function () { startDailyRun(board, target, variantTag); }, btn || null);
    }, delay || 0);
  }
  var gLever = el("gateLever"), gArm = el("gateArm");
  wireBallPull(gLever, gArm, function () { launchFromGate(700, null, "dunk"); });
  var gPlay = el("gatePlayBtn");
  if (gPlay) gPlay.addEventListener("click", function () { launchFromGate(0, gPlay, "play_button"); });
  // Same contract as renderIntro's queue: DATA_READY/PENDING_FN are
  // module-level, so the gate can hold the launch until the data lands.
  function queue(fn, btn) {
    if (DATA_READY) { fn(); return; }
    PENDING_FN = fn;
    if (btn) { btn.disabled = true; }
  }
}
function startDailyRun(board, target, variantTag) {
  var explicitPractice = /^daily-practice:/.test(variantTag || "");
  var alreadyOfficial = false;
  try { alreadyOfficial = !!(window.T82DAILY && T82DAILY.officialFor(board.key)); } catch (e) {}
  var isPractice = explicitPractice || alreadyOfficial;
  newGame(board.base, board.seed, board.ch, {
    variant: variantTag,
    surface: /^daily-link:/.test(variantTag || "") ? "daily_referral" : explicitPractice ? "daily_practice" : "daily_gate",
    practice: isPractice ? 1 : 0,
    official: isPractice ? 0 : 1,
    social: { key: board.key, num: board.num, name: board.name,
              short: board.short || board.blurb || "", gate: board.gate || board.blurb || "",
              base: board.base, chId: board.ch ? board.ch.id : null,
              shareEmoji: (board.ch && board.ch.shareEmoji) || null, target: target || null }
  });
}

// Crests are decorative — load them separately and in the background so they never
// block the game. If this fetch fails or is slow, the game plays fine with no crests.
var CRESTS_REQUESTED = false;
function loadCrests() {
  if (CRESTS_REQUESTED) return;
  CRESTS_REQUESTED = true;
  var started = Date.now();
  var httpFailed = false;
  fetch("crests.json")
    .then(function (res) {
      if (!res.ok) {
        httpFailed = true;
        analyticsTrack("data_error", { action: "crests", source: "crests.json", outcome: "http", http_status: res.status, load_ms: Date.now() - started });
        return null;
      }
      return res.json();
    })
    .then(function (c) {
      if (c && typeof c === "object") {
        Object.keys(c).forEach(function (k) { CRESTS[k] = c[k]; });
        CREST_POOL = null;   // rebuild the decoy pool now that real crests exist
        refreshTicketArt();  // ticket already on screen? paint the logo in now
        analyticsTrack("data_ready", { action: "crests", source: "crests.json", outcome: "success", load_ms: Date.now() - started });
      } else if (!httpFailed) {
        analyticsTrack("data_error", { action: "crests", source: "crests.json", outcome: "invalid", load_ms: Date.now() - started });
      }
    })
    .catch(function (err) {
      analyticsTrack("data_error", {
        action: "crests", source: "crests.json", outcome: "network",
        error_code: String(err && err.name || "fetch_error"), detail: String(err && err.message || err || "").slice(0, 180),
        load_ms: Date.now() - started
      });
    });
}
function scheduleCrests() {
  var start = function () { loadCrests(); };
  // The crest file is decorative and roughly the same transfer size as the
  // critical player dataset. Never let it compete for the initial connection.
  if (typeof requestIdleCallback === "function") requestIdleCallback(start, { timeout: 2500 });
  else setTimeout(start, 0);
}

// FOOTER VERSION LAW (v31, perpetual): BUILD_V is the deploy fingerprint.
// It renders at the end of the footer stat line — and ALONE when stats are
// absent or zero — so "which build is live" is answered by loading the page
// and reading the footer, especially on a degraded deploy. Bump BUILD_V in
// the SAME COMMIT as any client cache-key bump in index.html; the walk
// enforces key/BUILD_V parity and fails the lane on drift.
var BUILD_V = "v49";
function footSeg(txt) { return '<span class="foot-seg">' + txt + "</span>"; }
// Footer stat line — finished drafts per mode + Presti winrate (82-0 with OR without
// the Hot Hand), read from D1 via /api/stats: the same store /avocado reads, so the
// footer can't disagree with the dashboard. Fails soft: on any error the footer
// falls back to the version fingerprint alone — never a fake "0 drafts" row, and
// never a blank slot where the deploy check should be.
function setFootStats(d) {
  var el = document.getElementById("footStats");
  if (!el) return;
  if (!d || typeof d.presti !== "number" ||
      !((d.presti || 0) + (d.classic || 0) + (d.pro || 0))) {
    el.innerHTML = footSeg(BUILD_V);
    return;
  }
  var rate = d.presti ? Math.round(1000 * (d.presti82 || 0) / d.presti) / 10 : 0;
  el.innerHTML = [
    footSeg(d.presti.toLocaleString() + " Presti drafts"),
    footSeg((d.classic || 0).toLocaleString() + " Classic drafts"),
    footSeg((d.pro || 0).toLocaleString() + " Pro drafts"),
    footSeg("Presti WR " + rate + "%"),
    footSeg(BUILD_V)
  ].join(" | ");
}
function fetchFootStats() {
  var fe = document.getElementById("footStats");
  if (fe && !fe.innerHTML) fe.innerHTML = footSeg(BUILD_V);   // visible before (or without) the stats reply
  try {
    fetch("/api/stats")
      .then(function (r) { return r.json(); })
      .then(setFootStats)
      .catch(function () {});
  } catch (e) {}
}
// The KV all-time counter is no longer displayed but keeps accruing so the historic
// number stays continuous (see CONTEXT.md: games.js kept, not consolidated into D1).
function pingGames(method) {
  try {
    fetch("/api/games", { method: method }).catch(function () {});
  } catch (e) {}
}
// SHARE v2 line 3 (v33: net-ranked). One fetch per finished run, 1.6s after
// the game_complete beacon so our own row has landed. RANKS BY RAW ENGINE
// NET — the Hot Hand never touches the ranking on either side: we send
// e.net, and D1's population is e.net by construction. Daily runs send the
// base mode too so a thin board can fall back to the all-dailies pool
// server-side (see percentile.js). Official dailies amend the record with
// pct (nonce-matched) so the menu tile's share carries line 3 later.
// Fail-soft everywhere: no reply or thin sample just means no line 3.
function scheduleSharePct(e) {
  if (MODE === "kaman") return;
  if (dyRun()) return;   // v48: a shrinking-pool run against the open classic pool is the wrong yardstick, and alpha runs stay out of that pool
  if (G && G.sharePctScheduled) return;   // v49.4: the reel finale schedules this early; finishRunTail's call is the belt for analytic paths
  if (G) G.sharePctScheduled = 1;
  var net = Math.round(e.net * 100) / 100;        // raw engine net: never the Hot Hand numbers
  var g = G;                                      // the run this fetch belongs to
  var qs = g.social
    ? "variant=daily:" + g.social.num + "&mode=" + (g.social.base || MODE)
    : "mode=" + MODE;
  setTimeout(function () {
    fetch("/api/percentile?net=" + net + "&" + qs)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || typeof d.pct !== "number") {
          analyticsTrack("percentile_error", Object.assign(analyticsRunSnapshot(), { action: "empty_response" }));
          return;
        }
        g.sharePct = d.pct;
        if (g === G) {
          var rc = document.querySelector(".res-comp");
          if (rc && !rc.querySelector(".comp-pct")) {
            rc.insertAdjacentHTML("beforeend", ' <span class="comp-pct">\u2022 Top ' + d.pct + "%</span>");
          }
        }
        analyticsTrack("percentile_result", Object.assign(analyticsRunSnapshot(), {
          value: d.pct, ordinal: d.n == null ? null : d.n,
          source: d.pool || (g.social ? "daily" : "mode")
        }));
        if (g.social && g.social.nonce && window.T82DAILY) {
          var off = T82DAILY.officialFor(g.social.key);
          if (off && off.nonce === g.social.nonce) {
            T82DAILY.recordOfficial(g.social.key, g.social.num,
              { wins: off.wins, net: off.net, five: off.five, chId: off.chId,
                hot: off.hot, cap: off.cap, pct: d.pct }, g.social.nonce);
          }
        }
      })
      .catch(function (err) {
        analyticsTrack("percentile_error", Object.assign(analyticsRunSnapshot(), {
          action: "fetch", error_code: String(err && err.name || "fetch_error")
        }));
      });
  }, 1600);
}
// One game just finished: bump the KV counter, then refresh the footer once the
// game_complete insert has had a moment to land in D1. Best effort — a miss here
// self-heals on the next page load.
function gameFinishedPings() {
  pingGames("POST");
  try { if (window.T82ACC) T82ACC.submitRun(); } catch (e) {}   // core-truth replay submit (accounts.js); kaman self-skips
  setTimeout(fetchFootStats, 1500);
}

function boot() {
  if (SHARE_REF) analyticsTrack("referral_open", {
    surface: "landing", action: "tribune_share", outcome: "open", source: SHARE_REF
  });
  bindGlobalButtonStyle();
  bindHaptics();
  bindVisibilityResync();
  wireDraftWheel();
  ensureTraitsCss();      // v47.9: chips render on every surface; duel/league entry paths skip the homepage module that used to inject this
  wireTraitChipTaps();
  if (DUEL_ID) { app().innerHTML = '<section class="ticket duel"><p class="duel-wait">Setting the table\u2026</p></section>'; }
  else if (LEAGUE_ID) {
    var lgi = LEAGUE_ID; LEAGUE_ID = null;
    app().innerHTML = '<section class="ticket league"><p class="duel-wait">Opening the league office\u2026</p></section>';
    ensureLeagueUI().then(function (ok) { if (ok) T82LGUI.route(lgi); else showError("Couldn\u2019t load the league screen. Reload and try again."); });
  }
  else if (DY_QA.reset) { dyWipe(); renderDynastyGate(); }   // v48 QA: ?dynasty=reset wipes and lands on a fresh gate
  else if (DY_QA.open) renderDynastyGate();                  // v48 QA: ?dynasty=1 deep-opens the gate
  else if (SD_QA.open) {                                     // v49 QA: ?redraft=1 deep-opens; ?redraft=2018 opens ON that class
    if (SD_QA.cls && SD_CLASSES[SD_QA.cls]) SD_CLASS_ID = SD_QA.cls;
    renderShowdownGate();
  }
  else renderIntro();   // the intro needs no player data — show it instantly instead of a loading screen
  fetchFootStats();  // footer stat line — tiny request, independent of the big payload
  var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
  var dataHttpStatus = 0;
  fetch(CFG.DATA_URL)
    .then(function (res) { dataHttpStatus = res.status; if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
    .then(function (data) {
      initData(data);
      DATA_READY = true;
      var ms = Math.round(((window.performance && performance.now) ? performance.now() : Date.now()) - t0);
      analyticsTrack("data_ready", {
        action: "site_data", source: CFG.DATA_URL, outcome: "success", load_ms: ms,
        http_status: dataHttpStatus || 200,
        amount: Array.isArray(data && data.players) ? data.players.length : null
      });
      scheduleCrests();   // decorative payload waits until the critical dataset is ready, then uses idle time
      if (DUEL_ID) {
        var di = DUEL_ID; DUEL_ID = null;
        ensureDuelUI().then(function (ok) { if (ok) T82DUI.route(di); else showError("Couldn\u2019t load the duel screen. Reload and try again."); });
      }
      else if (PENDING_FN) { var pf = PENDING_FN; PENDING_FN = null; pf(); }               // queued daily/weekly launch
      else if (PENDING_MODE) { var pm = PENDING_MODE; PENDING_MODE = null; newGame(pm); }   // player tapped a mode while data was still loading
    })
    .catch(function (err) {
      var ms = Math.round(((window.performance && performance.now) ? performance.now() : Date.now()) - t0);
      analyticsTrack("data_error", {
        action: "site_data", source: CFG.DATA_URL, outcome: dataHttpStatus ? "http_or_parse" : "network",
        http_status: dataHttpStatus || null, load_ms: ms,
        error_code: String(err && err.name || "load_error"), detail: String(err && err.message || err || "").slice(0, 180)
      });
      showError("Couldn\u2019t load " + esc(CFG.DATA_URL) + " (" + esc(err.message) + "). Serve this folder over HTTP \u2014 e.g. <span class=\"mono\">python3 -m http.server</span> \u2014 rather than opening index.html as a file.");
    });
}

if (typeof document !== "undefined" && document.getElementById) { boot(); }
