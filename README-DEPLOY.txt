CURRENT AGENT HANDOFF:
  Read AGENT-HANDOFF.md before modifying this build. It documents the current
  UI hierarchy, Daily gate fallback, rules-sheet order, and the slot-specific
  Small-Ball Apocalypse center rule.

TRUE 82 — full live site with THE DAILY (no accounts). Deploy-ready.

This is your ENTIRE public site plus The Daily. Nothing to merge, nothing
assumed already present. It is the no-accounts live lane: duel/league/weekly
entry points stay hidden by the #t82-live-hide block, accounts.js is not in
the script chain.

TO DEPLOY (preview or live):
  Put the CONTENTS of this folder at the root of your branch (where your
  current index.html lives) — not the folder itself, its contents. Commit.
  Cloudflare builds it. On a non-main branch you get a *.pages.dev preview
  URL; on main it serves at true82.net.

BEAT-MY-FIVE LINK: builds from the page's own origin, so it will point at
whatever URL Cloudflare serves this from. Works on any real https origin
(preview or live); does NOT work from a localhost file.

CRITICAL CHAIN (verified no-accounts):
  analytics.js, sim-core.js, challenges.js, daily-core.js, app.js
