# The art contract, part two: the FX kinds and 82-0 (v67, 2026-10-01: as built)

Read art/CONTRACT.md first; everything there (the registry, the bags, the laws, the kit's halftone tools, the budgets'
spirit) holds here. Part two adds what the owner asked for after the first plan:

1. "Make sure all animations use the riso engine" (art/CONCEPTS.md, the owner's rules: every mark is ink dots).
2. "Make the successful 82-0 results screen art the extra special ones ... so much better than 81-1."
3. "Remake the hot hand sequence art in several different ways too, inc. emoji animations."
4. "Remake the icons that pop up when you get the special lucky modifiers on presti eg the fire sale and refund emoji
   animations."

This file is the spec as the code stands (riso-fx.js, results-riso.js, art-core.js, app.js); where the first plan and
the code differed, the code's way was the better one and this file now says it. art/README.md has the how-to.

## The shared riso FX layer: riso-fx.js (`window.T82FX`)

The Heat Check, the Presti perks and the 82-0 fireworks happen on the game's own screens, not on the reel's card, so
they print on a shared layer: one fixed, full-viewport canvas (`position: fixed; inset: 0; pointer-events: none;
aria-hidden`, z-index 300: over the Heat Check (90, mid-season 250), the reel (240) and the old spray layer (200),
under the sheets and toasts (900 and up)). It is put on the page when an effect starts and taken off when the last one
ends: while idle there is no layer, no animation frame and no listener. The layer meets the screen under it the way
ink meets the stock (`mix-blend-mode` from the theme: screen on the dark stock), so an effect prints over the game,
it does not cover it. It prints with the reel's own kit (`T82RISO.kit`: one copy of the screening code, never a
second), so riso-fx.js loads after reel-riso.js.

```
T82FX.use(kind, id)                  the look the run dealt for a kind (null or an invalid id: classic)
T82FX.prime(kind, id) -> bool        that look's prep, one job per idle moment (default classic); call it once its file
                                     has loaded. false: the look is not registered. The prep runs in the order a run's
                                     moments come, whatever order the calls came in: perk, then hot, then goat, and within
                                     a kind classic (the stand-in, a few small jobs) before the dealt look. A look that
                                     leaves a slot out primes classic too. A look with no prep has nothing to prime: it
                                     never joins the queue (and is ready at once)
T82FX.play(kind, slot, el, opts) -> ms   plays one slot at el's rect; its duration in ms, 0 = not played
T82FX.stop()                         ends every effect, takes the layer off and frees every printed plate, emoji sheet
                                     and stamp (the theme is read again next time); the dealt looks and the off list stay
T82FX.end(kind) -> bool              ends that kind's running beats only (its screen went) and keeps every look's prep;
                                     the layer comes off when nothing else plays. true: something was running
T82FX.ready(kind, id) -> bool        whether that look's prep is all printed (default classic): a play now pays nothing
T82FX.slots                          { hot: [cold, warm, hot, fire, nova, save, miss], perk: [refund, sale], goat: [burst] }
T82FX.version                        "v67"
T82FX.qa                             the bench's hooks (below)
```

`opts` for play: `id` (play this look, not the dealt one), `seed`, `label`, `big` (82-0 or SUPERNOVA scale), `rect`
(`{x, y, w, h}` in place of el's rect), `box` (the element `K.shake` moves and `ev.area` is read from; default el's
card: the nearest `.hh-card`, `.reel-card`, `.board`, `.ticket` or `.ticket-actions`). play uses the look
`T82ART.get(kind, id)` when it is registered, not off and has that slot, otherwise the built-in classic. Prep the idle
pass has not reached runs at once (prime avoids that: the moment should never pay for printing). Unknown kinds or
slots, no `T82RISO`, no body or no canvas: play returns 0 and app.js runs the old emoji effect.

### What a slot gets

`ev`, handed to every slot's `draw` and `hit`:

| field | what |
|---|---|
| `x, y, w, h`, `cx, cy` | the anchor element's rect and center, viewport css px |
| `W, H` | the viewport, css px |
| `area` | `{x, y, w, h}`: the anchor's card (the room a celebration may fill); the anchor's own rect when there is none |
| `seed` | per play (app.js passes a fresh one each time): every random choice comes from `K.rand(ev.seed)` |
| `label` | the tier's text, "82-0", "REFUND", the hot player's surname (opts.label, else the element's text) |
| `big` | SUPERNOVA, the save that reaches 82-0, and every 82-0 burst |
| `m` | every Heat Check slot: the multiplier of the tier the wheel landed on (the save and the miss: the tier that decided them), from the game's own `HH_SEGMENTS`; null elsewhere |
| `ladder` | every Heat Check slot: the whole wheel, `[{ label, m }, ...]` in wheel order (COLD first), from `HH_SEGMENTS` at the moment it plays; null elsewhere |
| `el`, `box` | the anchor and the element a shake moves |

### The kit (`K`)

`K` is `Object.create` of the shared kit, one per look: `K.st` holds that look's prep, `K.e` the beat's seconds.

- **From the reel** (art/CONTRACT.md, the kit): `K.inks`, `K.pat`, `K.plate`, `K.screen`, `K.levels`, `K.tone`,
  `K.rgb`, `K.text`, `K.font`, `K.rand`, `K.ease`, `K.clamp`, `K.lerp`, `K.smooth`, `K.fade`, `K.blend`, `K.d`,
  `K.TH`, `K.reduced`, plus two added for this layer: `K.reg(ink) -> [dx, dy]` (the ink's registration offset, css
  px) and `K.tile(ink, cov)` (its cached screen tile, device px).
- **Three more inks** (reel-riso.js INKS): `hot` (--t-hot, fire gold: a gain; 68 degrees), `good` (--t-good, money
  green: a refund; 22 degrees, 4 off `win`: never overlap the two at mid coverage), `you` (--t-you; 79 degrees),
  next to `loss`, `pop`, `win`, `key`, `gold`, `night`, `dusk`, `light`, `stock`. Pairings: art/CRAFT.md.
- `K.g`: the layer's context, in viewport css px. Draw live ink with `K.pat(ink, cov, g)` and `K.blend`, as the reel.
- **Riso emoji.** `K.emoji(char, px, inks, opts) -> em` prints an emoji as a riso separation: drawn once offscreen at
  the device's pixels, each pixel's color split into the inks (one to three, e.g. `["hot", "dusk", "loss"]`; least
  squares over the inks' colors, alpha kept), each ink screened like any plate (grain, starve), then the plates
  composited once at their inks' registration offsets onto one sheet trimmed to the ink. Dark parts print as bare
  stock. `opts.sat` (0.2 to 4) pushes pale colors into the inks; `opts.plates: true` keeps the separate plates. Cached
  per (char, px, inks, sat, device pixels); px 8 to 240. `em = { w, h, ox, oy, print, plates, reg, inks, bytes }`.
  A phone with no color emoji prints the glyph's shape in the first ink. This is how every "emoji animation" is
  made: never a raw emoji glyph on screen.
- `K.emojiJobs([[name, char, px, inks, opts], ...], st)`: the same as prep jobs, one stage per job (the glyph and its
  coverage, each ink screened, the sheet), stored into `st[name]` (default `K.st`). Prep emoji this way, never in a
  draw. The engine's once-a-page warm-ups (the emoji face's first glyph, a first tiny separation) run, each in an idle
  moment of its own, only ahead of a look whose prep has such stages; the theme's faces only ahead of a dealt look's
  first job (the owner, 2026-10-02: prime only what needs it). In the idle pass the prep body runs in a moment of its
  own (it lists the jobs), so keep it to listing: the work goes in the jobs.
- **The numbers a pack prints are the game's.** The owner retunes the Heat Check (2026-10-02: COLD 0.9, WARM 1.0, HOT
  1.1, ON FIRE 1.2, SUPERNOVA 1.3): a pack that shows a multiplier reads `ev.m` and `ev.ladder` (app.js hands them to
  every Heat Check slot from `HH_SEGMENTS`) and keeps a copy of its own only as the fallback when they are null.
  Since v68 COLD (x0.9) is a cost and WARM (x1.0) is even: a pack that prints a bonus word beside the multiplier
  picks it from `ev.m`, never a bonus under x1.0 (the owner, 2026-10-02: "cold"; Combo prints BRICKED on COLD
  and "- EVEN -" on WARM).
- `K.sprite(g, em, x, y, scale, rot, alpha)`: prints a riso emoji centered at (x, y), css px. `scale` may be `[sx,
  sy]` (a squash on impact, a stretch in flight). Hold it between 0.7 and 1.1 (art/CRAFT.md); a pop through smaller
  scales is fine inside 0.15 s. Any `{plates, reg, w, h}` of screened plates prints too, plate by plate.
- `K.dots(g, ink, cov, [x, y, r, ...])`: round marks stamped from cached bitmaps (up to 24 device px; bigger ones and
  marks under a turned transform are filled as one path). A shell or a spray prints hundreds a frame: use this, not
  arcs.
- `K.ring(o)`, `K.spark(o)`: the reel's ring and spray options, plus `e` (its age; default the beat's `K.e` less
  `o.delay`) and `g`. Both are drawn from their age (no state between frames: the same e is the same frame). A spark
  also takes `dir` and `cone` (a fan, radians) and needs `seed`, never a running random.
- `K.shake(el, dur, amp)`: the element jolts and settles (a Web Animation, amp at most 16 px); once per effect per
  element.
- `K.flash(strength, ink)`: the whole screen lights in one ink's halftone (default `light`) and drops back in 0.26 s
  in four steps, printed as a page layer of the ink's screen tile under the canvas. At most 0.72, once per effect,
  never within `T82RISO.flashGap` (0.77 s) of the last flash, the reel's included (both engines claim each flash on one
  real-time clock, `T82RISO.flashClaim`); it works in `draw` or `hit` and returns whether it fired.
  Only `K.flash` lights the whole screen (art/CONTRACT.md law 3).

## The kinds

```
T82ART.add("hot", id, {            // the Heat Check pack: one look across all seven beats
  name, by,
  prep: function (K) { return [jobs]; },             // optional: K.emojiJobs(...), K.screen... into K.st
  slots: {
    cold:  { dur: 0.9, draw: function (K, ev, e) { ... } },   // the wheel locks on COLD (since v68 x0.9: a cost)
    warm:  { dur: 0.9, draw: ... },                           // WARM (since v68 x1.0: even, nothing moves)
    hot:   { dur: 1.1, draw: ... },                           // HOT: a real burst
    fire:  { dur: 1.4, draw: ... },                           // ON FIRE: big
    nova:  { dur: 2.4, draw: ... },                           // SUPERNOVA: the biggest beat in the game but 82-0 (big)
    save:  { dur: 2.2, draw: ... },                           // the verdict: he catches fire / the save reaches 82-0
    miss:  { dur: 1.2, draw: ... }                            // NO SAVE (and a post-season miss)
  }
});
T82ART.add("perk", id, { name, by, prep, slots: { refund: {dur, draw}, sale: {dur, draw} } });
T82ART.add("goat", id, { name, by, prep, slots: { burst: {dur, draw} } });   // one 82-0 firework burst (fired in volleys)
```

- The durations above are the pilots'; each slot's `dur` is its own (0.1 to 8 s). The engine never cuts a beat short
  except on `stop()`. `e` is seconds since the beat began.
- A slot may add `hit(K, ev)`: it runs once as the beat starts (one-shots like `K.flash` and `K.shake` are also safe
  in `draw`, which runs every frame: they fire once per effect).
- Every slot escalates with the tier (cold < warm < hot < fire < nova, by area and ink count), stays readable at 320
  px, keeps the record readable (the save and the miss sit on the verdict stamp), and ends with nothing left on the
  layer.
- **The built-ins** (riso-fx.js, `classic`, a reserved id for these three kinds): today's emoji sprays printed in
  riso (the flame spray, the SUPERNOVA plumes, the goat, ball and trophy shells, the bills and arrows). They register
  with `builtin: true`, ride in the bags like the reel's classic L, and play whenever the dealt look's file is not in
  yet, so even the fallback is ink.
- **A throw** in prep, `hit` or `draw` turns that look off for the session (one `[t82]` warning) and classic finishes
  the moment from where it was. Its own plates are freed; the riso emoji sheets (one cache: two looks printing the same
  emoji at the same size and inks hold the same sheet) and the kit's tiles are shared, so they stay. A look without a
  slot plays classic for that slot.
- **Sizes:** a hot pack 14 KB, a perk pack 10 KB, a goat pack 8 KB (1 KB = 1024 bytes, comments count).

## Where the game calls them (app.js)

- **The deal** (`artDealFx`, with the run's other looks when a draft starts): one look per kind per run, so a whole
  sequence is one look. `hot` and `perk` in Presti only (the only mode with the Heat Check and the perks); `goat` and
  the 82-0 scene (`deal("scene", 1, {perfect: true})`) in every mode with a results page (not Kaman, whose 82-0
  volley plays riso-fx.js's classic goat). Without riso-fx.js no hot, perk or goat look is dealt (nothing downloads,
  those bags stay put); the 82-0 scene still is. On a slow link (`T82ART.lean()`, art/CONTRACT.md) nothing is dealt
  and every moment plays classic. The perk bag never deals classic (the owner cut it on 2026-10-02: art/enabled.json
  `perk/classic`), but classic still stands in while a dealt perk's file is on its way. Each dealt look is told to
  riso-fx.js (`T82FX.use`), fetched in idle time, and primed once it is in (`T82FX.prime`); one whose file failed
  moves on in its bag (`T82ART.skip`).
- **When each file comes** (the owner, 2026-10-02: load smartly, never drag a slow phone or a slow link): the perk
  and the Heat Check (Presti) 1.4 s into the draft, with the run's first loss looks; the 82-0 fireworks and, in a
  mode with the reel, the 82-0 picture only once the season is known and can still end 82-0 (`artSeasonKnown`: 82
  wins, or a Presti Heat Check that can save it: 81 wins, `?clutch=1`, or the mid-season one); in a mode with no
  reel the 82-0 picture comes with the draft, since the print follows it at once.
- **Classic stands in primed** (`fxPrime`: for each kind, the dealt look once its file is in, otherwise classic), for
  a moment the run can still have (`fxKinds`): 1.4 s into the draft, with the fetch, classic is primed for the perk
  and the Heat Check in Presti, and for the 82-0 volley in Kaman (always 82-0; a game with no art-core.js too); every
  other mode primes the fireworks only once the season is known to be able to end 82-0 (their prep is emoji
  separations: work for nothing in a 60-22 season). Each arriving file then primes its look, behind its kind's
  classic. While a dealt look is still printing its prep and classic's is printed, classic stands in (`fxLook`,
  booking nothing), so a perk tapped the second after the file arrives never pays; an 82-0 volley settles its look at
  its first shell. Not at the deal: the first raster of the emoji face (35 to 245 ms in desktop WebKit) would land in
  the first ticket's spin, so a perk tapped inside the first 1.5 s or so still prints classic's few jobs in the tap,
  as before. (The GOAT climb's hidden test, five taps on its 82-0 cap, can fire a volley at any record: then the
  fireworks print in the tap.)
- **The Heat Check** (`hotHand` post-season and `hotHandMid` mid-season): when the wheel locks, the tier's slot at the
  heat label (`big` only for nova; every Heat Check slot gets `ev.m` and `ev.ladder`, `hhFxOpts`); without the layer: the ON FIRE flame spray and the SUPERNOVA plumes, and nothing
  for COLD, WARM and HOT, as before. The verdict: `save` at the verdict stamp, spreading over its card (`ev.area`)
  instead of the goat fireworks (`big` only when the save reaches 82-0; mid-season it says the hot player's name);
  `miss` on NO SAVE and on a post-season miss (no effect before).
- **The perks** (`flashRefund`, `flashFireSale`): `refund` / `sale` at `.ticket-actions` (the three cost buttons)
  instead of the bill and arrow sprays; the buttons' REFUND! and FIRE SALE labels and colors stay.
- **82-0** (`fireGoats`: `fireWL` in the results' W/L box, the GOAT climb's `setupGoatFireworks`, the Heat Check
  card's fallback, Kaman, and the reel's 82-0 `finale`): nine `burst`s 0.18 s apart in the box, each `big`. The reel's
  finale adds the riso shells to its own rings, or nothing without the layer (it had no emoji). A pending volley stops
  when the screen changes or on SKIP.
- **Booking:** a dealt look leaves its bag (`T82ART.used`) the first time it plays in a run; classic standing in for a
  look still loading books nothing. A results scene, ordinary or perfect, leaves its bag when its print reveals
  (`playResultsPrint`), once a run per scene: an 81-1 print the Heat Check's save swapped before it ever showed keeps
  its place.
- **Stopping:** a new run and the home screen always `T82FX.stop()`; entering the results and the reel's or the Heat
  Check's SKIP stop it only while something still prints, then prime the looks still to come (stop frees every plate).
  SEE YOUR TEAM and BACK TO THE SEASON take the Heat Check's card away, so they end its beats (`T82FX.end("hot")`):
  the save never prints over the results or the resumed reel, and the 82-0 volley still to come keeps its plates.
- **Fallbacks:** without riso-fx.js, or when play throws or returns 0, the old emoji effect runs exactly as before
  (at most once). The game ignores the OS reduced-motion flag on purpose (app.js `reducedMotion()` is false), so the
  layer plays for everyone; `K.reduced` (the OS flag, from the reel's kit) is there for a pack that wants to calm
  itself, and no pack has to.

## Perfect scenes (82-0 only)

```
T82ART.add("scene", "summit", {
  perfect: true,                 // a literal true on the def: dealt ONLY for an 82-0 season, from its own bag
  name, by, lights, derive, layers, body,      // as any scene (art/CONTRACT.md); layers may return 1 to 10
  title: function (K, P, D, L, g) { ... },     // optional: a champion's title instead of the plain record
  live: { dur: 6, draw: function (K, P, D, L, t, ink) { ... } }   // optional: riso motion after the reveal
});
```

- **Only 82-0.** An 82-0 season's print comes only from the perfect bag (app.js `resultsPrintPerfect`, settled once a
  run); the ordinary scenes and `lake` never print an 82-0 and a perfect scene never prints less: results-riso.js
  prints the lake for anything but 82 wins of 82 games (or, with no games, a projected `Math.round(wins) === 82`).
  When the Heat Check save turns 81-1 into 82-0 on the results page, the print reprints as the run's perfect scene:
  that swap is the owner's "so much better than 81-1" moment. No perfect scene arrived: the lake.
- **Layers:** 1 to 10 (ordinary scenes 8). Two extras on a perfect scene's layer: `reg: [dx, dy]` (css px, at most 6:
  a second hit of an ink further off register, e.g. a double-hit gold sun) and `box: [x0, y0, x1, y1]` (scene units:
  the layer is drawn and screened only there, which keeps a small second plate cheap; ignored on a layer that carries
  the strip or the registration marks).
- **title(K, P, D, L, g):** `g` is a press, not a context: `g(ink, box, draw)` screens the tone `draw(t)` lays inside
  `box` (scene units; any scene ink, `light` resolved to the painting's) into that ink's dots, off register, in the
  stock's blend. It also carries `g.box` (the title zone: banner [16, 8, 984, 160], poster [20, 20, 980, 182]),
  `g.poster`, `g.record` (the engine's "82-0"), `g.context` (the mode line), `g.comp` ("Greatest of all GOATs") and
  `g.measure(font, text)` (a width in scene units). It prints once, to its own sheet, and must press something (or it
  counts as a throw). During the reveal the plain record still counts up; the title lands with a 0.16 s slam when the
  82nd game prints.
- **live: { dur, draw(K, P, D, L, t, ink) }:** `dur` 0.5 to 12 s. `ink` is the same press, clipped to the frame. After
  the reveal the engine runs it on the print's clock in small boxes (each frame restores the last frame's boxes, then
  presses). `draw(K, P, D, L, dur, ink)` is the still: it is baked into the print and the poster, and the motion must
  end on it. The motion stops for good on its still when the page is hidden, when the print scrolls out of view, on
  `destroy()`, `update()`, a rebuild or a resize, and when it throws (the scene is then retired). The bench's manual
  clock (`opts.manual`) ignores visibility; `frame()` returns true while the reveal or the motion runs.
- **The poster** (the share image) prints the title and the still.
- `T82PRINT.scenes({perfect: true})` lists the perfect scenes, `{perfect: false}` the ordinary ones (the lake first);
  no argument: as before.
- **Size:** 20 KB.

## The bags (art-core.js)

- `T82ART.KINDS` is loss, dots, scene, hot, perk, goat; each kind has its own bag, `t82-art-bag-<kind>`.
- The perfect scenes have one more: `t82-art-bag-scene-perfect`. `enabled(kind)` never lists a perfect look;
  `enabled(kind, {perfect: true})` lists only them; `deal(kind, n, {perfect: true})` deals from that bag;
  `used(kind, id)` finds the right bag from the id's perfect flag (`opts.perfect` names it outright);
  `T82ART.perfect(kind, id)` says whether a look is one (the index's flag, or a registered def's).
- tools/art-index.js reads `perfect: true` from the file without running it (a literal on the def itself; an error on
  anything but a scene) and writes it on the entry; `classic` is reserved for hot, perk and goat.

## QA levers (the v67 ones are test builds only; true82.net ignores them)

- `?art=hot:<id>,perk:<id>,goat:<id>,perfect:<id>` forces the run's looks (`forced("perfect")`, or `forced("scene",
  {perfect: true})`; a plain `scene:` never answers for the perfect bag). `classic` forces the built-in.
- `?perk=refund` or `?perk=sale`: the first paid Presti spin of each run lands that perk, for real.
- `?force82=1`: the season is 82-0 (the reel's finale, the goat volleys, the perfect print) in any mode with a season.
  `?force82=81`: 81-1, so a Presti run gets the real post-season Heat Check. `?force82=save`: 81-1, then the wheel
  lands SUPERNOVA and the save reaches 82-0, so the print reprints as the perfect scene. `?force82=` turns the
  mid-season Heat Check off. (A forced 81-1 that misses shows the record the boosted net projects, not 81-1: the
  lever forces the wins, not the net rating.)
- Still there, from before v67, and NOT gated: `?clutch=1` (the post-season Heat Check on any Presti season),
  `?midhot=1` (the mid-season one past its +20 bar) and `?reelms=<ms>` (the reel's length) work on true82.net too.
  `?art=`, `?perk=` and `?force82=` are the only levers it ignores. Gating the older three is a behavior change: the
  owner's call.

## Budgets (tools/art-qa.mjs, Chromium on the M1 at 4x; absolute for the FX kinds)

- **An FX slot's frame:** at most 8 ms on average and 16 ms at the 95th percentile, as the game plays it (the goat
  burst as the nine-burst volley, up to nine on screen). It draws over a live screen.
- **Prep:** each job at most 25 ms (its median over every run of it; the engine's once-a-page warm-ups, the emoji face,
  the first separation and the theme's faces, are reported apart). Prep runs when the look is dealt, never in the
  moment.
- **Canvas memory:** at most 16 MB of a pack's prepped plates and emoji sheets; freed by `T82FX.stop()`. The layer
  itself (about 4.6 MB on a 375 x 812 phone at 2x) exists only while something plays.
- **A perfect scene:** its bake at most 1.5x lake's, its reveal frames at most 1.25x lake's, its live frames at most 12
  ms on average.
- **What costs** on a phone's software canvas: an upright sprite at scale 1 is a straight pixel copy, a turned or
  scaled one about 3x that, so hold pieces upright at scale 1 once they have landed; long thin wedges and strokes are
  expensive (keep trails short-lived); a full-screen canvas fill every frame is the most expensive thing there is (the
  flash is a page layer for that reason); `K.dots` beats arcs.
- The pilots at 4x (2026-10-01): hot emojifire 1.5 to 5.8 ms average, at most 10.1 ms p95 (nova), prep jobs at most
  10.6 ms, 1.2 MB, 13.2 KB; perk emojicash 4.4 and 5.6 ms, 191 KB, 7.2 KB; goat shells 5.6 ms average and 11.1 ms p95 for
  the volley, 4.9 KB; summit bake 1.06x lake's, reveal 0.6x, live 9.7 ms, 19.7 KB.

## The bench

- `node tools/art-qa.mjs hot|perk|goat <id|classic|all> [--webkit] [--quick] [--port N] [--out DIR]`: each slot on a
  copy of the game's screen built from the game's classes at 375 x 812, anchored where app.js anchors it (a tier at
  the heat label, the save and the miss at the verdict stamp, a perk at the cost buttons, the goat volley in the W/L
  box); a contact sheet per pack, a 320 px sheet, the timing above, the idle check (the layer and its loop gone after
  the beat), console errors and engine warnings, and in WebKit that the look printed itself.
- `node tools/art-qa.mjs scene <id>` on a perfect scene: its 82-0 banner, the poster, the reveal, then the live
  motion (it must move after the reveal and come to rest on its still), against the budgets above.
- docs/art-lab/qa.html: `?watch=hot:<id>` (the seven beats in turn), `?watch=perk:<id>`, `?watch=goat:<id>` (the
  volley), `?watch=scene:<id>`; `T82QA.fx` (start, to, run, clear, watch) for scripts.
- `T82FX.qa`: `setup({clock, manual})` (a clock in seconds; manual: no animation frames, no idle scheduling),
  `frame() -> bool` (one frame at the clock; true while anything plays), `runJob() -> "warm" | true | false`,
  `layer()`, `state()` (running beats, layer and loop, bytes, packs, pending jobs, off looks, dealt looks).
- docs/art-lab/ (the Art Lab) is the owner's page: every look of every kind, played at phone size, loved or cut.
