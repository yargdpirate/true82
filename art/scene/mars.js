/* ---------- TRUE 82 ART: RED PLANET (a scene for the results print) ----------
   The season as a ridge on Mars: the record is the crest, a rover has driven it (tread tracks along the crest, the
   rover at the season's end), every loss is a meteor that hit the ridge and left a crater. A small white sun sets
   in its blue halo (Mars sunsets are blue), a shield volcano on the horizon, Phobos and Deimos in the sky.
   Rules: art/CONTRACT.md ("A scene"). Tone only: black at an alpha is coverage, never a color. */
(function () {
  "use strict";
  var A = typeof window !== "undefined" ? window.T82ART : null;
  if (!A || typeof A.add !== "function") return;
  var BD = [0, 16, 36, 62, 98, 150, 222, 316], LC = [0.9, 0.6, 0.4, 0.26, 0.15, 0.08, 0.05, 0.03], KC = [0.3, 0.42, 0.52, 0.6, 0.66, 0.7, 0.66, 0.6];

  function derive(K, D, L) {
    var r = K.rand((D.seed * 2654435761 + 43) >>> 0), WL = L.WL, vs = L.vs, rs = L.rs, m = D.m, c = K.clamp, i, j, x, hi = 0, lo = 0;
    var ST = 3, x0 = L.FX0 - 12, NG = Math.ceil((L.FX1 + 12 - x0) / ST) + 1, nl = D.losses.length;
    for (i = 0; i <= 82; i++) { hi = Math.max(hi, m[i]); lo = Math.min(lo, m[i]); }
    var amp = Math.min(c(70 * vs / (L.SC * Math.max(1, hi - lo)), 1, 1.8), hi > 0 ? (WL - L.FY0 - 96 * vs) / (L.SC * hi) : 9, lo < 0 ? (L.FY1 - WL - 8 * vs) / (L.SC * -lo) : 9);
    function cr(u) {
      u = c(u, 0, 82);
      var j = Math.min(81, Math.floor(u)), f = u - j, p0 = m[c(j - 1, 0, 82)], p1 = m[j], p2 = m[j + 1], p3 = m[c(j + 2, 0, 82)];
      return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
    }
    var ng = K.noise1D(D.seed + 11), CY = [];
    for (i = 0; i < NG; i++) {                           // the record, cut a little ragged like rock
      x = x0 + i * ST;
      CY.push(WL - L.SC * amp * cr((c(x, L.X0, L.X1) - L.X0) / (L.X1 - L.X0) * 82) - 10 * vs * K.smooth(L.X0, x0, x) * (x < L.X0 ? 1 : 0) + K.fbm(ng, x * 0.03, 4) * 9 * vs * K.smooth(L.X0, L.X0 + 30, x));
    }
    function at(x) { return c(Math.round((x - x0) / ST), 0, NG - 1); }
    function sm(w) {
      var o = [], a, s, q, k = Math.round(w / ST);
      for (i = 0; i < NG; i++) { s = 0; q = 0; for (a = Math.max(0, i - k); a <= Math.min(NG - 1, i + k); a++) { s += CY[a]; q++; } o.push(Math.min(WL, s / q)); }
      return o;
    }
    var s70 = sm(70), s130 = sm(130), n1 = K.noise1D(D.seed + 17), n2 = K.noise1D(D.seed + 23), F1 = [], F0 = [];
    function rg(n, x, f) { return Math.pow(Math.max(0.06, 1 - Math.abs(K.fbm(n, x * f, 4)) * 2.2), 1.4); }
    var xd = L.X0 + (L.X1 - L.X0) * (0.5 + 0.12 * r()), hw = 230 * rs, hd = 86 * vs;
    for (i = 0; i < NG; i++) {
      x = x0 + i * ST;
      F1.push(Math.min(WL - (56 + 52 * rg(n1, x, 0.007)) * vs - 0.3 * Math.max(0, WL - s70[i]), s70[i] - 26 * vs));
      var t = Math.abs(x - xd) / hw, dome = t < 1 ? hd * Math.pow(1 - t, 0.62) : 0;       // the shield volcano: a wide low dome, a notch for its caldera
      if (t < 0.1) dome -= hd * 0.09 * (1 - t / 0.1);
      F0.push(Math.min(WL - (112 + 26 * rg(n2, x, 0.0045)) * vs - 0.2 * Math.max(0, WL - s130[i]) - dome, F1[i] - 20 * vs));
    }
    // the sun in a gap right of the volcano; Phobos (lumpy) and Deimos (small) up in the sky
    var sr = Math.min(D.pal.sr * rs * 0.7, 60 * rs), sx = 0, best = 1e9, q, cx, mean;
    for (q = 0; q < 9; q++) {
      cx = L.X0 + (L.X1 - L.X0) * (0.74 + 0.16 * q / 8); mean = 0;
      for (j = -3; j <= 3; j++) mean += F0[at(cx + j * sr / 3)];
      if (mean < best) { best = mean; sx = cx; }
    }
    var hz = F0[at(sx)], sy = Math.max(hz - 0.3 * sr, L.FY0 + sr * 2.1 + 8 * vs), top = Math.min.apply(null, F0), pr = 38 * rs;
    var ph = { x: L.X0 + (L.X1 - L.X0) * (0.66 + 0.06 * r()), y: Math.max(L.FY0 + pr + 12 * vs, top - 100 * vs - 40 * r() * vs), r: pr, a: r() * 6, p: [] };
    for (i = 0; i < 9; i++) ph.p.push(0.72 + 0.4 * r());
    var dm = { x: L.X0 + (L.X1 - L.X0) * (0.9 + 0.02 * r()), y: Math.max(L.FY0 + 30 * rs + 10 * vs, top - 160 * vs), r: 15 * rs };
    var pits = [], d, px, py, pw;
    for (i = 0; i < 16; i++) {                           // shallow craters on the plain, bigger toward the viewer
      px = L.FX0 + r() * (L.FX1 - L.FX0); d = (34 + 300 * Math.pow(r(), 1.2)) * vs; pw = (16 + 0.17 * d / vs) * rs * 1.15; py = CY[at(px)] + d;
      if (py + pw * 0.4 < L.FY1 - 4 * vs) pits.push([px, py, pw, pw * 0.3]);
    }
    var stars = [];
    for (i = 0; i < L.stars; i++) stars.push(L.FX0 + r() * (L.FX1 - L.FX0), L.FY0 + Math.pow(r(), 1.3) * (top - L.FY0 - 6 * vs), (1.2 + r() * 1.8) * Math.max(0.8, rs), r() < 0.14 ? 1 : 0);
    // a meteor and a crater where each loss fell; the rover at the season's end, on the slope there
    var hits = D.losses.map(function (g) { var x = D.X(g + 0.5); return [x, CY[at(x)], r()]; });
    var rx = L.X1 - 22 * rs, ra = Math.atan2(CY[at(rx + 14 * rs)] - CY[at(rx - 14 * rs)], 28 * rs);
    D.mr = { st: ST, x0: x0, NG: NG, CY: CY, F0: F0, F1: F1, sun: { x: sx, y: sy, r: sr }, ph: ph, dm: dm, stars: stars, pits: pits, hits: hits, top: top,
      len: c(96 - 0.9 * nl, 36, 80) * (rs < 1 ? 0.8 : 1.1), rover: { x: rx, y: CY[at(rx)], a: ra } };
  }

  function layers(K, P, D, L) {
    var V = D.mr, ST = V.st, T = K.tone, vs = L.vs, rs = L.rs, night = D.pal.key === "night", pal = D.pal, NG = V.NG, x0 = V.x0, xN = x0 + (NG - 1) * ST, CY = V.CY;
    var sw = 5.4 * Math.max(0.72, rs), gap = 1.9 * Math.max(0.8, rs), sun = V.sun, ph = V.ph, dm = V.dm, W = L.FX1 - L.FX0 + 40, kk = Math.max(0.8, rs), H = L.FY1 + 20, UP = L.FY0 - 10;
    function xs(i) { return x0 + i * ST; }
    function trace(g, E, d) { for (var i = 0; i < NG; i++) g.lineTo(xs(i), E[i] + (d || 0)); }
    function below(g, E, d) { g.beginPath(); g.moveTo(x0, H); trace(g, E, d); g.lineTo(xN, H); g.closePath(); }
    function skyClip(g) { g.beginPath(); g.moveTo(x0, UP); trace(g, CY); g.lineTo(xN, UP); g.closePath(); g.clip(); }
    function crest(g) { g.beginPath(); trace(g, CY); }
    function lump(g, o, k) {                             // Phobos: a potato, nine points around
      var j, a;
      g.beginPath();
      for (j = 0; j < 9; j++) { a = o.a + j / 9 * 6.2832; g[j ? "lineTo" : "moveTo"](o.x + Math.cos(a) * o.r * k * o.p[j] * 1.1, o.y + Math.sin(a) * o.r * k * o.p[j] * 0.94); }
      g.closePath();
    }
    function pits(g) { g.beginPath(); V.pits.forEach(function (p) { g.moveTo(p[0] + p[2], p[1]); g.ellipse(p[0], p[1], p[2], p[3], 0, 0, 6.2832); }); }
    function moons(g, k) { lump(g, ph, k); g.fill(); K.circle(g, dm.x, dm.y, dm.r * k); g.fill(); }
    function meteors(g, hr, f) {                         // a comet fell on every loss: a tail tapering up the sky (f of its length), a bead where it hit
      V.hits.forEach(function (h) {
        var L2 = V.len * (0.8 + 0.4 * h[2]) * f;
        if (f < 1.01) { g.moveTo(h[0] - 0.62 * L2, h[1] - 0.78 * L2); g.lineTo(h[0] + 0.75 * hr, h[1] - 0.6 * hr); g.lineTo(h[0] - 0.75 * hr, h[1] + 0.6 * hr); g.closePath(); }
        else { g.moveTo(h[0] + hr, h[1]); g.arc(h[0], h[1], hr, 0, 6.2832); }
      });
    }
    function comets(g, hr) {                             // the tail steps down in coverage toward its tip, like a halftone fade
      [[1, 0.5], [0.66, 0.6], [0.34, 0.78], [2, 1]].forEach(function (q) { g.beginPath(); meteors(g, hr, q[0]); g.fillStyle = T(q[1]); g.fill(); });
    }
    function craters(g, d) {                             // each a flat ring on the ridge
      g.beginPath();
      V.hits.forEach(function (h) { g.moveTo(h[0] + 12 * kk + d, h[1] + 3 * kk); g.ellipse(h[0], h[1] + 3 * kk, 12 * kk + d, 5 * kk + d * 0.5, 0, 0, 6.2832); });
    }
    function rover(g, k, wd) {                           // a six-wheeled rover on the slope, mast and dish
      var R = V.rover, u = 1.6 * kk, j;
      g.save(); g.translate(R.x, R.y); g.rotate(R.a * 0.9); g.lineWidth = wd; g.lineJoin = "round"; g.lineCap = "round"; g.fillStyle = T(k); g.strokeStyle = T(k);
      g.fillRect(-15 * u, -15 * u, 30 * u, 8 * u);
      g.beginPath(); g.moveTo(-9 * u, -15 * u); g.lineTo(-9 * u, -33 * u); g.moveTo(-12 * u, -33 * u); g.lineTo(-5 * u, -33 * u); g.moveTo(10 * u, -15 * u); g.lineTo(14 * u, -24 * u); g.stroke();
      K.circle(g, 14 * u, -26 * u, 3.4 * u); g.fill();
      for (j = -1; j < 2; j++) { K.circle(g, j * 12 * u, -4.4 * u, 4.6 * u); g.fill(); }
      g.restore();
    }
    var skyLight = function (g) {
      g.save(); skyClip(g);
      if (!night) {
        var gr = g.createRadialGradient(sun.x, sun.y, sun.r * 0.6, sun.x, sun.y, 440 * rs);
        gr.addColorStop(0, T(0.74)); gr.addColorStop(0.3, T(0.4)); gr.addColorStop(0.7, T(0.12)); gr.addColorStop(1, T(0));
        g.fillStyle = gr; g.fillRect(L.FX0 - 10, UP, W, V.F0[0] - UP + 400);
        g.fillStyle = K.vgrad(g, V.top - 70 * vs, V.top + 120 * vs, [[0, 0], [1, 0.46]]); g.fillRect(L.FX0 - 10, V.top - 70 * vs, W, 200 * vs);
        g.fillStyle = T(1); K.circle(g, sun.x, sun.y, sun.r); g.fill();
        K.knockRadial(g, sun.x, sun.y, sun.r * 3.6, 0.7);
        g.fillStyle = T(1); K.circle(g, sun.x, sun.y, sun.r); g.fill();
      } else { g.fillStyle = K.vgrad(g, V.top - 110 * vs, V.top + 50 * vs, [[0, 0], [1, 0.6]]); g.fillRect(L.FX0 - 10, V.top - 110 * vs, W, 200 * vs); }
      g.fillStyle = T(night ? 1 : 0.8); moons(g, 1);
      [V.F0, V.F1].forEach(function (E, k) { K.knock(g, function (g2) { below(g2, E); g2.fill(); }); g.fillStyle = T(0.08 + 0.06 * k); below(g, E); g.fill(); });
      K.knock(g, function (g2) { g2.lineWidth = sw + gap * 2.6; g2.lineJoin = "round"; crest(g2); g2.stroke(); craters(g2, gap); g2.fill(); });
      g.restore();
      g.strokeStyle = T(0.9); g.lineWidth = sw * 0.5; g.lineJoin = "round"; g.lineCap = "round"; crest(g); g.stroke();   // the crest and the comets white-hot where this ink lies over the line
      g.beginPath(); meteors(g, 7.6 * kk, 2); g.fillStyle = T(1); g.fill(); rover(g, 0.9, 1.6 * kk);
    };
    var skyAqua = function (g) {
      g.save(); skyClip(g);
      if (night) { g.fillStyle = T(0.95); for (var j = 0; j < V.stars.length; j += 4) { K.circle(g, V.stars[j], V.stars[j + 1], V.stars[j + 2] * (V.stars[j + 3] ? 1.6 : 1)); g.fill(); } g.fillStyle = K.vgrad(g, V.top - 90 * vs, V.top + 40 * vs, [[0, 0], [1, 0.42]]); g.fillRect(L.FX0 - 10, V.top - 90 * vs, W, 160 * vs); }
      else {                                             // the Martian sunset: a blue halo around the sun, a clear ring between
        var gh = g.createRadialGradient(sun.x, sun.y, sun.r * 1.1, sun.x, sun.y, sun.r * 3.6);
        gh.addColorStop(0, T(0.9)); gh.addColorStop(0.35, T(0.5)); gh.addColorStop(0.7, T(0.18)); gh.addColorStop(1, T(0));
        g.fillStyle = gh; g.fillRect(L.FX0 - 10, UP, W, V.F0[0] - UP + 400);
      }
      g.fillStyle = T(night ? 0.55 : 0.5); moons(g, 1);
      [V.F0, V.F1].forEach(function (E, k) {
        K.knock(g, function (g2) { below(g2, E); g2.fill(); });
        g.fillStyle = K.vgrad(g, V.top, V.top + 140 * vs, night ? [[0, 0.1 + 0.06 * k], [1, 0.03 + 0.04 * k]] : [[0, 0.34 + 0.18 * k], [1, 0.12 + 0.1 * k]]); below(g, E); g.fill();
      });
      K.knock(g, function (g2) { g2.lineWidth = sw + gap * 2.6; g2.lineJoin = "round"; crest(g2); g2.stroke(); craters(g2, gap); g2.fill(); });
      g.restore();
    };
    var skyKey = function (g) {
      g.save(); skyClip(g);
      g.fillStyle = K.vgrad(g, L.FY0, V.top + 60 * vs, pal.top); g.fillRect(L.FX0 - 10, UP, W, V.top + 60 * vs - UP);
      if (!night) K.knockRadial(g, sun.x, sun.y, 380 * rs, 0.9);
      K.knock(g, function (g2) { K.circle(g2, sun.x, sun.y, sun.r * 1.1); g2.fill(); moons(g2, 1.12); });
      [V.F0, V.F1].forEach(function (E, k) { g.fillStyle = T(night ? [0.08, 0.1][k] : [0.22, 0.2][k]); below(g, E); g.fill(); });
      g.restore();
    };
    // the ground: strata that follow the record, the crest lit (the light ink) and the foot in shadow (magenta)
    function lanes(g, w) {                               // the rover's tread, two dashed lanes along the crest
      g.lineWidth = w; g.setLineDash([5 * kk, 6 * kk]); g.lineCap = "butt";
      [8, 14].forEach(function (d) { g.beginPath(); for (var i = 0; i < NG; i++) if (xs(i) > L.X0 + 4 && xs(i) < V.rover.x - 18 * kk) g.lineTo(xs(i), CY[i] + d * vs); g.stroke(); });
      g.setLineDash([]);
    }
    function strata(g, cv) {
      var k, i;
      for (k = 0; k < BD.length; k++) {
        g.fillStyle = T(cv[k]); g.beginPath();
        for (i = 0; i < NG; i++) g.lineTo(xs(i), CY[i] + BD[k] * vs + (k ? gap : 0));
        for (i = NG - 1; i >= 0; i--) g.lineTo(xs(i), k < BD.length - 1 ? CY[i] + BD[k + 1] * vs : H);
        g.closePath(); g.fill();
      }
    }
    var landLight = function (g) {
      strata(g, LC); K.knock(g, function (g2) { craters(g2, 0); g2.fill(); pits(g2); g2.fill(); lanes(g2, 6.4 * kk); });
      g.strokeStyle = T(0.85); g.lineWidth = 3.2 * kk; g.lineCap = "round"; g.beginPath();                      // each plain crater's far wall lit
      V.pits.forEach(function (p) { g.moveTo(p[0] - p[2], p[1]); g.ellipse(p[0], p[1], p[2], p[3], 0, Math.PI, 6.2832); }); g.stroke();
    };
    var landKey = function (g) { strata(g, KC); K.knock(g, function (g2) { craters(g2, 0); g2.fill(); g2.globalAlpha = 0.7; pits(g2); g2.fill(); g2.globalAlpha = 1; lanes(g2, 6.4 * kk); }); };
    var line = function (g) {                            // the crest, the comets and their craters, the rover's tread, the rover
      g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = T(1); g.lineWidth = sw; crest(g); g.stroke();
      comets(g, 7.6 * kk);
      g.strokeStyle = T(0.95); g.lineWidth = 1.7 * kk; craters(g, 0); g.stroke();
      g.strokeStyle = T(0.9); lanes(g, 3.2 * kk); rover(g, 1, 2 * kk);
    };
    return [
      { ink: "light", role: "sky", draw: skyLight }, { ink: "pink", role: "sky", draw: skyAqua }, { ink: "blue", role: "sky", draw: skyKey },
      { ink: "light", role: "land", draw: landLight }, { ink: "blue", role: "land", draw: landKey }, { ink: "pink", role: "line", draw: line }
    ];
  }

  function body(g, D, L) {
    var V = D.mr, i;
    g.moveTo(V.x0, L.FY1 + 10);
    for (i = 0; i < V.NG; i++) g.lineTo(V.x0 + i * V.st, V.CY[i]);
    g.lineTo(V.x0 + (V.NG - 1) * V.st, L.FY1 + 10); g.closePath();
  }

  A.add("scene", "mars", {
    name: "Red Planet",
    by: "The record is a ridge on Mars: a rover has driven its crest, a meteor and a crater for every loss, a blue sunset, Phobos and Deimos.",
    lights: ["golden", "dusk", "night"],
    derive: derive, layers: layers, body: body
  });
})();
