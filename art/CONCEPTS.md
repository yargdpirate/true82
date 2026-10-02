# The concept catalog (v67)

Briefs for the variant authors: one line of idea each, the beats that make it read, and the one thing that makes it
different from the rest. They are starting points, not specs (the owner: "a starting point as opposed to the ground
truth"): an author may push a brief further if the result is more striking and still distinct. The owner's taste:
big stylistic swings in the riso ink-print family (two-ink slams that land off register, halftone, ink drops,
stamps), bold rather than subtle, readable at 320-375 px, never on a timer that drags.

Every loss moment: the hero reads by 0.25 s, is gone by E.dur (0.45 to 1.9 s), lives in K.box, and says LOSS (the
letter L unless the brief says otherwise). Every dot set: a win and a loss are told apart at 6 px by shape AND ink.
Every scene: the season's line is the dominant silhouette, every loss is marked on it, the fill gauge holds.

## The owner's rules for all of it (2026-09-30, verbatim where quoted)

1. **The riso engine, always.** "Make sure all animations use the riso engine; within that constraint go crazy." Every
   visible mark is ink printed through the halftone pipeline: shapes filled live with `K.pat(ink, cov)` at 0.88 or less (above
   that the pattern prints flat, with no dots or starve: see art/CRAFT.md) or plates screened in prep (`K.screen`,
   `K.levels`: the way to print a held solid, with its grain and starve specks); each ink plate sits a little off register from the others; composite with `K.blend`. No smooth
   gradients except halftone coverage ramps, no blur, glow, shadowBlur or CSS filters, no raw emoji (emoji are printed
   as riso separations through the kit), no anti-aliased flat vector fills standing in for ink. "If that will cause
   conflicts with certain ones, nix them." A concept that only works as glossy 3D or video is cut, not faked.
2. **"Make sure it's obvious it's an L."** At a glance, on a phone, in the first quarter second. The exceptions in
   this catalog (The Brick, The Sign) say LOSS just as fast another way; nothing else may.
3. **Colors: at least a tangential match to the standard game,** "as the base Vice colors clash hard with a lot of
   other combos". The kit's inks ARE the theme's, and the theme's print inks are real Riso drum colors (Fluorescent
   Pink, Aqua, Sunflower, Orange, Violet) on the indigo stock, so stay in them and choose combinations that sing:
   - **House pairs** (never clash on the indigo stock): pink + aqua (the house look), pink + key magenta (tonal),
     pink + violet (night), aqua + violet, pink + light (white highlights), gold + orange (fire), gold + pink (hot).
   - **A loss's hero is the loss pink,** with at most two partners from aqua (`pop`), magenta (`key`), violet
     (`night`) and white (`light`). Never gold or the win aqua as a loss's main ink: gold is heat, aqua is a win.
   - **At most three inks a piece** (celebrations and 82-0 may use more). Get new colors the riso way: overprint
     two inks (on the dark stock the screen blend mixes them: pink over aqua prints a lilac white) and vary coverage.
   - Never orange + aqua + violet together; never a rainbow.
4. **Art worth looking at for its own sake.** "One of the secondary goals of the game ... is for the viewer to see
   beautiful riso-ish art." Pick styles across the spectrum (letterpress, screen print, comics, Swiss posters, Bauhaus,
   ukiyo-e, Op Art, constructivism, 8-bit, editorial halftone, zine, risograph test sheets...). "Make the art until
   it's no longer inspired": when the catalog runs dry, invent more that is native to riso; stop when it isn't.
5. **"More than I could ever want, a Louvre"**: the owner picks the cream of the crop later in the lab, so breadth
   matters, but every piece must be finished, tested and good enough to keep.

## Loss moments (`art/loss/<id>.js`)

| id | name | the idea |
|---|---|---|
| woodtype | Wood Type | A chunky letterpress wood-type L drops onto the card, presses (wood grain carved through the ink, uneven inking at the edges), lifts to leave the grainy impression, which dries pale. |
| tear | The Rip | The card itself rips open along an L-shaped tear: jagged paper edges curl back (stock-colored flaps with a shadow), the loss ink glows through the gap, then the tear slowly closes. |
| spill | Ink Spill | One fat ink drop falls from above, splashes on impact (crown splash), and the puddle runs into an L-shaped channel as if poured, then drains down and away. |
| neon | Dead Neon | An L bent from neon tube flickers on (outline tube plus soft halftone aura, the flicker slow and small), holds, one elbow of the tube shorts out with a spark and the L dies segment by segment. |
| dotstack | Dot Stack | Fat halftone dots rain in from the top and stack into a blocky L (a pixel L built from dots, Tetris-like), hold, then the bottom row gives way and the stack collapses off the card. |
| spray | Spray Tag | An L sprayed in one fast stroke from top to bottom then across: overspray speckle, a heavy core, drips that run down from the corner, a tag-like flourish. |
| shatter | Glass L | A thick glass L (bright edges, inner reflections in pop ink) slams down and shatters on impact: shards fly with gravity and spin, fragments scatter and fade. |
| headline | Extra! Extra! | A newspaper front page spins in (the classic movie spin), stops dead: a giant L headline over "AT <CITY>", a halftone photo block, a dateline; it then drops away. |
| burn | Burn-In | The L burns into the paper: an ember edge (light and loss inks) eats outward in an L shape, the inside chars dark, sparks and smoke dots rise, it cools to ash and blows away. |
| melt | Wax Melt | A thick, glossy L slams in then melts: its arms sag, heavy drips stretch and pool on the row below, the whole letter slumps into a puddle. |
| typewriter | Strikeover | A typewriter strikes the L again and again (offset overstrikes, ribbon ink texture), the carriage dings and slides the letter off the card. |
| bulbs | Final Bulbs | A stadium scoreboard of round bulbs: they light to spell a big L (and a small FINAL), hold, then the bulbs pop out one by one from the top. |
| brick | The Brick | (Not an L: says LOSS with the ball.) A basketball arcs in, clanks off a drawn rim (the rim shakes), bounces away; a big CLANK word in comic type, the ball's arc trace left behind. |
| anvil | Dead Weight | A massive iron L falls like a cartoon anvil, slams into the card, which bends and bounces; a dust ring and crater cracks spread from under it, then it sinks through. |
| ransom | Ransom Note | L, O, S, S cut from different print sources (mismatched faces and inks, rough paper edges) slap down one at a time at angles, the L biggest. |
| brush | One Stroke | A sumi brush paints a single L: dry-brush streaks where the brush ran out, a splatter flick at the end, the ink spreading into the paper's grain and fading. |
| stencil | Stencil | A stencil plate with an L cut out slaps on, a spray pass hisses over it, the plate peels away revealing a crisp L with stencil bridges and soft overspray. |
| balloon | Deflate | A fat inflated L boings in with a heavy elastic wobble, then a puncture: it deflates with a wrinkle and a spin and flutters off. |
| splitflap | Departures | A split-flap board's tiles clatter through letters and land on L (and the city's three letters), hold, then flip back to blank. |
| zoom | One Dot | One giant halftone dot fills the card, the camera pulls back fast to reveal it is one dot of a huge L made of dots, then every dot shrinks to nothing. |
| bolt | Struck | A jagged lightning bolt shaped like an L strikes from the top of the card, branches flicker once, the strike leaves a scorch mark L that smolders and fades. |
| fold | Fold-Out | A paper L unfolds in three panels like a pop-up (each panel flips with shading), holds, then folds back and away. |
| crumple | Crumpled | The L is printed on a sheet that crumples into a paper ball (creases, shrinking) and gets tossed off the card with a bounce. |
| blot | Ink Blot | Ink splats into an L-shaped blot with a spatter ring and satellite drops, the blot spreads slightly into the paper fibers, then soaks away. |
| chalk | Chalk Talk | An L scrawled in chalk (dusty broken strokes, chalk dust falling), then an eraser wipes it off in a smear. |
| gameover | Game Over | An 8-bit pixel L blinks in with a tiny GAME OVER; the pixels dissolve out in a random order. |
| dominoes | Dominoes | A line of domino tiles in an L shape topples in a chain, the last one falls hardest. |
| receipt | Receipt | A thermal receipt prints out from the top with a big L and the game's line items (city, date), tears off and curls away. |
| pow | KO | A comic-book panel: a starburst with a huge L inside, speed lines and Ben-Day dots, the panel shakes and drops. |
| sticker | Slap Sticker | A die-cut L sticker slaps on with a curl at a corner, hangs a beat, then peels off from the corner and flies away. |
| squeegee | Pull | Screen printing: a squeegee pulls a bead of loss ink across a screen, the L appears behind the blade, the screen lifts off with a snap of ink threads. |
| separation | Separation | The L arrives as its three ink plates from three directions (one per ink), they almost lock into register, miss, drift apart and fade. |
| tumble | Tumble | A solid L drops from the top, bounces on the row that lost with a squash, tips over its corner and falls flat, then sinks. |
| frost | Frostbite | Frost crystals grow in from the wound into an L of ice (branching needles), it cracks across and melts into drips. |
| smoke | Smoke Signal | The L is written in drifting smoke (puffs of dots), it holds as a word in the sky, then the wind pulls it apart. |
| meteor | Impact | An L-shaped meteor streaks in diagonally with a burning tail, impacts beside the wound, a crater and a shockwave of debris. |
| tape | Caution | Hazard-tape strips (LOSS LOSS LOSS printed along them) slap across the card in an L, flap once, tear away. |
| stitch | Stitched | A needle runs a fast running stitch that sews an L into the card (thread in loss ink, the needle in pop), the thread is pulled tight, then snipped and pulled out. |
| sand | Sand Pour | Grains pour from the top into an L-shaped heap of sand, hold, then the wind blows the heap away grain by grain. |
| flatline | Flatline | A monitor trace runs across, spikes up and draws an L with its beat, then goes flat with a long line. |
| drain | Down The Drain | The L spins down a drain: a swirl of ink lines, the letter rotating and shrinking into the vortex. |
| slots | Jackpot? | Three slot reels spin and land L, L, L; the reels jitter and the lights die. |
| polaroid | Instant Film | A polaroid drops in; its picture develops from blank into a big L, then it slides off. |
| copier | Generation Loss | A copier light bar sweeps across: the L copies itself and each copy is worse (thicker, blotchier, more grain) until it is a blob that fades. |
| bigtype | Big Type | Kinetic typography: the L slams in, then AT, then the city, each word stacked and hitting the last, a type poster, then it all slides off. |
| hand | The Sign | (A hand, not a letter: the loser sign.) A cartoon hand in riso flat color pops in making the L sign (thumb and index finger), holds, waggles, drops. |
| vinyl | Record Scratch | A record with an L on its label spins in, the needle scratches (a jag of lines), the record slows to a stop and drops. |
| drum | Riso Drum | The L rolls in on a printing drum (a cylinder seen side-on), printing the letter as it rolls, the second ink pass lands off register. |

## Dot sets (`art/dots/<id>.js`)

A streak shows only in the moment (a burst every tenth straight), never as a mark on the settled stamp: the owner,
2026-10-02, "animations are great, persistent remainders on streaks of it are not" (art/CONTRACT.md, "A dot set").

| id | name | win / loss |
|---|---|---|
| stars | Stars and Xs | win: a five-point star that twinkles in; loss: a hand-drawn X with bleed. |
| tally | Tally | win: a bold vertical tally stroke; loss: a broken stroke fallen on its side. |
| diamonds | Diamonds | win: a faceted diamond (facets knocked out); loss: a diamond split by a crack, its halves apart. |
| checks | Marked | win: a rubber-stamped check mark; loss: a stamped cross in a circle. |
| arrows | Up and Down | win: an arrow up that pops up; loss: an arrow down that slams down. |
| drops | Fire and Rain | win: a flame (teardrop up) in the win ink; loss: a falling raindrop (teardrop down) that splats. |
| pixels | Pixels | win: a solid pixel square with a bright corner; loss: a broken pixel with missing quarters. |
| hoops | Swish and Clank | win: a ball dropping through a tiny ring; loss: a ball bouncing off the ring's edge. |
| suns | Sun and Cloud | win: a little sunburst with rays; loss: a cloud with a rain streak. |
| letters | W and L | win: a tiny letterpress W; loss: a tiny letterpress L, slightly smeared. |
| tickets | Tickets | win: a ticket stub with a punched hole; loss: a ticket torn in half. |
| moons | Phases | win: a full moon (craters knocked out); loss: a new moon (a dark disc with a thin rim). |
| confetti | Confetti | win: a confetti triangle spinning in; loss: a crumpled paper wad. |
| bars | Waveform | win: a tall bar; loss: a short bar with a drip; the ledger reads like an audio waveform of the season. |
| prints | Thumbprints | win: a whorled thumbprint in the win ink; loss: a smudged print dragged sideways. |
| bolts | Bolts and Drops | win: a lightning bolt; loss: a dull drip. |

## Scenes (`art/scene/<id>.js`)

| id | name | the season's line as... |
|---|---|---|
| dunes | Dunes | desert dunes and mesas under a huge sun or moon, heat shimmer lines, cactus silhouettes where the losses fall |
| wave | The Wave | a great cresting ocean wave in the woodblock manner: foam claws at the season's peak, spray at the losses, a small peak far off |
| alpine | Alpine | snowy peaks with snowcaps on the season's highs, ski tracks zigzagging down, pine dots on the slopes |
| volcano | Eruption | a volcanic island chain; the season's peak erupts (lava in the light ink), an ash plume, a dark sea |
| forest | Treeline | a pine forest ridge whose treeline is the record, mist bands between the ranges, a still lake |
| canyon | Canyon | a canyon rim carved by the record, layered strata bands, a river at the bottom |
| farmland | Patchwork | rolling hills of plowed field rows (stripes following the hills), a barn at the peak, hay bales at the losses |
| aurora | Aurora | an aurora curtain in the sky that follows the season, flat tundra below, a lake mirroring it |
| coaster | The Coaster | a rollercoaster track riding the record on trestles, the car at the season's end, a fairground below |
| reef | The Reef | an underwater reef whose coral heights follow the season, light rays from the surface, bubbles at the losses |
| glacier | Glacier | ice cliffs calving at the waterline along the record, icebergs, a low midnight sun |
| terraces | Terraces | rice terraces stepping up the hills in contour steps, each paddy mirroring the sky |
| clouds | Above The Clouds | a sea of cloud tops shaped by the season, seen from above, the sun sitting on them |
| planet | Horizon | a planet's curved horizon whose mountains are the record, a ringed giant hanging in the sky |
| bridge | The Bridge | a suspension bridge whose main cable is the season, towers at the peak, city lights and water |
| island | Archipelago | tropical islands with palms at the peaks, a lagoon, buoys at the losses |
| kirigami | Paper Cut | stacked paper-cut layers with shadowed edges, the season the front layer |
| topo | Survey | a cartographer's contour drawing of the record's ridge: hatching, grid ticks, elevation numbers |
| lighthouse | The Coast | sea cliffs along the record, a lighthouse on the peak with its beam, waves breaking at the losses |
| savanna | Savanna | flat-topped acacias along the ridge, a giant sun, birds |
| mars | Red Planet | a red desert of craters, rover tracks along the ridge, two small moons |
| skate | The Bowl | a concrete skate bowl whose coping is the season, a tiny skater at the peak, tags on the wall |
| highway | Road Trip | a highway riding the hills with its dashed line, telephone poles, a car near the end |
| shanshui | Ink Mountains | a shan shui ink painting: misty peaks, a pagoda on the summit, a lone boat |
| seismo | Seismograph | a pen trace on a drum of graph paper: the season as a seismogram, the losses as tremors |

## More loss moments, native to riso (added 2026-09-30 after the owner's "always use the riso engine")

| id | name | the idea |
|---|---|---|
| overprint | Overprint | Two big L plates (pink and aqua) slam in crossing at angles; where they overlap the inks mix into a third color; they slide into near-register and hold. |
| moire | Moire | Two coarse halftone screens rotate over each other; the interference blooms into a giant L of moire, then the screens spin apart. Keep the shimmer slow (photosensitivity law). |
| misfeed | Misfeed | The drum misfeeds: the L prints skewed and doubled, a smear streaks where the sheet slipped, a starve stripe runs through it. The beauty of a bad print. |
| rundry | Running Dry | The L prints from the top heavy and saturated and starves toward its foot into scattered specks, as if the drum ran out of ink mid-pull. |
| fountain | Split Fountain | A rainbow roll: two inks loaded on one drum blend across the L (pink into violet, or pink into aqua), the gradient made of dots that change ink, not tone. |
| knockout | Knockout | A flood of loss ink washes over the whole card with the L knocked out of it (paper showing through), then the flood drains down and away. |
| linescreen | Line Screen | The L printed in a line screen (parallel engraving lines, thick to thin) instead of dots; the line angle sweeps as it lands. |
| extrude | Block Shadow | A 3D block L built from three flat passes (face, side, shadow) in three inks, the passes landing one after another like a poster's layers. |
| ripple | Dot Ripple | The card's halftone dots swell in a wave out from the wound and the swell freezes into an L of fat dots, then the wave flattens. |
| testsheet | Test Sheet | A riso test print: color bars, crop marks, a registration target and a big L printed in every drum, with handwritten-style ink notes, slapped down and pulled away. |
| ghosting | Ghosting | The L prints, then faint ghost copies of it repeat down the card (the riso ghosting artifact), each paler, until the last fades. |
| setoff | Set-Off | The L prints, then a second sheet presses on it and lifts, carrying a mirrored, half-strength copy (wet ink set-off). |
| brayer | Brayer | A hand roller rolls ink in strips that build an L (the roller's seam leaves a gap each turn), then rolls back over it to erase. |
| marbling | Suminagashi | Rings of ink drop and spread like marbled paper; a comb drags them into an L shape, then the water stills. |
| gangrun | Gang Run | A sheet of a dozen small Ls prints in a grid (like stamps or stickers), one by one, then the sheet tears off along the perforations. |
| trim | Trim | Crop marks frame a big L, a guillotine blade drops and slices the sheet, the cut-off strip falls away. |
| showthrough | Show-Through | The L was printed on the back: it shows through the paper faintly mirrored, then the sheet flips over to the front and it hits full strength. |
| bauhaus | Bauhaus | A constructivist L assembled from flat primary shapes (a bar, a block, a circle) in the house inks, sliding into place on a grid. |
| swiss | Swiss Poster | International Typographic Style: a giant grotesque L cropped off the card's edge, a grid of small type (the city, the date, the score), flush-left and razor clean, printed in two inks. |
| opart | Op Art | Concentric stripes bend around an L-shaped field and pulse once, like a Bridget Riley print (no flicker past the law). |
| ukiyoe | Woodblock | An L carved as a ukiyo-e woodblock print: flat color areas, keyblock outlines, a wave or cloud pattern inside it. |
| zine | Zine Cut | A photocopied, cut-and-paste zine page: a torn halftone photo of an L, tape strips, a scrawled note, all off-register. |

### Future note (the owner, 2026-10-02): looks for a month with more than one L

Not to build yet, only to remember. The owner sees three of the loss looks as possible looks dedicated to a month that
takes several Ls: **gangrun** (a sheet of small Ls, one per loss), **ghosting** (each loss a paler ghost of the one
before) and **separation** (the plates of the month's losses drifting further out of register). Until then they stay
ordinary loss moments, dealt one loss at a time like every other look.

## Hot Hand packs (`art/hot/<id>.js`; the shared riso FX layer)

The Heat Check (Presti's Hot Hand, post-season at 81-1 and mid-season) spins a wheel that locks on COLD, WARM, HOT, ON
FIRE or SUPERNOVA, then a verdict: the save ("CATCHES FIRE", or 82-0) or NO SAVE. Today: nothing for WARM and HOT, a
flame-emoji spray for ON FIRE, five flame-emoji volcano plumes for SUPERNOVA, goat/ball/trophy emoji fireworks for the
save. A pack restyles all seven beats in one look, and they must ESCALATE: each tier bigger than the last, SUPERNOVA
the biggest thing in the game after 82-0. The owner asked for several, "inc. emoji animations": emoji appear as riso
separations (the kit prints an emoji's colors as two or three inks), never as raw emoji.

| id | name | the look |
|---|---|---|
| emojifire | Riso Emoji | Emoji printed as riso separations: a cube of ice (cold), a thermometer (warm), a flame (hot), a storm of flames (on fire), meteors and a volcano (supernova), goat, ball and trophy fireworks (the save), a cold face that frosts over (no save). |
| jam | Heating Up | The arcade call: HEATING UP, HE'S HOT, ON FIRE in chunky riso type with a flaming ball trail; at supernova the net itself burns. |
| comicheat | Comic Heat | Comic-book panels: Ben-Day dot flames, burst balloons (WARM! HOT!), a full-panel explosion for supernova, KA-BOOM. |
| solar | Stellar | Stellar classes: an ember, a star, a solar flare, a supernova shockwave of halftone rings; the save is a new star born. |
| match | Fuse | A match strikes (warm), catches (hot), a fuse sparks along the screen (on fire), fireworks (supernova). |
| thermo | Redline | A riso thermometer or gauge needle climbs through the tiers and bursts its glass at supernova. |
| phoenix | Phoenix | Sparks gather into a riso firebird that rises by tier and sweeps across the screen at supernova. |
| arcade | Combo | Arcade combo counters: the game's live Hot Hand multiplier (ev.m, never a number of its own) in pixel digits with pixel flames; the save is a high-score screen. |

## Presti perks (`art/perk/<id>.js`; the shared riso FX layer)

On a paid Presti spin, 7.5% REFUND (the dollar comes back; money green) and 7.5% FIRE SALE (every price on the board
drops $2; fire gold). Today: a dollar-bill emoji spray and a down-arrow emoji spray from the cost buttons. A pack does
both as a matched pair in one look, anchored on the cost buttons, about a second, readable at 320 px.

| id | name | refund / fire sale |
|---|---|---|
| emojicash | Riso Emoji | riso-separated dollar bills fluttering up / price tags with down arrows and flames |
| register | Cash Register | the drawer pops and a REFUND receipt prints / a price gun stamps -$2 tags across the board |
| moneyprint | Money Printer | a riso drum prints bills that shoot out / it prints FIRE SALE flyers that scatter |
| coins | Coin Drop | coins print and bounce / a price tag catches fire and burns down to the new price |
| stamps | Stamped | a big REFUND rubber stamp / a FIRE SALE stamp with a burnt edge |
| jackpot | Jackpot | three reels land $ $ $ / three reels land flames |
| ticker | Ticker | a +$1M ticker tape / a price chart that crashes in flames |

## 82-0 (the owner: "make the successful 82-0 results screen art the extra special ones ... I want it to feel so much better than 81-1")

Two kinds work together: the **goat** fireworks (`art/goat/<id>.js`, the shared FX layer: the results' W/L box, the
GOAT climb, the Hot Hand save that reaches 82-0, the reel's 82-0 finale) and the **perfect scenes**
(`art/scene/<id>.js` with `perfect: true`): the results print for an 82-0 season comes ONLY from the perfect scenes,
never from the ordinary ones, so 82-0 looks unlike anything an 81-1 can earn. A perfect scene may print in every ink,
may animate after its reveal (`live`, a few seconds of riso fireworks, confetti or shimmer, then still), and gets the
title treatment of a champion.

| id | kind | name | the idea |
|---|---|---|---|
| summit | scene | The Summit | the season's line as a mountain finally summited: a flag planted on the peak, a sun of double-hit gold, riso fireworks over the range |
| constellation | scene | Constellation | the 82 wins as stars joined into the season's line across a pink and violet nebula; a shooting star; it twinkles after the reveal |
| rafters | scene | Banner Night | arena rafters: a championship banner reading 82-0 unfurls among the old ones, spotlights sweep the crowd whose heads are the season's line |
| parade | scene | The Parade | a city whose skyline is the season, ticker tape and streamers falling over the parade route |
| kintsugi | scene | Gold Seam | the line as a seam of gold leaf across indigo, sakura petals of pink falling, a full moon |
| sunrise | scene | Every Ray | a sun fully risen with a ray for every win, the land and water full of color to the right edge |
| goatpeak | scene | The GOAT | a goat silhouette standing on the season's summit against a giant sun |
| emojigoat | goat | Riso Emoji | goat, ball and trophy emoji printed as riso separations, exploding as shells |
| shells | goat | Fireworks | riso firework shells: chrysanthemums of halftone dots in four inks, trails, crackle |
| tickertape | goat | Ticker Tape | streamers and confetti printed in the house inks, raining and spinning |
| banner82 | goat | Banner | a championship banner unfurls reading 82-0, with fireworks behind it |
