/* ---------- TRUE 82 ART: SKYLINE (a scene for the results print) ----------
   The season as a city on the water: the waterline is .500 and the roofline is the record, so a winning year
   towers and a losing stretch sinks. A tower stands on the best night, windows are lit where the team won,
   every loss is a warning light on the roof, and the city doubles in the water under the painting's sun, dusk
   or moon. Rules: art/CONTRACT.md ("A scene"). Tone only: black at an alpha is coverage, never a color. */
(function () {
  "use strict";
  var A = typeof window !== "undefined" ? window.T82ART : null;
  if (!A || typeof A.add !== "function") return;

  // per painting: the faces [blue, pink] (dim at night so the windows glow); a window's odds, over a win and a loss
  var LOOK = { golden: { face: [0.74, 0.14], lit: [0.58, 0.06] }, dusk: { face: [0.8, 0.18], lit: [0.64, 0.08] }, night: { face: [0.32, 0.14], lit: [0.7, 0.1] } };
  var KR = 0.8;                                          // a reflection's depth for a building's height

  function derive(K, D, L) {
    var r = K.rand((D.seed * 2654435761 + 82) >>> 0), WL = L.WL, vs = L.vs, rs = L.rs, m = D.m, G = D.games;
    var gw = (L.X1 - L.X0) / 82, B = [], pts = [], wins = [], rip = [], far = [], a, b, x, y, j;
    var spire = 40 * vs + 10, hi = 0, lo = 0;
    for (a = 0; a <= 82; a++) { hi = Math.max(hi, m[a]); lo = Math.min(lo, m[a]); }
    // the record's scale: up to 1.8x the lake's, as tall as the frame allows, so a .500 year still reads as a city
    var amp = Math.min(1.8, hi > 0 ? (WL - L.FY0 - spire - 14) / (L.SC * hi) : 9, lo < 0 ? (L.FY1 - WL - 8 * vs) / (L.SC * -lo) : 9);
    function sn(v) { return Math.round(v * K.k) / K.k; }   // on the device pixel grid: windows print crisp
    function rec(a, b) { for (var s = m[a], j = a; j <= b; j++) s = Math.max(s, m[j]); return WL - L.SC * amp * s; }   // a block's best
    function add(x0, x1, top, lot) { B.push({ x0: sn(x0), x1: sn(x1), top: top, lot: lot, f: r(), kind: "flat" }); }
    // the shores, and the season's blocks (1 to 4 games): most stand at the record, some a story or two short
    add(L.FX0 - 10, L.X0 - 22, WL - (6 + r() * 8) * vs);
    add(L.X0 - 22, L.X0, WL - (12 + r() * 12) * vs);
    for (a = 0; a < 82; a = b) {
      b = Math.min(82, a + [1, 2, 2, 3, 3, 3, 4][Math.floor(r() * 7)]);
      if (b === 81) b = 82;
      y = rec(a, b); x = r();
      add(D.X(a), D.X(b), (b - a < 2 || y > WL || x < 0.55 ? y : WL - (WL - y) * (x < 0.8 ? 0.9 : 0.8)) + r() * 2 * vs, [a, b]);
    }
    add(L.X1, L.X1 + 24, Math.min(WL - 10 * vs, rec(80, 82) + 8 * vs));
    add(L.X1 + 24, L.FX1 + 10, WL - (8 + r() * 10) * vs);
    // the tower on the season's best night (in a year never above .500, opening night: a lighthouse)
    var tw = null;
    B.forEach(function (bl) { if (!tw && bl.lot && bl.lot[0] <= D.peak && D.peak <= bl.lot[1]) tw = bl; });
    tw.kind = "tower"; tw.top = Math.min(WL - L.SC * amp * m[D.peak], tw.top, WL - 30 * vs);
    // setbacks, deco steps, crowns: only on tall blocks above both neighbors (elsewhere they cut slots in the
    // roofline); a roof is a profile of [inset, drop], mirrored
    B.forEach(function (bl, i) {
      var t = bl.top = Math.min(bl.top, L.FY1 - 3 * vs), w = bl.x1 - bl.x0, h = WL - t, c = K.clamp(h * 0.16, 4 * vs, 24 * vs), in1, st;
      if (bl.kind === "flat" && i > 0 && i < B.length - 1 && t < B[i - 1].top - c && t < B[i + 1].top - c && h > 22 * vs && w > 1.5 * gw)
        bl.kind = bl.f < 0.25 ? "flat" : bl.f < 0.55 ? "setback" : bl.f < 0.8 ? "deco" : "crown";
      if (bl.kind === "tower") { c = K.clamp(h * 0.3, 6 * vs, 40 * vs); in1 = sn(w * 0.24); }
      else if (bl.kind === "crown") { c *= 0.6; in1 = sn(w * 0.3); }
      else in1 = sn(w * (bl.kind === "deco" ? 0.14 : 0.16 + bl.f * 0.12));
      st = bl.kind === "flat" ? [[0, 0]] : bl.kind === "deco" ? [[0, 2 * c], [in1, 2 * c], [in1, c], [2 * in1, c], [2 * in1, 0]] : [[0, c], [in1, c], [in1, 0]];
      bl.p0 = pts.length; bl.body = t + st[0][1];
      for (j = 0; j < st.length; j++) pts.push(bl.x0 + st[j][0], t + st[j][1]);
      for (j = st.length - 1; j >= 0; j--) pts.push(bl.x1 - st[j][0], t + st[j][1]);
      bl.p1 = pts.length;
    });
    D.tip = { x: (tw.x0 + tw.x1) / 2, y: tw.top - spire, base: tw.top, w: Math.min((tw.x1 - tw.x0) * 0.5, 10 * rs + 4) };
    // every loss: a warning light on the roof over its game (a dim one on a drowned roof)
    var lr = 4.4 * Math.max(0.8, rs), beacons = D.losses.map(function (gi) {
      var lx = D.X(gi + 0.5), ly = roofAt(pts, lx);
      return ly > WL ? [lx, ly, 0] : [lx, ly - lr - 2 * Math.max(0.72, rs), 1];
    });
    // windows: each column lit by the game under it, mostly lit over a win, mostly dark over a loss
    var ww = sn(4.2 * rs + 1.1), wh = sn(5.2 * rs + 1.3), px = sn(ww + 2.6 * rs + 1.1), py = sn(wh + 2.8 * rs + 1.2), R = LOOK[D.pal.key];
    B.forEach(function (bl) {
      var sunk = bl.top > WL, w = bl.x1 - bl.x0, n = Math.floor((w - 2.4 * rs + px - ww) / px), x0 = bl.x0 + sn((w - n * px + px - ww) / 2), c, gi, p;
      for (c = 0; c < n; c++) {
        x = x0 + c * px; gi = K.clamp(Math.floor((x + ww / 2 - L.X0) / gw), 0, 81);
        p = !bl.lot ? 0.3 * D.wp : G ? R.lit[G[gi] ? 0 : 1] : R.lit[1] + (R.lit[0] - R.lit[1]) * D.wp;
        for (y = sn((sunk ? bl.top : bl.body) + py * 0.7); y + wh < (sunk ? L.FY1 : WL - 2.5 * vs); y += py) wins.push(x, y, sunk ? 0 : r() < p ? 0.7 + r() * 0.3 : 0);
      }
    });
    // ripples: broken scanlines across the water, closer together near the shore
    for (y = WL + 2 * vs; y < L.FY1; y += (2.6 + 5 * (y - WL) / (L.FY1 - WL)) * Math.max(0.7, vs) * (0.7 + r() * 0.6)) {
      for (x = L.FX0 - 10 + r() * 60; x < L.FX1; x += 30 + r() * 120) rip.push(x, y, 20 + r() * 150, (0.6 + r() * 0.9) * Math.max(0.75, vs), 0.35 + r() * 0.5);
    }
    var nf = K.noise1D(D.seed + 31);
    for (x = L.FX0 - 10; x < L.FX1 + 10; x += b) {
      b = (18 + r() * 34) * rs;
      y = WL - (40 + 80 * K.clamp(0.5 + K.fbm(nf, x * 0.005, 3), 0, 1) + r() * 56) * vs * (D.pal.key === "night" ? 1 : 0.3 + 0.7 * K.smooth(D.sr * 0.8, D.sr * 2.6, Math.abs(x - D.sx)));
      far.push(sn(x), y, r() < 0.15 ? 1 : 0);
    }
    D.city = { B: B, pts: pts, beacons: beacons, lr: lr, wins: wins, ww: ww, wh: wh, gap: 1.3 / K.k, rip: rip, far: far, R: R };
  }

  function layers(K, P, D, L) {
    var C = D.city, R = C.R, pal = D.pal, night = pal.key === "night", WL = L.WL, vs = L.vs, rs = L.rs, tone = K.tone;
    var Q = C.pts, x0 = L.FX0 - 10, x1 = L.FX1 + 10, dep = L.FY1 - WL, sw = 4 * Math.max(0.72, rs), s = D.tip;
    function trace(g, f) { for (var j = 0; j < Q.length; j += 2) g.lineTo(Q[j], f(Q[j + 1])); }
    function up(y) { return Math.min(y, WL); }
    function down(y) { return WL + (WL - Math.min(y, WL)) * KR; }
    function fill(g, t) { g.fillStyle = tone(t); g.fill(); }
    function skyRect(g) { g.fillRect(L.FX0, L.FY0, L.FX1 - L.FX0, WL - L.FY0); }
    function band(g, h, t) { g.fillStyle = K.vgrad(g, WL - h * vs, WL, [[0, 0], [1, t]]); g.fillRect(L.FX0, WL - h * vs, L.FX1 - L.FX0, h * vs); }
    // a sky layer: above the roofs, the far city, a dark keyline so the season's line prints clean on any sky
    function sky(k, fn) {
      return function (g) {
        g.beginPath(); g.moveTo(x0, L.FY0 - 10); g.lineTo(x0, WL); trace(g, up); g.lineTo(x1, WL); g.lineTo(x1, L.FY0 - 10); g.closePath(); g.clip();
        fn(g); farCity(g, k);
        K.knock(g, function (g2) {
          g2.lineWidth = sw * 2.6; g2.lineJoin = "miter"; g2.beginPath(); g2.moveTo(x0, WL); trace(g2, up); g2.lineTo(x1, WL); g2.stroke();
          C.beacons.forEach(function (b) { if (b[2]) { K.circle(g2, b[0], b[1], C.lr * 1.9); g2.fill(); } });
        });
      };
    }
    // the far city (k: 0 light, 1 pink, 2 blue): low where the sun sets, knocked out of the sky, printed back flat
    function farCity(g, k) {
      var F = C.far, j, t = [0, night ? 0.1 : 0.12, 0.3][k];
      g.beginPath(); g.moveTo(x0, WL);
      for (j = 0; j < F.length; j += 3) {
        var nx = j + 3 < F.length ? F[j + 3] : x1, y = Math.min(F[j + 1], WL), mx = (F[j] + nx) / 2;
        g.lineTo(F[j], y);
        if (F[j + 2]) { g.lineTo(mx - 2 * rs, y); g.lineTo(mx, y - 26 * vs); g.lineTo(mx + 2 * rs, y); }
        g.lineTo(nx, y);
      }
      g.lineTo(x1, WL); g.closePath();
      K.knock(g, function (g2) { g2.fill(); });
      if (t) fill(g, t);
    }
    // the buildings above water, alleys and windows knocked out
    function faces(g, k) {
      C.B.forEach(function (bl) {
        if (bl.top >= WL) return;
        g.beginPath(); g.moveTo(bl.x0, WL);
        for (var j = bl.p0; j < bl.p1; j += 2) g.lineTo(Q[j], up(Q[j + 1]));
        g.lineTo(bl.x1, WL); g.closePath();
        fill(g, k * (0.84 + bl.f * 0.3));
      });
      K.knock(g, function (g2) { C.B.forEach(function (bl) { if (bl.top < WL) g2.fillRect(bl.x0 - C.gap / 2, bl.body, C.gap, WL - bl.body); }); });
      K.knock(g, function (g2) { windows(g2, 1, 0.55); });
    }
    function windows(g, lit, dark) {
      for (var W = C.wins, j = 0; j < W.length; j += 3) {
        var a = W[j + 2] ? lit * W[j + 2] : dark;
        if (a > 0) { g.globalAlpha = a; g.fillRect(W[j], W[j + 1], C.ww, C.wh); }
      }
      g.globalAlpha = 1;
    }
    // drowned blocks
    function sunk(g, t) { C.B.forEach(function (bl) { if (bl.top > WL) { g.fillStyle = tone(t * (0.8 + bl.f * 0.4)); g.fillRect(bl.x0 + C.gap / 2, bl.top, bl.x1 - bl.x0 - C.gap, L.FY1 - bl.top); } }); }
    function water(g, stops) { g.fillStyle = K.vgrad(g, WL, L.FY1, stops); g.fillRect(L.FX0, WL, L.FX1 - L.FX0, dep); }
    function reflection(g, t) { g.fillStyle = K.vgrad(g, WL, WL + (WL - L.FY0) * KR, [[0, t], [0.6, t * 0.45], [1, 0]]); g.beginPath(); g.moveTo(x0, WL); trace(g, down); g.lineTo(x1, WL); g.closePath(); g.fill(); }
    function ripples(g, k) { for (var j = 0; j < C.rip.length; j += 5) { g.globalAlpha = C.rip[j + 4] * k; g.fillRect(C.rip[j], C.rip[j + 1], C.rip[j + 2], C.rip[j + 3]); } g.globalAlpha = 1; }
    function sunDisc(g) { K.circle(g, D.sx, D.sy, D.sr); }
    function sunBox(g) { g.fillRect(D.sx - D.sr, D.sy - D.sr, D.sr * 2, D.sr * 2); }
    function moon(g) { K.circle(g, D.moon.x, D.moon.y, D.moon.r); }
    function stars(g, k) { D.stars.forEach(function (st) { g.globalAlpha = st.a; K.circle(g, st.x, st.y, st.r * k); g.fill(); }); g.globalAlpha = 1; }

    // the sky: a sun cut with sunset bands, or a crescent moon and stars
    var skyLight = sky(0, function (g) {
      if (!night) {
        var gr = g.createRadialGradient(D.sx, D.sy, D.sr * 0.6, D.sx, D.sy, 470 * rs);
        gr.addColorStop(0, tone(0.72)); gr.addColorStop(0.35, tone(0.36)); gr.addColorStop(0.7, tone(0.1)); gr.addColorStop(1, tone(0));
        g.fillStyle = gr; skyRect(g);
        band(g, 200, 0.4);
        g.save(); sunDisc(g); g.clip(); g.fillStyle = tone(1); sunBox(g);
        K.knock(g, function (g2) { for (var j = 0; j < 6; j++) g2.fillRect(D.sx - D.sr - 2, D.sy + D.sr * (0.08 + j * 0.16), D.sr * 2 + 4, D.sr * (0.025 + j * 0.022)); });
        g.restore();
      } else {
        band(g, 170, 0.3);
        var gm = g.createRadialGradient(D.moon.x, D.moon.y, D.moon.r, D.moon.x, D.moon.y, 200 * rs); gm.addColorStop(0, tone(0.3)); gm.addColorStop(1, tone(0));
        g.fillStyle = gm; skyRect(g);
        moon(g); fill(g, 1);
        K.knock(g, function (g2) { K.circle(g2, D.moon.x + D.moon.r * 0.42, D.moon.y - D.moon.r * 0.18, D.moon.r * 0.86); g2.fill(); });
        g.fillStyle = tone(0.9); stars(g, 0.9);
      }
    });
    var skyPink = sky(1, function (g) {
      g.fillStyle = K.vgrad(g, L.FY0, WL, pal.band); skyRect(g);
      if (!night) {
        K.knock(g, function (g2) { sunDisc(g2); g2.fill(); });
        g.save(); sunDisc(g); g.clip(); g.fillStyle = K.vgrad(g, D.sy - D.sr, D.sy + D.sr, [[0, 0], [0.55, 0.06], [1, 0.5]]); sunBox(g); g.restore();
      } else K.knock(g, function (g2) { moon(g2); g2.fill(); stars(g2, 1.3); });
    });
    var skyBlue = sky(2, function (g) {
      g.fillStyle = K.vgrad(g, L.FY0, WL, pal.top); skyRect(g);
      if (!night) K.knockRadial(g, D.sx, D.sy, 430 * rs, 0.92);
      else K.knock(g, function (g2) { moon(g2); g2.fill(); stars(g2, 1.4); });
    });
    // the light ink: lit windows and their streaks on the water, the sun's or moon's path
    var landLight = function (g) {
      windows(g, 1, 0);
      g.fillStyle = tone(1); D.glints.forEach(function (q) { g.globalAlpha = q.t * (night ? 0.45 : 0.85); g.fillRect(q.x, q.y, q.w, q.h); }); g.globalAlpha = 1;
      for (var W = C.wins, n = K.noise1D(D.seed + 5), y0, d, i = 0; i < W.length; i += 3) {
        y0 = WL + (WL - W[i + 1] - C.wh) * KR; d = (y0 - WL) / dep;
        if (W[i + 2] && d <= 0.92) { g.globalAlpha = W[i + 2] * 0.8 * (1 - d); g.fillRect(W[i] + n(y0 * 0.08) * 3 * rs, y0, C.ww, C.wh * KR * 1.5); }
      }
      g.globalAlpha = 1;
      K.knock(g, function (g2) { ripples(g2, 0.9); });
    };
    // the water: pink near the shore, blue farther out; the city doubles in blue, cut into streaks by ripples
    var landPink = function (g) {
      water(g, [[0, night ? 0.26 : 0.38], [0.35, 0.18], [1, 0.08]]);
      K.knock(g, function (g2) { reflection(g2, 0.8); sunk(g2, 0.7); });
      faces(g, R.face[1]);
      ripples(g, 0.55);
    };
    var landBlue = function (g) {
      water(g, [[0, 0.1], [1, night ? 0.62 : 0.5]]);
      sunk(g, 0.5);
      K.knock(g, function (g2) { windows(g2, 0, 0.4); });
      reflection(g, R.face[0] * 0.95);
      faces(g, R.face[0]);
      K.knock(g, function (g2) { ripples(g2, 0.85); });
    };
    // the season's line: the roofline (half ink under the water), the tower's needle, the warning lights, and
    // past the fill the city's walls, so the empty part still reads as a city
    var shell = function (g) {
      var lr = C.lr;
      function edges(t, wd, sunk) {
        var j, f = sunk ? WL : 0;
        g.strokeStyle = tone(t); g.lineWidth = wd; g.beginPath();
        for (j = 0; j + 3 < Q.length; j += 2) if ((Q[j + 1] > WL || Q[j + 3] > WL) === sunk) { g.moveTo(Q[j], Math.max(f, Q[j + 1])); g.lineTo(Q[j + 2], Math.max(f, Q[j + 3])); }
        g.stroke();
      }
      g.lineCap = "square"; g.lineJoin = "miter";
      edges(1, sw, false); edges(0.5, sw * 0.55, true);
      g.strokeStyle = tone(0.4); g.lineWidth = 1.2; g.beginPath();
      C.B.forEach(function (bl) { if (bl.x0 > D.fillX - 2 && bl.top < WL) { g.moveTo(bl.x0, bl.body); g.lineTo(bl.x0, WL); } });
      g.stroke();
      g.beginPath(); g.moveTo(s.x - s.w * 0.22, s.base); g.lineTo(s.x, s.y); g.lineTo(s.x + s.w * 0.22, s.base); g.closePath(); fill(g, 1);
      K.circle(g, s.x, s.y, lr * 1.1); g.fill();
      C.beacons.forEach(function (b) { K.circle(g, b[0], b[1], b[2] ? lr : lr * 0.75); fill(g, b[2] ? 1 : 0.55); });
    };
    return [
      { ink: "light", role: "sky", draw: skyLight }, { ink: "pink", role: "sky", draw: skyPink }, { ink: "blue", role: "sky", draw: skyBlue },
      { ink: "light", role: "land", draw: landLight }, { ink: "pink", role: "land", draw: landPink }, { ink: "blue", role: "land", draw: landBlue },
      { ink: "pink", role: "line", draw: shell }
    ];
  }
  // the roofline's height at x
  function roofAt(P, x) {
    for (var j = 0; j + 3 < P.length; j += 2) if (P[j + 2] > P[j] && x >= P[j] && x <= P[j + 2]) return P[j + 1] + (P[j + 3] - P[j + 1]) * (x - P[j]) / (P[j + 2] - P[j]);
    return 0;
  }
  // the fill's front line runs down through the city and the water
  function body(g, D, L) {
    var P = D.city.pts;
    g.moveTo(L.FX0 - 10, L.FY1 + 10);
    for (var j = 0; j < P.length; j += 2) g.lineTo(P[j], Math.min(P[j + 1], L.WL));
    g.lineTo(L.FX1 + 10, L.FY1 + 10); g.closePath();
  }

  A.add("scene", "skyline", {
    name: "Skyline",
    by: "A city on the water: the roofline is the record, a tower on the best night, a warning light for every loss.",
    lights: ["golden", "dusk", "night"],
    derive: derive, layers: layers, body: body
  });
})();
