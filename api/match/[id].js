/* TRUE 82 — GET /api/match/:id — the poll while the match screen is open.
   Honors If-None-Match on updated_ts (304 = nothing changed, near-free poll).
   Open matches are readable by any signed-in link-holder (that's how joining
   works); active/finished are participants-only.
   FORFEIT LAW (§14.3, zero-cron): an active match idle >30 days reads as
   archived — and we MATERIALIZE that read (a read-triggered settle, not a
   job): archived-with-a-mover = forfeit LOSS for the mover. */
import { getAuth } from "../../_lib/auth.js";

const STALE_MS = 30 * 24 * 3600 * 1000;
const json = (obj, err, extra) => new Response(JSON.stringify(obj), {
  status: 200,
  headers: { "content-type": "application/json", ...(extra || {}),
    ...(err ? { "x-t82-err": String(err).slice(0, 120) } : {}) },
});

export async function onRequestGet({ request, env, params }) {
  try {
    const auth = await getAuth(request, env);
    if (!auth) return json({ ok: false, why: "auth" });
    if (!env.DB) return json({ ok: false, why: "no-db" });
    const id = String(params.id || "");
    let m = await env.DB.prepare("SELECT * FROM matches WHERE id = ?").bind(id).first();
    if (!m) return json({ ok: false, why: "no-match" });

    const mine = auth.userId === m.p1 || auth.userId === m.p2;
    if (m.status !== "open" && !mine) return json({ ok: false, why: "not-in-match" });

    // forfeit-on-read
    if ((m.status === "active" || m.status === "open") && Date.now() - m.updated_ts > STALE_MS) {
      const winner = m.status === "active" && m.turn
        ? (m.turn === m.p1 ? m.p2 : m.p1)   // the mover abandoned it — forfeit loss
        : null;
      const settleTs = Date.now();   // bump the tag: a polling client must NOT 304 past the settle
      await env.DB.prepare(
        "UPDATE matches SET status = 'archived', winner = ?, updated_ts = ? WHERE id = ? AND status = ?"
      ).bind(winner, settleTs, id, m.status).run().catch(() => {});
      m = { ...m, status: "archived", winner, updated_ts: settleTs };
    }

    const tag = 'W/"' + m.updated_ts + '"';
    if (request.headers.get("if-none-match") === tag)
      return new Response(null, { status: 304, headers: { etag: tag } });

    // opponent card
    const oppId = auth.userId === m.p1 ? m.p2 : m.p1;
    let opponent = null;
    if (oppId) {
      const u = await env.DB.prepare("SELECT tag, display_name FROM users WHERE id = ?")
        .bind(oppId).first().catch(() => null);
      if (u) opponent = { tag: u.tag, name: u.display_name };
    }
    return json({
      ok: true, id: m.id, mode: m.mode, seed: m.seed, status: m.status,
      youAre: auth.userId === m.p1 ? 0 : (auth.userId === m.p2 ? 1 : null),
      yourTurn: m.status === "active" && m.turn === auth.userId,
      ops: JSON.parse(m.actions || "[]"),
      quips: JSON.parse(m.quips || "[]"),
      summary: JSON.parse(m.state || "null"),
      winner: m.winner, youWon: m.winner == null ? null : m.winner === auth.userId,
      rematchOf: m.rematch_of, opponent,
      forfeit: m.status === "archived" && m.winner != null ? true : undefined,
    }, null, { etag: tag });
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}
