/* art/loss/rundry.js: Running Dry. The drum pulls the L down the sheet (a ragged front) and runs out of ink on the way:
   the head of the stem prints heavy and saturated with a ridge of squeezed-out ink, the coverage falls down the pull into
   coarse dots, the foot is a dry comb of streaks fraying into dust. Then the dry print will not hold: from the toe back,
   column by column, the starved ink crumbles off the sheet and falls away as a shower of dots, until a heavy stem and the
   elbow are left, and that rides the drum off the bottom of the card. The slam's second ring runs dry too.
   Plates (two screened plates, each in two bands, so four short jobs): the pink L (a coverage ramp down the pull, carved
   streaks) and a key shadow plate a hair off (its own, thinner ramp). Live: the pull (a ragged front down the plate), the
   crumble (a clip of columns that recede at their own pace) and the falling dots. Beats: the pull 0.07 to 0.26 s, the
   crumble from 0.32 s to the exit, the ride off 0.1 to 0.35 s. Stretches with E.dur: the crumble. */
(function () {
  "use strict";
  var W = 144, H = 224, LX = 4, LY = 6, LH = 208, LW = 132, ST = 52, FT = 50;     // the plate (css px) and the L on it
  var PX = 70, PY = 118;                                                            // the plate point that sits at the hero's center
  var NC = 17;                                                                      // columns the crumble eats
  function lpath(K, g, dx, dy) {                        // the L as one closed contour, a hair of wobble, sharp at elbow and toe
    var r = K.rand(73), P = [[0, 0], [ST - 3, 0], [ST + 1, LH - FT], [LW, LH - FT + 2], [LW - 5, LH], [0, LH]], i, j, n, a, b;
    g.beginPath(); g.moveTo(LX + dx, LY + dy);
    for (i = 1; i <= 6; i++) {
      a = P[i - 1]; b = P[i % 6]; n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14);
      for (j = 1; j <= n; j++) g.lineTo(LX + dx + a[0] + (b[0] - a[0]) * j / n + (j < n ? (r() - 0.5) * 1.8 : 0), LY + dy + a[1] + (b[1] - a[1]) * j / n + (j < n ? (r() - 0.5) * 1.8 : 0));
    }
    g.closePath();
  }
  function ramp(K, g, m, dx, dy) {                      // the L filled with the pull's coverage: heavy at the head, running dry
    var gr = g.createLinearGradient(0, LY + dy, 0, LY + LH + dy);
    gr.addColorStop(0, K.tone(0.99 * m)); gr.addColorStop(0.28, K.tone(0.95 * m)); gr.addColorStop(0.52, K.tone(0.84 * m));
    gr.addColorStop(0.75, K.tone(0.7 * m)); gr.addColorStop(1, K.tone(0.42 * m));
    g.fillStyle = gr; lpath(K, g, dx, dy); g.fill();
    var tx = g.createLinearGradient(LX + ST + dx, 0, LX + LW + dx, 0);    // the toe is the driest part of the foot
    tx.addColorStop(0, K.tone(0)); tx.addColorStop(0.45, K.tone(0.22)); tx.addColorStop(1, K.tone(0.85));
    g.save(); g.globalCompositeOperation = "destination-out"; g.fillStyle = tx;
    g.fillRect(LX + ST + dx, LY + LH - FT - 4 + dy, LW - ST + 8, FT + 8); g.restore();
  }
  function inkPlate(K, g) {
    var r = K.rand(409), i, x, y, w;
    ramp(K, g, 1, 0, 0);
    g.fillStyle = K.tone(0.99);                         // the ridge of ink squeezed out where the drum landed
    g.beginPath(); g.moveTo(LX - 2, LY + 7);
    for (x = LX - 2; x <= LX + ST + 2; x += 5) g.lineTo(x, LY - 1.5 + r() * 2.5);
    g.lineTo(LX + ST + 2, LY + 7); g.closePath(); g.fill();
    g.save(); g.globalCompositeOperation = "destination-out"; g.fillStyle = K.tone(0.95);
    for (i = 0; i < 19; i++) {                          // dry streaks along the pull, more of them toward the foot
      x = LX + 3 + r() * (LW - 6); y = LY + LH * (0.34 + 0.5 * r()); w = 2.4 + r() * 2;
      if (x > LX + ST + 2 && y < LY + LH - FT) y = LY + LH - FT - 2 + r() * 14;
      g.fillRect(x, y, w, LY + LH - y + 4);
    }
    g.restore();
  }
  // the crumble's columns: x, width, how far each eats up (the foot's all the way, the stem's bottom), when it starts
  function columns(K) {
    var r = K.rand(821), cs = [], x = LX - 3, w, i = 0, u;
    while (x < LX + LW + 6) {
      w = 6.5 + r() * 5; u = (x - LX) / LW;
      cs.push({ x: x, w: w + 0.6, d: x < LX + ST ? LH * (0.1 + 0.1 * r()) : u < 0.62 ? FT * (0.35 + 0.35 * r()) : FT + 6, s: 0.62 * (1 - u) + 0.3 * r(), j: (r() - 0.5) * 18 });
      x += w; i++;
    }
    return cs;
  }
  function eaten(c, E) { return c.d * K_clamp((E - c.s) / Math.max(0.05, 1 - c.s)); }
  function K_clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  T82ART.add("loss", "rundry", {
    name: "Running Dry",
    by: "The drum pulls the L down the sheet and runs out of ink: saturated at the head, dots then streaks then dust at the foot, which crumbles off column by column in a shower of dots until a heavy stem rides off.",
    prep: function (K) {
      var st = K.st;
      // each plate prints in two bands (a gradient plate is the slowest thing to screen): two canvases, drawn one on the other
      function bands(key, pk, seed, ink, draw) {
        function band(i) {
          return function () {
            var k = st[pk].k, y0 = Math.round(i * H / 2 * k) / k, y1 = Math.round((i + 1) * H / 2 * k) / k;
            var c = K.screen(st[pk], ink, function (g) { g.beginPath(); g.rect(0, y0, W, y1 - y0); g.clip(); draw(g); });
            st[key + i] = c;
            if (i) st[pk] = null;
          };
        }
        return [function () { st[pk] = K.plate(W, H, seed); }, band(0), band(1)];
      }
      return bands("pk", "PP", 9301, "loss", function (g) { inkPlate(K, g); }).concat(bands("ky", "PQ", 9302, "key", function (g) { ramp(K, g, 0.62, 5, 4); }));
    },
    hit: function (K, E) {                              // the slam, one ink: a heavy ring and a second that runs dry
      var x = E.x, y = E.y, fi = E.first, R = fi ? 200 : 140;
      K.ring({ x: x, y: y, dur: 0.4, r0: 8, r1: R, w0: 12, ink: "loss", cov: 0.94 });
      K.ring({ x: x, y: y, delay: 0.08, dur: 0.46, r0: 6, r1: R + 26, w0: 7, ink: "loss", cov: 0.36 });
      K.spark({ x: x, y: y, n: fi ? 22 : 10, ink: "loss", sp: [140, fi ? 520 : 400], r: [1, fi ? 4 : 3], life: [0.3, 0.38], grav: 1500, seed: E.seed, streak: true });
      K.flash(fi ? 0.72 : 0.55); K.shake(Math.max(E.dur, 0.42), fi ? 13 : 10);
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, f = K.fade(E, e);
      if (!st.pk1 || !st.ky1 || f <= 0) return;
      var Hh = B.y1 - B.y0, cx = B.cx, cy = (B.y0 + B.y1) / 2, s = 0.98 * Hh / LH, size = B.size;
      var X = Math.min(0.35, 0.25 * E.dur), tP = K.clamp(E.dur * 0.12, 0.07, 0.2), pull = K.clamp(e / tP, 0, 1);
      var q = K.clamp((e - (E.dur - X)) / X, 0, 1), ride = q * q, dy = 0.9 * size * ride;
      var front = pull * (LY + LH + 8);                 // plate y of the drum's edge
      var tE = 0.32, tEnd = E.dur - X - 0.04, Et = tEnd - tE > 0.12 ? K.clamp((e - tE) / (tEnd - tE), 0, 1) : 0;
      Et = Et * (2 - Et);                               // the crumble starts fast and slows as the heavy stem holds
      var cs = columns(K), r = K.rand(E.seed ^ 0x51ed), i, c, n = 46, k, life, age, x0, y0, vx, vy, R, x, y, dd, te, sq = 1 - 0.05 * Math.sin(pull * Math.PI);
      g.save();
      g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      g.translate(cx, cy + dy); g.scale(s, s * sq); g.translate(-PX, -PY);
      g.beginPath();                                    // the drum's front is a ragged edge; later, what the crumble has left: a comb of columns, each eaten up from its foot
      for (i = 0; i < cs.length; i++) { c = cs[i]; g.rect(c.x, 0, c.w, Math.min(front + c.j * Math.sin(pull * Math.PI), LY + LH + 8 - eaten(c, Et))); }
      g.clip();
      g.drawImage(st.ky0, 0, 0, W, H); g.drawImage(st.ky1, 0, 0, W, H);
      g.drawImage(st.pk0, 0, 0, W, H); g.drawImage(st.pk1, 0, 0, W, H);
      g.restore();
      g.save(); g.globalCompositeOperation = K.blend; g.globalAlpha = f;
      g.fillStyle = K.pat("loss", 0.86, g);
      g.beginPath();
      for (i = 0; i < n; i++) {                         // the dots the crumble sheds: each lets go when its column's front reaches it
        k = Math.floor(r() * cs.length); c = cs[k];
        dd = r() * Math.min(c.d, c.x < LX + ST ? c.d : FT) * 0.92;
        x0 = c.x + r() * c.w; y0 = LY + LH - dd;
        vx = 8 + r() * 46; vy = 10 + r() * 60; life = 0.4 + r() * 0.4; R = 1.2 + r() * 1.9;
        te = tE + (1 - Math.sqrt(Math.max(0, 1 - Math.min(0.999, c.s + dd / c.d * (1 - c.s))))) * (tEnd - tE);
        age = Math.max(0, e - te);
        if (Et <= 0 || e < te || age > life) continue;
        x = cx + (x0 - PX + vx * age) * s; y = cy + dy + (y0 - PY + vy * age + 150 * age * age) * s;
        R = R * (1 - age / life) * s;
        g.moveTo(x + R, y); g.arc(x, y, R, 0, 6.2832);
      }
      g.fill();
      g.restore();
    }
  });
})();
