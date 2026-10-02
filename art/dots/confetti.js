/* art/dots/confetti.js: Confetti. A win is an aqua paper triangle that flutters down flipping edge-on and lands. A loss
   is a pink sheet that crumples into a faceted wad (each facet its own tone), bounces and rolls to a stop, and leaks a
   run of ink. A streak leaves no mark on the settled stamp (the owner's rule): the 30th straight win rests exactly like
   the first, with no gold bits left lying around it; only the burst at every tenth win moves. */
(function () {
  "use strict";
  var M = Math, PI = M.PI, TAU = PI * 2, NV = 7;
  T82ART.add("dots", "confetti", {
    name: "Confetti",
    by: "Wins are aqua paper triangles fluttering down (a gold burst on every tenth straight); a loss is a sheet crumpling into a pink faceted wad that bounces, rolls, and leaks ink.",
    reach: { w: 2.2, l: 2.9 },
    live: { w: 0.3, l: 0.9 },
    inks: { a: "win", c: "loss" },
    marks: function (K, D) {
      var r = K.rand(((D.gi + 1) * 2654435761) >>> 0), i;
      D.r = r() * TAU; D.k = r() < 0.5 ? -1 : 1; D.dx = (r() - 0.5) * 0.6; D.dl = 0.65 + r() * 0.35; D.p = [(r() - 0.5) * 0.4, (r() - 0.5) * 0.4];
      D.v = []; D.f = []; D.j = [];
      for (i = 0; i < NV; i++) { D.v.push(0.6 + r() * 0.6); D.f.push(0.45 + r() * 0.5); D.j.push((r() - 0.5) * 0.4); }
    },
    a: function (K, g, D, c, R, e) {
      if (!D.win) return;
      var q = 1 - K.ease.out(e / 0.2), i, a;
      g.save(); g.translate(c[0] + R * 0.5 * M.sin(q * 9) * q, c[1] - R * 1.1 * q); g.rotate(D.r + q * 4 * D.k); g.scale(R * (1 + 0.3 * q), R * M.cos(q * 6 * D.k));
      g.fillStyle = K.tone(0.95); g.beginPath();
      for (i = 0; i < 3; i++) { a = -PI / 2 + i * TAU / 3 + D.j[i] * 0.5; g.lineTo(M.cos(a) * (0.7 + D.v[i] * 0.3), M.sin(a) * (0.7 + D.v[i] * 0.3)); }
      g.closePath(); g.fill(); g.restore();
    },
    c: function (K, g, D, c, R, e) {
      if (D.win) return;
      var d = K.clamp(e / 0.05, 0, 1), k = K.ease.out((e - 0.05) / 0.12), h = K.clamp((e - 0.17) / 0.25, 0, 1), u = K.ease.out((e - 0.3) / 0.5), i, a, r, P = [], L, y, o;
      o = D.r * 0.1 + 0.3 * (1 - k) * D.k + 1.2 * h * D.k; y = 0.05 - 1.25 * (1 - d * d) - 0.5 * M.sin(h * PI);
      g.save(); g.translate(c[0] + R * 0.1 * h * D.k, c[1] + R * y); g.rotate(o); g.scale(R * (1.3 - 0.3 * k), R * (1.3 - 0.3 * k) * (1 - 0.14 * M.sin(K.clamp((e - 0.05) / 0.12, 0, 1) * PI)));
      for (i = 0; i < NV; i++) {  // the sheet's rim eases from a square to the wad's ragged one
        a = i * TAU / NV + D.j[i] * 0.3; r = 0.95 / M.max(M.abs(M.cos(a)), M.abs(M.sin(a)));
        r += (D.v[i] - r) * k; P.push([M.cos(a) * r, M.sin(a) * r]);
      }
      for (i = 0; i < NV; i++) {
        g.fillStyle = K.tone(0.95 + (0.4 + 0.55 * (0.5 + 0.5 * M.cos((i + 0.5) * TAU / NV + o + 2.356)) + (D.f[i] - 0.7) * 0.2 - 0.95) * k); g.beginPath(); g.moveTo(D.p[0] * k, D.p[1] * k); g.lineTo(P[i][0], P[i][1]); g.lineTo(P[(i + 1) % NV][0], P[(i + 1) % NV][1]); g.fill();
      }
      g.globalCompositeOperation = "destination-out"; g.strokeStyle = K.tone(1); g.lineWidth = 0.11 * k; g.lineJoin = "round"; g.beginPath();
      for (i = 0; i < 2; i++) { a = P[i * 2 + 1]; g.moveTo(a[0] * 1.1, a[1] * 1.1); g.lineTo(a[0] * 0.5 + (D.f[i] - 0.7) * 0.5, a[1] * 0.5 + (D.f[i + 3] - 0.7) * 0.5); g.lineTo(D.p[0] * k, D.p[1] * k); }
      g.stroke(); g.restore();
      if (u > 0) {  // the ink that ran
        L = D.pitch * (D.lastRow ? 0.4 : 0.14) * D.dl * u; a = c[0] + R * (0.1 * D.k + D.dx * 0.5); y = c[1] + R * 1.0 - 1; r = R * 0.15;
        g.fillStyle = K.tone(0.94); g.beginPath(); g.moveTo(a - r, y); g.quadraticCurveTo(a - r / 2, y + L / 2, a, y + L); g.quadraticCurveTo(a + r / 2, y + L / 2, a + r, y); g.fill();
        g.beginPath(); g.arc(a, y + L, R * 0.19 * (0.6 + 0.4 * u), 0, TAU); g.fill();
      }
    },
    win: function (K, p, info) {  // paper flecks; every tenth straight a gold ring
      K.spark({ x: p[0], y: p[1], n: 4, ink: "win", sp: [50, 140], r: [1, 2], life: [0.18, 0.1], grav: 200, seed: info.seed });
      if (info.streak < 10 || info.streak % 10) return;
      K.ring({ x: p[0], y: p[1], dur: 0.5, r0: 6, r1: 64, w0: 6, ink: "gold", cov: 0.9 });
      K.spark({ x: p[0], y: p[1], n: 12, ink: "gold", sp: [110, 260], r: [1.3, 2.8], life: [0.3, 0.25], grav: 320, seed: info.seed + 1 });
    },
    lossHit: function (K, p, info) {
      K.ring({ x: p[0], y: p[1], dur: 0.34, r0: 8, r1: 56, w0: 6, ink: "loss", cov: 0.85 });
      K.spark({ x: p[0], y: p[1], n: 8, ink: "loss", sp: [90, 280], r: [1, 2.6], life: [0.25, 0.3], grav: 1500, seed: info.seed });
      K.shake(M.max(info.dur, 0.42), 5);
    }
  });
})();
