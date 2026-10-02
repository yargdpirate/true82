/* TRUE 82 ART: THE WAVE (a results print scene). The record is the sea; its best night breaks as the great wave does:
   the line climbs the face, the lip pitches over the climb and hooks down over a hollow (the sun or moon in it), its
   foam breaks into claws; wavelets on other highs, a far peak, clouds, gulls, spindrift for every loss. Woodblock
   manner: bokashi sky, lines carved through the water. Rules: art/CONTRACT.md ("A scene"), tone only. */
(function () {
  "use strict";
  var A = window.T82ART;
  var M = Math, PI = M.PI, ECHO = [12, 28, 49, 79, 119, 171];
  function poly(g, a, n) { g.beginPath(); for (var j = 0; j < a.length; j += 2) g.lineTo(a[j], a[j + 1]); if (!n) g.closePath(); }
  function bz(a, b, c, d, n, o) { // a cubic into o as x, y pairs
    for (var j = 0, t, u, w; j <= n; j++) {
      t = j / n; u = 1 - t; w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
      o.push(w[0] * a[0] + w[1] * b[0] + w[2] * c[0] + w[3] * d[0], w[0] * a[1] + w[1] * b[1] + w[2] * c[1] + w[3] * d[1]);
    }
  }
  function rv(a) { for (var o = [], j = a.length - 2; j >= 0; j -= 2) o.push(a[j], a[j + 1]); return o; }
  function derive(K, D, L) {
    var m = D.m, vs = L.vs, X0 = L.X0, X1 = L.X1, FH = L.FY1 - L.FY0, i, j, x, mx = 0, mn = 0;
    var r = K.rand((D.seed * 2654435761 + 31) >>> 0), nz = K.noise1D(D.seed + 3);
    for (i = 0; i <= 82; i++) { mx = M.max(mx, m[i]); mn = M.min(mn, m[i]); }
    var rg = M.max(8, mx - mn), k = M.min(1.5 * L.SC, 0.44 * FH / rg), ym = L.FY0 + 0.6 * FH, yh = ym - 0.05 * FH;
    function cr(u) { // Catmull-Rom through the margin
      u = K.clamp(u, 0, 82);
      var j = M.min(81, M.floor(u)), f = u - j, a = m[M.max(0, j - 1)], b = m[j], c = m[j + 1], d = m[M.min(82, j + 2)];
      return 0.5 * (2 * b + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
    }
    function S(x) { // the sea's surface: the season's line
      var u = K.clamp((x - X0) / (X1 - X0) * 82, 0, 82), y = ym - k * (cr(u) - (mx + mn) / 2);
      y += x < X0 ? 12 * vs * (1 - x / X0) : x > X1 ? 20 * vs * K.smooth(X1, X1 + 90, x) : 0;
      return y + K.fbm(nz, x * 0.03, 3) * 6 * vs * K.smooth(X0, X0 + 32, x);
    }
    var claws = [], drops = [], foam = [], lips = [];
    function finger(p, n, t, l, w) { // a claw of foam: out, forward, hooked back
      var o = [], a = [], b = [], j, dx, dy, h, z;
      function q(u, v) { return [p[0] + (n[0] * u + t[0] * v) * l, p[1] + (n[1] * u + t[1] * v) * l]; }
      bz(p, q(0.55, 0), q(0.8, 0.5), q(0.38, 0.98), 12, o); z = o.length - 2;
      for (j = 0; j <= z; j += 2) {
        dx = o[M.min(j + 2, z)] - o[M.max(j - 2, 0)]; dy = o[M.min(j + 3, z + 1)] - o[M.max(j - 1, 1)];
        h = w * M.pow(1 - j / z, 0.75) / 2 / (M.sqrt(dx * dx + dy * dy) || 1);
        a.push(o[j] - dy * h, o[j + 1] + dx * h); b.unshift(o[j] + dy * h, o[j + 1] - dx * h);
      }
      return a.concat(b);
    }
    // a crest travelling left: the lip spirals from its root on the back to its tip (TH0 to TH1), thrown forward (LEAN)
    var TH0 = -0.88 * PI, TH1 = 0.15 * PI, LEAN = 0.35, LO = 1.8, HI = 2.2; // reach left, right of cx (R)
    function hood(cx, ya, R, nc) {
      var cy = ya - 0.45 * R, pts = [], ep = [], fb = [], xb = cx + HI * R, s, p, l, j, q, f, k;
      function sp(s, k) { // the lip at s (0 root, 1 tip); k -1 under, 1 top
        var th = TH0 + s * (TH1 - TH0), t = R * (0.5 * M.pow(1 - s, 0.8) + 0.025), q = R * (1 - 0.3 * s) + k * t / 2;
        return [cx - q * M.cos(th) * (1 + LEAN * K.smooth(0.15, 0.75, s)) - 0.1 * R * s, cy + q * M.sin(th), th, t];
      }
      function put(o, s, k) { var p = sp(s, k); o.push(p[0], p[1]); return p; }
      function dir(th) { return [[-M.cos(th), M.sin(th)], [M.sin(th), M.cos(th)]]; } // out of the lip, along it
      var o0 = sp(0, 1), i0 = sp(0, -1), tip = sp(1, 1), T = [cx - 0.15 * R, cy + 1.1 * R], xf = M.min(tip[0] - 0.9 * R, cx - 1.7 * R), yf = S(xf);
      bz([xb, S(xb)], [cx + 1.6 * R, S(xb)], [o0[0] + 0.1 * R, o0[1] + 0.8 * R], o0, 24, pts); // the back
      ep = pts.slice();
      for (j = 1; j <= 40; j++) { put(pts, j / 40, 1); put(ep, j / 40, 1); } // over the crest
      for (j = 40; j >= 0; j--) put(pts, j / 40, -1); // under the lip
      bz(i0, [i0[0], i0[1] + 0.75 * R], [T[0] + 0.6 * R, T[1]], T, 16, pts); // the face
      bz(T, [T[0] - 0.5 * R, T[1]], [xf - 0.45 * (xf - T[0]), yf], [xf, yf], 12, pts);
      bz(tip, [tip[0] + 0.3 * (xf - tip[0]), tip[1] + 0.3 * R], [xf - 0.4 * (xf - tip[0]), yf], [xf, yf], 12, ep);
      for (j = 0; j <= 30; j++) put(fb, 0.26 + 0.74 * j / 30, 1); // foam: a rim, then all the lip
      for (j = 30; j >= 0; j--) {
        s = 0.26 + 0.74 * j / 30; p = sp(s, 1); q = p[3] * (0.3 + 0.62 * K.smooth(0.3, 1, s)) * M.min(1, (s - 0.25) / 0.12); f = dir(p[2])[0];
        fb.push(p[0] - f[0] * q, p[1] - f[1] * q);
      }
      foam.push(fb);
      for (k = 0; k < 2; k++) { // two lines carved along the lip
        for (f = [], j = 0; j <= 28; j++) put(f, 0.04 + 0.8 * j / 28, k ? -0.28 : 0.3);
        lips.push(f);
      }
      for (j = 0; j < nc; j++) { // claws, longest where it falls, each with a small one
        s = 0.4 + j * 0.46 / nc + r() * 0.025; p = sp(s, 1); f = dir(p[2]);
        l = R * (0.16 + 0.24 * M.sin(PI * K.clamp((s - 0.34) / 0.56, 0, 1)) + r() * 0.07);
        claws.push(finger(p, f[0], f[1], l, R * (0.13 + 0.03 * r())));
        p = sp(s + 0.012, 1); f = dir(p[2] + 0.1);
        claws.push(finger(p, f[0], f[1], l * 0.5, R * 0.08));
      }
      for (j = 0; j < nc * 2; j++) { // spray up and ahead, clear of the hollow
        s = -0.66 * PI + r() * 0.72 * PI; q = R * (1.15 + 0.5 * M.pow(r(), 1.4));
        drops.push(cx - q * M.cos(s) - 0.2 * R, cy + q * M.sin(s), (3.2 + 4.5 * r() * M.sqrt(R / 70)) * (vs > 0.8 ? 1.15 : 1.3));
      }
      return { pts: rv(pts), ep: rv(ep), xb: xf, xf: xb, cx: cx, cy: cy, R: R };
    }
    // the best night's crest: past HR its back leaves the frame; its lip (HF) keeps clear of the roster
    var xp = D.X(D.peak), xm = L.roster ? L.roster.x + L.roster.w + 30 : 560, yy = 1e9, R = (0.15 + 0.07 * (1 - vs)) * FH * (0.72 + 0.28 * K.clamp(rg / 70, 0, 1)), cx, ya, HF = 1.25, HR = 1.25;
    R = M.min(R, (L.FX1 - xm) / (HF + HR));
    if (xp - HF * R < xm) for (x = xm + HF * R; x <= X1 - 4; x += 4) if (S(x) < yy) { yy = S(x); xp = x; }
    function at(x0, R) { var c = K.clamp(x0 - 0.1 * R, L.FX0 + LO * R, L.FX1 - HR * R); return [c, M.min(S(c - 0.3 * R), S(c), S(x0))]; }
    for (i = 0; i < 3; i++) { ya = at(xp, R); cx = ya[0]; ya = ya[1]; R = M.min(R, (ya - L.FY0 - 6 * vs) / 1.95); }
    var H = [{ cx: cx, ya: ya, R: R, nc: 12 }], cand = [], lo1, lo2;
    for (i = 3; i < 80; i++) {
      if (m[i] < m[i - 1] || m[i] < m[i + 1]) continue;
      lo1 = lo2 = 99;
      for (j = M.max(0, i - 10); j <= i; j++) lo1 = M.min(lo1, m[j]);
      for (j = i; j <= M.min(82, i + 10); j++) lo2 = M.min(lo2, m[j]);
      if (m[i] - M.max(lo1, lo2) >= 2.5) cand.push([m[i] - M.max(lo1, lo2), i]);
    }
    cand.sort(function (a, b) { return b[0] - a[0] || a[1] - b[1]; });
    cand.forEach(function (q) {
      var rr = R * K.clamp(0.3 + 0.025 * q[0], 0.3, 0.55), c = at(D.X(q[1]), rr), j;
      if (H.length > 4) return;
      for (j = 0; j < H.length; j++) if (c[0] - LO * rr < H[j].cx + HI * H[j].R + 6 && c[0] + HI * rr + 6 > H[j].cx - LO * H[j].R) return;
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
    function top(x) { // the water's top at x (a loss under a curl rides it)
      var y = 1e9, j, x0, x1;
      for (j = 0; j + 3 < pts.length; j += 2) {
        x0 = pts[j]; x1 = pts[j + 2];
        if ((x0 <= x && x <= x1) || (x1 <= x && x <= x0)) y = M.min(y, x1 === x0 ? M.min(pts[j + 1], pts[j + 3]) : pts[j + 1] + (pts[j + 3] - pts[j + 1]) * (x - x0) / (x1 - x0));
      }
      return y;
    }
    var marks = D.losses.map(function (g) { var mx = D.X(g + 1); return [mx, top(mx), r()]; });
    var inCurl = cx > 400, sr = inCurl ? 0.3 * R : 0.2 * FH, sx = inCurl ? cx - 0.1 * R : 740, sy = inCurl ? M.min(big.cy + 0.6 * R, yh - 0.3 * sr) : yh - 0.15 * sr;
    var pw = 0.46 * FH, pc = [170, 270, 370, 560, 660, 820, 910], pf = 560, bd = -1e9, gulls = [], g;
    pc.forEach(function (c) { var v = M.min(M.abs(c - cx) - 1.9 * R, M.abs(c - sx) - sr - pw / 2); if (v > bd) { bd = v; pf = c; } });
    for (i = 0; i < 3; i++) {
      g = [600 + 330 * r(), L.FY0 + (0.1 + 0.3 * r()) * FH, (18 + 14 * r()) * (vs > 0.8 ? 1.4 : 1)];
      if (M.abs(g[0] - cx) > 2 * R + 20 && M.abs(g[0] - sx) > sr + g[2] + 10 && g[1] < yh - 40 * vs) gulls.push(g);
    }
    D.wv = { pts: pts, epts: epts, foam: foam, claws: claws, drops: drops, lips: lips, marks: marks, yh: yh, sun: { x: sx, y: sy, r: sr }, peak: { x: pf, h: 0.12 * FH, w: pw }, gulls: gulls };
  }

  function layers(K, P, D, L) {
    var V = D.wv, T = K.tone, vs = L.vs, rs = L.rs, FX0 = L.FX0 - 10, FW = L.FX1 - L.FX0 + 20, night = D.pal.key === "night", sun = V.sun, yh = V.yh, FH = L.FY1 - L.FY0;
    var Q = V.pts, E = V.epts, ln = M.max(0.8, rs) * 4.4, vv = M.max(0.8, vs);
    function tpath(g, Z) { poly(g, Z || Q, 1); }
    function wpath(g) { tpath(g); g.lineTo(L.FX1 + 10, L.FY1 + 10); g.lineTo(FX0, L.FY1 + 10); g.closePath(); }
    function spin(g, q, e) { // a loss: spindrift hooked forward (e: keyline)
      var u = rs > 0.8 ? 1.3 : 1.35, l = (13 + 8 * q[2]) * u, w = -3.4 * u - e, x = q[0], y = q[1];
      g.beginPath(); g.moveTo(x - w, y + 2); g.quadraticCurveTo(x - w * 0.6, y - l * 0.55, x + w * 2.2, y - l - e); g.quadraticCurveTo(x + w * 0.9, y - l * 0.4, x + w, y + 2); g.closePath(); g.fill();
      K.circle(g, x - 3.4 * u * 3.2, y - l * 1.12, 3.4 * u * 0.62 + e); g.fill();
    }
    function sky(fn) {
      return function (g) {
        g.save(); g.beginPath(); g.rect(FX0, L.FY0 - 10, FW, yh - L.FY0 + 10); g.clip(); fn(g);
        K.knock(g, function (g2) { wpath(g2); g2.fill(); g2.lineWidth = ln * 1.8; g2.lineJoin = "round"; tpath(g2); g2.stroke(); V.marks.forEach(function (q) { spin(g2, q, 2.2); }); });
        g.restore();
      };
    }
    function clouds(g) { // lens-shaped cloud bands
      var r = K.rand(D.seed + 9), j, y, x, w, h;
      for (j = 0; j < 4; j++) {
        y = yh - FH * (0.1 + 0.15 * j + 0.04 * r()); x = L.FX0 + r() * (L.FX1 - L.FX0) - 100; w = 190 + 200 * r(); h = (8 + 7 * r()) * vv * 1.3;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w * 0.5, y - h, x + w, y); g.quadraticCurveTo(x + w * 0.5, y + h * 0.5, x, y); g.closePath(); g.fill();
      }
    }
    function band(g) { g.fillRect(FX0, L.FY0 - 10, FW, yh - L.FY0 + 10); }
    function disc(g, k) { K.circle(g, sun.x, sun.y, sun.r * k); }
    function peak(g, d) { // the far peak; d grows it for a knockout
      var pk = V.peak, y0 = yh - pk.h - d, w = pk.w / 2 + d;
      g.beginPath(); g.moveTo(pk.x - w, yh + d); g.quadraticCurveTo(pk.x - w * 0.22, yh - pk.h * 0.16, pk.x - pk.w * 0.05, y0); g.lineTo(pk.x + pk.w * 0.05, y0); g.quadraticCurveTo(pk.x + w * 0.22, yh - pk.h * 0.16, pk.x + w, yh + d); g.closePath(); g.fill();
    }
    var skyLight = sky(function (g) {
      g.fillStyle = K.vgrad(g, L.FY0, yh, [[0, 0.06], [0.5, 0.26], [1, 0.74]]); band(g);
      g.fillStyle = T(0.6); clouds(g);
      K.knock(g, function (g2) { peak(g2, 0); });
      g.fillStyle = T(0.95); disc(g, 1); g.fill();
      g.save(); g.beginPath(); g.rect(V.peak.x - V.peak.w * 0.2, yh - V.peak.h, V.peak.w * 0.4, V.peak.h * 0.32); g.clip(); g.fillStyle = T(0.9); peak(g, 0); g.restore();
      if (night) { g.save(); disc(g, 1); g.clip(); K.knock(g, function (g2) { K.circle(g2, sun.x + sun.r * 0.4, sun.y - sun.r * 0.15, sun.r * 0.84); g2.fill(); }); g.restore(); }
    });
    var skyAqua = sky(function (g) {
      g.fillStyle = K.vgrad(g, yh - 0.25 * FH, yh, [[0, 0], [0.6, 0.12], [1, 0.46]]); g.fillRect(FX0, yh - 0.25 * FH, FW, 0.25 * FH);
      g.fillStyle = T(0.62); peak(g, 0);
      g.strokeStyle = T(0.95); g.lineCap = "round"; g.lineWidth = ln * 0.75; // gulls
      V.gulls.forEach(function (q) { g.beginPath(); g.moveTo(q[0] - q[2], q[1]); g.quadraticCurveTo(q[0] - q[2] * 0.4, q[1] - q[2] * 0.7, q[0], q[1]); g.quadraticCurveTo(q[0] + q[2] * 0.4, q[1] - q[2] * 0.7, q[0] + q[2], q[1]); g.stroke(); });
      if (night) { g.fillStyle = T(0.95); D.stars.forEach(function (st) { g.globalAlpha = st.a; K.circle(g, st.x, st.y, st.r * 2); g.fill(); }); g.globalAlpha = 1; disc(g, 1); g.fill(); }
      K.knock(g, function (g2) { clouds(g2); if (!night) { disc(g2, 1.08); g2.fill(); } });
    });
    var skyKey = sky(function (g) {
      g.fillStyle = K.vgrad(g, L.FY0, yh, [[0, 0.62], [0.55, 0.28], [1, 0]]); band(g);
      g.fillStyle = T(0.35); peak(g, 0);
      K.knock(g, function (g2) { clouds(g2); if (!night) { disc(g2, 1.1); g2.fill(); } else D.stars.forEach(function (st) { K.circle(g2, st.x, st.y, st.r * 2.4); g2.fill(); }); });
    });
    function echo(g, ds, wd, dash) {
      ds.forEach(function (d, i) { g.save(); g.translate(0, d * (0.5 + vs * 0.9)); g.lineWidth = wd * (0.8 + i * 0.12) * (2 - vs); if (dash) g.setLineDash(dash[i % 2]); tpath(g, E); g.stroke(); g.restore(); });
    }
    function inW(g, fn) { g.save(); wpath(g); g.clip(); fn(g); g.restore(); }
    function carve(g) { K.knock(g, function (g2) { g2.lineJoin = g2.lineCap = "round"; echo(g2, ECHO, ln * 0.8); g2.lineWidth = ln * 0.7; V.lips.forEach(function (f) { poly(g2, f, 1); g2.stroke(); }); }); }
    function foam(g) {
      V.foam.concat(V.claws).forEach(function (f) { poly(g, f); g.fill(); });
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
    function sea(g, far, ramp, ruled) { // the far sea (ruled for the aqua), then the water
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
      g.lineJoin = g.lineCap = "round"; g.strokeStyle = T(0.95); g.lineWidth = ln * 0.9; tpath(g); g.stroke();
      g.fillStyle = T(0.9); foam(g);
      g.fillStyle = T(0.95); V.marks.forEach(function (q) { spin(g, q, 0); });
    };
    function Y(ink, role, draw) { return { ink: ink, role: role, draw: draw }; }
    return [Y("light", "sky", skyLight), Y("pink", "sky", skyAqua), Y("blue", "sky", skyKey),
      Y("light", "land", landLight), Y("pink", "land", landAqua), Y("blue", "land", landKey), Y("pink", "line", line)];
  }
  function body(g, D, L) { poly(g, D.wv.pts, 1); g.lineTo(L.FX1 + 10, L.FY1 + 10); g.lineTo(L.FX0 - 10, L.FY1 + 10); g.closePath(); }
  A.add("scene", "wave", {
    name: "The Wave",
    by: "The great wave: the season climbs the face and breaks over its best night, the lip hooked over a sun in the hollow; spindrift for every loss.",
    lights: ["golden", "dusk", "night"],
    derive: derive, layers: layers, body: body
  });
})();
