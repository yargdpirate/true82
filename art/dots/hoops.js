/* art/dots/hoops.js: Swish and Clank. A win is a ball dropping through a tiny hoop: it hits the net (bulges, sways) and
   settles in the rim, the net a halftone mesh. A loss is the same hoop in pink and the ball clanking off the rim: the rim
   bends and rings, the ball flies off to the corner, the net hangs limp as drips. A streak leaves no mark on the settled
   stamp (the owner's rule): the 30th straight win rests exactly like the first, an aqua hoop; only the burst at every
   tenth win moves. */
(function () {
  "use strict";
  var M = Math, PI = M.PI, TAU = PI * 2, KO = "destination-out";
  function cap(g, x0, x1, y, t) {  // a rim: a capsule of half-thickness t
    g.moveTo(x0, y - t); g.lineTo(x1, y - t); g.arc(x1, y, t, -PI / 2, PI / 2); g.lineTo(x0, y + t); g.arc(x0, y, t, PI / 2, PI * 1.5); g.closePath();
  }
  function drop(g, x, y0, L, w) {  // a hanging strand with a bead on its end
    g.beginPath(); g.moveTo(x - w, y0); g.quadraticCurveTo(x - w * 0.4, y0 + L / 2, x, y0 + L); g.quadraticCurveTo(x + w * 0.4, y0 + L / 2, x + w, y0); g.fill();
    g.beginPath(); g.arc(x, y0 + L, 0.2 * (0.6 + 0.4 * M.min(1, L * 2)), 0, TAU); g.fill();
  }
  function ry(sag, x) { return x < -0.35 ? 0.1 + sag * (x + 0.95) / 0.6 : 0.1 + sag * (1 - 0.85 * (x + 0.35) / 1.3); }  // the bent rim's height at x
  function fall(e) {  // the winning ball's height (R): drops onto the rim, dips through the net, springs back
    var k;
    if (e < 0.06) return -2.8 + 2.18 * e * e / 0.0036;
    if (e < 0.12) return -0.62 + 0.97 * M.sin((e - 0.06) / 0.06 * PI / 2);
    if (e < 0.24) { k = 1 - (e - 0.12) / 0.12; return -0.62 + 0.97 * k * k; }
    return -0.62;
  }
  function win(K, g, D, c, R, e) {  // the net, the ball and the rim, all aqua
    var y = fall(e), k = e > 0.06 && e < 0.22 ? M.sin(PI * (e - 0.06) / 0.16) : 0;
    var s = e > 0.1 && e < 0.25 ? 0.3 * M.sin((e - 0.1) * 55) * (1 - (e - 0.1) / 0.15) : 0, h, bw = 0.3 + 0.4 * k;
    g.save(); g.translate(c[0], c[1]); g.scale(R, R);
    h = g.createLinearGradient(0, -0.1, 0, 1.4); h.addColorStop(0, K.tone(0.74)); h.addColorStop(1, K.tone(0.26));  // the net: a halftone mesh that thins toward its foot
    g.fillStyle = h; g.beginPath(); g.moveTo(-0.84, 0); g.lineTo(0.84, 0); g.lineTo(bw + s, 1.2 + 0.4 * k); g.lineTo(-bw + s, 1.2 + 0.4 * k); g.closePath(); g.fill();
    g.fillStyle = K.tone(1); g.globalCompositeOperation = KO; g.beginPath(); g.arc(0, y, 0.76, 0, TAU); g.fill();  // a gap round the ball
    g.globalCompositeOperation = "source-over";
    g.fillStyle = K.tone(0.95); g.beginPath(); g.arc(0, y, 0.62, 0, TAU); g.fill();  // the ball: the rim and a seam carved through it
    g.globalCompositeOperation = KO; g.fillStyle = K.tone(1); g.beginPath(); cap(g, -1, 1, -0.1, 0.2); g.rect(-0.07, y - 0.7, 0.14, 0.7); g.fill(); g.globalCompositeOperation = "source-over";
    g.fillStyle = K.tone(0.95); g.beginPath(); cap(g, -0.88, 0.88, -0.1, 0.1); g.fill();
    g.restore();
  }
  T82ART.add("dots", "hoops", {
    name: "Swish and Clank",
    by: "Wins are a ball dropping through a tiny hoop, a halftone net bulging (a gold burst on every tenth straight); a loss is the ball clanking off a pink rim and flying off, the net hanging limp as drips.",
    reach: { w: 1.9, l: 3.3 },
    live: { w: 0.32, l: 0.9 },
    inks: { a: "win", c: "loss" },
    marks: function (K, D) {
      var r = K.rand(((D.gi + 1) * 2654435761) >>> 0);
      D.q = [r(), r(), r()]; D.dl = 0.65 + r() * 0.35;
    },
    a: function (K, g, D, c, R, e) { if (D.win) win(K, g, D, c, R, e); },
    c: function (K, g, D, c, R, e) {
      if (D.win) return;
      var f = K.clamp((e - 0.06) / 0.2, 0, 1), u = K.ease.out((e - 0.12) / 0.6), t = M.max(0, e - 0.06), i, x, y, sq, sag = e < 0.06 ? 0 : 0.28 * (1 - M.exp(-t * 40)) + 0.13 * M.exp(-t * 14) * M.sin(t * 60);
      g.save(); g.translate(c[0], c[1]); g.scale(R, R); g.fillStyle = K.tone(0.95);
      if (e < 0.06) { x = -0.95 + 0.55 * e / 0.06; y = -2.8 + 2.4 * e * e / 0.0036; }  // the ball drops onto the rim's left side
      else { x = -0.4 + 1.02 * f; y = -0.4 - 0.42 * f - 0.6 * M.sin(f * PI); }  // and clanks away to the corner
      sq = e > 0.05 && e < 0.1 ? 0.2 : 0;
      g.save(); g.translate(x, y); g.scale(1 + sq, 1 - sq); g.beginPath(); g.arc(0, 0, 0.52, 0, TAU); g.fill(); g.restore();
      g.strokeStyle = g.fillStyle; g.lineWidth = 0.2; g.lineCap = g.lineJoin = "round";  // the rim, bent where the ball struck
      g.beginPath(); g.moveTo(-0.95, 0.1); g.lineTo(-0.35, 0.1 + sag); g.lineTo(0.95, 0.1 + sag * 0.15); g.stroke();
      if (u > 0) for (i = 0; i < 3; i++) { x = [-0.62, -0.1, 0.5][i]; drop(g, x, ry(sag, x) + 0.06, (0.4 + 0.3 * D.q[i]) * u + (D.lastRow ? 0.22 * D.pitch / R * D.dl * D.q[i] * u : 0), 0.11); }
      g.restore();
    },
    win: function (K, p, info) {  // swish: a little spray; every tenth straight a gold ring
      K.spark({ x: p[0], y: p[1], n: 4, ink: "win", sp: [50, 140], r: [1, 2], life: [0.18, 0.1], grav: 300, seed: info.seed });
      if (info.streak < 10 || info.streak % 10) return;
      K.ring({ x: p[0], y: p[1], dur: 0.5, r0: 6, r1: 64, w0: 6, ink: "gold", cov: 0.9 });
      K.spark({ x: p[0], y: p[1], n: 12, ink: "gold", sp: [110, 260], r: [1.3, 2.8], life: [0.3, 0.25], grav: 320, seed: info.seed + 1 });
    },
    lossHit: function (K, p, info) {  // past the 14th loss: the clank
      K.ring({ x: p[0], y: p[1], dur: 0.34, r0: 8, r1: 56, w0: 6, ink: "loss", cov: 0.85 });
      K.spark({ x: p[0], y: p[1], n: 8, ink: "loss", sp: [90, 280], r: [1, 2.6], life: [0.25, 0.3], grav: 1500, seed: info.seed });
      K.shake(M.max(info.dur, 0.42), 5);
    }
  });
})();
