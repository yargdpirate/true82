/* art/dots/checks.js: Marked. A win is a rubber-stamped aqua check. A loss is a stamped cross in a ring that did not
   take evenly (a gap), bled and run. A streak leaves no mark on the settled stamp (the owner's rule): the 30th straight
   win rests exactly like the first; only the burst at every tenth win moves. */
(function () {
  "use strict";
  var PI = Math.PI, M = Math, TAU = PI * 2;
  function rib(g, x0, y0, x1, y1, a, b) {  // a marker flick: round caps, width a at the start, b at the tip
    var q = M.atan2(y1 - y0, x1 - x0) + PI / 2, cx = M.cos(q), cy = M.sin(q);
    g.moveTo(x0 + cx * a, y0 + cy * a); g.lineTo(x1 + cx * b, y1 + cy * b); g.arc(x1, y1, b, q, q - PI, true);
    g.lineTo(x0 - cx * a, y0 - cy * a); g.arc(x0, y0, a, q + PI, q, true);
  }
  function tick(g, x, y, R, z, t, w) {  // the check, one path, at (x, y) turned by t and scaled by z; w fattens it (the bleed)
    g.save(); g.translate(x, y); g.rotate(t); g.scale(z * R, z * R); g.beginPath(); w = w || 0;
    rib(g, -0.95, -0.02, -0.28, 0.72, 0.27 + w, 0.31 + w); rib(g, -0.28, 0.72, 1.05, -0.95, 0.31 + w, 0.17 + w);
    g.restore();
  }
  T82ART.add("dots", "checks", {
    name: "Marked",
    by: "Wins are rubber-stamped aqua checks (a gold burst on every tenth straight); losses are a stamped cross in a ring that did not take.",
    reach: { w: 2.5, l: 2.6 },
    live: { w: 0.3, l: 0.9 },
    inks: { a: "win", c: "loss" },
    marks: function (K, D) {
      var r = K.rand(((D.gi + 1) * 2654435761) >>> 0);
      D.t = (r() - 0.5) * (D.win ? 0.3 : 0.36); D.g = r() * TAU; D.dx = r() - 0.5; D.dl = 0.65 + r() * 0.35;
    },
    a: function (K, g, D, c, R, e) {
      if (!D.win) return;
      var p = K.clamp(e / 0.08, 0, 1), z = 1 + 0.7 * (1 - p) * (1 - p) - 0.09 * M.sin(K.clamp((e - 0.08) / 0.12, 0, 1) * PI);
      var b = K.clamp((e - 0.06) / 0.14, 0, 1);  // the ink spreads into the paper a little
      if (b > 0) { g.fillStyle = K.tone(0.3 * b); tick(g, c[0], c[1], R, z, D.t, 0.15 * b); g.fill(); }
      g.fillStyle = K.tone(0.96); tick(g, c[0], c[1], R, z, D.t); g.fill();
    },
    c: function (K, g, D, c, R, e) {
      if (D.win) return;
      var p = K.clamp(e / 0.08, 0, 1), z = 1 + 0.8 * (1 - p) * (1 - p) - 0.1 * M.sin(K.clamp((e - 0.08) / 0.12, 0, 1) * PI), b = K.clamp((e - 0.08) / 0.3, 0, 1), x, y, u;
      g.save(); g.translate(c[0], c[1]); g.scale(z, z);
      if (b > 0) { g.strokeStyle = K.tone(0.36 * b); g.lineWidth = R * (0.24 + 0.14 * b); g.beginPath(); g.arc(0, 0, R * 0.88, D.g + 0.6, D.g + TAU); g.stroke(); }
      g.strokeStyle = K.tone(0.96); g.lineWidth = R * 0.24; g.beginPath(); g.arc(0, 0, R * 0.88, D.g + 0.6, D.g + TAU); g.stroke();
      g.rotate(D.t); g.fillStyle = K.tone(0.96); g.beginPath();
      rib(g, -R * 0.5, -R * 0.5, R * 0.5, R * 0.5, R * 0.11, R * 0.11); rib(g, R * 0.5, -R * 0.5, -R * 0.5, R * 0.5, R * 0.11, R * 0.11);
      g.fill(); g.restore();
      u = K.ease.out((e - 0.14) / 0.6);  // ink pooled at the ring's foot runs
      if (u > 0) {
        x = c[0] + (D.dx < 0 ? -0.82 : 0.82) * R; y = c[1] + R * 0.35; p = D.pitch * (D.lastRow ? 0.42 : 0.2) * D.dl * u;
        g.beginPath(); g.moveTo(x - R * 0.14, y - 1); g.quadraticCurveTo(x - R * 0.05, y + p / 2, x, y + p); g.quadraticCurveTo(x + R * 0.05, y + p / 2, x + R * 0.14, y - 1); g.fill();
        g.beginPath(); g.arc(x, y + p, R * 0.17 * (0.6 + 0.4 * u), 0, TAU); g.fill();
      }
    },
    win: function (K, p, info) {  // a stamp thumps: a puff of ink; every tenth straight, a gold ring
      K.spark({ x: p[0], y: p[1], n: 4, ink: "win", sp: [60, 150], r: [1, 2.2], life: [0.18, 0.1], grav: 200, seed: info.seed });
      if (info.streak < 10 || info.streak % 10) return;
      K.ring({ x: p[0], y: p[1], dur: 0.5, r0: 6, r1: 64, w0: 6, ink: "gold", cov: 0.9 });
      K.spark({ x: p[0], y: p[1], n: 12, ink: "gold", sp: [110, 260], r: [1.3, 2.8], life: [0.3, 0.25], grav: 320, seed: info.seed + 1 });
    },
    lossHit: function (K, p, info) {  // past the 14th loss: the stamp thuds and flings ink
      K.ring({ x: p[0], y: p[1], dur: 0.34, r0: 8, r1: 58, w0: 6, ink: "loss", cov: 0.85 });
      K.spark({ x: p[0], y: p[1], n: 10, ink: "loss", sp: [90, 300], r: [1, 2.8], life: [0.25, 0.3], grav: 1500, seed: info.seed });
      K.shake(M.max(info.dur, 0.42), 5);
    }
  });
})();
