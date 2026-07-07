/* TRUE 82 — POST /api/verify: stateless replay verification.
   ─────────────────────────────────────────────────────────────────────────────
   Phase A ships this as the smoke-testable seam; Phase B's POST /api/run imports
   the same pieces and adds D1 persistence. THE FAIL-SOFT LAW: this endpoint
   returns HTTP 200 with { ok:false, why } for EVERY failure mode — bad JSON,
   missing data, server faults — and puts the real error in an x-t82-err header.
   The game must play on no matter what this endpoint does.

   Request body:
     { mode, seed, actions:[ops], rngDraws?, dataVersion?, challengeId?,
       claim?: { wins, net, hh? } }
   Response: { ok:true, result } | { ok:false, why, ... }

   Pre-checks run BEFORE the replay burns CPU: action-count cap, rng-draw sanity,
   dataset-version match (update-day rule: the API layer keeps the prior day's
   dataset alive for 24h for verification, then gracefully rejects with
   why:"data-version" — client copy: "this run predates today's data update"). */
import { ensureData, T82 } from "../_lib/data.js";
import CH from "../../challenges.js";

const json = (obj, err) =>
  new Response(JSON.stringify(obj), {
    status: 200,
    headers: { "content-type": "application/json", ...(err ? { "x-t82-err": String(err).slice(0, 120) } : {}) },
  });

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, why: "bad-json" }, "bad-json");
  }
  try {
    await ensureData(env, request);

    const acts = Array.isArray(body.actions) ? body.actions : [];
    if (acts.length > 200) return json({ ok: false, why: "too-many-actions" });
    if (typeof body.rngDraws === "number" && (body.rngDraws < 0 || body.rngDraws > 100000))
      return json({ ok: false, why: "rng-insane" });
    if (body.dataVersion && body.dataVersion !== T82.t.dataVersion)
      return json({ ok: false, why: "data-version", server: T82.t.dataVersion });

    let ch = null;
    if (body.challengeId) {
      ch = CH.byId[body.challengeId] || null;
      if (!ch) return json({ ok: false, why: "unknown-challenge" });
    }

    const out = T82.verifyRun({
      mode: body.mode, seed: body.seed, actions: acts,
      rngDraws: body.rngDraws, challenge: ch, claim: body.claim || {},
    });
    return json(out);
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}
