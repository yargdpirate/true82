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
var CAREER_BUCKETS = new Map();   // name -> {G,F,C}: every position the player EVER qualified at, career-wide
var G = null;

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

function newGame(mode, seed, challenge) {
  if (mode) MODE = mode;
  G = T82.newState(MODE, seed, challenge || null);
  window.t82track && window.t82track("game_start", { mode: MODE });
  nextRound(true);
}
function nextRound(animate) {
  var r = T82.dealRound(G);
  if (r === "done") { showResults(); return; }
  window.t82track && window.t82track("round_advance", { mode: MODE, round: G.round });
  renderDraft(animate ? r : false);
}
function doTeamSkip() { var f = T82.skipTeam(G); if (f) renderDraft(f); }
function doEraSkip() { var f = T82.skipEra(G); if (f) renderDraft(f); }
function doYearReroll() { if (MODE !== "cap") return; var f = T82.yearReroll(G); if (f) renderDraft(f); }
function confirmPick(bucket) {
  if (!G.selected) return;
  var row = resolveRow(G.selected);
  if (!row) return;
  if (T82.applyPick(G, G.selected, row[IDX.season], bucket)) nextRound(true);
}
function doLineupMove(pickIdx, bucket) { if (T82.moveSlot(G, pickIdx, bucket)) afterLineupChange(); }
function doLineupSwap(i, j) { if (T82.swapSlots(G, i, j)) afterLineupChange(); }

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
    restores.push({ btn: btn, text: btn.textContent });
    btn.classList.add("refunded");
    btn.textContent = "REFUND!";
  });
  if (!restores.length) return;
  sprayFromEl(document.querySelector(".ticket-actions"), MONEY_EMOJI);   // 💵 spray from the cost buttons
  setTimeout(function () {
    restores.forEach(function (r) {
      if (!r.btn.isConnected) return;            // node replaced by a later render
      r.btn.classList.remove("refunded");
      r.btn.textContent = r.text;
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
    restores.push({ btn: btn, text: btn.textContent });
    btn.classList.add("firesale");
    btn.textContent = "FIRE SALE";
  });
  if (!restores.length) return;
  sprayFromEl(document.querySelector(".ticket-actions"), DOWN_EMOJI);   // ⬇️ spray from the cost buttons
  setTimeout(function () {
    restores.forEach(function (r) {
      if (!r.btn.isConnected) return;            // node replaced by a later render
      r.btn.classList.remove("firesale");
      r.btn.textContent = r.text;
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
    if (mode === "full") { var _dn = decoyNames(); for (i = 0; i < names.length; i++) names[i].textContent = _dn[Math.floor(Math.random() * _dn.length)]; }   // cosmetic reel — must never touch G.rng
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
  var msg = DONATE_MSGS[Math.floor(Math.random() * DONATE_MSGS.length)];
  return '<div class="results-topbar">' +
    startOverBtnHtml() +
    '<a class="donate-btn" id="donateBtn" href="' + DONATE_URL + '" target="_blank" rel="noopener" data-msg="' + esc(msg) + '">' + esc(msg) + '</a>' +
  '</div>';
}
function wireDonate() {
  var b = el("donateBtn");
  if (b) b.addEventListener("click", function () {
    window.t82track && window.t82track("donate_click", { variant: b.getAttribute("data-msg"), mode: MODE });
  });
}

function renderIntro() {
  G = null;
  if (window.T82DUI) T82DUI.stop();   // leaving a duel screen kills its poll
  document.body.classList.remove("drafting");
  renderPips();
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
      '<button class="btn btn-block more-modes" id="startPro">\uD83C\uDFC6 Pro \u00B7 pick the best seasons from memory</button>' +
      '<button class="btn btn-block more-modes" id="startDuel">\u2694\uFE0F Duel a friend \u00B7 correspondence</button>' +
      '<button class="btn btn-block more-modes" id="startLeague">\uD83C\uDFC6 Found a league \u00B7 season-long H2H</button>' +
      '<p class="eyebrow">Draft</p>' +
      "<p>Draft a 5-man roster with 2 guards, 2 forwards, and a center. You get a random team from a random decade. Pick a guy who played for that team in that era. Pick any season he played. You can reroll the era and the team once each per draft.</p>" +
      '<p class="eyebrow">Winning</p>' +
      "<p>Recommended to have at least <strong>3 shooters</strong> and <strong>1 overqualified role player</strong>. Based mostly on OBPM and DBPM (why we only go back to 1974) + some minor custom tweaks. Some players from low/no 3pt era get 3pt shooter bonuses based on reputation and vibes.</p>" +
    "</section>";
  function start(mode) {
    if (DATA_READY) { newGame(mode); return; }
    PENDING_MODE = mode;   // data still downloading — remember the choice and launch the moment it lands
    ["startClassic", "startPro", "startCap"].forEach(function (id) { var b = el(id); if (b) b.disabled = true; });
    var pressed = el(mode === "classic" ? "startClassic" : mode === "pro" ? "startPro" : "startCap");
    if (pressed) pressed.textContent = "Loading players\u2026";
  }
  function queue(fn, btn) {
    if (DATA_READY) { fn(); return; }
    PENDING_FN = fn;
    if (btn) btn.disabled = true;
  }
  el("startClassic").addEventListener("click", function () { start("classic"); });
  el("startPro").addEventListener("click", function () { start("pro"); });
  el("startCap").addEventListener("click", function () { start("cap"); });
  el("startDuel").addEventListener("click", function () {
    queue(function () { if (window.T82DUI) T82DUI.lobby(); }, el("startDuel"));
  });
  el("arenaChip").addEventListener("click", function () {   // no site data needed — opens instantly
    if (window.T82ARENA) T82ARENA.route();
  });
  el("startLeague").addEventListener("click", function () {   // league office needs no site data either
    if (window.T82LGUI) T82LGUI.lobby();
  });

  // kaman left the menu — five quick taps on the title bring Him back
  var kTaps = [], title = el("introTitle");
  if (title) title.addEventListener("click", function () {
    var now = Date.now();
    kTaps = kTaps.filter(function (t) { return now - t < 2500; });
    kTaps.push(now);
    if (kTaps.length >= 5) { kTaps = []; start("kaman"); }
  });

  // daily strip — the server mints today's seed; anonymous can play, sign-in makes it count
  if (window.T82ACC) T82ACC.fetchDaily().then(function (d) {
    var strip = el("dailyStrip");
    if (!strip || !d || !d.ok || G) return;
    var hrs = Math.max(1, Math.round((d.endsInS || 0) / 3600));
    var label = d.mode === "cap" ? "Presti" : d.mode.charAt(0).toUpperCase() + d.mode.slice(1);
    strip.textContent = "\uD83D\uDCC5 Today's board \u00B7 " + label + " \u00B7 " + hrs + "h left";
    strip.hidden = false;
    strip.addEventListener("click", function () {
      queue(function () {
        newGame(d.mode, d.seed);
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
    el("wkBlurb").textContent = w.blurb;
    var days = Math.max(1, Math.ceil((w.endsInS || 0) / 86400));
    var baseChip = w.base === "cap" ? "Presti rules" : w.base === "pro" ? "Pro rules" : "Classic rules";
    el("wkMeta").textContent = baseChip + " \u00B7 " + days + (days === 1 ? " day" : " days") + " left" +
      (w.best ? " \u00B7 your best: " + w.best.wins + " W" : "");
    tile.hidden = false;
    tile.addEventListener("click", function () {
      queue(function () {
        newGame(ch.base, undefined, ch);
        if (G) G.weekly = { challengeId: ch.id, week: w.week };
      }, tile);
    });
  });
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
          '<span class="ls-name ls-open">open</span></div>');
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
  var costNote = (MODE === "cap" && effCost(G.selected) != null) ? " \u00B7 $" + effCost(G.selected) : "";
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
// During a FIRE SALE the base price shows struck through in red with the -$2 price in green.
function capRowHtml(bestRow) {
  var name = bestRow[IDX.name];
  var row = resolveRow(name);
  var taken = G.drafted.has(name);
  var afford = capAffordable(row);
  var noSlot = rowOpenBuckets(row).length === 0;
  var open = !taken && !noSlot && afford;
  var sel = (G.selected === name) && open;
  var cost = G.costByName ? G.costByName[name] : null;
  var eff = effCost(name);
  var costHtml = "";
  if (cost != null) {
    costHtml = (G.fireSale && eff < cost)
      ? '<s class="cost-old">$' + cost + '</s><b class="cost-new">$' + eff + '</b>'
      : "$" + cost;
  }
  var why = taken ? " \u00B7 picked" : (noSlot ? " \u00B7 full" : (afford ? "" : " \u00B7 over"));
  var cls = "player-row cap-row" + (sel ? " sel" : "") + (open ? "" : " off");
  return '<div class="' + cls + '" role="button" tabindex="0" data-name="' + esc(name) + '" aria-pressed="' + sel + '"' +
    (open ? "" : ' aria-disabled="true"') + ">" +
    '<span class="pr-top"><span class="pr-name">' + esc(name) + "</span>" +
    '<span class="cap-cost">' + costHtml + "</span></span>" +
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
        '<span class="cap-note">Watch for random bargains and rip-offs.</span>' +
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
    if (G.refundFlash) { flashRefund(); G.refundFlash = null; }
    if (G.fireSaleFlash) { flashFireSale(); G.fireSaleFlash = null; }
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

function climbHtml(e, winsOverride) {
  var legends = META.legends || [];
  var G82 = CFG.GAMES_IN_SEASON;
  var FLOOR = 62, TOP = G82, TEAM_TOP = 73;     // 73 = highest real team ('16 Warriors)
  var LADDER_TOP = legends.reduce(function (m, L) { return Math.max(m, L.wins); }, TEAM_TOP);  // top pin sets the scale
  var youWins = (typeof winsOverride === "number") ? winsOverride : e.winTally;   // post-boost wins when the Hot Hand fired
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
        '</div>' +
      '</div>'
    : '';

  var ov = document.createElement("div");
  ov.className = "hh-overlay in" + (clutch ? "" : " hh-reveal");   // start opaque (no fade-in); "in" also = full opacity. non-81 gets opaque backdrop
  ov.innerHTML =
    '<button class="hh-skip" id="hhSkip">skip \u2192</button>' +
    '<div class="hh-card"><div class="goat-fw" id="hhFw" aria-hidden="true"></div>' +
      titleHtml +
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
      stageHtml + '</div>';
  document.body.appendChild(ov);
  if (clutch) {
    var fillEl = ov.querySelector("#hhFill"), bonusEl = ov.querySelector("#hhFillBonus");
    var baseFrac = Math.min(1, e.winTally / CFG.GAMES_IN_SEASON);   // wins you earned BEFORE the Hot Hand (gold, fixed)
    fillEl.style.transform = "scaleX(" + baseFrac.toFixed(4) + ")";
    bonusEl.style.left = (baseFrac * 100).toFixed(2) + "%";         // the bonus grows out from the base mark (red, glowing)
    bonusEl.style.width = "0%";
  }
  if (clutch) window.t82track && window.t82track("heatcheck_shown", { mode: MODE });

  function dismiss() { if (ov.parentNode) ov.parentNode.removeChild(ov); setTimeout(maybeShowRecap, 700); }
  function segs() { return ov.querySelectorAll(".hh-seg"); }

  function verdict() {
    window.t82track && window.t82track("heatcheck_result", { mode: MODE, segment: seg.label, hit_82: win ? 1 : 0 });
    // Final record is now known (any non-COLD segment moves it): write the Tribune.
    requestHeadline(e,
      segIdx > 0 ? hhWins(newNet) : e.winTally,
      segIdx > 0 ? newNet : e.net,
      segIdx > 0 ? { player: shareSurname(G.picks[hotIdx].row[IDX.name]), tier: seg.label } : null);
    if (segIdx > 0) {                                            // COLD = nobody caught fire: no flame, no highlight, no boost
      G.hotIdx = hotIdx;
      G.hotLvl = seg.lvl;                                        // tier reached (WARM 1 ... SUPERNOVA 4) -> picks the share emoji
      G.hotValue = hotV * (1 + (seg.m - 1) * HH_BONUS_SCALE);    // the hot player's post-boost value
      G.hotBase = e.net; G.hotNewNet = newNet; G.hotWins = hhWins(newNet);   // post-boost totals (drive record/net/share)
      var card = document.querySelector('.pick-card[data-pick="' + hotIdx + '"]');
      if (card) {
        card.classList.add("hot-pick");
        var pv = card.querySelector(".pr-v");
        if (pv) pv.innerHTML = "<small>V</small>" + hotV.toFixed(2) + ' <span class="hot-bonus">+ ' + (G.hotValue - hotV).toFixed(2) + "</span>";
      }
      var rec = document.querySelector(".big");                  // updated W/L record (the win rate)
      if (rec) rec.textContent = G.hotWins + "\u2013" + (CFG.GAMES_IN_SEASON - G.hotWins);
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
  // (auto-dunk). At the bottom it catches fire, then the sequence fires once.
  var lever = ov.querySelector("#hhLever"), arm = ov.querySelector("#hhArm");
  var TRAVEL = 150, RELEASE_AT = 0.97, dragging = false, startY = 0, pull = 0, fired = false;
  function setPull(p) {
    pull = p < 0 ? 0 : p > 1 ? 1 : p;
    arm.style.transform = "translateY(" + (pull * TRAVEL).toFixed(1) + "px)";
    if (pull >= 0.9) lever.classList.add("ignited"); else if (!fired) lever.classList.remove("ignited");
  }
  function fire() {
    if (fired) return; fired = true;
    if (clutch) window.t82track && window.t82track("heatcheck_action", { mode: MODE, pulled: 1 });
    lever.classList.add("pulling");
    arm.style.transition = "transform .28s cubic-bezier(.4,0,.7,1)";       // dunk it the rest of the way down
    setPull(1); lever.classList.add("ignited"); buzz(34);                  // through the net, catches fire
    setTimeout(function () {
      if (!clutch) {                                                       // ≤80 wins: the pull just reveals the results
        ov.classList.remove("in");                                         // fade the overlay away...
        setTimeout(dismiss, 470);                                          // ...then remove it (results are underneath)
        return;
      }
      ov.classList.add("lit"); run();                                      // exactly 81: the real Heat Check
    }, 640);
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

  ov.querySelector("#hhSkip").addEventListener("click", function () {
    if (clutch && !fired) window.t82track && window.t82track("heatcheck_action", { mode: MODE, pulled: 0 });
    dismiss();
  });
  var seeBtn = ov.querySelector("#hhSee");
  if (seeBtn) seeBtn.addEventListener("click", function () {
    dismiss();
    if (G.hotWins >= CFG.GAMES_IN_SEASON) fireWL();   // perfect record revealed -> emoji explosion in the W/L box
  });
  var againBtn = ov.querySelector("#hhAgain");
  if (againBtn) againBtn.addEventListener("click", function () {
    window.t82track && window.t82track("replay", { mode: MODE });
    dismiss(); newGame();
  });
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
  var hot = (typeof G.hotNewNet === "number");                   // Hot Hand boost (any non-COLD) applies to the shared totals
  var wins = hot ? G.hotWins : e.winTally;
  var netVal = hot ? G.hotNewNet : e.net;
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
    var flame = "";
    if (entry.i === G.hotIdx) {                                  // COLD never sets G.hotIdx; WARM stays emoji-free
      if (G.hotLvl === 4) flame = " \uD83C\uDF0B";               // SUPERNOVA -> volcano
      else if (G.hotLvl >= 2) flame = " \uD83D\uDD25";           // HOT / ON FIRE -> fire
    }
    return p.slot + " '" + String(p.row[IDX.season]).slice(-2) + " " + shareSurname(p.row[IDX.name]) + flame;
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

/* ---------- season recap: The True 82 Tribune ----------
   Every finished season ends on the Tribune's spinning front page — and for
   non-Heat-Check games the paper IS the reveal: results render underneath, the
   record breaks as the headline. Two-phase model calls keep costs down:
     phase 1 (every season)  — nickname + dek from POST /api/recap {phase:"headline"}
     phase 2 (READ MORE only) — the four-sentence story {phase:"article"}
   Both phases fail soft to local template copy so the paper ALWAYS lands. Model
   text is inserted with textContent only — never innerHTML — untrusted output. */

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
  return { nickname: nick, dek: "How " + byV[0].name + " and company landed at " + w + "-" + l, source: "fallback" };
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

// Phase 1: one headline request per season. Fired from showResults (non-clutch) or
// from the Heat Check verdict() with post-boost totals.
function requestHeadline(e, finalWins, finalNet, hh) {
  if (G.recapReq) return;
  G.recapReq = 1;
  G.recapPayload = buildRecapPayload(e, finalWins, finalNet, hh);
  G.recapWins = finalWins;
  var token = G, settled = false;
  function settle(d) {
    if (settled || token !== G) return;
    settled = true;
    G.recapHead = d;
    stampHeadline();
  }
  var ac = (typeof AbortController !== "undefined") ? new AbortController() : null;
  var timer = setTimeout(function () { if (ac) ac.abort(); settle(localHeadline(G.recapPayload)); }, 14000);
  try {
    fetch("/api/recap", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.assign({ phase: "headline" }, G.recapPayload)),
      signal: ac ? ac.signal : undefined
    }).then(function (r) { return r.json(); })
      .then(function (d) { clearTimeout(timer); settle(d && d.ok && d.nickname ? d : localHeadline(G.recapPayload)); })
      .catch(function () { clearTimeout(timer); settle(localHeadline(G.recapPayload)); });
  } catch (err) { clearTimeout(timer); settle(localHeadline(G.recapPayload)); }
}

// Phase 2: the story — only ever fired by READ MORE, written to match the nickname
// already in print (even a fallback nickname, so the piece never contradicts it).
function requestArticle() {
  if (G.recapArt || G.recapArtReq || !G.recapPayload || !G.recapHead) return;
  G.recapArtReq = 1;
  var token = G, settled = false;
  function settle(d) {
    if (settled || token !== G) return;
    settled = true;
    G.recapArt = d;
    inkInArticle();
  }
  var ac = (typeof AbortController !== "undefined") ? new AbortController() : null;
  var timer = setTimeout(function () { if (ac) ac.abort(); settle(localArticle(G.recapPayload)); }, 22000);
  try {
    fetch("/api/recap", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.assign({ phase: "article", nickname: G.recapHead.nickname }, G.recapPayload)),
      signal: ac ? ac.signal : undefined
    }).then(function (r) { return r.json(); })
      .then(function (d) { clearTimeout(timer); settle(d && d.ok && d.article ? d : localArticle(G.recapPayload)); })
      .catch(function () { clearTimeout(timer); settle(localArticle(G.recapPayload)); });
  } catch (err) { clearTimeout(timer); settle(localArticle(G.recapPayload)); }
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
  var paper = document.createElement("div"); paper.className = "np-paper" + (G.recapShown ? " np-quick" : "");
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
  var read = document.createElement("button"); read.type = "button"; read.className = "presti-spin np-read"; read.textContent = "READ MORE";
  acts.appendChild(read);
  paper.appendChild(acts);

  var under = div("np-under");
  var skip = document.createElement("button"); skip.type = "button"; skip.className = "presti-spin np-underbtn"; skip.textContent = "SKIP TO RESULTS";
  var again = document.createElement("button"); again.type = "button"; again.className = "presti-spin np-underbtn"; again.textContent = "RUN IT BACK";
  under.appendChild(skip); under.appendChild(again);

  ov.appendChild(paper); ov.appendChild(under);
  document.body.appendChild(ov);
  buzz(20);

  var tickTimer = setInterval(function () {
    var arr = paper.classList.contains("printing-art") ? NP_TICK_ART : NP_TICK_HEAD;
    ticker.textContent = arr[Math.floor(Date.now() / 1400) % arr.length];
  }, 1400);

  function close(fireworksOk) {
    clearInterval(tickTimer);
    if (ov.parentNode) ov.parentNode.removeChild(ov);
    if (fireworksOk && G.recapGateFw) { G.recapGateFw = 0; setTimeout(fireWL, 260); }
  }
  skip.addEventListener("click", function () {
    window.t82track && window.t82track("recap_skip", { mode: MODE });
    close(true);
  });
  again.addEventListener("click", function () {
    clearInterval(tickTimer);
    window.t82track && window.t82track("replay", { mode: MODE });
    if (ov.parentNode) ov.parentNode.removeChild(ov);
    newGame();
  });
  ov.addEventListener("click", function (ev) { if (ev.target === ov) { window.t82track && window.t82track("recap_skip", { mode: MODE }); close(true); } });
  read.addEventListener("click", function () {
    if (!paper.classList.contains("open")) {
      paper.classList.add("open");
      read.textContent = "CLOSE STORY";
      if (!G.recapReadTracked) { G.recapReadTracked = 1; window.t82track && window.t82track("recap_read", { mode: MODE }); }
      if (G.recapArt) { inkInArticle(); }
      else { paper.classList.add("printing-art"); ticker.style.display = ""; buildGhostArticle(); requestArticle(); }
    } else {
      paper.classList.remove("open");
      read.textContent = "READ MORE";
    }
  });

  function buildGhostArticle() {
    art.textContent = "";
    art.appendChild(div("np-byline", "TELETYPE \u2014 STORY DEVELOPING"));
    var g = div("np-ghostbody");
    for (var i = 0; i < 6; i++) g.appendChild(div("np-gline" + (i === 5 ? " short" : "")));
    art.appendChild(g);
  }

  // Fill-in renderers live on G so requestHeadline/requestArticle can reach the
  // open paper without holding stale DOM refs across games.
  G.npStamp = function () {
    if (!ov.parentNode || !G.recapHead) return;
    headWrap.textContent = "";
    var h = div("np-head np-stamp", String(G.recapHead.nickname).toUpperCase() + " FINISH " + wins + "\u2013" + losses);
    headWrap.appendChild(h);
    if (G.recapHead.dek) headWrap.appendChild(div("np-dek", G.recapHead.dek));
    if (!paper.classList.contains("printing-art")) { ticker.style.display = "none"; }
    paper.classList.add("ready");
    buzz(14);
    if (!G.recapShownTracked) {
      G.recapShownTracked = 1;
      window.t82track && window.t82track("recap_shown", { mode: MODE, wins: wins, segment: G.recapHead.source || "api", variant: String(G.recapHead.nickname).slice(0, 78) });
    }
  };
  G.npInk = function () {
    if (!ov.parentNode || !G.recapArt) return;
    paper.classList.remove("printing-art");
    ticker.style.display = "none";
    art.textContent = "";
    art.appendChild(div("np-byline", "From the Tribune wire desk"));
    var body = document.createElement("p"); body.className = "np-body ink-in"; body.textContent = G.recapArt.article;
    art.appendChild(body);
  };

  if (G.recapHead) G.npStamp();
  else {
    var gh = div("np-headghost");
    gh.appendChild(div("np-gline")); gh.appendChild(div("np-gline")); gh.appendChild(div("np-gline short"));
    headWrap.appendChild(gh);
  }
  if (paper.classList.contains("open") && G.recapArt) G.npInk();
  G.recapShown = 1;

  function npDate() {
    var m = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"], t = new Date();
    return m[t.getMonth()] + " " + t.getDate() + ", " + t.getFullYear();
  }
}
function stampHeadline() { if (G.npStamp) G.npStamp(); }
function inkInArticle() { if (G.npInk) G.npInk(); }

function showResults() {
  G.screen = "results";
  if (MODE === "kaman") {
    renderKamanResults();
    window.t82track && window.t82track("game_complete", { mode: "kaman", wins: CFG.GAMES_IN_SEASON, undefeated: 1 });
    gameFinishedPings();
    return;
  }
  var e = engine(G.picks.map(function (p) { return p.row; }), G.picks.map(function (p) { return p.slot; }));
  renderResults(e, false);
  if (window.t82track) {
    var gc = { mode: MODE, wins: e.winTally, net: e.net, undefeated: e.winTally >= CFG.GAMES_IN_SEASON ? 1 : 0 };
    if (MODE === "cap") {
      gc.budget_used = G.maxCap - G.budget;                                            // $ spent incl. rerolls
      gc.roster_value = G.picks.reduce(function (s, p) { return s + (p.cost || 0); }, 0); // $ on the five
    }
    window.t82track("game_complete", gc);
  }
  gameFinishedPings();
}

function renderResults(e, keepScroll) {
  renderPips();
  var scrollY = keepScroll ? window.scrollY : 0;
  var picksHtml = picksInSlotOrder().map(function (entry) {
    var p = entry.p, i = entry.i, row = p.row, name = row[IDX.name];
    return '<div class="pick-card" data-pick="' + i + '">' +
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
    resultsTopBarHtml() +
    '<section class="board"><div class="goat-fw" id="wlFw" aria-hidden="true"></div><p class="eyebrow">Front office projection \u00B7 ' + (MODE === "pro" ? "pro draft" : MODE === "cap" ? "salary cap" : "classic draft") + "</p>" +
      '<div class="big">' + e.winTally + "\u2013" + (CFG.GAMES_IN_SEASON - e.winTally) + "</div><div class=\"big-label\">net rating " + signed1(e.net) + "</div>" +
      (MODE === "cap" ? '<div class="cap-spent">$' + G.budget + ' cap space</div>' : "") +
      '<button class="btn btn-primary btn-block presti-spin" id="shareTeamBtn">SHARE YOUR TEAM</button></section>' +
    '<section class="section twoway-sec">' + twoWayHtml(e) + "</section>" +
    '<section class="section"><p class="eyebrow">Your five</p>' + picksHtml + "</section>" +
    '<section class="section"><p class="eyebrow">GOAT Climb</p>' + climbHtml(e) + "</section>" +
    '<section class="section"><p class="eyebrow">Scoring Card</p>' + ledger + "</section>" +
    '<div class="actions"><button class="btn btn-primary presti-spin" id="againBtn">Run it back</button></div>' +
    '<p class="run-status" id="runStatus"></p>';

  el("againBtn").addEventListener("click", function () {
    window.t82track && window.t82track("replay", { mode: MODE });
    newGame();
  });
  wireStartOver();
  wireDonate();
  el("shareTeamBtn").addEventListener("click", function () {
    var e2 = engine(G.picks.map(function (p) { return p.row; }), G.picks.map(function (p) { return p.slot; }));
    if (window.t82track) {
      var sw = (typeof G.hotNewNet === "number") ? G.hotWins : e2.winTally;
      window.t82track("share", { mode: MODE, wins: sw, undefeated: sw >= CFG.GAMES_IN_SEASON ? 1 : 0 });
    }
    shareOrCopy(shareText(e2));
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
    requestHeadline(e, e.winTally, e.net, null);
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
  wireDonate();
  el("shareTeamBtn").addEventListener("click", function () {
    window.t82track && window.t82track("share", { mode: "kaman", wins: CFG.GAMES_IN_SEASON, undefeated: 1 });
    shareOrCopy(kamanShareText());
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

// Crests are decorative — load them separately and in the background so they never
// block the game. If this fetch fails or is slow, the game plays fine with no crests.
function loadCrests() {
  fetch("crests.json")
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (c) {
      if (c && typeof c === "object") {
        Object.keys(c).forEach(function (k) { CRESTS[k] = c[k]; });
        CREST_POOL = null;   // rebuild the decoy pool now that real crests exist
        refreshTicketArt();  // ticket already on screen? paint the logo in now
      }
    })
    .catch(function () {});
}

// Footer stat line — finished drafts per mode + Presti winrate (82-0 with OR without
// the Hot Hand), read from D1 via /api/stats: the same store /avocado reads, so the
// footer can't disagree with the dashboard. Fails soft: on any error the footer just
// shows the contact line with no dangling separator.
function setFootStats(d) {
  var el = document.getElementById("footStats");
  if (!el || !d || typeof d.presti !== "number") return;
  // All zeros = DB unbound or brand-new database. Show nothing rather than a fake
  // "0 drafts" row — a degraded deploy must not look like a dead game.
  if (!((d.presti || 0) + (d.classic || 0) + (d.pro || 0))) { el.innerHTML = ""; return; }
  var rate = d.presti ? Math.round(1000 * (d.presti82 || 0) / d.presti) / 10 : 0;
  function seg(txt) { return '<span class="foot-seg">' + txt + "</span>"; }
  el.innerHTML = [
    seg(d.presti.toLocaleString() + " Presti drafts"),
    seg((d.classic || 0).toLocaleString() + " Classic drafts"),
    seg((d.pro || 0).toLocaleString() + " Pro drafts"),
    seg("Presti WR " + rate + "%")
  ].join(" | ");
}
function fetchFootStats() {
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
// One game just finished: bump the KV counter, then refresh the footer once the
// game_complete insert has had a moment to land in D1. Best effort — a miss here
// self-heals on the next page load.
function gameFinishedPings() {
  pingGames("POST");
  try { if (window.T82ACC) T82ACC.submitRun(); } catch (e) {}   // core-truth replay submit (accounts.js); kaman self-skips
  setTimeout(fetchFootStats, 1500);
}

function boot() {
  bindHaptics();
  bindVisibilityResync();
  if (DUEL_ID) { app().innerHTML = '<section class="ticket duel"><p class="duel-wait">Setting the table\u2026</p></section>'; }
  else if (LEAGUE_ID && window.T82LGUI) { var lgi = LEAGUE_ID; LEAGUE_ID = null; T82LGUI.route(lgi); }
  else renderIntro();   // the intro needs no player data — show it instantly instead of a loading screen
  loadCrests();      // crests download in the background, non-blocking
  fetchFootStats();  // footer stat line — tiny request, independent of the big payload
  var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
  fetch(CFG.DATA_URL)
    .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
    .then(function (data) {
      initData(data);
      DATA_READY = true;
      var ms = Math.round(((window.performance && performance.now) ? performance.now() : Date.now()) - t0);
      window.t82track && window.t82track("data_ready", { load_ms: ms });
      if (DUEL_ID && window.T82DUI) { var di = DUEL_ID; DUEL_ID = null; T82DUI.route(di); }  // duel deep link wins the boot race
      else if (PENDING_FN) { var pf = PENDING_FN; PENDING_FN = null; pf(); }               // queued daily/weekly launch
      else if (PENDING_MODE) { var pm = PENDING_MODE; PENDING_MODE = null; newGame(pm); }   // player tapped a mode while data was still loading
    })
    .catch(function (err) {
      window.t82track && window.t82track("data_error", {});
      showError("Couldn\u2019t load " + esc(CFG.DATA_URL) + " (" + esc(err.message) + "). Serve this folder over HTTP \u2014 e.g. <span class=\"mono\">python3 -m http.server</span> \u2014 rather than opening index.html as a file.");
    });
}

if (typeof document !== "undefined" && document.getElementById) { boot(); }
