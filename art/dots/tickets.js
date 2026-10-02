/* art/dots/tickets.js: Admit One. A win is an aqua ticket flicked in and punched; a streak fills the punch with gold and bands the
   foot (10), the head too (20), and at 30 the whole ticket prints gold. A loss is the ticket in pink ripped in half. */
(function () {
  "use strict";
  var M = Math, PI = M.PI, TAU = PI * 2, W = 1.05, H = 0.66, N = 0.27, TY = [-H, -0.4, -0.05, 0.3, H];
  function tk(g, hole) {  // the ticket in R units, a notch in each side; hole: x of a punch (fill evenodd)
    g.moveTo(-W, -H); g.lineTo(W, -H); g.lineTo(W, -N); g.arc(W, 0, N, -PI / 2, PI / 2, true); g.lineTo(W, H); g.lineTo(-W, H);
    g.lineTo(-W, N); g.arc(-W, 0, N, PI / 2, -PI / 2, true); g.closePath();
    if (hole) { g.moveTo(hole + 0.3, 0); g.arc(hole, 0, 0.3, 0, TAU); }
  }
  function half(g, T, s) {  // one half of the torn ticket (s -1 left, 1 right); T: the tear's x at each of TY
    var i;
    g.moveTo(T[0], -H); g.lineTo(s * W, -H); g.lineTo(s * W, -N); g.arc(s * W, 0, N, -PI / 2, PI / 2, s > 0); g.lineTo(s * W, H);
    for (i = 4; i > 0; i--) g.lineTo(T[i], TY[i]);
    g.closePath();
  }
  function put(g, c, R, x, y, a, sx, sy) { g.translate(c[0] + R * x, c[1] + R * y); g.rotate(a); g.scale(R * sx, R * sy); }
  function lv(D) { return D.streak >= 30 ? 3 : D.streak >= 20 ? 2 : D.streak >= 10 ? 1 : 0; }
  function pose(K, g, D, c, R, e) {  // the flick: in from the upper right spinning, a slam, a squash
    var q = 1 - K.clamp(e / 0.09, 0, 1), m = M.sin(K.clamp((e - 0.09) / 0.08, 0, 1) * PI) * 0.13;
    q *= q; put(g, c, R, 1.3 * q, 0.1 - 1.1 * q, D.t + 1.2 * q * D.k, 1 + 0.2 * q + m, 1 + 0.2 * q - m);
  }
  T82ART.add("dots", "tickets", {
    name: "Admit One",
    by: "Wins are aqua tickets flicked in and punched (gold bands on a streak, a golden ticket at 30); a loss is the ticket ripped in half, the pink halves tilting apart, ink running from the tear.",
    reach: { w: 2.9, l: 3.2 },
    live: { w: 0.32, l: 0.9 },
    inks: { a: "win", b: "gold", c: "loss" },
    marks: function (K, D) {
      var r = K.rand(((D.gi + 1) * 2654435761) >>> 0), i;
      D.t = (r() - 0.5) * 0.2; D.k = r() < 0.5 ? -1 : 1; D.dl = 0.65 + r() * 0.35; D.z = [];
      for (i = 0; i < 5; i++) D.z.push((i % 2 ? -0.12 : 0.12) * (i && i < 4 ? 1 : 0.4) + (r() - 0.5) * 0.14);
    },
    a: function (K, g, D, c, R, e) {
      if (!D.win) return;
      var a = e - 0.1, v = lv(D), x, y;
      g.save(); pose(K, g, D, c, R, e); g.fillStyle = K.tone(0.95);
      if (v < 3) {
        g.beginPath(); tk(g, e < 0.1 ? 0 : 0.36); g.fill("evenodd");
        if (v) {  // room for the gold bands
          g.beginPath(); tk(g, 0); g.clip(); g.globalCompositeOperation = "destination-out"; g.fillStyle = K.tone(1);
          g.fillRect(-W, H - 0.38, 2 * W, 0.4); if (v > 1) g.fillRect(-W, -H - 0.02, 2 * W, 0.4);
        }
      } else if (a > 0) { g.beginPath(); g.arc(0.36, 0, 0.22, 0, TAU); g.fill(); }  // the golden ticket keeps an aqua punch
      g.restore();
      if (a > 0 && a < 0.14) {  // the chad
        x = 0.36 * M.cos(D.t) + 4 * a; y = 0.1 + 0.36 * M.sin(D.t) - 3 * a + 14 * a * a;
        g.fillStyle = K.tone(0.95); g.beginPath(); g.arc(c[0] + R * x, c[1] + R * y, R * 0.3 * (1 - a / 0.14), 0, TAU); g.fill();
      }
    },
    b: function (K, g, D, c, R, e) {
      var v = lv(D);
      if (!D.win || !v) return;
      g.save(); pose(K, g, D, c, R, e); g.fillStyle = K.tone(0.92); g.beginPath();
      if (v > 2) { tk(g, e < 0.1 ? 0 : 0.36); g.fill("evenodd"); }
      else {
        g.arc(0.36, 0, 0.27 * K.ease.back((e - 0.1) / 0.1), 0, TAU); g.rect(-W, H - 0.32, 2 * W, 0.32); if (v > 1) g.rect(-W, -H, 2 * W, 0.32);
        g.fill();
      }
      g.restore();
    },
    c: function (K, g, D, c, R, e) {
      if (D.win) return;
      var s = K.ease.back((e - 0.05) / 0.14), f = K.ease.out((e - 0.1) / 0.2), u = K.ease.out((e - 0.2) / 0.6), L, i, t, a = D.z, x, y;
      g.fillStyle = K.tone(0.95);
      if (e < 0.05) {  // the whole ticket slams down, pink
        g.save(); pose(K, g, D, c, R, e * 1.8); g.beginPath(); tk(g, 0); g.fill(); g.restore(); return;
      }
      for (i = 0; i < 2; i++) {
        t = i ? 0.55 : -0.5;
        g.save(); put(g, c, R, t + (i ? 0.1 : -0.12) * s, 0.1 + (i ? -0.06 : 0.14) * f - 0.1 * M.sin(K.clamp((e - 0.05) / 0.12, 0, 1) * PI) * i, (i ? 0.28 : -0.3) * s, 0.94, 0.94);
        g.translate(-t, 0); g.beginPath(); half(g, a, i ? 1 : -1); g.fill(); g.restore();
      }
      for (i = 0; i < 3; i++) {  // scraps off the tear
        t = e - 0.05 - 0.01 * i; if (t < 0 || t > 0.3) continue;
        g.save(); g.translate(c[0] + R * (i - 1) * 3.2 * t, c[1] + R * (0.1 - 2.2 * t + 14 * t * t)); g.rotate(t * 14 * (i - 1)); g.fillRect(-R * 0.1, -R * 0.1, R * 0.2, R * 0.2); g.restore();
      }
      if (u > 0) {  // ink runs from the foot of the left half
        L = D.pitch * (D.lastRow ? 0.4 : 0.14) * D.dl * u; x = c[0] + R * (a[4] - 0.92); y = c[1] + R * 0.88 - 1; t = R * 0.15;
        g.beginPath(); g.moveTo(x - t, y); g.quadraticCurveTo(x - t / 2, y + L / 2, x, y + L); g.quadraticCurveTo(x + t / 2, y + L / 2, x + t, y); g.fill();
        g.beginPath(); g.arc(x, y + L, R * 0.19 * (0.6 + 0.4 * u), 0, TAU); g.fill();
      }
    },
    win: function (K, p, info) {  // a thump of dust; every tenth straight a gold ring
      K.spark({ x: p[0], y: p[1], n: 4, ink: "win", sp: [50, 140], r: [1, 2], life: [0.18, 0.1], grav: 300, seed: info.seed });
      if (info.streak < 10 || info.streak % 10) return;
      K.ring({ x: p[0], y: p[1], dur: 0.5, r0: 6, r1: 64, w0: 6, ink: "gold", cov: 0.9 });
      K.spark({ x: p[0], y: p[1], n: 12, ink: "gold", sp: [110, 260], r: [1.3, 2.8], life: [0.3, 0.25], grav: 320, seed: info.seed + 1 });
    },
    lossHit: function (K, p, info) {  // past the 14th loss: the rip
      K.ring({ x: p[0], y: p[1], dur: 0.34, r0: 8, r1: 56, w0: 6, ink: "loss", cov: 0.85 });
      K.spark({ x: p[0], y: p[1], n: 8, ink: "loss", sp: [90, 280], r: [1, 2.6], life: [0.25, 0.3], grav: 1500, seed: info.seed });
      K.shake(M.max(info.dur, 0.42), 5);
    }
  });
})();
