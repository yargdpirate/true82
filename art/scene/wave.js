/* ---------- TRUE 82 ART: THE WAVE (a scene for the results print) ----------
   The record is the sea: it curls over its best night in foam claws around a sun (or moon), with wavelets over its
   other highs, a far peak, bands of cloud, gulls, and a spindrift flick on the line for every loss. Woodblock
   manner: bokashi sky, echo lines carved through the water. Rules: art/CONTRACT.md ("A scene"), tone only. */
(function () {
  "use strict";
  var A = typeof window !== "undefined" ? window.T82ART : null;
  if (!A || typeof A.add !== "function") return;
  var PI = Math.PI, ECHO = [12, 28, 49, 79, 119, 171];

  function bz(a, b, c, d, n, o) {                          // a cubic, appended to o as x, y pairs
    for (var j = 0, t, u; j <= n; j++) {
      t = j / n; u = 1 - t;
      o.push(u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]);
    }
  }

  function derive(K, D, L) {
    var m = D.m, vs = L.vs, X0 = L.X0, X1 = L.X1, FH = L.FY1 - L.FY0, i, j, x, mx = 0, mn = 0;
    var r = K.rand((D.seed * 2654435761 + 31) >>> 0), nz = K.noise1D(D.seed + 3);
    for (i = 0; i <= 82; i++) { mx = Math.max(mx, m[i]); mn = Math.min(mn, m[i]); }
    var rg = Math.max(8, mx - mn), k = Math.min(1.5 * L.SC, 0.44 * FH / rg), ym = L.FY0 + 0.6 * FH, yh = ym - 0.05 * FH;
    function cr(u) {                                       // Catmull-Rom through the running margin
      u = K.clamp(u, 0, 82);
      var j = Math.min(81, Math.floor(u)), f = u - j, a = m[Math.max(0, j - 1)], b = m[j], c = m[j + 1], d = m[Math.min(82, j + 2)];
      return 0.5 * (2 * b + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
    }
    function S(x) {                                        // the sea's surface: the season's line
      var u = K.clamp((x - X0) / (X1 - X0) * 82, 0, 82), y = ym - k * (cr(u) - (mx + mn) / 2);
      y += x < X0 ? 12 * vs * (1 - x / X0) : x > X1 ? 20 * vs * K.smooth(X1, X1 + 90, x) : 0;
      return y + K.fbm(nz, x * 0.03, 3) * 6 * vs * K.smooth(X0, X0 + 32, x);
    }
    var T0 = -0.78 * PI, T1 = 0.2 * PI, claws = [], drops = [], foam = [];
    function finger(p, n, t, l, w) {                       // a claw: a ribbon along a hooked spine, tapering to a point
      var c = [p[0] + n[0] * 0.7 * l, p[1] + n[1] * 0.7 * l], e = [p[0] + n[0] * 0.5 * l + t[0] * 0.85 * l, p[1] + n[1] * 0.5 * l + t[1] * 0.85 * l], a = [], b = [], u, v, j, x, y, dx, dy, d, h;
      for (j = 0; j <= 10; j++) {
        u = j / 10; v = 1 - u;
        x = v * v * p[0] + 2 * v * u * c[0] + u * u * e[0]; y = v * v * p[1] + 2 * v * u * c[1] + u * u * e[1];
        dx = 2 * v * (c[0] - p[0]) + 2 * u * (e[0] - c[0]); dy = 2 * v * (c[1] - p[1]) + 2 * u * (e[1] - c[1]);
        d = Math.sqrt(dx * dx + dy * dy) || 1; h = w * Math.pow(v, 0.8) / 2 / d;
        a.push(x - dy * h, y + dx * h); b.push(x + dy * h, y - dx * h);
      }
      for (j = b.length - 2; j >= 0; j -= 2) a.push(b[j], b[j + 1]);
      return a;
    }
    function hood(cx, ya, R, nc) {
      var cy = ya - 0.45 * R, pts = [], ep = [], xb = cx - 2.5 * R, s, p, o0, th, l, j, q;
      function sp(s, k) {                                  // k: -1 inner edge, 1 outer edge of the lip
        var th = T0 + s * (T1 - T0), t = R * (0.4 * Math.pow(1 - Math.max(0, s), 0.8) + 0.04), q = R * (1 - 0.16 * s) + k * t / 2;
        return [cx + q * Math.cos(th), cy + q * Math.sin(th), th, t];
      }
      o0 = sp(0, 1);
      bz([xb, S(xb)], [xb + 1.2 * R, S(xb)], [o0[0] + Math.sin(T0) * 0.9 * R, o0[1] - Math.cos(T0) * 0.9 * R], o0, 24, pts);
      ep = pts.slice();
      for (j = 0; j <= 30; j++) { p = sp(j / 30, 1); pts.push(p[0], p[1]); ep.push(p[0], p[1]); }
      for (j = 30; j >= 0; j--) { p = sp(j / 30, -1); pts.push(p[0], p[1]); }
      for (s = -0.03; s >= -0.58; s -= 0.03) { p = sp(s, -1); pts.push(p[0], p[1]); }
      var F = [pts[pts.length - 2], pts[pts.length - 1]], xf = Math.max(F[0] + 0.9 * R, cx + 1.7 * R), yf = S(xf);
      bz(F, [F[0] + 0.55 * (xf - F[0]), F[1]], [xf - 0.45 * (xf - F[0]), yf], [xf, yf], 16, pts);
      p = sp(1, 1); bz(p, [p[0] + 0.3 * (xf - p[0]), p[1] + 0.3 * R], [xf - 0.4 * (xf - p[0]), yf], [xf, yf], 12, ep);
      var fb = [];
      for (j = 0; j <= 24; j++) { p = sp(0.05 + 0.95 * j / 24, 1); fb.push(p[0], p[1]); }
      for (j = 24; j >= 0; j--) {
        s = 0.05 + 0.95 * j / 24; p = sp(s, 1); q = p[3] * 0.62 * Math.pow(Math.min(1, (s - 0.03) / 0.2), 0.8);
        fb.push(p[0] - Math.cos(p[2]) * q, p[1] - Math.sin(p[2]) * q);
      }
      foam.push(fb);
      for (j = 0; j < nc; j++) {
        s = 0.16 + j * 0.9 / nc + r() * 0.03; p = sp(s, 1); th = p[2];
        claws.push(finger(p, [Math.cos(th), Math.sin(th)], [-Math.sin(th), Math.cos(th)], R * (0.3 + 0.2 * Math.sin(PI * K.clamp(s, 0, 1)) + r() * 0.1), R * (0.15 + 0.04 * r())));
      }
      for (j = 0; j < nc * 2; j++) {
        th = T0 + 0.05 * PI + r() * (T1 - T0 + 0.2 * PI); q = R * (1.25 + 0.7 * Math.pow(r(), 1.4));
        drops.push(cx + q * Math.cos(th), cy + q * Math.sin(th), (3.2 + 4.5 * r() * Math.sqrt(R / 70)) * (vs > 0.8 ? 1.15 : 1.3));
      }
      return { pts: pts, ep: ep, xb: xb, xf: xf, cx: cx, cy: cy, R: R };
    }
    var xp = D.X(D.peak), xm = L.roster ? L.roster.x + L.roster.w + 30 : 560, yy = 1e9, R = (0.15 + 0.07 * (1 - vs)) * FH * (0.72 + 0.28 * K.clamp(rg / 70, 0, 1)), cx, ya;
    if (xp < xm) for (x = xm; x <= X1 - 4; x += 4) if (S(x) < yy) { yy = S(x); xp = x; }          // a best night under the roster: crest the best point beside it
    function at(x0, R) { var c = K.clamp(x0 + 0.1 * R, L.FX0 + 2.8 * R, L.FX1 - 1.75 * R); return [c, Math.min(S(c - 0.3 * R), S(c), S(x0))]; }
    for (i = 0; i < 3; i++) { ya = at(xp, R); cx = ya[0]; ya = ya[1]; R = Math.min(R, (ya - L.FY0 - 6 * vs) / 1.95); }
    var H = [{ cx: cx, ya: ya, R: R, nc: 12 }], cand = [], lo1, lo2;
    for (i = 3; i < 80; i++) {
      if (m[i] < m[i - 1] || m[i] < m[i + 1]) continue;
      lo1 = lo2 = 99;
      for (j = Math.max(0, i - 10); j <= i; j++) lo1 = Math.min(lo1, m[j]);
      for (j = i; j <= Math.min(82, i + 10); j++) lo2 = Math.min(lo2, m[j]);
      if (m[i] - Math.max(lo1, lo2) >= 2.5) cand.push([m[i] - Math.max(lo1, lo2), i]);
    }
    cand.sort(function (a, b) { return b[0] - a[0] || a[1] - b[1]; });
    cand.forEach(function (q) {
      var rr = R * K.clamp(0.3 + 0.025 * q[0], 0.3, 0.55), c = at(D.X(q[1]), rr), j;
      if (H.length > 4) return;
      for (j = 0; j < H.length; j++) if (c[0] - 2.5 * rr < H[j].cx + 1.8 * H[j].R + 6 && c[0] + 1.8 * rr + 6 > H[j].cx - 2.5 * H[j].R) return;
      H.push({ cx: c[0], ya: c[1], R: rr, nc: 6 });
    });
    H.sort(function (a, b) { return a.cx - b.cx; });
    var pts = [], epts = [], big;
    x = L.FX0 - 10;
    H.forEach(function (o) {
      var b = hood(o.cx, o.ya, o.R, o.nc), j;
      for (; x < b.xb; x += 4) { pts.push(x, S(x)); epts.push(x, S(x)); }
      for (j = 0; j < b.pts.length; j++) pts.push(b.pts[j]);
      for (j = 0; j < b.ep.length; j++) epts.push(b.ep[j]);
      x = b.xf + 4;
      if (!big || b.R > big.R) big = b;
    });
    for (; x < L.FX1 + 14; x += 4) { pts.push(x, S(x)); epts.push(x, S(x)); }
    cx = big.cx; R = big.R;
    function top(x) {                                      // the top edge of the water at x (a loss under a curl rides it)
      var y = 1e9, j, x0, x1;
      for (j = 0; j + 3 < pts.length; j += 2) {
        x0 = pts[j]; x1 = pts[j + 2];
        if ((x0 <= x && x <= x1) || (x1 <= x && x <= x0)) y = Math.min(y, x1 === x0 ? Math.min(pts[j + 1], pts[j + 3]) : pts[j + 1] + (pts[j + 3] - pts[j + 1]) * (x - x0) / (x1 - x0));
      }
      return y;
    }
    var marks = D.losses.map(function (g) { var mx = D.X(g + 1); return [mx, top(mx), r()]; });
    var inCurl = cx > 400, sr = inCurl ? 0.5 * R : 0.2 * FH, sx = inCurl ? cx - 0.12 * R : 740, sy = inCurl ? big.cy + 0.12 * R : yh - 0.15 * sr;
    var pw = 0.46 * FH, pc = [170, 270, 370, 560, 660, 820, 910], pf = 560, bd = -1e9, gulls = [], g;
    pc.forEach(function (c) { var v = Math.min(Math.abs(c - cx) - 1.9 * R, Math.abs(c - sx) - sr - pw / 2); if (v > bd) { bd = v; pf = c; } });
    for (i = 0; i < 3; i++) {
      g = [600 + 330 * r(), L.FY0 + (0.1 + 0.3 * r()) * FH, (18 + 14 * r()) * (vs > 0.8 ? 1.4 : 1)];
      if (Math.abs(g[0] - cx) > 2 * R + 20 && Math.abs(g[0] - sx) > sr + g[2] + 10 && g[1] < yh - 40 * vs) gulls.push(g);
    }
    D.wv = { pts: pts, epts: epts, foam: foam, claws: claws, drops: drops, marks: marks, yh: yh, sun: { x: sx, y: sy, r: sr }, peak: { x: pf, h: 0.12 * FH, w: pw }, gulls: gulls };
  }

  function layers(K, P, D, L) {
    var V = D.wv, T = K.tone, vs = L.vs, rs = L.rs, FX0 = L.FX0 - 10, FW = L.FX1 - L.FX0 + 20, night = D.pal.key === "night", sun = V.sun, yh = V.yh, FH = L.FY1 - L.FY0;
    var Q = V.pts, E = V.epts, ln = Math.max(0.8, rs) * 4.4, vv = Math.max(0.8, vs);
    function tpath(g, Z) { var j; Z = Z || Q; g.beginPath(); g.moveTo(Z[0], Z[1]); for (j = 2; j < Z.length; j += 2) g.lineTo(Z[j], Z[j + 1]); }
    function wpath(g) { tpath(g); g.lineTo(L.FX1 + 10, L.FY1 + 10); g.lineTo(FX0, L.FY1 + 10); g.closePath(); }
    function spin(g, q, e) {                                // a loss: a spindrift claw hooked forward off the line (e: thickness added for a keyline)
      var u = rs > 0.8 ? 1.3 : 1.35, l = (13 + 8 * q[2]) * u, w = 3.4 * u + e, x = q[0], y = q[1];
      g.beginPath(); g.moveTo(x - w, y + 2); g.quadraticCurveTo(x - w * 0.6, y - l * 0.55, x + w * 2.2, y - l - e); g.quadraticCurveTo(x + w * 0.9, y - l * 0.4, x + w, y + 2); g.closePath(); g.fill();
      K.circle(g, x + 3.4 * u * 3.2, y - l * 1.12, 3.4 * u * 0.62 + e); g.fill();
    }
    function sky(fn) {
      return function (g) {
        g.save(); g.beginPath(); g.rect(FX0, L.FY0 - 10, FW, yh - L.FY0 + 10); g.clip(); fn(g);
        K.knock(g, function (g2) { wpath(g2); g2.fill(); g2.lineWidth = ln * 1.8; g2.lineJoin = "round"; tpath(g2); g2.stroke(); V.marks.forEach(function (q) { spin(g2, q, 2.2); }); });
        g.restore();
      };
    }
    function clouds(g) {                                    // flat bands of cloud, lens-shaped, one per tier of the sky
      var r = K.rand(D.seed + 9), j, y, x, w, h;
      for (j = 0; j < 4; j++) {
        y = yh - FH * (0.1 + 0.15 * j + 0.04 * r()); x = L.FX0 + r() * (L.FX1 - L.FX0) - 100; w = 190 + 200 * r(); h = (8 + 7 * r()) * vv * 1.3;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w * 0.5, y - h, x + w, y); g.quadraticCurveTo(x + w * 0.5, y + h * 0.5, x, y); g.closePath(); g.fill();
      }
    }
    function disc(g, k) { K.circle(g, sun.x, sun.y, sun.r * k); }
    function peak(g, d) {                                   // the far peak, a cone with concave flanks; d grows it for a knockout
      var pk = V.peak, y0 = yh - pk.h - d, w = pk.w / 2 + d;
      g.beginPath(); g.moveTo(pk.x - w, yh + d); g.quadraticCurveTo(pk.x - w * 0.22, yh - pk.h * 0.16, pk.x - pk.w * 0.05, y0); g.lineTo(pk.x + pk.w * 0.05, y0); g.quadraticCurveTo(pk.x + w * 0.22, yh - pk.h * 0.16, pk.x + w, yh + d); g.closePath(); g.fill();
    }
    var skyLight = sky(function (g) {
      g.fillStyle = K.vgrad(g, L.FY0, yh, [[0, 0.06], [0.5, 0.26], [1, 0.74]]); g.fillRect(FX0, L.FY0 - 10, FW, yh - L.FY0 + 10);
      g.fillStyle = T(0.6); clouds(g);
      K.knock(g, function (g2) { peak(g2, 0); });
      g.fillStyle = T(0.95); disc(g, 1); g.fill();
      g.save(); g.beginPath(); g.rect(V.peak.x - V.peak.w * 0.2, yh - V.peak.h, V.peak.w * 0.4, V.peak.h * 0.32); g.clip(); g.fillStyle = T(0.9); peak(g, 0); g.restore();
      if (night) { g.save(); disc(g, 1); g.clip(); K.knock(g, function (g2) { K.circle(g2, sun.x + sun.r * 0.4, sun.y - sun.r * 0.15, sun.r * 0.84); g2.fill(); }); g.restore(); }
    });
    var skyAqua = sky(function (g) {
      g.fillStyle = K.vgrad(g, yh - 0.25 * FH, yh, [[0, 0], [0.6, 0.12], [1, 0.46]]); g.fillRect(FX0, yh - 0.25 * FH, FW, 0.25 * FH);
      g.fillStyle = T(0.62); peak(g, 0);
      g.strokeStyle = T(0.95); g.lineCap = "round"; g.lineWidth = ln * 0.75;                  // gulls
      V.gulls.forEach(function (q) { g.beginPath(); g.moveTo(q[0] - q[2], q[1]); g.quadraticCurveTo(q[0] - q[2] * 0.4, q[1] - q[2] * 0.7, q[0], q[1]); g.quadraticCurveTo(q[0] + q[2] * 0.4, q[1] - q[2] * 0.7, q[0] + q[2], q[1]); g.stroke(); });
      if (night) { g.fillStyle = T(0.95); D.stars.forEach(function (st) { g.globalAlpha = st.a; K.circle(g, st.x, st.y, st.r * 2); g.fill(); }); g.globalAlpha = 1; disc(g, 1); g.fill(); }
      K.knock(g, function (g2) { clouds(g2); if (!night) { disc(g2, 1.08); g2.fill(); } });
    });
    var skyKey = sky(function (g) {
      g.fillStyle = K.vgrad(g, L.FY0, yh, [[0, 0.62], [0.55, 0.28], [1, 0]]); g.fillRect(FX0, L.FY0 - 10, FW, yh - L.FY0 + 10);
      g.fillStyle = T(0.35); peak(g, 0);
      K.knock(g, function (g2) { clouds(g2); if (!night) { disc(g2, 1.1); g2.fill(); } else D.stars.forEach(function (st) { K.circle(g2, st.x, st.y, st.r * 2.4); g2.fill(); }); });
    });
    function echo(g, ds, wd, dash) {
      ds.forEach(function (d, i) { g.save(); g.translate(0, d * (0.5 + vs * 0.9)); g.lineWidth = wd * (0.8 + i * 0.12) * (2 - vs); if (dash) g.setLineDash(dash[i % 2]); tpath(g, E); g.stroke(); g.restore(); });
    }
    function inW(g, fn) { g.save(); wpath(g); g.clip(); fn(g); g.restore(); }
    function carve(g) { K.knock(g, function (g2) { g2.lineJoin = "round"; echo(g2, ECHO, ln * 0.8); }); }
    function foam(g) {
      V.foam.forEach(function (f) { g.beginPath(); for (var j = 0; j < f.length; j += 2) g.lineTo(f[j], f[j + 1]); g.closePath(); g.fill(); });
      V.claws.forEach(function (c) { g.beginPath(); for (var j = 0; j < c.length; j += 2) g.lineTo(c[j], c[j + 1]); g.closePath(); g.fill(); });
      for (var q = 0; q < V.drops.length; q += 3) { K.circle(g, V.drops[q], V.drops[q + 1], V.drops[q + 2]); g.fill(); }
    }
    var landLight = function (g) {
      g.fillStyle = T(0.85); g.fillRect(FX0, yh, FW, 2.2 * rs + 1);
      K.knock(g, function (g2) { wpath(g2); g2.fill(); });
      inW(g, function (g) {
        g.strokeStyle = T(0.9); g.lineJoin = "round"; g.lineWidth = ln * 1.7; tpath(g); g.stroke();
        echo(g, [9, 21], ln * 0.7, [[34, 10, 7, 16], [16, 20, 44, 10]]);
      });
      g.fillStyle = T(0.95); foam(g);
    };
    function sea(g, far, ramp, ruled) {                    // the far sea (ruled in flat lines for the aqua), then the water under the line
      g.fillStyle = far; g.fillRect(FX0, yh, FW, L.FY1 - yh + 10);
      K.knock(g, function (g2) {
        if (ruled) for (var y = yh + 5 * vv, j = 0; y < L.FY1; j++, y += (4 + j * 2.2) * vv) g2.fillRect(FX0, y, FW, (1.2 + j * 0.35) * vv);
        wpath(g2); g2.fill();
      });
      inW(g, function (g) { g.fillStyle = K.vgrad(g, L.FY0, L.FY1, ramp); g.fillRect(FX0, L.FY0, FW, L.FY1 - L.FY0 + 10); carve(g); });
    }
    var landAqua = function (g) { sea(g, T(0.32), [[0, 0.62], [0.5, 0.54], [1, 0.46]], 1); };
    var landKey = function (g) { sea(g, K.vgrad(g, yh, L.FY1, [[0, 0.08], [1, 0.4]]), [[0, 0], [0.4, 0.07], [1, 0.5]]); };
    var line = function (g) {
      g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = T(0.95); g.lineWidth = ln * 0.9; tpath(g); g.stroke();
      g.fillStyle = T(0.9); foam(g);
      g.fillStyle = T(0.95); V.marks.forEach(function (q) { spin(g, q, 0); });
    };
    return [
      { ink: "light", role: "sky", draw: skyLight }, { ink: "pink", role: "sky", draw: skyAqua }, { ink: "blue", role: "sky", draw: skyKey },
      { ink: "light", role: "land", draw: landLight }, { ink: "pink", role: "land", draw: landAqua }, { ink: "blue", role: "land", draw: landKey },
      { ink: "pink", role: "line", draw: line }
    ];
  }
  function body(g, D, L) {
    var Q = D.wv.pts, j;
    g.moveTo(Q[0], Q[1]);
    for (j = 2; j < Q.length; j += 2) g.lineTo(Q[j], Q[j + 1]);
    g.lineTo(L.FX1 + 10, L.FY1 + 10); g.lineTo(L.FX0 - 10, L.FY1 + 10); g.closePath();
  }

  A.add("scene", "wave", {
    name: "The Wave",
    by: "The great wave: the record is the sea, curling over its best night in foam claws around a sun, spindrift for every loss.",
    lights: ["golden", "dusk", "night"],
    derive: derive, layers: layers, body: body
  });
})();
