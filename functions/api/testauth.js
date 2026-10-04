/* TRUE 82 — GET /api/testauth: REAL Clerk session tokens, on a preview, for testing.
   ─────────────────────────────────────────────────────────────────────────────
   WHY THIS EXISTS. The owner, 2026-10-04: "i do want you directly controlling
   actual accounts instead of simulating - simulating is how i spent all this
   morning repeatedly having to redo server errors because the agent couldn't
   actually use it irl." He is right. Every failure that cost him a morning was a
   real fact about Clerk, Cloudflare env vars or a deployment, and no mock reaches
   those. What a mock CAN never catch is exactly what kept breaking.

   WHAT IT IS, AND WHAT IT IS NOT. This is not an auth bypass and it does not
   weaken _lib/auth.js, which is untouched. It asks CLERK for a real session token
   for a user that already exists, using Clerk's own Backend API, and hands it
   back. The token that comes out is signed by Clerk, carries a real azp and a
   real exp, and is verified by the same RS256 path every player's token goes
   through. If CLERK_JWT_KEY is wrong, or AUTHORIZED_PARTIES is wrong, or the
   deployment never rebuilt after an env var changed, a token from here FAILS,
   loudly, exactly as the owner's own phone would. That is the whole point: it
   tests the real thing rather than standing in for it.

   WHAT IT STILL CANNOT TEST, said plainly so nobody assumes otherwise: Clerk's
   browser sign-in UI and the @clerk/clerk-js bundle. Those need a human to sign
   in once per release. Everything downstream of the token is covered.

   CLERK'S OWN POSITION ON THIS. `POST /v1/sessions` is documented as "intended
   only for use in testing, and is not available for production instances". So
   the mechanism below works against the DEVELOPMENT instance a preview uses and
   is refused by Clerk itself against a production instance. That is a safety
   property this file gets for free, on top of its own three guards.

   ─────────────────────────────────────────────────────────────────────────────
   THE THREE GUARDS. All of them must pass, and any failure answers 404, so the
   endpoint does not even admit to existing:

     1. NOT THE LIVE SITE. true82.net and www.true82.net are refused by hostname,
        before anything else is read. acct.js liveHost() is the single definition,
        shared with the database switch, so the two cannot drift.
     2. THE ENV VAR MUST BE SET. No TEST_AUTH_SECRET, no endpoint. It is set on
        Preview only, so on Production this file is inert even if guard 1 were
        somehow wrong.
     3. THE CALLER MUST KNOW THE SECRET, and the comparison is length-safe so a
        wrong secret cannot be learned a character at a time by timing.

   And one more, because impersonation should never be open-ended:
     4. AN ALLOW-LIST. Only user ids named in TEST_USER_IDS can be minted for. A
        leaked secret on a preview still cannot touch the owner's own account.

   ─────────────────────────────────────────────────────────────────────────────
   SETUP, once, about ten minutes, all of it the owner's because it needs his
   Clerk secret:

     1. Clerk dashboard -> Users -> create however many test users you want. The
        `+clerk_test` convention works here (e.g. true82mailbox+clerk_test1@
        gmail.com): Clerk treats those as test identities and the verification
        code is always 424242, so no real inbox is involved. Copy each user id
        (they look like `user_2ab...`).
     2. Cloudflare Pages -> Settings -> Environment variables -> PREVIEW ONLY:
          CLERK_SECRET_KEY   the Secret Key from Clerk -> API keys (sk_test_...)
          TEST_AUTH_SECRET   any long random string you invent
          TEST_USER_IDS      the ids from step 1, comma separated
     3. REDEPLOY. Pages bakes environment variables in at build time, so a
        variable added without a rebuild does nothing. This has cost this project
        a whole afternoon once already (handoff 0000002b, trap one).

   DO NOT SET ANY OF THE THREE ON PRODUCTION. Guard 1 would still refuse, but the
   point of guard 2 is that production never even holds the key.

   USE:
     GET /api/testauth?k=<TEST_AUTH_SECRET>              -> { ok, users: [...] }
     GET /api/testauth?k=<secret>&user=<clerk user id>   -> { ok, token, userId }
   Then send the token exactly as the browser does:
     Authorization: Bearer <token>
*/

const CLERK_API = "https://api.clerk.com/v1";

import { json, liveHost } from "../_lib/acct.js";

/* 404, with nothing in it. A guard that explains itself tells an attacker which
   guard they tripped, and this endpoint has no legitimate anonymous caller. */
const nope = () => new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });

/* Length-safe comparison. The secret is short and the endpoint is on a public
   host, so a naive === leaks it one character at a time to anyone patient. */
function sameSecret(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function onRequestGet(context) {
  const { request, env } = context;

  // GUARD 1: never the live site, decided before anything else is read
  if (liveHost(request)) return nope();

  // GUARD 2: no secret configured, no endpoint
  const want = env && env.TEST_AUTH_SECRET;
  if (!want) return nope();

  const q = new URL(request.url).searchParams;

  // GUARD 3: the caller must know it
  const given = q.get("k") || request.headers.get("x-t82-test-secret") || "";
  if (!sameSecret(given, String(want))) return nope();

  const allowed = String((env && env.TEST_USER_IDS) || "")
    .split(",").map((s) => s.trim()).filter(Boolean);

  const userId = q.get("user");
  if (!userId) {
    // the roster, so a caller never has to guess an id
    return json({ ok: true, users: allowed, note: allowed.length ? undefined : "TEST_USER_IDS is not set" });
  }

  // GUARD 4: only the users the owner named
  if (allowed.indexOf(userId) < 0) return json({ ok: false, why: "user-not-in-TEST_USER_IDS" });

  const key = env && env.CLERK_SECRET_KEY;
  if (!key) return json({ ok: false, why: "no-CLERK_SECRET_KEY-on-this-environment" });

  const head = { authorization: "Bearer " + key, "content-type": "application/json" };

  try {
    /* Clerk's own testing flow: create a session for the user, then ask that
       session for a token. The token is the same shape and signature the
       browser's Clerk SDK would hand us, which is what makes this real. */
    const sRes = await fetch(CLERK_API + "/sessions", {
      method: "POST", headers: head, body: JSON.stringify({ user_id: userId })
    });
    const session = await sRes.json().catch(() => null);
    if (!sRes.ok || !session || !session.id) {
      return json({ ok: false, why: "clerk-session", status: sRes.status,
        detail: brief(session) });
    }

    /* No expires_in_seconds: the Clerk SDKs have a standing bug where that
       argument is rejected as request_body_invalid, and the default is fine. */
    const tRes = await fetch(CLERK_API + "/sessions/" + encodeURIComponent(session.id) + "/tokens", {
      method: "POST", headers: head, body: "{}"
    });
    const tok = await tRes.json().catch(() => null);
    if (!tRes.ok || !tok || !tok.jwt) {
      return json({ ok: false, why: "clerk-token", status: tRes.status, detail: brief(tok) });
    }

    return json({ ok: true, userId: userId, sessionId: session.id, token: tok.jwt });
  } catch (e) {
    return json({ ok: false, why: "network", detail: String((e && e.message) || e).slice(0, 120) });
  }
}

/* Clerk's errors are the useful half of a failure here, and they are about the
   owner's own configuration rather than about a player, so they are passed
   through rather than swallowed. Trimmed, because the whole body is noisy. */
function brief(o) {
  try {
    if (!o) return null;
    if (Array.isArray(o.errors) && o.errors.length) {
      return o.errors.map((e) => (e.message || "") + (e.long_message ? ": " + e.long_message : "")).join(" | ").slice(0, 300);
    }
    return JSON.stringify(o).slice(0, 300);
  } catch { return null; }
}
