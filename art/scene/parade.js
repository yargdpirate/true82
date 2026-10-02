/* ---------- TRUE 82 ART: THE PARADE (a perfect scene: it prints only an 82-0) ----------
   The champions' night on the avenue: seven towers, one per month, climb a staircase to the right (each as tall as the
   record on the month's last night), every window lit against a magenta and gold glow, searchlights crossing, streamers
   hanging down the faces, the trophy on a float at the foot of the tallest. The season's line is the neon roofline.
   Title: the record in double-hit gold, PARADE DAY. After the reveal a fountain of ticker tape bursts off each roof,
   left to right, slows and hangs; the print keeps it. Rules: art/CONTRACT.md, art/CONTRACT-FX.md. Tone only. */
(function () {
  "use strict";
  var A = typeof window !== "undefined" ? window.T82ART : null;
  if (!A || typeof A.add !== "function") return;
  var TAU = Math.PI * 2, CUM = [0, 5, 20, 35, 50, 61, 76, 82];
  // each tower's setbacks: [where a step starts (a fraction of the height from the top), how far it is inset]
  var STEPS = [[[0, 0.26], [0.16, 0]], [[0, 0.3], [0.12, 0.14], [0.3, 0]], [[0, 0.36], [0.1, 0.24], [0.22, 0.12], [0.36, 0]], [[0, 0.1], [0.06, 0]],
    [[0, 0.3], [0.1, 0.16], [0.24, 0]], [[0, 0.34], [0.08, 0.22], [0.18, 0.1], [0.3, 0]], [[0, 0.5], [0.12, 0.36], [0.22, 0.24], [0.36, 0.12], [0.52, 0]]];

  function derive(K, D, L) {
    var fw = L.FX1 - L.FX0, fh = L.FY1 - L.FY0, ban = L.vs < 1, rs = L.rs, r = K.rand((D.seed * 2654435761 + 8242) >>> 0), x0 = L.FX0, y0 = L.FY0;
    var GY = y0 + fh * (ban ? 0.8 : 0.84), st = L.FY1 - GY, top0 = y0 + fh * 0.07, sc = ban ? 1 : 1.25, B = [], k, i, x, m = D.m[82] || 82;
    function add(xa, xb, H, stp, sp) {
      var cx = (xa + xb) / 2, hw = (xb - xa) / 2, y = GY - H, seg = [], P = [], n;
      for (n = 0; n < stp.length; n++) seg.push([y + stp[n][0] * H, n + 1 < stp.length ? y + stp[n + 1][0] * H : GY, cx - hw * (1 - stp[n][1]), cx + hw * (1 - stp[n][1])]);
      for (n = 0; n < seg.length; n++) P.push(seg[n][2], seg[n][0], seg[n][2], seg[n][1]);
      for (n = seg.length - 1; n >= 0; n--) P.push(seg[n][3], seg[n][1], seg[n][3], seg[n][0]);
      B.push({ xa: xa, xb: xb, cx: cx, hw: hw, seg: seg, P: P, sp: sp || 0 });
    }
    add(x0 - 14, D.X(0) - 5, fh * 0.1, [[0, 0.2], [0.3, 0]]);
    for (k = 0; k < 7; k++) add(D.X(CUM[k]) + 3, D.X(CUM[k + 1]) - 3, (GY - top0) * (0.16 + 0.84 * Math.pow(D.m[CUM[k + 1]] / m, 1.15)) * (k === 6 ? 0.97 : 1), STEPS[k], k === 4 ? 1 : k === 6 ? 2 : 0);
    add(D.X(82) + 5, L.FX1 + 14, fh * 0.2, [[0, 0.16], [0.2, 0]]);
    // windows: a grid on every segment of every tower, each lit
    var px = ban ? 31 : 27, py = ban ? 24 : 34, ww = px * 0.5, wh = py * 0.58, W = [];
    B.forEach(function (b) {
      b.seg.forEach(function (s) {
        var mg = 6 * rs + 3, n = Math.floor((s[3] - s[2] - 2 * mg + px - ww) / px), rows = Math.floor((s[1] - s[0] - mg - py * 0.5 + py - wh) / py), c, rr;
        for (c = 0; c < n; c++) for (rr = 0; rr < rows; rr++) {
          var wx = (s[2] + s[3]) / 2 - (n * px - px + ww) / 2 + c * px, wy = s[0] + mg + rr * py;
          if (wy + wh < GY - 8 * rs) W.push(wx, wy);
        }
      });
    });
    // the roofline: the staircase's upper edge sampled in one line (across an alley it holds the last height)
    var env = [], ey = GY, xx, bk = [], nb = K.noise1D(D.seed + 3);
    for (xx = x0 - 12; xx <= L.FX1 + 12; xx += 2) {
      var best = 1e9;
      B.forEach(function (b) { if (xx >= b.xa && xx <= b.xb) b.seg.forEach(function (s) { if (xx >= s[2] && xx <= s[3] && s[0] < best) best = s[0]; }); });
      if (best < 1e9) ey = best;
      env.push(xx, ey);
    }
    // a second, paler row of towers behind
    for (xx = x0 - 20; xx < L.FX1 + 20; xx += (36 + 30 * r()) * rs * 1.4) bk.push(xx, (36 + 30 * r()) * rs * 1.4, GY - (GY - top0) * (0.42 + 0.28 * Math.abs(K.fbm(nb, xx * 0.01, 2)) * 2 + 0.1 * r()), r() < 0.3 ? 1 : 0);
    // searchlights: [base x as a fraction of the width, lean]
    var BM = [[0.12, 0.3], [0.45, -0.2], [0.8, -0.34]].map(function (q) { return { x: x0 + fw * q[0], a: q[1] }; });
    // the street: a crowd along the far kerb, the float with the trophy and its fans
    var heads = [], rr0 = ban ? 5.4 : 8, fx = x0 + fw * (ban ? 0.83 : 0.79), fwid = fw * (ban ? 0.15 : 0.18), fy = GY + st * 0.5, figs = [];
    for (x = x0 - 6; x < L.FX1 + 8; x += rr0 * 1.7) heads.push(x + (r() - 0.5) * 3, GY + st * 0.16 + (r() - 0.5) * 4, rr0 * (0.85 + r() * 0.3));
    for (i = 0; i < 7; i++) figs.push([fx + (i % 2 ? 1 : -1) * (fwid * 0.3 + (i >> 1) * fwid * 0.22), fy + 1, (0.95 + 0.3 * r()) * sc]);
    var carp = [], z = sc * (ban ? 1.2 : 1);
    for (i = 0; i < (ban ? 64 : 120); i++) carp.push([x0 + fw * r(), GY + st * (0.22 + 0.74 * r()), (r() - 0.5) * 0.8, (8 + r() * 9) * z, (2.6 + r() * 2.2) * z, Math.floor(r() * 3)]);
    var rbn = [];
    for (k = 1; k <= 7; k++) for (i = 0; i < (k < 3 ? 1 : 2); i++) { var bb = B[k], tp = bb.seg[0][0]; rbn.push({ x: bb.cx + (i ? 1 : -1) * bb.hw * (0.3 + 0.25 * r()), y: tp + 3, len: (GY - tp) * (0.45 + 0.4 * r()), ph: r() * TAU, ink: (k + i) % 2 }); }
    var dim = [];
    for (i = 0; i < (ban ? 70 : 130); i++) { xx = x0 + fw * r(); dim.push([xx, y0 + fh * 0.04 + (GY - y0 - fh * 0.1) * Math.pow(r(), 0.8), r() * TAU, (8 + r() * 9) * z, (2.6 + r() * 2.2) * z, r() < 0.5 ? 0 : 1]); }
    D.pr = { rbn: rbn, dim: dim, carp: carp, ban: ban, fw: fw, fh: fh, GY: GY, st: st, B: B, W: W, ww: ww, wh: wh, BM: BM, heads: heads, fx: fx, fy: fy, fwid: fwid, figs: figs, sc: sc, top0: top0, env: env, bk: bk };
  }

  function layers(K, P, D, L) {
    var S = D.pr, tone = K.tone, x0 = L.FX0 - 12, x1 = L.FX1 + 12, GY = S.GY, rs = L.rs, ban = S.ban, fh = S.fh, sc = S.sc, B = S.B, st = S.st;
    var bh = fh * (ban ? 0.25 : 0.24), tr = bh * 0.19;
    function sil(g) {
      g.beginPath();
      B.forEach(function (b) {
        var P = b.P, j;
        g.moveTo(P[0], P[1]);
        for (j = 2; j < P.length; j += 2) g.lineTo(P[j], P[j + 1]);
        g.closePath();
        if (b.sp) {                                    // a mast on the fifth tower, the needle on the last
          var h = b.sp === 2 ? fh * 0.2 : fh * 0.07, w = b.sp === 2 ? 7 * sc : 4 * sc, e = b.seg[0];
          g.moveTo(b.cx - w, e[0]); g.lineTo(b.cx, e[0] - h); g.lineTo(b.cx + w, e[0]); g.closePath();
        }
      });
    }
    function skyClip(g) { g.beginPath(); g.rect(x0, L.FY0 - 10, x1 - x0, GY - L.FY0 + 10); g.clip(); }
    function sky(fn) { return function (g) { skyClip(g); fn(g); K.knock(g, function (g2) { sil(g2); g2.fill(); }); }; }
    function ramp(g, y0, y1, s) { g.fillStyle = K.vgrad(g, y0, y1, s); g.fillRect(x0, y0, x1 - x0, y1 - y0); }
    function windows(g, e) { g.beginPath(); for (var j = 0; j < S.W.length; j += 2) g.rect(S.W[j] - e, S.W[j + 1] - e, S.ww + 2 * e, S.wh + 2 * e); }
    // the float: a flatbed, the trophy (a ball with seams on a flared stem), fans with their arms up
    function trophy(g, e) {
      var tx = S.fx, ty = S.fy - 2 * sc, bcy = ty - bh + tr;
      g.beginPath(); K.circle(g, tx, bcy, tr + e);
      g.moveTo(tx - tr * 0.5 - e, bcy + tr * 0.8); g.lineTo(tx + tr * 0.5 + e, bcy + tr * 0.8); g.lineTo(tx + tr * 0.16, ty - bh * 0.34); g.lineTo(tx + tr * 0.9 + e, ty - bh * 0.06 - e);
      g.lineTo(tx + tr * 1.05 + e, ty + e); g.lineTo(tx - tr * 1.05 - e, ty + e); g.lineTo(tx - tr * 0.9 - e, ty - bh * 0.06 - e); g.lineTo(tx - tr * 0.16, ty - bh * 0.34); g.closePath(); g.fill();
    }
    function fans(g) {
      g.lineCap = "round"; g.lineWidth = 3.4 * sc; g.beginPath();
      S.figs.forEach(function (f) {
        var s = f[2], hy = f[1] - 24 * s;
        g.moveTo(f[0] + 5 * s, hy); g.arc(f[0], hy, 5 * s, 0, TAU);
        g.moveTo(f[0] - 4 * s, f[1] - 2); g.lineTo(f[0] - 4 * s, hy + 7 * s); g.lineTo(f[0] + 4 * s, hy + 7 * s); g.lineTo(f[0] + 4 * s, f[1] - 2); g.closePath();
        g.moveTo(f[0] - 3 * s, hy + 8 * s); g.lineTo(f[0] - 11 * s, hy - 8 * s); g.moveTo(f[0] + 3 * s, hy + 8 * s); g.lineTo(f[0] + 11 * s, hy - 8 * s);
      });
      g.fill(); g.stroke();
    }
    function halo(g) { K.knock(g, function (g2) { trophy(g2, 5 * sc); }); }
    function ribbons(g, ink) {                         // the streamers hanging down the faces: a flipping ribbon ending in its roll
      var A0 = ban ? 15 : 20, wd = ban ? 15 : 24;
      S.rbn.forEach(function (R) {
        if (R.ink !== ink) return;
        var n = Math.round(R.len / 6), L1 = [], R1 = [], m, a0, x, y, w;
        for (m = 0; m <= n; m++) {
          a0 = R.len * m / n; x = R.x + Math.sin(a0 / (ban ? 30 : 40) + R.ph) * A0 * (0.35 + 0.65 * a0 / R.len); y = R.y + a0; w = wd * (0.28 + 0.72 * Math.abs(Math.cos(m * 0.5 + R.ph))) / 2;
          L1.push(x - w, y); R1.push(x + w, y);
        }
        g.fillStyle = tone(0.95); g.beginPath(); g.moveTo(L1[0], L1[1]);
        for (m = 2; m < L1.length; m += 2) g.lineTo(L1[m], L1[m + 1]);
        for (m = R1.length - 2; m >= 0; m -= 2) g.lineTo(R1[m], R1[m + 1]);
        g.closePath(); g.fill();
        g.strokeStyle = tone(0.95); g.lineWidth = wd * 0.4; K.circle(g, (L1[n * 2] + R1[n * 2]) / 2, L1[n * 2 + 1] + wd * 0.55, wd * 0.52); g.stroke();
      });
    }
    function carpet(g, k, list, cov) {                 // tape lying on the street (or hanging dim behind the towers)
      g.fillStyle = tone(cov || 0.95); g.beginPath();
      (list || S.carp).forEach(function (o) {
        if (o[5] !== k) return;
        var c = Math.cos(o[2]), n = Math.sin(o[2]), a = c * o[3], b = n * o[3], d = -n * o[4], e = c * o[4];
        g.moveTo(o[0] - a - d, o[1] - b - e); g.lineTo(o[0] + a - d, o[1] + b - e); g.lineTo(o[0] + a + d, o[1] + b + e); g.lineTo(o[0] - a + d, o[1] - b + e); g.closePath();
      });
      g.fill();
    }
    // the sky: violet over the top, the city's magenta and gold glow at the foot, three searchlights
    function envStroke(g, w, t) {
      var q = S.env, j;
      g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = tone(t); g.lineWidth = w; g.beginPath(); g.moveTo(q[0], q[1] - w * 0.3);
      for (j = 2; j < q.length; j += 2) g.lineTo(q[j], q[j + 1] - w * 0.3);
      g.stroke();
    }
    function backRow(g) {
      var q = S.bk, j;
      g.beginPath();
      for (j = 0; j < q.length; j += 4) { g.rect(q[j], q[j + 2], q[j + 1], GY - q[j + 2]); if (q[j + 3]) g.rect(q[j] + q[j + 1] * 0.45, q[j + 2] - fh * 0.06, 3 * sc, fh * 0.06); }
    }
    var skyTeal = sky(function (g) {
      ramp(g, L.FY0 - 10, GY, [[0, 0.38], [0.5, 0.1], [0.8, 0]]);
      envStroke(g, 150 * sc, 0.14); envStroke(g, 90 * sc, 0.2);
      K.knock(g, backRow); backRow(g); g.fillStyle = tone(0.5); g.fill();
      K.knock(g, function (g2) { carpet(g2, 0, S.dim); }); carpet(g, 0, S.dim, 0.72);
    });
    var skyBlue = sky(function (g) { envStroke(g, 110 * sc, 0.2); envStroke(g, 60 * sc, 0.4); envStroke(g, 28 * sc, 0.65); carpet(g, 1, S.dim, 0.7); });
    var skyGold = sky(function (g) { envStroke(g, 36 * sc, 0.22); envStroke(g, 15 * sc, 0.55); });
    var skyBeam = sky(function (g) {
      S.BM.forEach(function (b) {
        var len = fh * 1.05, ex = b.x + Math.sin(b.a) * len, ey = GY - Math.cos(b.a) * len, nx = Math.cos(b.a), ny = Math.sin(b.a), w = fh * 0.09, gr = g.createLinearGradient(b.x, GY, ex, ey);
        gr.addColorStop(0, tone(0.55)); gr.addColorStop(0.7, tone(0.3)); gr.addColorStop(1, tone(0.06));
        g.fillStyle = gr; g.beginPath(); g.moveTo(b.x - nx * 5, GY - ny * 5); g.lineTo(ex - nx * w, ey - ny * w); g.lineTo(ex + nx * w, ey + ny * w); g.lineTo(b.x + nx * 5, GY + ny * 5); g.closePath(); g.fill();
      });
    });
    // the towers: dark faces (windows cut out), a violet rim on the lit edges, the street's glow at their feet
    function street(g) { g.beginPath(); g.rect(x0, GY, x1 - x0, L.FY1 + 10 - GY); g.clip(); }
    function crowd(g, e) { var h = S.heads, j; g.beginPath(); for (j = 0; j < h.length; j += 3) { g.moveTo(h[j] + h[j + 2] + e, h[j + 1]); g.arc(h[j], h[j + 1], h[j + 2] + e, 0, TAU); } }
    var landTeal = function (g) {
      g.save(); sil(g); g.clip();
      g.beginPath(); B.forEach(function (b) { b.seg.forEach(function (s) { g.rect(s[3] - 5.5 * rs - 1, s[0], 5.5 * rs + 1, s[1] - s[0]); }); });
      g.fillStyle = tone(0.9); g.fill();
      K.knock(g, function (g2) { windows(g2, 1.5); g2.fill(); });
      g.restore();
      g.save(); street(g); ramp(g, GY, L.FY1, [[0, 0.55], [1, 0.2]]); K.knock(g, function (g2) { crowd(g2, 1.2); g2.fill(); }); g.restore();
      halo(g);
    };
    var landBlue = function (g) {
      g.save(); sil(g); g.clip(); ramp(g, GY - fh * 0.3, GY, [[0, 0], [1, 0.55]]); K.knock(g, function (g2) { windows(g2, 1.5); g2.fill(); }); g.restore();
      g.save(); street(g); ramp(g, GY, L.FY1, [[0, 0.6], [1, 0.12]]); g.restore();
      crowd(g, 0); g.fillStyle = tone(0.95); g.fill(); carpet(g, 2); halo(g);
    };
    var lit = function (g) {                           // every window lit, the needle's beacon, the trophy, a lane of dashes
      windows(g, 0); g.fillStyle = tone(0.94); g.fill();
      var b = B[7], e = b.seg[0];
      K.circle(g, b.cx, e[0] - fh * 0.2 - 3, 5 * sc); g.fill(); halo(g);
      g.fillStyle = tone(0.97); trophy(g, 0);
      K.knock(g, function (g2) { g2.lineWidth = Math.max(2.4, 2.2 * sc); g2.lineCap = "round"; K.seams(g2, S.fx, S.fy - 2 * sc - bh + tr, tr * 0.92, 0.3); });
      g.fillStyle = tone(0.85); g.beginPath();
      for (var d = x0 + 10; d < x1; d += 46 * sc) g.rect(d, L.FY1 - st * 0.16, 24 * sc, 3.6 * sc);
      g.fill(); carpet(g, 0);
    };
    var aqua = function (g) {
      var fx = S.fx, fy = S.fy, w = S.fwid;
      g.fillStyle = tone(0.92); g.beginPath(); g.rect(fx - w, fy, w * 2, 14 * sc);
      g.moveTo(fx - w * 0.62 + 7 * sc, fy + 15 * sc); g.arc(fx - w * 0.62, fy + 15 * sc, 7 * sc, 0, TAU); g.moveTo(fx + w * 0.62 + 7 * sc, fy + 15 * sc); g.arc(fx + w * 0.62, fy + 15 * sc, 7 * sc, 0, TAU); g.fill();
      fans(g); carpet(g, 1); ribbons(g, 0);
    };
    var tapeOr = function (g) { ribbons(g, 1); };
    var line = function (g) {                          // the season's line: the neon roofline, left to right
      var q = S.env, j;
      g.lineJoin = "miter"; g.lineCap = "square"; g.strokeStyle = tone(0.95); g.lineWidth = ban ? 5 : 6; g.beginPath(); g.moveTo(q[0], q[1]);
      for (j = 2; j < q.length; j += 2) g.lineTo(q[j], q[j + 1]);
      g.stroke();
    };
    return [
      { ink: "teal", role: "sky", draw: skyTeal }, { ink: "blue", role: "sky", draw: skyBlue }, { ink: "light", role: "sky", draw: skyGold }, { ink: "pink", role: "sky", draw: skyBeam },
      { ink: "teal", role: "land", draw: landTeal }, { ink: "blue", role: "land", draw: landBlue }, { ink: "light", role: "land", draw: lit }, { ink: "pink", role: "land", draw: aqua }, { ink: "orange", role: "land", draw: tapeOr },
      { ink: "pink", role: "line", draw: line }
    ];
  }
  function body(g, D, L) {
    g.moveTo(L.FX0 - 12, L.FY1 + 10); g.lineTo(L.FX0 - 12, D.pr.GY); g.lineTo(L.FX1 + 12, D.pr.GY); g.lineTo(L.FX1 + 12, L.FY1 + 10); g.closePath();
  }

  function title(K, P, D, L, g) {
    var b = g.box, pos = g.poster, rec = g.record, tone = K.tone, ctx = (g.context || "").toUpperCase(), cs = pos ? 2 : 2.4;
    var x = b[0] + 18, base = b[3] - (pos ? 20 : 14), sz = 152, w = g.measure(K.font(900, sz, "disp"), rec), maxW = pos ? 430 : 460;
    if (w > maxW) { sz *= maxW / w; w = maxW; }
    var rx = x + w + (pos ? 36 : 30), ps = Math.min(pos ? 60 : 56, sz * 0.42), pw = g.measure(K.font(800, ps, "disp"), "PARADE") + ps * 0.45;
    var mf = K.font(600, pos ? 13 : 22, "mono"), cf = K.font("italic 600", 30, "disp"), cy = pos ? b[1] + 40 : b[1] + 28;
    var cw = Math.max(g.measure(mf, ctx) + cs * ctx.length, pos && g.comp ? g.measure(cf, g.comp) : 0);
    function record(dx, dy, cov) { return function (t) { t.font = K.font(900, sz, "disp"); t.fillStyle = tone(cov); t.fillText(rec, x + dx, base + dy); }; }
    var rb = [x - 4, base - sz * 0.8, x + w + 14, base + 12];
    g("blue", rb, record(10, 9, 0.95)); g("sun", rb, record(0, 0, 0.97)); g("sun", rb, record(1.8, -1.4, 0.9));
    g("pink", [rx - 4, base - ps * 1.84, rx + pw + 6, base + ps * 0.1], function (t) {
      t.fillStyle = tone(0.95); t.font = K.font(800, ps, "disp");
      K.spacedText(t, "PARADE", rx, base - ps * 1.02, ps * 0.07, "left"); K.spacedText(t, "DAY", rx, base, ps * 0.07, "left");
    });
    g("orange", [rx + pw + 8, b[1], rx + pw + 130, base + 6], function (t) {         // bits of tape thrown past the words
      var j, px, py, a, r = K.rand(8242);
      t.fillStyle = tone(0.95); t.beginPath();
      for (j = 0; j < 8; j++) {
        px = rx + pw + 22 + r() * 90; py = b[1] + 24 + r() * (base - b[1] - 40); a = r() * TAU;
        t.moveTo(px, py); t.lineTo(px + Math.cos(a) * 22, py + Math.sin(a) * 22); t.lineTo(px + Math.cos(a) * 22 - Math.sin(a) * 9, py + Math.sin(a) * 22 + Math.cos(a) * 9); t.lineTo(px - Math.sin(a) * 9, py + Math.cos(a) * 9); t.closePath();
      }
      t.fill();
    });
    if (ctx || (pos && g.comp)) g("orange", [b[2] - 20 - cw, cy - (pos ? 14 : 22), b[2] - 10, pos && g.comp ? base + 8 : cy + 6], function (t) {
      t.fillStyle = tone(0.9); t.font = mf;
      if (ctx) K.spacedText(t, ctx, b[2] - 16, cy, cs, "right");
      if (pos && g.comp) { t.font = cf; t.textAlign = "right"; t.fillText(g.comp, b[2] - 16, base); t.textAlign = "left"; }
    });
  }

  /* ---- after the reveal: a fountain of ticker tape bursts off each roof, left to right, slows and hangs; the print keeps it ---- */
  var DUR = 3.4, STAG = 0.3, CINK = ["sun", "pink", "orange", "sun", "pink", "sun", "orange"];
  function geo(K, D) {
    var S = D.pr;
    if (S.fx2) return S.fx2;
    var r = K.rand((D.seed * 7919 + 8242) >>> 0), ban = S.ban, sc = S.sc, out = [], k, i, z = sc * (ban ? 1.2 : 1);
    for (k = 1; k <= 7; k++) {
      var b = S.B[k], tp = b.seg[0][0], rest = [], n = ban ? 12 : 22, sq;
      for (i = 0; i < n; i++) {
        sq = r() < 0.25;
        rest.push(b.cx + (r() - 0.5) * 100 * sc, tp - 120 * sc * (ban ? 0.9 : 1) + Math.pow(r(), 0.9) * 150 * sc, r() * TAU, (sq ? 6 : 8 + r() * 9) * z, (sq ? 6 : 2.6 + r() * 2.2) * z, r());
      }
      out.push({ b: b, rest: rest, tp: tp });
    }
    return (S.fx2 = out);
  }
  function live(K, P, D, L, t, ink) {
    var S = D.pr, tone = K.tone, sc = S.sc;
    geo(K, D).forEach(function (R, k) {
      // pieces leave the roof one after another, arc up and slow to rest, tilting flat as they stop
      var cb = [1e9, 1e9, -1e9, -1e9], cs = [], pr = R.rest, j;
      for (j = 0; j < pr.length; j += 6) {
        var u = K.clamp((t - 0.1 - k * STAG - (j / 6) * 0.04) / 1.1, 0, 1), e = 1 - Math.pow(1 - u, 3), px, py, an, ca, sn, w2, h2;
        if (u <= 0) continue;
        px = R.b.cx + (pr[j] - R.b.cx) * e; py = R.tp + (pr[j + 1] - R.tp) * e - 50 * sc * 4 * u * (1 - u);
        an = pr[j + 2] + (1 - u) * 7; w2 = pr[j + 3] * (u < 1 ? 0.35 + 0.65 * Math.abs(Math.cos((1 - u) * 9 + pr[j + 5] * 3)) : 1); h2 = pr[j + 4];
        ca = Math.cos(an); sn = Math.sin(an);
        cs.push([px, py, ca * w2, sn * w2, -sn * h2, ca * h2]);
        cb[0] = Math.min(cb[0], px - w2 - h2 - 4); cb[1] = Math.min(cb[1], py - w2 - h2 - 4); cb[2] = Math.max(cb[2], px + w2 + h2 + 4); cb[3] = Math.max(cb[3], py + w2 + h2 + 4);
      }
      if (cs.length) ink(CINK[k], cb, function (g) {
        g.fillStyle = tone(0.95); g.beginPath();
        cs.forEach(function (o) { g.moveTo(o[0] - o[2] - o[4], o[1] - o[3] - o[5]); g.lineTo(o[0] + o[2] - o[4], o[1] + o[3] - o[5]); g.lineTo(o[0] + o[2] + o[4], o[1] + o[3] + o[5]); g.lineTo(o[0] - o[2] + o[4], o[1] - o[3] + o[5]); g.closePath(); });
        g.fill();
      });
    });
  }

  A.add("scene", "parade", {
    name: "The Parade",
    by: "82-0 only: seven towers climb the season, every window lit under searchlights, the trophy on a float; streamers unspool down the towers and ticker tape bursts and hangs.",
    perfect: true,
    lights: ["golden"],
    derive: derive, layers: layers, body: body, title: title,
    live: { dur: DUR, draw: live }
  });
})();
