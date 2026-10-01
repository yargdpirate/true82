/* ---------- TRUE 82 ART: VOLCANO (a scene for the results print) ----------
   The season as a volcanic island chain: the waterline is .500, the record is the skyline of the islands, so a winning
   year towers and a losing stretch drowns. The best night is a volcano in eruption: a crater, lava down its face in
   the hot ink, a fountain of bombs, an ash column that lights from below. Every loss over water is a smoking vent,
   every loss under it a stream of bubbles from the drowned ridge. The sea is dark and holds the glow in glints.
   Rules: art/CONTRACT.md ("A scene"). Tone only: black at an alpha is coverage, never a color. */
(function () {
  "use strict";
  var A = typeof window !== "undefined" ? window.T82ART : null;
  if (!A || typeof A.add !== "function") return;

  function derive(K, D, L) {
    var r = K.rand((D.seed * 2654435761 + 97) >>> 0), WL = L.WL, vs = L.vs, rs = L.rs, m = D.m, c = K.clamp, bs = Math.max(0.8, rs);
    var x0 = L.FX0 - 12, n = Math.ceil((L.FX1 + 12 - x0) / 4) + 1, i, j, k, x, y, hi = 0, lo = 0, CY = [], nz = K.noise1D(D.seed + 11);
    for (i = 0; i <= 82; i++) { hi = Math.max(hi, m[i]); lo = Math.min(lo, m[i]); }
    var amp = Math.min(c(80 * vs / (L.SC * Math.max(1, hi - lo)), 1, 1.8), hi > 0 ? (WL - L.FY0 - 150 * vs) / (L.SC * hi) : 9, lo < 0 ? (L.FY1 - 44 * vs - WL) / (L.SC * -lo) : 9);
    function cr(u) {
      u = c(u, 0, 82);
      var j = Math.min(81, Math.floor(u)), f = u - j, p0 = m[c(j - 1, 0, 82)], p1 = m[j], p2 = m[j + 1], p3 = m[c(j + 2, 0, 82)];
      return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
    }
    for (i = 0; i < n; i++) { x = x0 + i * 4; CY.push(WL - L.SC * amp * cr((x - L.X0) / (L.X1 - L.X0) * 82) + K.fbm(nz, x * 0.03, 3) * 9 * vs); }
    // the volcano: a cone raised on the best night right of the roster, emerging from the sea when the line is drowned
    var gv = 46, xv, iv, hC, room0;
    for (i = 46; i <= 78; i++) if (m[i] > m[gv]) gv = i;
    xv = D.X(gv); iv = Math.round((xv - x0) / 4); room0 = CY[iv] - L.FY0;
    hC = c(0.34 * room0, 52 * vs, 190 * rs); hC = Math.max(hC, CY[iv] - (WL - 30 * vs) + hC * 0.5); hC = Math.min(hC, Math.max(24 * vs, room0 - 56 * vs));
    var wC = hC * 2.5, tc = 0.1, lip = Math.pow(1 - tc, 1.7), t, h;
    for (i = 0; i < n; i++) {
      t = Math.abs(x0 + i * 4 - xv) / wC;
      if (t < 1) { h = t >= tc ? Math.pow(1 - t, 1.7) : lip - 0.13 * (1 - t * t / (tc * tc)); CY[i] -= hC * h; }
    }
    var vy = CY[iv] + 2 * vs;
    function yAt(x) { var u = c((x - x0) / 4, 0, n - 1.001), j = Math.floor(u); return CY[j] + (CY[j + 1] - CY[j]) * (u - j); }
    // lava: two flows down each flank (under the line) and a short fat one down the face
    var LV = [], pts, sd, off, xx;
    function flow(sd, off, len) {
      pts = [];
      for (j = 0; j <= 12; j++) {
        t = j / 12; xx = xv + sd * (wC * 0.09 + t * wC * len);
        pts.push([xx + Math.sin(r() * 3 + t * 8) * 3 * rs, yAt(xx) + off * (0.4 + t) + (j ? 0 : 3 * vs), (8.6 - 6.8 * t) * rs]);
      }
      LV.push(pts);
    }
    flow(-1, 7 * rs, 0.85); flow(-1, 26 * rs, 0.6); flow(1, 7 * rs, 0.85); flow(1, 26 * rs, 0.6);
    pts = [];
    for (j = 0; j <= 8; j++) { t = j / 8; pts.push([xv + Math.sin(t * 6) * 5 * rs, vy + 3 * vs + t * hC * 0.55, (10 - 7 * t) * rs]); }
    LV.push(pts);
    // bombs: ballistic dots thrown from the crater
    var BM = [];
    for (k = 0; k < 16; k++) {
      var vx0 = (r() - 0.5) * 230 * rs, vy0 = (80 + 150 * r()) * rs, g0 = 330 * rs;
      for (j = 1; j <= 6; j++) { t = j * 0.15 + r() * 0.03; BM.push([xv + vx0 * t, vy - 3 * vs - vy0 * t + 0.5 * g0 * t * t, (4.6 - j * 0.4) * rs * (0.8 + 0.5 * r())]); }
    }
    // the ash column, leaning downwind (toward the open side): billows swelling toward an umbrella cap, then sheets of ash
    var room = vy - L.FY0 - 8 * vs, Hp = Math.min(room, 400 * rs), sp = c(Hp / (240 * rs), 0.35, 1.5), wd = xv > L.X0 + (L.X1 - L.X0) * 0.62 ? -1 : 1, PL = [], SH = [], nb = 15, s, rad, cx, cy;
    for (i = 0; i < nb; i++) {
      s = i / (nb - 1); rad = (9 + 38 * Math.pow(s, 1.15)) * rs * sp;
      cx = xv + wd * Hp * 0.22 * Math.pow(s, 1.9) + (r() - 0.5) * rad * 0.5; cy = vy - s * Hp * 0.86 - rad * 0.3;
      PL.push([cx, cy, rad, s]);
      if (i === nb - 1) for (j = -2; j <= 2; j++) if (j) PL.push([cx + j * rad * 0.95, cy + Math.abs(j) * rad * 0.28, rad * (0.92 - 0.1 * Math.abs(j)), 1]);
    }
    for (k = 0; k < 4; k++) SH.push([cx + wd * (30 + k * 46) * rs, cy + (6 + k * 15) * rs * sp, (190 + 160 * r()) * rs, (10 + 7 * r()) * rs * Math.max(0.6, sp)]);
    // the losses: a smoking vent over a roof, a stream of bubbles under the water
    var nl = D.losses.length, W = D.losses.map(function (gi) {
      var wx = D.X(gi + 0.5), wy = yAt(wx);
      return { x: wx, y: wy, s: 0.85 + 0.35 * r(), a: r() * 6.28, wet: wy > WL - 1 };
    });
    var gl = [], sc = [], rr = 6 * rs, ro = 0;
    for (y = WL + 4 * vs; y < L.FY1; y += (5 + r() * 5) * Math.max(0.62, vs)) { t = (y - WL) / (L.FY1 - WL); gl.push([xv + (r() - 0.5) * 30 * rs * t - 20 * rs * t * wd, y, (130 * rs) * (1 - t * 0.55) * (0.4 + 0.8 * r()), (2 + 3 * r() * (1 - t)) * Math.max(0.7, vs), 0.95 - t * 0.5]); }
    for (y = WL + 9 * vs; y < L.FY1 + 6; y += rr * 0.95) {
      t = (y - WL) / (L.FY1 - WL); rr = (6 + 13 * t) * Math.max(0.62, rs); ro = 1 - ro;
      for (x = L.FX0 - 10 + ro * rr; x < L.FX1 + 10; x += rr * 2) sc.push([x + (r() - 0.5) * rr * 0.3, y, rr * (0.85 + 0.3 * r()), r()]);
    }
    var st = [];
    for (i = 0; i < 80; i++) st.push([L.FX0 + r() * (L.FX1 - L.FX0), L.FY0 + Math.pow(r(), 1.3) * (WL - L.FY0 - 30 * vs), (1.2 + 2 * r()) * Math.max(0.9, rs), r() < 0.12]);
    D.vo = { x0: x0, n: n, CY: CY, yAt: yAt, xv: xv, vy: vy, hC: hC, wC: wC, LV: LV, BM: BM, PL: PL, SH: SH, W: W, gl: gl, sc: sc, st: st, wd: wd, nl: nl, Hp: Hp };
  }

  function layers(K, P, D, L) {
    var N = D.vo, CY = N.CY, WL = L.WL, vs = L.vs, rs = L.rs, tone = K.tone, pk = D.pal.key, night = pk === "night", xv = N.xv, vy = N.vy, wd = N.wd;
    var x0 = L.FX0 - 10, x1 = L.FX1 + 10, lw = 8 * Math.max(0.72, rs), bs = Math.max(0.8, rs), PI2 = Math.PI * 2, gap = 2.6 * bs;
    function up(y) { return Math.min(y, WL); }
    function line(g, f) { for (var i = 0; i < N.n; i++) g.lineTo(N.x0 + i * 4, f ? f(CY[i]) : CY[i]); }
    function skyClip(g) { g.beginPath(); g.moveTo(x0, L.FY0 - 10); line(g, up); g.lineTo(x1, L.FY0 - 10); g.closePath(); g.clip(); }
    function massP(g) { g.beginPath(); g.moveTo(x0, WL); line(g, up); g.lineTo(x1, WL); g.closePath(); }
    function strokeLine(g, w, f) { g.lineWidth = w; g.lineJoin = "round"; g.beginPath(); g.moveTo(x0, f ? f(CY[0]) : CY[0]); line(g, f); g.stroke(); }
    function rect(g, y0, y1) { g.fillRect(x0, y0, x1 - x0, y1 - y0); }
    function lens(g, q, e) {                                // a sheet of ash: a tapered lens trailing downwind
      var xa = q[0], xb = q[0] + wd * q[2], xm = (xa + xb) / 2, t = q[3] + e;
      g.beginPath(); g.moveTo(xa, q[1]); g.quadraticCurveTo(xm, q[1] - t * 1.5, xb, q[1]); g.quadraticCurveTo(xm, q[1] + t * 0.9, xa, q[1]); g.closePath();
    }
    // the ash cloud, back to front: each billow clears what is behind it (and a gap of stock round itself), then owns its value
    function cloud(g, rim) {
      var j, q;
      N.SH.forEach(function (sh) {
        K.knock(g, function (g2) { lens(g2, sh, gap); g2.fill(); });
        if (!rim) { lens(g, sh, 0); g.fillStyle = tone(0.4); g.fill(); }
        else { g.save(); lens(g, sh, 0); g.clip(); g.fillStyle = tone(0.5); g.fillRect(x0, sh[1] - 40 * rs, x1 - x0, 80 * rs); K.knock(g, function (g2) { g2.save(); g2.translate(0, -sh[3] * 0.8); lens(g2, sh, 0); g2.fill(); g2.restore(); }); g.restore(); }
      });
      for (j = N.PL.length - 1; j >= 0; j--) {
        q = N.PL[j];
        K.knock(g, function (g2) { K.circle(g2, q[0], q[1], q[2] + gap); g2.fill(); });
        K.circle(g, q[0], q[1], q[2]);
        if (!rim) { g.fillStyle = tone(0.4); g.fill(); }
        else {
          g.save(); g.clip(); g.fillStyle = tone(0.98 - 0.42 * q[3]); g.fillRect(q[0] - q[2], q[1] - q[2], q[2] * 2, q[2] * 2);
          K.knock(g, function (g2) { K.circle(g2, q[0] + q[2] * 0.18 * wd, q[1] - q[2] * 0.28, q[2] * 0.84); g2.fill(); }); g.restore();
        }
      }
    }
    function vent(g, w) {                                   // smoke from a vent: a thread that sways and thins as it leans downwind
      var h = (40 + 30 * w.s) * rs, j, t, hw, bx = w.x, by = w.y - 1, X = function (t) { return bx + wd * h * (0.26 * t * t + 0.05 * Math.sin(t * 9 + w.a)); };
      g.moveTo(bx - 2.4 * bs, by + 1);
      for (j = 0; j <= 8; j++) { t = j / 8; hw = (2.4 - 1.3 * t) * bs; g.lineTo(X(t) - hw, by - h * t); }
      for (j = 8; j >= 0; j--) { t = j / 8; hw = (2.4 - 1.3 * t) * bs; g.lineTo(X(t) + hw, by - h * t); }
      g.closePath();
    }
    function bubbles(g, w) {
      var ht = Math.min(w.y - WL + 2 * vs, 58 * rs), q, rr, bx, by;
      for (q = 0; q < 3; q++) { rr = (3.8 + q * 1.5) * bs * w.s; bx = w.x + Math.sin(w.a + q * 1.7) * 4 * bs; by = w.y - ht * (0.2 + q * 0.34); g.moveTo(bx + rr, by); g.arc(bx, by, rr, 0, PI2); }
    }
    function marks(g) { g.beginPath(); N.W.forEach(function (w) { if (w.wet) bubbles(g, w); else vent(g, w); }); }
    function glowAt(g, R, stops) { var gr = g.createRadialGradient(xv, vy, 0, xv, vy, R); stops.forEach(function (s) { gr.addColorStop(s[0], tone(s[1])); }); g.fillStyle = gr; rect(g, L.FY0 - 10, L.FY1 + 10); }
    function holes(g) { K.knock(g, function (g2) { g2.lineWidth = 3 * bs; g2.lineJoin = "round"; marks(g2); g2.fill(); g2.stroke(); strokeLine(g2, lw * 2.5, up); }); }
    function flows(g, k, fn) {                              // each lava flow as a tapered ribbon (k widens it)
      N.LV.forEach(function (p) {
        var j, a, b, dx, dy, d, side;
        g.beginPath();
        for (side = 1; side >= -1; side -= 2) for (j = side > 0 ? 0 : p.length - 1; j >= 0 && j < p.length; j += side) {
          a = p[Math.min(j + 1, p.length - 1)]; b = p[Math.max(j - 1, 0)]; dx = a[0] - b[0]; dy = a[1] - b[1]; d = Math.sqrt(dx * dx + dy * dy) || 1;
          g.lineTo(p[j][0] - side * dy / d * p[j][2] * k, p[j][1] + side * dx / d * p[j][2] * k);
        }
        g.closePath(); fn(g);
      });
    }
    var skyLight = function (g) {
      skyClip(g);
      g.strokeStyle = tone(night ? 0.08 : 0.14);
      [130, 88, 54, 26].forEach(function (d) { strokeLine(g, d * 2 * vs, up); });
      glowAt(g, 330 * rs, night ? [[0, 0.7], [0.2, 0.42], [0.5, 0.16], [1, 0]] : [[0, 0.82], [0.2, 0.52], [0.5, 0.2], [1, 0]]);
      if (night) { g.fillStyle = tone(0.9); N.st.forEach(function (s) { K.circle(g, s[0], s[1], s[2] * (s[3] ? 1.7 : 1)); g.fill(); }); }
      cloud(g, 1);
      holes(g);
    };
    var skyBlue = function (g) {
      skyClip(g);
      g.fillStyle = K.vgrad(g, L.FY0, WL, night ? [[0, 0.9], [0.6, 0.5], [1, 0.15]] : [[0, 0.85], [0.5, 0.5], [1, 0.1]]); rect(g, L.FY0 - 10, L.FY1 + 10);
      cloud(g, 0);
      holes(g);
    };
    // the islands lit from the crater and the lava's halo, the sea's glints and scallops, the shoals over the drowned ridge
    var landLight = function (g) {
      g.save(); massP(g); g.clip(); glowAt(g, 260 * rs, [[0, 0.95], [0.3, 0.55], [0.65, 0.18], [1, 0]]); g.strokeStyle = tone(0.2);
      [30, 18, 8].forEach(function (d) { strokeLine(g, d * 2 * rs, up); });
      g.fillStyle = tone(0.28); flows(g, 2.6, function (g2) { g2.fill(); });
      g.restore();
      g.fillStyle = tone(0.9); N.gl.forEach(function (q) { g.globalAlpha = q[4]; g.fillRect(q[0] - q[2] / 2, q[1], q[2], q[3]); }); g.globalAlpha = 1;
    };
    var landPink = function (g) {
      g.save(); g.beginPath(); g.rect(x0, WL, x1 - x0, L.FY1 - WL + 20); g.clip(); g.strokeStyle = tone(0.2);
      [46, 30, 16].forEach(function (d) { strokeLine(g, d * rs, null); });
      g.restore();
      g.strokeStyle = tone(0.85); g.lineWidth = 1.5 * bs; g.beginPath();
      N.sc.forEach(function (q) { if (q[3] > 0.8) { g.moveTo(q[0] - q[2], q[1]); g.arc(q[0], q[1] + q[2] * 0.2, q[2], Math.PI * 1.1, Math.PI * 1.9); } });
      g.stroke();
    };
    var landBlue = function (g) {
      massP(g); g.fillStyle = K.vgrad(g, L.FY0, WL, [[0, 0.5], [1, 0.34]]); g.fill();
      g.save(); g.clip(); K.knock(g, function (g2) { [14, 30, 50, 76].forEach(function (d) { strokeLine(g2, 1.8 * bs, function (y) { return y + d * rs; }); }); }); g.restore();
      g.fillStyle = K.vgrad(g, WL, L.FY1, [[0, 0.3], [1, 0.1]]); rect(g, WL, L.FY1 + 10);
      g.strokeStyle = tone(0.7); g.lineWidth = 1.8 * bs; g.beginPath();
      N.sc.forEach(function (q) { g.moveTo(q[0] - q[2], q[1]); g.arc(q[0], q[1] + q[2] * 0.2, q[2], Math.PI * 1.1, Math.PI * 1.9); });
      g.stroke();
    };
    var shell = function (g) {
      g.lineCap = "round"; g.strokeStyle = tone(1); strokeLine(g, lw, up);
      g.strokeStyle = tone(0.62); g.save(); g.beginPath(); g.rect(x0, WL - 1, x1 - x0, L.FY1 - WL + 20); g.clip(); strokeLine(g, lw * 0.6, null); g.restore();
      g.fillStyle = tone(0.96); marks(g); g.fill();
      K.circle(g, xv, vy, 7 * rs); g.fill();
    };
    // lava (the hot ink; at night the line's own ink over the violet)
    var lava = function (g) {
      g.save(); g.beginPath(); g.moveTo(x0, L.FY1 + 20); line(g, up); g.lineTo(x1, L.FY1 + 20); g.closePath(); g.clip();
      g.fillStyle = tone(0.92); flows(g, 1, function (g2) { g2.fill(); });
      g.restore();
      g.beginPath(); N.BM.forEach(function (q) { g.moveTo(q[0] + q[2], q[1]); g.arc(q[0], q[1], q[2], 0, PI2); }); g.fill();
      K.circle(g, xv, vy, 12 * rs); g.fill();
    };
    var hot = pk === "golden" ? "orange" : pk === "dusk" ? "sun" : "pink";
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
    by: "A volcanic island chain: the record is the skyline, the best night erupts in lava and an ash column, every loss a smoking vent or a stream of bubbles from the drowned ridge.",
    lights: ["golden", "dusk", "night"],
    derive: derive, layers: layers, body: body
  });
})();
