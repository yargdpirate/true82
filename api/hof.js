/* TRUE 82 — /api/hof: save a verified run as a Hall of Fame card / list them.
   The card is a SNAPSHOT (JSON) so it survives any future schema drift. */
import { getAuth } from "../_lib/auth.js";

const json = (obj, err) => new Response(JSON.stringify(obj), {
  status: 200,
  headers: { "content-type": "application/json", ...(err ? { "x-t82-err": String(err).slice(0, 120) } : {}) },
});

function headline(wins, mode, hhWin) {
  if (wins >= 82) return hhWin ? "CAUGHT FIRE. IMMORTAL." : "PERFECTION. 82-0.";
  if (wins >= 78) return "A DYNASTY IN ONE SEASON";
  if (wins >= 70) return "CONTENDERS, CERTIFIED";
  if (wins >= 50) return "PLAYOFF BOUND";
  if (wins >= 30) return "A SEASON TO BUILD ON";
  return "THE PROCESS HAS BEGUN";
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, why: "bad-json" }); }
  try {
    const auth = await getAuth(request, env);
    if (!auth) return json({ ok: false, why: "auth" });
    if (!env.DB) return json({ ok: false, why: "no-db" });
    const runId = String(body.runId || "");
    const run = await env.DB.prepare(
      "SELECT * FROM runs WHERE id = ? AND user_id = ? AND verified = 1"
    ).bind(runId, auth.userId).first();
    if (!run) return json({ ok: false, why: "no-run" });
    const card = {
      mode: run.mode, wins: run.wins, losses: 82 - run.wins, net: run.net,
      hh: run.hh_win ? { seg: run.hh_seg, win: 1 } : null,
      capLeft: run.cap_left, budgetUsed: run.budget_used,
      lineup: run.picks ? JSON.parse(run.picks) : [],
      headline: headline(run.wins, run.mode, run.hh_win),
      official: run.official, week: run.week, challengeId: run.challenge_id,
      date: run.created_ts,
    };
    const r = await env.DB.prepare(
      "INSERT INTO hof (user_id, run_id, card, ts) VALUES (?,?,?,?)"
    ).bind(auth.userId, runId, JSON.stringify(card), Date.now()).run();
    return json({ ok: true, id: r.meta ? r.meta.last_row_id : null, card });
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}

export async function onRequestGet({ request, env }) {
  try {
    const auth = await getAuth(request, env);
    if (!auth) return json({ ok: true, cards: [] });
    if (!env.DB) return json({ ok: true, cards: [] });
    const rows = await env.DB.prepare(
      "SELECT id, card, ts FROM hof WHERE user_id = ? ORDER BY ts DESC LIMIT 50"
    ).bind(auth.userId).all();
    return json({ ok: true, cards: (rows.results || []).map(x => ({ id: x.id, ts: x.ts, ...JSON.parse(x.card) })) });
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}
