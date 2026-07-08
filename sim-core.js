/* TRUE 82 — sim-core (T82) v2: the complete headless game core.
   ─────────────────────────────────────────────────────────────────────────────
   Sprint 0 gave this file the seeded-RNG spine. Stage 2 (this version) moves the
   ENTIRE game-logic layer here: data tables, eligibility, the deal loop, skips,
   the cap economy, picks, the engine, Hot Hand resolution, and a full replay
   verifier — so the browser (app.js), the test harness (test.js), and Pages
   Functions (functions/api/*) all run the IDENTICAL sim.

   Loading (unchanged): browser <script> before app.js · test.js vm-loads it ·
   Functions: import T82 from "../../sim-core.js" (esbuild CJS interop — verify
   on Preview; fallback: mirror at functions/_shared/ with checksum test).

   STATE MODEL: every public function takes the game-state object S as its first
   argument (app.js passes its global G — same shape, UI fields coexist). Tables
   built by T82.initData(data) live at module scope (t.*) and are shared by all
   states in the isolate.

   CHALLENGE HOOK (weeklies): S.ch = { id, name, blurb, base,
     filter(row, t)  -> bool     pool eligibility (who exists this week)
     pick(S, row, slot) -> bool  stateful legality at pick time
     deal(S) -> {decs?, frs?}    constrain era/franchise dealing
     cfg: { KEY: val }           whitelisted overlays: CAP_BUDGET, CAP_GEM,
           CAP_TRAP, TEAM_SKIPS, ERA_SKIPS, and the engine tax/threshold keys }
   TRUST LAW: NET_SD, BASELINE, REPLACEMENT and the Hot Hand are NOT hookable.
   Challenges shape the draft, never the sim's fairness or the wheel.

   THE SEED-SPINE INVARIANT still rules: only logged, replayable actions consume
   S.rng; cosmetics stay on Math.random in app.js forever; POOLS Map iteration
   order is part of the replay contract. Bump VERSION on ANY change to draw
   order — AND on any result-affecting balance change (scoring constants,
   taxes, pricing, HH odds) even when replays stay intact: core_version is
   also the ANALYTICS PATCH FENCE stored on every run, and an unbumped
   balance change silently pools two different games under one number.
   Balance bumps land at week boundaries (live duels/league weeks resolve
   with CURRENT scoring — mid-flight changes shift open outcomes). Bump on
   order, op grammar, or resolution rules — verified runs stamp it. */
(function (g) {
  "use strict";

  /* ============ seeded RNG (Sprint 0, unchanged API) ============ */
  function seedOf(s) {
    if (typeof s === "number" && isFinite(s)) return s >>> 0;
    s = String(s);
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0; // h *= 16777619 (FNV prime), kept in uint32
    }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0;   // final avalanche so
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;   // "…|cap" vs "…|pro"
    h ^= h >>> 16;                                       // land far apart
    return h >>> 0;
  }

  // Fresh unpredictable seed for casual (unseeded) games.
  function autoSeed() {
    try {
      if (g.crypto && g.crypto.getRandomValues) {
        var a = new Uint32Array(1);
        g.crypto.getRandomValues(a);
        return a[0] >>> 0;
      }
    } catch (e) { /* fall through */ }
    return ((Math.random() * 0x100000000) ^ Date.now()) >>> 0;
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // The stream app.js consumes. `n` counts draws — a replay verifier can
  // cross-check the client's draw count to catch divergence early.
  function makeRng(seed) {
    var s = seedOf(seed), next = mulberry32(s);
    var rng = {
      seed: s,
      n: 0,
      f: function () { rng.n++; return next(); },
      int: function (m) { return Math.floor(rng.f() * m); },
      pick: function (arr) { return arr[Math.floor(rng.f() * arr.length)]; }
    };
    return rng;
  }

  // Test helper: serves a fixed queue of floats, then falls back to
  // Math.random — mirrors test.js's withRandom(), but for the stream.
  function queueRng(seq) {
    var q = seq.slice();
    var rng = {
      seed: -1,
      n: 0,
      f: function () { rng.n++; return q.length ? q.shift() : Math.random(); },
      int: function (m) { return Math.floor(rng.f() * m); },
      pick: function (arr) { return arr[Math.floor(rng.f() * arr.length)]; }
    };
    return rng;
  }

  /* ============ tables (module scope, one initData per isolate) ============ */
  var CFG = {
  SITE_NAME: "PERFECT FIVE",
  DATA_URL: "site_data.json",
  GAMES_IN_SEASON: 82,
  POS_THRESHOLD: 20,
  KAMAN_LO: 2004,
  KAMAN_HI: 2016
};
  var BUCKETS = ["G", "F", "C"];
  var BUCKET_CAP = { G: 2, F: 2, C: 1 };
  CFG.ROUNDS = BUCKETS.reduce(function (s, b) { return s + BUCKET_CAP[b]; }, 0);
  var META = null, SC = null, IDX = null, BASELINE = 10;
  var POOLS = new Map(), POOL_YEARS = new Map(), DECADES = [], FR_BY_DEC = new Map();
  var DEC_SPAN = new Map(), SEASON_SPAN = null, TEAM2FR = {}, BEST_BY_NAME = new Map();
  var FRANCHISES = [], CAREER_BUCKETS = new Map(), KAMAN_SEASONS = [];
  var CAP_BUDGET = 50, CAP_TRAP = 0.50, CAP_GEM = 0.15;
  var DATA_VERSION = 0;

  function rnd(S)  { return (S && S.rng) ? S.rng.f() : Math.random(); }
  function rndi(S, n) { return Math.floor(rnd(S) * n); }

  // challenge-cfg overlay: whitelisted keys may be patched per state; everything
  // else falls through to SC (or the passed default for module constants).
  function C(S, k, def) {
    if (S && S.ch && S.ch.cfg && Object.prototype.hasOwnProperty.call(S.ch.cfg, k)) return S.ch.cfg[k];
    if (def !== undefined) return def;
    return SC[k];
  }

  /* ============ extracted game logic (verbatim from app.js, G->S) ============ */
function erf(S, x) {
  var sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  var t = 1 / (1 + 0.3275911 * x);
  var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}

function phi(S, x) { return 0.5 * (1 + erf(S, x / Math.SQRT2)); }

function key(S, fr, dec) { return fr + "|" + dec; }

function valueOf(S, row) { return row[IDX.bpm_star] - SC.REPLACEMENT; }

function rowBuckets(S, row) {
  // Career-wide eligibility: if he was EVER a G/F/C anywhere in his career, he's
  // eligible there in every season. Built once in initData.
  var set = CAREER_BUCKETS.get(row[IDX.name]);
  if (set) {
    var career = BUCKETS.filter(function (b) { return set[b]; });
    if (career.length) return career;
  }
  // fallback (name missing from the map): the old per-season logic
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

function capOf(S, b) { return S.mode === "kaman" ? (b === "C" ? 5 : 0) : BUCKET_CAP[b]; }

function bucketOpen(S, b) { return S.filled[b] < capOf(S, b); }

function openBuckets(S) { return BUCKETS.filter(function (b) { return bucketOpen(S, b); }); }

function rowOpenBuckets(S, row) { return rowBuckets(S, row).filter(function (b) { return bucketOpen(S, b); }); }

function poolHasEligible(S, fr, dec) {
  var pool = POOLS.get(key(S, fr, dec));
  if (!pool) return false;
  var ok = false;
  pool.forEach(function (row) { if (!ok && rowDraftable(S, row)) ok = true; });
  return ok;
}

function eraHasEligibleFranchise(S, dec) {
  var list = FR_BY_DEC.get(dec) || [];
  for (var i = 0; i < list.length; i++) if (poolHasEligible(S, list[i], dec)) return true;
  return false;
}

function availableEras(S) {
  return DECADES.filter(function (d) { return eraHasEligibleFranchise(S, d); });
}

function randFranchise(S, dec, avoid) {
  var list = (FR_BY_DEC.get(dec) || []).filter(function (f) { return poolHasEligible(S, f, dec); });
  if (!list.length) list = (FR_BY_DEC.get(dec) || []).slice();
  var fresh = avoid ? list.filter(function (f) { return !avoid.has(f); }) : list;
  var opts = fresh.length ? fresh : list;
  return opts[rndi(S, opts.length)];
}

function pick1(S, arr) { return arr[rndi(S, arr.length)]; }

function assignProSeasons(S) {
  var k = key(S, S.cur.fr, S.cur.dec);
  var pool = POOLS.get(k), yrs = POOL_YEARS.get(k);
  if (!pool || !yrs) return;
  pool.forEach(function (row, name) {
    var arr = yrs.get(name);
    if (arr && arr.length) S.yearByName[name] = arr[rndi(S, arr.length)][IDX.season];
  });
}

function capRoll(S, bargainDecay) {
  var u = rnd(S);
  if (u < 0.55) return 0.85 + 0.30 * rnd(S);            // 55% normal
  if (u < 0.80) {                                     // 25% fire-sale (bargain)
    var mult = 0.55 + 0.25 * rnd(S);
    var d = (bargainDecay == null) ? 1 : bargainDecay;
    return 1 - (1 - mult) * d;                        // shrink the discount toward fair
  }
  return 1.25 + 0.35 * rnd(S);                          // 20% gouged
}

function capCost(S, v, bargainDecay) {
  // C(S,"PRICE_MULT",1): weekly-challenge hook (e.g. Inflation weeks). Default 1 = live pricing, untouched.
  return Math.max(1, Math.round(0.26 * Math.pow(Math.max(v, 1), 2) * capRoll(S, bargainDecay) * C(S, "PRICE_MULT", 1)));
}

function assignCapPool(S, avoid) {
  var k = key(S, S.cur.fr, S.cur.dec);
  var pool = POOLS.get(k), yrs = POOL_YEARS.get(k);
  var decay = Math.pow(0.65, S.yearRerollN || 0);   // bargain depth shrinks per "Skip yrs" press
  S.costByName = {};
  if (!pool || !yrs) return;
  var items = [];
  pool.forEach(function (row, name) {
    var arr = yrs.get(name);
    if (!arr || !arr.length) return;
    var elig = S.ch ? arr : arr.filter(function (r) { return r[IDX.mp] > 785; });   // regular draft filters to >785 min; challenges keep the full pool
    if (!elig.length) return;                                          // no eligible season -> off the board
    var cands = elig;
    if (avoid && avoid[name] != null && elig.length > 1) {   // don't land the same year twice in a row when there's an alternative
      var alt = elig.filter(function (r) { return r[IDX.season] !== avoid[name]; });
      if (alt.length) cands = alt;
    }
    var pickRow = cands[rndi(S, cands.length)];
    S.yearByName[name] = pickRow[IDX.season];
    var peakMin = 0;   // peak minutes across the player's eligible seasons -> weights the $2 bump
    for (var pj = 0; pj < elig.length; pj++) if (elig[pj][IDX.mp] > peakMin) peakMin = elig[pj][IDX.mp];
    items.push({ name: name, v: valueOf(S, pickRow), cost: capCost(S, valueOf(S, pickRow), decay), peakMin: peakMin });
  });
  if (!items.length) return;
  capMisprice(S, items);
  capBumpTwos(S, items);   // two more $1 players -> $2, weighted by peak minutes (stacks on capMisprice)
  // Hard ceiling: a player never costs more than $24. effCost's fire-sale -$2 then caps fire-sale at $22.
  for (var i = 0; i < items.length; i++) S.costByName[items[i].name] = Math.min(24, items[i].cost);
}

function capBumpTwos(S, items) {
  // Two currently-$1 players are bumped to $2, chosen by weighted-random on peak minutes
  // (a high-minute guy sitting at $1 is the likeliest bargain to correct). Draws from S's
  // RNG so replay stays deterministic; picks without replacement; no-ops if <2 are at $1.
  var ones = [], i;
  for (i = 0; i < items.length; i++) if (items[i].cost <= 1) ones.push(items[i]);
  for (var p = 0; p < 2 && ones.length; p++) {
    var total = 0, j;
    for (j = 0; j < ones.length; j++) total += Math.max(1, ones[j].peakMin);
    var r = rnd(S) * total, acc = 0, idx = 0;
    for (j = 0; j < ones.length; j++) { acc += Math.max(1, ones[j].peakMin); if (r < acc) { idx = j; break; } }
    ones[idx].cost = 2;
    ones.splice(idx, 1);
  }
}

function capMisprice(S, items) {
  var n = items.length, i;
  var byVal = items.slice().sort(function (a, b) { return b.v - a.v; });
  var shielded = {};
  for (i = 0; i < Math.min(5, n); i++) shielded[byVal[i].name] = true;
  var costs = items.map(function (it) { return it.cost; }).sort(function (a, b) { return b - a; });
  var lo = Math.max(costs[Math.min(2, n - 1)], 10), hi = Math.max(costs[0], lo + 8);  // premium band overlaps real top-3
  for (i = 0; i < n; i++) {
    var it = items[i];
    if (it.v >= 2 && it.v <= 4 && !shielded[it.name]) {
      var r = rnd(S);
      if (r < C(S,"CAP_GEM",CAP_GEM)) it.cost = 1;                                                       // underpriced gem
      else if (r < C(S,"CAP_GEM",CAP_GEM) + C(S,"CAP_TRAP",CAP_TRAP)) it.cost = Math.round(lo + rnd(S) * (hi - lo)); // overpriced trap
      else if (it.cost < 2) it.cost = 2;                                                  // $1 floor now reads as "gem"
    }
  }
  var weak = [];
  for (i = 0; i < n; i++) if (items[i].v < 2) weak.push(i);
  for (i = weak.length - 1; i > 0; i--) { var j = rndi(S, i + 1), t = weak[i]; weak[i] = weak[j]; weak[j] = t; }
  var above = 0; for (i = 0; i < weak.length; i++) if (items[weak[i]].cost > 1) above++;
  var want = 2 + rndi(S, 3);   // 2..4 weak players above $1
  for (i = 0; i < weak.length && above < want; i++) {
    if (items[weak[i]].cost <= 1) { items[weak[i]].cost = 2 + rndi(S, 5); above++; }  // $2..$6
  }
}

function effCost(S, name) {
  var c = S.costByName ? S.costByName[name] : null;
  if (c == null) return null;
  return S.fireSale ? Math.max(1, c - 2) : c;
}

function capAffordable(S, row) {
  var c = effCost(S, row[IDX.name]);
  if (c == null) return true;
  var picksAfter = CFG.ROUNDS - S.round;
  return c <= S.budget - picksAfter;
}

function resolveRow(S, name) {
  if (S.mode === "kaman") {
    var s = parseInt(name, 10);
    for (var ki = 0; ki < KAMAN_SEASONS.length; ki++) if (KAMAN_SEASONS[ki][IDX.season] === s) return KAMAN_SEASONS[ki];
    return null;
  }
  var k = key(S, S.cur.fr, S.cur.dec);
  var sel = S.yearByName ? S.yearByName[name] : undefined;
  if (sel !== undefined && sel !== null) {
    var yrs = POOL_YEARS.get(k);
    var arr = yrs ? yrs.get(name) : null;
    if (arr) for (var i = 0; i < arr.length; i++) if (arr[i][IDX.season] === sel) return arr[i];
  }
  var pool = POOLS.get(k);
  return pool ? pool.get(name) : null;
}

function engine(S, pickRows, slots) {
  var sumV = 0, sumUsage = 0, sumSp = 0, sumObpm = 0, sumDbpm = 0;
  pickRows.forEach(function (row) {
    sumV += valueOf(S, row);
    sumUsage += row[IDX.usage];
    sumSp += row[IDX.sp];
    sumObpm += row[IDX.obpm];
    sumDbpm += row[IDX.dbpm];
  });
  var usageTax = C(S,"USAGE_RATE") * Math.max(0, sumUsage - C(S,"USAGE_BUDGET"));
  var spacingTax = C(S,"SPACING_TAX") * Math.max(0, C(S,"SPACERS_REQ") - sumSp);
  var spacingBonus = (C(S,"SPACING_BONUS") || 0) * Math.max(0, sumSp - C(S,"SPACERS_REQ"));

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
      if (da <= C(S,"GD_BOTTOM10") && db <= C(S,"GD_BOTTOM10")) { backDefTax = C(S,"BACKCOURT_D_TAX_10"); backDefTier = 10; }
      else if (da <= C(S,"GD_BOTTOM25") && db <= C(S,"GD_BOTTOM25")) { backDefTax = C(S,"BACKCOURT_D_TAX_25"); backDefTier = 25; }
    }
    if (fr.length === 2) {
      var fa = fr[0][IDX.dbpm], fb = fr[1][IDX.dbpm];
      if (fa <= C(S,"FD_BOTTOM10") && fb <= C(S,"FD_BOTTOM10")) { wingDefTax = C(S,"WING_D_TAX_10"); wingDefTier = 10; }
      else if (fa <= C(S,"FD_BOTTOM25") && fb <= C(S,"FD_BOTTOM25")) { wingDefTax = C(S,"WING_D_TAX_25"); wingDefTier = 25; }
    }
  }

  var score = sumV - usageTax - spacingTax + spacingBonus - backDefTax - wingDefTax;
  var net = score - BASELINE;
  var p = phi(S, net / SC.NET_SD);
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

function hhNet82(S) {
  var lo = 0, hi = 80;
  for (var k = 0; k < 48; k++) {
    var mid = (lo + hi) / 2;
    if (Math.ceil(CFG.GAMES_IN_SEASON * phi(S, mid / SC.NET_SD)) >= CFG.GAMES_IN_SEASON) hi = mid; else lo = mid;
  }
  return hi;
}

function hhPickHot(S) {
  var w = S.picks.map(function (p) { var v = Math.max(0.5, valueOf(S, p.row)); return v * v; });
  var sum = w.reduce(function (a, b) { return a + b; }, 0), r = rnd(S) * sum;
  for (var i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; }
  return w.length - 1;
}

function hhSpinSeg(S) {
  var r = rnd(S) * 100, acc = 0;
  for (var i = 0; i < HH_SEGMENTS.length; i++) { acc += HH_SEGMENTS[i].odds; if (r < acc) return i; }
  return 0;
}

function hhEligible(S, e) {
  return !!(S.mode === "cap" && S.picks && S.picks.length >= CFG.ROUNDS && e.winTally < CFG.GAMES_IN_SEASON);
}

function swapTargetsFor(S, pickIdx) {
  var p = S.picks[pickIdx];
  var elig = rowBuckets(S, p.row);
  var t = { open: {}, picks: {} };
  BUCKETS.forEach(function (b) {
    if (b === p.slot) return;                       // moving within the same position is a no-op
    if (elig.indexOf(b) !== -1 && S.filled[b] < capOf(S, b)) t.open[b] = true;
  });
  S.picks.forEach(function (q, j) {
    if (j === pickIdx || q.slot === p.slot) return;
    if (elig.indexOf(q.slot) !== -1 && rowBuckets(S, q.row).indexOf(p.slot) !== -1) t.picks[j] = true;
  });
  return t;
}

function pickHasMoves(S, i) {
  var t = swapTargetsFor(S, i);
  if (Object.keys(t.open).length) return true;
  return Object.keys(t.picks).length > 0;
}

function chargeReroll(S, spinId) {
  var picksToGo = CFG.ROUNDS - S.round + 1;
  if (S.budget - 1 < picksToGo) return false;
  S.fireSale = false;                 // any reroll wipes an active fire sale
  S.budget -= 1;
  S.maxCap -= 1;
  if (spinId) {
    var roll = rnd(S);
    if (roll < 0.075) {               // 7.5%: free spin — refund the dollar (net cost 0)
      S.budget += 1;
      S.maxCap += 1;
      S.refundFlash = spinId;
    } else if (roll < 0.15) {         // 7.5%: FIRE SALE — this board only
      S.fireSale = true;
      S.fireSaleFlash = spinId;
    }
  }
  return true;
}

function initDataCore(data) {
  var S = null;   // valueOf's S param is unused; alias for the threaded calls below
  META = data.meta;
  // Crests arrive separately (crests.json) and may land before OR after this data.
  // MERGE instead of reassign — the old `CRESTS = data.crests || {}` was throwing
  // away every logo loadCrests() had already merged whenever crests.json won the
  // download race (which it usually does now that Cloudflare's cache is warm).
  SC = META.scoring;
  IDX = {};
  META.cols.forEach(function (c, i) { IDX[c] = i; });
  var m = /-\s*([0-9.]+)/.exec(String(SC.net || ""));
  BASELINE = (typeof SC.BASELINE === "number") ? SC.BASELINE : (m ? parseFloat(m[1]) : 10);

  // Career-wide position eligibility: union of every season's qualifying buckets.
  // A player who never clears the 20% bar anywhere falls back to the union of his
  // per-season max-share buckets, so nobody ends up position-less.
  CAREER_BUCKETS = new Map();
  var fbBuckets = new Map();
  data.players.forEach(function (row) {
    var nm = row[IDX.name];
    var set = CAREER_BUCKETS.get(nm);
    if (!set) { set = {}; CAREER_BUCKETS.set(nm, set); }
    if (row[IDX.g_pct] >= CFG.POS_THRESHOLD) set.G = 1;
    if (row[IDX.f_pct] >= CFG.POS_THRESHOLD) set.F = 1;
    if (row[IDX.c_pct] >= CFG.POS_THRESHOLD) set.C = 1;
    var g = row[IDX.g_pct], f = row[IDX.f_pct], c = row[IDX.c_pct], mx = Math.max(g, f, c);
    var fb = fbBuckets.get(nm);
    if (!fb) { fb = {}; fbBuckets.set(nm, fb); }
    fb[g === mx ? "G" : (f === mx ? "F" : "C")] = 1;
  });
  CAREER_BUCKETS.forEach(function (set, nm) {
    if (!set.G && !set.F && !set.C) {
      var fb = fbBuckets.get(nm) || {};
      BUCKETS.forEach(function (b) { if (fb[b]) set[b] = 1; });
    }
  });

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
    var k = key(S, fr, dec);
    if (EXCLUDE[k]) return;
    if (!POOLS.has(k)) POOLS.set(k, new Map());
    var pool = POOLS.get(k);
    var name = row[IDX.name];
    var prev = pool.get(name);
    if (!prev || valueOf(S, row) > valueOf(S, prev)) pool.set(name, row);
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
        if (!bySeason[s] || valueOf(S, r) > valueOf(S, bySeason[s])) bySeason[s] = r;
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
      if (!prev || valueOf(S, row) > valueOf(S, prev)) BEST_BY_NAME.set(name, row);
    });
  });

  // ----- Kaman Mode pool: every Chris Kaman season (one row per season, traded
  // years collapsed to his higher-value stint). The whole draft is five Kamans.
  KAMAN_SEASONS = [];
  var kBySeason = {};
  data.players.forEach(function (row) {
    if (row[IDX.name] !== "Chris Kaman") return;
    var s = row[IDX.season];
    if (!kBySeason[s] || valueOf(S, row) > valueOf(S, kBySeason[s])) kBySeason[s] = row;
  });
  KAMAN_SEASONS = Object.keys(kBySeason).map(function (s) { return kBySeason[s]; })
    .sort(function (a, b) { return a[IDX.season] - b[IDX.season]; });
}

  /* ============ eligibility with the challenge filter ============ */
  function rowDraftable(S, row) {
    var dkey = S.mode === "kaman" ? String(row[IDX.season]) : row[IDX.name];
    if (S.drafted.has(dkey)) return false;
    if (S.mode !== "kaman" && !S.ch && row[IDX.mp] <= 785) return false;   // regular draft only: cameo/short seasons (<=785 min) aren't draftable. Challenges keep the full pool (narrow ones like Short Kings would otherwise strand); kaman exempt.
    var obs = rowOpenBuckets(S, row);
    if (obs.length === 0) return false;
    if (S.ch && S.ch.filter && !S.ch.filter(row, T.t)) return false;
    if (S.mode === "cap" && !capAffordable(S, row)) return false;
    // pick-hook screening: a row NO open slot can legally take isn't draftable.
    // This routes deals around hook-dead boards (availableEras/poolHasEligible
    // see through it), so stateful challenges (ladders, The Closer) can never
    // soft-lock a solo run — the applyPick-time check stays for the CHOSEN slot.
    if (S.ch && S.ch.pick) {
      var okp = false;
      for (var oi = 0; oi < obs.length; oi++)
        if (S.ch.pick(S, row, obs[oi], T.t)) { okp = true; break; }
      if (!okp) return false;
    }
    return true;
  }
  // strand-detection over the raw pool: never consults the UI's search query or
  // sort (fixes the latent bug where a stale no-match search forced 40 re-deals)
  function capPoolHasPick(S) {
    if (S.mode === "kaman") return true;
    var pool = POOLS.get(key(S, S.cur.fr, S.cur.dec));
    if (!pool) return false;
    var ok = false;
    pool.forEach(function (row, name) {
      if (ok) return;
      var r = resolveRow(S, name);
      if (r && rowDraftable(S, r)) ok = true;
    });
    return ok;
  }
  function teamSkipTargets(S) {
    var list = FR_BY_DEC.get(S.cur.dec) || [];
    var allow = (S.ch && S.ch.deal) ? S.ch.deal(S, T.t) : null;
    return list.filter(function (f) {
      if (allow && allow.frs && allow.frs.indexOf(f) === -1) return false;
      return f !== S.cur.fr && !S.seenFr.has(f) && !S.seenPairs.has(key(S, f, S.cur.dec)) && poolHasEligible(S, f, S.cur.dec);
    });
  }
  function eraSkipTargets(S) {
    var allow = (S.ch && S.ch.deal) ? S.ch.deal(S, T.t) : null;
    return DECADES.filter(function (d) {
      if (allow && allow.decs && allow.decs.indexOf(d) === -1) return false;
      return d !== S.cur.dec && (S.mode === "cap" || !S.seenDec.has(d)) && !S.seenPairs.has(key(S, S.cur.fr, d)) && poolHasEligible(S, S.cur.fr, d);
    });
  }

  /* ============ state lifecycle ============ */
  function newState(mode, seed, ch) {
    var S = {
      mode: mode || "classic",
      ch: ch || null,
      round: 0, picks: [], drafted: new Set(),
      filled: { G: 0, F: 0, C: 0 },
      teamSkips: 0, eraSkips: 0, yearRerolls: 0,
      seenFr: new Set(), seenDec: new Set(), seenPairs: new Set(),
      cur: null, selected: null, yearByName: {}, costByName: {},
      costDir: "desc", sortMode: "min", query: "",
      budget: 0, maxCap: 0,
      fireSale: false, fireSaleFlash: null, refundFlash: null,
      yearRerollN: 0, moveIdx: null, screen: "draft",
      actions: [], done: false
    };
    S.mode = mode || "classic";
    var isCap = S.mode === "cap";
    S.teamSkips = C(S, "TEAM_SKIPS", isCap ? 2 : 1);
    S.eraSkips  = C(S, "ERA_SKIPS",  isCap ? 2 : 1);
    S.yearRerolls = isCap ? 2 : 0;
    S.budget = S.maxCap = C(S, "CAP_BUDGET", CAP_BUDGET);
    S.sortMode = S.mode === "pro" ? "az" : isCap ? "cost" : "min";
    S.seedSet = seed != null;
    S.seed = S.seedSet ? seedOf(seed) : autoSeed();
    S.rng = makeRng(S.seed);
    S.coreVersion = T.VERSION;
    S.dataVersion = DATA_VERSION;
    return S;
  }

  // one round's deal: returns "done" | {kaman:true} | {dealt:true}
  function dealRound(S) {
    S.round += 1;
    S.fireSale = false;
    S.yearRerollN = 0;
    S.moveIdx = null;
    if (S.round > CFG.ROUNDS) { S.done = true; return "done"; }
    if (S.mode === "kaman") {
      S.cur = { kaman: true }; S.selected = null; S.yearByName = {};
      return { kaman: true };
    }
    var allow = (S.ch && S.ch.deal) ? S.ch.deal(S, T.t) : null;
    var tries = 0;
    while (true) {
      tries++;
      var eras = availableEras(S);
      if (allow && allow.decs) eras = eras.filter(function (d) { return allow.decs.indexOf(d) !== -1; });
      if (allow && allow.frs) eras = eras.filter(function (d) {   // never burn tries on an era none of the allowed wear
        var fl = FR_BY_DEC.get(d) || [];
        for (var fi = 0; fi < fl.length; fi++)
          if (allow.frs.indexOf(fl[fi]) !== -1 && poolHasEligible(S, fl[fi], d)) return true;
        return false;
      });
      var fresh = eras.filter(function (d) { return !S.seenDec.has(d); });
      var avail = fresh.length ? fresh : eras;
      if (!avail.length) { S.done = true; return "done"; }
      var dec = pick1(S, avail);
      var fr;
      if (allow && allow.frs) {
        var frl = (FR_BY_DEC.get(dec) || []).filter(function (f) { return allow.frs.indexOf(f) !== -1 && poolHasEligible(S, f, dec); });
        if (!frl.length) { if (tries > 40) { S.done = true; return "done"; } continue; }
        var frfresh = frl.filter(function (f) { return !S.seenFr.has(f); });
        fr = pick1(S, frfresh.length ? frfresh : frl);
      } else {
        fr = randFranchise(S, dec, S.seenFr);
      }
      S.cur = { dec: dec, fr: fr };
      S.selected = null; S.yearByName = {};
      if (S.mode === "pro") assignProSeasons(S);
      else if (S.mode === "cap") assignCapPool(S);
      if (S.mode !== "cap" || tries > 40 || capPoolHasPick(S)) break;
    }
    S.seenDec.add(S.cur.dec);
    S.seenFr.add(S.cur.fr);
    S.seenPairs.add(key(S, S.cur.fr, S.cur.dec));
    return { dealt: true };
  }

  function rerollUntilPickable(S, prev) {
    if (S.mode !== "cap") return;
    var n = 0;
    while (!capPoolHasPick(S) && n < 40) { assignCapPool(S, prev); n++; }
  }

  function skipTeam(S) {
    var targets = teamSkipTargets(S);
    if (!targets.length) return false;
    if (S.mode === "cap") { if (!chargeReroll(S, "skipTeam")) return false; S.yearRerollN = 0; }
    else { if (!S.teamSkips) return false; S.teamSkips -= 1; }
    if (S.mode === "cap") S.seenFr.delete(S.cur.fr);
    S.cur.fr = pick1(S, targets);
    S.seenFr.add(S.cur.fr);
    S.seenPairs.add(key(S, S.cur.fr, S.cur.dec));
    S.selected = null; S.yearByName = {};
    if (S.mode === "pro") assignProSeasons(S);
    else if (S.mode === "cap") { assignCapPool(S); rerollUntilPickable(S); }
    if (S.actions) S.actions.push("st");
    return { dec: false, fr: true };
  }
  function skipEra(S) {
    var targets = eraSkipTargets(S);
    if (!targets.length) return false;
    if (S.mode === "cap") { if (!chargeReroll(S, "skipEra")) return false; S.yearRerollN = 0; }
    else { if (!S.eraSkips) return false; S.eraSkips -= 1; }
    if (S.mode === "cap" && !S.picks.some(function (p) { return p.dec === S.cur.dec; })) S.seenDec.delete(S.cur.dec);
    S.cur.dec = pick1(S, targets);
    S.seenDec.add(S.cur.dec);
    S.seenPairs.add(key(S, S.cur.fr, S.cur.dec));
    S.selected = null; S.yearByName = {};
    if (S.mode === "pro") assignProSeasons(S);
    else if (S.mode === "cap") { assignCapPool(S); rerollUntilPickable(S); }
    if (S.actions) S.actions.push("se");
    return { dec: true, fr: false };
  }
  function yearReroll(S) {
    if (S.mode !== "cap") return false;
    if (!chargeReroll(S, "rerollYears")) return false;
    S.yearRerollN = (S.yearRerollN || 0) + 1;
    S.selected = null;
    var prev = {};
    for (var pn in S.yearByName) { if (Object.prototype.hasOwnProperty.call(S.yearByName, pn)) prev[pn] = S.yearByName[pn]; }
    assignCapPool(S, prev);
    rerollUntilPickable(S, prev);
    if (S.actions) S.actions.push("yr");
    return { years: true };
  }

  // The atomic pick. season: the resolved season being drafted (classic = the
  // player's explicit year choice; pro/cap = the locked year, doubling as an
  // integrity check on replay). bucket: the slot choice (slot-dependent defense
  // taxes make this part of the outcome).
  function applyPick(S, name, season, bucket) {
    if (S.mode !== "kaman" && season != null) S.yearByName[name] = season;
    var row = resolveRow(S, name);
    if (!row || !rowDraftable(S, row)) return false;
    if (season != null && row[IDX.season] !== season) return false;   // replay integrity
    var opts = rowOpenBuckets(S, row);
    if (opts.indexOf(bucket) === -1) bucket = opts[0];
    if (S.ch && S.ch.pick && !S.ch.pick(S, row, bucket, T.t)) return false;
    S.drafted.add(S.mode === "kaman" ? String(row[IDX.season]) : name);
    S.filled[bucket] += 1;
    var pk = { row: row, fr: S.mode === "kaman" ? null : S.cur.fr, dec: S.mode === "kaman" ? null : S.cur.dec, slot: bucket };
    S.picks.push(pk);
    if (S.mode === "cap") {
      var paid = effCost(S, name);
      if (paid != null) { pk.cost = paid; S.budget -= paid; }
      S.fireSale = false;
    }
    if (S.actions) S.actions.push("k:" + name + "|" + row[IDX.season] + "|" + bucket);
    return true;
  }

  function moveSlot(S, pickIdx, bucket) {
    var p = S.picks[pickIdx];
    if (!p) return false;
    S.filled[p.slot] -= 1;
    S.filled[bucket] += 1;
    p.slot = bucket;
    if (S.actions) S.actions.push("mv:" + pickIdx + "," + bucket);
    return true;
  }
  function swapSlots(S, i, j) {
    var a = S.picks[i], b = S.picks[j];
    if (!a || !b) return false;
    var s = a.slot; a.slot = b.slot; b.slot = s;
    if (S.actions) S.actions.push("sw:" + i + "," + j);
    return true;
  }

  function hhWins(net) { return Math.min(CFG.GAMES_IN_SEASON, Math.ceil(CFG.GAMES_IN_SEASON * phi(null, net / SC.NET_SD))); }

  // Terminal resolution. Hot Hand (cap, exactly 81) draws hot player + segment
  // from the SAME stream — always the final draws of a game. Kaman: 82-0, law.
  function finish(S) {
    if (S.mode === "kaman") {
      return { mode: S.mode, wins: CFG.GAMES_IN_SEASON, losses: 0, net: null, hh: null,
               rngDraws: S.rng ? S.rng.n : 0, coreVersion: T.VERSION, dataVersion: DATA_VERSION };
    }
    var rows = S.picks.map(function (p) { return p.row; });
    var slots = S.picks.map(function (p) { return p.slot; });
    var e = engine(S, rows, slots);
    var res = {
      mode: S.mode, wins: e.winTally, losses: CFG.GAMES_IN_SEASON - e.winTally,
      net: e.net, p82: e.p82, engine: e, hh: null,
      picks: S.picks.map(function (p) {
        return [p.row[IDX.name], p.row[IDX.season], p.slot, (p.cost != null ? p.cost : null)];
      }),
      budgetUsed: S.mode === "cap" ? (C(S, "CAP_BUDGET", CAP_BUDGET) - S.budget) : null,
      capLeft: S.mode === "cap" ? S.budget : null,
      rngDraws: S.rng ? S.rng.n : 0, coreVersion: T.VERSION, dataVersion: DATA_VERSION
    };
    if (S.mode === "cap" && e.winTally === CFG.GAMES_IN_SEASON - 1) {
      var hotIdx = hhPickHot(S), segIdx = hhSpinSeg(S);
      var seg = HH_SEGMENTS[segIdx];
      var hotV = valueOf(S, S.picks[hotIdx].row);
      var newNet = e.net + (seg.m - 1) * hotV * HH_BONUS_SCALE;
      var win = newNet > hhNet82(S);
      res.hh = { hotIdx: hotIdx, segIdx: segIdx, segLabel: seg.label, m: seg.m,
                 newNet: newNet, win: win ? 1 : 0 };
      if (win) { res.wins = CFG.GAMES_IN_SEASON; res.losses = 0; res.netFinal = newNet; }
      else if (hhWins(newNet) > res.wins) { res.wins = hhWins(newNet); res.losses = CFG.GAMES_IN_SEASON - res.wins; res.netFinal = newNet; }
    }
    return res;
  }
  var HH_SEGMENTS = [
    { label: "COLD",      m: 1.0,  odds: 1,  lvl: 0 },
    { label: "WARM",      m: 1.2,  odds: 9,  lvl: 1 },
    { label: "HOT",       m: 1.35, odds: 30, lvl: 2 },
    { label: "ON FIRE",   m: 1.5,  odds: 30, lvl: 3 },
    { label: "SUPERNOVA", m: 2.0,  odds: 30, lvl: 4 }
  ];
  var HH_BONUS_SCALE = 0.67;

  /* ============ replay verifier ============ */
  // payload: { mode, seed, actions:[ops], challenge?:chObj }
  // Replays headless, returns { ok:true, result } or { ok:false, why, at }.
  function replay(payload, ch) {
    if (!IDX) return { ok: false, why: "no-data" };
    var S = newState(payload.mode, payload.seed, ch || null);
    var r = dealRound(S);
    if (r === "done") return { ok: false, why: "dead-board" };
    var ops = payload.actions || [];
    for (var i = 0; i < ops.length; i++) {
      var op = String(ops[i]);
      var okOp = false;
      if (op.slice(0, 2) === "k:") {
        var parts = op.slice(2).split("|");
        var season = parseInt(parts[1], 10);
        okOp = applyPick(S, parts[0], isNaN(season) ? null : season, parts[2]);
        if (okOp) {
          S.actions.pop();                       // core logged it again; keep the submitted log canonical
          r = dealRound(S);
          if (r === "done" && S.picks.length < CFG.ROUNDS) return { ok: false, why: "dead-board", at: i };
        }
      } else if (op === "st") { okOp = !!skipTeam(S); if (okOp) S.actions.pop(); }
      else if (op === "se")   { okOp = !!skipEra(S);  if (okOp) S.actions.pop(); }
      else if (op === "yr")   { okOp = !!yearReroll(S); if (okOp) S.actions.pop(); }
      else if (op.slice(0, 3) === "mv:") {
        var mv = op.slice(3).split(","); okOp = moveSlot(S, parseInt(mv[0], 10), mv[1]); if (okOp) S.actions.pop();
      } else if (op.slice(0, 3) === "sw:") {
        var sw = op.slice(3).split(","); okOp = swapSlots(S, parseInt(sw[0], 10), parseInt(sw[1], 10)); if (okOp) S.actions.pop();
      }
      if (!okOp) return { ok: false, why: "illegal-op", at: i, op: op };
    }
    if (S.picks.length < CFG.ROUNDS) return { ok: false, why: "incomplete" };
    return { ok: true, result: finish(S), rngDraws: S.rng.n };
  }

  // convenience: verify a submitted run against its claim
  function verifyRun(payload) {
    var ch = payload.challenge || null;
    var out = replay(payload, ch);
    if (!out.ok) return out;
    var c = payload.claim || {};
    var res = out.result;
    var tolNet = 1e-6;
    if (typeof payload.rngDraws === "number" && payload.rngDraws !== res.rngDraws)
      return { ok: false, why: "rng-draws", got: res.rngDraws, claimed: payload.rngDraws };
    if (typeof c.wins === "number" && c.wins !== res.wins)
      return { ok: false, why: "wins", got: res.wins, claimed: c.wins };
    if (typeof c.net === "number" && res.net !== null && Math.abs(c.net - res.net) > tolNet)
      return { ok: false, why: "net", got: res.net, claimed: c.net };
    if (c.hh && (!res.hh || c.hh.segIdx !== res.hh.segIdx || (c.hh.win ? 1 : 0) !== res.hh.win))
      return { ok: false, why: "hh" };
    return { ok: true, result: res };
  }

  /* ============ public API ============ */
  var T = {
    VERSION: 4,
    seedOf: seedOf, autoSeed: autoSeed, makeRng: makeRng, queueRng: queueRng,
    t: null,   // tables handle, set by initData
    initData: function (data) {
      initDataCore(data);
      DATA_VERSION = seedOf(JSON.stringify([META.cols, (data.players || []).length, SEASON_SPAN]));
      T.t = { CFG: CFG, BUCKETS: BUCKETS, BUCKET_CAP: BUCKET_CAP, META: META, SC: SC,
              IDX: IDX, BASELINE: BASELINE, POOLS: POOLS, POOL_YEARS: POOL_YEARS,
              DECADES: DECADES, FR_BY_DEC: FR_BY_DEC, DEC_SPAN: DEC_SPAN,
              SEASON_SPAN: SEASON_SPAN, TEAM2FR: TEAM2FR, BEST_BY_NAME: BEST_BY_NAME,
              FRANCHISES: FRANCHISES, CAREER_BUCKETS: CAREER_BUCKETS,
              KAMAN_SEASONS: KAMAN_SEASONS, dataVersion: DATA_VERSION };
      return T.t;
    },
    newState: newState, dealRound: dealRound,
    skipTeam: skipTeam, skipEra: skipEra, yearReroll: yearReroll,
    applyPick: applyPick, moveSlot: moveSlot, swapSlots: swapSlots,
    finish: finish, replay: replay, verifyRun: verifyRun,
    // per-state logic (app.js wrappers pass G)
    key: key, valueOf: valueOf, rowBuckets: rowBuckets, capOf: capOf,
    bucketOpen: bucketOpen, openBuckets: openBuckets, rowOpenBuckets: rowOpenBuckets,
    rowDraftable: rowDraftable, poolHasEligible: poolHasEligible,
    availableEras: availableEras, teamSkipTargets: teamSkipTargets,
    eraSkipTargets: eraSkipTargets, capPoolHasPick: capPoolHasPick,
    chargeReroll: chargeReroll, capRoll: capRoll, capCost: capCost,
    assignCapPool: assignCapPool, capMisprice: capMisprice,
    assignProSeasons: assignProSeasons, effCost: effCost, capAffordable: capAffordable,
    resolveRow: resolveRow, engine: engine, erf: erf, phi: phi,
    hhNet82: hhNet82, hhPickHot: hhPickHot, hhSpinSeg: hhSpinSeg, hhEligible: hhEligible,
    hhWins: hhWins, swapTargetsFor: swapTargetsFor, pickHasMoves: pickHasMoves,
    HH_SEGMENTS: HH_SEGMENTS, HH_BONUS_SCALE: HH_BONUS_SCALE
  };

  g.T82 = T;
  if (typeof module !== "undefined" && module.exports) module.exports = T;
})(typeof globalThis !== "undefined" ? globalThis : this);
