# TRUE 82 — RUNBOOK (accounts era)

The operator's manual for everything shipped in Phases A–B. Written so a cold
session — human or model — can deploy, smoke-test, and debug without the
original context. The FAIL-SOFT LAW rules everything: every endpoint returns
HTTP 200 `{ok:false, why}` with the real error in an `x-t82-err` response
header; the game must play on no matter what the backend does.

## 0. Golden rule

`node test.js` (108 checks) before touching app.js, sim-core.js,
challenges.js, or anything in functions/. Golden fixtures breaking = you
changed draw order = deliberate `T82.VERSION` bump or revert, never a shrug.

## 1. First-time setup (one-time, ~30 min)

### 1.1 Clerk dashboard (verified against live docs 2026-07-06)
1. Create the application at dashboard.clerk.com → note the **Publishable Key**
   (API keys page, client-safe) and the **Frontend API URL**.
2. API keys → **Show JWT public key → PEM Public Key** → this is
   `CLERK_JWT_KEY` (multi-line PEM; paste whole thing into the CF env var).
3. Allowed origins: add `https://true82.net` and the Preview URL pattern.
4. The client snippet (Phase D wires this into index.html; current format —
   TWO scripts from your instance's Frontend API URL, then load):
```html
<script defer crossorigin="anonymous"
  src="https://YOUR_FRONTEND_API/npm/@clerk/ui@1/dist/ui.browser.js"></script>
<script defer crossorigin="anonymous"
  data-clerk-publishable-key="pk_..."
  src="https://YOUR_FRONTEND_API/npm/@clerk/clerk-js@6/dist/clerk.browser.js"></script>
<script>
  window.addEventListener("load", async () => {
    await Clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } });
  });
</script>
```
   API calls attach `Authorization: Bearer ${await Clerk.session.getToken()}`.

### 1.2 Cloudflare env vars — set on **Production AND Preview** (the split-env trap)
| var | value |
|---|---|
| `CLERK_JWT_KEY` | the PEM public key from 1.1 |
| `AUTHORIZED_PARTIES` | `https://true82.net` (comma-list; add preview origin if you sign in there) |
| `DAILY_SECRET` | 32 random bytes: `openssl rand -hex 32` — rotating reseeds FUTURE days only |
| existing | `ANTHROPIC_API_KEY`, `DASH_KEY`, `RECAP_*` unchanged |

### 1.3 D1 migration — **Preview first, always**
```
wrangler d1 execute true82 --env preview --file=migrations/0001_accounts.sql
# smoke on preview (see §2), THEN:
wrangler d1 execute true82 --remote --file=migrations/0001_accounts.sql
```
Everything is `IF NOT EXISTS` — re-running is safe.

## 2. Smoke tests (run on Preview after every deploy touching functions/)

```bash
B=https://<preview>.pages.dev

# daily: label + uint32 seed + countdown
curl -s "$B/api/daily?mode=cap" | jq

# verify: replay a throwaway (expect ok:false why:incomplete — that IS a pass)
curl -s -X POST "$B/api/verify" -H 'content-type: application/json' \
  -d '{"mode":"cap","seed":1,"actions":[]}' | jq

# run, casual anonymous (expect ok:true, verified true/false, stored true)
curl -s -X POST "$B/api/run" -H 'content-type: application/json' \
  -d '{"id":"00000000-smoke-0001","mode":"classic","seed":42,
       "actions":["k:..."],"claim":{}}' | jq

# me, anonymous (expect {ok:true, anonymous:true})
curl -s "$B/api/me" | jq

# lb (expect ok:true, top:[] on a fresh DB)
curl -s "$B/api/lb?board=daily&mode=cap" | jq
```
## Security (read SECURITY.md before launch)
Migrations now: `wrangler d1 migrations apply t82` (0002 + 0003). Do the
Clerk checklist (SECURITY.md §3) and the Cloudflare checklist (§4 — rate
limits live THERE, not in code). Fast leagues: pick "Fast" at create; the
week flips the moment the last matchup lands (still settle-on-read — someone
has to open the league). Playbook: cookie-auth POST acting anonymous =
the CSRF gate (client must send Bearer or same-origin headers) · `too-many-
open`/`too-many-forming` = abuse caps · anonymous run not stored = missing sid.

## Leagues (Phase E)

Migrate: `wrangler d1 migrations apply t82` (0002 is additive, IF NOT
EXISTS). Smoke: POST /api/league {"name":"Test","format":"cap"} → join from a
second account via the link → start (commissioner) → season opens next
Monday. Play: open ?league=<id> in week 1+, Play button submits with
`official:"league"`. Settlement: there is NO cron — the first GET after a
week boundary settles it; if standings look stale, someone just hasn't
opened the league. Playbook: `need-players` = <3 joined · `not-live` =
forming/complete · `pre-season` = before Monday · `seed-mismatch` on a
league run = client played a stale week's seed (refetch the league, replay).

## Analytics (the commercial pack)

`scripts/analytics.sql` — 10 numbered queries. #2 (cohort retention) and #3
(mode-hook retention) are the business; #6's no-show rate is the league-
health canary; #9 is the win-back list. Dashboard-on-rails (a Sonnet task,
by design): add `functions/api/admin.js` — GET, require `?key=` equal to a
new ADMIN_KEY env var, run queries 1–8 read-only, return one JSON blob;
render with a static admin.html table page. No writes, no auth complexity,
no schema changes — the SQL file is the spec. Do NOT add user ids to the
events table; it is consent-free by design.

## Client wiring (Phase D)

1. Paste the two Clerk values into `accounts.js` CONFIG (top of file) — same
   Dashboard page as §1.1. Until then the site runs fully anonymous: runs
   still submit, UUIDs land in the local ledger (`localStorage t82:runs`),
   and the first sign-in claims them via /api/claim.
2. Weekly override: `wrangler kv key put --binding=GAMES
   "weekly:override:2026-W28" "towers"` (id must exist in challenges.js).
   The tile + run.js + lb.js all honor it; delete the key to fall back to
   rotation.
3. Submit smoke: play any non-kaman game to the results screen → Network tab
   shows POST /api/run → the runStatus chip under "Run it back" reads
   "Counted — #N of M today" (signed-in daily), "Saved" (casual), or
   "Saved — sign in to make it count" (anonymous daily).
4. Daily boards are per-mode under the hood (labels are `YYYY-MM-DD|mode`);
   the intro strip and the Arena's Today board use the canonical **cap**
   daily. `/api/daily?mode=classic|pro` serves the others when a UI wants
   them.
5. Contract freeze: test.js §14b executes the client↔server submission
   contract and calls /api/daily + /api/weekly live. If you change the /api/
   run body vocabulary or the daily/weekly response shapes, §14b goes red
   BEFORE production does — fix both sides of the wire together.
6. Manifest edits: `node scripts/validate_challenges.js --full` must print
   `0 failing` before any challenge change ships. SPCY lines are allowed and
   deliberate.

Duel smoke (needs two signed-in sessions; token = `await Clerk.session.getToken()`):
```bash
# create (as A) → {id, link}
curl -s -X POST "$B/api/match" -H "authorization: Bearer $TOK_A"   -H 'content-type: application/json' -d '{"mode":"classic"}' | jq
# join (as B)
curl -s -X POST "$B/api/match/$ID/join" -H "authorization: Bearer $TOK_B" | jq
# read (either; poll with If-None-Match: W/"<updated_ts>" → 304)
curl -s "$B/api/match/$ID" -H "authorization: Bearer $TOK_A" | jq
# move (mover): {"op":"k:Name|1996|G"} / "st" / "se" / "yr" / "fs" / "mv:0,F"
curl -s -X POST "$B/api/match/$ID/move" -H "authorization: Bearer $TOK_A"   -H 'content-type: application/json' -d '{"op":"st"}' | jq
# quip (id 0-19, one per turn) · resign · rematch
curl -s -X POST "$B/api/match/$ID/quip" -H "authorization: Bearer $TOK_B"   -H 'content-type: application/json' -d '{"qid":9}' | jq
```

Signed-in smoke: from the site's console after Clerk sign-in —
`fetch('/api/me',{headers:{authorization:'Bearer '+await Clerk.session.getToken()}}).then(r=>r.json())`.

**esbuild interop check (the one thing node can't fully prove):** first
Preview deploy after adding functions, hit `/api/verify` — a clean
`{ok:false, why:"incomplete"}` proves `import T82 from "../../sim-core.js"`
interop'd. If instead you get `why:"server"` with `x-t82-err` mentioning
"default" or "not a function" → esbuild interop failed → mirror the file to
`functions/_shared/sim-core.js`, import from there, and add the checksum test
to test.js (compare file bytes so the mirror can't drift).

## 3. Debug playbooks (symptom → check → fix)

| symptom | check | fix |
|---|---|---|
| every API call `{ok:false, why:"server"}` | `x-t82-err` header | usually a missing binding: `DB` (D1) or env var on THIS environment (Preview ≠ Production) |
| `/api/verify` or `/api/run` → `why:"server"`, err mentions `ASSETS` or JSON parse | site_data.json fetch | deployment includes site_data.json at root? `env.ASSETS` only exists on Pages (not `wrangler dev` without assets) |
| `why:"data-version"` | client dataVersion vs server | dataset updated mid-run — expected within 24h of an update day; client copy: "run predates today's data update". Frequent otherwise → client caching a stale site_data.json |
| `why:"replay:illegal-op"` | the `at` index + op | client/core version skew (grammar!), or a genuinely forged action. Compare `coreVersion` client vs `T82.VERSION` server |
| `why:"replay:rng-draws"` | client G.rng.n vs server | a cosmetic draw leaked onto the seeded stream — read THE SEED-SPINE INVARIANT in sim-core.js, find the new `rf()`/`rnd(S)` call |
| `why:"replay:wins"/"net"` | server got vs claimed | UI display math drifted from `finish()` — the server is right; fix the client |
| `why:"seed-mismatch"` (daily) | client seed vs /api/daily | client cached yesterday's seed past UTC rollover — refetch /api/daily when `endsInS` hits 0 |
| `why:"wrong-week"` | reply's `active` id | client's manifest rotation vs server: challenges.js versions differ between deploy halves (should be impossible — same file — unless a stale SW cache; bump cache) |
| signed-in but `/api/me` → `anonymous:true` | `CLERK_JWT_KEY` set on this env? azp in `AUTHORIZED_PARTIES`? token attached? | paste token at jwt.io: check `azp`, `exp`. The middleware NEVER errors — anonymous IS its failure mode, by design |
| daily seed differs Preview vs Prod | `DAILY_SECRET` per env | that's correct behavior (different secrets). Same-env drift = secret was rotated |
| `already-official` on first submit | `runs` for (user, label) | a previous attempt landed (maybe a retry that half-failed). By design: first verified submit is the official one, forever |
| D1 UNIQUE errors in `x-t82-err` on /api/run | which index | `idx_runs_official` = already played (handled, returns standing); `runs.id` = client reused a UUID (client bug) |
| duel move → `why:"raced"` | two writes crossed | expected under double-taps — optimistic lock on updated_ts did its job; client refetches GET and retries |
| duel move → `why:"state-corrupt:..."` | `x-t82-err` has the failing op index | the stored op log no longer replays — core/duel VERSION skew between when ops were made and now. Compare match `core_version` vs `T82.VERSION`; a version bump orphans live matches (announce, or keep old core mirrored) |
| duel → `why:"not-forced"` on fs | draftable rows exist for the mover | client's board render disagrees with the server rebuild — same dataset? same duel-core.js? (stale SW cache) |
| match idle 30+ days still shows active | nobody has GET-polled it | by design: forfeit materializes on the NEXT read (zero-cron). The /api/me chip keeps counting it until someone looks |
| Arena boards all say "Nobody on this board yet" | no verified runs in D1 for today/this week | expected pre-launch; play a signed-in daily/weekly and refresh |
| Arena name save reverts silently | name.js filtered it (charset/leet denylist) or auth expired | response has filtered:true — the cleaned name IS what saved; check x-t82-err otherwise |
| your-move chip shows N but nothing to tap | count-only v1 (no match-list endpoint yet) | by design; the share link is the nudge — match list lands with achievements |
| duel link opens to "Sign in to open this duel" | endpoints are auth-gated (participants + link-holders) | expected for signed-out; Clerk CONFIG must be set for duels at all |
| duel screen shows "Corrupted table" | stored ops no longer replay (x-t82-err on the GET has the op index) | core VERSION skew — same row as `state-corrupt` above; match stays archived-as-is |
| move button does nothing, toast "Board moved — resyncing" | optimistic-lock race (double-tap or rival moved first) | self-heals via forced GET; no action needed |
| quips greyed with "Quip spent" | one quip per player per turn (server + UI agree) | by design; next turn re-arms |
| weekly tile never appears | /api/weekly failing (x-t82-err), or challengeId not in client challenges.js | curl /api/weekly; compare challengeId to T82CH.byId keys — client and server MUST run the same challenges.js |
| runStatus chip stays empty | T82ACC missing (script tag order), or run already submitted (G._submitted) | check index.html loads accounts.js after sim-core; one submit per game is the law |
| every run says "Saved — sign in to count" | daily played anonymous | expected; Clerk CONFIG empty or user signed out |
| verify CPU worries | Workers dash → CPU time | replay ≈ 1.5k RNG draws + pool pricing, trivially cheap; the 2 MB JSON parse is the cold-start cost. If p99 CPU brushes 10 ms: ship `site_data.slim.json` (drop `crests`) and point `_lib/data.js` at it |

## 4. Recurring operations

**Dataset update day** (rule §14.2): commit the new site_data.json at UTC
rollover. For 24h, /api/run may see `data-version` rejects from runs started
pre-update — expected, graceful, client copy covers it. (v1 keeps ONE dataset
live; the "prior file stays verifiable for 24h" refinement is a Phase-D+
option: keep `site_data.prev.json` and try both versions in the verifier.)

**Pin/swap a weekly** (zero deploy): KV on the GAMES namespace —
```
wrangler kv key put --namespace-id <GAMES_id> "weekly:override:2026-W29" "petty_cash"
```
Rotation resumes automatically the week after; delete the key to un-pin.

**Rotate DAILY_SECRET**: paste a new value into both envs. Today's board
changes seed at next read — do it right after UTC rollover or accept a mid-day
board swap. Old runs still verify (seed is stored on the run).

**Add a records board**: one entry in `BOARDS` in functions/api/lb.js — a
where-clause, optionally sel/group/order. That's the whole feature (§6 law).

## 5. What Phase C/D still owe (so nobody looks for them here)
- Achievement evaluation on verified runs (spec §7) — `achievements` table
  ready; grants land with the Arena.
- Client wiring: Clerk snippet, run submission + localStorage UUID ledger,
  claim flow, Arena/weekly UI (D).
