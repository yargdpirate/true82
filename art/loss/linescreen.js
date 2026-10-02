/* art/loss/linescreen.js: Line Screen. The L is printed in an engraver's line screen instead of dots: parallel rules that
   swell to nearly solid at the elbow and thin toward the stem's head and the toe, inside a hard keyline. It lands as a
   squash with the rules still turning: the angle sweeps round and settles (a second, aqua plate with its own angle prints
   a hair behind, a shadow of crossing rules). The hold drifts the angle a few degrees; the tail thins every rule toward
   hairlines; the exit closes the rules like blinds, wiping down through the L.
   Plates: pink rules and a keyline, aqua rules at half coverage, all live (K.pat pins the dots, so the rules slide through
   a still screen). Beats: lands 0.05, angle settles by 0.34, thin from 0.3, close in the last 0.1 to 0.35 s. */
(function () {
  "use strict";
  var WD = 0.66, ST = 0.29, FT = 0.25, TILT = -0.1;     // the L as fractions of its height
  function outline(K, H) {                              // the L as one closed contour, a hair of wobble, sharp at elbow and toe
    var r = K.rand(8201), w = WD * H, s = ST * H, f = FT * H, i, j, n, a, b, o = [];
    var P = [[-w / 2, -H / 2], [-w / 2 + s - 2, -H / 2], [-w / 2 + s + 1, H / 2 - f], [w / 2, H / 2 - f + 2], [w / 2 - 4, H / 2], [-w / 2, H / 2]];
    for (i = 0; i < 6; i++) {
      a = P[i]; b = P[(i + 1) % 6]; n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14);
      for (j = 0; j < n; j++) o.push(a[0] + (b[0] - a[0]) * j / n + (j ? (r() - 0.5) * 1.7 : 0), a[1] + (b[1] - a[1]) * j / n + (j ? (r() - 0.5) * 1.7 : 0));
    }
    return o;
  }
  function box(x, y, cx, cy, hx, hy) { var dx = Math.abs(x - cx) - hx, dy = Math.abs(y - cy) - hy, mx = dx > 0 ? dx : 0, my = dy > 0 ? dy : 0, m = dx > dy ? dx : dy; return Math.sqrt(mx * mx + my * my) + (m < 0 ? m : 0); }
  function trace(g, o) { g.beginPath(); for (var i = 0; i < o.length; i += 2) g.lineTo(o[i], o[i + 1]); g.closePath(); }
  // how heavy the rule is at (x, y): full at the elbow, thinning along the L toward both ends
  function heft(H, x, y, c) {
    var s = ST * H, f = FT * H, xs = -WD * H / 2 + s / 2, ye = H / 2 - f / 2, sl = H - f / 2, tot = sl + (WD * H / 2 - xs);
    var u = y < ye ? (y + H / 2) / tot : (sl + Math.max(0, x - xs)) / tot, d = Math.min(1, Math.abs(u - sl / tot * c) / 0.62);
    return 1 - 0.88 * d * Math.sqrt(d);
  }
  // one screen of rules at angle a, pitch p, kept to the window |x| <= X, |y| <= Y: each rule's width = p * (lo + (hi - lo) * heft) * m, closing like
  // a blind when the wipe q reaches it; with halo > 0 the rules are the ones outside the L, thinning away over halo px
  function rules(K, g, H, a, p, m, q, lo, hi, c, halo, X, Y, ox, oy) {
    var R = 0.5 * Math.sqrt(WD * WD * H * H + H * H) + 8 + halo, N = Math.ceil(R / p), ca = Math.cos(a), sa = Math.sin(a), k, t, t0, t1, x, y, w, h, hf, T = [], Bt = [], i, u, v, wl = WD * H, sl = ST * H, fl = FT * H;
    g.beginPath();
    for (k = -N; k <= N; k++) {
      h = K.clamp(1 - (q * 1.6 - (k + N) / (2 * N)) / 0.6, 0, 1);
      if (h <= 0.02) continue;
      t0 = -R; t1 = R;                                  // the stretch of this rule inside the window
      u = k * p;
      if (Math.abs(ca) > 0.001) { v = (sa * u - X) / ca; x = (sa * u + X) / ca; t0 = Math.max(t0, Math.min(v, x)); t1 = Math.min(t1, Math.max(v, x)); } else if (Math.abs(sa * u) > X) continue;
      if (Math.abs(sa) > 0.001) { v = (-Y - ca * u) / sa; y = (Y - ca * u) / sa; t0 = Math.max(t0, Math.min(v, y)); t1 = Math.min(t1, Math.max(v, y)); } else if (Math.abs(ca * u) > Y) continue;
      if (t1 - t0 < 4) continue;
      T.length = 0; Bt.length = 0;
      for (t = t0; ; t += 18) {
        if (t > t1) t = t1;
        x = ca * t - sa * u; y = sa * t + ca * u; hf = 1;
        if (halo) {                                     // halo > 0: only outside the L, thinning away over halo px; halo < 0: only inside the L, offset by (ox, oy)
          hf = Math.min(box(x - ox, y - oy, -wl / 2 + sl / 2, 0, sl / 2, H / 2), box(x - ox, y - oy, 0, H / 2 - fl / 2, wl / 2, fl / 2));
          hf = halo < 0 ? (hf < 1 ? 1 : 0) : hf > 0 ? 0.5 * Math.pow(Math.max(0, 1 - hf / halo), 1.4) : 0;
        }
        w = 0.5 * p * (lo + (hi - lo) * heft(H, x, y, c)) * m * h * hf;
        T.push(x - sa * w, y + ca * w); Bt.push(x + sa * w, y - ca * w);
        if (t >= t1) break;
      }
      g.moveTo(T[0], T[1]);
      for (i = 2; i < T.length; i += 2) g.lineTo(T[i], T[i + 1]);
      for (i = Bt.length - 2; i >= 0; i -= 2) g.lineTo(Bt[i], Bt[i + 1]);
      g.closePath();
    }
  }
  T82ART.add("loss", "linescreen", {
    name: "Line Screen",
    by: "The L printed in an engraver's line screen: rules that swell at the elbow and thin to the ends turn round as it lands, an aqua screen crosses behind, then the rules thin and close like blinds.",
    hit: function (K, E) {
      var x = E.x, y = E.y, fi = E.first, R = fi ? 190 : 135;
      K.ring({ x: x, y: y, dur: 0.4, r0: 8, r1: R, w0: 10, ink: "loss", cov: 0.88 });
      K.ring({ x: x + 9, y: y - 6, delay: 0.05, dur: 0.44, r0: 6, r1: R + 20, w0: 6, ink: "pop", cov: 0.55 });
      K.spark({ x: x, y: y, n: fi ? 22 : 12, ink: function (q) { return q() < 0.3 ? "pop" : "loss"; }, sp: [160, fi ? 560 : 420], r: [1.1, 3.6], life: [0.3, 0.36], grav: 1400, seed: E.seed, streak: true });
      K.flash(fi ? 0.7 : 0.5); K.shake(Math.max(E.dur, 0.42), fi ? 12 : 9);
    },
    draw: function (K, E, e) {
      var g = K.g, B = K.box, f = K.fade(E, e), H = B.y1 - B.y0, cx = B.cx, cy = (B.y0 + B.y1) / 2, X = Math.min(0.35, 0.25 * E.dur);
      var o = outline(K, H), p0 = H * 0.056, sw, op, z, sq, a1, q, m, tail, c, dir = (E.seed & 1) ? 1 : -1;
      if (f <= 0 || e < 0.012) return;
      var lp = K.clamp(e / 0.05, 0, 1), b = K.clamp((e - 0.05) / 0.1, 0, 1);
      z = 1 + 0.12 * (1 - lp) * (1 - lp); sq = Math.sin(b * Math.PI) * (1 - b * 0.5);
      sw = K.clamp(e / 0.34, 0, 1); op = K.ease.inOut(K.clamp((e - 0.12) / 0.55, 0, 1));   // op: the rules open up from a near-solid slab
      a1 = 0.62 * dir + 1.15 * dir * Math.pow(1 - sw, 2) + 0.28 * Math.max(0, e - 0.34) * dir;
      c = Math.min(1, 0.2 + 0.8 * K.ease.out(e / 0.3)) + 0.2 * Math.sin(e * 4.5) * sw;   // where the swell sits: it runs down the L, then breathes
      tail = K.clamp((e - 0.3) / Math.max(0.12, E.dur - 0.3 - X), 0, 1);
      m = 1 - 0.55 * tail;
      q = K.clamp((e - (E.dur - X)) / X, 0, 1);
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      g.beginPath(); g.rect(B.x0, B.y0 - 6, B.x1 - B.x0, H + 14); g.clip();                  // the halo stays in the L's own rows
      g.translate(cx, cy); g.rotate(TILT); g.scale(z * (1 + 0.08 * sq), z * (1 - 0.1 * sq));
      rules(K, g, H, a1, p0, m * 0.9, q, 0.2 + 0.68 * (1 - op), 0.95, c, 0.17 * H, 0.33 * H + 0.17 * H, H / 2 + 8, 0, 0);          // the rules run on past the contour, thinning to nothing
      g.fillStyle = K.pat("loss", 0.88, g); g.fill();
      g.restore();
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      g.translate(cx, cy); g.rotate(TILT); g.scale(z * (1 + 0.08 * sq), z * (1 - 0.1 * sq));
      // the aqua plate: the L printed again a hair off, its own angle, a coarser pitch, rules crossing the pink's (no clip: its rules taper out at its contour)
      rules(K, g, H, a1 + 0.55 * dir - 0.35 * (1 - sw) * dir - 0.5 * Math.max(0, e - 0.34) * dir, p0 * 1.5, m * 0.85, q, 0.14 + 0.6 * (1 - op), 0.8, c * 0.9 + 0.1, -1, 0.33 * H + 12, H / 2 + 12, 8, -6);
      g.fillStyle = K.pat("pop", 0.55, g); g.fill();
      // the pink screen
      g.save(); trace(g, o); g.clip();
      rules(K, g, H, a1, p0, m, q, 0.2 + 0.68 * (1 - op), 0.95, c, 0, 0.33 * H + 4, H / 2 + 4, 0, 0);
      g.fillStyle = K.pat("loss", 0.88, g); g.fill(); g.restore();
      // the keyline
      trace(g, o); g.lineWidth = 3.2 * (1 - 0.5 * tail); g.lineJoin = "miter"; g.strokeStyle = K.pat("loss", 0.88, g); g.stroke();
      g.restore();
    }
  });
})();
