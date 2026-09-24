# TRUE82 — RETURN HANDOFF: TRAIT PRESENTATION PACKAGE (v47.9)

**Base:** `true82-v47.7-clean-agent-handoff` (the answer-ceiling build). This document describes ONLY this delta. Everything outside it is byte-identical to the supplied base.

**Executable files changed:**

1. `app.js` — all presentation work
2. `functions/api/traits.js` — `op=labels` batch cap only (3 small edits, no query change)
3. `index.html` — `app.js` cache key only: `20260731-answer-ceiling-v47` → `20260731-trait-chips-v47` (trailing `v47` kept for the footer BUILD_V parity pin; BUILD_V remains `v47`, matching the whole v47.x series convention)

**No database migration. No schema change. No vote, consensus, editorial, analytics, retention, simulation, scoring, or roster-generation change.**

---

## 1. The audit: what 3PT / GRAVITY actually are, and what was dark-on-dark

### A. Authoritative source of the 3PT/GRAVITY display

`chipsFor(row)` in `app.js` reads **`row[IDX.sp]`** — the spacing column of the engine's player data (`IDX` is exported by sim-core at load). This is the **same column sim-core sums into `e.sumSp`** for the spacing tax / spacing bonus on the Scoring Card, and the same designation the rules sheet describes ("Three floor spacers is the target… Elite gunners count as one and a half").

**Verdict: the 3PT and GRAVITY chips are an ENGINE-FACING LIVE CLASSIFICATION.** They are not community-voted trait labels and not a legacy artifact — only their *skin* was legacy (v47.7 had already dressed them in the tchip look; before that they read `3PT`/`3PT+`). `sp === 1` → `3PT` (counts as one spacer); `sp >= 1.5` → `GRAVITY` (the elite gunner). The thresholds, the data, and every scoring consumer are untouched by this package.

### B. Root cause of the unreadable dark-on-dark labels

`decorate3dButtons()` (the global 3D-button decorator + MutationObserver from `bindGlobalButtonStyle`) stamps `presti-spin` onto **every `<button>`** outside a short exclusion list. When v47.5 turned the community labels from `<span class="tchip">` into `<button class="tchip">`, the observer began decorating them:

- `button.presti-spin` sets `color: #2A1A05` (near-black ink) at specificity **(0,1,1)**, which **beats** the injected `.tchip { color: #FFB52E }` at **(0,1,0)**;
- meanwhile the injected `.tchips button.tchip` rule at (0,2,1) kept overriding the *background* back to the near-transparent dark chip face;
- net computed style on every **positive** label: near-black text on a near-black face — unreadable;
- `.tchip.anti` at **(0,2,0)** still beat presti-spin's color, which is why the **anti** labels stayed red and readable while the positive ones went dark. The `trait-info-btn` (i) lost its gold glyph the same way.

A second, smaller path: duel/league deep-link boots skip `renderIntro`, which was the earliest `ensureTraitsCss()` injector, so chips on those routes could render with no trait CSS at all.

### C. The fix (three layers, all presentation)

1. `.tchip` and `.trait-info-btn` are added to the decorator's exclusion list (`BTN3D_EXCLUDE`), so no outside button rule can repaint them again.
2. Chips now wear the site's own contrast law ("dark text on amber, never amber-on-amber", the `.cap-info` comment in styles.css): positive labels and engine chips are **ink `#1c1608` on the gold slab** (`#FFC957→#F2A81F`, edge `#9a6a12` — the `tm-vb` family); anti-labels are **dark red-ink `#2b0d09` on the red slab** (`#F06A54→#D9422D`, edge `#8c2317`) with the cross-out line in the same ink. Measured contrast: **10.27:1** positive, **4.90:1** anti (AA needs 4.5). The (i) button becomes the amber disc with the ink glyph, same as `.cap-info`.
3. `boot()` now calls `ensureTraitsCss()` + `wireTraitChipTaps()` unconditionally, covering the duel/league entry paths.

Positive vs anti distinction is preserved three ways: gold vs red slab, the cross-out, and the `Ruled out:` aria prefix.

---

## 2. What this package does, by change

### A. Compact placement on results cards (`applyLabelChips`)

Community label chips now inject into the card's **first `.pr-sub` line** — the same year · team line that already carries the engine 3PT/GRAVITY chip — inside a `<span class="tchips tchips-inline">`, instead of a separate `.tchips` row appended at the card's foot. Labeled cards get **shorter** than the shipped v47.5 layout (the old bottom row cost ~31px; the inline line costs ~5px of line-height growth). A fully labeled card measures 93px at both 390px and 900px widths.

### B. Unified chip interaction (`engChipHtml`, `wireTraitChipTaps`)

The engine 3PT/GRAVITY chips are now the same species of button as the labels: same slab, tappable, expand in place, collapse on outside tap, join the legend. Their expansion full names use the engine's own rules-sheet vocabulary so they can never be mistaken for votes:

- `3PT` → **Floor Spacer**
- `GRAVITY` → **Elite Gunner**

Chip tap handling moved from a per-section listener to **one document-level delegation** (`wireTraitChipTaps`), so expansion works identically on results cards, classic draft rows, and Kaman cards. The old per-section chip branch and the standalone dismiss listener were removed; the info-button handling stays per-section.

### C. The legend knows about the engine (`buildTraitLegendInto`)

The legend builder is generalized to any scope. Community rows list first; engine rows follow marked `· engine`, and when any engine chip is present the note gains: "3PT and GRAVITY are the engine's own shooting math, not votes." `wireTraitCardUi` now runs on results render (engine chips are in the initial markup, so an engine-only roster gets the (i) + legend without waiting on the labels fetch) and rebuilds the legend when labels land.

### D. Presentation-only dedup (`traitLabelsAfterEngineFilter`)

With engine chip and labels sharing one line, a **positive** community shooter label of the same rank would render as a visual double ("3PT 3PT"). So, per card: a positive `Three-Point Shooter` label is skipped when any engine shooter chip is present, and a positive `Super Three-Point Shooter` is skipped when the engine chip is `GRAVITY`. **Anti-labels always render** — a community `NOT 3PT` beside the engine's `3PT` is exactly the fight this mode exists for. This filter runs before the standing four-label display cap, which is preserved. No data, vote, or label API behavior changes; it is purely which chips paint.

### E. Community labels on Classic draft cards (`wireDraftPoolLabels`)

Classic pool rows (which includes Daily and weekly boards on a classic base) now show the same label chips in the same `.pr-sub` placement, beside the year control and the engine chip. Mechanics:

- Labels are per player-**season**, so every pool re-render (search keystroke, sort, year change, scramble settle — they all route through `refreshPool`) re-applies from a session cache keyed `lower(name)~season`.
- Only unseen pairs hit the network: one batched `op=labels` call per chunk of 60, guarded against duplicate in-flight fetches. The results-screen fetch warms the same cache.
- Pool chips are **`tabindex="-1"` on purpose**: forty rows × four chips would bury keyboard navigation under a hundred-plus tab stops. The pool-head legend (below) carries every full name for keyboard users; results-card chips remain tabbable and Enter-expandable as shipped.
- A chip tap **never drafts**: the pool click handler returns on `.closest(".tchip")` before row selection, mirroring the existing year-dropdown guard.
- Classic drafting rules, player values, selection logic, `currentPoolRows`, and simulation are untouched.

The classic pool head gains the same (i) button (hidden until any chip exists) with a `trait-legend` panel mounted above the pool, wired to the shared `traitInfoToggle`.

### F. `functions/api/traits.js`: labels batch cap

`parsePlayerPairs(raw, cap)` gains an optional cap defaulting to the existing 8; **only `op=labels` passes 60**. Justification: the labels query already reads the full settled label set per request and filters in JS, so 60 pairs cost exactly what 8 did — this turns a full classic pool into one request per round instead of five-plus. `op=roster` (which creates rows per pair) and everything else keep the 8 cap. No SQL changed.

### G. Safety and fallbacks preserved

- Unknown future trait names fall back to their full `display_name` as both abbreviation and expansion (`traitCardAbbr` unchanged).
- The card-only abbreviation map, tap-to-expand, discovery cue (`t82_trait_card_ui_seen_v1`), `prefers-reduced-motion` handling, and full trait names on `/bonuses/` and everywhere else are unchanged.
- All label surfaces fail soft: any fetch/schema failure leaves cards exactly as rendered.
- iOS specifics preserved: `appearance:none`, `touch-action:manipulation`, `-webkit-tap-highlight-color:transparent` on every chip; no haptics/audio involvement (chips were and are outside the `presti-spin` haptic selector).
- `.tchip:focus-visible` gets a chalk outline (the global amber outline was invisible on the amber slab).

## 3. What deliberately did not change

Simulation formulas and `row[IDX.sp]` semantics; scoring, values, position legality; Classic/Presti/Daily/challenge rules; vote write path, consensus, thresholds, editorial precedence; analytics event schema (chip taps emit no events, as shipped); retention identity; the four-label cap; `/bonuses/`, homepage module, RATE YOUR FIVE; share text; D1 schema and data.

## 4. Deployment

1. Upload the contents of this package to the GitHub repository root, as usual (browser drag-and-drop; flat root, no wrapper folder).
2. Let Cloudflare Pages deploy the commit. `functions/api/traits.js` deploys with the same push.
3. **No D1 migration and no console command.** Nothing to paste.
4. Confirm from the live page footer that the build is serving (`… | v47`) and hard-reload once so the new `app.js?v=20260731-trait-chips-v47` key takes.

## 5. Smoke-test checklist (desktop + iPhone Safari)

1. **Readability:** finish a Classic run with a labeled player (any 0019-covered season). In `YOUR FIVE`, positive labels are ink-on-gold slabs, anti-labels ink-on-red with the cross-out — nothing dark-on-dark, including after tapping.
2. **Placement:** labels sit on the year · team line beside the 3PT/GRAVITY chip; no extra row at the card's foot; cards are not taller than before.
3. **Engine chips:** tap `GRAVITY` → expands to `ELITE GUNNER`; tap `3PT` → `FLOOR SPACER`; tap elsewhere → collapses. The (i) legend lists them marked `· engine` with the "engine's own shooting math" note.
4. **Dedup:** a card with the engine `GRAVITY` chip never also shows a positive `GRAV`/`3PT` label; a red crossed `3PT` CAN appear beside the engine's `3PT`.
5. **Classic draft:** during a Classic (or Daily) draft, labeled players wear the same chips beside the year dropdown. Tapping a chip expands it and does NOT select or draft the player; tapping the row still selects. Changing a player's season updates that row's labels. The pool-head (i) opens the pool legend.
6. **Keyboard (desktop):** Tab reaches results-card chips and Enter expands; Tab through the draft pool skips chips (by design); both (i) buttons are tabbable and toggle with Enter.
7. **iPhone width (~390px):** chips wrap within the card line without breaking the layout; expanded long names wrap to their own line and collapse cleanly; the one-time discovery cue still pops once on a fresh browser (`localStorage.removeItem("t82_trait_card_ui_seen_v1")` to reset).
8. **Engine unchanged:** the Scoring Card spacing line, win tally, and net are identical for an identical draft; `T82.t.SC` values unchanged in console.

## 6. Validation already run on this package

- `node --check app.js` and `node --check functions/api/traits.js`: clean.
- Real-Chromium harness built from the shipped functions and injected CSS (not copies): 21/21 checks — computed chip colors, decorator immunity (`decorate3dButtons` over the whole document stamps nothing onto chips), dedup on all three card shapes, four-label cap, inline `.pr-sub` placement, tap-to-expand/collapse-elsewhere, anti cross-out surviving expansion, legend open/close with engine rows and note, pool `tabindex=-1`, Enter-key expansion, at 900px and 390px. Contrast measured 10.27:1 / 4.90:1.

## 7. Known boundaries

1. The draft-pool label fetch is classic-base only; Presti rows (no stats by design) and Pro rows stay label-free.
2. Pool chips are excluded from tab order (see 2E); the pool legend is the keyboard path to full names.
3. The engine full names (`Floor Spacer`, `Elite Gunner`) live in `TRAIT_ENG_FULL` in `app.js`; the legend's engine note is the one sentence of new user-facing copy (no em-dashes used).
4. Trait CSS remains injected from `app.js` per the standing housekeeping note (fold into `styles.css` on that file's next owner pass); `styles.css` ships byte-identical.
