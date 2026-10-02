/* art/dots/drops.js: Fire and Rain. Win: an aqua flame lit from its base. Loss: a pink drop that falls, splats into a
   spiky ink splat and runs. A streak leaves no mark on the settled stamp (the owner's rule): the 30th straight win rests
   exactly like the first; only the burst at every tenth win moves. */
(function () {
  "use strict";
  var M = Math, PI = M.PI, TAU = PI * 2, KO = "destination-out";
  function flame(g, s) {  // the flame, R units, base at y = 1; s < 1: the inner flame (the hollow heart)
    if (s) { g.translate(0, 0.4); g.scale(s, s); }
    g.beginPath(); g.moveTo(0.12, -1.25); g.bezierCurveTo(0.3, -0.75, 0.9, -0.35, 0.88, 0.3); g.bezierCurveTo(0.86, 0.76, 0.46, 1.02, 0, 1.02);
    g.bezierCurveTo(-0.46, 1.02, -0.88, 0.76, -0.88, 0.3); g.bezierCurveTo(-0.88, -0.05, -0.7, -0.3, -0.52, -0.62);
    g.bezierCurveTo(-0.38, -0.38, -0.3, -0.22, -0.12, -0.2); g.bezierCurveTo(-0.12, -0.7, 0, -0.95, 0.12, -1.25); g.closePath();
  }
  function pose(K, g, c, R, e, x, y, z) {  // lights from its base, flickers on twos till 0.22 s; x, y, z: offset, size
    var t = K.clamp(e / 0.14, 0, 1), b = K.ease.back(t), l = 0.34 * M.cos(M.floor(e * 12) * 2.3 + x * 3) * (1 - K.clamp((e - 0.02) / 0.2, 0, 1));
    g.translate(c[0] + R * x, c[1] + R * (0.1 + y)); g.scale(R * 0.9 * z, R * 0.9 * z); g.translate(0, 1); g.scale(0.7 + 0.3 * b, 0.25 + 0.75 * b); g.transform(1, 0, l, 1, 0, 0); g.translate(0, -1);
  }
  T82ART.add("dots", "drops", {
    name: "Fire and Rain",
    by: "Wins light as aqua flames (a gold burst on every tenth straight); a loss is a pink drop that splats and runs.",
    reach: { w: 2.2, l: 3.4 },
    live: { w: 0.34, l: 0.85 },
    inks: { a: "win", c: "loss" },
    marks: function (K, D) {
      var r = K.rand(((D.gi + 1) * 2654435761) >>> 0), i, a = r() * TAU;
      D.dx = (r() - 0.5) * 0.9; D.dl = 0.65 + r() * 0.35; D.sp = [];
      for (i = 0; i < 7; i++) D.sp.push([a + (i + r() * 0.6) * TAU / 7, 0.78 + r() * 0.34, 0.15 + r() * 0.08, r() < 0.45]);
    },
    a: function (K, g, D, c, R, e) {
      if (!D.win) return;
      var h;
      g.save(); pose(K, g, c, R, e, 0, 0, 1); h = g.createLinearGradient(0, -1.25, 0, 1.02);  // thins to dots at the tip
      h.addColorStop(0, K.tone(0.72)); h.addColorStop(0.5, K.tone(0.93)); h.addColorStop(1, K.tone(0.97)); g.fillStyle = h; flame(g); g.fill();
      g.globalCompositeOperation = KO; g.fillStyle = K.tone(1); flame(g, 0.5); g.fill(); g.restore();
    },
    c: function (K, g, D, c, R, e) {
      if (D.win) return;
      var f = K.clamp(e / 0.07, 0, 1), p = K.ease.out((e - 0.075) / 0.1), t = K.ease.back((e - 0.075) / 0.1), u = K.ease.out((e - 0.14) / 0.6), d = K.ease.out((e - 0.12) / 0.14);
      var L = D.pitch * (D.lastRow ? 0.45 : 0.18) * D.dl * u / R, i, q, ux, uy, n, x, y, h;
      g.save(); g.translate(c[0], c[1] + R * 0.1); g.scale(R, R); g.fillStyle = K.tone(0.96);
      if (e < 0.075) {  // the drop falls, stretched
        g.translate(0, -1.9 * (1 - f * f)); g.scale(0.85, 1.3); g.beginPath();
        for (i = 0; i < 2; i++) { g.moveTo(0, -0.95); g.bezierCurveTo(0.12, -0.55, 0.55, -0.1, 0.55, 0.3); g.bezierCurveTo(0.55, 0.65, 0.3, 0.85, 0, 0.85); g.scale(-1, 1); }
        g.fill(); g.restore(); return;
      }
      h = g.createRadialGradient(0, 0.1, 0, 0, 0.1, 1.2); h.addColorStop(0, K.tone(0.97)); h.addColorStop(1, K.tone(0.84)); g.fillStyle = h;  // pinholes at the rim
      g.beginPath(); g.ellipse(0, 0.1, 0.78 * p + 0.05, 0.5 * p + 0.1, 0, 0, TAU);
      for (i = 0; i < 7; i++) {  // tendrils, some pinch off a droplet
        q = D.sp[i]; ux = M.cos(q[0]); uy = M.sin(q[0]); n = (q[1] - (q[3] ? 0.2 : 0)) * t;
        g.moveTo(ux * 0.4 + uy * q[2], uy * 0.4 - ux * q[2]); g.lineTo(ux * n + uy * 0.07, uy * n - ux * 0.07); g.lineTo(ux * n - uy * 0.07, uy * n + ux * 0.07); g.lineTo(ux * 0.4 - uy * q[2], uy * 0.4 + ux * q[2]);
        y = q[3] ? q[1] + 0.12 * d : n; x = q[3] ? 0.13 * K.clamp((e - 0.1) / 0.04, 0, 1) : 0.09;
        g.moveTo(ux * y + x, uy * y); g.arc(ux * y, uy * y, x, 0, TAU);
      }
      g.fill();
      if (u > 0) {  // the run
        x = D.dx; g.beginPath(); g.moveTo(x - 0.17, 0.5); g.quadraticCurveTo(x - 0.06, 0.6 + L / 2, x, 0.6 + L); g.quadraticCurveTo(x + 0.06, 0.6 + L / 2, x + 0.17, 0.5); g.fill();
        g.beginPath(); g.arc(x, 0.6 + L, 0.2 * (0.6 + 0.4 * u), 0, TAU); g.fill();
      }
      g.restore();
    },
    win: function (K, p, info) {  // embers; every tenth straight, a gold ring
      K.spark({ x: p[0], y: p[1], n: 4, ink: "win", sp: [50, 140], r: [1, 2], life: [0.22, 0.14], grav: -160, seed: info.seed });
      if (info.streak < 10 || info.streak % 10) return;
      K.ring({ x: p[0], y: p[1], dur: 0.5, r0: 6, r1: 66, w0: 6, ink: "gold", cov: 0.9 });
      K.spark({ x: p[0], y: p[1], n: 14, ink: "gold", sp: [110, 270], r: [1.3, 2.8], life: [0.3, 0.25], grav: -120, seed: info.seed + 1 });
    },
    lossHit: function (K, p, info) {  // past the 14th loss: a splat
      K.ring({ x: p[0], y: p[1], dur: 0.34, r0: 8, r1: 58, w0: 6, ink: "loss", cov: 0.85 });
      K.spark({ x: p[0], y: p[1], n: 10, ink: "loss", sp: [90, 300], r: [1, 2.8], life: [0.25, 0.3], grav: 1500, seed: info.seed });
      K.shake(M.max(info.dur, 0.42), 5);
    }
  });
})();
