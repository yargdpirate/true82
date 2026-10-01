/* art/loss/misfeed.js: Misfeed. The drum misfeeds: a straight aqua L lands first (the first pass), then the sheet slips
   and the pink L skids in sideways, sheared into an italic, kinked where the paper jumped, a starve stripe running
   through it (the roller missed: the aqua L shows through it), streaks dragged off the stem at the slip. It overshoots,
   buzzes and settles a shade off; then the sheet is yanked through the machine to the right, smeared. The beauty of a
   bad print.
   Plates (three screened jobs): the pink L (sheared, slipped, striped), the aqua L (straight), the streaks (a dot-size
   ramp). Beats: aqua lands 0.05 s, pink skids to 0.09 s and settles by 0.3 s; the aqua creeps; the yank takes the last
   0.1 to 0.35 s. Stretches with E.dur: the creep and the streaks' length. */
(function () {
  "use strict";
  var W = 226, H = 236, BX = 80, BY = 218, LH = 200, LW = 122, ST = 48, FT = 46;     // the plate (css px), the L's base corner
  var SH = 0.16, SLIP = 12, YS = BY - LH * 0.44;                                     // shear, the slip's jump, the slip line
  var PX = 147, PY = 118;                                                            // the plate point that sits at the hero's center
  function lpath(K, g) {                                // the L as one closed contour, a hair of wobble, sharp at elbow and toe
    var r = K.rand(97), P = [[0, 0], [ST - 3, 0], [ST + 1, LH - FT], [LW, LH - FT + 2], [LW - 5, LH], [0, LH]], i, j, n, a, b;
    g.beginPath(); g.moveTo(BX, BY - LH);
    for (i = 1; i <= 6; i++) {
      a = P[i - 1]; b = P[i % 6]; n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14);
      for (j = 1; j <= n; j++) g.lineTo(BX + a[0] + (b[0] - a[0]) * j / n + (j < n ? (r() - 0.5) * 1.8 : 0), BY - LH + a[1] + (b[1] - a[1]) * j / n + (j < n ? (r() - 0.5) * 1.8 : 0));
    }
    g.closePath();
  }
  function pink(K, g) {                                 // sheared, slipped at YS, two starve stripes through it
    var i;
    g.fillStyle = K.tone(0.95);
    for (i = 0; i < 2; i++) {
      g.save(); g.beginPath(); g.rect(0, i ? YS : 0, W, i ? H : YS); g.clip();
      g.translate(i ? SLIP : 0, 0); g.transform(1, 0, -SH, 1, SH * BY, 0); lpath(K, g); g.fill();
      g.restore();
    }
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = K.tone(0.82);
    g.beginPath(); g.moveTo(0, BY - LH * 0.8); g.lineTo(W, BY - LH * 0.8 - 6); g.lineTo(W, BY - LH * 0.8 + 7); g.lineTo(0, BY - LH * 0.8 + 13); g.fill();
    g.fillStyle = K.tone(0.9);
    g.beginPath(); g.moveTo(0, BY - LH * 0.2); g.lineTo(W, BY - LH * 0.2 - 2); g.lineTo(W, BY - LH * 0.2 + 3); g.lineTo(0, BY - LH * 0.2 + 5); g.fill();
    g.globalCompositeOperation = "source-over";
  }
  function streaks(K, g) {                              // ink dragged off the stem's left edge at the slip: a ramp of dots
    var r = K.rand(311), i, y, x0, len, h, gr;
    for (i = 0; i < 8; i++) {
      y = YS + 2 + i * 3.6 + r() * 2; h = 2.6 + r() * 3; len = 38 + r() * 54; x0 = BX + SH * (BY - y) + SLIP + 4;
      gr = g.createLinearGradient(x0, 0, x0 - len, 0);
      gr.addColorStop(0, K.tone(0.95)); gr.addColorStop(0.55, K.tone(0.5)); gr.addColorStop(1, K.tone(0.06));
      g.fillStyle = gr; g.fillRect(x0 - len, y, len, h);
    }
  }
  function plate(K, st, key, ink, seed, draw) {
    return function () { var P = K.plate(W, H, seed); st[key] = K.screen(P, ink, function (g) { draw(K, g); }); };
  }
  function put(K, g, can, x, y, sx, sy, shear, a, clipX) {
    if (a <= 0.004 || !can) return;
    g.save(); g.globalAlpha = Math.min(1, a); g.globalCompositeOperation = K.blend;
    g.translate(x, y); g.transform(sx, 0, -shear * sy, sy, 0, 0);
    if (clipX != null) { g.beginPath(); g.rect(-PX + clipX, -PY, W - clipX, H); g.clip(); }
    g.drawImage(can, -PX, -PY, W, H);
    g.restore();
  }
  T82ART.add("loss", "misfeed", {
    name: "Misfeed",
    by: "The drum misfeeds: a straight aqua L, then a pink one skids in sheared and kinked with a starve stripe and dragged streaks, buzzes, and is yanked off the card.",
    prep: function (K) {
      var st = K.st;
      return [plate(K, st, "pk", "loss", 9101, pink),
        plate(K, st, "aq", "pop", 9102, function (K2, g) { g.fillStyle = K2.tone(0.58); g.save(); g.translate(0, 0); lpath(K2, g); g.fill(); g.restore(); }),
        plate(K, st, "sm", "loss", 9103, streaks)];
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, f = K.fade(E, e);
      if (!st.pk || !st.aq || !st.sm || f <= 0) return;
      var Hh = B.y1 - B.y0, cx = B.cx, cy = (B.y0 + B.y1) / 2, s = 0.98 * Hh / LH, size = B.size;
      var X = Math.min(0.35, 0.25 * E.dur), tail = K.clamp((e - 0.3) / Math.max(0.12, E.dur - 0.3 - X), 0, 1);
      var q = K.clamp((e - (E.dur - X)) / X, 0, 1), yank = q * q;
      var pa = K.clamp(e / 0.05, 0, 1), pp = K.clamp((e - 0.02) / 0.07, 0, 1), t = Math.max(0, e - 0.09), m, v;
      var buzz = Math.exp(-t * 11) * Math.sin(t * 46) * 0.06 * size, dd = Math.floor(e * 12) / 12;
      var ax = (0.075 + 0.05 * tail) * Hh, ay = 0.035 * Hh + (pa < 1 ? 0 : 0);
      var xa = cx + ax + 1.5 * size * yank, ya = cy + ay - 0.55 * size * (1 - pa * pa);
      var xp = cx - 0.95 * size * (1 - pp * pp) + buzz + 1.25 * size * yank, sheer = 0.4 * (1 - pp) * (1 - pp);
      var stripe = f * (0.45 + 0.55 * pp);
      if (pa < 1) for (m = 1; m <= 2; m++) { v = K.clamp(pa - 0.25 * m, 0, 1); put(K, g, st.aq, xa, cy + ay - 0.55 * size * (1 - v * v), s * 1.04, s * 1.12, 0, f * (0.42 - 0.15 * m)); }
      put(K, g, st.aq, xa, ya, s * (1 + 0.05 * (1 - pa)), s * (1 - 0.04 * (1 - pa)), 0, f * (0.4 + 0.6 * pa));
      if (pp < 1) for (m = 1; m <= 3; m++) {            // the skid's smear: copies dragged back along the travel
        v = K.clamp(pp - 0.14 * m, 0, 1);
        put(K, g, st.pk, cx - 0.95 * size * (1 - v * v), cy, s * 1.25, s, sheer, f * (0.5 - 0.13 * m));
      }
      put(K, g, st.pk, xp, cy, s, s, sheer + (dd < 0.35 ? 0.012 * Math.sin(dd * 60) * (1 - tail) : 0), stripe);
      if (pp >= 1) put(K, g, st.sm, xp, cy, s * (1 + 0.02 * tail), s, 0, f, 112 * (1 - K.ease.out((e - 0.09) / 0.09)));
      if (yank > 0) for (m = 1; m <= 2; m++) put(K, g, st.pk, xp - 0.35 * size * m * yank, cy, s * (1 + 0.5 * yank), s, 0, f * 0.3 / m);
    }
  });
})();
