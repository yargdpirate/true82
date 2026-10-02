/* ---------- TRUE 82 ART: LEADED GLASS (a scene for the results print) ----------
   The season as a stained-glass window. The record is the lead that divides a bright sky of gold panes, climbing to a
   rose-window sun, from the dark violet panes of the land, which glaze in with the gauge from the left. Every loss is
   a pane kicked in: a ragged hole through the glass on the lead, its broken edge lit pink, so a bad year is a
   shattered ridge. One flat tone per pane; the lead is bare stock. Tone only (art/CONTRACT.md). */
(function () {
  "use strict";
  var A = typeof window !== "undefined" ? window.T82ART : null;
  if (!A || typeof A.add !== "function") return;
  var TAU = Math.PI * 2;

  // the Voronoi cell of seed s: a box cut by the bisector of every near seed (Sutherland-Hodgman)
  function cell(box, s, near) {
    var poly = box, k, nb, nx, ny, mx, my, out, i, a, b, da, db, t;
    for (k = 0; k < near.length; k++) {
      nb = near[k]; nx = nb[0] - s[0]; ny = nb[1] - s[1]; mx = (nb[0] + s[0]) / 2; my = (nb[1] + s[1]) / 2; out = [];
      for (i = 0; i < poly.length; i++) {
        a = poly[i]; b = poly[(i + 1) % poly.length];
        da = (a[0] - mx) * nx + (a[1] - my) * ny; db = (b[0] - mx) * nx + (b[1] - my) * ny;
        if (da <= 0) out.push(a);
        if ((da <= 0) !== (db <= 0)) { t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
      }
      poly = out; if (poly.length < 3) return null;
    }
    return poly;
  }
  // a pane: the polygon pulled in toward its centre so the lead between panes is a gap of stock
  function pane(p, gap) {
    var cx = 0, cy = 0, R = 0, i, k;
    for (i = 0; i < p.length; i++) { cx += p[i][0] / p.length; cy += p[i][1] / p.length; }
    for (i = 0; i < p.length; i++) R += Math.sqrt(Math.pow(p[i][0] - cx, 2) + Math.pow(p[i][1] - cy, 2)) / p.length;
    k = Math.max(0.5, 1 - gap / Math.max(R, 1));
    return { p: p.map(function (q) { return [cx + (q[0] - cx) * k, cy + (q[1] - cy) * k]; }), cx: cx, cy: cy };
  }

  function derive(K, D, L) {
    var r = K.rand((D.seed * 2654435761 + 131) >>> 0), WL = L.WL, vs = L.vs, rs = L.rs, m = D.m, c = K.clamp, ban = vs < 1, FW = L.FX1 - L.FX0, FH = L.FY1 - L.FY0;
    var x0 = L.FX0 - 12, n = Math.ceil((L.FX1 + 12 - x0) / 4) + 1, i, j, k, x, hi = 0, lo = 0, CY = [], nz = K.noise1D(D.seed + 11);
    for (i = 0; i <= 82; i++) { hi = Math.max(hi, m[i]); lo = Math.min(lo, m[i]); }
    var amp = Math.min(c(80 * vs / (L.SC * Math.max(1, hi - lo)), 1, 1.8), hi > 0 ? 0.62 * (WL - L.FY0) / (L.SC * hi) : 9, lo < 0 ? 0.8 * (L.FY1 - WL) / (L.SC * -lo) : 9);
    function cr(u) {
      u = c(u, 0, 82);
      var j = Math.min(81, Math.floor(u)), f = u - j, p0 = m[c(j - 1, 0, 82)], p1 = m[j], p2 = m[j + 1], p3 = m[c(j + 2, 0, 82)];
      return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
    }
    for (i = 0; i < n; i++) { x = x0 + i * 4; CY.push(WL - L.SC * amp * cr((x - L.X0) / (L.X1 - L.X0) * 82) + K.fbm(nz, x * 0.03, 3) * 9 * vs); }
    function yAt(x) { var u = c((x - x0) / 4, 0, n - 1.001), j = Math.floor(u); return CY[j] + (CY[j + 1] - CY[j]) * (u - j); }
    // the rose-window sun, right of the roster, half behind the lead
    var sx = L.X0 + (L.X1 - L.X0) * (0.62 + 0.14 * r()), hz = yAt(sx), sr = c((hz - L.FY0 - 14 * vs) / 1.25, 40 * rs, (ban ? 118 : 190)), sy = hz - 0.22 * sr;
    var W = [], rg = [0, 0.34, 0.68, 1], cn = [5, 9, 15], a0, a1, q, pts, gp = (ban ? 4.4 : 5.4);
    for (i = 0; i < 3; i++) for (j = 0; j < cn[i]; j++) {
      a0 = TAU * j / cn[i] + i * 0.37; a1 = TAU * (j + 1) / cn[i] + i * 0.37; pts = [];
      for (k = 0; k <= 4; k++) pts.push([sx + Math.cos(a0 + (a1 - a0) * k / 4) * rg[i + 1] * sr, sy + Math.sin(a0 + (a1 - a0) * k / 4) * rg[i + 1] * sr]);
      for (k = 4; k >= 0; k--) pts.push([sx + Math.cos(a0 + (a1 - a0) * k / 4) * rg[i] * sr, sy + Math.sin(a0 + (a1 - a0) * k / 4) * rg[i] * sr]);
      q = pane(i ? pts : pts.slice(0, 5).concat([[sx, sy]]), gp * 0.7);
      q.t = [0.99 - i * 0.1 - (j % 2) * (0.13 + i * 0.03), 0, i && r() < 0.16 ? 0.55 : 0]; q.t[1] = 0;
      W.push(q);
    }
    // the glass: a jittered grid of Voronoi cells over the frame, each with a tone per plate for the sky and for the land
    var cs = ban ? 52 : 78, nx = Math.round(FW / cs), ny = Math.round(FH / cs), S = [], P = [], box = [[L.FX0 - 40, L.FY0 - 40], [L.FX1 + 40, L.FY0 - 40], [L.FX1 + 40, L.FY1 + 40], [L.FX0 - 40, L.FY1 + 40]];
    function qz(t) { return c(Math.round(t / 0.08) * 0.08, 0, 0.98); }
    for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) S.push([L.FX0 + (i + 0.5 + (r() - 0.5) * 0.74) * FW / nx, L.FY0 + (j + 0.5 + (r() - 0.5) * 0.74) * FH / ny, i, j]);
    S.forEach(function (s) {
      var near = S.filter(function (t) { return t !== s && Math.abs(t[2] - s[2]) < 3 && Math.abs(t[3] - s[3]) < 3; }), poly = cell(box, s, near), g, f, u, ry;
      if (!poly) return;
      g = pane(poly, gp); f = c(1 - Math.sqrt(Math.pow(g.cx - sx, 2) + Math.pow(g.cy - sy, 2)) / (ban ? 560 : 640), 0, 1);
      ry = yAt(g.cx); u = c((g.cy - ry) / Math.max(40, L.FY1 - ry), 0, 1);
      // the sky: gold panes brightening toward the sun, a magenta wash far from it; the land: dark violet panes, a little gold at the lead
      var jt = function () { return (r() - 0.5) * 0.22; }, lt = 1.25 * f - 0.12 + jt(), bt = 0.92 - 1.2 * f + jt();
      g.ts = [lt < 0.2 ? 0 : qz(lt), bt < 0.2 ? 0 : qz(bt), r() < 0.1 && f < 0.6 ? qz(0.5 + 0.3 * r()) : 0];
      lt = 0.55 * (1 - 3 * u) + jt() * 0.5; bt = 0.72 - 0.34 * u + jt();
      g.tl = [lt < 0.2 ? 0 : qz(lt), qz(bt), r() < 0.12 && u > 0.25 ? qz(0.4 + 0.3 * r()) : 0];
      P.push(g);
    });
    // the losses: a ragged star of a hole on the lead, as wide as the spacing allows
    var nl = D.losses.length, R = c(0.5 * (L.X1 - L.X0) / Math.max(nl, 1), ban ? 12 : 8, ban ? 27 : 32), HO = [];
    D.losses.forEach(function (gi) {
      var bx = D.X(gi + 0.5), by = yAt(bx), nr = 6, hp = [], a, ro;
      for (k = 0; k < nr; k++) {
        a = TAU * k / nr + (r() - 0.5) * 0.4; ro = R * (1 + 0.4 * r());
        hp.push([bx + Math.cos(a) * ro, by + Math.sin(a) * ro * 0.95], [bx + Math.cos(a + 0.5 * TAU / nr) * R * 0.62, by + Math.sin(a + 0.5 * TAU / nr) * R * 0.62]);
      }
      HO.push(hp);
    });
    D.gl = { x0: x0, n: n, CY: CY, yAt: yAt, sx: sx, sy: sy, sr: sr, W: W, P: P, HO: HO };
  }

  function layers(K, P, D, L) {
    var N = D.gl, CY = N.CY, vs = L.vs, rs = L.rs, tone = K.tone, x0 = L.FX0 - 10, x1 = L.FX1 + 10, lw = 8 * Math.max(0.72, rs), bs = Math.max(0.8, rs);
    function line(g) { for (var i = 0; i < N.n; i++) g.lineTo(N.x0 + i * 4, CY[i]); }
    function above(g) { g.beginPath(); g.moveTo(x0, L.FY0 - 10); line(g); g.lineTo(x1, L.FY0 - 10); g.closePath(); g.clip(); }
    function below(g) { g.beginPath(); g.moveTo(x0, L.FY1 + 10); line(g); g.lineTo(x1, L.FY1 + 10); g.closePath(); g.clip(); }
    function ridge(g, w) { g.lineWidth = w; g.lineJoin = "round"; g.beginPath(); g.moveTo(x0, CY[0]); line(g); g.stroke(); }
    function poly(g, p) { g.moveTo(p[0][0], p[0][1]); for (var i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); g.closePath(); }
    function chips(g) { g.beginPath(); N.HO.forEach(function (h) { poly(g, h); }); }
    // one plate of glass: every pane at its own tone, the sun's wedges (sky), the lead cut along the record, the cracks cleared
    function glass(g, k, sky) {
      N.P.forEach(function (q) { var t = sky ? q.ts[k] : q.tl[k]; if (t > 0) { g.beginPath(); poly(g, q.p); g.fillStyle = tone(t); g.fill(); } });
      if (sky) {
        K.knock(g, function (g2) { K.circle(g2, N.sx, N.sy, N.sr * 1.04); g2.fill(); });
        N.W.forEach(function (q) { if (q.t[k] > 0) { g.beginPath(); poly(g, q.p); g.fillStyle = tone(q.t[k]); g.fill(); } });
      }
      K.knock(g, function (g2) { g2.lineJoin = "round"; ridge(g2, lw * 1.9); chips(g2); g2.fill(); });
    }
    var plate = function (k, sky) { return function (g) { g.save(); (sky ? above : below)(g); glass(g, k, sky); g.restore(); }; };
    var shell = function (g) {
      g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = tone(1); ridge(g, lw);
      g.lineWidth = 2.6 * bs; g.lineJoin = "miter"; chips(g); g.stroke();
    };
    var gleam = function (g) { g.strokeStyle = tone(0.9); g.lineCap = "round"; ridge(g, lw * 0.5); };
    return [
      { ink: "light", role: "sky", draw: plate(0, 1) }, { ink: "blue", role: "sky", draw: plate(1, 1) }, { ink: "pink", role: "sky", draw: plate(2, 1) },
      { ink: "light", role: "land", draw: plate(0, 0) }, { ink: "blue", role: "land", draw: plate(1, 0) }, { ink: "pink", role: "land", draw: plate(2, 0) },
      { ink: "pink", role: "line", draw: shell }, { ink: "light", role: "line", draw: gleam }
    ];
  }

  function body(g, D, L) {
    var N = D.gl, i;
    g.moveTo(L.FX0 - 10, L.FY1 + 10);
    for (i = 0; i < N.n; i++) g.lineTo(N.x0 + i * 4, N.CY[i]);
    g.lineTo(L.FX1 + 10, L.FY1 + 10); g.closePath();
  }

  A.add("scene", "glass", {
    name: "Leaded Glass",
    by: "The season as a stained-glass window: the record is the bright lead, the land glazes in with the win rate, every loss a starburst crack.",
    lights: ["golden", "dusk", "night"],
    derive: derive, layers: layers, body: body
  });
})();
