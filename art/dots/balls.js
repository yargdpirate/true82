/* art/dots/balls.js: Ball and Brick (a pilot, art/CONTRACT.md). Wins bounce in as tiny basketballs (seams knocked
   out), losses thud down as cracked, dripping bricks: shape AND ink differ at 6 px. Streaks print in gold. */
(function () {
  "use strict";
  var TAU = Math.PI * 2, PI = Math.PI, M = Math;
  function seams(g, r, a) {  // at (0, 0), turned by a
    var c = M.cos(a), s = M.sin(a), d = r * 1.45, q = r * 1.05, u = M.cos(a - 0.75) * q, v = M.sin(a - 0.75) * q;
    g.beginPath(); g.moveTo(-c * r, -s * r); g.lineTo(c * r, s * r); g.moveTo(s * r, -c * r); g.lineTo(-s * r, c * r);
    g.moveTo(u - c * d, v - s * d); g.arc(-c * d, -s * d, q, a - 0.75, a + 0.75);
    g.moveTo(c * d - u, s * d - v); g.arc(c * d, s * d, q, a + PI - 0.75, a + PI + 0.75);
    g.stroke();
  }
  function hop(e) {  // a win's drop and bounce: [dy (R), sx, sy]; still by 0.25 s (live is 0.3)
    var k;
    if (e >= 0.25) return [0, 1, 1];
    if (e < 0.07) { k = e / 0.07; return [-0.55 * (1 - k * k), 0.94, 1.08]; }
    if (e < 0.12) { k = M.sin(PI * (e - 0.07) / 0.05); return [0.22 * k, 1 + 0.2 * k, 1 - 0.22 * k]; }
    if (e < 0.2) { k = (e - 0.12) / 0.08; return [-0.64 * k * (1 - k), 1, 1]; }
    k = M.sin(PI * (e - 0.2) / 0.05); return [0.08 * k, 1 + 0.07 * k, 1 - 0.08 * k];
  }
  function onBall(K, g, D, c, R, e) {  // g onto the ball, traced; -> the seams' turn
    var h = hop(e);
    g.translate(c[0], c[1] + h[0] * R); g.scale(h[1], h[2]);
    g.beginPath(); g.arc(0, 0, R * 0.98, 0, TAU);
    return D.rot + 2.4 * (1 - K.ease.out(e / 0.25));
  }

  T82ART.add("dots", "balls", {
    name: "Ball and Brick",
    by: "Wins bounce in as tiny basketballs, losses thud down as cracked, dripping bricks; streaks go gold.",
    reach: { w: 1.7, l: 2.5 },
    live: { w: 0.3, l: 1.0 },
    inks: { a: "win", b: "gold", c: "loss" },
    marks: function (K, D) {
      var r = K.rand(((D.gi + 1) * 2654435761) >>> 0);
      D.rot = r() * PI;
      if (D.win) return;
      D.side = r() < 0.5 ? -1 : 1; D.tilt = (r() - 0.5) * 0.3; D.chip = (r() * 4) | 0;
      D.ck = [(r() - 0.5) * 1.2, 0.2 + r() * 0.3, -0.15 - r() * 0.3];  // the crack
      D.dx = (r() - 0.5) * 1.2; D.dl = 0.65 + r() * 0.35;  // the drip
      D.cr = [[-1.4 - r() * 0.25, 0.45 + r() * 0.3, 0.17], [1.4 + r() * 0.25, 0.45 + r() * 0.3, 0.15]];
    },
    a: function (K, g, D, c, R, e) {
      if (!D.win) return;
      g.save(); var a = onBall(K, g, D, c, R, e);
      g.fillStyle = K.tone(0.95); g.fill();
      g.globalCompositeOperation = "destination-out"; g.strokeStyle = K.tone(1); g.lineWidth = M.max(0.8, R * 0.14);
      seams(g, R * 0.98, a); g.restore();
    },
    b: function (K, g, D, c, R, e) {  // gold: a rim (10), seams (20), the ball (30)
      if (!D.win || D.streak < 10) return;
      var t = K.clamp((e - 0.08) / 0.14, 0, 1), a;
      if (!t) return;
      g.save(); g.strokeStyle = K.tone(0.92); g.lineWidth = R * (D.streak >= 20 ? 0.2 : 0.15);
      g.beginPath(); g.arc(c[0], c[1], 1.27 * R * M.min(1, 0.8 + 0.2 * K.ease.back(t)), 0, TAU); g.stroke();
      if (D.streak >= 20) {
        a = onBall(K, g, D, c, R, e); g.clip();
        if (D.streak >= 30) { g.fillStyle = K.tone(0.55); g.fill(); }
        g.lineWidth = M.max(0.9, R * 0.17); seams(g, R * 0.98, a);
      }
      g.restore();
    },
    c: function (K, g, D, c, R, e) {  // the brick, crumbs, drip
      if (D.win) return;
      var k = e < 0.08 ? 1 - e * e / 0.0064 : 0, q = e < 0.08 ? 0 : M.pow(M.max(0, 1 - (e - 0.08) / 0.12), 2);
      var x = c[0], y = c[1] + (0.19 * q - 1.25 * k) * R, w = R * 1.1 * (1 + 0.24 * q - 0.05 * k), h = R * 0.62 * (1 - 0.3 * q + 0.05 * k);
      var t = D.tilt + D.side * 0.6 * k, f = K.ease.out((e - 0.08) / 0.12), gl = K.ease.out((e - 0.14) / 0.75), i, p, s;
      g.save(); g.translate(x, y); g.rotate(t);
      g.fillStyle = K.tone(0.95); g.fillRect(-w, -h, 2 * w, 2 * h);
      if (!k) {
        g.globalCompositeOperation = "destination-out"; g.fillStyle = g.strokeStyle = K.tone(1);
        s = [D.chip & 1 ? 1 : -1, D.chip & 2 ? 1 : -1];
        g.beginPath(); g.moveTo(s[0] * (w + 1), s[1] * (h + 1)); g.lineTo(s[0] * (w - 0.55 * R), s[1] * (h + 1)); g.lineTo(s[0] * (w + 1), s[1] * (h - 0.45 * R)); g.fill();
        p = D.ck; g.lineWidth = M.max(1, R * 0.16); g.lineJoin = "round";
        g.beginPath(); g.moveTo(p[0] * R, -h - 1); g.lineTo((p[0] + p[1]) * R, -h * 0.2); g.lineTo((p[0] + p[1] + p[2]) * R, h * 0.5); g.stroke();
      }
      g.restore();
      if (k) return;
      g.fillStyle = K.tone(0.96);
      for (i = 0; i < 2; i++) {  // crumbs hop off its corners
        p = D.cr[i]; s = (i ? 0.8 : -0.8) * w;
        g.beginPath(); g.arc(x + s + (p[0] * R - s) * f, y + h + (c[1] + p[1] * R - y - h) * f - M.sin(f * PI) * R * 0.6, p[2] * R, 0, TAU); g.fill();
      }
      if (gl <= 0) return;
      var bx = x + D.dx * R * M.cos(t) - h * M.sin(t), by = y + D.dx * R * M.sin(t) + h * M.cos(t) - 0.5;
      var len = D.pitch * (D.lastRow ? 0.32 : 0.26) * D.dl * gl, dw = R * 0.3;
      g.beginPath(); g.moveTo(bx - dw, by); g.quadraticCurveTo(bx - dw * 0.3, by + len * 0.6, bx, by + len); g.quadraticCurveTo(bx + dw * 0.3, by + len * 0.6, bx + dw, by); g.fill();
      g.beginPath(); g.arc(bx, by + len, R * 0.18 * (0.5 + 0.5 * gl), 0, TAU); g.fill();
    },
    win: function (K, p, info) {  // every tenth straight: a gold burst
      K.spark({ x: p[0], y: p[1], n: 4, ink: "win", sp: [50, 140], r: [1, 2], life: [0.18, 0.1], grav: 300, seed: info.seed });
      if (info.streak < 10 || info.streak % 10) return;
      K.ring({ x: p[0], y: p[1], dur: 0.5, r0: 6, r1: 70, w0: 7, ink: "gold", cov: 0.95 });
      K.spark({ x: p[0], y: p[1], n: 14, ink: "gold", sp: [120, 280], r: [1.4, 3], life: [0.3, 0.25], grav: 340, seed: info.seed + 1 });
    },
    lossHit: function (K, p, info) {  // past the 14th loss: a thud, crumbs
      K.ring({ x: p[0], y: p[1], dur: 0.36, r0: 8, r1: 64, w0: 7, ink: "loss", cov: 0.9 });
      K.spark({ x: p[0], y: p[1], n: 10, ink: "loss", sp: [90, 300], r: [1, 2.8], life: [0.25, 0.3], grav: 1500, seed: info.seed });
      K.shake(M.max(info.dur, 0.42), 5);
    }
  });
})();
