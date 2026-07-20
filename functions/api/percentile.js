// GET /api/percentile — the "Top X% of drafters" line for SHARE TEXT v2.
// Two populations, both from game_complete rows already in D1 (no new writes,
// no cron, settle-on-read like everything else):
//   ?wins=66&variant=daily:9   -> that board's official runs (daily:9 + daily-link:9;
//                                 practice reruns are excluded by construction)
//   ?wins=66&mode=cap          -> all-time standalone runs of that mode (daily runs
//                                 riding the mode are excluded via the variant prefix)
// Reply: { pct, n }. pct is 1..99 ("Top pct%"), or null when the sample is too
// thin to brag about (n < MIN_N) — the client then omits the line entirely.
// Fails soft like /api/stats: unbound DB, bad input, or a query error all reply
// { pct: null, n: 0 } with a 200. This endpoint must never break a share.

const MODES = new Set(["classic", "pro", "cap"]);
const MIN_N = 10;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") return new Response("method", { status: 405 });
  const none = { pct: null, n: 0 };
  if (!env.DB) return reply(none);

  const u = new URL(request.url);
  const wins = Number(u.searchParams.get("wins"));
  if (!Number.isInteger(wins) || wins < 0 || wins > 82) return reply(none);

  const variant = u.searchParams.get("variant") || "";
  const mode = u.searchParams.get("mode") || "";

  let sql, binds;
  const dm = /^daily:(\d{1,5})$/.exec(variant);
  if (dm) {
    // The board number scopes the day: a daily's variant only ever exists for
    // the one rotation date it ran, so no ts window is needed.
    sql = `SELECT COUNT(*) n, SUM(CASE WHEN wins > ? THEN 1 ELSE 0 END) better
             FROM events
            WHERE name='game_complete' AND wins IS NOT NULL
              AND variant IN (?, ?)`;
    binds = [wins, "daily:" + dm[1], "daily-link:" + dm[1]];
  } else if (MODES.has(mode)) {
    sql = `SELECT COUNT(*) n, SUM(CASE WHEN wins > ? THEN 1 ELSE 0 END) better
             FROM events
            WHERE name='game_complete' AND wins IS NOT NULL AND mode = ?
              AND (variant IS NULL OR variant NOT LIKE 'daily%')`;
    binds = [wins, mode];
  } else {
    return reply(none);
  }

  try {
    const row = await env.DB.prepare(sql).bind(...binds).first();
    const n = (row && +row.n) || 0;
    if (n < MIN_N) return reply({ pct: null, n });
    const better = (row && +row.better) || 0;
    // Your own just-landed row (if it landed) has wins == wins, never wins > wins,
    // so `better` is clean either way; the +1 seats you in the ranking.
    const pct = Math.max(1, Math.min(99, Math.ceil((100 * (better + 1)) / n)));
    return reply({ pct, n });
  } catch (e) {
    return reply(none);
  }
}

function reply(obj) {
  return new Response(JSON.stringify(obj), {
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}
