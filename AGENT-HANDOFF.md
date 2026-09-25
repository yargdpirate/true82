# TRUE 82 — CURRENT AGENT HANDOFF

**Current source of truth:** the GitHub repo. The v48 through v51.1 work lives on branch `c-code-clean` until it is merged to `main`.

**Date:** 2026-09-25
**Build:** `v51.1`, committed and pushed on branch `c-code-clean` (`BUILD_V = "v51.1"`, cache keys `20260925-fixes-v51-1`). Commits: `e857b6a` v51 (the style system), `0f49b40` v51.1 (the fix batch). main and true82.net are untouched: main auto-deploys, so never push to it without the owner. Branch preview: https://c-code-clean.true82.pages.dev/. There is no v49 on this line: v49.x numbers belong to the `accounts-test` fork.
**Most recent change:** v51.1 fixes and the Reprint Lab moved onto the v51 system. See section 00000 first.

Read this file before editing. It summarizes the current architecture, the recent UI work, the exact Small-Ball rule, deployment structure, and validation expectations.

---

## 00000. V51 + V51.1: one enforced style system, the fix batch, the lab on v51 (2026-09-25)

The owner's request (section 0000, "Next: one enforced global style guide", plus a follow-up): force every
screen onto one style guide so new experimental modes are styled by construction ("my grafts didn't get the
style upgrades"), bring the grafted screens (game by game, results, the crowdsourced-data pop-up) onto it,
add switchable section headers, add a white roster overlay to the final results picture, update the lab to
match, and (in the lab's Heat Vice look, the owner's saved star) keep the stacked two-shade pink/aqua look but
give the buttons dimensionality and clickability. Read `docs/STYLE-GUIDE.md` for the system itself.

Two sessions did it: the morning one built v51 (site side) and ran out of context mid-recapture; the afternoon
one (this handoff) committed v51, fixed everything the recapture found (v51.1), and moved the Reprint Lab onto
the system.

### State at the end of the afternoon session
- v51 and v51.1 are committed and pushed (see Build above). `node test.js`: 66 passed. `node tools/style-law.js`:
  clean. `node tools/theme.js --check`: current.
- The Reprint Lab update: see "The Reprint Lab on v51" below for what is done, committed and published.
- Nothing is deployed to true82.net. Shipping v51.1 to main is the owner's call (ask; main auto-deploys).
- Local dev state (all in /private/tmp, wiped on reboot): the site with its API and D1 runs on :8789 (wrangler,
  started by the morning session: config `site-api` in `.claude/launch.json`, D1 state in
  `/private/tmp/claude-501/-Users-ggz-true82/7bd49d09-c078-4440-bffe-c363402fa23d/scratchpad/state`); the lab
  server on :8095 (config `lab3`, serving
  `/private/tmp/claude-501/-Users-ggz-true82/72399d8d-bfbd-4b1e-8e3b-148f56ea2326/scratchpad`, which holds
  `lab/src` (a symlink to the repo's `docs/reprint-lab/src`), `snaps/` (the v51.1 captures), `snaps-v51/` (the
  v51 captures), `dist/` (builds), `qa/` (board renders; `qa/boards.js` renders the lab's look boards to PNG with
  the Playwright copy in /Users/ggz/tennis-puzzle-prototypes/backdrop-studio/node_modules)). The app allows five
  dev servers per folder; the morning session's four still count, so a new server needs one of them stopped.

### Owner decisions (2026-09-25, asked at the start of the afternoon session)
1. Commit and push v51 to `c-code-clean`: yes (done).
2. The results page, the season reel and the tag sheet stay dark site cards in today's colors (no cream paper).
3. Reel pacing stays on the realized record (exactly 16.8s every season), not the pre-season net.
4. Heat Vice in the lab: pink wins and aqua losses by default, with a toggle for red losses or gold and red.
5. `hot` is fire gold, not red (red means NO, taxes, bad traits; hot is a gain). Today's value `#FFD54A` (the
   fire-halo gold: ΔE00 10.7 from the accent gold, 20 from the warn orange, 43 from the bad red). FIRE SALE now
   flashes fire gold too, so the owner-authored Presti rules line reads "FIRE SALE (fire gold)".
6. One spelling of the trait codes everywhere, the results ballot's (`BALLOT_TRAITS[].chip`: GRAVITY, RIM-P,
   SWITCH, CLUTCH, TITLE #1, BALL-STOP, BALL-POUND, FOUL-MERCH, STAT-PAD, KNUCK...). The draft pool, its legend,
   the homepage card and Bonuses all read them; test.js pins app.js and the Bonuses page's own copy.
7. Flatter chips in dense lists: `.t-chip[data-size="sm"]` (flat, same tones) for the draft pool and the legend;
   the raised keycap stays on buttons and on the results tags you tap to vote.

### What v51.1 changed (the fix list the v51 recapture found; all verified at 390px)
Results: START OVER and FEATURE REQUESTS are the same small `.t-btn`; the season print's roster has bigger slot
letters (sun ink) and 'yy years on a dark keyline (screen and poster); the "+" wraps with the last tag
(`.bt-tail`); a negative value is `--t-bad-soft`; no comp phrase under 61 wins (`resultsCompHtml`, pure and
pinned; the share text is untouched); the GOAT Climb marker rides the realized record (`climbHtml`); after a
post-season save the comp line and the hot pick's name follow. Ballot: the question highlights only the trait
words (the article is tied by a no-break space); the toast keeps the chip's casing; Add-a-tag group margins.
Home and Daily: the poll's Share Vote bar hides when done (`[hidden]` rule); IDK is tappable with a visible border;
the stale-link note and footer legal text sizes; the played plaque's RUN IT BACK is the quiet button and
COPIED! holds the width; the gate's BACK is bare text (`.gate-back` in `BTN3D_EXCLUDE`); the Daily HOW TO PLAY
copy is true on every board (prices only on Presti boards, the rule sits "above"). Draft: search placeholder,
themed clear button, an empty-search message, the MORE PLAYERS cue hides when the pool is empty or the legend is
open (`syncPoolCue`); the legend is two columns and names only the engine codes it lists; REFUND and FIRE SALE
flashes centered in the display face; STATS REFRESHER is a quiet `.t-btn`; money reads "$16M" everywhere (the
thin space in `mHtml` is gone); `has-pick` clears when the draft ends. Heat Check: I DON'T WANT YOUR CHARITY is
the outline button (`.hh-charity` in `BTN3D_EXCLUDE`); solid scrims; the print waits until overlays close; the
stamp wraps as "NAME / CATCHES FIRE"; the meter's empty slots are wells and the result segment lights; the name
strip lands exactly on the chosen name. Reel: the loss caption sits on a plate of the card's stock; the finale
ledger's scrollbar is themed. Info pages and 404: the logo is centered. Quiet buttons draw their border in
`--t-rule` (it vanished on cards in `--t-line`). Bonuses: the codes, the bad-trait title chip, the question in
the shared `.t-title` voice, COPIED keeps its size, the vote-failed message sits under the buttons, votes go out
1.3s apart and retry `rate_limited`, a lone vote reads "first vote", the haptic switch survives a slow vote.
Routes: `/bonuses/*` is in `_routes.json`, and `functions/bonuses/[slug].js` hands non-slugs back to the static
site (`context.next()`), so question share links work.

Not fixed (next session or the owner):
- C29, partly: the reel's giant L still lands over earlier months when the losing row is near the card's bottom
  (it prefers empty space below; a full fix needs a layout change).
- The Scoring Card rows (Hot Hand bonus, taxes) still use em-dashes (the copy law only covers the ballot and reel).
- The homepage question "Was 2008 Kobe an elite wing defender?" carries the ISO-D tag (a D1 data mapping).
- In percent mode with zero yes/no votes (only if the D1 vote minimum is set to 0) the big number reads "100% NO".
- The 404 and homepage `<title>`s use em-dashes.
- Migrations 0026 and 0027 still need applying with the next deploy (section 000).

### The Reprint Lab on v51 (afternoon session)
The lab (docs/reprint-lab, read its README) is now built on the site's own system instead of copies:
- Themes: `src/system/00-theme.js` loads the repo's `tools/theme-core.js` (window.T82THEME). `LAB.baseRoles`
  expands a palette into every site role (the palette's `line` is the site's `rule`; `hair` or `ground-3` is
  `line`; `label` is metal lifted to 4.5:1; `hot` is the palette's sun), `LAB.drum` maps the season print's
  inks, `LAB.rolesFor(recipe)` adds the recipe's win/loss and `print-paper` (the card the print sits on), and
  `LAB.themeVars` returns `T82THEME.vars()` (every shade and rgb twin) plus fonts and radii. Gold Standard is
  today's site exactly; "Today's site" sets nothing.
- Site CSS: the build inlines the repo's styles.css as it is. The tokenizer, site.tok.css, role-fixes and the
  verify/tokenize/kit-build dev pages are retired; the "Every piece" view is a snapshot of docs/style-guide.html.
- Canvases: `src/system/30-reprint.js` reprints the results print (`T82PRINT.print(spec, { root })` from
  `#rrPrint[data-spec]`, roster included) and the reel's month strips (`T82RISO.strip` from `data-games`) with
  the repo's own results-riso.js and reel-riso.js (the `src/vendor/` copies are gone), and re-inks the frozen
  loss-effect layer pixel by pixel (screen or multiply, the look's stock). A mid-reveal print is reprinted
  finished.
- Components: `10-controls.js` families include every `.t-btn` kind (a new `good` family too) and `.t-chip`
  tone, and feed the site's `--chip-*` from the lab's chip families; `20-surfaces.js` treats the results tiles,
  the reel card, `.t-card`, `.t-sheet` and `.t-toast` as ordinary cards, sheets and toasts in every card style;
  inside a paper card the whole token set is recomputed (`paperVars`: text in accent, hot, good, bad and you is
  deepened to 4.5:1, while buttons, chips and badges keep their true faces). "Results tiles" (40-slips.js) is
  retired; old recipe codes still decode.
- New settings (console "Site system"): Button depth (Flat / Stacked / Keycap, `60-depth.js`: Stacked stands a
  flat-style button on two slabs, its own ink then the palette's second ink, swapped on secondaries, and it
  sinks in on press); Wins and losses (Look pair / Red losses / Gold and red: a pair's win is the accent only
  when it is a bright colorful ink, else sunflower; a loss must differ from the win and is never green);
  Section headers (As built or one `.t-head` variant everywhere, `65-heads.js`). Heat Vice uses Stacked and
  Look pair (pink wins, aqua losses); Gold Press uses Gold and red.
- Snapshots: the v51.1 recapture (93 states, four helpers, `docs/reprint-lab/capture/v51/`: the brief now
  points at the lab server on :8095; `snap.js` keeps a canvas's `data-*`). The build converts the frozen
  season prints to JPEG (`sips`), about 7.6 MB in all.
- Checked: all 17 looks on home, draft, results, ballot sheet, reel and Heat Check, plus Bonuses, FAQ, 404,
  Presti and the Daily gate on three looks (rendered boards in the scratchpad's `qa/`).
- LAB STATUS (end of session, stopped early: the owner's usage ran low): the lab code is committed with a fresh
  build in `docs/reprint-lab/reprint-lab.html` (on the branch preview at /docs/reprint-lab/reprint-lab), built from
  the v51 snapshots (5 of 93 had been recaptured from v51.1 when the four recapture helpers were stopped).
  CSS-only v51.1 fixes show anyway (the lab inlines the current styles.css); markup changes (flat pool chips,
  START OVER, trait-code text, Bonuses question voice...) show only after a recapture.
  NEXT: (1) recapture all 93 with docs/reprint-lab/capture/v51/BRIEF.md and group-A..D.md (four helpers, lab
  server :8095, site :8789; the v51 copies are in the scratchpad's snaps-v51/); (2) `node
  docs/reprint-lab/src/build.js <snaps> docs/reprint-lab`, check a few looks with qa/boards.js, commit, push;
  (3) republish the private artifact https://claude.ai/artifact/7Vqj7L2u5He21TRhETf8oH: build with an out dir to
  get `reprint-lab.artifact.html` (body only), `Artifact` read the url WITHOUT a path first (required), then
  publish that file to the url (no icon on a redeploy). NOT republished this session: the artifact still shows
  the pre-v51 lab; point the owner at the branch preview copy meanwhile.

### Owner's queued tweaks (2026-09-25, end of session; rough priority and logical order)
DONE 2026-09-25 (v51.2, one pass, shown to the owner as a Heat Vice board): items 1-8.
- Site: the "V" value label is back on the results cards (`<small>V</small>`, value over a replacement player;
  the hot-pick code already wrote it); the two-way profile sits inside the record card above SHARE
  (`.rr-twoway`, no border, the separate "Two-way profile" section is gone). Keys `20260925-fixes-v51-2`, BUILD_V "v51.2".
- Lab (Heat Vice): display face Big Shoulders (upright; Kanit Black Italic made everything italic); Wins and
  losses "Pair, swapped" (aqua wins, pink losses); new setting "Votes and tags: Wins and losses" (YES and trait
  tags in the win ink, NO and bad traits in the loss ink: no more yellow and red); neon looks draw position
  badges as pink tubes and the GOAT Climb in the second tube (aqua) with YOUR FIVE in pink.
- Only results-top and results-lower were recaptured (the rest are still the v51 snapshots).
Most are for the Heat Vice direction (neon). Do them after the lab recapture and artifact republish above.
1. Player trait badges are still yellow: find a color that matches the scheme.
2. The player value on results needs back the symbol it used to have (a Greek letter, an EV-style mark).
3. Most text looks italic (the chosen font, or real italics?): it is hard to read on badges and body text. Use an upright face.
4. Position badges on the results player cards: neon pink.
5. Wins and losses: probably light blue (aqua) as the main win color and the pink neon for losses. Many colors
   on that screen should probably swap this way.
6. Ballot sheet: the main YES/NO buttons should not be red and yellow (they clash with the palette).
7. GOAT Climb needs a neon teal secondary color (it is solid right now).
8. Offense/defense box: fold it into the bottom of the team record box, just above SHARE YOUR TEAM, with no
   border and slight padding.
9. The season-print mountain should fill with color only partially, in proportion to wins out of 82.
10. Masthead: the TRUE 82 title should be more neon, less riso/hand-drawn, closer to the ball icon. Keep the
    comet icon as configured but crop it tight (no blank space around it).
11. The dunk-the-ball interaction (Daily gate) needs a Vice neon makeover.
12. Home page: replace the intro text with a one-liner plus possibly a HOW TO PLAY button; the text below the
    voting card also goes, replaced by a how-to-play button somewhere.
13. Make sure HOW TO PLAY is dead simple (maybe a CSS tapping finger running a short video-like demo).
14. ADD DEFINITIONS TO TRAITS: where did those go? (Owner is asking; find and restore them.)
15. Import the "redraftables" from the test archive and review the other deltas with it.
16. Add Daily archive retrieval (play or view past Dailies).
17. Later: leaderboards, high scores, etc. with accounts (the accounts-test fork went far down that road).

### Calls made (owner may overrule)
- In today's colors the results, the reel and the ballot sheet are dark site cards (owner confirmed 2026-09-25).
- The season print on dark cards glows (screen blend on the card color) instead of the lab's old negative
  filter. `--t-print-filter` stays as an optional per-look knob.
- v51.1: a record under 61 wins shows no comp phrase on results; FIRE SALE uses the hot fire gold; money reads
  "$16M" with no thin space; the climb marker rides realized wins (it rode the pre-season net since v42, which
  contradicted the comp line); quiet buttons use the rule color for their border.
- Lab: trait tags and YES print in the palette's sunflower in themed looks (today's site uses its nearly
  identical accent gold); Heat Vice's results tiles now follow its outline cards (the old "Results tiles: Neon"
  glow is gone; "Neon amount: Max" puts a glow on every card edge); losses are never green; a dark or neutral
  accent hands the win to sunflower.

### What v51 changed on the site
1. **The theme** (`tools/theme-core.js`, the one source): about 40 base ROLES (each with one meaning:
   ground, text, label, accent, bad, hot, good, you, win, loss, the season-print inks...), 24 named SHADES
   (recipes: role mixed with a partner, computed ahead of time so the CSS never needs `color-mix`, which
   older phones cannot read), fonts, radii, a type scale, print effects, fixed effects (fire, the basketball,
   masks), and the legacy names (`--amber`, `--chalk`...) as aliases. `node tools/theme.js` writes the
   generated `:root` block between markers at the top of `styles.css`; `--check` verifies it.
2. **styles.css consumes only tokens.** All ~944 color uses were converted (the lab's color audit gave each a
   role; a fitter kept today's look: every live screen within about 2.5 CIEDE2000 of before, verified
   element by element on 99 snapshots with `docs/reprint-lab/capture/v51/compare.html`). Deliberate
   standardizations: dark text on gold is one ink (`accent-ink`, was two near-blacks); the trait chips,
   vote buttons and pool (i) button use the site keycap gold (was a slightly different slab); Heat meter
   level 3 is a touch paler. See-through colors are `rgb(var(--t-name-rgb) / a)`.
3. **Shared pieces** (styles.css "SHARED PIECES" section, shown live on `docs/style-guide.html`): `.t-btn`
   (data-kind primary/yes/no/good/quiet/text, data-size lg/sm; any plain button still gets the keycap from
   decorate3dButtons), `.t-chip` (tones yes/bad/plain/on, states .is-q/.is-off/.is-mine, `.t-chip-add`),
   `.t-card` (data-tone feature), `.t-sheet` + `.t-backdrop` + `.t-grab`, `.t-toast`, `.t-head` (section
   headers, 6 variants: eyebrow, rule, bar, title, banner, tab), type roles (`.t-num`, `.t-title`, `.t-name`,
   `.t-meta`, `.t-data`, `.t-label`, `.t-body`, `.t-small`), and `.t-mode` (plain h2/h3/p/table/input inside a
   mode root look right before they are styled).
4. **Section headers**: `head(context, text, opts)` in app.js (next to `esc()`); `HEADS` maps each context
   (home, poll, rules, reel, results, sheet, group) to a variant in one place; `?heads=<variant>` swaps all.
   Migrated: homepage Draft/Winning, the vote card lead, HOW TO PLAY title and sections, the reel header,
   results sections (and Kaman), ballot sheet title and group labels, the static index.html fallback.
5. **The grafted screens are on the system** (in today's colors they are now dark like the rest of the site,
   not cream paper; the owner has not seen this yet):
   - Results: the `.rr` tiles are the site's cards; YOUR FIVE cards are `.t-card` with the value as `.t-num`
     (DM Serif Display is gone, and dropped from index.html's font link); tags are the shared chip; SHARE is
     the primary keycap. The riso paper overrides and `--rr-*` tokens are deleted (`risoPaperOnce` removed).
   - THE SHAPE OF A SEASON (`results-riso.js`): reads every ink, the stock and both faces from the theme
     (`readTheme`, lazily; any missing token throws and the plain record stays). On a dark stock
     (`--t-print-paper` = the card color, `--t-print-blend: screen`) the inks glow like screen print on black
     card and the key ink is turned down to a glow. The ROSTER OVERLAY is new: the five names (slot, full
     name, 'yy) stacked in the theme's light ink with a pop-ink offset, on its own `.rr-print-names` canvas on
     screen (fades in as the season finishes) and drawn onto the 1080x1350 share poster (whose foot now
     only says TRUE82.NET · NET). `spec.roster` comes from app.js `resultsPrintSpec`.
   - The reel (`reel-riso.js`): the site's card, coins in `--t-win`, rings/L/drips in `--t-loss`, rims in
     `--t-print-pop`, veil in the stock color, faces from the theme (the L waits for the display face).
     Header is `.t-head`, SKIP the quiet button, the verdict the primary one.
   - The tag ballot sheet: `.t-sheet`/`.t-backdrop`, YES/NO/NOT SURE are `.t-btn` yes/no/quiet (lg),
     the tally number `.t-num`, the pill a plain chip, Change vote a text button, Done primary, toast `.t-toast`,
     the glove paints from CSS tokens.
   - The homepage vote card: its CSS moved from app.js's injected `ensureTraitsCss` (deleted, with its dead
     rules) into styles.css; YES/NO/IDK are `.t-btn`, the tag a chip, the lead a `.t-head`.
   - Bonuses (`bonuses/index.html`): loads `/styles.css`; its own block is layout + tokens only; buttons are
     `.t-btn`, status pills and the title tag are chips. `traits/index.html` (redirect stub) loads styles.css.
   - SVG icons in app.js (hoop mark, book icon, ball lever) paint from tokens through `style="fill:var(...)"`.
6. **Enforcement**: `tools/style-law.js` (run by test.js; 4 new checks): no hex/rgb/hsl/named
   colors or color-mix and no font families outside the theme block in styles.css, the browser JS, the pages'
   style blocks and style attributes (canvas modules may use pure black only as a coverage mask; browser
   chrome like `<meta theme-color>` is exempt); the theme block must match the generator; every token read
   must exist; the shared pieces and header variants must exist. Each finding names the nearest token.
   `tools/stylefix.js <file> --write` rewrites a graft's CSS/page to tokens in one pass.
7. **The lab can reprint the new pages** (the lab uses these since the same day): `#rrPrint` carries
   `data-spec` (the print's recipe); each `.riso-strip` carries `data-games`, `data-streaks`, `data-gi0`,
   `data-cl0`; `T82PRINT.print(spec, {root, width, dpr})` returns `{print, names, filter}` canvases;
   `T82PRINT.fonts(root)`; `T82RISO.strip({root, games, streaks, gi0, cl0, cssW, d})` prints a settled
   month; both modules accept `{root}` (the element whose theme to read) on mount/poster/create.
8. Keys (v51): `20260925-style-system-v51`, `BUILD_V = "v51"`. Since v51.1 every key is `20260925-fixes-v51-1`
   (styles.css, app.js, reel-riso.js, results-riso.js in index.html; `/styles.css?v=` in bonuses, traits and
   docs/style-guide.html) and `BUILD_V = "v51.1"`.
9. **One end time for the reel** (owner, later the same day): every season's reel now finishes at
   `REEL_END_MS` = 16.8s, so its length never spoils the record. `reelNaturalMs()` walks the natural schedule
   (month leads, one tick per game, each loss's hold) and `showSeasonReel` scales every wait (and reel-riso's
   hold and effect durations, via `info.pace`) by one factor. The target is the slowest of the 78-82-win
   seasons (78-4 with its first loss ending a streak), so those play at the natural, slowest pace (82-0 is
   stretched x1.44) and worse seasons run faster (41-41 x0.55, 10-72 x0.45; the old 26-56 took ~34s, now
   16.8s). Measured in the browser: 80-2 in 17.1s, 30-52 in 17.3s (timer overhead). The red flash keeps its
   own speed limit (`FLASH_GAP` 0.77s in reel-riso.js: never more than ~1.3 flashes a second, whatever the
   pace). QA: `?reelms=20000` tries another end time. test.js pins it. The owner kept pacing by the realized
   record (asked 2026-09-25: exactly 16.8s every time; the alternative, pacing by the pre-season net, was
   declined).

Verified in a browser (375px) on local servers: home (vote card, headers), a Classic draft, the reel (loss
effect, streak labels, finale), results (cards, chips, dark print with roster), the ballot sheet (ask, tally,
toast), Bonuses (question state), the share poster (saved and inspected), docs/style-guide.html.
Since then the v51 recapture helpers looked at every screen (their findings became the v51.1 fix list), and
the v51.1 helpers checked each fix at 390px and home, draft and results at desktop width. Kaman results and the
Tribune over the new results were still not looked at.


---

## 0000. The Reprint Lab (design exploration for the next version; nothing shipped)

2026-09-24/25, overnight: the owner asked for a "lab" (like the tennis Misprint Lab) to redesign the homepage
masthead and the whole site system. It lives in `docs/reprint-lab/` (read its README). One self-contained page,
`docs/reprint-lab/reprint-lab.html`, shows 17 complete looks and every toggle (palette, paper, wordmark type and
depth, icon concept and style, layout, additions, button/card/chip styles, corners, texture, night or paper ground,
fonts) on real snapshots of every screen except the retired Tribune. The site itself is untouched: no app.js,
styles.css, engine or site_data.json change, no cache keys bumped.

When the owner sends picks, they arrive as `T82-...` codes; decode with `LAB.decode` in the lab. The ship path
(tokenized styles.css + one theme block + generated component CSS + an exported masthead) is in the README.

Owner reactions so far (2026-09-25): he loves the dramatic neon buttons (Heat Vice; the lab's "Neon amount: More"
spreads them to every button, secondaries in the palette's second neon). He found the white paper tiles on the
results page jarring in dark looks ("Results tiles" setting added; default now follows the look's cards), and he
ruled out paper-only special cases: "nothing else is skeuomorphic", so a control must look the same on every surface.

### One enforced global style guide (owner's request, 2026-09-25; DONE in v51 and v51.1, see 00000)

The owner is about to add several new game modes and does not want to standardize screens piecemeal again. Goal:
every screen draws from ONE set of tokens and components, so a new mode is styled by construction.
- **The season reel (game by game) and the results page are off-system** (grafted on later: they carry their own
  fixed riso inks, the `.rr` private `--rr-*` tokens and their own type). Put them on the global roles: win/loss
  coins and their text in the system colors (e.g. the look's pink + teal, or at least a neon red for losses), the
  YOUR FIVE player result boxes on the global type scale and card component, and the crowdsourced-data pop-up
  (the tag ballot sheet; likewise the poll card and Bonuses) on the global sheet, button and chip components.
- **Section headers as a component** ("division headers"): one class with a few variants chosen in the backend by
  a single attribute, so modules can be dropped into any screen and match.
- **Enforce it**: styles.css consumes only tokens (the lab's tokenizer and audit in `docs/reprint-lab/` already map
  every color literal to a role); results-riso.js and reel-riso.js take their inks from the theme (the lab's
  `src/vendor/` copies show the hook); a test.js check fails on any new hex color or font-family literal outside
  the theme block. New modes use only the shared components.
- **Update the lab to match**: coins, reel text and results boxes follow the palette; a toggle for the header
  variants.
- **Share picture**: add a white text overlay on the final results print (the season picture and the share poster)
  with the five player names stacked, so the shared image reads as a roster card.

Site bugs the capture agents found in passing (all fixed in v51.1):
- Question share links under `/bonuses/<slug>` 404 because `_routes.json` does not route `/bonuses/*` to
  `functions/bonuses/[slug].js` (already listed as a pending manual edit).
- On the homepage poll card, `.tm-sharebar{display:block}` overrides the `hidden` attribute, so the Share Vote bar
  still shows after the fifth answer.
- `has-pick` stays on `<body>` after the draft ends (visible on the reel and results).
- Searching the draft pool for a name with no match shows a blank pool with no message, and the MORE PLAYERS cue
  still floats over it.

---

## 000. V50: riso results + the tag ballot

The results screen now prints on the reel's paper stock, and the five
player cards under the score are the tag ballot from the owner's voting
package (`docs/ballot/`: AGENT_BRIEF.md, TAG_BALLOT_HANDOFF.md and the two
prototypes; the prototypes are behavior specs, not pixel specs).

What the player sees, top to bottom:
- THE SHAPE OF A SEASON (results-riso.js): the season as a riso landscape.
  Waterline = .500, each win lifts the ridge, each loss drops it and leaves
  a pink bead, sun height = win rate, inks cool as the record falls (golden,
  dusk, night with a moon). The strip under it is the exact game-by-game
  record. Analytic runs (Daily, Pro, challenges) have no games, so they print
  the projected slope and say PROJECTED OVER 82 GAMES. The plain record stays
  in the DOM (screen readers, the Heat Check rewrite, no-canvas fallback).
- Net rating, the comp line, SHARE (navy keycap, pink offset; sunflower
  offset and pulse at 81/82).
- YOUR FIVE: the ballot. Card = slot badge + name (bbref link), season and
  team (team link), the engine value as the hero number in DM Serif Display,
  one mono box-score line, then the tags. Moved up above the two-way profile
  (owner fact: about half of finishers never scroll to the roster).
- Two-way profile, GOAT Climb, Scoring Card, Run it back: same content, re-inked
  on paper slips. On paper, riso blue means "you" everywhere: your ballot
  ring, your climb rail and marker.

The ballot (app.js, "v50 THE TAG BALLOT"):
- Three tag states only: on (sunflower keycap; scarlet for a bad trait),
  "?" (same keycap plus a navy badge: the scout called it close, or the crowd
  is split), off (hollow with an X: you said NO to a settled tag; it stays so
  the dispute reads). "+" last. Blue ring = you voted.
- Tap a tag: bottom sheet, the trait's own question ("Was 2016 Huertas
  hunted on defense?"), YES / NO / NOT SURE, then the tally in words, a bar
  and a pill (Ruling stands / Ruled out / Disputed, flips at 62% / N more
  votes settle it). The big percentage only prints once the vote minimum is
  met. Change vote, Done. "+" opens the picker: Open questions first, then
  Offense / Defense / Reputation.
- One op=vote per answer, source "card", spaced 1.3s apart client-side (the
  server fence is 1.2s). A failure reverts the tag and toasts "Not saved".
- White-glove hint once per browser (localStorage `tb-hint`), only when the
  first card is fully on screen and nothing is over it.
- The bottom "did we get it wrong" widget, the label legend and the
  tap-to-expand label chips are gone from results (wireTraitsPrompt,
  wireTraitCardUi, wireTraitsLabels and buildTraitLegend were deleted). The
  draft pool keeps its read-only chips; the strike-through anti chip is
  retired everywhere (applyLabelChips filters it, the server stops sending it).

Server (functions/api/traits.js, starts from the package's v49.9):
- op=labels reads the scout layer (community > desk > scout), scoped to the
  requested players; returns `labels`, `qids`, `open` (scout unsure), `split`
  (community tally in the disputed band), `rules`, and with `mine=1` the
  voter's own answers. Anti hits are no longer emitted (a ruled-out trait
  still blocks lower layers).
- op=vote creates a missing question on its first vote when the body carries
  `player` and `season` and the id is exactly slug(player)-season-<core trait>
  (the same id space op=roster and the scout backfill use; accented names
  fold the same way). Creation happens after the rate fences.
- Sources gain "card" (results) and "record" (the future rater page). The
  package's op=engq is not carried over: create-on-first-vote replaces it.

Migrations (NOT applied to production by this session; see MIGRATIONS-NOTES):
- `0026_scout_claims_v1.sql` (the package's 0013, renumbered; 7.6 MB, needs
  wrangler, not the console paste) and `0027_hunted_trait_v1.sql`. Apply both
  when v50 deploys. Before 0026 lands, the new traits.js degrades to the two
  older label layers; without 0027, a HUNTED vote returns unknown_question
  and the card reverts it.

Files and keys:
- `results-riso.js` (new), `app.js`, `styles.css` at `20260924-riso-results-v50`;
  `reel-riso.js` unchanged at its v48 key. `BUILD_V = "v50"`.
- index.html loads DM Serif Display (the value serif, the owner's pick). New
  CSS uses only weights already loaded (no 800), so no existing text changed.
- The site's 3D button decorator skips the ballot's buttons (BTN3D_EXCLUDE).

Invariants (do not break):
1. Cosmetic print. results-riso.js reads only the spec app.js hands it; any
   throw logs "[t82] results print off" once and the plain record stays.
   `?riso=0` turns off both the reel and the print.
2. The print never reveals under an overlay: it mounts on blank paper and
   prints in once it is on screen with no Tribune / Heat Check / sheet up.
   A hidden page prints it finished.
3. The Heat Check 81 to 82 save re-prints the season (the rescued loss flips
   and gets a pink ring) and re-bakes the share poster (resultsPrintRecord).
4. Share text is byte-for-byte the locked SHARE FORMAT LAW text. When the
   device can share files, the season poster (1080x1350 JPEG, baked in idle
   chunks after the page settles) rides along; the analytics method reads
   `native_share_print`. Daily practice runs never attach it (they share the
   official numbers). No poster ready = plain text share, never a wait.
5. Ballot copy has zero em-dashes (test.js pins it).
6. The engine is untouched. The engine's own 3PT / GRAVITY chip is a settled
   tag; a NO can mark it "?" but never removes it. Settled gravity hides 3PT;
   an unsettled gravity question does not.

Calls made to reconcile the package with this branch (owner may overrule):
- The brief was written against the accounts-test fork (v49.x, per-chip vote
  strips, op=engq). This line never had those; the ballot was wired straight
  onto the v47.5 roster, and the brief's "deploy after each step" became
  "push c-code-clean", since main auto-deploys.
- Five core traits the brief does not list exist in D1 (0018): Championship #1
  (TITLE #1, sunflower), Ball Pounder and Foul Merchant (scarlet), plus Ball
  Stopper and Stat Padder, which the brief does list. All show when a
  ruling says so and vote like any tag. "+" offers only the brief's set
  (12 core + Hunted, Ball stopper, Stat padder), which keeps the owner's
  four-negative ceiling for adds.
- Thresholds are the server's live rules (qualify 62%, rule out 38%, 25 vote
  floor) rather than the brief's working 60/40/10; the pill reads the live
  number, so changing the D1 rule changes the copy.
- NOT SURE on a settled tag leaves it on (ringed) instead of a fourth
  hollow-with-? state, to keep three states.
- Hunted sits in the Reputation group, as in the brief's rater list.

Verified 2026-09-24 against a local Pages + D1 copy (wrangler pages dev with
migrations 0010-0027 applied locally): Classic 79-3, 80-2, 81-1, a 4-78
night print, a Presti run through the mid-season Heat Check, the Daily
(projected print, official run); tag sheet, NO to hollow, reopen shows the
live tally, change vote, Escape, the "+" picker, create-on-first-vote
(Hunted, and an accented name), the ring from mine=1, a simulated 81 to 82
save re-printing the season, the share poster file, draft pool chips with no
anti chips, mobile 375 and desktop 1280. node --check on all eight browser
JS files and node test.js: 54 passed (10 new ballot checks).
Not verifiable in the headless pane: the reveal animation and the glove fly-in
(the pane was hidden, which pauses animation frames); both were exercised by
direct call.

Open items for the owner:
- Apply 0026 and 0027 with the v50 deploy (the 0026 step needs wrangler or the
  GitHub Action in docs/ballot, which needs the database name and two secrets).
- The standalone rater (/bonuses/ as "The Record", brief section 7) is not
  built; it needs op=disputed, which does not exist yet.
- The draft pool still prints the old abbreviations (CLTCH, RIM-D, SWCH-D,
  GRAV...) while the ballot uses the brief's (CLUTCH, RIM-P, SWITCH, GRAVITY).
  Left alone because the brief says the draft screen is untouched and longer
  chips would re-wrap the tuned pool rows.
- Curated questions spell accented names without accents (nikola-jokic-2023)
  while the game and the scout data keep them (Nikola Jokić), so those
  players' desk labels never match. A name-folding migration would fix it.
- Per-run link cards (OG images for Tribune editions) are still the share
  law's queued "visual layer"; v50 attaches the poster in the share sheet
  instead.

---

## 00. V48: riso reel (THE SEASON · GAME BY GAME)

The season reel now prints as a risograph ledger on a paper card. Wins stamp
in as Sunflower coins that run hotter with the streak (thicker rim at 10,
halo at 20, glint at 30, a burst every tenth straight; SWEPT stamp on a
perfect month). Losses break the rhythm on purpose: the cursor holds, the
card shakes and flashes red, a scarlet ring slams down, cracks, sprays and
bleeds, and a giant misregistered L lands and drains while the card sags.
The drips stay in the ledger, so losses still read at the end.

Files and keys:
- `reel-riso.js` (new): all rendering. Loaded by a plain deferred tag in
  index.html, not loadScriptOnce (that would log an analytics event per load).
- `app.js` showSeasonReel: small hooks only (riso.create / openMonth / stamp /
  closeMonth / finale / destroy). Chips remain the fallback.
- `styles.css`: one block scoped to `.reel-overlay.riso`.
- Keys: styles.css, app.js and reel-riso.js at `20260924-riso-reel-v48`;
  `BUILD_V = "v48"`.

Invariants (do not break):
1. Cosmetic only. reel-riso.js never reads or writes season.games; the
   cursor engine in app.js owns the season, the Mid-Season Heat Check pause,
   its re-roll and SKIP. Squares are stamped from the live value at
   placement, so a Heat Check re-roll is always honored.
2. Fail soft. Every call goes through risoCall; any throw logs
   "[t82] riso reel off" once and the reel continues on W/L chips.
3. Loss pacing lives in holdFor/heavy. The first 14 losses get the full bang;
   after 14, losses still slam and bleed but skip the flash and hold only
   240ms. Since v51 every hold is scaled by the season's pace (one end time
   for every record, see section 00000 item 9), and the red flash has its own
   limit (FLASH_GAP: never more than ~1.3 a second, well under 3/s). test.js
   pins both.
4. Copy law holds: loss captions have zero em-dashes (pinned by test.js).
5. Fast-forward (SKIP before the Heat Check) stamps instantly with no
   effects and no hold.

QA switches:
- `?riso=0`: plain W/L chips (the pre-v48 reel), for comparison or rollback.
- `?risoslow=6`: every reel effect and the loss hold run 6x slower, for
  reviewing a loss frame by frame.
- `?midhot=1` (existing): forces the Mid-Season Heat Check, which exercises
  the pause, resume and fast-forward paths through the new hooks.

Verified 2026-09-24 on a local build: real Classic run; a 78-4, a 26-56 and
an 82-0 season fed straight to showSeasonReel; a loss in game 2; Presti with
?midhot=1 through the pause, decline and resume; ?riso=0. No console errors.
Reel length measured: 82-0 11.8s (unchanged), 26-56 34.2s. Loss holds add
up to about 12.5s for a season with 14 losses, about 5s for 78-4 (computed).
node --check (all five browser JS files) and node test.js: 44 passed.

### 00a. Housekeeping (2026-09-24, no build change; BUILD_V stays v48)

- Public copy no longer promises gated features. Duel, League, Arena, the
  weekly challenge and Today's Board need accounts.js / duel-*.js /
  league-ui.js / arena-ui.js, which live only on `accounts-test` (all 404 on
  true82.net; index.html's CSS block hides their buttons). The faq, md/faq.md,
  how-it-works and llms.txt now describe only what ships: the solo modes and
  THE DAILY with its challenge link. Re-add the copy when those files ship.
- Removed stale root copies of functions/_middleware.js, functions/[id].js and
  functions/r/[id].js (older versions, unreferenced, publicly downloadable).
- CONTEXT.md retired to docs/history/CONTEXT-2026-07.md. This file is the only
  current-state doc. (app.js still has one comment that says "see CONTEXT.md";
  left alone to avoid a cache bump for a comment.)

---

## 0. V47.5: results-roster player-label UI

This is a code-only, single-executable-file change. No SQL or D1 action is required.

Changed executable file:

- `app.js` only

Behavior, limited to the results page `Your five` roster section:

- Settled player labels render as compact abbreviations.
- Each label is a real button; tap toggles the full trait name in place.
- One information button appears beside `Your five` only when labels exist.
- The information button opens an inline legend for only the labels present on the five cards.
- The first time the label area enters view, the labels pop and the information button pulses once.
- That discovery cue stops permanently after the browser taps either a label or the information button (`t82_trait_card_ui_seen_v1`).
- Crossed-out anti-labels retain the red strike-through.
- `prefers-reduced-motion` disables the discovery animation.

Intentionally unchanged:

- `functions/api/traits.js` and every other Worker
- D1 schema, questions, votes, consensus, and editorial rulings
- simulation, player values, net rating, wins, taxes, and roster generation
- draft-screen player rows and the existing engine-derived `3PT`/`GRAVITY` chips

Review target: the diff around `TRAIT_CARD_ABBR`, `wireTraitCardUi()`, `wireTraitsLabels()`, and the results roster heading. There is no reason to revalidate unrelated game systems.

---

## 1. Canonical project structure

This archive is already flattened and deployable. Its contents belong directly at the repository/Cloudflare Pages root.

- Do **not** wrap the project in another `true82-live-with-daily/` folder.
- Do **not** add `.wrangler/`; that is local Cloudflare state, not deployable source.
- There is one canonical copy of each file.

Critical browser load order in `index.html`:

1. `analytics.js`
2. `retention-client.js`
3. `sim-core.js`
4. `challenges.js`
5. `daily-core.js`
6. `app.js`

The Daily depends on `challenges.js` loading before `daily-core.js`, and both loading before `app.js`. The retention client must load right after `analytics.js` so its subscriber is attached before any gameplay script can emit.

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

`docs/history/CHANGES-THE-DAILY.md` contains the longer history of The Daily’s design and architecture. It predates some of the July 18 UI work, so use this handoff as the current-state summary and the older file as historical context.

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
logged above in the V13-V27.1 sections and in docs/history/CHANGES-THE-DAILY.md.

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

### V35 — duo-defense retune + the rim-protection rule (owner-directed)
Client keys 20260720-ui-v35; BUILD_V "v35"; sim-core gains its FIRST cache
key (?v=20260720-rimtune-v35); challenges.js touched for the first time
since v14 (?v=20260720-duo-keys-v15); DATA_URL now site_data.json?v=sc-v35.
Walk: 230, three greens.

- DUO TIERS RETUNED: both-bad pairs now trip at bottom-20% (tax 3) and
  bottom-33% (tax 2), from 10/25. New DBPM cutoffs computed from the pool
  itself — the derivation method was VERIFIED first by reproducing all four
  v34-era constants exactly (unweighted season rows, g_pct/f_pct >= 20,
  linear-interp percentile, 1dp): guards -1.2 / -0.8, forwards -1.1 / -0.7.
- NEW RIM RULE: among the two F slots + the C slot, at least one player
  must be a top-20% frontcourt defender (DBPM >= 0.9, p80 over all
  F-or-C-eligible rows, n=14,107) or the team pays RIM_D_TAX (2.0). One
  protector clears the whole frontcourt. Ledger row: "Rim protection …
  bad rim defense; the paint stays open."
- HONEST NAMES: config keys renamed GD_/FD_BOTTOM20/33 and *_D_TAX_20/33;
  tier codes now 20/33; challenges.js's four override cfgs renamed with
  them (values unchanged — their intent was always "multiply/zero the
  taxes", which carries to the new tiers).
- SHIM: the eight v34-era keys REMAIN in meta.scoring so a stale cached
  sim-core keeps working through the transition. REMOVE IN V36.
- STALE PIN FIXED: "historical comp line" demanded "as good as THE" and
  predated v33's drop-the-article law; the retune moved the walk draft
  onto a digit-led rung and exposed it. Pin now matches the law.
OPEN ITEMS THE OWNER MUST KNOW (also in the session report):
(1) site_data.json is GENERATED — the ten new scoring keys must be
mirrored into the data pipeline's config or the next data refresh reverts
the retune. (2) Difficulty dropped measurably (the walk draft slid down
the comp ladder); BASELINE recalibration is a game-balance call the owner
owns. (3) Percentile boards now mix old-rules and new-rules nets;
same-day mixing on whichever daily is live at deploy time. (4) Rim bar
population = frontcourt-eligible rows (F or C, g_pct-style threshold);
if the owner meant top-20% of ALL defenders, it is a one-constant swap.

### V36 — glass, creator, and mileage taxes (owner-directed)
Client keys 20260720-ui-v36; sim-core ?v=20260720-taxes-v36; DATA_URL
sc-v36; BUILD_V "v36". Walk: 240, three greens, all three taxes pinned on
REAL pool rows, not synthetics.

- MACHINERY (initDataCore, one pass at boot): within-season percentile
  ranks for rpg and apg per row — the owner's "per possession" requirement
  translated to what the data supports: a 1975 rebounder is judged only
  against 1975 peers, so league pace cancels exactly. Plus career-year per
  row with SEGMENT logic (a 5+ season gap starts a new career), so
  returning players / shared names (the two Mike Jameses) never inherit
  decades of mileage. Tables ride T.t for inspection.
- GLASS TAX: sum of the five's rebound percentiles; < 3.3 pays 2,
  < 3.0 pays 3. Calibrated on REAL fives, not simulation — the first cut
  (from random plausible fives) would have fined the actual '22 champion
  Warriors (3.46) within .01 of the max; real anchors: '17 GSW 4.04,
  '96 Bulls 3.89, '01 Lakers 3.78, '22 GSW 3.46 (smallest champ, dodges
  by .16), five elite PGs 3.23 (pays 2 — correctly), true forfeit five
  (Nash/IT/Trae/Muggsy/Murphy) 2.33 (pays 3).
- CREATOR FLOOR (light-touch per owner): best assist percentile on the
  five < 0.80 pays 2. Real fives sit .93-.98; Wallace-ball sits .52 —
  pure psychopath filter, exactly as ordered. STAT-ONLY by owner ruling:
  no flag/labeling dependencies (the rim/pm flag idea is DEAD — owner is
  done with manual labeling projects after the shooter pass; do not
  propose flag-based rules again).
- MILEAGE TAX: more than 1 player at career year >= 12 pays 1. Owner
  calibration target hit exactly: the '22 Warriors carry ONE such player
  (Curry, y13; Klay y11) and dodge by one man — pinned. Swap in LeBron
  '22 (y19) and it fires — pinned. Age proxy = career year (no age
  column); pool starts 1974 so pre-'74 debuts read slightly young —
  lenient direction, disclosed.
- All nine constants in meta.scoring (GLASS_LOW/DIRE, GLASS_TAX_LOW/DIRE,
  CREATOR_PCT, CREATOR_TAX, AGE_VET_YEAR, AGE_VET_FREE, AGE_TAX);
  challenge-overridable via C() automatically. PIPELINE MIRROR REQUIRED
  (same as v35's ten). v34-era shim keys still present — remove only
  after the keyed sim-core is confirmed live.
- Difficulty dropped again (three new taxes); BASELINE recalibration
  remains the owner's open balance call, now more pressing.

### V36.1 — balance calibration verdict (no site change; BUILD_V stays v36)
Owner supplied last-week live win histograms per mode (pre-v35 engine) and
directed calibration against HUMAN curves, not raw Monte Carlo. Built
devtools/balance-bench.js (see README-DEV): policy bot through the real
headless core, tau fitted to the human curves under old-rules emulation,
then DIFFERENCE-IN-BOTS (bot-new vs bot-old, same tau, current baseline)
so bot-vs-human skill bias cancels. 81+82 fitted as one bucket — Heat
Check only ever converts 81->82, so the fit is immune to spin odds and
player choice.
VERDICT (n=4000/batch, SE~0.8pt): the four v35/v36 taxes cost realistic
drafts LESS THAN HALF A POINT of 81+ rate (classic .487->.483, Presti
.070->.066) — statistically zero. BASELINE HOLDS AT 3.98. The earlier
"difficulty dropped measurably" warning came from ONE walk fixture draft
sliding the comp ladder — anecdote; the population measurement supersedes
it. This is the taxes working as designed: they fence the degenerate
builds without taxing honest fives.
Residuals, disclosed: bot slightly trails humans in Presti (skips and
year rerolls unused; survivorship — only finished games log); classic
bot hi .487 vs human .574 pre-fit gap absorbed by tau. Both cancel in
difference-in-bots. The bench is the STANDING TOOL for every future
balance patch: refresh the HUMAN table from live screenshots first.

### V37 — "I don't want your charity" + DEPLOYMENT CANDIDATE
Client keys 20260720-ui-v37 (app AND styles — styles' first bump since
v34); sim-core ?v=20260720-heatcheck-v37; DATA_URL stays sc-v36 (no data
change); BUILD_V "v37". Walk: 244, three greens.

- THE CHARITY BUTTON (owner-directed): clutch-only ghost button centered
  under the ball lever — "I DON'T WANT YOUR CHARITY" — declines the Heat
  Check and dismisses straight to the un-boosted 81-0 results. Hidden the
  instant the pull commits (the spin owns the outcome after that);
  centered block = symmetry preserved; compact mono sizing for SE-height
  screens; the hoop-ball drag path is untouched (button sits below the
  lever, outside its hit area). Owner should still eyeball once on a real
  iPhone SE — jsdom cannot measure layout.
- THE CONTRACT (the important part): declining is now a first-class core
  op. declineHeat(S) sets S.hhDeclined and logs "hx"; replay speaks "hx";
  finish() STILL consumes the two Heat Check draws (clients draw at
  overlay build, so rngDraws parity demands it) but applies nothing —
  res.hh = {declined:1,...}, record stands at 81. This also fixes a
  LATENT pre-existing hole: the silent "skip →" at 81 was already a
  decline that replay could not represent (verifyRun would have upgraded
  the wins and failed the claim); hhSkip now registers declineHeat too.
DEPLOYMENT CHECKLIST (the whole v28->v37 batch ships as ONE new commit —
never "Retry", which rebuilds the failed commit):
1. Drag the full-state zip contents to GitHub, commit, wait for Pages.
2. Load the site; footer must read v37 (renders even if /api/stats
   degrades — that is the law's whole point).
3. Mirror the NINETEEN scoring constants (v35's ten + v36's nine) into
   the data pipeline's config BEFORE its next refresh, or the whole
   retune reverts silently.
4. Run the two D1 CREATE INDEX statements (v30.2 note) in the Cloudflare
   D1 console.
5. Submit the Sports Reference outreach note (drafted in session log) —
   tell them to watch utm_source=true82.net, campaigns per surface.
6. NEXT VERSION (v38): after the keyed sim-core is confirmed live,
   delete the eight v34-era shim keys from meta.scoring.

### V39 — cookieless analytics v3 + Avocado decision dashboard
Client/build: analytics.js and app.js identify as v39; index.html carries the
v39 cache keys and build meta. Migration: migrations/0006_analytics_v3.sql.
Deploy the migration once, then the entire site atomically.

HISTORICAL V39 PRIVACY LAW (SUPERSEDED BY THE EXPLICIT V43 OWNER DECISION BELOW):
- Analytics may not create/read cookies, localStorage, sessionStorage,
  fingerprints, ad ids, account ids, raw IPs, IP hashes, or a durable browser
  id. Visit and run ids are random in-memory values only.
- The Daily's pre-existing functional local record may be read only for coarse
  counts: active_days, streak, days_since_last. Never send dates, lineups,
  nonces, query text, or a hidden stable identifier.
- Referrers are origin-only. Unknown local paths bucket as 404_or_other. Full
  outbound URLs, full User-Agent strings, and raw client IPs do not enter D1.
- Do not persist the visit-level analytics sid. V43 implements the later owner
  decision with a separate random retention id, regional gating, rotation, and
  Worker-side enforcement; those safeguards must not be removed.

EVENT CONTRACT:
- functions/api/event.js owns the allowlist and sanitization. Every new client
  event must be added there and to analytics-smoke.js expectations when it
  changes the schema.
- analytics.js owns visit/run ids, landing/build context, session/performance
  summaries, generic stable control ids, external-link capture, and scrubbed
  client errors. Generic controls never record button text from player rows.
- app.js owns game semantics: mode/Daily selections, gate, run state, draft,
  result, share, Tribune, Heat Check, data readiness, percentile, and replay.
- `run_state` is local-only and MUST NOT be added as a D1 event. It refreshes
  the in-memory active-run snapshot used by abandon and terminal events.
- Canonical share diagnosis is share_click -> share_result outcome. The legacy
  `share` row remains success-only for historical dashboard continuity. Share
  rows carry wins/net; on share events only, `value` means the displayed Top X%
  rank when it was available before the tap. Do not reuse that meaning on run
  terminal rows, where `value` remains the reroll count.
- Daily link runs preserve variant daily-link for referral attribution. If the
  device already has an official result for that board, practice=1 and
  official=0 even though the link path remains daily-link.

AVOCADO CONTRACT:
- The Live pulse ignores date/build filters by design. It is the silent-ingest
  alarm. Build comparison obeys date but ignores the selected build chip.
- The Daily funnel is gate-matched by visit and separates practice; it must
  never exceed 100%. The lower daily-vs-standalone card reconciles inherited
  base modes. Mode-discovery SQL normalizes both Daily game_start and
  game_complete rows to Daily instead of their inherited base mode.
- Daily return behavior is explicitly a local-history proxy, never D1/D7.
- Tribune in-page opens are page-load beacons and can count a reload. “Fetched,
  no beacon” includes unfurl crawlers and is not proof of an intentional send.
- Do not remove migration/build warnings or privacy labels to make cards look
  cleaner. They prevent the old dashboard's false certainty.
- Keep Avocado's `queryLimiter(5)`. The dashboard deliberately caps concurrent
  D1 statements; do not replace the bounded helpers with an unbounded
  `Promise.all` across all cards.
- Kaman result/share rows are collected for operational visibility but are separated from canonical Classic/Pro/Presti share rates and record/rank propensity tables. This v39 rule supersedes the historical v29 note that Kaman sharing was untracked.
- Search diagnostics may store query length/result count but never query text.
  Abandonment and time-to-value cards are run/visit aggregates joined only by
  the in-memory ids. All new v39 dimensions are forward-only.

VALIDATION:
- Companion folder true82-devtools-v39 contains analytics-smoke.js. It has no
  jsdom dependency and is the mandatory pre-deploy analytics check. It executes
  the real migration, ingestion Worker, and every Avocado query against Node's
  in-memory SQLite in addition to source/privacy assertions.
- browser-smoke.py uses Python Playwright plus Chromium to drive the actual UI
  through a privacy-safe search and abandonment, a completed Classic run, an
  outbound click, a confirmed clipboard share, and a Daily gate start. It
  captures the real event payloads and asserts that typed search text and
  analytics storage/cookies are absent. It stubs network responses, so it
  complements rather than replaces analytics-smoke.js.
- Run `node analytics-smoke.js`, `python browser-smoke.py`, and
  `node audit.js 100 pool2`.
- The legacy full UI walk still requires npm install because it uses jsdom and
  esbuild; absence of those packages is an environment limitation, not a green
  UI result.

### V40 — the game sees its own engine (tax telemetry + curves)
Recovered v39 absorbed as baseline (checksums verified). Build identity
v40 everywhere it is version-coupled: meta tag, ANALYTICS_BUILD, BUILD_V,
and ONE shared cache key on analytics.js + app.js across index, 404, and
all four info pages (the keys-move-together law).

- MIGRATION 0007 (additive, AFTER 0006): nine Scoring Card columns on
  events. Insert tier is v40-first, failing soft v40->v3->v2->legacy with
  marker analytics-v40-migration-required. Zeros are real zeros;
  pre-0007 rows are NULL and excluded from incidence math.
- game_complete now carries every engine tax + the spacing bonus (2dp).
- THREE NEW CARDS: "Scoring Card · tax incidence" (fire rate + magnitude
  per tax per mode; migration warning when 0007 unapplied), "Heat Check ·
  clutch and charity" (shown / pulled / refused / silent-skip / wheel
  segments / hit-82), "Pool coverage · the half that never gets picked"
  (constants 21525/3509 are build-time; re-pin on dataset refresh).
- CURVES API: /avocado?api=curves — practice-excluded win histograms,
  date/build scoped, JSON. balance-bench --live consumes it (n>=300 per
  mode or hardcoded fallback). The balance tether now reads the live
  game; screenshots retire.
VALIDATION — ALL THREE LANES GREEN, a first for this project:
analytics-smoke 88/88 (both migrations, fail-soft proof, taxed-row
round-trip, all cards, curves); legacy jsdom walk 244/244 x3 (FIRST EVER
run against the v39 rebuild — jsdom/esbuild installed; two stale pins
healed: the ui-v key regex predating v39's key rename, and a v38 funnel
label predating the v39 dashboard); browser-smoke 26/26 in real Chromium,
78 live payloads captured with the v40 fields flowing. Devtools ROOT is
now ../true82 or $T82_ROOT everywhere.
DEPLOY ORDER: 0006 (if not yet), then 0007, then the whole site in one
commit; footer reads v40; Live pulse should show v40 rows; the tax card
warns until 0007 lands and fills from the first post-deploy finish.

### V41 — the rules sheet, owner-rewritten and reordered
Shared cache key 20260723-howto-v41 on styles.css + analytics.js + app.js;
meta t82-build, ANALYTICS_BUILD, and BUILD_V all read v41. No migration, no
schema change. Walk 249 x3, analytics-smoke 89, browser-smoke 26.

- SECTION ORDER (owner-specified, walk-pinned so it cannot silently drift):
  GAME BASICS -> HOW TO PLAY THIS MODE (X) -> [today's rule / twist box] ->
  NEED A REFRESHER -> WHAT WINS GAMES -> footer.
- RETIRED: RULES_STEPS ("THE GAME IN 20 SECONDS") and the standalone
  CHANGE THE YEARS box, plus their CSS (.rs-steps, .rs-years). GAME BASICS
  absorbs the first; each mode block now owns its own season/reroll
  instructions. RULES_LAW folded into RULES_MODE.daily.
- THE DAILY now has its own mode block and still renders the base mode's
  rules underneath it ("PLUS CLASSIC MODE RULES").
- WHAT WINS GAMES gained THE DIRTY WORK, which finally documents the v35
  and v36 fences (glass, creator, mileage); rim protection folded into
  DEFENSE. Before v41 those four taxes could fire with no rule anywhere in
  the product explaining them. Walk-pinned.
- NEED A REFRESHER links the BBRef year-by-year BPM top-10 leaderboard
  (verified live 2026-07-23; that page also documents why the pool starts
  in 1974, since BPM only exists from 1973-74 on) plus the BBRef home.
  Campaign "howto" so this surface reports separately from "info".
  Stathead stays PLAIN TEXT per the standing v34 law; walk pins both the
  phrase and the absence of any stathead URL in the sheet.
- FOOTER keeps /how-it-works/, adds STATS REFRESHER, and GOT IT becomes an
  amber-filled primary; the close control goes gold. Footer wraps below
  340px so an SE never clips the primary button.
- COPY NUMBERS VERIFIED against live config before shipping: net 0 = 41-41,
  82-0 needs +27 (exactly 27.01 at BASELINE 3.98 / NET_SD 12), zero
  shooters = 6 (SPACING_TAX 2.0 x 3), usage budget = 110. All correct.
- REGRESSION THE OWNER SHOULD RATIFY: the new Presti copy drops the old
  line teaching the explicit gem odds ("about 1 in 7 is a $1M steal, about
  half are rip-offs priced like stars"). The walk pin was rewritten to the
  new wording rather than deleted. Restore in one line if wanted.
- TEST HYGIENE: analytics-smoke's build/cache-key assertions no longer
  contain version literals. They now assert meta == ANALYTICS_BUILD ==
  BUILD_V and that styles/analytics/app share one key ending in that build.
  Future bumps need no test edits. Do not reintroduce literals.

### V42 — ANY GIVEN NIGHT: classic plays the season out (owner-directed)
Shared key 20260724-season-v42 (styles+analytics+app AND sim-core);
DATA_URL sc-v42; meta/ANALYTICS_BUILD/BUILD_V v42. Walk 274 x3 (now
includes a FULL standalone-classic playthrough through the real UI),
analytics-smoke 89, browser-smoke 26 in real Chromium through the reel.

ARCHITECTURE (the replay law survives by construction):
- Arming is an ACTION: op "ss" -> S.simSeason. The app arms ONLY
  standalone classic (MODE classic, no G.social, no G.ch). Daily boards,
  weekly twists, pro, and Presti stay analytic this build. Replays of
  pre-v42 runs carry no "ss" and stay analytic forever.
- simSeason(S, e) in sim-core rolls 82 games from the run's OWN rng
  stream as the game's final draws: same seed, same five, same record,
  live and in replay. finish() realizes when armed; res gains
  wins/losses (realized), expWins (the analytic tally), season{games,
  pGame, pRaw}.
- Per-game p = clamp(phi(net/NET_SD), 1-PG_CAP, PG_CAP). PG_CAP = 0.97
  in meta.scoring (PIPELINE MIRROR now TWENTY keys). Expected classic
  82-0 lands ~6% (from ~35%); the cap makes the estimate tail-proof.
  The mean is untouched wherever the cap does not bind (net < ~22.6).
- Opponent cities are COSMETIC: app-side, FNV-hashed from seed+game
  index, never the rng stream. Flavor edits can never break rngDraws.
- The reel: seven real month acts (OCT 5 / NOV 15 / DEC 15 / JAN 15 /
  FEB 11 / MAR 15 / APR 6 = 82), auto-advance ~1.25s, desk commentary
  per act ("The zero died in Denver, game 47."), running record, one
  SKIP, tap-anywhere skips too. bbref map preloads behind it. Tribune
  pregen deliberately NOT enabled (demand-priced law stands; enabling
  it is an owner cost decision, ~every classic finish would bill).
- The rule is NAMED, not hidden: WHAT WINS GAMES gains ANY GIVEN NIGHT
  on the standalone-classic sheet only (walk pins presence there and
  absence on Presti's sheet).

WHAT FLOWS REALIZED WINS: results record, comp ladder + climb, share
record + emoji bands, recap/Tribune wins, editions, game_complete.wins,
curves API (the bench also arms classic now, so the tether stays honest).
WHAT STAYS ANALYTIC AND UNTOUCHED: net, score, every tax, percentile /
Top X% (ranked by net since v33 — that decision carries this feature),
leaderboards, Heat Check (cap-only, still keyed on the analytic tally,
walk-pinned untouched).

PRESTI PREP (next build, owner-specified):
- Heat Check fires on a LITERAL realized 81-1 only. Draw ORDER LAW: the
  82 season rolls come FIRST, then the two Heat Check draws — client
  overlay and finish() must consume in that exact order or rngDraws
  parity breaks. The clutch gate flips from e.winTally === 81 to
  realized wins === 81; FORCE_CLUTCH (?clutch=1) should force through
  the realized path.
- Heat Check flavor upgrade available: the spin can be framed as
  replaying the one loss (the city is known from the cosmetic schedule).
- Expect tuning: Presti's 2% perfection collapses under sim+cap; owner
  may want a separate PG_CAP for cap mode (config key, one line) or a
  gentler cap. Realized 81s become far more common, so Heat Check
  frequency rises sharply — the economy of the spin needs an owner look.
- Daily adaptation later: seed the schedule from the BOARD, not the run,
  so everyone faces the same 82 and identical fives tie exactly.
- res.expWins is carried but surfaced nowhere; "expected 81, ran 79" is
  a ready-made results line when wanted.

### V42 amended (same build, pre-deploy): the calendar + the 10% retune
Shared key 20260724-reel2-v42; DATA_URL sc-v42b; BUILD_V stays v42
(nothing shipped yet, so this folds in). Walk 276 x3, smoke 89,
browser-smoke 26.
- PG_CAP retuned 0.97 -> 0.978 (owner: Classic is the easy mode).
  Expected Classic 82-0 ~10.5% on the live curve, tail-proof; juggernaut
  ceiling 16%. The named rule's copy now reads "about 98 times in 100."
  PIPELINE MIRROR: the twentieth key's VALUE changed with it.
- THE CALENDAR: each month act renders date-numbered squares that cascade
  in (48ms apart), wins amber, losses ember with a pop; the header record
  ticks square by square; the commentary line lands after the month
  fills. The league schedule (dates) is deterministic and SHARED across
  all runs — only outcomes differ — so it never touches the rng stream.
  Loss commentary now carries the real date: "The zero died in Denver,
  Jan 14." Walk pins the squares, their day numbers, and their win/loss
  classes live in the DOM.


### V43 — true same-browser retention analytics (2026-07-24)

Migration: `migrations/0008_retention_identity.sql`. Critical chain: `analytics.js`,
`functions/api/identity.js`, `functions/api/event.js`, `functions/avocado.js`,
`index.html`, and every dynamic/static page that loads analytics.js.

- Eligible browsers receive a random 180-day first-party localStorage id.
- Never use cookies, accounts, fingerprinting, raw/IP-derived ids, or third-party tags.
- Identity is disabled for EEA/UK/Swiss traffic, unknown geolocation, DNT, and GPC.
- The ingestion Worker must continue stripping visitor_id independently of the client.
- `local_day` is the browser calendar date and is required for exact D1/D3/D7 metrics.
- Retention cohorts begin at the first tracked `game_start`, not the first page view.
- D1 means another `game_start` on the next local calendar day. Right-censor new
  cohorts; never count a cohort as failed before it matures.
- Cohort returns intentionally span builds. The Avocado date filter selects the
  first-play cohort; the build filter must not erase returns after a deployment.
- `return_profile` is now entry-time only. Do not re-add the post-Daily-finish row,
  which changes yesterday into same-day history and corrupts that legacy proxy.
- See `ANALYTICS-V43-RETENTION.md` for deployment, rollback, and exact metrics.

---

## V44 SESSION HANDOFF (2026-07-25): the retention merge + PLAYER TRAITS

Read ANALYTICS-V44-RETENTION-AND-TRAITS.md for the full analytics and
traits contract, docs/history/PATCH-MANIFEST-V44.txt for the file inventory, and
TRAITS-OWNER-DECISIONS.md for what only the owner decides. This section is
orientation plus the build record.

### What v44 is

Two async branches merged, one new mode added:

- **Base: the v43 patch.** All gameplay, UI, info-page, and event-vocabulary
  work carries forward intact.
- **Preserved: the deployed v40r2 retention layer.** The 400-day HttpOnly
  cookie identity (`/api/identity`), the isolated retention stream
  (`/api/retention`, tables `retention_events_v1` + `retention_coverage_v1`,
  both ALREADY APPLIED in production), the standalone retention report, and
  Avocado v42.2. The v43 localStorage retention experiment is retired
  unshipped; its migration `0008_retention_identity.sql` is intentionally
  absent and must never be applied.
- **New: PLAYER TRAITS** at `/traits/`. Community voting on player-season
  trait questions; standing revisable votes deduped by a purpose-scoped
  hash of the retention id (session-hash fallback where the cookie is
  absent); consensus settled on write against configurable thresholds;
  homepage module and results-screen prompt as doorways; two Avocado cards.
  Engine effects are deliberately deferred (owner decision, see the
  decisions file).

The one structural upgrade to the analytics core: `analytics.js` now
exposes `t82AnalyticsSubscribe(fn)`, and `retention-client.js` uses it
instead of monkey-patching `t82track` (the wrapper survives only as a
fallback for a stale-cached analytics.js). Subscribers receive final
enriched props inside try/catch; a broken subscriber cannot damage the
ordinary stream.

### Deploy facts an agent must not re-derive wrong

- The ONLY migration v44 introduces is `migrations/0010_traits_v1.sql`
  (additive, idempotent, seeds 5 draft traits + 27 questions + rules).
  0008/0009 in this package are repository truth for already-applied
  production state.
- Cache keys: `analytics.js`, `retention-client.js`, `app.js` ride
  `20260725-traits-v44`; unchanged files keep their v43 keys on purpose.
- The three event names `traits_session`, `traits_question`, `traits_vote`
  are on the `/api/event` allowlist and ride existing v40 columns; no
  events-table migration exists or is needed. They still need adding to
  the OUT-OF-REPO analytics-smoke allowlist, and browser-smoke needs a
  /traits/ five-call path, before the next full lane run.

### Validation on record for this build

`node --check` clean on every shipped client and Worker file. Two
independent harnesses, built separately during the session, both green on
the final tree: a 4-suite set (102 checks: traits API end to end,
full-page jsdom five-call walk, Avocado render with and without the
traits schema, analytics-retention hook contract) and a 2-file set
(80 checks: migration idempotence, endpoint behavior incl. both abuse
fences, v40-first event ingestion for the traits names, Avocado cards
behind DASH_KEY, page walk, hook contract). Out-of-repo lanes and a real
iPhone Safari pass on the /traits/ no-scroll layout are still owed before
promoting to main.

### Build-integrity note for the record

This build was assembled with TWO agent processes writing the same
workspace concurrently. During the session, files changed that the
packaging agent did not change: a stale identity comment in `app.js` and
a stale 180-day line in `retention-dashboard.js` were corrected by the
other process (both corrections verified accurate and then re-expressed
by the packaging agent), the three v44 docs and an independent test
harness appeared, and one superseded doc was removed. Every executable
file in this package was byte-verified against the packaging agent's
transcript-recorded edits, and both harnesses were re-run on the exact
packaged tree. Nothing ships unreviewed. If future builds run parallel
agents on one workspace, split lanes explicitly (code vs docs vs tests)
so provenance never needs forensics again.


### v44.1 (2026-07-26): final trait roster + anti-labels

Owner decided the final eleven core traits; migration 0011 ships them,
retires three 0010 drafts (successors: iso-defender, playmaker,
team-defender), and re-homes their marquee questions (the 2008 Kobe
question now lives at kobe-bryant-2008-iso-defender). does_not_qualify now
renders as the ANTI-LABEL: the trait tag with a drawn cross-out, aria
NOT <TAG>. Data only plus one page: no BUILD_V, token, or Worker change;
the vote path already refused non-active questions and the pin path
already degraded, so 0011 needed zero code.

Both in-workspace harnesses were updated to the post-0011 truth (traits
14/11 core/3 retired, 96 questions, retired-question behavior, anti-label
stamp assertions) and are green: 50+36+13+16 and 40+42. Note to the
parallel agent: your test-traits.js expectations and three question ids
were updated for 0011; diff against your copy before extending it.

### v45 IN PROGRESS (2026-07-26): the v42 branch gap + labels on the roster

CRITICAL FINDING for anyone touching this tree: the v43 patch branch was cut
from MID-v42, before the final v42 amendments. Absent from this codebase and
from the live site: the reel's W/L letter squares at 25px (squares here still
print calendar dates), the SEE THE FULL RESULTS terminal button, the removal
of tap-anywhere-to-skip (the phone-hazard path is still live here), the
PG_CAP 0.99 retune (no PG_CAP constant exists in this app.js), the NET-keyed
comps/climb (no compNetFor), the Dream Team/Redeem Team ladder top, the
share percentile-on-comp-segment format, and the scapegoat loss commentary.
ALSO: styles.css has never been in any patch zip since v40, so the live
stylesheet predates the reel entirely (reel squares render unstyled), the
v42 charity-button treatment, and the v41 sheet restyle. Canonical final
code lives in the owner's true82-full-state-v42.zip; the finals will be
grafted from it exactly, never reconstructed from prose. Do not attempt a
reconstruction.

Already built and validated for v45 (unpackaged until the graft): Daily
rules sheet reorder (today's rule + Daily rules lead, GAME BASICS follows,
on the Daily sheet only); /api/traits?op=labels (settled core-trait labels
+ anti-labels for up to eight player-seasons, exact lower(name)+season
match, retired traits never label); wireTraitsLabels roster chips on the
results player cards (gold earned tag, crossed anti-label with aria,
maximum four per card, fail-soft absent). BUILD_V v45, app token
20260726-labels-v45, meta v45. Suites: 56+36+13+16 and 42+42, all green.


### v45 SHIPPED (2026-07-26): the v42 graft is done

The owner uploaded canonical v42-final app.js + styles.css. All 22 amendment
hunks were grafted with exact-text anchors and verified at marker parity
against the canonical file (compNetFor, shareCompFor(net,...), reel-done,
Dream/Redeem Team, post_daily_finish, comp-pct). styles.css ships WHOLE.
The per-game cap is DATA: sd.meta.scoring.PG_CAP in site_data.json (hence
DATA_URL sc-v42c); the deploy check is T82.t.SC.PG_CAP === 0.99. Manual
tags shipped as trait_editorial_v1 (0012) with community supremacy in
op=labels; roster chips render both sources identically. In-workspace
suites 62+36+13+16 and 43+42, all green. The devtools zip's
analytics-smoke and validate lanes need full-repo files the patch tree
does not carry (0006, sim-core.js, site_data.json): run them on the repo
checkout as `TRUE82_ROOT=<repo> node analytics-smoke.js` and
`TRUE82_ROOT=<repo> node validate.js`; the v42 walk asserts the W/L
squares and the cap binding directly.


### v46 SHIPPED (2026-07-26): PLAYER BONUSES + Presti uncap

The final Player Bonuses spec replaced the Player Traits front-end
direction; end-user copy in that spec is binding and was implemented
verbatim (PLAYER BONUSES, 1 / 5, UNSURE, WHAT COUNTS?, TRY AGAIN, the
four status chips, 5 VOTES IN, VOTE ON 5 MORE, BACK TO TRUE 82, the
share templates, no build numbers on the page). Internal names stay
traits_* everywhere. The voting page moved to /bonuses/ with per-question
routes at /bonuses/<slug> (Pages function swaps title/OG and injects a
preload; failures serve the untouched shell). /traits/ is a redirect
preserving q and src; pins by uncurated or retired ids degrade to a
normal curated session. Serving is curated-only through 0013's meta
table. Votes always store the canonical id even when cast by slug.

For the parallel agent: both harness suites were updated for v46.
test-traits.js runs migrations through 0013 and gained featured and
my_response checks. test-integration.js now builds its db with the full
0008-0013 chain and its jsdom walk drives /bonuses/ (selector [data-v],
chips instead of stamps, the new completion copy). If your local copy
predates this, take these versions.


### v46.1 addendum: design pass + haptics (same day)

The senior design pass landed on /bonuses/ (sequenced result reveal,
skeleton, atmosphere, amber discipline, focus management, sentence-case
question) with every animation behind prefers-reduced-motion and a
matchMedia-absence guard, which is why the jsdom walks pass unchanged in
timing. Haptics: buzz() in app.js now falls through to the iOS switch
toggle; the Bonuses page adds real switch overlays inside its five
primary buttons (tap forwarding via a stopPropagation click bridge, one
fire per tap, parent pointer-events lock covers the overlay when
controls lock). Walk assertions cover the skeleton, the overlays, and
result focus. OG: nine PNGs in /og/ generated from the 0013
share_preview values; regenerate with the same text if 0013 copy ever
changes.


### v46.2 addendum: live-test fixes (same day)

Comp selection reverted from NET to realized wins (owner ruling after
live play): the ladder literals were already ordinal one-win rungs, so
compAbove and shareCompFor now walk wins directly and compNetFor is
retired as dead code. Note for the validate.js lane: if it asserts the
v42 NET-keyed comp selection, that check will flag; the wins-keyed
behavior is the owner's current ruling and the ladder rungs themselves
are unchanged. The Top X% span inherits .res-comp typography (mono
0.86em rule removed), styles.css token is now v46. _routes.json is a
manual repo edit: add "/bonuses/*" to include; the patch deliberately
does not ship that file.


### v46.3 addendum: Presti realization (same day)

The realization guard now admits cap mode. The whole mechanism composes
without further changes: simSeason rolls under the Presti PG_CAP=1
override, e.winTally becomes the realized record before finishRunTail,
so clutchPending (winTally === 81) fires the Heat Check on a literal
realized 81 in any shape, hhWins(newNet) rewrites the record on a hot
spin, a cross of 82 fires the goat fireworks from inside hotHand, and
scheduleSharePct still sends raw e.net (pre-boost, pre-realization) so
the ranking law holds. A REALIZED 82-0 skips the Heat Check (nothing to
equalize) and gates fireworks on the paper as usual. hhEligible lives in
sim-core and already speaks cap mode. QA: ?clutch=1 still forces the
spin on any Presti result.


### v47 SHIPPED (2026-07-27): the homepage votes

Owner reviewed live v46 against a design mock: the module read flat and
buried, the third vote control looked orphaned, and nothing said votes
were changeable. v47 rebuilds the module as an inline voting card (TM
engine in app.js: featured-pinned session, YES/NO with buzz, compact
result beat, auto-advance ~1.5s, dots, completion, degrade-to-full-page
on any fetch trouble; analytics ride the same names with source
home_module, and feature_select now fires only from the two door
elements, never from votes). The mock's PLAYER TRAITS name and AFFECTS
THE SIM badge were corrected to PLAYER BONUSES and the bound consequence
line, since engine effects are not live yet. The page's three controls
share one group container, and CHANGE VOTE (action change_open) restores
live controls with the standing answer pressed. Walk mock now keys
status by question id, not call order.


### v47.1 addendum: blue-link fix, compaction, RATE YOUR FIVE (same day)

The tm-q anchor now inherits color (the v47 markup change to an inner
anchor had leaked UA blue); module compacted ~50px. The TM engine is
generalized (TM.source + TM.loader; tmStart/tmSessionLoader), the home
module and the results RATE YOUR FIVE card share the same markup and
ids (one mounts at a time in the SPA), and op=roster is the new worker
lane: sanitized name~season pairs, lazy INSERT with updated_at, two
hash-picked core traits per player, curated collisions serve the desk
sentence via the ordinary meta join. Junk-name generation is bounded by
the sanitizer and invisible outside the generating roster; note it in
any future abuse review. Suite coverage: roster serving, id-space
collision, lazy insert integrity, generated-vote settle, session leak
guard.

### v47.2 additive trait categories (2026-07-29)

Migration `migrations/0018_trait_categories_v1.sql` adds five core
voting/label categories without changing gameplay: Ball Stopper, Foul
Merchant, Stat Padder, Championship #1, and Ball Pounder. It contributes
124 curated active questions, 123 editorial `qualifies` seeds, and one
marquee unruled question: 2016 Draymond Green as a Ball Pounder
(`editorial_priority=150`, homepage eligible). Seed ranges are exactly the
owner request: Carmelo 2006-2015 and Kobe 2006-2012 for Ball Stopper; Shai
2023-2026 and Harden 2013-2020 for Foul Merchant; Westbrook 2017-2021 and
Drummond 2013-2020 for Stat Padder; every Finals MVP from 1974 through
2026 for Championship #1; Luka 2020-2026 and all 21 Chris Paul seasons
(2006-2026) for Ball Pounder.

This is a database-data expansion only: no worker, frontend, roster-generation,
`app.js`, simulation, scoring-constant, player-value, win, net-rating, tax, or
bonus code changes. Existing deterministic roster-generated question pairs
therefore do not reshuffle. The Stat Padder definition saying to decrease
engine value is the owner's poll proposition, not a live implementation
instruction. Labels remain shadow mode: editorial rulings appear immediately,
and settled community consensus supersedes them. Apply 0018 after 0017.
Current CHECK-STATE expectation:
20 traits / 17 core / 3 retired; 220 questions / 205 active; 144 editorial;
200 meta; 30 homepage.

### v47.3 additive editorial label expansion (2026-07-30)

Migration `migrations/0019_editorial_label_expansion_v1.sql` is a pure-data
expansion generated from the owner-approved 360-row JSONL editorial set. It
adds 344 previously absent player-season/trait questions, 344 provisional
editorial rulings, and 344 active public metadata rows. Sixteen requested
combinations were already present through earlier migrations and are not
overwritten, so the intended dataset resolves to exactly 360 combinations
across 120 player-seasons: 290 positive labels and 70 anti-labels.

No executable file changed. In particular, `app.js`, `functions/api/traits.js`,
roster question hashing, homepage rotation, simulation, values, net rating,
wins, taxes, and bonuses are untouched. The new metadata makes the questions
eligible for ordinary five-question sessions, but every new row has
`homepage_eligible=0`; the homepage pool remains 30. Editorial rulings appear
immediately on exact player-season cards, and later decisive community
consensus supersedes them under the existing rules. Apply 0019 after 0018.
Expected CHECK-STATE after 0019: 20 traits / 17 core / 3 retired; 564 questions
/ 549 active; 488 editorial; 544 meta; 30 homepage.


## V47.4 additive homepage question expansion
- New migration: `migrations/0020_homepage_superstar_controversy_v1.sql` marks 25 existing superstar questions homepage-eligible; no new schema or voting logic.
- One isolated executable change exists in `functions/api/traits.js`, only inside `op === "featured"`: query limit 40→80 and alternate fresh questions with the eight mature questions closest to 50/50.
- Purpose: under the previous mature-only branch, newly eligible zero-vote questions could not appear once three questions had five votes.
- No simulation, scoring, label, vote-write, consensus, or identity code changed.


## v47.6 — two-answer question ceiling (2026-07-31)

Narrow feed-selection change only. No migration. `trait_votes_v1.changed` already increments on every repeat submission, so it is reused as answer depth (`answer_count = changed + 1`). Algorithmic feeds now exhaust never-answered questions, then once-answered questions, before allowing any question answered twice or more. Direct question links remain explicit overrides. The homepage/results clients briefly wait for the existing retention identity handshake so selection uses the same anonymous browser identity recovered from the analytics localStorage fallback. Results-roster questions merge with curated feed questions when fewer than five roster questions remain under the ceiling. No simulation, scoring, label, consensus, or vote-tally semantics changed.

### 2026-07-31: 0023 second homepage controversy pack

Added `migrations/0023_homepage_superstar_controversy_v2.sql` plus its verifier. This is SQL-only and promotes 25 existing active questions to the homepage, with sharper public/share copy and priority >=97. No executable code changed; do not re-audit the trait API, vote guard, trait-card UI, or game engine for this addition.
