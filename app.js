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
  try { if (navigator.vibrate) navigator.vibrate(ms || 15); } catch (e) {}
}

// Every true button except the deliberately flat Start over, compact Sort/info
// controls, and newspaper-object wrapper receives the same extruded 3D treatment.
// A tiny observer covers buttons created by later renders and lazy-loaded UIs.
var _buttonStyleObserver = null;
function decorate3dButtons(root) {
  if (!root) return;
  function add(node) {
    if (!node || !node.matches || !node.matches("button:not(.startover-btn):not(.np-bundle):not(.sort-chip):not(.cap-info):not(.du-exit):not(.rs-close)")) return;
    node.classList.add("presti-spin");
  }
  add(root);
  if (root.querySelectorAll) {
    var nodes = root.querySelectorAll("button:not(.startover-btn):not(.np-bundle):not(.sort-chip):not(.cap-info):not(.du-exit):not(.rs-close)");
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
function chipsFor(row) {
  var out = [];
  if (row[IDX.sp] >= 1.5) out.push('<span class="chip">3PT+</span>');
  else if (row[IDX.sp] === 1) out.push('<span class="chip">3PT</span>');
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
    '<a class="rs-link mono" href="/how-it-works/" target="_blank" rel="noopener">Full engine math \u2192</a>' +
    '<a class="rs-link mono" href="' + bbrefTag(BBREF_BPM_LEADERS, "howto") + '" target="_blank" rel="noopener">STATS REFRESHER \u2197</a>' +
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
/* ---------- Player Traits (v44) ---------- */
// The voting mode lives at /traits/ as its own page; app.js only owns the two
// doorways: the homepage module and the results-screen disputed-call prompt.
// Styling is injected here, scoped under .traits-*, so the shared styles.css
// stays untouched this build (fold into styles.css on its next owner pass).
var TRAITS_CSS_ID = "traitsCss";
function ensureTraitsCss() {
  if (document.getElementById(TRAITS_CSS_ID)) return;
  var st = document.createElement("style");
  st.id = TRAITS_CSS_ID;
  st.textContent =
    ".traits-module{display:block;text-decoration:none;color:inherit;text-align:left;" +
      "background:#161c23;border:1px solid #2a333d;border-radius:14px;padding:14px 14px 12px;margin:10px 0}" +
    ".traits-module .tm-eyebrow{display:block;font-family:'IBM Plex Mono',monospace;font-size:12px;" +
      "letter-spacing:.18em;color:#FFB52E}" +
    ".traits-module .tm-q{display:block;font-family:'Barlow Condensed',sans-serif;font-weight:700;" +
      "font-size:21px;line-height:1.12;margin-top:4px}" +
    ".traits-module .tm-why{display:block;font-size:13px;color:#8b98a5;margin-top:5px}" +
    ".traits-module .tm-cta{display:inline-block;margin-top:9px;background:#FFB52E;color:#221a05;" +
      "font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:16px;letter-spacing:.12em;" +
      "border-radius:9px;padding:8px 14px}" +
    ".traits-prompt{background:#161c23;border:1px solid #2a333d;border-radius:14px;padding:14px}" +
    ".traits-prompt .tp-eyebrow{font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.18em;color:#FFB52E}" +
    ".traits-prompt .tp-q{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:20px;margin:5px 0 3px}" +
    ".traits-prompt .tp-split{font-family:'IBM Plex Mono',monospace;font-size:13px;color:#8b98a5}" +
    ".traits-prompt .tp-cta{display:inline-block;margin-top:8px;background:transparent;border:1px solid #FFB52E;" +
      "color:#FFB52E;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:15px;" +
      "letter-spacing:.12em;border-radius:9px;padding:7px 13px;text-decoration:none}" +
    ".tchips{margin-top:6px;display:flex;flex-wrap:wrap;gap:5px}" +
    ".tchip{position:relative;display:inline-block;font-family:'Barlow Condensed',sans-serif;font-weight:700;" +
      "font-size:12.5px;letter-spacing:.09em;text-transform:uppercase;color:#FFB52E;" +
      "border:1.5px solid #FFB52E;border-radius:6px;padding:2px 7px 1px}" +
    ".tchip.anti{color:#E5533C;border-color:#E5533C}" +
    ".tchip.anti::after{content:'';position:absolute;left:5%;right:5%;top:50%;height:2px;margin-top:-1px;" +
      "background:#E5533C;transform:rotate(-5deg);border-radius:1px}";
  document.head.appendChild(st);
}
function traitsModuleHtml() {
  ensureTraitsCss();
  return '<a class="traits-module" id="traitsModule" href="/traits/?src=home_module">' +
    '<span class="tm-eyebrow">PLAYER TRAITS \u00B7 NEW</span>' +
    '<span class="tm-q">Was 2008 Kobe a wing defender? Is Jokic a rim protector?</span>' +
    '<span class="tm-why">Make five quick calls. Community rulings shape how TRUE 82 scores lineup fit.</span>' +
    '<span class="tm-cta">MAKE 5 CALLS</span></a>';
}
// Fail-soft by construction: the section ships hidden and empty; only a clean
// /api/traits answer ever reveals it. Any network or schema failure leaves the
// results screen exactly as it was.
function wireTraitsPrompt() {
  var sec = el("traitsPromptSec");
  if (!sec || !window.fetch) return;
  fetch("/api/traits?op=prompt", { credentials: "same-origin" })
    .then(function (r) { return r.json(); })
    .then(function (x) {
      if (!x || !x.ok || !x.question || !el("traitsPromptSec")) return;
      ensureTraitsCss();
      var q = x.question;
      var split = "";
      if (x.divided && x.consensus && x.consensus.yes_pct != null) {
        split = '<div class="tp-split">' + x.consensus.yes_pct + "% say yes \u00B7 " +
          (100 - x.consensus.yes_pct) + "% say no</div>";
      }
      sec.innerHTML =
        '<div class="tp-eyebrow">' + (x.divided ? "COMMUNITY IS DIVIDED" : "MAKE THE CALL") + '</div>' +
        '<div class="tp-q">Does ' + esc(q.season_label || "") + " " + esc(q.player_name) +
          " qualify as a " + esc(q.trait_name) + "?</div>" + split +
        '<a class="tp-cta" id="traitsPromptCta" href="/traits/?q=' + encodeURIComponent(q.id) +
          '&src=results_prompt">VOTE NOW</a>';
      sec.hidden = false;
      var cta = el("traitsPromptCta");
      if (cta) cta.addEventListener("click", function () {
        analyticsTrack("feature_select", { surface: "results", action: "traits_prompt", challenge: q.id });
      });
    })
    .catch(function () {});
}
// Shadow-mode labels on the results roster: each pick card gets the community
// tags its player-season has EARNED (gold) or been RULED OUT of (the crossed
// anti-label). Read-only, zero scoring effect, absent on any failure or when
// no ruling exists for the exact player-season.
function wireTraitsLabels(entries) {
  if (!window.fetch || !entries || !entries.length) return;
  var qs = entries.map(function (e) { return encodeURIComponent(e.name) + "~" + e.season; }).join(",");
  fetch("/api/traits?op=labels&players=" + qs, { credentials: "same-origin" })
    .then(function (r) { return r.json(); })
    .then(function (x) {
      if (!x || !x.ok || !x.labels) return;
      ensureTraitsCss();
      entries.forEach(function (e) {
        var hits = x.labels[String(e.name).toLowerCase() + "~" + e.season];
        if (!hits || !hits.length) return;
        var card = document.querySelector('.pick-card[data-pick="' + e.i + '"]');
        if (!card || card.querySelector(".tchips")) return;
        var wrap = document.createElement("div");
        wrap.className = "tchips";
        wrap.innerHTML = hits.slice(0, 4).map(function (hh) {
          return '<span class="tchip' + (hh.anti ? " anti" : "") + '"' +
            (hh.anti ? ' role="img" aria-label="NOT ' + esc(String(hh.t).toUpperCase()) + '"' : "") +
            '>' + esc(hh.t) + "</span>";
        }).join("");
        card.appendChild(wrap);
      });
    })
    .catch(function () {});
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
        dtTitle + dtDate +
        '<span class="dt-board">' + esc(dailyBoard.name) + '</span>' +
        '<span class="dt-result">\u2713 YOUR RUN ' + dailyOfficial.wins + '-' + (82 - dailyOfficial.wins) +
          ' \u00B7 Net ' + T82DAILY.signedNet(dailyOfficial.net) + '</span>' +
        '<span class="dt-actions">' +
          '<button class="dt-act dt-act-share" id="dailyChallengeBtn" data-share-label="CHALLENGE A FRIEND">CHALLENGE A FRIEND</button>' +
          '<button class="dt-act dt-act-ghost" id="dailyPracticeBtn">RUN IT BACK \u00B7 PRACTICE</button>' +
        '</span>' +
        (dailyTomorrow ? '<span class="dt-tomorrow mono">TOMORROW #' + dailyTomorrow.num + ' \u00B7 ' + esc(dailyTomorrow.name.toUpperCase()) + '</span>' : '') +
      '</div>';
  } else if (dailyBoard) {
    thirdSlotHtml =
      '<button class="daily-tile plq-frame" id="startDaily">' +
        dtTitle + dtDate +
        '<span class="dt-board">' + esc(dailyBoard.name) + '</span>' +
        '<span class="dt-sub">' + esc(dailyBoard.short || dailyBoard.blurb) + '</span>' +
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
      ["traitsModule", "traits"]
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
  var traitsMod = el("traitsModule");
  if (traitsMod) traitsMod.addEventListener("click", function () {
    analyticsTrack("feature_select", { surface: "home", action: "traits" });
  });
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
  var sub1 = yearControlHtml(name, row) + (MODE === "classic" ? chipsFor(row) : "");
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
    '<span class="pr-sub">' + chipsFor(row) + "</span>" +
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
  pool.innerHTML = poolInnerHtml(currentPoolRows());
  updateTray();
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
      '<input type="search" id="poolSearch" class="pool-search" placeholder="search player name..." autocomplete="off" spellcheck="false">' +
      "</div>";
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
// v42: comps key on NET, the skill measurement, so a +26 five that ran into
// a bad Tuesday still ranks beside the teams it deserves. Rung nets are the
// analytic inverse of their win totals (memoized binary search on the same
// curve the engine uses), which keeps the ladder's spacing identical to the
// old wins axis. The Tied tier retires with the integer axis; GOAT alone
// stays keyed on the REALIZED perfect season.
var COMP_NET_CACHE = {};
function compNetFor(wins) {
  if (COMP_NET_CACHE[wins] != null) return COMP_NET_CACHE[wins];
  var lo = -60, hi = 80;
  for (var i = 0; i < 60; i++) {
    var mid = (lo + hi) / 2;
    if (Math.ceil(CFG.GAMES_IN_SEASON * T82.phi(null, mid / T82.t.SC.NET_SD)) >= wins) hi = mid; else lo = mid;
  }
  return (COMP_NET_CACHE[wins] = hi);
}
function shareCompFor(net, undefeated) {
  if (undefeated) return "Greatest of all GOATs";
  for (var i = 0; i < HISTORY_COMPS.length; i++) {
    if (compNetFor(HISTORY_COMPS[i].wins) <= net + 1e-9) return "Better than " + compArticle(HISTORY_COMPS[i].label);
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
function shareLine2(wins, emoji, net) {
  var comp = shareCompFor(net, wins >= CFG.GAMES_IN_SEASON);
  var pctTail = (typeof G.sharePct === "number") ? " \u2022 Top " + G.sharePct + "%" : "";
  var body = comp ? comp + pctTail : (pctTail ? pctTail.slice(3) : "");
  return (emoji ? emoji + " " : "") + shareRecord(wins) + (body ? " | " + body : "");
}
function shareText(e) {
  var hot = (typeof G.hotNewNet === "number");                   // Hot Hand boost (any non-COLD) applies to the shared totals
  var wins = hot ? G.hotWins : e.winTally;
  var lines = ["TRUE 82 " + shareHeadCtx(), shareLine2(wins, shareEmojiFor(wins, null, MODE), hot ? G.hotNewNet : e.net)];
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
  // game. Daily boards, challenges, pro, and Presti stay analytic until
  // their own adaptations (Presti next: Heat Check on a literal 81-1).
  // The arming op "ss" rides the action stream so replays realize too.
  if (MODE === "classic" && !G.social && !G.ch && window.T82 && T82.simSeason) {
    T82.armSeasonSim(G);
    var season = T82.simSeason(G, e);
    e.expWins = e.winTally;
    e.winTally = season.wins;
    e.season = season;
    loadBbrefMap();                              // preload the map during the reel
    showSeasonReel(season, e, function () { finishRunTail(e); });
    return;
  }
  finishRunTail(e);
}
function finishRunTail(e) {
  renderResults(e, false);
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
function reelLine(mi, mw, ml, runW, runL, firstLossIdx, monthStart) {
  var mo = REEL_MONTHS[mi][0];
  if (runL === 0) {
    return ["Perfect through " + mo + ". " + runW + " and 0. History is watching.",
      "Not a blemish yet. " + runW + " straight.",
      "Still zero in the loss column. The building holds its breath."][mi % 3];
  }
  if (firstLossIdx !== null && firstLossIdx >= monthStart && firstLossIdx < monthStart + mw + ml) {
    return "The zero died in " + reelCity(firstLossIdx) + ", " + reelDate(firstLossIdx) + ".";
  }
  if (ml === 0) return "A spotless " + mw + " and 0 month steadies the run.";
  if (ml >= 5) return mw + " and " + ml + ". The schedule bit back.";
  if (ml >= 3) return mw + " and " + ml + ". Heavy legs, short rotations, long month.";
  return mw + " and " + ml + ". The engine hums.";
}
function reelBlame(mi) {
  var pk = G.picks[reelHash(String(G.seed || "x") + "b" + mi) % G.picks.length];
  var nm = bbrefLastName(pk.row[IDX.name]) || pk.row[IDX.name];
  var T = ["missed a buzzer beater", "no-showed", "had a flu game", "shot 4 for 19",
    "left his legs at the hotel", "got cooked on every switch", "airballed the game winner",
    "argued with the ref instead of getting back"];
  return nm + " " + T[reelHash(String(G.seed || "x") + "t" + mi) % T.length] + ".";
}
function showSeasonReel(season, e, done) {
  var ov = document.createElement("div");
  ov.className = "reel-overlay";
  ov.innerHTML = '<div class="reel-card">' +
    '<div class="reel-head"><span class="reel-eyebrow">THE SEASON \u00B7 GAME BY GAME</span>' +
    '<span class="reel-run mono" id="reelRun">0\u20130</span>' +
    '<button class="reel-skip mono" id="reelSkip" type="button">SKIP \u2192</button></div>' +
    '<div class="reel-acts" id="reelActs"></div></div>';
  document.body.appendChild(ov);
  var acts = ov.querySelector("#reelActs"), runEl = ov.querySelector("#reelRun");
  var finished = false, timers = [];
  function finishReel() {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    ov.remove();
    done();
  }
  ov.querySelector("#reelSkip").addEventListener("click", function (ev) { ev.stopPropagation(); finishReel(); });
  var firstLossIdx = null;
  for (var g0 = 0; g0 < season.games.length; g0++) { if (!season.games[g0]) { firstLossIdx = g0; break; } }
  // cumulative record per game, so the header ticks square by square
  var cum = [], cw = 0;
  for (var g1 = 0; g1 < season.games.length; g1++) { if (season.games[g1]) cw++; cum.push([cw, g1 + 1 - cw]); }
  var t = 650, start = 0;
  REEL_MONTHS.forEach(function (m, mi) {
    var count = m[1], s0 = start;
    var mw = 0;
    for (var i2 = s0; i2 < s0 + count; i2++) if (season.games[i2]) mw++;
    var ml = count - mw;
    start += count;
    var endRec = cum[s0 + count - 1];
    timers.push(setTimeout(function () {
      var row = document.createElement("div");
      row.className = "reel-act";
      row.innerHTML = '<div class="reel-mo-line"><span class="reel-mo">' + m[0] + '</span>' +
        '<span class="reel-mo-rec mono">' + mw + '\u2013' + ml + '</span></div>' +
        '<div class="reel-grid"></div>' +
        '<p class="reel-note reel-note-pending"></p>';
      row.__grid = row.querySelector(".reel-grid");
      acts.appendChild(row);
      acts.scrollTop = acts.scrollHeight;
      for (var i = 0; i < count; i++) (function (i) {
        timers.push(setTimeout(function () {
          var sq = document.createElement("span");
          var win = season.games[s0 + i];
          sq.className = "reel-day " + (win ? "w" : "l");
          sq.textContent = win ? "W" : "L";
          row.__grid.appendChild(sq);
          var c = cum[s0 + i];
          runEl.textContent = c[0] + "\u2013" + c[1];
        }, 140 + i * 48));
      })(i);
      timers.push(setTimeout(function () {
        var note = row.querySelector(".reel-note");
        note.textContent = reelLine(mi, mw, ml, endRec[0], endRec[1], firstLossIdx, s0) + (ml > 0 ? " " + reelBlame(mi) : "");
        note.classList.remove("reel-note-pending");
        acts.scrollTop = acts.scrollHeight;
      }, 140 + count * 48 + 120));
    }, t));
    t += 320 + count * 48 + 640;
  });
  timers.push(setTimeout(function () {
    var fin = document.createElement("div");
    fin.className = "reel-final";
    fin.innerHTML = '<span class="reel-final-rec">' + season.wins + '\u2013' + season.losses + '</span>' +
      '<p class="reel-note">' + (season.losses === 0 ? "Eighty two and zero. Say it out loud." : "The verdict is in.") + '</p>' +
      '<button class="reel-done" id="reelDone" type="button">SEE THE FULL RESULTS \u2192</button>';
    acts.appendChild(fin);
    fin.querySelector("#reelDone").addEventListener("click", function (ev) { ev.stopPropagation(); finishReel(); });
    acts.scrollTop = acts.scrollHeight;
  }, t + 200));
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
    if (compNetFor(compLadder[ci].wins) > e.net + 1e-9) { compAbove = compLadder[ci]; break; }
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
    '<section class="section" data-result-section="roster"><p class="eyebrow">Your five</p>' + picksHtml +
      '<p class="bref-credit">Tap a name for the career, the team for that season \u00B7 <a href="https://www.basketball-reference.com/?utm_source=true82.net&utm_campaign=results_credit" target="_blank" rel="noopener">Basketball-Reference</a></p></section>' +
    '<section class="section" data-result-section="goat_climb"><p class="eyebrow">GOAT Climb</p>' + climbHtml(e) + "</section>" +
    '<section class="section" data-result-section="scoring_card"><p class="eyebrow">Scoring Card</p>' + ledger + "</section>" +
    '<section class="section traits-prompt" data-result-section="traits_prompt" id="traitsPromptSec" hidden></section>' +
    '<div class="actions" data-result-section="replay"><button class="btn btn-primary presti-spin" id="againBtn">' + (daily ? "Run it back \u00B7 practice" : "Run it back") + '</button></div>' +
    '<p class="run-status" id="runStatus"></p>';

  trackResultSections();
  wireTraitsPrompt();
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
  var clutchPending = hhEligible(e) && (FORCE_CLUTCH || e.winTally === CFG.GAMES_IN_SEASON - 1);
  if (clutchPending) {
    hotHand(e);                       // recap request fires from verdict() with post-boost totals
  } else if (MODE !== "kaman") {
    prepareRecap(e, e.winTally, e.net, null);   // payload only; the model call fires on unwrap
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
var BUILD_V = "v45";
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
  if (DUEL_ID) { app().innerHTML = '<section class="ticket duel"><p class="duel-wait">Setting the table\u2026</p></section>'; }
  else if (LEAGUE_ID) {
    var lgi = LEAGUE_ID; LEAGUE_ID = null;
    app().innerHTML = '<section class="ticket league"><p class="duel-wait">Opening the league office\u2026</p></section>';
    ensureLeagueUI().then(function (ok) { if (ok) T82LGUI.route(lgi); else showError("Couldn\u2019t load the league screen. Reload and try again."); });
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
