/* art/dots/prints.js: Thumbprints. A win is a thumb pressed into the ink: a solid oval with whorl ridges carved out of
   it, every one its own print. A loss presses the same way, then the thumb drags: the print smears sideways into a
   streaked trail whose dots shrink toward the end. A streak leaves no mark on the settled stamp (the owner's rule): the
   30th straight win rests exactly like the first, with no splash round it; only the burst at every tenth win moves. */
(function () {
  "use strict";
  var M = Math, PI = M.PI, TAU = PI * 2;
  function ridges(g, D, R) {  // three broken whorl arcs about the core, path only
    var i, a;
    g.beginPath();
    for (i = 0; i < 3; i++) {
      a = D.gp[i];
      g.moveTo(D.cx * R + (0.2 + 0.22 * i) * R * M.cos(a + 0.6), D.cy * R + (0.26 + 0.27 * i) * R * M.sin(a + 0.6));
      g.ellipse(D.cx * R, D.cy * R, (0.2 + 0.22 * i) * R, (0.26 + 0.27 * i) * R, 0, a + 0.6, a + TAU - 0.6);
    }
  }
  function carve(g, w) { g.globalCompositeOperation = "destination-out"; g.strokeStyle = "#000"; g.lineWidth = w; g.lineCap = "round"; }
  T82ART.add("dots", "prints", {
    name: "Thumbprints",
    by: "Wins press in as inked thumbprints, each with its own whorl; a loss presses, then drags into a streaked smear.",
    reach: { w: 1.9, l: 2 },
    live: { w: 0.3, l: 0.55 },
    inks: { a: "win", c: "loss" },
    marks: function (K, D) {
      var r = K.rand(((D.gi + 1) * 2654435761) >>> 0), i;
      D.rot = (r() - 0.5) * 0.8; D.cx = (r() - 0.5) * 0.2; D.cy = (r() - 0.5) * 0.3; D.gp = [r() * TAU, r() * TAU, r() * TAU];
      for (i = 0; i < 24; i++) r();  // the streak splash drew its dots here; the draws stay so every loss's smear keeps the look he picked
      D.sl = []; for (i = 0; i < 5; i++) D.sl.push([r() * 0.5, 0.7 + r() * 0.6]);
    },
    a: function (K, g, D, c, R, e) {
      if (!D.win) return;
      var k = K.ease.out(e / 0.14), z = 1 + 0.3 * (1 - k);
      g.save(); g.translate(c[0], c[1]); g.rotate(D.rot + 0.25 * (1 - k)); g.scale(z * (1 + 0.12 * (1 - k)), z * (1 - 0.12 * (1 - k)));
      g.fillStyle = K.tone(0.95); g.beginPath(); g.ellipse(0, 0, R * 0.8, R, 0, 0, TAU); g.fill();
      carve(g, K.clamp((e - 0.03) / 0.1, 0.2, 1)); ridges(g, D, R); g.stroke();
      g.restore();
    },
    c: function (K, g, D, c, R, e) {
      if (D.win) return;
      var z = 1 + 0.35 * M.pow(M.max(0, 1 - e / 0.07), 2), n = K.ease.inOut(K.clamp((e - 0.07) / 0.3, 0, 1)), d = n * 0.85 * R, i, q, gr, y;
      g.save(); g.translate(c[0] - d * 0.2, c[1]); g.rotate(D.rot * 0.4); g.scale(z, z);
      gr = g.createLinearGradient(-0.8 * R, 0, d + 0.8 * R, 0);
      gr.addColorStop(0, K.tone(0.95)); gr.addColorStop(0.4, K.tone(0.92)); gr.addColorStop(1, K.tone(0.95 - 0.6 * n));
      g.fillStyle = gr; g.beginPath();
      g.ellipse(0, 0, R * 0.8, R, 0, PI / 2, PI * 1.5); g.lineTo(d, -R); g.ellipse(d, 0, R * 0.8, R, 0, -PI / 2, PI / 2); g.closePath(); g.fill();
      carve(g, M.max(0.2, 1 - n * 1.4)); ridges(g, D, R); g.stroke();
      if (n > 0) {
        carve(g, n); g.beginPath();
        for (i = 0; i < 5; i++) { q = D.sl[i]; y = (-0.62 + 0.31 * i) * R; g.moveTo((-0.1 + q[0]) * R, y); g.lineTo((-0.1 + q[0] + q[1]) * R + d * 0.9, y); }
        g.stroke();
      }
      g.restore();
    },
    win: function (K, p, info) {
      K.spark({ x: p[0], y: p[1], n: 3, ink: "light", sp: [50, 150], r: [1, 1.8], life: [0.18, 0.1], grav: 260, seed: info.seed });
      if (info.streak < 10 || info.streak % 10) return;
      K.ring({ x: p[0], y: p[1], dur: 0.46, r0: 6, r1: 62, w0: 6, ink: "win", cov: 0.85 });
      K.spark({ x: p[0], y: p[1], n: 12, ink: "light", sp: [120, 270], r: [1.4, 3], life: [0.3, 0.2], grav: 320, seed: info.seed + 1 });
    },
    lossHit: function (K, p, info) {
      K.spark({ x: p[0], y: p[1], n: 10, ink: "loss", sp: [90, 300], r: [1, 2.6], life: [0.25, 0.3], grav: 1500, seed: info.seed });
      K.shake(M.max(info.dur, 0.42), 5);
    }
  });
})();
