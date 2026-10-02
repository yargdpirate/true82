/* art/loss/copier.js: Generation Loss. A photocopier's light bar scans the card and prints the L behind it, crisp:
   COPY 1. Then the bar goes back over it, and again, and each pass copies the last copy: the letter swells, its edges
   chew, toner clots on the contour and the solids drop out, until the fourth generation is a blob. The bar's wake
   lights what it just printed (lilac white where it overlaps the pink). The blob jitters on twos while it waits, then
   the machine ejects it to the right.
   Plates: four generations of the one L, each its own screened plate (the starve never lines up: five short jobs):
   stroke width 0, 5, 10, 19 px, edge wobble 0.6 to 6 px, clumps and drop-outs seeded per generation. The bar and the
   COPY n label are live (light, K.pat). Beats: scan 0 lasts 0.07 s (the L reads at 0.09 s); each later scan 0.12 s,
   spaced by what E.dur allows (two to four generations). The ejection takes the last 0.1 to 0.35 s. */
(function () {
  "use strict";
  var H = 168, W = 116, ST = 45, FT = 43, PAD = 16, PW = W + 2 * PAD, PH = H + 2 * PAD;
  var AMP = [0.6, 2, 3.8, 6], LWD = [0, 5, 10, 19], CLUMP = [0, 4, 9, 15], GRAIN = [0, 50, 130, 210], DROP = [0, 4, 9, 7];
  function gen(K, g, k) {                               // generation k of the L: swollen, chewed, clotted, dropped out
    var r = K.rand(8300 + k * 31), P = [[0, 0], [ST, 0], [ST, H - FT], [W, H - FT], [W, H], [0, H]], pts = [], i, j, n, a, b, x, y, t;
    g.save(); g.translate(PAD, PAD); g.beginPath();
    for (i = 0; i < 6; i++) {
      a = P[i]; b = P[(i + 1) % 6]; n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 9);
      for (j = 0; j < n; j++) {
        x = a[0] + (b[0] - a[0]) * j / n + (j ? (r() - 0.5) * 2 * AMP[k] : 0); y = a[1] + (b[1] - a[1]) * j / n + (j ? (r() - 0.5) * 2 * AMP[k] : 0);
        pts.push([x, y]); g[pts.length > 1 ? "lineTo" : "moveTo"](x, y);
      }
    }
    g.closePath(); g.fillStyle = K.tone(0.95); g.strokeStyle = K.tone(0.95); g.lineWidth = LWD[k]; g.lineJoin = "round";
    g.fill(); if (k) g.stroke();
    for (i = 0; i < CLUMP[k]; i++) {                    // toner clots along the contour
      t = pts[Math.floor(r() * pts.length)];
      g.beginPath(); g.ellipse(t[0] + (r() - 0.5) * 8, t[1] + (r() - 0.5) * 8, 2.4 + r() * 4.6, 2.4 + r() * 4.6, r() * 3, 0, 6.2832); g.fill();
    }
    if (k > 1) { g.beginPath(); g.arc(ST + 2, H - FT - 2, k > 2 ? 15 : 7, 0, 6.2832); g.fill(); }   // the elbow fills in
    g.globalCompositeOperation = "destination-out";
    for (i = 0; i < DROP[k]; i++) {                     // a few big drop-outs
      g.fillStyle = K.tone(0.95); g.beginPath(); g.ellipse(r() * W, r() * H, 3 + r() * 5, 3 + r() * 6, r() * 3, 0, 6.2832); g.fill();
    }
    g.restore();
  }
  function punch(K, c, k, d) {                          // the copier's grain: small see-through drop-outs punched into the printed dots
    var g = c.getContext("2d"), r = K.rand(8350 + k * 17), i;
    g.save(); g.setTransform(d, 0, 0, d, 0, 0); g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000";
    for (i = 0; i < GRAIN[k]; i++) { g.globalAlpha = 0.3 + r() * 0.6; g.beginPath(); g.ellipse(PAD + r() * W, PAD + r() * H, 1 + r() * 1.4, 1 + r() * 1.4, r() * 3, 0, 6.2832); g.fill(); }
    g.restore();
  }
  T82ART.add("loss", "copier", {
    name: "Generation Loss",
    by: "A copier's light bar scans the L onto the card, then scans the copy, and the copy of the copy: each generation swells, chews and clots until it is a blob the machine ejects.",
    prep: function (K) {
      var st = K.st, jobs = [function () { st.P = K.plate(PW, PH, 8399); st.G = []; }], k;
      function one(k) { return function () { st.G[k] = K.screen(st.P, "loss", function (g) { gen(K, g, k); }); if (k === 3) st.P = null; }; }
      function grain(k) { return function () { punch(K, st.G[k], k, K.d); }; }
      for (k = 0; k < 4; k++) { jobs.push(one(k)); if (k) jobs.push(grain(k)); }
      return jobs;
    },
    hit: function (K, E) {
      var x = E.x, y = E.y, fi = E.first, R = fi ? 200 : 140;
      K.ring({ x: x, y: y, dur: 0.4, r0: 8, r1: R, w0: 11, ink: "loss", cov: 0.92 });
      K.ring({ x: x, y: y, delay: 0.06, dur: 0.4, r0: 6, r1: R * 0.85, w0: 7, ink: "light", cov: 0.6 });
      K.spark({ x: x, y: y, n: fi ? 22 : 10, ink: "loss", sp: [160, fi ? 540 : 400], r: [1.1, fi ? 4.4 : 3.2], life: [0.3, 0.38], grav: 1500, seed: E.seed, streak: true });
      K.flash(fi ? 0.72 : 0.55); K.shake(Math.max(E.dur, 0.42), fi ? 13 : 10);
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, f = K.fade(E, e), k, i;
      if (!st.G || !st.G[3] || f <= 0) return;
      var Hh = B.y1 - B.y0, s = Math.min(1.04 * Hh / (H + 12), (K.w - 24) / PW), cy = (B.y0 + B.y1) / 2, X = Math.min(0.35, 0.25 * E.dur);
      var n = E.dur < 0.6 ? 2 : E.dur < 1.2 ? 3 : 4, gap = K.clamp((E.dur - X - 0.27) / Math.max(1, n - 1), 0.16, 0.4);
      var q = K.clamp((e - (E.dur - X)) / X, 0, 1), eh = Math.floor(e * 12) / 12, rj = K.rand((E.seed ^ (eh * 12)) >>> 0);
      var ts = [0], du = [0.07];
      for (i = 1; i < n; i++) { ts.push(0.13 + (i - 1) * gap); du.push(0.12); }
      for (k = n - 1; k > 0 && e < ts[k]; k--);          // the scan in progress (or the last one)
      var p = K.clamp((e - ts[k]) / du[k], 0, 1), d = k % 2 ? -1 : 1;
      var w = PW * s, h = PH * s, x0 = B.cx - w / 2, y0 = cy - h / 2, xa = x0 - 16, xb = x0 + w + 16, bx = d > 0 ? xa + (xb - xa) * p : xb - (xb - xa) * p;
      var jit = k > 1 && p >= 1 && q === 0 ? 1.6 : 0, tx = 0.95 * K.w * q * q;
      g.save(); g.globalCompositeOperation = K.blend; g.globalAlpha = f;
      function put(c, lo, hi, dx, dy) {                  // one generation, only between lo and hi (x)
        g.save(); g.beginPath(); g.rect(lo, y0 - 20, hi - lo, h + 40); g.clip();
        g.translate(tx + dx, dy); g.rotate(0.1 * q * q);
        g.drawImage(c, x0, y0, w, h); g.restore();
      }
      var ox = (rj() - 0.5) * 2 * jit, oy = (rj() - 0.5) * 2 * jit;
      if (p < 1) {                                       // mid-scan: the old copy ahead of the bar, the new one behind it
        if (k) put(st.G[k - 1], d > 0 ? bx : xa - 400, d > 0 ? xb + 400 : bx, 0, 0);
        put(st.G[k], d > 0 ? xa - 400 : bx, d > 0 ? bx : xb + 400, 0, 0);
      } else put(st.G[k], xa - 400, xb + 400 + K.w, ox, oy);
      if (p > 0 && p < 1) {                              // the lamp: a bar and the wake it leaves on the fresh print
        var bw = [8, 16, 26], bc = [0.88, 0.5, 0.25], at = 0;
        for (i = 0; i < 3; i++) {
          g.beginPath(); g.rect(d > 0 ? bx - at - bw[i] : bx + at, y0 - 10, bw[i], h + 20); at += bw[i];
          g.fillStyle = K.pat("light", bc[i], g); g.fill();
        }
      }
      if (K.ready && (k || p > 0.35)) K.text(g, "COPY " + (k + 1), x0 + (PAD + ST + 13) * s + tx, y0 + (PAD + 20) * s, { ink: "light", cov: 0.88, align: "left", font: K.font(700, 12, "mono"), spacing: 1 });
      g.restore();
    }
  });
})();
