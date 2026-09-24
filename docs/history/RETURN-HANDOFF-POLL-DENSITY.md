# RETURN HANDOFF - POLL DENSITY PASS (v47.21)

Base: the v47.20 tag chip + shortened definitions package. Cumulative.
BUILD_V stays `v47`; `app.js` key is `20260802-density-v47`.

Files changed: `app.js`, `bonuses/index.html`, `index.html` (cache key).
`styles.css`, `functions/`, `migrations/` and the engine are untouched.

## The five changes

### 1. Widget lead row (app.js)

`· VOTE ON PLAYER BONUSES` is gone. The subtitle is now a `.tm-lead` flex
row: `HELP BALANCE THE GAME` on the left, the tag chip flush right. The
anchor keeps its id, href and click wiring, so the per-surface `src` stamp
and the `feature_select` tracking are unchanged.

The chip stopped floating. That was the bigger win: as a float it forced the
question to wrap around it, and at 360-374 that cost a full extra line.
`tmShowQuestion` now sets `textContent` on the question again instead of
assembling innerHTML, and writes the abbreviation into `#tmTag`. `tmComplete`
clears the chip so no stale trait rides the "N VOTES IN" summary.

One narrow-phone rule was needed: below 390 the eyebrow drops to 12px/.10em
so the row holds one line down to 360. At 320 it wraps to two lines by
design, which is still no taller than the two-clause subtitle it replaced.

### 2. IDK (app.js)

`grid-template-columns` goes `5fr 5fr 2fr` -> `4fr 4fr 1fr`.

Worth writing down because it is easy to get wrong: to make IDK exactly two
thirds of its old width you solve `y/(2x+y) = (2/3)(2/12) = 1/9`, which gives
`x = 4y`. My first attempt used `17fr 17fr 4fr` reasoning in 38ths and
measured 0.63, not 0.667. Harness caught it.

Face is now `background:none` with a `1.5px dashed #4d5a67` border, no
box-shadow, and `transform:none` on press (it inherited the 2px lift from
`.tm-vb:active` otherwise). Label drops to 14px/.02em: measured ink is
17.6px against a 23.6px box at 320, so it clears everywhere.

The button also wears a new `.tm-flat` class. This is load-bearing, not
decoration: `button.presti-spin` is specificity (0,1,1) and was stamping
`padding:10px 6px 11px` onto it, which at ~24px wide would have eaten the
label on its own regardless of what the `.tm-vb` rules said. `.tm-flat` is
the general "keep the 3D decorator off this button" marker; use it again
rather than adding one-off `:not()` clauses.

### 3 + 4. /bonuses/ page

- The chip moved into the `h1`. `tagChip()` (which returned markup for the
  question) is replaced by `setTitleTag(q)`, called from `renderQuestion`
  and cleared in `startSession` and `feedError`. It hides itself for traits
  outside `TAG_ABBR` instead of leaving a gap.
- `h1` became a flex row with `gap:11px` and `padding-right:36px` so a
  chip can never slide under the absolutely positioned hoop mark.
- The `PLAYER BONUS n / N` row is gone from the question card. The `.toprow`
  rule stays because `feedError` still uses it. The loading skeleton lost the
  12px bar that stood in for that row, so there is no jump on load.
- `PLAY THE GAME` is a third `.qx-btn` in the existing stack, amber face on
  the same 1px/13px/48px geometry as its siblings. The page-foot button and
  its `.foot` / `a.play-t82` rules are deleted.
- `STATS REFRESHER` -> `Stats Refresher`, arrow kept.

No exit is lost by removing the page-foot button: `showResult` removes `#qx`
after a vote, but the result actions already carry `BACK TO TRUE 82` to the
same `/?src=bonuses`.

### 5. Hot Hand (app.js) - and a bug the screenshot exposed

The mid-sim overlay's `the loss lands ->` button is gone, along with its
listener and the `.gone` toggle on pull. This costs nothing: it was a
**second door onto the same handler** as `I DON'T WANT YOUR CHARITY` - both
called `T82.declineHeat(G)` then `resolve(null)`. The only loss is the
`action:"skip"` analytics label; refusals now all land as
`heatcheck_declined / action:"decline"`. Worth knowing if you compare
decline rates across the v47.21 boundary.

**The reason it looked wrong was a specificity bug, not a layout choice.**
`.hh-skip` is (0,1,0); `button.presti-spin` is (0,1,1). The decorator was
overriding `position:absolute`, `background:none` and `color`, so a control
written as quiet grey text at the top right rendered as an amber 3D slab
floating mid-left. Measured on the v47.20 build: `position:relative`, 415px
from the top, 179px from the right. After adding `.hh-skip` to
`BTN3D_EXCLUDE`: `absolute`, 12px from top, 14px from right.

The **post-season** overlay keeps its `skip ->` button. Do not remove it: on
the non-clutch `hh-reveal` path there is no charity button, so it is the only
way out of the ceremony. It just needed the styling fix.

## Validation

Three real-Chromium harnesses under `/home/claude/harness`, extracting real
functions from the built `app.js` by brace matching and loading the real
`styles.css`. Total 213 checks, all green.

- `h1-widget.js` - 80 checks over 320/360/374/390/402/430: IDK ink vs box,
  the 4:4:1 ratio, YES/NO evenness, decorator immunity, dashed border, no
  shadow, no gradient, no lift on press, chip out of the question, chip flush
  right, lead row height, no horizontal overflow.
- `h2-bonuses.js` - 111 checks over the same widths against the real page
  with a stubbed feed: counter row gone, foot button gone, chip after the
  title text and clear of the mark, chip vertically centred, three-button
  stack, labels, amber face, flat border, plus a five-question walk proving
  the chip tracks the question (`SWCH-D -> CH#1 -> BPOUND -> GRAV -> hidden`).
- `h3-hothand.js` - 22 checks: overlay has exactly one child, gutters equal,
  z-index still 250, decline calls `declineHeat` once and resolves null,
  lever pull still lights the reel without recording a decline, post-season
  skip parked top-right and un-stamped.

### Harness notes for next time

Chromium is already on the box at `/opt/pw-browsers/chromium-1194` (the exact
build Playwright 1.56 wants). Run with `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`
and `executablePath:"/opt/google/chrome/chrome"`. Do **not** try
`npx playwright install` - the CDN is outside the network allowlist and it
fails after a long timeout.

Barlow Condensed / Barlow / IBM Plex Mono are not reachable either. Install
them from npm (`@fontsource/*`, which IS allowlisted) and serve the woff2
locally. **When standing in for the Google stylesheet, the `@font-face src`
must be an absolute URL** - a relative `/__fonts/` path in a sheet served
from `fonts.googleapis.com` resolves against Google, the faces silently fail,
and every measurement comes back in a fallback sans. That cost a full
diagnostic loop: the title looked like it was wrapping to two lines at every
width, and it was only the fallback face being wider. `h2-bonuses.js` now
asserts `document.fonts.check(...)` so it fails loudly instead of measuring
a lie.

## Measured effect

| width | widget module | /bonuses/ content bottom |
|-------|---------------|--------------------------|
| 320   | 320 -> 276 (-44) | 775 -> 698 (-77) |
| 360   | 304 -> 270 (-34) | 776 -> 698 (-78) |
| 374   | 304 -> 270 (-34) | 782 -> 703 (-79) |
| 390   | 278 -> 270 (-8)  | 778 -> 699 (-79) |
| 402   | 278 -> 270 (-8)  | 782 -> 703 (-79) |
| 430   | 278 -> 270 (-8)  | 793 -> 670 (-123) |

The widget saving is smallest at 390+ because the question already fit two
lines there; the float was costing a third line at 360-374, which is where
the big numbers come from.

## Left alone deliberately

`app.js:1775` still reads `STATS REFRESHER ↗` in caps. That is the
how-to-play rules sheet, a different surface at a different type scale, and
it was not part of the ask. One-line change if you want them matched.
