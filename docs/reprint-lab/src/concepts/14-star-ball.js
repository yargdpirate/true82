/* ---------- TRUE 82 LAB concept: the varsity star ----------
   An old letterman patch: a fat five point felt star with soft cut corners
   in the key ink, a merrowed border in the hot ink, a row of stitching cut
   to bare paper, and a chenille ball sewn in the middle. Each arm is beveled:
   the lit half prints as a lighter screen of the felt. */
(function () {
  var R = window.RISO, PI = Math.PI;

  // ---- the ball ----
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
    var N = 110, i, k;
    for (k = 0; k < CURVES.length; k++) {
      var prev = ap(M, CURVES[k](0));
      for (i = 1; i <= N; i++) {
        var p = ap(M, CURVES[k](i / N * 2 * PI)), a = prev, b = p;
        prev = p;
        if (a[2] <= 0 && b[2] <= 0) continue;
        if (a[2] <= 0 || b[2] <= 0) { var u = a[2] / (a[2] - b[2]), m = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, 0]; if (a[2] <= 0) a = m; else b = m; }
        var z = Math.max(0, (a[2] + b[2]) / 2);
        g.beginPath(); g.moveTo(cx + a[0] * r, cy + a[1] * r); g.lineTo(cx + b[0] * r, cy + b[1] * r); S.stroke(g, w * (0.45 + 0.55 * Math.sqrt(z)));
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
    g.fillStyle = S.rad(g, cx + lx * r * 0.5, cy + ly * r * 0.5, 0, r * 1.6, [[0, 0], [0.34, 0.02], [0.56, 0.24], [0.8, 0.72], [0.93, 0.55], [1, 0.45]]);
    S.fill(g);
  }

  // ---- the star ----
  var SX = 50, SY = 54.5, SR = 48.5, SRI = 0.5 * 48.5;
  function starPts(cx, cy, Ro, Ri) {
    var out = [];
    for (var i = 0; i < 10; i++) { var a = -PI / 2 + i * PI / 5, r = i % 2 ? Ri : Ro; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return out;
  }
  var P0 = starPts(SX, SY, SR, SRI);
  // inset the outline by d along the edge normals (works on the tips and the inner corners)
  function inset(P, d) {
    var n = P.length, out = [], i;
    for (i = 0; i < n; i++) {
      var a = P[(i + n - 1) % n], v = P[i], b = P[(i + 1) % n];
      var e1 = [v[0] - a[0], v[1] - a[1]], e2 = [b[0] - v[0], b[1] - v[1]], l1 = Math.hypot(e1[0], e1[1]), l2 = Math.hypot(e2[0], e2[1]);
      var n1 = [-e1[1] / l1, e1[0] / l1], n2 = [-e2[1] / l2, e2[0] / l2];   // clockwise on screen, so these point inward
      var k = d / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
      out.push([v[0] + (n1[0] + n2[0]) * k, v[1] + (n1[1] + n2[1]) * k]);
    }
    return out;
  }
  // a polygon with rounded corners: rt on the tips (even), ri on the inner corners (odd)
  function soft(g, P, rt, ri) {
    var n = P.length, i;
    g.beginPath();
    var m0 = [(P[n - 1][0] + P[0][0]) / 2, (P[n - 1][1] + P[0][1]) / 2];
    g.moveTo(m0[0], m0[1]);
    for (i = 0; i < n; i++) { var v = P[i], b = P[(i + 1) % n]; g.arcTo(v[0], v[1], (v[0] + b[0]) / 2, (v[1] + b[1]) / 2, i % 2 ? ri : rt); }
    g.closePath();
  }
  function star(g) { soft(g, P0, 4.2, 2.2); }
  var P1 = inset(P0, 5.4);
  function stitchPath(g) { soft(g, P1, 2.4, 1.2); }

  var BX = 50, BY = 55.5, BR = 18.2, M = rot(0.5, 0.45, 0.25);
  var LINEART = { line: 1, neon: 1 };
  var P2 = inset(P0, -2.3);                              // the outer edge of the border
  function edge(g) { soft(g, P2, 5.6, 1.2); }
  function stitches(g, w) { g.setLineDash([3.2, 2.5]); stitchPath(g); g.lineWidth = w; g.stroke(); g.setLineDash([]); }
  function bevel(g) {                                    // the lit half of every arm (the counterclockwise half)
    for (var i = 0; i < 5; i++) {
      var tip = P0[i * 2], inr = P0[(i * 2 + 9) % 10];
      g.beginPath(); g.moveTo(SX, SY); g.lineTo(tip[0], tip[1]); g.lineTo(inr[0], inr[1]); g.closePath(); g.fill();
    }
  }

  window.LAB.concept({
    id: "star-ball", name: "Varsity star", blurb: "An old letterman patch: a felt star with a chenille ball sewn in the middle.",
    draw: function (K) {
      K.part("glow", function (g, S) {
        if (LINEART[S.style]) return;
        R.circle(g, BX, BY, BR); g.fillStyle = S.rad(g, BX - BR * 0.31, BY - BR * 0.39, 0, BR * 1.6, [[0, 0.4], [0.45, 0.55], [0.8, 0.84], [1, 0.9]]); g.fill();   // warms the ball
      });
      K.part("body", function (g, S) {
        star(g); S.stroke(g, 4.6);                       // the merrowed border
        R.circle(g, BX, BY, BR); S.fill(g);
      });
      K.part("shade", function (g, S) { coreShadow(g, S, BX, BY, BR, -0.62, -0.78); });
      K.part("line", function (g, S) {
        star(g); S.fill(g);                              // the felt
        if (S.mode !== "sil" && !LINEART[S.style]) {
          R.knock(g, function (g2) {
            star(g2); g2.lineWidth = 4.6; g2.stroke();   // the border prints clean in the hot ink
            stitches(g2, 1.9);                           // stitching cut to paper
            R.circle(g2, BX, BY, BR + 3.2); g2.fill();   // the ball and a sliver of paper round it
            g2.save(); star(g2); g2.clip(); g2.globalAlpha = 0.36; bevel(g2); g2.restore();
          });
        }
        edge(g); S.stroke(g, 1.5);                       // a keyline round the border
        seams(g, S, BX, BY, BR, M, 3.2);
        R.circle(g, BX, BY, BR); S.stroke(g, 3);
      });
      K.part("paper", function (g, S) {                  // the gap of paper where the ball is sewn on
        if (LINEART[S.style]) return;
        g.beginPath(); g.arc(BX, BY, BR + 3.2, 0, 2 * PI); g.arc(BX, BY, BR + 1.4, 0, 2 * PI, true); g.fill();
      });
    }
  });
})();
