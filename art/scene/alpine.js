/* ---------- TRUE 82 ART: ALPINE (a scene for the results print) ----------
   The season as a range above a sea of cloud: the ridge is the record, a snowcapped horn stands on each high with
   a shadow facet cut like a block print, every loss is a bead on the white-hot ridge and a ski track down the face.
   Tone only: black at an alpha is coverage (art/CONTRACT.md, "A scene"). */
(function () {
  "use strict";
  var A = typeof window !== "undefined" ? window.T82ART : null;
  if (!A || typeof A.add !== "function") return;
  var ST = 3, PI = Math.PI;
  var LOOK = { golden: { lit: [0.7, 0.3], key: 0.72, aq: 0.22, sr: 90 }, dusk: { lit: [0.68, 0.28], key: 0.7, aq: 0.26, sr: 104 },
    night: { lit: [0.64, 0.24], key: 0.66, aq: 0.2, sr: 56, top: [[0, 0.52], [0.55, 0.34], [1, 0.14]], band: [[0, 0], [1, 0.2]] } };

  function derive(K, D, L) {
    var m = D.m, WL = L.WL, vs = L.vs, rs = L.rs, SC = L.SC, c = K.clamp, i, j, x, y, q, k, hm, night = D.pal.key === "night";
    var r = K.rand((D.seed * 2654435761 + 91) >>> 0), n1 = K.noise1D(D.seed + 23), n2 = K.noise1D(D.seed + 29), n3 = K.noise1D(D.seed + 37);
    var hi = 0, lo = 0, ac = 150 * vs, FW = L.FX1 - L.FX0;
    for (i = 0; i <= 82; i++) { hi = Math.max(hi, m[i]); lo = Math.min(lo, m[i]); }
    var amp = Math.min(1, hi > 0 ? (WL - L.FY0 - ac * 1.1 - 14 * vs) / (SC * hi) : 9, lo < 0 ? (L.FY1 - WL - 4 * vs) / (SC * -lo) : 9);
    function lin(u) { u = c(u, 0, 82); var k = Math.min(81, Math.floor(u)); return m[k] + (m[k + 1] - m[k]) * (u - k); }
    function tr(x) { var u = (x - L.X0) / (L.X1 - L.X0) * 82, s = 0, q; for (q = -3; q <= 3; q++) s += lin(u + q * 0.9); return s / 7; }
    function rg(n, f, o) { return Math.pow(c(1 - Math.abs(K.fbm(n, f, o || 3)) / 0.55, 0, 1), 2); }
    // a horn on each of the season's highs, and on seeded ground between
    var H = [];
    function horn(x, h) { H.push([x, h, h * (0.55 + 0.4 * r()), h * (0.55 + 0.4 * r())]); }
    for (i = 4; i <= 78; i++) {
      for (hm = 1, j = i - 6; j <= i + 6; j++) if (m[c(j, 0, 82)] > m[i] || (j < i && m[c(j, 0, 82)] === m[i])) hm = 0;
      if (hm && m[i] - Math.min(m[c(i - 9, 0, 82)], m[c(i + 9, 0, 82)]) >= 3) horn(D.X(i), ac * (0.75 + 0.25 * r()));
    }
    for (x = L.FX0 - 30; x < L.FX1 + 40; x += (90 + 50 * r()) * (0.6 + 0.4 * rs)) {
      for (hm = 1, q = 0; q < H.length; q++) if (Math.abs(H[q][0] - x) < 70) hm = 0;
      if (hm) horn(x, ac * (0.3 + 0.3 * r()));
    }
    var x0 = L.FX0 - 12, N = Math.ceil((L.FX1 + 12 - x0) / ST) + 1, Ry = [], F1 = [], F2 = [];
    for (i = 0; i < N; i++) {
      x = x0 + i * ST; hm = 0;
      for (q = 0; q < H.length; q++) { k = (x - H[q][0]) / H[q][x < H[q][0] ? 2 : 3]; if (Math.abs(k) < 1) hm = Math.max(hm, H[q][1] * Math.pow(1 - Math.abs(k), 1.2)); }
      Ry.push(Math.max(WL - SC * amp * tr(x) - hm - ac * 0.14 * rg(n2, x * 0.03, 2), L.FY0 + 6 * vs));
      F1.push(WL - (16 + 44 * rg(n3, x * 0.006 + 3.1)) * vs - 10 * vs * (K.fbm(n2, x * 0.013, 2) + 0.5));
      F2.push(WL - (40 + 60 * rg(n1, x * 0.004 + 9.7)) * vs);
    }
    function ry(x) { var u = c((x - x0) / ST, 0, N - 1.001), k = Math.floor(u); return Ry[k] + (Ry[k + 1] - Ry[k]) * (u - k); }
    var top = 1e9; for (i = 0; i < N; i++) top = Math.min(top, Ry[i]);
    // the sun sits high on the right, half behind what stands there; the moon rides above
    var sr = LOOK[D.pal.key].sr * rs, sx = L.FX0 + FW * (0.78 + 0.06 * r()), sy = Math.max(L.FY0 + sr + 6 * vs, Math.min(ry(sx) - 0.15 * sr, F1[Math.round((sx - x0) / ST)] - 0.25 * sr));
    if (night) sy = L.FY0 + (WL - L.FY0) * 0.3;
    var sun = { x: sx, y: sy, r: sr };
    // valleys split the range into horns, each with a shadow facet away from the sun
    var w = Math.round((30 + 26 * rs) / ST), V = [0], S = [], a, b, p, d, e, hc;
    function rl(y) { return Math.min(0.6 * (WL - y), 130 * vs); }
    for (i = 1; i < N - 1; i++) {
      for (j = Math.max(0, i - w), x = 1; j <= Math.min(N - 1, i + w); j++) if (Ry[j] > Ry[i]) { x = 0; break; }
      if (x && i - V[V.length - 1] >= w) V.push(i);
    }
    V.push(N - 1);
    for (j = 0; j + 1 < V.length; j++) {
      a = V[j]; b = V[j + 1]; p = a;
      for (i = a; i <= b; i++) if (Ry[i] < Ry[p]) p = i;
      if (Ry[p] > WL - 4 * vs) continue;
      d = x0 + p * ST < sx ? 1 : -1; e = d > 0 ? a : b; k = (0.12 + 0.2 * r()) * d; hc = Math.min(WL - Ry[p], Math.max(10 * vs, 1.25 * (Ry[e] - Ry[p])));
      S.push({ a: a, b: b, p: p, d: d, e: e, c: [x0 + p * ST + k * hc, Ry[p] + hc], rb: [x0 + p * ST, Ry[p], x0 + p * ST + k * rl(Ry[p]), Ry[p] + rl(Ry[p])] });
    }
    for (j = 1; j < V.length - 1; j++) if (Ry[V[j]] < WL - 16 * vs) { x = x0 + V[j] * ST; S.push({ g: 1, rb: [x, Ry[V[j]], x + 0.2 * (x < sx ? 1 : -1) * rl(Ry[V[j]]), Ry[V[j]] + rl(Ry[V[j]])] }); }
    var pines = [], tracks = [], lobes = [], hh = L.FY1 + 12 - WL, lb = 30 * Math.max(0.6, rs) + 14, rows = c(Math.round(hh / (lb * 2.4)), 2, 4);
    for (i = 0, k = Math.round(300 * FW / 920); i < k; i++) {
      x = L.FX0 + r() * FW; y = ry(x);
      if (WL - y > 20 * vs) pines.push([x, WL - (0.04 + 0.4 * r() * r()) * (WL - y), (18 + 12 * r()) * vs]);
    }
    D.losses.forEach(function (g) {                         // a slalom track: S-turns that widen as they run down the face
      var px = D.X(g + 0.5), py = ry(px), len = Math.min(WL - py - 6 * vs, (50 + 55 * r()) * vs), q = [], s = r() < 0.5 ? -1 : 1, am = (4 + 4 * r()) * (0.45 + 0.65 * rs), t;
      for (k = 0; k <= 12; k++) { t = k / 12; q.push(px + s * am * Math.sin(t * 9 + 0.4) * (0.35 + 0.65 * t), py + 7 * rs + (len - 7 * rs) * t); }
      tracks.push({ x: px, y: py, q: len > 16 * vs ? q : null });
    });
    for (j = 0; j < rows; j++) for (x = L.FX0 - 40 - r() * 30; x < L.FX1 + 50;) { y = lb * (0.55 + 0.35 * r()) * (0.8 + 0.5 * j / (rows - 1)); lobes.push([j, x, y]); x += y * (1.2 + 0.5 * r()); }
    D.al = { lobes: lobes, rows: rows, lb: lb, hh: hh, x0: x0, N: N, Ry: Ry, F1: F1, F2: F2, S: S, sun: sun, pines: pines, tracks: tracks, top: top };
  }

  function layers(K, P, D, L) {
    var Z = D.al, Ry = Z.Ry, N = Z.N, T = K.tone, WL = L.WL, vs = L.vs, rs = L.rs, pal = D.pal, night = pal.key === "night", R = LOOK[pal.key], sun = Z.sun, S = Z.S;
    var xa = Z.x0, xb = Z.x0 + (N - 1) * ST, lw = 7.4 * Math.max(0.72, rs), bead = 3 + 3.8 * rs, rib = 1.6 + 2 * rs, FW = L.FX1 - L.FX0, tk = 2.2 + 2.4 * rs;
    function xs(i) { return Z.x0 + i * ST; }
    function under(g) { var i; g.beginPath(); g.moveTo(xa, WL); for (i = 0; i < N; i++) g.lineTo(xs(i), Math.min(Ry[i], WL)); g.lineTo(xb, WL); g.closePath(); }
    function ridge(g, only) { var i, on = false; g.beginPath(); for (i = 0; i < N; i++) { if ((Ry[i] <= WL) === only) { g[on ? "lineTo" : "moveTo"](xs(i), Ry[i]); on = true; } else on = false; } }
    function far(g, F) { var i; g.beginPath(); g.moveTo(xa, WL); for (i = 0; i < N; i++) g.lineTo(xs(i), F[i]); g.lineTo(xb, WL); g.closePath(); }
    function shades(g) {
      g.beginPath();
      S.forEach(function (s) {
        var i;
        if (s.g) return;
        if (s.d > 0) { g.moveTo(xs(s.a), Ry[s.a]); for (i = s.a + 1; i <= s.p; i++) g.lineTo(xs(i), Ry[i]); }
        else { g.moveTo(xs(s.p), Ry[s.p]); for (i = s.p + 1; i <= s.b; i++) g.lineTo(xs(i), Ry[i]); }
        g.lineTo(s.c[0], s.c[1]); g.closePath();
      });
    }
    function ribs(g, wd, fill) {                            // creases and gullies
      g.lineWidth = wd; g.lineCap = "round"; g.beginPath();
      S.forEach(function (s) {
        var q = s.rb;
        if (fill) { g.moveTo(q[0] - wd * 0.9, q[1]); g.lineTo(q[0] + wd * 0.9, q[1]); g.lineTo(q[2], q[3]); g.closePath(); } else { g.moveTo(q[0], q[1]); g.lineTo(q[2], q[3]); }
      });
      if (fill) g.fill(); else g.stroke();
    }
    function cap(g) {                                       // snow: above a snowline set on each horn, its edge torn into tongues
      g.beginPath();
      S.forEach(function (s) {
        var i, a, b, h, ys;
        if (s.g) return;
        h = Math.min(WL, Math.max(Ry[s.a], Ry[s.b])) - Ry[s.p]; ys = Ry[s.p] + 0.5 * h;
        for (i = s.a; i <= s.b; i++) {
          if (Ry[i] >= ys) continue;
          a = i; while (i < s.b && Ry[i + 1] < ys) i++;
          b = i; g.moveTo(xs(a), Ry[a]);
          for (i = a; i <= b; i++) g.lineTo(xs(i), Ry[i]);
          for (i = b; i >= a; i--) g.lineTo(xs(i), ys + h * 0.12 * ((i % 6) < 3 ? i % 3 : 3 - i % 3) - h * 0.08);
          g.closePath(); i = b;
        }
      });
    }
    function pines(g) {
      g.beginPath();
      Z.pines.forEach(function (q) {
        var x = q[0], y = q[1], h = q[2], w = h * 0.34;
        g.moveTo(x, y - h); g.lineTo(x + w * 0.6, y - h * 0.5); g.lineTo(x + w * 0.3, y - h * 0.5); g.lineTo(x + w, y); g.lineTo(x - w, y); g.lineTo(x - w * 0.3, y - h * 0.5); g.lineTo(x - w * 0.6, y - h * 0.5); g.closePath();
      });
    }
    function tracks(g, wd) {
      g.lineWidth = wd; g.lineJoin = "round"; g.lineCap = "round"; g.beginPath();
      Z.tracks.forEach(function (t) {
        var q = t.q, k;
        if (!q) return;
        g.moveTo(q[0], q[1]);
        for (k = 2; k + 3 < q.length; k += 2) g.quadraticCurveTo(q[k], q[k + 1], (q[k] + q[k + 2]) / 2, (q[k + 1] + q[k + 3]) / 2);
        g.lineTo(q[q.length - 2], q[q.length - 1]);
      });
      g.stroke();
    }
    function beads(g, k, sunk) { Z.tracks.forEach(function (t) { if ((t.y < WL) !== !!sunk) { K.circle(g, t.x, t.y, bead * k); g.fill(); } }); }
    function disc(g, k) { K.circle(g, sun.x, sun.y, sun.r * k); }
    function flat(g, a, b) { g.fillRect(L.FX0, a, FW, b - a); }
    // sky layers print above the ridge, a stock gap cut around the line and its beads
    function sky(fn) {
      return function (g) {
        var i; g.save(); g.beginPath(); g.moveTo(xa, L.FY0 - 10); for (i = 0; i < N; i++) g.lineTo(xs(i), Math.min(Ry[i], WL)); g.lineTo(xb, L.FY0 - 10); g.closePath(); g.clip();
        fn(g);
        K.knock(g, function (g2) { g2.lineWidth = lw * 2.7; g2.lineJoin = "round"; ridge(g2, true); g2.stroke(); beads(g2, 2); });
        g.restore();
      };
    }
    function ray(g, a) { g.lineTo(sun.x + 1400 * Math.cos(a), sun.y + 1400 * Math.sin(a)); }
    function hills(g2, a, b) { g2.globalAlpha = a; far(g2, Z.F2); g2.fill(); g2.globalAlpha = b; far(g2, Z.F1); g2.fill(); }
    var skyLight = sky(function (g) {
      var q, a0 = (D.seed % 9) / 9, gr = g.createRadialGradient(sun.x, sun.y, sun.r * 0.5, sun.x, sun.y, 480 * rs);
      gr.addColorStop(0, T(0.7)); gr.addColorStop(0.35, T(0.34)); gr.addColorStop(0.7, T(0.1)); gr.addColorStop(1, T(0));
      g.fillStyle = gr; flat(g, L.FY0, WL);
      g.fillStyle = K.vgrad(g, WL - 200 * vs, WL, [[0, 0], [1, 0.4]]); flat(g, WL - 200 * vs, WL);
      g.fillStyle = T(night ? 0.14 : 0.3);                                               // 14 wedges
      for (q = 0; q < 14; q++) { g.beginPath(); g.moveTo(sun.x, sun.y); ray(g, a0 + q * PI / 7); ray(g, a0 + q * PI / 7 + 0.2); g.closePath(); g.fill(); }
      g.fillStyle = T(0.96); disc(g, 1); g.fill();
      K.knock(g, function (g2) {
        if (night) [[-0.3, -0.25, 0.2], [0.35, 0.05, 0.14], [-0.1, 0.4, 0.17], [0.15, -0.5, 0.1]].forEach(function (c) { K.circle(g2, sun.x + c[0] * sun.r, sun.y + c[1] * sun.r, c[2] * sun.r); g2.fill(); });
        hills(g2, 0.5, 0.85);
      });
    });
    var skyAqua = sky(function (g) {
      g.fillStyle = K.vgrad(g, L.FY0, WL, R.band || pal.band); flat(g, L.FY0, WL);
      if (night) {
        var r = K.rand(D.seed + 5), i; g.fillStyle = T(0.95);
        for (i = 0; i < 110; i++) { K.circle(g, L.FX0 + r() * FW, L.FY0 + 6 + r() * (WL - L.FY0) * 0.6, (1.3 + r() * 1.5) * Math.max(0.9, rs) * (r() < 0.12 ? 1.7 : 1)); g.fill(); }
        K.circle(g, sun.x, sun.y, sun.r * 0.98); g.fillStyle = T(0.82); g.fill();
      }
      K.knock(g, function (g2) { if (!night) { disc(g2, 1.06); g2.fill(); } hills(g2, 0.6, 0.9); });
    });
    var skyKey = sky(function (g) {
      g.fillStyle = K.vgrad(g, L.FY0, WL, R.top || pal.top); flat(g, L.FY0, WL);
      K.knock(g, function (g2) { disc(g2, 1.0); g2.fill(); far(g2, Z.F2); g2.fill(); });
      g.fillStyle = T(0.4); far(g, Z.F2); g.fill();
      K.knock(g, function (g2) { far(g2, Z.F1); g2.fill(); });
      g.fillStyle = T(0.7); far(g, Z.F1); g.fill();
    });
    // the range, then the cloud sea: banks of round tops, each hiding the one behind, lit gold on top and
    // turning to the underside's magenta as the dots swap down the bank (a split fountain)
    function rowY(j) { return WL + Z.hh * (0.03 + 0.93 * j / Z.rows); }
    function bank(g, j) {
      var y = rowY(j); g.beginPath(); g.rect(xa, y, xb - xa, L.FY1 + 20 - y);
      Z.lobes.forEach(function (q) { if (q[0] === j) { g.moveTo(q[1] + q[2], y); g.arc(q[1], y, q[2], 0, PI, true); } });
    }
    function mount(fn, t0, t1, halo) {
      return function (g) {
        var j, y, f, y0 = WL + Z.hh * 0.45;
        g.save(); g.beginPath(); g.rect(xa, L.FY0 - 10, xb - xa, WL - L.FY0 + 10); g.clip(); fn(g); g.restore();
        g.save(); g.beginPath(); g.rect(xa, WL - 50 * vs, xb - xa, Z.hh + 50 * vs); g.clip();
        for (j = 0; j < Z.rows; j++) {
          y = rowY(j); f = 1 - 0.3 * j / (Z.rows - 1); bank(g, j); K.knock(g, function (g2) { g2.fill(); });
          g.fillStyle = K.vgrad(g, y - 0.6 * Z.lb, j + 1 < Z.rows ? rowY(j + 1) + 4 : L.FY1 + 20, t0.map(function (q) { return [q[0], q[1] * f]; }).concat([[1, t1]])); g.fill();
        }
        if (halo) { g.save(); g.translate(sun.x, WL + 4 * vs); g.scale(1, 0.3); y = g.createRadialGradient(0, 0, 0, 0, 0, 340 * rs); y.addColorStop(0, T(0.34)); y.addColorStop(1, T(0)); g.fillStyle = y; g.fillRect(-340 * rs, -340 * rs, 680 * rs, 680 * rs); g.restore(); }
        K.knock(g, function (g2) { g2.fillStyle = K.vgrad(g2, y0, L.FY1 + 12, [[0, 0], [1, 0.9]]); g2.fillRect(xa, y0, xb - xa, L.FY1 + 20 - y0); });
        g.restore();
      };
    }
    var landLight = mount(function (g) {
      under(g); g.fillStyle = K.vgrad(g, Z.top, WL, [[0, R.lit[0]], [1, R.lit[1]]]); g.fill();
      cap(g); g.fillStyle = T(0.95); g.fill();
      K.knock(g, function (g2) { shades(g2); g2.fill(); });
      K.knock(g, function (g2) { pines(g2); g2.fill(); ribs(g2, rib * 0.9, true); });
      g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = T(0.9); g.lineWidth = lw * 2; ridge(g, true); g.stroke();   // the ridge's halo
      K.knock(g, function (g2) { beads(g2, 1.9); g2.fill(); });
    }, [[0, 0.78]], 0, true);
    var landAqua = mount(function (g) {
      shades(g); g.fillStyle = T(R.aq); g.fill();
      cap(g); g.fillStyle = T(0.8); g.fill();
      K.knock(g, function (g2) { pines(g2); g2.fill(); ribs(g2, rib * 0.9, true); tracks(g2, tk * 2.3); });
      g.strokeStyle = T(0.92); tracks(g, tk);
    }, [[0, 0]], 0);
    var landKey = mount(function (g) {
      shades(g); g.fillStyle = T(R.key); g.fill();
      K.knock(g, function (g2) { cap(g2); g2.fill(); pines(g2); g2.fill(); });
    }, [[0, 0]], 0.5);
    // the season's line: white-hot ridge, a bead per loss, the faces as wire past the fill
    var line = function (g) {
      g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = T(1); g.lineWidth = lw; ridge(g, true); g.stroke();
      g.strokeStyle = T(0.9); g.lineWidth = lw * 0.8; ridge(g, false); g.stroke();
      K.knock(g, function (g2) { beads(g2, 1.6); g2.fill(); });
      g.fillStyle = T(1); beads(g, 1); beads(g, 0.7, true);
    };
    return [
      { ink: "light", role: "sky", draw: skyLight }, { ink: "pink", role: "sky", draw: skyAqua }, { ink: "blue", role: "sky", draw: skyKey },
      { ink: "light", role: "land", draw: landLight }, { ink: "pink", role: "land", draw: landAqua }, { ink: "blue", role: "land", draw: landKey },
      { ink: "pink", role: "line", draw: line }
    ];
  }

  function body(g, D, L) {
    var Z = D.al, i;
    g.moveTo(Z.x0, L.FY1 + 10);
    for (i = 0; i < Z.N; i++) g.lineTo(Z.x0 + i * ST, Math.min(Z.Ry[i], L.WL));
    g.lineTo(Z.x0 + (Z.N - 1) * ST, L.FY1 + 10); g.closePath();
  }

  A.add("scene", "alpine", {
    name: "Alpine",
    by: "A range above a sea of cloud: horns on the year's highs, a white-hot ridge for the record, a bead and a ski track for every loss.",
    lights: ["golden", "dusk", "night"],
    derive: derive, layers: layers, body: body
  });
})();
