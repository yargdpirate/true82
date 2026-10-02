/* art/loss/testsheet.js: Test Sheet. A riso test print is slapped down: a violet sheet carrying a big pink L (also printed
   in the aqua and violet drums, which miss it: the fringes), crop marks, a tint ladder per drum (live halftone patches
   at stepped coverages), a registration target whose drums do not agree, the drum names in their own inks, and a
   marker note drawn on in aqua. The aqua drum lags the slap and settles, then keeps creeping off register through the
   hold; the sheet is pulled away with the drums dragging apart.
   Plates (three screened jobs): the pink L, the aqua L (knocked out under the pink one: only its fringe prints), the
   violet paper with its own ghost L (also knocked out). Marks and the note are live. Stretches with E.dur: the creep
   and the note; the pull takes the last 0.1 to 0.35 s. */
(function () {
  "use strict";
  var SHW = 204, SHH = 188, TAU = Math.PI * 2, U = 1.2;
  var AX = 8, AY = -6, VX = -7, VY = 6;                                          // the aqua and violet drums' misses
  var LX = 26, LY = 24, LH = 156, LW = 116, ST = 44, FT = 42;                    // the L on the sheet
  var RX = 22, RY = 20, RW = 124, RH = 164;                                      // the L plates' window on the sheet
  var COV = [0.12, 0.25, 0.37, 0.5, 0.62, 0.75, 0.88, 0.97];
  function lpath(K, g, dx, dy) {                        // the L as one closed contour with a hair of wobble
    var r = K.rand(61), P = [[0, 0], [ST, 0], [ST - 1, LH - FT], [LW, LH - FT], [LW, LH], [0, LH]], i, j, n, a, b;
    g.beginPath(); g.moveTo(LX + dx, LY + dy);
    for (i = 1; i <= 6; i++) {
      a = P[i - 1]; b = P[i % 6]; n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14);
      for (j = 1; j <= n; j++) g.lineTo(LX + dx + a[0] + (b[0] - a[0]) * j / n + (j < n ? (r() - 0.5) * 1.6 : 0), LY + dy + a[1] + (b[1] - a[1]) * j / n + (j < n ? (r() - 0.5) * 1.6 : 0));
    }
    g.closePath();
  }
  function ghost(K, g, dx, dy, kx, ky) {                // an L of a drum that misses, with the pink L's place knocked out of it
    g.fillStyle = K.tone(0.9); lpath(K, g, dx, dy); g.fill();
    g.globalCompositeOperation = "destination-out"; g.fillStyle = K.tone(1); lpath(K, g, kx, ky); g.fill();
    g.globalCompositeOperation = "source-over";
  }
  function paper(K, g, y) {                             // the violet sheet (one half of it) with its ghost L, the pink L's place knocked out
    g.translate(0, -y); g.fillStyle = K.tone(0.26); g.fillRect(0, y, SHW, SHH / 2);
    g.globalCompositeOperation = "destination-out"; g.fillStyle = K.tone(1); lpath(K, g, 0, 0); g.fill();
    g.globalCompositeOperation = "source-over";
    ghost(K, g, VX, VY, 0, 0);
  }
  function target(K, g, ink) {                          // a registration target: two rings and a cross
    g.fillStyle = K.pat(ink, 0.9, g); g.beginPath();
    g.arc(156, 54, 14, 0, TAU); g.arc(156, 54, 11.8, 0, TAU, true); g.arc(156, 54, 7.2, 0, TAU); g.arc(156, 54, 5, 0, TAU, true);
    g.rect(137, 53, 38, 2.2); g.rect(155, 35, 2.2, 38); g.fill();
  }
  function word(K, g, ink, t, y) {                      // a drum's name, up the sheet's right margin
    g.save(); g.fillStyle = K.pat(ink, 0.92, g); g.font = K.font(700, 11, "mono"); g.textAlign = "left";
    g.translate(SHW - 14, y); g.rotate(-Math.PI / 2); g.fillText(t, 0, 0); g.restore();
  }
  function ribbon(g, P, t, w) {                         // a marker stroke along P, thick in the middle, drawn on to fraction t
    var n = P.length - 1, m = Math.min(n, Math.floor(t * n)), pts = P.slice(0, m + 1), L = [], R = [], i, a, b, d, u, v, k;
    if (m < n) pts.push([P[m][0] + (P[m + 1][0] - P[m][0]) * (t * n - m), P[m][1] + (P[m + 1][1] - P[m][1]) * (t * n - m)]);
    if (pts.length < 2) return;
    for (i = 0; i < pts.length; i++) {
      a = pts[Math.max(0, i - 1)]; b = pts[Math.min(pts.length - 1, i + 1)]; d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      u = (b[1] - a[1]) / d; v = -(b[0] - a[0]) / d; k = w * (0.25 + 0.75 * Math.pow(Math.sin(Math.PI * (i + 0.5) / pts.length), 0.5));
      L.push([pts[i][0] + u * k, pts[i][1] + v * k]); R.push([pts[i][0] - u * k, pts[i][1] - v * k]);
    }
    g.beginPath(); g.moveTo(L[0][0], L[0][1]);
    for (i = 1; i < L.length; i++) g.lineTo(L[i][0], L[i][1]);
    for (i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
    g.closePath(); g.fill();
  }
  function note() {                                     // a loop round the target and an arrow back at the L (sheet coordinates)
    var P = [], i, q;
    for (i = 0; i <= 24; i++) { q = -2.2 + i / 24 * 7.4; P.push([156 + Math.cos(q) * (21 + i * 0.1), 54 + Math.sin(q) * (21 + i * 0.1) + 1]); }
    P.push([128, 82], [84, 100]);
    return [P, [[96, 91], [84, 100], [97, 106]]];
  }
  function spot(K, E) {
    var B = K.box, s = Math.min((B.y1 - B.y0 + 14) / SHH, (B.x1 - B.x0 - 20) / SHW), r = K.rand(E.seed ^ 0x7e57), side = r() < 0.5 ? -1 : 1;
    return { s: s, side: side, tilt: side * (0.025 + r() * 0.03) };
  }
  T82ART.add("loss", "testsheet", {
    name: "Test Sheet",
    by: "A riso test print slaps down: a big pink L off register from its aqua and violet drums, tint ladders, a registration target, crop marks and a marker note, then the sheet is pulled away.",
    // the tempo dial (art/tempo.json): phase "exit" begins at 0.75 of E.dur, where the sheet is pulled away (tE = dur - X, X = min(0.35, 0.25 dur): exactly 0.75 up to 1.4 s, 0.794 at 1.7 s)
    phases: { exit: 0.75 },
    prep: function (K) {
      var st = K.st;
      return [
        function () { st.P = K.plate(RW * U, RH * U, 6407); st.Q = K.plate(SHW, SHH / 2, 6408); },
        function () { st.a = K.screen(st.P, "loss", function (g) { g.scale(U, U); g.translate(-RX, -RY); g.fillStyle = K.tone(0.96); lpath(K, g, 0, 0); g.fill(); }); },
        function () { st.b = K.screen(st.P, "pop", function (g) { g.scale(U, U); g.translate(-RX, -RY); ghost(K, g, 0, 0, -AX, -AY); }); },
        function () { st.c = K.screen(st.Q, "night", function (g) { paper(K, g, 0); }); },
        function () { st.d = K.screen(st.Q, "night", function (g) { paper(K, g, SHH / 2); }); }
      ];
    },
    hit: function (K, E) {
      K.flash(E.first ? 0.55 : 0.4); K.shake(Math.max(E.dur, 0.4), E.first ? 11 : 8);
      K.ring({ x: E.x, y: E.y, dur: 0.34, r0: 6, r1: E.first ? 150 : 100, w0: 8, ink: "loss", cov: 0.8 });
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, f = K.fade(E, e), S = spot(K, E), s = S.s, c = K.clamp, B = K.box, n, i;
      if (!st.a || !st.b || !st.c || !st.d || f <= 0 || !K.ready) return;
      var X = Math.min(0.35, 0.25 * E.dur), tE = E.dur - X, tN = Math.min(0.14, tE * 0.18), dN = c(tE * 0.2, 0.1, 0.3);
      var p = c(e / 0.07, 0, 1), z = 1 + 0.22 * (1 - p) * (1 - p), er = Math.max(0, e - 0.07);
      var settle = S.tilt * (1 + 0.8 * Math.exp(-er * 9) * Math.cos(er * 26)), hold = K.smooth(0.2, tE, e);
      var la = 1 + 2 * (1 - K.ease.out(c((e - 0.03) / 0.14, 0, 1))) + 0.45 * hold, q = c((e - tE) / X, 0, 1);
      var ax = AX * la - 40 * q * q * S.side, ay = AY * la - 14 * q * q;
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      g.translate(B.cx + 330 * q * q * S.side, (B.y0 + B.y1) / 2 - 8 * (1 - p) + 20 * q * q);
      g.rotate(settle + S.side * 0.14 * q * q); g.scale(s * z, s * z); g.translate(-SHW / 2, -SHH / 2);
      g.drawImage(st.c, 0, 0, SHW, SHH / 2); g.drawImage(st.d, 0, SHH / 2, SHW, SHH / 2);   // the violet drum: the paper, its ghost L, a name
      word(K, g, "night", "3 VIOLET", 78);
      g.save(); g.translate(ax, ay);                                          // the aqua drum, off register and creeping
      g.drawImage(st.b, RX, RY, RW, RH);
      target(K, g, "pop"); word(K, g, "pop", "2 AQUA", 128);
      for (i = 0; i < 6; i++) { g.fillStyle = K.pat("pop", COV[i + 2], g); g.fillRect(144, 100 + i * 13, 16, 11); }
      var nt = c((e - tN) / dN, 0, 1);                                        // the marker note, drawn on
      if (nt > 0) {
        n = note(); g.fillStyle = K.pat("pop", 0.9, g);
        ribbon(g, n[0], K.ease.inOut(nt), 2.3);
        if (nt > 0.85) ribbon(g, n[1], 1, 1.9);
      }
      g.restore();                                                            // the pink drum, the one that is right
      g.drawImage(st.a, RX, RY, RW, RH);
      target(K, g, "loss"); word(K, g, "loss", "1 PINK", 178);
      for (i = 0; i < 8; i++) { g.fillStyle = K.pat("loss", COV[i], g); g.fillRect(LX + i * 15, 6, 13, 10); }
      g.fillStyle = K.pat("loss", 0.9, g); g.beginPath();                      // the crop marks
      [[5, 5, 1, 1], [SHW - 5, 5, -1, 1], [5, SHH - 5, 1, -1], [SHW - 5, SHH - 5, -1, -1]].forEach(function (m) {
        g.rect(Math.min(m[0], m[0] + m[2] * 9), m[1] - 1, 9, 2); g.rect(m[0] - 1, Math.min(m[1], m[1] + m[3] * 9), 2, 9);
      });
      g.fill();
      g.restore();
    }
  });
})();
