/* TRUE 82 — GET /api/day: the seeds the server mints, and nothing else.
   ─────────────────────────────────────────────────────────────────────────────
   v69.4. The browser used to compute every Daily's seed itself, which made every
   future board derivable and the three launch-week boards outright published.
   The seed now comes from here. See functions/_lib/dayseed.js for the mechanism
   and for why the pins are an environment variable rather than code.

   ONE RESPONSE COVERS EVERY CALLER. The day tile, the run, the archive list and
   accounts.js's board rendering all resolve boards through daily-core's
   `boardFor`, so they are all served by one map of key -> seed, fetched once at
   boot. The window runs from MINT_FROM through today, which keeps growing by one
   entry a day — about ten bytes, so a year of it is 4KB.

   IT REFUSES TOMORROW. The whole point is that a player cannot see a board
   before its day, so a key after today is never in the map, and asking for one
   explicitly is a 200 with `ok: false`. ON A PREVIEW IT ANSWERS ANYWAY: the
   owner tests launch boards on his phone with `?day=`, which would be
   impossible otherwise. The host check is `liveHost()` from _lib/acct.js — the
   same one _middleware.js uses for the analytics mock and acct.js uses for
   DB_PREVIEW, so there is exactly one definition of "this is the live site".

   IT SAYS WHETHER IT IS MINTING. `minting` and `pinned` are in every response,
   so a DAILY_SECRET or DAILY_PINS that never got baked into a deployment is one
   curl away from being obvious rather than being discovered by a player on a
   board that does not match. Neither field can leak a seed or a secret. */
import { liveHost } from "../_lib/acct.js";
import { MINT_FROM, mintSeed, mintState } from "../_lib/dayseed.js";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 800;            // a hard ceiling on the walk, whatever the clock says

const json = (obj, cache) => new Response(JSON.stringify(obj), {
  status: 200,
  headers: {
    "content-type": "application/json",
    /* Today's map is identical for every player, so the edge can serve it. That
       matters more than it looks: app.js now cannot start a Daily until this
       answers, so this endpoint's availability IS the Daily's availability, and
       a cached response survives a cold isolate or a Worker hiccup. Short
       enough that the first request after UTC midnight is not served
       yesterday's window. */
    "cache-control": cache ? "public, max-age=300" : "no-store"
  }
});

/* The server's own idea of today, in UTC. The CLIENT's day key is local
   (T82DAILY.dayKey(), the Wordle convention, and v69.2's board bug was exactly
   this disagreement), so a player west of UTC can legitimately ask for a key
   that is still "tomorrow" here. The window therefore runs one day PAST the
   server's today: generous by one, which costs one seed and avoids telling a
   player in Los Angeles that their own current Daily does not exist yet. */
function serverToday() {
  return new Date().toISOString().slice(0, 10);
}
function shift(key, n) {
  const d = new Date(key + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const state = mintState(env);

  try {
    const q = new URL(request.url).searchParams;
    const live = liveHost(request);
    const horizon = shift(serverToday(), 1);       // see serverToday()

    /* A single explicit key, which is how `?day=` testing and any future
       archive deep-link resolve one board without the whole window. */
    const one = q.get("key");
    if (one) {
      if (!DAY_RE.test(one)) return json({ ok: false, why: "bad-key", ...state });
      if (live && one > horizon) return json({ ok: false, why: "not-yet", ...state });
      const seed = await mintSeed(env, one);
      return json({
        ok: true, ...state,
        days: seed === null ? {} : { [one]: seed }
      }, live && one <= horizon);
    }

    /* The window. On a preview it reaches far enough forward to cover the launch
       week, so his phone can open 10/20 before 10/20. */
    const last = live ? horizon : shift(horizon, 120);
    const days = {};
    let key = MINT_FROM, n = 0;
    while (key <= last && n < MAX_DAYS) {
      const seed = await mintSeed(env, key);
      if (seed !== null) days[key] = seed;
      key = shift(key, 1);
      n++;
    }
    return json({ ok: true, ...state, today: serverToday(), days }, true);
  } catch (e) {
    /* Never a 500 and never an empty success: a failure here must be
       distinguishable from "this environment mints nothing", because the client
       treats the two differently — it retries one and plays on through the
       other. */
    return json({ ok: false, why: "server", detail: String((e && e.message) || e).slice(0, 120), ...state });
  }
}
