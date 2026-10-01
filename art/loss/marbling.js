/* art/loss/marbling.js: Suminagashi. A pink ink drop falls down the line of the stem and lands on the elbow: rings of
   ink spread from it (pink, violet, a pink core, stock between them like marbled paper) and two combs drag them out,
   one up the stem and one along the foot, so the rings become nested bands in the shape of an L. The water rings
   once and stills; a violet echo ring drifts out. Then the combs are drawn back and the bands are drunk into the elbow.
   Plates: two scratch canvases (pink, violet) redrawn every frame: each band is the L filled in the ink's K.pat, its
   inner band knocked out (destination-out), so the nesting is real. Beats (s, x k for a short moment): drop 0 to .045,
   rings .045 to .12, stem comb .065 to .155, foot comb .115 to .195, ripple after; the exit takes the last .12 to .34 s. */
(function () {
  "use strict";
  var PI = Math.PI, BANDS = [[0, 1, 0.64, 0, 0], [1, 0.54, 0.3, 0.006, -0.005], [0, 0.2, 0, -0.005, 0.006]];     // [plate, outer, inner, dx, dy] (dmax, H), outermost first
  function rr(g, x, y, w, h, r) {                       // a clockwise rounded rectangle
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arc(x + w - r, y + r, r, -PI / 2, 0);
    g.lineTo(x + w, y + h - r); g.arc(x + w - r, y + h - r, r, 0, PI / 2);
    g.lineTo(x + r, y + h); g.arc(x + r, y + h - r, r, PI / 2, PI);
    g.lineTo(x, y + r); g.arc(x + r, y + r, r, PI, 1.5 * PI); g.closePath();
  }
  function lp(g, d, r, G, W) {                          // the L of half width d: two rounded bars along the skeleton; once the water
    var x0 = G.xc - d, x1 = G.xc + d, yT = G.yA - d, yB = G.yB + d, yF = G.yB - d, xR = G.xE + d, P = [], i, p, x, y;   // rings (W.A), a wavy outline
    if (W.A < 0.4 || G.yB - G.yA < r + 3 || G.xE - G.xc < r + 3) {
      rr(g, x0, yT, 2 * d, yB - yT, r); rr(g, x0, yF, xR - x0, 2 * d, r); return;
    }
    function seg(ax, ay, bx, by) { var n = Math.max(1, Math.ceil(Math.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay)) / 3)), j; for (j = 0; j < n; j++) P.push([ax + (bx - ax) * j / n, ay + (by - ay) * j / n]); }
    function arc(cx, cy, a0) { for (var j = 0; j < 6; j++) P.push([cx + r * Math.cos(a0 + j * PI / 12), cy + r * Math.sin(a0 + j * PI / 12)]); }
    arc(x0 + r, yT + r, PI); seg(x0 + r, yT, x1 - r, yT); arc(x1 - r, yT + r, -PI / 2); seg(x1, yT + r, x1, yF);
    seg(x1, yF, xR - r, yF); arc(xR - r, yF + r, -PI / 2); seg(xR, yF + r, xR, yB - r); arc(xR - r, yB - r, 0);
    seg(xR - r, yB, x0 + r, yB); arc(x0 + r, yB - r, PI / 2); seg(x0, yB - r, x0, yT + r);
    for (i = 0; i < P.length; i++) {
      x = P[i][0]; y = P[i][1];
      p = Math.max(0, Math.min(1, (G.yB - 1.2 * d - y) / W.L)); P[i][0] = x + W.A * p * Math.sin(PI * 2 * y / W.lam + W.ph);
      p = Math.max(0, Math.min(1, (x - G.xc - 1.2 * d) / W.L)); P[i][1] = y + W.A * p * Math.sin(PI * 2 * x / W.lam + W.ph + 1);
    }
    for (i = 0; i < P.length; i++) g[i ? "lineTo" : "moveTo"](P[i][0], P[i][1]);
    g.closePath();
  }
  function scratch(K, st, H) {
    var W = Math.ceil(H * 1.02), T = Math.ceil(H * 1.34), i, c;
    if (st.cv && st.H === Math.round(H)) return;
    st.H = Math.round(H); st.W = W; st.T = T; st.cv = [];
    for (i = 0; i < 2; i++) { c = document.createElement("canvas"); c.width = Math.round(W * K.d); c.height = Math.round(T * K.d); st.cv.push(c); }
  }
  T82ART.add("loss", "marbling", {
    name: "Suminagashi",
    by: "An ink drop lands on the elbow and spreads in rings like marbled paper; two combs drag the rings out into a nest of pink and violet bands in the shape of an L, the water rings once and stills, and the combs draw it back into the elbow.",
    hit: function (K, E) {
      var B = K.box, H = B.y1 - B.y0, k = K.clamp(E.dur / 0.9, 0.36, 1), x = B.cx - 0.18 * H, y = (B.y0 + B.y1) / 2 + 0.35 * H;
      K.flash(E.first ? 0.5 : 0.34); K.shake(Math.max(E.dur, 0.4), E.first ? 9 : 7);
      K.ring({ x: x, y: y, delay: 0.045 * k, dur: 0.38, r0: 8, r1: 0.5 * H, w0: 7, ink: "night", cov: 0.7 });
      K.ring({ x: x, y: y, delay: 0.07 * k, dur: 0.42, r0: 6, r1: 0.62 * H, w0: 4, ink: "loss", cov: 0.88 });
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, f = K.fade(E, e), H = B.y1 - B.y0, d = K.d, c = K.clamp, i, j, x, b, a, o, hh;
      if (f <= 0) return;
      scratch(K, st, H);
      var k = c(E.dur / 0.9, 0.36, 1), tI = 0.045 * k, X = Math.min(0.34, Math.max(0.12, 0.3 * E.dur));
      var tS = tI + 0.11 * k, tF = tI + 0.15 * k, tE = Math.max(E.dur - X, tF + 0.06), u = c((e - tE) / X, 0, 1), u2 = u * u;
      var ps = K.ease.out(c((e - tI - 0.02 * k) / (0.09 * k), 0, 1)) * (1 - u2), pf = K.ease.out(c((e - tI - 0.07 * k) / (0.08 * k), 0, 1)) * (1 - u2);
      var dm = 0.15 * H, cx = B.cx, cy = (B.y0 + B.y1) / 2, W = st.W, T = st.T;
      var G = { xc: -0.33 * H + dm, xE: 0, yA: 0, yB: 0.5 * H - dm }, yAf = -0.5 * H + dm, xEf = 0.33 * H - dm;
      G.yA = G.yB + (yAf - G.yB) * ps; G.xE = G.xc + (xEf - G.xc) * pf;
      var rho = 1 - 0.62 * K.smooth(0.25, 1, Math.min(ps, pf));
      var t2 = E.dur > 0.8 ? tF + 0.42 * (tE - tF) : 1e9, rip = 0;      // the water rings after the combs and after a second, small drop
      if (e > tF) rip += Math.min(1, (e - tF) / 0.05) * Math.exp(-(e - tF) / 0.5);
      if (e > t2 + 0.03) rip += 0.8 * Math.min(1, (e - t2 - 0.03) / 0.05) * Math.exp(-(e - t2 - 0.03) / 0.45);
      var WV = { A: 0.014 * H * rip * (1 - K.smooth(0, 0.3, u)), lam: 0.34 * H, L: 0.25 * H, ph: -PI * 2 * 2.4 * Math.max(0, e - tF) };
      function gr(n) { return K.ease.back(c((e - tI - 0.012 * k * (2 - n)) / (0.075 * k), 0, 1)) * (1 - u2 * 0.85); }
      function ring(x, ink, cov, a0, a1) {                // one ring of the L between half widths a0 and a1
        x.globalCompositeOperation = "source-over"; x.beginPath(); lp(x, a0, rho * a0, G, WV); x.fillStyle = K.pat(ink, cov, x); x.fill();
        if (a1 <= 0) return;
        x.globalCompositeOperation = "destination-out"; x.beginPath(); lp(x, a1, rho * a1, G, WV); x.fillStyle = K.tone(1); x.fill();
      }
      var inks = ["loss", "night"], covs = [0.88, 0.84], ox = Math.round((cx - W / 2) * d) / d, oy = Math.round((cy - T / 2) * d) / d;
      for (j = 0; j < 2; j++) {                          // the nested bands, one scratch canvas per ink, outermost first
        x = st.cv[j].getContext("2d"); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, st.cv[j].width, st.cv[j].height);
        x.setTransform(d, 0, 0, d, 0, 0); x.translate(W / 2, T / 2);
        if (j === 1 && e > tF - 0.02) {                  // the echo ring, drifting out as the water stills
          a = dm * (1 + 0.36 * K.ease.out(c((e - tF + 0.02) / 0.12, 0, 1)) + 0.16 * K.smooth(tF, E.dur, e)) * (1 - u2);
          ring(x, "night", 0.88, a, a - 6);
        }
        if (j === 0 && e > t2 + 0.02 && e < t2 + 0.45) {  // the second drop's ring leaves the outer band and spreads
          a = c((e - t2 - 0.02) / 0.4, 0, 1); a = dm * (1 + 1.1 * K.ease.out(a)) + 4;
          ring(x, "loss", 0.88, a, a - 6 + 3 * (a / dm - 1) / 1.1);
        }
        for (i = 0; i < BANDS.length; i++) {
          b = BANDS[i]; if (b[0] !== j || e < tI + 0.012 * k * (2 - i)) continue;
          o = dm * gr(i);
          x.save(); x.translate(b[3] * H, b[4] * H);
          ring(x, inks[j], covs[j], o * b[1], b[2] ? o * b[2] : 0);
          x.restore();
        }
      }
      g.save(); g.beginPath(); g.rect(0, K.top, K.w, K.h - K.top); g.clip();
      g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      g.drawImage(st.cv[1], ox + 3.5, oy - 3, W, T);     // the violet plate lands off register
      g.drawImage(st.cv[0], ox, oy, W, T);
      g.translate(cx, cy);
      if (e < tI + 0.01) {                               // the drop: a smeared streak down the stem's line to the elbow
        a = c(e / tI, 0, 1);
        g.beginPath(); g.ellipse(G.xc, G.yB - 1.4 * H * (1 - a * a), 0.065 * H, 0.2 * H, 0, 0, Math.PI * 2); g.fillStyle = K.pat("loss", 0.86, g); g.fill();
      }
      if (e > t2 - 0.05 && e < t2 + 0.02) {              // the second drop, a small one, falls onto the stem
        a = c((e - t2 + 0.05) / 0.05, 0, 1);
        g.beginPath(); g.ellipse(G.xc, yAf - 0.9 * H * (1 - a * a), 0.04 * H, 0.12 * H, 0, 0, Math.PI * 2); g.fillStyle = K.pat("loss", 0.86, g); g.fill();
      }
      if (e > tI && e < tF + 0.08 * k) {                 // the two combs (light): pulled along, then thrown off
        hh = Math.max(0, e - tS); a = Math.max(0, e - tF);
        var ys = G.yA - 1.1 * dm - 220 * H * hh * hh, xs = G.xE + 1.1 * dm + 220 * H * a * a;
        g.beginPath();
        g.rect(G.xc - 1.25 * dm, ys - 0.045 * H, 2.5 * dm, 0.045 * H);
        for (i = 0; i < 5; i++) g.rect(G.xc - 1.15 * dm + i * 0.575 * dm, ys, 0.028 * H, 0.09 * H);
        g.rect(xs, G.yB - 1.25 * dm, 0.045 * H, 2.5 * dm);
        for (i = 0; i < 5; i++) g.rect(xs - 0.09 * H, G.yB - 1.15 * dm + i * 0.575 * dm, 0.09 * H, 0.028 * H);
        g.fillStyle = K.pat("light", 0.7, g); g.fill();
      }
      g.restore();
    }
  });
})();
