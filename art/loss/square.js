/* art/loss/square.js: Try Square. The L is a carpenter's square: a pink steel blade and tongue with the inch scale carved
   along both arms (ticks, longer every fourth, a numeral every eighth, a hanging hole), a bright bevel on its outer
   edge and a magenta block shadow. It drops in off-square from above and lands with a clang (a hop, a skid, a ring of
   shivers on twos), a glint runs along the steel once, and then it is thrown like a boomerang: it spins off the card
   with ghost copies trailing it.
   One screened job (the steel with its scale carved in); the shadow, bevel, glint and ghosts are live K.pat. Stretches
   with E.dur: the hold (the steel rings down and the glint comes round every half second) and the throw (0.2 to 0.78
   s); the drop is 0.05 to 0.1 s, absolute. */
(function () {
  "use strict";
  var W = 137, H = 190, PW = W + 10, PH = H + 10, PTS = [[-68.5, -95], [-11.5, -95], [-11.5, 44], [68.5, 44], [68.5, 95], [-68.5, 95]];
  function lp(g) { g.beginPath(); for (var i = 0; i < 6; i++) g[i ? "lineTo" : "moveTo"](PTS[i][0], PTS[i][1]); g.closePath(); }
  function ticks(K, g) {                                   // carve the scale: inner edges (stem right, tongue top), outer edges (stem left, foot bottom)
    var i, n, len;
    g.fillStyle = K.tone(1); g.textAlign = "center"; g.textBaseline = "middle"; g.font = K.font(700, 11, "mono");
    for (i = 0; i <= 22; i++) {                            // the stem's inner (right) edge, from the elbow up: x = -11.5
      n = i % 8 === 0 ? 17 : i % 4 === 0 ? 11 : 6.5; g.fillRect(-11.5 - n, 40 - i * 6, n, 1.6);
      if (i && i % 8 === 0) g.fillText(String(i / 8), -11.5 - 29, 40 - i * 6);
    }
    for (i = 0; i <= 12; i++) {                            // the tongue's top (inner) edge, from the elbow out: y = 44
      n = i % 8 === 0 ? 17 : i % 4 === 0 ? 11 : 6.5; g.fillRect(-11.5 + 8 + i * 6, 44, 1.6, n);
      if (i && i % 8 === 0) g.fillText(String(i / 8), -11.5 + 8 + i * 6, 44 + 28);
    }
    for (i = 1; i < 31; i++) { len = i % 4 === 0 ? 9 : 5.5; g.fillRect(-68.5, -95 + i * 6, len, 1.6); }   // the stem's outer edge
    for (i = 1; i < 22; i++) { len = i % 4 === 0 ? 9 : 5.5; g.fillRect(-68.5 + i * 6, 95 - len, 1.6, len); }  // the foot's outer edge
    g.beginPath(); g.arc(-40, 62, 8, 0, 7); g.fill();      // the hanging hole
  }
  T82ART.add("loss", "square", {
    name: "Try Square",
    by: "The L is a carpenter's square: a pink steel try square with its scale carved in drops in, clangs, shivers, then is thrown away like a boomerang.",
    // the tempo dial (art/tempo.json): phase "exit" begins at 0.55 of E.dur, where the square is thrown off (tx = dur - X, X = clamp(0.45 dur, 0.2, 0.78): exactly 0.55 from 0.44 to 1.73 s)
    phases: { exit: 0.55 },
    prep: function (K) {
      var st = K.st;
      return [
        function () { st.P = K.plate(PW, PH, 7919); },
        function () {
          st.L = K.screen(st.P, "loss", function (g) {
            var gr = g.createLinearGradient(0, 5, 0, 5 + H); gr.addColorStop(0, K.tone(0.86)); gr.addColorStop(1, K.tone(0.98));
            g.translate(5 + W / 2, 5 + H / 2); g.fillStyle = gr; lp(g); g.fill();
            g.globalCompositeOperation = "destination-out"; ticks(K, g);
          });
        }
      ];
    },
    hit: function (K, E) {
      var B = K.box;
      K.flash(E.first ? 0.6 : 0.42); K.shake(Math.max(E.dur, 0.4), E.first ? 13 : 9);
      K.spark({ x: B.cx - 30, y: B.y1 - 6, n: 22, ink: "light", sp: [160, 520], r: [1, 2.6], life: [0.2, 0.25], grav: 1300, seed: E.seed, streak: true });
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, f = K.fade(E, e), k, side = K.rand(E.seed ^ 29)() < 0.5 ? -1 : 1;
      if (!st.L || f <= 0) return;
      var hh = B.y1 - B.y0, s = hh / H, Td = K.clamp(E.dur * 0.2, 0.05, 0.1), X = K.clamp(E.dur * 0.45, 0.2, 0.78), tx = Math.max(Td + 0.04, E.dur - X);
      var cx = B.cx, cy = (B.y0 + B.y1) / 2;
      function pose(t) {                                    // where the square is at time t: x, y, angle
        var p = K.clamp(t / Td, 0, 1), q = K.clamp((t - Td) / 0.13, 0, 1), r = K.clamp((t - tx) / (E.dur - tx), 0, 1);
        var eh = Math.floor(t * 12) / 12 - Td, shiver = eh > 0 ? 0.05 * Math.exp(-eh * 7) * Math.sin(eh * 55) : 0;
        var tr = Math.max(0, t - Td - 0.1), rock = side * 0.045 * Math.exp(-tr * 2.6) * Math.sin(tr * 9.5) * (1 - r);   // the steel rocks down on its elbow
        return [cx - side * 14 * (1 - K.ease.out(q)) + side * 330 * r * r * (0.6 + 0.4 * r),
          cy - hh * 1.15 * (1 - p * p) - 0.07 * hh * Math.sin(Math.PI * q) * (1 - q) - 120 * r + 60 * r * r * r,
          -0.12 + side * 0.55 * (1 - p * p) + shiver + rock + side * 9.4 * r * r];
      }
      function put(t, ink, cov, ghost) {
        var o = pose(t); g.save(); g.translate(o[0], o[1]); g.rotate(o[2]); g.scale(s, s);
        if (ghost) { g.fillStyle = K.pat(ink, cov, g); lp(g); g.fill(); g.restore(); return; }
        g.save(); g.translate(8, 9); g.fillStyle = K.pat("key", 0.62, g); lp(g); g.fill(); g.restore();      // the block shadow
        g.drawImage(st.L, -W / 2 - 5, -H / 2 - 5, PW, PH);
        g.strokeStyle = K.pat("light", 0.75, g); g.lineWidth = 2.2; g.lineJoin = "round";                    // the bevel on the outer edge
        g.beginPath(); g.moveTo(-64, 90); g.lineTo(-64, -91); g.lineTo(-15, -91); g.stroke();
        var gp = (e - Td - 0.08) / 0.5, gl = K.clamp((gp - Math.floor(gp)) / 0.42, 0, 1);   // the glint comes round every half second
        if (gp > 0 && gl > 0 && gl < 1 && Td + 0.08 + (Math.floor(gp) + 0.42) * 0.5 <= tx) {                                                                    // the glint: one slanted band along the steel
          lp(g); g.clip(); g.rotate(-0.62); g.fillStyle = K.pat("light", 0.56, g); g.fillRect(-170 + gl * 340, -140, 8, 280); g.fillRect(-152 + gl * 340, -140, 2.6, 280);
        }
        g.restore();
      }
      g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      if (e > tx) for (k = 3; k >= 1; k--) put(Math.max(0, e - k * 0.03), "loss", [0, 0.56, 0.38, 0.19][k], true);   // ghost copies trail the throw
      put(e, "loss", 0, false);
    }
  });
})();
