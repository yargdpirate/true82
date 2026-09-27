# The TRUE 82 art bot

Motion capture in, stylized moving art out. The owner's brief (2026-09-26): background animations for the
Redrafted's pick ceremony, "somewhat impressionistic, not attempting a biological diagram ... highly styled drop
dead gorgeous artsy renditions", made first, with where they go decided later. Not part of the site: nothing here
is served or tested by `node test.js`.

## Round 2 (2026-09-26, late): what the owner asked for and what the bot does
His notes on the first reel: riso for all of them, neon and chrono kept too; the dribble head-on "the same way
Adobe does", turned into crossovers and between-the-legs for the guard; a hoop for the slam ("change the arms" at
the end of the dunk), the block ("have someone attacking the rim") and the alley-oop; joy dropped ("not on
theme"); and "we have to put these characters in basketball clothes because right now they look like fembots".
"Use a lot of creative license ... a starting point as opposed to the ground truth."

- **The body.** Mixamo's X Bot (every export came on it). Its body has holes at the joints filled by separate
  ring pieces; both are skin here. Shoulders squared (the arm joints set 24% further out), the head 7% smaller.
- **The uniform** (`dress`): every piece is a shell of the body's own skin, pushed out and re-weighted, so it moves
  with the capture. A jersey that hangs straight from the chest (it hides the X Bot's waist) with white piping at
  the neck and arm holes and a number front and back (an ID texture projected in the rest pose); baggy shorts to
  the knee whose hem swings with the thigh, with a white stripe; high socks; high-tops; a headband (a rigid ring on
  the head joint); wristbands. The rival wears the road white.
- **Posing** (`pose`): the capture at the scene's clock, then changes on top: `mirrorBlend` (the pose's mirror
  image, left and right swapped, blended in: the crossover's weight shift), `reach` (two-bone arm reach: hands onto
  the ball, onto the rim, into a flex), a vertical stretch of a jump (`fig.jump`).
- **The hoop** (`makeHoop`): rim, neck, glass (drawn as glass: it never hides what is behind it), its edge and the
  shooter's square, and a net of 12 cords that opens around the ball, drags down as it goes through and snaps back.
- **The ball**: seams (an ID texture) and spin from its travel; flights are gravity (`lob`, `loose` with bounces).
- **The scenes** (`SCENES`, round 3): `crossover` (dribble.fbx held at its low point, squared to the camera; both
  arms driven through a combo, the finger pads on the ball: `handOn`; then the shrug), `slam` (jump-attack.fbx, a
  one-hand tomahawk; the rim placed off the shoulder at the apex; then the Roar), `block` (defender.fbx flown in from
  off the frame, straight up at the ball; a quiet shooter on jump-attack.fbx at 90%; then the wag), `oop`
  (football-catch.fbx, the jump stretched: the two-hand grab and shove; then the Luka jump). Each has a key time and
  a camera that follows the play and then frames the celebration.
- **The passes**: an ID pass at twice the size without antialiasing (16 layers: skin, kit, shorts, trim and number
  per player, the ball and its seams, rim, net, glass, marks), averaged down to per-layer coverage, plus a lit
  shade pass.
- **The styles**: `riso` (a fluorescent three-drum print on black, each ink its own screen angle and
  misregistration, drawn on twos, a spotlight of dots on the floor, a starburst on the key beat), `neon` (every
  layer's outline a tube in its ink, trails behind whatever moves), `chrono` (a chronophotograph: every third moment
  stays on the plate, the current one printed opaque in pure inks, the ball's dotted gold path).

## Round 3 (2026-09-27): the owner's notes on reel 2, and what changed
His words: the crossover "should probably not rotate. his body hold still and have him dribble between his legs,
behind both his legs, and in front of his legs ... rapidly with a stylized teal trail", the ball "on his
fingertips"; the slam's hoop "shifted right" with the "arms extended at the apex", hands dropping "to his sides then
... a celebration", and "crazy stylized visual flair" when the ball goes in; the blocked player "shorter and
deemphasized ... only a quiet outline", the blocker leaping in "from out of the right side of the frame"; the
alley-oop with "two hands ... grab the ball briefly and shove it downwards and in"; "unique post-move celebration
animations for each"; the collarbone "bowtie" smoothed; "don't include typography on the jerseys"; and "look at nba
blocks and slam reference photos ... look up tomahawk". He sent Butler, Giannis and Luka celebration photos.
- **References used** (viewed, not saved): Kyrie Irving combos and behind-the-back drills (a wide low stance, head
  up, the hand on top of a low pound, the off arm out); LeBron's and Ja Morant's tomahawks (cocked high behind the
  head on an extended arm at the top of the jump, chopped over the front of the rim, the arm extended over the
  cylinder; the rim in front of the shoulder, a little under it); NBA blocks at the rim (at or above rim height, a
  foot or two in front of it, the blocker straight up).
- **Celebrations from Mixamo** (downloaded with the owner's OK, animation only, into `~/true82-moves-raw/`):
  Shrugging (the crossover, the Jordan shrug), Roar (the slam), No (the block, raised to Mutombo's finger wag beside
  the head), Taunt: Flexing Muscles (a spare); the alley-oop uses Joyful Jump (the Luka, arms spread).
  `thenCelebrate` hands the move to its celebration: a crossfade, the clip moved to where he landed and turned to
  face the camera (`rebase`).
- **Clips are sampled by hand** (`bindClip`, `applyPlan`): three.js's mixer skips a joint whose value did not change,
  so changes laid on a held pose piled up from frame to frame (the frozen dribble stance sank). Now every joint is
  written every frame, and several clips blend joint by joint.
- **Impacts** (`sc.impacts`, `sc.slowmo`): slow motion (0.3x for a fifth of a second), a camera shake, the rim
  bending down and shuddering (it hinges at the back, `hoop.rimG`), and in each style a flash, a comic starburst,
  two shockwaves, manga focus lines and sparks (lightning in neon; the moment burned into the chrono plate). Effects
  age in real time, so they hit at full speed while the picture runs slow.
- **The trail**: the ball's last tenth of a second as a tapered teal ribbon, in the speed moments only
  (`sc.trailWin`; always on the crossover).
- **Quiet figures** (`fig.quiet`): the block's shooter prints as a thin outline in every style.

## Run it
```
cd tools/artbot && npm install            # three.js, once
ln -s ~/true82-moves-raw raw               # the Mixamo FBX files (never commit them)
node artbot.mjs [scene ...] [--styles riso,neon,chrono] [--px 720]      # MP4s in out/<scene>/<style>.mp4
node artbot.mjs slam --look 0.5,1.1,1.6 --px 540                       # flat-color layer checks in look/
node artbot.mjs tpose --look 0,0.5,1,1.5                                # the dressed body in its rest pose, turning
```
`tposenude` shows the uniform alone. Playwright and ffmpeg come from the tennis project (`PLAYWRIGHT`, `FFMPEG`
override them). All four scenes in three styles take about 3 minutes at 720 px.

## Sources
Adobe Mixamo motion capture: royalty-free for personal, commercial and non-profit projects per Adobe's Mixamo FAQ,
no credit required. The raw FBX files may not be redistributed, so they live in `~/true82-moves-raw/` (dribble,
defender, jump-attack, football-catch, joyful-jump; round 3 added roar, no-finger-wag, shrugging, taunt-flexing). Mixamo needs a personal Adobe ID (company-managed ones are
refused); in the app's browser pane its Download button does nothing, so exports went through Mixamo's own export
API from the signed-in page. Mixamo has no jump shot or dunk.

## The reels
All live in the private gallery "Draft Night Moves" (https://claude.ai/artifact/XMPeniEFZARAtwz7QsPRSJ): reel 3
first (four moves, three styles, stars that copy out as an `ART-BOT PICKS v3` block), reels 2 and 1 folded
underneath for comparison. Reel 1's engine (six styles on the bare mannequin, `moves.json`) and reel 2's are in git
history.
