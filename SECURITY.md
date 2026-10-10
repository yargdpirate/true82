# TRUE 82 — SECURITY.md

Born 2026-07-06 on `origin/accounts-test`; rewritten 2026-10-03 for **v69**, the
account lane that actually shipped here. Everything the original covered for
runs, duels, leagues and leaderboards is gone from this file because those
endpoints are gone from this lane — they are still the owner's item 17. If they
land, lift those rows back out of `git show origin/accounts-test:SECURITY.md`.

The one-paragraph posture: **the database cannot leak what it never held.**
D1 stores no emails, no passwords, no payment data, no IPs, no user agents —
identity lives entirely at Clerk. A full D1 dump of this lane exposes
self-chosen display names (charset-filtered), 4-character GM tags, Clerk's
opaque user ids, an opaque per-browser device id, and client-reported Daily
scores. That is the worst-case blast radius, by design.

The email is the sharpest edge of that, so it is worth being explicit: the
account sheet shows which address you signed in with, and it reads that from the
live Clerk session **in the browser**. It is never posted to `/api/*` and there
is no column for it anywhere in `migrations/`. Keep it that way.

## 1. Threat model & what's enforced where

| Threat | Defense | Where |
|---|---|---|
| Forged sessions | Networkless RS256 verify, `exp`/`nbf` (60 s skew), `azp` vs `AUTHORIZED_PARTIES`; every failure → anonymous | `functions/_lib/auth.js` |
| CSRF (cookie riding) | Cookie-sourced tokens on non-GET require `Sec-Fetch-Site` same-origin/site OR a matching `Origin` host, else anonymous. Bearer (our own client) unaffected. Frozen in `test.js` v69 | `_lib/auth.js` `readToken` |
| SQL injection | Every query `.prepare().bind()`. No endpoint on this lane builds SQL from input — not even a column name | `functions/api/*` |
| Stored XSS via names | `cleanName`: 3–20 chars, strict charset, leet-normalized denylist; every render in `accounts.js` goes through its own `esc()` | `_lib/names.js`, `accounts.js` |
| Payload DoS on the claim | Body ≤ 256 KB and the stored blob ≤ 64 KB; ≤ 400 days kept; every field rebuilt from scratch with clamps (`wins` ≤ 82, names ≤ 48 chars, 5 per day); unknown keys dropped | `functions/api/claim.js` |
| D1 row-write exhaustion | The whole claim is ONE row, not one per day. The free plan allows 100,000 row writes a day and **since 2026-09-01 Cloudflare fails queries past it** — a per-day schema would let 250 sign-ups take the whole site's database down | `claim.js`, `migrations/0030` |
| Tag guessing | 4 chars from a 30-symbol no-confusable alphabet, server-assigned, widened to 5 after collisions. The tag is identity; the name is decoration | `_lib/auth.js` `makeTag` |
| Test data on the live boards | **Not defended, by choice.** The mock database covers the analytics stream only; accounts and runs write from every host, because a preview that cannot create an account cannot test one. Preview rows therefore reach production D1. Clear them before the boards go public: `DELETE FROM runs WHERE user_id IN (SELECT id FROM users WHERE created_ts < <launch>); DELETE FROM users WHERE created_ts < <launch>;` | `functions/_lib/acct.js` |
| Account history theft | The claim accepts only `t82:sid`, this lane's own namespace. It is **not** the retention cookie (`t82_rid`) and **not** the traits voter hash, so an account can never be joined to the analytics stream | `claim.js`, `accounts.js` |
| Fabricated scores | The client posts `{mode, seed, actions}`, never a score. The server replays it and stores its OWN recomputation; a mismatch in wins, net, RNG draws or the Hot Hand stores `verified = 0` and can never rank | `_lib/sim.js`, `api/run.js` |
| Posting an easy board as today's Daily | The day key alone fixes the mode, seed and challenge, re-derived server-side from the same daily-core.js the browser runs. A run on any other seed is stored but stripped of its official status | `_lib/sim.js` `dailyBoard()` |
| **Pre-solving a future Daily** | v69.4: the seed is minted server-side from `DAILY_SECRET`, so a future board cannot be computed from the shipped file, and `/api/day` refuses any day after today on the live host. Days before `MINT_FROM` keep the old derivation so the archive cannot move | `_lib/dayseed.js`, `api/day.js` |
| Re-rolling a Daily until it is good | UNIQUE `(user_id, official)`: the first official attempt of a day is the one that counts | `migrations/0031` |
| A board full of anonymous entries | Every board filters `verified = 1 AND user_id IS NOT NULL` | `api/lb.js` |
| SQL injection via a board name | Every board's SQL is a server constant in a fixed registry; the query string only ever picks a key and supplies BOUND arguments. Nothing from a request is interpolated, not even a column or a mode | `api/lb.js` |
| Third-party script risk | Clerk's two bundles load from the instance's own Frontend API host with **pinned majors** (`@clerk/ui@1`, `@clerk/clerk-js@6`). An unpinned `@latest` would let a breaking release reach players unannounced | `accounts.js` |

## 1b. The auth diagnostic on /api/me

When a request presents a token that does NOT authenticate, `GET /api/me`
answers with why: `no-key-on-this-environment`, `key-will-not-parse`,
`origin-not-in-AUTHORIZED_PARTIES` (with `authorizedParties` and `thisOrigin`)
or `token-rejected`. It is answered only when a token was actually presented.

This is a deliberate, reviewable disclosure. Nothing in it is secret:
`CLERK_JWT_KEY` is a public key, `AUTHORIZED_PARTIES` is the site's own origin,
and whether sign-in is configured is obvious to anyone who tries it. It exists
because "anonymous" has four very different causes that are indistinguishable
from a phone, and every one of them was guessed at wrongly before this existed.
Remove the block in `functions/api/me.js` if that trade ever stops being worth it.

## 2. Known accepted tradeoffs (deliberate, revisit-able)

- `x-t82-err` carries truncated internal error strings (our SQL text, never user
  data or secrets) — kept for zero-dashboard debugging. Remove by deleting the
  header spread in `_lib/acct.js`'s `json()`.
- No app-level rate limiting: that is Cloudflare's job (§4) — cheaper, earlier
  in the stack, adjustable without a deploy.
- Claimed Daily history is **client-reported** and stored `verified=0`. Anyone
  can claim an 82-0 season they never played. That is fine while nothing reads
  it; the moment a board does, it reads verified server-replayed runs instead
  (ACCOUNTS.md §1). Do not promote this column to a leaderboard source.
- Anyone signed in may re-claim, and a claim merges rather than replaces, so a
  second device adds its days. A day already held only moves on a better result.

## 3. Clerk dashboard checklist (before the live flip)

1. **Attack Protection → bot detection and email-link protections ON.**
2. Sessions → a sane lifetime (7 days of inactivity is fine for a game).
3. API keys → the JWT **public** key goes in `CLERK_JWT_KEY`, on Production
   **and** Preview.
4. `AUTHORIZED_PARTIES` = the exact production origin(s). Previews on
   `*.pages.dev` will correctly fail `azp` and run anonymous. Feature, not bug.
5. Restrict sign-in methods to the two actually offered — **email code and
   Google** — and disable every unused OAuth provider.
6. Google OAuth: development instances ride Clerk's shared credentials, so
   nothing to create while building. A **production** instance needs your own
   Google OAuth app, and production also requires CNAMEs for `clerk`,
   `accounts` and `mail` on true82.net (up to 48 h to propagate).
7. Under 13: the sheet states the 13-or-older requirement. There is no age gate
   and no birth date collected — the owner's call, 2026-10-03. If that ever
   changes, Clerk can require a birth date at sign-up.

## 4. Cloudflare dashboard checklist

1. **WAF → rate limiting:** `/api/*` ~120 req/min per IP (block 1 min), and a
   tighter ~10/min on `POST /api/claim` and `POST /api/name` — both are
   once-in-a-while actions, so anything faster is a script.
2. Bot Fight Mode ON. Security level Medium. Browser integrity check ON.
3. SSL/TLS → Full (strict); Edge Certificates → **enable HSTS** (6 months,
   `includeSubdomains` after verifying).
4. `_headers` already ships nosniff / frame-deny / referrer / permissions-policy
   / COOP on every response.

## 5. CSP (needs your Clerk Frontend API domain)

`_headers` deliberately sets no CSP, because the policy has to pin a
per-instance Clerk host. Once `accounts.js` CONFIG is filled, add this to the
`/*` block, replacing `CLERK_FAPI` with that host:

```
  Content-Security-Policy: default-src 'self'; script-src 'self' CLERK_FAPI; connect-src 'self' CLERK_FAPI https://*.clerk.services; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-src CLERK_FAPI; base-uri 'none'; form-action 'self'
```

Test on Preview first: Clerk's UI components dictate the `frame-src` and
`connect-src` hosts, and they change between majors. Note the site also loads
Google Fonts, so `style-src`/`font-src` need `https://fonts.googleapis.com` and
`https://fonts.gstatic.com` — verify in the console before shipping it.

## 6. Secrets

`CLERK_JWT_KEY` is a *public* key (not secret, still env). `DASH_KEY`,
`RECAP_SIGN_KEY`, `ANTHROPIC_API_KEY` are secrets and live only in the
Cloudflare Pages dashboard — on Production **and** Preview, the split-env trap.
The publishable key in `accounts.js` is client-safe by design.

For local work, `wrangler pages dev` reads `.dev.vars`. The repo had **no
`.gitignore` at all** before v69, so that file would have been committed on the
next `git add -A`; v69 adds one covering `.dev.vars` and `.wrangler/`. Check it
is still there before putting anything real in `.dev.vars`:
`git check-ignore -v .dev.vars` must print a match.

**Rotation:** paste a new Clerk PEM and old sessions die, users re-auth, no data
risk.

## 7. Deletion / privacy requests

```sql
DELETE FROM local_claims WHERE user_id = ?;
DELETE FROM sid_links    WHERE user_id = ?;
DELETE FROM users        WHERE id = ?;
```

Then delete the user in Clerk, which is the identity of record. On this lane
nothing survives the user, so there is no anonymize-and-keep variant to choose
— that question returns when `runs` does.

## 8. Incident basics

If D1 is ever exposed: announce display-name and Daily-score exposure, rotate
`DASH_KEY` and `RECAP_SIGN_KEY`, and that is the whole list — see the posture at
the top for why. Clerk holds the emails; a D1 breach is not an email breach.

## Test authentication on a preview (v69.3)

`functions/api/testauth.js` mints **real Clerk session tokens** on a preview so several accounts can be
driven without a human signing in once per identity. It is auth-adjacent, so it is written to be
boring and is pinned by six checks in `test.js`.

**It does not weaken authentication.** It holds no verification logic, reads no verification key and
does no crypto: it asks Clerk's Backend API for a token and hands it back. `_lib/auth.js` is untouched
and is still the only thing that validates anything. A token from here is refused by exactly the same
RS256 path, with the same `azp` check, as a token from a phone, which is the point: a wrong
`CLERK_JWT_KEY`, a wrong `AUTHORIZED_PARTIES` or an env var that never got baked into a deployment
fails here loudly instead of being rediscovered by hand.

**Four guards, every one of which answers 404 so the endpoint does not admit to existing:**

| | |
|---|---|
| 1 | `true82.net` and `www.true82.net` are refused by hostname before anything else is read. One definition, shared with the database switch (`acct.js` `liveHost`) |
| 2 | No `TEST_AUTH_SECRET`, no endpoint. Set it on Preview only and Production is inert even if guard 1 were wrong |
| 3 | The caller must know the secret, compared in constant time so it cannot be learned a character at a time |
| 4 | Only user ids listed in `TEST_USER_IDS` can be minted for, so a leaked preview secret still cannot reach the owner's own account |

Clerk adds a fifth for free: `POST /v1/sessions` is documented as *"intended only for use in testing,
and is not available for production instances"*, so the mechanism is refused by Clerk against a
production instance.

**Setup, once, all of it the owner's because it needs his Clerk secret:**

1. Clerk dashboard, Users, create the test users. The `+clerk_test` convention works
   (`true82mailbox+clerk_test1@gmail.com`): Clerk treats those as test identities with the fixed code
   `424242`, so no real inbox is involved. Copy each `user_...` id.
2. Cloudflare Pages, Settings, Environment variables, **Preview only**: `CLERK_SECRET_KEY`,
   `TEST_AUTH_SECRET` (any long random string), `TEST_USER_IDS` (the ids, comma separated).
3. **Redeploy.** Pages bakes environment variables in at build time (handoff 0000002b, trap one).

Never set any of the three on Production.

**Use:** `node tools/boards-live.js --clerk --url https://v69-boards.true82.pages.dev --secret <secret>`
runs the full 32-check pass with real Clerk identities. `--list` prints the roster and stops.

## The preview's own database (v69.3)

Account-lane writes used to go to the **production** database from every host, which is why test runs
landed on the real boards and cleanup was `created_ts` guesswork. Bind D1 as **`DB_PREVIEW`** on the
Preview environment and `acct.js` `db()` routes every account read and write there instead; the same
resolved binding is handed to `auth.js`, so a preview sign-in creates its user in the preview database
too. With nothing bound the behaviour is exactly what shipped, so this changes nothing until it is
bound.

## The Daily's seed is minted, not derived (v69.4)

`daily-core.js` computed every Daily's seed as `hash32(SEED_NS + key)` **in the browser**, so any
future board could be computed by anyone who read the shipped file. The three launch-week boards were
worse: `SEED_OVERRIDES` carried their seeds as literals, published since v66.4 went live on 2026-09-29.

The seed now resolves, in order: a pin from **`DAILY_PINS`**, else
`HMAC-SHA256(DAILY_SECRET, "t82seed|" + key)` truncated to a uint32 for any day from `MINT_FROM`
onward, else nothing — and daily-core's own `seedFor()` stands. `/api/day` serves the browser that
map; `_lib/sim.js` mints from the same module, so run.js's seed check and the board a player was
served cannot drift.

**Why the pins are an environment variable and not a constant in `functions/`.** This repo is public.
Moving a literal out of a file the browser downloads and into one it does not hides it from the
browser and from nobody else. A seed that matters cannot live in the repo in any file, which is also
why `.gitignore` now covers `.claude/`: a local launch config carries the real pins as binding flags.

**Setup, both his, both needed before 10/20:**

1. Cloudflare Pages, Settings, Environment variables, **Production AND Preview**: `DAILY_SECRET`
   (any long random string — the same value on both, or a preview's ordinary boards will differ from
   production's) and `DAILY_PINS` (`2026-10-20:<seed>,2026-10-21:<seed>,2026-10-22:<seed>`).
2. **Redeploy both.** Pages bakes environment variables in at build time.

**Check it with one request:** `GET /api/day` reports `minting`, `pinned` and `pinsNeeded` in every response and
leaks neither a secret nor a seed it was not asked for. `minting: false` or `pinned: 0` on production
means a variable did not get baked into that deployment.

**It fails soft, deliberately to the OLD behaviour.** With neither variable set, nothing is minted and
the game runs exactly as it shipped — the launch week falls back to the v66.4 rolls in
`SEED_OVERRIDES`, which are public but tuned and simulated. The worst case of a forgotten variable is
therefore today's situation, never a random board nobody checked. `SEED_OVERRIDES` was left in the
shipped file for that reason alone.

**And it fails soft when it is HALF configured, which is the state that actually happens.** The first
deployment had `DAILY_SECRET` set and `DAILY_PINS` not yet, and opening night minted `3048253669` — a
board no crowd model has ever been run against, strictly worse than the published roll it replaced,
and silent. `dayseed.js` therefore carries the LIST of deliberately-rolled dates (`CHOSEN`; the dates
are public, only the seeds are not) and refuses to HMAC one: with no pin, the approved roll stands.
`/api/day` reports **`pinsNeeded`**, the chosen nights still to come with no pin. `minting: true` with
`pinsNeeded: 3` is the half-configured state; **`pinsNeeded: 0` is the only shippable one.**

**What it does not defend.** A player can still pre-solve TODAY's board, which is inherent: they are
given the seed in order to play it. And `MINT_FROM` must never move backwards past a day that has been
played, or the archive, stored official runs and shared beat-links would all replay a board nobody saw.
test.js pins that boundary in both files.
