/* art/dots/tally.js: Tally. A win is an aqua tally stroke drawn top to bottom; every fifth straight win is the gate
   slash through the one before it, and a streak of 10, 20, 30 is circled in gold once, twice, three times. A loss is
   a stroke that topples onto its side and snaps in two, chips hopping off the break. */
(function () {
  "use strict";
  var PI = Math.PI, M = Math, TAU = PI * 2;
  function rib(g, x0, y0, x1, y1, a, b) {  // a pencil stroke: round caps, width a at the start, b at the end
    var q = M.atan2(y1 - y0, x1 - x0) + PI / 2, cx = M.cos(q), cy = M.sin(q);
    g.moveTo(x0 + cx * a, y0 + cy * a); g.lineTo(x1 + cx * b, y1 + cy * b); g.arc(x1, y1, b, q, q - PI, true);
    g.lineTo(x0 - cx * a, y0 - cy * a); g.arc(x0, y0, a, q + PI, q, true);
  }
  T82ART.add("dots", "tally", {
    name: "Tally",
    by: "Wins are tally strokes, every fifth straight is slashed and tens are circled in gold; losses topple onto their side and snap.",
    reach: { w: 3.7, l: 2 },
    live: { w: 0.32, l: 0.5 },
    inks: { a: "win", b: "gold", c: "loss" },
    marks: function (K, D) {
      var r = K.rand(((D.gi + 1) * 2654435761) >>> 0);
      D.t = (r() - 0.5) * 0.16; D.h = 0.9 + r() * 0.2; D.k = r() < 0.5 ? 1 : -1; D.a = r() * TAU;
      D.q = [r(), r(), r()];
    },
    a: function (K, g, D, c, R, e) {
      if (!D.win) return;
      var u = K.ease.out(e / 0.1), h = R * D.h, s = D.streak % 5 === 0, x0 = c[0] < D.pitch ? -1.2 : -3, k = K.ease.out((e - 0.06) / 0.12);
      g.fillStyle = K.tone(0.95);
      g.save(); g.translate(c[0], c[1]); g.rotate(D.t); g.beginPath();
      rib(g, 0, -h, 0, -h + 2 * h * u, R * 0.32, R * 0.25); g.fill(); g.restore();
      if (s && k > 0) {  // the gate: the slash runs up through the stroke before it
        g.beginPath(); x0 *= R; rib(g, c[0] + x0, c[1] + R, c[0] + x0 + (R * 1.1 - x0) * k, c[1] + R - 2 * R * k, R * 0.22, R * 0.22); g.fill();
      }
    },
    b: function (K, g, D, c, R, e) {
      if (!D.win || D.streak < 10 || e < 0.1) return;
      var n = D.streak >= 30 ? 3 : D.streak >= 20 ? 2 : 1, k = K.ease.out((e - 0.1) / 0.16), i;
      g.strokeStyle = K.tone(0.95); g.lineWidth = R * 0.17;
      for (i = 0; i < n; i++) {  // a pen circling it again and again: loops that cross, not rings
        g.beginPath(); g.ellipse(c[0] + (i - 1) * R * 0.05, c[1], R * 0.92, R * 1.3, (i - 1) * 0.3 + 0.1, D.a + i * 2, D.a + i * 2 + TAU * 1.06 * k); g.stroke();
      }
    },
    c: function (K, g, D, c, R, e) {
      if (D.win) return;
      var p = K.clamp(e / 0.13, 0, 1), f = p * p, q = K.clamp((e - 0.13) / 0.2, 0, 1), y = c[1] + R * 0.72, i, w, z, d = D.k;
      g.fillStyle = K.tone(0.96); g.beginPath();
      if (e < 0.13) {  // the stroke topples, pivoting on its foot, and drops to the floor
        g.save(); g.translate(c[0], c[1] + R * 0.72 * f); g.rotate(d * f * PI / 2 + D.t * (1 - f)); rib(g, 0, -R * 0.95, 0, R * 0.95, R * 0.32, R * 0.25); g.restore(); g.fill();
        return;
      }
      w = M.sin(q * PI) * R * 0.4;  // snapped: the left half lies, the right half hops and tips
      rib(g, c[0] - R * 1.05, y, c[0] - R * 0.46, y, R * 0.3, R * 0.25);
      g.save(); g.translate(c[0] + R * 0.34, y - w); g.rotate(-(0.22 + 0.2 * D.q[2]) * q); rib(g, 0, 0, R * 0.7, 0, R * 0.25, R * 0.3); g.restore(); g.fill();
      for (i = 0; i < 2; i++) {  // chips off the break, left on the floor
        z = M.sin(q * PI) * R * (0.6 + D.q[i] * 0.4);
        g.beginPath(); g.arc(c[0] + R * (-0.3 + i * 0.5) * q, y + R * (0.46 + D.q[i] * 0.1) * q - z, R * (0.12 + D.q[i] * 0.04), 0, TAU); g.fill();
      }
    },
    win: function (K, p, info) {  // chalk dust; the fifth straight and every tenth ring the board
      K.spark({ x: p[0], y: p[1], n: 3, ink: "win", sp: [50, 130], r: [1, 2], life: [0.18, 0.1], grav: 200, seed: info.seed });
      if (info.streak < 10 || info.streak % 10) return;
      K.ring({ x: p[0], y: p[1], dur: 0.5, r0: 6, r1: 64, w0: 6, ink: "gold", cov: 0.9 });
      K.spark({ x: p[0], y: p[1], n: 12, ink: "gold", sp: [110, 260], r: [1.3, 2.8], life: [0.3, 0.25], grav: 320, seed: info.seed + 1 });
    },
    lossHit: function (K, p, info) {  // past the 14th loss: the stroke thuds and chips fly
      K.spark({ x: p[0], y: p[1], n: 10, ink: "loss", sp: [90, 300], r: [1, 2.6], life: [0.25, 0.3], grav: 1500, seed: info.seed });
      K.shake(M.max(info.dur, 0.42), 4);
    }
  });
})();
