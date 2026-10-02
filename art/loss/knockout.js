/* art/loss/knockout.js: Knockout. A flood of pink ink washes over the card in a band, a foamy light crest riding its
   front, with the L cut out of it: the letter is the one place the ink never reached, the card itself showing through,
   its lower right edge trapped by a violet plate printed a hair off. The surface slops and swells while it stands (a
   long moment sloshes a second wave through). Then it drains: the waterline falls, rivulets of ink streaking up the wall behind it, and a
   pale film of ink is left on the wall above (the L still cut out of it) that thins as it runs off the card.
   Everything is live: one body polygon (pink 0.84), a film polygon above the waterline (0.5, then 0.31), the crest and
   the violet sliver, all clipped by the L's contour with the even-odd rule. No prep. Beats: the wave crosses in 0.05 to
   0.09 s (a short moment floods dimmer, 0.62, so a card-wide mass never blinks hard); the swell at 0.08 s; the second
   wave at about 0.4 of the hold. Stretches with E.dur: the standing and the slosh. The drain takes the last 0.1 to 0.35 s. */
(function () {
  "use strict";
  var PI = Math.PI;
  function hole(K, g, x, y, H) {                        // the L cut out, one closed contour at (x, y), a hair of wobble, sharp at elbow and toe
    var r = K.rand(5231), W = 0.66 * H, S = 0.31 * H, F = 0.27 * H, P = [[0, 0], [S, 0], [S, H - F], [W, H - F], [W, H], [0, H]], i;
    for (i = 0; i < 6; i++) g[i ? "lineTo" : "moveTo"](x + P[i][0] + (r() - 0.5) * 1.4, y + P[i][1] + (r() - 0.5) * 1.4);
    g.closePath();
  }
  T82ART.add("loss", "knockout", {
    name: "Knockout",
    by: "A flood of pink washes across the card with the L knocked out of it, then drains down and away, running in streaks and leaving a thin film.",
    hit: function (K, E) {
      var x = E.x, y = E.y, fi = E.first, R = fi ? 200 : 140;
      K.ring({ x: x, y: y, dur: 0.4, r0: 8, r1: R, w0: 11, ink: "loss", cov: 0.92 });
      K.ring({ x: x + 9, y: y + 7, delay: 0.05, dur: 0.46, r0: 6, r1: R + 22, w0: 7, ink: "night", cov: 0.6 });
      K.spark({ x: x, y: y, n: fi ? 24 : 12, ink: "loss", sp: [160, fi ? 560 : 420], r: [1.1, fi ? 4.6 : 3.4], life: [0.3, 0.38], grav: 1500, seed: E.seed, streak: true });
      K.flash(fi ? 0.72 : 0.55); K.shake(Math.max(E.dur, 0.42), fi ? 13 : 10);
    },
    draw: function (K, E, e) {
      var g = K.g, B = K.box, f = K.fade(E, e), i, x, y, r = K.rand(E.seed ^ 5309);
      if (f <= 0) return;
      var W = K.w, y0 = B.y0, y1 = B.y1, Hh = y1 - y0, Hl = 0.78 * Hh, hx = B.cx - 0.33 * Hl, hy = y0 + (Hh - Hl) / 2;
      var X = Math.min(0.35, 0.25 * E.dur), q = K.clamp((e - (E.dur - X)) / X, 0, 1), D = q * q;
      var tw = K.clamp(E.dur, 0.29, 0.6) * 0.25 + 0.01, p = K.clamp(e / tw, 0, 1), cov = E.dur < 0.5 ? 0.62 : 0.84;
      var swell = 8 * Math.sin(PI * K.clamp((e - tw) / 0.16, 0, 1)) * (e > tw ? 1 : 0);
      var fing = [], fw = [], fl = [];
      for (i = 0; i < 7; i++) { fing.push(W * (0.07 + 0.86 * r())); fw.push(9 + 7 * r()); fl.push(Hh * (0.22 + 0.34 * r())); }
      var w2 = E.dur > 1 ? 0.42 * E.dur : -9;            // the second slosh crosses the surface
      function top(xx) {                                 // the waterline (before the drain)
        var d = xx - W * K.clamp((e - w2) / 0.5, 0, 1) * 1.3;
        return y0 + 5 * Math.sin(xx / 31 + 1.3 + e * 2.2) + 2.6 * Math.sin(xx / 13 + 4 + e * 3.1) - swell - 12 * Math.exp(-d * d / 2600) * (w2 > 0 && e > w2 ? 1 : 0);
      }
      function bot(xx) { return y1 + 3 * Math.sin(xx / 27 + 0.4) + 1.6 * Math.sin(xx / 11 + 2); }
      function lvb(xx) { return Math.min(top(xx) + D * Hh * 1.12, bot(xx)); }     // the waterline once it drains
      function lvl(xx) {                                 // and the rivulets of ink that cling above it, longest mid-drain
        var t = lvb(xx), k, u;
        for (k = 0; k < 7; k++) { u = (xx - fing[k]) / (fw[k] / 2); if (u > -1 && u < 1) t -= Math.max(fw[k] / 2, fl[k] * Math.sin(PI * Math.min(1, D))) - fw[k] / 2 * (1 - Math.sqrt(1 - u * u)); }
        return Math.max(t, top(xx));
      }
      function poly(a, b) {                              // the area between two edges, as a path
        g.beginPath();
        for (x = -6; x <= W + 6; x += 4) g[x < -5 ? "moveTo" : "lineTo"](x, a(x));
        for (x = W + 6; x >= -6; x -= 4) g.lineTo(x, b(x));
        g.closePath();
      }
      function front(yy) { return W * 1.06 * K.ease.out(p) - 30 + 11 * Math.sin(yy / 15 + 2) + 6 * Math.sin(yy / 6); }
      g.save(); g.globalCompositeOperation = K.blend; g.globalAlpha = f;
      g.beginPath(); g.rect(-10, y0 - 70, W + 20, Hh + 140); hole(K, g, hx, hy, Hl); g.clip("evenodd");     // the L is never inked
      if (p < 1) {                                       // the wave front: ink only behind it
        g.beginPath(); g.moveTo(-20, y0 - 70);
        for (y = y0 - 70; y <= y1 + 70; y += 5) g.lineTo(front(y), y);
        g.lineTo(-20, y1 + 70); g.closePath(); g.clip();
      }
      if (D > 0) {                                       // the film: what the waterline left on the wall
        poly(top, lvl); g.fillStyle = K.pat("loss", D < 0.55 ? 0.5 : 0.31, g); g.fill();
      }
      if (D > 0) { poly(lvl, lvb); g.fillStyle = K.pat("loss", cov, g); g.fill(); }
      if (D < 0.999) {                                   // the body: a thin edge, then bands of ink parted by flow lines that sway with the surface
        var T = [0, 0.1, 0.36, 0.6, 0.82, 1], k;
        var at = function (t, j, o) {
          return function (xx) { var a = lvb(xx), b = bot(xx); return a + (b - a) * t + o + (j % 5 ? 5 * Math.sin(xx / (34 + 9 * j) + j * 1.7 + e * 1.4) * Math.min(1, (b - a) / 40) : 0); };
        };
        for (k = 0; k < 5; k++) {
          poly(at(T[k], k, k ? 1.6 : 0), at(T[k + 1], k + 1, k < 4 ? -1.6 : 0));
          g.fillStyle = K.pat("loss", k ? cov : cov * 0.66, g); g.fill();
        }
        if (p < 1) {                                     // the crest foams on the front
          g.save(); poly(lvb, bot); g.clip();
          g.beginPath(); g.moveTo(front(y0 - 70) - 9, y0 - 70);
          for (y = y0 - 70; y <= y1 + 70; y += 5) g.lineTo(front(y) - 9, y);
          for (y = y1 + 70; y >= y0 - 70; y -= 5) g.lineTo(front(y), y);
          g.closePath(); g.fillStyle = K.pat("light", 0.7, g); g.fill(); g.restore();
        }
      }
      g.restore();
      if (D < 0.999 && p > 0.6) {                        // the violet plate, off register: a sliver trapped inside the cut's lower right edge
        g.save(); g.globalCompositeOperation = K.blend; g.globalAlpha = f;
        poly(lvb, bot); g.clip();
        g.beginPath(); hole(K, g, hx, hy, Hl); g.clip();
        g.beginPath(); g.rect(-10, y0 - 70, W + 20, Hh + 140); hole(K, g, hx - 7, hy - 6, Hl); g.clip("evenodd");
        g.fillStyle = K.pat("night", 0.66, g); g.fillRect(-10, y0 - 70, W + 20, Hh + 140);
        g.restore();
      }
    }
  });
})();
