/* TRUE 82 — POST /api/claim: stitch anonymous history onto the signed-in user.
   Gap ruling §14.1: the client keeps a localStorage ledger of run UUIDs; this
   endpoint attaches them (and any sid) append-only, idempotent, capped. Runs
   already owned by ANY user never move. Officials don't upgrade (v1 ruling —
   sign in BEFORE submitting for the board). */
import { getAuth } from "../_lib/auth.js";

const json = (obj, err) => new Response(JSON.stringify(obj), {
  status: 200,
  headers: { "content-type": "application/json", ...(err ? { "x-t82-err": String(err).slice(0, 120) } : {}) },
});

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, why: "bad-json" }); }
  try {
    const auth = await getAuth(request, env);
    if (!auth) return json({ ok: false, why: "auth" });
    if (!env.DB) return json({ ok: false, why: "no-db" });
    const now = Date.now();
    let linked = 0, adopted = 0;

    const sid = (typeof body.sid === "string" && /^[A-Za-z0-9_-]{4,64}$/.test(body.sid)) ? body.sid : null;
    if (sid) {
      await env.DB.prepare(
        "INSERT OR IGNORE INTO sid_links (sid, user_id, linked_ts) VALUES (?,?,?)"
      ).bind(sid, auth.userId, now).run().catch(() => {});
      const r = await env.DB.prepare(
        "UPDATE runs SET user_id = ? WHERE user_id IS NULL AND sid = ?"
      ).bind(auth.userId, sid).run().catch(() => null);
      linked = r && r.meta ? r.meta.changes || 0 : 0;
    }

    let ids = Array.isArray(body.runIds) ? body.runIds : [];
    ids = ids.filter(x => typeof x === "string" && /^[0-9a-fA-F-]{8,64}$/.test(x)).slice(0, 200);
    if (ids.length) {
      const ph = ids.map(() => "?").join(",");
      const r = await env.DB.prepare(
        `UPDATE runs SET user_id = ? WHERE user_id IS NULL AND id IN (${ph})`
      ).bind(auth.userId, ...ids).run().catch(() => null);
      adopted = r && r.meta ? r.meta.changes || 0 : 0;
    }
    return json({ ok: true, linkedBySid: linked, adopted });
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}
