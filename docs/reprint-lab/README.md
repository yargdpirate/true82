# TRUE 82 Reprint Lab

A design lab for the next look of TRUE 82: the homepage masthead printed on the site's risograph engine, and a full
system redesign (colors, buttons, cards, chips, type, textures, paper or night ground) shown on real snapshots of
every screen of the game. Built overnight 2026-09-24/25. Nothing here is shipped; the owner picks looks, and a later
version implements them.

- Open `reprint-lab.html` in a browser (it is one self-contained file, about 7 MB). On the branch preview:
  `https://c-code-clean.true82.pages.dev/docs/reprint-lab/reprint-lab.html`. A private Claude artifact copy exists too.
- The Tribune is not in the lab: it is being retired.

## How the owner uses it

Pick a preset (17 complete looks), flip through the screens along the top (Masthead, Every piece, Home, Draft, Presti,
The Daily, Season reel, Heat Check, Results, Ballot sheets, Bonuses, Info pages, 404), change any toggle, and use
"Compare with today" to flip the current screen back to the live site. Star looks, then "Copy all star codes". Each
code starts `T82-` and decodes (`LAB.decode(code)` in the lab's console) to the full recipe.

## How it works

1. **Snapshots.** Every screen and state was captured from a local copy of the site with its real API and a local D1
   (`wrangler pages dev` + migrations 0010-0027), using `capture/snap.js` (serializes the live DOM, turns canvases into
   images) and `capture/labserver.py` (a static server with a POST sink). 99 snapshots.
2. **Tokenized CSS.** Every color literal in `styles.css`, in the JS-injected style blocks and in the Bonuses page was
   audited into a role (`audit/*.json`, vocabulary in `SPEC-roles.md`) and rewritten by `src/tokenize.js` as
   `var(--t-<role>, <literal>)` (alphas through `color-mix`). With no theme the pages are identical to today
   (`src/dev/verify.html` proves it: 0 identity mismatches, 0 missed colors across 99 snapshots).
   `build/site.tok.css` is the tokenized `styles.css`; `build/role-report.md` lists every role.
3. **Themes.** `src/system/00-theme.js` expands a palette's base colors into every role for a night ground or a paper
   (day) ground. Palettes (`src/palettes/`, generated from `color/design.js` by `color/gen.js`) pass contrast checks.
4. **Components.** `src/system/10-controls.js` (buttons, chips, badges, inputs, links) and `20-surfaces.js` (cards,
   frames, sheets, overlays, textures, the paper ground, the header band, display-face fitting) are CSS generators
   switched by `data-btn`, `data-card`, `data-chip`, `data-corners`, `data-texture` and `data-ground` on `<html>`.
5. **Riso canvases.** `src/system/30-reprint.js` reprints the results print and the reel strips in the palette's inks
   with lab copies of `results-riso.js` / `reel-riso.js` (`src/vendor/`).
6. **The masthead.** `src/engine.js` is the riso compositor (grown from `results-riso.js`: any Riso ink, any paper
   stock including dark screen-print stock, halftone screens, grain, starvation, misregistration). `src/banner.js`
   composes the wordmark, depth, icon concept (`src/concepts/`), layout and additions into plates.

## Shipping a look (the plan for the implementing version)

1. Replace `styles.css` with the tokenized one (identical rendering by construction), plus the chosen theme's
   `--t-*` values in one `:root` block, plus the component CSS the lab generates for the chosen button, card and chip
   styles (`LAB.componentCSS(recipe)`), written out as static CSS.
2. The masthead: export the print (`LAB.image(recipe, 300, 2)` at 2x and 3x) as `logo.png` / `logo@3x.png`, or port
   `banner.js` + the chosen concept to the site like `results-riso.js` was.
3. Point `results-riso.js` / `reel-riso.js` at the palette's inks (the lab's vendor copies show the hook).
4. Canvas-drawn colors in `app.js` and the fixed fire effects stay as they are (listed in `build/role-report.md`).

## Rebuilding the lab

The dev pages (`src/dev/lab.html`, `grid.html`, `sheet.html`, `board.html`, `verify.html`, `tokenize.html`,
`kit-build.html`) expect the scratch layout the lab was built in: the sources under `lab/src/`, raw snapshots under
`snaps/`, tokenized ones under `snaps/tok/`, the lab server on :8091 and the site on :8788. `node src/build.js`
writes the single file. The snapshots themselves are not committed (they are inside `reprint-lab.html` as
`window.LAB_SNAPS`; recapture with `capture/snap.js` if the site changes). `src/build.js` and `src/build-css.js`
read `/Users/ggz/true82/styles.css` and `logo.png` by absolute path. `README-agents.md` is the brief the build agents
worked from.

The halftone pipeline follows sevenevesai/riso-windowseat (MIT); the notice is in `results-riso.js` and
`reel-riso.js` in the repo root and in `src/vendor/`.
