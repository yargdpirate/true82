/* ---------- TRUE 82 ART: EVERY RAY (a perfect scene: it prints only an 82-0) ----------
   A sun fully risen over a violet sea, a ray for every win: 82 wedges fan across a dawn sky, gold and orange in
   turn, fading to dots. The season's line is the road of light the sun lays across the water, a gold glitter path
   cut into horizontal stripes that climbs from the lower left to the sun's foot; islands sit dark on the horizon and
   gulls are holes cut out of the sun. Title: the record in double-hit gold, the zero a sun. After the reveal 82
   beads of light shoot off the sun along the rays, one per win, left to right, and settle into a crown of dots
   (the print keeps it); the sea glitters. Rules: art/CONTRACT.md ("A scene"), art/CONTRACT-FX.md. Tone only. */
(function () {
  "use strict";
  var A = typeof window !== "undefined" ? window.T82ART : null;
  if (!A || typeof A.add !== "function") return;
  var TAU = Math.PI * 2, PI = Math.PI, N = 82, HIT = [4, -3];

  function derive(K, D, L) {
    var fw = L.FX1 - L.FX0, fh = L.FY1 - L.FY0, ban = L.vs < 1, vs = L.vs, rs = L.rs, r = K.rand((D.seed * 2654435761 + 8222) >>> 0), i, j, x, u;
    var HY = L.FY0 + fh * (ban ? 0.66 : 0.63), R = ban ? 74 : 134, SX = L.FX0 + fw * (ban ? 0.73 : 0.74), SY = HY - R * 1.08, nz = K.noise1D(D.seed + 7);
    var isl = [[0.02, 0.36, 0.085], [0.2, 0.5, 0.05], [0.86, 1.08, 0.06]].map(function (q) {
      var p = [], xa = L.FX0 + fw * q[0], xb = L.FX0 + fw * q[1];
      for (x = xa; x <= xb; x += 4) { u = (x - xa) / (xb - xa); p.push(x, HY - q[2] * fh * Math.pow(Math.sin(PI * u), 0.85) * (0.82 + 0.36 * K.fbm(nz, x * 0.03, 2) * 2 + 0.2)); }
      p.push(xb, HY); return p;
    });
    // the road of light: a centre line from the sun's foot down to the lower left, thick where it is near
    var XE = L.FX0 + (ban ? fw * 0.3 : -10), YE = L.FY1 - 6 * vs, hwm = fh * (ban ? 0.1 : 0.062);
    function cx(t) { return SX + (XE - SX) * Math.pow(t, 1.08) + Math.sin(t * 6.3 + 0.6) * (ban ? 20 : 26) * t; }
    function cy(t) { return HY + 2 + (YE - HY) * t; }
    function hw(t) { return 3 * rs + hwm * Math.pow(t, 1.2); }
    var road = [], gaps = [], G = ban ? 11 : 20, sp = [], rip = [], bites = [], cl = [];
    for (i = 0; i <= 40; i++) { u = i / 32; road.push(cx(u), cy(u) - hw(u)); }
    for (i = 40; i >= 0; i--) { u = i / 32; road.push(cx(u), cy(u) + hw(u)); }
    for (i = 1; i <= G; i++) { u = Math.pow(i / (G + 1), 1.5); gaps.push(HY + (L.FY1 - HY) * u * 1.02, (0.9 + 2.4 * u) * (ban ? 1.2 : 1.35)); }
    for (i = 0; i < (ban ? 30 : 48); i++) { u = 0.04 + 0.96 * r(); bites.push(cx(u) + (r() - 0.5) * 2.4 * hw(u), cy(u) + (r() - 0.5) * 2.2 * hw(u), (6 + 40 * u) * (0.5 + r()), (1.4 + 3.2 * u) * (ban ? 1.3 : 1)); }
    for (i = 0; i < 9; i++) cl.push(L.FX0 + fw * r() * 1.0, HY - fh * (0.05 + 0.2 * r()) * (0.5 + i / 9), fw * (0.07 + 0.2 * r()), (3 + 4 * r()) * (ban ? 1.3 : 1));
    for (i = 0; i < (ban ? 6 : 12); i++) { u = 0.05 + 0.5 * r(); sp.push(cx(u) + (r() - 0.5) * hw(u) * 1.4, cy(u) + (r() - 0.5) * hw(u) * 1.2, (ban ? 8 : 10) * (0.6 + 0.9 * u) * (0.7 + 0.6 * r()), r() * TAU, 1.1 + r() * 1.1); }
    // ripples: rows of dashes, shorter, thinner and closer toward the horizon
    for (i = 0, u = 0; u < 1; i++) {
      var v = Math.pow(u, 1.5), yy = HY + 3 + (L.FY1 - HY - 3) * v, lw = (7 + 54 * v) * (ban ? 1 : 1.2), th = (1.8 + 4.6 * v) * (ban ? 1.25 : 1);
      for (x = L.FX0 - 20 + r() * lw * 2; x < L.FX1 + 20; x += lw * (1.5 + r() * 2.2)) rip.push(x, yy, lw * (0.6 + r() * 0.8), th);
      u += (ban ? 0.1 : 0.056) * (0.6 + 0.8 * v + 0.4 * r());
    }
    var gulls = [[-0.5, -0.38, 0.4, -0.18], [0.12, -0.55, 0.3, 0.1], [0.5, -0.12, 0.26, 0.2], [-0.12, -0.2, 0.22, -0.08]];
    D.rise = { ban: ban, fw: fw, fh: fh, HY: HY, R: R, SX: SX, SY: SY, isl: isl, road: road, gaps: gaps, bites: bites, cl: cl, sp: sp, rip: rip, gulls: gulls, cx: cx, cy: cy, hw: hw, pit: PI / N };
  }

  function layers(K, P, D, L) {
    var S = D.rise, tone = K.tone, x0 = L.FX0 - 12, x1 = L.FX1 + 12, HY = S.HY, R = S.R, SX = S.SX, SY = S.SY, vs = L.vs, rs = L.rs, fw = S.fw, ban = S.ban, i, j;
    function box(g, y0, y1) { g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); }
    function skyClip(g) { box(g, L.FY0 - 10, HY); g.clip(); }
    function isles(g) {
      g.beginPath();
      S.isl.forEach(function (p) { g.moveTo(p[0], HY + 3); for (var k = 0; k < p.length; k += 2) g.lineTo(p[k], p[k + 1]); g.closePath(); });
    }
    function disc(g, k) { K.circle(g, SX, SY, R * (k || 1)); }
    function gullP(g) {
      g.lineCap = "round"; g.lineJoin = "round"; g.beginPath();
      S.gulls.forEach(function (b) {
        var s = R * b[2] * 1.45, x = SX + R * b[0], y = SY + R * b[1];
        g.lineWidth = Math.max(10, s * 0.32);
        g.moveTo(x - s, y + s * 0.15); g.quadraticCurveTo(x - s * 0.5, y - s * 0.55, x, y); g.quadraticCurveTo(x + s * 0.5, y - s * 0.55, x + s, y + s * 0.15);
      });
      g.stroke();
    }
    function plane(g, fn, t) { K.knock(g, function (g2) { fn(g2); g2.fill(); }); if (t) { fn(g); g.fillStyle = typeof t === "number" ? tone(t) : t; g.fill(); } }
    function streaks(g2) { var c = S.cl, j; for (j = 0; j < c.length; j += 4) g2.fillRect(c[j], c[j + 1], c[j + 2], c[j + 3]); }
    function sky(fn, cl) { return function (g) { skyClip(g); fn(g); K.knock(g, function (g2) { isles(g2); g2.fill(); if (cl) streaks(g2); }); }; }
    function wedges(g, par, k0) {
      var pit = S.pit, i, a, w = pit * 1.24, len = par ? fw * 0.62 : fw * 1.4, c, sn, n = par ? 16 : 1, k, r, o, px, py, e1 = [], e2 = [];
      g.beginPath();
      for (i = par; i < N; i += 2) {
        a = PI + pit * (i + 0.5); c = Math.cos(a); sn = Math.sin(a); e1 = []; e2 = [];
        for (k = 0; k <= n; k++) {                       // the odd rays are wavy flames, the even ones straight
          r = k0 + (len - k0) * k / n; o = par ? Math.sin(r / (R * 0.5)) * pit * r * 0.3 : 0;
          px = SX + c * r - sn * o; py = SY + sn * r + c * o;
          e1.push(px - sn * w * r * 0.5, py + c * w * r * 0.5); e2.push(px + sn * w * r * 0.5, py - c * w * r * 0.5);
        }
        g.moveTo(e1[0], e1[1]);
        for (k = 2; k < e1.length; k += 2) g.lineTo(e1[k], e1[k + 1]);
        for (k = e2.length - 2; k >= 0; k -= 2) g.lineTo(e2[k], e2[k + 1]);
        g.closePath();
      }
    }
    function rg(g, r0, r1, st) { var gr = g.createRadialGradient(SX, SY, r0, SX, SY, r1); st.forEach(function (s) { gr.addColorStop(s[0], tone(s[1])); }); return gr; }
    function ramp(g, y0, y1, st) { g.fillStyle = K.vgrad(g, y0, y1, st); box(g, y0, y1); g.fill(); }
    function gulls(g) { K.knock(g, gullP); }
    var bs = S.fh * 0.075, bx = S.cx(0.44) - bs * 0.6, by = S.cy(0.44) + bs * 0.3;
    function boat(g) {                                 // a sailboat on the road, a hole in everything
      g.beginPath();
      g.moveTo(bx - bs * 0.62, by); g.lineTo(bx + bs * 0.66, by); g.lineTo(bx + bs * 0.42, by + bs * 0.2); g.lineTo(bx - bs * 0.4, by + bs * 0.2); g.closePath();
      g.moveTo(bx + bs * 0.05, by - bs * 1.45); g.lineTo(bx + bs * 0.05, by - bs * 0.1); g.lineTo(bx + bs * 0.62, by - bs * 0.1); g.closePath();
      g.moveTo(bx - bs * 0.02, by - bs * 1.1); g.lineTo(bx - bs * 0.02, by - bs * 0.1); g.lineTo(bx - bs * 0.52, by - bs * 0.1); g.closePath();
      g.fill();
    }
    function knockBoat(g) { K.knock(g, boat); }
    // dawn: a dark sky, magenta and violet at its edges, the orange halo and short rays, the gold rays, the sun and its hot core
    var skyBlue = sky(function (g) {
      ramp(g, L.FY0 - 10, HY, [[0, 0.5], [0.6, 0.3], [1, 0.16]]);
      K.knock(g, function (g2) { disc(g2, 1.1); g2.fill(); });
    }, 1);
    var skyTeal = sky(function (g) {
      ramp(g, L.FY0 - 10, HY, [[0, 0.5], [0.4, 0.1], [0.7, 0]]);
      K.knock(g, function (g2) { disc(g2, 1.1); g2.fill(); });
    });
    var skyOrange = sky(function (g) {
      ramp(g, HY - (HY - L.FY0) * 0.3, HY, [[0, 0], [1, 0.62]]);
      plane(g, function (g2) { wedges(g2, 1, R * 1.15); }, rg(g, R * 1.1, fw * 0.6, [[0, 0.8], [0.5, 0.5], [1, 0.14]]));
      g.fillStyle = rg(g, R * 1.1, R * 3.2, [[0, 0.7], [0.4, 0.32], [1, 0]]); box(g, L.FY0 - 10, HY); g.fill();
      K.knock(g, function (g2) { disc(g2, 1.08); g2.fill(); });
    }, 1);
    var skyGold = sky(function (g) {
      wedges(g, 0, R * 1.15); g.fillStyle = rg(g, R * 1.1, fw * 0.9, [[0, 0.96], [0.2, 0.8], [0.55, 0.5], [1, 0.16]]); g.fill();
      disc(g); g.fillStyle = tone(0.97); g.fill(); gulls(g);
    });
    var skyCore = sky(function (g) {
      g.fillStyle = rg(g, 0, R * 0.96, [[0, 0.85], [0.45, 0.55], [0.8, 0.2], [1, 0.04]]); disc(g, 0.96); g.fill(); gulls(g);
    });
    var hx = HIT[0] * K.d / K.k, hy = HIT[1] * K.d / K.k;
    var skyHit = function (g) {
      g.translate(-hx, -hy); skyClip(g); disc(g, 0.99); g.fillStyle = tone(0.93); g.fill(); gulls(g);
    };
    // the sea: violet, a magenta dawn on it near the horizon, aqua ripples
    function sea(fn) { return function (g) { box(g, HY, L.FY1 + 10); g.clip(); fn(g); }; }
    var seaTeal = sea(function (g) { ramp(g, HY, L.FY1, [[0, 0.7], [0.3, 0.46], [1, 0.22]]); knockBoat(g); });
    var seaBlue = sea(function (g) { ramp(g, HY, L.FY1, [[0, 0.7], [0.4, 0.2], [1, 0]]); knockBoat(g); });
    var seaAqua = sea(function (g) {
      var q = S.rip, k;
      g.fillStyle = tone(0.9); g.beginPath();
      for (k = 0; k < q.length; k += 4) g.rect(q[k], q[k + 1], q[k + 2], q[k + 3]);
      g.fill(); knockBoat(g);
    });
    // the line: the road of light, stripes of stock cut across it
    var road = function (g) {
      var k, p = S.road;
      g.beginPath(); g.moveTo(p[0], p[1]);
      for (k = 2; k < p.length; k += 2) g.lineTo(p[k], p[k + 1]);
      g.closePath(); g.fillStyle = tone(0.94); g.fill();
      g.save(); g.clip();
      K.knock(g, function (g2) {
        var j, b = S.bites;
        for (j = 0; j < S.gaps.length; j += 2) g2.fillRect(x0, S.gaps[j], x1 - x0, S.gaps[j + 1]);
        for (j = 0; j < b.length; j += 4) g2.fillRect(b[j], b[j + 1], b[j + 2], b[j + 3]);
        boat(g2);
      });
      g.restore();
    };
    return [
      { ink: "blue", role: "sky", draw: skyBlue }, { ink: "teal", role: "sky", draw: skyTeal, box: [x0, L.FY0 - 10, x1, HY + 4] }, { ink: "orange", role: "sky", draw: skyOrange, box: [x0, L.FY0 - 10, x1, HY + 4] },
      { ink: "light", role: "sky", draw: skyGold }, { ink: "pink", role: "sky", draw: skyCore },
      { ink: "sun", role: "sky", draw: skyHit, reg: [HIT[0] + 0.6, HIT[1] - 0.5], box: [SX - hx - R - 8, SY - hy - R - 8, SX - hx + R + 8, SY - hy + R + 8] },
      { ink: "teal", role: "land", draw: seaTeal, box: [x0, HY - 2, x1, L.FY1 + 10] }, { ink: "blue", role: "land", draw: seaBlue }, { ink: "pink", role: "land", draw: seaAqua },
      { ink: "sun", role: "line", draw: road, box: [x0, HY - 2, x1, L.FY1 + 10] }
    ];
  }
  function body(g, D, L) {
    g.moveTo(L.FX0 - 12, L.FY1 + 10); g.lineTo(L.FX0 - 12, D.rise.HY); g.lineTo(L.FX1 + 12, D.rise.HY); g.lineTo(L.FX1 + 12, L.FY1 + 10); g.closePath();
  }

  /* ---- the title: the record in double-hit gold with a magenta block shadow, the zero a sun; EVERY RAY beside it ---- */
  function title(K, P, D, L, g) {
    var b = g.box, pos = g.poster, rec = g.record, tone = K.tone, ctx = (g.context || "").toUpperCase(), cs = pos ? 2 : 2.4;
    var x = b[0] + 18, base = b[3] - (pos ? 20 : 14), sz = pos ? 150 : 150, head = rec.slice(0, -1), last = rec.slice(-1), f = K.font(900, sz, "disp");
    var w1 = g.measure(f, head), w0 = g.measure(f, last), rx0 = Math.max(w0 * 0.5, sz * 0.36) + 6, scx = x + w1 + rx0, scy = base - sz * 0.35, sr = sz * 0.44;
    var ps = Math.min(pos ? 60 : 58, sz * 0.4), tx = scx + sr * 1.5 + 20, pw = g.measure(K.font(800, ps, "disp"), "EVERY") + ps * 0.4;
    var mf = K.font(600, pos ? 13 : 22, "mono"), cf = K.font("italic 600", 30, "disp"), cy = pos ? b[1] + 40 : b[1] + 28;
    var cw = Math.max(g.measure(mf, ctx) + cs * ctx.length, pos && g.comp ? g.measure(cf, g.comp) : 0);
    function txt(dx, dy, cov) { return function (t) { t.font = f; t.fillStyle = tone(cov); t.fillText(head, x + dx, base + dy); }; }
    function zero(t, dx, dy, cov) {
      t.fillStyle = tone(cov); K.circle(t, scx + dx, scy + dy, sr); t.fill();
      K.knock(t, function (t2) { t2.font = f; t2.textAlign = "center"; t2.fillText(last, scx + dx, base + dy); t2.textAlign = "left"; });
    }
    var hb = [x - 4, base - sz * 0.8, x + w1 + 14, base + 12], zb = [scx - sr * 1.3, scy - sr * 1.3, scx + sr * 1.3, scy + sr * 1.3];
    g("blue", hb, txt(9, 8, 0.95)); g("blue", zb, function (t) { zero(t, 9, 8, 0.95); });
    g("sun", hb, txt(0, 0, 0.97)); g("sun", hb, txt(1.8, -1.4, 0.9));
    g("sun", zb, function (t) { zero(t, 0, 0, 0.97); }); g("sun", zb, function (t) { zero(t, 1.8, -1.4, 0.9); });
    g("orange", zb, function (t) {                     // the zero's rays, short and chunky
      var k, a, q = pos ? 0.14 : 0.16;
      t.fillStyle = tone(0.95); t.beginPath();
      for (k = 0; k < 18; k++) {
        a = k * TAU / 18; t.moveTo(scx + Math.cos(a - q) * sr * 1.12, scy + Math.sin(a - q) * sr * 1.12); t.lineTo(scx + Math.cos(a) * sr * (k % 2 ? 1.24 : 1.36), scy + Math.sin(a) * sr * (k % 2 ? 1.24 : 1.36));
        t.lineTo(scx + Math.cos(a + q) * sr * 1.12, scy + Math.sin(a + q) * sr * 1.12); t.closePath();
      }
      t.fill();
    });
    g("pink", [tx - 4, base - ps * 1.84, tx + pw + 6, base + ps * 0.1], function (t) {
      t.fillStyle = tone(0.95); t.font = K.font(800, ps, "disp");
      K.spacedText(t, "EVERY", tx, base - ps * 1.02, ps * 0.07, "left"); K.spacedText(t, "RAY", tx, base, ps * 0.07, "left");
    });
    if (ctx || (pos && g.comp)) g("orange", [b[2] - 20 - cw, cy - (pos ? 14 : 22), b[2] - 10, pos && g.comp ? base + 8 : cy + 6], function (t) {
      t.fillStyle = tone(0.9); t.font = mf;
      if (ctx) K.spacedText(t, ctx, b[2] - 16, cy, cs, "right");
      if (pos && g.comp) { t.font = cf; t.textAlign = "right"; t.fillText(g.comp, b[2] - 16, base); t.textAlign = "left"; }
    });
  }

  /* ---- after the reveal: a ring leaves the sun; 82 beads shoot out along the rays, left to right, and settle into a crown; the sea glitters ---- */
  var DUR = 4.6, FLY = 0.9, STEP = 0.03, T0 = 0.3;
  function live(K, P, D, L, t, ink) {
    var S = D.rise, tone = K.tone, R = S.R, SX = S.SX, SY = S.SY, rs = Math.max(0.7, L.rs), i, k, a, p, rr, q;
    var env = 1 - K.smooth(DUR - 1.1, DUR, t), br = (S.ban ? 8.4 : 11.5);
    var pa = [], pb = [], bx = [1e9, 1e9, -1e9, -1e9];
    for (i = 0; i < N; i++) {
      q = (t - T0 - i * STEP) / FLY;
      if (q <= 0) continue;
      p = 1 - Math.pow(1 - Math.min(1, q), 3); a = PI + S.pit * (i + 0.5);
      rr = K.lerp(R * 1.16, R * (1.74 + 0.2 * (i % 2)), p);
      var x = SX + Math.cos(a) * rr, y = SY + Math.sin(a) * rr, sz = br * (0.45 + 0.55 * p) * (1 + 0.5 * Math.max(0, 1 - q) * 0);
      pa.push(x, y, sz, a, p);
      bx[0] = Math.min(bx[0], x - sz - 16); bx[1] = Math.min(bx[1], y - sz - 16); bx[2] = Math.max(bx[2], x + sz + 16); bx[3] = Math.max(bx[3], y + sz + 16);
    }
    if (pa.length) {
      ink("sun", bx, function (g) {
        var j, o;
        g.fillStyle = tone(0.95); g.beginPath();
        for (j = 0; j < pa.length; j += 5) { o = pa[j + 4]; g.moveTo(pa[j] + pa[j + 2], pa[j + 1]); g.arc(pa[j], pa[j + 1], pa[j + 2], 0, TAU); }
        g.fill();
        g.strokeStyle = tone(0.9); g.lineCap = "round"; g.lineWidth = br * 0.9; g.beginPath();   // a streak behind a bead still in flight
        for (j = 0; j < pa.length; j += 5) {
          o = pa[j + 4];
          if (o < 0.97) { var c = Math.cos(pa[j + 3]), s = Math.sin(pa[j + 3]), l = br * 3.6 * (1 - o); g.moveTo(pa[j] - c * l, pa[j + 1] - s * l); g.lineTo(pa[j], pa[j + 1]); }
        }
        g.stroke();
      });
      ink("pink", bx, function (g) {                // the white-hot heart of each bead: aqua over gold
        g.fillStyle = tone(0.9); g.beginPath();
        for (var j = 0; j < pa.length; j += 5) { g.moveTo(pa[j] + pa[j + 2] * 0.5, pa[j + 1]); g.arc(pa[j], pa[j + 1], pa[j + 2] * 0.5, 0, TAU); }
        g.fill();
      });
    }
    var pu = (t - 0.1) / 1.5;                       // the sun's heartbeat: its core whitens once
    if (pu > 0 && pu < 1) {
      ink("pink", [SX - R - 6, SY - R - 6, SX + R + 6, SY + R + 6], function (g) {
        g.fillStyle = tone(0.5 * Math.sin(PI * pu)); K.circle(g, SX, SY, R * 0.97); g.fill();
        K.knock(g, function (g2) { K.circle(g2, SX, SY, R * 0.3 * (1 + pu)); g2.fill(); });
      });
    }
    var sg = S.sp, sb = [1e9, 1e9, -1e9, -1e9], on = [];
    for (k = 0; k < sg.length; k += 5) {            // sparkles on the road: four-point stars that swell and fall back
      var f = 0.62 + 0.38 * env * Math.sin(t * TAU / sg[k + 4] + sg[k + 3]), z = sg[k + 2] * f * (t > 0.4 ? 1 : 0);
      if (z < 1.5) continue;
      on.push(sg[k], sg[k + 1], z);
      sb[0] = Math.min(sb[0], sg[k] - z); sb[1] = Math.min(sb[1], sg[k + 1] - z); sb[2] = Math.max(sb[2], sg[k] + z); sb[3] = Math.max(sb[3], sg[k + 1] + z);
    }
    if (on.length) ink("pink", sb, function (g) {
      g.fillStyle = tone(0.95); g.beginPath();
      for (var j = 0; j < on.length; j += 3) {
        var cx = on[j], cy = on[j + 1], z = on[j + 2];
        g.moveTo(cx, cy - z); g.lineTo(cx + z * 0.22, cy - z * 0.22); g.lineTo(cx + z, cy); g.lineTo(cx + z * 0.22, cy + z * 0.22); g.lineTo(cx, cy + z);
        g.lineTo(cx - z * 0.22, cy + z * 0.22); g.lineTo(cx - z, cy); g.lineTo(cx - z * 0.22, cy - z * 0.22); g.closePath();
      }
      g.fill();
    });
  }

  A.add("scene", "sunrise", {
    name: "Every Ray",
    by: "82-0 only: a sun fully risen over a violet sea, a ray for every win, a road of light to the sun; 82 beads shoot off the rays and settle into a crown.",
    perfect: true,
    lights: ["golden"],
    derive: derive, layers: layers, body: body, title: title,
    live: { dur: DUR, draw: live }
  });
})();
