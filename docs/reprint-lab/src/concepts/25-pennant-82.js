/* ---------- TRUE 82 LAB concept: the pennant ----------
   A felt pennant from the arena gift shop, snapping in the wind on a pole
   topped with a little ball. 82-0 rides the cloth, each figure turning and
   shrinking with the wave and the taper. Halftone bands fall in the troughs
   of the wave; a felt band at the hoist carries a stitched seam. */
(function () {
  var R = window.RISO, PI = Math.PI;
  var POLE = 13, HOIST = 14.5;
  // the two edges of the cloth as cubic curves, hoist to tip
  var TOP = [[HOIST, 15], [38, 2.5], [61, 32], [96, 37.2]];
  var BOT = [[HOIST, 65], [40, 74], [63, 46], [96, 41.8]];
  var FONT = "700 40px \"Barlow Condensed\", \"Arial Narrow\", sans-serif";

  function bez(c, t) {
    var u = 1 - t, a = u * u * u, b = 3 * u * u * t, d = 3 * u * t * t, e = t * t * t;
    return [a * c[0][0] + b * c[1][0] + d * c[2][0] + e * c[3][0], a * c[0][1] + b * c[1][1] + d * c[2][1] + e * c[3][1]];
  }
  function cloth(g) {
    g.beginPath(); g.moveTo(TOP[0][0], TOP[0][1]);
    g.bezierCurveTo(TOP[1][0], TOP[1][1], TOP[2][0], TOP[2][1], TOP[3][0], TOP[3][1]);
    g.quadraticCurveTo(98.4, 39.5, BOT[3][0], BOT[3][1]);                  // a blunt, rounded tip
    g.bezierCurveTo(BOT[2][0], BOT[2][1], BOT[1][0], BOT[1][1], BOT[0][0], BOT[0][1]);
    g.closePath();
  }
  function band(g) {                                        // the felt band at the hoist
    var t = 0.1, a = bez(TOP, t), b = bez(BOT, t);
    g.beginPath(); g.moveTo(HOIST, TOP[0][1]); g.lineTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(HOIST, BOT[0][1]); g.closePath();
  }
  // where a figure sits: the middle of the cloth at t, its height and its tilt
  function at(t) {
    var a = bez(TOP, t), b = bez(BOT, t), a2 = bez(TOP, t + 0.01), b2 = bez(BOT, t + 0.01);
    var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, mx2 = (a2[0] + b2[0]) / 2, my2 = (a2[1] + b2[1]) / 2;
    return { x: mx, y: my, h: Math.abs(b[1] - a[1]), rot: Math.atan2(my2 - my, mx2 - mx) };
  }
  function tAtX(x) {                                        // the t where the middle of the cloth reaches x
    var lo = 0, hi = 1;
    for (var i = 0; i < 24; i++) { var m = (lo + hi) / 2; if (at(m).x < x) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  // set the figures along the cloth: each one sized to the cloth where it sits, then the next one after it
  function layout(g) {
    g.font = FONT;
    var out = [], x = 24.5, list = ["8", "2", "-", "0"];
    list.forEach(function (ch) {
      var k = Math.min(1.16, at(tAtX(x + 8)).h * 0.62 / 28), w = ch === "-" ? 10 * k * 0.94 : g.measureText(ch).width * k * 0.94;
      var t = tAtX(x + w / 2), p = at(t);
      k = Math.min(1.16, p.h * 0.62 / 28); w = ch === "-" ? 10 * k * 0.94 : g.measureText(ch).width * k * 0.94;
      out.push({ ch: ch, p: p, k: k });
      x += w + (ch === "-" || list[out.length] === "-" ? 1.2 : 0.4);
    });
    return out;
  }
  function figures(g, how, lw) {
    g.font = FONT; g.textAlign = "center"; g.textBaseline = "alphabetic";
    layout(g).forEach(function (q) {
      var p = q.p, k = q.k;
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.scale(k * 0.94, k);
      if (q.ch === "-") {                                   // a drawn bar reads better than the font's hyphen
        R.roundRect(g, -5, -3, 10, 6, 1.4);
        if (how === "stroke") { g.lineWidth = lw / k; g.stroke(); } else g.fill();
      } else {
        g.translate(0, 14);
        if (how === "stroke") { g.lineWidth = lw / k; g.lineJoin = "round"; g.strokeText(q.ch, 0, 0); }
        else { g.fillText(q.ch, 0, 0); g.lineWidth = 0.9 / k; g.strokeText(q.ch, 0, 0); }
      }
      g.restore();
    });
  }
  function ball(g) { R.circle(g, POLE, 7.4, 5.6); }

  window.LAB.concept({
    id: "pennant-82", name: "Pennant 82-0", blurb: "A felt pennant snapping in the wind: 82-0 on the cloth, a ball on the pole.",
    draw: function (K) {
      K.part("glow", function (g, S) {                       // wind lines trailing off the tip
        g.lineCap = "round";
        [[58, 14, 86, 21, 2.2], [66, 57, 92, 52, 2], [80, 27, 99, 31, 1.6]].forEach(function (w) {
          g.beginPath(); g.moveTo(w[0], w[1]); g.quadraticCurveTo((w[0] + w[2]) / 2, (w[1] + w[3]) / 2 - 2.6, w[2], w[3]);
          g.lineWidth = w[4]; g.strokeStyle = S.tone(0.85); g.stroke();
        });
      });
      K.part("body", function (g, S) {
        cloth(g); S.fill(g);
        ball(g); S.fill(g);
        if (S.mode === "sil" || S.style === "line" || S.style === "neon") return;
        R.knock(g, function (g2) { band(g2); g2.fill(); });   // the band is its own felt
      });
      K.part("shade", function (g, S) {                      // the wave: the cloth turns away in the troughs
        cloth(g);
        g.fillStyle = S.lin(g, HOIST, 0, 95, 0, [[0, 0.1], [0.12, 0.3], [0.26, 0.04], [0.42, 0.02], [0.56, 0.34], [0.68, 0.1], [0.84, 0.02], [1, 0.3]]);
        S.fill(g);
        ball(g); g.fillStyle = S.rad(g, POLE - 2, 5.4, 0, 7.5, [[0, 0], [0.5, 0.1], [1, 0.6]]); S.fill(g);
      });
      K.part("accent", function (g, S) { band(g); S.fill(g); });
      K.part("paper", function (g) {                         // the keyline round the figures, and the seam stitched down the band
        figures(g, "stroke", 4.2);
        var a = bez(TOP, 0.083), b = bez(BOT, 0.083);
        g.lineWidth = 0.8; g.setLineDash([1.8, 1.5]); g.beginPath(); g.moveTo(a[0], a[1] + 2.4); g.lineTo(b[0], b[1] - 2.4); g.stroke(); g.setLineDash([]);
      });
      K.part("line", function (g, S) {
        g.beginPath(); g.moveTo(POLE, 12.5); g.lineTo(POLE, 96); S.stroke(g, 3);
        cloth(g); S.stroke(g, 2.2);
        band(g); S.stroke(g, 1.4);
        ball(g); S.stroke(g, 1.6);
        g.beginPath(); g.moveTo(POLE - 5.6, 7.4); g.bezierCurveTo(POLE - 2, 6, POLE + 2, 8.8, POLE + 5.6, 7.4);
        g.moveTo(POLE, 1.8); g.bezierCurveTo(POLE - 1.4, 5, POLE + 1.4, 9.8, POLE, 13);
        g.moveTo(POLE - 3.6, 3.2); g.quadraticCurveTo(POLE - 1.2, 7.4, POLE - 3.6, 11.6); g.moveTo(POLE + 3.6, 3.2); g.quadraticCurveTo(POLE + 1.2, 7.4, POLE + 3.6, 11.6);
        S.stroke(g, 0.9);
        figures(g, "fill");
      });
    }
  });
})();
