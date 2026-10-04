# TRUE 82 — CURRENT AGENT HANDOFF

> **FIRST THING (2026-10-04, later): V69.2. THE BOARDS WERE NOT BROKEN, BUT FOUR THINGS ON THEM WERE, AND
> ONE OF THEM WOULD HAVE EMPTIED THE DAILY BOARD FOR EVERY AMERICAN PLAYER DURING THE INFLUENCER WINDOW.**
> The account lane works end to end: that is now PROVEN rather than believed, by two harnesses that are
> committed and repeatable (`node tools/boards-e2e.js`, 61 checks, and `node tools/boards-live.js`, 32
> checks against a running Worker). What the audit found instead were defects in what the boards MEAN:
>
> 1. **`/api/lb`'s Today board asked for the UTC day; a run stores under the player's LOCAL day.** From
>    5pm Pacific and 8pm Eastern until local midnight the board asked for a day nobody had played and came
>    back empty. Measured: 7 hours a day in Los Angeles, 4 in New York. That is 10/20-10/22 prime time.
>    Fixed in accounts.js (`loadBoard` sends `T82DAILY.dayKey()`); `utcDay()` stays as the no-JS fallback.
> 2. **The run was posted BEFORE the post-season Heat Check resolved.** A refusal pushes "hx" into
>    G.actions from inside the overlay, after the log had already been snapshotted, so the server replayed
>    the spin the player DECLINED and agreed with the client's replay of the same incomplete log: a row
>    stored `verified = 1` with a record nobody played. Demonstrated on Presti seed 7700208, where taking
>    the spin gives 82-0 and refusing gives 80-2. Fixed: `submitFinishedRun()` holds while `G.hhPending`
>    and hotHand's `dismiss()` releases it.
> 3. **A Daily counted as an ordinary season in its base mode.** A GM with ZERO vanilla Classic seasons
>    sat on the Classic Best net board. Worse, your 82-0% denominator counted every Daily, so playing the
>    Daily every day LOWERED your perfection rate: the board charged people for the habit the game wants.
>    Fixed: `official IS NULL` on rate, net and cheapest.
> 4. **Every board tab rendered as a gold keycap.** `.lb-tab` is not in BTN3D_EXCLUDE, so app.js's
>    document-wide decorator added `.presti-spin` and look.css's specificity-boosted rule beat both
>    `.lb-tab` and `.lb-tab.on`: five identical neon plates with no selected state. Fixed with `tm-flat`
>    on the tab (the documented opt-out) rather than hand-editing the lab-generated look.css.
>
> **Also landed:** the owner's reversal on the Daily (a signed-out 79-3 now counts when you sign in), with
> three rules in SQL that stop it being farmable; and the board's legibility (the rank was painted in the
> token the theme documents as DISABLED, 2.96:1).
>
> **`main` AND `origin/c-code-clean` ARE STILL UNTOUCHED.** All of this is on `v69-boards`, which is the
> preview the owner can open. Nothing here changes gameplay.
>
> **THE LAB WAS BUILT BY FIVE AGENTS IN PARALLEL AND THEN REVIEWED BY THREE, and the review pass was
> worth more than the build.** All three lenses returned fix-first and agreed on the worst of it: the
> one screen the lab exists for (signed out, with a season, being shown where they would have landed)
> did not work, because data.js zeroed youRank whenever signedIn was false. Every other finding was a
> place where two modules read one contract differently: looks.js styled `p.lb-ghost` where boards.js
> emits a div, `.lb-window` was computed from the recipe while data.js windowed every board, the
> five-tab row was flex-wrap: nowrap inside a 260px column, and `LB.boards.WIRE` was a contract one
> side wrote and the other never read, so every in-frame control was dead on the phone. **If you build
> the next lab this way, budget for the integration pass; it is not optional and it is where the real
> defects are.** All fixed, 2,204 render combinations exercised.
>
> **THE LEADERBOARD LAB IS AT `docs/leaderboard-lab/`** and opens at
> `https://v69-boards.true82.pages.dev/docs/leaderboard-lab/`. Its `SPEC.md` is the design brief a
> 33-agent research and audit pass produced, and it is the most useful document in the folder: the board
> slate it argues for, the start-link and post-game variants, eleven art directions, and the eleven-item
> must-fix list this session worked from.


> **FIRST THING (2026-10-04): V69, THE ACCOUNT AND THE FIVE BOARDS, IS BUILT, DEPLOYED AND WORKING — on the
> branch `v69-boards` ONLY. `main` AND `origin/c-code-clean` ARE UNTOUCHED at v68.2 (`bb2c565`).** Ten commits,
> `215d859..938865b`. Local `c-code-clean` carries them too but was never pushed, so the remote lane is clean.
>
> **It is confirmed working.** The owner signed in on his phone at
> `https://v69-boards.true82.pages.dev/?acct=1` on 2026-10-04 (email code). Clerk is configured, the Cloudflare
> env vars are set, and migrations 0030 and 0031 are APPLIED TO PRODUCTION D1 — those three setup jobs are done
> and need no repeating. Verification runs in production: measured there, an ordinary Classic run replayed 74-8
> net 14.95 matching the client exactly, today's real Daily board replayed 78-4, and a claimed 82-0 on that same
> run was refused with `why: "rng-draws"`.
>
> **STILL DORMANT ON LIVE.** `ACCT_LIVE` in accounts.js is `false`, so true82.net renders no account face and
> requests nothing from Clerk; `?acct=1` opens the lane anywhere. The owner has decided **accounts go live for the
> debut** (the influencer video is already made; the window is 10/20-10/22).
>
> **WHAT IS LEFT, in section 0000002:** the Clerk **production** instance (DNS, up to 48h, different keys from the
> development one), the five public pages that still promise "no account", and clearing the preview's test rows.
> The Workers Paid plan is NOT needed — an earlier claim here said otherwise and was wrong.

> **FIRST THING (2026-10-03): V68.2 (app.js and sim-core.js key `20261003-v68-3`, BUILD_V `v68.2`, engine VERSION 17)
> IS ON `c-code-clean` AND `art-variety` (committed and pushed; NOT LIVE: `main` is still v66.5 and merges only at his
> word).** The owner's decision on v68.1's
> biggest open item: a lucky Presti 81-1 became 82-0 on about 45% of post-season spins; he picked ABOUT 25% (over
> 15/20/33). Only how a PLAYED 81 moves changed: the spin is judged by its change in EXPECTED wins (fractions count),
> and one constant, `HH_SAVE_GAIN` 0.64 in sim-core.js, says how much expected gain earns a whole win. Measured: saves
> 24.9%, stays 72.4%, COLD lowers 2.8% (v68.1: 45.6 / 52.3 / 2.0). Everything else of v68.1 stands (HOT and up never
> lower, WARM never moves, COLD never raises, CHARITY applies nothing, the Daily's honest 81 and its ~9%, the
> mid-season Heat Check, the ladder and odds). Section 0000000, "v68.2", has the table and what he must hear (HOT now
> almost never saves; COLD bites a little more often). Not touched: the 0.97 nightly cap (its own balance check, later).

> **FIRST THING (2026-10-02, night): V68.1 (app.js key `20261002-v68-2`, sim-core.js `20261002-v68-1`, BUILD_V `v68.1`,
> engine VERSION 16) IS ON `c-code-clean` AND `art-variety` (committed and pushed; NOT LIVE: `main` is still v66.5 and
> merges only at his word).** The owner's three decisions after hearing v68's
> outstanding list: (1) "move from the real 81": a Heat Check spin moves the record PLAYED by the spin's projected
> change (HOT and up only raise it, WARM never moves it, COLD only lowers it; the save is the raised record reaching
> 82), in app.js AND in sim-core's replay verifier, which now also plays out Presti seasons and the mid-season Heat
> Check (whose re-roll can no longer end worse than the games played); (2) "shorter season too": REEL_END_MS 15120
> (was 16800); (3) the Hot Hand ledger rows use the middle dot. Section 0000000 has it, and what he still must hear
> (the save rate on lucky 81s jumps from 0% to about 45%; the 0.97 nightly ceiling the app thinks it lifted). The
> verifier's three findings are fixed in the same commit (SKIP after the pull now applies the spin; SHARE YOUR TEAM and
> the Tribune share the record played; the share poster follows a net-only spin), plus one found while checking them
> (a COLD that cost a win still printed 81-1 on the results print).

> **FIRST THING (2026-10-02, evening): V68 (key `20261002-v68`, BUILD_V `v68`) IS ON `c-code-clean` AND
> `art-variety`. NOT LIVE: `main` is still v66.5 and merges only at the owner's word, AFTER he has read the outstanding
> list in section 0000000 (the biggest: on a lucky 81-1 a HOT spin can lower the record).** v68 = the Hot Hand
> scaling from his other session (COLD 0.9, WARM 1.0, HOT 1.1, ON FIRE 1.2, SUPERNOVA 1.3; the spin's number stands
> both ways), the shorter heavy-loss pauses (HOLD_SCALE 0.85 in reel-riso.js), the iPhone check (art-core.js times the
> run's first art file; slow = no more downloads), Combo no longer printing COMBO on COLD, and tools/art-remove.js
> (one command removes any look for good). The dagger, marbling and the wave stay exactly as they are.

> **FIRST THING (2026-10-02): THE ART LIBRARY WITH THE OWNER'S FIRST PICKS (v67.2, key `20261002-v67-2`) IS ON
> `c-code-clean` (the preview, merged with main's v66.5) AND `art-variety`. NOT LIVE: `main` is untouched and merges
> only at his word. Read section 0000000.** His `ART-LAB PICKS v1` (art/PICKS.md, verbatim, with his answers) is
> applied: 12 cuts switched off, his speed notes on a dial he can undo line by line (art/tempo.json), the dagger,
> arcade, jam, marbling and wave fixes, no streak mark left on any settled dot, and no art downloads on a slow link.
> Waiting on him: the standard finish time (the table in 0000000) and the questions listed there.

> **FIRST THING (2026-09-29, late night): v66.4 IS LIVE ON MAIN; section 000000 has everything.** The season's first
> three nights are special Dailies built for first-timers (an influencer films the game that week): 10/20 Opening Night
> (#101), 10/21 Doubleheader (#102), 10/22 Primetime (#103). Each is a Classic board of that night's national-TV
> franchises in their star eras, with ONE deep cut in round 2 or 3 and two team skips, on rolls chosen by a crowd
> simulation (tools/daily-crowd.js) so first-timers draft stars they know without everyone drafting the same five.
> Nothing is pending on his side. Test any day early on a preview: `?day=YYYY-MM-DD` (see 000000). The standing
> chores: after each Monday tag refresh (10/5, 10/12, 10/19) lands on `c-code-clean`, fast-forward `main` at his word
> ("merge"); his queued question about traffic and analytics (000000, "Next") is not started. If a deploy goes wrong,
> the undo is his, one step in the Cloudflare dashboard (Workers & Pages, then true82, then Deployments: "Rollback to
> this deployment" on the previous production deployment).
>
> **NEW (LIVE 2026-10-02, section 000001): `/api/recap` is locked to the app.** It used to be an unauthenticated POST on a
> public URL that spent ANTHROPIC_API_KEY, which is what any "lab" would have been built on; no lab survives in the
> repo. It now serves same-origin requests only, in one phase, with every roster name and fit note checked against
> what app.js can emit, under per-IP and daily caps. `RECAP_OFF=1` stops all AI copy with no deploy. The prompt, the
> answer and the share signature are byte-identical for real play, and app.js is untouched (no cache key, no BUILD_V).
>
> His merge command, for next time (from the repo folder):
> `git checkout main && git merge --ff-only origin/main && git merge --ff-only c-code-clean && git push origin main && git checkout c-code-clean`
>
> **NEVER ASK FOR A NEW ?v= KEY BEFORE THE PAGE THAT LINKS IT IS LIVE (learned on v65.2).** While a deploy is still
> going out, `true82.net/app.js?v=<new key>` is answered by the OLD deployment (the static server ignores the query)
> with the year-long immutable header, and Cloudflare's edge keeps that old file under the new key (seen: `cf-cache-
> status: HIT`, the v65.1 file at v65.2's key). To confirm a deploy, poll the HTML (it revalidates) until it carries the
> new key, and only then fetch the file. If it happens anyway, re-key the file (bump and stamp) and push again: v65.3
> did exactly that. The poisoned URL (app.js?v=20260929-v65-2) is simply never linked again.
>
> **NEW RULE SINCE v64.1 (read 00000y):** the versioned static files are cached by browsers for a YEAR. After editing
> app.js, styles.css, look.css, sim-core.js, challenges.js, daily-core.js, reel-riso.js, results-riso.js, analytics.js,
> retention-client.js, the masthead or site_data.json, run `node tools/cache-keys.js --stamp <new key>` (it rewrites
> every page's ?v= for the changed files); `node test.js` fails until you do. Never hand-edit those ?v= keys.
>
> **His voice notes:** when he says "my voice notes" or "my reminders" he means the **Pineapple** list in Apple
> Reminders (iCloud, readable from this Mac with `osascript -l JavaScript`; the memory `apple-reminders-access` has the
> one-liner). The dictation is badly garbled ("press Steam mode" = Presti mode, "true ADT" = True 82): decode it against
> the app, and read back your decoding before building.

**Current source of truth:** the GitHub repo. `c-code-clean` = v68.2 (the owner's "about 25%": a played 81 judged in expected wins, `HH_SAVE_GAIN`; section 0000000; committed and pushed, also on `art-variety`), on v68.1 (the owner's "move from the real 81" record rule, the 10% shorter season, the middle dot in the Hot Hand rows; section 0000000), on v68 (the Hot Hand scaling, the shorter pauses, the iPhone check, art-remove; on v67.2, the art library with the owner's first picks, merged with v66.5; NOT live; section 0000000). `main` = v66.5, LIVE (the Tribune's API key locked to the app, section 000001); before it v66.4 (the three special days: star eras, one deep cut, two team skips, crowd-chosen seeds, lists opening on OBPM; the start screen's fitted text; the test day; 000000); before it v65.3 (2026-09-29: the new home, Title 2; 00000z), on v64.1 (the speed pass, section 00000y), on v64 (section 00000x), on v63.1 (00000w), v63 (00000v), v62.2 (00000u), v62.1 (00000t), v62 (00000s) and v61.1 (00000r). Migration 0029 IS applied to the live D1; v61.1 to v64 need no other database step. Merge only on the owner's word. A weekly scheduled task refreshes the tags onto c-code-clean (00000r), so after a refresh `main` needs another fast-forward to carry the new tags live.

**Date:** 2026-10-03
**Build:** `v68.2` on `c-code-clean` (`BUILD_V = "v68.2"`; every cache key lives in tools/cache-keys.json and every page carries it: app.js and sim-core.js at `20261003-v68-3`; styles.css, reel-riso.js, art-core.js, art-index.js and art/hot/arcade.js at `20261002-v68`; the rest as tools/cache-keys.json lists them; engine `T82.VERSION` 17).
**Most recent change:** section 0000000 (c-code-clean, NOT live, 2026-10-03): v68.2, a lucky played 81-1 saved on about 25% of spins (was 45%), one constant (`HH_SAVE_GAIN`). Before that (2026-10-02 night): v68.1, the owner's three decisions (the record moves from the 81 played; the season 10% shorter; the middle dot), the verifier brought level with the game. Before that, v68 (2026-10-02 evening): the Hot Hand scaling (his other session), the shorter pauses, the iPhone check, COLD's wording in Combo, tools/art-remove.js. Before that, in the same section: v67.2, the art library with the owner's first picks (cuts, his speed dial art/tempo.json, the dagger/arcade/jam/marbling/wave fixes, no streak marks on settled dots, no art downloads on a slow link, the finish-time table). Before that, section 000001 (LIVE on main, 2026-10-02): the Tribune's Anthropic key is the app's only (same-origin, one phase, an allowlisted roster and fit notes, per-IP and daily spend caps, a RECAP_OFF switch; no lab was found in the tree, and app.js is untouched). Before that, section 000000: v66 to v66.4, the launch week's three special Dailies (star eras, one deep cut, crowd-chosen rolls), the start screen's text fitted to one line, the test day. Before that, section 00000z: v65 and v65.1, the home's title art (the owner picked Title 2, lifted the doors), LIVE. Before that, section 00000y: v64.1, the speed pass (no visual change). Before that, section 00000x: v64, the owner's third playtest (his voice notes). Before that, section 00000w: v63.1, the owner's second playtest list. Before that, section 00000v: v63, the owner's eight tweaks after his playtest, and his standing lesson: build what the game needs, not the literal spec. Before that, section 00000u: v62.2, the owner's pair taxes and stat-padder charge, the scouted tags loaded and frozen. Before that, section 00000t: v62.1, the Dueling Banjos Tax (two TITLE #1s cost 2), and the scouting pass for five thin tags (migration 0029, written and tested, NOT applied). Before that, section 00000s: v62, one ball (a fourth and a fifth 20-point scorer cost 3 each) and too short (a five under 6'6" on average costs 3), the owner's picks after the tag taxes proved to do nothing; plus the fix for the Monday tag refresh. Before that, section 00000r: v61.1, the label taxes (the owner's rules, built with the fixes he agreed to, balance-checked on 15,130 real drafts; Pro hides the tags until the results; a weekly tag refresh is scheduled). Before that, section 00000q: v60, the owner's ten-item list (darker button slabs, all three season paintings, the left-to-right fill, the glove that survives scrolling, the "+" tag sheet, the Scoring Card's corners, no repeat questions, the mock database for test servers, KEEP GOING to /bonuses/, the vote room). Before that, section 00000p: v59.6 is LIVE on main (merged 2026-09-27 at the owner's go). Before that, section 00000o: v59.4, the styled Σ on the Scoring Card's aggregate. Before that, section 00000n: v59.3, the Do-Over board no longer jumps, the game-by-game month captions (SWEPT or a loss pinned on a player), the Tribune as one door at the bottom of the results. Before that, section 00000m: v59.1 and v59.2, the home card's ink print brought into the drafts (every pick prints its coin and diamond; the Do-Over's THE PICK IS IN re-inked in riso). Before that, section 00000l: v59, the new home screen (the owner's "Halftone v2" package: tiers of halftone doors, the vote card that votes in place with a riso reward, Draft Night Do-Over). Before that, 00000k: the database audit (0026, 0027 and 0028 are now live on D1 `true82`) and the owner's call to shelve the art bot today and ship the base game by the end of 2026-09-27. Before that: the art bot's third reel (00000h, 2e), v58.5 the white button base (00000i), v58.4 the Daily ledger (00000h, item 3).

Read this file before editing. It summarizes the current architecture, the recent UI work, the exact Small-Ball rule, deployment structure, and validation expectations.

---

## 0000003. START HERE (2026-10-04): V69.2, THE BOARDS MADE HONEST, AND THE LEADERBOARD LAB

### What was asked, and what the answer turned out to be

The owner asked for a lab (a start-screen link, a post-game hook, the board layout, and art directions)
and, separately, to "fix accounts" because "obviously no scoreboard if no accounts". **Accounts were not
broken.** The v69 handoff was right, and this session proved it rather than trusting it. What was broken
was four things about what the boards MEAN, and they were invisible from the outside because every one
of them produces a plausible-looking board.

### The two harnesses, which are the durable part

Neither existed before. Both are committed, both are fast, both are meant to be run on every change.

**`node tools/boards-e2e.js`** (61 checks, about 20 s). Eight different signed-in GMs play 159 real
games across Classic, Presti, Pro and 30 official Dailies, and every score is followed to a board row.
It runs the REAL handlers (`functions/api/{run,lb,me,name,claim}.js`), the REAL migration SQL through
`node:sqlite`, the REAL Clerk verification in `_lib/auth.js` against a throwaway RS256 keypair, and the
REAL engine replay. No server, so it is repeatable; the previous session's wrangler-based check proved
the deployment but could not be committed or re-run.
**The ledger is the oracle:** every expectation is computed from what the SERVER said it accepted, never
from what the harness intended to send. That is what turned "the boards look right" into "the Daily is
contaminating the Classic board", which is a thing no hand-written fixture would have shown.

**`node tools/boards-live.js`** (32 checks). The same story over HTTP against a running Worker, with
tokens it mints itself, because the half the in-process harness cannot cover is the one that bit this
feature twice: the Workers runtime. Start the server first (`.claude/launch.json` -> `site-boards`, port
8793, which carries a throwaway `CLERK_JWT_KEY`); `node tools/boards-live.js --keys` prints the binding.

**The paid-plan question is settled, with a fresh measurement.** An ordinary anonymous Classic season
posted to the real edge (`https://v69-boards.true82.pages.dev/api/run`) on a cold isolate came back
`verified: 1` in 1169 ms wall, matching the client's replay exactly (76-6, net 19.27). Workers Free
affords the engine warm-up. Do not spend the $5 on this reasoning. (That probe left ONE anonymous row in
production D1: `id = 00000000-0000-4000-fed0-0000000000e1`, `sid = sidedgeprobe1`. It is on the cleanup
list below.)

### The four defects, each with its proof

1. **The Today board asked for the wrong day.** `lb.js` defaulted to `utcDay()`; `runs.official` stores
   `T82DAILY.dayKey()`, which is device-local midnight (the Wordle convention). Measured on 2026-10-04:
   local and UTC disagree from 5pm to midnight in Los Angeles and 8pm to midnight in New York. Every US
   player who opened the board in the evening got "Nobody has made this board yet" or, worse, a different
   day's list with their own score absent. **Fixed on the read side** (accounts.js `loadBoard` sends the
   day; `DAY_RE` validation stays server-side) because the stored keys are local by design.
   *The streak board's `current` column still uses `date('now','-1 day')` and has the same assumption; it
   is invisible today because accounts.js renders only `r.score`. Fix it or drop the column.*

2. **The run was submitted before the Heat Check resolved.** `finishRunTail` called `renderResults`
   (which only BUILDS the overlay) and then `gameFinishedPings`, freezing `G.actions`. The refusal op
   "hx" arrives later, from inside the overlay. Both the client's local replay and the server's replay
   then used the same incomplete log, so they AGREED, and the row stored `verified = 1` with the spin
   taken. **Proven numerically:** on Presti seed 7700208 taking the spin gives 82-0 and refusing gives
   80-2, so a declined 81 could be credited as a perfect season. **Fixed:** `G.hhPending` is set in
   `renderResults`, `submitFinishedRun()` holds while it is set, and hotHand's `dismiss()` (the one funnel
   every exit path goes through) clears it and sends. A `pagehide` net covers the player who walks away
   mid-ceremony, and accounts.js's own SUBMITTED guard makes a second call a no-op. Pinned in test.js by
   running the real functions, not by reading the source.

3. **A Daily counted as an ordinary season in its base mode.** `runs` has no column saying which board a
   run was played on, and the mode boards did not exclude `official`. Two consequences, both measured by
   the harness: a GM with zero vanilla Classic seasons on the Classic Best net board, and the 82-0%
   denominator counting Dailies so that playing the Daily lowered your rate. There is a third the audit
   found: `market_crash` (PRICE_MULT 0) is live in the POOL3 rotation and `capCost` floors at $1, so the
   day it runs every five costs $5M and Cheapest 82-0 would read $5M forever, below anything reachable
   under Presti's ordinary $26-a-player ceiling. **Fixed** with `official IS NULL` on rate, net and
   cheapest. **The proper fix is still open:** a `ch_id TEXT` column in a migration 0032, written from the
   server's own `board.ch.id`, because `official` does not catch a non-Daily challenge run.

4. **The board tabs were gold keycaps.** `.lb-tab` is absent from `BTN3D_EXCLUDE` (app.js), so the
   document-wide MutationObserver added `.presti-spin` the moment `openBoards()` appended the sheet, and
   look.css's `#lab-k#lab-k`-boosted rule beat both `.lb-tab` and `.lb-tab.on`. Five identical neon plates
   with no selected state and no accent border. **Fixed with `tm-flat` on the tab class in accounts.js**,
   which is the documented opt-out (`.acct-btn` and `.hm-howto` already use it) and keeps look.css
   untouched. **Never hand-edit look.css: it is generated by the Reprint Lab.**

### The owner's reversal: a signed-out 79-3 now counts

He first chose strict, then corrected himself mid-session: he wants the run a signed-out player just
finished to count when they sign in. Without it the single best moment the game will ever have to earn
an account can only answer "too late, come back tomorrow".

`functions/api/claim.js` gains `adoptRuns()`, and `functions/api/run.js` now stamps `official:
claimedDay` unconditionally (it used to be `userId && claimedDay`, which destroyed the only record of
which Daily an anonymous run belonged to). Three rules make it unfarmable, all in SQL and all pinned in
both test.js and the e2e harness:

- **One account per device, ever.** Only the FIRST account to link a sid adopts anything, so a shared
  phone cannot hand player A's seasons to player B and runs cannot be laundered by signing in and out.
  (`sid_links` already existed for exactly this and was write-only until now.)
- **The EARLIEST attempt at a day, never the best.** Playing the Daily five times signed out and then
  signing in gets you your first attempt, which is what a signed-in player's one attempt a day gets.
- **Nothing unverified, and never over a day the account already holds**, so `UNIQUE (user_id, official)`
  cannot fire and an adopted run can never displace one played signed in.

### THE DAILY'S SEED IS STILL CLIENT-DERIVABLE, and the three launch boards are worse than that

He asked for this and said "only if it is a really easy robust way, not a rat's nest". The honest answer
is: **the mechanism is easy, the integration is not, and it should be its own change.** But first, the
thing he needs to know:

**The three influencer boards are not merely derivable, they are published.** `daily-core.js`
`SEED_OVERRIDES` carries `2026-10-20: 2696998625`, `2026-10-21: 3675641764`, `2026-10-22: 2501072727` in
plaintext in a file every browser downloads. Anyone who opens the source on 10/19 can pre-solve all
three of the boards the influencer films.

**Why it is cheap in principle.** `boardFor()` already separates a board's IDENTITY from its SEED: the
number, mode, challenge, name and badge all come from the day-number rotation, and `seed` is one
isolated field. `SEED_OVERRIDES` already exists as a mechanism, so the crowd-tuned launch boards move
server-side byte-identical. And the game already cannot play offline (it fetches site_data.json), so one
small request costs nothing new.

**The design, ready to build:**
- `functions/_lib/dayseed.js`: the pinned days (moved out of the shipped file) plus
  `HMAC(DAILY_SECRET, "t82seed|" + key)` truncated to a uint32.
- `functions/api/day.js`: `GET /api/day` returns today plus the recent past in ONE response (so the tile,
  the run and the archive are covered by one fetch) and **refuses any key after today**. It must report
  whether it is minting or falling back, so a missing env var is diagnosable rather than silent.
- `daily-core.js`: a `setSeeds(map)` and `boardFor` preferring an injected seed. Days BEFORE a cutover
  keep `seedFor(key)` so the archive and every shared beat-link replay forever.
- `functions/_lib/sim.js` `dailyBoard()`: mint the same seed server-side, so verification matches by
  construction. It becomes async, which run.js can take.
- **It fails safe:** if the client plays a seed the server did not mint, run.js's existing check nulls
  `claimedDay` and the run is `officialRejected` rather than silently ranking on a different board.

**Why not now.** The failure mode is the worst one available (two players on different boards the same
day), test.js pins 120 days of boards and the special days' exact seeds, and the preview is where he
tests launch boards on his phone with `?day=`. Set against that, the realistic damage today is that one
determined programmer tops the Daily board on launch day, with one attempt, on a board that (since this
session) no longer contaminates any other board. **Recommendation: build it as the next change, verify it
alone, and ship it after the debut unless he says otherwise.**

### What is left, in rough order

1. **His decisions.** `docs/leaderboard-lab/SPEC.md` ends with seven, each with a recommendation. The two
   that change code: cut the 82-0 RATE board for an 82-0 CLUB (unlimited winners, no denominator to lie
   with), and add a THIS MONTH board (your ten best Dailies, so a wrecked day is dropped and a player who
   arrives on 10/22 is not walking into a board already won).
2. **Four must-fix items from the audit that this session did not do**, all in SPEC.md with file and
   line: the `you` rank is resolved only among the 82 fetched rows, so rank 83 is told "You're not on
   this board yet" (one extra bound COUNT query fixes it, and the same query is what the around-you
   window and the post-game mini board both need); `SUBMITTED` is keyed on `mode|seed|actions.length` and
   set BEFORE the POST, so a Daily rematch is silently never sent and a network failure loses the run
   forever; the official-once gate lives in shared localStorage so the second account on a browser can
   never post a Daily (this breaks his own seven-email test); and player A's Daily history is claimed by
   player B on the next sign-in and read back to B as "Keeping 23 days of your Dailies".
3. **Clear the test rows before the boards go public.** `created_ts` is the only discriminator today and
   SECURITY.md:32's one-liner is not enough: it leaves every anonymous run, orphans `local_claims` and
   `sid_links`, and would delete the owner's own pre-launch account. The clean moment is right after the
   Clerk production swap, which reissues every user id. Rows this session created: `LiveTest A/B/C` plus
   `GM-*` probe accounts in the LOCAL D1 only, and the ONE anonymous edge probe row in production named
   above. **A `host TEXT` column in migration 0032 would make every future purge exact.**
4. **The Clerk production instance** (unchanged from v69: DNS, up to 48h, different keys, his own Google
   OAuth app, and a TikTok `user.info.email` review with no guaranteed ceiling).
5. **The five "no account" surfaces** (unchanged from v69).
6. `/api/lb` is public and unauthenticated the moment v69-boards merges, independent of `ACCT_LIVE`. The
   flip is a UI gate, not an API gate. Worth knowing before the merge, not a defect.

### Things learned that will recur

- **A harness that computes its expectations from its own intentions tests nothing.** The e2e harness
  only found the Daily contamination once its oracle was rebuilt from what the server said it accepted.
- **A verify pass that refutes nothing is a smell.** 23 of 23 adversarial checks came back confirmed, so
  the two most consequential were re-checked by hand. Both held, but the ratio was the reason to look.
- **In a vm, `window` is not the global.** app.js guards on `window.T82ACC` and then calls the bare
  `T82ACC`; a test that sets only one gets a silent throw into app.js's own try/catch and reads as "the
  code did nothing". Set both.
- **Parallel build agents share the browser pane.** One navigated the tab this session was using. The
  Reprint Lab's README-agents.md already says to create your own tab and pass its id to every call; it is
  still true and still gets forgotten.

## 0000002b. THE SESSION THAT SHIPPED IT (2026-10-03/04): WHAT IS DONE, WHAT IS LEFT, AND FIVE TRAPS

**DONE, do not redo:** Clerk application created (dev instance, email code + Google + TikTok enabled, the owner
added TikTok himself); `CLERK_JWT_KEY` set on Production AND Preview; `AUTHORIZED_PARTIES` set on Production,
UNSET on Preview; migrations **0030 and 0031 applied to production D1**; the owner signed in successfully on his
phone 2026-10-04.

**LEFT, in rough order:**
1. **The Clerk production instance.** DNS CNAMEs for `clerk`, `accounts`, `mail` on true82.net, up to 48h. It has
   DIFFERENT keys from the dev one, so `accounts.js` CONFIG and the Cloudflare PEM both change, and everything is
   re-tested after. Start it well before 10/20. A production instance also needs the owner's OWN Google OAuth app
   (dev rides Clerk's shared credentials) and, for TikTok, a TikTok developer app plus a SEPARATE approval for the
   `user.info.email` scope — that review has no guaranteed ceiling and is the riskiest item against the date.
2. **The five "no account" surfaces** — `index.html:138`, `md/faq.md:19` and `:27`, `md/index.md:26`, plus the
   `faq/` and `how-it-works/` twins. They become false the moment the face appears on true82.net. A gate, not a
   nicety. (`md/faq.md:19`'s "no cookies" is already wrong today — the 400-day `t82_rid` cookie is live.)
3. **Clear the preview's test rows before the boards go public.** SECURITY.md has the command. One of them is a
   deliberate probe row, `id = '00000000-0000-4000-d000-000000000001'`.
4. **Merge `v69-boards`** into the lane when he says so. It is ten commits off `bb2c565` and touches app.js,
   index.html, styles.css, test.js, tools/, functions/ and two migrations.
5. **The Daily's seed is still client-derivable**, so a determined player can pre-solve a future board. Fabricating
   a score is impossible; an early look is not. The fix is a server-minted HMAC seed (`DAILY_SECRET`, designed on
   origin/accounts-test) and was deliberately NOT done two weeks before a debut.

**FIVE TRAPS, each of which cost real time and every one of which will recur:**
- **A Pages env var change does nothing until the next deployment.** Variables are baked in at build time. Change
  the variable, THEN rebuild, THEN test — otherwise a correct fix reads as a failed one. This cost the longest
  detour of the session.
- **`AUTHORIZED_PARTIES` is per-environment.** A preview's token carries its own `pages.dev` azp, so the
  production value refuses every preview sign-in. Unset on Preview.
- **`git branch X` does not check X out.** Two commits landed on the wrong branch and two `git push -q` calls were
  silent no-ops. Never use `-q` on a push, and verify a deploy by what the URL serves, not by what the push said.
- **A benchmark on the owner's Mac is not a benchmark of Cloudflare.** The ~111ms engine warm-up led to a confident,
  wrong "you need the $5/mo plan". Measured against the deployment, verification works as-is.
- **A test harness that shares a gap with the code under test passes for the wrong reason.** The first Daily
  verification check went green because neither side loaded challenges.js. The replacement runs in a child process
  importing only `_lib/sim.js`, and was confirmed to go red when the import is removed.

**The lesson under all five: ask the deployed thing, do not reason about it.** That is why `GET /api/me` answers
`no-key-on-this-environment` / `key-will-not-parse` / `origin-not-in-AUTHORIZED_PARTIES` /
`users-table-missing-run-migration-0030` / `token-rejected` when a token fails, and why `/api/run` reports the
verification verdict even when storage fails. Those two diagnostics ended four rounds of guessing; keep them.

## 0000002. START HERE (2026-10-03, later): V69.1, THE BOARDS (c-code-clean, BUILT BUT DORMANT)

**The five, his words (2026-10-03):** "82-0% on each mode; daily streak; least money to go 82-0 in Presti; best net
rating for classic. And best daily per daily obv." All five are live behind the same `ACCT_LIVE` flip as v69.

**THE SUBMISSION LAW, and why it matters more than the boards do.** `app.js` hands accounts.js what the run DID
(mode, seed, the logged actions) and nothing about what it scored. accounts.js replays it locally for the canonical
draw count; `/api/run` replays it AGAIN server-side through the same `sim-core.js`, and stores only what its own
replay produced. A run whose replay disagrees stores `verified = 0` with the reason and can never appear anywhere.
Measured defences, both pinned in test.js:
- a run claiming 82-0 it did not get -> `verified 0, why "rng-draws"`
- an easy random board posted as today's Daily -> stored, but `officialRejected`, because the day key alone fixes
  the mode, the seed AND the challenge, re-derived server-side from the same daily-core.js the browser runs
- a second attempt at the same day -> `alreadyToday`, not stored (UNIQUE on `(user_id, official)`)

**WHAT HE MUST DO.** Beyond v69's five steps: paste `migrations/0031_runs_boards_v1.sql`. That is all.

**THE WORKERS PAID PLAN IS NOT REQUIRED — an earlier claim here was wrong.** The reasoning was: warming the
engine costs ~111 ms CPU per isolate (JSON.parse 15 ms + initData 96 ms, measured on the owner's Mac), and Workers
Free allows 10 ms CPU a request, so the request that pays the warm-up would be killed. **Measured against the live
preview on 2026-10-03, it is not.** Three real submissions to v69-boards.true82.pages.dev came back with the
server's own replay: an ordinary Classic run verified 74-8 net 14.95 (matching the client exactly), today's real
Daily board verified 78-4 net 19.78, and a claimed 82-0 on that same run was rejected with `why: "rng-draws"`.
Whether that is because the account is already on a paid plan, because Pages Functions account for start-up
differently, or because the ceiling is not what the docs imply, is unknown — but the empirical answer is that
verification works as deployed. Do not spend the $5 on this reasoning alone; if boards ever fill with
`verified = 0` rows whose verdict is `engine`, THAT is the symptom that would justify it.

The general lesson, and it cost two false conclusions in one session: a measurement taken on the owner's Mac is
not a measurement of Cloudflare, and a green local test is not a green deployed test. Check what the URL serves.

**Two design calls worth knowing.**
- *No streak counter.* An incremental counter must assume days arrive in order; a backfill during testing proved it
  drifts (it read 9 where the answer was 10). The streak board is gaps-and-islands over the Daily rows themselves,
  so it cannot drift and does not care what order days were written in. test.js runs that exact SQL against an
  in-memory SQLite with deliberately out-of-order inserts.
- *The 82-0% board needs 10 finished seasons in a mode to qualify* (`MIN_RUNS` in `functions/api/lb.js`, one dial),
  otherwise one lucky first run reads 100%.

**Known, bounded, and his to weigh.** The Daily's seed is derived from the day key by shipped JavaScript, so a
determined player can compute a future day's board and pre-solve it. The fix is a server-minted HMAC seed
(`DAILY_SECRET`, the design is on origin/accounts-test) — deliberately NOT done two weeks before a debut, because
it would change the shipped Daily's character. Fabricating a score is impossible; getting an early look at a board
is not.

**The art bots.** The boards are deliberately plain — his instruction was to invest in functionality because art
bots beautify later. The markup is `.lb-tabs` / `.lb-list` / `.lb-row` / `.lb-rank` / `.lb-name` / `.lb-score`, and
`.lb-you` marks the signed-in player's row. Restyling is CSS only; no JavaScript needs to move.

**Verified end to end** against a local wrangler + D1 with 84 bot-played runs across three GMs: all five boards
populate and rank correctly, the cheapest Presti 82-0 reads $38M, the streak board reads 10/6/3 against raw day
spans of 10/6/3, and both cheat attempts were rejected. 286 checks pass.

## 0000001. START HERE (2026-10-03): V69, THE ACCOUNT (c-code-clean, BUILT BUT DORMANT)

**What shipped.** Sign in, set a display name, and the account takes custody of this browser's Daily record. That is
the whole feature. `migrations/0030_accounts_min_v1.sql` (three tables: `users`, `sid_links`, `local_claims`),
`functions/_lib/{auth,names,acct}.js`, `functions/api/{me,name,claim}.js`, `accounts.js`, the account face in the
44px slot v65 reserved, `SECURITY.md`, a `.gitignore`, and 19 new checks in `test.js` (277 pass).

**THE LIVE FLIP IS ONE LINE.** `ACCT_LIVE` at the top of `accounts.js`. While it is `false` the button renders only
on localhost or on any URL carrying `?acct=1` — so he can try it on his phone, on the real site, without launching
it for anyone else. Deliberately NOT done through index.html's `#t82-live-hide` block: a CSS hide still downloads
Clerk, and it cannot tell localhost from production. That block is untouched; every gameplay surface it hides stays
hidden.

**WHAT HE MUST DO BEFORE IT SIGNS ANYONE IN (five steps, all dashboard work).**
1. Clerk dashboard -> create or reuse an application. Enable **email code** and **Google** only.
2. API keys -> paste the Publishable Key and Frontend API URL into `CONFIG` at the top of `accounts.js`.
3. Same page -> *Show JWT public key -> PEM* -> that is `CLERK_JWT_KEY` in Cloudflare Pages, on **Production AND
   Preview** (the split-env trap). **`AUTHORIZED_PARTIES` is NOT the same on both:** `https://true82.net` on
   Production, and **unset on Preview**. It is the azp allow-list, and a preview's tokens carry their own azp
   (`https://<branch>.true82.pages.dev`), which the production value does not contain — so every preview sign-in
   is correctly refused and lands on the account sheet's "Almost there" panel. auth.js skips the check entirely
   when the variable is unset, which is the right posture for a test environment. (Found the hard way on
   2026-10-03: this step used to say to set it on both, and that is exactly what broke the owner's first preview
   sign-in. `GET /api/me` with a token now answers it directly: `why: "origin-not-in-AUTHORIZED_PARTIES"`, with
   `authorizedParties` and `thisOrigin` beside it.)
   **AND A CHANGE TO ANY OF THESE NEEDS A REDEPLOY.** Cloudflare Pages bakes environment variables into a
   deployment when it is built; editing one in the dashboard does nothing to deployments that already exist, only
   to the next one. So the sequence is always: change the variable, THEN push (or hit Retry deployment), THEN
   test. Confirmed on 2026-10-03/04: the owner deleted AUTHORIZED_PARTIES on Preview and `/api/me` kept reporting
   the old value verbatim until a rebuild, which reads as "the fix did not work" when the fix was fine.
4. Clerk -> allowed origins -> add `http://127.0.0.1:8792` for local work.
5. Paste `migrations/0030_accounts_min_v1.sql` into the D1 console for `true82`. Purely additive.
A Clerk **production** instance is NOT needed yet, and is not free of friction when it is: it wants CNAMEs for
`clerk`, `accounts` and `mail` on true82.net, up to 48h to propagate, plus his own Google OAuth app (development
instances ride Clerk's shared Google credentials, which is why Google costs nothing to build against today).

**BEFORE THE BUTTON CAN GO LIVE — this is a gate, not a nicety.** Five public surfaces promise there is no account:
`index.html:138`, `md/faq.md:19` and `:27`, `md/index.md:26`, and the `faq/` and `how-it-works/` twins. They are
true today and become false the moment the face appears on true82.net. (`md/faq.md:19`'s "no cookies" is **already**
wrong — the 400-day `t82_rid` retention cookie has been live since v40r2.)

**THE LANDMINE, now covered by a test.** `app.js:3748` and `app.js:3766` call `T82ACC.fetchDaily()` and
`fetchWeekly()` with NO try/catch. Defining `T82ACC` without them throws mid-`renderIntro()` and **the home screen
never draws** — it would look like the whole site broke, not like accounts broke. `accounts.js` ends with three
benign stubs for exactly this, and `test.js` now fails if either the call sites or the stubs change.

**Three decisions worth knowing.**
- *The claim is one row, not 400.* `t82_daily1` holds up to 400 days. D1's free plan allows 100,000 row writes a day
  and **since 2026-09-01 Cloudflare fails queries past it** — a row per day would let ~250 sign-ups spend the whole
  site's budget and take the Tribune and analytics down with them. Measured: a four-day history costs 5 rows total.
- *The claim links `t82:sid` and nothing else.* Not the retention cookie `t82_rid`, not the traits voter hash.
  Joining either would turn the pseudonymous analytics stream into an identified one, against his v43 decision.
- *Previews sign in but create nothing.* `_lib/acct.js` honours `_middleware.js`'s mockDb flag: on any host that is
  not true82.net or localhost, the Clerk token is verified for real and answered with a synthetic stable tag, so the
  whole signed-in UI is exercisable on a preview while D1 stays clean. Verified: a preview sign-in wrote 0 rows.
  (`auth.js` itself does NOT know about this — it is byte-identical to the branch, and the rule lives one layer up.)

**The email.** He asked the sheet to confirm which address he signed in with. It reads that from the live Clerk
session in the browser; it is never posted to `/api/*` and there is no column for it in any migration. Clerk stays
the identity of record, so a D1 breach is not an email breach (SECURITY.md).

**Verified end to end** against a local `wrangler pages dev` + D1 (`.claude/launch.json` -> `site-api4`), with a
throwaway RSA keypair standing in for Clerk: first sign-in mints a tag, a claim of 3 days lands, re-claiming the
same payload adds 0, a second device adds its day and a WORSE repeat of a day does not overwrite the better one,
a filthy display name falls back to `GM-<tag>`, a second Clerk id gets its own row, and a preview host writes
nothing. The game itself plays unchanged with `accounts.js` in the chain (zero console errors).

**Still open.** His v66 traffic question (section 000000) is still unanswered; the D1 write-budget finding above is
the first hard data point for it. And there is no CSP yet — `SECURITY.md` §5 has the recipe, which needs the Clerk
Frontend API host, so it belongs with the production instance.

## 0000000. START HERE (2026-10-03): V68.2, V68.1 AND V68 ON V67.2, THE ART LIBRARY WITH HIS PICKS (c-code-clean + art-variety, NOT LIVE)

### 2026-10-03: v68.2, "about 25%" (c-code-clean, NOT LIVE)

**His decision (2026-10-03),** on v68.1's first open item: under "move from the real 81" a lucky Presti 81-1 became
82-0 on about 45% of post-season spins. He wants ABOUT 25% (asked "somewhere between", then picked 25% over 15, 20 and
33). Keep everything else of v68.1. Separately and NOT now: the 0.97 nightly cap (v68.1's open item 2; its own
balance check later). COLD costing wins on the print stays unmarked (fine as is).

**Where:** `c-code-clean` and `art-variety`, one commit on v68.1 (BUILD_V `v68.2`; app.js and sim-core.js at key
`20261003-v68-3`; engine VERSION 17; the preview is https://c-code-clean.true82.pages.dev/). Not live; `main` is v66.5
until he says merge.

**The rule in plain words.** Only how a PLAYED 81 moves changed (sim-core.js `hhRecord`, which app.js's hotHand and the
verifier's finish() both run):
- The spin is judged by its change in **expected** wins, fractions and all: `82 x (phi(newNet / 12) - phi(net / 12))`.
  (v68.1 counted whole wins of the projected record, so a +0.4 that happened to cross a projection step, 78 to 79,
  counted a full win and saved the 81.)
- The played record moves by `floor(gain - HH_SAVE_GAIN) + 1` whole wins, under the same direction rule: HOT, ON FIRE
  and SUPERNOVA only raise it (a gain of 0.64 expected wins or more saves the 81: 82-0), WARM never moves it, COLD only
  lowers it (a loss of more than 0.36 expected wins costs one: 80-2). That is the 81 plus the expected change, rounded
  with its line at 0.64 instead of 0.5. I DON'T WANT YOUR CHARITY still applies nothing.
- A board that does not play its season out (the Daily, a challenge) keeps v68.1's whole-win rule, untouched, so its
  honest 81 keeps its ~9%. `hhRecord(played, net, newNet, m, playedOut)`: app.js passes `!!e.season`, finish()
  `!!season`.
- The mid-season Heat Check, the ladder (0.9/1.0/1.1/1.2/1.3), the odds and HH_BONUS_SCALE are untouched.

**Measured (2026-10-03)**, the way v68.1's numbers were: bot Presti drafts on the real data (tools/daily-audit.js
makeBot, seeds 770000 + 29i), every five at or under +20 net (the only ones that reach the post-season Heat Check),
each weighted by its odds of playing exactly 81-1 (`82 p^81 (1 - p)`, `p = min(0.97, phi(net/12))`), each hot player
by the reel's weight (`max(0.5, v)^2`), each rung by its odds.

| | save (82-0) | stays 81-1 | lowered (COLD) |
|---|---|---|---|
| Lucky played 81, v68.1 (20,000 drafts, 16,671 fives, effective sample 4,160) | 45.6% | 52.3% | 2.0% |
| **Lucky played 81, v68.2 (same fives)** | **24.9%** | **72.4%** | **2.8%** |
| v68.2 scored with labels.json (20,000 drafts) | 24.7% | 72.6% | 2.7% |
| v68.2 through the verifier's own finish() (4,000 other fives x 1,000 seasons: 32,998 real post-season checks) | 24.5% | 72.9% | 2.7% |
| The Daily's honest 81 (unchanged code path): v68.1's own sample, 587 fives projecting 81 | 9.0% | | |
| The Daily's honest 81: the 558 fives projecting 81 in the sample above | 10.3% | | |
| Mid-season Heat Check (unchanged): HOT-or-better boosts ending 82-0 (20,191 boosts); a boosted played 81-1 | 22.3%; 96.8% | | never worse than played |

By rung on a lucky 81 (v68.1 to v68.2): HOT saves 39.8% to 1.9%, ON FIRE 69.4% to 49.7%, SUPERNOVA 86.4% to 84.3%;
COLD lowers 34% of its spins to 46%. By projection v68.2 saves 39% of 74s down to 20% of 79s (v68.1: 59% down to 46% of
78s, but only 6% of 79s, the step artifact): the steps no longer decide it.

**How to retune: one constant,** `HH_SAVE_GAIN` in sim-core.js (bump `T82.VERSION` with it, then stamp the key). Higher
= fewer saves and a slightly harsher COLD (it costs a win past 1 - HH_SAVE_GAIN):

| HH_SAVE_GAIN | 0.5 | 0.6 | 0.63 | **0.64** | 0.65 | 0.7 | 0.8 | 1.0 |
|---|---|---|---|---|---|---|---|---|
| saves a lucky 81-1 | 36% | 28% | 25.5% | **24.9%** | 24% | 21% | 16% | 8% |
| COLD lowers it (of all spins) | 1.0% | 2.2% | 2.6% | **2.8%** | 2.9% | 3.9% | 5.5% | 6% |

To re-measure after a retune: test.js's rate check prints the save, stay and lower rates on its fixed 1,000-draft
sample with exactly these weights (it is the measurement, smaller); docs/MODES.md has the method and the full table.
The 20,000-draft numbers came from the same weights over more seeds; the finish() cross-check played 1,000 seasons
per five through `T82.finish` with a fresh rng each (S.simSeason on), counting every post-season Heat Check.

**Tests (test.js):** the record-rule sweep now runs both rules over 223,479 spins (HOT and up never lower, WARM never
moves, COLD never raises, under either; the played-out move is exactly `floor(g - HH_SAVE_GAIN) + 1`; the save is
exactly `g >= HH_SAVE_GAIN`; COLD costs a win exactly past `1 - HH_SAVE_GAIN`; monotonic: a bigger rung or a bigger
spin never moves the record the wrong way; the projection's rule is v68.1's, unchanged); the constant is 0.64 and
documented here and in MODES.md; the lucky cases (from +19.7 HOT +0.4: v68.1 saved, v68.2 keeps 81-1; ON FIRE on a
value-7 hot player saves; COLD on a value-8 one costs a win); the game and the verifier still agree on all 2,800 real
Presti runs and the 75 forced skips; **the rate**: on 1,000 seeded bot drafts (835 fives that can reach the check) a
lucky 81-1 is saved on 25.0% of spins, held to 22-28% (v68.1's rule: 46.4% of the same spins).

**Checked (2026-10-03):** stamp 20261003-v68-3; `node test.js` 258 passed, 0 failed; style law clean; cache keys clean.
Real browser (local static server; Chromium 375x812, WebKit 320x568 for three of them), real Presti runs (bot drafts,
labels on) driven through confirmPick, the reel and the lever, no page errors, the verifier's replay and verifyRun
agree (record and draws) on every one:
- seed 9300652, +19.43 (projects 78), played 81-1, HOT on C. Paul +0.57 (projection 78 to 79, 0.40 expected wins):
  v68.1 would print 82-0; v68.2 stamp 81-1, record 81-1, share "81-1", print 81; verifier 81, 833 draws.
- seed 9301835, +19.71, HOT +0.52 (78 to 79, 0.35): 81-1 everywhere (v68.1: 82-0); verifier 81, 833.
- seed 9335120, +15.81 (projects 75), SUPERNOVA on R. Parish +0.60 (the projection does not move; 0.66 expected
  wins): v68.1 would keep 81-1; v68.2 82-0, share "82-0", print 82 (saved game 53); verifier 82, 906 draws.
- seed 9351521, +17.16, COLD on J. Butler -0.37 (0.37 expected wins lost, the projection does not move): 80-2 on
  the stamp, record, share and print (v68.1: 81-1); verifier 80, 950.
- seed 9303669, ON FIRE +0.57 (0.44): 81-1 everywhere; verifier 81, 954.

**Checked again, independently (2026-10-03, a second session, its own seeds):** 20,000 drafts (seeds 5150000 + 41i)
against HEAD's v68.1 sim-core.js loaded side by side and a restatement of the rule written without hhRecord (0
disagreements): save 24.9%, stay 72.3%, lowered 2.8% with labels (v68.1: 45.9%, 2.0%). Through finish() itself, 6,000
fives x 1,000 re-seeded seasons (5.3M seasons) against v68.1's finish(): 46,995 post-season Heat Checks saved 24.7%,
stayed 72.4%, lowered 2.8% (v68.1: 45.5%, 2.1%); every refused check stayed 81; the 1,024,675 mid-season checks and
every other season were identical to v68.1, draws included. The Daily (400 day keys x 40 seeds, played and refused):
identical to v68.1; its honest 81 saves 9.1%. The test's 22-28% band: 30 other 1,000-draft samples, mean 24.95%, SD
0.51, range 24.0 to 25.9. Browser (Chromium 375x812, real taps through the draft, reel, lever, SEE YOUR TEAM and SHARE
YOUR TEAM), five runs on its own seeds: HOT +0.56 expected (v68.1: 82-0) and HOT +0.27 stay 81-1; COLD -0.39 80-2; COLD
-0.34 81-1; ON FIRE +0.81 82-0. Stamp, record, net, ledger, print, Tribune payload and share text matched the node
prediction; replay and verifyRun agreed; no page errors.

**For him (open, his call):**
1. **HOT almost never saves a lucky 81 now** (1.9% of HOT spins, was 39.8%): a HOT is +0.1 of one player's value, about
   0.3 expected wins on most fives, so the saves come from ON FIRE (about half) and SUPERNOVA (84%). This is what "judge
   it in expected wins" does at 25%; if he wants HOT to save more, the knob cannot give it without raising every rung.
2. **COLD bites a little more often:** 46% of COLD spins on a lucky 81 cost a win (2.8% of all spins), was 34% (2.0%),
   because the one constant is a rounding line (a COLD costs a win past 0.36 expected wins). The other one-constant
   shape (a win moves only when the change reaches 0.64 EITHER way) also lands 24.9% saves, but COLD would cost a win on
   only 4% of COLD spins (0.2% of all), and refusing the spin would protect almost nothing. Say the word to switch.
3. A weaker lucky five still saves more often than a stronger one (39% at a 74 projection, 22% at 78, 20% at 79), but
   the cliff at 79 (v68.1: 6%) is gone.
4. The 0.97 nightly ceiling (v68.1's item 2) is untouched, as he asked; the rates above are measured with it in place
   (it binds only above +22.6 net, so it does not touch the post-season population).
5. v68.1's items 3 to 7 below still stand (item 1 is this section).


### 2026-10-02 (night): v68.1, his three decisions on v68's list (c-code-clean, NOT LIVE)

**His decisions (2026-10-02),** after hearing that under v68 a HOT spin could lower a lucky 81-1:
1. "Move from the real 81": the spin moves the record from the 81 actually played, by the spin's projected change.
   HOT, ON FIRE and SUPERNOVA can only raise it, WARM never moves it, COLD can only lower it; the 82-0 save happens
   when the raised record reaches 82. The same wherever a Heat Check sets a record.
2. "Shorter season too": the season's whole reel 10% shorter (REEL_END_MS 16800 to 15120), on top of the 0.85 pauses.
3. Copy law: the new Hot Hand ledger rows' em-dash becomes the site's middle dot.

**Where:** `c-code-clean` and `art-variety`, one commit on v68 (BUILD_V `v68.1`; key `20261002-v68-2` on app.js,
`20261002-v68-1` on sim-core.js; engine VERSION 16; the preview is https://c-code-clean.true82.pages.dev/). Not live;
`main` is v66.5 until he says merge.

**What v68.1 is:**
1. **The record rule, one function.** sim-core.js `hhRecord(played, net, newNet, m)`: the projected change is
   `hhWins(newNet) - hhWins(net)` (whole wins of the projected record); HOT and up: `min(82, played + max(0, change))`;
   WARM: played; COLD: `played + min(0, change)`; save = the result reaching 82. app.js `hotHand` takes its record from
   it (`hhRec`; the climbing bar follows it too, `recAt`), so the stamp, `.big`, the print, the comp line, the GOAT
   Climb, the ledger, the share text and the Daily's official record (all read `G.hotWins`) follow. The net still moves
   by the formula (the net label's second number), even when the record does not. On a board that never plays its
   season out (the Daily, a challenge) the record IS the projection, so nothing changes there for a spin that raises
   the net. A browser run caught a trap: verdict() declares its own `var rec` (the record's element), which shadowed
   a first draft's `rec`; the name is `hhRec` and test.js checks it is declared once in hotHand.
2. **The verifier, level with the game.** sim-core `finish()` used to realize only Classic, so it judged every
   standalone Presti run (realized since 2026-07-26) on the projection: another record, 82 fewer draws, and never the
   mid-season Heat Check. Now an armed Presti season (op `ss`) plays out; the mid-season Heat Check runs where the game
   runs it (`hhMidAt`: Presti, armed, net over `HH_MID_NET` 20, a realized loss; its two draws right after the
   season's 82; `hx` refuses it); the post-season one fires at exactly 81 PLAYED and uses `hhRecord`; `res.rngDraws`
   now counts the Heat Check's draws. app.js's mid gate reads `T82.HH_MID_NET`, and "HOT or better" is `seg.m > 1`
   in both (the old index constant HH_MID_MIN_SEG is gone). Nothing on the server calls verifyRun today.
3. **The mid-season Heat Check can no longer leave him worse off.** It re-rolled the saved game and the rest with
   `Math.random` at the boosted rate, so about 15% of HOT-or-better boosts ended with MORE losses than the season
   played, and no replay could follow it. `hhMidReroll` reuses each night's own draw (`simSeason` now keeps them as
   `season.u`, no new draws): a night is a win when its draw is under the boosted rate (never below the rate it
   played), so every played win stays a win; the saved game's draw is stretched back over [0, 1), so it is saved at
   the full boosted rate as before. Each re-rolled night wins at exactly the boosted rate: the odds are unchanged
   (82-0 on about 22% of boosts either way); only "worse than played" is gone.
4. **The season 10% shorter.** app.js `REEL_END_MS = 15120`. Every record's pace is exactly 0.9 of v68's (none hits
   the 0.3 clamp): an 82-0 ends at 15.12 s, a 78-4 at about 14.45 s (v68 16.06 s), a 0-82 at 14.43 s. The red flash
   keeps its own gap (FLASH_GAP 0.77 s, reel-riso.js untouched); test.js walks each sample season's real clock with
   the reel's flash gate: never more than 2 flashes in any second, and a 78-82-win season still flashes on every
   heavy loss.
5. **Copy:** both Heat Checks' ledger rows read "HOT · J. Kidd caught fire ..." / "COLD · ... went cold".
6. **Docs/tests:** docs/MODES.md's Hot Hand part has the rule in plain words, who reaches which Heat Check, the save
   rates, and a new mid-season section. test.js: the "move from the real 81" block (223,479 swept spins: HOT and up
   never lower, WARM never moves, COLD never raises, the move is exactly the projected change, the save is exactly
   the raised record reaching 82, the lucky 81-1 at +19.0, the honest 81 unchanged, the mid-season never worse with
   the odds as before) and the agreement check: on 2,800 real Presti runs (700 bot drafts, played out and
   projection-only, spun and refused) the game's own functions and `T82.replay` reach the same record with the same
   draws. The pacing tests carry 15.12 s.

7. **The verifier's findings, fixed before the commit** (each older than v68.1, each breaking its rule or its
   "every surface and the verifier agree"):
   - **SKIP after the pull** used to only close the card: verdict() never ran, so the page kept 81-1 while the replay
     applied the spin (a landed COLD dodged, a HOT save thrown away). hotHand now has `applyOutcome()` (once-only: the
     totals, the results, the Daily's official record, the Tribune's payload); the reveal runs it, and SKIP after the
     pull runs it, then closes the card (and fires the W/L burst on a save, as SEE YOUR TEAM does). SKIP before the
     pull still refuses (op `hx`).
   - **SHARE YOUR TEAM** built a fresh `engine()` and shared its projection whenever the Heat Check left the totals
     alone (WARM, refused, never offered): a played 81-1 that projects 75 shared "75-7". renderResults now keeps its e
     (`G.resE`) and the share, the Tribune's share and openTribune's fallback read it (`resultsEngine()`).
   - **The share poster's NET**: `resultsPrintRecord` returned early when the record did not move, so a spin that moved
     only the net (now the usual lucky-81 outcome) left the poster's foot on the pre-spin net. It re-specs and re-bakes
     when the net moves too (the on-page print, which has no net, is not replayed then).
   - **Found while checking them: a COLD that costs a win printed 81-1.** The print counts its games for the strip and
     the record it prints, and `resultsPrintSpec` only ever flipped losses to wins (the save). A COLD that lowers the
     record now costs the season's last wins (the save's mirror): the 80-2 prints 80-2 with the second loss at the end.
     Older than v68.1 (v68's COLD dropped records far lower and printed the 81 too).
   - test.js: a page stub just big enough for the Heat Check's card runs the real `hotHand` on the real 81s of the
     agreement check's drafts: pulled then skipped, and skipped before the pull (6 runs: the replay agrees, record and
     draws), then every rung on every hot player of the same 81s (75 skips: the page lands on hhRecord's record, 8
     COLDs lowered it, 31 moved only the net, 21 saved), each checking the share line and the poster spec (wins, the
     games it prints from, the NET). And the share check on 2,704 runs the Heat Check left alone (1,105 of them played
     to a record their projection does not give). Each check fails with its fix taken out (tried on a copy).

**Checked (2026-10-02 night):** stamp 20261002-v68-1; `node test.js` 248 passed, 0 failed; style law clean. In a real
browser (Chromium 375x812), the same real Presti run, seed 4100357 (Lopez, Brandon, Durant, English, Duncan: net
+19.28, projects 78-4, played 81-1, the post-season wheel lands HOT on T. Brandon, "+0.3"), driven through the game's
own confirmPick, reel and lever:
- v68 (the c-code-clean preview): stamp 78-4, record 78-4, share "78-4"; its verifier: 78 wins, 859 draws against the
  game's 943.
- v68.1 (local): stamp 81-1, record 81-1, share "81-1", ledger "HOT · T. Brandon caught fire (value ×1.1). +0.3";
  verifier 81 wins, 943 draws. The reel to its finale: 16.24 s against 17.76 s (same season, same measure).
- WebKit 320x568, seed 4112563 (+19.78, projects 78, played 81-1, HOT +0.36 lifts the projection to 79): 82-0, the
  save; verifier 82, win 1, same draws. Chromium, seed 5201105 (+23.5, played 81-1, the mid-season pause at 43-0,
  HOT on D. Rivers): the reel ends 82-0; verifier 82, mid 44, same 826 draws. No page errors.

**Checked again after the verifier's findings (2026-10-02 night):** app.js re-stamped `20261002-v68-2`; `node test.js`
254 passed, 0 failed; style law and cache keys clean. Real browser, the verifier's own real runs (local static server,
Chromium 375x812 and WebKit 320x568, the same in both, no page errors):
- seed 7588925, the wheel locks on COLD (projection 76 to 75), SKIP at the lock: 80-2 (record, print, share, recap),
  the print prints 80-2; the replay 80 wins, 820 draws, same as the game (v68.1 before this fix kept 81-1).
- seed 7404091, HOT 73 to 74, SKIP at the lock or 2.5 s into the strip: 82-0, the share 82-0; replay 82, 850 draws.
  Refused instead: 81-1 everywhere, share "81-1" (it said "73-9"); replay 81, declined.
- seed 7489839, WARM on a lucky 81-1 that projects 75: share "81-1" (it said "75-7"). Seed 9100000, played 74-8,
  projects 78, no Heat Check: share "74-8" (it said "78-4").
- seed 7434355, SUPERNOVA, stays 81-1: the poster's foot reads NET +19.5 (it read +18.6), the ledger +19.5. Seed
  7698541, COLD with no win lost: NET +16.9 on both (it read +17.2).

**For him (open, his call):**
1. **The save rate on lucky 81s.** On a standalone Presti run every post-season Heat Check is a lucky 81: a five
   above +20 (a projection of 79 and up) that loses a game gets the mid-season Heat Check instead. On those spins
   (bot fives on the real data, weighted by their 81-1 odds) v68 lowered the record 86% of the time and never saved;
   v68.1 saves 45%, leaves 81-1 53%, lowers 2% (COLD). The weaker the five, the easier the save, because the
   projection's win steps are narrower lower down (projecting 75: 55%; 78: 45%; 79: 6%). An honest 81 (the Daily)
   saves as in v68, about 9%. If 45% is too generous: HH_BONUS_SCALE, or measure the change in expected wins instead
   of whole projected wins (about 8.5% on the same fives; that one would need its own rule for the Daily).
2. **The 0.97 nightly ceiling.** app.js sets `SC.PG_CAP` to 1 for Presti (his 2026-07-26 "uncapped" ruling) and 0.991
   for Classic, but `simSeason` reads `C(S, "PG_CAP", 0.97)` and `C` returns that default before SC, so every played
   season is capped at 0.97 a night (82-0 at most 8.2%; a five over the 82-0 line goes 81-1 about 21%). Older than
   v68; untouched (it moves the 82-0 rate, and game and verifier agree as is).
3. HOT on a hot player valued below zero lowers the net a little (shown as a cost) but never the record; COLD on one
   raises the net a little but never the record. Rare (weight 0.25 against v-squared).
4. A played 81-1 that gets a HOT-or-better mid-season boost now goes 82-0 about 97% of the time (46% before), and a
   worse played season keeps its wins; per boost the odds are the same as before.
5. On a test build `?force82=81` can hand a five over the 82-0 line the post-season Heat Check (real play never does);
   its projection cannot rise, so no spin saves it there. `?force82=save` still forces the save; `?force82=cold` now
   moves the forced 81 by COLD's projected change (often 0), not to the five's projection.
6. The art looks fit their moments (E.dur), so at 0.9 pace each moment is 10% shorter; v68's finish-time table and the
   tempo dial's exits were not re-measured look by look.
7. Older em-dashes outside the Hot Hand are untouched (the Tribune byline, the move hint, the load error, the stat
   placeholder, a Kaman line).

### 2026-10-02 (evening): v68, his answers and the Hot Hand scaling (c-code-clean + art-variety, NOT LIVE)

**His words (2026-10-02):** "shorten pause; add check; cold; g2g; g2g. make sure the hot hand bonus scaling is
incorporated and all my other changes are approved. i like all the other animations i haven't mentioned yet. make sure
they coded so that they are easily removable (by a relatively dumb model) if i want to fully remove one of the
animations or art, without breaking anything. commit the hot hand scaling. do all that then lmk if any
outstanding/ambiguous stuff remains BEFORE you push to main. then push to main."

Decoded against the questions below (v67.2's list): 1 "shorten pause" = the standard finish time is shorter holds for
every heavy loss; 2 "add check" = iPhones get a measured slow-link check; 5 "cold" = Combo must not print COMBO on COLD;
3 and 4 "g2g" = the wave, the dagger set's glint and drip (and marbling's later outline) stay exactly as they are; 7
(tally) and every look he did not mention: approved as they are.

**Where:** `c-code-clean` and `art-variety` (one commit on v67.2, "v68: ..."; the preview is
https://c-code-clean.true82.pages.dev/). **`main` is untouched (v66.5 live) until he has read the list below and says
merge.** His merge command is in this file's opening banners.

**What v68 is:**
1. **The Hot Hand scaling (from his other session, ported as written; its patch was the uncommitted work in the main
   folder).** sim-core.js `HH_SEGMENTS`: COLD 0.9, WARM 1.0, HOT 1.1, ON FIRE 1.2, SUPERNOVA 1.3 (odds unchanged:
   6/14/42/23/15); `finish()` lets the spin's number stand both ways (it used to clamp to "improve only"); VERSION 15.
   app.js `hotHand`: "did the spin move anything" is `seg.m !== 1` (hhMoved), never `segIdx > 0`; COLD prints on a
   plain card (no flame) as a cost in the bad tone (`.net-cost`, `.cold-cost` in styles.css), a ledger row "Hot Hand
   cost ... went cold", the total line "minus Hot Hand"; the GOAT Climb re-plots either way. One fix beyond the patch:
   the sign and colour follow the actual change (hhDown), since a hot player valued below zero gains a little from x0.9.
   QA lever `?force82=cold` (test builds only). docs/MODES.md has the table; test.js has the "hot hand ladder" block.
2. **Shorter pauses.** reel-riso.js `HOLD_SCALE = 0.85` (one number, commented): every heavy loss (1 to 14) holds 0.85
   of its old pause (`holdToday` keeps the old ones; app.js still paces the season with them, so the ticks and month
   leads run exactly as before and the season simply ends earlier by the time saved). 1.45 / 0.89 / 0.60 s at pace 1
   (were 1.70 / 1.05 / 0.70); the light losses past the 14th keep 240 ms. To change it: that number, stamp, test.js.
3. **The iPhone check** (art-core.js, `PROBE_MS = 1500`). With no `navigator.connection` (every iPhone browser) the run's
   first dealt art file is timed; the run's other files wait for it (never past 1.5 s). Slow or failed: the run goes
   lean (nothing more downloads, every look not yet in plays its built-in, held looks keep their place in the bag) and
   the tab remembers (sessionStorage `t82-art-slow`), so its next draft downloads only a probe; a fast probe clears it.
   app.js calls `T82ART.newRun()` before each deal. `?art=`, the lab and the harness are never gated.
4. **Combo at COLD** (art/hot/arcade.js): the word follows `ev.m`: over x1.0 COMBO (MAX COMBO on the nova), at x1.0
   "- EVEN -" (WARM: white, flat, no fire), under x1.0 BRICKED (COLD: loss pink, a thud, falling bits). 14,315 of
   14,336 bytes: a future edit to this pack must trim something.
5. **Removing a look:** `node tools/art-remove.js <kind>/<id> [...]` deletes the file and every line naming it
   (art/tempo.json, art/enabled.json, art/ledger.json), regenerates the index, bumps BUILD_V by .1, stamps a key, runs
   --check and test.js, and prints the exact files and git command; all or nothing (any failure puts every file back).
   It refuses the built-ins (switch those off in art/enabled.json instead). art/README.md opens with it. test.js no
   longer depends on any particular look's file and checks that no code names one.

**Checked (2026-10-02 evening, w2 worktree):** art-index current; stamp 20261002-v68; `node test.js` 234 passed, 0
failed; style law clean. In the game (static server, same seeded season on v68 and on a copy with HOLD_SCALE 1):
- Chromium 375x812, an 80-2: first loss held 1.99 s -> 1.69 s, second 1.23 -> 1.04 s; the finale at 17.02 s -> 16.56 s
  (the 16.8 s target plus about 0.2 s of timer drift). A 2-80: holds 0.57 -> 0.49, 0.45 -> 0.38 (losses 2 to 6),
  0.30 -> 0.25 (7 to 14); finale 17.01 -> 16.25 s. WebKit 320x568, the same seasons: 17.17 -> 16.70 s and
  17.19 -> 16.42 s, identical holds. No console errors beyond the static server's /api 404/501.
- Presti with `?clutch=1` through the Heat Check; `?force82=cold&art=hot:arcade` (Chromium 375 and WebKit 320): the
  COLD beat printed "x0.9 BRICKED"; net label "+19.0 − 0.4" in the bad tone, card "− 0.44", no flame, ledger "Hot Hand
  cost ... went cold (value x0.9) −0.4". WARM (wheel pinned to WARM in the test): "x1.0 - EVEN -", record and net
  unchanged, no ledger row.
- iPhone check (WebKit, which has no navigator.connection; art/ answering 2 s late): one request (the probe), verdict
  slow, flag set, the season played on built-ins; next draft: one probe only; routes made fast: that draft's probe came
  back fast, the flag cleared and the reel-open stage loaded (10 files); the draft after loaded everything.
- Removal drill (a copy): `art-remove loss/crumple dots/dagger scene/wave hot/arcade`: test.js 234/0, the lab opens all
  six tabs without them, its picks code drops them, a Classic season with bags still naming them plays clean.

**Outstanding for him before `main` (the list he asked for; v68.1 above answers 1, 5 and 7's Hot Hand rows):**
1. **A HOT spin can lower an 81-1 (the game's record follows the net formula, not the season it played).** Presti plays
   the season game by game, so many 81-1s are lucky (the five's net projects 78 to 80 wins). The Heat Check then sets
   the record from the spun net (`hhWins(newNet)`), so any rung that moves the net, HOT and up included, can drop it:
   seen on a test build, an 81-1 five at net +19.0 went HOT "+0.4, caught fire" and ended 78-4 under GAME OVER. This
   was already true live with the old ladder; the new ladder's smaller bonuses make it common (estimate, Presti nets
   +15 to +27: about 41% of HOT and 26% of SUPERNOVA spins on an 81-1 lower it, against 23% and 2% before). The same
   root, rarer (a five already over the 82-0 line, net +27.0, that lost a game): WARM plays the 82-0 save celebration
   but stamps 81-1, and COLD can still reach 82-0 under "Hot Hand cost". A likely fix (his call: it moves the save
   rate): move the record from the 81 it played by the spin's projected change, so only COLD can lower it and WARM
   never moves it.
2. The other session's balance figures (COLD drops about 26% of 81s; 82-0 on 8.0% of 81-1 spins, was 43.6%) came from
   bot runs on the engine's projection and were not re-measured; in the game's played-out seasons they differ (item 1).
3. WARM is now a no-op (no flame, no bonus); live it gave +20%. Only HOT and up show fire.
4. COLD on a hot player valued below zero raises the net a little; it shows honestly as a small "+" with "went cold".
5. The shorter pauses save about 0.5 to 0.8 s of a 16.8 s season. If he wants seasons noticeably faster: HOLD_SCALE
   lower, or REEL_END_MS (app.js, the whole season's length).
6. iPhone check limits: the first fast draft after a slow one still plays built-ins for the looks its draft stage had
   held (dots, scene and 3 losses; they play the next draft); a file from the phone's cache reads as fast; a probe that
   fails (a 404) marks the tab slow; at 1.5 s an iPhone on ordinary 3G still gets art (Chrome's own rule cuts all 3g).
7. Copy law: the Hot Hand rows on the Scoring Card (an em-dash between "COLD" and "J. Kidd went cold") and a few older
   strings (the Tribune's "TRIBUNE WIRE" byline, the move hint, the load error) still carry em-dashes. Older than v68.
8. art/ledger.json (the critics' tiers in the lab) is not in the repo, so the lab shows no tiers (it works without).

`?force82=cold` forces 81-1 on any five, so on a test build the record after COLD follows the five's net (often 78 or
79): good for seeing the COLD display, not for judging the record. The finish-time table above is from v67.2's pauses;
v68's is in the w2 scratch (v68/a1/finish/finish.txt): Rubber Seal and Pull now finish at 0.73 of the 0.89 s moment.


### 2026-10-02: his first picks, applied (v67.2)

**Where:** branch `art-variety` (the art alone: d48d888, "v67.2: the owner's first art picks") and `c-code-clean`
(that commit merged with origin/main's v66.5, the Tribune's key lock; art-variety carries the merge too). Previews:
https://art-variety.true82.pages.dev/ (lab /docs/art-lab/) and https://c-code-clean.true82.pages.dev/ . **`main` is
untouched (v66.5 live); the owner merges at his word** (his merge command is in this file's opening banners).
BUILD_V `v67.2`; every changed keyed file carries `20261002-v67-2`.

**His picks** (art/PICKS.md has his paste verbatim and his answers to the follow-up questions):
- **Cuts** (switched off in art/enabled.json `off`, files kept; the lab marks them OFF IN GAME): loss tear, woodtype;
  dots arrows, balls, bolts, moons, pixels, tally; scene ridgelines; perk classic, halftone, moneyprint. enabled.json
  may now name a built-in: perk classic is never dealt, but still stands in while a dealt perk's file is loading.
- **Look fixes:** dots/dagger (wins are slanted aqua daggers with a tapered blade, bent guard and pommel, never a
  cross; losses are pink asterisks: the reel's own pair); hot/arcade prints the game's live multiplier (ev.m, then
  ev.ladder, then today's ladder as a fallback: every Hot Hand beat now hands riso-fx.js `ev.m` and `ev.ladder` from
  HH_SEGMENTS, so the other session's v68 ladder, COLD 0.9 to SUPERNOVA 1.3, shows by itself once it lands); hot/jam
  (the ball passes in front of the back half of the rim, behind the net and the front half); loss/marbling (the
  elbow's opening ripple is one small faint slow ring now); scene/wave (redrawn as a breaking wave that travels left,
  the Great Wave's way: the season climbs the face, the lip throws over a hollow, the sun sits low in it).
- **Streaks** ("animations are great, persistent remainders on streaks of it are not"): no dot set leaves a streak
  mark on a settled stamp, classic included (its thicker rim at 10, ring at 20 and glint at 30 are gone; a 30-straight
  coin rests like the first). The momentary bursts stay (classic's every tenth straight). The rule is in
  art/CONTRACT.md ("A dot set"); every set was pixel-checked (a 30-straight month prints identically to a 1-straight).
  NOTE: this is the one change to the built-in look (classic dots) with no art dealt; the rest of classic and the lake
  are as before.
- **Kept as is for now:** Big Type's caption city. **Future note only** (art/CONCEPTS.md): gangrun, ghosting and
  separation as possible looks dedicated to multi-L months.

**The speed dial (his "save current animation pace in case I change my mind"):** art/tempo.json holds his 17 notes,
one line per look: `"loss/crumple": { "from": "exit", "x": 1.3 }`. `from` is a phase the look's file declares
(`phases: { exit: 0.362 }` on its def: the fraction of the hold where that part begins, measured at the 1.05 s mid
moment) or 0 for the whole moment; `x` is how many times faster from there (1 to 3). The reel plays the look at its own
pace up to the phase, then x times as fast, and hands that clock to its veil, picture, caption and fade alike, so it
simply finishes early and the card sits clean until the hold ends. **To restore today's pace for a look: delete its
line**, then `node tools/art-index.js` (it writes each line into art-index.js: no extra download), stamp a new key,
`node test.js`. To change a percentage, edit `x` the same way. A bad line is skipped with a warning and test.js fails
until it is fixed. The lab's L tab has a Speed toggle (YOUR NOTES / BEFORE) so he can compare, and each dialed look
wears a tag like "30% FASTER · EXIT". Judgment calls in the phases (his to overrule): scratch's "tearing exit" starts
at the rip's start (the slow hinge too); typewriter's starts once the DING has fully appeared (the bell + 0.06 s);
separation's starts as the three plates fly out (the slow fan-apart before it is not sped). Several exits are fixed
in seconds, so one fraction is exact at 1.05 s and starts 0.1 to 0.25 s early in a 1.7 s moment.

**Loading (his "handle preloading smartly"):** on Data Saver or a connection the browser rates slow-2g, 2g or 3g,
`T82ART.deal` hands out nothing: no art downloads, the built-ins play, the bags are untouched (a test build's `?art=`
still wins). Safari and every iPhone browser have no `navigator.connection`, so iPhones always take the normal path,
which is staged: during the draft, the first 4 loss looks, the dot set, the scene (and in Presti the perk and Heat
Check looks); when the reel opens, the other 10 loss looks; the 82-0 looks only if the season can still end 82-0.
Priming: a look with no prep is never primed; the emoji warm-ups run only ahead of an emoji look; the 82-0 fireworks
are primed only in Kaman or once a season can still end 82-0.

**Finish times (his "which is the quickest finishing animation?")** from `node tools/art-qa.mjs finish loss`: the
last frame with any of the look's ink on the card, in the mid moment (1.05 s hold) and the first loss after a streak
(1.70 s hold), with his dial applied; quickest first.

```
When each loss moment is over, in seconds after the slam (quickest first; each pair: the mid moment, then the first loss).
mid / first: the last frame with any of the moment's ink on the card (the picture, the veil, the caption, the slam's rings
and sprays). picture: the look's own picture alone (a look that leaves the card ends early; one that holds its last pose
fades out with the hold). still: when that picture stops moving (before the hold's closing fade; 0.00: it never moves).

 #  look                        mid 1.05 s  first 1.70 s  picture        still        the owner's dial (today's pace: mid / first)
 1  Rubber Seal (seal)                0.87          1.40     0.87  1.40   0.70  1.23  x1.2 from the slam (1.03 / 1.68)
 2  Pull (squeegee)                   0.87          1.40     0.87  1.40   0.70  1.23  x1.2 from the slam (1.03 / 1.68)
 3  Crumpled (crumple)                0.88          1.43     0.82  1.37   0.73  1.28  x1.3 from 36% of the hold (1.03 / 1.68)
 4  Slap Sticker (sticker)            0.90          1.47     0.87  1.43   0.77  1.33  x1.4 from 55% of the hold (1.03 / 1.68)
 5  Fold-Out (fold)                   0.93          1.52     0.92  1.48   0.78  1.37  x1.3 from 55% of the hold (1.03 / 1.68)
 6  Wax Melt (melt)                   0.93          1.50     0.93  1.45   0.75  1.33  x1.15 from 17% of the hold (1.03 / 1.68)
 7  Try Square (square)               0.93          1.52     0.93  1.52   0.78  1.37  x1.3 from 55% of the hold (1.03 / 1.68)
 8  Strikeover (typewriter)           0.95          1.55     0.95  1.55   0.80  1.40  x1.3 from 65% of the hold (1.03 / 1.68)
 9  Ransom Note (ransom)              0.97          1.58     0.92  1.52   0.80  1.42  x1.2 from 62% of the hold (1.03 / 1.68)
10  Misfeed (misfeed)                 0.97          1.58     0.95  1.57   0.83  1.43  x1.35 from 75% of the hold (1.03 / 1.68)
11  Scratch-Off (scratch)             0.97          1.57     0.97  1.57   0.80  1.40  x1.2 from 57% of the hold (1.03 / 1.68)
12  Receipt (receipt)                 0.97          1.58     0.97  1.58   0.80  1.42  x1.2 from 61% of the hold (1.03 / 1.68)
13  Ink Spill (spill)                 0.98          1.60     0.98  1.60   0.82  1.43  x1.2 from 70% of the hold (1.03 / 1.68)
14  Caution Tape (tape)               0.98          1.60     0.98  1.60   0.83  1.43  x1.3 from 75% of the hold (1.03 / 1.68)
15  Test Sheet (testsheet)            0.98          1.60     0.98  1.58   0.83  1.43  x1.3 from 75% of the hold (1.03 / 1.68)
16  Overprint (overprint)             1.00          1.62     1.00  1.62   0.83  1.45  x1.2 from 75% of the hold (1.03 / 1.68)
17  Separation (separation)           1.00          1.62     1.00  1.62   0.83  1.45  x1.2 from 75% of the hold (1.03 / 1.68)
18  Brayer (brayer)                   1.03          1.68     0.83  1.45   0.83  1.47  -
19  Split Fountain (fountain)         1.03          1.68     0.98  1.62   0.83  1.48  -
20  Big Type (bigtype)                1.03          1.68     1.02  1.67   0.83  1.48  -
21  Dot Ripple (ripple)               1.03          1.68     1.02  1.62   0.83  1.48  -
22  Ink Blot (blot)                   1.03          1.68     1.03  1.68   0.83  1.48  -
23  One Stroke (brush)                1.03          1.68     1.03  1.68   0.70  1.27  -
24  Classic L (classic)               1.03          1.68     1.03  1.68   0.83  1.48  -
25  Generation Loss (copier)          1.03          1.68     1.03  1.67   0.83  1.48  -
26  Riso Drum (drum)                  1.03          1.68     1.03  1.68   0.83  1.48  -
27  Block Shadow (extrude)            1.03          1.68     1.03  1.68   0.83  1.48  -
28  Gang Run (gangrun)                1.03          1.68     1.03  1.68   0.83  1.48  -
29  Ghosting (ghosting)               1.03          1.68     1.03  1.68   0.83  1.48  -
30  Extra Extra (headline)            1.03          1.68     1.03  1.68   0.83  1.48  -
31  Knockout (knockout)               1.03          1.68     1.03  1.68   0.83  1.48  -
32  Line Screen (linescreen)          1.03          1.68     1.03  1.68   0.83  1.48  -
33  Suminagashi (marbling)            1.03          1.68     1.03  1.68   0.83  1.48  -
34  Moire (moire)                     1.03          1.68     1.03  1.68   0.83  1.48  -
35  Op Art (opart)                    1.03          1.68     1.03  1.68   0.83  1.48  -
36  Instant Film (polaroid)           1.03          1.68     1.03  1.68   0.83  1.48  -
37  Running Dry (rundry)              1.03          1.68     1.03  1.68   0.83  1.48  -
38  Set-Off (setoff)                  1.03          1.68     1.03  1.68   0.83  1.48  -
39  Show-Through (showthrough)        1.03          1.68     1.03  1.68   0.83  1.48  -
40  Spray Tag (spray)                 1.03          1.68     1.03  1.68   0.77  1.32  -
41  Stencil (stencil)                 1.03          1.68     1.03  1.68   0.83  1.48  -
42  The Rip (tear) [cut]              1.03          1.68     1.03  1.63   0.83  1.48  -
43  Wood Type (woodtype) [cut]        1.03          1.68     1.03  1.68   0.80  1.27  -
44  Trim (trim)                       1.05          1.68     1.03  1.68   0.83  1.48  -
```

Seen in the game (a 75-7 Classic season, ?art=loss:seal+crumple+sticker, Chromium 375x812): crumple's last frame came
0.73 s into a 0.92 s hold, sticker's 0.78 s, seal's 1.20 s into a 1.48 s hold; a season on a reported 3g link
dealt nothing, fetched nothing from art/ and played classic throughout. Every look without a dial keeps ink until the
end of its hold: the shared closing fade runs to the end, and most pictures keep moving until it starts. So
"standardizing" is his call between (a) a target such as "the picture is gone by N% of the hold" (more dial lines, or
phases on every look) and (b) shorter holds for every loss (holdFor in reel-riso.js, which changes the whole reel's
pacing).

**Known flake:** on Node 24.18 `node test.js` sometimes dies with a segfault (exit 139, no FAIL line) inside the art
bag tests, which build about 1,500 vm contexts in a row (3 runs in about 20 on 2026-10-02; every other run passed: 211 checks
with v66.5's merged in). It is Node, not a check failing: run it again.

**Questions he had then (2026-10-02; all answered that evening, see v68 above):**
1. The standard finish time (above).
2. iPhones never report a slow link (no navigator.connection in Safari): is the staged loading enough there?
3. The wave: does he want it travelling left (the Great Wave's way)? The poster's crest is kept about 20% smaller so
   its foam stays off the roster names; it could run bigger behind the names. The sun now sits low in the hollow.
4. The dagger set: keep the quick gold glint up each new dagger (gone by 0.25 s) and the asterisk's short drip?
5. Arcade under the new ladder: COLD becomes a 0.9 penalty but still reads "x0.9 COMBO". Drop the word for COLD?
6. Marbling: only the elbow ripple was calmed; the wavy outline after the combs and the violet echo ring are unchanged.
7. Tally (cut): its slash on every fifth straight win was a streak mark and is gone; a one-line restore if it returns.

### Before his picks (2026-10-01)

**His words (2026-09-30):** the reel's giant L "gets pretty stale seeing the same L over again ... I want a ton of
different variations ... if you saw 10 in a row, you're getting 10 different of them", the same for "that mountain
picture" and "the little dots"; the only limit: no performance cost "even on SE level phones". Then, leaving it
overnight: "1. make sure all animations use the riso engine - within that constraint go crazy. make sure it's obvious
it's an L ... maintain at least a tangential color scheme match to the standard game as the base Vice colors clash hard
with a lot of other combos. Make the art until it's no longer inspired ... 2. make the successful 82-0 results screen
art the extra special ones ... so much better than 81-1 3. remake the hot hand sequence art in several different ways
too, inc. emoji animations 4. remake the icons that pop up when you get the special lucky modifiers on presti eg the
fire sale and refund ... a Louvre of whatever you can creatively create ... then we'll pick the cream of the crop
later." On 2026-10-01 he asked for the lab's asterisk ("yes, but this needs to change" notes): done.

**Where:** branch `art-variety` (pushed; preview https://art-variety.true82.pages.dev/ , lab /docs/art-lab/). Commits:
8f6fe38 (the foundation), e4d499e (the first wing, the FX layer, the lab), 55771f5 (the lab's asterisk). Later art files
may sit uncommitted in the working tree (the production run was still writing when the session stopped): check
`git status`.

**How it works (read these, in this order):** art/CONTRACT.md (the spec: registry, bags, kit K, budgets, laws),
art/CONTRACT-FX.md (Hot Hand, perks, 82-0 fireworks, perfect scenes), art/README.md (how to add a look, the harness),
art/CRAFT.md + art/swatches.png (the riso craft on the indigo stock: which ink pairs sing), art/CONCEPTS.md (the
owner's rules and every brief).
- Each look is ONE small file: art/loss, art/dots, art/scene (a scene with `perfect: true` is 82-0 only), art/hot,
  art/perk, art/goat. art-core.js (`T82ART`) deals each kind from a per-device shuffle bag (every look once before a
  repeat) and lazy-loads only the dealt files when a draft starts: a season downloads the same few KB whatever the
  library's size. art-index.js is GENERATED (`node tools/art-index.js`), art/enabled.json switches a look off in the
  game (it stays in the lab).
- The built-ins are today's look, pixel-identical to v66.4 (except, since 2026-10-02, classic dots' streak marks): `classic` loss and dots (reel-riso.js), `lake`
  (results-riso.js), and riso versions of the old emoji sprays as `classic` hot/perk/goat (riso-fx.js).
- riso-fx.js (`T82FX`): one full-screen riso layer, only while an effect plays; emoji are printed as ink separations
  (K.emoji). app.js calls it at the Heat Check's wheel lock and verdicts, REFUND / FIRE SALE, and every 82-0 volley; any
  failure falls back to the old emoji effect.
- 82-0 prints only from the perfect bag; a Hot Hand save from 81-1 to 82-0 reprints the results picture as one.
- QA levers (test builds only, never true82.net): `?art=loss:id+id2,dots:id,scene:id,perfect:id,hot:id,perk:id,goat:id`,
  `?perk=refund|sale` (the run's first paid Presti spin), `?force82=1`, plus the old `?clutch=1`, `?midhot=1`.
- tools/art-qa.mjs renders and times any look (`node tools/art-qa.mjs <kind> <id> --out DIR [--quick] [--webkit]`;
  `all <kind>` for side-by-side rows); docs/art-lab/qa.html?watch=<kind>:<id> plays one live.
- The owner's lab: docs/art-lab/ (index.html, lab.js, lab.css): tabs THE L / DOTS / PICTURE / 82-0 / HOT HAND / PERKS,
  PLAY 10 IN A ROW, heart / X / asterisk note on every look, YOUR PICKS -> a copyable `ART-LAB PICKS v1` code. It reads
  art/ledger.json (critic tiers and notes) when present.

**What exists (2026-10-01 17:20):** loss 33, dots 18, scene 15 (3 of them 82-0: summit, constellation, rafters), hot 6,
perk 6, goat 4, counting files on disk. Built and tested: everything in e4d499e except the pieces marked untested in
its message's run. Parked (oversize, unfinished, in the old session's scratchpad, gone): art/scene/goatpeak.js and
art/hot/comicheat.js (re-author them).

### Pending, in order
1. **Finish production.** Briefs not yet built at 17:20 (some may have landed since; recompute by comparing the ids
   in art/CONCEPTS.md's tables with the files in art/*): loss: neon dotstack shatter burn bulbs brick anvil balloon
   splitflap zoom bolt chalk gameover dominoes pow tumble frost smoke meteor stitch sand flatline drain slots copier hand
   vinyl moire fountain knockout linescreen extrude ripple setoff showthrough bauhaus swiss opart ukiyoe zine; scenes:
   forest canyon farmland aurora coaster reef terraces clouds planet bridge island kirigami topo mars skate highway
   shanshui seismo; perfect: parade sunrise goatpeak kintsugi; hot: match thermo comicheat phoenix; perk: jackpot
   ticker. The recipe that worked: one author agent per 4-5 briefs (sonnet is fine), each iterating with the harness
   and reading its contact sheets, then a critic per kind (tiers A/B/C, concrete fixes), polishers, and an index step
   that writes art/ledger.json.
2. **Critique the whole library** if the run did not reach it (art/ledger.json missing = not done): near-duplicates,
   weak or fake-looking pieces (rendered, not printed), "not obviously an L".
3. **FX checks** if not done: the Hot Hand at every tier (?clutch=1, ?midhot=1), ?perk=refund|sale, ?force82=1, the
   81-1 to 82-0 save swapping the picture, fallbacks with riso-fx.js blocked, in Chromium and WebKit at 320-375.
4. **The quiet certification** (nothing else running): pixel identity of classic/lake against 53d0a88 with no art dealt
   (the foundation proved it; re-prove after all the edits), and every look's harness timing at 4x (budgets in the
   contracts; the prep-job budget is ~8 ms throttled since the review fixes).
5. **Release to the preview:** `node tools/art-index.js` -> `node tools/cache-keys.js --stamp <key>` ->
   `node tools/art-index.js --check` -> `node test.js` (190 passed at 55771f5) -> `node tools/style-law.js` -> commit ->
   push art-variety -> poll the HTML for the new key (never fetch a new ?v= key first).
6. **His picks:** he pastes `ART-LAB PICKS v1`: cuts go to art/enabled.json `off` (or are deleted), "yes, but" notes
   are fixes to make, loves stay. Merging to c-code-clean and main only at his word (his merge command is below).

**Lessons:** a 5-hour usage window lasted about 1.5 hours with ten Opus agents rendering at once; the overnight run
was cut off three times. Author agents on sonnet stretched it. Resume from what is on disk (authors were told to start
from an existing file), and keep the critics on the stronger model.

## 000001. START HERE (2026-10-01, night): THE TRIBUNE'S API KEY IS THE APP'S ONLY (LIVE; merged to main 2026-10-02 at his word)

**What he asked (2026-10-01):** "we need to prevent unauthorized use of my anthropic api that is currently being used
to write the tribune article ... make sure it's only ever used to write tribune articles as dictated by the app
currently ... i think at some point we made a 'lab' out of the tribune articles and to do so we basically made the api
publicly accessible. shut it off, don't want the lab rn. do on the c-code-clean repo first." Later, the same session:
"totally possible the lab was erased some time ago btw and not in any documentation."

**There is no lab in the tree, and there was no second endpoint to delete.** One file has ever touched the key:
`functions/api/recap.js`. Nothing else in the repo names `api.anthropic.com`, `x-api-key` or `ANTHROPIC_API_KEY`
(`tools/labels-refresh.js` matched only on a commit-message trailer), nothing but app.js posts to `/api/recap`, and no
branch carries a Tribune lab: `c-code`, `accounts-test`, `art-variety` and `home-titles` have the identical file, and
only the long-dead `cloudflare/workers-autoconfig` differs (an older, smaller recap.js). The Reprint Lab
(`docs/reprint-lab/`) is a design explorer and never calls the API. So the lab was indeed erased earlier. What was
still live is the thing that made it possible: **`/api/recap` was an unauthenticated POST on a public URL that spent a
billable key.** Anyone could `curl https://true82.net/api/recap`, pick the costliest of its three prompt shapes, and
put their own prose in the roster names and the fit notes, which is a free Claude proxy on the owner's bill. That is
closed now.

**The four guards (functions/api/recap.js, cheapest first; nothing reaches the model that the Function did not either
write itself or check against the app's own vocabulary):**
1. **Same origin.** A POST must carry an `Origin` (browsers send it on every non-GET) or, failing that, a `Referer`
   from true82.net, www.true82.net, a `*.true82.pages.dev` preview, or localhost. Anything else gets a 403 before the
   body is read. A lookalike (`true82.net.evil.example`) does not pass.
2. **One phase.** Only `edition` is served, which is the only phase the shipped app.js sends (it posts `{phase:"edition"}` and nothing else). The retired
   `headline` and `article` phases were a second and a third prompt shape, and `article` always turned thinking on for
   2,600 tokens, so a caller could choose the most expensive path on the site. They now fail soft, which for an old
   cached client means the local edition, exactly as a timeout does.
3. **A roster the app could have drafted.** Slots must be G/F/C, names must be name-shaped (checked against all 3,509
   names in site_data.json and the `S. O'Neal` share surnames they build), and every fit note must match one of the 23
   sentences `recapFitNotes()` can actually emit (`APP_NOTES` / `NOTE_SHAPES`). A note of a caller's own choosing is
   dropped; a sentence in a name field refuses the request. **This is what closes prompt injection**: free text no
   longer reaches the system prompt at all.
4. **A spend ceiling.** Per IP `RECAP_IP_HOURLY` (default 8) and site-wide `RECAP_DAILY_MAX` (default 2,000) editions,
   counted in the existing `GAMES` KV namespace under `rl:recap:*` keys that expire themselves. This is the guard that
   still holds when a script forges an `Origin` header, which any script can do: guards 1 to 3 pin the shape of a
   request, guard 4 bounds what matching that shape can cost. Both fail OPEN on any KV error or missing binding, so a
   counter never costs a reader the paper.

**Also:** `RECAP_OFF=1` stops every AI edition at once, from the dashboard, with no deploy (the paper prints its local
copy, as it does when the key is missing). The zero-token health probe no longer tells strangers whether a billable key
is bound: `t82RecapHealth()` from the console on the site still gets the full detail (it sends a same-origin Referer),
as does `?key=<DASH_KEY>`, and everyone else gets `{ok:true,health:true}`.

**What did NOT change, and this was checked, not assumed.** For a real app payload the new Function sends a
**byte-identical** system prompt (4,761 chars) and user message (738 chars), the same model, the same 900 max_tokens
with thinking off, and returns the same nickname, article and **share signature**, so published `/r/:slug` links keep
verifying. `app.js` is untouched: no cache key to stamp, no `BUILD_V` bump, no migration, no style change. Note the fit
notes are still clamped to 110 chars for the prompt after the allowlist check, so the long usage note reaches the model
cut off at the same byte it always was.

**Validation.** `node test.js` 157 passed, 0 failed (153 before; the four new ones run app.js's own `recapFitNotes`
against the Function's allowlist, check every dataset name, and pin the endpoint's shape, so adding a fit note without
teaching the guard fails the build). `node tools/recap-guard-check.mjs` 27 passed, 0 failed: a new tool that runs the
real Function in-process with a stubbed fetch and asserts, for every scenario, whether the provider was called at all.
Both are offline and spend nothing.

**For the owner.** Nothing is required of him. Worth doing: look at the Anthropic console's usage for the days before
2026-10-01 and see whether anything was spent that the game cannot explain. The key itself was never exposed (it stayed
server-side in the Function and was never sent to a browser), so **it does not need rotating** on account of this; it
would only need rotating if its usage shows abuse he wants to cut off immediately, and `RECAP_OFF=1` is the faster
first move. If real play ever nears 2,000 editions a day, raise `RECAP_DAILY_MAX`; `0` disables either cap.

**How it shipped, and how to check it on any deployment.** Built on `claude/charming-hypatia-i343va` off `c-code-clean`
at v66.4 (the two were identical), then fast-forwarded onto `c-code-clean` and `main` together on 2026-10-02 at his
word, so the invariant `main` = `c-code-clean` holds and the next Monday tag refresh fast-forwards as usual. A Function
change carries no cache key, so the deploy probe is the build header: `curl -si https://true82.net/api/recap?health=1`
shows `x-t82-recap-build: 2026-10-01.tribune-app-only-v1` once it is out. Then, to watch a guard work from outside the
app: `curl -si -X POST https://true82.net/api/recap -H 'content-type: application/json' -d
'{"phase":"edition","players":[]}'` returns **403 `not_app`** while the game itself is served. Branch previews are
allowed hosts too, but Pages keeps separate Production and Preview binding sets: with no `ANTHROPIC_API_KEY` in the
preview environment the paper prints local copy and `t82RecapHealth()` says `configured: false`, which is the fastest
way to tell that apart from a guard refusing something.

## 000000. START HERE (2026-09-29, night): V66 TO V66.4, THE LAUNCH WEEK'S SPECIAL DAILIES, THE START SCREEN'S TEXT, THE TEST DAY (LIVE)

**His words:** "we need to plan 2 special dailies - make sure to bump out what was currently planned. -10/20, "Opening
Night": Classic mode. Only teams in rotation are Boston, Detroit, Philly, NY Knicks, OKC, Spurs (to match the IRL
opening night lineups) -10/22, "Primetime": Classic mode. Only Cleveland, Philly, Denver, OKC (to match the weekend IRL
pirmetime games). Also generally for the daily start screen text we want the font size to be as big as possible and
still fit on one line. Make sure the pill we had to test logo options is fully rooted out. Find a way I can test those
2 modes before the day of deployment; an influencer will release a video of him playing my game and everything needs
to be perfect." Plus a note for another turn (below, "Next").

### v66.4: one deep cut, two team skips, crowd-chosen rolls (read first; LIVE)
**His words** (after v66.3): "for the classic ones, you've accomplished them making it easy to pick the superstars, but
it's so easy that I think everyone is going to have the exact same team, plus or minus one player ... maybe we need to
insert one boring year into there to make them use skips or give them the opportunity to fail. What are some other
ideas?" Then, on the recommendation (a deep cut, tension in the path, an extra skip; not hiding the stars): "Do it.
Then hand-off. Great job thank you".
- **The measurement** (tools/daily-crowd.js, new; its header explains the model): 900 simulated players a day (40%
  casual: the first five rows, the biggest name; 40% fans: twelve rows, names they rate; 20% experts: by value; weak
  tickets make some skip). On v66.3's rolls the most common five was 10% (10/20), 24% (10/21) and 41% (10/22) of the
  crowd, two random players shared 2.6, 3.0 and 3.3 of 5, and 58% of 10/22 went 82-0 (records 80/82/82: no way to
  fail). Hiding the stars (list order) barely moved it in the model: people find LeBron anyway.
- **The fix** (challenges.js THE SPECIAL DAYS and its `specialDeal(frs, star, deep)` helper): every round deals the
  star eras; rounds 2 and 3 may also deal a DEEP CUT, a lesser era of the same franchises hiding a gem a casual fan
  does not know (Opening Night: '80s Spurs (Alvin Robertson over Gervin), '80s Sonics, '70s Knicks (Frazier), '70s
  Pistons (Lanier); Doubleheader: '80s Warriors (Sleepy Floyd over Mullin), '90s Wolves (young KG), '00s and '70s
  Warriors; Primetime: '80s Nuggets (Fat Lever over English), '90s and '80s Cavaliers, '90s Nuggets, plus bare ones,
  '70s Nuggets (Bobby Jones), '70s Cavaliers, '70s Sonics, because its gems alone left it too easy). `cfg: {
  TEAM_SKIPS: 2 }` on all three. A skip re-rolls every later ticket, so skippers' paths split from the crowd's.
- **The rolls** (daily-core SEED_OVERRIDES, chosen by `node tools/daily-crowd.js search`): each no-skip path carries
  the night's headliners and exactly one deep cut, in round 2, and was the least alike of its candidates.
  10/20 2696998625: '00s Celtics > '70s Pistons > '20s Spurs > '90s Knicks > '10s Thunder.
  10/21 3675641764: '90s Lakers > '80s Warriors > '10s Wolves > '00s Heat > '20s Warriors.
  10/22 2501072727: '80s 76ers > '70s Sonics > '10s Cavaliers > '20s Nuggets > '00s 76ers (SGA's Thunder sits out:
  every path with LeBron, Jokic and SGA stayed too alike; LeBron and Jokic kept).
  The crowd now (900 each): the most common five 11%, 4%, 10%; two players share 1.7, 1.7, 2.0 of 5; records
  66/75/80, 46/73/80, 62/76/81; about 4-6% go 82-0 (300-player runs). A value-picking bot through the real screens:
  79-3, 81-1, 81-1. The random-seed audit (skippers): 0 dead.
- **Copy:** the gate says each board is star eras with "one exception: round 2 or 3 brings a deep cut, a lesser era
  hiding a gem. Find him or skip it: two team skips today." The draft's status line: "... STAR ERAS, ONE DEEP CUT."
- **Tests** (test.js 153): the three paths, one deep cut each (round 2), deep cuts only in rounds 2-3 across 150 seeded
  deals with skips, two team skips, the seeds, the list sorts.

### v66.3: the third night, Doubleheader (10/21), and all of it LIVE (read first)
**His words** (asked whether 10/21 should be star-seeded too, whether 10/22 being a Thursday was right, and when to go
live): "1. Yes 2. Fine unless I got the date wrong 3. Just merge now".
- **The dates are right** (the NBA's 2026-27 schedule, checked on the web): 10/20 NBC's opening tripleheader
  (Celtics-Pistons, 76ers at Knicks, Thunder at Spurs); 10/22 ESPN's Thursday doubleheader (Cavaliers at 76ers,
  Nuggets at Thunder); 10/21 ESPN's Wednesday doubleheader (Timberwolves at Heat, with Giannis's Heat and LaMelo's
  Wolves debuts; Warriors at Lakers).
- **10/21 is now Doubleheader** (challenges.js `doubleheader`: Classic; TIMBERWOLVES, HEAT, WARRIORS, LAKERS; 14 star
  eras: Wolves '00s-'20s, Heat '00s-'20s, Warriors '90s, '10s, '20s, Lakers '80s-'20s), replacing the Presti puzzle
  Backcourt Mates (the home screen calls Presti "Experts only", wrong for first-timers); it waits for POOL3's loop with
  The Worst Year and Pass It On. 10/19-10/22 are four Classic days: the launch week's exception, exempted in test.js.
- **Its seed** 3943279318: '00s Heat (Wade, Shaq, Mourning) > '90s Lakers (Magic, Shaq, Kobe) > '20s Wolves (Edwards,
  Towns) > '10s Warriors (Curry, Durant, Klay, Draymond) > '80s Lakers (Kareem, Worthy). The easiest of the three:
  loose players 21% perfect (none of 12,000 seeds went under 21%: those franchises' star eras are that deep), fans 77,
  about 194 different fives. The random-seed audit: 0 dead, 80/82/82.
- **Merged** v66.2 first (the moment he said merge), then v66.3 after its checks (test.js 150, UI playthrough, lists).

### v66.1: star eras on chosen seeds (read first)
**His words:** "seed both of these so that you tend to get ... the highest quality eras and team combinations. It doesn't
have to be like the absolute top ones, but for people who are playing this for the first time ... I want everyone to
know who these players are to be excited to be drafting stars ... after these three days have passed ... it can get
more difficult ... with the caveat that it can't just be basically one obvious answer for everyone. It does need to have
some level of challenge."
- **Star eras only** (challenges.js `pairs` on both boards; sim-core `allow.pairs` and `pairAllowed`, used by the deal
  and both skips). A ticket is on the list when a casual fan knows at least two of its names, or one megastar with real
  help: 24 of Opening Night's 36 franchise-decades, 15 of Primetime's 24 (the lists and the reasons are comments in
  challenges.js). Out: every '70s ticket, the '00s Knicks, the '80s and '90s Cavaliers and Nuggets, the '10s and '20s
  Pistons. Each board now runs '80s to '20s. The gate copy says "star eras" and that a skip always lands on another.
  `reelDecs` keeps the decade reel on the board's decades too.
- **The engine change is inert elsewhere:** checked against the committed sim-core on all 302 boards x 30 seeds (deals,
  a team skip, an era skip, the RNG draw counts): only these two boards differ. No VERSION bump (nothing played uses it);
  the hook's doc says so.
- **Chosen seeds** (daily-core `SEED_OVERRIDES`, read by boardFor, so replays, the archive and beat-links agree). From
  12,000 candidate seeds each: the five tickets everyone is dealt (unless they skip) are all top-tier, span five
  decades, and the opener is marquee (on camera). 10/20: '00s Celtics (KG, Pierce, Allen, Rondo) > '10s Thunder > '20s
  Spurs (Wembanyama) > '80s Pistons > '90s Knicks; the 76ers sit out. 10/22: '10s Thunder (Durant, Westbrook, Harden,
  George) > '80s 76ers > '00s Cavaliers (LeBron) > '20s Nuggets (Jokic) > '90s 76ers.
- **Variety and challenge, simulated on the day's own seed** (scratchpad daysim.js: a "fan" who drafts the biggest
  names, a "loose" player choosing among the top four by value, a value-perfect "sharp" one): fans make 32 different
  fives (the most common 5%) and average 76 (10/20) and 65 (10/22) wins, the one-ball tax biting star-stackers; loose
  players make about 200 different fives, 2% (10/20) and 22% (10/22) of them 82-0; value-perfect play is 78 and 82.
  Through the real screens a value bot went 82-0 on both days. The random-seed audit (skippers' paths): 0 dead,
  records 78/81/82 and 79/81/82.
- **v66.2, the stars lead each list.** The list sorts by minutes by default, which hid the headliners: Kevin Garnett
  was 13th on the 10/20 opener, and Wembanyama, Barkley ('90s) and Dr. J were out of their tickets' top four. Both
  boards now open on the OBPM sort (challenges.js `sortMode`, app.js newGame), and the OBPM and DBPM sorts rank a season
  under 500 minutes after every real one (app.js `METRIC_MIN_MP`, sortPoolRows, applyMetricYears): only the boards that
  keep cameos (challenges) can have one, so the regular draft sorts as before. The first names now: KG, Pierce, Allen;
  Durant, Westbrook, George, Harden; Wembanyama; Isiah; Ewing; Barkley, Dr. J, Moses; LeBron; Jokic, Murray.
- **His follow-up:** "after these three days ... it can get more difficult". The boards after 10/22 are the POOL3 rotation
  as planned. (10/21 became Doubleheader in v66.3.)

### What shipped (on c-code-clean; NOT on main)
1. **Two special boards** (challenges.js "THE SPECIAL DAYS", after POOL3; daily-core.js DAILY_COPY and OVERRIDES):
   (v66; v66.1 narrowed them to star eras, above) `opening_night` (Classic; CELTICS, PISTONS, 76ERS, KNICKS, THUNDER, SPURS) on 2026-10-20 (#101), `primetime` (Classic;
   CAVALIERS, 76ERS, NUGGETS, THUNDER) on 2026-10-22 (#103). The data runs 1974 on, so each franchise has six decades;
   the SuperSonics years count for the Thunder, the ABA years for the Spurs and Nuggets (the gate copy says so).
2. **The bump.** POOL3 had 10/20 Backcourt Mates (Presti), 10/21 The Worst Year (Classic), 10/22 Pass It On (Pro).
   Two Classic specials there would make 10/19 (Board Meeting, Classic) to 10/22 four Classic days in a row, against
   the schedule's own law, so Backcourt Mates moves back a day to 10/21 (OVERRIDES), and The Worst Year and Pass It
   On are bumped: they come back when POOL3 loops (2027-04-16 on). The rotation does not shift: every other day keeps
   its board (test.js pins it).
3. **The audit** (`node tools/daily-audit.js 300 ids opening_night,primetime --labels`): 0 dead in 300 bot drafts each,
   round-one pools of 63 (vanilla Classic 38), center supply 23, records p10/p50/p90 75/80/81 and 76/80/82, the same
   shape as the Texas Triangle and California Love. **ghost% 7 on Primetime (2 on Opening Night):** all of it is
   Bobby Jones (the 76ers/Nuggets forward) slotted at C, because the engine keys positions by NAME and a different
   Bobby Jones played 70% of his 222 minutes at C for the 2008 Nuggets. Old quirk, every mode; the fix is keying
   CAREER_BUCKETS by person (sim-core), offered to him, not done.
4. **The ticket reel spins only the board's teams** (challenges.js `reelFrs` on every fixed-franchise board: the two
   specials, the Rivalry, the Texas Triangle, California Love (and its blind twin), the Expansion Class; app.js
   spinReels and crestPool): before, the 620ms spin flashed every franchise's name and crest before landing, so a
   filmed Opening Night spin could show a Lakers logo. Checked by recording every frame's name and crest.
5. **The start screen's text** (app.js fitOneLine, fitGateText; his "as big as possible and still fit on one line"):
   the date line, the three rules under THE DAILY (one shared size, the longest sets it), the variation's label and
   the board's name each take the largest size that fits one line, between a floor and a ceiling (rules 12-24px,
   label 8-13px, name 16-34px, date 8-13px); a spill steps down until the box holds it; refit when the fonts land and
   on rotate. At 375: rules 15.3px (the third line used to wrap, "ball." alone), label 10.8px, name 34px. At 320 the
   label is 8.6px (mono is wide; its own spacing .14em). A replay's longer rules cannot fit at 12px, so they keep the
   CSS size and wrap as before. No sideways scroll at 320-430 in Chromium and WebKit.
6. **The test day** (daily-core `setTestDay`, `clearTestRecord`; app.js `TEST_DAY`, `offLiveHost`): on any test build
   (anywhere but true82.net) `?day=YYYY-MM-DD` makes that day today for the whole site. A light paper banner says
   "Test day: TUE, OCT 20 · Daily #101 · nothing here counts" with "Start over". Its runs keep their own local
   record (`t82_daily1_test`), so the real record and streak never move; the preview's mock database drops every
   write anyway. true82.net ignores the parameter (checked by routing true82.net to the local build). His links:
   https://c-code-clean.true82.pages.dev/?day=2026-10-20 and https://c-code-clean.true82.pages.dev/?day=2026-10-22
7. **The pill:** rooted out in v65.1 already; v66 re-checked the whole repo and every served page (true82.net, www,
   the c-code-clean and home-titles previews): no trace. The `?badge=` preview (test builds only) is not the pill and
   stays. Old per-deployment preview URLs (hash.true82.pages.dev) from v65 still show it; only Cloudflare can delete those.

### Calls he may overrule
- The bump as described (2); the alternative, pushing every later board back two days, would shift the weekday
  texture (Sunday Presti, Thursday blind...) for the rest of the pass.
- No aqua badge on the two tiles (DAILY_BADGES stays empty): the names already say it; a badge like "NBA TONIGHT" is
  one line each in daily-core.js (13 letters fit the tile at 320).
- **10/22 is a Thursday;** he wrote "the weekend IRL primetime games". Moving Primetime is one line in OVERRIDES.
- Bobby Jones at C (3).

### Checks
test.js 146 (new: the special days' schedule and copy, the rotation unshifted, never three base modes running across
the real schedule, 60 quick bot drafts each, the test day only moves today and only off true82.net); style law;
theme; keys (`20260929-v66`). A scratchpad Playwright run plays each special day through the real screens with the
test day (home tile, gate, five picks, the reel, results "THE DAILY #101 · OFFICIAL RUN", the played tile), checks
every ticket is from the day's franchises, and that the real record is untouched. `tools/home-qa.js flow` passes.

### Next, in order
1. **The Monday tag refreshes** (10/5, 10/12, 10/19) land on `c-code-clean`; at his "merge", fast-forward `main` (the
   top's command; poll the HTML for the new keys, never a new key itself, before checking files).
2. **He may play the three days early** on a preview: https://c-code-clean.true82.pages.dev/?day=2026-10-20 (and
   -21, -22). Anything he wants changed is one of: the board lists or deep cuts (challenges.js THE SPECIAL DAYS), the
   copy (daily-core DAILY_COPY), the rolls (SEED_OVERRIDES; re-search with tools/daily-crowd.js), the date (OVERRIDES).
3. **His note for another turn (not started):** "make sure it can handle high traffic: is there any obvious issue
   with the architecture if 1k people play in a day? 10k? 100k? Perhaps any useless or unused analytics being
   collected that the avocado subpage does nothing with? Or that are not actionable data or not worth the cost of
   collection?" Start from functions/api/event.js (every event is a D1 insert), functions/api/traits.js (the vote
   card's session deal on every home view), functions/api/stats.js (the footer's counts: a D1 aggregate per page
   view?), functions/avocado.js (what the dashboard actually reads), analytics.js and retention-client.js (what the
   client sends), Cloudflare's free-tier limits (Functions requests a day, D1 rows written and read a day), and the
   influencer spike the launch week may bring (one video can mean 10k+ in an hour).
4. **Open calls, his to make if he wants:** Bobby Jones slottable at C (the engine keys positions by name; a 2008
   namesake played C: fix = CAREER_BUCKETS by person, sim-core, every mode); no aqua badge on the three tiles
   (DAILY_BADGES empty); "Doubleheader" as 10/21's name; after 10/22 the rotation "can get more difficult" as planned.

## 00000z. START HERE (2026-09-29): V65 AND V65.1, THE HOME'S TITLE ART (TITLE 2 PICKED), LIVE ON MAIN

### v65.1: his pick, the lift, and live (read this part first; v65 as built for the test is below it)
**His words** (after the v65 preview): "Go with title 2. But first move all the buttons etc up 1/3rd of the empty
space between classic and the bottom of the basketball icon. Then go live to main."
- **Title 2 only.** Title 1 is deleted (home-hoop.webp, home-wordmark.webp, their CSS, keys and `_headers` rules), and
  so is the test toggle: the `<head>` script, `html[data-title]`, `?title=`, the pill and the `data-src` loader. The
  logo and floor are plain `src` images now (the logo `fetchpriority="high"`), so they paint with or without
  JavaScript. The `?badge=` preview stays, off true82.net only (app.js `offLive`).
- **The lift.** The ball's hoop ends at crop y 340.3 (measured on the 5x print: 106.7px down the title at 390) and the
  mock put Classic at crop y 507 (159px): a 52px gap. A third of it is 17.4px, so the title's box now ends at crop y
  451.4 (`.ht { aspect-ratio: 1212 / 451.4 }`): at 390, Classic starts 141.5px into the title (193.5px from the top),
  35px under the hoop, and everything below follows. The logo and floor are placed by margins (they scale with the
  width, not the box's height), so they did not move: checked pixel for pixel against v65 above the new Classic top.
- **Checks:** test.js 138, style law, theme, keys (`20260929-v65-1` on app.js and styles.css); 320 to 430 in
  Chromium and WebKit, no sideways scroll, equal tiles, no errors; only home-logo.webp and home-floor.svg download on
  the home, the masthead only off it; How to play, Kaman's five taps on the logo, the archive screen's masthead;
  `tools/home-qa.js flow` passes.
- **Live:** `home-titles` fast-forwarded onto `c-code-clean`, then his merge command's steps to `main` (v64 and v64.1
  went live with it).

- **v65.2 (same hour):** the live check at 375 caught "Help balance the game" wrapping to two lines between 360 and
  389px (v65's narrow rule covered only 320-359; v64.1 fit there at 14.5px). Under 390 the card now takes the scale's
  14px title and 16px/14px padding: one line at 320, 340, 360, 375, 390, 414 and 430 in Chromium and WebKit.

- **v65.3:** only a re-key of app.js (BUILD_V v65.3, key `20260929-v65-3`), because a check fetched v65.2's app.js
  key before that deploy was out and the edge cached the old file under it (the rule at the top).

### After the merge (the checks; all read-only)
1. First `curl -s https://true82.net/ | grep -o 'app.js?v=[^"]*'` shows `20260929-v65-3`; only then
   `curl -s "https://true82.net/app.js?v=20260929-v65-3" | grep -o 'BUILD_V = "[^"]*"'` prints v65.3, and the footer
   reads v65.3.
2. `curl -sI "https://true82.net/home-logo.webp?v=20260929-v65"` shows `image/webp` and the year-long immutable cache.
3. 00000y's checks 2 and 3 (the long cache, the vote card's one request) still hold.
4. Look, do not write: the true82.net home once at 375 in the browser pane (the title, the doors, the vote card).


**His words:** "picking up true82 project ... then i have a main screen visual update, attached", then "this is meant as
a graphics update to the preview for now". The package: `~/Downloads/true82-home-handoff.zip` (HANDOFF.md, the hoop and
wordmark cut from a phone screenshot, `true82-floor-extension.svg`, `reference/title2-floor-preview.png`). Its HANDOFF
says Gray would also drop in the two mockup boards ("Final title 1" and "Final title 2"); they were not in the zip, so
v65 is built from the written spec and the reference preview.

**Where it is:** branch `home-titles` (one commit on `c-code-clean` at aa47515), preview
https://home-titles.true82.pages.dev/ (the mock database, as on every preview). `c-code-clean` and `main` untouched.
`BUILD_V = "v65"`; app.js, styles.css, daily-core.js and the four new art files at `20260929-v65`.

### What changed (presentation only; sim-core, the modes, the vote card's logic and analytics untouched)
1. **The title art moved into the page head** (index.html), under a new top bar: HOW TO PLAY top-left (18px book,
   14px), an empty 44px slot top-right for the future account button. The head paints it from the HTML, before app.js,
   like the old masthead. CSS shows it while `#app` holds the home, its static stand-in, or is not parsed yet
   (`body:is(:not(:has(#app#app)), :has(#app#app > :is(.hm, #staticIntro)))`); every other screen gets the old
   masthead back. A browser without `:has()` keeps the old masthead with HOW TO PLAY over it on every screen.
2. **Two treatments,** `html[data-title]`, set by a script in `<head>` before the first paint:
   - `lockup` (Title 1, the default): `home-hoop.webp` (120px at 390, nudged 6px right) over `home-wordmark.webp`
     (edge to edge, 14px overlap), 28px to Classic.
   - `floor` (Title 2): `home-logo.webp` 97.4% wide, `home-floor.svg` (the handoff's SVG, unchanged) continuing its
     grid; Classic starts 159px into the title block at 390, 52px under the hoop, over the floor's tail.
   - **Test build only:** anywhere but true82.net, `?title=lockup|floor` picks one and localStorage (`t82-title`)
     remembers it, and a "Title 1 / Title 2" pill (bottom-left, home only) flips it (and rewrites a `?title=` in the
     address, so a reload keeps the flip). On true82.net the head script ignores both and never builds the pill
     (checked by routing true82.net to the local build in Chromium and WebKit).
   - Only the showing treatment's images download (`data-src`, fetched by the head script at high priority); the old
     masthead is `loading="lazy"` and downloads only off the home. Title 1 costs 125KB (hoop 41KB, wordmark 84KB), less
     than the 136KB masthead; Title 2 124KB plus the 4KB SVG.
3. **The art is re-rendered, not the screenshot cuts:** the Reprint Lab prints the shipped masthead pixel for pixel
   (checked: `LAB.image(heat vice, 300, 3)` equals masthead.png, 0 bytes differ), so it was printed at 6x, and the
   provided cuts were registered into it (a uniform 1.25x scale, correlation 0.97 for the wordmark, 0.89 for the hoop)
   and re-cut with exactly their framing. The hoop comes from a print with the grid backdrop off (no floor lines under
   it); the wordmark's floor is the grid alone, faded 16% in from each cut edge, under the letters; the wordmark's top
   edge is feathered so the glow never ends in a line where it overlaps the hoop. All three are on black, shown with
   `mix-blend-mode: screen`, WebP q90 with sharp YUV (indistinguishable from lossless at 2x zoom). The Title 2 logo was
   registered into the reference preview the same way (x 11, y 12, 1198 wide in its 1212x356 space), so the floor SVG
   lines up without edits. The harness is in the session scratchpad, not the repo: re-run it from
   `docs/reprint-lab/export/render.html`'s pattern (labserver on the lab, the site for its three scripts).
4. **The doors** (app.js `renderIntro`, styles.css "v65 THE HOME"): one type scale, 14 / 16 / 20 / 28 / 32 (and the
   footer's 13 mono); nothing glows but the logo (Classic's outer glow, breathing animation and text glow are gone; its
   inner glow stays). Classic 72px full width; Presti and the Daily as twin tiles (grid, equal height, min 140px, the
   two-line titles always side by side; the Daily's board name centered between "#80" and the tile's border);
   Draft Night Do-Over as a dashed row with a BETA chip; the vote card restyled (padding 18, 48px buttons, YES/NO 20px,
   IDK 16px); "Daily archive" 16px, 44px tap; the stale-link note spans both tiles.
5. **The Daily's event badge** (off by default): `DAILY_BADGES` in daily-core.js, a date to a label, for example
   `"2026-10-20": "Opening night"`; `boardFor` returns it as `badge`, and the tile prints it at the bottom, 12px above
   the border, with the name centered above it. Display only: it never touches the board, seed or replay. It lives in
   this repo (no outside data). A test build previews one with `?badge=Opening%20night`.
6. **Theme:** two named shades in tools/theme-core.js: `accent-pale` (accent-hi 50% + light, #FFC4E6: CLASSIC) and
   `accent-mist` (paper-2 85% + accent-hi, #F1D5E6: the line under it).
7. **The footer** (every page that shares styles.css): 13px mono throughout, the rule full-bleed with the text in a
   528px column; on the game page the contact address is near-white with no neon glow.

### Calls he may overrule
- **The site's faces, not the mock's.** The spec names Barlow Condensed, Barlow and IBM Plex Mono; v65 keeps Big
  Shoulders Display (at the spec's 700), Rubik and Space Mono with the spec's sizes. Why: its colors turned out to be
  the site's own tokens read off an iPhone screenshot (Display P3: its #EC56AC converts to #FF46AF, the site's accent
  #FF48B0; its #68C2E6 to #3EC5EA, the offset #41C6EA; every other one lands within a few dE of a token), which says
  the mock was traced from the site and its fonts were stand-ins too (the theme even lists Barlow Condensed as
  Big Shoulders' fallback). Switching faces would restyle every screen, not the home. One word from him switches them.
- **Colors are tokens**, per the above (the style law requires it anyway).
- **The vote card sits lower:** the title block is 240px against the old ~110px masthead, so at 320 the YES button is
  at ~790px (was ~570). Classic, Presti, the Daily and the Do-Over are all on the first screen; the card needs a scroll.
- **The played Daily** keeps its record and both actions inside the tile (the spec did not cover it); at 320
  "Challenge a friend" wraps to two lines. **The streak** stays, as a second line under the board's name.
- **The footer change is site-wide** (one component). **The BETA chip** is new copy, from the spec.

### Checks
test.js 138; style law clean; theme current; cache keys (four new files in the manifest and `_headers`). A scratchpad
harness on a local `wrangler pages dev` (a copy of an earlier session's local D1): both titles at 320, 360, 390 and 430
in Chromium and WebKit, no sideways scroll, the tile titles at identical tops, the Daily's name centered to 0.1px, Title
2's Classic exactly 159px into the block (211px from the top at 390), no console errors; the played Daily, a streak with
the badge, and the badge alone; the pill flip and reload; HOW TO PLAY opens; the archive screen gets the masthead back
and no top bar or pill; five taps on the art start Kaman; which images download where. `tools/home-qa.js flow`, `widths`
and `calm` with `BASE=http://localhost:8792/` pass (its "decorated" list is the hidden account-lane buttons, the same
on v64.1). The wrangler copy the launch.json entries point at is gone; `~/.npm/_npx/c943b712072b77c4/node_modules/.bin/wrangler`
(4.142) works, with a `functions` symlink in the folder it runs from.

### When he picks a title (the steps)
1. Delete the loser: its two files (and their `tools/cache-keys.json` and `_headers` entries), its CSS (`.ht-lockup`,
   `.ht-hoop`, `.ht-word`, or `.ht-floor`, `.ht-logo`, `.ht-grid`), its `<span class="ht ...">` in index.html.
2. Delete the toggle: the `<head>` script (keep `data-title` fixed on `<html>`, or drop the `html[data-title]` part of
   the selectors), the pill half of the head's art script and `.title-pill`, and the `?badge=` preview in renderIntro
   if he wants it gone.
3. Stamp (`node tools/cache-keys.js --stamp <key>`), bump BUILD_V, test.js, then fast-forward `c-code-clean` to it
   (or merge) so his usual merge command carries it live.

### Next, in order
1. His v64.1 merge (00000y), unchanged by v65.
2. His Title 1 / Title 2 pick on https://home-titles.true82.pages.dev/ (and his word on the faces).
3. The rest of 00000y's list.

## 00000y. START HERE (2026-09-28, night): V64.1, THE SPEED PASS (NO VISUAL CHANGE)

**His words** (after v64's list): "then generally hunt for performance improvements, mostly around the home screen voting
widget loading time, the game by game animation, but just generally how can we make this snappy for people with cheapo
phones", then "without any NEGATIVE frontend impact that is; obviously faster responsiveness/loading time for lower end
phone users is great; i just don't want to compromise anything to get there".

**How it was measured** (scratchpad perf.js; a cheap phone: Chromium at 375x812 with the CPU slowed 4x or 6x and "Slow
4G", 150ms round trips and 1.6 Mbps down, against the local site; medians of three):

| | v64 | v64.1 |
|---|---|---|
| First visit: home drawn | 3.73s | 3.49s |
| First visit: vote card shown | 4.28s | 3.66s |
| First visit: game data ready (a draft can start) | 8.02s | 7.46s |
| Return visit: first paint | 0.52s | 0.38s |
| Return visit: home drawn | 0.63s | 0.44s |
| Return visit: vote card shown | 1.56s | 0.86s |
| Return visit: game data ready | 1.33s | 0.77s |
| The reel at 6x: frames over 33ms / over 50ms / blocking time | 72 / 11 / 262ms | 27-44 / 2-4 / 69-146ms |
| The reel at 4x: blocking time | 68-89ms | 0-33ms |

### What changed
1. **The vote card deals in one request** (functions/api/traits.js `featuredPick`, op=session `featured=1`; app.js
   `tmSessionLoader`): the server pins the day's featured call itself (unless this device has seen it), where the card
   asked op=featured and then op=session, one after the other. op=featured still works (a cached old app.js uses it).
2. **The vote card's deal goes out beside the identity check** (app.js `tmStart`), not after it: a return visit's
   identity cookie already rides along. Only a cookie restored from this device's storage just then
   (`identity_source` "local_recovery") needs the check first, and that deal is dealt again. A first visit and the
   regions without the cookie deal the same either way; op=session writes nothing. The card still waits for the check.
3. **The masthead is a lossless WebP** (masthead.webp, 136KB for the PNG's 287KB, the same pixels, checked; Pillow
   lossless), in a `<picture>` with the PNG as the fallback, on the home and the five info pages; `.brand-pic {
   display: contents }` and its `<source>` hidden, so the logo lays out exactly as before (checked at 375 and 1280, the
   home and the FAQ). Lossy encodes were smaller (54-68KB) but moved pixels on the neon's thin lines: not shipped.
4. **A year-long immutable cache for the versioned files** (_headers; tools/cache-keys.js and tools/cache-keys.json;
   test.js): a returning phone no longer revalidates 12 files (a round trip each before the page can draw) or the
   2MB game data. The info pages' bare /styles.css and /look.css now carry keys too. THE RULE: after editing a listed
   file, `node tools/cache-keys.js --stamp <key>` (it keys every changed file and rewrites every page's reference);
   test.js fails on a changed file with an old key, a bare or stale reference, or a _headers list that drifts from the
   manifest. labels.json and the HTML pages stay off the list (the weekly tag refresh rewrites labels.json and runs
   test.js, which stays green). A quirk: the header parser dropped the LAST rule without a blank line after it; the
   file ends with a blank line and a comment saying so.
5. **The reel redoes only what moves** (reel-riso.js `drawStrip`, `dirtyRect`, `inkPass`, `inkPrint`): each ink keeps its
   own canvas per month strip, and a frame re-screens only the rect around the stamps still moving (a win's pop within
   1.7 dot radii, a loss's slam, cracks, splats and drips within 3.4), where every frame used to re-screen the whole
   strip three times. The tones are still drawn whole and unclipped on one scratch (a clip anti-aliases a shape a hair
   differently and the halftone turns a hair into a dot: found and fixed). ?risofull=1 is the QA switch back to the
   whole-strip way. **Checked pixel for pixel**: `node tools/reel-qa.js` (and `ENGINE=webkit node tools/reel-qa.js`)
   drives a scripted two-month reel on a mocked clock, both ways, and hashes every byte of every canvas on all 630
   frames: 0 differ in Chromium and WebKit (and the old file from git matched too). A fresh WebKit renders the L's first
   frames differently on its very first run whatever the code; the tool runs a warm-up first.
6. **The giant L prints in idle moments** (reel-riso.js `Lplate`, `Llevel`, `Lready`): its 18 screened levels were
   one 100-170ms freeze at the reel's start on a slow phone; now the plate and then each level print one per idle
   moment (requestIdleCallback, or a 16ms timer on Safari), in the order a loss needs them, and a level a loss needs
   first prints right then (the same pixels). As before, a loss before the moment the L would have been built has no L.

### Looked at and left alone
- The game data's indexing (sim-core `initDataCore`, 250ms at 4x): the engine's deterministic setup (seeds, replays);
  not restructured. With the long cache it now runs right at boot on a return visit, before the vote card's reply.
- A remaining ~60ms task at the reel's first stamps at 6x (pre-existing, also in v64) and the reel's opening (~100ms:
  building the overlay and the style pass it forces): one-time work that has to happen.
- Self-hosting the Google fonts would save the font CSS's extra connection on a first visit, but means downloading
  the font files into the repo (ask him first); lazy-loading reel-riso.js and results-riso.js would save ~30KB on a
  first visit but risks the reel falling back to plain chips on a slow connection. Neither done.
- makeGrain rewritten with hoisted columns: identical output, no faster (V8 already optimizes it): reverted.

### Checks
test.js 138 (three new: the cache keys, the one-request deal, the reel's structure); style law clean; theme current;
tools/reel-qa.js 0 differing frames in Chromium and WebKit; tools/home-qa.js flow (five votes, the stamp, Keep going
to /bonuses/ with the count carried) and widths (no sideways scroll, both engines, 320-440); tools/results-qa.js
results, hint and room; scratchpad v64-qa.js (Classic and Presti boards and the results callout, both engines, 320
and 375). The live site is untouched (main = v63.1).

### Calls he may overrule
- None visual. The long cache is a process change for agents (the rule above), enforced by test.js.

### After the merge (the checks; all read-only)
1. **The build is live:** the curl at the top prints `v64.1`, and true82.net's footer reads v64.1. No hard refresh is
   needed: the page itself still revalidates, and its new keys fetch the new files.
2. **The long cache is live:** `curl -sI "https://true82.net/app.js?v=20260928-v64-1"` and
   `curl -sI "https://true82.net/site_data.json?v=sc-v42c"` show `cache-control: public, max-age=31536000, immutable`;
   `curl -sI https://true82.net/` still shows `max-age=0, must-revalidate`; `curl -sI
   "https://true82.net/masthead.webp?v=20260928-v64-1"` shows `content-type: image/webp`.
3. **The vote card's one request:** `curl -s "https://true82.net/api/traits?op=session&sid=postmergecheck01&featured=1"`
   answers `"ok":true` with five questions (op=session writes nothing).
4. **Look, do not write:** load the true82.net home once in the browser pane at 375 (the vote card shows; the only
   console errors are Cloudflare's own cloudflareinsights beacon, which is noise). Play the draft, Presti's bank flip,
   DID WE GET ONE WRONG? and the home card's stamp on the preview (the same commit, the mock database): a draft
   finished or a vote cast on true82.net writes real rows into his analytics and his tags, so an agent never does
   that there. Direct D1 reads are refused by the permission guard; the public footer counters ticking up is the
   evidence that live games still save.
5. **Tell him:** each returning phone downloads the new files once (new keys), and then opens from its cache.

**If something is wrong after the deploy:** the safe undo is his, one step in the Cloudflare dashboard (Workers &
Pages, then true82, then Deployments: on the v63.1 production deployment, "Rollback to this deployment"). The old
build's files are different URLs (old keys), so no browser is left holding a v64.1 file. Then fix on c-code-clean and
redeploy through his merge command.

### Next, in order
1. His merge (the command at the top), then the checks above.
2. The manual rework on Celia Hodent's method (00000v), once he says go.
3. Record the tag rows and the v62-v63.1 taxes on game_complete (a migration) to watch live firing.
4. Speed, only with his go: self-host the Google fonts (it means downloading the font files into the repo).
5. The Monday tag refresh (next: 2026-10-05) lands on c-code-clean; `main` needs his fast-forward to carry it live.

## 00000x. (2026-09-28, night): V64, THE OWNER'S THIRD PLAYTEST (HIS VOICE NOTES)

**Where things stand.** `main` = v63.1, LIVE (his merge landed this evening; the post-merge checks: the footer, the
Daily's quotes and the logo gap live, no console errors; the draft and the Scoring Card on the preview; a direct D1 read
was refused by the permission guard, but the public Presti counter ticked 16,112 to 16,114 while the agent worked, so
live games save). `c-code-clean` = v64 (this). Preview: https://c-code-clean.true82.pages.dev/ (mock database).

**Where the list came from.** Seven voice notes in his Pineapple reminders list, 3:01 to 5:20 PM MDT, decoded against
the app and read back to him (the three 11 AM notes were v63's list; the 6:00 PM note is not about the game). He then
said: "build it"; "yes cut the 'skips' text"; "perhaps the bank animation could briefly change the overall bank from neon
blue to the number being deducted to red, something of that vibe, do what looks best"; and, mid-build, "make sure to also
review the desktop iteration of the bank/rulebook which is subtly different in design". The decoded notes:
1. (3:01, a marked-up screenshot) the pick diamonds at the top: no PICK N OF 5 text, "way bigger", "hugging the classic
   mode frame ... a tiny bit of padding", the "visual stars of the scene"; HOW TO PLAY "is kind of owning the scenery":
   "obviously a button to click but a lot quieter"; swap the colors: the season (year menu) neon teal with its down
   arrow still hot pink, the tags ("player characteristics") the muted purple.
2. (3:02) why: people pick Derrick Rose after the injury, or LeBron before he could shoot; at a glance they see a
   player, not a player-season.
3. (3:09) a prominent "did we get it wrong?" under the Scoring Card with an arrow button that scrolls back up to the
   cards to add or remove a tag (his case: a five the game read as having no good defenders, with Isiah Thomas on it).
4. (3:10) the home vote card: bigger diamonds, and "the other exciting flare that we have on the dedicated voting
   screen" if it does not hurt the first load.
5. (5:09) Presti hides the player tags.
6. (5:19) Presti: HOW TO PLAY and the bank are "flipped": the bank ("the life blood of the mode") as prominent as the
   skip buttons, HOW TO PLAY quiet.
7. (5:20) Presti: an animation for the bank getting spent ("the money draining out is important for people playing for
   the first time"); the "SALARY CAP · SKIPS -$1M" line under the name is cut off on his phone: two lines, or cut it.
   (Not reproducible in Chromium or WebKit at 320 to 430; cut, at his word.)

### What shipped
- **The pick diamonds** (app.js `draftUtilityHtml`, `renderPips`, `draftInk`; styles.css `.draft-utility`,
  `.du-pips.ink-dias`): the bar lost its hairline and sits 7px over the mode panel; the diamonds grow with the phone
  (15px squares at 320 to 21px from about 420, with a thicker outline, a coarser halftone and their own plate keyframe
  `ink-plate-lg`); PICK N OF 5 stays in the markup for screen readers (`.sr-only`, aria-live); a pick's ring is the new
  `ink-burst.is-dia` size. Every mode (one bar).
- **HOW TO PLAY, quiet** (`bookIconSvg`, `modePanelHtml`; styles.css `#app .mp-rules`): a plain outline button: the dim
  label (`--t-text-2`) in a bronze rule (`--t-rule`), no glow, 36px tall, the home link's line-drawn book. It is
  deliberately NOT a `.t-btn`: look.css paints the old `.mp-rules-btn` class and every `.t-btn` kind in neon (the look's
  "neon amount" lights even the quiet kind in aqua, 6-id specificity), and `.tm-flat` keeps the 3D decorator from
  stamping `presti-spin` back on. It keeps its place beside the mode name at every width (the old full-width row at 349px
  and under is gone, in the Classic panel and the Presti panel alike); the rules sheet opens as before.
- **The season, teal; the tags, quiet** (styles.css `.year-face`, `#app#app .player-row .tchip`, `.pool-trait-legend`):
  the season pill wears the neon blue with a faint halo, its caret stays hot pink; a fixed season (no menu) and
  Presti's locked `.cap-season` are the same blue. Every chip on a draft card (the tags and Classic's engine 3PT and
  GRAVITY) prints as an outline chip in the muted purple (a bad tag in a red outline), and the pool legend matches. The
  results cards' tags, the ones you vote with, keep their ink.
- **Presti, from memory** (`capRowHtml`, `trayRolesHtml`, `RULES_MODE.cap`): no tags on Presti's cards and no "Still
  missing" tag roles in its tray, like Pro; the tags still count and the results cards show them (docs/MODES.md). The
  pool's (i) legend hides itself with no chips. Checked: no board copy leans on seeing a label tag in Presti (every
  "tag" in the board copy is a position or a price tag).
- **Presti's panel** (`modePanelHtml`): the "SALARY CAP · SKIPS -$1M" line is gone (each skip button prints its -$1M;
  a Daily or a challenge keeps its "PRESTI RULES · ..." line); no empty status row.
- **The bank, neon** (styles.css THE BANK block, rewritten): a flat neon tube in the skip buttons' blue (the new theme
  shade `--t-offset-hi`, offset 62% + light, is the balance's light; tools/theme-core.js, `node tools/theme.js`). One
  ink drives the tube, label, balance and fill (`--bank-ink`, `--bank-hi`, `--bank-a30`..`--bank-a85`, premixed from
  theme tokens per state so the style law holds): money running low (`bank-mid`) and red (`bank-low`, `bank-zero`) are
  one rule each. Desktop keeps its column (BANK / balance / meter between the name and HOW TO PLAY), phones the row.
- **THE FLIP** (app.js `tickBank`, `bankFlipShow`, `BANK_FLIP_MS` 480, `BANK_COUNT_MS` 260, `BANK_SETTLE_MS` 160): a
  spend turns the whole bank red (`.bank-flip.bank-down`) and slams the transaction ("-$9M") in where the balance was,
  in two inks (`bank-slam` + `bank-plate`: the aqua plate lands off register and snaps in), the meter draining under it;
  then the neon eases back while the balance counts down; a refund flips green ("+$1M"). Under a second. A re-render
  mid-flip puts the flip back on the fresh markup without a second slam; a spend mid-flip retargets. The old corner chip
  (`#bankDed`, `.mpb-delta`) is gone. The v29.1 comment's "walk's 600ms settle assert" was an out-of-repo harness; the
  flip settles in about 900ms.
- **DID WE GET ONE WRONG?** (`ledgerFixHtml`, `wireLedgerFix`; styles.css `.ledger-fix`): under the Scoring Card, an
  aqua neon card on the halftone dot shadow (`.hm-ht.lf-ht`), the question printed in two inks (`.pb-ink`), "Player tags
  come from your votes. Missing a tag, or wearing a wrong one? Fix it on the cards: tap + to add a tag, or tap a tag to
  vote.", a pink "↑ FIX A TAG" button that smooth-scrolls to Your five (the first card's printed "+" hint is right
  there), and "Scores read the tags as of <date>. Votes count from the next weekly update." It replaces the old small
  ledger note and promises only what a vote does (the backcourt and wing defense rows grade DBPM, not tags).
- **The home card** (styles.css `.hm-dia.ink-dias`; app.js `tmStampOn`, `tmStampOff`, `tmConfettiHtml`, `tmCountUp`):
  the diamonds are the vote room's 13px (12px at 320, where the title keeps its one line); a vote slams its answer
  (YES, NO, IDK) onto the card as the vote room's two-ink rubber stamp with the halftone ring and drops, the card jolts
  with the white halftone flash, the stamp lifts as the tally prints (at least 480ms), and the percent prints in two inks
  at 26px. Built on the tap, nothing at load; prefers-reduced-motion lands the end state. The stamp's CSS (`.pb-ink`,
  `.pb-print`, `.pb-stamp`, `.pb-ring`, `.pb-conf`, `pbLift`) moved from bonuses/index.html into styles.css and both use
  it (checked: the vote room's stamp frames look as before, tools/results-qa.js room).
- The Daily pill ("1 OFFICIAL ATTEMPT") never breaks across lines (with HOW TO PLAY beside it at 320 it drops under
  DAILY #N).

### Checks
test.js 135 (eight new v64 checks, including the flip on a stand-in bank: the red transaction and the slam, the drain to
82%, no second slam on a re-render, the count down to the balance, the flash clearing, a green refund); style law clean;
theme block current. Chromium and WebKit at 320 and 375 (scratchpad v64-qa.js): no sideways scroll on the Classic and
Presti boards and the results, HOW TO PLAY beside the mode name, the diamonds clear of EXIT RUN, the callout's heading on
one line, no page errors. tools/home-qa.js widths (320/375/390/440, both engines): no sideways scroll. In the browser pane
(local site-api3, :8791): the stamp frozen mid-slam on the home card, the flip frozen mid-hold at 375 and at 700
(desktop column), the rules sheet from the new button with the new Presti line, the callout's arrow landing on Your
five, the Presti Daily's panel at 320.

### Calls he may overrule
- HOW TO PLAY as a dim bronze outline (not the look's aqua quiet button); the Classic panel keeps "TAP THE YEAR ▾ TO USE
  ANY SEASON".
- The diamonds' size (15 to 21px) and the bar with no hairline.
- The tags' muted purple as OUTLINE chips (the literal swap of the season's old ink), the engine chips muted with them;
  the fixed season in blue too.
- The flip's timing (a 480ms hold) and its two-ink slam; a refund flips green.
- The callout's copy and its pink button (RUN IT BACK below it is aqua).
- The home stamp says IDK for a pass (the vote room says UNSURE for its own vote).

### What to playtest
A Classic draft: the big diamonds on the panel, the quiet HOW TO PLAY, the blue seasons with pink carets, the purple
tags. Presti: no tags, no skips line, the neon bank; draft a player and watch the flip; skip a team (-$1M flips too).
Finish: DID WE GET ONE WRONG? and its arrow. The home card: vote, and watch the stamp. Desktop: the Presti panel's
column bank.

### Next, in order
1. His playtest of v64 on the preview, then his merge command (above).
2. The manual rework on Celia Hodent's method (00000v), once he says go.
3. Record the tag rows and the v62-v63.1 taxes on game_complete (a migration) to watch live firing.
4. For any future tax: `node tools/champions.js` and `node tools/labels-balance.js` (00000w).

## 00000w. (2026-09-28, evening): V63.1, THE OWNER'S SECOND PLAYTEST

**Where things stand.** `c-code-clean` = v63.1 (this) on v63, v62.2, v62.1, v62, v61.1: all go live together. He
played v63.1 and said "push"; his merge command is at the top of this file (the agent's push to main was blocked by
the permission guard). Preview: https://c-code-clean.true82.pages.dev/ (mock database).

**The owner's words** (after playing v63): "1) usage is too punitive. I had a team with prime kobe and mj but it went
like 60 wins where it would prev be close to undefeated. like this would imply the latest olympic starting lineup would
be a bunch of bums. also the champ #1 to some extent overlaps. discuss solution. perhaps the penalty need to scale down
at the higher extremes? 2) shuffle the artwork no matter the result, I want people to see all my art assets even if
theyre awesome 3) short guy tax works 4) remove the usage bar on classic draft 5) on presti change the max salary to $26
from current $23 6) on my phone I have a bug where running it back sometimes results in the footer with medallions
taking up like half the page in perpetuity - only on second play - investigate 6) on presti, no more guaranteed $1
bargains - determine its appearance based on the luck of the other player costs the player rolled relative to the
game's valuation of them before player label taxes+awards 7) even less padding between true 82 logo and how to play
link 8) less vertical padding between win/loss dots and the flavor text/'swept' stamp", then "the subtitle of the daily
should have quotes around it".

### 1. One ball tops out at 6, and the Banjos fold into it (engine VERSION 14)
- **What was wrong:** real Classic drafts with both Jordan and Kobe (34 on record) are five-alpha fives: usage 155-167.
  v63 charged them 10.6-14 for one ball, plus the Banjos 2 and "the ball sticks" 2: on the live v60.1 rules they
  averaged net 31.8 (82-0 41%); on v63 net 24.0 (21%), and the worst, Dantley '83, Jordan '91, Kobe '06, Jaylen Brown
  '26, Dirk '11, fell from 81 wins to 68. The 2024 Olympic starters (Curry, Booker, LeBron, Durant, Embiid; their 2024
  seasons) projected 65 wins.
- **The rule now:** 120 of usage free, 0.3 a point past it, **never more than 6** (`USAGE_CAP`, about one All-Star).
  Stars adapt: once the ball is fully shared, one more alpha takes a smaller role. Typical fives pay what v63 charged;
  only the pileups change. The cap hits 42% of Classic drafts.
- **The Banjos no longer charge** (the owner: "the champ #1 to some extent overlaps"): two alphas learning to share IS
  the one-ball story. The engine still names the settled TITLE #1s (`e.title1`), and the one-ball row closes with his
  line when two or more share the five: "Took the alphas some time to figure out how to play together and not just
  alongside each other." (at the cap without them: "The stars figure it out, but somebody still has to set the
  screens."). TITLE #1 left the boards (a board shows only what the scoring reads); the results cards keep it.
  `LBL_BANJO_TAX` is gone from every board.
- **Boards:** the ones whose twist is "usage hurts more" lift the cap: The Luxury Tax, The Triangle, The Superteam
  Problem 10; Tax Season 12 (double). Their Daily copy says so.
- **Numbers:** Classic realized 82-0 **18.5%** (v63 14.2%, before v62 24.2%), expected wins 78.0; Presti 4.3%. MJ+Kobe
  drafts 80.7 wins (34%). Olympic '24 fives 79 and 74 wins; the Dream Team 79; five alphas (Iverson, Kobe '06,
  Westbrook, LeBron '09, Embiid) 81. Best play in the same deals 35.1% (gap over as-drafted 16 points; v63 20). No title
  team pays one ball; the '22 Warriors still pay the frontcourt size rule.
- Measured and not chosen (Classic 82-0, Banjos gone): cap 5 19.7%, cap 7 17.5%, cap 8 16.8%; smooth curves that level
  off (6·(1-e^(-over/20))) 21.4%. The cap keeps typical drafts exactly where v63 had them.

### 2. The painting shuffles (results-riso.js, app.js `resultsPrintPal`)
Golden, dusk or night used to follow the record (golden at 59+ wins, so Classic players almost only saw golden). Now a
shuffle bag on the device (`localStorage` "t82-print-bag") deals all three before repeating; a run keeps its painting
through a Heat Check reprint (`G.printPal`); a spec without `pal` (the Reprint Lab) keeps the old rule. The sun never
sinks under the water now (a golden print on a losing year sets on the horizon). Checked: three seasons of 72-79 wins
printed golden, night, dusk.

### 4. No ball meter
The tray is the lineup rail and "Still missing" roles again (`trayBallHtml` and its CSS are gone). The cards still show
usage; the legend and the rules sheet explain one ball.

### 5 and 6b. Presti: a $26 ceiling, and the $1 gem as luck's rebate (sim-core `CAP_CEIL`, `capMisprice`)
- The most a player costs is **$26** (fire sale $24). Stars worth V 9+ now average $22.9 (was $21.3); 47% sit at the
  ceiling (66% at $23 before).
- **The gem:** a board that sets `CAP_GEM` keeps its flat per-player gem (Gem Rush, The Golden Age, The Gauntlet,
  Guaranteed Contracts, Escalator, Fair Market: their copy promises it). Every other board gets **at most one** gem, as
  luck's rebate: its luck is what its five most valuable players rolled against their fair price (the price curve with
  an even roll, under the ceiling; value is V, never a tag tax or credit). At or under fair: no gem. Over: a gem with
  chance (paid/fair − 1)/0.3, certain at 30% over. Gems went from 27% of boards to 11%, and they turn up on the boards
  whose stars rolled dear. A price-aware bot (value minus 0.25 per dollar, no skips) went 2.6% → 2.3% on 82-0, 74.5 →
  74.3 expected wins. The mode tip and the Gem Rush / Golden Age / Ring Tax copy were updated; docs/MODES.md too.

### 6. The run-it-back tray (the owner's phone): the likely cause and the fix
Not reproducible in iPhone-sized WebKit (the tray measured 71px on the first, second and third game, Classic and
Presti, and looked right). The iOS Simulator is not available here (no full Xcode on this Mac). The likely cause is
iPhone Safari zoom: a quick double tap on the long results page zooms in, RUN IT BACK is still in reach, and the draft
screen, locked to one screen with the pool as its only scroller, keeps the zoom, so the fixed tray fills the view with
nothing to scroll. That fits "sometimes", "only on second play" and "in perpetuity". Fix: `html { touch-action:
manipulation }` (no double-tap zoom anywhere; pinch zoom stays) and `resetPageZoom()` in `initDraftViewport` (a draft
that opens zoomed snaps back: the viewport meta briefly caps the scale at 1, then lets go). If it happens again, ask him
for a screenshot.

### 7, 8 and the Daily
- The logo to "How to play" gap is 2px (the home's `#app` top padding and the link's top margin are gone).
- The reel's month rows: the flavor line and the SWEPT stamp sit right under the dots (the strip's drip room 0.95 →
  0.55 of a dot pitch, last-row drips shorter, the margins 8px → 1px).
- The Daily's home subtitle wears quotes (for example, “Paint Police”).

### Checks
test.js 127 (the capped one ball, the lifted caps, the Banjos retired, TITLE #1 off the boards, the alphas line on the
Scoring Card, no meter); style law clean; all 200 POOL3 Dailies certify (the biggest median move −3, Jewelry, a Presti
board); Chromium and WebKit at 320 and 375: no sideways scroll, no page errors; in the browser pane: the home gap and
quotes, the reel rows, three shuffled paintings, Presti boards up to $26.

### Calls he may overrule
- The cap (6). Stricter 7 or 8 keeps more challenge (82-0 17.5% / 16.8%); 5 is looser (19.7%).
- The Banjos folded into one ball rather than kept beside it; TITLE #1 off the boards.
- "The ball sticks" (two ball-holders, −2) still stacks on one ball.
- The gem's luck reads the board's five best players; the chance scale (certain at 30% over fair).

### What to playtest
A Classic draft stacked with alphas (Jordan, Kobe, anyone): the Scoring Card's one-ball row stops at −6 and tells the
Banjos line when two TITLE #1s share the five. No meter in the tray. Three or four seasons in a row: the painting
changes every time. The reel: the SWEPT stamps and the loss lines hug the dots. Presti: a $26 star, and a $1 gem only on
some boards. The home: the logo right on top of "How to play"; the Daily's name in quotes. On the phone: run it back a
few times after tapping around the results.

### After the merge (the checks)
1. true82.net's footer reads **v63.1** (and https://true82.net/app.js has `BUILD_V = "v63.1"`); a hard refresh may be
   needed once, since the cache keys changed (`20260928-v63-1`).
2. A Classic draft on true82.net: no 20+ chips, no ball meter, positive tags before red ones, heights by position (red
   for a second small guard). Presti: prices up to $26.
3. A finished season: the "+" hint slip on the first card, the Scoring Card's One ball row (never past 6), a painting
   from the shuffle. The Daily's home door shows its name in quotes.
4. Real writes are back on (the previews run on the mock database; true82.net writes to D1 `true82`): a vote on a tag
   posts, and game_complete events land (the avocado dashboard counts true82.net only).
5. Note for the day: the merge landed in the evening of 2026-09-28. A Presti Daily's board is dealt by the new price
   pass after the merge, so today's Presti Daily can differ for anyone who played it earlier today; tomorrow's is clean.

### Next, in order
1. The merge (his command at the top), then the checks above.
2. The manual rework on Celia Hodent's method (00000v), once he says go.
3. Record the tag rows and the v62-v63.1 taxes on game_complete (a migration) to watch live firing.
4. For any future tax: `node tools/champions.js` prints what each of the 32 title teams pays (the benchmark the v62 to
   v63.1 checks used, now in the repo), and `node tools/labels-balance.js` scores the real drafts; test apex fantasy
   fives too (the owner's lesson: a rule prices bad fit, never greatness).

## 00000v. (2026-09-28, afternoon): V63, THE OWNER'S EIGHT TWEAKS AFTER HIS PLAYTEST

**Where things stand.** `main` = v60.1, LIVE. `c-code-clean` = v63 (this) on v62.2, v62.1, v62 and v61.1: all go live
together at the owner's "push to main". Preview: https://c-code-clean.true82.pages.dev/ (mock database: reads the live
tags, saves nothing).

**The owner's words** (asked "time to go to main, did you playtest?", he said "i did playtest" and sent eight items,
"chunk ... defer some if needed ... not all of these are just spec changes. use your judgment"):
1. "the usage tax probably overlaps substantially with the 20 point per game scorer thing, we should probably
   consolidate just with usage or some FGA or points"
2. "the 20 point per game score doesn't need a badge on the classic draft screen"
3. "debating whether or not you need to put all the team aggregate taxes on the classic draft screen"
4. "there needs to be some order for the badges on the draft and results screen. definitely the positive followed by
   the negatives ... whether the ? are actually implemented or not and then accordingly either just don't put them on
   the tags for the classic screen or we just don't mention the "?" and add the ? badges no differently"
5. the "+" glove on the results "just isn't working ... we've tried to fix it numerous times and it keeps breaking,
   you pick this time"; "I just need a thing that says here look make sure to click this button"
6. size by unit instead of the average: "you can have a short Center like Draymond Green but your other forwards can't
   also be short or same thing with guards ... Fred VanVleet is one of your guards but your other guard can't be like
   Kyle Lowry"
7. "the true 82 logo is kind of getting deemphasized because of the 'draft what wins' tagline" : put the slogan in HOW
   TO PLAY with what the game is and "that we're different because we actually do real team fit using advanced stats
   and player attribute labels which you can vote on ... very tersely, using the gorgeous artistic flair"; "we might
   need separate manuals more granularly"
8. "NO ACTION NOW": name a real guide-writing expert whose guidelines can pare the manual down.
Then, mid-build, **the lesson** (saved as the memory `owner-intent-over-spec`): "20 ppg doesnt make sense either
because realistically a 82-0 team would be made of I imagine at least 4 players at their absolute apex who score at
that rate, I think the agent followed my 'use simple stats to create a tax' too rigidly without thinking through the
logic, let's not make that mistake again. what I NEED for the game I want, not just my spec, for all of these."

### What shipped (engine `VERSION` 13; sim-core `oneBall`, `sizeUnits`)
- **One ball is the usage tax, alone.** The 20-point rule is gone (and its chip, tray line, legend row, Scoring Card
  row). Every real draft that paid the 20-point charge paid usage too (100% overlap; corr 0.80 between scorers and
  usage): one sin charged twice. Usage is the mechanism: five on the floor share 100% of the plays. The starting fives
  of the 32 title teams in the analysis sum to 94-119 (median 105; season numbers run high because each was measured
  beside bench players); drafted Classic fives sum to 137 at the median, p90 153. Rule: a five shares `USAGE_BUDGET`
  **120** free and pays `USAGE_RATE` **0.3** a point past it (code defaults in sim-core; site_data.json still says 110
  and 0.09375, and is untouched, like v62's keys). No title team pays. The apex test: Magic '87, Jordan '91, Bird '86,
  Hakeem '94 and Rodman '92 (four 20-point scorers, 128) pay 2.4 (they paid 4.7 in v62.2); Iverson '01, Kobe '06,
  Westbrook '17, LeBron '09 and Embiid '23 (187) pay 20.1.
- **Size by unit** (replaces the 6'6" average): two G-slot players at `SMALL_G_HT` 6'2" or shorter cost `SMALL_G_TAX`
  2; two or more F/F/C players at `SMALL_FC_HT` 6'6" or shorter cost `SMALL_FC_TAX` 2 (one Draymond at center is fine).
  By the slot he plays (a 6'2" guard slotted at F is a small big); a missing height never counts. Fires on 8.1% (guards)
  and 6.3% (frontcourt) of Classic drafts, barely overlapping the glass and backcourt-defense taxes (3%); among the
  champions only the '22 Warriors pay (Wiggins and Draymond, both 6'6", frontcourt 2; they paid 3 for "too short").
- **The numbers** (15,144 real drafts): Classic realized 82-0 **14.2%** (v62.2: 14.5%), expected wins 77.0; best play
  in the same deals 35.7% (35.4%): drafting well is worth a little more than before. Presti 4.1% (4.1%). One ball fires
  on 87% of Classic drafts, 5.9 when it does (v62.2: usage 96% at 2.6 plus 20-point 61% at 4.3).
- **Boards that touch these keys** (challenges.js header): Volume Merchants keeps the old gentle usage tax (110 at
  0.09375; every entry is a 25-point scorer); the usage twists restate against the new normal: The Luxury Tax 110 at 0.4
  (copy: "starts sooner and bites harder"), The Triangle 100 ("slashed to 100"), The Superteam Problem 105, Tax Season
  double (0.6, and size 4 each); The Hundred Club and Ball Hogs now use the default (Ball Hogs' copy: at least 1.5
  guaranteed); Short Kings, both Small-Ball Apocalypses, The Small Blind and Tax Holiday turn both size units off;
  Height Cap keeps them (where you spend the inches is its game). v62's ONEBALL_* and SHORT_* keys are gone everywhere.
  All 200 POOL3 Dailies certify (`node tools/daily-audit.js 120 pool3 --labels`, 0 below the bar); no Daily's median
  bot record moves more than 2 wins (Tax Season, Height Cap, Ball Hogs, The Hundred Club, Overlap -2). The five weekly
  boards below the bar (Superteam, Volume Merchants, Short Kings, Small-Ball Apocalypse, Small Blind) were below it
  before v63 too (tiny pools, no centers).
- **The draft screen (item 3, the call):** not all the taxes. Each card shows its ingredients (usage in Classic's stat
  line, the height, the tags), and the tray keeps only the totals no card can show: the **ball meter** (`trayBallHtml`:
  "THE BALL" bar, gold to the notch at 120, red past it, a selected player previews in a paler band, "96 → 125 of 120
  −1.4"; Classic-style boards only, hidden until the first player is in hand; Presti and Pro draft the stats from
  memory) and "Still missing" roles. The v62 tray lines (20+ scorers, the height average, "Tag taxes:") are gone. A pick
  that would cost a size tax shows **its height in red** (`sizeWarn`: only when every legal open slot makes him the
  second small man in that unit), like a second TITLE #1; the Scoring Card keeps the whole bill.
- **Badges (item 4):** the board reads the results cards' order (BALLOT_TRAITS: offense, defense, reputation;
  positives, then negatives); the results cards group good tags first (settled, then "?"), then bad (settled, then
  "?"). The "?" question, answered: a "?" role tag DOES count (it fills its role; it has to, since settled tags are thin
  and a settled-only rule would charge 20 of the 32 title teams for a missing role), and a "?" reputation does not (so
  it never shows on a board). So the boards drop the "?" mark and show a "?" role tag like any other; the results cards
  keep "?", where it means "vote on this".
- **The "+" hint (item 5, my pick):** the animated glove and all its machinery (timers, scroll stillness, the
  retire-after-three counter, the `tb-hint` keys) are gone; the owner never saw it again because he taps tags all day.
  The first results card now prints the hint in its own markup (`ballotHintHtml`): a two-ink slip with the white glove
  tapping up at the row, "Know him? Tap (+) to tag him, or tap any tag to vote.", and its "+" breathes the halftone
  ring (`.bt-cue`, now in the markup). Always there; nothing to retire. `node tools/results-qa.js hint [w]` checks it.
- **The home and HOW TO PLAY (item 7):** the "Draft what wins" heading is off the home (a screen-reader h1 stays) and
  the logo leads at up to 400px; Kaman's egg moved to the logo (five taps on the home). The home HOW TO PLAY opens with
  the slogan in the old halftone type, "Five NBA seasons from any era. One 82-game season. Can they go 82-0?", and two
  stamped claims: REAL FIT ("Advanced stats grade how your five play together, not how famous they are.") and YOUR VOTES
  COUNT ("Player tags like ISO-D and CLUTCH change the score. Vote on them after every draft.").
- Copy updated: the rules sheet (ONE BALL, SIZE), the board legend, the Scoring Card rows ("One ball: Your five use 138
  of the ball (L. James 34, K. Malone 33, A. Edwards 31). A five can share 120; each point past it costs 0.3. Somebody
  has to set a screen."; "Two small guards"; "Small frontcourt"), the Tribune notes, the Do-Over receipts, the Daily
  gate's Classic tip, the Daily briefs that quoted 110 or 0.1, how-it-works (page and md).
- Checks: test.js 127 (the v62 checks rewritten, new ones for the rules, the red heights, the meter, the badge order
  and the board keys), style law clean; Chromium and WebKit at 320 and 375 (the home, HOW TO PLAY, the board, the tray
  through five picks, the results hint, the Scoring Card): no sideways scroll, no page errors. Played in the browser
  pane too (red 6'1" Conley after a 6'1" Duhon; the meter preview; the Do-Over board; Presti; the Daily; the Kaman egg).

### Calls he may overrule
- The one-ball dial: 120 free at 0.3 keeps Classic's challenge where he left it. Measured alternatives: 110 at 0.1875
  (82-0 14.4%, 7 title teams pay up to 1.7), 115 at 0.25 (13.3%), 120 at 0.25 (16.3%), 120 at 0.375 (11.4%).
- Presti shows no ball meter (stats from memory); its cards show heights and tags, as before.
- The hint never retires. If it wears on regulars, the cheap dial is to stop the ring after a first vote, keeping the slip.
- "The ball sticks" (two BALL-STOP/BALL-POUND, -2) and the Banjos stay on top of one ball: they price style and
  hierarchy, not volume. But usage now carries the whole one-ball charge, so a five of ball-stoppers pays more usage
  tax than in v62.2, plus the pair. Say if that reads as the same sin twice.
- Tax Season doubles usage and size, not the tag rows (as before v63).

### Deferred, and the guru (item 8)
- **The manual rework** (item 7's "separate manuals more granularly" plus item 8) waits for his go. The expert I named:
  **Celia Hodent**, PhD in psychology, who led UX at Epic Games on Fortnite (before that Ubisoft and LucasArts) and wrote
  *The Gamer's Brain* (2017). Her onboarding method fits our crowded manual exactly: list everything a player must
  learn, rank it by the game's pillars, teach it in that order and depth, and teach it in context rather than up front
  (cognitive load is the enemy of learning). GDC 2016 talk "The Gamer's Brain, Part 2: UX of Onboarding and Player
  Engagement" (gdcvault.com/play/1023231). For the rulebook side, the runner-up is Paul Grogan (Gaming Rules!).

### What to playtest (for the owner, on the preview)
A Classic draft: no 20+ chips; positive tags before red ones; no "?" on the board; the ball meter from the first
player you tap (tap a big-usage star late to see it go red); take a 6'2" guard, then look for red heights on the next
guards. Finish: the first card's hint and ring; the Scoring Card's One ball and size rows. The home: the logo leads;
HOW TO PLAY opens with DRAFT WHAT WINS and the two claims.

### Next, in order
1. His answer to the top question (then merge to main).
2. The manual rework on Hodent's method (item 7's granular manuals), once he says go.
3. Record the tag rows and the v62/v63 taxes on game_complete (a migration: new columns) to watch live firing.
4. TITLE #1 coverage as a rule, if he wants the Banjos airtight (00000t).

## 00000u. (2026-09-28, late morning): V62.2, THE SIMMONS PAIRS, THE STAT PADDERS, THE TAGS LOADED

**The owner's words.** "flavor text on Dueling Banjos is: Took the alphas some time to figure out how to play together
and not just alongside each other. / you load the tags / your pair tax suggestions + -1 per stat padder. flavor text
'Karma for your stat padding sins' / Then handoff, top question for next agent is 'time to go to main, did you
playtest?'"

**Done.**
- Migration 0029 is APPLIED to the live D1 `true82` (2026-09-28, at the owner's "you load the tags"): 464 question
  rows and 464 scout claims (215 yes, 249 unsure), checked live (verdict counts; `op=labels` returns them, e.g.
  Carmelo Anthony 2017 Ball Stopper). The results cards on true82.net show them now.
- labels.json refrozen from the live D1 (`tools/labels-freeze.js`: 10,007 player-seasons, 29,880 tags, 13,200 settled);
  index.html's `<meta name="t82-labels">` is `20260928-tags`. It equals the simulation the pricing used, exactly.
- The Dueling Banjos row now reads the owner's line: "Two TITLE #1s (...). Took the alphas some time to figure out
  how to play together and not just alongside each other."
- The pair taxes (sim-core `labelTaxes`, settled tags only, engine VERSION 12):
  - `stick`, "The ball sticks": two players who hold the ball (BALL-STOP or BALL-POUND; one player with both counts
    once) cost `LBL_STICK_TAX` 2. "Two players who hold the ball (...). It goes in and it does not come out."
  - `hunted`, "Hunted": two HUNTED cost `LBL_HUNTED_TAX` 2. "Come playoff time, they get switched onto every trip."
  - `foul`, "Foul merchants": two FOUL-MERCH cost `LBL_FOUL_TAX` 1. "The whistle disappears in the playoffs."
  - `statpad`, "Stat padding": every settled STAT-PAD costs `LBL_STATPAD_TAX` 1 on his own (the one tag charged
    alone, by the owner's choice; his definition: "decrease his value in the game engine"). "A stat padder (...).
    Karma for your stat padding sins."
- Boards: the five scouted tags show on every board settled only, red (they are `neg` traits; Pro shows none). The
  tray's "Tag taxes:" line lists every combination tax once it fires ("The ball sticks -2 · Stat padding -1"),
  the Banjos included; the roles line lists roles only. The legend and a new REPUTATIONS line in the rules sheet
  spell out the amounts; the Tribune's writer gets each one.
- Off on Tax Holiday (every fit rule off); the ball-holders pair is also off on Iso Week, Two-Way Alphas and The
  Superteam Problem (their copy stacks alphas).

**Numbers (15,144 real drafts; 32 champions).** With the new tags, a tag tax fires on 41.6% of Classic drafts
(Banjos 26.7%, the ball sticks 7.8%, stat padding 4.1%, foul merchants 1.0%, hunted 0.2%). Classic mean projected
wins 77.53 to 77.38 (inside the weekly refresh bar); realized 82-0 now 14.5% (it was 24.2% before v62), expected
wins 76.8 (79.0); Presti 4.1% (5.9%). No champion pays any tag combination tax. All 200 POOL3 Dailies certify;
test.js 119; style law clean; checked in the browser with the real tags (Carmelo '17 BALL-STOP, Reggie '95
FOUL-MERCH, Whiteside '17 STAT-PAD on the board; the tray line; the three Scoring Card rows).

**What to playtest (for the owner, on the preview).** A Classic draft: heights by each position, 20+ chips, red
tags; take a 3rd scorer and a 4th (the tray warns, the Scoring Card charges); take two TITLE #1s (the second is red
first, then the Dueling Banjos row). A Presti board (same chips and heights). A Pro board (no chips, no heights; the
results still charge). A results card: the tags on the cards, the Scoring Card rows.

**Next, in order.** 1. The owner's answer to the top question (then merge to main). 2. Record the tag rows and the
v62 taxes on game_complete (a migration: new columns) to watch live firing. 3. TITLE #1 coverage as a rule (each
champion's #1 plus each MVP) if he wants the Banjos airtight (00000t, known gap).

## 00000t. (2026-09-28, morning): V62.1, THE DUELING BANJOS TAX, AND THE THIN-TAG SCOUTING PASS

**Where things stand.** `main` = v60.1, LIVE. `c-code-clean` = v62.1 (this) on v62 (00000s) on v61.1 (00000r): all
three go live together at the owner's "push to main". Migration 0029 (the scouting pass) was applied later the same
morning at the owner's go (00000u).

**The owner's words.** "yes run the scouting pass for those tags"; mid-pass: "make sure to be ultra stingy about champ
#1 labels - otherwise all this work we're doing to nerf common teams will be undone or even worsened - perhaps not just
player names but also see if we can cut off early/late career too"; then: "yes make title #1 the alpha clash tax but
call it the 'Dueling Banjos Tax' (refer to Bill Simmons numerous comments on that over time on Wade and LeBron - not
'bad' but took a long time to be optimal and figure out how to play together and make each other better instead of
just taking turns)".

### The Dueling Banjos Tax (sim-core `labelTaxes`, row id `banjo`; engine VERSION 11)
- Two or more SETTLED TITLE #1s on one five cost `LBL_BANJO_TAX` 2 (a "?" never counts, like the knuckleheads).
- Why a tax and not the planned +1 credit: 67% of drafted Classic fives already carry a settled TITLE #1 (the desk
  and the crowd have said yes to 94 player-seasons, about 30 of them stars who did not win that year), so a credit
  would have lifted Classic 82-0 from 16.4% back to 18.3%, a quarter of what one ball took. As a tax it fires on 27%
  of drafted Classic fives (5% of Presti) and on none of the 32 champions (no champion has two). Classic realized
  82-0 on real drafts: 16.4% to 14.9%; Presti 4.3% to 4.2%. (Since v61: Classic 24% to 15%.)
- Boards: a TITLE #1 chip shows on every board settled only (like KNUCK; Pro shows none); once your five has one,
  every other TITLE #1 on the board turns red (tone "bad", aria "a second one costs 2"); the tray adds "TITLE #1s: 2,
  -2 (Dueling Banjos)" once it fires; the roles line lists roles only now (`LBL_ROLE_IDS`). The legend and the rules
  sheet's ONE BALL line say it; the Scoring Card reads "Dueling Banjos Tax: Two TITLE #1s (C. Drexler, A. Davis).
  Not bad, just slow: they take turns before they learn to make each other better." (three: "Everybody takes a turn,
  and nobody makes anybody better."); the Tribune's writer gets it.
- Off (0) where a board's copy promises stacked alphas: Iso Week, Two-Way Alphas, The Superteam Problem, Tax Holiday.
  All 200 POOL3 Dailies certify; it moves no board's median bot record more than one win (the bot seldom stacks
  TITLE #1s). test.js 118 (two new), style law clean; checked in the browser (the red chip on Anthony Davis '15 once
  Drexler '92 was on the five, the Scoring Card row).
- Known gap: TITLE #1 coverage is the desk's hand-picked list plus crowd votes, not a rule, so some #1-caliber seasons
  carry it and equal ones do not (Barkley '93 does, Jordan '88 does not). The owner asked for stingy labels, so the
  scouting pass added no TITLE #1 at all; if the gap bothers him, the fix is a rule (each champion's #1 plus each MVP)
  written as desk rulings.

### The scouting pass for the thin tags (migration 0029, NOT applied)
- Five tags: hunted, ball-stopper, ball-pounder, foul-merchant, stat-padder. TITLE #1 was taken away from the scouts
  (the owner's stinginess ruling; the desk already names every champion's number one), and the 18 TITLE #1 lines
  written before that were dropped.
- Method: every draftable player-season (13,986: a whole season over 785 minutes; 2,442 players) in ten era chunks,
  each scouted by a parallel model scout from one brief (docs/scout/THIN-TAGS-BRIEF-2026-09-28.md: the definitions,
  yes/unsure standards, and the desk's earlier rulings as calibration). Yes = the reputation that season is common
  knowledge; unsure = a real, arguable case; silence otherwise (never from the stat line alone). Merged and validated
  (0 errors); any player-season-tag that already has a live question (desk or crowd) was left alone (85), so no twins.
- Result: 464 claims (215 yes, 249 unsure) on 118 players. Yes counts: ball-stopper 109, ball-pounder 31,
  foul-merchant 34, stat-padder 22, hunted 19 (the thin tags go to 132 / 64 / 48 / 34 / 19 settled once refreshed).
  The claims are kept at docs/scout/thin-tags-claims-2026-09-28.json.
- To load: `npx wrangler d1 execute true82 --remote --file=migrations/0029_scout_thin_tags_v1.sql` (notes and the
  check in migrations/MIGRATIONS-NOTES.md), then `node tools/labels-refresh.js` (or the Monday task) freezes them into
  labels.json. Nothing in the scoring reads these five tags yet, so the refresh's balance bar passes as is.

### Pricing the Simmons pair taxes (measured on the refreshed tags, simulated; NOT built)
- Two settled ball-stickers (BALL-STOP or BALL-POUND, a player counted once) -2: fires on 7.8% of Classic drafts,
  Classic 82-0 14.9% to 14.6%. Two HUNTED -2: 0.2%. Two FOUL-MERCH -1: 1.0%. Two STAT-PAD -1: 0.0%; a STAT-PAD value
  cut of -1 per player (the owner's own definition says "decrease his value in the game engine") fires on 4.1%. All
  four pairs together: 8.8% of Classic drafts, 82-0 14.9% to 14.6%. None of the 32 champions pays any of them. They
  are fences with flavor (like knuckleheads), not the challenge; the challenge is one ball, too short and the banjos.
- If they are turned on: add the five tags to BOARD_TAGS (settled only, like KNUCK), rows in LBL_COPY, keys in
  labelTaxes, balance-check with tools/labels-balance.js, re-certify the Dailies.

### Next, in order
1. The owner's go to load 0029 (one command above), then a tag refresh.
2. His pick of the pair taxes (my pick: the ball-stickers pair and the hunted pair, both -2; foul-merch -1).
3. His "push to main" (v61.1, v62 and v62.1 together).

## 00000s. (2026-09-28, small hours): V62, ONE BALL AND TOO SHORT (c-code-clean, NOT main yet)

**Where things stand.** `main` = v60.1, LIVE. `c-code-clean` = v62 on top of v61.1 (the label taxes); both go live
together when the owner says "push to main" (a fast-forward, as for v60). Branch preview: https://c-code-clean.true82.pages.dev/
(the mock database: reads the live tags and data, saves nothing).

**How we got here (the owner's words).** "what taxes can we put in to force actual reasonable team comp? either with our
labels or box score stats (we had not enough rebounding for example) or more creative (we currently have too old; can
we do too short when hights added together or soemthing? I just want cahllenge in these lineup and prlim tests ...
suggests the labels do nothing and i want them to enforce a real working team." After the analysis below: "fix it,
then go with mild, presti too and too short."

### What the analysis found (15,144 real drafts; the starting fives of 32 champions, the '77 Blazers to the '25 Thunder)
- **The v61 tag taxes made 82-0 slightly easier**: taxes fire on 8% of drafts, credits on 13% (Classic realized 82-0
  23.9% to 24.3%). They ask "does anyone on your five have X?", and stars carry every tag (the average Classic five has
  3.3 settled tough-shot makers; a champion has one or two). The credits are the one tag rule that tells real teams
  apart (16 of 32 champions earn one, 13% of drafts), so they stay.
- **Drafted fives already look like champions** in size (both about 6'7" on average: the G-G-F-F-C slots force a
  center), rebounding, rim protection, passing, shooting, DBPM and youth. So every "do you have X?" rule (tags or stats:
  a tougher glass bar, two veterans, one job per player, too short) hits real champions before it hits drafts, and
  moves 82-0 by a point at most. They are fences, never the challenge.
- **The one gap:** 61% of Classic drafts start four or five 20-point scorers; no champion had more than three. In the
  median team pool the best non-scorer is only 1.3 V behind the best scorer, so a 3-point charge makes "star or glue
  guy" a real call (e.g. Giannis '26 or Jrue '21).
- **The live season math** (for any future balance work): Classic rolls 82 games at min(0.991, phi(net/12)); Presti
  is uncapped (app.js sets PG_CAP per mode). Realized 82-0 over real drafts before v62: Classic about 24%, Presti about 6%.

### The rules as shipped (sim-core `scorersAndSize`, the engine; VERSION 10)
- **One ball:** three 20-point scorers (ppg 20.0 or more that season) share the ball free; the fourth and the fifth
  cost 3 net each. Keys `ONEBALL_PPG` 20, `ONEBALL_FREE` 3, `ONEBALL_TAX` 3 (code defaults through C(), like the v61
  keys, so site_data.json and its pipeline are untouched).
- **Too short:** a complete five whose listed heights average under 6'6" (`SHORT_AVG_HT` 78 inches) pays `SHORT_TAX` 3.
  Never on a partial five; a missing height means no charge (fail soft).
- Both apply in every mode (the owner: "presti too"), the Do-Over's verdict included. Today's usage tax stays as it
  was; its Scoring Card line no longer says "One ball" (the new row owns the name).
- **Boards:** a board whose own rule forces a short five or a five of scorers turns that tax off (it would be a flat
  charge on every entry): Short Kings, both Small-Ball Apocalypses, The Small Blind, Height Cap (SHORT_TAX 0); Volume
  Merchants, The Hundred Club, The Superteam Problem, Ball Hogs (ONEBALL_TAX 0); so does a board whose copy stacks the
  alphas with the usage tax off (Iso Week, Gunslingers, Two-Way Alphas). Tax Holiday's copy says every fit rule is
  off, so it zeroes both and, fixed here, the v61 tag rows too. `labelTaxes` no longer prints a "-0.0" knucklehead row
  when a board sets that tax to 0.

### What the player sees
- **Boards:** the listed height by every position ("G/F · 6'7"") and a "20+" chip leading the chips of every
  20-point scorer, in Classic, Presti, the Daily and the Do-Over (always there, whatever mode ran last). Pro shows
  neither (the owner's from-memory rule for its tags); both still count. The (i) legend defines 20+ ("box score") and
  says the heights count. A board with one ball off shows no 20+ chips.
- **Tray** (`trayFitHtml`): speaks up only when a rule is about to bite, one short line each, so the tray stays small at
  320px: "20+ scorers: 3 of 3 free, a 4th costs 3", then "20+ scorers: 4, -3"; with two picks or one left and the five
  under 6'6": "Height 6'3.7" avg, the last 2 need 6'9.5" avg" (or "too short -3" when out of reach).
- **Scoring Card:** "One ball: Four 20-point scorers (D. Garland, K. Malone, K. Garnett, M. Malone). Three can share
  one ball; the fourth costs 3. Somebody has to set a screen." (five: "every one after that costs 3. The ball is never
  coming back.") and "Too short: Your five average 5'9.6". Under 6'6", the other team lives on the offensive glass."
  Each results card's stat line ends with the height ("6'7" HT"; the season line was too narrow at 320px).
- Rules sheet: ONE BALL rewritten, a new SIZE line; the Daily gate's Classic tip and how-it-works (page and md) say
  the same. The Tribune's writer and the Do-Over receipts get both facts.

### The numbers
- Real drafts, realized 82-0: Classic 24.2% to 16.4% (expected wins 79.0 to 77.3); Presti 5.9% to 4.3% (75.9 to
  74.6). One ball fires on 61% of Classic drafts (4 scorers 34%, 5 scorers 28%) and 29% of Presti; too short on 10%
  and 8%.
- **Dodgeable:** the best five a drafter could build from the same deals (every season in the five pools, local
  search) goes 37.0% to 35.6% on 82-0, while the drafts as made go 24.6% to 16.6% (1,500 Classic drafts): the gap
  between building a team and hoarding stars grows from 12 points to 19. That is the challenge the owner asked for.
- Champions: only the '22 Warriors pay (too short, 6'5.6"). Stricter dials measured: every scorer past two at 3
  (Classic 82-0 as drafted 11%, best play 33%; the '17 Warriors and '24 Celtics would pay); 4 each (9%, 32.5%).
- All 200 POOL3 Dailies certify with the new rules (`node tools/daily-audit.js 120 pool3 --labels`, 0 below the bar;
  the biggest median drop is 3 wins, Play Big 69 to 66). test.js 116 (7 new checks), style law clean. Checked in
  Chromium and WebKit at 320 and 375 (no sideways scroll, no overflowing rows, no page errors): the boards, the
  tray through five picks, the results cards, the Scoring Card; the legend and the rules sheet read right.

### The Monday tag refresh (fixed, baa3597)
The v61 tag tools' wrangler helper called itself forever whenever the old local wrangler copy existed (it does), so
`labels-freeze.js`, `labels-balance.js` and the scheduled refresh would have crashed. It now runs the local copy, or
`npx wrangler@4` when that copy is gone or cannot start. Checked: `node tools/labels-refresh.js --dry` froze the live
tags ("No tag changed since the last refresh"), and the balance tool read the real drafts live.

### Next, in order
1. The owner's "push to main" (v61.1 and v62 go together). On the preview first: a Classic draft (heights, 20+ chips,
   the tray at the third scorer, the Scoring Card rows), a Presti board, a Pro board with none of it.
2. The superfan tags (the owner asked which tag taxes a Bill Simmons would lodge that the game misses). They are the
   thin traits already on the tag sheet: HUNTED ("they'll hunt him every trip in May"), BALL-STOP and BALL-POUND ("the
   ball dies in his hands"), FOUL-MERCH ("the whistle disappears in the playoffs"), STAT-PAD ("empty calories"), and
   TITLE #1 as a credit ("has he ever been the best player on a champion?"). Each needs a scout backfill first (the
   original model pass lives outside this repo), then pair taxes balance-checked with `tools/labels-balance.js`;
   HUNTED pairs first: the offense-first superteams the drafts favor are exactly the fives that get hunted.
3. Record the label rows and the two new taxes on game_complete (a migration: new columns) to watch live firing.
4. Swap the rim and creator taxes to tags once the tag versions fire about as often as the stat ones (00000r).

## 00000r. (2026-09-28, early morning): V61.1, THE LABEL TAXES (c-code-clean, NOT main yet)

**Where things stand.** `main` = v60.1, LIVE on true82.net. `c-code-clean` = v61.1 plus the tag tools (`3585f47`),
on the branch preview (https://c-code-clean.true82.pages.dev/, which runs on the mock database: it reads the live
tags but saves nothing). The label taxes go live only when the owner says "push to main" (a fast-forward, as for
v60). A scheduled task, **true82-weekly-tag-refresh**, runs every Monday at 08:41 local (in the Claude app, while it
is open; a missed run fires on the next launch): it runs `node tools/labels-refresh.js` and reports; its first run
may ask the owner to approve running commands.

**How we got here (the owner's words).** (1) "propose taxes based on labels. assume for the moment the player labels
are comprehensive and representative. here's mine: 2 kunckleheads: -2 net (can't have 2 kunckleheads or they might
start hanging out) / no rim protector -2". (2) "no iso d -2, no clutch -1, etc propose the rest and flavor text and
penalty. And asses where the labels being 'comprehensive and representative' is a good assumption and where it will
cause taxes to frustrate players and be unfair". (3) After the assessment and a list of verdicts and fixes: "fully
agreed". (4) After the build: "in pro you dont see the tags til the results screen but they still count the same; and
yes to refresh. thats for handoff, [capture] the nuance".

### The rules as shipped (sim-core.js `labelTaxes` and `engine`; engine VERSION 9)
- **A role nobody on your five fills:** No ISO-D 2; No CLUTCH, No TEAM-D, No RIM+, No TSHOT 1 each.
- **Knuckleheads:** two settled KNUCK cost 2, three or more cost 3 ("They'll start hanging out").
- **Credits:** Switch everything (3+ settled SWITCH) +1; Somebody passes to the cutters (a settled PLAY and two
  settled OFF-B on three different players) +1.
- **Rim protection and No creator** keep their stat rules; a RIM-P or PLAY tag (even a "?") clears them. They never
  fire more than before, and a board that pays a BONUS through them (Five-Out, a creator board) is never touched.
- Each amount is a board key (`LBL_ISO_TAX`, `LBL_CLUTCH_TAX`, `LBL_TEAMD_TAX`, `LBL_RIMPLUS_TAX`, `LBL_TSHOT_TAX`,
  `LBL_KNUCK_TAX_2`/`_3`, `LBL_SWITCH_CREDIT`, `LBL_CUT_CREDIT`; 0 turns one off on a Daily).
- The Scoring Card prints a row per tax and credit in the owner's copy (knuckleheads and credits name the players),
  the rim and creator rows add "and nobody is tagged RIM-P / PLAY", and a note under the card: "Tag rows read the tags
  as of <date>. Think a tag is wrong? Tap it on the card above and vote." The Tribune's writer gets the same facts.

### The nuance (why each rule is the way it is; keep these when changing anything)
1. **Tags price fit, never value.** A player's worth is already his V (BPM). So tags only charge for a role nobody
   fills or a bad combination, and only pay for a fit. Never tax or pay a single good or bad tag on its own.
2. **The doubt goes to the drafter.** The scout left 16,451 calls "unsure" against 12,770 "yes". Counting "?" as "no"
   would tax 28% of good lineups for No ISO-D, 22% for No CLUTCH, 25% for No RIM-P, mostly for the tags' indecision.
   So a "?" FILLS a role. The other way round for penalties and rewards: knuckleheads and both credits count SETTLED
   tags only (a "?" never costs you and never pays you).
3. **You see what you will be taxed on**, before the taxes can bite: every board (Classic, Presti, the Daily, the
   Do-Over) shows the scored tags (roles, RIM-P, PLAY, a settled KNUCK; a "?" one hollow with its "?"), each board's
   (i) legend says what they cost, and once two picks are left the tray says "Still missing: ISO-D -2 · CLUTCH -1".
   **The one exception is Pro, by the owner's ruling:** Pro is played from memory, so its board, tray and legend show
   NO tags until the results screen, and the taxes still count the same (the Pro-based "Blind" Dailies follow it).
4. **Votes never move a score mid-week.** The engine and the boards read `labels.json`, a frozen snapshot, refreshed
   weekly and live only on the owner's word (so the Daily, "Challenge a friend" and shared results stay comparable,
   and nobody votes a tag off their own team). The results wait up to 2.5 s for the file; no file = no label taxes.
5. **Stat taxes swap to tags only once calibrated.** On real lineups the stat rim rule fires 3%; a tag-only rim rule
   would fire 25% (10% counting "?"). Until they fire about as often, tags may only clear the stat rim and creator
   taxes. Watch "a tag cleared the stat rim tax on X%" in the balance output.
6. **Thin tags are never taxed.** HUNTED (0 settled), STAT-PAD (13), FOUL-MERCH (13), BALL-STOP (23), BALL-POUND
   (about 30) and TITLE #1 (about 97) were never in the scout backfill, so a tax on them would only hit the famous
   players the desk argued about (a notoriety tax), and "No TITLE #1" would hit 46% of good lineups (a fame tax).
   They wait for a scout backfill; then TITLE #1 becomes a +1 credit, not a tax. SWITCH and OFF-B are era-bound (70s
   and 80s lineups lack SWITCH 84% of the time vs 30% modern), so they are credits only, never taxes.
7. **Balance must not drift.** Every change is scored on the real drafts (`tools/labels-balance.js`); if average
   records move, re-price or re-center, never ship blind. v61 needed no baseline change.
8. **KNUCK is about real people** (arrests, suspensions): as a tax it should stay limited to documented incidents.

### Calls made the owner may overrule
- The cutters credit needs TWO off-ball scorers: the agreed "PLAY plus one OFF-B" fired on 49% of real lineups (a coin
  flip that lifted Classic 82-0 projections from 37.6% to 40.4%); two fire on 12%. One line in `labelTaxes` reverts it.
- The tray line appears only once two picks are left (earlier it would list nearly every role).
- A tag refresh is data, not a build: `labels.json` plus the `<meta name="t82-labels">` in index.html (HTML is never
  long-cached); BUILD_V and the code cache keys stay put.

### The numbers (for recalibrating later)
- Tags: 29,221 scout claims over 12 traits (2026-09-03, "claude-opus-5 medium"), 488 desk rulings, a few hundred crowd
  rulings. labels.json: 9,975 player-seasons, 29,416 tags (12,985 settled, 16,431 "?"), 40 KB gzipped.
- Coverage: the pool's best fifth by value 97% tagged, the bottom two fifths 28 to 44%; flat by era (59 to 68%).
- Real drafts (15,130 on standard boards): Classic mean projected wins 79.60 -> 79.57, 82-0 projections 37.6% ->
  38.3%; Presti 76.47 -> 76.43, 1.9% -> 2.4%; 85% of lineups unchanged, 2.2% down 3+ wins (worst -11). A label tax
  fires on 7.7% of Classic and 10.3% of Presti lineups. All 200 POOL3 Dailies certify with the tags on.

### Tools (all in tools/, headers say how)
- `labels-freeze.js`: the snapshot (one read-only SELECT through wrangler; falls back to `npx wrangler@4`).
- `labels-balance.js [--old <labels file>]`: real drafts, before vs after (no tags, or an older snapshot).
- `labels-refresh.js [--dry]`: the weekly job (branch and clean-tree checks, freeze, stop if nothing changed, then
  test.js, the week-over-week balance bar (mean wins within 0.5, 82-0 projections within 2 points, Classic and
  Presti) and `daily-audit.js 120 pool3 --labels`; all pass: commit "Tags refresh <date>" and push c-code-clean;
  any fail: restore and say why). NEVER pushes main. Dry-run checked end to end (about 100 s).
- `daily-audit.js ... --labels` scores with the tags. `results-qa.js` (results, sheet, glove, room) for the UI.
- The local site with its API: `.claude/launch.json` entry site-api3 (:8791; its D1 state lives in this session's
  scratchpad and can vanish: copy any older session's `state/` to recreate it).

### Next, in order
1. The owner's "push to main" for v61.1 (look at the preview first: a Classic draft's board tags and tray line, a
   Scoring Card with tag rows, a Pro board with none).
2. Scout backfill for the six thin traits (the same model pass as 0026, a migration into trait_scout_v1, a refresh),
   then turn on their taxes (proposed: two HUNTED -2, two ball-stickers -2, two STAT-PAD -1, two FOUL-MERCH -1) and the
   TITLE #1 +1 credit, balance-checked first.
3. Record the label rows on game_complete (needs a migration: a new column) to watch live firing rates.
4. Swap the rim and creator taxes to tags once the tag versions fire about as often as the stat ones.

## 00000q. (2026-09-27, night): V60 AND V60.1, THE OWNER'S TEN ITEMS (LIVE ON MAIN)

**The owner's words** (a numbered list, "let's do these changes to ccode-clean to start off"; he allowed deferring
some for quality; none were deferred). Built, tested and pushed on `c-code-clean`, then LIVE: main fast-forwarded to
`612b7ee` the same night at his "push to main". From that deploy on, only true82.net writes to D1 (item 8).
Branch preview: https://c-code-clean.true82.pages.dev/ (which now runs on the mock database, item 8).

1. **"buttons ... with a white accent to create 3d-ness ... change to darker hues of the buttons current color"**.
   Every stacked neon button now stands on two deeper cuts of its own ink: the first slab 72% of it over black, the
   base 40% (pink over dark magenta over plum, aqua over teal over deep teal, green the same way). Done the lab's way:
   `docs/reprint-lab/src/system/60-depth.js` has a third `depthBase`, "shade" (console: "Own shade"), the Heat Vice
   preset uses it, look.css carries exactly what the component generates (checked in a browser against
   `LAB.componentCSS`; the recipe code in look.css's header decodes to `depthBase: "shade"`; the old-phone fallback
   is the neon over black). The hand-built copies in styles.css (the Tribune's under-buttons, the Do-Over's PICKUP and
   PRO doors) use four new theme shades: `accent-slab`, `accent-base`, `offset-slab`, `offset-base`
   (tools/theme-core.js, STYLE-GUIDE.md). The lab file `docs/reprint-lab/reprint-lab.html` is rebuilt
   (`node src/build.js <snaps>` with the v51 snapshots in the 72399d8d scratchpad's `snaps`).
2. **"the 'painting' ... make sure we're using all (3?) of them"**. There are three: golden (59+ wins, a gold sun),
   dusk (37 to 58, an orange sun) and night (36 or fewer, a moon). Since v52 the lab found no warm ink of its own for
   Vice's dusk and fell back to the sun's gold, so golden and dusk printed alike and the owner only ever saw two.
   `print-dusk` is now a sunset orange, `#FF7F3A` (theme-core ROLES, and pinned in the lab's vice palette as
   `print: { orange: "#FF7F3A" }` so `LAB.drum("vice")` gives it too). Call made: the orange sits clear of both the
   gold and the red that means bad.
3. **The mountain fills left to right** (results-riso.js `derive` `fillX`, `levelClip`, `drawLevel`, the reveal in
   `mount`): the color runs in from the frame's left edge and stops wins/82 of the way across (82-0 fills it all,
   80-2 leaves a sliver on the right as an empty outline over a dry lake). The fill's front is a thin upright line of
   the light ink. The reveal: the season line draws across, then the color sweeps in from the left (0.85 s), then the
   names land. `composeTo` clips now take a list of rects (the land fills from the left while the strip under it
   prints across with the season). The share poster and `T82PRINT.print` follow.
4. **The glove on the results "+" "pretty much never worked if you're scrolling"** (app.js "the glove"). It was a
   fixed-position hand placed from one snapshot of the page and killed for good, and marked seen, by the first touch
   anywhere, so a scrolling thumb ended it before it played. Now the hand rides INSIDE a card (it scrolls with it) and
   plays on whichever card is most on screen (60%+) once the page has held still 550 ms; a scroll calls it off and it
   replays when the page settles. It retires for good when you tap a tag or a "+" (`tb-hint`), or after three full
   plays, one per results screen (`tb-hint-n`). Until then the first card's "+" breathes a halftone ring. The tag and
   "+" are found afresh at each step (the labels can re-render mid-play).
5. **The "+" sheet shows every trait and removes as well as adds, no YES/NO step** (app.js "v60 THE TAG SHEET",
   `ballotSheetTiles`, `ballotTileState`, `ballotToggle`, styles.css `.bt-tog`). Title "Edit his tags"; every trait the
   "+" offers plus any other tag on the card, in the Offense / Defense / Reputation groups, in trait order (a tile never
   moves). Lit = on his card for you: the card's own chip, a ring and wash in its ink, a check in the corner; unlit =
   dashed, the chip hollow, a "+" in the corner. The last line of each tile says what a tap does ("On his card · tap to
   remove", "Tap to add", "Unsettled · tap to take it off", "The engine's call · tap to dispute", "You took it off ·
   tap to put it back"). A tap is the vote at once (YES lights it, NO takes it off); the card behind follows; the chip
   stamps on with its second ink off register and the ink print rings it (or lifts off); the crowd's count lands on
   the tile ("64% say yes · 37 votes"). Quick toggles on one tag ride the vote still waiting to go (one post). A tile is
   `.bt-tog`, not `.bt-tile`, because look.css paints `.bt-tile` as a neon plate. The card's own tags still open the
   full question (YES / NO / NOT SURE, the tally). The owner, right after the merge: "make sure TITLE #1, BALL-POUND,
   FOUL-MERCH are offered in all aspects the same as the other traits": every core trait now carries `pick: 1` in
   BALLOT_TRAITS (18 tiles; the old four-negative ceiling is gone); all three are core on the server, so a first vote
   creates the question like any other (checked: votes land, the card shows them). The server's op=roster lane still
   has its own short trait list, but no client calls it since v50. Under a settled
   GRAVITY the 3PT tile stays put, lit, reading "Comes with GRAVITY" (a tap nudges and says "Take GRAVITY off
   first"), since the card never prints both; a settled tag you take off stays on the card hollow with an X (the v50
   ballot rule: the dispute stays readable), so say the word if removed tags should vanish from the card instead;
   the "Every tag, spelled out" link left the sheet (every tile carries its definition).
6. **"scoring card tallying up team value overflows over the bottom border"**: the shaded total row's square corners
   painted over the card's rounded border. `.ledger` now clips to its corners (`overflow: hidden`).
7. **Past questions on the home card** (app.js `tmExcludeIds`, `tmSessionLoader`; functions/api/traits.js op=session).
   Causes: the day's featured call re-led every fresh card until it was answered; a call shown and left unanswered
   was never remembered; only the last 48 answers rode along; passes (IDK) write nothing server-side. Now every call
   on screen is remembered (`t82TraitsShown`, next to `t82TraitsSeen`), the newest 150 of both ride along, the
   featured call leads only if this device has never shown it, and only when that leaves nothing does the deal fall
   back (answered only, then the server's own two-answer ceiling). The server takes up to 160 exclusions and skips
   them in code (D1's bound-parameter limit is 100). /bonuses/ keeps the same two lists.
8. **"a mock database ... I only want any reads on /avocado from traffic originating at the specific domain
   true82.net"**. Events never recorded their site (the `host` column is a link-out's host), so history cannot be
   split; from now on only true82.net writes. `functions/_middleware.js` sets `context.data.mockDb` for every host but
   true82.net, www.true82.net and local dev (localhost, 127.0.0.1, *.localhost). On a mock host: /api/event,
   /api/retention, /api/identity (coverage), /api/games (the KV counter), votes (/api/traits POST replies with the real
   standing tally plus this vote, nothing written), and Tribune publishing and view counts (/:id, /r/:id) are all
   accepted and dropped; every read still comes from the real D1, so previews look real. /avocado says so in a line at
   the top. The footer reads "v60 · test server, nothing saved" on a mock host. If the middleware ever did not run,
   writes land (production never fails closed). Consequences on previews: your votes are not remembered between loads
   (the device lists still keep repeats away), and a published Tribune link does not open there.
   Checked on the local server: a vote sent as `Host: c-code-clean.true82.pages.dev` returned the mock reply and left
   the local D1 at 80 votes; the same vote from localhost wrote (81).
9. **KEEP GOING after five home votes opens /bonuses/** (`tmAgain`: `/bonuses/?src=home_more&n=5`; `home_more` is a
   new vote source in traits.js SOURCES). The page carries the count on ("05 votes cast") and deals past the five.
10. **The vote room** (bonuses/index.html, "v60 THE VOTE ROOM"; the owner: "bigger stylistic swings"). The masthead
   PLAYER BONUSES prints in two inks; a VOTES CAST counter (from the home card's n) and the set's five ink diamonds
   sit over the card, which stands on a halftone offset shadow (solid, overriding look.css's see-through outline card).
   A vote slams its answer onto the card the instant it is tapped: a tilted two-ink rubber stamp (YES aqua, NO pink,
   UNSURE grey) with a big halftone ring, 16 ink drops and a card jolt; it lifts as the result prints: the percent
   slams in two inks and counts up, the verdict chip stamps on at a tilt, the tally bar rolls in like ink, the diamond
   prints and the counter ticks. The fifth vote re-inks the row and prints the running total ("10 VOTES IN") with its
   own ring and drops, then VOTE ON 5 MORE. Reuses styles.css's keyframes (rdpSlam, rdpPlate*, rdpRing, rdpConf,
   rdpShake, ink-*) and a twin of app.js's inkPrint. prefers-reduced-motion gets the end states. `html` clips sideways
   overflow (the rings fly past the edges).

**Checked:** Chromium and WebKit at 320 and 375: a Classic season to results (the painting, the fill, the Scoring
Card, the buttons), the tag sheet (add, remove, tallies, no overflow at 320 in WebKit), the glove under simulated
thumb scrolling (no hand while scrolling, plays on the card in view after, survives into the next results screen,
retires on a real "+" tap), the vote room frame by frame (stamp frozen at 90/180/320/600 ms), the home flow
(`node tools/home-qa.js flow`: five votes, Finish, KEEP GOING lands on /bonuses/ with the count at 05 and the deal
skipping all five), `home-qa.js widths` (no sideways scroll at 320 to 440 in both engines), the draft and Do-Over
buttons. test.js 102 (4 new tag-sheet checks), style law clean. New: `node tools/results-qa.js results|sheet|glove|room
[width]` (the local site with its API, e.g. `.claude/launch.json` site-api3 on :8791; header says how) replays these
checks; `tools/home-qa.js flow` now follows KEEP GOING into /bonuses/.

**For the owner to try on the preview:** a Classic season (the buttons' new bases, the painting and the fill, the
Scoring Card's corners); on YOUR FIVE, wait a beat without scrolling (the glove), then tap a card's "+" and toggle a
few tiles; five votes on the home card, then KEEP GOING (the vote room). Test servers no longer save anything.

## 00000p. (2026-09-27, 18:15 MDT) V59.6 IS LIVE ON MAIN

The owner, after playtesting the branch preview: "all good. prep the handoff so when it's read it's pushed to main.
playetsted and we're g2g". Done: `main` was fast-forwarded to `c-code-clean` (v59.6; main had no commits of its own) and
pushed, so true82.net deploys it by itself within minutes. From here, `main` and `c-code-clean` are the same line; keep
working on `c-code-clean` and merge only on the owner's word.

**What went live with it** (v47 to v59.6): everything in sections 000 to 00000o: the riso results and tag ballot
(v50), the style system and Heat Vice (v51 to v52), the owner's tweak list (v53 to v57), THE REDRAFTED as Draft
Night Do-Over with its real drafts (v55, v58, v59), the Daily archive (v56), the 200 new Dailies (POOL3), the new
home (v59), the ink prints in the drafts (v59.1, v59.2), the steady Do-Over board, the month captions and the
Tribune's one door (v59.3), the ΣV (v59.4 to v59.6).

**The database is ready for it:** 0026 (his scout labels), 0027 (Hunted) and 0028 (accent names) were applied to
D1 `true82` the same afternoon (section 00000k; the check read scout_yes 12770, scout_unsure 16451, hunted 1,
unaccented 0, homepage 104).

**Timing:** merged Sunday 2026-09-27 at 18:13 MDT, before `START3` (Monday 2026-09-28, Daily #79), so POOL3 starts on
the day planned and no archive day is rewritten. (A player already past midnight elsewhere, UTC+6 and east, saw
Monday's #79 from POOL2 for a few hours before the deploy landed; the archive shows POOL3's #79 for that day.)

**First checks on true82.net after the deploy** (for the next session, or the owner): the footer reads v59.6; the
home shows "Draft what wins" and votes in place; a Classic draft prints its coins and diamonds; results end with
"See the Tribune article"; `https://true82.net/api/traits?op=labels&players=Kawhi%20Leonard~2019` returns scout
tags (s:1).

**Still open (the owner's, none blocking):**
- A small server fix in functions/api/traits.js op=labels: names with a non-ASCII capital (Şengün, İlyasova,
  Marčiulionis, Šarić, Abrines; 69 scout labels) never match (SQLite lower() is ASCII only). Section 00000k.
- The iPhone SE toolbar spacing on the home (the vote buttons need a short scroll in Safari; section 00000l).
- The favicon rework (00000g), the art bot clips in the ceremony (00000j, shelved for this ship), the deferred brief
  items (00000h), branch previews sharing the production D1 (a Cloudflare setting).

## 00000o. (2026-09-27, late) V59.4, the styled sigma on the aggregate value

The owner: "Add a styled sigma sign to the aggregate player value on the results screen." The aggregate is the
Scoring Card's Raw talent row (the sum of the five cards' V). Its amount is now "ΣV 12.7": a riso Σ in the display
face (the pink key with the aqua plate a hair off register), the V small like the cards' V, the total in the display
face (`.ledger-sum` in styles.css; `resultsLedgerHtml` in app.js). The label is plain "Raw talent" now (the ΣV moved
to the number). The number keeps its own `.ledger-amt` span, which test.js's ledger check reads. Checked at 390 and
320. Keys: styles.css and app.js at `20260927-sigma-v59-4`, `BUILD_V = "v59.4"`.
v59.5, the owner: "Also to each player card pls". Each results card's V (`.rr .bt-val small`) is printed the same riso
way (the pink key in the display face, the aqua plate off register). Call made: the cards keep a V, not a Σ (one
player is not a sum; the total's ΣV reads as the sum of the cards); swapping the glyph is one character in app.js.
styles.css at `20260927-sigma-v59-5`, `BUILD_V = "v59.5"`.
v59.6, the owner: "just use the exact same thing we use for the team aggregate sigma+v? Even if it does[n't] fully make
sense". Each card now wears the Scoring Card's ΣV exactly (`.rr .bt-val .sigma` plus the small mono V, the same values
as `.ledger-sum`). Keys `20260927-sigma-v59-6`, `BUILD_V = "v59.6"`.

## 00000n. (2026-09-27, late) V59.3, a steady Do-Over board, new month captions, the Tribune's one door

**The owner's words** (a voice note, "don't necessarily take it word for word"): (1) in redraft mode the board must
not "abruptly jump" when you select a player or change his year: "no menu abruptly jumping until a player's fully
selected off the board"; in the game-by-game screen, keep the gap under each month's W/L dots but make its text
bigger, drop "the flavor about them doing well", and put either the sweep stamp or "the reason you lost ... one of
the reasons assigned to a player" there. (2) "keep the tribune but just put it at the very bottom result screen under
run it back ... see the tribune article ... its own like special color button", one tap and the paper unfolds right
away and works as normal; the "mandatory trivia" (read as: the mandatory Tribune) only through that button; "not
offered in any other modes, as a global setting (undoing where we have it in many modes right now)" (read as: never
a gate anywhere).

**What changed:**
- The Do-Over board (`sdRepaintRows`, `sdViewAnchors`, `sdKeepAnchors`): a tap on a player or a season change
  repaints only that row (and the previous selection) and the tray; the board element, its scroll and an open season
  menu are never rebuilt. The jump did not reproduce headless (positions were identical), so the cause is likely the
  iPhone rebuilding a focused native menu; not rebuilding removes it either way. A full re-render (a pick, a rival's
  clock) now re-pins the rows in view by name instead of restoring a raw scrollTop: a player leaving the board above
  you moves your view 0 to 1 px (it was a full row).
- The reel (`closeMonth` in app.js, `reel-riso.js` `closeMonth`): the month's note is the SWEPT stamp on a sweep (it
  moved from the month's header line into the gap; reel-riso only slams it) or `reelBlameHtml` (one of the losses
  pinned on one of your five, the name in the loss ink), 15.5 px, the gap a fixed 26 px so nothing shifts when it
  fills. `reelLine` (the mood lines, the "zero died in" line) and `firstLossNow` are deleted.
- The Tribune: never a gate. `showResults` stages the payload only (no model call); a drafted 82-0's W/L burst fires
  on its own (it used to wait for the paper); the post-Heat-Check auto-paper (`maybeShowRecap`) is gone; the results
  end with `#tribuneBtn` "See the Tribune article" under RUN IT BACK (Classic, Presti, Pro, the Daily; not Kaman or
  the Do-Over, which never had it), a newsprint button (paper stock, the masthead's double rules, the Tribune's serif,
  a stack of papers under it). `openTribune()` opens `showNewspaper(true)`, which unwraps at once (the tap is still
  the deliberate act that requests the AI edition and publishes the link); the paper's under-buttons read BACK TO
  RESULTS and RUN IT BACK, and the door stays for a reopen (the printed edition shows straight away). The print's
  cover check is just "an overlay is up" (`resultsPrintCovered`). The `.np-gate` styles are deleted.

**Checked:** the board in Chromium and WebKit (select, year change, a simulated rival pick above the view); a full
Classic season through the reel (captions: blame lines and SWEPT stamps) into results (no paper), the door, the
unfold, back to results; test.js 98, style law clean. Keys: styles.css, app.js and reel-riso.js at
`20260927-tribune-v59-3`, `BUILD_V = "v59.3"`.

## 00000m. (2026-09-27, night) V59.1 and V59.2, the ink print in the drafts

**The owner's words.** On v59: "Omfg LOVE LOVE the new 'diamonds' to fill on the start screen widget. Can we bring
that energy and style to the draft animation so it strongly matches that and the game by game screens energy?", then
"I kinda meant the redraftables player drafting ceremony animation but finish this too". Both are built, on
c-code-clean (not main).

**The shared piece.** The home card's diamond print is now one component: `.ink-dias` (a row of diamonds; `i.on` on
the home card, `span.done` / `span.now` in the draft bar), `inkPrint(host, mark, variant)` in app.js (the mark's stamp
plus a two-ink halftone ring and six drops, as `<b>` elements so a row's own `> i` / `> span` rules never style them;
variants "" one mark, "big" rings the whole row, "token" coin-sized, "slot" for a Do-Over roster slot), and the
`ink-*` keyframes. The home's reduced-motion rule still covers it there (`.hm *`); the game ignores the OS flag as
always (`prefersReduce`).

**v59.1 (`75aadc5`), THE PICK PRINTS** (Classic, Presti, Pro, the Daily): drafted tokens in the tray are riso coins
(the pink key with its halftone screen over an aqua offset crescent; `#app#app` outranks look.css's token rule; the
moving and swap-target states keep working). Each pick prints its coin in the tray and its diamond in the draft bar
(`G.inked` set in `confirmPick`, printed by `draftInk()` at the end of `renderDraft`; the reels settle at about 1.1 s,
after the 0.6 s stamp). The fifth pick is `draftFinale()`: the fifth coin prints, the five re-ink left to right, the
bar's diamonds ring as a row, the count reads LINEUP SET, the board takes no taps (`body.ink-finale`), and the season
plays 0.95 s later (EXIT RUN in that beat wins: the timer checks it is still this game on the draft screen).

**v59.2, THE PICK IS IN in riso** (the Do-Over's `sdPickShow`; the chime and its timing unchanged): the neon grid
floor is a halftone court (two plates of dots rushing toward you), the spotlights are halftone beams, the flashbulbs
are gone, the kicker lands with its inks split and snaps into register, the pick's number stamps in a riso diamond
(`.rdp-dia`, `d1`/`d2` on the chime's third phrase, then `inkPrint` rings it), the name prints like the home tagline
(a cream key with pink and aqua halftone copies from `data-ink` that land off register and snap in; the neon flicker
is gone), the hit throws a two-ink halftone ring and round ink drops (no gold: a pick is not a gain), the room's one
beat is a dot-screen wash at a third of full strength, and the landing slot on your roster card prints (its stamp
plus a slot-sized ring). A snake double prints both diamonds and both names in turn.

**Checked:** frames frozen or timed in Chromium and WebKit (a normal pick, the finale, a single and a staged double
ceremony), Presti and Classic through LINEUP SET into results, the home flow, no page errors, test.js 98, style law
clean. Keys: styles.css and app.js at `20260927-pickink-v59-2`, `BUILD_V = "v59.2"`.

## 00000l. (2026-09-27, evening) V59, the new home screen ("Halftone v2")

**The owner's words.** He sent a redesign package (`~/Downloads/true82-home-handoff.zip`: HOMESCREEN_HANDOFF.md,
three PNGs, a reference HTML) and: "as always, don't follow spec strictly, make the artsitic and creative choice
nessecary for it to look amazing artistically and stlyistically but not migrane-inducing overly busy". Built on
c-code-clean as v59; NOT on main (he says "merge to main"; merging today keeps `START3`).

**What the home is now** (app.js `renderIntro`, styles.css "v59 THE HOME"):
- The masthead art unchanged but at the mock's size on the home only (`body:has(#app#app > .hm)`: min(300px, 80%),
  no rule under it; a browser without `:has()` keeps today's masthead). Then "Draft what wins" (the display face,
  cream, over a pink halftone copy of itself 4px off register; replaces "Go 82-0" and the paragraph; five taps on it
  still start Kaman), then "How to play" as a small underlined link with a book icon (opens the same sheet).
- Four two-line doors (name in `--t-disp`, a plain line under it), each on a dotted halftone offset shadow (a
  wrapper `.hm-ht::before`), no emoji, in three tiers: Classic (pink, the only glow, a slow 5.5 s neon breath),
  Presti mode and The Daily #N (pink, aqua), Draft Night Do-Over (quiet aqua). Copy is the mock's. The Daily's line
  is the board's name, plus " · N-day streak" at 2+; once played the door reads "THE DAILY #N ✓ 64-18" with
  Challenge a friend · Run it back (share first, as before).
- The vote card (`traitsModuleHtml` and the TM block): ask (name, "2023–24 · Pacers", the trait as a short
  question), then in the same card the tally bar (two inks: aqua yes from the left over a pink no track), the call
  ("41% say yes · Still disputed", "NN% say yes/no · Settled" at the server's real 62%/38% and 25-vote floor, and
  under the floor the majority side with "N more to settle"), "You said yes/no" / "You passed", NEXT QUESTION (FINISH
  on the last), the share link; then "That's five. Thanks for balancing the game." and KEEP GOING, which deals a
  fresh set in place. Nothing auto-advances and nothing navigates (the old VOTE ON 5 MORE and the error fallback
  both left for /bonuses/; a failed vote now stays with "That vote didn't save. Tap it again.").
- Diamonds and the reward (owner: heavy riso fill, a fun dopamine beat per vote, the fifth bigger): a filled diamond
  is a two-plate print (the pink key with its halftone screen, the aqua plate a hair off register). Each vote: the
  key plate stamps down, the aqua plate lands off register and snaps in, a ring of halftone dots rolls out in both
  inks with six ink drops, the % counts up and the bar rolls in like an ink roller (wet dots drying). The fifth:
  the row re-inks in a wave, a bigger ring around the whole row, the card title splits into its two inks and snaps
  back. Under 1 s, no flashing, NEXT never held. `prefers-reduced-motion` gives the end state at once (the home
  only; the game still ignores the OS flag on purpose, see `prefersReduce`).
- "Daily archive" (was Past Dailies) is a quiet link under the card; the archive's title and the gate's and
  results' buttons say Daily archive too.
- The rename: THE REDRAFTED is Draft Night Do-Over on the home door, the gate and mode headers, the share text
  ("TRUE 82 · DRAFT NIGHT DO-OVER · 1984") and the podium ("You win the Do-Over"). Ids, classes, analytics names
  and `?redraft=` links are unchanged.

**Calls made (owner may overrule):** the site's own faces (Big Shoulders Display, Rubik) instead of the mock's Bebas
Neue and Outfit, as the handoff allowed; every color a theme token (the mock's palette already was the theme);
three trait questions read in the ballot's words ("Gravity shooter?", "The #1 on a title team?", "Hunted on
defense?"), the rest are the trait's name ("Team defender?"); the desk's longer sentences no longer show on the
home card (they still ride the share text); IDK stays a pass (nothing written) but shows the standing tally
read-only and fills a diamond; the team comes from the desk's metadata line or, for the other 470 of 565 curated
calls, the game's own data once site_data.json lands (`tmTeamFor`, `tmDataReady`), never a guess; KEEP GOING never
re-pins the day's featured call once this browser has answered it (a pin overrides the server's answer ceiling);
the card's title is no longer a link to /bonuses/ (the footer's Player Traits link remains).

**iPhone SE.** At 375x667 the vote buttons sit at 614 to 660 px (on the physical screen). In Safari with its
toolbars (about 553 px) they need a short scroll. The handoff's optional short-screen tightening is NOT done (his
call, pending).

**Checked:** `node tools/home-qa.js` (new; widths, frames, flow, calm, played): no sideways scroll at 320, 375, 390
and 440 in Chromium and WebKit; no home button carries the decorator's `presti-spin` (all are `.tm-flat`); five
votes, Finish, Keep going with the URL unchanged; reduced motion; the played Daily. Every door launches its mode,
How to play opens, no console errors. test.js 98, style law clean. The old Daily plaque, vote module and intro
header CSS are deleted from styles.css (dead with this markup). Keys: styles.css and app.js at
`20260927-home-v59`, `BUILD_V = "v59"`.

**Still open from earlier today (00000k):** the non-ASCII capital bug in traits.js op=labels (Şengün and four
others); offer it before the merge.

## 00000k. (2026-09-27, afternoon) ship the base game today; the database audit

**The owner's call.** "let's shelve those animations just for today - gotta fix the base game for now since we
need to fully ship by EOD." The art bot (00000j) waits; do not render or wire clips today. His plan for this
session: the database first, then "UI tweaks", then "merge to main" (merging today keeps `START3` at Monday
2026-09-28; see 00000j).

**The database, audited (read-only, through true82.net's own API; nothing was written).** He asked what was
missing from the migrations, including "the mass addition of player labels i generated previously". Findings:
- His generated labels ARE 0026: `~/Downloads/0013_scout_claims.sql` (2026-09-04) is byte-identical to
  `migrations/0026_scout_claims_v1.sql`. Not live: 2 of 29 sampled scout-only rows exist (made by the live roster
  lane), and the preview's op=labels shows no scout layer.
- Live already: 0006 to 0025, each checked by its own mark (list in migrations/MIGRATIONS-NOTES.md, "PRODUCTION
  STATE"). 0025, the 24 homepage polls from accounts-test, was live all along (the deferred list in 00000h said
  otherwise); its file is now in `migrations/` as repo truth. 0014 cannot be seen from outside: GO-LIVE step 7's
  homepage count settles it (104 with it, 84 without).
- Left, in order: 0026 (his labels), 0027 (Hunted), and **0028 (new, `0028_accent_names_v1.sql`)**: 27 curated
  rows spelled Dončić, Jokić, Ginóbili, Kukoč and Stojaković without accents, so their 22 desk rulings and their
  community votes (Jokić 2023 Team Defender 40 votes, qualifies; Dončić 2024 Off-Ball Scorer 37, ruled out...)
  never reached a card. Renames player_name only; tested on a local SQLite copy of 0010 to 0028, reruns clean.
  The two id spaces behind it (hand-folded curated ids vs the game's dash ids, `nikola-joki-...`) are written up
  in MIGRATIONS-NOTES.
- `docs/GO-LIVE.md` is rewritten as the one checklist: wrangler login, `d1 list`, 0026, 0027, 0028, one check
  command (expect scout_yes 12770, scout_unsure 16451, hunted 1, unaccented 0, homepage 104).
- 0026's largest statement is 29 KB (D1's limit is 100 KB). None of the three changes what v47 serves: its roster
  lane uses a fixed trait list and skips non-ASCII names, and its labels never read the scout table.
- The branch preview and true82.net read the same D1 (identical tallies).
- 0001 to 0003 (accounts, leagues) belong to accounts-test and item 17; 0021 and 0022 were code-only deploys.

**DONE the same afternoon:** the owner ran 0026, 0027 and 0028 on the production D1, which is named **`true82`**
(id c3c2ac73-9128-41d9-b37b-3cc8ec28d2e8; wrangler is signed in on his Mac). The check read scout_yes 12770,
scout_unsure 16451, hunted 1, unaccented 0, homepage 104 (0014 was in). Every migration through 0028 is live. The
preview's op=labels now serves scout tags (Kawhi 2019: 3PT, Tough Shot, Team D, Switch, Clutch) and Jokić 2023's
crowd and desk rulings. Left before go-live: the UI tweaks, then "merge to main".

**Found, not fixed (code, not a migration).** functions/api/traits.js op=labels compares SQLite `lower()` (ASCII
only) with JavaScript's `toLowerCase()`, so a name with a non-ASCII capital never matches: 17 players, 69 of the
0026 rows (Alperen Şengün, Ersan İlyasova, Šarūnas Marčiulionis, Dario Šarić, Álex Abrines). A small server fix
(bind an ASCII-only-lowered copy of each name for SQL, keep the response keys as the client sends them); offer it
before the merge.

## 00000j. (2026-09-27) where things stand, and the owner's plan for the art bot in the ceremony

**Time-critical, waiting on the owner.** c-code-clean (v58.5 site plus the art bot tools, last commit `4694653`) is
pushed; the branch preview is https://c-code-clean.true82.pages.dev/. main and true82.net still run v47; never push
to main without his explicit "merge to main". Before that he runs the two database commands in `docs/GO-LIVE.md`
(0026 scout claims, 0027 Hunted; wrangler, one command per step). POOL3's `START3` is **Monday 2026-09-28** (Daily
#79). If the merge will land after Sunday 2026-09-27, move `START3` to the go-live day first (a Monday keeps the
weekday texture), re-run `node test.js` and `node tools/daily-audit.js 300 pool3`, and bump the daily-core.js key;
otherwise the archive and beat links would show POOL3 boards for days true82.net dealt POOL2 ones.

**The art bot: where it is.** Reel 3 is published (the private gallery "Draft Night Moves",
https://claude.ai/artifact/XMPeniEFZARAtwz7QsPRSJ, version 3; reels 2 and 1 folded under; his stars copy out as
`ART-BOT PICKS v3`). Engine: `tools/artbot/` (README: how every piece works, round 3 notes). Raw Mixamo files (never in
git): `~/true82-moves-raw/` (dribble, defender, jump-attack, football-catch, joyful-jump, roar, no-finger-wag,
shrugging, taunt-flexing). Mixamo downloads need his OK each time (he signs in with his personal Adobe ID; exports go
through Mixamo's export API from the signed-in page, see the README). The session scratchpad that held the gallery
source and clips will not survive; rebuild with `node artbot.mjs` (3 styles x 4 scenes, about 6 minutes at 720 px).

**His plan for the clips in the pick ceremony (2026-09-27).** Asked how the clips fit the Redrafted's pick show
without slowing the flow, the agent proposed folding each clip into the existing 2.7 s show (the clip's impact
frame is the name slam on the chime's last note; the celebration plays behind the name, dimmed, and fades as the
name flies to the roster; tap still skips; no added time). He built on that. His words, organized:
1. **Only stars get a clip.** "i think stars only deserve it". Per draft, designate the eligible stars: "the best
   6(?ish?) players who are eligible" in the draft, "or perhaps just your first two picks since they'll be the stars
   if you're playing right". **Open: which rule.** Ask him; the agent's lean is the top ~6 of the draft's pool by
   value, since it rewards the pick rather than the order.
2. **Style by tier.** "the true superstars are the only ones who get neon. nonstars get riso". Read as: designated
   stars get the riso clip, true superstars get the neon one. **Open:** what counts as a true superstar (a value
   threshold? the draft's top one or two?), and whether "nonstars get riso" means every non-star pick gets a riso clip
   (which would contradict item 1). Ask.
3. **No repeats.** "players don't see repeats of the same animation, so if you pick two designated star wings you
   dont get the same one back to back". Needs more than one animation per position (see next steps).
4. **The animation matches the position.** Guards: the crossover. Forwards: the tomahawk slam. Centers: "alley-oop
   and blocks belong to centers based on if they have a high obpm or dbpm" (the alley-oop for a high-OBPM center, the
   block for a high-DBPM one).
5. **The alley-oop's celebration changes.** "the celly on alley-oop is ridiciousl, it would be fine if he just ran off
   camera with his arms in a t position or something": drop the Luka jump (Joyful Jump); he runs off camera, arms out
   in a T (an airplane).
6. **Styles.** Keep neon as a resource "if i decide i like that better, i do prefer the flatness", "or perhaps we use
   its flatness and 'aura' to merge with riso style which is a bit 3d at the moment". So: try a flatter riso (less
   shade-driven dot density, flat ink fields) with neon's glow (aura) as a third look for him to compare. Chrono was
   not mentioned: keep it as a resource.
7. **"some tweaks are needed but we're getting there"**: he has not listed the other tweaks yet. Ask before the next
   render.

**Next steps (after his answers).**
- Art bot: the oop's new celebration (the run-off with T arms: a Mixamo run clip plus arms held out by the reach, or
  ask him to OK a download); more moves per position so stars never repeat back to back (guards: a step-back or a
  hesitation; forwards: a two-hand hammer or a windmill; centers: a putback or a hook); "ceremony cuts": portrait
  frames that fill a phone, the hit at exactly 1.3 s, a clear band where the name lands, small H.264 files (about
  300 to 600 KB); the flat riso plus aura experiment.
- Site (app.js, the Redrafted's `sdPickShow` in section 00000h, 2b): designate the draft's stars when the draft
  starts, pick each star's clip by position (centers by OBPM or DBPM) with no back-to-back repeat, style by tier,
  preload the clips when the draft starts, layer the clip mid-ground (screen-blended on the dark stage, dimmed to
  about 40% once the name lands), sync its impact to the name slam (`land1`), a still frame for reduced motion, and
  no clip on rival picks or non-stars (pending item 2). Keep the show's length unchanged.
- Not yet agreed, from the agent's proposal: a faint loop of the star's clip on his roster card, and a one-time
  "team poster" of all the clips at the end of the draft. Offer them; do not build them unasked.

## 00000i. V58.5: the neon buttons stand on white (2026-09-26, late)

The owner: "the buttons being pink with teal secondary (and vice versa) is a bit intense, and we try white as the
secondary color (meaning the second stripe of color on the bottom that makes it look 3d) globally for those button
types". Every stacked neon button keeps its own slab (pink under pink, aqua under aqua) and the second slab is now
white (`--t-light`), on the main and the secondary buttons alike, the vote buttons included.
- Done the lab's way, so a future ship keeps it: `docs/reprint-lab/src/system/60-depth.js` has a new recipe key
  `depthBase` ("ink", the old pair, or "white"), with a "Depth base" control in the lab console and the Heat Vice
  preset set to white. look.css is exactly what the component generates for the shipped recipe plus
  `depthBase: "white"` (one `--dp-2: var(--t-light)` rule, the secondaries' override gone, the header's recipe code
  updated; checked in the rebuilt lab: `LAB.componentCSS` gives the same rule and the code round-trips).
- The lab file was rebuilt (`node src/build.js <snaps>`, with the v51 snapshots from an earlier session's scratchpad,
  `72399d8d.../scratchpad/snaps`; keep a copy if that scratchpad is cleared).
- The hand-built copies in styles.css follow: the Tribune's two buttons, THE DAILY home tile (rest, hover, press)
  and the Redrafted's PICKUP and PRO doors.
- Checked at 375px on the local site: HOW TO PLAY, Classic, Presti, the Daily tile, Redrafted, YES, NO and IDK all
  compute a white second slab. Cache keys `20260926-whitebase-v58-5`. test.js 98, style law clean.

## 00000h. V58: THE REDRAFTED's real drafts, Heat Vice on the Daily and the Redrafted, 200 new Dailies (2026-09-26, evening)

**The owner's words this session.** He pasted a long reconciled brief ("TRUE 82: CLAUDE CODE HANDOFF (Sept 26,
2026)", June to Sept decisions). The agent compared it item by item with the code and this file and asked
which to adopt; his answer: "for now just integrate the current redrafteds into the ccode clean version, but
with the full real life draft propagation into pro mode as discussed we'll tackle the rest later. with of
course the miami vice full style /color update. and give me the copy pastes for the database migrations at
the end of it. make sure the dailies have the vice style too on the main page button and internal to the
mode. style update may take some judgment calls, use your best judgment to one shot it. also an archive link
for all past dailies ... and also we need all the new dailies made and deployed for all the days forward".
The rest of the brief is deferred ("later"); its open items are listed at the end of this section.

**1. THE REDRAFTED: PRO is the real draft** (the brief's R2, verbatim: "the full real first round in real
draft order, plus productive second-rounders and undrafted players chosen by AI judgment. Show real pick
numbers. Take draft order from a public draft-history dataset, not from recall. First-rounders with no
eligible season can sit greyed out in their slot so the order reads true. PICKUP unchanged.")
- Data: `redraft-drafts.json` (37 KB): per class, `r1` = the real first round in pick order, `x` = the
  productive later picks and undrafted players (pick 0). Built by `tools/redraft-drafts.py` (its header says
  how, and how to rebuild next June) from Basketball-Reference's draft history in
  sumitrodatta/bball-reference-datasets ("Draft Pick History.csv", the same public CC BY-SA source as
  site_data.json; downloaded to the session scratchpad, not committed). Matching is by Basketball-Reference
  id through bbref-map.json, so a draftee who shares a name with another player never borrows his seasons;
  the 21 shared names are split by listed height. A player drafted twice counts in the draft that stuck.
- Judgment calls (the owner may overrule): "productive" = best qualifying season at least the class's median
  first-rounder's (never under V 1.5), or 8+ qualifying seasons at V 1.0+, at most 15 a class. Undrafted
  players land in the draft they went undrafted in; where the debut misleads (G League or overseas first) a
  judgment table (`UND` in the script: Caruso 2016, Haslem 2002, Ingles 2009, Covington 2013, Armstrong
  1991...) fixes it. Every board must field three legal teams, so 1999 (Todd MacCulloch) and 2025 (Dylan
  Cardwell) grow a center.
- App (`app.js`, "v58 THE REAL DRAFT"): `sdLoadDrafts` fetches the file when the Redrafted opens;
  `sdBuildRealPool` builds the board (only seasons after the draft, the usual 785-minute floor, the height
  for shared names); a live draft keeps the board it started on (`SD.real`); the board shows each drafted
  player's pick number (`.rd-pk`), a "First round" divider, the greyed slots (`.rd-ghost`, "no playable
  season", tap says why), a "Later picks and undrafted" divider (undrafted rows say so), then "Taken". PRO
  waits for the file ("Loading the draft..."); a failed fetch falls back to the v55 whole-class board.
  PICKUP is untouched. The difficulty screen's PRO copy says what PRO is now ("The real draft, pick by pick.").
- Home door copy is the owner's: "Redrafted · Redo real life drafts".
- test.js: five new checks (1984 in pick order with Stockton at 16, every class's whole first round incl.
  greyed slots and only post-draft seasons, Len Bias greyed at 1986 #2, Jokic #41 and Ben Wallace undrafted
  join, PICKUP unchanged and the fallback works). 79 checks at the v58 checkpoint.

**2. Heat Vice on the Daily and the Redrafted** (styles.css; each block says why). look.css paints every
`.plq-frame` and `.t-card` as an outline card, which left THE DAILY's home tile and the Redrafted's
difficulty doors reading as panels among neon buttons. Scoped to `html[data-btn="neon"]` and written with
`#app#app` to outrank look.css's doubled-id selectors (the lab's other looks keep their plaque):
- THE DAILY home tile: the neon buttons' stacked recipe at card size (pink tube, dark plate, pink then aqua
  slab, the same glows), an aqua inner tube, the title lit. Its played state keeps the frame.
- The Redrafted: PICKUP an aqua door, PRO a pink door (the court art kept), the team on the clock and your
  podium row light up.
- The Tribune's SKIP TO RESULTS / RUN IT BACK (site buttons under the paper; look.css skips the Tribune)
  are the pink and aqua tubes.
- Checked at 375px: the Daily gate, draft, results were already on the look (outline cards, neon buttons).
- The archive: the home link (v56) stays; the Daily gate gets a quiet second door under PLAY IT
  (`#gatePastBtn`, today's board only).

**2b. Later the same evening (v58.1, v58.2), the owner's follow-ups:**
- "For pickup mode we need to feature the most fun drafts up top": a Most fun drafts shelf over the decades
  (`SD_PICKUP_FEATURED`: '84, '96, '03, '09, '11, '18, '98, '14 with their headliners, pinned by test.js to
  that class's PICKUP board; picked by the sum of the headliners' peaks plus judgment, skipping classes whose
  debut-year cohort files a star under the wrong year, like David Robinson in 1989). PICKUP opens on '84.
- "For pro mode we need a featured draft of the day, plus a reason why it's intriguing": `SD_DOTD_ORDER` (all
  52 classes, 1984 on 2026-09-26, famous ones spread out; device-local date), preselected with a gold
  "Draft of the day" tag until the player picks (`SD_CLASS_PICKED`; a ?redraft=YEAR link counts as a pick).
  Every PRO class shows its real draft's story line (`SD_DRAFT_WHY`, 52 hand-written, real history only,
  never the engine's grades) instead of the derived "Headlined by" line.
- The home archive link "sucks so much front page space": Past Dailies is now a quiet line under the last
  mode button.
- "Did we do the thing where the mountain ... fills up on a % of your wins out of 82?": yes, since v53
  (results-riso.js `fillY`, `levelClip`, `T_FILL`); re-checked this session.
- THE PICK IS IN (`sdPickShow`, styles.css "THE PICK IS IN"): your pick's draft-night moment, about two
  seconds, tap to skip; the pick is applied first and only the rival's clock waits (`sdHumanPick` renders the
  board under the show so each name can fly into its slot; `SD.landing` marks the slot for 0.7s so the
  re-render replays the punch once). A snake double lands its first half quietly and plays one show for both
  (`SD.pendingShow`). A rival's pick flashes its slot (`SD.flash.until`). Flash safety: one soft full-room
  flash; the flashbulbs are small and staggered.
- The chime (`SD_CHIME`, `sdShowSound`; v58.3 after the owner: "the same number of beats and general ...
  lyricality (like jingle vibe) as the famous nba draft pick chime? Rn it's like a text message notification
  tone"): the broadcast chime (ESPN's, 2006, ten notes on an electric piano) in our own notes: TEN notes, three
  phrases (D6 B5 G5 / E6 C6 A5 / F#5 A5 D6 G6: I, vi, V to I), a DX7-style FM electric piano (1:1 body, 14:1
  tine), a soft G chord under the last note, a hall. The chime plays first and the name slams down on its last
  note (about 1.3s in), then a soft boom and crash, a neon hum, a whoosh, a knock. Ambient audio session; mute
  button in the draft header (`t82_sound`). `node tools/draft-chime.js out.wav [double]` renders the exact code
  to a WAV (Playwright, the tennis copy).

**2c. THE ART BOT (tools/artbot/, 2026-09-26 night; the owner: "a huge eye candy component"):** he wants a
pre-rendered, impressionistic, "drop dead gorgeous" background clip behind the pick ceremony, first by position,
later by badges (clutch jumper, rim-protector block...), made by an art bot in several styles, with where it goes
decided later (so NOTHING is wired into the site yet). Built: `tools/artbot/` (README there): Adobe Mixamo
motion capture (royalty-free commercial use per Adobe's FAQ, no credit required; raw FBX files may not be
redistributed, so they live in `~/true82-moves-raw/`, gitignored as `raw`) rendered by three.js in headless
Chromium into masks, then printed in six styles (riso, neon, chrono, sunset, dots, vhs) in the theme's inks, to
540x540 H.264 clips on black. First reel: Dribble (G), Slam (Mixamo's Jump Attack, F), Block (Defender, C),
Alley-oop (Football Catch), Joy (Joyful Jump); Mixamo has no jump shot or dunk. The mixamo.com Download button
did not respond in the app's browser pane, so the files came through Mixamo's own export API from the page, under
the owner's signed-in personal Adobe ID (the pane's CKeller Law LLC Adobe for Teams login is refused by Mixamo).
Goalie Throw hit Mixamo's rate limit. A private gallery artifact ("Draft Night Moves", https://claude.ai/artifact/XMPeniEFZARAtwz7QsPRSJ; its source and clips were built in the session scratchpad, so rebuild with tools/artbot) shows all 30 clips with
stars and a copyable `ART-BOT PICKS v1` block.

**2d. THE ART BOT, round 2 (same night).** The owner on reel 1: "we're going to use the RISO for all of them" (then
"retain neon too" and "keep chrono style too pls"); the dribble "facing head-on" like Mixamo, adapted to crossovers
and between the legs for the guard; the slam "pretty darn close", needs a hoop and "slightly at the end when
they're dunking, change the arms"; the block's "body is good", needs the ball and the hoop and "someone attacking
the rim"; the alley-oop "pretty close too"; "Joy is stupid. Not on theme."; and "we have to put these characters
in basketball clothes because right now they look like fembots" ("a lot of creative license ... a starting point
as opposed to like the ground truth"). Done, all in `tools/artbot/` (README: how each piece works): generated
uniforms on the X Bot (jersey with piping and 82, baggy shorts with a hem stripe, socks, high-tops, headband,
wristbands; the rival in road white), squared shoulders; the crossover as the capture blended with its own mirror
image (a seamless 2.8 s loop, head-on); a hoop with a net that reacts; the slam's gather, throw-down, rim hang and
landing flex; the block's defender aimed out from under the hoop at a rival going up for a tomahawk; the oop's lob,
one-hand catch and flush. Riso, neon and chrono, 720 px. Published as version 2 of the same gallery (reel 1 folded
underneath); his stars copy out as an `ART-BOT PICKS v2` block.

**2e. THE ART BOT, round 3 (2026-09-27).** His notes on reel 2 (full quotes in tools/artbot/README.md, "Round 3"):
the crossover's body holds still with a fast combo (in front, between the legs, behind both legs) on the fingertips
with a teal trail; the slam's hoop moved so the arm is extended at the apex; hands drop to the sides on landing; a
celebration for every move; big stylized impacts; the block's shooter shorter and a quiet outline, the blocker
leaping in from off the right of the frame; the oop two-handed (grab, then shove down); the collarbone "bowtie"
smoothed; no numbers on jerseys; and "look at nba blocks and slam reference photos ... look up tomahawk". Done:
reference photos studied (Kyrie combos, LeBron and Ja Morant tomahawks, blocks at the rim, his Butler/Giannis/Luka
celebration photos); four Mixamo celebrations downloaded with his OK (Roar, No, Shrugging, Taunt Flexing; into
~/true82-moves-raw/); the slam is a one-hand tomahawk ending in the Roar; the block ends in Mutombo's finger wag;
the crossover in the Jordan shrug; the oop in the Luka jump (Joyful Jump). Every dunk and block gets slow motion,
camera shake, a bending rim, a flash, a comic starburst, shockwaves, focus lines, sparks (lightning in neon). An
engine bug found on the way: three.js's mixer skips unchanged joints, so changes on held poses accumulated; clips
are now sampled by hand (`applyPlan`). Published as version 3 of the same gallery (reels 2 and 1 folded under);
picks come back as `ART-BOT PICKS v3`. Next: his picks, then wiring the chosen clips behind the ceremony.

**3. The 200 new Dailies (POOL3), merged (`1ea7813`, merge `3d6e519`), then v58.4.** 200 boards, one a day from
Monday 2026-09-28 (#79) through Thursday 2027-04-15 (#278), then looping (day index modulo 200). #1 to #77 stay
pinned by test.js and #78 (Sunday 2026-09-27) stays a POOL2 day. A helper agent designed, built and bot-audited
them in a worktree; the agent here reviewed and merged them. The plan, the whole run week by week, the mirror
and cousin pairs, and how to swap a board safely: `docs/DAILIES-POOL3.md`.
- Mix 73 Presti, 98 Classic, 29 Pro, with a weekday texture (Monday engine rules, Tuesday sequence puzzles,
  Wednesday eras and wildcards, Thursday Pro blind, Friday a positive twist, Saturday franchise flavor, Sunday
  Presti economy). No base mode three days running, one mechanic family at least 6 days apart, mirror pairs at
  least 35. Every board changes which player is the right pick. A duplicate pass replaced seven repeats.
- Certified: `node tools/daily-audit.js 300 pool3` plays 300 bot drafts on every board (zero dead runs, a
  round-one pool median of 8+, centers on the board, a spread of records); all 200 pass. test.js pins the
  rotation's shape and copy and runs 20 quick drafts per board.
- New engine surface: an optional `price(row, t)` hook (a Presti price multiplier in sim-core's
  `assignCapPool`; absent means exactly 1, checked on 1,263 bot games against the old sim-core and pinned).
  Six boards use it. The cfg keys for the rim, glass, creator and mileage taxes are open to boards (no default
  changed), and a negative tax is a bonus (Five-Out, Board Money, Win Now; The Mid-Range charges per shooter
  past one through a negative `SPACING_BONUS`).
- v58.4 (`b6eb3c2`) fixed what the review found: the results ledger is now `resultsLedgerHtml(e)`, one row per
  term of the engine's score, so the rows always add up. A bonus paid through a negative tax shows as a credit,
  the Mid-Range's charge has its own row, and the shooter, usage, rim bar and veteran-year lines read the
  board's own settings (`runCfg`, the engine's `C()` rule) instead of the defaults. That default bug also hit
  older boards that move the targets (three set `USAGE_BUDGET`; several set `SPACERS_REQ`). The Tribune's fit
  notes read the board's shooter target too. Found while testing: an archive replay showed "1 OFFICIAL
  ATTEMPT" in the draft header; it says PRACTICE RUN now. test.js 98 checks (four new ledger checks).
- Timing: `START3` is 2026-09-28 in the code, but true82.net (v47) keeps dealing POOL2 until this branch is
  merged. If the merge lands after Sunday 2026-09-27, the archive and beat links would show POOL3 boards for
  days the live site dealt POOL2 ones (history rewritten for those days). So before a late merge, move
  `START3` to the go-live day (a Monday keeps the weekday texture), re-run test.js and
  `node tools/daily-audit.js 300 pool3`, and bump the daily-core.js key (docs/GO-LIVE.md says the same).

**4. Going live** (the owner asked for "copy pastes for the database migrations"): `docs/GO-LIVE.md`. 0026 is
7.6 MB (too big for the console), so it runs through wrangler (`npx --yes wrangler@4 login`, `d1 list`,
`d1 execute DBNAME --remote --yes --file=...`); 0027 is one statement and can also be pasted. No new migration
this session (the real drafts and the Dailies are client-side). Then the owner says "merge to main".

**The brief's items deferred by the owner ("we'll tackle the rest later")**, with what the comparison found:
- Tags: preview deploys may share the production D1 (a dashboard setting; give previews their own DB first);
  "+" should count as a YES with no second popup, the picker needs a clear close button, the glove should be
  pinned to the "+" (it is `position: fixed`); the ballot questions for gravity and rim pressure should read
  "Did {YEAR} {PLAYER} have gravity?" / "...attack the rim?" (traits.js already does); the brief's "final"
  definitions differ from the shipped ones on 16 of 17 tags and drop Ball Pounder (owner to confirm); one
  shared "settled" rule (live D1: 62/38 with a 25-vote floor; brief: 60% with hysteresis) that also
  unfeatures settled homepage questions; the top-up scout run for Ball Stopper, Stat Padder, Hunted (the raw
  Sept backfill CSV is not on the Mac; only migration 0026 survives); desktop hover text on tags; "The
  Record" rater page.
- Classic and Presti: the halo position rule and Presti's top price $23 to $27 (each its own reset); GOAT
  Climb placement (brief: net rating; the July 26 ruling and v51.1: realized wins; ask); cut the "Go 82-0"
  lead-in (conflicts with v53; ask); retire the Tribune (still on, its AI edition costs API calls on tap);
  make the season stand out on player cards; Classic PICKUP/PRO and blind Classic PRO from the archive;
  migration 0025 (24 homepage polls, accounts-test; 2026-09-27: it was already live, see 00000k).
- Percentiles: the 14-day window and rank of the field never landed on any branch; the "4th of 11 today"
  line is unbuilt. Also: a logo permission check (crests.json has no recorded source), traded-player stats,
  load speed and a code review, a Daily star rating, a "start the season" bell, accounts (item 17), TrueW
  frozen. Laws adopted: test at 320 and 375px; no em dashes in any shipped copy (a few remain: the Scoring
  Card, a draft hint, two page titles, the credits); one engine-value change per reset; migrations through
  wrangler, preview first.

---

## 00000g. OWNER CALLS AT THE END OF THE 2026-09-26 SESSION (read first)

- **The favicon (v57) stays for now, but it needs a big rework by the next agent.** Start from `tools/icons.js`
  (section 00000f): it is the one source, draws small/medium/large versions in the theme's inks and writes every
  icon file. Show the owner options at real sizes (tab 16/32px, home screen 180px) before shipping; he picks visuals
  by comparing them, ideally in a lab (memory: owner-design-labs).
- **Dynasty is killed off for now.** Do not port it from origin/accounts-test. It may come back far later under an
  "experimental mode" button on the home page; not now.
- Still open with the owner (asked, unanswered): which masthead finish (neon tubes script shipped; glow and block
  letters are one lab toggle away), what "comet icon ... tight crop" meant, a "#N replay" line in the Daily share text
  for past-Daily replays (touches the locked SHARE FORMAT LAW), Classic difficulty from the archive (yes/no), and when
  to merge c-code-clean to main (main auto-deploys; migrations 0026 and 0027 must be applied with it).
- Item 17 (leaderboards, accounts) stays "later".
- Local dev used this session (scratchpad, wiped on reboot): site with API and D1 on :8790 (`site-api2` in
  .claude/launch.json), lab server on :8095 (`lab3`). QA scripts lived in the session scratchpad; the reusable
  exporters are in the repo (tools/icons.js, docs/reprint-lab/export/).

---

## 00000f. V57: the app icon, redrawn for favicon scale (2026-09-26)

The owner, after v54: "the app icon needs a rework to be at favicon scale - more featuring of the ball and blockier
emphasis lines etc - follow best practices, it can deviate from the banner logo as long as it's in the spirit". The
v54 icons were the banner's riso icon trimmed tight (LAB.appIcon): at 16px they were a fuzzy blob.
- **`tools/icons.js`** (`node tools/icons.js`) is the one source: three drawings in the theme's inks (tools/theme-core
  roles ground, accent, offset; a light core mixed from the offset), written as SVGs to `docs/icons/` and `icon.svg`,
  then rasterized with Playwright (the tennis project's copy, or `PLAYWRIGHT=<path>`):
  - **small** (16, 32, the SVG favicon): on a 16px grid, a 12px ball, the two cross seams 2px thick, the rim 2px across
    the ball's foot. Nothing thinner than a pixel.
  - **medium** (48): the side seams join, the rim gets its bright core.
  - **large** (180, 192, 512): the ball threaded through the hoop (the back arc behind it, the front arc in front),
    four blocky rays and the banner's star, a soft neon glow on the ball.
- **The files (the current best-practice set):** `favicon.ico` (16, 32, 48 as PNG entries; browsers still ask for
  /favicon.ico), `icon.svg`, `apple-touch-icon.png` (180, opaque full bleed: iOS draws its own corners),
  `icon-192.png` and `icon-512.png` (rounded tile, the manifest's "any"), `icon-mask.png` (512, maskable: full bleed,
  everything inside the 80% safe circle), `manifest.webmanifest` (name, the icons, theme and background #16122B,
  display "browser" so a home-screen shortcut still opens in the browser; `_headers` serves it as
  application/manifest+json). Every page (index, 404, the four info pages, Bonuses) links favicon.ico, icon.svg,
  apple-touch-icon.png and the manifest. The JSON-LD logo is icon-512.png. The v54 icon-32/48/180.png are gone.
- The lab's export script now makes only masthead.png and og-image.png; LAB.appIcon stays the lab's quick preview.
- Calls (the owner may overrule): the hoop stays (a rim) even at 16px, as the one aqua accent; the star only at
  180 and up; `display: "browser"` (an app-style standalone launch would drop the address bar and share flows).

---

## 00000e. V56: THE DAILY ARCHIVE, play or view past Dailies (the owner's item 16, 2026-09-26)

Every past Daily rebuilds exactly from its date (daily-core `boardFor` is deterministic and client-side; no
server), so the archive needs no data of its own:
- **Past Dailies** (`renderDailyArchive`): a text link under THE DAILY tile on the home page opens a list from
  yesterday back to #1: number, date, board name, base mode, and your official that day (the device now keeps 400
  days, `KEEP_DAYS`) or your best replay or "not played". A row opens that board's gate.
- **The past board's gate** (`renderDailyGate(board, target, tag, { archive: true })`): the board's own date, "A past
  Daily", the law "A replay is practice: official days and your streak stay as they are", THAT DAY'S VARIATION; back
  returns to the list.
- **The replay** (`startDailyRun(..., { archive: true })`): variant `daily-practice:N` (so it stays out of the Daily's
  percentile pool), surface `daily_archive`, `G.social.archive = 1`. Results never claim the day
  (`renderResults` skips `recordOfficial`; the Heat Check and percentile amends need the run's nonce, which a replay
  never gets); instead `T82DAILY.recordArchive(key, num, wins, net, newRun)` keeps your best replay apart (a re-render
  after a Heat Check updates it without counting a run). The head line reads PAST BOARD with your official that day
  or REPLAY; RUN IT BACK replays the same past board; a "Past Dailies" link returns to the list.
- **Sharing a replay:** with an official that day it shares the official, like any practice run. With none, it
  shares as a team ("SHARE YOUR TEAM", the regular share and its poster): the locked SHARE FORMAT LAW is untouched.
  A "#N replay" line would change that law, so it is the owner's call (asked in the v56 summary).
- **Links:** a challenge link to a past board (`?d=` older than today) now opens that board's gate with the friend's
  number pinned (it used to be a note with no way to play, and the note vanished when today was already played); a
  link from a time zone already on tomorrow says it opens at midnight here.
- **History is pinned:** test.js rebuilds boards #1 to #77 (through 2026-09-26) and pins them, so an edit to POOL,
  POOL2 (a rotation modulo its length), SEED_NS or EPOCH that would rewrite old boards fails the tests. New boards
  go in a POOL3 with its own start date (daily-core.js says so; its "bump SEED_NS" comment was wrong and is fixed).
  74 tests.
- Not done: re-scoring an old official (scoring changed early in July without a version bump, so a stored five from
  #1 to about #9 would score differently today; the archive never re-scores, it shows what was recorded).

---

## 00000d. V55: THE REDRAFTED is in (the owner's item 15), and the archive's other deltas (2026-09-26)

The owner: "import redraftables from test archive and review other deltas". The source is
`origin/accounts-test:true82-allclasses2-on-v49.14/app.js` (v49.14 plus "every class, derived", key
20260905-allclasses2-v49; its docs are DEPLOY-ALLCLASSES.txt and RETURN-HANDOFF-ALLCLASSES.md in that folder).
- **What it is:** a snake draft against two computer GMs (MERCER takes the best player alive, QUINCY drafts the
  team) over one shared, exhaustible pool: a real NBA draft class, five a team, every pick exclusive, any season of
  a player's career; then the engine projects all three teams and a podium. 52 classes (the 9 hand-picked ones plus
  every other year from 1974 to 2025, derived from the data), PICKUP (the headliners at their peaks) or PRO (the
  whole class, seasons randomized), a Hall's-condition strand guard so no team is ever stranded. No accounts, no
  server, no replay or leaderboard; state is in memory (a reload costs the draft).
- **How it was ported:** the logic block is the archive's, unchanged except the content fixes (the Pavlovic
  spelling; the 1976 blurb named Erving and Gervin, who are in the dropped 1974 floor cohort; the console message for
  names with no 785-minute season). The screens are rebuilt on the style system: `.t-mode` roots, `head("redraft")`
  (new HEADS line), `.t-card` panels, `.t-btn` actions, `.t-chip` class picks (plain / on), the draft's own `.pool`,
  `.player-row` and `.tray`, and a styles.css section "THE REDRAFTED" (layout, plus the two difficulty courts' art in
  tokens). The archive's injected CSS (`ensureShowdownCss`, about 120 literals) and its Dynasty skin are gone. The
  draft screen shows the three teams side by side above the board. Entry: a home door under THE DAILY
  (`#startRedraft`) and the deep links `?redraft=1` / `?redraft=YEAR` (`openRedrafted`). Function names keep the
  archive's (`sd*`, `renderShowdown*`) so a later archive change maps one to one; CSS classes are `rd-*`.
- **Also fixed on the way:** `.t-mode`'s plain-element defaults are now `:where(.t-mode) h2` and so on (element
  weight), so a `head()` header or a type role (`.t-small`) inside a mode root is no longer overridden. A `.t-chip`
  and `.rd-diff` are never keycaps (BTN3D_EXCLUDE). The desktop wheel forwarder scrolls the Redrafted's board too.
- **Server:** `functions/api/event.js` accepts `showdown_state` and `difficulty_select` and the mode `showdown` (the
  archive's analytics never reached /avocado). The podium share reports `share_click` (surface `redraft`).
- **Tests:** test.js runs the Redrafted on the real site_data.json (5 checks: the classes and the 1984 offset smoke
  test, redshirts and spellings, every class fieldable in both difficulties, full computer drafts finish legally,
  the copy law). 72 tests.

The archive's other deltas (reviewed by a helper; the owner decides what comes next):
- **Dynasty** (v48/48.1, localStorage `t82Dynasty`): KILLED FOR NOW by the owner (2026-09-26); maybe later behind an
  "experimental mode" home button. Do not port.
- **Classic difficulty** (v49.10/v49.12: PICKUP/PRO for Classic, remembered) and **blind Classic PRO** (v49.13): browser
  only; the screen code is already here (`renderDifficultyScreen` is generic). Note the naming clash with the existing
  Pro mode.
- **Share labels "shareblind"** (v49.14): touches the locked SHARE FORMAT LAW text; needs the owner.
- **Superseded, not to port:** the v49.4 season scoreboard (the riso reel replaced it), the v49.5 to 49.9 card vote
  strips and celebration (the v50 tag ballot replaced them), op=engq (dropped in v50).
- **Migration 0025** (24 homepage polls) exists only on accounts-test: D1 content, could ride the next deploy.
- **Accounts, duel, league, arena, weekly, leaderboards:** the accounts stack at the accounts-test root (the owner's
  item 17, "later").

---

## 00000c. V54: the neon masthead, a tight icon, the new link card (2026-09-26)

The owner's item 10, in his words: "love the comet icon as config'd but cut out the blank space around it so it's a
tight crop; current true82 title text needs to be more neon less riso/handdrawn as now - to match closer to the ball
icon we're using". Done through the Reprint Lab (the masthead's source), so every look can use it:
- **The lab's composer has a neon wordmark.** `wordTex` "neon" (Neon tubes) and "glow" (Neon glow) are not printed:
  `drawNeonWord` (banner.js) lights the word over the composed print (a glow in the ink, the tube, a pale core; no
  halftone, no misregistration, no depth). New recipe key `neonInk`: "print" (the word's inks) or "icon" (the icon's
  body and line inks: for Vice a pink TRUE and an aqua 82, the ball's and the hoop's colors). The console lists both.
- **Heat Vice (app/presets-20-team-nights.js) now carries** `wordTex: "neon", neonInk: "icon", tooth: 0`: the
  Yellowtail TRUE and the Big Shoulders 82 as neon tubes; the icon (hoop-sunrise, the star, its print style and its
  stacked depth) is exactly as it was. `masthead.png` is re-exported from it (`LAB.image(rc, 300, 3)`, 900x252).
- **The tight crop.** The masthead image already runs edge to edge, so the reading taken: (1) the header hugs it
  (`.site-head` padding 10/12/8, the empty `.round-pips` row gone off the draft, the logo 336px / 92% wide, set in
  ship-look.js's glue); (2) the icon alone is cropped tight: `LAB.appIcon(rc, px)` prints the mark, trims it to its
  ink and centers it on the stock with a 5% margin (the lab's APP ICON tile uses it). Exported as the site's first
  real icons: `icon-32.png`, `icon-48.png` (favicons) and `icon-180.png` (home screen), wired into index, 404, the
  four info pages and Bonuses in place of the old gold-diamond data URI; `theme-color` is the Vice ground #16122B.
- **The link card** (`og-image.png`, 1200x630, used by every share and the Functions' pages) was still the v47 gold
  card: it is now the neon masthead, as large as the card allows. The JSON-LD logo is icon-180.png.
- The lab file is rebuilt (the same 93 snapshots; the artifact copy is not republished).
- The owner may mean something else by "the comet icon" or "tight crop" (the lab also has a Comet concept, used by
  Purple Sunburst): the question is in the v54 summary to him. Other finishes are one lab toggle away: Neon glow,
  a block TRUE (Face: Big Shoulders), or the grid backdrop off.

To re-export after a lab change: `node docs/reprint-lab/export/export-masthead.js <outdir> ['<json overrides>']`
writes masthead.png, icon-32/48/180.png and og-image.png from the Heat Vice preset (it reproduces the shipped files
pixel for pixel). It drives `docs/reprint-lab/export/render.html` with Playwright (the tennis project's copy) and needs
the lab server on :8095 (a static folder whose `lab/src` links to `docs/reprint-lab/src`, served by the capture
folder's labserver.py) and the local site at `window.LAB_SITE_BASE` (render.html says :8790). The link card sits on
the stock's printed color (a corner of the print), which prints darker than the stock's nominal hex.

---

## 00000b. V53: the owner's list, items 9, 11, 12, 13, 14 (2026-09-26)

The owner's queued tweaks (section 00000, "Owner's queued tweaks"; items 1-8 were v51.2). His exact words for
the list are in the 2026-09-25 session "xtrue82 project handoff". Done in v53, each checked at 390px on the
local site (wrangler + D1 on :8790) and on desktop:
- **9. The season print fills to the win rate** (results-riso.js). The owner: "the mountain should only be
  filling up partially with color in response to % wins out of 82". On a phone the lake below the ridge reads as
  part of the same lavender mass, so the gauge is the whole land and water: `D.fillY` sits wins/82 of the way from
  the frame's foot to the ridge's highest point (82-0 fills to the summit, 41-41 half way). The three land layers
  print only below the level (`levelClip`); above it the mountain is an empty outline and the lake runs dry. A new
  `shell` layer (the pop ink, never clipped) carries the season's line, the sunken line and the loss beads.
  `drawLevel` draws the fill's surface in the light ink. The reveal is now: sky down, the season across (line,
  beads, strip), then the color fills up from the foot (`T_FILL` 0.85s, ease-out), then the names. Poster and
  `T82PRINT.print` (the lab) print the same. aria-label adds "the color fills the picture to the win rate".
- **11. The dunk gets a Vice neon makeover.** `ballLeverHtml` (shared by the Daily gate and the Heat Check) is
  neon tubes painted from tokens in styles.css: the ball in `--t-accent` with a bright `--t-light` core and a glow,
  the rim and net in `--t-offset`, and at ignition the ball burns `--t-hot`. `--fx-ball*` stay in the theme only
  for the lab's frozen snapshots (STYLE-GUIDE.md updated).
- **12. Homepage:** the paragraph is a one-liner ("Draft five NBA players. Real advanced stats play the season.")
  under "Go 82-0", which now shares its row with a HOW TO PLAY button (the draft screen's `.mp-rules-btn`, a size
  down: `.intro-rules-btn`). The DRAFT and WINNING text under the vote card is gone. The static index.html
  fallback (SEO copy) is unchanged.
- **13. HOW TO PLAY is dead simple, with a demo.** `howToDemoHtml()`: a 16s pure-CSS loop on a mini draft screen
  (styles.css "HOW TO PLAY: the demo"): a ticket deals '90s BULLS, the white glove (`GLOVE_PATH`, shared with the
  ballot hint) taps Michael Jordan, then DRAFT YOUR PLAYER, MJ fills the G slot, the ticket rolls through four more
  rounds as the slots fill, 82 coins play the season to 74-8, GO 82-0. Six captions and dots light as it plays.
  The homepage button opens `rulesHomeHtml()` (the demo, GAME BASICS, one line per mode, GOT IT); the draft
  screen's sheet has the demo on top of its GAME BASICS (the rest of the owner's rules copy is unchanged).
  `openRulesSheet({ home: true })`; analytics action `how_to_play_home`.
- **14. Trait definitions are back.** They had disappeared with v50 (the old results vote card showed each
  question's definition; the ballot defined only 9 of 18 tags, per the ballot brief's "plain" call). Now every
  `BALLOT_TRAITS` entry has `d` (the 9 new ones are the owner's own lines from docs/ballot/tag_ballot.html), so the
  question sheet and the "+" tiles always show it; a "What the tags mean" text button in the YOUR FIVE header (and
  "Every tag, spelled out" at the picker's foot, which linked to a dead /traits/ page) opens the tag glossary in the
  same sheet (`ballotOpenGlossary`, `traitGlossaryHtml`); the draft pool legend (the (i)) lists each code with its
  name and definition; the homepage vote card's definition wraps instead of being cut off. test.js pins that every
  trait has a definition and the glossary prints it (67 tests).
- Also: the leftover italic labels are upright (EXIT RUN, the gate's BACK, a few small notes; the owner dislikes
  italics). Only the (i) glyphs and the Tribune stay italic.
- v52 known limit 1, done: look.css's 122 color-mix() uses each sit in a rule now followed by an
  `@supports not (color: color-mix(...))` copy with every mix replaced by its larger part (a see-through mix under
  70% by transparent), so phones before iOS 16.2 keep the neon borders and stacks and lose only the soft glows
  (simulated in Chromium: close to the real look). A fallback declaration in front would not have worked: every
  one of these values contains var(), which browsers only check when used. `ship-look.js` now does this on every
  export; `node docs/reprint-lab/src/ship-look.js --fallbacks` added them to the current look.css once.

Calls made (the owner may overrule):
- The gauge measures the whole land and water mass, not just the land above the waterline (at phone size the
  land-only cap was about 5px for a 74-8 season). So a middling season's lake runs partly dry (a dark band under
  the horizon) and a losing season is mostly empty. Measuring from the waterline instead is one line
  (`fillY = WL - wp * (WL - top)`).
- The one-liner, the demo's players and captions, and the modes' one-line summaries are new copy; the owner-written
  GAME BASICS lines are reused as they are.
- The glossary door is a text button, not an (i), so it says what it does.

Next on the owner's list (in order): 10 (done in v54, section 00000c), 15 (done in v55, section 00000d), 16 (done
in v56, section 00000e), 17 (later: leaderboards and accounts). From v52: the display face's size fitting is checked
(an overflow scan of home, Classic, Presti, results, the gate and the Redrafted at 360px found nothing visible;
Presti's bank, skips and price tags fit). Still open: the lab's 93-state recapture (its snapshots are v51-era, so it
shows none of v53-v56's markup) and the artifact republish.

---

## 00000a. V52: Heat Vice is the site's look (2026-09-25, end of the afternoon session)

The owner: "let's slap it on c-code-clean". The Reprint Lab's Heat Vice look (with his v51.2 tweaks) is now the
site's real look on the branch preview (not on true82.net). How it was shipped (repeat for any future look):
1. In the lab (browser), export the recipe: `LAB.rolesFor`, `LAB.themeVars` (fonts, corners, print blend) and
   `LAB.componentCSS` into export.json / export.css, and `LAB.image(rc, 300, 3)` into `masthead.png` (900x252).
   The exact snippet is in the header of `docs/reprint-lab/src/ship-look.js`.
2. `node docs/reprint-lab/src/ship-look.js export.json export.css` writes the roles, fonts (Big Shoulders Display,
   Rubik, Space Mono), corners (14/18/999px) into `tools/theme-core.js` (keeping the owner's hot `#FFD54A`) and
   generates `look.css` (the component layer; simple see-through mixes converted to `rgb(var(--t-x-rgb) / a)`).
   Then `node tools/theme.js`.
3. Every page (index, 404, the four info pages, bonuses, traits, docs/style-guide.html) got the look's switches on
   `<html>` (`data-btn="neon" data-card="outline" data-chip="ink" data-corners="round" data-texture="none"
   data-ground="night" data-lab-mast-ink="dark"`), a `look.css` link right after `styles.css`, the new Google Fonts
   link, and the header `<img class="brand-logo">` now shows `masthead.png` (the JSON-LD still names logo.png).
Checked at 390px on the local site: home (neon buttons on stacked pink/aqua bases, aqua YES, pink NO, aqua tags),
results (the print in Vice inks with the roster, the two-way box in the record card, pink position badges, the V
value). `node test.js`: 66 passed; style law clean (look.css is generated and outside the law, see STYLE-GUIDE.md).

Known limits of the first ship (next session):
- `look.css` still has 122 `color-mix()` uses (mixes of the lab's per-button variables): phones before iOS 16.2 /
  Chrome 111 skip those declarations and see plainer buttons. Convert them (per-family rgb twins) to finish.
- The lab's display-face fitting (a page hook that scales display type by the face's metrics) is not on the site:
  Big Shoulders runs at the sizes set for Barlow Condensed (its caps are about 14% taller). Check tight spots
  (badges, the bank, buttons) on a phone.
- The lab: LAB.SITE is now Heat Vice ("Today's site" shows it, with the site's look.css and switches); the v51 gold
  is frozen in `src/system/00-theme.js` (LAB.GOLD) so Gold Standard, Gold Press and Print Shop keep the gold.
  "Today's site" now reprints the frozen canvases in the site's inks too. The lab file was rebuilt; the artifact
  still is not republished and the 93-state recapture is still pending (see below).
- Masthead: the owner's tweak list wants the TRUE 82 title more neon and the comet crop tight (item 10); the
  shipped masthead is the Heat Vice script one. Swap by exporting a new masthead.png.

---

## 00000. V51 + V51.1: one enforced style system, the fix batch, the lab on v51 (2026-09-25)

The owner's request (section 0000, "Next: one enforced global style guide", plus a follow-up): force every
screen onto one style guide so new experimental modes are styled by construction ("my grafts didn't get the
style upgrades"), bring the grafted screens (game by game, results, the crowdsourced-data pop-up) onto it,
add switchable section headers, add a white roster overlay to the final results picture, update the lab to
match, and (in the lab's Heat Vice look, the owner's saved star) keep the stacked two-shade pink/aqua look but
give the buttons dimensionality and clickability. Read `docs/STYLE-GUIDE.md` for the system itself.

Two sessions did it: the morning one built v51 (site side) and ran out of context mid-recapture; the afternoon
one (this handoff) committed v51, fixed everything the recapture found (v51.1), and moved the Reprint Lab onto
the system.

### State at the end of the afternoon session
- v51 and v51.1 are committed and pushed (see Build above). `node test.js`: 66 passed. `node tools/style-law.js`:
  clean. `node tools/theme.js --check`: current.
- The Reprint Lab update: see "The Reprint Lab on v51" below for what is done, committed and published.
- Nothing is deployed to true82.net. Shipping v51.1 to main is the owner's call (ask; main auto-deploys).
- Local dev state (all in /private/tmp, wiped on reboot): the site with its API and D1 runs on :8789 (wrangler,
  started by the morning session: config `site-api` in `.claude/launch.json`, D1 state in
  `/private/tmp/claude-501/-Users-ggz-true82/7bd49d09-c078-4440-bffe-c363402fa23d/scratchpad/state`); the lab
  server on :8095 (config `lab3`, serving
  `/private/tmp/claude-501/-Users-ggz-true82/72399d8d-bfbd-4b1e-8e3b-148f56ea2326/scratchpad`, which holds
  `lab/src` (a symlink to the repo's `docs/reprint-lab/src`), `snaps/` (the v51.1 captures), `snaps-v51/` (the
  v51 captures), `dist/` (builds), `qa/` (board renders; `qa/boards.js` renders the lab's look boards to PNG with
  the Playwright copy in /Users/ggz/tennis-puzzle-prototypes/backdrop-studio/node_modules)). The app allows five
  dev servers per folder; the morning session's four still count, so a new server needs one of them stopped.

### Owner decisions (2026-09-25, asked at the start of the afternoon session)
1. Commit and push v51 to `c-code-clean`: yes (done).
2. The results page, the season reel and the tag sheet stay dark site cards in today's colors (no cream paper).
3. Reel pacing stays on the realized record (exactly 16.8s every season), not the pre-season net.
4. Heat Vice in the lab: pink wins and aqua losses by default, with a toggle for red losses or gold and red.
5. `hot` is fire gold, not red (red means NO, taxes, bad traits; hot is a gain). Today's value `#FFD54A` (the
   fire-halo gold: ΔE00 10.7 from the accent gold, 20 from the warn orange, 43 from the bad red). FIRE SALE now
   flashes fire gold too, so the owner-authored Presti rules line reads "FIRE SALE (fire gold)".
6. One spelling of the trait codes everywhere, the results ballot's (`BALLOT_TRAITS[].chip`: GRAVITY, RIM-P,
   SWITCH, CLUTCH, TITLE #1, BALL-STOP, BALL-POUND, FOUL-MERCH, STAT-PAD, KNUCK...). The draft pool, its legend,
   the homepage card and Bonuses all read them; test.js pins app.js and the Bonuses page's own copy.
7. Flatter chips in dense lists: `.t-chip[data-size="sm"]` (flat, same tones) for the draft pool and the legend;
   the raised keycap stays on buttons and on the results tags you tap to vote.

### What v51.1 changed (the fix list the v51 recapture found; all verified at 390px)
Results: START OVER and FEATURE REQUESTS are the same small `.t-btn`; the season print's roster has bigger slot
letters (sun ink) and 'yy years on a dark keyline (screen and poster); the "+" wraps with the last tag
(`.bt-tail`); a negative value is `--t-bad-soft`; no comp phrase under 61 wins (`resultsCompHtml`, pure and
pinned; the share text is untouched); the GOAT Climb marker rides the realized record (`climbHtml`); after a
post-season save the comp line and the hot pick's name follow. Ballot: the question highlights only the trait
words (the article is tied by a no-break space); the toast keeps the chip's casing; Add-a-tag group margins.
Home and Daily: the poll's Share Vote bar hides when done (`[hidden]` rule); IDK is tappable with a visible border;
the stale-link note and footer legal text sizes; the played plaque's RUN IT BACK is the quiet button and
COPIED! holds the width; the gate's BACK is bare text (`.gate-back` in `BTN3D_EXCLUDE`); the Daily HOW TO PLAY
copy is true on every board (prices only on Presti boards, the rule sits "above"). Draft: search placeholder,
themed clear button, an empty-search message, the MORE PLAYERS cue hides when the pool is empty or the legend is
open (`syncPoolCue`); the legend is two columns and names only the engine codes it lists; REFUND and FIRE SALE
flashes centered in the display face; STATS REFRESHER is a quiet `.t-btn`; money reads "$16M" everywhere (the
thin space in `mHtml` is gone); `has-pick` clears when the draft ends. Heat Check: I DON'T WANT YOUR CHARITY is
the outline button (`.hh-charity` in `BTN3D_EXCLUDE`); solid scrims; the print waits until overlays close; the
stamp wraps as "NAME / CATCHES FIRE"; the meter's empty slots are wells and the result segment lights; the name
strip lands exactly on the chosen name. Reel: the loss caption sits on a plate of the card's stock; the finale
ledger's scrollbar is themed. Info pages and 404: the logo is centered. Quiet buttons draw their border in
`--t-rule` (it vanished on cards in `--t-line`). Bonuses: the codes, the bad-trait title chip, the question in
the shared `.t-title` voice, COPIED keeps its size, the vote-failed message sits under the buttons, votes go out
1.3s apart and retry `rate_limited`, a lone vote reads "first vote", the haptic switch survives a slow vote.
Routes: `/bonuses/*` is in `_routes.json`, and `functions/bonuses/[slug].js` hands non-slugs back to the static
site (`context.next()`), so question share links work.

Not fixed (next session or the owner):
- C29, partly: the reel's giant L still lands over earlier months when the losing row is near the card's bottom
  (it prefers empty space below; a full fix needs a layout change).
- The Scoring Card rows (Hot Hand bonus, taxes) still use em-dashes (the copy law only covers the ballot and reel).
- The homepage question "Was 2008 Kobe an elite wing defender?" carries the ISO-D tag (a D1 data mapping).
- In percent mode with zero yes/no votes (only if the D1 vote minimum is set to 0) the big number reads "100% NO".
- The 404 and homepage `<title>`s use em-dashes.
- Migrations 0026 and 0027 still need applying with the next deploy (section 000).

### The Reprint Lab on v51 (afternoon session)
The lab (docs/reprint-lab, read its README) is now built on the site's own system instead of copies:
- Themes: `src/system/00-theme.js` loads the repo's `tools/theme-core.js` (window.T82THEME). `LAB.baseRoles`
  expands a palette into every site role (the palette's `line` is the site's `rule`; `hair` or `ground-3` is
  `line`; `label` is metal lifted to 4.5:1; `hot` is the palette's sun), `LAB.drum` maps the season print's
  inks, `LAB.rolesFor(recipe)` adds the recipe's win/loss and `print-paper` (the card the print sits on), and
  `LAB.themeVars` returns `T82THEME.vars()` (every shade and rgb twin) plus fonts and radii. Gold Standard is
  today's site exactly; "Today's site" sets nothing.
- Site CSS: the build inlines the repo's styles.css as it is. The tokenizer, site.tok.css, role-fixes and the
  verify/tokenize/kit-build dev pages are retired; the "Every piece" view is a snapshot of docs/style-guide.html.
- Canvases: `src/system/30-reprint.js` reprints the results print (`T82PRINT.print(spec, { root })` from
  `#rrPrint[data-spec]`, roster included) and the reel's month strips (`T82RISO.strip` from `data-games`) with
  the repo's own results-riso.js and reel-riso.js (the `src/vendor/` copies are gone), and re-inks the frozen
  loss-effect layer pixel by pixel (screen or multiply, the look's stock). A mid-reveal print is reprinted
  finished.
- Components: `10-controls.js` families include every `.t-btn` kind (a new `good` family too) and `.t-chip`
  tone, and feed the site's `--chip-*` from the lab's chip families; `20-surfaces.js` treats the results tiles,
  the reel card, `.t-card`, `.t-sheet` and `.t-toast` as ordinary cards, sheets and toasts in every card style;
  inside a paper card the whole token set is recomputed (`paperVars`: text in accent, hot, good, bad and you is
  deepened to 4.5:1, while buttons, chips and badges keep their true faces). "Results tiles" (40-slips.js) is
  retired; old recipe codes still decode.
- New settings (console "Site system"): Button depth (Flat / Stacked / Keycap, `60-depth.js`: Stacked stands a
  flat-style button on two slabs, its own ink then the palette's second ink, swapped on secondaries, and it
  sinks in on press); Wins and losses (Look pair / Red losses / Gold and red: a pair's win is the accent only
  when it is a bright colorful ink, else sunflower; a loss must differ from the win and is never green);
  Section headers (As built or one `.t-head` variant everywhere, `65-heads.js`). Heat Vice uses Stacked and
  Look pair (pink wins, aqua losses); Gold Press uses Gold and red.
- Snapshots: the v51.1 recapture (93 states, four helpers, `docs/reprint-lab/capture/v51/`: the brief now
  points at the lab server on :8095; `snap.js` keeps a canvas's `data-*`). The build converts the frozen
  season prints to JPEG (`sips`), about 7.6 MB in all.
- Checked: all 17 looks on home, draft, results, ballot sheet, reel and Heat Check, plus Bonuses, FAQ, 404,
  Presti and the Daily gate on three looks (rendered boards in the scratchpad's `qa/`).
- LAB STATUS (end of session, stopped early: the owner's usage ran low): the lab code is committed with a fresh
  build in `docs/reprint-lab/reprint-lab.html` (on the branch preview at /docs/reprint-lab/reprint-lab), built from
  the v51 snapshots (5 of 93 had been recaptured from v51.1 when the four recapture helpers were stopped).
  CSS-only v51.1 fixes show anyway (the lab inlines the current styles.css); markup changes (flat pool chips,
  START OVER, trait-code text, Bonuses question voice...) show only after a recapture.
  NEXT: (1) recapture all 93 with docs/reprint-lab/capture/v51/BRIEF.md and group-A..D.md (four helpers, lab
  server :8095, site :8789; the v51 copies are in the scratchpad's snaps-v51/); (2) `node
  docs/reprint-lab/src/build.js <snaps> docs/reprint-lab`, check a few looks with qa/boards.js, commit, push;
  (3) republish the private artifact https://claude.ai/artifact/7Vqj7L2u5He21TRhETf8oH: build with an out dir to
  get `reprint-lab.artifact.html` (body only), `Artifact` read the url WITHOUT a path first (required), then
  publish that file to the url (no icon on a redeploy). NOT republished this session: the artifact still shows
  the pre-v51 lab; point the owner at the branch preview copy meanwhile.

### Owner's queued tweaks (2026-09-25, end of session; rough priority and logical order)
DONE 2026-09-25 (v51.2, one pass, shown to the owner as a Heat Vice board): items 1-8.
- Site: the "V" value label is back on the results cards (`<small>V</small>`, value over a replacement player;
  the hot-pick code already wrote it); the two-way profile sits inside the record card above SHARE
  (`.rr-twoway`, no border, the separate "Two-way profile" section is gone). Keys `20260925-fixes-v51-2`, BUILD_V "v51.2".
- Lab (Heat Vice): display face Big Shoulders (upright; Kanit Black Italic made everything italic); Wins and
  losses "Pair, swapped" (aqua wins, pink losses); new setting "Votes and tags: Wins and losses" (YES and trait
  tags in the win ink, NO and bad traits in the loss ink: no more yellow and red); neon looks draw position
  badges as pink tubes and the GOAT Climb in the second tube (aqua) with YOUR FIVE in pink.
- Only results-top and results-lower were recaptured (the rest are still the v51 snapshots).
Most are for the Heat Vice direction (neon). Do them after the lab recapture and artifact republish above.
1. Player trait badges are still yellow: find a color that matches the scheme.
2. The player value on results needs back the symbol it used to have (a Greek letter, an EV-style mark).
3. Most text looks italic (the chosen font, or real italics?): it is hard to read on badges and body text. Use an upright face.
4. Position badges on the results player cards: neon pink.
5. Wins and losses: probably light blue (aqua) as the main win color and the pink neon for losses. Many colors
   on that screen should probably swap this way.
6. Ballot sheet: the main YES/NO buttons should not be red and yellow (they clash with the palette).
7. GOAT Climb needs a neon teal secondary color (it is solid right now).
8. Offense/defense box: fold it into the bottom of the team record box, just above SHARE YOUR TEAM, with no
   border and slight padding.
9. The season-print mountain should fill with color only partially, in proportion to wins out of 82.
10. Masthead: the TRUE 82 title should be more neon, less riso/hand-drawn, closer to the ball icon. Keep the
    comet icon as configured but crop it tight (no blank space around it).
11. The dunk-the-ball interaction (Daily gate) needs a Vice neon makeover.
12. Home page: replace the intro text with a one-liner plus possibly a HOW TO PLAY button; the text below the
    voting card also goes, replaced by a how-to-play button somewhere.
13. Make sure HOW TO PLAY is dead simple (maybe a CSS tapping finger running a short video-like demo).
14. ADD DEFINITIONS TO TRAITS: where did those go? (Owner is asking; find and restore them.)
15. Import the "redraftables" from the test archive and review the other deltas with it.
16. Add Daily archive retrieval (play or view past Dailies).
17. Later: leaderboards, high scores, etc. with accounts (the accounts-test fork went far down that road).

### Calls made (owner may overrule)
- In today's colors the results, the reel and the ballot sheet are dark site cards (owner confirmed 2026-09-25).
- The season print on dark cards glows (screen blend on the card color) instead of the lab's old negative
  filter. `--t-print-filter` stays as an optional per-look knob.
- v51.1: a record under 61 wins shows no comp phrase on results; FIRE SALE uses the hot fire gold; money reads
  "$16M" with no thin space; the climb marker rides realized wins (it rode the pre-season net since v42, which
  contradicted the comp line); quiet buttons use the rule color for their border.
- Lab: trait tags and YES print in the palette's sunflower in themed looks (today's site uses its nearly
  identical accent gold); Heat Vice's results tiles now follow its outline cards (the old "Results tiles: Neon"
  glow is gone; "Neon amount: Max" puts a glow on every card edge); losses are never green; a dark or neutral
  accent hands the win to sunflower.

### What v51 changed on the site
1. **The theme** (`tools/theme-core.js`, the one source): about 40 base ROLES (each with one meaning:
   ground, text, label, accent, bad, hot, good, you, win, loss, the season-print inks...), 24 named SHADES
   (recipes: role mixed with a partner, computed ahead of time so the CSS never needs `color-mix`, which
   older phones cannot read), fonts, radii, a type scale, print effects, fixed effects (fire, the basketball,
   masks), and the legacy names (`--amber`, `--chalk`...) as aliases. `node tools/theme.js` writes the
   generated `:root` block between markers at the top of `styles.css`; `--check` verifies it.
2. **styles.css consumes only tokens.** All ~944 color uses were converted (the lab's color audit gave each a
   role; a fitter kept today's look: every live screen within about 2.5 CIEDE2000 of before, verified
   element by element on 99 snapshots with `docs/reprint-lab/capture/v51/compare.html`). Deliberate
   standardizations: dark text on gold is one ink (`accent-ink`, was two near-blacks); the trait chips,
   vote buttons and pool (i) button use the site keycap gold (was a slightly different slab); Heat meter
   level 3 is a touch paler. See-through colors are `rgb(var(--t-name-rgb) / a)`.
3. **Shared pieces** (styles.css "SHARED PIECES" section, shown live on `docs/style-guide.html`): `.t-btn`
   (data-kind primary/yes/no/good/quiet/text, data-size lg/sm; any plain button still gets the keycap from
   decorate3dButtons), `.t-chip` (tones yes/bad/plain/on, states .is-q/.is-off/.is-mine, `.t-chip-add`),
   `.t-card` (data-tone feature), `.t-sheet` + `.t-backdrop` + `.t-grab`, `.t-toast`, `.t-head` (section
   headers, 6 variants: eyebrow, rule, bar, title, banner, tab), type roles (`.t-num`, `.t-title`, `.t-name`,
   `.t-meta`, `.t-data`, `.t-label`, `.t-body`, `.t-small`), and `.t-mode` (plain h2/h3/p/table/input inside a
   mode root look right before they are styled).
4. **Section headers**: `head(context, text, opts)` in app.js (next to `esc()`); `HEADS` maps each context
   (home, poll, rules, reel, results, sheet, group) to a variant in one place; `?heads=<variant>` swaps all.
   Migrated: homepage Draft/Winning, the vote card lead, HOW TO PLAY title and sections, the reel header,
   results sections (and Kaman), ballot sheet title and group labels, the static index.html fallback.
5. **The grafted screens are on the system** (in today's colors they are now dark like the rest of the site,
   not cream paper; the owner has not seen this yet):
   - Results: the `.rr` tiles are the site's cards; YOUR FIVE cards are `.t-card` with the value as `.t-num`
     (DM Serif Display is gone, and dropped from index.html's font link); tags are the shared chip; SHARE is
     the primary keycap. The riso paper overrides and `--rr-*` tokens are deleted (`risoPaperOnce` removed).
   - THE SHAPE OF A SEASON (`results-riso.js`): reads every ink, the stock and both faces from the theme
     (`readTheme`, lazily; any missing token throws and the plain record stays). On a dark stock
     (`--t-print-paper` = the card color, `--t-print-blend: screen`) the inks glow like screen print on black
     card and the key ink is turned down to a glow. The ROSTER OVERLAY is new: the five names (slot, full
     name, 'yy) stacked in the theme's light ink with a pop-ink offset, on its own `.rr-print-names` canvas on
     screen (fades in as the season finishes) and drawn onto the 1080x1350 share poster (whose foot now
     only says TRUE82.NET · NET). `spec.roster` comes from app.js `resultsPrintSpec`.
   - The reel (`reel-riso.js`): the site's card, coins in `--t-win`, rings/L/drips in `--t-loss`, rims in
     `--t-print-pop`, veil in the stock color, faces from the theme (the L waits for the display face).
     Header is `.t-head`, SKIP the quiet button, the verdict the primary one.
   - The tag ballot sheet: `.t-sheet`/`.t-backdrop`, YES/NO/NOT SURE are `.t-btn` yes/no/quiet (lg),
     the tally number `.t-num`, the pill a plain chip, Change vote a text button, Done primary, toast `.t-toast`,
     the glove paints from CSS tokens.
   - The homepage vote card: its CSS moved from app.js's injected `ensureTraitsCss` (deleted, with its dead
     rules) into styles.css; YES/NO/IDK are `.t-btn`, the tag a chip, the lead a `.t-head`.
   - Bonuses (`bonuses/index.html`): loads `/styles.css`; its own block is layout + tokens only; buttons are
     `.t-btn`, status pills and the title tag are chips. `traits/index.html` (redirect stub) loads styles.css.
   - SVG icons in app.js (hoop mark, book icon, ball lever) paint from tokens through `style="fill:var(...)"`.
6. **Enforcement**: `tools/style-law.js` (run by test.js; 4 new checks): no hex/rgb/hsl/named
   colors or color-mix and no font families outside the theme block in styles.css, the browser JS, the pages'
   style blocks and style attributes (canvas modules may use pure black only as a coverage mask; browser
   chrome like `<meta theme-color>` is exempt); the theme block must match the generator; every token read
   must exist; the shared pieces and header variants must exist. Each finding names the nearest token.
   `tools/stylefix.js <file> --write` rewrites a graft's CSS/page to tokens in one pass.
7. **The lab can reprint the new pages** (the lab uses these since the same day): `#rrPrint` carries
   `data-spec` (the print's recipe); each `.riso-strip` carries `data-games`, `data-streaks`, `data-gi0`,
   `data-cl0`; `T82PRINT.print(spec, {root, width, dpr})` returns `{print, names, filter}` canvases;
   `T82PRINT.fonts(root)`; `T82RISO.strip({root, games, streaks, gi0, cl0, cssW, d})` prints a settled
   month; both modules accept `{root}` (the element whose theme to read) on mount/poster/create.
8. Keys (v51): `20260925-style-system-v51`, `BUILD_V = "v51"`. Since v51.1 every key is `20260925-fixes-v51-1`
   (styles.css, app.js, reel-riso.js, results-riso.js in index.html; `/styles.css?v=` in bonuses, traits and
   docs/style-guide.html) and `BUILD_V = "v51.1"`.
9. **One end time for the reel** (owner, later the same day): every season's reel now finishes at
   `REEL_END_MS` = 16.8s, so its length never spoils the record. `reelNaturalMs()` walks the natural schedule
   (month leads, one tick per game, each loss's hold) and `showSeasonReel` scales every wait (and reel-riso's
   hold and effect durations, via `info.pace`) by one factor. The target is the slowest of the 78-82-win
   seasons (78-4 with its first loss ending a streak), so those play at the natural, slowest pace (82-0 is
   stretched x1.44) and worse seasons run faster (41-41 x0.55, 10-72 x0.45; the old 26-56 took ~34s, now
   16.8s). Measured in the browser: 80-2 in 17.1s, 30-52 in 17.3s (timer overhead). The red flash keeps its
   own speed limit (`FLASH_GAP` 0.77s in reel-riso.js: never more than ~1.3 flashes a second, whatever the
   pace). QA: `?reelms=20000` tries another end time. test.js pins it. The owner kept pacing by the realized
   record (asked 2026-09-25: exactly 16.8s every time; the alternative, pacing by the pre-season net, was
   declined).

Verified in a browser (375px) on local servers: home (vote card, headers), a Classic draft, the reel (loss
effect, streak labels, finale), results (cards, chips, dark print with roster), the ballot sheet (ask, tally,
toast), Bonuses (question state), the share poster (saved and inspected), docs/style-guide.html.
Since then the v51 recapture helpers looked at every screen (their findings became the v51.1 fix list), and
the v51.1 helpers checked each fix at 390px and home, draft and results at desktop width. Kaman results and the
Tribune over the new results were still not looked at.


---

## 0000. The Reprint Lab (design exploration for the next version; nothing shipped)

2026-09-24/25, overnight: the owner asked for a "lab" (like the tennis Misprint Lab) to redesign the homepage
masthead and the whole site system. It lives in `docs/reprint-lab/` (read its README). One self-contained page,
`docs/reprint-lab/reprint-lab.html`, shows 17 complete looks and every toggle (palette, paper, wordmark type and
depth, icon concept and style, layout, additions, button/card/chip styles, corners, texture, night or paper ground,
fonts) on real snapshots of every screen except the retired Tribune. The site itself is untouched: no app.js,
styles.css, engine or site_data.json change, no cache keys bumped.

When the owner sends picks, they arrive as `T82-...` codes; decode with `LAB.decode` in the lab. The ship path
(tokenized styles.css + one theme block + generated component CSS + an exported masthead) is in the README.

Owner reactions so far (2026-09-25): he loves the dramatic neon buttons (Heat Vice; the lab's "Neon amount: More"
spreads them to every button, secondaries in the palette's second neon). He found the white paper tiles on the
results page jarring in dark looks ("Results tiles" setting added; default now follows the look's cards), and he
ruled out paper-only special cases: "nothing else is skeuomorphic", so a control must look the same on every surface.

### One enforced global style guide (owner's request, 2026-09-25; DONE in v51 and v51.1, see 00000)

The owner is about to add several new game modes and does not want to standardize screens piecemeal again. Goal:
every screen draws from ONE set of tokens and components, so a new mode is styled by construction.
- **The season reel (game by game) and the results page are off-system** (grafted on later: they carry their own
  fixed riso inks, the `.rr` private `--rr-*` tokens and their own type). Put them on the global roles: win/loss
  coins and their text in the system colors (e.g. the look's pink + teal, or at least a neon red for losses), the
  YOUR FIVE player result boxes on the global type scale and card component, and the crowdsourced-data pop-up
  (the tag ballot sheet; likewise the poll card and Bonuses) on the global sheet, button and chip components.
- **Section headers as a component** ("division headers"): one class with a few variants chosen in the backend by
  a single attribute, so modules can be dropped into any screen and match.
- **Enforce it**: styles.css consumes only tokens (the lab's tokenizer and audit in `docs/reprint-lab/` already map
  every color literal to a role); results-riso.js and reel-riso.js take their inks from the theme (the lab's
  `src/vendor/` copies show the hook); a test.js check fails on any new hex color or font-family literal outside
  the theme block. New modes use only the shared components.
- **Update the lab to match**: coins, reel text and results boxes follow the palette; a toggle for the header
  variants.
- **Share picture**: add a white text overlay on the final results print (the season picture and the share poster)
  with the five player names stacked, so the shared image reads as a roster card.

Site bugs the capture agents found in passing (all fixed in v51.1):
- Question share links under `/bonuses/<slug>` 404 because `_routes.json` does not route `/bonuses/*` to
  `functions/bonuses/[slug].js` (already listed as a pending manual edit).
- On the homepage poll card, `.tm-sharebar{display:block}` overrides the `hidden` attribute, so the Share Vote bar
  still shows after the fifth answer.
- `has-pick` stays on `<body>` after the draft ends (visible on the reel and results).
- Searching the draft pool for a name with no match shows a blank pool with no message, and the MORE PLAYERS cue
  still floats over it.

---

## 000. V50: riso results + the tag ballot

The results screen now prints on the reel's paper stock, and the five
player cards under the score are the tag ballot from the owner's voting
package (`docs/ballot/`: AGENT_BRIEF.md, TAG_BALLOT_HANDOFF.md and the two
prototypes; the prototypes are behavior specs, not pixel specs).

What the player sees, top to bottom:
- THE SHAPE OF A SEASON (results-riso.js): the season as a riso landscape.
  Waterline = .500, each win lifts the ridge, each loss drops it and leaves
  a pink bead, sun height = win rate, inks cool as the record falls (golden,
  dusk, night with a moon). The strip under it is the exact game-by-game
  record. Analytic runs (Daily, Pro, challenges) have no games, so they print
  the projected slope and say PROJECTED OVER 82 GAMES. The plain record stays
  in the DOM (screen readers, the Heat Check rewrite, no-canvas fallback).
- Net rating, the comp line, SHARE (navy keycap, pink offset; sunflower
  offset and pulse at 81/82).
- YOUR FIVE: the ballot. Card = slot badge + name (bbref link), season and
  team (team link), the engine value as the hero number in DM Serif Display,
  one mono box-score line, then the tags. Moved up above the two-way profile
  (owner fact: about half of finishers never scroll to the roster).
- Two-way profile, GOAT Climb, Scoring Card, Run it back: same content, re-inked
  on paper slips. On paper, riso blue means "you" everywhere: your ballot
  ring, your climb rail and marker.

The ballot (app.js, "v50 THE TAG BALLOT"):
- Three tag states only: on (sunflower keycap; scarlet for a bad trait),
  "?" (same keycap plus a navy badge: the scout called it close, or the crowd
  is split), off (hollow with an X: you said NO to a settled tag; it stays so
  the dispute reads). "+" last. Blue ring = you voted.
- Tap a tag: bottom sheet, the trait's own question ("Was 2016 Huertas
  hunted on defense?"), YES / NO / NOT SURE, then the tally in words, a bar
  and a pill (Ruling stands / Ruled out / Disputed, flips at 62% / N more
  votes settle it). The big percentage only prints once the vote minimum is
  met. Change vote, Done. "+" opens the picker: Open questions first, then
  Offense / Defense / Reputation.
- One op=vote per answer, source "card", spaced 1.3s apart client-side (the
  server fence is 1.2s). A failure reverts the tag and toasts "Not saved".
- White-glove hint once per browser (localStorage `tb-hint`), only when the
  first card is fully on screen and nothing is over it.
- The bottom "did we get it wrong" widget, the label legend and the
  tap-to-expand label chips are gone from results (wireTraitsPrompt,
  wireTraitCardUi, wireTraitsLabels and buildTraitLegend were deleted). The
  draft pool keeps its read-only chips; the strike-through anti chip is
  retired everywhere (applyLabelChips filters it, the server stops sending it).

Server (functions/api/traits.js, starts from the package's v49.9):
- op=labels reads the scout layer (community > desk > scout), scoped to the
  requested players; returns `labels`, `qids`, `open` (scout unsure), `split`
  (community tally in the disputed band), `rules`, and with `mine=1` the
  voter's own answers. Anti hits are no longer emitted (a ruled-out trait
  still blocks lower layers).
- op=vote creates a missing question on its first vote when the body carries
  `player` and `season` and the id is exactly slug(player)-season-<core trait>
  (the same id space op=roster and the scout backfill use; accented names
  fold the same way). Creation happens after the rate fences.
- Sources gain "card" (results) and "record" (the future rater page). The
  package's op=engq is not carried over: create-on-first-vote replaces it.

Migrations (NOT applied to production by this session; see MIGRATIONS-NOTES):
- `0026_scout_claims_v1.sql` (the package's 0013, renumbered; 7.6 MB, needs
  wrangler, not the console paste) and `0027_hunted_trait_v1.sql`. Apply both
  when v50 deploys. Before 0026 lands, the new traits.js degrades to the two
  older label layers; without 0027, a HUNTED vote returns unknown_question
  and the card reverts it.

Files and keys:
- `results-riso.js` (new), `app.js`, `styles.css` at `20260924-riso-results-v50`;
  `reel-riso.js` unchanged at its v48 key. `BUILD_V = "v50"`.
- index.html loads DM Serif Display (the value serif, the owner's pick). New
  CSS uses only weights already loaded (no 800), so no existing text changed.
- The site's 3D button decorator skips the ballot's buttons (BTN3D_EXCLUDE).

Invariants (do not break):
1. Cosmetic print. results-riso.js reads only the spec app.js hands it; any
   throw logs "[t82] results print off" once and the plain record stays.
   `?riso=0` turns off both the reel and the print.
2. The print never reveals under an overlay: it mounts on blank paper and
   prints in once it is on screen with no Tribune / Heat Check / sheet up.
   A hidden page prints it finished.
3. The Heat Check 81 to 82 save re-prints the season (the rescued loss flips
   and gets a pink ring) and re-bakes the share poster (resultsPrintRecord).
4. Share text is byte-for-byte the locked SHARE FORMAT LAW text. When the
   device can share files, the season poster (1080x1350 JPEG, baked in idle
   chunks after the page settles) rides along; the analytics method reads
   `native_share_print`. Daily practice runs never attach it (they share the
   official numbers). No poster ready = plain text share, never a wait.
5. Ballot copy has zero em-dashes (test.js pins it).
6. The engine is untouched. The engine's own 3PT / GRAVITY chip is a settled
   tag; a NO can mark it "?" but never removes it. Settled gravity hides 3PT;
   an unsettled gravity question does not.

Calls made to reconcile the package with this branch (owner may overrule):
- The brief was written against the accounts-test fork (v49.x, per-chip vote
  strips, op=engq). This line never had those; the ballot was wired straight
  onto the v47.5 roster, and the brief's "deploy after each step" became
  "push c-code-clean", since main auto-deploys.
- Five core traits the brief does not list exist in D1 (0018): Championship #1
  (TITLE #1, sunflower), Ball Pounder and Foul Merchant (scarlet), plus Ball
  Stopper and Stat Padder, which the brief does list. All show when a
  ruling says so and vote like any tag. "+" offers only the brief's set
  (12 core + Hunted, Ball stopper, Stat padder), which keeps the owner's
  four-negative ceiling for adds.
- Thresholds are the server's live rules (qualify 62%, rule out 38%, 25 vote
  floor) rather than the brief's working 60/40/10; the pill reads the live
  number, so changing the D1 rule changes the copy.
- NOT SURE on a settled tag leaves it on (ringed) instead of a fourth
  hollow-with-? state, to keep three states.
- Hunted sits in the Reputation group, as in the brief's rater list.

Verified 2026-09-24 against a local Pages + D1 copy (wrangler pages dev with
migrations 0010-0027 applied locally): Classic 79-3, 80-2, 81-1, a 4-78
night print, a Presti run through the mid-season Heat Check, the Daily
(projected print, official run); tag sheet, NO to hollow, reopen shows the
live tally, change vote, Escape, the "+" picker, create-on-first-vote
(Hunted, and an accented name), the ring from mine=1, a simulated 81 to 82
save re-printing the season, the share poster file, draft pool chips with no
anti chips, mobile 375 and desktop 1280. node --check on all eight browser
JS files and node test.js: 54 passed (10 new ballot checks).
Not verifiable in the headless pane: the reveal animation and the glove fly-in
(the pane was hidden, which pauses animation frames); both were exercised by
direct call.

Open items for the owner:
- Apply 0026 and 0027 with the v50 deploy (the 0026 step needs wrangler or the
  GitHub Action in docs/ballot, which needs the database name and two secrets).
- The standalone rater (/bonuses/ as "The Record", brief section 7) is not
  built; it needs op=disputed, which does not exist yet.
- The draft pool still prints the old abbreviations (CLTCH, RIM-D, SWCH-D,
  GRAV...) while the ballot uses the brief's (CLUTCH, RIM-P, SWITCH, GRAVITY).
  Left alone because the brief says the draft screen is untouched and longer
  chips would re-wrap the tuned pool rows.
- Curated questions spell accented names without accents (nikola-jokic-2023)
  while the game and the scout data keep them (Nikola Jokić), so those
  players' desk labels never match. A name-folding migration would fix it.
- Per-run link cards (OG images for Tribune editions) are still the share
  law's queued "visual layer"; v50 attaches the poster in the share sheet
  instead.

---

## 00. V48: riso reel (THE SEASON · GAME BY GAME)

The season reel now prints as a risograph ledger on a paper card. Wins stamp
in as Sunflower coins that run hotter with the streak (thicker rim at 10,
halo at 20, glint at 30, a burst every tenth straight; SWEPT stamp on a
perfect month). Losses break the rhythm on purpose: the cursor holds, the
card shakes and flashes red, a scarlet ring slams down, cracks, sprays and
bleeds, and a giant misregistered L lands and drains while the card sags.
The drips stay in the ledger, so losses still read at the end.

Files and keys:
- `reel-riso.js` (new): all rendering. Loaded by a plain deferred tag in
  index.html, not loadScriptOnce (that would log an analytics event per load).
- `app.js` showSeasonReel: small hooks only (riso.create / openMonth / stamp /
  closeMonth / finale / destroy). Chips remain the fallback.
- `styles.css`: one block scoped to `.reel-overlay.riso`.
- Keys: styles.css, app.js and reel-riso.js at `20260924-riso-reel-v48`;
  `BUILD_V = "v48"`.

Invariants (do not break):
1. Cosmetic only. reel-riso.js never reads or writes season.games; the
   cursor engine in app.js owns the season, the Mid-Season Heat Check pause,
   its re-roll and SKIP. Squares are stamped from the live value at
   placement, so a Heat Check re-roll is always honored.
2. Fail soft. Every call goes through risoCall; any throw logs
   "[t82] riso reel off" once and the reel continues on W/L chips.
3. Loss pacing lives in holdFor/heavy. The first 14 losses get the full bang;
   after 14, losses still slam and bleed but skip the flash and hold only
   240ms. Since v51 every hold is scaled by the season's pace (one end time
   for every record, see section 00000 item 9), and the red flash has its own
   limit (FLASH_GAP: never more than ~1.3 a second, well under 3/s). test.js
   pins both.
4. Copy law holds: loss captions have zero em-dashes (pinned by test.js).
5. Fast-forward (SKIP before the Heat Check) stamps instantly with no
   effects and no hold.

QA switches:
- `?riso=0`: plain W/L chips (the pre-v48 reel), for comparison or rollback.
- `?risoslow=6`: every reel effect and the loss hold run 6x slower, for
  reviewing a loss frame by frame.
- `?midhot=1` (existing): forces the Mid-Season Heat Check, which exercises
  the pause, resume and fast-forward paths through the new hooks.

Verified 2026-09-24 on a local build: real Classic run; a 78-4, a 26-56 and
an 82-0 season fed straight to showSeasonReel; a loss in game 2; Presti with
?midhot=1 through the pause, decline and resume; ?riso=0. No console errors.
Reel length measured: 82-0 11.8s (unchanged), 26-56 34.2s. Loss holds add
up to about 12.5s for a season with 14 losses, about 5s for 78-4 (computed).
node --check (all five browser JS files) and node test.js: 44 passed.

### 00a. Housekeeping (2026-09-24, no build change; BUILD_V stays v48)

- Public copy no longer promises gated features. Duel, League, Arena, the
  weekly challenge and Today's Board need accounts.js / duel-*.js /
  league-ui.js / arena-ui.js, which live only on `accounts-test` (all 404 on
  true82.net; index.html's CSS block hides their buttons). The faq, md/faq.md,
  how-it-works and llms.txt now describe only what ships: the solo modes and
  THE DAILY with its challenge link. Re-add the copy when those files ship.
- Removed stale root copies of functions/_middleware.js, functions/[id].js and
  functions/r/[id].js (older versions, unreferenced, publicly downloadable).
- CONTEXT.md retired to docs/history/CONTEXT-2026-07.md. This file is the only
  current-state doc. (app.js still has one comment that says "see CONTEXT.md";
  left alone to avoid a cache bump for a comment.)

---

## 0. V47.5: results-roster player-label UI

This is a code-only, single-executable-file change. No SQL or D1 action is required.

Changed executable file:

- `app.js` only

Behavior, limited to the results page `Your five` roster section:

- Settled player labels render as compact abbreviations.
- Each label is a real button; tap toggles the full trait name in place.
- One information button appears beside `Your five` only when labels exist.
- The information button opens an inline legend for only the labels present on the five cards.
- The first time the label area enters view, the labels pop and the information button pulses once.
- That discovery cue stops permanently after the browser taps either a label or the information button (`t82_trait_card_ui_seen_v1`).
- Crossed-out anti-labels retain the red strike-through.
- `prefers-reduced-motion` disables the discovery animation.

Intentionally unchanged:

- `functions/api/traits.js` and every other Worker
- D1 schema, questions, votes, consensus, and editorial rulings
- simulation, player values, net rating, wins, taxes, and roster generation
- draft-screen player rows and the existing engine-derived `3PT`/`GRAVITY` chips

Review target: the diff around `TRAIT_CARD_ABBR`, `wireTraitCardUi()`, `wireTraitsLabels()`, and the results roster heading. There is no reason to revalidate unrelated game systems.

---

## 1. Canonical project structure

This archive is already flattened and deployable. Its contents belong directly at the repository/Cloudflare Pages root.

- Do **not** wrap the project in another `true82-live-with-daily/` folder.
- Do **not** add `.wrangler/`; that is local Cloudflare state, not deployable source.
- There is one canonical copy of each file.

Critical browser load order in `index.html`:

1. `analytics.js`
2. `retention-client.js`
3. `sim-core.js`
4. `challenges.js`
5. `daily-core.js`
6. `app.js`

The Daily depends on `challenges.js` loading before `daily-core.js`, and both loading before `app.js`. The retention client must load right after `analytics.js` so its subscriber is attached before any gameplay script can emit.

---

## 2. Recent user-facing work already implemented

### A. Presti bank is the visual focal point

**Goal:** the amount left to spend must be impossible to overlook.

Implemented in:

- `app.js` → `modePanelHtml()`
- `styles.css` → `.cap-mode-panel`, `.mp-bank`, `.mpb-lab`, `.mpb-amt`

Current behavior:

- Presti gets a dedicated grid layout.
- BANK is centered in its own high-contrast plaque.
- The dollar amount is much larger than neighboring information.
- Spending/refunds trigger red/green pulse feedback through `tickBank()` and the `bank-down` / `bank-up` classes.
- Responsive rules preserve the hierarchy on narrow screens.

Do not casually shrink or right-align the bank. The deliberate design hierarchy is:

1. BANK amount
2. board/team information
3. HOW TO PLAY

### B. Presti player rows are vertically compact

Implemented in:

- `app.js` → `capRowHtml()`
- `styles.css` → `.player-row.cap-row`, `.cap-main`, `.cap-meta`

Current row anatomy:

- Left column: player name, then position and season/team metadata directly beneath it.
- Right column: stable DRAFT price box.

This replaced the taller two-row layout. Preserve the right-side price scanning column and keep position under the name.

### C. HOW TO PLAY button was normalized

Implemented in:

- `app.js` → `modePanelHtml()`
- `styles.css` → `.mp-rules-btn`, `.mp-book-wrap`, `.mp-rules-text`

Current behavior:

- It is an explicit gold `presti-spin` button, not a loose icon/text combination.
- The book icon is contained in a small interior tile.
- Text is fully contained: `HOW TO PLAY` plus `RULES & SCORING`.
- It has keyboard focus styling and responsive full-width behavior where necessary.

### D. Rules-sheet order was intentionally reversed

Implemented in `app.js` → `rulesSheetHtml()`.

After any Daily-specific law/twist content, the order is now:

1. Current base-mode rules, e.g. `PRESTI MODE RULES`
2. `CHANGE THE YEARS`
3. `WHAT WINS GAMES`
4. General `THE GAME IN 20 SECONDS` instructions

The user specifically wanted the relevant mode mechanics first and generic game instructions later. Do not restore the old game-first order.

### E. Daily gate has a conventional fallback button

Implemented in:

- `app.js` → Daily gate rendering and `launchFromGate()`
- `styles.css` → `.gate-play-btn`

The ball-through-hoop interaction remains the primary ceremony. A conventional gold **PLAY IT** button sits under it for users who do not understand the drag interaction.

Both launch paths use the same run-start function. Keep that single launch path so interaction and fallback cannot drift apart.

---

## 3. Critical Small-Ball Apocalypse rule and bug fix

### Challenge identity

- File: `challenges.js`
- ID: `small_ball_five`
- Display name: `The Small-Ball Apocalypse`
- Base mode: Presti / `cap`

### Exact intended rule

- Every **guard or forward slot** must be occupied by a player listed at **6'4\" or shorter** (`height <= 76 inches`).
- The single **center slot** may ignore the height cap.
- To use the center-slot height exemption, the player must be career-position eligible at **both forward and center** (`F` and `C`).
- Therefore, the draft can contain at most one height-exempt tower, and a tall F/C cannot be placed into a forward slot.

### Current implementation

`filter(row, t)` controls who may appear in the challenge pool:

```js
var shortEnough = row[t.IDX.ht] > 0 && row[t.IDX.ht] <= 76;
return shortEnough || !!(set && set.F && set.C);
```

This keeps:

- all short players, and
- tall players only when they are genuine career F/C options capable of filling the special center slot.

`pick(S, row, slot, t)` applies the rule to the actual destination slot:

```js
if (slot === "C") return !!(set && set.F && set.C);
return row[t.IDX.ht] > 0 && row[t.IDX.ht] <= 76;
```

This is the essential protection. The pool filter alone is not sufficient because eligibility is slot-sensitive.

### Why the prior behavior was wrong

The old rule globally exempted anyone with center eligibility from the height cap. Once such players entered the pool, the normal multi-position machinery could allow them into non-center slots, which effectively let the user draft a frontcourt full of tall centers.

The fix separates:

- **pool eligibility** (`filter`) from
- **slot legality** (`pick`).

Do not replace the current `pick` hook with a simple global center exemption.

### Position source

The F/C qualification comes from `CAREER_BUCKETS`, built in `sim-core.js` from every bucket the player qualified for across his career.

Relevant engine flow:

- `sim-core.js` → `rowDraftable(S, row)` checks challenge `filter` and whether at least one open slot passes the `pick` hook.
- `sim-core.js` → final pick operation checks `ch.pick(S, row, bucket, T.t)` again.
- `app.js` → `pickBlock()` and `bucketLegal()` mirror the same legality in the UI, preventing cards or assignment buttons from lying about what the engine accepts.

### Matching user-facing copy

`daily-core.js` contains updated short and gate copy for `small_ball_five` explaining:

- G/F slots are 6'4\" and under.
- Center may be taller only if also forward-eligible.
- The design permits one tower, not several.

Keep copy and mechanics synchronized.

---

## 4. Files changed by the most recent Small-Ball fix

- `challenges.js`
  - updated `small_ball_five.blurb`
  - changed `filter`
  - added slot-specific `pick`
- `daily-core.js`
  - updated short and gate explanatory copy
- `index.html`
  - cache-bust keys for challenge/daily modules

No change to the generic position engine was needed. This is deliberately challenge-local.

---

## 5. Cache/version discipline

A previous regression occurred because fresh markup loaded against stale CSS. Treat cache keys as part of the deployment.

Since v64.1 the versioned static files are cached by browsers for a year (`_headers`, immutable), so a stale key is no
longer harmless: returning players would keep the old file. The keys live in `tools/cache-keys.json` and every page
carries them. After editing any listed file, run `node tools/cache-keys.js --stamp <key>` (for example
`20261001-v65`): it gives every changed file the new key and rewrites every reference. `node test.js` fails on a
changed file under an old key, on a bare or stale reference, and on a `_headers` list that drifts from the manifest.
A new static file joins by adding it to the manifest and to `_headers`, then stamping. Bump `BUILD_V` in app.js in the
same commit (the footer's version law), then stamp (app.js changes when you do).

---

## 6. Robustness invariants to preserve

1. **UI and engine legality must agree.**
   - `app.js` UI checks and `sim-core.js` final pick checks should reach the same answer.
2. **Challenge-specific slot rules belong in `pick`, not only `filter`.**
3. **The Daily must fail soft.**
   - Missing decorative assets must not prevent play.
4. **The player pool must not strand a draft.**
   - Any new narrow challenge should be tested through complete five-pick simulations.
5. **Presti bank remains the strongest visual anchor.**
6. **The Daily gate keeps both start methods.**
   - Ball interaction and PLAY IT must invoke one shared launch function.
7. **Do not reintroduce duplicated project folders or `.wrangler` state.**

---

## 7. Minimum validation before handing off another build

Run at least:

```bash
node --check app.js
node --check sim-core.js
node --check challenges.js
node --check daily-core.js
```

Then verify:

- Presti opens and BANK is centered/prominent.
- HOW TO PLAY opens and mode rules precede generic instructions.
- Daily gate starts through both the dunk interaction and PLAY IT.
- In `small_ball_five`:
  - a tall pure center is not legal at center unless also F-eligible;
  - a tall F/C is legal only in the C slot;
  - no tall player is legal in a G/F slot;
  - short players still obey ordinary positional eligibility;
  - one full five-player draft can complete without a dead end.
- ZIP integrity passes after packaging.

---

## 8. Deployment

Upload the **contents** of this folder to the repository root. Do not upload the containing folder itself.

For Cloudflare Pages:

- deploy to a preview branch first;
- hard-refresh or use an incognito window to verify cache-busted assets;
- play through the affected Daily challenge before promoting to `main`.

---

## 9. Historical documentation

`docs/history/CHANGES-THE-DAILY.md` contains the longer history of The Daily’s design and architecture. It predates some of the July 18 UI work, so use this handoff as the current-state summary and the older file as historical context.

### 2026-07-18 mobile hierarchy follow-up (V16)
- A regression appeared on mobile after the bank-prominence work: the **HOW TO PLAY** button expanded into the dominant full-width row while the **BANK** was pushed into a smaller top-right tile.
- This was corrected **in CSS only** in `styles.css`, inside the `@media (max-width: 640px)` block for `.cap-mode-panel`.
- Current intended mobile hierarchy:
  1. left = mode / daily text
  2. right = compact **HOW TO PLAY** utility button
  3. second row = full-width **BANK** hero tile
- If the panel looks wrong again on mobile, inspect the `.cap-mode-panel` media-query grid areas first.

### V17 layout and rules-order invariant
- **HOW TO PLAY has no subtitle.** Do not restore “Rules & scoring”; it wastes horizontal room needed by the bank.
- On wider panels, `.cap-mode-panel` explicitly gives the bank a `minmax(210px, 0.86fr)` column while HOW TO PLAY is capped at 150px.
- On mobile, the bank remains a full-width hero row; HOW TO PLAY is intentionally compact in the upper-right.
- In every mode, rules-sheet order must remain: mode rules, change the years, game in 20 seconds, then what wins games.


### V18 — gate DRAG cue + re-certification of the small-ball rework (2026-07-18)
- Adopted the v17 archive as canon; the prior lane's determinism laws all
  survived it (60-day legacy fixture: 0 mismatches; POOL2 rotation, the 7/18
  override, and the frozen weeklyFor verified intact).
- The reworked `small_ball_five` (slot-specific `pick` hook) was re-certified
  with a slot-aware bot: 300 full games, 0% unfinishable, median pool 35,
  median C supply 16, wins 44/56/68. Supporting data: 0 legitimate short
  C-only careers are stranded by the F+C requirement; 667 tall F/C careers
  supply the unicorn slot; the name-collision path narrows to 2 careers.
- The offline validation walk (/home/claude/validate.js in the working
  session; 117 checks) now filters bot bucket choices through `ch.pick`,
  matching `bucketLegal()`. Any future slot-dependent challenge hook is
  covered automatically.
- Gate: the caption's arrow and a new DRAG pill are wrapped in `.gate-cue`,
  animated with the SAME `gateNudge 1.7s` as the idle ball, so ball, arrow,
  and word bob in parallel (drag = move ball = dunk). The old standalone
  arrow bounce is retired. Reduced motion disables the cue.
- Cache keys: `app.js` and `styles.css` bumped to `20260718-ui-v18`;
  challenge/daily modules unchanged at `smallball-fix-v14`.

### V19 — the bank moves to the tray (2026-07-18, owner-directed)
SUPERSEDES the earlier bank invariants in section 2A and section 6.5. The
owner judged the panel plaque "still not optimal" after v15-v17; the root
cause was position, not size: the top panel is read-once chrome, and a live
number dies there. Current design:
- The bank is a strip on TOP of the tray (`.tray-bank`, outside `#trayInner`
  so tray re-renders never clobber a mid-tick), above the slot medallions
  and the confirm button: the checkout total next to the pay button.
- LIVE MATH: selecting a priced player shows the pending hit beside the
  balance (`#bankDelta`, fed by `updateTray()` via `effCost`). Confirm or
  deselect clears it; `tickBank()` then plays the real deduction in the
  same spot with the red/green pulse.
- LOW-FUNDS STATE: `.bank-low` (toggled in `tickBank()`) turns the strip
  whistle-red when budget <= open slots + 1, the approach to the
  $1M-per-slot floor.
- The Presti panel is back to identity + HOW TO PLAY (desktop two-column,
  mobile single row); the orphaned `.mp-bank` CSS rules are inert and may
  be deleted in a future cleanup.
- New invariant: THE BANK LIVES IN THE TRAY. Its id (`bankAmt`) and the
  tick classes (`bank-down` / `bank-up`, now on `.tray-bank`) are load-
  bearing for the offline walk (119 checks).
- Cache keys: app.js and styles.css at `20260718-ui-v19`.

### V20 — plaque restored; the v19 experiment resolved (2026-07-18)
SUPERSEDES V19. The tray-strip relocation was tried and the owner judged it
a step back: the strip lacked the plaque's material presence and read as an
afterthought. FINAL BANK DOCTRINE, do not re-litigate:
- The bank is the v17 PLAQUE in the mode panel (`.mp-bank` / `#bankAmt`),
  desktop 3-column grid, mobile full-width hero row. That object won.
- The v19 innovations survive in better homes: the spend math rides the
  CONFIRM LINE at the point of action ("<name> <yr> · $23M · leaves $27M",
  built in `confirmHtml()`, now shown in BOTH single- and multi-bucket
  paths), and the low-funds warning (`.bank-low`, toggled in `tickBank()`
  when budget <= open slots + 1) turns the plaque whistle-red.
- `tickBank()` classes (`bank-down`/`bank-up`) land on `.mp-bank`.
- The tray contains medallions + confirm only. No `.tray-bank`, no
  `#bankDelta`; that CSS was deleted, not orphaned.
- Offline walk: 119 checks green. Cache keys `20260718-ui-v20`.

### V21 — mobile vertical diet (2026-07-18)
One appended media block at the tail of styles.css slims every fixed band
on <=640px (plaque horizontal at half height, ticket headline clamp
22-28px, crest zone 88px, tray/panel/skip tightening). Desktop rules are
untouched; the plaque doctrine from V20 stands. Keys `20260718-ui-v21`.

### V22 — detail polish (2026-07-18)
Mobile plaque label vertically centered; skip labels center left of their
chips at all viewports; price boxes are bare numbers (cc-tag removed from
capRowHtml, the walk asserts its absence). Desktop verified: v21 stays
caged in its media block. Keys `20260718-ui-v22`.

### V23 — independent slot reels (2026-07-18)
scramblePool rewritten from lockstep repaints to per-element reels: each
season face / price amount / decoy name snapshots its innerHTML, flips
random plausible values on its own decelerating timer, and restores the
snapshot on the last tick (carets and fire-sale strikes survive). refreshPool
still runs once at the end as the truth re-render, and a dur+900ms hard stop
means the pool can never stay locked. The walk (121 checks) asserts the
snapshot-restore pattern. Also: tray top padding 2px, "open" medallion
caption removed in lineupRailHtml, sk-lab 14px/12.5px, hoop mark centered.
Keys `20260718-ui-v23`.

### V24 — results rework + canonical ladder (2026-07-19)
HISTORY_COMPS in app.js is the single source for the climb pins and the
results comp line; META.legends is no longer read. The daily results board
carries plq-frame itself (.daily-framed); .daily-card/.daily-verdict/
.daily-brand markup is gone (CSS inert). Practice is reachable ONLY via the
results againBtn; the played tile offers CHALLENGE A FRIEND only, and
el("startDaily") does not exist once played (wiring is null-guarded). The
walk is at 131 checks and asserts all of it. Keys `20260719-ui-v24`... note:
keys actually read 20260718-ui-v24 if the date prefix was preserved; trust
index.html.

### V25 — glow, tiers, money type, metric years (2026-07-19)
climbHtml groups HISTORY_COMPS by win total (shared pins); mHtml() is the
display-layer money wrapper (thin space + .m-lite M) used at every BOLD
money site including tickBank (now innerHTML) and the reel priceVals (reels
detect "<" and use innerHTML); applyMetricYears(force) governs classic
OBPM/DBPM year repicking (force=chip click, soft=per-deal fill). The walk
is at 136 checks. Keys `20260719-ui-v25`.

### V26 — ladder fix, tight bank, daily head line (2026-07-19)
mHtml(txt, tight) gains the tight flag (bank sites pass true). Daily
results header is .daily-head-line (single gold line); .daily-stamp markup
is gone from results. Summit cap: no background, z-index 3. The walk's
skip-tick test validates against window.__t82test.dbg().budget because
refund procs make the -$1M assumption false. 140 checks. Keys
`20260719-ui-v26`.

### V27 — daily analytics funnel (2026-07-19)
The daily has no mode of its own; it inherits board.base. Diagnosis: mode
totals silently absorb daily runs, and the gate step was untracked. Added
daily_gate_view (emitted in renderDailyGate, allowlisted in
functions/api/event.js) and two /avocado cards driven by three new queries
in the main Promise.all (dailyFunnelRows / dailyShareRows / dailyByBaseRows),
all keyed off variant LIKE 'daily%'. Funnel = gate->start->complete->share.
Menu practice reruns skip the gate by design, so the card separates first vs
practice starts. Keys 20260719-ui-v27. Client walk unchanged at 140.

### FLAGGED, NOT BUILT (2026-07-19, owner-queued)
1. RESTORE practice replay on the played daily tile. V24 removed the RUN IT
   BACK button per instruction; owner has reversed: practice must be
   reachable from the tile again (currently results-screen againBtn only).
   Do not restore the old first-letter styling bug with it.
2. Daily SHARE TEXT redesign in prototyping: direction is brand+day line,
   win-bar emoji rail (8 blocks of 82), fused percentile + historical-comp
   line, the five, verdict/challenge voice, beat link. Comp line is
   buildable now (HISTORY_COMPS client-side); percentile requires a
   same-day score-distribution endpoint. Design the FORMAT LAW change once
   to accept both. share_click (intent) vs share (completed) event split
   also queued for the funnel.

## SESSION HANDOFF (2026-07-19, context rollover)
This session ends at build v27.1. The next session starts here. Read this
whole file top to bottom first; the sections below are the active work.

### SHARE TEXT v2 — FORMAT LOCKED BY OWNER (build this next)
The share text for ALL modes moves to this exact shape (owner-final):

    TRUE 82 {#9 | Classic Mode | Presti Mode}
    {emoji} 66-16 | Better than the Heatles
    Top X% of drafters

    '96 Jordan
    '01 Duncan
    '75 Walton
    '11 Curry
    '82 McHale

    true82.net/D9X4K2

Decisions already made:
- Line 1 context slot: daily number for dailies, mode name otherwise. The
  format applies to every mode's share, not just the daily.
- Line 2: leading emoji, record, PIPE separator, then the historical comp.
  Owner's sketch uses "Better than {team}" (highest tier cleared), NOT the
  results screen's "Almost as good as {next above}". Resolve the tie case
  (66 wins vs the 66-win Heatles) before shipping; comp data =
  HISTORY_COMPS in app.js.
- Line 3 "Top X% of drafters" is REQUIRED in v1, so the same-day score
  distribution endpoint must be built (D1, game_complete events, variant
  scoped). Open: what population for non-daily modes (all-time same-mode?).
- The five: vertical, one per line, WITH years. This is the flex; keep it.
- No emoji boxes/rails ever: encodings that need a legend are dead (owner
  ruling after three iterations). Emojis are TONE, not data.
- EMOJI BANDS ARE THE OPEN DESIGN WORK: the owner wants the emoji tailored
  BY MODE and BY PARTICULAR DAILY (a small-ball day can carry its own), on
  win bands, with the median band showing NO emoji (scarcity is the
  signal). Direction from this session: 82-0 goat, 78+ trophy, 70-77 fire,
  median clean, disaster ice. Bands + per-mode/per-daily sets are NOT
  final; work with the owner to pick them.
- The visual layer (colors, wordmark, dressed five) belongs to the LINK
  CARD: extend the Tribune share function to render per-run OG previews.
  The text stays plain.
- Shipping it is a FORMAT LAW amendment: update shareTextDaily (daily-core)
  + the vanilla share builders (app.js), repin the real repo's test-lane
  byte pins, keep "$17M" plain in share strings (mHtml is display-only),
  no em-dashes, U+2212 for negatives.
- Also queued with it: share_click (intent) vs share (completed) event
  split, and aggressive Basketball-Reference outbound links on the results
  five (search-URL form: basketball-reference.com/search/?search=NAME —
  never constructed profile URLs, name collisions break them; results
  screen only, never mid-draft).

### DEV TOOLS (they live OUTSIDE the repo and die with the session)
The offline validation walk (validate.js, 140 checks), the playability
audit bot (audit.js), and the 60-day legacy schedule fixture
(legacy-fixture.json) are packaged separately as true82-devtools.zip. To
run: put the repo at /home/claude/true82 (or edit ROOT at the top of each
script), npm install jsdom in the parent dir, then `node validate.js` and
`node audit.js 300 [pool2|synth|one <id>]`. Traps the scripts already
handle, do not regress them: bots must filter buckets through ch.pick
(slot-dependent hooks exist), money asserts normalize the thin space
(M$ helper), the skip-tick test is refund-aware, reel asserts wait out the
animation. Shell trap for the next agent: a heredoc inside a bash
&&-chain ends the chain at its terminator; run multi-step edits as
separate commands or via script files.

### STATE AT HANDOFF
Live build v27.1 (client keys 20260719-ui-v26; the v27 changes were
Function-side plus one client event, keys ui-v27 in index.html). Walk: 140
green, three consecutive runs. Today = Daily #8 golden_age; rotation is
live and verified against the fixture. Everything shipped this session is
logged above in the V13-V27.1 sections and in docs/history/CHANGES-THE-DAILY.md.

### V28 — practice restored, SHARE FORMAT LAW v2, percentile, Sports-Reference outbound (2026-07-19)
Both FLAGGED items above are now BUILT; the queued share/bbref work from the
session handoff shipped with them. Client keys `20260718-ui-v28` (styles,
app), `20260718-share2-v15` (daily-core); challenges.js untouched at v14.
Walk: 174 checks, three consecutive greens; audit bot clean on pool2.

- PRACTICE RESTORED (v24 reversal): the played tile carries
  `RUN IT BACK · PRACTICE` again (`#dailyPracticeBtn`, ghost-skinned with the
  existing `.dt-act-ghost` so CHALLENGE A FRIEND stays primary). It launches
  the same `startDailyRun(board, null, "daily-practice:N")` as the results
  againBtn — no gate, official untouchable. The first-letter bug stayed dead
  (walk pins it). The old null-guarded `startDaily` practice branch in the
  tile wiring is now unreachable and left in place deliberately.
- SHARE FORMAT LAW v2 (owner-locked shape) is live for EVERY mode:
  `TRUE 82 {#N|Classic Mode|Presti Mode|Pro Mode}` / `{emoji }REC | comp` /
  `Top X% of drafters` (omitted when null) / blank / five as `'YY Surname`
  (slot badges retired; legacy stored officials get their slot token
  stripped at format time) / blank / beat link (daily), recap link or bare
  domain (standalone). Cap Spc and Net left the text; net still rides the
  beat link. Emoji bands + comp + pct are built in app.js
  (SHARE_EMOJI_BANDS / SHARE_EMOJI_BY_MODE / ch.shareEmoji hook,
  shareCompFor, shareHeadCtx, shareLine2); daily-core's shareTextDaily is
  now a pure formatter fed those parts. Nickname line: dropped (see
  ratifications).
- PERCENTILE: new `functions/api/percentile.js`.
  `?wins&variant=daily:N` counts that board's `daily:N`+`daily-link:N`
  game_completes (practice excluded by construction);
  `?wins&mode=cap|classic|pro` counts all-time standalone same-mode. Reply
  `{pct,n}`, pct clamped 1..99, `null` under MIN_N=10; always 200, always
  fail-soft. Client: `scheduleSharePct()` fires once per finish, 1.6s after
  the game_complete beacon (the footer's wait), stashes `G.sharePct`, and on
  an official daily run nonce-amends the official record with `pct` so the
  menu tile's CHALLENGE A FRIEND carries line 3 on later visits
  (`recordOfficial` now stores `pct`; storage comment updated). Known edge:
  an 81-win Heat Check that boosts after the fetch shares an 81-population
  pct.
- FUNNEL SPLIT: every share button now emits `share_click` at the tap;
  the completed `share` fires inside `shareOrCopy` (new third arg = track
  payload) exactly once when the OS sheet resolves or, sheetless/broken, the
  clipboard write succeeds. A DISMISSED sheet is intent only; the reveal-box
  fallback never counts. event.js allowlists `share_click`; /avocado's
  daily-share query now groups by name and the funnel card gains a
  "Tapped share (intent)" row + no-back-history caveat (path bars stay
  completed-only). Kaman's share stays untracked, as before.
- SPORTSREF LAW: on the RESULTS five only (never mid-draft), each player
  name is the link — `basketball-reference.com/search/?search={name}`
  (search-URL form only; constructed profile URLs break on name
  collisions), `target="_blank" rel="noopener"` and NEVER noreferrer: with
  `_headers`' strict-origin-when-cross-origin, every click hands Sports
  Reference a clean `https://true82.net/` referral. One mono credit whisper
  under the five links their homepage with `utm_source=true82.net`. CSS
  appended at the styles tail (`.pr-bref`, `.bref-credit`): dotted amber
  underline + quiet ↗, zero clutter. ADDENDUM (same session, owner-directed
  "throw more in, no bloat"): existing PROSE mentions became links — no new
  copy was written. what-is-bpm + faq link the official BPM explainer
  (`/about/bpm2.html`); faq's data answer links their homepage + Stathead
  (both `utm_source=true82.net`); can-you-go-82-0's three near-miss seasons
  deep-link `/teams/{CODE}/{endYear}.html` (franchise-season URLs are
  deterministic, unlike player slugs — the search-URL law is for PLAYERS);
  the md/ mirrors match their html twins; llms.txt gains a Data section so
  agents cite the source; and the Tribune edition roster ([id].js:195-200)
  links every name search-URL style with a matching quiet style in
  shareCss. Law comment in app.js updated to the expanded surface set.

OPEN OWNER RATIFICATIONS (v2 ships with these defaults; each is a
one-line flip):
1. TIE LAW, sharpened: HISTORY_COMPS is contiguous 62..81 today, so every
   in-range total lands ON a tier — the sketch's "Better than the Heatles"
   at 66 and this build's "Tied the Heatles" are the two live readings, and
   the strictly-above branch is latent until a gap reopens. Current code:
   exact match reads "Tied". To adopt the sketch, delete the tie branch in
   shareCompFor (app.js) and re-pin the walk.
2. Emoji bands: defaults 82 goat / 78+ trophy / 70-77 fire / 45-69 clean /
   <45 ice. SHARE_EMOJI_BY_MODE is empty (owner to fill); per-daily
   ch.shareEmoji hook is live and wins outright.
3. Non-daily percentile population = all-time same-mode. Alternative
   (rolling 30d) is a one-clause ts filter in percentile.js.
4. Nickname line dropped from the standalone share (not in the locked
   sketch). Restore = one line in shareText.
5. Slot badges dropped from the shared five per the sketch; results SCREEN
   keeps them.
6. Suggestion, not built: extend comps DOWNWARD ('12 Bobcats, Process
   Sixers...) so sub-62 runs get an anti-flex line instead of a bare
   record. Keep it a separate array from the climb ladder or the 20-pin
   walk assert breaks.

Devtools: validate.js expects the repo at /home/claude/true82 AND
legacy-fixture.json at /home/claude/ (copy it up from the devtools folder).
New helpers export through window.__t82test (app.js evals strict; bare
window.fn pins will miss).

### V29 — the bank becomes a scoreboard (2026-07-19, owner-directed, mockup-sourced)
SUPERSEDES the V20 "final bank doctrine" BY OWNER ORDER (two mockups + a
spec, with explicit creative license). Same slot, same panel, same
load-bearing ids (#mpBank, #bankAmt, .mp-bank, bank-down/bank-up) — new
object. Client keys 20260718-ui-v29 (styles, app). Walk: 185, three greens.

- MATERIAL: flat charcoal (--tunnel) with a 1px amber outline in the
  price-badge family. The bronze radial, gloss ::before, glow shadows, and
  bankPulseDown/Up keyframes are DELETED, not orphaned.
- ANATOMY: BANK label / balance (#bankAmt, mHtml tight, still the loudest
  thing) / segmented budget meter. Desktop: column, centered. Mobile
  (<=640): one row — outlined BANK chip, balance, meter flexing to fill;
  the meter shortens before the balance shrinks; nothing wraps; the box is
  SHORTER than the plaque it replaces. The v21 tail patch's bank chunk was
  retired in place (one mobile truth in the main 640 block now).
- METER: one proportional fill (#bankFill, width = budget / G.meterMax)
  under a repeating-gradient notch overlay painted in the box background —
  ten notches desktop, five on mobile — so uneven balances render
  truthfully and the two layouts state the same number. G.meterMax pins the
  denominator to the run's starting cap at first render (challenge caps and
  reroll math can't skew it).
- TICKER (tickBank rewrite): stepped odometer — at most 4 integer steps
  over ~380ms, never the old per-million crawl — deduction chip
  (#bankDed: "−$15M" red / "+$2M" green, self-clears at 900ms), meter
  depletes in the same beat, bank-down/up flash amount + fill (no box
  scale). Reduced motion: instant paint, 240ms flash only, fill transition
  disabled. TIMING LAW: settle + flash-clear must stay inside ~560ms or the
  walk's 600ms settle assert races.
- STATES: .bank-low KEEPS the V20 slots-aware law (budget <= open slots +
  1) as the red trigger — deliberately chosen over the spec's fixed <=$5M
  because $4M with one slot open is fine and $6M with five open is dire.
  .bank-mid (new) is the soft orange band at <=$15M above low; .bank-zero
  dims the depleted stamp; the meter's border keeps contrast at $0.
- SPEC DEVIATIONS, on the owner's "take the wheel": slots-aware red (above);
  refund symmetry kept (green +$XM chip — the spec only covered spends);
  the deduction chip id is #bankDed, NOT #bankDelta — v19's grave stays
  undisturbed and greppable. "AVAILABLE TO SPEND" never existed in prod;
  the walk now pins it absent forever. No unaffordable-player error state
  was added (grayed rows remain the whole signal), per spec.

### V29.1 — bank ticker audit fix (same deploy; owner bug report: rubber-band count)
Root cause was threefold and architectural, not cosmetic: tickBank runs on
EVERY draft re-render (master render tail, one call site), the ticker
treated G.bankShown as "target accepted" instead of "currently displayed",
and each call span up its own interval closed over its own node. A
re-render mid-count snapped the markup to the final value and killed the
count; skip-spam left rival intervals fighting; the rewind paint jumped the
number back up. Fix (tickBank rewritten as a single-writer chaser):
G.bankShown is now the ON-SCREEN truth updated on every paint and the panel
builder renders it (re-renders get continuity, never a snap); ONE global
writer (G.bankAnim) cleared on every call; the interval re-resolves
el("bankAmt") per tick so re-renders can't orphan it (it dies only on a new
game or a bankless screen); a spend mid-count RETARGETS from the shown
value — monotonic per leg — and the chip reports the true transaction (new
target minus previous target). Walk +2: rapid double-spend must converge on
dbg().budget with no stuck flash (187, three greens). If the count ever
misbehaves again, suspect a second writer before touching the easing.

### V30 — verified Basketball-Reference deep links (owner-directed: "exit payout")
The v28 search-only player law is SUPERSEDED by a verified-map law. Client
keys 20260718-ui-v30 (styles, app). Walk: 195, three greens.

- bbref-map.json (repo root, ~147KB, fetched lazily with ?v=1): built THIS
  session from the pool's own upstream (sumitrodatta/bball-reference-datasets
  — the same source site_data.json's meta names). p = 3,485 of 3,509 pool
  names verified to slugs, with (season, team) joins from Player Season
  Info.csv breaking name ties; a = 21 names the pool genuinely cannot
  disambiguate (several pool entries MERGE two real careers — Mike James,
  Mike Dunleavy, Dee Brown... — so search is CORRECT for them, not a
  compromise); b = every slug base in bbref history, so post-dataset rookies
  get a constructed {base}01 only on a virgin base. REGENERATING: rerun the
  build against the upstream CSVs (career + season info, branch master) and
  bump the ?v= in loadBbrefMap.
- CLIENT (app.js): SPORTSREF DEEP-LINK LAW block above renderResults —
  loadBbrefMap / bbrefHref / bbrefBaseGuess / upgradeBbrefLinks. Anchors
  RENDER with the search URL (always right) and upgrade IN PLACE when the
  map lands (kicked in finishGame; no race, no boot cost, no re-render).
  Verified players also earn a season -> game-log link
  (/players/x/slug/gamelog/YEAR) wrapped around the pick card's season
  text; unverified seasons stay plain — a wrong game log is worse than
  none. The credit whisper became an action line naming both doors.
- EDITIONS (functions/[id].js): same map via env.ASSETS.fetch, cached per
  isolate, verified pages with search fallback. Same-commit law with the
  client resolver.
- Walk: stub serves bbref-map.json; end-to-end pin (five upgrade to
  /players/ on the fixture board, game-log links present), resolver unit
  truths (Don Buse direct, Mike James search, virgin base constructs,
  unknowns never throw), map-file spot pins, edition source pin.

### V30.1 — deploy fix + a new gate (2026-07-20)
The v30 edition resolver shipped an `await loadBbrefMap(context)` inside
renderEdition, which is SYNC (and context wasn't even in scope) — wrangler's
esbuild refused the deploy; `node --check` had greenlit it. Fix: the map
loads at the async boundary (onRequest) and is PASSED into
renderEdition(row, origin, bbmap). NEW LAW for the lane: node --check is
not deploy parity for Functions — the walk now esbuild-parses every file
under functions/ (loader js, format esm, same rules wrangler applies) and
fails on the first error. devtools gained an esbuild dependency (npm i
esbuild next to jsdom). Walk: 196, three greens.

### V30.2 — session review pass (2026-07-20)
Full review of the v28-v30 additions after the deploy miss. One hardening
shipped: renderResults now re-runs upgradeBbrefLinks at entry (idempotent,
no-op pre-map) so a future keepScroll re-render can't silently revert
verified hrefs to search URLs — today's single call site + the Heat Check's
in-place patching meant no live bug, but the invariant is now self-healing
rather than call-site-dependent. Walk: 197, three greens.

VERIFIED CLEAN in review: avocado's dailyShareRows shape change reaches all
three consumers (every one filters by r.name); esc() covers the data-bb
attribute round-trip (double-quoted attrs; apoststrophe names survive
getAttribute intact); scheduleSharePct's captured g makes a late fetch
harmless across a new game (dead-g write, nonce-guarded amend); the ticker's
stray timers self-guard on isConnected; upgradeBbrefLinks is idempotent;
bbref-map.json revalidates via etag (no _headers cache rule) with ?v= as
belt-and-braces; the [id].js loader caches a failed load as null per isolate
(accepted: fail-soft beats retry storms).

OPS ITEM FOR THE OWNER (cannot be run from the dev lane — Cloudflare
dashboard -> D1 -> events database -> console): /api/percentile now scans
events on every finished run, and avocado/stats scan it on every dashboard
view. Fine at today's volume, linearly worse forever. Run once:
  CREATE INDEX IF NOT EXISTS idx_ev_name_variant ON events(name, variant);
  CREATE INDEX IF NOT EXISTS idx_ev_name_mode ON events(name, mode);

KNOWN GAPS, accepted and recorded: Functions logic (percentile math, the
edition resolver) is parse-gated by esbuild but has no unit lane — a mock-D1
harness would close it if the surface grows; the walk's meter pin divides by
50 (fixture-coupled — re-pin if a fixture daily ever ships a nonstandard
cap); scheduleSharePct snapshots wins pre-Heat-Check (81-win edge, already
documented in V28).

### V31 — version fingerprint in the footer (owner-directed, perpetual law)
Renamed the pending deploy v31 for clarity after the double-failed v30
build. Client keys 20260718-ui-v31 (styles, app). Walk: 199, three greens.

FOOTER VERSION LAW, PERPETUAL: app.js carries `BUILD_V = "v31"` next to
setFootStats. It renders as the LAST segment of the footer stat line
("... | Presti WR 5.1% | v31") and ALONE when /api/stats fails, returns
zeros, or hasn't answered yet — a degraded deploy must still answer "which
build is this?" from the footer. BUMP BUILD_V IN THE SAME COMMIT as any
client cache-key bump in index.html. The walk enforces this forever: a
parity pin extracts the ui-v number from index.html and the BUILD_V number
from app.js and fails on drift, and a DOM pin requires the fingerprint to
render with stats stubbed dead. Deploy verification is now: load the page,
read the footer.

### V32 — the Tribune never auto-opens (owner-directed)
Client keys 20260718-ui-v32; BUILD_V "v32". Walk: 202, three greens.

REMOVED the single auto-open path: the results overlay's bundle had an
autoT = setTimeout(unwrap(true), 1500) armed only when
wins >= CFG.GAMES_IN_SEASON, so a perfect 82-0 opened its own edition after
a beat. Opening the paper is what pre-publishes the public /r/{slug} URL, so
that was also the only auto-PUBLISH path. Gone. The edition now opens ONLY
on a deliberate tap — the bundle's click -> unwrap(false), or the READ STORY
action. Every other publishRecap() call is downstream of a manual open or a
SHARE ARTICLE tap (both correct: sharing the article needs a live URL).

For the record, 81 wins never auto-opened anything — the "maybe 81?" was the
documented percentile edge (an 81-win Heat Check boosting after the pct
fetch), unrelated to the recap. No other win count triggers open or publish.

Walk guards the exact removed pattern (win-count-gated auto-unwrap timer)
plus the surviving manual click handler, so auto-open can't creep back.

### V33 — net-ranked percentile, thin-board fallback, comp article law, copy trims (owner-directed)
Client keys 20260718-ui-v33 + daily-core 20260718-share2-v16; BUILD_V "v33".
Walk: 207, three greens.

- PERCENTILE LAW REWRITTEN (functions/api/percentile.js): ranks by NET, not
  wins — wins bunch at the ceiling (Classic especially) and stopped
  discriminating. D1's net column is the RAW engine result (finishGame
  writes e.net before any Hot Hand boost), so the population is hot-free BY
  CONSTRUCTION and history ranks from day one — no cold start. The client
  (scheduleSharePct) sends e.net rounded to 2dp and NEVER the Hot Hand
  numbers; the old 81-win pct edge note is moot and removed.
- THIN-BOARD FALLBACK (owner delegated the design): a daily board under
  MIN_N=10 ranks the finisher against ALL daily runs of the same base mode
  (variant LIKE 'daily%', practice excluded) instead of hiding the line;
  once the board's own field reaches 10, the board takes over. Chosen over
  blending because it is honest at both ends (a real population either
  way), invisible in copy, and one extra query only on young boards. The
  reply's pool field ("board"|"dailies"|"mode") says which population
  answered — useful in devtools. Client sends &mode={base} on daily
  requests to enable it.
- COMP ARTICLE LAW: compArticle(label) prepends "the" unless the label
  starts with a digit ("Tied 5 Jokics") or carries its own article — which
  also fixes a live bug the owner's request surfaced: 64 wins was shipping
  "Better than the The Last Shot Jazz". Used by shareCompFor AND the
  results climb line so the surfaces can't drift.
- COPY: share line 3 is bare "Top X%" (both builders + FORMAT LAW comments
  updated). The results feedback button reads exactly "Feature requests?
  Bugs?" (mailto unchanged; the old "Email me." tail is gone; walk pins the
  exact label).

### V34 — the maximal-doors pass (owner-directed) + attribution audit
Client keys 20260718-ui-v34; BUILD_V "v34". Walk: 216, three greens.

- REALITY CHECK first: the "ledger" pitched last session is TAX LINES
  (Usage tax, Spacing bonus) — no player or team names live there. The
  owner's ruling lands on the PICK CARDS, where player-seasons actually
  argue value: the name keeps its career link (his "overall stats page"
  preference, already true), and the TEAM name now links
  /teams/{CODE}/{endYear}.html (deterministic, renders live, TOT-style
  multi-team codes stay plain). The v30 season -> game-log door is RETIRED
  ("too hard to read every game log"); .pr-szn-link CSS deleted, upgrader's
  game-log branch now serves ONLY explicit data-bb-gl anchors.
- ARTICLE CITATIONS: bbrefLinkifyArticle (app.js) + bbLinkifyArticle
  ([id].js twin, same-commit law) turn the FIRST mention of each roster
  surname into a career link — overlay AND shared editions. Claims are
  taken on untouched escaped text and spliced from the end so an inserted
  href can never be re-matched.
- COMP DOORS: every HISTORY_COMPS rung carries bbT (team-season) or bbP
  (player) — composites are owner-delegated picks, noted inline (OG Death
  Lineup -> GSW/2016; Shaqobe -> LAL/2000; 3-peat Bulls -> CHI/1992; Prime
  Wilt -> PHI/1967; Fo' Fo' Fo' -> PHI/1983; Last Shot Jazz -> UTA/1997;
  clones -> jokicni01 / jamesle01). The results comp label and ALL twenty
  climb-tag segments are anchors (merged tags get one anchor per segment).
  The SHARE comp stays plain text by law.
- HOT HAND: third action under the two spins — "HIS REAL HEATERS ↗",
  ghost-skinned anchor to the hot player's season game log once the map
  verifies (data-bb-gl path), search until then. hh-actions was already a
  column, so it stacks with zero layout change.
- GATE: the scout whisper lives INSIDE the existing info tip (zero new
  rows — owner's symmetry constraint). No franchise code exists on the
  board object, so it links the tagged homepage, campaign "gate".
- STATHEAD LAW: never linked (paygated); plain-text references read
  "Basketball Reference's Stathead" (owner phrase). faq + md + llms
  updated; the affiliation disclaimers keep their entity list untouched.
- UTM CAMPAIGN LAW: every bbref link carries utm_source=true82.net AND
  utm_campaign={surface} via bbrefTag / bbTag. Campaigns live:
  results_five, results_team, results_credit, climb, hothand, gate,
  article, edition_roster, edition_article, info, llms, site (fallback).
  The referrer header proves the origin; the campaign proves which door.
ATTRIBUTION AUDIT (the "make damn sure" checklist, all verified green):
_headers ships strict-origin-when-cross-origin site-wide and [id].js
pageHeaders matches, so every click sends the true82.net origin; no
noreferrer anywhere (pinned, comments excluded); every outbound URL is
utm-tagged (dynamic via bbrefTag, statics patched, walk pins each file);
the referral is therefore visible to Sports Reference three independent
ways — referrer, utm_source, utm_campaign — plus the outreach note in the
session log that tells them exactly what to look for.

### V35 — duo-defense retune + the rim-protection rule (owner-directed)
Client keys 20260720-ui-v35; BUILD_V "v35"; sim-core gains its FIRST cache
key (?v=20260720-rimtune-v35); challenges.js touched for the first time
since v14 (?v=20260720-duo-keys-v15); DATA_URL now site_data.json?v=sc-v35.
Walk: 230, three greens.

- DUO TIERS RETUNED: both-bad pairs now trip at bottom-20% (tax 3) and
  bottom-33% (tax 2), from 10/25. New DBPM cutoffs computed from the pool
  itself — the derivation method was VERIFIED first by reproducing all four
  v34-era constants exactly (unweighted season rows, g_pct/f_pct >= 20,
  linear-interp percentile, 1dp): guards -1.2 / -0.8, forwards -1.1 / -0.7.
- NEW RIM RULE: among the two F slots + the C slot, at least one player
  must be a top-20% frontcourt defender (DBPM >= 0.9, p80 over all
  F-or-C-eligible rows, n=14,107) or the team pays RIM_D_TAX (2.0). One
  protector clears the whole frontcourt. Ledger row: "Rim protection …
  bad rim defense; the paint stays open."
- HONEST NAMES: config keys renamed GD_/FD_BOTTOM20/33 and *_D_TAX_20/33;
  tier codes now 20/33; challenges.js's four override cfgs renamed with
  them (values unchanged — their intent was always "multiply/zero the
  taxes", which carries to the new tiers).
- SHIM: the eight v34-era keys REMAIN in meta.scoring so a stale cached
  sim-core keeps working through the transition. REMOVE IN V36.
- STALE PIN FIXED: "historical comp line" demanded "as good as THE" and
  predated v33's drop-the-article law; the retune moved the walk draft
  onto a digit-led rung and exposed it. Pin now matches the law.
OPEN ITEMS THE OWNER MUST KNOW (also in the session report):
(1) site_data.json is GENERATED — the ten new scoring keys must be
mirrored into the data pipeline's config or the next data refresh reverts
the retune. (2) Difficulty dropped measurably (the walk draft slid down
the comp ladder); BASELINE recalibration is a game-balance call the owner
owns. (3) Percentile boards now mix old-rules and new-rules nets;
same-day mixing on whichever daily is live at deploy time. (4) Rim bar
population = frontcourt-eligible rows (F or C, g_pct-style threshold);
if the owner meant top-20% of ALL defenders, it is a one-constant swap.

### V36 — glass, creator, and mileage taxes (owner-directed)
Client keys 20260720-ui-v36; sim-core ?v=20260720-taxes-v36; DATA_URL
sc-v36; BUILD_V "v36". Walk: 240, three greens, all three taxes pinned on
REAL pool rows, not synthetics.

- MACHINERY (initDataCore, one pass at boot): within-season percentile
  ranks for rpg and apg per row — the owner's "per possession" requirement
  translated to what the data supports: a 1975 rebounder is judged only
  against 1975 peers, so league pace cancels exactly. Plus career-year per
  row with SEGMENT logic (a 5+ season gap starts a new career), so
  returning players / shared names (the two Mike Jameses) never inherit
  decades of mileage. Tables ride T.t for inspection.
- GLASS TAX: sum of the five's rebound percentiles; < 3.3 pays 2,
  < 3.0 pays 3. Calibrated on REAL fives, not simulation — the first cut
  (from random plausible fives) would have fined the actual '22 champion
  Warriors (3.46) within .01 of the max; real anchors: '17 GSW 4.04,
  '96 Bulls 3.89, '01 Lakers 3.78, '22 GSW 3.46 (smallest champ, dodges
  by .16), five elite PGs 3.23 (pays 2 — correctly), true forfeit five
  (Nash/IT/Trae/Muggsy/Murphy) 2.33 (pays 3).
- CREATOR FLOOR (light-touch per owner): best assist percentile on the
  five < 0.80 pays 2. Real fives sit .93-.98; Wallace-ball sits .52 —
  pure psychopath filter, exactly as ordered. STAT-ONLY by owner ruling:
  no flag/labeling dependencies (the rim/pm flag idea is DEAD — owner is
  done with manual labeling projects after the shooter pass; do not
  propose flag-based rules again).
- MILEAGE TAX: more than 1 player at career year >= 12 pays 1. Owner
  calibration target hit exactly: the '22 Warriors carry ONE such player
  (Curry, y13; Klay y11) and dodge by one man — pinned. Swap in LeBron
  '22 (y19) and it fires — pinned. Age proxy = career year (no age
  column); pool starts 1974 so pre-'74 debuts read slightly young —
  lenient direction, disclosed.
- All nine constants in meta.scoring (GLASS_LOW/DIRE, GLASS_TAX_LOW/DIRE,
  CREATOR_PCT, CREATOR_TAX, AGE_VET_YEAR, AGE_VET_FREE, AGE_TAX);
  challenge-overridable via C() automatically. PIPELINE MIRROR REQUIRED
  (same as v35's ten). v34-era shim keys still present — remove only
  after the keyed sim-core is confirmed live.
- Difficulty dropped again (three new taxes); BASELINE recalibration
  remains the owner's open balance call, now more pressing.

### V36.1 — balance calibration verdict (no site change; BUILD_V stays v36)
Owner supplied last-week live win histograms per mode (pre-v35 engine) and
directed calibration against HUMAN curves, not raw Monte Carlo. Built
devtools/balance-bench.js (see README-DEV): policy bot through the real
headless core, tau fitted to the human curves under old-rules emulation,
then DIFFERENCE-IN-BOTS (bot-new vs bot-old, same tau, current baseline)
so bot-vs-human skill bias cancels. 81+82 fitted as one bucket — Heat
Check only ever converts 81->82, so the fit is immune to spin odds and
player choice.
VERDICT (n=4000/batch, SE~0.8pt): the four v35/v36 taxes cost realistic
drafts LESS THAN HALF A POINT of 81+ rate (classic .487->.483, Presti
.070->.066) — statistically zero. BASELINE HOLDS AT 3.98. The earlier
"difficulty dropped measurably" warning came from ONE walk fixture draft
sliding the comp ladder — anecdote; the population measurement supersedes
it. This is the taxes working as designed: they fence the degenerate
builds without taxing honest fives.
Residuals, disclosed: bot slightly trails humans in Presti (skips and
year rerolls unused; survivorship — only finished games log); classic
bot hi .487 vs human .574 pre-fit gap absorbed by tau. Both cancel in
difference-in-bots. The bench is the STANDING TOOL for every future
balance patch: refresh the HUMAN table from live screenshots first.

### V37 — "I don't want your charity" + DEPLOYMENT CANDIDATE
Client keys 20260720-ui-v37 (app AND styles — styles' first bump since
v34); sim-core ?v=20260720-heatcheck-v37; DATA_URL stays sc-v36 (no data
change); BUILD_V "v37". Walk: 244, three greens.

- THE CHARITY BUTTON (owner-directed): clutch-only ghost button centered
  under the ball lever — "I DON'T WANT YOUR CHARITY" — declines the Heat
  Check and dismisses straight to the un-boosted 81-0 results. Hidden the
  instant the pull commits (the spin owns the outcome after that);
  centered block = symmetry preserved; compact mono sizing for SE-height
  screens; the hoop-ball drag path is untouched (button sits below the
  lever, outside its hit area). Owner should still eyeball once on a real
  iPhone SE — jsdom cannot measure layout.
- THE CONTRACT (the important part): declining is now a first-class core
  op. declineHeat(S) sets S.hhDeclined and logs "hx"; replay speaks "hx";
  finish() STILL consumes the two Heat Check draws (clients draw at
  overlay build, so rngDraws parity demands it) but applies nothing —
  res.hh = {declined:1,...}, record stands at 81. This also fixes a
  LATENT pre-existing hole: the silent "skip →" at 81 was already a
  decline that replay could not represent (verifyRun would have upgraded
  the wins and failed the claim); hhSkip now registers declineHeat too.
DEPLOYMENT CHECKLIST (the whole v28->v37 batch ships as ONE new commit —
never "Retry", which rebuilds the failed commit):
1. Drag the full-state zip contents to GitHub, commit, wait for Pages.
2. Load the site; footer must read v37 (renders even if /api/stats
   degrades — that is the law's whole point).
3. Mirror the NINETEEN scoring constants (v35's ten + v36's nine) into
   the data pipeline's config BEFORE its next refresh, or the whole
   retune reverts silently.
4. Run the two D1 CREATE INDEX statements (v30.2 note) in the Cloudflare
   D1 console.
5. Submit the Sports Reference outreach note (drafted in session log) —
   tell them to watch utm_source=true82.net, campaigns per surface.
6. NEXT VERSION (v38): after the keyed sim-core is confirmed live,
   delete the eight v34-era shim keys from meta.scoring.

### V39 — cookieless analytics v3 + Avocado decision dashboard
Client/build: analytics.js and app.js identify as v39; index.html carries the
v39 cache keys and build meta. Migration: migrations/0006_analytics_v3.sql.
Deploy the migration once, then the entire site atomically.

HISTORICAL V39 PRIVACY LAW (SUPERSEDED BY THE EXPLICIT V43 OWNER DECISION BELOW):
- Analytics may not create/read cookies, localStorage, sessionStorage,
  fingerprints, ad ids, account ids, raw IPs, IP hashes, or a durable browser
  id. Visit and run ids are random in-memory values only.
- The Daily's pre-existing functional local record may be read only for coarse
  counts: active_days, streak, days_since_last. Never send dates, lineups,
  nonces, query text, or a hidden stable identifier.
- Referrers are origin-only. Unknown local paths bucket as 404_or_other. Full
  outbound URLs, full User-Agent strings, and raw client IPs do not enter D1.
- Do not persist the visit-level analytics sid. V43 implements the later owner
  decision with a separate random retention id, regional gating, rotation, and
  Worker-side enforcement; those safeguards must not be removed.

EVENT CONTRACT:
- functions/api/event.js owns the allowlist and sanitization. Every new client
  event must be added there and to analytics-smoke.js expectations when it
  changes the schema.
- analytics.js owns visit/run ids, landing/build context, session/performance
  summaries, generic stable control ids, external-link capture, and scrubbed
  client errors. Generic controls never record button text from player rows.
- app.js owns game semantics: mode/Daily selections, gate, run state, draft,
  result, share, Tribune, Heat Check, data readiness, percentile, and replay.
- `run_state` is local-only and MUST NOT be added as a D1 event. It refreshes
  the in-memory active-run snapshot used by abandon and terminal events.
- Canonical share diagnosis is share_click -> share_result outcome. The legacy
  `share` row remains success-only for historical dashboard continuity. Share
  rows carry wins/net; on share events only, `value` means the displayed Top X%
  rank when it was available before the tap. Do not reuse that meaning on run
  terminal rows, where `value` remains the reroll count.
- Daily link runs preserve variant daily-link for referral attribution. If the
  device already has an official result for that board, practice=1 and
  official=0 even though the link path remains daily-link.

AVOCADO CONTRACT:
- The Live pulse ignores date/build filters by design. It is the silent-ingest
  alarm. Build comparison obeys date but ignores the selected build chip.
- The Daily funnel is gate-matched by visit and separates practice; it must
  never exceed 100%. The lower daily-vs-standalone card reconciles inherited
  base modes. Mode-discovery SQL normalizes both Daily game_start and
  game_complete rows to Daily instead of their inherited base mode.
- Daily return behavior is explicitly a local-history proxy, never D1/D7.
- Tribune in-page opens are page-load beacons and can count a reload. “Fetched,
  no beacon” includes unfurl crawlers and is not proof of an intentional send.
- Do not remove migration/build warnings or privacy labels to make cards look
  cleaner. They prevent the old dashboard's false certainty.
- Keep Avocado's `queryLimiter(5)`. The dashboard deliberately caps concurrent
  D1 statements; do not replace the bounded helpers with an unbounded
  `Promise.all` across all cards.
- Kaman result/share rows are collected for operational visibility but are separated from canonical Classic/Pro/Presti share rates and record/rank propensity tables. This v39 rule supersedes the historical v29 note that Kaman sharing was untracked.
- Search diagnostics may store query length/result count but never query text.
  Abandonment and time-to-value cards are run/visit aggregates joined only by
  the in-memory ids. All new v39 dimensions are forward-only.

VALIDATION:
- Companion folder true82-devtools-v39 contains analytics-smoke.js. It has no
  jsdom dependency and is the mandatory pre-deploy analytics check. It executes
  the real migration, ingestion Worker, and every Avocado query against Node's
  in-memory SQLite in addition to source/privacy assertions.
- browser-smoke.py uses Python Playwright plus Chromium to drive the actual UI
  through a privacy-safe search and abandonment, a completed Classic run, an
  outbound click, a confirmed clipboard share, and a Daily gate start. It
  captures the real event payloads and asserts that typed search text and
  analytics storage/cookies are absent. It stubs network responses, so it
  complements rather than replaces analytics-smoke.js.
- Run `node analytics-smoke.js`, `python browser-smoke.py`, and
  `node audit.js 100 pool2`.
- The legacy full UI walk still requires npm install because it uses jsdom and
  esbuild; absence of those packages is an environment limitation, not a green
  UI result.

### V40 — the game sees its own engine (tax telemetry + curves)
Recovered v39 absorbed as baseline (checksums verified). Build identity
v40 everywhere it is version-coupled: meta tag, ANALYTICS_BUILD, BUILD_V,
and ONE shared cache key on analytics.js + app.js across index, 404, and
all four info pages (the keys-move-together law).

- MIGRATION 0007 (additive, AFTER 0006): nine Scoring Card columns on
  events. Insert tier is v40-first, failing soft v40->v3->v2->legacy with
  marker analytics-v40-migration-required. Zeros are real zeros;
  pre-0007 rows are NULL and excluded from incidence math.
- game_complete now carries every engine tax + the spacing bonus (2dp).
- THREE NEW CARDS: "Scoring Card · tax incidence" (fire rate + magnitude
  per tax per mode; migration warning when 0007 unapplied), "Heat Check ·
  clutch and charity" (shown / pulled / refused / silent-skip / wheel
  segments / hit-82), "Pool coverage · the half that never gets picked"
  (constants 21525/3509 are build-time; re-pin on dataset refresh).
- CURVES API: /avocado?api=curves — practice-excluded win histograms,
  date/build scoped, JSON. balance-bench --live consumes it (n>=300 per
  mode or hardcoded fallback). The balance tether now reads the live
  game; screenshots retire.
VALIDATION — ALL THREE LANES GREEN, a first for this project:
analytics-smoke 88/88 (both migrations, fail-soft proof, taxed-row
round-trip, all cards, curves); legacy jsdom walk 244/244 x3 (FIRST EVER
run against the v39 rebuild — jsdom/esbuild installed; two stale pins
healed: the ui-v key regex predating v39's key rename, and a v38 funnel
label predating the v39 dashboard); browser-smoke 26/26 in real Chromium,
78 live payloads captured with the v40 fields flowing. Devtools ROOT is
now ../true82 or $T82_ROOT everywhere.
DEPLOY ORDER: 0006 (if not yet), then 0007, then the whole site in one
commit; footer reads v40; Live pulse should show v40 rows; the tax card
warns until 0007 lands and fills from the first post-deploy finish.

### V41 — the rules sheet, owner-rewritten and reordered
Shared cache key 20260723-howto-v41 on styles.css + analytics.js + app.js;
meta t82-build, ANALYTICS_BUILD, and BUILD_V all read v41. No migration, no
schema change. Walk 249 x3, analytics-smoke 89, browser-smoke 26.

- SECTION ORDER (owner-specified, walk-pinned so it cannot silently drift):
  GAME BASICS -> HOW TO PLAY THIS MODE (X) -> [today's rule / twist box] ->
  NEED A REFRESHER -> WHAT WINS GAMES -> footer.
- RETIRED: RULES_STEPS ("THE GAME IN 20 SECONDS") and the standalone
  CHANGE THE YEARS box, plus their CSS (.rs-steps, .rs-years). GAME BASICS
  absorbs the first; each mode block now owns its own season/reroll
  instructions. RULES_LAW folded into RULES_MODE.daily.
- THE DAILY now has its own mode block and still renders the base mode's
  rules underneath it ("PLUS CLASSIC MODE RULES").
- WHAT WINS GAMES gained THE DIRTY WORK, which finally documents the v35
  and v36 fences (glass, creator, mileage); rim protection folded into
  DEFENSE. Before v41 those four taxes could fire with no rule anywhere in
  the product explaining them. Walk-pinned.
- NEED A REFRESHER links the BBRef year-by-year BPM top-10 leaderboard
  (verified live 2026-07-23; that page also documents why the pool starts
  in 1974, since BPM only exists from 1973-74 on) plus the BBRef home.
  Campaign "howto" so this surface reports separately from "info".
  Stathead stays PLAIN TEXT per the standing v34 law; walk pins both the
  phrase and the absence of any stathead URL in the sheet.
- FOOTER keeps /how-it-works/, adds STATS REFRESHER, and GOT IT becomes an
  amber-filled primary; the close control goes gold. Footer wraps below
  340px so an SE never clips the primary button.
- COPY NUMBERS VERIFIED against live config before shipping: net 0 = 41-41,
  82-0 needs +27 (exactly 27.01 at BASELINE 3.98 / NET_SD 12), zero
  shooters = 6 (SPACING_TAX 2.0 x 3), usage budget = 110. All correct.
- REGRESSION THE OWNER SHOULD RATIFY: the new Presti copy drops the old
  line teaching the explicit gem odds ("about 1 in 7 is a $1M steal, about
  half are rip-offs priced like stars"). The walk pin was rewritten to the
  new wording rather than deleted. Restore in one line if wanted.
- TEST HYGIENE: analytics-smoke's build/cache-key assertions no longer
  contain version literals. They now assert meta == ANALYTICS_BUILD ==
  BUILD_V and that styles/analytics/app share one key ending in that build.
  Future bumps need no test edits. Do not reintroduce literals.

### V42 — ANY GIVEN NIGHT: classic plays the season out (owner-directed)
Shared key 20260724-season-v42 (styles+analytics+app AND sim-core);
DATA_URL sc-v42; meta/ANALYTICS_BUILD/BUILD_V v42. Walk 274 x3 (now
includes a FULL standalone-classic playthrough through the real UI),
analytics-smoke 89, browser-smoke 26 in real Chromium through the reel.

ARCHITECTURE (the replay law survives by construction):
- Arming is an ACTION: op "ss" -> S.simSeason. The app arms ONLY
  standalone classic (MODE classic, no G.social, no G.ch). Daily boards,
  weekly twists, pro, and Presti stay analytic this build. Replays of
  pre-v42 runs carry no "ss" and stay analytic forever.
- simSeason(S, e) in sim-core rolls 82 games from the run's OWN rng
  stream as the game's final draws: same seed, same five, same record,
  live and in replay. finish() realizes when armed; res gains
  wins/losses (realized), expWins (the analytic tally), season{games,
  pGame, pRaw}.
- Per-game p = clamp(phi(net/NET_SD), 1-PG_CAP, PG_CAP). PG_CAP = 0.97
  in meta.scoring (PIPELINE MIRROR now TWENTY keys). Expected classic
  82-0 lands ~6% (from ~35%); the cap makes the estimate tail-proof.
  The mean is untouched wherever the cap does not bind (net < ~22.6).
- Opponent cities are COSMETIC: app-side, FNV-hashed from seed+game
  index, never the rng stream. Flavor edits can never break rngDraws.
- The reel: seven real month acts (OCT 5 / NOV 15 / DEC 15 / JAN 15 /
  FEB 11 / MAR 15 / APR 6 = 82), auto-advance ~1.25s, desk commentary
  per act ("The zero died in Denver, game 47."), running record, one
  SKIP, tap-anywhere skips too. bbref map preloads behind it. Tribune
  pregen deliberately NOT enabled (demand-priced law stands; enabling
  it is an owner cost decision, ~every classic finish would bill).
- The rule is NAMED, not hidden: WHAT WINS GAMES gains ANY GIVEN NIGHT
  on the standalone-classic sheet only (walk pins presence there and
  absence on Presti's sheet).

WHAT FLOWS REALIZED WINS: results record, comp ladder + climb, share
record + emoji bands, recap/Tribune wins, editions, game_complete.wins,
curves API (the bench also arms classic now, so the tether stays honest).
WHAT STAYS ANALYTIC AND UNTOUCHED: net, score, every tax, percentile /
Top X% (ranked by net since v33 — that decision carries this feature),
leaderboards, Heat Check (cap-only, still keyed on the analytic tally,
walk-pinned untouched).

PRESTI PREP (next build, owner-specified):
- Heat Check fires on a LITERAL realized 81-1 only. Draw ORDER LAW: the
  82 season rolls come FIRST, then the two Heat Check draws — client
  overlay and finish() must consume in that exact order or rngDraws
  parity breaks. The clutch gate flips from e.winTally === 81 to
  realized wins === 81; FORCE_CLUTCH (?clutch=1) should force through
  the realized path.
- Heat Check flavor upgrade available: the spin can be framed as
  replaying the one loss (the city is known from the cosmetic schedule).
- Expect tuning: Presti's 2% perfection collapses under sim+cap; owner
  may want a separate PG_CAP for cap mode (config key, one line) or a
  gentler cap. Realized 81s become far more common, so Heat Check
  frequency rises sharply — the economy of the spin needs an owner look.
- Daily adaptation later: seed the schedule from the BOARD, not the run,
  so everyone faces the same 82 and identical fives tie exactly.
- res.expWins is carried but surfaced nowhere; "expected 81, ran 79" is
  a ready-made results line when wanted.

### V42 amended (same build, pre-deploy): the calendar + the 10% retune
Shared key 20260724-reel2-v42; DATA_URL sc-v42b; BUILD_V stays v42
(nothing shipped yet, so this folds in). Walk 276 x3, smoke 89,
browser-smoke 26.
- PG_CAP retuned 0.97 -> 0.978 (owner: Classic is the easy mode).
  Expected Classic 82-0 ~10.5% on the live curve, tail-proof; juggernaut
  ceiling 16%. The named rule's copy now reads "about 98 times in 100."
  PIPELINE MIRROR: the twentieth key's VALUE changed with it.
- THE CALENDAR: each month act renders date-numbered squares that cascade
  in (48ms apart), wins amber, losses ember with a pop; the header record
  ticks square by square; the commentary line lands after the month
  fills. The league schedule (dates) is deterministic and SHARED across
  all runs — only outcomes differ — so it never touches the rng stream.
  Loss commentary now carries the real date: "The zero died in Denver,
  Jan 14." Walk pins the squares, their day numbers, and their win/loss
  classes live in the DOM.


### V43 — true same-browser retention analytics (2026-07-24)

Migration: `migrations/0008_retention_identity.sql`. Critical chain: `analytics.js`,
`functions/api/identity.js`, `functions/api/event.js`, `functions/avocado.js`,
`index.html`, and every dynamic/static page that loads analytics.js.

- Eligible browsers receive a random 180-day first-party localStorage id.
- Never use cookies, accounts, fingerprinting, raw/IP-derived ids, or third-party tags.
- Identity is disabled for EEA/UK/Swiss traffic, unknown geolocation, DNT, and GPC.
- The ingestion Worker must continue stripping visitor_id independently of the client.
- `local_day` is the browser calendar date and is required for exact D1/D3/D7 metrics.
- Retention cohorts begin at the first tracked `game_start`, not the first page view.
- D1 means another `game_start` on the next local calendar day. Right-censor new
  cohorts; never count a cohort as failed before it matures.
- Cohort returns intentionally span builds. The Avocado date filter selects the
  first-play cohort; the build filter must not erase returns after a deployment.
- `return_profile` is now entry-time only. Do not re-add the post-Daily-finish row,
  which changes yesterday into same-day history and corrupts that legacy proxy.
- See `ANALYTICS-V43-RETENTION.md` for deployment, rollback, and exact metrics.

---

## V44 SESSION HANDOFF (2026-07-25): the retention merge + PLAYER TRAITS

Read ANALYTICS-V44-RETENTION-AND-TRAITS.md for the full analytics and
traits contract, docs/history/PATCH-MANIFEST-V44.txt for the file inventory, and
TRAITS-OWNER-DECISIONS.md for what only the owner decides. This section is
orientation plus the build record.

### What v44 is

Two async branches merged, one new mode added:

- **Base: the v43 patch.** All gameplay, UI, info-page, and event-vocabulary
  work carries forward intact.
- **Preserved: the deployed v40r2 retention layer.** The 400-day HttpOnly
  cookie identity (`/api/identity`), the isolated retention stream
  (`/api/retention`, tables `retention_events_v1` + `retention_coverage_v1`,
  both ALREADY APPLIED in production), the standalone retention report, and
  Avocado v42.2. The v43 localStorage retention experiment is retired
  unshipped; its migration `0008_retention_identity.sql` is intentionally
  absent and must never be applied.
- **New: PLAYER TRAITS** at `/traits/`. Community voting on player-season
  trait questions; standing revisable votes deduped by a purpose-scoped
  hash of the retention id (session-hash fallback where the cookie is
  absent); consensus settled on write against configurable thresholds;
  homepage module and results-screen prompt as doorways; two Avocado cards.
  Engine effects are deliberately deferred (owner decision, see the
  decisions file).

The one structural upgrade to the analytics core: `analytics.js` now
exposes `t82AnalyticsSubscribe(fn)`, and `retention-client.js` uses it
instead of monkey-patching `t82track` (the wrapper survives only as a
fallback for a stale-cached analytics.js). Subscribers receive final
enriched props inside try/catch; a broken subscriber cannot damage the
ordinary stream.

### Deploy facts an agent must not re-derive wrong

- The ONLY migration v44 introduces is `migrations/0010_traits_v1.sql`
  (additive, idempotent, seeds 5 draft traits + 27 questions + rules).
  0008/0009 in this package are repository truth for already-applied
  production state.
- Cache keys: `analytics.js`, `retention-client.js`, `app.js` ride
  `20260725-traits-v44`; unchanged files keep their v43 keys on purpose.
- The three event names `traits_session`, `traits_question`, `traits_vote`
  are on the `/api/event` allowlist and ride existing v40 columns; no
  events-table migration exists or is needed. They still need adding to
  the OUT-OF-REPO analytics-smoke allowlist, and browser-smoke needs a
  /traits/ five-call path, before the next full lane run.

### Validation on record for this build

`node --check` clean on every shipped client and Worker file. Two
independent harnesses, built separately during the session, both green on
the final tree: a 4-suite set (102 checks: traits API end to end,
full-page jsdom five-call walk, Avocado render with and without the
traits schema, analytics-retention hook contract) and a 2-file set
(80 checks: migration idempotence, endpoint behavior incl. both abuse
fences, v40-first event ingestion for the traits names, Avocado cards
behind DASH_KEY, page walk, hook contract). Out-of-repo lanes and a real
iPhone Safari pass on the /traits/ no-scroll layout are still owed before
promoting to main.

### Build-integrity note for the record

This build was assembled with TWO agent processes writing the same
workspace concurrently. During the session, files changed that the
packaging agent did not change: a stale identity comment in `app.js` and
a stale 180-day line in `retention-dashboard.js` were corrected by the
other process (both corrections verified accurate and then re-expressed
by the packaging agent), the three v44 docs and an independent test
harness appeared, and one superseded doc was removed. Every executable
file in this package was byte-verified against the packaging agent's
transcript-recorded edits, and both harnesses were re-run on the exact
packaged tree. Nothing ships unreviewed. If future builds run parallel
agents on one workspace, split lanes explicitly (code vs docs vs tests)
so provenance never needs forensics again.


### v44.1 (2026-07-26): final trait roster + anti-labels

Owner decided the final eleven core traits; migration 0011 ships them,
retires three 0010 drafts (successors: iso-defender, playmaker,
team-defender), and re-homes their marquee questions (the 2008 Kobe
question now lives at kobe-bryant-2008-iso-defender). does_not_qualify now
renders as the ANTI-LABEL: the trait tag with a drawn cross-out, aria
NOT <TAG>. Data only plus one page: no BUILD_V, token, or Worker change;
the vote path already refused non-active questions and the pin path
already degraded, so 0011 needed zero code.

Both in-workspace harnesses were updated to the post-0011 truth (traits
14/11 core/3 retired, 96 questions, retired-question behavior, anti-label
stamp assertions) and are green: 50+36+13+16 and 40+42. Note to the
parallel agent: your test-traits.js expectations and three question ids
were updated for 0011; diff against your copy before extending it.

### v45 IN PROGRESS (2026-07-26): the v42 branch gap + labels on the roster

CRITICAL FINDING for anyone touching this tree: the v43 patch branch was cut
from MID-v42, before the final v42 amendments. Absent from this codebase and
from the live site: the reel's W/L letter squares at 25px (squares here still
print calendar dates), the SEE THE FULL RESULTS terminal button, the removal
of tap-anywhere-to-skip (the phone-hazard path is still live here), the
PG_CAP 0.99 retune (no PG_CAP constant exists in this app.js), the NET-keyed
comps/climb (no compNetFor), the Dream Team/Redeem Team ladder top, the
share percentile-on-comp-segment format, and the scapegoat loss commentary.
ALSO: styles.css has never been in any patch zip since v40, so the live
stylesheet predates the reel entirely (reel squares render unstyled), the
v42 charity-button treatment, and the v41 sheet restyle. Canonical final
code lives in the owner's true82-full-state-v42.zip; the finals will be
grafted from it exactly, never reconstructed from prose. Do not attempt a
reconstruction.

Already built and validated for v45 (unpackaged until the graft): Daily
rules sheet reorder (today's rule + Daily rules lead, GAME BASICS follows,
on the Daily sheet only); /api/traits?op=labels (settled core-trait labels
+ anti-labels for up to eight player-seasons, exact lower(name)+season
match, retired traits never label); wireTraitsLabels roster chips on the
results player cards (gold earned tag, crossed anti-label with aria,
maximum four per card, fail-soft absent). BUILD_V v45, app token
20260726-labels-v45, meta v45. Suites: 56+36+13+16 and 42+42, all green.


### v45 SHIPPED (2026-07-26): the v42 graft is done

The owner uploaded canonical v42-final app.js + styles.css. All 22 amendment
hunks were grafted with exact-text anchors and verified at marker parity
against the canonical file (compNetFor, shareCompFor(net,...), reel-done,
Dream/Redeem Team, post_daily_finish, comp-pct). styles.css ships WHOLE.
The per-game cap is DATA: sd.meta.scoring.PG_CAP in site_data.json (hence
DATA_URL sc-v42c); the deploy check is T82.t.SC.PG_CAP === 0.99. Manual
tags shipped as trait_editorial_v1 (0012) with community supremacy in
op=labels; roster chips render both sources identically. In-workspace
suites 62+36+13+16 and 43+42, all green. The devtools zip's
analytics-smoke and validate lanes need full-repo files the patch tree
does not carry (0006, sim-core.js, site_data.json): run them on the repo
checkout as `TRUE82_ROOT=<repo> node analytics-smoke.js` and
`TRUE82_ROOT=<repo> node validate.js`; the v42 walk asserts the W/L
squares and the cap binding directly.


### v46 SHIPPED (2026-07-26): PLAYER BONUSES + Presti uncap

The final Player Bonuses spec replaced the Player Traits front-end
direction; end-user copy in that spec is binding and was implemented
verbatim (PLAYER BONUSES, 1 / 5, UNSURE, WHAT COUNTS?, TRY AGAIN, the
four status chips, 5 VOTES IN, VOTE ON 5 MORE, BACK TO TRUE 82, the
share templates, no build numbers on the page). Internal names stay
traits_* everywhere. The voting page moved to /bonuses/ with per-question
routes at /bonuses/<slug> (Pages function swaps title/OG and injects a
preload; failures serve the untouched shell). /traits/ is a redirect
preserving q and src; pins by uncurated or retired ids degrade to a
normal curated session. Serving is curated-only through 0013's meta
table. Votes always store the canonical id even when cast by slug.

For the parallel agent: both harness suites were updated for v46.
test-traits.js runs migrations through 0013 and gained featured and
my_response checks. test-integration.js now builds its db with the full
0008-0013 chain and its jsdom walk drives /bonuses/ (selector [data-v],
chips instead of stamps, the new completion copy). If your local copy
predates this, take these versions.


### v46.1 addendum: design pass + haptics (same day)

The senior design pass landed on /bonuses/ (sequenced result reveal,
skeleton, atmosphere, amber discipline, focus management, sentence-case
question) with every animation behind prefers-reduced-motion and a
matchMedia-absence guard, which is why the jsdom walks pass unchanged in
timing. Haptics: buzz() in app.js now falls through to the iOS switch
toggle; the Bonuses page adds real switch overlays inside its five
primary buttons (tap forwarding via a stopPropagation click bridge, one
fire per tap, parent pointer-events lock covers the overlay when
controls lock). Walk assertions cover the skeleton, the overlays, and
result focus. OG: nine PNGs in /og/ generated from the 0013
share_preview values; regenerate with the same text if 0013 copy ever
changes.


### v46.2 addendum: live-test fixes (same day)

Comp selection reverted from NET to realized wins (owner ruling after
live play): the ladder literals were already ordinal one-win rungs, so
compAbove and shareCompFor now walk wins directly and compNetFor is
retired as dead code. Note for the validate.js lane: if it asserts the
v42 NET-keyed comp selection, that check will flag; the wins-keyed
behavior is the owner's current ruling and the ladder rungs themselves
are unchanged. The Top X% span inherits .res-comp typography (mono
0.86em rule removed), styles.css token is now v46. _routes.json is a
manual repo edit: add "/bonuses/*" to include; the patch deliberately
does not ship that file.


### v46.3 addendum: Presti realization (same day)

The realization guard now admits cap mode. The whole mechanism composes
without further changes: simSeason rolls under the Presti PG_CAP=1
override, e.winTally becomes the realized record before finishRunTail,
so clutchPending (winTally === 81) fires the Heat Check on a literal
realized 81 in any shape, hhWins(newNet) rewrites the record on a hot
spin, a cross of 82 fires the goat fireworks from inside hotHand, and
scheduleSharePct still sends raw e.net (pre-boost, pre-realization) so
the ranking law holds. A REALIZED 82-0 skips the Heat Check (nothing to
equalize) and gates fireworks on the paper as usual. hhEligible lives in
sim-core and already speaks cap mode. QA: ?clutch=1 still forces the
spin on any Presti result.


### v47 SHIPPED (2026-07-27): the homepage votes

Owner reviewed live v46 against a design mock: the module read flat and
buried, the third vote control looked orphaned, and nothing said votes
were changeable. v47 rebuilds the module as an inline voting card (TM
engine in app.js: featured-pinned session, YES/NO with buzz, compact
result beat, auto-advance ~1.5s, dots, completion, degrade-to-full-page
on any fetch trouble; analytics ride the same names with source
home_module, and feature_select now fires only from the two door
elements, never from votes). The mock's PLAYER TRAITS name and AFFECTS
THE SIM badge were corrected to PLAYER BONUSES and the bound consequence
line, since engine effects are not live yet. The page's three controls
share one group container, and CHANGE VOTE (action change_open) restores
live controls with the standing answer pressed. Walk mock now keys
status by question id, not call order.


### v47.1 addendum: blue-link fix, compaction, RATE YOUR FIVE (same day)

The tm-q anchor now inherits color (the v47 markup change to an inner
anchor had leaked UA blue); module compacted ~50px. The TM engine is
generalized (TM.source + TM.loader; tmStart/tmSessionLoader), the home
module and the results RATE YOUR FIVE card share the same markup and
ids (one mounts at a time in the SPA), and op=roster is the new worker
lane: sanitized name~season pairs, lazy INSERT with updated_at, two
hash-picked core traits per player, curated collisions serve the desk
sentence via the ordinary meta join. Junk-name generation is bounded by
the sanitizer and invisible outside the generating roster; note it in
any future abuse review. Suite coverage: roster serving, id-space
collision, lazy insert integrity, generated-vote settle, session leak
guard.

### v47.2 additive trait categories (2026-07-29)

Migration `migrations/0018_trait_categories_v1.sql` adds five core
voting/label categories without changing gameplay: Ball Stopper, Foul
Merchant, Stat Padder, Championship #1, and Ball Pounder. It contributes
124 curated active questions, 123 editorial `qualifies` seeds, and one
marquee unruled question: 2016 Draymond Green as a Ball Pounder
(`editorial_priority=150`, homepage eligible). Seed ranges are exactly the
owner request: Carmelo 2006-2015 and Kobe 2006-2012 for Ball Stopper; Shai
2023-2026 and Harden 2013-2020 for Foul Merchant; Westbrook 2017-2021 and
Drummond 2013-2020 for Stat Padder; every Finals MVP from 1974 through
2026 for Championship #1; Luka 2020-2026 and all 21 Chris Paul seasons
(2006-2026) for Ball Pounder.

This is a database-data expansion only: no worker, frontend, roster-generation,
`app.js`, simulation, scoring-constant, player-value, win, net-rating, tax, or
bonus code changes. Existing deterministic roster-generated question pairs
therefore do not reshuffle. The Stat Padder definition saying to decrease
engine value is the owner's poll proposition, not a live implementation
instruction. Labels remain shadow mode: editorial rulings appear immediately,
and settled community consensus supersedes them. Apply 0018 after 0017.
Current CHECK-STATE expectation:
20 traits / 17 core / 3 retired; 220 questions / 205 active; 144 editorial;
200 meta; 30 homepage.

### v47.3 additive editorial label expansion (2026-07-30)

Migration `migrations/0019_editorial_label_expansion_v1.sql` is a pure-data
expansion generated from the owner-approved 360-row JSONL editorial set. It
adds 344 previously absent player-season/trait questions, 344 provisional
editorial rulings, and 344 active public metadata rows. Sixteen requested
combinations were already present through earlier migrations and are not
overwritten, so the intended dataset resolves to exactly 360 combinations
across 120 player-seasons: 290 positive labels and 70 anti-labels.

No executable file changed. In particular, `app.js`, `functions/api/traits.js`,
roster question hashing, homepage rotation, simulation, values, net rating,
wins, taxes, and bonuses are untouched. The new metadata makes the questions
eligible for ordinary five-question sessions, but every new row has
`homepage_eligible=0`; the homepage pool remains 30. Editorial rulings appear
immediately on exact player-season cards, and later decisive community
consensus supersedes them under the existing rules. Apply 0019 after 0018.
Expected CHECK-STATE after 0019: 20 traits / 17 core / 3 retired; 564 questions
/ 549 active; 488 editorial; 544 meta; 30 homepage.


## V47.4 additive homepage question expansion
- New migration: `migrations/0020_homepage_superstar_controversy_v1.sql` marks 25 existing superstar questions homepage-eligible; no new schema or voting logic.
- One isolated executable change exists in `functions/api/traits.js`, only inside `op === "featured"`: query limit 40→80 and alternate fresh questions with the eight mature questions closest to 50/50.
- Purpose: under the previous mature-only branch, newly eligible zero-vote questions could not appear once three questions had five votes.
- No simulation, scoring, label, vote-write, consensus, or identity code changed.


## v47.6 — two-answer question ceiling (2026-07-31)

Narrow feed-selection change only. No migration. `trait_votes_v1.changed` already increments on every repeat submission, so it is reused as answer depth (`answer_count = changed + 1`). Algorithmic feeds now exhaust never-answered questions, then once-answered questions, before allowing any question answered twice or more. Direct question links remain explicit overrides. The homepage/results clients briefly wait for the existing retention identity handshake so selection uses the same anonymous browser identity recovered from the analytics localStorage fallback. Results-roster questions merge with curated feed questions when fewer than five roster questions remain under the ceiling. No simulation, scoring, label, consensus, or vote-tally semantics changed.

### 2026-07-31: 0023 second homepage controversy pack

Added `migrations/0023_homepage_superstar_controversy_v2.sql` plus its verifier. This is SQL-only and promotes 25 existing active questions to the homepage, with sharper public/share copy and priority >=97. No executable code changed; do not re-audit the trait API, vote guard, trait-card UI, or game engine for this addition.
