/* ---------- TRUE 82 ART: VOLCANO (a scene for the results print) ----------
   A volcanic island chain: the waterline is .500, the record is the skyline. The best of the games the fill has
   reached erupts out of the sea: a dark cone against its glow, lava veins, a fountain of bombs, an ash anvil with
   lightning. Every loss is a puff of cold steam on the ridge (bubbles where it is drowned). Tone only (art/CONTRACT.md). */
(function () {
  "use strict";
  var A = typeof window !== "undefined" ? window.T82ART : null;
  if (!A || typeof A.add !== "function") return;
  var TAU = Math.PI * 2;

  function derive(K, D, L) {
    var r = K.rand((D.seed * 2654435761 + 97) >>> 0), WL = L.WL, vs = L.vs, rs = L.rs, m = D.m, c = K.clamp, FH = L.FY1 - L.FY0;
    var x0 = L.FX0 - 12, n = Math.ceil((L.FX1 + 12 - x0) / 4) + 1, i, j, k, x, y, t, hi = 0, lo = 0, CY = [], nz = K.noise1D(D.seed + 11);
    for (i = 0; i <= 82; i++) { hi = Math.max(hi, m[i]); lo = Math.min(lo, m[i]); }
    var amp = Math.min(c(80 * vs / (L.SC * Math.max(1, hi - lo)), 1, 1.8), hi > 0 ? 0.22 * (WL - L.FY0) / (L.SC * hi) : 9, lo < 0 ? 0.7 * (L.FY1 - WL) / (L.SC * -lo) : 9);
    function cr(u) {
      u = c(u, 0, 82);
      var j = Math.min(81, Math.floor(u)), f = u - j, p0 = m[c(j - 1, 0, 82)], p1 = m[j], p2 = m[j + 1], p3 = m[c(j + 2, 0, 82)];
      return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
    }
    for (i = 0; i < n; i++) { x = x0 + i * 4; CY.push(WL - L.SC * amp * cr((x - L.X0) / (L.X1 - L.X0) * 82) + K.fbm(nz, x * 0.03, 3) * 12 * vs); }
    // the volcano: on the best of games 53 to the fill's edge (72 at most)
    var gv = 53, gm = c(Math.floor(((D.fillX - 0.12 * (WL - L.FY0)) - L.X0) / (L.X1 - L.X0) * 82), 56, 72), xv, iv, pn, ys, hC, wC, tc = 0.065, lip = Math.pow(1 - tc, 1.85), xp;
    for (i = 53; i <= gm; i++) if (m[i] > m[gv]) gv = i;
    xv = D.X(gv); iv = Math.round((xv - x0) / 4); pn = c((m[gv] + 10) / 50, 0, 1);
    ys = L.FY0 + FH * (0.31 - 0.08 * pn); hC = Math.max(CY[iv] - ys, 60 * vs); wC = hC * 1.55;
    xp = xv + (r() < 0.5 ? -1 : 1) * wC * (0.42 + 0.1 * r());
    for (i = 0; i < n; i++) {
      x = x0 + i * 4; t = Math.abs(x - xv) / wC;
      if (t < 1) CY[i] -= hC / lip * (t >= tc ? Math.pow(1 - t, x < xv ? 1.75 : 1.95) : lip - 0.06 * (1 - t * t / (tc * tc)) + (x < xv ? 0.035 : -0.01) * (1 - t / tc));
      CY[i] -= 0.16 * hC * Math.exp(-Math.pow((x - xp) / (0.1 * wC), 2));
    }
    function yAt(x) { var u = c((x - x0) / 4, 0, n - 1.001), j = Math.floor(u); return CY[j] + (CY[j + 1] - CY[j]) * (u - j); }
    var vy = CY[iv] + 1.5 * vs, rimY = Math.min(yAt(xv - tc * wC), yAt(xv + tc * wC));
    // lava veins: jagged walks down the face, some fork
    var LV = [];
    function vein(px, py, a, len, hw, fork) {
      var p = [[px, py, hw]], stp = hC / 11, q = 0, h = a, nx, ny;
      for (q = 1; q <= len; q++) {
        h = h * 0.6 + (r() - 0.5) * 0.7 + a * 0.4; nx = px + Math.sin(h) * stp; ny = py + Math.cos(h) * stp * (0.8 + 0.5 * r());
        if (ny > WL - 1 || ny < yAt(nx) + 3 * vs) { if (ny > WL - 1) p.push([nx, WL, hw * 0.3]); break; }
        px = nx; py = ny; p.push([px, py, Math.max(hw * (1 - 0.82 * q / len), 1.6 * rs)]);
        if (fork && q > 2 && q < len - 2 && r() < 0.28) { fork = 0; vein(px, py, h + (r() < 0.5 ? -1 : 1) * 0.65, Math.ceil(len * 0.55), hw * 0.62, 0); }
      }
      LV.push(p);
    }
    [-1, 1].forEach(function (sd) {
      [0.14, 0.4, 0.78].forEach(function (f, q) { vein(xv + sd * tc * wC * (0.1 + 0.16 * q), rimY + (9 + 3 * q) * vs, sd * f * (0.9 + 0.2 * r()), 9 + q * 2, (7.6 - 1.3 * q) * rs, 1); });
    });
    // the fountain: a stalk of discs over the crater, a fan of bombs in arcs
    var FT = [], BM = [];
    for (j = 0; j < 7; j++) FT.push([xv + Math.sin(j * 1.7) * tc * wC * 0.14, rimY - j * hC * 0.036, tc * wC * (0.8 - 0.085 * j)]);
    for (k = 0; k < 22; k++) {
      var vx0 = (r() - 0.5) * (k < 9 ? 110 : 300) * rs, vy0 = (110 + 200 * r()) * rs, g0 = 360 * rs;
      for (j = 1; j <= 7; j++) { t = j * 0.115 + r() * 0.02; BM.push([xv + vx0 * t, rimY - 3 * vs - vy0 * t + 0.5 * g0 * t * t, (5.6 - j * 0.55) * Math.max(0.8, rs) * (0.8 + 0.5 * r())]); }
    }
    // the ash: a stem of billows, an anvil cap, a streamer downwind (age 0..1)
    var room = rimY - L.FY0 - 4 * vs, cap = c(room * 0.36, 17 * rs, 84 * rs), hb = Math.max(room * 0.3, room - cap * 1.1), wd = L.FX1 - xv > 0.16 * (L.FX1 - L.FX0) ? 1 : -1, PL = [], nb = 6, a, rad;
    var xt = xv + wd * cap * 1.3, yt = rimY - hb;
    for (i = 0; i < nb; i++) {
      t = i / (nb - 1); rad = cap * (0.34 + 0.5 * Math.pow(t, 1.1)) * (0.92 + 0.16 * r());
      PL.push([xv + wd * cap * 1.3 * t * t + (r() - 0.5) * rad * 0.35, rimY - 4 * vs - rad * 0.4 - t * (hb - rad * 0.4), rad, 0.55 * t]);
    }
    for (j = 0; j < 11; j++) {
      a = (j - 1.4) * cap * (j < 6 ? 0.95 : 0.8); rad = cap * (j < 6 ? 1.0 - 0.06 * Math.abs(j - 1.4) : 0.66 - 0.1 * (j - 6)) * (0.78 + 0.34 * r());
      PL.push([xt + wd * a, yt - cap * 0.2 * (1 - Math.min(1, Math.abs(a) / (5 * cap))) + (j > 5 ? (j - 5) * cap * 0.12 : Math.abs(a) * 0.08) + (r() - 0.5) * cap * 0.3, rad, 0.58 + 0.04 * j]);
    }
    PL = PL.filter(function (q) { return q[0] > L.FX0 - q[2] * 0.4 && q[0] < L.FX1 + q[2] * 0.4; });
    // lightning: two bolts from the cap's underside, one forking
    var BT = [];
    for (k = 0; k < 2; k++) {
      var bx = xt + wd * cap * (0.1 + 1.8 * k), by = yt + cap * 0.6, bp = [[bx, by]], bl = Math.min(hb * (0.7 - 0.15 * k) + cap * 0.4, 170 * rs), sg = r() < 0.5 ? -1 : 1;
      for (j = 1; j <= 7; j++) { sg = -sg; bx += sg * cap * (0.12 + 0.2 * r()) * (j % 3 ? 1 : 2); by += bl / 7; bp.push([bx, by]); if (j === 3) BT.push([[bx, by], [bx + wd * cap * 0.28, by + bl * 0.16], [bx + wd * cap * 0.5, by + bl * 0.34]]); }
      BT.push(bp);
    }
    var W = D.losses.map(function (gi) { var wx = D.X(gi + 0.5), wy = yAt(wx); return { x: wx, y: wy, s: 0.85 + 0.3 * r(), a: r() * 6.28, wet: wy > WL - 1 }; });
    var gl = [], sc = [], rr = 6 * rs, ro = 0;
    for (y = WL + 4 * vs; y < L.FY1; y += (5 + r() * 5) * Math.max(0.62, vs)) { t = (y - WL) / (L.FY1 - WL); gl.push([xv + (r() - 0.5) * 30 * rs * t, y, wC * 0.9 * (1 - t * 0.5) * (0.35 + 0.8 * r()), (2.2 + 3 * r() * (1 - t)) * Math.max(0.7, vs), 0.95 - t * 0.5]); }
    for (y = WL + 9 * vs; y < L.FY1 + 6; y += rr * 0.95) {
      t = (y - WL) / (L.FY1 - WL); rr = (6 + 13 * t) * Math.max(0.62, rs); ro = 1 - ro;
      for (x = L.FX0 - 10 + ro * rr; x < L.FX1 + 10; x += rr * 2) sc.push([x + (r() - 0.5) * rr * 0.3, y, rr * (0.85 + 0.3 * r()), r()]);
    }
    var st = [];
    for (i = 0; i < 80; i++) st.push([L.FX0 + r() * (L.FX1 - L.FX0), L.FY0 + Math.pow(r(), 1.3) * (WL - L.FY0 - 30 * vs), (1.2 + 2 * r()) * Math.max(0.9, rs) * (r() < 0.12 ? 1.7 : 1)]);
    D.vo = { mk: c(1.15 - D.losses.length * 0.007, 0.62, 1.1), x0: x0, n: n, CY: CY, yAt: yAt, xv: xv, vy: vy, rimY: rimY, wC: wC, tc: tc, LV: LV, FT: FT, BM: BM, PL: PL, BT: BT, W: W, gl: gl, sc: sc, st: st, wd: wd };
  }

  function layers(K, P, D, L) {
    var N = D.vo, CY = N.CY, WL = L.WL, vs = L.vs, rs = L.rs, tone = K.tone, pk = D.pal.key, night = pk === "night", xv = N.xv, vy = N.vy, rimY = N.rimY, wd = N.wd, wC = N.wC, tc = N.tc;
    var x0 = L.FX0 - 10, x1 = L.FX1 + 10, lw = 8 * Math.max(0.72, rs), bs = Math.max(0.8, rs);
    function up(y) { return Math.min(y, WL); }
    function line(g, f) { for (var i = 0; i < N.n; i++) g.lineTo(N.x0 + i * 4, f ? f(CY[i]) : CY[i]); }
    function skyClip(g) { g.beginPath(); g.moveTo(x0, L.FY0 - 10); line(g, up); g.lineTo(x1, L.FY0 - 10); g.closePath(); g.clip(); }
    function massP(g) { g.beginPath(); g.moveTo(x0, WL); line(g, up); g.lineTo(x1, WL); g.closePath(); }
    function strokeLine(g, w, f) { g.lineWidth = w; g.lineJoin = "round"; g.beginPath(); g.moveTo(x0, f ? f(CY[0]) : CY[0]); line(g, f); g.stroke(); }
    function rect(g, y0, y1) { g.fillRect(x0, y0, x1 - x0, y1 - y0); }
    function glow(g, R, stops) { var gr = g.createRadialGradient(xv, vy, 0, xv, vy, R); stops.forEach(function (s) { gr.addColorStop(s[0], tone(s[1])); }); g.fillStyle = gr; rect(g, L.FY0 - 10, L.FY1 + 10); }
    // the ash cloud, back to front; each billow owns its area. Warm plate: dark against the glow, keeping the crescent
    // the lava lights from below. Magenta plate: a body a shade darker than the sky with a seam along its crown
    function cloud(g, mode) {
      var j, q;
      for (j = N.PL.length - 1; j >= 0; j--) {
        q = N.PL[j];
        K.knock(g, function (g2) { K.circle(g2, q[0], q[1], q[2] + 0.6); g2.fill(); });
        K.circle(g, q[0], q[1], q[2]);
        if (mode) {
          g.fillStyle = tone(0.22 + 0.34 * q[3]); g.fill();
          K.knock(g, function (g2) { g2.lineWidth = 2.2 * bs; g2.beginPath(); g2.arc(q[0], q[1], q[2] - bs, Math.PI * 1.08, Math.PI * 1.92); g2.stroke(); });
        } else {
          g.fillStyle = tone(0.98 - 0.62 * q[3]); g.fill();
          g.save(); g.clip();
          K.knock(g, function (g2) { K.circle(g2, q[0], q[1] - q[2] * (0.34 + 0.5 * q[3]), q[2] * 0.97); g2.fill(); });
          g.restore();
        }
      }
    }
    function bolt(g) { N.BT.forEach(function (p) { g.beginPath(); p.forEach(function (q) { g.lineTo(q[0], q[1]); }); g.stroke(); }); }
    function steam(g, w) { // overlapping puffs that swell as they drift downwind
      var q, rr = 3.4 * bs * (vs < 1 ? 1.4 : 1) * N.mk * w.s, bx = w.x, by = w.y - vs, r2;
      for (q = 0; q < 4; q++) { g.moveTo(bx + rr, by); g.arc(bx, by, rr, 0, TAU); r2 = rr * 1.3; by -= (rr + r2) * 0.66; bx += wd * (rr + r2) * (0.2 + 0.16 * Math.sin(w.a + q * 1.3)); rr = r2; }
    }
    function bubbles(g, w) {
      var ht = Math.min(w.y - WL + 2 * vs, 58 * rs), q, rr, by;
      for (q = 0; q < 3; q++) { rr = (3 + q * 1.3) * bs * N.mk * w.s; by = w.y - ht * (0.2 + q * 0.34); g.moveTo(w.x + rr, by); g.arc(w.x + Math.sin(w.a + q * 1.7) * 3 * bs, by, rr, 0, TAU); }
    }
    function marks(g) { g.beginPath(); N.W.forEach(function (w) { if (w.wet) bubbles(g, w); else steam(g, w); }); }
    function fount(g, k) { N.FT.forEach(function (q) { g.moveTo(q[0] + q[2] * k, q[1]); g.arc(q[0], q[1], q[2] * k, 0, TAU); }); }
    function bombs(g) { N.BM.forEach(function (q) { g.moveTo(q[0] + q[2], q[1]); g.arc(q[0], q[1], q[2], 0, TAU); }); }
    function holes(g) { // what prints in its own ink is cleared out of the warm plates
      K.knock(g, function (g2) {
        g2.lineWidth = 3 * bs; g2.lineJoin = "round"; marks(g2); g2.fill(); g2.stroke();
        g2.lineWidth = 8 * Math.max(0.7, rs) + 3; bolt(g2); strokeLine(g2, lw * 2.5, up);
        g2.beginPath(); fount(g2, 1); bombs(g2); g2.fill(); g2.lineWidth = 3.4 * bs; g2.stroke();
      });
    }
    function gullies(g) { // fluting down the cone
      var q, sd, a, ex, ey, tx, ty;
      g.beginPath();
      for (sd = -1; sd <= 1; sd += 2) for (q = 0; q < 6; q++) {
        a = (0.1 + q * 0.14 + (q % 2) * 0.03) * sd; tx = xv + sd * tc * wC * 1.1; ty = rimY + 6 * vs; ex = xv + a * wC * 0.86; ey = WL + 6;
        g.moveTo(tx, ty); g.lineTo(ex - sd * 5 * rs, ey); g.lineTo(ex + sd * 2 * rs, ey); g.closePath();
      }
      g.fill();
    }
    function flows(g, k) { // each vein a tapered ribbon
      N.LV.forEach(function (p) {
        var j, a, b, dx, dy, d, side;
        g.beginPath();
        for (side = 1; side >= -1; side -= 2) for (j = side > 0 ? 0 : p.length - 1; j >= 0 && j < p.length; j += side) {
          a = p[Math.min(j + 1, p.length - 1)]; b = p[Math.max(j - 1, 0)]; dx = a[0] - b[0]; dy = a[1] - b[1]; d = Math.sqrt(dx * dx + dy * dy) || 1;
          g.lineTo(p[j][0] - side * dy / d * p[j][2] * k, p[j][1] + side * dx / d * p[j][2] * k);
        }
        g.closePath(); g.fill();
      });
    }
    var skyLight = function (g) {
      skyClip(g);
      g.strokeStyle = tone(night ? 0.06 : 0.1);
      [120, 76, 44, 20].forEach(function (d) { strokeLine(g, d * 2 * vs, up); });
      g.fillStyle = K.vgrad(g, WL - 110 * vs, WL, [[0, 0], [1, night ? 0.26 : 0.4]]); rect(g, WL - 110 * vs, WL);
      glow(g, Math.max(wC * 1.5, 200 * rs), night ? [[0, 0.72], [0.22, 0.46], [0.5, 0.18], [1, 0]] : [[0, 0.88], [0.22, 0.58], [0.5, 0.24], [1, 0]]);
      if (night) { g.fillStyle = tone(0.9); N.st.forEach(function (s) { K.circle(g, s[0], s[1], s[2]); g.fill(); }); }
      cloud(g, 0);
      holes(g);
    };
    var skyBlue = function (g) {
      skyClip(g);
      g.fillStyle = K.vgrad(g, L.FY0, WL, night ? [[0, 0.9], [0.6, 0.5], [1, 0.15]] : [[0, 0.85], [0.5, 0.5], [1, 0.12]]); rect(g, L.FY0 - 10, L.FY1 + 10);
      cloud(g, 1);
      holes(g);
    };
    // a thin rim of warm light along the crest; the sea's glints
    var landLight = function (g) {
      g.save(); massP(g); g.clip(); g.strokeStyle = tone(0.22);
      [30, 18, 8].forEach(function (d) { strokeLine(g, d * 2 * rs, up); });
      g.restore();
      g.fillStyle = tone(0.9); N.gl.forEach(function (q) { g.globalAlpha = q[4]; g.fillRect(q[0] - q[2] / 2, q[1], q[2], q[3]); }); g.globalAlpha = 1;
      g.fillStyle = tone(0.94); flows(g, 0.45); g.beginPath(); fount(g, 0.5); g.fill();   // the lava's hot core, in the light ink
    };
    function swell(g, t, a, w) { // scallops of swell
      g.strokeStyle = tone(a); g.lineWidth = w * bs; g.beginPath();
      N.sc.forEach(function (q) { if (q[3] > t) { g.moveTo(q[0] - q[2], q[1]); g.arc(q[0], q[1] + q[2] * 0.2, q[2], Math.PI * 1.1, Math.PI * 1.9); } });
      g.stroke();
    }
    var landPink = function (g) { swell(g, 0.8, 0.85, 1.5); };
    var landBlue = function (g) {
      massP(g); g.fillStyle = K.vgrad(g, L.FY0, WL, [[0, 0.5], [1, 0.4]]); g.fill();
      g.save(); g.clip(); K.knock(g, function (g2) { g2.lineWidth = 1.8 * bs; g2.beginPath(); [14, 30, 50, 76].forEach(function (d) { for (var i = 0; i < N.n; i++) { i ? g2.lineTo(N.x0 + i * 4, CY[i] + d * rs) : g2.moveTo(N.x0, CY[0] + d * rs); } }); g2.stroke(); gullies(g2); }); g.restore();
      g.fillStyle = K.vgrad(g, WL, L.FY1, [[0, 0.3], [1, 0.1]]); rect(g, WL, L.FY1 + 10);
      swell(g, -1, 0.7, 1.8);
    };
    var shell = function (g) {
      g.lineCap = "round"; g.strokeStyle = tone(1); strokeLine(g, lw, up);
      g.strokeStyle = tone(0.62); g.save(); g.beginPath(); g.rect(x0, WL - 1, x1 - x0, L.FY1 - WL + 20); g.clip(); strokeLine(g, lw * 0.6, null); g.restore();
      g.fillStyle = tone(0.96); marks(g); g.fill();
      g.strokeStyle = tone(0.98); g.lineWidth = 8 * Math.max(0.7, rs); g.lineJoin = "miter"; bolt(g);
    };
    var lava = function (g) {
      var j, q;
      for (j = N.PL.length - 1; j >= 0; j--) {   // lit undersides
        q = N.PL[j];
        K.knock(g, function (g2) { K.circle(g2, q[0], q[1], q[2] + 0.6); g2.fill(); });
        if (q[3] > 0.7) continue;
        g.save(); K.circle(g, q[0], q[1], q[2]); g.clip();
        g.beginPath(); g.rect(q[0] - q[2], q[1] - q[2], q[2] * 2, q[2] * 2); g.moveTo(q[0] + q[2] * 0.97, q[1] - q[2] * (0.34 + 0.5 * q[3])); g.arc(q[0], q[1] - q[2] * (0.34 + 0.5 * q[3]), q[2] * 0.97, 0, TAU);
        g.fillStyle = tone(0.88 - 0.7 * q[3]); g.fill("evenodd"); g.restore();
      }
      g.fillStyle = tone(0.94); flows(g, 1);
      g.beginPath(); fount(g, 1); g.fill();
      g.beginPath(); bombs(g); g.fill();
    };
    var hot = pk === "golden" ? "orange" : pk === "dusk" ? "sun" : "blue";
    return [
      { ink: "light", role: "sky", draw: skyLight }, { ink: "blue", role: "sky", draw: skyBlue },
      { ink: "light", role: "land", draw: landLight }, { ink: "pink", role: "land", draw: landPink }, { ink: "blue", role: "land", draw: landBlue },
      { ink: "pink", role: "line", draw: shell }, { ink: hot, role: "line", draw: lava }
    ];
  }

  function body(g, D, L) {
    var N = D.vo, i;
    g.moveTo(L.FX0 - 10, L.FY1 + 10); g.lineTo(L.FX0 - 10, L.WL);
    for (i = 0; i < N.n; i++) g.lineTo(N.x0 + i * 4, Math.min(N.CY[i], L.WL));
    g.lineTo(L.FX1 + 10, L.WL); g.lineTo(L.FX1 + 10, L.FY1 + 10); g.closePath();
  }

  A.add("scene", "volcano", {
    name: "Eruption",
    by: "A volcanic island chain: the record is the skyline, the best night erupts in lava, an anvil of ash and lightning, every loss a puff of steam (or bubbles from the drowned ridge).",
    lights: ["golden", "dusk", "night"],
    derive: derive, layers: layers, body: body
  });
})();
