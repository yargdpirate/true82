/* art/loss/misfeed.js: Misfeed. The drum misfeeds. The aqua pass drops first, a straight L; then the pink L slams over it
   whole and, a hair later, the sheet slips: a diagonal fault opens through the stem and the whole lower half of the L
   (foot and all) jerks to the right and a little down, overshoots, buzzes on twos and creeps on, leaving a stock slit
   through the stem with the aqua pass showing beside it, and streaks of ink dragged off the stem at the slip. In a long
   moment the sheet slips again, about every 0.4 s. Then the sheet is yanked through the machine to the right, the lower
   half first, smeared. The beauty of a bad print. The slam's second ring is aqua and slipped sideways.
   Plates (four screened plates, each cut to its own piece, two short jobs each): the aqua L (tint 0.36), the pink upper
   half, the pink lower half, and the dragged streaks (a dot-size ramp), all cut along one jagged fault. Beats: aqua lands
   0.04 s, pink 0.06, the slip 0.075 to 0.16 s, then the buzz; the yank takes the last 0.1 to 0.35 s. Stretches with E.dur:
   the repeat slips. */
(function () {
  "use strict";
  var LH = 200, LW = 122, ST = 48, FT = 46;                                         // the L in master coordinates (its top-left is 0, 0)
  var FY = 110, FS = -0.28;                                                         // the fault: y = FY + FS * x
  var DX = 0.1 * LH, DY = 5, ROT = 0.03;                                           // the slip's size
  var UP = [-6, -6, 62, 120], LO = [-6, 62, 130, 206], SM = [-104, 100, 4, 162], AQ = [-6, -6, 132, 208];   // each plate: x0, y0, x1, y1 (master)
  function lpath(K, g) {                                // the L as one closed contour, a hair of wobble, sharp at elbow and toe
    var r = K.rand(97), P = [[0, 0], [ST - 3, 0], [ST + 1, LH - FT], [LW, LH - FT + 2], [LW - 5, LH], [0, LH]], i, j, n, a, b;
    g.beginPath(); g.moveTo(0, 0);
    for (i = 1; i <= 6; i++) {
      a = P[i - 1]; b = P[i % 6]; n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14);
      for (j = 1; j <= n; j++) g.lineTo(a[0] + (b[0] - a[0]) * j / n + (j < n ? (r() - 0.5) * 1.8 : 0), a[1] + (b[1] - a[1]) * j / n + (j < n ? (r() - 0.5) * 1.8 : 0));
    }
    g.closePath();
  }
  function half(K, g, up) {                             // clip to one side of the jagged fault
    var r = K.rand(311), x, y;
    g.beginPath();
    g.moveTo(-240, up ? -240 : 420);
    for (x = -240; x <= 240; x += 9) g.lineTo(x, FY + FS * x + (r() - 0.5) * 2.6);
    g.lineTo(240, up ? -240 : 420); g.closePath(); g.clip();
  }
  function streaks(K, g) {                              // ink dragged off the stem's left edge at the slip: a ramp of dots
    var r = K.rand(411), i, y, len, h, x0 = 1, gr;
    for (i = 0; i < 8; i++) {
      y = FY + 8 + i * 4.4 + r() * 2.4; h = 2.8 + r() * 3.2; len = 44 + r() * 52;
      gr = g.createLinearGradient(x0, 0, x0 - len, 0);
      gr.addColorStop(0, K.tone(0.95)); gr.addColorStop(0.55, K.tone(0.5)); gr.addColorStop(1, K.tone(0.06));
      g.fillStyle = gr; g.fillRect(x0 - len, y, len, h);
    }
  }
  function piece(K, st, key, ink, seed, box, draw) {    // two jobs: the plate's grain and starve, then the screening
    return [function () { st["P" + key] = K.plate(box[2] - box[0], box[3] - box[1], seed); }, function () {
      st[key] = K.screen(st["P" + key], ink, function (g) { g.translate(-box[0], -box[1]); draw(K, g); });
      st["P" + key] = null;
    }];
  }
  function put(K, g, can, box, x, y, rot, s, sx, sy, a, clipX) {   // a piece at master (x, y) in css px, turned about the fault's middle
    if (a <= 0.004 || !can) return;
    g.save(); g.globalAlpha = Math.min(1, a); g.globalCompositeOperation = K.blend;
    g.translate(x, y); g.translate(60 * s, 93 * s); g.rotate(rot); g.translate(-60 * s, -93 * s); g.scale(s * sx, s * sy);
    if (clipX != null) { g.beginPath(); g.rect(clipX, box[1] - 2, box[2] - clipX, box[3] - box[1] + 4); g.clip(); }
    g.drawImage(can, box[0], box[1], box[2] - box[0], box[3] - box[1]);
    g.restore();
  }
  T82ART.add("loss", "misfeed", {
    name: "Misfeed",
    by: "The drum misfeeds: a straight aqua L, then a pink one over it whose lower half slips sideways along a diagonal fault, buzzing, with ink dragged off the stem, before the sheet is yanked off the card.",
    prep: function (K) {
      var st = K.st;
      return piece(K, st, "aq", "pop", 9102, AQ, function (K2, g) { g.fillStyle = K2.tone(0.36); lpath(K2, g); g.fill(); }).concat(
        piece(K, st, "up", "loss", 9101, UP, function (K2, g) { g.save(); half(K2, g, true); g.fillStyle = K2.tone(0.95); lpath(K2, g); g.fill(); g.restore(); }),
        piece(K, st, "lo", "loss", 9103, LO, function (K2, g) { g.save(); half(K2, g, false); g.fillStyle = K2.tone(0.95); lpath(K2, g); g.fill(); g.restore(); }),
        piece(K, st, "sm", "loss", 9104, SM, streaks));
    },
    hit: function (K, E) {                              // the slam: a pink ring, and an aqua one that slipped sideways
      var x = E.x, y = E.y, fi = E.first, R = fi ? 200 : 140;
      K.ring({ x: x, y: y, dur: 0.4, r0: 8, r1: R, w0: 11, ink: "loss", cov: 0.92 });
      K.ring({ x: x - 26, y: y + 3, delay: 0.09, dur: 0.46, r0: 6, r1: R + 14, w0: 7, ink: "pop", cov: 0.62 });
      K.spark({ x: x, y: y, n: fi ? 26 : 12, ink: function (q) { return q() < 0.2 ? "pop" : "loss"; }, sp: [180, fi ? 620 : 470], r: [1.1, fi ? 5 : 3.7], life: [0.3, 0.38], grav: 1500, seed: E.seed, streak: true });
      K.flash(fi ? 0.72 : 0.55); K.shake(Math.max(E.dur, 0.42), fi ? 13 : 10);
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, f = K.fade(E, e);
      if (!st.aq || !st.up || !st.lo || !st.sm || f <= 0) return;
      var Hh = B.y1 - B.y0, s = Hh / LH, size = B.size, X = Math.min(0.35, 0.25 * E.dur);
      var tail = K.clamp((e - 0.3) / Math.max(0.12, E.dur - 0.3 - X), 0, 1);
      var q = K.clamp((e - (E.dur - X)) / X, 0, 1), yank = q * q, qu = K.clamp((q - 0.14) / 0.86, 0, 1);
      var pa = K.clamp(e / 0.04, 0, 1), pp = K.clamp(e / 0.06, 0, 1), m, v, r, i, t, b, tot = 0, drop = 0, amp = 0;
      // the slip, and in a long moment the sheet slips again (about every 0.4 s): each one jerks the lower half on, then buzzes
      for (i = 0, t = 0.075; i < 4 && (i === 0 || t < E.dur - X - 0.12); i++, t = 0.55 + 0.4 * i) {
        b = K.ease.back(K.clamp((e - t) / 0.085, 0, 1));
        tot += (i ? Math.max(0.25, 0.6 - 0.12 * i) : 1) * b; drop += (i ? 3 : DY) * b;
        if (e > t + 0.085) amp = Math.max(amp, Math.exp(-(e - t - 0.085) * 5));
      }
      var sl = K.clamp((e - 0.075) / 0.085, 0, 1);
      r = K.rand((E.seed ^ Math.floor(e * 12)) >>> 0);                                // the buzz, on twos
      var jx = (r() - 0.5) * 3.4 * amp, jy = (r() - 0.5) * 2 * amp;
      var slip = DX * (tot + 0.2 * tail) * s;
      var x0 = B.cx - (LW + 1.4 * DX - 17) / 2 * s, y0 = (B.y0 + B.y1) / 2 - LH / 2 * s;      // the L's top-left, the lot centered on the box
      var nx = x0 - 0.03 * size * (1 - pp * pp), ny = y0 - 0.6 * size * (1 - pp * pp);   // the pink drops in from above
      var ay = y0 - 0.55 * size * (1 - pa * pa), ax = x0 - 17 * s;                         // the aqua lands first, a good way left of where the pink will print
      var sq = 1 - 0.05 * Math.sin(K.clamp((e - 0.06) / 0.1, 0, 1) * Math.PI);
      if (pa < 1) for (m = 1; m <= 2; m++) { v = K.clamp(pa - 0.25 * m, 0, 1); put(K, g, st.aq, AQ, ax + 1.5 * size * yank, y0 - 0.55 * size * (1 - v * v) - 5 * s, 0, s, 1.04, 1.12, f * (0.42 - 0.15 * m)); }
      put(K, g, st.aq, AQ, ax + 1.5 * size * yank, ay - 5 * s, 0, s, 1, 1, f * (0.4 + 0.6 * pa));
      if (pp < 1) for (m = 1; m <= 2; m++) { v = K.clamp(pp - 0.22 * m, 0, 1); put(K, g, st.up, UP, nx, y0 - 0.6 * size * (1 - v * v), 0, s, 0.96, 1.1, f * (0.4 - 0.14 * m)); put(K, g, st.lo, LO, nx, y0 - 0.6 * size * (1 - v * v), 0, s, 0.96, 1.1, f * (0.4 - 0.14 * m) * 0.7); }
      var ux = nx + jx * 0.4 + 1.5 * size * (qu * qu), lx = nx + slip + jx + 1.5 * size * yank, ly = ny + drop * s + jy;
      put(K, g, st.up, UP, ux, ny + jy * 0.4, 0, s, 1, sq, f * (0.4 + 0.6 * pp));
      // the lower half turns a hair about the fault's middle as it slips
      put(K, g, st.lo, LO, lx, ly, ROT * Math.min(tot, 1.7), s, 1, 1, f * (0.4 + 0.6 * pp));
      if (sl > 0) put(K, g, st.sm, SM, lx, ly, ROT * Math.min(tot, 1.7), s, 1 + 0.03 * tail, 1, f, 4 - 108 * K.ease.out(K.clamp((e - 0.08) / 0.09, 0, 1)));
      if (yank > 0) for (m = 1; m <= 2; m++) put(K, g, st.lo, LO, lx - 0.3 * size * m * yank, ly, ROT, s, 1 + 0.5 * yank, 1, f * 0.3 / m);
    }
  });
})();
