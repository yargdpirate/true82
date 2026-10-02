/* art/loss/ripple.js: Dot Ripple. The card under the L is a band of pink halftone, its dots no bigger than dust. The slam is
   a stone dropped at the wound: a crest runs out through the band, every dot it touches swelling (an aqua dot blooms at the
   crest's edge, a pink one fattens behind it). Outside the L the swell dies away, the dots shrinking back to dust; inside
   the L it freezes, the dots fat enough to join, so the L is the print the wave leaves behind. In a long moment two weaker
   crests follow the first. The exit is a second wave from the wound that flattens everything it passes: the dots swell once
   more at its front and are gone behind it.
   Plates: pink dots (a square screen at the pink angle) and aqua dots (at its own), live (K.pat pins them). The crest's
   speed follows E.dur so the L is whole by 0.09 s even in the shortest moment; the exit takes the last 0.1 to 0.35 s. */
(function () {
  "use strict";
  var TAU = Math.PI * 2, WD = 0.66, ST = 0.3, FT = 0.26, TILT = -0.1, PA = 0.244;
  function box(x, y, cx, cy, hx, hy) { var dx = Math.abs(x - cx) - hx, dy = Math.abs(y - cy) - hy, mx = dx > 0 ? dx : 0, my = dy > 0 ? dy : 0, m = dx > dy ? dx : dy; return Math.sqrt(mx * mx + my * my) + (m < 0 ? m : 0); }
  function step(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  // the screen's dots over the card: where each is, how far from the wound, how much of it the L holds (t), how much of the band's vignette (v)
  function grid(K, E, B, H, p, key) {
    var w = WD * H, s = ST * H, ft = FT * H, Hf = H / 2 + 14, cx = B.cx, cy = (B.y0 + B.y1) / 2, ct = Math.cos(TILT), st = Math.sin(TILT), cp = Math.cos(PA), sp = Math.sin(PA);
    var N = Math.ceil(Math.hypot(K.w / 2, Hf) / p), i, j, u, v, dx, dy, x, y, lx, ly, sd, S = { key: key, n: 0, x: [], y: [], d: [], t: [], v: [] };
    S.Dm = Math.hypot(Math.max(Math.abs(cx - E.x), K.w / 2) + K.w / 2, Math.abs(cy - E.y) + Hf) * 0.9;
    for (i = -N; i <= N; i++) for (j = -N; j <= N; j++) {
      u = i * p; v = j * p; dx = u * cp - v * sp; dy = u * sp + v * cp; x = cx + dx; y = cy + dy;
      if (x < -4 || x > K.w + 4 || Math.abs(dy) > Hf) continue;
      lx = (x - cx) * ct + (y - cy) * st; ly = -(x - cx) * st + (y - cy) * ct;
      sd = Math.abs(lx) > w / 2 + 2 * p || Math.abs(ly) > H / 2 + 2 * p ? 9 * p : Math.min(box(lx, ly, -w / 2 + s / 2, 0, s / 2, H / 2), box(lx, ly, 0, H / 2 - ft / 2, w / 2, ft / 2));
      S.x.push(x); S.y.push(y); S.d.push(Math.hypot(x - E.x, y - E.y)); S.t.push(K.clamp(0.5 - (sd - 0.3 * p) / (0.9 * p), 0, 1));
      S.v.push(K.clamp((Hf - Math.abs(dy)) / (0.22 * H), 0, 1)); S.n++;
    }
    for (i in S) if (S[i] instanceof Array) S[i] = new Float32Array(S[i]);
    return S;
  }
  T82ART.add("loss", "ripple", {
    name: "Dot Ripple",
    by: "A band of dust-fine halftone; a crest runs out from the wound and every dot swells as it passes (aqua at its edge). Outside the L they shrink back, inside they freeze fat into the L. Then a second wave flattens it all.",
    hit: function (K, E) {
      var x = E.x, y = E.y, fi = E.first;
      K.spark({ x: x, y: y, n: fi ? 22 : 12, ink: function (q) { return q() < 0.3 ? "pop" : "loss"; }, sp: [160, fi ? 560 : 420], r: [1.1, 3.6], life: [0.3, 0.36], grav: 1400, seed: E.seed, streak: true });
      K.flash(fi ? 0.7 : 0.5); K.shake(Math.max(E.dur, 0.42), fi ? 12 : 9);
    },
    draw: function (K, E, e) {
      var g = K.g, B = K.box, f = K.fade(E, e), H = B.y1 - B.y0, X = Math.min(0.35, 0.25 * E.dur), p = H * 0.046, cx = B.cx, cy = (B.y0 + B.y1) / 2, st8 = K.st;
      var T = K.clamp(0.07 + 0.2 * (E.dur - 0.29), 0.07, 0.3), two = E.dur > 0.9, key = [cx, cy, H, K.w, E.x, E.y].join(), q, R2, i, k, n, a, d, r, vv, t, wv, fz, aq, sw;
      var S = st8.S, pa = [], pb = [];
      if (f <= 0 || e < 0.005) return;
      if (!S || S.key !== key) S = st8.S = grid(K, E, B, H, p, key);      // the dots and what each one is to the wound and the L: fixed for the moment
      var Dm = S.Dm, vel = Dm / T;
      q = K.clamp((e - (E.dur - X)) / X, 0, 1); R2 = q * q * 1.3 * Dm;
      for (n = 0; n < S.n; n++) {
        d = S.d[n]; t = S.t[n]; vv = S.v[n]; a = e - d / vel;
        wv = a > 0 ? step(0, 0.03, a) * Math.exp(-a / 0.1) : 0;             // the crest's swell, dying behind it
        if (two) for (k = 1; k < 3; k++) if (a > 0.16 * k) wv += Math.pow(0.5, k) * step(0, 0.03, a - 0.16 * k) * Math.exp(-(a - 0.16 * k) / 0.1);
        fz = a > 0 ? step(0, 0.04, a) : 0;                                   // what the L keeps
        r = 0.13 * p * vv + 0.4 * p * (1 - t) * wv * vv + (0.58 * p - 0.13 * p * vv) * t * fz + 0.1 * p * t * wv;
        if (R2 > 0) {                                                       // the second wave: a swell at its front, nothing behind it
          sw = (R2 - d) / (0.18 * Dm);
          r = r * (1 - step(0, 1, sw)) + 0.3 * p * Math.exp(-Math.pow((d - R2) / (0.07 * Dm), 2)) * vv;
        }
        if (r >= 0.7) pa.push(S.x[n], S.y[n], r);
        if (a > -0.01 && a < 0.1 && t < 0.9 && R2 <= 0) {                    // the aqua dot at the crest's edge, a half cell off the pink one
          aq = 0.34 * p * Math.exp(-Math.pow((a - 0.012) / 0.03, 2)) * vv * (1 - t);
          if (aq >= 0.8) pb.push(S.x[n] + 0.35 * p, S.y[n] + 0.35 * p, aq);
        }
      }
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      g.beginPath();
      for (i = 0; i < pa.length; i += 3) { g.moveTo(pa[i] + pa[i + 2], pa[i + 1]); g.arc(pa[i], pa[i + 1], pa[i + 2], 0, TAU); }
      g.fillStyle = K.pat("loss", 0.88, g); g.fill();
      g.beginPath();
      for (i = 0; i < pb.length; i += 3) { g.moveTo(pb[i] + pb[i + 2], pb[i + 1]); g.arc(pb[i], pb[i + 1], pb[i + 2], 0, TAU); }
      g.fillStyle = K.pat("pop", 0.85, g); g.fill();
      g.restore();
    }
  });
})();
