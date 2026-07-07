/* TRUE 82 — functions/_lib/auth.js: Clerk session verification, networkless.
   ─────────────────────────────────────────────────────────────────────────────
   Verified against live Clerk docs 2026-07-06 ("Manual JWT verification"):
   session tokens are RS256 JWTs signed with the instance private key; verify
   with the PEM PUBLIC key from Dashboard → API keys → Show JWT public key →
   PEM Public Key, supplied here as the CLERK_JWT_KEY env var (set on
   Production AND Preview — the split-env trap). Token arrives via the
   `Authorization: Bearer` header (our client attaches it) or the `__session`
   cookie (same-origin fallback). Claims checked: exp / nbf (60 s skew) and
   azp against AUTHORIZED_PARTIES (comma list; check skipped if env unset).

   THE FAIL-SOFT LAW: every failure — missing header, bad signature, expired
   token, missing env, Clerk outage, D1 hiccup — resolves to ANONYMOUS, never
   an error. Auth can only ever add capability.

   getAuth(request, env)  -> { userId, clerkId, tag, name } | null
   verifySession(request, env) -> clerkId | null   (pure verify; no DB — this
                                                    half is covered in test.js)
   WebCrypto only (crypto.subtle) so the same file runs in Workers and in the
   node test harness. */

const SKEW_S = 60;

let keyPromise = null;
let keyPem = null;

function b64uToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function pemToSpki(pem) {
  const body = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  return b64uToBytes(body.replace(/\+/g, "-").replace(/\//g, "_"));
}

function importKey(pem) {
  if (keyPromise && keyPem === pem) return keyPromise;
  keyPem = pem;
  keyPromise = crypto.subtle.importKey(
    "spki", pemToSpki(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["verify"]
  );
  return keyPromise;
}

function readToken(request) {
  const h = request.headers.get("authorization") || request.headers.get("Authorization");
  if (h && /^Bearer\s+/i.test(h)) return h.replace(/^Bearer\s+/i, "").trim();
  const c = request.headers.get("cookie") || "";
  const m = /(?:^|;\s*)__session=([^;]+)/.exec(c);
  if (!m) return null;
  // CSRF GATE: cookies ride along on cross-site requests; Bearer headers don't.
  // A cookie-sourced token may only authenticate a MUTATION when the browser
  // vouches for same-origin (Sec-Fetch-Site) or the Origin host matches ours.
  // Anything else degrades to anonymous — the fail-soft law, weaponized.
  // (Our own client always sends Bearer; this gate never touches it.)
  if (request.method && request.method !== "GET" && request.method !== "HEAD") {
    const sfs = request.headers.get("sec-fetch-site");
    const okSfs = sfs === "same-origin" || sfs === "same-site" || sfs === "none";
    let okOrigin = false;
    try {
      const o = request.headers.get("origin");
      if (o) okOrigin = new URL(o).host === new URL(request.url).host;
    } catch (e) {}
    if (!okSfs && !okOrigin) return null;
  }
  return decodeURIComponent(m[1]);
}

/** Verify the session token. Returns the Clerk user id (`sub`) or null. */
export async function verifySession(request, env) {
  try {
    const pem = env && env.CLERK_JWT_KEY;
    if (!pem) return null;
    const token = readToken(request);
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const key = await importKey(pem);
    const data = new TextEncoder().encode(parts[0] + "." + parts[1]);
    const ok = await crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5" }, key, b64uToBytes(parts[2]), data
    );
    if (!ok) return null;

    const header = JSON.parse(new TextDecoder().decode(b64uToBytes(parts[0])));
    if (header.alg !== "RS256") return null;
    const p = JSON.parse(new TextDecoder().decode(b64uToBytes(parts[1])));
    const now = Math.floor(Date.now() / 1000);
    if (typeof p.exp === "number" && now > p.exp + SKEW_S) return null;
    if (typeof p.nbf === "number" && now < p.nbf - SKEW_S) return null;
    const parties = (env.AUTHORIZED_PARTIES || "").split(",").map(s => s.trim()).filter(Boolean);
    if (parties.length && p.azp && !parties.includes(p.azp)) return null;
    return p.sub || null;
  } catch {
    return null;
  }
}

const TAG_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789"; // no 0/O/1/I/L/U confusables

function makeTag(len) {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  let t = "";
  for (let i = 0; i < len; i++) t += TAG_ALPHABET[a[i] % TAG_ALPHABET.length];
  return t;
}

/** Find or create the users row for a Clerk id. Null on any DB trouble. */
export async function ensureUser(env, clerkId) {
  try {
    if (!env.DB || !clerkId) return null;
    const now = Date.now();
    let row = await env.DB.prepare(
      "SELECT id, tag, display_name FROM users WHERE clerk_id = ?"
    ).bind(clerkId).first();
    if (row) {
      env.DB.prepare("UPDATE users SET last_seen_ts = ? WHERE id = ?")
        .bind(now, row.id).run().catch(() => {});
      return { userId: row.id, clerkId, tag: row.tag, name: row.display_name };
    }
    for (let attempt = 0; attempt < 6; attempt++) {
      const tag = makeTag(attempt < 4 ? 4 : 5);   // widen after collisions
      try {
        const r = await env.DB.prepare(
          "INSERT INTO users (clerk_id, tag, display_name, created_ts, last_seen_ts) VALUES (?,?,?,?,?)"
        ).bind(clerkId, tag, "GM-" + tag, now, now).run();
        const id = r.meta && r.meta.last_row_id;
        if (id) return { userId: id, clerkId, tag, name: "GM-" + tag };
      } catch (e) {
        const msg = String((e && e.message) || e);
        if (/UNIQUE.*clerk_id/i.test(msg)) {   // raced ourselves — read it back
          row = await env.DB.prepare(
            "SELECT id, tag, display_name FROM users WHERE clerk_id = ?"
          ).bind(clerkId).first();
          if (row) return { userId: row.id, clerkId, tag: row.tag, name: row.display_name };
        }
        // UNIQUE on tag → loop and try a fresh one
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** The one-call middleware: token → user, or null (anonymous). */
export async function getAuth(request, env) {
  const clerkId = await verifySession(request, env);
  if (!clerkId) return null;
  return ensureUser(env, clerkId);
}
