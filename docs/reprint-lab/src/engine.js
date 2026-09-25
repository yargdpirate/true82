/* ---------- TRUE 82 LAB: the riso engine ----------
   A general risograph compositor, grown out of results-riso.js (v50) so the
   lab prints with exactly the same drum: per-ink tone plates, screened into
   angled halftone dots through a threshold tile, grain in the screen, ink
   starvation specks punched out of every solid, plates laid down slightly off
   register and multiplied onto paper. What is new here: any ink (the full
   Riso swatch book), any paper stock (including dark stock, where the inks
   print opaque like a screen print), and live registration, pitch, grain and
   starvation controls.

   The halftone pipeline follows sevenevesai/riso-windowseat closely (the
   screen-threshold construction and the paper and starvation recipes). MIT
   License, Copyright (c) 2026 sevenevesai; the full notice is in
   results-riso.js and reel-riso.js in the TRUE 82 repo.
*/
(function () {
  "use strict";
  var TAU = Math.PI * 2;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
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
  function hexRGB(h) {
    h = String(h).replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgbHex(c) { return "#" + c.map(function (v) { return ("0" + Math.round(clamp(v, 0, 255)).toString(16)).slice(-2); }).join("").toUpperCase(); }
  function tone(t) { return "rgba(0,0,0," + clamp(t, 0, 1).toFixed(4) + ")"; }
  function lum(rgb) { var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]); }

  /* ---- the swatch book: Riso's published ink colors ---- */
  var SWATCH = {
    black: "#000000", burgundy: "#914E72", blue: "#0078BF", green: "#00A95C", mediumblue: "#3255A4",
    brightred: "#F15060", federalblue: "#3D5588", purple: "#765BA7", teal: "#00838A", flatgold: "#BB8B41",
    huntergreen: "#407060", red: "#FF665E", brown: "#925F52", yellow: "#FFE800", marinered: "#D2515E",
    orange: "#FF6C2F", fluopink: "#FF48B0", lightgray: "#88898A", metallicgold: "#AC936E", crimson: "#E45D50",
    fluoorange: "#FF7477", cornflower: "#62A8E5", skyblue: "#4982CF", seablue: "#0074A2", lake: "#235BA8",
    indigo: "#484D7A", midnight: "#435060", mist: "#D5E4C0", granite: "#A5AAA8", charcoal: "#70747C",
    smokyteal: "#5F8289", steel: "#375E77", slate: "#5E695E", turquoise: "#00AA93", emerald: "#19975D",
    grass: "#397E58", forest: "#516E5A", spruce: "#4A635D", moss: "#68724D", seafoam: "#62C2B1",
    kellygreen: "#67B346", lightteal: "#009DA5", ivy: "#169B62", pine: "#237E74", lagoon: "#2F6165",
    violet: "#9D7AD2", orchid: "#AA60BF", plum: "#845991", raisin: "#775D7A", grape: "#6C5D80",
    scarlet: "#F65058", tomato: "#D2515E", cranberry: "#D1517A", maroon: "#9E4C6E", raspberryred: "#D1517A",
    brick: "#A75154", lightlilac: "#E6B5C9", mahogany: "#8E595A", brightolivegreen: "#B49F29",
    sunflower: "#FFB511", melon: "#FFAE3B", apricot: "#F6A04D", paprika: "#EE7F4B", pumpkin: "#FF6F4C",
    brightgold: "#BA8032", copper: "#BD6439", mint: "#82D8D5", pink: "#FF8E91", lightmauve: "#E6B5C9",
    aqua: "#5EC8E5", fluoyellow: "#FFE916", fluored: "#FF4C65", fluogreen: "#44D62C", white: "#FFFFFF",
    navy: "#232A4E"   // the v48/v50 key ink (a deep federal blue the site already prints in)
  };
  var SWATCH_NAMES = {
    black: "Black", burgundy: "Burgundy", blue: "Blue", green: "Green", mediumblue: "Medium Blue", brightred: "Bright Red",
    federalblue: "Federal Blue", purple: "Purple", teal: "Teal", flatgold: "Flat Gold", huntergreen: "Hunter Green", red: "Red",
    brown: "Brown", yellow: "Yellow", marinered: "Marine Red", orange: "Orange", fluopink: "Fluorescent Pink", lightgray: "Light Gray",
    metallicgold: "Metallic Gold", crimson: "Crimson", fluoorange: "Fluorescent Orange", cornflower: "Cornflower", skyblue: "Sky Blue",
    seablue: "Sea Blue", lake: "Lake", indigo: "Indigo", midnight: "Midnight", mist: "Mist", granite: "Granite", charcoal: "Charcoal",
    smokyteal: "Smoky Teal", steel: "Steel", slate: "Slate", turquoise: "Turquoise", emerald: "Emerald", grass: "Grass", forest: "Forest",
    spruce: "Spruce", moss: "Moss", seafoam: "Sea Foam", kellygreen: "Kelly Green", lightteal: "Light Teal", ivy: "Ivy", pine: "Pine",
    lagoon: "Lagoon", violet: "Violet", orchid: "Orchid", plum: "Plum", raisin: "Raisin", grape: "Grape", scarlet: "Scarlet",
    tomato: "Tomato", cranberry: "Cranberry", maroon: "Maroon", raspberryred: "Raspberry Red", brick: "Brick", lightlilac: "Light Lilac",
    mahogany: "Mahogany", brightolivegreen: "Bright Olive Green", sunflower: "Sunflower", melon: "Melon", apricot: "Apricot",
    paprika: "Paprika", pumpkin: "Pumpkin", brightgold: "Bright Gold", copper: "Copper", mint: "Mint", pink: "Pink",
    lightmauve: "Light Mauve", aqua: "Aqua", fluoyellow: "Fluorescent Yellow", fluored: "Fluorescent Red", fluogreen: "Fluorescent Green",
    white: "White", navy: "Navy (TRUE 82 key)"
  };
  function inkRGB(ink) { if (Array.isArray(ink)) return ink; if (SWATCH[ink]) return hexRGB(SWATCH[ink]); return hexRGB(ink); }

  /* ---- paper stocks ---- */
  // paper: base color. fibre: the color of the fibres and flecks. dark: inks print opaque (screen-print mode).
  var STOCKS = {
    cream:     { name: "Cream",      paper: "#F4ECDD", fibre: "#B0A083", fleck: "#776C5A", dark: false },
    bond:      { name: "White bond", paper: "#F7F5EF", fibre: "#B9B4A6", fleck: "#8C877A", dark: false },
    newsprint: { name: "Newsprint",  paper: "#E6E1D3", fibre: "#9D9684", fleck: "#6E6858", dark: false },
    kraft:     { name: "Kraft",      paper: "#D2B48A", fibre: "#8C6A3E", fleck: "#5E4526", dark: false },
    blush:     { name: "Blush",      paper: "#F6DCD6", fibre: "#B99289", fleck: "#8A625B", dark: false },
    sky:       { name: "Sky",        paper: "#DCE9EE", fibre: "#8FA6AF", fleck: "#5B7079", dark: false },
    mint:      { name: "Mint",       paper: "#DDEFE3", fibre: "#8DAE98", fleck: "#5A7964", dark: false },
    butter:    { name: "Butter",     paper: "#F7E7B4", fibre: "#B7A266", fleck: "#7F6E3E", dark: false },
    court:     { name: "Hardwood",   paper: "#E9C995", fibre: "#A87F46", fleck: "#6E4F24", dark: false },
    ink:       { name: "Site night", paper: "#101418", fibre: "#2B333C", fleck: "#46505B", dark: true },
    midnight:  { name: "Midnight",   paper: "#16122B", fibre: "#2E2752", fleck: "#4A4178", dark: true },
    black:     { name: "Black",      paper: "#0E0E10", fibre: "#26262B", fleck: "#3C3C44", dark: true },
    navy:      { name: "Navy stock", paper: "#1A2140", fibre: "#303A66", fleck: "#4B5690", dark: true },
    forest:    { name: "Forest",     paper: "#11241C", fibre: "#244233", fleck: "#3A5E4B", dark: true },
    oxblood:   { name: "Oxblood",    paper: "#2A1216", fibre: "#4A2429", fleck: "#6A3940", dark: true }
  };

  /* ---- halftone screens ---- */
  // Screen angles by plate slot (lattice vectors), so any ink can sit in any slot.
  var ANGLES = [[3, 1], [1, 1], [1, 3], [4, 1], [2, 1], [1, 2]];
  var SHIFTS = [0, 211, 419, 353, 503, 97];
  var tiles = {};
  function tileFor(slot, pitch, shape) {
    var key = slot + "@" + pitch.toFixed(3) + ":" + (shape || "dot");
    if (tiles[key]) return tiles[key];
    var ang = ANGLES[slot % ANGLES.length], a = ang[0], b = ang[1], L = Math.sqrt(a * a + b * b);
    var S = Math.max(2, Math.round(pitch * L)), P = S / L, u = P / L;
    var v1x = u * a, v1y = u * b, v2x = -u * b, v2y = u * a, pts = [], R = Math.ceil(L + 4) * 2, m, k, x, y, i;
    for (m = -R; m <= R; m++) for (k = -R; k <= R; k++) {
      x = m * v1x + k * v2x; y = m * v1y + k * v2y;
      if (x > -2 * P && x < S + 2 * P && y > -2 * P && y < S + 2 * P) pts.push(x, y);
    }
    var th = new Float32Array(S * S), P2 = P * P, n1x = v1x / u / L, n1y = v1y / u / L;
    for (y = 0; y < S; y++) for (x = 0; x < S; x++) {
      var px = x + 0.5, py = y + 0.5, v;
      if (shape === "line") {                              // line screen: distance to the nearest screen line
        var d = (px * n1x + py * n1y) / P; d = d - Math.floor(d); d = Math.abs(d - 0.5) * 2;
        v = 1 - d;
      } else {
        var d2 = 1e9;
        for (i = 0; i < pts.length; i += 2) { var dx = px - pts[i], dy = py - pts[i + 1], q = dx * dx + dy * dy; if (q < d2) d2 = q; }
        v = Math.PI * d2 / P2;                              // coverage at which a dot reaches this pixel
        if (v > 0.7854) v = 0.7854 + (v - 0.7854) * 0.2735; // past 78% the dots merge and the holes close
      }
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
  // feather: the fibres fade out toward the sheet's edges, so the sheet's edge is its plain paper color (a
  // masthead printed on a ground of that color then shows no box). Tiles leave it off: they must tile.
  function makePaper(W, H, rnd, stock, texture, feather) {
    var c = cv(W, H), base = c.getContext("2d"), i, N, s = Math.max(1, W / 1000), fb = hexRGB(stock.fibre), k = texture == null ? 1 : texture;
    base.fillStyle = stock.paper; base.fillRect(0, 0, W, H);
    var t = feather && k > 0 ? cv(W, H) : c, x = t === c ? base : t.getContext("2d");
    if (k > 0) {
      [[26, 0.11], [66, 0.075], [150, 0.05]].forEach(function (o) {
        var rw = o[0], rh = Math.max(2, Math.round(o[0] * H / W)), n = cv(rw, rh), nx = n.getContext("2d"), img = nx.createImageData(rw, rh);
        for (var j = 0; j < rw * rh; j++) { img.data[j * 4] = fb[0]; img.data[j * 4 + 1] = fb[1]; img.data[j * 4 + 2] = fb[2]; img.data[j * 4 + 3] = Math.pow(rnd(), 1.9) * 255 * o[1] * k * (stock.dark ? 1.6 : 1); }
        nx.putImageData(img, 0, 0);
        x.imageSmoothingEnabled = true;
        x.drawImage(n, 0, 0, W, H);
      });
      x.strokeStyle = stock.fibre;
      for (i = 0, N = Math.round(W * H / 2600 * k); i < N; i++) {
        var px = rnd() * W, py = rnd() * H, len = (5 + rnd() * 20) * s, an = rnd() * Math.PI;
        x.globalAlpha = (0.01 + rnd() * 0.018) * (stock.dark ? 3 : 1); x.lineWidth = (0.5 + rnd() * 0.7) * s;
        x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(an) * len, py + Math.sin(an) * len); x.stroke();
      }
      for (i = 0, N = Math.round(W * H / 520 * k); i < N; i++) {
        x.globalAlpha = (0.012 + rnd() * 0.03) * (stock.dark ? 2 : 1); x.fillStyle = rnd() < 0.55 ? stock.fleck : (stock.dark ? "#000000" : "#ffffff");
        x.beginPath(); x.arc(rnd() * W, rnd() * H, (0.4 + rnd()) * s, 0, TAU); x.fill();
      }
      x.globalAlpha = 1;
      if (t !== c) {
        x.globalCompositeOperation = "destination-in";
        [[W, 0, 0.1], [0, H, 0.16]].forEach(function (o) {
          var gr = x.createLinearGradient(0, 0, o[0], o[1]), f = o[2];
          for (var j = 0; j <= 6; j++) { var u = j / 6, e = u * u * (3 - 2 * u); gr.addColorStop(u * f, "rgba(0,0,0," + e.toFixed(3) + ")"); gr.addColorStop(1 - u * f, "rgba(0,0,0," + e.toFixed(3) + ")"); }
          x.fillStyle = gr; x.fillRect(0, 0, W, H);
        });
        x.globalCompositeOperation = "source-over";
        base.drawImage(t, 0, 0);
      }
    }
    return c;
  }
  function makeStarve(W, H, rnd, d, amt) {           // pinned specks punched out of every ink: solids print mottled, not laser-flat
    var c = cv(W, H), x = c.getContext("2d"), i, N, k = amt == null ? 1 : amt;
    if (k <= 0) return c;
    x.fillStyle = "#000";
    for (i = 0, N = Math.round(W * H / 1100 * k); i < N; i++) { x.globalAlpha = clamp((0.18 + rnd() * 0.55) * Math.min(1.4, 0.5 + k * 0.5), 0, 1); x.beginPath(); x.arc(rnd() * W, rnd() * H, (0.45 + rnd() * 1.6) * d, 0, TAU); x.fill(); }
    // big starved patches: soft-edged, so they read as thin ink, not as bubbles
    for (i = 0, N = Math.round(W * H / 60000 * k); i < N; i++) {
      var bx = rnd() * W, by = rnd() * H, br = (4 + rnd() * 14) * d, ba = clamp((0.05 + rnd() * 0.09) * k, 0, 0.6), gr = x.createRadialGradient(bx, by, 0, bx, by, br);
      gr.addColorStop(0, "rgba(0,0,0," + ba.toFixed(3) + ")"); gr.addColorStop(0.55, "rgba(0,0,0," + (ba * 0.7).toFixed(3) + ")"); gr.addColorStop(1, "rgba(0,0,0,0)");
      x.globalAlpha = 1; x.fillStyle = gr; x.beginPath(); x.arc(bx, by, br, 0, TAU); x.fill();
    }
    x.fillStyle = "#000";
    x.globalAlpha = 1;
    return c;
  }

  /* ---- the plate: one print job at one size ----
     opts: { W (device px width), vw, vh (scene units), seed, pitch (device px), d (device px per css px),
             stock (key or object), texture (0..2), grain (0..2), starve (0..3), screen: 'dot' | 'line',
             feather (the paper's fibres fade out at the edges: for a print laid on a ground of its paper color) }  */
  function plate(opts) {
    var W = Math.max(16, Math.round(opts.W)), vw = opts.vw, vh = opts.vh, H = Math.max(8, Math.round(W * vh / vw));
    var rnd = mulberry(((opts.seed || 7) * 2654435761) >>> 0), d = opts.d || 1;
    var stock = typeof opts.stock === "string" ? (STOCKS[opts.stock] || STOCKS.cream) : (opts.stock || STOCKS.cream);
    var P = { W: W, H: H, vw: vw, vh: vh, k: W / vw, d: d, pitch: opts.pitch || 2.4 * d, stock: stock,
      grainAmp: 0.085 * (opts.grain == null ? 1 : opts.grain), screen: opts.screen || "dot" };
    P.paper = makePaper(W, H, rnd, stock, opts.texture, !!opts.feather);
    P.grain = makeGrain(W, H, rnd);
    P.starve = makeStarve(W, H, rnd, d, opts.starve);
    return P;
  }

  // Screen alpha coverage into solid ink dots. slot picks the screen angle.
  function screenData(data, P, w, h, slot, rgb, flat) {
    var t = tileFor(slot, P.pitch, P.screen), S = t.S, th = t.th, G = P.grain, W = P.W, H = P.H, sh = SHIFTS[slot % SHIFTS.length], ga = P.grainAmp;
    for (var y = 0; y < h; y++) {
      var trow = (y % S) * S, grow = ((y + sh) % H) * W, i = y * w * 4;
      for (var x = 0; x < w; x++, i += 4) {
        var a = data[i + 3];
        if (a < 3) { data[i + 3] = 0; continue; }
        var on = flat ? a >= 128 : a / 255 >= th[trow + (x % S)] + G[grow + ((x + sh * 3) % W)] * ga;
        if (on) { data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2]; data[i + 3] = 255; }
        else data[i + 3] = 0;
      }
    }
  }

  /* A layer = one ink's plate. draw(g) paints tone as black alpha in scene
     units (0..vw, 0..vh). Returns { c, ink, rgb, slot }. flat: no halftone,
     hard edge at 50% (for crisp type at small sizes). */
  function layer(P, ink, slot, draw, flat) {
    var rgb = inkRGB(ink), c = cv(P.W, P.H), g = c.getContext("2d", { willReadFrequently: true });
    g.setTransform(P.k, 0, 0, P.k, 0, 0);
    g.fillStyle = "#000"; g.strokeStyle = "#000"; g.lineJoin = "round"; g.lineCap = "round";
    draw(g);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    var img = g.getImageData(0, 0, P.W, P.H);
    screenData(img.data, P, P.W, P.H, slot, rgb, flat);
    g.putImageData(img, 0, 0);
    g.globalCompositeOperation = "destination-out"; g.drawImage(P.starve, 0, 0); g.globalCompositeOperation = "source-over";
    return { c: c, ink: ink, rgb: rgb, slot: slot };
  }

  /* Lay the plates down. reg: [[dx,dy], ...] per layer in device px.
     clips: optional per-layer [x,y,w,h] device-px reveal boxes (0 = not yet printed).
     mode: light stock multiplies (true riso); dark stock prints opaque ('normal')
     or glows ('screen'). */
  function compose(x, P, layers, reg, clips, darkMode) {
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = "source-over";
    x.drawImage(P.paper, 0, 0);
    var dark = P.stock.dark;
    x.globalCompositeOperation = dark ? (darkMode === "screen" ? "screen" : "source-over") : "multiply";
    if (dark && darkMode !== "screen") x.globalAlpha = 0.94;
    layers.forEach(function (L, i) {
      var r = reg && reg[i] ? reg[i] : [0, 0], c = clips ? clips[i] : null;
      if (c === 0) return;
      if (c) { x.save(); x.beginPath(); x.rect(c[0], c[1], c[2], c[3]); x.clip(); x.drawImage(L.c, r[0], r[1]); x.restore(); }
      else x.drawImage(L.c, r[0], r[1]);
    });
    x.globalAlpha = 1; x.globalCompositeOperation = "source-over";
    if (dark) {                                           // dark stock soaks the ink: pull a little paper texture back over it
      x.globalAlpha = 0.18; x.globalCompositeOperation = "multiply"; x.drawImage(P.paper, 0, 0);
      x.globalAlpha = 1; x.globalCompositeOperation = "source-over";
    }
  }

  // Registration offsets for n plates: amount in css px, dir in degrees; slot 0 sits true.
  function registration(n, amount, dir, d, seed) {
    var r = mulberry((seed || 3) * 7919), out = [], base = (dir || 0) * Math.PI / 180;
    for (var i = 0; i < n; i++) {
      if (i === 0) { out.push([0, 0]); continue; }
      var a = base + (i - 1) * 2.1 + (r() - 0.5) * 0.9, m = amount * (0.55 + r() * 0.6) * d;
      out.push([Math.cos(a) * m, Math.sin(a) * m]);
    }
    return out;
  }

  /* ---- drawing kit shared by the banner and concepts ---- */
  function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0.01, r), 0, TAU); }
  function ellipse(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); }
  function knock(g, fn) { g.save(); g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000"; g.strokeStyle = "#000"; fn(g); g.restore(); }
  function vgrad(g, y0, y1, stops) { var gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(function (s) { gr.addColorStop(s[0], tone(s[1])); }); return gr; }
  function lgrad(g, x0, y0, x1, y1, stops) { var gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(function (s) { gr.addColorStop(s[0], tone(s[1])); }); return gr; }
  function rgrad(g, x, y, r0, r1, stops) { var gr = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(function (s) { gr.addColorStop(s[0], tone(s[1])); }); return gr; }
  function star(g, cx, cy, R, r, n, rot) {
    n = n || 5; r = r == null ? R * 0.46 : r; rot = rot == null ? -Math.PI / 2 : rot;
    g.beginPath();
    for (var i = 0; i < n * 2; i++) { var rr = i % 2 ? r : R, a = rot + i * Math.PI / n; if (i) g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    g.closePath();
  }
  function roundRect(g, x, y, w, h, r) {
    r = Math.min(r || 0, w / 2, h / 2);
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function seam(g, x, y, r, rot) {                   // basketball seams, stroked by the caller
    g.save(); g.translate(x, y); g.rotate(rot || 0);
    g.beginPath();
    g.moveTo(-r * 0.09, -r * 1.02); g.bezierCurveTo(r * 0.14, -r * 0.35, -r * 0.14, r * 0.35, r * 0.09, r * 1.02);
    g.moveTo(-r * 1.02, r * 0.05); g.bezierCurveTo(-r * 0.4, -r * 0.11, r * 0.4, r * 0.16, r * 1.02, -r * 0.03);
    g.moveTo(-r * 0.64, -r * 0.78); g.quadraticCurveTo(-r * 0.15, 0, -r * 0.64, r * 0.78);
    g.moveTo(r * 0.64, -r * 0.78); g.quadraticCurveTo(r * 0.15, 0, r * 0.64, r * 0.78);
    g.restore();
  }

  window.RISO = {
    version: "lab-1", TAU: TAU,
    SWATCH: SWATCH, SWATCH_NAMES: SWATCH_NAMES, STOCKS: STOCKS,
    clamp: clamp, lerp: lerp, cv: cv, mulberry: mulberry, hexRGB: hexRGB, rgbHex: rgbHex, tone: tone, lum: lum, inkRGB: inkRGB,
    plate: plate, layer: layer, compose: compose, registration: registration,
    circle: circle, ellipse: ellipse, knock: knock, vgrad: vgrad, lgrad: lgrad, rgrad: rgrad, star: star, roundRect: roundRect, seam: seam
  };
})();
