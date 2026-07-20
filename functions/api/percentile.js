// GET /api/percentile — the "Top X%" line for SHARE TEXT v2 (net-ranked, v33).
// WHY NET: wins bunch hard near the ceiling (Classic especially), so a wins
// rank made everyone elite. Net rating is continuous and discriminates the
// whole field. D1's net column is the RAW engine result — finishGame writes
// e.net before the Hot Hand ever touches a number — so the population is
// hot-free BY CONSTRUCTION, which is the owner's exclusion rule. Historic
// rows carry net, so the switch ranks against full history from day one.
// Populations:
//   ?net=8.2&variant=daily:9&mode=cap
//     -> that board's official runs (daily:9 + daily-link:9). THIN-BOARD
//        FALLBACK: under MIN_N the rank is taken against ALL daily runs of
//        the same base mode instead (variant LIKE 'daily%', practice
//        excluded), so an early finisher ranks against the daily-playing
//        population at large; once the board's own field reaches MIN_N the
//        board takes over. The reply's pool field says which was used.
//   ?net=8.2&mode=cap
//     -> all-time standalone same-mode (daily riders excluded).
// Reply { pct, n, pool }. pct is 1..99, or null when even the fallback is
// too thin. Always 200, always fail-soft: never break a share.

const MODES = new Set(["classic", "pro", "cap"]);
const MIN_N = 10;
const BASE = `SELECT COUNT(*) n, SUM(CASE WHEN net > ? THEN 1 ELSE 0 END) better
                FROM events
               WHERE name='game_complete' AND net IS NOT NULL AND `;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") return reply({ pct: null, n: 0 });
  const none = { pct: null, n: 0 };
  if (!env.DB) return reply(none);

  const u = new URL(request.url);
  const net = Number(u.searchParams.get("net"));
  if (!Number.isFinite(net) || net < -100 || net > 100) return reply(none);

  const variant = u.searchParams.get("variant") || "";
  const mode = u.searchParams.get("mode") || "";
  const dm = /^daily:(\d{1,5})$/.exec(variant);

  const rank = async (where, binds, pool) => {
    const row = await env.DB.prepare(BASE + where).bind(net, ...binds).first();
    const n = (row && +row.n) || 0;
    if (n < MIN_N) return null;
    const better = (row && +row.better) || 0;
    // A just-landed own row has net == net, never net > net, so `better` is
    // clean either way; the +1 seats you in the ranking.
    return { pct: Math.max(1, Math.min(99, Math.ceil((100 * (better + 1)) / n))), n, pool };
  };

  try {
    if (dm) {
      let r = await rank(`variant IN (?, ?)`, ["daily:" + dm[1], "daily-link:" + dm[1]], "board");
      if (!r && MODES.has(mode)) {
        r = await rank(
          `variant LIKE 'daily%' AND variant NOT LIKE 'daily-practice%' AND mode = ?`,
          [mode], "dailies");
      }
      return reply(r || none);
    }
    if (MODES.has(mode)) {
      const r = await rank(`mode = ? AND (variant IS NULL OR variant NOT LIKE 'daily%')`, [mode], "mode");
      return reply(r || none);
    }
    return reply(none);
  } catch (e) {
    return reply(none);
  }
}

function reply(obj) {
  return new Response(JSON.stringify(obj), {
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}
