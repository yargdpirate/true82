/* ---------- THE LEADERBOARD LAB: THE ART LOOKS (docs/leaderboard-lab/looks.js) ----------
   Eleven art directions for the boards, as scoped CSS generators. SPEC.md names them; this file
   builds them. Three are deliberately quiet (BOX SCORE, SPLIT FOUNTAIN, RANSOM NOTE), three are
   deliberately loud (HALFTONE LADDER, NIGHT MARQUEE, WOOD TYPE), and they are kept apart on purpose:
   the owner is choosing between them, so flattening them toward a house middle would waste the lab.

   RULES THIS FILE KEEPS, all of them from CONTRACT.md:
   - Every selector is scoped under [data-look="<id>"], which lab.js sets on the frame's <html>.
     Nothing leaks between looks.
   - Colour and type come only from var(--t-*). No hex, no font stack. Sizes and spacing are free.
   - One meaning per colour, held across all eleven: --t-you is the viewer and nothing else,
     --t-hot / --t-hot-hi / --t-print-sun is the top of the board (fire gold, a gain), --t-accent is
     the brand and the one action, --t-metal / --t-rule are ornament, --t-label is a small caps
     label. Red (--t-bad, --t-loss) never appears: a leaderboard has no bad news on it, and finishing
     74-8 is not a failure.
   - The viewer's own row is findable WITHOUT colour in every look: a bar, a solid rule where the
     others are dashed, a band, or a weight change. Colour is the second signal, never the only one.
   - Legible at 320px in every look: the rank is never under 12px, the name never under 13px, the
     score never under 12px, and no glow or screen ever lands on small type.
   - Nothing touches the DOM at load time. paint() runs only when lab.js calls it, and every paint
     fails soft and silent when the site's riso engines (T82PRINT, T82RISO) are not on the frame.
   - Deterministic: no Math.random, no Date.now. Every paint that needs numbers draws them from the
     recipe's seed through LB.data.rng.
   ES5, like the engines. */
window.LB = window.LB || {};
(function () {
  "use strict";

  /* ================= small shared helpers ================= */

  function sel(id) { return '[data-look="' + id + '"]'; }

  /* A list that is really the top of the board. boards.js puts .lb-window ON the list (the AROUND YOU
     slice and the pinned row both carry it) and uses [data-part="card"] for the YOU card, which is not
     ranked at all. So the medal treatments key off a list that is neither, and ranks 7, 8 and 9 in a
     window are never gilded as though they were the top three.
     NOTE: .lb-lead in boards.js is the list's HEADER strip ("4,412 GMs" opposite the text button), not
     a pinned leader row, whatever CONTRACT.md's reserved-name list suggested. It is styled as a header
     below and no look treats it as a row. */
  /* A windowed list still pins rank 1 in its first slot (data.js), so the leader
     treatment must reach it; only the gap row and the card lists are excluded. */
  function topList(s) { return s + ' .lb-list:not([data-part="card"])'; }
  function top3(s) { return topList(s) + " > .lb-row:nth-child(-n+3)"; }
  function first(s) { return topList(s) + " > .lb-row:first-child"; }
  // A child selector pushed onto EVERY selector in a comma list. first() and top3() return lists, so
  // "list + ' .lb-rank'" would reach the cells of the last one only, and silently miss the rest.
  function kids(list, child) {
    var p = list.split(","), out = [], i;
    for (i = 0; i < p.length; i++) out.push(p[i].trim() + " " + child);
    return out.join(", ");
  }

  function rng(seed) {
    try { if (window.LB && window.LB.data && window.LB.data.rng) return window.LB.data.rng(seed); } catch (e) {}
    var s = (seed >>> 0) || 1;      // the same small LCG data.js uses, so looks stay reproducible alone
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function winOf(doc) { try { return doc.defaultView || window; } catch (e) { return null; } }
  function rootOf(doc) { return doc && doc.documentElement ? doc.documentElement : null; }

  function drop(doc, cls) {
    var n = doc.querySelectorAll("." + cls), i;
    for (i = 0; i < n.length; i++) if (n[i].parentNode) n[i].parentNode.removeChild(n[i]);
  }
  // A rank whose numeral was replaced by a printed one keeps the digits in data-rank, so a repaint
  // (or a repaint that fails) always has the plain numeral to fall back to.
  function restoreRanks(doc) {
    var n = doc.querySelectorAll(".lb-rank[data-rank]"), i;
    for (i = 0; i < n.length; i++) n[i].textContent = n[i].getAttribute("data-rank");
  }
  function rowsIn(doc) { return doc.querySelectorAll(".lb-list > .lb-row"); }
  function rankOf(row) {
    var el = row.querySelector(".lb-rank"), t, d;
    if (!el) return 0;
    t = el.getAttribute("data-rank");
    if (t === null) t = el.textContent;
    d = String(t).replace(/[^0-9]/g, "");
    return d ? parseInt(d, 10) : 0;
  }
  // A record off a score cell ("78-4", a hyphen or either long dash), or null when the board's score
  // is not a record at all (a net, money, a count of days).
  var RECORD = new RegExp("(\\d{1,2})\\s*[-\\u2013\\u2014]\\s*(\\d{1,2})");
  function recordOf(row) {
    var el = row.querySelector(".lb-score"), m, w, l;
    if (!el) return null;
    m = String(el.textContent).match(RECORD);
    if (!m) return null;
    w = +m[1]; l = +m[2];
    if (w + l < 4 || w + l > 200) return null;
    return { w: w, l: l, n: w + l };
  }
  // n dots whose win count is proportional to the record, losses spread evenly (Bresenham, so the
  // count is exact and no two land on the same night), then rotated by the seed so two identical
  // records do not print the identical strip. Wins-proportional, not the true game order: the real
  // per-night string is not stored yet, and SPEC.md says so out loud.
  function sampleGames(rec, n, off) {
    var lossN = Math.round(n * rec.l / rec.n), out = [], rot = [], prev = 0, cur, i;
    if (lossN > n) lossN = n;
    for (i = 0; i < n; i++) {
      cur = Math.floor((i + 1) * lossN / n);
      out.push(cur > prev ? 0 : 1);
      prev = cur;
    }
    for (i = 0; i < n; i++) rot.push(out[(i + (off % n) + n) % n]);
    return rot;
  }

  /* The parts the board grew that the site has no CSS for yet: the crowd line, a row's second line,
     the #TAG, the signed-out ghost line, the AROUND YOU wrapper, the pinned leader, the scope row,
     the text button in the list header, a mode chip and the empty state. Every look starts from these
     so none of them is ever unstyled; a look that cares overrides what it cares about. */
  function parts(s) {
    return [
      // flex-basis 0, not auto: the name holds the tag, the chip and the sub inside it, so sized to
      // its content it would shove the score off the row. At basis 0 it grows into whatever is left
      // and ellipsises there, which is what keeps every row one line at 320px.
      s + " .lb-row > .lb-name { flex: 1 1 0%; min-width: 0;" +
        " overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
      s + " .lb-row > .lb-rank, " + s + " .lb-row > .lb-score { flex: none; }",
      s + " .lb-row > .lb-strip { flex: none; }",
      s + " .lb-name .lb-tag { margin-left: 5px; }",
      s + " .lb-tag { font-family: var(--t-mono); font-size: 11px; letter-spacing: 0.02em; color: var(--t-label); }",
      s + " .lb-sub { font-family: var(--t-mono); font-size: var(--t-fs-data); line-height: 1.35; color: var(--t-text-2); }",
      // the row's mode chip only: .lb-chip is also on the mode <select> in the header, which keeps
      // its own input treatment because a look has no business restyling a native control
      s + " .lb-row .lb-chip { display: inline-flex; align-items: center; min-height: 19px; padding: 2px 6px 1px;" +
        " border: 1px solid var(--t-rule); border-radius: var(--t-r-chip); background: transparent; box-shadow: none;" +
        " font-family: var(--t-mono); font-weight: 400; font-size: 11px; letter-spacing: 0.07em;" +
        " text-transform: uppercase; color: var(--t-text-2); }",
      // the gap row ("23 GMs between"): a spacer, never a rank. Its ellipsis never takes medal ink.
      s + ' .lb-row[data-row="gap"] { opacity: 0.72; }',
      s + ' .lb-row[data-row="gap"] .lb-rank { color: var(--t-text-2); font-size: 12px; font-weight: 400; }',
      s + " .lb-crowd { margin: 0; font-family: var(--t-body); font-size: var(--t-fs-small); line-height: 1.4; color: var(--t-text-2); }",
      // the header strip over the list: boards.js lays it out inline, so this is type and spacing only
      s + " .lb-lead { margin: 2px 0 4px; padding-bottom: 4px; border-bottom: 1px solid rgb(var(--t-rule-rgb) / .5); }",
      s + " .lb-lead .lb-sub { font-size: var(--t-fs-small); color: var(--t-text-2); }",
      // the scope segment row rides on .lb-tabs: one row, never spread, never a second line
      s + " .lb-seg { display: flex; flex-wrap: nowrap; gap: 6px; width: 100%; }",
      s + " .lb-more { appearance: none; -webkit-appearance: none; margin: 0; padding: 2px 0; min-height: 44px;" +
        " border: 0; background: none; box-shadow: none; cursor: pointer; white-space: nowrap; color: var(--t-accent);" +
        " font-family: var(--t-disp); font-weight: 700; font-size: 12.5px; letter-spacing: 0.06em; text-transform: uppercase; }",
      // the signed-out line is a paragraph; the signed-out ROW is your own season with no name on it
      // yet, so it gets a dashed bar: the same place as .lb-you's bar, visibly not yet the real thing
      s + " .lb-ghost:not(.lb-row) { margin: 0; padding-left: 9px; border-left: 3px solid var(--t-rule);" +
        " font-family: var(--t-body); font-size: var(--t-fs-small); line-height: 1.45; color: var(--t-text-2); }",
      s + " .lb-row.lb-ghost { padding-left: 7px; border-left: 3px dashed var(--t-rule); border-radius: 4px; }",
      s + " .lb-row.lb-ghost .lb-name { font-style: italic; color: var(--t-text-2); }",
      s + " .lb-empty { margin: 0; font-family: var(--t-body); font-size: var(--t-fs-body); line-height: 1.45; color: var(--t-text); }"
    ].join("\n");
  }

  /* ================= the eleven looks ================= */

  var LIST = [

    /* The newspaper agate column: no ornament at all, hierarchy entirely in type, and the most
       legible leaderboard anyone will build. The control arm. */
    {
      id: "boxscore",
      name: "Box score",
      note: "The agate column. No ornament, hierarchy in type alone, and the easiest of the eleven to read.",
      css: function () {
        var s = sel("boxscore");
        return [
          parts(s),
          s + " .lb-list { gap: 0; }",
          s + " .lb-row { gap: 8px; padding: 7px 2px; align-items: baseline;" +
            " border-bottom: 1px solid rgb(var(--t-rule-rgb) / .5); }",
          // 3.5ch of tabular mono: four digits fit, so the names column never jogs between 99 and 100
          s + " .lb-rank { width: 3.5ch; flex: none; text-align: right; font-family: var(--t-mono); font-size: 12px;" +
            " color: var(--t-text-2); font-variant-numeric: lining-nums tabular-nums; }",
          s + " .lb-name { font-family: var(--t-body); font-size: 14px; font-weight: 400; color: var(--t-text); }",
          s + " .lb-score { font-family: var(--t-mono); font-size: 13px; color: var(--t-text-2);" +
            " font-variant-numeric: lining-nums tabular-nums; }",
          // the top three rise and change ink; rank 4 and down is not decorated at all
          top3(s) + " .lb-rank { font-size: 15px; color: var(--t-hot-hi); }",
          top3(s) + " .lb-score { font-size: 15px; color: var(--t-hot-hi); }",
          top3(s) + " .lb-name { font-size: 15px; }",
          // your row: the left bar is the non-colour signal, the weight is the second one
          s + " .lb-you { padding-left: 7px; border-left: 3px solid var(--t-you);" +
            " background: rgb(var(--t-you-rgb) / .14); border-radius: 4px; }",
          s + " .lb-you .lb-name { font-weight: 600; color: var(--t-you); }",
          s + " .lb-you .lb-rank, " + s + " .lb-you .lb-score { color: var(--t-you); }"
        ].join("\n");
      }
    },

    /* The list printed on the game's own riso stock, with the top ten ranks screened as halftone
       numerals: the ink stops exactly where the achievement does. */
    {
      id: "halftone",
      name: "Halftone ladder",
      note: "Printed on the game's own riso stock. The top ten ranks are screened ink; rank 11 down is plain.",
      css: function () {
        var s = sel("halftone");
        return [
          parts(s),
          s + " .rules-sheet { background-color: var(--t-print-paper); }",
          s + " .lb-list { padding: 4px 8px; border-radius: var(--t-r-card);" +
            " background-color: var(--t-print-paper);" +
            " background-image: var(--lb-stock, none); background-size: 240px auto; background-repeat: repeat;" +
            " background-blend-mode: var(--t-print-blend); }",
          s + " .lb-row { gap: 8px; padding: 6px 2px; align-items: center;" +
            " border-bottom: 1px solid rgb(var(--t-rule-rgb) / .45); }",
          // 42px of gutter, because the screened numeral is printed at 16px 900 into a 40px canvas
          s + " .lb-rank { width: 42px; flex: none; text-align: right; font-family: var(--t-mono); font-size: 14px;" +
            " font-weight: 700; color: var(--t-text-2); font-variant-numeric: lining-nums tabular-nums; }",
          // the ink stops where the achievement does: the top ten carry it, rank 11 and down is plain
          // mono. The same holds with no engine on the frame, which is this look's whole fallback.
          topList(s) + " > .lb-row:nth-child(-n+10) .lb-rank { color: var(--t-print-pop); }",
          s + " .lb-rank canvas { display: block; width: 40px; height: auto; margin-left: auto; }",
          s + " .lb-name { font-family: var(--t-body); font-size: 14px; color: var(--t-text); }",
          s + " .lb-score { font-family: var(--t-mono); font-size: 13px; color: var(--t-text-2);" +
            " font-variant-numeric: lining-nums tabular-nums; }",
          s + " .lb-tab { border-color: rgb(var(--t-rule-rgb) / .8); }",
          s + " .lb-crowd, " + s + " .lb-ghost { color: var(--t-text-2); }",
          s + " .lb-you { padding-left: 7px; border-left: 3px solid var(--t-you);" +
            " background: rgb(var(--t-you-rgb) / .16); border-radius: 4px; }",
          s + " .lb-you .lb-name { font-weight: 600; color: var(--t-you); }",
          s + " .lb-you .lb-rank, " + s + " .lb-you .lb-score { color: var(--t-you); }"
        ].join("\n");
      },
      paint: function (doc, recipe) {
        var win = winOf(doc), root = rootOf(doc), rows, el, cv, g, K, txt, rank, i;
        var W = 40, H = 22, D = 2;
        if (!win || !root) return;
        try {
          // one call per theme, cached inside the engine: the stock the rows sit on
          if (win.T82PRINT && win.T82PRINT.paper) root.style.setProperty("--lb-stock", "url(" + win.T82PRINT.paper(root) + ")");
        } catch (e) {}
        if (!win.T82RISO || !win.T82RISO.kit) return;
        drop(doc, "lb-screen");
        restoreRanks(doc);
        rows = rowsIn(doc);
        for (i = 0; i < rows.length; i++) {
          rank = rankOf(rows[i]);
          el = rows[i].querySelector(".lb-rank");
          if (!el || !rank || rank > 10) continue;
          txt = el.getAttribute("data-rank");
          if (txt === null) { txt = el.textContent; el.setAttribute("data-rank", txt); }
          try {
            cv = doc.createElement("canvas");
            cv.className = "lb-screen";
            cv.width = W * D; cv.height = H * D;
            g = cv.getContext("2d");
            g.scale(D, D);
            K = win.T82RISO.kit(root, g);
            // 16px at 900: the screen never lands on anything smaller, and the pop ink is the one
            // that stays readable on this stock (see the note in the module's report)
            K.text(g, String(txt).replace(/[^0-9]/g, ""), W - 2, H - 5,
              { ink: "pop", cov: 0.97, font: K.font(900, 16, "mono"), align: "right" });
          } catch (e2) { return; }
          el.textContent = "";
          el.setAttribute("aria-label", "Rank " + txt);
          el.appendChild(cv);
        }
      }
    },

    /* Every row is a perforated ticket, which is the object the game already deals: a stub gutter for
       the rank and the score punched into its own well. */
    {
      id: "ticket",
      name: "Ticket stub",
      note: "Each row is a perforated ticket, the object the game already deals. The score is punched into a well.",
      css: function () {
        var s = sel("ticket");
        return [
          parts(s),
          s + " .lb-list { gap: 6px; }",
          s + " .lb-row { gap: 8px; padding: 8px 10px 8px 8px; align-items: center; border-bottom: 0;" +
            " background: var(--t-ground-2); border-radius: var(--t-r-card);" +
            " border-left: 2px dashed var(--t-rule); }",
          s + " .lb-rank { width: 3.5ch; flex: none; text-align: center; font-family: var(--t-mono); font-size: 12px;" +
            " font-weight: 700; letter-spacing: 0.04em; color: var(--t-label);" +
            " font-variant-numeric: lining-nums tabular-nums; }",
          s + " .lb-name { font-family: var(--t-body); font-size: 14px; color: var(--t-text); }",
          // the well: the score gets its own contrast ground, the way a punched figure does on a stub
          s + " .lb-score { padding: 2px 7px 3px; border-radius: 5px; background: var(--t-ground-3);" +
            " box-shadow: inset 0 1px 2px rgb(var(--t-shadow-rgb) / .5);" +
            " font-family: var(--t-mono); font-size: 13px; color: var(--t-text);" +
            " font-variant-numeric: lining-nums tabular-nums; }",
          s + " .lb-sub { padding-left: 2px; }",
          // the top three carry the metal edge; nothing else does
          top3(s) + " { border-top: 3px solid var(--t-metal); }",
          // your ticket: the perforation goes SOLID. Dashed to solid is the non-colour signal.
          s + " .lb-you { border-left: 4px solid var(--t-you); background: var(--t-ground-2);" +
            " box-shadow: inset 0 0 0 1px rgb(var(--t-you-rgb) / .45); }",
          s + " .lb-you .lb-name { font-weight: 600; color: var(--t-you); }",
          s + " .lb-you .lb-rank { color: var(--t-you); }"
        ].join("\n");
      }
    },

    /* The shape of a season sitting beside its number: one riso month strip per row, wins as coins
       and losses as rings, in the game's own visual language. */
    {
      id: "strip",
      name: "Season strip",
      note: "A riso strip of the season beside each record: wins as coins, losses as rings. Top eleven rows only.",
      css: function () {
        var s = sel("strip");
        return [
          parts(s),
          s + " .lb-list { gap: 0; }",
          s + " .lb-row { gap: 7px; padding: 7px 2px; align-items: center;" +
            " border-bottom: 1px solid rgb(var(--t-rule-rgb) / .45); }",
          s + " .lb-rank { width: 3.5ch; flex: none; text-align: right; font-family: var(--t-mono); font-size: 12px;" +
            " color: var(--t-text-2); font-variant-numeric: lining-nums tabular-nums; }",
          s + " .lb-name { font-family: var(--t-body); font-size: 14px; color: var(--t-text); }",
          s + " .lb-score { font-family: var(--t-mono); font-size: 13px; color: var(--t-text);" +
            " font-variant-numeric: lining-nums tabular-nums; }",
          // pure ornament: it carries no number, so it can never cost the row its legibility
          s + " .lb-strip { display: block; line-height: 0; opacity: 0.95; }",
          s + " .lb-strip canvas { display: block; width: 72px; height: auto; }",
          kids(first(s), ".lb-rank") + ", " + kids(first(s), ".lb-score") + " { color: var(--t-hot-hi); }",
          s + " .lb-you { padding-left: 7px; border-left: 3px solid var(--t-you);" +
            " background: rgb(var(--t-you-rgb) / .14); border-radius: 4px; }",
          s + " .lb-you .lb-name { font-weight: 600; color: var(--t-you); }",
          s + " .lb-you .lb-rank, " + s + " .lb-you .lb-score { color: var(--t-you); }"
        ].join("\n");
      },
      paint: function (doc, recipe) {
        var win = winOf(doc), root = rootOf(doc), rows, rec, cv, holder, R, i;
        var DOTS = 12, PITCH = 17, CAP = 11, done = 0, mine = -1;   // twelve: a month, the engine's own unit
        if (!win || !root || !win.T82RISO || !win.T82RISO.strip) return;
        drop(doc, "lb-strip");
        R = rng((recipe && recipe.seed) || 82);
        rows = rowsIn(doc);
        for (i = 0; i < rows.length; i++) {
          if (rows[i].className.indexOf("lb-you") >= 0) mine = i;
        }
        for (i = 0; i < rows.length; i++) {
          // the top ten rows plus the viewer's own, and never more than eleven canvases
          if (done >= CAP) break;
          if (done >= CAP - 1 && i !== mine && mine >= 0) continue;
          rec = recordOf(rows[i]);
          if (!rec) continue;
          try {
            // cssW is DOTS * the engine's own 17px minimum pitch, so the strip comes out ONE row
            // tall (at a literal cssW of 64 that pitch wraps a month into four rows and 77px of
            // height); the CSS then shows the result at 72px, the width SPEC.md asks for
            cv = win.T82RISO.strip({
              root: root, d: 2, cssW: DOTS * PITCH,
              games: sampleGames(rec, DOTS, Math.floor(R() * DOTS))
            });
          } catch (e) { return; }
          if (!cv) return;
          holder = doc.createElement("span");
          holder.className = "lb-strip";
          holder.setAttribute("aria-hidden", "true");
          holder.appendChild(cv);
          rows[i].appendChild(holder);
          done++;
        }
      }
    },

    /* The arena scoreboard: one glow, on the score column only, and the leader is the single thing
       on the page that lights up gold. */
    {
      id: "marquee",
      name: "Night marquee",
      note: "The arena scoreboard. The scores glow, the leader alone goes gold, and nothing else lights up.",
      css: function () {
        var s = sel("marquee");
        return [
          parts(s),
          s + " .rules-sheet { background-color: var(--t-ground); }",
          s + " .lb-list { gap: 1px; padding: 2px 6px; border-radius: var(--t-r-card); background: var(--t-ground); }",
          s + " .lb-row { gap: 9px; padding: 7px 4px; align-items: baseline;" +
            " border-bottom: 1px solid rgb(var(--t-rule-rgb) / .3); }",
          s + " .lb-rank { width: 3.5ch; flex: none; text-align: right; font-family: var(--t-mono); font-size: 12px;" +
            " color: var(--t-metal); font-variant-numeric: lining-nums tabular-nums; }",
          // no glow on the name, ever: glow on small type is this look's only failure mode
          s + " .lb-name { font-family: var(--t-body); font-size: 14px; color: var(--t-text); text-shadow: none; }",
          s + " .lb-score { font-family: var(--t-disp); font-weight: 800; font-size: var(--t-fs-head);" +
            " line-height: 1; letter-spacing: 0.01em; color: var(--t-offset);" +
            " text-shadow: 0 0 10px rgb(var(--t-offset-rgb) / .35);" +
            " font-variant-numeric: lining-nums tabular-nums; }",
          s + " .lb-sub { color: var(--t-text-2); text-shadow: none; }",
          s + " .lb-chip { border-color: var(--t-metal-deep); }",
          // the leader: the one gold light in the building, plus a bar so it is not light alone
          first(s) + " { border-left: 2px solid var(--t-hot); padding-left: 6px; }",
          kids(first(s), ".lb-score") + " { color: var(--t-hot); text-shadow: 0 0 12px rgb(var(--t-hot-rgb) / .35); }",
          kids(first(s), ".lb-rank") + " { color: var(--t-hot-hi); }",
          s + " .lb-you { padding-left: 6px; border-left: 3px solid var(--t-you);" +
            " background: rgb(var(--t-you-rgb) / .14); border-radius: 4px; }",
          s + " .lb-you .lb-name { font-weight: 700; }",
          // your score drops the glow: on your own row the marker is the bar and the weight, not light
          s + " .lb-you .lb-score { color: var(--t-you); text-shadow: none; }",
          s + " .lb-you .lb-rank { color: var(--t-you); }"
        ].join("\n");
      }
    },

    /* The brass plaque the sheet already wears, applied per row to the top three only: the frame is
       the trophy and everything under it is the record. */
    {
      id: "plaque",
      name: "Brass plaque",
      note: "The plaque frame on the top three rows only, so the frame is the trophy. Shows the shipped outline card too.",
      css: function () {
        var s = sel("plaque");
        var three = top3(s);
        var threeBefore = top3(s) + "::before";
        var threeAfter = top3(s) + "::after";
        return [
          parts(s),
          s + " .lb-list { gap: 0; }",
          s + " .lb-row { gap: 8px; padding: 7px 2px; align-items: baseline;" +
            " border-bottom: 1px solid rgb(var(--t-rule-rgb) / .5); }",
          s + " .lb-rank { width: 3.5ch; flex: none; text-align: right; font-family: var(--t-mono); font-size: 12px;" +
            " color: var(--t-text-2); font-variant-numeric: lining-nums tabular-nums; }",
          s + " .lb-name { font-family: var(--t-body); font-size: 14px; color: var(--t-text); }",
          s + " .lb-score { font-family: var(--t-mono); font-size: 13px; color: var(--t-text-2);" +
            " font-variant-numeric: lining-nums tabular-nums; }",
          // the shipped .plq-frame recipe, rebuilt per row: the wash, the inner line, the four rivets
          s + " .lb-list { padding-top: 2px; }",
          three + " { position: relative; margin: 0 0 7px; padding: 11px 14px; border-bottom: 0;" +
            " border: 2px solid var(--t-accent-edge); border-radius: 4px;" +
            " background: radial-gradient(140% 120% at 50% 0%, rgb(var(--t-accent-rgb) / .09), transparent 55%), var(--t-ground-2);" +
            " box-shadow: inset 0 0 0 1px rgb(var(--t-shadow-rgb) / .55)," +
            " inset 0 0 0 4px rgb(var(--t-accent-face-rgb) / .22)," +
            " 0 3px 10px -4px rgb(var(--t-shadow-rgb) / .55); }",
          threeBefore + " { content: \"\"; position: absolute; inset: 6px; pointer-events: none;" +
            " border: 1px solid rgb(var(--t-accent-face-rgb) / .4); border-radius: 2px; }",
          threeAfter + " { content: \"\"; position: absolute; inset: 0; pointer-events: none;" +
            " background-repeat: no-repeat; background-size: 5px 5px;" +
            " background-position: left 9px top 9px, right 9px top 9px, left 9px bottom 9px, right 9px bottom 9px;" +
            " background-image: radial-gradient(circle, var(--t-metal) 0 2px, transparent 2.4px)," +
            " radial-gradient(circle, var(--t-metal) 0 2px, transparent 2.4px)," +
            " radial-gradient(circle, var(--t-metal) 0 2px, transparent 2.4px)," +
            " radial-gradient(circle, var(--t-metal) 0 2px, transparent 2.4px); }",
          top3(s) + " .lb-rank { font-size: 14px; color: var(--t-hot-hi); }",
          top3(s) + " .lb-score { font-size: 14px; color: var(--t-text); }",
          /* The trap SPEC.md says to show both ways: under the shipped card look the frame becomes a
             white outline with a hard offset shadow and the rivets go away, so the brass version only
             exists if data-card is overridden deliberately. Judge both. */
          '[data-look="plaque"][data-card="outline"] .lb-list:not(.lb-window):not([data-part="card"]) > .lb-row:nth-child(-n+3)' +
            " { background: transparent; border: 2px solid var(--t-text); border-radius: var(--t-r-card);" +
            " box-shadow: 4px 4px 0 rgb(var(--t-text-rgb) / .34); }",
          '[data-look="plaque"][data-card="outline"] .lb-list:not(.lb-window):not([data-part="card"]) > .lb-row:nth-child(-n+3)::before,' +
            ' [data-look="plaque"][data-card="outline"] .lb-list:not(.lb-window):not([data-part="card"]) > .lb-row:nth-child(-n+3)::after' +
            " { display: none; }",
          s + " .lb-you { padding-left: 7px; border-left: 3px solid var(--t-you);" +
            " background: rgb(var(--t-you-rgb) / .14); border-radius: 4px; }",
          s + " .lb-you .lb-name { font-weight: 600; color: var(--t-you); }",
          s + " .lb-you .lb-rank, " + s + " .lb-you .lb-score { color: var(--t-you); }"
        ].join("\n");
      }
    },

    /* One continuous two-ink gradient down the whole list, so depth reads as position without a
       single number changing size or weight. */
    {
      id: "fountain",
      name: "Split fountain",
      note: "One two-ink gradient down the list. Depth reads as position and no number changes weight.",
      css: function () {
        var s = sel("fountain");
        var field = s + " .lb-window, " + s + " :not(.lb-window) > .lb-list";
        return [
          parts(s),
          // at or under .14 alpha at both ends: the rank measures 6.6:1 at the top and 6.1:1 at the
          // bottom of this gradient, which is the whole argument for keeping it this quiet
          field + " { border-radius: var(--t-r-card); padding: 4px 10px;" +
            " background-image: linear-gradient(180deg, rgb(var(--t-print-key-rgb) / .14), rgb(var(--t-print-night-rgb) / .14)); }",
          s + " .lb-list { gap: 0; background: none; }",
          s + " .lb-row { gap: 8px; padding: 8px 2px; align-items: baseline;" +
            " border-bottom: 1px solid rgb(var(--t-light-rgb) / .08); }",
          // every rank and score is the same size and the same ink from row 1 to row 82
          s + " .lb-rank { width: 3.5ch; flex: none; text-align: right; font-family: var(--t-mono); font-size: 12px;" +
            " color: var(--t-text-2); font-variant-numeric: lining-nums tabular-nums; }",
          s + " .lb-name { font-family: var(--t-body); font-size: 14px; font-weight: 400; color: var(--t-text); }",
          s + " .lb-score { font-family: var(--t-mono); font-size: 13px; color: var(--t-text-2);" +
            " font-variant-numeric: lining-nums tabular-nums; }",
          // your row cuts a clean band straight across the gradient: two hard rules, edge to edge
          s + " .lb-you { margin: 0 -10px; padding: 8px 12px; border-radius: 0;" +
            " border-top: 2px solid var(--t-you); border-bottom: 2px solid var(--t-you);" +
            " background: rgb(var(--t-you-rgb) / .14); }",
          s + " .lb-you .lb-name { font-weight: 600; }",
          s + " .lb-you .lb-rank, " + s + " .lb-you .lb-score { color: var(--t-you); }"
        ].join("\n");
      }
    },

    /* Hierarchy inverted: the rank is the ornament, oversized in the display face, and the only look
       here that makes an 82-row list scannable by position alone. */
    {
      id: "woodtype",
      name: "Wood type",
      note: "The rank is the art: oversized display numerals, the name and score dropped underneath them.",
      css: function () {
        var s = sel("woodtype");
        return [
          parts(s),
          s + " .lb-list { gap: 0; }",
          // the letterpress bite: one light rule along each row's top edge
          s + " .lb-row { gap: 9px; padding: 8px 2px 7px; align-items: baseline;" +
            " border-top: 1px solid rgb(var(--t-light-rgb) / .12); border-bottom: 0; }",
          // the widest gutter of the eleven: four display digits at 20px, in ch with tabular figures
          s + " .lb-rank { width: 4.2ch; flex: none; text-align: left; font-family: var(--t-disp); font-weight: 900;" +
            " font-size: 20px; line-height: 1; letter-spacing: 0.01em; color: var(--t-text);" +
            " font-variant-numeric: lining-nums tabular-nums; }",
          s + " .lb-name { font-family: var(--t-body); font-size: 13px; color: var(--t-text-2);" +
            " overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
          s + " .lb-score { font-family: var(--t-mono); font-size: 12px; color: var(--t-text-2);" +
            " font-variant-numeric: lining-nums tabular-nums; }",
          s + " .lb-sub { padding-left: calc(4.2ch + 9px); }",
          kids(first(s), ".lb-rank") + " { font-size: 26px; }",
          // your row: the bar and the weight carry it, and the rank is the thing that changes
          s + " .lb-you { padding-left: 7px; border-left: 4px solid var(--t-you);" +
            " background: rgb(var(--t-you-rgb) / .14); }",
          s + " .lb-you .lb-rank { color: var(--t-you); }",
          s + " .lb-you .lb-name { font-weight: 600; color: var(--t-text); }",
          s + " .lb-you .lb-score { color: var(--t-text); }"
        ].join("\n");
      }
    },

    /* The 82-0 Club as a shelf of cards rather than a ranking, with one real season banner printed on
       the newest: one perfect season, one printed picture. */
    {
      id: "clubcard",
      name: "Club card",
      note: "For the 82-0 Club: every entry is a card, and the newest one carries a real printed season.",
      css: function () {
        var s = sel("clubcard");
        return [
          parts(s),
          s + " .lb-list { gap: 10px; }",
          s + " .lb-row { display: block; padding: 10px 12px; border-bottom: 0;" +
            " background: var(--t-ground-2); border: 1px solid var(--t-line); border-radius: var(--t-r-card); }",
          s + " .lb-row > .lb-rank, " + s + " .lb-row > .lb-name, " + s + " .lb-row > .lb-score { display: block; width: auto; }",
          // the entry number stays a readable label: on this board it is not a rank, it is which one
          s + " .lb-rank { margin: 0 0 2px; font-family: var(--t-mono); font-size: var(--t-fs-data);" +
            " letter-spacing: 0.09em; text-align: left; color: var(--t-label);" +
            " font-variant-numeric: lining-nums tabular-nums; }",
          s + " .lb-name { font-family: var(--t-body); font-size: var(--t-fs-name); font-weight: 600; color: var(--t-text);" +
            " white-space: normal; }",
          // the date line. SPEC.md asks for var(--t-fs-label) here, but this look can be flipped onto
          // the Daily too, where this cell is the RECORD, so it holds at the 12px data size instead.
          s + " .lb-score { margin-top: 3px; font-family: var(--t-mono); font-size: var(--t-fs-data);" +
            " letter-spacing: 0.08em; text-transform: uppercase; color: var(--t-text-2); }",
          s + " .lb-sub { margin-top: 4px; }",
          s + " .lb-row .lb-chip { margin-top: 7px; background: var(--t-accent); border-color: var(--t-accent);" +
            " color: var(--t-accent-ink); font-family: var(--t-disp); font-weight: 700; font-size: 11.5px;" +
            " letter-spacing: 0.07em; }",
          // the newest entry is the feature card: the metal top edge, the wider padding, the print
          first(s) + " { padding: 14px 16px; border-color: var(--t-rule); border-top: 3px solid var(--t-metal); }",
          s + " .lb-print { display: block; margin: 10px 0 0; line-height: 0; }",
          s + " .lb-print canvas { display: block; width: 100%; height: auto; border-radius: 4px; }",
          // your card: the left edge is the marker, not the wash
          s + " .lb-you { border-left: 4px solid var(--t-you); }",
          s + " .lb-you .lb-name { color: var(--t-you); font-weight: 700; }",
          s + " .lb-you .lb-rank { color: var(--t-you); }"
        ].join("\n");
      },
      paint: function (doc, recipe) {
        var win = winOf(doc), root = rootOf(doc), card, R, spec, i, games = [];
        if (!win || !root || !win.T82PRINT || !win.T82PRINT.print) return;
        drop(doc, "lb-print");
        card = doc.querySelector(".lb-list > .lb-row");
        if (!card) return;
        R = rng((recipe && recipe.seed) || 82);
        for (i = 0; i < 82; i++) games.push(1);
        spec = {
          wins: 82, games: games, net: "+21.4", pal: "golden",
          context: "THE 82-0 CLUB", comp: "Greatest of all GOATs",
          names: [], roster: [], seed: Math.floor(R() * 1000000)
        };
        function bake() {
          var out;
          try { out = win.T82PRINT.print(spec, { root: root, width: 560, dpr: 2 }); } catch (e) { return; }
          if (!out || !out.print) return;
          var host = doc.createElement("div");
          host.className = "lb-print";
          host.setAttribute("role", "img");
          host.setAttribute("aria-label", "82 and 0. The shape of the season.");
          if (out.filter) out.print.style.filter = out.filter;
          host.appendChild(out.print);
          card.appendChild(host);
        }
        // one bake, after the display faces land, so the banner's own type is not a fallback
        try {
          if (win.T82PRINT.fonts) win.T82PRINT.fonts(root).then(bake, bake);
          else bake();
        } catch (e) { bake(); }
      }
    },

    /* The YOU card: one riso-screened histogram of every win total the player has ever finished, and
       no other player anywhere on it. */
    {
      id: "histogram",
      name: "Your seasons",
      note: "For the YOU card: a riso histogram of every win total you have finished. No ranks, nobody else.",
      css: function () {
        var s = sel("histogram");
        return [
          parts(s),
          s + " .lb-hist { display: block; margin: 0 0 12px; padding: 10px 12px 8px;" +
            " background: var(--t-ground-2); border: 1px solid var(--t-line); border-radius: var(--t-r-card); }",
          s + " .lb-hist-t { display: block; margin: 0 0 7px; font-family: var(--t-disp); font-weight: 700;" +
            " font-size: 12.5px; letter-spacing: 0.09em; text-transform: uppercase; color: var(--t-text-2); }",
          s + " .lb-hist canvas { display: block; width: 100%; height: auto; }",
          // the axis labels are HTML, not screened ink: nothing under var(--t-fs-label), and the ends
          // and the 82 are the only three things labelled
          s + " .lb-hist-ax { display: flex; justify-content: space-between; gap: 8px; margin-top: 5px;" +
            " font-family: var(--t-mono); font-size: var(--t-fs-label); letter-spacing: 0.06em; color: var(--t-text-2); }",
          s + " .lb-hist-ax b { font-weight: 400; color: var(--t-hot-hi); }",
          s + " .lb-list { gap: 0; }",
          s + " .lb-row { gap: 8px; padding: 9px 2px; align-items: baseline;" +
            " border-bottom: 1px solid rgb(var(--t-rule-rgb) / .45); }",
          s + " .lb-rank { width: auto; flex: none; text-align: left; font-family: var(--t-mono); font-size: 12px;" +
            " letter-spacing: 0.06em; text-transform: uppercase; color: var(--t-label); }",
          s + " .lb-name { font-family: var(--t-body); font-size: 14px; color: var(--t-text-2); }",
          s + " .lb-score { font-family: var(--t-mono); font-size: 15px; color: var(--t-text);" +
            " font-variant-numeric: lining-nums tabular-nums; }",
          s + " .lb-you { padding-left: 7px; border-left: 3px solid var(--t-you); background: rgb(var(--t-you-rgb) / .14); border-radius: 4px; }",
          s + " .lb-you .lb-name { font-weight: 600; }",
          s + " .lb-you .lb-score { color: var(--t-you); }"
        ].join("\n");
      },
      paint: function (doc, recipe) {
        var win = winOf(doc), root = rootOf(doc), anchor, R, K, cv, g, i, j;
        var W = 288, H = 120, D = 2, LO = 34, HI = 82, BUCKET = 4;
        if (!win || !root || !win.T82RISO || !win.T82RISO.kit) return;
        drop(doc, "lb-hist");
        anchor = doc.querySelector('[data-part="card"]') || doc.querySelector(".lb-list") || doc.querySelector(".lb-lead");
        if (!anchor || !anchor.parentNode) return;
        R = rng((recipe && recipe.seed) || 82);
        // every season this player has finished, drawn from the seed: a sum of three uniforms, so the
        // middle of the range is where the seasons are and 82 is where they are not
        var seasons = [], w, n = 24, had82 = false;
        for (i = 0; i < n; i++) {
          w = Math.round(46 + (R() + R() + R() - 1.5) * 18);
          if (w < 8) w = 8;
          if (w > 81) w = 81;
          seasons.push(w);
        }
        if (R() < 0.3) { seasons.push(82); had82 = true; }
        var bins = [], nb = Math.ceil((HI - LO + 1) / BUCKET), max = 1;
        for (i = 0; i < nb; i++) bins.push(0);
        for (i = 0; i < seasons.length; i++) {
          j = Math.floor((Math.max(LO, seasons[i]) - LO) / BUCKET);
          if (j > nb - 1) j = nb - 1;
          bins[j]++;
          if (bins[j] > max) max = bins[j];
        }
        try {
          cv = doc.createElement("canvas");
          cv.width = W * D; cv.height = H * D;
          g = cv.getContext("2d");
          g.scale(D, D);
          K = win.T82RISO.kit(root, g);
          var base = H - 10, slot = W / nb, gap = 2.2;
          g.globalCompositeOperation = K.blend;
          for (i = 0; i < nb; i++) {
            if (!bins[i]) continue;
            var bh = Math.max(3, Math.round((base - 6) * bins[i] / max));
            // the 82 column is fire gold when they have ever been there; every other bar is the key ink
            g.fillStyle = K.pat(i === nb - 1 && had82 ? "hot" : "key", 0.92, g);
            g.fillRect(i * slot + gap, base - bh, slot - gap * 2, bh);
          }
          g.fillStyle = K.pat("pop", 0.7, g);
          g.fillRect(0, base, W, 1.4);
        } catch (e) { return; }
        var fig = doc.createElement("figure");
        fig.className = "lb-hist";
        fig.setAttribute("role", "img");
        fig.setAttribute("aria-label", "Every season you have finished, by win total.");
        var t = doc.createElement("span");
        t.className = "lb-hist-t";
        t.appendChild(doc.createTextNode("Every season you have finished"));
        var ax = doc.createElement("div");
        ax.className = "lb-hist-ax";
        var loS = doc.createElement("span");
        loS.appendChild(doc.createTextNode(String(LO) + " wins"));
        var mid = doc.createElement("span");
        mid.appendChild(doc.createTextNode(seasons.length + " seasons"));
        var hiS = doc.createElement(had82 ? "b" : "span");
        hiS.appendChild(doc.createTextNode("82"));
        ax.appendChild(loS); ax.appendChild(mid); ax.appendChild(hiS);
        fig.appendChild(t); fig.appendChild(cv); fig.appendChild(ax);
        anchor.parentNode.insertBefore(fig, anchor);
      }
    },

    /* The art library's ransom look dialled almost all the way down: eighty-one uniform rows and
       exactly one that was pasted in from another print. */
    {
      id: "ransom",
      name: "Ransom note",
      note: "Uniform agate everywhere except the leader, whose line looks pasted in from another print.",
      css: function () {
        var s = sel("ransom");
        var lead = first(s);
        return [
          parts(s),
          s + " .lb-list { gap: 0; }",
          // strictly uniform: no top-three treatment at all, because the scarcity is the whole look
          s + " .lb-row { gap: 8px; padding: 7px 2px; align-items: baseline;" +
            " border-bottom: 1px solid rgb(var(--t-rule-rgb) / .5); }",
          s + " .lb-rank { width: 3.5ch; flex: none; text-align: right; font-family: var(--t-mono); font-size: 12px;" +
            " color: var(--t-text-2); font-variant-numeric: lining-nums tabular-nums; }",
          s + " .lb-name { font-family: var(--t-body); font-size: 14px; color: var(--t-text); }",
          s + " .lb-score { font-family: var(--t-mono); font-size: 13px; color: var(--t-text-2);" +
            " font-variant-numeric: lining-nums tabular-nums; }",
          // the one broken row: two display weights at two sizes on a gold slab, barely off the grid
          lead + " { margin: 2px 0 5px; padding: 6px 9px 7px; border-bottom: 0; border-radius: 3px;" +
            " background: var(--t-hot); transform: rotate(-0.7deg);" +
            " box-shadow: 2px 2px 0 rgb(var(--t-shadow-rgb) / .45); }",
          kids(lead, ".lb-rank") + " { font-family: var(--t-disp); font-weight: 900; font-size: 19px; line-height: 1;" +
            " color: var(--t-accent-ink); }",
          kids(lead, ".lb-name") + " { font-family: var(--t-disp); font-weight: 700; font-size: 16px;" +
            " letter-spacing: 0.02em; color: var(--t-accent-ink); }",
          kids(lead, ".lb-score") + " { font-family: var(--t-disp); font-weight: 900; font-size: 15px; color: var(--t-accent-ink); }",
          kids(lead, ".lb-sub") + ", " + kids(lead, ".lb-tag") + " { color: var(--t-accent-ink); }",
          kids(lead, ".lb-chip") + " { border-color: var(--t-accent-ink); color: var(--t-accent-ink); background: transparent; }",
          s + " .lb-you { padding-left: 7px; border-left: 3px solid var(--t-you);" +
            " background: rgb(var(--t-you-rgb) / .14); border-radius: 4px; }",
          s + " .lb-you .lb-name { font-weight: 600; color: var(--t-you); }",
          s + " .lb-you .lb-rank, " + s + " .lb-you .lb-score { color: var(--t-you); }"
        ].join("\n");
      }
    }
  ];

  LB.looks = {
    LIST: LIST,
    get: function (id) {
      var i;
      for (i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i];
      return LIST[0];
    },
    // the CSS for the recipe's look, ready for one <style> in the frame
    cssFor: function (recipe) {
      var look = LB.looks.get(recipe && recipe.look);
      try { return look.css(recipe || {}); } catch (e) { return ""; }
    }
  };
})();
