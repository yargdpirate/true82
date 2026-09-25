/* ---------- TRUE 82 LAB concept: the scoreboard ----------
   The center-hung board over the court, reading 82-0 in bulbs: an upper
   ring on two cables, the main screens (the front face and two side faces
   turning away into shade), a lower ring with a ribbon of lights, and arena
   light spilling down to the floor. The screen prints in the line ink; lit
   bulbs are holes through it with a hot-ink bulb in each, so the numbers read
   on any stock (a dark screen on cream, a bright screen on dark stock). At
   small sizes the lit bulbs merge into strokes. */
(function () {
  var R = window.RISO;
  // a chunky 3 x 5 bulb font: what an old arena board really used
  var FONT = {
    "8": ["###", "#.#", "###", "#.#", "###"],
    "2": ["###", "..#", "###", "#..", "###"],
    "-": ["..", "..", "##", "..", ".."],
    "0": ["###", "#.#", "#.#", "#.#", "###"]
  };
  var TEXT = "82-0", COLS = 14, ROWS = 7;                      // a dark row above and below the figures
  var FX = 10, FY = 29, FW = 80;                               // the front face
  var SX = FX + 4, SW = FW - 8, P = SW / COLS, SH = ROWS * P, SY = FY + 4;
  var FH = SH + 8, FB = FY + FH;
  var SIDE = 7.4, SLANT = 3.6;                                  // the side faces, turning away
  var bulbs = [];
  (function () {
    var col = 0, i, c, r;
    for (c = 0; c < COLS; c++) for (r = 0; r < ROWS; r++) bulbs.push({ c: c, r: r, on: false });
    for (i = 0; i < TEXT.length; i++) {
      var f = FONT[TEXT[i]], w = f[0].length;
      for (c = 0; c < w; c++) for (r = 0; r < 5; r++) if (f[r][c] === "#") bulbs[(col + c) * ROWS + r + 1].on = true;
      col += w + 1;
    }
    bulbs.forEach(function (b) { b.x = SX + (b.c + 0.5) * P; b.y = SY + (b.r + 0.5) * P; });
  })();
  var RON = P * 0.5, RBULB = P * 0.42, ROFF = P * 0.11, DIM = false;   // DIM: pinpoint the dark bulbs too (busier)

  function face(g) { R.roundRect(g, FX, FY, FW, FH, 2.6); }
  function screen(g) { R.roundRect(g, SX - 1, SY - 1, SW + 2, SH + 2, 1.6); }
  function sides(g) {
    g.beginPath();
    g.moveTo(FX, FY + 0.6); g.lineTo(FX - SIDE, FY + SLANT); g.lineTo(FX - SIDE, FB - SLANT); g.lineTo(FX, FB - 0.6); g.closePath();
    g.moveTo(FX + FW, FY + 0.6); g.lineTo(FX + FW + SIDE, FY + SLANT); g.lineTo(FX + FW + SIDE, FB - SLANT); g.lineTo(FX + FW, FB - 0.6); g.closePath();
  }
  function sideBulbs(g, r) {                                   // the side screens, seen edge-on: a column of lit bulbs each, foreshortened
    g.beginPath();
    [FX - SIDE * 0.5, FX + FW + SIDE * 0.5].forEach(function (x) {
      for (var k = 0; k < 5; k++) { var y = SY + (k + 1.5) * P; g.moveTo(x + r * 0.5, y); g.ellipse(x, y, r * 0.5, r, 0, 0, Math.PI * 2); }
    });
  }
  function upper(g) { R.roundRect(g, 21, FY - 8, 58, 8.6, 2.4); }
  function lower(g) { R.roundRect(g, 19, FB - 0.6, 62, 7.6, 2.4); }
  function lit(g, r) { g.beginPath(); bulbs.forEach(function (b) { if (b.on) { g.moveTo(b.x + r, b.y); g.arc(b.x, b.y, r, 0, Math.PI * 2); } }); }
  function dark(g, r) { g.beginPath(); bulbs.forEach(function (b) { if (!b.on) { g.moveTo(b.x + r, b.y); g.arc(b.x, b.y, r, 0, Math.PI * 2); } }); }
  function ribbon(g, r) { g.beginPath(); for (var i = 0; i < 17; i++) { var x = 24 + i * 52 / 16; g.moveTo(x + r, FB + 3.2); g.arc(x, FB + 3.2, r, 0, Math.PI * 2); } }

  window.LAB.concept({
    id: "scoreboard", name: "Scoreboard", blurb: "The center-hung board reads 82-0 in bulbs. The bulbs are the halftone dots.",
    draw: function (K) {
      K.part("glow", function (g, S) {                        // arena light: a halo round the board, a wash down to the floor, every lit bulb hot
        var thin = S.style === "line" || S.style === "neon";
        R.roundRect(g, FX - SIDE - 14, FY - 20, FW + SIDE * 2 + 28, FH + 34, 24);
        g.fillStyle = S.rad(g, 50, FY + FH * 0.5, 34, 68, [[0, 0.32], [0.5, 0.12], [1, 0]]); g.fill();
        g.beginPath(); g.moveTo(24, FB + 7); g.lineTo(76, FB + 7); g.lineTo(96, 104); g.lineTo(4, 104); g.closePath();
        g.fillStyle = S.lin(g, 0, FB + 7, 0, 104, [[0, 0.4], [1, 0]]); g.fill();
        if (thin) return;
        g.fillStyle = S.tone(0.7); lit(g, RBULB); g.fill();
      });
      K.part("body", function (g, S) {
        face(g); S.fill(g);
        sides(g); S.fill(g);
        upper(g); S.fill(g);
        lower(g); S.fill(g);
        if (S.style === "line" || S.style === "neon" || S.mode === "sil") return;
        R.knock(g, function (g2) { screen(g2); g2.fill(); lower(g2); g2.fill(); });   // the screen and the lower ring are not body ink...
        lit(g, RBULB); g.fill();                                                        // ...except the lit bulbs, each in a ring of bare paper
        ribbon(g, 0.95); g.fill();
      });
      K.part("shade", function (g, S) {                       // the side faces turn away; the belly of the board falls into shade
        face(g); g.fillStyle = S.lin(g, 0, FY, 0, FB, [[0, 0], [0.5, 0.06], [1, 0.4]]); S.fill(g);
        upper(g); g.fillStyle = S.lin(g, 0, FY - 8, 0, FY, [[0, 0], [1, 0.28]]); S.fill(g);
      });
      K.part("line", function (g, S) {
        var thin = S.style === "line" || S.style === "neon";
        g.beginPath(); g.moveTo(27, 0.8); g.lineTo(27, FY - 8.4); g.moveTo(73, 0.8); g.lineTo(73, FY - 8.4); S.stroke(g, 1.7);
        upper(g); S.stroke(g, 2);
        sides(g); if (thin) S.stroke(g, 2); else { S.fill(g); S.stroke(g, 2); }   // the side screens
        face(g); S.stroke(g, 2.4);
        lower(g); if (thin) S.stroke(g, 2); else S.fill(g);
        if (thin) {                                           // line art: the numbers are the only filled thing
          screen(g); S.stroke(g, 1.6);
          lit(g, RON * 0.9); g.fill();
          return;
        }
        screen(g); S.fill(g);
        if (S.mode === "sil") return;
        R.knock(g, function (g2) {
          lit(g2, RON); g2.fill();
          if (DIM) { dark(g2, ROFF); g2.fill(); }
          ribbon(g2, 1.25); g2.fill();
          sideBulbs(g2, RON * 0.92); g2.fill();
        });
      });
      K.part("paper", function (g) {                          // the star on the upper ring and two bolts
        R.star(g, 50, FY - 3.7, 3.4, 1.45, 5); g.fill();
        R.circle(g, 33, FY - 3.7, 0.95); g.fill(); R.circle(g, 67, FY - 3.7, 0.95); g.fill();
      });
    }
  });
})();
