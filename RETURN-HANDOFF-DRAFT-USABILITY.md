# RETURN HANDOFF - DRAFT USABILITY PACKAGE (v47.10)

Base: the v47.9 trait presentation package. Everything below is the complete
delta. BUILD_V stays "v47" (footer version law).

Files changed: `app.js`, `styles.css`, `index.html`. Nothing else. Traits,
polling, simulation, scoring, analytics, and database code are untouched.

## 1. Identification (done before any code)

- **Menu container:** `#pool` (class `.pool`). While `body.drafting` is set,
  the page is fully locked (`body.drafting { overflow: hidden }`, `#app` is an
  overflow-hidden flex column) and `.pool` is the ONLY scroller
  (`overflow-y: auto; overscroll-behavior: contain`). That layout is why wheel
  input over the utility bar, mode panel, pool head, or tray previously did
  nothing at all: the page cannot scroll and the pool never receives the event.
  The pool node is rebuilt by `refreshPool()` every round, so nothing may hold
  a reference across renders.
- **Input selector:** `.pool-search` (the "search player name" box in
  `.pool-head-tools`). It was 13px; iPhone Safari force-zooms the page when a
  focused input computes under 16px. The viewport meta is
  `width=device-width, initial-scale=1` with user zoom fully enabled, and it
  stays that way.
- **Event lifecycle:** one `document`-level `wheel` listener, `passive:false`
  (it must be able to preventDefault), wired exactly once from `boot()` via
  `wireDraftWheel()`. Every condition is evaluated at event time and the pool
  is looked up by id per event, so per-round re-renders need no rewiring and
  the listener is inert everywhere outside a live Classic/Presti draft.

## 2. Fix 1 - desktop wheel/trackpad scrolling (app.js)

`wireDraftWheel()` forwards a vertical wheel gesture into `#pool` when ALL of
these hold, and otherwise does nothing and prevents nothing:

- `body.drafting` is set and `MODE` is `classic` or `cap` (Presti). Results
  pages, home, Kaman, Pro, duels and league screens never enter the handler.
- No `body.rules-open`, no `body.gating` (daily gate ceremony), no
  `#pool.scrambling`.
- Not a `ctrlKey` wheel (trackpad pinch-zoom rides that) and not a
  horizontal-dominant gesture (`|deltaX| > |deltaY|`).
- The target is not inside `#pool` itself - native scrolling owns the pool, so
  there is no double-delivery ever.
- The target is not inside `input`, `textarea`, `select`, or `[role=dialog]`,
  and no OTHER ancestor of the target is an actual scrollable region
  (computed `overflow-y: auto|scroll` with real overflow). The rules sheet's
  `.rs-scroll` is caught by both of those fences.
- The pool can actually move in the gesture's direction. At the top edge an
  upward wheel is not consumed and at the bottom edge a downward wheel is not
  consumed, so scrolling can never feel trapped, and normal page scrolling is
  preserved anywhere the handler declines.

`deltaMode` is normalized (pixels as-is, lines x32 for Firefox, pages x pool
height) and the consumed event is `preventDefault()`ed only when the pool
actually took the delta.

## 3. Fix 2 - iPhone Safari focus zoom (styles.css)

```css
@media (pointer: coarse) {
  .pool-search { font-size: 16px; padding-top: 6px; padding-bottom: 6px; }
}
```

16px is exactly Safari's no-zoom threshold. Scoped to coarse pointers so
desktop keeps the 13px mono look; the vertical padding trim keeps the rendered
input at the same 33px height as before, so the tools row does not move.
No `maximum-scale`, no `user-scalable=no`, no viewport change: pinch zoom and
accessibility zoom behave exactly as they always did.

## 4. Validation (real Chromium, real styles.css, real extracted function)

The harness extracts `wireDraftWheel` from the shipped `app.js` by brace
matching (never a copy) into a drafting-shaped page using the shipped
`styles.css`. 22 desktop checks + 2 touch-context checks, all passing:

- Layout sanity: pool overflows, page computes `overflow: hidden`.
- Wheel over the mode panel, utility bar, and tray each scroll the pool and
  are consumed; a real Chromium `mouse.wheel` through the input pipeline over
  the panel moves the pool and over the search input does not.
- Wheel over the pool itself and over the search input: untouched.
- Edge behavior: at top + wheel-up and at bottom + wheel-down are NOT
  consumed (no trap, no double-scroll).
- ctrl+wheel and horizontal-dominant swipes pass through.
- Line-mode deltas normalize (3 lines -> 96px).
- Gates verified inert: Kaman mode, picker closed, rules sheet open, daily
  gate, scramble; `cap` mode verified live.
- A scrollable `[role=dialog]` (rules-sheet shape) absorbs its own wheel.
- Typing in search works and the value survives; keyboard dismissal is
  untouched (no listener goes anywhere near focus/blur).
- Touch context (390px, coarse pointer): search computes 16px at the same
  33px height; desktop context still computes 13px.

## 5. Deployment

1. Drag the package contents into the GitHub repo root (flat), commit, let
   Pages deploy. NO D1 migration, NO console command.
2. Hard-reload once: both cache keys moved to `?v=20260731-draft-usability-v47`
   (app.js AND styles.css - the styles bump matters, the media query lives
   there).
3. Footer still reads "| v47".

Rollback: restore `app.js`, `styles.css`, `index.html` from the v47.9 package.
No data to unwind.

## 6. Focused smoke checklist

Desktop (mouse + trackpad):
- [ ] Start a Classic draft. Wheel with the cursor over the mode panel and
      the utility bar: the player list scrolls.
- [ ] Wheel with the cursor over the list itself: scrolls exactly once
      (no doubled speed).
- [ ] Scroll the pool to the very top, wheel up over the panel: nothing
      fights you. Same at the bottom wheeling down.
- [ ] Open HOW TO PLAY mid-draft: the sheet scrolls itself, the pool behind
      it never moves. Close it, pool scrolling resumes.
- [ ] Presti draft: same behavior. Finish a run: wheel on the results page
      behaves like any normal page.
- [ ] Pinch-zoom on a trackpad still zooms.
- [ ] Type in search, sort chips, change a year select: all unaffected.
- [ ] Weekly Kaman board: wheel behavior is stock (handler inert).

iPhone Safari:
- [ ] Start a Classic draft, tap "search player name": the page does NOT
      zoom in. Type a name: filtering works. Tap Done / tap away: keyboard
      dismisses, layout intact.
- [ ] Pinch-zoom the page manually: still works (nothing was disabled).
- [ ] The search row height looks the same as before (16px text in the same
      33px box).

## 7. Preview analytics isolation (dashboard-side, zero code)

Ships with this package as a companion change, done entirely in the
Cloudflare dashboard: give the Pages project's PREVIEW environment its own
scratch D1 under the same binding name (`DB`), so preview deployments and the
accounts-test lane stop writing into production analytics, retention, and
votes. Steps live in the chat handoff; nothing in this ZIP depends on it and
it can be done before or after deploying v47.10.
