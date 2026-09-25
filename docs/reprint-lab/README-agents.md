# TRUE 82 Reprint Lab: agent brief

The owner of TRUE 82 (an NBA draft browser game, true82.net) asked for an overnight, all-out redesign
LAB: a page full of toggles where he can play with (1) the homepage masthead/banner, printed with the
site's risograph engine, and (2) a full system redesign (colors, buttons, cards, chips, type, every basic
element) shown on EVERY real screen of the game. He wants WOW: jaw-dropping, matching the vibe of the
new v50 riso results page (cream paper, navy key ink, fluorescent pink offsets, sunflower, riso blue,
halftone dots, misregistration). He named palettes he wants: "Miami Heat Vice", "Spurs Fiesta", "etc etc".
The Tribune (newspaper recap) is being killed: never design for it.

The owner cannot code, judges screenshots on his phone, and follows Krug's "Don't Make Me Think":
no legends, one meaning per color, remove clutter when in doubt. Lab copy: plain words, no em-dashes.

## Where things are

Scratchpad root (SP): /private/tmp/claude-501/-Users-ggz-true82/e9c38d0a-5a5c-4f39-bde5-b87ab002875b/scratchpad
- lab/src/engine.js      RISO: the riso compositor (swatch book RISO.SWATCH, paper stocks RISO.STOCKS, plates, halftone, compose)
- lab/src/banner.js      LAB: registries + the masthead composer (read its header comment: roles, concept contract)
- lab/src/fonts.js, layouts.js, additions.js   registries for the masthead
- lab/src/palettes/*.js  palettes (LAB.palette)
- lab/src/concepts/*.js  icon concepts (LAB.concept); 00-hoop.js is the reference implementation
- lab/src/system/00-theme.js       palette sys -> every color role (--t-<role>) + system options (LAB.SYS)
- lab/src/system/01-components.js  the component-layer registry (LAB.component) + paper texture
- lab/src/app/*          the lab UI (console.js, pages.js, views.js, lab.css). Owned by the lead; don't edit unless told.
- lab/src/tokenize.js + lab/src/build-css.js   the tokenizer (site CSS literals -> var(--t-role, literal))
- lab/build/site.tok.css the tokenized styles.css. lab/build/role-entries.json the role map.
- lab/SPEC-roles.md      the role vocabulary and component families. READ IT.
- audit/*.json           the color/component audit of the real site (selectors per family are in "components")
- snaps/*.html           raw DOM snapshots of every real screen; snaps/tok/*.html the tokenized ones the lab shows
- The real site repo is /Users/ggz/true82 (READ ONLY for you; never edit, never git anything).

## Servers (already running; do not start or stop servers)
- http://localhost:8091/  serves SP (the lab). POST /snap/<path> saves a file under SP/snaps/<path>.
- http://localhost:8788/  the real site running locally with its API and a local database (harmless to use).
- Never open true82.net or any *.pages.dev URL.

## Dev pages (open in YOUR OWN browser tab)
Use the built-in browser tools (mcp__Claude_Browser__*). Other agents share the browser pane:
FIRST call mcp__Claude_Browser__tabs_create and pass your tabId to EVERY call. Never touch other tabs.
Prefer screenshots at scale 0.5-0.8 to save context; use javascript_tool for checks.
- Lab:  http://localhost:8091/lab/src/dev/lab.html  (state in localStorage: t82lab-rc = recipe JSON, t82lab-view = view id)
  Set a recipe + view, then reload:  localStorage.setItem('t82lab-rc', JSON.stringify({...})); localStorage.setItem('t82lab-view', '"results"'); location.reload()
  The phone preview is an iframe in #stage; you can reach its document with document.querySelector('#stage iframe').contentDocument
  Views: masthead, kit, home, draft, presti, daily, reel, heat, results, ballot, bonuses, info, e404 (see lab/src/app/views.js for states)
- Grid of masthead prints:  http://localhost:8091/lab/src/dev/grid.html
    ?concept=<id>                    a concept across icon styles x palettes
    ?vary=<recipeKey>&vals=a,b,c     one row varying a key; &base=<urlencoded JSON recipe>; &cols=3&w=330
    window.GRID_DONE becomes true when every print is done. Errors print under the grid.
- Files load fresh on every reload (no build step in dev). New files in palettes/, concepts/, system/ are picked up automatically
  (loaded in alphabetical order after the core files).

## The recipe
LAB.DEFAULT (banner.js + system/00-theme.js) lists every key. Masthead keys: palette, stock, darkMode, layout, font, font82, ink82,
word, track, shape, lines, wordTex, depth, depthDist, depthAng, concept, iconStyle, iconDepth, iconScale, backdrop, adds, tagline,
reg, regDir, pitch, grain, starve, texture, screen, motion, seed. System keys: sysPalette ("match" | "today"), ground ("night" | "day"),
btn, card, chip, corners, texture, disp, body, mono.

## House rules
- Plain JavaScript (ES5 style like the existing files), no libraries, no build tools, no network except Google Fonts.
- No em-dashes in any copy you write. Plain words.
- Colors in system CSS come ONLY from var(--t-<role>) (optionally through color-mix). Never hard-code a hex in component CSS.
- Everything must work at phone width (390px) first.
- Stay inside your file ownership. If you need a change in a file you don't own, describe it in your final report instead.
- Verify visually before you finish: look at your work in the lab or the grid, in several palettes, and fix what looks wrong.
- Your final message is a report for the lead: what you built (ids, names), what you verified, known issues, and any requests.

## Browser quirks (learned by earlier agents; save yourself the time)
- The pane allows only about 9 tabs in total. Create ONE tab, reuse it for everything, and close it (tabs_close) when you finish.
  If tabs_create fails with "tab cap reached", wait ~60s (javascript sleep is not available; do other work first) and retry.
- Coordinate clicks are unreliable with several agents in the pane (they land at the wrong scale). Click through the page instead:
  javascript_tool: document.querySelector('...').click()
- Screenshots of a background tab can come back blank once the page is scrolled. Check scrolled states through the page itself,
  or temporarily translate content up with a CSS transform, look, then remove it.
- The lab's phone preview is an iframe: to inspect it, use document.querySelector('#stage iframe').contentDocument.
- An earlier attempt at this work was interrupted after a few minutes. If files you own already exist, review them and continue from them.

## More dev pages (added after the first build round)
- Contact sheet of real screens for any recipes (does not touch the lab's localStorage):
  http://localhost:8091/lab/src/dev/sheet.html?snap=home-intro,classic-round1,results-top&base=<urlencoded JSON recipe>&vary=<key>&vals=a,b&s=0.5&h=844
  (s = scale, h = phone height, optional vary2/vals2, y = scroll). window.H_DONE turns true when every phone is themed.
- Built single-file lab (what the owner will open): http://localhost:8091/lab/dist/reprint-lab.html (rebuild: cd lab/src && node build.js)
- Tokenization check: http://localhost:8091/lab/src/dev/verify.html ; kit rebuild: http://localhost:8091/lab/src/dev/kit-build.html?save=1&check=1
- Palettes are GENERATED: edit SP/color/design.js, then run `node SP/color/gen.js --write` (it rewrites lab/src/palettes/*.js and prints the contrast checks). Palette overview: http://localhost:8091/color/overview.html

## File owners after round 1 (for fix requests)
palettes: color/design.js -> lab/src/palettes/*.js | controls (buttons, chips, badges, inputs, links): lab/src/system/10-controls.js |
surfaces (cards, frames, sheets, overlays, textures, paper ground, header, display-face fit): lab/src/system/20-surfaces.js |
reprint (results print, reel strips, riso paper): lab/src/system/30-reprint.js + lab/src/vendor/* | theme roles: lab/src/system/00-theme.js |
masthead engine (type, depth, layouts, additions, fonts): lab/src/banner.js, layouts.js, additions.js, fonts.js, engine.js | icons: lab/src/concepts/* |
tokenizer and role map: lab/src/tokenize.js, build-css.js, role-fixes.json (then rerun build-css + dev/tokenize.html + kit-build) | lab UI: lab/src/app/* (lead only).
