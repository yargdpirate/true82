/* ---------- TRUE 82 ART: GLACIER (a scene for the results print) ----------
   The season as the face of a glacier: the ice cliff's top is the record (a high year stands tall, a bad one has
   calved to the waterline), cut by crevasses and blocky seracs. Every loss is a calving: a square bite out of the
   edge and an iceberg adrift in the sea under it. A low midnight sun wears a halo ring and sun dogs and lays a
   glitter path. Rules: art/CONTRACT.md ("A scene"). Tone only: black at an alpha is coverage, never a color. */
(function () {
  "use strict";
  var A = typeof window !== "undefined" ? window.T82ART : null;
  if (!A || typeof A.add !== "function") return;
  var ST = 3, PI = Math.PI;
  var LOOK = { golden: { sr: 96 }, dusk: { sr: 110 }, night: { sr: 62, top: [[0, 0.52], [0.55, 0.34], [1, 0.14]], band: [[0, 0], [1, 0.2]] } };
  var BERG = [[-1.5, 0], [-1.2, -0.9], [-0.3, -1.3], [0.3, -0.95], [0.9, -1.2], [1.5, 0]];

  function derive(K, D, L) {
    var m = D.m, WL = L.WL, vs = L.vs, rs = L.rs, SC = L.SC, c = K.clamp, i, j, k, x, y, b, hi = 0, lo = 0;
    var r = K.rand((D.seed * 2654435761 + 133) >>> 0), FW = L.FX1 - L.FX0, gw = Math.max(0.7, rs), sv = Math.max(0.7, vs);
    for (i = 0; i <= 82; i++) { hi = Math.max(hi, m[i]); lo = Math.min(lo, m[i]); }
    var base = 34 * vs, amp = Math.min(1.3, hi > 0 ? (WL - base - L.FY0 - 114 * vs) / (SC * hi) : 9, lo < 0 ? (L.FY1 - WL + base - 4 * vs) / (SC * -lo) : 9);
    function lin(u) { u = c(u, 0, 82); var k = Math.min(81, Math.floor(u)); return m[k] + (m[k + 1] - m[k]) * (u - k); }
    function tr(x) { var u = (x - L.X0) / (L.X1 - L.X0) * 82, s = 0, q; for (q = -2; q <= 2; q++) s += lin(u + q * 0.8); return s / 5; }
    // crevasses split the face into leaning blocks, each corner a little higher or lower; some corners carry a serac
    var x0 = L.FX0 - 12, N = Math.ceil((L.FX1 + 12 - x0) / ST) + 1, Ry = [], Q = [], Sp = [];
    for (x = L.FX0 - 30; x < L.FX1 + 40; x += (26 + 34 * r()) * (0.6 + 0.5 * rs)) {
      Q.push([x, (r() - 0.5) * 18 * vs]);
      if (r() < 0.28) Sp.push([x + (r() - 0.5) * 10, (12 + 18 * r()) * vs, (12 + 10 * r()) * gw]);
    }
    function tooth(u, w) { return u < 0 ? c(1 + u / 3, 0, 1) : c(1 - u / w, 0, 1); }    // a sheer edge, then a ramp of length w
    function jit(x) { for (var q = 1; q < Q.length; q++) if (x <= Q[q][0]) return Q[q - 1][1] + (Q[q][1] - Q[q - 1][1]) * (x - Q[q - 1][0]) / (Q[q][0] - Q[q - 1][0]); return 0; }
    // every loss calves a square bite out of the top edge
    var lbs = D.losses.map(function (g) { return [D.X(g + 0.5), (28 + 22 * r()) * sv * c(1.35 - D.losses.length * 0.016, 0.45, 1), (9 + 7 * r()) * Math.max(0.85, rs)]; });
    for (i = 0; i < N; i++) {
      x = x0 + i * ST; y = 0; b = 0;
      for (j = 0; j < Sp.length; j++) y = Math.max(y, Sp[j][1] * tooth(Sp[j][0] - x, Sp[j][2]));
      for (j = 0; j < lbs.length; j++) b = Math.max(b, lbs[j][1] * tooth(x - lbs[j][0] + lbs[j][2], lbs[j][2] * 2));
      Ry.push(Math.max(WL - base - SC * amp * tr(x) - jit(x) - y + b, L.FY0 + 8 * vs));
    }
    function ry(x) { var u = c((x - x0) / ST, 0, N - 1.001), k = Math.floor(u); return Ry[k] + (Ry[k + 1] - Ry[k]) * (u - k); }
    var top = 1e9; for (i = 0; i < N; i++) top = Math.min(top, Ry[i]);
    // the sun: right of centre, low, half behind the ice (or just above the sea)
    var sr = LOOK[D.pal.key].sr * rs, sx = L.FX0 + FW * (0.62 + 0.2 * r()), sy = Math.max(L.FY0 + sr * 1.05 + 4 * vs, Math.min(ry(sx) - 0.1 * sr, WL - 0.62 * sr));
    // crevasses run down from some corners; striations between them
    var G = [], T = [];
    for (j = 1; j < Q.length - 1; j++) if (Q[j][0] > L.FX0 && Q[j][0] < L.FX1) G.push([Q[j][0], ry(Q[j][0]), (r() - 0.5) * 0.3]);
    for (i = 0, k = Math.round(44 * FW / 920); i < k; i++) { x = L.FX0 + r() * FW; T.push([x, ry(x) + 3 * vs, 0.2 + 0.7 * r(), (r() - 0.5) * 0.2, (2 + 2.4 * r()) * gw]); }
    // the icebergs: one under every loss's bite, nearer ones lower and bigger
    var bk = c(1.3 - lbs.length * 0.016, 0.75, 1.3), bergs = lbs.map(function (q) {
      var t = 0.1 + 0.8 * r(), s = Math.max(7, (22 + 12 * r()) * Math.max(0.62, rs) * (0.6 + 0.9 * t) * bk);
      return { x: q[0] + (r() - 0.5) * 6, y: WL + t * (L.FY1 - WL) * 0.8 + 3, s: s, f: r() < 0.5 ? -1 : 1, h: 0.8 + 0.6 * r(), t: t };
    });
    bergs.sort(function (a, b) { return a.t - b.t; });
    var far = [], chips = [];
    for (i = 0, k = Math.round(8 * FW / 920); i < k; i++) far.push([L.FX0 + (i + 0.2 + 0.6 * r()) * FW / k, (40 + 70 * r()) * gw, (16 + 30 * r()) * vs, 0.7 + 0.25 * r()]);
    for (x = L.FX0; x < L.FX1; x += (3 + 5 * r()) * gw) chips.push([x, WL + (r() * r() * 12 + 1) * vs, (6 + 12 * r()) * gw, (1.8 + 1.8 * r()) * Math.max(0.7, vs)]);
    D.gl = { far: far, chips: chips, Q: Q, x0: x0, N: N, Ry: Ry, top: top, sun: { x: sx, y: sy, r: sr }, G: G, T: T, bergs: bergs };
  }

  function layers(K, P, D, L) {
    var Z = D.gl, Ry = Z.Ry, N = Z.N, T = K.tone, WL = L.WL, vs = L.vs, rs = L.rs, pal = D.pal, night = pal.key === "night", R = LOOK[pal.key], sun = Z.sun;
    var xa = Z.x0, xb = Z.x0 + (N - 1) * ST, lw = 8 * Math.max(0.72, rs), FW = L.FX1 - L.FX0, hh = L.FY1 + 12 - WL, gw = Math.max(0.7, rs), mv = Math.max(0.7, vs);
    function xs(i) { return Z.x0 + i * ST; }
    function under(g) { var i; g.beginPath(); g.moveTo(xa, WL); for (i = 0; i < N; i++) g.lineTo(xs(i), Math.min(Ry[i], WL)); g.lineTo(xb, WL); g.closePath(); }
    function ridge(g, only) { var i, on = false; g.beginPath(); for (i = 0; i < N; i++) { if ((Ry[i] <= WL) === only) { g[on ? "lineTo" : "moveTo"](xs(i), Ry[i]); on = true; } else on = false; } }
    function flat(g, a, b) { g.fillRect(L.FX0, a, FW, b - a); }
    function disc(g, k) { K.circle(g, sun.x, sun.y, sun.r * k); }
    function cuts(g, wd) {                                  // crevasses and striations: dark lines down the face
      g.beginPath();
      Z.G.forEach(function (q) { var h = (WL - q[1]) * 0.66; if (q[1] < WL - 4) { g.moveTo(q[0] - wd, q[1]); g.lineTo(q[0] + wd, q[1]); g.lineTo(q[0] + q[2] * h, q[1] + h); g.closePath(); } });
      g.fill();
      Z.T.forEach(function (q) {
        var h = (WL - q[1]) * q[2];
        if (q[1] > WL - 8 * vs || h < 6 * vs) return;
        g.beginPath(); g.moveTo(q[0] - q[4] / 2, q[1]); g.lineTo(q[0] + q[4] / 2, q[1]); g.lineTo(q[0] + q[3] * h, q[1] + h); g.closePath(); g.fill();
      });
    }
    function berg(g, b, k, up) {                            // k: a polygon scale; up false draws the underwater half
      g.beginPath();
      BERG.forEach(function (p, i) { var px = b.x + p[0] * b.s * b.f * k, py = b.y + (up ? p[1] * b.h : -p[1] * b.h * 1.5) * b.s * k; g[i ? "lineTo" : "moveTo"](px, py); });
      g.closePath();
    }
    function bshade(g, b) {                                 // the berg's face turned from the sun
      var q = (sun.x > b.x ? 1 : -1) * b.f > 0 ? [[-1.5, 0], [-1.2, -0.9], [-0.3, -1.3], [-0.1, 0]] : [[-0.1, 0], [-0.3, -1.3], [0.3, -0.95], [0.9, -1.2], [1.5, 0]];
      g.beginPath();
      q.forEach(function (p, i) { g[i ? "lineTo" : "moveTo"](b.x + p[0] * b.s * b.f, b.y + p[1] * b.h * b.s); });
      g.closePath();
    }
    function blocks(g, fn) {                                // each block of the face between two crevasses: fn(g, its own tone offset, its top)
      var j, i, q = Z.Q, y0;
      for (j = 0; j + 1 < q.length; j++) {
        g.beginPath(); g.moveTo(q[j][0], WL); y0 = WL;
        for (i = 0; i < N; i++) if (xs(i) >= q[j][0] && xs(i) <= q[j + 1][0]) { g.lineTo(xs(i), Math.min(Ry[i], WL)); y0 = Math.min(y0, Ry[i]); }
        g.lineTo(q[j + 1][0], WL); g.closePath(); if (y0 < WL - 2) fn(g, ((j * 7919) % 13) / 13, y0);
      }
    }
    function chips(g, t) { g.fillStyle = T(t); Z.chips.forEach(function (q) { K.ellipse(g, q[0], q[1], q[2] / 2, q[3] / 2); g.fill(); }); }
    function bergs(g, up, fn) { Z.bergs.forEach(function (b) { berg(g, b, 1, up); K.knock(g, function (g2) { g2.fill(); }); fn(g, b); }); }
    function sky(fn) {
      return function (g) {
        var i; g.save(); g.beginPath(); g.moveTo(xa, L.FY0 - 10); for (i = 0; i < N; i++) g.lineTo(xs(i), Math.min(Ry[i], WL)); g.lineTo(xb, L.FY0 - 10); g.closePath(); g.clip();
        fn(g);
        K.knock(g, function (g2) { g2.lineWidth = lw * 2.7; g2.lineJoin = "round"; ridge(g2, true); g2.stroke(); });
        g.restore();
      };
    }
    function tables(g) { g.beginPath(); Z.far.forEach(function (q) { g.moveTo(q[0] - q[1], WL + 2); g.lineTo(q[0] - q[1] * 0.8, WL - q[2]); g.lineTo(q[0] + q[1] * q[3], WL - q[2] * 0.85); g.lineTo(q[0] + q[1], WL + 2); g.closePath(); }); }
    function ring(g, k, wd) { g.lineWidth = wd; disc(g, k); g.stroke(); }
    var skyLight = sky(function (g) {
      var gr = g.createRadialGradient(sun.x, sun.y, sun.r * 0.5, sun.x, sun.y, 480 * rs);
      gr.addColorStop(0, T(0.7)); gr.addColorStop(0.35, T(0.34)); gr.addColorStop(0.7, T(0.1)); gr.addColorStop(1, T(0));
      g.fillStyle = gr; flat(g, L.FY0, WL);
      g.fillStyle = K.vgrad(g, WL - 190 * vs, WL, [[0, 0], [1, 0.42]]); flat(g, WL - 190 * vs, WL);
      g.fillStyle = K.vgrad(g, sun.y - 260 * vs, sun.y, [[0, 0], [1, 0.34]]); g.fillRect(sun.x - 9 * gw, sun.y - 260 * vs, 18 * gw, 260 * vs);
      g.strokeStyle = T(0.8); ring(g, 1.85, 6 * gw);
      g.fillStyle = T(0.95); [-1, 1].forEach(function (s) { K.ellipse(g, sun.x + s * sun.r * 1.85, sun.y, 17 * gw, 9 * gw); g.fill(); });
      g.fillStyle = T(0.96); disc(g, 1); g.fill();
      K.knock(g, function (g2) { g2.globalAlpha = 0.8; tables(g2); g2.fill(); });
    });
    var skyAqua = sky(function (g) {
      g.fillStyle = K.vgrad(g, L.FY0, WL, R.band || pal.band); flat(g, L.FY0, WL);
      g.strokeStyle = T(0.55); ring(g, 2.12, 4.4 * gw);
      if (night) { g.fillStyle = T(0.82); disc(g, 0.98); g.fill(); }
      else K.knock(g, function (g2) { disc(g2, 1.06); g2.fill(); });
      K.knock(g, function (g2) { g2.globalAlpha = 0.85; tables(g2); g2.fill(); });
      g.fillStyle = T(0.9); [-1, 1].forEach(function (s) { K.ellipse(g, sun.x + s * sun.r * 1.85, sun.y, 13 * gw, 7 * gw); g.fill(); });
    });
    var skyKey = sky(function (g) {
      g.fillStyle = K.vgrad(g, L.FY0, WL, R.top || pal.top); flat(g, L.FY0, WL);
      K.knock(g, function (g2) { disc(g2, 1.0); g2.fill(); tables(g2); g2.fill(); });
      tables(g); g.fillStyle = T(0.5); g.fill();
    });
    // the land: the wall above the waterline, the sea below with its reflection, glitter and bergs
    function sea(g, fn) { g.save(); g.beginPath(); g.rect(xa, WL, xb - xa, hh); g.clip(); fn(g); g.restore(); }
    function ripples(g, a) {
      var r = K.rand(D.seed + 11), x, y, rx;
      K.knock(g, function (g2) { for (y = WL + 6 * vs; y < L.FY1; y += (6 + 0.14 * (y - WL)) * mv) for (x = xa + r() * 70; x < xb; x += 50 + r() * 130) { rx = 20 + r() * 70; g2.globalAlpha = a; K.ellipse(g2, x, y, rx * rs + 6, (1.2 + 0.016 * (y - WL)) * Math.max(0.8, vs) + 0.5); g2.fill(); } });
    }
    function mirror(g) { var i; g.beginPath(); g.moveTo(xa, WL); for (i = 0; i < N; i++) g.lineTo(xs(i), WL + (WL - Math.min(Ry[i], WL)) * 0.6); g.lineTo(xb, WL); g.closePath(); }
    var landAqua = function (g) {
      g.save(); under(g); g.clip();
      blocks(g, function (g3, h, y0) { g3.fillStyle = K.vgrad(g3, y0, WL, [[0, 0.7 + 0.22 * h], [0.6, 0.5], [1, 0.26]]); g3.fill(); });
      K.knock(g, function (g2) { cuts(g2, 2 + 1.6 * rs); }); g.restore();
      sea(g, function (g) {
        g.fillStyle = K.vgrad(g, WL, L.FY1, [[0, 0.4], [1, 0.1]]); flat(g, WL, L.FY1 + 12);
        K.knock(g, function (g2) { g2.globalAlpha = 0.5; mirror(g2); g2.fill(); });
        ripples(g, 0.6);
        bergs(g, false, function (g, b) { berg(g, b, 1, false); g.fillStyle = T(0.3); g.fill(); });
        bergs(g, true, function (g, b) { berg(g, b, 1, true); g.fillStyle = T(0.85); g.fill(); K.knock(g, function (g2) { g2.globalAlpha = 0.55; bshade(g2, b); g2.fill(); }); });
        chips(g, 0.9);
      });
    };
    var landLight = function (g) {
      g.save(); under(g); g.clip();
      blocks(g, function (g3, h, y0) { g3.fillStyle = K.vgrad(g3, y0, WL, [[0, 0.7], [0.5, 0.26], [1, 0.03]]); g3.fill(); });
      K.knock(g, function (g2) { cuts(g2, 2 + 1.6 * rs); }); g.restore();
      g.strokeStyle = T(0.9); g.lineWidth = lw * 1.8; g.lineJoin = "round"; g.lineCap = "round"; ridge(g, true); g.stroke();
      sea(g, function (g) {
        var y, r = K.rand(D.seed + 17), w;
        g.fillStyle = T(0.92);
        for (y = WL + 4 * vs; y < L.FY1; y += (4 + 0.1 * (y - WL)) * mv) { w = sun.r * 1.5 * (1 - (y - WL) / (L.FY1 - WL) * 0.5) * (0.4 + r() * 0.7); g.fillRect(sun.x - w / 2 + (r() - 0.5) * 12, y, w, (1.4 + 0.02 * (y - WL)) * Math.max(0.8, vs) + 0.6); }
        bergs(g, true, function (g, b) { berg(g, b, 0.92, true); g.fillStyle = T(0.8); g.fill(); K.knock(g, function (g2) { bshade(g2, b); g2.fill(); }); });
        chips(g, 0.9);
      });
    };
    var landKey = function (g) {
      g.save(); under(g); g.clip();
      blocks(g, function (g3, h, y0) { g3.fillStyle = K.vgrad(g3, y0, WL, [[0, 0], [0.5, 0.04], [1, 0.6]]); g3.fill(); });
      K.knock(g, function (g2) { cuts(g2, 2 + 1.6 * rs); }); g.restore();
      sea(g, function (g) {
        g.fillStyle = K.vgrad(g, WL, L.FY1, [[0, 0.12], [1, 0.52]]); flat(g, WL, L.FY1 + 12);
        mirror(g); g.fillStyle = T(0.35); g.fill();
        ripples(g, 0.7);
        bergs(g, false, function (g, b) { berg(g, b, 1, false); g.fillStyle = T(0.6); g.fill(); });
        bergs(g, true, function (g, b) { berg(g, b, 1, true); g.fillStyle = T(0.3); g.fill(); bshade(g, b); g.fillStyle = T(0.75); g.fill(); });
      });
    };
    // the season's line: the cliff's edge, white-hot, a half-ink thread where it has calved under the sea
    var line = function (g) {
      g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = T(1); g.lineWidth = lw; ridge(g, true); g.stroke();
      g.strokeStyle = T(0.9); g.lineWidth = lw * 0.8; ridge(g, false); g.stroke();
    };
    return [
      { ink: "light", role: "sky", draw: skyLight }, { ink: "pink", role: "sky", draw: skyAqua }, { ink: "blue", role: "sky", draw: skyKey },
      { ink: "light", role: "land", draw: landLight }, { ink: "pink", role: "land", draw: landAqua }, { ink: "blue", role: "land", draw: landKey },
      { ink: "pink", role: "line", draw: line }
    ];
  }

  function body(g, D, L) {
    var Z = D.gl, i;
    g.moveTo(Z.x0, L.FY1 + 10);
    for (i = 0; i < Z.N; i++) g.lineTo(Z.x0 + i * ST, Math.min(Z.Ry[i], L.WL));
    g.lineTo(Z.x0 + (Z.N - 1) * ST, L.FY1 + 10); g.closePath();
  }

  A.add("scene", "glacier", {
    name: "Glacier",
    by: "The face of a glacier: the ice cliff is the record, every loss a square bite calved from the edge and an iceberg adrift, under a low midnight sun with a halo.",
    lights: ["golden", "dusk", "night"],
    derive: derive, layers: layers, body: body
  });
})();
