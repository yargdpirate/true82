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
- **The scenes** (`SCENES`): `crossover` (dribble.fbx: four dribbles a loop, right, crossover, left, between the
  legs; loops seamlessly), `slam` (jump-attack.fbx: gather at the chest, cock back, throw down, hang, land flexing),
  `block` (defender.fbx and a rival on jump-attack.fbx with the jump cut down; the defender's leap aimed at the rival
  out from under the hoop, his left hand onto the ball), `oop` (football-catch.fbx, the jump stretched: the lob,
  one hand, the flush, the hang). Each has a key time (the big beat, about 1.1 to 1.3 s: where the draft chime's
  last note lands) and a camera that follows the play.
- **The passes**: an ID pass at twice the size without antialiasing (16 layers: skin, kit, shorts, trim and number
  per player, the ball and its seams, rim, net, glass, marks), averaged down to per-layer coverage, plus a lit
  shade pass.
- **The styles**: `riso` (a fluorescent three-drum print on black, each ink its own screen angle and
  misregistration, drawn on twos, a spotlight of dots on the floor, a starburst on the key beat), `neon` (every
  layer's outline a tube in its ink, trails behind whatever moves), `chrono` (a chronophotograph: every third moment
  stays on the plate, the current one printed opaque in pure inks, the ball's dotted gold path).

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
defender, jump-attack, football-catch, joyful-jump). Mixamo needs a personal Adobe ID (company-managed ones are
refused); in the app's browser pane its Download button does nothing, so exports went through Mixamo's own export
API from the signed-in page. Mixamo has no jump shot or dunk.

## The reels
Both live in the private gallery "Draft Night Moves" (https://claude.ai/artifact/XMPeniEFZARAtwz7QsPRSJ): reel 2
first (four moves, three styles, stars that copy out as an `ART-BOT PICKS v2` block), reel 1 folded underneath
for comparison. Reel 1's engine (six styles on the bare mannequin, `moves.json`) is in git history before round 2.
