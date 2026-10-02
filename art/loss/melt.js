/* art/loss/melt.js: Wax Melt. A thick, glossy pink L (a light highlight down the stem and along the foot, a magenta
   shadow plate for its thickness) slams in with a squash. Then it melts: the stem slumps and leans over, the foot droops
   at its toe, the outline softens, fat drips grow under it with beads that pinch off and fall into a puddle that
   spreads along the baseline. At the end the whole puddle slides down off the card in one heavy drop.
   All live: one pink path (the warped outline, drips, beads, puddle) in one K.pat fill, a magenta plate under it and a
   light highlight over it. Beats (s): slam 0 to .08, hold, melt from .18 (the slump finishes about .55 s before the
   end), the slide takes the last .12 to .34 s; a short moment gets the slam, the first sag and the slide. */
(function () {
  "use strict";
  var PI = Math.PI, TAU = PI * 2, YB = 0.36, HH = 0.86, X0 = -0.19, DX = [-0.27, -0.12, 0.02, 0.14, 0.25, 0.31];
  function base() {                                     // the L's outline (H units), a point every .02
    var P = [[-0.32, -0.5], [-0.06, -0.5], [-0.06, 0.16], [0.32, 0.16], [0.32, YB], [-0.32, YB]], S = [], i, j, n, a, b, l, q, M;
    for (i = 0; i < 6; i++) {
      a = P[i]; b = P[(i + 1) % 6]; l = Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1])); n = Math.round(l / 0.02);
      for (j = 0; j < n; j++) S.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n, (b[1] - a[1]) / l, -(b[0] - a[0]) / l]);
    }
    n = S.length;
    for (q = 0; q < 2; q++) {                           // smooth the outward normals over a few samples (the lit side is found from them)
      M = S.map(function (s, k) { var u = S[(k + n - 2) % n], w = S[(k + 2) % n], x = u[2] + 2 * s[2] + w[2], y = u[3] + 2 * s[3] + w[3], d = Math.sqrt(x * x + y * y) || 1; return [x / d, y / d]; });
      for (i = 0; i < n; i++) { S[i][2] = M[i][0]; S[i][3] = M[i][1]; }
    }
    return S;
  }
  function warp(x, y, m) {                              // the slump: heights shrink, the base widens, the top leans, the toe droops
    var v = Math.max(0, Math.min(1, (YB - y) / HH)), yy = YB + 0.07 * m - (YB - y) * (1 - 0.55 * m * Math.pow(v, 0.8));
    var xx = X0 + (x - X0) * (1 + 0.35 * m * (1 - v)) + 0.2 * m * v * v;
    if (x > -0.06) yy += 0.09 * m * Math.pow((x + 0.06) / 0.38, 2);
    return [xx, yy];
  }
  T82ART.add("loss", "melt", {
    name: "Wax Melt",
    by: "A thick glossy pink L slams in, then melts: the stem slumps and leans, the toe droops, drips grow under it and their beads pinch off into a puddle on the baseline, and the whole puddle slides off the card.",
    // the tempo dial (art/tempo.json): phase "melt" begins at 0.171 of E.dur, where the melting starts: fixed at 0.18 s (tM), so this is its place in a 1.05 s moment (0.106 of 1.7 s)
    phases: { melt: 0.171 },
    hit: function (K, E) {
      var B = K.box, H = B.y1 - B.y0;
      K.flash(E.first ? 0.55 : 0.4); K.shake(Math.max(E.dur, 0.4), E.first ? 11 : 8);
      K.ring({ x: B.cx, y: B.y1 - 0.1 * H, dur: 0.34, r0: 10, r1: 0.7 * H, w0: 7, ink: "loss", cov: 0.8 });
      K.ring({ x: B.cx, y: B.y1 - 0.1 * H, delay: 0.04, dur: 0.36, r0: 6, r1: 0.9 * H, w0: 4, ink: "key", cov: 0.8 });
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, f = K.fade(E, e), H = B.y1 - B.y0, c = K.clamp, i, j, k, n, a, b, p, q;
      if (f <= 0) return;
      if (!st.p) st.p = base();
      var P = st.p, W = [], X = Math.min(0.34, Math.max(0.12, 0.28 * E.dur)), tM = 0.18, tE = Math.max(E.dur - X, tM + 0.1), tF = Math.max(tM + 0.3, tE - 0.1);
      var m = Math.pow(c((e - tM) / (tF - tM), 0, 1), 1.4), u = c((e - tE) / X, 0, 1), u2 = u * u, fall = 1.1 * H * u2, yP = 0.475;
      var sl = c(e / 0.08, 0, 1), sq = sl < 1 ? Math.sin(sl * PI) : 0, z = 1 + 0.3 * (1 - K.ease.out(c(e / 0.06, 0, 1)));
      n = P.length;
      for (i = 0; i < n; i++) W.push(warp(P[i][0], P[i][1], m));
      var R = Math.round(7 * Math.pow(m, 0.7)), Lw = [], f2;
      function avg(W) { var Q = [], i, j, a, b, k; for (i = 0; i < n; i++) { a = 0; b = 0; for (j = -R; j <= R; j++) { k = W[(i + j + n * 9) % n]; a += k[0]; b += k[1]; } Q.push([a / (2 * R + 1), b / (2 * R + 1)]); } return Q; }   // the outline softens as it melts
      for (i = 0; i < n; i++) { f2 = 0.012 + 0.055 * Math.max(0, 0.707 * (P[i][2] + P[i][3])); Lw.push([W[i][0] - P[i][2] * f2, W[i][1] - P[i][3] * f2]); }   // the lit side: the outline drawn in from the shaded (lower right) edges
      var Q = avg(W), Lq = avg(Lw);
      g.save(); g.beginPath(); g.rect(0, K.top, K.w, K.h - K.top); g.clip();
      g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      g.translate(B.cx, (B.y0 + B.y1) / 2 + fall);
      g.translate(0, YB * H); g.scale(z * (1 + 0.12 * sq), z * (1 - 0.14 * sq)); g.translate(0, -YB * H);
      function poly(L) { for (var i = 0; i < L.length; i++) g[i ? "lineTo" : "moveTo"](L[i][0] * H, L[i][1] * H); g.closePath(); }
      g.save(); g.translate(0.035 * H, 0.03 * H); g.beginPath(); poly(Q); g.fillStyle = K.pat("key", 0.6, g); g.fill(); g.restore();   // the thickness
      g.beginPath(); poly(Q);
      var gm = K.smooth(0.05, 0.3, m), rx = 0.5 * K.smooth(0.03, 1, m) * H;
      for (j = 0; j < 6; j++) {                          // drips under the L: they grow, the bead pinches off and falls to the puddle, the stub draws back
        var t0 = tM + 0.06 + 0.07 * j, T = 0.5 + 0.04 * j, ph = e > t0 ? ((e - t0) / T) % 1 : -1, lm = (0.12 + 0.05 * (j % 3)) * H * gm;
        if (ph < 0 || gm <= 0) continue;
        var yb = warp(DX[j], YB, m)[1] * H - 0.01 * H, mx = Math.max(0, (yP - 0.01) * H - yb - 0.05 * H), ln = Math.min(lm, mx), xj = warp(DX[j], YB, m)[0] * H, br = (0.03 + 0.02 * Math.min(1, ph / 0.55)) * H;
        if (ph < 0.55) {
          q = ln * Math.pow(ph / 0.55, 1.3);
          g.moveTo(xj - 0.06 * H, yb); g.lineTo(xj + 0.06 * H, yb); g.lineTo(xj + 0.02 * H, yb + q); g.lineTo(xj - 0.02 * H, yb + q); g.closePath();
          g.moveTo(xj + br, yb + q); g.arc(xj, yb + q, br, 0, TAU);
        } else if (ph < 0.85) {
          q = (ph - 0.55) * T; b = yb + ln + 9 * H * q * q;
          if (b + br < yP * H + 0.02 * H) { g.moveTo(xj + br, b); g.arc(xj, b, br, 0, TAU); }
          a = ln * 0.6 * (1 - (ph - 0.55) / 0.3);
          g.moveTo(xj - 0.06 * H, yb); g.lineTo(xj + 0.06 * H, yb); g.lineTo(xj + 0.01 * H, yb + a); g.lineTo(xj - 0.01 * H, yb + a); g.closePath();
        }
      }
      if (rx > 2) { g.moveTo(rx - 0.02 * H, yP * H); g.ellipse(-0.02 * H, yP * H, rx, (0.025 + 0.03 * m) * H, 0, 0, TAU); }   // the puddle
      g.fillStyle = K.pat("loss", 0.7 * (1 - 0.5 * u2), g); g.fill();
      g.beginPath(); poly(Lq); g.fillStyle = K.pat("loss", 0.88 * (1 - 0.5 * u2), g); g.fill();   // the lit pass: a second print where the wax faces the light
      g.beginPath();                                     // the gloss and the runs: light strips carried through the same slump, runs growing down the faces
      function bar(vert, c0, t0, t1, hw, cap) {            // a strip along the stem (vert) or the foot, its ends warped with the L; counter-clockwise
        var q = [], r2 = [], i, p, w, nn = 10;
        for (i = 0; i <= nn; i++) { w = t0 + (t1 - t0) * i / nn; q.push(vert ? warp(c0 - hw, w, m) : warp(w, c0 + hw, m)); r2.push(vert ? warp(c0 + hw, w, m) : warp(w, c0 - hw, m)); }
        for (i = 0; i <= nn; i++) g[i ? "lineTo" : "moveTo"](q[i][0] * H, q[i][1] * H);
        for (i = nn; i >= 0; i--) g.lineTo(r2[i][0] * H, r2[i][1] * H);
        g.closePath();
        if (cap) { p = vert ? warp(c0, t1, m) : warp(t1, c0, m); g.moveTo(p[0] * H + hw * H * 1.25, p[1] * H); g.arc(p[0] * H, p[1] * H, hw * H * 1.25, 0, TAU, true); }
      }
      bar(true, -0.275, -0.42, 0.04, 0.018, false); bar(false, 0.215, 0.0, 0.27, 0.014, false);
      for (j = 0; j < 6; j++) {                          // wax runs, longest on the stem
        var rl = K.smooth(0.03 + 0.05 * j, 0.7, m) * (j < 3 ? 0.22 + 0.09 * j : 0.07 + 0.01 * j), y0 = j < 3 ? -0.48 : 0.18;
        if (rl > 0.02) bar(true, j < 3 ? -0.27 + 0.065 * j : 0.06 + 0.08 * (j - 3), y0, y0 + rl, 0.017, true);
      }
      g.fillStyle = K.pat("light", 0.55 * (1 - 0.6 * m), g); g.fill();
      g.restore();
    }
  });
})();
