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

   v67 (the art variants; the contract is art/CONTRACT.md): the owner found
   the same giant L "pretty stale" over a season, so the big loss moment and
   the ledger's dots are now art that changes. Today's L and today's stamps
   are the built-in sets named classic; a variant file (art/loss/<id>.js,
   art/dots/<id>.js) registers another one with T82ART.add, and both go
   through the same code here. create() takes the season's deal in opts
   (opts.loss, the loss moments in play order; opts.dots, the dot set); with
   no opts every frame prints exactly as v64.1 did. A variant draws through
   the kit K (the inks, the halftone screen, the hits) and nothing else, its
   costly printing runs in idle moments ahead of its loss (at most three
   ahead), and a variant that throws is turned off for the session and hands
   its moment back to classic: the art can never break the reel.

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
  // Each ink's screen angle (a rational tangent [a, b]), misregistration (css px) and grain shift; the colors come from
  // the theme. win, pop and loss are the ledger's three (v48 called them sun, pink and scarlet). v67 adds the six the
  // art variants print with (art/CONTRACT.md, "The kit"), each on its own angle so two inks laid over each other make a
  // fine rosette, not a moire: the loss hero's partners (pop 45, light 56, night 63, key 72, stock 76 degrees) all sit
  // 28 degrees or more off the loss ink's 14, and gold (0) sits 18 or more off win and pop. Registration stays under
  // 1.25 px a side (a strip's moving rect pads 2.5 device px for it). opt: the ink an older theme without that token
  // borrows, so a new ink can never turn the reel off.
  var INKS = {
    win:   { role: "win",         ang: [3, 1], reg: [0, 0],       sh: 0 },
    pop:   { role: "print-pop",   ang: [1, 1], reg: [1.2, -0.9],  sh: 211 },
    loss:  { role: "loss",        ang: [4, 1], reg: [0.8, 1.0],   sh: 97 },
    key:   { role: "print-key",   ang: [1, 3], reg: [-1.1, 0.8],  sh: 419, opt: "pop" },
    gold:  { role: "print-sun",   ang: [1, 0], reg: [-0.7, -1.1], sh: 307, opt: "win" },
    night: { role: "print-night", ang: [1, 2], reg: [-0.9, -1.0], sh: 353, opt: "pop" },
    dusk:  { role: "print-dusk",  ang: [3, 2], reg: [0.9, -1.2],  sh: 503, opt: "loss" },
    light: { role: "light",       ang: [2, 3], reg: [-0.6, 1.1],  sh: 157, opt: "win" },
    stock: { role: "print-paper", ang: [1, 4], reg: [1.0, 0.6],   sh: 263 }
  };
  var INK_ORDER = ["win", "pop", "loss", "key", "gold", "night", "dusk", "light", "stock"];
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
    var TH = { rgb: {}, stock: col("print-paper"), disp: v("disp"), mono: v("mono"), blend: v("print-blend") }, k;
    for (k in INKS) if (!INKS[k].opt) TH.rgb[k] = col(INKS[k].role);
    for (k in INKS) if (INKS[k].opt) TH.rgb[k] = parseColor(v(INKS[k].role)) || TH.rgb[INKS[k].opt];
    if (!TH.disp || !TH.mono) throw new Error("theme fonts --t-disp / --t-mono are missing");
    if (TH.blend !== "screen" && TH.blend !== "multiply") TH.blend = (0.2126 * TH.stock[0] + 0.7152 * TH.stock[1] + 0.0722 * TH.stock[2]) / 255 < 0.35 ? "screen" : "multiply";
    return TH;
  }
  function family(stack) { var m = String(stack).match(/^\s*"?([^",]+)"?/); return m ? m[1].trim() : "sans-serif"; }
  var MONTH_NAMES = ["October", "November", "December", "January", "February", "March", "April"];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(e0, e1, x) { var t = clamp((x - e0) / (e1 - e0 || 1e-9), 0, 1); return t * t * (3 - 2 * t); }
  function easeOut(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  var EASE = {                                       // every curve takes 0..1 (clamped) and lands on 1
    out: easeOut,
    inOut: function (t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(2 - 2 * t, 3) / 2; },
    back: function (t) { t = clamp(t, 0, 1) - 1; return 1 + 2.70158 * t * t * t + 1.70158 * t * t; },          // overshoots ~10%, settles
    elastic: function (t) { t = clamp(t, 0, 1); return t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * TAU / 3) + 1; },
    bounce: function (t) {
      t = clamp(t, 0, 1);
      if (t < 1 / 2.75) return 7.5625 * t * t;
      if (t < 2 / 2.75) { t -= 1.5 / 2.75; return 7.5625 * t * t + 0.75; }
      if (t < 2.5 / 2.75) { t -= 2.25 / 2.75; return 7.5625 * t * t + 0.9375; }
      t -= 2.625 / 2.75; return 7.5625 * t * t + 0.984375;
    }
  };
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
  function reducedMotion() { try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; } }

  /* ---- loss pacing and copy (pure, pinned by test.js) ---- */
  // Every loss stops the cursor. The loss that kills a real streak holds the
  // longest; later ones shorten so a bad season never drags. The first 14 get
  // the full bang (red flash, veil, giant L) and never come faster than ~1.3
  // per second, well under the 3-per-second photosensitivity threshold; past
  // that a loss still slams, sprays and bleeds, but without the flash.
  // Copy law: zero em-dashes.
  function heavy(lossNo) { return lossNo <= 14; }
  var HEAVY_N = 0;                                   // how many losses a season can give the big moment (14)
  while (HEAVY_N < 82 && heavy(HEAVY_N + 1)) HEAVY_N++;
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
    if (info.cl === 1 && info.prevStreak >= 3) return ["THE STREAK DIES AT " + info.prevStreak, at + " · " + when];
    if (info.cl === 1) return ["FIRST L · " + at, when];
    if (info.lossRun >= 2) return [info.lossRun + " IN A ROW", at + " · " + when];
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
    return P;
  }
  // data covers the rect x0,y0,w,h of the plate (the whole plate when no rect is given); the screen and the grain are
  // read at each pixel's plate position, so a rect screens exactly as it would inside the whole plate
  function screen(data, P, ink, x0, y0, w, h) {
    var t = tileFor(ink, P.pitch), S = t.S, th = t.th, G = P.grain, W = P.W, H = P.H, sh = INKS[ink].sh, rgb = P.rgb[ink];
    if (w == null) { x0 = 0; y0 = 0; w = W; h = H; }
    for (var y = y0; y < y0 + h; y++) {
      var trow = (y % S) * S, grow = ((y + sh) % H) * W, i = (y - y0) * w * 4;
      for (var x = x0; x < x0 + w; x++, i += 4) {
        var a = data[i + 3];
        if (a < 3) { data[i + 3] = 0; continue; }
        if (a / 255 >= th[trow + (x % S)] + G[grow + ((x + sh * 3) % W)] * 0.085) { data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2]; data[i + 3] = 255; }
        else data[i + 3] = 0;
      }
    }
  }
  // A whole plate of one ink: draw(g) lays tone (black at an alpha = coverage) in CSS px, then it is screened into the
  // ink's dots, with the plate's grain and its starve specks. The giant L's levels and every variant's prep print here.
  function screenCanvas(P, ink, draw) {
    var can = cv(P.W, P.H), g = can.getContext("2d", { willReadFrequently: true });
    g.save();
    g.setTransform(P.k, 0, 0, P.k, 0, 0); g.fillStyle = "#000"; g.strokeStyle = "#000";
    draw(g);
    g.restore();
    g.setTransform(1, 0, 0, 1, 0, 0);
    var img = g.getImageData(0, 0, P.W, P.H);
    screen(img.data, P, ink);
    g.putImageData(img, 0, 0);
    g.globalCompositeOperation = "destination-out"; g.drawImage(P.starve, 0, 0);
    return can;
  }
  // One plate over a month strip: draw tone as alpha, screen it, punch the starve specks. v64.1 (speed): each plate keeps
  // its own canvas, so a frame can redo only the rect D (device px) where a stamp is still moving. The tones are still
  // drawn over the whole strip, unclipped, on one shared scratch (vector work, cheap; a clip anti-aliases the shapes a
  // hair differently, and the screen turns a hair into a dot), and only D is read, screened, written back and specked:
  // the costly per-pixel part. The pixels are the ones a whole-strip pass makes (checked frame by frame, ?risofull=1).
  // v67: the canvases are keyed by plate (a, b, c), since a dot set chooses each plate's ink.
  function inkCanvas(S, pl) {
    if (!S.inkC) S.inkC = {};
    var c = S.inkC[pl];
    if (!c) { c = cv(S.P.W, S.P.H); c.g = c.getContext("2d", { willReadFrequently: true }); S.inkC[pl] = c; }
    return c;
  }
  function inkPass(S, pl, ink, draw, D) {
    var P = S.P, g = inkCanvas(S, pl).g;
    if (!S.scr) { S.scr = cv(P.W, P.H); S.scr.g = S.scr.getContext("2d", { willReadFrequently: true }); }
    var sg = S.scr.g, x0 = D ? D[0] : 0, y0 = D ? D[1] : 0, w = D ? D[2] : P.W, h = D ? D[3] : P.H;
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalAlpha = 1; sg.globalCompositeOperation = "source-over";
    sg.clearRect(0, 0, P.W, P.H);
    sg.setTransform(P.k, 0, 0, P.k, 0, 0); sg.fillStyle = "#000"; sg.strokeStyle = "#000";
    draw(sg);
    sg.setTransform(1, 0, 0, 1, 0, 0);
    var img = sg.getImageData(x0, y0, w, h);
    screen(img.data, P, ink, x0, y0, w, h);
    g.putImageData(img, x0, y0);
    g.save();
    if (D) { g.beginPath(); g.rect(x0, y0, w, h); g.clip(); }
    g.globalCompositeOperation = "destination-out"; g.drawImage(P.starve, 0, 0);
    g.restore();
  }
  // Print the plates on (multiply on light stock, screen on dark), each with its ink's registration offset, over the whole
  // strip or only inside the rect C (device px, integer; the draws are the same, the clip just keeps them inside).
  // Plate a (the win plate) prints only once the month has a win, plate c (the loss plate) once it has a loss.
  function inkPrint(S, anyW, anyL, C) {
    var x = S.ctx, P = S.P, ds = S.ds;
    x.save();
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = "source-over";
    if (C) { x.beginPath(); x.rect(C[0], C[1], C[2], C[3]); x.clip(); x.clearRect(C[0], C[1], C[2], C[3]); }
    else x.clearRect(0, 0, P.W, P.H);
    x.globalCompositeOperation = P.blend;
    ["a", "b", "c"].forEach(function (pl) {
      if ((pl === "a" && !anyW) || (pl === "c" && !anyL) || !S.inkC || !S.inkC[pl]) return;
      var ink = ds.inks[pl];
      x.drawImage(S.inkC[pl], INKS[ink].reg[0] * P.k, INKS[ink].reg[1] * P.k);
    });
    x.restore();
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
  // A month's columns: as many cells of the pitch as fit the grid's width. v67: with a hair of slack, since gw / (gw / 15)
  // lands a hair under 15 in floating point for some widths (263, 308, 323, 338 px...) and dropped a full month to 14
  // columns plus a stray cell. The live reel (layout) and strip() share it, so a reprint always matches.
  function colsFor(gw, pitch, count) { return Math.max(1, Math.min(count, Math.floor(gw / pitch + 1e-6))); }
  function center(S, idx) { var c = idx % S.cols, r = Math.floor(idx / S.cols); return [S.pitch * (c + 0.5), S.pitch * (r + 0.5)]; }
  // A stamp's reach from its center while it moves, in units of the dot radius R: a classic win's pop and rings stay
  // inside 1.7R; a loss's slam (up to 2.9x), its cracks, splats and drips stay inside 3.4R. A dot set declares its own
  // (reach, live); these are classic's.
  var REACH_W = 1.7, REACH_L = 3.4, LIVE_W = 0.24, LIVE_L = 1.5;
  // The rect (device px) holding every stamp still moving at t, or null when none is; "all" when it is most of the
  // strip anyway. The windows match the dirtyUntil ones stamp() sets, so a stamp's last frames (settled) are drawn.
  function dirtyRect(S, t) {
    var R = S.pitch * 0.36, k = S.P.k, ds = S.ds, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    S.dots.forEach(function (D) {
      if (t - D.t0 >= (D.win ? ds.live.w : ds.live.l)) return;
      var c = center(S, D.idx), r = (D.win ? ds.reach.w : ds.reach.l) * R + 2;
      if (c[0] - r < x0) x0 = c[0] - r; if (c[0] + r > x1) x1 = c[0] + r;
      if (c[1] - r < y0) y0 = c[1] - r; if (c[1] + r > y1) y1 = c[1] + r;
    });
    if (x1 < x0) return null;
    var X0 = Math.max(0, Math.floor(x0 * k) - 2), Y0 = Math.max(0, Math.floor(y0 * k) - 2);
    var X1 = Math.min(S.P.W, Math.ceil(x1 * k) + 2), Y1 = Math.min(S.P.H, Math.ceil(y1 * k) + 2);
    if (X1 <= X0 || Y1 <= Y0) return null;
    if ((X1 - X0) * (Y1 - Y0) > 0.6 * S.P.W * S.P.H) return "all";
    return [X0, Y0, X1 - X0, Y1 - Y0];
  }
  // One plate's pass: the dot set's plate function, called for every stamp (win and loss) in play order.
  function platePass(S, pl, t, R, Rd) {
    var ds = S.ds, fn = ds.def[pl], K = ds.K;
    inkPass(S, pl, ds.inks[pl], function (g) {
      for (var i = 0; i < S.dots.length; i++) { var D = S.dots[i]; fn(K, g, D, center(S, D.idx), R, t - D.t0); }
    }, Rd);
  }
  // D: redo only this rect (device px); none: the whole strip. The print covers D plus the inks' registration reach.
  function drawStrip(S, t, Rd) {
    var R = S.pitch * 0.36, anyW = false, anyL = false, def = S.ds.def, last = S.rows - 1;
    if (Rd === "all") Rd = null;
    S.dots.forEach(function (Dt) {
      if (Dt.win) anyW = true; else anyL = true;
      Dt.lastRow = Math.floor(Dt.idx / S.cols) === last; Dt.pitch = S.pitch;      // fresh every print: a resize moves both
    });
    if (anyW && def.a) platePass(S, "a", t, R, Rd);
    if (def.b) platePass(S, "b", t, R, Rd);
    if (anyL && def.c) platePass(S, "c", t, R, Rd);
    var C = null;
    if (Rd) {                                  // the print: Rd plus the registration offsets (under 2.5 device px) and a pixel for smoothing
      var pad = 4, X0 = Math.max(0, Rd[0] - pad), Y0 = Math.max(0, Rd[1] - pad);
      C = [X0, Y0, Math.min(S.P.W, Rd[0] + Rd[2] + pad) - X0, Math.min(S.P.H, Rd[1] + Rd[3] + pad) - Y0];
    }
    inkPrint(S, anyW, anyL, C);
  }
  // A variant's throw anywhere in a strip's print hands the season back to classic (S.ds.fail re-marks every stamp) and
  // the strip prints again whole, at once: the ledger never shows a broken frame for longer than this one call.
  function printStrip(S, t, Rd) {
    if (S.ds.def === CLASSIC_DOTS) { drawStrip(S, t, Rd); return; }
    try { drawStrip(S, t, Rd); }
    catch (err) { S.inkC = null; S.scr = null; S.ds.fail(err); drawStrip(S, t); S.needs = false; }
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

  /* ---- the built-in dot set: classic (v48 to v66's ledger, byte for byte) ----
     Plate a is the win ink (the coin), b the pop ink (rims, the landing flash, the loss ring's offset), c the loss ink
     (the slammed ring, its splats and drips). A variant has the same shape: art/CONTRACT.md, "A dot set". */
  var CLASSIC_DOTS = {
    name: "Classic", builtin: true,
    by: "Coins that pop in and run hotter with a streak; a loss slams a ring that cracks, splats and drips.",
    reach: { w: REACH_W, l: REACH_L }, live: { w: LIVE_W, l: LIVE_L }, inks: { a: "win", b: "pop", c: "loss" },
    marks: function (K, D) { if (!D.win) lossMarks(D, D.gi, D.cl); },
    a: function (K, g, D, c, R, e) {
      if (!D.win) return;
      var p = e / 0.17, s = popScale(p);
      g.fillStyle = tone(0.95 + 0.05 * clamp(1 - p, 0, 1)); circ(g, c[0], c[1], R * s); g.fill();
      if (D.streak >= 30) {                                 // 30 straight: a paper glint on the coin
        g.save(); g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000";
        g.beginPath(); g.ellipse(c[0] - R * s * 0.34, c[1] - R * s * 0.36, R * s * 0.3, R * s * 0.11, -0.7, 0, TAU); g.fill(); g.restore();
      }
    },
    b: function (K, g, D, c, R, e) {
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
    },
    c: function (K, g, D, c, R, e) {
      if (D.win) return;
      var s = slamScale(e / 0.13), b = clamp(1 - e / 0.22, 0, 1);
      g.strokeStyle = tone(0.98); g.lineWidth = R * s * 0.36; circ(g, c[0], c[1], R * s * 0.82); g.stroke();
      if (b > 0) { g.fillStyle = tone(0.55 * b); circ(g, c[0], c[1], R * s * 0.64); g.fill(); }
      g.fillStyle = tone(0.96);
      drawDrips(g, D, c, R, D.pitch * (D.lastRow ? 0.5 : 0.22), easeOut((e - 0.12) / 1.15));   // v63.1: shorter last-row drips (the owner: less room under the dots)
      var k = clamp(e / 0.06, 0, 1);
      if (k > 0) D.splats.forEach(function (q) { circ(g, c[0] + Math.cos(q.a) * q.d * R, c[1] + Math.sin(q.a) * q.d * R, q.s * R * k); g.fill(); });
      drawCracks(g, D, c, R * s);
    },
    win: function (K, p, info) {                            // a spit of sparks; every tenth straight, a burst
      var rnd = K.rand(info.seed);
      K.spark({ x: p[0], y: p[1], n: 5, ink: "win", sp: [60, 170], r: [1.3, 2.4], life: [0.2, 0.12], grav: 260, rnd: rnd });
      if (info.streak >= 10 && info.streak % 10 === 0) {
        K.ring({ x: p[0], y: p[1], dur: 0.46, r0: 6, r1: 64, w0: 7, ink: "win", cov: 0.95 });
        K.ring({ x: p[0], y: p[1], delay: 0.05, dur: 0.5, r0: 4, r1: 78, w0: 4, ink: "pop", cov: 0.7 });
        K.spark({ x: p[0], y: p[1], n: 12, ink: "win", sp: [120, 260], r: [1.6, 3], life: [0.3, 0.2], grav: 320, rnd: rnd });
      }
    },
    lossHit: function (K, p, info) {                        // a loss past the 14th: it still slams, sprays and shakes, no flash
      K.ring({ x: p[0], y: p[1], dur: 0.4, r0: 8, r1: 80, w0: 7, ink: "loss", cov: 0.92 });
      K.spark({ x: p[0], y: p[1], n: info.cl <= 4 ? 20 : 12, ink: function (q) { return q() < 0.2 ? "pop" : "loss"; },
        sp: [180, 480], r: [1.1, 3.8], life: [0.3, 0.38], grav: 1500, seed: info.seed, streak: true });
      K.shake(Math.max(info.dur, 0.42), 5);
    }
  };

  /* ---- the built-in loss moment: classic, the giant L (v48 to v66, byte for byte) ----
     Nine coverage levels per plate, screened once each; draining = stepping down them. v64.1 (speed): the eighteen
     print one per idle moment instead of all in one go (a 100-170ms freeze at the reel's start on a slow phone), in the
     order a loss needs them; a level a loss wants before its turn prints right then. Unlike a variant's, classic's
     prints are kept for the reel's whole life: every classic loss of the season reuses the same eighteen. */
  var L_LEVELS = [0.96, 0.84, 0.72, 0.6, 0.48, 0.37, 0.27, 0.18, 0.1];
  function classicL(K) {
    var st = K.st;
    if (st.L) return st.L;
    var F = 300, w = Math.round(F * 0.72), h = Math.round(F * 0.92), bigL = { w: w, h: h, F: F, P: null, loss: [], pop: [] };
    function Lplate() { if (!bigL.P) bigL.P = K.plate(w, h, 8203); return bigL.P; }
    function Llevel(ink, i) {
      var P = Lplate();
      if (bigL[ink][i]) return bigL[ink][i];
      var c = L_LEVELS[i];
      bigL[ink][i] = K.screen(P, ink, function (g) {
        g.fillStyle = K.tone(c * (ink === "pop" ? 0.72 : 1));
        g.font = K.font(700, F, "disp"); g.textAlign = "center"; g.fillText("L", w / 2, h * 0.86);
      });
      return bigL[ink][i];
    }
    bigL.plate = Lplate; bigL.level = Llevel;
    st.L = bigL;
    return bigL;
  }
  // how far the L has drained (0..1) e seconds into the moment; the L and its caption sink with it
  function classicDrain(E, e) { var p = e - 0.07; return clamp((p - 0.22) / Math.max(0.2, E.dur - 0.5), 0, 1); }
  var CLASSIC_LOSS = {
    name: "Classic L", builtin: true,
    by: "The giant misregistered L lands over the card and slowly drains while the card sags.",
    prep: function (K) {                                    // the plate first, then the levels in the order a loss needs them
      var A = classicL(K), jobs = [A.plate];
      L_LEVELS.forEach(function (c, i) { jobs.push(function () { A.level("loss", i); }, function () { A.level("pop", i); }); });
      return jobs;
    },
    // hit: none, so the engine plays K.hitClassic(E): the rings, the spray, the flash, the shake
    veil: true,
    caption: function (K, E, e) {                           // the classic caption, sinking with the L
      if (!K.ready || e < 0.07) return;
      var B = K.box, sink = classicDrain(E, e) * Math.min(28, B.span * 0.06);
      captionClassic(K, E, e, B.cx, B.cy + sink + 0.36 * B.size + 26);   // just under the L's baseline
    },
    draw: function (K, E, e) {
      if (!K.ready || e < 0.07) return;                      // the L lands a beat after the slam (and none before the face loads)
      var A = classicL(K), p = e - 0.07, s = p < 0.14 ? 1 + 0.45 * Math.pow(1 - p / 0.14, 3) : 1;
      var drain = classicDrain(E, e), lvl = Math.min(L_LEVELS.length - 1, Math.floor(drain * L_LEVELS.length));
      var plPink, plScarlet;
      try { plPink = A.level("pop", lvl); plScarlet = A.level("loss", lvl); } catch (err) { return; }   // printed now if the idle pass has not reached it
      var B = K.box, g = K.g, fade = K.fade(E, e), sc = B.size / A.h;
      var sink = drain * Math.min(28, B.span * 0.06), rot = -0.15 - drain * 0.05;
      g.save();
      g.globalAlpha = fade; g.globalCompositeOperation = K.blend;
      g.translate(B.cx, B.cy + sink); g.rotate(rot); g.scale(s * sc, s * sc);
      g.drawImage(plPink, -A.w / 2 + 5, -A.h / 2 - 4, A.w, A.h);    // the plates miss each other
      g.drawImage(plScarlet, -A.w / 2, -A.h / 2, A.w, A.h);
      g.restore();
    }
  };
  // The classic veil: everything but the wound fades toward the stock.
  function veilClassic(K, E, e) {
    var D = E.dur, g = K.g;
    var a = e < 0.14 ? e / 0.14 : e > D * 0.72 ? clamp(1 - (e - D * 0.72) / (D * 0.28), 0, 1) : 1;
    a *= E.first ? 0.7 : 0.6;
    if (a <= 0) return;
    g.save();
    g.fillStyle = "rgba(" + K.TH.stock.join(",") + "," + a.toFixed(3) + ")"; g.fillRect(0, K.top, K.w, K.h - K.top);
    g.globalCompositeOperation = "destination-out";
    var gr = g.createRadialGradient(E.x, E.y, 8, E.x, E.y, 56);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(E.x - 60, E.y - 60, 120, 120);
    g.restore();
  }
  // The classic caption (the lossCopy lines in the loss ink), its first baseline at (cx, ty). v51: a plate of the card's
  // own stock under it, so it reads even when it has to land across a month's coins (invisible over empty stock).
  function captionClassic(K, E, e, cx, ty) {
    var g = K.g, TH = K.TH, fade = K.fade(E, e);
    g.save();
    g.globalAlpha = fade; g.globalCompositeOperation = TH.blend; g.textAlign = "center";
    if ("letterSpacing" in g) g.letterSpacing = "2px";
    g.font = K.font(700, E.first ? 14 : 12.5, "mono");
    var tw = g.measureText(E.sub).width;
    if (E.sub2) { g.font = K.font(500, 11, "mono"); tw = Math.max(tw, g.measureText(E.sub2).width); }
    g.globalCompositeOperation = "source-over";
    g.fillStyle = "rgba(" + TH.stock.join(",") + ",0.88)";
    g.fillRect(cx - tw / 2 - 10, ty - 17, tw + 20, E.sub2 ? 44 : 25);
    g.globalCompositeOperation = TH.blend;
    g.font = K.font(700, E.first ? 14 : 12.5, "mono"); g.fillStyle = K.pat("loss", 0.97, g);
    g.fillText(E.sub, cx, ty);
    if (E.sub2) { g.font = K.font(500, 11, "mono"); g.fillStyle = K.pat("loss", 0.85, g); g.fillText(E.sub2, cx, ty + 18); }
    g.restore();
  }

  /* ---- the art registry (art-core.js's T82ART, when the page has it) ----
     The built-ins register themselves so the lab and the shuffle bags see them; the engine never needs the registry:
     without art-core.js (or with an id that never loaded) every moment and every dot is classic. */
  var dead = {};                                       // "kind:id" -> true: threw once, off for the rest of the session
  var listedIn = null, warmed = 0;                     // warmed: how many of WARM have been set once on this page (warmFaces)
  var WARM = [["mono", 700], ["mono", 500], ["disp", 800], ["disp", 700]];
  function builtins() {
    var A = window.T82ART;
    if (!A || A === listedIn || typeof A.add !== "function") return;
    listedIn = A;
    try {
      if (typeof A.get !== "function" || A.get("loss", "classic") !== CLASSIC_LOSS) A.add("loss", "classic", CLASSIC_LOSS);
      if (typeof A.get !== "function" || A.get("dots", "classic") !== CLASSIC_DOTS) A.add("dots", "classic", CLASSIC_DOTS);
    } catch (e) { /* the registry is the lab's convenience: the reel runs without it */ }
  }
  function artGet(kind, id) {
    var A = window.T82ART;
    if (!A || typeof A.get !== "function" || typeof id !== "string") return null;
    try { var def = A.get(kind, id); return def && typeof def === "object" ? def : null; } catch (e) { return null; }
  }
  function kill(kind, id, err) {
    if (dead[kind + ":" + id]) return;
    dead[kind + ":" + id] = true;
    if (typeof console !== "undefined" && console.warn) console.warn("[t82] art " + kind + ":" + id + " is off for this session:", err);
  }
  function lossDef(id) {
    if (id === "classic") return CLASSIC_LOSS;
    if (dead["loss:" + id]) return null;
    var def = artGet("loss", id);
    return def && typeof def.draw === "function" ? def : null;
  }
  function dotsDef(id) {
    if (id === "classic") return CLASSIC_DOTS;
    if (dead["dots:" + id]) return null;
    var def = artGet("dots", id);
    return def && (typeof def.a === "function" || typeof def.b === "function" || typeof def.c === "function") ? def : null;
  }
  function num(v, dflt, lo, hi) { return typeof v === "number" && isFinite(v) ? clamp(v, lo, hi) : dflt; }
  // ds: a ledger's dot set (the def, its plates' inks, its reach and live windows), shared by every month strip
  function setDots(ds, def, id) {
    var r = def.reach || {}, l = def.live || {}, k = def.inks || {};
    ds.def = def; ds.id = id;
    ds.reach = { w: num(r.w, REACH_W, 0.5, 6), l: num(r.l, REACH_L, 0.5, 6) };          // capped: a moving rect stays a rect
    ds.live = { w: num(l.w, LIVE_W, 0, 3), l: num(l.l, LIVE_L, 0, 3) };
    ds.inks = { a: INKS[k.a] ? k.a : "win", b: INKS[k.b] ? k.b : "pop", c: INKS[k.c] ? k.c : "loss" };
  }
  // a stamp re-marked by classic (a dot set that threw): only the game's facts survive
  function remark(K, D) { var N = { idx: D.idx, win: D.win, t0: D.t0, streak: D.streak, gi: D.gi, cl: D.cl }; CLASSIC_DOTS.marks(K, N); return N; }
  function markDot(ds, D) {                            // -> the stamp to keep (a fresh one if the set threw)
    var mk = typeof ds.def.marks === "function" ? ds.def.marks : CLASSIC_DOTS.marks;
    if (mk === CLASSIC_DOTS.marks) { mk(ds.K, D); return D; }
    try { mk(ds.K, D); return D; } catch (err) { ds.fail(err); return remark(ds.K, D); }
  }
  // Every canvas a variant's state holds (in K.st, its arrays and objects), for freeing and for the memory budget.
  function isCanvas(o) { return (typeof HTMLCanvasElement !== "undefined" && o instanceof HTMLCanvasElement) || (typeof OffscreenCanvas !== "undefined" && o instanceof OffscreenCanvas); }
  function eachCanvas(o, fn, depth, seen) {
    if (!o || typeof o !== "object" || depth > 6 || seen.indexOf(o) >= 0) return;
    seen.push(o);
    if (isCanvas(o)) { fn(o); return; }
    if (o.nodeType || (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(o))) return;
    if (Array.isArray(o)) { for (var i = 0; i < o.length; i++) eachCanvas(o[i], fn, depth + 1, seen); return; }
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) eachCanvas(o[k], fn, depth + 1, seen);
  }
  function freeCanvases(st) { if (st) eachCanvas(st, function (c) { c.width = 0; c.height = 0; }, 0, []); }   // a phone gets the memory back now, not at the next GC
  function canvasBytes(st) { var n = 0; if (st) eachCanvas(st, function (c) { n += c.width * c.height * 4; }, 0, []); return n; }

  /* ---- the kit (art/CONTRACT.md, "The kit"): the inks, the screen, the motion and the type a variant draws with ---- */
  function inkOf(name) { if (typeof name !== "string" || !INKS.hasOwnProperty(name)) throw new Error("no reel ink named " + name); return name; }
  function fadeOf(E, e) { var D = E.dur; return e > D - 0.2 ? clamp((D - e) / 0.2, 0, 1) : 1; }   // the classic 0.2s fade-out
  // g0: the context K.pat pins to when it is given none (the card's fx canvas in a reel; none in a lab strip)
  function kitBase(TH, g0) {
    var K = {
      TH: TH, d: dpr(), blend: TH.blend, inks: INK_ORDER.slice(), reduced: reducedMotion(),
      rgb: function (ink) { return TH.rgb[inkOf(ink)].slice(); },
      tone: tone,
      // a halftone pattern of the ink at coverage cov, pinned to the device pixels of g's CURRENT transform: take it
      // right before the fill, after your translate/rotate/scale, and the dots stay still while the shape moves
      pat: function (ink, cov, g) { ink = inkOf(ink); return inkPattern(g || g0, ink, PITCH * dpr(), cov, TH.rgb[ink]); },
      plate: function (cssW, cssH, seed) { return makePlate(cssW, cssH, seed, TH); },
      screen: function (P, ink, draw) { return screenCanvas(P, inkOf(ink), draw); },
      // one canvas per coverage, printed one job at a time: out[i] stays null until out.jobs[i] runs; out.at(i) prints
      // it now if it has not (draw(g, cov, i) lays the tone for coverage cov)
      levels: function (P, ink, draw, covs) {
        var out = [], jobs = [];
        ink = inkOf(ink);
        function at(i) { if (!out[i]) out[i] = screenCanvas(P, ink, function (g) { draw(g, covs[i], i); }); return out[i]; }
        covs.forEach(function (c, i) { out.push(null); jobs.push(function () { at(i); }); });
        out.jobs = jobs; out.at = at;
        return out;
      },
      ease: EASE, clamp: clamp, lerp: lerp, smooth: smooth, fade: fadeOf, rand: mulberry,
      font: function (weight, px, face) { return weight + " " + px + "px " + (face === "mono" ? TH.mono : TH.disp); },
      // one line of type; with o.ink it prints in that ink's dots (in the blend), without it it lays tone (for K.screen)
      text: function (g, str, x, y, o) {
        o = o || {};
        g.save();
        if (o.font) g.font = o.font;
        g.textAlign = o.align || "center";
        if (o.base) g.textBaseline = o.base;
        if (o.spacing && "letterSpacing" in g) g.letterSpacing = o.spacing + "px";
        if (o.ink) { g.globalCompositeOperation = TH.blend; g.fillStyle = K.pat(o.ink, o.cov == null ? 0.95 : o.cov, g); }
        else g.fillStyle = tone(o.cov == null ? 1 : o.cov);
        g.fillText(String(str), x, y);
        g.restore();
      }
    };
    return K;
  }

  /* ---- the reel ----
     opts (every one optional; app.js passed none before v67, and none = classic everywhere, pixel for pixel):
       root     the element whose theme to print in (default: the page)
       loss     the loss moments' ids in play order (T82ART.deal("loss", 14)): each heavy loss plays the next one that is
                registered; an unregistered one is skipped; none left = classic
       dots     the dot set's id for the whole season (default classic)
       onUse    function (kind, id): a listed loss id when its moment plays (even if it then falls back), and the dot
                set once, at the season's first stamp (only an id the reel actually got from opts and found)
       clock    QA: function returning seconds; replaces the reel's clock
       manual   QA: no requestAnimationFrame loop and no idle scheduling. The reel then has frame() (one frame at the
                clock's current time) and the prep runs only through qa.runJob() (or at a loss, all at once) */
  function create(ov, season, opts) {
    if (typeof location !== "undefined" && /[?&]riso=0(&|$)/.test(location.search)) return null;
    var probe = cv(2, 2);
    if (!probe.getContext || !probe.getContext("2d") || !probe.getContext("2d").getImageData) return null;
    var card = ov.querySelector(".reel-card"), head = ov.querySelector(".reel-head"), runEl = ov.querySelector("#reelRun");
    if (!card || !head || !runEl) return null;
    opts = opts || {};
    var TH = readTheme(opts.root), RGB = TH.rgb;
    var MANUAL = !!opts.manual, CLOCK = typeof opts.clock === "function" ? opts.clock : clock;
    var onUse = typeof opts.onUse === "function" ? opts.onUse : null;
    builtins();

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
    // QA: ?risofull=1 redraws a whole month strip on every frame (the pre-v64.1 way), to check the moving-rect frames match it.
    var FULL = typeof location !== "undefined" && /[?&]risofull=1(&|$)/.test(location.search);
    function now() { return CLOCK() / SLOW; }
    var strips = [], parts = [], events = [], alive = true, raf = 0, last = now(), resizeT = 0, lastFlash = -1e9;
    var tNow = last, inHit = false;                  // tNow: the stamp's (or the frame's) time, so every hit lands on one clock

    function layout(S) {
      // v67: the grid's layout width, not its box on screen: a month that opens while the card still shakes or sags (a
      // transform, and a variant may shake longer than classic) lays out exactly like any other month
      var gw = Math.max(120, Math.round(S.grid.clientWidth || S.grid.getBoundingClientRect().width || 300));
      var pitch = clamp(gw / 15, 17, 27), cols = colsFor(gw, pitch, S.count), rows = Math.ceil(S.count / cols);
      S.pitch = pitch; S.cols = cols; S.rows = rows;
      S.cssW = Math.round(cols * pitch); S.cssH = Math.round(rows * pitch + pitch * 0.55);   // room below for drips (v63.1: 0.95 to 0.55, the owner)
      S.canvas.style.width = S.cssW + "px"; S.canvas.style.height = S.cssH + "px";
      S.P = makePlate(S.cssW, S.cssH, 900 + S.mi * 31, TH);
      S.canvas.width = S.P.W; S.canvas.height = S.P.H;
      S.ctx = S.canvas.getContext("2d");
      S.inkC = null; S.scr = null;                    // a new plate: the ink canvases and the scratch start over
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
    function jolt(el, frames, opts) { if (el && el.animate) try { el.animate(frames, opts); } catch (e) { /* cosmetic */ } }
    function shake(D, amp) {
      var k = [], n = 8, end = Math.min(0.6, 0.42 / D);
      for (var i = 0; i <= n; i++) {
        var f = i / n, dec = 1 - f, sgn = i % 2 ? -1 : 1;
        k.push({ transform: "translate(" + (sgn * amp * dec * (0.7 + 0.3 * ((i * 37) % 10) / 10)).toFixed(1) + "px," + ((i % 3 ? -1 : 1) * amp * 0.55 * dec).toFixed(1) + "px) rotate(" + (sgn * 0.9 * dec).toFixed(2) + "deg)", offset: f * end });
      }
      k.push({ transform: "translate(0px,6px) rotate(0.6deg)", offset: end + (1 - end) * 0.45 });   // the sag
      k.push({ transform: "translate(0px,0px) rotate(0deg)", offset: 1 });
      jolt(card, k, { duration: D * 1000 * SLOW, easing: "linear" });
    }

    /* ---- the reel's kit: the shared parts plus the hits (art/CONTRACT.md, "The kit") ---- */
    var KIT = kitBase(TH, fx);
    KIT.g = fx;                                      // the card's effects canvas, in card CSS px (a moment draws here)
    KIT.card = card; KIT.run = runEl;
    KIT.ready = false;                               // true once the display face has landed (a hero before then: none)
    KIT.ring = function (o) {                        // an expanding ring of halftone ink at (x, y)
      o = o || {};
      events.push({ type: "ring", t0: tNow + (+o.delay || 0), dur: o.dur > 0 ? +o.dur : 0.4, x: +o.x || 0, y: +o.y || 0,
        r0: o.r0 == null ? 6 : +o.r0, r1: o.r1 == null ? 80 : +o.r1, w0: o.w0 == null ? 6 : +o.w0, ink: inkOf(o.ink || "loss"), cov: o.cov == null ? 0.9 : +o.cov });
    };
    KIT.spark = function (o) {                       // a spray of ink drops (streak: they smear along their flight)
      o = o || {};
      var ink = o.ink || "loss", sp = o.sp || [60, 170], r = o.r || [1.2, 2.4], life = o.life || [0.3, 0.2];
      var inkFn = typeof ink === "function" ? function (q) { return inkOf(ink(q)); } : inkOf(ink);
      spark([+o.x || 0, +o.y || 0], Math.min(80, Math.max(0, o.n | 0)), inkFn, sp[0], sp[1], r[0], r[1], life,
        o.grav == null ? 300 : +o.grav, o.rnd || mulberry(o.seed >>> 0), !!o.streak);
    };
    KIT.shake = function (dur, amp) { shake(Math.max(0.1, +dur || 0.42), clamp(+amp || 0, 0, 16)); };   // the card jolts, then sags
    // The red flash over the whole card: only inside a heavy loss's hit, never stronger than the first loss's, never
    // closer than FLASH_GAP to the last one (the photosensitivity line). false = it did not fire.
    KIT.flash = function (s) {
      if (!inHit || tNow - lastFlash < FLASH_GAP) return false;
      lastFlash = tNow;
      jolt(flash, [{ opacity: clamp(+s || 0, 0, 0.72) }, { opacity: 0 }], { duration: 260 * SLOW, easing: "ease-out" });
      return true;
    };
    KIT.jolt = function (el, frames, o) {            // a Web Animation on the card or anything inside the reel (?risoslow applies)
      if (!el || !ov.contains(el)) return;
      var q = {}, k;
      for (k in o || {}) q[k] = o[k];
      if (q.duration) q.duration *= SLOW;
      jolt(el, frames, q);
    };
    KIT.hitClassic = function (E) {                  // the classic slam: scarlet ring, pop ring, spray, flash, shake
      var p = [E.x, E.y], first = E.first, rnd = mulberry(E.seed);
      KIT.ring({ x: p[0], y: p[1], dur: 0.4, r0: 8, r1: first ? 200 : 140, w0: 11, ink: "loss", cov: 0.92 });
      KIT.ring({ x: p[0], y: p[1], delay: 0.06, dur: 0.46, r0: 6, r1: first ? 240 : 170, w0: 6, ink: "pop", cov: 0.65 });
      KIT.spark({ x: p[0], y: p[1], n: first ? 30 : E.lossNo <= 4 ? 20 : 12, ink: function (q) { return q() < 0.2 ? "pop" : "loss"; },
        sp: [180, first ? 640 : 480], r: [1.1, first ? 5.2 : 3.8], life: [0.3, 0.38], grav: 1500, rnd: rnd, streak: true });
      KIT.flash(first ? 0.72 : 0.55);
      KIT.shake(Math.max(E.dur, 0.42), first ? 13 : 10);
    };
    KIT.caption = function (E, e, x, y) { captionClassic(KIT, E, e, x, y); };   // the classic caption, anywhere

    /* ---- the loss moments' plan and prep (art/CONTRACT.md, "A loss moment") ----
       A unit is one moment's art: its def, its kit (K.st holds what its prep printed) and its prep jobs. The window is
       the units of the next heavy losses (at most three, in play order); one prep job runs per idle moment, the window's
       first unit first. A loss that arrives first prints whatever its variant still lacks right then; a variant's
       canvases are freed when its moment ends. Classic is one unit for the whole reel, kept to the end. */
    var PLAN = [], LP = 0, UNITS = {}, WIN = [], gate = false, chain = false, clSeen = 0;
    (Array.isArray(opts.loss) ? opts.loss : []).forEach(function (id) { if (typeof id === "string" && id) PLAN.push(id); });
    function unit(i, id, def) { var K = Object.create(KIT); K.st = {}; K.box = null; return { i: i, id: id, def: def, K: K, jobs: null, ji: 0, playing: 0, dead: false }; }
    var classicU = unit(-1, "classic", CLASSIC_LOSS);
    function unitAt(i) {                             // the unit for PLAN[i], or null when it cannot play (not loaded, or off)
      var def = lossDef(PLAN[i]);
      if (!def) return null;
      if (def === CLASSIC_LOSS) return classicU;
      return UNITS[i] || (UNITS[i] = unit(i, PLAN[i], def));
    }
    // The window. When the list runs out the rest of the season is classic, but that fallback joins the window only once
    // it is the very next moment: a dealt season (14 looks) never prints the classic L it will not play, and a variant's
    // prep is measured on its own. A dealt "classic" in the list is a look like any other and preps in its turn.
    function lookahead() {
      var need = Math.min(3, HEAVY_N - clSeen), out = [], i = LP, k, u;
      for (k = 0; k < need; k++) {
        u = null;
        while (!u && i < PLAN.length) u = unitAt(i++);
        if (!u) { if (!k) out.push(classicU); break; }
        if (out.indexOf(u) < 0) out.push(u);
      }
      return out;
    }
    function drop(u) { freeCanvases(u.K.st); u.K.st = null; u.jobs = []; u.ji = 0; if (UNITS[u.i] === u) delete UNITS[u.i]; }
    function refresh() {                             // the window moves on; units that left it (and are not playing) are freed
      WIN = lookahead();
      Object.keys(UNITS).forEach(function (i) { var u = UNITS[i]; if (!u.playing && WIN.indexOf(u) < 0) drop(u); });
      kick();
    }
    function pendingOf(u) { return u.dead ? 0 : !u.jobs ? (typeof u.def.prep === "function" ? 1 : 0) : u.jobs.length - u.ji; }
    function guard(u, fn) { try { return fn(); } catch (err) { lossFail(u, err); return null; } }
    function stepUnit(u) {                           // one of u's prep jobs (its prep body runs with its first); true = work done
      var worked = false;
      if (!u.jobs) {
        u.jobs = [];
        if (typeof u.def.prep === "function") {
          worked = true;
          var js = guard(u, function () { return u.def.prep(u.K); });
          if (js && typeof js.length === "number" && !u.dead) u.jobs = js;   // a job may push more jobs onto this list
        }
      }
      if (!u.dead && u.ji < u.jobs.length) { var j = u.jobs[u.ji++]; if (typeof j === "function") guard(u, j); worked = true; }
      return worked;
    }
    // The page's first canvas text in a face costs a one-off setup (measured ~12 ms on a 4x-throttled M1 for the mono,
    // ~4 for the display face at 800), which would land inside whichever variant first sets type in its prep. So before
    // a variant's first job the engine sets both faces once, in an idle moment of its own. Only when a variant is in the
    // window: a classic-only season keeps v64.1's idle order exactly.
    function variantAhead() { for (var w = 0; w < WIN.length; w++) if (WIN[w] !== classicU && pendingOf(WIN[w]) > 0) return true; return false; }
    function warmFaces() {                         // one face and weight per idle moment
      var f = WARM[warmed++];
      try { var g = cv(4, 4).getContext("2d"); g.font = f[1] + " 20px " + (f[0] === "mono" ? TH.mono : TH.disp); g.fillText("L0", 0, 3); }
      catch (e) { /* only ever a head start */ }
    }
    function step() {
      if (warmed < WARM.length && variantAhead()) { warmFaces(); return true; }
      for (var w = 0; w < WIN.length; w++) if (pendingOf(WIN[w]) > 0 && stepUnit(WIN[w])) return true;
      return false;
    }
    function pending() { for (var w = 0; w < WIN.length; w++) if (pendingOf(WIN[w]) > 0) return true; return false; }
    function flush(u) { for (var n = 0; pendingOf(u) > 0 && n < 2000; n++) stepUnit(u); }
    function idle(fn) { if (typeof requestIdleCallback === "function") requestIdleCallback(fn, { timeout: 150 }); else setTimeout(fn, 16); }
    function kick() {
      if (MANUAL || !gate || chain || !alive || !pending()) return;
      chain = true;
      idle(function next() {
        chain = false;
        if (!alive) return;
        if (step() && pending()) { chain = true; idle(next); }
      });
    }
    function openGate() { gate = true; KIT.ready = true; refresh(); }
    // idle during the first month's lead, once the theme's display face has landed: from then on a loss prints its hero
    // (a loss before then has none, as ever). manual (the QA harness): at once; the harness loads the faces first.
    if (MANUAL) openGate();
    else {
      var faceP = document.fonts && document.fonts.load ? document.fonts.load("700 100px \"" + family(TH.disp) + "\"").catch(function () {}) : null;
      setTimeout(function () {
        var go = function () { if (alive && !gate) openGate(); };
        if (faceP) faceP.then(go, go); else go();
      }, 320);
    }
    function takeLoss() {                            // the next heavy loss's unit: the next playable listed id, or classic
      while (LP < PLAN.length) { var i = LP++, u = unitAt(i); if (u) return { u: u, id: PLAN[i], listed: true }; }
      return { u: classicU, id: "classic", listed: false };
    }
    // A variant that throws (in prep, hit, veil, draw or caption) is off for the session: its units are freed and any
    // moment it is playing carries on as classic. Classic's own throws are swallowed, as ever (a frame without its L).
    function lossFail(x, err) {
      if (x.def === CLASSIC_LOSS || x.def.builtin) return;
      var id = x.id;
      kill("loss", id, err);
      Object.keys(UNITS).forEach(function (i) { var u = UNITS[i]; if (u.id === id) { u.dead = true; if (!u.playing) drop(u); } });
      events.forEach(function (ev) {
        var M = ev.m;
        if (!M || M.id !== id) return;
        var old = M.u;
        M.u = classicU; M.id = "classic"; M.def = CLASSIC_LOSS; M.K = classicU.K; classicU.playing++;
        old.playing--; old.dead = true; if (!old.playing) drop(old);
      });
      refresh();
    }
    function startMoment(t, dur, p, info, copy, first, seed) {
      var pick = takeLoss(), u = pick.u;
      if (pick.listed && onUse) { try { onUse("loss", pick.id); } catch (err) { /* the bag is the app's business */ } }
      if (u !== classicU) flush(u);                  // whatever idle time has not printed yet prints now
      if (u.dead) u = classicU;
      u.playing++;
      var E = { t0: t, dur: dur, first: first, lossNo: info.cl, lossRun: info.lossRun || 0, prevStreak: info.prevStreak || 0,
        x: p[0], y: p[1], seed: seed, sub: copy[0], sub2: copy[1], city: String(info.city || ""), date: String(info.date || "") };
      var M = { u: u, id: u.id, def: u.def, K: u.K, E: E };
      events.push({ type: "loss", t0: t, dur: dur, m: M });
      refresh();                                     // the window moves on: the next variant starts printing in idle time
      place(M.K, E, card.clientWidth, card.clientHeight, head.offsetHeight);   // a hit may aim at the hero's box
      inHit = true;
      try {
        if (typeof M.def.hit !== "function") KIT.hitClassic(E);
        else try { M.def.hit(M.K, E); } catch (err) { lossFail(M, err); KIT.hitClassic(E); }
      } finally { inHit = false; }
    }
    function endMoment(M) {
      var u = M.u;
      u.playing = Math.max(0, u.playing - 1);
      if (u !== classicU && !u.playing && WIN.indexOf(u) < 0) drop(u);
    }
    // K.box (art/CONTRACT.md): the hero's place, exactly where the classic L sits. The L and its caption take an open
    // span above or below the wound, sized to fit it, so they never print over the row that just lost. v51: below wins
    // whenever it has room: the games after this one are not printed yet, so it is empty, while above holds the earlier
    // months' coins. x0..x1: the card's width; y0..y1: the L's height (cy - 0.4 size .. its baseline, cy + 0.36 size);
    // the caption's first line sits 26 px under y1; spanTop and span: the whole open span.
    function place(K, E, w, h, top) {
      var gap = 34, above = E.y - gap - top, below = h - (E.y + gap), useAbove = below < 150 && above > below;
      var span = useAbove ? above : below, spanTop = useAbove ? top : E.y + gap;
      if (span < 150) { span = h - top; spanTop = top; }        // no room either side: the L takes the whole page
      var Lh = Math.max(70, Math.min((h - top) * 0.6, w * 0.95, (span - 62) / 0.76));
      var cx = w / 2, cy = spanTop + Math.max(4, (span - (0.76 * Lh + 50)) / 2) + 0.4 * Lh, B = K.box || (K.box = {});
      B.cx = cx; B.cy = cy; B.size = Lh; B.span = span; B.spanTop = spanTop;
      B.x0 = 0; B.x1 = w; B.y0 = cy - 0.4 * Lh; B.y1 = cy + 0.36 * Lh;
      K.w = w; K.h = h; K.top = top;
    }
    // One guarded call into a moment's art (0 veil, 1 hero, 2 caption). The card's canvas state is saved around it; a
    // throw resets the canvas outright (whatever the variant left on its state stack) and hands the moment to classic.
    function art(ev, part, t, w, h, top) {
      var M = ev.m, def = M.def, K = M.K, E = M.E, e = t - ev.t0;
      if (part === 0 && def.veil === false) return;
      if (part === 2 && def.caption === false) return;
      place(K, E, w, h, top);
      fx.save();
      try {
        if (part === 0) { if (typeof def.veil === "function") def.veil(K, E, e); else veilClassic(K, E, e); }
        else if (part === 1) def.draw(K, E, e);
        else if (typeof def.caption === "function") def.caption(K, E, e, K.box.cx, K.box.y1 + 26);
        else if (e >= 0.07) captionClassic(K, E, e, K.box.cx, K.box.y1 + 26);
        fx.restore();
      } catch (err) {
        fxC.width = fxC.width;
        var d = dpr(); fx.setTransform(d, 0, 0, d, 0, 0);
        lossFail(M, err);
      }
    }

    /* ---- the dot set (art/CONTRACT.md, "A dot set") ---- */
    // A set's stamp must be still (its last pose) by one frame before its live window ends: the strip stops redrawing a
    // stamp then, and the settled ledger must match strip()'s reprint pixel for pixel (tools/art-qa.mjs checks it).
    var DS = { K: KIT, used: false, fail: dotsFail };
    setDots(DS, CLASSIC_DOTS, "classic");
    function dotsFirst() {                           // the season's first stamp: the set is chosen once, for the season
      if (DS.used) return;
      DS.used = true;
      var id = typeof opts.dots === "string" ? opts.dots : null, def = id ? dotsDef(id) : null;
      if (!def) return;
      if (def !== CLASSIC_DOTS) setDots(DS, def, id);
      if (onUse) { try { onUse("dots", id); } catch (err) { /* the bag is the app's business */ } }
    }
    function dotsFail(err) {                         // the set threw: the whole season, the stamps already down too, goes classic
      if (DS.def === CLASSIC_DOTS) throw err;
      kill("dots", DS.id, err);
      setDots(DS, CLASSIC_DOTS, "classic");
      strips.forEach(function (S) {
        S.dots = S.dots.map(function (D) { return remark(KIT, D); });
        S.inkC = null; S.scr = null; S.needs = true;
        S.canvas.removeAttribute("data-dots");
      });
    }
    function dotsHit(part, p, I) {                   // win: the burst at a win; lossHit: the small hit at a loss past the 14th
      var fn = DS.def[part];
      if (typeof fn !== "function" || DS.def === CLASSIC_DOTS) { CLASSIC_DOTS[part](KIT, p, I); return; }
      try { fn(KIT, p, I); } catch (err) { dotsFail(err); CLASSIC_DOTS[part](KIT, p, I); }
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
      var d = dpr(), by = {};
      parts.forEach(function (q) { (by[q.ink] || (by[q.ink] = [])).push(q); });
      INK_ORDER.forEach(function (ink) {
        var list = by[ink], dots = false, streaks = [];
        if (!list) return;
        fx.beginPath();
        list.forEach(function (q) {
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
      events.forEach(function (E) { if (E.type === "loss") art(E, 0, t, w, h, top); });       // the veils
      events.forEach(function (E) { if (E.type === "ring") drawRing(E, t); });
      drawParts();
      events.forEach(function (E) { if (E.type === "loss") { art(E, 1, t, w, h, top); art(E, 2, t, w, h, top); } });   // heroes, captions
    }
    function frame() {
      if (!alive) return;
      var t = now(), dt = Math.min(0.05, t - last);
      last = t; tNow = t;
      strips.forEach(function (S) {
        if (S.needs) { S.needs = false; printStrip(S, t); }
        else if (t < S.dirtyUntil) { var Rd = FULL ? null : dirtyRect(S, t); if (Rd || FULL) printStrip(S, t, Rd); }
      });
      parts.forEach(function (q) { q.age += dt; q.vx *= 1 - 1.2 * dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; });
      parts = parts.filter(function (q) { return q.age < q.life; });
      events = events.filter(function (E) { var on = t - E.t0 < E.dur; if (!on && E.m) endMoment(E.m); return on; });
      if (events.length || parts.length) { fxFrame(t); fxDirty = true; }
      else if (fxDirty) { fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, fxC.width, fxC.height); fxDirty = false; }
      if (!MANUAL) raf = requestAnimationFrame(frame);
    }
    if (!MANUAL) raf = requestAnimationFrame(frame);
    function onResize() {
      clearTimeout(resizeT);
      resizeT = setTimeout(function () { strips.forEach(function (S) { S.dots.forEach(function (D) { D.t0 = -1e6; }); layout(S); }); }, 200);
    }
    window.addEventListener("resize", onResize);

    function header(info, win) {
      runEl.innerHTML = info.cw + "–" + (info.cl ? "<i>" + info.cl + "</i>" : "0");
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
      var S = { row: row, grid: grid, canvas: c, mi: mi, count: count, dots: [], dirtyUntil: 0, needs: true, ds: DS };
      layout(S);
      row.__riso = S;
      strips.push(S);
    }
    function stamp(row, idx, win, info) {
      var S = row.__riso;
      if (!S) throw new Error("reel row has no strip");
      var t = now(), D = { idx: idx, win: win, t0: info.instant ? -1e6 : t, streak: info.streak || 0, gi: info.gi, cl: info.cl };
      tNow = t;
      dotsFirst();
      D = markDot(DS, D);
      S.dots.push(D);
      if (!win) clSeen = Math.max(clSeen, +info.cl || 0);
      // the month rides the page, so the Reprint Lab can print it again in any look (strip() below)
      var lossesHere = S.dots.filter(function (x) { return !x.win; }).length;
      S.canvas.setAttribute("data-games", S.dots.map(function (x) { return x.win ? 1 : 0; }).join(""));
      S.canvas.setAttribute("data-streaks", S.dots.map(function (x) { return x.streak || 0; }).join(","));
      S.canvas.setAttribute("data-gi0", String(info.gi - idx));
      S.canvas.setAttribute("data-cl0", String(info.cl - lossesHere));
      if (DS.id !== "classic") S.canvas.setAttribute("data-dots", DS.id);
      header(info, win);
      if (info.instant) { S.needs = true; return 0; }
      S.dirtyUntil = Math.max(S.dirtyUntil, t + (win ? DS.live.w : DS.live.l));
      var p = cardXY(S, idx), I = { gi: info.gi, cw: info.cw, cl: info.cl, streak: info.streak || 0, prevStreak: info.prevStreak || 0,
        lossRun: info.lossRun || 0, city: info.city, date: info.date, pace: info.pace || 1, seed: ((info.gi + 3) * 7919) >>> 0, dur: 0 };
      if (win) {
        dotsHit("win", p, I);
        if (info.streak >= 10 && info.streak % 10 === 0) jolt(streakEl, [{ transform: "scale(1.5)" }, { transform: "scale(1)" }], { duration: 320 * SLOW, easing: "cubic-bezier(.2,1.5,.4,1)" });
        return 0;
      }
      var H = Math.round(holdFor(info.cl, info.prevStreak) * (info.pace || 1)), dur = H / 1000, first = info.cl === 1, full = heavy(info.cl), copy = lossCopy(info);
      I.dur = dur;
      if (full) startMoment(t, dur, p, info, copy, first, I.seed);
      else dotsHit("lossHit", p, I);
      jolt(runEl, [{ transform: "scale(1.9)" }, { transform: "scale(1)" }], { duration: 380 * SLOW, easing: "cubic-bezier(.2,1.5,.35,1)" });
      return H * SLOW;                                           // the cursor waits out the whole moment
    }
    function closeMonth(row, mi, w, l) {
      var S = row.__riso;
      if (S) S.canvas.setAttribute("aria-label", (MONTH_NAMES[mi] || "Month") + ": " + w + (w === 1 ? " win, " : " wins, ") + l + (l === 1 ? " loss" : " losses"));
      if (l === 0 && w > 0) {
        // v59.3: app.js sets the stamp in the gap under the month's games; the reel only slams it down
        var st = row.querySelector(".reel-note .riso-swept");
        if (!st) return;
        jolt(st, [{ transform: "rotate(-9deg) scale(2.3)", opacity: 0 }, { transform: "rotate(-9deg) scale(1)", opacity: 1 }], { duration: 240 * SLOW, easing: "cubic-bezier(.2,1.4,.4,1)" });
      }
    }
    function finale(fin, s) {
      var rec = fin.querySelector(".reel-final-rec");
      if (!rec) return;
      rec.innerHTML = s.wins + "–" + (s.losses ? "<i>" + s.losses + "</i>" : "0");
      jolt(rec, [{ transform: "scale(1.7)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 440 * SLOW, easing: "cubic-bezier(.2,1.4,.4,1)" });
      if (s.losses === 0) {                                    // 82-0: the whole card goes off
        var rc = card.getBoundingClientRect(), rr = rec.getBoundingClientRect(), p = [rr.left - rc.left + rr.width / 2, rr.top - rc.top + rr.height / 2], t = now(), rnd = mulberry(8200);
        for (var i = 0; i < 3; i++) {
          events.push({ type: "ring", t0: t + i * 0.16, dur: 0.6, x: p[0], y: p[1], r0: 10, r1: 150 + i * 50, w0: 9, ink: i % 2 ? "pop" : "win", cov: 0.95 });
        }
        spark(p, 40, function (q) { return q() < 0.35 ? "pop" : "win"; }, 160, 520, 1.6, 4.2, [0.5, 0.5], 700, rnd);
      }
    }
    function destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      clearTimeout(resizeT);
      window.removeEventListener("resize", onResize);
      Object.keys(UNITS).forEach(function (i) { drop(UNITS[i]); });
      freeCanvases(classicU.K.st); classicU.K.st = {};
    }
    // QA (tools/art-qa.mjs): run the prep one job at a time, and read what is printed and held
    var qa = {
      runJob: function () { return step(); },
      state: function () {
        var prepped = [], pend = 0, bytes = canvasBytes(classicU.K.st), playing = [];
        WIN.forEach(function (u) { var n = pendingOf(u); if (n > 0) pend += n; else prepped.push(u.id); });
        if (warmed < WARM.length && variantAhead()) pend += WARM.length - warmed;   // the faces' warm-up runs first
        Object.keys(UNITS).forEach(function (i) { bytes += canvasBytes(UNITS[i].K.st); });
        events.forEach(function (ev) { if (ev.m) playing.push(ev.m.id); });
        return { prepped: prepped, canvasBytes: bytes, pending: pend, window: WIN.map(function (u) { return u.id; }), playing: playing,
          next: LP < PLAN.length ? PLAN.slice(LP) : [], dots: DS.id, off: Object.keys(dead), ready: gate };
      }
    };
    var reel = { openMonth: openMonth, stamp: stamp, closeMonth: closeMonth, finale: finale, destroy: destroy, qa: qa };
    if (MANUAL) reel.frame = frame;
    return reel;
  }

  /* ---- one finished month strip, in any theme (the Reprint Lab reprints frozen pages with it) ----
     opts = { root (theme element), games: "1101..." or [1,1,0,...], streaks: [..], gi0, cl0, mi,
              cssW (the strip's width in css px), d (device px per css px), dots (a dot set's id; default classic) }
     Every stamp prints settled (no pop, no flash, drips fully grown). Returns the canvas. */
  function strip(opts) {
    builtins();
    var TH = readTheme(opts.root), games = Array.isArray(opts.games) ? opts.games.map(function (g) { return g ? 1 : 0; }) : String(opts.games || "").split("").map(Number);
    var streaks = opts.streaks || [], gw = Math.max(120, Math.round(opts.cssW || 300)), pitch = clamp(gw / 15, 17, 27), count = games.length;
    var S = { mi: opts.mi || 0, count: count, pitch: pitch, cols: colsFor(gw, pitch, count), dots: [] };
    S.rows = Math.ceil(count / S.cols);
    S.cssW = Math.round(S.cols * pitch); S.cssH = Math.round(S.rows * pitch + pitch * 0.55);
    var d = opts.d || 2, r = mulberry((900 + S.mi * 31) >>> 0);
    var P = { W: Math.round(S.cssW * d), H: Math.round(S.cssH * d), k: d, pitch: PITCH * d, rgb: TH.rgb, blend: TH.blend };
    P.grain = makeGrain(P.W, P.H, r); P.starve = makeStarve(P.W, P.H, r, d);
    S.P = P; S.canvas = cv(P.W, P.H); S.ctx = S.canvas.getContext("2d");
    var ds = { K: kitBase(TH, null) }, want = typeof opts.dots === "string" ? dotsDef(opts.dots) : null;
    setDots(ds, want || CLASSIC_DOTS, want ? opts.dots : "classic");
    ds.fail = function (err) {
      kill("dots", ds.id, err);
      setDots(ds, CLASSIC_DOTS, "classic");
      S.dots = S.dots.map(function (D) { return remark(ds.K, D); });
    };
    S.ds = ds;
    var cl = +opts.cl0 || 0;
    games.forEach(function (g, i) {
      if (!g) cl++;
      S.dots.push(markDot(ds, { idx: i, win: !!g, t0: -1e6, streak: +streaks[i] || 0, gi: (+opts.gi0 || 0) + i, cl: cl }));
    });
    printStrip(S, 0);
    return S.canvas;
  }

  // The kit's shared half (the inks, the screen, the motion, the type) for a canvas g outside a reel, in a theme: the
  // art lab and the FX layer (art/CONTRACT-FX.md) print with the same screening code instead of a copy of it.
  function kit(root, g) { return kitBase(readTheme(root), g || null); }

  builtins();
  window.T82RISO = { create: create, strip: strip, kit: kit, holdFor: holdFor, heavy: heavy, lossCopy: lossCopy, flashGap: FLASH_GAP, theme: readTheme,
    inks: INK_ORDER.slice(), version: "v67" };
})();
