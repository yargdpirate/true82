/* ---------- TRUE 82 LAB concept: the flame ball ----------
   The Mid-Season Heat Check as a mark: a ball on fire. The flame is one
   contour of five tongues leaning into the wind, printed three deep like a
   real riso fire: the hot ink for the flame, a pink halftone that runs
   redder toward the tips, and a paper-white core cut through everything.
   A paper gap keeps the ball clear of its own fire. */
(function () {
  var R = window.RISO;
  var BX = 51, BY = 64, BR = 26.5;                 // the ball

  // the flame contour: from the ball's left side, up through five tongues, down to its right side
  function flame(g, k, ox, oy) {
    // k scales toward the anchor (ox, oy): 1 is the outer flame, smaller gives the inner flames
    function P(x, y) { return [ox + (x - ox) * k, oy + (y - oy) * k]; }
    function M(x, y) { var p = P(x, y); g.moveTo(p[0], p[1]); }
    function C(a, b, c, d, e, f) { var p = P(a, b), q = P(c, d), r = P(e, f); g.bezierCurveTo(p[0], p[1], q[0], q[1], r[0], r[1]); }
    g.beginPath();
    M(27, 76);
    C(17, 66, 15.5, 52, 21, 43);                   // the left flank, swelling out
    C(22.5, 36, 17, 31, 10.5, 25);                 // a small tongue flicking out left
    C(19, 25.5, 25, 28, 28.5, 33);
    C(27, 24, 22, 15, 24.5, 5.5);                  // the long left tongue
    C(30, 12.5, 37, 17, 39.5, 27);
    C(39, 18, 42, 8, 50.5, 0.8);                   // the tallest, center tongue
    C(51.5, 9, 57.5, 17, 58, 27.5);
    C(60, 21, 64.5, 15, 72.5, 11.5);               // the right tongue
    C(70, 19, 72, 26, 75, 32.5);
    C(78, 30.5, 82, 29, 86.5, 26);                 // a short tongue on the right shoulder
    C(86, 34, 87.5, 44, 84, 53);                   // the right flank
    C(82, 61, 80, 67, 76, 76);
    g.closePath();
  }
  function ball(g) { R.circle(g, BX, BY, BR); }
  function la(S) { return S.style === "line" || S.style === "neon"; }

  window.LAB.concept({
    id: "flame-ball", name: "Heat check", blurb: "A ball on fire: five tongues of flame, pink heat in halftone, a white-hot core.",
    draw: function (K) {
      K.part("glow", function (g, S) {                  // a faint heat haze around the fire
        if (la(S)) return;
        R.circle(g, 50, 36, 50); g.fillStyle = S.rad(g, 50, 40, 20, 52, [[0, 0.3], [1, 0]]); g.fill();
      });
      K.part("body", function (g, S) { flame(g, 1, 50, 60); S.fill(g); });
      K.part("glow", function (g, S) {                  // the heat: redder toward the tips, lighter in the middle
        if (la(S)) return;
        flame(g, 1, 50, 60); g.fillStyle = S.lin(g, 0, 2, 0, 52, [[0, 0.95], [0.5, 0.62], [1, 0.3]]); g.fill();
        R.knock(g, function (g2) { g2.globalAlpha = 0.7; flame(g2, 0.72, 50, 56); g2.fill(); });
      });
      K.part("paper", function (g, S) {                 // the white-hot core, and a gap around the ball
        if (la(S)) return;
        flame(g, 0.5, 50, 43); g.fill();
        R.circle(g, BX, BY, BR + 2.6); g.fill();
      });
      K.part("body", function (g, S) { ball(g); S.fill(g); });
      K.part("glow", function (g, S) {                  // pink overprint warms the ball to orange
        if (la(S)) return;
        ball(g); g.fillStyle = S.rad(g, BX - 8, BY - 10, 4, BR * 1.3, [[0, 0.18], [1, 0.72]]); g.fill();
      });
      K.part("shade", function (g, S) {                 // the fire lights the top; the ball's belly falls to shadow
        ball(g); g.fillStyle = S.lin(g, 0, BY - BR, 0, BY + BR, [[0, 0], [0.5, 0.05], [0.78, 0.4], [1, 0.72]]); S.fill(g);
      });
      K.part("line", function (g, S) {
        g.save(); ball(g); g.clip();
        R.seam(g, BX, BY, BR, -0.35); S.stroke(g, 3);
        g.restore();
        ball(g); S.stroke(g, 3.2);
      });
    }
  });
})();
