/* TRUE 82 — league-core.js: the League engine (Phase E · fantasy H2H seasons).
   ─────────────────────────────────────────────────────────────────────────────
   SHARED MODULE (the house law): browser <script>-loads it, test.js vm-loads
   it, Functions import it. PURE MATH ONLY — no fetch, no Date.now inside
   functions (clocks are passed in), no DB. Endpoints orchestrate; this file
   decides. Everything here is the invariant-dense part of leagues: get the
   circle method or a tie-group wrong and a season quietly crowns the wrong
   champion.

   THE SHAPE OF A LEAGUE: N players (3–20) take seats 0..N-1 at start. A
   season is (Neff-1)×rounds ISO-aligned weeks (Neff = N padded even with a
   ghost; pairing the ghost = your bye). Each week the WHOLE league plays the
   same server-minted seed under a challenge drawn deterministically from the
   manifest (filtered by the league's format). One attempt per player per
   week — enforced by the existing runs UNIQUE(user_id, official) index via
   the label grammar `lg|<leagueId>|<week>`. Weeks settle ON READ (the
   forfeit-on-read law): insert-once result rows keyed (league, week, seat_a)
   make settlement idempotent and race-safe. Standings are COMPUTED, never
   stored — no denormalized W/L to race on.

   SCORING: composite = wins + net/1000 (the house score everywhere).
   Played beats absent. Both absent = a scoreless draw. Exact composite tie =
   a draw. Standings order: points (2W+1D) → head-to-head points AMONG THE
   TIED GROUP → points-for → seat. Champion = row 0 when the season ends. */
(function (g) {
  "use strict";

  var WEEK_MS = 7 * 24 * 3600 * 1000;
  var MIN_PLAYERS = 3, MAX_PLAYERS = 20;
  var FORMATS = ["all", "classic", "cap", "pro"];

  // FNV-1a, uint32 — same recipe as sim-core's string seeds
  function hash32(s) {
    s = String(s);
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h >>> 0;
  }

  function seasonWeeks(n, rounds) {
    var neff = n + (n % 2);
    return (neff - 1) * (rounds === 2 ? 2 : 1);
  }

  /* Circle method. Seats 0..n-1 real; if n is odd, seat `neff-1` is the GHOST
     and pairing it means a bye. Seat 0 is the fixed hub; the rest rotate one
     step per week, so weeks 1..neff-1 are a complete single round robin.
     rounds=2 just runs the wheel again (same pairings, second meeting).
     Returns { pairs: [[a,b],...] (a<b, real seats only), bye: seat|null }
     or null when the week is outside the season. */
  function schedule(n, week, rounds) {
    if (n < MIN_PLAYERS || n > MAX_PLAYERS) return null;
    var total = seasonWeeks(n, rounds);
    if (!(week >= 1 && week <= total)) return null;
    var neff = n + (n % 2);
    var r = (week - 1) % (neff - 1);
    var pos = [0];
    for (var i = 1; i < neff; i++) pos.push(((i - 1 + r) % (neff - 1)) + 1);
    var pairs = [], bye = null;
    for (var k = 0; k < neff / 2; k++) {
      var a = pos[k], b = pos[neff - 1 - k];
      if (a >= n) { bye = b; continue; }       // ghost can only be a rotating seat,
      if (b >= n) { bye = a; continue; }       // but guard both sides anyway
      pairs.push(a < b ? [a, b] : [b, a]);
    }
    pairs.sort(function (x, y) { return x[0] - y[0]; });
    return { pairs: pairs, bye: bye };
  }

  // week number NOW: 0 before the season, 1..∞ after (caller caps at seasonWeeks)
  function weekOf(startTs, now) {
    if (now < startTs) return 0;
    return Math.floor((now - startTs) / WEEK_MS) + 1;
  }
  function weekWindow(startTs, week) {
    var a = startTs + (week - 1) * WEEK_MS;
    return { startTs: a, endTs: a + WEEK_MS };
  }
  // next Monday 00:00 UTC strictly after `now` — season openers feel official
  function nextMondayUtc(now) {
    var d = new Date(now);
    var day = (d.getUTCDay() + 6) % 7;                       // Mon=0
    var monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
    return monday + WEEK_MS;                                  // always the NEXT one
  }

  function composite(wins, net) {
    if (typeof wins !== "number") return null;
    return wins + (typeof net === "number" ? net / 1000 : 0);
  }

  /* One week's verdicts. scoreBySeat: {seat -> composite|null|undefined}.
     Returns rows [{a, b, sa, sb, winner: seatId|null}] — one per pairing,
     keyed by `a` (the smaller seat) for the insert-once PK. Byes emit no row. */
  function settleWeek(sched, scoreBySeat) {
    return sched.pairs.map(function (p) {
      var a = p[0], b = p[1];
      var sa = scoreBySeat[a], sb = scoreBySeat[b];
      sa = (typeof sa === "number") ? sa : null;
      sb = (typeof sb === "number") ? sb : null;
      var winner = null;
      if (sa !== null && sb === null) winner = a;             // played beats absent
      else if (sb !== null && sa === null) winner = b;
      else if (sa !== null && sb !== null && sa !== sb) winner = sa > sb ? a : b;
      return { a: a, b: b, sa: sa, sb: sb, winner: winner };  // null winner = draw
    });
  }

  /* Standings from raw result rows. members: [{seat, ...anything}] — passed
     through so callers keep tags/names attached. Rows may span many weeks.
     Points 2/1/0. Ties break by head-to-head points AMONG THE FULL TIED GROUP
     (recomputed per group — the classic bug is pairwise h2h on 3-way ties),
     then points-for, then seat. */
  function standings(members, rows) {
    var T = {};
    members.forEach(function (m) { T[m.seat] = { seat: m.seat, member: m, w: 0, d: 0, l: 0, pf: 0, played: 0 }; });
    rows.forEach(function (r) {
      var A = T[r.a], B = T[r.b];
      if (!A || !B) return;
      if (r.sa !== null) A.pf += r.sa;
      if (r.sb !== null) B.pf += r.sb;
      A.played++; B.played++;
      if (r.winner === null) { A.d++; B.d++; }
      else if (r.winner === r.a) { A.w++; B.l++; }
      else { B.w++; A.l++; }
    });
    var list = members.map(function (m) { return T[m.seat]; });
    list.forEach(function (t) { t.pts = 2 * t.w + t.d; });

    // group by pts, order groups desc, resolve inside each group
    var byPts = {};
    list.forEach(function (t) { (byPts[t.pts] = byPts[t.pts] || []).push(t); });
    var out = [];
    Object.keys(byPts).map(Number).sort(function (a, b) { return b - a; }).forEach(function (p) {
      var grp = byPts[p];
      if (grp.length > 1) {
        var inGrp = {};
        grp.forEach(function (t) { inGrp[t.seat] = true; });
        grp.forEach(function (t) { t.h2h = 0; });
        rows.forEach(function (r) {
          if (!inGrp[r.a] || !inGrp[r.b]) return;             // only games INSIDE the tied group
          if (r.winner === null) { T[r.a].h2h += 1; T[r.b].h2h += 1; }
          else T[r.winner].h2h += 2;
        });
        grp.sort(function (x, y) {
          return (y.h2h - x.h2h) || (y.pf - x.pf) || (x.seat - y.seat);
        });
      }
      out.push.apply(out, grp);
    });
    out.forEach(function (t, i) { t.rank = i + 1; });
    return out;
  }

  // every real pairing has both scores in (byes never block a week)
  function allPlayed(sched, scoreBySeat) {
    return sched.pairs.every(function (p) {
      return typeof scoreBySeat[p[0]] === "number" && typeof scoreBySeat[p[1]] === "number";
    });
  }

  /* THE ADVANCE LAW (fast-advance lives here, nowhere else). lg carries
     {settled_through, season_weeks, week_opened_ts, fast_advance}. The week
     up for settlement is settled_through+1. It settles when its 7-day window
     has elapsed — nextOpenedTs stays clock-aligned (opened + WEEK_MS, so
     time-driven leagues keep their Monday rhythm through multi-week
     catch-ups) — OR, in a fast_advance league, the moment every matchup has
     both runs in — nextOpenedTs = now, and the rhythm intentionally drifts.
     Returns {week, nextOpenedTs} or null (nothing to do). */
  function advanceDecision(lg, allPlayedFlag, now) {
    var w = (lg.settled_through || 0) + 1;
    if (w > lg.season_weeks) return null;
    var opened = lg.week_opened_ts;
    if (opened == null || now < opened) return null;          // week not open yet
    if (now >= opened + WEEK_MS) return { week: w, nextOpenedTs: opened + WEEK_MS };
    if (lg.fast_advance && allPlayedFlag) return { week: w, nextOpenedTs: now };
    return null;
  }

  // deterministic manifest draw for a league-week (caller supplies pool length)
  function challengeIndex(leagueId, week, poolLen) {
    if (!poolLen) return 0;
    return hash32(leagueId + "|" + week) % poolLen;
  }
  function poolFilter(format) {
    return function (ch) {
      if (format === "all") return true;
      return ch.base === format;
    };
  }

  var API = {
    WEEK_MS: WEEK_MS, MIN_PLAYERS: MIN_PLAYERS, MAX_PLAYERS: MAX_PLAYERS, FORMATS: FORMATS,
    hash32: hash32, seasonWeeks: seasonWeeks, schedule: schedule,
    weekOf: weekOf, weekWindow: weekWindow, nextMondayUtc: nextMondayUtc,
    composite: composite, settleWeek: settleWeek, standings: standings,
    allPlayed: allPlayed, advanceDecision: advanceDecision,
    challengeIndex: challengeIndex, poolFilter: poolFilter
  };
  g.T82LG = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof globalThis !== "undefined" ? globalThis : this);
