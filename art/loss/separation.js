/* art/loss/separation.js: Separation. The L is printed in three drums and the drums arrive as three plates, from three
   directions: pink from the left, aqua from the top, violet from the lower right. They slam to a near-lock (the L goes
   white-hot where all three overlap), hold a beat, then miss: every drum drifts off its own way, the three Ls fanning
   out with their overprints (lilac, candy, ice) between them, and fly off the way they came.
   Plates: three screened Ls (loss 0.95, pop 0.7, night 0.6), each on its own plate (their starve never lines up).
   Beats: land 0.065 / 0.08 / 0.095 s, lock and squash to 0.17 s, drift (the tail), the exit 0.1 to 0.35 s.
   Stretches with E.dur: the drift. */
(function () {
  "use strict";
  var W = 160, H = 200, LX = 22, LY = 14, LH = 172, LW = 116, ST = 44, FT = 42;     // the plate (css px) and the L on it
  var ARR = [0.065, 0.08, 0.095];                                                    // when each plate lands
  var DIR = [[-1, 0.1], [0.62, -1], [0.8, 0.85]];                                    // where each comes from (and leaves to)
  var LOCK = [[0, 0], [0.022, -0.018], [-0.02, 0.026]];                              // the near-lock misses, in L heights
  var FAN = [[-0.11, 0.01], [0.16, -0.12], [0.14, 0.1]];                            // where the drift ends, in L heights
  var TILT = [-0.05, 0.1, -0.12];
  function lpath(K, g) {                                // the L as one closed contour, a hair of wobble, sharp at elbow and toe
    var r = K.rand(61), P = [[0, 0], [ST - 3, 0], [ST + 1, LH - FT], [LW, LH - FT + 2], [LW - 5, LH], [0, LH]], i, j, n, a, b;
    g.beginPath(); g.moveTo(LX, LY);
    for (i = 1; i <= 6; i++) {
      a = P[i - 1]; b = P[i % 6]; n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14);
      for (j = 1; j <= n; j++) g.lineTo(LX + a[0] + (b[0] - a[0]) * j / n + (j < n ? (r() - 0.5) * 1.6 : 0), LY + a[1] + (b[1] - a[1]) * j / n + (j < n ? (r() - 0.5) * 1.6 : 0));
    }
    g.closePath();
  }
  function plate(K, st, i, ink, cov, seed) {
    return function () {
      var P = K.plate(W, H, seed);
      st["p" + i] = K.screen(P, ink, function (g) { g.fillStyle = K.tone(cov); lpath(K, g); g.fill(); });
    };
  }
  function put(K, g, can, x, y, rot, sx, sy, a) {
    if (a <= 0.004 || !can) return;
    g.save(); g.globalAlpha = Math.min(1, a); g.globalCompositeOperation = K.blend;
    g.translate(x, y); g.rotate(rot); g.scale(sx, sy);
    g.drawImage(can, -W / 2, -H / 2, W, H);
    g.restore();
  }
  T82ART.add("loss", "separation", {
    name: "Separation",
    by: "The L arrives as three ink plates from three sides, slams almost into register, then the drums miss and drift apart.",
    prep: function (K) {
      var st = K.st;
      return [plate(K, st, 0, "loss", 0.95, 7101), plate(K, st, 1, "pop", 0.6, 7102), plate(K, st, 2, "night", 0.64, 7103)];
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, f = K.fade(E, e);
      if (!st.p0 || !st.p1 || !st.p2 || f <= 0) return;
      var Hh = B.y1 - B.y0, cx = B.cx, cy = (B.y0 + B.y1) / 2, s = 0.92 * Hh / LH, D0 = 0.8 * B.size;
      var X = Math.min(0.35, 0.25 * E.dur), tLock = 0.17;
      var tail = K.clamp((e - tLock) / Math.max(0.12, E.dur - tLock - X), 0, 1), drift = 0.6 * K.ease.out(tail * 4) + 0.4 * tail;
      var q = K.clamp((e - (E.dur - X)) / X, 0, 1), out = q * q;
      var b = K.clamp((e - ARR[0]) / 0.12, 0, 1), k = Math.sin(b * Math.PI) * (1 - b * 0.5);   // the lock's squash
      var i, p, u, x, y, d, m, can;
      for (i = 0; i < 3; i++) {
        can = st["p" + i];
        p = K.clamp(e / ARR[i], 0, 1);
        d = Math.sqrt(DIR[i][0] * DIR[i][0] + DIR[i][1] * DIR[i][1]);
        x = cx + (LOCK[i][0] + FAN[i][0] * drift) * Hh + DIR[i][0] / d * (D0 * (1 - p * p) + 0.55 * B.size * out);
        y = cy + (LOCK[i][1] + FAN[i][1] * drift) * Hh + DIR[i][1] / d * (D0 * (1 - p * p) + 0.55 * B.size * out);
        if (p < 1) for (m = 1; m <= 2; m++) {           // the smear: two trailing copies while it flies
          u = K.clamp(p - 0.2 * m, 0, 1);
          put(K, g, can, x + DIR[i][0] / d * D0 * (p * p - u * u), y + DIR[i][1] / d * D0 * (p * p - u * u), 0, s * 1.15, s * 0.9, f * (0.45 - 0.17 * m));
        }
        put(K, g, can, x, y, TILT[i] * drift + (i === 1 ? 0.5 : i === 2 ? -0.5 : 0.4) * (1 - p) * (1 - p) * 0.4, s * (1 + 0.09 * k), s * (1 - 0.1 * k), f * (0.4 + 0.6 * p));
      }
    }
  });
})();
