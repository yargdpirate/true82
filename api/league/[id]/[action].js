/* TRUE 82 — POST /api/league/:id/:action — join · start.
   Start freezes the roster (seats by join order), computes the season length,
   and sets the clock to the NEXT Monday 00:00 UTC — every season opens
   official. Both actions are optimistic-locked on status. */
import { getAuth } from "../../../_lib/auth.js";
import LG from "../../../../league-core.js";

const json = (obj, err) => new Response(JSON.stringify(obj), {
  status: 200,
  headers: { "content-type": "application/json", ...(err ? { "x-t82-err": String(err).slice(0, 120) } : {}) },
});

export async function onRequestPost({ request, env, params }) {
  try {
    const auth = await getAuth(request, env);
    if (!auth) return json({ ok: false, why: "auth" });
    if (!env.DB) return json({ ok: false, why: "no-db" });
    const id = String(params.id || ""), action = String(params.action || "");
    const lg = await env.DB.prepare("SELECT * FROM leagues WHERE id = ?").bind(id).first();
    if (!lg) return json({ ok: false, why: "no-league" });
    const now = Date.now();

    if (action === "join") {
      if (lg.status !== "forming") return json({ ok: false, why: "not-forming" });
      const c = await env.DB.prepare("SELECT COUNT(*) c FROM league_members WHERE league_id = ?").bind(id).first();
      if (c && c.c >= LG.MAX_PLAYERS) return json({ ok: false, why: "full" });
      const r = await env.DB.prepare(
        "INSERT OR IGNORE INTO league_members (league_id, user_id, seat, joined_ts) VALUES (?,?,NULL,?)"
      ).bind(id, auth.userId, now).run();
      return json({ ok: true, joined: !!(r.meta && r.meta.changes), already: !(r.meta && r.meta.changes) });
    }

    if (action === "start") {
      if (lg.status !== "forming") return json({ ok: false, why: "not-forming" });
      if (lg.commissioner !== auth.userId) return json({ ok: false, why: "not-commissioner" });
      const mem = (await env.DB.prepare(
        "SELECT user_id FROM league_members WHERE league_id = ? ORDER BY joined_ts, user_id"
      ).bind(id).all()).results || [];
      if (mem.length < LG.MIN_PLAYERS) return json({ ok: false, why: "need-players", have: mem.length, need: LG.MIN_PLAYERS });
      const startTs = LG.nextMondayUtc(now);
      const weeks = LG.seasonWeeks(mem.length, lg.rounds);
      const cas = await env.DB.prepare(
        "UPDATE leagues SET status = 'active', start_ts = ?, week_opened_ts = ?, season_weeks = ?, updated_ts = ? WHERE id = ? AND status = 'forming'"
      ).bind(startTs, startTs, weeks, now, id).run();
      if (!cas.meta || !cas.meta.changes) return json({ ok: false, why: "raced" });
      for (let i = 0; i < mem.length; i++) {
        await env.DB.prepare("UPDATE league_members SET seat = ? WHERE league_id = ? AND user_id = ?")
          .bind(i, id, mem[i].user_id).run();
      }
      return json({ ok: true, startTs, seasonWeeks: weeks, players: mem.length });
    }

    return json({ ok: false, why: "bad-action" });
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}
