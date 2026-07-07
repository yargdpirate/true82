/* TRUE 82 — GET /api/league/:id — the league home read, and the SETTLER.
   ZERO-CRON LAW: fully-past weeks settle inside this read. league_results'
   insert-once PK makes concurrent settlers no-op; settled_through advances by
   CAS (WHERE settled_through = w-1), so the clock never skips or repeats.
   Forming leagues are readable by any signed-in link-holder (the join
   funnel); active/complete are members-only. The current week's shared seed
   is minted here and ONLY for the current week — never early (§2.2). */
import { getAuth } from "../../_lib/auth.js";
import { dailySeed } from "../../_lib/daily.js";
import LG from "../../../league-core.js";
import CH from "../../../challenges.js";

const json = (obj, err) => new Response(JSON.stringify(obj), {
  status: 200,
  headers: { "content-type": "application/json", "cache-control": "no-store",
    ...(err ? { "x-t82-err": String(err).slice(0, 120) } : {}) },
});

function poolFor(format) { return CH.CHALLENGES.filter(LG.poolFilter(format)); }
function chFor(id, format, week) {
  const pool = poolFor(format);
  return pool[LG.challengeIndex(id, week, pool.length)];
}

export async function onRequestGet({ request, env, params }) {
  try {
    const auth = await getAuth(request, env);
    if (!auth) return json({ ok: false, why: "auth" });
    if (!env.DB) return json({ ok: false, why: "no-db" });
    const id = String(params.id || "");
    let lg = await env.DB.prepare("SELECT * FROM leagues WHERE id = ?").bind(id).first();
    if (!lg) return json({ ok: false, why: "no-league" });

    const memRows = (await env.DB.prepare(
      `SELECT m.user_id, m.seat, m.joined_ts, u.tag, u.display_name AS name
         FROM league_members m LEFT JOIN users u ON u.id = m.user_id
        WHERE m.league_id = ? ORDER BY COALESCE(m.seat, 999), m.joined_ts`
    ).bind(id).all()).results || [];
    const mySeatRow = memRows.find(m => m.user_id === auth.userId);
    if (lg.status !== "forming" && !mySeatRow) return json({ ok: false, why: "not-a-member" });

    const now = Date.now();
    const n = memRows.length;

    // ---- settle-on-read ----
    if (lg.status === "active") {
      // settle-on-read on the ADVANCE LAW: a week closes when its 7 days
      // elapse, or — in a fast_advance league — the moment every matchup has
      // both runs in. league-core.advanceDecision is the only judge.
      for (;;) {
        const w = (lg.settled_through || 0) + 1;
        const sched = LG.schedule(n, w, lg.rounds);
        if (!sched) break;
        const label = "lg|" + id + "|" + w;
        const rr = (await env.DB.prepare(
          "SELECT user_id, wins, net FROM runs WHERE official = ? AND verified = 1"
        ).bind(label).all()).results || [];
        const seatOf = {}; memRows.forEach(m => { seatOf[m.user_id] = m.seat; });
        const scoreBySeat = {};
        rr.forEach(r => { if (seatOf[r.user_id] != null) scoreBySeat[seatOf[r.user_id]] = LG.composite(r.wins, r.net); });
        const dec = LG.advanceDecision(lg, LG.allPlayed(sched, scoreBySeat), now);
        if (!dec) break;
        for (const row of LG.settleWeek(sched, scoreBySeat)) {
          await env.DB.prepare(
            `INSERT OR IGNORE INTO league_results (league_id, week, seat_a, seat_b, score_a, score_b, winner_seat)
             VALUES (?,?,?,?,?,?,?)`
          ).bind(id, w, row.a, row.b, row.sa, row.sb, row.winner).run().catch(() => {});
        }
        const cas = await env.DB.prepare(
          "UPDATE leagues SET settled_through = ?, week_opened_ts = ?, updated_ts = ? WHERE id = ? AND settled_through = ?"
        ).bind(w, dec.nextOpenedTs, now, id, w - 1).run().catch(() => null);
        if (!cas || !cas.meta || !cas.meta.changes) break;   // a racing reader beat us — theirs counts
        lg = { ...lg, settled_through: w, week_opened_ts: dec.nextOpenedTs };
      }
      if (lg.settled_through >= lg.season_weeks) {
        await env.DB.prepare("UPDATE leagues SET status = 'complete', updated_ts = ? WHERE id = ? AND status = 'active'")
          .bind(now, id).run().catch(() => {});
        lg = { ...lg, status: "complete" };
      }
    }

    // ---- the read ----
    const out = { ok: true, id, name: lg.name, format: lg.format, rounds: lg.rounds,
      status: lg.status, seasonWeeks: lg.season_weeks, startTs: lg.start_ts,
      commissioner: lg.commissioner === auth.userId,
      youAre: mySeatRow ? (mySeatRow.seat != null ? mySeatRow.seat : "joined") : null,
      members: memRows.map(m => ({ seat: m.seat, tag: m.tag, name: m.name })),
      link: "https://true82.net/?league=" + id };

    if (lg.status === "forming") {
      out.minPlayers = LG.MIN_PLAYERS; out.maxPlayers = LG.MAX_PLAYERS;
      out.previewChallenge = (c => ({ id: c.id, name: c.name, blurb: c.blurb, base: c.base }))(chFor(id, lg.format, 1));
      return json(out);
    }

    const wCur = Math.min((lg.settled_through || 0) + 1, lg.season_weeks);
    const opened = lg.week_opened_ts != null ? lg.week_opened_ts : lg.start_ts;
    out.fastAdvance = !!lg.fast_advance;
    out.week = now >= opened ? wCur : 0;
    if (out.week === 0) out.startsInS = Math.max(0, Math.floor((opened - now) / 1000));
    const results = (await env.DB.prepare(
      "SELECT week, seat_a a, seat_b b, score_a sa, score_b sb, winner_seat winner FROM league_results WHERE league_id = ?"
    ).bind(id).all()).results || [];
    out.standings = LG.standings(memRows.filter(m => m.seat != null).map(m => ({ seat: m.seat, tag: m.tag, name: m.name })), results)
      .map(t => ({ rank: t.rank, seat: t.seat, tag: t.member.tag, name: t.member.name,
        w: t.w, d: t.d, l: t.l, pts: t.pts, pf: Math.round(t.pf * 10) / 10 }));

    if (lg.status === "complete") {
      out.champion = out.standings[0] || null;
      return json(out);
    }

    if (out.week >= 1) {
      const ch = chFor(id, lg.format, out.week);
      out.challenge = { id: ch.id, name: ch.name, blurb: ch.blurb, base: ch.base };
      out.endsInS = Math.max(0, Math.floor((opened + LG.WEEK_MS - now) / 1000));
      if (env.DAILY_SECRET) out.seed = await dailySeed(env.DAILY_SECRET, "league|" + id + "|" + out.week);
      const sched = LG.schedule(n, out.week, lg.rounds);
      const mySeat = mySeatRow ? mySeatRow.seat : null;
      if (sched && mySeat != null) {
        const pair = sched.pairs.find(p => p[0] === mySeat || p[1] === mySeat);
        if (!pair) out.matchup = { bye: true };
        else {
          const oppSeat = pair[0] === mySeat ? pair[1] : pair[0];
          const opp = memRows.find(m => m.seat === oppSeat);
          const label = "lg|" + id + "|" + out.week;
          const runs = (await env.DB.prepare(
            "SELECT user_id, wins, net FROM runs WHERE official = ? AND verified = 1"
          ).bind(label).all()).results || [];
          const mine = runs.find(r => r.user_id === auth.userId);
          const theirs = opp ? runs.find(r => r.user_id === memRows.find(m => m.seat === oppSeat).user_id) : null;
          out.matchup = { oppSeat, oppTag: opp && opp.tag, oppName: opp && opp.name,
            yourRun: mine ? { wins: mine.wins, net: mine.net } : null,
            oppRun: theirs ? { wins: theirs.wins, net: theirs.net } : null };
        }
      }
    } else {
      out.previewChallenge = (c => ({ id: c.id, name: c.name, blurb: c.blurb, base: c.base }))(chFor(id, lg.format, 1));
    }
    return json(out);
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}
