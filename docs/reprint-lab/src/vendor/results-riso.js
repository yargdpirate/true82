/* ---------- v50 RESULTS PRINT (THE SHAPE OF A SEASON) ----------
   Prints the finished season as a risograph landscape: the waterline is
   .500, every win lifts the ridge a step, every loss drops it one and leaves
   a pink bead on the skyline, and the sun's height is the final win rate.
   The inks cool as the record falls, until a losing year sinks under a moon.
   The strip along the bottom is the exact game-by-game record; the landscape
   is its shape. Analytic runs (the Daily, Pro, challenges) have no games to
   print, so they get the projected slope and no strip, and say so.

   Two layouts share one scene: a short banner that heads the results page
   (short on purpose: the first ballot card has to stay above the fold) and
   a 1080x1350 poster that rides along with SHARE YOUR TEAM as an image.

   Pure cosmetics. app.js owns the record; nothing here reads game state
   beyond the spec it is handed. Any throw leaves the typographic record in
   place (see printCall in app.js). QA kill switch: ?riso=0.

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

   LAB COPY (TRUE 82 Reprint Lab, lab/src/vendor/). The site's v50 file with
   one addition: an ink, paper and type override hook, so the lab can print
   the same season in any palette. Every plate carries its own look:
     look = { inks:  { sun|pink|blue|teal|orange: [r, g, b] },   missing = the site's ink
              stock: { paper: "#hex", fibre: [r, g, b], stroke: "#hex", fleck: "#hex" },
              fonts: { cond: "css family", condW: "700" or "italic 400", mono: "css family" } }
   New entry points: T82PRINT_LAB.print(spec, opts, done) prints the finished
   banner (or a frame of its reveal) in small tasks and hands back a canvas;
   T82PRINT_LAB.paper(stock) is the slip paper at any color. With no look the
   output is byte-for-byte the site's. Exported as window.T82PRINT_LAB so it
   never collides with the real T82PRINT.
*/
(function () {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined") return;

  var TAU = Math.PI * 2;
  var COND = '"Barlow Condensed", "Arial Narrow", sans-serif';
  var MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
  var MONTHS = [["OCT", 5], ["NOV", 15], ["DEC", 15], ["JAN", 15], ["FEB", 11], ["MAR", 15], ["APR", 6]];
  var PAPER = "#F4ECDD";
  // LAB: the site's paper recipe as a stock (the colors makePaper used to hard-code)
  var STOCK = { paper: PAPER, fibre: [176, 160, 131], stroke: "#8b7f68", fleck: "#776c5a" };
  function fontsOf(look) {
    var f = (look && look.fonts) || {};
    return { cond: f.cond || COND, condW: f.condW || "700", mono: f.mono || MONO };
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function smoothstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function dpr() { return Math.min(2, Math.max(1, window.devicePixelRatio || 1)); }
  function reduced() { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function clock() { return (window.performance && performance.now ? performance.now() : Date.now()) / 1000; }
  function tone(t) { return "rgba(0,0,0," + clamp(t, 0, 1).toFixed(4) + ")"; }
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
  function noise1D(seed) {
    var r = mulberry(seed), T = new Float32Array(1024), i;
    for (i = 0; i < 1024; i++) T[i] = r() * 2 - 1;
    return function (x) { var j = Math.floor(x), f = x - j, s = f * f * (3 - 2 * f), a = T[j & 1023]; return a + (T[(j + 1) & 1023] - a) * s; };
  }
  function fbm(n, x, oct) { var a = 0.5, f = 1, s = 0; for (var o = 0; o < (oct || 4); o++) { s += a * n(x * f + o * 17.31); f *= 2.03; a *= 0.5; } return s; }

  /* ---- inks: Riso's published swatches ---- */
  var INKS = {
    sun:    { rgb: [255, 181, 17], ang: [3, 1], reg: [0, 0],        sh: 0 },
    pink:   { rgb: [255, 72, 176], ang: [1, 1], reg: [1.5, -1.1],   sh: 211 },
    blue:   { rgb: [0, 120, 191],  ang: [1, 3], reg: [-1.2, 0.9],   sh: 419 },
    teal:   { rgb: [0, 131, 138],  ang: [3, 1], reg: [-0.9, -1.0],  sh: 353 },
    orange: { rgb: [255, 108, 47], ang: [4, 1], reg: [0.9, -1.2],   sh: 503 }
  };

  /* ---- halftone screens ---- */
  var tiles = {};
  function tileFor(ink, pitch) {
    var key = ink + "@" + pitch.toFixed(3);
    if (tiles[key]) return tiles[key];
    var a = INKS[ink].ang[0], b = INKS[ink].ang[1], L = Math.sqrt(a * a + b * b);
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
      var v = Math.PI * d2 / P2;                          // coverage at which a dot reaches this pixel
      if (v > 0.7854) v = 0.7854 + (v - 0.7854) * 0.2735;  // past 78% the dots merge and the holes close
      th[y * S + x] = v > 1 ? 1 : v;
    }
    tiles[key] = { S: S, th: th };
    return tiles[key];
  }

  /* ---- paper, grain and starvation ---- */
  function makeGrain(W, H, rnd) {
    var g = new Float32Array(W * H);
    [[5, 0.65], [17, 0.35]].forEach(function (o) {
      var cell = o[0], amp = o[1], gw = Math.ceil(W / cell) + 2, gh = Math.ceil(H / cell) + 2, grid = new Float32Array(gw * gh), i, x, y;
      for (i = 0; i < grid.length; i++) grid[i] = rnd() * 2 - 1;
      for (y = 0; y < H; y++) {
        var fy = y / cell, iy = fy | 0, ty = fy - iy, sy = ty * ty * (3 - 2 * ty), row = y * W;
        for (x = 0; x < W; x++) {
          var fx = x / cell, ix = fx | 0, tx = fx - ix, sx = tx * tx * (3 - 2 * tx), i0 = iy * gw + ix;
          var top = grid[i0] + (grid[i0 + 1] - grid[i0]) * sx, bot = grid[i0 + gw] + (grid[i0 + gw + 1] - grid[i0 + gw]) * sx;
          g[row + x] += amp * (top + (bot - top) * sy);
        }
      }
    });
    return g;
  }
  function makePaper(W, H, rnd, stock) {
    var st = stock || STOCK, fb = st.fibre || STOCK.fibre;       // LAB: the stock is a parameter
    var c = cv(W, H), x = c.getContext("2d"), i, N, s = Math.max(1, W / 1000);
    x.fillStyle = st.paper || PAPER; x.fillRect(0, 0, W, H);
    [[26, 0.11], [66, 0.075], [150, 0.05]].forEach(function (o) {
      var rw = o[0], rh = Math.max(2, Math.round(o[0] * H / W)), n = cv(rw, rh), nx = n.getContext("2d"), img = nx.createImageData(rw, rh);
      for (var j = 0; j < rw * rh; j++) { img.data[j * 4] = fb[0]; img.data[j * 4 + 1] = fb[1]; img.data[j * 4 + 2] = fb[2]; img.data[j * 4 + 3] = Math.pow(rnd(), 1.9) * 255 * o[1]; }
      nx.putImageData(img, 0, 0);
      x.imageSmoothingEnabled = true;
      x.drawImage(n, 0, 0, W, H);
    });
    x.strokeStyle = st.stroke || STOCK.stroke;
    for (i = 0, N = Math.round(W * H / 2600); i < N; i++) {
      var px = rnd() * W, py = rnd() * H, len = (5 + rnd() * 20) * s, an = rnd() * Math.PI;
      x.globalAlpha = 0.01 + rnd() * 0.018; x.lineWidth = (0.5 + rnd() * 0.7) * s;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(an) * len, py + Math.sin(an) * len); x.stroke();
    }
    for (i = 0, N = Math.round(W * H / 520); i < N; i++) {
      x.globalAlpha = 0.012 + rnd() * 0.03; x.fillStyle = rnd() < 0.55 ? (st.fleck || STOCK.fleck) : "#ffffff";
      x.beginPath(); x.arc(rnd() * W, rnd() * H, (0.4 + rnd()) * s, 0, TAU); x.fill();
    }
    x.globalAlpha = 1;
    return c;
  }
  function makeStarve(W, H, rnd, d) {             // pinned specks punched out of every ink: solids print mottled, not laser-flat
    var c = cv(W, H), x = c.getContext("2d"), i, N;
    x.fillStyle = "#000";
    for (i = 0, N = Math.round(W * H / 1100); i < N; i++) { x.globalAlpha = 0.18 + rnd() * 0.55; x.beginPath(); x.arc(rnd() * W, rnd() * H, (0.45 + rnd() * 1.6) * d, 0, TAU); x.fill(); }
    for (i = 0, N = Math.round(W * H / 60000); i < N; i++) { x.globalAlpha = 0.05 + rnd() * 0.09; x.beginPath(); x.arc(rnd() * W, rnd() * H, (4 + rnd() * 14) * d, 0, TAU); x.fill(); }
    x.globalAlpha = 1;
    return c;
  }

  // The shared paper stock for the results page's slips, baked once (LAB: once per stock).
  var paperURLs = {};
  function paperDataURL(stock) {
    var key = stock ? [stock.paper, stock.fibre, stock.stroke, stock.fleck].join("|") : "site";
    if (paperURLs[key]) return paperURLs[key];
    paperURLs[key] = makePaper(720, 1280, mulberry(4471), stock).toDataURL("image/jpeg", 0.86);
    return paperURLs[key];
  }

  /* ---- plates ---- */
  // W is device pixels; pitch is the halftone cell in device pixels.
  // LAB: look (optional) swaps the inks, the paper and the type for this plate only.
  function makePlate(W, vw, vh, seed, pitch, d, look) {
    var H = Math.max(8, Math.round(W * vh / vw)), rnd = mulberry((seed * 2654435761) >>> 0);
    var P = { W: W, H: H, vw: vw, vh: vh, k: W / vw, pitch: pitch, reg: {}, rgb: {}, fonts: fontsOf(look) };
    P.paper = makePaper(W, H, rnd, look && look.stock);
    P.grain = makeGrain(W, H, rnd);
    P.starve = makeStarve(W, H, rnd, d);
    P.scratch = cv(W, H);
    P.sg = P.scratch.getContext("2d", { willReadFrequently: true });
    for (var k in INKS) {
      P.reg[k] = [INKS[k].reg[0] * d, INKS[k].reg[1] * d];
      P.rgb[k] = (look && look.inks && look.inks[k]) || INKS[k].rgb;
    }
    return P;
  }
  function screenData(data, P, x0, y0, w, h, ink) {
    var t = tileFor(ink, P.pitch), S = t.S, th = t.th, G = P.grain, W = P.W, H = P.H, sh = INKS[ink].sh, rgb = P.rgb[ink];
    for (var y = 0; y < h; y++) {
      var py = y0 + y, trow = (py % S) * S, grow = ((py + sh) % H) * W, i = y * w * 4;
      for (var x = 0; x < w; x++, i += 4) {
        var a = data[i + 3];
        if (a < 3) { data[i + 3] = 0; continue; }
        var px = x0 + x;
        if (a / 255 >= th[trow + (px % S)] + G[grow + ((px + sh * 3) % W)] * 0.085) { data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2]; data[i + 3] = 255; }
        else data[i + 3] = 0;
      }
    }
  }
  // Draw one ink's tone as alpha over the whole plate, screen it into dots,
  // punch the starve specks, keep the result as a layer.
  function bakeLayer(P, ink, draw) {
    var c = cv(P.W, P.H), g = c.getContext("2d", { willReadFrequently: true });
    g.setTransform(P.k, 0, 0, P.k, 0, 0);
    g.fillStyle = "#000"; g.strokeStyle = "#000";
    draw(g);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    var img = g.getImageData(0, 0, P.W, P.H);
    screenData(img.data, P, 0, 0, P.W, P.H, ink);
    g.putImageData(img, 0, 0);
    g.globalCompositeOperation = "destination-out"; g.drawImage(P.starve, 0, 0); g.globalCompositeOperation = "source-over";
    return { c: c, ink: ink };
  }
  function composeTo(x, P, layers, clips) {
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = "source-over";
    x.drawImage(P.paper, 0, 0);
    x.globalCompositeOperation = "multiply";
    layers.forEach(function (L, i) {
      var r = P.reg[L.ink], c = clips ? clips[i] : null;
      if (c === 0) return;
      if (c) { x.save(); x.beginPath(); x.rect(c[0], c[1], c[2], c[3]); x.clip(); x.drawImage(L.c, r[0], r[1]); x.restore(); }
      else x.drawImage(L.c, r[0], r[1]);
    });
    x.globalCompositeOperation = "source-over";
  }
  // Screen one ink live inside a box (scene units) and multiply it on.
  function inkLive(ctx, P, ink, bbox, draw) {
    var k = P.k;
    var x0 = Math.max(0, Math.floor(bbox[0] * k) - 3), y0 = Math.max(0, Math.floor(bbox[1] * k) - 3);
    var x1 = Math.min(P.W, Math.ceil(bbox[2] * k) + 3), y1 = Math.min(P.H, Math.ceil(bbox[3] * k) + 3), w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) return;
    var g = P.sg;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    g.clearRect(x0, y0, w, h);
    g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    g.setTransform(k, 0, 0, k, 0, 0); g.fillStyle = "#000"; g.strokeStyle = "#000";
    draw(g);
    g.restore();
    var img = g.getImageData(x0, y0, w, h);
    screenData(img.data, P, x0, y0, w, h, ink);
    g.putImageData(img, x0, y0);
    g.save(); g.globalCompositeOperation = "destination-out"; g.drawImage(P.starve, x0, y0, w, h, x0, y0, w, h); g.restore();
    var r = P.reg[ink];
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(P.scratch, x0, y0, w, h, x0 + r[0], y0 + r[1], w, h);
    ctx.restore();
  }

  /* ---- drawing kit ---- */
  function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0.01, r), 0, TAU); }
  function ellipse(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, TAU); }
  function knock(g, fn) { g.save(); g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000"; g.strokeStyle = "#000"; fn(g); g.restore(); }
  function knockRadial(g, x, y, r, a) {
    knock(g, function (g2) {
      var gr = g2.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, "rgba(0,0,0," + a + ")"); gr.addColorStop(0.55, "rgba(0,0,0," + (a * 0.55) + ")"); gr.addColorStop(1, "rgba(0,0,0,0)");
      g2.fillStyle = gr; g2.fillRect(x - r, y - r, r * 2, r * 2);
    });
  }
  function vgrad(g, y0, y1, stops) { var gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(function (s) { gr.addColorStop(s[0], tone(s[1])); }); return gr; }
  function spacedText(g, text, x, y, spacing, align) {
    var ws = [], w = 0, i, ch = String(text).split("");
    for (i = 0; i < ch.length; i++) { var mw = g.measureText(ch[i]).width; ws.push(mw); w += mw + spacing; }
    w -= spacing;
    var cx = align === "center" ? x - w / 2 : align === "right" ? x - w : x, saved = g.textAlign;
    g.textAlign = "left";
    for (i = 0; i < ch.length; i++) { g.fillText(ch[i], cx, y); cx += ws[i] + spacing; }
    g.textAlign = saved;
    return w;
  }
  function fitFont(g, text, weight, family, maxW, maxSize) {
    var s = maxSize; g.font = weight + " " + s + "px " + family;
    var w = g.measureText(text).width;
    if (w > maxW) { s = s * maxW / w; g.font = weight + " " + s + "px " + family; }
    return s;
  }
  function seamPaths(g, x, y, r, rot) {
    g.save(); g.translate(x, y); g.rotate(rot || 0);
    g.beginPath();
    g.moveTo(-r * 0.09, -r * 1.02); g.bezierCurveTo(r * 0.14, -r * 0.35, -r * 0.14, r * 0.35, r * 0.09, r * 1.02);
    g.moveTo(-r * 1.02, r * 0.05); g.bezierCurveTo(-r * 0.4, -r * 0.11, r * 0.4, r * 0.16, r * 1.02, -r * 0.03);
    g.moveTo(-r * 0.64, -r * 0.78); g.quadraticCurveTo(-r * 0.15, 0, -r * 0.64, r * 0.78);
    g.moveTo(r * 0.64, -r * 0.78); g.quadraticCurveTo(r * 0.15, 0, r * 0.64, r * 0.78);
    g.stroke(); g.restore();
  }

  /* ---- layouts (scene units; width is always 1000) ----
     vs scales the plate's vertical detail from the tall poster's frame. */
  var BANNER = { VW: 1000, VH: 660, FX0: 36, FY0: 168, FX1: 964, FY1: 520, WL: 430, SC: 1.95, vs: 0.52, rs: 0.62,
    X0: 80, X1: 920, strip: { wTop: 546, wH: 28, base: 576, lTop: 579, lH: 28, tick: 612, lab: 640 }, stars: 70, rip: 110 };
  var POSTER = { VW: 1000, VH: 1250, FX0: 40, FY0: 190, FX1: 960, FY1: 1030, WL: 720, SC: 4.0, vs: 1, rs: 1,
    X0: 80, X1: 920, strip: { wTop: 1075, wH: 29, base: 1105, lTop: 1107, lH: 29, tick: 1140, lab: 1172 }, stars: 160, rip: 230 };

  function derive(spec, L) {
    var games = spec.games && spec.games.length === 82 ? spec.games : null;
    var m = [0], w = 0, i;
    if (games) { for (i = 0; i < 82; i++) { if (games[i]) w++; m.push(w - (i + 1 - w)); } }
    else { w = clamp(Math.round(spec.wins), 0, 82); var slope = 2 * w / 82 - 1; for (i = 1; i <= 82; i++) m.push(slope * i); }
    var X = function (g) { return L.X0 + g / 82 * (L.X1 - L.X0); };
    var peak = 0;
    for (i = 1; i <= 82; i++) if (m[i] > m[peak]) peak = i;
    var seed = (spec.seed >>> 0) || 7, wp = w / 82, WL = L.WL, SC = L.SC, vs = L.vs;
    var n1 = noise1D(seed), n2 = noise1D(seed + 7), n3 = noise1D(seed + 13);
    function avg(u, win) { var a = 0, c = 0; for (var j = Math.round(u) - win; j <= Math.round(u) + win; j++) { a += m[clamp(j, 0, 82)]; c++; } return a / c; }
    function cr(u) {                                        // Catmull-Rom through the running margin
      u = clamp(u, 0, 82);
      var j = Math.min(81, Math.floor(u)), f = u - j;
      var p0 = m[clamp(j - 1, 0, 82)], p1 = m[j], p2 = m[j + 1], p3 = m[clamp(j + 2, 0, 82)];
      return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
    }
    function rough(x) { return fbm(n1, x * 0.028, 4) * 11 * vs; }   // crags; the strip below keeps the exact record
    var yEnd = WL - SC * m[82];
    function front(x) {
      if (x < L.X0) return WL + 14 * vs * (1 - x / L.X0) + rough(x) * 0.3;
      if (x <= L.X1) return WL - SC * cr((x - L.X0) / (L.X1 - L.X0) * 82) + rough(x) * smoothstep(L.X0, L.X0 + 32, x);
      return lerp(yEnd, WL + 26 * vs, smoothstep(L.X1, L.X1 + 90, x)) + rough(x);
    }
    function U(x) { return clamp((x - L.X0) / (L.X1 - L.X0) * 82, 0, 82); }
    function far1(x) { return Math.min(WL - 10 * vs, WL - 64 * vs - 0.5 * SC * Math.max(0, avg(U(x), 7)) - 38 * vs * (1 - Math.abs(fbm(n2, x * 0.006, 4)))); }
    function far2(x) { return Math.min(WL - 30 * vs, WL - 118 * vs - 0.3 * SC * Math.max(0, avg(U(x), 14)) - 86 * vs * (1 - Math.abs(fbm(n3, x * 0.0045, 4)))); }
    var pal;
    if (wp >= 0.72) pal = { key: "golden", light: "sun", top: [[0, 0.58], [0.55, 0.25], [1, 0]], band: [[0, 0], [0.5, 0.28], [0.85, 0.55], [1, 0.48]], waterB: [[0, 0.2], [1, 0.55]], ridgeB: 0.86, ridgeP: 0.7, sr: 86 };
    else if (wp >= 0.45) pal = { key: "dusk", light: "orange", top: [[0, 0.62], [0.6, 0.3], [1, 0.1]], band: [[0, 0.1], [0.5, 0.45], [1, 0.62]], waterB: [[0, 0.26], [1, 0.6]], ridgeB: 0.88, ridgeP: 0.7, sr: 104 };
    else pal = { key: "night", light: "teal", top: [[0, 0.9], [0.7, 0.7], [1, 0.5]], band: [[0, 0.05], [1, 0.2]], waterB: [[0, 0.55], [1, 0.82]], ridgeB: 0.95, ridgeP: 0.62, sr: 0 };
    var sr = pal.sr * L.rs;
    var sx = clamp(lerp(X(peak), 500, 0.35), 190, 810), sy = WL - (wp - 0.5) * 2 * (WL - L.FY0 - sr - 14);
    var moon = { x: 740, y: L.FY0 + (WL - L.FY0) * 0.3, r: 57 * L.rs };
    var losses = [];
    if (games) for (i = 0; i < 82; i++) if (!games[i]) losses.push(i);
    var r = mulberry(seed + 3), stars = [], glints = [], ripples = [], strata = [];
    for (i = 0; i < L.stars; i++) stars.push({ x: L.FX0 + r() * (L.FX1 - L.FX0), y: L.FY0 + Math.pow(r(), 1.3) * (WL - 150 * vs - L.FY0), r: 0.7 + r() * 1.6, a: 0.45 + r() * 0.55 });
    var gx = pal.key === "night" ? moon.x : sx, depth = L.FY1 - WL;
    for (var y = WL + 4; y < WL + depth * 0.74; y += (4.5 + r() * 6) * Math.max(0.6, vs)) {
      var dd = (y - WL) / (depth * 0.74), gw = (pal.key === "night" ? 60 * L.rs : sr) * 1.7 * (1 - dd * 0.8) * (0.45 + r() * 0.7);
      glints.push({ x: gx - gw / 2 + (r() - 0.5) * 24 * dd, y: y, w: gw, h: (1.6 + r() * 2.4 * (1 - dd)) * Math.max(0.7, vs), t: 0.9 - dd * 0.45 });
    }
    for (i = 0; i < L.rip; i++) { var ry = WL + 5 + Math.pow(r(), 0.85) * (L.FY1 - WL); ripples.push({ x: L.FX0 + r() * (L.FX1 - L.FX0), y: ry, rx: 8 + r() * 50 * (0.35 + (ry - WL) / 310), ry: (0.7 + r() * 1.2) * Math.max(0.7, vs), a: 0.4 + r() * 0.5 }); }
    for (var s = 1; s <= 7; s++) strata.push({ off: s * 21 * vs, n: noise1D(seed + 40 + s) });
    return { spec: spec, games: games, m: m, w: w, l: 82 - w, wp: wp, X: X, front: front, far1: far1, far2: far2, pal: pal,
      sr: sr, sx: sx, sy: sy, moon: moon, losses: losses, stars: stars, glints: glints, ripples: ripples, strata: strata };
  }

  function bake(P, D, L) { return bakeSteps(P, D, L).map(function (f) { return f(); }); }
  // The six plates as separate tasks: sky in the light ink, pink and blue,
  // then the land, water and strip in the same three.
  function bakeSteps(P, D, L) {
    var pal = D.pal, LI = pal.light, WL = L.WL, X = D.X, sh = L.strip, i;
    function frameClip(g) { g.beginPath(); g.rect(L.FX0, L.FY0, L.FX1 - L.FX0, L.FY1 - L.FY0); g.clip(); }
    function skyShape(g) { g.beginPath(); g.moveTo(L.FX0 - 10, L.FY0 - 10); g.lineTo(L.FX0 - 10, WL); for (var x = L.FX0 - 10; x <= L.FX1 + 10; x += 2) g.lineTo(x, Math.min(D.front(x), WL)); g.lineTo(L.FX1 + 10, WL); g.lineTo(L.FX1 + 10, L.FY0 - 10); g.closePath(); }
    function ridgeFill(g, fn, base) { g.beginPath(); g.moveTo(L.FX0 - 10, base); for (var x = L.FX0 - 10; x <= L.FX1 + 10; x += 2) g.lineTo(x, Math.min(fn(x), base)); g.lineTo(L.FX1 + 10, base); g.closePath(); }
    function subFill(g, fn) { g.beginPath(); g.moveTo(L.FX0 - 10, WL); for (var x = L.FX0 - 10; x <= L.FX1 + 10; x += 2) g.lineTo(x, Math.max(fn(x), WL)); g.lineTo(L.FX1 + 10, WL); g.closePath(); }
    function reflFill(g, fn, k) { g.beginPath(); g.moveTo(L.FX0 - 10, WL); for (var x = L.FX0 - 10; x <= L.FX1 + 10; x += 2) g.lineTo(x, WL + (WL - Math.min(fn(x), WL)) * k); g.lineTo(L.FX1 + 10, WL); g.closePath(); }
    function ridgeLine(g, fn) { var on = false; for (var x = L.FX0 - 10; x <= L.FX1 + 10; x += 2) { var y = fn(x); if (y < WL) { if (!on) { g.moveTo(x, y); on = true; } else g.lineTo(x, y); } else on = false; } }
    function sunDisc(g, fill) { if (pal.key === "night") return; circle(g, D.sx, D.sy, D.sr); if (fill) g.fill(); }
    function marks(g, t) {                               // registration marks at the frame corners
      g.save(); g.strokeStyle = tone(t); g.lineWidth = 1.4; g.beginPath();
      [[L.FX0, L.FY0, -1, -1], [L.FX1, L.FY0, 1, -1], [L.FX0, L.FY1, -1, 1], [L.FX1, L.FY1, 1, 1]].forEach(function (c) {
        g.moveTo(c[0] + c[2] * 8, c[1]); g.lineTo(c[0] + c[2] * 22, c[1]); g.moveTo(c[0], c[1] + c[3] * 8); g.lineTo(c[0], c[1] + c[3] * 22);
      });
      g.stroke(); g.restore();
    }
    function strip(g, ink) {
      var bw = (L.X1 - L.X0) / 82 * 0.6;
      if (D.games) {
        if (ink === "light") { g.fillStyle = tone(0.95); for (i = 0; i < 82; i++) if (D.games[i]) g.fillRect(X(i + 0.5) - bw / 2, sh.wTop, bw, sh.wH); }
        if (ink === "pink") {
          g.fillStyle = tone(0.95);
          for (i = 0; i < 82; i++) { var cx = X(i + 0.5) - bw / 2; if (D.games[i]) g.fillRect(cx, sh.wTop, bw, 3.2); else g.fillRect(cx, sh.lTop, bw, sh.lH); }
          if (D.spec.saved != null && D.spec.saved >= 0) {  // the game the Heat Check saved wears a ring
            g.strokeStyle = tone(0.95); g.lineWidth = 3;
            circle(g, X(D.spec.saved + 0.5), sh.wTop + sh.wH / 2, sh.wH * 0.72); g.stroke();
          }
        }
      }
      if (ink === "blue") {
        g.fillStyle = tone(0.8); g.fillRect(X(0), sh.base - 1, X(82) - X(0), 1.6);
        g.strokeStyle = tone(0.85); g.lineWidth = 1.4; g.fillStyle = tone(0.9);
        var cum = 0; g.beginPath(); g.moveTo(X(0), sh.tick); g.lineTo(X(0), sh.tick + 12);
        MONTHS.forEach(function (mo) {
          var x0 = X(cum); cum += mo[1]; var x1 = X(cum);
          g.moveTo(x1, sh.tick); g.lineTo(x1, sh.tick + 12);
          g.font = "600 " + (L === POSTER ? 12 : 24) + "px " + P.fonts.mono; spacedText(g, mo[0], (x0 + x1) / 2, sh.lab, L === POSTER ? 1.8 : 2.4, "center");
        });
        g.stroke();
        if (!D.games) {
          g.font = "600 " + (L === POSTER ? 13 : 19) + "px " + P.fonts.mono;
          spacedText(g, "PROJECTED OVER 82 GAMES", 500, sh.base - 10, 3, "center");
        }
      }
    }
    function beads(g, knockOnly) {
      if (knockOnly) { knock(g, function (g2) { D.losses.forEach(function (j) { circle(g2, X(j + 1), D.front(X(j + 1)), 7 * L.rs); g2.fill(); }); }); return; }
      D.losses.forEach(function (j) { var y = D.front(X(j + 1)); g.fillStyle = tone(y > WL ? 0.55 : 0.95); circle(g, X(j + 1), y, (y > WL ? 3.4 : 4.3) * Math.max(0.8, L.rs)); g.fill(); });
    }
    function sky(ink, fn) { return bakeLayer(P, ink, function (g) { g.save(); frameClip(g); skyShape(g); g.clip(); fn(g); g.restore(); marks(g, 0.8); }); }
    function water(g, stops) { g.fillStyle = vgrad(g, WL, L.FY1, stops); g.fillRect(L.FX0, WL, L.FX1 - L.FX0, L.FY1 - WL); }
    function ripplesKnock(g, k) { knock(g, function (g2) { D.ripples.forEach(function (w) { g2.globalAlpha = w.a * k; ellipse(g2, w.x, w.y, w.rx, w.ry); g2.fill(); }); }); }
    function strata(g) {
      knock(g, function (g2) {
        g2.save(); ridgeFill(g2, D.front, WL); g2.clip();
        g2.lineWidth = 1.6; g2.globalAlpha = 0.22;
        D.strata.forEach(function (s) { g2.beginPath(); for (var x = L.FX0; x <= L.FX1; x += 3) { var y = D.front(x) + s.off + fbm(s.n, x * 0.01, 3) * 7 * L.vs; if (x === L.FX0) g2.moveTo(x, y); else g2.lineTo(x, y); } g2.stroke(); });
        g2.restore();
      });
    }
    function land(ink, fn) { return bakeLayer(P, ink, function (g) { g.save(); frameClip(g); fn(g); g.restore(); strip(g, ink === LI ? "light" : ink); marks(g, 0.8); }); }

    var skyLight = function () { return sky(LI, function (g) {
      if (pal.key !== "night") {
        var gr = g.createRadialGradient(D.sx, D.sy, D.sr * 0.7, D.sx, D.sy, 440 * L.rs);
        gr.addColorStop(0, tone(0.68)); gr.addColorStop(0.3, tone(0.38)); gr.addColorStop(0.65, tone(0.1)); gr.addColorStop(1, tone(0));
        g.fillStyle = gr; g.fillRect(L.FX0, L.FY0, L.FX1 - L.FX0, WL - L.FY0);
        g.fillStyle = vgrad(g, WL - 220 * L.vs, WL, [[0, 0], [1, 0.34]]); g.fillRect(L.FX0, WL - 220 * L.vs, L.FX1 - L.FX0, 220 * L.vs);
        g.fillStyle = tone(1); sunDisc(g, true);
        g.save(); sunDisc(g, false); g.clip(); knock(g, function (g2) { g2.lineWidth = 4.6 * L.rs; g2.lineCap = "round"; seamPaths(g2, D.sx, D.sy, D.sr, 0.15); }); g.restore();
      } else {
        g.fillStyle = vgrad(g, WL - 200 * L.vs, WL, [[0, 0], [1, 0.38]]); g.fillRect(L.FX0, WL - 200 * L.vs, L.FX1 - L.FX0, 200 * L.vs);
        var gm = g.createRadialGradient(D.moon.x, D.moon.y, 50 * L.rs, D.moon.x, D.moon.y, 210 * L.rs); gm.addColorStop(0, tone(0.28)); gm.addColorStop(1, tone(0));
        g.fillStyle = gm; g.fillRect(L.FX0, L.FY0, L.FX1 - L.FX0, WL - L.FY0);
        knock(g, function (g2) { circle(g2, D.moon.x, D.moon.y, D.moon.r); g2.fill(); });
      }
      g.fillStyle = tone(pal.key === "night" ? 0.16 : 0.08); ridgeFill(g, D.far2, WL); g.fill();
    }); };
    var skyPink = function () { return sky("pink", function (g) {
      g.fillStyle = vgrad(g, L.FY0, WL, pal.band); g.fillRect(L.FX0, L.FY0, L.FX1 - L.FX0, WL - L.FY0);
      if (pal.key !== "night") {
        g.save(); sunDisc(g, false); g.clip(); knock(g, function (g2) { g2.fillRect(0, 0, L.VW, L.VH); });
        g.fillStyle = vgrad(g, D.sy - D.sr, D.sy + D.sr, [[0, 0], [0.5, 0.04], [1, 0.48]]); g.fillRect(D.sx - D.sr, D.sy - D.sr, D.sr * 2, D.sr * 2);
        knock(g, function (g2) { g2.lineWidth = 4.6 * L.rs; g2.lineCap = "round"; seamPaths(g2, D.sx, D.sy, D.sr, 0.15); }); g.restore();
      } else knock(g, function (g2) { circle(g2, D.moon.x, D.moon.y, D.moon.r); g2.fill(); });
      g.fillStyle = tone(pal.key === "night" ? 0.2 : 0.14); ridgeFill(g, D.far2, WL); g.fill();
      g.fillStyle = tone(pal.key === "night" ? 0.3 : 0.24); ridgeFill(g, D.far1, WL); g.fill();
    }); };
    var skyBlue = function () { return sky("blue", function (g) {
      g.fillStyle = vgrad(g, L.FY0, WL, pal.top); g.fillRect(L.FX0, L.FY0, L.FX1 - L.FX0, WL - L.FY0);
      if (pal.key !== "night") knockRadial(g, D.sx, D.sy, 420 * L.rs, 0.9);
      else {
        knock(g, function (g2) { D.stars.forEach(function (s) { g2.globalAlpha = s.a; circle(g2, s.x, s.y, s.r); g2.fill(); }); });
        knock(g, function (g2) { circle(g2, D.moon.x, D.moon.y, D.moon.r); g2.fill(); });
        g.fillStyle = tone(0.24);
        [[-18, -10, 11], [14, 16, 8], [20, -20, 6], [-6, 24, 5]].forEach(function (c) { circle(g, D.moon.x + c[0] * L.rs, D.moon.y + c[1] * L.rs, c[2] * L.rs); g.fill(); });
      }
      g.fillStyle = tone(pal.key === "night" ? 0.45 : 0.2); ridgeFill(g, D.far2, WL); g.fill();
      g.fillStyle = tone(pal.key === "night" ? 0.62 : 0.34); ridgeFill(g, D.far1, WL); g.fill();
    }); };
    var landLight = function () { return land(LI, function (g) {
      if (pal.key !== "night") {
        var gr = g.createRadialGradient(D.sx, D.sy, 20, D.sx, D.sy, 430 * L.rs); gr.addColorStop(0, tone(0.9)); gr.addColorStop(1, tone(0));
        g.strokeStyle = gr; g.lineWidth = 5 * Math.max(0.7, L.rs); g.lineJoin = "round"; g.beginPath(); ridgeLine(g, D.front); g.stroke();
        water(g, [[0, 0.3], [0.4, 0.05], [1, 0]]);
        D.glints.forEach(function (s) { g.fillStyle = tone(s.t); g.fillRect(s.x, s.y, s.w, s.h); });
      } else water(g, [[0, 0.28], [1, 0.12]]);
      ripplesKnock(g, 0.5);
      knock(g, function (g2) { ridgeFill(g2, D.front, WL); g2.fill(); });
      beads(g, true);
    }); };
    var landPink = function () { return land("pink", function (g) {
      water(g, [[0, pal.key === "night" ? 0.16 : 0.42], [1, 0.2]]);
      g.fillStyle = tone(pal.ridgeP * 0.42); reflFill(g, D.front, 0.55); g.fill();
      g.fillStyle = tone(0.3); subFill(g, D.front); g.fill();
      ripplesKnock(g, 0.6);
      g.fillStyle = tone(pal.ridgeP); ridgeFill(g, D.front, WL); g.fill();
      strata(g);
      beads(g, true); beads(g, false);
    }); };
    var landBlue = function () { return land("blue", function (g) {
      water(g, pal.waterB);
      g.fillStyle = tone(pal.ridgeB * 0.5); reflFill(g, D.front, 0.55); g.fill();
      g.fillStyle = tone(0.34); subFill(g, D.front); g.fill();
      ripplesKnock(g, 0.75);
      if (pal.key === "night") knock(g, function (g2) { D.glints.forEach(function (s) { g2.globalAlpha = s.t * 0.8; g2.fillRect(s.x, s.y, s.w, s.h); }); });
      g.fillStyle = tone(pal.ridgeB); ridgeFill(g, D.front, WL); g.fill();
      strata(g);
      beads(g, true);
    }); };
    return [skyLight, skyPink, skyBlue, landLight, landPink, landBlue];
  }

  /* ---- type ---- */
  function recText(w, l) { return w + "–" + l; }
  function drawBannerTitle(ctx, P, D, w, l) {
    var spec = D.spec, bb = [16, 8, 984, 160];
    inkLive(ctx, P, "blue", bb, function (g) {
      g.fillStyle = tone(0.95); fitFont(g, recText(w, l), P.fonts.condW, P.fonts.cond, 560, 148); g.fillText(recText(w, l), 34, 146);
      g.fillStyle = tone(0.8); g.font = "600 24px " + P.fonts.mono; g.textAlign = "right";
      if (spec.context) spacedText(g, spec.context, 964, 116, 2.6, "right");
      g.textAlign = "left";
    });
    inkLive(ctx, P, "pink", bb, function (g) {
      g.fillStyle = tone(0.5); fitFont(g, recText(w, l), P.fonts.condW, P.fonts.cond, 560, 148); g.fillText(recText(w, l), 39, 150);
      g.fillStyle = tone(0.95); g.font = "600 24px " + P.fonts.mono; spacedText(g, "THE SHAPE OF A SEASON", 964, 74, 3.6, "right");
    });
  }
  function drawPosterTitle(ctx, P, D, w, l) {
    var spec = D.spec, bb = [20, 20, 980, 182];
    inkLive(ctx, P, "blue", bb, function (g) {
      g.fillStyle = tone(0.95); fitFont(g, recText(w, l), P.fonts.condW, P.fonts.cond, 470, 140); g.fillText(recText(w, l), 36, 164);
      if (spec.comp) { g.fillStyle = tone(0.95); var s = fitFont(g, spec.comp, "italic 600", P.fonts.cond, 440, 32); g.textAlign = "right"; g.fillText(spec.comp, 962, 126); g.textAlign = "left"; void s; }
      g.fillStyle = tone(0.78); g.font = "400 12px " + P.fonts.mono;
      if (spec.context) spacedText(g, spec.context, 962, 158, 1.8, "right");
    });
    inkLive(ctx, P, "pink", bb, function (g) {
      g.fillStyle = tone(0.5); fitFont(g, recText(w, l), P.fonts.condW, P.fonts.cond, 470, 140); g.fillText(recText(w, l), 40, 167);
      g.fillStyle = tone(0.95); g.font = "600 13px " + P.fonts.mono; spacedText(g, "THE SHAPE OF A SEASON", 962, 84, 3, "right");
    });
  }
  function drawPosterFoot(ctx, P, spec) {
    var bb = [20, 1186, 980, 1246];
    inkLive(ctx, P, "blue", bb, function (g) {
      g.fillStyle = tone(0.9);
      if (spec.names && spec.names.length) { var line = spec.names.join("  ·  ").toUpperCase(); g.font = "600 15px " + P.fonts.mono; fitFont(g, line, "600", P.fonts.mono, 900, 15); spacedText(g, line, 500, 1206, 1.2, "center"); }
    });
    inkLive(ctx, P, "pink", bb, function (g) {
      g.fillStyle = tone(0.95); g.font = "600 16px " + P.fonts.mono;
      spacedText(g, "TRUE82.NET" + (spec.net ? "  ·  NET " + spec.net : ""), 500, 1234, 3.2, "center");
    });
  }

  /* ---- fonts: canvas text only prints once the faces have landed ---- */
  var fontsP = {};
  function fontsReady(look) {
    var F = fontsOf(look), key = F.cond + "|" + F.condW + "|" + F.mono;   // LAB: a promise per type look
    if (fontsP[key]) return fontsP[key];
    fontsP[key] = new Promise(function (res) {
      if (!document.fonts || !document.fonts.load) { res(); return; }
      var done = false, fin = function () { if (!done) { done = true; res(); } };
      Promise.all([F.condW + " 100px " + F.cond, "600 100px " + F.cond,
        "400 20px " + F.mono, "600 20px " + F.mono].map(function (f) { return document.fonts.load(f).catch(function () {}); }))
        .then(fin, fin);
      setTimeout(fin, 2600);
    });
    return fontsP[key];
  }

  function killed() { return typeof location !== "undefined" && /[?&]riso=0(&|$)/.test(location.search); }
  function supported() {
    var c = cv(2, 2), g = c.getContext && c.getContext("2d");
    return !!(g && g.getImageData && g.ellipse && window.Float32Array);
  }

  /* ---- the banner on the results page ---- */
  // opts.defer: start on blank paper and wait for play(), so a print that
  // mounts under the Tribune never flashes finished before it prints in.
  function mount(host, spec, opts) {
    if (killed() || !host || !supported()) return null;
    var defer = !!(opts && opts.defer) && !reduced();
    var canvas = document.createElement("canvas");
    canvas.className = "rr-print-canvas";
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var P = null, D = null, layers = null, cur = spec, alive = true, raf = 0, reveal = null, played = false, lastW = 0, resizeT = 0;
    var look = opts && opts.look;                               // LAB: optional ink/paper/type override

    function build() {
      var cssW = Math.round(host.getBoundingClientRect().width) || 340, d = dpr();
      var W = Math.max(64, Math.min(1240, Math.round(cssW * d)));
      lastW = cssW;
      P = makePlate(W, BANNER.VW, BANNER.VH, cur.seed || 7, 2.35 * d * Math.max(0.8, W / (cssW * d)), d, look);
      canvas.width = P.W; canvas.height = P.H;
      canvas.style.width = "100%"; canvas.style.aspectRatio = BANNER.VW + " / " + BANNER.VH;
      D = derive(cur, BANNER);
      layers = bake(P, D, BANNER);
      P.print = cv(P.W, P.H);
      var pc = P.print.getContext("2d");
      composeTo(pc, P, layers, null);
      drawBannerTitle(pc, P, D, D.w, D.l);
    }
    function still() { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "source-over"; ctx.drawImage(P.print, 0, 0); }
    function rest() { if (reveal) return; if (defer && !played) composeTo(ctx, P, layers, [0, 0, 0, 0, 0, 0]); else still(); }
    function frame() {
      if (!alive) return;
      raf = 0;
      if (!reveal) { still(); return; }
      var t = clock();
      if (reveal.t0 == null) reveal.t0 = t;
      var e = t - reveal.t0, clips = [], i;
      for (i = 0; i < 3; i++) { var p = easeInOut((e - i * 0.16) / 0.42); clips.push(p <= 0 ? 0 : [0, 0, P.W, Math.ceil(P.H * p)]); }
      var gCount = clamp((e - 0.62) / 0.018, 0, 82), xr = gCount >= 82 ? P.W : Math.ceil(D.X(gCount) * P.k) + 1;
      for (i = 0; i < 3; i++) clips.push(e < 0.62 ? 0 : [0, 0, xr, P.H]);
      composeTo(ctx, P, layers, clips);
      var n = Math.floor(gCount), w = 0;
      if (D.games) { for (i = 0; i < n; i++) w += D.games[i] ? 1 : 0; }
      else w = Math.round(D.w * n / 82);
      drawBannerTitle(ctx, P, D, w, n - w);
      if (e > 0.62 + 82 * 0.018 + 0.3) { reveal = null; still(); return; }
      raf = requestAnimationFrame(frame);
    }
    function play() {
      if (!alive || played) return;
      played = true;
      if (reduced() || document.hidden) { still(); return; }   // nobody is watching: print it finished
      reveal = { t0: null };
      if (!raf) raf = requestAnimationFrame(frame);
    }
    function onResize() {
      clearTimeout(resizeT);
      resizeT = setTimeout(function () {
        var w = Math.round(host.getBoundingClientRect().width);
        if (!alive || !w || Math.abs(w - lastW) < 2) return;
        build(); rest();
      }, 220);
    }
    build();
    rest();
    window.addEventListener("resize", onResize);
    host.classList.add("printed");
    fontsReady(look).then(function () { if (!alive) return; build(); rest(); });
    return {
      play: play,
      update: function (next) {
        if (!alive) return;
        cur = next; build();
        if (reduced()) { still(); return; }
        played = false; play();
      },
      destroy: function () { alive = false; if (raf) cancelAnimationFrame(raf); clearTimeout(resizeT); window.removeEventListener("resize", onResize); }
    };
  }

  /* ---- the share poster ----
     Baked a layer per task so the page never locks up for the whole plate,
     then handed back as a JPEG blob. */
  function poster(spec, cb, look) {
    if (killed() || !supported()) { cb(null); return; }
    var P, D, layers = [], steps = [], idx = 0;
    fontsReady(look).then(function () {
      try {
        P = makePlate(1080, POSTER.VW, POSTER.VH, spec.seed || 7, 4.2, 1.6, look);
        D = derive(spec, POSTER);
        steps = bakeSteps(P, D, POSTER);
      } catch (e) { cb(null); return; }
      next();
      function next() {
        if (idx < steps.length) {
          try { layers.push(steps[idx++]()); } catch (e) { cb(null); return; }
          setTimeout(next, 16);
          return;
        }
        try {
          var out = cv(P.W, P.H), x = out.getContext("2d");
          composeTo(x, P, layers, null);
          drawPosterTitle(x, P, D, D.w, D.l);
          drawPosterFoot(x, P, spec);
          if (!out.toBlob) { cb(null); return; }
          out.toBlob(function (b) { cb(b || null); }, "image/jpeg", 0.9);   // halftone noise makes PNGs ~3MB; JPEG keeps it well under 1MB
        } catch (e) { cb(null); }
      }
    });
  }

  /* ---- LAB: the banner as a still, in any look ----
     print(spec, opts, done): opts = { cssW, d (device px per css px), look,
     reveal (0..82: a frame of the reveal with that many games printed; null =
     finished; 0 with blank = true: the deferred blank sheet), defer(fn) }.
     Bakes one plate per task (like the poster) so the lab never locks up;
     done(canvas) gets the finished pixels, done(null) on any failure.
     Returns { cancel } so a stale job stops at its next task. */
  function print(spec, opts, done) {
    opts = opts || {};
    var look = opts.look, d = opts.d || 2, cssW = opts.cssW || 342, dead = false;
    var defer = opts.defer || function (fn) { setTimeout(fn, 0); };
    var W = Math.max(64, Math.min(1240, Math.round(cssW * d))), P, D, steps, layers = [], idx = 0;
    function fail(e) { if (!dead) { dead = true; if (window.console) console.warn("[lab print]", e); done(null); } }
    fontsReady(look).then(function () {
      if (dead) return;
      defer(function () {
        if (dead) return;
        try {
          P = makePlate(W, BANNER.VW, BANNER.VH, spec.seed || 7, 2.35 * d * Math.max(0.8, W / (cssW * d)), d, look);
          D = derive(spec, BANNER);
          steps = opts.blank ? [] : bakeSteps(P, D, BANNER);
        } catch (e) { fail(e); return; }
        defer(next);
      });
    });
    function next() {
      if (dead) return;
      if (idx < steps.length) {
        try { layers.push(steps[idx++]()); } catch (e) { fail(e); return; }
        defer(next);
        return;
      }
      try {
        var out = cv(P.W, P.H), x = out.getContext("2d");
        if (opts.blank) { composeTo(x, P, [], null); dead = true; done(out); return; }
        var g = opts.reveal, clips = null, w = D.w, l = D.l;
        if (g != null && g < 82) {
          var xr = Math.ceil(D.X(g) * P.k) + 1, n = Math.floor(g), i;
          clips = [null, null, null, [0, 0, xr, P.H], [0, 0, xr, P.H], [0, 0, xr, P.H]];
          w = 0;
          if (D.games) { for (i = 0; i < n; i++) w += D.games[i] ? 1 : 0; } else w = Math.round(D.w * n / 82);
          l = n - w;
        }
        composeTo(x, P, layers, clips);
        drawBannerTitle(x, P, D, w, l);
        dead = true;
        done(out);
      } catch (e) { fail(e); }
    }
    return { cancel: function () { dead = true; } };
  }

  // LAB: exported under its own name, so it never collides with the site's T82PRINT
  window.T82PRINT_LAB = { mount: mount, poster: poster, paper: paperDataURL, print: print, STOCK: STOCK, INKS: INKS, BANNER: BANNER, derive: derive, version: "v50-lab" };
})();
