/* ---------- LB.surfaces: the two places the boards touch the game (Leaderboard Lab) ----------
   Two questions, six answers each, and the owner judges both in a screenshot at 320px.

   THE LINK (start screen). His words: centre-top of the start screen, it may carry some style, but the
   TRUE 82 logo stays the star and the link must not clutter or take away from it. So every variant here
   is small, quiet by default, and lives in the ONE empty space the home has: the middle of .hm-top,
   between HOW TO PLAY and the 44px account slot.

   THE HOOK (after a game). His words: something that draws them to the leaderboard without the page
   becoming endless visual clutter competing with everything else. The results screen is already a long
   scroll with ten-plus taps in it, so the six hooks run from "no new block at all" to "a sheet that
   interrupts". The loud ones are built at full weight on purpose: he should be able to SEE that one is
   too much rather than read a sentence saying so.

   WHAT THIS FILE KNOWS ABOUT THE REAL PAGES, all of it measured, none of it guessed:

   .hm-top (styles.css:4005) is display:flex, justify-content:space-between, height 44px, with exactly
   two children: #homeRulesBtn (.hm-howto, 103.65px at 320px) and an empty span.hm-acct (fixed 44px).
   The free centre at 320px is 92.7px. "Boards" is 48.6px and "Top scores" is 73.5px at 600 14px Rubik.
   A label wider than the cap either collides or pushes the row, so a variant either stays under the cap
   and sits in flow, or it comes out of flow and is centred absolutely. Every note below says which.

   What the 92.7px cap actually is, measured in a browser against the real styles.css rather than taken
   on faith: at a 320px viewport the row is 300px wide (288px of content plus its own -6px side
   margins), HOW TO PLAY ends at 103.08px, the account slot starts at 256px, so the raw gap between them
   is 152.9px and the row's TRUE centre is 150px. The cap is that same geometry seen from the centre:
   twice the distance from the centre to HOW TO PLAY's right edge (2 * (150 - 103.65) = 92.7, measured
   93.84), which is the widest an absolutely centred label can be and still clear the button. Every
   label here is inside it. The audit's other figures check out to the pixel too: "Boards" measures
   48.56px at 600 14px Rubik against its 48.6.

   One number worth staring at before judging the centred variants: space-between puts an IN-FLOW
   element's centre at 179.6px, which is 29.6px right of the row's true centre, because the left control
   is 103.65px and the right one is 44px. So "centred in the gap" and "centred under the logo" are two
   different places about 30px apart, and at 320px that gap is plainly visible against the logo above.
   "pip" sits in flow so he can see the first; the other five are absolutely centred so he can see the
   second. Each note gives its own measured width and how much room it leaves beside HOW TO PLAY.

   .brand-art is off limits: renderIntro attaches the five-tap Kaman easter egg to that element, so a
   link inside it feeds the egg. Nothing here ever mounts there.

   Anything placed in .hm-top inherits the home-only hide rule at styles.css:4006 for free, so no START
   variant needs a visibility guard of its own. Each note says so rather than leaving it to be assumed.

   EVERY BUTTON THAT LANDS ON A REAL PAGE CARRIES tm-flat, OR IS ALREADY EXCLUDED. app.js:780 runs a
   document-wide MutationObserver that adds .presti-spin to every <button> not in BTN3D_EXCLUDE, and
   look.css boosts button.presti-spin with #lab-k#lab-k. That is exactly how the board tabs became gold
   keycaps (SPEC.md "must fix" #2). tm-flat is the documented opt-out; .t-chip and
   .t-btn[data-kind="text"] are already excluded in both files, so those two need nothing.

   The results markup these hooks sit in (app.js renderResults, about line 9300):
     .res-comp        the comp phrase, where scheduleSharePct() injects <span class="comp-pct">Top X%
                      </span> about 1.6s after paint. "after-comp" mounts directly under it: proven
                      async slot, natural home.
     .actions         a flex row, gap 8, holding #againBtn ("Run it back", or "Run it back · practice"
                      on a Daily). "actions" mounts a sibling here.
     #runStatus       <p class="run-status">, centred, reserved height, written to by nothing today.
                      "bottom" mounts inline content here, so these strings use spans, never blocks.
     "sheet"          a .t-sheet over the whole screen, once per session.

   Rules kept: ES5, no DOM at load time, colour and type only from var(--t-*), no Math.random, no
   Date.now, no em-dashes, reads at 320px. The buttons are inert markup; the lab wires nothing. */
(function () {
  "use strict";
  var g = typeof window !== "undefined" ? window : this;
  g.LB = g.LB || {};
  var LB = g.LB;

  /* Below this many GMs a percentile is one person dressed as precision, so the raw count shows
     instead ("9th of 25"). Same floor the board's own crowd line uses. */
  var FLOOR = 30;

  /* The comp ladder, labels and win totals copied from app.js HISTORY_COMPS (app.js:4564) plus the
     perfect season's own name from shareCompFor (app.js:5549). Only "The named rung" reads it. If that
     variant is the pick, ship it reading HISTORY_COMPS itself: this copy exists so the lab needs
     nothing from app.js, and it is the one thing in this file that can drift. */
  var RUNGS = [
    { wins: 82, label: "Greatest of all GOATs" }, { wins: 81, label: "Dream Team" },
    { wins: 80, label: "Redeem Team" }, { wins: 79, label: "OG Death Lineup" },
    { wins: 78, label: "Hamptons 5" }, { wins: 77, label: "Shaqobe Core" },
    { wins: 76, label: "OG Celts Big 3" }, { wins: 75, label: "’08 Celts Big 3" },
    { wins: 74, label: "3-peat Bulls Core" }, { wins: 73, label: "’16 Warriors" },
    { wins: 72, label: "’96 Bulls" }, { wins: 71, label: "Lob City Lineup" },
    { wins: 70, label: "Prime Wilt Core" }, { wins: 69, label: "’72 Lakers" },
    { wins: 68, label: "Fo’ Fo’ Fo’ Co’" }, { wins: 67, label: "’86 Celtics" },
    { wins: 66, label: "Heatles" }, { wins: 65, label: "’16 Spurs" },
    { wins: 64, label: "The Last Shot Jazz" }, { wins: 63, label: "Bad Boy Pistons" },
    { wins: 62, label: "Beautiful Game Spurs" }
  ];

  /* ---------------- small helpers ---------------- */

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function commas(n) {
    var s = String(Math.max(0, Math.floor(Number(n) || 0))), out = "", i;
    for (i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 === 0) out += ",";
      out += s.charAt(i);
    }
    return out;
  }

  function ordinal(n) {
    var v = Math.floor(Number(n) || 0), t = v % 100, d = v % 10, suf = "th";
    if (t < 11 || t > 13) { if (d === 1) suf = "st"; else if (d === 2) suf = "nd"; else if (d === 3) suf = "rd"; }
    return v + suf;
  }

  function fieldOf(recipe, data) {
    if (data && typeof data.field === "number" && data.field > 0) return data.field;
    return Math.max(0, Math.floor((recipe && recipe.field) || 0));
  }

  function rankOf(recipe, data) {
    if (data && data.you && data.you.rank) return Math.floor(data.you.rank);
    return Math.max(0, Math.floor((recipe && recipe.youRank) || 0));
  }

  /* The percentile, or null when there is no honest one. Null covers all four reasons: no finished run,
     not on the board, a field under the floor, and a rank the field cannot hold. Phrased only as a
     ceiling, never a floor, and clamped off 100 so last place never reads "Top 100%". */
  function pctOf(recipe, data) {
    if (!recipe || !recipe.hasRun) return null;
    var rank = rankOf(recipe, data), field = fieldOf(recipe, data);
    if (rank < 1 || field < FLOOR || rank > field) return null;
    var p = Math.ceil((rank / field) * 100);
    if (p < 1) p = 1;
    if (p > 99) p = 99;
    return p;
  }

  /* The player's own score as the board prints it ("78-4"), or null. Display strings only: this file
     never re-derives a number the data module already formatted. */
  function scoreOf(recipe, data) {
    if (data && data.you && data.you.score) return String(data.you.score);
    var i, rows = (data && data.rows) || [];
    for (i = 0; i < rows.length; i++) if (rows[i] && rows[i].you && rows[i].score) return String(rows[i].score);
    return null;
  }

  function winsOf(recipe, data) {
    var s = scoreOf(recipe, data), m = s && /^(\d{1,2})-(\d{1,2})$/.exec(s);
    return m ? Number(m[1]) : null;
  }

  function rungFor(wins) {
    var i;
    for (i = 0; i < RUNGS.length; i++) if (RUNGS[i].wins === wins) return RUNGS[i];
    return null;
  }

  /* One sentence, two facts, no ask and no guilt: the signed-out player who just finished a season.
     Returns "" when it does not apply, so every hook can paste it in unconditionally. */
  function ghostLine(recipe) {
    if (!recipe || recipe.signedIn) return "";
    if (!recipe.hasRun) return "Boards list verified seasons from accounts.";
    return "Signed-in seasons land on the board. This one is saved on this phone.";
  }

  /* The board's own size, as a fact about the board. Used wherever there is no number for the player. */
  function fieldLine(recipe, data) {
    var field = fieldOf(recipe, data);
    if (!field) return "Today’s board is open.";
    if (field === 1) return "1 GM is on today’s board.";
    return commas(field) + " GMs are on today’s board.";
  }

  /* The standing, in whatever form is true: a percentile above the floor, a raw count below it, and
     nothing at all when there is no finished run or the player is not on the board. */
  function standingLine(recipe, data) {
    var p = pctOf(recipe, data), field = fieldOf(recipe, data), rank = rankOf(recipe, data);
    if (p != null) return "Top " + p + "% of today’s " + commas(field) + " GMs";
    if (recipe && recipe.hasRun && rank > 0 && field > 0) return ordinal(rank) + " of " + commas(field) + " on today’s board";
    return null;
  }

  function textBtn(label) {
    return '<button class="t-btn" data-kind="text" type="button">' + esc(label) + "</button>";
  }

  function join(lines) { return lines.join("\n"); }

  /* ---------------- START: the link in the empty centre of .hm-top ---------------- */

  var START = [
    {
      id: "quiet",
      name: "Quiet word",
      mount: "hm-top",
      note: "One word in the row’s true centre, at .hm-howto’s own weight and colour, so the top bar reads " +
            "as two equal utilities flanking nothing and the title art keeps the whole visual budget. Absolutely " +
            "centred (position: relative on .hm-top, left: 50%, translateX(-50%)), so it can never push the row. " +
            "Measured at 320px: 48.56px wide, spanning 125.7 to 174.3, which leaves 22.6px of clear space beside " +
            "HOW TO PLAY and sits well inside the 92.7px cap. Tap target 48.6 by 44. The safest and the quietest " +
            "of the six, and the real question is whether the debut’s audience ever taps it, which is why it " +
            "is worth seeing beside the louder five rather than assuming. No visibility guard needed: .hm-top is " +
            "already hidden off the home.",
      html: function () {
        return '<button class="lbx-link tm-flat" data-lbx="quiet" type="button">Boards</button>';
      },
      css: function () {
        return join([
          '.hm-top:has([data-lbx="quiet"]) { position: relative; }',
          '[data-lbx="quiet"] { position: absolute; left: 50%; top: 0; transform: translateX(-50%);',
          '  display: inline-flex; align-items: center; height: 44px; margin: 0; padding: 0; border: 0;',
          '  background: none; cursor: pointer; white-space: nowrap;',
          '  font: 600 14px/1 var(--t-body); color: rgb(var(--t-text-rgb) / .8); }',
          '[data-lbx="quiet"]:active { color: var(--t-text); }',
          '[data-lbx="quiet"]:focus-visible { outline: 2px solid var(--t-offset); outline-offset: 2px; border-radius: 8px; }'
        ]);
      }
    },
    {
      id: "hairline",
      name: "Hairline tab",
      mount: "hm-top",
      note: "The word knocked out of a 1px rule that runs the whole row, so it reads as a filed tab under the top " +
            "bar and the rule gives the title art a baseline instead of a word to compete with. The wrapper is a " +
            "full-width 44px layer with pointer-events: none (the button turns them back on), which is how it " +
            "centres truly without covering HOW TO PLAY or the account slot. Needs position: relative on .hm-top. " +
            "The word measures 67.9px, spans 116.1 to 184, and leaves 13px beside HOW TO PLAY, so the word is not " +
            "the problem. Judge the rule: it runs the full width and crosses HOW TO PLAY and the account glyph at " +
            "their mid height, and neither has a ground of its own to knock it out, so on screen at 320px it reads " +
            "as a line struck through HOW TO PLAY. That is a new horizontal line in the one place he asked for " +
            "nothing new, directly above the logo. No visibility guard needed.",
      html: function () {
        return '<span class="lbx-tab" data-lbx="hairline"><button class="lbx-word tm-flat" type="button">Boards</button></span>';
      },
      css: function () {
        return join([
          '.hm-top:has([data-lbx="hairline"]) { position: relative; }',
          '[data-lbx="hairline"] { position: absolute; left: 0; right: 0; top: 0; height: 44px;',
          '  display: flex; align-items: center; justify-content: center; pointer-events: none; }',
          '[data-lbx="hairline"]::before { content: ""; position: absolute; left: 0; right: 0; top: 50%;',
          '  height: 1px; background: var(--t-rule); }',
          '[data-lbx="hairline"] .lbx-word { position: relative; pointer-events: auto;',
          '  height: 44px; margin: 0; padding: 0 8px; border: 0; cursor: pointer; white-space: nowrap;',
          '  background: var(--t-ground); color: var(--t-label);',
          '  font-family: var(--t-mono); font-size: 12.5px; letter-spacing: 0.08em; text-transform: uppercase; }',
          '[data-lbx="hairline"] .lbx-word:active { color: var(--t-text); }',
          '[data-lbx="hairline"] .lbx-word:focus-visible { outline: 2px solid var(--t-offset); outline-offset: 2px; }'
        ]);
      }
    },
    {
      id: "pip",
      name: "Riso pip",
      mount: "hm-top",
      note: "The reel’s dot language at the smallest size it survives: a 10px three-dot halftone pip in metal, " +
            "drawn with radial-gradients and no canvas, immediately left of the word. This is the one variant that " +
            "stays IN FLOW, which is the comparison worth having: measured 64.56px (10 pip + 6 gap + the word), " +
            "inside the 92.7px cap so it cannot push the row, but space-between centres it at 179.6px, 29.6px " +
            "right of the row’s true centre, which is visible at 320px against the logo above it. No " +
            "position: relative needed and no overlap with either neighbour. Its CSS sets .hm-acct { order: 2 } " +
            "under :has(), so the pip lands between the two existing children wherever the lab inserts it. The real " +
            "risk is meaning: an ornament 60px from the logo is an ornament competing with the logo, and a single " +
            "cluster of dots can read as a loading dot or a bullet. No visibility guard needed.",
      html: function () {
        return '<button class="lbx-link tm-flat" data-lbx="pip" type="button">' +
          '<span class="lbx-pip" aria-hidden="true"></span>Boards</button>';
      },
      css: function () {
        return join([
          '.hm-top:has([data-lbx="pip"]) .hm-acct { order: 2; }',
          '[data-lbx="pip"] { order: 1; display: inline-flex; align-items: center; gap: 6px;',
          '  height: 44px; margin: 0; padding: 0; border: 0; background: none; cursor: pointer; white-space: nowrap;',
          '  font: 600 14px/1 var(--t-body); color: var(--t-text-2); }',
          '[data-lbx="pip"] .lbx-pip { flex: none; width: 10px; height: 10px;',
          '  background-image:',
          '    radial-gradient(circle at 2.5px 3px, var(--t-metal) 1.4px, transparent 1.5px),',
          '    radial-gradient(circle at 7.5px 4.5px, var(--t-metal) 1.4px, transparent 1.5px),',
          '    radial-gradient(circle at 4px 8px, var(--t-metal) 1.4px, transparent 1.5px);',
          '  background-repeat: no-repeat; }',
          '[data-lbx="pip"]:active { color: var(--t-text); }',
          '[data-lbx="pip"]:focus-visible { outline: 2px solid var(--t-offset); outline-offset: 2px; border-radius: 8px; }'
        ]);
      }
    },
    {
      id: "standing",
      name: "Live standing",
      mount: "hm-top",
      note: "The label is a fact when there is one and a noun when there is not: a percentile above the sample " +
            "floor, a raw count below it (“9th of 25”, because “Top 3%” of 31 players is one " +
            "person dressed as precision), and plain “Boards” when the player has never finished a " +
            "season. Information to consult rather than an invitation, and the only variant that pulls without a " +
            "badge or a count. Two things to judge. One: it is the only label whose width moves with the data, and " +
            "it is the one variant that sits ON the cap. Measured at 600 13px Rubik, a step below .hm-howto’s " +
            "14px: “Boards” 45.1px, “9th of 25” 58.3px, “Top 1% today” 83.7px, and " +
            "“Top 12% today” 92.2px, which leaves 0.84px beside HOW TO PLAY. That is the audit’s " +
            "92.7px cap arrived at from the other direction, and it is why the percentile is clamped at 99: " +
            "“Top 100% today” measures 100.6px and collides by 3.4px. Any further word in this label, or " +
            "a step back up to 14px, collides. Two: the number is deliberately NOT in hot gold. This is the one screen " +
            "whose star is a number, and a second coloured number beside the logo is the clutter he asked me to " +
            "avoid. Live, it costs one extra request on the home screen and must fail soft to “Boards” in " +
            "silence; its first impression for a new player is always the fallback. No visibility guard needed.",
      html: function (recipe) {
        var s = standingLine(recipe, null), label = "Boards";
        if (s) {
          label = /^Top/.test(s)
            ? s.replace(/ of today’s .*$/, " today")
            : s.replace(/ on today’s board$/, "");
        }
        return '<button class="lbx-link tm-flat" data-lbx="standing" type="button">' + esc(label) + "</button>";
      },
      css: function () {
        return join([
          '.hm-top:has([data-lbx="standing"]) { position: relative; }',
          '[data-lbx="standing"] { position: absolute; left: 50%; top: 0; transform: translateX(-50%);',
          '  display: inline-flex; align-items: center; height: 44px; margin: 0; padding: 0; border: 0;',
          '  background: none; cursor: pointer; white-space: nowrap;',
          '  font: 600 13px/1 var(--t-body); color: rgb(var(--t-text-rgb) / .8);',
          '  font-variant-numeric: lining-nums tabular-nums; }',
          '[data-lbx="standing"]:active { color: var(--t-text); }',
          '[data-lbx="standing"]:focus-visible { outline: 2px solid var(--t-offset); outline-offset: 2px; border-radius: 8px; }'
        ]);
      }
    },
    {
      id: "rail",
      name: "The rail",
      mount: "hm-top",
      note: "No word in the row, a mark: a 28 by 2px metal rule centred in .hm-top with BOARDS set beneath it in " +
            "10.5px mono, the quietest type on the page. The centre of the top bar becomes an ornament and the " +
            "label is its footnote. Absolutely centred, so position: relative on .hm-top; the box measures 47.4 by " +
            "44px, spans 126.3 to 173.7 and leaves 23.2px beside HOW TO PLAY, and that 44px box is the only way this " +
            "one gets a real tap target: a 2px rule plus 10.5px type is nowhere near 44px on its own. The most " +
            "restrained of the six and the most likely to be missed entirely on a phone at outdoor brightness, " +
            "which is the thing to check on the actual screen rather than here. No visibility guard needed.",
      html: function () {
        return '<button class="lbx-link tm-flat" data-lbx="rail" type="button">Boards</button>';
      },
      css: function () {
        return join([
          '.hm-top:has([data-lbx="rail"]) { position: relative; }',
          '[data-lbx="rail"] { position: absolute; left: 50%; top: 0; transform: translateX(-50%);',
          '  display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;',
          '  height: 44px; min-width: 44px; margin: 0; padding: 0; border: 0; background: none; cursor: pointer;',
          '  white-space: nowrap; font-family: var(--t-mono); font-size: 10.5px; letter-spacing: 0.14em;',
          '  text-transform: uppercase; line-height: 1; color: var(--t-label); }',
          '[data-lbx="rail"]::before { content: ""; width: 28px; height: 2px; background: var(--t-metal); }',
          '[data-lbx="rail"]:active { color: var(--t-text); }',
          '[data-lbx="rail"]:focus-visible { outline: 2px solid var(--t-offset); outline-offset: 2px; border-radius: 8px; }'
        ]);
      }
    },
    {
      id: "chip",
      name: "Chip",
      mount: "hm-top",
      note: "The shipped chip as a button: .t-chip data-size=“sm” data-tone=“plain”, outline " +
            "rather than filled so it does not read as a primary action. It is here so he can reject it with his " +
            "eyes: measured 61.1px wide with 16.4px clear beside HOW TO PLAY, it is the heaviest of the six in a " +
            "screenshot, and a chip means “a tag” on every other screen of the site, which is the same " +
            "law as one meaning per colour. Two things found by rendering it rather than describing it. The chip " +
            "is a 19px component, so it needs a 44px box wrapped around it to be tappable at all, and that wrapper " +
            "is itself an argument against it. And the “zero new CSS” argument, which was this " +
            "variant’s only real defence, is not true today: .t-chip[data-size=“sm”] re-asserts " +
            "background: var(--chip-top) AFTER data-tone=“plain” sets it transparent, at equal " +
            "specificity, so the two attributes do not compose and the shipped pair paints a filled accent chip " +
            "with plain’s dim grey text on it, which is both the wrong weight and poor contrast. Two scoped " +
            "declarations below restore the outline the spec asked for. Worth fixing in styles.css on its own " +
            "account, since any small plain chip anywhere has the same bug. Needs position: relative on .hm-top. " +
            "No visibility guard needed.",
      html: function () {
        return '<span class="lbx-chipbox" data-lbx="chip">' +
          '<button class="t-chip" data-size="sm" data-tone="plain" type="button">Boards</button></span>';
      },
      css: function () {
        return join([
          '.hm-top:has([data-lbx="chip"]) { position: relative; }',
          '[data-lbx="chip"] { position: absolute; left: 50%; top: 0; transform: translateX(-50%);',
          '  display: inline-flex; align-items: center; justify-content: center; height: 44px; }',
          '/* the outline the spec asked for: data-size="sm" paints over data-tone="plain" at equal specificity */',
          '[data-lbx="chip"] .t-chip[data-size="sm"][data-tone="plain"] { background: transparent; color: var(--t-text-2); }'
        ]);
      }
    }
  ];

  /* ---------------- POST: the hook after a season ---------------- */

  var POST = [
    {
      id: "pct",
      name: "The percentile promoted",
      mount: "after-comp",
      note: "No new block anywhere. The number the game already computes and currently buries as a trailing bullet " +
            "inside .res-comp moves onto its own line directly beneath, at --t-fs-head in hot gold, with " +
            "“See the board” as a .t-btn data-kind=“text” beside it. The percentile raises the " +
            "question and the board answers it, which is the whole hook in one line of type. This is the baseline " +
            "the other five are measured against. Three things to look at. It is still small type on a page of big " +
            "type. At 320px the line and the link do not fit on one row, so the pair wraps to two (flex-wrap is on, " +
            "the link never clips). And below the sample floor the honest line is a raw count, not a percentile, " +
            "which is the thin-board day the hook is needed most: live, percentile.js widens to the all-dailies " +
            "pool there and the words become “of all GMs who play the Daily”. Signed out with a finished " +
            "season, the percentile is still true (it needs no account) and a second quiet line says what an " +
            "account changes. With no finished season there is no number, so the line states the board’s size " +
            "and nothing about the player.",
      html: function (recipe, data) {
        var s = standingLine(recipe, data), ghost = ghostLine(recipe), out;
        out = '<div class="lbx-pct" data-lbx="pct">' +
          '<p class="lbx-pct-line">' + esc(s || fieldLine(recipe, data)) + "</p>" +
          textBtn("See the board");
        if (ghost) out += '<p class="lbx-pct-fine">' + esc(ghost) + "</p>";
        return out + "</div>";
      },
      css: function () {
        return join([
          '[data-lbx="pct"] { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; margin: 6px 0 0; }',
          '[data-lbx="pct"] .lbx-pct-line { flex: 0 1 auto; margin: 0;',
          '  font-family: var(--t-disp); font-weight: 700; font-size: var(--t-fs-head); letter-spacing: 0.04em;',
          '  text-transform: uppercase; line-height: 1.1; color: var(--t-hot);',
          '  font-variant-numeric: lining-nums tabular-nums; }',
          '[data-lbx="pct"] .t-btn[data-kind="text"] { flex: 0 0 auto; min-height: 32px; }',
          '[data-lbx="pct"] .lbx-pct-fine { flex: 1 0 100%; margin: 0;',
          '  font-size: var(--t-fs-small); line-height: 1.4; color: var(--t-text-2); }'
        ]);
      }
    },
    {
      id: "fork",
      name: "The replay fork",
      mount: "actions",
      note: "One sibling button in .actions beside Run it back, as the shipped secondary keycap " +
            "(.t-btn data-kind=“quiet”, which survives the 3D decorator on specificity exactly as the " +
            "Daily archive button already does). Two equal choices at the natural end of the page, where the player " +
            "has already decided whether to play again. Always on, no condition, no number, no animation. Two real " +
            "costs. It sits below the roster, the GOAT climb and the scoring card, so most players never scroll to " +
            "it. And the row is tight at 320px: rendered, the two keycaps take about 146px each, and on a Daily " +
            "the primary’s own label (“Run it back · practice”) wraps to two lines inside its " +
            "half while this one reads over two lines beside it. That squat pair is the weight question to judge, " +
            "because giving equal footing to the board competes with the one button that produces the replays this " +
            "whole feature exists to cause.",
      html: function () {
        return '<button class="t-btn lbx-fork" data-lbx="fork" data-kind="quiet" type="button">See the board</button>';
      },
      css: function () {
        return join([
          '.actions:has([data-lbx="fork"]) { flex-wrap: wrap; }',
          /* 1 1 0, not 1 1 auto: .btn is flex: 1 off a zero basis, so an auto-basis sibling eats the row
             and squeezes the primary into a three-line column. Zero basis on both halves them honestly. */
          '[data-lbx="fork"] { flex: 1 1 0; }'
        ]);
      }
    },
    {
      id: "mini",
      name: "The mini board",
      mount: "after-comp",
      note: "Three rows under the record in the real .lb-row markup, so it is literally the same component as the " +
            "board: the leader as one line, the GM one place above the player, and the player’s own row in " +
            ".lb-you. Tapping any row opens the board. Only fires when the field is 25 or more and the rank is real; " +
            "silent otherwise, and the “you lead it” case is one row and one plain sentence rather than a " +
            "fake neighbour. The gap is stated only when both scores are records, so it is the true number of wins " +
            "or nothing at all: an inflated “you are close” is worse than no number. This is the heaviest " +
            "of the six and the most likely to read as clutter beside the banner print, and it is the one that " +
            "cannot exist before lb.js can answer rank-of-me.",
      html: function (recipe, data) {
        var rows = (data && data.rows) || [], field = fieldOf(recipe, data), rank = rankOf(recipe, data);
        if (!recipe || !recipe.hasRun || rank < 1 || field < 25 || !rows.length) return "";
        var i, mine = -1;
        for (i = 0; i < rows.length; i++) if (rows[i] && rows[i].you) { mine = i; break; }
        /* An unranked row (the YOU card lists lines, not places) has no neighbourhood to show, so this
           variant stays silent there rather than printing an empty rank column. */
        if (mine < 0 || rows[mine].rank == null) return "";

        var out = '<div class="lbx-mini" data-lbx="mini">' +
          '<p class="lbx-mini-head">Today’s board</p><ol class="lb-list">';

        function row(r, extra) {
          return '<li class="lb-row' + (r.you ? " lb-you" : "") + '">' +
            '<span class="lb-rank">' + esc(r.rank) + "</span>" +
            '<span class="lb-name">' + esc(r.name) + "</span>" +
            '<span class="lb-score">' + esc(r.score) + "</span></li>" + (extra || "");
        }

        var me = rows[mine], above = mine > 0 ? rows[mine - 1] : null, leader = rows[0];
        if (rank === 1) {
          out += row(me) + "</ol><p class=\"lbx-mini-gap\">You lead today’s board.</p>";
        } else {
          /* Leader, the GM one place above, you. Deduped and in rank order, because at rank 2 the leader
             IS the GM above you and that must print once rather than twice or not at all. */
          var picks = [], gap;
          if (leader && leader !== me) picks.push(leader);
          if (above && above !== me && above !== leader) picks.push(above);
          picks.push(me);
          for (i = 0; i < picks.length; i++) out += row(picks[i]);
          out += "</ol>";
          gap = winGap(above, me);
          if (gap) out += '<p class="lbx-mini-gap">' + esc(gap) + "</p>";
        }
        var ghost = ghostLine(recipe);
        if (ghost) out += '<p class="lbx-mini-gap">' + esc(ghost) + "</p>";
        return out + textBtn("Open the board") + "</div>";
      },
      css: function () {
        return join([
          '[data-lbx="mini"] { margin: 10px 0 0; }',
          '[data-lbx="mini"] .lbx-mini-head { margin: 0 0 2px;',
          '  font-family: var(--t-mono); font-size: var(--t-fs-label); letter-spacing: 0.14em;',
          '  text-transform: uppercase; color: var(--t-label); }',
          '[data-lbx="mini"] .lbx-mini-gap { margin: 6px 0 0;',
          '  font-size: var(--t-fs-small); line-height: 1.4; color: var(--t-text-2); }',
          '[data-lbx="mini"] .t-btn[data-kind="text"] { min-height: 36px; }'
        ]);
      }
    },
    {
      id: "rung",
      name: "The named rung",
      mount: "after-comp",
      note: "One line that names the tier the record reached, from the ladder the game already owns " +
            "(HISTORY_COMPS), because the post-game has the ladder and never names the step. Fires on 80, on 81, " +
            "and on a Daily that beat the room’s median; silent on everything else, which is what makes it " +
            "mean something when it does fire. What is rendered here is the owner’s draft (a), the safe one: " +
            "“81-1. That is the Dream Team tier. Almost nobody gets there.” On a Daily above the median " +
            "the second sentence is the board’s own median instead, which is a fact about the room rather than " +
            "about him. His draft (b) pulls harder and sits nearer the line he drew, and it is his call, not mine, " +
            "so here it is verbatim to compare: “81-1. One win is the Greatest of all GOATs.” Draft (b) " +
            "names the next step, which is the whole mechanic and also the one word from a tease. Neither draft " +
            "ever says missed, so close, or almost about the player. One clash worth seeing here rather than " +
            "discovering live: this line sits directly under .res-comp, and at 81 wins resultsCompHtml runs off " +
            "the top of the ladder and prints “Better than the Dream Team” while the Dream Team IS the " +
            "81 rung, so the two lines contradict each other one line apart on exactly the record this variant " +
            "exists for. At 80 they agree. Either the ladder needs its 82 entry or this line should replace the " +
            "comp rather than sit under it.",
      html: function (recipe, data) {
        if (!recipe || !recipe.hasRun) return "";
        var wins = winsOf(recipe, data), rung = rungFor(wins);
        if (!rung) return "";
        var median = data && data.median ? String(data.median) : null;
        var beatRoom = median != null && pctOf(recipe, data) != null && pctOf(recipe, data) <= 50;
        if (wins !== 80 && wins !== 81 && !beatRoom) return "";

        var record = scoreOf(recipe, data);
        var second = (wins === 80 || wins === 81)
          ? "Almost nobody gets there."
          : "Half the room finished under " + median + ".";
        var out = '<div class="lbx-rung" data-lbx="rung">' +
          '<p class="lbx-rung-line">' + esc(record) + ". That is the " + esc(rung.label) + " tier.</p>" +
          '<p class="lbx-rung-fine">' + esc(second) + "</p>" + textBtn("See the board");
        var ghost = ghostLine(recipe);
        if (ghost) out += '<p class="lbx-rung-fine">' + esc(ghost) + "</p>";
        return out + "</div>";
      },
      css: function () {
        return join([
          '[data-lbx="rung"] { margin: 8px 0 0; }',
          '[data-lbx="rung"] .lbx-rung-line { margin: 0;',
          '  font-family: var(--t-disp); font-weight: 700; font-size: var(--t-fs-head); letter-spacing: 0.04em;',
          '  text-transform: uppercase; line-height: 1.12; color: var(--t-text);',
          '  font-variant-numeric: lining-nums tabular-nums; }',
          '[data-lbx="rung"] .lbx-rung-fine { margin: 3px 0 0;',
          '  font-size: var(--t-fs-small); line-height: 1.4; color: var(--t-text-2); }',
          '[data-lbx="rung"] .t-btn[data-kind="text"] { min-height: 36px; }'
        ]);
      }
    },
    {
      id: "confirm",
      name: "The quiet confirmation",
      mount: "bottom",
      note: "Nothing on the record card changes. #runStatus at the very bottom, which is already centred, already " +
            "has reserved height, is already in index.html’s live-hide manifest and is written to by nothing, " +
            "gets one plain line as a link: “Verified. 78-4 is on today’s board.” The whole pull is " +
            "the percentile line above it. This is the control arm, deliberately the weakest of the six, and it is " +
            "worth building so he can see with his own eyes what no prompt costs before he pays for a louder one. " +
            "Content only, in spans, because the slot is a <p>. One state this lab cannot show: the real gap is a " +
            "verified = 0 reply, where this line is the only surface that could tell a player their season did not " +
            "verify, and the recipe has no verified knob, so what renders here is always the verified wording.",
      html: function (recipe, data) {
        var record = scoreOf(recipe, data), out;
        if (!recipe || !recipe.hasRun) {
          out = '<span class="lbx-ok" data-lbx="confirm">' + esc(fieldLine(recipe, data)) + " </span>";
          return out + textBtn("See the board");
        }
        if (!recipe.signedIn) {
          out = '<span class="lbx-ok" data-lbx="confirm">' +
            (record ? esc(record) + " is saved on this phone. " : "") +
            "Signed-in seasons land on the board. </span>";
          return out + textBtn("See the board");
        }
        /* Ranked, so the record is named and placed. Rank 0 is a different sentence: the season verified
           but it is not on this board, and claiming otherwise is the one thing this line must never do. */
        out = '<span class="lbx-ok" data-lbx="confirm">Verified. ' +
          (rankOf(recipe, data) > 0
            ? (record ? esc(record) + " is on today’s board. " : "Your season is on today’s board. ")
            : (record ? esc(record) + ". " : "") + esc(fieldLine(recipe, data)) + " ") + "</span>";
        return out + textBtn("See the board");
      },
      css: function () {
        return join([
          '[data-lbx="confirm"] { color: var(--t-text-2); font-variant-numeric: lining-nums tabular-nums; }',
          '#runStatus:has([data-lbx="confirm"]) { opacity: 1; }',
          '#runStatus:has([data-lbx="confirm"]) .t-btn[data-kind="text"] { min-height: 32px; vertical-align: baseline; }'
        ]);
      }
    },
    {
      id: "sheet",
      name: "The sheet, once",
      mount: "sheet",
      note: "A .t-sheet slides up over the results once per session, after a verified run, and never returns that " +
            "session: a grab handle, two lines, the board button, and a dismiss. The highest conversion of the six " +
            "and the only one that interrupts the screen the player came for, which is the imposed-rather-than-" +
            "entered framing the field evidence says can reverse the sign of the whole feature. Built at full " +
            "weight on purpose so it can be rejected on sight rather than on my word. Two notes on honesty. It is " +
            "rendered already open (.on on both the backdrop and the sheet), so the screenshot shows the resting " +
            "state and no animation. And it carries a visible “Not now” as well as the grab handle: a " +
            "handle alone is a gesture, and a sheet with no visible way out at 320px is a worse thing than one " +
            "extra text button.",
      html: function (recipe, data) {
        var s = standingLine(recipe, data), record = scoreOf(recipe, data), ghost = ghostLine(recipe);
        var line1 = s || fieldLine(recipe, data);
        var line2 = ghost ? ghost
          : record && rankOf(recipe, data) > 0 ? record + " is on today’s board. It stays there."
          : fieldLine(recipe, data);
        /* Two lines only when there are two facts. With no standing and no record the board line is the
           only thing true, and printing it twice is how a sheet starts to look like filler. */
        if (line2 === line1) line2 = "";
        return '<div class="t-backdrop on" data-lbx="sheet-back"></div>' +
          '<div class="t-sheet on" data-lbx="sheet" role="dialog" aria-modal="true" aria-label="Today’s board">' +
          '<div class="t-grab"></div>' +
          '<p class="lbx-sheet-line">' + esc(line1) + "</p>" +
          (line2 ? '<p class="lbx-sheet-fine">' + esc(line2) + "</p>" : '<p class="lbx-sheet-fine"></p>') +
          '<button class="t-btn lbx-sheet-go" type="button">See the board</button>' +
          textBtn("Not now") + "</div>";
      },
      css: function () {
        return join([
          '[data-lbx="sheet"] { text-align: left; }',
          '[data-lbx="sheet"] .lbx-sheet-line { margin: 0;',
          '  font-family: var(--t-disp); font-weight: 700; font-size: var(--t-fs-title); letter-spacing: 0.03em;',
          '  text-transform: uppercase; line-height: 1.05; color: var(--t-hot);',
          '  font-variant-numeric: lining-nums tabular-nums; }',
          '[data-lbx="sheet"] .lbx-sheet-fine { margin: 6px 0 12px;',
          '  font-size: var(--t-fs-body); line-height: 1.4; color: var(--t-text); }',
          '[data-lbx="sheet"] .lbx-sheet-go { width: 100%; }',
          '[data-lbx="sheet"] .t-btn[data-kind="text"] { display: block; margin: 2px auto 0; }'
        ]);
      }
    }
  ];

  /* The gap between two rows, in wins, and only when both scores are records. Any other score shape, or
     a tie, returns null and the line is simply not printed. */
  function winGap(above, me) {
    if (!above || !me || above.rank == null) return null;
    var a = /^(\d{1,2})-(\d{1,2})$/.exec(String(above.score || "")),
        b = /^(\d{1,2})-(\d{1,2})$/.exec(String(me.score || ""));
    if (!a || !b) return null;
    var d = Number(a[1]) - Number(b[1]);
    if (d <= 0) return null;
    return d === 1 ? "1 win from " + ordinal(above.rank) + "." : d + " wins from " + ordinal(above.rank) + ".";
  }

  function find(list, id) {
    var i;
    for (i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  }

  LB.surfaces = {
    START: START,
    POST: POST,
    FLOOR: FLOOR,
    start: function (id) { return find(START, id); },
    post: function (id) { return find(POST, id); }
  };
})();
