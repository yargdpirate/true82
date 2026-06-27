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
  DATA_URL: "site_data.json",
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
var G = null;

/* ---------- math ---------- */

function erf(x) {
  var sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  var t = 1 / (1 + 0.3275911 * x);
  var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}
function phi(x) { return 0.5 * (1 + erf(x / Math.SQRT2)); }

/* ---------- data ---------- */

function key(fr, dec) { return fr + "|" + dec; }
function valueOf(row) { return row[IDX.bpm_star] - SC.REPLACEMENT; }

function rowBuckets(row) {
  var out = [];
  if (row[IDX.g_pct] >= CFG.POS_THRESHOLD) out.push("G");
  if (row[IDX.f_pct] >= CFG.POS_THRESHOLD) out.push("F");
  if (row[IDX.c_pct] >= CFG.POS_THRESHOLD) out.push("C");
  if (!out.length) {
    var g = row[IDX.g_pct], f = row[IDX.f_pct], c = row[IDX.c_pct];
    var m = Math.max(g, f, c);
    out.push(g === m ? "G" : (f === m ? "F" : "C"));
  }
  return out;
}

function initData(data) {
  META = data.meta;
  CRESTS = data.crests || {};
  CREST_DEFAULT = data.crest_default || null;
  SC = META.scoring;
  IDX = {};
  META.cols.forEach(function (c, i) { IDX[c] = i; });
  var m = /-\s*([0-9.]+)/.exec(String(SC.net || ""));
  BASELINE = m ? parseFloat(m[1]) : 10;

  // Manual 3pt-shooter overrides (meta.sp_override): known shooters whose early-era
  // seasons lack the tracked 3PM/3PA volume to clear the percentile bar. Force sp=1
  // across every one of their rows, before pools are built.
  if (META.sp_override && META.sp_override.length) {
    var spForce = {};
    META.sp_override.forEach(function (nm) { spForce[nm] = true; });
    data.players.forEach(function (row) { if (spForce[row[IDX.name]]) row[IDX.sp] = 1; });
  }

  // Categorical non-shooters (meta.sp_never): force sp=0 across all their rows,
  // applied after sp_override so a "never" designation wins any conflict.
  if (META.sp_never && META.sp_never.length) {
    var spDeny = {};
    META.sp_never.forEach(function (nm) { spDeny[nm] = true; });
    data.players.forEach(function (row) { if (spDeny[row[IDX.name]]) row[IDX.sp] = 0; });
  }

  TEAM2FR = {};
  Object.keys(data.franchises).forEach(function (fr) {
    data.franchises[fr].forEach(function (code) { TEAM2FR[code] = fr; });
  });

  // Franchise x decade combos to drop from the draft (e.g. one-season expansion
  // slivers like the '80s Heat = 1988-89 only). Keys are "FRANCHISE|decade".
  var EXCLUDE = {};
  if (META.era_exclude) META.era_exclude.forEach(function (kk) { EXCLUDE[kk] = true; });

  POOLS = new Map(); POOL_YEARS = new Map(); FR_BY_DEC = new Map(); DEC_SPAN = new Map(); SEASON_SPAN = null;
  data.players.forEach(function (row) {
    var fr = TEAM2FR[row[IDX.team]];
    if (!fr) return;
    var season = row[IDX.season];
    var dec = Math.floor(season / 10) * 10;
    var k = key(fr, dec);
    if (EXCLUDE[k]) return;
    if (!POOLS.has(k)) POOLS.set(k, new Map());
    var pool = POOLS.get(k);
    var name = row[IDX.name];
    var prev = pool.get(name);
    if (!prev || valueOf(row) > valueOf(prev)) pool.set(name, row);
    if (!POOL_YEARS.has(k)) POOL_YEARS.set(k, new Map());
    var yrs = POOL_YEARS.get(k);
    if (!yrs.has(name)) yrs.set(name, []);
    yrs.get(name).push(row);
    var span = DEC_SPAN.get(dec);
    if (!span) DEC_SPAN.set(dec, [season, season]);
    else { if (season < span[0]) span[0] = season; if (season > span[1]) span[1] = season; }
    if (!SEASON_SPAN) SEASON_SPAN = [season, season];
    else { if (season < SEASON_SPAN[0]) SEASON_SPAN[0] = season; if (season > SEASON_SPAN[1]) SEASON_SPAN[1] = season; }
  });

  // POOL_YEARS: one entry per season (collapse same-season double stints to the
  // higher-value row), ordered oldest -> newest for the dropdown.
  POOL_YEARS.forEach(function (yrs) {
    yrs.forEach(function (arr, nm) {
      var bySeason = {};
      arr.forEach(function (r) {
        var s = r[IDX.season];
        if (!bySeason[s] || valueOf(r) > valueOf(bySeason[s])) bySeason[s] = r;
      });
      var out = Object.keys(bySeason).map(function (s) { return bySeason[s]; });
      out.sort(function (a, b) { return a[IDX.season] - b[IDX.season]; });
      yrs.set(nm, out);
    });
  });

  var decSet = new Set();
  POOLS.forEach(function (_pool, k) {
    var parts = k.split("|");
    var fr = parts[0], dec = parseInt(parts[1], 10);
    decSet.add(dec);
    if (!FR_BY_DEC.has(dec)) FR_BY_DEC.set(dec, []);
    FR_BY_DEC.get(dec).push(fr);
  });
  DECADES = Array.from(decSet).sort(function (a, b) { return a - b; });

  FRANCHISES = Array.from(new Set(Array.from(POOLS.keys()).map(function (k) { return k.split("|")[0]; }))).sort();
  BEST_BY_NAME = new Map();
  POOLS.forEach(function (pool) {
    pool.forEach(function (row, name) {
      var prev = BEST_BY_NAME.get(name);
      if (!prev || valueOf(row) > valueOf(prev)) BEST_BY_NAME.set(name, row);
    });
  });

  // ----- Kaman Mode pool: every Chris Kaman season (one row per season, traded
  // years collapsed to his higher-value stint). The whole draft is five Kamans.
  KAMAN_SEASONS = [];
  var kBySeason = {};
  data.players.forEach(function (row) {
    if (row[IDX.name] !== "Chris Kaman") return;
    var s = row[IDX.season];
    if (!kBySeason[s] || valueOf(row) > valueOf(kBySeason[s])) kBySeason[s] = row;
  });
  KAMAN_SEASONS = Object.keys(kBySeason).map(function (s) { return kBySeason[s]; })
    .sort(function (a, b) { return a[IDX.season] - b[IDX.season]; });
}

/* ---------- eligibility helpers ---------- */

function capOf(b) { return MODE === "kaman" ? (b === "C" ? 5 : 0) : BUCKET_CAP[b]; }
function bucketOpen(b) { return G.filled[b] < capOf(b); }
function openBuckets() { return BUCKETS.filter(bucketOpen); }
function rowOpenBuckets(row) { return rowBuckets(row).filter(bucketOpen); }
function rowDraftable(row) {
  var dkey = MODE === "kaman" ? String(row[IDX.season]) : row[IDX.name];
  if (G.drafted.has(dkey) || rowOpenBuckets(row).length === 0) return false;
  if (MODE === "cap" && !capAffordable(row)) return false;
  return true;
}

function poolHasEligible(fr, dec) {
  var pool = POOLS.get(key(fr, dec));
  if (!pool) return false;
  var ok = false;
  pool.forEach(function (row) { if (!ok && rowDraftable(row)) ok = true; });
  return ok;
}
function eraHasEligibleFranchise(dec) {
  var list = FR_BY_DEC.get(dec) || [];
  for (var i = 0; i < list.length; i++) if (poolHasEligible(list[i], dec)) return true;
  return false;
}
function availableEras() {
  return DECADES.filter(eraHasEligibleFranchise);
}
// Skip team: other UNUSED franchises in the SAME era that can fill an open slot
function teamSkipTargets() {
  var list = FR_BY_DEC.get(G.cur.dec) || [];
  return list.filter(function (f) { return f !== G.cur.fr && !G.seenFr.has(f) && !G.seenPairs.has(key(f, G.cur.dec)) && poolHasEligible(f, G.cur.dec); });
}
// Skip era: other UNUSED eras where the SAME franchise can fill an open slot
function eraSkipTargets() {
  return DECADES.filter(function (d) {
    // Presti allows repeating an era, so the reroll offers every decade the franchise played
    // in except the current one; other modes keep the distinct-decade rule.
    return d !== G.cur.dec && (MODE === "cap" || !G.seenDec.has(d)) && !G.seenPairs.has(key(G.cur.fr, d)) && poolHasEligible(G.cur.fr, d);
  });
}

/* ---------- game ---------- */

function randFranchise(dec, avoid) {
  var list = (FR_BY_DEC.get(dec) || []).filter(function (f) { return poolHasEligible(f, dec); });
  if (!list.length) list = (FR_BY_DEC.get(dec) || []).slice();
  var fresh = avoid ? list.filter(function (f) { return !avoid.has(f); }) : list;
  var opts = fresh.length ? fresh : list;
  return opts[Math.floor(Math.random() * opts.length)];
}
function pick1(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function newGame(mode) {
  if (mode) MODE = mode;
  G = {
    round: 0,
    picks: [],
    drafted: new Set(),
    filled: { G: 0, F: 0, C: 0 },
    teamSkips: MODE === "cap" ? 2 : 1,
    eraSkips: MODE === "cap" ? 2 : 1,
    yearRerolls: MODE === "cap" ? 2 : 0,
    seenFr: new Set(),
    seenDec: new Set(),
    seenPairs: new Set(),
    cur: null,
    selected: null,
    yearByName: {},
    costByName: {},
    costDir: "desc",
    budget: CAP_BUDGET,
    maxCap: CAP_BUDGET,
    sortMode: MODE === "pro" ? "az" : MODE === "cap" ? "cost" : "min",
    query: "",
    screen: "draft"
  };
  nextRound(true);
}

function nextRound(animate) {
  G.round += 1;
  if (G.round > CFG.ROUNDS) { showResults(); return; }
  if (MODE === "kaman") {
    G.cur = { kaman: true };
    G.selected = null;
    G.yearByName = {};
    renderDraft(animate ? { kaman: true } : false);
    return;
  }
  var tries = 0;
  while (true) {
    tries++;
    var fresh = availableEras().filter(function (d) { return !G.seenDec.has(d); });
    var avail = fresh.length ? fresh : availableEras();   // fall back to a repeat era only if every era's been used
    if (!avail.length) { showResults(); return; }
    var dec = pick1(avail);
    G.cur = { dec: dec, fr: randFranchise(dec, G.seenFr) };
    G.selected = null;
    G.yearByName = {};
    if (MODE === "pro") assignProSeasons();
    else if (MODE === "cap") assignCapPool();
    // Cap: never strand the player — re-roll the era/prices until something is affordable.
    if (MODE !== "cap" || tries > 40 || capPoolHasPick()) break;
  }
  G.seenDec.add(G.cur.dec);
  G.seenFr.add(G.cur.fr);
  G.seenPairs.add(key(G.cur.fr, G.cur.dec));
  renderDraft(animate ? { dec: true, fr: true } : false);
}

// Presti: rerolls are unlimited but each costs $1 of cap. Decrementing the remaining
// budget IS the cap drop (you reroll before spending that dollar). Blocked if it would
// leave too little to fill the open slots ($1 minimum per remaining pick).
function chargeReroll(spinId) {
  var picksToGo = CFG.ROUNDS - G.round + 1;
  if (G.budget - 1 < picksToGo) return false;
  G.budget -= 1;
  G.maxCap -= 1;
  // 1-in-8 free spin: refund the dollar (net cost 0) and flag the pressed button
  // so it can flash "+$1" after renderDraft rebuilds the actions row.
  if (spinId && Math.random() < 0.125) {
    G.budget += 1;
    G.maxCap += 1;
    G.refundFlash = spinId;
  }
  return true;
}

function doTeamSkip() {
  var targets = teamSkipTargets();
  if (!targets.length) return;
  if (MODE === "cap") { if (!chargeReroll("skipTeam")) return; }
  else { if (!G.teamSkips) return; G.teamSkips -= 1; }
  if (MODE === "cap") G.seenFr.delete(G.cur.fr);   // free the tentative franchise (never committed) so skips don't exhaust the pool
  G.cur.fr = pick1(targets);          // same era, different (unused) franchise
  G.seenFr.add(G.cur.fr);
  G.seenPairs.add(key(G.cur.fr, G.cur.dec));
  G.selected = null;
  G.yearByName = {};
  if (MODE === "pro") assignProSeasons();
  else if (MODE === "cap") { assignCapPool(); var ct = 0; while (!capPoolHasPick() && ct < 40) { assignCapPool(); ct++; } }
  renderDraft({ dec: false, fr: true });
}

function doEraSkip() {
  var targets = eraSkipTargets();
  if (!targets.length) return;
  if (MODE === "cap") { if (!chargeReroll("skipEra")) return; }
  else { if (!G.eraSkips) return; G.eraSkips -= 1; }
  // Free the decade we're leaving so deals stay varied — but only if it isn't already locked in by a
  // committed pick, since the reroll can now land on an era you've already drafted.
  if (MODE === "cap" && !G.picks.some(function (p) { return p.dec === G.cur.dec; })) G.seenDec.delete(G.cur.dec);
  G.cur.dec = pick1(targets);         // same franchise, different (unused) era
  G.seenDec.add(G.cur.dec);
  G.seenPairs.add(key(G.cur.fr, G.cur.dec));
  G.selected = null;
  G.yearByName = {};
  if (MODE === "pro") assignProSeasons();
  else if (MODE === "cap") { assignCapPool(); var ce = 0; while (!capPoolHasPick() && ce < 40) { assignCapPool(); ce++; } }
  renderDraft({ dec: true, fr: false });
}

// Cap only: re-roll every player's locked season + price for the current team/era ($1).
function doYearReroll() {
  if (MODE !== "cap") return;
  if (!chargeReroll("rerollYears")) return;
  G.selected = null;
  var prev = {};
  for (var pn in G.yearByName) { if (Object.prototype.hasOwnProperty.call(G.yearByName, pn)) prev[pn] = G.yearByName[pn]; }
  assignCapPool(prev);
  var cy = 0; while (!capPoolHasPick() && cy < 40) { assignCapPool(prev); cy++; }
  renderDraft({ years: true });
}

// Short press haptic for the Presti spin buttons. navigator.vibrate fires on
// Chrome/Android; iOS Safari ignores it (silent no-op). try/catch guards the few
// webviews that throw on the call.
function buzz(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms || 15); } catch (e) {}
}

// One delegated press-haptic for every casino button (skip/draft/start/share/run-it-back),
// so we don't have to wire each one. Capture phase + closest() catches taps on inner spans.
var _hapticsBound = false;
function bindHaptics() {
  if (_hapticsBound) return;
  _hapticsBound = true;
  document.addEventListener("pointerdown", function (e) {
    if (!e.target || !e.target.closest) return;
    var b = e.target.closest("button.presti-spin");
    if (b && !b.disabled) buzz(15);
  }, true);
}

// The 1-in-8 payoff: button turns green and reads "+$1" for 3s, then restores
// whatever label the re-rendered button is showing. Guarded so a later re-render
// that swaps the node out doesn't throw.
function flashRefund(btn) {
  if (!btn) return;
  var original = btn.textContent;
  btn.classList.add("refunded");
  btn.textContent = "REFUND!";
  setTimeout(function () {
    if (!btn.isConnected) return;   // node was replaced by a later render
    btn.classList.remove("refunded");
    btn.textContent = original;
  }, 2000);
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
  return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
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
  var seasons = pool.querySelectorAll(".cap-season");
  if (!seasons.length) return;            // not a cap pool
  var names = pool.querySelectorAll(".pr-name");
  var costs = pool.querySelectorAll(".cap-cost");
  var dur = settleAt || 620;
  var decade = (G.cur && G.cur.dec) ? G.cur.dec : 1990;
  pool.classList.add("scrambling");

  function rSeason() { return shortSeason(decade + Math.floor(Math.random() * 10)); }
  function rCost() { return "$" + (1 + Math.floor(Math.random() * 20)); }
  function paint() {
    var i;
    if (mode === "full") for (i = 0; i < names.length; i++) names[i].textContent = pick1(decoyNames());
    for (i = 0; i < seasons.length; i++) seasons[i].textContent = rSeason();
    for (i = 0; i < costs.length; i++) costs[i].textContent = rCost();
  }

  paint();                                // immediate, so the first paint shows decoys not the real pool
  var gaps = [], t = 55, total = 0;
  while (total + t < dur) { gaps.push(t); total += t; t *= 1.18; }
  var acc = 0;
  gaps.forEach(function (g) { setTimeout(function () { if (pool.isConnected) paint(); }, acc); acc += g; });
  setTimeout(function () {
    if (!pool.isConnected) return;
    pool.classList.remove("scrambling");
    refreshPool();                        // restore the real rows + re-enable interaction
    buzz(20);                             // final thump as everything locks in
  }, dur);
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
function assignProSeasons() {
  var k = key(G.cur.fr, G.cur.dec);
  var pool = POOLS.get(k), yrs = POOL_YEARS.get(k);
  if (!pool || !yrs) return;
  pool.forEach(function (row, name) {
    var arr = yrs.get(name);
    if (arr && arr.length) G.yearByName[name] = arr[Math.floor(Math.random() * arr.length)][IDX.season];
  });
}

/* ---------- Salary Cap mode ----------
   $50 budget, seasons locked random, every player priced off that season's value with
   a steep quadratic curve + fat-tailed roll. Calibrated (Monte Carlo vs the real engine,
   1 team + 1 era skip) so even optimal play sneaks an 82-0 roster under the cap ~1 in 50
   boards — and so stars genuinely cost a third-plus of the cap, forcing real tradeoffs. */
var CAP_BUDGET = 50;
function capRoll() {
  var u = Math.random();
  if (u < 0.55) return 0.85 + 0.30 * Math.random();   // 55% normal
  if (u < 0.80) return 0.55 + 0.25 * Math.random();   // 25% fire-sale
  return 1.25 + 0.35 * Math.random();                 // 20% gouged
}
function capCost(v) {
  return Math.max(1, Math.round(0.26 * Math.pow(Math.max(v, 1), 2) * capRoll()));
}
// Lock each pool player to a random season AND price it off that season's value.
function assignCapPool(avoid) {
  var k = key(G.cur.fr, G.cur.dec);
  var pool = POOLS.get(k), yrs = POOL_YEARS.get(k);
  G.costByName = {};
  if (!pool || !yrs) return;
  pool.forEach(function (row, name) {
    var arr = yrs.get(name);
    if (arr && arr.length) {
      var cands = arr;
      if (avoid && avoid[name] != null && arr.length > 1) {   // don't land the same year twice in a row when there's an alternative
        var alt = arr.filter(function (r) { return r[IDX.season] !== avoid[name]; });
        if (alt.length) cands = alt;
      }
      var pickRow = cands[Math.floor(Math.random() * cands.length)];
      G.yearByName[name] = pickRow[IDX.season];
      G.costByName[name] = capCost(valueOf(pickRow));
    }
  });
}
// Affordable if it still leaves at least $1 for every remaining pick (never strand).
function capAffordable(row) {
  var c = G.costByName ? G.costByName[row[IDX.name]] : null;
  if (c == null) return true;
  var picksAfter = CFG.ROUNDS - G.round;
  return c <= G.budget - picksAfter;
}
function capPoolHasPick() {
  var rows = currentPoolRows();
  for (var i = 0; i < rows.length; i++) if (rowDraftable(resolveRow(rows[i][IDX.name]))) return true;
  return false;
}

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
      var ca = G.costByName ? (G.costByName[a[IDX.name]] || 0) : 0;
      var cb = G.costByName ? (G.costByName[b[IDX.name]] || 0) : 0;
      return (dir * (ca - cb)) || cmpName(a, b);   // tiebreak: alphabetical
    });
  } else {
    rows.sort(function (a, b) { return (poolMaxMin(b[IDX.name]) - poolMaxMin(a[IDX.name])) || cmpName(a, b); });
  }
}

function currentPoolRows() {
  if (MODE === "kaman") { return KAMAN_SEASONS.slice(); }
  var pool = POOLS.get(key(G.cur.fr, G.cur.dec));
  var rows = [];
  if (pool) pool.forEach(function (row, name) { if (!G.drafted.has(name)) rows.push(row); });
  var q = (G.query || "").trim().toLowerCase();
  if (q) rows = rows.filter(function (r) { return r[IDX.name].toLowerCase().indexOf(q) !== -1; });
  sortPoolRows(rows);
  return rows;
}

// The row to use for a player in the current cell: the user's chosen season if
// one is set (and still valid for this cell), otherwise the best season (default).
function resolveRow(name) {
  if (MODE === "kaman") {
    var s = parseInt(name, 10);
    for (var ki = 0; ki < KAMAN_SEASONS.length; ki++) if (KAMAN_SEASONS[ki][IDX.season] === s) return KAMAN_SEASONS[ki];
    return null;
  }
  var k = key(G.cur.fr, G.cur.dec);
  var sel = G.yearByName ? G.yearByName[name] : undefined;
  if (sel !== undefined && sel !== null) {
    var yrs = POOL_YEARS.get(k);
    var arr = yrs ? yrs.get(name) : null;
    if (arr) for (var i = 0; i < arr.length; i++) if (arr[i][IDX.season] === sel) return arr[i];
  }
  var pool = POOLS.get(k);
  return pool ? pool.get(name) : null;
}

function confirmPick(bucket) {
  if (!G.selected) return;
  var row = resolveRow(G.selected);
  if (!row || !rowDraftable(row)) return;
  var opts = rowOpenBuckets(row);
  if (opts.indexOf(bucket) === -1) bucket = opts[0];
  G.drafted.add(G.selected);   // classic/pro: by player name; Kaman: by season (each once)
  G.filled[bucket] += 1;
  G.picks.push({ row: row, fr: MODE === "kaman" ? null : G.cur.fr, dec: MODE === "kaman" ? null : G.cur.dec, slot: bucket });
  if (MODE === "cap" && G.costByName && G.costByName[G.selected] != null) G.budget -= G.costByName[G.selected];
  nextRound(true);
}

/* ---------- engine (position-independent) ---------- */

function engine(pickRows, slots) {
  var sumV = 0, sumUsage = 0, sumSp = 0, sumObpm = 0, sumDbpm = 0;
  pickRows.forEach(function (row) {
    sumV += valueOf(row);
    sumUsage += row[IDX.usage];
    sumSp += row[IDX.sp];
    sumObpm += row[IDX.obpm];
    sumDbpm += row[IDX.dbpm];
  });
  var usageTax = SC.USAGE_RATE * Math.max(0, sumUsage - SC.USAGE_BUDGET);
  var spacingTax = SC.SPACING_TAX * Math.max(0, SC.SPACERS_REQ - sumSp);
  var spacingBonus = (SC.SPACING_BONUS || 0) * Math.max(0, sumSp - SC.SPACERS_REQ);

  // Backcourt / wing defense penalties on the two G-slot and two F-slot players
  // (needs slot info): both bottom-25% defenders by DBPM = -2, both bottom-10% = -3
  // (ladder, per position group).
  var backDefTax = 0, backDefTier = 0, wingDefTax = 0, wingDefTier = 0;
  if (slots) {
    var gr = [], fr = [];
    for (var s = 0; s < pickRows.length; s++) {
      if (slots[s] === "G") gr.push(pickRows[s]);
      else if (slots[s] === "F") fr.push(pickRows[s]);
    }
    if (gr.length === 2) {
      var da = gr[0][IDX.dbpm], db = gr[1][IDX.dbpm];
      if (da <= SC.GD_BOTTOM10 && db <= SC.GD_BOTTOM10) { backDefTax = SC.BACKCOURT_D_TAX_10; backDefTier = 10; }
      else if (da <= SC.GD_BOTTOM25 && db <= SC.GD_BOTTOM25) { backDefTax = SC.BACKCOURT_D_TAX_25; backDefTier = 25; }
    }
    if (fr.length === 2) {
      var fa = fr[0][IDX.dbpm], fb = fr[1][IDX.dbpm];
      if (fa <= SC.FD_BOTTOM10 && fb <= SC.FD_BOTTOM10) { wingDefTax = SC.WING_D_TAX_10; wingDefTier = 10; }
      else if (fa <= SC.FD_BOTTOM25 && fb <= SC.FD_BOTTOM25) { wingDefTax = SC.WING_D_TAX_25; wingDefTier = 25; }
    }
  }

  var score = sumV - usageTax - spacingTax + spacingBonus - backDefTax - wingDefTax;
  var net = score - BASELINE;
  var p = phi(net / SC.NET_SD);
  return {
    sumV: sumV, sumUsage: sumUsage, sumSp: sumSp,
    sumObpm: sumObpm, sumDbpm: sumDbpm,
    usageTax: usageTax, spacingTax: spacingTax, spacingBonus: spacingBonus,
    backDefTax: backDefTax, backDefTier: backDefTier,
    wingDefTax: wingDefTax, wingDefTier: wingDefTier,
    score: score, net: net, p: p,
    projW: CFG.GAMES_IN_SEASON * p,
    winTally: Math.min(CFG.GAMES_IN_SEASON, Math.ceil(CFG.GAMES_IN_SEASON * p)),
    p82: Math.pow(p, CFG.GAMES_IN_SEASON) + CFG.GAMES_IN_SEASON * Math.pow(p, CFG.GAMES_IN_SEASON - 1) * (1 - p)
  };
}

/* ---------- formatting ---------- */

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function titleCase(fr) { return fr.split(" ").map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }).join(" "); }
function decLabel(dec) { return "\u2019" + String(dec).slice(2) + "s"; }
// Optional custom era crest for the current franchise+decade. Keyed exactly like
// the draft pools: "FRANCHISE|decade" (e.g. "HEAT|1990"). A per-combo crest wins;
// otherwise CREST_DEFAULT (if set) applies to every combo; otherwise null.
function crestFor(fr, dec) { return CRESTS[key(fr, dec)] || CREST_DEFAULT || null; }
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
  if (row[IDX.sp] === 1) out.push('<span class="chip">3PT</span>');
  return out.length ? '<span class="chips">' + out.join("") + "</span>" : "";
}
function bucketTag(row) { return rowBuckets(row).join("/"); }

/* ---------- rendering: shared ---------- */

function el(id) { return document.getElementById(id); }
function app() { return el("app"); }

function renderPips() {
  var box = el("roundPips");
  if (!box) return;
  if (!G || G.screen !== "draft") { box.innerHTML = ""; return; }
  var doneCount = G.round - 1;
  var nowIndex = G.round;
  var html = "";
  for (var i = 1; i <= CFG.ROUNDS; i++) {
    var cls = i <= doneCount ? "done" : (i === nowIndex ? "now" : "");
    html += "<span class=\"" + cls + "\"></span>";
  }
  box.innerHTML = html;
}

/* ---------- intro ---------- */

function startOverBtnHtml() {
  return '<button class="startover-btn" id="startOverBtn" type="button">\u2039 Start over</button>';
}
function wireStartOver() {
  var b = el("startOverBtn");
  if (b) b.addEventListener("click", function () { renderIntro(); });
}

function renderIntro() {
  G = null;
  document.body.classList.remove("drafting");
  renderPips();
  app().innerHTML =
    '<section class="ticket intro">' +
      '<h1 class="intro-title">Go 82\u20130</h1>' +
      '<p class="intro-lead">An \u201C82\u20130\u201D-style game, but driven by advanced metrics instead of just adding up counting stats. Pick a team that would actually win IRL. Try to go undefeated. Compare your team vs the all-timers.</p>' +
      '<button class="btn btn-primary btn-block presti-spin" id="startClassic">\uD83C\uDFC0 Classic \u00B7 full stats</button>' +
      '<button class="btn btn-primary btn-block presti-spin" id="startPro">\uD83C\uDFC6 Pro \u00B7 pick the best seasons from memory</button>' +
      '<button class="btn btn-primary btn-block presti-spin" id="startCap">\uD83D\uDC10 Presti Mode \u00B7 Salary Cap &amp; Random</button>' +
      '<p class="eyebrow">Draft</p>' +
      "<p>Draft a 5-man roster with 2 guards, 2 forwards, and a center. You get a random team from a random decade. Pick a guy who played for that team in that era. Pick any season he played. You can reroll the era and the team once each per draft.</p>" +
      '<p class="eyebrow">Winning</p>' +
      "<p>Recommended to have at least <strong>3 shooters</strong> and <strong>1 role player</strong>. Based mostly on OBPM and DBPM (why we only go back to 1974) + some minor custom tweaks. Some players from low/no 3pt era get 3pt shooter bonuses based on reputation and vibes.</p>" +
      '<button class="btn btn-primary btn-block btn-dark presti-spin" id="startKaman">\uD83E\uDDB4 Kaman Mode \u00B7 KAMAN</button>' +
    "</section>";
  el("startClassic").addEventListener("click", function () { newGame("classic"); });
  el("startPro").addEventListener("click", function () { newGame("pro"); });
  el("startKaman").addEventListener("click", function () { newGame("kaman"); });
  el("startCap").addEventListener("click", function () { newGame("cap"); });
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
function lineupRailHtml() {
  var cells = [];
  BUCKETS.forEach(function (b) {
    var inB = G.picks.filter(function (p) { return p.slot === b; });
    for (var i = 0; i < capOf(b); i++) {
      var p = inB[i];
      if (p) {
        var nm = p.row[IDX.name];
        cells.push('<div class="lineup-slot filled" data-slot="' + b + '" role="listitem">' +
          '<span class="ls-token">' + esc(lineupInitials(nm)) + '<i class="ls-pos">' + b + "</i></span>" +
          '<span class="ls-name" title="' + esc(nm) + '">' + esc(lineupLastName(nm)) + "</span></div>");
      } else {
        cells.push('<div class="lineup-slot open" data-slot="' + b + '" role="listitem">' +
          '<span class="ls-token is-open">' + b + "</span>" +
          '<span class="ls-name ls-open">open</span></div>');
      }
    }
  });
  return '<div class="lineup-rail" role="list" aria-label="Your lineup">' + cells.join("") + "</div>";
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
  var costNote = (MODE === "cap" && G.costByName && G.costByName[G.selected] != null) ? " \u00B7 $" + G.costByName[G.selected] : "";
  var spinCls = " presti-spin";   // casino skin on the draft/position buttons, all modes
  if (opts.length === 1) {
    return '<button class="confirm-btn' + spinCls + '" data-bucket="' + opts[0] + '">Draft your player</button>';
  }
  return '<div class="confirm-label">Assign ' + who + " " + yr + costNote + " to:</div>" +
    '<div class="confirm-multi">' + opts.map(function (b) {
      return '<button class="confirm-btn' + spinCls + '" data-bucket="' + b + '">' + BUCKET_NAME[b] + "</button>";
    }).join("") + "</div>";
}

function bindConfirm() {
  var inner = el("trayInner");
  if (!inner) return;
  inner.querySelectorAll(".confirm-btn").forEach(function (b) {
    b.addEventListener("click", function () { confirmPick(b.getAttribute("data-bucket")); });
  });
}
function updateTray() {
  var inner = el("trayInner");
  if (!inner) return;
  document.body.classList.toggle("has-pick", !!G.selected);
  inner.innerHTML = trayHtml() + confirmHtml();
  bindConfirm();
}

/* the season picker shown in each player row (only when >1 season exists) */
function yearControlHtml(name, row) {
  var yrs = POOL_YEARS.get(key(G.cur.fr, G.cur.dec));
  var arr = yrs ? yrs.get(name) : null;
  if (!arr || arr.length <= 1) {
    return "<span>" + shortSeason(row[IDX.season]) + " " + esc(row[IDX.team]) + "</span>";
  }
  var cur = row[IDX.season];
  var opts = arr.map(function (r) {
    var s = r[IDX.season];
    return '<option value="' + s + '"' + (s === cur ? " selected" : "") + ">" +
      shortSeason(s) + " " + esc(r[IDX.team]) + "</option>";
  }).join("");
  return '<select class="year-sel" data-name="' + esc(name) + '" aria-label="Season for ' + esc(name) + '">' + opts + "</select>";
}

/* one draft-pool row (a div[role=button] so it can legally contain the <select>) */
function poolRowHtml(bestRow) {
  if (MODE === "kaman") return kamanRowHtml(bestRow);
  if (MODE === "cap") return capRowHtml(bestRow);
  var name = bestRow[IDX.name];
  var row = resolveRow(name);
  var open = rowDraftable(row);
  var sel = (G.selected === name) && open;
  var cls = "player-row" + (sel ? " sel" : "") + (open ? "" : " off");
  var tag = bucketTag(row) + (open ? "" : " \u00B7 full");
  var sub1 = yearControlHtml(name, row) + (MODE === "classic" ? chipsFor(row) : "");
  var sub2 = (MODE === "classic") ? '<span class="pr-sub pr-stats">' + statLine(row) + "</span>" : "";
  return '<div class="' + cls + '" role="button" tabindex="0" data-name="' + esc(name) + '" aria-pressed="' + sel + '"' +
    (open ? "" : ' aria-disabled="true"') + ">" +
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
function capRowHtml(bestRow) {
  var name = bestRow[IDX.name];
  var row = resolveRow(name);
  var taken = G.drafted.has(name);
  var afford = capAffordable(row);
  var noSlot = rowOpenBuckets(row).length === 0;
  var open = !taken && !noSlot && afford;
  var sel = (G.selected === name) && open;
  var cost = G.costByName ? G.costByName[name] : null;
  var why = taken ? " \u00B7 picked" : (noSlot ? " \u00B7 full" : (afford ? "" : " \u00B7 over"));
  var cls = "player-row cap-row" + (sel ? " sel" : "") + (open ? "" : " off");
  return '<div class="' + cls + '" role="button" tabindex="0" data-name="' + esc(name) + '" aria-pressed="' + sel + '"' +
    (open ? "" : ' aria-disabled="true"') + ">" +
    '<span class="pr-top"><span class="pr-name">' + esc(name) + "</span>" +
    '<span class="cap-cost">' + (cost != null ? "$" + cost : "") + "</span></span>" +
    '<span class="pr-sub"><span class="cap-season">' + shortSeason(row[IDX.season]) + " " + esc(row[IDX.team]) +
    '</span><span class="pr-pos">' + bucketTag(row) + why + "</span></span></div>";
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
  document.body.classList.add("drafting");
  renderPips();
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
      '<div class="ticket-actions">' +
        '<button class="skip-btn' + spinCls + '" id="skipTeam"' + (teamSkippable ? "" : " disabled") + ">Skip team " + (MODE === "cap" ? "-$1" : "\u00B7 " + G.teamSkips + " left") + "</button>" +
        '<button class="skip-btn' + spinCls + '" id="skipEra"' + (eraSkippable ? "" : " disabled") + ">Skip era " + (MODE === "cap" ? "-$1" : "\u00B7 " + G.eraSkips + " left") + "</button>" +
        (MODE === "cap" ? '<button class="skip-btn presti-spin" id="rerollYears"' + (yearRerollable ? "" : " disabled") + ">Skip yrs -$1</button>" : "") +
      "</div>" +
    "</section>";
  }

  var poolHeadHtml;
  if (MODE === "kaman") {
    poolHeadHtml = '<div class="pool-head"><span class="pool-count">pick a Kaman season \u00B7 repeats welcome</span></div>';
  } else {
    var chips = MODE === "cap" ? [["cost", "$"], ["min", "Min"], ["az", "A\u2013Z"]] : [["min", "Min"], ["az", "A\u2013Z"]];
    if (MODE === "classic") chips.push(["obpm", "Off"], ["dbpm", "Def"]);
    var chipsHtml = chips.map(function (c) {
      var label = c[1];
      if (c[0] === "cost" && G.sortMode === "cost") label = "$ " + (G.costDir === "asc" ? "\u2191" : "\u2193");
      return '<button class="sort-chip' + (G.sortMode === c[0] ? " active" : "") + '" data-sort="' + c[0] + '">' + label + "</button>";
    }).join("");
    poolHeadHtml = '<div class="pool-head pool-head-tools">' +
      '<div class="sort-chips" id="sortChips">' + chipsHtml + "</div>" +
      '<input type="search" id="poolSearch" class="pool-search" placeholder="filter players\u2026" autocomplete="off" spellcheck="false">' +
      "</div>";
  }

  var proHint = MODE === "pro"
    ? '<p class="pro-hint"><span class="info-i">i</span> <em>Each player\u2019s season is randomized</em>. Change the season using the \u25BE menu.</p>'
    : "";

  var capBar = MODE === "cap"
    ? '<div class="cap-bar">' +
        '<span class="cap-bar-amt">$' + G.budget + '</span>' +
        '<span class="cap-bar-sub">left</span>' +
        '<button class="cap-info" id="capInfo" aria-expanded="false" aria-label="How Salary Cap works">i</button>' +
      '</div>' +
      '<div class="cap-tip" id="capTip" hidden>$50 salary cap. Player salaries are randomized each round to fair value, bargain, or rip-off. Player year available is also randomized. Unlimited rerolls of team, era, player years, but it costs $1 from your salary cap each time. Possibly unwinnable.</div>'
    : "";

  app().innerHTML =
    startOverBtnHtml() +
    ticketHtml +
    capBar +
    poolHeadHtml +
    proHint +
    '<div class="pool" id="pool">' + poolHtml + "</div>" +
    '<div class="tray"><div class="tray-inner" id="trayInner"></div></div>';

  updateTray();

  wireStartOver();
  var searchEl = el("poolSearch");
  if (searchEl) {
    searchEl.addEventListener("input", function () { G.query = searchEl.value; refreshPool(); });
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
      }
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
  var capInfo = el("capInfo");
  if (capInfo) capInfo.addEventListener("click", function () {
    var tip = el("capTip");
    if (!tip) return;
    var hidden = tip.hasAttribute("hidden");
    if (hidden) { tip.removeAttribute("hidden"); capInfo.setAttribute("aria-expanded", "true"); }
    else { tip.setAttribute("hidden", ""); capInfo.setAttribute("aria-expanded", "false"); }
  });
  el("pool").addEventListener("click", function (ev) {
    if (ev.target.closest(".year-sel")) return;     // the dropdown handles its own taps
    var btn = ev.target.closest(".player-row");
    if (!btn || btn.classList.contains("off")) return;
    selectRow(btn);
  });
  el("pool").addEventListener("keydown", function (ev) {
    var t = ev.target;
    if (!t.classList || !t.classList.contains("player-row")) return;  // not the card (e.g. the <select>)
    if (ev.key !== "Enter" && ev.key !== " " && ev.key !== "Spacebar") return;
    if (t.classList.contains("off")) return;
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
    if (G.selected === name && !rowDraftable(resolveRow(name))) G.selected = null;  // chosen year fits no open slot
    refreshPool();
  });

  if (MODE === "cap") {
    if (G.refundFlash) { flashRefund(el(G.refundFlash)); G.refundFlash = null; }
  }

  if (anim) {
    if (MODE === "kaman") {
      if (anim.kaman) reveal("kamanBig");   // nothing to reel through — keep the pop
    } else if (anim.years) {
      scramblePool("years", 620);           // cap-only: spin just the pool years/prices
    } else if (anim.dec || anim.fr) {
      var crestLand = spinReels(anim);       // ticket slot-reels: Classic / Pro / Presti
      if (MODE === "cap") scramblePool("full", crestLand + 120); // pool roulette: cap only
    }
    window.scrollTo(0, 0);
  }
}

/* reveal animation: a quick pop on the true value — never shows a wrong one */
function reveal(id) {
  var node = el(id);
  if (!node) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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

function climbHtml(e) {
  var legends = META.legends || [];
  var G82 = CFG.GAMES_IN_SEASON;
  var FLOOR = 62, TOP = G82, TEAM_TOP = 73;     // 73 = highest real team ('16 Warriors)
  var LADDER_TOP = legends.reduce(function (m, L) { return Math.max(m, L.wins); }, TEAM_TOP);  // top pin sets the scale
  var youWins = e.winTally;          // integer record places the dot and drives comparisons
  var below = youWins < FLOOR;

  // Layout in pixels so per-win spacing in the cluster stays fixed (~18px/win) no matter how
  // many pins there are; the track height ADAPTS. A below-floor five needs a little room under
  // the Spurs for its marker, an on-board five ends flush at the Spurs. The empty
  // LADDER_TOP->82 span compresses into the top band. RX must equal --rail-x.
  var PX_PER_WIN = 200 / 11;                    // the original 62->73 cluster spacing
  var BAND_PX = 60, CLUSTER_PX = Math.round((LADDER_TOP - FLOOR) * PX_PER_WIN), FLOOR_PX = BAND_PX + CLUSTER_PX;
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
      '<span class="climb-tag' + (isC ? " comp" : "") + '" style="top:' + y + '%">' + esc(L.label) + ' <b>' + L.wins + "</b></span>";
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
  return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}
var FW_EMOJI = ["\uD83D\uDC10", "\uD83C\uDFC0", "\uD83C\uDFC6"];   // goat, basketball, trophy
function goatBurst(box, cx, cy) {
  for (var i = 0; i < 20; i++) {
    var g = document.createElement("span");
    g.className = "goat-particle";
    g.textContent = FW_EMOJI[(Math.random() * FW_EMOJI.length) | 0];
    var ang = Math.random() * Math.PI * 2, dist = 60 + Math.random() * 130;
    g.style.left = cx + "px";
    g.style.top = cy + "px";
    g.style.fontSize = (15 + Math.random() * 16).toFixed(0) + "px";
    g.style.setProperty("--dx", (Math.cos(ang) * dist).toFixed(0) + "px");
    g.style.setProperty("--dy", (Math.sin(ang) * dist).toFixed(0) + "px");
    g.style.setProperty("--rot", (Math.random() * 120 - 60).toFixed(0) + "deg");
    g.style.animationDelay = (Math.random() * 0.07).toFixed(3) + "s";
    box.appendChild(g);
    (function (node) { setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 1700); })(g);
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

var HH_SEGMENTS = [
  { label: "COLD",      m: 1.0,  odds: 25, lvl: 0 },
  { label: "WARM",      m: 1.2,  odds: 30, lvl: 1 },
  { label: "HOT",       m: 1.35, odds: 25, lvl: 2 },
  { label: "ON FIRE",   m: 1.6,  odds: 15, lvl: 3 },
  { label: "SUPERNOVA", m: 2.5,  odds: 5,  lvl: 4 }
];
var HH_BONUS_SCALE = 0.67;   // hot-hand bonus dialed down a flat 33%

// Net at which the season flips to 82-0 (smallest net where ceil(82*phi(net/NET_SD)) hits 82).
function hhNet82() {
  var lo = 0, hi = 80;
  for (var k = 0; k < 48; k++) {
    var mid = (lo + hi) / 2;
    if (Math.ceil(CFG.GAMES_IN_SEASON * phi(mid / SC.NET_SD)) >= CFG.GAMES_IN_SEASON) hi = mid; else lo = mid;
  }
  return hi;
}

// Weighted-random starter, biased hard toward value (your star tends to erupt; a
// near-certain whiff on the weakest pick stays rare).
function hhPickHot() {
  var w = G.picks.map(function (p) { var v = Math.max(0.5, valueOf(p.row)); return v * v; });
  var sum = w.reduce(function (a, b) { return a + b; }, 0), r = Math.random() * sum;
  for (var i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; }
  return w.length - 1;
}

function hhSpinSeg() {
  var r = Math.random() * 100, acc = 0;
  for (var i = 0; i < HH_SEGMENTS.length; i++) { acc += HH_SEGMENTS[i].odds; if (r < acc) return i; }
  return 0;
}

// Fires on every drafted result that isn't already a perfect 82-0 (Kaman has its own
// results path and never reaches here). Far-from-perfect rosters still get the spin -
// the lever pull and wheel are the variable-reward hit; near-perfect ones can cross.
function hhEligible(e) {
  return !!(G.picks && G.picks.length >= CFG.ROUNDS && e.winTally < CFG.GAMES_IN_SEASON);
}

function hotHand(e) {
  var hotIdx = hhPickHot(), segIdx = hhSpinSeg(), seg = HH_SEGMENTS[segIdx];
  var hotV = valueOf(G.picks[hotIdx].row), THRESH = hhNet82();
  var newNet = e.net + (seg.m - 1) * hotV * HH_BONUS_SCALE, win = newNet > THRESH;
  var names = G.picks.map(function (p) { return shareSurname(p.row[IDX.name]); });
  var ITEM = 54, COPIES = 6, targetFlat = (COPIES - 2) * names.length + hotIdx;

  var stripHtml = "", c, n, s;
  for (c = 0; c < COPIES; c++) for (n = 0; n < names.length; n++) stripHtml += '<div class="hh-name">' + esc(names[n]) + "</div>";
  var segHtml = "";
  for (s = 0; s < HH_SEGMENTS.length; s++) segHtml += '<div class="hh-seg lvl' + HH_SEGMENTS[s].lvl + '"></div>';

  var ov = document.createElement("div");
  ov.className = "hh-overlay";
  ov.innerHTML =
    '<button class="hh-skip" id="hhSkip">skip \u2192</button>' +
    '<div class="hh-card"><div class="goat-fw" id="hhFw" aria-hidden="true"></div>' +
      '<div class="hh-eyebrow">Heat Check</div>' +
      '<div class="hh-lever" id="hhLever" role="button" tabindex="0" aria-label="Pull the basketball through the hoop">' +
        '<span class="hh-fire" aria-hidden="true"><i></i><i></i><i></i></span>' +
        '<span class="hh-ball" id="hhArm">' +
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
      '</div>' +
      '<div class="hh-stage">' +
        '<div class="hh-step" id="hhStep1">' +
          '<div class="hh-window"><div class="hh-strip" id="hhStrip">' + stripHtml + '</div><span class="hh-payline"></span></div></div>' +
        '<div class="hh-step" id="hhStep2">' +
          '<div class="hh-heat">' + segHtml + '</div><div class="hh-heatlabel" id="hhHeatLabel">\u00B7</div></div>' +
        '<div class="hh-step" id="hhStep3">' +
          '<div class="hh-net" id="hhNet">' + e.net.toFixed(1) + '</div>' +
          '<div class="hh-bar"><span class="hh-fill" id="hhFill"></span><span class="hh-thresh"></span></div></div>' +
        '<div class="hh-verdict" id="hhVerdict"></div>' +
        '<div class="hh-actions" id="hhActions">' +
          '<button class="hh-btn presti-spin" id="hhSee">SEE YOUR TEAM</button>' +
          '<button class="hh-btn presti-spin" id="hhAgain">RUN IT BACK</button>' +
        '</div>' +
      '</div></div>';
  document.body.appendChild(ov);
  var fillEl = ov.querySelector("#hhFill");
  fillEl.style.transform = "scaleX(" + Math.min(1, e.net / THRESH).toFixed(4) + ")";
  requestAnimationFrame(function () { ov.classList.add("in"); });

  function dismiss() { if (ov.parentNode) ov.parentNode.removeChild(ov); }
  function segs() { return ov.querySelectorAll(".hh-seg"); }

  function verdict() {
    var v = ov.querySelector("#hhVerdict");
    if (win) {
      ov.classList.add("won");
      v.innerHTML = '<div class="hh-stamp">82\u20130</div>';
      buzz(45);
      var fw = ov.querySelector("#hhFw"); if (fw && !reducedMotion()) fireGoats(fw);
      G.hotWin = newNet;                                   // promote the result to 82-0 (headline + share)
      var big = document.querySelector(".big"); if (big) big.textContent = "82\u20130";
      var bl = document.querySelector(".big-label"); if (bl) bl.textContent = "net rating " + signed1(newNet);
    } else {
      ov.classList.add("missed");
      v.innerHTML = '<div class="hh-stamp miss">' + (THRESH - newNet).toFixed(1) + ' SHORT</div>';
      buzz(10);
    }
    v.classList.add("on");
    ov.querySelector("#hhActions").classList.add("on");
  }

  function climb() {
    ov.querySelector("#hhStep3").classList.add("on");
    var numEl = ov.querySelector("#hhNet"), start = e.net, dur = 1650, t0 = performance.now();
    (function frame(now) {
      if (!ov.parentNode) return;
      var t = Math.min(1, (now - t0) / dur), k = 1 - Math.pow(1 - t, 4.5);   // hard ease-out = crawl/stall near the line
      var val = start + (newNet - start) * k;
      numEl.textContent = val.toFixed(1);
      fillEl.style.transform = "scaleX(" + Math.min(1, Math.max(0, val / THRESH)).toFixed(4) + ")";
      if (val >= THRESH) numEl.classList.add("over");
      if (t < 1) requestAnimationFrame(frame); else verdict();
    })(t0);
  }

  function heat() {
    ov.querySelector("#hhStep2").classList.add("on");
    var cs = segs(), N = cs.length, label = ov.querySelector("#hhHeatLabel"), order = [], i, l;
    var laps = 4;                                                 // longer base spin (chaotic-test length)
    for (l = 0; l < laps; l++) for (i = 0; i < N; i++) order.push(i);
    for (i = 0; i <= segIdx; i++) order.push(i);                   // sweep up to the target

    // Mario Party endings: after "arriving," the wheel keeps drifting and settles on an
    // adjacent notch - often overshooting and ticking back a slot (pure theater; the
    // outcome was decided up front). Pick one, weighted toward having some hijink.
    var up = segIdx + 1, down = segIdx - 1, endings = [[]];        // [] = clean stop
    if (segIdx < N - 1) endings.push([up, segIdx]);               // overshoot one, tick BACK
    if (segIdx > 0)     endings.push([down, segIdx]);             // dip back one, recover
    if (segIdx > 0 && segIdx < N - 1) endings.push([up, down, segIdx]);  // wobble both ways, settle
    if (segIdx < 4) { var tease = []; for (i = segIdx + 1; i <= 4; i++) tease.push(i); tease.push(segIdx); endings.push(tease); }  // SUPERNOVA tease, fall back
    var pick = (Math.random() < 0.8 && endings.length > 1) ? endings[1 + Math.floor(Math.random() * (endings.length - 1))] : endings[0];
    var base = order.length;
    for (i = 0; i < pick.length; i++) order.push(pick[i]);
    order[order.length - 1] = segIdx;                             // guarantee the final rest is the real result

    // gaps: smooth deceleration through the spin, then slow + slightly uneven "settle" ticks,
    // all stretched ~50% for the drawn-out, readable Mario Party cadence.
    var gaps = [], t = 38;
    for (i = 0; i < order.length; i++) {
      if (i < base) { gaps.push(t * 1.5); t *= 1.085; }
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
        label.style.transform = "scale(" + (j < base ? 1.18 : 1) + ")";   // dice-block "grows when fast," shrinks into the lock
        buzz(j >= base ? 11 : 5);                                  // chunkier ticks during the suspense
        if (j === order.length - 1) {
          for (var f = 0; f <= segIdx; f++) cs[f].classList.add("fill");
          cs[segIdx].classList.add("result");
          buzz(segIdx === 4 ? 40 : 18);
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

  function run() { if (reducedMotion()) { ov.classList.add("reduced"); verdict(); } else reel(); }

  // Pull the basketball down through the hoop (drag = embodied agency) or tap/Enter
  // (auto-dunk). At the bottom it catches fire, then the sequence fires once.
  var lever = ov.querySelector("#hhLever"), arm = ov.querySelector("#hhArm");
  var TRAVEL = 150, dragging = false, startY = 0, pull = 0, fired = false;
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
    setTimeout(function () { ov.classList.add("lit"); run(); }, 640);      // let it burn a beat, then start
  }
  lever.addEventListener("pointerdown", function (ev) {
    if (fired) return;
    dragging = true; startY = ev.clientY; arm.style.transition = "none"; lever.classList.add("pulling"); buzz(8);
    if (lever.setPointerCapture) try { lever.setPointerCapture(ev.pointerId); } catch (e2) {}
  });
  lever.addEventListener("pointermove", function (ev) { if (dragging && !fired) setPull((ev.clientY - startY) / TRAVEL); });
  lever.addEventListener("pointerup", function () { if (dragging && !fired) { dragging = false; fire(); } });
  lever.addEventListener("pointercancel", function () { if (dragging && !fired) { dragging = false; lever.classList.remove("pulling", "ignited"); arm.style.transition = "transform .3s ease"; setPull(0); } });
  lever.addEventListener("keydown", function (ev) { if ((ev.key === "Enter" || ev.key === " ") && !fired) { ev.preventDefault(); fire(); } });

  ov.querySelector("#hhSkip").addEventListener("click", dismiss);
  ov.querySelector("#hhSee").addEventListener("click", dismiss);
  ov.querySelector("#hhAgain").addEventListener("click", function () { dismiss(); newGame(); });
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
function shareText(e) {
  var hot = (typeof G.hotWin === "number");                       // a Hot Hand win counts as a real 82-0
  var wins = hot ? CFG.GAMES_IN_SEASON : e.winTally;
  var netVal = hot ? G.hotWin : e.net;
  var losses = CFG.GAMES_IN_SEASON - wins, undef = wins >= CFG.GAMES_IN_SEASON;
  var head, line2;
  if (MODE === "cap") {
    // Presti: result emoji moves up to the title (basketball = missed, trophy = 82-0);
    // line 2 swaps the result emoji for cap space ($ left under the $50 cap).
    head = (undef ? "\uD83C\uDFC6" : "\uD83C\uDFC0") + " TRUE 82 (Presti Mode)";
    line2 = wins + "-" + losses + " | $" + G.budget + " Cap Spc | Net " + signed1(netVal);
  } else {
    head = "\uD83C\uDFC0 TRUE 82 (" + shareModeLabel() + ")";
    line2 = (undef ? "\uD83C\uDFC6" : "\uD83D\uDCCA") + " " + wins + (undef ? "\u2013" : "-") + losses + " |  Net " + signed1(netVal);
  }
  var rows = picksInSlotOrder().map(function (entry) {
    var p = entry.p;
    return p.slot + " '" + String(p.row[IDX.season]).slice(-2) + " " + shareSurname(p.row[IDX.name]);
  });
  return head + "\n" + line2 + "\n\n" + rows.join("\n") + "\n\ntrue82.net";
}

function flashShareBtn(msg) {
  var b = el("shareTeamBtn");
  if (!b) return;
  b.textContent = msg;
  setTimeout(function () { var b2 = el("shareTeamBtn"); if (b2) b2.textContent = "SHARE YOUR TEAM"; }, 1600);
}
function revealShareText(txt) {
  var box = el("shareTextOut");
  if (!box) {
    box = document.createElement("textarea");
    box.id = "shareTextOut";
    box.className = "share-out";
    box.setAttribute("readonly", "");
    box.rows = 9;
    var btn = el("shareTeamBtn");
    if (btn && btn.parentNode) btn.parentNode.insertBefore(box, btn.nextSibling);
    else { var app = document.getElementById("app"); if (app) app.appendChild(box); }
  }
  box.value = txt;
  box.style.display = "block";
  try { box.focus(); box.select(); box.setSelectionRange(0, txt.length); } catch (e) {}
  flashShareBtn("\u2193 SELECT & COPY");
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
function shareOrCopy(txt) {
  var copyP = copyToClipboard(txt);
  var copiedFlash = function () { copyP.then(function (ok) { if (ok) flashShareBtn("COPIED!"); }); };
  if (navigator.share) {
    var sp;
    try { sp = navigator.share({ text: txt }); }
    catch (e) { sp = null; }
    if (sp && sp.then) {
      sp.then(copiedFlash, function (err) {
        if (err && err.name === "AbortError") { copiedFlash(); return; }  // user dismissed the sheet
        copyP.then(function (ok) { if (ok) flashShareBtn("COPIED!"); else revealShareText(txt); });
      });
      return;
    }
  }
  copyP.then(function (ok) { if (ok) flashShareBtn("COPIED!"); else revealShareText(txt); });
}

function showResults() {
  G.screen = "results";
  if (MODE === "kaman") { renderKamanResults(); pingGames("POST"); return; }
  var e = engine(G.picks.map(function (p) { return p.row; }), G.picks.map(function (p) { return p.slot; }));
  renderResults(e, false);
  pingGames("POST");
}

function renderResults(e, keepScroll) {
  renderPips();
  var scrollY = keepScroll ? window.scrollY : 0;
  var picksHtml = picksInSlotOrder().map(function (entry) {
    var p = entry.p, i = entry.i, row = p.row, name = row[IDX.name];
    return '<div class="pick-card">' +
      '<div class="pick-top"><span class="pr-name"><span class="slot-badge">' + p.slot + "</span>" + esc(name) + "</span>" +
      '<span class="pr-v"><small>V</small>' + valueOf(row).toFixed(2) + "</span></div>" +
      '<div class="pr-sub"><span>' + shortSeason(row[IDX.season]) + " " + esc(titleCase(p.fr)) + "</span>" + chipsFor(row) + "</div>" +
      '<div class="pr-sub pr-stats">' + statLine(row) + "</div></div>";
  }).join("");

  var ledger = '<div class="ledger">' +
    '<div class="ledger-row"><span>Raw talent \u03A3V<span class="why">Sum of each pick\u2019s value over a replacement-level player.</span></span><span class="ledger-amt">' + fmt1(e.sumV) + "</span></div>" +
    ledgerRow("Usage tax", "\u03A3 usage " + fmt1(e.sumUsage) + " vs budget " + Math.round(SC.USAGE_BUDGET) + " \u2014 one ball; overlapping shot demand costs efficiency.", e.usageTax, e.usageTax > 0) +
    (e.spacingBonus > 0
      ? ledgerCreditRow("Spacing bonus", e.sumSp + " shooters \u2014 extra spacing stretches the defense past the requirement.", e.spacingBonus)
      : ledgerRow("Spacing tax", e.sumSp + " of " + SC.SPACERS_REQ + " required spacers \u2014 without shooting, the floor shrinks.", e.spacingTax, e.spacingTax > 0)) +
    (e.backDefTax > 0
      ? ledgerRow("Backcourt defense", "Both guards rank bottom-" + (e.backDefTier === 10 ? "10" : "25") + "% among guard defenders (DBPM) \u2014 the perimeter leaks.", e.backDefTax, true)
      : "") +
    (e.wingDefTax > 0
      ? ledgerRow("Wing defense", "Both forwards rank bottom-" + (e.wingDefTier === 10 ? "10" : "25") + "% among forward defenders (DBPM) \u2014 the frontcourt gets cooked.", e.wingDefTax, true)
      : "") +
    '<div class="ledger-row total"><span>Team score \u2192 net rating<span class="why">Score ' + fmt1(e.score) + " minus league baseline " + fmt1(BASELINE) + ".</span></span><span class=\"ledger-amt\">" + signed1(e.net) + "</span></div></div>";

  document.body.classList.remove("drafting");
  app().innerHTML =
    startOverBtnHtml() +
    '<section class="board"><p class="eyebrow">Front office projection \u00B7 ' + (MODE === "pro" ? "pro draft" : MODE === "cap" ? "salary cap" : "classic draft") + "</p>" +
      '<div class="big">' + e.winTally + "\u2013" + (CFG.GAMES_IN_SEASON - e.winTally) + "</div><div class=\"big-label\">net rating " + signed1(e.net) + "</div>" +
      (MODE === "cap" ? '<div class="cap-spent">$' + G.budget + ' cap space</div>' : "") +
      '<button class="btn btn-primary btn-block presti-spin" id="shareTeamBtn">SHARE YOUR TEAM</button></section>' +
    '<section class="section twoway-sec">' + twoWayHtml(e) + "</section>" +
    '<section class="section"><p class="eyebrow">Your five</p>' + picksHtml + "</section>" +
    '<section class="section"><p class="eyebrow">GOAT Climb</p>' + climbHtml(e) + "</section>" +
    '<section class="section"><p class="eyebrow">Scoring Card</p>' + ledger + "</section>" +
    '<div class="actions"><button class="btn btn-primary presti-spin" id="againBtn">Run it back</button></div>';

  el("againBtn").addEventListener("click", function () { newGame(); });
  wireStartOver();
  el("shareTeamBtn").addEventListener("click", function () {
    var e2 = engine(G.picks.map(function (p) { return p.row; }), G.picks.map(function (p) { return p.slot; }));
    shareOrCopy(shareText(e2));
  });
  setupGoatFireworks(e.winTally >= CFG.GAMES_IN_SEASON);
  if (hhEligible(e)) hotHand(e);     // the 82-0 lever: offered on every drafted result
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
    startOverBtnHtml() +
    '<section class="board kaman-board"><div class="goat-fw" id="goatFw" aria-hidden="true"></div>' +
      '<p class="eyebrow">Front office projection \u00B7 KAMAN MODE</p>' +
      '<div class="big">82\u20130</div><div class="big-label">net rating +\u221E</div>' +
      '<p class="kaman-flavor">' + kamanFlavor() + "</p>" +
      '<button class="btn btn-primary btn-block presti-spin" id="shareTeamBtn">SHARE YOUR TEAM</button></section>' +
    '<section class="section twoway-sec"><div class="twoway">' + kamanBar("Offense") + kamanBar("Defense") + "</div></section>" +
    '<section class="section"><p class="eyebrow">Your five \u00B7 all centers, as nature intended</p>' + picksHtml + "</section>" +
    '<section class="section"><p class="eyebrow">Scoring Card</p>' + ledger + "</section>" +
    '<div class="actions"><button class="btn btn-primary presti-spin" id="againBtn">Kaman</button></div>';

  el("againBtn").addEventListener("click", function () { renderIntro(); });
  wireStartOver();
  el("shareTeamBtn").addEventListener("click", function () { shareOrCopy(kamanShareText()); });
  setupGoatFireworks(true);
  window.scrollTo(0, 0);
}

/* ---------- boot ---------- */

function showError(msg) { app().innerHTML = '<div class="error-box">' + msg + "</div>"; }

function setGamesPlayed(n) {
  var el = document.getElementById("gamesPlayed");
  if (el && typeof n === "number") el.textContent = n.toLocaleString() + " games played | ";
}
function pingGames(method) {
  try {
    fetch("/api/games", { method: method })
      .then(function (r) { return r.json(); })
      .then(function (d) { setGamesPlayed(d.count); })
      .catch(function () {});
  } catch (e) {}
}

function boot() {
  bindHaptics();
  fetch(CFG.DATA_URL)
    .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
    .then(function (data) { initData(data); renderIntro(); pingGames("GET"); })
    .catch(function (err) {
      showError("Couldn\u2019t load " + esc(CFG.DATA_URL) + " (" + esc(err.message) + "). Serve this folder over HTTP \u2014 e.g. <span class=\"mono\">python3 -m http.server</span> \u2014 rather than opening index.html as a file.");
    });
}

if (typeof document !== "undefined" && document.getElementById) { boot(); }
