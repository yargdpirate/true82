/* art/loss/seal.js: Rubber Seal (a pilot for art/CONTRACT.md). A round riso rubber stamp (a thick rim, LOSS around
   it, a big L in the middle) drops in at an angle, bites the card with a squash, ink squeezes out at its rim, then the
   rubber peels up and away and leaves a slipped, smudged impression that dries off the card. Distinct from the classic
   L in material (rubber, not a letter), entrance (a tilted drop, not a pop), exit (a lift and a dry, not a drain) and
   composition (a seal). Its masses are screened in prep (eight short jobs); a frame is at most four drawImages. */
(function () {
  "use strict";
  var TAU = Math.PI * 2, S = 240, C = S / 2;            // the plate, in css px; the seal is centered on it
  var RIM = 106;                                        // the rim's middle radius (the seal reaches about 112)

  function star(g, x, y, r, a) {                        // a small five-point star between the words
    g.beginPath();
    for (var i = 0; i < 10; i++) {
      var q = a + i * Math.PI / 5, k = i % 2 ? r * 0.45 : r;
      g.lineTo(x + Math.sin(q) * k, y - Math.cos(q) * k);
    }
    g.closePath(); g.fill();
  }
  // The seal's tone. w = 1: the impression, its ink pooled at every edge (the strokes print full, the fills a hair
  // lighter); w < 1: the rubber's face, flat. Worn rubber leaves a few seeded voids.
  function seal(K, g, w) {
    var r = K.rand(4801), i, q, a;
    g.strokeStyle = K.tone(w); g.fillStyle = K.tone(w);
    g.lineWidth = 11; g.beginPath(); g.arc(C, C, RIM, 0, TAU); g.stroke();
    g.lineWidth = 2.6; g.beginPath(); g.arc(C, C, RIM - 14, 0, TAU); g.stroke();
    g.lineWidth = 2.2; g.beginPath(); g.arc(C, C, 66, 0, TAU); g.stroke();
    g.font = K.font(700, 17, "mono"); g.textAlign = "center"; g.textBaseline = "middle";
    for (q = 0; q < 4; q++) {                           // LOSS four times around the rim, tops outward
      for (i = 0; i < 4; i++) {
        a = q * TAU / 4 + (i - 1.5) * 0.205;
        g.save(); g.translate(C + Math.sin(a) * 79, C - Math.cos(a) * 79); g.rotate(a);
        g.fillText("LOSS".charAt(i), 0, 0); g.restore();
      }
      a = q * TAU / 4 + TAU / 8;
      star(g, C + Math.sin(a) * 79, C - Math.cos(a) * 79, 6, a);
    }
    g.font = K.font(800, 150, "disp"); g.textBaseline = "alphabetic";
    var m = g.measureText("L"), hh = m.actualBoundingBoxAscent || 105, base = C + hh / 2 - 1;
    g.fillStyle = K.tone(w * (w < 1 ? 1 : 0.88));
    g.fillText("L", C + 3, base);
    if (w >= 1) { g.lineWidth = 3; g.lineJoin = "round"; g.strokeStyle = K.tone(1); g.strokeText("L", C + 3, base); }
    g.globalCompositeOperation = "destination-out";     // worn rubber
    for (i = 0; i < 26; i++) {
      a = r() * TAU; q = 20 + r() * 92;
      g.globalAlpha = 0.35 + r() * 0.5;
      g.beginPath(); g.ellipse(C + Math.sin(a) * q, C - Math.cos(a) * q, 1 + r() * 2.6, 0.7 + r() * 1.3, r() * 3, 0, TAU); g.fill();
    }
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  }
  // the ink the bite squeezes out past the rim: a bumpy band and a few beads
  function ooze(K, g) {
    var r = K.rand(9161), n = 72, i, a, k;
    g.fillStyle = K.tone(0.97);
    g.beginPath();
    for (i = 0; i <= n; i++) { a = i / n * TAU; k = RIM + 6.5 + 2.2 * Math.sin(a * 7 + 1) + 1.6 * Math.sin(a * 13) + r() * 1.4; g.lineTo(C + Math.sin(a) * k, C - Math.cos(a) * k); }
    for (i = n; i >= 0; i--) { a = i / n * TAU; g.lineTo(C + Math.sin(a) * (RIM - 3), C - Math.cos(a) * (RIM - 3)); }
    g.fill();
    for (i = 0; i < 9; i++) { a = r() * TAU; k = RIM + 8 + r() * 5; g.beginPath(); g.arc(C + Math.sin(a) * k, C - Math.cos(a) * k, 1.5 + r() * 2.8, 0, TAU); g.fill(); }
  }
  // the smudge the lift drags out: the seal again, faint, pulled a few px along the lift
  function smear(K, g) {
    for (var i = 1; i <= 5; i++) { g.save(); g.globalAlpha = 0.2; g.translate(i * 1.3, -i * 1.1); seal(K, g, 0.95); g.restore(); }
  }
  function print(K, g, can, x, y, rot, sx, sy, alpha) {
    if (alpha <= 0.004 || !can) return;
    g.save();
    g.globalAlpha = Math.min(1, alpha); g.globalCompositeOperation = K.blend;
    g.translate(x, y); g.rotate(rot); g.scale(sx, sy);
    g.drawImage(can, -C, -C, S, S);
    g.restore();
  }
  // where this seal lands: the box's middle, as wide as the L is tall (but inside the card), its tilt and side seeded
  function spot(K, E) {
    var B = K.box, r = K.rand(E.seed ^ 0x5ea1), side = r() < 0.5 ? -1 : 1;
    var D = Math.min(B.size * 0.8, B.x1 - B.x0 - 30);
    return { x: B.cx, y: (B.y0 + B.y1) / 2 - B.size * 0.015, D: D, sc: D / (2 * (RIM + 7)), side: side, tilt: side * (0.07 + r() * 0.13) };
  }

  T82ART.add("loss", "seal", {
    name: "Rubber Seal",
    by: "A round LOSS seal drops in at an angle, bites with a squash, ink squeezes out at its rim, and the rubber lifts off a smudged print.",
    prep: function (K) {
      var st = K.st;
      return [
        function () { st.P = K.plate(S, S, 5309); },
        function () { st.imp = K.screen(st.P, "loss", function (g) { seal(K, g, 1); }); },
        function () { st.rub = K.screen(st.P, "pop", function (g) { seal(K, g, 0.82); }); },
        function () { st.ooze = K.screen(st.P, "loss", function (g) { ooze(K, g); }); },
        band(0), band(1), band(2), band(3)
      ];
      // the smear (five copies of the seal: one job too long for an iPhone, which runs prep between two frames) in
      // four bands on device-pixel edges, each joined into the first: the same print (bar a few stray dots)
      function band(i) {
        return function () {
          var k = st.P.k, y0 = Math.round(i * S / 4 * k) / k, y1 = Math.round((i + 1) * S / 4 * k) / k;
          var c = K.screen(st.P, "loss", function (g) { g.beginPath(); g.rect(0, y0, S, y1 - y0); g.clip(); smear(K, g); });
          if (!i) { st.smear = c; return; }
          var x = st.smear.getContext("2d");
          x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "source-over"; x.drawImage(c, 0, 0);
          c.width = 0; c.height = 0;
        };
      }
    },
    hit: function (K, E) {
      K.hitClassic(E);
      var s = spot(K, E);                               // the thud where the rubber bites
      K.ring({ x: s.x, y: s.y, delay: 0.1, dur: 0.34, r0: s.D * 0.5, r1: s.D * 0.5 + 30, w0: 7, ink: "pop", cov: 0.6 });
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, f = K.fade(E, e), s = spot(K, E), sc = s.sc;
      if (!st.imp || f <= 0) return;
      var tC = 0.1, tL = K.clamp(E.dur * 0.5, 0.26, 0.95), lift = K.clamp((e - tL) / 0.18, 0, 1);
      if (e < tC) {                                     // the drop: the inked rubber comes down at an angle, speeding up
        var p = e / tC, q = 1 - p * p, z = 1 + 0.35 * q;
        print(K, g, st.rub, s.x + s.side * s.D * 0.42 * q, s.y - K.box.size * 0.8 * q, s.tilt + s.side * 0.55 * q, sc * z, sc * z, f * (0.35 + 0.65 * p));
        return;
      }
      var b = K.clamp((e - tC) / 0.12, 0, 1), k = Math.sin(b * Math.PI) * (1 - b * 0.5);   // the bite: squash, spring back
      var sx = sc * (1 + 0.1 * k), sy = sc * (1 - 0.13 * k), o = K.ease.out((e - tC) / 0.2);
      var dry = 1 - 0.5 * K.smooth(tL + 0.15, E.dur, e);  // the impression dries pale before it goes
      print(K, g, st.ooze, s.x, s.y, s.tilt, sc * (0.965 + 0.05 * o), sc * (0.965 + 0.05 * o), f * o * dry);
      if (lift > 0) print(K, g, st.smear, s.x, s.y, s.tilt, sc, sc, f * dry * 0.85 * K.ease.out(lift * 1.6));
      print(K, g, st.imp, s.x, s.y, s.tilt, sx, sy, f * dry);
      if (lift < 1) {                                   // the rubber, pressed on off register, then peeled up and away
        var u = lift * lift, z2 = 1 + 0.35 * lift;
        print(K, g, st.rub, s.x - 4 + s.side * s.D * 0.3 * u, s.y + 3 - K.box.size * 0.7 * u, s.tilt + s.side * 0.4 * u,
          sx * z2, sy * z2, f * (1 - lift) * (lift > 0 ? 0.9 : 1));
      }
    }
  });
})();
