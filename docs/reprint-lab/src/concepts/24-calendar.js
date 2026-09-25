/* ---------- TRUE 82 LAB concept: the season calendar ----------
   A wall calendar page on two rings, every game night checked off, and a
   rubber stamp slammed across it: 82-0. The page is a light tint of the hot
   ink, the checks are drawn by hand in the key ink, the stamp prints in the
   third ink, a little starved, with a keyline of bare paper so it reads. */
(function () {
  var R = window.RISO;
  var PX = 9, PY = 13, PW = 82, PH = 83, HB = 15;            // the page and its header band
  var COLS = 7, ROWS = 5, GX = PX + 5, GY = PY + HB + 5, GW = PW - 10, GH = PH - HB - 9;
  var CW = GW / COLS, CH = GH / ROWS;
  var SCX = 50.5, SCY = 63, SROT = -0.2, SW = 74, SH = 34;      // the stamp
  var RINGS = [GX + CW, GX + GW - CW];                          // between the columns, clear of the letters
  var FONT = "700 38px \"Barlow Condensed\", \"Arial Narrow\", sans-serif";
  var MONO = "600 7.6px \"IBM Plex Mono\", monospace";

  function page(g) {                                          // the page, with a soft curl at the bottom right
    g.beginPath(); g.moveTo(PX + 2, PY); g.lineTo(PX + PW - 2, PY); g.quadraticCurveTo(PX + PW, PY, PX + PW, PY + 2);
    g.lineTo(PX + PW, PY + PH - 10); g.quadraticCurveTo(PX + PW - 3, PY + PH - 3, PX + PW - 11, PY + PH);
    g.lineTo(PX + 2, PY + PH); g.quadraticCurveTo(PX, PY + PH, PX, PY + PH - 2); g.lineTo(PX, PY + 2); g.quadraticCurveTo(PX, PY, PX + 2, PY); g.closePath();
  }
  function curl(g) {                                          // the lifted corner
    g.beginPath(); g.moveTo(PX + PW, PY + PH - 10); g.quadraticCurveTo(PX + PW - 3, PY + PH - 3, PX + PW - 11, PY + PH);
    g.quadraticCurveTo(PX + PW - 9.5, PY + PH - 5, PX + PW - 12.5, PY + PH - 12.5); g.quadraticCurveTo(PX + PW - 5, PY + PH - 9.5, PX + PW, PY + PH - 10); g.closePath();
  }
  function header(g) { g.beginPath(); g.moveTo(PX + 2, PY); g.lineTo(PX + PW - 2, PY); g.quadraticCurveTo(PX + PW, PY, PX + PW, PY + 2); g.lineTo(PX + PW, PY + HB); g.lineTo(PX, PY + HB); g.lineTo(PX, PY + 2); g.quadraticCurveTo(PX, PY, PX + 2, PY); g.closePath(); }
  function checks(g) {                                        // one hand-drawn check per night, each a little different
    var rnd = R.mulberry(82), i, j;
    g.beginPath();
    for (j = 0; j < ROWS; j++) for (i = 0; i < COLS; i++) {
      if (i + j * COLS > 33) continue;                        // the season runs out on the last row
      var x = GX + i * CW + CW * 0.5, y = GY + j * CH + CH * 0.54, s = Math.min(CW, CH) * 0.36, w = (rnd() - 0.5) * 0.9, v = (rnd() - 0.5) * 0.9;
      g.moveTo(x - s * 0.95 + w, y - s * 0.05 + v); g.quadraticCurveTo(x - s * 0.5, y + s * 0.2, x - s * 0.22, y + s * 0.62);
      g.quadraticCurveTo(x + s * 0.2, y - s * 0.3, x + s * 1.05 - w, y - s * 0.95 + v);
    }
  }
  function grid(g) {
    g.beginPath();
    for (var i = 1; i < COLS; i++) { g.moveTo(GX + i * CW, GY); g.lineTo(GX + i * CW, GY + GH); }
    for (var j = 1; j < ROWS; j++) { g.moveTo(GX, GY + j * CH); g.lineTo(GX + GW, GY + j * CH); }
  }
  function onStamp(g, fn) { g.save(); g.translate(SCX, SCY); g.rotate(SROT); fn(g); g.restore(); }
  function stampText(g, how, lw) {
    g.font = FONT; g.textAlign = "center"; g.textBaseline = "alphabetic";
    var m = g.measureText("82-0"), asc = m.actualBoundingBoxAscent || 24, sx = Math.min(1.25, (SW - 13) / (m.width || 50));
    g.save(); g.translate(0, asc / 2 + 0.4); g.scale(sx, 1);
    if (how === "stroke") { g.lineWidth = lw; g.lineJoin = "round"; g.strokeText("82-0", 0, 0); }
    else { g.fillText("82-0", 0, 0); g.lineWidth = 0.9; g.strokeText("82-0", 0, 0); }
    g.restore();
  }
  function stampBox(g, inset) { R.roundRect(g, -SW / 2 + inset, -SH / 2 + inset, SW - inset * 2, SH - inset * 2, 4.5 - inset * 0.5); }

  window.LAB.concept({
    id: "calendar", name: "Season calendar", blurb: "Every game night checked off, and a rubber stamp across the page: 82-0.",
    draw: function (K) {
      K.part("body", function (g, S) {
        page(g); g.fillStyle = S.tone(0.34); S.fill(g);
        if (S.mode !== "sil") R.knock(g, function (g2) { curl(g2); g2.fill(); });
        curl(g); g.fillStyle = S.tone(0.16); S.fill(g); g.fillStyle = S.tone(1);   // the back of the page, catching the light
      });
      K.part("shade", function (g, S) {                      // the page bows away at the bottom; the curl throws a shadow
        page(g); g.fillStyle = S.lin(g, 0, PY + HB, 0, PY + PH, [[0, 0], [0.6, 0.04], [1, 0.26]]); S.fill(g);
        R.knock(g, function (g2) { curl(g2); g2.fill(); });
        curl(g); g.fillStyle = S.lin(g, PX + PW - 12, PY + PH - 12, PX + PW - 4, PY + PH - 4, [[0, 0], [1, 0.34]]); S.fill(g);
      });
      K.part("line", function (g, S) {
        var thin = S.style === "line" || S.style === "neon";
        header(g); S.fill(g);
        page(g); S.stroke(g, 2.2);
        curl(g); S.stroke(g, 1.6);
        if (!thin && S.mode !== "sil") {
          g.save(); page(g); g.clip();
          g.fillStyle = S.tone(0.4); g.lineWidth = 0.45; grid(g); g.strokeStyle = S.tone(0.55); g.stroke(); g.strokeStyle = S.tone(1); g.fillStyle = S.tone(1);
          g.restore();
        }
        checks(g); S.stroke(g, 2.3);
        RINGS.forEach(function (x) { R.roundRect(g, x - 2.6, PY - 8, 5.2, 14, 2.6); S.stroke(g, 1.8); });   // the rings
      });
      K.part("paper", function (g) {                         // the season knocked out of the header, the ring holes, the stamp's keyline
        g.font = MONO; g.textAlign = "center"; g.textBaseline = "middle";
        "ONDJFMA".split("").forEach(function (m, i) { g.fillText(m, GX + (i + 0.5) * CW, PY + HB * 0.6); });   // October to April, one column each
        RINGS.forEach(function (x) { R.circle(g, x, PY + 3.6, 1.9); g.fill(); });
        onStamp(g, function () { stampText(g, "stroke", 4.8); g.lineWidth = 4.4; stampBox(g, 0); g.stroke(); });
      });
      K.part("accent", function (g, S) {                     // the stamp, a little starved
        onStamp(g, function () {
          stampBox(g, 0.9); S.stroke(g, 2.2);
          stampBox(g, 3.4); S.stroke(g, 0.8);
          stampText(g, "fill");
          if (S.mode === "sil") return;
          var rnd = R.mulberry(820);
          R.knock(g, function (g2) {
            for (var i = 0; i < 70; i++) { var x = (rnd() - 0.5) * SW, y = (rnd() - 0.5) * SH, r = 0.25 + Math.pow(rnd(), 3) * 1.3; g2.globalAlpha = 0.5 + rnd() * 0.5; R.circle(g2, x, y, r); g2.fill(); }
            g2.globalAlpha = 1;
          });
        });
      });
    }
  });
})();
