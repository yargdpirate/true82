/* TRUE 82 — functions/_lib/names.js: display-name filtering.
   ─────────────────────────────────────────────────────────────────────────────
   v69: lifted verbatim out of origin/accounts-test's functions/_lib/daily.js so
   the account lane doesn't drag the whole daily/HMAC-seed module in for one
   function. If that module ever lands here too, it imports THIS file — one
   wordlist, not two.

   Intentionally light: charset clamp + a small leet-normalized denylist. The
   TAG is the real identity (server-assigned, unguessable, unique); the name is
   decoration, so the fallback IS the answer and this never returns an error.
   Moderation-surface law (ACCOUNTS.md §0): display names and group names are
   the ONLY user-authored public strings in the whole product, which is exactly
   why this stays small enough to audit at a glance. */

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
