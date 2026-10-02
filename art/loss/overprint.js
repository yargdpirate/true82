/* art/loss/overprint.js: Overprint. The pink drum prints the L; then the aqua plate, a second L hung from the same pin at
   the head of the stem, is swung in from the far side like a wrecking ball. It sweeps through the pink L (the lens where
   they cross prints a lighter pink, a wedge that opens and shuts as the plate swings), overshoots, swings back, and
   settles a hair off register: wider at the foot than the head, the way a skewed sheet misses. In a long moment the drum
   bumps the aqua plate once more and it swings through the pink again; the plates creep further apart, then both drop
   away, the aqua still swinging. The slam's rings are pink and an aqua one printed off register.
   Plates: pink L 0.94, aqua L 0.46 (each its own plate: four short jobs). Beats: the pink slams at 0.065 s; the aqua is
   released at 0.02 s and swings on a damped spring (first pass 0.18 s, overshoot at 0.3 s); the second swing at about half
   the hold. Stretches with E.dur: the creep and the second swing. The exit takes the last 0.1 to 0.35 s. */
(function () {
  "use strict";
  var W = 136, H = 208, LX = 4, LY = 4, LH = 200, LW = 128, ST = 50, FT = 48;     // the plate (css px) and the L on it
  var PX = LX + ST / 2, PY = LY + 6, CX = LX + LW / 2, CY = LY + LH / 2;            // the pin, and the L's middle
  var TP = -0.12;                                                                   // the pink L's lean
  function lpath(K, g) {                                // the L as one closed contour, a hair of wobble, sharp at elbow and toe
    var r = K.rand(83), P = [[0, 0], [ST - 3, 0], [ST + 1, LH - FT], [LW, LH - FT + 2], [LW - 5, LH], [0, LH]], i, j, n, a, b;
    g.beginPath(); g.moveTo(LX, LY);
    for (i = 1; i <= 6; i++) {
      a = P[i - 1]; b = P[i % 6]; n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14);
      for (j = 1; j <= n; j++) g.lineTo(LX + a[0] + (b[0] - a[0]) * j / n + (j < n ? (r() - 0.5) * 1.8 : 0), LY + a[1] + (b[1] - a[1]) * j / n + (j < n ? (r() - 0.5) * 1.8 : 0));
    }
    g.closePath();
  }
  function plate(K, st, key, ink, cov, seed) {          // two jobs: the plate's grain and starve, then the screening
    return [function () { st["P" + key] = K.plate(W, H, seed); }, function () {
      st[key] = K.screen(st["P" + key], ink, function (g) { g.fillStyle = K.tone(cov); lpath(K, g); g.fill(); });
      st["P" + key] = null;
    }];
  }
  function put(K, g, can, x, y, rot, sx, sy, a) {       // the plate hung by its pin at (x, y)
    if (a <= 0.004 || !can) return;
    g.save(); g.globalAlpha = Math.min(1, a); g.globalCompositeOperation = K.blend;
    g.translate(x, y); g.rotate(rot); g.scale(sx, sy);
    g.drawImage(can, -PX, -PY, W, H);
    g.restore();
  }
  // the aqua plate's angle: released far round on the right (-1 rad) and swung on a damped spring about its rest; in a
  // long moment the drum bumps it once more, mid-hold, and it swings through the pink a second time
  function swing(e, rest, e2) {
    var s = Math.max(0, e - 0.02), k = 3.4, w = 11, a = rest + (-1.0 - rest) * Math.exp(-k * s) * (Math.cos(w * s) + k / w * Math.sin(w * s)), t;
    if (e2 > 0 && e > e2) { t = e - e2; a += -4.6 * Math.exp(-k * t) * Math.sin(w * t) / w; }
    return a;
  }
  T82ART.add("loss", "overprint", {
    name: "Overprint",
    by: "Pink prints the L, then an aqua plate on the same pin swings through it like a wrecking ball: the overlap prints a lighter wedge that opens and shuts, twice in a long moment, until the plates settle a hair off register.",
    prep: function (K) {
      var st = K.st;
      return plate(K, st, "pk", "loss", 0.94, 8301).concat(plate(K, st, "aq", "pop", 0.46, 8302));
    },
    hit: function (K, E) {                              // the slam: a pink ring and an aqua ring that prints off register
      var x = E.x, y = E.y, fi = E.first, R = fi ? 200 : 140;
      K.ring({ x: x, y: y, dur: 0.4, r0: 8, r1: R, w0: 11, ink: "loss", cov: 0.92 });
      K.ring({ x: x + 11, y: y - 8, delay: 0.05, dur: 0.46, r0: 6, r1: R + 24, w0: 8, ink: "pop", cov: 0.62 });
      K.spark({ x: x, y: y, n: fi ? 28 : 14, ink: function (q) { return q() < 0.35 ? "pop" : "loss"; }, sp: [180, fi ? 620 : 470], r: [1.1, fi ? 5 : 3.7], life: [0.3, 0.38], grav: 1500, seed: E.seed, streak: true });
      K.flash(fi ? 0.72 : 0.55); K.shake(Math.max(E.dur, 0.42), fi ? 13 : 10);
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, f = K.fade(E, e);
      if (!st.pk || !st.aq || f <= 0) return;
      var Hh = B.y1 - B.y0, cx = B.cx, cy = (B.y0 + B.y1) / 2, s = 1.04 * Hh / LH, size = B.size;
      var X = Math.min(0.35, 0.25 * E.dur), tL = 0.065;
      var tail = K.clamp((e - 0.3) / Math.max(0.12, E.dur - 0.3 - X), 0, 1);
      var q = K.clamp((e - (E.dur - X)) / X, 0, 1), fall = q * q, p = K.clamp(e / tL, 0, 1), np = 1 - p * p, m;
      var b = K.clamp((e - tL) / 0.12, 0, 1), k = Math.sin(b * Math.PI) * (1 - b * 0.5);
      var cs = Math.cos(TP), sn = Math.sin(TP);
      var px = cx - ((CX - PX) * cs - (CY - PY) * sn) * s, py = cy - ((CX - PX) * sn + (CY - PY) * cs) * s;   // the pin, so the L sits mid-box
      var rest = TP + 0.15 + 0.07 * tail, e2 = E.dur > 0.9 ? Math.max(0.6, 0.5 * E.dur) : 0, ta = swing(e, rest, e2);
      var a = K.clamp(e / 0.025, 0, 1);
      if (e < 0.16) for (m = 1; m <= 2; m++)           // the smear: the plate's last two positions while it whips round
        put(K, g, st.aq, px + 0.5 * size * fall, py + 0.9 * size * fall, swing(e - 0.012 * m, rest, 0), s * 1.03, s, f * (0.5 - 0.17 * m) * a);
      put(K, g, st.aq, px + 0.5 * size * fall, py + 0.9 * size * fall, ta + 0.9 * fall, s, s, f * a);
      if (p < 1) for (m = 1; m <= 2; m++) {            // the pink's smear while it drops
        var v = K.clamp(p - 0.2 * m, 0, 1);
        put(K, g, st.pk, px - 0.2 * size * (1 - v * v), py - 0.55 * size * (1 - v * v), TP - 0.35 * (1 - v) * (1 - v), s * 0.95, s * 1.12, f * (0.46 - 0.17 * m));
      }
      put(K, g, st.pk, px - 0.2 * size * np - 0.3 * size * fall, py - 0.55 * size * np + 0.8 * size * fall, TP - 0.35 * (1 - p) * (1 - p) - 0.7 * fall,
        s * (1 + 0.07 * k), s * (1 - 0.08 * k), f * (0.4 + 0.6 * p));
    }
  });
})();
