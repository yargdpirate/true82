/* art/loss/moire.js: Moire. Two halftone screens, pink and aqua, over a dotted oval. The aqua screen lands turned far
   off the pink (a fine plaid of two lattices), swings round to a few degrees and the interference blooms into broad
   clusters that drift through the oval, while inside the L the aqua screen seats itself on the pink one: fat, locked,
   a pink dot with a lilac core. So the L is the one place the screens agree and the oval around it is where they do
   not. Then the lock lets go: the L comes apart into the same interference, the screens spin apart and the dots drain.
   Plates: pink dots, aqua dots (free lattice in the oval, locked copy in the L), all live (K.pat pins the dots). Beats:
   slam 0.05, aqua settles by 0.45, it breathes a few degrees while it holds, lets go and spins apart in the last 0.1 to 0.35 s. */
(function () {
  "use strict";
  var TAU = Math.PI * 2, WD = 0.66, ST = 0.29, FT = 0.25, TILT = -0.1, AA = 0.24;
  function box(x, y, cx, cy, hx, hy) { var dx = Math.abs(x - cx) - hx, dy = Math.abs(y - cy) - hy, mx = dx > 0 ? dx : 0, my = dy > 0 ? dy : 0, m = dx > dy ? dx : dy; return Math.sqrt(mx * mx + my * my) + (m < 0 ? m : 0); }
  function dot(g, x, y, r) { if (r < 2.6) g.rect(x - r, y - r, 2 * r, 2 * r); else { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); } }   // the small dots are squares: too small to tell, and cheap
  // one screen: dots on a square lattice turned by a (pitch p); fat (rF) inside the L, small (rP) in the panel, a one-cell ramp between,
  // the panel's dots shrinking away toward its rim. g takes the dots; pl (a Path2D) takes the fat ones again, at the lock's size lc, for the aqua screen locked to this one
  function lat(g, pl, lc, H, a, p, rF, rP, W, Hp, c, n) {
    var ca = Math.cos(a), sa = Math.sin(a), N = Math.ceil(0.5 * Math.sqrt(W * W + Hp * Hp) / p) + 1, w = WD * H, s = ST * H, f = FT * H, i, j, x, y, u, v, sd, t, r, nd, bx = w / 2 + 1.5 * p, by = H / 2 + 1.5 * p;
    for (i = -N; i <= N; i++) for (j = -N; j <= N; j++) {
      u = i * p; v = j * p; x = u * ca - v * sa; y = u * sa + v * ca;
      nd = Math.sqrt(x * x / (W * W / 4) + y * y / (Hp * Hp / 4));
      t = 0;
      if (x > -bx && x < bx && y > -by && y < by) {
        sd = Math.min(box(x, y, -w / 2 + s / 2, 0, s / 2, H / 2), box(x, y, 0, H / 2 - f / 2, w / 2, f / 2));
        t = Math.max(0, Math.min(1, 0.5 - sd / (1.2 * p)));
      }
      if (nd > 1.05 && t < 0.02) continue;
      r = rP * n * Math.max(0, Math.min(1, (1.05 - nd) / 0.3)) * (1 - t) + rF * c * t;
      if (r >= 0.7) dot(g, x, y, r);
      if (pl && t > 0.02) dot(pl, x, y, rF * 0.64 * lc * t);
    }
  }
  T82ART.add("loss", "moire", {
    name: "Moire",
    by: "Two halftone screens over a dotted oval: the aqua one swings from a fine plaid to a few degrees off and the interference blooms, while inside the L it locks onto the pink, so the L is where the screens agree. Then it lets go and they spin apart.",
    hit: function (K, E) {
      var x = E.x, y = E.y, fi = E.first, R = fi ? 190 : 135;
      K.ring({ x: x, y: y, dur: 0.4, r0: 8, r1: R, w0: 10, ink: "loss", cov: 0.88 });
      K.ring({ x: x + 9, y: y - 6, delay: 0.05, dur: 0.44, r0: 6, r1: R + 20, w0: 6, ink: "pop", cov: 0.55 });
      K.spark({ x: x, y: y, n: fi ? 22 : 12, ink: function (q) { return q() < 0.3 ? "pop" : "loss"; }, sp: [160, fi ? 560 : 420], r: [1.1, 3.6], life: [0.3, 0.36], grav: 1400, seed: E.seed, streak: true });
      K.flash(fi ? 0.7 : 0.5); K.shake(Math.max(E.dur, 0.42), fi ? 12 : 9);
    },
    draw: function (K, E, e) {
      var g = K.g, B = K.box, f = K.fade(E, e), H = B.y1 - B.y0, X = Math.min(0.35, 0.25 * E.dur), p = H * 0.058;
      var dir = (E.seed & 1) ? 1 : -1, W = 1.28 * H, Hp = 1.05 * H, lp, z, sq, b, s, d, q, k, pb, lk, lk2 = new Path2D();
      if (f <= 0 || e < 0.012) return;
      lp = K.clamp(e / 0.05, 0, 1); b = K.clamp((e - 0.05) / 0.1, 0, 1);
      z = 1 + 0.18 * (1 - lp) * (1 - lp); sq = Math.sin(b * Math.PI) * (1 - b * 0.5);
      s = K.clamp((e - 0.04) / 0.45, 0, 1);
      q = K.clamp((e - (E.dur - X)) / X, 0, 1);
      d = dir * (0.55 * (1 - s) * (1 - s) + 0.28 + 0.08 * Math.sin(e * 2.4) + 1.0 * q * q);
      pb = (0.55 + 0.45 * K.ease.out(e / 0.35)) * (1 - 0.4 * q);
      lk = K.ease.out(s) * (1 - q);                      // the lock: the aqua screen seats in the L as it swings home, lets go in the exit
      k = q > 0.66 ? 0.5 : q > 0.33 ? 0.7 : 1;
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      g.translate(B.cx, (B.y0 + B.y1) / 2); g.rotate(TILT); g.scale(z * (1 + 0.07 * sq), z * (1 - 0.09 * sq));
      g.beginPath(); lat(g, lk2, lk, H, AA, p, p * 0.47, p * 0.19, W * pb, Hp * pb, 1, 1); g.fillStyle = K.pat("loss", 0.88 * k, g); g.fill();
      g.beginPath();                                    // the aqua screen: free in the panel, locked to the pink inside the L
      lat(g, null, 0, H, AA + d, p, p * 0.3, p * 0.19, W * pb, Hp * pb, 1 - lk, 1);
      g.fillStyle = K.pat("pop", 0.75 * k, g); g.fill();
      if (lk > 0.02) g.fill(lk2);
      g.restore();
    }
  });
})();
