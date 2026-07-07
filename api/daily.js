/* TRUE 82 — GET /api/daily?mode= : today's official board.
   Seed minted AT READ TIME (HMAC over the UTC label, ACCOUNTS §2.2) — zero
   cron, never derivable client-side early. Fail-soft 200-always. */
import { dailyLabel, dailySeed, validDailyMode, secondsToUtcMidnight } from "../_lib/daily.js";

const json = (obj, err) => new Response(JSON.stringify(obj), {
  status: 200,
  headers: { "content-type": "application/json", ...(err ? { "x-t82-err": String(err).slice(0, 120) } : {}) },
});

export async function onRequestGet({ request, env }) {
  try {
    const mode = new URL(request.url).searchParams.get("mode") || "cap";
    if (!validDailyMode(mode)) return json({ ok: false, why: "bad-mode" });
    if (!env.DAILY_SECRET) return json({ ok: false, why: "no-secret" }, "DAILY_SECRET unset");
    const label = dailyLabel(mode);
    const seed = await dailySeed(env.DAILY_SECRET, label);
    return json({ ok: true, mode, label, seed, endsInS: secondsToUtcMidnight() });
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}
