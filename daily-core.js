/* TRUE 82 — daily-core.js: THE DAILY (social daily). SHARED MODULE, both lanes.
   Loads AFTER challenges.js, BEFORE app.js. Exposes window.T82DAILY; app.js is
   fully guarded on it, so a page without this file falls back to the old menu.
   ─────────────────────────────────────────────────────────────────────────────
   WHAT THIS IS: one shared board per calendar day. Everyone gets the same seed
   and the same modifier (drawn from the weekly-challenge manifest, ids only —
   manifest law respected: challenges.js is never edited from here). Your FIRST
   finished run of the day is your official result; every later run is practice.
   Record and net are pure functions of your five (winTally = ceil(82*p), no
   game-by-game RNG), so on a shared board the comparison is skill, not dice.

   WHY THE SEED IS CLIENT-DERIVABLE (and why that does not break The Daily Law):
   ACCOUNTS §2.2 governs the ACCOUNT daily — HMAC-minted at read time because
   verified leaderboard runs are at stake. The social daily has no leaderboard,
   no accounts, no server writes; its only stakes are group-chat bragging
   rights. A deterministic local seed buys: zero cron, zero Functions, zero
   secrets, works offline, and the account daily keeps its own seed space
   untouched. If the social daily ever feeds a leaderboard, the seed source
   moves server-side FIRST.

   DAY BOUNDARY: device-local midnight (the Wordle convention). Two players in
   different timezones can briefly straddle a boundary; the share text carries
   the board number, so a mismatch is visible instead of silent.

   INVARIANTS HONORED: fail-soft everywhere (no localStorage -> mode still
   plays, share still copies) · zero-cron · replay law untouched (engine and
   hooks unmodified) · manifest law (pool references ids; missing id -> vanilla
   board) · no em-dashes in any user-facing string in this file.
   Tests: test.js vm-loads this file and pins every past board (#1 through
   #77, 2026-09-26) and the archive's storage (v56). From #79 (2026-09-28)
   the days come from POOL3, 200 boards that loop; test.js pins its shape. */
(function (g) {
  "use strict";

  var EPOCH = "2026-07-12";            // Daily #1
  var SEED_NS = "t82d1|";              // never bump: seedFor has no date cutoff, so a new namespace reseeds EVERY board, past ones too (v56: the archive replays them)
  var GAMES = 82;

  /* ---------- day math (all local-time, string keys) ---------- */
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  // v66: a test build's pretend "today" (app.js sets it from ?day=YYYY-MM-DD, never on true82.net), so a special
  // day's board can be played start to finish before it arrives. Only today moves; any explicit date is untouched.
  var TEST_DAY = null;
  function setTestDay(key) { TEST_DAY = (key && /^\d{4}-\d{2}-\d{2}$/.test(String(key))) ? String(key) : null; return TEST_DAY; }
  function dayKey(now) {
    if (now == null && TEST_DAY) return TEST_DAY;
    var d = now != null ? new Date(now) : new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }
  // Key -> local-noon Date; noon dodges DST edges when differencing days.
  function keyToNoon(key) {
    var p = String(key).split("-");
    return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0, 0);
  }
  function validKey(key) { return /^\d{4}-\d{2}-\d{2}$/.test(String(key)); }
  // v56: the key n days from key (negative: back), for the archive's list.
  function shiftKey(key, n) { return dayKey(keyToNoon(key).getTime() + n * 86400000); }
  function dayNum(key) {
    if (!validKey(key)) return 0;
    var diff = Math.round((keyToNoon(key) - keyToNoon(EPOCH)) / 86400000);
    return diff + 1;                   // EPOCH itself is #1
  }

  /* ---------- deterministic bits ---------- */
  // FNV-1a 32-bit. Stable across engines; pinned by test vectors in test.js §15.
  function hash32(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h >>> 0;
  }
  function seedFor(key) { return hash32(SEED_NS + key); }

  /* ---------- v69.4: THE SEED MAY COME FROM THE SERVER ----------
     seedFor() is FNV-1a over the day key in a file every browser downloads, so
     every future board was derivable, and SEED_OVERRIDES published the three
     launch-week boards outright. /api/day now mints them (functions/_lib/dayseed.js)
     and app.js injects the answer here at boot.

     THE ORDER IS INJECTED, THEN PINNED, THEN DERIVED, and each step is a
     deliberate fallback:
       - An INJECTED seed is the server's and always wins.
       - SEED_OVERRIDES stays in this file as the FAIL-SOFT for the launch week.
         It holds the v66.4 rolls the owner approved, which are public but tuned,
         so a DAILY_PINS that never got set means "his approved boards, known to
         anyone who read this file" and never "a random board nobody simulated".
       - seedFor() is every ordinary day before the server started minting, which
         is what keeps THE DAILY ARCHIVE, every stored official run and every
         shared beat-link replaying the board that was actually played.

     INJECTED SEEDS ARE NEVER PERSISTED. They live in this closure for the life of
     the page, so a stale map cannot outlive a reload and disagree with the server. */
  var INJECTED = null;

  /* Install the server's map of day key -> uint32 seed. Returns how many it took.
     Hostile or partial input is dropped entry by entry rather than rejected
     wholesale: one bad row must never cost a player the rest of the window. */
  function setSeeds(map) {
    if (!map || typeof map !== "object") return 0;
    var next = {}, n = 0;
    for (var k in map) {
      if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
      if (!validKey(k)) continue;
      var v = map[k];
      if (typeof v !== "number" || !isFinite(v) || v < 0 || v > 4294967295 || v % 1 !== 0) continue;
      next[k] = v >>> 0; n++;
    }
    /* `next`, NOT `n ? next : null`. An environment that mints nothing answers
       with an empty map, and that answer is authoritative: it means "play the
       seed in this file, the server agrees". Collapsing it to null would make
       seedsLoaded() false forever and hold every Daily behind a gate waiting
       for a map that had already arrived. */
    INJECTED = next;
    return n;
  }

  /* Whether the server has spoken for this day. app.js gates the Daily on it:
     a day the server mints MUST be played on the server's seed, because run.js
     checks the submitted seed against its own and a mismatch costs the player
     their one official attempt. */
  function seedIsServers(key) { return !!(INJECTED && INJECTED[key] !== undefined); }
  function seedsLoaded() { return INJECTED !== null; }

  /* THE BOUNDARY, and the one thing about minting the browser is told.
     A date is not a secret — it leaks nothing about any seed — and the client
     needs it to know which days it must NOT guess at. Days before it were
     played on seedFor() and keep it forever, so the archive and every shared
     beat-link stay honest; days from it onward belong to the server.

     THIS MUST EQUAL functions/_lib/dayseed.js MINT_FROM. test.js imports both
     and fails if they ever drift, which is the only thing keeping two copies of
     one constant safe. */
  var MINT_FROM = "2026-10-11";

  /* Whether this day's seed is the server's to give. When this is true and the
     map has not arrived, the seed resolvedSeed() would return is a GUESS, and
     playing on a guess costs the player their one official attempt for the day
     (run.js compares the submitted seed with its own). app.js holds the launch
     until seedsLoaded() rather than play one.
     Once the map HAS arrived, its silence about a day is an answer: the server
     mints nothing for that day and the file's own seed is the right one. */
  function needsServerSeed(key) { return validKey(key) && String(key) >= MINT_FROM; }

  function resolvedSeed(key) {
    if (INJECTED && INJECTED[key] !== undefined) return INJECTED[key];
    if (SEED_OVERRIDES[key] !== undefined) return SEED_OVERRIDES[key];
    return seedFor(key);
  }

  /* ---------- the pool ----------
     Curated from the 98-challenge manifest: solo-legible in one blurb, punchy
     mid-draft, no account features. Vanilla entries breathe between modifiers.
     Ids are REFERENCES into T82CH.byId; a missing id fails soft to vanilla cap.
     kaman never rotates in. */
  var POOL = [
    // straight boards (the palate cleansers)
    { base: "cap" }, { base: "classic" }, { base: "cap" }, { base: "pro" },
    { base: "cap" }, { base: "classic" }, { base: "cap" },
    // the economy
    { id: "inflation" }, { id: "deflation" }, { id: "petty_cash" },
    { id: "minimum_wage" }, { id: "deep_pockets" }, { id: "gem_rush" },
    { id: "the_gauntlet" }, { id: "golden_age" }, { id: "odd_lots" },
    { id: "even_money" }, { id: "balanced_books" }, { id: "bargain_bin" },
    { id: "the_descent" }, { id: "escalator" }, { id: "moneyball" },
    { id: "seventies_money" }, { id: "luxury_tax" },
    // the engine room
    { id: "analytics_dept" }, { id: "post_up_week" }, { id: "the_triangle" },
    { id: "iso_week" }, { id: "heliocentric" }, { id: "lockdown" },
    { id: "no_defense" }, { id: "hand_check" }, { id: "pace_and_space" },
    // the pool
    { id: "short_kings" }, { id: "two_way" }, { id: "stoppers" },
    { id: "generalists" }, { id: "specialists" },
    // skip economy
    { id: "no_skips" }, { id: "choosy_gm" },
    // combo punchlines
    { id: "small_ball_apoc" }, { id: "grit_grind" }, { id: "twin_towers" },
    // the blind boards (pro base: memory is the mechanic)
    { id: "blind_nineties" }, { id: "blind_y2k" }, { id: "blind_eighties" },
    { id: "blind_modern" }, { id: "blind_california" },
    { id: "small_blind" }, { id: "tall_blind" }
  ];

  /* ---------- THE SECOND ROTATION (2026-07-19 onward) ----------
     The legacy POOL above is FROZEN: boardFor hashes per-day into it, so its
     length and order rewrite every historical board. It stays exactly as
     shipped so past dailies and beat-links replay forever.

     POOL2 is a true rotation (day index modulo 42), hand-ordered as six
     weekly arcs starting Saturday 2026-07-19. Weekday texture: Sat franchise
     flavor, Sun economy, Mon engine rules, Tue sequence puzzles, Wed era or
     wildcard, Thu blind or bank, Fri a positive twist. Every id below passed
     the 2026-07-18 playability audit (300 bot games each, 0% unfinishable,
     healthy pools and center supply). The audit retired the modes that
     bricked (escalator: 61% dead), starved (two_way: 4-player boards), or
     filled slots only through same-name data collisions (short_kings,
     small_ball_apoc). Retired ids stay live in the manifest for replays.
     v56: THE DAILY ARCHIVE replays every past board from its date, and
     test.js pins them: never edit POOL2 (the rotation is modulo its length);
     new boards go in a POOL3 with its own start date. */
  var START2 = "2026-07-19";
  var OVERRIDES = {
    // 2026-07-18 shipped small_ball_apoc, whose C slot was fillable only via
    // name-collision ghosts. Swapped mid-day for the fixed build of the same
    // fantasy. Morning officials stand; the board simply became playable.
    "2026-07-18": "small_ball_five",
    // v66 THE SPECIAL DAYS (the owner, 2026-09-29): the season's first three nights, each a Classic board drawn only
    // from the franchises in that night's national games, "to match the IRL" slate (checked against the NBA's
    // 2026-27 schedule: 10/20 NBC's tripleheader, 10/21 and 10/22 ESPN's doubleheaders), in their star eras, for the
    // first-timers the owner expects that week. They bump POOL3's Backcourt Mates (10/20), The Worst Year (10/21)
    // and Pass It On (10/22), which come back when POOL3 loops (2027-04-16 onward); every other day keeps its board.
    // With 10/19's Board Meeting that is four Classic days in a row: the launch week's deliberate exception to the
    // three-running law (test.js exempts these dates only).
    "2026-10-20": "opening_night",     // #101, Tue: Celtics-Pistons, 76ers-Knicks, Thunder-Spurs
    "2026-10-21": "doubleheader",      // #102, Wed: Timberwolves-Heat, Warriors-Lakers
    "2026-10-22": "primetime"          // #103, Thu: Cavaliers-76ers, Nuggets-Thunder
  };
  // v66.4: a special day's rolls, chosen by simulating the crowd (the owner: stars people know, but not "everyone ...
  // the exact same team plus or minus one player"). A model of 900 players (casual ones who read the first rows and
  // take the biggest name, fans who take the names they rate, experts who pick by value; weak tickets make some skip)
  // played every candidate path. Each chosen path carries the night's headliners and exactly one deep cut in round 2
  // or 3, and was the least alike among its candidates. Replays, archive and beat-links read the same seed via
  // boardFor. The live v66.3 rolls had 10%, 24% and 41% of players on one identical five, sharing 2.6-3.3 of 5, with
  // 58% of 10/22 at 82-0. These (the scratchpad crowd model, 300 players each):
  //   10/20: '00s Celtics > '70s Pistons (deep: Bob Lanier) > '20s Spurs > '90s Knicks > '10s Thunder: the most common
  //          five 11%, two players share 1.8 of 5, 6% go 82-0, records 66/75/80
  //   10/21: '90s Lakers > '80s Warriors (deep: Sleepy Floyd over Chris Mullin) > '10s Timberwolves > '00s Heat > '20s
  //          Warriors: 4%, 1.7 of 5, 5% at 82-0, records 46/73/80
  //   10/22: '80s 76ers > '70s Sonics (deep) > '10s Cavaliers > '20s Nuggets > '00s 76ers: 12%, 2.0 of 5, 4% at 82-0,
  //          records 62/77/81 (the deep cuts that only hid good players were not enough there: the bare '70s eras are
  //          on its list for that)
  var SEED_OVERRIDES = {
    "2026-10-20": 2696998625,
    "2026-10-21": 3675641764,
    "2026-10-22": 2501072727
  };
  var POOL2 = [
    // week 1
    "golden_age", "loyalty", "stoppers", "time_machine", "inflation", "blind_nineties", "seven_seconds",
    // week 2
    "rivalry", "small_ball_five", "luxury_tax", "the_descent", "pioneers", "memory_palace", "splash_only",
    // week 3
    "california_love", "minimum_wage", "lockdown", "benjamin_button", "kaman_epoch", "blind_modern", "iso_week",
    // week 4
    "texas_triangle", "balanced_books", "hand_check", "decade_ladder", "hyperinflation", "blind_california", "heliocentric",
    // week 5
    "expansion_class", "bargain_bin", "pace_and_space", "full_circle", "the_gauntlet", "deep_pockets", "y2k",
    // week 6
    "vhs_era", "odd_lots", "the_triangle", "twin_towers", "generalists", "post_up_week", "choosy_gm"
  ];

  /* ---------- THE THIRD ROTATION (2026-09-28 onward) ----------
     POOL3 is 200 new boards, one a day from Monday 2026-09-28 (Daily #79)
     through Thursday 2027-04-15, then the list loops from the top (day index
     modulo 200, so after the first pass the weekday texture drifts). Every day
     before START3 keeps its POOL2 or legacy board: history is pinned by
     test.js, and 2026-09-27 (#78) is still POOL2.
     Weekday texture for the first pass, like POOL2: Mon engine rules, Tue
     sequence puzzles, Wed era or wildcard, Thu blind (Pro), Fri a positive
     twist, Sat franchise flavor, Sun economy (Presti). Never the same base
     mode three days running (the wrap from #278 back to #79 included), and
     boards from one mechanic family sit at least 6 days apart (mirror pairs
     at least 35). docs/DAILIES-POOL3.md lists the run and the families.
     SWAPPING: only a board whose date has not arrived may change. Replace an
     id in place (never insert or delete: the rotation is modulo the length),
     keep the manifest entry, and give the new id DAILY_COPY s and g.
     Every id passed tools/daily-audit.js (node tools/daily-audit.js 300 pool3). */
  /* ---------- v65 THE DAILY'S EVENT BADGE ----------
     One optional label for a special day's board (an opening-night Daily, say), printed as a small aqua badge at the
     bottom of the home's Daily tile. The key is the day's date (the player's own calendar day, like every key here);
     no entry means no badge, which is every normal day. The label is display only: it never changes the board, its
     seed or its replay. Keep it short (13 letters, like OPENING NIGHT, fit the tile at 320px). Example:
       "2026-10-20": "Opening night"   */
  var DAILY_BADGES = {
  };

  var START3 = "2026-09-28";
  var POOL3 = [
    // week 1 (Mon Sep 28)
    "paint_police", "scoring_relay", "rookie_scale", "the_spectrum", "gunslingers", "league_leaders", "minimum_guards",
    // week 2 (Mon Oct 5)
    "stat_sheet", "the_midpoint", "upside_down", "millennium_men", "screen_setter", "journeymen", "name_twins",
    // week 3 (Mon Oct 12)
    "scoring_cap", "double_dip", "late_bloomers", "frontcourt_giants", "shootout", "mvp_club", "price_ladder",
    // week 4 (Mon Oct 19)
    "board_meeting", "backcourt_mates", "worst_year", "pass_it_on", "bird_rights", "finishers", "vintage",
    // week 5 (Mon Oct 26)
    "two_way_alphas", "earn_it", "rookie_center", "play_big", "three_and_d", "finesse_forwards", "last_call",
    // week 6 (Mon Nov 2)
    "five_tools", "six_degrees", "the_off_year", "overlap", "hub_center", "frequent_flyers", "nostalgia_sale",
    // week 7 (Mon Nov 9)
    "balanced_attack", "nellie_ball", "young_legs", "word_chain", "inside_outside", "lottery_stars", "stars_and_scrubs",
    // week 8 (Mon Nov 16)
    "job_description", "pick_and_roll", "the_leap", "last_stop", "two_point_guards", "unsung", "big_man_sale",
    // week 9 (Mon Nov 23)
    "trust_the_process", "anniversary", "glass_season", "outside_in", "five_out", "starters", "rising_ceiling",
    // week 10 (Mon Nov 30)
    "wing_stoppers", "feed_the_star", "share_evenly", "second_act", "unicorn_hunt", "new_threads", "ring_tax",
    // week 11 (Mon Dec 7)
    "height_cap", "peer_group", "by_the_book", "spell_the_team", "big_guards", "the_hangover", "minimum_center",
    // week 12 (Mon Dec 14)
    "point_god", "the_post", "old_guard", "franchise_pillars", "ball_hawks", "no_mvps", "rookie_discount",
    // week 13 (Mon Dec 21)
    "punt_the_boards", "strangers", "career_high", "longevity", "tax_holiday", "treadmill", "fair_market",
    // week 14 (Mon Dec 28)
    "usage_pyramid", "spread_out", "old_man_center", "alphabet_split", "scorer_and_setter", "jewelry", "pay_the_backcourt",
    // week 15 (Mon Jan 4)
    "stocks", "frontcourt_mates", "the_prequel", "homegrown", "glass_bonus", "so_close", "long_names",
    // week 16 (Mon Jan 11)
    "shooter_premium", "by_the_numbers", "dime_season", "draft_class", "splash_backcourt", "headline_acts", "salary_match",
    // week 17 (Mon Jan 18)
    "bad_boys", "career_arc", "the_decline", "inside_out", "point_forwards", "east_meets_west", "payday",
    // week 18 (Mon Jan 25)
    "blue_collar", "contemporaries", "middle_man", "the_relay", "stretch_five", "robin", "max_center",
    // week 19 (Mon Feb 1)
    "point_of_attack", "alumni_night", "graybeards", "unique_names", "point_center", "parting_shot", "no_headliners",
    // week 20 (Mon Feb 8)
    "long_ball", "full_house", "scoring_tiers", "the_chain", "help_defense", "ring_chasers", "market_crash",
    // week 21 (Mon Feb 15)
    "punt_assists", "crossover", "rookie_backcourt", "ringless", "bucket_getters", "deadline_deals", "pay_scale",
    // week 22 (Mon Feb 22)
    "early_arc", "the_straight", "early_bloomers", "first_name_basis", "unselfish", "the_duo", "opening_steal",
    // week 23 (Mon Mar 1)
    "defense_first", "give_and_go", "pecking_order", "all_wings", "win_now", "power_forwards", "splurge_and_save",
    // week 24 (Mon Mar 8)
    "punt_defense", "era_pairs", "swat_season", "short_names", "ball_hogs", "bench_mob", "pay_by_size",
    // week 25 (Mon Mar 15)
    "stretch_fours", "the_point", "experience_cap", "lifers", "role_forwards", "shaqs_rolodex", "price_check",
    // week 26 (Mon Mar 22)
    "extra_pass", "season_relay", "swan_song", "zigzag", "forward_firepower", "old_school_backcourt", "high_low",
    // week 27 (Mon Mar 29)
    "crash_the_glass", "the_mentor", "new_guard", "play_small", "glue_guards", "no_point_guard", "top_shelf",
    // week 28 (Mon Apr 5)
    "mid_range", "mentorship", "the_encore", "rentals", "hundred_club", "contenders", "no_middle",
    // week 29 (Mon Apr 12)
    "tax_season", "then_and_now", "vet_guards", "common_names"
  ];
  var VANILLA_NAME = { cap: "Straight Presti", classic: "Straight Classic", pro: "Straight Pro" };
  var VANILLA_BLURB = {
    cap: "No modifier. $50M, random prices, the board as dealt.",
    classic: "No modifier. Full stats, one skip each. Pure draft.",
    pro: "No modifier. No stats, random seasons. Memory only."
  };
  // Display aliases ONLY (manifest law: challenges.js is never edited from
  // here). Three manifest names carry a Week suffix that reads wrong on a
  // daily board; everything else renders verbatim.
  var DAILY_NAME = { hand_check: "Hand-Check Rules", post_up_week: "Post-Up Rules", iso_week: "Iso Rules" };

  /* ---------- the copy layer (presentation only, manifest untouched) ----------
     COPY LAW (2026-07-17 rewrite): information first, flavor a distant second.
     Every line tells a first-timer WHAT changed, by HOW MUCH, and what to DO
     about it, in plain english, using the engine's real numbers. Defaults for
     reference: $50M cap budget, a $26M ceiling (v63.1), one $1 gem at most, only on a board whose top five rolled over fair (v63.1; it was about 1 in 7 mid-tier players), half the
     mid-tier rip-offs, usage budget 120 taxed at 0.3 net per point over (v63),
     two small guards or a small frontcourt 2 each, 3 floor spacers wanted (zero shooters bleeds about 6 net), pair-defense
     taxes 2 to 3 net, one skip of each in classic, unlimited $1M rerolls in
     cap. Each brief below was verified against its manifest cfg/filter/pick/
     deal hooks in the same commit; if a hook changes, change the brief too.
     s = short line: menu tile subtitle + draft panel status row. One breath.
     g = the brief: gate screen + the HOW TO PLAY sheet. 2 to 4 sentences.
     Every string is em-dash-free and pinned by tests. Boards that lock eras
     or teams via deal hooks say so, so a dead skip button reads as a rule,
     not a bug. */
  var DAILY_COPY = {
    /* ---- POOL2 additions (2026-07-18): every line verified against the
       manifest hooks it describes. Money in millions per the format law. ---- */
    small_ball_five: {
      s: "G/F slots are 6'4\" and under. Center must also qualify at forward.",
      g: "Every guard and forward slot is capped at 6'4\". The one center slot ignores height, but only for a player who qualifies at both forward and center, so you get one tower instead of a frontcourt full of them. Presti pricing, and four floor spacers wanted at 2 net each." },
    loyalty: {
      s: "Your first pick locks the franchise for all five.",
      g: "Round 1 only deals franchises deep enough to field a whole team, and whoever you take first locks his team for the run: every later board is that franchise in another era. After pick one, team skips just change the era. Draft the logo, then the players." },
    time_machine: {
      s: "Each pick's season on or after the last.",
      g: "Draft forward through history: every pick's season must be the same year or later than the pick before it. Open early and save the modern era for the finish. The year menu is the whole game here: the season you choose is the season the rule sees." },
    benjamin_button: {
      s: "Each pick's season on or before the last.",
      g: "Draft backward through history: every pick's season must be the same year or earlier than the pick before it. Start modern, end where the game began. The year menu is the whole game here: the season you choose is the season the rule sees." },
    decade_ladder: {
      s: "Five picks, five different decades, climbing.",
      g: "Every pick must come from a LATER decade than the last, so your five cover five decades in order. The dealer keeps enough runway, but do not spend a decade you will need. The year menu can move a player between decades: check it before you commit." },
    full_circle: {
      s: "Pick five returns to pick one's franchise.",
      g: "Your opening board only offers deep franchises, and your fifth board comes back to your first pick's team. Whatever you open with, you finish with. Plan the reunion from round 1 and remember which eras that franchise still owes you." },
    rivalry: {
      s: "Celtics and Lakers. That is the whole board.",
      g: "Every deal is Boston or Los Angeles, any era, with Presti pricing. Team skips just flip the rivalry. Pick a side, or build the treaty five and let history sort out the locker room." },
    texas_triangle: {
      s: "Mavericks, Rockets, Spurs. Nothing else.",
      g: "Every board comes from the three Texas franchises, any era, full stats. Team skips rotate the triangle. The spacing rules still apply, so find the Texans who could actually shoot." },
    california_love: {
      s: "Lakers, Clippers, Warriors, Kings only.",
      g: "Four California franchises, any era, full stats, one skip of each. Team skips shuffle the coastline. Showtime, Lob City, and the Splash era all count. The whole board has beach access." },
    opening_night: {
      s: "Opening night's six teams: star eras, one deep cut.",
      g: "Every board is a star era of one of the six franchises playing on opening night: the Celtics, Pistons, 76ers, Knicks, Thunder and Spurs, full stats. The SuperSonics years count for the Thunder. One exception: round 2 or 3 brings a deep cut, a lesser era hiding a gem. Find him or skip it: two team skips today." },
    doubleheader: {
      s: "Wolves, Heat, Warriors, Lakers: star eras, one deep cut.",
      g: "Every board is a star era of one of the four franchises in the second night's doubleheader: the Timberwolves, Heat, Warriors and Lakers, full stats. One exception: round 2 or 3 brings a deep cut, a lesser era hiding a gem. Find him or skip it: two team skips today." },
    primetime: {
      s: "Cavaliers, 76ers, Nuggets, Thunder: star eras, one deep cut.",
      g: "Every board is a star era of one of the four franchises on the primetime slate: the Cavaliers, 76ers, Nuggets and Thunder, full stats. The SuperSonics years count for the Thunder. One exception: round 2 or 3 brings a deep cut, a lesser era hiding a gem. Find him or skip it: two team skips today." },
    expansion_class: {
      s: "Only franchises born after 1988.",
      g: "Heat, Magic, Wolves, Raptors, Grizzlies, Pelicans, Hornets: the expansion class, with Presti pricing. No dynasties to lean on and shorter histories to mine, so scout the seasons that actually mattered." },
    kaman_epoch: {
      s: "2004 to 2016 seasons only. He watches.",
      g: "Every eligible season on every board comes from 2004 through 2016, the age of Kaman, with Presti pricing. The year menu only offers the window. Somewhere, he judges your five." },
    vhs_era: {
      s: "'80s and '90s boards. Presti pricing.",
      g: "Every deal comes from the 1980s or 1990s, so era skips just bounce between two decades. Prices are live and the steals still exist. Be kind, rewind, and remember the engine grades impact, not mixtapes." },
    pioneers: {
      s: "The 1970s and '80s. Before the arc mattered.",
      g: "Every board comes from the 1970s and 1980s, full stats, one skip of each. Era skips bounce between the founding decades. The engine still grades modern impact, so find the pioneers whose games would travel." },
    y2k: {
      s: "The 2000s, wall to wall.",
      g: "Every deal comes from the 2000s, full stats, one skip of each. Headbands, baggy shorts, and some of the highest-impact seasons in the whole dataset. This one is a joy board. Cook." },
    memory_palace: {
      s: "No stats. No skips. Five boards, final.",
      g: "Pro rules with zero team skips and zero era skips: the boards you are dealt are the exam you take. The year menu still works, from memory. What you know is the entire strategy." },
    seven_seconds: {
      s: "Shooting pays extra. Two spacers is enough.",
      g: "The spacing bonus is boosted half again, 1.5 net per qualifying shooter, and the shooter bar drops to two. Guns are pure profit today. Run, gun, and let the engine do the counting." },
    splash_only: {
      s: "Shooters only, all five slots.",
      g: "Every player on the board stretches the floor, so the spacing tax cannot touch you and the bonus is everywhere. The separators are everything else: defense pairs, one ball to share, and raw star power." },
    hyperinflation: {
      s: "Prices tripled. Budget $75M. The math lies.",
      g: "Every price tag is tripled and your budget rises to $75M, which is about $25M of real buying power once the tripling eats it. The $1M steals survive the multiplication. Find them and live on them." },
    inflation:       { s: "Every price doubled. Budget still $50M.",
                       g: "Every price on the board is doubled but your budget is still $50M. The $1M steals survive the doubling, so live in the bargain bin, and pay up for one star at most." },
    deflation:       { s: "Prices halved. Budget cut to $25M.",
                       g: "Every price is cut in half and your budget is cut to $25M. Half a wallet in a half-off store plays like a normal day with zero margin for error. One rip-off ruins the run." },
    petty_cash:      { s: "Budget cut to $35M.",
                       g: "Normal prices, but your budget is $35M instead of $50M. Plan on two or three picks from the $1M to $4M shelf so one real star still fits under the cap." },
    minimum_wage:    { s: "Budget $20M for five spots.",
                       g: "Your budget is $20M against normal prices. That is $4M a man. Stars are decoration today: hunt the $1M gems hiding in the mid-tier and take the cheap guys who can actually play." },
    deep_pockets:    { s: "$82M budget. Prices up 60 percent.",
                       g: "You get $82M, but every price is marked up 60 percent, which nets out to roughly normal buying power. Do not let the big wallet bait you into star-chasing. Spend like it is a regular $50M day." },
    gem_rush:        { s: "Half the mid-tier players cost $1M.",
                       g: "Half of the mid-tier players are mispriced at $1M today (a normal board has one only when its stars roll overpriced) and rip-offs are rare. The catch: your budget is $40M. Fill most of your five with steals and spend the savings on one real star." },
    the_gauntlet:    { s: "Everything slightly worse. Budget $45M.",
                       g: "Budget down to $45M, prices up 25 percent, 4 in 5 mid-tier players are rip-offs, and the $1M gems have nearly vanished. No single rule kills you. Together they grind. Take the least-bad price on each board and keep moving." },
    golden_age:      { s: "A third of the mid-tier costs $1M.",
                       g: "About 1 in 3 mid-tier players is a $1M steal today (a normal board has one only when its stars roll overpriced), on a full $50M budget. Fill the back of the roster for pocket change, then buy the best star on the market." },
    odd_lots:        { s: "You may only pay odd prices.",
                       g: "Every price you pay must be an odd number: $1M, $3M, $5M and up. Even-priced players are locked. The $1M gems are all legal, so this is a bargain-hunting day in disguise, and a $1M year reroll reshuffles a board that comes up all even." },
    even_money:      { s: "You may only pay even prices.",
                       g: "Every price you pay must be even: $2M, $4M, $6M and up. Every $1M gem is locked behind glass, which quietly raises the cost of a good team. Budget in even numbers and use $1M rerolls to reshuffle a dead board." },
    balanced_books:  { s: "No single contract over $14M.",
                       g: "You cannot pay more than $14M for any one player, so the premium stars are locked. Spread the $50M across five very good players instead of two great ones. Depth wins today." },
    bargain_bin:     { s: "No contract over $6M.",
                       g: "Nothing over $6M, all five spots. Most of the board is locked, so the draft happens in the bins: $1M gems, cheap veterans, and whatever the randomizer marked down. Scouting is the whole game." },
    the_descent:     { s: "Each pick must cost the same or less.",
                       g: "No pick may cost more than the one before it. Open with your most expensive player, because your ceiling only drops from there. An opening $1M gem locks the rest of the board to $1M, so spend big first." },
    escalator:       { s: "Each pick must cost the same or more.",
                       g: "No pick may cost less than the one before it, prices run 40 percent hot, gems are nearly gone, and the budget is $70M. Open as cheap as you can find: every dollar spent on pick one raises the floor under all five." },
    moneyball:       { s: "$30M budget. 2,500-minute seasons only.",
                       g: "The board only deals seasons with 2,500 or more minutes played, and your budget is $30M. Everyone is durable and almost nothing is cheap. The game is finding the iron-man seasons the market underpriced." },
    seventies_money: { s: "1970s only, with Presti pricing.",
                       g: "Every board comes from the 1970s, so era skips are dead today (they re-deal the same decade). Presti pricing still applies. The era's box scores run hot, but the engine grades impact, not points." },
    luxury_tax:      { s: "Usage tax from 110, at 0.4 a point.",
                       g: "The usage tax starts sooner and bites harder: every point of team usage above 110 costs 0.4 net, up to 10, where a normal board charges 0.3 above 120, up to 6. One alpha is affordable. Two is a felony. Surround your star with low-usage role players." },
    analytics_dept:  { s: "Five shooters required.",
                       g: "You must draft FIVE floor spacers, up from the usual three, and each missing shooter costs 2.5 net instead of 2. Miss the quota by two and you have burned about a dozen wins. If he cannot shoot, he does not board." },
    post_up_week:    { s: "Shooting counts for nothing.",
                       g: "The spacing rules are switched off: zero shooters costs nothing, five shooters earns nothing. A jumper is decoration today. Draft raw talent and defense and feed the block like it is 1994." },
    the_triangle:    { s: "Usage budget cut to 100.",
                       g: "The team usage budget drops from 120 to 100, and every point over it costs 0.3 net, up to 10 instead of 6. Five stars who all need the ball will eat each other alive. Two low-usage glue guys are worth more than a third alpha today." },
    iso_week:        { s: "Usage tax off. Stack the alphas.",
                       g: "The usage tax is off: total team usage is free no matter how high it climbs. The sharing penalty that normally breaks superteams is gone, so stack every ball-dominant star you can find." },
    heliocentric:    { s: "Usage budget 130, tax nearly off.",
                       g: "The usage budget rises from 120 to 130 and overage costs 0.05 net a point instead of 0.3. Build the whole team around one giant-usage sun and let four moons orbit. The engine will barely notice the ball-hogging." },
    lockdown:        { s: "Defense penalties doubled.",
                       g: "The pair-defense penalties are doubled: two weak defenders together in the backcourt or at forward now costs 4 to 6 net instead of 2 to 3. One liability can hide. Two in the same position group cannot." },
    no_defense:      { s: "Defense penalties off.",
                       g: "Every pair-defense penalty is off. Matadors play free today. Draft the five best offensive seasons you can find and let nobody guard anybody." },
    hand_check:      { s: "The '90s. Defense fines up 50 percent.",
                       g: "Every board comes from the 1990s, so era skips are dead (same decade every time). The pair-defense penalties hit half again as hard: 3 to 4.5 net for a bad-defense pair instead of 2 to 3. Guard somebody." },
    pace_and_space:  { s: "Modern eras. Four shooters required.",
                       g: "Boards come from the 2010s and 2020s only, so era skips just bounce between those two decades. You need FOUR floor spacers instead of three, at 2 net per missing shooter. Shooting first, questions later." },
    short_kings:     { s: "Nobody over 6'3\", center included.",
                       g: "The board only shows players 6'3\" and under, all five slots. Rebounding and rim protection barely exist at this height, so win with shooting, speed, and the rare small guy who actually defends." },
    two_way:         { s: "Must be a plus on both ends.",
                       g: "Every pick must grade at least +1 on offense and +0.5 on defense (OBPM and DBPM). One-way stars are locked, which shrinks the board to the genuinely complete players. Expect to hunt." },
    stoppers:        { s: "Positive defenders only.",
                       g: "Every pick needs a defensive rating of zero or better (DBPM). The defensive sieves are locked no matter how many points they score. Offense is your problem to solve inside the rule." },
    generalists:     { s: "Multi-position players only.",
                       g: "Every pick must have played two or more positions over his career. The pure specialists are locked. Draft the switchable types and the slot math takes care of itself." },
    specialists:     { s: "One-position players only.",
                       g: "Every pick must qualify at exactly one position for his entire career. No combo guards, no point forwards, no small-ball centers. One job each, so your five slots must line up perfectly." },
    no_skips:        { s: "Zero skips. Play what you are dealt.",
                       g: "Team skips and era skips are both zero, down from one each. The five boards you are dealt are the whole draft. Best available, every round. There is no escape hatch." },
    choosy_gm:       { s: "Five skips of each. Be picky.",
                       g: "You get five team skips and five era skips, up from one each. If a board has no winner on it, throw it back. Unused skips are worth nothing at the buzzer, so spend them." },
    small_ball_apoc: { s: "Nobody over 6'5\". Five shooters.",
                       g: "Presti pricing, nobody over 6'5\" on the board, and a five-shooter quota at 2 net per missing shooter. Small, cheap, and everybody shoots, or you bleed net. Height was a luxury anyway." },
    grit_grind:      { s: "No shooters exist. Small flat fine.",
                       g: "Every shooter is filtered off the board, so the shooting quota is impossible for everyone. The good news: the spacing fine is softened to a flat 2.25 net, and everybody pays it. Eat the fine, then win on defense and raw talent." },
    twin_towers:     { s: "6'8\" minimum. Wing defense free.",
                       g: "Everyone on the board is 6'8\" or taller, and the forward-pair defense penalty is off (the guard pair still pays). Draft giants, let your forwards matador, and keep at least one guard who tries." },
    blind_nineties:  { s: "The '90s, no stats.",
                       g: "Pro rules on a 1990s-only board: no stats shown, every season randomized, era skips dead. Draft the names you actually watched, and check the season menu before you commit." },
    blind_y2k:       { s: "The 2000s, no stats.",
                       g: "Pro rules on a 2000s-only board: no stats, randomized seasons, era skips dead. Reputation is your only scouting report, and some reputations are lies." },
    blind_eighties:  { s: "The '80s, no stats.",
                       g: "Pro rules on a 1980s-only board: no stats, randomized seasons, era skips dead. Anchor on the legends you are sure about and guess carefully around the edges." },
    blind_modern:    { s: "2010 onward, no stats.",
                       g: "Pro rules on 2010s and 2020s boards: no stats, randomized seasons, and era skips only bounce between the two modern decades. You watched these guys. The engine still grades BPM, not highlights." },
    blind_california:{ s: "Four California teams, no stats.",
                       g: "Lakers, Clippers, Warriors, Kings, blind: no stats and randomized seasons. Team skips shuffle the same four franchises. Showtime to Lob City to the Splash era, from memory." },
    small_blind:     { s: "No stats. Nobody over 6'4\".",
                       g: "Pro rules plus a height cap: no stats, randomized seasons, and only players 6'4\" and under. The little guys blur together across eras. Memory is your only chip." },
    tall_blind:      { s: "No stats. 6'8\" and up.",
                       g: "Pro rules, giants only: no stats, randomized seasons, everyone 6'8\" or taller. You remember the big men fine. The test is remembering which of their seasons were the good ones." },

    /* ---- POOL3 (2026-09-26): the 200 boards from #79 on, in run order.
       s = the draft panel's status row after "<MODE> RULES", one breath;
       g = the gate and HOW TO PLAY brief, 2 to 4 sentences. Every line was
       checked against its manifest hooks and the engine numbers (Pro boards
       open with the mode line because their cards carry no stats). ---- */
    paint_police: {
      s: "No +2.5 defender up front costs 5 net.",
      g: "The rim rule gets strict. One of your two forwards or your center needs a defensive rating (DBPM) of +2.5 or better, about the top 3 percent of big men, instead of the usual +0.9. Miss it and the open paint costs 5 net instead of 2. Presti cards hide stats, so draft an elite shot blocker you trust." },
    scoring_relay: {
      s: "Each pick scores within 4 points of the one before.",
      g: "Every pick must average within 4 points per game of the pick right before him. You can climb or fall 4 points a round, so plan the path to your stars. The year menu is your steering wheel." },
    rookie_scale: {
      s: "Every pick in his first three seasons.",
      g: "Every pick must be in his first, second or third season, with debuts from 1975 on. The year menu takes any player back to his early years. Find the stars who were great from day one." },
    the_spectrum: {
      s: "Five picks, five position tags: G, G/F, F, F/C, C.",
      g: "Pro rules: no stats, random seasons. No two picks may carry the same position tag, so you need one each of G, G/F, F, F/C and C. Cards grey out when a pick would leave a slot that no remaining tag can fill." },
    gunslingers: {
      s: "Usage tax off. You need five shooters, 2.5 each.",
      g: "The usage tax is off, so ball-dominant scorers stack freely, but you need five floor spacers and each missing one costs 2.5 net. Volume shooters are the whole point. Each shooter past five still earns 1 net." },
    league_leaders: {
      s: "Every pick: top 15 in the league in a box-score stat.",
      g: "Every pick must rank in the league's top 15 that season in points, rebounds, assists, steals or blocks (among players with 1,000 minutes). A rebounding leader counts as much as a scoring one. The year menu finds each player's league-leading seasons." },
    minimum_guards: {
      s: "Both guards must cost $3M or less.",
      g: "Your two guards cost $3M or less each, which leaves at least $44M for two forwards and a center. Buy your stars up front and find guards in the bargain bin. A $1M year reroll reshuffles a board with no cheap guards." },
    stat_sheet: {
      s: "Every pick: 10 points, 4 boards and 2 assists.",
      g: "Only seasons with at least 10 points, 4 rebounds and 2 assists a game can be drafted. Pure specialists vanish, so the board is all-around players. The year menu often has a qualifying season when the default one misses." },
    the_midpoint: {
      s: "Pick one is the middle season: two before, two after.",
      g: "Your first pick's season is the midpoint: two of your picks must come from earlier seasons and two from later ones. Once one side is full, the dealer only offers decades on the other side. Open between 1985 and 2010 to keep both sides open." },
    upside_down: {
      s: "A guard must lead your five in rebounds.",
      g: "One of your guards must average more rebounds than any of your forwards or your center. Draft a rebounding guard and bigs who do not rebound much. Cards grey out when a big would out-rebound the guards." },
    millennium_men: {
      s: "1990s and 2000s boards. Careers that crossed into 2000.",
      g: "Pro rules: no stats, random seasons. Boards come from the 1990s and 2000s only, and every pick's career must include a season ending in 1999 or earlier and one ending in 2001 or later. Era skips just bounce between the two decades." },
    screen_setter: {
      s: "Center-eligible picks must use 15% of plays or less.",
      g: "Any player with a C tag must have a usage rate of 15 or lower, wherever you slot him. Post-up stars are out and screen-and-roll bigs are in. The usage you save leaves room for bigger guards and wings." },
    journeymen: {
      s: "Every pick played for five or more franchises.",
      g: "Every pick must have played for at least five franchises in his career. Stars who moved around are rare and valuable. Presti prices still apply." },
    name_twins: {
      s: "Two of your five must share a surname.",
      g: "At least two of your five must share a surname, like two Johnsons or two Joneses. Until the pair is made, keep a common surname on the roster. Cards grey out when a pair can no longer happen." },
    scoring_cap: {
      s: "Your five may total 70 points a game, no more.",
      g: "Add up your five's points per game: the total must be 70 or less. A 30-point star leaves 40 for the other four, so low-scoring defenders, rebounders and passers carry the day. Cards grey out when a pick would leave too little for the rest." },
    double_dip: {
      s: "Picks 1 and 2 share a board, and so do picks 3 and 4.",
      g: "Your second board is your first board again, same franchise and decade, and your fourth board repeats your third. Prices and seasons re-roll on the repeat. Take one player now and leave a good one for the return." },
    late_bloomers: {
      s: "Guards and forwards who first scored 15 in year 4+.",
      g: "Your guards and forwards must be players whose first 15-point season came in their fourth season or later, with debuts from 1975 on. Any season of theirs counts once they qualify. The center is free." },
    frontcourt_giants: {
      s: "Both forwards must also be able to play center.",
      g: "Pro rules: no stats, random seasons. Your two forwards must be players who also qualify at center, so they carry an F/C tag. Wings are out at forward, so your perimeter comes from the guards." },
    shootout: {
      s: "Defense fines off. Five shooters wanted, 2.5 each.",
      g: "Every defense fine is off today, pairs and rim alike, but you need five floor spacers and each missing one costs 2.5 net. Draft shooters who never guarded anybody. Each shooter past five earns 1 net." },
    mvp_club: {
      s: "Two of your five must be MVP winners.",
      g: "At least two of your five must have won an MVP at some point in their careers, and any season of theirs counts. An MVP in a quiet season can be a bargain. Cards grey out when two can no longer fit." },
    price_ladder: {
      s: "One player from each of five price bands.",
      g: "Buy exactly one player from each band: $1M to $2M, $3M to $5M, $6M to $9M, $10M to $14M, and $15M or more. The cheapest possible ladder costs $35M of your $50M, so overpaying inside a band is the only slack. Rerolls cost $1M and eat that slack too." },
    board_meeting: {
      s: "Your five must total 45 rebounds a game.",
      g: "Add up your five's rebounds: 45 a game at least, 9 a man. Guards have to rebound too, so look for big guards and rebounding wings. Cards grey out once the math can no longer get there." },
    backcourt_mates: {
      s: "Your two guards must have been teammates once.",
      g: "Your two guards must have played on the same team in some season of their careers. Pick your first guard with a long, well-traveled career. Cards grey out for guards who never shared a roster with him." },
    worst_year: {
      s: "Every pick in his lowest-scoring full season.",
      g: "Every pick must be in the lowest-scoring season of his career among seasons with 1,000 minutes or more. Stars who were good even in their worst year are gold. The year menu jumps each player to that season." },
    pass_it_on: {
      s: "Each pick played for the previous pick's franchise.",
      g: "Pro rules: no stats, random seasons. Each pick must have played, at some point in his career, for the franchise your previous pick was drafted from. Well-traveled players keep the chain alive." },
    bird_rights: {
      s: "Players on the team they started with are half price.",
      g: "Every player on a card from the franchise he debuted with, with debuts from 1975 on, costs half his usual price. Home-grown stars come cheap. Gems and rip-offs still happen." },
    finishers: {
      s: "Both forwards average 1.5 assists or fewer.",
      g: "Your two forwards must each average 1.5 assists or fewer. They catch and finish, and the playmaking comes from your guards and center. The guards and center are free." },
    vintage: {
      s: "Your five seasons must average 1990 or earlier.",
      g: "Add up your five seasons and divide by five: the answer must be 1990 or earlier. One 2020 star needs a couple of 1970s or early 1980s seasons to pay for him. Presti locks each card's season, so a $1M year reroll is how you change them." },
    two_way_alphas: {
      s: "Usage tax off. Defense fines double.",
      g: "The usage tax is off, so stars can stack, but every defense fine doubles: weak pairs cost 4 to 6 net and an unguarded rim costs 4. Stars who also defend are the target." },
    earn_it: {
      s: "No 20-point scorer until two under-10 scorers are in.",
      g: "You cannot draft a 20-point scorer until two players who score under 10 are already on your roster. Build the supporting cast first, then buy the stars. The year menu can turn a star into a role player, and back." },
    rookie_center: {
      s: "Your center must be in his first or second season.",
      g: "Your center must be in his first or second season, with a debut from 1975 on. The year menu takes any big man back to his rookie years. Young centers who could defend on day one are the target." },
    play_big: {
      s: "Everyone plays the biggest position he ever played.",
      g: "Pro rules: no stats, random seasons. A player who ever qualified at center must play center, and one who ever qualified at forward must play forward. Only pure guards can play guard." },
    three_and_d: {
      s: "Both forwards: 3PT shooters with a steal a game.",
      g: "Your two forwards must each be a floor spacer (the 3PT chip) who averages at least 1 steal. That is the modern wing, and most eras have only a few. The guards and center are free." },
    finesse_forwards: {
      s: "Neither forward may average more than 5 rebounds.",
      g: "Your two forwards must each average 5 rebounds or fewer. The rebounding fine is still live, so your guards and center have to crash. Small forwards and wings fit; bruisers do not." },
    last_call: {
      s: "Pick five must cost at least half your money left.",
      g: "Your last pick must cost at least half of the money you have left when you make it. Arrive at pick five with $20M and he costs $10M or more; arrive with $4M and a $2M player works. Save for a finisher or spend down early." },
    five_tools: {
      s: "A scorer, rebounder, passer, thief and shot blocker.",
      g: "Each pick fills a different job: a 20-point scorer, a 9-rebound man, a 7-assist passer, a thief with 1.7 steals and a shot blocker with 1.7 blocks. A player who can do two jobs still fills only one. Cards grey out when a job would be left with nobody able to fill it." },
    six_degrees: {
      s: "Everyone must have played with someone you drafted.",
      g: "After your first pick, every player must have been a teammate of at least one player already on your roster, in any season. The dealer only offers franchises your roster played for. Journeymen connect everything." },
    the_off_year: {
      s: "Nobody in his career-high scoring season.",
      g: "No player may be drafted in the season he scored the most points per game. The year menu often defaults to that season, so check it. His second-best year is the play." },
    overlap: {
      s: "All five careers must share at least one season.",
      g: "Pro rules: no stats, random seasons. There must be at least one season when all five of your players were in the league together. Long careers keep the window open." },
    hub_center: {
      s: "Your center must lead your five in assists.",
      g: "Your center must average more assists than any of your guards and forwards. Until he is drafted, nobody else may average 3 or more. Passing bigs make this easy, so plan the rest around him." },
    frequent_flyers: {
      s: "Your five must have worn 22+ franchises combined.",
      g: "Count the franchises each pick played for in his career and add them up: your five need 22 or more, over 4 each. Journeymen are the currency, and a one-team star costs you. Cards grey out when the total can no longer get there." },
    nostalgia_sale: {
      s: "Every season before 1990 is half price.",
      g: "Every player on a pre-1990 card costs half his usual price. The 1970s and 1980s are on clearance, so a $1M year reroll can move a star into a cheap season. Gems and rip-offs still happen." },
    balanced_attack: {
      s: "Top and bottom scorer within 8 points.",
      g: "Your best scorer and your worst scorer must be within 8 points per game of each other. A 28-point star means nobody under 20; a five of 12-point players fits anywhere. Use the year menu to slide scorers into range." },
    nellie_ball: {
      s: "Every pick must be able to play forward.",
      g: "All five must qualify at forward, so your guards carry a G/F tag and your center an F/C tag. Positionless basketball, Don Nelson style. Presti cards show the tags, so read them before you pay." },
    young_legs: {
      s: "Both forwards must be in their first or second season.",
      g: "Your two forwards must be in their first or second season, with debuts from 1975 on. The year menu takes any forward back to his early years. The guards and center are free." },
    word_chain: {
      s: "Each first name starts with the last surname's last letter.",
      g: "Pro rules: no stats, random seasons. Each pick's first name must start with the last letter of the previous pick's surname: Kobe Bryant, then Tim Duncan, then Nick Van Exel. Surnames ending in Q, U or X must wait for your last pick." },
    inside_outside: {
      s: "One forward shoots threes, the other grabs 8 boards.",
      g: "Your forwards must be one floor spacer (the 3PT chip) and one 8-rebound player. A forward who does both can fill either role. The guards and center are free." },
    lottery_stars: {
      s: "Every pick from a bottom-third team that season.",
      g: "Every pick must come from a team in the weakest third of the league that season, ranked by its players' impact. Stars stuck on bad teams are the prize. Presti locks each card's season, so a $1M year reroll can find a lottery year." },
    stars_and_scrubs: {
      s: "Only two players may cost more than $2M.",
      g: "Two of your five may cost more than $2M, and the other three must cost $2M or less. Spend big twice and fill the rest from the bargain bin. The $1M gems are the whole game." },
    job_description: {
      s: "Each pick needs 3PT, 8 reb, 6 ast, 2 stl or 2 blk.",
      g: "Only seasons with a clear specialty can be drafted: a floor spacer (the 3PT chip), 8 rebounds, 6 assists, 2 steals or 2 blocks a game. Volume scorers with no specialty are off the board. Build a five whose jobs cover each other." },
    pick_and_roll: {
      s: "Your center must have played with one of your guards.",
      g: "Your center must have been a teammate, in some season, of at least one of your guards. Draft a guard with a long career first, then find his old big man. Cards grey out for bigs who never shared a roster with your guards." },
    the_leap: {
      s: "Every pick in a season his scoring jumped 3+ points.",
      g: "Every pick must be in a season when he scored at least 3 more points per game than the season before. Breakout years only. The year menu shows every leap a player made." },
    last_stop: {
      s: "Every pick wears the jersey he retired in.",
      g: "Pro rules: no stats, random seasons. Every pick must be playing for a franchise he played for in his final season, for careers that ended by 2025. Late-career stops count as much as long runs." },
    two_point_guards: {
      s: "Both guards must average 6 assists.",
      g: "Your two guards must each average at least 6 assists. Two quarterbacks share one ball, so the scoring has to come from the frontcourt. The forwards and center are free." },
    unsung: {
      s: "Nobody who finished top 50 in scoring that season.",
      g: "No pick may rank in the league's top 50 in points per game that season (among players with 1,000 minutes). Defenders, rebounders and passers carry the day. The year menu can find a star's quieter seasons." },
    big_man_sale: {
      s: "Anyone who can play center is half price.",
      g: "Every player with a C tag costs half his usual price today. Stock the frontcourt, and remember a center-eligible forward counts too. Gems and rip-offs still happen." },
    trust_the_process: {
      s: "Three players in year 5 or later costs 5 net.",
      g: "If three or more of your five are in their fifth season or later, the team pays 5 net (normally it takes two players in their 12th season, and costs 1). Two veterans ride free, so fill the rest with players in their first four years. Boards run 1980 on, so era skips never land in the 1970s." },
    anniversary: {
      s: "Every season ends in the same digit as your first.",
      g: "Your first pick's season sets a last digit: pick a 1996 season and every pick after must come from a season ending in 6. The year menu is the whole game. Count back in tens." },
    glass_season: {
      s: "Every pick in his career-high rebounding season.",
      g: "Every pick must be in the season he averaged the most rebounds of his career. For bigs that is often a peak, and for guards it can be a strange year. The year menu jumps each player to it." },
    outside_in: {
      s: "Guards first, then forwards, then the center.",
      g: "Pro rules: no stats, random seasons. Draft both guards before any forward, and both forwards before your center. The center comes last, so hope the last board has a good one." },
    five_out: {
      s: "No +2 rim protector up front earns 3 net.",
      g: "The rim rule flips. If none of your forwards or your center has a defensive rating (DBPM) of +2 or better, your five earns 3 net instead of paying the usual 2. Draft skilled bigs and shooters, and leave the elite shot blockers on the board." },
    starters: {
      s: "Every pick ranked top three in team minutes.",
      g: "Every pick must rank in the top three in minutes on his team that season. Workhorse seasons only: no bench years and no injury years. The year menu can find each player's heavy-minute seasons." },
    rising_ceiling: {
      s: "Pick one costs $4M or less, pick two $8M, up to $20M.",
      g: "Your price ceiling rises each round: $4M for pick one, $8M for pick two, then $12M, $16M and $20M for pick five. Save your star for the end and hope he is on the last board. Cheap gems early are the plan." },
    wing_stoppers: {
      s: "One forward above +1.5 DBPM, or pay 4 to 7 net.",
      g: "Your forwards need a real stopper. If neither forward has a defensive rating (DBPM) above +1.5 you pay 4 net, and if neither is above +0.5 you pay 7 (normally only two minus defenders cost 2 to 3). The guard-pair fine is off today." },
    feed_the_star: {
      s: "After a 22-point scorer, the next pick scores under 8.",
      g: "Every time you draft a 22-point scorer, your very next pick must average under 8 points. Stars come with a role-player chaser, so order your picks. A star on pick five is free." },
    share_evenly: {
      s: "All five within 3 assists of each other.",
      g: "Your highest and lowest assist men must be within 3 assists per game of each other. A 10-assist point guard means nobody under 7; a five of 2-assist players fits anywhere. Use the year menu to slide passers into range." },
    second_act: {
      s: "Nobody wearing the jersey of the team he started with.",
      g: "Pro rules: no stats, random seasons. Every pick must be playing for a franchise he did not play for in his debut season, with debuts from 1975 on. Boards run 1980 on. Second homes only." },
    unicorn_hunt: {
      s: "Modern boards. Four shooters and a +2 rim protector.",
      g: "Boards come from the 2010s and 2020s only, so era skips just bounce between the two. You need four floor spacers (2.5 net for each one missing) and a forward or center with a defensive rating (DBPM) of +2, or pay 4 net. Shooting bigs who block shots are the unicorns." },
    new_threads: {
      s: "Every pick in his first season with a new team.",
      g: "Every pick must be in his first season with a franchise he joined after his debut. Offseason signings and trade arrivals only. The year menu shows where each player landed." },
    ring_tax: {
      s: "Anyone on that season's title team costs double.",
      g: "Every player on a card from that season's NBA champion costs twice his usual price. Champions are expensive, so the value is on the runners-up and the also-rans. Gems and rip-offs still happen, and prices still top out at $26M." },
    height_cap: {
      s: "Your five may stand 32'6\" combined, no more.",
      g: "Add up your five's heights: 32'6\" is the limit, an average of 6'6\". Spend the inches evenly: two guards 6'2\" or shorter cost 2, and so do two frontcourt players 6'6\" or shorter. Cards grey out when a pick would leave too little height for the open slots." },
    peer_group: {
      s: "Everyone within one career year of your first pick.",
      g: "Your first pick's career year sets the stage, and everyone after must be within one season of it. Open with a rookie and you draft rookies and sophomores; open with a tenth-year veteran and you draft veterans. Debuts from 1975 on count." },
    by_the_book: {
      s: "One PG, one SG, one SF, one PF and one C.",
      g: "Draft by each season's listed position: one point guard, one shooting guard, one small forward, one power forward and one center. Cards only show G, F and C, so the ones whose listing does not fit grey out. The year menu can change a player's listing." },
    spell_the_team: {
      s: "Each surname starts with a letter in the team's name.",
      g: "Pro rules: no stats, random seasons. Every surname must start with a letter found in the franchise name on the board: on a Celtics board, C, E, L, T, I or S. A surname of several words counts as one." },
    big_guards: {
      s: "Both guards must average 5.5 rebounds.",
      g: "Your two guards must each average at least 5.5 rebounds. Tall guards and triple-double types are in, and small shooters are out at guard. The forwards and center are free." },
    the_hangover: {
      s: "Every pick from last season's champion.",
      g: "Every pick must come from the team that won the NBA title the season before. Defending champions, a year older. The year menu lines each player up with a title defense." },
    minimum_center: {
      s: "Your center costs $2M or less.",
      g: "Your center must cost $2M or less, which leaves at least $48M for your guards and forwards. Hunt the bargain big men. A $1M year reroll reshuffles a board with no cheap centers." },
    point_god: {
      s: "No elite passer on your five costs 6 net.",
      g: "Somebody on your five must rank in the top 1.5 percent of his season in assists, roughly its seven best passers. Without one, the offense stalls and costs 6 net (normally anyone in the top 20 percent clears it, and missing costs 2). Buy your point god early." },
    the_post: {
      s: "Draft your center first. Nobody may outscore him.",
      g: "Your first pick must play center, and no later pick may average more points than he did. A 28-point center frees the whole board; a 10-point rim protector caps everyone at 10. Choose the anchor with the rest of the draft in mind." },
    old_guard: {
      s: "Guards from before 1995, forwards from 2005 on.",
      g: "Your guards must be seasons from before 1995 and your forwards seasons from 2005 or later. The center can come from any era. The year menu can move a player across the line." },
    franchise_pillars: {
      s: "Only players with 5+ seasons for that franchise.",
      g: "Pro rules: no stats, random seasons. Only players who spent five or more seasons with the franchise on the board are eligible. The long-time starters and lifers are all that is left." },
    ball_hawks: {
      s: "Both forwards must average 1.4 steals.",
      g: "Your two forwards must each average at least 1.4 steals. Wings who jump passing lanes are in, and slow bigs are out at forward. The guards and center are free." },
    no_mvps: {
      s: "Nobody who ever won an MVP.",
      g: "The 33 MVP winners who played a season since 1974 are off the board, from Kareem and Bird to Jordan and LeBron. The best players who never won one are the whole draft. Presti prices still apply." },
    rookie_discount: {
      s: "Players in their first three seasons are half price.",
      g: "Every player in his first, second or third season, with debuts from 1975 on, costs half his usual price. Young stars are the bargain of the day. Gems and rip-offs still happen." },
    punt_the_boards: {
      s: "Your five may total 24 rebounds a game, at most.",
      g: "Add up your five's rebounds: 24 a game at most, under 5 each. The rebounding fine will almost surely hit for 2 or 3 net, so make it up with shooting, passing and defense. Cards grey out once a pick would blow the cap." },
    strangers: {
      s: "No two picks ever played for the same franchise.",
      g: "No two of your five may share a franchise anywhere in their careers, in any season. Journeymen are dangerous because they block a lot of teams. Lifers who stayed put are safe." },
    career_high: {
      s: "Every pick in his highest-scoring season.",
      g: "Every pick must be in the season he averaged the most points of his career. Peak scoring is not always peak value, so weigh the usage tax. The year menu jumps each player to it." },
    longevity: {
      s: "Your five careers must total 70 seasons or more.",
      g: "Pro rules: no stats, random seasons. Add up how many seasons each pick played from 1974 on: your five must reach 70, an average of 14. Draft the long careers early." },
    tax_holiday: {
      s: "Every fit rule is off. Pure talent.",
      g: "No usage tax, no shooting quota or bonus, and no defense, rim, rebounding, playmaking or mileage fines. Your score is the plain sum of your five's impact ratings. Presti prices still apply, so buy the most impact per dollar." },
    treadmill: {
      s: "Every pick from a middle-third team that season.",
      g: "Every pick must come from a team in the middle third of the league that season, ranked by its players' impact. Not contenders and not lottery teams. The year menu finds each player's middling seasons." },
    fair_market: {
      s: "No $1M gems and no rip-offs in the mid-tier.",
      g: "The mid-tier mispricing is off: no $1M gems and no rip-offs priced like stars (normally about 1 in 7 and 1 in 2). Prices still wobble a little each deal, but a cheap player is cheap for a reason. Value per dollar is the only edge." },
    usage_pyramid: {
      s: "One 26% usage star, two from 19 to 26, two under 19.",
      g: "Your five must be one player with a usage rate of 26 or more, two between 19 and 26, and two under 19. One alpha, two options, two role players. Cards grey out when a tier is full." },
    spread_out: {
      s: "No two of your seasons within six years of each other.",
      g: "Every pair of your seasons must be at least seven years apart, so your five span at least 28 years. Presti locks each card's season, so a $1M year reroll can move a player out of a crowded era. Plan the spread from the first pick." },
    old_man_center: {
      s: "Your center must be in his tenth season or later.",
      g: "Your center must be in his tenth season or later. Boards run 1990 on, so the 1970s and 1980s never come up. Old centers who still anchored a defense are the target." },
    alphabet_split: {
      s: "Guards' surnames A to M. Everyone else N to Z.",
      g: "Pro rules: no stats, random seasons. Your guards' surnames must start with A through M, and your forwards' and center's with N through Z. A surname of several words goes by its first letter." },
    scorer_and_setter: {
      s: "One guard scores 18 a game, the other dishes 6 assists.",
      g: "Your guards must be one 18-point scorer and one 6-assist passer; a player who does both can fill either role. The classic backcourt. The forwards and center are free." },
    jewelry: {
      s: "Guards and forwards must own a ring. Center is free.",
      g: "Your guards and forwards must have been on a title team at some point in their careers, from 1974 on. Any season of theirs counts. The center is free." },
    pay_the_backcourt: {
      s: "Your two guards must be your two priciest players.",
      g: "Nobody may cost more than either of your guards. Buy your stars at guard, and keep enough money for the second guard to match your priciest big. Cheap forwards and a cheap center are the plan." },
    stocks: {
      s: "Your five need 13 steals plus blocks a game.",
      g: "Add every pick's steals and blocks: your five must reach 13 a game, about 2.6 per man. Shot blockers and ball hawks at every position matter more than scorers today. Cards grey out once the math can no longer get you there." },
    frontcourt_mates: {
      s: "Your two forwards must have been teammates once.",
      g: "Your two forwards must have played on the same team in some season of their careers. Pick your first forward with a long, well-traveled career. Cards grey out for forwards who never shared a roster with him." },
    the_prequel: {
      s: "Every pick in the season before his best scoring year.",
      g: "Every pick must be in the season right before his highest-scoring season. The year before the peak is often almost as good. The year menu jumps each player to it." },
    homegrown: {
      s: "Every pick wears the jersey of the team he started with.",
      g: "Pro rules: no stats, random seasons. Every pick must be playing for a franchise he played for in his debut season, with debuts from 1975 on. Draft the home-grown stars." },
    glass_bonus: {
      s: "Elite team rebounding earns 3 net today.",
      g: "Every player's rebounding is ranked against his own season. If your five average the 88th percentile or better, the team earns 3 net, and the usual rebounding fine is off. Draft rebounders at every position, guards included." },
    so_close: {
      s: "Every pick from the team that lost the Finals.",
      g: "Every pick must come from the team that lost the NBA Finals that season. The dealer only offers boards that hold a runner-up season, and the year menu jumps each player to it. Great teams, no rings." },
    long_names: {
      s: "Your five surnames must total 36 letters or more.",
      g: "Count the letters in your five surnames: 36 at least, over 7 a man. Suffixes like Jr. do not count, and a two-word surname counts as one. Long names are worth their weight today." },
    shooter_premium: {
      s: "Every floor spacer costs 50 percent more.",
      g: "The market prices shooting today: every floor spacer's price is marked up 50 percent. Non-shooting stars are the bargains, but you still want about three shooters. Presti cards hide the 3PT chip, so memory tells you who shoots." },
    by_the_numbers: {
      s: "Pick one's season ends in 1, pick two's in 2, and so on.",
      g: "Your first pick's season must end in 1, your second in 2, your third in 3, your fourth in 4 and your fifth in 5. The year menu is the whole game. Plan which player covers which digit." },
    dime_season: {
      s: "Every pick in his career-high assists season.",
      g: "Every pick must be in the season he averaged the most assists of his career. For point guards that is often a peak year; for bigs it can be a strange one. The year menu jumps each player to it." },
    draft_class: {
      s: "Everyone debuted within a season of your first pick.",
      g: "Pro rules: no stats, random seasons. Your first pick's debut season sets the class, and everyone after must have debuted within one season of it, from 1975 on. The dealer only offers decades the class played in." },
    splash_backcourt: {
      s: "Both guards must be floor spacers.",
      g: "Both of your guards must carry the 3PT chip. Every era has a few, and the year menu can find a guard's shooting seasons. The forwards and center are free." },
    headline_acts: {
      s: "Every pick: top 80 in the league in scoring that season.",
      g: "Every pick must rank in the league's top 80 in points per game that season (among players with 1,000 minutes). Scorers only, so watch the usage tax. The year menu finds each player's big scoring seasons." },
    salary_match: {
      s: "Guards share a price band, and so do forwards.",
      g: "Your two guards must come from the same price band, and so must your two forwards: $1M to $3M, $4M to $7M, $8M to $12M, or $13M and up. Buy stars in pairs or bargains in pairs. The center is free." },
    bad_boys: {
      s: "Defense fines double. Shooting counts for nothing.",
      g: "Every defense fine doubles: two weak guards or two weak forwards cost 4 to 6 net, and an unguarded rim costs 4. Shooting counts for nothing today, no tax and no bonus. Draft stoppers, even ones who cannot shoot." },
    career_arc: {
      s: "Each pick is one season deeper into his career.",
      g: "Your first pick sets a career year, and each pick after must be exactly one season further along: year 3, then 4, then 5. Start no later than year 8, with debuts from 1975 on. The year menu lets you land every player on the right year." },
    the_decline: {
      s: "Guards and forwards in a season their scoring fell 3+.",
      g: "Your guards and forwards must be in a season when they scored at least 3 fewer points per game than the season before. The center is free. The year menu finds each player's down years." },
    inside_out: {
      s: "Center first, then both forwards, then both guards.",
      g: "Pro rules: no stats, random seasons. Draft your center first, then both forwards, then both guards. The guards come last, so hope the final boards have good ones." },
    point_forwards: {
      s: "Both forwards must average 3.5 assists.",
      g: "Your two forwards must each average at least 3.5 assists. Point forwards are rare, so grab one when you see him. The guards and center are free, and the year menu can find a forward's best passing season." },
    east_meets_west: {
      s: "Guards from the East, forwards from the West.",
      g: "Your guards must come from franchises in today's Eastern Conference and your forwards from the Western Conference. The center can come from anywhere. The board's franchise tells you which side it is on." },
    payday: {
      s: "Spend at most $8M per pick, running total.",
      g: "The owner releases $8M a round: after pick one you may have spent $8M, after pick two $16M, and so on up to $40M. Unspent money carries over, so a cheap first pick funds a star later. You can never spend ahead." },
    blue_collar: {
      s: "Every pick: one rebound for every two points.",
      g: "Every pick must grab at least one rebound for every two points he scores, so a 20-point scorer needs 10 boards. Most guards vanish, so your backcourt comes from low-scoring rebounders. The year menu can find a season that qualifies." },
    contemporaries: {
      s: "Every season within four years of your first pick's.",
      g: "Your first pick's season sets a window: every pick after must come from within four seasons of it. The dealer only offers decades that overlap the window. Presti locks each card's season, so a $1M year reroll can pull a player into range." },
    middle_man: {
      s: "Pick one is your median scorer: two above, two below.",
      g: "Your first pick is the middle of your scoring order: two later picks must outscore him and two must score less, with no ties. Open with a 15 to 20 point scorer to keep both sides open." },
    the_relay: {
      s: "No two of your five were ever in the league together.",
      g: "Pro rules: no stats, random seasons. No two of your five careers may overlap by even one season, so you are drafting five eras. Short careers leave more room for the rest." },
    stretch_five: {
      s: "Modern boards. Every center-eligible pick must shoot.",
      g: "Boards come from the 2010s and 2020s only, so era skips just bounce between the two. Any player with a C tag must be a floor spacer (the 3PT chip), even if you slot him at forward. Your center shoots threes today." },
    robin: {
      s: "Nobody who led his team in scoring that season.",
      g: "No player may be drafted in a season he led his team in scoring (among players with 1,000 minutes for that team). Sidekicks, defenders and second options only. Presti locks each card's season, so a $1M year reroll may land a star in a year he was not the top scorer." },
    max_center: {
      s: "Draft your center first. Nobody may cost more than him.",
      g: "Your first pick must play center, and no later pick may cost more than you paid for him. A $20M center frees the board; a $2M center caps everyone at $2M. Choose the anchor with the budget in mind." },
    point_of_attack: {
      s: "One guard above +1.5 DBPM, or pay 4 to 7 net.",
      g: "Your backcourt needs a real stopper. If neither guard has a defensive rating (DBPM) above +1.5 you pay 4 net, and if neither is above +0.5 you pay 7 (normally only two minus defenders cost 2 to 3). The forward-pair fine is off today. Sort by DBPM and find your guard." },
    alumni_night: {
      s: "Everyone must have played for your first pick's team.",
      g: "After your first pick, every player must have worn his franchise's jersey at some point in his career, whatever board he is on. Open with a deep franchise. Journeymen who passed through are gold." },
    graybeards: {
      s: "Your five's career years must total 45 or more.",
      g: "Add up the career year of each pick's season (a rookie is 1, a tenth-year veteran 10): your five need 45, an average of 9. Boards run 1990 on. Veterans are the whole draft." },
    unique_names: {
      s: "Only surnames no other player has ever worn.",
      g: "Pro rules: no stats, random seasons. Only players whose surname nobody else has worn since 1974 are eligible. The Johnsons and Joneses are off the board." },
    point_center: {
      s: "Every center-eligible pick must average 2 assists.",
      g: "Any player with a C tag must average at least 2 assists, wherever you slot him. Black-hole post scorers are out and passing bigs are in. The year menu can find a big man's best passing season." },
    parting_shot: {
      s: "Every pick in his last season with a team before moving on.",
      g: "Every pick must be in his final season with a franchise before he played for another one. Contract years and trade seasons, often. The year menu jumps each player to his parting seasons." },
    no_headliners: {
      s: "The priciest player on every board is off limits.",
      g: "Whoever carries the highest price on the board cannot be drafted, and neither can anyone tied with him. Sometimes that is a rip-off and nothing is lost; sometimes it is the best player alive. A $1M year reroll reprices the board." },
    long_ball: {
      s: "Everyone 6'7\" or taller. Missing shooters cost 3.",
      g: "Only players 6'7\" and taller are on the board, and each floor spacer short of three costs 3 net instead of 2. Your guards will be giants, so find the big men who can shoot." },
    full_house: {
      s: "Three picks from one season, two from another.",
      g: "Your five seasons must be three of one year and two of another, like a full house in poker. Once you have used two seasons, the dealer keeps to their decades. The year menu is the whole game." },
    scoring_tiers: {
      s: "One 22-point scorer, two at 12 to 22, two under 12.",
      g: "Your five must be one scorer at 22 points or more, two between 12 and 22, and two under 12. One star, two options, two role players. Cards grey out when a tier is full." },
    the_chain: {
      s: "Each pick was a teammate of the pick before him.",
      g: "Pro rules: no stats, random seasons. Each pick must have shared a roster with your previous pick in some season. The dealer only offers franchises your last pick played for." },
    help_defense: {
      s: "Both forwards must block 1.2 shots a game.",
      g: "Your two forwards must each average at least 1.2 blocks. Weak-side shot blockers are the target, and pure wings are out at forward. The guards and center are free." },
    ring_chasers: {
      s: "Every pick from that season's NBA champion.",
      g: "Every pick must come from the team that won the NBA title that season. The dealer only offers boards that hold a title season, and the year menu jumps a player to his championship year. Champions grade well, so the margin is thin." },
    market_crash: {
      s: "Stars cost $1M. Pricey players are rip-offs.",
      g: "The price curve collapsed: the five best players on every board almost always cost $1M or $2M, and anyone priced $10M or more is an overpriced middling player. Price no longer tells you who is good, so draft from memory. Ignore the big numbers." },
    punt_assists: {
      s: "Your five may total 10 assists a game, at most.",
      g: "Add up your five's assists: 10 a game at most, 2 each. Expect the 2-net fine for having no real passer. Draft scorers, rebounders and stoppers who never needed the ball in their hands." },
    crossover: {
      s: "Each pick played for a franchise already on your card.",
      g: "After pick one, every player must have played at some point for a franchise you have already drafted from. Each new franchise you draft from opens more doors. Journeymen connect everything." },
    rookie_backcourt: {
      s: "Both guards must be in their first or second season.",
      g: "Your two guards must be in their first or second season, with debuts from 1975 on. Young guards rarely grade well, so the value has to come from the frontcourt. The year menu takes almost any guard back to his early years." },
    ringless: {
      s: "Nobody who ever won a title.",
      g: "Pro rules: no stats, random seasons. Nobody who was on a title team in any season from 1974 to 2025 can be drafted. The best players who never won a ring are the whole draft." },
    bucket_getters: {
      s: "Both guards must average 18 points.",
      g: "Your two guards must each average at least 18 points. Scoring guards carry the offense, so the forwards and center can be defenders and rebounders. Watch the usage tax with two high-volume guards." },
    deadline_deals: {
      s: "Guards and forwards traded during that season.",
      g: "Your guards and forwards must be in a season when they played for two or more franchises. The center is free. The year menu finds each player's traded seasons." },
    pay_scale: {
      s: "Pick one: $10M or less. Everyone within $5M of him.",
      g: "Your first pick must cost $10M or less, and every pick after must cost within $5M of him. A $10M opener allows $5M to $15M; a $1M opener caps everyone at $6M. Set your pay scale on purpose." },
    early_arc: {
      s: "The 1980s. Each missing shooter costs 3 net.",
      g: "Every board comes from the 1980s, when about 1 in 4 regulars shot threes, so era skips re-deal the same decade. Each floor spacer short of three costs 3 net instead of 2. Find the decade's rare gunners." },
    the_straight: {
      s: "Five seasons in a row, any order. Like a poker straight.",
      g: "Your five seasons must be five consecutive years, like 1991 through 1995, in any order and with no season repeated. The dealer only offers decades that can still complete the run. The year menu is the whole game." },
    early_bloomers: {
      s: "Guards and forwards who scored 15 a game by year two.",
      g: "Your guards and forwards must be players who averaged 15 points in their first or second season, with debuts from 1975 on. Any season of theirs counts once they qualify. The center is free." },
    first_name_basis: {
      s: "Two of your five must share a first name.",
      g: "Pro rules: no stats, random seasons. At least two of your five must share a first name. Until the pair is made, keep a common first name on the roster, like Michael or Chris, and cards grey out when a pair can no longer happen." },
    unselfish: {
      s: "Every pick: one assist for every five points.",
      g: "Every pick must average at least one assist for every five points he scores, so a 20-point scorer needs 4 assists. Pure scorers vanish from the board. Point guards, passing bigs and low-usage connectors are what is left." },
    the_duo: {
      s: "Two of your five must be real teammates, same season.",
      g: "Two of your five must have played for the same team in the same season. If your first four picks never pair up, your last board comes from their franchises and decades, so plan it. The year menu can line up two teammates' seasons." },
    opening_steal: {
      s: "Your first pick must cost $1M.",
      g: "Your first pick must cost exactly $1M, a gem or a scrub. After that, spend freely. A $1M year reroll can refresh a first board with no steal worth taking." },
    defense_first: {
      s: "Your five's DBPM must add up to at least their OBPM.",
      g: "Add up your five's defensive ratings (DBPM) and offensive ratings (OBPM): defense must be at least even. One offensive star needs defensive specialists to pay for him. Sort by DBPM to find them, and cards grey out when the math can no longer balance." },
    give_and_go: {
      s: "Picks alternate between a shooter and a non-shooter.",
      g: "Your picks must alternate between floor spacers and non-shooters, starting either way. Presti cards hide the 3PT chip, but a card that breaks the pattern greys out, so the board tells you what you need next. Plan where your two or three shooters land." },
    pecking_order: {
      s: "No two picks may score within 3 points of each other.",
      g: "Every pair of your picks must differ by at least 3 points per game, so your five form a scoring ladder, like 25, 20, 15, 10 and 5. The year menu helps you land each rung. Plan the rungs early." },
    all_wings: {
      s: "Both forwards must also be able to play guard.",
      g: "Pro rules: no stats, random seasons. Your two forwards must be players who also qualify at guard, so they carry a G/F tag. Big forwards are out at forward, and the center slot is free." },
    win_now: {
      s: "Three players in year 10 or later earn 4 net.",
      g: "If three or more of your five are in their tenth season or later, the team earns 4 net, and the usual mileage fine for old legs is gone. Boards run 1990 on, so the 1970s and 1980s never come up. Veterans on contenders are the play." },
    power_forwards: {
      s: "Both forwards must average 8 rebounds.",
      g: "Your two forwards must each average at least 8 rebounds. Wings who only score are out at forward, and bruisers and rebounding bigs are in. The guards and center are free." },
    splurge_and_save: {
      s: "After an $8M+ pick, the next costs $2M or less.",
      g: "Every time you pay $8M or more for a player, your next pick must cost $2M or less. Stars come with a bargain chaser, so plan which board holds the cheap half. A splurge on your fifth pick is free." },
    punt_defense: {
      s: "Your five may total 5 steals plus blocks, at most.",
      g: "Add up your five's steals and blocks: 5 a game at most, 1 each. The defense fines still apply, so avoid pairing two weak defenders at guard or forward. Draft offense that does not need the stat sheet." },
    era_pairs: {
      s: "Guards from one decade, forwards from another.",
      g: "Your two guards must come from the same decade, and your two forwards from one different decade. The center is free. Presti locks each card's season, so a $1M year reroll can move a player into the decade you need." },
    swat_season: {
      s: "Every pick in his career-high blocks season.",
      g: "Every pick must be in the season he averaged the most blocks of his career. For guards that can be an odd year, and for bigs a defensive peak. The year menu jumps each player to it." },
    short_names: {
      s: "Your five surnames may total 30 letters at most.",
      g: "Pro rules: no stats, random seasons. Count the letters in your five surnames: 30 at most, 6 a man. Suffixes like Jr. do not count, and a two-word surname counts as one." },
    ball_hogs: {
      s: "Your five's usage must total 125 or more.",
      g: "Add up your five's usage rates: 125 or more. That guarantees at least 1.5 net of usage tax, so make every possession count with the most efficient stars. Cards grey out once the total can no longer get there." },
    bench_mob: {
      s: "Every pick ranked 6th or lower in team minutes.",
      g: "Every pick must rank sixth or lower in minutes on his team that season. Starters are out, so hunt sixth men, backups and injury-shortened star seasons. The year menu can find a star's bench years." },
    pay_by_size: {
      s: "Guards cost least, forwards more, the center most.",
      g: "No guard may cost more than a forward or your center, and no forward more than your center. Your priciest player plays in the middle. Cards grey out when a pick would break the order or leave too little money for the pricier slots still open." },
    stretch_fours: {
      s: "Both forwards must be floor spacers.",
      g: "Your two forwards must both carry the 3PT chip. Presti cards hide it, but non-shooters grey out in the forward slots. The guards and center are free." },
    the_point: {
      s: "Pick one: a 4-assist guard. Nobody after may assist more.",
      g: "Your first pick must be a guard who averages 4 or more assists, and no later pick may average more assists than he did. A 10-assist opener frees the board; a 4-assist opener caps everyone at 4. Choose the floor general carefully." },
    experience_cap: {
      s: "Your five's career years may total 18 at most.",
      g: "Add up the career year of each pick's season (a rookie is 1, a fifth-year player 5): your five may total 18 at most, with debuts from 1975 on. One veteran means four kids. The year menu takes anyone back to his early years." },
    lifers: {
      s: "Guards and forwards spent their whole career on one team.",
      g: "Pro rules: no stats, random seasons. Your guards and forwards must have played their entire careers, from 1974 on, for one franchise. The center is free." },
    role_forwards: {
      s: "Both forwards must use 16% of plays or fewer.",
      g: "Your two forwards must each have a usage rate of 16 or lower. The shots go to your guards and center, while your forwards defend, rebound and spot up. The usage you save keeps the tax away." },
    shaqs_rolodex: {
      s: "Every pick was once a teammate of Shaquille O'Neal.",
      g: "Every pick must have shared a roster with Shaq in some season. The dealer only offers his six franchises, from the 1990s to the 2010s. Kobe, Wade, Anfernee Hardaway and a long line of role players are all in play." },
    price_check: {
      s: "No two of your five may cost the same.",
      g: "Every price you pay must be different: five players, five price tags. A $1M gem only works once, so the next cheap pick costs $2M, then $3M. Cards grey out when a price is taken or the money cannot cover the rest." },
    extra_pass: {
      s: "Your five must total 26 assists a game.",
      g: "Add up the assists: your five need 26 a game, more than 5 each. Two real point guards get you most of the way, and passing forwards and centers do the rest. Scorers who never pass get hard to fit." },
    season_relay: {
      s: "Each season within three years of the pick before.",
      g: "Every pick's season must be within three years of your previous pick's season. You can drift about a decade over the draft, and the dealer only offers decades within reach. Presti locks each card's season, so a $1M year reroll can keep you in range." },
    swan_song: {
      s: "Every pick in one of his last two seasons.",
      g: "Every pick must be in one of the last two seasons of a career that ended by 2025. Most legends faded at the end, so hunt the ones who went out strong. The year menu shows each player's final seasons." },
    zigzag: {
      s: "Big, guard, big, guard, big. Start with a big.",
      g: "Pro rules: no stats, random seasons. Your picks must alternate between a big (forward or center) and a guard, starting with a big. Two guards and three bigs only fit that way." },
    forward_firepower: {
      s: "Both forwards must average 18 points.",
      g: "Your two forwards must each average at least 18 points. The wings carry the scoring, so the guards and center can be defenders and passers. The year menu can find a forward's big scoring season." },
    old_school_backcourt: {
      s: "Neither guard may be a floor spacer.",
      g: "Neither of your guards may carry the 3PT chip. You still want about three floor spacers, so the shooting has to come from your forwards and center. The year menu can find a guard's season before he added the three." },
    high_low: {
      s: "One guard costs $10M or more, the other $2M or less.",
      g: "Your guards must be one star at $10M or more and one bargain at $2M or less. Nothing in between plays guard. Until the star guard is in, keep $10M in the bank." },
    crash_the_glass: {
      s: "Rebounding fines run 4 to 7 net and start sooner.",
      g: "Every player's rebounding is ranked against his own season. If your five average below the 84th percentile you pay 4 net, and below the 76th you pay 7 (normally 2 below the 66th and 3 below the 60th). Guards who rebound are gold today, and a small-ball five pays heavily." },
    the_mentor: {
      s: "Pick one: a 10-year vet. The rest: first five seasons.",
      g: "Your first pick must be in his tenth season or later, and all four after him must be in their first five seasons. Boards run 1990 on, so the 1970s and 1980s never come up. One old head, four kids." },
    new_guard: {
      s: "Guards from 2010 on, forwards from before 2000.",
      g: "Your guards must be seasons from 2010 or later and your forwards seasons from before 2000. The center can come from any era. The year menu can move a player across the line." },
    play_small: {
      s: "Everyone plays the smallest position he ever played.",
      g: "Pro rules: no stats, random seasons. A player who ever qualified at guard must play guard, and one who ever qualified at forward must play forward. Only pure centers can play center." },
    glue_guards: {
      s: "Both guards must score 10 points or fewer.",
      g: "Your two guards must each average 10 points or fewer. Defenders, passers and spot-up shooters run the backcourt, and your stars play up front. The forwards and center are free." },
    no_point_guard: {
      s: "Neither guard may average more than 3 assists.",
      g: "Your two guards must each average 3 assists or fewer. The playmaking has to come from your forwards and center, or you pay the 2-net fine for having no real passer. Scoring and defensive guards fit fine." },
    top_shelf: {
      s: "Two of your first four picks must cost $12M or more.",
      g: "Buy two stars at $12M or more within your first four picks. That leaves at most $26M for the other three, so gems matter. Cards grey out when a pick would make the two stars unaffordable." },
    mid_range: {
      s: "One shooter is ideal. Each extra shooter costs 1.5.",
      g: "The spacing rule flips: you want exactly one floor spacer. Zero shooters costs 2 net, and every shooter past the first costs 1.5 (an elite gunner counts as one and a half). Presti cards hide the 3PT chip, so draft the non-shooters you remember." },
    mentorship: {
      s: "Each guard and forward pair: a rookie and a veteran.",
      g: "Each pair, guards and forwards, must be one player in his first three seasons and one in his tenth or later. The center is free. Boards run 1990 on." },
    the_encore: {
      s: "Every pick in the season after his best scoring year.",
      g: "Every pick must be in the season right after his highest-scoring season. Some stars kept rolling and some fell off, and the engine only sees the encore. The year menu jumps each player to it." },
    rentals: {
      s: "Only players who spent one season with that team.",
      g: "Pro rules: no stats, random seasons. Only players who spent exactly one season with the franchise on the board are eligible. Think trade-deadline pickups and one-year stops." },
    hundred_club: {
      s: "Your five must total 110 points a game.",
      g: "Add up your five's points per game: the total must reach 110, 22 a man. The usage tax will bite, so find stars who scored without eating every possession. Cards grey out once the math can no longer get there." },
    contenders: {
      s: "Every pick from a top-third team that season.",
      g: "Every pick must come from a team in the strongest third of the league that season, ranked by its players' impact. Role players on great teams count, and stars on bad teams do not. Presti locks each card's season, so a $1M year reroll can find a contending year." },
    no_middle: {
      s: "Every price is $3M or less, or $12M or more.",
      g: "Every player you draft must cost $3M or less or $12M or more. The middle of the market is closed, so it is stars and bargains. Two $12M stars leave $26M for three cheap picks." },
    tax_season: {
      s: "Every fine in the engine doubles.",
      g: "Usage over 120 costs 0.6 net a point (up to 12), two small guards or a small frontcourt cost 4, each missing shooter costs 4, defense pairs cost 4 to 6, and the rim, rebounding, no-playmaker and old-legs fines all double too. The shooting bonus stays. Talent alone will not save a five with holes, so cover every base." },
    then_and_now: {
      s: "Each pair: one from before 1995, one from 2005 on.",
      g: "Your two guards must be one season from before 1995 and one from 2005 or later, and the same goes for your two forwards. Seasons from 1995 through 2004 can only play center. Presti locks each card's season, so a $1M year reroll can move a player into the window you need." },
    vet_guards: {
      s: "Both guards in their tenth season or later.",
      g: "Your two guards must be in their tenth season or later. Boards run 1990 on, so the 1970s and 1980s never come up. Old point guards who still ran the show are the target." },
    common_names: {
      s: "Only surnames shared by five or more players.",
      g: "Pro rules: no stats, random seasons. Only surnames worn by five or more players since 1974 are eligible: Johnson, Williams, Smith, Jones and friends. The rare names are off the board." }
  };
  var VANILLA_COPY = {
    cap:     { s: "Straight Presti. No twist today.",
               g: "No modifier today, just Presti rules: $50M budget, randomized prices and seasons, $1M skips and rerolls. The board as dealt. May the prices roll kindly." },
    classic: { s: "Straight Classic. No twist today.",
               g: "No modifier today, just Classic rules: full stats on every card and one skip of each. Pure draft. Nothing to blame but your reads." },
    pro:     { s: "Straight Pro. No twist today.",
               g: "No modifier today, just Pro rules: no stats and randomized seasons. You either watched the games or you did not. The engine remembers either way." }
  };
  // The per-mode explainer paragraphs. Surfaces: the gate (i) and the HOW TO
  // PLAY sheet's fallback path. The sheet's structured bullet version lives in
  // app.js (RULES_MODE); if a mechanic changes, change both in the same
  // commit. Numbers here are the engine truth (sim-core + site_data scoring).
  var MODE_TIP = {
    cap: "Presti rules: $50M budget for five players, and every card shows its price. Prices are randomized each round. The true stars are priced honestly, most fringe players run $1M to $6M, and the mid-tier is the minefield: about half are rip-offs priced like stars, and a $1M steal turns up only on a board whose stars rolled overpriced. No contract tops $26M. Skipping the team or era, or rerolling the years, costs $1M a pull, as often as the money allows, but every empty roster spot needs $1M kept in reserve. Some boards are unwinnable. That is the game.",
    classic: "Classic rules: full stats on every card, and the season menu under each name lets you use any year of that player's career. One team skip and one era skip for the whole draft. The engine rewards star impact, wants about three shooters, taxes a five that needs more than one ball (team usage past 120), two small guards or a small frontcourt, and bad-defense pairs, and turns your net rating into a record the moment pick five lands.",
    pro: "Pro rules: no stats are shown and every player's season is randomized. You can still change the season with the menu under his name, also blind. Draft from memory. The engine grades your five with the real numbers at the end."
  };

  function vanillaBoard(base) {
    var b = base === "classic" || base === "pro" ? base : "cap";
    return { ch: null, base: b, name: VANILLA_NAME[b], blurb: VANILLA_BLURB[b],
             short: VANILLA_COPY[b].s, gate: VANILLA_COPY[b].g };
  }

  // The board for a day: deterministic pool pick, fail-soft to vanilla cap.
  function coreForId(id) {
    var CH = g.T82CH;
    var ch = CH && CH.byId ? CH.byId[id] : null;
    return ch ? { ch: ch, base: ch.base, name: DAILY_NAME[ch.id] || ch.name, blurb: ch.blurb,
                  short: (DAILY_COPY[ch.id] && DAILY_COPY[ch.id].s) || ch.blurb,
                  gate: (DAILY_COPY[ch.id] && DAILY_COPY[ch.id].g) || ch.blurb }
              : vanillaBoard("cap");                       // manifest miss -> never a dead day
  }

  function boardFor(key) {
    if (!validKey(key)) key = dayKey();
    var core = null;
    if (OVERRIDES[key]) {
      core = coreForId(OVERRIDES[key]);
    } else if (dayNum(key) >= dayNum(START3)) {
      var i3 = (dayNum(key) - dayNum(START3)) % POOL3.length;   // loops after 200 days
      core = coreForId(POOL3[i3]);
    } else if (dayNum(key) >= dayNum(START2)) {
      var i2 = (dayNum(key) - dayNum(START2)) % POOL2.length;
      core = coreForId(POOL2[i2]);
    } else {
      var pick = POOL[hash32("pick|" + key) % POOL.length];   // legacy hash: history replays untouched
      core = (pick && pick.id) ? coreForId(pick.id) : vanillaBoard(pick && pick.base);
    }
    return { key: key, num: dayNum(key), seed: resolvedSeed(key),
             ch: core.ch, base: core.base, name: core.name, blurb: core.blurb,
             short: core.short, gate: core.gate, badge: DAILY_BADGES[key] || null };
  }

  /* ---------- the verdict (screen-only, never in the paste) ----------
     One decodable English line under the record. The old 5-square grade was
     deleted 2026-07-13: it duplicated the printed record and needed a legend,
     which fails the self-explanatory bar. */
  function verdict(wins) {
    var L = GAMES - wins;
    if (L <= 0)  return "Perfect. Frame it.";
    if (L === 1) return "One game short. It stings forever.";
    if (L === 2) return "Two off perfect. So close it hurts.";
    if (L <= 6)  return "A juggernaut. Not immortal.";
    if (L <= 14) return "Contender. The group chat survives.";
    if (L <= 27) return "Playoff team. Nobody is scared.";
    if (L <= 41) return "The treadmill of mediocrity.";
    if (L <= 57) return "Lottery bound. Trust the process.";
    return "Historic. The bad kind.";
  }

  /* ---------- share text + beat link ---------- */
  function origin() {
    try {
      if (typeof location !== "undefined" && location.origin &&
          /^https?:/.test(location.origin)) return location.origin;
    } catch (e) { /* fall through */ }
    return "https://true82.net";
  }
  function signedNet(net) {
    var v = Math.round(net * 10) / 10;
    return (v > 0 ? "+" : "") + v.toFixed(1);
  }
  function beatLink(key, wins, net) {
    var d = String(key).replace(/-/g, "");
    var n = Math.max(-999, Math.min(999, Math.round(net * 10)));
    return origin() + "/?d=" + d + "&w=" + Math.max(0, Math.min(GAMES, wins)) + "&n=" + n;
  }
  function parseLink(search) {
    try {
      var sp = new URLSearchParams(search || "");
      var d = sp.get("d");
      if (!d || !/^\d{8}$/.test(d)) return null;
      var key = d.slice(0, 4) + "-" + d.slice(4, 6) + "-" + d.slice(6, 8);
      if (!validKey(key)) return null;
      var w = parseInt(sp.get("w"), 10);
      var n = parseInt(sp.get("n"), 10);
      return {
        key: key,
        w: Number.isFinite(w) ? Math.max(0, Math.min(GAMES, w)) : null,
        n: Number.isFinite(n) ? Math.max(-999, Math.min(999, n)) / 10 : null
      };
    } catch (e) { return null; }
  }
  // FORMAT LAW v2 (2026-07-19, owner-locked; full spec lives with the share
  // helpers in app.js):
  //   TRUE 82 #N
  //   {emoji }REC | {comp}
  //   Top X%                    <- res.pct == null omits the line
  //   (blank) five (blank) beat link
  // res: { wins, net, five, emoji, comp, pct } — emoji/comp/pct are prebuilt
  // by app.js (HISTORY_COMPS and the emoji bands live there; this file loads
  // first and never reaches forward). Five lines arrive as "'16 Curry"; a
  // pre-v2 official stored "G '16 Curry", so the leading slot token is
  // stripped here and history shares in the new shape. The en-dash on an
  // undefeated record survives from v1; net leaves the text but still rides
  // the beat link. If app.js's shareText shape ever changes, change this in
  // the same commit.
  function shareTextDaily(board, res) {
    var wins = res.wins, undef = wins >= GAMES;
    var rec = wins + (undef ? "\u2013" : "-") + (GAMES - wins);
    var lines = [
      "TRUE 82 #" + board.num,
      (res.emoji ? res.emoji + " " : "") + rec + (res.comp ? " | " + res.comp : "")
    ];
    if (res.pct != null) lines.push("Top " + res.pct + "%");
    var five = (res.five || []).map(function (s) {
      return String(s).replace(/^[GFC]\s+(?=')/, "");
    }).join("\n");
    var tail = "Beat my five: " + beatLink(board.key, wins, res.net);
    return lines.join("\n") + "\n\n" + five + "\n\n" + tail;
  }

  /* ---------- local record: official run + streak ----------
     Storage shape (key t82_daily1): {
       official: { [dayKey]: { num, wins, net, five, chId, nonce, hot, cap, pct } },
       streak: { count, lastKey }
     }
     Kept small: the last 400 day-entries survive a write (pruned oldest-first;
     about 150 bytes a day), so the archive can show a year of your officials.
     v56: archive: { [dayKey]: { num, wins, net, runs } } holds your best replay
     of a past board (the archive's practice runs), apart from official, so a
     replay can never claim a day or move the streak. Fail-soft: no storage ->
     every call still returns sane values and the mode plays normally. */
  var LS_KEY = "t82_daily1";
  var KEEP_DAYS = 400;
  // v66: a test day (setTestDay) keeps its own record, so testing a future board never marks a real day played or
  // moves the real streak; clearTestRecord() starts the test over.
  function lsKey() { return TEST_DAY ? LS_KEY + "_test" : LS_KEY; }
  function clearTestRecord() { try { g.localStorage && g.localStorage.removeItem(LS_KEY + "_test"); } catch (e) {} }
  var store = {
    get: function () {
      try { return JSON.parse((g.localStorage && g.localStorage.getItem(lsKey())) || "null"); }
      catch (e) { return null; }
    },
    set: function (obj) {
      try { g.localStorage && g.localStorage.setItem(lsKey(), JSON.stringify(obj)); return true; }
      catch (e) { return false; }
    }
  };
  function _setStore(s) { store = s; }   // test hook: inject a fake storage
  function blank() { return { official: {}, archive: {}, streak: { count: 0, lastKey: "" } }; }
  function getState() {
    var s = store.get();
    if (!s || typeof s !== "object") return blank();
    if (!s.official || typeof s.official !== "object") s.official = {};
    if (!s.archive || typeof s.archive !== "object") s.archive = {};
    if (!s.streak || typeof s.streak !== "object") s.streak = { count: 0, lastKey: "" };
    return s;
  }
  function officialFor(key) {
    var o = getState().official[key];
    return o && typeof o.wins === "number" ? o : null;
  }
  function prune(official) {
    var keys = Object.keys(official).sort();
    while (keys.length > KEEP_DAYS) delete official[keys.shift()];
    return official;
  }
  // First finish of the day claims official. The same run may amend itself
  // (matching nonce) so a Heat Check that lands after the results screen still
  // updates the official totals; a later run never can.
  function recordOfficial(key, num, res, nonce) {
    if (!validKey(key)) return null;
    var s = getState();
    var cur = s.official[key];
    if (cur && cur.nonce !== nonce) return cur;            // official already claimed by another run
    s.official[key] = {
      num: num, wins: res.wins, net: Math.round(res.net * 10) / 10,
      five: (res.five || []).slice(0, 5), chId: res.chId || null,
      nonce: nonce || "", hot: res.hot ? 1 : 0,
      cap: (res.cap == null ? null : res.cap),
      // v28: /api/percentile's answer, written by the official run's own
      // nonce-matched amend so the menu-tile share carries line 3 later.
      pct: (res.pct == null ? null : res.pct)
    };
    if (!cur) {                                            // streak advances once per day
      var prevKey = dayKey(keyToNoon(key).getTime() - 86400000);
      s.streak.count = (s.streak.lastKey === prevKey) ? s.streak.count + 1
                      : (s.streak.lastKey === key ? s.streak.count : 1);
      s.streak.lastKey = key;
    }
    prune(s.official);
    store.set(s);
    return s.official[key];
  }
  // v56: a replay of a past board (the archive) keeps your best record for that day and counts the runs.
  // It never touches official or the streak.
  // newRun: count this run (false when the same run re-renders, e.g. after a Heat Check lands).
  function recordArchive(key, num, wins, net, newRun) {
    if (!validKey(key)) return null;
    var s = getState(), cur = s.archive[key], add = newRun === false ? 0 : 1;
    var better = !cur || wins > cur.wins || (wins === cur.wins && net > cur.net);
    s.archive[key] = better
      ? { num: num, wins: wins, net: Math.round(net * 10) / 10, runs: (cur ? cur.runs : 0) + add }
      : { num: cur.num, wins: cur.wins, net: cur.net, runs: cur.runs + add };
    prune(s.archive);
    store.set(s);
    return s.archive[key];
  }
  function archiveFor(key) {
    var a = getState().archive[key];
    return a && typeof a.wins === "number" ? a : null;
  }
  // Streak as of `key`: yesterday's streak survives until today is missed.
  function streakFor(key) {
    var s = getState().streak;
    if (!s.lastKey) return 0;
    if (s.lastKey === key) return s.count;
    var prevKey = dayKey(keyToNoon(key).getTime() - 86400000);
    return s.lastKey === prevKey ? s.count : 0;
  }

  var API = {
    EPOCH: EPOCH, GAMES: GAMES, POOL: POOL,
    POOL2: POOL2, START2: START2, POOL3: POOL3, START3: START3,
    DAILY_COPY: DAILY_COPY, MODE_TIP: MODE_TIP,
    OVERRIDES: OVERRIDES, SEED_OVERRIDES: SEED_OVERRIDES, DAILY_BADGES: DAILY_BADGES, setTestDay: setTestDay, clearTestRecord: clearTestRecord,
    dayKey: dayKey, dayNum: dayNum, validKey: validKey, shiftKey: shiftKey,
    hash32: hash32, seedFor: seedFor, boardFor: boardFor,
    setSeeds: setSeeds, seedIsServers: seedIsServers, seedsLoaded: seedsLoaded,
    MINT_FROM: MINT_FROM, needsServerSeed: needsServerSeed,
    verdict: verdict, signedNet: signedNet,
    shareTextDaily: shareTextDaily, beatLink: beatLink, parseLink: parseLink,
    officialFor: officialFor, recordOfficial: recordOfficial, recordArchive: recordArchive, archiveFor: archiveFor,
    streakFor: streakFor, getState: getState, _setStore: _setStore
  };
  g.T82DAILY = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof globalThis !== "undefined" ? globalThis : this);
