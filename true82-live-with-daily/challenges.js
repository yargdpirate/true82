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
   SPACERS_REQ, GD_/FD_BOTTOM10/25, BACKCOURT_/WING_D_TAX_10/25).
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
      blurb: "Usage overage taxed at nearly triple rate. Your stars cost twice — once in dollars, once in shots.",
      cfg: { USAGE_RATE: 0.4 } },
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
      blurb: "Usage budget slashed to 85. Share the damn ball or the engine shares your losses.",
      cfg: { USAGE_BUDGET: 85 } },
    { id: "iso_week", name: "Iso Week", base: "classic",
      blurb: "The usage tax is OFF. Five alphas, one ball, zero consequences. History's most toxic lineups are legal.",
      cfg: { USAGE_RATE: 0 } },
    { id: "heliocentric", name: "Heliocentrism", base: "classic",
      blurb: "Usage budget 130, tax nearly nothing. One sun, four moons — build the solar system.",
      cfg: { USAGE_BUDGET: 130, USAGE_RATE: 0.05 } },
    { id: "lockdown", name: "The Lockdown", base: "classic",
      blurb: "Defensive penalties doubled. Two bad defenders in the same position group is a felony now.",
      cfg: { BACKCOURT_D_TAX_10: 6, BACKCOURT_D_TAX_25: 4, WING_D_TAX_10: 6, WING_D_TAX_25: 4 } },
    { id: "no_defense", name: "No-Defense November", base: "classic",
      blurb: "All defensive taxes waived. Nobody guards anybody. Draft the arsonists.",
      cfg: { BACKCOURT_D_TAX_10: 0, BACKCOURT_D_TAX_25: 0, WING_D_TAX_10: 0, WING_D_TAX_25: 0 } },
    { id: "hand_check", name: "Hand-Check Week", base: "classic",
      blurb: "The '90s board, with '90s consequences — defensive penalties half again as painful.",
      deal: function () { return { decs: [1990] }; },
      cfg: { BACKCOURT_D_TAX_10: 4.5, BACKCOURT_D_TAX_25: 3, WING_D_TAX_10: 4.5, WING_D_TAX_25: 3 } },
    { id: "pace_and_space", name: "Pace and Space", base: "classic",
      blurb: "Modern boards only, and the suits want four shooters minimum. It's 2016 forever in here.",
      deal: function () { return { decs: [2010, 2020] }; },
      cfg: { SPACERS_REQ: 4 } },

    /* ═══════════ THE POOL (who exists this week) ═══════════ */
    { id: "short_kings", name: "Short Kings", base: "classic",
      blurb: "Nobody over 6'3\". Yes, that includes your center.",
      filter: function (row, t) { return row[t.IDX.ht] > 0 && row[t.IDX.ht] <= 75; } },
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
      filter: function (row, t) { return row[t.IDX.ppg] >= 25; } },
    { id: "role_players", name: "The Role Players' Union", base: "classic",
      blurb: "Heavy minutes, light scoring — 2,400+ minutes, 12 points max. Somebody's gotta do the dirty work. Everybody, apparently.",
      filter: function (row, t) { return row[t.IDX.ppg] <= 12 && row[t.IDX.mp] >= 2400; } },
    { id: "matadors", name: "The Matadors", base: "classic",
      blurb: "Every player on the board is a defensive liability. Best record wins anyway. Olé.",
      filter: function (row, t) { return row[t.IDX.dbpm] <= -1; } },
    { id: "superteam", name: "The Superteam Problem", base: "classic",
      blurb: "Stars only — and the usage budget just got smaller. Everyone's an alpha. The ball is not amused.",
      filter: function (row, t) { return row[t.IDX.bpm_star] >= 4; },
      cfg: { USAGE_BUDGET: 95 } },
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
      deal: function () { return { frs: ["CELTICS", "LAKERS"] }; } },
    { id: "texas_triangle", name: "The Texas Triangle", base: "classic",
      blurb: "Mavericks, Rockets, Spurs. Everything's bigger, including the spacing tax.",
      deal: function () { return { frs: ["MAVERICKS", "ROCKETS", "SPURS"] }; } },
    { id: "california_love", name: "California Love", base: "classic",
      blurb: "Lakers, Clippers, Warriors, Kings. The whole board has beach access.",
      deal: function () { return { frs: ["LAKERS", "CLIPPERS", "WARRIORS", "KINGS"] }; } },
    { id: "expansion_class", name: "The Expansion Class", base: "cap",
      blurb: "Only franchises born after 1988. No dynasties, no banners, no help.",
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
      cfg: { SPACERS_REQ: 5, SPACING_TAX: 2 } },
    { id: "grit_grind", name: "Grit and Grind", base: "cap",
      blurb: "No shooters on the board, all-defense expectations — but the spacing tax is halved. Memphis rules.",
      filter: function (row, t) { return row[t.IDX.sp] === 0; },
      cfg: { SPACING_TAX: 0.75 } },
    { id: "twin_towers", name: "Twin Towers Forever", base: "classic",
      blurb: "6'8\" minimum across the board — and wing defense goes untaxed. It's 1994 in the frontcourt.",
      filter: function (row, t) { return row[t.IDX.ht] >= 80; },
      cfg: { WING_D_TAX_10: 0, WING_D_TAX_25: 0 } },

    /* ═══════════ THE BLIND WEEKS (pro base — memory is the mechanic) ═══════════ */
    { id: "small_blind", name: "The Small Blind", base: "pro",
      blurb: "No stats, and nobody over 6'4\". Poker rules: memory is your only chip.",
      filter: function (row, t) { return row[t.IDX.ht] > 0 && row[t.IDX.ht] <= 76; } },
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
      deal: function () { return { frs: ["LAKERS", "CLIPPERS", "WARRIORS", "KINGS"] }; } }
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
    var w = isoWeek(date);
    var idx = (w.year * 53 + w.week) % CHALLENGES.length;
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
