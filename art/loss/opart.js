/* art/loss/opart.js: Op Art. A solid pink L, and round it nine echoes of its own outline, aqua and pink turn and turn about
   with a gap of bare stock between each, the bands thinning as they go out the way a Bridget Riley print compresses. They run
   off the card's sides and the L's top and foot and bend round the one corner that matters, the inside of the elbow. The L
   lands with a squash and the echoes spread out of it one after another; a single pulse then runs out through them (each
   band swells outward a few px as it passes) and is gone: no flicker, nothing flashes. The exit folds the echoes back into the
   L from the outermost in, and the L drops.
   Plates: pink (the L and every other band) and aqua (the rest), live: K.pat pins the dots while the bands move. Beats:
   L 0.05, echoes spread 0.02 to 0.3, the pulse 0.35 to 0.75 (a long moment waits longer), fold-in in the last 0.1 to 0.35 s. */
(function () {
  "use strict";
  var TAU = Math.PI * 2, WD = 0.66, ST = 0.29, FT = 0.25, TILT = -0.1, N = 9;
  function corners(H) { var w = WD * H, s = ST * H, f = FT * H; return [[-w / 2, -H / 2], [-w / 2 + s, -H / 2], [-w / 2 + s, H / 2 - f], [w / 2, H / 2 - f], [w / 2, H / 2], [-w / 2, H / 2]]; }
  function grow(g, P, d) {                              // the L pushed out by d: round at the outer corners, sharp in the elbow
    var ext = P[3][0] - P[1][0], th = 1.5 * Math.PI;
    g.moveTo(P[0][0] - d, P[0][1]);
    g.arc(P[0][0], P[0][1], d, Math.PI, 1.5 * Math.PI); g.arc(P[1][0], P[1][1], d, 1.5 * Math.PI, TAU);
    if (d <= ext) g.lineTo(P[2][0] + d, P[2][1] - d);   // past the foot's reach the stem's edge meets the toe's round instead
    else { th = TAU - Math.acos(1 - ext / d); g.lineTo(P[1][0] + d, P[3][1] + d * Math.sin(th)); }
    g.arc(P[3][0], P[3][1], d, th, TAU); g.arc(P[4][0], P[4][1], d, 0, 0.5 * Math.PI); g.arc(P[5][0], P[5][1], d, 0.5 * Math.PI, Math.PI);
    g.closePath();
  }
  function core(g, P) { g.moveTo(P[0][0], P[0][1]); for (var i = 1; i < 6; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); }
  T82ART.add("loss", "opart", {
    name: "Op Art",
    by: "A solid pink L ringed by nine echoes of its outline, aqua and pink with bare stock between, thinning outward like a Riley print; they spread out of the L, one pulse runs through them, then they fold back in and the L drops.",
    hit: function (K, E) {
      var x = E.x, y = E.y, fi = E.first, R = fi ? 190 : 135;
      K.ring({ x: x, y: y, dur: 0.4, r0: 8, r1: R, w0: 10, ink: "loss", cov: 0.88 });
      K.ring({ x: x + 9, y: y - 6, delay: 0.05, dur: 0.44, r0: 6, r1: R + 20, w0: 6, ink: "pop", cov: 0.55 });
      K.spark({ x: x, y: y, n: fi ? 22 : 12, ink: function (q) { return q() < 0.3 ? "pop" : "loss"; }, sp: [160, fi ? 560 : 420], r: [1.1, 3.6], life: [0.3, 0.36], grav: 1400, seed: E.seed, streak: true });
      K.flash(fi ? 0.7 : 0.5); K.shake(Math.max(E.dur, 0.42), fi ? 12 : 9);
    },
    draw: function (K, E, e) {
      var g = K.g, B = K.box, f = K.fade(E, e), H = B.y1 - B.y0, X = Math.min(0.35, 0.25 * E.dur), P = corners(H), k, w, d1, sp, pu, c, lp, b, z, sq, q, gap = 0.85;
      var D = [], Wd = [], pulse0 = E.dur > 1.2 ? 0.45 : 0.35;
      if (f <= 0 || e < 0.012) return;
      lp = K.clamp(e / 0.05, 0, 1); b = K.clamp((e - 0.05) / 0.1, 0, 1);
      z = 1 + 0.2 * (1 - lp) * (1 - lp); sq = Math.sin(b * Math.PI) * (1 - b * 0.5);
      q = K.clamp((e - (E.dur - X)) / X, 0, 1);
      d1 = 0.05 * H;
      for (k = 0; k < N; k++) {                         // each echo: where it stands (D), how wide (Wd), after the spread, the pulse and the fold
        w = Math.max(4, H * (0.064 - 0.0042 * k));
        sp = K.ease.out(K.clamp((e - 0.02 - k * 0.012) / 0.16, 0, 1));
        pu = 9 * Math.exp(-Math.pow((e - pulse0 - 0.035 * k) / 0.1, 2)) + 0.05 * H * Math.min(1, e / 0.9) * (k + 1) / N;
        c = K.clamp(q * 1.6 - (N - 1 - k) / N * 0.6, 0, 1);
        D.push((d1 + pu) * sp * (1 - c * c)); Wd.push(w * sp * (1 - c * c));
        d1 += w * (1 + gap);
      }
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      g.beginPath(); g.rect(B.x0, B.y0 - 4, B.x1 - B.x0, H + 12); g.clip();
      g.translate(B.cx, (B.y0 + B.y1) / 2 + q * q * H * 0.5); g.rotate(TILT); g.scale(z * (1 + 0.08 * sq), z * (1 - 0.1 * sq));
      for (k = 0; k < N; k++) if (Wd[k] > 0.4) {        // one fill per echo: aqua, pink, aqua... each fainter than the last
        g.beginPath(); grow(g, P, D[k] + Wd[k]); grow(g, P, D[k]);
        g.fillStyle = K.pat(k % 2 ? "loss" : "pop", (k % 2 ? 0.84 : 0.88) - 0.045 * k, g); g.fill("evenodd");
      }
      g.beginPath(); core(g, P); g.fillStyle = K.pat("loss", 0.88, g); g.fill();
      g.restore();
    }
  });
})();
