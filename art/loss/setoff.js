/* art/loss/setoff.js: Set-Off. Wet ink lifts. A fat wet pink L slams down; a slip sheet of tinted paper lies hinged to
   its left like a page, swings shut over the L with a thud (the ink presses into its face), then peels back open and
   lies flat bearing a mirrored, half-strength copy of the L: the L is paler for it, its ink pulled off in blotches. The
   pair stands side by side, the copy drying paler; in a long moment the sheet shuts a second time, a hair off, and
   opens on a double-struck copy. Then the sheet is flung off to the left and the L drops.
   Plates: the wet L (0.95) and the lifted L (0.72 with ink-lift bites) from one plate: three short jobs. The sheet is
   live (a violet tint with a light edge, K.pat) and so is its copy (the L's contour mirrored, pink 0.5).
   Beats: L lands 0.06 s; the sheet shuts 0.07-0.17 s, presses to 0.24, peels open to 0.43 (all at a pace that shrinks
   in a short moment). Stretches with E.dur: the dry-down and the second press. The exit takes the last 0.1 to 0.35 s. */
(function () {
  "use strict";
  var PI = Math.PI, LW = 108, LH = 172, ST = 50, FT = 46, M = 14, SW = LW + 2 * M, SH = LH + 2 * M, PW = LW + 8, PH = LH + 8;
  function lpath(K, g) {                                // the L as one closed contour: wet edges (a bigger wobble), sharp at elbow and toe
    var r = K.rand(2131), P = [[0, 0], [ST - 3, 0], [ST + 1, LH - FT], [LW, LH - FT + 2], [LW - 5, LH], [0, LH]], i, j, n, a, b;
    g.beginPath(); g.moveTo(0, 0);
    for (i = 1; i <= 6; i++) {
      a = P[i - 1]; b = P[i % 6]; n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 12);
      for (j = 1; j <= n; j++) g.lineTo(a[0] + (b[0] - a[0]) * j / n + (j < n ? (r() - 0.5) * 2.6 : 0), a[1] + (b[1] - a[1]) * j / n + (j < n ? (r() - 0.5) * 2.6 : 0));
    }
    g.closePath();
  }
  function wet(K, g, t, bites) {                        // the L's tone (+ a fat edge), then the ink the sheet lifted off
    var r = K.rand(2132), i, x, y;
    g.save(); g.translate(4, 4); lpath(K, g);
    g.fillStyle = K.tone(t); g.strokeStyle = K.tone(bites ? 0.93 : t); g.lineWidth = bites ? 7 : 3; g.lineJoin = "round"; g.fill(); g.stroke();   // lifted: the edge keeps its ink
    if (bites) {
      g.globalCompositeOperation = "destination-out"; g.fillStyle = K.tone(0.8);
      for (i = 0; i < 8; i++) {
        if (i % 3) { x = 9 + r() * (ST - 18); y = 8 + r() * (LH - FT - 8); } else { x = ST + r() * (LW - ST - 14); y = LH - FT + 6 + r() * (FT - 14); }
        g.beginPath(); g.ellipse(x, y, 2 + r() * 3.6, 2 + r() * 4, r() * 3, 0, PI * 2); g.fill();
      }
    }
    g.restore();
  }
  function ang(u) {                                     // the sheet's angle: PI = open on the left, 0 = shut over the L
    var p;
    if (u <= 0 || u >= 0.43) return PI;
    if (u < 0.1) return PI * (1 - u * u / 0.01);
    if (u < 0.24) return 0;
    p = (u - 0.24) / 0.19;
    return PI * (p * p * (3 - 2 * p) + 0.12 * Math.sin(PI * p) * p);
  }
  T82ART.add("loss", "setoff", {
    name: "Set-Off",
    by: "A wet pink L slams, a paper sheet shuts over it like a page and peels open on a mirrored half-strength copy; the L is paler for it.",
    prep: function (K) {
      var st = K.st;
      return [
        function () { st.P = K.plate(PW, PH, 6203); },
        function () { st.L1 = K.screen(st.P, "loss", function (g) { wet(K, g, 0.95, false); }); },
        function () { st.L2 = K.screen(st.P, "loss", function (g) { wet(K, g, 0.6, true); }); st.P = null; }
      ];
    },
    hit: function (K, E) {
      var x = E.x, y = E.y, fi = E.first, R = fi ? 200 : 140, sc = K.clamp(E.dur / 0.9, 0.5, 1);
      K.ring({ x: x, y: y, dur: 0.4, r0: 8, r1: R, w0: 11, ink: "loss", cov: 0.92 });
      K.ring({ x: x, y: y, delay: 0.17 * sc, dur: 0.4, r0: 6, r1: R * 0.8, w0: 8, ink: "light", cov: 0.6 });
      K.spark({ x: x, y: y, n: fi ? 24 : 12, ink: "loss", sp: [160, fi ? 560 : 420], r: [1.1, fi ? 4.6 : 3.4], life: [0.3, 0.38], grav: 1500, seed: E.seed, streak: true });
      K.flash(fi ? 0.72 : 0.55); K.shake(Math.max(E.dur, 0.42), fi ? 13 : 10);
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, f = K.fade(E, e), k;
      if (!st.L1 || !st.L2 || f <= 0) return;
      var Hh = B.y1 - B.y0, s = Math.min(1.04 * Hh / SH, (K.w - 20) / (2 * SW)), size = B.size, cy = (B.y0 + B.y1) / 2, hx = B.cx;
      var sc = K.clamp(E.dur / 0.9, 0.5, 1), X = Math.min(0.35, 0.25 * E.dur), q = K.clamp((e - (E.dur - X)) / X, 0, 1), fall = q * q;
      var tail = K.clamp((e - 0.45 * sc) / Math.max(0.12, E.dur - 0.45 * sc - X), 0, 1), lng = E.dur > 1.3;
      var t2 = 0.45 * E.dur, th = ang((e - 0.07 * sc) / sc);
      if (lng) th = Math.min(th, ang((e - t2) / sc));
      var contact = (e - 0.07 * sc) / sc >= 0.1 || (lng && (e - t2) / sc >= 0.1);   // the first press has taken the ink
      var p = K.clamp(e / 0.06, 0, 1), np = 1 - p * p, b = K.clamp((e - 0.06) / 0.1, 0, 1), sq = Math.sin(b * PI) * (1 - b * 0.5);
      var shut = th < 0.2 ? 1 : 0;
      var pr = K.clamp((e - 0.07 * sc) / sc - 0.1, 0, 0.05) / 0.05 * (1 - K.clamp(((e - 0.07 * sc) / sc - 0.16) / 0.04, 0, 1));
      sq = Math.max(sq, 0.5 * pr);
      var lifted = (e - 0.07 * sc) / sc > 0.17;
      var lx = hx + M * s, ly = cy - LH / 2 * s;
      g.save(); g.globalCompositeOperation = K.blend; g.globalAlpha = f;
      // the L (wet until the sheet has lifted it): drops in from above, squashes, falls away last
      g.save();
      g.translate(lx + LW / 2 * s, ly + LH * s + 0.9 * Hh * fall - 0.4 * size * np * (p < 1 ? 1 : 0));
      g.scale(1 + 0.09 * sq, 1 - 0.1 * sq);
      if (p < 1) { g.globalAlpha = f * 0.3; g.drawImage(st.L1, -LW / 2 * s - 4 * s, -LH * s - 4 * s - 0.2 * size * (1 - p), PW * s, PH * s * 1.12); g.globalAlpha = f; }
      g.drawImage(lifted ? st.L2 : st.L1, -LW / 2 * s - 4 * s, -LH * s - 4 * s, PW * s, PH * s);
      g.restore();
      g.save(); g.translate(hx, cy); g.fillStyle = K.pat("light", 0.5, g);   // two strips of masking tape hold the hinge
      for (k = -1; k <= 1; k += 2) { g.save(); g.translate(0, k * 62 * s); g.rotate(0.1 * k); g.fillRect(-9 * s, -20 * s, 18 * s, 40 * s); g.restore(); }
      g.restore();
      // the sheet: hinged at the card's middle, open on the left; lands from the left, shuts, peels back, is flung off
      var ent = 1 - K.clamp(e / 0.07, 0, 1), cs = -Math.cos(th);
      g.save();
      g.translate(hx - 0.45 * size * ent * ent - 0.9 * K.w * 0.5 * fall, cy - SH / 2 * s + 0.12 * size * fall);
      g.rotate(-0.5 * fall);
      g.scale(cs * s, s);
      g.beginPath(); g.rect(-SW, 0, SW, SH); g.fillStyle = K.pat("night", shut ? 0.3 : 0.2, g); g.fill();
      g.beginPath(); g.rect(-SW, 0, SW, SH); g.rect(-SW + 2.6, 2.6, SW - 5.2, SH - 5.2);
      g.fillStyle = K.pat("light", 0.88, g); g.fill("evenodd");
      if (cs > 0 && contact) {                          // face A lifted the ink: the L, mirrored about the hinge, half strength, drying paler
        for (k = 0; k < (lng && (e - t2) / sc > 0.16 ? 2 : 1); k++) {
          g.save(); g.translate(-M - 2.5 + k * 5, M + 1.5 - k * 3); g.scale(-1, 1);
          lpath(K, g); g.fillStyle = K.pat("loss", (k ? 0.31 : 0.56) - 0.12 * tail, g); g.fill(); g.restore();
        }
      }
      g.restore();
      g.restore();
    }
  });
})();
