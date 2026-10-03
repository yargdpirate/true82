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
  const auth = await getAuth(context.request, context.env);
  return auth ? { ...auth, mock: false } : null;
}
