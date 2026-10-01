/* art/loss/bigtype.js: Big Type. Kinetic type on a Swiss poster grid: a giant flat pink L as wide as the card slams in
   from the left; AT drops into its crook and bumps it; the city, set as big as the crook allows, hits from the right,
   one word to a line, each hit shoving what is already there. Then the whole poster zips off the sides, last in first
   out. Two inks and a ghost: the L and a violet crescent, the city in white over a violet plate that drifts into register.
   Beats: L lands .05, AT .11, the city .16 and .21 (half as long in a short moment); hold; the zip the last .06 s + fade.
   All live: K.pat fills at .8 to .86, no prep (the letters are cut to the card at draw time). */
(function () {
  "use strict";

  function lay(K, g, E, RW, RH) {                  // the city's lines, and the one size that fits them in the crook under AT
    var words = String(E.city || "").toUpperCase().split(" ").filter(Boolean), L, w = 0, i, cap;
    if (words.length < 2) L = words.length ? words : ["L"]; else L = [words.slice(0, -1).join(" "), words[words.length - 1]];
    g.font = K.font(700, 100, "disp");
    cap = g.measureText("H").actualBoundingBoxAscent / 100 || 0.72;
    for (i = 0; i < L.length; i++) w = Math.max(w, g.measureText(L[i]).width / 100);
    return { L: L, cap: cap, px: Math.min(RW / w, 0.76 * RH / (cap * (1 + 1.12 * (L.length - 1))), 400) };
  }

  T82ART.add("loss", "bigtype", {
    name: "Big Type",
    by: "A flat pink poster L as wide as the card slams in, AT drops into its crook, the city hits from the right in big white type, each word shoving the last; then it all zips off the sides.",
    hit: function (K, E) {
      var B = K.box;
      K.spark({ x: B.x0 + 30, y: B.y1 - 20, n: 14, ink: function (q) { return q() < 0.5 ? "night" : "loss"; }, sp: [160, 420], r: [1.2, 3.2], life: [0.25, 0.3], grav: 700, seed: E.seed, streak: true });
      K.flash(E.first ? 0.6 : 0.42);
      K.shake(Math.max(E.dur, 0.42), E.first ? 9 : 7);
    },
    draw: function (K, E, e) {
      var g = K.g, B = K.box, w = Math.min(0.2, 0.3 * E.dur), f = e > E.dur - w ? Math.max(0, (E.dur - e) / w) : 1;
      if (f <= 0 || !K.ready) return;                // the type waits for the display face
      var BW = B.x1 - B.x0, H = B.y1 - B.y0, m = Math.max(10, 0.04 * BW), xL = B.x0 + m, xR = B.x1 - m, sw = 0.27 * H, ft = 0.2 * H;
      var cx0 = xL + sw + 0.12 * H, RW = xR - cx0, cy0 = B.y0 + 0.02 * H, RH = B.y1 - ft - 0.07 * H - cy0;
      var st = K.st, key = String(E.city) + "|" + Math.round(RW) + "|" + Math.round(RH);
      if (st.key !== key) { st.key = key; st.lay = lay(K, g, E, RW, RH); }
      var Y = st.lay, n = Y.L.length + 2, c = Math.max(0.5, Math.min(1, (E.dur - 0.12) / 0.5)), fl = 0.05 * c, gap = 0.055 * c;
      var te = E.dur - w - 0.06, sg = 0.03 * c, FT = Math.max(0.08, E.dur - 0.02 - te - (n - 1) * sg), A = 0.03 * H;
      var gd = K.lerp(8, 3, K.smooth(0.3, E.dur - 0.3, e)), k, j, u, a, dx, dy, sx, sy, bx, by, t0, t1, ex;
      // element k: 0 the L (from the left), 1 AT (from above), 2... the city's lines (from the right)
      function place(k) {                          // its offset and squash at e, then the shoves of the later hits
        t0 = k * gap; u = K.clamp((e - t0) / fl, 0, 1); ex = (1 - u) * (1 - u); dx = 0; dy = 0; sx = 1; sy = 1;
        if (k === 0) dx = -(BW + 20) * ex; else if (k === 1) dy = -0.7 * H * ex; else dx = (BW + 20) * ex;
        a = e - t0 - fl;
        if (a > 0 && a < 0.1 * c) { u = Math.sin(a / (0.1 * c) * Math.PI); if (k === 1) sy = 1 - 0.18 * u; else sx = 1 - 0.05 * u; }   // the landing's squash
        for (bx = 0, by = 0, j = k + 1; j < n; j++) {
          a = e - j * gap - fl;
          if (a > 0) { u = A * Math.exp(-a * 20) * Math.cos(a * 46); if (j === 1) by += u; else bx -= u; }
        }
        a = e - te - (n - 1 - k) * sg;
        if (a > 0) { u = Math.min(1, a / FT); u *= u; dx += (k === 0 ? -1 : 1) * u * (BW + 40); }   // the zip
        dx += bx; dy += by;
      }
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      place(0);
      if (e >= 0) {                                // the L: a flat slab as wide as the card, a violet crescent of misregistration
        g.save(); g.translate(dx + xL * (1 - sx), 0); g.scale(sx, 1);
        g.beginPath(); g.rect(B.x0 - 400, B.y0 - 400, BW + 800, H + 800); g.moveTo(xL, B.y0); g.lineTo(xL + sw, B.y0); g.lineTo(xL + sw, B.y1 - ft); g.lineTo(xR, B.y1 - ft); g.lineTo(xR, B.y1); g.lineTo(xL, B.y1); g.closePath(); g.clip("evenodd");
        g.translate(gd, gd * 0.85); g.beginPath(); g.moveTo(xL, B.y0); g.lineTo(xL + sw, B.y0); g.lineTo(xL + sw, B.y1 - ft); g.lineTo(xR, B.y1 - ft); g.lineTo(xR, B.y1); g.lineTo(xL, B.y1); g.closePath();
        g.fillStyle = K.pat("night", 0.65, g); g.fill(); g.restore();
        g.save(); g.translate(dx + xL * (1 - sx), 0); g.scale(sx, 1);
        g.beginPath(); g.moveTo(xL, B.y0); g.lineTo(xL + sw, B.y0); g.lineTo(xL + sw, B.y1 - ft); g.lineTo(xR, B.y1 - ft); g.lineTo(xR, B.y1); g.lineTo(xL, B.y1); g.closePath(); g.clip();
        var sa = (H - ft) / 5, fa = (xR - xL - sw) / 5, kk, q = function (v) { return Math.round(v * K.d) / K.d; };   // the ink thins toward both ends: five stepped bands
        for (kk = 0; kk < 5; kk++) {
          g.fillStyle = K.pat("loss", 0.88 - 0.06 * kk, g);
          g.fillRect(xL, q(B.y1 - ft - (kk + 1) * sa), sw, q(B.y1 - ft - kk * sa) - q(B.y1 - ft - (kk + 1) * sa));
          g.fillRect(q(xL + sw + kk * fa), B.y1 - ft, q(xL + sw + (kk + 1) * fa) - q(xL + sw + kk * fa), ft);
        }
        g.fillStyle = K.pat("loss", 0.88, g); g.fillRect(xL, B.y1 - ft, sw, ft); g.restore();
      }
      g.textAlign = "left"; g.textBaseline = "alphabetic";
      var lc = 0.15 * RH, yAT = cy0 + lc, apx = lc / Y.cap, pitch = Y.px * Y.cap * 1.12, tw;
      for (k = 1; k < n; k++) {
        if (e < k * gap) continue;
        place(k);
        g.save();
        if (k === 1) {                             // AT, small, in violet, then a rule out to the edge; it lands with a squash
          g.translate(cx0 + dx, yAT + dy); g.scale(1, sy); g.font = K.font(700, apx, "disp");
          g.fillStyle = K.pat("night", 0.9, g); g.fillText("AT", 0, 0);
          tw = g.measureText("AT").width + 10; g.fillRect(tw, -lc * 0.5 - 1.5, Math.max(0, RW - tw), 3);
        } else {
          var li = k - 2, base = cy0 + RH - (Y.L.length - 1 - li) * pitch;     // the city sits on the foot, AT hangs from the top
          g.translate(cx0 + dx, 0); g.scale(sx, 1); g.font = K.font(700, Y.px, "disp");
          g.fillStyle = K.pat("night", 0.7, g); g.fillText(Y.L[li], gd * 0.8, base + gd * 0.7);
          g.fillStyle = K.pat("light", 0.86, g); g.fillText(Y.L[li], 0, base);
        }
        g.restore();
      }
      g.restore();
    }
  });
})();
