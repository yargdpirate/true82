/* ---------- THE LEADERBOARD LAB: LB.data, the fake crowd (v1, 2026-10-04) ----------
   The owner judges these boards on his phone, in screenshots, and he will believe them or he
   will not. So this file's only job is believability: every number here is read off a
   distribution shaped like the one the real engine produces, not off a random generator.
   That is the difference between a board he can make a decision about and a wall of
   placeholder text.

   Three ideas carry the whole file:

   1. A BOARD IS A SORTED LIST, so nothing is generated and sorted. Every score is read
      straight off the distribution's quantile function at that rank. A field of 4,412
      costs the same as a field of 9, ties fall out for free (wins are integers, so the
      75-win block on a 4,412-GM Daily really is about 500 rows long), and the rows are
      stable: flipping TOP to AROUND YOU cannot change what rank 3 scored.
   2. DETERMINISTIC, with no clock. No Math.random(), no Date.now(). A T82LB- code has to
      reproduce the owner's exact screen next week, so the lab stands on one fixed day (the
      debut, 2026-10-20) and every date is counted back from it.
   3. DISPLAY STRINGS, formatted here. Records read "78-4", nets "+19.8", money "$38M",
      streaks "12 days". boards.js prints what it is handed and never does arithmetic.

   Shapes measured off this repo rather than invented (SPEC.md, "FAKE DATA"): Daily wins
   p10/p50/p90 = 66/75/80 with about 4.7% perfect, Classic net p10/p50/p90 =
   14.6/20.1/27.5, cheapest Presti 82-0 with a hard floor at $38M, streaks massed at 1 to 4
   with a few at 8 to 12.

   ES5, no libraries, no DOM at load time. This file defines LB.data and nothing else. */
(function (g) {
  "use strict";

  /* ---------------- the lab's one fixed day ---------------- */
  var LAB_Y = 2026, LAB_M = 9, LAB_D = 20;   // 2026-10-20, the debut. Month is 0 based.
  var BOARD_NO = 412;                        // the Daily has run daily since 2025-09-03
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var CAP_BUDGET = 50;                       // mirrors app.js CAP_BUDGET: a Presti five shares $50M
  var FLOOR_M = 38;                          // the best known Presti 82-0, from the verification pass
  var CHEAP_BAR = 10;                        // the stated bar on the cost view ("opens when 10 GMs qualify")

  /* THE SAMPLE FLOOR, and why it is 30. Below about 30 GMs a median is one or two people
     dressed up as a population, and the spec already suppresses the percentile below the
     same number ("Top 3% of 31 players is one person dressed as precision"). One floor for
     both, so the line above the list and the line on the player's row can never disagree.
     Boards whose crowd line is a pure COUNT (the 82-0 Club, Cheapest) are exempt: "3
     perfect seasons" is true at any size because it claims nothing about a distribution. */
  var CROWD_FLOOR = 30;

  /* ---------------- small helpers ---------------- */
  function int(v, d) { var n = parseInt(v, 10); return isFinite(n) ? n : d; }
  function clamp(n, lo, hi) { return n < lo ? lo : (n > hi ? hi : n); }
  function comma(n) {
    var s = String(Math.round(n)), out = "", i, c = 0;
    for (i = s.length - 1; i >= 0; i--) {
      out = s.charAt(i) + out;
      c++;
      if (c % 3 === 0 && i > 0) out = "," + out;
    }
    return out;
  }
  function rec(w) { return w + "-" + (82 - w); }                 // the game's currency
  function signed1(v) {                                          // accounts.js signed(), byte for byte
    var x = Math.round((v || 0) * 10) / 10;
    return (x > 0 ? "+" : "") + x.toFixed(1);
  }
  function money(m) { return "$" + Math.round(m) + "M"; }
  function dayLabel(back) {
    // Date arithmetic off a fixed constant, in UTC so a tester's timezone cannot move it.
    var d = new Date(Date.UTC(LAB_Y, LAB_M, LAB_D) - back * 86400000);
    return MON[d.getUTCMonth()] + " " + d.getUTCDate();
  }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }

  /* ---------------- randomness ---------------- */

  /* A small LCG, as the contract asks. An LCG's low bits are nearly periodic (bit 0 just
     alternates), which shows up as stripes the moment you use it to pick from a list, so
     the state is finalised with a multiply and two shifts before it is returned. Same
     treatment mulberry32 gets in art-lab. */
  function rng(seed) {
    var s = (int(seed, 82) >>> 0) || 1;
    s = (s ^ 0x9E3779B9) >>> 0;              // scramble once: seed 82 and seed 83 start out unalike
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 0x2C1B3C6D) >>> 0;
      return ((t ^ (t >>> 12)) >>> 0) / 4294967296;
    };
  }

  /* The same quality of noise, but addressable: hash(seed, a, b) is the value this seed
     always gives for (a, b). That is what lets a row be generated from its rank alone, so
     a window at rank 400 costs nothing and the rows never shift under a view change. */
  function hash(seed, a, b) {
    var h = ((int(seed, 82) >>> 0) ^ 0x85EBCA6B) >>> 0;
    h = Math.imul(h ^ ((a | 0) >>> 0), 0xC2B2AE35) >>> 0;
    h = Math.imul(h ^ ((b | 0) >>> 0), 0x27D4EB2F) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0x165667B1) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  /* ---------------- distributions ---------------- */

  /* A mass table is [[value, share of the field], ...] from the top down, and tableAt
     returns both the value at a rank AND the rank range of its whole tie block. The block
     is what makes the tie-break visible: the net ramp below needs to know it is row 7 of a
     494-row pile of 75-win seasons. A value whose share rounds to no rows at this field
     size is skipped rather than given a row, so a nine-GM board is NOT 82, 81, 80, 79: it
     clusters where the mass is, which is the whole point. */
  function tableAt(table, rank, field, tail) {
    var c = 0, lo = 1, hi, i;
    for (i = 0; i < table.length; i++) {
      c += table[i][1];
      hi = Math.floor(c * field + 0.5);
      if (hi < lo) continue;
      if (rank <= hi) return { v: table[i][0], lo: lo, hi: Math.min(hi, field) };
      lo = hi + 1;
    }
    var step = Math.max(1, Math.floor(tail.share * field + 0.5));
    var k = Math.floor((rank - lo) / step);
    return {
      v: Math.max(tail.min, tail.from - k),
      lo: lo + k * step,
      hi: Math.min(field, lo + (k + 1) * step - 1)
    };
  }

  /* A curve is [[quantile, value], ...] ascending, read with straight lines between the
     knots. Used where the quantity is continuous (money, net, a monthly sum) and the exact
     ties do not carry meaning the way a win total's do. */
  function curveAt(curve, q) {
    var i, a, b, span, t;
    if (q <= curve[0][0]) return curve[0][1];
    for (i = 1; i < curve.length; i++) {
      if (q <= curve[i][0]) {
        a = curve[i - 1]; b = curve[i];
        span = b[0] - a[0];
        t = span > 0 ? (q - a[0]) / span : 0;
        return a[1] + (b[1] - a[1]) * t;
      }
    }
    return curve[curve.length - 1][1];
  }
  function qOf(rank, field) { return field > 0 ? (rank - 0.5) / field : 0.5; }

  /* THE DAILY'S WIN TOTALS. Built to hit the measured marks: half the room at 75 or better
     (cumulative .500 lands exactly on the 75 row), about a tenth at 80 or better (.115),
     about a tenth below 67 (.900), and 4.7% perfect. The mass thins HARD above 78 because
     that is what the engine does, and the tail below 60 is thin and long rather than cut
     off, because a 48-30 Daily does happen. */
  var DAILY_WINS = [
    [82, 0.047], [81, 0.030], [80, 0.038], [79, 0.052], [78, 0.062], [77, 0.072],
    [76, 0.087], [75, 0.112], [74, 0.092], [73, 0.076], [72, 0.062], [71, 0.050],
    [70, 0.041], [69, 0.033], [68, 0.026], [67, 0.020], [66, 0.016], [65, 0.013],
    [64, 0.011], [63, 0.009], [62, 0.008], [61, 0.007], [60, 0.006]
  ];
  var DAILY_TAIL = { share: 0.0025, from: 59, min: 41 };

  /* EVERY DAY IS A DIFFERENT BOARD, which is the single most believable thing about the
     Daily and the easiest to forget in fake data. One shared board means one shared
     difficulty: on a generous five everybody's number is up and the 82-0 pile at the top is
     deep, on a cruel five nobody is perfect. So the seed picks the day's generosity as a
     whole-win shift, and the clamp at 82 does the rest (an easy day piles more rows onto
     82, exactly as it would in the table). The range is deliberately lopsided, minus three
     to plus one: a plus-one day puts 7.7% of the field on 82-0, which is the game's own 8%
     tuning, while plus two would put 11.5% there, more perfect seasons in one morning than
     the engine makes. A minus-three day has no perfect season at all, which is a real day
     and the thinnest the 82-0 Club ever looks. The median moves with the shift, so the
     crowd line above the list stays true to the list. */
  function dayShift(seed) { return Math.floor(hash(seed, 0, 5) * 5) - 3; }   // -3 to +1 wins

  function dailyWinsAt(rank, field, seed) {
    var blk = tableAt(DAILY_WINS, rank, field, DAILY_TAIL);
    blk.v = clamp(blk.v + dayShift(seed), 41, 82);
    return blk;
  }

  /* THE NET TIE-BREAK, which is load-bearing: the shipped order is wins DESC, net DESC, and
     nine rows reading 81-1 is the normal case on a Daily, not an edge case. So inside one
     tie block the net MUST descend, visibly and without exception, or the list reads as
     arbitrary and the owner is right not to trust it.

     Net tracks wins at about +1.1 a win, which puts the median 75-win season at +21.5 and
     agrees with the measured Classic spread. Inside a block the net is read off a logistic
     quantile rather than a straight ramp, and that is the one decision here worth
     explaining. A big Daily piles hundreds of rows onto one win total (4.7% of 4,412 GMs
     perfect is over two hundred rows of 82-0), and a straight ramp would space them evenly:
     the best season of two hundred would sit a hundredth of a point above the second. A
     quantile spreads the extremes and compresses the middle, the way the real thing does,
     so the top of the pile separates cleanly (+36.0, +34.7, +34.1 ...) while fifty rows
     through the middle genuinely do read the same net. That middle is not a bug: it is the
     run of identical rows the layout has to survive, and it should be in front of him.

     Monotonic by construction, because the quantile is monotonic and the only seeded term
     is constant across the whole block. No wobble, deliberately: a wobble big enough to see
     is a wobble big enough to put a 29.5 above a 29.6 and make the sort look broken. */
  function dailyNet(blk, rank, seed) {
    var centre = 5.0 + (blk.v - 60) * 1.1 + (hash(seed, blk.v, 13) - 0.5) * 1.2;
    var w = Math.max(1, blk.hi - blk.lo + 1);
    var u = clamp((rank - blk.lo + 0.5) / w, 0.0005, 0.9995);
    return centre - 2.0 * Math.log(u / (1 - u)) * 0.55;
  }

  var MONTH_SUM = [                  // sum of your ten best Dailies, out of a possible 820
    [0, 793], [0.002, 781], [0.01, 770], [0.05, 752], [0.15, 728], [0.30, 706],
    [0.50, 683], [0.70, 620], [0.85, 520], [0.95, 390], [1, 148]
  ];
  var NET_AVG = [                    // average of your best three Classic nets in 30 days
    [0, 31.2], [0.002, 29.8], [0.01, 28.6], [0.05, 27.0], [0.15, 25.4], [0.35, 23.6],
    [0.50, 22.6], [0.70, 21.0], [0.85, 19.3], [0.95, 17.2], [1, 13.5]
  ];
  var PAR_GAP = [                    // net minus par net, averaged over your best five
    [0, 6.8], [0.002, 6.1], [0.01, 5.5], [0.05, 4.6], [0.15, 3.6], [0.35, 2.3],
    [0.50, 1.6], [0.70, 0.7], [0.85, -0.3], [0.95, -1.6], [1, -4.4]
  ];

  /* STREAKS CLUSTER HARD AT SMALL INTEGERS, which is the spec's own argument for showing
     only the top of this board: a neighbourhood window here is a wall of identical numbers.
     A third of the room is on one day and a quarter on two; eight days and up is a tenth of
     a percent of the field. Nothing is printed beside the count, because the real tie-break
     (total days played) is a second number the board deliberately does not carry. */
  var STREAKS = [
    [14, 0.001], [13, 0.002], [12, 0.003], [11, 0.004], [10, 0.006], [9, 0.008],
    [8, 0.012], [7, 0.020], [6, 0.030], [5, 0.050], [4, 0.090], [3, 0.150], [2, 0.250]
  ];
  var STREAK_TAIL = { share: 1, from: 1, min: 1 };

  /* CHEAPEST 82-0 HAS A HARD FLOOR AND A HARD CEILING: $38M is the best anyone has found
     and $50M is the whole cap, so the entire board lives in twelve dollars. Integer dollars
     in a twelve-wide range means ties are the common case, and the real tie-break (the
     first GM to find that number keeps it) is a timestamp the row does not print. */
  var MONEY_M = [38, 39, 40, 41, 41, 42, 43, 44, 45, 45, 46, 47, 48, 48, 49, 50];

  /* THE 82-0 RATE BOARD, the one that is CUT, generated so the owner can see WHY in one
     screenshot. Two separate pathologies, both real and both visible at once: at the top,
     small-denominator flukes (3 of 10 seasons is 30% and one player in 25 who stops at ten
     gets there by luck alone), and underneath, the launch-week shape, a column of 0.0% rows
     ordered by who ground the most seasons, which is a most-games-played ranking wearing a
     perfection rate's label. */
  // Six entries, not twelve, so a page of twelve rows shows the flukes AND the column of
  // zeros underneath them in ONE screenshot. That pair is the whole argument for the cut.
  var RATE_TOP = [[3, 10], [2, 10], [2, 13], [1, 10], [1, 18], [1, 52]];

  /* ---------------- names ---------------- */

  /* Two thirds handles and plain first names, one third the server's own "GM-" + tag
     default, because on day one that is what most signed-in players are actually called
     (auth.js writes display_name as the literal "GM-" + tag). Every name clears the real
     filter /^[A-Za-z0-9 _.\-']{3,20}$/, and the worst cases are in here on purpose: three
     characters, twenty characters, a space, an apostrophe. No real player's name anywhere,
     invented ones only. */
  var POOL = [
    "Deep Two", "BankShot", "GlassEater", "Rim Runner", "Pick n Pop", "Hoopin'",
    "Elbow Jumper", "Baseline Dave", "The Chase Down", "Transition Tom", "Garbage Time",
    "Boxscore Betty", "Help Side", "Corner Three", "Zone Buster", "Switch Everything",
    "Free Throw Line", "Weak Side Will", "Triple Threat", "Pump Fake", "Floor Spacer",
    "Bench Mob", "Clipboard Carl", "Dunk Contest", "Trade Deadline", "Buyout Season",
    "Luxury Tax", "Two Way Deal", "Sixth Man", "Full Court", "Shot Clock", "Iso Merchant",
    "Spot Up Steve", "Glass Cleaner", "Paint Patrol", "Mid Range Dad", "Rotation Guy",
    "Catch and Shoot", "Pace and Space", "Rebound Rita", "Stretch Five", "Vet Minimum",
    "Draft Night", "Lottery Pick", "Cap Space Kyle", "Hardwood Hal", "Backdoor Cut",
    "Give and Go", "Hesi Pullup", "Pick and Roll Rodney", "Rim O'Clock", "Box and One",
    "O'Shea",
    "Mina", "Dev", "Oli", "Tasha", "Bren", "Kaz", "Jax", "Noor", "Rafa", "Sol", "Wes",
    "Imani", "Pato", "Yuki", "Thea", "Marco", "Nadia", "Omar", "Ivy"
  ];
  /* The walk below steps 23 names at a time. 23 shares no factor with the pool's length, so
     it visits every name before it repeats: no two rows inside a whole page collide by
     accident, and the only shared names on a board are the ones planted on purpose. */
  var POOL_STEP = 23;
  var LONG = ["The Triple Threatens", "Pick and Roll Rodney"];   // both exactly 20 characters
  var APOS = ["Rim O'Clock", "O'Shea", "Hoopin'"];               // the escaping worst case
  var SHORT = ["Jax", "Kaz", "Dev"];                             // the three character minimum
  var TAGC = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";                 // no I, O, 0 or 1: a tag gets read aloud
  var YOU_NAME = "Gray";                                         // the owner, so the duplicate lands on him
  var YOU_TAG = "82GZ";

  function tagAt(rank, seed, salt) {
    var s = "", i;
    for (i = 0; i < 4; i++) s += TAGC.charAt(Math.floor(hash(seed, rank * 8 + i, 300 + salt) * TAGC.length));
    return s;
  }
  function twinOf(youRank) { return youRank >= 2 ? youRank - 1 : 2; }

  /* THE DUPLICATE NAME PROBLEM, planted where the owner will meet it. Two players can both
     call themselves Gray and the board cannot tell them apart, which is the entire argument
     for the #TAG toggle, so there is always a pair:
       - the viewer is always Gray, and the row next to the viewer is a different Gray. That
         pair is visible in AROUND YOU and in any TOP page the viewer appears on.
       - when the viewer is off the top page (or off the board entirely) a second pair sits
         at ranks 4 and 5, so the toggle still has something to prove in that view.
     Everything else is a function of (rank, seed, board), never of the view, so switching
     TOP to AROUND YOU cannot rename rank 3 under him. */
  function nameFor(rank, seed, youRank, salt) {
    if (youRank > 0 && rank === youRank) return { name: YOU_NAME, tag: YOU_TAG };
    if (youRank > 0 && rank === twinOf(youRank)) return { name: YOU_NAME, tag: tagAt(rank, seed, salt) };
    if ((youRank <= 0 || youRank > 12) && (rank === 4 || rank === 5)) {
      return { name: "Corner Three", tag: tagAt(rank, seed, salt) };
    }
    /* The three worst cases the real name filter allows, planted in the top ten where the
       owner will actually see them: twenty characters (does the name column ellipsise or
       shove the score off the row), an apostrophe (is the name escaped), and the three
       character minimum (does a short name leave the row looking unfinished). Each sits on a
       different rank on each board, so no single GM appears to lead the whole site. */
    if (rank === 1 + (salt % 3)) return { name: LONG[salt % 2], tag: tagAt(rank, seed, salt) };
    if (rank === 6 + (salt % 3)) return { name: APOS[salt % 3], tag: tagAt(rank, seed, salt) };
    if (rank === 9 + (salt % 2)) return { name: SHORT[salt % 3], tag: tagAt(rank, seed, salt) };
    if (hash(seed, rank, 3 + salt) < 0.34) {
      var t = tagAt(rank, seed, salt);
      return { name: "GM-" + t, tag: t };
    }
    var off = Math.floor(hash(seed, salt, 11) * POOL.length);
    return {
      name: POOL[(rank * POOL_STEP + off) % POOL.length],
      tag: tagAt(rank, seed, salt)
    };
  }

  function gms(n, seed) {
    var out = [], i, count = Math.max(0, int(n, 0));
    for (i = 1; i <= count; i++) out.push(nameFor(i, int(seed, 82), 0, 0));
    return out;
  }

  /* ---------------- the boards ---------------- */

  // the shipped slate's keys, so boards.js can ask for either slate by its own names
  var ALIAS = { daily: "today", me: "you", mine: "you", perfect: "club" };

  /* Field sizes. The ranked boards take recipe.field exactly as the owner's slider sets it,
     because that slider is how he decides whether the median, the "of N" line and the
     percentile appear at all. Three boards cannot: their row count is a different quantity
     from "GMs on the board", and the spec fixes the numbers. 4,412 GMs gives 41 perfect
     seasons, which is the figure the spec itself prints in the 82-0 header, and the Presti
     third of those is the 14 that opens the cost view. */
  function fieldFor(id, field) {
    var club = Math.floor(field * 0.0093 + 0.5);
    if (id === "club") return club;
    if (id === "cheapest") return Math.floor(club * 0.34 + 0.5);
    if (id === "rate") return Math.floor(field * 0.04 + 0.5);   // only 10-season GMs qualify
    return field;
  }

  function clubBack(i, seed) {                 // days before the lab's day, newest first
    var back = 0, k;
    for (k = 0; k < i; k++) back += 1 + Math.floor(hash(seed, k, 23) * 3);
    return back;
  }
  /* Mode rides on the row as a chip instead of costing the slate a control row, so all
     three modes have to be on the first page or the owner cannot judge the chip. A weighted
     cycle rather than a seeded draw: it still comes out about half Classic, a third Presti
     and a sixth Pro, but Presti and Pro are guaranteed inside the first four rows instead of
     turning up six rows down on an unlucky seed. */
  var CLUB_MODES = ["Classic", "Presti", "Classic", "Pro", "Classic", "Presti"];
  function clubMode(i) { return CLUB_MODES[i % CLUB_MODES.length]; }

  var BOARDS = {

    today: {
      note: "One attempt a day. The first one counts.",
      emptyWhy: "Nobody has posted today's board yet. Sign in before you play and yours is the first row on it.",
      row: function (rank, c) {
        var blk = dailyWinsAt(rank, c.field, c.seed);
        /* The net prints only where it discriminates, which is the spec's rule and also the
           honest one: on a 4,412-GM board almost every row ties and the net is the only
           thing separating them, while on a nine-GM board no two rows tie and a second
           number is noise. */
        var tied = blk.hi > blk.lo;
        return { score: rec(blk.v), sub: tied ? signed1(dailyNet(blk, rank, c.seed)) : null };
      },
      median: function (c) { return rec(dailyWinsAt(midRank(c.field), c.field, c.seed).v); },
      crowd: function (c) {
        var m = dailyWinsAt(midRank(c.field), c.field, c.seed).v;
        /* "under" is literally true of the median: half the field scored m or worse, so half
           finished under m + 1. Phrased as a fact about the board, never about the player. */
        return "Board #" + BOARD_NO + ". " + comma(c.field) + " GMs. Half the room finished under " +
          rec(Math.min(82, m + 1)) + ".";
      }
    },

    month: {
      note: "Your ten best Dailies this month, out of ten. A day you drop costs you nothing. The month follows your own clock.",
      emptyWhy: "No Dailies this month yet. This board fills one day at a time.",
      row: function (rank, c) {
        var sum = Math.round(curveAt(MONTH_SUM, qOf(rank, c.field)) + (hash(c.seed, 0, 41) - 0.5) * 16);
        /* Days played is read back OUT of the sum rather than generated beside it, because
           the board is ordered by the sum and the two have to agree. A sum of 480 is far
           likelier to be six good days than ten terrible ones (the Daily floor is around
           60), so dividing by a typical day is the honest reading, and it is what puts "3 of
           10 days" on the row the spec asks for. */
        var days = clamp(Math.floor(sum / 74 + 0.5), 1, 10);
        return { score: String(sum), sub: days + " of 10 days" };
      },
      median: function (c) {
        return String(Math.round(curveAt(MONTH_SUM, qOf(midRank(c.field), c.field)) + (hash(c.seed, 0, 41) - 0.5) * 16));
      },
      crowd: function (c) {
        var m = Math.round(curveAt(MONTH_SUM, qOf(midRank(c.field), c.field)) + (hash(c.seed, 0, 41) - 0.5) * 16);
        return MON[LAB_M] + " " + LAB_Y + ". " + comma(c.field) + " GMs. Half the room is under " + (m + 1) + ".";
      }
    },

    streak: {
      note: "Days in a row you played the Daily. Verified seasons only.",
      emptyWhy: "No streaks yet. Play two days in a row and you are on this board.",
      row: function (rank, c) {
        var blk = tableAt(STREAKS, rank, c.field, STREAK_TAIL);
        return { score: plural(blk.v, "day", "days"), sub: null };
      },
      median: function (c) {
        return plural(tableAt(STREAKS, midRank(c.field), c.field, STREAK_TAIL).v, "day", "days");
      },
      crowd: function (c) {
        var m = tableAt(STREAKS, midRank(c.field), c.field, STREAK_TAIL).v;
        var top = tableAt(STREAKS, 1, c.field, STREAK_TAIL).v;
        return comma(c.field) + " GMs. Half the room is on " + plural(m, "day", "days") +
          ". The longest run is " + top + ".";
      }
    },

    club: {
      note: "Every verified 82-0 season, newest first. No ranking, and no limit on how many GMs get in.",
      emptyWhy: "No perfect seasons yet. The first 82-0 opens this page.",
      countOnly: true,                          // the crowd line claims no distribution
      unranked: true,                           // a membership list, so never windowed (see board())
      row: function (rank, c) {
        /* Not a ranking: rank is this entry's place in a list ordered newest first, and
           boards.js is free to print nothing in the rank column. The score column carries
           the date and the sub carries the mode, which becomes the chip on the row. */
        return { score: dayLabel(clubBack(rank - 1, c.seed)), sub: clubMode(rank - 1) };
      },
      median: function () { return null; },
      crowd: function (c) {
        var week = 0, i;
        for (i = 0; i < c.field && i < 400; i++) { if (clubBack(i, c.seed) < 7) week++; }
        var since = week === 0 ? "None in the last week." : (week === 1 ? "One this week." : week + " this week.");
        return plural(c.field, "perfect season", "perfect seasons") + ", newest first. " + since;
      }
    },

    cheapest: {
      note: "Least money spent on a perfect Presti season. Dailies do not count.",
      // board() replaces this with a version that also counts the GMs who do qualify
      emptyWhy: "This opens when " + CHEAP_BAR + " GMs have a perfect Presti season. The floor to beat is " + money(FLOOR_M) + ".",
      countOnly: true,
      row: function (rank, c) {
        var used = rank <= MONEY_M.length ? MONEY_M[rank - 1] : CAP_BUDGET;
        var left = CAP_BUDGET - used;
        return { score: money(used), sub: left > 0 ? money(left) + " left" : "no cap left" };
      },
      median: function () { return null; },     // the floor is the point here, not the middle
      crowd: function (c) {
        return plural(c.field, "GM", "GMs") + " have done it under the cap. The floor is " + money(FLOOR_M) + ".";
      }
    },

    net: {
      note: "Average of your best three Classic nets in the last 30 days. Three seasons to qualify.",
      emptyWhy: "Nobody has three Classic seasons in the last 30 days yet.",
      row: function (rank, c) {
        return { score: signed1(curveAt(NET_AVG, qOf(rank, c.field)) + (hash(c.seed, 0, 43) - 0.5) * 2.4), sub: null };
      },
      median: function (c) {
        return signed1(curveAt(NET_AVG, qOf(midRank(c.field), c.field)) + (hash(c.seed, 0, 43) - 0.5) * 2.4);
      },
      crowd: function (c) {
        var m = curveAt(NET_AVG, qOf(midRank(c.field), c.field)) + (hash(c.seed, 0, 43) - 0.5) * 2.4;
        return comma(c.field) + " GMs with three Classic seasons in the last 30 days. Half the room is at " +
          signed1(m) + " or lower.";
      }
    },

    rate: {
      note: "Share of ordinary seasons that went 82-0. Needs 10 seasons in the mode to qualify. Dailies have their own boards.",
      emptyWhy: "Nobody has 10 seasons in this mode yet.",
      row: function (rank, c) {
        var imm, runs, t;
        if (rank <= RATE_TOP.length) {
          imm = RATE_TOP[rank - 1][0];
          runs = RATE_TOP[rank - 1][1];
        } else {
          imm = 0;
          // 0.0% rows ordered by runs DESC: the most-seasons-played ranking the spec warns about
          t = c.field > RATE_TOP.length ? (rank - RATE_TOP.length) / (c.field - RATE_TOP.length) : 1;
          runs = Math.floor(10 + 133 * Math.pow(1 - t, 3) + 0.5);
        }
        return { score: (imm * 100 / runs).toFixed(1) + "%", sub: imm + " of " + runs };
      },
      median: function (c) { return c.field > RATE_TOP.length * 2 ? "0.0%" : null; },
      crowd: function (c) {
        var zeros = Math.max(0, c.field - RATE_TOP.length);
        return comma(c.field) + " GMs have 10 seasons in this mode. " + comma(zeros) + " of them read 0.0%.";
      }
    },

    outdrafted: {
      note: "How far your five beat the obvious five from the same tickets. Your best five seasons in the last 30 days.",
      emptyWhy: "Nobody has five seasons in the last 30 days yet.",
      row: function (rank, c) {
        var v = curveAt(PAR_GAP, qOf(rank, c.field)) + (hash(c.seed, 0, 47) - 0.5) * 1.0;
        var r = Math.round(v * 10) / 10;
        /* The contract's example row reads "+4.2 over par". It is split into the score and
           the sub so the number lands in the score column with every other board's number
           and the words ride in the sub, which boards.js prints after the middle dot: the
           row still reads "+4.2 over par". */
        return { score: signed1(r), sub: r > 0 ? "over par" : (r < 0 ? "under par" : "level with par") };
      },
      median: function (c) {
        return signed1(curveAt(PAR_GAP, qOf(midRank(c.field), c.field)) + (hash(c.seed, 0, 47) - 0.5) * 1.0);
      },
      crowd: function (c) {
        var m = curveAt(PAR_GAP, qOf(midRank(c.field), c.field)) + (hash(c.seed, 0, 47) - 0.5) * 1.0;
        return comma(c.field) + " GMs. Half the room beats the obvious five by " + signed1(m) + " or less.";
      }
    }
  };

  function midRank(field) { return Math.max(1, Math.floor(field / 2 + 0.5)); }
  function saltOf(id) {                          // a board's own seasoning, so one GM does not lead them all
    var s = 0, i;
    for (i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) & 0xFFFF;
    return s;
  }

  /* ---------------- which rows to show ---------------- */

  /* TOP is ranks 1..n. AROUND YOU is the window centred on the viewer with the leader
     pinned above it, and the leader SPENDS A SLOT rather than adding one, so the owner's
     row-count slider means what it says: set it to 12 and he counts 12 rows. The pin is
     just rank 1 in the first slot, so the gap in the rank column is the divider and
     boards.js needs no extra flag to find it. Below three rows there is no room for a pin
     and the window wins, because losing the viewer's own row would defeat the view. */
  function ranksFor(want, field, youRank, around) {
    var out = [], r, start, end, half;
    if (want <= 0 || field <= 0) return out;
    if (!around || youRank <= 0) {
      for (r = 1; r <= Math.min(want, field); r++) out.push(r);
      return out;
    }
    half = Math.floor((want - 1) / 2);
    start = youRank - half;
    end = start + want - 1;
    if (end > field) { end = field; start = end - want + 1; }
    if (start < 1) { start = 1; end = Math.min(field, start + want - 1); }
    for (r = start; r <= end; r++) out.push(r);
    if (out.length >= 3 && out[0] !== 1) out[0] = 1;
    return out;
  }

  /* ---------------- the YOU card ---------------- */

  /* Nothing on this card is ranked, so it reuses the row shape with the LABEL in name and
     the value in score: boards.js already lays out three columns and this card needs two
     plus a note. rank is null on every line and you is true on every line, which is how
     boards.js can tell a card from a list without being told. */
  function youBoard(recipe, seed) {
    var signedIn = recipe.signedIn !== false;
    var hasRun = recipe.hasRun !== false;
    var note = signedIn
      ? "Your own records. Nothing here is ranked against anyone."
      : "Kept on this device. Sign in and these follow you to any phone.";
    var out = {
      rows: [], field: 0, median: null, crowd: null, you: null, note: note,
      emptyWhy: "You have not finished a season yet. Play one game and this card fills in."
    };
    if (!hasRun || recipe.empty === true) return out;

    function h(k) { return hash(seed, k, 91); }
    var bestClassic = 76 + Math.floor(h(1) * 6);            // 76 to 81
    var bestPresti = 73 + Math.floor(h(2) * 8);
    var bestPro = 68 + Math.floor(h(3) * 9);
    var bestDaily = 74 + Math.floor(h(4) * 8);
    var lastTen = Math.max(66, bestDaily - 1 - Math.floor(h(5) * 6));
    var hasPerfect = h(6) < 0.35;
    var perfectCost = 42 + Math.floor(h(7) * 7);
    var cur = 1 + Math.floor(h(8) * 6);
    var best = cur + Math.floor(h(9) * 8);
    var played = best + 6 + Math.floor(h(10) * 20);

    function line(label, score, sub) { out.rows.push({ rank: null, name: label, tag: null, score: score, sub: sub, you: true }); }

    /* Signed out, the card is the half that needs no server: t82_daily1 on this device holds
       the Daily history and the streak, and the mode records do not exist without an
       account. That is the honest signed-out card, and it is also the strongest reason to
       make one, so it is shown rather than hidden. */
    if (signedIn) {
      // net off the same wins-to-net relation the boards use, so the card and the board
      // cannot quote two different nets for the same kind of season
      line("Best Classic season", rec(bestClassic), "net " + signed1(5.0 + (bestClassic - 60) * 1.1 + h(11)) + ", " + dayLabel(22 + Math.floor(h(17) * 30)));
      line("Best Presti season", rec(bestPresti), money(40 + Math.floor(h(12) * 9)) + ", " + dayLabel(9 + Math.floor(h(13) * 20)));
      line("Best Pro season", rec(bestPro), "from memory, " + dayLabel(4 + Math.floor(h(14) * 26)));
    }
    line("Best Daily", rec(bestDaily), dayLabel(1 + Math.floor(h(15) * 18)));
    line("Best of your last ten", rec(lastTen), "your ten most recent seasons");
    if (signedIn) {
      line("Cheapest 82-0", hasPerfect ? money(perfectCost) : "None yet",
        hasPerfect ? "Presti, " + dayLabel(5 + Math.floor(h(16) * 25)) : "your closest is " + rec(bestClassic));
    }
    line("Daily streak", plural(cur, "day", "days"), "your longest is " + plural(best, "day", "days"));
    line("Dailies played", plural(played, "day", "days"), "since " + dayLabel(played + 11));
    return out;
  }

  /* ---------------- the board ---------------- */

  function board(boardId, recipe) {
    recipe = recipe || {};
    var raw = String(boardId == null ? "today" : boardId);
    var id = ALIAS[raw] || raw;
    if (id === "you") return youBoard(recipe, int(recipe.seed, 82));
    var B = BOARDS[id];
    if (!B) { id = "today"; B = BOARDS[id]; }    // a typo shows the default board rather than nothing

    var seed = int(recipe.seed, 82);
    var salt = saltOf(id);
    var want = clamp(int(recipe.rows, 12), 0, 82);
    var field = Math.max(0, fieldFor(id, Math.max(0, int(recipe.field, 4412))));
    var signedIn = recipe.signedIn !== false;
    /* A signed-out player has no row on any of these boards and it is not a styling choice:
       every board in lb.js filters user_id IS NOT NULL. So signed out means you is null and
       no row is yours, which is exactly the state the ghost line exists to answer. */
    /* THE WINDOW FOLLOWS THE PLAYER EVEN SIGNED OUT, which is the whole point of
       the lab's most important screen: somebody who just finished a season, is not
       registered, and is being shown where they would have landed. Zeroing youRank
       here sent them the TOP of the board instead of their own neighbourhood and
       flagged no row as theirs, so the ghost line had nothing to sit beside.
       The top-level `you` stays null when signed out, because that is true of the
       real API (every board in lb.js filters user_id IS NOT NULL). */
    var youRank = clamp(int(recipe.youRank, 0), 0, field);
    var around = recipe.around !== false;
    var gated = id === "cheapest" && field < CHEAP_BAR;

    if (recipe.empty === true || field <= 0 || gated) {
      /* An empty board has no field. Printing "4,412 GMs" over an empty state would be the
         one outright lie in the file, so the count goes to zero with the rows. */
      var why = B.emptyWhy;
      if (id === "cheapest") {
        why = "This opens when " + CHEAP_BAR + " GMs have a perfect Presti season." +
          (field > 0 && !recipe.empty ? " " + plural(field, "GM", "GMs") + " so far." : "") +
          " The floor to beat is " + money(FLOOR_M) + ".";
      }
      return { rows: [], field: 0, median: null, crowd: null, you: null, note: B.note, emptyWhy: why };
    }

    /* rows: 0 with a real field is not an empty board and must not be dressed as one: it is
       the owner asking to see the sheet with no list in it. The field and the crowd line stay
       true, and boards.js decides what belongs in the gap. recipe.empty is the other thing. */
    var c = { id: id, seed: seed, field: field, youRank: youRank };
    /* The 82-0 Club is a membership list, not a standing: boards.js renders no rank
       integer and no gap row for it, so a windowed slice would simply delete entries
       with nothing on screen to say so. */
    var ranks = ranksFor(want, field, youRank, around && !B.unranked);
    var rows = [], i, r, nm, s;
    for (i = 0; i < ranks.length; i++) {
      r = ranks[i];
      nm = nameFor(r, seed, youRank, salt);
      s = B.row(r, c);
      rows.push({ rank: r, name: nm.name, tag: nm.tag, score: s.score, sub: s.sub, you: r === youRank });
    }

    var medianStr = B.median(c);
    var crowdLine = null;
    /* The crowd line goes entirely below the sample floor (see CROWD_FLOOR), not just its
       median clause: on a nine-GM board the only honest thing left in the sentence is the
       count, and the viewer's own row already says "of 9". Boards whose line IS a pure count
       are exempt, because a count claims nothing about a distribution and is true at three. */
    if (B.countOnly ? field >= 1 : field >= CROWD_FLOOR) crowdLine = B.crowd(c);
    if (!B.countOnly && field < CROWD_FLOOR) medianStr = null;

    var you = null;
    if (youRank > 0) you = { rank: youRank, score: B.row(youRank, c).score, outOf: field };

    return {
      rows: rows,
      field: field,
      median: medianStr,
      crowd: crowdLine,
      you: you,
      note: B.note,
      emptyWhy: B.emptyWhy
    };
  }

  g.LB = g.LB || {};
  g.LB.data = { rng: rng, gms: gms, board: board };
}(typeof window !== "undefined" ? window : this));
