# CURRENT JULY 18 HANDOFF

For the current deployable state, read `AGENT-HANDOFF.md` first. It documents
post-V9 work not fully represented in this historical log: the prominent
Presti BANK panel, compact salary-cap player rows, normalized HOW TO PLAY
button, mode-first rules order, PLAY IT fallback on the Daily gate, and the
slot-specific `small_ball_five` F/C center fix.

## V14 (2026-07-18) — Small-Ball center-slot legality

- `small_ball_five` no longer grants a global height exemption to every
  center-eligible player.
- G/F destinations require height <= 76 inches.
- The C destination may ignore height only for a player whose career buckets
  include both F and C.
- Pool filtering retains short players plus genuine F/C center candidates;
  the `pick` hook enforces the destination-specific rule.
- Daily copy and challenge blurb were updated to describe the real mechanic.
- `challenges.js` and `daily-core.js` cache keys bumped to the V14 build.

---

# THE DAILY — playtest handoff (2026-07-12)

One shared board per calendar day. Same seed, same modifier, for everyone. First
finished run is official; every later run is practice. The share artifact is a
compact copy-paste block: 5-square grade, record, net, your five by name, and a
"Beat my five" link that drops the receiver onto the same board with your
numbers pinned. This is research Interventions 1 + 3 + 4 fused into one mode,
sitting in the third slot on the start screen (Pro's old spot).

Everything below shipped through the sanctioned launch path in DEPLOY-LANES.md:
challenges.js promoted to shared, one new shared module in the critical chain,
index.html as the only per-lane file. Zero server changes. Zero cron. Zero
accounts. Fail-soft everywhere.

QA: `node test.js` = **244 passed, 0 failed**.

V3 (2026-07-13) — bug fix + design pass:
- FIXED the stuck-at-pick-2 silent death: capRowHtml never consulted challenge
  filters or pick-hooks, so on cap boards (The Descent et al) illegal cards
  rendered live and the confirm tap was swallowed. Cards now run the full
  legality chain (pickBlock, app.js ~L406) with honest tags (picked / full /
  over / barred / blocked) and rule-name tooltips; a rowDraftable catch-all
  guarantees the UI can never disagree with the engine. This was a latent bug
  in ALL cap challenges, weeklies included.
- No rejected tap is silent anywhere: off-card taps shake with the reason,
  confirm rejections shake the tray with a one-line why, and slot-sensitive
  hooks disable individual position buttons.
- One-try clarity: the draft strap now carries an OFFICIAL RUN pill (amber) on
  a first run, PRACTICE on reruns, plus the rule text itself on line two. The
  strap also renders for weekly/challenge runs, closing that older gap.
- Start-screen tile redesigned as a dated ticket-stub card, deliberately
  quieter than Classic/Presti (first-timers keep the front door; the Daily
  reads as the regulars' ritual). Status line carries the one-official-run
  law and flips to your record once played.
- Results daily block boxed as a card; jsdom walk now 36 checks including a
  full real-tap regression of the Descent bug.

V4 (2026-07-13) — the retention question, answered in the tile:
- Design stance: "locked in" is the wrong goal. This surface carries zero
  loss-aversion mechanics: no countdowns, no streak threats, no guilt copy
  (asserted in the smoke). Retention here serves the loop, not itself.
- The tile is now a four-state ticket. Fresh: quiet single-button card with
  the one-official-run law. Ritualist (active streak, unplayed): "OFFICIAL
  RUN WAITING" plus the streak patch. Played: result row, then two actions
  where CHALLENGE A FRIEND is the amber primary (copies the official payload
  straight from the menu, tracked as share variant daily-menu:N) and
  practice is the ghost secondary, plus a one-line tomorrow tease
  ("TOMORROW #3 · GEM RUSH") for anticipation instead of FOMO.
- Polish: hover/focus-visible states, prefers-reduced-motion respected on the
  deny shake and press transforms, cache key v4.
- Weekly (test lane, accounts) design direction, not built here: same ticket
  family, different accent, positioned as the mastery/leaderboard track once
  accounts launch. Daily = ritual and loop; Weekly = prestige.

V5 (2026-07-15) — the plaque, the gate, and the copy layer:
- ROOT CAUSE of the washed-out amber tile screenshot: the stylesheet link was
  unversioned, so cache-busted app.js shipped fresh markup against stale CSS.
  styles.css is now version-pinned in both index.html files, and the plaque
  selectors are #app-prefixed as specificity armor so no global button rule
  can repaint the tile again.
- The tile is now a brass PLAQUE: dark plate, gold double frame, corner
  rivets, THE DAILY #N as by far the loudest text, then date, board name, and
  one short cryptic line. It reads as a different species of button from the
  amber slabs above it. The one-run law and the full brief moved off the tile.
- NEW: the gate screen between tile and draft. The law of the mode in display
  type (one attempt, same rolls, compare with friends), then TODAY'S
  VARIATION: a terse mechanically-true brief per board, the base mode named
  with the same (i) explainer pattern as capInfo, the sender's target when
  arriving by beat-link, and a ball-through-hoop SHOOT button that tips off
  the run. Every shot drops (ceremony, not skill check), the ball is a real
  focusable button, reduced-motion collapses the arc, and the read overlaps
  data loading so the gate costs zero wall-clock time cold. Practice reruns
  skip it.
- NEW: daily-core copy layer. DAILY_COPY gives all 44 modifiers a short tile
  line and a gate brief written against the actual cfg/filter/pick/deal
  hooks; era-locked boards say "era skips do nothing today" so a dead skip
  button reads as a rule, not a bug. NOTE: the requested hand-check example
  copy said bad defense "doesn't hurt as much"; the cfg raises defensive
  taxes 1.5x, so the shipped brief says the true thing. MODE_TIP mirrors
  capTip for cap and adds classic/pro explainers.
- QA: 244 suite checks, 41-step jsdom walk covering gate law text, variation
  brief, (i) toggle, target readback, shot-to-draft, tile-to-gate-to-back.

V6 (2026-07-15) — the REAL ball, one mechanic, one art source:
- The gate's invented tap-to-shoot is gone. The gate now uses the actual Hot
  Hand interaction: drag the basketball down through the hoop, ignition
  flames, the bouncing PULL DOWN arrow, all of it. Extracted into ONE shared
  implementation (wireBallPull + ballLeverHtml in app.js) that drives BOTH the
  Heat Check ceremony and the gate, so the feel can never drift between them.
  TRAVEL, release, and ignition thresholds are the ceremony's original
  numbers, untouched.
- Dead-obvious instruction, per request: DRAG THE BALL THROUGH THE HOOP in
  display type above the lever, the built-in bouncing arrow below the net,
  and an idle nudge animation on the ball itself demonstrating the pull until
  first touch (reduced-motion turns it off). "Catch fire to tip off" under.
  Tap or Enter still auto-dunks (accessibility path, ceremony parity).
- The extraction was guarded by a new smoke regression using the codebase's
  own ?clutch=1 QA hook: forced-clutch finish -> shared lever renders -> drag
  ignites -> hands off to the Heat Check sequence -> skip dismisses. That
  regression CAUGHT a real bug before ship (the skip handler referenced the
  moved closure var "fired"; now reads pullState.fired()). Suite 244, smoke
  49. Cache keys v6 on app.js and styles.css.

V7 (2026-07-15) — graphic-design pass on three surfaces:
- NEW shared .plq-frame CSS system (brass plate, gold double frame, corner
  rivets) with a .plq-slim inline variant. The menu tile, draft strap,
  variation insert, and results card now all draw from this ONE vocabulary
  instead of four ad hoc boxes; the tile's duplicated frame declarations were
  deduped onto it.
- GD_A (strap): now the slim ornate frame at the same height, with a large
  clickable (i) (20px, up from 15) that reveals the full gate brief plus the
  base-mode explainer in the customary cap-tip format, one tap away all draft
  long. FIXED: the strap was rendering the old manifest blurb (em-dash and
  all); it now shows the terse short line, and the (i) carries the detail.
- GD_B (gate): typography collapsed from nine treatments to four roles
  (eyebrow / one big display title / one calm sans law block / framed
  variation insert). The law lost its three-line display-shout; the variation
  moved into a .plq-slim frame with its own small label, name, and body.
- GD_C (results): the box-in-box-in-box is gone. One .plq-frame card, a
  frameless interior, and the official/practice state rendered as a
  hairline-ruled stamp instead of a separate dashed box.
- QA: 244 suite, 51-step smoke (adds strap-(i) reveal, framed-variation and
  four-role-law checks, single-frame results assertions). Cache keys v7.

V8 (2026-07-15) — (i) buttons + ball-hoop copy, from the doodles:
- Every draft (i) is now a filled BUTTON, not a faint outline: amber disc,
  ink-dark glyph (same dark-on-amber contrast as the confirm/mode buttons, no
  amber-on-amber), raised, hover/active feedback. Applies to the cap-mode
  draft (i), the strap (i), and the gate (i) globally, to invite the tap.
  Base size up to 22px; gate 24px; the strap (i) is the big 30px far-right
  raised button from the doodle, pinned to the right edge of the row.
- Ball-hoop gate copy per the second doodle: the "DRAG THE BALL THROUGH THE
  HOOP" heading is gone, the caption under the hoop is gone, and the lever's
  own PULL DOWN hint (plus a down arrow) is lifted ABOVE the ball reading
  "PULL DOWN v To Tip Off". The shared lever art/mechanic is untouched; this
  is gate-scoped CSS only, so the Heat Check ceremony keeps its original
  bottom-anchored hint.
- QA: 244 suite, 51 smoke (strap-(i) now asserted as the shared button base +
  strap variant; gate lever asserted to carry PULL DOWN and no DRAG caption).
  Cache keys v8.

V9 (2026-07-15) — mobile regression fixes:
- FIXED the busted hoop interaction: v8's container hack (padding-top +
  content-box on the lever) collapsed the absolutely-positioned ball/hoop/
  flames into one another on mobile. Reverted the lever to its EXACT original
  132x216 geometry. The PULL DOWN instruction is now a SEPARATE normal-flow
  caption ABOVE the lever (one line, disp font, amber, inline down arrow),
  so it can never collide with the ball again. "PULL DOWN To Tip Off".
- FIXED the weekly/daily tile color on mobile: iOS Safari was painting its
  default gold button appearance across the whole plate (the fresh tile is a
  <button>). Added -webkit-appearance: none + an explicit dark plate
  background that wins over the UA default; same reset applied to the (i)
  buttons for clean disc rendering. Cache keys v9.
Plus a jsdom full-page walk (`scripts/smoke-daily.js`, test lane) = **33/33**:
beat-link landing, autodraft, results, byte-exact share payload, official-run
law under practice reruns, stale-link honesty, and the no-daily-core fallback.

---

## 1. What is NEW

**`daily-core.js`** (286 lines, shared, both lanes, loads after challenges.js)
- Day math: device-local dayKey, `dayNum` from EPOCH `2026-07-12` (= Daily #1).
- `seedFor(key)`: FNV-1a over `"t82d1|" + key`. Deliberately client-derivable.
  The file header explains why this does not touch The Daily Law (ACCOUNTS
  §2.2): that law protects verified leaderboard runs; the social daily has no
  leaderboard, no accounts, no server writes. If it ever feeds one, the seed
  moves server-side first.
- Curated pool: 51 entries (44 manifest ids + 7 vanilla breathers). All ids
  verified against `T82CH.byId` by test; a manifest miss fails soft to a
  vanilla Presti day. kaman never rotates in. Three Week-suffixed names get
  display aliases (Hand-Check Rules, Post-Up Rules, Iso Rules); the manifest
  itself is untouched per manifest law.
- `verdict(wins)`: nine short lines, 82-0 "Perfect. Frame it." down to
  "Historic. The bad kind." Zero em-dashes across all 83 outputs (tested).
  Screen-only, never in the paste.
- FREEZE (2026-07-13): the 5-square grade was deleted. It duplicated the
  printed record and needed a legend, failing the self-explanatory bar. The
  share is now the house shareText format byte-for-byte (separators, blank
  lines, emoji promotion on 82-0) with exactly two lines swapped: header =
  board identity ("TRUE 82 Daily #N · Name"), footer = "Beat my five:" link.
  Pinned byte-exact in test.js and asserted in the smoke.
- `beatLink` / `parseLink`: `?d=YYYYMMDD&w=<wins>&n=<net x 10>`. Origin from
  `location` (so test-lane links point at the preview), falls back to
  true82.net. Garbage-tolerant parser, clamped values.
- Official-run law + streak in localStorage (`t82_daily1`), pruned to 14 days.
  A run nonce lets a Heat Check that lands after the results render amend its
  OWN official record; a later run can never steal official. No localStorage:
  everything still plays and shares (fail-soft, tested).

**Test additions** — `test.js` §12d (38 checks) and `scripts/smoke-daily.js`
(jsdom harness; `npm i jsdom@24` once, then `node scripts/smoke-daily.js`).

## 2. What is MODIFIED

**`app.js`** (all changes guarded on `window.T82DAILY`; without daily-core.js
the old menu, Pro button included, renders untouched — proven in smoke test):
- L349: `analyticsRunSnapshot` stamps `variant = "daily:N" | "daily-link:N"`
  onto run_state / deal_view / game_complete / run_abandon.
- L374-384: `newGame(mode, seed, challenge, opts)` gains an optional 4th arg
  carrying `{variant, social}`. The frozen referral literal
  `variant: "recap:" + shareRef` is preserved verbatim (contract test intact).
- L997-1030: `renderIntro` computes today's board; `thirdSlotHtml` is the
  Daily tile (reuses the dormant `.weekly-tile` classes, so the tile itself
  needed zero new CSS) or the classic Pro button as fallback. Tile shows board
  number, streak from 2+ days, modifier name + blurb, base chip, and either
  "first finish is official" or "your run: W-L / practice open".
- L1053-1054: Pro listener null-guarded (button may not exist).
- L1080-1104: tile wiring + `?d=` landing. Matching link auto-launches the
  board with the sender's target pinned; stale link renders an honest one-line
  note ("That link was for Daily #K. Today's board is #N.") and today's board
  stays one tap away.
- L1481-1492: draft strap `THE DAILY #N · <name> · beat W-L · Net +x.x` above
  the ticket, so mid-draft screenshots carry the brand and the stakes.
- L1937-1946: Heat Check settle amends the same run's official record
  (nonce-matched) and refreshes the on-screen grade + verdict.
- L3122-3175: results layer. Eyebrow becomes "The Daily #N · <name>"; under
  the big record: grade squares, verdict, target-comparison line ("You take
  the board." / "They hold the board." / "Dead heat. Run it back."),
  official/practice badge, and the plain-text brand line
  "true82.net · same board for everyone" (the screenshot payload).
- L3180-3230: "Run it back · practice" relaunches the SAME board with the
  target kept; the share button always ships the OFFICIAL run (label switches
  to "SHARE OFFICIAL (W-L)" on practice screens) and `publishRecap()` is NOT
  called on daily shares — the Tribune stays in-session, the shared artifact
  is data-first. Tracked as `share` with `variant: "daily:N"`.
- L3334-3369: `DAILY_LINK` parse-and-strip (same law as `?ref`), plus
  `dailyFiveLines` / `dailyResFromG` / `startDailyRun` helpers.

**`styles.css`**: one appended block (`.daily-*`), dormant without daily-core,
built entirely from the existing `:root` tokens.

**`index.html` (live)**: critical chain is now analytics, sim-core,
challenges, daily-core, app; cache key `?v=20260712-daily-playtest-v1`; the
live-hide comment records the launch. **`index.html` (test)**: daily-core
inserted before accounts.js; same cache key.

**Docs**: DEPLOY-LANES.md reclassifies challenges.js as shared and adds the
daily-core row; test.js header and README count updated to 240.

## 3. What is REMOVED

The Pro button from the start screen, exactly as specified: the Daily owns the
third slot. Pro the MODE is fully alive (blind pro dailies use it; the kaman
five-tap egg is untouched; test-lane weeklies with base "pro" still work), and
the button auto-returns on any page without daily-core.js. Nothing else was
deleted.

## 4. Deploy (GitHub web UI only)

Test lane first, per your own doctrine:
1. `accounts-test` branch -> Add file -> Upload files -> drag everything in
   `deploy-test-lane/` (folder structure preserved: `scripts/smoke-daily.js`
   goes inside `scripts/`). Commit. Preview URL should show the Daily tile in
   slot three.
2. Play one full board on the preview. Tap share. Paste it somewhere. Open the
   pasted link in an incognito tab: it should drop you into the same board
   with the target strap.
3. `main` branch -> drag everything in `deploy-live-lane/`. Commit. Note
   challenges.js and daily-core.js are NEW files on main; the rest overwrite.

Rollback = drag the old index.html + app.js + styles.css back onto the branch
(your previous zips are the restore point). challenges.js and daily-core.js
can stay put harmlessly, but deleting them also fully reverts the menu.

## 5. Kill criteria and how to read them (D1, /avocado-style queries)

The funnel keys off the `variant` column; zero server changes were needed.

- Daily adoption: `SELECT COUNT(*) FROM events WHERE name='game_start' AND
  variant LIKE 'daily:%'` vs total game_start. **Kill test**: if under 15% of
  starts are daily after 3 weeks, the slot swap is not earning its position.
- Share rate: `name='share' AND variant LIKE 'daily:%'` over `name=
  'game_complete' AND variant LIKE 'daily%'`. Baseline to beat is the 1.3%
  scoreboard tap rate. **Kill**: not >= 3x baseline (roughly 4%) inside 3
  weeks -> the artifact is not compelling; iterate copy once, then rethink.
- The loop itself: `name='game_start' AND variant LIKE 'daily-link:%'` counts
  receivers who landed AND started. This was ~zero before; any steady nonzero
  is the first real signal. **Kill**: still ~zero 4 weeks after the seeding
  post -> per the research verdict, stop optimizing sharing.
- Practice depth (retention texture): `variant LIKE 'daily-practice:%'`.
- Near-miss check (Belief 3): share rate at wins in (80,81) vs wins = 82,
  via `wins` on the share event.

## 6. Decisions you did not explicitly ask about (and why)

- **Daily modifier pool over raw weekly reuse.** Your instinct was right to
  hedge. Wholesale reuse was wrong for three reasons: the weekly rotation
  formula would desync from a daily cadence, a handful of entries lean on
  weekly framing, and manifest law forbids tuning in place. The pool
  references 44 curated ids plus vanilla breathers; the manifest is read-only.
- **Squares grade the record, not a fake game log.** The engine has no
  game-by-game season. A positional W-L strip would be fiction; you would
  hate it on epistemic grounds and you would be right.
- **One official run, practice open.** Scarcity is what makes a daily a
  ritual, but hard-locking replays punishes curiosity. First finish is
  official and shareable; replays are labeled practice and share the official
  numbers. Honest comparability, zero frustration.
- **No canned one-liner chips.** The research asked for sender-voiced
  payloads; canned chips are fake sender voice. The real sender voice is the
  line they type above the paste in Messages. Cut deliberately.
- **Tribune stays, but out of the share.** In-session ceremony untouched;
  daily shares carry no slug and no nickname, per the 2026 AI-content
  evidence. `publishRecap()` simply is not called on the daily share path.
- **Local-midnight day boundary** (Wordle convention), with the board number
  in every artifact so timezone straddles are visible, never silent.
- **Hot Hand kept.** Engine untouched per your invariant; an 81-win cap daily
  still gets the lever, and the nonce mechanism keeps the official record
  honest either way.

## 7. Known follow-ups (deliberately not done)

- A few manifest blurbs say "this week" or carry em-dashes (e.g. luxury_tax).
  They render verbatim on daily boards. The clean fix is manifest-law
  compliant `_v2` entries or blurb aliases in daily-core; one sitting, low
  stakes, your call.
- The Daily and the account daily (dailyStrip, HMAC seeds) are separate
  systems on purpose. If accounts ever launch on live, the merge design is:
  anonymous players keep the local social daily; signed-in players get the
  server seed and a leaderboard; the share artifact stays identical.
- Seeding: per the research, ship this, play it for a few days, then fire the
  one r/nba post timed to a live era debate. The loop now exists; it still
  needs the spark.

## V10 (2026-07-15) — pencil edits

- Hot Hand wheel odds (`sim-core.js`, `HH_SEGMENTS`): COLD 1->6, WARM 9->14,
  HOT 30->42, ON FIRE 30->23, SUPERNOVA 30->15. Sums to 100. No test pinned
  the old values; no golden-replay impact (verified before committing).
- Gate caption above the hoop: "PULL DOWN To Tip Off" -> "DUNK THE BALL TO
  START" (all caps, one line, unchanged position and font). The shared
  lever's own built-in hint (used by the Heat Check ceremony) is untouched;
  only the gate's separate caption element changed.
- QA: 244 suite, 51 smoke (caption assertion retargeted to the new text).
  Cache key v10 on app.js.

## V11 (2026-07-17) — compact draft chrome + the rules sheet + the copy rewrite

Design goal, verbatim from the brief: it must be beyond dead simple to find
the rules, and the rules must be written so a first-timer can play to the
full extent immediately. Three moves, all modes, draft screens only:

- COMPACT CHROME: while a draft is live, body.drafting now hides the big
  masthead (one CSS rule; intro, gate, results, Tribune all still remove the
  class, so the full site-head returns there). A 46px utility bar replaces
  it: EXIT RUN (keeps the startOverBtn id, so wireStartOver and run_abandon
  are untouched), the five pick diamonds with a live PICK N OF 5 counter
  (renderPips paints both homes), and a small hoop mark. The amber Start
  over slab, the daily/challenge strap, the cap money bar, the pro hint,
  and every draft-screen (i) are retired from this screen.
- THE MODE PANEL: one plq-slim frame under the bar. Left: identity (DAILY #N
  with a "1 OFFICIAL ATTEMPT" / "PRACTICE RUN" pill, or CLASSIC MODE /
  PRESTI MODE / PRO MODE / WEEKLY / CHALLENGE), then a mechanical status
  line (base rules, the day's twist in one breath, live $N LEFT in Presti,
  beat-target when arriving by link). Right: a gold HOW TO PLAY button
  (book icon + "rules + official attempt" style sublabel) that rides the
  existing presti-spin slab treatment. Kaman keeps its mystery: bar only.
- THE RULES SHEET: HOW TO PLAY opens a proper overlay (z 110, Escape /
  backdrop / GOT IT close, focus restore, body scroll lock, rules_open
  analytics with the run snapshot). Contents in order: THE DAILY law (daily
  runs), TODAY'S RULE / THE TWIST framed insert with the full brief, THE
  GAME IN 20 SECONDS (four steps), base-mode rules bullets, WHAT WINS GAMES
  (talent / shooting / one ball / defense / the math, with the engine's real
  numbers: 110 usage budget, 3-spacer target, 2-3 net pair-defense taxes,
  net 0 = 41-41, +27 runs the table, 96 Bulls +13), and a "today's rule
  wins any conflict" note on modified boards. Fallback chain for challenge
  briefs: DAILY_COPY[id].g, then the manifest blurb.
- THE COPY REWRITE (daily-core): every DAILY_COPY entry (43 ids), all three
  VANILLA_COPY entries, and all three MODE_TIPs rewritten under a stated
  copy law: what changed, by how much, what to do about it, plain english,
  verified against the actual cfg/filter/pick/deal hooks. Real numbers
  throughout (luxury_tax now says "more than four times" because 0.4 vs
  0.09375 IS 4.3x; deep_pockets admits $82 at 1.6x prices is normal buying
  power; gem odds taught as "about 1 in 7, half the mid-tier are rip-offs"
  straight from capMisprice). Era-locked boards still name their dead skips.
  Zero em-dashes across every user-facing string (asserted).
- Intro Draft/Winning paragraphs and the static index.html crawler block
  refreshed to the same standard; both now point at HOW TO PLAY.
- decorate3dButtons exclusion list gains .du-exit and .rs-close so the quiet
  chrome stays quiet; the rules button deliberately takes the gold slab.
- QA (local jsdom walk, 70 checks): chrome + panel per mode, live $ after a
  paid skip, pips advance on a real confirmed pick, sheet contents per mode,
  Escape/GOT IT/backdrop close + scroll-lock release, gate dunk to official
  draft, practice pill flip, results restore the masthead, copy laws
  (coverage + em-dash zero), challenge and kaman paths, run_abandon and
  rules_open events. Cache key v11 on app.js and styles.css.
- TEST-LANE HEADS-UP: the repo's smoke-daily walk asserts the old strap (i)
  and capTip surfaces (V7/V8 checks). Those assertions need retargeting to
  #rulesBtn / #rulesOverlay when this lands in the accounts-test lane; the
  gate (i) checks still pass as-is. MODE_TIP's mirror comment now points at
  RULES_MODE in app.js instead of the deleted #capTip.

## V11 hotfix (2026-07-17, same day) — subpage 404s: the share catch-all ate the explainer pages

Root cause, reproduced locally on wrangler pages dev with byte-identical
files (so: not a Cloudflare platform change, not the compatibility date).
The Markdown-for-Agents feature added /faq, /faq/, /how-it-works, ... to
the _routes.json include list so _middleware.js could content-negotiate
them. But after the middleware's next(), the router's next match for any
single-segment path is functions/[id].js (the Tribune root share handler),
whose SLUG_RE requires ^[A-Z0-9] and exactly 5 chars. "faq" fails, and the
old line returned plain("not found", 404). The share wildcards were
uppercase and digits only precisely so lowercase paths stayed static; the
five explicit page includes broke that invariant the day they shipped.
Agents asking with Accept: text/markdown got 200s the whole time; humans
got "not found".

Fix in functions/[id].js (~L52-66): non-slug GET/HEAD falls through to
env.ASSETS.fetch(request) instead of 404ing, so real pages serve their
index.html and junk paths get the styled 404.html (still status 404).
Non-slug POST still returns plain 404. Verified on the local Pages router:
all five pages 200, /faq noslash 308 then 200, junk paths 404 with the
styled page, slug-shaped paths still enter the DB branch, POST /faq still
404, markdown negotiation still 200 text/markdown. Deploy note: this file
ships in BOTH lanes; patch the accounts-test branch's copy too. Do not
change the compatibility date; it was never the problem.

## V12 (2026-07-17) — money in millions, the bank that ticks, and the year reel everywhere

The Codex salary-cap spec, adapted to the house (vanilla JS, the V11 chrome
as the real baseline) plus six same-day asks. Layout notes below; the full
divergence log is in the session summary.

- MONEY IS MILLIONS: new shared fmtM()/fmtMCost() in app.js. Every dynamic
  amount now renders $NM with U+2212 for deductions: bank, skip chips, price
  boxes, tray note, results cap line, both share-text cap segments (FORMAT
  LAW amendment: "$12M Cap Spc"; test-lane byte pins need repinning). All
  authored prose migrated inline: 57 conversions across DAILY_COPY,
  VANILLA_COPY, MODE_TIP, plus RULES_MODE and the vanilla gate line. The
  weekly tile now prefers DAILY_COPY over the raw manifest blurb, so
  challenges.js stays untouched per the manifest law.
- THE BANK: its own slot in the mode panel (BANK over a 26px amber amount),
  and tickBank() counts spends down in red and refunds up in green, one
  million at a time, surviving the per-round re-render via G.bankShown.
  Reduced motion snaps.
- SKIP CHIPS: Presti's three skips are label + gold-on-ink cost chips
  (SKIP TEAM / −$1M) in a 3-up grid. flashRefund/flashFireSale now save and
  restore innerHTML so the flashes don't flatten the chips. Classic keeps
  its free-skip labels.
- PRICE BOXES: cap rows carry a DRAFT + $NM box on the right; the row stays
  the single tappable control and the box takes its pressed state from the
  row. Fire-sale strike-through lives inside the box. The scramble reel
  paints .cc-amt now.
- YEAR REEL EVERYWHERE: yearControlHtml is a styled face + transparent
  native select (same handler, same a11y, iOS zoom guarded), which makes the
  season text spinnable, so every pick and skip in every mode runs the year
  scramble (cap keeps the full name+price roulette). The face's gold caret
  plus the new CHANGE THE YEARS callout in the rules sheet plus Classic's
  panel line (TAP THE YEAR) answer "make year-changing obvious".
- RULES BUTTON: subtitle removed, single-line HOW TO PLAY, and the book icon
  is a drawn open book (ink cover, cream pages) instead of a silhouette.
- DRAFT VIEWPORT: body.drafting locks to 100dvh, the pool is the only
  scroller, its scrollport runs behind the tray with a gradient fade, and a
  one-time MORE PLAYERS cue shows on round 1 overflow and dies on first
  scroll. --tray-h tracks the real tray height (ResizeObserver + viewport
  listeners), so selection growing the tray moves the fade automatically.
- FULL-SCREEN GATE: body.gating hides the masthead and footer on the Daily
  gate so the ball fits without scrolling; every exit path clears it.
- Cache keys v12 on both copies. Local walk extended (fmtM units, tick
  timing, chips, boxes, faces, gate class, callouts, and a bare-dollar
  sweep across rendered DOM and the copy layer).

## V13 (2026-07-18) — the playability audit and the second rotation

A greedy bot played every manifest mode through the real engine (300 games
each) and the daily schedule was rebuilt on the numbers.

- THE FINDINGS: escalator (live in the daily hash) was 61% unfinishable;
  classmates 99%; the_anchor 42%; tall_wings 24%. A dozen stat-threshold
  weeklies deal 1-2 player boards. The height-capped modes (short_kings,
  small_ball_apoc) only "completed" through a data quirk: career position
  eligibility is keyed by NAME, so a 6'3" Charles Jones inherits a 6'9"
  Charles Jones' center card. For humans the C slot was as dead as it
  looked. That collision is documented, not fixed (replay law).
- THE FIX FOR TODAY: 2026-07-18 is overridden mid-day to small_ball_five,
  the same fantasy with the unicorn rule (everyone 6'4" and under, except
  true centers, legal at any height; four spacers wanted). Audit: 0%
  unfinishable, 42-player pools, real center supply. The morning's official
  runs stand; the board simply became playable.
- THE SECOND ROTATION: from 2026-07-19 the daily is a hand-ordered 42-day
  cycle (POOL2), six weekly arcs with a deliberate cadence, drawing 18
  previously unshipped manifest modes (loyalty, time_machine, rivalry,
  decade_ladder, hyperinflation, kaman_epoch...). Every scheduled mode
  audits 0% dead with healthy pools. The legacy hash pool is FROZEN and
  still resolves every date before 7/19, so history and beat-links replay
  byte-identically (proven against a 60-day fixture in the local walk).
- MANIFEST DOCTRINE v2: challenges.js is append-only; shipped ids are
  immutable. One new entry (small_ball_five). weeklyFor is frozen at
  modulus 98 so additions never reshuffle the weekly schedule, and it now
  steps deterministically past the audit-dead ids.
- Retired from the daily rotation (ids stay live for replays): escalator,
  short_kings, small_ball_apoc, grit_grind, two_way, even_money, gem_rush,
  petty_cash, deflation, no_defense, analytics_dept, specialists, no_skips,
  moneyball, seventies_money, and four of the seven blind boards.
- Cache: challenges.js and daily-core.js were loading BARE (no version
  key) — a same-day fix would never have reached cached clients. Both now
  carry ?v=20260718-daily-v13 on both lanes.
- Full numbers: AUDIT-DAILIES.md (session outputs).

## V16 — Mobile Presti panel hierarchy fix (2026-07-18)
- Mobile salary-cap / Presti mode panel layout was rebalanced because the bank lost priority.
- On mobile, the **HOW TO PLAY** button now sits in the upper-right utility position.
- The **BANK** now spans its own full-width row beneath the mode header so it becomes the obvious focal element.
- Mobile bank styling was amplified further (larger amount, stronger glow, bigger tile, stronger contrast).
- Cache keys in `index.html` were bumped to `ui-v16` so the CSS fix is not hidden by stale mobile assets.

## V17 — Bank width and rules-sheet scan order (2026-07-18)
- Removed the redundant subtitle beneath **HOW TO PLAY**.
- Compacted the HOW TO PLAY control globally and especially on mobile.
- Expanded the bank column on wider draft panels; mobile bank remains the full-width hero row.
- Global rules-sheet order is now: mode rules → change the years → game in 20 seconds → what wins games.
- Cache keys bumped to `ui-v17`.


## V18 (2026-07-18) — the DRAG cue and the small-ball re-certification
- Gate caption now reads DUNK THE BALL TO START with the arrow and a DRAG
  pill riding the ball's own gateNudge rhythm: three things tugging in
  parallel teach the interaction without words of explanation.
- The v17 small-ball rework (center slot requires F+C eligibility; talls
  barred from G/F slots) re-certified by a slot-aware bot: 300 games, 0%
  unfinishable, wins 44/56/68. No legitimate short player is stranded.
- Validation walk at 117 green, now pick-hook aware.

## V19 (2026-07-18) — the bank lives in the tray
- Moved the Presti bank from the top panel to a strip atop the tray: the
  balance now sits where spending is confirmed, next to the medallions and
  the draft button, in the zone the eye returns to after every action.
- Live math: select a priced player and the pending cost appears beside
  the balance; the real deduction then ticks down in the same spot.
- Low-funds warning: the strip turns whistle-red as the balance approaches
  the $1M-per-open-slot floor.
- The mode panel sheds its bank column on desktop and its hero row on
  mobile, returning vertical space to the pool.

## V20 (2026-07-18) — the plaque wins; the math moves to the moment
- The bank plaque is back in the mode panel exactly as v17 built it; the
  v19 tray strip is retired after a side-by-side verdict.
- What the experiment proved out stays, relocated: the confirm line now
  shows the full spend math ("$23M · leaves $27M") on every priced pick,
  including single-slot confirms that previously showed no cost at all,
  and the plaque itself turns whistle-red as the balance approaches the
  $1M-per-open-slot floor.

## V21 (2026-07-18) — the mobile vertical diet
- Small screens were burying the pool below the fold. Every fixed band
  slimmed on <=640px: the bank plaque keeps its v17 materials but goes
  horizontal at roughly half the height (30-38px figure instead of
  52-68px on a 92px tile); the ticket headline drops from 40px to a
  22-28px clamp so TRAIL BLAZERS-length names stop wrapping three deep;
  the crest zone narrows from 116px to 88px, returning width to the name;
  panel, skip-button, tray, medallion, and filter-row padding all tighten.
- Net reclaim on a 390px phone: roughly 170px on long-name Presti boards,
  which puts the filter row and two to three player rows back above the
  fold. Desktop untouched.

## V22 (2026-07-18) — detail polish
- Mobile plaque: BANK label vertically centered against the number.
- Skip buttons: labels center in the space left of the money chip at every
  viewport, instead of pinning hard-left.
- Player price boxes drop the DRAFT word; the number is the message. The
  fire-sale strike-through and the reel repaint live inside the same box,
  unchanged.
- Desktop audit: the v21 diet is fully caged in its <=640px media block
  (verified programmatically); the two intentional cross-viewport changes
  are the label centering and the bare price box; grid, plaque column, and
  reel targets confirmed intact.

## V23 (2026-07-18) — independent slot reels and chrome nits
- Every price box and year face is now its own slot reel: staggered starts,
  7-10 flips on a decelerating clock, and the REAL value dropping back in
  on the final tick with a settle-pop. Years sweep the whole dealt era with
  the team code held steady; prices flip through a cheap-heavy plausible
  book; cap-mode names keep their decoy sheet. Cosmetic only: the reels
  never touch the seeded RNG, and a hard stop guarantees the pool unlocks.
- Tray top padding cut to 2px; the "open" caption under empty medallions is
  gone (bare dashed circles), returning that line to the pool.
- Skip labels up to 14px (12.5px on phones), still centered left of their
  chips. The utility bar's hoop mark now centers on the bar's axis.

## V24 (2026-07-19) — results rework, the canonical ladder, chrome fixes
- Donate button is now a static "Feature requests? Bugs? Email me." mailto
  to true82mailbox@gmail.com (jokes retired; /avocado history untouched).
- HISTORY_COMPS: the owner's 19-team ladder supersedes META.legends for the
  GOAT Climb pins and feeds a new comp line on every results screen:
  "Almost as good as the {nearest team above}" (or "Better than the OG
  Death Lineup" at 81+), replacing the cap-space line. Three old pins
  retired (Showtime Lakers, '97 Bulls, '25 Thunder); Hamptons 5 recut to
  78; the Celts Big 3 split into OG (76) and '08 (75); 70 wins is a
  deliberate gap.
- Daily results: the nested plaque is gone. Its ornate frame moved to the
  board itself, the OFFICIAL RUN / PRACTICE stamp rides the top under the
  eyebrow, the challenge line keeps its spot, and the verdict + brand
  lines retired with the box.
- Gate: the DRAG cue is out of the caption's flow, so DUNK THE BALL TO
  START centers true over the ball; under 480px the cue drops to its own
  centered bouncing row.
- Slot reels keep their spin; the landing pop (names shifting, amounts
  expanding) is retired.
- Played daily tile: the tomorrow line is all gold (the ::first-letter
  hack is gone) and the practice button is removed; practice lives on the
  results screen's Run it back button. The tile keeps CHALLENGE A FRIEND.

## V25 (2026-07-19) — glow, Wilt, money type, metric years
- YOUR FIVE burns: triple-halo on the dot, hard amber bloom on the label.
- Prime Wilt Core joins at 80; same-win teams now share one pin with a
  combined tag ("5 Jokics · Prime Wilt Core 80") instead of stacking. The
  comp line names the first team at the tier.
- The 81-to-82 headroom on the climb is cut to a quarter (BAND_PX 60 -> 15).
- Money typography, display layer only: a thin space after the $ and a
  lighter, slightly smaller trailing M wherever amounts render bold: the
  plaque, price boxes, skip chips, the ticking bank, and the price reels.
  Share text, copy prose, and reel textContent stay plain "$17M".
- Classic: the Off/Def chips are OBPM/DBPM, and engaging one repicks every
  undrafted player's default season to his best eligible year BY THAT
  METRIC, so list order and selected years agree. New deals under a metric
  sort auto-fill missing years but never clobber hand-picked ones;
  switching back to Min/A-Z restores engine-value defaults (an explicit
  sort click does reset hand-picks, by design).
