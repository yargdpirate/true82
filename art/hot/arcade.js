/* Combo, a Heat Check pack (art/CONTRACT-FX.md): the arcade in 8-bit riso. Every mark is a square cell of K.pat on a
   coarse grid, stepped on twos; type is a 5 x 7 pixel face. The counter is the real multiplier (x1.0 to x2.0): digits
   drop in under pixel flames, rings and spark squares, each tier bigger. Inks lie source-over inside the layer (the
   layer itself blends onto the screen): a third of screen's cost, and no mark here overprints another. */
(function () {
  "use strict";
  var TAU = Math.PI * 2;
  var CH = "0123456789.-xABCEGHIMORSTUVXY";
  var DA = "ehjlphe4c4444eeh1248veh161he26aiv22vgu11he68guhhev124888ehhehheehhf12c00000oo000v00000ha4ahehhvhhhuhhuhhuehggghevgguggvehgnhhehhhvhhhe44444ehrllhhhehhhhheuhhukihfgge11uv444444hhhhhhehhhhha4hha4ahhhha4444";
  var HOP = [-6, -3, -1, 0, -1, 0], MEMO = {}, FLM = {}, LYM = {};

  function k01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function hsh(a, b) { var v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); }
  function snap(v, c) { return Math.round(v / c) * c; }
  function tw(e) { return Math.floor(e * 12) / 12; }
  function fill(K, ink, cov, p, s) {  // one ink, one path: squares of side s at flat [x, y], or rects [x, y, w, h] if s is 0
    if (!p.length) return;
    var g = K.g, R = K.st.rg || (K.st.rg = {}), r = R[ink] || (R[ink] = K.reg(ink)), i, st = s ? 2 : 4;
    g.save(); g.beginPath();
    for (i = 0; i < p.length; i += st) g.rect(p[i] + r[0], p[i + 1] + r[1], s || p[i + 2], s || p[i + 3]);
    g.fillStyle = K.pat(ink, cov, g); g.fill(); g.restore();
  }
  function cells(s) {
    if (MEMO[s]) return MEMO[s];
    var out = [], x = 0, i, r, q, b, ix, ch;
    for (i = 0; i < s.length; i++) {
      ch = s.charAt(i); ix = CH.indexOf(ch);
      if (ch === " ") x += 3;
      if (ix < 0) continue;
      for (r = 0; r < 7; r++) { b = parseInt(DA.charAt(ix * 7 + r), 32); for (q = 0; q < 5; q++) if ((b >> (4 - q)) & 1) out.push(x + q, r); }
      x += ch === "." ? 3 : 6;
    }
    return (MEMO[s] = { c: out, w: x - 1 });
  }
  function layers(s) {
    if (LYM[s]) return LYM[s];
    var f = cells(s).c, seen = {}, E = [], S = [], D = [1, 0, -1, 0, 0, 1, 0, -1], i, k, x, y, a, key;
    for (i = 0; i < f.length; i += 2) seen[f[i] + "," + f[i + 1]] = 1;
    for (i = 0; i < f.length; i += 2) for (k = 0; k < 8; k += 2) {
      x = f[i] + D[k]; y = f[i + 1] + D[k + 1]; key = x + "," + y;
      if (!seen[key]) { seen[key] = 1; E.push(x, y); }
    }
    a = f.concat(E);
    for (i = 0; i < a.length; i += 2) { x = a[i] + 1; y = a[i + 1] + 1; key = x + "," + y; if (!seen[key]) { seen[key] = 1; S.push(x, y); } }
    return (LYM[s] = { f: f, e: E, s: S, w: cells(s).w });
  }
  function pts(L, c, ox, oy, mod, r0, r1) {
    var out = [], p = [0, 0], i, n;
    for (i = 0; i < L.length; i += 2) {
      if (r0 != null && (L[i + 1] < r0 || L[i + 1] >= r1)) continue;
      p[0] = ox + L[i] * c; p[1] = oy + L[i + 1] * c; n = out.length;
      if (mod && mod(L[i], L[i + 1], p) === false) continue;
      if (!mod && n && out[n - 3] === p[1] && out[n - 4] + out[n - 2] === p[0]) out[n - 2] += c;
      else out.push(p[0], p[1], c, c);
    }
    return out;
  }
  function word(K, s, c, ox, oy, o) {
    var Y = layers(s), m = o.mod, f = o.face;
    if (o.sh) fill(K, o.sh, o.shc || 0.55, pts(Y.s, c, ox, oy, m), 0);
    if (o.ed) fill(K, o.ed, 0.62, pts(Y.e, c, ox, oy, m), 0);
    if (o.flat) return fill(K, f, 0.88, pts(Y.f, c, ox, oy, m), 0);
    fill(K, o.hi || f, 0.88, pts(Y.f, c, ox, oy, m, 0, 3), 0); fill(K, f, 0.8, pts(Y.f, c, ox, oy, m, 3, 5), 0); fill(K, f, 0.7, pts(Y.f, c, ox, oy, m, 5, 7), 0);
  }
  function fit(w, s) { return Math.min(4, Math.floor((w - 24) / (cells(s).w + 1))); }
  function mid(cx, s, c) { return Math.round(cx - cells(s).w * c / 2); }
  function lay(ev, c, s, mw) {
    var w = layers(s).w + 3, cc = Math.max(3, Math.min(c, Math.floor(((mw || Math.max(ev.area.w, 250)) - 16) / w)));
    return { c: cc, ox: Math.round(ev.cx - (w - 1) * cc / 2) + cc, w: w };
  }
  function hop(e, t0, c) { var k = Math.floor((e - t0) * 16); return k < 0 ? null : k < 6 ? HOP[k] * c : 0; }
  function flame(w, h, fr) {
    var key = w + "," + h + "," + (fr & 3), m = FLM[key], i, t, hw, cc, mh, ch, W2 = (w - 1) / 2, lean = [1.6, 0.4, -1.6, -0.4][fr & 3];
    if (m) return m;
    m = FLM[key] = [[], [], [], []];
    for (i = 0; i < h; i++) {
      t = (i + 0.5) / h;
      hw = t < 0.15 ? 0 : Math.round(W2 * (t < 0.72 ? Math.pow(t / 0.72, 0.95) : 1 - Math.pow((t - 0.72) / 0.28, 2) * 0.3));
      cc = W2 + Math.round(lean * Math.pow(1 - t, 1.6) * W2 * 0.9);
      mh = t > 0.34 && t < 0.97 ? Math.floor(hw * 0.66) : -1; ch = t > 0.55 && t < 0.9 ? Math.floor(hw * 0.5 * Math.sin((t - 0.55) / 0.35 * Math.PI)) : -1;
      if (t < 0.3) m[0].push(cc - hw, i - 1, 2 * hw + 1);
      if (mh < 0) m[1].push(cc - hw, i, 2 * hw + 1);
      else {
        m[1].push(cc - hw, i, hw - mh, cc + mh + 1, i, hw - mh);
        if (ch < 0) m[2].push(cc - mh, i, 2 * mh + 1);
        else m[2].push(cc - mh, i, mh - ch, cc + ch + 1, i, mh - ch), m[3].push(cc - ch, i, 2 * ch + 1);
      }
    }
    return m;
  }
  function flames(K, n, cx, sp, y, w, h, d0, hv, c, e, g) {
    var P = [[], [], [], []], i, m = (n - 1) / 2, t, hh, f, x0, y0, j, k;
    for (i = 0; i < n; i++) {
      t = e - d0 - Math.abs(i - m) * 0.03;
      hh = Math.round((h + (i === m ? hv : 0)) * k01(t / 0.2) * g);
      if (t < 0 || hh < 2) continue;
      f = flame(w, hh, Math.floor(t * 12) + i);
      x0 = snap(cx + (i - m) * sp, c) - Math.floor(w / 2) * c; y0 = snap(y, c) - hh * c;
      for (k = 0; k < 4; k++) for (j = 0; j < f[k].length; j += 3) if (f[k][j + 2] > 0) P[k].push(x0 + f[k][j] * c, y0 + f[k][j + 1] * c, f[k][j + 2] * c, c);
    }
    fill(K, "loss", 0.8, P[0], 0); fill(K, "dusk", 0.84, P[1], 0); fill(K, "hot", 0.86, P[2], 0); fill(K, "light", 0.74, P[3], 0);
  }
  function rays(out, x, y, n, a0, r0, r1, c) {
    var i, d, a;
    for (i = 0; i < n; i++) for (d = r0; d <= r1; d += 2) { a = a0 + i / n * TAU; out.push(snap(x + Math.cos(a) * d * c, c), snap(y + Math.sin(a) * d * c, c)); }
    return out;
  }
  function expand(K, x, y, c, ink, r0, r1, dur, t, thick) {
    if (t < 0 || t > dur) return;
    var p = Math.floor(k01(t / dur) * 6) / 6, R = Math.round(r0 + (r1 - r0) * (1 - Math.pow(1 - p, 2))), Ri = R - (thick ? 2 : 1), out = [], j, xo, h;
    for (j = -R; j <= R; j++) {
      xo = Math.floor(Math.sqrt(R * R - j * j)); h = Ri * Ri > j * j ? Math.floor(Math.sqrt(Ri * Ri - j * j)) : -1;
      if (h < 0) out.push(x - (xo + 0.5) * c, y + (j - 0.5) * c, (2 * xo + 1) * c, c);
      else out.push(x - (xo + 0.5) * c, y + (j - 0.5) * c, (xo - h) * c, c, x + (h + 0.5) * c, y + (j - 0.5) * c, (xo - h) * c, c);
    }
    fill(K, ink, 0.86 - 0.3 * p, out, 0);
  }
  function sparks(K, o, e) {
    var r = K.rand(o.seed), P = [[], [], []], i, a, v, d, q, t, x;
    for (i = 0; i < o.n; i++) {
      a = o.dir == null ? r() * TAU : o.dir + (r() - 0.5) * o.cone; v = o.v[0] + r() * (o.v[1] - o.v[0]); d = o.life * (0.6 + r() * 0.4); q = r(); x = (r() - 0.5) * (o.w || 0);
      t = tw(e - (o.delay || 0) - r() * (o.stag || 0));
      if (t >= 0 && t <= d) P[q < 0.25 ? 0 : q < 0.65 ? 1 : 2].push(snap(o.x + x + Math.cos(a) * v * t, o.c), snap(o.y + Math.sin(a) * v * t + 0.5 * o.g * t * t, o.c));
    }
    for (i = 0; i < 3; i++) fill(K, o.ink[i], 0.86, P[i], o.c);
  }
  function crumble(e, t0, span, c) {
    return function (col, row, p) {
      var t = tw(e - t0 - hsh(col, row) * span);
      if (t < 0) return true;
      if (t > 0.17) return false;
      p[1] += snap(t * t * 900, c); p[0] += snap((hsh(row, col) - 0.5) * 60 * t, c);
      return true;
    };
  }
  function tier(K, ev, e, p) {
    var L = lay(ev, p.c, p.s, p.w), c = L.c, top = p.top == null ? Math.round(ev.cy + 30) : p.top, t0 = p.t0 || 0, h = hop(e, t0, c), k = Math.floor((e - t0) * 16), lab = Math.max(3, Math.round(c / 2.6));
    var cap = p.cap || "COMBO", g = 1 - k01((e - p.x) / 0.26), cx = ev.cx, cy = top + 3.5 * c, i, f, r, rs, mod = e > p.x ? crumble(e, p.x, 0.22, c) : null;
    if (h === null) return;
    word(K, p.s, c, L.ox, top + h, { face: k === 3 ? "light" : p.face, hi: p.hi, ed: p.ed, sh: p.sh, shc: p.shc, mod: mod });
    if (k >= 3 && !p.nocap && (!mod || p.x > 0.8)) word(K, cap, lab, mid(cx, cap, lab), top + 8 * c + lab, { face: p.lab || p.face, flat: 1, mod: mod });
    for (i = 0; p.fl && i < p.fl.length; i++) { f = p.fl[i]; flames(K, f[0], cx, f[1], top - 6, f[2], f[3], f[4], f[5], f[6], e, g); }
    for (i = 0; p.rg && i < p.rg.length; i++) { r = p.rg[i]; expand(K, cx, cy, r[6], r[0], r[1], r[2], r[3], e - r[4], r[5]); }
    if (p.ry) {
      r = p.ry; rs = rays([], cx, cy, r[0], r[4], r[1], r[2], r[3]); i = rs.length / 2;
      if (e > r[5] && e < r[5] + r[6] + 0.4) fill(K, "dusk", 0.82, rs.slice(Math.floor(i * k01((e - r[5] - r[6]) / 0.4)) * 2, Math.floor(i * k01((e - r[5]) / r[6])) * 2), r[3]);
    }
    if (p.sp) { p.sp.x = cx; p.sp.y = cy - c + (p.sp.dy || 0); p.sp.seed = ev.seed + c; sparks(K, p.sp, e); }
  }
  var FIRE = ["light", "hot", "loss"], T = {  // fl: flames [n, spacing, w, h, delay, mid extra, cell]; rg: rings [ink, r0, r1, dur, delay, thick, cell]
    cold: { s: "x1.0", c: 7, face: "pop", hi: "light", sh: "night", shc: 0.5, x: 0.5,
      sp: { n: 14, v: [30, 90], life: 0.7, g: 160, c: 4, ink: ["pop", "light", "pop"], delay: 0.1, dir: Math.PI / 2, cone: 2.4, w: 150, stag: 0.3, dy: -70 } },
    warm: { s: "x1.2", c: 9, face: "dusk", hi: "hot", sh: "loss", shc: 0.45, x: 0.66, fl: [[2, 112, 5, 8, 0.18, 0, 6]], rg: [["dusk", 4, 13, 0.4, 0.14, 0, 6]] },
    hot: { s: "x1.35", c: 9, face: "hot", ed: "dusk", sh: "key", x: 0.86, fl: [[4, 56, 7, 10, 0.18, 0, 7]], rg: [["hot", 3, 15, 0.45, 0.15, 1, 8], ["dusk", 3, 19, 0.55, 0.2, 0, 8]],
      sp: { n: 16, v: [140, 300], life: 0.6, g: 380, c: 4, ink: ["light", "hot", "dusk"], delay: 0.14 } },
    fire: { s: "x1.5", c: 11, face: "hot", ed: "dusk", sh: "loss", x: 1.12, fl: [[6, 54, 7, 12, 0.16, 0, 8]], ry: [10, 5, 18, 8, 0.3, 0.12, 0.2],
      rg: [["hot", 3, 19, 0.5, 0.14, 1, 8], ["loss", 3, 25, 0.6, 0.2, 0, 8]], sp: { n: 28, v: [160, 360], life: 0.8, g: 300, c: 5, ink: FIRE, delay: 0.14 } },
    nova: { s: "x2.0", c: 14, face: "light", ed: "hot", sh: "loss", x: 1.9, t0: 0.26, cap: "MAX COMBO", lab: "hot", ry: [16, 4, 34, 10, 0.2, 0.04, 0.5],
      fl: [[5, 64, 7, 15, 0.36, 7, 10], [4, 64, 5, 9, 0.5, 0, 10]], rg: [["hot", 3, 30, 0.9, 0, 1, 10], ["dusk", 3, 33, 0.9, 0.08, 0, 10], ["loss", 3, 36, 0.9, 0.16, 0, 10]],
      sp: { n: 44, v: [180, 520], life: 1.2, g: -120, c: 6, ink: FIRE, delay: 0.3, dir: -Math.PI / 2, cone: 2.6 } }
  };
  function beat(id, dur, hit) { return { dur: dur, draw: function (K, ev, e) { tier(K, ev, e, T[id]); }, hit: hit }; }

  window.T82ART.add("hot", "arcade", {
    name: "Combo",
    by: "8-bit combo counters, x1.0 to x2.0, with pixel flames and a sunburst; a high score screen for the save, GAME OVER for the miss.",
    prep: function () { return []; },
    slots: {
      cold: beat("cold", 0.9), warm: beat("warm", 0.9), hot: beat("hot", 1.1),
      fire: beat("fire", 1.4, function (K, ev) { K.shake(ev.box, 0.5, 6); }),
      nova: beat("nova", 2.4, function (K, ev) { K.flash(0.5, "hot"); K.shake(ev.box, 0.9, 11); }),
      save: { dur: 2.2, hit: function (K, ev) { K.flash(0.4, "hot"); K.shake(ev.box, 0.7, 8); }, draw: function (K, ev, e) {
        var Z = ev.area, pw = Math.min(300, Z.w - 24), py = Math.round(Z.y + 76), cx = ev.cx, i, p, t, n, X, Y, hs = "HIGH SCORE", tl = "1ST 82-0 YOU";
        var mod = e > 1.85 ? crumble(e, 1.85, 0.25, 4) : null, kq = Math.min(Math.floor(k01(e / 0.2) * 5) / 5, e > 1.85 ? Math.ceil((1 - (e - 1.85) / 0.33) * 5) / 5 : 1);
        var hc = fit(pw, hs), cc = fit(pw, tl);
        var W = Math.round(pw * kq), H = Math.round(180 * kq);
        X = Math.round(cx - W / 2); Y = Math.round(py + (180 - H) / 2);
        if (kq > 0) {  // the marquee: a violet field in a gold frame, grown and shrunk in steps
          fill(K, "night", 0.5, [X, Y, W, H], 0);
          fill(K, "hot", 0.88, [X, Y, W, 5, X, Y + H - 5, W, 5, X, Y, 5, H, X + W - 5, Y, 5, H], 0);
        }
        if (e > 0.2 && kq === 1) {
          tier(K, ev, e, { s: "82-0", c: 10, w: pw - 20, top: py + 62, t0: 0.2, x: 1.85, face: "light", ed: "hot", sh: "loss", nocap: 1 });
          word(K, hs, hc, mid(cx, hs, hc), py + 20, { face: Math.floor(e * 4) % 2 ? "light" : "hot", flat: 1, mod: mod });
          n = Math.min(tl.length, Math.floor((e - 0.8) * 16));
          if (n > 0) word(K, tl.substr(0, n), cc, mid(cx, tl, cc), py + 144, { face: n >= tl.length && Math.floor(e * 6) % 2 ? "light" : "pop", flat: 1, mod: mod });
        }
        p = [[0.1, 0.08, 0.35, "hot"], [0.9, 0.1, 0.5, "pop"], [0.18, 0.7, 0.65, "loss"], [0.82, 0.74, 0.8, "light"], [0.5, 0.86, 0.95, "dusk"]];
        for (i = 0; i < 5; i++) {  // five shells of squares round the card
          X = Z.x + Z.w * p[i][0]; Y = Z.y + Z.h * p[i][1];
          expand(K, X, Y, 6, p[i][3], 2, 11, 0.5, e - p[i][2], false);
          sparks(K, { x: X, y: Y, n: 16, v: [100, 260], life: 0.8, g: 260, c: 5, ink: ["light", p[i][3], "hot"], seed: ev.seed + i * 7, delay: p[i][2] }, e);
        }
        expand(K, cx, py + 90, 12, "hot", 2, 14, 0.8, e - 1.0, true);
        sparks(K, { x: cx, y: py + 90, n: 40, v: [160, 480], life: 1.0, g: 300, c: 6, ink: FIRE, seed: ev.seed + 99, delay: 1.0 }, e);
        if (e < 1.95) sparks(K, { x: cx, y: Z.y - 10, w: Z.w, n: 36, v: [140, 260], life: 1.6, g: 0, c: 5, ink: ["hot", "loss", "pop"], seed: ev.seed + 5, delay: 0.45, stag: 0.9, dir: Math.PI / 2, cone: 0.3 }, e);
      } },
      miss: { dur: 1.2, draw: function (K, ev, e) {
        var Z = ev.area, W = ["GAME", "OVER"], L = lay(ev, 8, "GAME", Z.w * 0.8), c = L.c, yc = Z.y + Z.h * 0.42, i, cr = e > 0.78 ? crumble(e, 0.78, 0.2, c) : null, t;
        for (i = 0; i < 2; i++) {
          t = Math.floor((e - i * 0.1) * 50);  // a scanline wipe, row by row
          word(K, W[i], c, L.ox + (e > 0.3 && e < 0.76 && Math.floor(e * 12) % 2 ? 3 : 0), Math.round(yc - 62 + i * 68), { face: "loss", sh: "night", shc: 0.6, mod: function (col, row, p) { return row < t && (!cr || cr(col, row, p)); } });
        }
      } }
    }
  });
})();
