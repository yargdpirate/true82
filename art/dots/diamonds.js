/* art/dots/diamonds.js: Diamonds. A win spins in as a cut gem (facets in two tones, seams carved) and throws one white
   twinkle that is gone by the time it lands; a loss lands whole, cracks in a flash and falls open as two halves. A streak
   leaves no mark on the settled stamp (the owner's rule): the 30th straight win rests exactly like the first; only the
   burst at every tenth win moves. */
(function () {
  "use strict";
  var M = Math, PI = M.PI;
  var P = [[-0.56, -0.7], [0.56, -0.7], [1, -0.28], [0, 0.9], [-1, -0.28], [-0.4, -0.28], [0.4, -0.28]];
  var F = [[[[0, 1, 6, 5], [0, 5, 4], [4, 5, 3], [5, 6, 3]], 0.95], [[[1, 2, 6], [6, 2, 3]], 0.8]];
  function gem(K, g, d) {  // the facets, a plate's tone per group (d lifts it)
    var i, j, k, f, p;
    for (i = 0; i < 2; i++) {
      g.fillStyle = K.tone(M.min(0.97, F[i][1] + d)); g.beginPath();
      for (j = 0; j < F[i][0].length; j++) {
        f = F[i][0][j];
        for (k = 0; k < f.length; k++) { p = P[f[k]]; g[k ? "lineTo" : "moveTo"](p[0], p[1]); }
        g.closePath();
      }
      g.fill();
    }
  }
  function star(g, x, y, r) {
    if (r <= 0.05) return;
    g.beginPath();
    for (var i = 0; i < 8; i++) { var a = i * PI / 4, q = i & 1 ? r * 0.27 : r; g[i ? "lineTo" : "moveTo"](x + M.cos(a) * q, y + M.sin(a) * q); }
    g.closePath(); g.fill();
  }
  function seam(g, R, pts) {  // carve the seams out of the gem: the stock shows through
    g.globalCompositeOperation = "destination-out"; g.lineWidth = M.max(0.12, 0.95 / R); g.strokeStyle = "#000"; g.lineCap = "round";
    g.beginPath();
    for (var i = 0; i < pts.length; i += 2) { g.moveTo(pts[i][0], pts[i][1]); g.lineTo(pts[i + 1][0], pts[i + 1][1]); }
    g.stroke();
  }
  var SM = [P[4], P[2], P[0], P[5], P[1], P[6], P[3], P[5], P[3], P[6]];
  function half(K, g, D, R, left, s, ck) {  // one half of a cracked gem, turned about the apex and slid out
    var a = left ? D.a1 : D.a2, side = left ? -1 : 1, pts = left ? [P[0]].concat(ck, [P[4]]) : [P[1], P[2], P[3]].concat(ck.slice(0, 4).reverse()), i;
    g.save();
    g.translate(side * D.s1 * s, D.s2 * s * (left ? 1 : 0.15) + 0.06 * M.sin(PI * M.min(1, s * 1.4)));
    g.translate(0, 0.9); g.rotate(a * s); g.translate(0, -0.9);
    g.fillStyle = K.tone(0.95); g.beginPath();
    for (i = 0; i < pts.length; i++) g[i ? "lineTo" : "moveTo"](pts[i][0], pts[i][1]);
    g.closePath(); g.fill();
    seam(g, R, left ? [P[4], ck[1], P[3], ck[2]] : [P[2], ck[1], P[3], ck[3]]);
    g.restore();
  }

  T82ART.add("dots", "diamonds", {
    name: "Diamonds",
    by: "Wins spin in as cut gems and twinkle once; a loss lands whole, cracks and falls open in two halves.",
    reach: { w: 1.7, l: 2.3 },
    live: { w: 0.32, l: 0.8 },
    inks: { a: "win", b: "light", c: "loss" },
    marks: function (K, D) {
      var r = K.rand(((D.gi + 1) * 2654435761) >>> 0), i;
      D.a1 = -(0.1 + r() * 0.12); D.a2 = 0.1 + r() * 0.1; D.s1 = 0.14 + r() * 0.07; D.s2 = 0.26 + r() * 0.12; D.cx = (r() - 0.5) * 0.6;
      D.ck = [[0.04, -0.7]]; for (i = 1; i < 4; i++) D.ck.push([(r() - 0.5) * 0.24, -0.7 + i * 0.4]);
      D.ck.push([0, 0.9]);
    },
    a: function (K, g, D, c, R, e) {
      if (!D.win) return;
      var k = K.ease.out(e / 0.24), z = 1 + 0.35 * (1 - k), sx = M.max(0.16, M.abs(M.cos(2 * PI * (1 - k))));
      g.save(); g.translate(c[0], c[1] - 0.1 * R - 0.9 * R * (1 - k) * (1 - k)); g.scale(R * z * sx, R * z);
      gem(K, g, 0); seam(g, R, SM);
      g.restore();
    },
    b: function (K, g, D, c, R, e) {  // white: a win's one twinkle (up and gone by 0.26 s), a loss's flash as it cracks
      var t = K.clamp((e - 0.12) / 0.14, 0, 1);
      g.fillStyle = K.tone(0.95);
      if (D.win) {
        star(g, c[0] - 0.7 * R, c[1] - 0.95 * R, R * 0.6 * M.sin(PI * t) * 0.6);
      } else {
        t = K.clamp((e - 0.06) / 0.12, 0, 1);
        star(g, c[0] + D.cx * R, c[1] + 0.1 * R, R * 0.9 * M.sin(PI * t));
      }
    },
    c: function (K, g, D, c, R, e) {
      if (D.win) return;
      var s = K.ease.out((e - 0.08) / 0.44), z = 1 + 0.5 * M.pow(M.max(0, 1 - e / 0.07), 2), f = K.clamp((e - 0.1) / 0.3, 0, 1);
      g.save(); g.translate(c[0], c[1] - 0.1 * R); g.scale(R, R);
      if (e < 0.08) {
        g.scale(z, z); gem(K, g, 0.05); seam(g, R * z, SM);
      } else {
        half(K, g, D, R, true, s, D.ck); half(K, g, D, R, false, s, D.ck);
        g.fillStyle = K.tone(0.9);
        if (f > 0) {
          var y = 0.3 + 0.85 * f * f, x = D.cx;
          g.beginPath(); g.moveTo(x - 0.17, y - 0.02); g.lineTo(x + 0.2, y + 0.04 + 0.1 * (1 - f)); g.lineTo(x, y + 0.26); g.closePath(); g.fill();
        }
      }
      g.restore();
    },
    win: function (K, p, info) {
      K.spark({ x: p[0], y: p[1], n: 4, ink: "light", sp: [50, 150], r: [1, 1.9], life: [0.18, 0.1], grav: 260, seed: info.seed });
      if (info.streak < 10 || info.streak % 10) return;
      K.ring({ x: p[0], y: p[1], dur: 0.46, r0: 6, r1: 66, w0: 6, ink: "win", cov: 0.9 });
      K.spark({ x: p[0], y: p[1], n: 12, ink: "light", sp: [120, 270], r: [1.4, 3], life: [0.3, 0.2], grav: 320, seed: info.seed + 1 });
    },
    lossHit: function (K, p, info) {
      K.spark({ x: p[0], y: p[1], n: 12, ink: "loss", sp: [100, 360], r: [1, 2.8], life: [0.25, 0.3], grav: 1500, seed: info.seed });
      K.spark({ x: p[0], y: p[1], n: 3, ink: "light", sp: [60, 160], r: [1, 1.8], life: [0.2, 0.1], grav: 800, seed: info.seed + 3 });
      K.shake(M.max(info.dur, 0.42), 5);
    }
  });
})();
