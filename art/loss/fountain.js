/* art/loss/fountain.js: Split Fountain. The riso split fountain: two inks loaded on one drum and left to blend. The L prints
   in a flick from the head of the stem round the elbow to the toe, a hex screen of fat dots, all pink. Then the second ink
   floods in from the toe (aqua, or violet on some seeds) and works back up the L: no dot changes tone, each one simply
   changes ink, a random scatter that thickens into a solid, so the blend is a gradient made of dots. The edge is the screen's
   own (the dots shrink to nothing at the contour). It holds, the blend breathing a little; the exit runs the roll backwards,
   the dots starving to nothing from the toe up the stem.
   Plates: pink dots and the partner's dots, live (K.pat pins them). Beats: roll 0 to 0.075 s, the flood 0.08 to 0.5 s, the
   exit in the last 0.1 to 0.35 s. */
(function () {
  "use strict";
  var TAU = Math.PI * 2, WD = 0.66, ST = 0.31, FT = 0.27, TILT = -0.1, LA = 0.26;
  function box(x, y, cx, cy, hx, hy) { var dx = Math.abs(x - cx) - hx, dy = Math.abs(y - cy) - hy, mx = dx > 0 ? dx : 0, my = dy > 0 ? dy : 0, m = dx > dy ? dx : dy; return Math.sqrt(mx * mx + my * my) + (m < 0 ? m : 0); }
  function step(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  T82ART.add("loss", "fountain", {
    name: "Split Fountain",
    by: "A split-fountain print: the L rolls on in a flick as a hex screen of fat pink dots, then the second ink floods in from the toe and every dot simply changes ink, so the blend is made of dots. The roll runs back to starve it out.",
    hit: function (K, E) {
      var x = E.x, y = E.y, fi = E.first, R = fi ? 190 : 135, pn = E.seed % 5 < 3 ? "pop" : "night";
      K.ring({ x: x, y: y, dur: 0.4, r0: 8, r1: R, w0: 10, ink: "loss", cov: 0.88 });
      K.ring({ x: x + 9, y: y - 6, delay: 0.05, dur: 0.44, r0: 6, r1: R + 20, w0: 6, ink: pn, cov: 0.6 });
      K.spark({ x: x, y: y, n: fi ? 22 : 12, ink: function (q) { return q() < 0.3 ? pn : "loss"; }, sp: [160, fi ? 560 : 420], r: [1.1, 3.6], life: [0.3, 0.36], grav: 1400, seed: E.seed, streak: true });
      K.flash(fi ? 0.7 : 0.5); K.shake(Math.max(E.dur, 0.42), fi ? 12 : 9);
    },
    draw: function (K, E, e) {
      var g = K.g, B = K.box, f = K.fade(E, e), H = B.y1 - B.y0, X = Math.min(0.35, 0.25 * E.dur), p = H * 0.052, w = WD * H, s = ST * H, ft = FT * H;
      var rnd = K.rand(E.seed ^ 0xf0a7), pn = E.seed % 5 < 3 ? "pop" : "night", ca = Math.cos(LA), sa = Math.sin(LA), N = Math.ceil(0.62 * H * 1.2 / p);
      var xs = -w / 2 + s / 2, ye = H / 2 - ft / 2, sl = H - ft / 2, tot = sl + (w / 2 - xs), i, j, x, y, u, v, h, sd, t, r, uu, gr, sh, c, fr, pa = [], pb = [];
      var lp, b, z, sq, q = K.clamp((e - (E.dur - X)) / X, 0, 1), cn;
      if (f <= 0 || e < 0.01) return;
      lp = K.clamp(e / 0.05, 0, 1); b = K.clamp((e - 0.05) / 0.1, 0, 1);
      z = 1 + 0.16 * (1 - lp) * (1 - lp); sq = Math.sin(b * Math.PI) * (1 - b * 0.5);
      fr = -0.15 + 1.3 * K.ease.out(K.clamp(e / 0.075, 0, 1));                     // the roll's front, along the L from head to toe
      cn = 1.6 - 1.08 * K.ease.inOut(K.clamp((e - 0.08) / 0.42, 0, 1)) + 0.05 * Math.sin(e * 2.6) * K.clamp((e - 0.5) / 0.2, 0, 1);   // where the blend sits: the toe's ink floods back up
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      g.translate(B.cx, (B.y0 + B.y1) / 2); g.rotate(TILT); g.scale(z * (1 + 0.07 * sq), z * (1 - 0.09 * sq));
      for (i = -N; i <= N; i++) for (j = -N; j <= N; j++) {
        h = rnd();
        u = (i + 0.5 * j) * p; v = j * p * 0.866; x = u * ca - v * sa; y = u * sa + v * ca;
        sd = Math.min(box(x, y, -w / 2 + s / 2, 0, s / 2, H / 2), box(x, y, 0, H / 2 - ft / 2, w / 2, ft / 2));
        t = Math.max(0, Math.min(1, 0.5 - (sd - 0.3 * p) / (0.9 * p)));
        if (t < 0.06) continue;
        uu = y < ye ? (y + H / 2) / tot : (sl + Math.max(0, x - xs)) / tot;        // how far along the L this dot sits, 0 head to 1 toe
        gr = K.clamp((fr - uu) / 0.14, 0, 1) * (1 - K.clamp((q * 1.5 - (1 - uu)) / 0.22, 0, 1));
        r = p * 0.47 * t * gr;
        if (r < 0.8) continue;
        sh = h < step(cn - 0.45, cn + 0.45, uu);                                      // this dot has taken the second ink
        c = sh ? pb : pa; c.push(x, y, r);
      }
      g.beginPath();
      for (i = 0; i < pa.length; i += 3) { g.moveTo(pa[i] + pa[i + 2], pa[i + 1]); g.arc(pa[i], pa[i + 1], pa[i + 2], 0, TAU); }
      g.fillStyle = K.pat("loss", 0.88, g); g.fill();
      g.beginPath();
      for (i = 0; i < pb.length; i += 3) { g.moveTo(pb[i] + pb[i + 2], pb[i + 1]); g.arc(pb[i], pb[i + 1], pb[i + 2], 0, TAU); }
      g.fillStyle = K.pat(pn, 0.86, g); g.fill();
      g.restore();
    }
  });
})();
