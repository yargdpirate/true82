/* art/loss/rundry.js: Running Dry. The drum pulls the L down the sheet and runs out of ink on the way: the head of the
   stem prints heavy and saturated with a ridge of squeezed-out ink, the coverage falls down the pull into coarse dots,
   the foot is a dry comb of streaks fraying into dust at the toe. As the print dries it sheds flecks, a trickle of
   them drifting off the foot, and then it rides the drum off the bottom of the card.
   Plates (two screened jobs): the pink L (a coverage ramp down the pull, carved streaks, stray flecks) and a key
   shadow plate a hair off (its own, thinner ramp). Live: the drum's pull (a wipe down the plate) and the shed flecks.
   Beats: the pull 0.07 to 0.26 s (0.16 of the hold), the shedding all through the tail, the ride off 0.1 to 0.35 s. */
(function () {
  "use strict";
  var W = 224, H = 252, LX = 26, LY = 14, LH = 208, LW = 132, ST = 52, FT = 50;     // the plate (css px) and the L on it
  var PX = 92, PY = 126;                                                            // the plate point that sits at the hero's center
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
    gr.addColorStop(0, K.tone(0.99 * m)); gr.addColorStop(0.3, K.tone(0.96 * m)); gr.addColorStop(0.55, K.tone(0.88 * m));
    gr.addColorStop(0.77, K.tone(0.78 * m)); gr.addColorStop(1, K.tone(0.5 * m));
    g.fillStyle = gr; lpath(K, g, dx, dy); g.fill();
    var tx = g.createLinearGradient(LX + ST + dx, 0, LX + LW + dx, 0);    // the toe is the driest part of the foot
    tx.addColorStop(0, K.tone(0)); tx.addColorStop(0.45, K.tone(0.2)); tx.addColorStop(1, K.tone(0.85));
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
    for (i = 0; i < 17; i++) {                          // dry streaks along the pull, more of them toward the foot
      x = LX + 3 + r() * (LW - 6); y = LY + LH * (0.34 + 0.5 * r()); w = 2.4 + r() * 2;
      if (x > LX + ST + 2 && y < LY + LH - FT) y = LY + LH - FT - 2 + r() * 14;
      g.fillRect(x, y, w, LY + LH - y + 4);
    }
    g.restore();
    g.fillStyle = K.tone(0.9);                          // flecks the drum threw past the toe and under the foot
    for (i = 0; i < 26; i++) {
      x = LX + LW - 20 + r() * 70; y = LY + LH - FT - 6 + r() * (FT + 30);
      if (x > LX + LW + 4 || y > LY + LH + 3) { g.beginPath(); g.arc(x, y, 1.1 + r() * 2.1, 0, 6.2832); g.fill(); }
    }
  }
  T82ART.add("loss", "rundry", {
    name: "Running Dry",
    by: "The drum pulls the L down the sheet and runs out of ink: saturated at the head, dots then streaks then dust at the foot, flecks drifting off.",
    prep: function (K) {
      var st = K.st;
      return [
        function () { st.pk = K.screen(K.plate(W, H, 9301), "loss", function (g) { inkPlate(K, g); }); },
        function () { st.ky = K.screen(K.plate(W, H, 9302), "key", function (g) { ramp(K, g, 0.62, 5, 4); }); }
      ];
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, f = K.fade(E, e);
      if (!st.pk || !st.ky || f <= 0) return;
      var Hh = B.y1 - B.y0, cx = B.cx, cy = (B.y0 + B.y1) / 2, s = 0.98 * Hh / LH, size = B.size;
      var X = Math.min(0.35, 0.25 * E.dur), tP = K.clamp(E.dur * 0.12, 0.07, 0.2), pull = K.clamp(e / tP, 0, 1);
      var q = K.clamp((e - (E.dur - X)) / X, 0, 1), ride = q * q, dy = 0.5 * size * ride;
      var front = pull * (LY + LH + 8 - 0) + 0;          // plate y of the drum's edge
      var r = K.rand(E.seed ^ 0x51ed), i, n = 28, tail = Math.max(0.15, E.dur - X - tP), age, life, x0, y0, vx, vy, k, R, x, y;
      var sq = 1 - 0.05 * Math.sin(pull * Math.PI);      // the sheet stretches a little under the drum
      g.save();
      g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      g.translate(cx, cy + dy); g.scale(s, s * sq);
      g.beginPath(); g.rect(-PX, -PY, W, front); g.clip();
      g.drawImage(st.ky, -PX, -PY, W, H);
      g.drawImage(st.pk, -PX, -PY, W, H);
      g.restore();
      g.save(); g.globalCompositeOperation = K.blend; g.globalAlpha = f;
      g.fillStyle = K.pat("loss", 0.86, g);
      g.beginPath();
      for (i = 0; i < n; i++) {                          // the flecks the drying foot sheds: analytic from their age
        x0 = LX + ST + 6 + r() * (LW - ST); y0 = LY + LH - r() * FT * 0.6; vx = 25 + r() * 80; vy = -20 + r() * 70; life = 0.35 + r() * 0.4; R = 1.3 + r() * 2.2;
        age = e - (tP + 0.04 + (i / n) * tail * 0.9 + r() * 0.05);
        if (age < 0 || age > life) continue;
        k = 1 - age / life;
        x = cx + (x0 - PX + vx * age) * s; y = cy + dy + (y0 - PY + vy * age + 90 * age * age) * s;
        g.moveTo(x + R * k * s, y); g.arc(x, y, R * k * s, 0, 6.2832);
      }
      g.fill();
      g.restore();
    }
  });
})();
