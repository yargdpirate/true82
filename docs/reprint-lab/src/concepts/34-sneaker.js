/* ---------- TRUE 82 LAB concept: the high-top ----------
   A classic canvas high-top in profile, toe to the right: the upper in the
   hot ink, a paper-white rubber sole and toe cap with a stripe in the accent
   ink, paper laces crossing the tongue, and three stars running up the
   ankle. No brand's marks: the stars are loose, not in a patch. */
(function () {
  var R = window.RISO;
  function la(S) { return S.style === "line" || S.style === "neon"; }

  // the whole shoe, heel at the left
  function shoe(g) {
    g.beginPath();
    g.moveTo(10, 87);
    g.quadraticCurveTo(5, 87, 5, 82);                        // heel bottom
    g.lineTo(5.5, 71);
    g.bezierCurveTo(6.5, 56, 9, 36, 8, 23);                  // the heel counter, up the Achilles
    g.bezierCurveTo(7.6, 17, 10, 14.2, 15, 14);              // collar back, padded
    g.lineTo(34, 12.2);                                      // the collar
    g.bezierCurveTo(36, 7, 42, 5.2, 46.5, 7.6);              // the tongue, poking up
    g.bezierCurveTo(49, 9, 49.2, 12, 48, 15);
    g.bezierCurveTo(55, 28, 63, 40, 74, 50);                 // down the laces to the toe box
    g.bezierCurveTo(83, 56.5, 93, 59, 95.5, 67);             // over the toes
    g.bezierCurveTo(97.4, 73, 97.6, 80, 94.5, 84);           // the toe bumper
    g.bezierCurveTo(92.5, 86.6, 89, 87, 85, 87);
    g.closePath();
  }
  // the rubber sole band (foxing) and the toe cap, cut from the shoe
  function sole(g) {
    g.beginPath();
    g.moveTo(3, 71.5);
    g.bezierCurveTo(30, 73.4, 60, 73.2, 99, 70.5);
    g.lineTo(99, 92); g.lineTo(3, 92); g.closePath();
  }
  function soleTop(g) { g.moveTo(5.4, 71.6); g.bezierCurveTo(30, 73.4, 60, 73.2, 96.6, 70.6); }
  function toeCap(g) {
    g.beginPath();
    g.moveTo(73, 73.2);
    g.bezierCurveTo(73.5, 66, 78, 60.5, 85.5, 59.6);
    g.bezierCurveTo(90, 60, 94, 62.5, 96, 67);
    g.lineTo(99, 80); g.lineTo(80, 80); g.closePath();
  }
  function toeCapEdge(g) { g.moveTo(73, 72.9); g.bezierCurveTo(73.5, 66, 78, 60.5, 85.5, 59.6); g.bezierCurveTo(89.5, 59.9, 93, 62, 95.2, 65.5); }
  // the throat: where the tongue meets the upper, as drawn in shoe()
  var TH = [[48, 15], [55, 28], [63, 40], [74, 50]];
  function throat(t) {
    var u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    var x = a * TH[0][0] + b * TH[1][0] + c * TH[2][0] + d * TH[3][0], y = a * TH[0][1] + b * TH[1][1] + c * TH[2][1] + d * TH[3][1];
    var dx = 3 * u * u * (TH[1][0] - TH[0][0]) + 6 * u * t * (TH[2][0] - TH[1][0]) + 3 * t * t * (TH[3][0] - TH[2][0]);
    var dy = 3 * u * u * (TH[1][1] - TH[0][1]) + 6 * u * t * (TH[2][1] - TH[1][1]) + 3 * t * t * (TH[3][1] - TH[2][1]);
    var L = Math.sqrt(dx * dx + dy * dy);
    return { x: x, y: y, nx: -dy / L, ny: dx / L };          // n points back into the upper
  }
  // eyelets march down the quarter, parallel to the throat; each lace runs from its eyelet out over the tongue
  var EY = [];
  (function () { for (var i = 0; i < 6; i++) { var p = throat(0.1 + i * 0.16), o = 6.2; EY.push([p.x + p.nx * o, p.y + p.ny * o, p]); } })();
  function laces(g) {
    g.beginPath();
    EY.forEach(function (e, i) {
      var p = e[2], sk = i % 2 ? 1.6 : -1.6;
      g.moveTo(e[0], e[1]); g.lineTo(p.x - p.nx * 1.2 + sk * p.ny * -1, p.y - p.ny * 1.2 + sk * p.nx);
    });
  }
  var STARS = [[22, 29, 5.6, -0.12], [23.2, 43, 4.6, -0.06], [24.6, 55.5, 3.7, 0]];
  function stars(g, fn) { STARS.forEach(function (s) { R.star(g, s[0], s[1], s[2], s[2] * 0.43, 5, -Math.PI / 2 + s[3]); fn(g); }); }
  // the heel tape, riding the back of the heel
  function heelTape(g) {
    g.beginPath();
    g.moveTo(5.4, 71.8); g.bezierCurveTo(6.5, 56, 9, 36, 8, 23); g.bezierCurveTo(7.8, 19.5, 8.4, 17.4, 10, 16.2);
    g.lineTo(13.4, 18.4); g.bezierCurveTo(12.4, 19.6, 12, 21, 12.2, 23.5); g.bezierCurveTo(13.2, 36, 10.8, 56, 9.8, 72);
    g.closePath();
  }
  // the padded collar: the lining shows as a band under the top edge
  function collar(g) {
    g.beginPath();
    g.moveTo(8.2, 22); g.bezierCurveTo(7.8, 17, 10, 14.2, 15, 14); g.lineTo(34, 12.2); g.bezierCurveTo(36, 9, 39, 7.4, 42, 7.2);
    g.lineTo(41, 12.5); g.bezierCurveTo(38.5, 13.5, 37, 15, 36, 16.8); g.lineTo(16, 18.6); g.bezierCurveTo(12.5, 18.8, 11, 20, 10.6, 23);
    g.closePath();
  }

  window.LAB.concept({
    id: "sneaker", name: "High-top", blurb: "A classic canvas high-top in profile: rubber toe, paper laces, three stars up the ankle.",
    draw: function (K) {
      K.part("body", function (g, S) { shoe(g); S.fill(g); });
      K.part("glow", function (g, S) {                        // the canvas warms as it curves down into the sole
        if (la(S)) return;
        g.save(); shoe(g); g.clip();
        g.fillStyle = S.lin(g, 0, 56, 0, 73, [[0, 0], [1, 0.62]]); g.fillRect(0, 56, 100, 18);
        g.restore();
      });
      K.part("paper", function (g, S) {                       // the rubber: sole and toe cap in paper white
        if (la(S)) return;
        g.save(); shoe(g); g.clip(); sole(g); g.fill(); toeCap(g); g.fill(); g.restore();
        heelTape(g); g.fill(); collar(g); g.fill();
        g.lineWidth = 3; g.lineCap = "round"; laces(g); g.stroke();
        stars(g, function (gg) { gg.fill(); });
      });
      K.part("shade", function (g, S) {                       // the rubber rounds under into shadow
        if (la(S)) return;
        g.save(); shoe(g); g.clip();
        g.fillStyle = S.lin(g, 0, 79, 0, 87, [[0, 0], [1, 0.5]]); g.fillRect(0, 79, 100, 9);
        g.restore();
      });
      K.part("accent", function (g, S) {                      // the stripe on the foxing, and the heel tape
        g.save(); shoe(g); g.clip();
        g.beginPath(); g.moveTo(0, 77.6); g.bezierCurveTo(30, 78.8, 60, 78.6, 100, 76.4); g.lineCap = "butt"; S.stroke(g, 2.6);
        g.restore();
        heelTape(g); S.fill(g);
      });
      K.part("line", function (g, S) {
        if (S.mode === "sil") { shoe(g); S.fill(g); return; }
        if (!la(S)) { collar(g); g.fillStyle = S.tone(0.55); g.fill(); g.fillStyle = S.tone(1); }
        g.save(); shoe(g); g.clip();
        g.beginPath(); soleTop(g); S.stroke(g, 2);
        g.beginPath(); toeCapEdge(g); S.stroke(g, 1.8);
        g.beginPath(); for (var x = 12; x < 92; x += 5.2) { g.moveTo(x, 84.2); g.lineTo(x + 1.2, 87); } S.stroke(g, 1.2);   // tread
        g.restore();
        // stitching: a dashed seam along the collar and around the toe cap
        g.save(); g.setLineDash([2.2, 2]);
        g.beginPath(); g.moveTo(11.2, 20); g.bezierCurveTo(12, 18, 13.5, 17.6, 16, 17.5); g.lineTo(33, 16); S.stroke(g, 0.9);
        g.beginPath(); g.moveTo(69.5, 72); g.bezierCurveTo(70, 63, 76, 56.8, 84, 55.8); S.stroke(g, 0.9);
        g.restore();
        // eyelets
        EY.forEach(function (e) { R.circle(g, e[0], e[1], 1.7); S.fill(g); });
        if (!la(S)) stars(g, function (gg) { S.stroke(gg, 0.8); });   // a key line around the paper stars
        // line art: the laces and stars as strokes
        if (la(S)) { laces(g); S.stroke(g, 1.6); stars(g, function (gg) { S.stroke(gg, 1.2); }); }
        shoe(g); S.stroke(g, 2.6);
      });
    }
  });
})();
