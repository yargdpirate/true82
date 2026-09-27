# The TRUE 82 art bot

Motion capture in, stylized moving art out. The owner's brief (2026-09-26): "have an art bot create a bunch" of
background animations for the Redrafted's pick ceremony, "somewhat impressionistic, not attempting a biological
diagram ... highly styled drop dead gorgeous artsy renditions", made first, with where they go decided later. Not
part of the site: nothing here is served or tested by `node test.js`.

## How it works
- **Motion:** Adobe Mixamo motion capture (royalty-free for personal, commercial and non-profit projects per
  Adobe's Mixamo FAQ; no credit required). Downloaded as FBX with Mixamo's default mannequin body, 30 fps.
  Mixamo's terms forbid redistributing the raw files, so they live outside the repo in `~/true82-moves-raw/` and
  are linked here as `raw` (gitignored). Mixamo needs a personal Adobe ID (company-managed ones are refused).
- **Figure:** `artbot.js` (in headless Chromium) loads a move with three.js's FBXLoader, samples it at 24 fps
  and renders two passes per moment: a flat body and ball mask, and a lit shade pass. A ball is added by script
  (`moves.json` `ball`): `both` / `right` / `left` held, with an optional `release` on its own arc from the
  hand's real velocity (one floor bounce); `dribble` (bounces to the floor between the hand's highs); `catch`
  and `swat` (flies in from `from` to the hand at `contact`, then held or knocked `away`).
- **Styles:** plain 2D canvas over those passes, in the site's inks (read from `tools/theme-core.js`): `riso`,
  `neon`, `chrono`, `sunset`, `dots`, `vhs`. A style is one function in `STYLES`; add one and every move gets it.
- **Output:** PNG frames, then H.264 MP4s (540x540, 24 fps, on black so they can be screened over the dark
  ceremony) via the tennis project's ffmpeg-static, plus `out/gallery.json`.

## Run it
```
cd tools/artbot && npm install            # three.js, once
ln -s ~/true82-moves-raw raw               # the Mixamo FBX files
node sheets.mjs --sheets                   # contact sheets per move (sheets/), to time trims and the ball
node artbot.mjs moves.json [style ...] [--only id]   # render (a few minutes for everything)
```
Playwright and ffmpeg come from the tennis project (`PLAYWRIGHT`, `FFMPEG` override them).

## The first reel (2026-09-26)
Five moves (Mixamo names in brackets): Dribble (guard), Slam (Jump Attack), Block (Defender), Alley-oop (Football
Catch), Joy (Joyful Jump). Mixamo has no jump shot or dunk; Jump Attack's leap and overhead smash reads as a slam
once the ball is in it. Goalie Throw was rate-limited on the first pass and can join later. The six styles of all
five were published as a private gallery (Draft Night Moves) for the owner to star; his picks come back as an
`ART-BOT PICKS v1` block.
