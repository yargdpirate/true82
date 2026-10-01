/* ---------- TRUE 82 ART: SAVANNA (a scene for the results print) ----------
   The season as a savanna ridge at sundown: the record is the crest of the plain, a giant sun (or moon) sinks behind
   it, flat-topped acacias stand in silhouette against it and a drift of far ones along the horizon. Every loss is a
   vulture hanging over its game (a flock in a bad year), the grass is printed blade by blade, backlit gold at the crest.
   Rules: art/CONTRACT.md ("A scene"). Tone only: black at an alpha is coverage, never a color. */
(function () {
  "use strict";
  var A = typeof window !== "undefined" ? window.T82ART : null;
  if (!A || typeof A.add !== "function") return;
  var PI = Math.PI;

  function derive(K, D, L) {
    var r = K.rand((D.seed * 2654435761 + 61) >>> 0), WL = L.WL, vs = L.vs, rs = L.rs, m = D.m, c = K.clamp, night = D.pal.key === "night";
    var x0 = L.FX0 - 12, n = Math.ceil((L.FX1 + 12 - x0) / 4) + 1, i, j, k, x, y, hi = 0, lo = 0, CY = [];
    for (i = 0; i <= 82; i++) { hi = Math.max(hi, m[i]); lo = Math.min(lo, m[i]); }
    var amp = Math.min(c(80 * vs / (L.SC * Math.max(1, hi - lo)), 1, 1.8), hi > 0 ? (WL - L.FY0 - 110 * vs) / (L.SC * hi) : 9, lo < 0 ? (L.FY1 - 62 * vs - WL) / (L.SC * -lo) : 9);
    function cr(u) {
      u = c(u, 0, 82);
      var j = Math.min(81, Math.floor(u)), f = u - j, p0 = m[c(j - 1, 0, 82)], p1 = m[j], p2 = m[j + 1], p3 = m[c(j + 2, 0, 82)];
      return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
    }
    for (i = 0; i < n; i++) CY.push(WL - L.SC * amp * cr((x0 + i * 4 - L.X0) / (L.X1 - L.X0) * 82));
    function yAt(x) { var u = c((x - x0) / 4, 0, n - 1.001), j = Math.floor(u); return CY[j] + (CY[j + 1] - CY[j]) * (u - j); }
    // the sun (or the moon): right of the roster, behind the crest
    var sx = L.X0 + (L.X1 - L.X0) * (0.6 + 0.2 * r()), hz = yAt(sx);
    var sr = c((hz - L.FY0 - 8 * vs) / (night ? 1.5 : 1.3), 38 * rs, (night ? 150 : 190) * rs), sy = hz - (night ? 0.5 : 0.3) * sr;
    function rnds(q) { var o = [], z; for (z = 0; z < q; z++) o.push(r()); return o; }
    // the acacias: two against the sun, the rest spread along the ridge
    var T = [], nT = rs < 1 ? 6 : 7, span = L.X1 - L.X0 + 60, hero = [[sx - sr * 0.5, 118], [sx + sr * 0.62, 80]];
    function tree(x, H) { var W = H * (1.45 + 0.5 * r()); return { x: x, y: yAt(x) + 2 * vs, H: H, W: W, th: H * (0.27 + 0.08 * r()), lean: H * (r() - 0.5) * 0.24, o: r() - 0.5, b: rnds(14), b2: rnds(9) }; }
    for (i = 0; i < nT; i++) {
      x = L.X0 - 30 + (i + 0.2 + 0.6 * r()) * span / nT;
      if (Math.abs(x - hero[0][0]) > 110 * rs && Math.abs(x - hero[1][0]) > 90 * rs) T.push(tree(x, (r() < 0.35 ? 90 + 24 * r() : 54 + 30 * r()) * rs));
    }
    hero.forEach(function (q) { T.push(tree(q[0], q[1] * rs)); });
    // the vultures: one over every loss, in tiers when they crowd
    var nl = D.losses.length, bw = c(50 - 0.45 * nl, 24, 46) * (rs < 1 ? 1.25 : 1), tiers = c(Math.ceil(bw * nl / (L.X1 - L.X0) * 0.95), 1, 4), V = [];
    D.losses.forEach(function (gi, q) {
      var bx = D.X(gi + 0.5), w = bw * (0.88 + 0.24 * r()), t = q % tiers, by = yAt(bx) - (46 + t * 34) * rs - (r() - 0.5) * 8 * rs - w * 0.12;
      T.forEach(function (tr) { if (Math.abs(bx - tr.x - tr.lean) < tr.W / 2 + w * 0.4) by = Math.min(by, tr.y - tr.H - 0.35 * w - (8 + t * 18) * rs); });
      V.push({ x: bx, y: by, w: w, a: (r() - 0.5) * 0.3 });
    });
    // grass: the fringe above the crest (dark against the sun), the field below it in rows of tufts that grow toward the viewer
    var F = [], G = [], bs = Math.max(0.8, rs), DR = [8, 26, 50, 80, 118, 164, 220, 284, 356], row, len, sp, bw0, ln, a, b;
    for (x = x0; x < L.FX1 + 12; x += (6.5 + 5 * r()) * bs) { len = (7 + 14 * r()) * rs; ln = 0.3 + 0.35 * r(); y = yAt(x) + 1; F.push([x, y, x + ln * len, y - len, 2.6 * bs]); }
    for (row = 0; row < DR.length; row++) {
      len = (13 + row * 8) * rs; sp = (13 + row * 7) * rs; bw0 = (2.4 + row * 0.4) * bs; G.push([]);
      for (x = x0 + r() * sp; x < L.FX1 + 12; x += sp * (0.75 + 0.5 * r())) {
        y = yAt(x) + DR[row] * vs * (0.85 + 0.3 * r());
        if (y - len > L.FY1) continue;
        for (j = 0, k = 3 + Math.floor(r() * 3); j < k; j++) {
          ln = len * (0.55 + 0.45 * r()); a = (j / (k - 1) - 0.5) * 0.9 + (r() - 0.5) * 0.2 + 0.08;
          G[row].push([x + (j - k / 2) * bw0 * 0.6, y, x + (j - k / 2) * bw0 * 0.6 + a * ln, y - ln * Math.cos(a), bw0, a]);
        }
      }
    }
    // foreground clumps, tall dark blades from the bottom edge
    var C = [], nC = 9, ch;
    for (i = 0; i < nC; i++) {
      x = L.FX0 + (i + 0.2 + 0.6 * r()) * (L.FX1 - L.FX0) / nC;
      for (j = 0, k = 3 + Math.floor(r() * 3); j < k; j++) { ch = (50 + 60 * r()) * rs; C.push([x + (j - k / 2) * 5 * rs, L.FY1 + 6, ch, (r() - 0.35) * 0.7, (8 + 5 * r()) * rs]); }
    }
    // streaks of cloud across the sun, and the far grove along the horizon
    var S = [], FG = [];
    for (i = 0; i < 7; i++) S.push([sx + (r() - 0.5) * sr * 3.4, sy - sr * 0.95 + r() * sr * 1.15, (80 + 190 * r()) * rs, (3 + 6 * r()) * rs]);
    for (x = x0 + 10; x < L.FX1 + 10; x += (30 + 24 * r()) * rs) FG.push({ x: x, y: yAt(x) - 1.5 * vs, H: (13 + 13 * r()) * rs, b: rnds(7) });
    var st = [];
    for (i = 0; i < 90; i++) st.push([L.FX0 + r() * (L.FX1 - L.FX0), L.FY0 + Math.pow(r(), 1.3) * (hz - L.FY0 - 20 * vs), (1.2 + 2 * r()) * Math.max(0.9, rs), r() < 0.12]);
    var cr1 = [[-0.3, -0.25, 0.2], [0.34, 0.1, 0.14], [-0.05, 0.42, 0.17], [0.08, -0.55, 0.09], [-0.55, 0.2, 0.1], [0.5, -0.4, 0.07]];
    D.sv = { x0: x0, n: n, CY: CY, yAt: yAt, sx: sx, sy: sy, sr: sr, hz: hz, T: T, V: V, F: F, G: G, C: C, S: S, FG: FG, st: st, cr: cr1 };
  }

  // an acacia as one clockwise path: a layered canopy (lens), a lower tier, a forking trunk
  function lens(g, cx, y, W, T, b) {
    var k = b.length - 1, j, u, s;
    g.moveTo(cx - W / 2, y + T * 0.3);
    for (j = 1; j <= k; j++) { u = j / k; s = Math.pow(Math.sin(PI * u), 0.6); g.lineTo(cx - W / 2 + W * u, y + T * 0.3 * (1 - s) - (b[j] - 0.5) * T * 0.2 * s); }
    for (j = k - 1; j >= 0; j--) { u = j / k; s = Math.pow(Math.sin(PI * u), 0.7); g.lineTo(cx - W / 2 + W * u, y + T * (0.3 + 0.7 * s * (0.6 + 0.7 * b[j]))); }
    g.closePath();
  }
  function treePath(g, t) {
    var cx = t.x + t.lean, ct = t.y - t.H, fy = ct + t.th * 1.9, fx = cx + t.o * t.W * 0.08, wb = Math.max(t.H * 0.085, 3.8), mx = t.x + t.lean * 0.15, my = t.y - t.H * 0.4;
    lens(g, cx, ct, t.W, t.th, t.b);
    lens(g, cx + t.W * t.o * 0.35, ct + t.th * 0.95, t.W * 0.52, t.th * 0.8, t.b2);
    g.moveTo(t.x - wb, t.y); g.lineTo(mx - wb * 0.55, my); g.lineTo(fx - wb * 0.45, fy); g.lineTo(fx + wb * 0.45, fy); g.lineTo(mx + wb * 0.55, my); g.lineTo(t.x + wb, t.y); g.closePath();
    [-0.34, -0.14, 0.12, 0.33].forEach(function (q) {
      var px = cx + t.W * q, py = ct + t.th * 0.55;
      g.moveTo(fx - wb * 0.42, fy); g.lineTo(px - wb * 0.28, py); g.lineTo(px + wb * 0.28, py); g.lineTo(fx + wb * 0.42, fy); g.closePath();
    });
  }
  function grove(g, t) {
    var cx = t.x, W = t.H * 2, T = t.H * 0.34;
    lens(g, cx, t.y - t.H, W, T, t.b);
    g.moveTo(cx - 1.6, t.y); g.lineTo(cx - 0.9, t.y - t.H + T); g.lineTo(cx + 0.9, t.y - t.H + T); g.lineTo(cx + 1.6, t.y); g.closePath();
  }
  function bird(g, x, y, w, tl) {
    g.save(); g.translate(x, y); g.rotate(tl); x = 0; y = 0;
    g.moveTo(x - w / 2, y + w * 0.05); g.quadraticCurveTo(x - w * 0.27, y - w * 0.27, x, y - w * 0.09);
    g.quadraticCurveTo(x + w * 0.27, y - w * 0.27, x + w / 2, y + w * 0.05);
    g.quadraticCurveTo(x + w * 0.28, y - w * 0.11, x, y + w * 0.05);
    g.quadraticCurveTo(x - w * 0.28, y - w * 0.11, x - w / 2, y + w * 0.05); g.closePath();
    g.moveTo(x - w * 0.07, y - w * 0.08); g.lineTo(x + w * 0.07, y - w * 0.08); g.lineTo(x + w * 0.05, y + w * 0.1); g.lineTo(x - w * 0.05, y + w * 0.1); g.closePath(); g.restore();
  }
  function blades(g, B) {
    var j, q, mx;
    g.beginPath();
    for (j = 0; j < B.length; j++) {
      q = B[j]; mx = q[0] + (q[2] - q[0]) * 0.3;
      g.moveTo(q[0] - q[4] / 2, q[1]); g.quadraticCurveTo(mx - q[4] * 0.3, (q[1] + q[3]) / 2 + (q[1] - q[3]) * 0.1, q[2], q[3]);
      g.quadraticCurveTo(mx + q[4] * 0.4, (q[1] + q[3]) / 2 + (q[1] - q[3]) * 0.1, q[0] + q[4] / 2, q[1]); g.closePath();
    }
    g.fill();
  }

  function layers(K, P, D, L) {
    var N = D.sv, CY = N.CY, WL = L.WL, vs = L.vs, rs = L.rs, tone = K.tone, night = D.pal.key === "night", sx = N.sx, sy = N.sy, sr = N.sr, hz = N.hz;
    var x0 = L.FX0 - 10, x1 = L.FX1 + 10, lw = 8 * Math.max(0.72, rs), bs = Math.max(0.8, rs);
    function line(g) { for (var i = 0; i < N.n; i++) g.lineTo(N.x0 + i * 4, CY[i]); }
    function belowP(g) { g.beginPath(); g.moveTo(x0, L.FY1 + 20); line(g); g.lineTo(x1, L.FY1 + 20); g.closePath(); }
    function skyClip(g) { g.beginPath(); g.moveTo(x0, L.FY0 - 10); line(g); g.lineTo(x1, L.FY0 - 10); g.closePath(); g.clip(); }
    function strokeLine(g, wd) { g.lineWidth = wd; g.lineJoin = "round"; g.beginPath(); g.moveTo(x0, CY[0]); line(g); g.stroke(); }
    function disc(g, k) { K.circle(g, sx, sy, sr * k); }
    function fillT(g, t) { g.fillStyle = tone(t); g.fill(); }
    function streaks(g, t) { g.fillStyle = tone(t); N.S.forEach(function (s) { g.beginPath(); g.moveTo(s[0] - s[2] / 2, s[1]); g.quadraticCurveTo(s[0], s[1] - s[3], s[0] + s[2] / 2, s[1]); g.quadraticCurveTo(s[0], s[1] + s[3] * 0.6, s[0] - s[2] / 2, s[1]); g.fill(); }); }
    function groveP(g) { g.beginPath(); N.FG.forEach(function (t) { grove(g, t); }); }
    // everything that stands in front of the sky: knocked out of it (dark), with the crest's keyline
    function holes(g) {
      K.knock(g, function (g2) {
        g2.beginPath(); N.T.forEach(function (t) { treePath(g2, t); }); g2.fill();
        g2.beginPath(); N.F.forEach(function (q) { g2.moveTo(q[0] - q[4] / 2, q[1] + 2); g2.lineTo(q[2], q[3]); g2.lineTo(q[0] + q[4] / 2, q[1] + 2); g2.closePath(); }); g2.fill();
        g2.lineWidth = 3.4 * bs; g2.lineJoin = "round"; g2.beginPath(); N.V.forEach(function (v) { bird(g2, v.x, v.y, v.w, v.a); }); g2.fill(); g2.stroke();
        strokeLine(g2, lw * 2.6);
      });
    }
    function sunHalo(g) { g.fillStyle = tone(0.17); disc(g, 2.25); g.fill(); g.fillStyle = tone(0.3); disc(g, 1.7); g.fill(); g.fillStyle = tone(0.46); disc(g, 1.28); g.fill(); }
    var skyLight = function (g) {
      skyClip(g);
      g.strokeStyle = tone(night ? 0.07 : 0.13);
      [150, 104, 68, 40, 18].forEach(function (d) { strokeLine(g, d * 2 * vs); });
      sunHalo(g);
      disc(g, 1); g.fillStyle = K.vgrad(g, sy - sr, hz, night ? [[0, 0.82], [1, 0.97]] : [[0, 0.6], [1, 0.98]]); g.fill();
      if (night) K.knock(g, function (g2) { g2.globalAlpha = 0.42; N.cr.forEach(function (q) { K.circle(g2, sx + q[0] * sr, sy + q[1] * sr, q[2] * sr); g2.fill(); }); });
      K.knock(g, function (g2) { streaks(g2, 1); groveP(g2); g2.fill(); });
      holes(g);
    };
    var skyBlue = function (g) {
      skyClip(g);
      g.fillStyle = K.vgrad(g, L.FY0, hz, night ? [[0, 0.9], [0.6, 0.5], [1, 0.12]] : [[0, 0.82], [0.55, 0.4], [1, 0.05]]); g.fillRect(L.FX0 - 10, L.FY0 - 10, L.FX1 - L.FX0 + 20, L.FY1 - L.FY0 + 20);
      K.knock(g, function (g2) { disc(g2, 1.02); g2.fill(); });
      streaks(g, 0.62);
      g.beginPath(); N.FG.forEach(function (t) { grove(g, t); }); fillT(g, 0.72);
      holes(g);
    };
    var skyPink = function (g) {
      skyClip(g);
      if (night) { g.fillStyle = tone(0.95); N.st.forEach(function (s) { K.circle(g, s[0], s[1], s[2] * (s[3] ? 1.7 : 1)); g.fill(); }); }
      else {
        g.fillStyle = K.vgrad(g, L.FY0, hz - 30 * vs, [[0, 0.3], [1, 0]]); g.fillRect(L.FX0 - 10, L.FY0 - 10, L.FX1 - L.FX0 + 20, hz - 30 * vs - L.FY0 + 10);
        disc(g, 0.98); g.fillStyle = K.vgrad(g, sy - sr * 0.1, hz, [[0, 0], [1, 0.5]]); g.fill();
      }
      K.knock(g, function (g2) { if (night) { disc(g2, 1.5); g2.fill(); } });
      holes(g);
    };
    // the field: gold blades row by row (backlit near the crest), a glow hugging the crest, long tree shadows knocked out
    var landLight = function (g) {
      g.save(); belowP(g); g.clip(); g.strokeStyle = tone(0.2);
      [46, 30, 15].forEach(function (d) { strokeLine(g, d * rs); g.strokeStyle = tone(0.16); });
      g.restore();
      N.G.forEach(function (B, k) { g.fillStyle = tone(k < 3 ? 0.92 : 0.84); blades(g, B); });
      K.knock(g, function (g2) {
        N.T.forEach(function (t) { var sw = t.W * 0.9, yy = t.y + 3 * vs; g2.beginPath(); g2.moveTo(t.x - 3, yy); g2.lineTo(t.x - sw, yy + 6 * vs); g2.lineTo(t.x - sw - t.W * 0.5, yy + 14 * vs); g2.lineTo(t.x - sw * 0.5, yy + 22 * vs); g2.lineTo(t.x + 3, yy + 5 * vs); g2.closePath(); g2.fill(); });
        N.C.forEach(function (q) { g2.beginPath(); g2.moveTo(q[0] - q[4] / 2, q[1]); g2.lineTo(q[0] + q[3] * q[2], q[1] - q[2]); g2.lineTo(q[0] + q[4] / 2, q[1]); g2.closePath(); g2.fill(); });
      });
    };
    var landPink = function (g) {
      g.save(); belowP(g); g.clip(); g.strokeStyle = tone(0.34);
      [22, 11].forEach(function (d) { strokeLine(g, d * rs); });
      g.restore();
      g.fillStyle = tone(0.6);
      N.G.forEach(function (B, k) { if (k > 2) blades(g, B.filter(function (q, i) { return (i * 7 + k) % 23 < 4; })); });
    };
    var landBlue = function (g) {
      belowP(g); g.fillStyle = K.vgrad(g, hz, L.FY1, [[0, 0.45], [1, 0.86]]); g.fill();
      K.knock(g, function (g2) { N.C.forEach(function (q) { g2.beginPath(); g2.moveTo(q[0] - q[4] / 2, q[1]); g2.lineTo(q[0] + q[3] * q[2], q[1] - q[2]); g2.lineTo(q[0] + q[4] / 2, q[1]); g2.closePath(); g2.fill(); }); });
    };
    var shell = function (g) {
      g.strokeStyle = tone(1); g.lineCap = "round"; strokeLine(g, lw);
      g.fillStyle = tone(0.96); g.beginPath(); N.V.forEach(function (v) { bird(g, v.x, v.y, v.w, v.a); }); g.fill();
    };
    var glow = function (g) { g.strokeStyle = tone(0.9); g.lineCap = "round"; strokeLine(g, lw * 0.5); };
    return [
      { ink: "light", role: "sky", draw: skyLight }, { ink: "blue", role: "sky", draw: skyBlue }, { ink: "pink", role: "sky", draw: skyPink },
      { ink: "light", role: "land", draw: landLight }, { ink: "pink", role: "land", draw: landPink }, { ink: "blue", role: "land", draw: landBlue },
      { ink: "pink", role: "line", draw: shell }, { ink: "light", role: "line", draw: glow }
    ];
  }

  function body(g, D, L) {
    var N = D.sv;
    g.moveTo(L.FX0 - 10, L.FY1 + 10);
    for (var i = 0; i < N.n; i++) g.lineTo(N.x0 + i * 4, N.CY[i]);
    g.lineTo(L.FX1 + 10, L.FY1 + 10); g.closePath();
  }

  A.add("scene", "savanna", {
    name: "Savanna",
    by: "The season as a savanna ridge at sundown: a giant sun behind flat-topped acacias, a vulture over every loss, the grass printed blade by blade.",
    lights: ["golden", "dusk", "night"],
    derive: derive, layers: layers, body: body
  });
})();
