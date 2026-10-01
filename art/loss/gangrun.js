/* art/loss/gangrun.js: Gang Run. A sheet of twelve perforated stamps, each a little L, prints in two passes: the
   violet drum thumps all twelve paper frames down row by row, then the pink drum prints its pictures into six of them,
   off register, and those six are the giant L. A white LOSS cancel (a ring and wavy lines) slams across the elbow, the
   sheet strains at its perforations (the gaps open), then it is torn along them: the blank stamps go first, the L's
   stamps tumble after them.
   Plates (one 42 x 42 plate, four screened jobs reused for all twelve): the pink picture with the little L carved out
   (a heavy and a light inking), the violet paper frame, and the frame with a faint ghost L for the blanks. The cancel
   is live. Stretches with E.dur: the strain; the tear-off takes the last 0.1 to 0.35 s. */
(function () {
  "use strict";
  var C = 42, IN = 5, COLS = 3, ROWS = 4, TAU = Math.PI * 2, U = 1.35;      // a stamp's size, its paper margin, the sheet
  function isL(i) { return i % COLS === 0 || i >= (ROWS - 1) * COLS; }    // the stem's column and the foot's row
  function scallops(K, g) {                             // the perforations: half holes along every edge
    var i, a;
    g.globalCompositeOperation = "destination-out"; g.fillStyle = K.tone(1);
    for (i = 0; i < 5; i++) {
      a = (i + 0.5) * C / 5;
      [[a, 0], [a, C], [0, a], [C, a]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 2.9, 0, TAU); g.fill(); });
    }
    g.globalCompositeOperation = "source-over";
  }
  function ell(g, k) {                                  // the little L (one closed contour), k = fatten
    g.beginPath(); g.moveTo(12.4 - k, 10.4 - k); g.lineTo(20.2 + k, 10.1 - k); g.lineTo(19.8 + k, 24.9 - k); g.lineTo(30 + k, 25 - k);
    g.lineTo(29.7 + k, 31.7 + k); g.lineTo(12.7 - k, 31.7 + k); g.closePath(); g.fill();
  }
  function pic(K, g, cov) {                             // the picture: pink with the little L cut out of it
    g.fillStyle = K.tone(cov); g.fillRect(IN, IN, C - 2 * IN, C - 2 * IN);
    g.globalCompositeOperation = "destination-out"; g.fillStyle = K.tone(1); ell(g, 0);
    g.globalCompositeOperation = "source-over";
    scallops(K, g);
  }
  function frame(K, g, ghost) {                         // the violet paper: a margin ring (and the blanks' ghost L)
    g.fillStyle = K.tone(0.5); g.fillRect(0, 0, C, C);
    g.globalCompositeOperation = "destination-out"; g.fillStyle = K.tone(1);
    g.fillRect(IN - 1.2, IN - 1.2, C - 2 * IN + 2.4, C - 2 * IN + 2.4);
    g.globalCompositeOperation = "source-over";
    if (ghost) { g.fillStyle = K.tone(0.22); ell(g, 0); }
    scallops(K, g);
  }
  function spot(K, E) {
    var B = K.box, s = (B.y1 - B.y0) / (ROWS * C), r = K.rand(E.seed ^ 0x57a4), side = r() < 0.5 ? -1 : 1;
    return { s: s, ox: B.cx - COLS * C * s / 2, oy: B.y0, side: side };
  }
  T82ART.add("loss", "gangrun", {
    name: "Gang Run",
    by: "A sheet of twelve perforated stamps, each a little L, prints in two passes (violet frames, then pink pictures off register); six of them are the giant L. A LOSS cancel slams across, and the sheet is torn off along its perforations.",
    prep: function (K) {
      var st = K.st;
      return [
        function () { st.P = K.plate(C * U, C * U, 7311); },
        function () { st.a = K.screen(st.P, "loss", function (g) { g.scale(U, U); pic(K, g, 0.96); }); },
        function () { st.b = K.screen(st.P, "loss", function (g) { g.scale(U, U); pic(K, g, 0.74); }); },
        function () { st.m = K.screen(st.P, "night", function (g) { g.scale(U, U); frame(K, g, false); }); },
        function () { st.g = K.screen(st.P, "night", function (g) { g.scale(U, U); frame(K, g, true); }); }
      ];
    },
    hit: function (K, E) {
      var S = spot(K, E), B = K.box;
      K.flash(E.first ? 0.55 : 0.4); K.shake(Math.max(E.dur, 0.4), E.first ? 11 : 8);
      K.ring({ x: E.x, y: E.y, dur: 0.34, r0: 6, r1: E.first ? 150 : 100, w0: 8, ink: "loss", cov: 0.8 });
      K.ring({ x: S.ox + C * S.s * 2.1, y: B.y0 + C * S.s * 1.35, delay: 0.17, dur: 0.3, r0: 10, r1: 76, w0: 5, ink: "loss", cov: 0.7 });
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, f = K.fade(E, e), S = spot(K, E), s = S.s, c = K.clamp, i, j, k = 0, R = [], rr = K.rand(E.seed ^ 0x2f1);
      if (!st.a || !st.b || !st.m || !st.g || f <= 0 || !K.ready) return;
      var X = Math.min(0.35, 0.25 * E.dur), tE = E.dur - X, T = c(E.dur * 0.06, 0.03, 0.12), tP = T + 0.07, th = 0.04;
      var tB = Math.max(0.2, tP + 0.1), sp = Math.max(0, (tE - X * 0.5 - 0.3 - tB) / 5), strain = K.smooth(tP + 0.1, tE, e);
      var open = 1 + 0.12 * strain * strain, RK = { 2: 0, 1: 1, 5: 2, 4: 3, 8: 4, 7: 5 };
      for (i = 0; i < COLS * ROWS; i++) R.push([rr(), rr(), rr(), rr()]);
      function tear(i) {                                    // where stamp i is: its place in the sheet, or torn off and falling
        var q = R[i], col = i % COLS, row = (i - col) / COLS, L = isL(i), dir = col ? 1 : -1, x = (col + 0.5) * C, y = (row + 0.5) * C, cx = 1.5 * C, cy = 2 * C;
        var tb = L ? tE + X * (0.15 + 0.35 * q[3]) : tB + RK[i] * sp, pe = c((e - tb - (L ? 0 : 0.05)) / (L ? X * 0.55 : 0.28), 0, 1);
        var sh = e > tb - 0.06 && pe <= 0 ? (Math.floor(e * 24) % 2 ? 1.5 : -1.5) : 0;     // it shivers just before it rips
        return { x: cx + (x - cx) * open + (q[1] - 0.5) * 1.2 + sh + (col - 1) * 80 * pe * pe * (0.6 + q[0]) + dir * 20 * pe * pe,
          y: cy + (y - cy) * open + (q[2] - 0.5) * 1.2 + (230 + 140 * q[2]) * pe * pe - 26 * pe * (1 - pe),
          r: (q[0] - 0.5) * 0.045 + (q[1] - 0.5) * 0.12 * strain + (q[3] - 0.3) * 2.2 * pe * pe * dir, pe: pe };
      }
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      g.translate(S.ox, S.oy); g.scale(s, s);
      for (i = 0; i < COLS * ROWS; i++) {
        var L = isL(i), pf = c((e - i * T * 0.5 / 12) / th, 0, 1), pp = L ? c((e - T * 0.5 - k++ * T * 0.5 / 6) / th, 0, 1) : 0;
        if (pf <= 0) continue;
        var t = tear(i), z = 1 + 0.4 * (1 - pf) * (1 - pf);
        g.save(); g.translate(t.x, t.y); g.rotate(t.r);
        g.save(); g.scale(z, z); g.drawImage(L ? st.m : st.g, -C / 2 + 1.2, -C / 2 + 0.8, C, C); g.restore();
        if (pp > 0) { z = 1 + 0.55 * (1 - pp) * (1 - pp); g.scale(z, z); g.drawImage(i === 3 ? st.b : st.a, -C / 2 + 2.8, -C / 2 - 2.2, C, C); }
        g.restore();
      }
      var pc = c((e - tP) / 0.06, 0, 1);                       // the cancel, stamped across the blanks in white: it goes with them
      if (pc > 0) {
        var m = 1 + 0.4 * (1 - pc) * (1 - pc), t5 = tear(5);
        g.save(); g.translate(t5.x - 0.4 * C, t5.y - 0.15 * C); g.rotate(-0.16 * S.side + t5.r * 2); g.scale(m, m);
        g.fillStyle = K.pat("light", 0.88, g);
        g.beginPath(); g.arc(0, 0, 24, 0, TAU); g.arc(0, 0, 20.6, 0, TAU, true);
        for (j = 0; j < 3; j++) {
          var yy = -9 + j * 9, q, sg = j % 2 ? -1 : 1;
          g.moveTo(24, yy);
          for (q = 0; q <= 6; q++) g.lineTo(24 + q * 16, yy + (q % 2 ? 4 : -4) * sg);
          for (q = 6; q >= 0; q--) g.lineTo(24 + q * 16, yy + 3.6 + (q % 2 ? 4 : -4) * sg);
        }
        g.fill();
        g.font = K.font(900, 18, "disp"); g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("LOSS", 0, 1);
        g.restore();
      }
      g.restore();
    }
  });
})();
