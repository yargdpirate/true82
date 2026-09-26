# TRUE 82 style guide

One theme, one set of shared pieces, enforced. Every screen draws from them, so a new mode is styled by construction and a look from the Reprint Lab restyles all of it at once.

- See every piece live: open `docs/style-guide.html` (on the branch preview: `/docs/style-guide.html`).
- The rules are checked by `node test.js` (and `node tools/style-law.js` for a readable report).
- Adding a mode? Jump to [Adding a mode](#adding-a-mode).

## The law

1. **Colors and fonts are written in one place**: the theme block at the top of `styles.css`. It is generated from `tools/theme-core.js` by `node tools/theme.js`; never hand-edit it (the test fails if it drifts).
2. **Everywhere else a color is a token.** Opaque: `var(--t-accent)`. See-through: `rgb(var(--t-accent-rgb) / .3)`. No hex, `rgb()`, `hsl()`, named colors or `color-mix()` (older phones cannot read `color-mix`, so the theme computes every shade ahead of time).
3. **A font is a token**: `var(--t-disp)` (numbers, titles, buttons), `var(--t-body)` (running text), `var(--t-mono)` (data, labels). `var(--t-serif)` belongs to the retiring Tribune.
4. **Canvas code reads the theme** with `getComputedStyle(document.documentElement).getPropertyValue("--t-...")` (see `readTheme` in `results-riso.js`). The only literal it may use is pure black as a coverage mask.
5. Pages (`bonuses/`, the info pages) load `/styles.css` and follow the same law in their `<style>` blocks and `style=""` attributes. Browser chrome (`<meta name="theme-color">`, the favicon) is exempt.

A finding always names the nearest token. `node tools/stylefix.js <file> --write` applies those suggestions to a CSS file or a page.

## Tokens

### Roles (what a look sets)

| Role | Today | Meaning |
|---|---|---|
| `ground`, `ground-2`, `ground-3` | ink, tunnel, well | the page, panels and cards, wells and pressed rows |
| `overlay` | near black | scrims behind sheets and overlays |
| `line` / `rule` | hairline / bronze | borders on the ground / bronze rules (header, tickets, fields) |
| `text`, `text-2`, `label` | chalk, dim, bronze | primary text, secondary text, small caps labels |
| `accent`, `accent-hi`, `accent-edge`, `accent-ink` | gold family | the main action and the brand: face, highlight, keycap edge, text on it |
| `metal` | bronze | ornament: frames, pips, rails |
| `bad`, `bad-edge`, `bad-ink` | vivid red | NO, a bad trait, danger |
| `hot` | fire gold | a gain: the hot pick, bonuses, the Heat Check boost, the fire sale. Never red: red means bad (the owner's rule) |
| `good` | mint | good news, money coming in |
| `you` | riso blue | your vote, your marker |
| `offset` | fluorescent pink | the second ink: misregistered offsets |
| `sun`, `sun-edge`, `sun-ink` | sunflower | the paper world's yes |
| `win`, `loss` | sunflower, red | a win and a loss: reel coins, the season strip |
| `print-paper`, `print-key`, `print-pop`, `print-sun`, `print-dusk`, `print-night` | card color, blue, pink, sunflower, orange, teal | the season print's stock and inks |
| `paper`, `paper-2`, `ink`, `ink-2`, `line-paper` | cream, navy | light paper and its inks (the Tribune, paper looks) |
| `shadow`, `light` | black, white | drop shadows, highlights |

### Named shades (recipes over the roles)

`accent-face` (keycap face), `accent-glow` (focus rings, hot meter steps), `good-soft` / `bad-soft` (good and bad as calm text), `good-top/face/edge/ink` and `bad-top/face` (the green and red keycaps), `bad-hi` (money going out), `warn` (money running low), `hot-hi`, `hot-glow`, `text-3` (disabled), `off-face/edge/ink` (a disabled keycap), `overlay-warm` (the Heat Check), `metal-deep`, `metal-dark`, and the Tribune's `news-ink`, `news-ink-2`, `news-red`.

A shade is `[name, role, percent, partner]` in `SHADES` in `tools/theme-core.js`: the role mixed with its partner, computed ahead of time. Need a shade the theme lacks? Add a recipe there, run `node tools/theme.js`, use the new token.

### Type, shape, effects

- Fonts: `--t-disp`, `--t-body`, `--t-mono`.
- Type scale: `--t-fs-hero` (64, the record), `--t-fs-num` (40, a card's hero number), `--t-fs-title` (27), `--t-fs-head` (17), `--t-fs-name` (17), `--t-fs-body` (16), `--t-fs-small` (13), `--t-fs-data` (12), `--t-fs-label` (10.5).
- Corners: `--t-r-btn`, `--t-r-card`, `--t-r-chip`.
- The season print: `--t-print-blend` (`screen`: inks glow on a dark stock; `multiply`: ink on paper), `--t-print-filter`.
- Fixed effects that never theme: `--fx-fire-*` (fire is fire) and `--fx-mask`. Since v53 the ball in the dunk (the Daily gate, the Heat Check) is neon tubes in the look's own inks (`--t-accent` ball, `--t-offset` rim and net, `--t-hot` once it catches fire); `--fx-ball*` stays only for the Reprint Lab's frozen snapshots.
- Old names (`--amber`, `--chalk`, `--ink` ...) still work and read the roles, so older code themes too. New code uses `--t-*`.

## Shared pieces

Markup for each is on `docs/style-guide.html`.

| Piece | Markup | Notes |
|---|---|---|
| Button | `<button class="t-btn">Play</button>` | the extruded keycap. `data-kind="yes"` (same gold), `"no"` (red keycap), `"good"` (green keycap), `"quiet"` (outline), `"text"` (underlined link button). `data-size="lg"` for a big vote key, `"sm"` for a small one. Any plain `<button>` on the game screens already gets the keycap (app.js decorates them). |
| Chip | `<span class="t-chip">3PT</span>` | the gold slab. `data-tone="bad"` red, `"plain"` outline, `"on"` filled accent. `data-size="lg"` for tags you tap to vote (the raised keycap); `data-size="sm"` is the flat small chip for read-only tags in dense lists (the draft pool, the label legend): same tones, no keycap edge, never sinks when tapped open. States: `.is-q` ("?" badge), `.is-off` (hollow), `.is-mine` (your ring). `.t-chip-add` is the dashed "+". Wrap a row in `.t-chips`. |
| Card | `<div class="t-card">…</div>` | a panel on the ground. `data-tone="feature"` adds the bronze rule and the metal top edge (a hero card). |
| Sheet | `.t-backdrop` + `.t-sheet` (add `.on` to open), `.t-grab` handle | slides up from the bottom. |
| Toast | `<div class="t-toast" role="status">` (add `.on`) | |
| Section header | `head("results", "Your five")` in app.js, or `<h2 class="t-head" data-head="eyebrow">` | see below |
| Type | `.t-num` (hero number), `.t-title`, `.t-name`, `.t-meta`, `.t-data`, `.t-label`, `.t-body`, `.t-small` | sizes come from the type scale |
| Mode root | `<section class="t-mode">` | plain `h2`, `h3`, `p`, `small`, `a`, `hr`, `table`, `input`, `select` inside it look right before anything is styled |

### Section headers (division headers)

One component, `.t-head`, with six variants chosen by one attribute: `eyebrow` (small caps label), `rule` (label with a hairline to the edge), `bar` (display face with an accent bar), `title` (big display title in the accent), `banner` (a gold band), `tab` (a folder tab on the card below).

In app.js, `head(context, text, options)` builds it, and `HEADS` names each context's variant in one place:

```js
var HEADS = { home: "eyebrow", poll: "eyebrow", rules: "eyebrow", reel: "eyebrow", results: "eyebrow", sheet: "title", group: "eyebrow" };
head("results", "Your five")                       // <h2 class="t-head" data-head="eyebrow">Your five</h2>
head("group", "Offense", { tag: "h3", cls: "bt-grp" })
head("poll", "<a href=...>HELP BALANCE THE GAME</a>", { html: true })
```

Restyle every results header at once by changing `HEADS.results`. A new mode adds its own line (`dunk: "bar"`). For a quick look at a variant everywhere, add `?heads=banner` to the URL. The Reprint Lab has the same switch.

## Adding a mode

1. **Root**: render the mode into `#app` inside `<section class="t-mode">`.
2. **Build from the pieces**: `.t-card` panels, `head("yourmode", ...)` headers (add a `HEADS` line), `.t-btn` actions, `.t-chip` tags, `.t-num` for the big number, `.t-sheet` for any pop-up, `.t-toast` for confirmations.
3. **No colors or fonts of your own.** If the mode needs a color with a new meaning, add a role or a shade in `tools/theme-core.js` (with a one-line meaning), run `node tools/theme.js`, and use the token. The Reprint Lab picks it up at once (it applies looks with the same file; a role a look does not set keeps today's value); to have every look set its own, derive it in `LAB.baseRoles` in `docs/reprint-lab/src/system/00-theme.js`.
4. **Grafting code from elsewhere?** Run `node tools/stylefix.js mode.css --write` (or the page), then `node tools/style-law.js`. For JavaScript, move inline styles into classes and read tokens in canvas code.
5. **Check**: `node test.js` must pass. Look at the mode at phone width (375 to 390px) and on a desktop.
6. **Cache keys**: bump `styles.css?v=` (and your script's) in `index.html`.

## The shipped look (look.css)

Since v52 the site wears a Reprint Lab look (Heat Vice). Two things carry it, both generated by
`docs/reprint-lab/src/ship-look.js`: the look's roles, fonts and corners in `tools/theme-core.js`, and `look.css`,
the look's component layer (neon buttons on a stacked base, outline cards, ink chips), switched by the attributes
on every page's `<html>` (`data-btn="neon" data-card="outline" data-chip="ink" data-corners="round"
data-texture="none" data-ground="night"`). `look.css` is the one generated file allowed literals and `color-mix()`;
never edit it by hand. Every page loads it right after `styles.css` and carries the same `<html>` attributes. A new
mode still builds only from the shared pieces and tokens, so it wears the look with no extra work.

## Changing the look

- One color: edit its role in `ROLES` (or a shade's recipe) in `tools/theme-core.js`, run `node tools/theme.js`, then `node test.js`.
- A whole look from the Reprint Lab: the lab applies looks with the same `tools/theme-core.js`, so shipping one means copying its roles into `ROLES` and running `node tools/theme.js` (the lab README has the steps).
