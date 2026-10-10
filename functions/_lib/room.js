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

/* ---------- THE CLOCK (v70) ----------
   The owner's two shapes, and they are the two a fantasy draft already ships,
   so the numbers are borrowed rather than invented:

     LIVE  90 seconds a pick. The ESPN/Yahoo default for a live draft, which is
           the format this is: everybody in one sitting, the clock is the thing
           that keeps them there.
     SLOW  8 hours a pick. The "play it over a few days" shape — a full draft is
           fifteen picks, so a slow room finishes inside a week even if everyone
           uses most of their clock.

   AN EXPIRED CLOCK AUTO-PICKS; IT DOES NOT FORFEIT. This is the part worth
   copying and the part people get wrong. A forfeited seat ruins the draft for
   the two people who did show up: the pool stops depleting evenly and the
   rosters stop being comparable. Every fantasy platform auto-picks for the same
   reason, and so does this.

   THE CLOCK ADVANCES WHEN SOMEONE LOOKS. There is no scheduler here and none is
   needed: any read of the room catches it up, picking for every deadline that
   has passed since the last one. A room nobody is watching simply waits, which
   costs nothing and is invisible — the first person back sees the correct state.
   Two readers catching up at once is the same race as two players moving at
   once, and UNIQUE(room_id, seq) settles it the same way. */
export const PACES = {
  live: { ms: 90 * 1000, label: "Live · 90 seconds a pick" },
  slow: { ms: 8 * 3600 * 1000, label: "Slow · 8 hours a pick" }
};
export const DEFAULT_PACE = "live";

/** The room's immutable setup, stored as JSON in `order_json`.
    It began life as a bare array of seat numbers, so a bare array still parses:
    the column holds the room's fixed SETUP, of which the order is one field.
    Keeping the pace here rather than in a new column is deliberate — an
    ALTER TABLE is not repeat-safe, and migrations/MIGRATIONS-NOTES.md requires
    that every statement be safe to paste twice. */
export function parseSetup(json) {
  let v;
  try { v = typeof json === "string" ? JSON.parse(json) : json; } catch { return null; }
  if (Array.isArray(v)) return { order: v, pace: DEFAULT_PACE, pickMs: PACES[DEFAULT_PACE].ms };
  if (!v || !Array.isArray(v.order)) return null;
  const pace = PACES[v.pace] ? v.pace : DEFAULT_PACE;
  const ms = Number(v.pickMs);
  return {
    order: v.order, pace,
    // an explicit pickMs wins, so a harness can run a whole draft in seconds
    pickMs: Number.isFinite(ms) && ms >= 250 && ms <= 7 * 24 * 3600 * 1000 ? ms : PACES[pace].ms
  };
}

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
    /* `v` is the host's own valuation of the player, used ONLY to decide an
       auto-pick. It is advisory and cannot make an illegal pick legal; with it
       absent, auto-pick falls back to the board's own order, which is already a
       ranking (the real draft order on a PRO board). */
    const val = Number(row.v);
    players.set(row.n, { seasons, buckets: [...union], v: Number.isFinite(val) ? val : null, at: players.size });
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

/* ---------- the clock ---------- */

/** When the seat on the clock runs out. Measured from the last move, or from
    the moment the room filled if nobody has moved yet. */
export function deadlineFor(state, setup, lastMoveTs, startedTs) {
  if (state.done) return null;
  const from = lastMoveTs || startedTs || null;
  return from ? from + setup.pickMs : null;
}

/** The pick an expired clock makes: the most valuable LEGAL option, which is
    what a fantasy auto-pick does, falling back to board order when the host
    sent no values. Returns null only if nothing at all is legal, which the
    strand guard is supposed to make impossible. */
export function autoPick(board, state, seat) {
  let best = null;
  for (const [name, rec] of board.players) {
    if (state.taken.has(name)) continue;
    for (const [season, bks] of rec.seasons) {
      for (const slot of bks) {
        if (openAt(state.rosters[seat], slot, board.caps) <= 0) continue;
        if (feasibleAfter(board, state, seat, name, slot)) continue;
        const score = rec.v !== null ? rec.v : -rec.at;      // board order as the fallback ranking
        if (!best || score > best.score) best = { player: name, season, slot, score, auto: 1 };
      }
    }
  }
  return best;
}
