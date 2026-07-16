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

  var VANILLA_NAME = { cap: "Straight Presti", classic: "Straight Classic", pro: "Straight Pro" };
  var VANILLA_BLURB = {
    cap: "No modifier. $50, random prices, the board as dealt.",
    classic: "No modifier. Full stats, one skip each. Pure draft.",
    pro: "No modifier. No stats, random seasons. Memory only."
  };
  // Display aliases ONLY (manifest law: challenges.js is never edited from
  // here). Three manifest names carry a Week suffix that reads wrong on a
  // daily board; everything else renders verbatim.
  var DAILY_NAME = { hand_check: "Hand-Check Rules", post_up_week: "Post-Up Rules", iso_week: "Iso Rules" };

  /* ---------- the copy layer (presentation only, manifest untouched) ----------
     s = tile subtitle: short, slightly cryptic, one line.
     g = gate description: terse and TRUE to the cfg/filter/pick/deal hooks.
     Every string is em-dash-free and pinned by tests. Boards that lock eras or
     teams via deal hooks say so, so nobody thinks a dead skip button is a bug. */
  var DAILY_COPY = {
    inflation:       { s: "Every price doubled. Same fifty.",
                       g: "Every price on the board is doubled. Your budget is not. The bargain bin is the whole store now." },
    deflation:       { s: "Half-off market, half a wallet.",
                       g: "Every price cut in half, but the budget is 25. Cheap is not the same as affordable." },
    petty_cash:      { s: "Ownership cut you to $35.",
                       g: "Budget slashed to 35. Same market, same five spots. Somebody on this roster takes a minimum deal." },
    minimum_wage:    { s: "Twenty dollars. Five spots.",
                       g: "The budget is 20. That is not a typo. Scouting is the whole game today." },
    deep_pockets:    { s: "$82 to burn. The market noticed.",
                       g: "Budget 82, but every price runs 60 percent hot. Money means less than you think." },
    gem_rush:        { s: "The bin is full of $1 steals.",
                       g: "Half the marginal players cost a dollar. Budget is 40, because you will not need more. Right?" },
    the_gauntlet:    { s: "Everything is slightly worse.",
                       g: "Traps up, gems gone, prices padded, budget trimmed to 45. No single rule kills you. Together they might." },
    golden_age:      { s: "A yard sale of $1 steals.",
                       g: "One in three marginal players is a one dollar steal. Full budget. Draft like it is a yard sale." },
    odd_lots:        { s: "Odd prices only.",
                       g: "Every price you pay must be an odd number. The ten dollar superstar is behind glass. Count before you commit." },
    even_money:      { s: "Even prices only.",
                       g: "Every price you pay must be even. The one dollar gems glitter behind glass." },
    balanced_books:  { s: "No contract over $14.",
                       g: "Hard ceiling: no single contract above 14. Superteams are an accounting error today." },
    bargain_bin:     { s: "Nothing over six bucks.",
                       g: "Six dollar ceiling on every contract. Your scouting department IS the roster." },
    the_descent:     { s: "Each pick cheaper than the last.",
                       g: "No contract pricier than the one before it. Draft your star first. It is all downhill from there." },
    escalator:       { s: "Each pick pricier. Market runs hot.",
                       g: "No contract cheaper than the one before it, in a market running 40 percent hot on a 70 budget. Start humble. Save room." },
    moneyball:       { s: "$30, iron-man seasons only.",
                       g: "Budget 30, and everyone on the board logged 2,500 plus minutes. Cheap and durable. Get weird." },
    seventies_money: { s: "The 1970s, with a briefcase.",
                       g: "The whole board lives in the 1970s, so era skips do nothing today. Presti pricing still applies." },
    luxury_tax:      { s: "Ball-dominance taxed triple.",
                       g: "The usage tax runs at nearly triple rate. Your stars cost twice: once in dollars, once in shots." },
    analytics_dept:  { s: "Five shooters. The suits insist.",
                       g: "Quota: five shooters, and the fine for missing it went up. Feel the spreadsheet." },
    post_up_week:    { s: "Threes do not count today.",
                       g: "No spacing tax, no spacing bonus. Shooting buys you nothing either way. 1994 rules. Feed the block." },
    the_triangle:    { s: "Share the ball or else.",
                       g: "The usage budget is slashed to 85. Five alphas will eat each other. Share the ball or the engine shares your losses." },
    iso_week:        { s: "Five alphas, zero consequences.",
                       g: "The usage tax is off. Ball-dominance is free today. History's most toxic lineups are finally legal." },
    heliocentric:    { s: "One sun, four moons.",
                       g: "Usage budget 130, tax nearly nothing. Build the solar system around one star and orbit accordingly." },
    lockdown:        { s: "Bad defense costs double.",
                       g: "Defensive penalties doubled. Two bad defenders in the same position group is a felony today." },
    no_defense:      { s: "Nobody guards anybody.",
                       g: "All defensive taxes waived. Defense is free to ignore. Draft the arsonists." },
    hand_check:      { s: "The '90s board, '90s hand checks.",
                       g: "1990s picks only, so era skips do nothing today. Hand-check rules: bad defense hurts half again as much. Guard somebody." },
    pace_and_space:  { s: "2010s onward. Four shooters minimum.",
                       g: "Modern boards only, era skips are dead, and the suits want four shooters minimum. It is 2016 forever in here." },
    short_kings:     { s: "Nobody over 6'3\".",
                       g: "Height cap 6'3\", center included. The board filters itself. Find the giants among the small." },
    two_way:         { s: "Plus on BOTH ends, every pick.",
                       g: "Every pick must grade positive on offense AND defense. The one-way star watches from home." },
    stoppers:        { s: "Positive defenders only.",
                       g: "Every pick must be a plus defender. Offense is your problem to solve." },
    generalists:     { s: "Two positions minimum.",
                       g: "Positionless day. Every pick must qualify at two or more positions across his career. No specialists allowed." },
    specialists:     { s: "Exactly one position each.",
                       g: "Every pick qualifies at exactly one position, career-wide. One job, done well. No hybrids." },
    no_skips:        { s: "Zero skips. The board is the board.",
                       g: "No team skips, no era skips. The hand you are dealt is the hand you play. Character-building, allegedly." },
    choosy_gm:       { s: "Five skips of each. Be picky.",
                       g: "Five team skips and five era skips. Swipe left until the board deserves you." },
    small_ball_apoc: { s: "Nobody over 6'5\". Five shooters.",
                       g: "Height cap 6'5\" and a five-shooter quota, on Presti pricing. The future arrived and it is tiny." },
    grit_grind:      { s: "No shooters exist. Memphis rules.",
                       g: "Every shooter is filtered off the board, but the spacing fine is halved. Defense and mud." },
    twin_towers:     { s: "6'8\" minimum, board-wide.",
                       g: "Everyone on the board is 6'8\" or taller, and wing defense goes untaxed. It is 1994 in the frontcourt." },
    blind_nineties:  { s: "The '90s, from memory.",
                       g: "1990s only, no stats, era skips dead. You watched these games. Prove it." },
    blind_y2k:       { s: "The 2000s, no numbers.",
                       g: "2000s only, blind. That one guy on the Kings: good good, or just loud?" },
    blind_eighties:  { s: "The '80s, unlabeled.",
                       g: "1980s only, blind, era skips dead. Half these names are your dad's opinions." },
    blind_modern:    { s: "2010 onward, no stats.",
                       g: "Modern era only, blind. You have highlight-reel confidence. The engine has receipts." },
    blind_california:{ s: "Four California teams, blind.",
                       g: "Lakers, Clippers, Warriors, Kings. From memory, no stats. Team skips just shuffle the same four." },
    small_blind:     { s: "Blind, and nobody over 6'4\".",
                       g: "No stats and a 6'4\" height cap. Poker rules: memory is your only chip." },
    tall_blind:      { s: "Blind, 6'8\" and up.",
                       g: "No stats, giants only. You remember the big men. Do you remember their seasons?" }
  };
  var VANILLA_COPY = {
    cap:     { s: "Straight Presti. The board as dealt.",
               g: "No modifier. Fifty dollars, random prices, five spots. The purest form of the problem." },
    classic: { s: "Straight Classic. Full stats, pure draft.",
               g: "No modifier. Full stats on every card, one skip each. Nothing to blame but your reads." },
    pro:     { s: "Straight Pro. Memory only.",
               g: "No modifier. No stats, randomized seasons. You either watched or you didn't." }
  };
  // The (i) explainers per base mode. The cap text MIRRORS #capTip in app.js
  // renderDraft; if one changes, change both in the same commit.
  var MODE_TIP = {
    cap: "$50 salary cap. Player salaries are randomized each round to fair value, bargain, or rip-off. Player year available is also randomized. Unlimited rerolls of team, era, player years, but it costs $1 from your salary cap each time. Possibly unwinnable.",
    classic: "Full stats on every card. One team skip and one era skip. The engine taxes bad defense, cramped spacing, and too many mouths to feed. Net rating decides your season.",
    pro: "No stats shown, and each player's season is randomized. Change seasons with the menu if you dare. Pure memory. The engine keeps the receipts."
  };

  function vanillaBoard(base) {
    var b = base === "classic" || base === "pro" ? base : "cap";
    return { ch: null, base: b, name: VANILLA_NAME[b], blurb: VANILLA_BLURB[b],
             short: VANILLA_COPY[b].s, gate: VANILLA_COPY[b].g };
  }

  // The board for a day: deterministic pool pick, fail-soft to vanilla cap.
  function boardFor(key) {
    if (!validKey(key)) key = dayKey();
    var pick = POOL[hash32("pick|" + key) % POOL.length];
    var core = null;
    if (pick && pick.id) {
      var CH = g.T82CH;
      var ch = CH && CH.byId ? CH.byId[pick.id] : null;
      core = ch ? { ch: ch, base: ch.base, name: DAILY_NAME[ch.id] || ch.name, blurb: ch.blurb,
                    short: (DAILY_COPY[ch.id] && DAILY_COPY[ch.id].s) || ch.blurb,
                    gate: (DAILY_COPY[ch.id] && DAILY_COPY[ch.id].g) || ch.blurb }
                : vanillaBoard("cap");                     // manifest miss -> never a dead day
    } else {
      core = vanillaBoard(pick && pick.base);
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
  // res: { wins, net, five: ["G '16 Curry", ...], cap: number|null } — five
  // lines are prebuilt by app.js with its own surname logic so flames stay
  // consistent. FORMAT LAW: this is the house shareText format byte-for-byte
  // (separators, blank lines, emoji promotion, the "|  Net" double space and
  // the en-dash on an undefeated record) with exactly two lines swapped: the
  // header carries the board identity instead of a mode label, and the footer
  // carries the beat link instead of a bare domain. If shareText's format ever
  // changes, change this in the same commit.
  function shareTextDaily(board, res) {
    var wins = res.wins, losses = GAMES - wins, undef = wins >= GAMES;
    var head = (undef ? "\uD83C\uDFC6" : "\uD83C\uDFC0") + " TRUE 82 Daily #" + board.num + " \u00B7 " + board.name;
    var line2 = (res.cap != null)
      ? wins + "-" + losses + " | $" + res.cap + " Cap Spc | Net " + signedNet(res.net)
      : (undef ? "\uD83C\uDFC6" : "\uD83D\uDCCA") + " " + wins + (undef ? "\u2013" : "-") + losses + " |  Net " + signedNet(res.net);
    var five = (res.five || []).join("\n");
    var tail = "Beat my five: " + beatLink(board.key, wins, res.net);
    return head + "\n" + line2 + "\n\n" + five + "\n\n" + tail;
  }

  /* ---------- local record: official run + streak ----------
     Storage shape (key t82_daily1): {
       official: { [dayKey]: { num, wins, net, five, chId, nonce, hot } },
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
      cap: (res.cap == null ? null : res.cap)
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
