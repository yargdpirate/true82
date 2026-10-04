/* TRUE 82 — GET /api/lb: the boards.
   ─────────────────────────────────────────────────────────────────────────────
   v69.1. Five boards, the owner's list (2026-10-03):
     rate      82-0% on each mode          ?board=rate&mode=classic|pro|cap
     streak    longest daily streak        ?board=streak
     cheapest  least money to 82-0, Presti ?board=cheapest
     net       best net rating, Classic    ?board=net
     daily     best of a given Daily       ?board=daily&day=YYYY-MM-DD

   EVERY board filters `verified = 1 AND user_id IS NOT NULL`. A run the server
   could not replay, and a run nobody signed in for, can never appear. That is
   the whole reason the account exists — ACCOUNTS.md §1: "only the server's
   recomputation counts".

   Reads only, so safe on any host: a preview shows the real boards. Every SQL fragment below is a server
   constant — nothing from the query string is ever interpolated, only bound. */
import { accountAuth, json } from "../_lib/acct.js";

const LIMIT = 82;                       // of course
export const MIN_RUNS = 10;                    // the 82-0% board's qualifying bar; one dial
const MODES = new Set(["classic", "pro", "cap"]);
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const NAME = "COALESCE(NULLIF(u.display_name,''), 'GM-' || u.tag)";

/* v69.2 A DAILY IS NOT AN ORDINARY SEASON, so the three mode boards exclude it
   (`r.official IS NULL`). Measured by tools/boards-e2e.js before the fix: a GM who
   had played ZERO vanilla Classic seasons sat on the Classic Best net board, because
   a Daily stores under its BASE mode and nothing distinguished it. Three reasons it
   has to go:
     1. A Daily carries a modifier. challenges.js `market_crash` (PRICE_MULT 0) is
        live in the POOL3 rotation and capCost floors at $1, so on that day every
        player's five costs $5M. One such day would own Cheapest 82-0 forever, below
        anything reachable under Presti's ordinary $26-a-player ceiling.
     2. A Daily is a PROJECTION, not a season played out (app.js seasonReelPlays()
        excludes G.social), so its record is a different quantity from a Classic or
        Presti record and they do not belong in one column.
     3. It punished the habit the game wants. The 82-0% denominator counted every
        Daily, and a Daily almost never reaches 82, so playing the Daily every day
        LOWERED your 82-0 rate. The board was charging people for the streak.
   `official` is the only discriminator the schema has today; a weekly or challenge
   run that is not a Daily would still slip through, which is what the ch_id column
   in the handoff's migration 0032 is for. The Daily keeps its own two boards. */
export const BOARDS = {
  rate: {
    title: "82-0 rate",
    note: "Share of ordinary seasons that went 82-0. Needs " + MIN_RUNS + " seasons in the mode to qualify. Dailies have their own boards.",
    sql: `SELECT r.user_id uid, ${NAME} name, u.tag tag,
                 COUNT(*) runs, SUM(CASE WHEN r.wins = 82 THEN 1 ELSE 0 END) immortals,
                 (SUM(CASE WHEN r.wins = 82 THEN 1 ELSE 0 END) * 1.0 / COUNT(*)) score
            FROM runs r JOIN users u ON u.id = r.user_id
           WHERE r.verified = 1 AND r.user_id IS NOT NULL AND r.official IS NULL AND r.mode = ?
           GROUP BY r.user_id
          HAVING COUNT(*) >= ${MIN_RUNS}
           ORDER BY score DESC, runs DESC
           LIMIT ${LIMIT}`,
    args: (q) => [MODES.has(q.get("mode")) ? q.get("mode") : "classic"]
  },
  streak: {
    title: "Daily streak",
    note: "Longest run of consecutive Dailies played, verified.",
    /* Gaps and islands, computed from the Daily rows themselves rather than
       from a counter kept up to date on write. A counter has to assume days
       arrive in order; this does not, so it cannot drift, and there is exactly
       one source of truth. `julianday(day) - row_number()` is constant inside a
       consecutive run, so grouping on it gives each island its length. */
    sql: `WITH days AS (
             SELECT DISTINCT user_id, official
               FROM runs
              WHERE verified = 1 AND user_id IS NOT NULL AND official IS NOT NULL
           ), islands AS (
             SELECT user_id, official,
                    CAST(julianday(official) AS INTEGER)
                      - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY official) AS island
               FROM days
           ), spans AS (
             SELECT user_id, island, COUNT(*) len, MAX(official) last_day
               FROM islands GROUP BY user_id, island
           ), best AS (
             SELECT user_id,
                    MAX(len) score,
                    SUM(len) days,
                    MAX(CASE WHEN last_day >= date('now','-1 day') THEN len ELSE 0 END) current
               FROM spans GROUP BY user_id
           )
           SELECT b.user_id uid, ${NAME} name, u.tag tag, b.score score, b.current current, b.days days
             FROM best b JOIN users u ON u.id = b.user_id
            WHERE b.score > 0
            ORDER BY b.score DESC, b.days DESC
            LIMIT ${LIMIT}`,
    args: () => []
  },
  cheapest: {
    title: "Cheapest 82-0",
    note: "Least money spent on a perfect Presti season.",
    sql: `SELECT r.user_id uid, ${NAME} name, u.tag tag,
                 MIN(r.budget_used) score, MAX(r.cap_left) saved
            FROM runs r JOIN users u ON u.id = r.user_id
           WHERE r.verified = 1 AND r.user_id IS NOT NULL AND r.official IS NULL
             AND r.mode = 'cap' AND r.wins = 82 AND r.budget_used IS NOT NULL
           GROUP BY r.user_id
           ORDER BY score ASC
           LIMIT ${LIMIT}`,
    args: () => [],
    asc: true
  },
  net: {
    title: "Best net rating",
    note: "Highest net rating on a Classic season.",
    sql: `SELECT r.user_id uid, ${NAME} name, u.tag tag, MAX(r.net) score
            FROM runs r JOIN users u ON u.id = r.user_id
           WHERE r.verified = 1 AND r.user_id IS NOT NULL AND r.official IS NULL
             AND r.mode = 'classic' AND r.net IS NOT NULL
           GROUP BY r.user_id
           ORDER BY score DESC
           LIMIT ${LIMIT}`,
    args: () => []
  },
  daily: {
    title: "Today's board",
    note: "One attempt a day. The first one counts.",
    sql: `SELECT r.user_id uid, ${NAME} name, u.tag tag, r.wins score, r.net net
            FROM runs r JOIN users u ON u.id = r.user_id
           WHERE r.verified = 1 AND r.user_id IS NOT NULL AND r.official = ?
           ORDER BY r.wins DESC, r.net DESC
           LIMIT ${LIMIT}`,
    args: (q) => [DAY_RE.test(q.get("day") || "") ? q.get("day") : utcDay()]
  }
};

function utcDay() { return new Date().toISOString().slice(0, 10); }

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const q = new URL(request.url).searchParams;
    const key = q.get("board") || "daily";
    const board = BOARDS[key];
    if (!board) return json({ ok: false, why: "no-board" });
    if (!env.DB) return json({ ok: true, board: key, rows: [], note: board.note });

    const args = board.args(q);
    const res = await env.DB.prepare(board.sql).bind(...args).all().catch(() => null);
    const rows = (res && res.results) || [];

    const out = {
      ok: true, board: key, title: board.title, note: board.note,
      scope: args.length ? String(args[0]) : null,
      rows: rows.map((r, i) => ({ rank: i + 1, ...r })),
      minRuns: key === "rate" ? MIN_RUNS : undefined
    };

    // "and where am I?" — the line that makes a board personal. Cheap: one
    // lookup against the rows already fetched, no second query.
    const auth = await accountAuth(context);
    if (auth && auth.userId) {
      const mine = out.rows.find((r) => r.uid === auth.userId);
      out.you = mine ? { rank: mine.rank, score: mine.score } : { rank: null };
    }
    out.rows.forEach((r) => { delete r.uid; });        // never leak internal ids

    return json(out);
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}
