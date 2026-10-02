/* art/dots/arrows.js: Up and Down. A win is an aqua arrow that shoots up and sticks; a loss is a heavy pink arrow that
   falls and drives into a line of ink, squashes, cracks and drips. A streak leaves no mark on the settled stamp (the
   owner's rule): the 30th straight win rests exactly like the first, and only the burst at every tenth win moves. */
(function () {
  "use strict";
  var M = Math, PI = M.PI, TAU = PI * 2;
  var AR = [0, -0.9, 0.8, -0.05, 0.3, -0.05, 0.3, 0.9, -0.3, 0.9, -0.3, -0.05, -0.8, -0.05];
  function arrow(g, w, up, se) {  // the arrow in R units at the origin, tip first; w: the hand-cut wobble; up false: a fat arrow, tip down at 0.72; se: a shorter shaft
    var i, s = up ? 1 : -1, f = up ? 1 : 1.12, y;
    g.beginPath();
    for (i = 0; i < 14; i += 2) { y = AR[i + 1]; if (se && (i == 6 || i == 8)) y = se; g.lineTo((AR[i] + w[i >> 1]) * f, s * (y + w[7 + (i >> 1)]) + (up ? 0 : -0.18)); }
    g.closePath();
  }
  function ramp(K, g, y0, y1, a, b) {  // coverage a at y0 falling to b at y1: dots shrink along the shaft
    var h = g.createLinearGradient(0, y0, 0, y1); h.addColorStop(0, K.tone(0.97)); h.addColorStop(a, K.tone(0.95)); h.addColorStop(1, K.tone(b)); return h;
  }
  function pose(K, g, D, c, R, e) {  // a win's rise: from below with a stretch, overshoots, sticks
    var t = K.clamp(e / 0.15, 0, 1), b = K.ease.back(t), q = (1 - t) * (1 - t), s = (0.55 + 0.45 * b) * R;
    g.translate(c[0], c[1] + (1 - b) * R * 0.9); g.rotate(D.t); g.scale(s * (1 - 0.2 * q), s * (1 + 0.4 * q));
  }
  T82ART.add("dots", "arrows", {
    name: "Up and Down",
    by: "Wins shoot up as aqua arrows (a gold burst on every tenth straight); losses are heavy pink arrows that drive into a line of ink, crack and drip.",
    reach: { w: 2.2, l: 3.4 },
    live: { w: 0.32, l: 0.85 },
    inks: { a: "win", c: "loss" },
    marks: function (K, D) {
      var r = K.rand(((D.gi + 1) * 2654435761) >>> 0), i;
      D.t = (r() - 0.5) * 0.24; D.w = []; for (i = 0; i < 14; i++) D.w.push((r() - 0.5) * 0.08);
      D.dx = (r() - 0.5) * 1.3; D.dl = 0.65 + r() * 0.35; D.k = r() < 0.5 ? 1 : -1; D.q = r();
    },
    a: function (K, g, D, c, R, e) {
      if (!D.win) return;
      g.save(); pose(K, g, D, c, R, e); g.fillStyle = ramp(K, g, -0.9, 0.9, 0.4, 0.86); arrow(g, D.w, true); g.fill();
      g.restore();
    },
    c: function (K, g, D, c, R, e) {
      if (D.win) return;
      var f = K.clamp(e / 0.075, 0, 1), sq = e < 0.075 ? 0 : e < 0.095 ? (e - 0.075) / 0.02 : e < 0.125 ? 1 : 1 - K.ease.back((e - 0.125) / 0.2);
      var bw = 0.9 * K.ease.out((e - 0.075) / 0.05), u = K.ease.out((e - 0.13) / 0.6), L = D.pitch * (D.lastRow ? 0.5 : 0.2) * D.dl * u, x, y, h = D.q, s;
      g.save(); g.translate(c[0], c[1]); g.scale(R, R); g.fillStyle = K.tone(0.96);
      g.save(); g.translate(0, -1.7 * (1 - f * f)); g.rotate(D.t); g.translate(0, 0.72); g.scale(1 + 0.3 * sq - 0.15 * (1 - f), 1 - 0.26 * sq + 0.4 * (1 - f)); g.translate(0, -0.72);
      g.fillStyle = ramp(K, g, -1.08, 0.72, 0.4, 0.88); arrow(g, D.w, false); g.fill(); g.fillStyle = K.tone(0.96);
      if (e > 0.1) {  // the head cracks
        g.globalCompositeOperation = "destination-out"; g.lineWidth = 0.17; g.lineJoin = "round";
        g.beginPath(); g.moveTo(-0.06, -0.2); g.lineTo(0.14, 0.05); g.lineTo(-0.02, 0.2 + 0.1 * D.q); g.lineTo(0.1, 0.5); g.stroke();
      }
      g.restore();
      if (bw > 0) {
        g.fillRect(-bw, 0.72, 2 * bw, 0.2 + 0.1 * sq);
        s = K.clamp((e - 0.075) / 0.12, 0, 1);  // two droplets hop off the line, land and are gone
        for (x = -1; x < 2; x += 2) { y = 0.7 - 0.28 * K.ease.out(s) - M.sin(s * PI) * 0.7; g.beginPath(); g.arc(x * (0.5 + (0.62 + 0.12 * h) * K.ease.out(s)), y, 0.17 * (1 - s * s * s), 0, TAU); g.fill(); }
      }
      if (u > 0) {  // the run: a drip off the line
        x = D.dx; y = 0.9; L /= R;
        g.beginPath(); g.moveTo(x - 0.17, y - 0.05); g.quadraticCurveTo(x - 0.06, y + L / 2, x, y + L); g.quadraticCurveTo(x + 0.06, y + L / 2, x + 0.17, y - 0.05); g.fill();
        g.beginPath(); g.arc(x, y + L, 0.2 * (0.6 + 0.4 * u), 0, TAU); g.fill();
      }
      g.restore();
    },
    win: function (K, p, info) {  // sparks fly up; every tenth straight, a gold ring
      K.spark({ x: p[0], y: p[1], n: 4, ink: "win", sp: [50, 140], r: [1, 2], life: [0.2, 0.12], grav: -120, seed: info.seed });
      if (info.streak < 10 || info.streak % 10) return;
      K.ring({ x: p[0], y: p[1], dur: 0.5, r0: 6, r1: 66, w0: 6, ink: "gold", cov: 0.9 });
      K.spark({ x: p[0], y: p[1], n: 14, ink: "gold", sp: [110, 270], r: [1.3, 2.8], life: [0.3, 0.25], grav: -90, seed: info.seed + 1 });
    },
    lossHit: function (K, p, info) {  // past the 14th loss: it lands with a thud and ink flies
      K.ring({ x: p[0], y: p[1], dur: 0.34, r0: 8, r1: 58, w0: 6, ink: "loss", cov: 0.85 });
      K.spark({ x: p[0], y: p[1], n: 10, ink: "loss", sp: [90, 300], r: [1, 2.8], life: [0.25, 0.3], grav: 1500, seed: info.seed });
      K.shake(M.max(info.dur, 0.42), 5);
    }
  });
})();
