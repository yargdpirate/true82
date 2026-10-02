/* art/dots/pixels.js: Pixel Blocks. A win drops in as a solid 2x2 block with a white corner pixel and locks with one
   white flash; a loss tumbles down as the awkward L piece and sheds loose pixels. Stepped on twos (12 fps), every cell a
   screened square. A streak leaves no mark on the settled stamp (the owner's rule): the 30th straight win rests exactly
   like the first, with no brackets or frame; only the burst at every tenth win moves. */
(function () {
  "use strict";
  var M = Math, PI = M.PI;
  var OC = [[0, 0], [1, 0], [0, 1], [1, 1]], LC = [[0, 0], [0, 1], [0, 2], [1, 2]];
  function piece(K, g, cs, c, R, dy, ang, by, tone, sc) {  // cells of side sc*R, the box centered, each inset half a px: seams of stock
    var s = R * sc, i;
    g.save(); g.translate(c[0], c[1] + dy); g.rotate(ang); g.fillStyle = K.tone(tone);
    for (i = 0; i < cs.length; i++) g.fillRect((cs[i][0] - 1) * s + 0.5, (cs[i][1] - by) * s + 0.5, s - 1, s - 1);
    g.restore();
  }
  T82ART.add("dots", "pixels", {
    name: "Pixel Blocks",
    by: "Wins drop in as solid 2x2 blocks with a white corner pixel; a loss tumbles down as the awkward L piece and sheds loose pixels.",
    reach: { w: 2.3, l: 2.7 },
    live: { w: 0.32, l: 0.6 },
    inks: { a: "win", b: "light", c: "loss" },
    marks: function (K, D) {
      var r = K.rand(((D.gi + 1) * 2654435761) >>> 0), i;
      D.n = 1 + ((r() * 3) | 0); D.cr = [];
      for (i = 0; i < 3; i++) D.cr.push([1.1 + i * 0.3 + r() * 0.08, 0.26 + r() * 0.14]);
    },
    a: function (K, g, D, c, R, e) {
      if (D.win) piece(K, g, OC, c, R, e < 0.167 ? -R * 0.6 * (2 - M.floor(e * 12)) : 0, 0, 1, 0.95, 0.86);
    },
    b: function (K, g, D, c, R, e) {  // white: the corner pixel, and the one flash as the block locks (the third step, gone at the fourth)
      if (!D.win) return;
      var f = M.floor(e * 12), q = R * 0.86, x = c[0], y = c[1], dy = f < 2 ? -R * 0.6 * (2 - f) : 0;
      if (f === 2) piece(K, g, OC, c, R, 0, 0, 1, 0.5, 0.86);
      g.fillStyle = K.tone(0.95); g.fillRect(x - q + 0.5, y + dy - q + 0.5, q - 1, q - 1);
    },
    c: function (K, g, D, c, R, e) {
      if (D.win) return;
      var f = M.floor(e * 12), i, p, z;
      piece(K, g, LC, c, R, f < 2 ? -R * 0.6 * (2 - f) : 0, f < 2 ? PI * 0.5 * (2 - f) : 0, 1.5, 0.95, 0.8);
      if (f < 3) return;
      p = M.min(1, (f - 2) / 3); g.fillStyle = K.tone(0.95);
      for (i = 0; i < D.n; i++) {
        z = D.cr[i][1] * R;
        g.fillRect(c[0] + (0.8 + (D.cr[i][0] - 0.8) * p) * R - z / 2, c[1] + 1.2 * R - z - M.sin(PI * p) * 0.7 * R, z, z);
      }
    },
    win: function (K, p, info) {
      K.spark({ x: p[0], y: p[1], n: 3, ink: "light", sp: [50, 150], r: [1, 1.8], life: [0.18, 0.1], grav: 260, seed: info.seed });
      if (info.streak < 10 || info.streak % 10) return;
      K.ring({ x: p[0], y: p[1], dur: 0.46, r0: 6, r1: 62, w0: 6, ink: "light", cov: 0.8 });
      K.spark({ x: p[0], y: p[1], n: 12, ink: "win", sp: [120, 270], r: [1.4, 3], life: [0.3, 0.2], grav: 320, seed: info.seed + 1 });
    },
    lossHit: function (K, p, info) {
      K.spark({ x: p[0], y: p[1], n: 12, ink: "loss", sp: [100, 360], r: [1, 2.8], life: [0.25, 0.3], grav: 1500, seed: info.seed });
      K.shake(M.max(info.dur, 0.42), 5);
    }
  });
})();
