/* TRUE 82 — /api/room: three people in one snake draft (v70)
   ─────────────────────────────────────────────────────────────────────────────
     POST /api/room?op=create  { cls, diff, board }  -> { id, seat }
     POST /api/room?op=join    { id }                -> { seat }
     POST /api/room?op=move    { id, player, season, slot, seq? }
     GET  /api/room?id=XXXXXX&since=N                -> the room and the log

   EVERY ACTION NEEDS AN ACCOUNT. A room is a list of people; there is no
   anonymous seat. That makes this lane gated behind the same accounts as the
   boards, which is also why it writes through acct.js `db()` and lands in the
   preview's own database on a preview.

   THE RACE IS HANDLED BY THE SCHEMA, not by a lock. A move is inserted at
   `seq = state.at`; two seats submitting together means one INSERT wins and the
   other trips `UNIQUE(room_id, seq)`, which is answered as `behind` WITH THE
   CURRENT LOG so the loser can redraw and go again. See
   migrations/MIGRATIONS-0032-NOTES.md.

   READS ARE CHEAP AND MEANT TO BE POLLED: `since` returns only the moves after
   a sequence number, so the common poll is an empty array. */
import { accountAuth, json, db } from "../_lib/acct.js";
import { parseBoard, deriveState, validate, snakeOrder, boardViable, SEATS, ROSTER } from "../_lib/room.js";

const ID_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";   // the tag alphabet: no confusables
const ID_RE = /^[A-HJ-NP-TV-Z2-9]{6}$/;
const MAX_BOARD = 96 * 1024;
const SLOTS = new Set(["G", "F", "C"]);
const ROOM_TTL_MS = 7 * 24 * 3600 * 1000;

function newId() {
  const a = new Uint8Array(6);
  crypto.getRandomValues(a);
  let s = "";
  for (let i = 0; i < 6; i++) s += ID_ALPHABET[a[i] % ID_ALPHABET.length];
  return s;
}

async function loadRoom(DB, id) {
  const room = await DB.prepare("SELECT * FROM rooms WHERE id = ?").bind(id).first().catch(() => null);
  if (!room) return null;
  const members = await DB.prepare(
    "SELECT user_id, seat FROM room_members WHERE room_id = ? ORDER BY seat").bind(id).all().catch(() => null);
  const moves = await DB.prepare(
    "SELECT seq, seat, user_id, player, season, slot FROM room_moves WHERE room_id = ? ORDER BY seq"
  ).bind(id).all().catch(() => null);
  return { room, members: (members && members.results) || [], moves: (moves && moves.results) || [] };
}

/** What a caller is allowed to see: never another seat's future, because there
    is no hidden information in a snake draft — every pick is public the moment
    it is made, which is the whole point of drafting against people. */
function view(r, state, order, sinceMoves) {
  return {
    ok: true,
    id: r.room.id, cls: r.room.cls, diff: r.room.diff, state: r.room.state,
    seats: r.room.seats, order,
    members: r.members.map((m) => ({ seat: m.seat, userId: m.user_id })),
    at: state.at, turn: state.seat, round: state.round, done: state.done,
    rosters: state.rosters,
    moves: sinceMoves
  };
}

export async function onRequest(context) {
  const DB = db(context);
  const { request } = context;
  const q = new URL(request.url).searchParams;

  const auth = await accountAuth(context);
  if (!auth || !auth.userId) return json({ ok: false, why: "sign-in" });
  if (!DB) return json({ ok: false, why: "no-db" });

  const op = request.method === "GET" ? "get" : (q.get("op") || "");
  let body = {};
  if (request.method !== "GET") {
    try {
      const raw = await request.text();
      if (raw.length > MAX_BOARD) return json({ ok: false, why: "too-large" });
      body = JSON.parse(raw || "{}");
    } catch { return json({ ok: false, why: "bad-json" }); }
  }

  try {
    /* ---------- create ---------- */
    if (op === "create") {
      const board = parseBoard(body.board);
      if (!board) return json({ ok: false, why: "bad-board" });
      if (board.players.size < ROSTER * SEATS) return json({ ok: false, why: "board-too-small" });
      /* A centre-starved class is refused HERE, with a reason, rather than
         three picks from the end with a stranded roster. */
      if (!boardViable(board)) return json({ ok: false, why: "board-cannot-field-three-teams" });

      const seatOrder = [0, 1, 2];                 // shuffled below, seeded by the room id
      const id = newId();
      /* The order is fixed at creation and stored, so it cannot be re-rolled by
         anyone and every seat reads the same one. Shuffled from the room id so
         it is arbitrary but reproducible from what the room already holds. */
      let h = 2166136261;
      for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
      for (let i = seatOrder.length - 1; i > 0; i--) {
        h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
        const j = h % (i + 1);
        const t = seatOrder[i]; seatOrder[i] = seatOrder[j]; seatOrder[j] = t;
      }
      const order = snakeOrder(seatOrder, ROSTER);
      const now = Date.now();
      await DB.prepare(
        `INSERT INTO rooms (id, host_user_id, cls, diff, seats, board, order_json, state, created_ts, closes_ts)
         VALUES (?,?,?,?,?,?,?,?,?,?)`
      ).bind(id, auth.userId, board.cls, board.diff, SEATS,
             typeof body.board === "string" ? body.board : JSON.stringify(body.board),
             JSON.stringify(order), "open", now, now + ROOM_TTL_MS).run();
      await DB.prepare("INSERT INTO room_members (room_id, user_id, seat, joined_ts) VALUES (?,?,?,?)")
        .bind(id, auth.userId, 0, now).run();
      return json({ ok: true, id, seat: 0, order });
    }

    const id = String(body.id || q.get("id") || "").toUpperCase();
    if (!ID_RE.test(id)) return json({ ok: false, why: "bad-id" });
    const r = await loadRoom(DB, id);
    if (!r) return json({ ok: false, why: "no-room" });
    const order = JSON.parse(r.room.order_json);
    const state = deriveState(order, r.moves);
    const mine = r.members.find((m) => m.user_id === auth.userId);

    /* ---------- join ---------- */
    if (op === "join") {
      if (mine) return json({ ok: true, seat: mine.seat, already: true });
      if (r.members.length >= r.room.seats) return json({ ok: false, why: "room-full" });
      if (state.at > 0) return json({ ok: false, why: "already-started" });
      const used = new Set(r.members.map((m) => m.seat));
      let seat = 0;
      while (used.has(seat)) seat++;
      try {
        await DB.prepare("INSERT INTO room_members (room_id, user_id, seat, joined_ts) VALUES (?,?,?,?)")
          .bind(id, auth.userId, seat, Date.now()).run();
      } catch (e) {
        /* Both unique indexes land here: two people taking the last seat at
           once, or one person double-posting. Re-read and answer with the
           truth rather than with an error. */
        const again = await loadRoom(DB, id);
        const m2 = again && again.members.find((x) => x.user_id === auth.userId);
        return m2 ? json({ ok: true, seat: m2.seat, already: true })
                  : json({ ok: false, why: "room-full" });
      }
      if (r.members.length + 1 >= r.room.seats) {
        await DB.prepare("UPDATE rooms SET state = 'drafting' WHERE id = ?").bind(id).run().catch(() => {});
      }
      return json({ ok: true, seat });
    }

    /* ---------- move ---------- */
    if (op === "move") {
      if (!mine) return json({ ok: false, why: "not-in-room" });
      if (r.members.length < r.room.seats) return json({ ok: false, why: "waiting-for-seats" });
      const move = {
        player: String(body.player || ""),
        season: Number(body.season),
        slot: String(body.slot || "")
      };
      if (!move.player || !Number.isInteger(move.season) || !SLOTS.has(move.slot)) {
        return json({ ok: false, why: "bad-move" });
      }
      /* An optimistic assertion from a client that has been polling: if it is
         stale, say so before doing any work. */
      if (body.seq !== undefined && Number(body.seq) !== state.at) {
        return json({ ok: false, why: "behind", at: state.at, moves: r.moves });
      }
      const board = parseBoard(r.room.board);
      if (!board) return json({ ok: false, why: "bad-board" });
      const bad = validate(board, state, mine.seat, move);
      if (bad) return json({ ok: false, why: "illegal", detail: bad, at: state.at });

      try {
        await DB.prepare(
          `INSERT INTO room_moves (room_id, seq, user_id, seat, player, season, slot, created_ts)
           VALUES (?,?,?,?,?,?,?,?)`
        ).bind(id, state.at, auth.userId, mine.seat, move.player, move.season, move.slot, Date.now()).run();
      } catch (e) {
        /* THE RACE, and the only place it can happen. Someone claimed this
           sequence number first; hand back the fresh log so the caller can
           redraw and try again rather than guess. */
        const again = await loadRoom(DB, id);
        const st2 = again ? deriveState(order, again.moves) : state;
        return json({ ok: false, why: "behind", at: st2.at, moves: again ? again.moves : r.moves });
      }

      const after = await loadRoom(DB, id);
      const st = deriveState(order, after.moves);
      if (st.done && r.room.state !== "done") {
        await DB.prepare("UPDATE rooms SET state = 'done' WHERE id = ?").bind(id).run().catch(() => {});
        after.room.state = "done";
      }
      return json(view(after, st, order, after.moves.slice(state.at)));
    }

    /* ---------- read ---------- */
    if (op === "get") {
      const since = Number(q.get("since"));
      const from = Number.isInteger(since) && since >= 0 ? since : 0;
      return json(Object.assign(view(r, state, order, r.moves.slice(from)),
        { seat: mine ? mine.seat : null, board: q.get("board") === "1" ? r.room.board : undefined }));
    }

    return json({ ok: false, why: "no-op" });
  } catch (e) {
    return json({ ok: false, why: "server", detail: String((e && e.message) || e).slice(0, 120) });
  }
}
