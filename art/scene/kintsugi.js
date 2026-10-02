/* ---------- TRUE 82 ART: GOLD SEAM (a perfect scene: it prints only an 82-0) ----------
   Kintsugi. The season is the one great seam of gold leaf across a cracked indigo glaze: it climbs from the left edge,
   swelling with every win (a drop of gold at each month's end), and ends in a full moon that the glaze's other cracks
   radiate from, each mended in gold hairlines. A sakura branch crosses the moon. Title: the record in moon ice with a
   seam through it, PURE GOLD in gold. After the reveal a glint polishes the seam to the moon, the moon flares, and
   petals shake loose from the blossoms and settle (the last frame is the print).
   Rules: art/CONTRACT.md ("A scene") and art/CONTRACT-FX.md ("Perfect scenes"). Tone only. */
(function () {
  "use strict";
  var A = typeof window !== "undefined" ? window.T82ART : null;
  if (!A || typeof A.add !== "function") return;

  var TAU = Math.PI * 2, CAMPS = [5, 20, 35, 50, 61, 76, 82];
  function hyp(x, y) { return Math.sqrt(x * x + y * y); }
  // a petal, tip at (x, y) heading rot, L long and W wide, notched: appended to the open path (one fill for a bunch)
  function pet(g, x, y, rot, L, W, sq) {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(Math.max(0.15, sq || 1), 1);
    g.moveTo(0, 0); g.bezierCurveTo(W * 0.9, -L * 0.25, W * 0.75, -L * 0.85, W * 0.2, -L * 0.98); g.lineTo(0, -L * 0.86); g.lineTo(-W * 0.2, -L * 0.98);
    g.bezierCurveTo(-W * 0.75, -L * 0.85, -W * 0.9, -L * 0.25, 0, 0); g.closePath(); g.restore();
  }
  // a tapered ribbon along flat points P, W wide at each; o: grow, off (of the width), sc, i0, i1, keep (no new path)
  function rib(g, P, W, o) {
    var n = P.length / 2, a = [], b = [], i, j, k, x, y, d, nx, ny, w, f, i1 = o.i1 == null ? n - 1 : o.i1;
    for (i = o.i0 || 0; i <= i1; i++) {
      j = Math.max(0, i - 2); k = Math.min(n - 1, i + 2); x = P[k * 2] - P[j * 2]; y = P[k * 2 + 1] - P[j * 2 + 1]; d = hyp(x, y) || 1; nx = -y / d; ny = x / d;
      w = W[i] * (o.sc || 1) / 2 + (o.grow || 0); f = (o.off || 0) * W[i];
      a.push(P[i * 2] + nx * (w + f), P[i * 2 + 1] + ny * (w + f)); b.push(P[i * 2] - nx * (w - f), P[i * 2 + 1] - ny * (w - f));
    }
    if (!o.keep) g.beginPath();
    g.moveTo(a[0], a[1]);
    for (i = 2; i < a.length; i += 2) g.lineTo(a[i], a[i + 1]);
    for (i = b.length - 2; i >= 0; i -= 2) g.lineTo(b[i], b[i + 1]);
    g.closePath();
  }
  function star(g, x, y, R, k) {
    g.moveTo(x, y - R); g.quadraticCurveTo(x + R * k, y - R * k, x + R, y); g.quadraticCurveTo(x + R * k, y + R * k, x, y + R);
    g.quadraticCurveTo(x - R * k, y + R * k, x - R, y); g.quadraticCurveTo(x - R * k, y - R * k, x, y - R); g.closePath();
  }

  function derive(K, D, L) {
    var ban = L.vs < 1, fw = L.FX1 - L.FX0, fh = L.FY1 - L.FY0, rs = L.rs, r = K.rand((D.seed * 2654435761 + 1982) >>> 0), i, j, k, x, y, t, a, o, q;
    var xa = L.FX0 - 16, ya = L.FY1 - fh * (ban ? 0.1 : 0.07), R = ban ? fh * 0.37 : fw * 0.16, xm = L.FX0 + fw * 0.8, ym = L.FY0 + fh * (ban ? 0.48 : 0.33);
    // the crack: equal segments turning steeper as it climbs, scaled to run from the left edge to the moon's heart
    var N = ban ? 8 : 7, V = [[0, 0]], X, Y, sp = [], su = [], sw = [], ln = [], tot = 0, acc = 0, nz = K.noise1D(D.seed + 31), wa = 13 * rs, wb = 66 * rs;
    for (j = 0; j < N; j++) { a = (4 + 40 * Math.pow(j / (N - 1), 1.3) + (j % 2 ? 1 : -1) * (6 + r() * 7) + (r() - 0.5) * 6) * Math.PI / 180; V.push([V[j][0] + Math.cos(a), V[j][1] - Math.sin(a)]); }
    X = V[N][0]; Y = -V[N][1];
    V = V.map(function (p) { return [xa + p[0] * (xm - xa) / X, ya + p[1] * (ya - ym) / Y]; });
    for (j = 0; j < N; j++) { ln.push(hyp(V[j + 1][0] - V[j][0], V[j + 1][1] - V[j][1])); tot += ln[j]; }
    for (j = 0; j < N; j++) {
      k = Math.ceil(ln[j] / 5);
      for (i = 0; i < k; i++) { t = i / k; sp.push(K.lerp(V[j][0], V[j + 1][0], t), K.lerp(V[j][1], V[j + 1][1], t)); su.push((acc + ln[j] * t) / tot); }
      acc += ln[j];
    }
    sp.push(xm, ym); su.push(1);
    for (i = 0; i < su.length; i++) sw.push((wa + (wb - wa) * Math.pow(su[i], 1.25)) * (1 + 0.2 * nz(su[i] * 150) + 0.14 * nz(su[i] * 37 + 9)));
    function sd(px, py) {                                  // distance to the seam's edge
      var m = 1e9, h = 0, d, z;
      for (z = 0; z < sw.length; z += 2) { d = hyp(px - sp[z * 2], py - sp[z * 2 + 1]); if (d < m) { m = d; h = sw[z] / 2; } }
      return m - h;
    }
    // the glaze breaks into shards: sites in pairs either side of each segment (so the seam is a true crack), and rings
    // of sites round the moon, farther apart as they go out
    var S = [], dd = tot / N * 0.4, M, e;
    for (j = 0; j < N; j++) {
      M = [(V[j][0] + V[j + 1][0]) / 2, (V[j][1] + V[j + 1][1]) / 2]; e = [V[j + 1][0] - V[j][0], V[j + 1][1] - V[j][1]]; k = hyp(e[0], e[1]);
      if (hyp(M[0] - xm, M[1] - ym) > R * 2.1) S.push([M[0] - e[1] / k * dd, M[1] + e[0] / k * dd], [M[0] + e[1] / k * dd, M[1] - e[0] / k * dd]);
    }
    [[2.3, 7], [3.7, 9], [5.4, 11], [7.4, 13]].forEach(function (c) {
      var ph = r() * TAU, rr, z;
      for (z = 0; z < c[1]; z++) {
        a = ph + (z + (r() - 0.5) * 0.6) * TAU / c[1]; rr = R * c[0] * (1 + (r() - 0.5) * 0.24); o = [xm + Math.cos(a) * rr, ym + Math.sin(a) * rr * 0.9];
        if (sd(o[0], o[1]) > rr * TAU / c[1] * 0.3) S.push(o);
      }
    });
    var bb = [L.FX0 - 40, L.FY0 - 40, L.FX1 + 40, L.FY1 + 40], w1 = K.noise1D(D.seed + 5), w2 = K.noise1D(D.seed + 7), wob = 8 * rs;
    function warp(px, py) { return [px + wob * w1(px * 0.018 + py * 0.011), py + wob * w2(px * 0.013 + py * 0.019)]; }
    function cell(k) {
      var s = S[k], p = [bb[0], bb[1], bb[2], bb[1], bb[2], bb[3], bb[0], bb[3]], m, g, u, v, fa, fb, ex, ey, cc, n, tt;
      for (m = 0; m < S.length; m++) {
        if (m === k) continue;
        ex = S[m][0] - s[0]; ey = S[m][1] - s[1]; cc = (S[m][0] * S[m][0] + S[m][1] * S[m][1] - s[0] * s[0] - s[1] * s[1]) / 2; g = []; n = p.length;
        for (u = 0; u < n; u += 2) {
          v = (u + 2) % n; fa = ex * p[u] + ey * p[u + 1] - cc; fb = ex * p[v] + ey * p[v + 1] - cc;
          if (fa <= 0) g.push(p[u], p[u + 1]);
          if (fa * fb < 0) { tt = fa / (fa - fb); g.push(p[u] + (p[v] - p[u]) * tt, p[u + 1] + (p[v + 1] - p[u + 1]) * tt); }
        }
        p = g;
      }
      return p;
    }
    var cells = [], edges = [], junc = [];
    for (k = 0; k < S.length; k++) {
      var p = cell(k), pts = [], n = p.length, u, cnt, seg, w;
      for (i = 0; i < n; i += 2) {
        u = (i + 2) % n; cnt = Math.max(1, Math.ceil(hyp(p[u] - p[i], p[u + 1] - p[i + 1]) / 13)); seg = [];
        for (j = 0; j < cnt; j++) { w = warp(K.lerp(p[i], p[u], j / cnt), K.lerp(p[i + 1], p[u + 1], j / cnt)); pts.push(w[0], w[1]); seg.push(w[0], w[1]); }
        w = warp(p[u], p[u + 1]); seg.push(w[0], w[1]);
        if (sd((p[i] + p[u]) / 2, (p[i + 1] + p[u + 1]) / 2) > 7) edges.push(seg);
        if (p[i] > L.FX0 - 20 && p[i] < L.FX1 + 20 && p[i + 1] > L.FY0 - 20 && p[i + 1] < L.FY1 + 20 && sd(p[i], p[i + 1]) > 6) junc.push(w[0], w[1], (2.4 + r() * 2.4) * rs);
      }
      cells.push({ pts: pts, v: 0.5 + r() * 0.8, f: r() < 0.25 ? 1 : 0, k: 0.6 + r() * 0.4 });
    }
    // the sakura branch across the moon (limbs in moon radii from its heart; the last number a limb's weight) and its blossoms
    var limbs = [], fls = [], fr = ban ? 25 : 32;
    function clus(cx, cy) {                               // three blossoms close together: [x, y, radius, turn]
      for (var z = 0; z < 3; z++) { var aa = r() * TAU; fls.push([cx + (z ? Math.cos(aa) * R * 0.22 : 0), cy + (z ? Math.sin(aa) * R * 0.22 : 0), fr * (1 - z * 0.17), r() * TAU]); }
    }
    [[2.3, -0.95, 1.5, -0.85, 0.9, -0.78, 0.3, -0.9, -0.3, -1, -0.8, -0.9, 1], [0.9, -0.78, 0.84, -0.5, 0.6], [1.5, -0.85, 1.36, -1.3, 0.6], [0.3, -0.9, 0.14, -1.3, 0.5]].forEach(function (b) {
      var P = [], W = [], m, z = b.length - 1, c;
      for (i = 0; i < z - 2; i += 2) {
        m = Math.max(2, Math.round(hyp((b[i + 2] - b[i]) * R, (b[i + 3] - b[i + 1]) * R) / 10));
        for (j = 0; j < m; j++) P.push(xm + K.lerp(b[i], b[i + 2], j / m) * R + (r() - 0.5) * 2.6 * rs, ym + K.lerp(b[i + 1], b[i + 3], j / m) * R + (r() - 0.5) * 2.6 * rs);
      }
      P.push(xm + b[z - 2] * R, ym + b[z - 1] * R);
      for (i = 0; i < P.length / 2; i++) { c = i / (P.length / 2); W.push((b[z] === 1 ? 48 - 42 * c : 26 * b[z] * (1 - 0.7 * c)) * rs); }
      limbs.push({ P: P, W: W });
      clus(P[P.length - 2], P[P.length - 1]);
      if (b[z] === 1) { clus(P[(P.length >> 1) & ~1], P[(P.length >> 1) | 1]); clus(P[(P.length * 0.78 | 0) & ~1], P[(P.length * 0.78 | 0) | 1]); }
    });
    var ro = L.roster, pe = [], np = ban ? 26 : 40;                        // the last four shake loose in the live part; the rest already lie on the glaze
    for (i = 0; i < np; i++) {
      for (k = 0; k < 40; k++) {
        x = L.FX0 + 20 + r() * (fw - 40); y = L.FY0 + 20 + r() * (fh - 40);
        if (sd(x, y) > 18 && !(x < ro.x + ro.w * 0.85 && y > ro.y - ro.size - 14 && y < ro.y + 4 * ro.lh + 24)) break;
      }
      pe.push({ x: x, y: y, a: r() * TAU, L: (14 + r() * 9) * (ban ? 1 : 1.4) * (i >= np - 4 ? 1.7 : 1), s: fls[(r() * fls.length) | 0], ph: r() * TAU, sp: (r() < 0.5 ? -1 : 1) * (1.5 + r() * 2.5), q: 0.5 + r() * 0.5, d: i >= np - 4 });
    }
    D.ks = { fb: L.FY1 + 40, sp: sp, sw: sw, su: su, cells: cells, edges: edges, junc: junc, R: R, xm: xm, ym: ym, limbs: limbs, fls: fls, pe: pe };
  }

  function layers(K, P, D, L) {
    var G = D.ks, tone = K.tone, rs = L.rs, R = G.R, xm = G.xm, ym = G.ym, i, j;
    function flowers(g, k) { g.beginPath(); G.fls.forEach(function (f) { for (var q = 0; q < 5; q++) pet(g, f[0], f[1], q * TAU / 5 + f[3], f[2] * k, f[2] * k * 0.5); }); }
    function strewn(g, k) { g.beginPath(); G.pe.forEach(function (p) { if (!p.d) pet(g, p.x, p.y, p.a, p.L * k, p.L * k * 0.5, p.q); }); }
    function cellPath(g, c) { g.beginPath(); g.moveTo(c.pts[0], c.pts[1]); for (var q = 2; q < c.pts.length; q += 2) g.lineTo(c.pts[q], c.pts[q + 1]); g.closePath(); }
    function lines(g) { g.beginPath(); G.edges.forEach(function (e) { g.moveTo(e[0], e[1]); for (var q = 2; q < e.length; q += 2) g.lineTo(e[q], e[q + 1]); }); }
    function disc(g, k) { K.circle(g, xm, ym, R * k); }
    function seamRib(g, o) { rib(g, G.sp, G.sw, o); }
    function branch(g) { g.beginPath(); G.limbs.forEach(function (b) { rib(g, b.P, b.W, { keep: 1 }); }); }
    function pools(g) {                                    // a drop of gold where the seam crosses each month's end, a big one at the moon
      g.beginPath();
      CAMPS.forEach(function (cm, n) {
        var q = 0, rr; while (q < G.su.length - 1 && G.su[q] < cm / 82) q++;
        rr = G.sw[q] * (n === 6 ? 0.9 : 0.78); g.moveTo(G.sp[q * 2] + rr, G.sp[q * 2 + 1]); g.arc(G.sp[q * 2], G.sp[q * 2 + 1], rr, 0, TAU);
      });
    }
    function ramp(g, stops, pick) {                        // the glaze falls off from the moon in halftone steps; each shard takes its own share
      var gr = g.createRadialGradient(xm, ym, R, xm, ym, R * 4.6);
      stops.forEach(function (s) { gr.addColorStop(s[0], tone(s[1])); });
      g.fillStyle = gr;
      G.cells.forEach(function (c) { var k = pick(c); if (k > 0) { cellPath(g, c); g.globalAlpha = k; g.fill(); } });
      g.globalAlpha = 1;
    }
    function hairCut(g) { K.knock(g, function (g2) { lines(g2); g2.lineWidth = 7 * rs; g2.lineJoin = "round"; g2.stroke(); }); }
    function cut(g) { K.knock(g, function (g2) { seamRib(g2, { grow: 3.4 * rs }); g2.fill(); branch(g2); g2.fill(); }); }
    var mr = K.rand((D.seed * 7919 + 82) >>> 0), seas = [], cr = [];                      // the moon's seas and craters
    for (i = 0; i < 7; i++) { var an = mr() * TAU, rd = Math.sqrt(mr()) * 0.62; seas.push([xm + Math.cos(an) * rd * R, ym + Math.sin(an) * rd * R, (0.12 + mr() * 0.18) * R, mr() * TAU, 0.55 + mr() * 0.4]); }
    for (i = 0; i < 9; i++) { var a2 = mr() * TAU, d2 = Math.sqrt(mr()) * 0.8; cr.push([xm + Math.cos(a2) * d2 * R, ym + Math.sin(a2) * d2 * R, (0.03 + mr() * 0.05) * R]); }
    function seaPath(g) {
      g.beginPath();
      seas.forEach(function (s) { for (var q = 0; q < 10; q++) { var aa = s[3] + q * TAU / 10, rr = s[2] * (0.72 + 0.5 * Math.abs(Math.sin(q * 2.3 + s[4] * 9))); g[q ? "lineTo" : "moveTo"](s[0] + Math.cos(aa) * rr, s[1] + Math.sin(aa) * rr * s[4]); } g.closePath(); });
    }
    function craters(g) { g.lineWidth = 3 * rs; g.beginPath(); cr.forEach(function (c) { g.moveTo(c[0] + c[2], c[1]); g.arc(c[0], c[1], c[2], 0, TAU); }); g.stroke(); }
    var skyViolet = function (g) {
      ramp(g, [[0, 0.8], [0.2, 0.5], [0.45, 0.27], [0.8, 0.11], [1, 0.05]], function (c) { return c.v; });
      hairCut(g); g.fillStyle = tone(0.55); disc(g, 1); g.fill(); cut(g);
    };
    var skyAqua = function (g) {
      ramp(g, [[0, 0.5], [0.25, 0.22], [0.6, 0.05], [1, 0]], function () { return 1; });
      hairCut(g); g.fillStyle = tone(0.9); disc(g, 1); g.fill();
      K.knock(g, function (g2) { seaPath(g2); g2.fill(); craters(g2); });
      seaPath(g); g.fillStyle = tone(0.3); g.fill(); cut(g);
    };
    var skyKey = function (g) {
      ramp(g, [[0, 0.7], [0.4, 0.5], [1, 0.3]], function (c) { return c.f ? c.k : 0; });
      K.knock(g, function (g2) { disc(g2, 1.02); g2.fill(); }); hairCut(g); cut(g);
    };
    var landGold = function (g) {                          // the hairlines, and a pool of gold at each corner
      lines(g); g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = tone(0.95); g.lineWidth = 5.2 * rs; g.stroke();
      g.fillStyle = tone(0.95); g.beginPath();
      for (j = 0; j < G.junc.length; j += 3) { g.moveTo(G.junc[j] + G.junc[j + 2], G.junc[j + 1]); g.arc(G.junc[j], G.junc[j + 1], G.junc[j + 2], 0, TAU); }
      g.fill();
      K.knock(g, function (g2) { disc(g2, 1.06); g2.fill(); branch(g2); g2.fill(); });
      flowers(g, 0.6); g.fillStyle = tone(0.85); g.fill();   // the blossoms' gold: with the magenta rim it prints peach
      strewn(g, 0.62); g.fill();
    };
    var landAqua = function (g) { flowers(g, 0.34); g.fillStyle = tone(0.8); g.fill(); };   // and a pale heart
    var landKey = function (g) {                           // the seam's shadow, then the blossoms
      g.save(); g.translate(5 * rs, 6 * rs); seamRib(g, {}); g.fillStyle = tone(0.9); g.fill(); g.restore();
      flowers(g, 1); g.fillStyle = tone(0.92); g.fill();
      strewn(g, 1); g.fill();
    };
    var seam = function (g) { seamRib(g, {}); g.fillStyle = tone(0.97); g.fill(); pools(g); g.fill(); };
    var seamHi = function (g) { seamRib(g, { off: -0.22, sc: 0.32 }); g.fillStyle = tone(0.55); g.fill(); };
    return [
      { ink: "teal", role: "sky", draw: skyViolet },
      { ink: "pink", role: "sky", draw: skyAqua },
      { ink: "blue", role: "sky", draw: skyKey },
      { ink: "light", role: "land", draw: landGold },
      { ink: "pink", role: "land", draw: landAqua },
      { ink: "blue", role: "land", draw: landKey },
      { ink: "sun", role: "line", draw: seam },
      { ink: "pink", role: "line", draw: seamHi }
    ];
  }
  function body(g, D, L) { g.rect(L.FX0 - 12, L.FY0 - 12, L.FX1 - L.FX0 + 24, L.FY1 - L.FY0 + 24); }

  function title(K, P, D, L, g) {
    var b = g.box, rec = g.record, tone = K.tone, pos = g.poster, ctx = (g.context || "").toUpperCase(), cs = pos ? 2 : 2.4;
    var sz = pos ? 150 : 152, x = b[0] + 18, base = b[3] - (pos ? 20 : 14), maxW = pos ? 430 : 460, w = g.measure(K.font(900, sz, "disp"), rec);
    if (w > maxW) { sz *= maxW / w; w = maxW; }
    function crack(t) { t.lineJoin = "round"; t.beginPath(); t.moveTo(x - 8, base + sz * 0.1); [[-8, 0.06], [0.1, -0.06], [0.2, -0.04], [0.33, -0.2], [0.46, -0.17], [0.58, -0.4], [0.7, -0.36], [0.8, -0.52], [0.92, -0.5], [1, -0.74]].forEach(function (c) { t.lineTo(c[0] < 0 ? x + c[0] : x + w * c[0] + (c[0] === 1 ? 10 : 0), base + sz * c[1]); }); }
    function record(dx, dy, cov, cut) { return function (t) { t.font = K.font(900, sz, "disp"); t.fillStyle = tone(cov); t.fillText(rec, x + dx, base + dy); if (cut) K.knock(t, function (t2) { crack(t2); t2.lineWidth = 15; t2.stroke(); }); }; }
    var rb = [x - 12, base - sz * 0.8, x + w + 22, base + 14];
    g("blue", rb, record(9, 8, 0.95));
    g("teal", rb, record(0, 0, 0.9, 1));
    g("pink", rb, record(0, 0, 0.95, 1));
    g("sun", rb, function (t) {                            // the gold lies in the crack, only inside the letters
      crack(t); t.strokeStyle = tone(0.97); t.lineWidth = 8; t.stroke();
      t.globalCompositeOperation = "destination-in"; t.font = K.font(900, sz, "disp"); t.fillStyle = tone(1); t.fillText(rec, x, base);
    });
    var ps = Math.min(pos ? 62 : 58, sz * 0.4), f = K.font(900, ps, "disp"), tx = x + w + (pos ? 40 : 34), word = "PURE GOLD";
    g("sun", [tx - 4, base - ps * 0.9, tx + g.measure(f, word) + ps * 0.4, base + 8], function (t) { t.fillStyle = tone(0.96); t.font = f; K.spacedText(t, word, tx, base, ps * 0.06, "left"); });
    if (ctx) g("orange", [b[2] - 330, b[1] + 6, b[2] - 8, b[1] + (pos ? 40 : 52)], function (t) {
      t.fillStyle = tone(0.9); t.font = K.font(600, pos ? 13 : 22, "mono"); K.spacedText(t, ctx, b[2] - 16, b[1] + (pos ? 28 : 30), cs, "right");
    });
  }

  /* ---- after the reveal: a glint runs the seam, the moon flares, four big petals shake loose and fall out of the picture ---- */
  var DUR = 3.6, FLY = 2;
  function live(K, P, D, L, t, ink) {
    var G = D.ks, tone = K.tone, m = Math.max(0.8, L.rs), i, n = G.su.length, R = G.R, xm = G.xm, ym = G.ym;
    function at(u) { var q = 0; while (q < n - 1 && G.su[q] < u) q++; return q; }
    var gp = K.ease(K.clamp((t - 0.15) / 1.45, 0, 1)), i1 = at(gp), i0 = at(Math.max(0, gp - 0.18));
    if (t > 0.15 && t < 1.6) {
      var bx = [1e9, 1e9, -1e9, -1e9];
      for (i = i0; i <= i1; i++) { bx[0] = Math.min(bx[0], G.sp[i * 2] - 40); bx[1] = Math.min(bx[1], G.sp[i * 2 + 1] - 40); bx[2] = Math.max(bx[2], G.sp[i * 2] + 40); bx[3] = Math.max(bx[3], G.sp[i * 2 + 1] + 40); }
      ink("pink", bx, function (g) { rib(g, G.sp, G.sw, { sc: 0.78, i0: i0, i1: i1 }); g.fillStyle = tone(0.95); g.fill(); });
    }
    var fp = K.clamp((t - 1.45) / 1, 0, 1), sr = R * (0.16 * K.clamp(t / 0.3, 0, 1) + 0.7 * Math.sin(Math.PI * fp)), sb = sr + 8;
    ink("sun", [xm - sb, ym - sb, xm + sb, ym + sb], function (g) { g.fillStyle = tone(0.95); g.beginPath(); star(g, xm, ym, sr, 0.09); g.fill(); });
    G.pe.filter(function (p) { return p.d; }).forEach(function (p, k) {
      var tau = (t - 0.4 - k * 0.28) / FLY, pos = [], j, hb = p.L * m + 6, bb = [1e9, 1e9, -1e9, -1e9], x, y, rot, sq, u;
      if (tau <= 0 || tau >= 1) return;                        // each petal is on the print only while it falls
      for (j = 0; j < 5; j++) {
        u = Math.max(0, tau - j * 0.035);
        x = p.s[0] + (p.x - p.s[0]) * 0.4 * u + Math.sin(p.ph + u * 6) * 46 * m * Math.min(1, u * 3); y = K.lerp(p.s[1], G.fb, Math.pow(u, 1.2));
        pos.push(x, y);
        if (j === 0) { rot = p.a + p.sp * u * 2; sq = Math.abs(Math.cos(p.ph + u * 11)); }
        bb = [Math.min(bb[0], x - hb), Math.min(bb[1], y - hb), Math.max(bb[2], x + hb), Math.max(bb[3], y + hb)];
      }
      ink("blue", bb, function (g) {
        g.beginPath(); pet(g, pos[0], pos[1], rot, p.L * m, p.L * 0.5 * m, sq); g.fillStyle = tone(0.92); g.fill();
        g.beginPath();
        for (var q = 2; q < pos.length; q += 2) { var rr = (4.2 - q * 0.45) * m; g.moveTo(pos[q] + rr, pos[q + 1]); g.arc(pos[q], pos[q + 1], rr, 0, TAU); }
        g.fill();
      });
      ink("sun", [pos[0] - hb, pos[1] - hb, pos[0] + hb, pos[1] + hb], function (g) { g.beginPath(); pet(g, pos[0], pos[1] - p.L * m * 0.05, rot, p.L * m * 0.64, p.L * 0.29 * m, sq); g.fillStyle = tone(0.85); g.fill(); });
    });
  }

  A.add("scene", "kintsugi", {
    name: "Gold Seam",
    by: "82-0 only: the season is one seam of gold leaf across a cracked indigo glaze, ending in a full moon; sakura petals fall.",
    perfect: true,
    lights: ["golden"],
    derive: derive, layers: layers, body: body, title: title,
    live: { dur: DUR, draw: live }
  });
})();
