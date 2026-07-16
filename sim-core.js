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
  var FRANCHISES = [], CAREER_BUCKETS = new Map(), KAMAN_SEASONS = [], DRAFT_ROWS = [];
  var CAP_BUDGET = 50, CAP_TRAP = 0.50, CAP_GEM = 0.15;
  var DATA_VERSION = 0;

  // ---- MANUAL PLAYER-VALUE ADJUSTMENTS (VALUE_ADJ) -------------------------
  // Hand-curated deltas added to a player-season's engine value (bpm_star) for
  // specific seasons. Applied in initDataCore BEFORE pools/costs, so value, the
  // salary-cap price (cost is ~0.26*(value)^2, so a flat bump costs more on
  // stronger seasons), and the win projection all pick it up automatically. The
  // Offense/Defense bars are NOT touched (they keep reading raw OBPM/DBPM).
  //   n   = exact dataset name (validated against site_data.json)
  //   adj = delta added to bpm_star (and adj/2 to each bar)
  //   w   = one or more windows. [y0,y1] = seasons y0..y1 inclusive (END-YEAR:
  //         2015 = the 2014-15 season), all teams. [y0,y1,"TEAM"] scopes to one
  //         team (only needed to disambiguate a same-season two-team split).
  //   mp  = optional minutes floor: skip rows below it (drops tiny mid-season
  //         slivers, e.g. Durant's 269-min 2023 PHO stint).
  var VALUE_ADJ = [
    { n:"Moses Malone",             adj:1.75, w:[[1979,1983]] },
    { n:"Steve Nash",               adj:1.50, w:[[2005,2010]] },
    { n:"James Worthy",             adj:1.50, w:[[1985,1991]] },
    { n:"Klay Thompson",            adj:1.25, w:[[2015,2019]] },
    { n:"Chris Bosh",               adj:1.25, w:[[2011,2014]] },
    { n:"Isiah Thomas",             adj:1.00, w:[[1984,1990]] },
    { n:"Patrick Ewing",            adj:1.00, w:[[1989,1995]] },
    { n:"Tony Parker",              adj:1.00, w:[[2005,2014]] },
    { n:"Andre Iguodala",           adj:1.00, w:[[2015,2019]] },
    { n:"Rasheed Wallace",          adj:1.00, w:[[2001,2006]] },
    { n:"Bob McAdoo",               adj:1.00, w:[[1974,1976]] },
    { n:"Pete Maravich",            adj:1.00, w:[[1974,1977]] },
    { n:"Artis Gilmore",            adj:1.00, w:[[1977,1979]] },
    { n:"Aaron Gordon",             adj:1.00, w:[[2022,2026]] },
    { n:"Nikola Jokić",             adj:1.00, w:[[2021,2026]] },
    { n:"Tim Duncan",               adj:0.75, w:[[2002,2007]] },
    { n:"Hakeem Olajuwon",          adj:0.75, w:[[1989,1995]] },
    { n:"Dirk Nowitzki",            adj:0.75, w:[[2006,2011]] },
    { n:"Kevin McHale",             adj:0.75, w:[[1984,1988]] },
    { n:"Pau Gasol",                adj:0.75, w:[[2008,2012]] },
    { n:"Joe Dumars",               adj:0.75, w:[[1988,1993]] },
    { n:"Dennis Johnson",           adj:0.75, w:[[1979,1987]] },
    { n:"Michael Cooper",           adj:0.75, w:[[1982,1988]] },
    { n:"Shane Battier",            adj:0.75, w:[[2006,2013]] },
    { n:"Bruce Bowen",              adj:0.75, w:[[2003,2007]] },
    { n:"Kevin Durant",             adj:0.75, w:[[2021,2026]], mp:785 },
    { n:"George Gervin",            adj:0.75, w:[[1978,1982]] },
    { n:"David Thompson",           adj:0.75, w:[[1976,1978]] },
    { n:"Elvin Hayes",              adj:0.75, w:[[1974,1979]] },
    { n:"Walt Frazier",             adj:0.75, w:[[1974,1975]] },
    { n:"Larry Bird",               adj:0.50, w:[[1984,1988]] },
    { n:"Kobe Bryant",              adj:0.50, w:[[2001,2010]] },
    { n:"Charles Barkley",          adj:0.50, w:[[1987,1993]] },
    { n:"Robert Parish",            adj:0.50, w:[[1980,1987]] },
    { n:"Tayshaun Prince",          adj:0.50, w:[[2004,2008]] },
    { n:"Kentavious Caldwell-Pope", adj:0.50, w:[[2020,2020],[2023,2024]] },
    { n:"Jrue Holiday",             adj:0.50, w:[[2021,2026]] },
    { n:"Brook Lopez",              adj:0.50, w:[[2019,2024]] },
    { n:"Derrick White",            adj:0.50, w:[[2023,2025]] },
    { n:"Mikal Bridges",            adj:0.50, w:[[2021,2022]] },
    { n:"Ben Wallace",              adj:0.50, w:[[2002,2006]] },
    { n:"Dikembe Mutombo",          adj:0.50, w:[[1995,2001]] },
    { n:"Dwight Howard",            adj:0.50, w:[[2009,2012]] },
    { n:"Bill Walton",              adj:0.50, w:[[1977,1978]] },
    { n:"Rick Barry",               adj:0.50, w:[[1974,1976]] },
    { n:"Tiny Archibald",           adj:0.25, w:[[1974,1975]] },
    { n:"John Havlicek",            adj:0.25, w:[[1974,1978]] },
    { n:"Jerry West",               adj:0.25, w:[[1974,1974]] }
  ];
  function valueAdjMatch(win, season, team) {
    for (var i = 0; i < win.length; i++) {
      var y0 = win[i][0], y1 = win[i][1], tm = win[i][2];
      if (season < y0 || season > y1) continue;
      if (tm && team !== tm) continue;
      return true;
    }
    return false;
  }

  // Draft eligibility belongs to the team stint, but the selected player's
  // value and rate stats should represent his full season. The source bundle
  // contains one row per stint and minutes, but not games played, so traded
  // seasons are reconstructed with minute-weighted rates. Every stint receives
  // the same whole-season statistical row while retaining its own team code and
  // stint-minute floor. Array properties are runtime-only and never serialized.
  function stintMinutes(row) {
    return row && typeof row._stintMp === "number" ? row._stintMp : row[IDX.mp];
  }
  function buildDraftRows(players) {
    var groups = new Map();
    players.forEach(function (row) {
      var k = row[IDX.name] + "\u0000" + row[IDX.season];
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(row);
    });
    var weighted = [IDX.bpm_star, IDX.usage, IDX.rim, IDX.pm, IDX.ppg,
      IDX.rpg, IDX.apg, IDX.spg, IDX.bpg, IDX.g_pct, IDX.f_pct,
      IDX.c_pct, IDX.dbpm, IDX.obpm];
    var out = [];
    players.forEach(function (stint) {
      var k = stint[IDX.name] + "\u0000" + stint[IDX.season];
      var group = groups.get(k) || [stint];
      var totalMp = 0;
      for (var i = 0; i < group.length; i++) totalMp += Math.max(0, Number(group[i][IDX.mp]) || 0);
      if (!(totalMp > 0)) totalMp = group.length;
      var full = stint.slice();
      for (var j = 0; j < weighted.length; j++) {
        var col = weighted[j], sum = 0;
        for (i = 0; i < group.length; i++) {
          var w = Math.max(0, Number(group[i][IDX.mp]) || 0) || (totalMp === group.length ? 1 : 0);
          sum += (Number(group[i][col]) || 0) * w;
        }
        full[col] = sum / totalMp;
      }
      // The spacing domain is intentionally half-step categorical. Rebuild the
      // season tag from the weighted stint tags without introducing odd decimals.
      var spSum = 0;
      for (i = 0; i < group.length; i++) {
        var sw = Math.max(0, Number(group[i][IDX.mp]) || 0) || (totalMp === group.length ? 1 : 0);
        spSum += (Number(group[i][IDX.sp]) || 0) * sw;
      }
      full[IDX.sp] = Math.max(0, Math.min(1.5, Math.round((spSum / totalMp) * 2) / 2));
      full[IDX.mp] = group.reduce(function (n, r) { return n + (Number(r[IDX.mp]) || 0); }, 0);
      full[IDX.team] = stint[IDX.team];
      full[IDX.pos] = stint[IDX.pos];
      full._stintMp = Number(stint[IDX.mp]) || 0;
      full._stintTeam = stint[IDX.team];
      out.push(full);
    });
    return out;
  }

  // ---- SHOOTER LABELS (floor-spacing tags) ---------------------------------
  // Manual shooter tagging applied in initDataCore AFTER the algorithmic sp,
  // overriding it. Sets row[IDX.sp]: NEVER -> 0, ALWAYS -> 1, SUPER -> SUPER_SP
  // (elite gravity: counts as 1.5 floor-spacers toward SPACERS_REQ, so spacing
  // now moves in half-shooter steps). SUPER wins any overlap (applied last).
  // These REPLACE the old meta.sp_override / meta.sp_never lists.
  var SUPER_SP = 1.5;
  var ALWAYS_SHOOTER = [
    "Pete Maravich", "Fred Brown", "Rick Barry", "Jon McGlocklin", "Brian Winters",
    "Chris Ford", "Louie Dampier", "Glen Combs", "Rick Mount", "Bill Keller", "Brian Taylor",
    "Kevin Grevey", "Larry Bird", "Dan Issel", "Bingo Smith", "Geoff Petrie", "Scott Wedman",
    "Jon Sundvold", "Mike Evans", "Kyle Macy", "Jerry Sichting", "John Roche", "Mike Gminski",
    "Victor Wembanyama", "Tim Hardaway Jr.", "Nicolas Batum", "Jayson Tatum", "Jaylen Brown",
    "Paul George", "Eric Gordon", "Jordan Clarkson", "Myles Turner", "Malik Monk",
    "Chris Paul", "Devin Booker", "Rasheed Wallace", "Bradley Beal", "Jamal Crawford",
    "John Stockton", "Jack Sikma", "George Gervin", "World B. Free", "Kiki Vandeweghe",
    "Calvin Murphy", "Eddie Johnson", "Darrell Griffith", "Michael Cooper", "Danny Ainge",
    "Craig Hodges", "Bob McAdoo", "Jerry West", "Ron Boone", "Kobe Bryant", "Tracy McGrady",
    "Toni Kukoč", "Detlef Schrempf", "Sam Perkins", "Robert Horry", "Arvydas Sabonis",
    "Brandon Roy"
  ];
  var NEVER_SHOOTER = [
    "Kareem Abdul-Jabbar", "Moses Malone", "Robert Parish", "Kevin McHale", "James Worthy",
    "Dominique Wilkins", "Clyde Drexler", "Magic Johnson", "Isiah Thomas", "Michael Jordan",
    "Charles Barkley", "Karl Malone", "Hakeem Olajuwon", "Patrick Ewing", "Bill Cartwright",
    "Mark Eaton", "Manute Bol", "Tree Rollins", "Darryl Dawkins", "Buck Williams",
    "Charles Oakley", "A.C. Green", "Horace Grant", "Larry Nance", "Terry Cummings",
    "Otis Thorpe", "Mychal Thompson", "Caldwell Jones", "Kurt Rambis", "Alex English",
    "Adrian Dantley", "Bernard King", "Walter Davis", "Mark Aguirre", "Orlando Woolridge",
    "Kelly Tripucka", "Reggie Theus", "Rolando Blackman", "Ricky Pierce", "Purvis Short",
    "Maurice Cheeks", "Dennis Johnson", "Sidney Moncrief", "Michael Ray Richardson",
    "Alvin Robertson", "Fat Lever", "Mark Jackson", "Doc Rivers", "John Bagley",
    "Johnny Dawkins", "Sleepy Floyd", "Norm Nixon", "Bobby Jones", "Cedric Maxwell",
    "David Thompson", "Randy Smith", "James Silas", "Billy Knight", "Maurice Lucas",
    "Larry Kenon", "Alvan Adams", "Mark Olberding", "Mickey Johnson", "Mike Mitchell",
    "Thurl Bailey", "Jay Vincent", "Roy Hinson", "John Havlicek", "Bob Love", "Bob Dandridge",
    "Spencer Haywood", "Dave Greenwood", "Tom Boswell", "Warren Jabali", "Dennis Rodman",
    "David Robinson", "Kevin Garnett", "George McGinnis", "Marques Johnson", "Gerald Wallace",
    "Paul Pressey", "Kevin Johnson", "Rajon Rondo", "John Wall", "Gus Williams", "Grant Hill",
    "Shawn Marion", "Ron Harper", "Lamar Odom", "Chris Webber", "Andrei Kirilenko",
    "Derrick Rose", "Allen Iverson", "Ja Morant"
  ];
  var SUPER_SHOOTER = [
    "Stephen Curry", "Damian Lillard", "James Harden", "Trae Young", "Luka Dončić",
    "LaMelo Ball", "Gilbert Arenas", "Michael Adams", "Klay Thompson", "Reggie Miller",
    "Ray Allen", "Kyle Korver", "JJ Redick", "Peja Stojaković", "Duncan Robinson",
    "Buddy Hield", "Seth Curry"
  ];

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

// Eligible seasons for a player in the current team/era: the >785-minute floor that
// gates the regular draft. Kaman and challenges keep the full set. Shared by the pro
// season-assigner and the UI (pool visibility + the season dropdown) so all three agree.
function poolYearsEligible(S, name) {
  var yrs = POOL_YEARS.get(key(S, S.cur.fr, S.cur.dec));
  var arr = yrs ? yrs.get(name) : null;
  if (!arr) return [];
  if (S.mode === "kaman" || S.ch) return arr.slice();
  return arr.filter(function (r) { return stintMinutes(r) > 785; });
}

function assignProSeasons(S) {
  var k = key(S, S.cur.fr, S.cur.dec);
  var pool = POOLS.get(k), yrs = POOL_YEARS.get(k);
  if (!pool || !yrs) return;
  pool.forEach(function (row, name) {
    var elig = poolYearsEligible(S, name);
    if (elig.length) S.yearByName[name] = elig[rndi(S, elig.length)][IDX.season];   // random ELIGIBLE season; players with none are left unset and hidden by the UI
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
    var elig = S.ch ? arr : arr.filter(function (r) { return stintMinutes(r) > 785; });   // regular draft filters to >785 min; challenges keep the full pool
    if (!elig.length) return;                                          // no eligible season -> off the board
    var cands = elig;
    if (avoid && avoid[name] != null && elig.length > 1) {   // don't land the same year twice in a row when there's an alternative
      var alt = elig.filter(function (r) { return r[IDX.season] !== avoid[name]; });
      if (alt.length) cands = alt;
    }
    var pickRow = cands[rndi(S, cands.length)];
    S.yearByName[name] = pickRow[IDX.season];
    var peakMin = 0;   // peak minutes across the player's eligible seasons -> weights the $2 bump
    for (var pj = 0; pj < elig.length; pj++) if (stintMinutes(elig[pj]) > peakMin) peakMin = stintMinutes(elig[pj]);
    items.push({ name: name, v: valueOf(S, pickRow), cost: capCost(S, valueOf(S, pickRow), decay), peakMin: peakMin });
  });
  if (!items.length) return;
  capMisprice(S, items);
  capBumpTwos(S, items);   // two more $1 players -> $2, weighted by peak minutes (stacks on capMisprice)
  // Hard ceiling: a player never costs more than $23. effCost's fire-sale -$2 then caps fire-sale at $21.
  for (var i = 0; i < items.length; i++) S.costByName[items[i].name] = Math.min(23, items[i].cost);
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
  var best = pool ? pool.get(name) : null;
  if (best && S.mode !== "kaman" && !S.ch && stintMinutes(best) <= 785) {   // pooled "best" is minutes-filtered -> default to an eligible season instead
    var elig = poolYearsEligible(S, name);
    if (elig.length) return elig[0];
  }
  return best;
}

// Explicit floor-spacing curve, indexed by round(sumSp*2): entry i is the net
// spacing effect (negative = tax, positive = bonus) when sumSp = i*0.5, for
// sumSp 0.0 .. 7.5 (max = five 1.5-value super-shooters). Hand-tunable. This is
// the DEFAULT; weekly challenges that override SPACING_TAX/SPACING_BONUS/
// SPACERS_REQ fall back to the linear formula (see engine) so their hooks work.
//   idx:  0    1   2   3   4   5   6   7   8   9   10   11   12  13   14  15
//  sumSp: 0   0.5  1  1.5  2  2.5  3  3.5  4  4.5   5   5.5   6  6.5   7  7.5
var SPACING_CURVE = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 4.5, 5, 5.5, 6, 6.5];

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
  // Floor spacing. Default play reads the explicit SPACING_CURVE table (supports
  // fractional super-shooter counts). A challenge week that overrides any spacing
  // knob falls back to the linear formula so those hooks still bite.
  var spacingTax, spacingBonus;
  var hop = Object.prototype.hasOwnProperty;
  var spHook = !!(S && S.ch && S.ch.cfg &&
    (hop.call(S.ch.cfg, "SPACING_TAX") || hop.call(S.ch.cfg, "SPACING_BONUS") || hop.call(S.ch.cfg, "SPACERS_REQ")));
  if (spHook) {
    spacingTax = C(S, "SPACING_TAX") * Math.max(0, C(S, "SPACERS_REQ") - sumSp);
    spacingBonus = (C(S, "SPACING_BONUS") || 0) * Math.max(0, sumSp - C(S, "SPACERS_REQ"));
  } else {
    var spNet = SPACING_CURVE[Math.max(0, Math.min(SPACING_CURVE.length - 1, Math.round(sumSp * 2)))];
    spacingTax = spNet < 0 ? -spNet : 0;
    spacingBonus = spNet > 0 ? spNet : 0;
  }

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

  // Shooter tagging (see ALWAYS/NEVER/SUPER_SHOOTER above). Overrides the
  // algorithmic sp: NEVER -> 0, ALWAYS -> 1, SUPER -> SUPER_SP (1.5). SUPER is
  // applied LAST so it wins any name that also appears in ALWAYS. Replaces the
  // old meta.sp_override / meta.sp_never (still present in the data, now unused).
  var spTag = {};
  NEVER_SHOOTER.forEach(function (nm) { spTag[nm] = 0; });
  ALWAYS_SHOOTER.forEach(function (nm) { spTag[nm] = 1; });
  SUPER_SHOOTER.forEach(function (nm) { spTag[nm] = SUPER_SP; });
  data.players.forEach(function (row) {
    var nm = row[IDX.name];
    if (Object.prototype.hasOwnProperty.call(spTag, nm)) row[IDX.sp] = spTag[nm];
  });

  // Reconstruct one whole-season statistical line for every team stint. Team
  // membership and the 785-minute eligibility floor remain stint-specific.
  DRAFT_ROWS = buildDraftRows(data.players);

  // Manual value adjustments (VALUE_ADJ): apply after the whole-season merge so
  // every eligible team view of that season receives the same season value.
  // Team-scoped windows and minute floors still inspect the actual stint.
  var adjByName = {};
  VALUE_ADJ.forEach(function (e) { adjByName[e.n] = e; });
  DRAFT_ROWS.forEach(function (row) {
    var e = adjByName[row[IDX.name]];
    if (!e) return;
    if (e.mp && stintMinutes(row) < e.mp) return;
    if (!valueAdjMatch(e.w, row[IDX.season], row[IDX.team])) return;
    row[IDX.bpm_star] += e.adj;
  });

  TEAM2FR = {};
  Object.keys(data.franchises).forEach(function (fr) {
    data.franchises[fr].forEach(function (code) { TEAM2FR[code] = fr; });
  });

  // Franchise x decade combos to drop from the draft (e.g. one-season expansion
  // slivers like the '80s Heat = 1988-89 only). Keys are "FRANCHISE|decade".
  var EXCLUDE = {};
  if (META.era_exclude) META.era_exclude.forEach(function (kk) { EXCLUDE[kk] = true; });

  POOLS = new Map(); POOL_YEARS = new Map(); FR_BY_DEC = new Map(); DEC_SPAN = new Map(); SEASON_SPAN = null;
  DRAFT_ROWS.forEach(function (row) {
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
  DRAFT_ROWS.forEach(function (row) {
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
    if (S.mode !== "kaman" && !S.ch && stintMinutes(row) <= 785) return false;   // regular draft only: cameo/short seasons (<=785 min) aren't draftable. Challenges keep the full pool (narrow ones like Short Kings would otherwise strand); kaman exempt.
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
    S.sortMode = isCap ? "cost" : "min";   // classic + pro sort by minutes; cap sorts by cost
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
    return { dec: true, fr: true, dealt: true };   // fresh deal: spin both the decade and franchise reels (+ crest). dealt kept for the deal-hook contract; replay ignores all of it.
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
    { label: "COLD",      m: 1.0,  odds: 6,  lvl: 0 },
    { label: "WARM",      m: 1.2,  odds: 14,  lvl: 1 },
    { label: "HOT",       m: 1.35, odds: 42, lvl: 2 },
    { label: "ON FIRE",   m: 1.5,  odds: 23, lvl: 3 },
    { label: "SUPERNOVA", m: 2.0,  odds: 15, lvl: 4 }
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
    VERSION: 8,   // v8: traded seasons use whole-season rate/value stats; Presti ceiling $23 ($21 fire sale)
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
              KAMAN_SEASONS: KAMAN_SEASONS, DRAFT_ROWS: DRAFT_ROWS, dataVersion: DATA_VERSION };
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
    assignProSeasons: assignProSeasons, effCost: effCost, capAffordable: capAffordable, stintMinutes: stintMinutes,
    resolveRow: resolveRow, poolYearsEligible: poolYearsEligible, engine: engine, erf: erf, phi: phi,
    hhNet82: hhNet82, hhPickHot: hhPickHot, hhSpinSeg: hhSpinSeg, hhEligible: hhEligible,
    hhWins: hhWins, swapTargetsFor: swapTargetsFor, pickHasMoves: pickHasMoves,
    HH_SEGMENTS: HH_SEGMENTS, HH_BONUS_SCALE: HH_BONUS_SCALE
  };

  g.T82 = T;
  if (typeof module !== "undefined" && module.exports) module.exports = T;
})(typeof globalThis !== "undefined" ? globalThis : this);
