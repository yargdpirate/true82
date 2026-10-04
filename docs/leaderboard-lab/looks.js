/* ---------- THE LEADERBOARD LAB: THE ART DIRECTIONS (docs/leaderboard-lab/looks.js) ----------
   ROUND THREE. Six directions, not eleven.

   WHY THIS FILE WAS THROWN AWAY AND REWRITTEN. Round one's eleven looks were measured on the
   live lab: backgroundImage "none" on the sheet and on every row in ALL ELEVEN, the sheet byte
   identical in all eleven, zero canvases in the board, four looks defining paint() and none of
   them painting. Eleven fonts on one grey table. Nothing in that file was worth keeping, so
   none of it is here.

   THE BRIEF THIS FILE IS BUILT AGAINST, in the owner's words:
       "functional art (matching the general design language of the rest of the app),
        not a reskinned spreadsheet"
   Two tests, not one. FUNCTIONAL: every mark names a fact about the board. MATCHING: the marks
   are the riso print world the results screen and the season reel already live in, made by the
   same engines, in the same inks.

   SO THE RULE I HELD, and it is the only rule that mattered:
       If I cannot say which fact a mark carries, the mark is cut or it is labelled decoration.
   The looks' own notes say which. My report says which. Nothing here is "a texture because
   textures look nice", with exactly three exceptions, all declared: the stock grain, the trim
   furniture on the press sheet, and the tap reward.

   WHAT EVERY DIRECTION HERE ACTUALLY DOES. The round-two bar was three of five. All six clear
   four or five:
     ground          every one replaces the grey box: real riso stock, a solid printed plate,
                     light newsprint, or a full riso painting.
     row as object   impression, pin on a rail, printed season strip, torn ticket, type on one
                     continuous plate, caption under a picture. No direction keeps a table row.
     real ink        all six paint through LB.art, which reaches reel-riso.js's own screening
                     pass: tone in, the ink's halftone lattice, grain and starvation specks out.
                     Not a CSS gradient pretending to be dots.
     the second ink  #41C6EA (--t-offset / --t-win / --t-print-pop) carries the score in five of
                     six, and in "overprint" it is the whole surface of the board.
     hierarchy       in all six the leader is a different KIND of object: a full bleed
                     impression, the summit of a curve, a 126px printed plate, an uncut ticket,
                     a 64px knocked out record, or the printed banner itself.

   WHAT I DID NOT TOUCH. boards.js owns the markup and I did not guess at classes it does not
   emit. Where a direction needed a second register (the art band over the readable lines, which
   is the only pattern that survives 320px) I BUILD that element myself in paint(), as a
   `.lbx-*` node inside the real sheet, and the report's "needs" field says what boards.js could
   give me instead. Everything else is the real .lb-* markup restyled past recognition, which
   the contract's top section explicitly allows.

   HOUSE RULES KEPT. Tokens for colour and type, engine output for ink. No raw hex, no raw font
   stack. No red and no --t-bad anywhere: a rank is not bad news. One meaning per colour:
   #41C6EA is a win, --t-hot fire gold is 82-0, --t-you is the viewer, --t-metal is ornament and
   calibration. Plain words, no em-dashes, no guilt, no countdowns. Legible at 320px: rank never
   under 12px, name never under 13.5px, score never under 12px, and no ink ever lands at full
   coverage under small type. The viewer's row is findable WITHOUT colour in every direction, and
   each look's note says how.

   Deterministic: no Math.random, no Date.now. Every seed is the recipe's or a rank.
   Fails soft: no engines, no canvas, a throw anywhere, and the board is still a readable board.
   ES5, like the engines. Nothing runs at load time. */
window.LB = window.LB || {};
(function () {
  "use strict";

  /* ======================================================================
     SHARED PLUMBING
     ====================================================================== */

  function sel(id) { return '[data-look="' + id + '"]'; }

  /* LB.art lives in the LAB's window and takes the FRAME's document, window or any element in
     it. lab.js hands paint() a document, so every call below passes `doc` straight through. */
  function ART() { try { return (window.LB && window.LB.art) ? window.LB.art : null; } catch (e) { return null; } }

  function q(doc, s) { try { return doc.querySelector(s); } catch (e) { return null; } }
  function qa(doc, s) { try { return doc.querySelectorAll(s); } catch (e) { return []; } }
  function cl01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function cl(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mk(doc, tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
  }
  function add(parent, node) { parent.appendChild(node); return node; }

  /* Everything this file inserts carries .lbx, so one sweep takes it all off again. lab.js
     rebuilds the whole board mount on every recipe change, so this is belt and braces rather
     than the main mechanism, but a look that is repainted twice must not stack. */
  function clean(doc) {
    var n = qa(doc, ".lbx"), i;
    for (i = 0; i < n.length; i++) if (n[i].parentNode) n[i].parentNode.removeChild(n[i]);
  }

  /* The art band: the fixed upper register, a sibling of .rs-scroll inside the real sheet, so it
     does NOT scroll away with the list. This is the two register pattern (one picture of the
     whole field over five to nine readable lines) and it is the only layout that survives
     320px: no single object can be both a picture of 4,412 GMs and a readable row. */
  function band(doc, sheet, cls, h) {
    var b = mk(doc, "div", "lbx lbx-band " + cls), head;
    if (h) b.style.height = h + "px";
    head = sheet.querySelector(".rs-head");
    if (head && head.nextSibling) sheet.insertBefore(b, head.nextSibling);
    else if (head) sheet.appendChild(b);
    else sheet.insertBefore(b, sheet.firstChild);
    return b;
  }

  /* Some art is the top of the content rather than a fixed header. The ticket wall's own leader
     ticket is the first ticket ON the wall, so it flows and scrolls like the rest, which costs
     the readable register nothing: the fixed band is the expensive register and not every
     direction needs one. */
  function lead(doc, scroll, cls) {
    var b = mk(doc, "div", "lbx lbx-lead-art " + cls);
    if (scroll) scroll.insertBefore(b, scroll.firstChild);
    return b;
  }

  /* ---------- reading the board off its own markup ----------
     boards.js prints the score as a DISPLAY STRING, which is the right call for a board and
     means a look has to read it back. Records read "78-4", nets "+19.8", money "$38M", streaks
     "12 days", a monthly sum "734", a rate "99.1%". The 82-0 Club prints dates instead, which
     is why the club is detected by board id and never parsed. */
  function parseScore(s) {
    var m, n;
    s = String(s == null ? "" : s);
    m = s.match(/(\d{1,2})\s*-\s*(\d{1,2})/);
    if (m) {
      var w = +m[1], l = +m[2];
      if (w + l > 0 && w + l <= 82) return { kind: "rec", wins: w, losses: l, v: w };
    }
    n = s.replace(/,/g, "").match(/[-+]?\d+(\.\d+)?/);
    if (n) return { kind: "num", wins: null, losses: null, v: parseFloat(n[0]) };
    return { kind: "none", wins: null, losses: null, v: null };
  }

  /* The name without its tag, chip or sub, for a printed plate. */
  function plainName(nameEl) {
    var i, kid, out = "";
    if (!nameEl) return "";
    for (i = 0; i < nameEl.childNodes.length; i++) {
      kid = nameEl.childNodes[i];
      if (kid.nodeType === 3) out += kid.nodeValue;
    }
    out = out.replace(/\s+/g, " ").replace(/^ | $/g, "");
    return out || String(nameEl.textContent || "").replace(/\s+/g, " ");
  }

  function rankOf(row) {
    var e = row.querySelector(".lb-rank"), d;
    if (!e) return 0;
    d = String(e.textContent || "").replace(/[^0-9]/g, "");
    return d ? parseInt(d, 10) : 0;
  }

  /* t IS THE ONE NUMBER EVERY DIRECTION DRAWS WITH: how strong this GM is, 0 to 1.
     On a record board it is ABSOLUTE (wins/82 through a curve), never normalised across the
     visible rows, and that is deliberate: absolute means two GMs tied on 78-4 get byte
     identical ink, a Daily where the whole room landed in the 70s LOOKS tight, and nothing on
     screen pretends rank 12 is the floor of the world. The curve spends the range the game
     actually uses: 82-0 is 1.00, 78-4 is 0.81, 70-12 is 0.50, 58-24 is 0.17.
     On a board with no record (money, days, a rate, a net) there is no absolute scale to read,
     so t spreads across the visible values and is oriented by the ranking, which is correct
     about ORDER and honest about nothing else. The exact score stays printed in type in every
     direction, always, so t is never the only reading. */
  function curve(a) { var x = cl01((a - 0.5) / 0.5); return x * x; }

  function scale(rows, club) {
    var i, recs = 0, nums = [], lo, hi, asc, firstV = null, lastV = null, span;
    if (club) {
      for (i = 0; i < rows.length; i++) { rows[i].t = 1; rows[i].perfect = true; }
      return;
    }
    for (i = 0; i < rows.length; i++) if (rows[i].p.kind === "rec") recs++;
    if (recs > 0 && recs >= rows.length / 2) {
      for (i = 0; i < rows.length; i++) {
        rows[i].t = rows[i].p.kind === "rec" ? curve(rows[i].p.wins / 82) : 0.4;
        rows[i].perfect = rows[i].p.kind === "rec" && rows[i].p.wins === 82;
      }
      return;
    }
    for (i = 0; i < rows.length; i++) if (rows[i].p.v != null) {
      nums.push(rows[i].p.v);
      if (firstV === null) firstV = rows[i].p.v;
      lastV = rows[i].p.v;
    }
    if (!nums.length) { for (i = 0; i < rows.length; i++) { rows[i].t = 1; rows[i].perfect = false; } return; }
    lo = Math.min.apply(null, nums); hi = Math.max.apply(null, nums);
    span = hi - lo;
    asc = firstV < lastV;                  /* the top of the board holds the SMALLER number: cheaper is better */
    for (i = 0; i < rows.length; i++) {
      var v = rows[i].p.v, nn;
      if (v == null || span <= 0) { rows[i].t = 1; rows[i].perfect = false; continue; }
      nn = asc ? (hi - v) / span : (v - lo) / span;
      rows[i].t = 0.18 + 0.82 * cl01(nn);
      rows[i].perfect = false;
    }
  }

  /* Everything a direction needs about the board, read once. */
  function read(doc, recipe) {
    var out = { sheet: null, scroll: null, list: null, rows: [], leader: null, you: null,
      club: false, field: 0, boardId: "", title: "", crowd: "" };
    var i, j, lists, kids, row, r;
    out.boardId = String((recipe && recipe.board) || "");
    out.club = /club/i.test(out.boardId);
    out.field = Math.max(0, parseInt((recipe && recipe.field) || 0, 10) || 0);
    out.sheet = q(doc, ".rules-overlay .rules-sheet");
    if (!out.sheet) return out;
    out.scroll = out.sheet.querySelector(".rs-scroll");
    out.title = String((out.sheet.querySelector(".rs-title") || {}).textContent || "").replace(/\s+/g, " ");
    out.crowd = String((out.sheet.querySelector(".lb-crowd") || {}).textContent || "").replace(/\s+/g, " ");
    lists = out.sheet.querySelectorAll('.lb-list:not([data-part="card"])');
    for (i = 0; i < lists.length; i++) {
      if (!out.list) out.list = lists[i];
      kids = lists[i].children;
      for (j = 0; j < kids.length; j++) {
        row = kids[j];
        if (row.nodeName !== "LI" || row.getAttribute("data-row") === "gap") continue;
        r = {
          el: row,
          list: lists[i],
          rank: rankOf(row),
          score: String((row.querySelector(".lb-score") || {}).textContent || "").replace(/\s+/g, " "),
          name: plainName(row.querySelector(".lb-name")),
          you: /\blb-(you|ghost)\b/.test(row.className),
          ghost: /\blb-ghost\b/.test(row.className),
          t: 0, gap: 0, perfect: false
        };
        r.p = parseScore(r.score);
        out.rows.push(r);
      }
    }
    scale(out.rows, out.club);
    for (i = 0; i < out.rows.length; i++) {
      out.rows[i].gap = i > 0 ? Math.max(0, out.rows[i - 1].t - out.rows[i].t) : 0;
      if (out.rows[i].you && !out.you) out.you = out.rows[i];
      if (!out.leader && (out.rows[i].rank === 1 || i === 0)) out.leader = out.rows[i];
    }
    return out;
  }

  /* The top 82 of the same board, from the same generator, for the pictures that draw the FIELD
     rather than the window: the press sheet's density bar and the rail's curve. It is a sample,
     not the whole 4,412, and both directions print the real count in plain words beside it. */
  function topRanks(recipe) {
    var d, i, rows = [], k, rc = {};
    try {
      if (!window.LB || !window.LB.data || !window.LB.data.board) return [];
      for (k in recipe) if (Object.prototype.hasOwnProperty.call(recipe, k)) rc[k] = recipe[k];
      rc.rows = 82; rc.around = false; rc.empty = false;
      d = window.LB.data.board(rc.board, rc);
      if (!d || !d.rows) return [];
      for (i = 0; i < d.rows.length; i++) {
        rows.push({ rank: d.rows[i].rank, score: String(d.rows[i].score || ""), p: parseScore(String(d.rows[i].score || "")), t: 0, perfect: false });
      }
      scale(rows, /club/i.test(String(recipe.board || "")));
      return rows;
    } catch (e) { return []; }
  }

  /* Which reel ink a row prints in. ONE MEANING PER COLOUR, and these are the same tokens the
     reel and the results print already use, so the meanings carry over rather than being
     invented here: "win" and "pop" are both #41C6EA, "hot" is fire gold --t-hot, "you" is
     --t-you, "night" is --t-print-night which is also --t-metal. Ink "loss" is red and appears
     NOWHERE in this file. */
  function inkFor(r) { return r.perfect ? "hot" : (r.you ? "you" : "win"); }

  /* 320px is a device, not a style opinion. Where a piece of art would eat the readable register
     at 320 it is printed smaller there, and the look's note never claims the larger reading. */
  function narrow(recipe) { return !(recipe && recipe.width && recipe.width >= 375); }

  /* THE RULE THAT KEEPS THE SECOND REGISTER ALIVE. 82 coins and rings always wrap to six rows,
     whatever the width, because the reel's pitch scales with cssW: that is 110px of ledger, and
     on the lab's own 476px stage it leaves three readable lines. So the leader's season prints
     in full only when the sheet can afford it, and otherwise as 20 blocks on one line with the
     exact record in 30px type beside it. Measured on the stage, not guessed. */
  function fullLedger(B, recipe) {
    var h = 0;
    try { h = B.sheet ? B.sheet.clientHeight : 0; } catch (e) { h = 0; }
    return !narrow(recipe) && h >= 560;
  }

  /* TWO COVERAGE SCALES, and the difference is measured rather than taste.
     covInk is for ink that lands BEHIND TYPE. On the night stock with light type, aqua at 63%
     and aqua at 96% both composite to the same bright field and the name drops to 2.3:1, which
     I measured on my own first build and which is a straight fail. 0.10 to 0.40 keeps the whole
     ramp between 14.5:1 and 6.7:1 and still reads as four times the ink.
     covBare is for ink on bare stock, where nothing has to stay readable through it: the
     density patch, the colour bar, the plate. That is where the drama goes. */
  function covInk(t) { return 0.10 + 0.30 * cl01(t); }
  function covBare(t) { return 0.15 + 0.83 * cl01(t); }

  /* a count the way the copy prints it */
  function fmtInt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

  /* A tap reward, never a render. The 8 heat effects belong on a beat. */
  function reward(doc, el) {
    var A = ART();
    if (!A || !A.hot || !el) return;
    el.style.cursor = "pointer";
    el.addEventListener("click", function () { try { A.hot(doc, "solar", "fire", el); } catch (e) {} });
  }

  /* Shared CSS: the sheet stops being a 18px radius grey card with brass rivets. Every look
     calls this and then says what its own ground is. */
  function sheetReset(S, ground) {
    return [
      S + " .rules-overlay { padding: 0; background: rgb(var(--t-overlay-rgb) / .94); align-items: stretch; }",
      /* !important, and here is exactly why, because it took a measurement to find and the next
         person will hit it too. look.css is the global style kit, and under the shipped
         data-card="outline" it carries
             html[data-card="outline"] :is(#lab-s#lab-s, .rules-sheet, ...) { background-color: var(--t-ground); }
             html[data-card="outline"] :is(#lab-s#lab-s, ..., .plq-frame) { background: transparent; border: 2px solid var(--t-text); ... }
         The :is() takes the specificity of its strongest argument, and #lab-s#lab-s is two IDs,
         so those rules score (2,1,1) and NOTHING a look can write with attributes and classes
         will beat them. Measured live: my own ground rule was silently losing, and five of six
         directions only LOOKED right because --t-ground happens to equal --t-print-paper. That
         is almost certainly part of why round one measured the sheet "byte identical in all
         eleven": a look that restyles this sheet has to say important or it does nothing. */
      S + " .rules-sheet { width: 100%; max-width: none; max-height: 100%;",
      "    border-radius: 0 !important; border: 0 !important; box-shadow: none !important;",
      "    background-color: " + ground + " !important; background-image: none; overflow: hidden; }",
      S + " .rules-sheet::before, " + S + " .rules-sheet::after { display: none; }",
      S + " .rs-head { position: relative; z-index: 2; }",
      S + " .rs-scroll { position: relative; z-index: 2; flex: 1 1 auto; min-height: 0; }",
      S + " .lbx-band { position: relative; z-index: 2; flex: none; overflow: hidden; }",
      S + " .lbx-stock { position: absolute; inset: 0; z-index: 0; pointer-events: none; background-size: cover; background-position: center; }",
      S + " .lb-row { position: relative; }",
      /* THE ONE RULE WITHOUT WHICH EVERY DIRECTION HERE IS A BLANK ROW. LB.art mounts an
         "under" canvas as position:absolute, z-index 0, which in CSS paint order sits ABOVE
         in-flow text. The rank, the name and the score are plain static spans, so they must be
         lifted or the ink covers them. Measured by hiding every name on the first run. */
      S + " .lb-row > * { position: relative; z-index: 1; }",
      S + ' .lb-row[data-row="gap"] { min-height: 0; border: 0; background: none; box-shadow: none; opacity: .72; }',
      S + ' .lb-row[data-row="gap"] .lb-sub { font-family: var(--t-mono); font-size: 11px; letter-spacing: .04em; }'
    ].join("\n");
  }

  /* The stock: the real riso paper the results print and the reel stand on. lab.js already
     paints it on the sheet when the owner has the toggle on, so a look that wants grain
     REGARDLESS puts its own layer in, and the two never fight because they are different
     elements. The grain pass on top is real: engine starvation specks, not a CSS dot. */
  function stock(doc, sheet, ink, cov) {
    var A = ART(), lay = mk(doc, "div", "lbx lbx-stock"), u = "";
    sheet.insertBefore(lay, sheet.firstChild);
    if (!A) return lay;
    try { u = A.paper(doc) || ""; } catch (e) { u = ""; }
    if (u) lay.style.backgroundImage = u;
    try {
      A.screen(doc, lay, function (g, w, h, K) { g.fillStyle = K.tone(cov == null ? 0.1 : cov); g.fillRect(0, 0, w, h); },
        { ink: ink || "night", slot: "grain", layer: "under", alpha: 0.5, seed: 4471, key: "grain|" + (ink || "night") });
    } catch (e) {}
    return lay;
  }

  /* ======================================================================
     1. THE GANG RUN
     ====================================================================== */

  var gangrun = {
    id: "gangrun",
    name: "Gang run",
    note: "One press sheet mid run. Every GM is an impression, inked as heavy as their record. The bar down the edge is the field.",
    css: function () {
      var S = sel("gangrun");
      return [
        sheetReset(S, "var(--t-print-paper)"),
        /* the job line, set like a press sheet's own slug */
        S + " .rs-title { font-family: var(--t-mono); font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--t-text-2); }",
        S + " .rs-head { padding: 12px 14px 6px; border-bottom: 1px solid rgb(var(--t-rule-rgb) / .55); }",
        /* THE TRIM FURNITURE. Declared decoration: crop marks and a registration bullseye carry
           no fact. They are what makes the ground read as a press sheet instead of a dark box. */
        S + " .lbx-trim { position: absolute; inset: 0; z-index: 3; pointer-events: none;",
        "    background-image:",
        "      linear-gradient(var(--t-metal), var(--t-metal)), linear-gradient(var(--t-metal), var(--t-metal)),",
        "      linear-gradient(var(--t-metal), var(--t-metal)), linear-gradient(var(--t-metal), var(--t-metal)),",
        "      radial-gradient(circle at 50% 50%, transparent 3.4px, var(--t-offset) 3.5px, var(--t-offset) 4.6px, transparent 4.7px);",
        "    background-repeat: no-repeat;",
        "    background-position: 6px 0, 6px 100%, 100% 6px, 0 6px, 13px 13px;",
        "    background-size: 1px 11px, 1px 11px, 11px 1px, 11px 1px, 26px 26px; opacity: .55; }",
        /* the band: a full bleed impression, the only one on the sheet that gets its season printed */
        S + " .lbx-band { padding: 10px 12px 12px; border-bottom: 1px solid rgb(var(--t-rule-rgb) / .55); }",
        S + " .lbx-eyebrow { font-family: var(--t-mono); font-size: 10.5px; letter-spacing: .16em; text-transform: uppercase; color: var(--t-offset); }",
        S + " .lbx-big { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin: 2px 0 6px; }",
        S + " .lbx-who { font-family: var(--t-disp); font-weight: 800; font-size: 25px; line-height: 1; letter-spacing: .02em;",
        "    text-transform: uppercase; color: var(--t-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
        S + " .lbx-rec { flex: none; font-family: var(--t-disp); font-weight: 800; font-size: 30px; line-height: 1; color: var(--t-offset); }",
        S + " .lbx-seal { flex: none; width: 34px; height: 34px; border-radius: 50%; border: 2px solid var(--t-hot);",
        "    display: flex; align-items: center; justify-content: center; font-family: var(--t-mono); font-size: 9px;",
        "    letter-spacing: .04em; color: var(--t-hot); transform: rotate(-11deg); }",
        S + " .lbx-strip { min-height: 24px; }",
        S + " .lbx-foot { margin: 6px 0 0; font-family: var(--t-mono); font-size: 10.5px; letter-spacing: .05em; color: var(--t-text-2); }",
        /* the colour bar: the sheet's right edge is the field's density */
        S + " .rs-scroll { padding-right: 32px; }",
        S + " .lbx-bar { position: absolute; top: 0; right: 9px; width: 15px; z-index: 3; pointer-events: none; }",
        /* THE IMPRESSION. Not a row: a trimmed block ganged onto the sheet. */
        S + " .lb-list { gap: 5px; padding: 8px 0 4px; }",
        S + " .lb-list > .lb-row { display: flex; align-items: center; gap: 9px; min-height: 46px; padding: 6px 9px;",
        "    border: 0; border-radius: 0; background: none;",
        "    box-shadow: inset 0 0 0 1px rgb(var(--t-rule-rgb) / .55); }",
        S + " .lb-list > .lb-row .lb-rank { flex: none; width: 3.4ch; font-family: var(--t-mono); font-size: 12.5px;",
        "    color: var(--t-text-2); text-align: right; font-variant-numeric: lining-nums tabular-nums; }",
        S + " .lb-list > .lb-row .lb-name { font-family: var(--t-disp); font-weight: 700; font-size: 16.5px; line-height: 1.05;",
        "    letter-spacing: .03em; text-transform: uppercase; color: var(--t-text); }",
        S + " .lb-list > .lb-row .lb-score { flex: none; font-family: var(--t-mono); font-size: 13px; color: var(--t-text); }",
        S + " .lb-tag, " + S + " .lb-sub { font-family: var(--t-mono); font-size: 10.5px; letter-spacing: .04em; text-transform: none; color: var(--t-text-2); }",
        S + " .lb-chip { font-family: var(--t-mono); font-size: 10px; }",
        /* YOUR IMPRESSION is out of line and bullseyed. Position and shape, not colour. */
              S + " .lb-list > .lb-you, " + S + " .lb-list > .lb-ghost { margin-left: -6px; margin-right: 6px;",        "    box-shadow: inset 0 0 0 1.5px var(--t-you); background: none; border-radius: 0; }",
        S + " .lb-list > .lb-you::before, " + S + " .lb-list > .lb-ghost::before { content: \"\"; position: absolute; left: 5px; top: 50%;",
        "    width: 21px; height: 21px; margin-top: -10.5px; border-radius: 50%; border: 2px solid var(--t-you); z-index: 2; }",
        S + " .lb-you .lb-name, " + S + " .lb-you .lb-score { color: var(--t-text); }",
        S + " .lb-crowd { font-family: var(--t-mono); font-size: 11px; letter-spacing: .04em; color: var(--t-text-2); }",
        S + " .lb-tab { border-radius: 0; font-family: var(--t-mono); font-size: 11px; letter-spacing: .1em; }",
        S + " .lb-tab.on { color: var(--t-offset); border-color: var(--t-offset); }",
        /* SCREEN ON THE BAND AND THE BAR, NORMAL ON THE ROWS. Screen is what the engines ship
           for a dark stock and it is right where the ink stands alone. Over a row it saturates:
           aqua at 63% coverage and aqua at 96% both composite to the same bright field, the ramp
           disappears, and the name measured 2.27:1. */
        S + " .lbx-band canvas[data-lb-art], " + S + " .lbx-bar canvas[data-lb-art], " + S + " .lbx-stock canvas[data-lb-art] { mix-blend-mode: screen; }",
        S + " .lb-row { padding-left: 29px !important; }",
        "@media (max-width: 340px) {",
        S + " .lbx-who { font-size: 21px; } " + S + " .lbx-rec { font-size: 26px; }",
        S + " .lb-list > .lb-row .lb-name { font-size: 15px; } " + S + " .rs-scroll { padding-right: 30px; }",
        "}"
      ].join("\n");
    },
    paint: function (doc, recipe) {
      var A = ART(), B = read(doc, recipe), i, r, b, host, bar, tops;
      clean(doc);
      if (!B.sheet) return;
      stock(doc, B.sheet, "night", 0.11);
      add(B.sheet, mk(doc, "div", "lbx lbx-trim"));
      if (!A || !B.rows.length) return;

      /* EVERY IMPRESSION IS INKED TO ITS RECORD. Coverage is the score, full width, because on a
         gang run what the operator reads is DENSITY. Ties print identical impressions, which is
         exactly what a gang run of one job looks like. */
      for (i = 0; i < B.rows.length; i++) {
        (function (r, idx) {
          var ink = inkFor(r);
          /* the impression's own density, full width, under the type and deliberately quiet */
          A.wash(doc, r.el, { ink: ink, cov: covInk(r.t), to: 1, soft: 0, alpha: 0.95,
            seed: 820 + (r.rank || idx), slot: "imp" });
          /* THE DENSITY PATCH, which is where a press sheet actually puts its ink: a solid
             square in the margin, printed at this GM's own coverage, on bare stock where
             nothing has to stay readable through it. Rank 1 prints near solid, the bottom of
             the window prints visibly starved, and the starvation specks are the engine's. */
          A.screen(doc, r.el, function (g, w, h, K) {
            var y = h / 2 - 9;
            g.fillStyle = K.tone(covBare(r.t));
            g.fillRect(7, y, 17, 18);
          }, { ink: ink, slot: "patch", layer: "over", seed: 97 + (r.rank || idx),
               key: "patch|" + ink + "|" + r.t.toFixed(3) });
        })(B.rows[i], i);
      }

      /* THE LEADER IS A FULL BLEED IMPRESSION and the only one carrying its season: the reel's
         own stamped ledger, 82 coins and loss rings, at plate size. */
      if (B.leader) {
        b = band(doc, B.sheet, "lbx-gang");
        add(b, mk(doc, "div", "lbx-eyebrow", B.club ? "First into the club" : "Heaviest impression on the sheet"));
        host = add(b, mk(doc, "div", "lbx-big"));
        add(host, mk(doc, "div", "lbx-who", B.leader.name || "Rank 1"));
        if (B.leader.perfect) add(host, mk(doc, "div", "lbx-seal", "82-0"));
        add(host, mk(doc, "div", "lbx-rec", B.leader.score || ""));
        add(b, mk(doc, "div", "lbx-strip"));
        /* 82 cells wrap to six rows of coins whatever the width (pitch scales with cssW), so a
           320px phone would spend 110px of its 500px sheet on the ledger alone. At 320 the
           leader's season prints as 20 blocks on one line and the exact record is 30px type
           right beside it; at 375 and up it is all 82 games and you can count the losses. */
        A.strip(doc, b.querySelector(".lbx-strip"), {
          games: fullLedger(B, recipe) ? season82(B.leader, (recipe && recipe.seed) || 82) : blocksN(B.leader, (recipe && recipe.seed) || 82, 20),
          wins: B.leader.p.kind === "rec" ? B.leader.p.wins : 82,
          seed: (recipe && recipe.seed) || 82, cssW: narrow(recipe) ? 276 : 300, layer: "flow", slot: "ledger"
        });
        add(b, mk(doc, "p", "lbx-foot", B.field ? "The bar at the edge is the top 82 of " + fmtInt(B.field) + "." : (B.crowd || "")));
        if (B.leader.perfect) reward(doc, b.querySelector(".lbx-seal"));
      }

      /* THE COLOUR BAR. A press sheet carries one so the operator can judge density; here the
         thing being judged is the field. One notch per rank in the top 82, its length the
         coverage at that rank, and a --t-you bullseye on the viewer's own notch. */
      tops = topRanks(recipe);
      if (tops.length > 2 && B.scroll) {
        bar = mk(doc, "div", "lbx lbx-bar");
        bar.style.height = Math.max(120, B.scroll.clientHeight - 16) + "px";
        B.scroll.parentNode.insertBefore(bar, B.scroll.nextSibling);
        bar.style.top = (B.scroll.offsetTop + 8) + "px";
        A.screen(doc, bar, function (g, w, h, K) {
          var n = tops.length, k, y, len;
          for (k = 0; k < n; k++) {
            y = Math.round(h * k / n);
            len = Math.max(2, Math.round(w * (0.28 + 0.72 * cl01(tops[k].t))));
            g.fillStyle = K.tone(0.42 + 0.5 * cl01(tops[k].t));
            g.fillRect(w - len, y, len, Math.max(1, Math.floor(h / n) - 1));
          }
        }, { ink: "win", slot: "bar", layer: "under", seed: 1982, key: "bar|" + tops.length + "|" + (recipe && recipe.seed) });
        if (B.you && B.you.rank && B.you.rank <= tops.length) {
          A.screen(doc, bar, function (g, w, h, K) {
            var y = h * (B.you.rank - 0.5) / tops.length;
            g.fillStyle = K.tone(0.95);
            g.beginPath(); g.arc(w / 2, y, 5.2, 0, Math.PI * 2); g.fill();
            g.globalCompositeOperation = "destination-out";
            g.beginPath(); g.arc(w / 2, y, 2.4, 0, Math.PI * 2); g.fill();
          }, { ink: "you", slot: "me", layer: "over", seed: 77, key: "me|" + B.you.rank });
        }
      }
    }
  };

  /* ======================================================================
     2. THE RAIL
     ====================================================================== */

  var rail = {
    id: "rail",
    name: "The rail",
    note: "The GOAT Climb, turned on the living. One curve is the whole field, your pin is on it, and the all time teams calibrate the scale.",
    css: function () {
      var S = sel("rail");
      return [
        sheetReset(S, "var(--t-print-paper)"),
        S + " .rs-head { padding: 11px 14px 4px; }",
        S + " .rs-title { font-family: var(--t-disp); font-weight: 800; font-size: 20px; letter-spacing: .04em; text-transform: uppercase; color: var(--t-text); }",
        /* THE ART REGISTER. No rows in it at all. */
        S + " .lbx-band { height: 150px; border-bottom: 1px solid rgb(var(--t-rule-rgb) / .5); }",
        S + " .lbx-plot { position: absolute; left: 52px; right: 8px; top: 6px; bottom: 22px; }",
        S + " .lbx-rail { position: absolute; left: 44px; top: 6px; bottom: 22px; width: 1.5px; background: var(--t-metal); opacity: .75; z-index: 2; }",
        S + " .lbx-ax { position: absolute; left: 0; width: 42px; text-align: right; font-family: var(--t-mono); font-size: 10px;",
        "    letter-spacing: .03em; color: var(--t-text-2); z-index: 2; }",
        S + " .lbx-ax i { font-style: normal; display: block; font-size: 9px; color: var(--t-metal); }",
        S + " .lbx-cap { position: absolute; left: 52px; right: 8px; bottom: 4px; display: flex; justify-content: space-between;",
        "    gap: 8px; font-family: var(--t-mono); font-size: 10px; letter-spacing: .05em; color: var(--t-text-2); z-index: 2; }",
        /* THE SUMMIT PLATE: the leader is not a pin. */
        S + " .lbx-top { position: absolute; left: 56px; top: 4px; z-index: 3; max-width: calc(100% - 70px); }",
        S + " .lbx-top b { display: block; font-family: var(--t-disp); font-weight: 800; font-size: 17px; line-height: 1;",
        "    letter-spacing: .03em; text-transform: uppercase; color: var(--t-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
        S + " .lbx-top span { font-family: var(--t-mono); font-size: 11px; letter-spacing: .06em; color: var(--t-offset); }",
        /* THE READABLE REGISTER: hairlines, no boxes, no ink. The art is all above. */
        S + " .lb-list { padding: 2px 0 0; }",
        S + " .lb-list > .lb-row { display: flex; align-items: baseline; gap: 9px; min-height: 34px; padding: 5px 2px;",
        "    border-bottom: 1px dotted rgb(var(--t-rule-rgb) / .8); background: none; }",
        S + " .lb-list > .lb-row .lb-rank { flex: none; width: 3.6ch; font-family: var(--t-mono); font-size: 12px; text-align: right;",
        "    color: var(--t-text-2); font-variant-numeric: lining-nums tabular-nums; }",
        S + " .lb-list > .lb-row .lb-name { font-family: var(--t-body); font-weight: 500; font-size: 14.5px; color: var(--t-text); }",
        S + " .lb-list > .lb-row .lb-score { flex: none; font-family: var(--t-mono); font-size: 13px; color: var(--t-text); }",
        /* YOUR LINE: the only one with a stem, and the only solid rule. Shape, not colour. */
        S + " .lb-list > .lb-you, " + S + " .lb-list > .lb-ghost { background: none; border-radius: 0; border-left: 0;",
        "    border-bottom: 1.5px solid var(--t-you); padding-left: 14px; }",
        S + " .lb-list > .lb-you::before, " + S + " .lb-list > .lb-ghost::before { content: \"\"; position: absolute; left: 4px; top: 10px; bottom: 10px;",
        "    width: 3px; background: var(--t-you); }",
        S + " .lb-you .lb-name, " + S + " .lb-you .lb-score { color: var(--t-text); }",
        S + " .lb-crowd { font-family: var(--t-mono); font-size: 11px; color: var(--t-text-2); }",
        S + " .lb-tab { font-family: var(--t-mono); font-size: 11px; letter-spacing: .1em; }",
        S + " .lb-tab.on { color: var(--t-offset); border-color: var(--t-offset); }",
        S + " .lbx-band canvas[data-lb-art] { mix-blend-mode: screen; }",
        "@media (max-width: 340px) {",
        S + " .lbx-band { height: 140px; } " + S + " .lbx-plot, " + S + " .lbx-cap { left: 46px; }",
        S + " .lbx-rail { left: 38px; } " + S + " .lbx-ax { width: 36px; } " + S + " .lbx-top { left: 50px; }",
        "}"
      ].join("\n");
    },
    paint: function (doc, recipe) {
      var A = ART(), B = read(doc, recipe), b, plot, tops, i, r, isRec, legend, top;
      clean(doc);
      if (!B.sheet) return;
      stock(doc, B.sheet, "night", 0.09);
      if (!A || !B.rows.length) return;

      b = band(doc, B.sheet, "lbx-rail-band");
      add(b, mk(doc, "div", "lbx-rail"));
      plot = add(b, mk(doc, "div", "lbx-plot"));

      isRec = !!(B.leader && B.leader.p.kind === "rec");
      /* THE SCALE'S CALIBRATION: the all time teams, on the same rail, in bronze. A living
         74-8 means nothing to someone who has never played until the 1996 Bulls are on the
         same ruler. These three are app.js's own HISTORY_COMPS, the Climb's own pins. */
      legend = isRec ? [{ w: 81, label: "Dream Team" }, { w: 73, label: "'16 Warriors" }, { w: 72, label: "'96 Bulls" }] : [];
      for (i = 0; i < legend.length; i++) {
        var ax = mk(doc, "div", "lbx-ax");
        ax.style.top = Math.round(6 + (1 - curve(legend[i].w / 82)) * (b.offsetHeight - 28) - 6) + "px";
        ax.appendChild(mk(doc, "span", "", legend[i].w));
        ax.appendChild(mk(doc, "i", "", legend[i].label));
        add(b, ax);
      }

      tops = topRanks(recipe);

      /* THE FIELD, as one curve: x is rank through the top 82, y is the score on the rail's
         common scale. The left cliff is the leaders' lead, a flat plateau is a tied crowd, the
         long tail is the depth of the board. Drawn in real halftone, not a CSS gradient. */
      if (tops.length > 2) {
        A.screen(doc, plot, function (g, w, h, K) {
          var n = tops.length, k, x, y;
          g.beginPath();
          g.moveTo(0, h);
          for (k = 0; k < n; k++) {
            x = w * k / (n - 1);
            y = h - h * cl01(tops[k].t);
            g.lineTo(x, y);
          }
          g.lineTo(w, h); g.closePath();
          g.fillStyle = K.tone(0.34); g.fill();
          g.lineWidth = 2; g.strokeStyle = K.tone(0.9);
          g.beginPath();
          for (k = 0; k < n; k++) { x = w * k / (n - 1); y = h - h * cl01(tops[k].t); if (k) g.lineTo(x, y); else g.moveTo(x, y); }
          g.stroke();
        }, { ink: "win", slot: "curve", layer: "under", seed: 8282, key: "curve|" + tops.length + "|" + (recipe && recipe.seed) + "|" + B.boardId });

        /* THE 82-0 PLATEAU, in fire gold, and only when there is one. The gold band's LENGTH is
           how many of the top 82 went perfect. */
        var per = 0;
        for (i = 0; i < tops.length; i++) if (tops[i].perfect) per++;
        if (per > 0) {
          A.screen(doc, plot, function (g, w, h, K) {
            /* t is 1 for a perfect season, so the band sits on the plot's own ceiling and its
               LENGTH is how many of the top 82 went 82-0. */
            g.fillStyle = K.tone(0.82);
            g.fillRect(0, 0, Math.max(3, w * per / tops.length), 5);
          }, { ink: "hot", slot: "perfect", layer: "over", seed: 820, key: "perfect|" + per });
        }
      }

      /* THE NAMED GMs, as pins on that curve. Position along a common scale: the vertical
         distance between two pins IS the gap between their records. */
      A.screen(doc, plot, function (g, w, h, K) {
        var n = Math.max(2, tops.length), k, rr, x, y;
        for (k = 0; k < B.rows.length; k++) {
          rr = B.rows[k];
          if (rr.you) continue;
          x = rr.rank && rr.rank <= n ? w * (rr.rank - 1) / (n - 1) : w - 3;
          y = h - h * cl01(rr.t);
          g.fillStyle = K.tone(0.95);
          g.beginPath(); g.arc(x, y, 4.2, 0, Math.PI * 2); g.fill();
        }
      }, { ink: "win", slot: "pins", layer: "over", seed: 41, key: "pins|" + B.rows.length + "|" + (recipe && recipe.youRank) });

      /* YOUR PIN: a notch with a stem, plus the Climb's own fill from your marker down to the
         floor, which is how far you have already climbed. A shape and a fill, never a hue
         alone. */
      if (B.you) {
        A.screen(doc, plot, function (g, w, h, K) {
          var n = Math.max(2, tops.length);
          var x = B.you.rank && B.you.rank <= n ? w * (B.you.rank - 1) / (n - 1) : w - 4;
          var y = h - h * cl01(B.you.t);
          g.fillStyle = K.tone(0.26);
          g.fillRect(Math.max(0, x - 1.5), y, 3, h - y);
          g.fillStyle = K.tone(0.98);
          g.beginPath();
          g.moveTo(x, y - 9); g.lineTo(x + 7, y); g.lineTo(x, y + 9); g.lineTo(x - 7, y);
          g.closePath(); g.fill();
        }, { ink: "you", slot: "mine", layer: "over", seed: 7789, key: "mine|" + B.you.rank + "|" + B.you.t.toFixed(3) });
      }

      /* the summit plate, the axis ends and the honest count */
      if (B.leader) {
        top = add(b, mk(doc, "div", "lbx-top"));
        add(top, mk(doc, "b", "", B.leader.name || "Rank 1"));
        add(top, mk(doc, "span", "", B.leader.score || ""));
      }
      var cap = add(b, mk(doc, "div", "lbx-cap"));
      add(cap, mk(doc, "span", "", "Rank 1"));
      add(cap, mk(doc, "span", "", B.field ? "Top 82 of " + fmtInt(B.field) + " shown" : "Top 82 shown"));
    }
  };

  /* ======================================================================
     3. SEASON STRIPS
     ====================================================================== */

  var strips = {
    id: "strips",
    name: "Season strips",
    note: "The record stops being a number. Every GM carries their season as the reel's own coins and rings, and yours is printed in full.",
    css: function () {
      var S = sel("strips");
      return [
        sheetReset(S, "var(--t-print-paper)"),
        S + " .rs-head { padding: 11px 14px 4px; border-bottom: 1px solid rgb(var(--t-rule-rgb) / .5); }",
        S + " .rs-title { font-family: var(--t-disp); font-weight: 800; font-size: 20px; letter-spacing: .05em; text-transform: uppercase; color: var(--t-text); }",
        S + " .lbx-band { padding: 10px 12px 12px; border-bottom: 1px solid rgb(var(--t-rule-rgb) / .5); }",
        S + " .lbx-eyebrow { font-family: var(--t-mono); font-size: 10.5px; letter-spacing: .16em; text-transform: uppercase; color: var(--t-offset); }",
        S + " .lbx-big { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin: 3px 0 7px; }",
        S + " .lbx-who { font-family: var(--t-disp); font-weight: 800; font-size: 23px; line-height: 1; letter-spacing: .02em;",
        "    text-transform: uppercase; color: var(--t-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
        S + " .lbx-rec { flex: none; font-family: var(--t-disp); font-weight: 900; font-size: 34px; line-height: .9; color: var(--t-text); }",
        S + " .lbx-plate { min-height: 30px; }",
        S + " .lbx-foot { margin: 7px 0 0; font-family: var(--t-mono); font-size: 10.5px; letter-spacing: .05em; color: var(--t-text-2); }",
        /* THE ROW IS TWO LINES: the line of record, and the season under it. */
        S + " .lb-list { padding: 6px 0 2px; gap: 2px; }",
        S + " .lb-list > .lb-row { display: grid; grid-template-columns: 3.6ch minmax(0, 1fr) auto; column-gap: 8px; row-gap: 3px;",
        "    align-items: baseline; min-height: 50px; padding: 6px 2px 7px; background: none;",
        "    border-bottom: 1px solid rgb(var(--t-rule-rgb) / .45); }",
        S + " .lb-list > .lb-row .lb-rank { grid-column: 1; grid-row: 1; width: auto; font-family: var(--t-mono); font-size: 12.5px;",
        "    text-align: right; color: var(--t-text-2); font-variant-numeric: lining-nums tabular-nums; }",
        S + " .lb-list > .lb-row .lb-name { grid-column: 2; grid-row: 1; font-family: var(--t-body); font-weight: 600; font-size: 14.5px; color: var(--t-text); }",
        S + " .lb-list > .lb-row .lb-score { grid-column: 3; grid-row: 1; font-family: var(--t-mono); font-weight: 700; font-size: 13.5px; color: var(--t-text); }",
        S + " .lbx-season { grid-column: 2 / 4; grid-row: 2; min-height: 22px; }",
        S + ' .lb-list > .lb-row[data-row="gap"] { grid-template-columns: 3.6ch 1fr auto; min-height: 0; border-bottom: 0; }',
        /* YOURS IS A DIFFERENT OBJECT: the only row on the board with all 82 games on it. */
        S + " .lb-list > .lb-you, " + S + " .lb-list > .lb-ghost { background: none; border-radius: 0; border-left: 0;",
        "    padding-left: 11px; box-shadow: inset 3px 0 0 0 var(--t-you); }",
        S + " .lb-you .lb-name, " + S + " .lb-you .lb-score { color: var(--t-text); }",
        S + " .lb-tag, " + S + " .lb-sub { font-family: var(--t-mono); font-size: 10.5px; color: var(--t-text-2); }",
        S + " .lb-crowd { font-family: var(--t-mono); font-size: 11px; color: var(--t-text-2); }",
        S + " .lb-tab.on { color: var(--t-offset); border-color: var(--t-offset); }",
        "@media (max-width: 340px) {",
        S + " .lbx-who { font-size: 20px; } " + S + " .lbx-rec { font-size: 29px; }",
        "}"
      ].join("\n");
    },
    paint: function (doc, recipe) {
      var A = ART(), B = read(doc, recipe), i, r, host, b, seed, wide;
      clean(doc);
      if (!B.sheet) return;
      stock(doc, B.sheet, "night", 0.1);
      if (!A || !B.rows.length) return;
      seed = (recipe && recipe.seed) || 82;
      wide = Math.max(150, Math.min(290, (B.scroll ? B.scroll.clientWidth : 300) - 46));

      for (i = 0; i < B.rows.length; i++) {
        r = B.rows[i];
        host = mk(doc, "div", "lbx lbx-season");
        r.el.appendChild(host);
        /* YOUR SEASON IN FULL, everyone else's in ten blocks with the exact record printed
           beside it. The ten block strip is a COMPRESSION and it is only honest because the
           record is in type two inches away, which it always is. */
        A.strip(doc, host, {
          games: r.you ? season82(r, seed) : blocksN(r, seed, 10),
          wins: r.p.kind === "rec" ? r.p.wins : Math.round(82 * cl01(r.t)),
          seed: seed + (r.rank || i) * 7,
          cssW: r.you ? wide : Math.min(wide, 180),
          mi: (r.rank || i) % 12, layer: "flow", slot: "season"
        });
      }

      if (B.leader) {
        b = band(doc, B.sheet, "lbx-strip-band");
        add(b, mk(doc, "div", "lbx-eyebrow", B.club ? "First into the club" : "The season at the top"));
        host = add(b, mk(doc, "div", "lbx-big"));
        add(host, mk(doc, "div", "lbx-who", B.leader.name || "Rank 1"));
        add(host, mk(doc, "div", "lbx-rec", B.leader.score || ""));
        add(b, mk(doc, "div", "lbx-plate"));
        A.strip(doc, b.querySelector(".lbx-plate"), {
          games: fullLedger(B, recipe) ? season82(B.leader, seed) : blocksN(B.leader, seed, 20),
          wins: B.leader.p.kind === "rec" ? B.leader.p.wins : 82,
          seed: seed + (B.leader.rank || 1) * 7,
          cssW: 300, layer: "flow", slot: "plate"
        });
        add(b, mk(doc, "p", "lbx-foot", B.crowd || ""));
      }
    }
  };

  /* An 82 game season for a row: the engine's own shaped season, seeded by the rank so two GMs
     tied on 78-4 print two different seasons, which is true. */
  function season82(r, seed) {
    var A = ART();
    if (!A || !A.season) return null;
    return A.season(r.p.kind === "rec" ? r.p.wins : Math.round(82 * cl01(r.t)), seed + (r.rank || 1) * 7);
  }
  /* N blocks of the season, each lit when that block was won on balance. A COMPRESSION, and it
     is only honest because the exact record is printed in type beside it, which it always is.
     Used for a row's summary strip, and for the leader's ledger at 320px, where 82 cells wrap to
     six rows of coins and would eat the readable register. */
  function blocksN(r, seed, n) {
    var g = season82(r, seed), out = [], i, k, w, c, per = Math.floor(82 / n), extra = 82 - per * n;
    if (!g) return null;
    for (i = 0, k = 0; i < n; i++) {
      w = 0; c = per + (i < extra ? 1 : 0);
      for (var j = 0; j < c; j++, k++) if (g[k]) w++;
      out.push(c && w * 2 >= c ? 1 : 0);
    }
    return out;
  }

  /* ======================================================================
     4. THE TICKET WALL
     ====================================================================== */

  var ticket = {
    id: "ticket",
    name: "Ticket wall",
    note: "The game's own object. Every GM is a ticket on newsprint, and the counterfoil is torn where their record ran out.",
    css: function () {
      var S = sel("ticket");
      return [
        sheetReset(S, "var(--t-paper-2)"),
        S + " .rules-overlay { background: rgb(var(--t-overlay-rgb) / .96); }",
        S + " .rs-head { padding: 11px 14px 6px; }",
        S + " .rs-title { font-family: var(--t-disp); font-weight: 800; font-size: 21px; letter-spacing: .05em; text-transform: uppercase; color: var(--t-ink); }",
        S + " .rules-overlay .rs-close { background: var(--t-paper); border-color: var(--t-ink-2); color: var(--t-ink); }",
        /* the wall: newsprint with a bronze shelf rule */
        S + " .rs-scroll { padding: 0 11px 14px; }",
        S + " .lbx-lead-art { width: 100%; padding: 8px 0 12px; border-bottom: 2px solid var(--t-metal); }",
        S + " .lbx-tick { position: relative; background: var(--t-paper); border-radius: 3px; padding: 8px;",
        "    box-shadow: 0 2px 0 0 rgb(var(--t-ink-rgb) / .25); }",
        /* a wide crop, with focus "top" on the scene, so the record the engine prints in 148px
           display type stays in frame and the band stays near the 150 to 240px the two register
           layout can afford at 320px */
        S + " .lbx-face { position: relative; aspect-ratio: 1000 / 440; background: var(--t-print-paper); overflow: hidden; border-radius: 1px; }",
        S + " .lbx-line { display: flex; align-items: baseline; justify-content: space-between; gap: 9px; padding: 6px 2px 1px; }",
        S + " .lbx-who { font-family: var(--t-disp); font-weight: 800; font-size: 20px; line-height: 1; letter-spacing: .03em;",
        "    text-transform: uppercase; color: var(--t-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
        S + " .lbx-rec { flex: none; font-family: var(--t-mono); font-weight: 700; font-size: 16px; color: var(--t-ink); }",
        S + " .lbx-foot { margin: 7px 2px 0; font-family: var(--t-mono); font-size: 10.5px; letter-spacing: .04em; color: var(--t-ink-2); }",
        /* THE TICKET. Paper, perforated down the left, with a torn counterfoil along the top. */
        S + " .lb-list { padding: 10px 0 2px; gap: 7px; }",
        S + " .lb-list > .lb-row { display: flex; align-items: center; gap: 9px; min-height: 44px;",
        "    padding: 15px 9px 6px 16px; border: 0; border-radius: 2px 6px 6px 2px; background: var(--t-paper);",
        "    box-shadow: 0 1.5px 0 0 rgb(var(--t-ink-rgb) / .22); }",
        /* the perforation: the ticket's own silhouette, punched in the wall's colour */
        S + " .lb-list > .lb-row::before { content: \"\"; position: absolute; left: 4px; top: 6px; bottom: 6px; width: 4px; z-index: 2;",
        "    background-image: radial-gradient(circle, var(--t-paper-2) 1.6px, transparent 1.7px);",
        "    background-size: 4px 7px; background-repeat: repeat-y; }",
        S + " .lb-list > .lb-row .lb-rank { flex: none; width: 3.4ch; font-family: var(--t-mono); font-weight: 700; font-size: 12.5px;",
        "    text-align: right; color: var(--t-ink-2); font-variant-numeric: lining-nums tabular-nums; }",
        S + " .lb-list > .lb-row .lb-name { font-family: var(--t-disp); font-weight: 700; font-size: 16.5px; line-height: 1.05;",
        "    letter-spacing: .03em; text-transform: uppercase; color: var(--t-ink); }",
        S + " .lb-list > .lb-row .lb-score { flex: none; font-family: var(--t-mono); font-weight: 700; font-size: 13px; color: var(--t-ink); }",
        S + " .lb-tag, " + S + " .lb-sub { font-family: var(--t-mono); font-size: 10.5px; letter-spacing: .03em; text-transform: none; color: var(--t-ink-2); }",
        S + " .lb-chip { font-family: var(--t-mono); font-size: 10px; color: var(--t-ink-2); border-color: var(--t-ink-2); }",
        /* YOUR TICKET IS OUT OF LINE and still whole on its left edge. Position, not colour. */
        S + " .lb-list > .lb-you, " + S + " .lb-list > .lb-ghost { background: var(--t-paper); margin: 2px -4px 2px 6px;",
        "    transform: rotate(-0.5deg); box-shadow: 0 3px 0 0 rgb(var(--t-ink-rgb) / .3), inset 4px 0 0 0 var(--t-you); }",
        S + " .lb-you .lb-name, " + S + " .lb-you .lb-score { color: var(--t-ink); }",
        /* an 82-0 ticket is foiled: a material, not a hue */
        S + " .lb-list > .lb-row.is-foil { box-shadow: 0 1.5px 0 0 rgb(var(--t-ink-rgb) / .22), inset 0 0 0 2px var(--t-hot); }",
        S + ' .lb-list > .lb-row[data-row="gap"] { background: none; box-shadow: none; min-height: 0; padding: 2px 9px; }',
        S + ' .lb-list > .lb-row[data-row="gap"]::before { display: none; }',
        S + ' .lb-list > .lb-row[data-row="gap"] .lb-sub, ' + S + " .lb-crowd { color: var(--t-ink-2); font-family: var(--t-mono); font-size: 11px; }",
        S + " .acct-p, " + S + " .lb-empty p { color: var(--t-ink); }",
        S + " .acct-fine { color: var(--t-ink-2); }",
        S + " .lb-ghost .acct-p, " + S + " .lb-ghost .acct-fine { color: var(--t-ink); }",
        S + " .lb-tab { color: var(--t-ink-2); border-color: var(--t-ink-2); }",
        S + " .lb-tab.on { color: var(--t-ink); border-color: var(--t-ink); background: rgb(var(--t-metal-rgb) / .22); }",
        /* ink on paper is MULTIPLY, which is what a riso on newsprint does */
        /* ink on paper is MULTIPLY, which is what a riso on newsprint does. The reel and the
           print engines ship SCREEN, because their stock is dark card. */
        S + " .lb-list canvas[data-lb-art] { mix-blend-mode: multiply; }",
        /* The stock layer is OPAQUE here on purpose: lab.js paints the real dark riso stock onto
           the sheet when the owner has the paper toggle on, and a dark grained JPEG under a
           newsprint look would be the one thing in this set that reads as a bug. */
        S + " .lbx-stock { background-color: var(--t-paper-2); }",
        S + " .lbx-stock canvas[data-lb-art] { mix-blend-mode: multiply; opacity: .6; }",
        "@media (max-width: 340px) { " + S + " .lbx-who { font-size: 17px; } " + S + " .lb-list > .lb-row .lb-name { font-size: 15px; }",
        S + " .lbx-face { aspect-ratio: 1000 / 400; } }"
      ].join("\n");
    },
    paint: function (doc, recipe) {
      var A = ART(), B = read(doc, recipe), i, r, b, t, host;
      clean(doc);
      if (!B.sheet) return;
      /* newsprint, with the engine's own ink starvation specks over it at low coverage */
      if (A) {
        var lay = mk(doc, "div", "lbx lbx-stock");
        B.sheet.insertBefore(lay, B.sheet.firstChild);
        A.screen(doc, lay, function (g, w, h, K) { g.fillStyle = K.tone(0.08); g.fillRect(0, 0, w, h); },
          { ink: "key", slot: "fibre", layer: "under", seed: 4471, key: "fibre" });
      }
      if (!A || !B.rows.length) return;

      for (i = 0; i < B.rows.length; i++) {
        r = B.rows[i];
        t = cl01(r.t);
        if (r.perfect) r.el.className += " is-foil";
        /* THE TEAR. The counterfoil along the ticket's top runs as far as the record earned and
           ends in a real torn edge: a ragged path drawn in black alpha and handed back as the
           ink's own halftone, with its grain and its starvation. Not a CSS mask. 82-0 keeps a
           whole uncut strip; a shorter record keeps a shorter one, and nothing on the ticket
           says what is missing. */
        A.screen(doc, r.el, tearFor(t, r.rank || i), {
          ink: r.perfect ? "hot" : (r.you ? "you" : "win"),
          slot: "tear", layer: "under", seed: 600 + (r.rank || i),
          key: "tear|" + t.toFixed(3) + "|" + (r.perfect ? 1 : 0) + "|" + (r.you ? 1 : 0)
        });
      }

      if (B.leader) {
        b = lead(doc, B.scroll, "lbx-wall");
        host = add(b, mk(doc, "div", "lbx-tick"));
        add(host, mk(doc, "div", "lbx-face"));
        var line = add(host, mk(doc, "div", "lbx-line"));
        add(line, mk(doc, "div", "lbx-who", B.leader.name || "Rank 1"));
        add(line, mk(doc, "div", "lbx-rec", B.leader.score || ""));
        /* The leader's ticket carries a picture on its face, and the picture is THEIR SEASON:
           the print engine draws the 82 games as the ridge, prints the record in its own
           display type in two inks off register, and fills the paint only as far as the win
           rate. Nobody else on the wall gets one. */
        A.scene(doc, sceneFor(B, recipe), host.querySelector(".lbx-face"), {
          wins: B.leader.p.kind === "rec" ? B.leader.p.wins : 82,
          seed: (recipe && recipe.seed) || 82,
          pal: B.leader.t > 0.66 ? "golden" : "dusk",
          context: (B.title || "").toUpperCase(),
          fit: "cover", focus: "top", slot: "face"
        });
        add(b, mk(doc, "p", "lbx-foot", "Every ticket here was replayed by the server."));
      }
    }
  };

  /* the ragged counterfoil, as a draw callback for LB.art.screen */
  function tearFor(t, seed) {
    return function (g, w, h, K) {
      var r = K.rand ? K.rand((seed * 2654435761) >>> 0) : function () { return 0.5; };
      var x = Math.max(10, w * (0.12 + 0.88 * t)), top = 2, bot = 11, i, n = 16, y, jag;
      g.beginPath();
      g.moveTo(0, top);
      g.lineTo(x, top);
      for (i = 0; i <= n; i++) {
        y = top + (bot - top) * i / n;
        jag = (r() - 0.5) * 5.4;
        g.lineTo(x + jag, y);
      }
      g.lineTo(0, bot);
      g.closePath();
      g.fillStyle = K.tone(0.52 + 0.44 * t);
      g.fill();
      /* the punched holes: the ticket's own perforation, in ink */
      g.globalCompositeOperation = "destination-out";
      for (i = 0; i * 9 < x - 6; i++) { g.beginPath(); g.arc(6 + i * 9, (top + bot) / 2, 1.3, 0, Math.PI * 2); g.fill(); }
    };
  }

  /* Which of the 19 scenes a board prints. The seven perfect scenes exist only for an 82-0
     season, so naming one is itself the statement that this is the 82-0 Club. */
  function sceneFor(B, recipe) {
    var id = String((recipe && recipe.board) || "");
    if (B.club) return "goatpeak";
    if (B.leader && B.leader.perfect) return "summit";
    if (/today|daily/.test(id)) return "skyline";
    if (/month|week/.test(id)) return "ridgelines";
    if (/streak/.test(id)) return "lighthouse";
    if (/net/.test(id)) return "wave";
    if (/cheap|cost/.test(id)) return "glass";
    if (/rate/.test(id)) return "dunes";
    if (/outdraft/.test(id)) return "volcano";
    return "skyline";
  }

  /* ======================================================================
     5. THE OVERPRINT
     ====================================================================== */

  var overprint = {
    id: "overprint",
    name: "The overprint",
    note: "Two plates and nothing else. The whole board is one seafoam slab, and how far a name is misregistered is the gap to the name above it.",
    css: function () {
      var S = sel("overprint");
      return [
        sheetReset(S, "var(--t-print-paper)"),
        S + " .rs-head { padding: 11px 14px 6px; }",
        S + " .rs-title { font-family: var(--t-disp); font-weight: 900; font-size: 22px; letter-spacing: .04em; text-transform: uppercase; color: var(--t-offset); }",
        /* the leader is a knocked out record, not a row */
        S + " .lbx-band { padding: 8px 12px 10px; }",
        /* THE PLATE IS SOLID AND THE INK RIDES OVER IT. A 93% halftone leaves dot gaps down to
           the dark stock, and dark knocked out type sitting in those gaps loses its edges. So the
           plate's COLOUR is the token laid flat (7.9:1 against --t-ink, measured) and the engine's
           halftone, grain and starvation print over the top of it. The texture is real ink; the
           flat base is what makes a knockout legible at 15.5px on a phone. */
        S + " .lbx-slab { position: relative; padding: 9px 12px 11px; overflow: hidden; background: var(--t-offset); }",
        S + " .lbx-eyebrow { position: relative; z-index: 2; font-family: var(--t-mono); font-size: 10px; letter-spacing: .18em;",
        "    text-transform: uppercase; color: var(--t-ink); }",
        S + " .lbx-rec { position: relative; z-index: 2; font-family: var(--t-disp); font-weight: 900; font-size: 60px; line-height: .86;",
        "    letter-spacing: -.01em; color: var(--t-ink); }",
        S + " .lbx-who { position: relative; z-index: 2; font-family: var(--t-disp); font-weight: 700; font-size: 16px; line-height: 1;",
        "    letter-spacing: .06em; text-transform: uppercase; color: var(--t-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
        S + " .lbx-foot { margin: 8px 2px 0; font-family: var(--t-mono); font-size: 10.5px; letter-spacing: .04em; color: var(--t-offset); }",
        /* THE PLATE. One continuous printed field, no rows as objects, no rules, no boxes. */
        S + " .rs-scroll { padding: 0 12px 14px; }",
        S + " .lb-list { position: relative; padding: 0; margin: 0; min-height: 60px; background: var(--t-offset); }",
        S + " .lb-list > .lb-row { display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 4px 8px;",
        "    border: 0; border-radius: 0; background: none; }",
        S + " .lb-list > .lb-row .lb-rank { flex: none; width: 3.2ch; font-family: var(--t-mono); font-weight: 700; font-size: 12px;",
        "    text-align: right; color: rgb(var(--t-ink-rgb) / .82); font-variant-numeric: lining-nums tabular-nums; }",   /* .82 is 5.6:1 on the plate; .72 measured 4.45:1, under the floor at 12px */
        S + " .lb-list > .lb-row .lb-name { position: relative; z-index: 3; font-family: var(--t-disp); font-weight: 800; font-size: 17px;",
        "    line-height: 1; letter-spacing: .04em; text-transform: uppercase; color: var(--t-ink); }",
        S + " .lb-list > .lb-row .lb-score { position: relative; z-index: 3; flex: none; font-family: var(--t-mono); font-weight: 700;",
        "    font-size: 13px; color: var(--t-ink); }",
        S + " .lb-tag, " + S + " .lb-sub { font-family: var(--t-mono); font-size: 10px; letter-spacing: .03em; text-transform: none; color: rgb(var(--t-ink-rgb) / .85); }",
        S + " .lb-chip { font-family: var(--t-mono); font-size: 10px; color: var(--t-ink); border-color: rgb(var(--t-ink-rgb) / .5); }",
        /* YOUR NAME is the only one with a rule in perfect register under it. */
        S + " .lb-list > .lb-you, " + S + " .lb-list > .lb-ghost { background: none; border-radius: 0; border-left: 0; padding-left: 8px; }",
        S + " .lb-list > .lb-you::after, " + S + " .lb-list > .lb-ghost::after { content: \"\"; position: absolute; left: 8px; right: 8px;",
        "    bottom: 5px; height: 2.5px; background: var(--t-ink); z-index: 3; }",
        S + " .lb-you .lb-name, " + S + " .lb-you .lb-score { color: var(--t-ink); }",
        S + ' .lb-list > .lb-row[data-row="gap"] { min-height: 22px; padding: 0 8px; }',
        S + ' .lb-list > .lb-row[data-row="gap"] .lb-sub { color: rgb(var(--t-ink-rgb) / .8); }',
        S + " .lb-crowd { font-family: var(--t-mono); font-size: 11px; letter-spacing: .04em; color: var(--t-offset); }",
        S + ' .acct-fine, ' + S + ' .acct-p { color: var(--t-text); }',
        S + ' [data-part="pinned-line"], ' + S + " .lb-ghost .acct-p { color: var(--t-text); }",
        S + " .lb-tab { border-radius: 0; font-family: var(--t-mono); font-size: 11px; letter-spacing: .1em; }",
        S + " .lb-tab.on { color: var(--t-offset); border-color: var(--t-offset); }",
        "@media (max-width: 340px) {",
        S + " .lbx-rec { font-size: 48px; } " + S + " .lb-list > .lb-row .lb-name { font-size: 15.5px; }",
        "}"
      ].join("\n");
    },
    paint: function (doc, recipe) {
      var A = ART(), B = read(doc, recipe), i, b, slab, maxOff, seen, k, dup, fs;
      clean(doc);
      if (!B.sheet) return;
      stock(doc, B.sheet, "night", 0.08);
      if (!A || !B.rows.length) return;
      /* 3px at 320, 6px at 390. Offset type is harder to read and riso practice warns that a
         miss can look wrong rather than quirky, so the clamp is not a nicety: it is the whole
         viability of the direction. The record stays in perfect register in mono, always. */
      maxOff = (recipe && recipe.width && recipe.width >= 375) ? 6 : 3;

      /* THE ROOM IS ONE PLATE, and the plate is printed rather than filled: the engine's own
         halftone, grain and ink starvation over the flat token. This is the colour the owner said
         the app never spends, spent as the entire surface of the board. */
      seen = [];
      for (i = 0; i < B.rows.length; i++) {
        if (!B.rows[i].list) continue;
        for (k = 0, dup = false; k < seen.length; k++) if (seen[k] === B.rows[i].list) dup = true;
        if (dup) continue;
        seen.push(B.rows[i].list);
        A.wash(doc, B.rows[i].list, { ink: "win", cov: 0.88, to: 1, soft: 0, alpha: 0.55, slot: "plate", seed: 4182 });
      }

      fs = (recipe && recipe.width && recipe.width >= 375) ? 17 : 15.5;
      for (i = 0; i < B.rows.length; i++) {
        /* An IIFE, not the loop body, because LB.art defers a paint when the row has no box yet
           and a shared `r` would then print the LAST row's name into every row. */
        (function (r, idx) {
          var nameEl = r.el.querySelector(".lb-name");
          var nx = nameEl ? nameEl.offsetLeft : 36;
          var ny = nameEl ? nameEl.offsetTop + nameEl.offsetHeight - 3 : 26;
          /* THE MISREGISTRATION IS THE GAP. The crisp name above is the authoritative reading;
             behind it the same name prints again in the second ink, offset by the distance to the
             name above it. A tie is in perfect register and shows nothing at all, so a Daily of
             hundreds of 81-1s prints crisp and you can SEE where the tie ends. */
          var ox = Math.min(maxOff, r.gap * maxOff * 7);
          var oy = -Math.min(maxOff, r.gap * maxOff * 4) * 0.5;
          A.screen(doc, r.el, function (g, w, h, K) {
            K.text(g, (r.name || "").toUpperCase(), nx + ox, ny + oy, { font: K.font(800, fs, "disp"), align: "left", cov: 0.9 });
          }, { ink: "key", slot: "miss", layer: "under", seed: 300 + (r.rank || idx),
               key: "ghost|" + ox.toFixed(2) + "|" + oy.toFixed(2) + "|" + fs + "|" + (r.name || "") });
          /* your own name carries a third plate, which is the only triple on the board */
          if (r.you) {
            A.screen(doc, r.el, function (g, w, h, K) {
              K.text(g, (r.name || "").toUpperCase(), nx + maxOff * 1.5, ny + maxOff * 0.6, { font: K.font(800, fs, "disp"), align: "left", cov: 0.82 });
            }, { ink: "you", slot: "mine", layer: "under", seed: 7,
                 key: "mine|" + (r.name || "") + "|" + maxOff + "|" + fs });
          }
          /* 82-0 is the one place the plates overlap, and the overlap is fire gold. */
          if (r.perfect) {
            A.wash(doc, r.el, { ink: "hot", cov: 0.5, to: 1, soft: 0, slot: "foil", seed: 820, alpha: 0.7 });
          }
        })(B.rows[i], i);
      }

      if (B.leader) {
        b = band(doc, B.sheet, "lbx-over");
        slab = add(b, mk(doc, "div", "lbx-slab"));
        add(slab, mk(doc, "div", "lbx-eyebrow", (B.title || "").toUpperCase()));
        add(slab, mk(doc, "div", "lbx-rec", B.leader.score || ""));
        add(slab, mk(doc, "div", "lbx-who", B.leader.name || "Rank 1"));
        A.wash(doc, slab, { ink: "win", cov: 0.9, to: 1, soft: 0, alpha: 0.55, slot: "slab", seed: 11 });
        (function (recEl) {
          if (!recEl) return;
          var bx = recEl.offsetLeft, by = recEl.offsetTop + recEl.offsetHeight - 10;
          var px = Math.round(parseFloat((doc.defaultView || window).getComputedStyle(recEl).fontSize) || 60);
          A.screen(doc, slab, function (g, w, h, K) {
            K.text(g, String(B.leader.score || ""), bx + maxOff * 1.7, by + maxOff, { font: K.font(900, px, "disp"), align: "left", cov: 0.9 });
          }, { ink: "key", slot: "slabmiss", layer: "under", seed: 12,
               key: "slabmiss|" + (B.leader.score || "") + "|" + maxOff + "|" + px });
        })(slab.querySelector(".lbx-rec"));
        add(b, mk(doc, "p", "lbx-foot", B.crowd || (B.field ? fmtInt(B.field) + " GMs on this plate" : "")));
      }
    }
  };

  /* ======================================================================
     6. THE PRINT
     ====================================================================== */

  var print = {
    id: "print",
    name: "The print",
    note: "The board's head is a riso print of the leader's whole season. The rows are its caption, measured against one scale.",
    css: function () {
      var S = sel("print");
      return [
        sheetReset(S, "var(--t-print-paper)"),
        S + " .rs-head { padding: 10px 14px 4px; }",
        S + " .rs-title { font-family: var(--t-mono); font-size: 11.5px; letter-spacing: .16em; text-transform: uppercase; color: var(--t-text-2); }",
        /* THE GROUND IS THE PICTURE. A printed poster, 168px of it, the board's own head. */
        S + " .lbx-band { height: 150px; }",
        S + " .lbx-print { position: absolute; inset: 0; }",
        S + " .lbx-cap { position: absolute; left: 0; right: 0; bottom: 0; z-index: 3; padding: 16px 13px 8px;",
        "    background: linear-gradient(to top, var(--t-print-paper) 12%, rgb(var(--t-print-paper-rgb) / .72) 56%, transparent); }",
        S + " .lbx-who { font-family: var(--t-disp); font-weight: 800; font-size: 21px; line-height: 1; letter-spacing: .03em;",
        "    text-transform: uppercase; color: var(--t-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
        S + " .lbx-sub { margin-top: 2px; font-family: var(--t-mono); font-size: 10.5px; letter-spacing: .07em; color: var(--t-offset); }",
        /* THE CAPTION BLOCK. Rows lose their boxes and their rules: this is the plate's caption,
           and the only art on a line is its tick on the gutter scale. */
        S + " .rs-scroll { padding: 8px 12px 14px; }",
        S + " .lb-list { position: relative; padding-left: 20px; gap: 1px; }",
        S + " .lb-list > .lb-row { display: flex; align-items: baseline; gap: 9px; min-height: 32px; padding: 4px 2px;",
        "    border: 0; background: none; }",
        S + " .lb-list > .lb-row .lb-rank { flex: none; width: 3.6ch; font-family: var(--t-mono); font-size: 12px; text-align: right;",
        "    color: var(--t-text-2); font-variant-numeric: lining-nums tabular-nums; }",
        S + " .lb-list > .lb-row .lb-name { font-family: var(--t-body); font-weight: 500; font-size: 14.5px; color: var(--t-text); }",
        S + " .lb-list > .lb-row .lb-score { flex: none; font-family: var(--t-mono); font-size: 13px; color: var(--t-text); }",
        /* the leader's line is hidden: their name and record are IN the picture */
        /* A CLASS, NOT :first-child. The gutter canvas is inserted as the list's first child, so
           `.lb-row:first-child` stops matching anything the moment the art lands. */
        S + " .lb-list > .lb-row.is-head { display: none; }",
        /* YOUR LINE is the only one in the display face, and the only tick with a stem. */
        S + " .lb-list > .lb-you, " + S + " .lb-list > .lb-ghost { background: none; border-radius: 0; border-left: 0; }",
        S + " .lb-you .lb-name, " + S + " .lb-ghost .lb-name { font-family: var(--t-disp); font-weight: 800; font-size: 17px;",
        "    letter-spacing: .04em; text-transform: uppercase; color: var(--t-text); }",
        S + " .lb-you .lb-score, " + S + " .lb-ghost .lb-score { font-weight: 700; color: var(--t-text); }",
        S + " .lbx-gutter { position: absolute; left: 0; top: 0; width: 16px; z-index: 1; pointer-events: none; }",
        S + " .lb-tag, " + S + " .lb-sub { font-family: var(--t-mono); font-size: 10.5px; text-transform: none; color: var(--t-text-2); }",
        S + " .lb-crowd { font-family: var(--t-mono); font-size: 11px; color: var(--t-text-2); }",
        S + " .lb-tab { font-family: var(--t-mono); font-size: 11px; letter-spacing: .1em; }",
        S + " .lb-tab.on { color: var(--t-offset); border-color: var(--t-offset); }",
        S + " .lbx-band canvas[data-lb-art] { mix-blend-mode: normal; }",
        "@media (max-width: 340px) { " + S + " .lbx-band { height: 138px; } " + S + " .lbx-who { font-size: 18px; } }"
      ].join("\n");
    },
    paint: function (doc, recipe) {
      var A = ART(), B = read(doc, recipe), b, host, cap, gut, med, pal, id, i, sum = 0;
      clean(doc);
      if (!B.sheet) return;
      stock(doc, B.sheet, "night", 0.09);
      if (!A || !B.rows.length || !B.leader) return;

      /* THE PALETTE IS A FACT ABOUT THE DAY. The engine already chooses golden, dusk or night
         from the win rate, so a board where the room got wrecked prints at night and a soft day
         prints golden. Nobody has to read a number to know which kind of day it was. */
      for (i = 0; i < B.rows.length; i++) sum += B.rows[i].t;
      med = sum / B.rows.length;
      pal = med >= 0.62 ? "golden" : (med >= 0.34 ? "dusk" : "night");
      id = sceneFor(B, recipe);

      b = band(doc, B.sheet, "lbx-print-band");
      host = add(b, mk(doc, "div", "lbx-print"));
      /* The print IS the board's head: spec.games is the leader's 82 games as the ridge, the
         record prints in 148px display type in two inks off register, the gauge colours the
         picture only as far as the win rate, and spec.context is the board's own name. */
      A.scene(doc, id, host, {
        wins: B.leader.p.kind === "rec" ? B.leader.p.wins : 82,
        seed: (recipe && recipe.seed) || 82,
        pal: pal,
        context: (B.title || "").toUpperCase() + (B.field ? "  " + fmtInt(B.field) + " GMs" : ""),
        fit: "cover", focus: "top", slot: "poster"
      });
      cap = add(b, mk(doc, "div", "lbx-cap"));
      add(cap, mk(doc, "div", "lbx-who", B.leader.name || "Rank 1"));
      add(cap, mk(doc, "div", "lbx-sub", (B.leader.score || "") + (B.crowd ? "   " + B.crowd : "")));
      reward(doc, b);

      /* THE LEADER IS NOT A ROW. Their name and record are in the picture, so their line comes
         out of the caption entirely. Never when the leader is also the viewer, and never on a
         board short enough that removing a line would leave two. */
      if (!B.leader.you && B.rows.length >= 3 && B.leader.el) {
        B.leader.el.className += " is-head";
      }

      /* THE GUTTER SCALE: one canvas for the whole caption block, a tick per line at its own
         score on a scale shared with every other line, so four wins behind is a distance you
         can see. Your tick carries a stem through the scale. */
      if (B.list) {
        gut = mk(doc, "div", "lbx lbx-gutter");
        gut.style.height = Math.max(40, B.list.offsetHeight) + "px";
        B.list.insertBefore(gut, B.list.firstChild);
        A.screen(doc, gut, function (g, w, h, K) {
          var k, rr, y, len;
          g.fillStyle = K.tone(0.3);
          g.fillRect(w - 2.5, 0, 1.5, h);
          for (k = 0; k < B.rows.length; k++) {
            rr = B.rows[k];
            y = (1 - cl01(rr.t)) * (h - 6) + 3;
            len = 5 + 9 * cl01(rr.t);
            g.fillStyle = K.tone(rr.you ? 0.1 : 0.88);
            g.fillRect(w - len, y - 1, len, 2);
          }
        }, { ink: "win", slot: "scale", layer: "under", seed: 909, key: "scale|" + B.rows.length + "|" + B.boardId });
        if (B.you) {
          A.screen(doc, gut, function (g, w, h, K) {
            var y = (1 - cl01(B.you.t)) * (h - 6) + 3;
            g.fillStyle = K.tone(0.95);
            g.fillRect(0, y - 1.5, w, 3);
            g.beginPath(); g.moveTo(w, y - 6); g.lineTo(w - 7, y); g.lineTo(w, y + 6); g.closePath(); g.fill();
          }, { ink: "you", slot: "mine", layer: "over", seed: 910, key: "myscale|" + B.you.t.toFixed(3) });
        }
      }
    }
  };

  /* ======================================================================
     THE LIST
     ====================================================================== */

  LB.looks = {
    LIST: [gangrun, rail, strips, ticket, overprint, print]
  };
}());
