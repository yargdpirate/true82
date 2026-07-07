/* TRUE 82 — GET /api/me: profile + aggregates + the "your move" chip.
   Anonymous is a VALID answer ({ok:true, anonymous:true}) — never an error. */
import { getAuth } from "../_lib/auth.js";

const json = (obj, err) => new Response(JSON.stringify(obj), {
  status: 200,
  headers: { "content-type": "application/json", ...(err ? { "x-t82-err": String(err).slice(0, 120) } : {}) },
});

export async function onRequestGet({ request, env }) {
  try {
    const auth = await getAuth(request, env);
    if (!auth) return json({ ok: true, anonymous: true });
    const out = { ok: true, anonymous: false,
      user: { tag: auth.tag, name: auth.name } };
    if (!env.DB) return json(out);

    const u = await env.DB.prepare(
      "SELECT tag, display_name, title, frame, banner, created_ts FROM users WHERE id = ?"
    ).bind(auth.userId).first().catch(() => null);
    if (u) out.user = { tag: u.tag, name: u.display_name, title: u.title,
      frame: u.frame, banner: u.banner, since: u.created_ts };

    try {
      const modes = await env.DB.prepare(
        `SELECT mode, COUNT(*) games, SUM(wins) winsDrafted, MAX(wins) best,
                AVG(budget_used) avgCap
           FROM runs WHERE user_id = ? AND verified = 1 GROUP BY mode`
      ).bind(auth.userId).all();
      out.aggregates = { byMode: (modes && modes.results) || [] };
    } catch (e) { out.aggregates = null; }

    try {
      const picked = await env.DB.prepare(
        `SELECT json_extract(j.value,'$[0]') name, COUNT(*) n
           FROM runs, json_each(runs.picks) j
          WHERE runs.user_id = ? AND runs.verified = 1 AND runs.picks IS NOT NULL
          GROUP BY name ORDER BY n DESC LIMIT 3`
      ).bind(auth.userId).all();
      out.mostPicked = (picked && picked.results) || [];
    } catch (e) { out.mostPicked = null; }

    try {
      const d = await env.DB.prepare(
        "SELECT COUNT(*) c FROM matches WHERE turn = ? AND status = 'active'"
      ).bind(auth.userId).first();
      out.yourMove = d ? d.c : 0;                 // the Arena chip
    } catch (e) { out.yourMove = 0; }

    return json(out);
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}
