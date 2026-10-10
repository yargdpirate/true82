# Clerk: the production instance, step by step (2026-10-10)

Everything so far runs on the Clerk **development** instance
(`ruling-sturgeon-1691.clerk.accounts.dev`). That is fine for a preview and not fine for a launch:
a dev instance is rate-limited, shows Clerk's development badge, and rides Clerk's SHARED Google
credentials, so the Google consent screen says Clerk's name and not yours.

This is the whole job, in order, with the decisions separated from the clicking.

---

## Before you start: two facts that change the shape of this

**1. Your DNS is on Cloudflare.** `true82.net` answers from `fonzie.ns.cloudflare.com` and
`kira.ns.cloudflare.com`, which means you add the records in the same dashboard you already use and
they are live in seconds. **The "up to 48 hours" everyone quotes is the worst case for a slow
registrar.** Clerk's own verification usually lands in minutes. Plan for an afternoon, not two days.

**2. The TikTok email scope is the only genuinely unbounded item, and it does not have to be on the
critical path.** A production instance can ship with email codes alone, and social sign-in can be
added later without touching DNS, keys or any code. If TikTok's `user.info.email` review is still
pending on the 19th, you launch with email and nothing is lost.

So the order below puts the slow, unbounded things first and the things you control last.

---

## Step 1 — start the TikTok and Google applications TODAY, before anything else

These are the only two with someone else's clock on them.

- **TikTok**: a developer app, then a SEPARATE approval for the `user.info.email` scope. The scope
  review has no published turnaround. Start it, then forget it — launch does not depend on it.
- **Google**: your own OAuth app in Google Cloud Console. About fifteen minutes and approved
  instantly for the basic email/profile scopes. Worth doing because the dev instance currently shows
  Clerk's name on the consent screen, not yours.

Neither blocks Step 2. Do them in parallel.

## Step 2 — create the production instance

In the Clerk dashboard, top-left, there is an environment switcher reading **Development**. Switch it
to **Production**. Clerk will ask you to create the production instance and will ask for your domain:
`true82.net`.

**It will then show you a list of DNS records.** Leave that page open; Step 3 is entering them.

## Step 3 — add the DNS records in Cloudflare

Cloudflare dashboard → true82.net → DNS → Records. For each row Clerk showed you, add a CNAME with
the exact name and target Clerk gives.

**The one thing that breaks this: every record must be "DNS only", the GREY cloud, not the orange
one.** Cloudflare proxies by default. A proxied record hides the real target and Clerk's verification
will fail with nothing useful to tell you. Click the orange cloud on each row until it goes grey.

Then press Verify in Clerk. Expect minutes.

**Tell me when the records are in and I will check them from here** — I can see whether each one
resolves and whether it is proxied, which is faster than guessing at a failed verification.

## Step 4 — the keys, and the one that is different this time

The production instance has its OWN keys. Three places need them, and one of them is not what you
would expect:

| what | where | value |
|---|---|---|
| `CLERK_FRONTEND_API` | `accounts.js` `CLERK_PROD` | `https://clerk.true82.net` |
| `CLERK_PUBLISHABLE_KEY` | `accounts.js` `CLERK_PROD` | the `pk_live_…` from Clerk → API keys |
| `CLERK_JWT_KEY` | Cloudflare → **Production** env | the production instance's public key |
| `AUTHORIZED_PARTIES` | Cloudflare → **Production** env | `https://true82.net` |
| `CLERK_SECRET_KEY` | Cloudflare → **Preview** env | **unchanged — still the DEV `sk_test_…`** |

**Why the secret key stays on dev**: Clerk documents `POST /v1/sessions` as *"intended only for use
in testing, and is not available for production instances"*. That endpoint is how `/api/testauth`
mints real identities for the test harnesses. It can only ever work against the development
instance, so the preview keeps the dev instance and the dev secret, forever.

That is also why `accounts.js` now picks its instance BY HOST (v70.3): true82.net gets production,
every preview and localhost keeps development. Swapping one pair for the other — which is what the
old comment in that file told you to do — would have silently broken every automated test on the day
you launched.

**I will hand you the exact `CLERK_JWT_KEY` value.** Do not copy it from an old config: derive it
from the production instance's public JWKS, which I can do in one command once the instance exists.
An earlier session had the SYNTHETIC TEST KEYPAIR sitting in a launch config under that name, and it
fails with every diagnostic reading green.

## Step 5 — redeploy, then check

A Pages environment variable does nothing until the next build. Redeploy production, then:

```bash
curl -s https://true82.net/api/me | head -c 200
```

Anonymous with no error is correct. Then sign in on your phone once — **that is the one step nothing
can automate on a production instance**, because the harnesses cannot mint there. One human sign-in
per release, and this is the release.

## Step 6 — only then, the live flip

`ACCT_LIVE = true` in `accounts.js`. Before it, the five "no account" surfaces have to change or they
become false the moment the face appears: `index.html:138`, `md/faq.md:19` and `:27`, `md/index.md:26`,
and the `faq/` and `how-it-works/` twins. (`md/faq.md:19`'s "no cookies" is already wrong — the
400-day `t82_rid` cookie is live.)

---

## What can go wrong, in the order it usually does

1. **A proxied DNS record.** Grey cloud, every row. This is most of the failed verifications.
2. **An env var changed without a redeploy.** Pages bakes them at build time. This has cost this
   project more time than any other single thing.
3. **The wrong public key in `CLERK_JWT_KEY`.** Everything reads green and nothing authenticates.
   `GET /api/me` says exactly which check failed — read it rather than guessing.
4. **Waiting on TikTok.** Do not. Ship with email.
