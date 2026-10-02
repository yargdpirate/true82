/* art/dots/stars.js: Stars and Xs. Wins spin in as hand-cut aqua stars with a twinkling glint that is gone by the time
   they settle. Losses are an X scrawled in two flicks that bleeds, spatters and runs. A streak leaves no mark on the
   settled stamp (the owner's rule): the 30th straight win rests exactly like the first, with no halo or shine; only the
   burst at every tenth win moves. */
(function () {
  "use strict";
  var PI = Math.PI, M = Math;
  function star(g, x, y, R, ri, a, w) {
    var i, q, t;
    g.beginPath();
    for (i = 0; i < 10; i++) { q = (i & 1 ? R * ri : R) * (1 + w[i]); t = a + i * PI / 5 - PI / 2; g.lineTo(x + M.cos(t) * q, y + M.sin(t) * q); }
    g.closePath();
  }
  function glint(g, x, y, r, a) {  // a four-point flash
    for (var i = 0, q; i < 8; i++) { q = r * (i & 1 ? 0.2 : 1); g.lineTo(x + M.cos(a + i * PI / 4) * q, y + M.sin(a + i * PI / 4) * q); }
    g.closePath();
  }
  function rib(g, x0, y0, x1, y1, a, b) {  // a flick: round caps, wide at the pen-down, thinner at the tip
    var q = M.atan2(y1 - y0, x1 - x0) + PI / 2, cx = M.cos(q), cy = M.sin(q);
    g.moveTo(x0 + cx * a, y0 + cy * a); g.lineTo(x1 + cx * b, y1 + cy * b); g.arc(x1, y1, b, q, q - PI, true);
    g.lineTo(x0 - cx * a, y0 - cy * a); g.arc(x0, y0, a, q + PI, q, true);
  }
  T82ART.add("dots", "stars", {
    name: "Stars and Xs",
    by: "Wins spin in as aqua stars (a gold burst on every tenth straight); losses are a scrawled X that bleeds and runs.",
    reach: { w: 2.2, l: 2.7 },
    live: { w: 0.32, l: 0.95 },
    inks: { a: "win", c: "loss" },
    marks: function (K, D) {
      var r = K.rand(((D.gi + 1) * 2654435761) >>> 0), i;
      D.rot = (r() - 0.5) * 0.5; D.ri = 0.42 + r() * 0.08;
      D.w = []; for (i = 0; i < 10; i++) D.w.push((r() - 0.5) * 0.12);
      if (D.win) return;
      D.t = (r() - 0.5) * 0.5; D.f = r() < 0.5 ? 1 : -1; D.j = [];
      for (i = 0; i < 8; i++) D.j.push((r() - 0.5) * 0.3);
      D.s = []; for (i = 0; i < 3; i++) D.s.push([r() * 6.28, 1.3 + r() * 0.4, 0.09 + r() * 0.07]);
      D.dx = r() < 0.5 ? -1 : 1; D.dl = 0.65 + r() * 0.35;
    },
    a: function (K, g, D, c, R, e) {
      if (!D.win) return;
      var t = K.clamp(e / 0.16, 0, 1), k = K.clamp((e - 0.05) / 0.2, 0, 1), s = 0.1 + 0.9 * K.ease.back(t);
      g.fillStyle = K.tone(0.95);
      star(g, c[0], c[1], R * 1.04 * s, D.ri, D.rot - (1 - K.ease.out(t)) * 1.26, D.w); g.fill();
      if (k > 0 && k < 1) { g.fillStyle = K.tone(0.8); g.beginPath(); glint(g, c[0], c[1], R * 2 * M.sin(k * PI), D.rot + PI / 4); g.fill(); }  // the twinkle
    },
    c: function (K, g, D, c, R, e) {
      if (D.win) return;
      var h = R * 0.84, S = [[-1, -1, 1, 1], [1, -1, -1, 1]], i, u, j = D.j, p, b = K.clamp((e - 0.08) / 0.3, 0, 1), x, y, z = 1 + 0.25 * (1 - K.ease.out(e / 0.1));
      if (D.f < 0) S.reverse();
      g.save(); g.translate(c[0], c[1]); g.rotate(D.t); g.scale(z, z);
      for (i = 0; i < 2; i++) {
        u = K.clamp((e - i * 0.07) / 0.07, 0, 1); if (!u) continue;
        p = S[i]; x = p[0] * h + j[i * 4]; y = p[1] * h + j[i * 4 + 1];
        p = [x, y, x + (p[2] * h + j[i * 4 + 2] - x) * u, y + (p[3] * h + j[i * 4 + 3] - y) * u];
        if (b > 0) { g.fillStyle = K.tone(0.4 * b); g.beginPath(); rib(g, p[0], p[1], p[2], p[3], R * (0.3 + 0.2 * b), R * (0.2 + 0.2 * b)); g.fill(); }
        g.fillStyle = K.tone(0.96); g.beginPath(); rib(g, p[0], p[1], p[2], p[3], R * 0.27, R * 0.17); g.fill();
      }
      g.restore(); g.fillStyle = K.tone(0.96);
      if (e > 0.05) for (i = 0; i < 3; i++) { p = D.s[i]; g.beginPath(); g.arc(c[0] + M.cos(p[0]) * p[1] * R, c[1] + M.sin(p[0]) * p[1] * R, p[2] * R * K.clamp((e - 0.05) / 0.05, 0, 1), 0, PI * 2); g.fill(); }
      u = K.ease.out((e - 0.14) / 0.6);  // the run: a drip from the foot of a flick
      if (u > 0) {
        x = c[0] + D.dx * h * M.cos(D.t) - h * M.sin(D.t); y = c[1] + D.dx * h * M.sin(D.t) + h * M.cos(D.t) + R * 0.1; p = D.pitch * (D.lastRow ? 0.5 : 0.24) * D.dl * u;
        g.beginPath(); g.moveTo(x - R * 0.14, y - 1); g.quadraticCurveTo(x - R * 0.05, y + p / 2, x, y + p); g.quadraticCurveTo(x + R * 0.05, y + p / 2, x + R * 0.14, y - 1); g.fill();
        g.beginPath(); g.arc(x, y + p, R * 0.17 * (0.6 + 0.4 * u), 0, PI * 2); g.fill();
      }
    },
    win: function (K, p, info) {  // stars flick up like twinkles; every tenth straight, a gold nova
      K.spark({ x: p[0], y: p[1], n: 4, ink: "win", sp: [50, 140], r: [1, 2], life: [0.2, 0.12], grav: -60, seed: info.seed });
      if (info.streak < 10 || info.streak % 10) return;
      K.ring({ x: p[0], y: p[1], dur: 0.5, r0: 6, r1: 66, w0: 6, ink: "gold", cov: 0.9 });
      K.spark({ x: p[0], y: p[1], n: 14, ink: "gold", sp: [110, 270], r: [1.3, 2.8], life: [0.3, 0.25], grav: 60, seed: info.seed + 1 });
    },
    lossHit: function (K, p, info) {  // past the 14th loss: the scrawl flings ink
      K.spark({ x: p[0], y: p[1], n: 12, ink: "loss", sp: [90, 320], r: [1, 3], life: [0.25, 0.3], grav: 1400, seed: info.seed, streak: true });
      K.shake(M.max(info.dur, 0.42), 4);
    }
  });
})();
