/* ---------- TRUE 82 ART: DUNES (a scene for the results print) ----------
   The season as a dune crest under a huge sun: wins climb, losses slip, and the crest echoes down the sand as
   wind-ripple bands. Every loss is a saguaro on the crest. Mesas stand on far dunes that echo the record
   upward, heat shimmer cuts the sun (or the moon rises over stars at night).
   Rules: art/CONTRACT.md ("A scene"). Tone only: black at an alpha is coverage, never a color. */
(function () {
  "use strict";
  var A = typeof window !== "undefined" ? window.T82ART : null;
  if (!A || typeof A.add !== "function") return;
  var NB = 7;

  function derive(K, D, L) {
    var r = K.rand((D.seed * 2654435761 + 17) >>> 0), WL = L.WL, vs = L.vs, rs = L.rs, m = D.m, c = K.clamp;
    var x0 = L.FX0 - 12, n = Math.ceil((L.FX1 + 12 - x0) / 4) + 1, i, j, k, x, hi = 0, lo = 0, CY = [], S1 = [], S2 = [];
    for (i = 0; i <= 82; i++) { hi = Math.max(hi, m[i]); lo = Math.min(lo, m[i]); }
    var amp = Math.min(c(70 * vs / (L.SC * Math.max(1, hi - lo)), 1, 1.8), hi > 0 ? (WL - L.FY0 - 86 * vs) / (L.SC * hi) : 9, lo < 0 ? (L.FY1 - WL - 6 * vs) / (L.SC * -lo) : 9);
    function cr(u) {
      u = c(u, 0, 82);
      var j = Math.min(81, Math.floor(u)), f = u - j, p0 = m[c(j - 1, 0, 82)], p1 = m[j], p2 = m[j + 1], p3 = m[c(j + 2, 0, 82)];
      return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
    }
    for (i = 0; i < n; i++) CY.push(WL - L.SC * amp * cr((x0 + i * 4 - L.X0) / (L.X1 - L.X0) * 82));
    function avg(w) { var o = []; for (i = 0; i < n; i++) { var s = 0, q = 0; for (j = Math.max(0, i - w); j <= Math.min(n - 1, i + w); j++) { s += CY[j]; q++; } o.push(s / q); } return o; }
    S1 = avg(6); S2 = avg(16);
    function yAt(x) { var u = c((x - x0) / 4, 0, n - 1.001), j = Math.floor(u); return CY[j] + (CY[j + 1] - CY[j]) * (u - j); }
    var ph = r() * 6.28, RA = [], RB = [], E = [], bot = L.FY1 + 12, ref = WL + 8 * vs, prev;
    for (i = 0; i < n; i++) {
      x = x0 + i * 4;
      RA.push(Math.min(S1[i] - (14 + 10 * Math.sin(x * 0.011 + ph)) * vs, CY[i] - 6 * vs));
      RB.push(Math.min(S2[i] - (40 + 14 * Math.sin(x * 0.007 + ph * 2)) * vs, RA[i] - 14 * vs));
    }
    for (k = 0; k <= NB; k++) E.push([]);
    for (i = 0; i < n; i++) {
      prev = CY[i]; E[0].push(prev);
      for (k = 1; k <= NB; k++) {
        prev = Math.min(bot, Math.max(prev + (2.6 + k * 0.3) * vs, ref + (CY[i] - ref) * Math.max(0, 1 - 0.15 * k) + (bot - ref) * Math.pow(k / NB, 1.5)));
        E[k].push(k < NB ? prev + Math.sin(x * 0.036 + ph + k * 0.2) * (0.5 + 0.34 * k) * vs : prev);
      }
    }
    function rb(x) { var u = c((x - x0) / 4, 0, n - 1.001), j = Math.floor(u); return RB[j] + (RB[j + 1] - RB[j]) * (u - j); }
    // the sun (or moon): right of the roster, on the far horizon
    var sx = L.X0 + (L.X1 - L.X0) * (0.74 + 0.12 * r()), hz = rb(sx), sr = (D.pal.key === "dusk" ? 122 : D.pal.key === "night" ? 98 : 112) * rs;
    sr = c((hz - L.FY0 - 10 * vs) / 1.5, 44 * rs, sr);
    var sy = hz - 0.5 * sr;
    // mesas on the far dunes: broad tables and a few narrow towers
    var ms = [], seg = (L.FX1 - L.FX0 + 60) / 9, w, h;
    for (i = 0; i < 9; i++) {
      var tw = r() < 0.3;
      w = (tw ? 7 + 6 * r() : 14 + 18 * r()) * rs * 1.4; h = (tw ? 48 + 40 * r() : 28 + 44 * r()) * vs;
      ms.push({ c: L.FX0 - 30 + (i + 0.15 + 0.7 * r()) * seg, w: w, h: h, st: r() < 0.5 ? (r() < 0.5 ? -1 : 1) : 0, t: w * (0.5 + r() * 0.4), k: r() });
    }
    var cacti = D.losses.map(function (gi) { var x = D.X(gi + 0.5); return { x: x, y: yAt(x), v: r(), a: r() }; });
    var nl = Math.max(1, D.losses.length), ch = c(40 - nl * 0.55, 14, 36) * (rs < 1 ? 1.5 : 1);
    var shim = [], stars = [];
    for (i = 0; i < 30; i++) shim.push({ x: L.FX0 + r() * (L.FX1 - L.FX0), y: hz - (r() * 70 + 2) * vs, w: (40 + r() * 120) * rs, p: r() * 6.28, a: (1 + r() * 2) * rs });
    for (i = 0; i < 70; i++) stars.push({ x: L.FX0 + r() * (L.FX1 - L.FX0), y: L.FY0 + Math.pow(r(), 1.4) * (hz - L.FY0 - 30 * vs), r: (1.4 + r() * 1.8) * Math.max(0.9, rs), b: r() < 0.14 });
    var lee = [], a0 = -1;
    for (i = 0; i + 4 < n; i++) {
      if (CY[i + 3] - CY[i] > 2.2 * vs) { if (a0 < 0) a0 = i; } else if (a0 >= 0) { if (i - a0 >= 2) lee.push([a0, i + 2]); a0 = -1; }
    }
    if (a0 >= 0 && n - 1 - a0 >= 3) lee.push([a0, n - 1]);
    D.dn = { lee: lee, CY: CY, x0: x0, n: n, yAt: yAt, sx: sx, sy: sy, sr: sr, RA: RA, RB: RB, E: E, ms: ms, cacti: cacti, ch: ch, shim: shim, stars: stars, hz: hz };
  }

  function layers(K, P, D, L) {
    var N = D.dn, CY = N.CY, RA = N.RA, RB = N.RB, E = N.E, WL = L.WL, vs = L.vs, rs = L.rs, tone = K.tone, pal = D.pal, night = pal.key === "night";
    var x0 = L.FX0 - 10, x1 = L.FX1 + 10, sx = N.sx, sy = N.sy, sr = N.sr, gap = 1.7 * Math.max(0.8, rs), cw = N.ch * 0.2;
    function line(g, Y, dy, close) { for (var i = 0; i < N.n; i++) g.lineTo(N.x0 + i * 4, Y[i] + (dy || 0)); }
    function below(g, Y) { g.beginPath(); g.moveTo(x0, L.FY1 + 20); line(g, Y); g.lineTo(x1, L.FY1 + 20); g.closePath(); }
    function skyClip(g) { g.beginPath(); g.moveTo(x0, L.FY0 - 10); line(g, CY); g.lineTo(x1, L.FY0 - 10); g.closePath(); g.clip(); }
    function mesas(g) {
      g.beginPath();
      N.ms.forEach(function (s) {
        var i = Math.max(0, Math.min(N.n - 1, Math.round((s.c - N.x0) / 4))), yb = RB[i] + 4 * vs, t = yb - s.h, hw = s.w, y2 = yb - s.h * 0.5, y3 = yb - s.h * 0.74;
        g.moveTo(s.c - hw - s.t, yb + 6 * vs); g.lineTo(s.c - hw - s.t, yb); g.lineTo(s.c - hw * 0.92, y2);
        if (s.st < 0) { g.lineTo(s.c - hw * 0.9, y3); g.lineTo(s.c - hw * 0.6, y3 - 1); }
        g.lineTo(s.c - hw * (s.st < 0 ? 0.58 : 0.86), t); g.lineTo(s.c + hw * (s.st > 0 ? 0.58 : 0.86), t);
        if (s.st > 0) { g.lineTo(s.c + hw * 0.6, y3 - 1); g.lineTo(s.c + hw * 0.9, y3); }
        g.lineTo(s.c + hw * 0.92, y2); g.lineTo(s.c + hw + s.t, yb); g.lineTo(s.c + hw + s.t, yb + 6 * vs); g.closePath();
      });
    }
    function disc(g, k) { K.circle(g, sx, sy, sr * k); }
    // a slip face: from the crest down its descending stretch, a wedge of shade that falls away to the lower left
    function lees(g) {
      g.beginPath();
      N.lee.forEach(function (q) {
        var i, a = q[0], b = q[1], drop = CY[b] - CY[a], d = Math.min(0.7 * drop + 24 * Math.max(0.75, vs), 80 * Math.max(0.75, vs));
        g.moveTo(N.x0 + a * 4, CY[a] + 2.5 * gap);
        for (i = a; i <= b; i++) g.lineTo(N.x0 + i * 4, CY[i] + 2.5 * gap);
        g.lineTo(N.x0 + b * 4 - 6 * rs, CY[b] + d * 0.4); g.lineTo(N.x0 + (a + (b - a) * 0.45) * 4, CY[a] + drop * 0.5 + d); g.closePath();
      });
    }
    function plant(g, wd) {
      g.beginPath();
      N.cacti.forEach(function (q) {
        var h = N.ch * (0.78 + 0.44 * q.v), x = q.x, y = q.y + 1.5, s = q.a < 0.5 ? -1 : 1, aw = h * 0.3, ay = y - h * (0.3 + 0.15 * q.v);
        g.moveTo(x, y); g.lineTo(x, y - h);
        g.moveTo(x + s * aw, ay - h * 0.32); g.lineTo(x + s * aw, ay); g.lineTo(x, ay);
        if (q.v > 0.35) { g.moveTo(x - s * aw * 0.8, ay - h * 0.32); g.lineTo(x - s * aw * 0.8, ay - h * 0.1); g.lineTo(x, ay - h * 0.1); }
      });
      g.lineWidth = wd; g.lineCap = "round"; g.lineJoin = "round"; g.stroke();
    }
    function keyline(g) {
      K.knock(g, function (g2) {
        g2.lineWidth = gap * 2.6 + 7 * Math.max(0.72, rs); g2.lineJoin = "round"; g2.beginPath(); g2.moveTo(x0, CY[0]); line(g2, CY); g2.stroke();
        plant(g2, cw + gap * 2.2);
      });
    }
    function shimmer(g) {
      K.knock(g, function (g2) {
        g2.lineCap = "round";
        N.shim.forEach(function (s) {
          var j; g2.lineWidth = s.a; g2.beginPath();
          for (j = 0; j <= 12; j++) g2[j ? "lineTo" : "moveTo"](s.x + s.w * j / 12, s.y + Math.sin(s.p + j * 0.9) * s.a * 1.2);
          g2.stroke();
        });
      });
    }
    function sunCuts(g) {
      K.knock(g, function (g2) {
        for (var j = 0; j < 6; j++) {
          var yy = sy + sr * (0.0 + j * 0.17), wd = sr * (0.02 + j * 0.022), q; g2.beginPath(); g2.moveTo(sx - sr - 2, yy);
          for (q = 0; q <= 16; q++) g2.lineTo(sx - sr + q * sr / 8, yy + Math.sin(q * 0.8 + j) * sr * 0.012 * j);
          g2.lineTo(sx + sr + 2, yy + wd); g2.lineTo(sx - sr - 2, yy + wd); g2.closePath(); g2.fill();
        }
      });
    }
    function glow(g) {
      g.fillStyle = tone(night ? 0.1 : 0.13);
      for (var j = 6; j >= 1; j--) { disc(g, 1 + j * 0.3); g.fill(); }
    }
    function behind(g) { K.knock(g, function (g2) { below(g2, RB); g2.fill(); mesas(g2); g2.fill(); }); }
    var skyLight = function (g) {
      skyClip(g);
      g.fillStyle = K.vgrad(g, N.hz - 130 * vs, N.hz + 10 * vs, [[0, 0], [0.6, 0.06], [1, night ? 0.24 : 0.5]]); g.fillRect(L.FX0, N.hz - 130 * vs, L.FX1 - L.FX0, 140 * vs);
      g.fillStyle = tone(night ? 0.24 : 0.5); g.fillRect(L.FX0, N.hz + 9 * vs, L.FX1 - L.FX0, L.FY1 - N.hz);
      glow(g);
      K.knock(g, function (g2) { disc(g2, 1.04); g2.fill(); });
      g.fillStyle = tone(0.96); disc(g, 1); g.fill();
      if (night) K.knock(g, function (g2) { [[-0.3, -0.3, 0.2], [0.35, -0.05, 0.14], [-0.1, 0.38, 0.17], [0.1, -0.55, 0.09], [-0.55, 0.15, 0.1]].forEach(function (q) { K.circle(g2, sx + q[0] * sr, sy + q[1] * sr, q[2] * sr); g2.fill(); }); });
      else sunCuts(g);
      shimmer(g);
      behind(g);
      g.fillStyle = tone(0.1); below(g, RB); g.fill();
      g.fillStyle = tone(0.16); mesas(g); g.fill();
      K.knock(g, function (g2) { below(g2, RA); g2.fill(); });
      g.fillStyle = tone(0.24); below(g, RA); g.fill();
      keyline(g);
    };
    var skyBlue = function (g) {
      skyClip(g);
      g.fillStyle = K.vgrad(g, L.FY0, N.hz, [[0, 0.82], [0.55, 0.4], [1, 0.05]]); g.fillRect(L.FX0, L.FY0, L.FX1 - L.FX0, N.hz - L.FY0);
      K.knock(g, function (g2) { disc(g2, 1.0); g2.fill(); });
      behind(g);
      g.fillStyle = tone(0.34); below(g, RB); g.fill();
      g.fillStyle = tone(0.64); mesas(g); g.fill();
      K.knock(g, function (g2) { below(g2, RA); g2.fill(); });
      g.fillStyle = tone(0.52); below(g, RA); g.fill();
      K.knock(g, function (g2) { g2.lineWidth = Math.max(0.9, rs * 1.3); N.ms.forEach(function (s) { var i = Math.round((s.c - N.x0) / 4), yb = RB[i] + 4 * vs; g2.beginPath(); for (var q = 1; q < 4; q++) { g2.moveTo(s.c - s.w * 0.8, yb - s.h * (0.45 + q * 0.14)); g2.lineTo(s.c + s.w * 0.8, yb - s.h * (0.45 + q * 0.14)); } g2.stroke(); }); });
      keyline(g);
    };
    var skyPink = function (g) {
      skyClip(g);
      if (night) {
        g.fillStyle = tone(0.95);
        N.stars.forEach(function (s) { K.circle(g, s.x, s.y, s.r * (s.b ? 1.7 : 1)); g.fill(); });
      } else { g.fillStyle = K.vgrad(g, L.FY0, N.hz - 40 * vs, [[0, 0.3], [1, 0]]); g.fillRect(L.FX0, L.FY0, L.FX1 - L.FX0, N.hz - 40 * vs - L.FY0); }
      behind(g); K.knock(g, function (g2) { below(g2, RA); g2.fill(); disc(g2, 1.5); g2.fill(); });
      keyline(g);
    };
    var TL = [0.86, 0.64, 0.46, 0.34, 0.24, 0.16, 0.1], TB = [0.28, 0.44, 0.58, 0.68, 0.76, 0.82, 0.86];
    function bands(g, tones) {
      for (var s = 0; s < NB; s++) {
        g.fillStyle = tone(tones[s]); g.beginPath();
        for (var i = 0; i < N.n; i++) g.lineTo(N.x0 + i * 4, E[s][i] + (s ? gap : 0));
        for (i = N.n - 1; i >= 0; i--) g.lineTo(N.x0 + i * 4, E[s + 1][i]);
        g.closePath(); g.fill();
      }
    }
    var landLight = function (g) { bands(g, TL); K.knock(g, function (g2) { lees(g2); g2.fill(); }); };
    var landBlue = function (g) { bands(g, TB); };
    var shell = function (g) {
      g.strokeStyle = tone(1); g.lineWidth = 7 * Math.max(0.72, rs); g.lineJoin = "round"; g.lineCap = "round";
      g.beginPath(); g.moveTo(x0, CY[0]); line(g, CY); g.stroke();
      g.strokeStyle = tone(0.96); plant(g, cw);
    };
    var glow = function (g) {                              // the crest white-hot where the light ink lies over the pink line
      g.strokeStyle = tone(0.9); g.lineWidth = 7 * Math.max(0.72, rs) * 0.55; g.lineJoin = "round"; g.lineCap = "round";
      g.beginPath(); g.moveTo(x0, CY[0]); line(g, CY); g.stroke();
      plant(g, cw * 0.55);
    };
    return [
      { ink: "light", role: "sky", draw: skyLight }, { ink: "blue", role: "sky", draw: skyBlue }, { ink: "pink", role: "sky", draw: skyPink },
      { ink: "light", role: "land", draw: landLight }, { ink: "blue", role: "land", draw: landBlue },
      { ink: "pink", role: "line", draw: shell }, { ink: "light", role: "line", draw: glow }
    ];
  }

  function body(g, D, L) {
    var N = D.dn;
    g.moveTo(L.FX0 - 10, L.FY1 + 10);
    for (var i = 0; i < N.n; i++) g.lineTo(N.x0 + i * 4, N.CY[i]);
    g.lineTo(L.FX1 + 10, L.FY1 + 10); g.closePath();
  }

  A.add("scene", "dunes", {
    name: "Dunes",
    by: "The season as a dune crest under a huge sun: wind-ripple bands echo the record, a saguaro for every loss, mesas on far dunes.",
    lights: ["golden", "dusk", "night"],
    derive: derive, layers: layers, body: body
  });
})();
