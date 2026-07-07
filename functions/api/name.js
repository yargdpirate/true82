/* TRUE 82 — POST /api/name: set display name. Filter → 'GM-<tag>' fallback,
   never an error (the fallback IS the answer). */
import { getAuth } from "../_lib/auth.js";
import { cleanName } from "../_lib/daily.js";

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
    const name = cleanName(body.name, auth.tag);
    if (env.DB) {
      await env.DB.prepare("UPDATE users SET display_name = ? WHERE id = ?")
        .bind(name, auth.userId).run().catch(() => {});
    }
    return json({ ok: true, name, filtered: name !== String(body.name || "").replace(/\s+/g, " ").trim() });
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}
