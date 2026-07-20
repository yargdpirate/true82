# TRUE 82 — CURRENT AGENT HANDOFF

**Current source of truth:** this folder, as packaged in `true82-live-v15-documented.zip`.

**Date:** 2026-07-18  
**Current build label:** `20260718-ui-v15`  
**Most recent functional fix:** Daily #7 / `small_ball_five` center-slot legality.

Read this file before editing. It summarizes the current architecture, the recent UI work, the exact Small-Ball rule, deployment structure, and validation expectations.

---

## 1. Canonical project structure

This archive is already flattened and deployable. Its contents belong directly at the repository/Cloudflare Pages root.

- Do **not** wrap the project in another `true82-live-with-daily/` folder.
- Do **not** add `.wrangler/`; that is local Cloudflare state, not deployable source.
- There is one canonical copy of each file.

Critical browser load order in `index.html`:

1. `analytics.js`
2. `sim-core.js`
3. `challenges.js`
4. `daily-core.js`
5. `app.js`

The Daily depends on `challenges.js` loading before `daily-core.js`, and both loading before `app.js`.

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

Current `index.html` keys:

- `styles.css?v=20260718-ui-v15`
- `challenges.js?v=20260718-smallball-fix-v14`
- `daily-core.js?v=20260718-smallball-fix-v14`
- `app.js?v=20260718-ui-v15`

When changing a browser-served JS/CSS file, bump the matching key in `index.html`.

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

`CHANGES-THE-DAILY.md` contains the longer history of The Daily’s design and architecture. It predates some of the July 18 UI work, so use this handoff as the current-state summary and the older file as historical context.

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
logged above in the V13-V27.1 sections and in CHANGES-THE-DAILY.md.

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
