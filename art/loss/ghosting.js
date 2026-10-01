/* art/loss/ghosting.js: Ghosting. The riso ghosting artifact: the drum prints the L, then one turn later it prints it
   again, paler. A heavy pink L drops and squashes at the top of the box; four ghost copies peel off it one after another
   and slide down the card, each a halftone of lower coverage (0.5, 0.37, 0.25, 0.14) and each a little further to the
   right, like a deck dealt off the L. They creep on down while the print dries, then the sheet feeds on: the farthest
   ghost leaves first, the L last.
   Plates: one screened job (the L, 0.95, starve and grain). The ghosts are live: the same contour filled with K.pat at
   stepped coverages, so their dots stay pinned while they slide. Stretches with E.dur: the creep and the ghosts' dry-down. */
(function () {
  "use strict";
  var W = 152, H = 200, LX = 20, LY = 14, LH = 172, LW = 112, ST = 44, FT = 42, CX = 76, CY = 100;   // the plate (css px) and the L on it
  var COV = [0.58, 0.4, 0.36], INK = ["loss", "loss", "night"], NG = 3;
  function lpath(K, g) {                                // the L as one closed contour, a hair of wobble, sharp at elbow and toe
    var r = K.rand(131), P = [[0, 0], [ST - 3, 0], [ST + 1, LH - FT], [LW, LH - FT + 2], [LW - 5, LH], [0, LH]], i, j, n, a, b;
    g.beginPath(); g.moveTo(LX, LY);
    for (i = 1; i <= 6; i++) {
      a = P[i - 1]; b = P[i % 6]; n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14);
      for (j = 1; j <= n; j++) g.lineTo(LX + a[0] + (b[0] - a[0]) * j / n + (j < n ? (r() - 0.5) * 1.7 : 0), LY + a[1] + (b[1] - a[1]) * j / n + (j < n ? (r() - 0.5) * 1.7 : 0));
    }
    g.closePath();
  }
  T82ART.add("loss", "ghosting", {
    name: "Ghosting",
    by: "A heavy L drops, then paler ghost copies of it peel off and slide down the card, the way a drum repeats its image a turn later.",
    prep: function (K) {
      var st = K.st;
      return [function () {
        st.L = K.screen(K.plate(W, H, 9501), "loss", function (g) { g.fillStyle = K.tone(0.95); lpath(K, g); g.fill(); });
      }, function () {
        st.K = K.screen(K.plate(W, H, 9502), "key", function (g) { g.fillStyle = K.tone(0.62); lpath(K, g); g.fill(); });
      }];
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, f = K.fade(E, e), k, c, dx, dy, tk, u, ex, q, qa, pr;
      if (!st.L || f <= 0) return;
      var Hh = B.y1 - B.y0, Ls = Math.min(Hh / 1.62, 0.78 * (B.x1 - B.x0) / 2.3), s = Ls / LH, DY = 0.2 * Ls, DX = 0.55 * Ls, size = B.size;
      var mx = B.cx - NG / 2 * DX, my = (B.y0 + B.y1) / 2 - NG / 2 * DY;     // the L's center: the whole stack is centered on the box
      var X = Math.min(0.35, 0.25 * E.dur), tail = K.clamp((e - 0.25) / Math.max(0.12, E.dur - 0.25 - X), 0, 1);
      var p = K.clamp(e / 0.06, 0, 1), b = K.clamp((e - 0.06) / 0.1, 0, 1), sq = Math.sin(b * Math.PI) * (1 - b * 0.5);
      var stp = 0.3 * X / NG, qL = K.clamp((e - (E.dur - X) - stp * NG) / (0.7 * X), 0, 1);
      // the farthest ghost leaves first, then each nearer one, the L last
      g.save(); g.globalCompositeOperation = K.blend;
      for (k = NG; k >= 1; k--) {
        tk = 0.035 + 0.045 * k; u = K.clamp((e - tk) / 0.11, 0, 1);
        if (u <= 0) continue;
        ex = K.ease.back(u);
        qa = K.clamp((e - (E.dur - X) - stp * (NG - k)) / (0.7 * X), 0, 1);
        pr = 1 - 0.38 * K.smooth(0, 1, tail);              // the print dries
        c = COV[k - 1] * pr * f;
        dx = DX * k * ex; dy = DY * k * ex + 0.012 * Hh * k * tail + 0.55 * size * qa * qa;
        g.save();
        g.translate(mx + dx, my + dy + (u < 1 ? 0 : 0)); g.scale(s, s); g.translate(-CX, -CY);
        lpath(K, g); g.globalAlpha = 1;
        g.fillStyle = K.pat(INK[k - 1], c, g);
        if (c > 0.04) g.fill();
        g.restore();
      }
      g.restore();
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;     // the L: drops in, squashes, then rides off last
      g.translate(mx, my + 0.9 * Hh * qL * qL - 0.55 * size * (1 - p * p) * (e < 0.06 ? 1 : 0));
      g.translate(0, LH / 2 * s); g.scale(1 + 0.1 * sq, 1 - 0.12 * sq); g.translate(0, -LH / 2 * s);
      g.scale(s, s);
      if (st.K) g.drawImage(st.K, -CX + 4, -CY + 4, W, H);
      g.drawImage(st.L, -CX, -CY, W, H);
      g.restore();
    }
  });
})();
