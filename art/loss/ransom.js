/* art/loss/ransom.js: Ransom Note. L, O, S, S cut from four different print sources (a heavy poster face, a typewriter
   face, a slanted headline, an outlined one), each on its own scrap of paper in its own ink, with a rough scissor or
   torn edge and a lilac print-shadow crescent. They are thrown in one by one from alternate sides, spinning, and slap
   flat at crooked angles, the L twice the others. Held, they boil on twos like stop-motion paper; then a gust takes them
   off the card sideways, spinning, the last in first out.
   Beats: slaps at 0, .06, .11, .16 (half as far apart in a short moment); hold; exit the last 0.1 + X s (X = .3 dur, at most .3).
   Plates: four screened scraps (loss, night, light, loss) with the letters knocked out to the stock; shadows live. */
(function () {
  "use strict";
  var W = 140, H = 206, CX = 70, CY = 103, TAU = Math.PI * 2;
  // the scraps: ink, coverage, face [weight, family, style], size, letter height (of the scrap) and stretch, cut style,
  // seed, place in the row (x, y from the row's middle), rest angle, slap time, which side it flies in from
  var S = [
    { ch: "L", ink: "loss", cov: 0.9, f: [700, "disp", ""], w: 118, h: 200, gh: 0.84, sx: 1.12, torn: 1, seed: 11, x: -124, y: 0, a: -0.06, t: 0, side: -1 },
    { ch: "O", ink: "night", cov: 0.88, f: [700, "mono", ""], w: 86, h: 124, gh: 0.68, sx: 1, torn: 0, seed: 23, x: -16, y: 34, a: 0.12, t: 0.06, side: 1 },
    { ch: "S", ink: "light", cov: 0.8, f: [700, "disp", "italic "], w: 80, h: 134, gh: 0.8, sx: 1.12, torn: 0, seed: 35, x: 60, y: 22, a: -0.1, t: 0.11, side: -1 },
    { ch: "S", ink: "loss", cov: 0.86, f: [700, "mono", ""], w: 90, h: 120, gh: 0.7, sx: 1, out: 1, torn: 1, seed: 47, x: 138, y: 38, a: 0.08, t: 0.16, side: 1 }
  ];

  // a scrap's cut edge as points around its center: scissor snips (straight runs, off-square corners), or torn (fine jag)
  function cut(K, d) {
    var r = K.rand(d.seed), hw = d.w / 2, hh = d.h / 2, c = [], P = [], i, j, n, a, b, t, q, tr;
    for (i = 0; i < 4; i++) c.push([(i % 3 ? 1 : -1) * hw + (r() - 0.5) * 6, (i < 2 ? -1 : 1) * hh + (r() - 0.5) * 6]);
    for (i = 0; i < 4; i++) {
      a = c[i]; b = c[(i + 1) % 4]; tr = d.torn && i === 1;
      n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / (tr ? 3 : 24)));
      for (j = 0; j < n; j++) {
        t = j / n; q = (tr ? 3 : 1.3) * (r() - 0.5) * 2;
        P.push([a[0] + (b[0] - a[0]) * t + (tr ? q : 0), a[1] + (b[1] - a[1]) * t + (tr ? 0 : q)]);
      }
    }
    return P;
  }
  function trace(g, P) { g.beginPath(); for (var i = 0; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); }
  // one scrap's tone: the paper at its coverage, the letter knocked out of it to the stock
  function scrap(K, g, d, P) {
    g.translate(CX, CY);
    g.fillStyle = K.tone(d.cov); trace(g, P); g.fill();
    var face = d.f[2] + K.font(d.f[0], 100, d.f[1]), m, px, a, de;
    g.font = face; g.textBaseline = "alphabetic"; g.textAlign = "left";
    m = g.measureText(d.ch); px = d.gh * d.h * 100 / (m.actualBoundingBoxAscent || 70);
    g.font = d.f[2] + K.font(d.f[0], px, d.f[1]); m = g.measureText(d.ch);
    a = m.actualBoundingBoxAscent; de = m.actualBoundingBoxDescent;
    g.globalCompositeOperation = "destination-out"; g.fillStyle = K.tone(1); g.strokeStyle = K.tone(1); g.lineJoin = "round";
    g.scale(d.sx, 1);
    if (d.out) {                                        // an outline face: a dark line, the paper half left inside
      g.fillStyle = K.tone(0.55); g.fillText(d.ch, (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2, (a - de) / 2);
      g.lineWidth = 4.4; g.strokeText(d.ch, (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2, (a - de) / 2);
    } else g.fillText(d.ch, (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2, (a - de) / 2);
  }

  T82ART.add("loss", "ransom", {
    name: "Ransom Note",
    by: "L, O, S, S cut from four different print sources on rough paper scraps are thrown in one at a time and slap down at crooked angles, the L biggest, then a gust takes them.",
    prep: function (K) {
      var st = K.st;
      st.cut = []; st.can = [];
      var jobs = [function () { st.P = K.plate(W, H, 3307); }];
      S.forEach(function (d, i) {
        jobs.push(function () {
          st.cut[i] = cut(K, d);
          st.can[i] = K.screen(st.P, d.ink, function (g) { scrap(K, g, d, st.cut[i]); });
        });
      });
      return jobs;
    },
    hit: function (K, E) {
      var B = K.box, i;
      K.spark({ x: B.cx - 60, y: (B.y0 + B.y1) / 2, n: 14, ink: function (q) { return q() < 0.5 ? "light" : "loss"; }, sp: [140, 380], r: [1.2, 3], life: [0.25, 0.3], grav: 700, seed: E.seed, streak: true });
      K.flash(E.first ? 0.6 : 0.42);
      K.shake(Math.max(E.dur, 0.42), E.first ? 8 : 6);
      for (i = 1; i < S.length; i++) K.jolt(K.card, [{ transform: "translate(0px,0px)" }, { transform: "translate(" + (S[i].side * 3) + "px,2px) rotate(" + (S[i].side * 0.3) + "deg)" }, { transform: "translate(0px,0px)" }], { duration: 90, delay: tOf(E, i) * 1000, easing: "ease-out" });
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, f = fadeOf(E, e);
      if (!st.can || st.can.length < S.length || !st.can[S.length - 1] || f <= 0) return;
      var BW = B.x1 - B.x0, s = K.clamp(Math.min((B.y1 - B.y0) / 200, (BW - 44) / 360), 0.4, 1.3), cx = B.cx, cy = (B.y0 + B.y1) / 2;
      var c = pace(E), fl = 0.055 * c, X = Math.min(0.3, 0.3 * E.dur), sg = 0.025 * c, n = S.length, eh = Math.floor(e * 8);
      var t1 = Math.max(0.16 * c + fl + 0.01, E.dur - 0.1 - X), FT = Math.max(0.09, Math.min(X + 0.1, E.dur - 0.02 - t1 - (n - 1) * sg));
      var away = E.y > B.cy ? -1 : 1, i, d, a, u, x, y, rot, sx, sy, z, ex, j, t2;
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      for (i = 0; i < n; i++) {
        d = S[i]; a = e - tOf(E, i); if (a < 0) continue;
        x = cx + d.x * s; y = cy + d.y * s; rot = d.a; sx = 1; sy = 1; z = 1;
        if (a < fl) {                                   // thrown in from its side, spinning, stretched along the flight
          u = a / fl; ex = (1 - u) * (1 - u);
          x += d.side * ex * (BW * 0.62); y -= away * ex * 0.1 * B.size; rot += d.side * ex * 1.6; sx = 1 + 0.3 * ex; sy = 1 - 0.12 * ex; z = 1 + 0.2 * (1 - u);
        } else {
          if (a < fl + 0.05 * c) { u = Math.sin((a - fl) / (0.05 * c) * Math.PI); sx = 1 + 0.07 * u; sy = 1 - 0.07 * u; }   // the slap's squash
          j = (eh + i * 2) % 3 - 1; rot += 0.014 * j; y += 0.8 * j;                                                          // stop-motion boil
          t2 = t1 + (n - 1 - i) * sg;                                                                                         // the gust, last in first out
          if (e > t2) { u = Math.min(1, (e - t2) / FT); ex = u * u; x += d.side * ex * (BW * 0.75 + 60); y += away * ex * 0.35 * B.size * (i % 2 ? 1 : 0.5); rot += d.side * ex * 2.6; sx = 1 + 0.25 * ex; }
        }
        g.save(); g.translate(x, y); g.scale(sx, sy); g.rotate(rot); g.scale(z * s, z * s);
        if (a >= fl) {                                  // the print-shadow: a crescent of night along the lower right
          g.save(); g.beginPath(); g.rect(-W, -H, W * 2, H * 2); trace2(g, st.cut[i]); g.clip("evenodd");
          g.translate(5, 5); trace(g, st.cut[i]); g.fillStyle = K.pat("night", 0.6, g); g.fill(); g.restore();
        }
        g.drawImage(st.can[i], -CX, -CY, W, H);
        g.restore();
      }
      g.restore();
    }
  });
  function trace2(g, P) { for (var i = 0; i < P.length; i++) g[i ? "lineTo" : "moveTo"](P[i][0], P[i][1]); g.closePath(); }
  function pace(E) { return Math.max(0.5, Math.min(1, (E.dur - 0.12) / 0.5)); }   // a short moment slaps its scraps faster
  function tOf(E, i) { return S[i].t * pace(E); }
  function fadeOf(E, e) { var w = Math.min(0.2, 0.3 * E.dur); return e > E.dur - w ? Math.max(0, (E.dur - e) / w) : 1; }
})();
