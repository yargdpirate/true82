/* ---------- TRUE 82 LAB concept: the ledger ----------
   The perfect season as the reel prints it: a ledger of sunflower coins, one
   per win. Read it like a page, top left to bottom right: the coins run hotter
   as the streak grows (a pink overprint warms them to orange) and the last one
   lands big, milled like a real coin, with 82 struck on its face and a paper
   gleam. Count them: 81 small coins, and the big one makes 82. */
(function () {
  var R = window.RISO, TAU = Math.PI * 2;
  var N = 13, P = 92 / N, OX = 4, OY = 4;                   // the ledger grid
  var BX = 60.5, BY = 60.5, BR = 33;                         // the 82nd coin
  var coins = [];
  (function () {
    var i, j, r0 = P * 0.4;
    for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
      var x = OX + (i + 0.5) * P, y = OY + (j + 0.5) * P;
      if (Math.sqrt((x - BX) * (x - BX) + (y - BY) * (y - BY)) >= BR + r0 + 1.8) coins.push({ x: x, y: y });
    }
    // 81 of them; the streak heats up in reading order
    coins.forEach(function (c, k) { c.k = k / (coins.length - 1); c.r = P * (0.33 + 0.09 * c.k); });
  })();
  var FONT = "700 46px \"Barlow Condensed\", \"Arial Narrow\", sans-serif";

  function ink82(g, how, lw) {
    g.save();
    g.font = FONT; g.textAlign = "center"; g.textBaseline = "alphabetic";
    var m = g.measureText("82"), asc = m.actualBoundingBoxAscent || 37, sx = Math.min(1, 38 / (m.width || 38));
    g.translate(BX + 0.4, BY + asc / 2 + 0.6); g.scale(sx * 1.04, 1);
    if (how === "stroke") { g.lineWidth = lw; g.lineJoin = "round"; g.strokeText("82", 0, 0); }
    else { g.fillText("82", 0, 0); g.lineWidth = 1.1; g.strokeText("82", 0, 0); }
    g.restore();
  }
  function milled(g, r, n) {                                 // the reeded edge of the coin, as short ticks
    g.beginPath();
    for (var i = 0; i < n; i++) { var a = i / n * TAU, c = Math.cos(a), s = Math.sin(a); g.moveTo(BX + c * (r - 2.6), BY + s * (r - 2.6)); g.lineTo(BX + c * r, BY + s * r); }
  }
  function sparkle(g, x, y, r) {                            // a four point gleam, waisted like a lens flare
    var w = r * 0.2;
    g.beginPath(); g.moveTo(x, y - r);
    g.quadraticCurveTo(x + w, y - w, x + r, y); g.quadraticCurveTo(x + w, y + w, x, y + r);
    g.quadraticCurveTo(x - w, y + w, x - r, y); g.quadraticCurveTo(x - w, y - w, x, y - r); g.closePath();
  }

  window.LAB.concept({
    id: "ledger", name: "The ledger", blurb: "Eighty-one sunflower coins, then the eighty-second lands big with 82 struck on it.",
    draw: function (K) {
      var thin = false;
      K.part("glow", function (g, S) {                       // the streak heating up, and the big coin burning hot
        thin = S.style === "line" || S.style === "neon";
        if (!thin) coins.forEach(function (c) { if (c.k > 0.2) { g.fillStyle = S.tone(0.62 * (c.k - 0.2) / 0.8); R.circle(g, c.x, c.y, c.r); g.fill(); } });
        R.circle(g, BX, BY, BR + 16);
        g.fillStyle = S.rad(g, BX, BY, BR - 1, BR + 16, [[0, thin ? 0 : 0.5], [0.08, 0.34], [1, 0]]); g.fill();
        if (!thin) { R.circle(g, BX, BY, BR - 1); g.fillStyle = S.tone(0.5); g.fill(); }
        sparkle(g, BX + BR * 0.78, BY - BR * 0.86, 9); g.fillStyle = S.tone(1); g.fill();
      });
      K.part("body", function (g, S) {
        coins.forEach(function (c) {
          R.circle(g, c.x, c.y, c.r);
          if (thin) S.stroke(g, 1); else S.fill(g);
        });
        R.circle(g, BX, BY, BR); S.fill(g);
      });
      K.part("shade", function (g, S) {                      // the big coin is round: light from the upper left
        R.circle(g, BX, BY, BR);
        g.fillStyle = S.rad(g, BX - BR * 0.45, BY - BR * 0.5, 0, BR * 1.75, [[0, 0], [0.4, 0.02], [0.72, 0.32], [1, 0.62]]); S.fill(g);
      });
      K.part("paper", function (g) {                         // the keyline around the struck 82, and the gleam on the coin
        ink82(g, "stroke", 4.6);
        g.beginPath(); g.ellipse(BX - BR * 0.52, BY - BR * 0.5, BR * 0.2, BR * 0.07, -0.78, 0, TAU); g.fill();
      });
      K.part("line", function (g, S) {
        R.circle(g, BX, BY, BR); S.stroke(g, 2.6);
        R.circle(g, BX, BY, BR - 5.4); S.stroke(g, 1.2);
        milled(g, BR - 0.8, 72); S.stroke(g, 0.9);
        ink82(g, "fill");
      });
    }
  });
})();
