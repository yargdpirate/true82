/* ---------- TRUE 82 LAB concept: the trophy ----------
   A championship trophy of our own: a gold ball resting in a tall flared cup
   worked like a net, on a knotted stem and a dark two step plinth with a
   star plate. The gold is modeled the riso way: bands of warm overprint
   (the glow drum) run down the cup like light on polished metal, and rays
   burst out behind it. */
(function () {
  var R = window.RISO, PI = Math.PI;

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

  var BX = 50, BY = 18.5, BR = 14.2, M = rot(-0.5, 0.36, -0.12);
  var LIP = { y: 32.5, rx: 18, ry: 3.8 }, STEM = { y: 60 };

  // the cup: a flared bowl from the lip to the stem, its sides curving in like a net pulled tight.
  // Its top edge is the near half of the lip, so the ball can sit down inside it.
  function cup(g) {
    g.beginPath();
    g.moveTo(50 - LIP.rx, LIP.y);
    g.bezierCurveTo(50 - LIP.rx + 2.2, LIP.y + 14, 50 - 6, STEM.y - 10, 50 - 3.6, STEM.y);
    g.lineTo(50 + 3.6, STEM.y);
    g.bezierCurveTo(50 + 6, STEM.y - 10, 50 + LIP.rx - 2.2, LIP.y + 14, 50 + LIP.rx, LIP.y);
    g.ellipse(50, LIP.y, LIP.rx, LIP.ry, 0, 0, PI, false);
    g.closePath();
  }
  function lipBack(g) { g.beginPath(); g.ellipse(50, LIP.y, LIP.rx, LIP.ry, 0, PI, 2 * PI, false); }
  function trophyAll(g) { R.circle(g, BX, BY, BR); g.fill(); cup(g); g.fill(); lipRing(g); g.fill(); stem(g); g.fill(); }
  function cupX(t, side) {                           // x of the cup's side at height t (0 lip, 1 stem)
    var u = 1 - t, x0 = 50 - LIP.rx, x1 = 50 - LIP.rx + 2.2, x2 = 50 - 6, x3 = 50 - 3.6;
    var x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
    return side > 0 ? 100 - x : x;
  }
  function lipRing(g) { R.ellipse(g, 50, LIP.y, LIP.rx, LIP.ry); }
  function stem(g) {                                 // the stem, a knot, and a foot flaring onto the plinth
    g.beginPath();
    g.moveTo(50 - 3.4, STEM.y - 1); g.lineTo(50 + 3.4, STEM.y - 1);
    g.lineTo(50 + 3.4, 67); g.quadraticCurveTo(50 + 3.6, 70.5, 50 + 9, 71.5); g.lineTo(50 - 9, 71.5); g.quadraticCurveTo(50 - 3.6, 70.5, 50 - 3.4, 67);
    g.closePath();
    g.moveTo(50 + 6.6, STEM.y + 4); g.ellipse(50, STEM.y + 4, 6.6, 2.5, 0, 0, 2 * PI);   // the knot
  }
  function plinth(g) {                               // a two step plinth (roundRect begins the path)
    R.roundRect(g, 28, 78, 44, 17, 2.2);
    g.moveTo(37.5, 71.5); g.lineTo(62.5, 71.5); g.lineTo(65, 78); g.lineTo(35, 78); g.closePath();
  }
  function plate(g) { R.roundRect(g, 39, 82.5, 22, 8.5, 1.5); }
  function rays(g, S) {
    var n = 12, i;
    for (i = 0; i < n; i++) {
      var a = -PI / 2 + (i + 0.5) * 2 * PI / n, w = PI / n * 0.5;
      g.beginPath(); g.moveTo(50, 30);
      g.lineTo(50 + Math.cos(a - w) * 60, 30 + Math.sin(a - w) * 60);
      g.lineTo(50 + Math.cos(a + w) * 60, 30 + Math.sin(a + w) * 60);
      g.closePath();
      g.fillStyle = S.rad(g, 50, 30, 14, 58, [[0, 0.42], [0.5, 0.17], [1, 0]]); g.fill();
    }
  }
  // the net worked into the cup: strands that follow the flare, crossing into diamonds
  function lattice(g, S, w) {
    var n = 5, k, i;
    for (k = -n; k <= n; k++) {
      [1, -1].forEach(function (dir) {
        g.beginPath();
        for (i = 0; i <= 24; i++) {
          var t = i / 24, u = k / n + dir * t * 0.55;
          var xl = cupX(t, -1), xr = cupX(t, 1), yy = LIP.y + (STEM.y - LIP.y) * t;
          var ph = Math.max(-1, Math.min(1, u));
          var x = (xl + xr) / 2 + (xr - xl) / 2 * Math.sin(ph * PI / 2);
          if (i) g.lineTo(x, yy + LIP.ry * Math.cos(ph * PI / 2) * (1 - t)); else g.moveTo(x, yy + LIP.ry * Math.cos(ph * PI / 2));
        }
        S.stroke(g, w);
      });
    }
  }

  window.LAB.concept({
    id: "trophy", name: "The trophy", blurb: "A gold ball resting in a tall net-worked cup: the prize at the end of 82-0.",
    draw: function (K) {
      K.part("glow", function (g, S) {
        rays(g, S);
        if (S.style === "line" || S.style === "neon") return;
        R.knock(g, trophyAll);                          // the rays stop behind the trophy
        // the inside of the cup, in shadow where the ball does not fill it
        g.save(); lipRing(g); g.clip(); g.fillStyle = S.tone(0.72); g.fillRect(0, 0, 100, 100); g.restore();
        R.knock(g, function (g2) { R.circle(g2, BX, BY, BR); g2.fill(); });
        // the ball turns warm away from the light
        g.save(); R.circle(g, BX, BY, BR); g.clip();
        g.fillStyle = S.rad(g, BX - BR * 0.4, BY - BR * 0.45, 0, BR * 1.9, [[0, 0], [0.35, 0.04], [0.62, 0.5], [0.85, 0.85], [1, 0.8]]); g.fillRect(0, 0, 100, 100); g.restore();
        R.knock(g, function (g2) { cup(g2); g2.fill(); });
        // warm bands down the cup and stem, like light on polished metal
        g.save(); cup(g); g.clip();
        g.fillStyle = S.lin(g, 50 - LIP.rx, 0, 50 + LIP.rx, 0, [[0, 0.7], [0.12, 0.25], [0.26, 0], [0.5, 0.04], [0.68, 0.34], [0.86, 0.62], [1, 0.8]]);
        g.fillRect(0, 0, 100, 100); g.restore();
        g.save(); stem(g); g.clip();
        g.fillStyle = S.lin(g, 41, 0, 59, 0, [[0, 0.7], [0.36, 0.04], [0.66, 0.4], [1, 0.8]]); g.fillRect(0, 0, 100, 100); g.restore();
      });
      K.part("body", function (g, S) {
        R.circle(g, BX, BY, BR); S.fill(g);
        cup(g); S.fill(g);
        lipRing(g); S.fill(g);
        stem(g); S.fill(g);
        plate(g); S.fill(g);
      });
      K.part("shade", function (g, S) {
        // the ball's core shadow, hidden where the ball sits down in the cup
        R.circle(g, BX, BY, BR);
        g.fillStyle = S.rad(g, BX - BR * 0.45, BY - BR * 0.5, 0, BR * 1.7, [[0, 0], [0.5, 0], [0.8, 0.4], [0.93, 0.3], [1, 0.25]]); S.fill(g);
        if (S.mode !== "sil") R.knock(g, function (g2) { cup(g2); g2.fill(); });
        // the deepest turn of the metal, and the shadow just under the lip
        cup(g); g.fillStyle = S.lin(g, 50 - LIP.rx, 0, 50 + LIP.rx, 0, [[0, 0.35], [0.12, 0], [0.7, 0], [0.9, 0.3], [1, 0.45]]); S.fill(g);
        cup(g); g.fillStyle = S.lin(g, 0, LIP.y, 0, STEM.y, [[0, 0.3], [0.25, 0], [1, 0]]); S.fill(g);
      });
      // the net worked into the cup, cut to bright paper (before the line part, so the key ink outline stays whole)
      K.part("paper", function (g, S) {
        if (S.style === "line" || S.style === "neon") return;
        g.save(); cup(g); g.clip(); lattice(g, { stroke: function (q, w) { q.lineWidth = w; q.stroke(); } }, 0.95); g.restore();
      });
      K.part("line", function (g, S) {
        // the plinth prints solid in the key ink, with a star plate and a bright edge knocked through
        plinth(g); S.fill(g);
        if (S.mode !== "sil" && S.style !== "line" && S.style !== "neon") {
          R.knock(g, function (g2) { g2.fillRect(29.5, 79.2, 41, 1.2); plate(g2); g2.fill(); });
        }
        plate(g); S.stroke(g, 1.2);
        R.star(g, 50, 87, 3.9, 1.75); S.fill(g);
        // the far lip, hidden behind the ball; then the ball, hidden where it sits down in the cup
        lipBack(g); S.stroke(g, 2.2);
        if (S.mode !== "sil") R.knock(g, function (g2) { R.circle(g2, BX, BY, BR); g2.fill(); });
        seams(g, S, BX, BY, BR, M, 2.8);
        R.circle(g, BX, BY, BR); S.stroke(g, 2.6);
        if (S.mode !== "sil") R.knock(g, function (g2) { cup(g2); g2.fill(); });
        // the cup (its outline carries the near lip) and the stem
        cup(g); S.stroke(g, 2.6);
        stem(g); S.stroke(g, 2.2);
      });
    }
  });
})();
