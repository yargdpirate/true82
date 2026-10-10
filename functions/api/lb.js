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
import { accountAuth, json, db } from "../_lib/acct.js";

const LIMIT = 82;                       // of course
export const MIN_RUNS = 10;                    // the 82-0% board's qualifying bar; one dial
export const MONTH_BEST = 10;                  // v69.5: how many Dailies THIS MONTH counts
export const MONTH_MIN = 3;                    // ...and how many you need before it ranks you
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
           ORDER BY score DESC, runs DESC`,
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
            ORDER BY b.score DESC, b.days DESC`,
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
           ORDER BY score ASC`,
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
           ORDER BY score DESC`,
    args: () => []
  },
  /* v69.5 THE 82-0 CLUB, the owner's pick from the lab's SPEC: unlimited
     winners and NO DENOMINATOR. The rate board can be gamed by playing less —
     eleven seasons with one 82 beats a hundred seasons with eight — and it
     punishes the player who experiments. The club cannot be gamed by not
     playing: you are either in it or you are not, and playing more can only
     ever help you.

     IT EXCLUDES DAILIES for the same reason rate, net and cheapest do (v69.2):
     a Daily carries a modifier, and market_crash alone would mint perfects that
     mean something different from a Classic 82-0. The Daily keeps its own two
     boards.

     Ties break on who got there FIRST, which is the only honest tiebreak for a
     club: the field is unbounded, so without it an alphabet of GMs on one
     perfect would be ordered by nothing at all. */
  club: {
    title: "The 82-0 club",
    note: "Every GM with a perfect season. No percentage, no minimum \u2014 playing more can only help you. Dailies have their own boards.",
    sql: `SELECT r.user_id uid, ${NAME} name, u.tag tag,
                 COUNT(*) score, MIN(r.created_ts) first_ts
            FROM runs r JOIN users u ON u.id = r.user_id
           WHERE r.verified = 1 AND r.user_id IS NOT NULL AND r.official IS NULL
             AND r.wins = 82
           GROUP BY r.user_id
           ORDER BY score DESC, first_ts ASC`,
    args: () => []
  },

  /* v69.5 THIS MONTH, the lab's other code change. The problem it solves is
     arrival time: a cumulative board is already won by the time a player who
     saw the influencer on 10/22 opens the game, and there is nothing they can
     do about it. So it is an AVERAGE of your best ${MONTH_BEST} Dailies this
     month, not a sum — a player three days in competes with a player twenty
     days in on equal terms, and a wrecked day drops out once you have more than
     ten.

     THE MINIMUM IS WHY IT IS NOT A LOTTERY. Without one, a single lucky 82 on
     one day tops the board forever; ${MONTH_MIN} days is low enough that a late
     arrival clears it inside a long weekend and high enough that one day cannot
     own the month. Both numbers are dials at the top of this file.

     The month comes from the day key's own first seven characters, so it is the
     player's LOCAL month, the same convention the key itself uses (v69.2). */
  month: {
    title: "This month",
    note: "Your best " + MONTH_BEST + " Dailies this month, averaged. " + MONTH_MIN + " days to qualify, so arriving late is not losing.",
    sql: `WITH ranked AS (
             SELECT r.user_id, r.wins, r.net,
                    ROW_NUMBER() OVER (PARTITION BY r.user_id ORDER BY r.wins DESC, r.net DESC) rn
               FROM runs r
              WHERE r.verified = 1 AND r.user_id IS NOT NULL
                AND r.official IS NOT NULL AND substr(r.official, 1, 7) = ?
           ), kept AS (
             SELECT user_id, COUNT(*) days, AVG(wins) avg_wins, MAX(wins) best
               FROM ranked WHERE rn <= ${MONTH_BEST} GROUP BY user_id
           )
           SELECT k.user_id uid, ${NAME} name, u.tag tag,
                  ROUND(k.avg_wins, 1) score, k.days days, k.best best
             FROM kept k JOIN users u ON u.id = k.user_id
            WHERE k.days >= ${MONTH_MIN}
            ORDER BY score DESC, k.days DESC`,
    args: (q) => [/^\d{4}-\d{2}$/.test(q.get("month") || "") ? q.get("month") : utcDay().slice(0, 7)]
  },

  daily: {
    title: "Today's board",
    note: "One attempt a day. The first one counts.",
    sql: `SELECT r.user_id uid, ${NAME} name, u.tag tag, r.wins score, r.net net
            FROM runs r JOIN users u ON u.id = r.user_id
           WHERE r.verified = 1 AND r.user_id IS NOT NULL AND r.official = ?
           ORDER BY r.wins DESC, r.net DESC`,
    args: (q) => [DAY_RE.test(q.get("day") || "") ? q.get("day") : utcDay()]
  }
};

function utcDay() { return new Date().toISOString().slice(0, 10); }

export async function onRequestGet(context) {
  const DB = db(context);          // the preview's own database when one is bound (acct.js)
  const { request, env } = context;
  try {
    const q = new URL(request.url).searchParams;
    const key = q.get("board") || "daily";
    const board = BOARDS[key];
    if (!board) return json({ ok: false, why: "no-board" });
    if (!DB) return json({ ok: true, board: key, rows: [], note: board.note });

    const args = board.args(q);
    const res = await DB.prepare(board.sql + ` LIMIT ${LIMIT}`).bind(...args).all().catch(() => null);
    const rows = (res && res.results) || [];

    const out = {
      ok: true, board: key, title: board.title, note: board.note,
      scope: args.length ? String(args[0]) : null,
      rows: rows.map((r, i) => ({ rank: i + 1, ...r })),
      minRuns: key === "rate" ? MIN_RUNS : undefined,
      minDays: key === "month" ? MONTH_MIN : undefined,
      bestOf: key === "month" ? MONTH_BEST : undefined
    };

    /* "AND WHERE AM I?" — THE REAL ANSWER, NOT THE ONE ON THIS PAGE (v69.2).
       This used to resolve `you` with out.rows.find() over the 82 rows already
       fetched, so every player ranked 83rd or lower got { rank: null } and
       accounts.js printed "You're not on this board yet" UNDER A SEASON THEY
       WERE PROUD OF. On a Daily after the debut that is most of the audience
       being told they do not exist.

       The board's own SQL is now LIMIT-free, so it can be wrapped once and
       ranked honestly: how many GMs are on it, where this one sits, and what
       they scored. Ties share a rank (competition ranking: two GMs tied for
       first are both 1st and the next is 3rd), which is what a reader expects
       and what the row order alone cannot express.

       `outOf` is the other half of the owner's standings rule (DECISIONS.md):
       a rank with no field size is flattering nonsense on a small board, so the
       server never sends one without the other. */
    const auth = await accountAuth(context);
    if (auth && auth.userId) {
      const cmp = board.asc ? "<" : ">";
      const me = await DB.prepare(
        `WITH b AS (${board.sql})
         SELECT (SELECT COUNT(*) FROM b) outOf,
                (SELECT score FROM b WHERE uid = ?) score,
                (SELECT COUNT(*) FROM b x WHERE x.score ${cmp} (SELECT score FROM b WHERE uid = ?)) better`
      ).bind(...args, auth.userId, auth.userId).first().catch(() => null);

      if (me && me.score !== null && me.score !== undefined) {
        out.you = { rank: (me.better || 0) + 1, score: me.score, outOf: me.outOf || 0 };
      } else {
        out.you = { rank: null, outOf: (me && me.outOf) || 0 };
      }
    }
    out.rows.forEach((r) => { delete r.uid; });        // never leak internal ids

    return json(out);
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}
