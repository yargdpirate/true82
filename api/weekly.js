/* TRUE 82 — GET /api/weekly: the live weekly challenge (override-aware).
   The CLIENT can compute the rotation from challenges.js, but only the server
   knows about a KV override (weekly:override:<week>) — so the start-screen
   tile asks here. Anonymous-safe; `best` appears when signed in. */
import { getAuth } from "../_lib/auth.js";
import CH from "../../challenges.js";

const json = (obj, err) => new Response(JSON.stringify(obj), {
  status: 200,
  headers: { "content-type": "application/json", "cache-control": "no-store",
    ...(err ? { "x-t82-err": String(err).slice(0, 120) } : {}) },
});

export async function onRequestGet({ request, env }) {
  try {
    const week = CH.weekKey();
    let ch = CH.weeklyFor().ch;
    if (env.GAMES) {
      const ov = await env.GAMES.get("weekly:override:" + week).catch(() => null);
      if (ov && CH.byId[ov]) ch = CH.byId[ov];
    }
    const out = { ok: true, week, challengeId: ch.id, name: ch.name,
      blurb: ch.blurb, base: ch.base, endsInS: CH.weekEndsInS() };
    const auth = await getAuth(request, env);
    if (auth && env.DB) {
      const b = await env.DB.prepare(
        `SELECT wins, net FROM runs WHERE user_id = ? AND week = ? AND challenge_id = ? AND verified = 1
          ORDER BY (wins + net / 1000.0) DESC LIMIT 1`
      ).bind(auth.userId, week, ch.id).first().catch(() => null);
      if (b) out.best = { wins: b.wins, net: b.net };
    }
    return json(out);
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}
