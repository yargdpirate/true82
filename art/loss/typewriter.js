/* art/loss/typewriter.js: Strikeover. A typewriter hammers the same L five times, each strike a little off the last
   (two violet ribbon strikes, three pink), the fabric of the ribbon printed through every stroke; extra pecks kick the
   whole stack while the moment holds; the bell dings (a DING in the crook) and the carriage returns: the stack yanks
   back, then zips off to the right, speed lines behind it.
   Beats: strikes at 0, .055, .105, .15, .19; pecks every .17 s after .36 (as long as the moment holds); ding 0.1 s before
   the slide; slide the last .26 x dur (at most .3 s), done .05 s before the end; a short moment compresses all of it. Plates: loss + night ribbon strikes, composited once in prep. */
(function () {
  "use strict";
  var W = 164, H = 220, OY = 10, CX = 82, CY = 110, TAU = Math.PI * 2;
  // the typewriter L, 136 x 200: a monoline slab, square cut, the stem a fat 18%. A point is [x, y]; the path closes itself.
  var G = [[14, 0], [84, 0], [84, 12], [68, 12], [68, 174], [134, 174], [134, 142], [150, 142], [150, 200], [14, 200], [14, 188], [32, 188], [32, 12], [14, 12]];
  // dx, dy, rot, plate (0 the violet half of the ribbon, 1 the pink struck light, 2 the pink struck hard), time
  var STRIKES = [[-7, 4, -0.014, 0, 0], [5, -3, 0.012, 1, 0.055], [-2, 2, -0.006, 1, 0.105], [3, 0, 0.007, 1, 0.15], [0, 0, 0, 2, 0.19]];

  function glyph(g) {
    g.beginPath();
    for (var i = 0; i < G.length; i++) g.lineTo(G[i][0], G[i][1] + OY);
    g.closePath();
  }
  // one ribbon strike's tone: the type squeezes the ink to its edge (a heavy rim), and streaks of the fabric's weave are
  // starved through it, longer than the screen's dots so they read as ribbon, not as noise.
  function strike(K, g, cov, edge, seed) {
    var r = K.rand(seed), i;
    g.fillStyle = K.tone(cov); glyph(g); g.fill();
    g.strokeStyle = K.tone(edge * 0.7); g.lineWidth = 5; g.lineJoin = "miter"; glyph(g); g.stroke();   // the squeezed rim, half of it out past the edge
    g.save(); g.globalCompositeOperation = "destination-out"; g.fillStyle = K.tone(0.7);
    for (i = 0; i < 24; i++) g.fillRect(18 + r() * 118, OY + 4 + r() * 192, 16 + r() * 44, 2 + r() * 1.6);
    g.restore();
  }

  function plan(E) {                                 // the carriage: X its zip, tS its start, tD the bell, n the pecks, c the burst's speed
    var X = Math.min(0.3, 0.26 * E.dur), tS = E.dur - 0.05 - X, tD = tS - (E.dur < 0.7 ? 0.035 : 0.1);
    return { X: X, tS: tS, tD: tD, n: Math.floor(Math.max(0, tD - 0.3) / 0.17), c: Math.max(0.45, Math.min(1, (E.dur - 0.1) / 0.45)) };
  }

  T82ART.add("loss", "typewriter", {
    name: "Strikeover",
    by: "A typewriter hammers the L again and again, each strike a little off the last in two ribbon inks, then the bell dings and the carriage zips the letter off the card.",
    // the tempo dial (art/tempo.json): phase "ding" begins at 0.654 of E.dur, where the DING has fully popped in (the bell tD plus its 0.06 s pop: 0.687 s of 1.05 s; 0.771 of 1.7 s)
    phases: { ding: 0.654 },
    prep: function (K) {
      var st = K.st;
      return [
        function () { st.P = K.plate(W, H, 4421); },
        function () { st.vio = K.screen(st.P, "night", function (g) { strike(K, g, 0.58, 0.8, 43); }); },
        function () { st.pa = K.screen(st.P, "loss", function (g) { strike(K, g, 0.4, 0.66, 41); }); },
        function () { st.pb = K.screen(st.P, "loss", function (g) { strike(K, g, 0.66, 0.86, 47); }); },
        function () {                                  // the five strikes stacked once, so the held letter is one drawImage
          st.plates = [st.vio, st.pa, st.pb];
          st.base = K.screen(st.P, "loss", function () {});
          var b = st.base.getContext("2d"), i, S, k = st.P.k;
          b.globalCompositeOperation = K.blend;
          for (i = 0; i < STRIKES.length; i++) {
            S = STRIKES[i]; b.save(); b.translate((CX + S[0]) * k, (CY + S[1]) * k); b.rotate(S[2]); b.drawImage(st.plates[S[3]], -CX * k, -CY * k); b.restore();
          }
        }
      ];
    },
    hit: function (K, E) {
      var B = K.box;
      K.spark({ x: B.cx, y: (B.y0 + B.y1) / 2, n: 16, ink: function (q) { return q() < 0.4 ? "night" : "loss"; }, sp: [120, 340], r: [1, 2.6], life: [0.24, 0.26], grav: 400, seed: E.seed, streak: true });
      K.flash(E.first ? 0.6 : 0.42);
      var P = plan(E), i, t, bump = function (t, d, y) {   // the card answers every strike: a short bump, the first the biggest
        K.jolt(K.card, [{ transform: "translate(0px,0px) rotate(0deg)" }, { transform: "translate(" + (d % 2 ? 2 : -2) + "px," + y + "px) rotate(" + (d % 2 ? 0.25 : -0.25) + "deg)" }, { transform: "translate(0px,0px) rotate(0deg)" }], { duration: 100, delay: t * 1000, easing: "ease-out" });
      };
      for (i = 0; i < STRIKES.length; i++) bump(STRIKES[i][4] * P.c, i, i ? 3 : 9);
      for (i = 0; i < P.n; i++) bump(0.36 + i * 0.17, i, 2);
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, w = Math.min(0.2, 0.3 * E.dur), f = e > E.dur - w ? Math.max(0, (E.dur - e) / w) : 1;
      if (!st.base || f <= 0) return;
      var s = K.clamp((B.y1 - B.y0) / 200, 0.45, 1.3), cx = B.cx, cy = (B.y0 + B.y1) / 2, k = st.P.k, i, a, S, kick = 0;
      var P = plan(E), X = P.X, tS = P.tS, tD = P.tD;
      for (i = 0; i < P.n; i++) { a = e - (0.36 + i * 0.17); if (a >= 0 && a < 0.05) kick = Math.max(kick, 0.045 * Math.pow(1 - a / 0.05, 2) * (i % 2 ? -1 : 1)); }
      var slide = 0, pull = 0, stretch = 0;                        // the carriage return: a short yank back, then it zips off to the right
      if (e > tS) {
        a = (e - tS) / X;
        pull = a < 0.18 ? -Math.sin(a / 0.18 * Math.PI) * 0.03 * B.size : 0;
        slide = a < 0.18 ? pull : (Math.pow((a - 0.18) / 0.82, 2) * (B.x1 - cx + 110 * s)); if (a >= 0.18) stretch = 0.2 * (a - 0.18) / 0.82;
      }
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      function put(can, dx, dy, rot, z, ax) {
        g.save(); g.translate(cx + slide + dx * s, cy + dy * s); g.rotate(rot + (ax || 0)); g.scale(z * s * (1 + stretch), z * s * (1 - stretch * 0.25)); g.drawImage(can, -CX, -CY, W, H); g.restore();
      }
      if (e < STRIKES[STRIKES.length - 1][4] * P.c + 0.04) {   // the burst: each strike lands with a kick
        for (i = 0; i < STRIKES.length; i++) {
          S = STRIKES[i]; a = e - S[4] * P.c; if (a < 0) continue;
          put(st.plates[S[3]], S[0], S[1], S[2], 1 + 0.1 * Math.pow(Math.max(0, 1 - a / (0.04 * Math.max(0.6, P.c))), 2));
        }
      } else put(st.base, 0, 0, kick * 0.6, 1 + Math.abs(kick) * 0.8);
      g.restore();
      if (e > tD) {                                  // the bell: DING in the crook, ringing
        a = e - tD; var rg = Math.sin(a * 70) * Math.max(0, 1 - a / 0.3) * 0.07, pz = 1 + 0.4 * Math.max(0, 1 - a / 0.06);
        g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
        g.translate(cx + slide + (117 - CX) * s, cy + (62 - 100) * s); g.rotate(-0.1 + rg); g.scale(pz * s, pz * s);
        g.font = K.font(700, 25, "mono"); g.textAlign = "center"; g.fillStyle = K.pat("pop", 0.9, g); g.fillText("DING", 0, 0);
        g.lineWidth = 3.2; g.lineCap = "round"; g.strokeStyle = g.fillStyle;
        g.beginPath();
        for (i = -1; i <= 1; i++) { var an = -1.57 + i * 0.75; g.moveTo(Math.cos(an) * 24, -9 + Math.sin(an) * 22); g.lineTo(Math.cos(an) * 38, -9 + Math.sin(an) * 34); }
        g.stroke(); g.restore();
      }
      if (slide > 4) {                               // speed lines behind the zipping carriage
        g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
        var ln = Math.min(slide * 1.1, 260);
        for (i = 0; i < 4; i++) {
          g.fillStyle = K.pat(i % 2 ? "night" : "loss", 0.88, g);
          g.fillRect(cx + slide - 70 * s - ln * (0.6 + 0.2 * i % 0.7) - 10, cy + (i - 1.5) * 0.17 * B.size, ln * (0.6 + 0.2 * i % 0.7), 5);
        }
        g.restore();
      }
    }
  });
})();
