/* art/loss/fold.js: Fold-Out. A pleated paper L (folded-paper lettering): the stem is six slats and the foot five,
   hinged in a zigzag, so the edges saw in and out. It slaps down as a folded stack at the elbow and springs open on a
   damped spring (the stem first, the foot a beat behind), swings past flat and back, and holds while the pleats breathe
   on twos. Slats turned to the light print bright (pink 0.88) with a lit crest; the ones turned away print thin (0.4
   and falling as the fold deepens); a gap of stock is every crease; a key block shadow slides under it all. Then it
   folds shut into the stack and the stack tumbles off the card.
   Plates: none, all live K.pat in three fills (lit, shaded, crest) plus the shadow. Stretches with E.dur: the hold;
   the spring is 0.35 s (faster in a short moment) and the fold away 0.2 to 0.5 s, both absolute. */
(function () {
  "use strict";
  var H = 190, W = 137, SW = 57, FH = 50, N = 6, M = 5, T0 = 0.5, T1 = 1.42, OX = 0.28, OY = -0.28;   // the open L; slats; open and folded tilt (rad); the oblique depth
  var SH = H / (N * Math.cos(T0)), FL = (W - SW) / (M * Math.cos(T0));                               // a slat's true length: it projects shorter when tilted
  function quad(g, a) { g.moveTo(a[0][0], a[0][1]); g.lineTo(a[1][0], a[1][1]); g.lineTo(a[2][0], a[2][1]); g.lineTo(a[3][0], a[3][1]); g.closePath(); }
  // the slats at tilts t1 (stem) and t3 (foot); k > 0 leaves a crease of stock between slats. Each is four corners, lit ones are even.
  function slats(t1, t3, k) {
    var hp = SH * Math.cos(t1), d = SH * Math.sin(t1), y = H, z = 0, i, y0, z0, out = [];
    for (i = 0; i < N; i++) {
      y0 = y; z0 = z; y -= hp; z = i % 2 ? 0 : d;
      out.push([[OX * z0, y0 + OY * z0 - (i ? k : 0)], [SW + OX * z0, y0 + OY * z0 - (i ? k : 0)], [SW + OX * z, y + OY * z + k], [OX * z, y + OY * z + k]]);
    }
    var wp = FL * Math.cos(t3), df = FL * Math.sin(t3), x = SW, x0, j, yt = H - FH;
    z = 0;
    for (j = 0; j < M; j++) {
      x0 = x; z0 = z; x += wp; z = j % 2 ? 0 : df;
      out.push([[x0 + OX * z0 + (j ? k : -1), yt + OY * z0], [x + OX * z - k, yt + OY * z], [x + OX * z - k, H], [x0 + OX * z0 + (j ? k : -1), H]]);
    }
    return out;
  }
  T82ART.add("loss", "fold", {
    name: "Fold-Out",
    by: "A pleated paper L springs open out of a folded stack with a block shadow, holds while the pleats breathe, then folds shut and tumbles away.",
    draw: function (K, E, e) {
      var g = K.g, B = K.box, f = K.fade(E, e);
      if (f <= 0) return;
      var s = (B.y1 - B.y0) / H, eh = Math.floor(e * 12) / 12, side = K.rand(E.seed ^ 23)() < 0.5 ? -1 : 1, q = E.dur < 0.6 ? 1.4 : 1;
      var X = K.clamp(E.dur * 0.45, 0.2, 0.6), tx = Math.max(0.3, E.dur - X);
      function sp(t) { t = Math.max(0, t) * q; return Math.exp(-7 * t) * Math.cos(16 * t); }          // 1 folded, 0 open, below 0 past flat
      var br = 0.035 * Math.sin(eh * 14) * K.smooth(0.3, 0.45, e) * (1 - K.smooth(tx - 0.1, tx, e));   // the pleats breathe on twos
      var o1 = K.ease.inOut(K.clamp((e - tx - X * 0.15) / (X * 0.4), 0, 1)), o3 = K.ease.inOut(K.clamp((e - tx) / (X * 0.4), 0, 1)), r = K.clamp((e - tx - X * 0.5) / (X * 0.5), 0, 1);
      var a1 = T0 + (T1 - T0) * (e < tx ? sp(e - 0.005) : 0) + br, a3 = T0 + (T1 - T0) * (e < tx ? sp(e - 0.005 - 0.04 / q) : 0) + br;
      var t1 = a1 + (T1 - a1) * o1, t3 = a3 + (T1 - a3) * o3;
      var z = 1 + 0.25 * (1 - K.ease.out(e / 0.06)), sw = 0.5 + 0.5 * Math.sin(eh * 2.2), sh1 = Math.sin(t1), sh3 = Math.sin(t3);
      var cl = 0.88 - 0.1 * sh1, cs = Math.max(0.12, 0.62 - 1.1 * sh1);                               // lit and shaded slat coverage
      var P = slats(t1, t3, 1.6), S = slats(t1, t3, 0), i;
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      var dr = 1 - K.clamp(e / 0.045, 0, 1);                                                          // the stack slaps down from above
      g.translate(B.cx + side * 330 * r * r, (B.y0 + B.y1) / 2 - 90 * r + 520 * r * r * r * r - B.size * 0.55 * dr * dr);
      g.rotate(-0.1 + side * 3.2 * r * r); g.scale(s * z, s * z); g.translate(-W / 2, -H / 2);
      g.save(); g.translate(13 - 9 * sw, 8 + 4 * sw);                                                  // the block shadow: the same pleats, thrown to one side
      g.beginPath(); for (i = 0; i < S.length; i++) quad(g, S[i]);
      g.fillStyle = K.pat("key", 0.66, g); g.fill(); g.restore();
      g.beginPath(); for (i = 0; i < P.length; i++) if (i % 2 === 0) quad(g, P[i]);                                  // slats turned to the light: the even ones
      g.fillStyle = K.pat("loss", cl, g); g.fill();
      g.beginPath(); for (i = 0; i < P.length; i++) if (i % 2) quad(g, P[i]);
      g.fillStyle = K.pat("key", 0.7, g); g.fill();                                                    // a slat turned away is mostly magenta shade with some pink
      g.fillStyle = K.pat("loss", cs, g); g.fill();
      g.beginPath();                                                                                   // the crest of a lit slat catches the light
      for (i = 0; i < N; i += 2) g.rect(P[i][3][0], P[i][3][1] - 1.2, SW, 2.2);
      for (i = N; i < N + M; i += 2) g.rect(P[i][1][0] - 2.2, P[i][1][1], 2.4, H - P[i][1][1]);
      g.fillStyle = K.pat("light", 0.88, g); g.fill();
      g.restore();
    }
  });
})();
