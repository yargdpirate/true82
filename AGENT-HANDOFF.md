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

