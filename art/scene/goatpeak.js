/* ---------- TRUE 82 ART: THE GOAT (a perfect scene: it prints only an 82-0) ----------
   An ibex stands on the one summit an 82-0 season climbs to, black against a sun so big it is cropped by the frame:
   the goat is a hole cut out of the gold, so the only thing on the plate is stock. The season's line runs up the
   ridge as a searing edge (aqua over gold) and ends under the goat's hooves. Rays fan from the sun across a violet
   sky. Title: the record in double-hit gold, THE GOAT beside it. After the reveal the horns catch the light and
   gold stars rise off the summit; the last ones freeze into the print.
   Rules: art/CONTRACT.md ("A scene") and art/CONTRACT-FX.md ("Perfect scenes"). Tone only. */
(function () {
  "use strict";
  var A = typeof window !== "undefined" ? window.T82ART : null;
  if (!A || typeof A.add !== "function") return;
  var TAU = Math.PI * 2;
  var HIT = [4.5, -3.5];
  /* ---- the goat: facing right, hooves on y = 0, about 143 units to the horn tips; added as ONE path of
     same-winding pieces so a union never cancels itself ---- */
  function area(p) { var a = 0, i, n = p.length, j; for (i = 0; i < n; i += 2) { j = (i + 2) % n; a += p[i] * p[j + 1] - p[j] * p[i + 1]; } return a; }
  function addPoly(g, p) {
    var i, n = p.length, q;
    if (area(p) < 0) { q = []; for (i = n - 2; i >= 0; i -= 2) q.push(p[i], p[i + 1]); p = q; }
    g.moveTo(p[0], p[1]);
    for (i = 2; i < n; i += 2) g.lineTo(p[i], p[i + 1]);
    g.closePath();
  }
  function smooth(pts, k, closed) {
    var out = [], n = pts.length / 2, i, j, c, m = closed ? n : n - 1;
    for (i = 0; i < m; i++) {
      var i0 = closed ? (i + n - 1) % n : Math.max(0, i - 1), i2 = closed ? (i + 1) % n : i + 1, i3 = closed ? (i + 2) % n : Math.min(n - 1, i + 2);
      for (j = 0; j < k; j++) {
        var t = j / k, t2 = t * t, t3 = t2 * t;
        for (c = 0; c < 2; c++) {
          var a = pts[i0 * 2 + c], b = pts[i * 2 + c], cc = pts[i2 * 2 + c], d = pts[i3 * 2 + c];
          out.push(0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3));
        }
      }
    }
    if (!closed) out.push(pts[n * 2 - 2], pts[n * 2 - 1]);
    return out;
  }
  function ribbon(pts, ws) {
    var n = pts.length / 2, L = [], R = [], i, o;
    for (i = 0; i < n; i++) {
      var a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1), dx = pts[b * 2] - pts[a * 2], dy = pts[b * 2 + 1] - pts[a * 2 + 1], d = Math.sqrt(dx * dx + dy * dy) || 1, w = ws[i] / 2;
      L.push(pts[i * 2] - dy / d * w, pts[i * 2 + 1] + dx / d * w); R.push(pts[i * 2] + dy / d * w, pts[i * 2 + 1] - dx / d * w);
    }
    o = L.slice();
    for (i = n - 1; i >= 0; i--) o.push(R[i * 2], R[i * 2 + 1]);
    return o;
  }
  // the goat: facing right, hooves on y = 0, about 143 units to the horn tips, as ONE path of same-winding pieces
  function goat(g, x, y, s) {
    function P(a) { var o = [], i; for (i = 0; i < a.length; i += 2) o.push(x + a[i] * s, y + a[i + 1] * s); return o; }
    function rib(a, ws) {
      var n = a.length / 2, sm = smooth(P(a), 6), m = sm.length / 2, w = [], i;
      for (i = 0; i < m; i++) { var t = i / (m - 1) * (n - 1), k = Math.min(n - 2, Math.floor(t)), f = t - k; w.push((ws[k] + (ws[k + 1] - ws[k]) * f) * s); }
      addPoly(g, ribbon(sm, w));
    }
    function blob(a) { addPoly(g, smooth(P(a), 5, true)); }
    function poly(a) { addPoly(g, P(a)); }
    blob([-46, -58, -30, -63, -6, -64, 16, -62, 30, -56, 34, -44, 28, -35, 12, -31, -10, -31, -30, -33, -44, -38, -50, -48]);
    rib([14, -54, 24, -68, 32, -84, 40, -94], [28, 24, 19, 16]);
    poly([34, -104, 46, -106, 58, -100, 68, -92, 72, -85, 69, -80, 60, -79, 50, -83, 40, -86, 33, -92]);
    poly([56, -82, 62, -80, 60, -68, 55, -52, 52, -66, 51, -80]);
    poly([34, -100, 26, -102, 18, -98, 26, -94, 33, -94]);
    rib([38, -100, 36, -116, 26, -130, 10, -134, -4, -126, -12, -112], [12, 11, 9, 5.5, 2.8, 0.9]);
    rib([44, -102, 44, -118, 38, -134, 24, -143, 8, -143, -4, -136], [11, 10, 8, 5.5, 2.8, 0.9]);
    poly([-46, -58, -53, -70, -49, -73, -42, -64]);
    rib([22, -40, 24, -22, 23, -4], [15, 11, 9]); poly([18, -5, 29, -5, 31, 0, 17, 0]);
    rib([32, -40, 44, -40, 51, -30], [13, 10, 8]); poly([47, -34, 58, -29, 58, -22, 48, -23]);
    rib([-36, -50, -44, -36, -42, -20, -40, -4], [24, 14, 10, 9]); poly([-44, -5, -34, -5, -33, 0, -46, 0]);
    rib([-24, -42, -26, -28, -20, -16, -22, -4], [18, 12, 10, 9]); poly([-26, -5, -16, -5, -15, 0, -28, 0]);
  }
  /* ---- the season's geometry: a sun cropped by the frame, one tower, a fall of ridge to the left ---- */
  // the season's geometry: a sun cropped by the frame, one tower for the goat, the ridge falling away to the left
  function derive(K, D, L) {
    var ban = L.vs < 1, fw = L.FX1 - L.FX0, fh = L.FY1 - L.FY0, rs = L.rs, vs = L.vs, i, x;
    var R = ban ? fh * 0.5 : fw * 0.255, sx = L.FX0 + fw * (ban ? 0.77 : 0.86), sy = L.FY0 + fh * (ban ? 0.52 : 0.55);
    var s = R / 150, gx = sx - 14 * s, gy = sy + 10 * s;
    var xa = L.FX0 - 12, xe = L.FX1 + 12, ya = L.FY1 + 4, xp = gx - 130 * s, yk = gy + 64 * s;
    var nc = K.noise1D(D.seed + 11), r = K.rand((D.seed * 40503 + 82) >>> 0);
    function lift(u) { return 0.28 * u + 0.72 * Math.pow(u, 2.2); }
    function crag(x) { return (K.fbm(nc, x * 0.03, 3) * 11 + K.fbm(nc, x * 0.1 + 40, 2) * 4) * vs * K.smooth(0, 40 * rs, Math.abs(x - xp)) * K.smooth(xa, xa + 30, x); }
    var T = [[-130, 64], [-102, 50], [-88, 47], [-82, 32], [-71, 28], [-67, 12], [-58, 9], [-56, 0], [-40, -1], [-20, 0], [10, 1], [30, 0], [36, 0], [38, -20], [50, -23], [62, -19],
      [66, -8], [62, 12], [74, 34], [70, 50], [86, 72], [112, 90]];
    var tw = T.map(function (p) { return [gx + p[0] * s, gy + p[1] * s]; });
    var last = tw[tw.length - 1];
    function ridge(x) {
      var i, a, b;
      if (x <= xp) return ya + (yk - ya) * lift(Math.max(0, (x - xa) / (xp - xa))) + crag(x);
      for (i = 0; i < tw.length - 1; i++) {
        a = tw[i]; b = tw[i + 1];
        if (x >= Math.min(a[0], b[0]) && x <= Math.max(a[0], b[0]) && Math.abs(b[0] - a[0]) > 0.01) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
      }
      return last[1] + (L.FY1 - last[1] - fh * 0.04) * K.smooth(last[0], xe, x) + crag(x) * 0.7;
    }
    function bodyPath(g) {
      var x, i;
      g.beginPath(); g.moveTo(xa, L.FY1 + 12);
      for (x = xa; x <= xp; x += 2) g.lineTo(x, ridge(x));
      for (i = 0; i < tw.length; i++) g.lineTo(tw[i][0], tw[i][1]);
      for (x = last[0] + 2; x <= xe; x += 2) g.lineTo(x, ridge(x));
      g.lineTo(xe, L.FY1 + 12); g.closePath();
    }
    // the ray fan, seeded wedges; and the tower's flank cut into planes
    var rays = [], n = 22, a0 = -Math.PI * 0.5;
    for (i = 0; i < n; i++) rays.push(a0 + (i + (r() - 0.5) * 0.2) * TAU / n, (0.17 + r() * 0.06) * TAU / n);
    var fac = [], ax = gx - 60 * s, B = L.FY1 + 14, m = 8;
    for (i = 0; i <= m; i++) {
      x = xa + (xp + 30 * s - xa) * (0.1 + 0.9 * Math.pow(i / m, 0.85) + (i > 0 && i < m ? (r() - 0.5) * 0.04 : 0));
      fac.push([x, ridge(x) + 1.5, x + (x - ax) * (0.34 + r() * 0.3) * (i % 2 ? 1 : 0.7), B]);
    }
    D.gp = { ban: ban, fw: fw, fh: fh, R: R, sx: sx, sy: sy, s: s, gx: gx, gy: gy, xa: xa, xe: xe, xp: xp, ridge: ridge, bodyPath: bodyPath,
      tw: tw, rays: rays, fac: fac, last: last };
  }
  function layers(K, P, D, L) {
    var G = D.gp, tone = K.tone, rs = L.rs, vs = L.vs, sx = G.sx, sy = G.sy, R = G.R, s = G.s, x0 = L.FX0 - 12, x1 = L.FX1 + 12;
    function disc(g, k) { K.circle(g, sx, sy, R * (k || 1)); }
    function ringBand(g, a, b) { g.beginPath(); g.arc(sx, sy, R * b, 0, TAU); g.arc(sx, sy, R * a, 0, TAU, true); }
    function goatP(g) { g.beginPath(); goat(g, G.gx, G.gy, s); }
    function knockSolids(g) { K.knock(g, function (g2) { G.bodyPath(g2); g2.fill(); goatP(g2); g2.fill(); }); }
    function aura(g, w) {
      var x, u;
      g.beginPath(); g.moveTo(x0, G.ridge(x0));
      for (x = x0; x <= G.xp + 2; x += 3) { u = K.clamp((x - G.xa) / (G.xp - G.xa), 0, 1); g.lineTo(x, G.ridge(x) - w * (0.4 + 0.6 * u)); }
      for (x = G.xp; x >= x0; x -= 3) g.lineTo(x, G.ridge(x));
      g.closePath();
    }
    function plane(g, fn, t) { K.knock(g, function (g2) { fn(g2); g2.fill(); }); if (t) { fn(g); g.fillStyle = tone(t); g.fill(); } }
    function rayPath(g) {
      var rr = R * 7, i, a, w;
      g.beginPath();
      for (i = 0; i < G.rays.length; i += 2) {
        a = G.rays[i]; w = G.rays[i + 1];
        g.moveTo(sx, sy); g.lineTo(sx + Math.cos(a - w) * rr, sy + Math.sin(a - w) * rr); g.lineTo(sx + Math.cos(a + w) * rr, sy + Math.sin(a + w) * rr); g.closePath();
      }
    }
    function fade(g, a0, a1, a2, a3) {
      var gr = g.createRadialGradient(sx, sy, R * 0.9, sx, sy, R * 3.6);
      gr.addColorStop(0, tone(a0)); gr.addColorStop(0.35, tone(a1)); gr.addColorStop(0.75, tone(a2)); gr.addColorStop(1, tone(a3));
      return gr;
    }
    var skyViolet = function (g) {
      g.fillStyle = K.vgrad(g, L.FY0, G.gy + 60 * s, [[0, 0.56], [0.55, 0.32], [1, 0.16]]);
      g.fillRect(L.FX0, L.FY0, L.FX1 - L.FX0, L.FY1 - L.FY0);
      K.knock(g, function (g2) { rayPath(g2); g2.fillStyle = fade(g2, 1, 0.85, 0.3, 0); g2.fill(); });
      plane(g, function (g2) { disc(g2, 1.42); }, 0);
      knockSolids(g);
    };
    var skyOrange = function (g) {
      rayPath(g); g.fillStyle = fade(g, 0.72, 0.46, 0.15, 0.03); g.fill();
      [[170, 0.14], [128, 0.24], [88, 0.36], [50, 0.5]].forEach(function (q) { plane(g, function (g2) { aura(g2, q[0] * vs); }, q[1]); });
      plane(g, function (g2) { disc(g2, 1.42); }, 0);
      knockSolids(g);
    };
    var gdx = -0.075 * R, gdy = 0.05 * R;
    function echo(g) { K.knock(g, function (g2) { g2.translate(gdx, gdy); goatP(g2); g2.fillStyle = tone(0.5); g2.fill(); }); }
    var skyGold = function (g) {
      disc(g); g.fillStyle = K.vgrad(g, sy - R, sy + R, [[0, 0.97], [0.5, 0.95], [0.8, 0.74], [1, 0.5]]); g.fill();
      [[1.07, 1.15, 0.55], [1.22, 1.27, 0.34], [1.34, 1.37, 0.2]].forEach(function (q) { ringBand(g, q[0], q[1]); g.fillStyle = tone(q[2]); g.fill(); });
      echo(g); knockSolids(g);
    };
    var hx = HIT[0] * K.d / K.k, hy = HIT[1] * K.d / K.k, hb = R * 1.2;
    var skyHit = function (g) {
      g.translate(-hx, -hy);
      g.beginPath(); g.rect(L.FX0, L.FY0, L.FX1 - L.FX0, L.FY1 - L.FY0); g.clip();
      disc(g, 0.99); g.fillStyle = K.vgrad(g, sy - R + hy, sy + R + hy, [[0, 0.92], [0.5, 0.9], [0.8, 0.62], [1, 0.4]]); g.fill();
      ringBand(g, 1.07, 1.12); g.fillStyle = tone(0.5); g.fill();
      echo(g); knockSolids(g);
    };
    var skyHaze = function (g) {
      [[120, 0.12], [86, 0.22], [54, 0.34], [26, 0.5]].forEach(function (q) { plane(g, function (g2) { aura(g2, q[0] * vs); }, q[1]); });
      knockSolids(g);
    };
    function fits(fn) { return function (g) { g.save(); G.bodyPath(g); g.clip(); fn(g); g.restore(); }; }
    function facet(g, i) { var a = G.fac[i], b = G.fac[i + 1]; g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(b[2], b[3]); g.lineTo(a[2], a[3]); g.closePath(); }
    function facets(g, pick) { var i; g.beginPath(); for (i = 0; i < G.fac.length - 1; i++) if (pick(i)) facet(g, i); }
    function rim(g, w, t, end) {
      g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = tone(t); g.lineWidth = w;
      g.beginPath(); g.moveTo(x0, G.ridge(x0)); K.trace(g, G.ridge, x0, end, 2);
      g.stroke();
    }
    function towerEdge(g, w, t, i0, i1) {
      var i; g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = tone(t); g.lineWidth = w;
      g.beginPath(); g.moveTo(G.tw[i0][0], G.tw[i0][1]);
      for (i = i0 + 1; i <= i1; i++) g.lineTo(G.tw[i][0], G.tw[i][1]);
      g.stroke();
    }
    var ITOP = 7;
    var landViolet = fits(function (g) {
      facets(g, function (i) { return i % 3 === 0; }); g.fillStyle = tone(0.2); g.fill();
      facets(g, function (i) { return i % 3 === 1; }); g.fillStyle = tone(0.1); g.fill();
    });
    var landGold = fits(function (g) {
      rim(g, 18 * rs, 0.3, G.xp); rim(g, 8 * rs, 0.9, G.xp);
      towerEdge(g, 16 * rs, 0.32, 0, ITOP); towerEdge(g, 7 * rs, 0.9, 0, ITOP);
      towerEdge(g, 14 * rs, 0.5, 8, 21); towerEdge(g, 6 * rs, 0.95, 8, 21);
    });
    var landAqua = function (g) {
      var r = K.rand((D.seed * 9973 + 5) >>> 0), ro = L.roster, i, k, x, y, q, n = G.ban ? 40 : 64, m = Math.max(0.8, rs), dx, dy;
      g.fillStyle = tone(0.95); g.beginPath();
      for (i = 0; i < n; i++) {
        for (k = 0; k < 24; k++) {
          x = L.FX0 + 16 + r() * (L.FX1 - L.FX0 - 32); y = L.FY0 + 16 + r() * (L.FY1 - L.FY0 - 32); dx = x - sx; dy = y - sy;
          if (dx * dx + dy * dy < R * R * 2.6 || y > G.ridge(x) - 80 * vs || (x < ro.x + ro.w * 0.85 && y > ro.y - ro.size - 14 && y < ro.y + 4 * ro.lh + 24)) continue;
          if (i % 4 === 0) star4(g, x, y, (8 + r() * 7) * m, 0.12);
          else { q = (3.4 + r() * 2.6) * m; g.moveTo(x + q, y); g.arc(x, y, q, 0, TAU); }
          break;
        }
      }
      g.fill();
    };
    var landKey = function (g) {
      g.save(); G.bodyPath(g); g.clip();
      g.fillStyle = K.vgrad(g, G.gy + 40 * s, L.FY1, [[0, 0], [1, 0.52]]); g.fillRect(L.FX0, G.gy + 40 * s, L.FX1 - L.FX0, L.FY1 - G.gy - 40 * s);
      facets(g, function (i) { return i % 3 === 2; }); g.fillStyle = tone(0.24); g.fill();
      g.restore();
    };
    var line = function (g) {
      rim(g, 6 * Math.max(0.72, rs), 1, G.xp); towerEdge(g, 5 * Math.max(0.72, rs), 1, 0, ITOP);
    };
    return [
      { ink: "teal", role: "sky", draw: skyViolet },
      { ink: "blue", role: "sky", draw: skyHaze },
      { ink: "orange", role: "sky", draw: skyOrange },
      { ink: "light", role: "sky", draw: skyGold },
      { ink: "sun", role: "sky", draw: skyHit, reg: [HIT[0] + 0.6, HIT[1] - 0.5], box: [sx - hx - hb, sy - hy - hb, sx - hx + hb, sy - hy + hb] },
      { ink: "teal", role: "land", draw: landViolet },
      { ink: "light", role: "land", draw: landGold },
      { ink: "pink", role: "land", draw: landAqua },
      { ink: "blue", role: "land", draw: landKey },
      { ink: "pink", role: "line", draw: line }
    ];
  }
  function body(g, D, L) {
    var G = D.gp, x;
    g.moveTo(L.FX0 - 12, L.FY1 + 12);
    for (x = L.FX0 - 12; x <= G.xp; x += 2) g.lineTo(x, G.ridge(x));
    g.lineTo(L.FX1 + 12, L.FY1 + 12); g.closePath();
  }
  /* ---- the champion's title: the record in double-hit gold over a block shadow, THE GOAT beside it with the sun for its O ---- */
  // the title: the record in double-hit gold over a block shadow, THE GOAT beside it with the sun for its O
  function title(K, P, D, L, g) {
    var b = g.box, rec = g.record, tone = K.tone, pos = g.poster, ctx = (g.context || "").toUpperCase(), cs = pos ? 2 : 2.4;
    var sz = pos ? 150 : 152, x = b[0] + 18, base = b[3] - (pos ? 20 : 14), maxW = pos ? 430 : 460, w = g.measure(K.font(900, sz, "disp"), rec);
    if (w > maxW) { sz *= maxW / w; w = maxW; }
    function record(dx, dy, cov) { return function (t) { t.font = K.font(900, sz, "disp"); t.fillStyle = tone(cov); t.fillText(rec, x + dx, base + dy); }; }
    var rb = [x - 4, base - sz * 0.8, x + w + 14, base + 12];
    g("blue", rb, record(10, 9, 0.95));
    g("sun", rb, record(0, 0, 0.97));
    g("sun", rb, record(1.8, -1.4, 0.9));
    var ps = Math.min(pos ? 112 : 108, sz * 0.76), f = K.font(900, ps, "disp"), cap = ps * 0.78, gap = ps * 0.045, tx = x + w + (pos ? 42 : 38);
    var wG = g.measure(f, "G"), wA = g.measure(f, "AT"), od = cap * 1.0, ox = tx + wG + gap + od / 2, oy = base - cap / 2, ax = tx + wG + gap * 2 + od;
    var box = [tx - 6, base - cap - 8, ax + wA + 8, base + 10], mf = K.font(700, pos ? 17 : 24, "mono");
    g("pink", box, function (t) {
      t.fillStyle = tone(0.95); t.font = f; t.fillText("G", tx, base); t.fillText("AT", ax, base);
    });
    g("sun", [ox - od / 2 - 6, oy - od / 2 - 6, ox + od / 2 + 6, oy + od / 2 + 6], function (t) {
      t.fillStyle = tone(0.96); t.beginPath(); t.arc(ox, oy, od / 2, 0, TAU); t.arc(ox, oy, od / 2 - cap * 0.25, 0, TAU, true); t.fill();
    });
    g("blue", [tx - 4, base - cap - 8 - 38, tx + 150, base - cap - 2], function (t) {
      t.fillStyle = tone(0.95); t.font = mf; K.spacedText(t, "THE", tx + 2, base - cap - 12, pos ? 6 : 8, "left");
    });
    if (ctx) g("orange", [b[2] - 330, b[1] + 6, b[2] - 8, b[1] + (pos ? 40 : 52)], function (t) {
      t.fillStyle = tone(0.9); t.font = K.font(600, pos ? 13 : 22, "mono"); K.spacedText(t, ctx, b[2] - 16, b[1] + (pos ? 28 : 30), cs, "right");
    });
  }
  /* ---- after the reveal: a glint on the horn, a ring, and nine stars thrown off the horn that decelerate to hover and stay ---- */
  var FLY = 1.15, GAP = 0.12, T0 = 0.3, DUR = T0 + 8 * GAP + FLY + 0.4;
  var STARS = { b: [[0.62, 0.2, 1], [0.7, 0.12, 0.7], [0.84, 0.18, 0.9], [0.92, 0.42, 0.8], [0.62, 0.56, 0.8], [0.5, 0.1, 0.75], [0.5, 0.42, 1], [0.97, 0.16, 0.6], [0.56, 0.32, 0.6]],
    p: [[0.66, 0.1, 1], [0.78, 0.06, 0.7], [0.88, 0.2, 0.9], [0.55, 0.3, 0.8], [0.95, 0.5, 0.8], [0.5, 0.66, 0.75], [0.72, 0.4, 1], [0.97, 0.05, 0.6], [0.44, 0.8, 0.7]] };
  function star4(t, x, y, r, k) {
    t.moveTo(x, y - r);
    t.quadraticCurveTo(x + r * k, y - r * k, x + r, y); t.quadraticCurveTo(x + r * k, y + r * k, x, y + r);
    t.quadraticCurveTo(x - r * k, y + r * k, x - r, y); t.quadraticCurveTo(x - r * k, y - r * k, x, y - r);
    t.closePath();
  }
  function flight(q, i, hx, hy, fx, fy, m) {
    var e = 1 - Math.pow(1 - q, 4), bow = Math.sin(Math.PI * Math.min(1, q * 1.2)) * (i % 2 ? 1 : -1) * 34 * m;
    return [hx + (fx - hx) * e + bow * (fy - hy) / 400, hy + (fy - hy) * e - bow * (fx - hx) / 400];
  }
  // after the reveal: a glint on the horn, a ring, then nine stars thrown off the horn that slow to a hover and stay
  function live(K, P, D, L, t, ink) {
    var G = D.gp, tone = K.tone, tab = G.ban ? STARS.b : STARS.p, hx = G.gx - 4 * G.s, hy = G.gy - 134 * G.s, m = Math.max(0.8, L.rs), i, j;
    var gp = K.clamp((t - 0.04) / 0.6, 0, 1);
    if (gp > 0 && gp < 1) {
      var gl = G.R * 0.3 * Math.sin(Math.PI * Math.pow(gp, 0.65)), gb = gl + 6;
      ink("pink", [hx - gb, hy - gb, hx + gb, hy + gb], function (g) { g.fillStyle = tone(0.95); g.beginPath(); star4(g, hx, hy, gl, 0.12); g.fill(); });
      var rr = G.R * 0.04 + G.R * 0.4 * K.ease(gp), rb = rr + 8;
      ink("pink", [hx - rb, hy - rb, hx + rb, hy + rb], function (g) {
        g.fillStyle = tone(0.9); g.beginPath(); g.arc(hx, hy, rr, 0, TAU); g.arc(hx, hy, Math.max(0.5, rr - 7 * m * (1 - gp)), 0, TAU, true); g.fill();
      });
    }
    for (i = 0; i < tab.length; i++) {
      var t0 = T0 + i * GAP, tau = K.clamp((t - t0) / FLY, 0, 1), fx = L.FX0 + (L.FX1 - L.FX0) * tab[i][0], fy = L.FY0 + (L.FY1 - L.FY0) * tab[i][1], rF = (17 + 10 * tab[i][2]) * m;
      if (tau <= 0) continue;
      var p = flight(tau, i, hx, hy, fx, fy, m), x = p[0], y = p[1], r = rF * (0.35 + 0.65 * K.smooth(0, 0.4, tau));
      if (tau < 1) r *= 1 - 0.2 * (1 - tau * tau) * (Math.floor(t * 12 + i) % 2);
      if (tau >= 1) { x = fx; y = fy; r = rF; }
      var tail = [];
      if (tau < 0.8) for (j = 1; j <= 4; j++) { var q = Math.max(0, tau - j * 0.05), pj = flight(q, i, hx, hy, fx, fy, m); tail.push(pj[0], pj[1], r * (0.3 - j * 0.05)); }
      var bx0 = x - r - 4, by0 = y - r - 4, bx1 = x + r + 4, by1 = y + r + 4, k;
      for (k = 0; k < tail.length; k += 3) { bx0 = Math.min(bx0, tail[k] - 6); by0 = Math.min(by0, tail[k + 1] - 6); bx1 = Math.max(bx1, tail[k] + 6); by1 = Math.max(by1, tail[k + 1] + 6); }
      ink("pink", [bx0, by0, bx1, by1], function (g) {
        g.fillStyle = tone(0.95); g.beginPath(); star4(g, x, y, r, 0.16); g.fill();
        g.beginPath(); for (var d = 0; d < tail.length; d += 3) { g.moveTo(tail[d] + tail[d + 2], tail[d + 1]); g.arc(tail[d], tail[d + 1], Math.max(1.2, tail[d + 2]), 0, TAU); } g.fill();
      });
    }
  }
  A.add("scene", "goatpeak", {
    name: "The GOAT",
    by: "82-0 only: an ibex black against a sun the frame crops, on the summit the season climbs to.",
    perfect: true,
    lights: ["golden"],
    derive: derive, layers: layers, body: body, title: title,
    live: { dur: DUR, draw: live }
  });
})();
