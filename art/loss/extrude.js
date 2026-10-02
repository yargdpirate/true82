/* art/loss/extrude.js: Block Shadow. A chunky inline block L built the way a screen-print poster builds one, from three
   flat passes that land one after another: the violet cast shadow shoots out to the lower right in three stepped
   bands, the key-magenta side wall extrudes behind it, and last the pink face slams from the viewer onto the stock
   notch the other two left, squashes, and holds with an inline groove carved through it. After the landing the block
   rises another third (the wall and the shadow keep growing, the face never moves); then it is stomped flat (depth
   collapses to nothing) and the flat L drops away.
   Everything is live: each pass is one polygon filled with K.pat (face 0.86, wall 0.86, shadow 0.62 / 0.44 / 0.27); the
   wall and the shadow are clipped to what the pass in front of them leaves, so no ink overlaps and the face stays pure
   pink. Stretches with E.dur: the rise. The exit takes the last 0.1 to 0.35 s. */
(function () {
  "use strict";
  var SW = 0.3, FT = 0.27, WD = 0.74;                   // stem, foot height, width, in face heights
  var DL = 0.16, ZS = 2.4;                              // the wall's depth (face heights), and the shadow's length in walls
  function base(H, r) {                                 // the face's six corners: a hair of seeded wobble, sharp at elbow and toe
    var S = SW * H, y = H - FT * H, W = WD * H, j = [], i;
    for (i = 0; i < 12; i++) j.push((r() - 0.5) * 0.011 * H);
    return [[j[0], j[1]], [S + j[2], j[3]], [S + j[4], y + j[5]], [W + j[6], y + j[7]], [W + j[8], H + j[9]], [j[10], H + j[11]]];
  }
  function sil(b, dx, dy) {                             // the face swept along (dx, dy): one simple nine-point silhouette
    return [b[0], b[1], [b[1][0] + dx, b[1][1] + dy], [b[1][0] + dx, b[2][1]], b[3], [b[3][0] + dx, b[3][1] + dy],
      [b[4][0] + dx, b[4][1] + dy], [b[5][0] + dx, b[5][1] + dy], b[5]];
  }
  function poly(g, p) { for (var i = 0; i < p.length; i++) g[i ? "lineTo" : "moveTo"](p[i][0], p[i][1]); g.closePath(); }
  function inset(H, r) {                                // the L shrunk by r on every side: an L again
    var S = SW * H - r, y = H - FT * H + r, W = WD * H - r, h = H - r;
    return [[r, r], [S, r], [S, y], [W, y], [W, h], [r, h]];
  }
  T82ART.add("loss", "extrude", {
    name: "Block Shadow",
    by: "A chunky inline block L from three flat passes: a violet cast shadow, a key-magenta wall, then the pink face slams on; the block rises, is stomped flat and drops.",
    hit: function (K, E) {
      var x = E.x, y = E.y, fi = E.first, R = fi ? 200 : 140;
      K.ring({ x: x, y: y, dur: 0.4, r0: 8, r1: R, w0: 11, ink: "loss", cov: 0.92 });
      K.ring({ x: x + 10, y: y + 8, delay: 0.05, dur: 0.46, r0: 6, r1: R + 22, w0: 8, ink: "night", cov: 0.6 });
      K.spark({ x: x, y: y, n: fi ? 26 : 12, ink: function (q) { return q() < 0.3 ? "key" : "loss"; }, sp: [170, fi ? 580 : 440], r: [1.1, fi ? 4.8 : 3.5], life: [0.3, 0.38], grav: 1500, seed: E.seed, streak: true });
      K.flash(fi ? 0.72 : 0.55); K.shake(Math.max(E.dur, 0.42), fi ? 13 : 10);
    },
    draw: function (K, E, e) {
      var g = K.g, B = K.box, f = K.fade(E, e), k;
      if (f <= 0) return;
      var Hh = B.y1 - B.y0, H = Math.min(0.86 * Hh, (K.w - 36) / 1.25), X = Math.min(0.35, 0.25 * E.dur);
      var ts = K.clamp((E.dur - 0.2) / 0.2, 0.55, 1);                      // a short moment lands its passes faster
      var tsh = K.clamp(e / (0.045 * ts), 0, 1), twl = K.clamp((e - 0.03 * ts) / (0.045 * ts), 0, 1), tf = K.clamp((e - 0.06 * ts) / (0.05 * ts), 0, 1);
      var tail = K.clamp((e - 0.25) / Math.max(0.15, E.dur - 0.25 - X), 0, 1), q = K.clamp((e - (E.dur - X)) / X, 0, 1);
      var sq = e > 0.11 * ts ? Math.sin(Math.PI * K.clamp((e - 0.11 * ts) / 0.1, 0, 1)) : 0;    // the face's squash: the wall is pressed in with it
      var pop = 0.22 * Math.sin(Math.PI * K.clamp((e - 0.2 * ts) / 0.22, 0, 1));                // then springs out past its depth
      var t2 = 0.52 * E.dur, th = 0.62 + 0.3 * K.ease.inOut(tail);                              // the light swings round the block
      if (E.dur > 1) pop += 0.2 * Math.sin(Math.PI * K.clamp((e - t2) / 0.2, 0, 1));            // a long moment: the block thumps again
      var z = (1 + 0.3 * K.smooth(0, 1, tail)) * (1 + pop - 0.3 * sq) * (1 - K.ease.inOut(K.clamp(q * 2.2, 0, 1)));   // the exit: stomped flat
      var fall = 2.35 * Hh * Math.pow(Math.max(0, q - 0.4), 2);                                 // then the flat L drops
      var dx = DL * H * z * Math.cos(th), dy = DL * H * z * Math.sin(th), cx = B.cx, cy = (B.y0 + B.y1) / 2;
      var b0 = base(H, K.rand(4417));
      var ox = cx - (WD + 0.31) * H / 2, oy = cy - (1 + 0.25) * H / 2 + fall;
      g.save(); g.globalCompositeOperation = K.blend; g.globalAlpha = f;
      g.translate(ox, oy);
      // the cast shadow: three bands, thinner ink as it runs out; a stock gap keeps it off the wall
      var gp = 0.014 * H, prev = sil(b0, dx + gp, dy + gp * 0.8), cov = [0.62, 0.44, 0.27], u = [0.4, 0.72, 1];
      for (k = 0; k < 3 && tsh > 0; k++) {
        var lk = (ZS - 1) * u[k] * tsh + 1, cur = sil(b0, dx * lk + gp, dy * lk + gp * 0.8);
        g.save(); g.beginPath(); g.rect(-900, -900, 2400, 2400); poly(g, prev); g.clip("evenodd");
        g.beginPath(); poly(g, cur); g.fillStyle = K.pat("night", cov[k], g); g.fill(); g.restore();
        prev = cur;
      }
      // the wall: the face's sweep, minus the face
      if (twl > 0) {
        g.save(); g.beginPath(); g.rect(-900, -900, 2400, 2400); poly(g, sil(b0, 0, 0)); g.clip("evenodd");
        g.beginPath(); poly(g, sil(b0, dx * twl, dy * twl)); g.fillStyle = K.pat("key", 0.86, g); g.fill(); g.restore();
      }
      // the face: slams from the viewer, squashes, holds; the inline groove carved through it
      if (tf > 0) {
        var p = K.ease.out(tf);
        var s = 1 + 0.55 * (1 - p), W = WD * H;
        g.translate(W / 2, H / 2); g.scale(s * (1 + 0.07 * sq), s * (1 - 0.09 * sq)); g.translate(-W / 2, -H / 2);
        g.beginPath(); poly(g, sil(b0, 0, 0)); poly(g, inset(H, 0.05 * H)); poly(g, inset(H, 0.075 * H));
        g.fillStyle = K.pat("loss", 0.86, g); g.fill("evenodd");
      }
      g.restore();
    }
  });
})();
