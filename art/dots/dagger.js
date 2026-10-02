/* art/dots/dagger.js: Footnotes. The printer's two marks, the reel's two inks: a win is the dagger, a real one in the
   win aqua (a blade that tapers to its point, a crossguard, a grip and a pommel, laid on a slant so it never reads as a
   cross): it twists down onto the page and a gold glint runs up the blade. A loss is the asterisk in the loss pink: it
   spins in, lands and bleeds one drip. Streaks get only the moment (a gold ring and sparks every tenth straight); a
   settled stamp is the same mark whatever the run (the owner, 2026-10-02). */
(function () {
  "use strict";
  var PI = Math.PI, M = Math, TAU = PI * 2, SLANT = 0.62;   // the dagger's lean: its point to the upper right
  function rib(g, x0, y0, x1, y1, a, b) {  // an arm: round caps, width a at the start, b at the tip
    var q = M.atan2(y1 - y0, x1 - x0) + PI / 2, cx = M.cos(q), cy = M.sin(q);
    g.moveTo(x0 + cx * a, y0 + cy * a); g.lineTo(x1 + cx * b, y1 + cy * b); g.arc(x1, y1, b, q, q - PI, true);
    g.lineTo(x0 - cx * a, y0 - cy * a); g.arc(x0, y0, a, q + PI, q, true);
  }
  function dagger(g, R) {  // point up, in units of R, centered on its length: blade, guard (its tips bent toward the point), grip, pommel
    g.moveTo(0, -1.42 * R);
    g.quadraticCurveTo(0.2 * R, -1.05 * R, 0.3 * R, -0.5 * R); g.lineTo(0.31 * R, 0.24 * R); g.lineTo(-0.31 * R, 0.24 * R);
    g.lineTo(-0.3 * R, -0.5 * R); g.quadraticCurveTo(-0.2 * R, -1.05 * R, 0, -1.42 * R); g.closePath();
    g.moveTo(-0.74 * R, 0.02 * R); g.quadraticCurveTo(0, 0.3 * R, 0.74 * R, 0.02 * R); g.lineTo(0.7 * R, 0.3 * R);
    g.quadraticCurveTo(0, 0.6 * R, -0.7 * R, 0.3 * R); g.closePath();
    g.rect(-0.15 * R, 0.4 * R, 0.3 * R, 0.62 * R);
    g.moveTo(0.25 * R, 1.13 * R); g.arc(0, 1.13 * R, 0.25 * R, 0, TAU);
  }
  T82ART.add("dots", "dagger", {
    name: "Footnotes",
    by: "Wins are aqua daggers that twist down onto the page with a gold glint up the blade; losses are pink asterisks that spin in and bleed a drip.",
    reach: { w: 2.1, l: 2.4 },
    live: { w: 0.32, l: 0.5 },
    inks: { a: "win", b: "gold", c: "loss" },
    marks: function (K, D) {
      var r = K.rand(((D.gi + 1) * 2654435761) >>> 0);
      D.t = (r() - 0.5) * 0.12; D.q = r() < 0.5 ? 1 : -1; D.r = r() * 0.3; D.w = 0.35 + 0.25 * r();
    },
    a: function (K, g, D, c, R, e) {  // the dagger: it twists down from a little larger and settles on its slant by 0.13 s
      if (!D.win) return;
      var p = K.ease.out(e / 0.13), s = 1.08 * (1 + 0.26 * (1 - p));
      g.save(); g.translate(c[0], c[1]); g.rotate(SLANT + D.t - D.q * 0.7 * (1 - p)); g.scale(s, s);
      g.fillStyle = K.tone(0.95); g.beginPath(); dagger(g, R); g.fill(); g.restore();
    },
    b: function (K, g, D, c, R, e) {  // the glint: a four point star that runs up the blade to the point and is gone by 0.25 s
      if (!D.win || e < 0.1 || e > 0.25) return;
      var u = (e - 0.1) / 0.15, k = M.sin(u * PI), a = SLANT + D.t, d = R * (-0.1 - 1.15 * u), x = c[0] + M.sin(a) * -d, y = c[1] + M.cos(a) * d, L = R * 0.62 * k, w = R * 0.12 * k;
      g.fillStyle = K.tone(0.92); g.beginPath();
      g.moveTo(x, y - L); g.lineTo(x + w, y - w); g.lineTo(x + L, y); g.lineTo(x + w, y + w);
      g.lineTo(x, y + L); g.lineTo(x - w, y + w); g.lineTo(x - L, y); g.lineTo(x - w, y - w); g.closePath(); g.fill();
    },
    c: function (K, g, D, c, R, e) {  // the asterisk: spins in from larger and lands by 0.12 s, then one drip runs off its lowest arm
      if (D.win) return;
      var p = K.ease.out(e / 0.12), s = 1 + 0.45 * (1 - p), sp = D.r + D.q * 1.4 * (1 - p), k, a, x, y, dl;
      g.fillStyle = K.tone(0.95); g.beginPath();
      for (k = 0; k < 6; k++) {
        a = -PI / 2 + sp + k * PI / 3;
        rib(g, c[0] + M.cos(a) * R * 0.08, c[1] + M.sin(a) * R * 0.08, c[0] + M.cos(a) * R * 0.86 * s, c[1] + M.sin(a) * R * 0.86 * s, R * 0.13 * s, R * 0.2 * s);
      }
      g.fill();
      if (e < 0.1) return;
      a = PI / 2 + D.r; x = c[0] + M.cos(a) * R * 0.86; y = c[1] + M.sin(a) * R * 0.86;   // the arm that points down
      dl = R * D.w * K.ease.out((e - 0.1) / 0.32);
      g.beginPath(); g.moveTo(x - R * 0.12, y); g.quadraticCurveTo(x - R * 0.06, y + dl * 0.7, x, y + dl);
      g.quadraticCurveTo(x + R * 0.06, y + dl * 0.7, x + R * 0.12, y); g.closePath(); g.fill();
      g.beginPath(); g.arc(x, y + dl, R * 0.13, 0, TAU); g.fill();   // the bead at its foot
    },
    win: function (K, p, info) {  // a flick of aqua; every tenth straight, a gold ring and sparks (the moment only)
      K.spark({ x: p[0], y: p[1], n: 4, ink: "win", sp: [50, 140], r: [1, 2], life: [0.2, 0.12], grav: -40, seed: info.seed });
      if (info.streak < 10 || info.streak % 10) return;
      K.ring({ x: p[0], y: p[1], dur: 0.5, r0: 6, r1: 64, w0: 6, ink: "gold", cov: 0.9 });
      K.spark({ x: p[0], y: p[1], n: 12, ink: "gold", sp: [110, 260], r: [1.3, 2.8], life: [0.3, 0.25], grav: 60, seed: info.seed + 1 });
    },
    lossHit: function (K, p, info) {  // past the 14th loss: the asterisk lands and ink flies
      K.spark({ x: p[0], y: p[1], n: 10, ink: "loss", sp: [90, 300], r: [1, 2.6], life: [0.25, 0.3], grav: 1500, seed: info.seed });
      K.shake(M.max(info.dur, 0.42), 4);
    }
  });
})();
