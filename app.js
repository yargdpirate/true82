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
    trackRunState();
    if (G.picks.length >= CFG.ROUNDS && G.screen === "draft") { draftFinale(); return; }
    G.inked = G.picks.length;   // v59.1: renderDraft prints this pick's diamond and coin
    nextRound(true); return;
  }
  analyticsTrack("pick_denied", Object.assign(analyticsRunSnapshot(), {
    action: "rule_block", player: row[IDX.name], season: season, slot: bucket
  }));
  denyTray(chBlockWhy());
}
// v59.1 THE PICK PRINTS (the owner: the home diamonds' energy in the draft). The round's diamond prints in
// the bar and the player's coin prints in the tray, the same ink print as a home-card vote.
function draftInk() {
  var n = G && G.inked;
  if (!n) return;
  G.inked = 0;
  var pips = el("drPips");
  if (pips && pips.children[n - 1]) inkPrint(pips, pips.children[n - 1], "");
  var rail = document.querySelector("#trayInner .lineup-rail");
  var coin = rail && rail.querySelector('.lineup-slot[data-pick="' + (n - 1) + '"] .ls-token');
  if (coin) inkPrint(rail, coin, "token");
}
// The fifth pick sets the lineup: the fifth coin prints, all five re-ink left to right, the bar's five
// diamonds ring as a row, and the season plays under a second later. EXIT RUN in that beat wins (the
// timer checks it is still this game on the draft screen).
function draftFinale() {
  var g = G, n = G.picks.length;
  G.selected = null;
  updateTray();
  var rail = document.querySelector("#trayInner .lineup-rail");
  var coin = rail && rail.querySelector('.lineup-slot[data-pick="' + (n - 1) + '"] .ls-token');
  if (coin) inkPrint(rail, coin, "token");
  if (rail) setTimeout(function () { if (rail.isConnected) rail.classList.add("is-full"); }, 260);
  var pips = el("drPips"), count = el("drPickCount");
  if (pips) {
    for (var k = 0; k < pips.children.length; k++) pips.children[k].className = "done";
    pips.classList.add("is-full");
    inkPrint(pips, pips.children[pips.children.length - 1], "big");
  }
  if (count) count.textContent = "LINEUP SET";
  buzz([10, 60, 14]);
  document.body.classList.add("ink-finale");
  setTimeout(function () {
    document.body.classList.remove("ink-finale");
    if (G === g && G.screen === "draft") nextRound(true);
  }, 950);
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
// chips own their full skin in styles.css (the shared chip).
// v47.21: .tm-flat is the general opt-out marker (the widget's IDK pass wears
// it). .hh-skip joins it as a BUG FIX, not a restyle: button.presti-spin is
// (0,1,1) and .hh-skip is (0,1,0), so the decorator was overriding the skip
// control's position:absolute, background:none and color - which is why it
// rendered as a stray amber slab floating mid-overlay on the left instead of
// the quiet top-right text link it was written as.
// v50: the tag ballot's keycaps, sheet buttons and tiles print their own ink.
// v51: .gate-back joins as a BUG FIX, the same story as .hh-skip: the Daily
// gate's bare "back" text button was painted as a gold keycap over the eyebrow;
// .hh-charity too: I DON'T WANT YOUR CHARITY is the outline ghost it was written
// as, not a full-width gold keycap louder than the ball lever.
var BTN3D_EXCLUDE = "button:not(.startover-btn):not(.np-bundle):not(.sort-chip):not(.cap-info):not(.du-exit):not(.rs-close):not(.tchip):not(.trait-info-btn):not(.tm-sharebar):not(.tm-flat):not(.hh-skip)" +
  ":not(.bt-tag):not(.bt-big):not(.bt-tog):not(.bt-change):not(.bt-done):not(.gate-back):not(.hh-charity)" +
  ":not(.t-chip):not(.rd-diff):not(.da-row):not(.rd-feat)";   // v55: a chip is never a keycap; the Redrafted's difficulty cards, its featured rows (v58) and the Daily archive's rows are cards
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
    var pool = el("pool") || el("rdPool");   // v55: the Redrafted's board too
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

// FIRE SALE (7.5% per paid spin): the refund flash's twin. All three cost
// buttons light in fire gold (the hot role: a gain, never the bad red, v51) and
// read "FIRE SALE", with a ⬇️ burst. The -$2 board discount
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
    if (!T82.poolYearsEligible(G, name).length) return;   // hide players with no eligible (>785-min) season this team/era — don't shade, omit
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
/* ---------- v51 SECTION HEADERS ----------
   Every module header is one component: <h2 class="t-head" data-head="...">
   (styles.css, docs/STYLE-GUIDE.md). HEADS picks each context's variant in one
   place, so every header of a kind restyles with one edit here. Variants:
   eyebrow, rule, bar, title, banner, tab. ?heads=<variant> swaps them all at
   once for a quick look. A new mode adds its own context line. */
var HEADS = {
  home: "eyebrow",      // the homepage's explainer sections
  poll: "eyebrow",      // the homepage vote card's lead
  rules: "eyebrow",     // HOW TO PLAY's sections
  reel: "eyebrow",      // THE SEASON, GAME BY GAME
  results: "eyebrow",   // YOUR FIVE, TWO-WAY PROFILE, GOAT CLIMB, SCORING CARD
  sheet: "title",       // a bottom sheet's title
  group: "eyebrow",     // a group label inside a sheet or a list
  redraft: "eyebrow",   // THE REDRAFTED's gate, difficulty and podium (v55)
  daily: "eyebrow"      // THE DAILY's archive (v56)
};
var HEADS_FORCE = (function () {
  var m = typeof location !== "undefined" && /[?&]heads=(eyebrow|rule|bar|title|banner|tab)(&|$)/.exec(location.search || "");
  return m ? m[1] : null;
})();
// head(context, text, { tag, cls, id, aside (html), html (text is html) })
function head(ctx, text, o) {
  o = o || {};
  var tag = o.tag || "h2", v = HEADS_FORCE || HEADS[ctx] || "eyebrow";
  return "<" + tag + ' class="t-head' + (o.cls ? " " + o.cls : "") + '" data-head="' + v + '"' + (o.id ? ' id="' + o.id + '"' : "") + ">" +
    (o.html ? text : esc(text)) + (o.aside ? '<span class="t-aside">' + o.aside + "</span>" : "") + "</" + tag + ">";
}
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
  return '<button type="button" class="tchip t-chip eng" data-size="sm" data-full="' + full + '" data-abbr="' + abbr + '"' +
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
/* v63 ONE BALL and SIZE BY UNIT (the owner, 2026-09-28; sim-core oneBall, sizeUnits). The boards show what the two rules
   read: usage in Classic's stat line (the tray adds it up on the ball meter, trayBallHtml) and the listed height by the
   position, which turns red when that pick would be the second small man in his unit (like a second TITLE #1). Pro
   shows none of it, from memory (the owner's rule for its tags); the rules still count. v62's "20+" chip went with the
   20-point rule (the owner: an 82-0 five is four apex scorers, so the rule has to price bad fit, not greatness). */
function htText(inches) {
  if (!(inches > 0)) return "";
  var ft = Math.floor(inches / 12), inch = Math.round((inches - ft * 12) * 10) / 10;
  if (inch >= 12) { ft++; inch -= 12; }
  return ft + "'" + (inch % 1 ? inch.toFixed(1) : String(inch)) + '"';
}
// sd: the Do-Over's board, which always shows the heights and scores with the default rules (its verdict plays fresh
// Classic states), whatever mode or board ran last
function ballRule(rows, sd) { return typeof T82 !== "undefined" && T82.oneBall ? T82.oneBall(sd ? null : G, rows || []) : null; }
function sizeRule(rows, slots, sd) { return typeof T82 !== "undefined" && T82.sizeUnits ? T82.sizeUnits(sd ? null : G, rows || [], slots || []) : null; }
// Would drafting this row cost a size tax? Only when every open slot he can legally take makes him the second small guard
// or the second small big; one slot that costs nothing and there is no warning. Returns { amt, g } or null.
function sizeWarn(row) {
  if (!G || G.screen !== "draft" || !G.picks || !G.picks.length || !row || !(row[IDX.ht] > 0)) return null;
  var rows = G.picks.map(function (p) { return p.row; }), slots = G.picks.map(function (p) { return p.slot; });
  var now = sizeRule(rows, slots);
  if (!now) return null;
  var opts = rowOpenBuckets(row).filter(function (b) { return bucketLegal(row, b); }), worst = null;
  for (var i = 0; i < opts.length; i++) {
    var after = sizeRule(rows.concat([row]), slots.concat([opts[i]])), add = after.tax - now.tax;
    if (!(add > 0)) return null;
    if (!worst || add < worst.amt) worst = { amt: add, g: after.gTax > now.gTax };
  }
  return worst;
}
function heightTag(row, sd) {
  if ((!sd && (MODE === "pro" || MODE === "kaman")) || !row || !(row[IDX.ht] > 0)) return "";
  var w = sd ? null : sizeWarn(row);
  if (!w) return " \u00B7 " + htText(row[IDX.ht]);
  var why = (w.g ? "a second small guard costs " : "a second small big costs ") + fmt1(w.amt).replace(/\.0$/, "");
  return ' \u00B7 <span class="pr-ht is-small" title="' + why + '">' + htText(row[IDX.ht]) + '<span class="sr-only">, ' + why + "</span></span>";
}

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
function mHtml(txt) {
  // Display layer only: a lighter trailing M. Money reads one way everywhere,
  // "$16M" like the bank (v51: the thin space after the $ is gone; in the
  // display face it read as "$ 16M" beside the bank's "$50M"). Underlying
  // strings (share text, copy, reels' textContent) stay "$17M".
  return String(txt).replace(/M$/, '<span class="m-lite">M</span>');
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
  // v51: the shared small keycap, so it matches FEATURE REQUESTS beside it (was a flat square)
  return '<button class="startover-btn t-btn" data-size="sm" id="startOverBtn" type="button">\u2039 Start over</button>';
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
    '<path d="M16 1l1.9 3.9 4.3.6-3.1 3 .7 4.2L16 10.7l-3.8 2 .7-4.2-3.1-3 4.3-.6z" style="fill:var(--t-accent)"/>' +
    '<rect x="5" y="15" width="22" height="3.4" rx="1.7" style="fill:var(--t-metal)"/>' +
    '<path d="M9 18.4l4.4 13M23 18.4l-4.4 13M16 18.4v13M10.9 24h10.2M12.8 29.6h6.4" style="stroke:var(--t-metal)" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
  '</svg>';
}
function bookIconSvg() {
  // A drawn open book: ink cover, pale pages, faint text lines. It always sits
  // on the gold keycap, so it prints in the keycap's own ink and highlight.
  return '<svg class="mp-book" viewBox="0 0 26 22" aria-hidden="true" focusable="false">' +
    '<path d="M13 3.4C11.2 1.8 8.5 1 5.4 1c-1.2 0-2.3.1-3.4.4-.6.1-1 .6-1 1.2v14.6c0 .8.8 1.4 1.6 1.2 1-.2 1.9-.3 2.8-.3 2.9 0 5.4.8 7.6 2.3 2.2-1.5 4.7-2.3 7.6-2.3.9 0 1.8.1 2.8.3.8.2 1.6-.4 1.6-1.2V2.6c0-.6-.4-1.1-1-1.2C22.9 1.1 21.8 1 20.6 1c-3.1 0-5.8.8-7.6 2.4z" style="fill:var(--t-accent-ink)"/>' +
    '<path d="M12.1 4.6C10.6 3.5 8.4 2.9 5.9 2.9c-.9 0-1.8.1-2.7.3v13.1c.9-.2 1.8-.2 2.7-.2 2.3 0 4.4.5 6.2 1.5z" style="fill:var(--t-accent-hi)"/>' +
    '<path d="M13.9 4.6c1.5-1.1 3.7-1.7 6.2-1.7.9 0 1.8.1 2.7.3v13.1c-.9-.2-1.8-.2-2.7-.2-2.3 0-4.4.5-6.2 1.5z" style="fill:var(--t-accent-hi)"/>' +
    '<path d="M5.2 6.4c1.7-.2 3.3 0 4.8.6M5.2 9.2c1.7-.2 3.3 0 4.8.6M5.2 12c1.7-.2 3.3 0 4.8.6M16 7c1.5-.6 3.1-.8 4.8-.6M16 9.8c1.5-.6 3.1-.8 4.8-.6M16 12.6c1.5-.6 3.1-.8 4.8-.6" style="stroke:var(--t-accent-ink)" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".55"/>' +
  '</svg>';
}
function draftUtilityHtml() {
  return '<div class="draft-utility" id="draftUtility">' +
    '<button class="du-exit" id="startOverBtn" type="button">\u2039 EXIT RUN</button>' +
    '<div class="du-mid">' +
      '<div class="round-pips du-pips ink-dias" id="drPips" aria-hidden="true"></div>' +
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
      (claimed || G.social.archive ? '<span class="ds-pill ds-prac">PRACTICE RUN</span>'   // v58.4: an archive replay never claims the day
               : '<span class="ds-pill ds-off">1 OFFICIAL ATTEMPT</span>');
    sub.push(baseName + " RULES");
    if (G.social.short) sub.push(esc(G.social.short));
    if (G.social.target) {
      targetHtml = '<div class="mp-target mono">BEAT ' + G.social.target.w + '-' +
        (CFG.GAMES_IN_SEASON - G.social.target.w) + ' \u00B7 NET ' + T82DAILY.signedNet(G.social.target.n) + '</div>';
    }
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
    "Occasional random perks when rerolling era/team/player: REFUND (green) gives your dollar back. FIRE SALE (fire gold) drops the next roll's player salaries by $2M."
  ],
  daily: [
    // the first line names prices only on a Presti board (rulesSheetHtml swaps in RULES_DAILY_CAP)
    "One shared board per day. Everyone gets the same teams and the same players.",
    "Your first finished run is your official score. Replays are practice and can never overwrite it.",
    "Today's rule appears above, and it beats the normal numbers wherever they disagree.",
    "Finish, then share: your link drops friends onto this exact board to beat your number."
  ],
  pro: [
    "No stats. Every card is a name, a position, and a randomized season.",
    "The season menu (\u25BE) still works, also blind. Change years at your own risk.",
    "The engine grades your five with the real numbers at the end. Memory against the receipts."
  ]
};
var RULES_DAILY_CAP = "One shared board per day. Everyone gets the same teams, the same players, the same prices.";
var RULES_ENGINE = [
  ["TALENT", "Every player adds his impact rating (BPM) over a replacement-level scrub. Star power is most of your score."],
  ["SHOOTING", "Three floor spacers is the target. Zero shooters costs about 6 net rating. Elite gunners count as one and a half."],
  ["ONE BALL", "Add up your five's usage (the share of plays each one finishes). A title team uses about 105, and 120 is free. Every point past 120 costs 0.3 net: four stars and a glue guy pay a little, five ball-dominant alphas pay a lot."],
  ["REPUTATIONS", "Two TITLE #1 stars cost 2 (the Dueling Banjos Tax), and so do two players who hold the ball or two defenders teams hunt. Two foul merchants cost 1, and every stat padder costs 1. Only settled tags count."],
  ["DEFENSE", "If both guards, or both forwards, are minus defenders, the pair costs 2 to 3 net. And someone up front, a forward or your center, has to protect the rim, or that is 2 more."],
  ["THE DIRTY WORK", "Your five still have to rebound and somebody has to pass. A bottom-of-the-league board rate costs 2 to 3, no real playmaker costs 2, and more than one player past his 12th season costs 1."],
  ["SIZE", "One small man can hide; two in the same unit get found. Two guards 6'2\" or shorter cost 2, and so do two frontcourt players 6'6\" or shorter."],
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
/* ---------- HOW TO PLAY: the demo (v53) ----------
   Owner: HOW TO PLAY must be dead simple, "a css clicky finger that can do a
   short video demo". A 16s loop in pure CSS (styles.css, "HOW TO PLAY demo")
   on a mini draft screen: a ticket deals a team and a decade, the white glove
   taps a player and then DRAFT, the five slots fill, the season plays, GO 82-0.
   Each step's caption lights as it plays. The demo is aria-hidden; the same
   steps read as text in the sheet. It mirrors the real draft flow (tap a row,
   then DRAFT YOUR PLAYER), so change it with that flow. */
var HOWTO_STEPS = ["A random team and decade", "Tap a player from it", "Draft him into a slot",
  "2 guards, 2 forwards, a center", "Real stats play all 82 games", "Go 82\u20130"];
function howToDemoHtml() {
  var caps = "", dots = "", slots = "", coins = "", i;
  HOWTO_STEPS.forEach(function (t, k) {
    caps += '<p class="htp-cap c' + (k + 1) + '"><b>' + (k + 1) + "</b>" + esc(t) + "</p>";
    dots += '<i class="d' + (k + 1) + '"></i>';
  });
  ["G", "G", "F", "F", "C"].forEach(function (p, k) {
    slots += '<span class="htp-slot s' + (k + 1) + '"><em>' + p + "</em><b>" + ["MJ", "SC", "LJ", "KD", "SO"][k] + "</b></span>";
  });
  for (i = 0; i < 82; i++) coins += '<i' + ([9, 22, 31, 44, 50, 61, 70, 77].indexOf(i) >= 0 ? ' class="l"' : "") + "></i>";   // 74-8
  return '<div class="htp" aria-hidden="true"><div class="htp-screen">' +
      // one round each: '90s Bulls (MJ), '10s Warriors (SC), '10s Cavs (LJ), '20s Suns (KD), '00s Lakers (SO)
      '<div class="htp-ticket"><span class="htp-reel htp-dec">' + ["80s", "70s", "90s", "10s", "10s", "20s", "00s"].map(function (d) { return "<span>\u2019" + d + "</span>"; }).join("") + "</span>" +
        '<span class="htp-reel">' + ["SPURS", "KNICKS", "BULLS", "WARRIORS", "CAVS", "SUNS", "LAKERS"].map(function (t) { return "<span>" + t + "</span>"; }).join("") + "</span></div>" +
      '<div class="htp-rows">' +
        '<div class="htp-row r1"><b>Michael Jordan</b><i>G</i></div>' +
        '<div class="htp-row r2"><b>Scottie Pippen</b><i>F</i></div>' +
        '<div class="htp-row r3"><b>Dennis Rodman</b><i>F</i></div>' +
      "</div>" +
      '<div class="htp-draft">Draft your player</div>' +
      '<div class="htp-season"><div class="htp-coins">' + coins + '</div><div class="htp-rec">74\u20138</div></div>' +
      '<div class="htp-goal">Go 82\u20130</div>' +
      '<div class="htp-slots">' + slots + "</div>" +
      '<svg class="htp-hand" viewBox="0 0 48 48">' + GLOVE_PATH + "</svg>" +
    '</div><div class="htp-caps">' + caps + '</div><div class="htp-dots">' + dots + "</div></div>";
}
// The steps as text: what the demo shows, for readers and screen readers.
function howToStepsHtml() {
  return '<ol class="htp-steps">' + HOWTO_STEPS.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ol>";
}
function rulesSheetHtml(opts) {
  opts = opts || {};
  if (opts.home) return rulesHomeHtml();
  var isDaily = !!(G && G.social);
  var ch = G && G.ch;
  var baseKey = MODE === "cap" ? "cap" : MODE === "pro" ? "pro" : "classic";
  var baseName = MODE === "cap" ? "PRESTI" : MODE === "pro" ? "PRO" : "CLASSIC";
  var copy = (window.T82DAILY && T82DAILY.DAILY_COPY) || {};
  var h = '<div class="rs-head">' + head("sheet", "How to play", { cls: "rs-title" }) +
    '<button class="rs-close" id="rulesClose" type="button" aria-label="Close the rules">\u2715</button></div>' +
    '<div class="rs-scroll">';

  // Block builders; assembly order depends on the mode. On the Daily the
  // daily-specific material (today's rule, then the Daily's own rules) leads
  // and GAME BASICS follows: a Daily player opening the sheet wants today,
  // not the tutorial (owner directive, v45).
  var basicsBlock = howToDemoHtml() + head("rules", "Game basics", { tag: "h3", cls: "rs-eyebrow" }) + '<ul class="rs-list">' +
    RULES_BASICS.map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul>";
  var modeCopy = (RULES_MODE[isDaily ? "daily" : baseKey] || []).slice();
  if (isDaily && baseKey === "cap") modeCopy[0] = RULES_DAILY_CAP;   // only a Presti board has prices to share
  var modeBlock = head("rules", "How to play this mode (" + (isDaily ? "THE DAILY" : baseName) + ")", { tag: "h3", cls: "rs-eyebrow" }) + '<ul class="rs-list">' +
    modeCopy.map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul>";
  if (isDaily) {
    modeBlock += head("rules", "Plus " + baseName + " mode rules", { tag: "h3", cls: "rs-eyebrow" }) + '<ul class="rs-list">' +
      (RULES_MODE[baseKey] || []).map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul>";
  }
  var todayBlock = "";
  if (isDaily) {
    var brief = G.social.gate || G.social.short || "";
    todayBlock = '<div class="rs-today plq-frame plq-slim">' +
      head("rules", "Today\u2019s rule \u00B7 Daily #" + G.social.num, { tag: "h3", cls: "rs-eyebrow rs-today-label" }) +
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
      head("rules", G.weekly ? "This week\u2019s twist" : "The twist", { tag: "h3", cls: "rs-eyebrow rs-today-label" }) +
      '<p class="rs-today-name">' + esc(ch.name || "") + '</p>' +
      (chBrief ? '<p class="rs-today-body">' + esc(chBrief) + '</p>' : '') +
      '</div>';
  }

  h += '<div class="rs-ref">' + head("rules", "Need a refresher?", { tag: "h3", cls: "rs-eyebrow rs-ref-label" }) + rulesRefresherHtml() + '</div>';

  var engineRules = RULES_ENGINE;
  if (baseKey === "classic" && !isDaily && !ch) {
    engineRules = RULES_ENGINE.concat([["ANY GIVEN NIGHT",
      "The season is played out one game at a time. No five wins a given night more than 99 times in 100, so a perfect season has to survive all 82."]]);
  }
  h += head("rules", "What wins games", { tag: "h3", cls: "rs-eyebrow" }) + '<ul class="rs-list rs-engine">' +
    engineRules.map(function (r) { return "<li><strong>" + r[0] + ":</strong> " + r[1] + "</li>"; }).join("") + "</ul>" +
    ((isDaily || ch) ? '<p class="rs-note">Today\u2019s rule wins any conflict with the normal numbers above.</p>' : "");

  h += '</div><div class="rs-foot">' +
    '<a class="rs-ref-btn t-btn" data-kind="quiet" href="' + bbrefTag(BBREF_BPM_LEADERS, "howto") + '" target="_blank" rel="noopener">STATS REFRESHER \u2197</a>' +
    '<button class="rs-got" id="rulesGotIt" type="button">GOT IT</button>' +
  '</div>';
  return h;
}
// The homepage's HOW TO PLAY (v53): the demo, the basics and one line per
// mode. The mode rules and the engine's numbers stay on the draft screens.
var RULES_HOME_MODES = [
  ["CLASSIC", "Full stats on every card. Skip a team or an era once."],
  ["PRESTI", "A $50M salary cap. Every player has a price."],
  ["THE DAILY", "One board a day for everyone. Your first run counts."]
];
// v63 (the owner: move "Draft what wins" off the home into HOW TO PLAY, with "what the game is, but also that we're
// different because we actually do real team fit using advanced stats and player attribute labels which you can vote
// on ... very tersely"): the slogan in the home's old halftone type, one line of what it is, two stamped claims.
var HOWTO_PITCH = {
  what: "Five NBA seasons from any era. One 82-game season. Can they go 82\u20130?",
  claims: [["REAL FIT", "Advanced stats grade how your five play together, not how famous they are."],
    ["YOUR VOTES COUNT", "Player tags like ISO-D and CLUTCH change the score. Vote on them after every draft."]]
};
function howToPitchHtml() {
  return '<div class="rs-pitch">' +
    '<p class="rs-slogan" aria-hidden="true"><span class="rs-slogan-dots">Draft what wins</span><span class="rs-slogan-ink">Draft what wins</span></p>' +
    '<p class="sr-only">Draft what wins.</p>' +
    '<p class="rs-what">' + HOWTO_PITCH.what + "</p>" +
    '<ul class="rs-claims">' + HOWTO_PITCH.claims.map(function (c, i) {
      return '<li class="rs-claim' + (i ? " is-cyan" : "") + '"><b>' + c[0] + "</b><span>" + c[1] + "</span></li>";
    }).join("") + "</ul></div>";
}
function rulesHomeHtml() {
  return '<div class="rs-head">' + head("sheet", "How to play", { cls: "rs-title" }) +
    '<button class="rs-close" id="rulesClose" type="button" aria-label="Close how to play">\u2715</button></div>' +
    '<div class="rs-scroll">' + howToPitchHtml() + howToDemoHtml() + '<div class="sr-only">' + howToStepsHtml() + "</div>" +
      head("rules", "Game basics", { tag: "h3", cls: "rs-eyebrow" }) + '<ul class="rs-list">' +
      RULES_BASICS.map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul>" +
      head("rules", "The modes", { tag: "h3", cls: "rs-eyebrow" }) + '<ul class="rs-list rs-engine">' +
      RULES_HOME_MODES.map(function (m) { return "<li><strong>" + m[0] + ":</strong> " + m[1] + "</li>"; }).join("") + "</ul>" +
      '<p class="rs-note">Every draft screen has its own HOW TO PLAY with the full rules and scoring.</p>' +
    '</div><div class="rs-foot"><button class="rs-got" id="rulesGotIt" type="button">GOT IT</button></div>';
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
function openRulesSheet(opts) {
  if (el("rulesOverlay")) return;
  RULES_PREV_FOCUS = document.activeElement;
  var ov = document.createElement("div");
  ov.className = "rules-overlay";
  ov.id = "rulesOverlay";
  ov.setAttribute("role", "dialog");
  ov.setAttribute("aria-modal", "true");
  ov.setAttribute("aria-label", "How to play");
  ov.innerHTML = '<div class="rules-sheet plq-frame" id="rulesSheet">' + rulesSheetHtml(opts) + '</div>';
  document.body.appendChild(ov);
  document.body.classList.add("rules-open");
  ov.addEventListener("click", function (ev2) { if (ev2.target === ov) closeRulesSheet("backdrop"); });
  el("rulesClose").addEventListener("click", function () { closeRulesSheet("x"); });
  el("rulesGotIt").addEventListener("click", function () { closeRulesSheet("got_it"); });
  document.addEventListener("keydown", rulesEscListener);
  try { el("rulesClose").focus(); } catch (e) {}
  ANALYTICS_RULES_OPEN_TS = Date.now();
  analyticsTrack("rules_open", Object.assign(analyticsRunSnapshot(), { action: opts && opts.home ? "how_to_play_home" : "how_to_play" }));
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
    '<a class="donate-btn t-btn" data-size="sm" id="donateBtn" href="mailto:true82mailbox@gmail.com" data-msg="' + esc(msg) + '">' + esc(msg) + '</a>' +
  '</div>';
}
/* ---------- PLAYER BONUSES (v46; internal traits_* names unchanged) ---------- */
// The voting mode lives at /bonuses/ (per-question slugs at /bonuses/<slug>);
// app.js owns the two doorways: the homepage module (one curated rotating
// question from op=featured) and the compact results-screen prompt, which
// prefers a question about a player this user just drafted.
// Styling lives in styles.css ("the homepage vote card"); v51 folded in the
// block this file used to inject, so every surface reads the one theme.
// One spelling of every trait code, everywhere (owner, v51): the live traits
// take their chip names from BALLOT_TRAITS (the results ballot's list), which
// fills this map right after it is defined, so the draft pool, its legend and
// the homepage vote card read the same codes as the ballot. Only the retired
// v1 names are written here, so an old settled label stays readable.
var TRAIT_CARD_ABBR = {
  "Wing Defender": "WING-D",
  "Primary Creator": "CREATE",
  "Help Defender": "HELP-D"
};
var TRAIT_CARD_UI_SEEN_KEY = "t82_trait_card_ui_seen_v1";
var traitExpandedChip = null;
var traitDocDismissWired = false;
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
  if (traitExpandedChip) setTraitChipExpanded(traitExpandedChip, false);
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
  var seen = {}, rows = [], engRows = [], eng = [];
  var chips = scope.querySelectorAll(".tchip[data-full]");
  for (var i = 0; i < chips.length; i++) {
    var full = chips[i].getAttribute("data-full") || "";
    if (!full || seen[full]) continue;
    seen[full] = 1;
    var abbr = chips[i].getAttribute("data-abbr") || traitCardAbbr(full);
    var isEng = chips[i].classList.contains("eng");
    var tone = chips[i].getAttribute("data-tone");
    var def = BALLOT_BY_NAME[full] && BALLOT_BY_NAME[full].d;   // v53: the definitions are back
    var line = '<div class="trait-legend-row"><span class="t-chip" data-size="sm"' + (tone ? ' data-tone="' + esc(tone) + '"' : "") + ">" +
      esc(abbr) + '</span><span class="tl-txt"><b>' + esc(full) + (isEng ? " \u00B7 engine" : "") + "</b>" +
      (def ? "<small>" + esc(def) + "</small>" : "") + "</span></div>";
    if (isEng) { engRows.push(line); eng.push(abbr); } else rows.push(line);
  }
  // the engine note names only the engine codes this legend actually lists (v51)
  eng.sort();   // "3PT" before "GRAVITY"
  var engNote = !eng.length ? ""
    : eng.length === 1 ? " " + eng[0] + " is the engine\u2019s own shooting math, not a vote."
    : " " + eng.join(" and ") + " are the engine\u2019s own shooting math, not votes.";
  // v61: on a draft board the tags are what the Scoring Card reads, so the note says how
  var board = scope.id === "pool" || !!scope.querySelector(".board-tags");
  var tagNote = !board ? "" : " Your five pays net for a role nobody fills (ISO-D 2; CLUTCH, TEAM-D, RIM+, TSHOT 1 each); for pairs: two knuckleheads 2, two TITLE #1s 2 (the Dueling Banjos Tax), two who hold the ball (BALL-STOP or BALL-POUND) 2, two HUNTED 2, two FOUL-MERCH 1; and 1 for every STAT-PAD.";
  // v63: the height by each position is what the size rule reads, and usg (Classic's stat line) is the one ball (Pro shows neither)
  var sz = board && MODE !== "pro" ? sizeRule([], []) : null, bl = board && MODE === "classic" ? ballRule([]) : null;
  if (sz && (sz.gAmt > 0 || sz.fcAmt > 0)) tagNote += " Heights count by unit: two guards " + htText(sz.gBar) + " or shorter cost " + fmt1(sz.gAmt).replace(/\.0$/, "") +
    ", and so do two frontcourt players " + htText(sz.fcBar) + " or shorter. A red height is the second one.";
  if (bl && bl.rate > 0) tagNote += " The usg numbers share one ball: your five get " + Math.round(bl.budget) + " free, then each point costs " + fmt1(bl.rate).replace(/\.0$/, "") + ".";
  panel.innerHTML = '<div class="trait-legend-title">PLAYER LABELS</div>' +
    '<div class="trait-legend-grid">' + rows.concat(engRows).join("") + '</div>' +
    '<div class="trait-legend-note">Community votes confirm or overturn these labels.' + engNote + tagNote + "</div>";
}
// One shared open/close for every label-legend (i) button.
function traitInfoToggle(ib, legend) {
  collapseTraitChip();
  var opening = legend.hidden;
  legend.hidden = !opening;
  ib.setAttribute("aria-expanded", opening ? "true" : "false");
  ib.setAttribute("aria-label", opening ? "Close player label legend" : "Explain player labels");
  ib.textContent = opening ? "\u00d7" : "i";
  syncPoolCue();   // the open legend pushes the pool down; the cue would sit on its chips
}
// One document-level delegation for every trait chip everywhere (results
// cards, classic draft pool, Kaman cards): tap expands in place, tap
// elsewhere collapses. Draft-pool row selection guards itself against chip
// taps in its own listener, so a chip tap never drafts the player.
function wireTraitChipTaps() {
  if (traitDocDismissWired) return;
  traitDocDismissWired = true;
  document.addEventListener("click", function (ev) {
    var chip = ev.target.closest ? ev.target.closest(".tchip[data-full]") : null;
    if (chip) {
      ev.preventDefault();
      var sec = chip.closest ? chip.closest(".traits-roster") : null;
      if (sec) stopTraitCardCue(sec); else markTraitCardUiSeen();
      var opening = !chip.classList.contains("expanded");
      if (traitExpandedChip && traitExpandedChip !== chip) collapseTraitChip();
      setTraitChipExpanded(chip, opening);
      return;
    }
    if (traitExpandedChip) collapseTraitChip();
  });
}
function traitsModuleHtml() {
  // v59, the owner's home redesign ("Halftone v2"): the vote card votes IN PLACE and never leaves the
  // page. Ask (who, the season, the trait as a question, YES / NO / IDK); then the tally in the same
  // card (the bar, the call, what you said, NEXT QUESTION, the share link); after the set, "That's
  // five." and KEEP GOING, which deals a fresh set right here. It ships hidden and empty: only a clean
  // /api/traits answer reveals it, so the homepage never shows a stale or empty debate.
  var dia = "";
  for (var k = 0; k < 5; k++) dia += "<i></i>";
  return '<div class="hm-ht hm-poll" id="traitsModule" hidden>' +
    '<section class="hm-card" aria-labelledby="tmTitle">' +
      '<div class="hm-poll-head">' +
        '<h2 class="hm-poll-title" id="tmTitle">Help balance the game</h2>' +
        '<div class="hm-dia ink-dias" id="tmDots" role="img" aria-label="0 of 5 votes this round">' + dia + "</div>" +
      "</div>" +
      '<div class="hm-q" id="tmQBlock">' +
        '<div class="hm-who"><div class="hm-name" id="tmName"></div><div class="hm-season" id="tmSeason"></div></div>' +
        '<div class="hm-trait" id="tmTrait"></div>' +
        '<div class="hm-votes" id="tmVotes">' +
          '<div class="hm-ht is-yes"><button class="hm-vb tm-flat" type="button" id="tmYes">Yes</button></div>' +
          '<div class="hm-ht is-no"><button class="hm-vb tm-flat" type="button" id="tmNo">No</button></div>' +
          '<div class="hm-ht is-idk"><button class="hm-vb tm-flat" type="button" id="tmIdk" aria-label="I don\u2019t know: skip this one">IDK</button></div>' +
        "</div>" +
        '<div class="hm-res" id="tmRes" hidden>' +
          '<div class="hm-bar" id="tmBar"><b id="tmBarFill"></b></div>' +
          '<div class="hm-tally" aria-live="polite"><span id="tmTally"></span><span class="hm-you" id="tmYou"></span></div>' +
          '<div class="hm-ht is-next"><button class="hm-next tm-flat" type="button" id="tmNext">Next question</button></div>' +
          '<button class="hm-link hm-share tm-flat" type="button" id="tmShare">Share vote (please don\u2019t vote brigade)</button>' +
        "</div>" +
        '<p class="hm-err" id="tmErr" role="status" hidden></p>' +
      "</div>" +
      '<div class="hm-done" id="tmDone" hidden>' +
        '<p class="hm-done-t" id="tmDoneT"></p>' +
        '<p class="hm-done-s" id="tmDoneS"></p>' +
        '<div class="hm-ht is-next" id="tmAgainWrap"><button class="hm-next tm-flat" type="button" id="tmAgain">Keep going</button></div>' +
      "</div>" +
    "</section>" +
  "</div>";
}

// The inline home session: same worker, same voter, same analytics names as the full page (source
// home_module throughout). v59: nothing auto-advances and nothing navigates. A vote lands its tally
// in the card and waits for NEXT QUESTION; IDK is still a pass (nothing written), and it shows the
// standing tally read-only; a failed vote stays on the card with a note instead of leaving for /bonuses/.
var TM = { qs: [], i: 0, n: 0, sid: null, busy: false, phase: "ask", source: "home_module", loader: null, wired: false };
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
var TM_WORDS = ["zero", "one", "two", "three", "four", "five"];
// The trait as a short question under the name (the owner's mock: "Team defender?"). Three read
// better in the ballot's own words than as the trait's display name.
var TM_ASK = {
  "Super Three-Point Shooter": "Gravity shooter?",
  "Championship #1": "The #1 on a title team?",
  "Hunted": "Hunted on defense?"
};
function tmAsk(trait) {
  var t = String(trait || "");
  if (TM_ASK[t]) return TM_ASK[t];
  return t ? t.charAt(0) + t.slice(1).toLowerCase() + "?" : "";
}
// "2023-24" becomes "2023–24 · Pacers". The team rides the desk's metadata line when it names one
// ("Kobe Bryant · 2007-08 Lakers"); otherwise the game's own data names it once site_data.json has
// landed (tmDataReady patches the card in place). No team found, no team shown: never a guess.
function tmSeasonLine(q) {
  var lab = String(q.season_label || q.season || "").replace(/^(\d{4})-(\d{2})$/, "$1\u2013$2");
  var team = tmTeamFor(q);
  return lab + (team ? " \u00B7 " + team : "");
}
function tmTeamFor(q) {
  var m = /\d{4}-\d{2}\s+(.+)$/.exec(String(q.metadata_line || ""));
  if (m) return m[1];
  if (!DATA_READY || !IDX || !q.season || !POOL_YEARS || !POOL_YEARS.forEach) return "";
  var want = String(q.player_name || "").toLowerCase(), season = Number(q.season), best = null;
  POOL_YEARS.forEach(function (cell) {
    cell.forEach(function (rows, name) {
      if (String(name).toLowerCase() !== want) return;
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (r[IDX.season] === season && (!best || r[IDX.mp] > best[IDX.mp])) best = r;   // a traded season: the longer stint
      }
    });
  });
  var fr = best ? TEAM2FR[best[IDX.team]] : "";
  return fr ? titleCase(fr) : "";
}
function tmDataReady() {
  var q = TM.qs[TM.i], s = el("tmSeason");
  if (q && s && TM.phase !== "done") s.textContent = tmSeasonLine(q);
}
function tmCalm() {
  // The site ignores the OS motion flag for the game itself (prefersReduce), but this reward is
  // decoration on a form, so it honors it: the end state lands at once.
  try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
}
function tmReplay(node, cls) {
  if (!node) return;
  node.classList.remove(cls);
  void node.offsetWidth;
  if (!tmCalm()) node.classList.add(cls);
}
function tmDots(fresh) {
  var d = el("tmDots");
  if (!d) return;
  var total = Math.min(5, Math.max(1, TM.qs.length)), marks = d.children;
  if (marks.length !== total) {
    var h = "";
    for (var k = 0; k < total; k++) h += "<i></i>";
    d.innerHTML = h;
    marks = d.children;
  }
  for (var j = 0; j < marks.length; j++) marks[j].className = j < TM.n ? "on" : "";
  d.setAttribute("aria-label", TM.n + " of " + total + " votes this round");
  if (!fresh) { d.classList.remove("is-full"); return; }
  if (TM.n > 0) tmPrint(d, marks[TM.n - 1], TM.n >= total);
}
// The reward (owner: "a really fun, artistic dopamine reward" on every vote, distinct from the
// game-by-game reel but the same family). The new diamond prints like a riso pass: the pink key
// plate stamps down, the aqua plate lands off register and snaps in, and a ring of halftone dots
// rolls out in both inks. The set's last diamond is the big one: the row re-inks left to right and
// the ring doubles. Under a second, decoration only (NEXT is never held), no flashing, and the end
// state lands at once under prefers-reduced-motion.
function tmPrint(row, mark, last) {
  if (!row || !mark || tmCalm()) return;
  row.classList.remove("is-full");
  if (last) { void row.offsetWidth; row.classList.add("is-full"); tmReplay(el("tmTitle"), "is-lit"); }
  inkPrint(row, mark, last ? "big" : "");
}
// THE INK PRINT (v59.1: shared by the home card's diamonds and the draft's pick diamonds and coins). The
// mark takes .is-new (its stamp in CSS), and a halftone ring and a spray of drops roll out from its center
// inside host (a positioned box). variant "big" rings the whole row (centered on host, so it stays on the
// card); "token" is coin-sized. The pieces clean themselves up after a second.
function inkPrint(host, mark, variant) {
  if (!host || !mark) return;
  mark.classList.remove("is-new");
  void mark.offsetWidth;
  mark.classList.add("is-new");
  var hb = host.getBoundingClientRect(), mb = mark.getBoundingClientRect();
  var x = (variant === "big" ? hb.width / 2 : mb.left - hb.left + mb.width / 2) + "px";
  var y = (mb.top - hb.top + mb.height / 2) + "px";
  var bits = ["ink-burst", "ink-spray"].map(function (cls) {
    var b = document.createElement("b");   // a <b>, so a diamond row's own rules (> i, > span) never style it
    b.className = cls + (variant ? " is-" + variant : "");
    b.setAttribute("aria-hidden", "true");
    b.style.left = x;
    b.style.top = y;
    host.appendChild(b);
    return b;
  });
  setTimeout(function () {
    bits.forEach(function (b) { if (b.parentNode) b.parentNode.removeChild(b); });
    mark.classList.remove("is-new");
  }, 1000);
}
function tmCountUp(node, to) {
  if (!node) return;
  if (tmCalm() || !window.requestAnimationFrame) { node.textContent = to + "%"; return; }
  var t0 = null;
  function step(ts) {
    if (t0 === null) t0 = ts;
    var p = Math.min(1, (ts - t0) / 560), e = 1 - Math.pow(1 - p, 3);
    node.textContent = Math.round(to * e) + "%";
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
// The call, in the game's real rule (the server's live thresholds: 62% settles a yes, 38% a no,
// once 25 votes are in; the pill on the results ballot reads the same numbers).
function tmCall(d, floor) {
  if (!d || d.yes_pct == null) return { pct: null, text: "No votes yet" };
  if (d.status === "qualifies") return { pct: d.yes_pct, text: " say yes \u00B7 Settled" };
  if (d.status === "does_not_qualify") return { pct: 100 - d.yes_pct, no: true, text: " say no \u00B7 Settled" };
  if (d.status === "disputed") return { pct: d.yes_pct, text: " say yes \u00B7 Still disputed" };
  var left = Math.max(1, (floor || 25) - ((d.yes || 0) + (d.no || 0)));
  if (d.yes_pct < 50) return { pct: 100 - d.yes_pct, no: true, text: " say no \u00B7 " + left + " more to settle" };
  return { pct: d.yes_pct, text: " say yes \u00B7 " + left + " more to settle" };
}
function tmShowQuestion(anim) {
  var q = TM.qs[TM.i];
  var mod = el("traitsModule");
  if (!q || !mod) return tmComplete();
  TM.phase = "ask";
  el("tmQBlock").hidden = false;
  el("tmDone").hidden = true;
  el("tmName").textContent = q.player_name || "";
  el("tmSeason").textContent = tmSeasonLine(q);
  el("tmTrait").textContent = tmAsk(q.trait_name);
  el("tmVotes").hidden = false;
  el("tmRes").hidden = true;
  el("tmErr").hidden = true;
  mod.classList.remove("tm-locked");
  ["tmYes", "tmNo", "tmIdk"].forEach(function (id) { var b = el(id); if (b) b.classList.remove("pressed"); });
  if (anim) tmReplay(el("tmQBlock"), "is-in");
  tmDots(false);
  tmSeenAdd(q.id, TM_SHOWN_KEY);                // v60: a question on screen counts as seen, voted on or not
  analyticsTrack("traits_question", { surface: "traits", action: "view", ordinal: TM.i + 1, challenge: q.id, source: TM.source, sid: TM.sid });
}
// Share the exact question on screen: the same canonical URL family the full page shares
// (/bonuses/<slug>, or ?q=<id>; src=s so the receiving session logs entry source "share").
// Native share sheet when the browser has one, copy with a COPIED beat otherwise. No vote is written.
function tmShareQuestion() {
  var q = TM.qs[TM.i];
  var sh = el("tmShare");
  if (!q || !sh) return;
  var url = location.origin + "/bonuses/" + (q.slug || ("?q=" + encodeURIComponent(q.id))) + (q.slug ? "?src=s" : "&src=s");
  var text = "Vote on this one: " + (q.public_question || (q.player_name + ", " + (q.season_label || q.season) + ": " + tmAsk(q.trait_name)));
  if (navigator.share) {
    navigator.share({ text: text, url: url }).then(function () {
      analyticsTrack("traits_question", { surface: "traits", action: "share_open", challenge: q.id, source: TM.source, sid: TM.sid });
    }).catch(function () {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text + "\n" + url).then(function () {
      var label = sh.getAttribute("data-label") || sh.textContent;
      sh.setAttribute("data-label", label);
      sh.textContent = "Copied";
      setTimeout(function () { sh.textContent = label; }, 1400);
      analyticsTrack("traits_question", { surface: "traits", action: "share_copy", challenge: q.id, source: TM.source, sid: TM.sid });
    }).catch(function () {});
  }
}
function tmVote(resp, btn) {
  if (TM.busy || TM.phase !== "ask") return;
  var q = TM.qs[TM.i];
  var mod = el("traitsModule");
  if (!q || !mod) return;
  TM.busy = true;
  mod.classList.add("tm-locked");
  btn.classList.add("pressed");
  el("tmErr").hidden = true;
  buzz(10);
  var t0 = Date.now();
  fetch("/api/traits", {
    method: "POST", credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op: "vote", question_id: q.id, response: resp, source: TM.source, sid: TM.sid })
  }).then(function (r) { return r.json(); }).then(function (x) {
    if (!x || !x.ok || !x.display) return tmFailed(x && x.reason);
    tmSeenAdd(q.id);
    analyticsTrack("traits_vote", { surface: "traits", action: resp, ordinal: TM.i + 1, challenge: q.id, outcome: x.outcome, value: Date.now() - t0, source: TM.source, sid: TM.sid });
    tmResult(q, resp, x.display, x.rules);
  }).catch(function () { tmFailed(); });
}
function tmFailed(reason) {
  TM.busy = false;
  var mod = el("traitsModule");
  if (mod) mod.classList.remove("tm-locked");
  ["tmYes", "tmNo", "tmIdk"].forEach(function (id) { var b = el(id); if (b) b.classList.remove("pressed"); });
  var e = el("tmErr");
  if (!e) return;
  e.textContent = reason === "rate_limited" ? "Easy there. Give it a second, then tap again." : "That vote didn\u2019t save. Tap it again.";
  e.hidden = false;
}
// IDK = a pass. Nothing is written server-side (an unsure lean is the full page's UNSURE vote; a pass
// is "stop asking me this one"): the id joins the local seen store, and the card shows where the
// crowd stands, read-only, so a pass still pays out a tally and a diamond.
function tmPass(btn) {
  if (TM.busy || TM.phase !== "ask") return;
  var q = TM.qs[TM.i];
  var mod = el("traitsModule");
  if (!q || !mod) return;
  TM.busy = true;
  mod.classList.add("tm-locked");
  btn.classList.add("pressed");
  el("tmErr").hidden = true;
  buzz(6);
  tmSeenAdd(q.id);
  analyticsTrack("traits_vote", { surface: "traits", action: "pass", ordinal: TM.i + 1, challenge: q.id, source: TM.source, sid: TM.sid });
  fetch("/api/traits?op=result&q=" + encodeURIComponent(q.id) + "&sid=" + TM.sid, { credentials: "same-origin" })
    .then(function (r) { return r.json(); })
    .then(function (x) { tmResult(q, "pass", x && x.ok ? x.display : null, x && x.rules); })
    .catch(function () { tmResult(q, "pass", null, null); });
}
function tmResult(q, resp, d, rules) {
  if (!el("traitsModule")) return;
  TM.busy = false;
  TM.phase = "result";
  TM.n++;
  el("traitsModule").classList.remove("tm-locked");
  el("tmVotes").hidden = true;
  el("tmErr").hidden = true;
  el("tmRes").hidden = false;
  var call = tmCall(d, rules && rules.min_eligible_votes);
  var tally = el("tmTally");
  tally.textContent = "";
  if (call.pct != null) {
    var num = document.createElement("b");
    num.className = "hm-pct" + (call.no ? " is-no" : "");
    num.textContent = "0%";
    tally.appendChild(num);
    tally.appendChild(document.createTextNode(call.text));
    tmCountUp(num, call.pct);
  } else tally.textContent = call.text;
  el("tmYou").textContent = resp === "yes" ? "You said yes" : resp === "no" ? "You said no" : "You passed";
  el("tmNext").textContent = TM.i + 1 >= TM.qs.length ? "Finish" : "Next question";
  el("tmBarFill").style.width = (d && d.yes_pct != null ? d.yes_pct : 0) + "%";
  tmReplay(el("tmBar"), "is-rolling");
  tmReplay(el("tmRes"), "is-in");
  tmDots(true);
  try { el("tmNext").focus({ preventScroll: true }); } catch (e) {}
  buzz(10);
  analyticsTrack("traits_question", { surface: "traits", action: "result_view", ordinal: TM.i + 1, challenge: q.id, outcome: d ? d.status : "none", value: d && d.mode === "counts" ? 1 : 0, source: TM.source, sid: TM.sid });
}
function tmNext() {
  if (TM.phase !== "result") return;
  TM.i++;
  if (TM.i >= TM.qs.length) return tmComplete();
  tmShowQuestion(true);
}
function tmComplete() {
  if (!el("traitsModule")) return;
  TM.phase = "done";
  el("tmQBlock").hidden = true;
  el("tmDone").hidden = false;
  el("tmDoneT").textContent = "That\u2019s " + (TM_WORDS[TM.n] || TM.n) + ". Thanks for balancing the game.";
  el("tmDoneS").textContent = "Your votes help settle the disputed calls.";
  el("tmAgainWrap").hidden = false;
  var again = el("tmAgain");
  again.disabled = false;
  again.textContent = "Keep going";
  tmReplay(el("tmDone"), "is-in");
  try { again.focus({ preventScroll: true }); } catch (e) {}
  buzz([12, 70, 12]);
  analyticsTrack("traits_session", { surface: "traits", action: "complete", value: TM.n, source: TM.source, sid: TM.sid });
}
// v60 (the owner: "if you answer 5 questions on the voting widget on the front page and you selected to do more it
// redirects you to the dedicated voting screen"): KEEP GOING opens /bonuses/, which carries the count on and deals
// past everything this device has seen.
function tmAgain() {
  var b = el("tmAgain");
  if (!b || b.disabled) return;
  b.disabled = true;
  analyticsTrack("traits_session", { surface: "traits", action: "more", value: TM.n, source: TM.source, sid: TM.sid });
  location.href = "/bonuses/?src=home_more&n=" + Math.max(0, Math.min(99, TM.n | 0));
}
// KEEP GOING came back empty (every curated call answered twice) or failed: say so in the card.
function tmEmpty(failed) {
  var b = el("tmAgain");
  if (!b) return;
  el("tmDoneT").textContent = failed ? "Couldn\u2019t deal more calls just now." : "That\u2019s every call for now.";
  el("tmDoneS").textContent = failed ? "Check the connection, then try again." : "New disputes land all the time. Check back soon.";
  if (failed) { b.disabled = false; b.textContent = "Try again"; }
  else el("tmAgainWrap").hidden = true;
}
function tmStart(again) {
  var mod = el("traitsModule");
  if (!mod || !window.fetch || !TM.loader) return;
  TM.sid = (Math.random().toString(36).slice(2, 10) + Date.now().toString(36)).slice(0, 16);
  traitsIdentityReady().then(function () { return TM.loader(); }).then(function (x) {
    if (!el("traitsModule")) return;
    // The API already tiers never-answered, answered-once, and exhausted questions. Keep that order
    // intact instead of independently hiding all standing votes, which would defeat the intentional
    // second-answer round.
    var qs = x && x.ok && x.questions ? x.questions.filter(function (q) { return q.public_question && q.player_name && q.trait_name; }).slice(0, 5) : [];
    if (!qs.length) { if (again) tmEmpty(false); return; }
    TM.qs = qs;
    TM.i = 0;
    TM.n = 0;
    TM.busy = false;
    if (!TM.wired) {
      TM.wired = true;
      el("tmYes").addEventListener("click", function () { tmVote("yes", el("tmYes")); });
      el("tmNo").addEventListener("click", function () { tmVote("no", el("tmNo")); });
      el("tmIdk").addEventListener("click", function () { tmPass(el("tmIdk")); });
      el("tmNext").addEventListener("click", tmNext);
      el("tmAgain").addEventListener("click", tmAgain);
      el("tmShare").addEventListener("click", tmShareQuestion);
    }
    tmShowQuestion(again);
    if (mod.hidden) { mod.hidden = false; tmReplay(mod, "is-in"); }
    analyticsTrack("traits_session", { surface: "traits", action: again ? "again" : "start", source: TM.source, sid: TM.sid });
    if (!again) analyticsTrack("mode_impression", { surface: TM.source === "home_module" ? "home" : "results", action: "traits", challenge: TM.qs[0].id });
  }).catch(function () { if (again) tmEmpty(true); });
}
// This device's history, oldest first: t82TraitsSeen holds the calls answered or passed (the /bonuses/ page keeps the
// same list), t82TraitsShown every call that was on screen (v60).
var TM_SEEN_KEY = "t82TraitsSeen", TM_SHOWN_KEY = "t82TraitsShown";
function tmSeenList(key) {
  try {
    var a = JSON.parse(localStorage.getItem(key || TM_SEEN_KEY) || "[]");
    return Array.isArray(a) ? a.filter(function (x) { return typeof x === "string"; }) : [];
  } catch (e) { return []; }
}
function tmSeenAdd(id, key) {
  if (!id) return;
  try {
    var a = tmSeenList(key).filter(function (x) { return x !== id; });
    a.push(id);
    if (a.length > 400) a = a.slice(a.length - 400);
    localStorage.setItem(key || TM_SEEN_KEY, JSON.stringify(a));
  } catch (e) {}
}
// v60 (the owner: back on the start screen "im getting past questions ... we're trying to get it as much as possible
// that [it] doesn't happen"). The server already skips what this browser's voter id has answered, but a pass, a call
// shown and left unanswered, and any browser without the retention cookie were only covered by the last 48 answers,
// and the day's featured call re-led every fresh card until it was answered. Now every call this device has shown
// or answered rides along (the newest 150), the featured call leads only if this device has never shown it, and
// only when that leaves nothing does the deal fall back: first to the answered ones only, then to the server's own
// two-answer ceiling.
function tmExcludeIds(withShown) {
  var seen = tmSeenList(TM_SEEN_KEY), out = [], have = {};
  var lists = withShown ? [tmSeenList(TM_SHOWN_KEY).slice(-100), seen.slice(-100)] : [seen.slice(-150)];
  lists.forEach(function (l) { for (var i = l.length - 1; i >= 0; i--) if (!have[l[i]]) { have[l[i]] = 1; out.push(l[i]); } });
  return out.slice(0, 150);
}
function tmSessionLoader() {
  function deal(pin, ex) {
    return fetch("/api/traits?op=session&sid=" + TM.sid + (pin ? "&q=" + encodeURIComponent(pin) : "") +
      (ex.length ? "&exclude=" + ex.map(encodeURIComponent).join(",") : ""), { credentials: "same-origin" })
      .then(function (r) { return r.json(); });
  }
  function dealt(x) { return !!(x && x.ok && x.questions && x.questions.length); }
  return fetch("/api/traits?op=featured", { credentials: "same-origin" })
    .then(function (r) { return r.json(); })
    .then(function (feat) {
      var ex = tmExcludeIds(true);
      var pin = feat && feat.ok && feat.question ? feat.question.id : "";
      if (pin && ex.indexOf(pin) >= 0) pin = "";
      return deal(pin, ex).then(function (x) {
        if (dealt(x)) return x;
        return deal("", tmExcludeIds(false)).then(function (y) { return dealt(y) ? y : deal("", []); });
      });
    });
}
function wireBonusesModule() {
  TM.source = "home_module";
  TM.loader = tmSessionLoader;
  TM.wired = false;
  TM.phase = "ask";
  tmStart(false);
}
// Fail-soft by construction: the section ships hidden and empty; only a clean
// /api/traits answer ever reveals it. Any network or schema failure leaves the
// results screen exactly as it was.
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
  // v51: the flat small chip (read-only, not a button to vote with); a bad trait takes the bad tone, as on the ballot
  var bad = BALLOT_BY_NAME[full] && BALLOT_BY_NAME[full].neg;
  return '<button type="button" class="tchip t-chip' + (hh.anti ? " anti" : "") + '" data-size="sm"' + (bad ? ' data-tone="bad"' : "") +
    (tab === -1 ? ' tabindex="-1"' : "") +
    ' data-full="' + esc(full) + '" data-abbr="' + esc(abbr) + '"' +
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
function applyLabelChips(container, hits, tab) {
  hits = (hits || []).filter(function (hh) { return hh && !hh.anti; });   // v50: the strike-through anti chip is retired everywhere
  if (!container || !hits.length || container.querySelector(".tchips")) return false;
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
/* ---------- v50 THE TAG BALLOT (results roster) ----------
   The five results cards ARE the ballot (owner spec, TAG_BALLOT_HANDOFF
   2026-09-24). A card shows only what is true of the player. Tap a tag and
   it asks that trait's own question: YES / NO / NOT SURE. "+" adds any
   trait. A "?" badge marks a tag that is still unsettled (the scout called
   it close, or the crowd is split). One meaning per color: sun = the site's
   yes, scarlet = a bad trait, the blue ring = you weighed in. No legend on
   the cards; a white glove shows the two taps once per browser. Every trait
   carries its one-line definition (d, owner-written, v53: "ADD DEFINITIONS
   TO TRAITS"): the question sheet, the picker's tiles, the tag glossary
   (the (i) by YOUR FIVE, and the picker's foot) and the draft pool legend
   all read it.
   Reads op=labels (mine=1 for the rings), writes one op=vote per answer
   (source "card"; player + season ride along so a brand-new tag can create
   its question on first vote). The engine's own 3PT / GRAVITY designation
   is a settled tag: a crowd NO can mark it unsettled but never removes it,
   because the engine still counts it. Nothing here touches the engine.
   The draft pool's chips stay read-only (v47.9) and the old strike-through
   anti chips are retired everywhere. Copy law: zero em-dashes. */
var BALLOT_TRAITS = [
  // pick = offered by "+". v60 (the owner: "make sure TITLE #1, BALL-POUND, FOUL-MERCH are offered in all aspects
  // the same as the other traits"): every core trait is, so the old four-negative ceiling is gone.
  { id: "three-point-shooter", name: "Three-Point Shooter", chip: "3PT", q: "a 3PT shooter", g: "off", pick: 1,
    d: "Defenses had to guard him past the arc." },
  { id: "super-three-point-shooter", name: "Super Three-Point Shooter", chip: "GRAVITY", q: "a gravity shooter", g: "off", pick: 1,
    d: "So feared from deep that he warps the whole defense." },
  { id: "rim-pressurer", name: "Rim Pressurer", chip: "RIM+", q: "a rim pressurer", g: "off", pick: 1,
    d: "Lives at the rim and the foul line." },
  { id: "off-ball-scorer", name: "Off-Ball Scorer", chip: "OFF-B", q: "an off-ball scorer", g: "off", pick: 1,
    d: "Scores without the ball in his hands: cuts, screens, relocations." },
  { id: "tough-shot-maker", name: "Tough Shot Maker", chip: "TSHOT", q: "a tough shot maker", g: "off", pick: 1,
    d: "Makes contested, late-clock shots nobody should take." },
  { id: "playmaker", name: "Playmaker", chip: "PLAY", q: "a playmaker", g: "off", pick: 1,
    d: "Runs the offense and makes teammates better." },
  { id: "iso-defender", name: "Iso Defender", chip: "ISO-D", q: "an iso defender", g: "def", pick: 1,
    d: "You put him on their best scorer, one on one." },
  { id: "team-defender", name: "Team Defender", chip: "TEAM-D", q: "a team defender", g: "def", pick: 1,
    d: "Rotations, help, hands in passing lanes." },
  { id: "switchable-defender", name: "Switchable Defender", chip: "SWITCH", q: "switchable on defense", g: "def", pick: 1,
    d: "Guards guards and bigs alike." },
  { id: "rim-protector", name: "Rim Protector", chip: "RIM-P", q: "a rim protector", g: "def", pick: 1,
    d: "Shots at the rim change because he is there." },
  { id: "clutch", name: "Clutch", chip: "CLUTCH", q: "clutch", g: "rep", pick: 1,
    d: "You want the last shot in his hands. So does he." },
  { id: "championship-number-one", name: "Championship #1", chip: "TITLE #1", q: "a title team’s number one", g: "rep", pick: 1,
    d: "The best player on a team that could win it all." },
  { id: "hunted", name: "Hunted", chip: "HUNTED", q: "hunted on defense", g: "rep", neg: 1, pick: 1,
    d: "Opponents go at him on purpose: switch onto him, post him, run him off screens." },
  { id: "ball-stopper", name: "Ball Stopper", chip: "BALL-STOP", q: "a ball stopper", g: "rep", neg: 1, pick: 1,
    d: "The ball goes in and does not come out." },
  { id: "ball-pounder", name: "Ball Pounder", chip: "BALL-POUND", q: "a ball pounder", g: "rep", neg: 1, pick: 1,
    d: "Needs a lot of dribbles before anything happens." },
  { id: "foul-merchant", name: "Foul Merchant", chip: "FOUL-MERCH", q: "a foul merchant", g: "rep", neg: 1, pick: 1,
    d: "Hunts whistles for cheap free throws." },
  { id: "stat-padder", name: "Stat Padder", chip: "STAT-PAD", q: "a stat padder", g: "rep", neg: 1, pick: 1,
    d: "Numbers that do not add up to winning." },
  { id: "off-court-knucklehead", name: "Off-Court Knucklehead", chip: "KNUCK", q: "an off-court knucklehead", g: "rep", neg: 1, pick: 1,
    d: "Suspensions, arrests, feuds. Trouble the team has to manage." }
];
var BALLOT_GROUPS = [["Offense", "off"], ["Defense", "def"], ["Reputation", "rep"]];
var BALLOT_BY_NAME = {};
BALLOT_TRAITS.forEach(function (T) { BALLOT_BY_NAME[T.name] = T; TRAIT_CARD_ABBR[T.name] = T.chip; });   // the one source of trait codes
var BALLOT_ENG = { "3PT": "Three-Point Shooter", "GRAVITY": "Super Three-Point Shooter" };
var BALLOT = { cards: [], rules: null, queue: [], busy: false, lastPost: 0, cur: null, toastT: 0, wired: false };

function ballotSid() {
  if (!TM.sid) TM.sid = (Math.random().toString(36).slice(2, 10) + Date.now().toString(36)).slice(0, 16);
  return TM.sid;
}
function ballotSurname(nm) { return bbrefLastName(nm) || String(nm || ""); }
// The deterministic question id op=roster and the scout backfill already
// use, so a first vote lands on the same row anyone else would have minted.
function ballotQid(name, season, traitId) {
  var slug = String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug + "-" + season + "-" + traitId;
}
function ballotEngAbbr(row) {
  var sp = row && IDX ? row[IDX.sp] : 0;
  return sp >= 1.5 ? "GRAVITY" : sp === 1 ? "3PT" : "";
}
function ballotNewCard(entry) {
  var row = entry.p.row, name = row[IDX.name], season = row[IDX.season];
  return {
    i: entry.i, name: name, season: season, key: String(name).toLowerCase() + "~" + season,
    eng: ballotEngAbbr(row), settled: {}, open: {}, split: {}, qids: {}, mine: {}, loaded: false
  };
}
// Pure: the tags a card shows, in order. state "on" = the site's yes,
// "off" = you overturned it (hollow, stays so the dispute reads), "q" =
// unsettled. v63 (the owner: "definitely the positive followed by the
// negatives"): the good tags, then the bad ones, the board's order too;
// within each, settled first, then "?", in trait order. "+" is appended by
// the renderer. Also returns what the "+" picker should offer.
function ballotTagModel(card) {
  var engName = BALLOT_ENG[card.eng] || "";
  var on = [], q = [], reopen = [], shown = {};
  BALLOT_TRAITS.forEach(function (T) {
    var eng = T.name === engName;
    var settled = !!card.settled[T.name] || eng;
    var unsettled = card.open[T.name] || card.split[T.name];
    var m = card.mine[T.name] || "";
    var tag = null;
    if (settled) {
      if (m === "no" && !eng) tag = { T: T, state: "off", mine: true };
      else if (card.split[T.name] || (eng && m === "no")) tag = { T: T, state: "q", mine: !!m };
      else tag = { T: T, state: "on", mine: !!m };
    } else if (unsettled) {
      if (m === "no" || m === "unsure") reopen.push(T);
      else tag = { T: T, state: "q", mine: !!m };
    } else if (m === "yes") {
      tag = { T: T, state: "on", mine: true };          // a tag you added joins the settled group
    }
    if (!tag) return;
    shown[T.name] = 1;
    if (tag.state === "q") q.push(tag); else on.push(tag);
  });
  // Settled gravity implies 3PT, so the two never both print. An unsettled
  // GRAVITY question leaves a settled 3PT alone: "3PT, and gravity?" is the
  // honest read.
  var gravityShown = on.some(function (t) { return t.T.id === "super-three-point-shooter" && t.state === "on"; });
  if (gravityShown) {
    on = on.filter(function (t) { return t.T.id !== "three-point-shooter" || t.mine; });
    q = q.filter(function (t) { return t.T.id !== "three-point-shooter" || t.mine; });
  }
  var offer = BALLOT_TRAITS.filter(function (T) {
    return T.pick && !shown[T.name] && reopen.indexOf(T) === -1 && !(gravityShown && T.id === "three-point-shooter");
  });
  function good(t) { return !t.T.neg; }
  function bad(t) { return !!t.T.neg; }
  return { tags: on.filter(good).concat(q.filter(good), on.filter(bad), q.filter(bad)), reopen: reopen, offer: offer };
}
function ballotTagHtml(tag) {
  var T = tag.T, cls = "bt-tag t-chip" + (T.neg ? " neg" : "") + (tag.state === "q" ? " q is-q" : "") +
    (tag.state === "off" ? " off is-off" : "") + (tag.mine ? " mine is-mine" : "");
  var aria = T.name + (tag.state === "q" ? ", unsettled" : tag.state === "off" ? ", you said no" : "") +
    (tag.mine ? ", you voted" : "") + ". Tap to weigh in.";
  return '<button type="button" class="' + cls + '" data-size="lg"' + (T.neg ? ' data-tone="bad"' : "") + ' data-trait="' + esc(T.id) + '" aria-label="' + esc(aria) + '">' +
    esc(T.chip) + (tag.state === "off" ? '<span class="bt-x" aria-hidden="true">✕</span>' : "") + "</button>";
}
function ballotTagsHtml(card) {
  var tags = ballotTagModel(card).tags.map(ballotTagHtml);
  var plus = '<button type="button" class="bt-tag add t-chip t-chip-add" data-size="lg" data-add="1" aria-label="Add a tag for ' + esc(card.name) + '">+</button>';
  // The "+" and the last tag wrap as one piece, so the "+" never sits alone on a row.
  var last = tags.length ? tags.pop() : "";
  return tags.join("") + '<span class="bt-tail">' + last + plus + "</span>";
}
function ballotBoxHtml(row) {
  function cell(v, lab) {
    return '<span><b>' + (v === null || v === undefined || !isFinite(v) ? "\u2013" : Number(v).toFixed(1)) + "</b><small>" + lab + "</small></span>";
  }
  // v62: the listed height closes the line (the size rule reads it; the season line is too narrow at 320px)
  return cell(row[IDX.ppg], "PTS") + cell(row[IDX.rpg], "REB") + cell(row[IDX.apg], "AST") +
    cell(row[IDX.spg], "STL") + cell(row[IDX.bpg], "BLK") + cell(row[IDX.usage], "USG%") +
    (row[IDX.ht] > 0 ? "<span><b>" + htText(row[IDX.ht]) + "</b><small>HT</small></span>" : "");
}
function ballotCard(i) {
  for (var k = 0; k < BALLOT.cards.length; k++) if (BALLOT.cards[k].i === i) return BALLOT.cards[k];
  return null;
}
function ballotRender(card) {
  var box = document.querySelector('.bt-tags[data-bt="' + card.i + '"]');
  if (box) box.innerHTML = ballotTagsHtml(card);
}
function ballotApplyLabels(x) {
  if (!x || !x.ok) return;
  if (x.rules) BALLOT.rules = x.rules;
  BALLOT.cards.forEach(function (card) {
    var k = card.key;
    (x.labels && x.labels[k] || []).forEach(function (h) {
      if (!h || h.anti || !BALLOT_BY_NAME[h.t]) return;
      card.settled[h.t] = 1;
      if (h.id) card.qids[h.t] = h.id;
    });
    var maps = [["open", x.open], ["split", x.split], ["qids", x.qids]];
    maps.forEach(function (m) {
      var src = m[1] && m[1][k];
      if (!src) return;
      Object.keys(src).forEach(function (t) {
        if (!BALLOT_BY_NAME[t]) return;
        if (m[0] !== "qids") card[m[0]][t] = src[t];
        card.qids[t] = card.qids[t] || src[t];
      });
    });
    var mine = x.mine && x.mine[k];
    if (mine) Object.keys(mine).forEach(function (t) { if (BALLOT_BY_NAME[t] && !card.mine[t]) card.mine[t] = mine[t]; });
    card.loaded = true;
    ballotRender(card);
  });
}
function wireBallot(entries) {
  BALLOT.cards = entries.map(ballotNewCard);
  BALLOT.cur = null;
  BALLOT.cards.forEach(ballotRender);                  // engine tags and "+" are live before the labels land
  var roster = document.querySelector('[data-result-section="roster"]');
  if (roster && !roster.__ballot) {
    roster.__ballot = 1;
    roster.addEventListener("click", function (ev) {
      var tag = ev.target.closest ? ev.target.closest(".bt-tag") : null;
      if (!tag || !roster.contains(tag)) return;
      var cardEl = tag.closest(".bt-card");
      var card = cardEl ? ballotCard(+cardEl.getAttribute("data-pick")) : null;
      if (!card) return;
      if (tag.getAttribute("data-add")) ballotOpenPicker(card);
      else ballotOpenAsk(card, tag.getAttribute("data-trait"));
    });
  }
  if (!window.fetch || !BALLOT.cards.length) return;
  var qs = BALLOT.cards.map(function (c) { return encodeURIComponent(c.name) + "~" + c.season; }).join(",");
  fetch("/api/traits?op=labels&mine=1&sid=" + ballotSid() + "&players=" + qs, { credentials: "same-origin" })
    .then(function (r) { return r.json(); })
    .then(function (x) {
      ballotApplyLabels(x);
      if (x && x.ok && x.labels) BALLOT.cards.forEach(function (c) { TRAIT_LABEL_CACHE[c.key] = x.labels[c.key] || []; });
    })
    .catch(function () {});
}

/* ---- the sheet ---- */
function ballotSheetEls() {
  var bd = el("btBackdrop"), sh = el("btSheet");
  if (bd && sh) return { bd: bd, sh: sh, inn: el("btSheetIn") };
  bd = document.createElement("div"); bd.id = "btBackdrop"; bd.className = "bt-backdrop t-backdrop";
  sh = document.createElement("div"); sh.id = "btSheet"; sh.className = "bt-sheet t-sheet";
  sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "true");
  sh.innerHTML = '<div class="bt-grab t-grab" aria-hidden="true"></div><div class="bt-in" id="btSheetIn"></div>';
  document.body.appendChild(bd); document.body.appendChild(sh);
  bd.addEventListener("click", ballotClose);
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && sh.classList.contains("on")) ballotClose(); });
  sh.addEventListener("click", ballotSheetClick);
  return { bd: bd, sh: sh, inn: el("btSheetIn") };
}
function ballotShow(label) {
  var s = ballotSheetEls();
  s.sh.setAttribute("aria-label", label);
  s.bd.classList.add("on");
  void s.sh.offsetWidth;                                // commit the closed pose so the slide-up transitions
  s.sh.classList.add("on");
  document.body.classList.add("bt-open");
  setTimeout(function () {
    var f = s.sh.querySelector(".bt-big, .bt-tog, .bt-done");
    if (f && f.focus) try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); }
  }, 60);
  return s;
}
function ballotClose() {
  var bd = el("btBackdrop"), sh = el("btSheet");
  if (bd) bd.classList.remove("on");
  if (sh) sh.classList.remove("on");
  document.body.classList.remove("bt-open");
  BALLOT.cur = null;
}
function ballotTrait(id) {
  for (var i = 0; i < BALLOT_TRAITS.length; i++) if (BALLOT_TRAITS[i].id === id) return BALLOT_TRAITS[i];
  return null;
}
function ballotWho(card) {
  var p = G && G.picks[card.i];
  var fr = p && p.fr ? titleCase(p.fr) : "";
  return card.name + " · " + shortSeason(card.season) + (fr ? " · " + fr : "");
}
function ballotQuestionHtml(card, T) {
  // Only the trait words are highlighted. The article stays outside the mark
  // and is tied to the first trait word by a no-break space, so a line never
  // ends on a lone underlined "A".
  var m = /^(an?) (.+)$/.exec(T.q), art = m ? m[1] + "\u00A0" : "", words = m ? m[2] : T.q;
  return "Was " + esc(String(card.season)) + " " + esc(ballotSurname(card.name)) + " " + art +
    '<mark class="' + (T.neg ? "neg" : "") + '">' + esc(words) + "</mark>?";
}
function ballotOpenAsk(card, traitId) {
  var T = ballotTrait(traitId);
  if (!T) return;
  BALLOT.cur = { card: card, T: T };
  var s = ballotSheetEls();
  s.inn.innerHTML =
    '<div class="bt-who t-meta">' + esc(ballotWho(card)) + "</div>" +
    '<div class="bt-q t-title">' + ballotQuestionHtml(card, T) + "</div>" +
    (T.d ? '<p class="bt-def">' + esc(T.d) + "</p>" : "") +
    '<div class="bt-btns" id="btBtns">' +
      '<button type="button" class="bt-big yes t-btn" data-kind="yes" data-size="lg" data-v="yes">Yes</button>' +
      '<button type="button" class="bt-big no t-btn" data-kind="no" data-size="lg" data-v="no">No</button>' +
      '<button type="button" class="bt-big idk t-btn" data-kind="quiet" data-v="unsure">Not sure</button>' +
    "</div>" +
    '<div class="bt-result" id="btResult" hidden></div>';
  ballotShow("Weigh in on " + T.name);
  analyticsTrack("traits_question", { surface: "results_card", action: "view", challenge: ballotQidFor(card, T), source: "card", sid: ballotSid() });
  var m = card.mine[T.name];
  if (m) ballotResultFetch(card, T, m);
}
function ballotQidFor(card, T) {
  return card.qids[T.name] || card.open[T.name] || card.split[T.name] || ballotQid(card.name, card.season, T.id);
}
// v60 THE TAG SHEET (the owner, 2026-09-27: the "+" screen "needs to show all trait[s] and allow for removal of
// those selected ... when you click anything in that plus-box screen you shouldn't need the YES/NO popup, just apply
// then and there"). Every trait the "+" offers, plus any other tag on the card, in the ballot's groups and trait
// order, so a tile never moves when it changes. A tile is lit when the tag is on his card for you: the card's own
// chip, a ring in its ink, a check in the corner. An unlit tile shows the chip hollow and a "+" in the corner. Its
// last line says what a tap does. A tap is your vote at once (YES lights it, NO takes it off), the card behind
// follows, the tile prints (or lifts), and the crowd's count lands on it with the vote. The card's own tags still
// open the full question (YES / NO / NOT SURE) with its tally.
function ballotSheetTiles(card) {
  var model = ballotTagModel(card), byName = {};
  model.tags.forEach(function (t) { byName[t.T.name] = t; });
  var engName = BALLOT_ENG[card.eng] || "";
  var gravityOn = !!(byName["Super Three-Point Shooter"] && byName["Super Three-Point Shooter"].state === "on");
  return BALLOT_TRAITS.filter(function (T) {
    return !!T.pick || !!byName[T.name] || model.reopen.indexOf(T) >= 0;
  }).map(function (T) {
    // a settled GRAVITY carries 3PT (the card never prints both), so 3PT's tile stays put, lit, and says why
    if (gravityOn && T.id === "three-point-shooter" && !byName[T.name]) return { T: T, lit: true, q: false, implied: true, act: "Comes with GRAVITY" };
    return ballotTileState(card, T, byName[T.name], T.name === engName);
  });
}
// Lit = the tag shows on his card and you have not said no to it. The act line is what a tap does.
function ballotTileState(card, T, tag, eng) {
  var mine = card.mine[T.name] || "";
  var lit = !!tag && tag.state !== "off" && mine !== "no";
  var act = lit
    ? (eng ? "The engine\u2019s call \u00B7 tap to dispute" : tag.state === "q" ? "Unsettled \u00B7 tap to take it off" : "On his card \u00B7 tap to remove")
    : (eng && tag ? "You disputed it \u00B7 tap to agree" : tag && tag.state === "off" ? "You took it off \u00B7 tap to put it back" : "Tap to add");
  return { T: T, lit: lit, q: !!tag && tag.state === "q", act: act };
}
function ballotTileSig(card, st) { return [st.lit ? 1 : 0, st.q ? 1 : 0, st.act, (card.tally && card.tally[st.T.name]) || ""].join("|"); }
function ballotTileHtml(card, st) {
  var T = st.T, tally = (card.tally && card.tally[T.name]) || "";
  var chip = '<span class="bt-tag t-chip' + (T.neg ? " neg" : "") + (st.q ? " q is-q" : "") + (st.lit ? "" : " off is-off") +
    '" data-size="lg" aria-hidden="true">' + esc(T.chip) + "</span>";
  return '<button type="button" class="bt-tog' + (T.neg ? " neg" : "") + (st.lit ? " is-lit" : "") + (st.implied ? " is-implied" : "") +
    '" data-trait="' + esc(T.id) + '" data-sig="' + esc(ballotTileSig(card, st)) +
    '" aria-pressed="' + (st.lit ? "true" : "false") + '" aria-label="' + esc(T.name + ". " + st.act.replace(/\u00B7/g, ".")) + '">' +
    '<span class="bt-tog-top">' + chip + '<i class="bt-tog-mark" aria-hidden="true">' + (st.lit ? "\u2713" : "+") + "</i></span>" +
    (T.d ? "<small>" + esc(T.d) + "</small>" : "") +
    '<span class="bt-tog-act">' + esc(st.act) + "</span>" +
    '<span class="bt-tog-tally">' + esc(tally) + "</span>" +
  "</button>";
}
function ballotSheetBody(card) {
  var tiles = ballotSheetTiles(card), h = "";
  h += '<div class="bt-who t-meta">' + esc(ballotWho(card)) + "</div>" +
    head("sheet", "Edit his tags", { cls: "bt-h" }) +
    '<p class="bt-sub">Lit tags are on his card. Tap one to add it or take it off. Each tap is your vote.</p>';
  BALLOT_GROUPS.forEach(function (gp) {
    var items = tiles.filter(function (st) { return st.T.g === gp[1]; });
    if (items.length) h += head("group", gp[0], { tag: "h3", cls: "bt-grp" }) + '<div class="bt-grid">' +
      items.map(function (st) { return ballotTileHtml(card, st); }).join("") + "</div>";
  });
  return h + '<button type="button" class="bt-done t-btn">Done</button>';
}
function ballotOpenPicker(card) {
  BALLOT.cur = { card: card, T: null, sheet: true };
  var s = ballotSheetEls();
  s.inn.innerHTML = ballotSheetBody(card);
  ballotShow("Edit the tags for " + card.name);
  analyticsTrack("traits_question", { surface: "results_card", action: "add_open", source: "card", sid: ballotSid() });
}
// Bring the open sheet up to date after a change: every tile whose state moved is repainted (a GRAVITY vote moves
// 3PT's tile too); fx on T's tile, "print" stamps it on, "lift" takes it off. Should the set of tiles itself change,
// the sheet redraws where it stands.
function ballotSheetRepaint(card, T, fx) {
  var cur = BALLOT.cur, sh = el("btSheet"), inn = el("btSheetIn");
  if (!cur || !cur.sheet || cur.card !== card || !sh || !inn) return;
  var tiles = ballotSheetTiles(card), focusId = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute("data-trait");
  var ids = tiles.map(function (st) { return st.T.id; }).join(",");
  var have = Array.prototype.map.call(sh.querySelectorAll(".bt-tog"), function (n) { return n.getAttribute("data-trait"); }).join(",");
  if (ids !== have) {
    var top = sh.scrollTop;
    inn.innerHTML = ballotSheetBody(card);
    sh.scrollTop = top;
  } else tiles.forEach(function (st) {
    var node = sh.querySelector('.bt-tog[data-trait="' + st.T.id + '"]');
    if (!node || node.getAttribute("data-sig") === ballotTileSig(card, st)) return;
    var wrap = document.createElement("div");
    wrap.innerHTML = ballotTileHtml(card, st);
    node.parentNode.replaceChild(wrap.firstChild, node);
  });
  var tile = sh.querySelector('.bt-tog[data-trait="' + T.id + '"]');
  if (focusId) {
    var f = sh.querySelector('.bt-tog[data-trait="' + focusId + '"]');
    if (f && document.activeElement !== f) try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); }
  }
  if (tile && fx && !reducedMotion()) {
    tile.classList.remove("is-printed", "is-lifted", "is-nope");
    void tile.offsetWidth;
    tile.classList.add(fx === "print" ? "is-printed" : fx === "nope" ? "is-nope" : "is-lifted");
    if (fx === "print") inkPrint(tile, tile.querySelector(".bt-tag"), "");
    setTimeout(function () { tile.classList.remove("is-printed", "is-lifted", "is-nope"); }, 900);
  }
}
function ballotToggle(card, traitId) {
  var T = ballotTrait(traitId);
  if (!T) return;
  var st = null;
  ballotSheetTiles(card).forEach(function (x) { if (x.T === T) st = x; });
  if (!st) return;
  if (st.implied) {                                   // 3PT under a settled GRAVITY: it goes when GRAVITY goes
    ballotSheetRepaint(card, T, "nope");
    buzz(20);
    ballotToast("3PT comes with GRAVITY. Take GRAVITY off first.");
    return;
  }
  var resp = st.lit ? "no" : "yes";
  var prev = card.mine[T.name] || "";
  card.mine[T.name] = resp;
  if (card.tally) delete card.tally[T.name];
  ballotRender(card);
  ballotSheetRepaint(card, T, st.lit ? "lift" : "print");
  buzz(st.lit ? 8 : 12);
  ballotEnqueue({ card: card, T: T, resp: resp, prev: prev, qid: ballotQidFor(card, T), tries: 0, sheet: true });
}
// The crowd's count on a tile, once the vote lands: "64% say yes · 37 votes" (the count alone below the minimum).
function ballotTileTally(card, T, d) {
  if (!d) return;
  var total = (d.yes || 0) + (d.no || 0) + (d.unsure || 0);
  var line = (d.mode === "pct" && d.yes_pct != null ? (d.yes_pct >= 50 ? d.yes_pct + "% say yes" : (100 - d.yes_pct) + "% say no")
    : (d.yes || 0) + " yes, " + (d.no || 0) + " no") + " \u00B7 " + total + (total === 1 ? " vote" : " votes");
  card.tally = card.tally || {};
  card.tally[T.name] = line;
  var sh = el("btSheet"), cur = BALLOT.cur;
  var tile = cur && cur.sheet && cur.card === card && sh ? sh.querySelector('.bt-tog[data-trait="' + T.id + '"]') : null;
  var node = tile && tile.querySelector(".bt-tog-tally");
  if (!node) return;
  node.textContent = line;
  tmReplay(node, "is-in");
  var st = null;
  ballotSheetTiles(card).forEach(function (x) { if (x.T === T) st = x; });
  if (st) tile.setAttribute("data-sig", ballotTileSig(card, st));
}
// The tag glossary: every trait's code and its one-line definition, in the
// ballot's groups. names (optional) limits it to those traits (the pool legend).
function traitGlossaryHtml(names) {
  var h = "";
  BALLOT_GROUPS.forEach(function (gp) {
    var items = BALLOT_TRAITS.filter(function (T) { return T.g === gp[1] && (!names || names[T.name]); });
    if (!items.length) return;
    h += head("group", gp[0], { tag: "h3", cls: "bt-grp" }) + '<div class="tg-list">' + items.map(function (T) {
      return '<div class="tg-row"><span class="t-chip" data-size="sm"' + (T.neg ? ' data-tone="bad"' : "") + ">" + esc(T.chip) + "</span>" +
        '<span class="tg-txt"><b class="t-name">' + esc(T.name) + '</b><span class="t-small">' + esc(T.d || "") + "</span></span></div>";
    }).join("") + "</div>";
  });
  return h;
}
function ballotOpenGlossary(from) {
  var s = ballotSheetEls();
  BALLOT.cur = null;
  s.inn.innerHTML = head("sheet", "What the tags mean", { cls: "bt-h" }) +
    '<p class="bt-sub">Tap a tag on a card to vote on it. 3PT and GRAVITY are the engine\u2019s own shooting math; the rest are the crowd\u2019s call.</p>' +
    traitGlossaryHtml(null) +
    '<button type="button" class="bt-done t-btn" data-kind="primary">Done</button>';
  ballotShow("What the tags mean");
  analyticsTrack("traits_question", { surface: "results_card", action: "glossary_open", variant: from || "", source: "card", sid: ballotSid() });
}
function ballotSheetClick(ev) {
  var t = ev.target.closest ? ev.target : null;
  if (!t) return;
  var cur = BALLOT.cur;
  var tile = t.closest(".bt-tog");
  if (tile && cur && cur.sheet) { ballotToggle(cur.card, tile.getAttribute("data-trait")); return; }
  var big = t.closest(".bt-big");
  if (big && cur && cur.T) { ballotAnswer(cur.card, cur.T, big.getAttribute("data-v")); return; }
  if (t.closest(".bt-change") && cur && cur.T) {
    el("btResult").hidden = true; el("btBtns").hidden = false;
    var f = el("btBtns").querySelector(".bt-big"); if (f) f.focus();
    return;
  }
  if (t.closest(".bt-gloss-open")) { ballotOpenGlossary("picker"); return; }
  if (t.closest(".bt-done")) ballotClose();
}
function ballotToast(msg) {
  var t = el("btToast");
  if (!t) { t = document.createElement("div"); t.id = "btToast"; t.className = "bt-toast t-toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(BALLOT.toastT);
  BALLOT.toastT = setTimeout(function () { t.classList.remove("on"); }, 1800);
}
function ballotAnswer(card, T, resp) {
  if (resp !== "yes" && resp !== "no" && resp !== "unsure") return;
  var wasShown = !!ballotTagModel(card).tags.filter(function (t) { return t.T === T && t.state !== "off"; }).length;
  var prev = card.mine[T.name] || "";
  card.mine[T.name] = resp;
  ballotRender(card);
  buzz(12);
  var who = ballotSurname(card.name);
  ballotToast(resp === "yes" ? (wasShown ? "Noted: " + T.chip : T.chip + " added to " + who)
    : resp === "no" ? "Noted: not " + T.chip : "Noted");
  el("btBtns").hidden = true;
  var res = el("btResult");
  res.hidden = false;
  res.innerHTML = '<div class="bt-counting">Counting…</div>';
  var qid = ballotQidFor(card, T);
  ballotEnqueue({ card: card, T: T, resp: resp, prev: prev, qid: qid, tries: 0 });
}
function ballotEnqueue(job) {
  // a quick change of heart on the same tag rides the vote still waiting to go (v60: the sheet's toggles)
  for (var i = 0; i < BALLOT.queue.length; i++) {
    var q = BALLOT.queue[i];
    if (q.card === job.card && q.T === job.T) { q.resp = job.resp; q.sheet = q.sheet || job.sheet; ballotPump(); return; }
  }
  BALLOT.queue.push(job);
  ballotPump();
}
// One answer at a time, spaced past the server's 1.2s cadence fence, so a
// quick change of heart never reads as a script.
function ballotPump() {
  if (BALLOT.busy || !BALLOT.queue.length) return;
  var wait = BALLOT.lastPost + 1300 - Date.now();
  if (wait > 0) { setTimeout(ballotPump, wait); return; }
  var job = BALLOT.queue.shift();
  BALLOT.busy = true;
  BALLOT.lastPost = Date.now();
  var t0 = Date.now();
  fetch("/api/traits", {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op: "vote", question_id: job.qid, response: job.resp, source: "card", sid: ballotSid(),
      player: job.card.name, season: job.card.season })
  }).then(function (r) { return r.json(); }).then(function (x) {
    BALLOT.busy = false;
    if (x && x.ok) {
      if (!job.card.qids[job.T.name]) job.card.qids[job.T.name] = job.qid;
      analyticsTrack("traits_vote", { surface: "results_card", action: job.resp, challenge: job.qid, outcome: x.outcome,
        value: Date.now() - t0, source: "card", variant: job.sheet ? "sheet" : "", sid: ballotSid() });
      if (job.sheet) ballotTileTally(job.card, job.T, x.display || null);
      else ballotShowResult(job.card, job.T, job.resp, x.display || null, x.consensus || null);
    } else if (x && x.reason === "rate_limited" && job.tries < 2) {
      job.tries++; BALLOT.lastPost = Date.now(); BALLOT.queue.unshift(job);
    } else ballotFailed(job, (x && x.reason) || "bad_reply");
    ballotPump();
  }).catch(function () { BALLOT.busy = false; ballotFailed(job, "network"); ballotPump(); });
}
function ballotFailed(job, why) {
  if (job.card.mine[job.T.name] === job.resp) {
    if (job.prev) job.card.mine[job.T.name] = job.prev; else delete job.card.mine[job.T.name];
    ballotRender(job.card);
    ballotSheetRepaint(job.card, job.T, "");
  }
  analyticsTrack("traits_vote", { surface: "results_card", action: job.resp, challenge: job.qid, outcome: "error_" + why, source: "card", sid: ballotSid() });
  var cur = BALLOT.cur;
  if (cur && cur.card === job.card && cur.T === job.T) {
    var res = el("btResult"), btns = el("btBtns");
    if (res) res.hidden = true;
    if (btns) btns.hidden = false;
  }
  ballotToast("Not saved. Try again.");
}
function ballotResultFetch(card, T, resp) {
  el("btBtns").hidden = true;
  var res = el("btResult");
  res.hidden = false;
  res.innerHTML = '<div class="bt-counting">Counting…</div>';
  var qid = ballotQidFor(card, T);
  if (!window.fetch) return;
  fetch("/api/traits?op=result&q=" + encodeURIComponent(qid) + "&sid=" + ballotSid(), { credentials: "same-origin" })
    .then(function (r) { return r.json(); })
    .then(function (x) {
      if (!x || !x.ok) { ballotShowResult(card, T, resp, null, null); return; }
      ballotShowResult(card, T, x.my_response || resp, x.display || null, x.consensus || null);
    })
    .catch(function () { ballotShowResult(card, T, resp, null, null); });
}
// Pure: the tally in words, the bar, and the ruling pill.
function ballotTally(d, c, resp, rules) {
  var yes = d ? d.yes || 0 : 0, no = d ? d.no || 0 : 0, uns = d ? d.unsure || 0 : 0;
  var total = yes + no + uns, eligible = yes + no, pct = eligible ? Math.round(100 * yes / eligible) : null;
  var said = resp === "unsure" ? "not sure" : resp;
  var line = total <= 0 ? "You are the first to weigh in"
    : (d && d.mode === "pct" && pct !== null)
      ? total + (total === 1 ? " person has" : " people have") + " voted · " + pct + "% say yes"
      : total + (total === 1 ? " vote" : " votes") + " so far · " + yes + " yes, " + no + " no";
  line += " · you said " + said;
  var status = (c && c.status) || (d && d.status) || "unresolved";
  var flip = Math.round(100 * ((rules && rules.qualify_yes_share) || 0.62));
  var need = c && typeof c.votes_needed === "number" ? c.votes_needed : null;
  var pill = status === "qualifies" ? "Ruling stands"
    : status === "does_not_qualify" ? "Ruled out"
    : status === "disputed" ? "Disputed · flips at " + flip + "%"
    : need ? need + " more " + (need === 1 ? "vote settles" : "votes settle") + " it" : "Still open";
  // The big percentage waits for a real sample; below the minimum the words carry it.
  var big = d && d.mode === "pct" && pct !== null;
  return { pct: pct, big: big, line: line, pill: pill, lead: pct === null ? null : (pct >= 50 ? "yes" : "no") };
}
function ballotShowResult(card, T, resp, d, c) {
  var cur = BALLOT.cur;
  if (!cur || cur.card !== card || cur.T !== T) return;
  var res = el("btResult");
  if (!res) return;
  var t = ballotTally(d, c, resp, BALLOT.rules);
  res.innerHTML =
    (!t.big ? "" : '<div class="bt-pct t-num ' + t.lead + '">' + (t.lead === "yes" ? t.pct : 100 - t.pct) + "% " + (t.lead === "yes" ? "YES" : "NO") + "</div>") +
    '<div class="bt-you">' + esc(t.line) + "</div>" +
    (t.pct === null ? "" : '<div class="bt-bar"><i style="width:' + t.pct + '%"></i></div>') +
    '<div class="bt-pill t-chip" data-tone="plain">' + esc(t.pill) + "</div>" +
    '<div class="bt-row"><button type="button" class="bt-change t-btn" data-kind="text">Change vote</button><button type="button" class="bt-done t-btn">Done</button></div>';
  var done = res.querySelector(".bt-done");
  if (done && document.activeElement && document.activeElement.closest && document.activeElement.closest("#btSheet")) done.focus();
}

/* ---- the glove ---- */
// The white glove, one drawing: this hint and the HOW TO PLAY demo both use it.
var GLOVE_PATH = '<path d="M19 4c-2.2 0-3.6 1.6-3.6 3.8v16.4l-2.9-3.1c-1.5-1.6-3.9-1.7-5.4-.3-1.5 1.4-1.6 3.8-.2 5.4l9.6 11.2c2.1 2.5 5.2 3.9 8.5 3.9h5.5c5.6 0 10.1-4.5 10.1-10.1v-9.4c0-2-1.6-3.6-3.6-3.6-.7 0-1.3.2-1.8.5-.4-1.6-1.9-2.8-3.6-2.8-.9 0-1.7.3-2.3.8-.6-1.3-1.9-2.2-3.4-2.2-.8 0-1.5.2-2.1.6V7.8C22.6 5.6 21.2 4 19 4z" stroke-width="2.4" stroke-linejoin="round"/>';
// v63 THE "+" HINT (the owner, after v60's scroll-proof glove still "just isn't working ... we've tried to fix it
// numerous times and it keeps breaking, you pick this time"). The animated hand is gone: it depended on timers, scroll
// stillness, how much of a card showed and a retire-after-three counter, so a returning player (the owner, who taps tags
// all day) never saw it again. Now the first results card prints the hint in its own markup (ballotHintHtml): the glove,
// "Tap + to tag him, or any tag to vote", and its "+" breathes the halftone ring (.bt-cue). No state, nothing to miss.
function ballotHintHtml() {
  return '<p class="bt-hint"><svg class="bt-glove" viewBox="0 0 48 48" aria-hidden="true">' + GLOVE_PATH + "</svg>" +
    '<span><b>Know him?</b> Tap <span class="bt-plus-mini" aria-hidden="true">+</span><span class="sr-only">the plus</span> to tag him, or tap any tag to vote.</span></p>';
}
function ballotOverlayUp() {
  return !!document.querySelector(".np-overlay, .hh-overlay, .reel-overlay, .rules-overlay, .bt-sheet.on");
}

/* ---------- v61: the tags on every draft board ----------
   Every mode's board (Classic, Presti, the Daily, the Do-Over) shows the tags the scoring reads, from the same
   frozen copy: the roles a lineup must fill and the settled reputations. Flat read-only chips; the (i) legend spells
   them out. Pro is the exception (the owner, 2026-09-27: "in pro you don't see the tags til the results screen but
   they still count the same"): Pro is played from memory, so its board and tray show none, and the Scoring Card still
   charges them.
   v63 (the owner: "there needs to be some order for the badges on the draft and results screen. definitely the
   positive followed by the negatives"): the board reads the results cards' order, BALLOT_TRAITS, positives first. And
   a "?" role tag shows like any other: it fills its role exactly like a settled one (it has to: settled tags are thin,
   so a settled-only rule would charge 20 of 32 real title teams for a missing role), so on the board the "?" said
   nothing a drafter could use. The results cards keep their "?", where it means "vote on this". */
var BOARD_TAG_IDS = { "rim-pressurer": 1, "tough-shot-maker": 1, "playmaker": 1, "iso-defender": 1, "team-defender": 1, "rim-protector": 1,
  "clutch": 1, "championship-number-one": 1, "hunted": 1, "ball-stopper": 1, "ball-pounder": 1, "foul-merchant": 1, "stat-padder": 1,
  "off-court-knucklehead": 1 };
var BOARD_TAGS = BALLOT_TRAITS.filter(function (T) { return BOARD_TAG_IDS[T.id]; }).map(function (T) { return T.id; });
// v62.1 THE DUELING BANJOS TAX (sim-core labelTaxes): two settled TITLE #1s cost 2, so a TITLE #1 shows settled only (like
// a knucklehead), and once your five has one, every other TITLE #1 on the board turns red: that pick would pay it
var BANJO_ID = "championship-number-one";
function fiveHasTitle1(row) {
  if (!G || !G.picks || !G.picks.length || typeof T82 === "undefined" || !T82.labelsOf) return false;
  for (var i = 0; i < G.picks.length; i++) {
    var r = G.picks[i].row;
    if (!r || (row && r[IDX.name] === row[IDX.name])) continue;
    var o = T82.labelsOf(r[IDX.name], r[IDX.season]);
    if (o && o[BANJO_ID] === "y") return true;
  }
  return false;
}
function boardTagsHtml(row, sd) {
  var o = row && typeof T82 !== "undefined" && T82.labelsOf ? T82.labelsOf(row[IDX.name], row[IDX.season]) : null;
  if (!o) return "";
  var banjo = !sd && G && G.screen === "draft" && o[BANJO_ID] === "y" && fiveHasTitle1(row), h = "";
  BOARD_TAGS.forEach(function (id) {
    var v = o[id], T = ballotTrait(id);
    if (!v || !T || ((T.neg || id === BANJO_ID) && v !== "y")) return;   // a reputation counts settled only, so it shows settled only
    var bad = T.neg || (id === BANJO_ID && banjo), nm = T.name + (id === BANJO_ID && banjo ? ", a second one costs 2" : "");
    h += '<button type="button" class="tchip t-chip" data-size="sm"' + (bad ? ' data-tone="bad"' : "") +
      ' tabindex="-1" data-full="' + esc(T.name) + '" data-abbr="' + esc(T.chip) + '"' +
      ' aria-label="' + esc(nm) + '" aria-pressed="false" title="' + esc(nm) + '">' + esc(T.chip) + "</button>";
  });
  return h ? '<span class="tchips tchips-inline board-tags">' + h + "</span>" : "";
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
  if (!pool.querySelector(".tchip[data-full]")) {
    if (!legend.hidden) traitInfoToggle(btn, legend);   // closes it and resets the (i), so it never reopens stuck on "x"
    btn.hidden = true; return;
  }
  btn.hidden = false;
  buildTraitLegendInto(legend, pool);
}
// v61: the board's chips come from the frozen tags inside each row (boardTagsHtml), in every mode; this only keeps
// the pool's (i) legend in step with them. (v47.9 to v60 fetched live labels for the Classic pool here.)
function wireDraftPoolLabels() {
  if (el("pool")) refreshPoolTraitLegend();
}

function wireDonate() {
  var b = el("donateBtn");
  if (b) b.addEventListener("click", function () {
    analyticsTrack("feedback_click", { variant: b.getAttribute("data-msg"), mode: MODE, surface: "results" });
  });
}

var KAMAN_TAPS = [];
function renderIntro() {
  G = null;
  ANALYTICS_HOME_N += 1;
  if (window.T82DUI) T82DUI.stop();   // leaving a duel screen kills its poll
  document.body.classList.remove("drafting");
  document.body.classList.remove("gating");
  document.body.classList.remove("has-pick");   // EXIT RUN with a player selected
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
  // No countdowns, no streak threats, no guilt copy anywhere on this surface; the streak renders as
  // a patch you earned, never a leash. Once today is played, the tile's PRIMARY action becomes
  // CHALLENGE A FRIEND: the retention surface feeds the share loop instead of farming compulsive
  // re-opens. The practice run rides second (v28, owner reversal of the v24 removal), quieter, so
  // the share action stays the loudest thing here.
  // v59, the owner's home redesign ("Halftone v2"): three brightness tiers, every door a two-line
  // button (the name in the display face, a plain line under it) on a dotted halftone offset shadow.
  // Pink is the core game (Classic, Presti), aqua the side modes. Classic is the only thing that
  // glows. The Daily keeps its played state: the record, CHALLENGE A FRIEND first, the practice run second.
  var hmStreak = dailyStreak >= 2 ? " \u00B7 " + dailyStreak + "-day streak" : "";
  var thirdSlotHtml;
  if (dailyBoard && dailyOfficial) {
    thirdSlotHtml =
      '<div class="hm-ht hm-mid is-cyan" id="homeDaily">' +
        '<div class="hm-mode hm-played" role="group" aria-label="The Daily #' + dailyBoard.num + ', played">' +
          '<span class="hm-t">The Daily #' + dailyBoard.num + ' <span class="hm-rec">\u2713 ' + dailyOfficial.wins + "-" + (82 - dailyOfficial.wins) + "</span></span>" +
          '<span class="hm-acts">' +
            '<button class="hm-act tm-flat" id="dailyChallengeBtn" type="button" data-share-label="Challenge a friend">Challenge a friend</button>' +
            '<span class="hm-sep" aria-hidden="true">\u00B7</span>' +
            '<button class="hm-act is-quiet tm-flat" id="dailyPracticeBtn" type="button">Run it back</button>' +
          "</span>" +
        "</div>" +
      "</div>";
  } else if (dailyBoard) {
    thirdSlotHtml =
      '<div class="hm-ht hm-mid is-cyan" id="homeDaily">' +
        '<button class="hm-mode tm-flat" id="startDaily" type="button">' +
          '<span class="hm-t">The Daily #' + dailyBoard.num + "</span>" +
          '<span class="hm-s">' + esc(dailyBoard.name) + hmStreak + "</span>" +
        "</button>" +
      "</div>";
  } else {
    thirdSlotHtml = '<div class="hm-ht hm-mid is-cyan"><button class="hm-mode tm-flat" id="startPro" type="button">' +
      '<span class="hm-t">Pro</span><span class="hm-s">Pick the best seasons from memory</span></button></div>';
  }
  app().innerHTML =
    '<section class="hm" id="home">' +
      '<header class="hm-mast">' +
        // v63 (the owner: the tagline "takes away from the pretty logo"): "Draft what wins" moved into HOW TO PLAY, so
        // the logo leads the home screen; the heading stays for screen readers. Kaman's egg moved to the logo.
        '<h1 class="sr-only" id="introTitle">TRUE 82: draft what wins</h1>' +
        '<button class="hm-howto tm-flat" id="homeRulesBtn" type="button" aria-haspopup="dialog" aria-label="How to play: a short demo and the basics">' +
          '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
            '<path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/></svg>' +
          "<span>How to play</span></button>" +
      "</header>" +
      '<div class="hm-stack">' +
        '<div class="hm-ht hm-hero"><button class="hm-mode tm-flat" id="startClassic" type="button">' +
          '<span class="hm-t">Classic</span><span class="hm-s">Start here \u00B7 Full stats</span></button></div>' +
        '<div class="hm-ht hm-mid is-pink"><button class="hm-mode tm-flat" id="startCap" type="button">' +
          '<span class="hm-t">Presti mode</span><span class="hm-s">Experts only \u00B7 Salary cap &amp; stats from memory</span></button></div>' +
        thirdSlotHtml +
        '<div class="hm-ht hm-quiet"><button class="hm-mode tm-flat" id="startRedraft" type="button">' +
          '<span class="hm-t">Draft Night Do-Over</span><span class="hm-s">Re-pick a real NBA draft class</span></button></div>' +
        traitsModuleHtml() +
      "</div>" +
      // Past Dailies, renamed and moved under the vote card (the owner's mock): a quiet text link.
      (dailyBoard && dailyBoard.num > 1 ? '<div class="hm-archive"><button class="hm-link tm-flat" id="dailyArchiveBtn" type="button">Daily archive</button></div>' : "") +
      // The account lane's doors: index.html's #t82-live-hide is still their one switch on this lane
      // (display:none); they stay in the markup for their wiring.
      '<div class="hm-lane">' +
        '<button class="arena-chip" id="arenaChip" type="button">\uD83C\uDFDF Arena</button>' +
        '<button class="daily-strip" id="dailyStrip" hidden></button>' +
        '<button class="btn btn-primary btn-block presti-spin weekly-tile" id="startWeekly" hidden>' +
          '<span class="wk-eyebrow">THIS WEEK</span><span class="wk-name" id="wkName"></span>' +
          '<span class="wk-blurb" id="wkBlurb"></span><span class="wk-meta" id="wkMeta"></span></button>' +
        '<button class="btn btn-block more-modes" id="startDuel">\u2694\uFE0F Duel a friend \u00B7 correspondence</button>' +
        '<button class="btn btn-block more-modes" id="startLeague">\uD83C\uDFC6 Found a league \u00B7 season-long H2H</button>' +
      "</div>" +
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
      ["startDuel", "duel"], ["startLeague", "league"], ["arenaChip", "arena"], ["startWeekly", "weekly"], ["startRedraft", "redraft"]
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
    var pressedSub = pressed && pressed.querySelector(".hm-s");   // v59: the door keeps its name; the line under it says so
    if (pressedSub) pressedSub.textContent = "Loading players\u2026";
    else if (pressed) pressed.textContent = "Loading players\u2026";
  }
  function queue(fn, btn) {
    if (DATA_READY) { fn(); return; }
    PENDING_FN = fn;
    if (btn) btn.disabled = true;
  }
  el("homeRulesBtn").addEventListener("click", function () { openRulesSheet({ home: true }); });
  el("startRedraft").addEventListener("click", function () { openRedrafted("home"); });
  if (el("dailyArchiveBtn")) el("dailyArchiveBtn").addEventListener("click", function () {
    analyticsTrack("feature_select", { surface: "home", action: "daily_archive" });
    renderDailyArchive();
  });
  el("startClassic").addEventListener("click", function () { start("classic"); });
  var proBtn = el("startPro");   // absent when THE DAILY holds the third slot
  if (proBtn) proBtn.addEventListener("click", function () { start("pro"); });
  el("startCap").addEventListener("click", function () { start("cap"); });
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
  // v59: the card has no door out (voting never leaves the page); its taps report through the vote vocabulary.
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
      } else if (dl.key < dailyBoard.key && T82DAILY.dayNum(dl.key) >= 1) {
        // v56: a link to a past board opens that board (the archive's gate), their number pinned
        var ptgt = (dl.w != null && dl.n != null) ? { w: dl.w, n: dl.n } : null;
        analyticsTrack("referral_open", {
          mode: dailyBoard.base, surface: "landing", action: "daily_link", outcome: "past",
          daily_num: T82DAILY.dayNum(dl.key), target_wins: ptgt ? ptgt.w : null, target_net: ptgt ? ptgt.n : null
        });
        DAILY_GATE_PENDING = { board: T82DAILY.boardFor(dl.key), tgt: ptgt, tag: "daily-practice:" + T82DAILY.dayNum(dl.key), archive: true };
      } else {
        // a link from a time zone already on tomorrow's board
        var dTile = el("homeDaily");
        analyticsTrack("referral_open", {
          mode: dailyBoard.base, surface: "landing", action: "daily_link", outcome: "stale",
          daily_num: T82DAILY.dayNum(dl.key)
        });
        if (dTile && dTile.parentNode) {
          var staleNote = document.createElement("p");
          staleNote.className = "daily-stale mono";
          staleNote.textContent = "That link is for Daily\u00A0#" + T82DAILY.dayNum(dl.key) + ", which opens at midnight here. Today's board is\u00A0#" + dailyBoard.num + ".";   // no-break spaces: a number never wraps alone
          dTile.parentNode.insertBefore(staleNote, dTile.nextSibling);
        }
      }
    }
  }

  // kaman left the menu — five quick taps on the logo bring Him back (v63: the tagline that carried the egg is gone
  // from the home; the logo lives outside #app, so it is wired once and only listens on the home screen)
  var logo = document.querySelector(".site-head .brand-logo");
  if (logo && !logo.__kaman) {
    logo.__kaman = 1;
    logo.addEventListener("click", function () {
      if (G || !el("home")) return;
      var now = Date.now();
      KAMAN_TAPS = KAMAN_TAPS.filter(function (t) { return now - t < 2500; });
      KAMAN_TAPS.push(now);
      if (KAMAN_TAPS.length >= 5) { KAMAN_TAPS = []; analyticsTrack("feature_select", { surface: "home", action: "kaman_egg", mode: "kaman" }); start("kaman"); }
    });
  }

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
    renderDailyGate(dgp.board, dgp.tgt, dgp.tag, { archive: !!dgp.archive });
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
  return lineupRailHtml() + trayBallHtml() + trayRolesHtml();
}
/* v63 THE BALL METER (the owner's item 3: "debating whether or not you need to put all the team aggregate taxes on the
   classic draft screen"). No: each card already shows its ingredients (usage, height, tags), and a pick that would cost
   a pair or size tax turns red on the board before you take it. The tray keeps only the running totals no card can
   show: the ball (this meter) and the roles still missing (trayRolesHtml); the Scoring Card keeps the whole bill. The
   meter fills as you draft, the budget is the notch, anything past it is red, and a selected player previews where he
   takes it. Classic-style boards only: Presti and Pro draft the stats from memory, and the Scoring Card charges it. */
function trayBallHtml() {
  if (!G || G.screen !== "draft" || MODE !== "classic" || !G.picks || G.picks.length >= CFG.ROUNDS) return "";
  var rows = G.picks.map(function (p) { return p.row; }), b = ballRule(rows);
  if (!b || !(b.rate > 0)) return "";                     // a board with the usage tax off shows no meter
  var sel = G.selected ? resolveRow(G.selected) : null;
  var nb = sel && !pickBlock(sel) ? ballRule(rows.concat([sel])) : null;
  if (!rows.length && !nb) return "";                     // an empty meter says nothing until the first player is in hand
  var top = Math.max(b.budget * 1.5, (nb || b).sum + 5);   // the track: the free ball, then half as much again
  function pct(x) { return Math.max(0, Math.min(100, 100 * x / top)).toFixed(1) + "%"; }
  var now = b.sum, next = nb ? nb.sum : now, over = nb ? nb.over : b.over, tax = nb ? nb.tax : b.tax;
  var fill = '<i class="tb-fill" style="width:' + pct(Math.min(now, b.budget)) + '"></i>' +
    (now > b.budget ? '<i class="tb-over" style="left:' + pct(b.budget) + ";width:" + pct(now - b.budget) + '"></i>' : "") +
    (next > now ? '<i class="tb-next' + (next > b.budget ? " is-over" : "") + '" style="left:' + pct(now) + ";width:" + pct(next - now) + '"></i>' : "") +
    '<i class="tb-notch" style="left:' + pct(b.budget) + '"></i>';
  var num = Math.round(now) + (nb ? " \u2192 " + Math.round(next) : "") + '<small> of ' + Math.round(b.budget) + "</small>" +
    (tax > 0.049 ? ' <b class="tb-tax">\u2212' + fmt1(tax) + "</b>" : "");
  var say = "The ball: your five use " + Math.round(now) + (nb ? ", " + Math.round(next) + " with " + G.selected : "") + ", of " + Math.round(b.budget) + " free" +
    (tax > 0.049 ? ", costing " + fmt1(tax) + " net" : "") + ".";
  return '<div class="tray-ball' + (over > 0 ? " is-over" : "") + '" role="img" aria-label="' + esc(say) + '">' +
    '<span class="tb-lab">The ball</span><span class="tb-track" aria-hidden="true">' + fill + "</span>" +
    '<span class="tb-num" aria-hidden="true">' + num + "</span></div>";
}
// v61: once two picks are left, the tray names the roles nobody on your five fills yet, with what each would cost
// (the engine's own reading, so it never disagrees with the Scoring Card). No tags loaded, no line.
var LBL_ROLE_IDS = { iso: 1, clutch: 1, teamd: 1, rimplus: 1, tshot: 1 };
function trayRolesHtml() {
  if (!G || G.screen !== "draft" || MODE === "kaman" || MODE === "pro" || !G.picks || G.picks.length < 3 || G.picks.length >= CFG.ROUNDS) return "";
  if (!window.T82 || !T82.labelTaxes || !T82.labelsReady()) return "";
  var lt = T82.labelTaxes(G, G.picks.map(function (p) { return p.row; }));
  var open = lt.rows.filter(function (r) { return r.amt > 0 && LBL_ROLE_IDS[r.id]; });   // roles only (not knuckleheads or banjos)
  if (!open.length) return '<div class="tray-roles is-full">Every role on the tag sheet is filled</div>';
  return '<div class="tray-roles">Still missing: ' + open.map(function (r) {
    return '<b>' + esc(LBL_COPY[r.id][0].replace(/^No /, "")) + "</b> \u2212" + (r.amt % 1 ? fmt1(r.amt) : r.amt);
  }).join(" \u00B7 ") + "</div>";
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
  // only while drafting: a Presti pool scramble that settles after the last pick
  // re-renders the tray under the reel, and used to put has-pick back (v51)
  document.body.classList.toggle("has-pick", G.screen === "draft" && !!G.selected);
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
  var tag = bucketTag(row) + heightTag(row) + (block ? " \u00B7 " + block.tag : "");
  // Pro is played from memory: its board and tray show no tags; they still count, and the results show them (the owner)
  var sub1 = yearControlHtml(name, row) + (MODE === "classic" ? chipsFor(row, -1) : "") + (MODE === "pro" ? "" : boardTagsHtml(row));
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
        '<span class="pr-pos">' + bucketTag(row) + heightTag(row) + why + '</span>' +
        '<span class="cap-season">' + shortSeason(row[IDX.season]) + ' ' + esc(row[IDX.team]) + '</span>' +
      '</span>' +
      boardTagsHtml(row) +
    '</span>' +
    '<span class="cap-cost">' + costHtml + '</span>' +
  '</div>';
}

function poolInnerHtml(rows) {
  // a search that matches nobody says so, instead of leaving a blank pool (v51)
  var q = G && String(G.query || "").trim();
  if (!rows.length && q) return '<p class="pool-empty">No player on this board matches \u201C' + esc(q) + '\u201D.</p>';
  return rows.map(poolRowHtml).join("");
}
// The one-time MORE PLAYERS cue shows only while there really is more below and
// nothing covers the pool: an empty search, or the open label legend, hides it (v51).
function syncPoolCue() {
  var cue = el("poolCue"), pool = el("pool"), legend = el("poolTraitLegend");
  if (!cue || !pool) return;
  cue.hidden = !!(legend && !legend.hidden) || pool.scrollHeight <= pool.clientHeight + 8;
}

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
  pool.innerHTML = poolInnerHtml(currentPoolRows());
  updateTray();
  wireDraftPoolLabels();      // the (i) legend follows the rows' tags
  syncPoolCue();
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

  var poolHtml = poolInnerHtml(rows);

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
      '<input type="search" id="poolSearch" class="pool-search" placeholder="search" aria-label="Search player names" autocomplete="off" spellcheck="false">' +
      (MODE !== "kaman"   // v61: every board carries tags now, so every board explains them
        ? '<button class="trait-info-btn pool-trait-info" id="poolTraitInfoBtn" type="button" aria-label="Explain player labels" aria-controls="poolTraitLegend" aria-expanded="false" title="Player label legend" hidden>i</button>'
        : "") +
      "</div>" +
      (MODE !== "kaman" ? '<div class="trait-legend pool-trait-legend" id="poolTraitLegend" hidden></div>' : "");
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
  draftInk();     // v59.1: the pick just made prints its diamond and its coin

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

// v58.4 THE LEDGER reads the run's own engine settings: a Daily or challenge board can move a target (the shooter
// count, the usage budget, the rim bar, the veteran year), and the engine reads them the same way (sim-core C()).
function runCfgSet(k) { var cfg = G && G.ch && G.ch.cfg; return !!(cfg && Object.prototype.hasOwnProperty.call(cfg, k)); }
function runCfg(k) { return runCfgSet(k) ? G.ch.cfg[k] : SC[k]; }

// The results ledger: one row per term of the engine's score, so the rows always add up to it (test.js pins that
// on every kind of board). A board that pays a bonus through a negative tax (Five-Out, Board Money, Win Now) shows
// it as a credit, and The Mid-Range's per-shooter charge gets its own row. Plain punctuation (the copy law).
// v61 THE LABEL TAXES on the Scoring Card: a row per tax and credit, in the owner's words where he gave them.
var LBL_COPY = {
  iso: ["No ISO-D", "Nobody can guard their best scorer. He gets 40."],
  clutch: ["No CLUTCH", "Nobody wants the last shot."],
  teamd: ["No TEAM-D", "Nobody rotates. Help never comes."],
  rimplus: ["No RIM+", "Jumpers all night. Nobody gets to the line."],
  tshot: ["No TSHOT", "When the play breaks down, nobody can bail you out."],
  knuck: ["Knuckleheads", ""],
  banjo: ["Dueling Banjos Tax", ""],
  stick: ["The ball sticks", ""],
  hunted: ["Hunted", ""],
  foul: ["Foul merchants", ""],
  statpad: ["Stat padding", ""],
  "switch": ["Switch everything", ""],
  cut: ["Somebody passes to the cutters", ""]
};
var LBL_NUM = ["", "One", "Two", "Three", "Four", "Five"];
// v63: one ball and size by unit on the Scoring Card. The biggest ball users are named, like the knuckleheads; the size
// rows name the small men and their heights. A board that pays through a negative key shows a credit.
function ballLedgerHtml(e) {
  var rows = G.picks.map(function (p) { return p.row; }), budget = Math.round(e.usageBudget), rate = e.usageRate;
  if (!(rate > 0) && !(e.usageTax < 0)) return ledgerRow("One ball", "Off on today\u2019s board: your five use " + Math.round(e.sumUsage) + " of the ball, free.", 0, false);
  if (e.usageTax < 0) return ledgerCreditRow("One ball", "Your five use " + Math.round(e.sumUsage) + " of the ball, and today\u2019s board pays for it.", -e.usageTax);
  if (!(e.usageTax > 0)) return ledgerRow("One ball", "Your five use " + Math.round(e.sumUsage) + " of the ball, inside the " + budget + " a five can share.", 0, false);
  var top = rows.map(function (r, i) { return i; }).sort(function (a, b) { return rows[b][IDX.usage] - rows[a][IDX.usage]; }).slice(0, 3)
    .map(function (i) { return shareSurname(rows[i][IDX.name]) + " " + Math.round(rows[i][IDX.usage]); }).join(", ");
  return ledgerRow("One ball", "Your five use " + Math.round(e.sumUsage) + " of the ball (" + esc(top) + "). A five can share " + budget +
    "; each point past it costs " + fmt1(rate).replace(/\.0$/, "") + ". " + (e.usageOver >= 20 ? "The ball is never coming back." : "Somebody has to set a screen."), e.usageTax, true);
}
function sizeLedgerHtml(e) {
  var z = e && e.size;
  if (!z) return "";
  var rows = G.picks.map(function (p) { return p.row; }), h = "";
  function who(list) { return list.map(function (i) { return rows[i] ? shareSurname(rows[i][IDX.name]) + " " + htText(rows[i][IDX.ht]) : ""; }).filter(Boolean).join(", "); }
  if (z.gTax > 0) h += ledgerRow("Two small guards", "Both guards " + htText(z.gBar) + " or shorter (" + esc(who(z.smallG)) + "). One small guard can hide; two get posted up and shot over.", z.gTax, true);
  else if (z.gTax < 0) h += ledgerCreditRow("Small backcourt bonus", "Both guards " + htText(z.gBar) + " or shorter (" + esc(who(z.smallG)) + "), and today\u2019s board pays for the speed.", -z.gTax);
  if (z.fcTax > 0) h += ledgerRow("Small frontcourt", LBL_NUM[z.smallFC.length] + " frontcourt players " + htText(z.fcBar) + " or shorter (" + esc(who(z.smallFC)) + "). One undersized big is fine; two, and the other team lives on the offensive glass.", z.fcTax, true);
  else if (z.fcTax < 0) h += ledgerCreditRow("Small-ball bonus", LBL_NUM[z.smallFC.length] + " frontcourt players " + htText(z.fcBar) + " or shorter (" + esc(who(z.smallFC)) + "), and today\u2019s board pays for the speed.", -z.fcTax);
  return h;
}
function labelRowsHtml(e) {
  if (!e || !e.labelRows || !e.labelRows.length) return "";
  var rows = G.picks.map(function (p) { return p.row; });
  function who(list) { return list.map(function (i) { return rows[i] ? shareSurname(rows[i][IDX.name]) : ""; }).filter(Boolean).join(", "); }
  return e.labelRows.map(function (r) {
    var c = LBL_COPY[r.id];
    if (!c) return "";
    if (r.id === "knuck") return ledgerRow(c[0], LBL_NUM[r.who.length] + " knuckleheads (" + esc(who(r.who)) + ")." +
      (r.who.length >= 3 ? " They started hanging out." : " They\u2019ll start hanging out."), r.amt, true);
    // v62.2: the owner's own lines for the Banjos and the stat padders
    if (r.id === "banjo") return ledgerRow(c[0], LBL_NUM[r.who.length] + " TITLE #1s (" + esc(who(r.who)) + "). Took the alphas some time to figure out how to play together and not just alongside each other.", r.amt, true);
    if (r.id === "stick") return ledgerRow(c[0], LBL_NUM[r.who.length] + " players who hold the ball (" + esc(who(r.who)) + "). It goes in and it does not come out.", r.amt, true);
    if (r.id === "hunted") return ledgerRow(c[0], LBL_NUM[r.who.length] + " hunted defenders (" + esc(who(r.who)) + "). Come playoff time, they get switched onto every trip.", r.amt, true);
    if (r.id === "foul") return ledgerRow(c[0], LBL_NUM[r.who.length] + " foul merchants (" + esc(who(r.who)) + "). The whistle disappears in the playoffs.", r.amt, true);
    if (r.id === "statpad") return ledgerRow(c[0], (r.who.length === 1 ? "A stat padder (" : LBL_NUM[r.who.length] + " stat padders (") + esc(who(r.who)) + "). Karma for your stat padding sins.", r.amt, true);
    if (r.id === "switch") return ledgerCreditRow(c[0], LBL_NUM[r.who.length] + " switchable defenders (" + esc(who(r.who)) + "). Every screen is a wash.", -r.amt);
    if (r.id === "cut") return ledgerCreditRow(c[0], "A playmaker (" + esc(who([r.who[0]])) + ") and two off-ball scorers (" + esc(who(r.who.slice(1))) + "). The cutters finally get the ball.", -r.amt);
    return ledgerRow(c[0], c[1], r.amt, true);
  }).join("");
}
function labelsAsOf(e) {
  var d = e && e.labelsBuilt ? new Date(e.labelsBuilt) : null;
  if (!d || isNaN(d.getTime())) return "";
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()] + " " + d.getUTCDate();
}
function resultsLedgerHtml(e) {
  var req = runCfg("SPACERS_REQ"), vetYr = runCfg("AGE_VET_YEAR");
  return '<div class="ledger">' +
    // v59.4 (the owner): the aggregate wears a styled sigma, "ΣV" over the sum of the five cards' V values (the
    // number keeps its own .ledger-amt, which test.js reads)
    '<div class="ledger-row ledger-talent"><span>Raw talent<span class="why">Sum of each pick\u2019s value over a replacement-level player.</span></span>' +
      '<span class="ledger-sum"><b class="sigma" aria-hidden="true">\u03A3</b><small>V</small><span class="ledger-amt">' + fmt1(e.sumV) + "</span></span></div>" +
    ballLedgerHtml(e) +
    (e.spacingBonus > 0
      ? ledgerCreditRow("Spacing bonus", e.sumSp + " shooters. Extra spacing stretches the defense past the requirement.", e.spacingBonus)
      : e.spacingBonus < 0
        ? ledgerRow("Shooter charge", e.sumSp + " shooters against today\u2019s target of " + req + ". On this board every shooter past it costs you.", -e.spacingBonus, true)
        : ledgerRow("Spacing tax", e.sumSp + " of " + req + " required spacers. Without shooting, the floor shrinks.", e.spacingTax, e.spacingTax > 0)) +
    (e.backDefTax > 0
      ? ledgerRow("Backcourt defense", "Both guards rank bottom-" + (e.backDefTier === 20 ? "20" : "33") + "% among guard defenders (DBPM). The perimeter leaks.", e.backDefTax, true)
      : "") +
    (e.wingDefTax > 0
      ? ledgerRow("Wing defense", "Both forwards rank bottom-" + (e.wingDefTier === 20 ? "20" : "33") + "% among forward defenders (DBPM). The frontcourt gets cooked.", e.wingDefTax, true)
      : "") +
    (e.rimDefTax > 0
      ? ledgerRow("Rim protection", (runCfgSet("RIM_TOP20") ? "None of your two forwards or center reaches today\u2019s bar of +" + fmt1(runCfg("RIM_TOP20")) + " DBPM"
        : "None of your two forwards or center ranks top-20% among frontcourt defenders (DBPM)") + (e.labelsOn ? ", and nobody is tagged RIM-P." : ".") + " The paint stays open.", e.rimDefTax, true)
      : e.rimDefTax < 0
        ? ledgerCreditRow("Five-out bonus", "None of your two forwards or center reaches +" + fmt1(runCfg("RIM_TOP20")) + " DBPM, and today\u2019s board pays for the open lane.", -e.rimDefTax)
        : "") +
    (e.glassTax > 0
      ? ledgerRow("Glass", "Your five don\u2019t rebound: the era-adjusted board rate is bottom of the league, so second chances go the other way.", e.glassTax, true)
      : e.glassTax < 0
        ? ledgerCreditRow("Glass bonus", "Your five rebound at an elite rate, and today\u2019s board pays for it.", -e.glassTax)
        : "") +
    (e.creatorTax > 0
      ? ledgerRow("No creator", "Nobody\u2019s era-adjusted assist rate says he can run an offense" + (e.labelsOn ? ", and nobody is tagged PLAY." : ".") + " Good luck beating a set defense 82 times.", e.creatorTax, true)
      : e.creatorTax < 0
        ? ledgerCreditRow("Creator bonus", "Today\u2019s board pays for your five\u2019s playmaking.", -e.creatorTax)
        : "") +
    (e.ageTax > 0
      ? ledgerRow("Mileage", e.vetCount + " players in their " + sdOrdinal(vetYr) + " season or later. Heavy legs: an 82-game schedule is the sixth defender.", e.ageTax, true)
      : e.ageTax < 0
        ? ledgerCreditRow("Veteran bonus", e.vetCount + " players in their " + sdOrdinal(vetYr) + " season or later, and today\u2019s board pays for the experience.", -e.ageTax)
        : "") +
    sizeLedgerHtml(e) +
    labelRowsHtml(e) +
    '<div class="ledger-row total"><span>Team score \u2192 net rating<span class="why">Score ' + fmt1(e.score) + " minus league baseline " + fmt1(BASELINE) + ".</span></span><span class=\"ledger-amt\">" + signed1(e.net) + "</span></div></div>" +
    (e.labelsOn && labelsAsOf(e) ? '<p class="ledger-note t-small">Tag rows read the tags as of ' + labelsAsOf(e) + ". Think a tag is wrong? Tap it on the card above and vote.</p>" : "");
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
// The results comp line. Pure: realized wins in, HTML out (test.js pins it).
// v51: a record more than one win below the lowest rung (under 61 wins) gets
// no comp phrase: "almost as good as" a 62-win team is only true one win away
// (a 3-79 run used to read "Almost as good as the Beautiful Game Spurs"). The
// share text is untouched (SHARE FORMAT LAW; it already drops the comp below 63).
function resultsCompHtml(wins) {
  var compLadder = HISTORY_COMPS.slice().sort(function (a, b) { return a.wins - b.wins; });
  var compAbove = null;
  for (var ci = 0; ci < compLadder.length; ci++) {
    if (compLadder[ci].wins > wins) { compAbove = compLadder[ci]; break; }
  }
  function compLinkHtml(prefix, entry) {
    var h = compEntryHref(entry, "climb");
    var lbl = compArticle(entry.label);
    if (!h) return esc(prefix + lbl);
    // the article word stays plain text; only the label itself is the anchor
    var lead = lbl.slice(0, lbl.length - entry.label.length);
    return esc(prefix + lead) + '<a class="cl-link" href="' + h + '" target="_blank" rel="noopener">' + esc(entry.label) + "</a>";
  }
  return wins >= CFG.GAMES_IN_SEASON
    ? esc("Greatest of all GOATs")
    : wins < compLadder[0].wins - 1
      ? ""
      : compAbove
        ? compLinkHtml("Almost as good as ", compAbove)
        : compLinkHtml("Better than ", compLadder[compLadder.length - 1]);
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
  // v51: the pin rides the REALIZED record, like the comp line under it (the
  // v46.2 owner ruling: comps key on realized wins). It rode the pre-season net
  // since v42, so a 64-18 team could sit below the Spurs while its comp line
  // named the '16 Spurs. The Heat Check passes its boosted wins as the override.
  var youWins = (typeof winsOverride === "number") ? winsOverride : e.winTally;
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
          '<button class="hh-btn presti-spin" id="hhAgain">RUN IT BACK</button>' +
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
    bonusEl.style.left = (baseFrac * 100).toFixed(2) + "%";         // the bonus grows out from the base mark (fire gold, glowing)
    bonusEl.style.width = "0%";
  }
  if (clutch) analyticsTrack("heatcheck_shown", Object.assign(analyticsRunSnapshot(), {
    surface: "heat_check", action: "offer", wins: e.winTally, net: e.net
  }));

  function dismiss() {
    if (!G.recapPayload) prepareRecap(e, e.winTally, e.net, null);   // ceremony skipped before verdict -> stage the payload for the Tribune's door (no model call yet)
    if (ov.parentNode) ov.parentNode.removeChild(ov);
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
      resultsPrintRecord(e, G.hotWins);                         // v50: the print and the share poster follow the save
      setEliteResultGlow(G.hotWins);
      var cmp = document.querySelector(".res-comp");             // v51: the comp line follows the save too, like the share text
      if (cmp) {
        var cmpHtml = resultsCompHtml(G.hotWins);
        cmp.innerHTML = cmpHtml + (typeof G.sharePct === "number"
          ? (cmpHtml ? ' <span class="comp-pct">\u2022 Top ' : '<span class="comp-pct">Top ') + G.sharePct + "%</span>" : "");
      }
      var lbl = document.querySelector(".big-label");            // net rating = [base, gold] + [bonus, hot-hand fire gold]
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
      var bonusFrac = Math.max(0, w / CFG.GAMES_IN_SEASON - baseFrac);        // bar still fills toward 82-0 in fire gold
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
    var strip = ov.querySelector("#hhStrip"), endY = -((targetFlat - 1) * ITEM), landed = false;
    function land() {
      if (!ov.parentNode) return;
      landed = true;
      // v51: the glide starts on an animation frame but this lands on a timer; a
      // throttled tab can run the timer first, so snap onto the chosen name here
      strip.style.transition = "none"; strip.style.transform = "translateY(" + endY + "px)";
      var rows = strip.querySelectorAll(".hh-name");
      if (rows[targetFlat]) rows[targetFlat].classList.add("hot");
      buzz(18);
      setTimeout(heat, 470);
    }
    function glide(to, dur, ease) { if (landed) return; strip.style.transition = "transform " + dur + "s " + ease; strip.style.transform = "translateY(" + to + "px)"; }
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
// flames (hidden until ignition), and the bouncing PULL DOWN hint. v53 (owner:
// "a Vice neon makeover"): the ball and the hoop are neon tubes in the look's
// inks (the ball in the accent, the rim and net in the second ink, each with a
// bright core), painted from tokens in styles.css; the ball catches fire gold
// (hot) at ignition. The Heat Check and THE DAILY gate share it.
function ballLeverHtml(leverId, armId, ariaLabel) {
  var gid = "hhBg" + leverId;
  return '<div class="hh-lever" id="' + leverId + '" role="button" tabindex="0" aria-label="' + esc(ariaLabel) + '">' +
    '<span class="hh-fire" aria-hidden="true"><i></i><i></i><i></i></span>' +
    '<span class="hh-ball" id="' + armId + '">' +
      '<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">' +
        '<defs><radialGradient id="' + gid + '" cx="50%" cy="40%" r="64%">' +
          '<stop offset="0%" class="hh-ball-in"/><stop offset="100%" class="hh-ball-out"/>' +
        '</radialGradient></defs>' +
        '<circle class="hh-ball-body" cx="24" cy="24" r="21.5" fill="url(#' + gid + ')"/>' +
        '<path class="hh-ball-seams" d="M2.5 24H45.5M24 2.5V45.5M8.5 7.5Q24 24 8.5 40.5M39.5 7.5Q24 24 39.5 40.5"/>' +
        '<circle class="hh-ball-core" cx="24" cy="24" r="21.5"/>' +
      '</svg>' +
    '</span>' +
    '<span class="hh-hoop" aria-hidden="true">' +
      '<svg viewBox="0 0 96 76" width="96" height="76">' +
        '<g class="hh-net">' +
          '<path d="M16 20 L36 62"/><path d="M32 20 L42 62"/><path d="M48 20 L48 62"/><path d="M64 20 L54 62"/><path d="M80 20 L60 62"/>' +
          '<path d="M24 36 Q48 40 72 36"/><path d="M31 50 Q48 54 65 50"/>' +
        '</g>' +
        '<ellipse class="hh-rim" cx="48" cy="16" rx="35" ry="9"/>' +
        '<ellipse class="hh-rim-core" cx="48" cy="16" rx="35" ry="9"/>' +
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
  // hold the button's width while it reads COPIED!, so its row never jumps (v51)
  if (!b.style.minWidth && b.getBoundingClientRect) b.style.minWidth = Math.ceil(b.getBoundingClientRect().width) + "px";
  b.textContent = msg;
  setTimeout(function () { if (b && b.isConnected !== false) { b.textContent = reset; b.style.minWidth = ""; } }, 1600);
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
// v50: files (the season print) ride along when the device can share them.
// The text is byte-for-byte the locked share text either way; a sheet that
// refuses the files falls back to the plain text path below.
function shareOrCopy(txt, button, track, files) {
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
    var sp, how = files && files.length ? "native_share_print" : "native_share";
    try { sp = navigator.share(files && files.length ? { files: files, text: txt } : { text: txt }); }
    catch (e) {
      if (files && files.length) { try { how = "native_share"; sp = navigator.share({ text: txt }); } catch (e2) { sp = null; } }
      if (!sp) { failed(how, "error", e); sp = null; }
    }
    if (sp && sp.then) {
      sp.then(function () { completed(how); copiedFlash(); }, function (err) {
        if (err && err.name === "AbortError") { failed(how, "cancel", err); copiedFlash(); return; }  // user dismissed the sheet: intent only
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
  if (e.usageTax > 0) n.push("more than one ball's worth of stars: their usage adds up to " + Math.round(e.sumUsage) + " against the " + Math.round(e.usageBudget) + " a lineup can share");
  if (e.spacingBonus > 0) n.push("surplus shooting: extra floor-spacers stretch every defense");
  else if (e.spacingTax > 0) n.push("only " + e.sumSp + " of " + runCfg("SPACERS_REQ") + " required floor-spacers: the floor shrinks in the half court");
  else if (e.spacingBonus < 0) n.push(e.sumSp + " shooters on a board that charges for every one past " + runCfg("SPACERS_REQ") + ": the extra spacing cost points");
  if (e.backDefTax > 0) n.push("both starting guards rank bottom-" + e.backDefTier + "% defensively: the perimeter leaks");
  if (e.wingDefTax > 0) n.push("both forwards rank bottom-" + e.wingDefTier + "% defensively: the frontcourt gets attacked");
  if (e.smallGTax > 0) n.push("two small guards: they get posted up and shot over all night");   // v63
  if (e.smallFCTax > 0) n.push("an undersized frontcourt: the other team owns the offensive glass");
  (e.labelRows || []).forEach(function (r) {   // v61: the label taxes and credits
    var line = { iso: "nobody on the roster can guard the other team's best scorer", clutch: "nobody wants the last shot in a close game",
      teamd: "nobody rotates on defense", rimplus: "nobody attacks the rim or gets to the line", tshot: "nobody can make a tough shot when a play breaks down",
      knuck: r.who && r.who.length >= 3 ? "three off-court knuckleheads share a locker room" : "two off-court knuckleheads share a locker room",
      banjo: "two alphas still figuring out how to play together, not just alongside each other: dueling banjos",
      stick: "two players who hold the ball: it goes in and it does not come out", hunted: "two defenders the other team hunts on every switch",
      foul: "two foul merchants living at the line until the playoff whistle disappears", statpad: "stat padding: numbers that do not add up to winning",
      "switch": "three switchable defenders: they switch everything", cut: "a playmaker keeps finding two off-ball scorers cutting to the rim" }[r.id];
    if (line) n.push(line);
  });
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
  if (G.recapPayload) return;   // first writer wins (a Heat Check's post-boost totals beat the plain verdict)
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

// v59.3 (the owner: keep the Tribune, but only at the very bottom of the results, under RUN IT BACK; never a
// gate, in any mode). One tap: the paper unfolds right away and works as always. Opening it is still the deliberate
// act that requests the AI edition and publishes the article link.
function openTribune() {
  if (!G || G.screen !== "results" || MODE === "kaman") return;
  if (!G.recapPayload) {
    var e = engine(G.picks.map(function (p) { return p.row; }), G.picks.map(function (p) { return p.slot; }));
    var hot = typeof G.hotNewNet === "number";
    prepareRecap(e, hot ? G.hotWins : e.winTally, hot ? G.hotNewNet : e.net, null);
  }
  analyticsTrack("feature_select", Object.assign(analyticsRunSnapshot(), { surface: "results", action: "tribune" }));
  showNewspaper(true);
}

function recapChip() {}   // removed: the newspaper is one-and-done now — no reopen chip after dismissal

var NP_TICK_HEAD = ["HOT OFF THE PRESS", "STOP THE PRESSES", "SETTING TYPE", "INK STILL DRYING"];
var NP_TICK_ART = ["REWRITING THE LEDE", "CALLING THE COPY DESK", "TELETYPE INCOMING", "HOLDING PAGE ONE"];

function showNewspaper(unfold) {
  if (!G.recapPayload) return;
  var chip = document.getElementById("npChip"); if (chip) chip.remove();
  if (document.querySelector(".np-overlay")) return;
  var wins = G.recapWins, losses = CFG.GAMES_IN_SEASON - wins;

  var ov = document.createElement("div"); ov.className = "np-overlay";
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
  var skip = document.createElement("button"); skip.type = "button"; skip.className = "presti-spin np-underbtn"; skip.textContent = "BACK TO RESULTS";
  var again = document.createElement("button"); again.type = "button"; again.className = "presti-spin np-underbtn"; again.textContent = "RUN IT BACK";
  under.appendChild(skip); under.appendChild(again);

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
  function close() {
    clearInterval(tickTimer);
    clearTimeout(autoT);
    clearTimeout(openingT);
    clearTimeout(fullReadTimer);
    clearStatusTimers();
    if (ov.parentNode) ov.parentNode.removeChild(ov);
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
  if (unfold && bundle) unwrap(false);   // v59.3: the door at the bottom of the results is the tap; the paper unfolds at once

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

/* ---------- THE REDRAFTED (v55, ported from the accounts-test archive) ----------
   "Class of 2016. Three GMs. One board." A snake draft against two computer
   GMs (MERCER takes the best player alive, QUINCY drafts the team) over one
   shared, exhaustible pool: a real NBA draft class, five players a team, every
   pick exclusive, then the engine projects all three seasons and a podium.
   The owner's to-do: "import redraftables from test archive". Source:
   origin/accounts-test, true82-allclasses2-on-v49.14/app.js (v49.14 plus
   "every class, derived"), the logic unchanged: 9 hand-picked classes plus
   every other year derived from the data (52 in all, 1974 to 2025), PICKUP
   and PRO difficulty, the Hall's-condition strand guard, the rival GMs, the
   verdict on throwaway classic states (no per-game season, no replay, no
   leaderboard). Ported: the screens are rebuilt on the style system (the
   archive's injected CSS and Dynasty's panel skin are gone), the archive's
   Classic difficulty and Dynasty are not ported, and the content fixes: the
   Pavlovic spelling, the 1976 blurb. State is in-memory only; a mid-draft
   reload costs the draft. The engine and the other modes never see it.
   QA: ?redraft=1 opens the gate, ?redraft=2003 opens on that class. */
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
    picks: { "Ben Simmons": 1, "Brandon Ingram": 2, "Jaylen Brown": 3, "Buddy Hield": 6, "Jamal Murray": 7, "Marquese Chriss": 8, "Jakob Poeltl": 9, "Domantas Sabonis": 11, "Taurean Prince": 12, "Malik Beasley": 19, "Caris LeVert": 20, "Pascal Siakam": 27, "Dejounte Murray": 29, "Ivica Zubac": 32, "Malcolm Brogdon": 36 , "Dragan Bender": 4, "Kris Dunn": 5, "Thon Maker": 10, "Denzel Valentine": 14, "Juancho Hernangomez": 15, "Guerschon Yabusele": 16, "DeAndre' Bembry": 21, "Timothe Luwawu-Cabarrot": 24, "Furkan Korkmaz": 26, "Skal Labissiere": 28, "Damian Jones": 30, "Cheick Diallo": 33, "Tyler Ulis": 34, "Patrick McCaw": 38, "Isaiah Whitehead": 42, "Jake Layman": 47, "Georges Niang": 50, "Abdel Nader": 58 },
    /* PRO ONLY: the rest of the class that logged a real season. The 785
       floor does the viability filtering at runtime; a name with no viable
       season simply never appears on the board. */
    deep: ["Dragan Bender", "Kris Dunn", "Thon Maker", "Denzel Valentine", "Juancho Hernangomez|Juancho Hernangómez", "Guerschon Yabusele", "DeAndre' Bembry", "Timothe Luwawu-Cabarrot|Timothé Luwawu-Cabarrot", "Furkan Korkmaz", "Skal Labissiere|Skal Labissière", "Damian Jones", "Cheick Diallo", "Tyler Ulis", "Patrick McCaw", "Isaiah Whitehead", "Jake Layman", "Georges Niang", "Abdel Nader", "Yogi Ferrell", "Danuel House Jr.|Danuel House", "David Nwaba"]
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
    picks: { "Lonzo Ball": 2, "Jayson Tatum": 3, "De'Aaron Fox": 5, "Jonathan Isaac": 6, "Lauri Markkanen": 7, "Zach Collins": 10, "Malik Monk": 11, "Luke Kennard": 12, "Donovan Mitchell": 13, "Bam Adebayo": 14, "John Collins": 19, "Jarrett Allen": 22, "OG Anunoby": 23, "Kyle Kuzma": 27, "Derrick White": 29, "Josh Hart": 30, "Thomas Bryant": 42, "Dillon Brooks": 45, "Monte Morris": 51 , "Markelle Fultz": 1, "Josh Jackson": 4, "Frank Ntilikina": 8, "Dennis Smith Jr.": 9, "Justin Jackson": 15, "Harry Giles": 20, "Terrance Ferguson": 21, "Frank Jackson": 31, "Semi Ojeleye": 37, "Jordan Bell": 38, "Sterling Brown": 46, "Sindarius Thornwell": 48 },
    /* PRO ONLY: the rest of the class that logged a real season. The 785
       floor does the viability filtering at runtime; a name with no viable
       season simply never appears on the board. */
    deep: ["Markelle Fultz", "Josh Jackson", "Frank Ntilikina", "Dennis Smith Jr.", "Justin Jackson", "Harry Giles|Harry Giles III", "Terrance Ferguson", "Frank Jackson", "Semi Ojeleye", "Jordan Bell", "Sterling Brown", "Sindarius Thornwell", "Milos Teodosic|Miloš Teodosić"]
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
    picks: { "Deandre Ayton": 1, "Marvin Bagley III": 2, "Luka Doncic": 3, "Jaren Jackson Jr.": 4, "Trae Young": 5, "Wendell Carter Jr.": 7, "Collin Sexton": 8, "Mikal Bridges": 10, "Shai Gilgeous-Alexander": 11, "Miles Bridges": 12, "Michael Porter Jr.": 14, "Donte DiVincenzo": 17, "Kevin Huerter": 19, "Grayson Allen": 21, "Anfernee Simons": 24, "Robert Williams": 27, "Jalen Brunson": 33, "Mitchell Robinson": 36, "Gary Trent Jr.": 37, "Bruce Brown": 42, "De'Anthony Melton": 46 , "Mo Bamba": 6, "Kevin Knox": 9, "Troy Brown Jr.": 15, "Lonnie Walker IV": 18, "Josh Okogie": 20, "Chandler Hutchison": 22, "Landry Shamet": 26, "Omari Spellman": 30, "Jevon Carter": 32, "Devonte' Graham": 34, "Rodions Kurucs": 40, "Hamidou Diallo": 45, "Svi Mykhailiuk": 47, "Keita Bates-Diop": 48, "Shake Milton": 54 },
    /* PRO ONLY: the rest of the class that logged a real season. The 785
       floor does the viability filtering at runtime; a name with no viable
       season simply never appears on the board. */
    deep: ["Mo Bamba|Mohamed Bamba", "Kevin Knox|Kevin Knox II", "Troy Brown Jr.", "Lonnie Walker IV|Lonnie Walker", "Josh Okogie", "Chandler Hutchison", "Landry Shamet", "Omari Spellman", "Jevon Carter", "Devonte' Graham", "Rodions Kurucs", "Hamidou Diallo", "Svi Mykhailiuk", "Keita Bates-Diop", "Shake Milton", "Duncan Robinson", "Kenrich Williams", "Yuta Watanabe", "Allonzo Trier"]
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
    picks: { "Zion Williamson": 1, "Ja Morant": 2, "RJ Barrett": 3, "De'Andre Hunter": 4, "Darius Garland": 5, "Coby White": 7, "Jaxson Hayes": 8, "Rui Hachimura": 9, "Cam Johnson": 11, "PJ Washington": 12, "Tyler Herro": 13, "Nickeil Alexander-Walker": 17, "Matisse Thybulle": 20, "Brandon Clarke": 21, "Grant Williams": 22, "Jordan Poole": 28, "Keldon Johnson": 29, "Nic Claxton": 31, "Daniel Gafford": 38, "Terance Mann": 48 , "Cam Reddish": 10, "Romeo Langford": 14, "Sekou Doumbouya": 15, "Chuma Okeke": 16, "Goga Bitadze": 18, "Darius Bazley": 23, "Ty Jerome": 24, "Kevin Porter Jr.": 30, "Cody Martin": 36, "Eric Paschall": 41, "Jaylen Nowell": 43, "Bol Bol": 44, "Talen Horton-Tucker": 46 },
    /* PRO ONLY: the rest of the class that logged a real season. The 785
       floor does the viability filtering at runtime; a name with no viable
       season simply never appears on the board. */
    deep: ["Cam Reddish", "Romeo Langford", "Sekou Doumbouya", "Chuma Okeke", "Goga Bitadze", "Darius Bazley", "Ty Jerome", "Kevin Porter Jr.", "Cody Martin", "Eric Paschall", "Jaylen Nowell", "Bol Bol", "Talen Horton-Tucker", "Caleb Martin", "Terence Davis"]
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
    picks: { "Anthony Edwards": 1, "James Wiseman": 2, "LaMelo Ball": 3, "Isaac Okoro": 5, "Onyeka Okongwu": 6, "Obi Toppin": 8, "Deni Avdija": 9, "Devin Vassell": 11, "Tyrese Haliburton": 12, "Aaron Nesmith": 14, "Cole Anthony": 15, "Isaiah Stewart": 16, "Saddiq Bey": 19, "Precious Achiuwa": 20, "Tyrese Maxey": 21, "Immanuel Quickley": 25, "Payton Pritchard": 26, "Jaden McDaniels": 28, "Desmond Bane": 30 , "Patrick Williams": 4, "Killian Hayes": 7, "Kira Lewis Jr.": 13, "Aleksej Pokusevski": 17, "Josh Green": 18, "Zeke Nnaji": 22, "Malachi Flynn": 29, "Theo Maledon": 34, "Xavier Tillman": 35, "Nick Richards": 42, "Jordan Nwora": 45, "Isaiah Joe": 49, "Paul Reed": 58 },
    /* PRO ONLY: the rest of the class that logged a real season. The 785
       floor does the viability filtering at runtime; a name with no viable
       season simply never appears on the board. */
    deep: ["Patrick Williams", "Killian Hayes", "Kira Lewis Jr.|Kira Lewis", "Aleksej Pokusevski", "Josh Green", "Zeke Nnaji", "Malachi Flynn", "Theo Maledon|Théo Maledon", "Xavier Tillman|Xavier Tillman Sr.", "Nick Richards", "Jordan Nwora", "Isaiah Joe", "Paul Reed"]
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
    picks: { "Cade Cunningham": 1, "Jalen Green": 2, "Evan Mobley": 3, "Scottie Barnes": 4, "Jalen Suggs": 5, "Josh Giddey": 6, "Jonathan Kuminga": 7, "Franz Wagner": 8, "Davion Mitchell": 9, "Moses Moody": 14, "Alperen Sengun": 16, "Trey Murphy III": 17, "Jalen Johnson": 20, "Isaiah Jackson": 22, "Quentin Grimes": 25, "Bones Hyland": 26, "Cam Thomas": 27, "Day'Ron Sharpe": 29, "Herbert Jones": 35, "Ayo Dosunmu": 38 , "Ziaire Williams": 10, "James Bouknight": 11, "Chris Duarte": 13, "Corey Kispert": 15, "Tre Mann": 18, "Keon Johnson": 21, "Josh Christopher": 24, "JT Thor": 37, "Neemias Queta": 39, "Aaron Wiggins": 55 },
    /* PRO ONLY: the rest of the class that logged a real season. The 785
       floor does the viability filtering at runtime; a name with no viable
       season simply never appears on the board. */
    deep: ["Ziaire Williams", "James Bouknight", "Chris Duarte", "Corey Kispert", "Tre Mann", "Keon Johnson", "Josh Christopher", "JT Thor", "Neemias Queta", "Aaron Wiggins", "Jose Alvarado|José Alvarado", "Sam Hauser"]
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
    picks: { "Allen Iverson": 1, "Marcus Camby": 2, "Shareef Abdur-Rahim": 3, "Stephon Marbury": 4, "Ray Allen": 5, "Antoine Walker": 6, "Kerry Kittles": 8, "Erick Dampier": 10, "Kobe Bryant": 13, "Peja Stojakovic": 14, "Steve Nash": 15, "Jermaine O'Neal": 17, "Zydrunas Ilgauskas": 20, "Derek Fisher": 24, "Malik Rose": 44 , "Lorenzen Wright": 7, "Samaki Walker": 9, "Vitaly Potapenko": 12, "Tony Delk": 16, "Walter McCarty": 19, "Jerome Williams": 26, "Travis Knight": 29, "Othella Harrington": 30, "Jeff McInnis": 37, "Shandon Anderson": 54 },
    /* PRO ONLY: the rest of the class that logged a real season. The 785
       floor does the viability filtering at runtime; a name with no viable
       season simply never appears on the board. */
    deep: ["Lorenzen Wright", "Samaki Walker", "Vitaly Potapenko", "Tony Delk", "Walter McCarty", "Jerome Williams", "Travis Knight", "Othella Harrington", "Jeff McInnis", "Shandon Anderson", "Moochie Norris", "Chucky Atkins"]
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
    picks: { "LeBron James": 1, "Carmelo Anthony": 3, "Chris Bosh": 4, "Dwyane Wade": 5, "Chris Kaman": 6, "Kirk Hinrich": 7, "T.J. Ford": 8, "Nick Collison": 12, "David West": 18, "Boris Diaw": 21, "Kendrick Perkins": 27, "Leandro Barbosa": 28, "Josh Howard": 29, "Steve Blake": 38, "Zaza Pachulia": 42, "Matt Bonner": 45, "Mo Williams": 47, "Kyle Korver": 51 , "Darko Milicic": 2, "Mike Sweetney": 9, "Jarvis Hayes": 10, "Mickael Pietrus": 11, "Marcus Banks": 13, "Luke Ridnour": 14, "Sasha Pavlovic": 19, "Dahntay Jones": 20, "Travis Outlaw": 23, "Brian Cook": 24, "Carlos Delfino": 25, "Jason Kapono": 31, "Luke Walton": 32, "Willie Green": 41, "Keith Bogans": 43 },
    /* PRO ONLY: the rest of the class that logged a real season. The 785
       floor does the viability filtering at runtime; a name with no viable
       season simply never appears on the board. */
    deep: ["Darko Milicic|Darko Miličić", "Mike Sweetney", "Jarvis Hayes", "Mickael Pietrus|Mickaël Piétrus", "Marcus Banks", "Luke Ridnour", "Sasha Pavlovic|Sasha Pavlovi\u0107", "Dahntay Jones", "Travis Outlaw", "Brian Cook", "Carlos Delfino", "Jason Kapono", "Luke Walton", "Willie Green", "Keith Bogans", "Marquis Daniels"]
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
    picks: { "Blake Griffin": 1, "James Harden": 3, "Tyreke Evans": 4, "Ricky Rubio": 5, "Stephen Curry": 7, "Jordan Hill": 8, "DeMar DeRozan": 9, "Brandon Jennings": 10, "Jrue Holiday": 17, "Ty Lawson": 18, "Jeff Teague": 19, "Darren Collison": 21, "Taj Gibson": 26, "DeMarre Carroll": 27, "DeJuan Blair": 37, "Jodie Meeks": 41, "Patrick Beverley": 42, "Danny Green": 46, "Patty Mills": 55 , "Hasheem Thabeet": 2, "Jonny Flynn": 6, "Terrence Williams": 11, "Gerald Henderson": 12, "Tyler Hansbrough": 13, "Earl Clark": 14, "Austin Daye": 15, "James Johnson": 16, "Omri Casspi": 23, "Byron Mullens": 24, "Rodrigue Beaubois": 25, "Wayne Ellington": 28, "Toney Douglas": 29, "Sam Young": 36, "Jonas Jerebko": 39, "Marcus Thornton": 43, "Chase Budinger": 44, "A.J. Price": 52 },
    /* PRO ONLY: the rest of the class that logged a real season. The 785
       floor does the viability filtering at runtime; a name with no viable
       season simply never appears on the board. */
    deep: ["Hasheem Thabeet", "Jonny Flynn", "Terrence Williams", "Gerald Henderson", "Tyler Hansbrough", "Earl Clark", "Austin Daye", "James Johnson", "Omri Casspi", "Byron Mullens|B.J. Mullens", "Rodrigue Beaubois", "Wayne Ellington", "Toney Douglas", "Sam Young", "Jonas Jerebko", "Marcus Thornton", "Chase Budinger", "A.J. Price", "Garrett Temple"]
  }
};
var SD_CLASS_ORDER = ["2016", "2017", "2018", "2019", "2020", "2021", "1996", "2003", "2009"];

/* ---------- every class, derived from the data itself (ported 2026-09-05) ----
   A player's class is the year before his FIRST season in the dataset
   (seasons are end-years: a June-Y draftee debuts in season Y+1). Cohorts
   are ranked by best eligible season and capped to a compact board. The
   hand-curated classes above stay authoritative for their years, and any
   name in a curated class (short board OR deep tier) is excluded from every
   auto cohort. Derived classes carry no picks map, so the board falls to
   the undrafted peakMp order. PRO extends to the whole eligible cohort
   (capped by SD_PRO_CAP), derived from the data, no authoring needed. */
var SD_ENTRY_OFFSET = 1;
/* SMOKE TEST for the offset: open CLASS OF 1984 and confirm Jordan, Hakeem,
   Barkley, and Stockton headline it. If they sit under 1983 or 1985, the
   season ints are not end-years: adjust this one constant. */
var SD_MIN_COHORT = SD_CFG.rosterSize * 3;   // smaller cohorts never materialize
var SD_COHORT_CAP = 21;                      // compact PICKUP board, per the brief
var SD_PRO_CAP = 50;                         // ceiling on the full PRO board, pathology guard only
/* Famous draft-and-stash and redshirt cases, mapped to their real class.
   Keys are data spellings; diacritic names carry both. A name mapped into a
   hand-curated year is dropped unless that curated list names him. */
var SD_REDSHIRTS = {
  "Larry Bird": 1978,
  "Drazen Petrovic": 1986, "Dra\u017een Petrovi\u0107": 1986,
  "Arvydas Sabonis": 1986,
  "Sarunas Marciulionis": 1987, "\u0160ar\u016bnas Mar\u010diulionis": 1987,
  "Dino Radja": 1989, "Dino Ra\u0111a": 1989,
  "Toni Kukoc": 1990, "Toni Kuko\u010d": 1990,
  "Manu Ginobili": 1999, "Manu Gin\u00f3bili": 1999,
  "Luis Scola": 2002,
  "Tiago Splitter": 2007,
  "Nikola Mirotic": 2011, "Nikola Miroti\u0107": 2011,
  "Joel Embiid": 2014,
  "Nikola Jokic": 2014, "Nikola Joki\u0107": 2014,
  "Dario Saric": 2014, "Dario \u0160ari\u0107": 2014,
  "Bogdan Bogdanovic": 2016, "Bogdan Bogdanovi\u0107": 2016
};
/* Years that deserve a mark on the chip and their own words. */
var SD_SPECIAL = {
  // v55: Erving and Gervin sit in the dropped 1974 floor cohort (the ABA rows start in 1974), so the blurb names who is on this board
  "1976": { cue: "\u2726", blurb: "The merger class. The ABA folds in: Moses Malone and Artis Gilmore arrive with Parish and Dantley." }
};
/* v58 THE FRONT OF THE GATE (owner, 2026-09-26: "For pickup mode we need to feature the most fun drafts up
   top" and "For pro mode we need a featured draft of the day, plus a reason why it's intriguing").
   PICKUP: a shelf of the most fun classes (judgment over the data: the sum of the headliners' peaks, legends
   first, no class whose data files a star under the wrong year), each with its headliners, all on that
   class's PICKUP board (test.js pins it). PRO: one class a day in a fixed rotation from 2026-09-26 (1984 first,
   the famous ones spread out), preselected with its tag; every PRO class shows its real draft's story line
   (SD_DRAFT_WHY) instead of the derived "Headlined by" line, which comes from debut years and can name a
   player the real draft put in another class. The lines are real-life history, never the engine's grades:
   knowing who grades best is the skill PRO tests. Zero em dashes (test.js). */
var SD_PICKUP_FEATURED = [
  { id: "1984", who: "Jordan, Hakeem, Barkley, Stockton" },
  { id: "1996", who: "Kobe, Iverson, Nash, Ray Allen" },
  { id: "2003", who: "LeBron, Wade, Melo, Bosh" },
  { id: "2009", who: "Curry, Harden, Griffin, DeRozan" },
  { id: "2011", who: "Kawhi, Kyrie, Klay, Butler" },
  { id: "2018", who: "Luka, SGA, Trae, Brunson" },
  { id: "1998", who: "Dirk, Vince, Pierce, Rashard" },
  { id: "2014", who: "Jokić, Embiid, LaVine, Smart" }
];
var SD_DOTD_START = "2026-09-26";
var SD_DOTD_ORDER = ["1984", "2014", "1996", "2011", "2003", "1998", "1987", "2018", "1985", "2009", "1979", "1997", "2012",
  "1986", "2008", "1995", "2013", "1992", "2005", "1978", "2016", "1993", "2001", "1999", "2007", "1990", "2017", "1983",
  "2006", "1994", "2020", "1981", "2002", "1976", "2010", "1989", "2015", "1982", "2004", "1988", "2019", "1977", "2021",
  "1991", "2000", "1980", "2022", "1975", "2023", "1974", "2024", "2025"];
var SD_DRAFT_WHY = {
  "1974": "Bill Walton went first and Marvin Barnes second. Bobby Jones, the best defender of his era, went fifth.",
  "1975": "David Thompson went first, then chose the ABA. Gus Williams lasted to 20 and Dan Roundfield to 28.",
  "1976": "The merger year. Alex English went 23rd, Dennis Johnson 29th, and Moses Malone arrives from the ABA with no pick at all.",
  "1977": "Kent Benson went first. Bernard King went seventh and Jack Sikma eighth.",
  "1978": "Boston took Larry Bird sixth, a year before he could play. Mo Cheeks lasted to 36 and Michael Cooper to 60.",
  "1979": "Magic went first and Sidney Moncrief fifth. Bill Laimbeer waited until the 65th pick.",
  "1980": "Boston traded the first pick for Robert Parish and the third, which became Kevin McHale. Joe Barry Carroll went first.",
  "1981": "Mark Aguirre went first and Isiah Thomas second. Larry Nance lasted to 20 and Danny Ainge to 31.",
  "1982": "James Worthy went first and Dominique Wilkins third. Mark Eaton was the 72nd pick.",
  "1983": "Ralph Sampson went first. Clyde Drexler went 14th and Doc Rivers 31st.",
  "1984": "Houston took Hakeem, then Portland took Sam Bowie. Jordan went third, Barkley fifth, Stockton 16th.",
  "1985": "The Knicks won the first lottery and took Patrick Ewing. Karl Malone lasted to 13 and Joe Dumars to 18.",
  "1986": "Len Bias went second and never played. Sabonis went 24th, Mark Price 25th, Dennis Rodman 27th.",
  "1987": "David Robinson went first and served two years in the Navy. Pippen went fifth and Reggie Miller 11th.",
  "1988": "Danny Manning went first and Mitch Richmond fifth. John Starks was never drafted.",
  "1989": "Pervis Ellison went first. Tim Hardaway went 14th, Shawn Kemp 17th, Vlade Divac 26th.",
  "1990": "Derrick Coleman went first and Gary Payton second. Toni Kukoč went 29th and waited three years to come over.",
  "1991": "Larry Johnson went first and Dikembe Mutombo fourth. Darrell Armstrong went undrafted.",
  "1992": "Shaq went first and Alonzo Mourning second. Christian Laettner, the Dream Team's college kid, went third.",
  "1993": "Orlando took Chris Webber first and traded him that night for Penny Hardaway, the third pick.",
  "1994": "Glenn Robinson went first. Jason Kidd and Grant Hill went second and third and shared Rookie of the Year.",
  "1995": "Joe Smith went first. Kevin Garnett went fifth, the first player straight from high school in 20 years.",
  "1996": "Allen Iverson went first. Kobe went 13th, Steve Nash 15th, and Ben Wallace went undrafted.",
  "1997": "Tim Duncan went first. Tracy McGrady went ninth, straight out of high school.",
  "1998": "Michael Olowokandi went first. Vince Carter went fifth, Dirk ninth, Paul Pierce tenth.",
  "1999": "Elton Brand went first. Andrei Kirilenko went 24th and Manu Ginóbili 57th, the second-to-last pick.",
  "2000": "Kenyon Martin went first in a famously thin class. Michael Redd lasted to 43.",
  "2001": "Kwame Brown was the first high schooler taken first. Pau went third, Tony Parker 28th, Gilbert Arenas 31st.",
  "2002": "Yao Ming went first and Amar'e Stoudemire ninth. Carlos Boozer lasted to 35.",
  "2003": "LeBron went first. Detroit took Darko second, ahead of Carmelo, Bosh and Wade.",
  "2004": "Dwight Howard went first, straight from high school. Josh Smith went 17th and Tony Allen 25th.",
  "2005": "Andrew Bogut went first and Chris Paul fourth. Monta Ellis and Lou Williams went in the second round.",
  "2006": "Andrea Bargnani went first and Adam Morrison third. Rondo went 21st, Lowry 24th, Millsap 47th.",
  "2007": "Portland took Greg Oden first. Kevin Durant went second. Marc Gasol went 48th.",
  "2008": "Derrick Rose went first and became the youngest MVP. Westbrook went fourth, Love fifth, DeAndre Jordan 35th.",
  "2009": "Blake Griffin went first and Hasheem Thabeet second. Minnesota took two point guards before Curry went seventh.",
  "2010": "John Wall went first. Paul George went tenth and Hassan Whiteside 33rd.",
  "2011": "Kyrie went first. Kawhi went 15th, Jimmy Butler 30th, and Isaiah Thomas 60th, the very last pick.",
  "2012": "Anthony Davis went first and Damian Lillard sixth. Draymond Green lasted to 35 and Khris Middleton to 39.",
  "2013": "Anthony Bennett went first. Giannis went 15th and Rudy Gobert 27th.",
  "2014": "Andrew Wiggins went first. Joel Embiid went third on a broken foot. Nikola Jokić went 41st.",
  "2015": "Karl-Anthony Towns went first. Kristaps Porziņģis went fourth to boos. Devin Booker went 13th.",
  "2016": "Ben Simmons went first. Domantas Sabonis went 11th. Fred VanVleet and Alex Caruso went undrafted.",
  "2017": "Philadelphia traded up for Markelle Fultz at one. Jayson Tatum went third, Donovan Mitchell 13th, Bam Adebayo 14th.",
  "2018": "Deandre Ayton went first. Luka went third and was traded for Trae Young, the fifth pick. SGA went 11th.",
  "2019": "Zion went first and Ja Morant second. Tyler Herro went 13th.",
  "2020": "Anthony Edwards went first. Tyrese Haliburton went 12th and Tyrese Maxey 21st.",
  "2021": "Cade Cunningham went first and Evan Mobley third. Alperen Şengün went 16th.",
  "2022": "Paolo Banchero went first and Chet Holmgren second. Jalen Williams went 12th and Jalen Duren 13th.",
  "2023": "Victor Wembanyama went first. The Thompson twins went fourth and fifth.",
  "2024": "A French one-two: Zaccharie Risacher first, Alex Sarr second. Stephon Castle went fourth.",
  "2025": "Dallas won the lottery at 1.8 percent and took Cooper Flagg. One season each: pure scouting."
};
// Today's class (device-local date, like the Daily): the rotation's day, modulo its length.
function sdDraftOfDay(key) {
  var k = key || ((window.T82DAILY && T82DAILY.dayKey) ? T82DAILY.dayKey() : null);
  if (!k) { var d = new Date(); k = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function noon(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2], 12).getTime(); }
  var n = Math.round((noon(k) - noon(SD_DOTD_START)) / 86400000), L = SD_DOTD_ORDER.length;
  return SD_DOTD_ORDER[((n % L) + L) % L];
}
var SD_CLASS_PICKED = 0;   // the player (or a ?redraft=YEAR link) chose a class: the featured defaults stop steering
var SD_DERIVED = 0;
function sdCohortPick(ranked) {
  // Top of the cohort by best season, GROWN (never swapped) until it can
  // field three legal teams; null when the whole cohort cannot.
  var take = ranked.slice(0, Math.min(SD_COHORT_CAP, ranked.length));
  var need = {};
  Object.keys(SD_CFG.caps).forEach(function (b) { need[b] = SD_CFG.caps[b] * 3; });
  for (var g = 0; g <= 4; g++) {
    var S = sdHall(need, take.map(function (p) { return p.buckets; }));
    if (!S) return take;
    var added = null;
    for (var i = take.length; i < ranked.length; i++) {
      var cand = ranked[i], hit = false, inTake = false, j;
      for (j = 0; j < take.length; j++) if (take[j] === cand) { inTake = true; break; }
      if (inTake) continue;
      for (j = 0; j < S.length; j++) if (cand.buckets.indexOf(S[j]) !== -1) { hit = true; break; }
      if (hit) { added = cand; break; }
    }
    if (!added) return null;
    take.push(added);
  }
  return null;
}
function sdDeriveClasses() {
  if (SD_DERIVED || !DATA_READY) return;
  SD_DERIVED = 1;
  var curatedNames = {};
  SD_CLASS_ORDER.forEach(function (id) {
    var c = SD_CLASSES[id];
    (c.names.concat(c.deep || [])).forEach(function (e) {
      e.split("|").forEach(function (v) { curatedNames[v] = 1; });
    });
  });
  var info = {}, floor = Infinity;
  POOL_YEARS.forEach(function (cell) {
    cell.forEach(function (rows, name) {
      var rec = info[name];
      if (!rec) { rec = { min: Infinity, best: -Infinity, bk: {} }; info[name] = rec; }
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i], sn = r[IDX.season];
        if (sn < rec.min) rec.min = sn;      // RAW minimum: a 300-minute rookie year still marks entry
        if (sn < floor) floor = sn;
        if (r[IDX.mp] < 785) continue;
        var v = valueOf(r);
        if (v > rec.best) rec.best = v;
        sdRowBuckets(r).forEach(function (b) { rec.bk[b] = 1; });
      }
    });
  });
  var cohorts = {};
  Object.keys(info).forEach(function (name) {
    if (curatedNames[name]) return;          // curated membership wins everywhere
    var rec = info[name];
    if (rec.best === -Infinity) return;      // never an eligible season anywhere
    var y = SD_REDSHIRTS[name] != null ? SD_REDSHIRTS[name] : rec.min - SD_ENTRY_OFFSET;
    if (y <= floor - SD_ENTRY_OFFSET) return; // the floor cohort is "already in the league", not a class
    var yk = String(y);
    if (SD_CLASSES[yk] && !SD_CLASSES[yk].auto) return;   // year is hand-curated and authoritative
    if (!cohorts[yk]) cohorts[yk] = [];
    cohorts[yk].push({ name: name, best: rec.best, buckets: Object.keys(rec.bk) });
  });
  Object.keys(cohorts).forEach(function (yk) {
    var c = cohorts[yk];
    if (c.length < SD_MIN_COHORT) return;
    c.sort(function (a, b) { return b.best - a.best; });
    var picked = sdCohortPick(c);
    if (!picked) return;                     // the whole cohort cannot field the board
    var sp = SD_SPECIAL[yk];
    SD_CLASSES[yk] = {
      label: "CLASS OF " + yk, auto: 1,
      blurb: sp && sp.blurb ? sp.blurb : "Headlined by " + picked[0].name + ", " + picked[1].name + ", and " + picked[2].name + ".",
      names: picked.map(function (p) { return p.name; })
    };
    /* PRO gets the WHOLE eligible cohort: everyone who entered this year and
       ever logged a 785-minute season, the same bar the authored deep tiers
       used. Rides the existing deep merge in sdBuildPool unchanged. */
    var extras = [];
    for (var x = 0; x < c.length && picked.length + extras.length < SD_PRO_CAP; x++) {
      if (picked.indexOf(c[x]) === -1) extras.push(c[x].name);
    }
    if (extras.length) SD_CLASSES[yk].deep = extras;
  });
}
function sdOrderAll() {
  var ys = Object.keys(SD_CLASSES);
  ys.sort(function (a, b) { return (+b) - (+a); });
  return ys;
}
/* v49.10 DIFFICULTY (owner spec, 2026-08-07). PICKUP: the curated short
   board, peak seasons pre-set as the default. PRO: the whole class (deep
   lists join the board), seasons randomized. The intro asks on every entry;
   the draft snapshots its difficulty at sdFresh like it does the class, so
   a mid-flight switch never mutates a live draft. */
var SD_DIFF = null;
/* v49.12 HARDENED DIFFICULTY MEMORY. Two mediums, self-healing: every read
   checks localStorage first, falls back to a one-year cookie, and repairs
   whichever medium is missing the value. Every write hits both and then
   READS BACK, so diffRemember reports whether anything actually stuck
   (private modes and corporate lockdowns fail silently otherwise). Keys are
   per mode; only pickup/pro ever round-trip, anything else reads as null. */
var DIFF_KEYS = { showdown: "t82_redraft_diff_v1" };   // v55: the Redrafted's own (the archive's Classic difficulty was not ported)
function diffCookieRead(key) {
  try { var m = document.cookie.match(new RegExp("(?:^|; )" + key + "=(pickup|pro)")); return m ? m[1] : null; } catch (e) { return null; }
}
function diffCookieWrite(key, val) {
  try { document.cookie = key + "=" + (val || "x") + ";path=/;max-age=" + (val ? 31536000 : 0) + ";SameSite=Lax"; } catch (e) {}
}
function diffLsRead(key) {
  try { var v = localStorage.getItem(key); return (v === "pickup" || v === "pro") ? v : null; } catch (e) { return null; }
}
function diffRemembered(mode) {
  var key = DIFF_KEYS[mode];
  if (!key) return null;
  var ls = diffLsRead(key), ck = diffCookieRead(key);
  var v = ls || ck;
  if (v && !ls) { try { localStorage.setItem(key, v); } catch (e) {} }   // heal LS from the cookie
  if (v && !ck) diffCookieWrite(key, v);                                 // heal the cookie from LS
  return v;
}
function diffRemember(mode, diff, on) {
  var key = DIFF_KEYS[mode];
  if (!key) return false;
  try { if (on && diff) localStorage.setItem(key, diff); else localStorage.removeItem(key); } catch (e) {}
  diffCookieWrite(key, on ? diff : null);
  return on ? diffRemembered(mode) === diff : diffRemembered(mode) === null;
}
function diffStoreUsable() {
  try { localStorage.setItem("t82_probe", "1"); var ok = localStorage.getItem("t82_probe") === "1"; localStorage.removeItem("t82_probe"); if (ok) return true; } catch (e) {}
  diffCookieWrite("t82_probe", "pickup");
  var ck = diffCookieRead("t82_probe") === "pickup";
  diffCookieWrite("t82_probe", null);
  return ck;
}
function sdDiffRemembered() { return diffRemembered("showdown"); }
function sdDiffRemember(diff, on) { return diffRemember("showdown", diff, on); }
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

/* v58 THE REAL DRAFT (PRO). The owner's brief: "PRO board: the full real
   first round in real draft order, plus productive second-rounders and
   undrafted players chosen by AI judgment. Show real pick numbers. ...
   First-rounders with no eligible season can sit greyed out in their slot so
   the order reads true. PICKUP unchanged." redraft-drafts.json holds, per
   class, the real first round in pick order (r1) and the productive later
   picks and undrafted players (x; pick 0 = undrafted). tools/redraft-drafts.py
   builds it from Basketball-Reference's draft history, matched to the player
   data by Basketball-Reference id, so a name two players share never crosses
   (a third number is the height that picks the right one; -1 marks a pick
   with no playable season). Only drafted seasons count: a class-Y board
   offers seasons from Y+1 on. Loaded when the Redrafted opens; if it never
   arrives, PRO falls back to the v55 whole-class board, so a failed fetch
   never kills the mode. */
var REDRAFT_DATA_V = "20260926-realdraft-v58";
var SD_DRAFTS = null;      // { "1984": { r1: [...], x: [...] } } once loaded; false when the fetch failed
var SD_DRAFTS_P = null;
function sdLoadDrafts() {
  if (SD_DRAFTS_P) return SD_DRAFTS_P;
  if (typeof fetch !== "function") { SD_DRAFTS = false; SD_DRAFTS_P = Promise.resolve(); return SD_DRAFTS_P; }
  SD_DRAFTS_P = fetch("/redraft-drafts.json?v=" + REDRAFT_DATA_V)
    .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
    .then(function (d) { SD_DRAFTS = (d && d.c) ? d.c : false; })
    .catch(function () {
      SD_DRAFTS = false;
      try { console.info("[redraft] the real draft data did not load; PRO uses the whole-class board"); } catch (e) {}
    });
  return SD_DRAFTS_P;
}
function sdRealDraft(id, diff) {
  return diff === "pro" && SD_DRAFTS && SD_DRAFTS[id] ? SD_DRAFTS[id] : null;
}
function sdBuildRealPool(id, real) {
  var Y = +id, want = {}, r1max = 0;
  var entries = real.r1.map(function (a) { return { pick: a[0], name: a[1], ht: a[2], r1: 1 }; })
    .concat(real.x.map(function (a) { return { pick: a[0] || null, name: a[1], ht: a[2], r1: 0 }; }));
  entries.forEach(function (en) {
    if (en.r1) r1max = Math.max(r1max, en.pick);
    en.seasons = []; en.seen = {};
    if (en.ht !== -1) (want[en.name] = want[en.name] || []).push(en);
  });
  POOL_YEARS.forEach(function (cell) {
    cell.forEach(function (rows, name) {
      var ens = want[name];
      if (!ens) return;
      for (var k = 0; k < rows.length; k++) {
        var r = rows[k];
        if (r[IDX.mp] < 785 || r[IDX.season] < Y + 1) continue;   // the usual floor, and only seasons after this draft
        for (var e = 0; e < ens.length; e++) {
          var en = ens[e], sk = r[IDX.season] + "|" + r[IDX.team];
          if (en.ht != null && r[IDX.ht] !== en.ht) continue;      // two players, one name: the height says which
          if (en.seen[sk]) continue;
          en.seen[sk] = 1;
          en.seasons.push(r);
        }
      }
    });
  });
  var list = [], ghosts = [], byName = new Map();
  entries.forEach(function (en) {
    if (!en.seasons.length || byName.has(en.name)) {
      if (en.r1) ghosts.push({ pick: en.pick, name: en.name });   // the slot stays, greyed, so the order reads true
      return;
    }
    en.seasons.sort(function (a, b) { return (a[IDX.season] - b[IDX.season]) || cmpName(a, b); });
    var best = en.seasons[0], bset = {}, pm = 0;
    en.seasons.forEach(function (r) {
      if (valueOf(r) > valueOf(best)) best = r;
      sdRowBuckets(r).forEach(function (b) { bset[b] = 1; });
      if ((r[IDX.mp] || 0) > pm) pm = r[IDX.mp] || 0;
    });
    var rec = { name: en.name, seasons: en.seasons, best: best, buckets: Object.keys(bset), peakMp: pm, pick: en.pick, r1: en.r1 };
    list.push(rec);
    byName.set(rec.name, rec);
  });
  return { list: list, byName: byName, missing: [], ghosts: ghosts, real: 1, r1max: r1max };
}
function sdBuildPool() {
  var id = SD_CLASS_ID;
  var diff = (SD && SD.diff) || SD_DIFF || "pro";
  var real = (SD && SD.real === 0) ? null : sdRealDraft(id, diff);   // a live draft keeps the board it started on
  var key = id + "|" + diff + (real ? "|real" : "");
  if (SD_POOLS[key]) return SD_POOLS[key];
  if (real) return (SD_POOLS[key] = sdBuildRealPool(id, real));
  var entries = diff === "pro" && SD_CLASSES[id].deep
    ? SD_CLASSES[id].names.concat(SD_CLASSES[id].deep)
    : SD_CLASSES[id].names;
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
      sdRowBuckets(r).forEach(function (b) { bset[b] = 1; });
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
  if (missing.length) try { console.info("[redraft] " + SD_CLASSES[id].label + " names with no 785-minute season in the data, dropped:", missing.join(", ")); } catch (e) {}
  SD_POOLS[key] = { list: list, byName: byName, missing: missing };
  return SD_POOLS[key];
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
    diff: SD_DIFF || "pro",         // difficulty snapshot, like cls: a live draft never changes rules
    real: sdRealDraft(SD_CLASS_ID, SD_DIFF || "pro") ? 1 : 0,   // v58: which PRO board it started on (the real draft, or the fallback)
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
/* THE REDRAFTED slots by PRIMARY position of the selected season only
   (owner ruling, 2026-08-07): a 23-24 SG-SF is a guard here, full stop.
   Parsed from the row's own position text (bbref lists primary first);
   anything unparseable falls back to the engine's full bucket read, so a
   data oddity widens eligibility instead of stranding a player. This is
   also the app-side half of the slot-laundering fix from the 77-5 case. */
function sdRowBuckets(row) {
  var pv = String((IDX.pos !== undefined ? row[IDX.pos] : (IDX.position !== undefined ? row[IDX.position] : "")) || "");
  var t = pv.split("-")[0].trim().toUpperCase();
  if (t === "PG" || t === "SG" || t.charAt(0) === "G") return ["G"];
  if (t === "SF" || t === "PF" || t.charAt(0) === "F") return ["F"];
  if (t.charAt(0) === "C") return ["C"];
  return rowBuckets(row);
}
function sdPosTag(row) { return sdRowBuckets(row).join("/"); }
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
  return (SD && SD.diff === "pickup") ? rec.best : sdDefaultRow(rec);
}
/* Best season of a player that qualifies at bucket b: the row an AI drafts
   with, and the row the strand-guard credits him for. */
function sdBestRowFor(name, b) {
  var rec = sdBuildPool().byName.get(name);
  if (!rec) return null;
  var best = null;
  rec.seasons.forEach(function (r) {
    if (sdRowBuckets(r).indexOf(b) === -1) return;
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
function sdCurrentGm() { return SD.done || SD.at >= SD.seq.length ? -1 : SD.seq[SD.at]; }
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
    SD.flash = { gi: gi, name: c.name, s: c.row[IDX.season], stolen: stolen, until: Date.now() + 650 };
    sdAdvance();
  }, 850);
}
function sdHumanPick(bucket) {
  var gi = sdCurrentGm();
  if (gi === -1 || SD_GMS[gi].ai || !SD.selected) return;
  var row = sdChosenRow(SD.selected);
  if (!row) return;
  if (sdRowBuckets(row).indexOf(bucket) === -1) { denyTraySd("His " + shortSeason(row[IDX.season]) + " season does not qualify at " + bucket + "."); return; }
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
  var name = SD.selected, rec = sdBuildPool().byName.get(name), pool = sdBuildPool();
  var info = { gi: gi, name: name, season: row[IDX.season], team: row[IDX.team], slot: bucket, ordinal: SD.at + 1, total: SD.seq.length,
    label: SD_CLASSES[SD.cls].label.charAt(0) + SD_CLASSES[SD.cls].label.slice(1).toLowerCase(),
    real: !!pool.real || (rec && rec.pick != null), pick: rec ? rec.pick : null };
  SD.selected = null; SD.flash = null;
  SD.at++;
  if (SD.at < SD.seq.length && SD.seq[SD.at] === gi) {   // the first half of a snake double: land quietly, the show waits for the second
    SD.pendingShow = info;
    SD.landing = { gi: gi, names: [name], until: Date.now() + 700 };
    buzz(15);
    sdAdvance();
    return;
  }
  var picks = SD.pendingShow ? [SD.pendingShow, info] : [info];
  SD.pendingShow = null;
  renderShowdownDraft();   // v58: the board under the show already holds them, so each name has a slot to fly into
  sdPickShow(picks, function () { if (SD && !SD.done) sdAdvance(); });
}
/* ---------- v58 THE PICK IS IN (the owner: "I want when the player lands in your roster, or when you click
   the button, it's like exciting, it's momentous") ----------
   Your pick is draft night, about two seconds, tap anywhere to skip to the landing: the room goes dark over
   a moving neon grid, two spotlights sweep, THE PICK IS IN, then the name slams down and lights like a neon
   sign (a shockwave ring, flashbulbs, pink, aqua and gold confetti, one buzz), the season and the slot, and
   where he really went when the board knows; then the name flies into your roster and the slot punches in.
   Cosmetic only: the pick is applied before the show starts, and only the rival's clock waits for it. A
   rival's pick flashes its slot instead (no overlay), so the board stays quick. */
var SD_SHOW = null;
function sdOrdinal(n) { var t = ["th", "st", "nd", "rd"], v = n % 100; return n + (t[(v - 20) % 10] || t[v] || t[0]); }
/* THE DRAFT CHIME (the owner: "a recognizably 'store brand' version of the nba draft chime ... very reminiscent
   while still being distinct", then "the same number of beats and general ... lyricality (like jingle vibe)").
   The broadcast chime (ESPN's, 2006; the NFL, NBA and WNBA drafts) is ten notes on an electric piano, bright,
   crisp, a clean decay. Ours keeps that shape in our own notes: TEN notes in a singable jingle, three phrases
   (da-da-da, da-da-da, da-da-da-DAAAH: a falling G major arpeggio, its answer a step up on the IV, then a climb
   through the V that lands on the high G), on a DX7-style FM electric piano (a 1:1 body and a 14:1 tine for the
   crack), a soft chord under the last note, a hall. Like the broadcast, the chime comes first and the name
   slams down on its last note, with a soft boom and a crash; then a faint neon hum, a whoosh as the name flies,
   a knock when it lands. Synthesized with Web Audio (no files, nothing borrowed); only ever after the player's
   own tap; mixed with their music where the browser allows (audio session "ambient", which also stays quiet on
   a silenced phone); one tap mutes it (remembered, t82_sound). A skip ramps the rest out and plays the knock. */
var SD_CHIME = [   // [beat, note] in eighths at 0.115s; G5 = 784 Hz. Our notes, the broadcast's ten-note length.
  [0, 1174.66], [1, 987.77], [2, 783.99],          // D6 B5 G5   (da-da-da)
  [4, 1318.51], [5, 1046.50], [6, 880.00],          // E6 C6 A5   (da-da-da)
  [8, 739.99], [9, 880.00], [10, 1174.66], [11, 1567.98]   // F#5 A5 D6 G6 (da-da-da-DAAAH)
];
var SD_CHIME_STEP = 0.115;
var SD_CHIME_LEN = 11 * SD_CHIME_STEP;   // from the first note to the last (the hit lands here)
var SD_AUDIO = null;
function sdSoundOn() { try { return localStorage.getItem("t82_sound") !== "off"; } catch (e) { return true; } }
function sdAudio() {
  if (!sdSoundOn()) return null;
  try { if (navigator.audioSession && navigator.audioSession.type !== "ambient") navigator.audioSession.type = "ambient"; } catch (e) {}
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!SD_AUDIO) { try { SD_AUDIO = new AC(); } catch (e) { return null; } }
  if (SD_AUDIO.state === "suspended") { try { SD_AUDIO.resume(); } catch (e) {} }
  return SD_AUDIO;
}
// The draft header's mute: one tap, remembered; turning it on rings one soft bell so you know it works.
function sdSoundBtnHtml() {
  var on = sdSoundOn();
  return '<button class="t-btn rd-sound" data-kind="text" data-size="sm" id="rdSound" type="button" aria-pressed="' + on + '" aria-label="Draft chime ' +
    (on ? "on" : "off") + '">' + (on ? "\uD83D\uDD0A" : "\uD83D\uDD07") + "</button>";
}
function sdSoundToggle(btn) {
  var on = !sdSoundOn();
  try { localStorage.setItem("t82_sound", on ? "on" : "off"); } catch (e) {}
  if (btn) { btn.outerHTML = sdSoundBtnHtml(); var b2 = el("rdSound"); if (b2) b2.addEventListener("click", function () { sdSoundToggle(this); }); }
  analyticsTrack("showdown_state", { surface: "redraft", action: on ? "sound_on" : "sound_off", mode: "showdown" });
  if (on) {
    var ctx = sdAudio();
    if (ctx) try {
      var t = ctx.currentTime + 0.02, o = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
      o.frequency.value = 1760; m.frequency.value = 3529; mg.gain.setValueAtTime(3000, t); mg.gain.exponentialRampToValueAtTime(90, t + 0.5);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      m.connect(mg); mg.connect(o.frequency); o.connect(g); g.connect(ctx.destination); o.start(t); m.start(t); o.stop(t + 0.75); m.stop(t + 0.75);
    } catch (e) {}
  }
}
function sdNoise(ctx, secs) {
  var n = Math.floor(ctx.sampleRate * secs), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  var src = ctx.createBufferSource(); src.buffer = buf; return src;
}
// Schedules the show's sound from now: the chime ends on the first hit (hits[0], seconds), a boom on every hit,
// the flight at flyAt, the knock at landAt. Returns { skip } to cut it and knock. (ctx: an OfflineAudioContext
// for tools/draft-chime.js, which renders this exact code to a WAV.)
function sdShowSound(hits, flyAt, landAt, ctx) {
  ctx = ctx || sdAudio();
  if (!ctx) return null;
  try {
    var t0 = ctx.currentTime + 0.03, master = ctx.createGain(), comp = ctx.createDynamicsCompressor();
    master.gain.value = 0.6; master.connect(comp); comp.connect(ctx.destination);
    // the hall: one feedback echo through a lowpass, so the last note rings like an arena
    var send = ctx.createGain(), dl = ctx.createDelay(0.6), fb = ctx.createGain(), lp = ctx.createBiquadFilter();
    send.gain.value = 0.3; dl.delayTime.value = 0.14; fb.gain.value = 0.34; lp.type = "lowpass"; lp.frequency.value = 3600;
    send.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(master);
    var env = function (g, t, peak, a, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); };
    // one electric piano note: a 1:1 FM body (the Rhodes bark fading to a sine) and a 14:1 tine (the crack)
    var epiano = function (f, t, dur, vel, wet) {
      var nodes = [];
      [[1, 1.8, dur], [1.003, 1.2, dur * 0.8]].forEach(function (b) {     // two slightly detuned bodies: a chorus
        var c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
        c.frequency.value = f * b[0]; m.frequency.value = f * b[0];
        mg.gain.setValueAtTime(f * b[1], t); mg.gain.exponentialRampToValueAtTime(f * 0.12, t + Math.min(0.9, b[2]));
        env(g, t, vel * (b[0] === 1 ? 1 : 0.5), 0.004, b[2]);
        m.connect(mg); mg.connect(c.frequency); c.connect(g); g.connect(master); if (wet) g.connect(send);
        nodes.push(c, m);
      });
      var tc = ctx.createOscillator(), tm = ctx.createOscillator(), tmg = ctx.createGain(), tg = ctx.createGain();
      tc.frequency.value = f; tm.frequency.value = f * 14;
      tmg.gain.setValueAtTime(f * 3.2, t); tmg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.06);
      env(tg, t, vel * 0.45, 0.002, 0.12);
      tm.connect(tmg); tmg.connect(tc.frequency); tc.connect(tg); tg.connect(master); if (wet) tg.connect(send);
      nodes.push(tc, tm);
      nodes.forEach(function (o) { o.start(t); o.stop(t + dur + 0.1); });
    };
    var start = t0 + hits[0] - SD_CHIME_LEN;          // the chime's last note IS the first hit
    SD_CHIME.forEach(function (n, i) {
      var last = i === SD_CHIME.length - 1, phraseEnd = i === 2 || i === 5;
      epiano(n[1], start + n[0] * SD_CHIME_STEP, last ? 2.2 : phraseEnd ? 0.5 : 0.32, last ? 0.34 : phraseEnd ? 0.27 : 0.24, true);
    });
    var tl = start + SD_CHIME_LEN;
    [392.0, 493.88, 587.33].forEach(function (f) { epiano(f, tl, 1.9, 0.07, true); });   // G major under the last note
    hits.forEach(function (th, k) {
      var ts = t0 + th;
      // a soft boom that drops, and a short crash: weight under the name, not a bang over the chime
      var bo = ctx.createOscillator(), bg = ctx.createGain();
      bo.frequency.setValueAtTime(110, ts); bo.frequency.exponentialRampToValueAtTime(40, ts + 0.3);
      env(bg, ts, k ? 0.45 : 0.6, 0.004, 0.45); bo.connect(bg); bg.connect(master); bo.start(ts); bo.stop(ts + 0.55);
      var cz = sdNoise(ctx, 0.45), cf = ctx.createBiquadFilter(), cg = ctx.createGain();
      cf.type = "highpass"; cf.frequency.value = 5200; env(cg, ts, k ? 0.1 : 0.14, 0.003, 0.34);
      cz.connect(cf); cf.connect(cg); cg.connect(master); cg.connect(send); cz.start(ts); cz.stop(ts + 0.42);
    });
    // the neon catching: a faint hum that stutters with the sign
    var hm = ctx.createOscillator(), hf = ctx.createBiquadFilter(), hg = ctx.createGain(), h = t0 + hits[hits.length - 1] + 0.02;
    hm.type = "sawtooth"; hm.frequency.value = 120; hf.type = "lowpass"; hf.frequency.value = 900;
    hg.gain.setValueAtTime(0.0001, h); hg.gain.linearRampToValueAtTime(0.035, h + 0.02); hg.gain.setValueAtTime(0.006, h + 0.07);
    hg.gain.setValueAtTime(0.03, h + 0.1); hg.gain.setValueAtTime(0.008, h + 0.17); hg.gain.setValueAtTime(0.026, h + 0.2);
    hg.gain.linearRampToValueAtTime(0.0001, h + 0.55);
    hm.connect(hf); hf.connect(hg); hg.connect(master); hm.start(h); hm.stop(h + 0.6);
    // the flight and the landing
    var tf = t0 + flyAt, wz = sdNoise(ctx, 0.45), wf = ctx.createBiquadFilter(), wg = ctx.createGain();
    wf.type = "bandpass"; wf.Q.value = 1.1; wf.frequency.setValueAtTime(2600, tf); wf.frequency.exponentialRampToValueAtTime(420, tf + 0.36);
    env(wg, tf, 0.2, 0.05, 0.32); wz.connect(wf); wf.connect(wg); wg.connect(master); wz.start(tf); wz.stop(tf + 0.42);
    var knock = function (t) {
      var ko = ctx.createOscillator(), kg = ctx.createGain(), out = ctx.createGain();
      out.gain.value = 0.55; out.connect(comp);
      ko.frequency.setValueAtTime(190, t); ko.frequency.exponentialRampToValueAtTime(85, t + 0.12);
      env(kg, t, 0.8, 0.003, 0.16); ko.connect(kg); kg.connect(out); ko.start(t); ko.stop(t + 0.22);
    };
    knock(t0 + landAt);
    return { skip: function () {
      try {
        var n = ctx.currentTime;
        master.gain.cancelScheduledValues(n); master.gain.setValueAtTime(master.gain.value, n); master.gain.linearRampToValueAtTime(0.0001, n + 0.08);
        if (n < t0 + landAt - 0.05) knock(n + 0.02);
      } catch (e) {}
    } };
  } catch (e) { return null; }
}
/* The show. picks: one pick, or both halves of a snake double (the owner: "for double picks at the end of the
   snake draft, do the ceremony animation sound just once after the second player"): THE PICKS ARE IN, both
   names slam in turn, both fly home. */
function sdPickShow(picks, done) {
  if (SD_SHOW) sdPickShowEnd();   // never two at once
  var two = picks.length > 1, last = picks[picks.length - 1];
  // the chime (about 1.3s) plays first; the name slams down on its last note, like the broadcast (a double's
  // second name lands half a second later, with the confetti)
  var land1 = Math.round((SD_CHIME_LEN + 0.03) * 1000);
  // v59.1 (the owner: the home diamonds' energy here): the pick number prints in a riso diamond on the chime's
  // third phrase (d1; a double's second at d2), then the name prints on its last note
  var T = two ? { d1: land1 - 540, s1: land1 - 320, hit1: land1, d2: land1 + 40, s2: land1 + 180, hit: land1 + 500, fly: land1 + 1480, end: land1 + 1880 }
              : { d1: land1 - 540, s1: land1 - 320, hit1: land1, d2: 0, s2: 0, hit: land1, fly: land1 + 1000, end: land1 + 1400 };
  var conf = "", i;
  for (i = 0; i < 28; i++) {   // ink drops (v59.1: round, in the two inks and white), flung and falling
    var a = (i / 28) * Math.PI * 2 + Math.random() * 0.35, r = 95 + Math.random() * 125;
    conf += '<i class="c' + (i % 4) + '" style="--dx:' + Math.round(Math.cos(a) * r) + "px;--dy:" + Math.round(Math.sin(a) * r * 0.75 - 30) +
      "px;--s:" + (5 + Math.round(Math.random() * 9)) + "px;--dl:" + (Math.random() * 0.09).toFixed(2) + 's"></i>';
  }
  var pickHtml = function (info, k) {
    var slotWord = { G: "guard", F: "forward", C: "center" }[info.slot] || info.slot;
    var real = info.real ? (info.pick ? "Real draft: " + sdOrdinal(info.pick) + " pick" : "Real draft: undrafted") : "";
    return '<div class="rdp-pick p' + k + '"><div class="rdp-hit"><h2 class="rdp-name" data-ink="' + esc(info.name) + '">' + esc(info.name) + "</h2></div>" +
      '<p class="rdp-meta">' + esc(shortSeason(info.season) + " " + info.team) + " \u00B7 " + slotWord + "</p>" +
      (real ? '<p class="rdp-real">' + esc(real) + "</p>" : "") + "</div>";
  };
  var ov = document.createElement("div");
  ov.className = "rdp" + (two ? " two" : "");
  ov.setAttribute("role", "status");
  ov.setAttribute("aria-live", "assertive");
  ov.innerHTML =
    '<div class="rdp-floor" aria-hidden="true"></div>' +
    '<div class="rdp-beams" aria-hidden="true"><i class="rdp-beam b1"></i><i class="rdp-beam b2"></i></div>' +
    '<div class="rdp-card">' +
      '<p class="rdp-kick">' + (two ? "The picks are in" : "The pick is in") + "</p>" +
      '<p class="rdp-with">' + (two ? "With the " + sdOrdinal(picks[0].ordinal) + " and " + sdOrdinal(last.ordinal) + " picks"
        : "With the " + sdOrdinal(last.ordinal) + " pick of " + last.total) + " \u00B7 " + esc(last.label) + "</p>" +
      '<div class="rdp-dias" aria-hidden="true">' + picks.map(function (p, k) { return '<span class="rdp-dia k' + (k + 1) + '"><b>' + p.ordinal + "</b></span>"; }).join("") + "</div>" +
      '<div class="rdp-stage"><span class="rdp-ring" aria-hidden="true"></span><span class="rdp-conf" aria-hidden="true">' + conf + "</span>" +
        picks.map(function (p, k) { return pickHtml(p, k + 1); }).join("") + "</div>" +
      '<p class="rdp-skip">Tap to skip</p>' +
    "</div>";
  document.body.appendChild(ov);
  var S = SD_SHOW = { ov: ov, timers: [], done: done, picks: picks, sound: null };
  function at(ms, fn) { S.timers.push(setTimeout(function () { if (SD_SHOW === S) fn(); }, ms)); }
  ov.addEventListener("click", function () { if (SD_SHOW === S) sdPickShowEnd(); });
  void ov.offsetWidth;                  // commit the undarkened first frame so the room visibly goes dark
  ov.classList.add("on");
  if (reducedMotion()) { at(1100, sdPickShowEnd); return; }
  S.sound = sdShowSound(two ? [T.hit1 / 1000, T.hit / 1000] : [T.hit / 1000], T.fly / 1000, T.end / 1000);
  var inkDia = function (k) {   // the diamond stamps and rings like a home-card vote
    ov.classList.add("d" + k);
    var d = ov.querySelector(".rdp-dia.k" + k), card = ov.querySelector(".rdp-card");
    if (d && card) S.timers.push(setTimeout(function () { if (SD_SHOW === S) inkPrint(card, d, "token"); }, 150));
  };
  at(T.d1, function () { inkDia(1); });
  if (two) at(T.d2, function () { inkDia(2); });
  at(T.s1, function () { ov.classList.add("s1"); });
  if (two) at(T.s2, function () { ov.classList.add("s2"); });
  if (two) at(T.hit1, function () { buzz(20); });
  at(T.hit, function () { ov.classList.add("hit"); buzz(35); });
  at(T.fly, function () { sdPickShowFly(S); });
  at(T.end, sdPickShowEnd);
}
// Each name (with its meta dropping away) flies from center stage into his slot on your roster card.
function sdPickShowFly(S) {
  S.ov.classList.add("fly");
  var hits = S.ov.querySelectorAll(".rdp-hit");
  S.picks.forEach(function (info, k) {
    var hit = hits[k], name = hit && hit.querySelector(".rdp-name"), slot = sdLandingSlot(info);
    if (!hit || !name || !slot) return;
    var a = name.getBoundingClientRect(), b = slot.getBoundingClientRect();
    var dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2);
    var sc = Math.max(0.1, Math.min(0.45, b.width / Math.max(1, a.width)));
    hit.style.transform = "translate(" + Math.round(dx) + "px," + Math.round(dy) + "px) scale(" + sc.toFixed(3) + ")";
  });
}
function sdLandingSlot(info) {
  var slots = document.querySelectorAll('.rd-team[data-gi="' + info.gi + '"] .rd-slot[data-name]');
  for (var i = 0; i < slots.length; i++) if (slots[i].getAttribute("data-name") === info.name) return slots[i];
  return null;
}
// The landing: the show clears, the slot (or both) punches in (sdRosterCardHtml reads SD.landing), the rival's clock starts.
function sdPickShowEnd() {
  var S = SD_SHOW;
  if (!S) return;
  SD_SHOW = null;
  S.timers.forEach(clearTimeout);
  if (S.sound) S.sound.skip();
  if (S.ov.parentNode) S.ov.parentNode.removeChild(S.ov);
  if (SD && !SD.done) {
    SD.landing = { gi: S.picks[0].gi, names: S.picks.map(function (p) { return p.name; }), until: Date.now() + 700 };
    buzz(20);
  }
  if (S.done) S.done();
  var landed = document.querySelectorAll(".rd-slot.is-landing");   // v59.1: the landing prints like the pick
  for (var i = 0; i < landed.length; i++) { var card = landed[i].closest(".rd-team"); if (card) inkPrint(card, landed[i], "slot"); }
}
function denyTraySd(msg) {
  var inner = el("rdTray");
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
  var txt = "TRUE 82 \u00B7 DRAFT NIGHT DO-OVER \u00B7 " + SD_CLASSES[SD.cls].label + "\n" +
    lines.join("\n") + "\n" +
    (mine === 0 ? "I won the board." : "I want that draft back.") + "\n" +
    "https://true82.net/";
  analyticsTrack("share_click", { surface: "redraft", action: "podium", mode: "showdown", value: v[0].wins });
  var btn = el("rdShare");
  if (navigator.share) { navigator.share({ text: txt }).catch(function () {}); return; }
  try {
    navigator.clipboard.writeText(txt).then(function () {
      if (btn) { var t = btn.textContent; btn.textContent = "COPIED"; setTimeout(function () { btn.textContent = t; }, 1400); }
    });
  } catch (e) {}
}
/* ---------- rendering (v55: on the style system) ----------
   The archive injected its own CSS (ensureShowdownCss, about 120 color
   literals) and borrowed Dynasty's panel skin. Here every screen is a
   .t-mode root built from the shared pieces: .t-card panels, head("redraft")
   headers, .t-btn actions, .t-chip class picks, the draft's own .pool and
   .player-row, and the fixed .tray. Its layout lives in styles.css under
   "THE REDRAFTED". */
function sdReceiptsHtml(e) {
  if (!e || e.sumSp === undefined) return "";
  var req = (typeof SC !== "undefined" && SC && SC.SPACERS_REQ) || 3;
  var bits = ["shooters " + fmt1(e.sumSp) + " of " + req];
  if (e.spacingBonus > 0) bits.push("spacing +" + fmt1(e.spacingBonus));
  else if (e.spacingTax > 0) bits.push("spacing -" + fmt1(e.spacingTax));
  var dTax = (e.backDefTax || 0) + (e.wingDefTax || 0) + (e.rimDefTax || 0);
  if (dTax > 0) bits.push("defense -" + fmt1(dTax));
  if (e.usageTax > 0) bits.push("one ball -" + fmt1(e.usageTax));   // v63: one ball is the usage tax
  if (e.sizeTax > 0) bits.push("size -" + fmt1(e.sizeTax));
  return '<span class="rd-receipts t-meta">' + bits.join(" \u00B7 ") + "</span>";
}
// One team's column on the draft board: the GM, then five slots (G G F F C).
function sdRosterCardHtml(gi) {
  var gm = SD_GMS[gi], mine = !gm.ai, onClock = sdCurrentGm() === gi && !SD.done;
  var byBucket = { G: [], F: [], C: [] }, fill = { G: 0, F: 0, C: 0 }, slots = "";
  SD.rosters[gi].forEach(function (p) { byBucket[p.slot].push(p); });
  var now = Date.now(), land = SD.landing && SD.landing.gi === gi && now < SD.landing.until ? SD.landing.names : null;
  var fresh = SD.flash && SD.flash.gi === gi && now < (SD.flash.until || 0) ? SD.flash : null;
  Object.keys(SD_CFG.caps).forEach(function (b) {
    for (var i = 0; i < SD_CFG.caps[b]; i++) {
      var p = byBucket[b][fill[b]++], pn = p ? p.row[IDX.name] : null;
      var fx = !p ? "" : land && land.indexOf(pn) >= 0 ? " is-landing" : fresh && pn === fresh.name ? " is-new" + (fresh.stolen ? " is-stolen" : "") : "";
      slots += '<span class="rd-slot' + (p ? " is-filled" : "") + fx + '"' + (p ? ' data-name="' + esc(pn) + '"' : "") + "><b>" + b + "</b>" +
        (p ? '<span class="rd-slot-name">' + esc(bbrefLastName(p.row[IDX.name]) || p.row[IDX.name]) + "</span><i>" + shortSeason(p.row[IDX.season]) + "</i>" : '<span class="rd-slot-name">\u00B7\u00B7\u00B7</span>') +
        "</span>";
    }
  });
  return '<div class="rd-team t-card' + (mine ? " is-you" : "") + (onClock ? " is-clock" : "") + (land ? " is-landed" : "") + '" data-gi="' + gi + '">' +
    '<span class="rd-gm">' + (mine ? "YOU" : gm.name) + "</span>" +
    '<span class="rd-otc">' + (onClock ? "ON THE CLOCK" : "") + "</span>" + slots + "</div>";
}
function sdOrderStripHtml() {
  var total = SD.seq.length, pos = Math.min(SD.at + 1, total), round = Math.floor(Math.min(SD.at, total - 1) / 3) + 1;
  var names = SD.seats.map(function (gi) { return SD_GMS[gi].ai ? SD_GMS[gi].name : "YOU"; }).join(" \u2192 ");
  return '<div class="rd-strip t-meta"><span>PICK ' + pos + " OF " + total + " \u00B7 ROUND " + round + (round % 2 === 0 ? " \u21A9" : "") + "</span>" +
    "<span>" + names + " \u00B7 snake</span></div>";
}
// v58: on the real-draft board every drafted player wears his real pick number.
function sdPickBadgeHtml(p) {
  return p && p.pick != null && sdBuildPool().real ? '<span class="rd-pk t-num" aria-label="Pick ' + p.pick + '">' + p.pick + "</span>" : "";
}
function sdUndraftedTag(p) { return p && p.pick == null && sdBuildPool().real ? " \u00B7 undrafted" : ""; }
function sdBoardRowHtml(p) {
  var gi = sdCurrentGm(), takenBy = SD.taken[p.name];
  if (takenBy != null) {
    var pk = null;
    for (var i = 0; i < SD.log.length; i++) if (SD.log[i].name === p.name) pk = SD.log[i];
    return '<div class="player-row off rd-taken"><span class="pr-top">' + sdPickBadgeHtml(p) + '<span class="pr-name">' + esc(p.name) + "</span>" +
      '<span class="pr-pos">TAKEN \u00B7 ' + (SD_GMS[takenBy].ai ? SD_GMS[takenBy].name : "YOU") + "</span></span>" +
      '<span class="pr-sub">' + (pk ? shortSeason(pk.s) + " at " + pk.slot : "") + "</span></div>";
  }
  var row = sdChosenRow(p.name), humanTurn = gi !== -1 && !SD_GMS[gi].ai;
  var block = humanTurn ? sdPickBlock(p.name, gi) : null, open = humanTurn && !block;
  var sel = SD.selected === p.name && open;
  return '<div class="player-row' + (sel ? " sel" : "") + (open ? "" : " off") + '" role="button" tabindex="0" data-name="' + esc(p.name) + '" aria-pressed="' + sel + '"' +
    (open ? "" : ' aria-disabled="true"' + (block ? ' title="' + esc(block.why) + '"' : "")) + ">" +
    '<span class="pr-top">' + sdPickBadgeHtml(p) + '<span class="pr-name">' + esc(p.name) + "</span>" +
    '<span class="pr-pos">' + sdPosTag(row) + heightTag(row, true) + sdUndraftedTag(p) + (block ? " \u00B7 " + block.tag : "") + "</span></span>" +
    '<span class="pr-sub">' + sdYearControlHtml(p, row) + boardTagsHtml(row, true) + "</span></div>";
}
// A first-round pick with no playable season keeps his slot, greyed, so the order reads true.
var SD_GHOST_WHY = "He never logged a season of 785 minutes, the bar every mode uses, so he cannot be drafted here.";
function sdGhostRowHtml(g) {
  return '<div class="player-row off rd-ghost" aria-disabled="true" title="' + esc(SD_GHOST_WHY) + '">' +
    '<span class="pr-top"><span class="rd-pk t-num" aria-label="Pick ' + g.pick + '">' + g.pick + '</span><span class="pr-name">' + esc(g.name) + "</span>" +
    '<span class="pr-pos">no playable season</span></span></div>';
}
/* The board as rows. PICKUP and the fallback board: the player rows in board
   order. The real draft: the first round in pick order with its greyed slots
   in place, then a divider, then the later picks by pick and the undrafted. */
function sdBoardRowsHtml(pool, avail) {
  if (!pool.real) return avail.map(sdBoardRowHtml).join("");
  var items = avail.map(function (p) { return { p: p, pick: p.pick }; });
  (pool.ghosts || []).forEach(function (g) { items.push({ g: g, pick: g.pick }); });
  items.sort(function (a, b) {
    if (a.pick != null && b.pick != null) return a.pick - b.pick;
    if ((a.pick != null) !== (b.pick != null)) return a.pick != null ? -1 : 1;
    return avail.indexOf(a.p) - avail.indexOf(b.p);     // the undrafted keep the board order (minutes, then name)
  });
  var h = '<div class="rd-divider t-label">First round</div>', later = false;
  items.forEach(function (it) {
    if (!later && (it.pick == null || it.pick > pool.r1max)) {
      later = true;
      h += '<div class="rd-divider t-label">Later picks and undrafted</div>';
    }
    h += it.g ? sdGhostRowHtml(it.g) : sdBoardRowHtml(it.p);
  });
  return h;
}
function sdYearControlHtml(p, row) {
  var curTxt = shortSeason(row[IDX.season]) + " " + esc(row[IDX.team]);
  if (p.seasons.length <= 1) return '<span class="year-face year-fixed">' + curTxt + "</span>";
  var cur = row[IDX.season];
  var opts = p.seasons.map(function (r) {
    var s = r[IDX.season];
    return '<option value="' + s + '"' + (s === cur ? " selected" : "") + ">" + shortSeason(s) + " " + esc(r[IDX.team]) + "</option>";
  }).join("");
  return '<span class="year-wrap"><span class="year-face">' + curTxt + ' <b class="yf-caret">\u25BE</b></span>' +
    '<select class="year-sel" data-name="' + esc(p.name) + '" aria-label="Season for ' + esc(p.name) + '">' + opts + "</select></span>";
}
function sdLastPickHtml() {
  var f = SD.flash;
  return f ? '<span class="rd-last">' + (SD_GMS[f.gi].ai ? SD_GMS[f.gi].name : "YOU") + " took " + esc(f.name) + " " + shortSeason(f.s) +
    (f.stolen ? ' <b class="t-chip" data-size="sm" data-tone="bad">YOUR GUY</b>' : "") + "</span>" : "";
}
function sdTrayHtml() {
  var gi = sdCurrentGm();
  if (gi === -1) return "";
  if (SD_GMS[gi].ai) return '<div class="rd-wait t-meta">' + SD_GMS[gi].name + " is on the clock\u2026" + sdLastPickHtml() + "</div>";
  if (!SD.selected) return '<div class="rd-wait t-meta">Your pick. Tap a player.' + sdLastPickHtml() + "</div>";
  var row = sdChosenRow(SD.selected);
  var btns = Object.keys(SD_CFG.caps).map(function (b) {
    var ok = sdRowBuckets(row).indexOf(b) !== -1 && sdOpenCount(gi, b) > 0 && !sdFeasibleAfter(SD.selected, gi, b);
    return '<button class="t-btn rd-slotbtn" data-slot="' + b + '" type="button"' + (ok ? "" : " disabled") + ' aria-label="Draft him at ' + ({ G: "guard", F: "forward", C: "center" })[b] + '">' + b + "</button>";
  }).join("");
  return '<div class="rd-confirm"><span class="rd-cname t-name">' + esc(SD.selected) + " <i>" + shortSeason(row[IDX.season]) + "</i></span>" +
    '<span class="rd-slotrow">' + btns + "</span></div>";
}
function renderShowdownDraft() {
  document.body.classList.add("drafting");
  document.body.classList.remove("gating");
  var pool = sdBuildPool();
  var avail = sdBoardOrder(pool.list.filter(function (p) { return SD.taken[p.name] == null; }));
  var takenList = SD.log.map(function (l) { return pool.byName.get(l.name); });
  // re-renders keep the board where the thumb left it; v59.3: pinned to the rows in view, so a player leaving the
  // board above them (a rival's pick, yours) never shifts what you are reading
  var oldPool = el("rdPool"), keepTop = oldPool ? oldPool.scrollTop : 0, anchors = oldPool && keepTop > 0 ? sdViewAnchors(oldPool) : [];
  app().innerHTML =
    '<div class="rd-head t-card"><div class="rd-headrow"><span class="rd-headl">' +
      '<button class="t-btn" data-kind="text" data-size="sm" id="rdExit" type="button">\u2039 Exit</button>' + sdSoundBtnHtml() + "</span>" +
      '<span class="rd-mark">\uD83D\uDD01 ' + esc(SD_CLASSES[SD.cls].label) + ' <span class="t-meta">' + (SD.diff === "pickup" ? "PICKUP" : "PRO") + "</span></span></div>" +
      sdOrderStripHtml() +
    "</div>" +
    '<div class="rd-board">' + [0, 1, 2].map(function (k) { return sdRosterCardHtml(SD.seats[k]); }).join("") + "</div>" +
    '<div class="pool rd-pool" id="rdPool">' + sdBoardRowsHtml(pool, avail) +
      (pool.real && takenList.length ? '<div class="rd-divider t-label">Taken</div>' : "") + takenList.map(sdBoardRowHtml).join("") + "</div>" +
    '<div class="tray"><div class="tray-inner" id="rdTray">' + sdTrayHtml() + "</div></div>";
  var poolEl = el("rdPool");
  setTrayVar();
  poolEl.scrollTop = keepTop;
  if (anchors.length) sdKeepAnchors(poolEl, anchors);
  poolEl.addEventListener("click", function (ev) {
    if (ev.target.closest(".year-sel")) return;
    var btn = ev.target.closest(".player-row");
    if (!btn) return;
    if (btn.classList.contains("rd-ghost")) { denyRow(btn, SD_GHOST_WHY); return; }   // a greyed slot: say why, nothing to pick
    var name = btn.getAttribute("data-name");
    if (btn.classList.contains("off")) {
      analyticsTrack("showdown_state", { surface: "redraft", action: "pick_denied", mode: "showdown", player: name || "", source: btn.getAttribute("title") || "taken" });
      denyRow(btn, btn.getAttribute("title") || "");
      return;
    }
    var prev = SD.selected;
    SD.selected = name;
    SD.watch = name;   // if a rival takes this before you do, that is a steal
    sdRepaintRows([prev, name]);   // v59.3: only the rows it touches, never the board
  });
  poolEl.addEventListener("change", function (ev) {
    var s = ev.target;
    if (!s.classList || !s.classList.contains("year-sel")) return;
    var season = parseInt(s.value, 10);
    if (isNaN(season)) return;
    SD.yearByName[s.getAttribute("data-name")] = season;
    analyticsTrack("year_change", { surface: "redraft", player: s.getAttribute("data-name"), season: season, action: "season_menu" });
    sdRepaintRows([s.getAttribute("data-name")]);   // v59.3: that row and the tray only; the board stays put
  });
  el("rdTray").addEventListener("click", function (ev) {
    var b = ev.target.closest(".rd-slotbtn");
    if (b && !b.disabled) sdHumanPick(b.getAttribute("data-slot"));
  });
  el("rdSound").addEventListener("click", function () { sdSoundToggle(this); });
  el("rdExit").addEventListener("click", function () {
    if (SD_TIMER) { clearTimeout(SD_TIMER); SD_TIMER = 0; }
    analyticsTrack("showdown_state", { surface: "redraft", action: "abandon", mode: "showdown", ordinal: SD ? SD.at + 1 : 0 });
    SD = null;
    document.body.classList.remove("drafting");
    renderIntro();
  });
}
/* v59.3 (the owner: "no menu abruptly jumping until a player's fully selected off the board"). Choosing a player or
   his season repaints only the rows it touches and the tray: the board element, its scroll and an open season menu
   stay exactly where they were. A full re-render (a pick takes a player off the board) re-pins the rows in view. */
function sdRepaintRows(names) {
  var pool = el("rdPool"), tray = el("rdTray");
  if (!pool || !tray) { renderShowdownDraft(); return; }
  var byName = sdBuildPool().byName, rows = pool.querySelectorAll(".player-row[data-name]");
  for (var i = 0; i < rows.length; i++) {
    var n = rows[i].getAttribute("data-name"), rec = names.indexOf(n) >= 0 ? byName.get(n) : null;
    if (rec && SD.taken[n] == null) rows[i].outerHTML = sdBoardRowHtml(rec);
  }
  tray.innerHTML = sdTrayHtml();
  setTrayVar();
}
function sdViewAnchors(pool) {   // the first few rows in view, and where each sat
  var top = pool.getBoundingClientRect().top, rows = pool.querySelectorAll(".player-row[data-name]"), out = [];
  for (var i = 0; i < rows.length && out.length < 4; i++) {
    var b = rows[i].getBoundingClientRect();
    if (b.bottom > top + 1) out.push({ name: rows[i].getAttribute("data-name"), dy: b.top - top });
  }
  return out;
}
function sdKeepAnchors(pool, anchors) {   // the first anchor still on the board goes back where it sat
  var top = pool.getBoundingClientRect().top, rows = pool.querySelectorAll(".player-row[data-name]");
  for (var a = 0; a < anchors.length; a++) {
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].getAttribute("data-name") !== anchors[a].name) continue;
      pool.scrollTop += (rows[i].getBoundingClientRect().top - top) - anchors[a].dy;
      return;
    }
  }
}
function renderShowdownResults() {
  document.body.classList.remove("drafting");
  var v = SD.verdict, mine = v.map(function (t) { return t.gi; }).indexOf(0);
  var podium = v.map(function (t, i) {
    var five = t.roster.map(function (p) {
      return '<span class="rd-five-name"><b>' + esc(p.row[IDX.name]) + "</b> <i>" + shortSeason(p.row[IDX.season]) + " " + p.slot + "</i></span>";
    }).join("");
    return '<div class="rd-podium-row t-card' + (t.gi === 0 ? " is-you" : "") + '">' +
      '<span class="rd-rank t-num">' + (i + 1) + "</span>" +
      '<span class="rd-podium-main"><span class="rd-podium-head"><b>' + (t.gi === 0 ? "YOU" : t.name) + "</b> " + t.wins + "\u2013" + t.losses +
        ' <span class="t-meta">net ' + (t.net > 0 ? "+" : "") + t.net + "</span></span>" +
      sdReceiptsHtml(t.e) + '<span class="rd-five">' + five + "</span></span></div>";
  }).join("");
  app().innerHTML =
    '<section class="t-mode rd-results" data-result-section="showdown_verdict">' +
      head("redraft", "\uD83D\uDD01 Draft Night Do-Over \u00B7 " + SD_CLASSES[SD.cls].label.toLowerCase()) +
      '<h1 class="t-title rd-stamp' + (mine === 0 ? " is-win" : "") + '">' + (mine === 0 ? "You win the Do-Over" : v[0].name + " wins the Do-Over") + "</h1>" +
      '<p class="t-small rd-line">' + (v[0].realized ? "Three seasons, played out." : "Three seasons, projected by the engine.") + "</p>" +
      '<div class="rd-podium">' + podium + "</div>" +
      '<button class="t-btn rd-again" data-size="lg" id="rdAgain" type="button">Run it back \u00B7 new seats</button>' +
      '<button class="t-btn rd-share" data-kind="quiet" id="rdShare" type="button">Share the podium</button>' +
      '<button class="t-btn" data-kind="text" id="rdHome" type="button">\u2039 Back</button>' +
    "</section>";
  el("rdAgain").addEventListener("click", function () {
    analyticsTrack("showdown_state", { surface: "redraft", action: "rematch", mode: "showdown" });
    sdStart();
  });
  el("rdShare").addEventListener("click", sdShare);
  el("rdHome").addEventListener("click", function () { SD = null; renderIntro(); });
}
/* ---------- the difficulty screen (v49.10): two courts, one choice ----------
   PICKUP is the blacktop at golden hour, PRO the arena tunnel on draft night.
   The cards carry the theme (styles.css: .rd-diff[data-diff]), so the copy
   stays short. The choice can be remembered (localStorage + a cookie). */
function renderDifficultyScreen(cfg) {
  document.body.classList.remove("drafting");
  document.body.classList.remove("gating");
  var remembered = diffRemembered(cfg.mode), usable = diffStoreUsable();
  function card(k) {
    var c = cfg[k];
    return '<button type="button" class="rd-diff t-card" data-diff="' + k + '">' +
      '<span class="rd-diff-name">' + (k === "pickup" ? "PICKUP" : "PRO") + "</span>" +
      '<span class="rd-diff-sub">' + c.sub + "</span>" +
      '<span class="rd-diff-fine">' + c.fine + "</span>" +
      '<span class="t-chips">' + c.chips.map(function (x) { return '<span class="t-chip" data-size="sm" data-tone="plain">' + x + "</span>"; }).join("") + "</span>" +
    "</button>";
  }
  app().innerHTML =
    '<section class="t-mode rd-diffs">' +
      '<div class="rd-top"><button class="t-btn" data-kind="text" data-size="sm" id="rdBack" type="button">\u2039 Back</button></div>' +
      head("redraft", cfg.eyebrow) +
      '<h1 class="t-title">Difficulty?</h1>' +
      card("pickup") + card("pro") +
      '<label class="rd-remember' + (usable ? "" : " is-off") + '" for="rdRemember">' +
        '<input type="checkbox" id="rdRemember"' + (remembered === null ? "" : " checked") + (usable ? "" : " disabled") + ">" +
        '<span class="rd-box" aria-hidden="true"></span>' +
        '<span class="rd-remember-txt">Remember my choice' + (usable ? "" : ' <i class="t-small">Not available in this browser</i>') + "</span>" +
      "</label>" +
      '<p class="t-small rd-foot">' + cfg.foot + "</p>" +
    "</section>";
  app().querySelectorAll(".rd-diff").forEach(function (b) {
    b.addEventListener("click", function () {
      var diff = b.getAttribute("data-diff"), box = el("rdRemember"), wanted = !!(box && box.checked);
      var stuck = diffRemember(cfg.mode, diff, wanted);
      analyticsTrack("difficulty_select", { surface: cfg.surface, mode: cfg.mode, action: "select",
        outcome: diff, value: wanted ? 1 : 0, source: wanted ? (stuck ? "stored" : "store_failed") : "session" });
      buzz(10);
      cfg.onPick(diff);
    });
  });
  el("rdBack").addEventListener("click", cfg.onBack);
}
function renderShowdownDifficulty() {
  renderDifficultyScreen({
    mode: "showdown", surface: "redraft_gate",
    eyebrow: "\uD83D\uDD01 Draft Night Do-Over",
    pickup: { sub: "Peak seasons of the best players.",
              fine: "Roll up. Everyone arrives in their prime. The short board.",
              chips: ["The headliners", "Peaks pre-set"] },
    pro: { sub: "The real draft, pick by pick.",
           fine: "The whole first round in its real order, busts included, then the steals from later rounds and the undrafted. Seasons come randomized. Prove you know.",
           chips: ["Real draft order", "Seasons randomized"] },
    foot: "Change it any time from the class gate.",
    onPick: function (diff) { SD_DIFF = diff; renderShowdownGate(); },
    onBack: function () { renderIntro(); }
  });
}
// v58: one featured row: the class's year, then its headliners (PICKUP) or its story (PRO's draft of the day)
function sdFeatRowHtml(id, line) {
  var on = id === SD_CLASS_ID;
  return '<button class="rd-feat' + (on ? " is-on" : "") + '" data-cls="' + id + '" type="button" aria-pressed="' + on + '">' +
    '<b class="rd-feat-yr">\u2019' + id.slice(2) + '</b><span class="rd-feat-line">' + esc(line) + "</span></button>";
}
/* ---------- the class gate: pick a class, read the stakes, draft ---------- */
function renderShowdownGate(silent) {
  if (SD_DIFF == null) { renderShowdownDifficulty(); return; }
  document.body.classList.remove("drafting");
  document.body.classList.remove("gating");
  sdDeriveClasses();
  if (SD_QA.cls && !SD_QA.used && SD_CLASSES[SD_QA.cls]) { SD_CLASS_ID = SD_QA.cls; SD_QA.used = 1; SD_CLASS_PICKED = 1; }
  // v58: until the player picks, PRO opens on the draft of the day and PICKUP on the most fun draft
  var isPro = SD_DIFF === "pro", dotd = sdDraftOfDay();
  if (!SD_CLASS_PICKED) {
    var want = isPro ? dotd : SD_PICKUP_FEATURED[0].id;
    if (SD_CLASSES[want]) SD_CLASS_ID = want;
  }
  var cls = SD_CLASSES[SD_CLASS_ID];
  var why = isPro ? SD_DRAFT_WHY[SD_CLASS_ID] : "";   // PRO tells the real draft's story (the derived blurb reads debut years)
  var dayTag = isPro && SD_CLASS_ID === dotd
    ? '<p class="rd-dotd t-label">\u2605 Draft of the day' + (window.T82DAILY ? " \u00B7 " + esc(dailyDayLabel(T82DAILY.dayKey())) : "") + "</p>" : "";
  var ready = DATA_READY ? sdBuildPool() : null;
  var thin = ready && ready.list.length < SD_CFG.rosterSize * 3;
  var stuck = ready && !thin ? sdClassViable(ready) : null;
  var order = SD_DERIVED ? sdOrderAll() : SD_CLASS_ORDER.slice();
  var decades = [], byDec = {};
  order.forEach(function (id) {
    var d = Math.floor((+id) / 10) * 10;
    if (!byDec[d]) { byDec[d] = []; decades.push(d); }
    byDec[d].push(id);
  });
  decades.sort(function (a, b) { return b - a; });
  var chips = decades.map(function (d) {
    var row = byDec[d].sort(function (a, b) { return (+b) - (+a); }).map(function (id) {
      var sp = SD_SPECIAL[id];
      return '<button class="t-chip rd-cls" data-tone="' + (id === SD_CLASS_ID ? "on" : "plain") + '" data-cls="' + id + '" type="button" aria-pressed="' + (id === SD_CLASS_ID) + '">\u2019' + id.slice(2) +
        (sp && sp.cue ? '<i class="rd-cue">' + sp.cue + "</i>" : "") + "</button>";
    }).join("");
    return '<div class="rd-decade"><span class="t-label">' + d + 's</span><div class="t-chips">' + row + "</div></div>";
  }).join("");
  var feats;
  if (isPro) {
    feats = SD_CLASSES[dotd] ? '<div class="rd-feats">' + '<span class="t-label rd-feats-h">\u2605 Draft of the day</span>' +
      sdFeatRowHtml(dotd, SD_DRAFT_WHY[dotd] || SD_CLASSES[dotd].blurb) + "</div>" : "";
  } else {
    feats = '<div class="rd-feats"><span class="t-label rd-feats-h">Most fun drafts</span>' +
      SD_PICKUP_FEATURED.filter(function (f) { return SD_CLASSES[f.id]; }).map(function (f) { return sdFeatRowHtml(f.id, f.who); }).join("") + "</div>";
  }
  var posNames = { G: "guards", F: "forwards", C: "centers" }, tail;
  if (thin) tail = '<p class="t-small rd-warn">This class came up short against the data (' + ready.list.length + " players). Pick another class.</p>";
  else if (stuck) tail = '<p class="t-small rd-warn">This class cannot field three legal teams: the data is short on ' + stuck.map(function (b) { return posNames[b]; }).join(" and ") + ". Pick another class.</p>";
  else tail = '<p class="t-meta rd-resolved">' + (ready ? ready.list.length + " players on the board" : "More classes arrive with the player data\u2026") + "</p>" +
    '<button class="t-btn rd-go" data-size="lg" id="rdGo" type="button">Draft the class</button>';
  app().innerHTML =
    '<section class="t-mode rd-gate">' +
      '<div class="rd-top"><button class="t-btn" data-kind="text" data-size="sm" id="rdBack" type="button">\u2039 Back</button>' +
        '<button class="t-btn" data-kind="quiet" data-size="sm" id="rdDiffPill" type="button">' + (SD_DIFF === "pickup" ? "Pickup" : "Pro") + " \u00B7 change</button></div>" +
      '<div class="t-card rd-card">' +
        head("redraft", "\uD83D\uDD01 Draft Night Do-Over \u00B7 alpha") + dayTag +
        '<h1 class="t-title rd-title">' + cls.label.charAt(0) + cls.label.slice(1).toLowerCase() + ". Three GMs. One board.</h1>" +
        '<p class="t-body rd-blurb"><b>' + esc(why || cls.blurb) + "</b></p>" +
        tail +
        '<p class="t-small rd-how">A snake draft against two rival GMs over one shared pool. Five each, any season of their careers, every pick exclusive. MERCER drafts the best player alive, every pick. QUINCY drafts the team. Then the engine scores all three and settles it.</p>' +
      "</div>" +
      '<div class="t-card rd-card rd-picker" id="rdPicker">' + head("redraft", "Pick a class") + feats + '<div id="rdChips" class="rd-decades">' + chips + "</div></div>" +
    "</section>";
  if (!silent) analyticsTrack("mode_impression", { surface: "redraft_gate", action: thin ? "thin_pool" : (stuck ? "unfieldable" : "fresh"), mode: "showdown", season: +SD_CLASS_ID });
  // when the data lands, refresh the picker with the derived classes, but only if this gate is still on screen
  if (!DATA_READY) PENDING_FN = function () { if (el("rdChips")) renderShowdownGate(true); };
  el("rdDiffPill").addEventListener("click", function () { SD_DIFF = null; renderShowdownGate(); });
  el("rdPicker").addEventListener("click", function (ev) {
    var b = ev.target.closest(".rd-cls, .rd-feat");
    if (!b) return;
    var id = b.getAttribute("data-cls");
    if (!SD_CLASSES[id]) return;
    SD_CLASS_PICKED = 1;
    if (id === SD_CLASS_ID) { try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { window.scrollTo(0, 0); } return; }
    SD_CLASS_ID = id;
    analyticsTrack("showdown_state", { surface: "redraft_gate", action: "class_select", mode: "showdown", season: +id,
      source: b.classList.contains("rd-feat") ? (isPro ? "draft_of_day" : "featured") : "chip" });
    renderShowdownGate(true);
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { window.scrollTo(0, 0); }   // the new class and DRAFT sit at the top
  });
  var go = el("rdGo");
  if (go) go.addEventListener("click", function () {
    if (DATA_READY) { sdStart(); return; }
    PENDING_FN = sdStart;   // the same queue contract as the Daily's launch
    go.disabled = true; go.textContent = "Loading players\u2026";
  });
  el("rdBack").addEventListener("click", function () { renderIntro(); });
}
function sdStart() {
  if ((SD_DIFF || "pro") === "pro" && SD_DRAFTS === null) {   // v58: the real draft is still on its way; wait (a failed fetch falls back)
    var go = el("rdGo");
    if (go) { go.disabled = true; go.textContent = "Loading the draft\u2026"; }
    sdLoadDrafts().then(function () { if (el("rdGo")) sdStart(); });
    return;
  }
  sdDeriveClasses();
  var pool = sdBuildPool();
  if (pool.list.length < SD_CFG.rosterSize * 3 || sdClassViable(pool)) { renderShowdownGate(); return; }
  SD = sdFresh();
  analyticsTrack("showdown_state", {
    surface: "redraft", action: "start", mode: "showdown", season: +SD.cls,
    source: SD.seats.map(function (gi) { return SD_GMS[gi].name; }).join(">"), amount: pool.list.length
  });
  sdAdvance();
}
// The home door and the deep link (?redraft=1, or ?redraft=YEAR to open on that class) both land here.
function openRedrafted(via) {
  analyticsTrack("mode_select", { mode: "showdown", surface: via || "home", action: "redraft" });
  SD_DIFF = sdDiffRemembered();
  renderShowdownGate();
  // v58: fetch the real draft now; when it lands, a PRO gate still on screen recounts its board
  sdLoadDrafts().then(function () { if (el("rdChips") && SD_DIFF === "pro" && !SD) renderShowdownGate(true); });
}

function showResults() {
  if (LABELS_STATE === "loading") { whenLabels(showResults); return; }   // v61: score with the tags every phone scores with
  G.screen = "results";
  document.body.classList.remove("has-pick");   // the draft is over: nothing is selected (the reel and results never carry it)
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
  if ((MODE === "classic" || MODE === "cap") && !G.social && !G.ch && window.T82 && T82.simSeason) {
    T82.armSeasonSim(G);
    var season = T82.simSeason(G, e);
    e.expWins = e.winTally;
    e.winTally = season.wins;
    e.season = season;
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
    showSeasonReel(season, e, function () { finishRunTail(e); }, midTrigger);
    return;
  }
  finishRunTail(e);
}
function finishRunTail(e) {
  renderResults(e, false);
  if (G.hotMid) applyMidBoostToResults(e);
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
   82 realized games in seven month acts, auto-advancing with one line of
   desk commentary per act. No per-month button (the lab finding: bounded
   closure beats, delivered, not requested). One SKIP for repeat players;
   tapping the card skips too. The reel is also the preload window: the
   bbref map loads behind it. Cities are cosmetic, seed-hashed, never the
   rng stream. Copy law: zero em-dashes. */
var REEL_MONTHS = [["OCT", 5], ["NOV", 15], ["DEC", 15], ["JAN", 15], ["FEB", 11], ["MAR", 15], ["APR", 6]];
/* v51 REEL PACING (owner, 2026-09-25): every season plays out in the same time, so the
   reel's length never spoils the record. reelNaturalMs() walks the natural schedule (each
   month's lead, one tick per game, each loss's hold from reel-riso.js); showSeasonReel
   scales every wait by one factor so the finale always lands at REEL_END_MS. The target is
   the slowest of the 78-82-win seasons (78-4 with its first loss ending a streak), so those
   all play at the natural, slowest pace and worse seasons run faster. The red flash keeps its
   own speed limit in reel-riso.js, so a compressed bad season never flashes faster than
   before. QA: ?reelms=<ms> tries another end time. */
var REEL_END_MS = 16800;
var REEL_TICK = 48, REEL_LEAD0 = 650, REEL_LEAD = 960, REEL_OPEN = 140, REEL_CLOSE = 120, REEL_FIN = 640;
function reelNaturalMs(games, holdFn) {
  var t = 0, gi = 0, cl = 0, streak = 0;
  for (var mi = 0; mi < REEL_MONTHS.length; mi++) {
    t += (mi === 0 ? REEL_LEAD0 : REEL_LEAD) + REEL_OPEN;
    for (var k = 0; k < REEL_MONTHS[mi][1] && gi < games.length; k++, gi++) {
      var hold = 0;
      if (games[gi]) streak++;
      else { cl++; hold = holdFn ? holdFn(cl, streak) : 0; streak = 0; }
      t += (k === REEL_MONTHS[mi][1] - 1 ? 0 : REEL_TICK) + hold;   // a month's last square hands straight to the next lead
    }
  }
  return t + REEL_FIN;
}
function reelEndMs() {
  var m = typeof location !== "undefined" && /[?&]reelms=(\d{4,6})(&|$)/.exec(location.search || "");
  return m ? +m[1] : REEL_END_MS;
}
function reelPace(games, holdFn, endMs) {
  var nat = reelNaturalMs(games, holdFn);
  return nat > 0 ? Math.max(0.3, Math.min(2.5, (endMs || REEL_END_MS) / nat)) : 1;
}
var REEL_CITIES = ["Atlanta", "Boston", "Brooklyn", "Charlotte", "Chicago", "Cleveland", "Dallas", "Denver",
  "Detroit", "Golden State", "Houston", "Indiana", "Los Angeles", "Memphis", "Miami", "Milwaukee",
  "Minnesota", "New Orleans", "New York", "Oklahoma City", "Orlando", "Philadelphia", "Phoenix",
  "Portland", "Sacramento", "San Antonio", "Toronto", "Utah", "Washington"];
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
function reelCity(gameIdx) {
  return REEL_CITIES[reelHash(String(G.seed || "x") + "|" + gameIdx) % REEL_CITIES.length];
}
function reelBlame(mi) {
  var pk = G.picks[reelHash(String(G.seed || "x") + "b" + mi) % G.picks.length];
  var nm = bbrefLastName(pk.row[IDX.name]) || pk.row[IDX.name];
  var T = ["missed a buzzer beater", "no-showed", "had a flu game", "shot 4 for 19",
    "left his legs at the hotel", "got cooked on every switch", "airballed the game winner",
    "argued with the ref instead of getting back", "picked up two fouls in the first minute",
    "dribbled it off his foot with the game on the line", "got baited into a fourth-quarter tech",
    "bricked six free throws", "fell for every pump fake", "jogged back in transition all night",
    "threw the inbound to the wrong jersey", "forced a heat check down two",
    "lost his man on the last possession", "ate a poster and never recovered",
    "played matador defense in crunch time", "goaltended the dagger"];
  return { who: nm, what: T[reelHash(String(G.seed || "x") + "t" + mi) % T.length] };
}
function reelBlameHtml(mi) {
  var b = reelBlame(mi);
  return '<b class="reel-blame">' + esc(b.who) + "</b> " + esc(b.what) + ".";
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
      // v51: the name and CATCHES FIRE each hold together, so a long name wraps cleanly into two lines
      v.innerHTML = '<div class="hh-stamp"><span class="hh-nw">' + esc(shareSurname(G.picks[hotIdx].row[IDX.name]).toUpperCase()) + '</span> <span class="hh-nw">CATCHES FIRE</span></div>' +
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
    var strip = ov.querySelector("#hhmStrip"), endY = -((targetFlat - 1) * ITEM), landed = false;
    function land() {
      if (!ov.parentNode) return;
      landed = true;
      // v51: snap onto the chosen name (the glide's frame can run after this timer in a throttled tab)
      strip.style.transition = "none"; strip.style.transform = "translateY(" + endY + "px)";
      var rows = strip.querySelectorAll(".hh-name");
      if (rows[targetFlat]) rows[targetFlat].classList.add("hot");
      buzz(18);
      setTimeout(heat, 470);
    }
    function glide(to, dur, ease) { if (landed) return; strip.style.transition = "transform " + dur + "s " + ease; strip.style.transform = "translateY(" + to + "px)"; }
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
    '<div class="reel-head">' + head("reel", "The season \u00B7 game by game", { tag: "span", cls: "reel-eyebrow" }) +
    '<span class="reel-run mono" id="reelRun">0\u20130</span>' +
    '<button class="reel-skip mono t-btn" data-kind="quiet" data-size="sm" id="reelSkip" type="button">SKIP \u2192</button></div>' +
    '<div class="reel-acts" id="reelActs"></div></div>';
  document.body.appendChild(ov);
  var acts = ov.querySelector("#reelActs"), runEl = ov.querySelector("#reelRun");
  var finished = false, timers = [];
  // v48 RISO REEL: reel-riso.js prints the season as a risograph ledger:
  // stamped coins for wins, and for every loss a hard stop, a hit to the card
  // and a slow-draining L. Cosmetic only: it never touches season.games, and
  // any throw drops back to the W/L chips below (QA: ?riso=0 forces chips).
  var riso = null, ff = false, winRun = 0, lossRun = 0;
  function risoOff(err) { riso = null; if (typeof console !== "undefined" && console.warn) console.warn("[t82] riso reel off:", err); }
  try { if (window.T82RISO && T82RISO.create) riso = T82RISO.create(ov, season); } catch (err) { risoOff(err); }
  function risoCall(fn) { if (!riso) return 0; try { return fn() || 0; } catch (err) { risoOff(err); return 0; } }
  // v51: one pace for the whole season, so every record finishes at the same moment (see REEL_END_MS)
  var PACE = reelPace(season.games, riso && window.T82RISO ? T82RISO.holdFor : null, reelEndMs());
  // v47.15: the reel is now a cursor engine instead of a pre-scheduled cascade,
  // so it can pause on the exact square where the Mid-Season Heat Check
  // fires and resume onto a re-rolled remainder. Month W-L headers tick live
  // square by square (they used to print the month's final line up front,
  // which both spoiled the month and could not survive a re-roll).
  var gi = 0, cw = 0, clx = 0;
  var mi = -1, monthLeft = 0, monthW = 0, monthL = 0, monthStart = 0, row = null, recEl = null;
  var triggerIdx = -1, overlayUp = false;
  if (midTrigger) { for (var g0 = 0; g0 < season.games.length; g0++) { if (!season.games[g0]) { triggerIdx = g0; break; } } }
  var midDone = (triggerIdx < 0);

  function schedule(fn, ms) { timers.push(setTimeout(fn, ms)); }

  function finishReel() {
    if (finished) return;
    if (overlayUp) return;                                    // the Heat Check owns the moment
    if (!midDone && triggerIdx >= 0) { fastForwardToPause(); return; }   // SKIP cannot dodge the spin
    finished = true;
    timers.forEach(clearTimeout);
    if (riso) { try { riso.destroy(); } catch (err) { /* cosmetic */ } }
    ov.remove();
    done();
  }
  ov.querySelector("#reelSkip").addEventListener("click", function (ev) { ev.stopPropagation(); finishReel(); });

  function openMonth() {
    mi++;
    monthStart = gi; monthW = 0; monthL = 0; monthLeft = REEL_MONTHS[mi][1];
    row = document.createElement("div");
    row.className = "reel-act";
    row.innerHTML = '<div class="reel-mo-line"><span class="reel-mo">' + REEL_MONTHS[mi][0] + '</span>' +
      '<span class="reel-mo-rec mono">0\u20130</span></div>' +
      '<div class="reel-grid"></div>' +
      '<p class="reel-note reel-note-pending"></p>';
    row.__grid = row.querySelector(".reel-grid");
    recEl = row.querySelector(".reel-mo-rec");
    acts.appendChild(row);
    risoCall(function () { return riso.openMonth(row, mi, REEL_MONTHS[mi][1]); });
    acts.scrollTop = acts.scrollHeight;
  }
  function closeMonth() {
    if (!row || row.__closed) return;
    row.__closed = true;
    var note = row.querySelector(".reel-note");
    // v59.3 (the owner): the gap under the month's games carries the SWEPT stamp on a sweep, or one of the losses
    // pinned on one of your five; the mood lines are gone
    note.innerHTML = monthL === 0 && monthW > 0 ? '<span class="riso-swept mono">SWEPT</span>' : reelBlameHtml(mi);
    note.classList.remove("reel-note-pending");
    risoCall(function () { return riso.closeMonth(row, mi, monthW, monthL); });
    acts.scrollTop = acts.scrollHeight;
  }
  function placeSquare() {
    var win = season.games[gi], prevStreak = winRun, hold = 0;
    if (win) { cw++; monthW++; winRun++; lossRun = 0; } else { clx++; monthL++; lossRun++; winRun = 0; }
    runEl.textContent = cw + "\u2013" + clx;
    recEl.textContent = monthW + "\u2013" + monthL;
    if (riso) {
      var info = { gi: gi, cw: cw, cl: clx, streak: winRun, prevStreak: prevStreak, lossRun: lossRun,
        city: reelCity(gi), date: reelDate(gi), instant: ff, pace: PACE };
      hold = risoCall(function () { return riso.stamp(row, gi - monthStart, !!win, info); });
    }
    if (!riso) {
      var sq = document.createElement("span");
      sq.className = "reel-day " + (win ? "w" : "l");
      sq.textContent = win ? "W" : "L";
      row.__grid.appendChild(sq);
    }
    gi++; monthLeft--;
    return ff ? 0 : hold;                                     // a loss holds the cursor (riso only)
  }

  function advance() {
    if (finished) return;
    if (gi >= season.games.length) { schedule(closeMonth, REEL_CLOSE * PACE); schedule(finale, REEL_FIN * PACE); return; }
    var lead = ((mi < 0) ? REEL_LEAD0 : REEL_LEAD) * PACE;
    if (mi >= 0) schedule(closeMonth, REEL_CLOSE * PACE);
    schedule(function () { openMonth(); schedule(tick, REEL_OPEN * PACE); }, lead);
  }
  function tick() {
    if (finished) return;
    if (!midDone && gi === triggerIdx) { firePause(); return; }
    var hold = placeSquare();
    if (monthLeft === 0) { if (hold) schedule(advance, hold); else advance(); }
    else schedule(tick, REEL_TICK * PACE + hold);
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
    ff = true;
    while (gi < triggerIdx) {
      if (mi < 0 || monthLeft === 0) { closeMonth(); openMonth(); }
      placeSquare();
    }
    ff = false;
    if (mi < 0 || monthLeft === 0) { closeMonth(); openMonth(); }
    acts.scrollTop = acts.scrollHeight;
    firePause();
  }

  function finale() {
    if (finished) return;
    var fin = document.createElement("div");
    fin.className = "reel-final";
    fin.innerHTML = '<span class="reel-final-rec">' + season.wins + '\u2013' + season.losses + '</span>' +
      '<p class="reel-note">' + (season.losses === 0 ? "Eighty two and zero. Say it out loud." : "The verdict is in.") + '</p>' +
      '<button class="reel-done t-btn" id="reelDone" type="button">SEE THE FULL RESULTS \u2192</button>';
    acts.appendChild(fin);
    risoCall(function () { return riso.finale(fin, season); });
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
/* ---------- v50 THE RESULTS PRINT ----------
   results-riso.js prints THE SHAPE OF A SEASON over the plain record. This
   glue owns the spec (the realized games when there are any, else the
   projected slope), the reveal once the page is actually in view (never
   under the Tribune or the Heat Check), the 81 to 82 Heat Check save, and
   the share poster, baked quietly after the page settles so the share tap
   never waits on it. Everything fails soft to the typographic record. */
var RESULTS_PRINT = null, RESULTS_POSTER = null, RESULTS_PRINT_SPEC = null, RESULTS_PRINT_OFF = false;
var RESULTS_PRINT_HOLDS = null, RESULTS_PRINT_SHOWN = false;   // v51: the spec the on-page print holds; has it printed in yet
function printCall(fn) {
  if (RESULTS_PRINT_OFF) return null;
  try { return fn(); } catch (err) {
    RESULTS_PRINT_OFF = true;
    if (typeof console !== "undefined" && console.warn) console.warn("[t82] results print off:", err);
    return null;
  }
}
function resultsPrintSpec(e, daily, winsNow) {
  var games = e.season && e.season.games && e.season.games.length === CFG.GAMES_IN_SEASON
    ? e.season.games.map(function (g) { return g ? 1 : 0; }) : null;
  var wins = typeof winsNow === "number" ? winsNow : e.winTally, saved = null;
  if (games) {
    var have = games.reduce(function (a, g) { return a + g; }, 0);
    for (var k = games.length - 1; have < wins && k >= 0; k--) {   // a Heat Check save flips the loss it rescued
      if (!games[k]) { games[k] = 1; have++; saved = k; }
    }
  }
  var picks = picksInSlotOrder();
  var names = picks.map(function (en) { return "'" + String(en.p.row[IDX.season]).slice(-2) + " " + ballotSurname(en.p.row[IDX.name]); });
  // the roster the print stacks over the picture (v51): slot, full name, season
  var roster = picks.map(function (en) { return { slot: en.p.slot, name: String(en.p.row[IDX.name]), yr: "'" + String(en.p.row[IDX.season]).slice(-2) }; });
  var net = typeof G.hotNewNet === "number" ? G.hotNewNet : e.net;
  var context = daily ? "THE DAILY #" + G.social.num : (MODE === "cap" ? "PRESTI MODE" : MODE === "pro" ? "PRO MODE" : "CLASSIC MODE");
  return {
    games: games, wins: wins, saved: saved, context: context, names: names, roster: roster, net: signed1(net),
    comp: wins >= CFG.GAMES_IN_SEASON ? "Greatest of all GOATs" : shareCompFor(wins, false),
    seed: reelHash(names.join("|") + "#" + wins)
  };
}
function mountResultsPrint(e, daily) {
  RESULTS_POSTER = null;
  if (RESULTS_PRINT) { try { RESULTS_PRINT.destroy(); } catch (err) {} RESULTS_PRINT = null; }
  var host = el("rrPrint");
  if (!host) return;
  RESULTS_PRINT_SPEC = resultsPrintSpec(e, daily);
  var canWatch = !!window.IntersectionObserver;
  host.setAttribute("data-spec", JSON.stringify(RESULTS_PRINT_SPEC));   // the print's recipe rides the page (the Reprint Lab reprints it in any look)
  RESULTS_PRINT = printCall(function () { return window.T82PRINT ? T82PRINT.mount(host, RESULTS_PRINT_SPEC, { defer: canWatch }) : null; });
  if (!RESULTS_PRINT) return;
  RESULTS_PRINT_HOLDS = RESULTS_PRINT_SPEC; RESULTS_PRINT_SHOWN = false;
  var board = host.closest ? host.closest(".rr-board") : null;
  if (board) board.classList.add("printed");                 // the print carries the mode line; the eyebrow steps aside
  host.setAttribute("role", "img");
  host.setAttribute("aria-label", RESULTS_PRINT_SPEC.wins + " and " + (CFG.GAMES_IN_SEASON - RESULTS_PRINT_SPEC.wins) +
    ". The shape of the season: " + (RESULTS_PRINT_SPEC.games ? "every win lifts the ridge, every loss drops it" : "the projected climb") +
    ", and the color fills the picture to the win rate.");
  // Reveal only when the print is on screen and nothing sits over it.
  if (canWatch) {
    var poll = 0, io = new IntersectionObserver(function (ents) {
      clearInterval(poll);
      if (!ents[0] || !ents[0].isIntersecting) return;
      poll = setInterval(function () {
        if (!document.body.contains(host)) { clearInterval(poll); io.disconnect(); return; }
        if (resultsPrintCovered()) return;
        clearInterval(poll); io.disconnect();
        playResultsPrint();
      }, 300);
    }, { threshold: 0.5 });
    io.observe(host);
  } else playResultsPrint();
  // Daily practice runs share the OFFICIAL numbers, so their poster would lie. A replay of a past board
  // with no official that day shares itself (v56), so it gets its poster.
  if (!daily || daily.isOfficial || (daily.archive && !daily.official)) setTimeout(function () { bakeResultsPoster(); }, 1800);
}
// v51: something sits over the print (v59.3: the Tribune only ever opens from its door, so an open overlay is
// the whole test). The print never reveals then.
function resultsPrintCovered() {
  return ballotOverlayUp();
}
// The reveal prints the LATEST season: a Heat Check save that landed while the page
// was covered prints in with the rescued game, instead of re-printing unseen.
function playResultsPrint() {
  RESULTS_PRINT_SHOWN = true;
  printCall(function () {
    if (!RESULTS_PRINT) return null;
    if (RESULTS_PRINT_HOLDS !== RESULTS_PRINT_SPEC) { RESULTS_PRINT_HOLDS = RESULTS_PRINT_SPEC; RESULTS_PRINT.update(RESULTS_PRINT_SPEC); }
    else RESULTS_PRINT.play();
    return null;
  });
}
function bakeResultsPoster() {
  var spec = RESULTS_PRINT_SPEC;
  if (!spec || !window.T82PRINT || RESULTS_PRINT_OFF || typeof File !== "function") return;
  printCall(function () {
    T82PRINT.poster(spec, function (blob) {
      if (!blob || spec !== RESULTS_PRINT_SPEC) return;
      try { RESULTS_POSTER = new File([blob], "true82-" + spec.wins + "-" + (CFG.GAMES_IN_SEASON - spec.wins) + ".jpg", { type: "image/jpeg" }); }
      catch (err) { RESULTS_POSTER = null; }
    });
    return null;
  });
}
// The end-of-season Heat Check can turn 81-1 into 82-0 after the page is up.
function resultsPrintRecord(e, wins) {
  if (!RESULTS_PRINT_SPEC || wins === RESULTS_PRINT_SPEC.wins) return;
  var daily = !!(G.social && window.T82DAILY);
  RESULTS_PRINT_SPEC = resultsPrintSpec(e, daily ? { isOfficial: true } : null, wins);
  RESULTS_POSTER = null;
  var host = el("rrPrint");
  if (host) { host.setAttribute("aria-label", wins + " and " + (CFG.GAMES_IN_SEASON - wins) + ". The shape of the season."); host.setAttribute("data-spec", JSON.stringify(RESULTS_PRINT_SPEC)); }
  // v51: never re-print under the Heat Check (v50 invariant 2: the print never reveals
  // under an overlay). Before the first reveal, the pending reveal prints the saved
  // season; after it, the re-print waits for a clear page. The poster bakes now.
  if (RESULTS_PRINT_SHOWN) {
    var wait = setInterval(function () {
      if (!host || !document.body.contains(host)) { clearInterval(wait); return; }
      if (resultsPrintCovered()) return;
      clearInterval(wait); playResultsPrint();
    }, 300);
  }
  setTimeout(function () { bakeResultsPoster(); }, 900);
}
function resultsShareFiles() {
  if (!RESULTS_POSTER || !navigator.canShare) return null;
  try { return navigator.canShare({ files: [RESULTS_POSTER] }) ? [RESULTS_POSTER] : null; } catch (err) { return null; }
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
  // v50 THE TAG BALLOT: each card is a printed slip (name, season, the
  // engine value as the hero number, one box-score line, then the tags).
  // wireBallot fills the tag row; the engine chip and "+" are live at once.
  var picksHtml = picksInSlotOrder().map(function (entry, k) {
    var p = entry.p, i = entry.i, row = p.row, name = row[IDX.name];
    return '<div class="pick-card bt-card t-card' + (k ? "" : " bt-cue") + '" data-pick="' + i + '">' +
      '<div class="bt-head"><div class="bt-who">' +
        '<div class="pr-name bt-name"><span class="slot-badge">' + p.slot + "</span>" +
          '<a class="pr-bref" data-bb="' + esc(name) + '" data-camp="results_five" href="' + bbrefSearch(name, "results_five") + '" target="_blank" rel="noopener">' + esc(name) + "</a></div>" +
        '<div class="bt-ssn">' + prTeamHtml(row, p.fr) + "</div></div>" +
        '<div class="pr-v bt-val t-num' + (valueOf(row) < 0 ? " is-neg" : "") + '"><b class="sigma" aria-hidden="true">\u03A3</b><small>V</small>' + valueOf(row).toFixed(2) + "</div></div>" +
      '<div class="bt-box">' + ballotBoxHtml(row) + "</div>" +
      '<div class="bt-tags" data-bt="' + i + '"></div>' + (k ? "" : ballotHintHtml()) + "</div>";   // v63: the "+" hint, printed on the first card
  }).join("");

  var ledger = resultsLedgerHtml(e);

  // THE DAILY results layer. The official-run law lives here: the first finish
  // of the day claims official (with a run nonce so a Heat Check landing after
  // this render can still amend its own totals); every later run is practice
  // and the share button always carries the official numbers. Storage gone?
  // officialFor returns null and this run shares itself: fail-soft.
  var daily = null;
  if (G.social && window.T82DAILY) {
    var dres = dailyResFromG(e);
    var dOfficial = T82DAILY.officialFor(G.social.key);
    if (G.social.archive) {
      // v56: a replay of a past board (the archive) never claims the day and never moves the streak: it
      // keeps your best replay apart (a re-render after a Heat Check updates it without counting a run)
      T82DAILY.recordArchive(G.social.key, G.social.num, dres.wins, dres.net, !G.social.archived);
      G.social.archived = 1;
    } else if (!dOfficial) {
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
    daily = { res: dres, official: dOfficial, isOfficial: dIsOfficial, targetHtml: dTargetHtml, archive: !!G.social.archive };
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
      (daily.archive
        ? "PAST BOARD" + dhlDot + (daily.official ? "OFFICIAL " + daily.official.wins + "-" + (CFG.GAMES_IN_SEASON - daily.official.wins) : "REPLAY")
        : daily.isOfficial
        ? "OFFICIAL RUN" + dhlDot + "LOCKED"
        : "PRACTICE RUN" + dhlDot + "OFFICIAL " + daily.official.wins + "-" + (CFG.GAMES_IN_SEASON - daily.official.wins)) +
    '</div>';
  }
  // v56: a replay of a past board you never played shares as a team (the regular share); with an official
  // that day it shares the official, like any practice run. The Daily's own share text is untouched.
  var dailyShare = daily && daily.official ? daily : null;
  var compHtml = resultsCompHtml(e.winTally);
  var shareLabel = !dailyShare ? "SHARE YOUR TEAM"
    : dailyShare.isOfficial ? "SHARE THE DAILY"
    : "SHARE OFFICIAL (" + dailyShare.official.wins + "-" + (CFG.GAMES_IN_SEASON - dailyShare.official.wins) + ")";
  document.body.classList.remove("drafting");
  document.body.classList.remove("gating");
  // v50 RISO RESULTS: the page prints on the same paper stock as the reel.
  // The hero is THE SHAPE OF A SEASON (results-riso.js) over the plain
  // record, which stays in the DOM for screen readers, the Heat Check's
  // rewrite and the no-canvas fallback. The roster moved up under the hero
  // (owner fact: about half of finishers never scroll to it, so the first
  // ballot card has to sit above the fold); the two-way profile sits in the record card.
  // The bottom "did we get it wrong" prompt is gone: the cards are the ballot.
  app().innerHTML = '<div class="rr">' +
    resultsTopBarHtml() +
    '<section class="board rr-board' + (daily ? " daily-framed" : "") + '" data-result-section="summary"><div class="goat-fw" id="wlFw" aria-hidden="true"></div>' +
    (daily ? dailyHeadHtml : '<p class="eyebrow">' + boardEyebrow + "</p>") +
      '<div class="rr-print" id="rrPrint"><div class="big">' + e.winTally + "\u2013" + (CFG.GAMES_IN_SEASON - e.winTally) + "</div></div>" +
      '<div class="big-label">net rating ' + signed1(e.net) + "</div>" +
      '<div class="res-comp">' + compHtml + '</div>' +
      dailyBoardHtml +
      // the two-way profile sits inside the record card, just above SHARE (owner, v51.1)
      '<div class="rr-twoway" data-result-section="two_way">' + twoWayHtml(e) + "</div>" +
      '<button class="btn btn-primary btn-block presti-spin rr-share' + ((e.winTally === 81 || e.winTally === 82) ? ' elite-result' : '') + '" id="shareTeamBtn" data-share-label="' + shareLabel + '">' + shareLabel + '</button></section>' +
    '<section class="section traits-roster" data-result-section="roster">' +
      head("results", "Your five", { cls: "rr-eyebrow",
        aside: '<button type="button" class="rr-tags-info t-btn" data-kind="text" data-size="sm" id="tagGlossBtn">What the tags mean</button>' }) +
      picksHtml +
      '<p class="bref-credit">Tap a name for the career, the team for that season \u00B7 <a href="https://www.basketball-reference.com/?utm_source=true82.net&utm_campaign=results_credit" target="_blank" rel="noopener">Basketball-Reference</a></p></section>' +
    '<section class="section rr-climb" data-result-section="goat_climb">' + head("results", "GOAT Climb", { cls: "rr-eyebrow" }) + climbHtml(e) + "</section>" +
    '<section class="section" data-result-section="scoring_card">' + head("results", "Scoring Card", { cls: "rr-eyebrow" }) + ledger + "</section>" +
    '<div class="actions" data-result-section="replay"><button class="btn btn-primary presti-spin" id="againBtn">' + (daily ? "Run it back \u00B7 practice" : "Run it back") + '</button>' +
      (daily && daily.archive ? '<button class="t-btn" data-kind="text" id="pastDailiesBtn" type="button">Daily archive</button>' : "") + '</div>' +
    (MODE !== "kaman" ? '<div class="np-door-wrap"><button class="np-door tm-flat" id="tribuneBtn" type="button">See the Tribune article</button></div>' : "") +
    '<p class="run-status" id="runStatus"></p></div>';

  trackResultSections();
  wireBallot(picksInSlotOrder());
  mountResultsPrint(e, daily);
  el("tagGlossBtn").addEventListener("click", function () { ballotOpenGlossary("results"); });

  el("againBtn").addEventListener("click", function () {
    analyticsTrack("replay", Object.assign(analyticsRunSnapshot(), { surface: "results", action: daily ? "daily_practice" : "same_mode" }));
    if (daily) {
      // Same board, same modifier, target kept: a practice rematch, never a
      // fresh random game. boardFor is deterministic, so a rerun after local
      // midnight still rebuilds the board this run was played on.
      var rb = T82DAILY.boardFor(G.social.key);
      startDailyRun(rb, G.social.target || null, "daily-practice:" + rb.num, { archive: daily.archive });
      return;
    }
    newGame();
  });
  if (el("pastDailiesBtn")) el("pastDailiesBtn").addEventListener("click", function () { renderDailyArchive(); });
  if (el("tribuneBtn")) el("tribuneBtn").addEventListener("click", openTribune);
  wireStartOver();
  wireDonate();
  el("shareTeamBtn").addEventListener("click", function () {
    var e2 = engine(G.picks.map(function (p) { return p.row; }), G.picks.map(function (p) { return p.slot; }));
    if (dailyShare) {
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
      ), null, dTrack, daily.isOfficial ? resultsShareFiles() : null);
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
    shareOrCopy(shareText(e2), null, sTrack, resultsShareFiles());
  });
  setupGoatFireworks(e.winTally >= CFG.GAMES_IN_SEASON);
  // The Heat Check lever survives ONLY when a real spin is pending (exactly 81 wins in Presti, or the QA flag).
  // v59.3: the Tribune is never a gate; its payload is staged here (no model call) for the door at the bottom.
  var clutchPending = hhEligible(e) && !G.hhMidUsed && (FORCE_CLUTCH || e.winTally === CFG.GAMES_IN_SEASON - 1);
  if (clutchPending) {
    hotHand(e);                       // recap request fires from verdict() with post-boost totals
  } else if (MODE !== "kaman") {
    prepareRecap(e, e.winTally,
      G.hotMid ? G.hotNewNet : e.net,
      G.hotMid ? { player: shareSurname(G.picks[G.hotMid.hotIdx].row[IDX.name]), tier: G.hotMid.seg.label } : null);   // payload only; the model call fires on unwrap
    if (e.winTally >= CFG.GAMES_IN_SEASON) setTimeout(fireWL, 700);   // a drafted 82-0's W/L burst (it used to wait for the paper)
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
    '<section class="section" data-result-section="roster">' + head("results", "Your five \u00B7 all centers, as nature intended") + picksHtml + "</section>" +
    '<section class="section" data-result-section="scoring_card">' + head("results", "Scoring Card") + ledger + "</section>" +
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
/* ---------- THE DAILY ARCHIVE (v56; the owner: "add daily archive retrieval, play or view past Dailies") ----------
   Every past board rebuilds exactly from its date (daily-core boardFor is deterministic and the schedule is
   pinned in test.js), so the archive is a list from yesterday back to #1: the board, its base mode, your
   official that day (the device keeps a year) and your best replay. Tap one for its gate, then a practice run
   on that board that never claims the day or moves the streak (startDailyRun with { archive: true }). A
   past-dated challenge link opens that board's gate with the friend's number pinned. */
function dailyDayLabel(key) {
  try {
    var p = String(key).split("-"), d = new Date(+p[0], +p[1] - 1, +p[2], 12);
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }).toUpperCase();
  } catch (e) { return ""; }
}
function renderDailyArchive() {
  if (!window.T82DAILY) { renderIntro(); return; }
  G = null;
  if (window.T82DUI) T82DUI.stop();
  document.body.classList.remove("drafting");
  document.body.classList.remove("gating");
  renderPips();
  var today = T82DAILY.dayKey(), key = T82DAILY.shiftKey(today, -1), rows = "", guard = 0;
  var BASE = { cap: "Presti", classic: "Classic", pro: "Pro" };
  while (T82DAILY.dayNum(key) >= 1 && guard++ < 1000) {
    var b = T82DAILY.boardFor(key), off = T82DAILY.officialFor(key), arc = T82DAILY.archiveFor(key);
    var res = off ? '<b>' + off.wins + "-" + (CFG.GAMES_IN_SEASON - off.wins) + "</b><i>official</i>"
      : arc ? '<b>' + arc.wins + "-" + (CFG.GAMES_IN_SEASON - arc.wins) + "</b><i>best replay</i>"
      : "<i>not played</i>";
    rows += '<button type="button" class="da-row t-card" data-key="' + key + '" aria-label="Daily ' + b.num + ", " + esc(b.name) + '">' +
      '<span class="da-num t-num">' + b.num + "</span>" +
      '<span class="da-main"><span class="t-meta">' + dailyDayLabel(key) + "</span>" +
        '<span class="da-name">' + esc(b.name) + "</span>" +
        '<span class="t-chip" data-size="sm" data-tone="plain">' + (BASE[b.base] || "Presti") + "</span></span>" +
      '<span class="da-res' + (off ? " is-official" : arc ? " is-replay" : "") + '">' + res + "</span>" +
    "</button>";
    key = T82DAILY.shiftKey(key, -1);
  }
  app().innerHTML =
    '<section class="t-mode da">' +
      '<div class="da-top"><button class="t-btn" data-kind="text" data-size="sm" id="daBack" type="button">\u2039 Back</button></div>' +
      head("daily", "\uD83D\uDCC5 The Daily") +
      '<h1 class="t-title">Daily archive</h1>' +   // v59: the owner's name for it (was Past Dailies)
      '<p class="t-small da-lede">Every board replays exactly as it was dealt. A replay is practice: your official days and your streak stay as they are.</p>' +
      (rows ? '<div class="da-list" id="daList">' + rows + "</div>" : '<p class="t-small">No past boards yet. Come back tomorrow.</p>') +
    "</section>";
  analyticsTrack("mode_impression", { surface: "daily_archive", action: "archive_list", daily_num: T82DAILY.dayNum(today) });
  el("daBack").addEventListener("click", function () { renderIntro(); });
  var list = el("daList");
  if (list) list.addEventListener("click", function (ev) {
    var row = ev.target.closest(".da-row");
    if (!row) return;
    var k = row.getAttribute("data-key"), b = T82DAILY.boardFor(k);
    analyticsTrack("mode_select", { mode: b.base, surface: "daily_archive", action: "daily_archive", daily_num: b.num, practice: 1 });
    renderDailyGate(b, null, "daily-practice:" + b.num, { archive: true });
  });
}
function renderDailyGate(board, target, variantTag, opts) {
  opts = opts || {};
  var archive = !!opts.archive;   // v56: a past board from the archive (or a past-dated challenge link)
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
  var dateStr = dailyDayLabel(board.key);   // the board's own day (a past board shows its date, not today's)
  app().innerHTML =
    '<section class="gate' + (archive ? " gate-archive" : "") + '">' +
      '<button class="gate-back" id="gateBack" aria-label="' + (archive ? "Back to past Dailies" : "Back to menu") + '">\u2190 back</button>' +
      '<p class="gate-eyebrow mono">\uD83D\uDCC5 THE DAILY #' + board.num + (dateStr ? ' \u00B7 ' + dateStr : '') + '</p>' +
      '<h2 class="gate-title">' + (archive ? "A past Daily" : "The Daily") + '</h2>' +
      '<div class="gate-law">' +
        (archive
          ? '<p>The same rolls everyone got that day.</p>' +
            '<p>A replay is practice: official days and your streak stay as they are.</p>'
          : '<p>One attempt.</p>' +
            '<p>Everyone gets the same rolls.</p>' +
            '<p>Compare with friends to see who knows ball.</p>') +
      '</div>' +
      '<div class="gate-var plq-frame plq-slim">' +
        '<p class="gate-var-label mono">' + (archive ? "THAT DAY\u2019S VARIATION" : "TODAY\u2019S VARIATION") + ' \u00B7 ' + baseName.toUpperCase() + ' MODE' +
          ' <button class="cap-info" id="gateInfo" aria-expanded="false" aria-label="How ' + baseName + ' Mode works">i</button></p>' +
        '<p class="gate-var-name">' + esc(board.name) + '</p>' +
        '<p class="gate-var-body">' + esc(board.gate || board.blurb || "") + '</p>' +
        '<div class="cap-tip" id="gateTip" hidden>' + esc(tip) + '</div>' +
        (target
          ? '<p class="gate-target mono">Their five went ' + target.w + '-' + (CFG.GAMES_IN_SEASON - target.w) +
            ' (Net ' + T82DAILY.signedNet(target.n) + '). Beat\u00A0it.</p>'
          : '') +
      '</div>' +
      '<div class="gate-tipoff" id="gateTipoff">' +
        '<p class="gate-pull">DUNK THE BALL TO START ' +
          '<span class="gate-cue" aria-hidden="true"><i>\u2193</i><b class="gate-drag">DRAG</b></span></p>' +
        ballLeverHtml("gateLever", "gateArm", "Drag the basketball down through the hoop to start The Daily") +
        '<button class="gate-play-btn presti-spin" id="gatePlayBtn" type="button" aria-label="Start The Daily without using the dunk interaction">PLAY IT</button>' +
      '</div>' +
      // v58: the archive's second door, quiet, under today's start (the home page keeps the first)
      (!archive && board.num > 1 ? '<button class="t-btn gate-past" data-kind="text" data-size="sm" id="gatePastBtn" type="button">Daily archive</button>' : "") +
    '</section>';
  el("gateBack").addEventListener("click", function () {
    analyticsTrack("daily_gate_exit", { mode: board.base, variant: variantTag || ("daily:" + board.num), daily_num: board.num, action: archive ? "archive_back" : "back" });
    if (archive) renderDailyArchive(); else renderIntro();
  });
  if (el("gatePastBtn")) el("gatePastBtn").addEventListener("click", function () {
    analyticsTrack("feature_select", { surface: "daily_gate", action: "daily_archive" });
    renderDailyArchive();
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
      queue(function () { startDailyRun(board, target, variantTag, { archive: archive }); }, btn || null);
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
function startDailyRun(board, target, variantTag, opts) {
  var archive = !!(opts && opts.archive);
  if (archive) variantTag = "daily-practice:" + board.num;   // v56: a replay of a past board is practice (it stays out of the Daily's percentile pool)
  var explicitPractice = /^daily-practice:/.test(variantTag || "");
  var alreadyOfficial = false;
  try { alreadyOfficial = !!(window.T82DAILY && T82DAILY.officialFor(board.key)); } catch (e) {}
  var isPractice = explicitPractice || alreadyOfficial;
  newGame(board.base, board.seed, board.ch, {
    variant: variantTag,
    surface: archive ? "daily_archive" : /^daily-link:/.test(variantTag || "") ? "daily_referral" : explicitPractice ? "daily_practice" : "daily_gate",
    practice: isPractice ? 1 : 0,
    official: isPractice ? 0 : 1,
    social: { key: board.key, num: board.num, name: board.name,
              short: board.short || board.blurb || "", gate: board.gate || board.blurb || "",
              base: board.base, chId: board.ch ? board.ch.id : null,
              shareEmoji: (board.ch && board.ch.shareEmoji) || null, target: target || null,
              archive: archive ? 1 : 0 }
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
var BUILD_V = "v63";
// v60 THE MOCK DATABASE (functions/_middleware.js): anywhere but true82.net (and a local dev server) the site runs on
// a mock that drops every write, so the footer says so beside the build (the owner can tell a test server at a glance).
function testServer() {
  var h = String(location.hostname || "").toLowerCase();
  return !(h === "true82.net" || h === "www.true82.net" || h === "localhost" || h === "127.0.0.1" || h === "[::1]" || /\.localhost$/.test(h));
}
function footSeg(txt) { return '<span class="foot-seg">' + txt + "</span>"; }
function footBuild() { return footSeg(BUILD_V + (testServer() ? " \u00B7 test server, nothing saved" : "")); }
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
    el.innerHTML = footBuild();
    return;
  }
  var rate = d.presti ? Math.round(1000 * (d.presti82 || 0) / d.presti) / 10 : 0;
  el.innerHTML = [
    footSeg(d.presti.toLocaleString() + " Presti drafts"),
    footSeg((d.classic || 0).toLocaleString() + " Classic drafts"),
    footSeg((d.pro || 0).toLocaleString() + " Pro drafts"),
    footSeg("Presti WR " + rate + "%"),
    footBuild()
  ].join(" | ");
}
function fetchFootStats() {
  var fe = document.getElementById("footStats");
  if (fe && !fe.innerHTML) fe.innerHTML = footBuild();   // visible before (or without) the stats reply
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
            // no comp phrase (a record under the ladder): the line is just "Top X%", no leading bullet
            rc.insertAdjacentHTML("beforeend", rc.textContent.trim()
              ? ' <span class="comp-pct">\u2022 Top ' + d.pct + "%</span>"
              : '<span class="comp-pct">Top ' + d.pct + "%</span>");
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

// v61 THE LABEL TAXES read a frozen copy of the player tags, shipped with each release (tools/labels-freeze.js
// writes labels.json; bump LABELS_V with it). It loads beside the game data; a board shows its tags once it lands,
// and the results wait for it (2.5 s at most) so a slow phone scores exactly like everyone else. No file: no label
// taxes, and the game plays exactly as before.
// the version rides a <meta name="t82-labels"> in index.html, so a weekly tag refresh (tools/labels-refresh.js) only
// touches labels.json and index.html (HTML is never long-cached)
var LABELS_V = (function () {
  try { var m = document.querySelector('meta[name="t82-labels"]'); if (m && m.content) return m.content; } catch (e) {}
  return "20260927-v61";
})();
var LABELS_STATE = "idle", LABELS_WAITERS = [];
function loadLabels() {
  if (LABELS_STATE !== "idle") return;
  if (!window.fetch || !window.T82 || !T82.setLabels) { LABELS_STATE = "failed"; return; }
  LABELS_STATE = "loading";
  function done(ok) {
    LABELS_STATE = ok ? "ready" : "failed";
    var w = LABELS_WAITERS; LABELS_WAITERS = [];
    w.forEach(function (f) { f(); });
    if (ok && G && G.screen === "draft" && el("pool")) refreshPool();   // a board already up gains its tags
  }
  fetch("labels.json?v=" + LABELS_V)
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (d) { done(!!T82.setLabels(d)); })
    .catch(function () { done(false); });
}
function whenLabels(fn) {
  if (LABELS_STATE !== "loading") { fn(); return; }
  var fired = false, go = function () { if (!fired) { fired = true; fn(); } };
  LABELS_WAITERS.push(go);
  setTimeout(go, 2500);
}
function boot() {
  if (SHARE_REF) analyticsTrack("referral_open", {
    surface: "landing", action: "tribune_share", outcome: "open", source: SHARE_REF
  });
  bindGlobalButtonStyle();
  bindHaptics();
  bindVisibilityResync();
  wireDraftWheel();
  wireTraitChipTaps();
  if (DUEL_ID) { app().innerHTML = '<section class="ticket duel"><p class="duel-wait">Setting the table\u2026</p></section>'; }
  else if (LEAGUE_ID) {
    var lgi = LEAGUE_ID; LEAGUE_ID = null;
    app().innerHTML = '<section class="ticket league"><p class="duel-wait">Opening the league office\u2026</p></section>';
    ensureLeagueUI().then(function (ok) { if (ok) T82LGUI.route(lgi); else showError("Couldn\u2019t load the league screen. Reload and try again."); });
  }
  else if (SD_QA.open) openRedrafted("deep_link");   // ?redraft=1 / ?redraft=YEAR (v55)
  else renderIntro();   // the intro needs no player data — show it instantly instead of a loading screen
  fetchFootStats();  // footer stat line — tiny request, independent of the big payload
  loadLabels();      // v61: the frozen tags, beside the game data
  var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
  var dataHttpStatus = 0;
  fetch(CFG.DATA_URL)
    .then(function (res) { dataHttpStatus = res.status; if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
    .then(function (data) {
      initData(data);
      DATA_READY = true;
      tmDataReady();   // v59: the home vote card's season line gains its team
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
