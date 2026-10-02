/* art/loss/showthrough.js: Show-Through. The L is printed on the back of the sheet. A sheet of pale paper tumbles in
   from above back-side up, and through the paper the print shows faintly, mirrored (a violet ghost of an upside-down
   L); it whips over the long way, lands front-side up and slaps down with the L at full strength in pink, a slab-serif
   L with crop marks at the sheet's corners. In a moment of 0.85 s or more the sheet peeks over to its back (the ghost again, soaking
   through darker) and slaps back; at the end it flips away to its ghost side and drops.
   Everything is live and flips on its horizontal axis (scale y = cos): one L path, filled pink 0.88 on the printed side
   and violet 0.24 to 0.4 on the other, so the mirror falls out of the flip by itself; the paper is a light tint (0.14)
   with a light edge band. Beats: the flip-in 0.04 to 0.17 s (faster in a short moment); the peek at about half the hold;
   the exit flip in the last 0.1 to 0.35 s. Stretches with E.dur: the peek and the bleed. */
(function () {
  "use strict";
  var PI = Math.PI, LW = 118, LH = 172, M = 20, SW = LW + 2 * M, SH = LH + 2 * M;
  function lpath(K, g) {                                // a slab-serif L as one closed contour: top serifs, a heavy foot with its up-tick
    var r = K.rand(3171), H = LH, W = LW, F = 42;
    var P = [[0, 0], [66, 0], [66, 13], [56, 13], [56, H - F], [W - 14, H - F], [W - 14, H - F - 32], [W, H - F - 32], [W, H], [0, H], [0, H - 14], [10, H - 14], [10, 13], [0, 13]], i;
    g.beginPath();
    for (i = 0; i < P.length; i++) g[i ? "lineTo" : "moveTo"](P[i][0] + (r() - 0.5) * 1.6, P[i][1] + (r() - 0.5) * 1.6);
    g.closePath();
  }
  function ang(e, sc, dur, q) {                         // 0 = printed side up, PI = the blank side (the ghost)
    var u = e / (0.17 * sc), v, a = 0;
    if (u < 1) return PI * (1 - u * u);
    if (dur >= 0.85) {                                  // the peek: over to the ghost side, held, and slapped back (slower in a long moment)
      var lg = dur >= 1.4, d1 = lg ? 0.12 : 0.08, d2 = lg ? 0.2 : 0.08, d3 = lg ? 0.1 : 0.08;
      v = e - (lg ? 0.42 : 0.3) * dur;
      if (v > 0 && v < d1) a = PI * K_smooth(v / d1);
      else if (v >= d1 && v < d1 + d2) a = PI;
      else if (v >= d1 + d2 && v < d1 + d2 + d3) a = PI * (1 - Math.pow((v - d1 - d2) / d3, 2));
    }
    return Math.max(a, PI * K_smooth(Math.min(1, q * 1.7)));
  }
  function K_smooth(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  T82ART.add("loss", "showthrough", {
    name: "Show-Through",
    by: "A sheet tumbles in back side up, the print ghosting through it mirrored and faint, then whips over and slaps down with the L at full strength.",
    hit: function (K, E) {
      var x = E.x, y = E.y, fi = E.first, R = fi ? 200 : 140, sc = K.clamp((E.dur - 0.2) / 0.35, 0.45, 1);
      K.ring({ x: x, y: y, delay: 0.16 * sc, dur: 0.4, r0: 8, r1: R, w0: 11, ink: "loss", cov: 0.92 });
      K.ring({ x: x, y: y, delay: 0.2 * sc, dur: 0.44, r0: 6, r1: R + 22, w0: 7, ink: "night", cov: 0.55 });
      K.spark({ x: x, y: y, n: fi ? 22 : 10, ink: "loss", sp: [160, fi ? 540 : 400], r: [1.1, fi ? 4.4 : 3.2], life: [0.3, 0.38], grav: 1500, seed: E.seed, streak: true });
      K.flash(fi ? 0.72 : 0.55); K.shake(Math.max(E.dur, 0.42), fi ? 13 : 10);
    },
    draw: function (K, E, e) {
      var g = K.g, B = K.box, f = K.fade(E, e), i;
      if (f <= 0) return;
      var Hh = B.y1 - B.y0, size = B.size, s = Math.min(1.04 * Hh / SH, (K.w - 24) / SW), cy = (B.y0 + B.y1) / 2;
      var sc = K.clamp((E.dur - 0.2) / 0.35, 0.45, 1), X = Math.min(0.35, 0.25 * E.dur);
      var q = K.clamp((e - (E.dur - X)) / X, 0, 1), th = ang(e, sc, E.dur, q), cs = Math.cos(th);
      var tF = 0.17 * sc, u = K.clamp(e / tF, 0, 1), bleed = K.clamp((e - tF) / Math.max(0.2, E.dur - X - tF), 0, 1);
      var sq = Math.sin(PI * K.clamp((e - tF) / 0.1, 0, 1)) * (e > tF ? 1 : 0);
      var h = Math.max(Math.abs(cs) * SH, 3.2);          // the paper's thickness at the edge-on instant
      g.save(); g.globalCompositeOperation = K.blend; g.globalAlpha = f;
      g.translate(B.cx + 0.12 * size * (1 - u) * (1 - u) - 0.2 * size * q * q, cy - 0.62 * size * (1 - u * u) + 0.95 * Hh * q * q * q);
      g.rotate(0.3 * (1 - u) * (1 - u) * (e < tF ? 1 : 0) - 0.35 * q * q + (e > tF && q < 1 ? 0.05 * Math.exp(-7 * (e - tF)) * Math.sin(20 * (e - tF)) : 0));
      g.scale(s * (1 + 0.06 * sq), s * (1 - 0.07 * sq));
      g.beginPath(); g.rect(-SW / 2, -h / 2, SW, h); g.fillStyle = K.pat("light", 0.14 + (cs < 0 ? 0.04 : 0), g); g.fill();
      g.beginPath(); g.rect(-SW / 2, -h / 2, SW, h); g.rect(-SW / 2 + 2.6, -h / 2 + (h > 6 ? 2.6 : 0), SW - 5.2, h > 6 ? h - 5.2 : h);
      g.fillStyle = K.pat("light", 0.88, g); g.fill("evenodd");
      g.save(); g.scale(1, cs); g.translate(-LW / 2, -LH / 2);
      if (cs > 0.02) {                                   // the aqua plate: a clean two-ink miss under the pink, it lags the flip and catches up
        var lag = 4.5 + 18 * Math.pow(1 - K.clamp((e - tF * 0.7) / 0.14, 0, 1), 2);
        g.save(); g.beginPath(); g.rect(-60, -60, LW + 120, LH + 120); lpath(K, g); g.clip("evenodd");
        g.translate(lag, lag * 0.8); lpath(K, g); g.fillStyle = K.pat("pop", 0.44, g); g.fill(); g.restore();
      }
      lpath(K, g);
      g.fillStyle = cs >= 0 ? K.pat("loss", 0.88, g) : K.pat("night", 0.24 + 0.16 * bleed, g); g.fill();
      if (cs > 0) {                                      // crop marks at the corners of the sheet, printed with it (the printed side only)
        g.beginPath();
        for (i = 0; i < 4; i++) {
          var cx = i % 2 ? LW + M - 5 : -M + 5, cy2 = i < 2 ? -M + 5 : LH + M - 5, dx = i % 2 ? -11 : 11, dy = i < 2 ? 11 : -11;
          g.rect(cx, cy2, dx, dx > 0 ? 2.6 : -2.6); g.rect(cx, cy2, dx > 0 ? 2.6 : -2.6, dy);
        }
        g.fillStyle = K.pat("light", 0.88, g); g.fill();
      }
      g.restore();
      g.restore();
    }
  });
})();
