/* ---------- TRUE 82 LAB concept: the shape of a season ----------
   The results page print, shrunk to a mark: a round window on a riso
   landscape. A ridge climbs left to right (every win lifts it a step), a
   basketball sun hangs over it with its seams cut to paper, and the water
   under the waterline catches glints. Sky tone in the shade ink, the sun in
   the body ink, the ridge in the line ink, the water in the accent ink, and a
   pink band toward the horizon that warms the sun's lower half. */
(function () {
  var R = window.RISO;
  var CX = 50, CY = 50, RD = 46, WL = 71;          // the window and the waterline
  var SX = 35, SY = 33, SR = 15.5;                // the sun
  // the ridge: peaks that climb to the right, each higher than the last, the climb speeding up like a hot streak
  var RIDGE = [[-4, 71], [6, 66], [10, 68], [18, 61], [23, 64], [26, 63.2], [34, 54], [40, 58.5], [46, 56], [55, 45], [60, 50], [64, 48.5],
    [73, 36], [78, 41], [88, 25], [92, 28], [104, 22]];
  // a far ridge behind it, softer and lower, printed as tone
  var FAR = [[-4, 58], [4, 54], [12, 57], [21, 50.5], [30, 55], [38, 52], [47, 57], [58, 49], [70, 52], [104, 44]];

  function disc(g) { R.circle(g, CX, CY, RD); }
  function clip(g) { disc(g); g.clip(); }
  function ridgeTop(g, dy) { dy = dy || 0; g.moveTo(RIDGE[0][0], RIDGE[0][1] + dy); for (var i = 1; i < RIDGE.length; i++) g.lineTo(RIDGE[i][0], RIDGE[i][1] + dy); }
  function far(g) { g.beginPath(); g.moveTo(FAR[0][0], FAR[0][1]); for (var i = 1; i < FAR.length; i++) g.lineTo(FAR[i][0], FAR[i][1]); g.lineTo(104, WL); g.lineTo(-4, WL); g.closePath(); }
  function ridge(g) { g.beginPath(); ridgeTop(g); g.lineTo(104, WL); g.lineTo(-4, WL); g.closePath(); }
  // the sky tucks a little under the ridge, so a slip of register never opens a paper gap
  function sky(g) { g.beginPath(); ridgeTop(g, 2.2); g.lineTo(104, -2); g.lineTo(-4, -2); g.closePath(); }
  function reflection(g) {                         // the ridge mirrored under the waterline, squashed
    g.beginPath(); g.moveTo(-2, WL);
    for (var i = 0; i < RIDGE.length; i++) g.lineTo(RIDGE[i][0], WL + (WL - RIDGE[i][1]) * 0.42);
    g.lineTo(102, WL); g.closePath();
  }
  function water(g) { g.beginPath(); g.rect(-2, WL, 104, 100 - WL); }
  // glints on the water: short bars, longer and denser under the sun
  var GL = [];
  (function () {
    var r = R.mulberry(82), k;
    for (k = 0; k < 16; k++) {
      var t = k / 15, y = WL + 3.2 + t * 19, w = 3 + r() * 6 * (1 - t * 0.4), x = 8 + r() * 80;
      GL.push({ x: x, y: y, w: w, h: 1.25 + t * 0.6, sun: false });
    }
    for (k = 0; k < 6; k++) { var yy = WL + 3 + k * 3.4, ww = 13 - k * 1.4; GL.push({ x: SX - ww / 2 + (k % 2 ? 1.2 : -0.8), y: yy, w: ww, h: 1.5 + k * 0.1, sun: true }); }
  })();

  function la(S) { return S.style === "line" || S.style === "neon"; }
  function flatish(S) { return S.style === "flat" || S.style === "stamp" || S.style === "sticker" || S.style === "cut"; }
  // flat styles: the sky as the old sunset stripes, thinning toward the horizon
  function stripes(g, y0, y1, n, k0, k1) {
    g.beginPath();
    for (var i = 0; i < n; i++) { var t = i / (n - 1), y = y0 + (y1 - y0) * t, h = (y1 - y0) / n * (k0 + (k1 - k0) * t); g.rect(-2, y, 104, h); }
  }

  window.LAB.concept({
    id: "sunset-ridge", name: "Shape of a season", blurb: "The results print as a mark: a ridge climbing to 82-0, a ball sun, glints on the water.",
    draw: function (K) {
      K.part("shade", function (g, S) {                 // the sky: deep at the top, open around the sun
        g.save(); clip(g);
        if (flatish(S)) {
          sky(g); g.clip(); stripes(g, 2, WL - 6, 6, 0.95, 0.18); g.fillStyle = S.tone(1); g.fill();
          R.knock(g, function (g2) { R.circle(g2, SX, SY, SR + 4); g2.fill(); });
        } else {
          sky(g); g.fillStyle = S.lin(g, 0, 4, 0, WL, [[0, 0.8], [0.45, 0.42], [1, 0.1]]); S.fill(g);
          R.knock(g, function (g2) { R.circle(g2, SX, SY, SR * 2.3); g2.fillStyle = R.rgrad(g2, SX, SY, SR, SR * 2.3, [[0, 0.95], [1, 0]]); g2.fill(); });
        }
        if (!la(S)) { far(g); g.fillStyle = S.tone(flatish(S) ? 1 : 0.62); g.fill(); }
        reflection(g); g.fillStyle = S.tone(0.5); S.fill(g);
        g.restore();
      });
      K.part("glow", function (g, S) {                  // the pink band toward the horizon, which also warms the sun
        if (la(S)) return;
        g.save(); clip(g);
        if (flatish(S)) { sky(g); g.clip(); stripes(g, WL - 30, WL, 4, 0.3, 0.9); g.fill(); }
        else { sky(g); g.fillStyle = R.vgrad(g, 10, WL, [[0, 0], [0.4, 0.12], [0.8, 0.46], [1, 0.62]]); g.fill(); }
        R.circle(g, SX, SY, SR); g.fillStyle = R.vgrad(g, SY - SR, SY + SR, [[0, 0], [0.45, 0.08], [1, 0.62]]); g.fill();
        g.restore();
      });
      K.part("accent", function (g, S) {                // the water
        g.save(); clip(g);
        water(g); g.fillStyle = S.lin(g, 0, WL, 0, 96, [[0, 0.42], [0.35, 0.62], [1, 0.9]]); S.fill(g);
        g.restore();
      });
      K.part("body", function (g, S) {                  // the sun, with a warm halo in the sky
        if (S.mode !== "sil" && !la(S) && !flatish(S)) {
          g.save(); clip(g);
          R.circle(g, SX, SY, SR * 1.9); g.fillStyle = R.rgrad(g, SX, SY, SR, SR * 1.9, [[0, 0.5], [1, 0]]); g.fill();
          g.restore();
        }
        R.circle(g, SX, SY, SR); S.fill(g);
      });
      K.part("line", function (g, S) {                  // the ridge, the waterline and the rim of the window
        g.save(); clip(g);
        ridge(g); S.fill(g);
        g.beginPath(); g.moveTo(0, WL + 0.4); g.lineTo(100, WL + 0.4); S.stroke(g, 1.5);
        g.restore();
        if (la(S)) { R.circle(g, SX, SY, SR); S.stroke(g, 2); g.save(); R.circle(g, SX, SY, SR); g.clip(); R.seam(g, SX, SY, SR, 0.5); S.stroke(g, 1.8); g.restore(); }
        disc(g); S.stroke(g, 3);
      });
      K.part("paper", function (g, S) {                 // seams cut into the sun, glints cut into the water
        if (la(S)) return;
        g.save(); R.circle(g, SX, SY, SR - 0.3); g.clip();
        g.lineWidth = 2; g.lineCap = "round"; R.seam(g, SX, SY, SR, 0.5); g.stroke();
        g.restore();
        g.save(); clip(g);
        GL.forEach(function (b) { R.roundRect(g, b.x, b.y, b.w, b.h, b.h / 2); g.fill(); });
        g.restore();
      });
      K.part("body", function (g, S) {                  // the sun's path on the water, printed on the cut glints
        if (S.mode === "sil" || la(S)) return;
        g.save(); clip(g);
        GL.forEach(function (b) { if (b.sun) { g.fillStyle = S.tone(0.95); R.roundRect(g, b.x, b.y, b.w, b.h, b.h / 2); g.fill(); } });
        g.restore();
      });
    }
  });
})();
