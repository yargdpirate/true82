/* TRUE 82 — THE DRAFT ROOM, server side (v70)
   ─────────────────────────────────────────────────────────────────────────────
   Three people in one snake draft over one exhaustible pool. The draft itself is
   not new — THE REDRAFTED has shipped it against two bots since v55 — so this
   file adds only the two things a shared draft needs and a solo one does not:
   WHOSE TURN IT IS, and WHETHER THIS PICK IS LEGAL, both decided here and not
   in anybody's browser.

   THE BOARD IS FROZEN AT CREATION. The host's browser builds the pool with the
   same `sdBuildPool()` the single-player mode uses and posts the result; the
   server stores it and judges every later pick against that stored list. That
   is a deliberate trade, taken with the owner on 2026-10-10: the alternative was
   to extract ~790 lines of pool building out of app.js into a module the Worker
   could load, ten days before the debut, from a mode that is LIVE. The cost is
   that the server trusts the host's board — and every seat in the room is
   drafting from the same stored copy, so a tampered board is visible to all
   three and advantages none of them. The upgrade path is unchanged: derive the
   board here too, later, and compare it against the stored one.

   EVERYTHING ELSE IS THE SERVER'S. The pool is data, but the RULES are not:
   whose turn, who is taken, which seasons qualify at which slot, how many slots
   a seat has left, and the strand guard all run here.

   NOTHING DERIVED IS STORED. Turn, taken set and rosters are recomputed from
   (order, moves) on every read. A `current_seat` column would be a second
   source of truth and would drift, which is the same reason the streak board
   computes islands from the rows instead of keeping a counter. */

export const CAPS = { G: 2, F: 2, C: 1 };
export const ROSTER = 5;
export const SEATS = 3;

/** The snake order for `seats` seats over `rounds` rounds: 0,1,2, 2,1,0, 0,1,2…
    Returned as an array of seat numbers, one per turn. The ORDER OF SEATS is
    the caller's (the room stores a shuffled one), this only snakes it. */
export function snakeOrder(seatOrder, rounds) {
  const out = [];
  for (let r = 0; r < rounds; r++) {
    for (let k = 0; k < seatOrder.length; k++) {
      out.push(seatOrder[r % 2 ? seatOrder.length - 1 - k : k]);
    }
  }
  return out;
}

/* ---------- the frozen board ----------
   { v, cls, diff, size, caps, p: [ { n: name, s: [[season, "GF"], …] } ] }
   A player's buckets are PER SEASON, because a career can change position, and
   the union across his seasons is his capacity for the strand guard. */
export function parseBoard(json) {
  let b;
  try { b = typeof json === "string" ? JSON.parse(json) : json; } catch { return null; }
  if (!b || !Array.isArray(b.p) || !b.p.length) return null;
  const players = new Map();
  for (const row of b.p) {
    if (!row || typeof row.n !== "string" || !Array.isArray(row.s) || !row.s.length) return null;
    const seasons = new Map();
    const union = new Set();
    for (const s of row.s) {
      if (!Array.isArray(s) || s.length !== 2) return null;
      const yr = Number(s[0]);
      if (!Number.isInteger(yr) || yr < 1946 || yr > 2100) return null;
      const bk = String(s[1] || "").split("").filter((c) => c === "G" || c === "F" || c === "C");
      if (!bk.length) return null;
      seasons.set(yr, bk);
      bk.forEach((c) => union.add(c));
    }
    if (players.has(row.n)) return null;              // a duplicate name would make "taken" ambiguous
    players.set(row.n, { seasons, buckets: [...union] });
  }
  return {
    cls: String(b.cls || ""), diff: b.diff === "pickup" ? "pickup" : "pro",
    size: Number(b.size) || ROSTER, caps: b.caps || CAPS, players
  };
}

/* ---------- the state, derived from the log every time ---------- */
export function deriveState(order, moves) {
  const taken = new Map();                      // player -> seat
  const rosters = [];
  for (let i = 0; i < SEATS; i++) rosters.push([]);
  for (const m of moves) {
    taken.set(m.player, m.seat);
    rosters[m.seat].push({ player: m.player, season: m.season, slot: m.slot });
  }
  const at = moves.length;
  return {
    at, taken, rosters,
    done: at >= order.length,
    seat: at < order.length ? order[at] : -1,
    round: Math.floor(at / SEATS) + 1
  };
}

export function openAt(roster, slot, caps) {
  const used = roster.filter((p) => p.slot === slot).length;
  return (caps[slot] || 0) - used;
}

/* ---------- the strand guard ----------
   Hypothetically give this player to this seat at this slot, then ask whether
   EVERY seat can still finish. Hall's condition over the seven non-empty
   subsets of {G,F,C} is exact for this shape: feasible iff for every subset S,
   the open slots in S are no more than the players who can fill something in S.
   Ported from app.js sdHall/sdFeasibleAfter, which is the version the screen
   has enforced since v55 — the rule must not differ between the two, or a pick
   the UI offers would be refused here. */
const SUBSETS = [["G"], ["F"], ["C"], ["G", "F"], ["G", "C"], ["F", "C"], ["G", "F", "C"]];

export function hall(need, supplies) {
  for (const S of SUBSETS) {
    let nd = 0, sp = 0;
    for (const bk of S) nd += need[bk] || 0;
    for (const bs of supplies) { if (bs.some((x) => S.indexOf(x) !== -1)) sp++; }
    if (nd > sp) return S;
  }
  return null;
}

export function feasibleAfter(board, state, seat, player, slot) {
  const need = { G: 0, F: 0, C: 0 };
  for (let t = 0; t < SEATS; t++) {
    for (const bk of Object.keys(board.caps)) {
      need[bk] += openAt(state.rosters[t], bk, board.caps) - (t === seat && bk === slot ? 1 : 0);
    }
  }
  const supplies = [];
  for (const [name, rec] of board.players) {
    if (name === player || state.taken.has(name)) continue;
    supplies.push(rec.buckets);
  }
  return hall(need, supplies);
}

/* ---------- is this pick legal? null, or a reason the caller can show ----------
   The order matters: the cheapest and most common refusals first, and the
   strand guard last because it is the only one that walks the whole board. */
export function validate(board, state, seat, move) {
  if (state.done) return "the draft is over";
  if (state.seat !== seat) return "not your turn";
  const rec = board.players.get(move.player);
  if (!rec) return "that player is not on this board";
  if (state.taken.has(move.player)) return "already drafted";
  const bk = rec.seasons.get(move.season);
  if (!bk) return "that season is not on this board";
  if (bk.indexOf(move.slot) === -1) return "that season does not qualify at " + move.slot;
  if (openAt(state.rosters[seat], move.slot, board.caps) <= 0) return "that slot is full";
  const strand = feasibleAfter(board, state, seat, move.player, move.slot);
  if (strand) return "that strands the board at " + strand.join(" and ");
  return null;
}

/** Can this board field `SEATS` complete legal rosters at all? Checked when the
    room opens, so a centre-starved class is refused at creation with a reason
    rather than dying three picks from the end. */
export function boardViable(board) {
  const need = {};
  for (const b of Object.keys(board.caps)) need[b] = board.caps[b] * SEATS;
  const supplies = [];
  for (const [, rec] of board.players) supplies.push(rec.buckets);
  return hall(need, supplies) === null;
}
