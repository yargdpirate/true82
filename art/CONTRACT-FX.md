# The art contract, part two: the FX kinds and 82-0 (v67, 2026-09-30)

Read art/CONTRACT.md first; everything there (the registry, the bags, the laws, the kit's halftone tools, the budgets'
spirit) holds here. Part two adds what the owner asked for after the first plan:

1. "Make sure all animations use the riso engine" (art/CONCEPTS.md, the owner's rules: every mark is ink dots).
2. "Make the successful 82-0 results screen art the extra special ones ... so much better than 81-1."
3. "Remake the hot hand sequence art in several different ways too, inc. emoji animations."
4. "Remake the icons that pop up when you get the special lucky modifiers on presti eg the fire sale and refund emoji
   animations."

## The shared riso FX layer: riso-fx.js (`window.T82FX`)

The Heat Check, the Presti perks and the 82-0 fireworks happen on the game's own screens, not on the reel's card, so
they print on a shared layer: one fixed, full-viewport canvas (`position: fixed; inset: 0; pointer-events: none;
aria-hidden`), above every game overlay, created when an effect starts and removed when the last one ends (no layer,
no loop, no cost when idle). It prints with the same halftone pipeline and theme inks as the reel (one shared kit; no
second copy of the screening code): `K.pat`, `K.plate`, `K.screen`, `K.levels`, `K.rand`, `K.ease`, `K.text`,
`K.font`, `K.fade`, `K.tone`, `K.blend`, `K.rgb`, `K.spark`, `K.ring`, `K.shake(el, dur, amp)`, `K.flash(strength)`
(the same photosensitivity limit as the reel), plus:

- **More inks** for these moments: `hot` (--t-hot, fire gold: a gain), `good` (--t-good, money green: a refund),
  `you` (--t-you), next to the reel's `loss`, `pop`, `win`, `key`, `gold`, `night`, `dusk`, `light`, `stock`.
- **Riso emoji:** `K.emoji(char, px, inks)` prints an emoji as a riso separation in prep: the emoji is drawn once to an
  offscreen canvas, its colors are split into the given inks (two or three, e.g. `["hot", "loss", "light"]`; each
  pixel's color is projected onto the inks' colors, its alpha kept), and each ink is screened like any plate. The
  result draws like a sprite: `K.sprite(g, em, x, y, scale, rot, alpha)` prints the plates with their misregistration.
  Cached per (char, px, inks). This is how every "emoji animation" is made: never a raw emoji glyph on screen.
- `ev`, handed to every slot: `{ x, y, w, h }` (the anchor element's rect in viewport CSS px), `W, H` (the viewport),
  `seed`, `label` (the tier's text, the player's name...), `big` (the 82-0 or SUPERNOVA scale-up flag).

```
T82FX.play(kind, slot, anchorEl, opts)   -> plays the dealt variant's slot at the element; returns its duration (ms)
T82FX.prime(kind, id)                    -> runs a variant's prep in idle time (called when the draft deals it)
T82FX.stop()                             -> ends everything and removes the layer (screen changes, SKIP)
```

## The kinds

```
T82ART.add("hot", id, {            // the Heat Check pack: one look across all seven beats
  name, by,
  prep: function (K) { return [jobs]; },
  slots: {
    cold:  { dur: 0.9, draw: function (K, ev, e) { ... } },   // the wheel locks on COLD (nobody caught fire)
    warm:  { dur: 0.9, draw: ... },                           // WARM: a small lift
    hot:   { dur: 1.1, draw: ... },                           // HOT: a real burst
    fire:  { dur: 1.4, draw: ... },                           // ON FIRE: big (today: a flame spray)
    nova:  { dur: 2.4, draw: ... },                           // SUPERNOVA: the biggest beat in the game but 82-0
    save:  { dur: 2.2, draw: ... },                           // the verdict: he catches fire / the save reaches 82-0
    miss:  { dur: 1.2, draw: ... }                            // NO SAVE
  }
});
T82ART.add("perk", id, { name, by, prep, slots: { refund: {dur, draw}, sale: {dur, draw} } });
T82ART.add("goat", id, { name, by, prep, slots: { burst: {dur, draw} } });   // one 82-0 firework burst (fired in sequences)
```

Every slot escalates with the tier (cold < warm < hot < fire < nova), stays readable at 320 px, and finishes inside
its `dur` (a slot's `dur` is its own; the engine never cuts it short except on `stop()`).

## Where the game calls them (app.js)

- **Hot Hand** (`hotHand` and `hotHandMid`): when the wheel locks (the `heat()` lock, at the label): the tier's slot
  (cold, warm, hot, fire, nova) instead of `sprayFromEl(FIRE_EMOJI)` / `supernovaErupt`; the verdict: `save` instead
  of `fireGoats` in the card, `miss` on NO SAVE. One pack per draft (dealt from its bag), so a whole sequence is one
  look.
- **Perks** (`flashRefund`, `flashFireSale`): `refund` / `sale` at the cost buttons instead of the emoji sprays; the
  buttons' own REFUND! / FIRE SALE labels and colors stay. One pack per draft.
- **82-0** (`fireGoats` and `fireWL`, the GOAT climb's `setupGoatFireworks`, the reel's 82-0 `finale`): the dealt goat
  pack's `burst` in the same sequences of bursts as today.
- **Fallbacks:** without T82FX, or when a variant throws, the old emoji effects run exactly as before.

## Perfect scenes (82-0 only)

```
T82ART.add("scene", "summit", {
  perfect: true,                 // dealt ONLY for an 82-0 season, from its own bag; never for anything less
  name, by, lights, derive, layers, body,      // as any scene (art/CONTRACT.md)
  title: function (K, P, D, L, g) { ... },     // optional: a champion's title treatment instead of the plain record
  live: { dur: 6, draw: function (K, P, D, L, t, ink) { ... } }   // optional: after the reveal, a few seconds of riso
                                               //   motion (fireworks, confetti, twinkle) printed live in small boxes
});
```

- An 82-0 season's print comes only from the perfect bag; the ordinary scenes and `lake` never print an 82-0. When
  the Hot Hand save turns 81-1 into 82-0 on the results page, the print reprints as a perfect scene: that swap is the
  owner's "so much better than 81-1" moment.
- A perfect scene may use every print ink and more than seven layers (at most 10), and its `live` motion may cost
  more than the reveal, but only for its few seconds, and it must stop (still frame) when the page is hidden or the
  print scrolls out of view.
- The poster (the share image) prints a perfect scene's still, with its title treatment.

## Budgets (measured as in part one, Chromium on the M1 at 4x)

- An FX slot's frame: at most ~8 ms throttled on average, 16 ms at the 95th percentile (it draws over a live screen).
  Prep: jobs of at most 25 ms throttled, run when the pack is dealt, never during the moment.
- Canvas memory: at most 16 MB per pack's prepped plates; released by `T82FX.stop()` and on the results screen's exit.
- A perfect scene's bake at most 1.5x lake's; its `live` frames at most 12 ms throttled on average.
- File sizes: hot pack 14 KB, perk 10 KB, goat 8 KB, perfect scene 20 KB (unminified).
