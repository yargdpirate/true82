/* ---------- TRUE 82 LAB concept: the hoop (today's mark) ----------
   A reference concept: shows the contract. The icon lives in a 100 x 100
   box. Parts: body (the main mass), line (drawn detail), shade (tone for
   dimension), glow (auras), accent (a third color), paper (knock to paper).
   Always finish shapes with S.fill(g) / S.stroke(g, w) so icon styles can
   reinterpret them, and take tones from S.tone / S.lin / S.rad. */
(function () {
  var R = window.RISO;
  // the net as a diamond lattice between the rim (y 34) and the bottom (y 94)
  function netPath(g) {
    var top = 34, bot = 94, n = 6, i, k;
    function xl(y) { var t = (y - top) / (bot - top); return 14 + t * 18; }
    function xr(y) { var t = (y - top) / (bot - top); return 86 - t * 18; }
    g.beginPath();
    for (i = 0; i <= n; i++) {
      // strands leaning right and left, bowing inward toward the bottom
      var u = i / n;
      g.moveTo(xl(top) + (xr(top) - xl(top)) * u, top);
      for (k = 1; k <= 12; k++) { var y = top + (bot - top) * k / 12, t = k / 12, uu = Math.min(1, u + t * 0.5); g.lineTo(xl(y) + (xr(y) - xl(y)) * uu, y); }
      g.moveTo(xl(top) + (xr(top) - xl(top)) * u, top);
      for (k = 1; k <= 12; k++) { var y2 = top + (bot - top) * k / 12, t2 = k / 12, uu2 = Math.max(0, u - t2 * 0.5); g.lineTo(xl(y2) + (xr(y2) - xl(y2)) * uu2, y2); }
    }
    g.moveTo(xl(bot), bot); g.lineTo(xr(bot), bot);
    g.moveTo(xl(64), 64); g.quadraticCurveTo(50, 67, xr(64), 64);
  }
  window.LAB.concept({
    id: "hoop-star", name: "The hoop", blurb: "Today's mark: rim, net and star, reprinted in ink.",
    draw: function (K) {
      K.part("shade", function (g, S) {                  // the net's inside, falling into shadow
        g.beginPath(); g.moveTo(14, 34); g.lineTo(86, 34); g.lineTo(68, 94); g.lineTo(32, 94); g.closePath();
        g.fillStyle = S.lin(g, 0, 34, 0, 94, [[0, 0.5], [1, 0.08]]); S.fill(g);
      });
      K.part("line", function (g, S) { netPath(g); S.stroke(g, 2.4); });
      K.part("body", function (g, S) {                   // the rim, seen almost edge-on
        g.beginPath(); g.moveTo(4, 27); g.lineTo(96, 27); g.quadraticCurveTo(99, 30.5, 96, 34); g.lineTo(4, 34); g.quadraticCurveTo(1, 30.5, 4, 27); g.closePath();
        S.fill(g);
        g.beginPath(); g.rect(44, 18, 12, 9); S.fill(g);   // the bracket
      });
      K.part("glow", function (g, S) {                    // a bright lip along the rim
        g.fillStyle = S.tone(0.6); g.fillRect(8, 27.6, 84, 2);
      });
    }
  });

  window.LAB.concept({
    id: "ball-sun", name: "Basketball sun", blurb: "The results page's sun: a ball rising, seams cut to paper.",
    draw: function (K) {
      K.part("body", function (g, S) { R.circle(g, 50, 50, 45); S.fill(g); });
      K.part("shade", function (g, S) {                  // roundness: the far side falls off
        R.circle(g, 50, 50, 45); g.fillStyle = S.rad(g, 36, 34, 8, 70, [[0, 0], [0.55, 0.22], [1, 0.75]]); S.fill(g);
      });
      K.part("line", function (g, S) { R.circle(g, 50, 50, 45); S.stroke(g, 2.6); R.seam(g, 50, 50, 45, 0.18); S.stroke(g, 3.4); });
      K.part("glow", function (g, S) { R.circle(g, 50, 50, 64); g.fillStyle = S.rad(g, 50, 50, 44, 66, [[0, 0.5], [1, 0]]); g.fill(); });
    }
  });
})();
