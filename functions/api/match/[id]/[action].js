/* TRUE 82 — POST /api/match/:id/:action — join · move · quip · resign · rematch.
   ─────────────────────────────────────────────────────────────────────────────
   MOVE INTEGRITY: the server REBUILDS the match from (mode, seed, stored ops)
   via duel-core's replayMatch, applies the new op through the same state
   machine the client ran, and persists ops + summary. Nothing the client
   claims is trusted. RACE GUARD: the UPDATE is optimistic-locked on the
   updated_ts read at entry — a lost race returns {ok:false, why:"raced"} and
   the client refetches. */
import { ensureData } from "../../../_lib/data.js";
import { getAuth } from "../../../_lib/auth.js";
import { dailySeed } from "../../../_lib/daily.js";
import DUEL from "../../../../duel-core.js";

const json = (obj, err) => new Response(JSON.stringify(obj), {
  status: 200,
  headers: { "content-type": "application/json", ...(err ? { "x-t82-err": String(err).slice(0, 120) } : {}) },
});
const ALPHA = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
function slug(n) {
  const a = new Uint8Array(n); crypto.getRandomValues(a);
  let s = ""; for (let i = 0; i < n; i++) s += ALPHA[a[i] % ALPHA.length];
  return s;
}

export async function onRequestPost({ request, env, params }) {
  let body;
  try { body = await request.json(); } catch { body = {}; }
  try {
    const auth = await getAuth(request, env);
    if (!auth) return json({ ok: false, why: "auth" });
    if (!env.DB) return json({ ok: false, why: "no-db" });
    const id = String(params.id || ""), action = String(params.action || "");
    const m = await env.DB.prepare("SELECT * FROM matches WHERE id = ?").bind(id).first();
    if (!m) return json({ ok: false, why: "no-match" });
    const now = Date.now();
    const myIdx = auth.userId === m.p1 ? 0 : (auth.userId === m.p2 ? 1 : null);

    if (action === "join") {
      if (m.status !== "open") return json({ ok: false, why: "not-open" });
      if (auth.userId === m.p1) return json({ ok: false, why: "own-match" });
      const r = await env.DB.prepare(
        "UPDATE matches SET p2 = ?, status = 'active', updated_ts = ? WHERE id = ? AND status = 'open'"
      ).bind(auth.userId, now, id).run();
      if (!r.meta || !r.meta.changes) return json({ ok: false, why: "raced" });
      return json({ ok: true, youAre: 1, yourTurn: m.turn === auth.userId });
    }

    if (myIdx === null) return json({ ok: false, why: "not-in-match" });

    if (action === "quip") {
      // no rebuild needed: turn-throttle math only needs the op count
      const qid = parseInt(body.qid, 10);
      if (!(qid >= 0 && qid < DUEL.QUIPS.length)) return json({ ok: false, why: "bad-quip" });
      const ops = JSON.parse(m.actions || "[]");
      const quips = JSON.parse(m.quips || "[]");
      const turnIdx = ops.length;
      if (quips.some(q => q.u === myIdx && q.turnIdx === turnIdx))
        return json({ ok: false, why: "quip-throttle" });
      quips.push({ u: myIdx, qid, turnIdx, ts: now });
      const r = await env.DB.prepare(
        "UPDATE matches SET quips = ?, updated_ts = ? WHERE id = ? AND updated_ts = ?"
      ).bind(JSON.stringify(quips), now, id, m.updated_ts).run();
      if (!r.meta || !r.meta.changes) return json({ ok: false, why: "raced" });
      return json({ ok: true });
    }

    if (action === "resign") {
      if (m.status !== "active") return json({ ok: false, why: "not-active" });
      const winner = auth.userId === m.p1 ? m.p2 : m.p1;
      const r = await env.DB.prepare(
        "UPDATE matches SET status = 'resigned', winner = ?, updated_ts = ? WHERE id = ? AND status = 'active'"
      ).bind(winner, now, id).run();
      if (!r.meta || !r.meta.changes) return json({ ok: false, why: "raced" });
      return json({ ok: true, winner });
    }

    if (action === "rematch") {
      if (!["complete", "resigned", "archived"].includes(m.status))
        return json({ ok: false, why: "still-live" });
      if (!m.p2) return json({ ok: false, why: "never-joined" });
      if (!env.DAILY_SECRET) return json({ ok: false, why: "no-secret" });
      await ensureData(env, request);
      const nid = slug(10);
      const seed = await dailySeed(env.DAILY_SECRET, "duel|" + nid);
      const M = DUEL.newMatch(m.mode, seed);
      if (!M || M.status !== "active") return json({ ok: false, why: "dead-board" });
      const opp = auth.userId === m.p1 ? m.p2 : m.p1;
      // first-mover swaps: the requester GIVES the first move (consent-light)
      await env.DB.prepare(
        `INSERT INTO matches (id, mode, seed, core_version, status, p1, p2, turn,
           actions, state, quips, winner, rematch_of, created_ts, updated_ts)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(nid, m.mode, seed, M.S.coreVersion, "active", opp, auth.userId, opp,
        "[]", JSON.stringify(DUEL.summary(M)), "[]", null, id, now, now).run();
      return json({ ok: true, id: nid, link: "https://true82.net/?duel=" + nid, theirMove: true });
    }

    if (action === "move") {
      if (m.status !== "active") return json({ ok: false, why: "not-active" });
      const op = String(body.op || "");
      if (op.length > 64) return json({ ok: false, why: "bad-op" });
      const isFree = op.slice(0, 3) === "mv:" || op.slice(0, 3) === "sw:";
      if (!isFree && m.turn !== auth.userId) return json({ ok: false, why: "not-your-turn" });

      await ensureData(env, request);
      const ops = JSON.parse(m.actions || "[]");
      const rp = DUEL.replayMatch({ mode: m.mode, seed: m.seed, ops });
      if (!rp.ok) return json({ ok: false, why: "state-corrupt:" + rp.why }, "replay@" + rp.at);
      const M = rp.M;
      const r = DUEL.applyOp(M, myIdx, op, now);
      if (!r.ok) return json({ ok: false, why: r.why });
      ops.push({ u: myIdx, op, ts: now });

      const turnUser = M.status === "active" ? (M.turn === 0 ? m.p1 : m.p2) : null;
      const winnerUser = M.winner === null ? null : (M.winner === 0 ? m.p1 : m.p2);
      const upd = await env.DB.prepare(
        `UPDATE matches SET actions = ?, state = ?, status = ?, turn = ?, winner = ?, updated_ts = ?
          WHERE id = ? AND updated_ts = ?`
      ).bind(JSON.stringify(ops), JSON.stringify(DUEL.summary(M)), M.status,
        turnUser, winnerUser, now, id, m.updated_ts).run();
      if (!upd.meta || !upd.meta.changes) return json({ ok: false, why: "raced" });

      return json({ ok: true, summary: DUEL.summary(M),
        yourTurn: M.status === "active" && turnUser === auth.userId,
        status: M.status,
        result: M.status === "complete" ? {
          winner: winnerUser,
          draw: M.winner === null,
          coImmortals: M.winner === null && M.result[0].wins === 82 && M.result[1].wins === 82,
          lines: M.result.map(x => ({ wins: x.wins, losses: x.losses, net: x.net,
            hh: x.hh, capLeft: x.capLeft, picks: x.picks })),
        } : undefined });
    }

    return json({ ok: false, why: "bad-action" });
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}
