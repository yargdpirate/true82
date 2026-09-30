/* TRUE 82 — challenges.js: the weekly-challenge manifest (FULL, Phase D).
   ─────────────────────────────────────────────────────────────────────────────
   SHARED MODULE (same law as sim-core.js): browser loads it after sim-core,
   test.js vm-loads it, Functions import it. A run verifies with the EXACT
   hooks it was played with. One file, one truth.

   THE CREATIVE DOCTRINE (design law): weeklies are fun PERMUTATIONS of the
   game's own mechanics — pricing, eras, taxes, spacing, usage, defense,
   franchises, draft order — never lazy data slices. A good weekly has a
   punchline you discover mid-draft ("oh no, the usage tax"), not a filter you
   read in the blurb.

   AUTHORING FACTS (measured vs the live dataset, 2026-07-06): 30 franchises,
   decades 1970–2020, span 1974–2026. Person counts behind every threshold
   used here: ht≤75→713 · ht≥82→734 · ht=78→349 · usage≥28→179 · mp≥3000→120 ·
   rpg≥10→121 · apg≥7→95 · spg≥2→96 · bpg≥2→~100 · ppg≥25→89 · bpm_star≥4→~90.
   Every entry must pass scripts/validate_challenges.js (pool viability +
   strand-rate sim + score spread) before it ships. rim/pm/port columns are
   NOT used (semantics unverified — excluded on purpose).

   HARD RULES (v1): one ruleset per week · fixed RULES, infinite seeds,
   unlimited attempts, best verified score · 5 picks / 2G-2F-1C always ·
   challenges shape the DRAFT, never the sim's fairness (NET_SD, BASELINE,
   REPLACEMENT, Hot Hand are NOT hookable) · kaman never rotates in.

   HOOK API: filter(row,t) · pick(S,row,slot,t) · deal(S,t)→{decs?,frs?} ·
   cfg{} (whitelist: CAP_BUDGET, PRICE_MULT, CAP_GEM, CAP_TRAP, TEAM_SKIPS,
   ERA_SKIPS, USAGE_RATE, USAGE_BUDGET, SPACING_TAX, SPACING_BONUS,
   SPACERS_REQ, GD_/FD_BOTTOM20/33, BACKCOURT_/WING_D_TAX_20/33 — renamed v35 with the tier retune).
   POOL3 (2026-09-26) opens the v35/v36 knobs the engine already reads through
   C(): RIM_TOP20, RIM_D_TAX, GLASS_LOW, GLASS_DIRE, GLASS_TAX_LOW,
   GLASS_TAX_DIRE, CREATOR_PCT, CREATOR_TAX, AGE_VET_YEAR, AGE_VET_FREE,
   AGE_TAX. A negative tax is a bonus (five_out, glass_bonus, win_now,
   mid_range). v63 (sim-core oneBall, sizeUnits): the one-ball rule IS the
   usage tax, now 120 free and 0.3 a point past it by code default (v62's
   20-point ONEBALL_* keys are gone); a board whose own rule forces a five of
   volume scorers keeps the old gentle usage tax, 110 at 0.09375 (Volume
   Merchants); a board that twists the usage tax restates its twist against
   the new normal (The Luxury Tax 110 at 0.4, The Triangle 100, The Superteam
   Problem 105, Tax Season double: 0.6); v63.1 tops one ball out at USAGE_CAP
   6, and the boards that make usage hurt more lift it (10; Tax Season 12). Size by unit (SMALL_G_HT, SMALL_FC_HT,
   SMALL_G_TAX, SMALL_FC_TAX) replaces v62's SHORT_* average; a board whose
   own rule forces a short five turns both off (Short Kings, both Small-Ball
   Apocalypses, The Small Blind, Tax Holiday); Height Cap keeps them (where
   you spend the inches is its game). v62.1's
   Dueling Banjos Tax (LBL_BANJO_TAX, two settled TITLE #1s) is off where the
   copy promises stacked alphas: Iso Week, Two-Way Alphas, The Superteam
   Problem, Tax Holiday (v63.1: the Banjos no longer charge, so the key is
   gone). v62.2's pairs (LBL_STICK_TAX, LBL_HUNTED_TAX,
   LBL_FOUL_TAX) and LBL_STATPAD_TAX are off on Tax Holiday; the ball-holders
   pair is also off on the same three alpha boards. One new optional hook: price(row,t) -> a Presti price
   multiplier for that season (sim-core assignCapPool; absent = 1, so every
   other board prices and draws exactly as before; draft-side only).
   Hooks are pure functions of (S,row,tables) — no Date/random/fetch. Helpers
   below (last, cost, decOf) keep entries honest and compact. */
(function (g) {
  "use strict";

  // ---- pure helpers (replay-safe: read only S/row/tables) ----
  function last(S) { return S.picks.length ? S.picks[S.picks.length - 1] : null; }
  function cost(S, row, t) {                 // the price you'd PAY right now (fire sale honored)
    var c = S.costByName ? S.costByName[row[t.IDX.name]] : null;
    if (c == null) return null;
    return S.fireSale ? Math.max(1, c - 2) : c;
  }
  function decOf(row, t) { return Math.floor(row[t.IDX.season] / 10) * 10; }

  /* ---------- POOL3 helpers (2026-09-26, the 200 dailies from #79 on) ----------
     Everything below is a pure function of (S, row, tables). ix(t) builds one
     index per tables object (initData hands out a new t, so the cache rebuilds
     with the data) and every hook reads it in O(1), because the dealer calls
     hooks for every player of every board while it routes a deal.
     PERSON = name + height. The engine keys careers by name alone, so two
     different players who share a name pool their histories (the small-ball
     ghost bug). Every same-era namesake pair in the data differs in height, so
     rules that read careers, teammates or positions use the person key and
     never borrow a namesake's past. Names that belong to one person only keep
     the engine's own CAREER_BUCKETS, so a card's G/F/C tag and these rules
     always agree. */
  var TITLES = {   // NBA champions by season (end year), franchise names as in site data
    1974: "CELTICS", 1975: "WARRIORS", 1976: "CELTICS", 1977: "TRAIL BLAZERS", 1978: "WIZARDS", 1979: "THUNDER",
    1980: "LAKERS", 1981: "CELTICS", 1982: "LAKERS", 1983: "76ERS", 1984: "CELTICS", 1985: "LAKERS", 1986: "CELTICS",
    1987: "LAKERS", 1988: "LAKERS", 1989: "PISTONS", 1990: "PISTONS", 1991: "BULLS", 1992: "BULLS", 1993: "BULLS",
    1994: "ROCKETS", 1995: "ROCKETS", 1996: "BULLS", 1997: "BULLS", 1998: "BULLS", 1999: "SPURS", 2000: "LAKERS",
    2001: "LAKERS", 2002: "LAKERS", 2003: "SPURS", 2004: "PISTONS", 2005: "SPURS", 2006: "HEAT", 2007: "SPURS",
    2008: "CELTICS", 2009: "LAKERS", 2010: "LAKERS", 2011: "MAVERICKS", 2012: "HEAT", 2013: "HEAT", 2014: "SPURS",
    2015: "WARRIORS", 2016: "CAVALIERS", 2017: "WARRIORS", 2018: "WARRIORS", 2019: "RAPTORS", 2020: "LAKERS",
    2021: "BUCKS", 2022: "WARRIORS", 2023: "NUGGETS", 2024: "CELTICS", 2025: "THUNDER"
  };
  var RUNNERS = {  // the team that lost the NBA Finals, by season
    1974: "BUCKS", 1975: "WIZARDS", 1976: "SUNS", 1977: "76ERS", 1978: "THUNDER", 1979: "WIZARDS", 1980: "76ERS",
    1981: "ROCKETS", 1982: "76ERS", 1983: "LAKERS", 1984: "LAKERS", 1985: "CELTICS", 1986: "ROCKETS", 1987: "CELTICS",
    1988: "PISTONS", 1989: "LAKERS", 1990: "TRAIL BLAZERS", 1991: "LAKERS", 1992: "TRAIL BLAZERS", 1993: "SUNS",
    1994: "KNICKS", 1995: "MAGIC", 1996: "THUNDER", 1997: "JAZZ", 1998: "JAZZ", 1999: "KNICKS", 2000: "PACERS",
    2001: "76ERS", 2002: "NETS", 2003: "NETS", 2004: "LAKERS", 2005: "PISTONS", 2006: "MAVERICKS", 2007: "CAVALIERS",
    2008: "LAKERS", 2009: "MAGIC", 2010: "CELTICS", 2011: "HEAT", 2012: "THUNDER", 2013: "SPURS", 2014: "HEAT",
    2015: "CAVALIERS", 2016: "WARRIORS", 2017: "CAVALIERS", 2018: "CAVALIERS", 2019: "WARRIORS", 2020: "HEAT",
    2021: "SUNS", 2022: "CELTICS", 2023: "HEAT", 2024: "MAVERICKS", 2025: "PACERS"
  };
  var MVPS = {     // every MVP winner who plays a season in the data: the 1974-2025 winners plus four earlier
                   // MVPs still active in 1974 (Robertson, Reed, Cowens, Unseld). Names exactly as in site data.
    "Oscar Robertson": 1, "Willis Reed": 1, "Dave Cowens": 1, "Wes Unseld": 1, "Kareem Abdul-Jabbar": 1, "Bob McAdoo": 1, "Bill Walton": 1, "Moses Malone": 1, "Julius Erving": 1, "Larry Bird": 1,
    "Magic Johnson": 1, "Michael Jordan": 1, "Charles Barkley": 1, "Hakeem Olajuwon": 1, "David Robinson": 1,
    "Karl Malone": 1, "Shaquille O'Neal": 1, "Allen Iverson": 1, "Tim Duncan": 1, "Kevin Garnett": 1, "Steve Nash": 1,
    "Dirk Nowitzki": 1, "Kobe Bryant": 1, "LeBron James": 1, "Derrick Rose": 1, "Kevin Durant": 1, "Stephen Curry": 1,
    "Russell Westbrook": 1, "James Harden": 1, "Giannis Antetokounmpo": 1, "Nikola Joki\u0107": 1, "Joel Embiid": 1,
    "Shai Gilgeous-Alexander": 1
  };
  var EAST = { CELTICS: 1, NETS: 1, KNICKS: 1, "76ERS": 1, RAPTORS: 1, BULLS: 1, CAVALIERS: 1, PISTONS: 1,
    PACERS: 1, BUCKS: 1, HAWKS: 1, HORNETS: 1, HEAT: 1, MAGIC: 1, WIZARDS: 1 };   // today's conferences
  var IXC = { t: null, v: null };
  function pk(row, t) { return row[t.IDX.name] + "|" + row[t.IDX.ht]; }
  function frOf(row, t) { return t.TEAM2FR[row[t.IDX.team]] || null; }
  function fold(s) { return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
  // First name and surname, letters only. Suffixes (Jr., III) are dropped and a
  // multi-word surname is one word: "Keith Van Horn" -> van horn -> "vanhorn".
  function nameParts(n) {
    var toks = fold(n).split(/\s+/).map(function (x) { return x.replace(/[^a-z]/g, ""); }).filter(Boolean);
    while (toks.length > 1 && /^(jr|sr|ii|iii|iv|v)$/.test(toks[toks.length - 1])) toks.pop();
    return { first: toks[0] || "", last: toks.length > 1 ? toks.slice(1).join("") : (toks[0] || "") };
  }
  function ix(t) {
    if (IXC.t === t && IXC.v) return IXC.v;
    var I = t.IDX, P = new Map(), TS = new Map(), BY_SEASON = new Map(), names = new Map();
    (t.DRAFT_ROWS || []).forEach(function (r) {
      var k = pk(r, t), s = r[I.season], fr = frOf(r, t), p = P.get(k);
      if (!p) { p = { name: r[I.name], first: s, last: s, seasons: {}, ten: {}, frFirst: {}, ppg: {}, maxPpg: -1, minFullPpg: 999,
                      maxApg: -1, maxRpg: -1, maxBpg: -1, first15: 0, first20: 0, keys: {}, bk: {} }; P.set(k, p); }
      if (r[I.apg] > p.maxApg) p.maxApg = r[I.apg];
      if (r[I.rpg] > p.maxRpg) p.maxRpg = r[I.rpg];
      if (r[I.bpg] > p.maxBpg) p.maxBpg = r[I.bpg];
      if (r[I.ppg] >= 15 && (!p.first15 || s < p.first15)) p.first15 = s;
      if (r[I.ppg] >= 20 && (!p.first20 || s < p.first20)) p.first20 = s;
      if (!names.has(r[I.name])) names.set(r[I.name], {});
      names.get(r[I.name])[k] = 1;
      if (s < p.first) p.first = s;
      if (s > p.last) p.last = s;
      p.seasons[s] = 1;
      p.ppg[s] = r[I.ppg];
      if (r[I.ppg] > p.maxPpg) p.maxPpg = r[I.ppg];
      if (r[I.mp] >= 1000 && r[I.ppg] < p.minFullPpg) p.minFullPpg = r[I.ppg];   // mp is the whole season
      if (r[I.g_pct] >= 20) p.bk.G = 1;
      if (r[I.f_pct] >= 20) p.bk.F = 1;
      if (r[I.c_pct] >= 20) p.bk.C = 1;
      if (fr) {
        (p.ten[fr] = p.ten[fr] || {})[s] = 1;
        if (p.frFirst[fr] == null || s < p.frFirst[fr]) p.frFirst[fr] = s;
        p.keys[fr + "|" + s] = 1;
        var tk = fr + "|" + s;
        if (!TS.has(tk)) TS.set(tk, []);
        TS.get(tk).push({ k: k, name: r[I.name], ppg: r[I.ppg], bpm: r[I.bpm_star], mp: typeof r._stintMp === "number" ? r._stintMp : r[I.mp] });
      }
      if (!BY_SEASON.has(s)) BY_SEASON.set(s, new Map());
      var bs = BY_SEASON.get(s);
      if (!bs.has(k) || r[I.mp] > bs.get(k)[I.mp]) bs.set(k, r);
    });
    P.forEach(function (p, k) {
      var one = Object.keys(names.get(p.name) || {}).length === 1;
      var cb = t.CAREER_BUCKETS && t.CAREER_BUCKETS.get(p.name);
      if (one && cb) p.bk = { G: cb.G ? 1 : 0, F: cb.F ? 1 : 0, C: cb.C ? 1 : 0 };   // no namesake: the engine's own tags
      if (!p.bk.G && !p.bk.F && !p.bk.C) p.bk = cb ? { G: cb.G ? 1 : 0, F: cb.F ? 1 : 0, C: cb.C ? 1 : 0 } : { F: 1 };
      p.n = Object.keys(p.seasons).length;
      p.frs = Object.keys(p.ten);
      p.firstFrs = {}; p.lastFrs = {};
      p.frs.forEach(function (f) { if (p.ten[f][p.first]) p.firstFrs[f] = 1; if (p.ten[f][p.last]) p.lastFrs[f] = 1; });
    });
    // team context: each franchise-season's top scorer (1,000+ minutes for that
    // team) and minutes order
    var TOP = new Map(), MRANK = new Map();
    TS.forEach(function (list, tk) {
      var top = -1;
      list.forEach(function (e) { if (e.mp >= 1000 && e.ppg > top) top = e.ppg; });
      if (top < 0) list.forEach(function (e) { if (e.ppg > top) top = e.ppg; });
      TOP.set(tk, top);
      list.slice().sort(function (a, b) { return b.mp - a.mp; }).forEach(function (e, i) {
        var key = e.k + "|" + tk;
        if (!MRANK.has(key) || i < MRANK.get(key)) MRANK.set(key, i + 1);
      });
    });
    // league context: a player's best rank that season in points, rebounds,
    // assists, steals or blocks, among players with 1,000+ minutes
    var LEAD = new Map(), PPGRANK = new Map();
    BY_SEASON.forEach(function (m) {
      var qual = []; m.forEach(function (r, k) { if (r[I.mp] >= 1000) qual.push([k, r]); });
      qual.slice().sort(function (a, b) { return b[1][I.ppg] - a[1][I.ppg]; })
        .forEach(function (e, i) { PPGRANK.set(e[0] + "|" + e[1][I.season], i + 1); });
      [I.ppg, I.rpg, I.apg, I.spg, I.bpg].forEach(function (col) {
        qual.slice().sort(function (a, b) { return b[1][col] - a[1][col]; }).slice(0, 25).forEach(function (e, i) {
          var key = e[0] + "|" + e[1][I.season];
          if (!LEAD.has(key) || i + 1 < LEAD.get(key)) LEAD.set(key, i + 1);
        });
      });
    });
    // board context: the five biggest-minute players of each franchise-decade
    // board (the top of the app's default minutes sort; ties at fifth included)
    var BIG5 = new Map();
    t.POOLS.forEach(function (pool, key) {
      var yrs = t.POOL_YEARS.get(key), mins = [];
      pool.forEach(function (row, name) {
        var m = 0; (yrs.get(name) || []).forEach(function (r) { if (r[I.mp] > m) m = r[I.mp]; });
        mins.push([name, m]);
      });
      var set = {};
      mins.forEach(function (a) {
        var above = 0; mins.forEach(function (b) { if (b[1] > a[1]) above++; });
        if (above < 5) set[a[0]] = 1;
      });
      BIG5.set(key, set);
    });
    // team strength: a franchise-season's minute-weighted impact rating; the
    // bottom third of each season's league is WEAK (the lottery teams)
    var STR = {}, WEAK = new Map(), STRONG = new Map();
    TS.forEach(function (list, tk) {
      var num = 0, den = 0; list.forEach(function (e) { num += e.bpm * e.mp; den += e.mp; });
      var s = +tk.slice(tk.lastIndexOf("|") + 1);
      (STR[s] = STR[s] || []).push([tk, den ? num / den : 0]);
    });
    Object.keys(STR).forEach(function (s) {
      var arr = STR[s].sort(function (a, b) { return a[1] - b[1]; }), cut = Math.floor(arr.length / 3);
      for (var i = 0; i < cut; i++) { WEAK.set(arr[i][0], 1); STRONG.set(arr[arr.length - 1 - i][0], 1); }
    });
    // first-name and surname counts (people, not rows)
    var FIRST = {}, LAST = {};
    P.forEach(function (p) { var n = nameParts(p.name); FIRST[n.first] = (FIRST[n.first] || 0) + 1; LAST[n.last] = (LAST[n.last] || 0) + 1; });
    IXC.t = t;
    IXC.v = { P: P, TS: TS, TOP: TOP, MRANK: MRANK, LEAD: LEAD, PPGRANK: PPGRANK, BIG5: BIG5, WEAK: WEAK, STRONG: STRONG, FIRST: FIRST, LAST: LAST };
    return IXC.v;
  }
  function person(row, t) { return ix(t).P.get(pk(row, t)) || null; }
  // career season: 1 = his first season in the data. Careers that began before
  // the data does (1974) are unknowable, so rules that need a true rookie year
  // skip anyone whose first season is 1974.
  function cyear(row, t) { var p = person(row, t); return p ? row[t.IDX.season] - p.first + 1 : 1; }
  function trueStart(row, t) { var p = person(row, t); return !!p && p.first > 1974; }
  function spacer(row, t) { return row[t.IDX.sp] >= 1; }
  function picksLeftAfter(S) { return 4 - S.picks.length; }            // picks still to come after this one
  function spent(S) { var n = 0; S.picks.forEach(function (p) { n += p.cost || 0; }); return n; }
  function teammates(a, b) {                     // two persons who shared a roster in some season
    var ka = a.keys, kb = b.keys;
    for (var k in ka) if (kb[k]) return true;
    return false;
  }
  // decades in which anyone who debuted within one season of `first` played
  // (memoized on the index, so a deal reads it in O(1) after the first call)
  function cohortDecs(t, first) {
    var X = ix(t); X.COH = X.COH || {};
    if (X.COH[first]) return X.COH[first];
    var decs = {};
    X.P.forEach(function (p) {
      if (p.first <= 1974 || Math.abs(p.first - first) > 1) return;
      for (var s in p.seasons) decs[Math.floor(+s / 10) * 10] = 1;
    });
    return (X.COH[first] = Object.keys(decs).map(Number).sort(function (a, b) { return a - b; }));
  }

  // v66.4 the special days' deal: star eras every round; in rounds 2 and 3 the deep cuts too (S.round is the round being
  // dealt, and the same during that round's skips). Called without a state (tests, tools), it names the star eras.
  function specialDeal(frs, star, deep) {
    var both = star.concat(deep);
    var f = function (S) { return { frs: frs, pairs: S && (S.round === 2 || S.round === 3) ? both : star }; };
    f.star = star; f.deep = deep;
    return f;
  }
  var CHALLENGES = [

    /* ═══════════ THE ECONOMY (cap) — money is the mechanic ═══════════ */
    { id: "inflation", name: "Inflation", base: "cap",
      blurb: "Every price doubled. Same $50. The bargain bin is the whole store now.",
      cfg: { PRICE_MULT: 2 } },
    { id: "hyperinflation", name: "Hyperinflation", base: "cap",
      blurb: "Prices tripled, budget raised to $75. The math says you're fine. The math is lying.",
      cfg: { PRICE_MULT: 3, CAP_BUDGET: 75 } },
    { id: "deflation", name: "The Deflation", base: "cap",
      blurb: "Everything's half off — and your wallet holds $25. Cheap isn't the same as affordable.",
      cfg: { PRICE_MULT: 0.5, CAP_BUDGET: 25 } },
    { id: "petty_cash", name: "Petty Cash", base: "cap",
      blurb: "Ownership slashed the budget to $35. Somebody's getting a minimum deal.",
      cfg: { CAP_BUDGET: 35 } },
    { id: "minimum_wage", name: "Minimum Wage", base: "cap",
      blurb: "Five roster spots. Twenty dollars. Welcome to the G League of the soul.",
      cfg: { CAP_BUDGET: 20 } },
    { id: "deep_pockets", name: "Deep Pockets", base: "cap",
      blurb: "$82 to burn — but the market noticed. Everything costs 60% more. Money means less than you think.",
      cfg: { CAP_BUDGET: 82, PRICE_MULT: 1.6 } },
    { id: "trap_game", name: "The Trap Game", base: "cap",
      blurb: "Nearly every mid-tier player is overpriced this week. The real ones are still out there. Somewhere.",
      cfg: { CAP_TRAP: 0.9 } },
    { id: "gem_rush", name: "Gem Rush", base: "cap",
      blurb: "Half the marginal players cost $1. Budget's only $40 — because you won't need more. Right?",
      cfg: { CAP_GEM: 0.5, CAP_TRAP: 0.1, CAP_BUDGET: 40 } },
    { id: "the_gauntlet", name: "The Gauntlet", base: "cap",
      blurb: "Traps up, gems gone, prices padded, budget trimmed. Everything is slightly worse. Cope.",
      cfg: { CAP_TRAP: 0.8, CAP_GEM: 0.05, PRICE_MULT: 1.25, CAP_BUDGET: 45 } },
    { id: "golden_age", name: "The Golden Age", base: "cap",
      blurb: "The bargain bins overflow — one in three marginals is a $1 steal. Draft like it's a yard sale.",
      cfg: { CAP_GEM: 0.35 } },
    { id: "odd_lots", name: "Odd Lots", base: "cap",
      blurb: "Every price you pay must be an ODD number. The $10 superstar mocks you.",
      pick: function (S, row, slot, t) { var c = cost(S, row, t); return c == null || c % 2 === 1; } },
    { id: "even_money", name: "Even Money", base: "cap",
      blurb: "Every price you pay must be EVEN. The $1 gems glitter behind glass.",
      pick: function (S, row, slot, t) { var c = cost(S, row, t); return c == null || c % 2 === 0; } },
    { id: "guaranteed_deals", name: "Guaranteed Contracts", base: "cap",
      blurb: "Free agency rules: no steals, heavy markups, everyone gets paid. Your $65 has never felt smaller.",
      cfg: { CAP_BUDGET: 65, PRICE_MULT: 1.5, CAP_GEM: 0, CAP_TRAP: 0.7 } },
    { id: "balanced_books", name: "Balanced Books", base: "cap",
      blurb: "No single contract over $14. Superteams are an accounting error.",
      pick: function (S, row, slot, t) { var c = cost(S, row, t); return c == null || c <= 14; } },
    { id: "bargain_bin", name: "Bargain Bin Ballers", base: "cap",
      blurb: "Nothing over six bucks. Your scouting department IS the roster.",
      pick: function (S, row, slot, t) { var c = cost(S, row, t); return c == null || c <= 6; } },
    { id: "the_descent", name: "The Descent", base: "cap",
      blurb: "No contract pricier than the one before it. Draft your star first — it's all downhill from there.",
      pick: function (S, row, slot, t) {
        var p = last(S); if (!p || p.cost == null) return true;
        var c = cost(S, row, t); return c == null || c <= p.cost; } },
    { id: "escalator", name: "The Escalator", base: "cap",
      blurb: "No contract cheaper than the one before it — in a market running 40% hot. Start humble. Save room. Pray.",
      cfg: { PRICE_MULT: 1.4, CAP_BUDGET: 70, CAP_GEM: 0.05 },
      pick: function (S, row, slot, t) {
        var p = last(S); if (!p || p.cost == null) return true;
        var c = cost(S, row, t); return c == null || c >= p.cost; } },
    { id: "luxury_tax", name: "The Luxury Tax", base: "cap",
      blurb: "The usage tax starts sooner and bites harder. Your stars cost twice — once in dollars, once in shots.",
      cfg: { USAGE_BUDGET: 110, USAGE_RATE: 0.4, USAGE_CAP: 10 } },
    { id: "moneyball", name: "Moneyball", base: "cap",
      blurb: "$30 budget, and every player on the board logged 2,500+ minutes. Cheap AND durable. Get weird.",
      cfg: { CAP_BUDGET: 30 },
      filter: function (row, t) { return row[t.IDX.mp] >= 2500; } },
    { id: "seventies_money", name: "Short Shorts, Short Money", base: "cap",
      blurb: "The whole board lives in the 1970s, and Presti's briefcase came too. Inflation-adjusted chaos.",
      deal: function () { return { decs: [1970] }; } },

    /* ═══════════ THE ENGINE ROOM (taxes rewired) ═══════════ */
    { id: "analytics_dept", name: "The Analytics Department", base: "classic",
      blurb: "The suits want FIVE shooters, and the fine for missing quota went up. Feel the spreadsheet.",
      cfg: { SPACERS_REQ: 5, SPACING_TAX: 2.5 } },
    { id: "post_up_week", name: "Post-Up Week", base: "classic",
      blurb: "Threes don't count this week. No spacing tax, no spacing bonus. 1994 rules. Feed the block.",
      cfg: { SPACING_TAX: 0, SPACING_BONUS: 0 } },
    { id: "seven_seconds", name: "Seven Seconds or Less", base: "cap",
      blurb: "Shooters pay YOU this week — the spacing bonus tripled. Run and gun and profit.",
      cfg: { SPACING_BONUS: 1.5, SPACERS_REQ: 2 } },
    { id: "the_triangle", name: "The Triangle", base: "classic",
      blurb: "Usage budget slashed to 100. Share the damn ball or the engine shares your losses.",
      cfg: { USAGE_BUDGET: 100, USAGE_CAP: 10 } },
    { id: "iso_week", name: "Iso Week", base: "classic",
      blurb: "The usage tax is OFF. Five alphas, one ball, zero consequences. History's most toxic lineups are legal.",
      cfg: { USAGE_RATE: 0, LBL_STICK_TAX: 0 } },
    { id: "heliocentric", name: "Heliocentrism", base: "classic",
      blurb: "Usage budget 130, tax nearly nothing. One sun, four moons — build the solar system.",
      cfg: { USAGE_BUDGET: 130, USAGE_RATE: 0.05 } },
    { id: "lockdown", name: "The Lockdown", base: "classic",
      blurb: "Defensive penalties doubled. Two bad defenders in the same position group is a felony now.",
      cfg: { BACKCOURT_D_TAX_20: 6, BACKCOURT_D_TAX_33: 4, WING_D_TAX_20: 6, WING_D_TAX_33: 4 } },
    { id: "no_defense", name: "No-Defense November", base: "classic",
      blurb: "All defensive taxes waived. Nobody guards anybody. Draft the arsonists.",
      cfg: { BACKCOURT_D_TAX_20: 0, BACKCOURT_D_TAX_33: 0, WING_D_TAX_20: 0, WING_D_TAX_33: 0 } },
    { id: "hand_check", name: "Hand-Check Week", base: "classic",
      blurb: "The '90s board, with '90s consequences — defensive penalties half again as painful.",
      deal: function () { return { decs: [1990] }; },
      cfg: { BACKCOURT_D_TAX_20: 4.5, BACKCOURT_D_TAX_33: 3, WING_D_TAX_20: 4.5, WING_D_TAX_33: 3 } },
    { id: "pace_and_space", name: "Pace and Space", base: "classic",
      blurb: "Modern boards only, and the suits want four shooters minimum. It's 2016 forever in here.",
      deal: function () { return { decs: [2010, 2020] }; },
      cfg: { SPACERS_REQ: 4 } },

    /* ═══════════ THE POOL (who exists this week) ═══════════ */
    { id: "short_kings", name: "Short Kings", base: "classic",
      blurb: "Nobody over 6'3\". Yes, that includes your center.",
      filter: function (row, t) { return row[t.IDX.ht] > 0 && row[t.IDX.ht] <= 75; },
      cfg: { SMALL_G_TAX: 0, SMALL_FC_TAX: 0 } },
    { id: "towers", name: "The Towers", base: "classic",
      blurb: "6'10\" minimum, all five. Spacing optional. Rim protection mandatory.",
      filter: function (row, t) { return row[t.IDX.ht] >= 82; } },
    { id: "six_six_club", name: "The 6'6\" Club", base: "classic",
      blurb: "Every player on the board is exactly 6'6\". Positions are now a philosophy question.",
      filter: function (row, t) { return row[t.IDX.ht] === 78; } },
    { id: "the_mediums", name: "The Mediums", base: "classic",
      blurb: "6'5\" to 6'7\" only. Nobody small, nobody tall, everybody switchable.",
      filter: function (row, t) { return row[t.IDX.ht] >= 77 && row[t.IDX.ht] <= 79; } },
    { id: "bricklayers", name: "The Bricklayer Classic", base: "classic",
      blurb: "Not one three-point shooter on the board. The spacing tax is undefeated.",
      filter: function (row, t) { return row[t.IDX.sp] === 0; } },
    { id: "splash_only", name: "Splash Brothers Anonymous", base: "classic",
      blurb: "Shooters only — every player on the board stretches the floor. The tax can't touch you. Can it?",
      filter: function (row, t) { return row[t.IDX.sp] === 1; } },
    { id: "green_light", name: "Green Light", base: "cap",
      blurb: "Every player on the board is a 28%-usage alpha. One ball. Good luck.",
      filter: function (row, t) { return row[t.IDX.usage] >= 28; } },
    { id: "humble_pie", name: "Humble Pie", base: "cap",
      blurb: "Nobody on this board wants the ball — 17% usage tops. Someone has to shoot. Nobody will.",
      filter: function (row, t) { return row[t.IDX.usage] <= 17 && row[t.IDX.mp] >= 1500; } },
    { id: "iron_men", name: "Iron Men", base: "classic",
      blurb: "3,000-minute seasons only. No load management in this gym.",
      filter: function (row, t) { return row[t.IDX.mp] >= 3000; } },
    { id: "load_mgmt", name: "Load Management", base: "classic",
      blurb: "Nobody on the board cracked 1,800 minutes. Draft the rumor of a player.",
      filter: function (row, t) { return row[t.IDX.mp] > 0 && row[t.IDX.mp] <= 1800; } },
    { id: "glass_cleaners", name: "The Glass Cleaners", base: "classic",
      blurb: "Ten boards a night minimum, all five slots. Yes, even your guards.",
      filter: function (row, t) { return row[t.IDX.rpg] >= 10; } },
    { id: "dime_store", name: "The Dime Store", base: "classic",
      blurb: "Seven assists a night, every player. Five point guards in a trench coat.",
      filter: function (row, t) { return row[t.IDX.apg] >= 7; } },
    { id: "pickpockets", name: "The Pickpockets", base: "classic",
      blurb: "Two steals a game, all five. The passing lanes are closed until further notice.",
      filter: function (row, t) { return row[t.IDX.spg] >= 2; } },
    { id: "swat_team", name: "The Swat Team", base: "classic",
      blurb: "Two blocks a night minimum. The paint is lava.",
      filter: function (row, t) { return row[t.IDX.bpg] >= 2; } },
    { id: "volume_scorers", name: "Volume Merchants", base: "classic",
      blurb: "Twenty-five a night or you're not on the board. Efficiency sold separately.",
      filter: function (row, t) { return row[t.IDX.ppg] >= 25; },
      cfg: { USAGE_BUDGET: 110, USAGE_RATE: 0.09375 } },
    { id: "role_players", name: "The Role Players' Union", base: "classic",
      blurb: "Heavy minutes, light scoring — 2,400+ minutes, 12 points max. Somebody's gotta do the dirty work. Everybody, apparently.",
      filter: function (row, t) { return row[t.IDX.ppg] <= 12 && row[t.IDX.mp] >= 2400; } },
    { id: "matadors", name: "The Matadors", base: "classic",
      blurb: "Every player on the board is a defensive liability. Best record wins anyway. Olé.",
      filter: function (row, t) { return row[t.IDX.dbpm] <= -1; } },
    { id: "superteam", name: "The Superteam Problem", base: "classic",
      blurb: "Stars only — and the usage budget just got smaller. Everyone's an alpha. The ball is not amused.",
      filter: function (row, t) { return row[t.IDX.bpm_star] >= 4; },
      cfg: { USAGE_BUDGET: 105, USAGE_CAP: 10, LBL_STICK_TAX: 0 } },
    { id: "kaman_epoch", name: "The Kaman Epoch", base: "cap",
      blurb: "Only seasons from 2004–2016 — the age of Kaman. He watches. He judges.",
      filter: function (row, t) { return row[t.IDX.season] >= 2004 && row[t.IDX.season] <= 2016; } },
    { id: "palindromes", name: "The Mirror Years", base: "classic",
      blurb: "1991 and 2002 only — the seasons that read the same backwards. Cosmic significance: unverified.",
      filter: function (row, t) { var s = row[t.IDX.season]; return s === 1991 || s === 2002; } },
    { id: "leap_list", name: "The Leap List", base: "classic",
      blurb: "Leap-year seasons only. Three-quarters of history just vanished.",
      filter: function (row, t) { return row[t.IDX.season] % 4 === 0; } },
    { id: "round_numbers", name: "Round Numbers", base: "classic",
      blurb: "Seasons ending in zero. 1980, 1990, 2000... the decade's opening statements.",
      filter: function (row, t) { return row[t.IDX.season] % 10 === 0; } },

    /* ═══════════ TIME & LAUNDRY (deals constrained) ═══════════ */
    { id: "nineties", name: "Nineties Only", base: "classic",
      blurb: "The whole board lives in the '90s. Hand-checking sold separately.",
      deal: function () { return { decs: [1990] }; } },
    { id: "y2k", name: "Y2K", base: "classic",
      blurb: "The 2000s, wall to wall. Headbands mandatory in spirit.",
      deal: function () { return { decs: [2000] }; } },
    { id: "eighties_night", name: "Eighties Night", base: "classic",
      blurb: "All boards from the 1980s. Run the break, grow the mustache.",
      deal: function () { return { decs: [1980] }; } },
    { id: "pioneers", name: "The Pioneers", base: "classic",
      blurb: "1970s and '80s only. Before analytics. Before the arc mattered. Just hoops.",
      deal: function () { return { decs: [1970, 1980] }; } },
    { id: "vhs_era", name: "The VHS Era", base: "cap",
      blurb: "'80s and '90s boards, Presti pricing. Be kind, rewind, spend wisely.",
      deal: function () { return { decs: [1980, 1990] }; } },
    { id: "modern_era", name: "The Modern Era", base: "classic",
      blurb: "2010 onward only. Everyone shoots. Everyone switches. Nothing is sacred.",
      deal: function () { return { decs: [2010, 2020] }; } },
    { id: "time_machine", name: "Time Machine", base: "classic",
      blurb: "Draft forward through history — every pick's season on or after your last. No going back.",
      pick: function (S, row, slot, t) {
        var p = last(S); return !p || row[t.IDX.season] >= p.row[t.IDX.season]; } },
    { id: "benjamin_button", name: "Benjamin Button", base: "classic",
      blurb: "Draft BACKWARD through history — each pick older than the last. End where the game began.",
      pick: function (S, row, slot, t) {
        var p = last(S); return !p || row[t.IDX.season] <= p.row[t.IDX.season]; } },
    { id: "decade_ladder", name: "The Decade Ladder", base: "classic",
      blurb: "Five picks, five DIFFERENT decades, in order. Your roster is a museum exhibit.",
      deal: function (S, t) {
        var maxD = t.DECADES[t.DECADES.length - 1];
        var left = 5 - S.picks.length;                       // picks still to make
        var p = last(S);
        var lo = p ? Math.floor(p.row[t.IDX.season] / 10) * 10 : -1;
        var hi = maxD - (left - 1) * 10;                     // leave room for the rest of the climb
        return { decs: t.DECADES.filter(function (d) { return d > lo && d <= hi; }) }; },
      pick: function (S, row, slot, t) {
        var p = last(S); return !p || decOf(row, t) > decOf(p.row, t); } },
    { id: "loyalty", name: "Loyalty", base: "cap",
      blurb: "Your first pick chooses the franchise. All five wear the same laundry.",
      deal: function (S, t) {
        if (!S.picks.length) {                               // the opening board picks your prison —
          var deep = [];                                     // only franchises with 5+ decades qualify
          var cover = {};
          t.FR_BY_DEC.forEach(function (fl) { fl.forEach(function (f) { cover[f] = (cover[f] || 0) + 1; }); });
          for (var f in cover) if (cover[f] >= 5) deep.push(f);
          return { frs: deep };
        }
        return S.picks[0].fr ? { frs: [S.picks[0].fr] } : null; } },
    { id: "full_circle", name: "Full Circle", base: "classic",
      blurb: "Your fifth pick must come from your FIRST pick's franchise. Plan the reunion from day one.",
      deal: function (S, t) {
        if (!S.picks.length) {                               // same deep-franchise opening gate
          var deep = [], cover = {};
          t.FR_BY_DEC.forEach(function (fl) { fl.forEach(function (f) { cover[f] = (cover[f] || 0) + 1; }); });
          for (var f in cover) if (cover[f] >= 5) deep.push(f);
          return { frs: deep };
        }
        if (S.picks.length !== 4 || !S.picks[0].fr) return null;
        return { frs: [S.picks[0].fr] }; } },
    { id: "rivalry", name: "The Rivalry", base: "cap",
      blurb: "Celtics and Lakers. That's the whole board. Pick a side — or don't, you coward.",
      reelFrs: ["CELTICS", "LAKERS"],   // v66: the ticket reel spins only these
      deal: function () { return { frs: ["CELTICS", "LAKERS"] }; } },
    { id: "texas_triangle", name: "The Texas Triangle", base: "classic",
      blurb: "Mavericks, Rockets, Spurs. Everything's bigger, including the spacing tax.",
      reelFrs: ["MAVERICKS", "ROCKETS", "SPURS"],   // v66: the ticket reel spins only these
      deal: function () { return { frs: ["MAVERICKS", "ROCKETS", "SPURS"] }; } },
    { id: "california_love", name: "California Love", base: "classic",
      blurb: "Lakers, Clippers, Warriors, Kings. The whole board has beach access.",
      reelFrs: ["LAKERS", "CLIPPERS", "WARRIORS", "KINGS"],   // v66: the ticket reel spins only these
      deal: function () { return { frs: ["LAKERS", "CLIPPERS", "WARRIORS", "KINGS"] }; } },
    { id: "expansion_class", name: "The Expansion Class", base: "cap",
      blurb: "Only franchises born after 1988. No dynasties, no banners, no help.",
      reelFrs: ["HEAT", "MAGIC", "TIMBERWOLVES", "RAPTORS", "GRIZZLIES", "PELICANS", "HORNETS"],   // v66: the ticket reel spins only these
      deal: function () { return { frs: ["HEAT", "MAGIC", "TIMBERWOLVES", "RAPTORS", "GRIZZLIES", "PELICANS", "HORNETS"] }; } },

    /* ═══════════ DRAFT-ORDER PUZZLES (stateful picks) ═══════════ */
    { id: "alphabet_gm", name: "The Alphabet GM", base: "classic",
      blurb: "Every pick later in the alphabet than the last. 'Adebayo first' is a strategy now.",
      pick: function (S, row, slot, t) {
        function alpha(n) { return String(n).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
        var cur = alpha(row[t.IDX.name]);
        // Do not spend a Z-name before the fifth pick; otherwise a legal fourth
        // pick can make every possible final board dead. Diacritics sort by their
        // base letter so Š/Ž do not become artificial post-Z escape hatches.
        if (S.picks.length < 4 && cur.charAt(0) >= "z") return false;
        var p = last(S); if (!p) return true;
        return cur > alpha(p.row[t.IDX.name]); } },
    { id: "height_ladder", name: "The Height Ladder", base: "classic",
      blurb: "Always reaching higher — never more than two inches below your last pick. The summit awaits.",
      pick: function (S, row, slot, t) {
        var p = last(S); if (!p) return true;
        return row[t.IDX.ht] > 0 && row[t.IDX.ht] >= p.row[t.IDX.ht] - 2; } },
    { id: "the_shrinking", name: "The Shrinking", base: "classic",
      blurb: "Always sinking — never more than two inches above your last pick. Center first. Trust the process.",
      pick: function (S, row, slot, t) {
        var p = last(S); if (!p) return true;
        return row[t.IDX.ht] > 0 && row[t.IDX.ht] <= p.row[t.IDX.ht] + 2; } },
    { id: "hierarchy", name: "The Hierarchy", base: "classic",
      blurb: "The pecking order descends — each pick within two ticks below your last. Alpha goes first.",
      pick: function (S, row, slot, t) {
        var p = last(S); return !p || row[t.IDX.usage] <= p.row[t.IDX.usage] + 2; } },
    { id: "the_ascension", name: "The Ascension", base: "classic",
      blurb: "Each pick's usage HIGHER than the last. Save your star for the finale.",
      pick: function (S, row, slot, t) {
        var p = last(S); return !p || row[t.IDX.usage] > p.row[t.IDX.usage]; } },
    { id: "the_spread", name: "The Spread", base: "classic",
      blurb: "No two consecutive picks within three inches of each other. Variety is mandatory.",
      pick: function (S, row, slot, t) {
        var p = last(S); if (!p) return true;
        return Math.abs(row[t.IDX.ht] - p.row[t.IDX.ht]) >= 3; } },
    { id: "classmates", name: "The Classmates", base: "classic",
      blurb: "Your two guards must come from the SAME season. Backcourt chemistry, enforced by law.",
      pick: function (S, row, slot, t) {
        if (slot !== "G") return true;
        for (var i = 0; i < S.picks.length; i++)
          if (S.picks[i].slot === "G") return row[t.IDX.season] === S.picks[i].row[t.IDX.season];
        return true; } },
    { id: "defense_ladder", name: "Defense Wins Duels", base: "classic",
      blurb: "Each pick a better defender than the last. Build toward the wall.",
      pick: function (S, row, slot, t) {
        var p = last(S); return !p || row[t.IDX.dbpm] > p.row[t.IDX.dbpm]; } },
    { id: "the_closer", name: "The Closer", base: "classic",
      blurb: "Your FIFTH pick must out-usage everyone before him. Save the closer. Hope he's still on a board.",
      pick: function (S, row, slot, t) {
        if (S.picks.length !== 4) return true;
        for (var i = 0; i < 4; i++) if (row[t.IDX.usage] <= S.picks[i].row[t.IDX.usage]) return false;
        return true; } },
    { id: "the_anchor", name: "The Anchor", base: "classic",
      blurb: "Whoever mans the middle better own it — your C needs 1.5 blocks and 8 boards.",
      pick: function (S, row, slot, t) {
        return slot !== "C" || (row[t.IDX.bpg] >= 1.5 && row[t.IDX.rpg] >= 8); } },
    { id: "guard_the_yard", name: "Guard the Yard", base: "classic",
      blurb: "Both guard slots demand a steal a game. Point-of-attack or point-of-departure.",
      pick: function (S, row, slot, t) { return slot !== "G" || row[t.IDX.spg] >= 1; } },
    { id: "tall_wings", name: "The Wingspan Act", base: "classic",
      blurb: "Forwards fly tall this week — both F slots demand 6'8\" or better.",
      pick: function (S, row, slot, t) { return slot !== "F" || row[t.IDX.ht] >= 80; } },
    { id: "two_way", name: "Two-Way Players Only", base: "classic",
      blurb: "Every pick must be a plus on BOTH ends. The one-way star watches from home.",
      pick: function (S, row, slot, t) { return row[t.IDX.obpm] >= 1 && row[t.IDX.dbpm] >= 0.5; } },
    { id: "stoppers", name: "The Stoppers", base: "classic",
      blurb: "Every pick must be a positive defender. Your offense is your problem.",
      pick: function (S, row, slot, t) { return row[t.IDX.dbpm] >= 0; } },
    { id: "generalists", name: "The Generalists", base: "classic",
      blurb: "Positionless week — every pick must qualify at two or more positions.",
      pick: function (S, row, slot, t) {
        var b = t.CAREER_BUCKETS.get(row[t.IDX.name]) || {};
        return ((b.G ? 1 : 0) + (b.F ? 1 : 0) + (b.C ? 1 : 0)) >= 2; } },
    { id: "specialists", name: "The Specialists", base: "classic",
      blurb: "One job, done well — every pick qualifies at exactly ONE position. No hybrids.",
      pick: function (S, row, slot, t) {
        var b = t.CAREER_BUCKETS.get(row[t.IDX.name]) || {};
        return ((b.G ? 1 : 0) + (b.F ? 1 : 0) + (b.C ? 1 : 0)) === 1; } },

    /* ═══════════ SKIP ECONOMY ═══════════ */
    { id: "no_skips", name: "The Hand You're Dealt", base: "classic",
      blurb: "Zero skips. The board is the board. Character-building, allegedly.",
      cfg: { TEAM_SKIPS: 0, ERA_SKIPS: 0 } },
    { id: "choosy_gm", name: "The Choosy GM", base: "classic",
      blurb: "Five team skips, five era skips. Swipe left until the board deserves you.",
      cfg: { TEAM_SKIPS: 5, ERA_SKIPS: 5 } },

    /* ═══════════ COMBO PUNCHLINES ═══════════ */
    { id: "small_ball_apoc", name: "The Small-Ball Apocalypse", base: "cap",
      blurb: "Nobody over 6'5\", and the suits demand five shooters. The future arrived and it's tiny.",
      filter: function (row, t) { return row[t.IDX.ht] > 0 && row[t.IDX.ht] <= 77; },
      cfg: { SPACERS_REQ: 5, SPACING_TAX: 2, SMALL_G_TAX: 0, SMALL_FC_TAX: 0 } },
    { id: "grit_grind", name: "Grit and Grind", base: "cap",
      blurb: "No shooters on the board, all-defense expectations — but the spacing tax is halved. Memphis rules.",
      filter: function (row, t) { return row[t.IDX.sp] === 0; },
      cfg: { SPACING_TAX: 0.75 } },
    { id: "twin_towers", name: "Twin Towers Forever", base: "classic",
      blurb: "6'8\" minimum across the board — and wing defense goes untaxed. It's 1994 in the frontcourt.",
      filter: function (row, t) { return row[t.IDX.ht] >= 80; },
      cfg: { WING_D_TAX_20: 0, WING_D_TAX_33: 0 } },

    /* ═══════════ THE BLIND WEEKS (pro base — memory is the mechanic) ═══════════ */
    { id: "small_blind", name: "The Small Blind", base: "pro",
      blurb: "No stats, and nobody over 6'4\". Poker rules: memory is your only chip.",
      filter: function (row, t) { return row[t.IDX.ht] > 0 && row[t.IDX.ht] <= 76; },
      cfg: { SMALL_G_TAX: 0, SMALL_FC_TAX: 0 } },
    { id: "tall_blind", name: "The Tall Blind", base: "pro",
      blurb: "No stats, 6'8\" and up. You remember the giants. Do you remember their seasons?",
      filter: function (row, t) { return row[t.IDX.ht] >= 80; } },
    { id: "blind_nineties", name: "Blind Nineties", base: "pro",
      blurb: "The '90s, from memory alone. You watched these games. Prove it.",
      deal: function () { return { decs: [1990] }; } },
    { id: "blind_y2k", name: "Blind Y2K", base: "pro",
      blurb: "The 2000s, no stats. That one guy on the Kings — was he good good, or just loud?",
      deal: function () { return { decs: [2000] }; } },
    { id: "blind_eighties", name: "Blind Eighties", base: "pro",
      blurb: "The 1980s, unlabeled. Half these names are your dad's opinions.",
      deal: function () { return { decs: [1980] }; } },
    { id: "blind_modern", name: "Blind Modern", base: "pro",
      blurb: "2010 onward, no numbers. You have Twitter-brain confidence. The engine has receipts.",
      deal: function () { return { decs: [2010, 2020] }; } },
    { id: "blind_loyalty", name: "Blind Loyalty", base: "pro",
      blurb: "One franchise, five eras, zero stats. Only the true sickos survive.",
      deal: function (S, t) {
        if (!S.picks.length) {                               // the opening board picks your prison —
          var deep = [];                                     // only franchises with 5+ decades qualify
          var cover = {};
          t.FR_BY_DEC.forEach(function (fl) { fl.forEach(function (f) { cover[f] = (cover[f] || 0) + 1; }); });
          for (var f in cover) if (cover[f] >= 5) deep.push(f);
          return { frs: deep };
        }
        return S.picks[0].fr ? { frs: [S.picks[0].fr] } : null; } },
    { id: "memory_palace", name: "The Memory Palace", base: "pro",
      blurb: "No stats. No skips. The board you get is the exam you take.",
      cfg: { TEAM_SKIPS: 0, ERA_SKIPS: 0 } },
    { id: "blind_leap", name: "The Blind Leap", base: "pro",
      blurb: "Leap-year seasons, no stats. Your memory of 1996 is 30% commercials.",
      filter: function (row, t) { return row[t.IDX.season] % 4 === 0; } },
    { id: "blind_california", name: "Blind California", base: "pro",
      blurb: "The four California franchises, from memory. Showtime, Lob City, the Splash era — unlabeled.",
      reelFrs: ["LAKERS", "CLIPPERS", "WARRIORS", "KINGS"],   // v66: the ticket reel spins only these
      deal: function () { return { frs: ["LAKERS", "CLIPPERS", "WARRIORS", "KINGS"] }; } },
    /* ---------- 2026-07-18 additions (manifest doctrine v2: append-only) ----------
       Shipped ids above are IMMUTABLE: past daily boards and beat-links replay
       through them forever. New content is new ids. small_ball_five replaces
       small_ball_apoc in the daily rotation: the old height cap left the C slot
       fillable only through same-name data collisions (a 6'3" Charles Jones
       inheriting a 6'9" Charles Jones' center card). The fix is the unicorn
       rule: shorties in the G/F slots, with one height-exempt F/C reserved for C. */
    /* HANDOFF INVARIANT: the height exemption is destination-specific.
       Tall players may survive the pool only as genuine career F/C options,
       and ch.pick below must confine them to the single C slot. Do not reduce
       this to a global "has C" filter; that recreates the multi-center bug. */
    { id: "small_ball_five", name: "The Small-Ball Apocalypse", base: "cap",
      blurb: "Guard and forward slots are 6'4\" and under. The one center may be any height, but must qualify at both forward and center.",
      cfg: { SPACERS_REQ: 4, SPACING_TAX: 2, SMALL_G_TAX: 0, SMALL_FC_TAX: 0 },
      filter: function (row, t) {
        var set = t.CAREER_BUCKETS && t.CAREER_BUCKETS.get(row[t.IDX.name]);
        var shortEnough = row[t.IDX.ht] > 0 && row[t.IDX.ht] <= 76;
        return shortEnough || !!(set && set.F && set.C);   // keep only real C-slot unicorns in the pool
      },
      pick: function (S, row, slot, t) {
        var set = t.CAREER_BUCKETS && t.CAREER_BUCKETS.get(row[t.IDX.name]);
        if (slot === "C") return !!(set && set.F && set.C); // center must also be forward-eligible
        return row[t.IDX.ht] > 0 && row[t.IDX.ht] <= 76;     // no tall C/F sneaking into a forward slot
      } },

    /* ═══════════ POOL3 (2026-09-26): 200 dailies from #79, 2026-09-28 ═══════════
       Append-only like everything above. Each rule changes which player is the
       right pick, not just who is on the board. Every id was certified with
       tools/daily-audit.js (300 bot games: zero dead runs, healthy pools and
       center supply, a real spread of records). daily-core.js carries the
       player-facing copy (DAILY_COPY) and the schedule (POOL3). */

    /* ---- the engine room: taxes nobody had touched (rim, glass, creator, mileage) ---- */
    { id: "paint_police", name: "Paint Police", base: "cap",
      blurb: "Somebody up front must be a +2.5 defender, or the paint costs you 5 net.",
      cfg: { RIM_TOP20: 2.5, RIM_D_TAX: 5 } },
    { id: "five_out", name: "Five-Out", base: "cap",
      blurb: "The rim rule flips. No elite rim protector up front is worth 3 net.",
      cfg: { RIM_TOP20: 2, RIM_D_TAX: -3 } },
    { id: "crash_the_glass", name: "Crash the Glass", base: "cap",
      blurb: "The rebounding fines nearly triple and kick in sooner. Guards have to box out.",
      cfg: { GLASS_LOW: 4.2, GLASS_DIRE: 3.8, GLASS_TAX_LOW: 4, GLASS_TAX_DIRE: 7 } },
    { id: "point_god", name: "Point God", base: "cap",
      blurb: "Without one of the league's elite passers the offense stalls, and that costs 6 net.",
      cfg: { CREATOR_PCT: 0.985, CREATOR_TAX: 6 } },
    { id: "trust_the_process", name: "Trust the Process", base: "cap",
      blurb: "More than two players past their fourth season costs 5. Draft the kids.",
      deal: function () { return { decs: [1980, 1990, 2000, 2010, 2020] }; },
      cfg: { AGE_VET_YEAR: 5, AGE_VET_FREE: 2, AGE_TAX: 5 } },
    { id: "win_now", name: "Win Now", base: "cap",
      blurb: "Three players in their tenth season or later earn 4 net. Old legs, open wallet.",
      deal: function () { return { decs: [1990, 2000, 2010, 2020] }; },
      cfg: { AGE_VET_YEAR: 10, AGE_VET_FREE: 2, AGE_TAX: -4 } },
    { id: "mid_range", name: "The Mid-Range", base: "cap",
      blurb: "One shooter is perfect. Every shooter past one costs 1.5 net. Long twos are back.",
      cfg: { SPACERS_REQ: 1, SPACING_TAX: 2, SPACING_BONUS: -1.5 } },
    { id: "point_of_attack", name: "Point of Attack", base: "classic",
      blurb: "One of your guards must be a real stopper or the backcourt costs up to 7. Forwards guard nobody.",
      cfg: { GD_BOTTOM33: 1.5, GD_BOTTOM20: 0.5, BACKCOURT_D_TAX_33: 4, BACKCOURT_D_TAX_20: 7, WING_D_TAX_20: 0, WING_D_TAX_33: 0 } },
    { id: "tax_season", name: "Tax Season", base: "classic",
      blurb: "Every fit rule in the engine costs double. Talent alone will not save you.",
      cfg: { USAGE_RATE: 0.6, USAGE_CAP: 12, SPACING_TAX: 4, SPACING_BONUS: 2, BACKCOURT_D_TAX_20: 6, BACKCOURT_D_TAX_33: 4,
             WING_D_TAX_20: 6, WING_D_TAX_33: 4, RIM_D_TAX: 4, GLASS_TAX_LOW: 4, GLASS_TAX_DIRE: 6, CREATOR_TAX: 4, AGE_TAX: 2,
             SMALL_G_TAX: 4, SMALL_FC_TAX: 4 } },   // v63: double the new one-ball rate (0.3) and the size units (2); v63.1: and its cap (6)
    { id: "tax_holiday", name: "Tax Holiday", base: "cap",
      blurb: "Every fit rule is off. No usage, spacing, defense or dirty-work math. Pure talent.",
      cfg: { USAGE_RATE: 0, SPACING_TAX: 0, SPACING_BONUS: 0, BACKCOURT_D_TAX_20: 0, BACKCOURT_D_TAX_33: 0,
             WING_D_TAX_20: 0, WING_D_TAX_33: 0, RIM_D_TAX: 0, GLASS_TAX_LOW: 0, GLASS_TAX_DIRE: 0, CREATOR_TAX: 0, AGE_TAX: 0,
             SMALL_G_TAX: 0, SMALL_FC_TAX: 0, LBL_ISO_TAX: 0, LBL_CLUTCH_TAX: 0, LBL_TEAMD_TAX: 0, LBL_RIMPLUS_TAX: 0, LBL_TSHOT_TAX: 0,
             LBL_KNUCK_TAX_2: 0, LBL_KNUCK_TAX_3: 0, LBL_SWITCH_CREDIT: 0, LBL_CUT_CREDIT: 0,
             LBL_STICK_TAX: 0, LBL_HUNTED_TAX: 0, LBL_FOUL_TAX: 0, LBL_STATPAD_TAX: 0 } },   // v62: every fit rule means the tag rows too

    /* ---- the ledger: price rules (Presti) ---- */
    { id: "fair_market", name: "Fair Market", base: "cap",
      blurb: "No steals, no rip-offs. Every price is honest, so value is the only edge.",
      cfg: { CAP_GEM: 0, CAP_TRAP: 0 } },
    { id: "market_crash", name: "Market Crash", base: "cap",
      blurb: "The price curve collapsed. Stars cost $1M. Anything pricey is a trap.",
      cfg: { PRICE_MULT: 0 } },
    { id: "stars_and_scrubs", name: "Stars and Scrubs", base: "cap",
      blurb: "Only two players may cost more than $2M. Two stars, three steals.",
      pick: function (S, row, slot, t) {
        var c = cost(S, row, t); if (c == null || c <= 2) return true;
        var n = 0; S.picks.forEach(function (p) { if (p.cost > 2) n++; });
        return n < 2; } },
    { id: "minimum_guards", name: "Minimum Guards", base: "cap",
      blurb: "Both guards cost $3M or less. Spend the money up front.",
      pick: function (S, row, slot, t) { var c = cost(S, row, t); return slot !== "G" || c == null || c <= 3; } },
    { id: "payday", name: "Payday", base: "cap",
      blurb: "The owner pays out $8M a round. Spend it or save it, never borrow it.",
      pick: function (S, row, slot, t) { var c = cost(S, row, t); return c == null || spent(S) + c <= 8 * (S.picks.length + 1); } },
    { id: "last_call", name: "Last Call", base: "cap",
      blurb: "Your fifth pick must cost at least half of whatever you have left.",
      pick: function (S, row, slot, t) { var c = cost(S, row, t); return S.picks.length !== 4 || c == null || c * 2 >= S.budget; } },
    { id: "price_ladder", name: "The Price Ladder", base: "cap",
      blurb: "One player from each price tier: $1-2M, $3-5M, $6-9M, $10-14M, $15M and up.",
      pick: function (S, row, slot, t) {
        var c = cost(S, row, t); if (c == null) return true;
        function tier(x) { return x <= 2 ? 0 : x <= 5 ? 1 : x <= 9 ? 2 : x <= 14 ? 3 : 4; }
        var MINS = [1, 3, 6, 10, 15], used = {}, ti = tier(c);
        S.picks.forEach(function (p) { used[tier(p.cost)] = 1; });
        if (used[ti]) return false;
        var rest = 0; for (var i = 0; i < 5; i++) if (!used[i] && i !== ti) rest += MINS[i];
        return S.budget - c >= rest; } },
    { id: "splurge_and_save", name: "Splurge and Save", base: "cap",
      blurb: "Pay $8M or more for a player, and the next one must cost $2M or less.",
      pick: function (S, row, slot, t) {
        var p = last(S); if (!p || p.cost == null || p.cost < 8) return true;
        var c = cost(S, row, t); return c == null || c <= 2; } },
    { id: "no_headliners", name: "No Headliners", base: "cap",
      blurb: "The most expensive player on every board is off limits.",
      pick: function (S, row, slot, t) {
        var c = cost(S, row, t); if (c == null) return true;
        var top = 0, cb = S.costByName;
        for (var n in cb) if (Object.prototype.hasOwnProperty.call(cb, n) && !S.drafted.has(n) && cb[n] > top) top = cb[n];
        return cb[row[t.IDX.name]] < top; } },
    { id: "vintage", name: "Vintage", base: "cap",
      blurb: "Your five seasons must average 1990 or earlier. Old wine, new money.",
      pick: function (S, row, slot, t) {
        var I = t.IDX, s = row[I.season];
        S.picks.forEach(function (p) { s += p.row[I.season]; });
        return s + picksLeftAfter(S) * 1974 <= 5 * 1990; } },

    /* ---- the box score: team totals, spreads and stat gates (Classic shows the stats) ---- */
    { id: "scoring_cap", name: "The Scoring Cap", base: "classic",
      blurb: "Your five may combine for 70 points a night, no more. Points are expensive now.",
      pick: function (S, row, slot, t) {                 // 3 points a pick stay in reserve, so the last slot never starves
        var I = t.IDX, s = row[I.ppg]; S.picks.forEach(function (p) { s += p.row[I.ppg]; });
        return s + picksLeftAfter(S) * 3 <= 70; } },
    { id: "stocks", name: "Stocks", base: "classic",
      blurb: "Steals plus blocks, all five combined, must reach 13 a night.",
      pick: function (S, row, slot, t) {                 // each open slot is credited only what its position can plausibly add
        var I = t.IDX, s = row[I.spg] + row[I.bpg];
        S.picks.forEach(function (p) { s += p.row[I.spg] + p.row[I.bpg]; });
        var open = { G: 2 - S.filled.G, F: 2 - S.filled.F, C: 1 - S.filled.C }; open[slot]--;
        return s + open.G * 2.6 + open.F * 3 + open.C * 3.6 >= 13; } },
    { id: "balanced_attack", name: "Balanced Attack", base: "classic",
      blurb: "Your top scorer and your lowest scorer must be within 8 points of each other.",
      pick: function (S, row, slot, t) {
        var I = t.IDX, lo = row[I.ppg], hi = row[I.ppg];
        S.picks.forEach(function (p) { var v = p.row[I.ppg]; if (v < lo) lo = v; if (v > hi) hi = v; });
        return hi - lo <= 8; } },
    { id: "stat_sheet", name: "The Stat Sheet", base: "classic",
      blurb: "Every pick fills the box: 10 points, 4 boards and 2 assists at least.",
      filter: function (row, t) { var I = t.IDX; return row[I.ppg] >= 10 && row[I.rpg] >= 4 && row[I.apg] >= 2; } },
    { id: "five_tools", name: "Five Tools", base: "classic",
      blurb: "Five different specialists: a scorer, a rebounder, a passer, a thief and a shot blocker.",
      pick: function (S, row, slot, t) {
        var I = t.IDX;
        function cats(r) { var c = [];
          if (r[I.ppg] >= 20) c.push(0); if (r[I.rpg] >= 9) c.push(1); if (r[I.apg] >= 7) c.push(2);
          if (r[I.spg] >= 1.7) c.push(3); if (r[I.bpg] >= 1.7) c.push(4); return c; }
        var mine = cats(row); if (!mine.length) return false;
        var agents = S.picks.map(function (p) { return cats(p.row); }); agents.push(mine);
        var PLAUS = { G: [0, 2, 3], F: [0, 1, 3, 4], C: [0, 1, 4] };
        var open = { G: 2 - S.filled.G, F: 2 - S.filled.F, C: 1 - S.filled.C }; open[slot]--;
        ["G", "F", "C"].forEach(function (b) { for (var k = 0; k < open[b]; k++) agents.push(PLAUS[b]); });
        var taken = [false, false, false, false, false];
        function fit(i) {
          if (i === agents.length) return true;
          for (var j = 0; j < agents[i].length; j++) { var c = agents[i][j];
            if (!taken[c]) { taken[c] = true; if (fit(i + 1)) return true; taken[c] = false; } }
          return false; }
        return fit(0); } },
    { id: "extra_pass", name: "The Extra Pass", base: "classic",
      blurb: "Your five must combine for 26 assists a night. Everybody moves the ball.",
      pick: function (S, row, slot, t) {
        var I = t.IDX, s = row[I.apg]; S.picks.forEach(function (p) { s += p.row[I.apg]; });
        var open = { G: 2 - S.filled.G, F: 2 - S.filled.F, C: 1 - S.filled.C }; open[slot]--;
        return s + open.G * 9 + open.F * 6 + open.C * 5 >= 26; } },
    { id: "feed_the_star", name: "Feed the Star", base: "classic",
      blurb: "Draft a 22-point scorer and your next pick must score under 8. Someone has to pass.",
      pick: function (S, row, slot, t) { var p = last(S), I = t.IDX; return !p || p.row[I.ppg] < 22 || row[I.ppg] < 8; } },
    { id: "unselfish", name: "Unselfish", base: "classic",
      blurb: "Every pick must dish at least one assist for every five points he scores.",
      filter: function (row, t) { var I = t.IDX; return row[I.apg] * 5 >= row[I.ppg]; } },
    { id: "blue_collar", name: "Blue Collar", base: "classic",
      blurb: "Every pick must grab at least one rebound for every two points he scores.",
      filter: function (row, t) { var I = t.IDX; return row[I.rpg] * 2 >= row[I.ppg]; } },
    { id: "job_description", name: "Job Description", base: "classic",
      blurb: "Every pick needs a specialty: shooter, 8 boards, 6 assists, 2 steals or 2 blocks.",
      filter: function (row, t) { var I = t.IDX;
        return row[I.sp] >= 1 || row[I.rpg] >= 8 || row[I.apg] >= 6 || row[I.bpg] >= 2 || row[I.spg] >= 2; } },

    /* ---- the lineup card: slot rules ---- */
    { id: "stretch_five", name: "Stretch Five", base: "classic",
      blurb: "Modern boards, and anyone who can play center must be a floor spacer. The big man shoots.",
      deal: function () { return { decs: [2010, 2020] }; },
      pick: function (S, row, slot, t) { var p = person(row, t); return !(slot === "C" || (p && p.bk.C)) || spacer(row, t); } },
    { id: "point_center", name: "Point Center", base: "classic",
      blurb: "Anyone who can play center must average 2 assists. No black holes in the post.",
      pick: function (S, row, slot, t) { var p = person(row, t); return !(slot === "C" || (p && p.bk.C)) || row[t.IDX.apg] >= 2; } },
    { id: "screen_setter", name: "The Screen Setter", base: "classic",
      blurb: "Anyone who can play center must use 15 percent of plays or fewer. Bigs set picks.",
      pick: function (S, row, slot, t) { var p = person(row, t); return !(slot === "C" || (p && p.bk.C)) || row[t.IDX.usage] <= 15; } },
    { id: "the_post", name: "The Post", base: "classic",
      blurb: "Pick one is your center, and nobody after him may outscore him.",
      pick: function (S, row, slot, t) {
        if (!S.picks.length) return slot === "C";
        return row[t.IDX.ppg] <= S.picks[0].row[t.IDX.ppg]; } },
    { id: "point_forwards", name: "Point Forwards", base: "classic",
      blurb: "Both forwards must average 3.5 assists. The offense starts on the wing.",
      pick: function (S, row, slot, t) { return slot !== "F" || row[t.IDX.apg] >= 3.5; } },
    { id: "power_forwards", name: "Power Forwards", base: "classic",
      blurb: "Both forwards must average 8 rebounds. Old-school fours only.",
      pick: function (S, row, slot, t) { return slot !== "F" || row[t.IDX.rpg] >= 8; } },
    { id: "help_defense", name: "Help Defense", base: "classic",
      blurb: "Both forwards must block 1.2 shots a night. The weak side is closed.",
      pick: function (S, row, slot, t) { return slot !== "F" || row[t.IDX.bpg] >= 1.2; } },
    { id: "three_and_d", name: "3-and-D", base: "classic",
      blurb: "Both forwards must be floor spacers who average a steal. The modern wing.",
      pick: function (S, row, slot, t) { return slot !== "F" || (spacer(row, t) && row[t.IDX.spg] >= 1); } },
    { id: "forward_firepower", name: "Forward Firepower", base: "classic",
      blurb: "Both forwards must average 18 points. The wings carry the scoring.",
      pick: function (S, row, slot, t) { return slot !== "F" || row[t.IDX.ppg] >= 18; } },
    { id: "all_wings", name: "All Wings", base: "pro",
      blurb: "No stats. Both forwards must also be able to play guard.",
      pick: function (S, row, slot, t) { var p = person(row, t); return slot !== "F" || !!(p && p.bk.G); } },
    { id: "frontcourt_giants", name: "Frontcourt Giants", base: "pro",
      blurb: "No stats. Both forwards must also be able to play center.",
      pick: function (S, row, slot, t) { var p = person(row, t); return slot !== "F" || !!(p && p.bk.C); } },
    { id: "big_guards", name: "Big Guards", base: "classic",
      blurb: "Both guards must average 5.5 rebounds. Size in the backcourt.",
      pick: function (S, row, slot, t) { return slot !== "G" || row[t.IDX.rpg] >= 5.5; } },
    { id: "two_point_guards", name: "Two Point Guards", base: "classic",
      blurb: "Both guards must average 6 assists. Two quarterbacks, one ball.",
      pick: function (S, row, slot, t) { return slot !== "G" || row[t.IDX.apg] >= 6; } },
    { id: "bucket_getters", name: "Bucket Getters", base: "classic",
      blurb: "Both guards must average 18 points. The backcourt carries the offense.",
      pick: function (S, row, slot, t) { return slot !== "G" || row[t.IDX.ppg] >= 18; } },
    { id: "glue_guards", name: "Glue Guards", base: "classic",
      blurb: "Both guards score 10 points or fewer. The stars play up front.",
      pick: function (S, row, slot, t) { return slot !== "G" || row[t.IDX.ppg] <= 10; } },
    { id: "old_school_backcourt", name: "Old-School Backcourt", base: "classic",
      blurb: "Neither guard may be a floor spacer. Find your shooting somewhere else.",
      pick: function (S, row, slot, t) { return slot !== "G" || !spacer(row, t); } },
    { id: "splash_backcourt", name: "Splash Backcourt", base: "classic",
      blurb: "Both guards must be floor spacers. Every era has a few.",
      pick: function (S, row, slot, t) { return slot !== "G" || spacer(row, t); } },
    { id: "rookie_backcourt", name: "Rookie Backcourt", base: "classic",
      blurb: "Both guards must be in their first or second season. Hand the kids the keys.",
      pick: function (S, row, slot, t) { return slot !== "G" || (trueStart(row, t) && cyear(row, t) <= 2); } },
    { id: "then_and_now", name: "Then and Now", base: "cap",
      blurb: "One guard from before 1995 and one from 2005 on. Same for the forwards.",
      pick: function (S, row, slot, t) {
        if (slot === "C") return true;
        var I = t.IDX, s = row[I.season];
        if (s >= 1995 && s < 2005) return false;
        var old = s < 1995;
        for (var i = 0; i < S.picks.length; i++)
          if (S.picks[i].slot === slot && (S.picks[i].row[I.season] < 1995) === old) return false;
        return true; } },
    { id: "outside_in", name: "Outside In", base: "pro",
      blurb: "No stats. Draft both guards first, then both forwards, then the center.",
      pick: function (S, row, slot, t) {
        if (slot === "F") return S.filled.G >= 2;
        if (slot === "C") return S.filled.G >= 2 && S.filled.F >= 2;
        return true; } },
    { id: "play_big", name: "Play Big", base: "pro",
      blurb: "No stats. Every player plays the biggest position he ever played.",
      pick: function (S, row, slot, t) {
        var p = person(row, t), b = p ? p.bk : {};
        return slot === (b.C ? "C" : b.F ? "F" : "G"); } },

    /* ---- positions ---- */
    { id: "the_spectrum", name: "The Spectrum", base: "pro",
      blurb: "No stats. No two picks may wear the same position tag.",
      pick: function (S, row, slot, t) {
        function tag(r) { var p = person(r, t), b = p ? p.bk : {}; return (b.G ? "G" : "") + (b.F ? "F" : "") + (b.C ? "C" : ""); }
        var mine = tag(row); if (mine.indexOf(slot) < 0) return false;
        var used = {}; used[mine] = 1;
        for (var i = 0; i < S.picks.length; i++) { var tg = tag(S.picks[i].row); if (used[tg]) return false; used[tg] = 1; }
        var FOR = { G: ["G", "GF"], F: ["F", "GF", "FC"], C: ["C", "FC"] };
        var open = { G: 2 - S.filled.G, F: 2 - S.filled.F, C: 1 - S.filled.C }; open[slot]--;
        var need = []; ["G", "F", "C"].forEach(function (b) { for (var k = 0; k < open[b]; k++) need.push(FOR[b]); });
        function fit(i) {
          if (i === need.length) return true;
          for (var j = 0; j < need[i].length; j++) { var c = need[i][j];
            if (!used[c]) { used[c] = 1; if (fit(i + 1)) return true; delete used[c]; } }
          return false; }
        return fit(0); } },
    { id: "nellie_ball", name: "Nellie Ball", base: "cap",
      blurb: "Every pick must be able to play forward. Positionless basketball, 1989 style.",
      pick: function (S, row, slot, t) { var p = person(row, t); return !!(p && p.bk.F && p.bk[slot]); } },
    { id: "by_the_book", name: "By the Book", base: "classic",
      blurb: "One point guard, one shooting guard, one small forward, one power forward, one center.",
      pick: function (S, row, slot, t) {
        var I = t.IDX, pos = String(row[I.pos] || ""), GRP = { PG: "G", SG: "G", SF: "F", PF: "F", C: "C" };
        if (GRP[pos] !== slot) return false;
        for (var i = 0; i < S.picks.length; i++) if (String(S.picks[i].row[I.pos]) === pos) return false;
        return true; } },

    /* ---- the clock: where the season sits in the career ---- */
    { id: "rookie_scale", name: "Rookie Scale", base: "classic",
      blurb: "Every pick in his first three seasons. The stars before they were stars.",
      filter: function (row, t) { return trueStart(row, t) && cyear(row, t) <= 3; } },
    { id: "swan_song", name: "Swan Song", base: "classic",
      blurb: "Every pick in one of the last two seasons of his career. Who went out on top?",
      filter: function (row, t) { var p = person(row, t); return !!p && p.last <= 2025 && row[t.IDX.season] >= p.last - 1; } },
    { id: "rentals", name: "Rentals", base: "pro",
      blurb: "No stats. Only players who spent exactly one season with that franchise.",
      filter: function (row, t) { var p = person(row, t), f = frOf(row, t); return !!(p && f && p.ten[f] && Object.keys(p.ten[f]).length === 1); } },
    { id: "franchise_pillars", name: "Franchise Pillars", base: "pro",
      blurb: "No stats. Only players who spent five or more seasons with that franchise.",
      filter: function (row, t) { var p = person(row, t), f = frOf(row, t); return !!(p && f && p.ten[f] && Object.keys(p.ten[f]).length >= 5); } },
    { id: "the_off_year", name: "The Off Year", base: "classic",
      blurb: "Nobody may be drafted in his career-high scoring season. Use the year menu.",
      filter: function (row, t) { var p = person(row, t); return !!p && row[t.IDX.ppg] < p.maxPpg; } },
    { id: "homegrown", name: "Homegrown", base: "pro",
      blurb: "No stats. Every pick wears the jersey of the team he started with.",
      filter: function (row, t) { var p = person(row, t), f = frOf(row, t); return !!(p && f && p.first > 1974 && p.firstFrs[f]); } },
    { id: "the_leap", name: "The Leap", base: "classic",
      blurb: "Every pick in a season when his scoring jumped 3 points or more. Breakout years only.",
      filter: function (row, t) {
        var p = person(row, t), I = t.IDX; if (!p) return false;
        var prev = p.ppg[row[I.season] - 1]; return prev != null && row[I.ppg] - prev >= 3; } },
    { id: "career_arc", name: "The Career Arc", base: "classic",
      blurb: "Each pick is exactly one season deeper into his career than the pick before.",
      pick: function (S, row, slot, t) {                 // the chain starts no later than year 8, so pick five is year 12 at most
        if (!trueStart(row, t)) return false;
        var p = last(S); return p ? cyear(row, t) === cyear(p.row, t) + 1 : cyear(row, t) <= 8; } },
    { id: "new_threads", name: "New Threads", base: "classic",
      blurb: "Every pick in his first season with a new team. Offseason moves only.",
      filter: function (row, t) {
        var p = person(row, t), f = frOf(row, t), s = row[t.IDX.season];
        return !!(p && f && p.frFirst[f] === s && s > p.first && !p.firstFrs[f]); } },
    { id: "peer_group", name: "Peer Group", base: "classic",
      blurb: "Your first pick sets the career stage. Everyone else within one season of it.",
      pick: function (S, row, slot, t) {
        if (!trueStart(row, t)) return false;
        return !S.picks.length || Math.abs(cyear(row, t) - cyear(S.picks[0].row, t)) <= 1; } },
    { id: "the_mentor", name: "The Mentor", base: "classic",
      blurb: "Pick one is in his tenth season or later. The other four are in their first five.",
      deal: function () { return { decs: [1990, 2000, 2010, 2020] }; },
      pick: function (S, row, slot, t) {
        if (!S.picks.length) return cyear(row, t) >= 10;
        return trueStart(row, t) && cyear(row, t) <= 5; } },

    /* ---- the calendar ---- */
    { id: "contemporaries", name: "Contemporaries", base: "cap",
      blurb: "Every pick within four seasons of your first. One era, one team.",
      pick: function (S, row, slot, t) {
        return !S.picks.length || Math.abs(row[t.IDX.season] - S.picks[0].row[t.IDX.season]) <= 4; },
      deal: function (S, t) {
        if (!S.picks.length) return null;
        var s1 = S.picks[0].row[t.IDX.season];
        return { decs: t.DECADES.filter(function (d) { return d + 9 >= s1 - 4 && d <= s1 + 4; }) }; } },
    { id: "anniversary", name: "Anniversary", base: "classic",
      blurb: "Every season must end in the same digit as your first pick's.",
      pick: function (S, row, slot, t) {
        return !S.picks.length || row[t.IDX.season] % 10 === S.picks[0].row[t.IDX.season] % 10; } },
    { id: "the_midpoint", name: "The Midpoint", base: "cap",
      blurb: "Your first pick's season is the middle: two picks from before it, two from after.",
      pick: function (S, row, slot, t) {
        var I = t.IDX, s = row[I.season];
        if (!S.picks.length) return s >= 1975 && s <= 2025;
        var s1 = S.picks[0].row[I.season], lo = 0, hi = 0;
        if (s === s1) return false;
        for (var i = 1; i < S.picks.length; i++) { if (S.picks[i].row[I.season] < s1) lo++; else hi++; }
        if (s < s1) lo++; else hi++;
        return lo <= 2 && hi <= 2; },
      deal: function (S, t) {
        if (!S.picks.length) return null;
        var I = t.IDX, s1 = S.picks[0].row[I.season], lo = 0, hi = 0;
        for (var i = 1; i < S.picks.length; i++) { if (S.picks[i].row[I.season] < s1) lo++; else hi++; }
        var d1 = Math.floor(s1 / 10) * 10;
        if (lo >= 2) return { decs: t.DECADES.filter(function (d) { return d >= d1; }) };
        if (hi >= 2) return { decs: t.DECADES.filter(function (d) { return d <= d1; }) };
        return null; } },
    { id: "early_arc", name: "The Early Arc", base: "cap",
      blurb: "The 1980s, when threes were rare, and every missing shooter costs 3 net.",
      deal: function () { return { decs: [1980] }; },
      cfg: { SPACING_TAX: 3 } },
    { id: "by_the_numbers", name: "By the Numbers", base: "classic",
      blurb: "Pick one's season ends in 1, pick two's in 2, and so on through pick five.",
      pick: function (S, row, slot, t) { return row[t.IDX.season] % 10 === S.picks.length + 1; } },
    { id: "longevity", name: "Longevity", base: "pro",
      blurb: "No stats. Your five careers must add up to 70 seasons or more.",
      pick: function (S, row, slot, t) {
        var p = person(row, t), s = p ? p.n : 0;
        S.picks.forEach(function (q) { var pp = person(q.row, t); s += pp ? pp.n : 0; });
        return s + picksLeftAfter(S) * 20 >= 70; } },

    /* ---- the franchise map: careers, teammates, tenure ---- */
    { id: "six_degrees", name: "Six Degrees", base: "cap",
      blurb: "After your first pick, every player must have been a teammate of someone you drafted.",
      pick: function (S, row, slot, t) {
        if (!S.picks.length) return true;
        var me = person(row, t); if (!me) return false;
        return S.picks.some(function (q) { var o = person(q.row, t); return !!o && teammates(me, o); }); },
      deal: function (S, t) {
        if (!S.picks.length) return null;
        var frs = {}; S.picks.forEach(function (q) { var o = person(q.row, t); if (o) o.frs.forEach(function (f) { frs[f] = 1; }); });
        return { frs: Object.keys(frs) }; } },
    { id: "alumni_night", name: "Alumni Night", base: "cap",
      blurb: "After your first pick, everyone must have played for his franchise at some point.",
      pick: function (S, row, slot, t) {
        if (!S.picks.length) return true;
        var p = person(row, t); return !!(p && p.ten[S.picks[0].fr]); } },
    { id: "strangers", name: "Strangers", base: "cap",
      blurb: "No two of your five ever played for the same franchise, in any season. Nobody shares a past.",
      pick: function (S, row, slot, t) {
        var me = person(row, t); if (!me) return true;
        return !S.picks.some(function (q) {
          var o = person(q.row, t); if (!o) return false;
          for (var f in me.ten) if (o.ten[f]) return true;
          return false; }); } },
    { id: "pass_it_on", name: "Pass It On", base: "pro",
      blurb: "No stats. Each pick must have played for the franchise of the pick before him.",
      pick: function (S, row, slot, t) {
        if (!S.picks.length) return true;
        var p = person(row, t), q = last(S); return !!(p && q.fr && p.ten[q.fr]); } },
    { id: "spell_the_team", name: "Spell the Team", base: "pro",
      blurb: "No stats. Every surname must start with a letter found in the team's nickname.",
      filter: function (row, t) {
        var f = frOf(row, t), L = nameParts(row[t.IDX.name]).last.charAt(0);
        return !!f && !!L && f.toLowerCase().indexOf(L) >= 0; } },
    { id: "ring_chasers", name: "Ring Chasers", base: "classic",
      blurb: "Every pick from a title team, in the season it won the title.",
      filter: function (row, t) { return TITLES[row[t.IDX.season]] === frOf(row, t); } },
    { id: "frequent_flyers", name: "Frequent Flyers", base: "cap",
      blurb: "Your five must have worn 22 or more franchises between them, careers combined.",
      pick: function (S, row, slot, t) {
        var p = person(row, t), s = p ? p.frs.length : 0;
        S.picks.forEach(function (q) { var o = person(q.row, t); s += o ? o.frs.length : 0; });
        return s + picksLeftAfter(S) * 10 >= 22; } },

    /* ---- context: the season's team and league ---- */
    { id: "bench_mob", name: "Bench Mob", base: "classic",
      blurb: "Every pick ranked sixth or lower in minutes on his team that season.",
      filter: function (row, t) {
        var r = ix(t).MRANK.get(pk(row, t) + "|" + frOf(row, t) + "|" + row[t.IDX.season]);
        return r >= 6; } },
    { id: "robin", name: "Robin", base: "cap",
      blurb: "Nobody who led his team in scoring that season. Draft the sidekicks.",
      filter: function (row, t) {
        var I = t.IDX, top = ix(t).TOP.get(frOf(row, t) + "|" + row[I.season]);
        var mp = typeof row._stintMp === "number" ? row._stintMp : row[I.mp];
        return mp < 1000 || !(row[I.ppg] >= top); } },
    { id: "league_leaders", name: "League Leaders", base: "classic",
      blurb: "Every pick finished top 15 in the league that season in a box-score stat.",
      filter: function (row, t) { return (ix(t).LEAD.get(pk(row, t) + "|" + row[t.IDX.season]) || 99) <= 15; } },

    /* ---- names ---- */
    { id: "word_chain", name: "Word Chain", base: "pro",
      blurb: "No stats. Each first name starts with the last letter of the previous surname.",
      pick: function (S, row, slot, t) {
        var me = nameParts(row[t.IDX.name]);
        if (S.picks.length < 4 && /[qux]$/.test(me.last)) return false;   // dead-end letters wait for the last pick
        if (!S.picks.length) return true;
        var prev = nameParts(last(S).row[t.IDX.name]).last;
        return !!prev && me.first.charAt(0) === prev.charAt(prev.length - 1); } },
    { id: "short_names", name: "Name Tags", base: "pro",
      blurb: "No stats. Your five surnames may total 30 letters at most.",
      pick: function (S, row, slot, t) {
        var s = nameParts(row[t.IDX.name]).last.length;
        S.picks.forEach(function (q) { s += nameParts(q.row[t.IDX.name]).last.length; });
        return s + picksLeftAfter(S) * 3 <= 30; } },

    /* ---- sequences and combos ---- */
    { id: "give_and_go", name: "Give and Go", base: "cap",
      blurb: "Your picks alternate between a floor spacer and a non-shooter.",
      pick: function (S, row, slot, t) { var p = last(S); return !p || spacer(row, t) !== spacer(p.row, t); } },
    { id: "long_ball", name: "Long Ball", base: "cap",
      blurb: "Everyone is 6'7\" or taller, and each missing shooter costs 3 net.",
      filter: function (row, t) { return row[t.IDX.ht] >= 79; },
      cfg: { SPACING_TAX: 3 } },
    { id: "height_cap", name: "Height Cap", base: "cap",
      blurb: "Your five may stand 32'6\" combined, no more. Every inch has a cost.",
      pick: function (S, row, slot, t) {                 // the slots still open keep room for a small man at each
        var I = t.IDX, s = row[I.ht]; S.picks.forEach(function (p) { s += p.row[I.ht]; });
        var open = { G: 2 - S.filled.G, F: 2 - S.filled.F, C: 1 - S.filled.C }; open[slot]--;
        return s + open.G * 72 + open.F * 77 + open.C * 81 <= 390; } },

    /* ---- batch two: combos, cousins with new targets, teams and timelines ---- */
    { id: "gunslingers", name: "Gunslingers", base: "cap",
      blurb: "The usage tax is off, but you need five shooters or pay 2.5 each. Volume shooters rule.",
      cfg: { USAGE_RATE: 0, SPACERS_REQ: 5, SPACING_TAX: 2.5 } },
    { id: "bad_boys", name: "Bad Boys", base: "cap",
      blurb: "Every defense fine doubles and shooting counts for nothing. Win ugly.",
      cfg: { BACKCOURT_D_TAX_20: 6, BACKCOURT_D_TAX_33: 4, WING_D_TAX_20: 6, WING_D_TAX_33: 4, RIM_D_TAX: 4,
             SPACING_TAX: 0, SPACING_BONUS: 0 } },
    { id: "no_point_guard", name: "No Point Guard", base: "classic",
      blurb: "Neither guard may average more than 3 assists. The passing has to come from somewhere else.",
      pick: function (S, row, slot, t) { return slot !== "G" || row[t.IDX.apg] <= 3; } },
    { id: "finesse_forwards", name: "Finesse Forwards", base: "classic",
      blurb: "Neither forward may average more than 5 rebounds. Find the glass elsewhere.",
      pick: function (S, row, slot, t) { return slot !== "F" || row[t.IDX.rpg] <= 5; } },
    { id: "old_man_center", name: "Old Man at Center", base: "classic",
      blurb: "Your center must be in his tenth season or later. Old legs, smart feet.",
      deal: function () { return { decs: [1990, 2000, 2010, 2020] }; },
      pick: function (S, row, slot, t) { return slot !== "C" || cyear(row, t) >= 10; } },
    { id: "punt_the_boards", name: "Punt the Boards", base: "classic",
      blurb: "Your five may total 24 rebounds a night at most. The glass fine is coming. Win anyway.",
      pick: function (S, row, slot, t) {
        var I = t.IDX, s = row[I.rpg]; S.picks.forEach(function (p) { s += p.row[I.rpg]; });
        return s + picksLeftAfter(S) * 1.5 <= 24; } },
    { id: "punt_assists", name: "Punt Assists", base: "classic",
      blurb: "Your five may total 10 assists a night at most. Nobody runs the offense.",
      pick: function (S, row, slot, t) {
        var I = t.IDX, s = row[I.apg]; S.picks.forEach(function (p) { s += p.row[I.apg]; });
        return s + picksLeftAfter(S) * 0.5 <= 10; } },
    { id: "ringless", name: "Ringless", base: "pro",
      blurb: "No stats. Nobody who ever won a title. The best who never got one.",
      filter: function (row, t) {
        var p = person(row, t); if (!p) return false;
        for (var k in p.keys) { var bar = k.lastIndexOf("|"); if (TITLES[+k.slice(bar + 1)] === k.slice(0, bar)) return false; }
        return true; } },
    { id: "shaqs_rolodex", name: "Shaq's Rolodex", base: "cap",
      blurb: "Every pick must have been a teammate of Shaquille O'Neal at some point.",
      deal: function (S, t) { var sh = ix(t).P.get("Shaquille O'Neal|85"); return sh ? { frs: sh.frs, decs: [1990, 2000, 2010] } : null; },
      pick: function (S, row, slot, t) {
        var sh = ix(t).P.get("Shaquille O'Neal|85"), me = person(row, t);
        return !!(sh && me && me !== sh && teammates(me, sh)); } },
    { id: "the_duo", name: "The Duo", base: "classic",
      blurb: "Two of your five must be real teammates, same team and same season.",
      pick: function (S, row, slot, t) {
        var I = t.IDX;
        function pair(a, b) { return a.fr === b.fr && a.s === b.s; }
        var list = S.picks.map(function (q) { return { fr: q.fr, s: q.row[I.season] }; });
        for (var i = 0; i < list.length; i++) for (var j = i + 1; j < list.length; j++) if (pair(list[i], list[j])) return true;
        if (S.picks.length < 4) return true;
        var me = { fr: frOf(row, t), s: row[I.season] };
        return list.some(function (x) { return pair(x, me); }); },
      deal: function (S, t) {
        if (S.picks.length !== 4) return null;
        var I = t.IDX, seen = {};
        for (var i = 0; i < 4; i++) { var k = S.picks[i].fr + "|" + S.picks[i].row[I.season]; if (seen[k]) return null; seen[k] = 1; }
        return { frs: S.picks.map(function (q) { return q.fr; }), decs: S.picks.map(function (q) { return q.dec; }) }; } },
    { id: "the_straight", name: "The Straight", base: "classic",
      blurb: "Your five seasons must be five years in a row, in any order. Like a poker straight.",
      pick: function (S, row, slot, t) {
        var I = t.IDX, s = row[I.season], lo = s, hi = s;
        for (var i = 0; i < S.picks.length; i++) { var x = S.picks[i].row[I.season];
          if (x === s) return false; if (x < lo) lo = x; if (x > hi) hi = x; }
        return hi - lo <= 4; },
      deal: function (S, t) {
        if (!S.picks.length) return null;
        var I = t.IDX, lo = 9999, hi = 0;
        S.picks.forEach(function (q) { var x = q.row[I.season]; if (x < lo) lo = x; if (x > hi) hi = x; });
        return { decs: t.DECADES.filter(function (d) { return d + 9 >= hi - 4 && d <= lo + 4; }) }; } },
    { id: "lottery_stars", name: "Lottery Stars", base: "cap",
      blurb: "Every pick from a team in the bottom third of the league that season.",
      filter: function (row, t) {
        var r = ix(t).WEAK.get(frOf(row, t) + "|" + row[t.IDX.season]); return !!r; } },
    { id: "max_center", name: "Max Center", base: "cap",
      blurb: "Pick one is your center, and nobody after him may cost more than he did.",
      pick: function (S, row, slot, t) {
        if (!S.picks.length) return slot === "C";
        var c = cost(S, row, t); return c == null || c <= S.picks[0].cost; } },
    { id: "worst_year", name: "The Worst Year", base: "classic",
      blurb: "Every pick in the lowest-scoring full season of his career. Who was good even then?",
      filter: function (row, t) {
        var p = person(row, t), I = t.IDX; if (!p || row[I.mp] < 1000) return false;
        return row[I.ppg] <= p.minFullPpg; } },
    { id: "first_name_basis", name: "First-Name Basis", base: "pro",
      blurb: "No stats. Two of your five must share a first name.",
      pick: function (S, row, slot, t) {
        var X = ix(t), me = nameParts(row[t.IDX.name]).first;
        var firsts = S.picks.map(function (q) { return nameParts(q.row[t.IDX.name]).first; });
        for (var i = 0; i < firsts.length; i++) if (firsts.indexOf(firsts[i]) !== i) return true;   // pair already made
        if (firsts.indexOf(me) >= 0) return true;
        var left = picksLeftAfter(S);
        if (left === 0) return false;
        // keep a common first name on the roster so a partner always exists
        var all = firsts.concat([me]);
        return all.some(function (f) { return (X.FIRST[f] || 0) >= 8; }); } },

    /* ---- batch three ---- */
    { id: "the_encore", name: "The Encore", base: "classic",
      blurb: "Every pick in the season right after his highest-scoring season.",
      filter: function (row, t) {
        var p = person(row, t), prev = p ? p.ppg[row[t.IDX.season] - 1] : null;
        return prev != null && prev >= p.maxPpg; } },
    { id: "the_hangover", name: "The Hangover", base: "classic",
      blurb: "Every pick from a team that won the title the season before.",
      filter: function (row, t) { return TITLES[row[t.IDX.season] - 1] === frOf(row, t); } },
    { id: "dime_season", name: "Dime Season", base: "classic",
      blurb: "Every pick in the season he averaged the most assists of his career.",
      filter: function (row, t) { var p = person(row, t); return !!p && row[t.IDX.apg] >= p.maxApg; } },
    { id: "common_names", name: "Common Names", base: "pro",
      blurb: "No stats. Only surnames shared by five or more players in NBA history.",
      filter: function (row, t) { return (ix(t).LAST[nameParts(row[t.IDX.name]).last] || 0) >= 5; } },
    { id: "backcourt_mates", name: "Backcourt Mates", base: "cap",
      blurb: "Your two guards must have been teammates at some point in their careers.",
      pick: function (S, row, slot, t) {
        if (slot !== "G") return true;
        var me = person(row, t), other = null;
        S.picks.forEach(function (q) { if (q.slot === "G") other = q; });
        if (!other) return true;
        var o = person(other.row, t); return !!(me && o && teammates(me, o)); } },
    { id: "role_forwards", name: "Role Forwards", base: "classic",
      blurb: "Both forwards must use 16 percent of plays or fewer. The shots go elsewhere.",
      pick: function (S, row, slot, t) { return slot !== "F" || row[t.IDX.usage] <= 16; } },
    { id: "pay_by_size", name: "Pay by Size", base: "cap",
      blurb: "No guard may cost more than a forward, and no forward more than your center.",
      pick: function (S, row, slot, t) {
        var c = cost(S, row, t); if (c == null) return true;
        var pr = { G: [], F: [], C: [] }; S.picks.forEach(function (q) { pr[q.slot].push(q.cost); }); pr[slot].push(c);
        var mx = function (a) { return a.length ? Math.max.apply(null, a) : 0; }, mn = function (a) { return a.length ? Math.min.apply(null, a) : 99; };
        if (mx(pr.G) > mn(pr.F.concat(pr.C)) || mx(pr.F) > mn(pr.C)) return false;
        var open = { G: 2 - pr.G.length, F: 2 - pr.F.length, C: 1 - pr.C.length };
        var fFloor = Math.max(1, mx(pr.G)), cFloor = Math.max(1, mx(pr.G), mx(pr.F), open.F ? fFloor : 0);
        return S.budget - c >= open.G + open.F * fFloor + open.C * cFloor; } },
    { id: "price_check", name: "Price Check", base: "cap",
      blurb: "No two of your five may cost the same. Five different price tags.",
      pick: function (S, row, slot, t) {
        var c = cost(S, row, t); if (c == null) return true;
        var used = {}; S.picks.forEach(function (q) { used[q.cost] = 1; });
        if (used[c]) return false;
        used[c] = 1;
        var need = picksLeftAfter(S), sum = 0;
        for (var x = 1; need > 0; x++) if (!used[x]) { sum += x; need--; }
        return S.budget - c >= sum; } },
    { id: "hundred_club", name: "The Hundred Club", base: "classic",
      blurb: "Your five must combine for 110 points a night or more. Bring the buckets.",
      pick: function (S, row, slot, t) {
        var I = t.IDX, s = row[I.ppg]; S.picks.forEach(function (p) { s += p.row[I.ppg]; });
        var open = { G: 2 - S.filled.G, F: 2 - S.filled.F, C: 1 - S.filled.C }; open[slot]--;
        return s + open.G * 30 + open.F * 30 + open.C * 28 >= 110; } },
    { id: "experience_cap", name: "Kids' Table", base: "classic",
      blurb: "Add up the career seasons of your five picks: 18 at most. Youth everywhere.",
      pick: function (S, row, slot, t) {
        if (!trueStart(row, t)) return false;
        var s = cyear(row, t); S.picks.forEach(function (q) { s += cyear(q.row, t); });
        return s + picksLeftAfter(S) <= 18; } },
    { id: "earn_it", name: "Earn It", base: "classic",
      blurb: "No 20-point scorer until you have drafted two players who score under 10.",
      pick: function (S, row, slot, t) {
        var I = t.IDX; if (row[I.ppg] < 20) return true;
        var n = 0; S.picks.forEach(function (q) { if (q.row[I.ppg] < 10) n++; });
        return n >= 2; } },
    { id: "rising_ceiling", name: "Rising Ceiling", base: "cap",
      blurb: "Pick one may cost $4M, pick two $8M, and so on up to $20M for pick five.",
      pick: function (S, row, slot, t) { var c = cost(S, row, t); return c == null || c <= 4 * (S.picks.length + 1); } },
    { id: "crossover", name: "Crossover", base: "cap",
      blurb: "After pick one, everyone must have played for a franchise you already drafted from.",
      pick: function (S, row, slot, t) {
        if (!S.picks.length) return true;
        var p = person(row, t); return !!p && S.picks.some(function (q) { return !!p.ten[q.fr]; }); } },
    { id: "pay_scale", name: "Pay Scale", base: "cap",
      blurb: "Pick one costs $10M or less, and everyone after must cost within $5M of him.",
      pick: function (S, row, slot, t) {
        var c = cost(S, row, t); if (c == null) return true;
        if (!S.picks.length) return c <= 10 && S.budget - c >= 4 * Math.max(1, c - 5);
        var p1 = S.picks[0].cost; if (Math.abs(c - p1) > 5) return false;
        return S.budget - c >= picksLeftAfter(S) * Math.max(1, p1 - 5); } },
    { id: "the_relay", name: "The Relay", base: "pro",
      blurb: "No stats. No two of your five were ever in the league at the same time.",
      pick: function (S, row, slot, t) {
        var me = person(row, t); if (!me) return false;
        var spans = [[me.first, me.last]];
        for (var i = 0; i < S.picks.length; i++) {
          var o = person(S.picks[i].row, t); if (!o) continue;
          if (me.first <= o.last && o.first <= me.last) return false;
          spans.push([o.first, o.last]);
        }
        // the open years must still hold the picks to come (two seasons a career, at least)
        var room = 0, run = 0;
        for (var y = 1974; y <= 2027; y++) {
          var used = y <= 2026 && spans.some(function (sp) { return y >= sp[0] && y <= sp[1]; });
          if (y <= 2026 && !used) run++; else { room += Math.floor(run / 2); run = 0; }
        }
        return room >= picksLeftAfter(S); } },
    { id: "overlap", name: "Overlap", base: "pro",
      blurb: "No stats. All five careers must share at least one season in the league.",
      pick: function (S, row, slot, t) {
        var me = person(row, t); if (!me) return false;
        var lo = me.first, hi = me.last;
        S.picks.forEach(function (q) { var o = person(q.row, t); if (o) { if (o.first > lo) lo = o.first; if (o.last < hi) hi = o.last; } });
        return lo <= hi; } },
    { id: "contenders", name: "Contenders", base: "cap",
      blurb: "Every pick from a team in the top third of the league that season.",
      filter: function (row, t) { return ix(t).STRONG.has(frOf(row, t) + "|" + row[t.IDX.season]); } },
    { id: "inside_out", name: "Inside Out", base: "pro",
      blurb: "No stats. Draft your center first, then both forwards, then both guards.",
      pick: function (S, row, slot, t) {
        if (slot === "F") return S.filled.C >= 1;
        if (slot === "G") return S.filled.C >= 1 && S.filled.F >= 2;
        return true; } },
    { id: "glass_bonus", name: "Board Money", base: "cap",
      blurb: "A roster that owns the glass earns 3 net. Elite rebounding pays today.",
      cfg: { GLASS_LOW: 99, GLASS_DIRE: 4.4, GLASS_TAX_DIRE: 0, GLASS_TAX_LOW: -3 } },
    { id: "wing_stoppers", name: "Wing Stoppers", base: "cap",
      blurb: "One of your forwards must be a real stopper or the wings cost up to 7. Guards guard nobody.",
      cfg: { FD_BOTTOM33: 1.5, FD_BOTTOM20: 0.5, WING_D_TAX_33: 4, WING_D_TAX_20: 7, BACKCOURT_D_TAX_20: 0, BACKCOURT_D_TAX_33: 0 } },
    { id: "last_stop", name: "Last Stop", base: "pro",
      blurb: "No stats. Every pick wears the jersey of the team he finished his career with.",
      filter: function (row, t) { var p = person(row, t), f = frOf(row, t); return !!(p && f && p.last <= 2025 && p.lastFrs[f]); } },
    { id: "career_high", name: "Career Year", base: "classic",
      blurb: "Every pick in his highest-scoring season. Peak points only.",
      filter: function (row, t) { var p = person(row, t); return !!p && row[t.IDX.ppg] >= p.maxPpg; } },

    /* ---- batch four ---- */
    { id: "usage_pyramid", name: "The Pyramid", base: "classic",
      blurb: "One player at 26 percent usage or more, two between 19 and 26, two under 19.",
      pick: function (S, row, slot, t) {
        var I = t.IDX, Q = [1, 2, 2], n = [0, 0, 0];
        function tier(r) { var u = r[I.usage]; return u >= 26 ? 0 : u >= 19 ? 1 : 2; }
        S.picks.forEach(function (q) { n[tier(q.row)]++; });
        return n[tier(row)] < Q[tier(row)]; } },
    { id: "no_mvps", name: "No MVPs", base: "cap",
      blurb: "Nobody who ever won an MVP. Thirty-three legends stay home.",
      filter: function (row, t) { return !MVPS[row[t.IDX.name]]; } },
    { id: "punt_defense", name: "Punt Defense", base: "classic",
      blurb: "Your five may total 5 steals plus blocks at most. The defense fines still count.",
      pick: function (S, row, slot, t) {
        var I = t.IDX, s = row[I.spg] + row[I.bpg];
        S.picks.forEach(function (p) { s += p.row[I.spg] + p.row[I.bpg]; });
        return s + picksLeftAfter(S) * 0.3 <= 5; } },
    { id: "double_dip", name: "Double Dip", base: "cap",
      blurb: "Boards come in pairs: picks 1 and 2 share a board, and so do picks 3 and 4.",
      deal: function (S) {
        var n = S.picks.length, p = last(S);
        return (n === 1 || n === 3) && p && p.fr ? { frs: [p.fr], decs: [p.dec] } : null; } },
    { id: "scorer_and_setter", name: "Scorer and Setter", base: "classic",
      blurb: "One guard averages 18 points, the other 6 assists. A classic backcourt.",
      pick: function (S, row, slot, t) {
        if (slot !== "G") return true;
        var I = t.IDX;
        function sc(r) { return r[I.ppg] >= 18; } function se(r) { return r[I.apg] >= 6; }
        if (!sc(row) && !se(row)) return false;
        var o = null; S.picks.forEach(function (q) { if (q.slot === "G") o = q.row; });
        return !o || (sc(row) && se(o)) || (se(row) && sc(o)); } },
    { id: "inside_outside", name: "Inside-Outside", base: "classic",
      blurb: "One forward is a floor spacer, the other averages 8 rebounds.",
      pick: function (S, row, slot, t) {
        if (slot !== "F") return true;
        var I = t.IDX;
        function out(r) { return r[I.sp] >= 1; } function ins(r) { return r[I.rpg] >= 8; }
        if (!out(row) && !ins(row)) return false;
        var o = null; S.picks.forEach(function (q) { if (q.slot === "F") o = q.row; });
        return !o || (out(row) && ins(o)) || (ins(row) && out(o)); } },
    { id: "name_twins", name: "Name Twins", base: "cap",
      blurb: "Two of your five must share a surname. Find the brothers, or the strangers.",
      pick: function (S, row, slot, t) {
        var X = ix(t), me = nameParts(row[t.IDX.name]).last;
        var lasts = S.picks.map(function (q) { return nameParts(q.row[t.IDX.name]).last; });
        for (var i = 0; i < lasts.length; i++) if (lasts.indexOf(lasts[i]) !== i) return true;
        if (lasts.indexOf(me) >= 0) return true;
        if (picksLeftAfter(S) === 0) return false;
        return lasts.concat([me]).some(function (f) { return (X.LAST[f] || 0) >= 8; }); } },
    { id: "spread_out", name: "Spread Out", base: "cap",
      blurb: "No two of your seasons may be within six years of each other.",
      pick: function (S, row, slot, t) {
        var s = row[t.IDX.season];
        return !S.picks.some(function (q) { return Math.abs(q.row[t.IDX.season] - s) < 7; }); } },
    { id: "upside_down", name: "Upside Down", base: "classic",
      blurb: "A guard must lead your five in rebounds. Pick bigs who leave him the boards.",
      pick: function (S, row, slot, t) {
        var I = t.IDX, g = [], fc = [];
        S.picks.forEach(function (q) { (q.slot === "G" ? g : fc).push(q.row[I.rpg]); });
        var gMax = g.length ? Math.max.apply(null, g) : 0, fcMax = fc.length ? Math.max.apply(null, fc) : 0, r = row[I.rpg];
        if (slot === "G") return g.length + 1 < 2 || Math.max(gMax, r) > fcMax;
        var gOpen = g.length < 2;
        return r < (gOpen ? Math.max(gMax, 7) : gMax); } },

    /* ---- batch five ---- */
    { id: "rookie_center", name: "Rookie Center", base: "classic",
      blurb: "Your center must be in his first or second season. The kid anchors it.",
      pick: function (S, row, slot, t) { return slot !== "C" || (trueStart(row, t) && cyear(row, t) <= 2); } },
    { id: "vet_guards", name: "Veteran Backcourt", base: "classic",
      blurb: "Both guards must be in their tenth season or later. Old heads run the show.",
      deal: function () { return { decs: [1990, 2000, 2010, 2020] }; },
      pick: function (S, row, slot, t) { return slot !== "G" || cyear(row, t) >= 10; } },
    { id: "ball_hawks", name: "Ball Hawks", base: "classic",
      blurb: "Both forwards must average 1.4 steals. Wings that jump passing lanes.",
      pick: function (S, row, slot, t) { return slot !== "F" || row[t.IDX.spg] >= 1.4; } },
    { id: "board_meeting", name: "Board Meeting", base: "classic",
      blurb: "Your five must combine for 45 rebounds a night. Every position crashes.",
      pick: function (S, row, slot, t) {
        var I = t.IDX, s = row[I.rpg]; S.picks.forEach(function (p) { s += p.row[I.rpg]; });
        var open = { G: 2 - S.filled.G, F: 2 - S.filled.F, C: 1 - S.filled.C }; open[slot]--;
        return s + open.G * 8 + open.F * 11 + open.C * 13 >= 45; } },
    { id: "starters", name: "Starters Only", base: "classic",
      blurb: "Every pick ranked top three in minutes on his team that season.",
      filter: function (row, t) {
        var r = ix(t).MRANK.get(pk(row, t) + "|" + frOf(row, t) + "|" + row[t.IDX.season]);
        return !!r && r <= 3; } },
    { id: "second_act", name: "Second Act", base: "pro",
      blurb: "No stats. Nobody wearing the jersey of the team he started with.",
      deal: function () { return { decs: [1980, 1990, 2000, 2010, 2020] }; },
      filter: function (row, t) { var p = person(row, t), f = frOf(row, t); return !!(p && f && p.first > 1974 && !p.firstFrs[f]); } },
    { id: "journeymen", name: "Journeymen", base: "cap",
      blurb: "Every pick played for five or more franchises in his career.",
      filter: function (row, t) { var p = person(row, t); return !!p && p.frs.length >= 5; } },
    { id: "unsung", name: "Unsung", base: "classic",
      blurb: "Nobody who finished top 50 in scoring that season. Impact without the headlines.",
      filter: function (row, t) { return !((ix(t).PPGRANK.get(pk(row, t) + "|" + row[t.IDX.season]) || 999) <= 50); } },
    { id: "pick_and_roll", name: "Pick and Roll", base: "cap",
      blurb: "Your center must have been a teammate of at least one of your guards.",
      pick: function (S, row, slot, t) {
        var me = person(row, t); if (!me) return false;
        var I = t.IDX, gs = [], cRow = null;
        S.picks.forEach(function (q) { if (q.slot === "G") gs.push(q.row); if (q.slot === "C") cRow = q.row; });
        function mate(a, b) { var x = person(a, t), y = person(b, t); return !!(x && y && teammates(x, y)); }
        if (slot === "C") { if (gs.length < 2) return true; return gs.some(function (g) { return mate(row, g); }); }
        if (slot === "G" && cRow) { if (gs.length === 0) return true; return mate(row, cRow) || mate(gs[0], cRow); }
        return true; } },
    { id: "long_names", name: "Long Names", base: "cap",
      blurb: "Your five surnames must total 36 letters or more. Long names only.",
      pick: function (S, row, slot, t) {
        var s = nameParts(row[t.IDX.name]).last.length;
        S.picks.forEach(function (q) { s += nameParts(q.row[t.IDX.name]).last.length; });
        return s + picksLeftAfter(S) * 12 >= 36; } },
    { id: "unique_names", name: "One of a Kind", base: "pro",
      blurb: "No stats. Only surnames no other NBA player has ever worn.",
      filter: function (row, t) { return (ix(t).LAST[nameParts(row[t.IDX.name]).last] || 0) === 1; } },
    { id: "pecking_order", name: "Pecking Order", base: "classic",
      blurb: "No two of your five may score within 3 points of each other.",
      pick: function (S, row, slot, t) {
        var v = row[t.IDX.ppg]; return !S.picks.some(function (q) { return Math.abs(q.row[t.IDX.ppg] - v) < 3; }); } },
    { id: "shootout", name: "Shootout", base: "classic",
      blurb: "Every defense fine is off, but you need five shooters or pay 2.5 each.",
      cfg: { BACKCOURT_D_TAX_20: 0, BACKCOURT_D_TAX_33: 0, WING_D_TAX_20: 0, WING_D_TAX_33: 0, RIM_D_TAX: 0,
             SPACERS_REQ: 5, SPACING_TAX: 2.5 } },
    { id: "two_way_alphas", name: "Two-Way Alphas", base: "cap",
      blurb: "The usage tax is off and every defense fine doubles. Stars who defend.",
      cfg: { USAGE_RATE: 0, BACKCOURT_D_TAX_20: 6, BACKCOURT_D_TAX_33: 4, WING_D_TAX_20: 6, WING_D_TAX_33: 4, RIM_D_TAX: 4, LBL_STICK_TAX: 0 } },
    { id: "unicorn_hunt", name: "Unicorn Hunt", base: "classic",
      blurb: "Modern boards. You need four shooters and a +2 rim protector up front, or pay.",
      deal: function () { return { decs: [2010, 2020] }; },
      cfg: { SPACERS_REQ: 4, SPACING_TAX: 2.5, RIM_TOP20: 2, RIM_D_TAX: 4 } },
    { id: "full_house", name: "Full House", base: "classic",
      blurb: "Three picks from one season and two from another. Poker rules, year menu.",
      pick: function (S, row, slot, t) {                 // at most two seasons, at most three picks in either: five picks make 3 + 2
        var I = t.IDX, cnt = {}; S.picks.forEach(function (q) { var s = q.row[I.season]; cnt[s] = (cnt[s] || 0) + 1; });
        var s = row[I.season]; cnt[s] = (cnt[s] || 0) + 1;
        var keys = Object.keys(cnt);
        return keys.length <= 2 && keys.every(function (k) { return cnt[k] <= 3; }); },
      deal: function (S, t) {
        if (!S.picks.length) return null;
        var I = t.IDX, decs = {}; S.picks.forEach(function (q) { decs[Math.floor(q.row[I.season] / 10) * 10] = 1; });
        var seasons = {}; S.picks.forEach(function (q) { seasons[q.row[I.season]] = 1; });
        return Object.keys(seasons).length >= 2 ? { decs: Object.keys(decs).map(Number) } : null; } },

    /* ---- batch six ---- */
    { id: "stretch_fours", name: "Stretch Fours", base: "cap",
      blurb: "Both forwards must be floor spacers. Every four stretches the floor.",
      pick: function (S, row, slot, t) { return slot !== "F" || spacer(row, t); } },
    { id: "glass_season", name: "Glass Season", base: "classic",
      blurb: "Every pick in the season he grabbed the most rebounds of his career.",
      filter: function (row, t) { var p = person(row, t); return !!p && row[t.IDX.rpg] >= p.maxRpg; } },
    { id: "so_close", name: "So Close", base: "classic",
      blurb: "Every pick from the team that lost the Finals that season.",
      filter: function (row, t) { return RUNNERS[row[t.IDX.season]] === frOf(row, t); } },
    { id: "ball_hogs", name: "Ball Hogs", base: "classic",
      blurb: "Your five must use 125 percent of plays or more. The usage tax is guaranteed. Make it worth it.",
      pick: function (S, row, slot, t) {
        var I = t.IDX, s = row[I.usage]; S.picks.forEach(function (p) { s += p.row[I.usage]; });
        return s + picksLeftAfter(S) * 33 >= 125; } },
    { id: "lifers", name: "Lifers", base: "pro",
      blurb: "No stats. Your guards and forwards spent their whole careers with one franchise. The center is free.",
      pick: function (S, row, slot, t) { var p = person(row, t); return slot === "C" || (!!p && p.frs.length === 1); } },
    { id: "deadline_deals", name: "Deadline Deals", base: "classic",
      blurb: "Your guards and forwards were traded mid-season that year. The center is free.",
      pick: function (S, row, slot, t) {
        if (slot === "C") return true;
        var p = person(row, t), f = frOf(row, t), s = row[t.IDX.season]; if (!p || !f) return false;
        for (var g in p.ten) if (g !== f && p.ten[g][s]) return true;
        return false; } },
    { id: "top_shelf", name: "Top Shelf", base: "cap",
      blurb: "Two of your first four picks must cost $12M or more. Buy two stars early, then scramble.",
      pick: function (S, row, slot, t) {                 // both stars by pick four, so the last board is never a forced buy
        var c = cost(S, row, t); if (c == null) return true;
        var n = c >= 12 ? 1 : 0; S.picks.forEach(function (q) { if (q.cost >= 12) n++; });
        var need = Math.max(0, 2 - n), left = picksLeftAfter(S);
        return need <= Math.max(0, left - 1) && S.budget - c >= need * 12 + (left - need); } },
    { id: "alphabet_split", name: "Alphabet Split", base: "pro",
      blurb: "No stats. Guards' surnames start A through M. Forwards and center, N through Z.",
      pick: function (S, row, slot, t) {
        var L = nameParts(row[t.IDX.name]).last.charAt(0);
        return slot === "G" ? L >= "a" && L <= "m" : L >= "n" && L <= "z"; } },

    /* ---- batch seven ---- */
    { id: "graybeards", name: "Graybeards", base: "classic",
      blurb: "Add up the career seasons of your five picks: 45 or more. Experience wins.",
      deal: function () { return { decs: [1990, 2000, 2010, 2020] }; },
      pick: function (S, row, slot, t) {
        var s = cyear(row, t); S.picks.forEach(function (q) { s += cyear(q.row, t); });
        return s + picksLeftAfter(S) * 18 >= 45; } },
    { id: "the_decline", name: "The Decline", base: "classic",
      blurb: "Your guards and forwards in a season when their scoring fell 3 points. The center is free.",
      pick: function (S, row, slot, t) {
        if (slot === "C") return true;
        var p = person(row, t), I = t.IDX; if (!p) return false;
        var prev = p.ppg[row[I.season] - 1]; return prev != null && prev - row[I.ppg] >= 3; } },
    { id: "early_bloomers", name: "Early Bloomers", base: "classic",
      blurb: "Your guards and forwards averaged 15 points by their second season. The center is free.",
      pick: function (S, row, slot, t) {
        if (slot === "C") return true;
        var p = person(row, t); return !!p && p.first > 1974 && !!p.first15 && p.first15 - p.first <= 1; } },
    { id: "the_point", name: "The Point", base: "classic",
      blurb: "Pick one is a guard with 4 or more assists, and nobody after him may average more.",
      pick: function (S, row, slot, t) {
        if (!S.picks.length) return slot === "G" && row[t.IDX.apg] >= 4;
        return row[t.IDX.apg] <= S.picks[0].row[t.IDX.apg]; } },
    { id: "minimum_center", name: "Minimum Center", base: "cap",
      blurb: "Your center costs $2M or less. Spend on everyone else.",
      pick: function (S, row, slot, t) { var c = cost(S, row, t); return slot !== "C" || c == null || c <= 2; } },
    { id: "play_small", name: "Play Small", base: "pro",
      blurb: "No stats. Every player plays the smallest position he ever played.",
      pick: function (S, row, slot, t) {
        var p = person(row, t), b = p ? p.bk : {};
        return slot === (b.G ? "G" : b.F ? "F" : "C"); } },
    { id: "millennium_men", name: "Millennium Men", base: "pro",
      blurb: "No stats. 1990s and 2000s boards, and only players whose careers crossed into 2000.",
      deal: function () { return { decs: [1990, 2000] }; },
      filter: function (row, t) { var p = person(row, t); return !!p && p.first <= 1999 && p.last >= 2001; } },
    { id: "east_meets_west", name: "East Meets West", base: "cap",
      blurb: "Guards from Eastern franchises, forwards from Western ones. The center can come from anywhere.",
      pick: function (S, row, slot, t) {
        if (slot === "C") return true;
        var f = frOf(row, t); return slot === "G" ? !!EAST[f] : !!f && !EAST[f]; } },
    { id: "old_guard", name: "Old Guard", base: "classic",
      blurb: "Guards from before 1995, forwards from 2005 on. The center can come from any era.",
      pick: function (S, row, slot, t) {
        if (slot === "C") return true;
        var s = row[t.IDX.season]; return slot === "G" ? s < 1995 : s >= 2005; } },
    { id: "the_prequel", name: "The Prequel", base: "classic",
      blurb: "Every pick in the season right before his highest-scoring season.",
      filter: function (row, t) {
        var p = person(row, t), nxt = p ? p.ppg[row[t.IDX.season] + 1] : null;
        return nxt != null && nxt >= p.maxPpg; } },
    { id: "scoring_relay", name: "Scoring Relay", base: "classic",
      blurb: "Each pick must score within 4 points of the pick before him.",
      pick: function (S, row, slot, t) { var p = last(S); return !p || Math.abs(row[t.IDX.ppg] - p.row[t.IDX.ppg]) <= 4; } },
    { id: "season_relay", name: "Season Relay", base: "cap",
      blurb: "Each pick's season must be within three years of the pick before him.",
      pick: function (S, row, slot, t) { var p = last(S); return !p || Math.abs(row[t.IDX.season] - p.row[t.IDX.season]) <= 3; },
      deal: function (S, t) {
        var p = last(S); if (!p) return null;
        var s = p.row[t.IDX.season];
        return { decs: t.DECADES.filter(function (d) { return d + 9 >= s - 3 && d <= s + 3; }) }; } },
    { id: "middle_man", name: "The Middle Man", base: "classic",
      blurb: "Your first pick is your median scorer: two picks score more, two score less.",
      pick: function (S, row, slot, t) {
        var I = t.IDX, v = row[I.ppg];
        if (!S.picks.length) return true;
        var p1 = S.picks[0].row[I.ppg], hi = 0, lo = 0;
        for (var i = 1; i < S.picks.length; i++) { if (S.picks[i].row[I.ppg] > p1) hi++; else if (S.picks[i].row[I.ppg] < p1) lo++; }
        if (v === p1) return false;
        if (v > p1) hi++; else lo++;
        return hi <= 2 && lo <= 2; } },

    /* ---- batch eight ---- */
    { id: "high_low", name: "High-Low", base: "cap",
      blurb: "One guard costs $10M or more, the other $2M or less.",
      pick: function (S, row, slot, t) {
        var c = cost(S, row, t); if (c == null) return true;
        var hasHigh = false, hasLow = false;
        S.picks.forEach(function (q) { if (q.slot === "G") { if (q.cost >= 10) hasHigh = true; else hasLow = true; } });
        var keep = S.budget - c >= 10 + (picksLeftAfter(S) - 1);   // $10M stays banked for the high guard still to come
        if (slot === "G") {
          if (c > 2 && c < 10) return false;
          if (c >= 10) return !hasHigh;
          return !hasLow && (hasHigh || keep);
        }
        return hasHigh || S.filled.G >= 2 || keep; } },
    { id: "mentorship", name: "Mentorship", base: "classic",
      blurb: "Each guard pair and forward pair: one player in his first three seasons, one in his tenth or later.",
      deal: function () { return { decs: [1990, 2000, 2010, 2020] }; },
      pick: function (S, row, slot, t) {
        if (slot === "C") return true;
        var y = cyear(row, t), kid = trueStart(row, t) && y <= 3, vet = y >= 10;
        if (!kid && !vet) return false;
        var o = null; S.picks.forEach(function (q) { if (q.slot === slot) o = q; });
        if (!o) return true;
        var oy = cyear(o.row, t), oKid = trueStart(o.row, t) && oy <= 3;
        return kid ? !oKid : oKid; } },
    { id: "hub_center", name: "Hub Center", base: "classic",
      blurb: "Your center must lead your five in assists. The offense runs through the middle.",
      pick: function (S, row, slot, t) {
        var I = t.IDX, cA = null, other = 0;
        S.picks.forEach(function (q) { if (q.slot === "C") cA = q.row[I.apg]; else if (q.row[I.apg] > other) other = q.row[I.apg]; });
        if (slot === "C") return row[I.apg] > other;
        return cA == null ? row[I.apg] < 3 : row[I.apg] < cA; } },   // until the center is in, nobody else reaches 3
    { id: "headline_acts", name: "Headline Acts", base: "classic",
      blurb: "Every pick finished top 80 in scoring that season. Scorers only.",
      filter: function (row, t) { return (ix(t).PPGRANK.get(pk(row, t) + "|" + row[t.IDX.season]) || 999) <= 80; } },
    { id: "opening_steal", name: "Opening Steal", base: "cap",
      blurb: "Your first pick must cost $1M. Find the steal, then spend.",
      pick: function (S, row, slot, t) { var c = cost(S, row, t); return S.picks.length > 0 || c == null || c <= 1; } },
    { id: "no_middle", name: "Barbell", base: "cap",
      blurb: "Every price is $3M or less, or $12M or more. Nothing in between.",
      pick: function (S, row, slot, t) { var c = cost(S, row, t); return c == null || c <= 3 || c >= 12; } },
    { id: "new_guard", name: "New Guard", base: "classic",
      blurb: "Guards from 2010 on, forwards from before 2000. The center can come from any era.",
      pick: function (S, row, slot, t) {
        if (slot === "C") return true;
        var s = row[t.IDX.season]; return slot === "G" ? s >= 2010 : s < 2000; } },

    /* ---- batch nine ---- */
    { id: "frontcourt_mates", name: "Frontcourt Mates", base: "cap",
      blurb: "Your two forwards must have been teammates at some point in their careers.",
      pick: function (S, row, slot, t) {
        if (slot !== "F") return true;
        var me = person(row, t), other = null;
        S.picks.forEach(function (q) { if (q.slot === "F") other = q; });
        if (!other) return true;
        var o = person(other.row, t); return !!(me && o && teammates(me, o)); } },
    { id: "jewelry", name: "Jewelry", base: "cap",
      blurb: "Your guards and forwards must own a ring from some point in their careers. The center is free.",
      pick: function (S, row, slot, t) {
        if (slot === "C") return true;
        var p = person(row, t); if (!p) return false;
        for (var k in p.keys) { var bar = k.lastIndexOf("|"); if (TITLES[+k.slice(bar + 1)] === k.slice(0, bar)) return true; }
        return false; } },
    { id: "zigzag", name: "Zigzag", base: "pro",
      blurb: "No stats. Big, guard, big, guard, big: your picks alternate, starting with a forward or center.",
      pick: function (S, row, slot, t) {                 // two guard slots and three big ones only alternate as big-guard-big-guard-big
        var p = last(S); if (!p) return slot !== "G";
        return (slot === "G") !== (p.slot === "G"); } },
    { id: "parting_shot", name: "Parting Shot", base: "classic",
      blurb: "Every pick in his last season with that franchise before he moved to another.",
      filter: function (row, t) {
        var p = person(row, t), f = frOf(row, t), s = row[t.IDX.season]; if (!p || !f || !p.ten[f]) return false;
        var lastWith = 0; for (var y in p.ten[f]) if (+y > lastWith) lastWith = +y;
        if (s !== lastWith) return false;
        for (var g in p.ten) if (g !== f) for (var z in p.ten[g]) if (+z > s) return true;
        return false; } },
    { id: "the_chain", name: "The Chain", base: "pro",
      blurb: "No stats. Each pick must have been a teammate of the pick right before him.",
      pick: function (S, row, slot, t) {
        var p = last(S); if (!p) return true;
        var me = person(row, t), o = person(p.row, t); return !!(me && o && teammates(me, o)); },
      deal: function (S, t) {
        var p = last(S); if (!p) return null;
        var o = person(p.row, t); return o ? { frs: o.frs } : null; } },

    /* ---- the market: six boards on the new price(row,t) hook (sim-core prices, UI and engine agree) ---- */
    { id: "shooter_premium", name: "Shooter Premium", base: "cap",
      blurb: "The market prices spacing now: every floor spacer costs 50 percent more.",
      price: function (row, t) { return spacer(row, t) ? 1.5 : 1; } },
    { id: "big_man_sale", name: "Big Man Sale", base: "cap",
      blurb: "Anyone who can play center is half price today. Stock the paint.",
      price: function (row, t) { var p = person(row, t); return p && p.bk.C ? 0.5 : 1; } },
    { id: "nostalgia_sale", name: "Nostalgia Sale", base: "cap",
      blurb: "Every season before 1990 is half price. The past is on clearance.",
      price: function (row, t) { return row[t.IDX.season] < 1990 ? 0.5 : 1; } },
    { id: "rookie_discount", name: "Rookie Discount", base: "cap",
      blurb: "Players in their first three seasons are half price. Rookie deals, literally.",
      price: function (row, t) { return trueStart(row, t) && cyear(row, t) <= 3 ? 0.5 : 1; } },
    { id: "ring_tax", name: "Ring Tax", base: "cap",
      blurb: "Anyone on that season's title team costs double. Champions are expensive.",
      price: function (row, t) { return TITLES[row[t.IDX.season]] === frOf(row, t) ? 2 : 1; } },
    { id: "bird_rights", name: "Bird Rights", base: "cap",
      blurb: "Anyone wearing the jersey of the team he started with is half price. Homegrown stars come cheap.",
      price: function (row, t) { var p = person(row, t), f = frOf(row, t); return p && f && p.first > 1974 && p.firstFrs[f] ? 0.5 : 1; } },

    /* ---- batch ten: last cousins, each aimed at a different player ---- */
    { id: "treadmill", name: "The Treadmill", base: "classic",
      blurb: "Every pick from a team in the middle third of the league that season. Not good, not bad.",
      filter: function (row, t) { var X = ix(t), k = frOf(row, t) + "|" + row[t.IDX.season]; return !X.WEAK.has(k) && !X.STRONG.has(k); } },
    { id: "finishers", name: "Finishers", base: "classic",
      blurb: "Both forwards average 1.5 assists or fewer. They catch and score, nothing else.",
      pick: function (S, row, slot, t) { return slot !== "F" || row[t.IDX.apg] <= 1.5; } },
    { id: "scoring_tiers", name: "Scoring Tiers", base: "classic",
      blurb: "One pick scores 22 or more, two score 12 to 22, two score under 12.",
      pick: function (S, row, slot, t) {
        var I = t.IDX, Q = [1, 2, 2], n = [0, 0, 0];
        function tier(r) { var v = r[I.ppg]; return v >= 22 ? 0 : v >= 12 ? 1 : 2; }
        S.picks.forEach(function (q) { n[tier(q.row)]++; });
        return n[tier(row)] < Q[tier(row)]; } },
    { id: "young_legs", name: "Young Legs", base: "classic",
      blurb: "Both forwards must be in their first or second season.",
      pick: function (S, row, slot, t) { return slot !== "F" || (trueStart(row, t) && cyear(row, t) <= 2); } },
    { id: "share_evenly", name: "Share Evenly", base: "classic",
      blurb: "All five must average within 3 assists of each other. No lone point guard.",
      pick: function (S, row, slot, t) {
        var I = t.IDX, lo = row[I.apg], hi = row[I.apg];
        S.picks.forEach(function (p) { var v = p.row[I.apg]; if (v < lo) lo = v; if (v > hi) hi = v; });
        return hi - lo <= 3; } },
    { id: "swat_season", name: "Swat Season", base: "classic",
      blurb: "Every pick in the season he blocked the most shots of his career.",
      filter: function (row, t) { var p = person(row, t); return !!p && row[t.IDX.bpg] >= p.maxBpg; } },
    { id: "era_pairs", name: "Era Pairs", base: "cap",
      blurb: "Your guards come from one decade, your forwards from another. The center is free.",
      pick: function (S, row, slot, t) {
        if (slot === "C") return true;
        var d = decOf(row, t), same = null, other = null;
        S.picks.forEach(function (q) { if (q.slot === slot) same = decOf(q.row, t); else if (q.slot !== "C") other = decOf(q.row, t); });
        if (same != null) return d === same;
        return other == null || d !== other; } },

    /* ---- batch eleven: fresh targets for the slots the duplicate check emptied ---- */
    { id: "defense_first", name: "Defense First", base: "classic",
      blurb: "Your five's defensive ratings must add up to at least their offensive ratings. Stoppers carry the stars.",
      pick: function (S, row, slot, t) {                 // open slots are credited a 90th-percentile defensive tilt, so the last pick never starves
        var I = t.IDX, s = row[I.dbpm] - row[I.obpm];
        S.picks.forEach(function (q) { s += q.row[I.dbpm] - q.row[I.obpm]; });
        var open = { G: 2 - S.filled.G, F: 2 - S.filled.F, C: 1 - S.filled.C }; open[slot]--;
        return s + open.G * 2.8 + open.F * 3 + open.C * 3.4 >= 0; } },
    { id: "salary_match", name: "Matching Contracts", base: "cap",
      blurb: "Your guards share a price band, and so do your forwards: $1-3M, $4-7M, $8-12M or $13M and up.",
      pick: function (S, row, slot, t) {
        var c = cost(S, row, t); if (c == null) return true;
        function band(x) { return x <= 3 ? 0 : x <= 7 ? 1 : x <= 12 ? 2 : 3; }
        var FLOOR = [1, 4, 8, 13];
        var mate = null; S.picks.forEach(function (q) { if (q.slot === slot) mate = q; });
        if (slot !== "C" && mate && mate.cost != null && band(c) !== band(mate.cost)) return false;
        // money the open slots still need: an unmatched guard or forward's partner costs at least his band's floor
        var need = 0, open = { G: 2 - S.filled.G, F: 2 - S.filled.F, C: 1 - S.filled.C }; open[slot]--;
        ["G", "F"].forEach(function (b) {
          var have = null; S.picks.forEach(function (q) { if (q.slot === b) have = q.cost; });
          if (b === slot && have == null) have = c;
          need += (open[b] === 1 && have != null) ? FLOOR[band(have)] : open[b];
        });
        return S.budget - c >= need + open.C; } },
    { id: "pay_the_backcourt", name: "Guards Get Paid", base: "cap",
      blurb: "Your two guards must be your two most expensive players. Nobody else may cost more than either.",
      pick: function (S, row, slot, t) {
        var c = cost(S, row, t); if (c == null) return true;
        var g = [], o = []; S.picks.forEach(function (q) { (q.slot === "G" ? g : o).push(q.cost); });
        (slot === "G" ? g : o).push(c);
        var minG = g.length ? Math.min.apply(null, g) : 99, maxO = o.length ? Math.max.apply(null, o) : 0;
        if (maxO > minG) return false;
        // each open guard slot must still afford a guard at least as pricey as the costliest forward or center
        return S.budget - c >= (2 - g.length) * Math.max(1, maxO) + (3 - o.length); } },
    { id: "mvp_club", name: "MVP Club", base: "cap",
      blurb: "Two of your five must be MVP winners. Any season of theirs counts, even the cheap ones.",
      pick: function (S, row, slot, t) {
        var I = t.IDX, n = MVPS[row[I.name]] ? 1 : 0;
        S.picks.forEach(function (q) { if (MVPS[q.row[I.name]]) n++; });
        return 2 - n <= picksLeftAfter(S); } },
    { id: "late_bloomers", name: "Late Bloomers", base: "classic",
      blurb: "Your guards and forwards first scored 15 a night in their fourth season or later. The center is free.",
      pick: function (S, row, slot, t) {
        if (slot === "C") return true;
        var p = person(row, t); return !!p && p.first > 1974 && !!p.first15 && p.first15 - p.first >= 3; } },
    { id: "draft_class", name: "Draft Class", base: "pro",
      blurb: "No stats. Everyone must have debuted within one season of your first pick. One class, five careers.",
      pick: function (S, row, slot, t) {
        var me = person(row, t); if (!me || me.first <= 1974) return false;   // careers older than the data have no known debut
        if (!S.picks.length) return true;
        var p1 = person(S.picks[0].row, t); return !!p1 && Math.abs(me.first - p1.first) <= 1; },
      deal: function (S, t) {
        if (!S.picks.length) return null;
        var p1 = person(S.picks[0].row, t); return p1 ? { decs: cohortDecs(t, p1.first) } : null; } },

    /* ═══════════ THE SPECIAL DAYS (v66): one-off boards pinned to a date by daily-core.js OVERRIDES, never in a
       rotation: the season's first three nights, each dealing only the franchises in that night's national games (the
       owner: "to match the IRL" games). Every round deals their STAR ERAS (first-timers "excited to be drafting stars"
       they know): a ticket makes that list when a casual fan knows at least two of its names, or one megastar with
       real help. v66.4 (the owner: "so easy that I think everyone is going to have the exact same team"): rounds 2 and
       3 may also deal a DEEP CUT, a lesser era of the same franchises hiding a great player casual fans do not know,
       and the day's chosen path (daily-core SEED_OVERRIDES) carries exactly one. A player digs for the gem, takes the
       famous name and pays for it, or skips, and a skip re-rolls every later ticket, so the crowd's paths split; a
       second team skip on these days. The lists: sim-core allow.pairs (the deal and both skips obey it). ═══════════ */
    { id: "opening_night", name: "Opening Night", base: "classic",
      blurb: "The six franchises playing on opening night, in their star eras, with one deep cut: Celtics, Pistons, 76ers, Knicks, Thunder, Spurs.",
      reelFrs: ["CELTICS", "PISTONS", "76ERS", "KNICKS", "THUNDER", "SPURS"],   // the ticket reel spins only these
      reelDecs: [1970, 1980, 1990, 2000, 2010, 2020],
      sortMode: "obpm",   // the list opens on OBPM, so each ticket's stars lead it (by minutes, KG was 13th on the opener)
      cfg: { TEAM_SKIPS: 2 },
      deal: specialDeal(["CELTICS", "PISTONS", "76ERS", "KNICKS", "THUNDER", "SPURS"], [
        "CELTICS|1980", "CELTICS|2000", "CELTICS|2010", "CELTICS|2020",        // Bird and McHale; KG, Pierce, Allen; Kyrie, IT; Tatum
        "PISTONS|1980", "PISTONS|1990", "PISTONS|2000",                          // the Bad Boys; Grant Hill; Billups and the Wallaces
        "76ERS|1980", "76ERS|1990", "76ERS|2000", "76ERS|2010", "76ERS|2020",  // Barkley, Moses, Dr. J; Iverson; Embiid, Simmons, Maxey
        "KNICKS|1980", "KNICKS|1990", "KNICKS|2010", "KNICKS|2020",            // Ewing, Bernard King; Ewing's Knicks; Melo; Brunson
        "THUNDER|1990", "THUNDER|2000", "THUNDER|2010", "THUNDER|2020",        // Payton and Kemp; Ray Allen; KD, Russ, Harden; SGA
        "SPURS|1990", "SPURS|2000", "SPURS|2010", "SPURS|2020"], [             // Robinson; Duncan, Parker, Manu; Kawhi; Wemby
        "SPURS|1980",     // Alvin Robertson, the gem, over George Gervin
        "THUNDER|1980",   // the Sonics of Jack Sikma, Gus Williams, Dennis Johnson
        "KNICKS|1970",    // Walt Frazier
        "PISTONS|1970"]) },   // Bob Lanier
    { id: "doubleheader", name: "Doubleheader", base: "classic",
      blurb: "The four franchises in the second night's doubleheader, in their star eras, with one deep cut: Timberwolves, Heat, Warriors, Lakers.",
      reelFrs: ["TIMBERWOLVES", "HEAT", "WARRIORS", "LAKERS"],
      reelDecs: [1970, 1980, 1990, 2000, 2010, 2020],
      sortMode: "obpm",
      cfg: { TEAM_SKIPS: 2 },
      deal: specialDeal(["TIMBERWOLVES", "HEAT", "WARRIORS", "LAKERS"], [
        "TIMBERWOLVES|2000", "TIMBERWOLVES|2010", "TIMBERWOLVES|2020",         // KG's MVP team; Love, Butler, Towns; Anthony Edwards
        "HEAT|2000", "HEAT|2010", "HEAT|2020",                                 // Wade, Shaq, Mourning; LeBron, Wade, Bosh; Butler, Bam
        "WARRIORS|1990", "WARRIORS|2010", "WARRIORS|2020",                     // Run TMC, Webber; Curry, Durant, Klay, Draymond; Curry
        "LAKERS|1980", "LAKERS|1990", "LAKERS|2000", "LAKERS|2010", "LAKERS|2020"], [   // Magic, Kareem; Shaq, Kobe; LeBron; Luka, AD
        "WARRIORS|1980",       // Sleepy Floyd, the gem, over Chris Mullin
        "TIMBERWOLVES|1990",   // a young Kevin Garnett
        "WARRIORS|2000",       // Baron Davis's We Believe Warriors
        "WARRIORS|1970"]) },   // Rick Barry
    { id: "primetime", name: "Primetime", base: "classic",
      blurb: "The four franchises on the primetime slate, in their star eras, with one deep cut: Cavaliers, 76ers, Nuggets, Thunder.",
      reelFrs: ["CAVALIERS", "76ERS", "NUGGETS", "THUNDER"],
      reelDecs: [1970, 1980, 1990, 2000, 2010, 2020],
      sortMode: "obpm",
      cfg: { TEAM_SKIPS: 2 },
      deal: specialDeal(["CAVALIERS", "76ERS", "NUGGETS", "THUNDER"], [
        "CAVALIERS|2000", "CAVALIERS|2010", "CAVALIERS|2020",                    // LeBron; LeBron, Kyrie, Love; Mitchell, Mobley
        "76ERS|1980", "76ERS|1990", "76ERS|2000", "76ERS|2010", "76ERS|2020",  // Barkley, Moses, Dr. J; Iverson; Embiid, Simmons, Maxey
        "NUGGETS|2000", "NUGGETS|2010", "NUGGETS|2020",                          // Melo, Iverson, Billups; Jokic, Melo; Jokic, Murray
        "THUNDER|1990", "THUNDER|2000", "THUNDER|2010", "THUNDER|2020"], [     // Payton and Kemp; Ray Allen; KD, Russ, Harden; SGA
        "NUGGETS|1980",     // Fat Lever, the gem, over Alex English
        "CAVALIERS|1990",   // Terrell Brandon over Mark Price
        "CAVALIERS|1980",   // Larry Nance, Ron Harper, Mark Price
        "NUGGETS|1990",     // Dikembe Mutombo, Michael Adams
        "NUGGETS|1970",     // Bobby Jones, the gem, over David Thompson
        "CAVALIERS|1970",   // a bare one: skip it or find Jim Brewer
        "THUNDER|1970"]) }  // the Sonics of Gus Williams and Dennis Johnson
  ];

  var byId = {};
  CHALLENGES.forEach(function (c) { byId[c.id] = c; });

  // ISO-8601 week (UTC). The ISO year can differ from the calendar year at the edges.
  function isoWeek(date) {
    var d = date ? new Date(date.getTime ? date.getTime() : date) : new Date();
    var t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    var day = (t.getUTCDay() + 6) % 7;
    t.setUTCDate(t.getUTCDate() - day + 3);
    var isoYear = t.getUTCFullYear();
    var jan4 = new Date(Date.UTC(isoYear, 0, 4));
    var week = 1 + Math.round(((t - jan4) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
    return { year: isoYear, week: week };
  }
  function weekKey(date) {
    var w = isoWeek(date);
    return w.year + "-W" + (w.week < 10 ? "0" : "") + w.week;
  }
  function weeklyFor(date) {
    // FROZEN 2026-07-18: the modulus is pinned to the manifest's size on that
    // date (98), so append-only additions never reshuffle the weekly schedule.
    // BROKEN_WEEKLY: ids the playability audit proved dead or degenerate
    // (99% unfinishable, or 1-2 draftable players per board). Weeks that land
    // on one step deterministically forward; those weeks were unplayable
    // anyway, so no real schedule is being rewritten.
    var WEEKLY_FROZEN_N = 98;
    var BROKEN_WEEKLY = { classmates: 1, escalator: 1, the_anchor: 1, tall_wings: 1,
      superteam: 1, volume_scorers: 1, role_players: 1, pickpockets: 1, swat_team: 1,
      dime_store: 1, glass_cleaners: 1, iron_men: 1, green_light: 1, humble_pie: 1 };
    var w = isoWeek(date);
    var idx = (w.year * 53 + w.week) % WEEKLY_FROZEN_N;
    var guard = 0;
    while (BROKEN_WEEKLY[CHALLENGES[idx].id] && guard++ < WEEKLY_FROZEN_N) idx = (idx + 1) % WEEKLY_FROZEN_N;
    return { key: weekKey(date), ch: CHALLENGES[idx] };
  }
  // seconds until the next ISO week rollover (Monday 00:00 UTC)
  function weekEndsInS(now) {
    var d = now ? new Date(now) : new Date();
    var day = (d.getUTCDay() + 6) % 7;
    var next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + (7 - day));
    return Math.max(0, Math.floor((next - d.getTime()) / 1000));
  }

  var API = { CHALLENGES: CHALLENGES, byId: byId, isoWeek: isoWeek,
    weekKey: weekKey, weeklyFor: weeklyFor, weekEndsInS: weekEndsInS };
  g.T82CH = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof globalThis !== "undefined" ? globalThis : this);
