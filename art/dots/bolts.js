/* art/dots/bolts.js: Struck and Out. A win is an aqua bolt that strikes top to bottom with a halftone flash; a streak
   backs it with a gold bolt (10), a pair (20) and a halo of gold dots (30). A loss is the same bolt struck in pink, then
   flooded: a dull screened disc of ink with the bolt left as a hole in it, the power out, and a drip. */
(function () {
  "use strict";
  var M = Math, PI = M.PI, TAU = PI * 2;
  var BL = [-0.05, -1.15, 0.6, -1.15, 0.22, -0.2, 0.62, -0.2, -0.3, 1.2, -0.02, 0.1, -0.52, 0.1];
  var EC = [[0.58, 0.02, 0.96, 0.94], [-0.58, 0.06, 0.96, 0.94]];
  function bolt(g, w, s) {  // the bolt in R units at the origin, scaled by s; w: the hand-cut wobble
    g.beginPath();
    for (var i = 0; i < 14; i += 2) g.lineTo((BL[i] + w[i >> 1]) * s, (BL[i + 1] + w[7 + (i >> 1)]) * s);
    g.closePath();
  }
  function strike(K, g, D, c, R, e, x, y, z) {  // the bolt lands from the top down in 0.05 s, a little big, and settles
    var s = z * (1 + 0.22 * (1 - K.ease.out((e - 0.03) / 0.14)));
    g.translate(c[0] + R * x, c[1] + R * y); g.rotate(D.t); g.scale(R, R);
    if (e < 0.05) { g.beginPath(); g.rect(-2, -2, 4, 0.85 + 2.8 * e / 0.05); g.clip(); }
    return s;
  }
  T82ART.add("dots", "bolts", {
    name: "Struck and Out",
    by: "Wins strike as aqua bolts with a halftone flash (a streak backs them with gold bolts, then a gold halo); a loss is the bolt flooded out: a dull pink disc with the bolt left as a hole, and a drip.",
    reach: { w: 2.2, l: 3.4 },
    live: { w: 0.34, l: 0.85 },
    inks: { a: "win", b: "gold", c: "loss" },
    marks: function (K, D) {
      var r = K.rand(((D.gi + 1) * 2654435761) >>> 0), i;
      D.t = (r() - 0.5) * 0.22; D.w = []; for (i = 0; i < 14; i++) D.w.push((r() - 0.5) * 0.07);
      D.dx = (r() - 0.5) * 0.9; D.dl = 0.65 + r() * 0.35;
    },
    a: function (K, g, D, c, R, e) {
      if (!D.win || e < 0) return;
      var s, f = 1 - K.clamp((e - 0.05) / 0.1, 0, 1), h;
      g.save(); s = strike(K, g, D, c, R, e, 0, 0, 1);
      if (f > 0) {  // the flash: a halftone halo, the bolt knocked out of it
        g.restore(); g.save(); g.translate(c[0], c[1]); g.scale(R, R);
        h = g.createRadialGradient(0, 0, 0.3, 0, 0, 1.4); h.addColorStop(0, K.tone(0.55 * f)); h.addColorStop(1, K.tone(0));
        g.fillStyle = h; g.beginPath(); g.arc(0, 0, 1.4, 0, TAU); g.fill(); g.restore(); g.save(); s = strike(K, g, D, c, R, e, 0, 0, 1);
      }
      h = g.createLinearGradient(0, -1.15, 0, 1.2); h.addColorStop(0, K.tone(0.96)); h.addColorStop(0.5, K.tone(0.93)); h.addColorStop(1, K.tone(0.7));  // the strike thins to dots toward its foot
      g.fillStyle = h; bolt(g, D.w, s); g.fill(); g.restore();
    },
    b: function (K, g, D, c, R, e) {  // gold bolts behind it, knocked out under the aqua one
      if (!D.win || D.streak < 10) return;
      var n = D.streak >= 20 ? 2 : 1, i, q, s, h;
      if (D.streak >= 30) {  // a halo of gold dots shrinking outward, behind the pair
        g.save(); g.translate(c[0], c[1]); g.scale(R, R); h = g.createRadialGradient(0, 0, 0.3, 0, 0, 1.38);
        h.addColorStop(0, K.tone(0.6 * K.ease.out(e / 0.1))); h.addColorStop(1, K.tone(0)); g.fillStyle = h; g.beginPath(); g.arc(0, 0, 1.38, 0, TAU); g.fill(); g.restore();
      }
      for (i = 0; i < n; i++) {
        q = EC[i]; if (e < 0.04 + 0.03 * i) continue;
        g.fillStyle = K.tone(q[3]);
        g.save(); s = strike(K, g, D, c, R, e - 0.04 - 0.03 * i, q[0], q[1], q[2]); bolt(g, D.w, s); g.fill(); g.restore();
      }
      g.save(); s = strike(K, g, D, c, R, e, 0, 0, 1); g.globalCompositeOperation = "destination-out"; g.fillStyle = K.tone(1); g.lineJoin = "round"; g.lineWidth = 0.14; bolt(g, D.w, s); g.fill(); g.stroke(); g.restore();
    },
    c: function (K, g, D, c, R, e) {
      if (D.win) return;
      var p = K.ease.out((e - 0.05) / 0.1), u = K.ease.out((e - 0.14) / 0.6), L = D.pitch * (D.lastRow ? 0.45 : 0.1) * D.dl * u / R, s, x;
      g.save();
      if (e < 0.05) {  // the strike, in pink
        s = strike(K, g, D, c, R, e, 0, 0, 1); g.fillStyle = K.tone(0.96); bolt(g, D.w, s); g.fill(); g.restore(); return;
      }
      g.translate(c[0], c[1] + R * 0.05); g.scale(R, R); g.fillStyle = K.tone(0.88); s = 1 - 0.32 * p;
      g.beginPath(); g.arc(0, 0, 1.12 * p + 0.02, 0, TAU); g.fill();
      g.save(); g.rotate(D.t); g.globalCompositeOperation = "destination-out"; g.lineJoin = "round"; g.lineWidth = 0.24; g.fillStyle = K.tone(1); bolt(g, D.w, s); g.fill(); g.stroke(); g.restore();
      if (e < 0.13) { g.save(); g.rotate(D.t); g.fillStyle = K.tone(0.96); bolt(g, D.w, s); g.fill(); g.restore(); }  // the bolt blinks out, leaving its hole
      if (u > 0) {
        x = D.dx; g.fillStyle = K.tone(0.92); g.beginPath(); g.moveTo(x - 0.22, 0.98); g.quadraticCurveTo(x - 0.08, 1.08 + L / 2, x, 1.08 + L); g.quadraticCurveTo(x + 0.08, 1.08 + L / 2, x + 0.22, 0.98);
        g.fill(); g.beginPath(); g.arc(x, 1.08 + L, 0.22 * (0.6 + 0.4 * u), 0, TAU); g.fill();
      }
      g.restore();
    },
    win: function (K, p, info) {  // a crackle of sparks; every tenth straight, a gold ring
      K.spark({ x: p[0], y: p[1], n: 5, ink: "win", sp: [70, 190], r: [1, 1.8], life: [0.16, 0.1], grav: 0, seed: info.seed, streak: true });
      if (info.streak < 10 || info.streak % 10) return;
      K.ring({ x: p[0], y: p[1], dur: 0.45, r0: 6, r1: 66, w0: 6, ink: "gold", cov: 0.9 });
      K.spark({ x: p[0], y: p[1], n: 14, ink: "gold", sp: [120, 300], r: [1.2, 2.6], life: [0.25, 0.2], grav: 0, seed: info.seed + 1, streak: true });
    },
    lossHit: function (K, p, info) {  // past the 14th loss: the strike flooded out
      K.ring({ x: p[0], y: p[1], dur: 0.34, r0: 8, r1: 56, w0: 6, ink: "loss", cov: 0.85 });
      K.spark({ x: p[0], y: p[1], n: 10, ink: "loss", sp: [90, 300], r: [1, 2.6], life: [0.25, 0.3], grav: 1500, seed: info.seed });
      K.shake(M.max(info.dur, 0.42), 5);
    }
  });
})();
