/* TRUE 82 — POST /api/league: found a league. {name, format?, rounds?} ->
   {ok, id, link}. Status starts 'forming'; the share link is the invite
   (the duel pattern). Seats and the season clock are assigned at /start. */
import { getAuth } from "../_lib/auth.js";
import { cleanName } from "../_lib/daily.js";
import LG from "../../league-core.js";

const json = (obj, err) => new Response(JSON.stringify(obj), {
  status: 200,
  headers: { "content-type": "application/json", ...(err ? { "x-t82-err": String(err).slice(0, 120) } : {}) },
});
const ALPHA = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
function slug(n) {
  const a = new Uint8Array(n); crypto.getRandomValues(a);
  let s = ""; for (let i = 0; i < n; i++) s += ALPHA[a[i] % ALPHA.length];
  return s;
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { body = {}; }
  try {
    const auth = await getAuth(request, env);
    if (!auth) return json({ ok: false, why: "auth" });
    if (!env.DB) return json({ ok: false, why: "no-db" });
    const name = cleanName(String(body.name || "")) || "League " + slug(4);
    const format = LG.FORMATS.includes(body.format) ? body.format : "all";
    const rounds = body.rounds === 2 ? 2 : 1;
    const fast = body.fastAdvance === true ? 1 : 0;
    const forming = await env.DB.prepare(
      "SELECT COUNT(*) c FROM leagues WHERE commissioner = ? AND status = 'forming'"
    ).bind(auth.userId).first().catch(() => null);
    if (forming && forming.c >= 10) return json({ ok: false, why: "too-many-forming" });
    const id = slug(8);
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO leagues (id, name, format, rounds, status, commissioner,
         season_weeks, start_ts, settled_through, fast_advance, week_opened_ts, created_ts, updated_ts)
       VALUES (?,?,?,?,?,?,NULL,NULL,0,?,NULL,?,?)`
    ).bind(id, name, format, rounds, "forming", auth.userId, fast, now, now).run();
    await env.DB.prepare(
      "INSERT INTO league_members (league_id, user_id, seat, joined_ts) VALUES (?,?,NULL,?)"
    ).bind(id, auth.userId, now).run();
    return json({ ok: true, id, name, format, rounds, fastAdvance: !!fast, link: "https://true82.net/?league=" + id });
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}
