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
   Tests: test.js §15 vm-loads this file and pins seeds, tiers, codec, storage. */
(function (g) {
  "use strict";

  var EPOCH = "2026-07-12";            // Daily #1
  var SEED_NS = "t82d1|";              // bump to reseed all future boards
  var GAMES = 82;

  /* ---------- day math (all local-time, string keys) ---------- */
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function dayKey(now) {
    var d = now != null ? new Date(now) : new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }
  // Key -> local-noon Date; noon dodges DST edges when differencing days.
  function keyToNoon(key) {
    var p = String(key).split("-");
    return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0, 0);
  }
  function validKey(key) { return /^\d{4}-\d{2}-\d{2}$/.test(String(key)); }
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
     small_ball_apoc). Retired ids stay live in the manifest for replays. */
  var START2 = "2026-07-19";
  var OVERRIDES = {
    // 2026-07-18 shipped small_ball_apoc, whose C slot was fillable only via
    // name-collision ghosts. Swapped mid-day for the fixed build of the same
    // fantasy. Morning officials stand; the board simply became playable.
    "2026-07-18": "small_ball_five"
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
     reference: $50M cap budget, mid-tier gem odds about 1 in 7 with half the
     mid-tier rip-offs, usage budget 110 taxed at about 0.1 net per point over,
     3 floor spacers wanted (zero shooters bleeds about 6 net), pair-defense
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
                       g: "Half of the mid-tier players are mispriced at $1M today (normal is about 1 in 7) and rip-offs are rare. The catch: your budget is $40M. Fill most of your five with steals and spend the savings on one real star." },
    the_gauntlet:    { s: "Everything slightly worse. Budget $45M.",
                       g: "Budget down to $45M, prices up 25 percent, 4 in 5 mid-tier players are rip-offs, and the $1M gems have nearly vanished. No single rule kills you. Together they grind. Take the least-bad price on each board and keep moving." },
    golden_age:      { s: "A third of the mid-tier costs $1M.",
                       g: "About 1 in 3 mid-tier players is a $1M steal today (normal is about 1 in 7), on a full $50M budget. Fill the back of the roster for pocket change, then buy the best star on the market." },
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
    luxury_tax:      { s: "Usage tax at four times the rate.",
                       g: "The usage tax runs at more than four times the normal rate: every point of team usage above 110 costs about 0.4 net instead of 0.1. One alpha is affordable. Two is a felony. Surround your star with low-usage role players." },
    analytics_dept:  { s: "Five shooters required.",
                       g: "You must draft FIVE floor spacers, up from the usual three, and each missing shooter costs 2.5 net instead of 2. Miss the quota by two and you have burned about a dozen wins. If he cannot shoot, he does not board." },
    post_up_week:    { s: "Shooting counts for nothing.",
                       g: "The spacing rules are switched off: zero shooters costs nothing, five shooters earns nothing. A jumper is decoration today. Draft raw talent and defense and feed the block like it is 1994." },
    the_triangle:    { s: "Usage budget cut to 85.",
                       g: "The team usage budget drops from 110 to 85, and every point over it is taxed. Five stars who all need the ball will eat each other alive. Two low-usage glue guys are worth more than a third alpha today." },
    iso_week:        { s: "Usage tax off. Stack the alphas.",
                       g: "The usage tax is off: total team usage is free no matter how high it climbs. The sharing penalty that normally breaks superteams is gone, so stack every ball-dominant star you can find." },
    heliocentric:    { s: "Usage budget 130, tax at half rate.",
                       g: "The usage budget rises from 110 to 130 and overage is taxed at about half the normal rate. Build the whole team around one giant-usage sun and let four moons orbit. The engine will barely notice the ball-hogging." },
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
                       g: "Pro rules, giants only: no stats, randomized seasons, everyone 6'8\" or taller. You remember the big men fine. The test is remembering which of their seasons were the good ones." }
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
    cap: "Presti rules: $50M budget for five players, and every card shows its price. Prices are randomized each round. The true stars are priced honestly, most fringe players run $1M to $6M, and the mid-tier is the minefield: about 1 in 7 is a $1M steal and about half are rip-offs priced like stars. Skipping the team or era, or rerolling the years, costs $1M a pull, as often as the money allows, but every empty roster spot needs $1M kept in reserve. Some boards are unwinnable. That is the game.",
    classic: "Classic rules: full stats on every card, and the season menu under each name lets you use any year of that player's career. One team skip and one era skip for the whole draft. The engine rewards star impact, wants about three shooters, taxes ball-hog pileups and bad-defense pairs, and turns your net rating into a record the moment pick five lands.",
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
    } else if (dayNum(key) >= dayNum(START2)) {
      var i2 = (dayNum(key) - dayNum(START2)) % POOL2.length;
      core = coreForId(POOL2[i2]);
    } else {
      var pick = POOL[hash32("pick|" + key) % POOL.length];   // legacy hash: history replays untouched
      core = (pick && pick.id) ? coreForId(pick.id) : vanillaBoard(pick && pick.base);
    }
    return { key: key, num: dayNum(key), seed: seedFor(key),
             ch: core.ch, base: core.base, name: core.name, blurb: core.blurb,
             short: core.short, gate: core.gate };
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
  //   Top X% of drafters        <- res.pct == null omits the line
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
    if (res.pct != null) lines.push("Top " + res.pct + "% of drafters");
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
     Kept tiny: only the last 14 day-entries survive a write (pruned oldest-
     first) so the blob never grows unbounded. Fail-soft: no storage -> every
     call still returns sane values and the mode plays normally. */
  var LS_KEY = "t82_daily1";
  var KEEP_DAYS = 14;
  var store = {
    get: function () {
      try { return JSON.parse((g.localStorage && g.localStorage.getItem(LS_KEY)) || "null"); }
      catch (e) { return null; }
    },
    set: function (obj) {
      try { g.localStorage && g.localStorage.setItem(LS_KEY, JSON.stringify(obj)); return true; }
      catch (e) { return false; }
    }
  };
  function _setStore(s) { store = s; }   // test hook: inject a fake storage
  function blank() { return { official: {}, streak: { count: 0, lastKey: "" } }; }
  function getState() {
    var s = store.get();
    if (!s || typeof s !== "object") return blank();
    if (!s.official || typeof s.official !== "object") s.official = {};
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
    DAILY_COPY: DAILY_COPY, MODE_TIP: MODE_TIP,
    dayKey: dayKey, dayNum: dayNum, validKey: validKey,
    hash32: hash32, seedFor: seedFor, boardFor: boardFor,
    verdict: verdict, signedNet: signedNet,
    shareTextDaily: shareTextDaily, beatLink: beatLink, parseLink: parseLink,
    officialFor: officialFor, recordOfficial: recordOfficial,
    streakFor: streakFor, getState: getState, _setStore: _setStore
  };
  g.T82DAILY = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof globalThis !== "undefined" ? globalThis : this);
