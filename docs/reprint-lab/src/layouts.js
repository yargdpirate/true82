/* ---------- TRUE 82 LAB: masthead layouts ----------
   place(A, rc) returns the scene boxes in units of a 1000-wide scene:
     { vh, word: {x, y, w, h, align?, lines?, circle?}, icon: {x, y, s} | null, tag: {x, y, w, h, arc?, knock?} | null,
       wordShape?, lockup?, wordPaper?, wordRole? }   (banner.js header explains every key)
   frame(A) draws behind everything (optional); after(A) draws last (optional).
   frame and after run after the word is laid out, so they can use A.word (bounds, full(g, grow) for knocks).

   Layouts: inline, iconfirst, stacked, badge (Seal), marquee, ticket, pennant, jersey, crest, scoreboard, mark, wordonly.
   New: crest (a shield with the name on a ribbon), scoreboard (the name in lamps on a panel).
   Paper letters (wordPaper) print in the key ink on dark stock, where paper is dark.
   Framed layouts give backClip(g) (their window as a path) so backdrops stay inside the frame.
   inline, iconfirst and wordonly grow taller for a two-line word (A.wordAspect), so the lockup fills the plate. */
(function () {
  var L = window.LAB.layout, R = window.RISO, K = window.LAB.kit, TAU = Math.PI * 2;
  function has(A, id) { return A.rc.adds.indexOf(id) >= 0; }
  function tagOn(A) { return has(A, "tagline") || has(A, "ribbon") || has(A, "arc-text"); }
  // room for the tagline under the name: the ribbon needs a taller slot and room for its tails
  function tagRoom(A) { return !tagOn(A) ? 0 : has(A, "ribbon") ? 96 : has(A, "arc-text") ? 74 : 54; }
  function tagH(A) { return has(A, "ribbon") ? 50 : has(A, "arc-text") ? 60 : 42; }
  function mono(g, size, wt) { g.font = (wt || 600) + " " + size + "px \"IBM Plex Mono\", monospace"; }

  /* Two lines (the name over a big 82) stack into a block about as tall as it is wide, so the side-by-side
     layouts grow taller to it: the word and the icon get the height that fills the plate's width.
     A.wordAspect is that block's width over its height (banner.js measures it before place). */
  function sideBySide(A, iconFirst) {
    var t = tagOn(A), asp = A.rc.lines === "two" ? A.wordAspect : 0;
    if (!asp) {                                       // one line: today's boxes
      return { vh: 280 + tagRoom(A), word: { x: iconFirst ? 300 : 34, y: 34, w: iconFirst ? 666 : 664, h: 212 }, icon: { x: iconFirst ? 36 : 722, y: 26, s: 236 },
        lockup: { order: iconFirst ? "icon-word" : "word-icon", gap: 24 }, tag: t ? { x: iconFirst ? 36 : 34, y: 270, w: 930, h: tagH(A) } : null };
    }
    var H = Math.round(R.clamp(880 / (asp + 1.08), 212, 470)), s = Math.round(H * 1.1);
    var base = H + 68, vh = base + tagRoom(A), iy = 34 + (H - s) / 2, ww = 932 - s - 24;
    return { vh: vh, word: { x: iconFirst ? 34 + s + 24 : 34, y: 34, w: ww, h: H }, icon: { x: iconFirst ? 34 : 966 - s, y: iy, s: s },
      lockup: { order: iconFirst ? "icon-word" : "word-icon", gap: 24 }, tag: t ? { x: 34, y: base - 10, w: 930, h: tagH(A) } : null };
  }
  L({ id: "inline", name: "Inline", blurb: "Wordmark, then the icon. Today's arrangement.",
    place: function (A) { return sideBySide(A, false); } });

  L({ id: "iconfirst", name: "Icon first", blurb: "The icon leads, the name follows.",
    place: function (A) { return sideBySide(A, true); } });

  L({ id: "stacked", name: "Stacked", blurb: "A tall mark over the name, like a team crest.",
    place: function (A) {
      var t = tagOn(A), two = A.rc.lines === "two", wh = two ? 380 : 214, vh = 372 + wh + (t ? 40 + tagRoom(A) : 26);
      return { vh: vh, word: { x: 70, y: 372, w: 860, h: wh }, icon: { x: 345, y: 30, s: 310 }, tag: t ? { x: 70, y: 372 + wh + 28, w: 860, h: tagH(A) + 8 } : null };
    } });

  /* The seal: the name set around the top of a ring, the tagline around the bottom, the icon in the middle
     inside a ring of 82 ticks, one per game. */
  L({ id: "badge", name: "Seal", blurb: "A round seal: the name around the top, the icon in the middle.",
    place: function (A) {
      return { vh: 1000, word: { x: 120, y: 40, w: 760, h: 300, circle: { cx: 500, cy: 500, r: 312, band: 114, span: 2.3, side: "top" } }, wordShape: "circle",
        icon: { x: 340, y: 345, s: 320 }, tag: { x: 150, y: 780, w: 700, h: 60, arc: { cx: 500, cy: 500, r: 404, side: "bottom", span: 1.75, size: 46 } }, seal: { cx: 500, cy: 500, r: 470 },
        backClip: function (g) { R.circle(g, 500, 500, 440); } };
    },
    frame: function (A) {
      var s = A.boxes.seal, tagline = A.rc.adds.indexOf("tagline") >= 0;
      A.put("back", function (g) { g.fillStyle = R.tone(0.18); R.circle(g, s.cx, s.cy, 282); g.fill(); });
      A.put("frame", function (g) {
        g.lineWidth = 16; R.circle(g, s.cx, s.cy, s.r - 8); g.stroke();
        g.lineWidth = 4; R.circle(g, s.cx, s.cy, s.r - 30); g.stroke();
        g.lineWidth = 6; R.circle(g, s.cx, s.cy, 296); g.stroke();
        g.lineWidth = 2.5; R.circle(g, s.cx, s.cy, 284); g.stroke();
      });
      A.put("glow", function (g) {
        for (var i = 0; i < 82; i++) {                 // 82 ticks inside the inner ring, one per game
          var a = -Math.PI / 2 + i / 82 * TAU; g.save(); g.translate(s.cx + Math.cos(a) * 268, s.cy + Math.sin(a) * 268); g.rotate(a); g.fillRect(-7, -2.4, 14, 4.8); g.restore();
        }
        [-1, 1].forEach(function (sd) { R.star(g, s.cx + sd * 362, s.cy + 8, 26); g.fill(); });   // stars between the name and the tagline
        if (!tagline) for (var k = -2; k <= 2; k++) { var b = k * 0.3; R.star(g, s.cx + Math.sin(b) * 372, s.cy + Math.cos(b) * 372, k ? 15 : 22, null, null, -Math.PI / 2 - b); g.fill(); }
      });
    } });

  L({ id: "marquee", name: "Marquee", blurb: "An arena marquee with a bulb border.",
    place: function (A) {
      var t = tagOn(A), vh = 380 + (t ? tagRoom(A) : 0);
      return { vh: vh, word: { x: 96, y: 78, w: 610, h: 196 }, icon: { x: 734, y: 84, s: 180 }, lockup: { order: "word-icon", gap: 28 }, tag: t ? { x: 110, y: 306, w: 780, h: tagH(A) } : null, frameBox: { x: 26, y: 22, w: 948, h: vh - 44 },
        backClip: function (g) { R.roundRect(g, 48, 44, 904, vh - 88, 18); } };
    },
    frame: function (A) {
      var f = A.boxes.frameBox;
      A.put("frame", function (g) { g.lineWidth = 10; R.roundRect(g, f.x, f.y, f.w, f.h, 34); g.stroke(); g.lineWidth = 3; R.roundRect(g, f.x + 22, f.y + 22, f.w - 44, f.h - 44, 18); g.stroke(); });
      A.put("glow", function (g) {
        var step = 30, x, y;
        for (x = f.x + 40; x <= f.x + f.w - 40; x += step) { R.circle(g, x, f.y + 11, 6); g.fill(); R.circle(g, x, f.y + f.h - 11, 6); g.fill(); }
        for (y = f.y + 40; y <= f.y + f.h - 40; y += step) { R.circle(g, f.x + 11, y, 6); g.fill(); R.circle(g, f.x + f.w - 11, y, 6); g.fill(); }
      });
      A.put("back", function (g) { g.fillStyle = R.tone(0.14); R.roundRect(g, f.x + 22, f.y + 22, f.w - 44, f.h - 44, 18); g.fill(); });
    } });

  function ticketShape(g, t) {
    var r = 26, x = t.x, y = t.y, w = t.w, h = t.h;
    g.beginPath(); g.moveTo(x + 14, y); g.lineTo(x + w - 14, y); g.quadraticCurveTo(x + w, y, x + w, y + 14);
    g.lineTo(x + w, y + h / 2 - r); g.arc(x + w, y + h / 2, r, -Math.PI / 2, Math.PI / 2, true);
    g.lineTo(x + w, y + h - 14); g.quadraticCurveTo(x + w, y + h, x + w - 14, y + h); g.lineTo(x + 14, y + h); g.quadraticCurveTo(x, y + h, x, y + h - 14);
    g.lineTo(x, y + h / 2 + r); g.arc(x, y + h / 2, r, Math.PI / 2, -Math.PI / 2, true); g.lineTo(x, y + 14); g.quadraticCurveTo(x, y, x + 14, y); g.closePath();
  }
  L({ id: "ticket", name: "Ticket", blurb: "The draft ticket the game already deals, as the masthead.",
    place: function (A) {
      return { vh: 360, word: { x: 76, y: 74, w: 590, h: 176 }, icon: { x: 752, y: 80, s: 186 }, tag: { x: 76, y: 270, w: 590, h: 40 }, t: { x: 22, y: 22, w: 956, h: 316, perf: 712 },
        backClip: function (g) { ticketShape(g, { x: 22, y: 22, w: 956, h: 316 }); } };
    },
    frame: function (A) {
      var t = A.boxes.t;
      function shape(g) { ticketShape(g, t); }
      A.put("back", function (g) { g.fillStyle = R.tone(0.22); shape(g); g.fill(); g.fillStyle = R.tone(0.42); g.fillRect(t.perf, t.y + 6, t.x + t.w - t.perf - 6, t.h - 12); });
      A.put("frame", function (g) {
        g.lineWidth = 6; shape(g); g.stroke();
        for (var y = t.y + 18; y < t.y + t.h - 10; y += 22) { R.circle(g, t.perf, y, 4.2); g.fill(); }
      });
      A.put("frame", function (g) { K.spaced(g, "ADMIT ONE  ·  ROUND 1 OF 5", t.x + 54, t.y + 36, { size: 19, track: 0.18, align: "left", baseline: "middle" }); }, { flat: true });
    } });

  /* The pennant: felt letters (paper) sewn onto the felt, their depth printed around them. The letters
     taper toward the tip so they stay on the felt. */
  L({ id: "pennant", name: "Pennant", blurb: "A felt pennant from the arena gift shop.",
    place: function () {
      return { vh: 420, word: { x: 238, y: 124, w: 500, h: 172 }, wordShape: "taper", wordPaper: true, icon: { x: 52, y: 128, s: 150 }, tag: null, pen: { x: 20, y: 20, h: 380, tip: 986 },
        backClip: function (g) { g.beginPath(); g.moveTo(20, 20); g.lineTo(986, 210); g.lineTo(20, 400); g.closePath(); } };
    },
    frame: function (A) {
      var p = A.boxes.pen, W = A.word, ic = A.boxes.icon, cx = ic.x + ic.s / 2, cy = ic.y + ic.s / 2;
      function tri(g, inset) { var i = inset || 0; g.beginPath(); g.moveTo(p.x + i, p.y + i * 0.6); g.lineTo(p.tip - i * 2.4, p.y + p.h / 2); g.lineTo(p.x + i, p.y + p.h - i * 0.6); g.closePath(); }
      A.put("frame", function (g) {
        tri(g); g.fill();
        R.knock(g, function (g2) { if (W) W.full(g2, W.size * 0.018); R.circle(g2, cx, cy, ic.s * 0.6); g2.fill(); });
      });
      A.put("glow", function (g) {
        g.lineWidth = 5; tri(g, 22); g.stroke();
        g.fillRect(p.x, p.y, 26, p.h);                  // the sewn hoist
        g.lineWidth = 4; R.circle(g, cx, cy, ic.s * 0.6 - 8); g.stroke();
      });
    } });

  /* The jersey: a tank top with bound neck and arms, TRUE arched across the chest over a big 82, both in
     paper (tackle twill) with the depth around them, and the icon on the jock tag. */
  L({ id: "jersey", name: "Jersey", blurb: "TRUE across the chest, 82 on the front.",
    place: function (A) {
      var sh = A.rc.shape;
      return { vh: 900, word: { x: 262, y: 228, w: 476, h: 480, lines: "two", archK: 0.75 }, wordShape: sh === "straight" || !sh ? "vertical" : null, wordPaper: true,
        icon: { x: 214, y: 736, s: 84 }, tag: null, jersey: true };
    },
    frame: function (A) {
      function body(g) {
        g.beginPath();
        g.moveTo(352, 36); g.quadraticCurveTo(500, 222, 648, 36);            // neck scoop
        g.lineTo(742, 36); g.quadraticCurveTo(736, 250, 870, 300);           // right strap, arm hole
        g.lineTo(862, 858); g.quadraticCurveTo(500, 884, 138, 858);          // side, hem
        g.lineTo(130, 300); g.quadraticCurveTo(264, 250, 258, 36); g.closePath();
      }
      function trims(g) {
        g.beginPath(); g.moveTo(352, 36); g.quadraticCurveTo(500, 222, 648, 36);
        g.moveTo(742, 36); g.quadraticCurveTo(736, 250, 870, 300);
        g.moveTo(258, 36); g.quadraticCurveTo(264, 250, 130, 300);
      }
      var W = A.word, ic = A.boxes.icon;
      A.put("back", function (g) {
        body(g); g.fill();
        R.knock(g, function (g2) {
          if (W) W.full(g2, W.size * 0.022);
          R.roundRect(g2, ic.x - 14, ic.y - 12, ic.s + 28, ic.s + 24, 6); g2.fill();       // the jock tag
          g2.lineWidth = 30; trims(g2); g2.stroke();
        });
      });
      A.put("glow", function (g) {
        g.lineWidth = 30; trims(g); g.stroke();
        R.knock(g, function (g2) { g2.lineWidth = 7; trims(g2); g2.stroke(); });
        g.save(); g.lineWidth = 16; body(g); g.clip(); g.beginPath(); g.moveTo(138, 858); g.quadraticCurveTo(500, 884, 862, 858); g.lineWidth = 28; g.stroke(); g.restore();
      });
      A.put("frame", function (g) { g.lineWidth = 3; R.roundRect(g, ic.x - 14, ic.y - 12, ic.s + 28, ic.s + 24, 6); g.stroke(); });
    } });

  /* The crest: a shield with a banded chief of three stars, the icon on the field, and the name carried on
     a ribbon across the shield. */
  function crestShield(g, i) {
    var C = CREST, a = C.sx0, b = C.sx1, tp = C.top, sd = C.side, tip = C.tip, mid = sd + (tip - sd) * 0.64;
    i = i || 0; g.beginPath();
    g.moveTo(a + i, tp + i); g.lineTo(b - i, tp + i); g.lineTo(b - i, sd);
    g.quadraticCurveTo(b - i, mid - i * 0.6, 500, tip - i * 1.5); g.quadraticCurveTo(a + i, mid - i * 0.6, a + i, sd); g.closePath();
  }
  /* Laid out wide enough (about 3:2) that the site header prints it at its middle size, with the ribbon wider
     than the shield so the name is big, and the ribbon's tails inside the plate. */
  var CREST = { x0: 146, x1: 854, y: 446, h: 134, sag: 38, tail: 104, sx0: 330, sx1: 670, top: 28, side: 300, tip: 604 };
  L({ id: "crest", name: "Crest", blurb: "A shield with the name on a ribbon, like a club crest.",
    place: function (A) {
      var C = CREST, t = tagOn(A), rb = K.ribbon({ x0: C.x0, x1: C.x1, y: C.y, h: C.h, sag: C.sag, tail: C.tail }), ar = rb.arc, vh = 632 + (t ? tagRoom(A) : 0);
      return { vh: vh, wordPaper: true, word: { x: C.x0, y: C.y - C.h / 2, w: C.x1 - C.x0, h: C.h + C.sag, circle: { cx: ar.cx, cy: ar.cy, r: ar.r + C.h * 0.33, band: C.h * 0.66, span: ar.span * 0.86, side: "bottom" } }, wordShape: "circle",
        icon: { x: 386, y: 118, s: 228 }, tag: t ? { x: 200, y: 626, w: 600, h: tagH(A) } : null, ribbon: rb,
        backClip: function (g) { crestShield(g, 0); } };
    },
    frame: function (A) {
      var rb = A.boxes.ribbon, C = CREST;
      var shield = crestShield;
      A.put("back", function (g) { g.fillStyle = R.tone(0.2); shield(g); g.fill(); });
      A.put("frame", function (g) {
        g.lineWidth = 11; shield(g); g.stroke(); g.lineWidth = 3; shield(g, 18); g.stroke();
        g.save(); shield(g); g.clip(); g.fillRect(C.sx0 - 12, C.top - 8, C.sx1 - C.sx0 + 24, 86); g.restore();          // the chief
        R.knock(g, function (g2) { [-1, 0, 1].forEach(function (k) { R.star(g2, 500 + k * 78, C.top + 42, k ? 19 : 26); g2.fill(); }); });
      });
      // the ribbon sits on top of the shield: knock it through everything so far, then print it in the key
      // ink with the name cut out of it (paper letters, their depth around them)
      var W = A.word;
      A.knockAll(function (g) { rb.band(g); g.fill(); rb.tails(g); g.fill(); g.lineWidth = 12; rb.band(g); g.stroke(); });
      A.put("glow", function (g) { g.fillStyle = R.tone(0.6); rb.tails(g); g.fill(); g.fillStyle = R.tone(1); rb.folds(g); g.fill(); });
      A.put("frame", function (g) {
        rb.band(g); g.fill(); g.lineWidth = 3; rb.tails(g); g.stroke();
        R.knock(g, function (g2) { if (W) W.full(g2, W.size * 0.02); });
      });
      var stitch = K.ribbon({ x0: C.x0, x1: C.x1, y: C.y, h: C.h - 22, sag: C.sag, tail: C.tail });
      A.put("frame", function (g) {                    // a stitched paper line just inside the band edge
        R.knock(g, function (g2) { g2.setLineDash([12, 9]); g2.lineWidth = 3; g2.lineCap = "butt"; stitch.band(g2); g2.stroke(); g2.setLineDash([]); });
      });
    } });

  /* The scoreboard: the name in lamp letters on a dark panel, the icon in a lit window, 82 lamps below. */
  L({ id: "scoreboard", name: "Scoreboard", blurb: "The name in lamps on an arena scoreboard.",
    place: function (A) {
      var t = tagOn(A), vh = 420 + (t ? tagRoom(A) : 0);
      return { vh: vh, word: { x: 72, y: 74, w: 590, h: 226 }, icon: { x: 722, y: 84, s: 206 }, wordRole: "body", tag: t ? { x: 72, y: 330, w: 590, h: tagH(A), knock: true } : null,
        panel: { x: 24, y: 24, w: 952, h: vh - 48 }, win: { x: 704, y: 66, w: 242, h: 242 },
        backClip: function (g) { R.roundRect(g, 36, 36, 928, vh - 72, 22); } };
    },
    frame: function (A) {
      var p = A.boxes.panel, w = A.boxes.win, W = A.word, y = p.y + p.h - 34, n = 82, x0 = p.x + 48, step = (p.w - 96) / (n - 1);
      var dark = A.stock.dark;                          // on dark stock the stock is the panel
      A.put("frame", function (g) {
        if (dark) { g.lineWidth = 8; R.roundRect(g, p.x, p.y, p.w, p.h, 30); g.stroke(); g.lineWidth = 4; R.roundRect(g, w.x, w.y, w.w, w.h, 18); g.stroke(); return; }
        R.roundRect(g, p.x, p.y, p.w, p.h, 30); g.fill();
        R.knock(g, function (g2) {
          if (W) W.full(g2, W.size * 0.02);
          R.roundRect(g2, w.x, w.y, w.w, w.h, 18); g2.fill();
          for (var i = 0; i < n; i++) { R.circle(g2, x0 + i * step, y, 4.6); g2.fill(); }
        });
      });
      A.put("glow", function (g) { g.lineWidth = 3; R.roundRect(g, p.x + 12, p.y + 12, p.w - 24, p.h - 24, 22); g.stroke(); g.lineWidth = 4; R.roundRect(g, w.x + 8, w.y + 8, w.w - 16, w.h - 16, 12); g.stroke(); });
      A.put("body", function (g) { for (var i = 0; i < n; i++) { R.circle(g, x0 + i * step, y, 3.4); g.fill(); } });
    } });

  L({ id: "mark", name: "Icon only", blurb: "The icon alone: favicon, app icon, avatar.",
    place: function (A) { return has(A, "arc-text") ? { vh: 1000, word: null, icon: { x: 190, y: 120, s: 620 }, tag: null } : { vh: 1000, word: null, icon: { x: 110, y: 130, s: 780 }, tag: null }; } });

  L({ id: "wordonly", name: "Name only", blurb: "Just the wordmark, no icon.",
    place: function (A) {
      var t = tagOn(A), asp = A.rc.lines === "two" ? A.wordAspect : 0, H = asp ? Math.round(R.clamp(880 / asp, 196, 860)) : 196;
      return { vh: H + 54 + tagRoom(A), word: { x: 34, y: 30, w: 932, h: H }, icon: null, tag: t ? { x: 34, y: H + 48, w: 932, h: tagH(A) } : null };
    } });
})();
