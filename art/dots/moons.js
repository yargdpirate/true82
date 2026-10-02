/* art/dots/moons.js: Phases. A win rises and waxes to a full aqua moon (craters left as stock, a white lit limb); a loss
   lands full and wanes to a bold pink crescent over its dusty dark side. A streak leaves no mark on the settled stamp
   (the owner's rule): the 30th straight win rests exactly like the first, with no halo; only the burst at every tenth
   win moves. */
(function () {
  "use strict";
  var M = Math, PI = M.PI, TAU = PI * 2;
  var CR = [[-0.4, -0.12, 0.27], [0.3, -0.42, 0.18], [0.14, 0.42, 0.23]];
  function lit(g, r, k) {  // the lit part of a moon, k = 0 new .. 1 full, the lit limb on the right (path only)
    var tx = r * (1 - 2 * k);
    g.beginPath(); g.arc(0, 0, r, -PI / 2, PI / 2, false);
    g.ellipse(0, 0, M.max(0.01, M.abs(tx)), r, 0, PI / 2, tx > 0 ? -PI / 2 : PI * 1.5, tx > 0);
    g.closePath();
  }
  function craters(g, D, R) {  // knocked out of the plate
    var i, q, c = M.cos(D.rot), s = M.sin(D.rot);
    g.save(); g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000";
    for (i = 0; i < 3; i++) { q = CR[i]; g.beginPath(); g.arc((q[0] * c - q[1] * s) * R, (q[0] * s + q[1] * c) * R, q[2] * R, 0, TAU); g.fill(); }
    g.restore();
  }
  T82ART.add("dots", "moons", {
    name: "Phases",
    by: "Wins rise and wax to a full aqua moon (a white burst on every tenth straight); a loss wanes to a bold pink crescent over the dusty dark side.",
    reach: { w: 1.9, l: 1.9 },
    live: { w: 0.3, l: 0.7 },
    inks: { a: "win", b: "light", c: "loss" },
    marks: function (K, D) {
      var r = K.rand(((D.gi + 1) * 2654435761) >>> 0);
      D.rot = r() * TAU; D.ang = 0.3 + r() * 1.2; D.k = 0.27 + r() * 0.1;
    },
    a: function (K, g, D, c, R, e) {
      if (!D.win) return;
      var t = K.ease.out(e / 0.26);
      g.save(); g.translate(c[0], c[1] + (1 - t) * 0.5 * R);
      g.fillStyle = K.tone(0.95); lit(g, R * 1.02, 0.1 + 0.9 * t); g.fill();
      craters(g, D, R);
      g.restore();
    },
    b: function (K, g, D, c, R, e) {  // white: the lit limb, a thin crescent down the moon's right edge
      if (!D.win) return;
      var t = K.ease.out(e / 0.26), x = c[0], y = c[1] + (1 - t) * 0.5 * R;
      g.fillStyle = K.tone(0.95);
      g.beginPath(); g.arc(x, y, R * 1.02, 0, TAU); g.arc(x + 0.2 * R, y + 0.2 * R, R * 0.92, 0, TAU, true); g.fill();
    },
    c: function (K, g, D, c, R, e) {
      if (D.win) return;
      var w = K.ease.out(K.clamp((e - 0.08) / 0.42, 0, 1)), z = 1 + 0.4 * M.pow(M.max(0, 1 - e / 0.08), 2);
      g.save(); g.translate(c[0], c[1]); g.rotate(D.ang * w); g.scale(z, z);
      g.fillStyle = K.tone(0.15 * w); g.beginPath(); g.arc(0, 0, R * 1.02, 0, TAU); g.fill();
      g.fillStyle = K.tone(0.95); lit(g, R * 1.02, 1 - (1 - D.k) * w); g.fill();
      if (w < 0.7) craters(g, D, R);
      g.restore();
    },
    win: function (K, p, info) {
      K.spark({ x: p[0], y: p[1], n: 3, ink: "light", sp: [50, 150], r: [1, 1.8], life: [0.18, 0.1], grav: 260, seed: info.seed });
      if (info.streak < 10 || info.streak % 10) return;
      K.ring({ x: p[0], y: p[1], dur: 0.5, r0: 6, r1: 70, w0: 6, ink: "win", cov: 0.85 });
      K.spark({ x: p[0], y: p[1], n: 12, ink: "light", sp: [100, 240], r: [1.4, 3], life: [0.3, 0.2], grav: 200, seed: info.seed + 1 });
    },
    lossHit: function (K, p, info) {
      K.spark({ x: p[0], y: p[1], n: 10, ink: "loss", sp: [90, 300], r: [1, 2.6], life: [0.25, 0.3], grav: 1500, seed: info.seed });
      K.shake(M.max(info.dur, 0.42), 5);
    }
  });
})();
