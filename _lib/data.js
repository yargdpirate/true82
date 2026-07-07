/* TRUE 82 — functions/_lib/data.js: dataset bootstrap for Pages Functions.
   ─────────────────────────────────────────────────────────────────────────────
   Workers ban eval/vm, so the Functions runtime imports the SAME sim-core.js the
   browser runs (esbuild CJS→ESM interop — VERIFY on a Preview deploy before
   trusting; the fallback, if interop ever misbehaves, is a checked-in mirror at
   functions/_shared/sim-core.js plus a checksum test in test.js).

   ensureData(env, request): loads /site_data.json from the deployment's own
   static assets via env.ASSETS, runs T82.initData once, and caches the promise
   at module scope — one parse per isolate, shared by every request it serves.
   ~2 MB JSON parse + table build is a cold-start cost only.

   OPS NOTE (measure in Phase B): if replay CPU on the free tier ever crowds the
   limit, ship a site_data.slim.json (players + meta only, no crests) and point
   this loader at it — the sim never touches crest art. */
import T82 from "../../sim-core.js";

let loading = null;

export function ensureData(env, request) {
  if (T82.t) return Promise.resolve(T82.t);
  if (!loading) {
    loading = env.ASSETS.fetch(new URL("/site_data.json", request.url))
      .then((r) => {
        if (!r.ok) throw new Error("site_data fetch " + r.status);
        return r.json();
      })
      .then((d) => T82.initData(d))
      .catch((e) => { loading = null; throw e; });
  }
  return loading;
}

export { T82 };
