# The art library: how to add a look (v67)

## Removing a look

One command, from the repo root (the look is `<kind>/<id>`: its file is `art/<kind>/<id>.js`):

```
node tools/art-remove.js loss/seal                # several at once: node tools/art-remove.js loss/seal dots/balls
node tools/art-remove.js loss/seal --dry-run      # only shows what it would do
```

It deletes the file and every line that names the look (its speed-dial line in art/tempo.json, its entry in
art/enabled.json's `off` list, its entry in art/ledger.json), regenerates art-index.js (which also drops the file from
tools/cache-keys.json), bumps BUILD_V in app.js, stamps a fresh cache key (or `--key K`), runs
`node tools/art-index.js --check` and `node test.js`, and prints what it did and the exact `git add` / `git commit`
to run. It never commits, and it is all or nothing: if any step fails it puts every file back as it was (the deleted
look too) and says what failed. Nothing else in the
game, the lab or the harness names a particular look, so nothing else needs editing; any mentions left in comments or
docs are listed, and are harmless.

- **The built-ins cannot be removed** (`classic` in loss, dots, hot, perk and goat; `lake` in scene): they live inside
  the engines, not in files, and they are what plays whenever another look is missing. The tool refuses them.
- **To only hide a look from the game** (it stays in the lab, marked OFF IN GAME, and can come back by deleting the
  line), add `"<kind>/<id>"` to art/enabled.json's `off` list, run `node tools/art-index.js`, stamp a key and run
  `node test.js`. This works for the built-ins too (`"perk/classic"`: never dealt, still the stand-in).

The reel's giant L, the reel's win and loss dots and the results print each come in many looks, one small file per
look, dealt from a shuffle bag so a player sees every look once before any repeats. This is the how-to. The spec is
**art/CONTRACT.md** (every signature, rule and budget; if this guide and the contract disagree, the contract wins).
Read **art/CRAFT.md** before drawing (the riso craft on this dark stock) and pick a brief from **art/CONCEPTS.md**.

| kind | folder | what it draws | built-in (inside the engine) | budget |
|---|---|---|---|---|
| `loss` | art/loss/ | the big moment on each of a season's first 14 losses | `classic`, the draining L (reel-riso.js) | 10 KB |
| `dots` | art/dots/ | every win and loss stamp of the ledger, for a season | `classic`, coins and drips (reel-riso.js) | 6 KB |
| `scene` | art/scene/ | the picture of the season on the results print and poster | `lake`, mountains over a lake (results-riso.js) | 16 KB |
| `scene`, `perfect: true` | art/scene/ | an 82-0 season's picture (only 82-0 gets one), with a title and live motion | none (no perfect scene: the lake) | 20 KB |
| `hot` | art/hot/ | the Heat Check's seven beats: the wheel's five tiers, the save, the miss | `classic`, today's sprays in riso (riso-fx.js) | 14 KB |
| `perk` | art/perk/ | Presti's REFUND and FIRE SALE pop-ups at the cost buttons | `classic` (riso-fx.js) | 10 KB |
| `goat` | art/goat/ | one 82-0 firework burst, fired in volleys of nine | `classic` (riso-fx.js) | 8 KB |

The last four are part two (**art/CONTRACT-FX.md**): their how-to is "The FX kinds and the 82-0 pictures" below.

## Adding a look in five steps

1. **Name it and start from a template.** The id is the file's name: lowercase letters, digits and hyphens
   (`art/loss/rubber-seal.js` registers `"rubber-seal"`), never a built-in's (`classic`, `lake`). Copy the example of
   its kind below (or a pilot: art/loss/seal.js, art/dots/balls.js, art/scene/skyline.js). The file is one ES5 IIFE
   that calls `T82ART.add(kind, id, { name: "...", by: "...", ... })` exactly once, with `name` a plain string.
2. **Watch it while you draw.** Serve the repo (`python3 -m http.server 8000` from the repo root) and open
   `http://localhost:8000/docs/art-lab/qa.html?watch=loss:<id>` (or `dots:<id>`, `scene:<id>`). It loads your file
   straight from art/ (no index needed yet) and plays it on a loop: a loss in its three moments (the first loss after
   a streak, a mid-season one, the 14th of a bad year), a dot set over a whole season, a scene's reveal across four
   records and its lights. Check it at 375 px AND 320 px wide (the owner's phones).
3. **Run the harness until it passes:** `node tools/art-qa.mjs <kind> <id> --webkit` (about a minute). It writes
   contact sheets and a report (below) and exits 1 on any failed budget or check.
4. **List it and key it** (from the repo root):
   ```
   node tools/art-index.js                    # lists it in art-index.js; the file joins tools/cache-keys.json
   node tools/cache-keys.js --stamp <key>     # keys every changed file (yours, then art-index.js), e.g. 20261002-v68
   node tools/art-index.js --check            # passes
   ```
   The index generator refuses a file whose id is not its name, whose kind is not its folder, that calls add more
   than once, whose `name` is not a plain string, that sets `builtin`, or that is not ES5 (it names each newer form
   and its line: an old iPhone could not parse the file, so the look would never load there). To keep a look in the
   lab but out of the game, add `"kind/id"` to `off` in art/enabled.json and run the first line again. The stamp
   re-keys art-index.js in index.html, so a release of new art is a client release like any other: the footer law in
   app.js (BUILD_V) applies.
5. **Check the site and play it.** `node test.js` (it checks the index, the names, the sizes and the copy law) and
   `node tools/style-law.js` must pass. Then play a Classic draft on your local server with
   `http://localhost:8000/?art=loss:<id>` (every heavy loss plays it; `loss:a+b` alternates two; `dots:<id>`,
   `scene:<id>`; combine with commas). `?art=` works on any host but true82.net. On a plain static server the game's
   /api calls fail (404 and 501 in the console): that is the server, not the art.

## The examples (each one passes the harness)

**A loss moment** (art/loss/stencil.js). Prep screens the L once; the frame only moves it.

```js
(function () {
  "use strict";
  var W = 180, H = 220;                                  // the plate, in css px
  var LX = 103, LY = 110, LH = 192;                      // the L's center on the plate, and its height (14 to 206)
  T82ART.add("loss", "stencil", {
    name: "Stencil L",
    by: "A stencilled L slams in over a sprayed bar and fades.",
    prep: function (K) {                                 // K.box is null here: print at a fixed size
      var st = K.st;
      return [
        function () { st.P = K.plate(W, H, 7001); },
        function () {
          st.L = K.screen(st.P, "loss", function (g) {   // tone in css px; the engine screens it into dots
            g.fillStyle = K.tone(0.95);
            g.beginPath();                               // one closed contour (art/CRAFT.md)
            g.moveTo(40, 14); g.lineTo(86, 14); g.lineTo(86, 160); g.lineTo(166, 160);
            g.lineTo(166, 206); g.lineTo(40, 206); g.closePath(); g.fill();
          });
        }
      ];
    },
    draw: function (K, E, e) {
      var st = K.st, B = K.box, g = K.g, f = K.fade(E, e);
      if (!st.L || f <= 0) return;
      var s = (B.y1 - B.y0) / LH;                        // the L fills the box's height: the caption sits under it
      var z = 1 + 0.4 * (1 - K.ease.out(e / 0.12));     // lands from 1.4x in 0.12 s
      g.save();
      g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      g.translate(B.cx, (B.y0 + B.y1) / 2);
      g.scale(s * z, s * z);
      g.translate(-LX, -LY);                             // plate coordinates from here on
      g.fillStyle = K.pat("pop", 0.6, g);               // a live fill: take the pattern after the transforms
      g.fillRect(30, 168, 140, 26 * K.ease.out(e / 0.3));
      g.drawImage(st.L, 0, 0, W, H);
      g.restore();
    }
  });
})();
```

No `hit`, `veil` or `caption`, so it gets the classic slam (rings, spray, flash, shake), the classic veil and the
classic caption under the box. `hit: function () {}` turns the slam off; `veil: false` and `caption: false` too.

**A dot set** (art/dots/chips.js). Every plate function runs for every stamp of the month, every frame the strip
redraws, so keep them small.

```js
(function () {
  "use strict";
  var TAU = Math.PI * 2;
  T82ART.add("dots", "chips", {
    name: "Chips",
    by: "Wins pop in as round coins, losses slam down as square chips; a coin on a streak flares as it lands.",
    reach: { w: 1.5, l: 2.1 },                           // the coin pops to 1.3R; the chip's corner reaches 1.4 x 1.41R
    live: { w: 0.2, l: 0.3 },                            // each is still before its window ends (0.15 s, 0.2 s)
    inks: { a: "win", b: "pop", c: "loss" },
    a: function (K, g, D, c, R, e) {                     // plate a: the coin
      if (!D.win) return;
      var s = 1 + 0.3 * (1 - K.ease.out(e / 0.15));
      g.fillStyle = K.tone(0.95); g.beginPath(); g.arc(c[0], c[1], R * s, 0, TAU); g.fill();
    },
    b: function (K, g, D, c, R, e) {                     // plate b: from 10 straight, a ring flares as the coin lands
      if (!D.win || D.streak < 10 || e >= 0.15) return;  //   and is gone by 0.15 s: no streak mark stays
      g.strokeStyle = K.tone(0.8 * (1 - e / 0.15)); g.lineWidth = R * 0.2;
      g.beginPath(); g.arc(c[0], c[1], R * (1.05 + e * 1.3), 0, TAU); g.stroke();
    },
    c: function (K, g, D, c, R, e) {                     // plate c: the chip
      if (D.win) return;
      var s = 1 + 0.4 * (1 - K.ease.out(e / 0.2));
      g.fillStyle = K.tone(0.95); g.fillRect(c[0] - R * s, c[1] - R * s, 2 * R * s, 2 * R * s);
    }
  });
})();
```

No `marks`, so each loss still gets classic's seeded drips, splats and cracks on `D` (unused here); no `win` or
`lossHit`, so the classic sparks and bursts play. A real set keeps the drips (the owner's rule: every loss reads at
the end). A streak shows only in the moment (the owner, 2026-10-02: "animations are great, persistent remainders on
streaks of it are not"): a flare inside the live window, a burst in `win()`, never a mark on the settled coin.

**A scene** (art/scene/bars.js). Tone only: the engine inks, screens, clips and reveals each layer.

```js
(function () {
  "use strict";
  T82ART.add("scene", "bars", {
    name: "Bar Chart",
    by: "One bar per game for the running margin under a halftone sky; every loss a dot on the line.",
    lights: ["golden", "dusk", "night"],
    layers: function (K, P, D, L) {
      var bw = (L.X1 - L.X0) / 82;
      function y(i) { return L.WL - L.SC * D.m[i]; }
      function sky(g) {
        g.fillStyle = K.vgrad(g, L.FY0, L.WL, [[0, 0.5], [1, 0.05]]);
        g.fillRect(L.FX0, L.FY0, L.FX1 - L.FX0, L.WL - L.FY0);
      }
      function bars(g) {
        g.fillStyle = K.tone(0.9);
        for (var i = 1; i <= 82; i++) g.fillRect(D.X(i - 1) + bw * 0.1, Math.min(y(i), L.WL), bw * 0.8, Math.abs(L.WL - y(i)) + 1);
      }
      function line(g) {
        g.strokeStyle = K.tone(0.95); g.lineWidth = 4 * L.rs; g.lineJoin = "round";
        g.beginPath(); for (var i = 0; i <= 82; i++) g.lineTo(D.X(i), y(i)); g.stroke();
        g.fillStyle = K.tone(1);
        D.losses.forEach(function (j) { K.circle(g, D.X(j + 1), y(j + 1), 6 * L.rs); g.fill(); });
      }
      return [
        { ink: "light", role: "sky", draw: sky },
        { ink: "blue", role: "land", draw: bars },
        { ink: "pink", role: "line", draw: line }
      ];
    },
    body: function (g, D, L) {                           // the gauge's front line runs down through the bars only
      for (var i = 0; i <= 82; i++) g.lineTo(D.X(i), L.WL - L.SC * D.m[i]);
      g.lineTo(D.X(82), L.WL); g.lineTo(D.X(0), L.WL); g.closePath();
    }
  });
})();
```

The engine adds a blank `light` and `pink` land layer for the 82-game strip, prints the registration marks, the title,
the roster and the gauge's front line. `body` says where that line runs: here, down through the bars (without one it
runs under the lake's ridge and water, which a scene of another shape should not leave as it is).

## The kit, on one page

Everything a look draws with comes from `K`; nothing else (no colors, fonts or randomness of its own).

| | the reel (loss, dots) | the scene |
|---|---|---|
| inks | `loss` (the hero), `pop`, `key`, `night`, `light`, `stock`, `win` (a win only), `gold` (a hot streak only), `dusk` | `light` (the painting's: sun, dusk orange or night violet), `pink`, `blue`, `sun`, `orange`, `teal` |
| tone (coverage) | `K.tone(a)`: black at alpha a, the only black you write | the same |
| live ink | `g.fillStyle = K.pat(ink, cov, g)` after your transforms; `g.globalCompositeOperation = K.blend` | none: the engine inks every layer |
| printed ink (prep) | `P = K.plate(w, h, seed)`, `K.screen(P, ink, draw)`, `K.levels(P, ink, draw, covs)` (`.jobs`, `.at(i)`) | every layer is screened for you |
| motion | `K.ease.out/inOut/back/elastic/bounce`, `K.clamp`, `K.lerp`, `K.smooth`, `K.fade(E, e)` | `K.ease(t)`, `K.clamp`, `K.lerp`, `K.smooth` |
| randomness | `K.rand(seed)` (mulberry32) with `E.seed`, or `D.gi` in `marks` | `K.rand(D.seed)`, `K.noise1D`, `K.fbm` |
| type | `K.font(w, px, "disp"/"mono")`, `K.text(g, s, x, y, { ink, cov, align, spacing })` | `K.font`, `K.spacedText` |
| shapes | canvas paths | `K.circle`, `K.ellipse`, `K.vgrad`, `K.knock`, `K.knockRadial`, `K.trace`, `K.seams` |
| hits (reel only) | `K.ring({...})`, `K.spark({...})`, `K.shake(dur, amp)`, `K.flash(s)` (in `hit` only), `K.jolt`, `K.hitClassic(E)`, `K.caption(E, e, x, y)` | |
| where | `K.g` (the card, css px), `K.box` (the hero's span), `K.w`, `K.h`, `K.top`, `K.st` (your prep's state), `K.ready` | `D` (the season), `L` (the layout), `P` (the plate) |

The two engines name the same theme inks differently (an old split): the scene's `pink` is the reel's `pop`, `blue`
is `key`, `sun` is `gold`, `orange` is `dusk`, `teal` is `night`.

One line each, for the three kinds:

```js
// loss, in draw: the hero, live, in the loss ink, pinned to the screen while it moves
g.save(); g.globalCompositeOperation = K.blend; g.translate(K.box.cx, K.box.cy); g.rotate(-0.1);
g.fillStyle = K.pat("loss", 0.85, g); g.fillRect(-20, -K.box.size * 0.4, 40, K.box.size * 0.76); g.restore();
// dots, in marks then a plate: seeded per game, so the reprint matches
var r = K.rand(((D.gi + 1) * 2654435761) >>> 0); D.tilt = (r() - 0.5) * 0.4;
// scene, in a layer's draw: knock the moon out of the sky
K.knock(g, function (g2) { K.circle(g2, D.moon.x, D.moon.y, D.moon.r); g2.fill(); });
```

## The harness and its report

```
node tools/art-qa.mjs loss <id>      the loss in three moments, frames at fixed times; frame, prep and memory vs classic
node tools/art-qa.mjs dots <id>      a 70-12 ledger settled and live, a win and a loss mid-stamp at 4x; costs vs classic
node tools/art-qa.mjs scene <id>     banners for 82-0, 64-18, 41-41, 20-62 in each light, the poster, the reveal
node tools/art-qa.mjs all [kind]     every look (unindexed files too) plus side-by-side rows of all of them
node tools/art-qa.mjs baseline       the built-ins alone
node tools/art-qa.mjs hot|perk|goat <id|classic|all>   an FX pack on the game's own screens (part two, below)
node tools/art-qa.mjs finish loss    when every loss look's moment is over (the speed dial applied), quickest first
  --webkit   also run in WebKit (the iPhone's engine): errors and fallbacks
  --quick    pictures only, no timing        --out DIR   where it writes (default: <tmp>/t82-art-qa/<mode>-<id>)
```

It prints one line per look (PASS or FAIL, then the numbers) and the paths it wrote. In the out folder:
- **index.html**: every look's checks and sheets on one page, readable on a phone.
- **the contact sheets** (PNG): a loss's three moments frame by frame (`loss-<id>-streak/mid/late.png`), its read
  frames (e = 0.25 s; the 0.25 s moment at 0.07 s, early in its fade) at 320 px (`loss-<id>-320.png`) and full
  size (`-e025.png`, the fast one `-e007.png`); a dot set's ledger, `strip()` beside the live
  reel month by month, plus a win and a loss mid-stamp at 4x; a scene's banners, its poster (JPEG) and its reveal.
- **report.json**: every number and every check, per look.

How to read a failure:
- `frame avg / p95 vs classic` (or lake): your frames cost too much. Move work into prep, batch one ink into one path,
  shrink what you redraw live. The ratio is the judge (absolute ms move about 20% between runs on a busy machine).
- `each prep job <= 1.5x classic's longest` (about 8 ms at 4x): split the job (one `K.screen` of a big plate is about
  5 to 12 ms at 4x; a whole-card plate costs several times that). iPhones have no requestIdleCallback: a job runs
  between two of the reel's frames there, so a long one drops frames mid-reel.
- `canvases <= 12 MB`: smaller plates (a 240 x 240 css plate is 0.9 MB at 2x, and the plate `P` itself holds one
  canvas of its size for its starve specks), fewer levels.
- `it played in all three moments` / `the reel printed with it` / `it printed (not lake's fallback)`: the engine did
  not use your look. It threw (the report lists the engine's warning: `[t82] art loss:<id> is off for this session`),
  or it did not register (a wrong id or kind, or a syntax error: see "errors").
- `the live ledger matches strip()`: your stamp is not still by the end of its `live` window, or it inks outside its
  `reach`. The sheet shows which months differ.
- `no engine warnings`: a throw, even once, turns the look off for the visit; fix it rather than catching it.

## The budgets

Measured by the harness in Chromium on the owner's M1 with the CPU slowed 4x (well below an iPhone SE), against the
built-in in the same run. What the built-ins cost there (2026-09-30):

| | the built-in | a look may cost |
|---|---|---|
| a loss frame | classic 13.2 ms avg, 20.3 p95 | 1.5x avg, 2x p95 |
| a loss's prep | classic 19 jobs, 76 ms in all, the longest 5.3 ms | each job 1.5x classic's longest (about 8 ms), all of them 1.5x classic's |
| a loss's canvases | classic 17.3 MB (the exception: held for the whole reel) | 12 MB (aim for half; seal holds 4.4) |
| a moving ledger frame | classic 3.2 ms avg | 1.5x |
| the settled season (7 reprints) | classic 29 ms | 1.5x |
| a banner bake | lake 151 ms | 1.25x |
| a reveal frame | lake 27 ms avg | 1.25x |
| the file | | loss 10 KB, dots 6 KB, scene 16 KB (1 KB = 1024 bytes) |

The pilots, for scale: seal 1.28x classic's frame, prep 0.63x in 8 jobs (the longest 1.36x classic's: its smear
prints in four bands), 4.4 MB, 7.7 KB; balls 0.90x the moving frame, 1.07x settled, 6.0 KB; skyline 0.94x lake's
bake, 1.00x its reveal, 15.6 KB.

## The speed dial (loss looks)

The owner speeds looks up without anyone touching their files (2026-10-02: "save current animation pace in case I
change my mind about speeding up"). A look names the phases of its moment on its def, and **art/tempo.json** says
how much faster to play it from one of them:

```js
phases: { exit: 0.62 },        // on the def: the exit starts 62% of the way through the hold (E.dur)
```
```json
"loss/crumple": { "from": "exit", "x": 1.3 },     // art/tempo.json: 30% faster from the exit on
"loss/seal": { "from": 0, "x": 1.2 }              // 20% faster, the whole moment
```

The engine warps that moment's clock alone (`e` before the phase, `start + (e - start) x 1.3` after it) and hands the
warped `e` to the look's veil, draw and caption, so its fade comes early too and the card sits clean until the reel
moves on. Write `phases` as a literal of plain fractions (the index reads it without running the file); a look whose
timeline is in seconds converts at the mid moment (1.05 s before v68's shorter pauses, 0.89 s since) and says so in a
comment. Delete a line from tempo.json and
the look plays exactly as before: the file without it is today's pace. After an edit, `node tools/art-index.js` (it
writes each line into art-index.js and names any line it has to skip). `node tools/art-qa.mjs finish loss` prints when
every look's moment is over, dialed and at today's pace, quickest first: the owner's numbers for a standard length.

## Loading (the phone's side)

Nothing downloads before a draft; then only what the first moments need (the first four loss looks, the dot set, the
scene, the Presti perk and Heat Check), the other ten loss looks when the reel opens, and the 82-0 looks only for a
season that can still end 82-0. On Data Saver or a 2G/3G connection nothing downloads at all: the built-ins play
(art/CONTRACT.md, the game's flow). Only a look with a `prep` is ever primed, so give one a prep only for work that
would cost a frame on a phone.

## The laws (the short version)

1. Colors only through the kit's inks; black only as coverage. Fonts only through `K.font`.
2. Zero em-dashes in an art file's strings. A custom caption still says `E.sub` and `E.sub2`.
3. Only `K.flash` lights the whole card. Nothing bigger than a tenth of the card flickers more than 3 times a second.
4. Deterministic: `K.rand` with a seed from E or D. No Math.random, no Date.
5. ES5: one IIFE, `"use strict"`, `var`, `function`. No let/const, arrows, classes, template strings, spread, `?.`,
   `??`, shorthand methods, default parameters, modules or newer regex. The index generator refuses them.
6. The budgets above.
7. Distinct: differ from every other look of its kind in at least two of material or letterform, entrance, exit,
   composition.
And the owner's: an L that reads as an L in a quarter second at 320 px; the loss ink leads a loss (never gold or the
win ink); a win and a loss told apart at 6 px by shape AND ink; the season's line is a scene's dominant shape, every
loss marked on it, the gauge (color only left of `D.fillX`) holding.

## Gotchas (each one bit someone building this)

- **`K.box` is null in prep.** Prep prints at a fixed size; `draw` scales to `K.box.size`. The box changes with the
  wound's place (above or below it), so never cache it from one frame to the next.
- **`K.pat` pins to the transform at the moment you take it.** Take it after translate, rotate and scale, right
  before the fill, or the dots swim (or print at the wrong size).
- **A dot must stop moving 0.05 s before its `live` window ends** (a frame on a slow phone; `live` is at least 0.1 s).
  The harness only checks the last 1/60 s, so keep the margin yourself. The strip stops redrawing a
  stamp at the end of its window; a stamp caught mid-pose stays that way and no longer matches the settled reprint.
  The pilot balls failed this check (6 of 7 months) until its bounce came to rest at 0.25 s, inside its 0.3 s window.
- **Stay inside `reach`** (in dot radii, from the stamp's center, counting line widths and drips; the sparks and rings
  of `win` and `lossHit` print on the card, not the strip). Plate ink past it is never cleared: stale dots in the
  live ledger.
- **Sizes are in 1024-byte KB, and they are tight.** balls is 6,129 bytes against 6,144; skyline exactly 16,000
  against 16,384. Comments count. test.js fails the file, not the reviewer.
- **The index reads your file without running it.** `T82ART.add` once, literally (or through `var A =
  window.T82ART`), the kind and id as plain strings, `name: "..."` a plain string at the def's top level.
- **A throw is final for the visit.** The engine turns the look off at its first throw (one console warning) and the
  built-in plays from then on; the harness fails any look that warned. Test the 0.25 s moment (the game's fastest
  heavy loss since v68: its fade starts at e = 0.05, so the hero must land at once; classic's lands at 0.07) and the 320 px phone, where the box is smallest.
- **`K.flash` only works inside `hit`, and only for a heavy loss.** Anywhere else it returns false. It is capped at
  0.72 and never fires within 0.77 s of the last flash.
- **The scene's ink names are not the reel's** (`pink` = `pop`, `blue` = `key`, ...: the kit table above). An unknown
  ink is a throw.
- **A scene draws tone in scene units** (1000 wide; the banner 660 tall, the poster 1250), the same code for both
  layouts: use `L` for every position and `L.rs` / `L.vs` for sizes, never pixels. `K.k` converts to device pixels
  when a shape must snap to them.
- **The first canvas text on a page costs up to 35 ms** at 4x. The engine pays it before your first prep job (it sets
  each face once); you only see it if you time a page by hand.
- **At 320 px a 15-game month wraps** to 14 columns and one (the cell's 17 px minimum: older than the art). A dot set
  must look right with a lone stamp on a second row.
- **Everything in art/ is cached for a year once deployed** (one `/art/*` rule). After any edit: `node
  tools/art-index.js` and `node tools/cache-keys.js --stamp <new key>`, never a hand-edited `?v=`, and never fetch a
  new key on true82.net before the page that links it is live. Keep living pages (labs) out of art/.
- **`phases` is a literal on the def too** (`phases: { exit: 0.62 }`, plain numbers from 0 to 1): a computed one is an
  error, and a dial line naming a phase the look does not declare is skipped (test.js fails until they agree).
- **`perfect: true` is a literal on the def.** The index reads it without running the file (it never sees a variable
  or a computed flag, and lists that scene in the ordinary bag), and only a scene may say it. A perfect scene is
  dealt only for an 82-0, from its own bag; at any other record it prints the lake.
- **Same look twice in a season** (a small library): each moment preps its own copy in its own `K.st`, so a look
  must not keep state anywhere but `K.st`.

## The FX kinds and the 82-0 pictures (part two)

The Heat Check (`hot`), the Presti perks (`perk`) and the 82-0 fireworks (`goat`) print on riso-fx.js's one
full-screen ink layer, over the game's own screens; an 82-0 season's picture (a scene with `perfect: true`) prints on
the results print like any scene, and only for 82-0. The spec is **art/CONTRACT-FX.md** (every signature, the kit's
FX parts, where the game calls each slot, the budgets). The pilots: art/hot/emojifire.js, art/perk/emojicash.js,
art/goat/shells.js, art/scene/summit.js.

### Adding one in five steps

1. **Name it and start from a template.** `art/hot/<id>.js`, `art/perk/<id>.js`, `art/goat/<id>.js`, or
   `art/scene/<id>.js` for a perfect scene; `classic` is reserved for the three FX kinds (riso-fx.js's built-ins). A
   pack is one `T82ART.add(kind, id, { name, by, prep, slots })` with a slot per beat: hot `cold`, `warm`, `hot`,
   `fire`, `nova`, `save`, `miss`; perk `refund`, `sale`; goat `burst`. A slot is `{ dur, draw(K, ev, e) }`, plus
   `hit(K, ev)` if something should happen once as the beat starts. A perfect scene is an ordinary scene plus
   `perfect: true` (a literal) and, if it wants them, `title` and `live`. Copy the example of its kind below.
2. **Watch it while you draw.** On your local server, `docs/art-lab/qa.html?watch=hot:<id>` plays the seven beats in
   turn on the game's Heat Check card, `?watch=perk:<id>` both perks at the cost buttons, `?watch=goat:<id>` the 82-0
   volley in the W/L box, `?watch=scene:<id>` a scene's reveal (a perfect scene prints only its 82-0 record; the other
   three records print the lake). At 375 px AND 320 px. Once it is indexed (step 4), the Art Lab (docs/art-lab/)
   shows it beside every other look of its kind, the way the owner will judge it.
3. **Run the harness until it passes:** `node tools/art-qa.mjs hot <id> --webkit` (or `perk`, `goat`; `hot all` puts
   it beside every other pack; `hot classic` is the built-in alone). A perfect scene: `node tools/art-qa.mjs scene
   <id> --webkit`. Modes and the report: below.
4. **List it and key it:** the same three lines as part one. The index refuses `perfect: true` on anything but a
   scene, and the budgets are a hot pack 14 KB, a perk pack 10 KB, a goat pack 8 KB, a perfect scene 20 KB.
5. **Check the site and play it.** `node test.js` and `node tools/style-law.js`, then on your local server (any host
   but true82.net; each lever is in art/CONTRACT-FX.md):
   - hot: `/?art=hot:<id>&force82=save`, start a Presti run and draft: the post-season Heat Check lands SUPERNOVA and
     the save (`&clutch=1` instead of `&force82=save`: a random tier on any Presti season; `&midhot=1`: the
     mid-season one).
   - perk: `/?art=perk:<id>&perk=refund` (or `&perk=sale`), a Presti run: the first paid spin lands it.
   - goat: `/?art=goat:<id>&force82=1`, any mode: the reel's 82-0 finale (Classic) and the results' volleys.
   - perfect: `/?art=perfect:<id>&force82=1` prints it; `/?art=perfect:<id>&force82=save` in Presti shows the 81-1
     print swap to it when the save lands.

### The examples (each one passes the harness)

**A Heat Check pack** (art/hot/embers.js). One move for every beat, scaled up tier by tier; the emoji is printed in
prep, the frame only places it.

```js
(function () {
  "use strict";
  // every beat is one move: riso flames rise off the anchor and fade, more, wider and higher each tier
  function rise(K, ev, e, o) {
    var r = K.rand(ev.seed), i;
    K.ring({ x: ev.cx, y: ev.cy, r0: 8, r1: 30 + o.wide * 0.4, w0: 6, ink: "hot", cov: 0.85, dur: 0.45 });
    for (i = 0; i < o.n; i++) {
      var x = ev.cx + (r() - 0.5) * o.wide, h = o.high * (0.6 + 0.4 * r()), p = (e - r() * 0.25) / (o.dur - 0.3);
      if (p <= 0 || p >= 1) continue;                    // gone before the beat ends: nothing left on the layer
      K.sprite(K.g, K.st.flame, x, ev.cy - h * K.ease.out(p), 1, 0, p > 0.7 ? (1 - p) / 0.3 : 1);   // upright, scale 1
    }
  }
  function tier(o) { return { dur: o.dur, draw: function (K, ev, e) { rise(K, ev, e, o); } }; }
  T82ART.add("hot", "embers", {
    name: "Embers",
    by: "Riso flames rise off the heat label, more and higher each tier; the save fills the card with them.",
    prep: function (K) { return K.emojiJobs([["flame", "🔥", 32, ["hot", "dusk", "loss"], { sat: 1.3 }]]); },
    slots: {
      cold: tier({ dur: 0.9, n: 2, wide: 30, high: 40 }),
      warm: tier({ dur: 0.9, n: 4, wide: 60, high: 70 }),
      hot: tier({ dur: 1.1, n: 8, wide: 120, high: 120 }),
      fire: tier({ dur: 1.4, n: 14, wide: 220, high: 200 }),
      nova: { dur: 2.4,
        hit: function (K, ev) { K.flash(0.45, "hot"); K.shake(ev.box, 0.6, 8); },   // once, as the beat starts
        draw: function (K, ev, e) { rise(K, ev, e, { dur: 2.4, n: 24, wide: ev.W, high: ev.H * 0.6 }); } },
      save: { dur: 2.2, draw: function (K, ev, e) {
        var A = ev.area;                                 // the verdict's card: the room the save may fill
        rise(K, { cx: A.x + A.w / 2, cy: A.y + A.h - 20, seed: ev.seed }, e, { dur: 2.2, n: 20, wide: A.w, high: A.h * 0.8 });
      } },
      miss: { dur: 1.2, draw: function (K, ev) {
        K.ring({ x: ev.cx, y: ev.cy, r0: 8, r1: 70, w0: 5, ink: "key", cov: 0.75, dur: 0.6 });
        K.spark({ x: ev.cx, y: ev.cy, n: 12, ink: "pop", sp: [30, 90], life: [0.7, 0.4], grav: 520, seed: ev.seed });
      } }
    }
  });
})();
```

A real pack makes each tier its own idea (art/CONCEPTS.md), not one move scaled: the pilot's cold is an ice cube,
its nova a volcano.

**A perk pack** (art/perk/fan.js). Both slots, one look.

```js
(function () {
  "use strict";
  // n riso emoji fan up out of the cost buttons on a cubic ease, upright, and fade by 1.1 s
  function fan(K, em, ev, e, n) {
    var r = K.rand(ev.seed), p = e / 1.1, k = 1 - Math.pow(1 - p, 3), i;
    if (p >= 1) return;
    for (i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (r() - 0.5) * 2.2, d = 70 + r() * 110;
      K.sprite(K.g, em, ev.cx + Math.cos(a) * d * k, ev.cy + Math.sin(a) * d * k + 40 * p * p, 1, 0, p > 0.7 ? (1 - p) / 0.3 : 1);
    }
  }
  T82ART.add("perk", "fan", {
    name: "Fan",
    by: "Bills (a refund) or down arrows (a fire sale) fan up out of the cost buttons in riso ink.",
    prep: function (K) {
      return K.emojiJobs([["bill", "💵", 32, ["good", "pop"], { sat: 1.5 }], ["down", "⬇️", 28, ["hot", "dusk"], { sat: 2 }]]);
    },
    slots: {
      refund: { dur: 1.2, draw: function (K, ev, e) { K.ring({ x: ev.cx, y: ev.cy, r1: 120, ink: "good" }); fan(K, K.st.bill, ev, e, 12); } },
      sale: { dur: 1.2, draw: function (K, ev, e) { K.ring({ x: ev.cx, y: ev.cy, r1: 120, ink: "hot" }); fan(K, K.st.down, ev, e, 12); } }
    }
  });
})();
```

**A goat pack** (art/goat/rings.js). No prep at all: `K.dots` stamps its marks from its own cache.

```js
(function () {
  "use strict";
  var TAU = Math.PI * 2;
  T82ART.add("goat", "rings", {
    name: "Rings",
    by: "Each burst a halftone ring and a round of gold and pink dots that drifts down and burns out.",
    slots: {
      burst: { dur: 1.3, draw: function (K, ev, e) {     // ev is the volley's box: place each burst inside it
        var r = K.rand(ev.seed), x = ev.x + ev.w * (0.2 + 0.6 * r()), y = ev.y + ev.h * (0.2 + 0.5 * r());
        var R = (ev.big ? 90 : 70) * K.ease.out(Math.min(1, e / 0.6)), a = [], b = [], i;
        K.ring({ x: x, y: y, r0: 6, r1: R * 1.2, w0: 6, ink: "light", dur: 0.5 });
        if (e >= 1.1) return;
        for (i = 0; i < 18; i++) (i % 2 ? a : b).push(x + Math.cos(i / 18 * TAU) * R, y + Math.sin(i / 18 * TAU) * R + 30 * e * e, 3.5 * (1 - e / 1.1) + 0.5);
        K.dots(K.g, "hot", 0.95, a);
        K.dots(K.g, "loss", 0.95, b);
      } }
    }
  });
})();
```

**A perfect scene** (art/scene/goldline.js). Layers as any scene; the title and the live part print through a press.

```js
(function () {
  "use strict";
  var TAU = Math.PI * 2;
  function y(D, L, i) { return L.WL - L.SC * D.m[i]; }
  T82ART.add("scene", "goldline", {
    perfect: true,                                       // 82-0 only, from its own bag
    name: "Gold Line",
    by: "82-0 only: the season's line over a gold sky, the record printed twice in gold, three bursts after.",
    lights: ["golden"],
    layers: function (K, P, D, L) {
      return [
        { ink: "sun", role: "sky", draw: function (g) {
          g.fillStyle = K.vgrad(g, L.FY0, L.WL, [[0, 0.7], [1, 0.1]]); g.fillRect(L.FX0, L.FY0, L.FX1 - L.FX0, L.WL - L.FY0);
        } },
        { ink: "pink", role: "line", draw: function (g) {
          g.strokeStyle = K.tone(0.95); g.lineWidth = 8 * L.rs; g.beginPath();
          for (var i = 0; i <= 82; i++) g.lineTo(D.X(i), y(D, L, i));
          g.stroke();
        } }
      ];
    },
    body: function (g, D, L) {
      for (var i = 0; i <= 82; i++) g.lineTo(D.X(i), y(D, L, i));
      g.lineTo(D.X(82), L.WL); g.lineTo(D.X(0), L.WL); g.closePath();
    },
    title: function (K, P, D, L, g) {                    // g is a press: g(ink, box, draw), boxes in scene units
      var b = g.box, f = K.font(900, 140, "disp"), box = [b[0], b[1], b[0] + 40 + g.measure(f, g.record), b[3]];
      function rec(dx, dy) { return function (t) { t.font = f; t.fillStyle = K.tone(0.95); t.fillText(g.record, b[0] + 20 + dx, b[3] - 16 + dy); }; }
      g("blue", box, rec(8, 7));                         // a block shadow
      g("sun", box, rec(0, 0));
      g("sun", box, rec(1.5, -1.2));                     // the second hit, a little off the first
    },
    live: { dur: 3, draw: function (K, P, D, L, t, ink) {  // t = 3 is the still: the print and the poster keep it
      for (var k = 0; k < 3; k++) {
        var cx = L.FX0 + (0.55 + 0.15 * k) * (L.FX1 - L.FX0), cy = L.FY0 + 120 + 40 * k, a = Math.min(1, Math.max(0, t - k * 0.6) / 1.2);
        if (a <= 0) continue;
        ink(k % 2 ? "pink" : "light", [cx - 130, cy - 130, cx + 130, cy + 130], function (g) {
          var R = 100 * K.ease(a);
          g.fillStyle = K.tone(0.9);
          for (var j = 0; j < 16; j++) { K.circle(g, cx + Math.cos(j / 16 * TAU) * R, cy + Math.sin(j / 16 * TAU) * R, 9 * L.rs); g.fill(); }
        });
      }
    } }
  });
})();
```

The engine prints the strip, the marks, the roster and the reveal as for any scene; the title lands with a slam when
the 82nd game prints, and the live part runs after the reveal and rests on its still. The pilot summit shows what one
is for: a picture an 81-1 can never earn.

### What to know (each one bit a builder)

- **Prep every emoji with `K.emojiJobs`.** `K.emoji` in a draw separates the emoji in the middle of the moment (tens
  of ms on a phone). Prep runs in idle time when the draft deals the look.
- **A frame is a function of `e`.** Every random number comes from `K.rand(ev.seed)` (a new seed each play), rings and
  sprays are drawn from their age (`K.ring`, `K.spark` with a seed), nothing carries over from the last frame.
- **What costs on a phone:** an upright sprite at scale 1 is a straight pixel copy, a turned or scaled one about 3x:
  pop and spin in flight, then hold pieces upright at scale 1. `K.dots` beats arcs. Long thin wedges and strokes are
  expensive: keep trails short-lived. Never fill the whole screen; `K.flash` is the one full-screen light (at most
  0.72, once per effect, never within 0.77 s of the last flash).
- **Leave nothing behind.** Every piece is gone (faded or off screen) before `dur`: the sheet's "after" frame must be
  empty, and the harness fails a layer that stays up.
- **Where each beat sits:** a tier at the heat label, small and mid-screen (escalate by area and ink count: COLD
  barely moves, SUPERNOVA owns the screen); the save and the miss at the verdict stamp (the save may fill `ev.area`,
  its card; keep the record readable); a perk at the cost buttons near the foot of the screen (fly up, not down off
  it); a goat burst inside its box (`ev.x, y, w, h`), always `big`, nine of them 0.18 s apart: budget for nine at
  once.
- **New inks:** `hot` (fire gold), `good` (money green, 4 degrees off `win`: never overlap the two), `you`; their
  pairings are in art/CRAFT.md.
- **A throw is final for the visit,** as in part one: classic finishes the moment and plays from then on.
- **A perfect scene's hooks take a press, not a context:** `g(ink, box, draw)` and `ink(name, box, draw)`, boxes in
  scene units; keep the live part's boxes small (each frame repaints only them). `reg` and `box` on a layer give a
  second hit of an ink off register and a plate that screens only its region.

### The harness, for these kinds

```
node tools/art-qa.mjs hot|perk|goat <id>    every slot on the game's own screen at 375 x 812, anchored where the game
                                            anchors it; the frame, prep and memory budgets at 4x; WebKit with --webkit
node tools/art-qa.mjs hot|perk|goat classic the built-in alone          ... <kind> all: every pack of the kind side by side
node tools/art-qa.mjs scene <id>            a perfect scene: its 82-0 banner, the poster, the reveal, then the live motion
  --webkit  --quick  --out DIR  --port N  --throttle N  --reps N     as in part one
```

In the out folder: `fx-<kind>-<id>.png` (a row per slot, ten frames across its `dur`, then one after it, which must
be empty), `fx-<kind>-<id>-320.png` (the phone at 320 px), a full-size hold frame per slot, `report.json` and
`index.html`. The one line it prints per pack reads each slot's frame average and p95, the prep jobs (the engine's
once-a-page warm-ups are reported apart and never count against a pack), the plates, the layer, the file and the
errors. How to read a failure:
- `<slot>: frame avg <= 8 ms` or `p95 <= 16 ms`: too many pieces, or turned and scaled ones; hold them upright, stamp
  marks with `K.dots`, shorten trails. A goat burst is measured as the volley (nine on screen).
- `each prep job <= 25 ms`: one job prints too much; `K.emojiJobs` already splits an emoji into stages, so split a
  big plate of your own into bands.
- `the pack's plates <= 16 MB`: smaller emoji (px), fewer sizes.
- `idle costs nothing` / `the layer is off the page once the slot ends`: something still draws after `dur`.
- `every slot printed itself`: it threw (the warning names it) or it is missing a slot, so classic played.
- A perfect scene: `the live motion moves after the reveal` and `then it stops on a still frame` (the motion must end
  on the still it bakes); bake at most 1.5x lake's, reveal 1.25x, live frames 12 ms on average.
