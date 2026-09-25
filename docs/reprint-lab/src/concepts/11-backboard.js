/* ---------- TRUE 82 LAB concept: the backboard ----------
   A clean arena sign: the glass backboard square-on, its frame and target
   box in the key ink, the rim and net below, and a ball at the top of a
   perfect arc, its flight path trailing behind it in dashes.
   The glass carries a whisper of tone and two glints of bare paper. */
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
    var N = 100, i, k;
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

  var B = { x: 8, y: 7, w: 84, h: 53, r: 4.5 };          // the board
  var T = { x: 36.5, y: 37, w: 27, h: 18.5 };             // the target box
  var RIM = { x: 50, y: 61.5, rx: 17, ry: 3.9, tube: 3.4 };
  var BALL = { x: 32, y: 25, r: 12.5 }, M = rot(-0.55, 0.3, -0.35);
  // the flight path: a quadratic from the corner, over the top, into the rim
  var ARC = [[3, 76], [30, -12], [50, 57]];
  function arcPt(t) { var u = 1 - t; return [u * u * ARC[0][0] + 2 * u * t * ARC[1][0] + t * t * ARC[2][0], u * u * ARC[0][1] + 2 * u * t * ARC[1][1] + t * t * ARC[2][1]]; }

  function board(g) { R.roundRect(g, B.x, B.y, B.w, B.h, B.r); }
  function target(g) { g.beginPath(); g.rect(T.x, T.y, T.w, T.h); }
  function ring(g) {
    g.beginPath();
    g.ellipse(RIM.x, RIM.y, RIM.rx + RIM.tube / 2, RIM.ry + RIM.tube / 2, 0, 0, 2 * PI);
    g.moveTo(RIM.x + RIM.rx - RIM.tube / 2, RIM.y);
    g.ellipse(RIM.x, RIM.y, RIM.rx - RIM.tube / 2, Math.max(0.4, RIM.ry - RIM.tube / 2), 0, 2 * PI, 0, true);
  }
  function bracket(g) { g.beginPath(); g.rect(46, T.y + T.h - 1, 8, RIM.y - (T.y + T.h) - 1); }
  var NT = RIM.y + 1.2, NB = 88;
  function nxl(y) { var t = (y - NT) / (NB - NT); return RIM.x - RIM.rx + 1 + t * 8.5; }
  function nxr(y) { var t = (y - NT) / (NB - NT); return RIM.x + RIM.rx - 1 - t * 8.5; }
  function netShape(g) { g.beginPath(); g.moveTo(nxl(NT), NT); g.lineTo(nxr(NT), NT); g.lineTo(nxr(NB), NB); g.quadraticCurveTo(50, NB + 3, nxl(NB), NB); g.closePath(); }
  function net(g, S, w) {
    var n = 5, i, k;
    for (i = 0; i <= n; i++) {
      [1, -1].forEach(function (dir) {
        g.beginPath();
        for (k = 0; k <= 12; k++) {
          var y = NT + (NB - NT) * k / 12, t = k / 12, u = Math.max(0, Math.min(1, i / n + dir * t * 0.6));
          var x = nxl(y) + (nxr(y) - nxl(y)) * (0.5 - 0.5 * Math.cos(u * PI)), yy = y + (k === 12 ? 2.4 * Math.sin(u * PI) : 0);
          if (k) g.lineTo(x, yy); else g.moveTo(x, yy);
        }
        S.stroke(g, w);
      });
    }
    g.beginPath(); g.moveTo(nxl(NB), NB); g.quadraticCurveTo(50, NB + 3, nxr(NB), NB); S.stroke(g, w);
  }
  // the flight path: dashes behind the ball, lengthening and thickening as they near it
  function flight(g, S) {
    var i, k, t0, t1;
    for (i = 0; i < 4; i++) {
      t0 = 0.07 + i * 0.1; t1 = t0 + 0.035 + i * 0.013;
      g.beginPath();
      for (k = 0; k <= 6; k++) { var p = arcPt(t0 + (t1 - t0) * k / 6); if (k) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
      S.stroke(g, 1.9 + i * 0.35);
    }
  }
  function ballGap(g) { R.circle(g, BALL.x, BALL.y, BALL.r + 3.2); g.fill(); }

  window.LAB.concept({
    id: "backboard", name: "Backboard", blurb: "A clean arena sign: glass, target box, rim and net, and a ball on a perfect arc.",
    draw: function (K) {
      K.part("glow", function (g, S) {
        if (S.style === "line" || S.style === "neon") return;
        R.circle(g, BALL.x, BALL.y, BALL.r); g.fillStyle = S.rad(g, BALL.x - BALL.r * 0.35, BALL.y - BALL.r * 0.4, 0, BALL.r * 1.6, [[0, 0.42], [0.45, 0.55], [0.8, 0.84], [1, 0.88]]); g.fill();   // warms the ball
      });
      K.part("shade", function (g, S) {
        // the glass: a whisper of tone, heavier toward the lower right
        board(g); g.fillStyle = S.lin(g, B.x, B.y, B.x + B.w, B.y + B.h, [[0, 0.03], [0.6, 0.12], [1, 0.26]]); S.fill(g);
        // the rim's shadow on the glass and the inside of the net
        g.beginPath(); g.ellipse(RIM.x + 2, T.y + T.h + 3, RIM.rx, 2.4, 0, 0, 2 * PI); g.fillStyle = S.tone(0.34); S.fill(g);
        netShape(g); g.fillStyle = S.lin(g, 0, NT, 0, NB, [[0, 0.42], [1, 0.08]]); S.fill(g);
        if (S.mode !== "sil") R.knock(g, function (g2) {
          // two glints across the glass, and a clean gap around the ball
          g2.beginPath(); g2.moveTo(66, 9); g2.lineTo(74, 9); g2.lineTo(58, 36); g2.lineTo(50, 36); g2.closePath(); g2.fill();
          g2.beginPath(); g2.moveTo(77, 9); g2.lineTo(80, 9); g2.lineTo(64, 36); g2.lineTo(61, 36); g2.closePath(); g2.fill();
          ballGap(g2); ring(g2); g2.fill();
        });
        if (S.mode !== "sil") R.knock(g, function (g2) { flight(g2, { stroke: function (q, w) { q.lineWidth = w + 3; q.stroke(); } }); });
        R.circle(g, BALL.x, BALL.y, BALL.r); g.fillStyle = S.rad(g, BALL.x - BALL.r * 0.45, BALL.y - BALL.r * 0.5, 0, BALL.r * 1.7, [[0, 0], [0.5, 0.02], [0.78, 0.6], [0.92, 0.5], [1, 0.4]]); S.fill(g);
      });
      K.part("line", function (g, S) {
        board(g); S.stroke(g, 4.2);
        target(g); S.stroke(g, 3.2);
        bracket(g); S.fill(g);
        net(g, S, 1.9);
        if (S.mode !== "sil") R.knock(g, function (g2) { ballGap(g2); ring(g2); g2.fill(); });
        ring(g); S.stroke(g, 1.6);
        seams(g, S, BALL.x, BALL.y, BALL.r, M, 2.4);
        R.circle(g, BALL.x, BALL.y, BALL.r); S.stroke(g, 2.4);
      });
      K.part("body", function (g, S) {
        ring(g); S.fill(g);
        R.circle(g, BALL.x, BALL.y, BALL.r); S.fill(g);
      });
      K.part("accent", function (g, S) {
        flight(g, S);
        if (S.mode !== "sil") R.knock(g, function (g2) { ballGap(g2); });
      });
    }
  });
})();
