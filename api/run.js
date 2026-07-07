/* TRUE 82 — POST /api/run: verify + persist a finished game.
   ─────────────────────────────────────────────────────────────────────────────
   THE INTEGRITY LAW (ACCOUNTS §2.3/§4/§5.5): official daily and weekly runs
   REPLAY-VERIFY or reject; casual runs record as-is (verified=0 if the replay
   fails or is skipped). On a verified run the SERVER result is authoritative —
   the claim is only a cross-check. Official daily: the server re-derives the
   seed from the label; a client seed that disagrees is rejected. Weekly: the
   challengeId must be this ISO week's active challenge (KV override first).
   Anonymous players can verify + store runs (casual only); posting an OFFICIAL
   run needs the account — that prompt writes itself.

   Body: { id, sid?, mode, seed, actions, rngDraws, dataVersion?,
           official?: "daily", label?,           — daily branch
           weekly?: true, challengeId?,          — weekly branch
           claim: { wins, net, hh? } }
   Reply: { ok, verified, dedup?, result?, official?:{label,rank,outOf,pct,already?},
            weekly?:{week,challengeId,best,rank,outOf}, note? }                   */
import { ensureData, T82 } from "../_lib/data.js";
import CH from "../../challenges.js";
import LG from "../../league-core.js";
import { getAuth } from "../_lib/auth.js";
import { dailyLabel, yesterdayLabel, dailySeed, validDailyMode } from "../_lib/daily.js";

const json = (obj, err) => new Response(JSON.stringify(obj), {
  status: 200,
  headers: { "content-type": "application/json", ...(err ? { "x-t82-err": String(err).slice(0, 120) } : {}) },
});
const SCORE = "(wins + net/1000.0)";   // wins DESC, net tiebreak — one composite everywhere

async function rankIn(env, whereSql, binds, myScore) {
  const rank = await env.DB.prepare(
    `SELECT COUNT(*) c FROM runs WHERE ${whereSql} AND ${SCORE} > ?`
  ).bind(...binds, myScore).first();
  const total = await env.DB.prepare(
    `SELECT COUNT(*) c FROM runs WHERE ${whereSql}`
  ).bind(...binds).first();
  const r = (rank ? rank.c : 0) + 1, n = Math.max(1, total ? total.c : 1);
  return { rank: r, outOf: n, pct: Math.max(1, Math.round((r / n) * 100)) };
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, why: "bad-json" }, "bad-json"); }
  try {
    // ---- shape ----
    const id = String(body.id || "");
    if (!/^[0-9a-fA-F-]{8,64}$/.test(id)) return json({ ok: false, why: "bad-id" });
    const mode = String(body.mode || "");
    if (!["classic", "pro", "cap", "kaman"].includes(mode)) return json({ ok: false, why: "bad-mode" });
    const actions = Array.isArray(body.actions) ? body.actions.map(String) : [];
    if (actions.length > 200) return json({ ok: false, why: "too-many-actions" });
    if (actions.some(op => op.length > 64)) return json({ ok: false, why: "bad-op" });
    if (typeof body.rngDraws === "number" && (body.rngDraws < 0 || body.rngDraws > 100000))
      return json({ ok: false, why: "rng-insane" });
    const sid = (typeof body.sid === "string" && /^[A-Za-z0-9_-]{4,64}$/.test(body.sid)) ? body.sid : null;

    const auth = await getAuth(request, env);   // null = anonymous (fail-soft law)
    const now = Date.now();

    // ---- dedup fast-path (client retries are free) ----
    if (env.DB) {
      const dup = await env.DB.prepare("SELECT id, verified, wins, net, official, week FROM runs WHERE id = ?")
        .bind(id).first().catch(() => null);
      if (dup) return json({ ok: true, dedup: true, verified: !!dup.verified,
        result: { wins: dup.wins, net: dup.net } });
    }

    // ---- branch: official daily / weekly / casual ----
    let seed = (typeof body.seed === "number") ? (body.seed >>> 0) : null;
    let official = null, weekly = null, challenge = null, challengeId = null, note = null;

    if (body.official === "daily") {
      const label = String(body.label || "");
      if (!validDailyMode(mode)) return json({ ok: false, why: "bad-mode" });
      const okLabels = [dailyLabel(mode), yesterdayLabel(mode)];   // 26h grace
      if (!okLabels.includes(label)) return json({ ok: false, why: "daily-expired" });
      if (!env.DAILY_SECRET) return json({ ok: false, why: "no-secret" }, "DAILY_SECRET unset");
      const sSeed = await dailySeed(env.DAILY_SECRET, label);
      if (seed !== null && seed !== sSeed) return json({ ok: false, why: "seed-mismatch" });
      seed = sSeed;
      if (auth) official = label;
      else note = "sign-in-to-count";           // plays fine, stored casual
    } else if (body.official === "league") {
      const lgId = String(body.leagueId || "");
      if (!env.DB) return json({ ok: false, why: "no-db" });
      const lg = await env.DB.prepare("SELECT * FROM leagues WHERE id = ?").bind(lgId).first();
      if (!lg || lg.status !== "active") return json({ ok: false, why: lg ? "not-live" : "no-league" });
      const w = (lg.settled_through || 0) + 1;
      const opened = lg.week_opened_ts != null ? lg.week_opened_ts : lg.start_ts;
      if (opened == null || Date.now() < opened) return json({ ok: false, why: "pre-season" });
      if (w > lg.season_weeks) return json({ ok: false, why: "season-over" });
      const pool = CH.CHALLENGES.filter(LG.poolFilter(lg.format));
      challenge = pool[LG.challengeIndex(lgId, w, pool.length)];
      challengeId = challenge.id;
      if (mode !== challenge.base) return json({ ok: false, why: "wrong-mode", want: challenge.base });
      if (!env.DAILY_SECRET) return json({ ok: false, why: "no-secret" });
      const sSeed = await dailySeed(env.DAILY_SECRET, "league|" + lgId + "|" + w);
      if (seed !== null && seed !== sSeed) return json({ ok: false, why: "seed-mismatch" });
      seed = sSeed;
      const mem = auth ? await env.DB.prepare(
        "SELECT seat FROM league_members WHERE league_id = ? AND user_id = ?"
      ).bind(lgId, auth.userId).first() : null;
      if (!auth) note = "sign-in-to-count";
      else if (!mem || mem.seat === null) return json({ ok: false, why: "not-a-member" });
      else official = "lg|" + lgId + "|" + w;
    } else if (body.weekly === true) {
      const wk = CH.weekKey();
      let active = null;
      try { active = env.GAMES ? await env.GAMES.get("weekly:override:" + wk) : null; } catch {}
      if (!active) active = CH.weeklyFor().ch.id;
      challengeId = String(body.challengeId || "");
      if (challengeId !== active) return json({ ok: false, why: "wrong-week", active });
      challenge = CH.byId[challengeId];
      if (!challenge) return json({ ok: false, why: "unknown-challenge" });
      if (mode !== challenge.base) return json({ ok: false, why: "wrong-mode", want: challenge.base });
      if (seed === null) return json({ ok: false, why: "bad-seed" });
      if (auth) weekly = wk;
      else note = "sign-in-to-count";
    } else {
      if (seed === null) return json({ ok: false, why: "bad-seed" });
      if (body.challengeId) {                    // casual practice on a challenge — verify with its hooks
        challenge = CH.byId[String(body.challengeId)] || null;
        challengeId = challenge ? challenge.id : null;
      }
    }

    // ---- verify (server result is authoritative when it succeeds) ----
    await ensureData(env, request);
    if (body.dataVersion && body.dataVersion !== T82.t.dataVersion)
      return json({ ok: false, why: "data-version", server: T82.t.dataVersion });

    const claim = body.claim || {};
    const v = T82.verifyRun({ mode, seed, actions, rngDraws: body.rngDraws, challenge, claim });
    const mustVerify = !!(official || weekly);
    if (mustVerify && !v.ok) return json({ ok: false, why: "replay:" + (v.why || "mismatch") });

    const verified = v.ok ? 1 : 0;
    const res = v.ok ? v.result : null;
    const wins = v.ok ? res.wins : (typeof claim.wins === "number" ? claim.wins : null);
    const net  = v.ok ? res.net  : (typeof claim.net  === "number" ? claim.net  : null);
    const rerolls = (mode === "cap") ? actions.filter(a => a === "st" || a === "se" || a === "yr").length : 0;
    const skips   = (mode !== "cap") ? actions.filter(a => a === "st" || a === "se").length : 0;

    // ---- persist (fail-soft: a dead DB still returns the verified result) ----
    let stored = false;
    const storable = auth || sid;   // anonymous spam without even a session id never touches D1
    if (env.DB && storable) {
      try {
        await env.DB.prepare(
          `INSERT INTO runs (id, user_id, sid, mode, seed, core_version, data_version,
             challenge_id, week, official, verified, wins, net, hh_seg, hh_win,
             budget_used, cap_left, rerolls, skips, actions, rng_draws, picks, created_ts)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
        ).bind(
          id, auth ? auth.userId : null, sid, mode, seed,
          T82.VERSION, T82.t.dataVersion,
          challengeId, weekly, official, verified, wins, net,
          res && res.hh ? res.hh.segIdx : null, res && res.hh ? res.hh.win : null,
          res ? res.budgetUsed : null, res ? res.capLeft : null, rerolls, skips,
          JSON.stringify(actions), (typeof body.rngDraws === "number" ? body.rngDraws : (res ? res.rngDraws : null)),
          res ? JSON.stringify(res.picks) : null, now
        ).run();
        stored = true;
      } catch (e) {
        const msg = String((e && e.message) || e);
        if (official && /idx_runs_official|UNIQUE/i.test(msg)) {
          // already played today's official — return the EXISTING run's standing
          const ex = await env.DB.prepare(
            "SELECT wins, net FROM runs WHERE user_id = ? AND official = ?"
          ).bind(auth.userId, official).first().catch(() => null);
          if (ex) {
            const where = "official = ? AND verified = 1 AND user_id IS NOT NULL";
            const std = await rankIn(env, where, [official], ex.wins + ex.net / 1000.0);
            return json({ ok: true, verified: true, official: { label: official, already: true, ...std },
              result: { wins: ex.wins, net: ex.net } });
          }
          return json({ ok: true, verified: !!verified, official: { label: official, already: true } });
        }
        // any other DB failure: swallow — the player still gets their result
      }
    }

    // ---- standings ----
    const out = { ok: true, verified: !!verified, stored, note: note || undefined,
      result: res ? { wins: res.wins, losses: res.losses, net: res.net, p82: res.p82,
        hh: res.hh, picks: res.picks, capLeft: res.capLeft, budgetUsed: res.budgetUsed } : null };
    if (official && stored && env.DB) {
      const where = "official = ? AND verified = 1 AND user_id IS NOT NULL";
      out.official = { label: official, ...(await rankIn(env, where, [official], wins + net / 1000.0)) };
    }
    if (official && official.slice(0, 3) === "lg|" && stored) {
      const lp = official.split("|");
      out.league = { id: lp[1], week: parseInt(lp[2], 10), label: official };
    }
    if (weekly && stored && env.DB) {
      const bestRow = await env.DB.prepare(
        `SELECT MAX(${SCORE}) s, MAX(wins) w FROM runs WHERE user_id = ? AND week = ? AND challenge_id = ? AND verified = 1`
      ).bind(auth.userId, weekly, challengeId).first().catch(() => null);
      const myBest = bestRow ? bestRow.s : (wins + net / 1000.0);
      const rk = await env.DB.prepare(
        `WITH b AS (SELECT user_id, MAX(${SCORE}) s FROM runs
           WHERE week = ? AND challenge_id = ? AND verified = 1 AND user_id IS NOT NULL GROUP BY user_id)
         SELECT (SELECT COUNT(*) FROM b WHERE s > ?) + 1 AS rank, (SELECT COUNT(*) FROM b) AS outOf`
      ).bind(weekly, challengeId, myBest).first().catch(() => null);
      out.weekly = { week: weekly, challengeId, best: bestRow ? bestRow.w : wins,
        rank: rk ? rk.rank : null, outOf: rk ? rk.outOf : null };
    }
    return json(out);
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}
