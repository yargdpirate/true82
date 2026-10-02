/* art/loss/spill.js: Ink Spill. A violet L-shaped channel is cut into the card (sharp corners, a mold). One fat pink ink
   drop falls down the line of the stem (a smeared teardrop), hits the top with a crown splash, and the puddle runs down
   the channel as if poured: a bulbous head down the stem, round the elbow, along the foot, the ribbon's edge lobed like
   liquid. It swells over the rim when it fills (a glossy highlight) and small drops keep
   plinking into the stem (each with a mini crown). Then the channel drains along the same path (the tail
   runs after the head) and the last bulb falls off the toe, leaving the empty mold, which fades.
   All live: one pink path (ribbon, crown, drops) in one K.pat fill. Beats (x k for a short moment): drop 0 to
   .05, pour .05 to .22, crown .05 to .3, leaks from .25; the drain takes the last .14 to .4 s. */
(function () {
  "use strict";
  var PI = Math.PI, TAU = PI * 2;
  function geo(H) {                                     // the ribbon's skeleton: stem down from A, round the elbow B, out to the toe C
    var Ws = 0.24 * H, Wf = 0.2 * H, xc = -0.33 * H + Ws / 2, G = { H: H, Ws: Ws, Wf: Wf, xc: xc, yT: -0.5 * H, yB: 0.5 * H, xL: -0.33 * H, xR: 0.35 * H };
    G.ay = G.yT + Ws / 2; G.by = G.yB - Wf / 2; G.cx = G.xR - Wf / 2;
    G.Ls = G.by - G.ay; G.Lf = G.cx - xc; G.Lt = G.Ls + G.Lf;
    return G;
  }
  function dot(g, x, y, r) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); }
  function ribbon(g, G, s0, s1, bw, ph) {               // the ink between path distances s0 and s1: clockwise subpaths of one path
    var Ws = G.Ws * bw, Wf = G.Wf * bw, xc = G.xc, H = G.H, hb = 0.24 * K_clamp((G.Lt - s1) / (0.12 * H)), s, a, b, fa, fb;
    function rad(s, W) { return W / 2 * (1 + 0.065 * Math.sin(s / (0.085 * H) + ph) + hb * Math.exp(-Math.pow((s1 - s) / (0.075 * H), 2))); }
    if (s0 < G.Ls) {
      a = G.ay + s0; b = s1 >= G.Ls ? G.yB : G.ay + s1;
      g.rect(xc - Ws * 0.45, a, Ws * 0.9, b - a);
      for (s = Math.max(s0, 0); s <= Math.min(s1, G.Ls - 0.1 * H); s += 0.045 * H) dot(g, xc, G.ay + s, rad(s, Ws));
      if (s1 < G.Ls) dot(g, xc, G.ay + s1, rad(s1, Ws));
    }
    if (s1 > G.Ls) {
      fa = s0 > G.Ls ? xc + s0 - G.Ls : xc - Ws / 2; fb = xc + Math.min(s1 - G.Ls, G.Lf);
      g.rect(fa, G.yB - Wf * 0.95, fb - fa, Wf * 0.95);
      for (s = Math.max(s0, G.Ls + 0.1 * H); s < s1; s += 0.045 * H) dot(g, xc + s - G.Ls, G.by, rad(s, Wf));
      dot(g, fb, G.by, rad(s1, Wf));
    }
  }
  function K_clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function mold(g, G, m) {                              // the channel: the L grown by m, with the L itself cut out (even-odd)
    var x0 = G.xL, x1 = G.xL + G.Ws, y1 = G.yB - G.Wf;
    g.moveTo(x0 - m, G.yT - m); g.lineTo(x1 + m, G.yT - m); g.lineTo(x1 + m, y1 - m); g.lineTo(G.xR + m, y1 - m); g.lineTo(G.xR + m, G.yB + m); g.lineTo(x0 - m, G.yB + m); g.closePath();
    g.moveTo(x0, G.yT); g.lineTo(x1, G.yT); g.lineTo(x1, y1); g.lineTo(G.xR, y1); g.lineTo(G.xR, G.yB); g.lineTo(x0, G.yB); g.closePath();
  }
  function drop(g, x, y, rx, ry) {                      // a falling teardrop: a tail up, a belly down
    g.moveTo(x - rx, y); g.lineTo(x, y - 2.3 * ry); g.lineTo(x + rx, y); g.moveTo(x + rx, y); g.ellipse(x, y, rx, ry, 0, 0, TAU);
  }
  function crown(g, px, py, H, p, n, r, z) {            // the splash seen from above: a ring of spikes round the dome that widens, lifts and slumps (z = size)
    var i, q, R = (0.15 + 0.3 * p) * H * z, ln = H * z * (0.05 + 0.2 * Math.sin(PI * Math.pow(p, 0.6))), lf = ln * 0.9, v, cs, sn;
    for (i = 0; i < 2 * n; i++) {
      q = PI * i / n; cs = Math.cos(q); sn = Math.sin(q); v = i % 2 ? ln * (0.6 + 0.4 * r()) : 0;
      g[i ? "lineTo" : "moveTo"](px + (R + v) * cs, py + 0.34 * (R + v) * sn - (i % 2 ? lf * (0.5 + 0.5 * Math.abs(sn)) : 0));
    }
    g.closePath(); g.moveTo(px + 0.8 * R, py); g.ellipse(px, py, 0.8 * R, 0.8 * 0.34 * R, 0, 0, TAU, true);
  }
  T82ART.add("loss", "spill", {
    name: "Ink Spill",
    by: "A violet L-shaped channel opens in the card, a fat pink ink drop falls into the top of it with a crown splash, the puddle runs down the channel as if poured and swells over the rim while small drops keep plinking in; then it drains along the same path, and the last bulb falls off the toe, leaving the empty mold.",
    // the tempo dial (art/tempo.json): phase "exit" begins at 0.7 of E.dur, where the channel drains (tE = dur - X, X = min(0.4, max(0.14, 0.3 dur)): exactly 0.7 up to 1.33 s, 0.765 at 1.7 s)
    phases: { exit: 0.7 },
    hit: function (K, E) {
      var B = K.box, H = B.y1 - B.y0, G = geo(H), k = K.clamp(E.dur / 0.9, 0.36, 1), y = (B.y0 + B.y1) / 2 + G.yT + 0.1 * H;
      K.flash(E.first ? 0.55 : 0.4); K.shake(Math.max(E.dur, 0.4), E.first ? 10 : 8);
      K.ring({ x: B.cx + G.xc, y: y, delay: 0.05 * k, dur: 0.34, r0: 8, r1: 0.55 * H, w0: 7, ink: "loss", cov: 0.86 });
      K.ring({ x: B.cx + G.xc, y: y, delay: 0.09 * k, dur: 0.36, r0: 6, r1: 0.7 * H, w0: 4, ink: "night", cov: 0.7 });
    },
    draw: function (K, E, e) {
      var g = K.g, B = K.box, f = K.fade(E, e), H = B.y1 - B.y0, c = K.clamp, G = geo(H), i, p, r = K.rand(E.seed ^ 0x5b11), cy = (B.y0 + B.y1) / 2;
      if (f <= 0) return;
      var k = c(E.dur / 0.9, 0.36, 1), tI = 0.05 * k, tP = tI + 0.17 * k, X = Math.min(0.4, Math.max(0.14, 0.3 * E.dur)), tE = Math.max(E.dur - X, tP + 0.08);
      var u = c((e - tE) / X, 0, 1), s1 = G.Lt * Math.pow(c((e - tI) / (0.17 * k), 0, 1), 0.8), s0 = G.Lt * Math.min(1, u * u / 0.49);
      var uf = 0.7 * Math.sqrt(1 - 0.06 * H / G.Lt), bw = 1, fall = u > uf ? (u - uf) * X : 0, py = G.yT + 0.1 * H, ph = e * 1.5;
      if (e > tP) bw += 0.12 * Math.exp(-(e - tP) / 0.25) * Math.cos(TAU * 3.6 * (e - tP));
      for (i = 0; i < 4 && E.dur > 0.75; i++) { p = tP + 0.2 + i * 0.42; if (p > tE - 0.14) break; if (e > p) bw += 0.05 * Math.exp(-(e - p) / 0.2) * Math.cos(TAU * 4 * (e - p)); }
      g.save(); g.beginPath(); g.rect(0, K.top, K.w, K.h - K.top); g.clip();
      g.translate(B.cx, cy); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      g.beginPath(); mold(g, G, 0.04 * H * (1 + 0.5 * Math.max(0, 1 - e / 0.05))); g.fillStyle = K.pat("night", 0.62 * (1 - 0.7 * K.smooth(0.55, 0.95, u)), g); g.fill("evenodd");
      g.beginPath();                                     // the pink: ribbon, crown, drops and the falling bulb in one path
      if (e < tI) { p = e / tI; drop(g, G.xc, py - 1.15 * H * (1 - p * p), 0.075 * H, 0.17 * H); }
      if (fall === 0 && s1 > 0 && s0 < G.Lt - 0.06 * H) ribbon(g, G, s0, s1, bw, ph);
      if (fall > 0) { var bx = Math.max(2, 0.11 * H * (1 - 2.2 * fall)), byy = G.by + 14 * H * fall * fall; g.moveTo(G.cx + bx, byy); g.ellipse(G.cx, byy, bx, 0.12 * H * (1 + 3 * fall), 0, 0, TAU); }
      for (i = 0; i < 4; i++) {                          // a slow leak: small drops plink into the stem while it holds
        var tj = tP + 0.2 + i * 0.42;
        if (E.dur < 0.75 || tj > tE - 0.14) break;
        if (e > tj - 0.07 && e < tj) { p = (e - tj + 0.07) / 0.07; drop(g, G.xc, py - 1.0 * H * (1 - p * p), 0.045 * H, 0.11 * H); }
      }
      for (i = 0; i < 14; i++) {                         // splash drops, ballistic from their age, shrinking as they are drunk by the card
        var an = -PI * (0.1 + 0.8 * r()), v = H * (0.8 + 2.2 * r()), life = 0.22 + 0.3 * r(), r0 = H * (0.014 + 0.032 * r() * r()), ag = e - tI - 0.01 * r();
        if (ag <= 0 || ag > life) continue;
        dot(g, G.xc + Math.cos(an) * v * ag * 0.5, py + Math.sin(an) * v * ag * 0.55 + 4.5 * H * ag * ag, r0 * Math.sqrt(1 - ag / life));
      }
      g.fillStyle = K.pat("loss", 0.7, g); g.fill();
      if (s1 > 0.15 * H && fall === 0 && s0 < G.Lt - 0.1 * H) {   // the lit side: a second, narrower pass, so the ink is brighter where it swells toward the light
        g.save(); g.translate(-0.035 * H, -0.03 * H); g.beginPath(); ribbon(g, G, s0 + 0.04 * H, Math.max(s0 + 0.05 * H, s1 - 0.05 * H), bw * 0.5, ph);
        g.fillStyle = K.pat("loss", 0.88, g); g.fill(); g.restore();
      }
      g.fillStyle = K.pat("loss", 0.82, g); g.beginPath();                                     // the crowns (their own fill: the hole must not cut the dome)
      if (e > tI && e < tI + 0.3 * k) crown(g, G.xc, py, H, (e - tI) / (0.3 * k), 9, K.rand(E.seed ^ 0x77), 1);
      for (i = 0; i < 4; i++) { p = tP + 0.2 + i * 0.42; if (E.dur < 0.75 || p > tE - 0.14) break; if (e > p && e < p + 0.16) crown(g, G.xc, py, H, (e - p) / 0.16, 6, K.rand(E.seed ^ (0x99 + i)), 0.5); }
      g.fill();
      if (s1 > 0.2 * H && fall === 0) {                  // the gloss: light strokes along the ribbon's lit edges
        var ya = Math.max(G.ay + s0 + 0.1 * H, G.ay + 0.12 * H), yb2 = Math.min(G.ay + s1 - 0.06 * H, G.by - 0.08 * H), w2 = G.Ws * bw;
        g.beginPath();
        if (yb2 > ya) g.rect(G.xc - w2 * 0.28, ya, w2 * 0.12, yb2 - ya);
        var xa = Math.max(G.xc + 0.14 * H, G.xc + s0 - G.Ls + 0.08 * H), xb = Math.min(G.xc + s1 - G.Ls - 0.06 * H, G.cx - 0.06 * H);
        if (xb > xa) g.rect(xa, G.yB - G.Wf * bw * 0.8, xb - xa, G.Wf * 0.12);
        g.fillStyle = K.pat("light", 0.5, g); g.fill();
      }
      g.restore();
    }
  });
})();
