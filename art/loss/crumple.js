/* art/loss/crumple.js: Crumpled. A sheet of paper (white dust) with the loss-pink L printed on it slaps flat, sways,
   then the edges are gathered in: the sheet is a low-poly mesh of 40 facets that slide, tilt and lighten or darken
   (more or fewer white dots) as they close into a ball, the pink L cut into shards on the ball. The ball drops, hits the
   floor of the span with a squash, hops and rolls off the card.
   The mesh is painted on an offscreen scratch (paper facets in live K.pat, the L plate pulled through each facet's
   affine) so the facets occlude, then composed once. One screened job (the L plate). Stretches with E.dur: the flat
   hold (up to 0.7 s); the crumple is 0.14 to 0.28 s and the toss 0.22 to 0.5 s, both absolute. */
(function () {
  "use strict";
  var SW = 200, SH = 250, LW = 137, LH = 190, NX = 4, NY = 5, RB = 76, CW = 300, CH = 340, OX = CW / 2, OY = CH / 2;
  var PW = LW + 10, PH = LH + 10, PX = 74, PY = 100;       // the L plate and where the sheet's center (0,0) falls on it
  function lPath(K, g, x, y, h) {                          // one closed L contour, sharp elbow and toe, a hair of wobble
    var r = K.rand(41), w = h * 0.72, sw = h * 0.3, fh = h * 0.27, i, j, n, t, a, b;
    var P = [[0, 0], [sw, 0], [sw - 1.2, h - fh], [w, h - fh], [w, h], [0, h]];
    g.beginPath(); g.moveTo(x, y);
    for (i = 1; i <= 6; i++) {
      a = P[i - 1]; b = P[i % 6]; n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14);
      for (j = 1; j <= n; j++) { t = j / n; g.lineTo(x + a[0] + (b[0] - a[0]) * t + (j < n ? r() - 0.5 : 0), y + a[1] + (b[1] - a[1]) * t + (j < n ? r() - 0.5 : 0)); }
    }
    g.closePath();
  }
  function build(K) {                                      // the sheet as 4 x 5 cells of 2 facets; each vertex also knows its place on the ball
    var r = K.rand(2209), V = [], T = [], i, j, cw = SW / NX, ch = SH / NY, v, a, nx, ny, k;
    for (j = 0; j <= NY; j++) for (i = 0; i <= NX; i++) {
      v = { rx: -SW / 2 + i * cw + (i > 0 && i < NX ? (r() - 0.5) * cw * 0.45 : (r() - 0.5) * 1.5), ry: -SH / 2 + j * ch + (j > 0 && j < NY ? (r() - 0.5) * ch * 0.45 : (r() - 0.5) * 1.5) };
      nx = v.rx / (SW / 2); ny = v.ry / (SH / 2); k = RB * (0.74 + 0.3 * r());
      v.ex = nx * Math.sqrt(1 - ny * ny / 2) * k + (r() - 0.5) * 9; v.ey = ny * Math.sqrt(1 - nx * nx / 2) * k + (r() - 0.5) * 9;
      v.wx = r() - 0.5; v.wy = r() - 0.5; v.dl = 1 - Math.hypot(nx, ny) / 1.42;
      V.push(v);
    }
    for (j = 0; j < NY; j++) for (i = 0; i < NX; i++) {
      a = j * (NX + 1) + i;
      var b = a + 1, c = a + NX + 1, d = c + 1;
      if ((i + j) % 2) { T.push([a, b, d, r()]); T.push([a, d, c, r()]); } else { T.push([a, b, c, r()]); T.push([b, d, c, r()]); }
    }
    return { V: V, T: T };
  }
  // paint the sheet at crumple c (0 flat .. 1 ball), scale s, on the scratch (upright: the spin is applied when it is composed)
  function paint(K, st, c, s) {
    var S = st.S, g = S.getContext("2d"), V = st.M.V, T = st.M.T, d = K.d, k = st.P.k, P = [], pl = [], i, t, v, w, x, y, ci, q;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S.width, S.height); g.setTransform(d, 0, 0, d, 0, 0);
    var rule = K.pat("pop", 0.88, g), edge = K.pat("loss", 0.88, g);   // one pattern each, shared by every facet
    for (i = 0; i < V.length; i++) {
      v = V[i]; ci = K.clamp((c - 0.35 * v.dl) / 0.65, 0, 1); w = K.ease.inOut(ci);
      x = v.rx + (v.ex - v.rx) * w + v.wx * Math.sin(ci * Math.PI) * 15; y = v.ry + (v.ey - v.ry) * w + v.wy * Math.sin(ci * Math.PI) * 15;
      P.push([OX + s * x, OY + s * y]);
    }
    for (i = 0; i < T.length; i++) {
      t = T[i];
      var A = V[t[0]], B = V[t[1]], C = V[t[2]], p0 = P[t[0]], p1 = P[t[1]], p2 = P[t[2]];
      var x0 = Math.min(p0[0], p1[0], p2[0]), y0 = Math.min(p0[1], p1[1], p2[1]);
      g.save(); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.closePath(); g.clip();
      q = Math.round(K.clamp(0.3 + c * (t[3] - 0.42) * 1.25, 0.06, 0.72) * 16);
      g.fillStyle = pl[q] || (pl[q] = K.pat("light", q / 16, g));
      g.fillRect(x0 - 1, y0 - 1, 2 + Math.max(p0[0], p1[0], p2[0]) - x0, 2 + Math.max(p0[1], p1[1], p2[1]) - y0);
      var u0 = B.rx - A.rx, u1 = B.ry - A.ry, v0 = C.rx - A.rx, v1 = C.ry - A.ry, U0 = p1[0] - p0[0], U1 = p1[1] - p0[1], V0 = p2[0] - p0[0], V1 = p2[1] - p0[1];
      var dt = u0 * v1 - u1 * v0, a = (U0 * v1 - V0 * u1) / dt, cc = (V0 * u0 - U0 * v0) / dt, b = (U1 * v1 - V1 * u1) / dt, dd = (V1 * u0 - U1 * v0) / dt;
      g.transform(a, b, cc, dd, p0[0] - a * A.rx - cc * A.ry, p0[1] - b * A.rx - dd * A.ry);   // from here the facet is drawn in the sheet's own space
      g.strokeStyle = rule; g.lineWidth = 1.5 / s; g.fillStyle = edge;       // notebook ruling and a margin line
      var xa = Math.min(A.rx, B.rx, C.rx) - 1, xb = Math.max(A.rx, B.rx, C.rx) + 1, ya = Math.min(A.ry, B.ry, C.ry) - 1, yb = Math.max(A.ry, B.ry, C.ry) + 1;
      g.beginPath(); for (w = Math.max(0, Math.ceil((ya + SH / 2 - 22) / 17)); w <= (yb + SH / 2 - 22) / 17 && w < 13; w++) { g.moveTo(xa, w * 17 - SH / 2 + 22); g.lineTo(xb, w * 17 - SH / 2 + 22); } g.stroke();
      if (xa < -SW / 2 + 30 && xb > -SW / 2 + 28) g.fillRect(-SW / 2 + 28, ya, 1.8, yb - ya);
      var lx = Math.max(0, Math.min(A.rx, B.rx, C.rx) + PX), ly = Math.max(0, Math.min(A.ry, B.ry, C.ry) + PY);   // the L plate: only this facet's box of it
      var lw = Math.min(PW, Math.max(A.rx, B.rx, C.rx) + PX) - lx, lh = Math.min(PH, Math.max(A.ry, B.ry, C.ry) + PY) - ly;
      if (lw > 0 && lh > 0) { g.translate(-PX, -PY); g.drawImage(st.L, lx * k, ly * k, lw * k, lh * k, lx, ly, lw, lh); }
      g.restore();
    }
  }
  function warm(K, st, ink) {                              // builds the ink's screen in a job of its own (the first print of an ink is the slow one)
    return function () { if (!st.w) st.w = K.plate(8, 8, 1); K.screen(st.w, ink, function (g) { g.fillStyle = K.tone(0.5); g.fillRect(0, 0, 8, 8); }); };
  }
  T82ART.add("loss", "crumple", {
    name: "Crumpled",
    by: "A sheet with a pink L slaps on, crumples into a faceted paper ball, drops, bounces and is tossed off the card.",
    prep: function (K) {
      var st = K.st;
      return [
        function () { st.P = K.plate(PW, PH, 3307); st.M = build(K); },
        warm(K, st, "loss"),
        function () {
          st.L = K.screen(st.P, "loss", function (g) {
            var gr = g.createLinearGradient(0, 5, 0, 5 + LH); gr.addColorStop(0, K.tone(0.82)); gr.addColorStop(1, K.tone(0.98));
            g.fillStyle = gr; lPath(K, g, 5, 5, LH); g.fill();
          });
        },
        function () { var c = document.createElement("canvas"); c.width = Math.round(CW * K.d); c.height = Math.round(CH * K.d); st.S = c; }
      ];
    },
    hit: function (K, E) {
      K.flash(E.first ? 0.6 : 0.42); K.shake(Math.max(E.dur, 0.4), E.first ? 10 : 7);
      K.ring({ x: E.x, y: E.y, dur: 0.34, r0: 6, r1: E.first ? 150 : 100, w0: 8, ink: "loss", cov: 0.8 });
    },
    draw: function (K, E, e) {
      var st = K.st, B = K.box, g = K.g, f = K.fade(E, e);
      if (!st.L || !st.S || f <= 0) return;
      var s = (B.y1 - B.y0) / LH, eh = Math.floor(e * 12) / 12, side = K.rand(E.seed ^ 19)() < 0.5 ? -1 : 1;
      var X = K.clamp(E.dur * 0.4, 0.2, 0.45), tt = E.dur - X, Dc = K.clamp(E.dur * 0.2, 0.1, 0.26), tc = Math.max(0.1, tt - Dc - 0.04);
      var c = K.clamp((e - tc) / Dc, 0, 1), p = K.clamp((e - tt) / X, 0, 1);
      var sl = 1 - K.ease.out(e / 0.08), z = 1 + 0.3 * sl, ang = -0.08 - side * 0.22 * sl + 0.025 * Math.sin(eh * 9) * (1 - c) + side * (0.35 * c + 7 * p);
      var cx = B.cx, cy = (B.y0 + B.y1) / 2, Rp = RB * s * 0.95, df = Math.max(0, B.y1 - Rp - cy), hop = 0.32 * (B.y1 - B.y0);
      var dx = side * (60 * p + 420 * p * p * p), dy = 0, sx = 1, sy = 1;
      if (p > 0) {
        if (p < 0.4) dy = df * Math.pow(p / 0.4, 2);
        else { var u = (p - 0.4) / 0.6; dy = df - hop * 4 * u * (1 - u); }
        var q = 1 - Math.min(1, Math.abs(p - 0.4) / 0.07);
        if (q > 0) { sx = 1 + 0.2 * q; sy = 1 - 0.2 * q; }
      }
      var pre = 0.14 * K.smooth(0.1, Math.max(0.2, tc), e), cq = Math.round((pre + (1 - pre) * c) * 120) / 120;
      if (cq + "/" + s !== st.cq) { paint(K, st, cq, s); st.cq = cq + "/" + s; }           // repaint only when the sheet has changed (the toss never does)
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      var bx = cx + dx, by = cy + dy + (sy < 1 ? (1 - sy) * Rp : 0);
      g.translate(bx, by); g.rotate(ang); g.scale(z * sx, z * sy);
      g.drawImage(st.S, -CW / 2, -CH / 2, CW, CH);
      g.restore();
    }
  });
})();
