/* ---------- TRUE 82 ART: TREELINE (a scene for the results print) ----------
   The season as a pine forest across a still lake: the treeline IS the record (a spire every game or two, every
   tip on the line), three misty ranges behind it, the forest in ranks that fade toward the shore, the lake
   doubling it. Every loss is a dead snag bare above the canopy. A losing year slides the forest down the hill.
   Rules: art/CONTRACT.md ("A scene"). Tone only: black at an alpha is coverage, never a color. */
(function () {
  "use strict";
  var A = typeof window !== "undefined" ? window.T82ART : null;
  if (!A || typeof A.add !== "function") return;
  var ROWS = [0.84, 0.7, 0.58, 0.47, 0.38, 0.3, 0.24], SHP = {}, KR = 0.82;

  // a pine as one cut contour, in fractions of its half width and height: the tip, then a skirt corner and a notch per tier
  function shape(n) {
    if (SHP[n]) return SHP[n];
    var p = [[0, 0]], k, w, y;
    for (k = 0; k < n; k++) {
      w = 0.4 + 0.6 * k / (n - 1); y = 0.86 * (k + 1) / n;
      p.push([w, y], k < n - 1 ? [w * 0.28, y - 0.075] : [0.1, y - 0.075]);
    }
    p.push([0.1, 1]);
    return (SHP[n] = p);
  }
  function derive(K, D, L) {
    var r = K.rand((D.seed * 2654435761 + 31) >>> 0), WL = L.WL, vs = L.vs, rs = L.rs, m = D.m, c = K.clamp, i, j, x, hi = 0, lo = 0;
    var ST = rs < 1 ? 3 : 2, x0 = L.FX0 - 14, NG = Math.ceil((L.FX1 + 14 - x0) / ST) + 1, nt = rs < 1 ? 3 : 4, nl = D.losses.length;
    for (i = 0; i <= 82; i++) { hi = Math.max(hi, m[i]); lo = Math.min(lo, m[i]); }
    var amp = Math.min(c(78 * vs / (L.SC * Math.max(1, hi - lo)), 1, 1.8), hi > 0 ? (WL - L.FY0 - 90 * vs) / (L.SC * hi) : 9, lo < 0 ? (L.FY1 - WL - 46 * vs) / (L.SC * -lo) : 9);
    function cr(u) {
      u = c(u, 0, 82);
      var j = Math.min(81, Math.floor(u)), f = u - j, p0 = m[c(j - 1, 0, 82)], p1 = m[j], p2 = m[j + 1], p3 = m[c(j + 2, 0, 82)];
      return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
    }
    function rec(x) {
      if (x < L.X0) return WL - 16 * vs * K.smooth(L.X0, x0, x);
      return WL - L.SC * amp * cr((Math.min(x, L.X1) - L.X0) / (L.X1 - L.X0) * 82);
    }
    var LY = [], mx = 0;
    for (i = 0; i < NG; i++) { LY.push(rec(x0 + i * ST)); mx = Math.max(mx, LY[i]); }
    var LW = c(mx + 14 * vs, WL + 58 * vs, L.FY1 - 30 * vs);
    function at(x) { return c(Math.round((x - x0) / ST), 0, NG - 1); }
    function sm(w) {
      var o = [], a, s, q, k = Math.round(w / ST);
      for (i = 0; i < NG; i++) { s = 0; q = 0; for (a = Math.max(0, i - k); a <= Math.min(NG - 1, i + k); a++) { s += LY[a]; q++; } o.push(s / q); }
      return o;
    }
    var hw0 = 25 * rs, H0 = 100 * rs, sp = hw0 * 1.42;
    function plant(fn, hw, H, spc, off, jit) {
      var T = [], x = x0 - spc * 0.5 + r() * spc * 0.4;
      for (; x < L.FX1 + 14 + spc; x += spc * (0.88 + 0.24 * r())) T.push(x, fn(x) + off + (r() - 0.5) * jit, hw * (0.88 + 0.26 * r()), H * (0.86 + 0.28 * r()));
      return T;
    }
    function env(T, F) {
      var E = F.slice(), p = shape(nt), hit = [], j, i, k, u, y, a, b, hw;
      for (j = 0; j < T.length; j += 4) {
        hw = T[j + 2];
        for (i = Math.max(0, Math.ceil((T[j] - hw - x0) / ST)); i < NG && x0 + i * ST <= T[j] + hw; i++) {
          u = Math.abs(x0 + i * ST - T[j]) / hw; y = 1;
          for (k = 0; k + 1 < p.length; k++) {
            a = p[k]; b = p[k + 1];
            if (u >= Math.min(a[0], b[0]) && u <= Math.max(a[0], b[0])) y = Math.min(y, b[0] === a[0] ? Math.min(a[1], b[1]) : a[1] + (b[1] - a[1]) * (u - a[0]) / (b[0] - a[0]));
          }
          y = T[j + 1] + T[j + 3] * y;
          if (!hit[i] || y < E[i]) { E[i] = y; hit[i] = 1; }
        }
      }
      return E;
    }
    function cl(a, d) { return a.map(function (v) { return v + d; }); }
    var T0 = plant(rec, hw0, H0, sp, 0, 3.2 * vs), E = env(T0, cl(LY, H0 * 0.5)), rows = [T0], rr, T, z, o;
    for (rr = 1; rr < (rs < 1 ? 4 : ROWS.length); rr++) {
      z = 1 + 0.09 * rr; o = [];
      T = plant(function (x) { return LY[at(x)]; }, hw0 * z, H0 * z, sp * z, H0 * 0.5 * rr * (1 + 0.04 * rr), 8 * vs);
      for (j = 0; j < T.length; j += 4) if (T[j + 1] < LW - 6 * vs) o.push(T[j], T[j + 1], T[j + 2], T[j + 3]);
      rows.push(o);
    }
    var s24 = sm(24), s70 = sm(70), s130 = sm(130), nz = [61, 67, 71].map(function (k) { return K.noise1D(D.seed + k); });
    function rg(n, x, f) { return Math.pow(Math.max(0.06, 1 - Math.abs(K.fbm(n, x * f, 4)) * 2.4), 1.5); }
    var b0 = [], b1 = [], b2 = [], far = [];
    for (i = 0; i < NG; i++) {
      x = x0 + i * ST;
      b2.push(Math.min(LW - (40 + 62 * rg(nz[2], x, 0.008)) * vs - 0.5 * Math.max(0, LW - s24[i]), s24[i] - 34 * vs));
      b1.push(Math.min(LW - (90 + 80 * rg(nz[1], x, 0.0055)) * vs - 0.36 * Math.max(0, LW - s70[i]), b2[i] - 18 * vs));
      b0.push(Math.min(LW - (140 + 104 * rg(nz[0], x, 0.0038)) * vs - 0.24 * Math.max(0, LW - s130[i]), b1[i] - 20 * vs));
    }
    var T2 = plant(function (x) { return b2[at(x)]; }, hw0 * 0.62, H0 * 0.62, sp * 0.62, 0, 2 * vs), T1 = plant(function (x) { return b1[at(x)]; }, hw0 * 0.42, H0 * 0.42, sp * 0.42, 0, 2 * vs);
    far.push({ E: b0 }, { E: env(T1, cl(b1, H0 * 0.2)) }, { E: env(T2, cl(b2, H0 * 0.3)) });
    far.forEach(function (f) { f.top = Math.min.apply(null, f.E); });
    var sr = Math.min(D.pal.sr * rs * 0.95, 70 * rs), sx = 0, best = 1e9, q, cx, mean, mr = 50 * rs;
    for (q = 0; q < 9; q++) {
      cx = L.X0 + (L.X1 - L.X0) * (0.6 + 0.26 * q / 8); mean = 0;
      for (j = -3; j <= 3; j++) mean += b0[at(cx + j * sr / 3)];
      if (mean < best) { best = mean; sx = cx; }
    }
    var hz = b0[at(sx)], sy = Math.max(hz - 0.28 * sr, L.FY0 + sr + 8 * vs), my = Math.max(hz - 1.5 * mr, L.FY0 + mr + 10 * vs);
    var stars = [], fog = [], rip = [], glint = [], dd, gw, y, lw = (D.pal.key === "night" ? mr : sr) * 1.5;
    for (i = 0; i < L.stars; i++) stars.push(L.FX0 + r() * (L.FX1 - L.FX0), L.FY0 + Math.pow(r(), 1.3) * (hz - L.FY0 - 10 * vs), (1.2 + r() * 1.8) * Math.max(0.8, rs), r() < 0.14 ? 1 : 0);
    [b0, b1, b2].forEach(function (b, k) {
      for (i = 0; i < 3; i++) { x = L.FX0 + r() * (L.FX1 - L.FX0); fog.push([k, x, b[at(x)] - 4 * vs, (90 + r() * 170) * rs, (14 + r() * 12) * vs, 0.8 + 0.2 * r()]); }
    });
    for (y = LW + 3 * vs; y < L.FY1; y += (3.6 + 8 * (y - LW) / (L.FY1 - LW)) * Math.max(0.75, vs)) {
      for (x = L.FX0 - 10 + r() * 50; x < L.FX1; x += 70 + r() * 150) rip.push(x, y, 110 + r() * 300, (1.2 + r() * 1.1) * Math.max(0.8, vs), 0.6 + r() * 0.4);
    }
    for (y = LW + 4 * vs; y < L.FY1; y += (4 + r() * 6) * Math.max(0.6, vs)) {
      dd = (y - LW) / (L.FY1 - LW); gw = lw * (1 - dd * 0.7) * (0.45 + r() * 0.7);
      glint.push(sx - gw / 2 + (r() - 0.5) * 20 * dd, y, gw, (1.6 + r() * 2.4 * (1 - dd)) * Math.max(0.7, vs), 0.95 - dd * 0.5);
    }
    var snags = D.losses.map(function (g) { var x = D.X(g + 0.5); return { x: x, y: rec(x), v: r(), l: (r() - 0.5) * 0.4, h: 0.7 + 0.45 * r() }; });
    D.tl = { st: ST, x0: x0, NG: NG, nt: nt, LW: LW, E: E, T0: T0, rows: rows, far: far, sun: { x: sx, y: sy, r: sr }, moon: { x: sx, y: my, r: mr },
      stars: stars, fog: fog, rip: rip, glint: glint, snags: snags, sh: c(84 - 0.6 * nl, 48, 72) * (rs < 1 ? 0.8 : 1), H0: H0, top: Math.min.apply(null, E) };
  }

  function layers(K, P, D, L) {
    var V = D.tl, ST = V.st, T = K.tone, LW = V.LW, vs = L.vs, rs = L.rs, night = D.pal.key === "night", pal = D.pal, NG = V.NG, x0 = V.x0, xN = x0 + (NG - 1) * ST, nt = V.nt;
    var sw = 5.2 * Math.max(0.72, rs), gap = 1.9 * Math.max(0.8, rs), sun = V.sun, moon = V.moon, orb = night ? moon : sun, sh = V.sh, W = L.FX1 - L.FX0 + 40, top0 = V.far[0].top - 50 * vs;
    function xs(i) { return x0 + i * ST; }
    function trace(g, E, cap) { for (var i = 0; i < NG; i++) g.lineTo(xs(i), cap ? Math.min(E[i], LW) : E[i]); }
    function under(g, E) { g.beginPath(); g.moveTo(x0, LW); trace(g, E, 1); g.lineTo(xN, LW); g.closePath(); }
    function skyClip(g) { g.beginPath(); g.moveTo(x0, L.FY0 - 10); trace(g, V.E, 1); g.lineTo(xN, L.FY0 - 10); g.closePath(); g.clip(); }
    function pines(g, Tr) {
      var p = shape(nt), j, k, x, y, hw, H; g.beginPath();
      for (j = 0; j < Tr.length; j += 4) {
        x = Tr[j]; y = Tr[j + 1]; hw = Tr[j + 2]; H = Tr[j + 3]; g.moveTo(x, y);
        for (k = 1; k < p.length; k++) g.lineTo(x + p[k][0] * hw, y + p[k][1] * H);
        for (k = p.length - 1; k > 0; k--) g.lineTo(x - p[k][0] * hw, y + p[k][1] * H);
        g.closePath();
      }
    }
    function edge(g) { for (var i = 0; i < NG; i++) g[i ? "lineTo" : "moveTo"](xs(i), V.E[i]); }
    function snagPath(g) {
      g.beginPath();
      V.snags.forEach(function (s) {
        var h = sh * s.h, top = s.y - h, x = s.x, d = s.v < 0.5 ? 1 : -1, q, py, px, bl;
        g.moveTo(x - s.l * h * 0.3, Math.min(LW, s.y + V.H0 * 0.42)); g.lineTo(x + s.l * h, top);
        for (q = 0; q < (V.snags.length > 30 ? 1 : 2); q++) {
          py = s.y - h * (0.3 + 0.28 * q); px = x + s.l * h * (0.3 + 0.28 * q); bl = h * (0.38 - 0.1 * q);
          g.moveTo(px, py); g.lineTo(px + d * bl, py - bl * 0.85); d = -d;
        }
        g.moveTo(x + s.l * h, top); g.lineTo(x + s.l * h - d * h * 0.14, top - h * 0.15);
      });
    }
    function keyline(g) {
      K.knock(g, function (g2) {
        g2.lineWidth = sw + gap * 2.6; g2.lineJoin = "round"; g2.lineCap = "round"; g2.beginPath(); edge(g2); g2.stroke();
        snagPath(g2); g2.lineWidth = sw * 0.8 + gap * 2.4; g2.stroke();
      });
    }
    function crest(g, E) { g.beginPath(); g.moveTo(x0, LW); trace(g, E, 1); g.lineTo(xN, LW); g.closePath(); }
    function fog(g, k, t) {
      V.fog.forEach(function (f) {
        if (f[0] !== k) return;
        g.fillStyle = K.vgrad(g, f[2] - f[4], f[2] + f[4], [[0, 0], [0.5, t * f[5]], [1, 0]]); K.ellipse(g, f[1], f[2], f[3], f[4]); g.fill();
      });
    }
    function ranges(g, cv, haze, ft) {                   // back to front: hide what is behind, print, fade into the mist at the foot, then the mist
      for (var k = 0; k < 3; k++) {
        var F = V.far[k], hz = F.top;
        if (cv || ft) K.knock(g, function (g2) { crest(g2, F.E); g2.fill(); });
        if (cv) { g.fillStyle = haze ? K.vgrad(g, hz, hz + 120 * vs, [[0, cv[k]], [1, cv[k] * 0.3]]) : T(cv[k]); crest(g, F.E); g.fill(); }
        if (ft) fog(g, k, ft);
      }
    }
    function disc(g, o, k) { K.circle(g, o.x, o.y, o.r * k); }
    function haze(g, y0, t) { g.fillStyle = K.vgrad(g, y0, LW, [[0, 0], [1, t]]); g.fillRect(L.FX0 - 10, y0, W, LW - y0); }

    var skyLight = function (g) {
      g.save(); skyClip(g);
      if (!night) {
        var gr = g.createRadialGradient(sun.x, sun.y, sun.r * 0.7, sun.x, sun.y, 460 * rs);
        gr.addColorStop(0, T(0.72)); gr.addColorStop(0.35, T(0.36)); gr.addColorStop(0.7, T(0.1)); gr.addColorStop(1, T(0));
        g.fillStyle = gr; g.fillRect(L.FX0 - 10, L.FY0 - 10, W, LW - L.FY0 + 10);
        haze(g, top0, 0.36); g.fillStyle = T(1); disc(g, sun, 1); g.fill();
        K.knock(g, function (g2) { for (var j = 0; j < 5; j++) g2.fillRect(sun.x - sun.r - 2, sun.y + sun.r * (0.12 + j * 0.17), sun.r * 2 + 4, sun.r * (0.03 + j * 0.02)); });
      } else {
        haze(g, top0, 0.3); g.fillStyle = T(1); disc(g, moon, 1); g.fill();
        K.knock(g, function (g2) { K.circle(g2, moon.x - 0.3 * moon.r, moon.y - 0.25 * moon.r, 0.18 * moon.r); g2.fill(); K.circle(g2, moon.x + 0.3 * moon.r, moon.y + 0.2 * moon.r, 0.12 * moon.r); g2.fill(); });
      }
      ranges(g, 0, 0, night ? 0.55 : 0.7);
      keyline(g);
      g.restore();                                       // the treetops white-hot where this ink lies over the line, the snags white
      g.lineJoin = "miter"; g.lineCap = "round"; g.strokeStyle = T(0.5); g.lineWidth = sw * 0.5; g.beginPath(); edge(g); g.stroke();
      g.strokeStyle = T(1); snagPath(g); g.lineWidth = sw * 0.8; g.stroke();
    };
    var skyAqua = function (g) {
      skyClip(g);
      if (night) { g.fillStyle = T(0.95); for (var j = 0; j < V.stars.length; j += 4) { K.circle(g, V.stars[j], V.stars[j + 1], V.stars[j + 2] * (V.stars[j + 3] ? 1.6 : 1)); g.fill(); } }
      else { g.fillStyle = K.vgrad(g, top0, LW, pal.band); g.fillRect(L.FX0 - 10, top0, W, LW - top0); }
      K.knock(g, function (g2) { disc(g2, orb, 1.12); g2.fill(); });
      ranges(g, night ? [0.3, 0.46, 0.64] : [0.36, 0.56, 0.74], true);
      keyline(g);
    };
    var skyKey = function (g) {
      skyClip(g);
      g.fillStyle = K.vgrad(g, L.FY0, LW, pal.top); g.fillRect(L.FX0 - 10, L.FY0 - 10, W, LW - L.FY0 + 10);
      if (!night) K.knockRadial(g, sun.x, sun.y, 400 * rs, 0.9);
      K.knock(g, function (g2) { disc(g2, orb, 1.04); g2.fill(); });
      [0.2, 0.16, 0.2].forEach(function (t, k) { g.fillStyle = T(t); crest(g, V.far[k].E); g.fill(); });
    };
    function ranks(g) {
      g.save(); under(g, V.E); g.clip(); g.beginPath(); g.rect(L.FX0 - 20, L.FY0 - 20, W, LW - L.FY0 + 20); g.clip();
      V.rows.forEach(function (R, q) {
        K.knock(g, function (g2) { pines(g2, R); g2.fill(); if (q < 2) { g2.lineWidth = gap * 1.8; g2.lineJoin = "round"; g2.stroke(); } });
        g.fillStyle = T(ROWS[q]); pines(g, R); g.fill();
      });
      g.restore();
    }
    function lake(g, ink) {
      g.save(); g.beginPath(); g.rect(L.FX0 - 20, LW, W, L.FY1 - LW + 20); g.clip();
      if (ink === 0) {
        g.fillStyle = K.vgrad(g, LW, LW + 60 * vs, [[0, night ? 0.3 : 0.4], [1, 0]]); g.fillRect(L.FX0 - 20, LW, W, 60 * vs);
        g.fillStyle = T(1);
        for (var j = 0; j < V.glint.length; j += 5) { g.globalAlpha = V.glint[j + 4] * (night ? 0.5 : 0.85); g.fillRect(V.glint[j], V.glint[j + 1], V.glint[j + 2], V.glint[j + 3]); }
        g.globalAlpha = 1;
      } else {
        if (ink === 2) { g.fillStyle = K.vgrad(g, LW, L.FY1, [[0, night ? 0.34 : 0.28], [1, night ? 0.6 : 0.5]]); g.fillRect(L.FX0 - 20, LW, W, L.FY1 - LW + 20); }
        g.translate(0, LW * (1 + KR)); g.scale(1, -KR);
        g.fillStyle = K.vgrad(g, V.top, LW, ink === 1 ? [[0, 0.1], [1, 0.62]] : [[0, 0.12], [1, 0.5]]); under(g, V.E); g.fill();
      }
      g.restore(); g.save(); g.beginPath(); g.rect(L.FX0 - 20, LW, W, L.FY1 - LW + 20); g.clip();
      K.knock(g, function (g2) { for (var j = 0; j < V.rip.length; j += 5) { g2.globalAlpha = V.rip[j + 4]; g2.fillRect(V.rip[j], V.rip[j + 1], V.rip[j + 2], V.rip[j + 3]); } });
      g.restore();
    }
    function shore(g) { K.knock(g, function (g2) { g2.fillRect(L.FX0 - 20, LW - gap * 0.4, W, gap * 1.6); }); }
    var landLight = function (g) { lake(g, 0); };
    var landAqua = function (g) { lake(g, 1); ranks(g); shore(g); };
    var landKey = function (g) {
      g.save(); under(g, V.E); g.clip(); g.fillStyle = K.vgrad(g, V.top, LW, [[0, 0.46], [1, 0.14]]); g.fillRect(L.FX0 - 20, L.FY0 - 20, W, LW - L.FY0 + 20); g.restore();
      lake(g, 2); shore(g);
    };
    var line = function (g) {
      g.lineJoin = "miter"; g.lineCap = "round"; g.strokeStyle = T(1); g.lineWidth = sw; g.beginPath(); edge(g); g.stroke();
      g.lineJoin = "round"; g.lineWidth = sw * 0.9; snagPath(g); g.stroke();
    };
    return [
      { ink: "light", role: "sky", draw: skyLight }, { ink: "pink", role: "sky", draw: skyAqua }, { ink: "blue", role: "sky", draw: skyKey },
      { ink: "light", role: "land", draw: landLight }, { ink: "pink", role: "land", draw: landAqua }, { ink: "blue", role: "land", draw: landKey },
      { ink: "pink", role: "line", draw: line }
    ];
  }

  function body(g, D, L) {
    var V = D.tl, i;
    g.moveTo(V.x0, L.FY1 + 10);
    for (i = 0; i < V.NG; i++) g.lineTo(V.x0 + i * V.st, Math.min(V.E[i], V.LW));
    g.lineTo(V.x0 + (V.NG - 1) * V.st, L.FY1 + 10); g.closePath();
  }

  A.add("scene", "forest", {
    name: "Treeline",
    by: "A pine forest across a still lake: the treeline is the record, mist between three ranges, a dead snag where every loss fell.",
    lights: ["golden", "dusk", "night"],
    derive: derive, layers: layers, body: body
  });
})();
