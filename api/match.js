/* TRUE 82 — POST /api/match: create a duel. {mode} -> {ok, id, link, summary}.
   Seed = HMAC(DAILY_SECRET, "duel|"+id) minted here (§2.2) — unpredictable,
   zero cron. The match is stored as (mode, seed, ops[]) and REBUILT from ops
   on every read/move — the op log is the state (duel-core serialization law). */
import { ensureData } from "../_lib/data.js";
import { getAuth } from "../_lib/auth.js";
import { dailySeed } from "../_lib/daily.js";
import DUEL from "../../duel-core.js";

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
    if (!env.DAILY_SECRET) return json({ ok: false, why: "no-secret" }, "DAILY_SECRET unset");
    const mode = String(body.mode || "classic");
    if (!DUEL.MODES_V1.includes(mode)) return json({ ok: false, why: "bad-mode", allowed: DUEL.MODES_V1 });

    const open = await env.DB.prepare(
      "SELECT COUNT(*) c FROM matches WHERE p1 = ? AND status IN ('open','active')"
    ).bind(auth.userId).first().catch(() => null);
    if (open && open.c >= 20) return json({ ok: false, why: "too-many-open" });

    await ensureData(env, request);
    const id = slug(10);
    const seed = await dailySeed(env.DAILY_SECRET, "duel|" + id);
    const M = DUEL.newMatch(mode, seed);
    if (!M || M.status !== "active") return json({ ok: false, why: "dead-board" });
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO matches (id, mode, seed, core_version, status, p1, p2, turn,
         actions, state, quips, winner, rematch_of, created_ts, updated_ts)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(id, mode, seed, M.S.coreVersion, "open", auth.userId, null, auth.userId,
      "[]", JSON.stringify(DUEL.summary(M)), "[]", null, null, now, now).run();
    return json({ ok: true, id, link: "https://true82.net/?duel=" + id, mode,
      summary: DUEL.summary(M) });
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}
