/* ---------- TRUE 82 ART: THE COAST (a scene for the results print) ----------
   The season as a rocky coast: the record is the cliff top, a striped lighthouse stands on the best point it
   reaches (a rock tower in the surf when the year never rose), its beam sweeps a banded sky, a bullseye sun (or
   moon) sets behind the headland, surf breaks along the foot, and every loss is a plume of spray over the edge.
   Rules: art/CONTRACT.md ("A scene"). Tone only: black at an alpha is coverage, never a color. */
(function () {
  "use strict";
  var A = typeof window !== "undefined" ? window.T82ART : null;
  if (!A || typeof A.add !== "function") return;
  var PI = Math.PI;

  function derive(K, D, L) {
    var m = D.m, WL = L.WL, vs = L.vs, SC = L.SC, X0 = L.X0, X1 = L.X1, FH = L.FY1 - L.FY0, i, x, y, hi = 0, lo = 0, h = 0.32 * FH;
    var r = K.rand((D.seed * 2654435761 + 57) >>> 0), nz = K.noise1D(D.seed + 11);
    for (i = 0; i <= 82; i++) { hi = Math.max(hi, m[i]); lo = Math.min(lo, m[i]); }
    var amp = Math.min(1.45, hi > 0 ? (WL - L.FY0 - 1.02 * h - 8) / (SC * hi) : 9, lo < 0 ? (L.FY1 - WL - 6 * vs) / (SC * -lo) : 9);
    function cr(u) {                                       // Catmull-Rom through the running margin
      u = K.clamp(u, 0, 82);
      var j = Math.min(81, Math.floor(u)), f = u - j, a = m[Math.max(0, j - 1)], b = m[j], c = m[j + 1], d = m[Math.min(82, j + 2)];
      return 0.5 * (2 * b + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
    }
    var yEnd = WL - SC * amp * m[82];
    function S(x) {                                        // the cliff top: the season's line
      var y = x < X0 ? WL + 14 * vs * (1 - x / X0) : x <= X1 ? WL - SC * amp * cr((x - X0) / (X1 - X0) * 82) : K.lerp(yEnd, WL + 26 * vs, K.smooth(X1, X1 + 90, x));
      return y + K.fbm(nz, x * 0.028, 4) * 11 * vs * K.smooth(X0, X0 + 32, x);
    }
    var Q = [];
    for (x = L.FX0 - 10; x <= L.FX1 + 10; x += 4) Q.push(x, S(x));
    // the lighthouse: on the best point right of the roster
    var xmin = L.roster ? L.roster.x + L.roster.w + 30 : 560, xt = X1 - 20, yt = 1e9;
    for (x = xmin; x <= X1 - 4; x += 4) { y = S(x); if (y < yt) { yt = y; xt = x; } }
    var tw = { x: xt, yb: S(xt) + 4, h: h };
    tw.yt = tw.yb - 0.68 * h; tw.yl = tw.yb - 0.78 * h;
    var marks = D.losses.map(function (g) { var mx = D.X(g + 1); return [mx, S(mx), r()]; });
    var sr = 0.13 * FH, sx = xt > 760 ? xt - 250 : xt + 240;
    D.cs = { Q: Q, S: S, tw: tw, marks: marks, sun: { x: K.clamp(sx, L.FX0 + 3 * sr, L.FX1 - 3 * sr), y: WL - sr * (0.2 + 1.8 * D.wp), r: sr }, dir: -1, a: 0.05, spread: 0.085 };
  }

  function layers(K, P, D, L) {
    var V = D.cs, T = K.tone, WL = L.WL, vs = L.vs, rs = L.rs, FX0 = L.FX0 - 10, FW = L.FX1 - L.FX0 + 20, night = D.pal.key === "night", Q = V.Q, tw = V.tw, sun = V.sun, h = tw.h;
    var FH = L.FY1 - L.FY0, vv = Math.max(0.8, vs), u = rs > 0.8 ? 1.25 : 1.3, ln = Math.max(0.8, rs) * 4.4;
    function land(g) { var j; g.beginPath(); g.moveTo(Q[0], L.FY1 + 10); for (j = 0; j < Q.length; j += 2) g.lineTo(Q[j], Q[j + 1]); g.lineTo(Q[Q.length - 2], L.FY1 + 10); g.closePath(); }
    function edge(g) { var j; g.beginPath(); g.moveTo(Q[0], Q[1]); for (j = 2; j < Q.length; j += 2) g.lineTo(Q[j], Q[j + 1]); }
    function wid(y) { return (0.3 + (0.19 - 0.3) * (tw.yb - y) / (tw.yb - tw.yt)) * h; }
    function tower(g, k) {                                  // the whole silhouette, grown by k: body, gallery, lantern, roof
      var x = tw.x, w0 = wid(tw.yb) / 2 + k, w1 = wid(tw.yt) / 2 + k, yg = tw.yt - 0.035 * h, ll = tw.yl;
      g.beginPath(); g.moveTo(x - w0, tw.yb + 8); g.lineTo(x - w1, tw.yt); g.lineTo(x - 0.15 * h - k, tw.yt); g.lineTo(x - 0.15 * h - k, yg); g.lineTo(x - 0.075 * h - k, yg); g.lineTo(x - 0.075 * h - k, ll - 0.065 * h);
      g.lineTo(x - 0.1 * h - k, ll - 0.065 * h); g.lineTo(x, ll - 0.18 * h - k); g.lineTo(x + 0.1 * h + k, ll - 0.065 * h); g.lineTo(x + 0.075 * h + k, ll - 0.065 * h); g.lineTo(x + 0.075 * h + k, yg);
      g.lineTo(x + 0.15 * h + k, yg); g.lineTo(x + 0.15 * h + k, tw.yt); g.lineTo(x + w1, tw.yt); g.lineTo(x + w0, tw.yb + 8); g.closePath(); g.fill();
    }
    function spray(g, q, e) {                               // a loss: a plume of three rays and their drops over the edge (e: thickness added for a keyline)
      var x = q[0], y = q[1], l = (15 + 9 * q[2]) * u, j, a, d;
      for (j = -1; j <= 1; j++) {
        a = j * 0.62; d = l * (j ? 0.72 : 1);
        g.beginPath(); g.moveTo(x - 2.4 * u - e, y + 2); g.lineTo(x + Math.sin(a) * (d + e), y - Math.cos(a) * (d + e)); g.lineTo(x + 2.4 * u + e, y + 2); g.closePath(); g.fill();
        K.circle(g, x + Math.sin(a) * d * 1.2, y - Math.cos(a) * d * 1.2 - 2 * u, 3.4 * u + e); g.fill();
      }
    }
    // the beam: a wedge from the lantern, tilted a little up and fading with distance
    function beam(g, t0, t1, len, dir) {
      var a = V.a * dir, s = V.spread, x0 = tw.x, y0 = tw.yl, c = Math.cos(a), sn = Math.sin(a), gr;
      gr = g.createLinearGradient(x0, y0, x0 + dir * len * c, y0 - len * sn); gr.addColorStop(0, T(t0)); gr.addColorStop(1, T(t1));
      g.fillStyle = gr; g.beginPath(); g.moveTo(x0, y0);
      g.lineTo(x0 + dir * len * Math.cos(a + s * dir), y0 - len * Math.sin(a + s * dir)); g.lineTo(x0 + dir * len * Math.cos(a - s * dir), y0 - len * Math.sin(a - s * dir)); g.closePath(); g.fill();
    }
    function sky(fn, after) {
      return function (g) {
        g.save(); g.beginPath(); g.rect(FX0, L.FY0 - 10, FW, WL - L.FY0 + 10); g.clip(); fn(g);
        K.knock(g, function (g2) { land(g2); g2.fill(); g2.lineWidth = ln * 1.8; g2.lineJoin = "round"; edge(g2); g2.stroke(); tower(g2, ln * 0.6); V.marks.forEach(function (q) { spray(g2, q, 1.6); }); });
        g.restore();
        if (after) after(g);
      };
    }
    var BN = 6;
    function bands(g, tones, extra) {                       // stepped bokashi: flat bands of one coverage each, a stock line between
      var j, y0 = L.FY0 - 10, bh = (WL - y0) / BN;
      for (j = 0; j < BN; j++) { g.fillStyle = T(tones[j]); g.fillRect(FX0, y0 + j * bh, FW, bh + 1); }
      K.knock(g, function (g2) { for (j = 1; j < BN; j++) g2.fillRect(FX0, y0 + j * bh - 0.8 * vv, FW, 1.6 * vv); });
    }
    function disc(g, k) { K.circle(g, sun.x, sun.y, sun.r * k); }
    var skyLight = sky(function (g) {
      bands(g, [0.04, 0.1, 0.18, 0.3, 0.46, 0.66]);
      beam(g, 0.6, 0.04, 900, V.dir);
      g.fillStyle = T(0.95); disc(g, 1); g.fill();
      g.strokeStyle = T(0.55); [[1.4, 0.2], [2.0, 0.17], [2.7, 0.15]].forEach(function (c, i) { g.globalAlpha = 1 - i * 0.28; g.lineWidth = sun.r * c[1]; disc(g, c[0]); g.stroke(); }); g.globalAlpha = 1;
      if (night) { g.save(); disc(g, 1); g.clip(); K.knock(g, function (g2) { K.circle(g2, sun.x + sun.r * 0.4, sun.y - sun.r * 0.15, sun.r * 0.84); g2.fill(); }); g.restore(); }
      var gr = g.createRadialGradient(tw.x, tw.yl, 0, tw.x, tw.yl, 0.9 * h); gr.addColorStop(0, T(0.85)); gr.addColorStop(1, T(0)); g.fillStyle = gr; g.fillRect(tw.x - h, tw.yl - h, 2 * h, 2 * h);
    }, function (g) {
      var b, y0, y1; g.fillStyle = T(0.95);                                                // the tower's stripes, the lantern, the spray: white where the aqua line lies under them
      for (b = 0; b < 5; b += 2) {
        y0 = tw.yb - (tw.yb - tw.yt) * b / 5; y1 = tw.yb - (tw.yb - tw.yt) * (b + 1) / 5;
        g.beginPath(); g.moveTo(tw.x - wid(y0) / 2, y0); g.lineTo(tw.x + wid(y0) / 2, y0); g.lineTo(tw.x + wid(y1) / 2, y1); g.lineTo(tw.x - wid(y1) / 2, y1); g.closePath(); g.fill();
      }
      g.fillRect(tw.x - 0.075 * h, tw.yl - 0.065 * h, 0.15 * h, 0.1 * h);
      V.marks.forEach(function (q) { spray(g, q, 0); });
    });
    var skyAqua = sky(function (g) {
      g.fillStyle = K.vgrad(g, WL - 0.3 * FH, WL, [[0, 0], [0.6, 0.1], [1, 0.4]]); g.fillRect(FX0, WL - 0.3 * FH, FW, 0.3 * FH);
      beam(g, 0.7, 0.03, 900, V.dir); beam(g, 0.5, 0.02, 0.33 * 900, -V.dir);
      if (night) { g.fillStyle = T(0.95); D.stars.forEach(function (st) { g.globalAlpha = st.a; K.circle(g, st.x, st.y, st.r * 2); g.fill(); }); g.globalAlpha = 1; disc(g, 1); g.fill(); }
      K.knock(g, function (g2) { if (!night) { disc(g2, 1.08); g2.fill(); } });
    }, function (g) { g.fillStyle = T(0.95); g.fillRect(tw.x - 0.075 * h, tw.yl - 0.065 * h, 0.15 * h, 0.1 * h); });
    var skyKey = sky(function (g) {
      bands(g, [0.6, 0.5, 0.38, 0.26, 0.14, 0]);
      K.knock(g, function (g2) {
        beam(g2, 1, 0.9, 900, V.dir);
        if (!night) { disc(g2, 1.1); g2.fill(); } else D.stars.forEach(function (st) { K.circle(g2, st.x, st.y, st.r * 2.4); g2.fill(); });
      });
    });
    var landLight = function (g) {
      K.knock(g, function (g2) { land(g2); g2.fill(); });
      var j, y0, r = K.rand(D.seed + 21), x, w, y;
      g.fillStyle = T(0.9);
      for (j = FX0; j < FX0 + FW; j += 14) { y0 = V.S(j + 7); if (y0 < WL - 4) { g.beginPath(); g.arc(j + 7, WL, 7 * vv + 1, PI, 0); g.fill(); } }
      for (j = 0, y = WL + 13 * vv; y < L.FY1; j++, y += (10 + j * 2.8) * vv) {                // whitecaps, longer and thicker nearer
        for (x = FX0 + r() * 80; x < FX0 + FW; x += 90 + r() * 170) { w = (14 + j * 3.5) * (0.6 + r() * 0.8); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - (1.6 + j * 0.35) * vv, x + w, y); g.quadraticCurveTo(x + w / 2, y + (0.9 + j * 0.2) * vv, x, y); g.closePath(); g.fill(); }
        w = sun.r * 1.6 * (1 - (y - WL) / (L.FY1 - WL) * 0.7) * (0.5 + r() * 0.6); g.fillRect(sun.x - w / 2 + (r() - 0.5) * 10, y + 3 * vv, w, (1.8 + j * 0.3) * vv);
      }
      var bx = FX0 + 0.27 * FW, by = WL + 0.4 * (L.FY1 - WL), bl = 0.07 * FW, bh = 0.13 * bl;      // a sloop under sail
      g.fillStyle = T(0.95);
      g.beginPath(); g.moveTo(bx - bl / 2, by); g.lineTo(bx + bl / 2, by); g.lineTo(bx + bl * 0.36, by + bh); g.lineTo(bx - bl * 0.42, by + bh); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(bx - bl * 0.03, by - bl * 0.8); g.lineTo(bx - bl * 0.03, by - bh * 0.4); g.lineTo(bx - bl * 0.4, by - bh * 0.4); g.closePath(); g.fill();
      g.fillStyle = T(0.6); g.beginPath(); g.moveTo(bx + bl * 0.05, by - bl * 0.62); g.lineTo(bx + bl * 0.05, by - bh * 0.4); g.lineTo(bx + bl * 0.36, by - bh * 0.4); g.closePath(); g.fill();
    };
    var landAqua = function (g) {
      g.fillStyle = K.vgrad(g, WL, L.FY1, [[0, 0.3], [1, 0.56]]); g.fillRect(FX0, WL, FW, L.FY1 - WL + 10);
      var r = K.rand(D.seed + 33), j, y, x, am, wl, ph;
      K.knock(g, function (g2) {
        g2.lineJoin = "round";
        for (j = 0, y = WL + 9 * vv; y < L.FY1; j++, y += (8 + j * 2.6) * vv) {
          g2.lineWidth = (1.1 + j * 0.42) * vv; g2.setLineDash([60 + r() * 150, 14 + r() * 40, 20 + r() * 60, 12 + r() * 30]); am = (0.7 + j * 0.35) * vv; wl = 30 + j * 6; ph = r() * 6;
          g2.beginPath(); for (x = FX0; x <= FX0 + FW; x += 6) g2.lineTo(x, y + Math.sin(x / wl * 6.28 + ph) * am); g2.stroke();
        }
        g2.setLineDash([]); tower(g2, 0);
      });
      g.fillStyle = T(0.8);
      for (j = FX0; j < FX0 + FW; j += 14) { if (V.S(j + 7) < WL - 4) { g.beginPath(); g.arc(j + 7, WL, 7 * vv + 1, PI, 0); g.fill(); } }
      g.save(); land(g); g.clip(); g.strokeStyle = T(0.38); g.lineWidth = ln * 3; g.lineJoin = "round"; edge(g); g.stroke(); g.restore();   // the lit rim of the rock
    };
    var landKey = function (g) {
      g.fillStyle = K.vgrad(g, L.FY0, L.FY1, [[0, 0.4], [0.6, 0.55], [1, 0.7]]); land(g); g.fill();
      var r = K.rand(D.seed + 5), x, y0;
      K.knock(g, function (g2) {                                                            // the cliff face, hatched like a woodcut
        g2.lineCap = "butt"; g2.lineWidth = 2.6 * Math.max(0.8, rs);
        for (x = FX0 + 4; x < FX0 + FW; x += 11) { y0 = V.S(x); if (y0 < WL - 6) { g2.beginPath(); g2.moveTo(x, y0 + 5); g2.lineTo(x, Math.min(WL, y0 + (14 + 120 * r() * r()) * vv)); g2.stroke(); } }
        tower(g2, 0);
      });
    };
    var line = function (g) {
      g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = T(0.95); g.lineWidth = ln * 0.9; edge(g); g.stroke();
      g.fillStyle = T(0.95);
      g.beginPath(); g.moveTo(tw.x - 0.34 * h, tw.yb + 0.09 * h); g.lineTo(tw.x - 0.23 * h, tw.yb - 0.01 * h); g.lineTo(tw.x - 0.08 * h, tw.yb - 0.035 * h); g.lineTo(tw.x + 0.1 * h, tw.yb - 0.01 * h);
      g.lineTo(tw.x + 0.25 * h, tw.yb + 0.02 * h); g.lineTo(tw.x + 0.36 * h, tw.yb + 0.09 * h); g.closePath(); g.fill();                  // the rock he stands on
      K.knock(g, function (g2) { tower(g2, 0); });
      tower(g, 0);
      g.fillStyle = T(0.95); V.marks.forEach(function (q) { spray(g, q, 0); });
    };
    return [
      { ink: "light", role: "sky", draw: skyLight }, { ink: "pink", role: "sky", draw: skyAqua }, { ink: "blue", role: "sky", draw: skyKey },
      { ink: "light", role: "land", draw: landLight }, { ink: "pink", role: "land", draw: landAqua }, { ink: "blue", role: "land", draw: landKey },
      { ink: "pink", role: "line", draw: line }
    ];
  }
  // the fill's front line runs down through the rock and the sea
  function body(g, D, L) {
    var Q = D.cs.Q, j;
    g.moveTo(Q[0], L.FY1 + 10);
    for (j = 0; j < Q.length; j += 2) g.lineTo(Q[j], Math.min(Q[j + 1], L.WL));
    g.lineTo(Q[Q.length - 2], L.FY1 + 10); g.closePath();
  }

  A.add("scene", "lighthouse", {
    name: "The Coast",
    by: "A rocky coast: the record is the cliff top, a striped lighthouse on its best point sweeps a beam over a banded sky, spray over the edge for every loss.",
    lights: ["golden", "dusk", "night"],
    derive: derive, layers: layers, body: body
  });
})();
