/* TRUE 82 — GET /api/me: who is this, and what did they claim?
   Anonymous is a VALID answer ({ok:true, anonymous:true}) — never an error.
   v69: trimmed from origin/accounts-test's version, which also aggregated the
   `runs` table and counted `matches` for the Arena chip. Neither table exists
   on this lane; this reads `users` and the one `local_claims` row. Two reads. */
import { accountAuth, json } from "../_lib/acct.js";

export async function onRequestGet(context) {
  const { env, request } = context;
  try {
    const auth = await accountAuth(context);
    if (!auth) {
      // A diagnostic, because "anonymous" has two very different causes and
      // they look identical from a phone: the browser sent no token, or it sent
      // one the server could not verify. Only answered when a token WAS
      // presented, and it leaks nothing — CLERK_JWT_KEY is a public key, and
      // whether auth is configured is already obvious to anyone who tries it.
      const sent = !!(request.headers.get("authorization") || /(^|;\s*)__session=/.test(request.headers.get("cookie") || ""));
      if (!sent) return json({ ok: true, anonymous: true });
      return json({ ok: true, anonymous: true, tokenSent: true,
        serverHasKey: !!(env && env.CLERK_JWT_KEY),
        why: (env && env.CLERK_JWT_KEY) ? "token-rejected" : "no-key-on-this-environment" });
    }

    const out = { ok: true, anonymous: false, user: { tag: auth.tag, name: auth.name } };
    if (!env.DB) return json(out);

    const u = await env.DB.prepare(
      "SELECT tag, display_name, title, frame, banner, created_ts FROM users WHERE id = ?"
    ).bind(auth.userId).first().catch(() => null);
    if (u) out.user = { tag: u.tag, name: u.display_name, title: u.title,
      frame: u.frame, banner: u.banner, since: u.created_ts };

    const c = await env.DB.prepare(
      "SELECT days, streak, ts FROM local_claims WHERE user_id = ? AND kind = 'daily1'"
    ).bind(auth.userId).first().catch(() => null);
    if (c) out.claimed = { days: c.days || 0, streak: c.streak || 0, at: c.ts || null };

    return json(out);
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}
