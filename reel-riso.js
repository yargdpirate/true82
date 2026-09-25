/* ---------- v48 RISO REEL ----------
   Prints THE SEASON · GAME BY GAME as a risograph ledger: every game is an
   ink stamp on paper. Wins are rhythm: Sunflower coins that pop in and run
   hotter as a streak grows. Losses break the rhythm on purpose. The cursor
   stops dead, the card takes a hit (shake, red flash), a scarlet ring slams
   down, cracks, sprays and keeps bleeding, and a giant misregistered L lands
   over the card and slowly drains while the card sags: bang, then the long
   groan. The drips stay in the ledger, so every loss still reads at the end.

   Pure cosmetics. app.js's showSeasonReel owns the season and the cursor and
   calls in here; nothing in this file reads or writes season.games. Any throw
   drops the reel back to the plain W/L chips (see risoCall in app.js).
   QA kill switch: ?riso=0 keeps the chips.

   v51: the reel prints on the site's own card in the theme's inks: wins in
   --t-win, losses in --t-loss, rims and offsets in --t-print-pop, the faces
   from --t-disp and --t-mono, and the veil in the print stock. On a dark
   stock the inks add light (--t-print-blend: screen) instead of taking it
   away, like fluorescent ink on black card. This file writes no colors of
   its own: black here is only ever a coverage mask.

   The halftone pipeline follows sevenevesai/riso-windowseat closely (the
   screen-threshold construction and the paper and starvation recipes), so
   its license notice is reproduced here:

   MIT License

   Copyright (c) 2026 sevenevesai

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in all
   copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   SOFTWARE.
*/
(function () {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined") return;

  var TAU = Math.PI * 2;
  var PITCH = 2.4;                                   // halftone pitch in CSS px
  var INKS = {                                       // each plate's screen angle, misregistration, grain shift; colors from the theme
    sun:     { role: "win",       ang: [3, 1], reg: [0, 0],      sh: 0 },
    pink:    { role: "print-pop", ang: [1, 1], reg: [1.2, -0.9], sh: 211 },
    scarlet: { role: "loss",      ang: [4, 1], reg: [0.8, 1.0],  sh: 97 }
  };
  function parseColor(s) {
    s = String(s || "").trim();
    var m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (m) { var h = m[1].length === 3 ? m[1].replace(/(.)/g, "$1$1") : m[1]; return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
    m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    return m ? [+m[1], +m[2], +m[3]] : null;
  }
  // The theme, read when a reel opens (never at load: test.js runs this file without a page).
  function readTheme(root) {
    var cs = window.getComputedStyle(root || document.documentElement);
    var v = function (n) { return cs.getPropertyValue("--t-" + n).trim(); };
    var col = function (n) { var c = parseColor(v(n)); if (!c) throw new Error("theme token --t-" + n + " is missing"); return c; };
    var TH = { rgb: {}, stock: col("print-paper"), disp: v("disp"), mono: v("mono"), blend: v("print-blend") };
    for (var k in INKS) TH.rgb[k] = col(INKS[k].role);
    if (!TH.disp || !TH.mono) throw new Error("theme fonts --t-disp / --t-mono are missing");
    if (TH.blend !== "screen" && TH.blend !== "multiply") TH.blend = (0.2126 * TH.stock[0] + 0.7152 * TH.stock[1] + 0.0722 * TH.stock[2]) / 255 < 0.35 ? "screen" : "multiply";
    return TH;
  }
  function family(stack) { var m = String(stack).match(/^\s*"?([^",]+)"?/); return m ? m[1].trim() : "sans-serif"; }
  var MONTH_NAMES = ["October", "November", "December", "January", "February", "March", "April"];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOut(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function dpr() { return Math.min(2, Math.max(1, window.devicePixelRatio || 1)); }
  function clock() { return (window.performance && performance.now ? performance.now() : Date.now()) / 1000; }
  function tone(t) { return "rgba(0,0,0," + clamp(t, 0, 1).toFixed(3) + ")"; }
  function cv(w, h) { var c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---- loss pacing and copy (pure, pinned by test.js) ---- */
  // Every loss stops the cursor. The loss that kills a real streak holds the
  // longest; later ones shorten so a bad season never drags. The first 14 get
  // the full bang (red flash, veil, giant L) and never come faster than ~1.3
  // per second, well under the 3-per-second photosensitivity threshold; past
  // that a loss still slams, sprays and bleeds, but without the flash.
  // Copy law: zero em-dashes.
  function heavy(lossNo) { return lossNo <= 14; }
  // v51: app.js paces every season to one end time (a bad season runs faster), so the red flash
  // carries its own speed limit: never closer than this, whatever the pace (~1.3 flashes a second).
  var FLASH_GAP = 0.77;
  function holdFor(lossNo, prevStreak) {
    if (lossNo <= 1) return prevStreak >= 5 ? 1700 : 1350;
    if (lossNo <= 6) return 1050;
    if (lossNo <= 14) return 700;
    return 240;
  }
  function lossCopy(info) {
    var at = "AT " + String(info.city || "").toUpperCase(), when = String(info.date || "").toUpperCase();
    if (info.cl === 1 && info.prevStreak >= 3) return ["THE STREAK DIES AT " + info.prevStreak, at + " \u00B7 " + when];
    if (info.cl === 1) return ["FIRST L \u00B7 " + at, when];
    if (info.lossRun >= 2) return [info.lossRun + " IN A ROW", at + " \u00B7 " + when];
    return [at, when];
  }

  /* ---- halftone screens ---- */
  var tiles = {};
  function tileFor(ink, pitch) {
    var key = ink + "@" + pitch.toFixed(3);
    if (tiles[key]) return tiles[key];
    var a = INKS[ink].ang[0], b = INKS[ink].ang[1], n = a * a + b * b, L = Math.sqrt(n);
    var S = Math.max(2, Math.round(pitch * L)), P = S / L, u = P / L;
    var v1x = u * a, v1y = u * b, v2x = -u * b, v2y = u * a, pts = [], R = Math.ceil(L + 4) * 2, m, k, x, y, i;
    for (m = -R; m <= R; m++) for (k = -R; k <= R; k++) {
      x = m * v1x + k * v2x; y = m * v1y + k * v2y;
      if (x > -2 * P && x < S + 2 * P && y > -2 * P && y < S + 2 * P) pts.push(x, y);
    }
    var th = new Float32Array(S * S), P2 = P * P;
    for (y = 0; y < S; y++) for (x = 0; x < S; x++) {
      var px = x + 0.5, py = y + 0.5, d2 = 1e9;
      for (i = 0; i < pts.length; i += 2) { var dx = px - pts[i], dy = py - pts[i + 1], q = dx * dx + dy * dy; if (q < d2) d2 = q; }
      var v = Math.PI * d2 / P2;                     // coverage at which a dot reaches this pixel
      if (v > 0.7854) v = 0.7854 + (v - 0.7854) * 0.2735;   // past 78% the dots merge and the holes close
      th[y * S + x] = v > 1 ? 1 : v;
    }
    tiles[key] = { S: S, th: th };
    return tiles[key];
  }
  var pats = {};
  function inkPattern(ctx, ink, pitch, cov, rgb) {
    var q = Math.round(clamp(cov, 0, 1) * 16), key = ink + rgb.join(",") + "@" + pitch.toFixed(3) + "#" + q, tile = pats[key];
    if (!tile) {
      var t = tileFor(ink, pitch), S = t.S, c = q / 16;
      tile = cv(S, S);
      var tx = tile.getContext("2d"), img = tx.createImageData(S, S);
      for (var i = 0; i < S * S; i++) if (c > 0 && c >= t.th[i]) { img.data[i * 4] = rgb[0]; img.data[i * 4 + 1] = rgb[1]; img.data[i * 4 + 2] = rgb[2]; img.data[i * 4 + 3] = 255; }
      tx.putImageData(img, 0, 0);
      pats[key] = tile;
    }
    var pat = ctx.createPattern(tile, "repeat");
    if (pat.setTransform && ctx.getTransform) pat.setTransform(ctx.getTransform().inverse());   // pinned: dots never swim
    return pat;
  }
  function makeGrain(W, H, r) {
    var g = new Float32Array(W * H), cell = 5, gw = Math.ceil(W / cell) + 2, gh = Math.ceil(H / cell) + 2, grid = new Float32Array(gw * gh), i, x, y;
    for (i = 0; i < grid.length; i++) grid[i] = r() * 2 - 1;
    for (y = 0; y < H; y++) {
      var fy = y / cell, iy = fy | 0, ty = fy - iy, sy = ty * ty * (3 - 2 * ty);
      for (x = 0; x < W; x++) {
        var fx = x / cell, ix = fx | 0, tx = fx - ix, sx = tx * tx * (3 - 2 * tx), i0 = iy * gw + ix;
        var top = grid[i0] + (grid[i0 + 1] - grid[i0]) * sx, bot = grid[i0 + gw] + (grid[i0 + gw + 1] - grid[i0 + gw]) * sx;
        g[y * W + x] = top + (bot - top) * sy;
      }
    }
    return g;
  }
  function makeStarve(W, H, r, d) {             // pinned specks punched out of every ink: solids print mottled, not laser-flat
    var c = cv(W, H), x = c.getContext("2d"), i, n;
    x.fillStyle = "#000";
    for (i = 0, n = Math.round(W * H / 900); i < n; i++) { x.globalAlpha = 0.18 + r() * 0.5; x.beginPath(); x.arc(r() * W, r() * H, (0.4 + r() * 1.3) * d, 0, TAU); x.fill(); }
    x.globalAlpha = 1;
    return c;
  }
  function makePlate(cssW, cssH, seed, TH) {
    var d = dpr(), W = Math.max(8, Math.round(cssW * d)), H = Math.max(8, Math.round(cssH * d)), r = mulberry(seed >>> 0);
    var P = { W: W, H: H, k: d, pitch: PITCH * d, rgb: TH.rgb, blend: TH.blend };
    P.grain = makeGrain(W, H, r);
    P.starve = makeStarve(W, H, r, d);
    P.s = cv(W, H);
    P.sg = P.s.getContext("2d", { willReadFrequently: true });
    return P;
  }
  function screen(data, P, ink) {
    var t = tileFor(ink, P.pitch), S = t.S, th = t.th, G = P.grain, W = P.W, H = P.H, sh = INKS[ink].sh, rgb = P.rgb[ink];
    for (var y = 0; y < H; y++) {
      var trow = (y % S) * S, grow = ((y + sh) % H) * W, i = y * W * 4;
      for (var x = 0; x < W; x++, i += 4) {
        var a = data[i + 3];
        if (a < 3) { data[i + 3] = 0; continue; }
        if (a / 255 >= th[trow + (x % S)] + G[grow + ((x + sh * 3) % W)] * 0.085) { data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2]; data[i + 3] = 255; }
        else data[i + 3] = 0;
      }
    }
  }
  // One ink over a whole small canvas: draw tone as alpha, screen it, punch the
  // starve specks, then print it on (multiply on light stock, screen on dark)
  // with that ink's registration offset.
  function inkPass(ctx, P, ink, draw) {
    var g = P.sg;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    g.clearRect(0, 0, P.W, P.H);
    g.setTransform(P.k, 0, 0, P.k, 0, 0); g.fillStyle = "#000"; g.strokeStyle = "#000";
    draw(g);
    g.setTransform(1, 0, 0, 1, 0, 0);
    var img = g.getImageData(0, 0, P.W, P.H);
    screen(img.data, P, ink);
    g.putImageData(img, 0, 0);
    g.globalCompositeOperation = "destination-out"; g.drawImage(P.starve, 0, 0); g.globalCompositeOperation = "source-over";
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = P.blend;
    ctx.drawImage(P.s, INKS[ink].reg[0] * P.k, INKS[ink].reg[1] * P.k);
    ctx.restore();
  }

  /* ---- stamp shapes ---- */
  function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0.01, r), 0, TAU); }
  function popScale(p) { return p >= 1 ? 1 : 1 + 0.55 * Math.pow(1 - p, 3) - 0.07 * Math.sin(p * Math.PI); }    // lands, squashes, settles
  function slamScale(p) { return p >= 1 ? 1 : 1 + 1.9 * Math.pow(1 - p, 3) - 0.1 * Math.sin(p * Math.PI); }     // from nearly 3x, hard
  function drawCracks(g, D, c, R) {
    g.save(); g.globalCompositeOperation = "destination-out"; g.strokeStyle = "#000"; g.lineCap = "round"; g.lineWidth = Math.max(0.8, R * 0.09);
    D.cracks.forEach(function (k) {
      g.beginPath();
      g.moveTo(c[0] + Math.cos(k.a) * R * 0.45, c[1] + Math.sin(k.a) * R * 0.45);
      g.lineTo(c[0] + Math.cos(k.a + k.j0) * R * 0.76, c[1] + Math.sin(k.a + k.j0) * R * 0.76);
      g.lineTo(c[0] + Math.cos(k.a + k.j1) * R * 1.1, c[1] + Math.sin(k.a + k.j1) * R * 1.1);
      g.stroke();
    });
    g.restore();
  }
  function drawDrips(g, D, c, R, maxLen, grow) {
    if (grow <= 0) return;
    D.drips.forEach(function (q) {
      var x0 = c[0] + q.dx * R, y0 = c[1] + R * 0.96, len = maxLen * q.len * grow, w = R * q.w;
      var xm = x0 + Math.sin(q.wob) * R * 0.12, x1 = x0 + Math.sin(q.wob + 1.3) * R * 0.16, y1 = y0 + len;
      g.beginPath(); g.moveTo(x0 - w / 2, y0 - 1);
      g.quadraticCurveTo(xm - w * 0.38, (y0 + y1) / 2, x1 - w * 0.3, y1);
      g.lineTo(x1 + w * 0.3, y1);
      g.quadraticCurveTo(xm + w * 0.38, (y0 + y1) / 2, x0 + w / 2, y0 - 1);
      g.closePath(); g.fill();
      circ(g, x1, y1, w * 0.62 * (0.6 + 0.4 * grow)); g.fill();
    });
  }

  /* ---- a month strip (module level, so strip() can print one on its own) ---- */
  function center(S, idx) { var c = idx % S.cols, r = Math.floor(idx / S.cols); return [S.pitch * (c + 0.5), S.pitch * (r + 0.5)]; }
  function drawStrip(S, t) {
    var x = S.ctx, R = S.pitch * 0.36, anyW = false, anyL = false;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "source-over"; x.clearRect(0, 0, S.P.W, S.P.H);
    S.dots.forEach(function (D) { if (D.win) anyW = true; else anyL = true; });
    if (anyW) inkPass(x, S.P, "sun", function (g) {
      S.dots.forEach(function (D) {
        if (!D.win) return;
        var c = center(S, D.idx), p = (t - D.t0) / 0.17, s = popScale(p);
        g.fillStyle = tone(0.95 + 0.05 * clamp(1 - p, 0, 1)); circ(g, c[0], c[1], R * s); g.fill();
        if (D.streak >= 30) {                                 // 30 straight: a paper glint on the coin
          g.save(); g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000";
          g.beginPath(); g.ellipse(c[0] - R * s * 0.34, c[1] - R * s * 0.36, R * s * 0.3, R * s * 0.11, -0.7, 0, TAU); g.fill(); g.restore();
        }
      });
    });
    inkPass(x, S.P, "pink", function (g) {
      S.dots.forEach(function (D) {
        var c = center(S, D.idx), e = t - D.t0;
        if (D.win) {
          var s = popScale(e / 0.17), b = clamp(1 - e / 0.17, 0, 1);
          g.strokeStyle = tone(0.82); g.lineWidth = R * s * (D.streak >= 10 ? 0.2 : 0.12); circ(g, c[0], c[1], R * s * 0.95); g.stroke();
          if (D.streak >= 20) { g.strokeStyle = tone(D.streak >= 30 ? 0.72 : 0.5); g.lineWidth = R * 0.11; circ(g, c[0], c[1], R * 1.34); g.stroke(); }
          if (b > 0) { g.fillStyle = tone(0.3 * b); circ(g, c[0], c[1], R * s * 0.8); g.fill(); }      // hot stamp: flashes orange as it lands
        } else {
          var s2 = slamScale(e / 0.13);
          g.strokeStyle = tone(0.62); g.lineWidth = R * s2 * 0.32; circ(g, c[0], c[1], R * s2 * 0.82); g.stroke();
          drawCracks(g, D, c, R * s2);
        }
      });
    });
    if (anyL) inkPass(x, S.P, "scarlet", function (g) {
      S.dots.forEach(function (D) {
        if (D.win) return;
        var c = center(S, D.idx), e = t - D.t0, s = slamScale(e / 0.13), b = clamp(1 - e / 0.22, 0, 1);
        g.strokeStyle = tone(0.98); g.lineWidth = R * s * 0.36; circ(g, c[0], c[1], R * s * 0.82); g.stroke();
        if (b > 0) { g.fillStyle = tone(0.55 * b); circ(g, c[0], c[1], R * s * 0.64); g.fill(); }
        g.fillStyle = tone(0.96);
        var lastRow = Math.floor(D.idx / S.cols) === S.rows - 1;
        drawDrips(g, D, c, R, S.pitch * (lastRow ? 0.92 : 0.22), easeOut((e - 0.12) / 1.15));
        var k = clamp(e / 0.06, 0, 1);
        if (k > 0) D.splats.forEach(function (q) { circ(g, c[0] + Math.cos(q.a) * q.d * R, c[1] + Math.sin(q.a) * q.d * R, q.s * R * k); g.fill(); });
        drawCracks(g, D, c, R * s);
      });
    });
  }
  // A loss's drips, splats and cracks, seeded by the game so every reprint matches.
  function lossMarks(D, gi, cl) {
    var r = mulberry(((gi + 1) * 2654435761) >>> 0), k, nd;
    D.drips = []; D.splats = []; D.cracks = [];
    nd = 1 + (r() < 0.45 ? 1 : 0) + (cl === 1 ? 1 : 0);
    for (k = 0; k < nd; k++) D.drips.push({ dx: (r() - 0.5) * 0.7, len: 0.55 + r() * 0.45, w: 0.2 + r() * 0.1, wob: r() * TAU });
    for (k = 0, nd = 6 + ((r() * 5) | 0); k < nd; k++) D.splats.push({ a: r() * TAU, d: 1.15 + r() * 0.8, s: 0.07 + r() * 0.1 });
    for (k = 0; k < 3; k++) D.cracks.push({ a: r() * TAU, j0: (r() - 0.5) * 0.5, j1: (r() - 0.5) * 0.5 });
    return D;
  }

  /* ---- the reel ---- */
  // opts.root: the element whose theme to print in (default: the page)
  function create(ov, season, opts) {
    if (typeof location !== "undefined" && /[?&]riso=0(&|$)/.test(location.search)) return null;
    var probe = cv(2, 2);
    if (!probe.getContext || !probe.getContext("2d") || !probe.getContext("2d").getImageData) return null;
    var card = ov.querySelector(".reel-card"), head = ov.querySelector(".reel-head"), runEl = ov.querySelector("#reelRun");
    if (!card || !head || !runEl) return null;
    var TH = readTheme(opts && opts.root), RGB = TH.rgb, DISP = TH.disp, MONO = TH.mono;

    ov.classList.add("riso");
    var streakEl = document.createElement("span");
    streakEl.className = "riso-streak mono";
    head.insertBefore(streakEl, runEl);
    var flash = document.createElement("div");
    flash.className = "riso-flash";
    card.appendChild(flash);
    var fxC = document.createElement("canvas");
    fxC.className = "riso-fx"; fxC.setAttribute("aria-hidden", "true");
    card.appendChild(fxC);
    var fx = fxC.getContext("2d"), fxW = 0, fxH = 0, fxDirty = false;
    // QA: ?risoslow=6 runs every effect (and the loss hold) 6x slower, for reviewing a loss frame by frame.
    var slowM = typeof location !== "undefined" && /[?&]risoslow=([0-9.]+)/.exec(location.search), SLOW = slowM ? clamp(parseFloat(slowM[1]) || 1, 1, 20) : 1;
    function now() { return clock() / SLOW; }
    var strips = [], parts = [], events = [], alive = true, raf = 0, bigL = null, last = now(), resizeT = 0, lastFlash = -1e9;

    function layout(S) {
      var gw = Math.max(120, Math.round(S.grid.getBoundingClientRect().width || 300));
      var pitch = clamp(gw / 15, 17, 27), cols = Math.max(1, Math.min(S.count, Math.floor(gw / pitch))), rows = Math.ceil(S.count / cols);
      S.pitch = pitch; S.cols = cols; S.rows = rows;
      S.cssW = Math.round(cols * pitch); S.cssH = Math.round(rows * pitch + pitch * 0.95);   // room below for drips
      S.canvas.style.width = S.cssW + "px"; S.canvas.style.height = S.cssH + "px";
      S.P = makePlate(S.cssW, S.cssH, 900 + S.mi * 31, TH);
      S.canvas.width = S.P.W; S.canvas.height = S.P.H;
      S.ctx = S.canvas.getContext("2d");
      S.needs = true;
    }
    function cardXY(S, idx) {
      var rc = card.getBoundingClientRect(), rs = S.canvas.getBoundingClientRect(), c = center(S, idx);
      return [rs.left - rc.left + c[0] * (rs.width / S.cssW), rs.top - rc.top + c[1] * (rs.height / S.cssH)];
    }
    function spark(p, n, ink, spMin, spMax, rMin, rMax, life, grav, rnd, streak) {
      for (var i = 0; i < n; i++) {
        var a = rnd() * TAU, sp = spMin + rnd() * (spMax - spMin), k = rnd();
        parts.push({ x: p[0], y: p[1], vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - grav * 0.1, g: grav,
          r: rMin + k * k * (rMax - rMin),                   // mostly fine spray, a few fat drops
          life: life[0] + rnd() * life[1], age: 0, ink: typeof ink === "function" ? ink(rnd) : ink, streak: !!streak });
      }
    }

    /* the giant L: nine coverage levels per plate, screened once; draining = stepping down them */
    function buildL() {
      if (bigL) return bigL;
      var d = dpr(), F = 300, w = Math.round(F * 0.72), h = Math.round(F * 0.92), P = makePlate(w, h, 8203, TH);
      var levels = [0.96, 0.84, 0.72, 0.6, 0.48, 0.37, 0.27, 0.18, 0.1], out = { w: w, h: h, scarlet: [], pink: [] };
      ["scarlet", "pink"].forEach(function (ink) {
        levels.forEach(function (c) {
          var can = cv(P.W, P.H), g = can.getContext("2d", { willReadFrequently: true });
          g.setTransform(d, 0, 0, d, 0, 0);
          g.fillStyle = tone(c * (ink === "pink" ? 0.72 : 1));
          g.font = "700 " + F + "px " + DISP; g.textAlign = "center"; g.fillText("L", w / 2, h * 0.86);
          g.setTransform(1, 0, 0, 1, 0, 0);
          var img = g.getImageData(0, 0, P.W, P.H);
          screen(img.data, P, ink);
          g.putImageData(img, 0, 0);
          g.globalCompositeOperation = "destination-out"; g.drawImage(P.starve, 0, 0);
          out[ink].push(can);
        });
      });
      bigL = out;
      return out;
    }
    // idle during the first month's lead, once the theme's display face has landed
    var faceP = document.fonts && document.fonts.load ? document.fonts.load("700 100px \"" + family(DISP) + "\"").catch(function () {}) : null;
    setTimeout(function () {
      var go = function () { if (alive && !bigL) try { buildL(); } catch (e) { bigL = null; } };
      if (faceP) faceP.then(go, go); else go();
    }, 320);

    function drawLoss(E, t, w, h, top, pass) {
      var e = t - E.t0, D = E.dur, d = dpr();
      if (pass === "veil") {                                   // everything but the wound fades
        var a = e < 0.14 ? e / 0.14 : e > D * 0.72 ? clamp(1 - (e - D * 0.72) / (D * 0.28), 0, 1) : 1;
        a *= E.first ? 0.7 : 0.6;
        if (a <= 0) return;
        fx.save();
        fx.fillStyle = "rgba(" + TH.stock.join(",") + "," + a.toFixed(3) + ")"; fx.fillRect(0, top, w, h - top);
        fx.globalCompositeOperation = "destination-out";
        var gr = fx.createRadialGradient(E.x, E.y, 8, E.x, E.y, 56);
        gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
        fx.fillStyle = gr; fx.fillRect(E.x - 60, E.y - 60, 120, 120);
        fx.restore();
        return;
      }
      if (!bigL || e < 0.07) return;                            // the L lands a beat after the slam
      var p = e - 0.07, s = p < 0.14 ? 1 + 0.45 * Math.pow(1 - p / 0.14, 3) : 1;
      var drain = clamp((p - 0.22) / Math.max(0.2, D - 0.5), 0, 1), lvl = Math.min(bigL.scarlet.length - 1, Math.floor(drain * bigL.scarlet.length));
      var fade = e > D - 0.2 ? clamp((D - e) / 0.2, 0, 1) : 1;
      // The L and its caption take whichever open span is larger, above or below
      // the wound, sized to fit it, so they never print over the row that just lost.
      var gap = 34, above = E.y - gap - top, below = h - (E.y + gap), useAbove = above >= below;
      var span = useAbove ? above : below, spanTop = useAbove ? top : E.y + gap;
      if (span < 150) { span = h - top; spanTop = top; }        // no room either side: the L takes the whole page
      var Lh = Math.max(70, Math.min((h - top) * 0.6, w * 0.95, (span - 62) / 0.76)), sc = Lh / bigL.h;
      var cx = w / 2, cy = spanTop + Math.max(4, (span - (0.76 * Lh + 50)) / 2) + 0.4 * Lh;
      var sink = drain * Math.min(28, span * 0.06), rot = -0.15 - drain * 0.05;
      fx.save();
      fx.globalAlpha = fade; fx.globalCompositeOperation = TH.blend;
      fx.translate(cx, cy + sink); fx.rotate(rot); fx.scale(s * sc, s * sc);
      fx.drawImage(bigL.pink[lvl], -bigL.w / 2 + 5, -bigL.h / 2 - 4, bigL.w, bigL.h);    // the plates miss each other
      fx.drawImage(bigL.scarlet[lvl], -bigL.w / 2, -bigL.h / 2, bigL.w, bigL.h);
      fx.restore();
      fx.save();
      fx.globalAlpha = fade; fx.globalCompositeOperation = TH.blend; fx.textAlign = "center";
      if ("letterSpacing" in fx) fx.letterSpacing = "2px";
      var ty = cy + sink + 0.36 * Lh + 26;                    // just under the L's baseline
      fx.font = "700 " + (E.first ? 14 : 12.5) + "px " + MONO; fx.fillStyle = inkPattern(fx, "scarlet", PITCH * d, 0.97, RGB.scarlet);
      fx.fillText(E.sub, cx, ty);
      if (E.sub2) { fx.font = "500 11px " + MONO; fx.fillStyle = inkPattern(fx, "scarlet", PITCH * d, 0.85, RGB.scarlet); fx.fillText(E.sub2, cx, ty + 18); }
      fx.restore();
    }
    function drawRing(E, t) {
      var p = (t - E.t0) / E.dur;
      if (p < 0 || p > 1) return;
      var r = E.r0 + (E.r1 - E.r0) * easeOut(p);
      fx.save(); fx.globalCompositeOperation = TH.blend;
      fx.strokeStyle = inkPattern(fx, E.ink, PITCH * dpr(), E.cov * (1 - p * 0.8), RGB[E.ink]); fx.lineWidth = E.w0 * (1 - p) + 1;
      fx.beginPath(); fx.arc(E.x, E.y, r, 0, TAU); fx.stroke(); fx.restore();
    }
    function drawParts() {
      var d = dpr();
      ["sun", "pink", "scarlet"].forEach(function (ink) {
        var dots = false, streaks = [];
        fx.beginPath();
        parts.forEach(function (q) {
          if (q.ink !== ink) return;
          var k = 1 - q.age / q.life;
          if (k <= 0) return;
          var rr = q.r * (0.45 + 0.55 * k);
          if (q.streak) streaks.push([q, rr]);                   // ink in flight smears along its path
          else { fx.moveTo(q.x + rr, q.y); fx.arc(q.x, q.y, rr, 0, TAU); dots = true; }
        });
        fx.save(); fx.globalCompositeOperation = TH.blend;
        if (dots) { fx.fillStyle = inkPattern(fx, ink, PITCH * d, 0.95, RGB[ink]); fx.fill(); }
        if (streaks.length) {
          fx.strokeStyle = inkPattern(fx, ink, PITCH * d, 0.95, RGB[ink]); fx.lineCap = "round";
          streaks.forEach(function (s) {
            var q = s[0];
            fx.lineWidth = s[1] * 1.5; fx.beginPath(); fx.moveTo(q.x - q.vx * 0.02, q.y - q.vy * 0.02); fx.lineTo(q.x, q.y); fx.stroke();
          });
        }
        fx.restore();
      });
    }
    function fxFrame(t) {
      var d = dpr(), w = card.clientWidth, h = card.clientHeight;
      if (w !== fxW || h !== fxH) { fxW = w; fxH = h; fxC.width = Math.max(1, Math.round(w * d)); fxC.height = Math.max(1, Math.round(h * d)); }
      fx.setTransform(1, 0, 0, 1, 0, 0); fx.globalAlpha = 1; fx.globalCompositeOperation = "source-over";
      fx.clearRect(0, 0, fxC.width, fxC.height);
      fx.setTransform(d, 0, 0, d, 0, 0);
      var top = head.offsetHeight;
      events.forEach(function (E) { if (E.type === "loss") drawLoss(E, t, w, h, top, "veil"); });
      events.forEach(function (E) { if (E.type === "ring") drawRing(E, t); });
      drawParts();
      events.forEach(function (E) { if (E.type === "loss") drawLoss(E, t, w, h, top, "L"); });
    }
    function frame() {
      if (!alive) return;
      var t = now(), dt = Math.min(0.05, t - last);
      last = t;
      strips.forEach(function (S) { if (S.needs || t < S.dirtyUntil) { S.needs = false; drawStrip(S, t); } });
      parts.forEach(function (q) { q.age += dt; q.vx *= 1 - 1.2 * dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; });
      parts = parts.filter(function (q) { return q.age < q.life; });
      events = events.filter(function (E) { return t - E.t0 < E.dur; });
      if (events.length || parts.length) { fxFrame(t); fxDirty = true; }
      else if (fxDirty) { fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, fxC.width, fxC.height); fxDirty = false; }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    function onResize() {
      clearTimeout(resizeT);
      resizeT = setTimeout(function () { strips.forEach(function (S) { S.dots.forEach(function (D) { D.t0 = -1e6; }); layout(S); }); }, 200);
    }
    window.addEventListener("resize", onResize);

    function jolt(el, frames, opts) { if (el && el.animate) try { el.animate(frames, opts); } catch (e) { /* cosmetic */ } }
    function shake(D, first, full) {
      var k = [], n = 8, amp = first ? 13 : full ? 10 : 5, end = Math.min(0.6, 0.42 / D);
      for (var i = 0; i <= n; i++) {
        var f = i / n, dec = 1 - f, sgn = i % 2 ? -1 : 1;
        k.push({ transform: "translate(" + (sgn * amp * dec * (0.7 + 0.3 * ((i * 37) % 10) / 10)).toFixed(1) + "px," + ((i % 3 ? -1 : 1) * amp * 0.55 * dec).toFixed(1) + "px) rotate(" + (sgn * 0.9 * dec).toFixed(2) + "deg)", offset: f * end });
      }
      k.push({ transform: "translate(0px,6px) rotate(0.6deg)", offset: end + (1 - end) * 0.45 });   // the sag
      k.push({ transform: "translate(0px,0px) rotate(0deg)", offset: 1 });
      jolt(card, k, { duration: D * 1000 * SLOW, easing: "linear" });
    }
    function header(info, win) {
      runEl.innerHTML = info.cw + "\u2013" + (info.cl ? "<i>" + info.cl + "</i>" : "0");
      if (win) {
        if (info.streak >= 3) { streakEl.textContent = info.streak + " STRAIGHT"; streakEl.className = "riso-streak mono" + (info.streak >= 10 ? " hot" : ""); }
        else { streakEl.textContent = ""; streakEl.className = "riso-streak mono"; }
      } else if (info.prevStreak >= 3) { streakEl.textContent = info.prevStreak + " STRAIGHT"; streakEl.className = "riso-streak mono dead"; }
      else if (info.lossRun >= 2) { streakEl.textContent = info.lossRun + " LOSSES IN A ROW"; streakEl.className = "riso-streak mono cold"; }
      else { streakEl.textContent = ""; streakEl.className = "riso-streak mono"; }
    }

    function openMonth(row, mi, count) {
      var grid = row.querySelector(".reel-grid");
      if (!grid) throw new Error("reel row has no grid");
      var c = document.createElement("canvas");
      c.className = "riso-strip"; c.setAttribute("role", "img"); c.setAttribute("aria-label", (MONTH_NAMES[mi] || "Month") + ", in progress");
      grid.appendChild(c);
      var S = { row: row, grid: grid, canvas: c, mi: mi, count: count, dots: [], dirtyUntil: 0, needs: true };
      layout(S);
      row.__riso = S;
      strips.push(S);
    }
    function stamp(row, idx, win, info) {
      var S = row.__riso;
      if (!S) throw new Error("reel row has no strip");
      var t = now(), D = { idx: idx, win: win, t0: info.instant ? -1e6 : t, streak: info.streak || 0 };
      if (!win) lossMarks(D, info.gi, info.cl);
      S.dots.push(D);
      // the month rides the page, so the Reprint Lab can print it again in any look (strip() below)
      var lossesHere = S.dots.filter(function (x) { return !x.win; }).length;
      S.canvas.setAttribute("data-games", S.dots.map(function (x) { return x.win ? 1 : 0; }).join(""));
      S.canvas.setAttribute("data-streaks", S.dots.map(function (x) { return x.streak || 0; }).join(","));
      S.canvas.setAttribute("data-gi0", String(info.gi - idx));
      S.canvas.setAttribute("data-cl0", String(info.cl - lossesHere));
      header(info, win);
      if (info.instant) { S.needs = true; return 0; }
      S.dirtyUntil = Math.max(S.dirtyUntil, t + (win ? 0.24 : 1.5));
      var p = cardXY(S, idx), rnd = mulberry(((info.gi + 3) * 7919) >>> 0);
      if (win) {
        spark(p, 5, "sun", 60, 170, 1.3, 2.4, [0.2, 0.12], 260, rnd);
        if (info.streak >= 10 && info.streak % 10 === 0) {       // every tenth straight: a burst
          events.push({ type: "ring", t0: t, dur: 0.46, x: p[0], y: p[1], r0: 6, r1: 64, w0: 7, ink: "sun", cov: 0.95 });
          events.push({ type: "ring", t0: t + 0.05, dur: 0.5, x: p[0], y: p[1], r0: 4, r1: 78, w0: 4, ink: "pink", cov: 0.7 });
          spark(p, 12, "sun", 120, 260, 1.6, 3, [0.3, 0.2], 320, rnd);
          jolt(streakEl, [{ transform: "scale(1.5)" }, { transform: "scale(1)" }], { duration: 320 * SLOW, easing: "cubic-bezier(.2,1.5,.4,1)" });
        }
        return 0;
      }
      var H = Math.round(holdFor(info.cl, info.prevStreak) * (info.pace || 1)), dur = H / 1000, first = info.cl === 1, full = heavy(info.cl), copy = lossCopy(info);
      if (full) events.push({ type: "loss", t0: t, dur: dur, x: p[0], y: p[1], first: first, sub: copy[0], sub2: copy[1] });
      events.push({ type: "ring", t0: t, dur: 0.4, x: p[0], y: p[1], r0: 8, r1: first ? 200 : full ? 140 : 80, w0: full ? 11 : 7, ink: "scarlet", cov: 0.92 });
      if (full) events.push({ type: "ring", t0: t + 0.06, dur: 0.46, x: p[0], y: p[1], r0: 6, r1: first ? 240 : 170, w0: 6, ink: "pink", cov: 0.65 });
      spark(p, first ? 30 : info.cl <= 4 ? 20 : 12, function (q) { return q() < 0.2 ? "pink" : "scarlet"; },
        180, first ? 640 : 480, 1.1, first ? 5.2 : 3.8, [0.3, 0.38], 1500, rnd, true);
      if (full && t - lastFlash >= FLASH_GAP) { lastFlash = t; jolt(flash, [{ opacity: first ? 0.72 : 0.55 }, { opacity: 0 }], { duration: 260 * SLOW, easing: "ease-out" }); }
      shake(Math.max(dur, 0.42), first, full);
      jolt(runEl, [{ transform: "scale(1.9)" }, { transform: "scale(1)" }], { duration: 380 * SLOW, easing: "cubic-bezier(.2,1.5,.35,1)" });
      return H * SLOW;                                           // the cursor waits out the whole moment
    }
    function closeMonth(row, mi, w, l) {
      var S = row.__riso;
      if (S) S.canvas.setAttribute("aria-label", (MONTH_NAMES[mi] || "Month") + ": " + w + (w === 1 ? " win, " : " wins, ") + l + (l === 1 ? " loss" : " losses"));
      if (l === 0 && w > 0) {
        var line = row.querySelector(".reel-mo-line");
        if (!line) return;
        var st = document.createElement("span");
        st.className = "riso-swept mono"; st.textContent = "SWEPT";
        line.appendChild(st);
        jolt(st, [{ transform: "rotate(-9deg) scale(2.3)", opacity: 0 }, { transform: "rotate(-9deg) scale(1)", opacity: 1 }], { duration: 240 * SLOW, easing: "cubic-bezier(.2,1.4,.4,1)" });
      }
    }
    function finale(fin, s) {
      var rec = fin.querySelector(".reel-final-rec");
      if (!rec) return;
      rec.innerHTML = s.wins + "\u2013" + (s.losses ? "<i>" + s.losses + "</i>" : "0");
      jolt(rec, [{ transform: "scale(1.7)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 440 * SLOW, easing: "cubic-bezier(.2,1.4,.4,1)" });
      if (s.losses === 0) {                                    // 82-0: the whole card goes off
        var rc = card.getBoundingClientRect(), rr = rec.getBoundingClientRect(), p = [rr.left - rc.left + rr.width / 2, rr.top - rc.top + rr.height / 2], t = now(), rnd = mulberry(8200);
        for (var i = 0; i < 3; i++) {
          events.push({ type: "ring", t0: t + i * 0.16, dur: 0.6, x: p[0], y: p[1], r0: 10, r1: 150 + i * 50, w0: 9, ink: i % 2 ? "pink" : "sun", cov: 0.95 });
        }
        spark(p, 40, function (q) { return q() < 0.35 ? "pink" : "sun"; }, 160, 520, 1.6, 4.2, [0.5, 0.5], 700, rnd);
      }
    }
    function destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      clearTimeout(resizeT);
      window.removeEventListener("resize", onResize);
    }
    return { openMonth: openMonth, stamp: stamp, closeMonth: closeMonth, finale: finale, destroy: destroy };
  }

  /* ---- one finished month strip, in any theme (the Reprint Lab reprints frozen pages with it) ----
     opts = { root (theme element), games: "1101..." or [1,1,0,...], streaks: [..], gi0, cl0, mi,
              cssW (the strip's width in css px), d (device px per css px) }
     Every stamp prints settled (no pop, no flash, drips fully grown). Returns the canvas. */
  function strip(opts) {
    var TH = readTheme(opts.root), games = Array.isArray(opts.games) ? opts.games.map(function (g) { return g ? 1 : 0; }) : String(opts.games || "").split("").map(Number);
    var streaks = opts.streaks || [], gw = Math.max(120, Math.round(opts.cssW || 300)), pitch = clamp(gw / 15, 17, 27), count = games.length;
    var S = { mi: opts.mi || 0, count: count, pitch: pitch, cols: Math.max(1, Math.min(count, Math.floor(gw / pitch))), dots: [] };
    S.rows = Math.ceil(count / S.cols);
    S.cssW = Math.round(S.cols * pitch); S.cssH = Math.round(S.rows * pitch + pitch * 0.95);
    var d = opts.d || 2, r = mulberry((900 + S.mi * 31) >>> 0);
    var P = { W: Math.round(S.cssW * d), H: Math.round(S.cssH * d), k: d, pitch: PITCH * d, rgb: TH.rgb, blend: TH.blend };
    P.grain = makeGrain(P.W, P.H, r); P.starve = makeStarve(P.W, P.H, r, d); P.s = cv(P.W, P.H); P.sg = P.s.getContext("2d", { willReadFrequently: true });
    S.P = P; S.canvas = cv(P.W, P.H); S.ctx = S.canvas.getContext("2d");
    var cl = +opts.cl0 || 0;
    games.forEach(function (g, i) {
      var D = { idx: i, win: !!g, t0: -1e6, streak: +streaks[i] || 0 };
      if (!D.win) { cl++; lossMarks(D, (+opts.gi0 || 0) + i, cl); }
      S.dots.push(D);
    });
    drawStrip(S, 0);
    return S.canvas;
  }

  window.T82RISO = { create: create, strip: strip, holdFor: holdFor, heavy: heavy, lossCopy: lossCopy, flashGap: FLASH_GAP, theme: readTheme, version: "v51" };
})();
