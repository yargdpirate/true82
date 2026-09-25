# Recapture brief: TRUE 82 Reprint Lab snapshots (v51 style system)

The site (an NBA draft browser game, true82.net) was just moved onto one enforced style system:
the reel, the results page, the tag ballot sheet, the homepage vote card, the Bonuses page and
the section headers were rebuilt on shared pieces (.t-btn, .t-chip, .t-card, .t-sheet, .t-toast,
.t-head). The Reprint Lab (a design tool) shows the owner every screen of the game as frozen DOM
snapshots, re-themed live. Its snapshots were captured from the OLD site, so every screen must be
captured again from the NEW site. You capture a group of screens.

## Servers (already running; never start or stop servers)
- http://localhost:8789  the real site with its API and a local database (wrangler pages dev).
  http://127.0.0.1:8789 is the SAME site on a different origin, so its localStorage is separate:
  use it (or clear localStorage) for "first-time player" states.
- http://localhost:8093  the lab server. It serves snap.js and saves snapshots POSTed to it.

## How to capture one state
1. Browser: FIRST call mcp__Claude_Browser__tabs_create, then pass that tabId to EVERY call. Never touch other
   tabs (other agents share the browser). Set the viewport once: mcp__Claude_Browser__resize_window
   width 390, height 844 on your tab. Close your tab (tabs_close) when you finish.
2. Bring the page to the state (see your list; the note describes the state as it was captured on the
   old site: the look has changed, the STATE is what matters).
3. In the page (javascript_tool):
     await fetch('http://localhost:8093/snap.js').then(r => r.text()).then(eval);
     await T82SNAP('<snap name>', '<one-line note: what is on screen>')
   The reply says "saved <name>.html N bytes". The snapshot is the live DOM (canvases become images),
   so wait for canvases and animations to settle unless the state is mid-animation.
4. Check it: a screenshot of your tab at scale 0.5 is enough to confirm the state is right.

## Getting around the game (app.js functions are page globals)
- newGame("classic" | "cap"): starts a Classic or Presti (salary cap) draft. G is the run state.
- Auto-draft 5 picks through the UI (works in both modes):
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    for (let i = 0; i < 5; i++) { await sleep(700);
      const row = [...document.querySelectorAll('.player-row')].find(r => !r.classList.contains('off') && !r.classList.contains('cant-afford'));
      row.click(); await sleep(250);
      const b = [...document.querySelectorAll('.confirm-btn')].find(b => !b.disabled); if (b) b.click(); }
  To draft a specific player, find his .player-row by text and click it, then click the confirm button
  for the slot you want (the tray shows GUARD / FORWARD / CENTER buttons).
- After the 5th pick a Classic or Presti run plays THE SEASON reel (.reel-overlay). SKIP (#reelSkip)
  jumps to the finale; "SEE THE FULL RESULTS" (#reelDone) closes it. Then the Tribune newspaper overlay
  (.np-overlay) appears: its "SKIP TO RESULTS" button closes it and shows the results page.
- The Daily: the homepage plaque (THE DAILY #N) opens the gate; drag the ball down or tap PLAY IT.
- URL flags: ?midhot=1 forces the Mid-Season Heat Check (Presti), ?clutch=1 forces the post-season
  Hot Hand (Presti, 81 wins), ?risoslow=6 slows every reel effect 6x (to catch a loss mid-effect).
  Add a flag by loading the page with it (http://localhost:8789/?midhot=1) before starting the run.
- localStorage: "tb-hint" = "1" stops the one-time glove hint on the results ballot (set it before
  results captures unless you want the hint). "t82_daily1" holds the Daily records.
- Simulated failures: stub window.fetch in the page, e.g.
    const f = window.fetch; window.fetch = (u, o) => /op=session/.test(String(u)) ? Promise.reject(new Error('x')) : f(u, o);

## Rules
- READ ONLY: never edit files in /Users/ggz/true82, never run git.
- Keep snapshot names EXACTLY as listed (the lab looks them up by name).
- If a state cannot be reproduced exactly, capture the closest honest equivalent under the same name and
  say so in your report.
- Plain words in notes, no em-dashes.

## Your report (your final message)
- Captured: the names, one line each if anything is notable.
- Could not reproduce: name, what you captured instead.
- Visual problems you noticed on the NEW site (be specific: screen, element, what looks wrong). This matters:
  you are the first eyes on the rebuilt screens.
