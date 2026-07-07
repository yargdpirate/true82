/* TRUE 82 — /api/notebook: the Scouting Notebook. States only move UP
   (1 drafted → 2 contender → 3 immortal); the server clamp is the law.
   "Seen" stays client-only (localStorage) — write-volume ruling in §3. */
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
    let adv = Array.isArray(body.advances) ? body.advances : [];
    adv = adv.filter(a => a && typeof a.ps === "string" && a.ps.length <= 80 &&
      [1, 2, 3].includes(a.state)).slice(0, 100);
    const now = Date.now();
    let applied = 0;
    for (const a of adv) {
      const r = await env.DB.prepare(
        `INSERT INTO notebook (user_id, ps, state, ts) VALUES (?,?,?,?)
         ON CONFLICT(user_id, ps) DO UPDATE SET state = excluded.state, ts = excluded.ts
         WHERE excluded.state > notebook.state`
      ).bind(auth.userId, a.ps, a.state, now).run().catch(() => null);
      if (r && r.meta && r.meta.changes) applied += r.meta.changes;
    }
    return json({ ok: true, applied });
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}

export async function onRequestGet({ request, env }) {
  try {
    const auth = await getAuth(request, env);
    if (!auth) return json({ ok: true, entries: [] });
    if (!env.DB) return json({ ok: true, entries: [] });
    const rows = await env.DB.prepare(
      "SELECT ps, state, ts FROM notebook WHERE user_id = ? LIMIT 5000"
    ).bind(auth.userId).all();
    return json({ ok: true, entries: rows.results || [] });
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}
