/* ---------- THE LEADERBOARD LAB: HOW YOU GET TO A BOARD (docs/leaderboard-lab/nav.js, v1) ----------

   LB.nav owns ONE question: how a player reaches a board. It owns nothing else. boards.js still owns
   the list, looks.js still owns the look, art.js is the only seam onto the real riso engines.

   THE BRIEF THIS FILE ANSWERS, in his words: "something I really dislike about the current pills idk
   why... it feels just boring. like a spreadsheet." And over all of it: "functional art (matching the
   general design language of the rest of the app), not a reskinned spreadsheet."

   So there are two tests here, not one, and every direction below is built to pass both:

   1. FUNCTIONAL. Navigation that carries information BEFORE it is touched. A row of identical pills
      tells you one thing: which one is lit. Every direction here tells you, without a tap and without
      a legend:
        - how busy each board is        (ink reach, spine height, dot pitch, notch thickness, panel size)
        - whether you are on it         (the ink is --t-you, and your pip sits at your own position)
        - which board is the hot one    (fire gold, --t-hot: one meaning per colour)
        - whether it is new today       (the home's own aqua badge)
        - whether it has opened at all  (a faint white impression and plain words, never a fake number)
      That is the dictionary's edge index translated honestly: a reader finds S without reading S,
      because the S notch is FAT. The test I applied to all seven: does the navigation have a thickness.

   2. THE DESIGN LANGUAGE. This is the game's own print world, not a dark dashboard. The ink on these
      navigations is real: LB.art.wash and LB.art.screen drive reel-riso.js's screening pass, so a
      board's population is printed in that ink's own halftone lattice, with its grain, its
      misregistration and its starvation specks. LB.art.scene prints a real season banner. LB.art.strip
      prints the leader's 82 games as the reel's own stamped coins. LB.art.paper puts the real stock
      under a press sheet. The doors direction is the home screen's own .hm-ht / .hm-mode grammar, not
      a copy of it.

   WHAT I DID NOT USE, and why, because round one's failure was unexamined choices:
     - The 43 print treatments (LB.art.treat). Every one of them draws an L or the word LOSS. The only
       place that is honest on a NAVIGATION is a board you have not qualified for, and an L stamped on
       a board you are not on yet is guilt framing. That is a standing house rule, not a taste call.
       So: no treatments anywhere in this file.
     - LB.art.hot (the 8 heat effects) appears exactly once, in one direction, on one condition: you
       tap a board where you are inside the top ten. It is a reward for a fact, on a tap, never in a
       render pass. Everywhere else it would be fireworks every time the recipe changes.

   THE MEASURED COST OF EIGHT BOARDS, which nobody can design around and he should know:
     the spec slate has EIGHT boards. Eight 44px tap targets stacked is 352px before a single rank.
     The sheet is 88vh and its head eats 44px, so on a 667px phone there are about 590px to spend.
     Any navigation that shows every board vertically is therefore a HUB: you tap, and the list is
     below it. Only one direction here costs no vertical room at all, THE EDGE INDEX, because it lives
     in the right gutter. Every direction marks itself data-hub="1" or not, and a hub scrolls the list
     to the top of the sheet on a board change, so a tap lands you on the board rather than leaving you
     looking at the navigation. That scroll is the whole reason wire() exists here.

   WHAT lab.js DOES WITH THIS FILE (applyNav, lab.js:~495):
     - sets <html data-nav="<id>"> on the FRAME, so css() can reach anything in the real page
     - injects css(recipe) as one <style>
     - replaces boards.js's .lb-tabs row with <div class="lb-nav" data-nav-id="<id>"> + html(...)
     - calls wire(frameDoc, set) on that FRESH subtree, every render
     - an html() that returns "" leaves the shipped pill row alone. That is how "pills" below works,
       and it is the control arm "Compare with today" needs.
   Clicks: lab.js's wireFrameControls listens on the whole board mount, so [data-board="<id>"] on any
   element in here changes the open board with no handler of my own. I use that everywhere.

   LISTENERS AND LEAKS: every listener in wire() goes on an element inside the nav box, and lab.js
   rebuilds that box on every render, so nothing accumulates. Nothing here touches window or document
   level events. wire() is safe to call again on a new render and is idempotent on the same one.

   ES5, no libraries, no Math.random, no Date.now, no em-dashes, every number deterministic from the
   recipe. Colour is tokens; ink is the engines' own. */
(function () {
  "use strict";
  var win = window;
  win.LB = win.LB || {};

  /* ======================================================================
     SMALL HELPERS
     ====================================================================== */

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function num(v, d) { var n = +v; return isFinite(n) ? n : d; }
  function int(v, d) { var n = Math.round(+v); return isFinite(n) ? n : d; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function clamp01(v) { return clamp(num(v, 0), 0, 1); }
  function round2(v) { return Math.round(num(v, 0) * 100) / 100; }
  function fmtInt(n) {
    var s = String(Math.abs(Math.round(num(n, 0)))), out = "", i;
    for (i = 0; i < s.length; i++) out += (i > 0 && (s.length - i) % 3 === 0 ? "," : "") + s.charAt(i);
    return (num(n, 0) < 0 ? "-" : "") + out;
  }
  function ordinal(n) {
    var v = Math.round(num(n, 0)), t = v % 100, d = v % 10;
    return fmtInt(v) + ((t >= 11 && t <= 13) ? "th" : d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th");
  }
  function plural(n, one, many) { return Math.abs(num(n, 0)) === 1 ? one : many; }
  /* FNV-1a, 32 bit. The only randomness in this file, and it is not random: the same board id and the
     same seed give the same answer forever, so a T82- code reproduces the exact screen he starred. */
  function hash(s) {
    var h = 0x811c9dc5, i;
    s = String(s);
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0; }
    return h >>> 0;
  }
  function frac(s) { return (hash(s) % 10000) / 10000; }

  /* EVERY <button> IN HERE CARRIES tm-flat, AND IT IS LOAD BEARING. app.js's document-wide
     MutationObserver (bindGlobalButtonStyle, app.js:795) adds .presti-spin to any <button> that does
     not match one of BTN3D_EXCLUDE's :not() clauses, and look.css paints .presti-spin as a neon keycap
     with #lab-k#lab-k specificity, which beats anything this file can write. Without tm-flat every
     spine, notch, plate and ticket in this file would render as the same gold keycap and the whole
     point of the direction would be gone. The ONE deliberate exception is the doors direction, which
     wants exactly that neon treatment because it is the home screen's own door. */
  function tagOpen(cls, attrs) { return '<button class="' + cls + ' tm-flat" type="button"' + (attrs || "") + ">"; }

  function art() { return win.LB && win.LB.art ? win.LB.art : null; }

  /* ======================================================================
     THE FACTS. This is the half that makes the art functional rather than pretty.
     ======================================================================
     Every direction below draws the SAME eight facts, in its own material. They are computed once,
     here, off LB.data (the lab's own believable fake rows) so no direction can quietly invent a
     number, and so two directions cannot disagree about the same board. */

  /* The one-word thing the headline number IS, in plain words. Two or three words, never a legend. */
  var WHAT = {
    today:      "today's best",
    month:      "best ten days",
    streak:     "longest run",
    club:       "perfect seasons",
    cheapest:   "the floor",
    you:        "your best",
    net:        "best net",
    outdrafted: "best in points",
    rate:       "best 82-0 rate"
  };
  /* The short stamp for the edge index's 42px gutter. "\n" is a line break in the notch, which is how
     the two long ones fit at all. Each notch still carries its full name in aria-label. */
  var STAMP = {
    today: "Today", month: "Month", streak: "Streak", club: "82-0", cheapest: "By\ncost",
    you: "You", net: "Best\nnet", outdrafted: "Out\ndrafted", rate: "82-0\n%"
  };
  /* The scene each board would print, IF it has a real 82-game season to print. Fixed, never dealt:
     T82ART.deal() calls Math.random and the lab may not. club and cheapest get PERFECT scenes
     (summit, kintsugi) on purpose: art.js forces an 82-0 spec for those seven, and both boards are
     lists of 82-0 seasons, so the picture itself says which board you are looking at. */
  var SCENE = {
    today: "skyline", month: "ridgelines", streak: "dunes", club: "summit",
    cheapest: "kintsugi", you: "lighthouse", net: "wave", outdrafted: "savanna", rate: "volcano"
  };

  /* A record, and only a record: "78-4" where the two halves make 82. Anything else (a sum, a count
     of days, a price, a net) returns null, and then NOTHING in this file prints a season for that
     board. Printing a fake 78-4 over the streak board would be the one outright lie available here. */
  function winsOf(score) {
    var m = /^(\d{1,2})-(\d{1,2})$/.exec(String(score == null ? "" : score).replace(/\s/g, ""));
    if (!m) return null;
    var w = +m[1], l = +m[2];
    return (w + l === 82) ? w : null;
  }

  function boardData(id, recipe) {
    try { return win.LB.data && win.LB.data.board ? win.LB.data.board(id, recipe) : null; }
    catch (e) { return null; }
  }

  /* Where the viewer sits on a board that is NOT the open one.
     The open board is exactly what the youRank slider says, so moving the slider visibly moves the
     navigation. The others are derived from the same slider and a hash, so they are plausible, stable,
     and reproduce from a code. About a quarter of boards come back 0, because "you are not on this
     board" is a state the navigation has to be able to say. Signed out is 0 everywhere, which is true:
     every board in lb.js filters user_id IS NOT NULL. */
  function youOn(recipe, def) {
    if (recipe.signedIn === false || recipe.hasRun === false) return 0;
    var base = clamp(int(recipe.youRank, 0), 0, 400);
    if (base <= 0) return 0;
    if (def.id === recipe.board) return base;
    if (def.card) return 0;                                   /* your card ranks you against nobody */
    if (def.id === "outdrafted") return 0;                    /* the slate says it arrives after launch week */
    var r = frac("you/" + def.id + "/" + int(recipe.seed, 82));
    if (r < 0.26) return 0;
    return Math.max(1, Math.round(base * (0.3 + r * 2.4)));
  }

  function facts(recipe, slate) {
    recipe = recipe || {};
    var list = (slate && slate.list) || [];
    var out = [], i, def, d, rc, lead, sub, wins, leader, j, maxField = 1;

    for (i = 0; i < list.length; i++) {
      def = list[i];
      rc = {};
      for (j in recipe) if (Object.prototype.hasOwnProperty.call(recipe, j)) rc[j] = recipe[j];
      rc.youRank = youOn(recipe, def);
      rc.rows = 3;                        /* all I need is the leader and the field: keep it cheap */
      rc.around = false;                  /* rows[0] is then rank 1, the leader, every time */
      d = boardData(def.id, rc) || { rows: [], field: 0 };

      leader = (d.rows && d.rows.length) ? d.rows[0] : null;
      lead = ""; sub = ""; wins = null;

      if (def.card) {
        /* YOUR CARD has no field and nothing ranked on it. Its headline is your own best line, which
           is the first row data.js puts on the card, and its sub says so in plain words. */
        lead = leader ? String(leader.score) : "";
        sub = lead ? "nothing here is ranked" : "";
        wins = winsOf(lead);
      } else if (d.field <= 0) {
        /* Not open yet, or gated, or empty. No count, no headline, no invented number: the first
           sentence of the board's own empty copy, and a faint impression instead of ink. */
        lead = ""; sub = firstSentence(d.emptyWhy || "");
      } else if (def.ranked === false) {
        /* A membership list. The headline IS the count, and the sub is how recent the newest one is. */
        lead = fmtInt(d.field);
        sub = leader ? "newest " + String(leader.score) : "";
      } else {
        lead = leader ? String(leader.score) : "";
        sub = fmtInt(d.field) + " " + plural(d.field, (def.unit || ["GM", "GMs"])[0], (def.unit || ["GM", "GMs"])[1]);
        wins = winsOf(lead);
      }

      if (d.field > maxField) maxField = d.field;

      out.push({
        def: def, id: def.id, tab: def.tab || def.title || def.id, title: def.title || def.tab || def.id,
        open: def.id === recipe.board,
        live: d.field > 0 || !!def.card,
        card: !!def.card,
        field: d.field, lead: lead, sub: sub, what: WHAT[def.id] || "the leader",
        wins: wins,
        you: rc.youRank, outOf: d.field,
        isNew: def.id === "today",        /* a new Daily board every morning. The only true "new today" */
        join: def.join || "",
        seed: int(recipe.seed, 82)
      });
    }

    /* busy: population on a log scale, because a 41-member Club and a 4,412-GM Daily have to BOTH read
       on one 44px notch. Floored at 0.14 so a small live board still prints some ink: zero ink means
       "not open", and those two states must not look the same. */
    var top = null;
    for (i = 0; i < out.length; i++) {
      out[i].busy = out[i].live && out[i].field > 0
        ? clamp(0.14 + 0.86 * (Math.log(1 + out[i].field) / Math.log(1 + maxField)), 0.14, 1)
        : 0;
      if (out[i].field > 0 && (!top || out[i].field > top.field)) top = out[i];
    }
    /* the hot board: the busiest one. Fire gold, and only one of them, ever. */
    for (i = 0; i < out.length; i++) out[i].hot = !!(top && out[i].id === top.id);

    return { list: out, max: maxField, top: top };
  }

  function firstSentence(s) {
    s = String(s || "");
    var m = /^[^.]*\./.exec(s);
    return m ? m[0] : s;
  }
  function byId(fs, id) {
    var i;
    for (i = 0; i < fs.list.length; i++) if (fs.list[i].id === id) return fs.list[i];
    return fs.list[0] || null;
  }
  /* The one the sheet is open on, allowing for a board that lives BEHIND another (Best net sits under
     your card). A board behind another lights its parent, never nothing. */
  function openOne(fs, recipe) {
    var i, f = null;
    for (i = 0; i < fs.list.length; i++) if (fs.list[i].open) f = fs.list[i];
    if (f) return f;
    for (i = 0; i < fs.list.length; i++) {
      if (fs.list[i].def.pair === recipe.board || fs.list[i].def.id === recipe.board) return fs.list[i];
    }
    return fs.list[0] || null;
  }

  /* ONE MEANING PER COLOUR, and it is the same meaning on every direction in this file.
       you    the viewer is on this board            --t-you
       hot    the busiest board on the slate         --t-hot, fire gold, the hot pick
       win    an ordinary live board                 --t-win / --t-offset / --t-print-pop = #41C6EA,
                                                     the seafoam he said we never use
       light  a board that has not opened yet        --t-light, a faint white impression: nothing claimed
     Red and --t-bad mean BAD and appear nowhere in this file, because a board you are not on is not
     bad news and must never be printed as if it were. */
  function inkOf(f) {
    if (!f.live) return "light";
    if (f.you) return "you";
    if (f.hot) return "hot";
    return "win";
  }
  /* the same four, as a CSS token, for the type and the rules that sit beside the ink */
  function tokenOf(f) {
    var k = inkOf(f);
    return k === "you" ? "var(--t-you)" : k === "hot" ? "var(--t-hot)"
      : k === "win" ? "var(--t-offset)" : "var(--t-text-3)";
  }

  /* How much ink, and how far it reaches. Both knobs are facts, and they are the same two facts in
     every direction, so he can learn them once.
       cov  HOW MUCH INK   = how high up this board you are (not on it: a thin ground impression)
       to   HOW FAR IT GOES = how busy the board is
     So a board where you are 9th of 4,412 is nearly solid ink running almost the full width, and a
     board nobody has opened is a stub. Nobody has to read a number to see either one. */
  function covOf(f) {
    if (!f.live) return 0.1;
    if (!f.you || !f.outOf) return 0.3;
    return clamp(0.42 + 0.55 * (1 - (f.you - 1) / Math.max(1, f.outOf)), 0.42, 0.97);
  }
  function toOf(f) { return f.live ? clamp(0.1 + 0.9 * f.busy, 0.1, 1) : 0.08; }

  /* Your own position along a bar, as a percentage from the left. 1st is the left edge. */
  function youPct(f) {
    if (!f.you || !f.outOf) return -1;
    return clamp(((f.you - 1) / Math.max(1, f.outOf - 1)) * 100, 0, 100);
  }

  /* The sentence under a board's name, chosen so exactly one thing is said and it is true.
     This is product copy: plain words, no guilt, no countdown, no em-dash. */
  function standing(f, short) {
    if (!f.live) return f.sub;                                        /* its own "opens when" words */
    if (f.card) return f.sub;
    if (f.you) return short ? "You " + ordinal(f.you) : "You are " + ordinal(f.you) + " of " + fmtInt(f.outOf);
    if (f.isNew) return short ? "New today" : "New today, and nobody has to qualify";
    return short ? f.sub : (f.join || f.sub);
  }

  /* The art knobs, as plain attributes on the element that wants them. wire() reads them back off the
     DOM, which is why nothing here needs the recipe a second time: the markup describes its own ink. */
  function inkAttrs(f, kind, extra) {
    var a = ' data-art="' + kind + '" data-ink="' + inkOf(f) + '" data-cov="' + round2(covOf(f)) +
      '" data-to="' + round2(toOf(f)) + '" data-busy="' + round2(f.busy) + '" data-seed="' + f.seed +
      '" data-key="' + esc(f.id) + '"';
    if (f.wins != null) a += ' data-wins="' + f.wins + '"';
    return a + (extra || "");
  }

  /* ======================================================================
     THE PAINT PASS. The only place in this file that touches an engine.
     ======================================================================
     nav.js has no paint() hook in the contract, so the ink is laid in wire(), which is the right place:
     wire is documented as "gestures, scroll sync, anything a click attribute cannot express", and a
     halftone lattice is emphatically something a click attribute cannot express. lab.js calls wire on a
     fresh subtree after the box is already in the document, so every element has a box or will get one
     (LB.art retries for 90 frames by itself and gives up silently).

     Every call fails soft: no engines, no canvas, a broken art file, and the navigation is still plain
     markup you can read and tap. That is the rule art.js was built around and this file keeps it. */

  function paintPass(doc, boxSel) {
    var A = art(), nodes, i, el, kind;
    if (!A) return;
    var box = doc.querySelector(boxSel || ".lb-nav");
    if (!box) return;
    nodes = box.querySelectorAll("[data-art]");
    for (i = 0; i < nodes.length; i++) {
      el = nodes[i];
      kind = el.getAttribute("data-art");
      try { paintOne(A, doc, el, kind); } catch (e) { /* art.js already swallows: this is belt and braces */ }
    }
  }

  function paintOne(A, doc, el, kind) {
    var ink = el.getAttribute("data-ink") || "win";
    var cov = clamp01(el.getAttribute("data-cov"));
    var to = clamp01(el.getAttribute("data-to"));
    var busy = clamp01(el.getAttribute("data-busy"));
    var seed = int(el.getAttribute("data-seed"), 82);
    var key = el.getAttribute("data-key") || "";
    var wins = el.hasAttribute("data-wins") ? int(el.getAttribute("data-wins"), null) : null;

    if (kind === "wash") {
      /* THE ONE THAT STOPS IT BEING A SPREADSHEET. Real halftone ink, in the second app colour, whose
         COVERAGE is your standing and whose REACH is the board's population. The ink runs out, and it
         runs out in the same dots the season reel and the results print use. */
      A.wash(doc, el, { ink: ink, cov: cov, to: to, cov2: cov * 0.55, soft: 0.16, seed: seed, alpha: 0.9 });
      return;
    }
    if (kind === "thick") {
      /* THE DICTIONARY NOTCH, printed. A bar whose THICKNESS is the field size, screened into the
         ink's own lattice. This is the edge index's one documented property (the Q notch is thin, the
         S notch is fat) made literal, and it is why the edge rail needs no numbers on it. */
      A.screen(doc, el, function (g, w, h, K) {
        var t = 1.5 + 9 * busy, y = h - t - 7;
        g.fillStyle = K.tone(0.92);
        g.fillRect(5, y, Math.max(6, w - 12), t);
        if (cov > 0.5) { g.fillStyle = K.tone(0.4); g.fillRect(5, y + t + 1.5, Math.max(6, (w - 12) * cov), 1.5); }
      }, { ink: ink, seed: seed, key: "thick|" + key + "|" + round2(busy) + "|" + round2(cov) + "|" + ink });
      return;
    }
    if (kind === "stamp") {
      /* A TICKET'S STAMPS, all three on one plate: the punched hole through your own rank, the rubber
         seal on the board with the most action, and the date stamp on the board that is new today.
         Printed, not drawn: a punch in a riso print has a halftone edge and a starved rim. */
      var pct = num(el.getAttribute("data-youpct"), -1);
      var seal = el.getAttribute("data-seal") === "1";
      var mark = el.getAttribute("data-stampnew") === "1";
      A.screen(doc, el, function (g, w, h, K) {
        var cx, i, r;
        if (pct >= 0) {
          cx = 10 + (w - 20) * (pct / 100);
          g.fillStyle = K.tone(0.95);
          g.beginPath(); g.arc(cx, h - 11, 4.2, 0, 6.2832); g.fill();
          g.fillStyle = K.tone(0.35);
          g.beginPath(); g.arc(cx, h - 11, 7.5, 0, 6.2832); g.fill();
        }
        if (seal) {
          g.fillStyle = K.tone(0.8);
          for (i = 0; i < 2; i++) {
            r = 13 - i * 3.4;
            g.beginPath(); g.arc(w - 18, 17, r, 0, 6.2832);
            g.lineWidth = 2; g.strokeStyle = K.tone(0.8); g.stroke();
          }
        }
        if (mark) {
          g.save();
          g.translate(12, 15); g.rotate(-0.1);
          K.text(g, "NEW", 0, 0, { font: K.font(800, 11, "disp"), align: "left", cov: 0.9 });
          g.restore();
        }
      }, { ink: ink, seed: seed, layer: "over", alpha: 0.85,
           key: "stamp|" + key + "|" + round2(pct) + "|" + (seal ? 1 : 0) + "|" + (mark ? 1 : 0) + "|" + ink });
      return;
    }
    if (kind === "offset") {
      /* THE BIG NUMBER'S SECOND IMPRESSION. The CSS type above this canvas is the key plate: legible,
         selectable, a real token colour, and there whether or not an engine exists. This canvas is the
         SECOND plate, the same numerals printed 3px off register in the other ink, in real dots. That
         is how a two-colour riso print of big type actually looks, and it is the exact thing round one
         tried to fake with a text-shadow. */
      var fs = int(el.getAttribute("data-fs"), 72);
      var str = el.getAttribute("data-str") || "";
      if (!str) return;
      A.screen(doc, el, function (g, w, h, K) {
        K.text(g, str, 3, h * 0.82 + 3, { font: K.font(800, fs, "disp"), align: "left", cov: 0.62 });
      }, { ink: ink === "hot" ? "win" : "hot", seed: seed, alpha: 0.8,
           key: "offset|" + str + "|" + fs + "|" + ink });
      return;
    }
    if (kind === "trim") {
      /* A GANG RUN'S OWN FURNITURE: trim marks at the sheet corners and a registration cross, printed.
         These are not decoration on a press sheet, they are what tells a pressman the sheet is in
         register, and they are what stops a long column of panels reading as a feed. */
      A.screen(doc, el, function (g, w, h, K) {
        var m = 9, L = 13, i, p = [[0, 0, 1, 1], [w, 0, -1, 1], [0, h, 1, -1], [w, h, -1, -1]];
        g.strokeStyle = K.tone(0.85); g.lineWidth = 1;
        for (i = 0; i < 4; i++) {
          g.beginPath();
          g.moveTo(p[i][0] + p[i][2] * m, p[i][1] + p[i][3] * m);
          g.lineTo(p[i][0] + p[i][2] * (m + L), p[i][1] + p[i][3] * m);
          g.moveTo(p[i][0] + p[i][2] * m, p[i][1] + p[i][3] * m);
          g.lineTo(p[i][0] + p[i][2] * m, p[i][1] + p[i][3] * (m + L));
          g.stroke();
        }
        g.beginPath(); g.arc(w / 2, h - 7, 4.5, 0, 6.2832); g.stroke();
        g.beginPath(); g.moveTo(w / 2 - 7, h - 7); g.lineTo(w / 2 + 7, h - 7);
        g.moveTo(w / 2, h - 14); g.lineTo(w / 2, h); g.stroke();
      }, { ink: ink, seed: seed, layer: "over", alpha: 0.6, key: "trim|" + Math.round(busy * 100) + "|" + ink });
      return;
    }
    if (kind === "scene" && wins != null) {
      /* A REAL SEASON BANNER as the head of a board: the leader's record printed in 148px display type
         in two inks off register, their 82 games as the ridge under it, the gauge colouring the picture
         only as far as their win rate, and the board's name as the eyebrow. Four facts, no labels.
         ONLY where the board's headline is a real 82-game record: see winsOf(). */
      A.scene(doc, el.getAttribute("data-scene") || "skyline", el, {
        wins: wins, seed: seed, pal: el.getAttribute("data-pal") || "night",
        context: el.getAttribute("data-context") || "", focus: "top", fit: "cover", alpha: 0.72
      });
      return;
    }
    /* NO strip() ANYWHERE IN THIS FILE, and the reason is a measurement rather than a preference.
       T82RISO.strip returns a MONTH LEDGER, not a bar: measured live on this page it comes back
       119x213 at cssW 60, 119x213 at cssW 96, 136x196 at cssW 150 and 238x111 at cssW 240. The
       flattest shape it has is 111px tall. A navigation element that spends 111px on ONE board's
       season is a results card, not a navigation, and cropping it inside a 46px spine (which is what
       I built first) prints an unreadable slice of somebody else's chart. So the dot sets belong to
       looks.js, on a row that has the room, and they are not driven from here. */
    if (kind === "paper") {
      /* THE REAL STOCK. No fact, and I am not pretending otherwise: it is the right ground, and it is
         what makes a press sheet a press sheet rather than a dark div. */
      var u = A.paper(doc);
      if (u) { el.style.backgroundImage = u; el.style.backgroundSize = "cover"; el.setAttribute("data-stock", "1"); }
    }
  }

  /* ======================================================================
     THE HUB SCROLL. The measured answer to eight boards on a 320px phone.
     ======================================================================
     A navigation that shows every board vertically is taller than the room above the list. So when the
     OPEN BOARD CHANGES, a hub scrolls the sheet so the list starts at the top: the tap lands you on the
     board instead of leaving you looking at the navigation you just used. It does NOT scroll on the
     first open, or on a seed or width change, because nothing moved. LAST is module state, so it
     survives lab.js rebuilding the subtree, and it is keyed by direction so switching direction does
     not fire a phantom scroll. */
  var LAST = {};

  function hubScroll(doc, navId) {
    var box = doc.querySelector('.lb-nav[data-nav-id="' + navId + '"]');
    if (!box || box.getAttribute("data-hub") !== "1") return;
    var open = box.querySelector("[data-open]");
    var id = open ? open.getAttribute("data-board") : "";
    var prev = LAST[navId];
    LAST[navId] = id;
    if (!prev || prev === id || !id) return;
    var sc = doc.querySelector(".rs-scroll"), next = box.nextElementSibling;
    if (!sc || !next) return;
    try {
      var delta = next.getBoundingClientRect().top - sc.getBoundingClientRect().top;
      sc.scrollTop = Math.max(0, sc.scrollTop + delta - 4);
    } catch (e) {}
  }

  /* ======================================================================
     ONE SHARED CSS PREAMBLE. Scoped to the direction, by every css() below.
     ====================================================================== */
  function base(id) {
    var s = 'html[data-nav="' + id + '"] ';
    return [
      /* the box lab.js makes for us: no gaps, no inherited tab layout */
      s + ".lb-nav { width: 100%; margin: 14px 0 12px; }",
      s + ".lb-nav * { box-sizing: border-box; }",
      /* the engines' canvases are never a tap target and never scroll content */
      s + ".lb-nav canvas { pointer-events: none; }",
      /* the second control row boards.js still emits for the two boards that have scopes sits UNDER
         this navigation, and it should read as part of the board rather than part of the navigation */
      s + ".lb-nav + .lb-seg, " + s + ".lb-seg { margin: 0 0 10px; }"
    ].join("\n");
  }

  /* ======================================================================
     THE DIRECTIONS
     ====================================================================== */

  var LIST = [];

  /* ----------------------------------------------------------------------
     0. PILLS, the control arm.
     ---------------------------------------------------------------------- */
  LIST.push({
    id: "pills",
    name: "Pills (what shipped)",
    note: "The row of pills he dislikes, kept so the others have something to sit next to. It shows five of the eight boards and tells you nothing about any of them except which one is lit.",
    /* "" leaves boards.js's own .lb-tabs row alone, which is exactly the fallback lab.js documents.
       This is not a stub: it is how "Compare with today" still means something. */
    html: function () { return ""; },
    css: function () { return ""; }
  });

  /* ----------------------------------------------------------------------
     1. THE RACK. A crate of records, flipped on edge.
     ----------------------------------------------------------------------
     No horizontal row of controls anywhere. Every board is a printed spine, and the spines are
     DELIBERATELY UNEVEN: a spine's height is its field size. The open spine is pulled out of the stack
     and a 2px thread in its own ink runs from it down the left margin of the list, so the list you are
     looking at is visibly hanging off the spine you pulled. */
  LIST.push({
    id: "rack",
    name: "The record crate",
    note: "Printed spines, like flipping a crate of records. A spine's height is how busy that board is and its ink runs as far as its population, so the stack is deliberately uneven. The one you pulled out sits on its own at the foot of the crate with a thread running down into the list, so the list is visibly hanging off the spine you pulled. All eight boards are on the stack and it costs about 240px, so a board still shows under it.",
    html: function (recipe, slate) {
      var fs = facts(recipe, slate), open = openOne(fs, recipe), i, f, closed = [];
      for (i = 0; i < fs.list.length; i++) { f = fs.list[i]; if (f !== open) closed.push(f); }

      /* A SPINE. Height is the field size, so a 4,412-GM Daily is a fat slat and the 41-member Club is
         a thin one, and you can see which boards are busy before you touch anything. */
      function spine(f, wide) {
        var h = wide ? 66 : (44 + Math.round(13 * f.busy));
        var yp = youPct(f);
        var a = ' data-board="' + esc(f.id) + '" style="--h:' + h + 'px"' +
          (wide ? ' data-open="1" aria-current="true"' : "") +
          ' aria-label="' + esc(f.title + ". " + standing(f, false)) + '"' +
          inkAttrs(f, "wash");
        return tagOpen("nv-spine" + (wide ? " is-out" : ""), a) +
          '<span class="nv-rk-name">' + esc(f.tab) + "</span>" +
          '<span class="nv-rk-mid">' +
            (f.lead ? '<span class="nv-rk-num">' + esc(f.lead) + "</span>" : "") +
            '<span class="nv-rk-what">' + esc(f.lead ? f.what : standing(f, true)) + "</span>" +
          "</span>" +
          (f.isNew ? '<span class="nv-rk-new">New</span>' : "") +
          (yp >= 0 ? '<span class="nv-rk-pip" style="left:' + round2(yp) + '%"></span>' : "") +
          "</button>";
      }

      /* THE CRATE IS TWO DEEP, and that is a measurement, not a style. Eight 44px spines in one column
         is 352px minimum, measured at 484px once the ink and the numbers were in, which put the first
         rank below the fold on a 320px phone. Two deep is 240px and the crate still reads. */
      return '<div class="nv-rack" style="--thread:' + tokenOf(open || fs.list[0]) + '">' +
        '<div class="nv-crate">' + closed.map(function (f) { return spine(f, false); }).join("") + "</div>" +
        spine(open, true) +
        "</div>";
    },
    css: function (recipe) {
      var id = "rack", s = 'html[data-nav="' + id + '"] ';
      return base(id) + "\n" + [
        s + ".nv-rack { display: flex; flex-direction: column; gap: 4px; }",
        s + ".nv-crate { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr);" +
          " gap: 3px; align-items: end; }",
        /* a spine: paper-dark stock, a knocked-out name, its number on the right, and the .hm-ht dot
           shadow idea reduced to a 1px halftone edge on the left so the stack reads as printed card */
        s + ".nv-spine { position: relative; display: flex; align-items: center; gap: 8px;" +
          " height: var(--h, 48px); min-height: 44px; width: 100%; padding: 0 10px 0 12px; overflow: hidden;" +
          " border: 0; border-left: 3px solid var(--t-rule); border-radius: 3px;" +
          " background: var(--t-ground-2); color: var(--t-text); text-align: left; cursor: pointer;" +
          " font: inherit; -webkit-tap-highlight-color: transparent; }",
        s + ".nv-spine:active { transform: translateX(2px); }",
        s + ".nv-rk-name { flex: 0 0 auto; max-width: 54%; font: 700 14px/1 var(--t-disp);" +
          " letter-spacing: .05em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
        s + ".nv-rk-mid { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }",
        s + ".nv-rk-num { font: 700 13px/1 var(--t-mono); }",
        s + ".nv-rk-what { font: 500 9.5px/1.1 var(--t-body); color: var(--t-text-2); text-align: right; }",
        s + ".nv-rk-new { position: absolute; left: 11px; bottom: 3px; height: 13px; padding: 0 4px;" +
          " border-radius: 3px; background: var(--t-offset); color: var(--t-ground); z-index: 1;" +
          " font: 700 9.5px/13px var(--t-disp); letter-spacing: .06em; text-transform: uppercase; }",
        /* the punch hole: your own place along the length of the spine. 1st is the left edge. */
        s + ".nv-rk-pip { position: absolute; bottom: 4px; width: 7px; height: 7px; margin-left: -3px;" +
          " border-radius: 50%; background: var(--t-you); box-shadow: 0 0 0 2px var(--t-ground-2); z-index: 1; }",
        /* the one you pulled out of the crate: full width, on its own, right above its list */
        s + ".nv-spine.is-out { border-left-color: var(--thread); border-left-width: 4px;" +
          " background: var(--t-ground-3); }",
        s + ".nv-spine.is-out .nv-rk-name { font-size: 20px; max-width: 58%; color: var(--thread); }",
        s + ".nv-spine.is-out .nv-rk-num { font-size: 22px; }",
        s + ".nv-spine.is-out .nv-rk-what { font-size: 11px; }",
        /* THE THREAD: the list is visibly hanging off the spine you pulled out. box-sizing matters:
           a width:100% .lb-list with 12px of border and padding added would push 12px past the
           scroller and give the sheet a horizontal scrollbar nobody asked for. Measured at 318/316. */
        s + ".lb-nav { margin-bottom: 0; }",
        s + ".lb-list { box-sizing: border-box; border-left: 2px solid var(--thread); padding-left: 10px; }",
        s + ".lb-crowd, " + s + ".lb-nav + .lb-seg { padding-left: 12px; }",
        /* the rows stay rows here on purpose: the rack is the navigation, not the look */
        s + ".lb-row { min-height: 34px; }"
      ].join("\n");
    },
    wire: function (doc) { paintPass(doc); }
  });

  /* ----------------------------------------------------------------------
     2. THE CONCOURSE OF DOORS. The home screen's own front door, reused.
     ----------------------------------------------------------------------
     The one direction that cannot be accused of missing the design language, because it is not LIKE
     the home screen, it IS the home screen's markup: .hm-ht's halftone offset shadow, .hm-mode's neon
     tube door, .hm-t / .hm-s, .hm-badge, and the 3px press that sinks a door into its own dots.

     These are the only buttons in this file WITHOUT tm-flat, deliberately: look.css's neon keycap
     treatment is what makes a home door a home door, and excluding it would make these doors look
     less like the home than the home does.

     THE CHANNEL THAT MATTERS, and it is one variable: .hm-ht::before prints a block of dots down and
     right of its door at a 4px pitch. look.css never touches that pseudo element, so its --dot ink and
     its pitch are mine. Pitch tightens from 8px (sparse: the 41-member Club) to 3px (dense: a 4,412-GM
     Daily), so the TEXTURE of a door's shadow is how busy that board is. */
  LIST.push({
    id: "doors",
    name: "The concourse",
    note: "The home screen's own doors, one per board. The halftone shadow behind each door carries two facts: its ink is what the board is to you, and how tight its dots are is how busy the board is. The open board is the hero door and prints the leader's real season inside it where there is a season to print. It is a hub: the doors cost about 290px, so you see roughly five rows without scrolling, and a tap scrolls you to the board.",
    html: function (recipe, slate) {
      var fs = facts(recipe, slate), open = openOne(fs, recipe), i, out = "", f;

      function door(f, kind) {
        /* dot pitch IS the population. 8px sparse to 3px dense, on a log-scaled busy. */
        var pitch = round2(8 - 5 * f.busy);
        var a = ' data-board="' + esc(f.id) + '"' + (f.open ? ' data-open="1" aria-current="true"' : "") +
          ' aria-label="' + esc(f.title + ". " + standing(f, false)) + '"';
        var wrap = '<div class="hm-ht nv-door nv-' + kind + '" style="--dot: ' + tokenOf(f) +
          "; --d: " + pitch + "px; --ink: " + tokenOf(f) + '">';
        var art = (kind === "hero" && f.wins != null)
          ? '<span class="nv-dr-art"' + inkAttrs(f, "scene",
              ' data-scene="' + esc(SCENE[f.id] || "skyline") + '" data-context="' +
              esc(String(f.title).toUpperCase()) + '" data-pal="night"') + "></span>"
          : (kind !== "hero" ? '<span class="nv-dr-wash"' + inkAttrs(f, "wash") + "></span>" : "");
        var body = kind === "hero"
          ? (f.isNew ? '<span class="hm-badge">New today</span>' : "") +
            '<span class="hm-t nv-dr-t">' + esc(f.tab) + "</span>" +
            (f.lead ? '<span class="nv-dr-big">' + esc(f.lead) + "</span>" : "") +
            '<span class="hm-s nv-dr-s">' + esc(f.lead ? f.what + ", " + standing(f, false) : standing(f, false)) + "</span>"
          : '<span class="hm-t nv-dr-t">' + esc(f.tab) + "</span>" +
            '<span class="nv-dr-mid">' + esc(f.lead || "soon") + "</span>" +
            /* ONE extra line on a plate, and only when there is something to say. Three lines on
               every plate measured 70px a plate, which is 300px of doors before the hero. */
            (f.you || f.isNew
              ? '<span class="hm-s nv-dr-s">' + esc(f.you ? "You " + ordinal(f.you) : "New today") + "</span>"
              : "");
        return wrap + '<button class="hm-mode" type="button"' + a + ">" + art + body + "</button></div>";
      }

      out += door(open, "hero");
      var rest = [];
      for (i = 0; i < fs.list.length; i++) { f = fs.list[i]; if (f !== open) rest.push(f); }
      out += '<div class="nv-plates">' + rest.map(function (f) { return door(f, "plate"); }).join("") + "</div>";
      return '<div class="nv-concourse" data-hub="1">' + out + "</div>";
    },
    css: function (recipe) {
      var id = "doors", s = 'html[data-nav="' + id + '"] ';
      return base(id) + "\n" + [
        s + ".nv-concourse { display: flex; flex-direction: column; gap: 8px; }",
        /* the dot pitch channel. .hm-ht::before is the home's own halftone shadow; look.css never
           reaches a pseudo element, so this is the one channel a neon keycap cannot steal. */
        s + ".nv-door.hm-ht { --off: 5px; --r: 14px; }",
        s + ".nv-door.hm-ht::before { background-size: var(--d, 4px) var(--d, 4px); }",
        s + ".nv-door .hm-mode { position: relative; overflow: hidden; gap: 1px; padding: 5px 8px; }",
        s + ".nv-hero .hm-mode { min-height: 72px; justify-content: center; }",
        s + ".nv-plate .hm-mode { min-height: 46px; justify-content: center; align-items: flex-start; text-align: left; }",
        s + ".nv-plates { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 7px; }",
        s + ".nv-plate { display: flex; }",
        s + ".nv-plate .hm-mode { flex: 1; }",
        /* the type keeps the board's own ink even when look.css paints the tube: .hm-t and .hm-s are
           children, and nothing in look.css styles a child of a keycap. */
        s + ".nv-dr-t { font-size: 12.5px; line-height: 1; letter-spacing: .05em; color: var(--ink); }",
        s + ".nv-hero .nv-dr-t { font-size: 18px; }",
        s + ".nv-dr-big { font: 700 24px/1 var(--t-mono); color: var(--t-text); }",
        s + ".nv-dr-mid { font: 700 14px/1.05 var(--t-mono); color: var(--t-text); }",
        s + ".nv-dr-s { font-size: 9.5px; line-height: 1.15; color: var(--t-text-2); }",
        s + ".nv-hero .nv-dr-s { font-size: 11.5px; }",
        s + ".nv-door .hm-badge { align-self: center; margin: 0 0 2px; height: 15px;" +
          " font: 700 10px/15px var(--t-disp); letter-spacing: .07em; }",
        /* THE TWO ART LAYERS, and the :not() is load bearing. The first version of this rule set
           every direct span of a door to position:relative so the type would sit above the art, and
           that rule (0,2,1) beat .nv-dr-art (0,1,0): measured live as "position: relative, 0x0", zero
           canvases on the whole concourse, and a silent failure, because an element with no box never
           gets a canvas from LB.art. The type is lifted by everything EXCEPT the two art layers. */
        s + ".nv-door .hm-mode > span:not(.nv-dr-art):not(.nv-dr-wash) { position: relative; z-index: 1; }",
        s + ".nv-door .hm-mode > .nv-dr-art, " + s + ".nv-door .hm-mode > .nv-dr-wash {" +
          " position: absolute; left: 0; top: 0; right: 0; bottom: 0; z-index: 0; }",
        /* a hub, so the list wants a clean start under it */
        s + ".lb-crowd { margin-top: 2px; }"
      ].join("\n");
    },
    wire: function (doc) { paintPass(doc); hubScroll(doc, "doors"); }
  });

  /* ----------------------------------------------------------------------
     3. THE DEPARTURES BOARD. Solari di Udine, 1956.
     ----------------------------------------------------------------------
     No horizontal row of controls. Eight rows, but not table rows: no two are the same height and no
     two numbers are the same size, because the SIZE is the fact. The flip is not nostalgia, it is the
     mechanism that tells you a number changed, which is the one thing a pill row structurally cannot
     do. Off under prefers-reduced-motion.

     The colour correction that matters: every scoreboard precedent, Augusta included, puts the good
     number in RED. In this game red and --t-bad mean BAD. The standout number here is fire gold. */
  LIST.push({
    id: "departures",
    name: "The departures board",
    note: "A station board. Row height and numeral size say how busy each board is, the status column on the right says whether you are on it, and the numbers flip in so a change announces itself. Nothing is hidden: all eight are listed. The flip is off if the phone asks for less motion. It is a hub, about 380px, so a tap scrolls you to the board.",
    html: function (recipe, slate) {
      var fs = facts(recipe, slate);
      var rows = fs.list.map(function (f, i) {
        var h = f.open ? 54 : (44 + Math.round(8 * f.busy));
        var size = 15 + Math.round(11 * f.busy) + (f.open ? 3 : 0);
        var flaps = String(f.lead || "").split("").map(function (ch, j) {
          return '<span class="nv-flap" style="--i:' + j + '">' + esc(ch === " " ? " " : ch) + "</span>";
        }).join("");
        var a = ' data-board="' + esc(f.id) + '" style="--h:' + h + "px; --fs:" + size + "px; --row:" + i + '"' +
          (f.open ? ' data-open="1" aria-current="true"' : "") +
          ' aria-label="' + esc(f.title + ". " + (f.lead ? f.lead + " " + f.what + ". " : "") + standing(f, false)) + '"' +
          inkAttrs(f, "wash");
        return tagOpen("nv-dep-row", a) +
          '<span class="nv-dep-name">' + esc(f.tab) + "</span>" +
          '<span class="nv-dep-num">' + (flaps || '<span class="nv-dep-none">not open yet</span>') + "</span>" +
          '<span class="nv-dep-stat">' + esc(statusOf(f)) + "</span>" +
          "</button>";
      }).join("");
      /* No header row: two words of column label cost 18px on a board that is already at its floor. */
      return '<div class="nv-dep" data-hub="1">' + rows + "</div>";

      function statusOf(f) {
        if (!f.live) return "soon";
        if (f.you) return "you " + ordinal(f.you);
        if (f.isNew) return "new today";
        if (f.hot) return fmtInt(f.field) + " gms";
        return "open";
      }
    },
    css: function (recipe) {
      var id = "departures", s = 'html[data-nav="' + id + '"] ';
      return base(id) + "\n" + [
        /* near-black stock, crisp light and aqua type: Solari's own legibility recipe */
        s + ".nv-dep { border-radius: 6px; overflow: hidden; background: var(--t-shadow);" +
          " box-shadow: inset 0 0 0 1px var(--t-rule); }",
        s + ".nv-dep-head { display: flex; justify-content: space-between; padding: 6px 10px 4px;" +
          " font: 700 10px/1 var(--t-disp); letter-spacing: .14em; text-transform: uppercase; color: var(--t-text-3); }",
        s + ".nv-dep-row { position: relative; display: flex; align-items: center; gap: 8px; width: 100%;" +
          " height: var(--h, 48px); min-height: 44px; padding: 0 10px; overflow: hidden;" +
          " border: 0; border-top: 1px solid rgb(var(--t-rule-rgb) / .55); background: none;" +
          " color: var(--t-light); font: inherit; text-align: left; cursor: pointer;" +
          " -webkit-tap-highlight-color: transparent; }",
        s + ".nv-dep-name { flex: 0 0 34%; font: 700 14px/1 var(--t-disp); letter-spacing: .08em;" +
          " text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
        s + ".nv-dep-num { flex: 1 1 auto; min-width: 0; display: flex; justify-content: center;" +
          " font: 800 var(--fs, 22px)/1 var(--t-disp); letter-spacing: .02em; color: var(--t-text); }",
        s + ".nv-dep-none { font: 500 11px/1 var(--t-body); letter-spacing: 0; color: var(--t-text-3); }",
        s + ".nv-dep-stat { flex: 0 0 auto; max-width: 30%; text-align: right;" +
          " font: 700 10.5px/1.1 var(--t-disp); letter-spacing: .1em; text-transform: uppercase;" +
          " color: var(--t-offset); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
        /* one meaning per colour, in the status column too */
        s + ".nv-dep-row[data-ink=\"you\"] .nv-dep-stat { color: var(--t-you); }",
        s + ".nv-dep-row[data-ink=\"hot\"] .nv-dep-num { color: var(--t-hot); }",
        s + ".nv-dep-row[data-ink=\"light\"] .nv-dep-stat { color: var(--t-text-3); }",
        s + ".nv-dep-row[data-open] { background: rgb(var(--t-light-rgb) / .05); }",
        s + ".nv-dep-row[data-open] .nv-dep-name { color: var(--t-light); }",
        /* THE SPLIT FLAP. One keyframe, 30ms a column, the half-card rotation Solari's wheels make. */
        "@keyframes nv-dep-flip { from { transform: rotateX(-88deg); opacity: 0; } to { transform: none; opacity: 1; } }",
        s + ".nv-flap { display: inline-block; transform-origin: 50% 100%;" +
          " animation: nv-dep-flip .22s cubic-bezier(.3,.8,.2,1) both;" +
          " animation-delay: calc(var(--i, 0) * 30ms + var(--row, 0) * 24ms); }",
        "@media (prefers-reduced-motion: reduce) { " + s + ".nv-flap { animation: none; } }",
        s + ".nv-dep-row:active { filter: brightness(1.3); }"
      ].join("\n");
    },
    wire: function (doc) { paintPass(doc); hubScroll(doc, "departures"); }
  });

  /* ----------------------------------------------------------------------
     4. THE GANG RUN. Tufte, and the printer's own word for it.
     ----------------------------------------------------------------------
     No navigation controls of any kind, and NOTHING HIDDEN: every board is a panel printed on one
     sheet, so there is no selected state to notice or lose and the measured hidden-navigation penalty
     is zero. "Small multiples reveal, all at once, a scope of alternatives, a range of options."

     The relative SIZE of each panel is the information, which is the judgement a row of identical
     pills refuses to make. The sheet carries the real riso stock, and the trim marks and registration
     cross are printed in real ink, because they are what stops a column of panels reading as a feed. */
  LIST.push({
    id: "sheet",
    name: "The whole press sheet",
    note: "All eight boards printed at once on one press sheet, with trim marks and a registration cross. No controls and nothing hidden: panel size is the information, so the sheet itself says which boards matter. On the real paper stock, so the type is paper ink. The sheet is about 340px, so it is a hub and a tap scrolls you to the board.",
    html: function (recipe, slate) {
      var fs = facts(recipe, slate), open = openOne(fs, recipe);
      var panels = fs.list.map(function (f, i) {
        var tall = f.open ? 82 : (44 + Math.round(24 * f.busy));
        var a = ' data-board="' + esc(f.id) + '" style="--t:' + tall + "px; --ink:" + tokenOf(f) + '"' +
          (f.open ? ' data-open="1" aria-current="true"' : "") +
          ' aria-label="' + esc(f.title + ". " + standing(f, false)) + '"' +
          inkAttrs(f, "wash");
        return tagOpen("nv-plate" + (f.open ? " is-open" : ""), a) +
          '<span class="nv-gr-no">PL ' + (i + 1) + "</span>" +
          '<span class="nv-gr-name">' + esc(f.tab) + "</span>" +
          (f.lead ? '<span class="nv-gr-num">' + esc(f.lead) + "</span>" : "") +
          '<span class="nv-gr-what">' + esc(f.lead ? f.what : standing(f, true)) + "</span>" +
          (f.you ? '<span class="nv-gr-you">You ' + esc(ordinal(f.you)) + "</span>" : "") +
          (f.isNew ? '<span class="nv-gr-new">New today</span>' : "") +
          "</button>";
      }).join("");
      return '<div class="nv-sheet" data-hub="1"' + inkAttrs(open || fs.list[0], "paper") + ">" +
        '<span class="nv-gr-marks"' + inkAttrs(open || fs.list[0], "trim") + "></span>" +
        '<div class="nv-gr-grid">' + panels + "</div>" +
        '<p class="nv-gr-foot">One sheet, eight jobs. Tap a job to read it.</p>' +
        "</div>";
    },
    css: function (recipe) {
      var id = "sheet", s = 'html[data-nav="' + id + '"] ';
      return base(id) + "\n" + [
        /* real stock under everything, so the type has to be paper ink, not screen ink */
        s + ".nv-sheet { position: relative; padding: 14px 11px 6px; border-radius: 4px;" +
          " background: var(--t-paper); color: var(--t-ink); }",
        s + ".nv-gr-marks { position: absolute; inset: 0; z-index: 2; }",
        s + ".nv-gr-grid { position: relative; z-index: 1; display: grid;" +
          " grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 6px; }",
        s + ".nv-plate { position: relative; display: flex; flex-direction: column; align-items: flex-start;" +
          " gap: 1px; min-height: 46px; height: var(--t, 56px); padding: 6px 8px; overflow: hidden;" +
          " border: 1px solid rgb(var(--t-ink-rgb) / .22); border-radius: 2px;" +
          " background: rgb(var(--t-paper-2-rgb) / .55); color: var(--t-ink);" +
          " font: inherit; text-align: left; cursor: pointer; -webkit-tap-highlight-color: transparent; }",
        s + ".nv-plate.is-open { grid-column: 1 / -1; border-width: 2px; border-color: var(--ink);" +
          " background: var(--t-paper); }",
        s + ".nv-plate:active { transform: translate(1px, 1px); }",
        s + ".nv-gr-no { position: absolute; right: 5px; top: 4px; font: 700 8.5px/1 var(--t-mono);" +
          " letter-spacing: .1em; color: rgb(var(--t-ink-rgb) / .4); }",
        s + ".nv-gr-name { font: 700 13px/1 var(--t-disp); letter-spacing: .07em; text-transform: uppercase;" +
          " color: var(--t-ink); max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
        s + ".nv-plate.is-open .nv-gr-name { font-size: 20px; }",
        s + ".nv-gr-num { font: 700 17px/1.05 var(--t-mono); color: var(--t-ink); }",
        s + ".nv-plate.is-open .nv-gr-num { font-size: 32px; }",
        s + ".nv-gr-what { font: 500 10.5px/1.15 var(--t-body); color: var(--t-ink-2); }",
        s + ".nv-gr-you { margin-top: 2px; font: 700 10px/1 var(--t-disp); letter-spacing: .09em;" +
          " text-transform: uppercase; color: var(--t-you); }",
        s + ".nv-gr-new { position: absolute; left: 8px; bottom: 5px; padding: 1px 5px; border-radius: 3px;" +
          " background: var(--t-offset); color: var(--t-ground);" +
          " font: 700 9.5px/1.5 var(--t-disp); letter-spacing: .08em; text-transform: uppercase; }",
        s + ".nv-gr-foot { position: relative; z-index: 1; margin: 8px 0 0;" +
          " font: 500 10.5px/1.2 var(--t-body); color: var(--t-ink-2); text-align: center; }"
      ].join("\n");
    },
    wire: function (doc) { paintPass(doc); hubScroll(doc, "sheet"); }
  });

  /* ----------------------------------------------------------------------
     5. THE EDGE INDEX. The thumb index of a dictionary, patented 1874.
     ----------------------------------------------------------------------
     No horizontal row of controls, and THE ONLY DIRECTION HERE THAT COSTS NO VERTICAL ROOM AT ALL: the
     notches live in the right gutter of the sheet, pinned to its BOTTOM, which is where a thumb
     actually reaches on a phone held one handed. The list keeps the whole sheet.

     Why this is the best precedent I found: a dictionary's notches "can be identified by their
     thickness", so a reader finds S without reading S. Each notch's printed bar is thick in proportion
     to the field size, screened into that board's ink. The navigation has a thickness.

     wire() MOVES the box out of .rs-scroll and pins it to the sheet, because a rail that scrolls away
     is not an edge. lab.js rebuilds the box every render, so the move cannot accumulate. */
  LIST.push({
    id: "edge",
    name: "The edge index",
    note: "Thumb notches cut into the right edge of the sheet, pinned low where a thumb reaches. Each notch's printed bar is thick in proportion to how busy that board is, the way a dictionary's S notch is fatter than its Q. The only direction that costs the list no vertical room. It spends 44px of the 320px width, so long board names lose room, and the short stamps have to be tested on his phone before anything is polished.",
    html: function (recipe, slate) {
      var fs = facts(recipe, slate);
      var notches = fs.list.map(function (f) {
        var st = String(STAMP[f.id] || f.tab).split("\n").map(function (w) {
          return '<span class="nv-ed-w">' + esc(w) + "</span>";
        }).join("");
        var a = ' data-board="' + esc(f.id) + '"' + (f.open ? ' data-open="1" aria-current="true"' : "") +
          ' aria-label="' + esc(f.title + ". " + standing(f, false)) + '"' + inkAttrs(f, "thick");
        return tagOpen("nv-notch", a) +
          '<span class="nv-ed-st">' + st + "</span>" +
          (f.you ? '<span class="nv-ed-pip"></span>' : "") +
          (f.isNew ? '<span class="nv-ed-tick"></span>' : "") +
          (f.open ? '<span class="nv-ed-full">' + esc(f.title) + "</span>" : "") +
          "</button>";
      }).join("");
      return '<nav class="nv-edge" aria-label="Boards">' + notches + "</nav>";
    },
    css: function (recipe) {
      var id = "edge", s = 'html[data-nav="' + id + '"] ';
      var W = 44;
      return base(id) + "\n" + [
        /* the box becomes furniture of the SHEET, not of the scroller */
        s + ".rules-sheet { position: relative; }",
        s + ".lb-nav { position: absolute; right: 0; bottom: 0; z-index: 4; width: " + W + "px; margin: 0; }",
        s + ".rs-scroll { padding-right: " + (W + 6) + "px; }",
        s + ".nv-edge { display: flex; flex-direction: column; gap: 2px; padding: 0 0 8px; }",
        /* a notch: cut into the block, its stamp upright so it is readable, its printed bar below */
        s + ".nv-notch { position: relative; display: flex; flex-direction: column; align-items: center;" +
          " justify-content: flex-start; width: 100%; height: 44px; padding: 5px 2px 0; overflow: visible;" +
          " border: 0; border-radius: 3px 0 0 3px; background: var(--t-ground-3); color: var(--t-text-2);" +
          " font: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; }",
        s + ".nv-ed-st { display: flex; flex-direction: column; align-items: center; gap: 0; }",
        s + ".nv-ed-w { font: 700 10px/1.05 var(--t-disp); letter-spacing: .04em; text-transform: uppercase; }",
        /* the open notch is cut deeper and pulls out of the edge, showing its whole name */
        s + ".nv-notch[data-open] { background: var(--t-ground); color: var(--t-text);" +
          " transform: translateX(-9px); width: calc(100% + 9px);" +
          " box-shadow: -1px 0 0 0 var(--t-rule), 0 1px 0 0 var(--t-rule), 0 -1px 0 0 var(--t-rule); }",
        s + ".nv-notch[data-open] .nv-ed-w { font-size: 11px; }",
        s + ".nv-ed-full { position: absolute; right: 100%; top: 50%; transform: translateY(-50%);" +
          " margin-right: 6px; padding: 2px 6px; border-radius: 4px 0 0 4px;" +
          " background: var(--t-ground); color: var(--t-text);" +
          " font: 700 11px/1.4 var(--t-disp); letter-spacing: .07em; text-transform: uppercase;" +
          " white-space: nowrap; pointer-events: none; }",
        /* you, and new today, as two marks on the edge rather than two words */
        s + ".nv-ed-pip { position: absolute; left: 4px; top: 6px; width: 6px; height: 6px;" +
          " border-radius: 50%; background: var(--t-you); }",
        s + ".nv-ed-tick { position: absolute; right: 3px; top: 5px; width: 8px; height: 2px;" +
          " background: var(--t-offset); }",
        s + ".nv-notch:active { background: var(--t-ground-2); }",
        /* the list and everything else in the block clears the gutter */
        s + ".lb-row { padding-right: 2px; }"
      ].join("\n");
    },
    /* THE MOVE: out of the scroller and onto the sheet, so the edge is an edge. */
    wire: function (doc) {
      var box = doc.querySelector('.lb-nav[data-nav-id="edge"]');
      var sheet = doc.querySelector(".rules-sheet");
      if (box && sheet && box.parentNode !== sheet) {
        try { sheet.appendChild(box); } catch (e) {}
      }
      paintPass(doc);
    }
  });

  /* ----------------------------------------------------------------------
     6. THE BIG NUMBER. A tote board: magnitude as the whole design.
     ----------------------------------------------------------------------
     No horizontal row of controls. One hand-hung number, and seven small ones. Scale alone says where
     you are, so the selected state is not a highlight anybody has to notice, and because size is the
     most robust channel on a phone it survives sunlight, colour blindness and a cracked screen.

     The art here is the number itself. The CSS type is the KEY PLATE: legible, a real token colour,
     selectable, and there whether or not an engine loaded. The canvas under it is the SECOND PLATE,
     the same numerals printed 3px off register in the other ink, in real halftone dots with the grain
     and the starvation. That is how a two-colour riso print of big type actually looks, and it is the
     exact thing round one tried to fake with a text-shadow and measured as backgroundImage: none. */
  LIST.push({
    id: "bignumber",
    name: "The big number",
    note: "One hand-hung number for the board you are on, printed in two inks off register, and the other seven as small numbers under it. You learn whether a board is worth opening from its number, not its name. Scale is the only selected state. Each small number carries its own ink: fire gold is the busiest board, --t-you is one you are on, aqua is everything else.",
    html: function (recipe, slate) {
      var fs = facts(recipe, slate), open = openOne(fs, recipe), i, f, rest = [];
      var str = open && open.lead ? open.lead : "";
      /* the numeral shrinks with its own length, so "4,412" and "78-4" both fit 292px at 320px */
      var fsz = str.length <= 4 ? 64 : str.length <= 5 ? 54 : str.length <= 7 ? 42 : 34;
      for (i = 0; i < fs.list.length; i++) { f = fs.list[i]; if (f !== open) rest.push(f); }

      var head = '<div class="nv-bn-head">' +
        '<span class="nv-bn-eye">' + esc(String(open.title).toUpperCase()) + "</span>" +
        (str
          ? '<span class="nv-bn-num" style="--fs:' + fsz + 'px; --ink:' + tokenOf(open) + '"' +
            inkAttrs(open, "offset", ' data-fs="' + fsz + '" data-str="' + esc(str) + '"') + ">" +
            esc(str) + "</span>"
          : '<span class="nv-bn-soon">' + esc(open.sub || "not open yet") + "</span>") +
        '<span class="nv-bn-cap">' + esc(str ? open.what : "") + "</span>" +
        '<span class="nv-bn-you">' + esc(standing(open, false)) + "</span>" +
        "</div>";

      var small = rest.map(function (f) {
        var a = ' data-board="' + esc(f.id) + '" style="--ink:' + tokenOf(f) + '"' +
          ' aria-label="' + esc(f.title + ". " + standing(f, false)) + '"' + inkAttrs(f, "wash");
        return tagOpen("nv-bn-s", a) +
          '<span class="nv-bn-sn">' + esc(f.lead || "soon") + "</span>" +
          '<span class="nv-bn-st">' + esc(f.tab) + "</span>" +
          (f.isNew ? '<span class="nv-bn-dot"></span>' : "") +
          "</button>";
      }).join("");

      return '<div class="nv-bignum" data-hub="1">' +
        '<span class="nv-bn-open" data-board="' + esc(open.id) + '" data-open="1" hidden></span>' +
        head + '<div class="nv-bn-grid">' + small + "</div></div>";
    },
    css: function (recipe) {
      var id = "bignumber", s = 'html[data-nav="' + id + '"] ';
      return base(id) + "\n" + [
        s + ".nv-bignum { display: flex; flex-direction: column; gap: 8px; }",
        s + ".nv-bn-head { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; }",
        s + ".nv-bn-eye { font: 700 10.5px/1 var(--t-disp); letter-spacing: .16em;" +
          " text-transform: uppercase; color: var(--t-text-3); }",
        /* the key plate. position:relative so art.js can hang the second plate behind it. */
        s + ".nv-bn-num { position: relative; display: block; margin: 2px 0 0;" +
          " font: 800 var(--fs, 72px)/.88 var(--t-disp); letter-spacing: -.01em; color: var(--ink); }",
        s + ".nv-bn-soon { font: 500 13px/1.3 var(--t-body); color: var(--t-text-2); }",
        s + ".nv-bn-cap { margin-top: 3px; font: 500 13px/1.2 var(--t-body); color: var(--t-text-2); }",
        s + ".nv-bn-you { font: 700 11px/1.3 var(--t-disp); letter-spacing: .1em;" +
          " text-transform: uppercase; color: var(--t-offset); }",
        s + ".nv-bn-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 5px; }",
        s + ".nv-bn-s { position: relative; display: flex; flex-direction: column; align-items: flex-start;" +
          " gap: 0; min-height: 44px; padding: 4px 5px; overflow: hidden;" +
          " border: 0; border-top: 2px solid var(--ink); border-radius: 0;" +
          " background: var(--t-ground-2); color: var(--t-text); font: inherit; text-align: left;" +
          " cursor: pointer; -webkit-tap-highlight-color: transparent; }",
        s + ".nv-bn-s:active { transform: translateY(1px); }",
        s + ".nv-bn-sn { font: 700 15px/1 var(--t-disp); letter-spacing: 0; color: var(--ink); white-space: nowrap; }",
        s + ".nv-bn-st { font: 700 9px/1.2 var(--t-disp); letter-spacing: .05em;" +
          " text-transform: uppercase; color: var(--t-text-2); max-width: 100%;" +
          " white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
        s + ".nv-bn-dot { position: absolute; right: 6px; top: 6px; width: 6px; height: 6px;" +
          " border-radius: 50%; background: var(--t-offset); }"
      ].join("\n");
    },
    wire: function (doc) { paintPass(doc); hubScroll(doc, "bignumber"); }
  });

  /* ----------------------------------------------------------------------
     7. THE TICKET WALL. The game's own object, pinned up.
     ----------------------------------------------------------------------
     TRUE 82 already deals franchise-and-era tickets, so a ticket is this game's native object rather
     than a borrowed one, and the library already holds tear, tape, sticker, seal and trim to print it
     with. Two stacks at 320px so no more than four tickets ever overlap and every exposed strip stays
     a 46px tap target.

     TAP ONLY, NEVER DRAG, and that is from the evidence: Apple Wallet's pass stack reads instantly on
     a phone AND has no strong signifier that the cards move or which one is active. So the front one is
     unmistakable and nothing here is draggable.

     Three stamps, all printed on one plate: a punched hole through your own position, a rubber seal on
     the board with the most action, and a date stamp on the board that is new today. You can count your
     own boards without opening one.

     THE ONE REWARD IN THIS FILE: tap a board where you are inside the top ten and one of the eight
     heat effects fires over the ticket. On a tap, for a fact, once. */
  LIST.push({
    id: "pinboard",
    name: "The pinboard",
    note: "Riso tickets pinned up in two stacks, on the real paper stock. A punched hole marks your own position on each board you are on, a gold seal marks the board with the most action, and a date stamp marks the one that is new today, so you can count your own boards without opening any. Tap only, never drag. Tapping a board where you are inside the top ten fires an ink print over the ticket.",
    html: function (recipe, slate) {
      var fs = facts(recipe, slate), i, half = Math.ceil(fs.list.length / 2);
      var ROT = [-1.8, 1.2, -0.9, 1.6, -1.3, 0.8, -1.6, 1.1];

      function ticket(f, i) {
        var yp = youPct(f);
        var a = ' data-board="' + esc(f.id) + '" style="--rot:' + ROT[i % ROT.length] + "deg; --ink:" + tokenOf(f) + '"' +
          (f.open ? ' data-open="1" aria-current="true"' : "") +
          (f.you && f.you <= 10 ? ' data-reward="' + esc(HOT_FOR(f)) + '"' : "") +
          ' aria-label="' + esc(f.title + ". " + standing(f, false)) + '"' +
          inkAttrs(f, "wash");
        var stamp = '<span class="nv-tk-stamp"' + inkAttrs(f, "stamp",
          ' data-youpct="' + round2(yp) + '" data-seal="' + (f.hot ? 1 : 0) +
          '" data-stampnew="' + (f.isNew ? 1 : 0) + '"') + "></span>";
        return tagOpen("nv-ticket" + (f.open ? " is-front" : ""), a) +
          stamp +
          '<span class="nv-tk-name">' + esc(f.tab) + "</span>" +
          '<span class="nv-tk-num">' + esc(f.lead || "soon") + "</span>" +
          '<span class="nv-tk-what">' + esc(f.lead ? f.what : standing(f, true)) + "</span>" +
          (f.open ? '<span class="nv-tk-stand">' + esc(standing(f, false)) + "</span>" : "") +
          "</button>";
      }
      /* which heat effect: fixed per board, never dealt, so the same board always rewards the same way */
      function HOT_FOR(f) {
        var ids = ["solar", "arcade", "jam", "phoenix", "pulse", "thermo", "comicheat", "emojifire"];
        return ids[hash("hot/" + f.id) % ids.length];
      }

      var left = [], right = [];
      for (i = 0; i < fs.list.length; i++) (i < half ? left : right).push(ticket(fs.list[i], i));
      return '<div class="nv-wall" data-hub="1"' + inkAttrs(fs.list[0], "paper") + ">" +
        '<div class="nv-stack">' + left.join("") + "</div>" +
        '<div class="nv-stack">' + right.join("") + "</div>" +
        "</div>";
    },
    css: function (recipe) {
      var id = "pinboard", s = 'html[data-nav="' + id + '"] ';
      return base(id) + "\n" + [
        s + ".nv-wall { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 8px;" +
          " padding: 10px 8px 14px; border-radius: 4px; background: var(--t-paper-2); }",
        s + ".nv-stack { display: flex; flex-direction: column; }",
        /* the overlap: every closed ticket shows a 46px strip, so every tap target is real */
        s + ".nv-ticket { position: relative; display: flex; flex-direction: column; align-items: flex-start;" +
          " gap: 0; width: 100%; height: 92px; margin-bottom: -46px; padding: 7px 9px 0; overflow: hidden;" +
          " border: 1px solid rgb(var(--t-ink-rgb) / .3); border-radius: 3px;" +
          " background: var(--t-paper); color: var(--t-ink); font: inherit; text-align: left;" +
          " cursor: pointer; transform: rotate(var(--rot, 0deg));" +
          " box-shadow: 2px 3px 0 0 rgb(var(--t-ink-rgb) / .14);" +
          " -webkit-tap-highlight-color: transparent; }",
        s + ".nv-stack > .nv-ticket:last-child { margin-bottom: 0; }",
        /* the front one is unmistakable: lifted, square to the wall, taller, in its own ink */
        s + ".nv-ticket.is-front { z-index: 3; height: 112px; transform: rotate(0deg) translateY(-3px);" +
          " border: 2px solid var(--ink); box-shadow: 3px 5px 0 0 rgb(var(--t-ink-rgb) / .22); }",
        s + ".nv-ticket:active { transform: rotate(var(--rot, 0deg)) translate(1px, 2px); }",
        s + ".nv-ticket.is-front:active { transform: rotate(0deg) translateY(-1px); }",
        s + ".nv-tk-stamp { position: absolute; inset: 0; z-index: 2; }",
        s + ".nv-tk-name { position: relative; z-index: 1; max-width: 100%;" +
          " font: 700 13px/1 var(--t-disp); letter-spacing: .07em; text-transform: uppercase;" +
          " white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
        s + ".nv-ticket.is-front .nv-tk-name { font-size: 17px; color: var(--ink); }",
        s + ".nv-tk-num { position: relative; z-index: 1; margin-top: 1px;" +
          " font: 700 18px/1.05 var(--t-mono); }",
        s + ".nv-ticket.is-front .nv-tk-num { font-size: 24px; }",
        s + ".nv-tk-what { position: relative; z-index: 1; font: 500 10px/1.2 var(--t-body); color: var(--t-ink-2); }",
        s + ".nv-tk-stand { position: relative; z-index: 1; margin-top: 3px;" +
          " font: 700 10px/1.2 var(--t-disp); letter-spacing: .09em; text-transform: uppercase; color: var(--t-ink-2); }",
        /* the exposed strip is where the name and the number live, so both are inside the top 46px */
        s + ".nv-ticket > span { pointer-events: none; }"
      ].join("\n");
    },
    /* The reward, and the only place in this file that touches T82FX. On a tap, for a fact, once. */
    wire: function (doc) {
      paintPass(doc);
      hubScroll(doc, "pinboard");
      var box = doc.querySelector('.lb-nav[data-nav-id="pinboard"]');
      if (!box) return;
      var nodes = box.querySelectorAll("[data-reward]"), i;
      for (i = 0; i < nodes.length; i++) {
        /* one listener per element on a subtree lab.js rebuilt: nothing can accumulate. The guard is
           per element, so a double tap does not stack two effects on one render. */
        (function (el) {
          var spent = false;
          el.addEventListener("click", function () {
            var A = art();
            if (spent || !A || !A.hot) return;
            spent = true;
            try { A.hot(doc, el.getAttribute("data-reward"), "fire", el); } catch (e) {}
          });
        })(nodes[i]);
      }
    }
  });

  win.LB.nav = { LIST: LIST };
}());
