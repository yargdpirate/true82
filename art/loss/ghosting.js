/* art/loss/ghosting.js: Ghosting. The riso ghosting artifact: the drum prints the L, and one turn later it prints it
   again, paler, and again. A heavy pink L drops and squashes; two echoes peel out from behind it one after another and
   slide to the right and a little down, each a halftone of lower coverage that cools from pink to violet (0.56, 0.34), the
   L hiding the dots of the echo behind it. They shiver on twos, creep on and thin while the print dries (and in a long
   moment the drum turns again: a shudder runs down the train). Then the echoes are drawn back in behind the L and the L
   drops away last. The slam's rings echo too: a ring and two paler ones a beat apart.
   Plates: the L (pink 0.95 with starve and grain) and a key shadow plate a hair off: two screened plates, four short
   jobs. The echoes are live: the same contour filled with K.pat at stepped coverages, so their dots stay pinned while they
   slide. Stretches with E.dur: the creep, the dry-down and the shudders. The exit takes the last 0.1 to 0.35 s. */
(function () {
  "use strict";
  var W = 120, H = 182, LX = 4, LY = 4, LH = 172, LW = 112, ST = 44, FT = 42, CX = 60, CY = 90;   // the plate (css px) and the L on it
  var COV = [0.56, 0.34], INK = ["loss", "night"], NG = 2;
  var DXP = 0.78 * LW, DYP = 16;                        // each ghost's step, in plate px
  function lpath(K, g, keep) {                          // the L as one closed contour, a hair of wobble, sharp at elbow and toe
    var r = K.rand(131), P = [[0, 0], [ST - 3, 0], [ST + 1, LH - FT], [LW, LH - FT + 2], [LW - 5, LH], [0, LH]], i, j, n, a, b;
    if (!keep) g.beginPath();
    g.moveTo(LX, LY);
    for (i = 1; i <= 6; i++) {
      a = P[i - 1]; b = P[i % 6]; n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14);
      for (j = 1; j <= n; j++) g.lineTo(LX + a[0] + (b[0] - a[0]) * j / n + (j < n ? (r() - 0.5) * 1.7 : 0), LY + a[1] + (b[1] - a[1]) * j / n + (j < n ? (r() - 0.5) * 1.7 : 0));
    }
    g.closePath();
  }
  T82ART.add("loss", "ghosting", {
    name: "Ghosting",
    by: "A heavy L drops, then two paler echoes peel out from behind it and slide down the card, cooling from pink to violet, the way a drum repeats its image a turn later.",
    prep: function (K) {
      var st = K.st;
      return [
        function () { st.PL = K.plate(W, H, 9501); },
        function () { st.L = K.screen(st.PL, "loss", function (g) { g.fillStyle = K.tone(0.95); lpath(K, g); g.fill(); }); st.PL = null; },
        function () { st.PK = K.plate(W, H, 9502); },
        function () { st.K = K.screen(st.PK, "key", function (g) { g.fillStyle = K.tone(0.62); lpath(K, g); g.fill(); }); st.PK = null; }
      ];
    },
    hit: function (K, E) {                              // the slam, then its echoes: a ring and two paler rings a turn later
      var x = E.x, y = E.y, fi = E.first, R = fi ? 200 : 140;
      K.ring({ x: x, y: y, dur: 0.4, r0: 8, r1: R, w0: 11, ink: "loss", cov: 0.92 });
      K.ring({ x: x, y: y, delay: 0.12, dur: 0.42, r0: 8, r1: R + 18, w0: 8, ink: "loss", cov: 0.5 });
      K.ring({ x: x, y: y, delay: 0.24, dur: 0.44, r0: 8, r1: R + 36, w0: 6, ink: "night", cov: 0.34 });
      K.spark({ x: x, y: y, n: fi ? 22 : 10, ink: "loss", sp: [160, fi ? 560 : 420], r: [1.1, fi ? 4.6 : 3.4], life: [0.3, 0.38], grav: 1500, seed: E.seed, streak: true });
      K.flash(fi ? 0.72 : 0.55); K.shake(Math.max(E.dur, 0.42), fi ? 13 : 10);
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, f = K.fade(E, e), k, j, u, ex, qa, pr, c, dx, dy, p, b, sq;
      if (!st.L || f <= 0) return;
      var Hh = B.y1 - B.y0, size = B.size, cw = B.x1 - B.x0 - 30;
      var s = Math.min(0.98 * Hh / (LH + NG * DYP), cw / (LW + NG * DXP * 1.14));        // the whole echo stack fits the box
      var X = Math.min(0.35, 0.25 * E.dur), tail = K.clamp((e - 0.25) / Math.max(0.12, E.dur - 0.25 - X), 0, 1);
      var wide = (LW + NG * DXP * (1 + 0.14 * tail)) * s, high = (LH + NG * DYP) * s;
      var hx = B.cx - wide / 2 + LW * s / 2, hy = (B.y0 + B.y1) / 2 - high / 2 + LH * s / 2;        // the L's middle: the stack is centered on the box
      var stp = 0.3 * X / NG, qL = K.clamp((e - (E.dur - X) - 0.55 * X) / (0.45 * X), 0, 1);
      p = K.clamp(e / 0.06, 0, 1); b = K.clamp((e - 0.06) / 0.1, 0, 1); sq = Math.sin(b * Math.PI) * (1 - b * 0.5);
      // in a long moment the drum turns again: a shudder runs down the echo train (the L first, then each ghost), twice
      var pw = function (kk) {
        var a = 0, i, t0;
        for (i = 0, t0 = Math.max(0.55, 0.45 * E.dur); i < 2 && t0 < E.dur - X - 0.2; i++, t0 += 0.45) a = Math.max(a, Math.sin(Math.PI * K.clamp((e - t0 - 0.05 * kk) / 0.13, 0, 1)));
        return E.dur > 0.9 ? a : 0;
      };
      sq = Math.max(sq, 0.6 * pw(0));
      var fy = 0.9 * Hh * qL * qL - 0.55 * size * (1 - p * p) * (e < 0.06 ? 1 : 0);                 // the L's drop in, and its fall out
      // pose k: 0 = the L, 1..NG the ghosts (the plate's center at hx + dx, hy + dy, its bottom edge fixed under the squash)
      var pose = function (kk, ddx, ddy, fyy, sxm, sym) {
        g.translate(hx + ddx, hy + ddy + (kk ? 0 : fyy == null ? fy : fyy));
        if (!kk) { g.translate(0, LH / 2 * s); g.scale((1 + 0.1 * sq) * (sxm || 1), (1 - 0.12 * sq) * (sym || 1)); g.translate(0, -LH / 2 * s); }
        g.scale(s, s); g.translate(-CX, -CY);
      };
      var offs = [], rb = K.rand((E.seed ^ Math.floor(e * 12)) >>> 0);       // the echoes shiver on twos
      for (k = 1; k <= NG; k++) {                       // each ghost's place: peel out in turn, draw back in turn on the way out
        u = K.clamp((e - (0.03 + 0.03 * k)) / 0.11, 0, 1);
        qa = K.clamp((e - (E.dur - X) - stp * (NG - k)) / (0.55 * X), 0, 1);
        ex = u > 0 ? K.ease.back(u) * (1 - qa * qa) : 0;
        offs.push(u > 0 && ex > 0.002 ? [DXP * k * ex * (1 + 0.14 * tail) * s + (rb() - 0.5) * 2.2 * k * u + 12 * s * pw(k), (DYP * k * ex + 0.01 * k * tail * LH) * s + (rb() - 0.5) * 1.6 * k * u + 5 * s * pw(k)] : null);
      }
      g.save(); g.globalCompositeOperation = K.blend; g.globalAlpha = f;
      g.beginPath(); g.rect(0, 0, K.w, K.h);            // the L hides the echoes' dots behind it
      g.save(); pose(0, 0, 0); lpath(K, g, true); g.restore();
      g.clip("evenodd");
      pr = 1 - 0.34 * K.smooth(0, 1, tail);             // the print dries
      for (k = NG; k >= 1; k--) {                       // the farthest first; echoes over echoes add ink, as they do on paper
        c = COV[k - 1] * pr;
        if (!offs[k - 1] || c < 0.07) continue;
        g.save();
        pose(k, offs[k - 1][0], offs[k - 1][1]);
        lpath(K, g);
        g.fillStyle = K.pat(INK[k - 1], c, g);
        g.fill();
        g.restore();
      }
      g.restore();
      g.save(); g.globalCompositeOperation = K.blend;                        // the L: drops in, squashes, rides off last
      if (p < 1) for (j = 1; j <= 2; j++) {              // its smear while it drops
        g.save(); g.globalAlpha = f * (0.42 - 0.15 * j);
        pose(0, 0, 0, -0.55 * size * (1 - Math.pow(K.clamp(p - 0.22 * j, 0, 1), 2)), 0.94, 1.1);
        g.drawImage(st.L, 0, 0, W, H); g.restore();
      }
      g.globalAlpha = f;
      pose(0, 0, 0);
      if (st.K) g.drawImage(st.K, 4, 4, W, H);
      g.drawImage(st.L, 0, 0, W, H);
      g.restore();
    }
  });
})();
