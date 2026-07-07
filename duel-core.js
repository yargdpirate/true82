/* TRUE 82 — duel-core.js: the Duel Draft match engine (ACCOUNTS §10).
   ─────────────────────────────────────────────────────────────────────────────
   SHARED MODULE (same law as sim-core/challenges): browser <script>-loads it
   after sim-core.js, test.js vm-loads it, Functions import it. The server
   validates every move by REBUILDING the match from its op log; the client
   rebuilds the same way to render. One file, one truth.

   THE ARCHITECTURE: a duel is ONE shared sim-core state S — one seed, one
   stream, one live ticket, one person-keyed drafted set (the One-Jersey Rule
   is free), one fire-sale flag ("board state: whoever triggers it pays;
   whoever picks next enjoys it — even the rival") — plus TWO player overlays
   (picks, filled, budget/maxCap, skip counters). mount() swaps the mover's
   overlay into S, the untouched core functions run (eligibility,
   affordability, applyPick, skips, chargeReroll), unmount() copies back.
   S.round is DERIVED at mount time as myPicks+1 so capAffordable's
   never-strand math stays exact per player.

   TURN LAW: strict alternation; a turn is exactly one op. Every op passes the
   turn — including skips ("the next ticket lands on your rival's turn").
   Lineup mv/sw are free (no turn, no draw). A full roster auto-passes: once
   you have 5, every remaining turn is your rival's. Both full → resolve.

   OPS (over the wire as {u: 0|1, op, ts}):
     "k:<name>|<season>|<slot>"  pick (sim-core grammar)
     "st" | "se"                 paid skip (cap: $1 via chargeReroll;
                                 classic: your 1+1 counters)
     "yr"                        cap only, $1 year reroll
     "fs"                        FORCED skip — legal only when the mover has
                                 zero draftable rows; free, no counters,
                                 fresh ticket dealt (strand-guarded for the
                                 RIVAL, who moves next)
     "mv:<i>,<slot>" "sw:<i>,<j>" free lineup ops (own roster, no turn)

   SERIALIZATION LAW: matches are rebuilt from (mode, seed, ops) via
   replayMatch() — never from snapshots. The RNG is a closure; the op log is
   the state. Rebuild of a ≤30-op match is trivially cheap.

   RESOLUTION: both rosters through engine() on the shared state; Hot Hand per
   roster at exactly 81, draws resolved P1-then-P2 from the match stream
   (finish() already does the draws — mount order IS the law). Winner:
   wins → cap_left (cap) → net → draw ("Co-Immortals" if both 82-0). */
(function (g) {
  "use strict";

  var T = (typeof T82 !== "undefined") ? T82
        : (typeof require === "function" ? require("./sim-core.js") : null);

  var QUIPS = [
    "Enjoy the lottery.", "My bench beats your starters.",
    "That's a fire sale waiting to happen.", "Cap casualty.",
    "He was my third option anyway.", "Scoreboard. Eventually.",
    "Bold. Wrong, but bold.", "The Tribune will be gentle. Probably.",
    "I've seen better boards in kaman mode.", "Skip it. I dare you.",
    "You drafted the poster. I drafted the dunker.",
    "Save your dollars — you'll need them.", "That contract ages like milk.",
    "Front office material, this one.", "One jersey, friend. One jersey.",
    "I was going to take him anyway.", "Your spacing is a rumor.",
    "Defense wins duels.", "Nice pick. For me, next round.",
    "82 problems and you're all of them."
  ];
  var MODES_V1 = ["classic", "cap", "kaman"];   // pro duels = Phase 1.5; kaman exists solely to award №36

  var PICKS_EACH = 5;

  function newOverlay(S) {
    return {
      picks: [], filled: { G: 0, F: 0, C: 0 },
      budget: S.budget, maxCap: S.maxCap,
      teamSkips: S.teamSkips, eraSkips: S.eraSkips
    };
  }

  // Swap a player's overlay into the shared S. round is derived (picks+1) so
  // core affordability math is per-player exact.
  function mount(M, i) {
    var p = M.players[i], S = M.S;
    S.picks = p.picks; S.filled = p.filled;
    S.budget = p.budget; S.maxCap = p.maxCap;
    S.teamSkips = p.teamSkips; S.eraSkips = p.eraSkips;
    S.round = p.picks.length + 1;
    M.mounted = i;
  }
  function unmount(M) {
    var p = M.players[M.mounted], S = M.S;
    p.picks = S.picks; p.filled = S.filled;
    p.budget = S.budget; p.maxCap = S.maxCap;
    p.teamSkips = S.teamSkips; p.eraSkips = S.eraSkips;
    M.mounted = null;
  }

  function full(M, i) { return M.players[i].picks.length >= PICKS_EACH; }
  function bothFull(M) { return full(M, 0) && full(M, 1); }

  // Any draftable row on the live ticket for player i? (Powers the FORCED
  // SKIP gate and the client's "no legal pick" banner.)
  function canPickAny(M, i) {
    if (M.mode === "kaman") return !full(M, i);
    mount(M, i);
    var ok = T.capPoolHasPick(M.S);   // raw-pool scan; correct for every mode
    unmount(M);
    return ok;
  }

  /** Draftable rows on the live ticket for player i, sorted by name. Each:
      { name, season (currently-resolved), seasons[] (all in this pool),
        slots[] (every open bucket this row can legally fill),
        cost (what player i would PAY now, cap only — fire sale honored) }.
      Rich enough that a UI needs zero direct table access. */
  function draftable(M, i) {
    if (M.mode === "kaman") return [];
    mount(M, i);
    var S = M.S, out = [];
    var k = T.key(S, S.cur.fr, S.cur.dec);
    var pool = T.t.POOLS.get(k);
    var yrs = T.t.POOL_YEARS.get(k);
    if (pool) pool.forEach(function (row, name) {
      var r = T.resolveRow(S, name);
      if (!r || !T.rowDraftable(S, r)) return;
      var c = null;
      if (S.mode === "cap" && S.costByName && S.costByName[name] != null)
        c = S.fireSale ? Math.max(1, S.costByName[name] - 2) : S.costByName[name];
      var ys = yrs && yrs.get ? yrs.get(name) : null;   // POOL_YEARS holds ROW arrays
      var seasons = ys && ys.length
        ? ys.map(function (rr) { return rr[T.t.IDX.season]; })
        : [r[T.t.IDX.season]];
      out.push({ name: name, season: r[T.t.IDX.season],
        seasons: seasons,
        slots: T.rowOpenBuckets(S, r).slice(), cost: c });
    });
    unmount(M);
    out.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
    return out;
  }

  function newMatch(mode, seed) {
    if (MODES_V1.indexOf(mode) === -1) return null;
    var S = T.newState(mode, seed, null);
    var M = {
      mode: mode, seed: S.seed,
      S: S,
      players: [newOverlay(S), newOverlay(S)],
      turn: 0,                    // player index to move; creator = 0 = first
      log: [],                    // [{u, op, ts}]
      quips: [],                  // [{u, qid, turnIdx, ts}]
      status: "active",
      winner: null, result: null,
      mounted: null
    };
    // initial deal, strand-guarded for the first mover.
    // DEAL LAW: dealRound pre-increments round, so a DEAL mounts with
    // round = picks (the ++ lands on the pick number); ACTIONS mount with
    // round = picks+1 (mount()'s default). Getting this wrong reads a
    // 4-pick player as "done" and refuses their fifth board.
    mount(M, 0);
    M.S.round = 0;
    var d = T.dealRound(M.S);
    unmount(M);
    if (d === "done") { M.status = "dead"; }   // dataset pathology; never in prod
    return M;
  }

  function advance(M) {
    if (bothFull(M)) { resolve(M); return; }
    var next = 1 - M.turn;
    M.turn = full(M, next) ? M.turn : next;    // full roster auto-passes forever
  }

  // deal a fresh ticket, strand-guarded for the (already advanced) mover
  function dealNext(M) {
    mount(M, M.turn);
    M.S.round = M.players[M.turn].picks.length;   // see DEAL LAW above
    var d = T.dealRound(M.S);
    unmount(M);
    return d !== "done";
  }

  /** Apply one op for player index u. Returns {ok:true} | {ok:false, why}. */
  function applyOp(M, u, op, ts) {
    if (M.status !== "active") return { ok: false, why: "not-active" };
    op = String(op);

    // free lineup ops: no turn, no draw, own roster only
    if (op.slice(0, 3) === "mv:" || op.slice(0, 3) === "sw:") {
      mount(M, u);
      var okL = op.slice(0, 3) === "mv:"
        ? (function () { var a = op.slice(3).split(","); return T.moveSlot(M.S, parseInt(a[0], 10), a[1]); })()
        : (function () { var a = op.slice(3).split(","); return T.swapSlots(M.S, parseInt(a[0], 10), parseInt(a[1], 10)); })();
      if (okL) M.S.actions.pop();
      unmount(M);
      if (!okL) return { ok: false, why: "illegal-op" };
      M.log.push({ u: u, op: op, ts: ts || 0 });
      return { ok: true };
    }

    if (u !== M.turn) return { ok: false, why: "not-your-turn" };
    if (full(M, u)) return { ok: false, why: "roster-full" };

    var ok = false, dealt = true;
    if (op.slice(0, 2) === "k:") {
      var parts = op.slice(2).split("|");
      var season = parseInt(parts[1], 10);
      mount(M, u);
      ok = T.applyPick(M.S, parts[0], isNaN(season) ? null : season, parts[2]);
      if (ok) M.S.actions.pop();
      unmount(M);
      if (!ok) return { ok: false, why: "illegal-op" };
      M.log.push({ u: u, op: op, ts: ts || 0 });
      advance(M);
      if (M.status === "active") dealt = dealNext(M);
    } else if (op === "st" || op === "se" || op === "yr") {
      mount(M, u);
      var f = op === "st" ? T.skipTeam(M.S) : op === "se" ? T.skipEra(M.S) : T.yearReroll(M.S);
      if (f) M.S.actions.pop();
      unmount(M);
      if (!f) return { ok: false, why: "illegal-op" };
      M.log.push({ u: u, op: op, ts: ts || 0 });
      advance(M);   // the skipped-to board is the rival's problem now
    } else if (op === "fs") {
      if (canPickAny(M, u)) return { ok: false, why: "not-forced" };
      M.log.push({ u: u, op: op, ts: ts || 0 });
      advance(M);
      if (M.status === "active") dealt = dealNext(M);
    } else {
      return { ok: false, why: "bad-op" };
    }
    if (!dealt) { resolve(M); }   // board space exhausted — settle what's drafted
    return { ok: true };
  }

  // Both rosters through finish() — MOUNT ORDER IS THE HH DRAW LAW (P1 then P2).
  function resolve(M) {
    mount(M, 0); var r0 = T.finish(M.S); unmount(M);
    mount(M, 1); var r1 = T.finish(M.S); unmount(M);
    M.result = [r0, r1];
    var w = null;
    if (r0.wins !== r1.wins) w = r0.wins > r1.wins ? 0 : 1;
    else if (M.mode === "cap" && r0.capLeft !== r1.capLeft) w = r0.capLeft > r1.capLeft ? 0 : 1;
    else if (r0.net !== null && r1.net !== null && r0.net !== r1.net) w = r0.net > r1.net ? 0 : 1;
    M.winner = w;                 // null = draw ("Co-Immortals" when both 82-0)
    M.status = "complete";
  }

  /** One quip per player per match-turn (§14.6). turnIdx = ops taken so far. */
  function addQuip(M, u, qid, ts) {
    qid = parseInt(qid, 10);
    if (!(qid >= 0 && qid < QUIPS.length)) return { ok: false, why: "bad-quip" };
    var turnIdx = M.log.length;
    for (var i = 0; i < M.quips.length; i++)
      if (M.quips[i].u === u && M.quips[i].turnIdx === turnIdx)
        return { ok: false, why: "quip-throttle" };
    M.quips.push({ u: u, qid: qid, turnIdx: turnIdx, ts: ts || 0 });
    return { ok: true };
  }

  /** Rebuild a match from its op log. {ok, M} | {ok:false, why, at}. */
  function replayMatch(payload) {
    var M = newMatch(payload.mode, payload.seed);
    if (!M) return { ok: false, why: "bad-mode" };
    var ops = payload.ops || [];
    for (var i = 0; i < ops.length; i++) {
      var r = applyOp(M, ops[i].u, ops[i].op, ops[i].ts);
      if (!r.ok) return { ok: false, why: r.why, at: i };
    }
    (payload.quips || []).forEach(function (q) { M.quips.push(q); });
    return { ok: true, M: M };
  }

  /** The tiny summary the DB stores for list queries + the /api/me chip. */
  function summary(M) {
    return {
      status: M.status, turn: M.turn,
      picks: [M.players[0].picks.length, M.players[1].picks.length],
      winner: M.winner,
      wins: M.result ? [M.result[0].wins, M.result[1].wins] : null
    };
  }

  var API = {
    QUIPS: QUIPS, MODES_V1: MODES_V1, PICKS_EACH: PICKS_EACH,
    newMatch: newMatch, applyOp: applyOp, addQuip: addQuip, draftable: draftable,
    replayMatch: replayMatch, resolve: resolve, summary: summary,
    canPickAny: canPickAny, full: full, bothFull: bothFull
  };
  g.T82DUEL = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof globalThis !== "undefined" ? globalThis : this);
