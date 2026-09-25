/* ---------- TRUE 82 LAB concept: the finger spin ----------
   A ball spinning on one finger. The hand is a solid block of the accent
   ink seen from the back (index up, the other three curled, thumb tucked),
   its creases cut to paper so it prints like a linocut, lit from the upper
   left by a halftone that thins the ink. A white sweatband with two
   stripes at the wrist. Tapered spin arcs hug the ball on both sides. */
(function () {
  var R = window.RISO, PI = Math.PI;
  var BX = 52, BY = 27, BR = 22;                 // the ball; the fingertip meets its bottom
  function la(S) { return S.style === "line" || S.style === "neon"; }

  function hand(g) {
    g.beginPath();
    g.moveTo(48.1, 54.2);
    g.arc(52, 53.4, 4, PI * 1.02, PI * 1.98);                  // the fingertip, just under the ball
    g.bezierCurveTo(56.4, 57.5, 56.6, 61, 56.1, 63.4);         // the far side of the finger, a swell at the joint
    g.bezierCurveTo(55.7, 65.4, 55.1, 67.4, 55, 69.6);
    g.bezierCurveTo(56, 66.8, 60.6, 65.6, 62.4, 68.6);         // middle knuckle
    g.bezierCurveTo(64, 67, 68, 67.4, 68.9, 70.6);             // ring knuckle
    g.bezierCurveTo(70.8, 70, 74, 71.8, 73.8, 75.8);           // little finger knuckle
    g.bezierCurveTo(74.4, 80.2, 72.8, 84.6, 68.4, 88.6);       // the heel of the hand, down to the wrist
    g.lineTo(43.4, 88.6);
    g.bezierCurveTo(40.2, 86.4, 36.4, 82.6, 36.6, 77.8);       // the thumb's outer edge
    g.bezierCurveTo(36.8, 73.8, 40.4, 71.2, 44.4, 71.4);       // the thumb, tucked along the finger
    g.bezierCurveTo(45.6, 71.4, 46.1, 70.6, 46.2, 69.2);
    g.bezierCurveTo(46.5, 64, 47.4, 58.5, 48.1, 54.2);         // the near side of the finger
    g.closePath();
  }
  // the sweatband: a short cylinder, its edges bowed toward the viewer
  function band(g) {
    g.beginPath();
    g.moveTo(39.8, 86.4); g.quadraticCurveTo(55, 90.4, 71.2, 86.4);
    g.lineTo(71.2, 95.6); g.quadraticCurveTo(55, 99.8, 39.8, 95.6);
    g.closePath();
  }
  function bandStripes(g) { g.beginPath(); [89.9, 93.1].forEach(function (y) { g.moveTo(38, y); g.quadraticCurveTo(55, y + 4.1, 73, y); }); }
  function creases(g) {                                        // cut lines: the finger joint, the knuckle valleys, the thumb
    g.beginPath();
    g.moveTo(49.4, 61.2); g.quadraticCurveTo(52, 62.3, 54.8, 61.6);                 // index middle joint
    g.moveTo(55.1, 70.4); g.quadraticCurveTo(55.5, 72.6, 56.4, 74.2);               // index / middle
    g.moveTo(62.5, 69.6); g.quadraticCurveTo(62.8, 71.8, 63.5, 73.6);               // middle / ring
    g.moveTo(69, 71.8); g.quadraticCurveTo(69.3, 74, 69.9, 75.6);                   // ring / little
    g.moveTo(45, 71.6); g.bezierCurveTo(47.2, 74.4, 47.6, 78.6, 45.6, 82.6);       // the thumb's inner edge
  }
  // a tapered crescent riding a circle from angle a0 to a1, thick at a0
  function swoosh(g, cx, cy, ri, a0, a1, th) {
    var N = 36, i, t, a, T;
    g.beginPath();
    for (i = 0; i <= N; i++) { t = i / N; a = a0 + (a1 - a0) * t; T = th * Math.pow(Math.sin(PI * (0.08 + 0.92 * t)), 0.7) * (1 - 0.75 * t); var rr = ri + T; if (i) g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    for (i = N; i >= 0; i--) { t = i / N; a = a0 + (a1 - a0) * t; g.lineTo(cx + Math.cos(a) * ri, cy + Math.sin(a) * ri); }
    g.closePath();
  }
  function arcs(g, S, fill) {
    swoosh(g, BX, BY, BR + 4.5, PI * 0.93, PI * 1.36, 5.2); fill(g);
    swoosh(g, BX, BY, BR + 4.5, -PI * 0.07, PI * 0.36, 5.2); fill(g);
    swoosh(g, BX, BY, BR + 12, PI * 1.02, PI * 1.24, 3); fill(g);
    swoosh(g, BX, BY, BR + 12, PI * 0.02, PI * 0.24, 3); fill(g);
  }
  function ball(g) { R.circle(g, BX, BY, BR); }

  window.LAB.concept({
    id: "finger-spin", name: "Finger spin", blurb: "A ball spinning on one finger: a linocut hand, spin arcs, a striped sweatband.",
    draw: function (K) {
      K.part("accent", function (g, S) {
        hand(g); S.fill(g);
        if (S.mode === "sil") { band(g); S.fill(g); return; }
        if (la(S)) return;
        R.knock(g, function (g2) {                              // light from the upper left thins the ink to halftone
          g2.save(); hand(g2); g2.clip();
          g2.fillStyle = R.lgrad(g2, 40, 60, 62, 82, [[0, 0.45], [0.5, 0.12], [1, 0]]); g2.fillRect(30, 48, 50, 44);
          g2.restore();
        });
      });
      K.part("paper", function (g, S) {                        // creases cut to paper, and the white sweatband
        if (la(S)) return;
        g.lineWidth = 1.7; g.lineCap = "round"; creases(g); g.stroke();
        band(g); g.fill();
      });
      K.part("glow", function (g, S) {                         // the band's two stripes
        g.save(); band(g); g.clip(); bandStripes(g); S.stroke(g, 2); g.restore();
      });
      K.part("glow", function (g, S) { arcs(g, S, function (gg) { S.fill(gg); }); });
      K.part("body", function (g, S) { ball(g); S.fill(g); });
      K.part("glow", function (g, S) {                         // pink over the sunflower warms the ball
        if (la(S)) return;
        ball(g); g.fillStyle = S.rad(g, BX - 8, BY - 9, 3, BR * 1.3, [[0, 0.15], [1, 0.68]]); g.fill();
      });
      K.part("shade", function (g, S) {
        ball(g); g.fillStyle = S.rad(g, BX - BR * 0.4, BY - BR * 0.45, 0, BR * 1.6, [[0, 0], [0.4, 0.03], [0.62, 0.3], [0.8, 0.72], [1, 0.55]]); S.fill(g);
      });
      K.part("line", function (g, S) {
        g.save(); ball(g); g.clip(); R.seam(g, BX, BY, BR, 0.3); S.stroke(g, 2.8); g.restore();
        ball(g); S.stroke(g, 3);
        hand(g); S.stroke(g, 2.4);
        band(g); S.stroke(g, 2.4);
        if (la(S)) { creases(g); S.stroke(g, 1.4); }
      });
    }
  });
})();
