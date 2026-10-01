/* art/dots/dagger.js: Footnotes. The printer's marks: a win is an aqua asterisk that blooms arm by arm (a streak
   threads gold rays between the arms: 10, 20, 30 lengthen them); a loss is the dagger, the footnote mark for the
   dead: it drops point first, sticks in a puddle of ink and quivers still, so the ledger fills with a graveyard. */
(function () {
  "use strict";
  var PI = Math.PI, M = Math, TAU = PI * 2;
  function rib(g, x0, y0, x1, y1, a, b) {  // an arm: round caps, width a at the start, b at the tip
    var q = M.atan2(y1 - y0, x1 - x0) + PI / 2, cx = M.cos(q), cy = M.sin(q);
    g.moveTo(x0 + cx * a, y0 + cy * a); g.lineTo(x1 + cx * b, y1 + cy * b); g.arc(x1, y1, b, q, q - PI, true);
    g.lineTo(x0 - cx * a, y0 - cy * a); g.arc(x0, y0, a, q + PI, q, true);
  }
  T82ART.add("dots", "dagger", {
    name: "Footnotes",
    by: "Wins bloom as aqua asterisks with gold rays for streaks; losses are a dagger that drops, sticks in a puddle of ink and quivers.",
    reach: { w: 1.9, l: 3.7 },
    live: { w: 0.32, l: 0.5 },
    inks: { a: "win", b: "gold", c: "loss" },
    marks: function (K, D) {
      var r = K.rand(((D.gi + 1) * 2654435761) >>> 0);
      D.t = (r() - 0.5) * 0.3; D.q = r() < 0.5 ? 1 : -1; D.r = r() * 0.3; D.w = r();
    },
    a: function (K, g, D, c, R, e) {
      if (!D.win) return;
      var k, a, L, s = 1 - K.ease.out(e / 0.16);
      g.fillStyle = K.tone(0.95); g.beginPath();
      for (k = 0; k < 6; k++) {
        L = R * 0.95 * K.ease.back((e - k * 0.012) / 0.1); a = -PI / 2 + D.r - s * 1.05 + k * PI / 3;
        rib(g, c[0] + M.cos(a) * R * 0.08, c[1] + M.sin(a) * R * 0.08, c[0] + M.cos(a) * L, c[1] + M.sin(a) * L, R * 0.13, R * 0.2);
      }
      g.fill();
    },
    b: function (K, g, D, c, R, e) {
      if (!D.win || D.streak < 10 || e < 0.06) return;
      var n = D.streak >= 30 ? 3 : D.streak >= 20 ? 2 : 1, L = R * (0.55 + 0.3 * n) * K.ease.out((e - 0.06) / 0.12), k, a;
      g.fillStyle = K.tone(0.92); g.beginPath();
      for (k = 0; k < 6; k++) {  // between the arms
        a = -PI / 2 + D.r + PI / 6 + k * PI / 3;
        rib(g, c[0] + M.cos(a) * R * 0.6, c[1] + M.sin(a) * R * 0.6, c[0] + M.cos(a) * L, c[1] + M.sin(a) * L, R * (0.06 + 0.02 * n), R * (0.08 + 0.03 * n));
      }
      g.fill();
    },
    c: function (K, g, D, c, R, e) {
      if (D.win) return;
      var p = K.clamp(e / 0.07, 0, 1), q = K.clamp((e - 0.07) / 0.3, 0, 1), y = c[1] + R * 1.2, u = K.ease.out((e - 0.07) / 0.14);
      g.fillStyle = K.tone(0.96);
      g.beginPath(); g.ellipse(c[0], y + R * 0.02, R * 0.5 * u, R * 0.12 * u, 0, 0, TAU); g.fill();  // ink pools where it lands
      g.save(); g.translate(c[0], y);
      g.rotate(D.t + D.q * 0.42 * M.sin(q * 40) * (1 - q) * (1 - q));  // it quivers about its point
      g.translate(0, -R * 2.4 * (1 - p * p)); g.scale(1.12, 1.12);  // it falls point first
      g.beginPath();
      g.moveTo(-R * 0.15, -R * 2.1); g.lineTo(R * 0.15, -R * 2.1); g.lineTo(R * 0.15, -R * 1.75); g.lineTo(R * 0.62, -R * 1.75); g.lineTo(R * 0.62, -R * 1.45);
      g.lineTo(R * 0.24, -R * 1.45); g.lineTo(0, 0); g.lineTo(-R * 0.24, -R * 1.45); g.lineTo(-R * 0.62, -R * 1.45); g.lineTo(-R * 0.62, -R * 1.75); g.lineTo(-R * 0.15, -R * 1.75); g.closePath(); g.fill(); g.restore();
    },
    win: function (K, p, info) {  // a flick of petals; every tenth straight, a gold ring
      K.spark({ x: p[0], y: p[1], n: 4, ink: "win", sp: [50, 140], r: [1, 2], life: [0.2, 0.12], grav: -40, seed: info.seed });
      if (info.streak < 10 || info.streak % 10) return;
      K.ring({ x: p[0], y: p[1], dur: 0.5, r0: 6, r1: 64, w0: 6, ink: "gold", cov: 0.9 });
      K.spark({ x: p[0], y: p[1], n: 12, ink: "gold", sp: [110, 260], r: [1.3, 2.8], life: [0.3, 0.25], grav: 60, seed: info.seed + 1 });
    },
    lossHit: function (K, p, info) {  // past the 14th loss: the dagger lands and ink flies
      K.spark({ x: p[0], y: p[1], n: 10, ink: "loss", sp: [90, 300], r: [1, 2.6], life: [0.25, 0.3], grav: 1500, seed: info.seed });
      K.shake(M.max(info.dur, 0.42), 4);
    }
  });
})();
