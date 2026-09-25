/* ---------- TRUE 82 LAB concept: the crowned ball ----------
   Perfect season royalty: a basketball wearing a five point crown, set at a
   slight cocky tilt. The crown prints in pure hot ink; the ball gets a second
   ink overprinted on it (the glow drum) so it reads warmer than the crown, a
   halftone core shadow for form, and a contact shadow where the crown sits.
   The seams are real curves on a sphere, tapered toward the edge. */
(function () {
  var R = window.RISO, PI = Math.PI;

  // ---- the ball: seams of an eight panel ball on a unit sphere, rotated and projected ----
  function rot(yaw, pitch, roll) {
    var a = Math.cos(yaw), b = Math.sin(yaw), c = Math.cos(pitch), d = Math.sin(pitch), e = Math.cos(roll), f = Math.sin(roll);
    var Ry = [[a, 0, b], [0, 1, 0], [-b, 0, a]], Rx = [[1, 0, 0], [0, c, -d], [0, d, c]], Rz = [[e, -f, 0], [f, e, 0], [0, 0, 1]];
    function mul(A, B) { var o = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], i, j, k; for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) for (k = 0; k < 3; k++) o[i][j] += A[i][k] * B[k][j]; return o; }
    return mul(Rz, mul(Rx, Ry));
  }
  function ap(M, v) { return [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]]; }
  var SIDE = 0.62, RHO = Math.sqrt(1 - SIDE * SIDE);
  var CURVES = [
    function (t) { return [Math.cos(t), 0, Math.sin(t)]; },
    function (t) { return [0, Math.cos(t), Math.sin(t)]; },
    function (t) { return [SIDE, RHO * Math.cos(t), RHO * Math.sin(t)]; },
    function (t) { return [-SIDE, RHO * Math.cos(t), RHO * Math.sin(t)]; }
  ];
  function seams(g, S, cx, cy, r, M, w) {
    var N = 120, i, k;
    for (k = 0; k < CURVES.length; k++) {
      var prev = ap(M, CURVES[k](0));
      for (i = 1; i <= N; i++) {
        var p = ap(M, CURVES[k](i / N * 2 * PI)), a = prev, b = p;
        prev = p;
        if (a[2] <= 0 && b[2] <= 0) continue;
        if (a[2] <= 0 || b[2] <= 0) { var u = a[2] / (a[2] - b[2]), m = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, 0]; if (a[2] <= 0) a = m; else b = m; }
        var z = Math.max(0, (a[2] + b[2]) / 2);
        g.beginPath(); g.moveTo(cx + a[0] * r, cy + a[1] * r); g.lineTo(cx + b[0] * r, cy + b[1] * r); S.stroke(g, w * (0.42 + 0.58 * Math.sqrt(z)));
      }
    }
  }

  var FLAT = { flat: 1, stamp: 1, sticker: 1, cut: 1 };
  function coreShadow(g, S, cx, cy, r, lx, ly) {
    if (FLAT[S.style]) {
      g.save(); R.circle(g, cx, cy, r); g.clip();
      g.beginPath(); g.rect(cx - r - 2, cy - r - 2, 2 * r + 4, 2 * r + 4);
      g.arc(cx + lx * r * 0.3, cy + ly * r * 0.3, r * 1.02, 0, 2 * PI, true);
      g.fillStyle = S.tone(1); S.fill(g); g.restore();
      return;
    }
    R.circle(g, cx, cy, r);
    g.fillStyle = S.rad(g, cx + lx * r * 0.5, cy + ly * r * 0.5, 0, r * 1.6, [[0, 0], [0.34, 0.02], [0.56, 0.24], [0.8, 0.74], [0.93, 0.56], [1, 0.46]]);
    S.fill(g);
  }

  var BX = 50.5, BY = 64, BR = 31, M = rot(0.42, 0.5, 0.18);

  // ---- the crown, drawn in its own units (x -25..25, band bottom near y 0), then set on the ball ----
  var CR = { x: 47.5, y: 40.5, s: 0.78, a: -0.16 };
  function tf(x, y) {
    var c = Math.cos(CR.a), s = Math.sin(CR.a);
    x *= CR.s; y *= CR.s;
    return [CR.x + x * c - y * s, CR.y + x * s + y * c];
  }
  function mv(g, x, y) { var p = tf(x, y); g.moveTo(p[0], p[1]); }
  function ln(g, x, y) { var p = tf(x, y); g.lineTo(p[0], p[1]); }
  function qd(g, cx, cy, x, y) { var c = tf(cx, cy), p = tf(x, y); g.quadraticCurveTo(c[0], c[1], p[0], p[1]); }
  var TIPS = [[-27, -29], [-13.5, -36], [0, -41], [13.5, -36], [27, -29]];
  var VALS = [[-19.5, -14.5], [-6.6, -16.5], [6.6, -16.5], [19.5, -14.5]];
  function crown(g) {
    g.beginPath();
    mv(g, -22.5, -1.5);
    qd(g, -24.5, -14, TIPS[0][0], TIPS[0][1]);
    for (var i = 0; i < 4; i++) {
      var v = VALS[i], t0 = TIPS[i], t1 = TIPS[i + 1];
      qd(g, (t0[0] + v[0]) / 2 + 1.2, (t0[1] + v[1]) / 2 + 1.5, v[0], v[1]);      // the points curve in a touch, like a real crown's
      qd(g, (t1[0] + v[0]) / 2 - 1.2, (t1[1] + v[1]) / 2 + 1.5, t1[0], t1[1]);
    }
    qd(g, 24.5, -14, 22.5, -1.5);
    qd(g, 0, 6.5, -22.5, -1.5);
    g.closePath();
  }
  function band(g) {                                    // the band's top edge, a curve that wraps the head
    g.beginPath(); mv(g, -23.6, -10.5); qd(g, 0, -4, 23.6, -10.5);
  }
  function tipBalls(g, S, grow) {
    TIPS.forEach(function (t) { var p = tf(t[0], t[1] - 2.2); R.circle(g, p[0], p[1], 3.3 * CR.s + (grow || 0)); S.fill(g); });
  }
  function jewels(g, S) {
    var p = tf(0, -1.2); R.ellipse(g, p[0], p[1], 3.1, 4.1, CR.a); S.fill(g);
    [-12.5, 12.5].forEach(function (x) { var q = tf(x, -3.3); R.circle(g, q[0], q[1], 2.5); S.fill(g); });
  }
  function crownAll(g) { crown(g); g.fill(); TIPS.forEach(function (t) { var p = tf(t[0], t[1] - 2.2); R.circle(g, p[0], p[1], 3.3 * CR.s + 1.2); g.fill(); }); }

  window.LAB.concept({
    id: "crown-ball", name: "Crowned ball", blurb: "A basketball wearing a crown: 82-0 is royalty.",
    draw: function (K) {
      K.part("glow", function (g, S) {
        // a warm aura behind the whole mark
        R.circle(g, 50, 56, 56); g.fillStyle = S.rad(g, 50, 60, 26, 58, [[0, 0.3], [0.5, 0.12], [1, 0]]); g.fill();
        if (S.style === "line" || S.style === "neon") return;
        // the overprint that warms the ball (not the crown)
        R.circle(g, BX, BY, BR); g.fillStyle = S.rad(g, BX + BR * 0.31, BY - BR * 0.39, 0, BR * 1.6, [[0, 0.38], [0.45, 0.52], [0.8, 0.82], [1, 0.86]]); g.fill();
        R.knock(g, function (g2) { crownAll(g2); });
        // the crown: the left face of each point turns from the light
        g.save(); crown(g); g.clip();
        for (var i = 0; i < 4; i++) {
          var v = VALS[i], t1 = TIPS[i + 1];
          g.beginPath(); mv(g, v[0], v[1]); qd(g, (t1[0] + v[0]) / 2 - 1.2, (t1[1] + v[1]) / 2 + 1.5, t1[0], t1[1]); ln(g, t1[0] - 1.5, -8); ln(g, v[0], -7); g.closePath();
          g.fillStyle = S.tone(0.42); g.fill();
        }
        g.beginPath(); mv(g, -26, -12); qd(g, 0, -2, 26, -12); ln(g, 26, 8); ln(g, -26, 8); g.closePath();
        g.fillStyle = S.lin(g, 0, CR.y - 8, 0, CR.y + 6, [[0, 0.08], [1, 0.55]]); g.fill();
        g.restore();
      });
      K.part("body", function (g, S) {
        R.circle(g, BX, BY, BR); S.fill(g);
        crown(g); S.fill(g);
        tipBalls(g, S);
        if (S.mode !== "sil" && S.style !== "line" && S.style !== "neon") R.knock(g, function (g2) { jewels(g2, { fill: function (q) { q.fill(); } }); });
      });
      K.part("shade", function (g, S) {
        // the ball's core shadow, light from the upper right: a halftone ramp, or a clean crescent in the flat styles
        coreShadow(g, S, BX, BY, BR, 0.62, -0.78);
        // the crown's shadow falling on the ball just under the band
        if (S.mode !== "sil") {
          g.save(); R.circle(g, BX, BY, BR); g.clip();
          g.beginPath(); mv(g, -26, -4); qd(g, 0, 16, 26, -4); qd(g, 0, 5, -26, -4); g.closePath();
          g.fillStyle = S.tone(0.62); g.fill(); g.restore();
          R.knock(g, function (g2) { crownAll(g2); });
        }
      });
      K.part("line", function (g, S) {
        seams(g, S, BX, BY, BR, M, 3.9);
        R.circle(g, BX, BY, BR); S.stroke(g, 3.3);
        if (S.mode !== "sil") R.knock(g, function (g2) { crownAll(g2); });
        crown(g); S.stroke(g, 2.8);
        band(g); S.stroke(g, 2.2);
        TIPS.forEach(function (t) { var p = tf(t[0], t[1] - 2.2); R.circle(g, p[0], p[1], 3.3 * CR.s); S.stroke(g, 2.2); });
      });
      K.part("accent", function (g, S) { jewels(g, S); });
    }
  });
})();
