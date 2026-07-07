/* TRUE 82 — GET /api/lb?board=&mode=&label=&week=&scope= : the records boards.
   ─────────────────────────────────────────────────────────────────────────────
   §6 LAW: "adding a board later = adding a query, never a feature" — so BOARDS
   below is literally a registry of queries. All boards read
   runs WHERE verified=1 AND user_id IS NOT NULL. Top 82 rows + (when signed
   in) me:{rank,pct,neighbors±3}. scope=global | group:<id>.
   Composite ordering everywhere: wins DESC, net tiebreak — (wins+net/1000). */
import { getAuth } from "../_lib/auth.js";
import { dailyLabel } from "../_lib/daily.js";
import CH from "../../challenges.js";

const json = (obj, err) => new Response(JSON.stringify(obj), {
  status: 200,
  headers: { "content-type": "application/json", ...(err ? { "x-t82-err": String(err).slice(0, 120) } : {}) },
});
const SCORE = "(r.wins + r.net/1000.0)";

/* Each board: { where(params) -> [sql, binds] | null, sel?, order?, group? }
   Default select surfaces wins/net; specialty boards override. */
const BOARDS = {
  daily:   { where: p => p.label ? ["r.official = ?", [p.label]] : null },
  alltime: { where: p => p.mode ? ["r.mode = ? AND r.official IS NULL", [p.mode]] : null,
             perUserBest: true },
  weekly:  { where: p => (p.week && p.challengeId) ? ["r.week = ? AND r.challenge_id = ?", [p.week, p.challengeId]] : null,
             perUserBest: true },
  immortals: { where: p => ["r.wins = 82" + (p.mode ? " AND r.mode = ?" : ""), p.mode ? [p.mode] : []],
             sel: "COUNT(*) AS metric", group: "GROUP BY r.user_id", order: "metric DESC" },
  cleanest:  { where: () => ["r.mode = 'cap' AND r.wins = 82", []],
             sel: "MAX(r.cap_left) AS metric", group: "GROUP BY r.user_id", order: "metric DESC" },
  cheapest:  { where: () => ["r.mode = 'cap' AND r.wins = 82", []],
             sel: "MIN(r.budget_used) AS metric", group: "GROUP BY r.user_id", order: "metric ASC" },
  purist:    { where: p => ["(r.hh_win IS NULL OR r.hh_win = 0)" + (p.mode ? " AND r.mode = ?" : ""), p.mode ? [p.mode] : []],
             sel: "MAX(r.net) AS metric", group: "GROUP BY r.user_id", order: "metric DESC" },
  fewest_skips: { where: () => ["r.wins = 82 AND r.mode != 'kaman'", []],
             sel: "MIN(r.skips + r.rerolls) AS metric", group: "GROUP BY r.user_id", order: "metric ASC" },
};

export async function onRequestGet({ request, env }) {
  try {
    if (!env.DB) return json({ ok: false, why: "no-db" });
    const q = new URL(request.url).searchParams;
    const boardName = q.get("board") || "daily";
    const B = BOARDS[boardName];
    if (!B) return json({ ok: false, why: "bad-board" });

    const params = {
      mode: ["classic", "pro", "cap"].includes(q.get("mode")) ? q.get("mode") : null,
      label: q.get("label") || (boardName === "daily" ? dailyLabel(q.get("mode") || "cap") : null),
      week: q.get("week") || (boardName === "weekly" ? CH.weekKey() : null),
      challengeId: null,
    };
    if (boardName === "weekly") {
      let ov = null;
      try { ov = env.GAMES ? await env.GAMES.get("weekly:override:" + params.week) : null; } catch {}
      params.challengeId = q.get("challengeId") || ov || CH.weeklyFor().ch.id;
    }
    const w = B.where(params);
    if (!w) return json({ ok: false, why: "bad-params" });
    let [whereSql, binds] = w;
    whereSql = "r.verified = 1 AND r.user_id IS NOT NULL AND " + whereSql;

    // group scope: only members' rows
    let joins = "JOIN users u ON u.id = r.user_id";
    const scope = q.get("scope") || "global";
    const gm = /^group:([A-Za-z0-9_-]{2,32})$/.exec(scope);
    if (gm) { joins += " JOIN group_members g ON g.user_id = r.user_id AND g.group_id = ?"; binds = [gm[1], ...binds]; }

    const auth = await getAuth(request, env);
    let rows, meBlock = null;

    if (B.sel || B.perUserBest) {
      const sel = B.sel || `MAX(${SCORE}) AS metric, MAX(r.wins) AS wins`;
      const order = B.order || "metric DESC";
      const sql = `SELECT u.tag, u.display_name AS name, r.user_id, ${sel}
                     FROM runs r ${joins} WHERE ${whereSql}
                     ${B.group || "GROUP BY r.user_id"} ORDER BY ${order}, r.user_id ASC LIMIT 82`;
      rows = (await env.DB.prepare(sql).bind(...binds).all()).results || [];
      if (auth) {
        const idx = rows.findIndex(x => x.user_id === auth.userId);
        if (idx !== -1) meBlock = { rank: idx + 1, pct: Math.max(1, Math.round(((idx + 1) / rows.length) * 100)) };
      }
    } else {
      const sql = `SELECT u.tag, u.display_name AS name, r.user_id, r.wins, r.net, r.hh_win, r.created_ts
                     FROM runs r ${joins} WHERE ${whereSql}
                    ORDER BY ${SCORE} DESC, r.created_ts ASC LIMIT 82`;
      rows = (await env.DB.prepare(sql).bind(...binds).all()).results || [];
      if (auth) {
        const mine = await env.DB.prepare(
          `SELECT ${SCORE} s, r.wins, r.net FROM runs r WHERE ${whereSql.replace("r.user_id IS NOT NULL", "r.user_id = ?")}
            ORDER BY s DESC LIMIT 1`
        ).bind(...binds.map(b => b), auth.userId).first().catch(() => null);
        if (mine) {
          const above = await env.DB.prepare(
            `SELECT COUNT(*) c FROM runs r ${joins} WHERE ${whereSql} AND ${SCORE} > ?`
          ).bind(...binds, mine.s).first();
          const total = await env.DB.prepare(
            `SELECT COUNT(*) c FROM runs r ${joins} WHERE ${whereSql}`
          ).bind(...binds).first();
          const rank = (above ? above.c : 0) + 1, n = Math.max(1, total ? total.c : 1);
          const nb = await env.DB.prepare(
            `SELECT u.tag, u.display_name AS name, r.wins, r.net FROM runs r ${joins}
              WHERE ${whereSql} ORDER BY ${SCORE} DESC, r.created_ts ASC LIMIT 7 OFFSET ?`
          ).bind(...binds, Math.max(0, rank - 4)).all().catch(() => null);
          meBlock = { rank, outOf: n, pct: Math.max(1, Math.round((rank / n) * 100)),
            wins: mine.wins, net: mine.net, neighbors: nb ? nb.results : [] };
        }
      }
    }
    return json({ ok: true, board: boardName, params: { label: params.label, week: params.week, challengeId: params.challengeId, mode: params.mode },
      top: rows.map(({ user_id, ...r }) => r), me: meBlock });
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}
