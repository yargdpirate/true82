/* TRUE 82 — POST /api/name: set the display name. Filter -> 'GM-<tag>'
   fallback, never an error (the fallback IS the answer).
   v69: ported from origin/accounts-test, repointed at _lib/names.js. */
import { accountAuth, json } from "../_lib/acct.js";
import { cleanName } from "../_lib/names.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, why: "bad-json" }); }
  try {
    const auth = await accountAuth(context);
    if (!auth) return json({ ok: false, why: "auth" });
    const name = cleanName(body.name, auth.tag);
    const asked = String(body.name || "").replace(/\s+/g, " ").trim();
    if (env.DB) {
      await env.DB.prepare("UPDATE users SET display_name = ? WHERE id = ?")
        .bind(name, auth.userId).run().catch(() => {});
    }
    return json({ ok: true, name, filtered: name !== asked });
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}
