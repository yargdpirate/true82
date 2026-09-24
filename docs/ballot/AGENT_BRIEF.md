# Brief for the wiring and restyle session

You are picking up the TRUE 82 voting UI. Two jobs, in this order: wire it into the live site, then restyle it. The owner cannot code and directs by taste; he will judge screenshots on his phone. His standard is Krug's "Don't Make Me Think": every tap a mindless choice, no legends or instructions, one meaning per color, and the test is whether his basketball-fan grandpa could use it with zero help. Tap count is not a concern. Clutter is: he rejected several versions for "the eye does not know where to land," so when in doubt remove something.

## What is fixed (do not relitigate)

- The interaction model. Card shows only what is true of the player; tapping a tag asks the trait's question in words with YES / NO / NOT SURE; a "?" badge marks unsettled tags; a way to add any trait to any player; blue ring means "you voted"; red means a bad trait and nothing else; gold means the site's yes. Details in `TAG_BALLOT_HANDOFF.md` sections 3 and 5.
- Placement. Results roster cards become the ballot and the bottom "did we get it wrong" widget goes away (section 1). The standalone `/bonuses/` page becomes the one-player-per-screen editor (section 7).
- Data flow. `op=labels` read side, `op=vote` per answer, the threshold and hysteresis, the negative traits as their own ids (sections 4 and 6). The scout persona stays off both pages.
- The rater page's restraint: no value, no panels, no headings beyond "Not on him", one question open at a time.
- House laws: no em-dashes in any shipped copy; never touch the game engine or site_data.json; D1 SQL is pure statements, no comment lines, idempotent.

## What you are free to change

Everything visual. The prototypes carry the site's current look (dark, gold keycaps, Barlow Condensed, Plex Mono) because that is what existed; the owner has asked for a style rework of both screens, so treat the prototypes as behavior specs, not pixel specs. Things he has said along the way that should shape the restyle: the gold-on-everything problem (when everything is gold nothing is; reserve the accent), the results card must stay short because five stack under a score, the standalone page should feel friendlier and simpler than the game screens, tags must look obviously tappable even to someone trained by the old static chips, and the number of visual states on a tag should stay at three (on, unsettled, off). Keep the engine value prominent on the results card (serif, large) and absent on the standalone page. A serif for the value was his pick; if the restyle drops it, say why.

## How to work

1. Read `TAG_BALLOT_HANDOFF.md` fully, then open `tag_ballot.html` and `rater.html` in a browser and tap through them. They are the behavior spec.
2. Read the live code: the results renderer, `functions/api/traits.js` (v49.9, already patched for `op=labels`), the `/bonuses/` page, and `op=vote`. Confirm the two open wiring questions in section 6 (unknown qid on first vote; `op=disputed` does not exist yet).
3. Propose a plan and a screenshot of the restyled results card before writing site code. The owner approves visuals first.
4. Wire results first, standalone second. Deploy after each. Verify with `https://true82.net/api/traits?op=labels&players=Kawhi%20Leonard~2019` and by drafting a team.
5. The D1 scout-claims migration (`0013_scout_claims.sql`) and traits.js v49.9 must be live before any of this reads real data. If the owner has not applied them, do that first: `npx wrangler d1 execute <db> --remote --file=migrations/0013_scout_claims.sql`, then deploy.

## Files in this package

- `AGENT_BRIEF.md`: this file.
- `TAG_BALLOT_HANDOFF.md`: the full spec.
- `tag_ballot.html`: results roster prototype.
- `rater.html`: standalone page prototype (final quiet version).
- `verdict_mockups.html`: static mockups of home, results, scoring card, season, record page; only the scoring card and record page sections are still relevant, as future work.
- `0013_scout_claims.sql`, `traits.js`, `DEPLOY_scout_claims.txt`, `d1-scout-claims.yml`: the database load and worker patch, plus a GitHub Actions file that runs the load without a local wrangler.
