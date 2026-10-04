/* ---------- LB.surfaces: the two places the boards touch the game (Leaderboard Lab) ----------
   Two questions, six answers each, and the owner judges both in a screenshot at 320px.

   THE LINK (start screen). His words: centre-top of the start screen, it may carry some style, but the
   TRUE 82 logo stays the star and the link must not clutter or take away from it. So every variant here
   is small, quiet by default, and lives in the ONE empty space the home has: the middle of .hm-top,
   between HOW TO PLAY and the 44px account slot.

   THE HOOK (after a game), REBUILT FOR ROUND TWO. Round one's six are deleted and so is the thinking
   behind them: they printed a sentence and a text link beside the art, and his answer was "it's not a
   matter of smuggling in a link or button... your lab examples dealt with it by removing the artwork in
   the results box and i super don't want that. it's beautiful the way it is. i just want the player to
   be drawn into clicking into the leaderboard."

   So the eight hooks below all take the same bet: the Climb is already a leaderboard, the right 44% of
   it is empty, and the way in is to print today's living room on the same ladder in real aqua ink. Six
   of the eight add to a graphic that already exists and remove nothing from it. One prints the leader's
   season as a second small banner off the same press. One brings the ticket back stamped. Every piece of
   tone comes out of the engines through LB.art, never from a CSS gradient pretending to be a halftone.
   The full argument, the four rules and the geometry are documented above the POST array itself.

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
                      The stamped stub obeys that: every element in it is a span, including the card.
     .rr-climb        the GOAT Climb section. "climb" drops markup in it, right after .climb, and each
                      climb hook then LIFTS its own root into .climb-track in paint(), because that is
                      the element whose percentage tops are the Climb's own win scale. Nothing is
                      removed from the section and nothing in .climb is restyled.
     "sheet"          a .t-sheet over the whole screen, once per session. ROUND TWO USES IT FOR
                      NOTHING: "it adds a layer of skip skip skip blah blah blah let me play again
                      clicking i don't love". No hook here interrupts.

   Rules kept: ES5, no DOM at load time, colour and type only from var(--t-*), no Math.random, no
   Date.now, no em-dashes, reads at 320px.

   ONE RULE BROKEN ON PURPOSE, and it is the only one: "the lab wires nothing". Six of the eight hooks
   define paint(doc, recipe, data) and run real canvases through LB.art, and one wires a tap so the
   reward swing can be replayed, because a swing cannot be judged in a screenshot. Every paint is
   idempotent, silent, deterministic and optional: with no paint call and no engines, each hook falls
   back to one honest line of type. */
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
    /* Above the halfway mark "Top 60%" is a floor wearing a ceiling's words, and
       boards.js already refuses to print one (ceilingPct). Two modules on one screen
       must not make different claims about the same rank. */
    if (p > 50) return null;
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

  /* textBtn() lived here and made a .t-btn data-kind="text" link. Round two's hooks have no text links
     in them, because "See the board" printed beside a picture is the thing he rejected: "it's not a
     matter of smuggling in a link or button". The art is the door, so the helper went with the variants
     that needed it. */

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

  /* ---------------- POST: the hook after a season (round two) ----------------

     Round one's six hooks are deleted. They were six ways of printing a sentence beside the art, and his
     answer was plain: "your lab examples dealt with it by removing the artwork in the results box and i
     super don't want that. it's beautiful the way it is. i just want the player to be drawn into
     clicking into the leaderboard."

     So every hook below obeys four rules, and the first is absolute.

       1. THE CLIMB IS NOT TOUCHED. Nothing is removed, restyled, re-coloured or moved. Six of the eight
          add a second reading to the graphic that already exists, in the empty 44% to the RIGHT of the
          rail, which is blank today down the whole track. The legend pins, the legend tags, the grey
          rail, the amber fill, your pink dot and label, the summit cap: all untouched.
       2. NO LINK BOLTED BESIDE THE ART. The art is the door. What you tap is the ink.
       3. NO STEP BETWEEN FINISHING AND PLAYING AGAIN. Nothing covers the screen, nothing asks to be
          dismissed, and Run it back stays the first thing a thumb finds at the bottom.
       4. THE PERCENTILE IS NOT REPEATED. .res-comp already prints "Top 12%" about 1.6s after paint.
          Rank of field is a different fact, because it carries the size of the room, and it goes silent
          whenever the true rank is not known.

     WHY THESE ARE FUNCTIONAL AND NOT DECORATED. The Climb is already a leaderboard: a vertical ladder
     whose altitude IS a record. geo() below is app.js's own yPct reproduced to the pixel, so a living
     GM printed at 77 wins lands beside the legend who won 77 and nothing has to be explained. Height is
     the record. The distance between two marks is the gap, in wins. Two marks at one height is a tie,
     which a shared Daily board produces constantly. Ink coverage is how many people are at that record.

     THE INK IS REAL INK. Every piece of tone in this file goes through LB.art, which drives
     reel-riso.js's own screening pass: the halftone lattice at the ink's angle, the grain, the
     misregistration, the starvation specks. No CSS gradient pretends to be a halftone anywhere here.
     Aqua (--t-offset, the reel's "pop" and "win" ink, the #41C6EA he said we never use) is the living
     room of players. Pink stays YOU, because the Climb already paints your dot and your label in
     --t-accent and two screens must not disagree about what colour you are. Fire gold stays the hot
     thing. Red is not used at all: a rank is not a failure.

     WHAT THE LAB HAS TO DO FOR THESE, and it is one line: lab.js must call v.paint(doc, RC, data) after
     it mounts the results shell, exactly the way paintLook already calls look.paint. Without it the
     canvases never run, and every variant falls back to one honest line of plain type instead, so the
     lab degrades rather than going blank. The report's "needs" says it exactly. */

  /* THE CLIMB'S OWN GEOMETRY, copied from app.js climbHtml (app.js:4650) and matching lab.js's
     climbShell line for line, including its 76-win fallback. If app.js's ladder changes, these three
     copies change together: that is the cost of the lab not loading app.js, and it is already paid
     twice. Every mark this file places uses yPct, so a mark is never "about right", it is at the same
     altitude the pin for that record would be. */
  var CLIMB = { FLOOR: 62, TOP: 82, LADDER_TOP: 81, RX: 56, PX_PER_WIN: 200 / 11, BAND_PX: 15 };

  function clampN(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function geo(youWins) {
    var cluster = Math.round((CLIMB.LADDER_TOP - CLIMB.FLOOR) * CLIMB.PX_PER_WIN);
    var floorPx = CLIMB.BAND_PX + cluster;
    var below = !(youWins >= CLIMB.FLOOR);
    var trackPx = floorPx + (below ? 50 : 14);
    var yTeam = CLIMB.BAND_PX / trackPx * 100, yFloor = floorPx / trackPx * 100;
    function yPct(w) {
      if (w <= CLIMB.LADDER_TOP) {
        return yTeam + (CLIMB.LADDER_TOP - w) / (CLIMB.LADDER_TOP - CLIMB.FLOOR) * (yFloor - yTeam);
      }
      return (CLIMB.TOP - w) / (CLIMB.TOP - CLIMB.LADDER_TOP) * yTeam;
    }
    return {
      below: below, trackPx: trackPx, yFloor: yFloor, yTeam: yTeam, yPct: yPct,
      youY: below ? 0 : clampN(yPct(youWins), 0, yFloor)
    };
  }

  /* ---------------- the room, read off the board's own rows ---------------- */

  function recWins(s) {
    var m = /^(\d{1,2})-(\d{1,2})$/.exec(String(s == null ? "" : s));
    return m ? Number(m[1]) : null;
  }
  function recOf(wins) { return wins + "-" + (CLIMB.TOP - wins); }
  function onLadder(w) { return w != null && w >= CLIMB.FLOOR && w <= CLIMB.TOP; }

  /* Everything these hooks draw comes out of here, and every field is a fact the real board already
     returns: the rows with their ranks and records, the median, the field size, the viewer's rank.
     Nothing is invented and nothing is random. */
  /* fieldOf() falls back to recipe.field when the board reports none, which is right for the START
     link and wrong here: an EMPTY board reports 0 on purpose, because "printing 4,412 GMs over an empty
     state would be the one outright lie in the file". Every hook below trusts the board. */
  function fieldTrue(recipe, data) {
    if (data && typeof data.field === "number") return Math.max(0, Math.floor(data.field));
    return fieldOf(recipe, data);
  }

  function roomOf(recipe, data) {
    var rows = (data && data.rows) || [], i, r, w;
    var out = {
      field: fieldTrue(recipe, data),
      /* anchor is WHERE THE WINDOW SITS, a layout fact. youRank is a CLAIM about a standing, and a
         signed-out player has none: every board in lb.js filters user_id IS NOT NULL. So signed out
         keeps the anchor and loses the rank, and nothing below prints an ordinal it cannot support. */
      anchor: rankOf(recipe, data),
      youRank: (recipe && recipe.signedIn === false) ? 0 : rankOf(recipe, data),
      youWins: winsOf(recipe, data),
      median: recWins(data && data.median),
      leader: null, samples: [], near: [], ties: {}
    };
    if (out.youWins == null) out.youWins = 76;      // lab.js's own fallback, so the marks match the drawn climb
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      if (!r || r.rank == null) continue;
      w = recWins(r.score);
      if (w == null) continue;
      out.samples.push({ rank: r.rank, wins: w, name: r.name, tag: r.tag, you: !!r.you });
      out.ties[w] = (out.ties[w] || 0) + 1;
      if (r.rank === 1) out.leader = { rank: 1, wins: w, name: r.name, tag: r.tag, you: !!r.you };
      if (!r.you && out.anchor > 0 && r.rank !== 1) out.near.push({ rank: r.rank, wins: w, name: r.name, tag: r.tag });
    }
    out.samples.sort(function (a, b) { return a.rank - b.rank; });
    out.near.sort(function (a, b) {
      return Math.abs(a.rank - out.anchor) - Math.abs(b.rank - out.anchor) || a.rank - b.rank;
    });
    return out;
  }

  /* The share of the room at or below the viewer. The one number the washes use for reach, and it is
     not the percentile: it is the other end of the same rank, phrased as nothing at all. */
  function belowShare(room) {
    if (!room.field || room.youRank < 1) return 0;
    return clampN((room.field - room.youRank) / room.field, 0, 1);
  }

  /* RANK AGAINST RECORD, from the board's own pairs. Each sampled row gives one point (this record, this
     rank), the median gives the midpoint, and between two points the rank is interpolated on a LOG scale
     because a real board thins out toward the top rather than evenly. Outside the sampled range the
     nearest known slope is held and the result is clamped to 1 and to the field, so the curve never
     claims more than the board said. */
  function rankCurve(room) {
    var last = {}, out = [], i, p, k;
    /* the LAST rank at a record, not the first: "how many GMs have this record or better" is the rank
       of the final GM on that rung, and reading the first one instead made every rung look like one
       person, which is exactly wrong on a shared board where the top rung is crowded. */
    for (i = 0; i < room.samples.length; i++) {
      p = room.samples[i];
      if (!onLadder(p.wins)) continue;
      if (last[p.wins] == null || p.rank > last[p.wins]) last[p.wins] = p.rank;
    }
    if (onLadder(room.median) && last[room.median] == null && room.field > 1) {
      last[room.median] = Math.max(1, Math.round(room.field / 2));
    }
    for (k in last) if (Object.prototype.hasOwnProperty.call(last, k)) out.push({ wins: Number(k), rank: last[k] });
    out.sort(function (a, b) { return b.wins - a.wins; });
    return out;
  }

  function atOrAbove(curve, field, w) {
    var i, a, b, t, la, lb, slope;
    if (!curve.length || !field) return null;
    /* nobody is better than the best record on the board. Zero, not one: without this the top rung
       counts itself out of existence and the leader's own company disappears. */
    if (w > curve[0].wins) return 0;
    if (curve.length === 1) return clampN(curve[0].rank, 1, field);
    if (w === curve[0].wins) return clampN(curve[0].rank, 1, field);
    for (i = 0; i < curve.length - 1; i++) {
      a = curve[i]; b = curve[i + 1];
      if (w <= a.wins && w >= b.wins && a.wins > b.wins) {
        t = (a.wins - w) / (a.wins - b.wins);
        la = Math.log(Math.max(1, a.rank)); lb = Math.log(Math.max(1, b.rank));
        return clampN(Math.exp(la + t * (lb - la)), 1, field);
      }
    }
    a = curve[curve.length - 2]; b = curve[curve.length - 1];
    la = Math.log(Math.max(1, a.rank)); lb = Math.log(Math.max(1, b.rank));
    slope = (a.wins > b.wins) ? (lb - la) / (a.wins - b.wins) : 0;
    return clampN(Math.exp(lb + (b.wins - w) * slope), 1, field);
  }

  /* The field's own shape: how many GMs sit at each record from the Climb's floor to 82. The band the
     room column prints IS this array, so the ink's density at a given altitude is the number of people
     at that record and nothing else. */
  function fieldShape(room) {
    var curve = rankCurve(room), out = [], w, hi, lo, n, max = 0, i;
    if (!curve.length || !room.field) return out;
    for (w = CLIMB.FLOOR; w <= CLIMB.TOP; w++) {
      hi = atOrAbove(curve, room.field, w);
      lo = atOrAbove(curve, room.field, w + 1);
      if (hi == null || lo == null) continue;
      n = Math.max(0, hi - lo);
      out.push({ wins: w, n: n, frac: 0 });
      if (n > max) max = n;
    }
    for (i = 0; i < out.length; i++) out[i].frac = max > 0 ? out[i].n / max : 0;
    return out;
  }

  /* how many GMs are on one exact record, off the same interpolated curve the density band prints.
     On a shared Daily this is the number that matters most, because everyone drafts the same board and
     the common case is a rung with company on it. */
  function atRecord(room, wins) {
    var curve = rankCurve(room), hi, lo;
    if (!curve.length || !room.field) return 0;
    hi = atOrAbove(curve, room.field, wins);
    lo = atOrAbove(curve, room.field, wins + 1);
    if (hi == null || lo == null) return 0;
    return Math.max(0, Math.round(hi - lo));
  }

  /* a row of printed dots, one per GM level with you, wrapped into the gutter */
  function drawTieRow(n) {
    return function (g, w, h, K) {
      var step = 9, cols = Math.max(1, Math.floor((w - 2) / step)), i, row, col;
      g.fillStyle = K.tone(0.92);
      for (i = 0; i < n; i++) {
        row = Math.floor(i / cols); col = i % cols;
        g.beginPath();
        g.arc(4 + col * step, h / 2 + row * step, 3.4, 0, 6.2832);
        g.fill();
      }
    };
  }

  /* a small deterministic integer from a seed and a word, for picking a scene. No Math.random. */
  function pick(list, seed, salt) {
    var s = String(salt || ""), h = 2166136261, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    h = (h ^ (Math.floor(Number(seed) || 0) * 2654435761)) >>> 0;
    return list[h % list.length];
  }

  /* ---------------- the paint side: real ink, through LB.art only ---------------- */

  function art() { return (LB && LB.art) ? LB.art : null; }
  function q(doc, sel) { try { return doc ? doc.querySelector(sel) : null; } catch (e) { return null; } }
  function rootFor(doc, id) { return q(doc, '[data-lbx="' + id + '"]'); }
  function trackFor(doc) { return q(doc, ".rr-climb .climb-track") || q(doc, ".climb-track"); }
  function inkEl(root, name) {
    if (!root) return null;
    try { return root.querySelector('[data-lbx-ink="' + name + '"]'); } catch (e) { return null; }
  }
  function addClass(el, c) {
    if (!el) return;
    if ((" " + el.className + " ").indexOf(" " + c + " ") < 0) el.className += " " + c;
  }

  /* LIFT. Every climb hook is written as an ordinary block first, then moved inside .climb-track where
     its percentage tops land on the Climb's own scale. The move is why these need no new mount in
     lab.js: "climb" already drops the markup in the right SECTION, and the lift puts it in the right
     ELEMENT. If lab.js ever grows a "climb-track" mount the lift becomes a no-op. Idempotent: it checks
     the parent, so a repaint never stacks anything. */
  function lift(doc, id) {
    var el = rootFor(doc, id), tr = trackFor(doc);
    if (!el) return null;
    if (!tr) return el;                    // no climb in this shell: the block stays where it is and reads as type
    if (el.parentNode !== tr) tr.appendChild(el);
    addClass(el, "is-lifted");
    return el;
  }

  function onTap(el, fn) {
    if (!el || el.getAttribute("data-lbx-tap")) return;
    el.setAttribute("data-lbx-tap", "1");
    el.addEventListener("click", function (ev) {
      if (ev && ev.preventDefault) ev.preventDefault();
      if (ev && ev.stopPropagation) ev.stopPropagation();
      try { fn(ev); } catch (e) {}
    }, false);
  }

  /* THE DRUM'S MISS. reel-riso.js gives the pop ink a registration offset of [1.2, -0.9] CSS px
     (INKS.pop.reg), which is what makes a second plate read as a second plate rather than a second CSS
     colour. The screening pass does not apply it to a plate drawn by hand, so the marks that sit ON a
     shipped line (the rail) carry it themselves. */
  var REG_X = 1.2, REG_Y = -0.9;

  /* the field's shape as horizontal bands of tone: the one drawing in this file that is purely a fact */
  function drawShape(shape, yPct) {
    return function (g, w, h, K) {
      var i, s, a, b, t;
      for (i = 0; i < shape.length; i++) {
        s = shape[i];
        if (s.frac <= 0.01) continue;
        a = yPct(s.wins + 0.5) / 100 * h;
        b = yPct(s.wins - 0.5) / 100 * h;
        if (b < a) { t = a; a = b; b = t; }
        g.fillStyle = K.tone(0.10 + 0.64 * s.frac);
        g.fillRect(0, a, w, Math.max(1, b - a));
      }
    };
  }

  /* a disc of ink. cov carries how many GMs are on that record. */
  function drawDisc(cov, r) {
    return function (g, w, h, K) {
      g.fillStyle = K.tone(clampN(cov, 0, 1));
      g.beginPath();
      g.arc(w / 2, h / 2, r == null ? Math.min(w, h) / 2 - 0.5 : r, 0, 6.2832);
      g.fill();
    };
  }

  /* the second plate on the rail: one round capped stroke, 8px like .rail-path, offset by the drum's
     own miss, from one altitude to another. The LENGTH is the gap. */
  function drawRailInk(y1, y2, dx) {
    return function (g, w, h, K) {
      var x = w * (CLIMB.RX / 100) + REG_X + (dx || 0);
      var a = Math.min(y1, y2) / 100 * h + REG_Y, b = Math.max(y1, y2) / 100 * h + REG_Y;
      g.fillStyle = K.tone(0.95);
      g.beginPath(); g.rect(x - 4, a, 8, Math.max(1, b - a)); g.fill();
      g.beginPath(); g.arc(x, a, 4, 0, 6.2832); g.fill();
      g.beginPath(); g.arc(x, b, 4, 0, 6.2832); g.fill();
    };
  }

  /* a seal: a solid disc of ink with the type KNOCKED OUT of the plate, which is how a riso prints type
     that belongs to the ink rather than sitting on it. The hole shows the card behind it. */
  function drawSeal(label) {
    return function (g, w, h, K) {
      var r = Math.min(w, h) / 2 - 1, cx = w / 2, cy = h / 2, size, f, wid;
      g.fillStyle = K.tone(0.94);
      g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.fill();
      if (!label) return;
      /* 400TH has to fit the same plate 9TH does, so the type is measured down to the hole rather
         than set at a guessed size. */
      size = Math.max(7, Math.round(r * 0.78));
      for (;;) {
        f = K.font(700, size, "disp");
        g.font = f;
        wid = g.measureText(String(label)).width;
        if (wid <= r * 1.62 || size <= 7) break;
        size -= 1;
      }
      g.globalCompositeOperation = "destination-out";
      K.text(g, label, cx, cy + 0.5, { font: f, align: "center", base: "middle", cov: 1 });
      g.globalCompositeOperation = "source-over";
    };
  }

  /* one stamped ring per member of the 82-0 Club, newest heaviest. The COUNT is the club's size. */
  function drawRings(n) {
    return function (g, w, h, K) {
      var step = 9, cols = Math.max(1, Math.floor((w - 2) / step)), i, row, col, cov;
      for (i = 0; i < n; i++) {
        row = Math.floor(i / cols); col = i % cols;
        if ((row + 1) * step > h + 2) break;
        cov = 0.95 - Math.min(0.6, row * 0.14 + col * 0.015);
        g.strokeStyle = K.tone(cov);
        g.lineWidth = 1.5;
        g.beginPath(); g.arc(3.6 + col * step, 3.6 + row * step, 3, 0, 6.2832); g.stroke();
      }
    };
  }

  /* ---------- THE RAIL FILLS UP (the lead, 2026-10-04) ----------
     Every direction the build produced mounted into the Climb and then wrote a
     SENTENCE under it. That is a caption, not a way in, and it is the thing the
     owner had already rejected: "it's not a matter of smuggling in a link or
     button... i just want the player to be drawn into clicking into the
     leaderboard."

     So: the Climb is already a leaderboard. A rail, twenty pins for the greatest
     teams in history, and a marker for where this season sits among them. The
     board asks the identical question about people playing today. This direction
     puts them on THE SAME RAIL, in the second ink, beside the dead legends they
     are being measured against.

     WHAT EACH MARK ENCODES, because decoration would be the same failure again:
       every aqua tick     one GM on today's board, at the height of their record
       the stack of them   the shape of the field: where today's players bunch up
       the labelled tick   today's best, with the record itself
       the pink dot        the player, already drawn by the Climb, now in a crowd
       the gap above it    exactly how many rungs are above them, in rungs
     Nothing is removed, nothing is resized, no step is added before RUN IT BACK.
     The rail was always sitting there; now it goes somewhere. */
  function lbxWinsOf(r) {
    if (!r) return null;
    var m = /^(\d+)\s*[-–]\s*\d+$/.exec(String(r.score || ""));
    return m ? Number(m[1]) : null;
  }
  function lbxYouWins(data) {
    var rows = (data && data.rows) || [], i, w;
    for (i = 0; i < rows.length; i++) if (rows[i].you) { w = lbxWinsOf(rows[i]); if (w !== null) return w; }
    return 76;
  }
  function lbxComma(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

  function railFillHtml(recipe, data) {
    var geom = (LB.climb && LB.climb.geom) ? LB.climb.geom(lbxYouWins(data)) : null;
    if (!geom) return "";                       // no Climb on this screen: draw nothing
    /* THE FIELD, not the page. data.rows is the twelve rows the list shows, and on
       a Daily those all tie at the top, so a rail drawn from them is one tick.
       LB.data.spread samples the whole population from the same quantile the rows
       come from, which is what makes the stack of ticks the shape of the field
       rather than the shape of the first screen. */
    var rows = [];
    try { rows = (LB.data && LB.data.spread) ? LB.data.spread("today", recipe, 28) : []; } catch (e) { rows = []; }
    if (!rows.length) rows = (data && data.rows) || [];
    var marks = "", seen = {}, i, w, y, key, n = 0;
    for (i = 0; i < rows.length && n < 40; i++) {
      w = lbxWinsOf(rows[i]);
      if (w === null || w < geom.FLOOR) continue;
      y = geom.yPct(w);
      key = y.toFixed(2);
      if (seen[key]) { seen[key]++; continue; }  // a tie thickens the tick, never stacks
      seen[key] = 1;
      marks += '<span class="lbx-live" style="top:' + key + '%"></span>';
      n++;
    }
    var top = (data && data.rows && data.rows.length) ? data.rows[0] : (rows.length ? rows[0] : null);
    /* The leader is the TOP TICK, not a floating label. There is no free column
       beside the rail for a second label (the measurement is in the CSS below), so
       the leader is marked where it cannot collide, on its own tick, and named in
       the foot line under the track. */
    var top = (data && data.rows && data.rows.length) ? data.rows[0] : (rows.length ? rows[0] : null);
    var lead = lbxWinsOf(top);
    if (lead !== null && lead >= geom.FLOOR) {
      marks += '<span class="lbx-live lbx-live-top" style="top:' + geom.yPct(lead).toFixed(2) + '%"></span>';
    }
    var field = (data && data.field) || 0;
    var foot = field ? lbxComma(field) + ' here today' : 'today\u2019s board';
    if (lead !== null) foot += ' \u00B7 best ' + esc(lead + '-' + (82 - lead));
    return '<a class="lbx-rail" data-lbx="rail" data-board="today" href="#" ' +
      'aria-label="Open today\u2019s board">' + marks +
      '<span class="lbx-rail-foot">' + foot + '</span></a>';
  }

  var RAIL_VARIANT = {
    id: "railfill",
    name: "The rail fills up",
    mount: "climb",
    note: "The Climb already ranks you against the twenty greatest teams ever. This puts the people " +
          "playing TODAY on the same rail, in the second ink, each at the height of their own record. " +
          "The artwork becomes the board instead of pointing at it: the stack of ticks is the shape of " +
          "the field, the labelled one is today's best, and the gap above your own dot is how many " +
          "rungs are above you. Nothing is removed and nothing is added underneath, so the balance he " +
          "likes is untouched and there is no step before RUN IT BACK.",
    html: railFillHtml,
    css: function () {
      return [
        '[data-lbx="rail"] { position: absolute; inset: 0; display: block; z-index: 2; }',
        /* Measured against the real Climb at 320px (track 288px): legend tags end
           at 139, the pins sit at 149 to 152, YOUR FIVE runs 153 to 230. The ticks
           start just right of the pins and are short enough to clear the player's
           own dot everywhere except at the player's own height, which is exactly
           the reading we want: you are standing in this crowd. */
        /* THE CHANNEL. First attempt put the ticks immediately right of the rail,
           where they blended into it (the rail is the same aqua) and sat inside
           the YOUR FIVE marker. Measured at 320px the legend tags end at 139 and
           the pins start at 147, so there is a clean 7px channel between them
           that belongs to nothing. The ticks live there: clear of the tags, clear
           of the pins, clear of the player's marker, and read as their own column
           rather than as a thicker rail. */
        '[data-lbx="rail"] .lbx-live { position: absolute; left: calc(56% - 21px); width: 6px; height: 2px;',
        '  margin-top: -1px; background: var(--t-offset); opacity: .75; border-radius: 1px; }',
        '[data-lbx="rail"] .lbx-live-top { width: 6px; height: 4px; opacity: 1;',
        '  box-shadow: 0 0 6px var(--t-offset); }',
        '[data-lbx="rail"] .lbx-rail-foot { position: absolute; left: 0; right: 0; bottom: -22px;',
        '  text-align: center; font: 400 11px/1.3 var(--t-mono); color: var(--t-offset);',
        '  text-decoration: underline; text-underline-offset: 3px; }',
        '.rr-climb .climb-track { margin-bottom: 26px; }',
        '[data-lbx="rail"]:focus-visible { outline: 2px solid var(--t-offset); outline-offset: 4px; }'
      ].join("\n");
    }
  };

  var POST = [
    RAIL_VARIANT,
    {
      id: "room",
      name: "The other side of the rail",
      mount: "climb-foot",
      note: "THE CLIMB BECOMES TWO SIDED AND LOSES NOTHING. Every dead team keeps the left of the rail exactly as " +
            "drawn. The empty 44% to the right, blank today down the whole track, prints today's living room in aqua " +
            "at the identical altitudes: a halftone density band whose ink at each height is how many GMs are on that " +
            "record, a pip for each GM the board returned, a heavier pip where GMs are tied, and the leader as a " +
            "different kind of object, a ring with their record beside it. Your own pink dot now sits between two " +
            "readings of the same height, a dead team on the left and a living GM on the right. The whole gutter is " +
            "the tap target and the board opens at your own rank, not at rank 1. Three things to judge. The band is " +
            "ink, not a gradient: it is reel-riso.js's screening pass, so it has grain and starvation in it. The " +
            "pips crowd when the field is tight, which is the honest look of a shared Daily. And when the leader is " +
            "within one win of you their record is dropped and only the ring prints, because .cy-label already owns " +
            "that band of the gutter and two labels in one place is worse than one.",
      html: function (recipe, data) {
        var rm = roomOf(recipe, data), g = geo(rm.youWins), shape = fieldShape(rm);
        var out, pips = "", seen = {}, i, p, n = 0, lead = "", foot;
        if (!rm.field) return "";
        for (i = 0; i < rm.samples.length; i++) {
          p = rm.samples[i];
          if (p.you || !onLadder(p.wins) || seen[p.wins]) continue;
          if (rm.leader && p.rank === 1) continue;
          seen[p.wins] = 1;
          if (++n > 9) break;
          pips += '<span class="lbx-room-pip' + ((rm.ties[p.wins] || 1) > 1 ? " tie" : "") +
            '" style="top:' + g.yPct(p.wins).toFixed(2) + '%"></span>';
        }
        if (rm.leader && onLadder(rm.leader.wins) && !rm.leader.you) {
          lead = '<span class="lbx-room-lead" style="top:' + g.yPct(rm.leader.wins).toFixed(2) + '%">' +
            '<span class="lbx-room-ring" data-lbx-ink="lead"></span>' +
            (Math.abs(rm.leader.wins - rm.youWins) > 1
              ? '<i class="lbx-room-rec">' + esc(recOf(rm.leader.wins)) + "</i>" : "") + "</span>";
        }
        foot = rm.leader && rm.leader.you
          ? "YOU LEAD IT"
          : commas(rm.field) + " TODAY";
        out = '<span class="lbx-room" data-lbx="room">' +
          '<span class="lbx-room-band" data-lbx-ink="band"></span>' +
          pips + lead +
          '<i class="lbx-room-foot">' + esc(foot) + "</i>" +
          '<button class="lbx-room-hit tm-flat" type="button" aria-label="Today’s board">' +
            '<i class="lbx-room-chev" aria-hidden="true">›</i></button>' +
          '<span class="lbx-room-fall">' + esc(
            (rm.leader && onLadder(rm.leader.wins) ? "Today’s best is " + recOf(rm.leader.wins) + ". " : "") +
            fieldLine(recipe, data)) + "</span>" +
          "</span>";
        return out;
      },
      paint: function (doc, recipe, data) {
        var A = art(), el = lift(doc, "room"), rm, g, shape, lead;
        if (!A || !el) return;
        rm = roomOf(recipe, data); g = geo(rm.youWins); shape = fieldShape(rm);
        if (shape.length) {
          A.screen(doc, inkEl(el, "band"), drawShape(shape, g.yPct), {
            ink: "pop", seed: 821, slot: "roomband", layer: "under", alpha: 0.9,
            key: "band|" + rm.field + "|" + rm.youRank + "|" + rm.youWins + "|" + shape.length
          });
        }
        lead = inkEl(el, "lead");
        if (lead) {
          A.screen(doc, lead, drawDisc(0.96, null), {
            ink: "pop", seed: 307, slot: "roomlead", layer: "under",
            key: "lead|" + (rm.leader ? rm.leader.wins : 0)
          });
        }
        addClass(el, "is-inked");
      },
      css: function () {
        return join([
          '[data-lbx="room"] { display: block; margin: 8px 0 0; font-family: var(--t-mono); }',
          '[data-lbx="room"] .lbx-room-fall { display: block; font-size: var(--t-fs-small);',
          '  line-height: 1.4; color: var(--t-text-2); }',
          '[data-lbx="room"] .lbx-room-band, [data-lbx="room"] .lbx-room-pip,',
          '[data-lbx="room"] .lbx-room-lead, [data-lbx="room"] .lbx-room-foot,',
          '[data-lbx="room"] .lbx-room-hit { display: none; }',
          /* lifted: the overlay sits on the Climb's own scale and never eats a legend tag's taps */
          '[data-lbx="room"].is-lifted { position: absolute; left: 0; right: 0; top: 0; bottom: 0;',
          '  margin: 0; z-index: 3; pointer-events: none; }',
          '[data-lbx="room"].is-lifted .lbx-room-fall { display: none; }',
          '[data-lbx="room"].is-lifted .lbx-room-band { display: block; position: absolute;',
          '  left: var(--rail-x); right: 0; top: 0; bottom: 0; }',
          '[data-lbx="room"].is-lifted .lbx-room-pip { display: block; position: absolute;',
          '  left: calc(var(--rail-x) + 8px); width: 7px; height: 7px; margin: -3.5px 0 0 -3.5px;',
          '  border-radius: 50%; background: var(--t-offset); }',
          '[data-lbx="room"].is-lifted .lbx-room-pip.tie { width: 10px; height: 10px;',
          '  margin: -5px 0 0 -5px; box-shadow: 0 0 0 2px rgb(var(--t-offset-rgb) / .3); }',
          '[data-lbx="room"].is-lifted .lbx-room-lead { display: block; position: absolute;',
          '  left: calc(var(--rail-x) + 3px); right: 2px; height: 18px; margin-top: -9px; }',
          '[data-lbx="room"] .lbx-room-ring { position: absolute; left: 0; top: 1px;',
          '  width: 16px; height: 16px; border-radius: 50%; }',
          '[data-lbx="room"] .lbx-room-rec { position: absolute; left: 20px; top: 50%;',
          '  transform: translateY(-50%); font-family: var(--t-mono); font-size: 10px; font-weight: 700;',
          '  letter-spacing: 0.02em; color: var(--t-offset); font-style: normal; white-space: nowrap; }',
          '[data-lbx="room"].is-lifted .lbx-room-foot { display: block; position: absolute;',
          '  left: calc(var(--rail-x) + 4px); bottom: -2px; font-family: var(--t-mono); font-size: 8.5px;',
          '  font-weight: 700; letter-spacing: 0.08em; color: var(--t-offset); font-style: normal;',
          '  white-space: nowrap; }',
          '[data-lbx="room"].is-lifted .lbx-room-hit { display: block; position: absolute;',
          '  left: var(--rail-x); right: 0; top: 0; bottom: 0; width: auto; padding: 0;',
          '  border: 0; background: transparent; pointer-events: auto;',
          '  -webkit-tap-highlight-color: transparent; }',
          '[data-lbx="room"] .lbx-room-hit:active { background: rgb(var(--t-offset-rgb) / .14); }',
          '[data-lbx="room"] .lbx-room-chev { position: absolute; right: 1px; top: 50%;',
          '  transform: translateY(-50%); font-family: var(--t-disp); font-size: 15px; font-weight: 700;',
          '  font-style: normal; color: var(--t-offset); opacity: .75; }'
        ]);
      }
    },

    {
      id: "second",
      name: "The rail finishes itself",
      mount: "climb-foot",
      note: "THE GREY RAIL ABOVE YOUR DOT IS ALREADY AN UNFINISHED BAR. The amber fill runs from your dot DOWN to " +
            "the floor, so the stretch from your dot up to the 82-0 cap is grey, and the game draws that open goal " +
            "today and never uses it. This prints over it in aqua, as a second plate on the same line, carrying the " +
            "drum's own registration offset so it reads as a second ink and not a second CSS colour. It stops at the " +
            "best living record, never at 82, so the length of the aqua IS the gap to the room's best and where it " +
            "ends IS their record. One line, two inks: what you did below, what the room's best did above, and the " +
            "grey that is left is how much of 82 nobody has taken. The tap target is the rail itself, 36px wide over " +
            "the unfinished stretch. Two states to judge. When you lead the board the aqua lands BELOW your dot, " +
            "running up from the floor to the best of the rest, and that inversion is the best outcome in the game " +
            "and has to look like one. And two saturated inks on one 8px stroke at 320px is a contrast question " +
            "that only a screenshot settles.",
      html: function (recipe, data) {
        var rm = roomOf(recipe, data), g = geo(rm.youWins), i, tgt = null, lead = rm.leader, you;
        if (!rm.field) return "";
        you = rm.youWins;
        if (lead && !lead.you && onLadder(lead.wins) && lead.wins > you) {
          tgt = { wins: lead.wins, over: true };
        } else {
          for (i = 0; i < rm.samples.length; i++) {
            if (!rm.samples[i].you && onLadder(rm.samples[i].wins) && rm.samples[i].wins <= you) {
              tgt = { wins: rm.samples[i].wins, over: false }; break;
            }
          }
        }
        if (!tgt) return "";
        /* THREE STATES, and the third one is why this is not two lines of code. over: somebody is
           above you, so the aqua climbs from your dot to their record. under: nobody is, so it climbs
           from the floor to the best of the rest and ends BELOW your dot, which is the best outcome in
           the game. level: the best of the rest has your exact record, so there is no length to draw
           and a bar from your own dot down would simply overprint the amber fill. That one prints a
           single aqua dot, nudged into the gutter because your own 16px pink dot would hide it on the
           rail, and it means somebody is level with you. */
        var level = !tgt.over && tgt.wins >= you;
        var company = level ? Math.max(1, atRecord(rm, you) - 1) : 0;
        var y1 = g.yPct(tgt.wins), y2 = level ? g.yPct(tgt.wins) : (tgt.over ? g.youY : g.yFloor);
        var midPx = (Math.min(y1, y2) + Math.abs(y2 - y1) / 2) / 100 * g.trackPx;
        var spanPx = Math.max(44, Math.abs(y2 - y1) / 100 * g.trackPx);
        return '<span class="lbx-second" data-lbx="second" data-y1="' + y1.toFixed(2) + '" data-y2="' +
            y2.toFixed(2) + '" data-dx="' + (level ? 14 : 0) + '" data-tie="' + company + '">' +
          '<span class="lbx-second-ink" data-lbx-ink="rail"></span>' +
          '<span class="lbx-second-cap" style="top:' + y1.toFixed(2) + '%">' +
            '<i>' + esc(recOf(tgt.wins) + (level ? "  " + commas(company + 1) + " here" : "")) + "</i></span>" +
          '<button class="lbx-second-hit tm-flat" type="button" aria-label="Today’s board"' +
            ' style="top:' + Math.round(midPx) + "px;height:" + Math.round(spanPx) + "px;margin-top:" +
            Math.round(-spanPx / 2) + 'px"></button>' +
          '<span class="lbx-second-fall">' + esc(
            (tgt.over
              ? "Today’s best is " + recOf(tgt.wins) + ". " +
                (winGap({ rank: 1, score: recOf(tgt.wins) }, { score: recOf(you) }) || "")
              : level
                ? commas(company + 1) + " GMs are on " + recOf(you) + ", you among them. " +
                  fieldLine(recipe, data)
                : "Nobody on the board is above you. " + fieldLine(recipe, data))) + "</span>" +
          "</span>";
      },
      paint: function (doc, recipe, data) {
        var A = art(), el = lift(doc, "second"), y1, y2, dx, tie;
        if (!A || !el) return;
        y1 = Number(el.getAttribute("data-y1")); y2 = Number(el.getAttribute("data-y2"));
        dx = Number(el.getAttribute("data-dx")) || 0;
        if (!isFinite(y1) || !isFinite(y2)) return;
        /* level: there is no length to draw, so the ink prints the rung's own company instead, one dot
           a GM, nudged into the gutter where your 16px pink dot cannot hide them. */
        tie = Math.max(0, Math.floor(Number(el.getAttribute("data-tie")) || 0));
        if (y1 === y2 && tie > 0) {
          A.screen(doc, inkEl(el, "rail"), function (g, w, h, K) {
            var sub = Math.min(14, tie), gg = drawTieRow(sub);
            g.save();
            g.translate(w * (CLIMB.RX / 100) + REG_X + dx, (y1 / 100) * h - h / 2 + REG_Y);
            gg(g, w - (w * (CLIMB.RX / 100) + dx), h, K);
            g.restore();
          }, { ink: "pop", seed: 601, slot: "secondrail", layer: "under", key: "tie|" + y1.toFixed(2) + "|" + tie });
        } else {
          A.screen(doc, inkEl(el, "rail"), drawRailInk(y1, y2, dx), {
            ink: "pop", seed: 601, slot: "secondrail", layer: "under",
            key: "rail|" + y1.toFixed(2) + "|" + y2.toFixed(2) + "|" + dx
          });
        }
        addClass(el, "is-inked");
      },
      css: function () {
        return join([
          '[data-lbx="second"] { display: block; margin: 8px 0 0; }',
          '[data-lbx="second"] .lbx-second-fall { display: block; font-family: var(--t-mono);',
          '  font-size: var(--t-fs-small); line-height: 1.4; color: var(--t-text-2); }',
          '[data-lbx="second"] .lbx-second-ink, [data-lbx="second"] .lbx-second-cap,',
          '[data-lbx="second"] .lbx-second-hit { display: none; }',
          '[data-lbx="second"].is-lifted { position: absolute; left: 0; right: 0; top: 0; bottom: 0;',
          '  margin: 0; z-index: 3; pointer-events: none; }',
          '[data-lbx="second"].is-lifted .lbx-second-fall { display: none; }',
          '[data-lbx="second"].is-lifted .lbx-second-ink { display: block; position: absolute;',
          '  left: 0; right: 0; top: 0; bottom: 0; }',
          '[data-lbx="second"].is-lifted .lbx-second-cap { display: block; position: absolute;',
          '  left: calc(var(--rail-x) + 10px); transform: translateY(-50%); white-space: nowrap; }',
          '[data-lbx="second"] .lbx-second-cap i { font-family: var(--t-mono); font-size: 10px;',
          '  font-weight: 700; letter-spacing: 0.02em; font-style: normal; color: var(--t-offset); }',
          '[data-lbx="second"].is-lifted .lbx-second-hit { display: block; position: absolute;',
          '  left: calc(var(--rail-x) - 18px); width: 36px; padding: 0; border: 0;',
          '  background: transparent; pointer-events: auto; border-radius: 18px;',
          '  -webkit-tap-highlight-color: transparent; }',
          '[data-lbx="second"] .lbx-second-hit:active { background: rgb(var(--t-offset-rgb) / .16); }'
        ]);
      }
    },

    {
      id: "pinned",
      name: "The room is already pinned",
      mount: "climb-foot",
      note: "THE CLIMB IS ALREADY A LEADERBOARD OF DEAD TEAMS, so the cheapest possible explanation of what the new " +
            "board is, is to put three living GMs on the ladder the player is already reading. All 21 legend pins " +
            "stay exactly as drawn, on the left. Three GMs from today's board, the ones nearest the player, join the " +
            "same rail on the right in the same pin language, with their handle and record in the same mono 9.5px " +
            "tag type in the right gutter. Each pin is a printed disc whose ink weight is how many GMs share that " +
            "record, so a tie is heavier ink rather than a footnote. A dead team and a living GM now share one rail " +
            "and the tag you can tap goes to the board instead of to Basketball-Reference. Three rules keep it from " +
            "defacing the graphic: a hard cap of three, never a tag within one win of your own dot (that band " +
            "belongs to .cy-label, so those print as a pin only), and the handle truncates rather than pushing the " +
            "gutter. This is the direction most likely to be judged as crowding the one graphic he likes, which is " +
            "exactly why it is here at full weight.",
      html: function (recipe, data) {
        var rm = roomOf(recipe, data), g = geo(rm.youWins), out = "", i, p, n = 0, seen = {}, rung;
        if (!rm.field || !rm.near.length) return "";
        for (i = 0; i < rm.near.length && n < 3; i++) {
          p = rm.near[i];
          if (!onLadder(p.wins) || seen[p.rank]) continue;
          seen[p.rank] = 1; n++;
          out += '<span class="lbx-pin-dot" data-lbx-ink="p' + n + '" style="top:' + g.yPct(p.wins).toFixed(2) + '%"></span>';
          if (Math.abs(p.wins - rm.youWins) > 1) {
            out += '<span class="lbx-pin-tag" style="top:' + g.yPct(p.wins).toFixed(2) + '%">' +
              '<b>' + esc(p.name) + "</b> " + esc(recOf(p.wins)) + "</span>";
          }
        }
        if (!n) return "";
        rung = rm.leader && onLadder(rm.leader.wins) ? rungFor(rm.leader.wins) : null;
        return '<span class="lbx-pinned" data-lbx="pinned">' + out +
          '<button class="lbx-pin-hit tm-flat" type="button" aria-label="Today’s board"></button>' +
          '<span class="lbx-pin-fall">' + esc(
            (rm.leader && onLadder(rm.leader.wins)
              ? "Today’s best is " + recOf(rm.leader.wins) + (rung ? ", the " + rung.label + " rung. " : ". ")
              : "") + fieldLine(recipe, data)) + "</span>" +
          "</span>";
      },
      paint: function (doc, recipe, data) {
        var A = art(), el = lift(doc, "pinned"), rm, i, p, n = 0, dot, cov;
        if (!A || !el) return;
        rm = roomOf(recipe, data);
        for (i = 0; i < rm.near.length && n < 3; i++) {
          p = rm.near[i];
          if (!onLadder(p.wins)) continue;
          n++;
          dot = inkEl(el, "p" + n);
          if (!dot) continue;
          cov = clampN(0.45 + 0.18 * ((rm.ties[p.wins] || 1) - 1), 0, 1);
          A.screen(doc, dot, drawDisc(cov, null), {
            ink: "pop", seed: 211 + n, slot: "pin" + n, layer: "under",
            key: "pin|" + p.wins + "|" + cov.toFixed(2)
          });
        }
        addClass(el, "is-inked");
      },
      css: function () {
        return join([
          '[data-lbx="pinned"] { display: block; margin: 8px 0 0; }',
          '[data-lbx="pinned"] .lbx-pin-fall { display: block; font-family: var(--t-mono);',
          '  font-size: var(--t-fs-small); line-height: 1.4; color: var(--t-text-2); }',
          '[data-lbx="pinned"] .lbx-pin-dot, [data-lbx="pinned"] .lbx-pin-tag,',
          '[data-lbx="pinned"] .lbx-pin-hit { display: none; }',
          '[data-lbx="pinned"].is-lifted { position: absolute; left: 0; right: 0; top: 0; bottom: 0;',
          '  margin: 0; z-index: 3; pointer-events: none; }',
          '[data-lbx="pinned"].is-lifted .lbx-pin-fall { display: none; }',
          '[data-lbx="pinned"].is-lifted .lbx-pin-dot { display: block; position: absolute;',
          '  left: calc(var(--rail-x) + 8px); width: 9px; height: 9px; margin: -4.5px 0 0 -4.5px; }',
          '[data-lbx="pinned"].is-lifted .lbx-pin-tag { display: block; position: absolute;',
          '  left: calc(var(--rail-x) + 16px); right: 0; transform: translateY(-50%);',
          '  font-family: var(--t-mono); font-size: 9.5px; font-weight: 600; letter-spacing: 0.03em;',
          '  color: var(--t-offset); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
          '[data-lbx="pinned"] .lbx-pin-tag b { font-weight: 700;',
          '  text-decoration: underline dotted; text-underline-offset: 2px; }',
          '[data-lbx="pinned"].is-lifted .lbx-pin-hit { display: block; position: absolute;',
          '  left: var(--rail-x); right: 0; top: 0; bottom: 0; padding: 0; border: 0;',
          '  background: transparent; pointer-events: auto; -webkit-tap-highlight-color: transparent; }',
          '[data-lbx="pinned"] .lbx-pin-hit:active { background: rgb(var(--t-offset-rgb) / .12); }'
        ]);
      }
    },

    {
      id: "altitude",
      name: "Your five says where you stand",
      mount: "climb-foot",
      note: "FILL THE SLOT THE GAME ALREADY STYLED AND NEVER USED. styles.css:1207 specifies .cy-label small as a " +
            "block of Space Mono 10.5px in --t-text-2 under YOUR FIVE, and app.js emits no small, ever. It is a " +
            "designed empty slot sitting at your own altitude on the graphic. This fills it with one line, 9th of " +
            "4,412, and under the line a 6px rule of real aqua halftone whose REACH is the share of the room at or " +
            "below you, washed from heavy to starved. So the rank is a number at your own height and also a length, " +
            "and the ink runs out where you do. The words YOUR FIVE are the loudest small thing on the graphic and " +
            "already glow in accent, so the tap target is already found. No new element type, no new block, no " +
            "layout shift, nothing added above the fold. This is the thinnest direction in the set and it is the " +
            "honest control arm: build it to prove the louder ones earn their cost. It is silent when the true rank " +
            "is unknown, and it never restates the percentile.",
      html: function (recipe, data) {
        var rm = roomOf(recipe, data), lineTxt, share = belowShare(rm);
        if (!rm.field) return "";
        if (recipe && recipe.hasRun && rm.youRank > 0 && (recipe.signedIn !== false)) {
          lineTxt = ordinal(rm.youRank) + " of " + commas(rm.field);
        } else if (recipe && recipe.hasRun) {
          lineTxt = commas(rm.field) + " GMs today";
        } else {
          lineTxt = commas(rm.field) + " GMs today";
        }
        return '<span class="lbx-alt" data-lbx="altitude" data-share="' + share.toFixed(4) + '">' +
          '<button class="lbx-alt-hit tm-flat" type="button">' + esc(lineTxt) +
            '<i class="lbx-alt-rule" data-lbx-ink="rule"></i></button>' +
          "</span>";
      },
      paint: function (doc, recipe, data) {
        var A = art(), el = rootFor(doc, "altitude"), label = q(doc, ".rr-climb .cy-label") || q(doc, ".cy-label");
        var small, share, rm;
        if (!el) return;
        if (label) {
          small = label.querySelector("small");
          if (!small) { small = doc.createElement("small"); label.appendChild(small); }
          if (el.parentNode !== small) small.appendChild(el);
          addClass(el, "is-lifted");
        }
        if (!A) return;
        rm = roomOf(recipe, data);
        share = Number(el.getAttribute("data-share"));
        if (!isFinite(share) || share <= 0) share = 1;        // no rank to show: the band states the room, flat
        A.wash(doc, inkEl(el, "rule"), {
          ink: "pop", cov: 0.92, cov2: 0.16, to: clampN(share, 0.06, 1), soft: 0.2,
          seed: 739, slot: "altrule", layer: "under",
          key: "alt|" + share.toFixed(3) + "|" + rm.youRank
        });
        addClass(el, "is-inked");
      },
      css: function () {
        return join([
          '[data-lbx="altitude"] { display: block; margin: 6px 0 0; max-width: 150px; }',
          '[data-lbx="altitude"] .lbx-alt-hit { display: block; width: 100%; min-height: 32px;',
          '  margin: 0; padding: 0; border: 0; background: transparent; text-align: left;',
          '  font-family: var(--t-mono); font-size: 10.5px; font-weight: 600; letter-spacing: 0.03em;',
          '  line-height: 1.3; color: var(--t-text-2); -webkit-tap-highlight-color: transparent; }',
          '[data-lbx="altitude"] .lbx-alt-hit:active { color: var(--t-offset); }',
          '[data-lbx="altitude"] .lbx-alt-rule { display: block; position: relative;',
          '  width: 100%; height: 6px; margin: 3px 0 0; }',
          /* not inked (no engines): the rule is still a length, drawn as flat ink rather than a lie about halftone */
          '[data-lbx="altitude"]:not(.is-inked) .lbx-alt-rule { background: var(--t-offset); opacity: .5; }',
          '[data-lbx="altitude"].is-lifted { margin: 2px 0 0; max-width: none; }'
        ]);
      }
    },

    {
      id: "club",
      name: "The summit answers",
      mount: "climb-foot",
      note: "THE 82-0 CAP AT THE TOP OF THE RAIL IS A LABEL, and unless you went undefeated there is nothing up " +
            "there. This makes the summit answer: beside the cap, in the empty top of the right gutter, the 82-0 " +
            "Club prints as a cluster of stamped aqua rings, one impression per perfect season ever verified, newest " +
            "heaviest, with the count beside them. The number of rings IS the size of the club and the altitude is " +
            "already what 82-0 means, so nothing is labelled. It is the one board in the slate that passes the " +
            "does-not-care-about-scores test on its own, because it has no ranking in it, only dates and five names " +
            "each. It is always present, never animated, never louder than the cap it sits beside. Two honest " +
            "limits. It is the least obvious target on the screen, so it is a reward for the curious and must never " +
            "be counted as the hook. And an empty club on launch week is a thin destination, so the empty state " +
            "prints a real test sheet from the art library behind the words, which is what a press does with a page " +
            "that has nothing on it yet.",
      html: function (recipe, data) {
        var club = null, n = 0, newest = null;
        try { club = (LB.data && LB.data.board) ? LB.data.board("club", recipe) : null; } catch (e) { club = null; }
        if (club) {
          n = Math.max(0, Math.floor(club.field || 0));
          if (club.rows && club.rows.length) newest = club.rows[0];
        }
        return '<span class="lbx-club" data-lbx="club" data-n="' + n + '">' +
          '<span class="lbx-club-ink" data-lbx-ink="rings"></span>' +
          '<button class="lbx-club-hit tm-flat" type="button">82–0 CLUB' +
            (n > 0 ? '<i class="lbx-club-n">' + esc(commas(n)) + "</i>" : '<i class="lbx-club-n">0</i>') +
          "</button>" +
          '<span class="lbx-club-fall">' + esc(n > 0
            ? commas(n) + (n === 1 ? " perfect season" : " perfect seasons") +
              (newest && newest.score ? ", newest " + newest.score : "") + "."
            : "No perfect seasons yet. The first 82-0 opens this page.") + "</span>" +
          "</span>";
      },
      paint: function (doc, recipe, data) {
        var A = art(), el = lift(doc, "club"), n, ink;
        if (!A || !el) return;
        n = Math.max(0, Math.floor(Number(el.getAttribute("data-n")) || 0));
        ink = inkEl(el, "rings");
        if (!ink) return;
        if (n > 0) {
          A.screen(doc, ink, drawRings(Math.min(n, 36)), {
            ink: "pop", seed: 353, slot: "clubrings", layer: "under", key: "rings|" + Math.min(n, 36)
          });
        } else {
          /* the honest empty state: a test sheet is what a press prints on a page with nothing on it.
             testsheet is on LB.art.SURFACE, so its hero is the surface accident rather than the letter. */
          A.treat(doc, "testsheet", ink, { e: 0.34, dur: 1.05, seed: 82, alpha: 0.45, slot: "clubempty", layer: "under" });
        }
        addClass(el, "is-inked");
      },
      css: function () {
        return join([
          '[data-lbx="club"] { display: block; margin: 8px 0 0; }',
          '[data-lbx="club"] .lbx-club-fall { display: block; font-family: var(--t-mono);',
          '  font-size: var(--t-fs-small); line-height: 1.4; color: var(--t-text-2); }',
          '[data-lbx="club"] .lbx-club-ink { display: none; }',
          '[data-lbx="club"] .lbx-club-hit { display: inline-block; margin: 4px 0 0; padding: 0;',
          '  border: 0; background: transparent; font-family: var(--t-mono); font-size: 9px;',
          '  font-weight: 700; letter-spacing: 0.08em; color: var(--t-offset);',
          '  -webkit-tap-highlight-color: transparent; }',
          '[data-lbx="club"] .lbx-club-n { margin-left: 5px; font-family: var(--t-disp);',
          '  font-size: 13px; font-style: normal; letter-spacing: 0.02em; }',
          '[data-lbx="club"].is-lifted { position: absolute; left: calc(var(--rail-x) + 8px); right: 0;',
          '  top: -2px; margin: 0; z-index: 5; pointer-events: none; }',
          '[data-lbx="club"].is-lifted .lbx-club-fall { display: none; }',
          '[data-lbx="club"].is-lifted .lbx-club-ink { display: block; position: absolute;',
          '  left: 0; right: 0; top: 0; height: 22px; }',
          '[data-lbx="club"].is-lifted .lbx-club-hit { position: absolute; left: 0; top: 22px;',
          '  min-height: 30px; padding-right: 6px; pointer-events: auto; white-space: nowrap; }',
          '[data-lbx="club"] .lbx-club-hit:active { color: var(--t-offset-hi); }'
        ]);
      }
    },

    {
      id: "shell",
      name: "The fireworks print a number",
      mount: "climb-foot",
      note: "THE LOUDEST THING ON THIS SCREEN ALREADY EXISTS AND FIRES FOR ABOUT 8% OF RUNS. #goatFw spans the Climb " +
            "as an FX layer and shells ride it when an 82-0 scrolls into view, and it says nothing for everybody " +
            "else. This generalises it: when the Climb comes into view, one ink swing plays over it in the run's own " +
            "dealt look, and what it leaves behind is a printed seal at your own altitude with your standing KNOCKED " +
            "OUT of the plate, which is how a riso prints type that belongs to the ink instead of sitting on it. The " +
            "seal is the tap target and it stays. This is his own reward rule applied to a fact: big riso ink print " +
            "swings, stamps and halftone rings, not subtle ones. Three rules it obeys. It yields on a real 82-0, " +
            "where the screen is already firing nine shells. It is aqua and never red, and the copy is a rank and " +
            "never a comment, so a loud swing on a quiet run reads as a fact and not a taunt. And it fires once. In " +
            "the lab it replays on tapping the seal, because a static screenshot cannot judge a swing.",
      html: function (recipe, data) {
        var rm = roomOf(recipe, data), g = geo(rm.youWins), label;
        if (!rm.field || !recipe || !recipe.hasRun || rm.youRank < 1) return "";
        label = ordinal(rm.youRank).toUpperCase();
        return '<span class="lbx-shell' + (label.length > 3 ? " long" : "") +
            '" data-lbx="shell" data-label="' + esc(label) + '">' +
          '<span class="lbx-shell-seal" data-lbx-ink="seal" style="top:' + g.youY.toFixed(2) + '%">' +
            '<i>' + esc(label) + "</i></span>" +
          '<button class="lbx-shell-hit tm-flat" type="button" aria-label="Today’s board"' +
            ' style="top:' + g.youY.toFixed(2) + '%"></button>' +
          '<span class="lbx-shell-fall">' + esc(ordinal(rm.youRank) + " of " + commas(rm.field) +
            " on today’s board.") + "</span>" +
          "</span>";
      },
      paint: function (doc, recipe, data) {
        var A = art(), el = lift(doc, "shell"), seal, hit, label, track;
        if (!A || !el) return;
        label = el.getAttribute("data-label") || "";
        seal = inkEl(el, "seal");
        if (seal) {
          A.screen(doc, seal, drawSeal(label), {
            ink: "pop", seed: 677, slot: "shellseal", layer: "under", key: "seal|" + label
          });
          addClass(el, "is-inked");
        }
        hit = el.querySelector(".lbx-shell-hit");
        track = trackFor(doc);
        /* a REWARD, never a render pass: art.js is explicit that a heat effect from a paint would fire
           fireworks every time the recipe changes. So it is on the tap here, and on the Climb entering
           view once when this ships. */
        if (hit && track) onTap(hit, function () { A.hot(doc, "pulse", "save", track, {}); });
      },
      css: function () {
        return join([
          '[data-lbx="shell"] { display: block; margin: 8px 0 0; }',
          '[data-lbx="shell"] .lbx-shell-fall { display: block; font-family: var(--t-mono);',
          '  font-size: var(--t-fs-small); line-height: 1.4; color: var(--t-text-2); }',
          '[data-lbx="shell"] .lbx-shell-seal, [data-lbx="shell"] .lbx-shell-hit { display: none; }',
          '[data-lbx="shell"].is-lifted { position: absolute; left: 0; right: 0; top: 0; bottom: 0;',
          '  margin: 0; z-index: 5; pointer-events: none; }',
          '[data-lbx="shell"].is-lifted .lbx-shell-fall { display: none; }',
          /* 26px below your own dot, because .cy-label owns the gutter at exactly your altitude */
          '[data-lbx="shell"].is-lifted .lbx-shell-seal { display: block; position: absolute;',
          '  left: calc(var(--rail-x) + 10px); width: 40px; height: 40px; margin-top: 8px; }',
          '[data-lbx="shell"].long .lbx-shell-seal i { font-size: 11px; }',
          '[data-lbx="shell"] .lbx-shell-seal i { position: absolute; left: 0; right: 0; top: 50%;',
          '  transform: translateY(-50%); text-align: center; font-family: var(--t-disp);',
          '  font-size: 15px; font-weight: 700; font-style: normal; letter-spacing: 0.02em;',
          '  color: var(--t-offset); }',
          '[data-lbx="shell"].is-inked .lbx-shell-seal i { visibility: hidden; }',
          '[data-lbx="shell"].is-lifted .lbx-shell-hit { display: block; position: absolute;',
          '  left: calc(var(--rail-x) + 8px); width: 44px; height: 44px; margin-top: 6px;',
          '  padding: 0; border: 0; border-radius: 50%; background: transparent; pointer-events: auto;',
          '  -webkit-tap-highlight-color: transparent; }',
          '[data-lbx="shell"] .lbx-shell-hit:active { background: rgb(var(--t-offset-rgb) / .18); }'
        ]);
      }
    },

    {
      id: "press",
      name: "The room gets a print",
      mount: "after-comp",
      note: "THE ONE THAT PASSES THE TEST FOR SOMEBODY WHO DOES NOT CARE WHO WON. The results screen's hero is a riso " +
            "print of YOUR season from T82PRINT, and it is not touched. Directly under the record, today's best " +
            "season prints as a second, small banner off the same press: their record set as the banner's own " +
            "display type in two inks off register, the shape of their 82 as the ridge, the gauge colouring the " +
            "picture only as far as their win rate, and TODAY'S BEST as the eyebrow. Under it their season prints " +
            "again as the reel's own ledger of 82 stamps. Two pictures from one engine, yours big and theirs a card, " +
            "so comparing the two ridges is honest: same geometry, same stock, same inks. The head of the board is " +
            "then a picture of the person who is winning it rather than a header bar, and the picture is the door. " +
            "Two things to judge. It is a second image on a page that already has one, sized as a band and not a " +
            "hero on purpose. And it is the only direction here that puts anything above the share button, which is " +
            "where the eye already is.",
      html: function (recipe, data) {
        var rm = roomOf(recipe, data), lead = rm.leader, i, rest = null, mine;
        if (!rm.field) return "";
        /* the leader's own print, unless the leader is the viewer: then it is the best of the rest, so
           the player at the top of the board gets a picture too and the caption says which it is. */
        if (lead && !lead.you && onLadder(lead.wins)) { rest = lead; mine = false; }
        else {
          for (i = 0; i < rm.samples.length; i++) {
            if (!rm.samples[i].you && onLadder(rm.samples[i].wins)) { rest = rm.samples[i]; break; }
          }
          mine = true;
        }
        if (!rest) return "";
        lead = rest;
        return '<span class="lbx-press" data-lbx="press" data-wins="' + lead.wins + '">' +
          '<button class="lbx-press-card tm-flat" type="button" aria-label="Today’s board">' +
            '<span class="lbx-press-pic" data-lbx-ink="pic"></span>' +
            '<span class="lbx-press-strip" data-lbx-ink="strip"></span>' +
            '<span class="lbx-press-cap"><b>' + esc(recOf(lead.wins)) + "</b> " +
              esc((mine ? "is the best of the rest, out of " + commas(rm.field) + ". "
                        : "is today’s best of " + commas(rm.field) + ". ") +
                  (ghostLine(recipe) || "")) + "</span>" +
          "</button></span>";
      },
      paint: function (doc, recipe, data) {
        var A = art(), el = rootFor(doc, "press"), wins, seed, scene, pic, strip, w;
        if (!A || !el) return;
        wins = Math.floor(Number(el.getAttribute("data-wins")) || 0);
        seed = Math.floor((recipe && recipe.seed) || 82);
        /* a named scene, never T82ART.deal(), because deal() calls Math.random and a T82- code has to
           reproduce the exact screen he starred */
        scene = pick(["skyline", "ridgelines", "dunes", "wave", "lighthouse", "volcano"], seed, "press");
        pic = inkEl(el, "pic");
        strip = inkEl(el, "strip");
        if (pic) {
          A.scene(doc, scene, pic, {
            wins: wins, seed: seed, pal: "night", context: "TODAY’S BEST",
            fit: "cover", focus: "top", slot: "pressscene", layer: "under"
          });
        }
        if (strip) {
          w = 0;
          try { w = Math.round(strip.getBoundingClientRect().width); } catch (e) { w = 0; }
          A.strip(doc, strip, { wins: wins, seed: seed, cssW: w || undefined, mi: 0, slot: "pressstrip", layer: "flow" });
        }
        addClass(el, "is-inked");
      },
      css: function () {
        return join([
          '[data-lbx="press"] { display: block; margin: 8px 0 2px; }',
          '[data-lbx="press"] .lbx-press-card { display: block; width: 100%; margin: 0; padding: 0;',
          '  border: 0; background: transparent; text-align: left;',
          '  -webkit-tap-highlight-color: transparent; }',
          '[data-lbx="press"] .lbx-press-pic { display: block; position: relative; width: 100%;',
          '  aspect-ratio: 1000 / 400; overflow: hidden; border-radius: 10px;',
          '  background: var(--t-ground-3); }',
          '[data-lbx="press"] .lbx-press-strip { display: block; position: relative; width: 100%;',
          '  min-height: 18px; margin: 4px 0 0; }',
          '[data-lbx="press"] .lbx-press-cap { display: block; margin: 4px 0 0;',
          '  font-family: var(--t-mono); font-size: var(--t-fs-small); line-height: 1.35;',
          '  color: var(--t-text-2); }',
          '[data-lbx="press"] .lbx-press-cap b { font-family: var(--t-disp); font-size: 15px;',
          '  font-weight: 700; letter-spacing: 0.03em; color: var(--t-offset); }',
          '[data-lbx="press"] .lbx-press-card:active .lbx-press-pic { opacity: .82; }'
        ]);
      }
    },

    {
      id: "stub",
      name: "The ticket comes back stamped",
      mount: "bottom",
      note: "THE GAME DEALS YOU A FRANCHISE AND ERA TICKET TO BEGIN A RUN, so the honest object to report where the " +
            "run landed is the same ticket, returned as a stub and STAMPED. In the reserved slot at the foot of the " +
            "page, below Run it back so it adds no step, the stub carries your record and your five, a wash of real " +
            "aqua halftone across it whose reach is the share of the room at or below you, and a printed seal with " +
            "your standing knocked out of the ink. A stamp is how a result becomes official in print, which is " +
            "exactly the job the server's own replay does, so the metaphor is doing work rather than decorating. The " +
            "whole stub is the door. It deliberately does NOT use one of the 43 print treatments: every one of them " +
            "draws an L or the word LOSS, and pressing a loss over a finished season would be a lie about the " +
            "result. Its real cost is position: it is the last thing on the page, so for the half of finishers who " +
            "never scroll past the roster it does not exist, which makes it a companion to a Climb direction rather " +
            "than the hook on its own.",
      html: function (recipe, data) {
        var rm = roomOf(recipe, data), share = belowShare(rm), label;
        if (!rm.field || !recipe || !recipe.hasRun) return "";
        label = rm.youRank > 0 ? ordinal(rm.youRank).toUpperCase() : "";
        return '<span class="lbx-stub' + (label.length > 3 ? " long" : "") +
            '" data-lbx="stub" data-share="' + share.toFixed(4) + '" data-label="' + esc(label) + '">' +
          '<button class="lbx-stub-card tm-flat" type="button">' +
            '<span class="lbx-stub-wash" data-lbx-ink="wash"></span>' +
            '<span class="lbx-stub-body">' +
              '<i class="lbx-stub-eyebrow">YOUR FIVE</i>' +
              '<b class="lbx-stub-rec">' + esc(recOf(rm.youWins)) + "</b>" +
              '<i class="lbx-stub-sub">' + esc(rm.youRank > 0
                ? ordinal(rm.youRank) + " of " + commas(rm.field) + " today"
                : (ghostLine(recipe) || commas(rm.field) + " GMs today")) + "</i>" +
            "</span>" +
            '<span class="lbx-stub-seal" data-lbx-ink="seal">' +
              (label ? '<i>' + esc(label) + "</i>" : "") + "</span>" +
          "</button></span>";
      },
      paint: function (doc, recipe, data) {
        var A = art(), el = rootFor(doc, "stub"), share, label, host, rr, vis;
        if (!A || !el) return;
        /* THE LAB HIDES ITS OWN MOUNT. lab.js injects a t82-live-hide sheet into the frame with
           "#runStatus { display: none !important }", which is right for the start screen's live chrome
           and wrong for the results reconstruction that lab.js itself writes the bottom hook into. A
           hidden element gets no box, so nothing would paint and the owner would judge a blank. Until
           that rule is scoped to the start view, the stub steps out of the hidden slot and sits at the
           end of .rr, which is the same place on the page. */
        try {
          host = el.parentNode;
          rr = q(doc, ".rr");
          vis = host && doc.defaultView ? doc.defaultView.getComputedStyle(host).display : "block";
          if (rr && host !== rr && vis === "none") rr.appendChild(el);
        } catch (e) {}
        share = Number(el.getAttribute("data-share"));
        label = el.getAttribute("data-label") || "";
        if (!isFinite(share) || share <= 0) share = 0.1;
        A.wash(doc, inkEl(el, "wash"), {
          ink: "pop", cov: 0.62, cov2: 0.1, to: clampN(share, 0.08, 1), soft: 0.22,
          seed: 419, slot: "stubwash", layer: "under", key: "stubwash|" + share.toFixed(3)
        });
        if (label) {
          A.screen(doc, inkEl(el, "seal"), drawSeal(label), {
            ink: "pop", seed: 503, slot: "stubseal", layer: "under", key: "stubseal|" + label
          });
          addClass(el, "is-inked");
        }
      },
      css: function () {
        return join([
          '[data-lbx="stub"] { display: block; margin: 10px 0 0; }',
          '[data-lbx="stub"] .lbx-stub-card { display: block; position: relative; width: 100%;',
          '  min-height: 62px; margin: 0; padding: 10px 62px 10px 12px; overflow: hidden;',
          '  border: 1px solid var(--t-rule); border-radius: 12px; background: var(--t-ground-2);',
          '  text-align: left; -webkit-tap-highlight-color: transparent; }',
          '[data-lbx="stub"] .lbx-stub-wash { position: absolute; left: 0; right: 0; top: 0; bottom: 0; }',
          '[data-lbx="stub"] .lbx-stub-body { display: block; position: relative; }',
          '[data-lbx="stub"] .lbx-stub-eyebrow { display: block; font-family: var(--t-mono);',
          '  font-size: 8.5px; font-weight: 700; font-style: normal; letter-spacing: 0.12em;',
          '  color: var(--t-text-2); }',
          '[data-lbx="stub"] .lbx-stub-rec { display: block; margin: 1px 0 0; font-family: var(--t-disp);',
          '  font-size: 30px; font-weight: 700; letter-spacing: 0.02em; line-height: 1;',
          '  color: var(--t-text); font-variant-numeric: lining-nums tabular-nums; }',
          '[data-lbx="stub"] .lbx-stub-sub { display: block; margin: 2px 0 0; font-family: var(--t-mono);',
          '  font-size: 10px; font-style: normal; letter-spacing: 0.03em; color: var(--t-offset); }',
          '[data-lbx="stub"] .lbx-stub-seal { position: absolute; right: 10px; top: 50%;',
          '  width: 44px; height: 44px; margin-top: -22px; }',
          '[data-lbx="stub"].long .lbx-stub-seal i { font-size: 12px; }',
          '[data-lbx="stub"] .lbx-stub-seal i { position: absolute; left: 0; right: 0; top: 50%;',
          '  transform: translateY(-50%); text-align: center; font-family: var(--t-disp);',
          '  font-size: 16px; font-weight: 700; font-style: normal; color: var(--t-offset); }',
          '[data-lbx="stub"].is-inked .lbx-stub-seal i { visibility: hidden; }',
          '[data-lbx="stub"] .lbx-stub-card:active { background: var(--t-ground-3); }'
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
