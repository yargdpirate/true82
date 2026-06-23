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
  POS_THRESHOLD: 20
};

var BUCKETS = ["G", "F", "C"];
var BUCKET_NAME = { G: "Guard", F: "Forward", C: "Center" };
var BUCKET_CAP = { G: 2, F: 2, C: 1 };
CFG.ROUNDS = BUCKETS.reduce(function (s, b) { return s + BUCKET_CAP[b]; }, 0);
var MODE = "classic";

var META = null, SC = null, IDX = null;
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
}

/* ---------- eligibility helpers ---------- */

function bucketOpen(b) { return G.filled[b] < BUCKET_CAP[b]; }
function openBuckets() { return BUCKETS.filter(bucketOpen); }
function rowOpenBuckets(row) { return rowBuckets(row).filter(bucketOpen); }
function rowDraftable(row) { return !G.drafted.has(row[IDX.name]) && rowOpenBuckets(row).length > 0; }

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
  return list.filter(function (f) { return f !== G.cur.fr && !G.seenFr.has(f) && poolHasEligible(f, G.cur.dec); });
}
// Skip era: other UNUSED eras where the SAME franchise can fill an open slot
function eraSkipTargets() {
  return DECADES.filter(function (d) {
    return d !== G.cur.dec && !G.seenDec.has(d) && poolHasEligible(G.cur.fr, d);
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
    teamSkips: 1,
    eraSkips: 1,
    seenFr: new Set(),
    seenDec: new Set(),
    cur: null,
    selected: null,
    yearByName: {},
    screen: "draft"
  };
  nextRound(true);
}

function nextRound(animate) {
  G.round += 1;
  if (G.round > CFG.ROUNDS) { showResults(); return; }
  var fresh = availableEras().filter(function (d) { return !G.seenDec.has(d); });
  var avail = fresh.length ? fresh : availableEras();   // fall back to a repeat era only if every era's been used
  if (!avail.length) { showResults(); return; }
  var dec = pick1(avail);
  G.cur = { dec: dec, fr: randFranchise(dec, G.seenFr) };
  G.seenDec.add(G.cur.dec);
  G.seenFr.add(G.cur.fr);
  G.selected = null;
  G.yearByName = {};
  renderDraft(animate ? { dec: true, fr: true } : false);
}

function doTeamSkip() {
  if (!G.teamSkips) return;
  var targets = teamSkipTargets();
  if (!targets.length) return;
  G.teamSkips -= 1;
  G.cur.fr = pick1(targets);          // same era, different (unused) franchise
  G.seenFr.add(G.cur.fr);
  G.selected = null;
  G.yearByName = {};
  renderDraft({ dec: false, fr: true });
}

function doEraSkip() {
  if (!G.eraSkips) return;
  var targets = eraSkipTargets();
  if (!targets.length) return;
  G.eraSkips -= 1;
  G.cur.dec = pick1(targets);         // same franchise, different (unused) era
  G.seenDec.add(G.cur.dec);
  G.selected = null;
  G.yearByName = {};
  renderDraft({ dec: true, fr: false });
}

function lastNameKey(name) {
  var parts = String(name).split(" ");
  while (parts.length > 1 && /^(jr\.?|sr\.?|ii|iii|iv|v)$/i.test(parts[parts.length - 1])) parts.pop();
  return (parts[parts.length - 1] + " " + name).toLowerCase();
}

function currentPoolRows() {
  var pool = POOLS.get(key(G.cur.fr, G.cur.dec));
  var rows = [];
  if (pool) pool.forEach(function (row, name) { if (!G.drafted.has(name)) rows.push(row); });
  rows.sort(function (a, b) {
    var ka = lastNameKey(a[IDX.name]), kb = lastNameKey(b[IDX.name]);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  return rows;
}

// The row to use for a player in the current cell: the user's chosen season if
// one is set (and still valid for this cell), otherwise the best season (default).
function resolveRow(name) {
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
  G.drafted.add(G.selected);
  G.filled[bucket] += 1;
  G.picks.push({ row: row, fr: G.cur.fr, dec: G.cur.dec, slot: bucket });
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
      '<button class="btn btn-primary btn-block" id="startClassic">\uD83C\uDFC0 Classic \u00B7 full stats</button>' +
      '<button class="btn btn-primary btn-block" id="startPro">\uD83D\uDC10 Pro \u00B7 no stats, draft from memory</button>' +
      '<p class="eyebrow">Draft</p>' +
      "<p>Draft a 5-man roster with 2 guards, 2 forwards, and a center. You get a random team from a random decade. Pick a guy who played for that team in that era. Pick any season he played. You can reroll the era and the team once each per draft.</p>" +
      '<p class="eyebrow">Winning</p>' +
      "<p>Recommended to have at least <strong>3 shooters</strong> and <strong>1 role player</strong>. Based mostly on OBPM and DBPM (why we only go back to 1974) + some minor custom tweaks. Some players from low/no 3pt era get 3pt shooter bonuses based on reputation and vibes.</p>" +
    "</section>";
  el("startClassic").addEventListener("click", function () { newGame("classic"); });
  el("startPro").addEventListener("click", function () { newGame("pro"); });
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
    for (var i = 0; i < BUCKET_CAP[b]; i++) {
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
  if (opts.length === 1) {
    return '<button class="confirm-btn" data-bucket="' + opts[0] + '">Draft ' + esc(G.selected) + " " + yr + " \u00B7 " + BUCKET_NAME[opts[0]] + "</button>";
  }
  return '<div class="confirm-label">Assign ' + esc(G.selected) + " " + yr + " to:</div>" +
    '<div class="confirm-multi">' + opts.map(function (b) {
      return '<button class="confirm-btn" data-bucket="' + b + '">' + BUCKET_NAME[b] + "</button>";
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

function poolInnerHtml(rows) { return rows.map(poolRowHtml).join(""); }

function selectRow(node) {
  var pool = el("pool");
  if (!pool) return;
  var prev = pool.querySelector(".player-row.sel");
  if (prev && prev !== node) { prev.classList.remove("sel"); prev.setAttribute("aria-pressed", "false"); }
  node.classList.add("sel");
  node.setAttribute("aria-pressed", "true");
  G.selected = node.getAttribute("data-name");
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
  document.body.classList.add("drafting");
  renderPips();
  var rows = currentPoolRows();
  var codes = {};
  rows.forEach(function (r) { codes[r[IDX.team]] = true; });
  var codeStr = Object.keys(codes).sort().join("/");

  var teamSkippable = G.teamSkips > 0 && teamSkipTargets().length > 0;
  var eraSkippable = G.eraSkips > 0 && eraSkipTargets().length > 0;

  var poolHtml = poolInnerHtml(rows);

  var crest = crestFor(G.cur.fr, G.cur.dec);
  var artHtml = crest
    ? '<div class="ticket-art"><img id="flapArt" class="crest-img flap" alt="' +
        esc(titleCase(G.cur.fr) + " " + decLabel(G.cur.dec)) + '" src="' + crest + '"></div>'
    : "";

  app().innerHTML =
    startOverBtnHtml() +
    '<section class="ticket">' +
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
        '<button class="skip-btn" id="skipTeam"' + (teamSkippable ? "" : " disabled") + ">Skip team \u00B7 " + G.teamSkips + " left</button>" +
        '<button class="skip-btn" id="skipEra"' + (eraSkippable ? "" : " disabled") + ">Skip era \u00B7 " + G.eraSkips + " left</button>" +
      "</div>" +
    "</section>" +
    '<div class="pool-head"><span class="pool-count">pick one \u00B7 any season via \u25BE \u00B7 A\u2013Z</span></div>' +
    '<div class="pool" id="pool">' + poolHtml + "</div>" +
    '<div class="tray"><div class="tray-inner" id="trayInner"></div></div>';

  updateTray();

  wireStartOver();
  if (teamSkippable) el("skipTeam").addEventListener("click", doTeamSkip);
  if (eraSkippable) el("skipEra").addEventListener("click", doEraSkip);
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

  if (anim) {
    if (anim.dec) reveal("flapDec");
    if (anim.fr) reveal("flapFr");
    if (anim.dec || anim.fr) reveal("flapArt");
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
  var FLOOR = 62, TOP = G82, TEAM_TOP = 73;     // 73 = highest team ('16 Warriors)
  var youWins = e.winTally;          // integer record places the dot and drives comparisons
  var below = youWins < FLOOR;

  // Layout in pixels so the 62->73 cluster spacing is fixed, then the track height ADAPTS to
  // the case so there's no dead space below the floor: a below-floor five needs a little room
  // under the Spurs for its marker, an on-board five ends flush at the Spurs. The empty 73->82
  // span compresses into the top band. RX must equal --rail-x.
  var BAND_PX = 60, CLUSTER_PX = 200, FLOOR_PX = BAND_PX + CLUSTER_PX;
  var BOTTOM_PX = below ? 50 : 14, TRACK_PX = FLOOR_PX + BOTTOM_PX;
  var Y_SUMMIT = 0, RX = 56;
  var Y_TEAMTOP = BAND_PX / TRACK_PX * 100, Y_FLOOR = FLOOR_PX / TRACK_PX * 100;
  function yPct(w) {
    if (w <= TEAM_TOP) return Y_TEAMTOP + (TEAM_TOP - w) / (TEAM_TOP - FLOOR) * (Y_FLOOR - Y_TEAMTOP);
    return (TOP - w) / (TOP - TEAM_TOP) * Y_TEAMTOP;   // compressed elite band (73..82)
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

  var perfect = youWins >= TOP;                 // 82-0
  var sub;
  if (perfect) sub = "\uD83D\uDC10 perfect season";
  else if (youWins > TEAM_TOP) sub = "\uD83D\uDC10, but not 82\u20130";
  else if (below) sub = "oof.";
  else if (rank === 1) sub = "tops the win board";
  else sub = "#" + rank + " of " + total + (comp ? " \u00B7 \u2248 " + esc(comp.label) : "");

  var youMarker;
  if (below) {
    youMarker = '<div class="climb-you below" style="top:' + ((FLOOR_PX + 22) / TRACK_PX * 100).toFixed(2) + '%">' +
        '<span class="cy-arrow">\u25BC</span>' +
        '<span class="cy-label">YOUR FIVE<small>' + esc(sub) + "</small></span>" +
      "</div>";
  } else {
    youMarker = '<div class="climb-you" style="top:' + youY.toFixed(2) + '%">' +
        '<span class="cy-dot"></span>' +
        '<span class="cy-label">YOUR FIVE<small>' + esc(sub) + "</small></span>" +
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

function picksInSlotOrder() {
  return G.picks.map(function (p, i) { return { p: p, i: i }; }).sort(function (a, b) { return BUCKETS.indexOf(a.p.slot) - BUCKETS.indexOf(b.p.slot); });
}

function shareModeLabel() { return MODE === "pro" ? "Pro" : "Classic"; }
function shareSurname(nm) {
  var parts = String(nm).trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  var rest = parts.slice(1);
  while (rest.length > 1 && /^(jr\.?|sr\.?|ii|iii|iv|v)$/i.test(rest[rest.length - 1])) rest.pop();
  return parts[0].charAt(0) + ". " + rest.join(" ");
}
function shareText(e) {
  var wins = e.winTally, losses = CFG.GAMES_IN_SEASON - wins, undef = wins >= CFG.GAMES_IN_SEASON;
  var head = "\uD83C\uDFC0 TRUE 82 (" + shareModeLabel() + ")";
  var line2 = (undef ? "\uD83C\uDFC6 " : "") + wins + "\u2013" + losses + " | \uD83D\uDCCA Net " + signed1(e.net);
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
    '<section class="board"><p class="eyebrow">Front office projection \u00B7 ' + (MODE === "pro" ? "pro draft" : "classic draft") + "</p>" +
      '<div class="big">' + e.winTally + "\u2013" + (CFG.GAMES_IN_SEASON - e.winTally) + "</div><div class=\"big-label\">net rating " + signed1(e.net) + "</div>" +
      '<button class="btn btn-primary btn-block" id="shareTeamBtn">SHARE YOUR TEAM</button></section>' +
    '<section class="section twoway-sec">' + twoWayHtml(e) + "</section>" +
    '<section class="section"><p class="eyebrow">Your five</p>' + picksHtml + "</section>" +
    '<section class="section"><p class="eyebrow">GOAT Climb</p>' + climbHtml(e) + "</section>" +
    '<section class="section"><p class="eyebrow">Scoring Card</p>' + ledger + "</section>" +
    '<div class="actions"><button class="btn btn-primary" id="againBtn">Run it back</button></div>';

  el("againBtn").addEventListener("click", function () { newGame(); });
  wireStartOver();
  el("shareTeamBtn").addEventListener("click", function () {
    var e2 = engine(G.picks.map(function (p) { return p.row; }), G.picks.map(function (p) { return p.slot; }));
    shareOrCopy(shareText(e2));
  });
  setupGoatFireworks(e.winTally >= CFG.GAMES_IN_SEASON);
  window.scrollTo(0, scrollY);
}

/* ---------- boot ---------- */

function showError(msg) { app().innerHTML = '<div class="error-box">' + msg + "</div>"; }

function setGamesPlayed(n) {
  var el = document.getElementById("gamesPlayed");
  if (el && typeof n === "number") el.textContent = n.toLocaleString() + " games played";
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
  fetch(CFG.DATA_URL)
    .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
    .then(function (data) { initData(data); renderIntro(); pingGames("GET"); })
    .catch(function (err) {
      showError("Couldn\u2019t load " + esc(CFG.DATA_URL) + " (" + esc(err.message) + "). Serve this folder over HTTP \u2014 e.g. <span class=\"mono\">python3 -m http.server</span> \u2014 rather than opening index.html as a file.");
    });
}

if (typeof document !== "undefined" && document.getElementById) { boot(); }
