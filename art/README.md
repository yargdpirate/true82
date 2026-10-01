# The art library: how to add a look (v67)

The reel's giant L, the reel's win and loss dots and the results print each come in many looks, one small file per
look, dealt from a shuffle bag so a player sees every look once before any repeats. This is the how-to. The spec is
**art/CONTRACT.md** (every signature, rule and budget; if this guide and the contract disagree, the contract wins).
Read **art/CRAFT.md** before drawing (the riso craft on this dark stock) and pick a brief from **art/CONCEPTS.md**.

| kind | folder | what it draws | built-in (inside the engine) | budget |
|---|---|---|---|---|
| `loss` | art/loss/ | the big moment on each of a season's first 14 losses | `classic`, the draining L (reel-riso.js) | 10 KB |
| `dots` | art/dots/ | every win and loss stamp of the ledger, for a season | `classic`, coins and drips (reel-riso.js) | 6 KB |
| `scene` | art/scene/ | the picture of the season on the results print and poster | `lake`, mountains over a lake (results-riso.js) | 16 KB |

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
   than once, or whose `name` is not a plain string. To keep a look in the lab but out of the game, add `"kind/id"` to
   `off` in art/enabled.json and run the first line again. The stamp re-keys art-index.js in index.html, so a release
   of new art is a client release like any other: the footer law in app.js (BUILD_V) applies.
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
    by: "Wins pop in as round coins, losses slam down as square chips; a streak gets a rim.",
    reach: { w: 1.5, l: 2.1 },                           // the coin pops to 1.3R; the chip's corner reaches 1.4 x 1.41R
    live: { w: 0.2, l: 0.3 },                            // each is still before its window ends (0.15 s, 0.2 s)
    inks: { a: "win", b: "pop", c: "loss" },
    a: function (K, g, D, c, R, e) {                     // plate a: the coin
      if (!D.win) return;
      var s = 1 + 0.3 * (1 - K.ease.out(e / 0.15));
      g.fillStyle = K.tone(0.95); g.beginPath(); g.arc(c[0], c[1], R * s, 0, TAU); g.fill();
    },
    b: function (K, g, D, c, R) {                        // plate b: a rim from 10 straight
      if (!D.win || D.streak < 10) return;
      g.strokeStyle = K.tone(D.streak >= 20 ? 0.95 : 0.7); g.lineWidth = R * 0.2;
      g.beginPath(); g.arc(c[0], c[1], R * 1.25, 0, TAU); g.stroke();
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
the end) and makes 20 and 30 straight read too.

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
  --webkit   also run in WebKit (the iPhone's engine): errors and fallbacks
  --quick    pictures only, no timing        --out DIR   where it writes (default: <tmp>/t82-art-qa/<mode>-<id>)
```

It prints one line per look (PASS or FAIL, then the numbers) and the paths it wrote. In the out folder:
- **index.html**: every look's checks and sheets on one page, readable on a phone.
- **the contact sheets** (PNG): a loss's three moments frame by frame (`loss-<id>-streak/mid/late.png`), its 0.25 s
  frames at 320 px (`loss-<id>-320.png`) and full size (`-e025.png`); a dot set's ledger, `strip()` beside the live
  reel month by month, plus a win and a loss mid-stamp at 4x; a scene's banners, its poster (JPEG) and its reveal.
- **report.json**: every number and every check, per look.

How to read a failure:
- `frame avg / p95 vs classic` (or lake): your frames cost too much. Move work into prep, batch one ink into one path,
  shrink what you redraw live. The ratio is the judge (absolute ms move about 20% between runs on a busy machine).
- `each prep job <= 25 ms`: split the job (one `K.screen` of a big plate is about 5 to 12 ms at 4x; a whole-card plate
  costs several times that).
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
| a loss's prep | classic 19 jobs, 76 ms in all, the longest 5.3 ms | each job 25 ms, all of them 1.5x classic's |
| a loss's canvases | classic 17.3 MB (the exception: held for the whole reel) | 12 MB (aim for half; seal holds 4.4) |
| a moving ledger frame | classic 3.2 ms avg | 1.5x |
| the settled season (7 reprints) | classic 29 ms | 1.5x |
| a banner bake | lake 151 ms | 1.25x |
| a reveal frame | lake 27 ms avg | 1.25x |
| the file | | loss 10 KB, dots 6 KB, scene 16 KB (1 KB = 1024 bytes) |

The pilots, for scale: seal 1.28x classic's frame, prep 0.43x, 4.4 MB, 7.0 KB; balls 0.90x the moving frame, 1.07x
settled, 6.0 KB; skyline 0.94x lake's bake, 1.00x its reveal, 15.6 KB.

## The laws (the short version)

1. Colors only through the kit's inks; black only as coverage. Fonts only through `K.font`.
2. Zero em-dashes in an art file's strings. A custom caption still says `E.sub` and `E.sub2`.
3. Only `K.flash` lights the whole card. Nothing bigger than a tenth of the card flickers more than 3 times a second.
4. Deterministic: `K.rand` with a seed from E or D. No Math.random, no Date.
5. ES5: one IIFE, `"use strict"`, `var`, `function`. No let/const, arrows, classes, template strings or modules.
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
- **A dot must stop moving before its `live` window ends** (one frame early is enough). The strip stops redrawing a
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
  built-in plays from then on; the harness fails any look that warned. Test the 0.45 s moment and the 320 px phone,
  where the box is smallest.
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
- **No `perfect: true` scenes yet.** art/CONTRACT-FX.md's 82-0-only scenes need their own bag in app.js, which has
  not landed: today one would be dealt for any season.
- **Same look twice in a season** (a small library): each moment preps its own copy in its own `K.st`, so a look
  must not keep state anywhere but `K.st`.
