/* TRUE 82 — functions/_lib/acct.js: the account lane's two shared seams.
   ─────────────────────────────────────────────────────────────────────────────
   1. json()        — the fail-soft reply shape every endpoint here uses: HTTP
                      200 always, {ok:false, why} in the body, the real error in
                      an x-t82-err header. A 500 would make the game notice.

   2. accountAuth()  — getAuth(), and WHY THE MOCK DATABASE DOES NOT APPLY HERE.

   _middleware.js flags every host that isn't true82.net or localhost as
   `mockDb`: those hosts read the real database and have their writes dropped,
   so a preview looks real without polluting the owner's data. That rule was
   made (v60) about the ANALYTICS stream — events, retention, votes, Tribune
   view counts — because test traffic was skewing what /avocado reported.

   The account stream is not that stream. It feeds no analytics surface, and an
   account you cannot create is an account you cannot test: with the mock on,
   a preview can sign in but every board stays empty forever, which is the one
   thing a preview exists to let you check. So accounts and runs write from
   every host, and the analytics writers keep honouring `mockDb` exactly as
   before. Nothing about what /avocado reports changes.

   The cost, and it is real: test accounts and test runs made on a preview land
   in the production database and would show on the live boards. They are
   trivially identifiable and the handoff carries the one-line cleanup. Clear
   them before the boards go public.

   Callers get { userId, clerkId, tag, name } or null for anonymous. */
import { getAuth } from "./auth.js";

/* ---------- WHICH DATABASE (v69.3) ----------
   Until now every host wrote accounts and runs to the PRODUCTION database. That
   was a deliberate v69 call and the reasoning still holds (an account you cannot
   create is an account you cannot test), but it has a cost the owner hit head
   on: every test run lands on his real boards, cleanup is created_ts guesswork,
   and an agent cannot iterate without polluting the thing it is testing.

   So a preview may now have a database of its own. Bind D1 as `DB_PREVIEW` on
   the Preview environment and every account-lane write goes there instead;
   production is untouched and un-pollutable, and a scratch board can be wiped
   between runs without a second thought.

   FAIL-SOFT AND BACKWARD COMPATIBLE: with no DB_PREVIEW bound this returns
   env.DB and the behaviour is exactly what shipped. Nothing changes until he
   binds it.

   THE HOST CHECK IS THE SAME ONE _middleware.js USES for the analytics mock, on
   purpose: one definition of "this is the live site", so the two cannot drift
   into disagreeing about which host is production. */
const LIVE_HOSTS = new Set(["true82.net", "www.true82.net"]);

export function liveHost(request) {
  try { return LIVE_HOSTS.has(new URL(request.url).hostname.toLowerCase()); }
  catch { return true; }            // cannot tell: assume production and be careful
}

/** The database this request should use: the preview's own, or the real one. */
export function db(context) {
  try {
    const { env, request } = context;
    if (!liveHost(request) && env && env.DB_PREVIEW) return env.DB_PREVIEW;
    return (env && env.DB) || null;
  } catch { return null; }
}

/** The env an account endpoint should hand to auth.js: the same env with the
    resolved database on it, so functions/_lib/auth.js stays byte-identical to
    origin/accounts-test (the v69 rule) and still writes to the right place. */
export function acctEnv(context) {
  const resolved = db(context);
  return Object.assign({}, context.env, { DB: resolved });
}

export const json = (obj, err) => new Response(JSON.stringify(obj), {
  status: 200,
  headers: {
    "content-type": "application/json",
    "cache-control": "no-store",
    ...(err ? { "x-t82-err": String(err).slice(0, 120) } : {})
  },
});

/** Resolve the caller. Returns { userId, clerkId, tag, name } or null. */
export async function accountAuth(context) {
  const auth = await getAuth(context.request, acctEnv(context));
  return auth ? { ...auth, mock: false } : null;
}
