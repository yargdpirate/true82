/* art/loss/separation.js: Separation. The L is printed in three drums, and the drums arrive as three plates from three
   directions: aqua drops from above, violet climbs from below right, and the pink key plate slams in last from the left.
   Each plate carries its L and a registration target in the L's counter. They lock (the three targets close into one
   bullseye, the L a pink one under two tints), hold a beat, then the drums miss: the plates fan apart, the targets
   splitting into three rings, aqua stretching a little, violet shrinking, and each leaves the way it came. The slam's
   rings are one per drum.
   Plates: pink L 0.95, aqua and violet L tints 0.42 and 0.44 (each on its own plate, the starve never lines up: six short
   jobs) with a solid target each. Beats: aqua lands 0.05 s, violet 0.065, pink 0.08; lock to 0.16 s; the drift (the tail).
   Stretches with E.dur: the drift. The exit takes the last 0.1 to 0.35 s. */
(function () {
  "use strict";
  var W = 124, H = 180, LX = 4, LY = 4, LH = 172, LW = 116, ST = 44, FT = 42;     // the plate (css px) and the L on it
  var TX = 84, TY = 64;                                                              // the registration target, in the counter
  var ARR = [0.05, 0.065, 0.08];                                                     // when aqua, violet, pink land
  var DIR = [[0.15, -1], [0.7, 0.85], [-1, 0.12]];                                   // where each comes from (and leaves to)
  var LOCK = [[0.014, -0.012], [-0.012, 0.016], [0, 0]];                             // the near-lock misses, in L heights
  var FAN = [[0.15, -0.11], [0.14, 0.1], [-0.06, 0.01]];                             // where the drift ends, in L heights
  var TILT = [-0.07, 0.1, -0.1], ZS = [1.07, 0.94, 1];                               // the drift's turn and stretch
  function lpath(K, g) {                                // the L as one closed contour, a hair of wobble, sharp at elbow and toe
    var r = K.rand(61), P = [[0, 0], [ST - 3, 0], [ST + 1, LH - FT], [LW, LH - FT + 2], [LW - 5, LH], [0, LH]], i, j, n, a, b;
    g.beginPath(); g.moveTo(LX, LY);
    for (i = 1; i <= 6; i++) {
      a = P[i - 1]; b = P[i % 6]; n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14);
      for (j = 1; j <= n; j++) g.lineTo(LX + a[0] + (b[0] - a[0]) * j / n + (j < n ? (r() - 0.5) * 1.6 : 0), LY + a[1] + (b[1] - a[1]) * j / n + (j < n ? (r() - 0.5) * 1.6 : 0));
    }
    g.closePath();
  }
  function target(K, g, t) {                               // a printer's registration target: a ring and a cross
    g.strokeStyle = K.tone(t); g.lineWidth = 3;
    g.beginPath(); g.arc(TX, TY, 10, 0, 6.2832); g.stroke();
    g.beginPath(); g.moveTo(TX - 19, TY); g.lineTo(TX + 19, TY); g.moveTo(TX, TY - 19); g.lineTo(TX, TY + 19); g.stroke();
  }
  function plate(K, st, i, ink, cov, seed, tt) {        // two jobs: the plate's grain and starve, then the screening
    return [function () { st["P" + i] = K.plate(W, H, seed); }, function () {
      st["p" + i] = K.screen(st["P" + i], ink, function (g) { g.fillStyle = K.tone(cov); lpath(K, g); g.fill(); target(K, g, tt); });
      st["P" + i] = null;
    }];
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
    by: "The L arrives as three ink plates from three sides, each with its registration target; they lock into one bullseye, then the drums miss and the plates fan apart.",
    prep: function (K) {
      var st = K.st;
      return plate(K, st, 0, "pop", 0.42, 7101, 0.8).concat(plate(K, st, 1, "night", 0.44, 7102, 0.97), plate(K, st, 2, "loss", 0.95, 7103, 0.97));
    },
    hit: function (K, E) {                              // the slam, one ring per drum: pink, aqua, violet
      var x = E.x, y = E.y, fi = E.first, R = fi ? 200 : 140;
      K.ring({ x: x, y: y, dur: 0.4, r0: 8, r1: R, w0: 11, ink: "loss", cov: 0.92 });
      K.ring({ x: x, y: y, delay: 0.04, dur: 0.44, r0: 6, r1: R + 22, w0: 7, ink: "pop", cov: 0.62 });
      K.ring({ x: x, y: y, delay: 0.08, dur: 0.48, r0: 6, r1: R + 44, w0: 6, ink: "night", cov: 0.6 });
      K.spark({ x: x, y: y, n: fi ? 28 : 14, ink: function (q) { var v = q(); return v < 0.2 ? "pop" : v < 0.4 ? "night" : "loss"; }, sp: [180, fi ? 600 : 460], r: [1.1, fi ? 5 : 3.6], life: [0.3, 0.38], grav: 1500, seed: E.seed, streak: true });
      K.flash(fi ? 0.72 : 0.55); K.shake(Math.max(E.dur, 0.42), fi ? 13 : 10);
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, f = K.fade(E, e);
      if (!st.p0 || !st.p1 || !st.p2 || f <= 0) return;
      var Hh = B.y1 - B.y0, cx = B.cx, cy = (B.y0 + B.y1) / 2, s = 0.95 * Hh / LH, D0 = 0.8 * B.size;
      var X = Math.min(0.35, 0.25 * E.dur), tLock = 0.16;
      var tail = K.clamp((e - tLock) / Math.max(0.12, E.dur - tLock - X), 0, 1), drift = 0.6 * K.ease.out(tail * 4) + 0.4 * tail;
      var q = K.clamp((e - (E.dur - X)) / X, 0, 1), out = q * q;
      var b = K.clamp((e - ARR[2]) / 0.12, 0, 1), k = Math.sin(b * Math.PI) * (1 - b * 0.5);   // the lock's squash
      var i, p, u, x, y, d, m, z, can, w;
      for (i = 0; i < 3; i++) {
        can = st["p" + i];
        p = K.clamp(e / ARR[i], 0, 1);
        d = Math.sqrt(DIR[i][0] * DIR[i][0] + DIR[i][1] * DIR[i][1]);
        w = i < 2 ? 0.5 * (1 - p) : 0;                  // aqua and violet also zoom in: down from 1.5x, up from 0.5x
        z = i === 0 ? 1 + w : i === 1 ? 1 - w : 1;
        x = cx + (LOCK[i][0] + FAN[i][0] * drift) * Hh + DIR[i][0] / d * (D0 * (1 - p * p) + 0.55 * B.size * out);
        y = cy + (LOCK[i][1] + FAN[i][1] * drift) * Hh + DIR[i][1] / d * (D0 * (1 - p * p) + 0.55 * B.size * out);
        z *= 1 + (ZS[i] - 1) * drift;
        if (p < 1) for (m = 1; m <= 2; m++) {           // the smear: two trailing copies while it flies
          u = K.clamp(p - 0.2 * m, 0, 1);
          put(K, g, can, x + DIR[i][0] / d * D0 * (p * p - u * u), y + DIR[i][1] / d * D0 * (p * p - u * u), 0, s * z * 1.12, s * z * 0.92, f * (0.46 - 0.17 * m));
        }
        put(K, g, can, x, y, TILT[i] * drift + (i === 1 ? 0.5 : i === 2 ? -0.4 : 0.4) * (1 - p) * (1 - p) * 0.4,
          s * z * (1 + 0.08 * k), s * z * (1 - 0.09 * k), f * (0.45 + 0.55 * p));
      }
    }
  });
})();
