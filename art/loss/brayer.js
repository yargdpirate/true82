/* art/loss/brayer.js: Brayer. A hand roller (aqua body, yoke and grip) rolls the L in as five strips: two tall ones for the
   stem, three short ones for the foot, each strip ink-heavy where the roller touched down and thinning to dots until its
   seam (a stock slit every turn, staggered from strip to strip), heavy ridges at every edge. An aqua shadow plate lands
   off register behind it. Then the roller rolls back over the strips in reverse and picks the ink up again.
   Beats (x q for a short moment): the five rolls 0 to .23, the hold, the roll-back (slow in a long moment, up to .9 s).
   Plates (three short jobs): pink strips, aqua crescent (knocked out under the L). The roller and the clips are live. */
(function () {
  "use strict";
  var PW = 148, PH = 224, OX = 74, OY = 112, CW = 24.8, LH = 200, FT = 42, GAP = 3.2, PD = 70;
  var DIR = [1, -1, -1, 1, -1], DUR = [0.07, 0.07, 0.03, 0.03, 0.03], PHS = [48, 22, 20, 28, 14];
  function col(i) { var s = i < 2; return { x: OX - 62 + i * CW, y: OY - 100 + (s ? 0 : LH - FT), n: s ? LH : FT }; }
  function Lp(g, dx, dy) {                              // the whole L, one closed contour
    var x = OX - 62 + dx, y = OY - 100 + dy;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2 * CW, y); g.lineTo(x + 2 * CW, y + LH - FT);
    g.lineTo(x + 5 * CW, y + LH - FT); g.lineTo(x + 5 * CW, y + LH); g.lineTo(x, y + LH); g.closePath();
  }
  function strip(K, g, i) {                             // one roll's tone: saw teeth of ink between the seams
    var c = col(i), d = DIR[i], ys = d > 0 ? c.y : c.y + c.n, seams = [], a, k, s0 = 0, e0, ya, yb, t0, gr, yt, h;
    for (a = PHS[i]; a < c.n - 12; a += PD) seams.push(a);
    seams.push(c.n);
    for (k = 0; k < seams.length; k++) {
      e0 = seams[k]; ya = ys + d * s0; yb = ys + d * e0; yt = Math.min(ya, yb); h = Math.abs(yb - ya);
      t0 = 0.97 - 0.2 * s0 / c.n; gr = g.createLinearGradient(0, ya, 0, yb);
      gr.addColorStop(0, K.tone(t0)); gr.addColorStop(1, K.tone(t0 - 0.38 * (e0 - s0) / PD));
      g.fillStyle = gr; g.fillRect(c.x - 1.6, yt, CW + 3.2, h);
      g.fillStyle = K.tone(0.4); g.fillRect(c.x - 1.6, yt, 2.6, h); g.fillRect(c.x + CW - 1, yt, 2.6, h);
      s0 = e0 + GAP;
    }
  }
  function roller(K, g, x, y, mv, s) {                  // x, y: the roller's middle; mv: +1 rolling down, -1 up
    var w = CW * s * 1.6, t = 27 * s, hb = -mv, lw = Math.max(3, 3.4 * s);
    g.fillStyle = K.pat("pop", 0.3, g); g.fillRect(x - w / 2, y + (mv > 0 ? -48 * s : 0), w, 48 * s);   // the smear behind it
    g.fillStyle = K.pat("pop", 0.88, g); g.fillRect(x - w / 2, y - t / 2, w, t);
    g.fillStyle = K.pat("light", 0.6, g); g.fillRect(x - w / 2 + 3 * s, y - t / 2 + 4 * s, w - 6 * s, 5 * s);   // the roller's lit side
    g.strokeStyle = K.pat("pop", 0.88, g); g.lineWidth = lw; g.lineCap = "round"; g.beginPath();
    g.moveTo(x - w / 2, y); g.lineTo(x - w / 2, y + hb * 38 * s); g.lineTo(x + w / 2, y + hb * 38 * s); g.lineTo(x + w / 2, y);
    g.moveTo(x, y + hb * 38 * s); g.lineTo(x, y + hb * 72 * s); g.stroke();
    g.fillStyle = K.pat("light", 0.75, g); g.fillRect(x - 7 * s, Math.min(y + hb * 68 * s, y + hb * 112 * s), 14 * s, 44 * s);
  }
  T82ART.add("loss", "brayer", {
    name: "Brayer",
    by: "A hand roller rolls the L in as five ink-heavy strips with a seam slit every turn, an aqua plate lands off register, then it rolls back and lifts the ink away.",
    prep: function (K) {
      var st = K.st;
      return [
        function () { st.P = K.plate(PW, PH, 4207); },
        function () { st.pk = K.screen(st.P, "loss", function (g) { for (var i = 0; i < 5; i++) strip(K, g, i); }); },
        function () {
          st.aq = K.screen(st.P, "pop", function (g) {
            Lp(g, 7, 6); g.fillStyle = K.tone(0.6); g.fill();
            g.globalCompositeOperation = "destination-out"; Lp(g, 0, 0); g.fillStyle = K.tone(1); g.fill();
          });
        }
      ];
    },
    hit: function (K, E) {
      K.flash(E.first ? 0.55 : 0.4); K.shake(Math.max(E.dur, 0.42), E.first ? 8 : 6);
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, i, t = 0, c, d;
      if (!st.pk || !st.aq) return;
      var H = B.y1 - B.y0, s = H / LH, cx = B.cx, cy = (B.y0 + B.y1) / 2;
      var w = Math.min(0.2, 0.3 * E.dur), T = E.dur - w, f = e > T ? (E.dur - e) / w : 1;
      if (f <= 0) return;
      var q = K.clamp((E.dur - 0.1) / 0.65, 0.3, 1), ta = [], tf, xe = 0, tx, qe, r = [], rr = [], act = null, p;
      for (i = 0; i < 5; i++) { ta.push(0.01 + t); t += DUR[i] * q; }
      tf = 0.01 + t; xe = K.clamp(T - tf - 0.25, 0.1, 0.9); tx = T - xe; qe = xe / 0.24; t = tx;
      for (i = 4; i >= 0; i--) {                         // the roll-back runs the strips in reverse
        d = K.clamp((e - t) / (DUR[i] * qe), 0, 1); t += DUR[i] * qe;
        r[i] = K.clamp((e - ta[i]) / (DUR[i] * q), 0, 1); rr[i] = r[i] * (1 - d);
        if (d > 0 && d < 1) act = [i, 1 - d, -1]; else if (!act && r[i] > 0 && r[i] < 1) act = [i, r[i], 1];
      }
      function X(x) { return cx + (x - OX) * s; }
      function Y(y) { return cy + (y - OY) * s; }
      function clip(pad) {                               // the revealed part of every strip, as one clip
        g.beginPath();
        for (var j = 0; j < 5; j++) {
          if (rr[j] <= 0) continue;
          var cc = col(j), h = rr[j] * cc.n, y0 = DIR[j] > 0 ? cc.y : cc.y + cc.n - h;
          g.rect(X(cc.x) - s, Y(y0) - s, (CW + 2 + (pad ? 16 : 0)) * s, (h + 2 + (pad ? 16 : 0)) * s);
        }
        g.clip();
      }
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      g.save(); clip(1); g.drawImage(st.aq, X(0), Y(0), PW * s, PH * s); g.restore();
      g.save(); clip(0); g.drawImage(st.pk, X(0), Y(0), PW * s, PH * s); g.restore();
      if (act) {
        c = col(act[0]); p = act[1];
        d = DIR[act[0]];
        roller(K, g, X(c.x + CW / 2), Y((d > 0 ? c.y : c.y + c.n) + d * p * c.n), d * act[2], s);
      }
      g.restore();
    }
  });
})();
