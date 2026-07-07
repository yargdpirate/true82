/* TRUE 82 — functions/_lib/daily.js: daily labels + HMAC seed minting, and the
   display-name filter. Pure functions, WebCrypto only — the exact code here is
   exercised by test.js §13 in node.
   ─────────────────────────────────────────────────────────────────────────────
   THE DAILY LAW (ACCOUNTS §2.2): seed = first 4 bytes of
   HMAC-SHA256(DAILY_SECRET, label) as uint32, computed AT READ TIME in
   GET /api/daily — never derivable client-side before the day exists, zero
   cron. Rotating DAILY_SECRET reseeds future days only. Labels are UTC:
   'YYYY-MM-DD|mode'. /api/run accepts today's label OR yesterday's (a run
   started at 23:59 UTC may land at 00:01 — 26-hour grace via label set;
   official uniqueness is per-label so nobody double-dips). */

const DAILY_MODES = ["classic", "pro", "cap"];   // kaman never has a daily (gag mode)

export function utcDay(now) {
  const d = now ? new Date(now) : new Date();
  return d.toISOString().slice(0, 10);
}

export function dailyLabel(mode, now) {
  return utcDay(now) + "|" + mode;
}

export function yesterdayLabel(mode, now) {
  const d = now ? new Date(now) : new Date();
  return utcDay(d.getTime() - 86400000) + "|" + mode;
}

export function validDailyMode(mode) {
  return DAILY_MODES.includes(mode);
}

export function secondsToUtcMidnight(now) {
  const d = now ? new Date(now) : new Date();
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  return Math.max(0, Math.floor((next - d.getTime()) / 1000));
}

/** HMAC-SHA256(secret, label) → first 4 bytes as uint32. */
export async function dailySeed(secret, label) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(label)));
  return (((sig[0] << 24) | (sig[1] << 16) | (sig[2] << 8) | sig[3]) >>> 0);
}

/* ---------- display names ----------
   Intentionally light: charset clamp + a small leet-normalized denylist. The
   tag is the real identity; the name is decoration. Fallback: 'GM-<tag>'. */

const DENY = ["fuck", "shit", "cunt", "nigg", "fagg", "rape", "hitler", "nazi",
  "bitch", "whore", "penis", "vagin", "porn", "sex"];

export function cleanName(raw, tag) {
  const fallback = "GM-" + (tag || "0000");
  if (typeof raw !== "string") return fallback;
  let s = raw.replace(/\s+/g, " ").trim();
  if (!/^[A-Za-z0-9 _.\-']{3,20}$/.test(s)) return fallback;
  const norm = s.toLowerCase()
    .replace(/[4@]/g, "a").replace(/[3]/g, "e").replace(/[1!|]/g, "i")
    .replace(/[0]/g, "o").replace(/[5$]/g, "s").replace(/[7]/g, "t")
    .replace(/[^a-z]/g, "");
  for (const bad of DENY) if (norm.includes(bad)) return fallback;
  return s;
}
