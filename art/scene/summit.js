/* ---------- TRUE 82 ART: THE SUMMIT (a perfect scene: it prints only an 82-0) ----------
   The owner (2026-09-30): 82-0 must feel "so much better than 81-1". The season is the climb: every win a step up
   the ridge, seven pitches for the seven months with a pennant at each month's camp, and on the last game the
   summit, the highest point of a range of lesser peaks over a sea of cloud, with a flag planted on it against a
   sun of double-hit gold. After the reveal, riso fireworks go up over the range and the last three freeze into
   the print. The title is a champion's: the record in double-hit gold over a block shadow, PERFECT SEASON beside
   it. Rules: art/CONTRACT.md ("A scene") and art/CONTRACT-FX.md ("Perfect scenes"). Tone only: black at an alpha
   is coverage, never a color. */
(function () {
  "use strict";
  var A = typeof window !== "undefined" ? window.T82ART : null;
  if (!A || typeof A.add !== "function") return;

  var CAMPS = [5, 20, 35, 50, 61, 76, 82];               // the games that close each month (the strip's ticks)
  var HIT = [5, -4];                                     // the second gold hit's plate offset, css px
  var TAU = Math.PI * 2;

  function derive(K, D, L) {
    var r = K.rand((D.seed * 2654435761 + 820) >>> 0), fw = L.FX1 - L.FX0, fh = L.FY1 - L.FY0, vs = L.vs, rs = L.rs, ban = vs < 1;
    var xa = L.FX0 - 12, xs = L.FX0 + fw * 0.8, ya = L.FY1 - fh * 0.03, ys = L.FY0 + fh * (ban ? 0.34 : 0.4), xe = L.FX1 + 12;
    var nc = K.noise1D(D.seed + 3), na = K.noise1D(D.seed + 5), nb = K.noise1D(D.seed + 9), x, i, j;
    // game g of the climb as a height from 0 to 1: steeper toward the top, and within each month a steep pitch
    // between two flatter camps; it rises with every game (the record never steps down)
    function lift(g) {
      var m = 0;
      while (m < 6 && g > CAMPS[m]) m++;
      var g0 = m ? CAMPS[m - 1] : 0, g1 = CAMPS[m], v = (g - g0) / (g1 - g0), u = (g0 + (g1 - g0) * (v - 0.12 * Math.sin(TAU * v))) / 82;
      return 0.45 * u + 0.55 * Math.pow(u, 2.2);
    }
    function gx(g) { return xa + (xs - xa) * g / 82; }
    var cw = ban ? 0.6 : 1;
    function crag(x) { return (K.fbm(nc, x * 0.034 / cw, 3) * 12 + K.fbm(nc, x * 0.11 / cw + 40, 2) * 4) * vs * K.smooth(0, 30 * rs, Math.abs(x - xs)); }
    // every plate traces these lines several times: each is worked out once per point
    function memo(fn) { var c = {}; return function (x) { var k = Math.round(x * 4); return k in c ? c[k] : (c[k] = fn(x)); }; }
    var ridge = memo(function (x) {
      if (x <= xs) return ya - (ya - ys) * lift(82 * Math.max(0, x - xa) / (xs - xa)) + crag(x);
      return ys + fh * 0.62 * Math.pow((x - xs) / (xe - xs), 0.7) + crag(x) * 1.6;
    });
    // the lesser peaks: two ranges behind, the near in front of the far, none as high as the summit
    var cloud = ya - fh * 0.27, top = ys + fh * 0.07;
    function peaks(n, x, f, h, base) {
      var v = 1 - Math.abs(K.fbm(n, x * f, 4)) * 2.4;
      return Math.max(top, base - h * Math.pow(K.clamp(v, 0, 1), 1.3) - h * 0.3 * (0.5 + K.fbm(n, x * f * 0.27 + 9, 2)));
    }
    var farA = memo(function (x) { return peaks(na, x, 0.006 / cw, (cloud - top) * 0.8, cloud + 4 * vs); });
    var farB = memo(function (x) { return peaks(nb, x, 0.0042 / cw, (cloud - top) * 1.1, cloud - 14 * vs); });
    var R = fw * (ban ? 0.115 : 0.16), sun = { x: xs + R * 0.35, y: ys - R * 0.12, r: R };
    var fl = { x: xs, y0: ys + 2, y1: sun.y - R * 0.95, pw: Math.max(3.2, 4.6 * rs), w: R * 0.9, h: R * 0.5 };
    // spurs: lesser ridges running down the face from crags on the climb; their crests catch the rim light
    var spurs = [];
    for (i = 0; i < 10; i++) {
      x = xa + (xs - xa) * (0.1 + i * 0.092 + (r() - 0.5) * 0.04);
      var pts = [x, ridge(x) + 2 * vs], y = pts[1], dx = -(8 + r() * 14) * rs;
      for (j = 0; y < L.FY1 + 10 && j < 40; j++) { y += (12 + r() * 10) * vs; x += dx * (0.5 + r()); pts.push(x, y); }
      spurs.push(pts);
    }
    // the cloud sea's scalloped top
    var lobes = [];
    for (x = L.FX0 - 40; x < L.FX1 + 40; x += j * 2) { j = (14 + r() * 18) * rs; lobes.push(x + j, j); }
    D.sum = { xa: xa, xs: xs, ya: ya, ys: ys, xe: xe, ridge: ridge, gx: gx, farA: farA, farB: farB, cloud: cloud, top: top,
      sun: sun, fl: fl, spurs: spurs, lobes: lobes, R: R, fw: fw, fh: fh, ban: ban };
  }

  function layers(K, P, D, L) {
    var S = D.sum, tone = K.tone, vs = L.vs, rs = L.rs, x0 = L.FX0 - 12, x1 = L.FX1 + 12, sun = S.sun, fl = S.fl;
    function trace(g, fn) { K.trace(g, fn, x0, x1, 2); }
    function skyClip(g) { g.beginPath(); g.moveTo(x0, L.FY0 - 10); trace(g, S.ridge); g.lineTo(x1, L.FY0 - 10); g.closePath(); g.clip(); }
    function bodyPath(g) { g.beginPath(); g.moveTo(x0, L.FY1 + 10); trace(g, S.ridge); g.lineTo(x1, L.FY1 + 10); g.closePath(); }
    function under(g, fn) { g.beginPath(); g.moveTo(x0, L.FY1 + 10); trace(g, fn); g.lineTo(x1, L.FY1 + 10); g.closePath(); }
    function cloudPath(g) {
      var Lb = S.lobes, j;
      g.beginPath(); g.moveTo(x0, L.FY1 + 10); g.lineTo(x0, S.cloud);
      for (j = 0; j < Lb.length; j += 2) g.arc(Lb[j], S.cloud, Lb[j + 1], Math.PI, 0);
      g.lineTo(x1, S.cloud); g.lineTo(x1, L.FY1 + 10); g.closePath();
    }
    // a plane that owns its value on this plate: clear the plate under it, then lay its tone
    function plane(g, path, t) { K.knock(g, function (g2) { path(g2); g2.fill(); }); if (t) { path(g); g.fillStyle = typeof t === "number" ? tone(t) : t; g.fill(); } }
    function disc(g, k) { K.circle(g, sun.x, sun.y, sun.r * (k || 1)); }
    function grad(g, y0, y1, stops) { g.fillStyle = K.vgrad(g, y0, y1, stops); g.fillRect(L.FX0, L.FY0, L.FX1 - L.FX0, L.FY1 - L.FY0); }
    function farB(g) { under(g, S.farB); }
    function farA(g) { under(g, S.farA); }
    // the flag and its pole, and a keyline of bare stock around them where they cross the sky
    function flagPath(g, dx, dy, grow) {
      var x = fl.x + dx, y = fl.y1 + dy, w = fl.w, h = fl.h, e = grow || 0, j, q;
      g.beginPath(); g.moveTo(x - e, y - e);
      for (j = 0; j <= 10; j++) { q = j / 10; g.lineTo(x + w * q + (j === 10 ? e : 0), y - e + Math.sin(q * 4.2) * h * 0.1 + h * 0.06 * q); }
      for (j = 10; j >= 0; j--) { q = j / 10; g.lineTo(x + w * q - (j === 10 ? w * 0.14 - e : 0), y + h + e + Math.sin(q * 4.2) * h * 0.1 - h * 0.04 * q); }
      g.closePath();
      g.rect(x - fl.pw / 2 - e / 2, y - 4 * rs - e, fl.pw + e, fl.y0 - y + 4 * rs + e);
    }
    function num(g) { g.font = K.font(800, fl.h * 0.78, "disp"); g.textAlign = "center"; g.fillText("82", fl.x + fl.w * 0.45, fl.y1 + fl.h * 0.82); }
    function keyline(g) { K.knock(g, function (g2) { flagPath(g2, 0, 0, 3.2 * Math.max(0.8, rs)); g2.fill(); }); }
    function sky(fn) { return function (g) { skyClip(g); fn(g); keyline(g); }; }

    // the sun's halo: stepped rings of gold over an orange glow, a printed corona
    var rk = S.ban ? 1 : 0.84;            // the poster's sun is bigger; its halo stays in the sky
    function rings(g) { [[2.2, 1.95, 0.26], [1.74, 1.52, 0.42], [1.36, 1.17, 0.62]].forEach(function (q) { g.beginPath(); g.arc(sun.x, sun.y, sun.r * q[0] * rk, 0, TAU); g.arc(sun.x, sun.y, sun.r * q[1] * rk, 0, TAU, true); g.fillStyle = tone(q[2]); g.fill(); }); }
    function ringZone(g) { disc(g, 2.25 * rk); }
    // gold: the sun's first hit and its halo, the haze over the far range, the cloud sea's lit tops
    var skyGold = sky(function (g) {
      grad(g, L.FY0, S.cloud, [[0, 0], [0.6, 0.04], [1, 0.26]]);
      plane(g, ringZone, 0); rings(g);
      plane(g, disc, 0.97);
      plane(g, farB, K.vgrad(g, S.top, S.cloud, [[0, 0.12], [1, 0]]));
      plane(g, farA, 0);
      plane(g, cloudPath, K.vgrad(g, S.cloud - 26 * rs, L.FY1, [[0, 0.85], [0.14, 0.45], [0.5, 0.2], [1, 0.1]]));
    });
    // the second hit of gold: the disc again through the drum a second time. The plate runs HIT css px off and is
    // drawn HIT back, so the disc lands a hair off the first (the fringe) while its starve specks fall elsewhere:
    // each hit fills the other's pinholes, which is why a printer double-hits a solid
    var hx = HIT[0] * K.d / K.k, hy = HIT[1] * K.d / K.k, hb = sun.r + 6;
    var skyHit = function (g) {
      g.translate(-hx, -hy);
      g.beginPath(); g.rect(L.FX0, L.FY0, L.FX1 - L.FX0, L.FY1 - L.FY0); g.clip();
      sky(function (g2) { disc(g2, 0.99); g2.fillStyle = tone(0.94); g2.fill(); })(g);
    };
    var skyOrange = sky(function (g) {
      grad(g, L.FY0, S.cloud, [[0, 0], [0.35, 0.04], [0.75, 0.3], [1, 0.55]]);
      plane(g, ringZone, K.vgrad(g, sun.y - sun.r * 2, sun.y + sun.r * 2, [[0, 0.24], [1, 0.4]]));
      K.knock(g, function (g2) { disc(g2); g2.fill(); });
      plane(g, farB, K.vgrad(g, S.top, S.cloud, [[0, 0.45], [1, 0.3]]));
      plane(g, farA, 0.08);
      plane(g, cloudPath, K.vgrad(g, S.cloud - 26 * rs, L.FY1, [[0, 0.55], [0.3, 0.45], [1, 0.25]]));
    });
    // violet: the night sky leaving the top of the frame, and both lesser ranges, the near one denser
    var skyViolet = sky(function (g) {
      grad(g, L.FY0, S.cloud, [[0, 0.4], [0.45, 0.3], [0.8, 0.07], [1, 0]]);
      plane(g, ringZone, 0);
      plane(g, farB, K.vgrad(g, S.top, S.cloud, [[0, 0.32], [1, 0.42]]));
      plane(g, farA, K.vgrad(g, S.top, S.cloud, [[0, 0.72], [1, 0.56]]));
      plane(g, cloudPath, 0);
    });

    // the mountain: backlit, a dark mass whose crests glow
    function rim(g, w, t, end) {
      g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = tone(t); g.lineWidth = w;
      g.beginPath(); g.moveTo(x0, S.ridge(x0)); K.trace(g, S.ridge, x0, end || x1, 2); g.stroke();
    }
    function spurs(g, w, t) {
      g.strokeStyle = tone(t); g.lineWidth = w; g.lineJoin = "round"; g.lineCap = "round"; g.beginPath();
      S.spurs.forEach(function (p) { g.moveTo(p[0], p[1]); for (var j = 2; j < p.length; j += 2) g.lineTo(p[j], p[j + 1]); });
      g.stroke();
    }
    // the snowfield under the summit, its lower edge torn into gullies
    function snow(g) {
      var j, n = K.noise1D(D.seed + 21), xl = S.xs - (S.xs - S.xa) * 0.3, xr = S.xs + (S.xe - S.xs) * 0.5, deep = S.fh * 0.22;
      g.beginPath(); g.moveTo(xl, S.ridge(xl)); K.trace(g, S.ridge, xl, xr, 2);
      for (j = xr; j >= xl; j -= 2) g.lineTo(j, S.ridge(j) + 3 + deep * K.smooth(xl, S.xs, j) * (1 - K.smooth(S.xs, xr, j)) * (0.55 + 0.45 * Math.abs(K.fbm(n, j * 0.05 / Math.max(0.6, vs), 3)) * 2));
      g.closePath();
    }
    // the sunlit side of each spur: a wedge that opens as the spur runs down
    function lit(g) {
      g.beginPath();
      S.spurs.forEach(function (p) {
        var j, n = p.length;
        g.moveTo(p[0], p[1]);
        for (j = 2; j < n; j += 2) g.lineTo(p[j], p[j + 1]);
        for (j = n - 2; j >= 0; j -= 2) g.lineTo(p[j] + (3 + j / n * 34) * rs, p[j + 1] + (1 - j / n) * 2);
        g.closePath();
      });
    }
    function body(fn) { return function (g) { g.save(); bodyPath(g); g.clip(); fn(g); g.restore(); }; }
    var landGold = body(function (g) {
      lit(g); g.fillStyle = tone(0.26); g.fill();
      rim(g, 20 * rs, 0.32); rim(g, 9 * rs, 0.85);
      spurs(g, 3.2 * rs, 0.7);
      snow(g); g.fillStyle = tone(0.3); g.fill();
    });
    var landAqua = body(function (g) { snow(g); g.fillStyle = tone(0.82); g.fill(); });
    var landKey = function (g) {
      g.save(); bodyPath(g); g.clip();
      grad(g, S.ys, L.FY1, [[0, 0.5], [1, 0.85]]);
      K.knock(g, function (g2) { snow(g2); g2.fill(); lit(g2); g2.fill(); spurs(g2, 2.6 * rs, 1); });
      g.restore();
      // the flag's block shadow: off to the lower right, cleared under the cloth (it prints pure aqua) but for the 82
      flagPath(g, 5 * Math.max(0.8, rs), 5 * Math.max(0.8, rs)); g.fillStyle = tone(0.95); g.fill();
      K.knock(g, function (g2) { flagPath(g2, 0, 0); g2.fill(); });
      num(g);
    };
    var line = function (g) {
      rim(g, 5.4 * Math.max(0.72, rs), 1, S.xs);         // the season is the climb: its line ends on the summit
      // a pennant at each month's camp on the way up
      var hh = 15 * Math.max(0.85, rs);
      g.beginPath();
      CAMPS.slice(0, 6).forEach(function (c) {
        var x = S.gx(c), y = S.ridge(x) - 1;
        g.rect(x - 1.2, y - hh * 1.9, 2.4 * Math.max(0.8, rs), hh * 1.9);
        g.moveTo(x + 1, y - hh * 1.9); g.lineTo(x + hh * 1.1, y - hh * 1.55); g.lineTo(x + 1, y - hh * 1.2); g.closePath();
      });
      g.fillStyle = tone(0.95); g.fill();
      flagPath(g, 0, 0); g.fill();
      K.knock(g, num);
    };
    return [
      { ink: "teal", role: "sky", draw: skyViolet },
      { ink: "orange", role: "sky", draw: skyOrange }, { ink: "light", role: "sky", draw: skyGold },
      { ink: "sun", role: "sky", draw: skyHit, reg: [HIT[0] + 0.7, HIT[1] - 0.6], box: [sun.x - hx - hb, sun.y - hy - hb, sun.x - hx + hb, sun.y - hy + hb] },
      { ink: "light", role: "land", draw: landGold }, { ink: "pink", role: "land", draw: landAqua },
      { ink: "blue", role: "land", draw: landKey },
      { ink: "pink", role: "line", draw: line }
    ];
  }
  // the fill's front line runs down through the mountain (an 82-0 never shows it: the color fills the frame)
  function body(g, D, L) {
    var S = D.sum, x;
    g.moveTo(L.FX0 - 12, L.FY1 + 10);
    for (x = L.FX0 - 12; x < L.FX1 + 12; x += 2) g.lineTo(x, S.ridge(x));
    g.lineTo(L.FX1 + 12, L.FY1 + 10); g.closePath();
  }

  /* ---- the champion's title: the record in double-hit gold over a block shadow, PERFECT SEASON beside it ---- */
  function title(K, P, D, L, g) {
    var b = g.box, pos = g.poster, rec = g.record, tone = K.tone, ctx = (g.context || "").toUpperCase(), cs = pos ? 2 : 2.4;
    var x = b[0] + 18, base = b[3] - (pos ? 20 : 14), sz = pos ? 150 : 152, maxW = pos ? 430 : 460, w = g.measure(K.font(900, sz, "disp"), rec);
    if (w > maxW) { sz *= maxW / w; w = maxW; }
    var rx = x + w + (pos ? 36 : 30), ps = Math.min(pos ? 60 : 56, sz * 0.42), pw = g.measure(K.font(800, ps, "disp"), "PERFECT") + ps * 0.45;
    var mf = K.font(600, pos ? 13 : 22, "mono"), cf = K.font("italic 600", 30, "disp"), cy = pos ? b[1] + 40 : b[1] + 28;
    var cw = Math.max(g.measure(mf, ctx) + cs * ctx.length, pos && g.comp ? g.measure(cf, g.comp) : 0), y = base - ps * 2.08;
    function record(dx, dy, cov) { return function (t) { t.font = K.font(900, sz, "disp"); t.fillStyle = tone(cov); t.fillText(rec, x + dx, base + dy); }; }
    var rb = [x - 4, base - sz * 0.8, x + w + 14, base + 12];
    g("blue", rb, record(10, 9, 0.95));
    g("sun", rb, record(0, 0, 0.97));
    g("sun", rb, record(1.8, -1.4, 0.9));        // the second hit: brighter where it lands on the first
    g("sun", [rx, y - ps * 0.25, rx + ps * 3.1, y + ps * 0.22], function (t) {   // a crown of five stars
      for (var j = 0; j < 5; j++) star(t, rx + ps * 0.24 + j * ps * 0.62, y, ps * 0.21);
    });
    g("pink", [rx - 4, base - ps * 1.84, rx + pw + 6, base + ps * 0.1], function (t) {
      t.fillStyle = tone(0.95); t.font = K.font(800, ps, "disp");
      K.spacedText(t, "PERFECT", rx, base - ps * 1.02, ps * 0.07, "left");
      K.spacedText(t, "SEASON", rx, base, ps * 0.07, "left");
    });
    if (ctx || (pos && g.comp)) g("orange", [b[2] - 20 - cw, cy - (pos ? 14 : 22), b[2] - 10, pos && g.comp ? base + 8 : cy + 6], function (t) {
      t.fillStyle = tone(0.9); t.font = mf;
      if (ctx) K.spacedText(t, ctx, b[2] - 16, cy, cs, "right");
      if (pos && g.comp) { t.font = cf; t.textAlign = "right"; t.fillText(g.comp, b[2] - 16, base); t.textAlign = "left"; }
    });
  }
  function star(t, x, y, r) {
    t.beginPath();
    for (var j = 0; j < 10; j++) { var a = -Math.PI / 2 + j * Math.PI / 5, q = j % 2 ? r * 0.45 : r; t.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    t.closePath(); t.fill();
  }

  /* ---- after the reveal: fireworks over the range; the last three freeze into the print ---- */
  var DUR = 6, RISE = 0.4, LIFE = 1.7;
  // [launch, main ink, tip ink, size, finale]; where each bursts, per layout, as fractions of the frame: in the sky
  // the roster leaves open (the banner's names fill its left half, the poster's its upper left)
  var PLAN = [[0, "light", "orange", 0.9], [0.55, "pink", "teal", 0.7], [1.15, "blue", "pink", 0.8], [1.8, "pink", "light", 0.85],
    [2.45, "orange", "light", 0.75], [3.05, "light", "orange", 0.8], [3.7, "light", "orange", 1, 1], [4.05, "pink", "teal", 0.62, 1], [4.4, "blue", "pink", 0.55, 1]];
  var AT = { b: [0.56, 0.24, 0.46, 0.5, 0.5, 0.14, 0.93, 0.12, 0.52, 0.36, 0.45, 0.32, 0.58, 0.22, 0.46, 0.52, 0.43, 0.13],
    p: [0.3, 0.6, 0.8, 0.08, 0.55, 0.56, 0.15, 0.62, 0.66, 0.1, 0.42, 0.6, 0.64, 0.11, 0.48, 0.56, 0.17, 0.62] };
  function shells(K, D, L) {
    var S = D.sum;
    if (S.fwk) return S.fwk;
    var rnd = K.rand((D.seed * 7919 + 82) >>> 0), size = S.ban ? S.fh * 0.27 : S.fw * 0.15, at = S.ban ? AT.b : AT.p;
    S.fwk = PLAN.map(function (p, i) {
      var cx = L.FX0 + S.fw * at[i * 2], cy = L.FY0 + S.fh * at[i * 2 + 1], lx = cx + (rnd() - 0.5) * 50 * L.rs, n = p[4] ? 30 : 20 + Math.floor(rnd() * 8), st = [], a0 = rnd() * TAU;
      for (var j = 0; j < n; j++) st.push(a0 + j * TAU / n + (rnd() - 0.5) * 0.14, 0.8 + rnd() * 0.26);
      return { t0: p[0], cx: cx, cy: cy, lx: lx, ly: Math.max(cy + 20, S.ridge(lx)), R: size * p[3], st: st, a: p[1], b: p[2], fin: !!p[4] };
    });
    return S.fwk;
  }
  function dot(g, x, y, r) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); }   // one path, one fill: dots never stack
  function live(K, P, D, L, t, ink) {
    var tone = K.tone, rs = Math.max(0.7, L.rs);
    shells(K, D, L).forEach(function (s) {
      var e = t - s.t0;
      if (e < 0) return;
      if (e < RISE) {                     // the shell climbs from the range, a trail of dots
        var p = K.ease(e / RISE);
        ink(s.a, [Math.min(s.cx, s.lx) - 10, s.cy - 10, Math.max(s.cx, s.lx) + 10, s.ly + 6], function (g) {
          g.fillStyle = tone(0.95); g.beginPath();
          for (var j = 0; j < 7; j++) { var q = Math.max(0, p - j * 0.045); dot(g, K.lerp(s.lx, s.cx, q), K.lerp(s.ly, s.cy, q), (3.4 - j * 0.38) * rs + 0.5); }
          g.fill();
        });
        return;
      }
      var b = e - RISE;
      if (!s.fin && b > LIFE) return;
      // a burst opens fast and slows; an ordinary one droops and burns down, a finale shell freezes at full bloom
      var gr = s.fin ? 1 - Math.pow(1 - Math.min(1, b / 1.2), 3) : 1 - Math.exp(-b * 4.2);
      var cov = s.fin ? 0.95 : 0.95 * K.clamp(1 - (b - 0.5) / (LIFE - 0.5), 0, 1), drop = (s.fin ? 0.3 * Math.min(b, 1.2) / 1.2 : b * b * 0.24) * s.R;
      var rr = s.R * gr, m = rr * 1.14 + 8, box = [s.cx - m, s.cy - m, s.cx + m, s.cy + m + drop];
      // the finale's shells print in two inks (streaks and stars); the others in one, to keep each frame light
      function streaks(g) {
        g.strokeStyle = tone(cov); g.lineCap = "round"; g.lineWidth = 5.6 * rs * (s.fin ? 1 : 1 - b / LIFE * 0.45);
        g.beginPath();
        for (var j = 0; j < s.st.length; j += 2) {
          var a = s.st[j], c = Math.cos(a), sn = Math.sin(a), r1 = rr * s.st[j + 1], r0 = r1 * (s.fin ? 0.38 : 0.55 + 0.2 * Math.min(1, b));
          g.moveTo(s.cx + c * r0, s.cy + sn * r0 + drop * 0.5); g.lineTo(s.cx + c * r1, s.cy + sn * r1 + drop);
        }
        g.stroke();
      }
      function tips(g) {
        g.fillStyle = tone(cov); g.beginPath();
        for (var j = 0; j < s.st.length; j += 2) {
          var a = s.st[j], r1 = rr * s.st[j + 1] * 1.06;
          dot(g, s.cx + Math.cos(a) * r1, s.cy + Math.sin(a) * r1 + drop, 5.2 * rs + 0.6);
        }
        g.fill();
        K.circle(g, s.cx, s.cy + drop * 0.3, rr * 0.14); g.fillStyle = tone(cov * 0.6); g.fill();
      }
      if (s.fin) { ink(s.a, box, streaks); ink(s.b, box, tips); } else ink(s.a, box, function (g) { streaks(g); tips(g); });
    });
  }

  A.add("scene", "summit", {
    name: "The Summit",
    by: "82-0 only: the season climbs a range to its summit, a flag against a double-hit gold sun, fireworks after.",
    perfect: true,
    lights: ["golden"],
    derive: derive, layers: layers, body: body, title: title,
    live: { dur: DUR, draw: live }
  });
})();
