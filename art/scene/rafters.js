/* ---------- TRUE 82 ART: BANNER NIGHT (a perfect scene: it prints only an 82-0) ----------
   Arena rafters on the night of a perfect season: a truss, old banners hanging dim, spotlights and a burst of rays
   all aimed at one empty hook, and the stands below, the top row 82 lit gold heads (one per win), the season's line.
   After the reveal the new banner drops from the hook, unfurls with a bounce (gold, 82-0 cut out of it), a ring
   leaves it, confetti falls, two pools of light sweep the crowd; the print keeps it all as it stands.
   Rules: art/CONTRACT.md ("A scene") and art/CONTRACT-FX.md. Tone only: black at an alpha is coverage. */
(function () {
  "use strict";
  var A = typeof window !== "undefined" ? window.T82ART : null;
  if (!A || typeof A.add !== "function") return;
  var TAU = Math.PI * 2;
  function star5(g, a, b, r) {                           // a five-point star as one closed path
    g.beginPath(); g.moveTo(a, b - r);
    for (var j = 1; j < 10; j++) g.lineTo(a + Math.sin(j * Math.PI / 5) * r * (j % 2 ? 0.42 : 1), b - Math.cos(j * Math.PI / 5) * r * (j % 2 ? 0.42 : 1));
    g.closePath(); g.fill();
  }

  function derive(K, D, L) {
    var r = K.rand((D.seed * 2654435761 + 8203) >>> 0), fw = L.FX1 - L.FX0, fh = L.FY1 - L.FY0, ban = L.vs < 1, x0 = L.FX0, y0 = L.FY0, i, k, x, y;
    var tr = ban ? 34 : 66, sp = (L.X1 - L.X0) / 82, rh = sp * 0.5, sc = ban ? 1 : 1.5;
    var N = { cx: x0 + fw * 0.77, w: ban ? 176 : 190, top: y0 + tr + (ban ? 12 : 30), h: ban ? 196 : 312, tail: ban ? 30 : 44 };
    function ct(x) { return y0 + fh * ((ban ? 0.83 : 0.8) - (ban ? 0.14 : 0.17) * K.clamp((x - L.X0) / (L.X1 - L.X0), 0, 1)); }   // the stands' top: the season's line
    var H = [], R2 = [], AR = [], PH = [], O = [], P = [], CF = [];
    for (i = 0; i < 82; i++) {
      x = D.X(i + 0.5) + (r() - 0.5) * sp * 0.4; y = ct(x) + (r() - 0.5) * rh * 1.2;
      H.push([x, y, rh * (0.85 + r() * 0.35), 0]);
      if (r() < 0.6) AR.push([x + (r() - 0.5) * rh * 0.6, y - rh * 0.3, x + (r() - 0.5) * 9 * sc, y - rh - (7 + r() * 8) * sc]);
    }
    for (k = 1, y = 0; k < 12; k++) {                    // the rows behind the top one: each a little lower and bigger
      y += rh * (ban ? 2.3 : 2.7) * (1 + k * 0.06);
      for (x = L.X0 - 14 + r() * 8; x < L.X1 + 24; x += sp * (1.2 + k * 0.08) * (0.8 + r() * 0.4)) if (r() < 0.93) R2.push([x, ct(x) + y + (r() - 0.5) * rh * 1.2, rh * (1 + k * 0.07) * (0.85 + r() * 0.3), k]);
    }
    for (k = 0; k < (ban ? 24 : 36); k++) { x = L.X0 + r() * (L.X1 - L.X0); PH.push([x, ct(x) + rh * (3 + r() * 11) * (ban ? 1 : 1.3), (ban ? 2.4 : 2.8) + r()]); }
    for (x = L.FX0 - 14; x <= L.FX1 + 14; x += 6) P.push(x, ct(x) + rh * 1.5);
    // the old banners: [centre as a fraction of the width, drop, ink]
    [[0.45, 0.55, "blue"], [0.53, 0.44, "teal"], [0.61, 0.5, "blue"], [0.92, 0.5, "teal"]].forEach(function (b) {
      O.push({ x: x0 + fw * b[0], w: (ban ? 62 : 84) * (0.9 + r() * 0.2), h: fh * b[1] * 0.6, ink: b[2], top: y0 + tr + (ban ? 14 : 26) });
    });
    // lamps on the truss and where each aims: [lamp x, aim x, aim y, spread, ink, tone]
    var sx = N.cx, sy = N.top + N.h * 0.55, ly = y0 + tr * 0.9;
    var B = [[0.3, sx, sy, 0.05, "pink", 0.5], [0.55, sx, sy, 0.045, "pink", 0.5], [0.97, sx, sy, 0.05, "sun", 0.55], [0.08, x0 + fw * 0.3, y0 + fh * 0.84, 0.06, "sun", 0.3], [0.42, x0 + fw * 0.2, y0 + fh * 0.84, 0.05, "pink", 0.26]]
      .map(function (b) { return { x: x0 + fw * b[0], y: ly, tx: b[1], ty: b[2], w: fw * b[3], ink: b[4], t: b[5] }; });
    for (k = 0; k < 36; k++) CF.push([0.9 + k * 0.145, N.cx + (k % 2 ? 1 : -1) * (0.015 + r() * 0.11) * fw, y0 + tr + 4 + r() * 10, (r() - 0.5) * 20 * sc, (0.8 + r() * 0.5) * (ban ? 80 : 130), r() * TAU, 3 + r() * 3, 5 + r() * 4]);
    D.rf = { ban: ban, fw: fw, fh: fh, tr: tr, N: N, H: H, R2: R2, AR: AR, PH: PH, O: O, B: B, P: P, CF: CF, rh: rh, ct: ct, sc: sc, lw: ban ? 3.4 : 4.4, pitch: ban ? 30 : 56 };
  }

  function layers(K, P, D, L) {
    var C = D.rf, tone = K.tone, ban = C.ban, fw = C.fw, fh = C.fh, N = C.N, tr = C.tr, x0 = L.FX0 - 12, x1 = L.FX1 + 12, y0 = L.FY0, rh = C.rh;
    function flag(g, cx, top, w, h, tail) {
      g.beginPath(); g.moveTo(cx - w / 2, top); g.lineTo(cx + w / 2, top); g.lineTo(cx + w / 2, top + h + tail); g.lineTo(cx, top + h + tail * 0.35); g.lineTo(cx - w / 2, top + h + tail); g.closePath();
    }
    var ALL = C.H.concat(C.R2);
    function figs(g, a, b, e, sh) {                      // the heads (or the shoulders) of rows a..b in one path, so figures never stack
      g.beginPath();
      ALL.forEach(function (h) {
        if (h[3] < a || h[3] > b) return;
        if (sh) { g.moveTo(h[0] + h[2] * 1.4 + e, h[1] + h[2] * 1.9); g.ellipse(h[0], h[1] + h[2] * 1.9, h[2] * 1.4 + e, h[2] * 1.15 + e, 0, 0, TAU); }
        else { g.moveTo(h[0] + h[2] + e, h[1]); g.arc(h[0], h[1], h[2] + e, 0, TAU); }
      });
      g.fill();
    }
    function cut(g, a, b, e) { K.knock(g, function (g2) { figs(g2, a, b, e, 1); figs(g2, a, b, e, 0); }); }
    function crowd(g, tones, a) {                        // rows a.. back to front, each owning its value (lit heads, dimmer shoulders), the rows in front cut out of it
      var k;
      for (k = a; k < a + tones.length; k++) { cut(g, k, k, 0.8); g.fillStyle = tone(tones[k - a] * 0.5); figs(g, k, k, 0, 1); g.fillStyle = tone(tones[k - a]); figs(g, k, k, 0, 0); }
      cut(g, a + tones.length, 99, 0.8);
    }
    function mass(g, e) {                                // the dark mass of the stands, and the arms
      var j;
      g.beginPath(); g.moveTo(x0, L.FY1 + 10);
      for (j = 0; j < C.P.length; j += 2) g.lineTo(C.P[j], C.P[j + 1]);
      g.lineTo(x1, L.FY1 + 10); g.closePath(); g.fill();
      figs(g, 0, 99, e, 1); figs(g, 0, 99, e, 0);
      g.lineCap = "round"; g.lineWidth = C.lw * 1.4 + e * 1.5; g.beginPath();
      C.AR.forEach(function (a) { g.moveTo(a[0], a[1]); g.lineTo(a[2], a[3]); });
      g.stroke();
    }
    function slot(g) { g.beginPath(); g.rect(N.cx - N.w / 2 - 5, N.top - 3, N.w + 10, N.h + N.tail + 8); g.fill(); }
    function hole(g) { K.knock(g, function (g2) { mass(g2, 1.8); slot(g2); }); }
    function beam(g, b) {                                // a cone with a bright core, each fading toward its far end
      var dx = b.tx - b.x, dy = b.ty - b.y, d = Math.sqrt(dx * dx + dy * dy), nx = -dy / d, ny = dx / d, ex = b.x + dx * 1.2, ey = b.y + dy * 1.2;
      [[1, 1], [0.42, 0.55]].forEach(function (q) {
        var w = b.w * 1.2 * q[0], gr = g.createLinearGradient(b.x, b.y, ex, ey);
        gr.addColorStop(0, tone(b.t * q[1])); gr.addColorStop(0.65, tone(b.t * q[1] * 0.6)); gr.addColorStop(1, tone(0));
        g.fillStyle = gr; g.beginPath(); g.moveTo(b.x + nx * 2.5, b.y + ny * 2.5); g.lineTo(ex + nx * w, ey + ny * w); g.lineTo(ex - nx * w, ey - ny * w); g.lineTo(b.x - nx * 2.5, b.y - ny * 2.5); g.closePath(); g.fill();
      });
    }
    function rays(g, ph, t) {                           // a burst of wedges from the empty hook, long to the right and short toward the names
      var sx = N.cx, sy = N.top + N.h * 0.5, j, a, len, wd;
      for (j = 0; j < 10; j++) {
        a = (j * 2 + ph) * TAU / 20 - 0.3; len = fw * (0.52 - 0.26 * Math.max(0, -Math.cos(a))); wd = TAU / 20 * 0.42;
        var gr = g.createLinearGradient(sx, sy, sx + Math.cos(a) * len, sy + Math.sin(a) * len); gr.addColorStop(0, tone(t)); gr.addColorStop(0.85, tone(0));
        g.fillStyle = gr; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(a - wd) * len, sy + Math.sin(a - wd) * len); g.lineTo(sx + Math.cos(a + wd) * len, sy + Math.sin(a + wd) * len); g.closePath(); g.fill();
      }
    }
    function old(g, ink, t) {                            // the old banners of one ink: cloth, then a star and two stripes cut out of it
      var os = C.O.filter(function (b) { return b.ink === ink; });
      g.fillStyle = tone(t);
      os.forEach(function (b) { flag(g, b.x, b.top, b.w, b.h, b.w * 0.3); g.fill(); });
      K.knock(g, function (g2) {
        os.forEach(function (b) {
          star5(g2, b.x, b.top + b.h * 0.34, b.w * 0.26);
          g2.fillRect(b.x - b.w / 2, b.top + b.h * 0.66, b.w, b.w * 0.07); g2.fillRect(b.x - b.w / 2, b.top + b.h * 0.76, b.w, b.w * 0.07);
        });
      });
    }
    function lamps(g, ink) {                             // each lamp: a housing hanging under the truss
      g.beginPath();
      C.B.forEach(function (b) { if (b.ink === ink) { g.moveTo(b.x - 5 * C.sc, b.y - 4); g.lineTo(b.x + 5 * C.sc, b.y - 4); g.lineTo(b.x + 8 * C.sc, b.y + 10 * C.sc); g.lineTo(b.x - 8 * C.sc, b.y + 10 * C.sc); g.closePath(); } });
      g.fill();
    }
    var skyViolet = function (g) {
      g.fillStyle = tone(0.8); g.fillRect(x0, y0 - 6, x1 - x0, tr * 0.2); g.fillRect(x0, y0 + tr * 0.8, x1 - x0, tr * 0.2);
      g.strokeStyle = tone(0.75); g.lineWidth = C.lw; g.lineJoin = "round"; g.beginPath();
      for (var x = x0; x < x1; x += C.pitch) { g.moveTo(x, y0 + tr * 0.2); g.lineTo(x + C.pitch / 2, y0 + tr * 0.8); g.lineTo(x + C.pitch, y0 + tr * 0.2); }
      g.stroke();
      g.strokeStyle = tone(0.9); g.lineWidth = C.lw * 0.7; g.beginPath();
      C.O.concat([{ x: N.cx, w: N.w * 0.8, top: N.top }]).forEach(function (b) { g.moveTo(b.x - b.w * 0.36, y0 + tr); g.lineTo(b.x - b.w * 0.36, b.top); g.moveTo(b.x + b.w * 0.36, y0 + tr); g.lineTo(b.x + b.w * 0.36, b.top); });
      g.stroke();
      old(g, "teal", 0.75); g.fillStyle = tone(0.9); lamps(g, "pink");
    };
    var skyGold = function (g) {
      rays(g, 0, 0.3);
      C.B.forEach(function (b) { if (b.ink === "sun") beam(g, b); });
      hole(g);
      g.fillStyle = tone(0.95); lamps(g, "sun");
      g.beginPath(); C.B.forEach(function (b) { g.moveTo(b.x + 4.6 * C.sc, b.y + 9 * C.sc); g.arc(b.x, b.y + 9 * C.sc, 4.6 * C.sc, 0, TAU); }); g.fill();
      g.fillRect(N.cx - N.w / 2 - 6, N.top - 4, N.w + 12, 4.4);                              // the empty hook's pole
    };
    // the land: the arena's glow behind the stands (the dark mass is what is left out of it), then each row's heads
    function glow(g, stops, ry) {
      g.save(); g.translate(N.cx - fw * 0.05, y0 + fh * 0.78); g.scale(fw * 0.62, ry);
      var gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      stops.forEach(function (s) { gr.addColorStop(s[0], tone(s[1])); });
      g.fillStyle = gr; g.fillRect(-1, -1, 2, 2); g.restore();
    }
    var landMagenta = function (g) {
      g.fillStyle = tone(0.5); g.fillRect(x0, y0 + tr * 0.96, x1 - x0, tr * 0.34);          // the truss's shadow
      old(g, "blue", 0.8);
      glow(g, [[0, 0.95], [0.45, 0.5], [0.9, 0]], fh * 0.55); hole(g); crowd(g, [0.9, 0.82, 0.72], 3);
    };
    var landGold = function (g) { glow(g, [[0, 0.7], [0.3, 0.25], [0.8, 0]], fh * 0.34); hole(g); crowd(g, [0.85, 0.6], 1); };
    var landAqua = function (g) {
      C.B.forEach(function (b) { if (b.ink === "pink") beam(g, b); });
      g.fillStyle = tone(0.85); g.fillRect(x0, y0 + tr * 0.74, x1 - x0, tr * 0.06);          // the lit lower edge of the truss
      hole(g); crowd(g, [0.42, 0.34, 0.28, 0.22, 0.17, 0.13], 6); g.fillStyle = tone(1); g.beginPath(); C.PH.forEach(function (p) { g.moveTo(p[0] + p[2], p[1]); g.arc(p[0], p[1], p[2], 0, TAU); }); g.fill(); };
    var lineGold = function (g) {                        // the 82 heads, the season's line, and the arms they raise
      cut(g, 1, 99, 0.8);
      g.fillStyle = tone(0.5); figs(g, 0, 0, 0, 1); g.fillStyle = tone(0.95); figs(g, 0, 0, 0, 0);
      g.lineCap = "round"; g.lineWidth = C.lw * 1.4; g.strokeStyle = tone(0.95); g.beginPath();
      C.AR.forEach(function (a) { g.moveTo(a[0], a[1]); g.lineTo(a[2], a[3]); });
      g.stroke(); g.beginPath();
      C.AR.forEach(function (a) { g.moveTo(a[2] + C.lw * 1.3, a[3]); g.arc(a[2], a[3], C.lw * 1.3, 0, TAU); });
      g.fill();
    };
    return [
      { ink: "teal", role: "sky", draw: skyViolet, box: [x0, y0 - 8, x1, y0 + fh * 0.72] },
      { ink: "light", role: "sky", draw: skyGold },
      { ink: "blue", role: "land", draw: landMagenta }, 
      { ink: "light", role: "land", draw: landGold }, { ink: "pink", role: "land", draw: landAqua },
      { ink: "sun", role: "line", draw: lineGold, box: [x0, y0 + fh * 0.5, x1, L.FY1 + 10] }
    ];
  }
  function body(g, D, L) {
    var C = D.rf, j;
    g.moveTo(L.FX0 - 12, L.FY1 + 10);
    for (j = 0; j < C.P.length; j += 2) g.lineTo(C.P[j], C.P[j + 1]);
    g.lineTo(L.FX1 + 12, L.FY1 + 10); g.closePath();
  }

  /* ---- the title: the record cut out of a gold banner (with its magenta shadow), BANNER NIGHT beside it ---- */
  function title(K, P, D, L, g) {
    var b = g.box, pos = g.poster, rec = g.record, tone = K.tone, ctx = (g.context || "").toUpperCase(), cs = pos ? 2 : 2.4;
    var x = b[0] + 16, w = pos ? 410 : 400, top = b[1] - 6, bot = b[3] - 16, sz = pos ? 128 : 126, tw = g.measure(K.font(900, sz, "disp"), rec);
    if (tw > w - 40) sz *= (w - 40) / tw;
    var ps = pos ? 54 : 56, rx = x + w + 30, mf = K.font(600, pos ? 13 : 22, "mono"), cf = K.font("italic 600", 30, "disp"), cy = pos ? b[1] + 40 : b[1] + 28;
    var cw = Math.max(g.measure(mf, ctx) + cs * ctx.length, pos && g.comp ? g.measure(cf, g.comp) : 0);
    function cloth(t, dx, dy) { t.beginPath(); t.moveTo(x + dx, top + dy); t.lineTo(x + w + dx, top + dy); t.lineTo(x + w + dx, b[3] + dy); t.lineTo(x + w / 2 + dx, b[3] - 14 + dy); t.lineTo(x + dx, b[3] + dy); t.closePath(); t.fill(); }
    g("blue", [x - 4, top, x + w + 16, b[3] + 14], function (t) { t.fillStyle = tone(0.95); cloth(t, 9, 8); K.knock(t, function (t2) { cloth(t2, 0, 0); }); });
    g("sun", [x - 4, top, x + w + 4, b[3] + 4], function (t) {
      t.fillStyle = tone(0.95); cloth(t, 0, 0);
      K.knock(t, function (t2) { t2.font = K.font(900, sz, "disp"); t2.textAlign = "center"; t2.fillText(rec, x + w / 2, bot - 8); });
    });
    g("pink", [x - 4, top, x + w + 4, b[3] + 4], function (t) { t.strokeStyle = tone(0.95); t.lineWidth = 3.4; t.strokeRect(x + 9, top + 6, w - 18, bot - top + 2); });
    g("pink", [rx - 6, b[3] - ps * 2.1, rx + ps * 5, b[3] + 8], function (t) {
      t.fillStyle = tone(0.95); t.font = K.font(800, ps, "disp");
      K.spacedText(t, "BANNER", rx, b[3] - ps * 1.02 - 8, ps * 0.08, "left"); K.spacedText(t, "NIGHT", rx, b[3] - 8, ps * 0.08, "left");
    });
    if (ctx || (pos && g.comp)) g("orange", [b[2] - 20 - cw, cy - (pos ? 14 : 22), b[2] - 10, pos && g.comp ? b[3] - 12 : cy + 6], function (t) {
      t.fillStyle = tone(0.9); t.font = mf;
      if (ctx) K.spacedText(t, ctx, b[2] - 16, cy, cs, "right");
      if (pos && g.comp) { t.font = cf; t.textAlign = "right"; t.fillText(g.comp, b[2] - 16, b[3] - 20); t.textAlign = "left"; }
    });
  }

  /* ---- after the reveal: the banner drops from the hook, unfurls and swings; a ring leaves it; confetti falls; a spot sweeps ---- */
  var DUR = 6;
  function live(K, P, D, L, t, ink) {
    var C = D.rf, tone = K.tone, ban = C.ban, N = C.N, fw = C.fw, fh = C.fh, tr = C.tr, y0 = L.FY0, x0 = L.FX0;
    // the new banner: it drops from the pole, overshoots and settles; the swing dies away before the print is kept
    var p = K.clamp((t - 0.15) / 1.7, 0, 1), hv = N.h * (1 - Math.exp(-3.2 * p) * Math.cos(7 * p)), tl = N.tail * Math.min(1, p * 2.2);
    var sw = (ban ? 4 : 6) * (1 - K.smooth(1.5, 5.4, t)) * Math.sin(t * 2.6) * K.smooth(1, 2, t), cx = N.cx, hw = N.w / 2, top = N.top, bot = top + hv, k = sw / N.h;
    if (p > 0) {
      var m = 7 + Math.abs(sw), bb = [cx - hw - m, top - 2, cx + hw + m, bot + tl + 6], sh = function (g) { g.transform(1, 0, k, 1, -k * top, 0); };
      ink("sun", bb, function (g) {
        sh(g);
        g.beginPath(); g.moveTo(cx - hw, top); g.lineTo(cx + hw, top); g.lineTo(cx + hw, bot + tl); g.lineTo(cx, bot + tl * 0.3); g.lineTo(cx - hw, bot + tl); g.closePath();
        g.fillStyle = K.vgrad(g, top, bot + tl, [[0, 0.95], [1, 0.86]]); g.fill();
        g.beginPath();                                   // a fringe along the lower edge
        for (var x = cx - hw + 3; x < cx + hw - 3; x += ban ? 8 : 10) g.rect(x, bot + tl * 0.3 + Math.abs(x - cx) / hw * tl * 0.7 - 1, ban ? 3.2 : 4, ban ? 7 : 9);
        g.fill();
        K.knock(g, function (g2) {
          var sz = N.w * 0.43, w1, w2, bw = sz * 0.2, gap = sz * 0.08, sx, i, a, b, r;
          g2.lineWidth = ban ? 2.6 : 3.4; g2.strokeRect(cx - hw + 8, top + 8, N.w - 16, bot - top - 12);
          g2.font = K.font(900, sz, "disp"); w1 = g2.measureText("82").width; w2 = g2.measureText("0").width; sx = cx - (w1 + bw + w2 + gap * 2) / 2;
          g2.textAlign = "left"; g2.fillText("82", sx, top + N.h * 0.54); g2.fillRect(sx + w1 + gap, top + N.h * 0.54 - sz * 0.3, bw, sz * 0.13); g2.fillText("0", sx + w1 + bw + gap * 2, top + N.h * 0.54);
          for (i = -2; i <= 2; i++) {
            a = cx + i * N.w * 0.14; b = top + N.h * 0.19 + Math.abs(i) * N.w * 0.03; r = N.w * 0.05;
            star5(g2, a, b, r);
          }
          g2.lineWidth = N.w * 0.02; K.circle(g2, cx, top + N.h * 0.8, N.w * 0.15); g2.stroke(); K.seams(g2, cx, top + N.h * 0.8, N.w * 0.15, 0.2);
        });
      });
    }
    var ri = (t - 0.15 - 0.224 * 1.7) / 0.55;                          // a ring leaves the banner as its cloth runs out
    if (ri > 0 && ri < 1) {
      var rr = fw * 0.12 * K.ease(ri) + 8;
      ink("pink", [cx - rr - 8, top + N.h - rr - 8, cx + rr + 8, top + N.h + rr + 8], function (g) { g.strokeStyle = tone(0.9 * (1 - ri)); g.lineWidth = (ban ? 7 : 9) * (1 - ri * 0.7); K.circle(g, cx, top + N.h, rr); g.stroke(); });
    }
    var cs = [[], []], bx = [[1e9, 1e9, -1e9, -1e9], [1e9, 1e9, -1e9, -1e9]];
    C.CF.forEach(function (c, n) {                       // confetti: rotating, flipping scraps drifting down from the truss
      var age = t - c[0], q = n % 2, px, py, an, w, h, ca, sn, B = bx[q];
      if (age < 0 || age > 1.8) return;
      px = c[1] + c[3] * age + Math.sin(2.2 * age + c[5]) * 7 * C.sc; py = c[2] + c[4] * age; an = c[5] + 3.1 * age;
      w = c[6] * C.sc * (0.35 + 0.65 * Math.abs(Math.cos(5 * age + c[5]))); h = c[7] * C.sc; ca = Math.cos(an); sn = Math.sin(an);
      cs[q].push([px, py, ca * w, sn * w, sn * h, ca * h]);
      B[0] = Math.min(B[0], px - 14); B[1] = Math.min(B[1], py - 14); B[2] = Math.max(B[2], px + 14); B[3] = Math.max(B[3], py + 14);
    });
    ["sun", "pink"].forEach(function (nm, q) {
      if (cs[q].length) ink(nm, bx[q], function (g) { g.fillStyle = tone(0.95); g.beginPath(); cs[q].forEach(function (o) { g.moveTo(o[0] - o[2] - o[4], o[1] - o[3] + o[5]); g.lineTo(o[0] + o[2] - o[4], o[1] + o[3] + o[5]); g.lineTo(o[0] + o[2] + o[4], o[1] + o[3] - o[5]); g.lineTo(o[0] - o[2] + o[4], o[1] - o[3] - o[5]); g.closePath(); }); g.fill(); });
    });
    [["sun", 0.28, 0.17, 0.5, 1.3]].forEach(function (q) {   // a pool of light sweeps the stands
      var px = x0 + fw * (q[1] + q[2] * Math.sin(t * q[4] + q[3])), py = C.ct(px) + fh * 0.04, rx = fw * 0.1, ry = fh * 0.075;
      ink(q[0], [px - rx, py - ry, px + rx, py + ry], function (g) {
        g.save(); g.translate(px, py); g.scale(rx, ry);
        var gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, tone(0.8)); gr.addColorStop(0.5, tone(0.42)); gr.addColorStop(1, tone(0));
        g.fillStyle = gr; g.fillRect(-1, -1, 2, 2); g.restore();
      });
    });
  }

  A.add("scene", "rafters", {
    name: "Banner Night",
    by: "82-0 only: arena rafters and a crowd of 82 lit heads; the new banner drops from the hook and unfurls, confetti falls.",
    perfect: true,
    lights: ["golden"],
    derive: derive, layers: layers, body: body, title: title,
    live: { dur: DUR, draw: live }
  });
})();
