/* ---------- TRUE 82 ART: RIDGELINES (a scene for the results print) ----------
   The season as a stack of engraved ridge lines: the front line is the real record (every loss a pearl on it),
   and the lines behind it are its echoes, each one higher, flatter and wilder than the last, each hiding the
   ones behind it, like a pulse plotted over and over. A sun (or a moon and stars) stands over the stack.
   Rules: art/CONTRACT.md ("A scene"). Tone only: black at an alpha is coverage, never a color. */
(function () {
  "use strict";
  var A = typeof window !== "undefined" ? window.T82ART : null;
  if (!A || typeof A.add !== "function") return;
  var STEP = 4;

  function derive(K, D, L) {
    var m = D.m, vs = L.vs, X0 = L.X0, X1 = L.X1, FH = L.FY1 - L.FY0, i, j, x, mx = 0, mn = 0, hd = vs > 0.8;
    var r = K.rand((D.seed * 2654435761 + 77) >>> 0), N = hd ? 15 : 9, step = FH * (hd ? 0.033 : 0.047);
    for (i = 0; i <= 82; i++) { mx = Math.max(mx, m[i]); mn = Math.min(mn, m[i]); }
    var rg = Math.max(8, mx - mn), k = Math.min(1.4 * L.SC, 0.4 * FH / rg), yb = L.FY1 - 0.07 * FH;
    function cr(u) {                                       // Catmull-Rom through the running margin
      u = K.clamp(u, 0, 82);
      var j = Math.min(81, Math.floor(u)), f = u - j, a = m[Math.max(0, j - 1)], b = m[j], c = m[j + 1], d = m[Math.min(82, j + 2)];
      return 0.5 * (2 * b + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
    }
    var nz = [];
    for (i = 0; i <= N; i++) nz.push(K.noise1D(D.seed + 40 + i * 7));
    var xs = [], Y = [];
    for (x = L.FX0 - 10; x <= L.FX1 + 10 + STEP; x += STEP) xs.push(x);
    for (i = 0; i <= N; i++) Y.push([]);
    xs.forEach(function (x) {
      var d = k * (cr((x - X0) / (X1 - X0) * 82) - mn) + K.fbm(nz[0], x * 0.03, 3) * 2.2 * vs * K.smooth(X0, X0 + 32, x), t;
      Y[0].push(yb - d);
      for (i = 1; i <= N; i++) {
        t = i / N;
        Y[i].push(yb - i * step - (1 - 0.72 * t) * d + K.fbm(nz[i], x * (0.012 + 0.02 * t), 3) * FH * (0.012 + 0.03 * t) * (0.4 + K.smooth(L.FX0, L.FX0 + 160, x) * 0.6));
      }
    });
    function front(x) { var q = K.clamp((x - xs[0]) / STEP, 0, xs.length - 1.001), a = Math.floor(q); return Y[0][a] + (Y[0][a + 1] - Y[0][a]) * (q - a); }
    var marks = D.losses.map(function (g) { var mx = D.X(g + 1); return [mx, front(mx)]; });
    // the sun stands over the stack, right of the roster, as large as the clear sky allows
    var sx = 745, sr = 0.16 * FH, top = 1e9;
    for (j = 0; j < xs.length; j++) if (Math.abs(xs[j] - sx) < sr * 1.1) top = Math.min(top, Y[N][j]);
    sr = K.clamp(Math.min(sr, (top - L.FY0 - 10 * vs) / 2.3), 0.08 * FH, 0.16 * FH);
    var sy = Math.min(L.FY0 + 0.3 * FH, top - sr * 1.25), stars = [];
    for (i = 0; i < L.stars; i++) {
      x = L.FX0 + r() * (L.FX1 - L.FX0); j = Math.round((x - xs[0]) / STEP);
      var y = L.FY0 + 6 + r() * (FH * 0.5);
      if (y < Y[N][j] - 14 * vs && Math.hypot(x - sx, y - sy) > sr * 1.5) stars.push([x, y, 0.8 + r() * 1.5 + 0.8 * vs]);
    }
    var hz = 1e9;
    for (j = 0; j < xs.length; j++) hz = Math.min(hz, Y[N][j]);
    D.rl = { xs: xs, Y: Y, N: N, yb: yb, marks: marks, sun: { x: sx, y: sy, r: sr }, stars: stars, step: step, hz: hz };
  }

  function layers(K, P, D, L) {
    var V = D.rl, T = K.tone, xs = V.xs, Y = V.Y, N = V.N, sun = V.sun, FH = L.FY1 - L.FY0, vs = L.vs, rs = L.rs, night = D.pal.key === "night", hd = vs > 0.8;
    var FX0 = L.FX0 - 10, FW = L.FX1 - L.FX0 + 20, ln = Math.max(0.8, rs) * 4.4, pu = hd ? 1.15 : 1.5, i;
    function line(g, y) { var j; g.beginPath(); for (j = 0; j < xs.length; j++) g.lineTo(xs[j], y[j]); }
    function body(g, y, dy) {
      var j; g.beginPath(); g.moveTo(xs[0], L.FY1 + 10);
      for (j = 0; j < xs.length; j++) g.lineTo(xs[j], y[j] + (dy || 0));
      g.lineTo(xs[xs.length - 1], L.FY1 + 10); g.closePath();
    }
    function each(g, from, fn) {                            // back to front: each ridge hides what is behind it, then draws itself
      for (var i = N; i >= from; i--) { K.knock(g, function (g2) { body(g2, Y[i]); g2.fill(); }); fn(i); }
    }
    function lw(i) { return ln * (0.55 + 0.5 * (1 - i / N)); }
    function disc(g, k) { K.circle(g, sun.x, sun.y, sun.r * k); }
    function glow(g, r1, st) {                              // a halo is a ramp of dots shrinking outward
      var gr = g.createRadialGradient(sun.x, sun.y, sun.r * 0.9, sun.x, sun.y, sun.r * r1);
      st.forEach(function (s) { gr.addColorStop(s[0], T(s[1])); });
      g.fillStyle = gr; g.fillRect(FX0, L.FY0 - 10, FW, FH + 20);
    }
    var skyLight = function (g) {
      glow(g, 3.6, [[0, 0.7], [0.3, 0.36], [0.65, 0.1], [1, 0]]);
      g.fillStyle = night ? T(0.95) : K.vgrad(g, sun.y - sun.r, sun.y + sun.r, [[0, 0.97], [1, 0.66]]);
      if (night) {                                                                        // a crescent: the disc less an offset disc, the glow showing through the dark side
        g.save(); disc(g, 1); g.clip(); g.beginPath(); g.rect(sun.x - sun.r, sun.y - sun.r, sun.r * 2, sun.r * 2);
        g.moveTo(sun.x + sun.r * 1.28, sun.y - sun.r * 0.16); g.arc(sun.x + sun.r * 0.42, sun.y - sun.r * 0.16, sun.r * 0.86, 0, 6.2832); g.fill("evenodd"); g.restore();
      } else disc(g, 1), g.fill();
      if (!night) K.knock(g, function (g2) { for (var j = 0; j < 4; j++) g2.fillRect(sun.x - sun.r - 2, sun.y + sun.r * (0.2 + j * 0.2), sun.r * 2 + 4, Math.max(sun.r * (0.035 + j * 0.03), 4 * (0.6 + j * 0.3) * Math.max(0.8, vs))); });
      K.knock(g, function (g2) { body(g2, Y[0]); g2.fill(); });
    };
    var skyAqua = function (g) {
      glow(g, 2.2, [[0, 0.34], [0.5, 0.12], [1, 0]]);
      if (night) { g.fillStyle = T(0.95); V.stars.forEach(function (s) { K.circle(g, s[0], s[1], s[2]); g.fill(); }); }
      K.knock(g, function (g2) { disc(g2, 1.08); g2.fill(); body(g2, Y[0]); g2.fill(); });
    };
    var skyKey = function (g) {
      g.fillStyle = K.vgrad(g, L.FY0, V.hz + 0.03 * FH, [[0, 0.62], [0.6, 0.26], [1, 0.04]]); g.fillRect(FX0, L.FY0 - 10, FW, V.hz - L.FY0 + 0.03 * FH + 10);
      K.knock(g, function (g2) { disc(g2, 1.1); g2.fill(); body(g2, Y[0]); g2.fill(); });
    };
    var landLight = function (g) {
      g.strokeStyle = T(0.7); g.lineJoin = "round";
      each(g, 1, function (i) { if (i <= 7) { g.lineWidth = lw(i) * 0.9; g.save(); g.translate(0, -lw(i) * 1.5); line(g, Y[i]); g.stroke(); g.restore(); } });
      g.fillStyle = K.vgrad(g, V.yb - 0.3 * FH, L.FY1, [[0, 0.4], [1, 0]]); body(g, Y[0]); g.fill();
    };
    var landAqua = function (g) {
      g.strokeStyle = T(0.92); g.lineJoin = "round";
      each(g, 1, function (i) { g.lineWidth = lw(i); line(g, Y[i]); g.stroke(); });
      K.knock(g, function (g2) { body(g2, Y[0]); g2.fill(); });
    };
    var landKey = function (g) {
      each(g, 1, function (i) { g.fillStyle = T(0.1 + 0.38 * (1 - i / N)); body(g, Y[i]); g.fill(); });
      K.knock(g, function (g2) { body(g2, Y[0]); g2.fill(); });
      g.fillStyle = T(0.55); body(g, Y[0]); g.fill();
      K.knock(g, function (g2) {                                                         // the foreground, ruled like a scan
        for (var y = V.yb + 5 * vs, j = 0; y < L.FY1 + 4; j++, y += (3.4 + j * 1.4) * Math.max(0.8, vs)) g2.fillRect(FX0, y, FW, (0.9 + j * 0.4) * Math.max(0.8, vs));
      });
    };
    var front = function (g) {
      g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = T(0.95); g.lineWidth = ln * 1.25; line(g, Y[0]); g.stroke();
      K.knock(g, function (g2) { V.marks.forEach(function (q) { K.circle(g2, q[0], q[1], 7.4 * pu); g2.fill(); }); });
      g.fillStyle = T(0.95); V.marks.forEach(function (q) { K.circle(g, q[0], q[1], 4.6 * pu); g.fill(); });
    };
    return [
      { ink: "light", role: "sky", draw: skyLight }, { ink: "pink", role: "sky", draw: skyAqua }, { ink: "blue", role: "sky", draw: skyKey },
      { ink: "light", role: "land", draw: landLight }, { ink: "pink", role: "land", draw: landAqua }, { ink: "blue", role: "land", draw: landKey },
      { ink: "pink", role: "line", draw: front }
    ];
  }
  // the fill's front line runs down through the stack, under the real record
  function body(g, D, L) {
    var V = D.rl, j;
    g.moveTo(V.xs[0], L.FY1 + 10);
    for (j = 0; j < V.xs.length; j++) g.lineTo(V.xs[j], V.Y[0][j]);
    g.lineTo(V.xs[V.xs.length - 1], L.FY1 + 10); g.closePath();
  }

  A.add("scene", "ridgelines", {
    name: "Ridgelines",
    by: "The season as a stack of engraved ridge lines: the front one is the record with a pearl for every loss, the rest its echoes, each hiding the last.",
    lights: ["golden", "dusk", "night"],
    derive: derive, layers: layers, body: body
  });
})();
