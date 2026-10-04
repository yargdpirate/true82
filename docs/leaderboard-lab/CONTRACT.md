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
