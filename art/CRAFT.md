# CRAFT: drawing riso art for TRUE 82 (v67, 2026-09-30)

The guide a variant author reads before drawing. Read first: art/CONCEPTS.md ("The owner's rules for all of it"), then
art/CONTRACT.md (and CONTRACT-FX.md for hot, perk and goat packs). Then open **art/swatches.png** at full size: every
color claim below was checked on it. The craft is distilled from sevenevesai/riso-windowseat (MIT; the engines' halftone
pipeline already follows it), adapted to what is different here: a dark indigo stock where the inks ADD light, a phone
card, and moments of 0.45 to 1.9 s instead of films.

The owner, in his words: "Make sure all animations use the riso engine; within that constraint go crazy." "Make sure
it's obvious it's an L." "One of the secondary goals of the game ... is for the viewer to see beautiful riso-ish art."
His taste: big swings in the ink-print family (stamps, halftone rings, two-ink slams that land off register), bold not
subtle, judged on an iPhone at 320 to 375 px, never on a timer that drags. "More than I could ever want, a Louvre", but
every piece finished and good enough to keep.

## 1. The riso look in this engine

### What the engine actually does
- **Screen:** amplitude-modulated dots, pitch 2.4 css px on the reel (4.8 device px at 2x), 2.35 on the results banner,
  4.2 px on the 1080 poster. Each ink sits on its own angle: loss 14, win 18, gold 0, dusk 34, pop 45, light 56, night
  63, key 72, stock 76 degrees. Past 78% coverage the dots merge and the holes close fast.
- **Prep plates:** `K.screen(P, ink, draw)`: you lay tone in css px (`K.tone(a)` = coverage a), the engine thresholds
  every pixel against the screen plus a grain (smooth 5 px noise, about +-0.085 coverage: mid-tones mottle) and then
  punches starve specks (about one per 900 device px2, 0.4 to 1.7 px, partly see-through). Per-pixel: prep jobs only.
- **Live fills:** `K.pat(ink, cov, g)`: a pattern of that ink at a coverage quantised to sixteenths, pinned to the
  device pixels (take it after your transforms; the shape moves through a still screen, so the dots never swim). No
  grain, no starve.
- **Composite:** `g.globalCompositeOperation = K.blend` ("screen" on the indigo stock #16122B). Ink adds light;
  overlaps mix toward white; nothing you print can make anything darker.
- **Registration:** the engine offsets its own plates 0.6 to 1.5 css px per ink (the ledger's dots, every scene layer,
  `K.sprite` in the FX layer). A loss moment's `K.pat` fills and drawn `K.screen` canvases land exactly where you put
  them: the miss is yours to add (below).

### The dark stock inverts the paper rules
riso-windowseat prints on cream with multiply: darks are overprints and highlights are paper. Here it runs backwards,
and most of the craft follows from that:
- **The stock is the darkest value in every piece.** A dark is bare stock: a place you did not print.
- **Lights are overprints.** Two inks over each other print lighter than either (pink over aqua: lilac white #FFD9F9).
  Put the brightest spot (an overprint, or a little `light`) where the eye must go.
- **Model form by removing ink toward the shadow:** one ink, coverage falling from the lit side down to the stock. Never
  shade by laying a second ink over the shadow side: on this stock it brightens it, the opposite of a shadow.
- **A dark line is a line of stock.** Carve it out of the mass (destination-out in prep, or a gap between paths): wood
  grain, facets, cracks, the bands of a ball. Key and violet are the low inks for a soft dark (a keyline, a cast
  shadow, a backing plate); there is no black ink and black is only ever a coverage mask.
- **Value ladder,** each ink solid on the stock (relative luminance): stock .008, key .19, violet .29, pink .31,
  good .33, orange .40, aqua .50, gold .57, hot .71, white 1.0. Coverage pulls each toward the stock. Decide value
  before ink: the stock, one mid mass (the hero), one bright accent. Pink, violet and good are near-equal in value:
  side by side they separate by hue only and blur at a glance, so keep stock between them.

### Plates as coverage
Think in plates, not colors: each ink is one sheet of tone 0..1 that the screen turns into dots, and a piece is one to
three of them over the stock. Coverage is the only tone control (swatches.png section 1): 0.12 a dust, 0.25 small
dots, 0.5 the checker where the screen angle shows, 0.75 joined dots with holes of stock, 0.88 pinholes, 0.95 flat.
- **Tones add on a plate.** Two shapes of one ink filled separately overlap brighter (pink screened on pink prints
  #FF7BE6, a seam no real plate makes). One ink, one path, one fill per frame. A shape that must own its value clears
  the plate first (in prep: destination-out, then print).
- **A gradient is a dot-size ramp, in prep only.** A canvas gradient laid as tone into `K.screen` becomes dots that
  grow: the signature riso gesture (a halo, a sky, a bokashi edge, a turning form). A gradient drawn live, or a mass
  faded with globalAlpha, prints as smooth translucent ink: the one thing this look cannot afford. Live tone is bands:
  two to four nested shapes at stepped coverages (0.3 / 0.55 / 0.85), each at least 1/16 apart.

### One cut contour per silhouette
An L assembled from two stroked rectangles, or a ball from a circle and arcs, reads as clip art however good the
screen. Draw the hero as ONE closed path through deliberate points: sharp at the elbow and the toe (that is what says
L), one long flat edge, one slightly convex one. Then waver it with a seeded wobble: 1 to 2 px (about 0.5% of its size)
reads as drawn, 4 to 8 px as torn or cut paper; smooth the wobble so a dent is a bay in the edge, not damage. Use the
same path for every plate of the hero and for its knockouts, so they miss each other only by the offset you choose.
Constant lineWidth reads as wire: strokes that taper (a ribbon whose width varies along the path, filled) read as drawn.
The theme's display face (`K.font(700|800|900, px, "disp")`, Big Shoulders) is a fine L for a typographic concept, but
its L is slim (stem about 15% of its height); a chunky L is drawn: stem at least 20% of the height, foot at least 55%.

### Texture comes from the screen, not from drawn noise
Every bit of texture should be print: dots, grain, starve, misregistration, carved lines. Not specks sprinkled per
frame, not a grunge overlay. A surface that needs more: ramp its coverage, carve lines into it (hatching carved at a
3 to 5 px gap is dry brush), or spray seeded dots by a density function, more where the light is and never over the
whole form (spray eats the silhouette). Texture goes in last and comes out first: at 375 px, silhouette and value are
what read; interior texture is nearly invisible at speed.

### Misregistration that reads as riso, not as a bug
swatches.png section 4: the aqua plate off a pink L (about 80 px of visible L) by +0 to +16 css px.
- **One offset per plate for the whole moment,** the same for every shape on it: that is what a drum does. Not per
  element, not random per frame, not on everything "for style".
- **The fringe:** 0.6 to 1.5 css px (the engine's own; 1.5 to 2.4 px on the 1080 poster). Shows on contours only.
- **The deliberate miss** (the classic's two-ink slam): 2 to 6% of the L's visible height, so 4 to 12 css px on the
  reel's 150 to 220 px L. The classic's is (+5, -4) plate px, drawn at 0.55 to 1.05x: about 3%. On the sheet: +2.5 is
  a print, +5 a stylish miss, +9 a two-ink block shadow, +16 two letters. Past about 10% the plates read as two objects:
  fine only when that IS the concept (Separation, Overprint, Block Shadow) and the plates move toward register.
- **Small marks** (6 to 10 px stamps, sparks, caption type): 1.2 px at most. At 2.5 a 6 px dot grows a moon; at 4 it
  is two dots. Small type prints on one plate.
- **Direction:** seeded per moment, or taken from the motion: a partner plate lagging one or two frames behind a fast
  move, then catching up to its offset, is the best misregistration there is.

### Starve and grain
Prepped plates carry grain (mottled mid-tones) and starve (stock pinholes and blotches in the solids): it is what makes
a solid read as ink off a drum. Verified on the sheet (section 1, last column against the 0.95 column): **K.pat at 0.95
prints flat**, no holes, no starve, the same as a vector fill on a phone. So:
- a mass that holds still at "solid": prep it, `K.screen` at 0.92 to 0.98;
- a live mass at "solid": `K.pat` at 0.81 to 0.88, where the screen's holes still show; never 0.95 over a big area;
- starvation as the effect (Running Dry, Misfeed, a dry brush): ramp the coverage down along the pull in prep and let
  the starve and grain do the rest. Never paint specks.

### Prep or live
| | prep: `K.screen` / `K.levels` in prep jobs | live: `K.pat` every frame |
|---|---|---|
| for | masses that hold still or move rigidly; coverage ramps; starve and grain; carved lines; big things | shapes that change every frame (melt, splash, growing stroke, crumple); particles, rings, small marks |
| cost | per pixel: at most 25 ms a job at 4x throttle, so about classic's 216x276 css or less per job; 12 MB total | a cached tile per ink and sixteenth; batch each ink into one path |
| tone | true dot-size ramps | one flat coverage per fill; ramps by bands |
| moving it | translate and rotate freely; scale during the slam (under 0.15 s) only, and hold it at 0.7 to 1.1x (below, the dots smear into a tint; above, they go soft and fat) | the dots stay pinned while the shape moves: true print behavior at any size |

Rotate all plates of one hero together (the classic does), or their angles drift into moire. A drain is stepping down
coverage: `K.levels` (the classic prints nine, 0.96 down to 0.10) or `K.pat`'s sixteen steps. Neither fades a mass by
alpha; the final 0.2 s `K.fade` is the only alpha fade.

### The sixteen steps
`K.pat` quantises coverage to sixteenths: values closer than 0.0625 are the same pattern. The light end depends on the
angle: gold and hot (0 degrees) print nothing at 1/16 and single device pixels at 2/16 (a gold fade blinks out early);
pink, violet and key print a sparse dust at 1/16. 0.25 to 0.75 is the clean stretch where the angle shows most. Thin
lines: a stroke under about 5 css px at coverage below 0.85 breaks into dashes. Fade line work on width and alpha,
keep its coverage at 0.85 or more.

### Overprinting on the indigo stock (screen blend)
swatches.png sections 2 (every pair, solid and at 0.5), 3 (pairs as the classic L), 5 (keeping the hero pure) and 6
(three-ink stacks). The solid overprint colors were computed and checked on the sheet.
- **Gorgeous** (a new saturated color; the pair still reads as two inks): pink + key = hot pink #FF69DF (tonal: the
  safest, the hero stays pink and gets brighter); pink + violet = candy lilac #FFA7F3; key + violet = orchid #EF92ED;
  pink + aqua = lilac white #FFD9F9 (the house highlight, luminous: spend it small); aqua + violet = ice blue #BCE3FC;
  gold + orange = fire yellow #FFDD66 (the best warm pair, the core of a flame); orange + key = coral #FF97B0 and
  orange + pink = bubblegum #FFA9CC (FX, not loss heroes); aqua + good = electric cyan #73ECF5 (money); gold + pink =
  peach #FFCEC1 (good as an edge, pale as a mass).
- **Washouts** (both hues die into near white; reads overexposed, not inked): aqua + gold, aqua + orange, aqua + hot,
  violet + gold, violet + hot, anything + white. Keep them apart, or overlapping only in slivers.
- **Muddy** (greyed, dusty): good + key #DFB7C5, good + violet #B7D4E9, good + pink #FFC4DA. Green is money; keep it
  out of the loss family.
- **Clashes** (side by side): orange next to aqua (complements vibrate, their overlap dies white), gold next to aqua
  (also heat + win: the wrong meaning for a loss), pink next to good (a holiday read). Orange + aqua + violet: never
  (the owner's rule; section 6 of the sheet shows why).
- **Three inks stacked wash toward white**, never toward the brown riso-windowseat warns about: the failure here is a
  pastel blowout. Pink + key + violet keeps a pink-lilac heart; gold + orange + pink keeps a warm peach; any other
  triple, keep the third ink out of the overlap.
- **The hero's purity** (section 5): screen has no "behind". Wherever the partner overlaps the hero you see the mix:
  a solid aqua plate under a solid pink L turns the L lilac white with two fringes. To keep the L pink: the partner at
  0.5 or less (it tints, the pink leads); or knock the partner out under the hero (on an offscreen canvas: partner,
  then the hero's path destination-out, then print both): the cleanest two-ink slam, a pure pink L with an aqua shadow;
  or a tonal partner (key under pink brightens pink instead of bleaching it).
- **Screens under about 20 degrees apart beat** at mid coverage (chains and loops at 0.5 / 0.5 in section 2): pink +
  orange, pink + gold, aqua + orange, a little aqua + violet. The loss partners (pop, light, night, key) sit 28 degrees
  or more off pink by design. Aqua as a partner is `pop` (45), never `win` (18: it beats against pink's 14). When two
  close-angle inks must overlap, put one at 0.88 or more.
- **Key on the dark stock is a low glow** (the results engine prints it at 55% alpha on dark); under 0.3 coverage it
  nearly vanishes. A deep tone, a shadow plate, a keyline: never a hero.
- **FX inks** (CONTRACT-FX): hot #FFD54A pairs with orange (fire), gold (a lemon core) and pink (hot peach); good
  #32A66E with aqua (electric cyan) and light. hot + aqua and hot + violet wash out. riso-fx.js screens hot at 68
  degrees (34 off orange, 22 off gold, 54 off pink), good at 22 and you at 79 (the swatch sheet assumed 0 and 34 for
  hot and good). good sits 4 degrees off `win` (18): never overlap those two at mid coverage.

## 2. Color decisions
- **A loss:** the pink hero (prepped solid, or live 0.81 to 0.88) plus at most two of key (a tonal shadow: the best),
  violet (night), aqua `pop` (the house miss: 0.5 or less, or knocked out) and light (a highlight under about 5% of the
  hero's area). Never gold, orange, good or `win` as the hero or a big mass: gold is heat, aqua is a win.
- **Dots:** win and loss differ by shape AND ink, both at 6 px. A loss mark in pink; its partner ink only as a fringe.
- **Scenes:** the painting's light ink, pink and key (blue) plus named ones; build each pair from the gorgeous list.
- **Hot Hand and perks:** hot + orange, + pink at the top tiers; good + light or aqua for a refund. Escalate by area,
  coverage and ink count (cold: one ink, small; supernova: four inks across the viewport), never by flicker.
- **82-0:** every ink allowed, still built from pairs; an all-ink overlap is a white blob, so overlap in slivers.
- New colors only the riso way: an overprint or a coverage. Never K.rgb into a color string (law 1, style-law.js).

## 3. Composition for a phone
- **The reel card** is about 375 x 540 css px (320 wide on a small phone), the header on top (`K.top`), the ledger of
  month strips filling it. `K.box` is the open span above or below the wound: the card's full width, `K.box.size`
  about 150 to 290 px, the L's ink spanning `y0..y1` (0.76 of size), the caption 26 px under `y1`.
- **Fill the box.** The hero's height is the box's (+-10%), its width 0.6 to 0.8 of that. A hero at half the box reads
  timid. Cropping by the card's edge is a strong move (Swiss, Big Type, One Dot) as long as the elbow stays in frame:
  the elbow is the L.
- **Read in a quarter second:** one big shape in high contrast to the stock, a simple contour, a squint-proof
  silhouette. Two or three shapes at most: the hero, one secondary (a shadow plate, a splash, a ring), one scatter
  (sparks, drops). Three things the same size compete: make the hero three times the next.
- **The L's identity:** a stem and a foot to the right meeting at a sharp corner, bottom left. Tilt within +-0.3 rad
  (the classic leans -0.15 to -0.2); never mirrored, never turned until it reads 7, J, V or an upside-down L. Foot at
  least half the stem's height; stem at least 15% of the height (20% for chunky).
- **Leave the wound and the row that lost clear** (the box does; the veil keeps a hole at the wound). Sparks may
  cross them, masses may not.
- **Type that survives at 320:** the theme faces only, mono 11 px or more, display 18 px or more, coverage 0.85 or
  more, on one plate, no deliberate miss. Text is ink: same screen, same composite. One word per beat; a line needs
  half a second of hold to be read, so long copy only in moments of a second or more (the caption already says the
  city and date).
- **Dots:** R is about 6 to 10 px. One silhouette with at most one carved detail (a notch, a crack, a hole); the loss
  differs in silhouette (broken, fallen, split), not only in ink. Judge them at 6 px.
- **Scenes:** the season's line is the dominant silhouette. Depth from three or four planes at falling coverage (the
  far plane lowest, with its own ramp into the horizon; nearer planes clear what they stand in front of); one area of
  detail, the rest simple; a second scale of life (one bird, one boat) gives the land its size. The banner shows about
  343 css px wide: anything under about 4 scene units disappears.
- **FX:** anchored on the element (`ev.x, y, w, h`) on a full-viewport layer; keep the action inside the middle 300 px
  of a 320 viewport and let each tier claim more of the screen than the last.
- **Prove the hardest frame first:** draw the hold frame (about e = 0.3) at 375 px, settle its value, inks and
  silhouette, then animate. Texture is not evidence the drawing works.

## 4. Motion for 0.45 to 1.9 s
The anchors: e = 0 is the slam (the cursor stops, `hit` fires: rings, spray, shake, the flash); the hero arrives by
about 0.07 to 0.12, reads by 0.25 and is gone by `E.dur`. The same piece must work at 0.45 s (a late loss in a bad
season) and at 1.9 s (the loss that kills a long streak); the slowest seasons stretch it to about 2.2.

1. **Entry, 0.1 s or less**, from out of the box to contact. There is no time for a slow anticipation: the cursor
   stopping and the hit ARE the anticipation. A wind-up is a pose, not a curve: two or three frames pulled back 5%,
   held, then released (riso-windowseat's kit has no easeInBack on purpose).
2. **Smear:** in the one or two frames before contact, stretch the hero along its travel (1.3 to 1.8 long, 0.8 thin),
   or let the partner plate lag. At 60 fps a fast unsmeared shape strobes as three copies.
3. **Impact frame:** squash (1.15 to 1.3 wide, 0.75 to 0.85 tall) anchored at the contact edge, not the center, and
   HOLD it two or three frames (0.03 to 0.05 s). The hold on the hit is where weight comes from. The card answers
   (`K.shake`, `K.jolt`, a dust ring, drops): follow-through lives in what got hit, and it has to be big to read.
4. **Overshoot and settle,** 0.15 to 0.3 s: `K.ease.back` (about 10% over) for a firm object, `elastic` for rubber,
   `bounce` for a drop. Heavy things settle in one bounce, springy ones in three.
5. **The long tail:** the aftermath that stretches with `E.dur` (a drain in coverage steps, drips, a crack spreading,
   ink soaking in, smoke rising, a peel lifting). The classic's "bang, then the long groan". It is what fills 1.9 s
   without a dead hold.
6. **Exit, the last 0.2 to 0.35 s, accelerating:** a fall with t2, a snap, a peel, a wipe; done by `E.dur`.
   `K.fade(E, e)` is the guard, not the design: an exit that eases out to nothing reads as lingering.

- **Scaling between 0.45 and 1.9:** beats 1 to 4 run in absolute seconds (a slam at half speed is a weaker slam, not a
  longer one); the tail takes what is left: `X = Math.min(0.35, 0.25 * E.dur)` for the exit and
  `tail = K.clamp((e - 0.3) / Math.max(0.12, E.dur - 0.3 - X), 0, 1)`. At 0.45 s that leaves about 0.1 s of tail and
  a 0.11 s exit, and it must still read. A concept whose action needs more than about 0.6 s before it says L (a flap
  board cycling, a polaroid developing) compresses: the L is legible by 0.25 even while the action continues.
- **Easing is a claim about mass:** a heavy L (anvil, wood block, iron) falls with t2, lands early and hard, throws
  grit; paper falls near-linear with sway and lands late and soft; ink flies ballistic. `K.ease.out` on a fall reads as
  a lift parking; `inOut` is for wipes and cameras, never weight. A ring's or an iris's area grows as the radius
  squared, so out and back are two-thirds done in their first third and flash: use inOut, or keep the area small.
- **On twos:** quantise the hero's secondary motion to 12 fps (`var eh = Math.floor(e * 12) / 12`): wobble, drip
  steps, flap ticks, the 8-bit and stop-motion families. It reads as drawn animation printed frame by frame. Keep the
  slam's travel and the shake on ones. A boil (two or three seeded contours cycled at 8 to 12 fps, 1.5 px or less) is a
  deliberate look; the screen never boils (`K.pat` is pinned; never re-seed grain).
- **Pure in e:** make the rng inside `draw`, every frame (`var r = K.rand(E.seed ^ 77)`), and draw from it in the same
  order every frame. One rng consumed across frames makes a replay differ and the texture crawl (law 4). Particles are
  analytic from their age (p0 + v * age + g * age2 / 2), not integrated. A one-shot element takes its start and end
  from the event and draws nothing outside them.
- **Check the seams:** each beat's local 0..1 is `K.clamp((e - t0) / dur, 0, 1)`; look at the frames on both sides of
  every boundary for a pop (a jump that is not the impact).
- **Timid motion is the commonest failure:** a scale change under 15%, travel under a third of the box, a hold where
  nothing moves: that is a slide transition, not a slam. The owner wants swings.
- **Photosensitivity (CONTRACT law 3):** only `K.flash` lights the whole card, and the engine limits it (one per heavy
  loss, at least 0.77 s apart). Nothing covering more than a tenth of the card (about 140 x 140 px: the L itself is
  about that) swings between bright and dark more than three times a second. Flicker concepts (Dead Neon, Final Bulbs,
  Op Art, Moire): two swings a moment at most, small areas, or coverage modulated by 30% or less instead of on and off.
  Light at high coverage is the biggest swing in the palette.
- **Write the effect card first,** five lines at the top of the file: cause and consequence; the beats in seconds; the
  plates and inks; what stretches with `E.dur`; the exit.

## 5. Style families
What makes each read as riso, and the one mistake that makes it look fake.
- **Letterpress, wood type** (woodtype, typewriter, ransom, bigtype). Reads: the impression, ink squeezed heavy to the
  edges and starved in the middle of a big counter (prep 0.98 at the edge, 0.8 inside), wood grain carved through the
  ink along the stem, a worn corner, the bite. Fake: a font fill with a drop shadow and grain lines drawn on top in a
  second ink.
- **Screen print** (squeegee, stencil, sticker, extrude). Reads: flat opaque layers at one coverage each, hard edges,
  layers that meet with a 1 to 2 px trap or an honest gap, a heavier deposit where the pull started. Fake: soft edges
  or a gradient inside a layer; layers with no relation to each other (no trap, no gap, no miss).
- **Comics, Ben-Day** (pow, comicheat, brick). Reads: Ben-Day dots you can count (one size, 6 to 12 px apart, drawn as
  circles filled with `K.pat` at 0.9), a keyline in key or violet of varying width or a carved stock gap, bursts with
  sharp points, speed lines. Fake: the engine's fine screen passed off as Ben-Day (at 2.4 px it is only a tint), and
  uniform-width outlines on everything.
- **Swiss poster** (swiss, bigtype). Reads: one huge grotesque glyph (Big Shoulders 900, 1.5 to 2x the box) cropped
  by the card's edge, a strict grid, small flush-left mono type, asymmetry, empty stock as a shape, two inks, flat.
  Fake: centering, "riso texture" added on top, a third type size.
- **Bauhaus** (bauhaus). Reads: a few primitives (bar, square, circle, quarter circle) on a grid, overlapping into third
  colors (pink + violet, aqua + violet), diagonal tension, flat coverage. Fake: the literal red, yellow and blue (a loss
  cannot be gold: pink, key, violet, aqua), bevels or shading on the shapes.
- **Constructivist** (bauhaus, tape, bigtype). Reads: hard diagonals at 15 to 30 degrees, heavy bars, type on the
  diagonal, a halftone photo block, pink + key standing in for red + black. Fake: everything level; the "black" as
  violet at low coverage, which prints grey.
- **Ukiyo-e, woodblock** (ukiyoe, the wave and ink-mountain scenes). Reads: a keyblock line of varying width in key or
  violet, flat color fields, bokashi (a hand-wiped gradient: a prepped ramp along one edge), patterns (wave claws, cloud
  scrolls, seigaiha arcs) carved out of the color, grain in the flats. Fake: uniform outlines, a smooth gradient, a
  pattern at a pitch so fine the screen shreds it.
- **Op Art** (opart, moire, linescreen). Reads: precise parallel or concentric stripes whose width modulates to make
  the shape; the L comes out of the modulation, not an outline; two inks. Stripes 4 css px or more at 0.9 or more, so
  the screen does not dash them. Fake: fast pulsing (the law, and it reads as a glitch), stripes under two screen cells
  that alias into noise on a phone.
- **8-bit** (gameover, arcade, pixels, dotstack). Reads: a coarse grid (8 css px cells or more for a hero, 3 for a
  dot), every pixel a square of `K.pat` (a screened square is the joy of pixel riso), a short palette, motion stepped
  on the grid at 8 to 12 fps. Fake: pixels small enough that the screen breaks them; smooth sub-pixel tweens.
- **Zine, photocopy** (zine, copier, ransom, tape). Reads: high contrast (a copier thresholds: coverage near 0 or near
  0.95), toner blotch at the edges, torn edges (a cut contour at 4 to 8 px with bites), tape strips at low coverage
  over things, a crooked layout, one scrawl as a tapered stroke. Fake: clean shapes under a noise overlay; copier grit
  is thresholding and edge blotch, not sprinkled specks.
- **Editorial halftone, newsprint** (headline, receipt, polaroid). Reads: a "photo" that is a real tonal drawing (a
  ball, a crowd, a lit face) screened coarse in one ink; column rules, a mono dateline, a 900 headline. The halftone
  carries the picture. Fake: a flat rectangle standing in for the photo, or a photo printed smooth.
- **Riso test sheet** (testsheet, separation, gangrun, trim). Reads: a registration target per drum, each landing at its
  drum's offset, crop marks, coverage bars (like swatches.png), drum names in mono, a scrawled note. Fake: perfect
  register (the point of a test sheet is that the drums miss) and too many elements.

## 6. The quality bar
Run `node tools/art-qa.mjs loss <id>` (or dots, scene): it prints contact sheets of three moments (streak, mid, late)
at e = 0, .05, .1, .18, .25, .35, .5, .7, .9, 1.1, 1.3 plus the budgets. Watch it at speed in
docs/art-lab/qa.html?watch=loss:<id>, at 375 and at 320. Look at the sheet at phone size AND at a 1:1 crop. Every line
must be a yes; record what you looked at and what you did not.

**Read** (the 0.25 s frame, all three moments, 320 wide)
- Is it obviously an L (or the brief's LOSS) in the first quarter second? Squint: blur the frame to a 40 px thumbnail;
  is the L still there?
- One dominant shape, in the box, the wound and the row that lost clear? The caption (or your own) readable?
- Does it read in the 0.45 s case, not only the 1.9 s one?

**Print** (1:1 crop)
- Does it look printed, not rendered? Screen visible in the mid-tones, solids mottled (prepped) or holed (0.81 to 0.88
  live), no smooth gradient, no glow, no flat fill?
- Is there a clear value plan: stock, one mid mass, one bright accent where the eye should go?
- One offset per plate; a fringe on masses and a crescent on dots; small type sharp?
- Three inks or fewer, a house pair, pink leading; no washout or muddy pair over a big area (check swatches.png)?
- No detail smaller than the screen can hold (under about 3 css px, or hairlines at partial coverage)?

**Motion** (at speed, several times)
- An impact frame (smear, squash, a hold) and a card that reacts?
- Nothing idle in the first 0.2 s and no dead hold anywhere?
- Gone by `E.dur` in all three moments, the exit accelerating?
- No pops at beat boundaries; the same frame twice is identical (seeded inside draw)?
- Photosensitivity: nothing over a tenth of the card swinging more than three times a second?

**Art**
- Would this be worth framing? Pause on the hold frame: would you hang it as a print?
- Is it different from the classic and from its neighbours: at least two of material or letterform, entrance,
  aftermath or exit, composition (law 7)? Put its sheet beside classic's and the last three variants of its kind; if a
  squint can't tell them apart, it fails the owner's "10 in a row".
- Is it one idea, done fully, or three ideas half done?
- Budgets pass (frame, prep, canvas memory, file size)?

Technical checks do not certify art, and good halftone does not rescue a failed silhouette: fix the silhouette, the
value and the action before the texture.

## 7. Anti-patterns seen in generated canvas art
- **Flat vector shapes with no screen:** `K.pat` at 0.95 or more over a big area prints flat (section 1 of the sheet);
  a mass that never shows a dot is a vector fill in disguise. Prep solids, or fill live at 0.81 to 0.88.
- **Everything at 100%:** no mid-tones, so no screen shows and there is no value hierarchy. Hero 0.85, secondary 0.4 to
  0.6, a solid accent; let the stock breathe.
- **Misregistration on every element equally, or randomly per element or per frame:** reads as a text-shadow effect
  or a vibrating glitch. One offset per plate, sized for the hero; small marks on one plate.
- **Too many inks:** four or five inks is a rainbow, and their overlaps bleach to white. Two inks and their overprint
  are already three colors.
- **Timid motion:** a slide with inOut, a 5% bounce, an alpha fade, no impact frame, nothing on the card reacting.
  Smear, squash, hold, shake, an aftermath, an exit that falls.
- **Timid scale:** the L at a third of the box, centered, wrapped in decoration. The hero fills the box; crop it if you
  dare.
- **Drawn noise:** per-frame specks, grunge overlays, "film grain": the texture crawls and reads digital. The screen,
  the grain, the starve and carved lines are the texture.
- **Fake light:** shadowBlur, blur, CSS filters, radial alpha gradients (all forbidden). A halo is a prepped coverage
  ramp, dots shrinking outward; a light is an overprint or a little white.
- **Shading with a second ink:** on screen blend it lightens the shadow side. Coverage falling to the stock is the
  shadow; the second ink is the highlight.
- **Overlap blowouts:** big solid overlaps of a washout pair, or a three-ink pile: a white blob where the art should
  be. Knock out, or overlap in slivers.
- **Scaled bitmaps that swim:** a prepped plate zoomed through a hold (dots grow, blur, crawl). Anything that changes
  size slowly is filled live with `K.pat`.
- **Detail below the screen:** features under two screen cells, hairlines at partial coverage, pixel art at 2 px; the
  screen shreds them into dust.
- **Glossy literalism:** glass, chrome, 3D bevels, photo-real anything drawn with gradients. "If that will cause
  conflicts with certain ones, nix them": a concept that only works glossy is cut, not faked; find its print version
  (glass becomes flat facets carved out of an overprint).
- **Busy:** particles everywhere, words everywhere, everything moving. Nothing reads in a quarter second.
- **The classic in disguise:** the same slam, rings, drain and fade in a new ink or font. Change the material, the
  entrance and the exit, not the paint.
