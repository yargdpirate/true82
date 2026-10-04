# READ THIS FIRST. IT OVERRIDES EVERYTHING BELOW IT.

**2026-10-04, the owner, directly:** the leaderboard markup and styling you may have inherited is a
PLACEHOLDER, not a thing to preserve. His words: "what was provided going in is just a placeholder,
not my absolute favourite thing. actually i don't like it much at all tbh and i bet the previous agent
told you to stick to it. ignore that. make what's good first and foremost from a UI/UX/fun/artistic
showoff/addictiveness perspective, unshackle yourself from what you inherited."

So, explicitly **cancelled** as requirements:

- ~~"reuse the real `.lb-*` components so the site's own CSS styles it"~~. That single rule is why
  round one produced eleven restyled tables: the markup was committed to being a table before any
  designer touched it. **A board does not have to be a list. A row does not have to be a row.** If the
  best answer is a stack of cards, a strip of film, a printed poster, a wall of tickets, a bracket, a
  shelf, or something with no precedent in this repo, build that.
- ~~"at most two control rows"~~ as a law. It is a phone REALITY to respect, not a cage. If a better
  navigation needs no rows at all, or one row and a gesture, that is better.
- ~~"tokens only"~~ as a frontend cage. In the LAB, use whatever colour and ink the design needs,
  including the art engines' own output. Tokens remain the right mechanism where a theme role already
  means the thing you want (`--t-you` is the viewer, `--t-hot` is fire gold, red is bad), and anything
  that ships later gets tokenized then. Do not let it stop a good design now.
- ~~the shipped sheet, the shipped tabs, the shipped overlay~~. All placeholders. Replace them.

**What is NOT cancelled, because it is his and not inherited:**

1. **The GOAT Climb artwork on the results screen stays.** Round one's variants that removed or
   replaced it are rejected. He wants the player drawn INTO the board, not a link smuggled beside art.
2. **Plain words, no em-dashes, no guilt, no countdowns, no streak-shaming.** Standing house rules.
3. **It has to read at 320px** and be reachable with a thumb. Not a style opinion, a device.
4. **The board must stay honest**: only the server's own replay of a run can rank. That is the entire
   reason the account exists.
5. **Core gameplay does not change.**

And the standing brief above all of it: this is a showcase for the game's art, and it should be worth
looking at **even by someone who does not care about the scores.** Round one failed that test. Judge
your own work against it before you report.

---

# Leaderboard Lab — the build contract

Read `SPEC.md` first: it is the design this lab exists to let the owner choose from. This file is the
mechanical contract between the lab's files, so five people can build them at once without colliding.

## What the lab is

One phone-first page at `docs/leaderboard-lab/index.html`, no build step, served straight off the
branch preview (`https://<branch>.true82.pages.dev/docs/leaderboard-lab/`). The owner opens it on his
phone, flips toggles, stars what he likes, and pastes `T82-` codes back into chat. Exactly the way
`docs/reprint-lab/` and `docs/art-lab/` already work.

It shows three surfaces inside a phone frame:

1. **start** — the REAL home screen, fetched and framed, with a candidate leaderboard link injected
   into the real `.hm-top`. Real markup, real CSS, real title art, so what he judges is the site.
2. **boards** — the leaderboard sheet, built from the real `.lb-*` and overlay components, filled
   with believable fake rows.
3. **results** — the post-game screen with a candidate leaderboard hook. A RECONSTRUCTION of the
   results card from the real class names (a real one cannot be captured without playing a game), and
   the console says so out loud.

## Hard rules, all of them inherited from the site

- **Plain JavaScript, ES5 style.** No libraries, no build tools, no bundler, no network except the
  site's own files. The files are loaded with plain `<script>` tags in the order below.
- **No em-dashes in any copy** the owner will read. Plain words. This is a standing house rule.
- **No guilt, loss framing, countdowns or streak-shaming copy anywhere.** Also standing. A streak is
  a patch you earned, never a leash.
- **Colour and type come only from `var(--t-*)` tokens**, optionally through `color-mix`. Never a raw
  hex, never a raw font stack, in any CSS a look or a surface generates. Sizes, spacing and layout are
  free. (`tools/style-law.js` does not scan this folder, so this rule is on us to keep.)
- **Phone first.** Everything must read at **320px** and look right at 375px. Test both.
- **Deterministic.** No `Math.random()` anywhere. All fake data comes from `LB.data.rng(seed)`, so a
  `T82-` code reproduces the exact screen the owner starred.
- **Never edit anything outside `docs/leaderboard-lab/`.** The lab reads the site's real files; it
  never changes them.

## Files and owners

Loaded in this order by `index.html`:

| file | owns |
|---|---|
| `lab.css` | the lab's own chrome: console, controls, phone frame, code pills. Not the board. |
| `data.js` | `LB.data` — believable fake rows for every board |
| `looks.js` | `LB.looks` — the art directions, as scoped CSS generators |
| `boards.js` | `LB.boards` — the board slate, the segment architecture, the board markup |
| `surfaces.js` | `LB.surfaces` — the start-screen link variants and the post-game hook variants |
| `lab.js` | the console, the recipe, encode/decode, star codes, the phone stage. **Not yours.** |

Every module does exactly this and nothing else:

```js
window.LB = window.LB || {};
LB.data = { /* ... */ };          // data.js
```

No module touches the DOM at load time. No module reads `LB.recipe` directly: everything takes the
recipe as an argument.

## The recipe

`lab.js` owns this object and passes it to every generator. These are all the keys there are:

```js
LB.DEFAULT = {
  view:      "boards",   // "start" | "results" | "boards"
  slate:     "spec",     // "spec" = the 7-board slate in SPEC.md, "shipped" = today's five
  board:     "today",    // the open board's id, from LB.boards.slate(recipe).list
  scope:     "week",     // "today" | "week" | "month" | "all" — only where the board offers it
  around:    true,       // true = AROUND YOU window, false = TOP of the list
  youRank:   9,          // where the viewer sits, 1..400. 0 means not on this board at all
  field:     4412,       // how many GMs are on the board
  rows:      12,         // how many rows to render
  empty:     false,      // show the board's empty state instead of rows
  signedIn:  true,       // false shows the signed-out ghost line
  hasRun:    true,       // false = signed out AND never finished a game (no ghost number to show)
  showTag:   true,       // print the #TAG beside a name
  crowd:     true,       // the crowd-context line above the list
  startLink: "quiet",    // an id from LB.surfaces.START
  postGame:  "pct",      // an id from LB.surfaces.POST
  look:      "boxscore", // an id from LB.looks.LIST
  width:     375,        // 320 | 375 | 390
  seed:      82          // the fake-data seed
};
```

`signedIn: false` with `hasRun: true` is the most important state in the whole lab: it is the
signed-out player who just finished a season, and the ghost line is the single strongest honest reason
to make an account. `hasRun: false` must also render correctly: there is no number to show, so the
line becomes an invitation, never a fake rank.

## `data.js` — `LB.data`

```js
LB.data.rng(seed)            // -> function returning a float in [0,1). A small LCG. Deterministic.
LB.data.gms(n, seed)         // -> [{ name, tag }]  believable GM names (see below) and 4-char tags
LB.data.board(boardId, recipe)
```

`LB.data.board` returns:

```js
{
  rows: [ { rank, name, tag, score, sub, you } ],   // score and sub are DISPLAY STRINGS, already formatted
  field,            // number of GMs on this board
  median,           // a display string for the crowd line, or null to suppress it
  crowd,            // the whole crowd line as plain words, or null
  you,              // { rank, score, outOf } or null when the viewer is not on it
  note,             // the board's own qualification note, plain words
  emptyWhy          // what the empty state says, plain words
}
```

Rules for the data, because believability is the whole point:

- **Score shapes must match the board.** Records read `78-4`; nets read `+19.8`; money reads `$38M`;
  streaks read `12 days`; a monthly sum reads `734` with `sub` saying `10 of 10 days`; the 82-0 Club
  is a list of dates and modes rather than scores.
- **Distributions must be plausible, not uniform.** Records cluster in the 60s and 70s and thin out
  hard toward 82; nets cluster around +10 to +20; money has a hard floor. A board's top five should
  be close together, not a straight line down.
- **Ties must happen,** because the real Daily gives everyone the same board and ties are the common
  case. Tie-break ordering must be visible and stable.
- **The viewer's row** appears at `recipe.youRank` with `you: true`, and when `around` is true the
  window is the rows either side of it with the leader pinned above. When `youRank` is 0 the viewer is
  absent and `you` is null.
- **Names**: a believable mix of basketball-flavoured handles, plain first names, and `GM-XXXX`
  defaults (the real fallback). Two rows must share a display name somewhere in the set, so the owner
  can see why the `#TAG` toggle exists. No real player names, nothing offensive, no em-dashes.

## `looks.js` — `LB.looks`

```js
LB.looks.LIST = [
  { id: "boxscore", name: "Box score", note: "one line of plain words",
    css: function (recipe) { return "..." } }
];
```

- Every selector must be scoped under `[data-look="<id>"]`, which `lab.js` sets on the frame's
  `<html>`. Nothing may leak between looks.
- Tokens only for colour and type. The eleven directions are specified in `SPEC.md` under "Art looks";
  build those, keep their names, and add your own only if one of them cannot be built.
- Each look must stay legible at 320px: the rank, the name and the score all readable, your own row
  findable without relying on colour alone.
- A look that wants a canvas (the riso directions) gets one: `lab.js` will call
  `look.paint(frameDoc, recipe)` after mounting if the look defines `paint`. Use the site's real
  engines off the frame's window (`T82PRINT`, `T82RISO`) and fail soft if they are absent.

## `boards.js` — `LB.boards`

```js
LB.boards.slate(recipe)      // -> { list: [ board ] }   board = { id, tab, title, note, scopes, modes, views }
LB.boards.render(recipe, data)   // -> html string for the whole board sheet
```

- Two slates: `spec` (the seven-board slate in `SPEC.md`) and `shipped` (today's five, so the owner
  can flip back and see what changed).
- The markup MUST reuse the real components so the site's own CSS styles it:
  the sheet is `<div class="rules-overlay"><div class="rules-sheet acct-sheet plq-frame">`, the head is
  `.rs-head` + `.rs-title` + `.rs-close`, the body is `.rs-scroll`, the tabs are
  `.lb-tabs` > `.lb-tab tm-flat` (**`tm-flat` is required**: without it app.js's button decorator
  paints every tab as a gold keycap), the list is `.lb-list` > `.lb-row` > `.lb-rank` / `.lb-name` /
  `.lb-score`, and the viewer's row adds `.lb-you`. New parts get new `.lb-*` class names.
- The segment architecture is specified in `SPEC.md`. Honour its central constraint: **at most two
  control rows on a phone**, and a third axis becomes a text button in the list header or a chip on
  the row, never a third row.
- Render every state: rows, the AROUND YOU window, the empty state, the signed-out ghost line, the
  ranked-but-off-page case ("you are 412th of 4,412"), and the not-on-this-board case. These are
  different sentences and must not be confused with each other.

## `surfaces.js` — `LB.surfaces`

```js
LB.surfaces.START = [ { id, name, note, mount, html: function (recipe) {}, css: function (recipe) {} } ];
LB.surfaces.POST  = [ { id, name, note, mount, html: function (recipe, data) {}, css: function (recipe) {} } ];
```

`mount` for START is always `"hm-top"`: the centre of the real top bar, which is empty today
(`.hm-top` is `justify-content: space-between` with exactly two children). Two measured constraints
from the audit, both hard:

- At 320px the free centre is **92.7px** between the 103.65px HOW TO PLAY button and the fixed 44px
  account slot. A label wider than that either collides or pushes the row. "Boards" is 48.6px and
  "Top scores" is 73.5px at 600 14px Rubik.
- The link must **not** live inside `.brand-art`: renderIntro attaches the five-tap Kaman egg to that
  element, so a link inside it feeds the egg. If anything ever is placed there, its handler must call
  `stopPropagation()` first.

`mount` for POST is one of `"after-comp"` (directly under `.res-comp`, where the "Top X%" line already
appears), `"actions"` (a sibling button in `.actions`), `"bottom"` (the reserved `#runStatus` slot) or
`"sheet"` (a `.t-sheet` over the results, once per session).

Build the six START and six POST variants named in `SPEC.md`, keeping their names. Each must be
distinguishable from the others in a phone screenshot: that is the whole job.

## Copy

Every string the owner reads is product copy and will be judged as such. Plain words, no em-dashes,
sentence case, no legends, no exclamation marks, nothing that implies the player has failed or is
running out of time. "Half the room finished under 70-12" is a fact about the board. "You are falling
behind" is not allowed.

---

# ROUND TWO (2026-10-04, after the owner saw it)

His verdict, in his words: the art directions have "little to no difference from each other, some are
virtually identical", the whole thing is "the ugliest and most boring by far", it "feels like a
spreadsheet", "we don't even use the secondary app palette colour, that seafoam green", and
"anti-spreadsheet the look way harder". He is right, and the measurement says exactly why.

## What was actually wrong, measured

All eleven looks DID apply (eleven distinct computed-style signatures). They differed only in **type
and text colour**. Measured across all eleven on the live lab:

- `backgroundImage` on the sheet and on every row: **`none`, in all eleven**, including the one called
  "halftone".
- The sheet itself: **byte-identical in all eleven** (`rgb(22,18,43)`, 18px radius, no texture).
- Canvases inside the board sheet: **zero**.
- Only 4 of 11 looks even defined `paint`, and none of them produced anything.

So eleven fonts on one grey table. That is a spreadsheet with a stylesheet.

## The resources that were sitting unused

Every one of these is already loaded in the frame and was confirmed live:

| handle | what it gives you |
|---|---|
| `T82PRINT.paper(rootEl)` | the real riso paper stock as a JPEG data URL (confirmed: 16 KB). One line makes the sheet paper instead of a grey box. |
| `T82PRINT.poster(spec, cb, opts)` | a full riso poster render |
| `T82PRINT.print` / `.mount` / `.scenes` / `.fonts` / `.theme` | the results print engine |
| `T82RISO.create` / `.strip` / `.kit` / `.inks` / `.theme` | the reel engine: month strips, ink order, the kit |
| `T82FX.play` / `.prime` / `.use` / `.slots` | the riso FX layer |
| `T82ART.catalog(kind)` / `.get(kind, id)` / `.load` / `.deal` | **the art library** |

`T82ART.catalog()` returns, right now, in this repo:

- **19 scenes**: alpine, constellation, dunes, forest, glacier, glass, goatpeak, kintsugi, lighthouse,
  mars, parade, rafters, ridgelines, savanna, skyline, summit, sunrise, volcano, wave
- **43 print treatments** (the `loss` kind, which is a misleading name: they are riso printing
  accidents and techniques): bigtype, blot, brayer, brush, copier, crumple, drum, extrude, fold,
  fountain, gangrun, ghosting, headline, knockout, linescreen, marbling, melt, misfeed, moire, opart,
  overprint, polaroid, ransom, receipt, ripple, rundry, scratch, seal, separation, setoff,
  showthrough, spill, spray, square, squeegee, stencil, sticker, tape, tear, testsheet, trim,
  typewriter, woodtype
- **8 heat effects**: arcade, comicheat, emojifire, jam, phoenix, pulse, solar, thermo

**Nobody needs to invent art. Seventy pieces exist. Use them.**

## The palette, in full

The looks spent `--t-accent` (pink) and neutrals and almost nothing else. The second ink he named is
`--t-offset` / `--t-win` / `--t-print-pop` = **`#41C6EA`**, the aqua the Daily tile and the reel's
winning coins already wear. Also unused: `--t-sun` #FFB511, `--t-hot` #FFD54A (fire gold, the hot
pick), `--t-metal` #9D7AD2 (bronze ornament), `--t-good` #32A66E, `--t-print-dusk` #FF7F3A,
`--t-print-night` #9D7AD2, `--t-paper` / `--t-paper-2` / `--t-ink` (the paper world).

Standing meanings that still bind: red and `--t-bad` mean BAD, the hot pick is fire gold, `--t-you` is
the viewer, one meaning per colour.

## New files in round two

| file | owns |
|---|---|
| `art.js` | `LB.art` — a thin adapter over the real engines, so looks.js and nav.js never touch them directly |
| `nav.js` | `LB.nav` — how you GET to a board. A new axis: he dislikes the pills. |

## New recipe keys

```js
nav:   "pills",   // an id from LB.nav.LIST
paper: true       // the riso paper stock under the sheet, so he can see it on and off
```

## `art.js` — `LB.art`

```js
LB.art.ready(frameWin)                  // -> bool: are the engines present in that window
LB.art.paper(frameDoc)                  // -> a CSS background-image value for the riso stock, or ""
LB.art.catalog(frameWin, kind)          // -> [id]  kind: "scene" | "loss" | "hot"
LB.art.scene(frameWin, id, el, opts)    // paint scene `id` into element `el` (it makes its own canvas)
LB.art.treat(frameWin, id, el, opts)    // paint print treatment `id` into/over `el`
LB.art.strip(frameWin, el, opts)        // a reel month strip into `el`
LB.art.inks(frameWin)                   // -> the ink order the reel uses
```

Every one fails soft and silent: no engine, no canvas support, a look that throws, and the board still
renders as plain markup. A lab that goes blank because an art engine moved is worse than a dull lab.

## What a round-two look has to do

A look is **not** a type change. To count, it must change at least three of:

1. **The ground.** The sheet is paper, or night stock, or a scene, or a printed poster. Not a grey box.
2. **The row as an object.** A ticket, a plate, a card, a strip of film, a scoreboard slat, a stamped
   impression. Rows may stop being rows.
3. **Real ink.** Halftone, misregistration, overprint, grain, starvation: from the engines, not from a
   CSS gradient pretending.
4. **The second ink.** `--t-offset` aqua carrying real meaning, not decoration.
5. **Hierarchy.** The leader is a different KIND of object from row 40, not the same row in bold.

Fewer than three and it is a theme, not a direction. Build fewer, louder looks rather than eleven
quiet ones: **six that are unmistakable beats eleven that are not.**

## `nav.js` — `LB.nav`

```js
LB.nav.LIST = [ { id, name, note, html(recipe, slate, data), css(recipe), wire?(frameDoc, set) } ];
```

How the player gets from one board to another, as a real design question rather than a row of pills.
The constraint is unchanged: at most two control rows, 44px targets, 320px, and it must feel like the
game and not like a database client.

## The post-game rule that is now absolute

**The GOAT Climb artwork stays.** His words: "it's beautiful the way it is", and the round-one variants
that removed or replaced the results artwork are rejected outright. He does not want a link smuggled
beside it. He wants the player *drawn into* the board.

Worth seeing before designing: the Climb (app.js `climbHtml`) is ALREADY a leaderboard. It is a
vertical ladder with pins for the greatest teams in history and a marker showing where your season
sits among them. The leaderboard asks the same question about living players. A direction that uses
the Climb's own language, rather than competing with it, is the one most likely to work.

Percentile reporting already exists on the results screen (`.res-comp` + `.comp-pct`), so repeating it
is not a new hook and does not count as one.
