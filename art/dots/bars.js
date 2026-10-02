/* art/dots/bars.js: Waveform. Every game is a little audio waveform of three capsule bars on the ledger's center line. A
   win is an aqua burst of sound (the bars jump on twos, then hold tall; from 10 straight the middle bar prints gold, from
   20 the right one too, at 30 all three). A loss cuts the sound: pegged pink bars collapse to flat stubs and one of them drips. A
   season of them reads as the waveform of the year. */
(function () {
  "use strict";
  var M = Math, PI = M.PI, TAU = PI * 2, X = [-0.82, 0, 0.82], BW = 0.27, STUB = [0.26, 0.5, 0.2];
  function bar(g, x, y0, y1, w, a, b) {  // one capsule between y0 and y1; a, b round its top and bottom end
    if (y1 - y0 <= 2 * w) { g.moveTo(x + w, (y0 + y1) / 2); g.ellipse(x, (y0 + y1) / 2, w, M.max(0.3, (y1 - y0) / 2), 0, 0, TAU); return; }
    g.moveTo(x - w, y1 - (b ? w : 0)); g.lineTo(x - w, y0 + (a ? w : 0));
    if (a) g.arc(x, y0 + w, w, PI, 0); else g.lineTo(x + w, y0);
    g.lineTo(x + w, y1 - (b ? w : 0));
    if (b) g.arc(x, y1 - w, w, 0, PI); else g.lineTo(x - w, y1);
    g.closePath();
  }
  function hash(n) { var v = M.sin(n * 12.9898) * 43758.5453; return v - M.floor(v); }
  function jump(D, e, i) {  // a win's bar height (R): it jumps about on twos for a quarter second, then holds
    var s = M.floor(e / 0.04);
    return s >= 6 ? D.h[i] : M.min(1.3, D.h[i] * (s ? 1 + (hash(D.gi * 7 + s * 3 + i) - 0.55) * 1.1 * (1 - s / 6) : 0.25));
  }
  function win(K, g, D, c, R, e, gold) {  // gold 0 prints the aqua bars, 1 the gold ones (the middle bar first, then the right, then the left)
    var n = D.streak >= 30 ? 3 : D.streak >= 20 ? 2 : D.streak >= 10 ? 1 : 0, i, h, f = g.createLinearGradient(0, c[1] - R * 1.25, 0, c[1] + R * 1.25);
    f.addColorStop(0, K.tone(0.66)); f.addColorStop(0.3, K.tone(0.95)); f.addColorStop(0.7, K.tone(0.95)); f.addColorStop(1, K.tone(0.66));  // the tips thin to dots
    g.fillStyle = f; g.beginPath();
    for (i = 0; i < 3; i++) {
      h = jump(D, e, i) * R;
      if (((i === 1 ? 0 : i ? 1 : 2) < n) === !!gold) bar(g, c[0] + X[i] * R, c[1] - h, c[1] + h, BW * R, 1, 1);
    }
    g.fill();
  }
  T82ART.add("dots", "bars", {
    name: "Waveform",
    by: "Wins are bursts of sound, three aqua bars jumping tall (gold on a streak); a loss cuts the sound: the bars collapse to a flat pink stub that drips.",
    reach: { w: 1.6, l: 2.7 },
    live: { w: 0.32, l: 0.9 },
    inks: { a: "win", b: "gold", c: "loss" },
    marks: function (K, D) {
      var r = K.rand(((D.gi + 1) * 2654435761) >>> 0);
      D.h = [0.4 + r() * 0.45, 0.85 + r() * 0.3, 0.4 + r() * 0.45]; D.k = (r() * 3) | 0; D.dl = 0.65 + r() * 0.35;
    },
    a: function (K, g, D, c, R, e) { if (D.win) win(K, g, D, c, R, e, 0); },
    b: function (K, g, D, c, R, e) { if (D.win && D.streak >= 10) win(K, g, D, c, R, e, 1); },
    c: function (K, g, D, c, R, e) {
      if (D.win) return;
      var i, h, f = K.clamp((e - 0.04) / 0.12, 0, 1), u = K.ease.out((e - 0.18) / 0.6), L = D.pitch * (D.lastRow ? 0.42 : 0.16) * D.dl * u, w = BW * R, x = c[0] + X[D.k] * R, y, s;
      f *= f;
      s = 1 + 0.25 * M.sin(K.clamp((e - 0.12) / 0.12, 0, 1) * PI);
      g.fillStyle = K.tone(0.96); g.beginPath();
      for (i = 0; i < 3; i++) { h = (D.h[i] + (STUB[i] - D.h[i]) * f) * R; bar(g, c[0] + X[i] * R, c[1] - h, c[1] + h, w * s, 1, 1); }
      g.fill();
      if (u > 0) {
        y = c[1] + STUB[D.k] * R + w; s = R * 0.15; g.fillStyle = K.tone(0.94);
        g.beginPath(); g.moveTo(x - s, y - 2); g.quadraticCurveTo(x - s * 0.4, y + L * 0.5, x, y + L); g.quadraticCurveTo(x + s * 0.4, y + L * 0.5, x + s, y - 2); g.fill();
        g.beginPath(); g.arc(x, y + L, R * 0.2 * (0.6 + 0.4 * u), 0, TAU); g.fill();
      }
    },
    win: function (K, p, info) {  // the burst: a few sparks off the top; every tenth straight a gold ring
      K.spark({ x: p[0], y: p[1] - 8, n: 4, ink: "win", sp: [50, 150], r: [1, 2], life: [0.16, 0.1], grav: 300, seed: info.seed });
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
