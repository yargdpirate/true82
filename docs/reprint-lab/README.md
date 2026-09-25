# TRUE 82 Reprint Lab

A design lab for the next look of TRUE 82: the homepage masthead printed on the site's risograph engine, and a full
system redesign (colors, buttons, cards, chips, type, textures, paper or night ground) shown on real snapshots of
every screen of the game. Built overnight 2026-09-24/25; moved onto the v51 style system 2026-09-25. Nothing here is
shipped; the owner picks looks, and a later version implements them.

- Open `reprint-lab.html` in a browser (one self-contained file, about 7.5 MB). On the branch preview:
  `https://c-code-clean.true82.pages.dev/docs/reprint-lab/reprint-lab`. A private Claude artifact copy exists too.
- The Tribune is not in the lab: it is being retired.

## How the owner uses it

Pick a preset (17 complete looks), flip through the screens along the top (Masthead, Every piece, Home, Draft, Presti,
The Daily, Season reel, Heat Check, Results, Ballot sheets, Bonuses, Info pages, 404), change any toggle, and use
"Compare with today" to flip the current screen back to the live site. Star looks, then "Copy all star codes". Each
code starts `T82-` and decodes (`LAB.decode(code)` in the lab's console) to the full recipe. Codes from before v51
still decode (settings the lab no longer has, like "Results tiles", are ignored).

## How it works (since v51)

The site itself has one enforced style system (`docs/STYLE-GUIDE.md`): `tools/theme-core.js` names about 40 color
roles and computes every shade from them, `styles.css` reads nothing but those tokens, and every screen is built from
shared pieces (`.t-btn`, `.t-chip`, `.t-card`, `.t-sheet`, `.t-toast`, `.t-head`). The lab uses exactly that:

1. **Snapshots.** Every screen and state is a frozen DOM capture of the v51 site (`capture/v51/`: the brief, the four
   state lists, `states.json`, `snap.js`, `labserver.py`), taken on a local copy with its API and D1. Canvases become
   images and keep their data (`#rrPrint[data-spec]`, the reel strips' `data-games`). 93 snapshots, inlined into
   `reprint-lab.html` as `window.LAB_SNAPS`; the raw files are not committed.
2. **The site's CSS, as it is.** The build inlines the repo's `styles.css`. "Today's site" sets nothing, so the
   snapshot is the live site; a look sets the tokens on the snapshot's `<html>`.
3. **Themes.** `src/system/00-theme.js` expands a palette's base colors into every site role (`LAB.roles`,
   `LAB.rolesFor(recipe)`) and hands them to the site's own `T82THEME.vars()`, which computes every shade and rgb twin
   with the site's recipes. Two roles follow the recipe: `win`/`loss` ("Wins and losses") and `print-paper` (the card
   the season print sits on). Palettes (`src/palettes/`, generated from `color/design.js` by `color/gen.js`) pass
   contrast checks.
4. **Components.** `src/system/10-controls.js` (buttons, chips, badges, inputs, links), `20-surfaces.js` (cards,
   frames, sheets, overlays, textures, the paper ground, the header band, display-face fitting), `50-neon.js` (how far
   the neon style spreads) and `60-depth.js` (button depth) are CSS generators switched by `data-btn`, `data-card`,
   `data-chip`, `data-corners`, `data-texture` and `data-ground` on `<html>`. Every family includes the v51 shared
   pieces, so a new mode built from them is restyled here by construction. `65-heads.js` switches the section headers.
5. **Riso canvases.** `src/system/30-reprint.js` reprints THE SHAPE OF A SEASON and the reel's month strips with the
   site's real engines (the repo's `results-riso.js` and `reel-riso.js`, inlined, never copied), reading the look's
   tokens from the snapshot: `T82PRINT.print(spec, { root })`, `T82RISO.strip({ root, games, ... })`. The reel's loss
   moment (the flying ink, the giant L) is re-inked pixel by pixel.
6. **The masthead.** `src/engine.js` is the riso compositor (any Riso ink, any paper stock including dark screen-print
   stock, halftone screens, grain, starvation, misregistration). `src/banner.js` composes the wordmark, depth, icon
   concept (`src/concepts/`), layout and additions into plates.

## Settings added for v51 (console, "Site system")

- **Wins and losses**: Look pair (the look's accent wins, its second ink loses: Heat Vice is pink wins, aqua losses),
  Red losses (the look's win, losses in a glowing red), Gold and red (today's). Coins, rings, the giant L, the season
  strip and the reel's streak line all follow. Gold Press uses Gold and red.
- **Button depth**: Flat, Stacked (two slabs under the face, the button's own ink then the palette's second ink, like
  the masthead's stack depth; secondaries swap them; the button sinks in when pressed), Keycap (one solid slab). For the
  styles that draw a flat button (neon, pill, stamp, ticket). Heat Vice uses Stacked.
- **Section headers**: As built, or one of the six `.t-head` variants everywhere (Eyebrow, Rule, Bar, Title, Banner,
  Tab), the same as `?heads=` on the site.
- Retired: "Results tiles". Since v51 the results tiles, the tag sheet and the reel card are ordinary cards and sheets,
  so they follow "Cards" like everything else. Neon amount "Max" puts a glowing edge on every card.

## Design calls the lab makes that differ from today's site

- Trait tags and YES votes print in the palette's sunflower ("yes") in every themed look; today's site uses its
  accent gold, which is nearly the same color.
- Inside a paper card, text in the accent, hot, good, bad and "you" colors is deepened to at least 4.5:1 (3:1 for
  "you"), and buttons, chips and badges keep their true faces (owner's call: a button looks the same on every surface).
- No paper-only control rules (owner's call, 2026-09-25): a button looks the same on every surface. Only see-through
  controls (outline labels, chip text, fields) follow a light surface, to stay readable.
- "Neon amount" (Accents / More / Max, `src/system/50-neon.js`) spreads the Neon button style: More lights every
  button, with secondaries in the palette's second neon (Vice: aqua); Max also lights chips, rows, pills, card
  edges, meters and headings. Heat Vice uses More.
- The hot pick is fire gold in every look, and since v51 on the site too (owner's call, 2026-09-25).

## Shipping a look (the plan for the implementing version)

1. Colors: copy the look's roles into `ROLES` in `tools/theme-core.js` (`LAB.rolesFor(LAB.recipe(LAB.decode(code)))` in the lab's
   console prints them), run `node tools/theme.js`, then `node test.js`.
2. Components: write the chosen button, card and chip styles (`LAB.componentCSS(recipe)`) into styles.css as static
   rules on the shared pieces, keeping the style law (tokens only; `node tools/style-law.js`).
3. The masthead: export the print (`LAB.image(recipe, 300, 2)` at 2x and 3x) as `logo.png` / `logo@3x.png`, or port
   `banner.js` + the chosen concept to the site like `results-riso.js` was.
4. The riso canvases already read the theme: nothing to do.

## Rebuilding the lab

1. Capture (only when the site changed): start the local site (`wrangler pages dev` with D1 on :8789) and
   `capture/v51/labserver.py <port>` (a static server with a POST sink; `snap.js` posts to :8095 unless
   `window.T82SNAP_LAB` says otherwise), then follow `capture/v51/BRIEF.md` with the four group lists.
2. Dev: serve a folder holding `lab/src` (this `src/`) and `snaps/` with `labserver.py`, and open
   `lab/src/dev/lab.html`; it loads the site's theme and engines from `window.LAB_SITE_BASE` (default
   `http://localhost:8789/`), and each snapshot's `<base>` points there too, so the working tree's styles.css applies.
3. Build: `node src/build.js <snaps dir> [out dir]` writes `reprint-lab.html` (the repo copy, into this folder by
   default) and `reprint-lab.artifact.html` (body only, for the Artifact publish). It converts the frozen season
   prints to JPEG with macOS `sips`.

`README-agents.md` is the brief the original build agents worked from, and `audit/` the v50 color audit the v51
tokenization started from; both are history. The halftone pipeline follows sevenevesai/riso-windowseat (MIT); the
notice is in `results-riso.js` and `reel-riso.js` in the repo root.
