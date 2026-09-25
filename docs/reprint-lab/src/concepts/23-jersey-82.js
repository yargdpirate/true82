/* ---------- TRUE 82 LAB concept: the jersey ----------
   A basketball tank seen flat on, number 82 on the chest in tackle twill: the
   number in key ink, a keyline of bare paper, then an outline in the third
   ink. Trim runs round the neck and the armholes; through the neck you see
   the inside of the back, falling into shade. Halftone folds give it drape. */
(function () {
  var R = window.RISO;
  var FONT = "700 46px \"Barlow Condensed\", \"Arial Narrow\", sans-serif";

  // right half of the outline, from the back of the neck round to the middle of the hem; the left half mirrors it
  function half(g, m) {
    function X(x) { return m ? 100 - x : x; }
    return {
      neckBack: function () { g.bezierCurveTo(X(53.5), 10.2, X(57.5), 7.2, X(59.6), 4.6); },
      strap: function () { g.quadraticCurveTo(X(64.6), 3.2, X(69.6), 4.6); },
      arm: function () { g.bezierCurveTo(X(70.4), 21, X(74.4), 36.5, X(86), 39.4); },
      side: function () { g.bezierCurveTo(X(84.4), 58, X(83.2), 76, X(85.2), 93.4); },
      hem: function () { g.bezierCurveTo(X(72), 96.4, X(60), 96.8, X(50), 96.8); }
    };
  }
  function jersey(g) {
    var r = half(g, false), l = half(g, true);
    g.beginPath(); g.moveTo(50, 11.2);
    r.neckBack(); r.strap(); r.arm(); r.side(); r.hem();
    // back up the left side: the same curves in reverse
    g.bezierCurveTo(40, 96.8, 28, 96.4, 14.8, 93.4);
    g.bezierCurveTo(16.8, 76, 15.6, 58, 14, 39.4);
    g.bezierCurveTo(25.6, 36.5, 29.6, 21, 30.4, 4.6);
    g.quadraticCurveTo(35.4, 3.2, 40.4, 4.6);
    g.bezierCurveTo(42.5, 7.2, 46.5, 10.2, 50, 11.2);
    g.closePath();
  }
  function neckFront(g) {                                   // the front neckline: a deep scoop
    g.moveTo(40.4, 4.6); g.bezierCurveTo(41.6, 19.5, 45, 27.6, 50, 27.6); g.bezierCurveTo(55, 27.6, 58.4, 19.5, 59.6, 4.6);
  }
  function insidePath(g) {                                  // the inside of the back, seen through the neck
    neckFront(g);
    g.bezierCurveTo(57.5, 7.2, 53.5, 10.2, 50, 11.2); g.bezierCurveTo(46.5, 10.2, 42.5, 7.2, 40.4, 4.6); g.closePath();
  }
  function inside(g) { g.beginPath(); insidePath(g); }
  function front(g) { jersey(g); insidePath(g); }            // the jersey less the inside (fill or clip with evenodd)
  function armholes(g) {
    g.moveTo(69.6, 4.6); g.bezierCurveTo(70.4, 21, 74.4, 36.5, 86, 39.4);
    g.moveTo(30.4, 4.6); g.bezierCurveTo(29.6, 21, 25.6, 36.5, 14, 39.4);
  }
  function stripes(g, d) {                                  // side stripes, following the side seams
    g.moveTo(86 - d, 41.5); g.bezierCurveTo(84.4 - d, 58, 83.2 - d, 76, 85.2 - d, 97);
    g.moveTo(14 + d, 41.5); g.bezierCurveTo(15.6 + d, 58, 16.8 + d, 76, 14.8 + d, 97);
  }
  function trim(g, S) {                                     // a band inside the neck and armhole edges, and the side stripes
    g.save(); front(g); g.clip("evenodd");
    g.beginPath(); neckFront(g); armholes(g);
    if (S) S.stroke(g, 7.2); else { g.lineWidth = 7.2; g.stroke(); }
    g.beginPath(); stripes(g, 4.6); stripes(g, 8.4);
    if (S) S.stroke(g, 2); else { g.lineWidth = 2; g.stroke(); }
    g.restore();
  }
  function num(g, how, lw) {
    g.font = FONT; g.textAlign = "center"; g.textBaseline = "alphabetic";
    var m = g.measureText("82"), asc = m.actualBoundingBoxAscent || 33, sx = Math.min(1.2, 40 / (m.width || 40));
    g.save(); g.translate(50, 62 + asc / 2); g.scale(sx, 1);
    if (how === "stroke") { g.lineWidth = lw; g.lineJoin = "round"; g.strokeText("82", 0, 0); }
    else { g.fillText("82", 0, 0); g.lineWidth = 1; g.strokeText("82", 0, 0); }
    g.restore();
  }

  window.LAB.concept({
    id: "jersey-82", name: "Jersey 82", blurb: "A tank top with 82 on the chest in tackle twill: number, paper keyline, outline.",
    draw: function (K) {
      K.part("body", function (g, S) {
        jersey(g); S.fill(g);
        if (S.mode === "sil" || S.style === "line" || S.style === "neon") return;
        R.knock(g, function (g2) { trim(g2); num(g2, "stroke", 8.4); num(g2, "fill"); });   // the trim and the outline print clean, not over the body
      });
      K.part("shade", function (g, S) {                    // a round torso: the sides turn away, folds fall from the armholes
        g.save(); jersey(g); g.clip();
        jersey(g); g.fillStyle = S.lin(g, 14, 0, 86, 0, [[0, 0.42], [0.16, 0.1], [0.42, 0], [0.7, 0.03], [0.9, 0.22], [1, 0.46]]); S.fill(g);
        g.beginPath(); g.moveTo(22, 44); g.bezierCurveTo(27, 58, 26, 76, 29, 96); g.lineTo(21, 96); g.bezierCurveTo(19, 76, 18, 58, 16, 44); g.closePath();
        g.fillStyle = S.lin(g, 16, 0, 29, 0, [[0, 0], [0.5, 0.3], [1, 0]]); S.fill(g);
        g.beginPath(); g.moveTo(78, 44); g.bezierCurveTo(73, 58, 74, 76, 71, 96); g.lineTo(79, 96); g.bezierCurveTo(81, 76, 82, 58, 84, 44); g.closePath();
        g.fillStyle = S.lin(g, 71, 0, 84, 0, [[0, 0], [0.5, 0.36], [1, 0]]); S.fill(g);
        g.restore();
      });
      K.part("accent", function (g, S) {                   // trim at the neck and armholes, and the number's outline
        trim(g, S);
        num(g, "stroke", 8.4);
      });
      K.part("paper", function (g) {                       // the keyline between number and outline, and the seam inside the trim
        num(g, "stroke", 4.4);
        g.save(); jersey(g); g.clip();
        g.lineWidth = 0.7; g.beginPath(); g.setLineDash([1.6, 1.4]);
        g.moveTo(41.9, 4.8); g.bezierCurveTo(43.1, 21.4, 46.1, 29.6, 50, 29.6); g.bezierCurveTo(53.9, 29.6, 56.9, 21.4, 58.1, 4.8); g.stroke();
        g.setLineDash([]); g.restore();
      });
      K.part("line", function (g, S) {
        inside(g); g.fillStyle = S.tone(S.style === "line" || S.style === "neon" ? 1 : 0.7); S.fill(g); g.fillStyle = S.tone(1);
        jersey(g); S.stroke(g, 2.4);
        g.beginPath(); neckFront(g); S.stroke(g, 1.8);
        num(g, "fill");
      });
    }
  });
})();
