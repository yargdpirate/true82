# TRUE 82 — SECURITY.md (2026-07-06 hardening pass)

The one-paragraph posture: **the database cannot leak what it never held.**
D1 stores no emails, no passwords, no payment data, no IPs, no user agents —
identity lives entirely at Clerk. A full D1 dump exposes pseudonymous game
scores, self-chosen display names (charset-filtered), 4-char GM tags, and
Clerk's opaque user ids. That is the worst-case blast radius by design.

## 1. Threat model & what's enforced where
| Threat | Defense | Where |
|---|---|---|
| Forged sessions | Networkless RS256 verify, exp/nbf (60s skew), azp vs AUTHORIZED_PARTIES; every failure → anonymous | `_lib/auth.js` |
| CSRF (cookie riding) | Cookie-sourced tokens on non-GET require `Sec-Fetch-Site` same-origin/site OR matching `Origin` host, else anonymous. Bearer (our client) unaffected. Frozen in test §13 | `_lib/auth.js` readToken |
| Score/replay forgery | Server rebuilds every run/move from ops (`verifyRun`, duel `replayMatch`); claims and rngDraws compared; officials require verification | run.js, match endpoints, sim-core |
| SQL injection | Every query `.prepare().bind()`; lb.js SQL fragments come from a server-constant registry, never input (`scope=group` in the doc comment is **unimplemented** — do not add it by interpolation) | all endpoints |
| Stored XSS via names | `cleanName`: 3–20 chars, strict charset, leet-normalized denylist; every UI render goes through `esc()` | `_lib/daily.js`, all *-ui.js |
| Payload DoS | actions ≤ 200, each op ≤ 64 chars, rngDraws ≤ 100k, claim runIds ≤ 200 (charset-checked), duel op ≤ 64, event.js clamps all numerics | run.js, claim.js, match action, event.js |
| Insert spam | Anonymous runs require a sid to touch D1; ≤ 20 open matches per creator; ≤ 10 forming leagues per commissioner; one official per (user, label) via UNIQUE index | run.js, match.js, league.js |
| IDOR | Duels participants-only (open = link-holders, unguessable 10-char/30-alphabet ids); leagues members-only once active; me/notebook/hof self-scoped | match/league/me endpoints |
| Races | Optimistic locks (updated_ts / status CAS) + insert-once settlement PKs; losers refetch | match action, league settle/start |

## 2. Known accepted tradeoffs (deliberate, revisit-able)
- `x-t82-err` response header carries truncated internal error strings (our
  SQL text, never user data or secrets) — kept for zero-dashboard debugging.
  Remove by deleting the header spread in each endpoint's `json()` if desired.
- No app-level rate limiting: that's Cloudflare's job (§4) — cheaper, earlier
  in the stack, and adjustable without deploys.
- League "grace until settle": a run submitted after a week's window but
  before the first settling read still counts. Documented behavior, not a bug.

## 3. Clerk dashboard checklist (do these before launch)
1. **Attack Protection → enable bot detection + email link protections.**
2. Sessions → set a sane lifetime (7d inactivity is fine for a game).
3. API keys → the JWT **public** key goes in CLERK_JWT_KEY (Prod AND Preview).
4. AUTHORIZED_PARTIES = exact production origin(s). Previews on *.pages.dev
   will (correctly) fail azp → previews run anonymous. Feature, not bug.
5. Restrict sign-in methods to what you actually offer; disable unused OAuth.

## 4. Cloudflare dashboard checklist
1. **WAF → rate limiting rules:** `/api/*` ~120 req/min per IP (block 1 min);
   a tighter rule ~20/min on `POST /api/run|/api/match*|/api/league*` catches
   scripted spam without touching real play.
2. Bot Fight Mode: ON. Security level: Medium. Browser integrity check: ON.
3. SSL/TLS → Full (strict); Edge Certificates → **enable HSTS** (6 months,
   includeSubdomains after verifying).
4. `_headers` in this repo already ships nosniff / frame-deny / referrer /
   permissions-policy / COOP on every response.

## 5. CSP (step 2 — needs your Clerk Frontend API domain)
Add to `_headers` once accounts.js CONFIG is filled, replacing CLERK_FAPI:
```
  Content-Security-Policy: default-src 'self'; script-src 'self' CLERK_FAPI; connect-src 'self' CLERK_FAPI https://*.clerk.services; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-src CLERK_FAPI; base-uri 'none'; form-action 'self'
```
Test on Preview first; Clerk's UI components dictate the frame/connect hosts.

## 6. Secrets
DAILY_SECRET, ADMIN_KEY → `wrangler pages secret put` only. CLERK_JWT_KEY is
a public key (not secret, still env). Nothing in wrangler.toml or git —
`.dev.vars` is gitignored; `.dev.vars.example` documents the shape.
**Rotation:** DAILY_SECRET rotation changes all FUTURE daily/league seeds
(past verified runs unaffected — seeds are stored on rows). Clerk key
rotation: paste the new PEM, old sessions die, users re-auth. No data risk.

## 7. Deletion / privacy requests
```sql
-- erase a GM (id = users.id): keep anonymized scores or delete outright
UPDATE runs SET user_id=NULL, sid=NULL WHERE user_id=?;
DELETE FROM league_members WHERE user_id=?;      -- forming leagues only;
UPDATE matches SET status='resigned' ...          -- live games: resign first
DELETE FROM users WHERE id=?;
```
Then delete the user in Clerk (the identity of record).

## 8. Incident basics
Signs of forged-run attempts live in run.js rejects (`why:"replay:*"`,
`seed-mismatch`) — they never store. If D1 is ever exposed: rotate
DAILY_SECRET + ADMIN_KEY, announce display-name exposure, done — see the
one-paragraph posture above for why that's the whole list.
