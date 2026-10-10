/* TRUE 82 — WHERE A DAILY'S SEED COMES FROM (v69.4)
   ─────────────────────────────────────────────────────────────────────────────
   Until now a Daily's seed was `hash32(SEED_NS + key)` computed by daily-core.js
   IN THE BROWSER, so every future board was derivable by anyone who read the
   shipped file, and the three launch-week boards were worse than derivable: they
   were published as literals in `SEED_OVERRIDES`. A determined player could
   pre-solve the boards the influencer films.

   This file is the server's answer. A day's seed is, in order:

     1. A PIN from the `DAILY_PINS` environment variable, for a board whose roll
        was chosen deliberately (the launch week's crowd-tuned nights).
     2. `HMAC-SHA256(DAILY_SECRET, "t82seed|" + key)`, truncated to a uint32, for
        every ordinary day from MINT_FROM onward.
     3. Nothing — the caller falls back to daily-core's own `seedFor(key)`.

   WHY THE PINS ARE AN ENVIRONMENT VARIABLE AND NOT CONSTANTS IN THIS FILE: this
   repo is PUBLIC (github.com/yargdpirate/true82). Moving a literal out of
   daily-core.js and into functions/ hides it from the browser and from nobody
   else. A pin that matters cannot live in the repo in any file.

   FAIL-SOFT, AND THE FALLBACK IS DELIBERATELY THE OLD BEHAVIOUR. With no
   DAILY_PINS and no DAILY_SECRET this module returns null for every day and the
   game behaves EXACTLY as it shipped, down to the same seeds: daily-core.js
   keeps `SEED_OVERRIDES` and `seedFor`. So the worst case of a forgotten
   environment variable is "the launch boards are the v66.4 boards he approved,
   publicly known" — today's situation — and never "the launch boards are random
   numbers nobody tuned". That choice is the whole reason SEED_OVERRIDES was left
   in the shipped file rather than deleted.

   MINT_FROM EXISTS SO THE ARCHIVE CANNOT MOVE. Every day before it keeps the
   legacy seed forever, so THE DAILY ARCHIVE, every stored official run and every
   shared beat-link replay the board that was actually played. Never move this
   date backwards past a day that has been played. */

/* The first day this lane mints for. Days before it are daily-core's own.
   Chosen as the day after this change can possibly reach production, so no
   already-played board can shift under a player. */
export const MINT_FROM = "2026-10-11";

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** `DAILY_PINS` as a map. Format: `2026-10-20:123,2026-10-21:456` — a day key,
    a colon, a uint32, comma separated. Garbage in any one entry drops that
    entry and keeps the rest; a pin is never allowed to throw. */
export function pins(env) {
  const out = {};
  try {
    const raw = String((env && env.DAILY_PINS) || "");
    for (const part of raw.split(",")) {
      const bits = part.trim().split(":");
      if (bits.length !== 2) continue;
      const key = bits[0].trim();
      const n = Number(bits[1].trim());
      if (!KEY_RE.test(key)) continue;
      if (!Number.isInteger(n) || n < 0 || n > 0xFFFFFFFF) continue;
      out[key] = n >>> 0;
    }
  } catch { /* a malformed variable is a missing variable */ }
  return out;
}

/* Module scope on purpose — importKey on every call IS the cost this avoids, and
   a Worker isolate serving a hundred requests should pay it once.

   KEYED ON THE SECRET, which is not a detail. Caching the handle alone means the
   first secret an isolate ever sees answers for every secret after it, so a
   rotated DAILY_SECRET would keep minting the OLD boards until every isolate
   recycled — minted boards drifting from the configured secret, with nothing on
   fire and nothing in a log. test.js pins this by minting with two secrets. */
let hmac = { secret: null, key: null };

async function mac(secret, msg) {
  if (hmac.secret !== secret) {
    hmac = {
      secret,
      key: await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    };
  }
  return new Uint8Array(await crypto.subtle.sign("HMAC", hmac.key, new TextEncoder().encode(msg)));
}

/** The seed this day's board must use, or null to let daily-core decide.
    Never throws: a crypto failure degrades to the legacy seed, which is a
    playable board, rather than to no Daily at all. */
export async function mintSeed(env, key) {
  if (!KEY_RE.test(String(key))) return null;
  const pinned = pins(env);
  if (pinned[key] !== undefined) return pinned[key];
  if (key < MINT_FROM) return null;            // ISO keys compare as strings
  const secret = env && env.DAILY_SECRET;
  if (!secret) return null;
  try {
    const d = await mac(String(secret), "t82seed|" + key);
    // the first four bytes, big-endian, as a uint32 — the same shape hash32 gives
    return (((d[0] << 24) | (d[1] << 16) | (d[2] << 8) | d[3]) >>> 0);
  } catch { return null; }
}

/** What this environment can do, for /api/day to report and for a human to read.
    Never includes a seed or any part of the secret. */
export function mintState(env) {
  const p = pins(env);
  return {
    mintFrom: MINT_FROM,
    minting: !!(env && env.DAILY_SECRET),
    pinned: Object.keys(p).length
  };
}
