/* TRUE 82 — POST /api/run: submit a finished game.
   ─────────────────────────────────────────────────────────────────────────────
   v69.1. THE SUBMISSION LAW: the client never reports its score. It sends what
   it DID — {mode, seed, actions} — and this endpoint replays it through the same
   sim-core.js the browser ran and stores ITS OWN recomputation. The client's
   `claim` is compared and then thrown away. A run whose replay disagrees is
   stored with the verdict and never reaches a board.

   Anonymous runs are accepted and stored (they keep the sid, so signing in later
   adopts them via /api/claim) but can never rank: every board query filters
   verified = 1 AND user_id IS NOT NULL.

   THE DAILY, ONCE: a UNIQUE index on (user_id, official) means the first
   official attempt of a day is the one that counts. A second is accepted,
   answered honestly, and dropped.

   If the engine cannot load (Workers Free's 10 ms CPU ceiling — see _lib/sim.js)
   the run stores UNVERIFIED rather than failing. The game never notices; the
   boards simply stay quiet rather than filling with unchecked numbers. */
import { accountAuth, json, db } from "../_lib/acct.js";
import { verify, dailyBoard } from "../_lib/sim.js";

const MODES = new Set(["classic", "pro", "cap"]);          // kaman never submits
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[0-9a-fA-F-]{8,64}$/;
const SID_RE = /^[A-Za-z0-9_-]{4,64}$/;
const MAX_ACTIONS = 200;
const MAX_OP = 64;
const MAX_BODY = 64 * 1024;

const int = (v, lo, hi) => {
  if (v === null || v === undefined || v === "" || !Number.isFinite(Number(v))) return null;
  return Math.max(lo, Math.min(hi, Math.trunc(Number(v))));
};

/* The current streak from the day this run claims, given what we already hold.
   Pure so test.js can pin it. A gap of more than one day restarts at 1; the same
   day again changes nothing. Dates are the Daily's own 'YYYY-MM-DD' keys. */
export function nextStreak(prev, dayKey) {
  const p = prev || { days: 0, streak: 0, best_streak: 0, last_key: null };
  if (p.last_key === dayKey) return p;
  const prevDay = new Date(Date.UTC(+dayKey.slice(0, 4), +dayKey.slice(5, 7) - 1, +dayKey.slice(8, 10)) - 86400000)
    .toISOString().slice(0, 10);
  const streak = p.last_key === prevDay ? (p.streak || 0) + 1 : 1;
  return {
    days: (p.days || 0) + 1,
    streak,
    best_streak: Math.max(p.best_streak || 0, streak),
    last_key: dayKey
  };
}

export async function onRequestPost(context) {
  const DB = db(context);          // the preview's own database when one is bound (acct.js)
  const { request, env } = context;
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY) return json({ ok: false, why: "too-large" });
  let b;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ ok: false, why: "too-large" });
    b = JSON.parse(raw);
  } catch { return json({ ok: false, why: "bad-json" }); }

  try {
    if (!b || typeof b !== "object") return json({ ok: false, why: "bad-body" });
    const id = typeof b.id === "string" && ID_RE.test(b.id) ? b.id : null;
    const mode = MODES.has(b.mode) ? b.mode : null;
    const seed = int(b.seed, 0, 0xFFFFFFFF);
    const sid = typeof b.sid === "string" && SID_RE.test(b.sid) ? b.sid : null;
    const official = typeof b.official === "string" && DAY_RE.test(b.official) ? b.official : null;
    if (!id || !mode || seed === null) return json({ ok: false, why: "bad-run" });

    let actions = Array.isArray(b.actions) ? b.actions : null;
    if (!actions || actions.length > MAX_ACTIONS) return json({ ok: false, why: "bad-actions" });
    actions = actions.map((x) => String(x).slice(0, MAX_OP));

    const auth = await accountAuth(context);
    const userId = auth ? auth.userId : null;

    // THE DAILY'S OWN BOARD, derived here. A run claiming to be today's Daily
    // must BE today's Daily: same mode, same seed, same challenge, all three
    // recomputed from the day key by the file the browser itself runs. Without
    // this check anyone could play an easy random board and post it to the
    // day's leaderboard. A mismatch doesn't fail the submission — it just
    // stops being official and stores as an ordinary run.
    let claimedDay = official, board = null;
    if (claimedDay) {
      board = await dailyBoard(env, claimedDay);
      if (!board || board.base !== mode || board.seed !== seed) claimedDay = null;
    }

    // THE REPLAY. Everything stored below comes from `res`, never from `b`.
    const payload = {
      mode, seed, actions,
      challenge: board ? board.ch || null : null,
      rngDraws: int(b.rngDraws, 0, 1000000),
      claim: { wins: int(b.claim && b.claim.wins, 0, 82), net: Number(b.claim && b.claim.net) }
    };
    if (!Number.isFinite(payload.claim.net)) delete payload.claim.net;
    const v = await verify(context, payload);
    const verified = v.ok ? 1 : 0;
    const r = v.ok ? v.result : null;

    if (!DB) return json({ ok: true, stored: false, verified });

    const row = {
      id, user_id: userId, sid, mode, seed,
      core_version: int(b.coreVersion, 0, 1000),
      data_version: int(b.dataVersion, -0x7FFFFFFF, 0x7FFFFFFF),
      // THE DAY KEY IS STAMPED EVEN WHEN NOBODY IS SIGNED IN (v69.2). It used to
      // be `userId && claimedDay`, which threw away the only record of which day
      // an anonymous Daily belonged to — so /api/claim had nothing to adopt and a
      // signed-out 79-3 could never become official, however soon they signed in.
      // Storing it is safe on every count: the UNIQUE index is
      // (user_id, official) WHERE user_id IS NOT NULL, so anonymous rows cannot
      // clash with each other or with anyone's; and every board filters
      // user_id IS NOT NULL, so an unadopted row still ranks nowhere.
      official: claimedDay,
      verified,
      verdict: v.ok ? null : String(v.why).slice(0, 40),
      wins: r ? r.wins : null,
      net: r && typeof r.net === "number" ? r.net : null,
      budget_used: r ? int(r.budgetUsed, 0, 1000000) : null,   // finish(): null outside Presti
      cap_left: r ? int(r.capLeft, -1000, 1000000) : null,
      hh_win: r && r.hh ? (r.hh.win ? 1 : 0) : null,
      actions: JSON.stringify(actions),
      rng_draws: r ? int(r.rngDraws, 0, 1000000) : null,
      picks: r && r.picks ? JSON.stringify(r.picks).slice(0, 4000) : null,
      created_ts: Date.now()
    };

    // A storage failure must never swallow the VERDICT. The old shape rethrew
    // anything that wasn't a UNIQUE clash, so the outer catch answered
    // {ok:false, why:"server"} and the verification result — the thing an
    // operator actually needs to see — was lost. That made it impossible to
    // tell "the engine could not load" from "the table is missing" from
    // outside, which is exactly the question you ask when a board stays empty.
    const fields = Object.keys(row);
    let dedup = false, alreadyToday = false, storeError = null;
    try {
      await DB.prepare(
        `INSERT INTO runs (${fields.join(",")}) VALUES (${fields.map(() => "?").join(",")})`
      ).bind(...fields.map((k) => row[k])).run();
    } catch (e) {
      const msg = String((e && e.message) || e);
      if (/UNIQUE/i.test(msg) && /official/i.test(msg)) alreadyToday = true;
      else if (/UNIQUE/i.test(msg)) dedup = true;
      else storeError = msg.slice(0, 60);
    }

    // No streak counter is kept here on purpose: /api/lb computes the streak
    // from the Daily rows themselves (gaps and islands), so there is nothing to
    // drift out of step with the runs it describes.
    const streak = null;

    return json({
      ok: true, stored: !dedup && !alreadyToday && !storeError, dedup, alreadyToday,
      storeError: storeError || undefined,
      verified, why: v.ok ? undefined : v.why,
      anonymous: !userId,
      officialRejected: !!(official && !claimedDay),
      wins: row.wins, net: row.net, streak
    });
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}
