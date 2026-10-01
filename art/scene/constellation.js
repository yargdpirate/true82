/* ---------- TRUE 82 ART: CONSTELLATION (a perfect scene: it prints only an 82-0) ----------
   The season as a star chart: each of the 82 wins is a star, the stars are joined into one rising line (seven
   months, each month's last night a bigger star) that ends in a blazing finale star ringed like an astrolabe,
   over a violet and magenta nebula that leaves the upper left dark for the names. A faint W (the constellation
   of wins) sits in the sky. The title is star-white (gold and aqua overprinted). After the reveal a wave of
   light runs the line and lights every win, the finale flares, shooting stars cross; the last freezes in print.
   Rules: art/CONTRACT.md ("A scene") and art/CONTRACT-FX.md. Tone only: black at an alpha is coverage. */
(function () {
  "use strict";
  var A = typeof window !== "undefined" ? window.T82ART : null;
  if (!A || typeof A.add !== "function") return;
  var TAU = Math.PI * 2, CAMPS = [0, 5, 20, 35, 50, 61, 76, 82];

  function derive(K, D, L) {
    var r = K.rand((D.seed * 2654435761 + 4207) >>> 0), fw = L.FX1 - L.FX0, fh = L.FY1 - L.FY0, ban = L.vs < 1;
    var xa = L.FX0 + fw * 0.03, xs = L.FX0 + fw * 0.84, ya = L.FY1 - fh * 0.1, ys = L.FY0 + fh * (ban ? 0.42 : 0.32);
    var V = [], S = [], i, j, u, p, q, k;
    for (i = 0; i < 8; i++) {
      u = CAMPS[i] / 82;
      V.push([xa + (xs - xa) * u, ya - (ya - ys) * Math.pow(u, 2.5) + (i && i < 7 ? (r() - 0.5) * fh * 0.1 : 0)]);
    }
    for (i = 0; i <= 82; i++) {
      for (j = 1; j < 7 && i > CAMPS[j]; j++);
      u = (i - CAMPS[j - 1]) / (CAMPS[j] - CAMPS[j - 1]); p = V[j - 1]; q = V[j];
      S.push([K.lerp(p[0], q[0], u), K.lerp(p[1], q[1], u) + (CAMPS.indexOf(i) < 0 ? (r() - 0.5) * fh * 0.02 : 0), 0.7 + r() * 0.6]);
    }
    function at(x) {                                     // the line's height at x (flat before it, falling away after)
      if (x <= xa) return ya;
      if (x >= xs) return ys + (x - xs) * 0.9;
      for (var j = 1; j < 7 && x > V[j][0]; j++);
      return K.lerp(V[j - 1][1], V[j][1], (x - V[j - 1][0]) / (V[j][0] - V[j - 1][0]));
    }
    var F1 = [], F2 = [], DU = [], x, y;
    for (k = 0; k < (ban ? 70 : 120); k++) F1.push([L.FX0 + r() * fw, L.FY0 + r() * fh, (ban ? 2.6 : 2.8) + r() * 1.4]);
    for (k = 0; k < (ban ? 16 : 24); k++) F2.push([L.FX0 + r() * fw, L.FY0 + r() * fh * 0.75, (ban ? 3.2 : 3.6) + r() * 1.6, r() < 0.5 ? 1 : 0]);
    for (k = 0; k < (ban ? 230 : 380); k++) {
      x = xa + (xs - xa) * Math.pow(r(), 0.7); y = at(x) + (r() + r() + r() - 1.5) * fh * 0.16;
      if (Math.abs(y - at(x)) > 8) DU.push([x, y, (ban ? 2.5 : 2.7) + r() * 1.2]);
    }
    var wx = L.FX0 + fw * 0.6, wy = L.FY0 + fh * 0.13, ws = fw * 0.026, Wd = [[0, 0.3], [1, 1.1], [2, 0.2], [3, 1.2], [4, 0.1]].map(function (a) { return [wx + a[0] * ws * 1.5, wy + a[1] * ws * 0.9 * (ban ? 1 : 1.6), 4 + r() * 2]; });
    D.cn = { ban: ban, fw: fw, fh: fh, V: V, S: S, at: at, xs: xs, ys: ys, F1: F1, F2: F2, DU: DU, W: Wd, n1: K.noise1D(D.seed + 11), n2: K.noise1D(D.seed + 23),
      st: ban ? 28 : 36, w: ban ? 5.2 : 6.8, R: fw * 0.092 };
  }

  function spark(g, x, y, R, w) {                        // a four-point star: curved lobes narrowing to the points
    w = R * (w || 0.15);
    g.moveTo(x, y - R); g.quadraticCurveTo(x + w, y - w, x + R, y); g.quadraticCurveTo(x + w, y + w, x, y + R);
    g.quadraticCurveTo(x - w, y + w, x - R, y); g.quadraticCurveTo(x - w, y - w, x, y - R); g.closePath();
  }
  function star(g, x, y, R, bw, hr) {                    // a lens-flare star: a long thin vertical kite, a shorter horizontal one
    hr = hr || 0.78;
    g.moveTo(x, y - R); g.lineTo(x + bw, y); g.lineTo(x, y + R); g.lineTo(x - bw, y); g.closePath();
    g.moveTo(x - R * hr, y); g.lineTo(x, y - bw); g.lineTo(x + R * hr, y); g.lineTo(x, y + bw); g.closePath();
  }
  function dots(g, list, sc) {                           // one path, one fill: dots never stack
    g.beginPath();
    for (var j = 0; j < list.length; j++) { g.moveTo(list[j][0] + list[j][2] * sc, list[j][1]); g.arc(list[j][0], list[j][1], list[j][2] * sc, 0, TAU); }
    g.fill();
  }

  function layers(K, P, D, L) {
    var C = D.cn, tone = K.tone, S = C.S, V = C.V, xs = C.xs, ys = C.ys, fw = C.fw, fh = C.fh, R = C.R, ban = C.ban;
    var x0 = L.FX0 - 12, x1 = L.FX1 + 12;
    function path(g) { g.beginPath(); g.moveTo(V[0][0] - 20, V[0][1]); for (var j = 0; j < 8; j++) g.lineTo(V[j][0], V[j][1]); }
    function keyline(g) {                                // bare stock either side of the line, but not through the finale's core
      K.knock(g, function (g2) {
        g2.beginPath(); g2.rect(L.FX0 - 20, L.FY0 - 20, fw + 40, fh + 40); g2.arc(xs, ys, R * 0.8, 0, TAU, true); g2.clip("evenodd");
        g2.lineWidth = C.w * 3; g2.lineJoin = "round"; path(g2); g2.stroke();
      });
    }
    function puff(g, x, y, rx, ry, rot, a) {
      g.save(); g.translate(x, y); g.rotate(rot); g.scale(rx, ry);
      var gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, tone(a)); gr.addColorStop(0.5, tone(a * 0.55)); gr.addColorStop(1, tone(0));
      g.fillStyle = gr; g.fillRect(-1, -1, 2, 2); g.restore();
    }
    function env(x, y) {                                 // where a nebula lives: round the finale, and along the climb
      var u = (x - V[0][0]) / (xs - V[0][0]), d = (y - C.at(x)) / (fh * 0.26), dx = (x - xs) / (fw * 0.46), dy = (y - ys) / (fh * 0.9);
      return Math.max(Math.exp(-dx * dx - dy * dy) * K.smooth(0.2, 0.55, (x - L.FX0) / fw), Math.exp(-d * d) * K.smooth(0.2, 0.8, u) * 0.7);
    }
    // a spiral nebula: arms winding round the finale (phase ph), broken up by noise; between the arms, bare stock.
    // Soft: overlapping puffs (a dot-size ramp). Banded: a union of discs per level (flat bands with scalloped edges).
    function field(x, y, ph, thr, gain, ox) {
      var dx = x - xs, dy = y - ys, r = Math.sqrt(dx * dx + dy * dy) || 1;
      return (Math.cos(2 * Math.atan2(dy, dx) - 2.3 * Math.log(r / R) + ph + 1.2 * K.fbm(C.n1, r * 0.012 + ox, 2)) * 0.95 + K.fbm(C.n2, x * 0.006 + 2 * K.fbm(C.n1, y * 0.006 + ox, 2), 3) * 0.55 - thr) * gain * env(x, y) * K.smooth(R * 1.1, R * 2, r) * (1 - 0.55 * K.smooth(0.6, 1, (y - L.FY0) / fh));
    }
    function arms(g, ph, thr, gain, ox, rad) {
      var st = C.st, x, y, v;
      for (y = L.FY0 - st; y < L.FY1 + st; y += st) for (x = L.FX0 - st; x < L.FX1 + st; x += st) {
        v = field(x, y, ph, thr, gain, ox);
        if (v > 0.04) puff(g, x, y, st * rad, st * rad, 0, Math.min(0.92, v));
      }
    }
    function bands(g, ph, thr, gain, ox, tones) {
      var st = C.st * 0.6, x, y, k, V2 = [], nx = Math.ceil(fw / st) + 2, i;
      for (y = L.FY0 - st; y < L.FY1 + st; y += st) for (x = L.FX0 - st; x < L.FX1 + st; x += st) V2.push(field(x, y, ph, thr, gain, ox));
      for (k = 0; k < tones.length; k++) {
        g.beginPath(); i = 0;
        for (y = L.FY0 - st; y < L.FY1 + st; y += st) for (x = L.FX0 - st; x < L.FX1 + st; x += st) { if (V2[i++] > 0.1 + k * 0.26) { g.moveTo(x + st * 0.95, y); g.arc(x, y, st * 0.95, 0, TAU); } }
        g.fillStyle = tone(tones[k]); g.fill();
      }
    }
    function fin(g) {                                    // the finale's dial: ticks round a clear ring
      var j, a, r0, r1;
      g.beginPath();
      for (j = 0; j < 36; j++) {
        a = j * TAU / 36; r0 = R * (j % 9 ? 1.2 : 1.12); r1 = R * (j % 9 ? 1.34 : 1.55);
        g.moveTo(xs + Math.cos(a) * r0, ys + Math.sin(a) * r0); g.lineTo(xs + Math.cos(a) * r1, ys + Math.sin(a) * r1);
      }
      g.stroke();
    }

    var skyViolet = function (g) {
      g.fillStyle = K.vgrad(g, L.FY0, L.FY1, [[0, 0.1], [0.55, 0.05], [1, 0.16]]); g.fillRect(L.FX0, L.FY0, fw, fh);
      arms(g, Math.PI, 0.3, 2.4, 0, 1.25);
      K.knockRadial(g, xs, ys, R * 1.5, 0.95);
    };
    var skyMagenta = function (g) { bands(g, 0, 0.3, 2.6, 40, [0.4, 0.22, 0.22, 0.22]); };
    var skyAqua = function (g) {
      g.fillStyle = tone(1); dots(g, C.F1, 1);
      g.strokeStyle = tone(0.7); g.lineWidth = ban ? 3.2 : 3.4; g.lineJoin = "round"; g.beginPath();
      C.W.forEach(function (p, i) { i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.stroke(); dots(g, C.W, 1.1);
    };
    var skyGold = function (g) {
      g.fillStyle = tone(1); dots(g, C.F2, 1);
      g.beginPath(); C.F2.forEach(function (s) { if (s[3]) spark(g, s[0], s[1], s[2] * 3.3, 0.14); }); g.fill();
    };
    // the land: the nebula's bright body under the climb
    var landMagenta = function (g) {
      for (var j = 0; j < 4; j++) {
        g.beginPath(); g.moveTo(x0, L.FY1 + 10);
        for (var x = x0; x <= x1; x += 6) g.lineTo(x, C.at(x) + (6 + j * (ban ? 12 : 26)) + K.fbm(C.n1, x * 0.01 + j * 3, 3) * (ban ? 10 : 22));
        g.lineTo(x1, L.FY1 + 10); g.closePath(); g.fillStyle = tone(0.13); g.fill();
      }
      arms(g, 0.2, 0.45, 2.2, 90, 1.1);
      keyline(g);
    };
    var landOrange = function (g) {
      puff(g, xs, ys, R * 2.4, R * 2, 0, 0.6); puff(g, xs - R * 1.9, ys + R * 0.9, R * 1.9, R * 1, -0.5, 0.4);
      keyline(g);
    };
    var landAqua = function (g) { g.fillStyle = tone(1); dots(g, C.DU, 1); keyline(g); };
    var landGold = function (g) {
      puff(g, xs, ys, R * 1.5, R * 1.5, 0, 0.95);
      g.beginPath(); g.moveTo(x0, L.FY1 + 10);
      for (var x = x0; x <= x1; x += 6) g.lineTo(x, C.at(x) + (ban ? 4 : 8));
      g.lineTo(x1, L.FY1 + 10); g.closePath(); g.fillStyle = tone(0.14); g.fill();
      keyline(g);
    };
    var lineAqua = function (g) {
      g.strokeStyle = tone(0.95); g.lineWidth = C.w; g.lineJoin = "round"; path(g); g.stroke();
      g.fillStyle = tone(1); dots(g, S.map(function (s) { return [s[0], s[1], (ban ? 4.2 : 5) * s[2]]; }), 1);
      K.circle(g, xs, ys, R * 0.2); g.fill();
      g.lineWidth = C.w * 0.7; g.strokeStyle = tone(0.9); fin(g);
      g.beginPath(); g.arc(xs, ys, R * 1.7, 0, TAU); g.lineWidth = C.w * 0.55; g.stroke();
    };
    var lineGold = function (g) {
      g.strokeStyle = tone(0.95); g.lineWidth = C.w * 0.5; g.lineJoin = "round"; path(g); g.stroke();
      g.fillStyle = tone(1); dots(g, S.map(function (s) { return [s[0], s[1], (ban ? 2.5 : 3) * s[2]]; }), 1);
      g.beginPath(); S.forEach(function (s, i) { if (i && CAMPS.indexOf(i) < 0) spark(g, s[0], s[1], (ban ? 8 : 10) * s[2], 0.2); }); g.fill();
      g.beginPath(); [5, 20, 35, 50, 61, 76].forEach(function (c, i) { var q = R * (0.28 + i * 0.045); star(g, S[c][0], S[c][1], q, q * 0.11); spark(g, S[c][0], S[c][1], q * 0.45, 0.2); }); g.fill();
      g.beginPath(); star(g, xs, ys, R * 1.5, R * 0.07, 0.85); g.fill();
      g.beginPath(); g.save(); g.translate(xs, ys); g.rotate(Math.PI / 4); star(g, 0, 0, R * 0.7, R * 0.05, 1); g.restore(); g.fill();
      K.circle(g, xs, ys, R * 0.27); g.fill();
    };
    return [
      { ink: "teal", role: "sky", draw: skyViolet }, { ink: "blue", role: "sky", draw: skyMagenta },
      { ink: "pink", role: "sky", draw: skyAqua }, { ink: "light", role: "sky", draw: skyGold },
      { ink: "blue", role: "land", draw: landMagenta }, { ink: "orange", role: "land", draw: landOrange },
      { ink: "pink", role: "land", draw: landAqua }, { ink: "light", role: "land", draw: landGold },
      { ink: "pink", role: "line", draw: lineAqua }, { ink: "sun", role: "line", draw: lineGold, reg: [1.6, -1.2] }
    ];
  }
  function body(g, D, L) {
    var C = D.cn, x;
    g.moveTo(L.FX0 - 12, L.FY1 + 10);
    for (x = L.FX0 - 12; x < L.FX1 + 12; x += 4) g.lineTo(x, C.at(x));
    g.lineTo(L.FX1 + 12, L.FY1 + 10); g.closePath();
  }

  /* ---- the title: the record in star-white (gold and aqua overprinted) over a magenta shadow ---- */
  function title(K, P, D, L, g) {
    var b = g.box, pos = g.poster, rec = g.record, tone = K.tone, ctx = (g.context || "").toUpperCase(), cs = pos ? 2 : 2.4;
    var x = b[0] + 18, base = b[3] - (pos ? 20 : 14), sz = pos ? 150 : 152, maxW = pos ? 430 : 460, w = g.measure(K.font(900, sz, "disp"), rec);
    if (w > maxW) { sz *= maxW / w; w = maxW; }
    var rx = x + w + (pos ? 40 : 34), ps = Math.min(58, sz * 0.4), mf = K.font(600, pos ? 13 : 22, "mono"), cf = K.font("italic 600", 30, "disp");
    var rb = [x - 6, base - sz * 0.8, x + w + 16, base + 14], cy = pos ? b[1] + 40 : b[1] + 28;
    var cw = Math.max(g.measure(mf, ctx) + cs * ctx.length, pos && g.comp ? g.measure(cf, g.comp) : 0);
    function record(dx, dy, cov) { return function (t) { t.font = K.font(900, sz, "disp"); t.fillStyle = tone(cov); t.fillText(rec, x + dx, base + dy); }; }
    function sp(t, X, Y, R) { t.beginPath(); spark(t, X, Y, R, 0.12); t.fill(); }
    g("blue", rb, record(11, 10, 0.95));
    g("sun", rb, record(0, 0, 0.95));
    g("pink", rb, record(-2.6, 2.2, 0.95));
    g("sun", [x - 20, b[1], x + w + 30, base - sz * 0.5], function (t) { t.fillStyle = tone(0.95); sp(t, x + w - 8, base - sz * 0.8, sz * 0.2); sp(t, x + sz * 0.12, base - sz * 0.74, sz * 0.1); });
    g("pink", [rx - 6, base - ps * 1.9, rx + ps * 5.6, base + 8], function (t) {
      t.fillStyle = tone(0.95); t.font = K.font(800, ps, "disp"); t.fillText("82 STARS", rx, base - ps * 0.82);
      t.font = K.font(700, ps * 0.62, "disp"); K.spacedText(t, "NONE MISSING", rx, base, ps * 0.07, "left");
    });
    g("sun", [rx - 6, b[1], rx + ps * 4.4, base - ps * 1.5], function (t) {
      var j, X, Y, k = ps * 0.55;
      t.strokeStyle = tone(0.9); t.lineWidth = pos ? 3 : 3.4; t.lineJoin = "round"; t.beginPath();
      for (j = 0; j < 7; j++) { X = rx + 10 + j * ps * 0.62; Y = base - ps * 1.62 - Math.pow(j / 6, 1.9) * k * 1.4; j ? t.lineTo(X, Y) : t.moveTo(X, Y); }
      t.stroke(); t.fillStyle = tone(0.95);
      for (j = 0; j < 7; j++) sp(t, rx + 10 + j * ps * 0.62, base - ps * 1.62 - Math.pow(j / 6, 1.9) * k * 1.4, ps * (j === 6 ? 0.3 : 0.17));
    });
    if (ctx || (pos && g.comp)) g("orange", [b[2] - 20 - cw, cy - (pos ? 14 : 22), b[2] - 10, pos && g.comp ? base + 8 : cy + 6], function (t) {
      t.fillStyle = tone(0.9); t.font = mf;
      if (ctx) K.spacedText(t, ctx, b[2] - 16, cy, cs, "right");
      if (pos && g.comp) { t.font = cf; t.textAlign = "right"; t.fillText(g.comp, b[2] - 16, base); t.textAlign = "left"; }
    });
  }

  /* ---- after the reveal: a bright star runs the line and lights every win in turn, a ring pulses at each month, the
     finale flares, shooting stars cross (the last freezes into the print). Only what moves is drawn: few small jobs ---- */
  var DUR = 6.4, T0 = 0.3, DT = 0.04, MET = [[0.4, 0.8, 0.7, 0.03, 0.3, 0.45, "sun"], [2.2, 0.7, 0.97, 0.3, 0.64, 0.62, "pink"], [4.3, 0.8, 0.82, 0.02, 0.5, 0.34, "sun"]];
  function live(K, P, D, L, t, ink) {
    var C = D.cn, S = C.S, tone = K.tone, ban = C.ban, R = C.R, xs = C.xs, ys = C.ys, fw = C.fw, fh = C.fh, base = ban ? 26 : 30, i, k;
    function box(x, y, r) { return [x - r, y - r, x + r, y + r]; }
    var lo = Math.max(1, Math.ceil((t - T0 - 0.6) / DT)), hi = Math.min(82, Math.floor((t - T0) / DT)), on = [], x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (i = lo; i <= hi; i++) {                         // the wins just lit: each swells, then settles back into the print
      var tau = t - T0 - i * DT, q = base * S[i][2] * (tau < 0.12 ? tau / 0.12 : Math.exp(-(tau - 0.12) * 8)) * (CAMPS.indexOf(i) > 0 ? 1.45 : 1);
      on.push([S[i][0], S[i][1], q]);
      x0 = Math.min(x0, S[i][0] - q); x1 = Math.max(x1, S[i][0] + q); y0 = Math.min(y0, S[i][1] - q); y1 = Math.max(y1, S[i][1] + q);
    }
    if (on.length) ink("sun", [x0, y0, x1, y1], function (g) { g.fillStyle = tone(0.95); g.beginPath(); on.forEach(function (o) { spark(g, o[0], o[1], o[2], 0.2); star(g, o[0], o[1], o[2] * 1.25, o[2] * 0.07, 0.8); }); g.fill(); });
    var hf = (t - T0) / DT;                              // the bright head of the wave, running the line
    if (hf > 0 && hf < 86) {
      var h0 = Math.min(81, Math.floor(hf)), hx = K.lerp(S[h0][0], S[h0 + 1][0], Math.min(1, hf - h0)), hy = K.lerp(S[h0][1], S[h0 + 1][1], Math.min(1, hf - h0)), hr = R * 0.75 * Math.min(1, hf / 3, (86 - hf) / 3);
      ink("sun", box(hx, hy, hr), function (g) { g.fillStyle = tone(0.95); g.beginPath(); star(g, hx, hy, hr, hr * 0.12, 0.85); g.fill(); K.circle(g, hx, hy, hr * 0.2); g.fill(); });
    }
    for (k = 1; k < 7; k++) {                            // a ring pulses out of each month's star
      var p = (t - T0 - CAMPS[k] * DT) / 0.9, cx = S[CAMPS[k]][0], cy = S[CAMPS[k]][1], rr = R * (0.2 + 0.85 * K.ease(Math.max(0, p)));
      if (p > 0 && p < 1) ink("sun", box(cx, cy, rr + 8), function (g) { g.strokeStyle = tone(0.9 * (1 - p)); g.lineWidth = 5; K.circle(g, cx, cy, rr); g.stroke(); });
    }
    var tf = t - T0 - 82 * DT;                           // the finale: its rays surge past the print's and fall back, rings leave it
    if (tf > 0 && tf < 1.9) {
      var gr = 1 + 0.45 * Math.min(1, tf / 0.2) * (1 - K.smooth(0.3, 1.9, tf)), rr2 = R * 1.5 * gr, rg = 0, rings = [];
      ink("sun", [xs - 16, ys - rr2, xs + 16, ys + rr2], function (g) { g.fillStyle = tone(0.95); g.beginPath(); star(g, xs, ys, rr2, R * 0.06, 0); g.fill(); });
      ink("sun", [xs - rr2, ys - 16, xs + rr2, ys + 16], function (g) { g.fillStyle = tone(0.95); g.beginPath(); g.moveTo(xs - rr2, ys); g.lineTo(xs, ys - R * 0.06); g.lineTo(xs + rr2, ys); g.lineTo(xs, ys + R * 0.06); g.closePath(); g.fill(); });
      [0, 0.3, 0.6].forEach(function (d) {
        var p = (tf - d) / 1.1;
        if (p > 0 && p < 1) { rings.push([R * (0.4 + 1.7 * K.ease(p)), 0.9 * (1 - p), R * 0.2 * (1 - p * 0.6)]); rg = Math.max(rg, rings[rings.length - 1][0] + R * 0.2); }
      });
      if (rings.length) ink("sun", box(xs, ys, rg), function (g) { rings.forEach(function (o) { g.strokeStyle = tone(o[1]); g.lineWidth = o[2]; K.circle(g, xs, ys, o[0]); g.stroke(); }); });
    }
    C.F2.filter(function (s) { return s[3]; }).slice(0, 2).forEach(function (s, n) {   // the sky's own stars breathe
      var q = s[2] * 3.3 * (1 + 0.5 * Math.max(0, Math.sin(t * 2.3 + n * 1.9)));
      ink("sun", box(s[0], s[1], q), function (g) { g.fillStyle = tone(0.95); g.beginPath(); spark(g, s[0], s[1], q, 0.14); g.fill(); });
    });
    MET.forEach(function (m, n) {                        // shooting stars: a tapering tail of dots behind a head
      var p = n === 2 ? K.clamp((t - m[0]) / m[1], 0, 1) : (t - m[0]) / m[1];
      if (p <= 0 || p >= 1 && n < 2) return;
      var ax = L.FX0 + fw * m[2], ay = L.FY0 + fh * m[3], bx = L.FX0 + fw * m[4], by = L.FY0 + fh * m[5], hx = K.lerp(ax, bx, p), hy = K.lerp(ay, by, p), dx = bx - ax, dy = by - ay, d = Math.sqrt(dx * dx + dy * dy);
      var ln = fw * 0.2 * Math.min(1, p / 0.25), tx = hx - dx / d * ln, ty = hy - dy / d * ln, w = ban ? 7 : 9, f = n < 2 ? 1 - K.smooth(0.7, 1, p) : 1;
      ink(m[6], [Math.min(hx, tx) - 14, Math.min(hy, ty) - 14, Math.max(hx, tx) + 14, Math.max(hy, ty) + 14], function (g) {
        var gr = g.createLinearGradient(hx, hy, tx, ty); gr.addColorStop(0, tone(0.95 * f)); gr.addColorStop(0.4, tone(0.5 * f)); gr.addColorStop(1, tone(0));
        g.fillStyle = gr; g.beginPath(); g.moveTo(hx - dy / d * w, hy + dx / d * w); g.lineTo(tx, ty); g.lineTo(hx + dy / d * w, hy - dx / d * w); g.closePath(); g.fill();
        K.circle(g, hx, hy, w * 1.15); g.fillStyle = tone(0.95 * f); g.fill();
      });
    });
  }

  A.add("scene", "constellation", {
    name: "Constellation",
    by: "82-0 only: the 82 wins are stars joined into one rising line over a nebula; a wave of light runs it, shooting stars cross.",
    perfect: true,
    lights: ["golden"],
    derive: derive, layers: layers, body: body, title: title,
    live: { dur: DUR, draw: live }
  });
})();
