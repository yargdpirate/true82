/* art/loss/overprint.js: Overprint. Two huge L plates, pink and aqua, slam in from the top corners and land crossing at
   angles like scissor blades, the lens where they cross printing a lilac white. Then the blades close: both swing into
   near-register (the aqua lagging, overshooting, settling a shade off) and hold as a pink L with a lilac core and an
   aqua edge, the aqua plate creeping a little further off all the way. They drop away, tumbling, one each side.
   Plates: pink L 0.92, aqua L 0.66 (two screened jobs, each on its own plate). Beats: land 0.07 s, close to 0.23 s,
   creep (the tail), fall 0.1 to 0.35 s. Stretches with E.dur: the creep. */
(function () {
  "use strict";
  var W = 190, H = 236, LX = 31, LY = 18, LH = 200, LW = 128, ST = 50, FT = 48;     // the plate (css px) and the L on it
  var RP = 0.17, RA = -0.25, RF = -0.1;                                              // landing angles, then register's
  function lpath(K, g) {                                // the L as one closed contour, a hair of wobble, sharp at elbow and toe
    var r = K.rand(83), P = [[0, 0], [ST - 3, 0], [ST + 1, LH - FT], [LW, LH - FT + 2], [LW - 5, LH], [0, LH]], i, j, n, a, b;
    g.beginPath(); g.moveTo(LX, LY);
    for (i = 1; i <= 6; i++) {
      a = P[i - 1]; b = P[i % 6]; n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14);
      for (j = 1; j <= n; j++) g.lineTo(LX + a[0] + (b[0] - a[0]) * j / n + (j < n ? (r() - 0.5) * 1.8 : 0), LY + a[1] + (b[1] - a[1]) * j / n + (j < n ? (r() - 0.5) * 1.8 : 0));
    }
    g.closePath();
  }
  function plate(K, st, key, ink, cov, seed) {
    return function () {
      var P = K.plate(W, H, seed);
      st[key] = K.screen(P, ink, function (g) { g.fillStyle = K.tone(cov); lpath(K, g); g.fill(); });
    };
  }
  function put(K, g, can, x, y, rot, sx, sy, a) {
    if (a <= 0.004 || !can) return;
    g.save(); g.globalAlpha = Math.min(1, a); g.globalCompositeOperation = K.blend;
    g.translate(x, y); g.rotate(rot); g.scale(sx, sy);
    g.drawImage(can, -W / 2, -H / 2, W, H);
    g.restore();
  }
  T82ART.add("loss", "overprint", {
    name: "Overprint",
    by: "Two huge ink plates, pink and aqua, land crossing like scissor blades (a lilac white where they overlap), then close into near-register and fall away tumbling.",
    prep: function (K) {
      var st = K.st;
      return [plate(K, st, "pk", "loss", 0.92, 8301), plate(K, st, "aq", "pop", 0.66, 8302)];
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, f = K.fade(E, e);
      if (!st.pk || !st.aq || f <= 0) return;
      var Hh = B.y1 - B.y0, cx = B.cx, cy = (B.y0 + B.y1) / 2, s = 1.04 * Hh / LH, size = B.size;
      var X = Math.min(0.35, 0.25 * E.dur), tL = 0.06, hd = 0.035, cT = K.clamp(E.dur * 0.14, 0.08, 0.18);
      var u = K.clamp((e - tL - hd) / cT, 0, 1), ua = K.clamp((e - tL - hd - 0.03) / cT, 0, 1);
      var tail = K.clamp((e - 0.25) / Math.max(0.12, E.dur - 0.25 - X), 0, 1), creep = 0.4 * tail + 0.6 * K.ease.out(tail * 3);
      var q = K.clamp((e - (E.dur - X)) / X, 0, 1), fall = q * q, p = K.clamp(e / tL, 0, 1), np = 1 - p * p, m, v;
      var k = Math.sin(K.clamp((e - tL) / 0.12, 0, 1) * Math.PI) * (1 - K.clamp((e - tL) / 0.12, 0, 1) * 0.5);
      var rp = p < 1 ? RP + 0.9 * (1 - p) * (1 - p) : RP + (RF - RP) * K.ease.back(u);
      var ra = p < 1 ? RA - 0.9 * (1 - p) * (1 - p) : RA + (RF - RA) * K.ease.back(ua);
      var ax = (0.05 + 0.03 * creep) * Hh, ay = -(0.043 + 0.022 * creep) * Hh;
      if (p < 1) for (m = 1; m <= 2; m++) {             // the smear: two trailing copies while the plates fly
        v = K.clamp(p - 0.2 * m, 0, 1);
        put(K, g, st.pk, cx - 0.85 * size * (1 - v * v), cy - 0.55 * size * (1 - v * v), rp, s * 1.1, s * 0.92, f * (0.46 - 0.17 * m));
        put(K, g, st.aq, cx + 0.85 * size * (1 - v * v) + ax, cy - 0.5 * size * (1 - v * v) + ay, ra, s * 1.1, s * 0.92, f * (0.46 - 0.17 * m));
      }
      put(K, g, st.pk, cx - 0.85 * size * np - 0.3 * size * fall, cy - 0.55 * size * np + 0.8 * size * fall, rp - 0.7 * fall,
        s * (1 + 0.06 * k), s * (1 - 0.07 * k), f * (0.4 + 0.6 * p));
      put(K, g, st.aq, cx + 0.85 * size * np + ax + 0.3 * size * fall, cy - 0.5 * size * np + ay + 0.85 * size * fall, ra + 0.6 * fall,
        s * (1 + 0.06 * k), s * (1 - 0.07 * k), f * (0.4 + 0.6 * p));
    }
  });
})();
