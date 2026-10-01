/* art/dots/letters.js: W and L. Type, set tiny: a win is a chunky aqua W pressed in, a loss is a pink L that smears
   as the sheet drags. Streaks wear gold printer's rules: a rule under the W (10), over and under (20), boxed (30). */
(function () {
  "use strict";
  var PI = Math.PI, M = Math;
  function W(g, R) {  // a chunky W: a mitered zigzag, clipped flat at the cap line and the baseline
    g.beginPath(); g.rect(-R * 1.5, -R * 0.88, R * 3, R * 1.7); g.clip();
    g.beginPath(); g.moveTo(-R * 0.95, -R * 1.1); g.lineTo(-R * 0.48, R * 0.95); g.lineTo(0, -R * 0.55); g.lineTo(R * 0.48, R * 0.95); g.lineTo(R * 0.95, -R * 1.1);
    g.lineWidth = R * 0.44; g.lineJoin = "miter"; g.miterLimit = 5; g.stroke();
  }
  function L(g, R, dx, dy) {  // a chunky L (stem 27% of its height, foot three quarters of the stem), moved dx, dy
    g.beginPath(); g.moveTo(-R * 0.48 + dx, -R * 0.99 + dy); g.lineTo(-R * 0.48 + dx, R * 0.74 + dy); g.lineTo(R * 0.77 + dx, R * 0.74 + dy);
    g.lineWidth = R * 0.56; g.lineJoin = "miter"; g.stroke();
  }
  T82ART.add("dots", "letters", {
    name: "W and L",
    by: "Wins are chunky aqua W's pressed in, losses are a pink L smeared by the drag; streaks are boxed in gold printer's rules.",
    reach: { w: 2, l: 2.4 },
    live: { w: 0.3, l: 0.7 },
    inks: { a: "win", b: "gold", c: "loss" },
    marks: function (K, D) {
      var r = K.rand(((D.gi + 1) * 2654435761) >>> 0);
      D.t = (r() - 0.5) * (D.win ? 0.1 : 0.34); D.sm = 0.8 + r() * 0.4;
    },
    a: function (K, g, D, c, R, e) {
      if (!D.win) return;
      var p = K.clamp(e / 0.07, 0, 1), z = 1 + 0.55 * (1 - p) * (1 - p), q = M.sin(K.clamp((e - 0.07) / 0.13, 0, 1) * PI);
      g.save(); g.translate(c[0], c[1] + R * 0.02); g.rotate(D.t); g.scale(z * (1 + 0.08 * q), z * (1 - 0.1 * q));
      g.strokeStyle = K.tone(0.96); W(g, R); g.restore();
    },
    b: function (K, g, D, c, R, e) {
      if (!D.win || D.streak < 10 || e < 0.05) return;
      var n = D.streak >= 30 ? 3 : D.streak >= 20 ? 2 : 1, k = K.ease.out((e - 0.05) / 0.12), w = R * 0.24;
      g.fillStyle = g.strokeStyle = K.tone(0.95); g.lineWidth = w;
      if (n > 2) { g.strokeRect(c[0] - R * 1.28 * k, c[1] - R * 1.28, R * 2.56 * k, R * 2.56); return; }
      g.fillRect(c[0] - R * k, c[1] + R * 1.1, R * 2 * k, w);
      if (n > 1) g.fillRect(c[0] - R * k, c[1] - R * 1.1 - w, R * 2 * k, w);
    },
    c: function (K, g, D, c, R, e) {
      if (D.win) return;
      var p = K.clamp(e / 0.08, 0, 1), z = 1 + 0.6 * (1 - p) * (1 - p), q = M.sin(K.clamp((e - 0.08) / 0.12, 0, 1) * PI), d = K.ease.out((e - 0.08) / 0.16) * D.sm;
      g.save(); g.translate(c[0], c[1] - R * 0.04); g.rotate(D.t); g.scale(z * (1 + 0.1 * q), z * (1 - 0.1 * q));
      g.strokeStyle = K.tone(0.34); L(g, R, -R * 0.4 * d, R * 0.1 * d); g.strokeStyle = K.tone(0.2); L(g, R, -R * 0.85 * d, R * 0.2 * d);  // the drag, away from the counter
      g.strokeStyle = K.tone(0.96); L(g, R, 0, 0); g.restore();
    },
    win: function (K, p, info) {  // type bites: a puff of ink; every tenth straight, a gold ring
      K.spark({ x: p[0], y: p[1], n: 4, ink: "win", sp: [60, 150], r: [1, 2.2], life: [0.18, 0.1], grav: 200, seed: info.seed });
      if (info.streak < 10 || info.streak % 10) return;
      K.ring({ x: p[0], y: p[1], dur: 0.5, r0: 6, r1: 64, w0: 6, ink: "gold", cov: 0.9 });
      K.spark({ x: p[0], y: p[1], n: 12, ink: "gold", sp: [110, 260], r: [1.3, 2.8], life: [0.3, 0.25], grav: 320, seed: info.seed + 1 });
    },
    lossHit: function (K, p, info) {  // past the 14th loss: the L drags and flings ink
      K.spark({ x: p[0], y: p[1], n: 10, ink: "loss", sp: [90, 300], r: [1, 2.8], life: [0.25, 0.3], grav: 1500, seed: info.seed, streak: true });
      K.shake(M.max(info.dur, 0.42), 4);
    }
  });
})();
