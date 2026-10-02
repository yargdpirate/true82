/* art/dots/suns.js: Sun and Cloud. A win is an aqua sun that rises spinning. A loss is a pink rain cloud that slams in
   from the side, squashes and lets its rain run down in staggered streaks. A streak leaves no mark on the settled stamp
   (the owner's rule): the 30th straight win rests exactly like the first, with no extra rays, halo or gold disc; only
   the burst at every tenth win moves. */
(function () {
  "use strict";
  var M = Math, PI = M.PI, TAU = PI * 2;
  function rays(g, a0, r0, r1, w, n) {  // n triangular rays, base at r0, tip at r1
    for (var i = 0, a, c, s; i < n; i++) {
      a = a0 + i * TAU / n; c = M.cos(a); s = M.sin(a);
      g.moveTo(c * r0 - s * w, s * r0 + c * w); g.lineTo(c * r1, s * r1); g.lineTo(c * r0 + s * w, s * r0 - c * w);
    }
  }
  function disc(g, K, r, a, b) {  // a radial coverage ramp: a at the heart, b at r (halftone dots shrinking outward)
    var h = g.createRadialGradient(0, 0, 0, 0, 0, r);
    h.addColorStop(0, K.tone(a)); h.addColorStop(1, K.tone(b)); return h;
  }
  function pose(K, g, D, c, R, e) {  // a win rises spinning, overshoots and settles by 0.26 s
    var t = K.clamp(e / 0.16, 0, 1), b = K.ease.back(t), s = R * (0.5 + 0.5 * b);
    g.translate(c[0], c[1] + (1 - b) * R * 0.9); g.rotate(D.rot + (1 - K.ease.out(t)) * 1.3); g.scale(s, s);
  }
  T82ART.add("dots", "suns", {
    name: "Sun and Cloud",
    by: "Wins rise as aqua suns (a gold burst on every tenth straight); losses are pink rain clouds that slam in and let their rain run.",
    reach: { w: 2.2, l: 3.4 },
    live: { w: 0.32, l: 0.85 },
    inks: { a: "win", c: "loss" },
    marks: function (K, D) {
      var r = K.rand(((D.gi + 1) * 2654435761) >>> 0);
      D.rot = r() * PI / 4; D.k = r() < 0.5 ? 1 : -1; D.q = r(); D.dl = 0.7 + r() * 0.3;
    },
    a: function (K, g, D, c, R, e) {
      if (!D.win) return;
      g.save(); pose(K, g, D, c, R, e); g.fillStyle = K.tone(0.96); g.beginPath(); rays(g, 0, 0.74, 1.3, 0.21, 8); g.fill();
      g.fillStyle = disc(g, K, 0.54, 0.97, 0.7); g.beginPath(); g.arc(0, 0, 0.54, 0, TAU); g.fill();  // the disc is dots shrinking to its rim
      g.restore();
    },
    c: function (K, g, D, c, R, e) {
      if (D.win) return;
      var f = K.clamp(e / 0.08, 0, 1), sq = e < 0.08 ? 0 : e < 0.11 ? (e - 0.08) / 0.03 : 1 - K.ease.back((e - 0.11) / 0.2), i, x, y, n, l, u;
      g.save(); g.translate(c[0] + D.k * 1.7 * R * (1 - f * f), c[1] - 0.12 * R); g.scale(R, R); g.fillStyle = K.tone(0.96);
      g.save(); g.translate(0, 0.37); g.scale(1 + 0.2 * sq + 0.25 * (1 - f), 1 - 0.22 * sq - 0.1 * (1 - f)); g.translate(0, -0.37);
      u = g.createLinearGradient(0, -0.94, 0, 0.37); u.addColorStop(0, K.tone(0.96)); u.addColorStop(0.5, K.tone(0.9)); u.addColorStop(1, K.tone(0.6)); g.fillStyle = u;  // the belly thins to dots, the rain comes out of it
      g.beginPath(); g.moveTo(-0.08, -0.05); g.arc(-0.5, -0.05, 0.42, 0, TAU); g.moveTo(0.58, -0.38); g.arc(0.02, -0.38, 0.56, 0, TAU);
      g.moveTo(0.96, -0.08); g.arc(0.56, -0.08, 0.4, 0, TAU); g.rect(-0.5, -0.1, 1.06, 0.47); g.fill(); g.restore();
      if (e < 0.1) { g.restore(); return; }
      g.beginPath();
      for (i = 0; i < 3; i++) {  // the rain: each streak is born on the cloud, stretches down, lets go of it and hangs as a slanted drop
        x = -0.46 + 0.48 * i; u = K.clamp((e - 0.1 - 0.05 * i) / 0.3, 0, 1); if (u <= 0) continue;
        l = [0.62, 0.9, 0.5][i] * (D.lastRow ? 1.6 : 1) * D.dl; y = 0.34 + 0.28 * u * u; n = 0.34 + 0.28 + l * K.ease.out(u);
        g.moveTo(x + D.k * 0.2 * (y - 0.34) + 0.05, y); g.lineTo(x + D.k * 0.2 * (n - 0.34) + 0.11, n); g.lineTo(x + D.k * 0.2 * (n - 0.34) - 0.11, n); g.lineTo(x + D.k * 0.2 * (y - 0.34) - 0.05, y);
        g.moveTo(x + D.k * 0.2 * (n - 0.34) + 0.11, n); g.arc(x + D.k * 0.2 * (n - 0.34), n, 0.11, 0, TAU);
      }
      g.fill(); g.restore();
    },
    win: function (K, p, info) {  // a flick of light; every tenth straight, a gold ring
      K.spark({ x: p[0], y: p[1], n: 4, ink: "win", sp: [50, 150], r: [1, 2], life: [0.2, 0.12], grav: -40, seed: info.seed });
      if (info.streak < 10 || info.streak % 10) return;
      K.ring({ x: p[0], y: p[1], dur: 0.5, r0: 6, r1: 70, w0: 6, ink: "gold", cov: 0.9 });
      K.spark({ x: p[0], y: p[1], n: 14, ink: "gold", sp: [110, 270], r: [1.3, 2.8], life: [0.3, 0.25], grav: 60, seed: info.seed + 1 });
    },
    lossHit: function (K, p, info) {  // past the 14th loss: the cloud thuds and rains
      K.spark({ x: p[0], y: p[1], n: 10, ink: "loss", sp: [60, 220], r: [1, 2.4], life: [0.25, 0.3], grav: 1600, seed: info.seed, streak: true });
      K.shake(M.max(info.dur, 0.42), 4);
    }
  });
})();
