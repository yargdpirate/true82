/* TRUE 82 — POST /api/claim: adopt this device's anonymous history.
   ─────────────────────────────────────────────────────────────────────────────
   v69 rewrite. origin/accounts-test's version stitched `runs` rows; there is no
   runs table on this lane and no server-side game history at all. What DOES
   exist, and is otherwise lost the moment someone clears Safari, is the local
   Daily record: daily-core.js keeps up to 400 days of official results under
   localStorage `t82_daily1`. This endpoint takes custody of it.

   WHAT IS LINKED, AND WHAT DELIBERATELY IS NOT. The only device key accepted
   here is `t82:sid`, a namespace minted by accounts.js for exactly this. It is
   NOT the retention cookie (`t82_rid`) and NOT the traits voter hash. Joining
   either would retroactively turn the pseudonymous analytics stream into an
   identified one, against the owner's v43 privacy decision. If a future board
   wants verified history it replays runs server-side (ACCOUNTS.md §1); it does
   not reach into the analytics tables.

   ONE ROW, NOT FOUR HUNDRED. The whole history is stored as a single JSON blob
   per user. D1's free plan allows 100,000 rows written a day and, since
   2026-09-01, Cloudflare FAILS queries past it — 250 sign-ups at a row per day
   each would spend the entire account's daily budget and take the Tribune and
   analytics down with them. `days` and `streak` are denormalized beside the
   blob so /api/me never parses it.

   EVERYTHING HERE IS CLIENT-REPORTED, so the row is stored verified=0 and can
   never feed a verified board (ACCOUNTS.md §1: casual runs record
   client-reported). Re-claiming is idempotent and MERGES rather than replaces,
   because one account may stitch several devices: a day already held is only
   overwritten by a better result, and the streak keeps the higher count. */
import { accountAuth, json, db } from "../_lib/acct.js";

const SID_RE = /^[A-Za-z0-9_-]{4,64}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;          // daily-core.js validKey(); sorts chronologically
const MAX_DAYS = 400;                          // daily-core.js KEEP_DAYS
const MAX_PAYLOAD = 64 * 1024;
const MAX_BODY = 256 * 1024;

const int = (v, lo, hi) => {
  if (v === null || v === undefined || v === "" || !Number.isFinite(Number(v))) return null;
  return Math.max(lo, Math.min(hi, Math.trunc(Number(v))));
};
const num = (v, lo, hi, dp) => {
  if (v === null || v === undefined || v === "" || !Number.isFinite(Number(v))) return null;
  const p = Math.pow(10, dp);
  return Math.round(Math.max(lo, Math.min(hi, Number(v))) * p) / p;
};
const str = (v, max) => {
  if (typeof v !== "string") return null;
  const s = v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return s ? s.slice(0, max) : null;
};

/* Rebuild the t82_daily1 shape from scratch, field by field — nothing the
   client sends is copied through. Unknown keys (including `archive`, the
   practice replays, and `nonce`) are dropped on the floor. */
export function cleanDaily(d) {
  if (!d || typeof d !== "object" || Array.isArray(d)) return { official: {}, streak: { count: 0, lastKey: "" } };
  const src = (d.official && typeof d.official === "object" && !Array.isArray(d.official)) ? d.official : {};
  const official = {};
  const keys = Object.keys(src).filter((k) => DAY_RE.test(k)).sort().slice(-MAX_DAYS);
  for (const k of keys) {
    const e = src[k];
    if (!e || typeof e !== "object" || Array.isArray(e)) continue;
    const row = {};
    const n = int(e.num, 0, 1000000); if (n !== null) row.num = n;
    const w = int(e.wins, 0, 82); if (w !== null) row.wins = w;
    const net = num(e.net, -9999, 9999, 2); if (net !== null) row.net = net;
    const ch = str(e.chId, 32); if (ch) row.chId = ch;
    const hot = int(e.hot, 0, 16); if (hot !== null) row.hot = hot;
    const cap = int(e.cap, 0, 1000000); if (cap !== null) row.cap = cap;
    const pct = num(e.pct, 0, 100, 1); if (pct !== null) row.pct = pct;
    if (Array.isArray(e.five)) {
      const five = e.five.map((x) => str(x, 48)).filter(Boolean).slice(0, 5);
      if (five.length) row.five = five;
    }
    if (Object.keys(row).length) official[k] = row;
  }
  const st = (d.streak && typeof d.streak === "object" && !Array.isArray(d.streak)) ? d.streak : {};
  return { official, streak: { count: int(st.count, 0, 1000000) || 0, lastKey: (DAY_RE.test(String(st.lastKey)) ? String(st.lastKey) : "") } };
}

/* Merge append-only: a day already claimed only moves on a better result. */
export function mergeDaily(prev, next) {
  const official = Object.assign({}, (prev && prev.official) || {});
  for (const k of Object.keys(next.official)) {
    const was = official[k], now = next.official[k];
    if (!was || (now.wins || 0) > (was.wins || 0)) official[k] = now;
  }
  let keys = Object.keys(official).sort();
  if (keys.length > MAX_DAYS) keys = keys.slice(-MAX_DAYS);
  let out = { official: pick(official, keys), streak: bestStreak(prev && prev.streak, next.streak) };
  while (keys.length > 1 && JSON.stringify(out).length > MAX_PAYLOAD) {
    keys = keys.slice(Math.max(1, Math.ceil(keys.length * 0.1)));   // shed the oldest tenth and re-measure
    out = { official: pick(official, keys), streak: out.streak };
  }
  return out;
}
function pick(obj, keys) { const o = {}; for (const k of keys) o[k] = obj[k]; return o; }
function bestStreak(a, b) {
  const ac = (a && a.count) || 0, bc = (b && b.count) || 0;
  return bc >= ac ? (b || { count: 0, lastKey: "" }) : a;
}

/* ---------- ADOPTION: the runs this device already played, signed out ----------
   THE OWNER'S CALL (2026-10-04). He plays the Daily signed out, goes 79-3, then
   signs in: that 79-3 counts. Without this the best moment the game will ever
   have to earn an account ("you just did that, here is where it ranks") can only
   ever answer "too late, come back tomorrow", which is precisely the player we
   are trying to keep.

   WHY IT IS NOT FARMABLE, which was his worry and the reason the strict version
   existed first. Three rules, all enforced below:

   1. ONE ACCOUNT PER DEVICE, EVER. Only the FIRST account to link a sid adopts
      anything. A second sign-in on the same browser adopts nothing, so a shared
      phone cannot hand player A's seasons to player B, and nobody can launder
      runs between accounts by signing in and out.
   2. THE DAILY: THE EARLIEST ATTEMPT, NEVER THE BEST. For each day this device
      played, exactly one row is adopted, the one stored first. Playing the Daily
      five times signed out and then signing in gets you your FIRST attempt, which
      is exactly what a signed-in player's one attempt a day gets. (app.js only
      sends `official` on the first finished run of a day anyway; this is the
      second line of defence, in SQL, against a client that lies about which.)
   3. NOTHING UNVERIFIED, AND NEVER OVER A DAY ALREADY HELD. Only runs the server
      itself replayed and verified are adopted, and a day the account already has
      a row for is left alone, so the UNIQUE (user_id, official) index can never
      be violated and an adopted run can never displace one played signed in.

   Ordinary seasons (Classic, Presti, Pro) are adopted without the one-per-day
   dance: they are unlimited for a signed-in player too, so adopting them adds a
   player's own history and takes nothing from anyone. The 82-0 RATE board is
   safe because adoption is all-or-nothing: you cannot keep your good runs and
   discard the rest.

   Fail-soft like everything on this lane: any trouble returns null and the
   sign-in still succeeds. */
const ADOPT_MAX = 400;              // one sign-in may not spend the day's write budget

/* Takes the RESOLVED database rather than env, because which database an
   account-lane write belongs in is decided once in acct.js db() and must not
   be decided again here. test.js calls this directly with a D1 shim. */
export async function adoptRuns(DB, userId, sid) {
  try {
    if (!DB || !userId || !sid) return null;

    // Rule 1: are we the first account on this device?
    const links = await DB.prepare("SELECT COUNT(*) n FROM sid_links WHERE sid = ?")
      .bind(sid).first().catch(() => null);
    if (!links || links.n !== 1) return { first: false, seasons: 0, dailies: 0 };

    // The ordinary seasons: every verified anonymous run this device played.
    const seasons = await DB.prepare(
      `UPDATE runs SET user_id = ?
        WHERE id IN (SELECT id FROM runs
                      WHERE sid = ? AND user_id IS NULL AND verified = 1 AND official IS NULL
                      ORDER BY created_ts ASC LIMIT ${ADOPT_MAX})`
    ).bind(userId, sid).run().catch(() => null);

    // The Dailies: the earliest attempt per day, and only days we do not hold.
    // Read the candidates first and update by id. The clever single-statement
    // version is unreadable, and this lane's standing lesson is that a query you
    // can check by eye beats one you have to trust.
    const cand = await DB.prepare(
      `SELECT official, MIN(created_ts) first_ts FROM runs
        WHERE sid = ? AND user_id IS NULL AND verified = 1 AND official IS NOT NULL
          AND official NOT IN (SELECT official FROM runs WHERE user_id = ? AND official IS NOT NULL)
        GROUP BY official
        ORDER BY official DESC LIMIT ${ADOPT_MAX}`
    ).bind(sid, userId).all().catch(() => null);

    let dailies = 0;
    const rows = (cand && cand.results) || [];
    for (const r of rows) {
      const one = await DB.prepare(
        `SELECT id FROM runs
          WHERE sid = ? AND user_id IS NULL AND verified = 1 AND official = ? AND created_ts = ?
          ORDER BY id ASC LIMIT 1`
      ).bind(sid, r.official, r.first_ts).first().catch(() => null);
      if (!one) continue;
      const done = await DB.prepare("UPDATE runs SET user_id = ? WHERE id = ? AND user_id IS NULL")
        .bind(userId, one.id).run().catch(() => null);
      if (done && done.meta && done.meta.changes) dailies++;
    }

    return {
      first: true,
      seasons: (seasons && seasons.meta && seasons.meta.changes) || 0,
      dailies
    };
  } catch {
    return null;
  }
}

export async function onRequestPost(context) {
  const DB = db(context);          // the preview's own database when one is bound (acct.js)
  const { request, env } = context;
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY) return json({ ok: false, why: "too-large" });
  let body;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ ok: false, why: "too-large" });
    body = JSON.parse(raw);
  } catch { return json({ ok: false, why: "bad-json" }); }

  try {
    const auth = await accountAuth(context);
    if (!auth) return json({ ok: false, why: "auth" });

    const sid = (typeof body.sid === "string" && SID_RE.test(body.sid)) ? body.sid : null;
    const incoming = cleanDaily(body.daily);
    const askedDays = Object.keys(incoming.official).length;

    if (!DB) return json({ ok: true, stored: false, linkedSid: false, days: 0, streak: 0 });

    let adopted = null;
    if (sid) {
      await DB.prepare("INSERT OR IGNORE INTO sid_links (sid, user_id, linked_ts) VALUES (?,?,?)")
        .bind(sid, auth.userId, Date.now()).run().catch(() => {});
      adopted = await adoptRuns(DB, auth.userId, sid);
    }

    let prev = null;
    if (askedDays || incoming.streak.count) {
      const row = await DB.prepare("SELECT payload FROM local_claims WHERE user_id = ? AND kind = 'daily1'")
        .bind(auth.userId).first().catch(() => null);
      if (row && row.payload) { try { prev = JSON.parse(row.payload); } catch { prev = null; } }

      const merged = mergeDaily(prev, incoming);
      const days = Object.keys(merged.official).length;
      await DB.prepare(
        `INSERT INTO local_claims (user_id, kind, payload, verified, days, streak, ts) VALUES (?,?,?,0,?,?,?)
           ON CONFLICT(user_id, kind) DO UPDATE SET
             payload = excluded.payload, days = excluded.days,
             streak = excluded.streak, ts = excluded.ts`
      ).bind(auth.userId, "daily1", JSON.stringify(merged), days, merged.streak.count, Date.now()).run();
      return json({ ok: true, linkedSid: !!sid, days, streak: merged.streak.count, adopted,
        added: days - Object.keys((prev && prev.official) || {}).length });
    }

    return json({ ok: true, linkedSid: !!sid, days: 0, streak: 0, added: 0, adopted });
  } catch (e) {
    return json({ ok: false, why: "server" }, (e && e.message) || e);
  }
}
