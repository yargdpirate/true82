# RETURN HANDOFF - POLL FRONTEND RESTYLE (v47.19)

Cumulative on v47.18. BUILD_V stays "v47". Files changed: `app.js` (widget),
`bonuses/index.html` (voting page), `index.html` (app.js cache key ->
`?v=20260801-poll-frontend-r3-v47`). `styles.css`, `functions/`, and the engine
are untouched. Home and results widgets remain one shared module, so they
stay mirrored by construction.

## THE DEFINITION AUDIT (58-char cap) - ACTION NEEDED FROM YOU

Per the ask, NO copy was changed. The audit ran over the migration history
(final value per question, 203 questions tracked). 56 questions exceed 58
characters, but definitions are shared per trait, so it is **7 rewrites**:

1. [73] "Rotations, communication, help on time. The defense works because of him."
   - 7 team-defender questions (Draymond '17, KG '04, Gobert '21, Bam '22, Horford '18, Kobe '08, Harden '19)
2. [67] "Handles the other team's best scorer one-on-one, night after night."
   - 8 iso-defender questions (Kobe '08, Kawhi '19, Klay '16, Smart '19, Melo '13, Luka '24, PG '19, Harden '19)
3. [64] "Makes contested, late-clock, self-created shots at a high level."
   - 8 tough-shot-maker questions (Kyrie '16, Kobe '06, KD '14, Jimmy '20, Dirk '11, Booker '21, +2)
4. [63] "Dangerous without the ball: cuts, relocations, catch-and-shoot."
   - 6 off-ball-scorer questions (Kyrie '16, Klay '16, Middleton '21, KD '14, Redick '16, Melo '13)
5. [61] "Attacks the rim, gets fouled, forces teams to pack the paint."
   - 1 row keyed `rim-pressurer` (trait-level row; flagging as parsed)
6. [60] "Decrease his value in the game engine, those stats are fake."
   - 13 stat-padder questions (Westbrook '17-'21, Drummond '20, +7)
7. [59] "Real three-point volume and accuracy defenses must respect."
   - 13 shooter questions (Curry '16, Trae '22, Reggie '97, Ray '06, Westbrook '17, +8)

Send rewritten strings (<=58 chars each) and the next package ships them as
migration 0024: one comment-free D1 console paste updating every affected
question, per house law.

## Widget (homepage + results, one module)

- Share copy (r3): the widget bar now reads **Share Vote** (bold lead) then
  "(please don't vote brigade)" at the SAME small 9.5px mono as before -
  nothing on the widget grew. The COPIED beat stores and restores innerHTML
  so the bold lead survives the flash instead of being flattened to text.
- Vote row retuned (v47.19-r2): IDK is half its former equal-third (98px ->
  49px at 390), and the freed width splits evenly between YES and NO (98px ->
  123px each) - grid `5fr 5fr 2fr`. IDK's label steps to 16px/.06em so it
  never clips in the narrower slab (verified clean at 390 and 340px). One
  module, so home and results stay mirrored.
- Subtitle reordered: **HELP BALANCE THE GAME** (bold amber lead) ·
  VOTE ON PLAYER BONUSES. Still the standing link to /bonuses/ with the
  per-surface src stamping intact.
- "Crowdsourcing your vote to rate player fit properly." removed entirely.
- The diamonds (round-pips) are centered and enlarged (13px, 16px when
  done, wider gap).
- Below them: a thin, quiet 2D bar - full width, 32px, outlined, mono -
  reading `SHARE VOTE - PLEASE DON'T VOTE BRIGADE`. It is excluded from the
  3D decorator on purpose (genuinely 2D), reuses the whole existing share
  path (native sheet, clipboard COPIED beat, deep links, analytics), and
  hides on completion exactly as the old tool did. Net module growth is the
  bar itself, ~46px - the "reasonable" bound acknowledged in the ask.

## Voting page (/bonuses/)

- WHAT COUNTS? collapsible retired: the definition sits in the open under
  the metadata line at 15.5px (was 14.5 hidden).
- Card actions stacked: STATS REFRESHER on top, the share button below it.
  Sizing (r3): "STATS REFRESHER" and the "Share Vote" lead both render at
  21px - matched to this page's UNSURE control - while "(please don't vote
  brigade)" stays at its original small 13px. Both sizes are fixed by spec,
  so narrow screens are bought with tracking and padding only; at <=374px
  the parenthetical drops onto its own line (button 48px -> 58px) rather
  than shrinking below spec. Swept 320-430px: computed sizes exactly 21/21/13
  at every width with zero clipping on either button.
- Page foot: the small "TRUE 82 ->" text link is now a prominent, centered,
  full-amber 56px button reading PLAY TRUE82.
- The draft's star-and-basket mark (the exact `hoopMarkSvg` paths, inlined
  with the page's own palette) sits at the top right of the content column.
- Everything else on the page - vote path, pinned/share lanes, refresher
  resolution through /bbref-map.json, seen store, post-vote flow - is
  byte-for-byte behavior-identical and regression-covered.

## Validation

Widget suite: subtitle order + bold lead, crowdsourcing line gone, diamonds
centered and >=13px, bar thin (32px) / full-width / non-3D / exact copy with
no em-dash, COPIED beat restores the full label, growth capped at the bar,
plus the entire prior regression (shares, deep links, IDK, seen store,
decorator). Page suite: definition visible at 15.5px with the collapsible
gone, actions stacked in order with the brigade copy on one line, PLAY
TRUE82 centered amber 56px, the mark top right, plus the entire prior
regression (vote path, preload lane, exclude behavior). All six suites
green, including mid-season Heat Check under the real stylesheet.

## Deploy

Drag, commit, hard-reload once (app.js key moved; styles.css unchanged this
round). NO D1 action. Footer still "| v47".

Rollback: restore app.js, bonuses/index.html, index.html from v47.18.

## Smoke

- [ ] Widget: bold HELP BALANCE THE GAME lead, no crowdsourcing line,
      centered bigger diamonds, thin share bar below them; tapping it opens
      the share sheet / flips to COPIED and back to the full label.
- [ ] /bonuses/: definition visible under every question with no WHAT
      COUNTS? toggle; STATS REFRESHER above the share button; big centered
      PLAY TRUE82 at the bottom; star-and-basket mark top right.
- [ ] Vote once end to end - result beat, CHANGE VOTE, next question - all
      unchanged.
