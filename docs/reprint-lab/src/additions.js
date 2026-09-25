/* ---------- TRUE 82 LAB: backdrops and additions ----------
   Backdrops have ids "bd-<name>" and are chosen one at a time.
   Additions are toggles; when: 'back' draws before the icon and word.
   draw(A): A.put(role, fn, opt), A.putSlot(slot, fn), A.knockAll(fn), A.boxes, A.vh, A.word, A.rnd, A.rc, A.pal,
   A.kit (LAB.kit: isolate, spaced, arcText, ribbon, scratch/release), A.iconSil(g, dx, dy, grow) (the icon's silhouette).
   A.word: bounds {x, y, w, h}, size, full(g, grow) (face plus depth, for knocks).

   Backdrops: sky, sun, rays, court, stripes (sunset), grid, halftone.
   Additions: star, stars3, sparkle, speed, pips, tagline, underline, marks, colorbar, laurel, confetti, edition,
              ribbon (the tagline on a ribbon banner), halftone-drop (a big-dot shadow under the whole mark),
              arc-text (the tagline set on a curve: a smile in the tag slot, the Seal's ring, or under the icon),
              stripes (70s racing stripes behind the name).
   The tagline, ribbon and arc-text share the layout's tag slot: ribbon or arc-text carry the tagline when on.
   Small type prints on a flat plate (opt { flat: true }) so it stays crisp at phone size. */
(function () {
  var D = window.LAB.addition, R = window.RISO, TAU = Math.PI * 2;
  function iconC(A) { var i = A.boxes.icon; return i ? { x: i.x + i.s / 2, y: i.y + i.s / 2, s: i.s } : { x: 500, y: A.vh / 2, s: A.vh * 0.6 }; }
  function wordB(A) { return A.word ? A.word.bounds : A.boxes.word; }
  function tagText(A) { return String(A.rc.tagline || "THE 82-0 CHASE").toUpperCase(); }

  /* ---- backdrops ----
     A backdrop never ends in a hard box: the plate sits on the site's ground in the header, so every backdrop
     fades out into halftone toward the plate's edges (edge(g, A)), or stays inside a framed layout's window when
     the layout gives one (A.boxes.backClip(g) builds that path). Busy backdrops (rays, grid, court) also keep
     clear of the name and the icon: a paper keyline around both, so the type and the icon read at header size. */
  function smooth(n, a, b) {                         // gradient stops that ease from a to b (smoothstep), n steps
    var out = []; for (var i = 0; i <= n; i++) { var t = i / n; out.push([t, a + (b - a) * t * t * (3 - 2 * t)]); } return out;
  }
  // fade to nothing over the outer fx of the width and fy of the height (fractions)
  function edge(g, A, fx, fy) {
    fx = fx == null ? 0.14 : fx; fy = fy == null ? 0.2 : fy;
    g.save(); g.globalCompositeOperation = "destination-in";
    var st = smooth(6, 0, 1).map(function (s) { return [s[0] * fx, s[1]]; }), sx = st.concat(st.slice().reverse().map(function (s) { return [1 - s[0], s[1]]; }));
    g.fillStyle = R.lgrad(g, 0, 0, 1000, 0, sx); g.fillRect(-50, -50, 1100, A.vh + 100);
    if (fy > 0) {
      var sy = smooth(6, 0, 1).map(function (s) { return [s[0] * fy, s[1]]; });
      sy = sy.concat(sy.slice().reverse().map(function (s) { return [1 - s[0], s[1]]; }));
      g.fillStyle = R.vgrad(g, 0, A.vh, sy); g.fillRect(-50, -50, 1100, A.vh + 100);
    }
    g.restore();
  }
  // keep a backdrop clear of the name and the icon (paper keylines of about k of the name's size)
  function clearMark(g, A, k) {
    var W = A.word, ib = A.boxes.icon;
    R.knock(g, function (g2) {
      if (W) W.full(g2, W.size * (k == null ? 0.05 : k));
      if (A.iconSil && ib) A.iconSil(g2, 0, 0, ib.s * 0.04);
    });
  }
  // o: { fx, fy (edge fade), clear (keyline the name and icon: true | 'word'), keepEdges (no fade when the layout has no window) }
  function backdrop(A, role, fn, o) {
    o = o || {};
    A.put(role, function (g) {
      A.kit.isolate(g, function (x) {
        fn(x);
        if (A.boxes.backClip) { x.save(); x.globalCompositeOperation = "destination-in"; A.boxes.backClip(x); x.fill(); x.restore(); }
        else if (!o.keepEdges) edge(x, A, o.fx, o.fy);
        if (o.clear === "word") { if (A.word) R.knock(x, function (x2) { A.word.full(x2, A.word.size * 0.05); }); }
        else if (o.clear) clearMark(x, A);
      });
    });
  }
  // the sun and sunset discs: centered on the icon, never past the plate's top or bottom
  function discR(A, c, k) { return Math.max(c.s * 0.3, Math.min(c.s * k, c.y - 10, A.vh - 10 - c.y)); }
  // how far each backdrop disc reaches from the icon's center (x icon size); banner.js packs the lockup with it
  var REACH = { stripes: 0.62, sun: 0.5 };
  window.LAB.backdropReach = function (id) { return REACH[id] || 0; };

  D({ id: "bd-sky", name: "Sky", group: "backdrop", when: "back", draw: function (A) {
    backdrop(A, "back", function (g) { g.fillStyle = R.vgrad(g, 0, A.vh, [[0, 0.5], [0.6, 0.16], [1, 0]]); g.fillRect(0, 0, 1000, A.vh); }, { fy: 0 });
  } });
  D({ id: "bd-sun", name: "Sun", group: "backdrop", when: "back", draw: function (A) {
    var c = iconC(A), r = discR(A, c, 0.5);
    backdrop(A, "glow", function (g) {
      g.fillStyle = R.rgrad(g, c.x, c.y, r * 0.6, r * 2.1, [[0, 0.5], [0.5, 0.2], [1, 0]]); g.fillRect(0, 0, 1000, A.vh);
      g.fillStyle = R.rgrad(g, c.x, c.y - r * 0.2, 0, r, [[0, 0.9], [1, 0.62]]); R.circle(g, c.x, c.y, r); g.fill();
    }, { clear: "word" });
  } });
  D({ id: "bd-rays", name: "Sunburst", group: "backdrop", when: "back", draw: function (A) {
    var c = iconC(A);
    backdrop(A, "glow", function (g) {
      var n = 28, Rr = 1400;
      g.fillStyle = R.rgrad(g, c.x, c.y, c.s * 0.35, c.s * 2.2, [[0, 0.55], [1, 0.05]]);
      g.beginPath();
      for (var i = 0; i < n; i++) { var a0 = i / n * TAU, a1 = a0 + TAU / n / 2; g.moveTo(c.x, c.y); g.lineTo(c.x + Math.cos(a0) * Rr, c.y + Math.sin(a0) * Rr); g.lineTo(c.x + Math.cos(a1) * Rr, c.y + Math.sin(a1) * Rr); g.closePath(); }
      g.fill();
    }, { clear: true });
  } });
  D({ id: "bd-court", name: "Court lines", group: "backdrop", when: "back", draw: function (A) {
    backdrop(A, "back", function (g) {               // crisp painted lines, like the floor itself
      g.lineWidth = 4; var cy = A.vh / 2, m = Math.min(26, A.vh * 0.08);
      g.beginPath(); g.moveTo(-10, m); g.lineTo(1010, m); g.moveTo(-10, A.vh - m); g.lineTo(1010, A.vh - m); g.stroke();
      R.circle(g, 500, cy, A.vh * 0.34); g.stroke(); R.circle(g, 500, cy, A.vh * 0.12); g.stroke();
      g.beginPath(); g.moveTo(500, m); g.lineTo(500, A.vh - m); g.stroke();
      g.beginPath(); g.arc(-40, cy, A.vh * 0.62, -1.2, 1.2); g.stroke(); g.beginPath(); g.arc(1040, cy, A.vh * 0.62, Math.PI - 1.2, Math.PI + 1.2); g.stroke();
    }, { clear: true, fy: 0.06 });
  } });
  D({ id: "bd-stripes", name: "Sunset stripes", group: "backdrop", when: "back", draw: function (A) {
    var c = iconC(A), r = discR(A, c, 0.62);
    backdrop(A, "glow", function (g) {
      R.circle(g, c.x, c.y, r); g.fillStyle = R.vgrad(g, c.y - r, c.y + r, [[0, 0.95], [1, 0.5]]); g.fill();
      R.knock(g, function (g2) { for (var k = 0; k < 7; k++) { var y = c.y + r * (0.08 + k * 0.137), h = r * (0.019 + k * 0.0145); g2.fillRect(c.x - r * 1.6, y, r * 3.2, h); } });
    }, { clear: "word", keepEdges: true });
  } });
  D({ id: "bd-grid", name: "Neon grid", group: "backdrop", when: "back", draw: function (A) {
    backdrop(A, "glow", function (g) {
      var hz = A.vh * 0.62; g.lineWidth = 2.2;
      for (var i = -14; i <= 14; i++) { g.beginPath(); g.moveTo(500 + i * 22, hz); g.lineTo(500 + i * 140, A.vh + 20); g.stroke(); }
      for (var k = 0; k < 9; k++) { var y = hz + Math.pow(k / 8, 1.8) * (A.vh - hz + 10); g.beginPath(); g.moveTo(0, y); g.lineTo(1000, y); g.stroke(); }
      g.fillStyle = R.vgrad(g, hz, A.vh, [[0, 0.55], [1, 0]]); g.fillRect(0, hz - 2, 1000, 4);
    }, { clear: true, fy: 0.16 });
  } });
  D({ id: "bd-halftone", name: "Halftone wash", group: "backdrop", when: "back", draw: function (A) {
    backdrop(A, "back", function (g) { g.fillStyle = R.lgrad(g, 0, 0, 1000, A.vh, [[0, 0.0], [0.5, 0.18], [1, 0.62]]); g.fillRect(0, 0, 1000, A.vh); });
  } });

  /* ---- additions ---- */
  D({ id: "star", name: "Star", group: "marks", draw: function (A) {
    var i = A.boxes.icon; if (!i) return;
    A.put("glow", function (g) { R.star(g, i.x + i.s / 2, Math.max(i.s * 0.1, i.y + i.s * 0.02), i.s * 0.11); g.fill(); });
  } });
  D({ id: "stars3", name: "Three stars", group: "marks", draw: function (A) {
    var w = wordB(A); if (!w) return;
    var r = Math.min(34, Math.max(16, w.h * 0.09)), y = Math.max(r + 6, w.y - r * 0.9);
    A.put("glow", function (g) { [-1, 0, 1].forEach(function (k) { R.star(g, w.x + w.w / 2 + k * r * 3.2, y + Math.abs(k) * r * 0.5, k ? r * 0.72 : r); g.fill(); }); });
  } });
  D({ id: "sparkle", name: "Sparkles", group: "marks", draw: function (A) {
    var c = iconC(A), r = R.mulberry(31);
    A.put("glow", function (g) {
      for (var k = 0; k < 6; k++) {
        var a = r() * TAU, d = c.s * (0.55 + r() * 0.2), s = c.s * (0.03 + r() * 0.04);
        var x = R.clamp(c.x + Math.cos(a) * d, s + 10, 990 - s), y = R.clamp(c.y + Math.sin(a) * d * 0.8, s + 10, A.vh - 10 - s);
        g.beginPath(); g.moveTo(x, y - s); g.quadraticCurveTo(x, y, x + s, y); g.quadraticCurveTo(x, y, x, y + s); g.quadraticCurveTo(x, y, x - s, y); g.quadraticCurveTo(x, y, x, y - s); g.fill();
      }
    });
  } });
  D({ id: "speed", name: "Speed lines", group: "marks", when: "back", draw: function (A) {
    var W = A.word; if (!W) return;
    var b = W.bounds, s = W.size;
    A.put("depth", function (g) {
      for (var k = 0; k < 5; k++) {                  // tapered streaks running out of the letters to the left
        var y = b.y + b.h * (0.3 + k * 0.14), th = s * (0.05 - k * 0.006), x1 = b.x + b.w * (0.55 - k * 0.07), x0 = Math.max(6, b.x - s * (0.9 - k * 0.12));
        g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y - th / 2); g.lineTo(x1, y + th / 2); g.closePath(); g.fill();
      }
      R.knock(g, function (g2) { W.full(g2, s * 0.03); });
    });
  } });
  D({ id: "pips", name: "82 pips", group: "marks", draw: function (A) {
    var w = wordB(A); if (!w) return;
    var tag = A.boxes.tag, y = Math.min(A.vh - 10, w.y + w.h + 14);
    if (tag && tag.y < y + 8 && !tag.arc) y = Math.min(y, tag.y - 4);
    var x0 = w.x + 4, step = (w.w - 8) / 81;
    A.put("glow", function (g) { for (var i = 0; i < 82; i++) { R.circle(g, x0 + i * step, y, Math.min(3.6, step * 0.38)); g.fill(); } });
  } });

  // The tagline: straight in its box, or around an arc when the layout gives one (the Seal).
  function drawTagline(A, g, t, text, grow) {
    if (t.arc) A.kit.arcText(g, text, { cx: t.arc.cx, cy: t.arc.cy, r: t.arc.r, side: t.arc.side, span: t.arc.span, size: t.arc.size || 40, track: 0.32, grow: grow });
    else A.kit.spaced(g, text, t.x + t.w / 2, t.y + t.h / 2, { size: t.h * 0.72, track: 0.3, maxW: t.w, grow: grow });
  }
  D({ id: "tagline", name: "Tagline", group: "type", draw: function (A) {
    var t = A.boxes.tag; if (!t) return;
    if ((A.has("ribbon") || A.has("arc-text")) && !t.arc) return;   // the ribbon or the curve carries it
    var text = tagText(A);
    if (t.knock) A.knockAll(function (g) { drawTagline(A, g, t, text, t.h * 0.1); });
    A.put("tag", function (g) { drawTagline(A, g, t, text, 0); }, { flat: true });
  } });
  D({ id: "underline", name: "Swoosh", group: "marks", when: "back", draw: function (A) {
    var w = wordB(A); if (!w) return;
    var th = Math.max(8, w.h * 0.08);
    A.put("glow", function (g) {
      var y = Math.min(A.vh - th - 4, w.y + w.h + th * 0.4);
      g.beginPath(); g.moveTo(w.x - w.w * 0.02, y + th * 0.3); g.bezierCurveTo(w.x + w.w * 0.35, y - th * 1.6, w.x + w.w * 0.7, y + th * 0.4, w.x + w.w * 1.03, y - th * 1.9);
      g.lineTo(w.x + w.w * 1.0, y - th * 0.6); g.bezierCurveTo(w.x + w.w * 0.7, y + th * 1.5, w.x + w.w * 0.35, y + th * 0.2, w.x - w.w * 0.02, y + th * 0.3); g.fill();
    });
  } });
  D({ id: "marks", name: "Registration marks", group: "print", draw: function (A) {
    var pts = [[16, 16], [984, 16], [16, A.vh - 16], [984, A.vh - 16]];
    A.put("*", function (g) {                         // printed in every ink, so the misregistration shows at the corners
      g.lineWidth = 1.6; g.globalAlpha = 0.85;
      pts.forEach(function (p) { R.circle(g, p[0], p[1], 6.5); g.stroke(); g.beginPath(); g.moveTo(p[0] - 11, p[1]); g.lineTo(p[0] + 11, p[1]); g.moveTo(p[0], p[1] - 11); g.lineTo(p[0], p[1] + 11); g.stroke(); });
      g.globalAlpha = 1;
    });
  } });
  D({ id: "colorbar", name: "Color bar", group: "print", draw: function (A) {
    var slots = ["key", "a", "b", "c", "d"].filter(function (s) { return A.pal.inks[s]; }), x = 1000 - 34 - slots.length * 3 * 12, y = A.vh - 15;
    slots.forEach(function (s, i) { [1, 0.5, 0.2].forEach(function (t, j) { var xx = x + (i * 3 + j) * 12; A.putSlot(s, function (g) { g.fillStyle = R.tone(t); g.fillRect(xx, y, 10, 8); }); }); });
  } });
  D({ id: "laurel", name: "Laurels", group: "marks", when: "back", draw: function (A) {
    var c = iconC(A), r = Math.min(c.s * 0.6, (A.vh - 10 - c.y) / 1.02), L0 = c.s * 0.105;
    A.put("glow", function (g) {
      function leaf(x, y, ang, len) {
        g.save(); g.translate(x, y); g.rotate(ang); g.beginPath();
        g.moveTo(0, 0); g.quadraticCurveTo(len * 0.45, -len * 0.3, len, 0); g.quadraticCurveTo(len * 0.45, len * 0.3, 0, 0); g.fill(); g.restore();
      }
      [-1, 1].forEach(function (sd) {
        function pt(t) { var ph = 0.32 + t * 1.85; return [c.x + sd * Math.sin(ph) * r, c.y + Math.cos(ph) * r, ph]; }
        g.lineWidth = c.s * 0.013; g.beginPath();
        for (var i = 0; i <= 24; i++) { var p = pt(i / 24); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
        g.stroke();
        for (var k = 0; k < 7; k++) {
          var t = 0.06 + k * 0.13, p2 = pt(t), ph = p2[2], tx = sd * Math.cos(ph), ty = -Math.sin(ph), nx = sd * Math.sin(ph), ny = Math.cos(ph);
          var len = L0 * (1 - k * 0.05), base = Math.atan2(ty, tx);
          leaf(p2[0], p2[1], Math.atan2(ty * 0.8 + ny * 0.62, tx * 0.8 + nx * 0.62), len);      // outer leaf
          leaf(p2[0], p2[1], Math.atan2(ty * 0.85 - ny * 0.5, tx * 0.85 - nx * 0.5), len * 0.86); // inner leaf
          if (k === 6) leaf(pt(1)[0], pt(1)[1], base, len * 0.9);                                  // the tip
        }
      });
      R.circle(g, c.x, c.y + r * 0.97, c.s * 0.028); g.fill();                                  // where the branches are tied
    });
  } });
  D({ id: "confetti", name: "Confetti", group: "marks", draw: function (A) {
    var slots = ["a", "b", "c"].filter(function (s) { return A.pal.inks[s]; });
    slots.forEach(function (s, i) {
      A.putSlot(s, function (g) {
        var rr = R.mulberry(71 + i * 13);
        for (var k = 0; k < 16; k++) { g.save(); g.translate(rr() * 1000, rr() * A.vh); g.rotate(rr() * TAU); g.fillRect(-5, -2, 10, 4 + rr() * 3); g.restore(); }
      });
    });
  } });
  D({ id: "edition", name: "No. 82 stamp", group: "print", draw: function (A) {
    var i = A.boxes.icon, x = i ? Math.min(950, i.x + i.s * 0.92) : 920, y = i ? Math.min(A.vh - 48, i.y + i.s * 0.9) : A.vh - 60;
    A.put("tag", function (g) {
      g.save(); g.translate(x, y); g.rotate(-0.22); g.lineWidth = 3.2; R.circle(g, 0, 0, 38); g.stroke(); R.circle(g, 0, 0, 31); g.stroke();
      g.font = "700 22px \"IBM Plex Mono\", monospace"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("No.82", 0, 1); g.restore();
    });
  } });

  /* ---- new: the tagline on a ribbon banner ---- */
  D({ id: "ribbon", name: "Ribbon", group: "type", draw: function (A) {
    var t = A.boxes.tag; if (!t || t.arc) return;
    var text = tagText(A), h = t.h * 1.3, size = h * 0.5, m = R.cv(4, 4).getContext("2d");
    m.font = "700 " + size + "px \"IBM Plex Mono\", monospace";
    var tw = 0; for (var i = 0; i < text.length; i++) tw += m.measureText(text[i]).width + (i < text.length - 1 ? size * 0.28 : 0);
    var bw = Math.min(t.w - h * 1.6, Math.max(tw + h * 1.6, t.w * 0.5)), cx = t.x + t.w / 2, cy = t.y + t.h / 2 - h * 0.12;
    var rb = A.kit.ribbon({ x0: cx - bw / 2, x1: cx + bw / 2, y: cy, h: h, sag: h * 0.32, tail: h * 0.95 });
    A.knockAll(function (g) { rb.band(g); g.fill(); rb.tails(g); g.fill(); });
    A.put("glow", function (g) {
      g.fillStyle = R.tone(0.5); rb.tails(g); g.fill(); g.fillStyle = R.tone(1); rb.folds(g); g.fill(); rb.band(g); g.fill();
      R.knock(g, function (g2) { A.kit.arcText(g2, text, { cx: rb.arc.cx, cy: rb.arc.cy, r: rb.arc.r + size * 0.36, side: "bottom", span: rb.arc.span * 0.86, size: size, weight: 700, track: 0.28 }); });
    });
  } });

  /* ---- new: a big-dot halftone shadow under the whole mark ---- */
  D({ id: "halftone-drop", name: "Dot shadow", group: "marks", when: "back", draw: function (A) {
    var W = A.word, ib = A.boxes.icon, sil = A.iconSil, pitch = 12, ox = 20, oy = 24;
    if (!W && !sil) return;
    function mark(g, grow) { if (W) W.full(g, grow); if (sil) sil(g, 0, 0, grow); }
    A.put("shade", function (g) {
      var tr = g.getTransform(), k = Math.abs(tr.a) || 1, cw = g.canvas.width, ch = g.canvas.height;
      var s1 = A.kit.scratch(cw, ch), s2 = A.kit.scratch(cw, ch);
      s1.x.setTransform(tr); mark(s1.x, 0);
      s2.x.shadowColor = "#000"; s2.x.shadowBlur = 9 * k; s2.x.shadowOffsetX = cw + ox * k; s2.x.shadowOffsetY = oy * k;
      s2.x.drawImage(s1.c, -cw, 0);
      // read back only the region the shadow can reach
      var bx0 = 1000, by0 = A.vh, bx1 = 0, by1 = 0;
      function grow(x0, y0, x1, y1) { bx0 = Math.min(bx0, x0); by0 = Math.min(by0, y0); bx1 = Math.max(bx1, x1); by1 = Math.max(by1, y1); }
      if (W) grow(W.reach.x, W.reach.y, W.reach.x + W.reach.w, W.reach.y + W.reach.h);
      if (sil && ib) grow(ib.x - ib.s * 0.1, ib.y - ib.s * 0.1, ib.x + ib.s * 1.1, ib.y + ib.s * 1.1);
      var m = pitch * 2 + 20, RX = Math.max(0, Math.floor((bx0 + ox - m) * k + tr.e)), RY = Math.max(0, Math.floor((by0 + oy - m) * k + tr.f));
      var RW = Math.max(1, Math.min(cw, Math.ceil((bx1 + ox + m) * k + tr.e)) - RX), RH = Math.max(1, Math.min(ch, Math.ceil((by1 + oy + m) * k + tr.f)) - RY);
      var s3 = A.kit.scratch(cw, ch, true); s3.x.drawImage(s2.c, RX, RY, RW, RH, 0, 0, RW, RH);
      var img = s3.x.getImageData(0, 0, RW, RH).data;
      A.kit.release(s1); A.kit.release(s2); A.kit.release(s3);
      var c45 = Math.SQRT1_2, n = Math.ceil((1000 + A.vh) / pitch) + 2, u, v;
      g.beginPath();
      for (u = -n; u <= n; u++) for (v = -n; v <= n; v++) {
        var x = (u - v) * pitch * c45, y = (u + v) * pitch * c45;
        if (x < -pitch || x > 1000 + pitch || y < -pitch || y > A.vh + pitch) continue;
        var px = Math.round(x * k + tr.e) - RX, py = Math.round(y * k + tr.f) - RY;
        if (px < 0 || py < 0 || px >= RW || py >= RH) continue;
        var a = img[(py * RW + px) * 4 + 3] / 255; if (a < 0.04) continue;
        var rr = pitch * 0.5 * Math.min(1.25, Math.sqrt(a) * 1.18);
        g.moveTo(x + rr, y); g.arc(x, y, rr, 0, TAU);
      }
      g.fill();
      R.knock(g, function (g2) { mark(g2, 3); });
    }, { flat: true });
  } });

  /* ---- new: the tagline set on a curve: a smile under the name, or around the bottom of the icon ---- */
  D({ id: "arc-text", name: "Curved tagline", group: "type", draw: function (A) {
    var t = A.boxes.tag, text = tagText(A), o;
    if (t && t.arc) { if (A.has("tagline")) return; o = { cx: t.arc.cx, cy: t.arc.cy, r: t.arc.r, side: t.arc.side, span: t.arc.span, size: t.arc.size || 40 }; }
    else if (t && !A.has("ribbon")) {                 // a smile across the tag slot
      var size = t.h * 0.56, chord = Math.min(t.w, 820) * 0.62, sag = t.h * 0.42, r = (chord * chord / 4 + sag * sag) / (2 * sag);
      o = { cx: t.x + t.w / 2, cy: t.y + t.h - size * 0.15 - r, r: r, side: "bottom", span: 2 * Math.asin(Math.min(1, chord / 2 / r)), size: size };
    } else {
      var i = A.boxes.icon; if (!i) return;           // around the bottom of the icon
      var sz = Math.max(16, i.s * 0.08), rr = Math.min(i.s * 0.62, A.vh - 8 - (i.y + i.s / 2) - sz * 0.1);
      o = { cx: i.x + i.s / 2, cy: i.y + i.s / 2, r: rr, side: "bottom", span: 2.3, size: sz };
    }
    A.put("tag", function (g) { A.kit.arcText(g, text, { cx: o.cx, cy: o.cy, r: o.r, side: o.side, span: o.span, size: o.size, weight: 700, track: 0.3 }); }, { flat: true });
  } });

  /* ---- new: 70s racing stripes behind the name, in every ink ---- */
  D({ id: "stripes", name: "Racing stripes", group: "marks", when: "back", draw: function (A) {
    var W = A.word; if (!W) return;
    var b = W.bounds, s = W.size, slots = ["a", "b", "c"].filter(function (q) { return A.pal.inks[q]; });
    if (!slots.length) slots = ["key"];
    var hs = [0.085, 0.065, 0.045], gap = s * 0.024, y = b.y + b.h * 0.5;
    slots.forEach(function (q, i) {
      var h = s * hs[i], yy = y;
      y += h + gap;
      A.putSlot(q, function (g) {
        A.kit.isolate(g, function (x) {               // the stripes run out into halftone at the plate's ends (or stop at a frame)
          x.fillRect(0, yy, 1000, h);
          if (A.boxes.backClip) { x.save(); x.globalCompositeOperation = "destination-in"; A.boxes.backClip(x); x.fill(); x.restore(); }
          else edge(x, A, 0.16, 0);
          R.knock(x, function (g2) { W.full(g2, s * 0.035); if (A.iconSil) A.iconSil(g2, 0, 0, s * 0.035); });
        });
      });
    });
  } });
})();
