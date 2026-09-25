/* ---------- TRUE 82 LAB: reprint the riso canvases ----------
   The real site prints three things with its own riso engines: THE SHAPE OF
   A SEASON on the results page (results-riso.js, img.rr-print-canvas), and
   the season reel's month strips and effects layer (reel-riso.js,
   img.riso-strip and img.riso-fx; the Heat Check sits on top of the reel).
   A snapshot freezes them as <img data-snap-canvas> in today's inks. This
   page hook swaps in fresh prints from the lab copies of the engines
   (src/vendor/), inked in the palette, on the palette's paper:

     site ink   what it prints                         lab ink
     paper      the stock                              roles.paper (fibres, strokes and flecks keep
                                                       today's proportions to the paper)
     pink       offsets, the sky band, the ridge tint,  roles.offset (a pale one prints heavier, so the
                loss beads and bars, coin rings         type in it still reads)
     sun        the sun, win bars, win coins           roles.sun, unless it is too close to the offset;
                                                       then the next bright ink of the palette
     blue       the record, sky, water, ridge          the palette's deep ink: its keycap color on paper
                                                       (day accent), else a drum ink, else "you"; it must
                                                       read on paper at 4:1 like today's riso blue (a
                                                       lighter drum ink prints heavier), be cool or dark
                                                       (never the red of "bad"), and differ from the
                                                       offset and the sun; last resort roles.ink
     orange     the light in a 45-72% season           a warm drum ink that is none of the above, else sun
     teal       the light in a losing season           a cool drum ink that is none of the above, else sun
     scarlet    reel losses, the giant L               roles.bad
     ghost      the pink plate of a loss moment        the offset ink when it is a pink like today's,
                (the L's ghost, second ring, spray)    else bad paled toward the paper: a loss reads red
   Print Shop and Gold Standard are today's drum, so they keep today's inks on their paper.
   A palette may pin any of these with pal.print = { blue: "violet", sun: "#FFB511", ... }
   (Riso swatch keys or hex). LAB.reprint.drum("vice", "night") shows what a palette gets.
   The display and mono faces follow the recipe, like the page's type.

   What the snapshot does not hold is rebuilt from it:
     results print  the record and mode come from the DOM (.rr-print .big, the eyebrow or the
                    Daily head line); the seed is the site's own (FNV of the five "'YY Surname"
                    names from the roster cards and the wins); the 82 games are read back off the
                    frozen strip under the landscape, the Heat Check save from its ring. A frame
                    caught mid-reveal is detected (where the water stops) and reprinted at that
                    frame; a deferred blank sheet stays blank paper. If the strip cannot be read,
                    a season is dealt from the record with a fixed seed.
     reel strips    every coin is read back off its strip (win coin, loss ring, not yet stamped),
                    checked against the month's printed record, and the ledger is reprinted with
                    the site's streak and loss counts, every stamp settled (a coin the snapshot
                    caught mid-pop prints landed). If a month does not check out, the strips are
                    re-inked pixel by pixel instead (exact, just recolored).
     reel effects   the flying ink, rings and the giant L are a moment, not data: re-inked pixel
                    by pixel (each pixel matched to the ink or overprint it was and how far the
                    loss veil paled it, then swapped; a loss frame's pink plate takes the ghost ink).
   Paper surfaces follow the theme paper too: --rr-paper on <html> (the results slips), the
   ballot sheet and the reel card.

   Work runs in small tasks off the apply call (one plate per task), newest first, and every
   result is cached by look + frozen image, so flipping back to a palette is instant.
   "Today's site" puts every original back. */
(function () {
  "use strict";
  var LAB = window.LAB, R = window.RISO;
  if (!LAB || !R) return;
  var SRC = (document.currentScript && document.currentScript.src) || "";
  var MONTHS = [["OCT", 5], ["NOV", 15], ["DEC", 15], ["JAN", 15], ["FEB", 11], ["MAR", 15], ["APR", 6]];

  /* ---- small helpers ---- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function now() { return window.performance && performance.now ? performance.now() : Date.now(); }
  function fnv(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; } return h; }
  function mulberry(seed) {
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // A cheap fingerprint of a (large) data URI.
  function fp(s) { s = String(s || ""); return s.length + ":" + fnv(s.slice(0, 200) + s.slice(Math.floor(s.length / 2), Math.floor(s.length / 2) + 400) + s.slice(-400)).toString(36); }
  function rgb(h) { return R.inkRGB(h); }
  function hex(c) { return R.rgbHex(c); }
  function lum(h) { return R.lum(rgb(h)); }
  function contrast(a, b) { var x = lum(a), y = lum(b); if (x < y) { var t = x; x = y; y = t; } return (x + 0.05) / (y + 0.05); }
  function hsv(h) {
    var c = rgb(h), r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, hu = 0;
    if (d) { if (mx === r) hu = ((g - b) / d) % 6; else if (mx === g) hu = (b - r) / d + 2; else hu = (r - g) / d + 4; hu *= 60; if (hu < 0) hu += 360; }
    return { h: hu, c: d, v: mx };
  }
  function hueDist(a, b) { var d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }
  // Two inks read as two inks: different hue (both colorful), different lightness, or far apart.
  function distinct(a, b) {
    if (!a || !b) return true;
    var A = hsv(a), B = hsv(b), x = rgb(a), y = rgb(b);
    var dist = Math.sqrt((x[0] - y[0]) * (x[0] - y[0]) + (x[1] - y[1]) * (x[1] - y[1]) + (x[2] - y[2]) * (x[2] - y[2]));
    var lr = (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    return (A.c > 0.25 && B.c > 0.25 && hueDist(A.h, B.h) >= 30) || lr >= 1.5 || dist >= 110;
  }
  // The deep ink carries most of the print: it must not be a darker cut of the sun ink.
  function apart(a, b) {
    var A = hsv(a), B = hsv(b), lr = (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    return (A.c > 0.2 && B.c > 0.2 && hueDist(A.h, B.h) >= 30) || lr >= 2;
  }
  function pick(list, ok) { for (var i = 0; i < list.length; i++) if (list[i] && ok(list[i])) return list[i]; return null; }
  function scale(h, k) { var c = rgb(h); return [Math.round(c[0] * k[0]), Math.round(c[1] * k[1]), Math.round(c[2] * k[2])]; }

  /* ---- the drum: the site's inks -> the palette's ---- */
  var TODAY_DRUM = { sun: "#FFB511", pink: "#FF48B0", blue: "#0078BF", teal: "#00838A", orange: "#FF6C2F", scarlet: "#F65058" };
  var TODAY_PALETTES = { printshop: 1, goldstandard: 1 };
  var CREAM = "#F4ECDD";
  function palIdOf(rc) { return rc.sysPalette && rc.sysPalette !== "match" && rc.sysPalette !== "today" ? rc.sysPalette : rc.palette; }
  function inkHex(v) { try { return v ? hex(R.inkRGB(v)) : null; } catch (e) { return null; } }
  function drumFor(palId, ground) {
    var pal = LAB.palettes[palId] || LAB.palettes.printshop || {}, N = LAB.roles(pal, ground), D = LAB.roles(pal, "day"), ov = pal.print || {};
    var paper = N.paper, out = {}, k;
    var drum = ["c", "a", "b", "key"].map(function (s) { return inkHex(pal.inks && pal.inks[s]); }).filter(Boolean);
    if (TODAY_PALETTES[pal.id]) { for (k in TODAY_DRUM) out[k] = TODAY_DRUM[k]; }
    else {
      // the offset ink prints type too (THE SHAPE OF A SEASON, the loss bars): a pale one prints heavier
      out.pink = inkHex(ov.pink) || N.offset;
      var pinkMin = hsv(out.pink).c >= 0.5 ? 1.65 : 2.3;          // a fluorescent reads at less contrast than a grey
      for (var t0 = 0; t0 < 0.6 && contrast(out.pink, paper) < pinkMin; t0 += 0.1) out.pink = LAB.color.mix(out.pink, N.ink, 0.12);
      // the light: bright, colorful, visible on the paper, and not the offset ink
      out.sun = inkHex(ov.sun) || pick([N.sun, N.accent].concat(drum, [D.sun]), function (c) {
        return lum(c) >= 0.18 && hsv(c).c >= 0.35 && contrast(c, paper) >= 1.25 && distinct(c, out.pink);
      }) || N.sun;
      // the deep ink: reads on paper like today's riso blue does (>= 4:1; a lighter drum ink prints
      // heavier, pulled toward the palette's paper ink), colorful (or a true black), cool or dark
      // (never the red of "bad"), and not a cut of the offset or the sun
      var deepOK = function (c) {
        var H = hsv(c), L = lum(c);
        return (H.c >= 0.2 || (c === D.accent && L < 0.03)) && ((H.h >= 75 && H.h <= 335) || L < 0.06) && distinct(c, out.pink) && apart(c, out.sun);
      };
      out.blue = inkHex(ov.blue) || pick([D.accent].concat(drum, [D.you, N.you]).map(function (c) {
        if (!c || contrast(c, paper) < 2.2) return null;
        for (var t = 0; t <= 0.6 && contrast(c, paper) < 4; t += 0.1) c = LAB.color.mix(c, N.ink, 0.1);
        return contrast(c, paper) >= 4 ? c : null;
      }), deepOK) || N.ink;
      // dusk: a warm drum ink that is none of the others (and not the red of "bad"), else the sun ink
      out.orange = inkHex(ov.orange) || pick(drum.concat([N.accent]), function (c) {
        var H = hsv(c);
        return (H.h <= 50 || H.h >= 335) && H.c >= 0.4 && lum(c) >= 0.15 && distinct(c, out.sun) && distinct(c, out.pink) && distinct(c, out.blue) && distinct(c, N.bad);
      }) || out.sun;
      // a losing year's moonlight: a cool mid ink that is none of the others, else the sun ink
      out.teal = inkHex(ov.teal) || pick(drum.concat([N.you, D.you]), function (c) {
        var H = hsv(c), L = lum(c);
        return H.h >= 150 && H.h <= 285 && H.c >= 0.3 && L >= 0.06 && L <= 0.5 && distinct(c, out.blue) && distinct(c, out.pink) && distinct(c, out.sun);
      }) || out.sun;
      out.scarlet = inkHex(ov.scarlet) || N.bad;
    }
    // a loss is red in every palette: the giant L's ghost plate (and the loss ring and spray around it)
    // prints in the offset ink only when that is a pink like today's (pink over bad reads pinkish red);
    // an aqua, green, orange or gold offset would turn the L grey or orange, so those get a paler cut of bad
    var pk = hsv(out.pink);
    out.ghost = inkHex(ov.ghost) || (pk.h >= 290 && pk.h <= 350 && pk.c >= 0.45 ? out.pink : LAB.color.mix(out.scarlet, paper, 0.4));
    // the stock: today's recipe (fibre, stroke and fleck as fixed fractions of the paper), at the theme paper
    var stock = String(paper).toUpperCase() === CREAM ? { paper: CREAM, fibre: [176, 160, 131], stroke: "#8b7f68", fleck: "#776c5a" }
      : { paper: paper, fibre: scale(paper, [176 / 244, 160 / 236, 131 / 221]), stroke: hex(scale(paper, [139 / 244, 127 / 236, 104 / 221])), fleck: hex(scale(paper, [119 / 244, 108 / 236, 90 / 221])) };
    return { inks: out, paper: paper, stock: stock };
  }

  /* ---- type: the page's display and mono faces ---- */
  var fontLinks = {};
  function ensureFontCSS(css) {                 // the parent lab only preloads the masthead faces and Plex Mono
    if (!css || fontLinks[css]) return fontLinks[css] || Promise.resolve();
    fontLinks[css] = new Promise(function (res) {
      var l = document.createElement("link"); l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=" + css + "&display=swap";
      l.onload = res; l.onerror = res; setTimeout(res, 3000);
      document.head.appendChild(l);
    });
    return fontLinks[css];
  }
  function fontsFor(rc) {
    var df = LAB.displayFace ? LAB.displayFace(rc) : (rc.disp && rc.disp !== "match" ? LAB.fonts && LAB.fonts[rc.disp] : LAB.fonts && LAB.fonts[rc.font]);
    var mf = LAB.MONO && LAB.MONO[rc.mono || "plexmono"], out = {}, waits = [];
    if (df && df.family) {
      out.cond = "\"" + df.family + "\", \"Barlow Condensed\", \"Arial Narrow\", sans-serif";
      out.condW = (df.style === "italic" ? "italic " : "") + (df.weight || 700);
      if (df.css) waits.push(ensureFontCSS(df.css));
    }
    if (mf && mf.family) { out.mono = "\"" + mf.family + "\", \"IBM Plex Mono\", ui-monospace, monospace"; if ((rc.mono || "plexmono") !== "plexmono") waits.push(ensureFontCSS(mf.css)); }
    out.ready = Promise.all(waits);
    return out;
  }

  /* ---- the look for a recipe ---- */
  var looks = {};
  function lookFor(rc) {
    var palId = palIdOf(rc), ground = rc.ground === "day" ? "day" : "night";
    var fonts = fontsFor(rc), dk = palId + "/" + ground;
    var drum = looks[dk] || (looks[dk] = drumFor(palId, ground));
    var inks = {}, k;
    for (k in drum.inks) inks[k] = rgb(drum.inks[k]);
    var look = { inks: inks, stock: drum.stock, fonts: { cond: fonts.cond, condW: fonts.condW, mono: fonts.mono }, paper: drum.paper, fontsReady: fonts.ready, drum: drum.inks };
    look.key = fnv(JSON.stringify([drum.inks, drum.stock, look.fonts])).toString(36);
    look.inkKey = fnv(JSON.stringify([drum.inks, drum.stock])).toString(36);
    return look;
  }

  /* ---- the engines (inlined before system/ in the build; loaded on demand in dev) ---- */
  var enginesP = null;
  function engines() {
    if (window.T82PRINT_LAB && window.T82RISO_LAB) return Promise.resolve();
    if (enginesP) return enginesP;
    var base = SRC ? new URL("../vendor/", SRC).href : "";
    enginesP = Promise.all(["results-riso.js", "reel-riso.js"].map(function (f) {
      return new Promise(function (res) {
        var s = document.createElement("script"); s.src = base + f + "?t=" + Date.now();
        s.onload = res; s.onerror = function () { console.error("[lab] reprint: could not load vendor/" + f); res(); };
        document.head.appendChild(s);
      });
    }));
    return enginesP;
  }

  /* ---- jobs: one at a time, newest first, dropped when nobody wants them any more ---- */
  var cache = {}, order = [], queue = [], busy = false, CAP = 90;
  var stats = LAB.reprintStats = { jobs: 0, dropped: 0, results: [], strips: [], fx: [], paper: [] };
  function log(list, o) { list.push(o); if (list.length > 120) list.shift(); }
  // a target still wants its print while it asks for this key and its page is still up
  function up(el) { return el.isConnected !== false && (!el.ownerDocument || !!el.ownerDocument.defaultView); }
  function live(e) { return e.targets.some(function (t) { return t.el.__labWant === t.key && up(t.el); }); }
  function request(key, el, make, apply) {
    el.__labWant = key;
    var e = cache[key];
    if (e && e.done) { if (e.url) apply(e.url); touch(key); return; }
    if (!e) { e = cache[key] = { targets: [], make: make, done: false, url: null }; queue.push(key); }
    e.targets.push({ el: el, key: key, apply: apply });
    pump();
  }
  function touch(key) { var i = order.indexOf(key); if (i >= 0) order.splice(i, 1); order.push(key); }
  function evict() {
    while (order.length > CAP) {
      var k = order.shift(), e = cache[k];
      if (e && !live(e)) delete cache[k]; else if (e) { order.push(k); break; }
    }
  }
  function pump() {
    if (busy || !queue.length) return;
    var key = queue.pop(), e = cache[key];                  // newest first: the screen being looked at wins
    if (!e) { pump(); return; }
    if (!live(e)) { delete cache[key]; stats.dropped++; setTimeout(pump, 0); return; }
    busy = true; stats.jobs++;
    var fin = false;
    function done(url) {
      if (fin) return; fin = true;
      e.done = true; e.url = url || null;
      e.targets.forEach(function (t) { if (url && t.el.__labWant === t.key) t.apply(url); });
      e.targets = e.targets.filter(function (t) { return t.el.__labWant === t.key; });
      touch(key); evict();
      busy = false; setTimeout(pump, 0);
    }
    function alive() { return live(e); }
    engines().then(function () {
      try { e.make(done, alive); } catch (err) { console.error("[lab] reprint", err); done(null); }
    });
  }
  // a job that went stale mid-way gives its slot back and can be asked for again
  function abandon(key, done) { var e = cache[key]; delete cache[key]; stats.dropped++; if (e) { e.targets = []; } done(null); }

  /* ---- pixels of a frozen image ---- */
  var pixCache = {}, pixOrder = [];                  // decoded frozen pixels: a few, most recent first (an fx layer is 4MB)
  function pixels(src) {
    var k = fp(src);
    if (pixCache[k]) return pixCache[k];
    pixOrder.push(k);
    while (pixOrder.length > 10) delete pixCache[pixOrder.shift()];
    pixCache[k] = new Promise(function (res, rej) {
      var im = new Image();
      im.onload = function () {
        try {
          var c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight;
          var g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(im, 0, 0);
          res({ w: c.width, h: c.height, data: g.getImageData(0, 0, c.width, c.height).data });
        } catch (e) { rej(e); }
      };
      im.onerror = rej;
      im.src = src;
    });
    return pixCache[k];
  }
  function toURL(canvas, type, q) { return canvas.toDataURL(type || "image/png", q); }

  /* ================= the results print ================= */
  var BV = { VW: 1000, VH: 660, FX0: 36, FY0: 168, FX1: 964, FY1: 520, WL: 430, X0: 80, X1: 920 };
  function X(g) { return BV.X0 + g / 82 * (BV.X1 - BV.X0); }
  function surname(nm) {
    var parts = String(nm).trim().split(/\s+/);
    if (parts.length < 2) return String(nm || "");
    var rest = parts.slice(1);
    while (rest.length > 1 && /^(jr\.?|sr\.?|ii|iii|iv|v)$/i.test(rest[rest.length - 1])) rest.pop();
    return rest.join(" ");
  }
  // Everything the print needs that the DOM still says.
  function printFacts(img, doc) {
    var host = img.closest ? img.closest(".rr-print") : null, board = img.closest ? img.closest(".rr-board") : null;
    var big = host && host.querySelector(".big"), label = (host && host.getAttribute("aria-label")) || "";
    var m = /(\d+)\D+(\d+)/.exec((big && big.textContent) || label), wins = m ? +m[1] : 60, losses = m ? +m[2] : 82 - wins;
    var context = "CLASSIC MODE", dh = board && board.querySelector(".daily-head-line"), eb = board && board.querySelector(".eyebrow");
    if (dh) { var dm = /THE DAILY #\s*\d+/i.exec(dh.textContent); context = dm ? dm[0].toUpperCase().replace(/#\s+/, "#") : "THE DAILY"; }
    else if (eb) { var t = eb.textContent.toLowerCase(); context = /salary cap/.test(t) ? "PRESTI MODE" : /pro draft/.test(t) ? "PRO MODE" : "CLASSIC MODE"; }
    var names = [];
    doc.querySelectorAll(".traits-roster .bt-card, .traits-roster .pick-card").forEach(function (card) {
      if (names.length >= 5) return;
      var a = card.querySelector(".pr-bref"), yr = card.querySelector(".pr-yr");
      var nm = (a && (a.getAttribute("data-bb") || a.textContent)) || "", y = (yr && yr.textContent.trim()) || "";
      if (nm) names.push("'" + y.slice(-2) + " " + surname(nm));
    });
    var st = img.getAttribute("style") || "", sm = /width:\s*([\d.]+)px;\s*height:\s*([\d.]+)px/.exec(st);
    var cssW = sm ? parseFloat(sm[1]) : (img.getBoundingClientRect().width || 342);
    return { wins: wins, losses: losses, context: context, names: names, projected: /projected/i.test(label), cssW: Math.round(cssW) || 342 };
  }
  // Read the season back off the frozen print.
  function readPrint(px, facts) {
    var W = px.w, H = px.h, k = W / BV.VW, d = W / facts.cssW, u = d / k;   // u: scene units per css px of registration
    var data = px.data;
    function inkAt(x0, y0, x1, y1) {                     // mean ink (255 - min channel) over a scene box
      var a = Math.max(0, Math.floor(x0 * k)), b = Math.max(0, Math.floor(y0 * k)), c = Math.min(W, Math.ceil(x1 * k)), e = Math.min(H, Math.ceil(y1 * k)), s = 0, n = 0;
      for (var y = b; y < e; y++) for (var x = a; x < c; x++) { var i = (y * W + x) * 4; s += 255 - Math.min(data[i], data[i + 1], data[i + 2]); n++; }
      return n ? s / n : 0;
    }
    function pinkAt(x0, y0, x1, y1) {                    // mean (red - green): the pink ink's signature
      var a = Math.max(0, Math.floor(x0 * k)), b = Math.max(0, Math.floor(y0 * k)), c = Math.min(W, Math.ceil(x1 * k)), e = Math.min(H, Math.ceil(y1 * k)), s = 0, n = 0;
      for (var y = b; y < e; y++) for (var x = a; x < c; x++) { var i = (y * W + x) * 4; s += data[i] - data[i + 1]; n++; }
      return n ? s / n : 0;
    }
    // blank: the deferred sheet before the print plays (paper only)
    var sky = 0, n = 0;
    for (var gx = 60; gx < 960; gx += 60) for (var gy = 190; gy < 500; gy += 50) { sky += inkAt(gx - 6, gy - 6, gx + 6, gy + 6); n++; }
    if (sky / n < 70) return { blank: true };
    // where the land plates stop: the water's ink profile, column by column. The blue plate
    // carries most of the water and sits 1.2 css px left of true, so its edge + 1.2 is the clip.
    var y0 = Math.floor(462 * k), y1 = Math.ceil(514 * k), cols = [], x, y;
    for (x = 0; x < W; x++) { var sum = 0; for (y = y0; y < y1; y++) { var j = (y * W + x) * 4; sum += 255 - Math.min(data[j], data[j + 1], data[j + 2]); } cols.push(sum / (y1 - y0)); }
    var left = cols.slice(Math.floor(120 * k), Math.floor(260 * k)).sort(function (p, q) { return p - q; }), ref = left[Math.floor(left.length / 2)] || 0, edge = W;
    for (x = Math.floor(BV.FX1 * k) + 6; x > BV.FX0 * k; x--) {
      var m = (cols[x - 2] + cols[x - 1] + cols[x] + (cols[x + 1] || 0) + (cols[x + 2] || 0)) / 5;
      if (m > Math.max(45, ref * 0.45)) { edge = x + 2; break; }
    }
    var xr = (edge + 1.2 * d) / k;
    var reveal = xr < BV.FX1 - 12 ? clamp((xr - BV.X0) / (BV.X1 - BV.X0) * 82, 0, 82) : null;
    // the strip: wins in the light ink on the upper row, losses in pink on the lower
    var wp = facts.wins / 82, lightReg = wp >= 0.72 ? [0, 0] : wp >= 0.45 ? [0.9, -1.2] : [-0.9, -1.0], pinkReg = [1.5, -1.1];
    var games = [], present = 0, lastPresent = -1;
    for (var i = 0; i < 82; i++) {
      var xc = X(i + 0.5);
      var wv = inkAt(xc + lightReg[0] * u - 2, 553, xc + lightReg[0] * u + 2, 567), lv = inkAt(xc + pinkReg[0] * u - 2, 584, xc + pinkReg[0] * u + 2, 599);
      if (Math.max(wv, lv) > 105) { games.push(wv > lv ? 1 : 0); present++; lastPresent = i; } else games.push(null);
    }
    if (reveal != null && lastPresent >= 0) reveal = clamp(reveal, lastPresent + 0.6, lastPresent + 1.8);
    // the Heat Check save: a pink ring whose top sits above that game's bar
    var saved = null, best = 55;
    for (i = 0; i < 82; i++) {
      if (games[i] !== 1) continue;
      var p = pinkAt(X(i + 0.5) + pinkReg[0] * u - 1.5, 560 - 20.16 - 1.6 + pinkReg[1] * u, X(i + 0.5) + pinkReg[0] * u + 1.5, 560 - 20.16 + 1.6 + pinkReg[1] * u);
      if (p > best) { best = p; saved = i; }
    }
    return { games: games, present: present, lastPresent: lastPresent, reveal: reveal, saved: saved };
  }
  function dealSeason(wins, seed, known) {               // a believable season from the record (fixed seed)
    var g = (known || []).slice(), have = g.length, lossesKnown = g.filter(function (x) { return !x; }).length;
    var left = 82 - have, lossesLeft = clamp(82 - wins - lossesKnown, 0, left), rest = [], r = mulberry(seed ^ 0x5eed), i;
    for (i = 0; i < left; i++) rest.push(i < lossesLeft ? 0 : 1);
    for (i = rest.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = rest[i]; rest[i] = rest[j]; rest[j] = t; }
    return g.concat(rest);
  }
  var specCache = {}, howBy = {};
  function printSpec(img, doc) {
    var src = img.__labOrig, facts = printFacts(img, doc);
    var key = fp(src) + "|" + facts.wins + "-" + facts.losses + "|" + facts.context + "|" + facts.names.join("|");
    if (specCache[key]) return specCache[key];
    specCache[key] = pixels(src).then(function (px) {
      var seed = fnv(facts.names.join("|") + "#" + facts.wins), rd = readPrint(px, facts), spec, how;
      var d = px.w / facts.cssW;
      if (rd.blank) return { spec: { games: null, wins: facts.wins, seed: seed, context: facts.context }, blank: true, cssW: facts.cssW, d: d, how: "blank sheet" };
      if (facts.projected || rd.present === 0) {
        spec = { games: null, wins: facts.wins, saved: null, context: facts.context, seed: seed }; how = "projected";
      } else if (rd.reveal == null && rd.present === 82) {
        spec = { games: rd.games, wins: facts.wins, saved: rd.saved, context: facts.context, seed: seed }; how = "read off the strip";
        var w = rd.games.reduce(function (a, b) { return a + b; }, 0);
        if (w !== facts.wins) how += " (strip says " + w + ", page says " + facts.wins + ")";
      } else if (rd.reveal != null && rd.present > 0) {
        var known = rd.games.slice(0, rd.lastPresent + 1).map(function (x) { return x == null ? 1 : x; });
        spec = { games: dealSeason(facts.wins, seed, known), wins: facts.wins, saved: rd.saved, context: facts.context, seed: seed };
        how = "mid-reveal at game " + rd.reveal.toFixed(1) + ", " + known.length + " games read, rest dealt";
      } else {
        spec = { games: dealSeason(facts.wins, seed, null), wins: facts.wins, saved: null, context: facts.context, seed: seed }; how = "dealt from the record";
      }
      if (spec.games) spec.wins = spec.games.reduce(function (a, b) { return a + b; }, 0);
      return { spec: spec, reveal: rd.reveal, cssW: facts.cssW, d: d, how: how };
    });
    return specCache[key];
  }
  function reprintResults(img, doc, look) {
    var key = "rr|" + look.key + "|" + fp(img.__labOrig);
    request(key, img, function (done, alive) {
      var t0 = now();
      Promise.all([printSpec(img, doc), look.fontsReady]).then(function (r) {
        var an = r[0];
        if (!alive()) { abandon(key, done); return; }
        var job = window.T82PRINT_LAB.print(an.spec, {
          cssW: an.cssW, d: an.d, look: look, reveal: an.reveal, blank: an.blank,
          defer: function (fn) { setTimeout(function () { if (!alive()) { job && job.cancel(); abandon(key, done); return; } fn(); }, 0); }
        }, function (canvas) {
          if (!canvas) { done(null); return; }
          var url = toURL(canvas, "image/jpeg", 0.9);
          log(stats.results, { ms: Math.round(now() - t0), w: canvas.width, how: an.how });
          howBy[key] = an.how;
          done(url);
        });
      }).catch(function (e) { console.error("[lab] reprint results", e); done(null); });
    }, function (url) { img.setAttribute("src", url); img.__labHow = howBy[key]; });
  }

  /* ================= the reel ================= */
  function stripBox(img) {
    var st = img.getAttribute("style") || "", m = /width:\s*([\d.]+)px;\s*height:\s*([\d.]+)px/.exec(st);
    return m ? [parseFloat(m[1]), parseFloat(m[2])] : [img.offsetWidth, img.offsetHeight];
  }
  // One pitch fits every strip on the card: intersect the ranges each width allows.
  function layoutReel(items) {
    var lo = 0, hi = 1e9;
    items.forEach(function (it) {
      var best = null;
      for (var c = Math.min(it.count, 16); c >= 1; c--) {
        var p = it.cssW / c, rows = Math.ceil(it.count / c);
        if (Math.abs(Math.round(rows * p + p * 0.95) - it.cssH) <= 1) { best = c; break; }
      }
      it.cols = best || Math.min(it.count, 14);
      lo = Math.max(lo, (it.cssW - 0.5) / it.cols); hi = Math.min(hi, (it.cssW + 0.5) / it.cols);
    });
    var pitch = lo <= hi ? (lo + hi) / 2 : null;
    items.forEach(function (it) { it.pitch = pitch || it.cssW / it.cols; it.rows = Math.ceil(it.count / it.cols); });
  }
  // Read the coins back: a win is a sunflower disc, a loss a scarlet ring with an open middle.
  function readStrip(px, it) {
    var d = px.w / it.cssW, W = px.w, H = px.h, data = px.data, out = [];
    var Rr = it.pitch * 0.36 * d;
    for (var idx = 0; idx < it.count; idx++) {
      var cx = it.pitch * (idx % it.cols + 0.5) * d, cy = it.pitch * (Math.floor(idx / it.cols) + 0.5) * d;
      var inN = 0, inOn = 0, inG = 0, ringN = 0, ringOn = 0;
      for (var y = Math.floor(cy - Rr); y <= Math.ceil(cy + Rr); y++) {
        if (y < 0 || y >= H) continue;
        for (var x = Math.floor(cx - Rr); x <= Math.ceil(cx + Rr); x++) {
          if (x < 0 || x >= W) continue;
          var dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.sqrt(dx * dx + dy * dy) / Rr, i = (y * W + x) * 4, on = data[i + 3] > 110;
          if (r < 0.45) { inN++; if (on) { inOn++; inG += data[i + 1]; } }
          else if (r > 0.68 && r < 0.95) { ringN++; if (on) ringOn++; }
        }
      }
      var inCov = inN ? inOn / inN : 0, ringCov = ringN ? ringOn / ringN : 0, g = inOn ? inG / inOn : 0;
      if (inCov > 0.45 && g > 110) out.push(1);
      else if (ringCov > 0.3) out.push(0);
      else break;                                       // not stamped yet: the month is still printing
    }
    return out;
  }
  function recOf(el) { var m = el && /(\d+)\D+(\d+)/.exec(el.textContent); return m ? [+m[1], +m[2]] : null; }
  var reelCache = {};
  function readReel(doc) {
    var ov = doc.querySelector(".reel-overlay.riso");
    if (!ov) return null;
    var imgs = Array.prototype.slice.call(ov.querySelectorAll("img.riso-strip[data-snap-canvas]"));
    if (!imgs.length) return null;
    var sig = imgs.map(function (im) { return fp(im.__labOrig || im.getAttribute("src")); }).join(",") + "|" + ((ov.querySelector("#reelRun") || {}).textContent || "");
    if (reelCache[sig]) return reelCache[sig];
    var items = imgs.map(function (im) {
      var act = im.closest(".reel-act"), mo = act && act.querySelector(".reel-mo"), name = mo ? mo.textContent.trim().toUpperCase() : "OCT";
      var mi = Math.max(0, MONTHS.map(function (m) { return m[0]; }).indexOf(name)), box = stripBox(im);
      return { img: im, mi: mi, count: MONTHS[mi][1], cssW: box[0], cssH: box[1], rec: recOf(act && act.querySelector(".reel-mo-rec")) };
    });
    layoutReel(items);
    reelCache[sig] = Promise.all(items.map(function (it) { return pixels(it.img.__labOrig || it.img.getAttribute("src")); })).then(function (pxs) {
      var ok = true, gi0 = 0, winRun = 0, cl = 0, cw = 0, why = "";
      items.forEach(function (it, n) {
        it.d = pxs[n].w / it.cssW;
        var res = readStrip(pxs[n], it), w = res.filter(Boolean).length, l = res.length - w;
        if (it.rec && (it.rec[0] !== w || it.rec[1] !== l)) { ok = false; why = MONTHS[it.mi][0] + " read " + w + "-" + l + ", printed " + it.rec.join("-"); }
        var start = MONTHS.slice(0, it.mi).reduce(function (a, m) { return a + m[1]; }, 0);
        if (n > 0 && start !== gi0) { ok = false; why = "months out of order"; }
        gi0 = start;
        it.dots = res.map(function (win, idx) {
          if (win) { winRun++; cw++; } else { winRun = 0; cl++; }
          return { idx: idx, win: !!win, streak: win ? winRun : 0, gi: start + idx, cl: cl };
        });
        gi0 = start + it.count;
      });
      var run = recOf(ov.querySelector("#reelRun"));
      if (ok && run && (run[0] !== cw || run[1] !== cl)) { ok = false; why = "season read " + cw + "-" + cl + ", printed " + run.join("-"); }
      return { ok: ok, why: why, items: items, sig: sig };
    });
    return reelCache[sig];
  }
  function reprintStrip(img, doc, look) {
    var reel = readReel(doc);
    if (!reel) return;
    var key = "strip|" + look.inkKey + "|" + fp(img.__labOrig) + "|" + fnv(String(doc.querySelectorAll("img.riso-strip").length) + (doc.querySelector("#reelRun") || {}).textContent);
    request(key, img, function (done, alive) {
      var t0 = now();
      reel.then(function (rl) {
        if (!alive()) { abandon(key, done); return; }
        var it = rl.items.filter(function (x) { return x.img === img || fp(x.img.__labOrig) === fp(img.__labOrig); })[0];
        if (!rl.ok || !it) {                            // cannot trust the read: recolor the frozen pixels instead
          remapImage(img.__labOrig, reelRemap(look)).then(function (url) {
            log(stats.strips, { ms: Math.round(now() - t0), how: "re-inked (" + (rl.why || "no layout") + ")" });
            done(url);
          }, function () { done(null); });
          return;
        }
        var c = window.T82RISO_LAB.strip({ mi: it.mi, count: it.count, cols: it.cols, pitch: it.pitch, cssW: Math.round(it.cssW), cssH: Math.round(it.cssH), d: it.d, look: look, dots: it.dots });
        log(stats.strips, { ms: Math.round(now() - t0), how: "reprinted " + MONTHS[it.mi][0] + " " + it.dots.length + " games" });
        done(toURL(c, "image/png"));
      }).catch(function (e) { console.error("[lab] reprint strip", e); done(null); });
    }, function (url) { img.setAttribute("src", url); });
  }

  /* ---- pixel re-inking (the effects layer, and any strip that will not read) ----
     Each pixel is matched to the ink or overprint it was, and how far the loss veil (paper)
     paled it: the effects multiply onto a half-clear paper veil, so a pixel sits on the line
     from its ink to the paper (a pale scarlet is scarlet under the veil, not the pink ink).
     It is swapped for the same ink, paled the same way, in the new drum; its alpha is kept.
     On the effects layer a frame that holds a loss (any scarlet) is all loss marks, so its pink
     plate (the L's ghost, the second ring, the pink spray) prints in the drum's loss ghost:
     the L reads red in every palette. A win frame's pink (the tenth-straight ring, the 82-0
     finale) stays the offset ink, and so does every pink on a strip. */
  var W8 = [0.8, 1, 0.7];                                  // channel weights for matching (the eye cares most for green)
  function reelRemap(look, fx) {
    var S = { sun: [255, 181, 17], pink: [255, 72, 176], scarlet: [246, 80, 88] }, SP = [244, 236, 221];
    var TP = rgb(look.paper), L = { sun: look.inks.sun, pink: look.inks.ghost || look.inks.pink, scarlet: look.inks.scarlet };
    var P = { sun: look.inks.sun, pink: look.inks.pink, scarlet: look.inks.scarlet };
    function mul(a, b) { return [a[0] * b[0] / 255, a[1] * b[1] / 255, a[2] * b[2] / 255]; }
    var src = [], dst = [], dstLoss = [], hasScarlet = [];
    function target(names, T) {
      var t = [255, 255, 255];
      names.forEach(function (n) { t = mul(t, T[n]); });
      // the giant L is scarlet over its pink ghost: on the site the overlap reads as a deeper scarlet,
      // so it stays a deeper scarlet here (a straight overprint of, say, aqua and orange would be mud)
      if (names.indexOf("pink") >= 0 && names.indexOf("scarlet") >= 0) {
        t = mul(T.scarlet, [209, 209, 209]);
        if (names.indexOf("sun") >= 0) t = mul(t, T.sun);
      }
      return t;
    }
    [["sun"], ["pink"], ["scarlet"], ["sun", "pink"], ["sun", "scarlet"], ["pink", "scarlet"], ["sun", "pink", "scarlet"]].forEach(function (names) {
      var s = [255, 255, 255];
      names.forEach(function (n) { s = mul(s, S[n]); });
      src.push(s); dst.push(target(names, P)); dstLoss.push(target(names, L));
      hasScarlet.push(names.indexOf("scarlet") >= 0);
    });
    return { src: src, dst: dst, dstLoss: fx ? dstLoss : dst, hasScarlet: hasScarlet, paperS: SP, paperT: TP, key: look.inkKey + (fx ? "|fx" : "|strip") };
  }
  // the nearest point to c on the line from ink s to paper p: [how far along (0 = ink, 1 = paper), weighted miss]
  function onLine(c, s, p) {
    var num = 0, den = 0, k, d, e, err = 0, t;
    for (k = 0; k < 3; k++) { d = p[k] - s[k]; num += W8[k] * (c[k] - s[k]) * d; den += W8[k] * d * d; }
    t = den ? clamp(num / den, 0, 1) : 0;
    for (k = 0; k < 3; k++) { e = c[k] - (s[k] + (p[k] - s[k]) * t); err += W8[k] * e * e; }
    return [t, err];
  }
  var remapCache = {}, remapOrder = [];
  function remapImage(src, map) {
    var key = fp(src) + "|" + map.key;
    if (remapCache[key]) return remapCache[key];
    remapOrder.push(key);
    while (remapOrder.length > 30) delete remapCache[remapOrder.shift()];
    remapCache[key] = pixels(src).then(function (px) {
      var c = document.createElement("canvas"); c.width = px.w; c.height = px.h;
      var g = c.getContext("2d"), img = g.createImageData(px.w, px.h), o = img.data, s = px.data, memo = {}, any = false, scarlet = 0, i, a, pk, hit;
      function classify(i) {                            // -> [ink index, paled by, the pixel's miss per channel]
        var col = [s[i], s[i + 1], s[i + 2]], best = 0, bt = 0, bd = 1e12;
        for (var j = 0; j < map.src.length; j++) { var f = onLine(col, map.src[j], map.paperS); if (f[1] < bd) { bd = f[1]; best = j; bt = f[0]; } }
        var q = map.src[best], P = map.paperS;
        return [best, bt, col[0] - (q[0] + (P[0] - q[0]) * bt), col[1] - (q[1] + (P[1] - q[1]) * bt), col[2] - (q[2] + (P[2] - q[2]) * bt)];
      }
      // pass 1: what each color was, and whether the frame holds a loss
      for (i = 0; i < s.length; i += 4) {
        a = s[i + 3];
        if (!a) continue;
        any = true;
        pk = (s[i] << 16) | (s[i + 1] << 8) | s[i + 2];
        hit = memo[pk] || (memo[pk] = classify(i));
        if (a > 100 && hit[1] < 0.6 && map.hasScarlet[hit[0]]) scarlet++;
      }
      if (!any) return null;                            // an empty layer stays as it is
      var dst = scarlet > 24 ? map.dstLoss : map.dst, T = map.paperT, out = {};
      // pass 2: the same ink in the new drum, paled the same way, keeping half the pixel's miss
      // (anti-aliasing, soft edges) as a shift
      for (i = 0; i < s.length; i += 4) {
        a = s[i + 3];
        if (!a) continue;
        pk = (s[i] << 16) | (s[i + 1] << 8) | s[i + 2];
        var rgbOut = out[pk];
        if (!rgbOut) {
          var h = memo[pk], tt = dst[h[0]], t = h[1];
          rgbOut = out[pk] = [clamp(Math.round(tt[0] + (T[0] - tt[0]) * t + h[2] * 0.5), 0, 255), clamp(Math.round(tt[1] + (T[1] - tt[1]) * t + h[3] * 0.5), 0, 255), clamp(Math.round(tt[2] + (T[2] - tt[2]) * t + h[4] * 0.5), 0, 255)];
        }
        o[i] = rgbOut[0]; o[i + 1] = rgbOut[1]; o[i + 2] = rgbOut[2]; o[i + 3] = a;
      }
      g.putImageData(img, 0, 0);
      return toURL(c, "image/png");
    });
    return remapCache[key];
  }
  function reinkFx(img, look) {
    var key = "fx|" + look.inkKey + "|" + fp(img.__labOrig);
    request(key, img, function (done, alive) {
      var t0 = now();
      if (!alive()) { abandon(key, done); return; }
      remapImage(img.__labOrig, reelRemap(look, true)).then(function (url) {
        log(stats.fx, { ms: Math.round(now() - t0), empty: !url });
        done(url || img.__labOrig);
      }, function () { done(null); });
    }, function (url) { img.setAttribute("src", url); });
  }

  /* ================= paper surfaces ================= */
  function paperURL(kind, stock, html, want, cb) {
    var key = "paper|" + kind + "|" + JSON.stringify(stock);
    var holder = {};                                  // wanted for as long as the page still shows this look
    Object.defineProperty(holder, "isConnected", { get: function () { return html.__labPaperWant === want && html.isConnected !== false; } });
    request(key, holder, function (done) {
      var t0 = now(), url = kind === "reel" ? window.T82RISO_LAB.paper(stock) : window.T82PRINT_LAB.paper(stock);
      log(stats.paper, { ms: Math.round(now() - t0), kind: kind });
      done(url);
    }, cb);
  }
  function papers(doc, look) {
    var html = doc.documentElement, st = html.style;
    if (html.__labRrPaper === undefined) html.__labRrPaper = st.getPropertyValue("--rr-paper") || "";
    var sheets = Array.prototype.slice.call(doc.querySelectorAll(".bt-sheet, #btSheet")), cards = Array.prototype.slice.call(doc.querySelectorAll(".reel-overlay.riso .reel-card"));
    sheets.concat(cards).forEach(function (el) { if (el.__labBg === undefined) el.__labBg = el.style.backgroundImage || ""; });
    var want = look ? look.inkKey : "today";
    html.__labPaperWant = want;
    if (!look) {
      if (html.__labRrPaper) st.setProperty("--rr-paper", html.__labRrPaper);
      sheets.concat(cards).forEach(function (el) { if (el.__labBg) el.style.backgroundImage = el.__labBg; });
      return;
    }
    if (html.__labRrPaper || sheets.some(function (s) { return s.__labBg; })) {
      paperURL("print", look.stock, html, want, function (url) {
        if (html.__labPaperWant !== want) return;
        if (html.__labRrPaper) st.setProperty("--rr-paper", "url(" + url + ")");
        sheets.forEach(function (el) { if (el.__labBg) el.style.backgroundImage = "url(" + url + ")"; });
      });
    }
    if (cards.some(function (c) { return c.__labBg; })) {
      paperURL("reel", look.stock, html, want, function (url) {
        if (html.__labPaperWant !== want) return;
        cards.forEach(function (el) { if (el.__labBg) el.style.backgroundImage = "url(" + url + ")"; });
      });
    }
  }

  /* ================= the hook ================= */
  function restore(img) {
    img.__labWant = null;
    if (img.__labOrig != null && img.getAttribute("src") !== img.__labOrig) img.setAttribute("src", img.__labOrig);
  }
  function hook(doc, rc) {
    if (!doc || !doc.documentElement) return;
    var today = !rc || rc.sysPalette === "today", look = today ? null : lookFor(rc);
    papers(doc, look);
    doc.querySelectorAll("img[data-snap-canvas]").forEach(function (img) {
      if (img.__labOrig == null) img.__labOrig = img.getAttribute("src") || "";
      if (!img.__labOrig || !/^data:/.test(img.__labOrig)) return;
      if (!look) { restore(img); return; }
      var cls = img.classList;
      if (cls.contains("rr-print-canvas")) reprintResults(img, doc, look);
      else if (cls.contains("riso-strip")) reprintStrip(img, doc, look);
      else if (cls.contains("riso-fx")) reinkFx(img, look);
    });
  }
  LAB.pageHooks = LAB.pageHooks || [];
  LAB.pageHooks = LAB.pageHooks.filter(function (h) { return !h.__labReprint; });
  hook.__labReprint = true;
  LAB.pageHooks.push(hook);

  // for the console and for checks: LAB.reprint.drum("vice", "night"), LAB.reprint.stats
  LAB.reprint = { drum: function (id, g) { return drumFor(id, g || "night"); }, look: lookFor, stats: stats, cache: cache, engines: engines,
    clear: function () { cache = LAB.reprint.cache = {}; order = []; queue = []; looks = {}; specCache = {}; reelCache = {}; remapCache = {}; pixCache = {}; } };
})();
