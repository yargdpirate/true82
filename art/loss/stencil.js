/* art/loss/stencil.js: Stencil. A taped cardboard plate (aqua) with a bridged L cut out is slapped on from the side and
   sprayed; torn off, it leaves a crisp pink L in a clean rectangle inside a halftone fog, an aqua plate landing off
   register. A long moment gets a heavier second coat. Then the sheet is yanked off sideways. Plates in small pieces. */
(function () {
  "use strict";
  var TAU = 6.2832, PC = [[[-62, -100], [-16, -100], [-16, -24], [-62, -24]], [[-62, -17], [-16, -17], [-16, 56], [12, 56], [12, 100], [-62, 100]], [[19, 56], [62, 56], [62, 100], [19, 100]]];
  var BX = [[-65, -103, 62, 91], [-65, -20, 90, 132], [16, 53, 59, 59]]; // each piece's box (x, y, w, h), room on the right for the aqua plate
  var FX = [[0, 0, 20, 260], [170, 0, 20, 260], [20, 0, 150, 20], [20, 240, 150, 20]]; // the fog's four bands round the plate's footprint
  function pcs(g, dx, dy, one) { // the L's pieces (or one of them) as paths: the gaps between are the bridges
    PC.forEach(function (p, i) { if (one == null || one == i) { p.forEach(function (v, j) { g[j ? "lineTo" : "moveTo"](v[0] + dx, v[1] + dy); }); g.closePath(); } });
  }
  function slab(K, g) { // the cardboard's outline: straight cuts that waver a little
    var r = K.rand(33), x, y;
    g.moveTo(-74, -109);
    for (x = -62; x < 75; x += 12) g.lineTo(x, -109 + r() * 1.6);
    for (y = -98; y < 110; y += 12) g.lineTo(74 - r() * 1.6, y);
    for (x = 62; x > -75; x -= 12) g.lineTo(x, 109 - r() * 1.6);
    for (y = 98; y > -110; y -= 12) g.lineTo(-74 + r() * 1.6, y);
    g.closePath();
  }
  function lst(c, B) { return c.map(function (cv, j) { return [cv, B[j][0], B[j][1], B[j][2], B[j][3]]; }); }
  T82ART.add("loss", "stencil", {
    name: "Stencil",
    by: "A taped cardboard stencil with a bridged L is slapped on, sprayed and torn off: a crisp pink L in a clean rectangle of fog, an aqua plate off register, then the sheet is yanked away.",
    prep: function (K) {
      var st = K.st, jobs = [], i, LN = [150, 220, 150, 220], RC = [[20, 20, 170, 20], [170, 20, 170, 240], [170, 240, 20, 240], [20, 240, 20, 20]];
      function fog(g, b, a0, R, nf, seed) { // overspray: dabs along the plate's edge, flecks, in the part of the plate this band holds
        var r = K.rand(seed), n, t, e, x, y, h, a, c, k = 0;
        g.translate(-b[0], -b[1]);
        for (n = 0; n < 110; n++) {
          t = r() * 740; e = 0; while (t > LN[e]) t -= LN[e++];
          x = RC[e][0] + (RC[e][2] - RC[e][0]) * t / LN[e] + (r() - 0.5) * 5; y = RC[e][1] + (RC[e][3] - RC[e][1]) * t / LN[e] + (r() - 0.5) * 5;
          h = R * (0.8 + r() * 0.4); a = e % 2 ? 1 : 0.7; g.fillStyle = K.tone(a0 * (0.6 + r() * 0.8) / 3);
          for (c = 3; c > 0; c--) { g.beginPath(); g.ellipse(x, y, h * c / 3, h * c / 3 * a, 0, 0, TAU); g.fill(); }
        }
        g.fillStyle = K.tone(1);
        while (k < nf) {
          x = r() * 190; y = r() * 260; a = Math.max(20 - x, 0, x - 170); c = Math.max(20 - y, 0, y - 240); a = Math.sqrt(a * a + c * c);
          if (a < 2 || a > 26 || r() > Math.exp(-a / 9)) continue;
          g.beginPath(); g.arc(x, y, 0.7 + r() * r() * 1.7, 0, TAU); g.fill(); k++;
        }
      }
      st.L = []; st.A = []; st.M = []; st.N = [];
      jobs.push(function () { st.PF = [K.plate(20, 260, 7201), K.plate(150, 20, 7202)]; });
      BX.forEach(function (b, i) {
        var P;
        jobs.push(function () {
          P = K.plate(b[2], b[3], 7101 + i);
          st.L[i] = K.screen(P, "loss", function (g) { g.translate(-b[0], -b[1]); g.fillStyle = K.tone(0.95); g.beginPath(); pcs(g, 0, 0, i); g.fill(); });
        }, function () {
          st.A[i] = K.screen(P, "pop", function (g) {
            g.translate(-b[0], -b[1]); g.fillStyle = K.tone(0.62); g.beginPath(); pcs(g, 8, 7, i); g.fill();
            g.globalCompositeOperation = "destination-out"; g.strokeStyle = K.tone(1); g.lineWidth = 1.2; g.beginPath(); pcs(g, 0, 0, i); g.fill(); g.stroke();
          });
        });
      });
      function mk(fn) { // the plate, painted once in K.pat on its own canvas: it moves as one
        var c = document.createElement("canvas"), x; c.width = Math.round(150 * K.d); c.height = Math.round(220 * K.d); x = c.getContext("2d"); x.scale(K.d, K.d); x.translate(75, 110); fn(x); return c;
      }
      jobs.push(function () {
        st.SL = mk(function (g) {
          g.fillStyle = K.pat("pop", 0.38, g); g.beginPath(); slab(K, g); pcs(g, 0, 0); g.fill("evenodd");
          g.save(); g.beginPath(); slab(K, g); g.clip(); g.lineWidth = 7; g.strokeStyle = K.pat("pop", 0.88, g); g.stroke(); g.restore();
          g.save(); g.beginPath(); g.rect(-80, -115, 160, 230); pcs(g, 0, 0); g.clip("evenodd");
          g.lineWidth = 5; g.beginPath(); pcs(g, 0, 0); g.stroke(); g.restore();
        });
      }, function () { st.CT = mk(function (g) { g.fillStyle = K.pat("loss", 0.24, g); g.beginPath(); slab(K, g); pcs(g, 0, 0); g.fill("evenodd"); }); });
      for (i = 0; i < 8; i++) (function (i) {
        jobs.push(function () {
          var N = i > 3, c = K.screen(st.PF[i % 4 > 1 ? 1 : 0], "loss", function (g) { fog(g, FX[i % 4], N ? 0.14 : 0.075, N ? 26 : 22, N ? 90 : 50, 71 + N); });
          (N ? st.N : st.M)[i % 4] = c;
        });
      })(i);
      return jobs;
    },
    hit: function (K, E) {
      var B = K.box;
      K.spark({ x: B.cx, y: B.y1, n: 12, ink: function (q) { return q() < 0.3 ? "pop" : "loss"; }, sp: [120, 340], r: [1, 2.6], life: [0.25, 0.3], grav: 800, seed: E.seed, streak: true });
      K.flash(E.first ? 0.55 : 0.4); K.shake(Math.max(E.dur, 0.42), E.first ? 9 : 7);
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, i;
      if (!st.N[3]) return;
      var H = B.y1 - B.y0, s = H / 220, cx = B.cx, cy = (B.y0 + B.y1) / 2, W = B.x1 - B.x0, sd = (E.seed & 1) ? 1 : -1, u = K.clamp(s, 0.7, 1.15);
      var w = Math.min(0.2, 0.3 * E.dur), T = E.dur - w, f = e > T ? K.clamp((E.dur - e) / (w * 0.5), 0, 1) : 1;
      if (f <= 0) return;
      var q = K.clamp((E.dur - 0.1) / 0.65, 0.3, 1), tl = 0.055 * q, tsp = tl + 0.16 * q, tp = tsp + 0.05 * q, dp = 0.17 * q + 0.05, ta = tp + dp * 0.7, da = 0.08 * q + 0.04;
      var tc = Math.max(tp + dp + 0.1, T - 0.62), c2 = tc + 0.17 < T;
      var pi = K.clamp(e / tl, 0, 1), ps = K.clamp((e - tl) / (tsp - tl), 0, 1), pp = K.clamp((e - tp) / dp, 0, 1), pa = K.clamp((e - ta) / da, 0, 1);
      var pc = c2 ? K.clamp((e - tc) / 0.16, 0, 1) : 0, u2 = e > T ? K.clamp((e - T) / w, 0, 1) : 0;
      var ys = cy - 110 * s + 220 * s * ps, yc = cy - 130 * s + 260 * s * pc, Y0 = B.spanTop - 40, Y1 = B.y1 + 300; // how far down each pass has reached
      function put(tx, ty, rot, z, zx, zy) { g.translate(cx + tx, cy + ty); g.rotate(rot); g.scale(s * z * zx, s * z * zy); }
      function cut(y0, y1) { g.beginPath(); g.rect(B.x0 - 60, y0, W + 120, y1 - y0); g.clip(); }
      function pr(list, ox, oy, y0, y1, lag) { // canvases [c, x, y, w, h] in plate px, shown between two heights, at the print's place
        var ee = u2 * lag;
        g.save(); cut(y0, y1); put(-sd * 1.15 * W * ee * ee, 8 * ee * ee, -sd * 0.3 * ee * ee, 1, 1, 1);
        list.forEach(function (a) { g.drawImage(a[0], a[1] - ox, a[2] - oy, a[3], a[4]); }); g.restore();
      }
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      if (ps > 0) { // the print: the L and its fog; a heavier second coat sweeps down in a long moment
        var yt = ps < 1 ? ys : Y1, M = lst(st.M, FX), N = lst(st.N, FX);
        pr(lst(st.L, BX), 0, 0, Y0, yt, 1);
        if (pc <= 0) pr(M, 95, 130, Y0, yt, 1);
        else if (pc < 1) { pr(N, 95, 130, Y0, yc, 1); pr(M, 95, 130, yc, Y1, 1); }
        else pr(N, 95, 130, Y0, Y1, 1);
      }
      if (pa > 0) { // the aqua plate drops in off register, creeps, and lags the sheet when it is yanked
        var o = (1 - K.ease.back(pa)) * 26 - 4 * K.smooth(ta + da, T, e);
        g.save(); g.translate(o * s, o * s * 0.85); pr(lst(st.A, BX), 0, 0, Y0, Y1, 0.8); g.restore();
      }
      if (e < tp + dp) { // the stencil: slapped on from the side, torn off and flung back
        var a = 1 - pi * pi, k = Math.sin(K.clamp((e - tl) / 0.06, 0, 1) * 3.1416) * (pp > 0 ? 0 : 1), b = pp * pp, j;
        var sx = -sd * 0.8 * W * a + sd * 0.85 * W * b, sy = -0.12 * H * (a + b), sr = -sd * 0.45 * a + sd * 0.55 * b, sz = 1 + 0.25 * a + 0.7 * b;
        function pl() { put(sx, sy, sr, sz, 1 + 0.07 * k, 1 - 0.09 * k); }
        g.save(); pl(); g.drawImage(st.SL, -75, -110, 150, 220);
        g.fillStyle = K.pat("light", 0.5, g);
        for (j = -1; j < 2; j += 2) { g.save(); g.translate(j * 75, -110); g.rotate(j * 0.75); g.fillRect(-17, -6.5, 34, 13); g.restore(); }
        g.restore();
        g.save(); cut(Y0, ys); pl(); g.drawImage(st.CT, -75, -110, 150, 220); g.restore(); // the plate's pink coat, as far as the spray has reached
      }
      var cm = e < tsp + 0.1 * q + 0.04 ? 1 : c2 && e >= tc && e < tc + 0.28 ? 2 : 0;
      if (cm) { // the can and the fan of mist at its nozzle
        var cp = cm == 1 ? ps : pc, oo = cm == 1 ? K.clamp((e - tsp) / (0.06 * q + 0.04), 0, 1) : K.clamp((e - tc - 0.16) / 0.1, 0, 1);
        var zg = cp * 3, kz = Math.floor(Math.min(zg, 2.999)), zf = zg - kz, ww = (cm == 1 ? 72 : 100) * s;
        var px = cx - ww + 2 * ww * (kz % 2 ? 1 - zf : zf), py = cm == 1 ? ys : yc;
        if (oo <= 0) for (i = 2; i >= 0; i--) {
          g.beginPath(); g.arc(px, py, (7 + 5.5 * i) * u, 0, TAU); if (i) g.arc(px, py, (1.5 + 5.5 * i) * u, 0, TAU);
          g.fillStyle = K.pat("loss", 0.6 - 0.2 * i, g); g.fill("evenodd");
        }
        g.save(); g.translate(px + (22 + 220 * oo * oo) * u, py + (12 - 60 * oo * oo) * u); g.rotate(0.5 - 0.5 * oo); g.scale(u, u);
        g.fillStyle = K.pat("pop", 0.88, g); g.fillRect(0, -5, 11, 10); g.fillRect(11, -8, 14, 16);
        g.fillStyle = K.pat("pop", 0.5, g); g.beginPath(); g.moveTo(25, -8); g.lineTo(35, -14); g.lineTo(35, 14); g.lineTo(25, 8); g.closePath(); g.fillRect(35, -14, 60, 28); g.fill();
        g.fillStyle = K.pat("loss", 0.75, g); g.fillRect(50, -14, 26, 28);
        g.restore();
      }
      g.restore();
    }
  });
})();
