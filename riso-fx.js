/* ---------- v67 THE RISO FX LAYER (T82FX): the Heat Check, the Presti perks and 82-0, printed in ink ----------
   The owner (2026-09-30): "Make sure all animations use the riso engine"; the Hot Hand sequence remade "in several
   different ways too, inc. emoji animations"; the REFUND and FIRE SALE pop-ups remade; and 82-0 has to feel "so much
   better than 81-1". Those moments play on the game's own screens (the Heat Check overlay, the Presti ticket, the
   results), not on the reel's card, so they print on ONE shared layer: a fixed full-viewport canvas over every game
   overlay, made when an effect starts and taken off the page when the last one ends. No layer, no animation frame and
   no cost while nothing plays.

   It prints with the reel's own halftone pipeline and theme inks (T82RISO.kit: one copy of the screening code, never
   a second), plus what these moments need: riso emoji (K.emoji: an emoji's colors split into two or three inks and
   screened like any plate, so an emoji animation is never a raw emoji glyph), sprites that print those plates off
   register (K.sprite), sprays and rings drawn straight from their age (so a frame is the same frame every time), a
   shake for an element and a flash under the reel's photosensitivity limit. The layer blends onto the screen under
   it the way ink meets the stock (screen on the dark theme), so an effect prints over the game, it does not cover it.

   The looks are art variants (art/CONTRACT-FX.md): files in art/hot, art/perk and art/goat register with T82ART.add.
   The game says which look a draft dealt (use), runs its costly printing in idle time once the file has arrived
   (prime) and plays one beat at an element (play). Each kind has a built-in, classic: today's emoji sprays printed in
   riso, so even the fallback is ink. A variant that throws is off for the session and classic plays its moment;
   without reel-riso.js or a canvas, play returns 0 and app.js runs the old emoji effects exactly as before.

   T82FX.use(kind, id)                    the look the draft dealt for a kind (null: classic)
   T82FX.prime(kind, id)                  its prep, one job per idle moment (call it once its file has loaded)
   T82FX.play(kind, slot, el, opts)       plays the slot at el's rect; returns its duration in ms (0: not played)
       opts: id (this look, not the dealt one), seed, label, big (82-0 / SUPERNOVA scale), rect ({x, y, w, h}
       instead of el's), box (the element K.shake should move; default el's card)
       a slot's draw(K, ev, e) gets ev = { x, y, w, h, cx, cy (el's rect and center, viewport css px), W, H (the
       viewport), area ({x, y, w, h}: el's card, the room a celebration may fill), seed, label, big, el, box, and on
       every Heat Check beat m and ladder: the game's own multipliers, opts.m and opts.ladder }; an optional hit(K, ev)
       runs once as the beat starts
   T82FX.stop()                           ends everything, takes the layer off and frees every printed plate
   T82FX.end(kind)                        ends that kind's beats now (its screen went) and keeps every look's prep
   T82FX.ready(kind, id)                  whether that look's prep is all printed (default classic)
   T82FX.qa                               the bench's hooks (docs/art-lab/qa.html, tools/art-qa.mjs)
   The kit K a pack draws with: the reel's shared half (K.inks with hot, good and you added, K.pat, K.plate, K.screen,
   K.levels, K.tone, K.rgb, K.reg, K.tile, K.text, K.font, K.rand, K.ease, K.fade, K.blend...) on K.g, the layer in
   viewport css px, plus K.emoji(char, px, inks, { sat }) and K.emojiJobs([[name, char, px, inks, { sat }], ...]) (prep:
   the same, one stage per job, into K.st), K.sprite(g, em, x, y, scale or [sx, sy], rot, alpha), K.dots(g, ink, cov,
   [x, y, r, ...]), K.ring(o), K.spark(o) (both drawn from their age), K.shake(el, dur, amp), K.flash(strength, ink),
   K.st (the pack's prep) and K.e (the beat's seconds). On a phone's software path an upright sprite at scale 1 is a
   straight copy, a third of the cost of a turned or scaled one: hold pieces upright once they have landed.
   ES5 like the engines; no colors of its own (black is only ever a coverage mask). */
(function () {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined") return;

  var TAU = Math.PI * 2;
  var SLOTS = { hot: ["cold", "warm", "hot", "fire", "nova", "save", "miss"], perk: ["refund", "sale"], goat: ["burst"] };
  // Over the Heat Check (90; mid-season 250), the reel (240) and the old emoji spray layer (200); under the sheets and
  // toasts (900 and up), which are the page talking, not the game.
  var Z = 300;
  var FLASH_MAX = 0.72, FLASH_DUR = 0.26;          // the reel's: never stronger than the first loss's flash
  var EMOJI_FACE = "\"Apple Color Emoji\",\"Segoe UI Emoji\",\"Noto Color Emoji\",sans-serif";
  // The once-a-page warm-ups, each in an idle moment of its own: the emoji face and a first separation only ahead of a
  // look whose prep prints riso emoji (K.emojiJobs), the theme's faces ahead of a dealt look's jobs (art/CONTRACT-FX.md)
  var WARM = [["emoji", 0], ["separation", 0], ["mono", 700], ["disp", 800], ["disp", 700], ["mono", 500]];

  var CV = null, G = null, W = 0, H = 0, D = 1;   // the layer, its context, its size in css px, device px per css px
  var BASE = null;                                 // the shared kit: T82RISO.kit plus the FX parts
  var PACKS = {}, DEAD = {}, DEALT = {}, EMO = {}, SOLVE = {}, WARNED = {};
  var FX = [], raf = 0, cur = null, seq = 0, listedIn = null;
  var QUEUE = [], idleOn = false, WARMED = {};      // WARMED: which of WARM have run on this page
  var FLASH = { t: -1e9, s: 0, ink: "light", last: -1e9 };
  var QA = { clock: null, manual: false };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function dpr() { return Math.min(2, Math.max(1, window.devicePixelRatio || 1)); }
  function now() { return QA.clock ? +QA.clock() : (window.performance && performance.now ? performance.now() : Date.now()) / 1000; }
  function cv(w, h) { var c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function warn(key, msg, err) {
    if (WARNED[key]) return;
    WARNED[key] = 1;
    try { if (typeof console !== "undefined" && console.warn) console.warn("[t82] " + msg, err == null ? "" : err); } catch (e) { /* cosmetic */ }
  }
  function isCanvas(o) { return typeof HTMLCanvasElement !== "undefined" && o instanceof HTMLCanvasElement; }
  function eachCanvas(o, fn, depth, seen) {        // every canvas a pack's state holds (freeing, the memory budget)
    if (!o || typeof o !== "object" || depth > 6 || seen.indexOf(o) >= 0) return;
    seen.push(o);
    if (isCanvas(o)) { fn(o); return; }
    if (o.nodeType || (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(o))) return;
    if (Array.isArray(o)) { for (var i = 0; i < o.length; i++) eachCanvas(o[i], fn, depth + 1, seen); return; }
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) eachCanvas(o[k], fn, depth + 1, seen);
  }
  // keep: canvases that are not one look's to free (shared())
  function freeCanvases(st, keep) { eachCanvas(st, function (c) { if (!keep || keep.indexOf(c) < 0) { c.width = 0; c.height = 0; } }, 0, []); }
  // The canvases every look shares: the riso emoji sheets (EMO is one cache, so two looks that print the same emoji at
  // the same size and inks hold the very same sheet: classic's 24 px flame is emojifire's) and the kit's screen tiles
  // (the reel's own cache). A look that throws must never blank them, or classic, the look that carries its moment on,
  // and every other look holding them would print nothing for the rest of the session. stop() frees the sheets itself.
  var TILED = [];
  function shared() {
    var keep = TILED.slice(), k;
    for (k in EMO) if (EMO.hasOwnProperty(k)) { keep.push(EMO[k].print); (EMO[k].plates || []).forEach(function (c) { keep.push(c); }); }
    return keep;
  }
  function canvasBytes(st) { var n = 0; eachCanvas(st, function (c) { n += c.width * c.height * 4; }, 0, []); return n; }

  /* ---- the layer: one canvas for the session, on the page only while something prints ---- */
  function size() {
    var de = document.documentElement, w = Math.max(1, Math.round(window.innerWidth || de.clientWidth || 375)),
      h = Math.max(1, Math.round(window.innerHeight || de.clientHeight || 667)), d = dpr();
    if (w === W && h === H && d === D && CV.width) return;
    W = w; H = h; D = d;
    CV.width = Math.round(w * d); CV.height = Math.round(h * d);
    CV.style.width = w + "px"; CV.style.height = h + "px";
  }
  function attach() {
    if (!CV.parentNode && document.body) document.body.appendChild(CV);
    size();
  }
  function park() {                                // nothing plays: off the page, and its pixels handed back
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (!CV) return;
    if (CV.parentNode) CV.parentNode.removeChild(CV);
    CV.width = 0; CV.height = 0; W = 0; H = 0;
  }

  /* ---- the kit: the reel's shared half (inks, screen, motion, type) with the layer as its canvas, plus the FX parts ---- */
  function kit() {
    if (BASE) return BASE;
    if (!window.T82RISO || typeof window.T82RISO.kit !== "function") return null;
    if (!CV) {
      CV = document.createElement("canvas");
      CV.width = 0; CV.height = 0;
      CV.className = "riso-fx-layer";
      CV.setAttribute("aria-hidden", "true");
      var s = CV.style;
      s.position = "fixed"; s.left = "0"; s.top = "0"; s.zIndex = String(Z); s.pointerEvents = "none"; s.display = "block";
      G = CV.getContext("2d");
      if (!G) { CV = null; return null; }
    }
    var K = window.T82RISO.kit(document.documentElement, G);
    CV.style.mixBlendMode = K.blend;               // the inks meet the screen under them as they meet the stock
    K.g = G; K.e = 0; K.st = null;
    var tile0 = K.tile;                            // the reel's cached tile: noted, so no stop or throw ever blanks it
    K.tile = function (ink, cov) { var t = tile0(ink, cov); if (t && TILED.indexOf(t) < 0) TILED.push(t); return t; };
    K.emoji = emoji; K.emojiJobs = emojiJobs; K.sprite = sprite; K.dots = dots; K.shake = shake; K.flash = flash; K.ring = ring; K.spark = spark;
    BASE = K;
    return K;
  }

  /* ---- riso emoji: an emoji's colors printed as two or three inks ----
     Drawn once offscreen at the device's pixels; every pixel's color is split into the inks that print it best on the
     stock (least squares over the inks' colors, each coverage held to 0..1, its alpha kept), and each ink's coverage
     is screened like any plate (the grain, the starve). Dark parts of the emoji print as bare stock, the way a dark
     prints on this stock; a color the inks cannot make prints as their nearest mix. Cached per (char, px, inks, sat). */
  var WCH = [0.36, 0.5, 0.14];                     // how much each channel's miss counts (the eye weighs green most)
  // One ink set's solver: every face of the coverage box (each ink free, off or full) with the matrix that solves the
  // free inks' least squares for any color. The matrix does not depend on the color, so it is worked out once per ink
  // set (a 3 x 3 at most); a color then costs a few multiplies per face.
  function solver(C) {
    var n = C.length, faces = [], c, j, x, i, k, q, ch;
    for (c = 0; c < Math.pow(3, n); c++) {
      var F = [], on = [0, 0, 0], st = [], m, A = [], ok = true, M = null;
      for (j = 0, x = c; j < n; j++, x = (x / 3) | 0) { st[j] = x % 3; if (st[j] === 0) F.push(j); else if (st[j] === 2) for (ch = 0; ch < 3; ch++) on[ch] += C[j][ch]; }
      m = F.length;
      for (i = 0; i < m; i++) {
        A.push([]);
        for (k = 0; k < m; k++) { var v = 0; for (ch = 0; ch < 3; ch++) v += WCH[ch] * C[F[i]][ch] * C[F[k]][ch]; A[i].push(v); }
        for (k = 0; k < m; k++) A[i].push(i === k ? 1 : 0);
      }
      for (i = 0; i < m && ok; i++) {              // Gauss-Jordan with partial pivoting: A's inverse
        var p = i;
        for (k = i + 1; k < m; k++) if (Math.abs(A[k][i]) > Math.abs(A[p][i])) p = k;
        if (Math.abs(A[p][i]) < 1e-9) { ok = false; break; }
        var tmp = A[i]; A[i] = A[p]; A[p] = tmp;
        var dv = A[i][i];
        for (k = 0; k < 2 * m; k++) A[i][k] /= dv;
        for (k = 0; k < m; k++) if (k !== i) { var f = A[k][i]; for (q = 0; q < 2 * m; q++) A[k][q] -= f * A[i][q]; }
      }
      if (!ok) continue;
      if (m) {
        M = [];
        for (i = 0; i < m; i++) { M.push([0, 0, 0]); for (ch = 0; ch < 3; ch++) { var sm = 0; for (k = 0; k < m; k++) sm += A[i][m + k] * C[F[k]][ch]; M[i][ch] = sm * WCH[ch]; } }
      }
      faces.push({ st: st, F: F, on: on, M: M });
    }
    return faces;
  }
  function coverOf(S, C, q, sat) {                 // q: the color quantised to 16 levels a channel
    var n = C.length, t = [((q >> 8) * 17) / 255, (((q >> 4) & 15) * 17) / 255, ((q & 15) * 17) / 255];
    if (sat !== 1) {                               // pushed away from its grey: a pale emoji color lands in an ink, not in white
      var y = 0.2126 * t[0] + 0.7152 * t[1] + 0.0722 * t[2];
      t = t.map(function (v) { return clamp(y + (v - y) * sat, 0, 1); });
    }
    var best = null, bestE = Infinity, kk = [0, 0, 0], fi, i, j, ch;
    for (fi = 0; fi < S.length; fi++) {
      var f = S[fi], r0 = t[0] - f.on[0], r1 = t[1] - f.on[1], r2 = t[2] - f.on[2], ok = true, e = 0;
      for (j = 0; j < n; j++) kk[j] = f.st[j] === 2 ? 1 : 0;
      for (i = 0; i < f.F.length; i++) {
        var v = f.M[i][0] * r0 + f.M[i][1] * r1 + f.M[i][2] * r2;
        if (v < -1e-6 || v > 1 + 1e-6) { ok = false; break; }
        kk[f.F[i]] = v;
      }
      if (!ok) continue;
      for (ch = 0; ch < 3; ch++) { var pr = -t[ch]; for (j = 0; j < n; j++) pr += kk[j] * C[j][ch]; e += WCH[ch] * pr * pr; }
      if (e < bestE - 1e-12) { bestE = e; best = kk.slice(0, n); }
    }
    // a little press on the drum: solids land at 0.92 to 0.96 (the screen's held solid, with its grain and starve),
    // mid-tones keep their dots, a whisper of an ink drops out instead of printing as dust
    return (best || [0, 0, 0].slice(0, n)).map(function (v) { return v < 0.07 ? 0 : clamp(Math.pow(clamp(v, 0, 1), 0.9) * 1.06, 0, 0.96); });
  }
  // A separation in stages (the glyph and its coverages; each ink screened; the sheet), so a prep job can take one
  // stage at a time and a big emoji's printing spreads over several idle moments. step() -> true while more remain.
  function separation(ch, px, inks, o) {
    var K = BASE, sat = o && +o.sat > 0 ? Math.round(clamp(+o.sat, 0.2, 4) * 100) / 100 : 1, keep = !!(o && o.plates);
    ch = String(ch || "");
    px = clamp(Math.round(+px || 32), 8, 240);
    inks = (Array.isArray(inks) && inks.length ? inks : ["light"]).slice(0, 3);
    inks.forEach(function (ink) { K.rgb(ink); }); // an unknown ink throws here (and turns the variant off)
    var key = ch + "|" + px + "|" + inks.join("+") + "|" + sat + "|" + K.d + (keep ? "|p" : ""), b = { em: EMO.hasOwnProperty(key) ? EMO[key] : null, stage: 0 };
    var n = inks.length, pad = Math.ceil(px * 0.16), cs = px + pad * 2, P = null, N = 0, cov = [], plates = [], bx = [1e9, 1e9, -1, -1];
    var reg = inks.map(function (ink) { return K.reg(ink); });
    b.step = function () {
      if (b.em) return false;
      var i, j;
      if (b.stage === 0) {
        P = K.plate(cs, cs, hash(key)); N = P.W * P.H;
        var src = cv(P.W, P.H), sg = src.getContext("2d", { willReadFrequently: true });
        sg.setTransform(P.k, 0, 0, P.k, 0, 0);
        sg.font = px + "px " + EMOJI_FACE; sg.textAlign = "center"; sg.textBaseline = "alphabetic"; sg.fillStyle = "#000";
        var m = sg.measureText(ch), up = m.actualBoundingBoxAscent, dn = m.actualBoundingBoxDescent;
        sg.fillText(ch, cs / 2, isFinite(up) && isFinite(dn) && up + dn > 0 ? cs / 2 + (up - dn) / 2 : cs / 2 + px * 0.36);
        var d4 = sg.getImageData(0, 0, P.W, P.H).data, a, mono = true;
        src.width = 0; src.height = 0;
        for (i = 0; i < N && mono; i++) if (d4[i * 4 + 3] > 40 && d4[i * 4] + d4[i * 4 + 1] + d4[i * 4 + 2] > 120) mono = false;
        var C = inks.map(function (ink) { var c = K.rgb(ink); return [c[0] / 255, c[1] / 255, c[2] / 255]; });
        var mk = inks.join("+") + "|" + C.join(";") + "|" + sat, memo = SOLVE[mk] || (SOLVE[mk] = { S: solver(C) });
        for (j = 0; j < n; j++) cov.push(new Uint8Array(N));
        for (i = 0; i < N; i++) {
          a = d4[i * 4 + 3];
          if (a < 6) continue;
          var x = i % P.W, yy = (i / P.W) | 0;
          if (x < bx[0]) bx[0] = x; if (x > bx[2]) bx[2] = x; if (yy < bx[1]) bx[1] = yy; if (yy > bx[3]) bx[3] = yy;
          if (mono) { cov[0][i] = Math.round(a * 0.92); continue; }   // a phone with no color emoji: the glyph's shape in the first ink
          var q = ((d4[i * 4] >> 4) << 8) | ((d4[i * 4 + 1] >> 4) << 4) | (d4[i * 4 + 2] >> 4), s = memo[q];
          if (!s) s = memo[q] = coverOf(memo.S, C, q, sat);
          for (j = 0; j < n; j++) cov[j][i] = Math.round(s[j] * a);
        }
        b.stage = 1;
        return true;
      }
      if (b.stage <= n) {
        var c0 = cov[b.stage - 1];
        plates.push(K.screen(P, inks[b.stage - 1], function (g) {
          var im = g.createImageData(P.W, P.H), d = im.data;
          for (var ii = 0; ii < N; ii++) d[ii * 4 + 3] = c0[ii];
          g.putImageData(im, 0, 0);
        }));
        b.stage++;
        return true;
      }
      // The plates printed once onto one sheet at their inks' registration offsets (the miss a drum makes, fixed for
      // the moment), trimmed to the ink: a sprite is one copy of a small sheet, not three plates and their bare margins.
      // The screen blend is associative, so the sheet blended onto the layer prints what the three plates would.
      if (bx[2] < bx[0]) { bx = [0, 0, 0, 0]; }
      var off = reg.map(function (r) { return [Math.round(r[0] * P.k), Math.round(r[1] * P.k)]; }), lo = [0, 0], hi = [0, 0];
      off.forEach(function (r) { lo[0] = Math.min(lo[0], r[0]); lo[1] = Math.min(lo[1], r[1]); hi[0] = Math.max(hi[0], r[0]); hi[1] = Math.max(hi[1], r[1]); });
      var X0 = bx[0] + lo[0], Y0 = bx[1] + lo[1], tw = bx[2] - bx[0] + 1 + hi[0] - lo[0], th = bx[3] - bx[1] + 1 + hi[1] - lo[1], sheet = cv(tw, th), shg = sheet.getContext("2d");
      shg.globalCompositeOperation = K.blend;
      plates.forEach(function (pl, jj) { shg.drawImage(pl, off[jj][0] - X0, off[jj][1] - Y0); });
      if (!keep) plates.forEach(function (pl) { pl.width = 0; pl.height = 0; });
      b.em = EMO[key] = { ch: ch, px: px, inks: inks.slice(), w: tw / P.k, h: th / P.k, ox: (X0 + tw / 2) / P.k - cs / 2, oy: (Y0 + th / 2) / P.k - cs / 2,
        print: sheet, plates: keep ? plates : null, reg: reg, bytes: tw * th * 4 + (keep ? n * N * 4 : 0) };
      cov = null; P = null;
      return false;
    };
    return b;
  }
  function emoji(ch, px, inks, o) { var b = separation(ch, px, inks, o); while (b.step()) { /* every stage, now */ } return b.em; }
  // Prep's way to print riso emoji: jobs that print each [name, char, px, inks, opts] of the list into st (default the
  // pack's K.st) one stage per job. return K.emojiJobs([["flame", "\uD83D\uDD25", 64, ["hot", "dusk", "loss"]]]);
  function emoJob(fn) { fn.emo = 1; return fn; }  // marks a separation stage: the emoji warm-ups run before the first
  function emojiJobs(list, st) {
    var jobs = [];
    st = st || (this && this.st) || {};
    (Array.isArray(list) ? list : []).forEach(function (it) {
      var b = null, n = Math.min(3, Array.isArray(it[3]) && it[3].length ? it[3].length : 1) + 2;
      for (var k = 0; k < n; k++) jobs.push(emoJob(function () {
        if (st[it[0]]) return;
        if (!b) b = separation(it[1], it[2], it[3], it[4]);
        if (!b.step()) st[it[0]] = b.em;
      }));
    });
    return jobs;
  }
  // A riso emoji printed at (x, y), its center, in css px: one sheet of its plates, each at its ink's own registration
  // offset (fixed for the moment, so the fringe reads as a drum's miss). Any { plates, reg, w, h } of screened plates
  // prints too, plate by plate. Hold scale between 0.7 and 1.1 (art/CRAFT.md: below, the dots smear into a tint;
  // above, they go soft); a pop through smaller scales is fine inside 0.15 s. s may be [sx, sy]: a squash on impact,
  // a stretch in flight.
  function sprite(g, em, x, y, s, rot, a) {
    if (!em || !(em.print || em.plates)) return;
    if (em.print && !em.print.width) return;       // a sheet already let go (a stop mid-frame): nothing to print, never a throw
    g = g || G;
    var sx = s == null ? 1 : Array.isArray(s) ? +s[0] : +s, sy = s == null ? 1 : Array.isArray(s) ? +s[1] : +s;
    a = a == null ? 1 : clamp(+a, 0, 1); rot = +rot || 0;
    if (!(sx > 0.02) || !(sy > 0.02) || a < 0.004) return;
    if (Math.abs(rot) < 0.02 && Math.abs(sx - 1) < 0.02 && Math.abs(sy - 1) < 0.02) { rot = 0; sx = 1; sy = 1; }   // too small to see: a straight copy
    var w = em.w, h = em.h, list = em.print ? [em.print] : em.plates, i, r, m = null, ox = em.ox || 0, oy = em.oy || 0;
    g.save();
    g.globalCompositeOperation = BASE.blend; g.globalAlpha *= a;
    g.imageSmoothingEnabled = false;               // crisp dots, and a phone's software path draws them at a third the cost
    if (!rot && sx === 1 && sy === 1 && g.getTransform) { m = g.getTransform(); if (m.b || m.c || Math.abs(m.a - m.d) > 1e-6) m = null; }
    for (i = 0; i < list.length; i++) {
      r = em.print ? [0, 0] : em.reg && em.reg[i] || [0, 0];
      if (!list[i] || !list[i].width) continue;
      g.save();
      if (m) {                                     // upright and unscaled: a straight copy onto the device pixels
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.drawImage(list[i], Math.round(m.a * (x + r[0] + ox - w / 2) + m.e), Math.round(m.d * (y + r[1] + oy - h / 2) + m.f), Math.round(w * m.a), Math.round(h * m.d));
      } else {
        g.translate(x + r[0], y + r[1]);
        if (rot) g.rotate(rot);
        if (sx !== 1 || sy !== 1) g.scale(sx, sy);
        g.drawImage(list[i], ox - w / 2, oy - h / 2, w, h);
      }
      g.restore();
    }
    g.restore();
  }

  /* ---- one-shots: they fire once per effect however many frames call them (a draw runs every frame) ---- */
  // An element jolts and settles: a Web Animation (the compositor's, no frames of ours). amp at most 16 px.
  function shake(el, dur, amp) {
    if (!el || typeof el.animate !== "function") return false;
    if (cur) { if (cur.shook.indexOf(el) >= 0) return false; cur.shook.push(el); }
    dur = clamp(+dur || 0.42, 0.1, 2); amp = clamp(+amp || 0, 0, 16);
    var k = [], n = 9, i;
    for (i = 0; i < n; i++) {
      var f = i / n, dec = Math.pow(1 - f, 1.3), sgn = i % 2 ? -1 : 1;
      k.push({ transform: "translate(" + (sgn * amp * dec * (0.7 + 0.3 * ((i * 37) % 10) / 10)).toFixed(1) + "px," + ((i % 3 ? -1 : 1) * amp * 0.5 * dec).toFixed(1) +
        "px) rotate(" + (sgn * 0.8 * dec).toFixed(2) + "deg)", offset: f });
    }
    k.push({ transform: "translate(0px,0px) rotate(0deg)", offset: 1 });
    try { el.animate(k, { duration: dur * 1000, easing: "linear" }); } catch (e) { return false; }
    return true;
  }
  // The whole screen lights in one ink's dots and drops back in 0.26 s: never stronger than the reel's first-loss flash
  // (0.72), never closer than the reel's gap to the last one (the photosensitivity line), once per effect. -> fired
  function flash(s, ink) {
    if (cur && cur.flashed) return false;
    var t = now(), gap = window.T82RISO && window.T82RISO.flashGap || 0.77;
    if (t - FLASH.last < gap) return false;
    ink = ink || "light";
    BASE.rgb(ink);
    // the reel's loss flash lights the same screen (a mid-season save, then the resumed reel): the gap holds across the
    // two engines on one shared clock (T82RISO.flashClaim; an older reel-riso.js without it: this layer's own gap only)
    var R = window.T82RISO;
    if (R && typeof R.flashClaim === "function" && !R.flashClaim("fx")) return false;
    FLASH.last = t; FLASH.t = t; FLASH.s = clamp(+s || 0, 0, FLASH_MAX); FLASH.ink = ink;
    if (cur) cur.flashed = true;
    return true;
  }
  // Printed as the page's own background of the ink's screen tile (K.tile), in four coverage steps, not as a canvas
  // fill: a whole screen of canvas every frame for a quarter second is the costliest thing this layer could draw.
  var FL = null, FLKEY = "", TILES = {};
  function drawFlash(t) {
    var p = (t - FLASH.t) / FLASH_DUR;
    if (p < 0 || p >= 1 || FLASH.s <= 0) { unflash(); return; }
    var c = FLASH.s * [1, 0.62, 0.34, 0.14][Math.min(3, Math.floor(p * 4))], key = FLASH.ink + "#" + Math.round(c * 16), url = TILES[key];
    if (key === FLKEY) return;
    if (!url) { var tl = BASE.tile(FLASH.ink, c); url = TILES[key] = { u: "url(" + tl.toDataURL("image/png") + ")", s: tl.width / D }; }
    if (!FL) {
      FL = document.createElement("div");
      FL.setAttribute("aria-hidden", "true");
      FL.style.cssText = "position:fixed;left:0;top:0;right:0;bottom:0;pointer-events:none;background-repeat:repeat;background-position:0 0;z-index:" + (Z - 1);
    }
    FL.style.mixBlendMode = BASE.blend;
    FL.style.backgroundImage = url.u; FL.style.backgroundSize = url.s + "px " + url.s + "px";
    if (!FL.parentNode && document.body) document.body.appendChild(FL);
    FLKEY = key;
  }
  function unflash() { if (FL && FL.parentNode) FL.parentNode.removeChild(FL); FLKEY = ""; }

  /* ---- small round marks: printed from a cached stamp per (ink, coverage, radius) instead of filled as paths ----
     On a phone's software path a copied stamp costs about a third of a filled circle, and a shell or a spray prints
     hundreds a frame. list: x, y, r triples in css px; a mark over 24 device px, or under a turned transform, is
     filled as a circle (all of those in one path). */
  var STAMPS = {};
  function stamp(ink, cov, rd) {
    var key = ink + "#" + Math.round(clamp(cov, 0, 1) * 16) + "@" + rd, c = STAMPS[key];
    if (c) return c;
    var n = Math.ceil(rd * 2) + 2, x;
    c = cv(n, n); x = c.getContext("2d");
    x.fillStyle = BASE.pat(ink, cov, x); x.beginPath(); x.arc(n / 2, n / 2, rd, 0, TAU); x.fill();
    STAMPS[key] = c;
    return c;
  }
  function dots(g, ink, cov, list) {
    g = g || G;
    if (!list || !list.length) return;
    BASE.rgb(ink);
    var m = g.getTransform ? g.getTransform() : null, k = m && !m.b && !m.c && Math.abs(m.a - m.d) < 1e-6 ? m.a : 0, big = [], i;
    g.save();
    g.globalCompositeOperation = BASE.blend;
    if (k) g.setTransform(1, 0, 0, 1, 0, 0);
    for (i = 0; i + 2 < list.length; i += 3) {
      var r = +list[i + 2], rd = Math.round(r * k * 2) / 2;
      if (!(r > 0.15)) continue;
      if (!k || rd > 24) { big.push(list[i], list[i + 1], r); continue; }
      var st = stamp(ink, cov, Math.max(0.5, rd));
      g.drawImage(st, Math.round(m.a * list[i] + m.e - st.width / 2), Math.round(m.d * list[i + 1] + m.f - st.height / 2));
    }
    if (big.length) {
      if (k) g.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
      g.fillStyle = BASE.pat(ink, cov, g); g.beginPath();
      for (i = 0; i < big.length; i += 3) { g.moveTo(big[i] + big[i + 2], big[i + 1]); g.arc(big[i], big[i + 1], big[i + 2], 0, TAU); }
      g.fill();
    }
    g.restore();
  }

  /* ---- rings and sprays, drawn from their age (no state between frames: the same e is the same frame) ----
     Both take the reel's options (art/CONTRACT.md, the kit) plus e (seconds since it started; default: the effect's
     own e less o.delay) and g (default the layer). A spray also takes dir and cone (radians: a fan instead of all
     round) and needs a seed, never a running rnd. */
  function ring(o) {
    o = o || {};
    var e = (o.e != null ? +o.e : cur ? cur.e : 0) - (+o.delay || 0), dur = o.dur > 0 ? +o.dur : 0.4;
    if (e < 0 || e > dur) return;
    var p = e / dur, r0 = o.r0 == null ? 6 : +o.r0, r1 = o.r1 == null ? 80 : +o.r1, w0 = o.w0 == null ? 6 : +o.w0, g = o.g || G;
    var cov = (o.cov == null ? 0.9 : +o.cov) * (1 - p * 0.8);
    g.save();
    g.globalCompositeOperation = BASE.blend;
    g.strokeStyle = BASE.pat(o.ink || "hot", cov, g); g.lineWidth = w0 * (1 - p) + 1;
    g.beginPath(); g.arc(+o.x || 0, +o.y || 0, Math.max(0.5, r0 + (r1 - r0) * BASE.ease.out(p)), 0, TAU); g.stroke();
    g.restore();
  }
  function spark(o) {
    o = o || {};
    var age = (o.e != null ? +o.e : cur ? cur.e : 0) - (+o.delay || 0);
    if (age < 0) return;
    var n = Math.min(80, Math.max(0, o.n | 0)), rnd = BASE.rand((o.seed >>> 0) || 7), ink = o.ink || "hot", g = o.g || G;
    var sp = o.sp || [60, 170], rr = o.r || [1.2, 2.4], life = o.life || [0.3, 0.2], grav = o.grav == null ? 300 : +o.grav;
    var x0 = +o.x || 0, y0 = +o.y || 0, cone = o.cone == null ? TAU : +o.cone, dir = +o.dir || 0, by = {}, keys = [], i;
    var drag = (1 - Math.exp(-1.2 * age)) / 1.2, slow = Math.exp(-1.2 * age);
    for (i = 0; i < n; i++) {                      // the reel's spray, in the reel's order of draws
      var a = cone >= TAU ? rnd() * TAU : dir + (rnd() - 0.5) * cone, s = sp[0] + rnd() * (sp[1] - sp[0]), k = rnd();
      var r = rr[0] + k * k * (rr[1] - rr[0]), lf = life[0] + rnd() * life[1], nm = typeof ink === "function" ? ink(rnd) : ink;
      if (age >= lf) continue;
      var vx = Math.cos(a) * s, vy = Math.sin(a) * s - grav * 0.1, q = 1 - age / lf;
      if (!by[nm]) { by[nm] = []; keys.push(nm); }
      by[nm].push(x0 + vx * drag, y0 + vy * age + grav * age * age / 2, r * (0.45 + 0.55 * q), vx * slow, vy + grav * age);
    }
    g.save();
    g.globalCompositeOperation = BASE.blend;
    keys.forEach(function (nm) {
      var L = by[nm], j;
      if (o.streak) {                              // ink in flight smears along its path
        g.strokeStyle = BASE.pat(nm, 0.95, g); g.lineCap = "round";
        for (j = 0; j < L.length; j += 5) { g.lineWidth = L[j + 2] * 1.5; g.beginPath(); g.moveTo(L[j] - L[j + 3] * 0.02, L[j + 1] - L[j + 4] * 0.02); g.lineTo(L[j], L[j + 1]); g.stroke(); }
      } else {
        var q3 = [];
        for (j = 0; j < L.length; j += 5) q3.push(L[j], L[j + 1], L[j + 2]);
        dots(g, nm, 0.95, q3);
      }
    });
    g.restore();
  }

  /* ---- the built-ins: classic, today's emoji sprays printed in riso ---- */
  var FIRE = "\uD83D\uDD25", GOAT = "\uD83D\uDC10", BALL = "\uD83C\uDFC0", CUP = "\uD83C\uDFC6", BILL = "\uD83D\uDCB5", DOWN = "\u2B07\uFE0F";
  var FIRE_INKS = ["hot", "dusk", "loss"];
  var FW = [[GOAT, ["light", "pop", "loss"]], [BALL, ["dusk", "hot", "key"], 1.2], [CUP, ["hot", "gold", "dusk"], 1.2]];
  // goatBurst in app.js, as ink: each piece flies out on a cubic ease, drops 52 px as it goes, turns, holds and fades
  // out over its last 30%. o: ems (riso emoji to pick from), n, x, y, up (an upward fan of width cone), dMin, dSpan,
  // fly (s), stagger (s), seed, s0 (the scale it pops from), sMin, sMax, calm (two in three fly upright at full size:
  // a straight copy, the cheap print, where nine bursts share the screen).
  function burst(K, e, o) {
    var r = K.rand(o.seed >>> 0), i;
    for (i = 0; i < o.n; i++) {
      var em = o.ems[(r() * o.ems.length) | 0], ang = o.up ? -Math.PI / 2 + (r() - 0.5) * (o.cone || 1.9) : r() * TAU;
      var dist = o.dMin + r() * o.dSpan, rot = (r() * 120 - 60) * Math.PI / 180, sc = o.sMin + r() * (o.sMax - o.sMin), dl = r() * (o.stagger || 0.07);
      var p = (e - dl) / o.fly;
      if (p <= 0 || p >= 1) continue;
      var k = 1 - Math.pow(1 - p, 3), a = p < 0.12 ? p / 0.12 : p > 0.7 ? (1 - p) / 0.3 : 1, still = o.calm && i % 3 && p > 0.15;
      K.sprite(K.g, em, o.x + Math.cos(ang) * dist * k, o.y + (Math.sin(ang) * dist + 52) * k, still ? 1 : sc * ((o.s0 || 0.55) + (1 - (o.s0 || 0.55)) * k), still ? 0 : rot * k, a);
    }
  }
  function fires(K) { return [K.st.f24, K.st.f32]; }
  function fwEms(K) { return K.st.fw; }
  function prepFw(K) {
    K.st.fw = [];
    return K.emojiJobs(FW.map(function (f, i) { return [i, f[0], 32, f[1], { sat: f[2] || 1 }]; }), K.st.fw);
  }
  var CLASSIC = {
    hot: {
      name: "Classic", builtin: true,
      by: "Today's Heat Check sprays printed in riso: a fizzle, a lift, a flame burst, the ON FIRE spray, five SUPERNOVA plumes, goat fireworks.",
      prep: function (K) {
        return K.emojiJobs([["f24", FIRE, 24, FIRE_INKS, { sat: 1.3 }], ["f32", FIRE, 32, FIRE_INKS, { sat: 1.3 }]]).concat(prepFw(K));
      },
      slots: {
        cold: { dur: 0.9, draw: function (K, ev) {
          K.ring({ x: ev.cx, y: ev.cy, r0: 8, r1: 64, w0: 5, ink: "pop", cov: 0.7, dur: 0.55 });
          K.spark({ x: ev.cx, y: ev.cy, n: 10, ink: "pop", sp: [40, 120], r: [1.2, 2.2], life: [0.45, 0.35], grav: 420, seed: ev.seed });
        } },
        warm: { dur: 0.9, draw: function (K, ev) {
          K.ring({ x: ev.cx, y: ev.cy, r0: 8, r1: 84, w0: 6, ink: "hot", cov: 0.8, dur: 0.5 });
          K.spark({ x: ev.cx, y: ev.cy, n: 16, ink: function (q) { return q() < 0.3 ? "dusk" : "hot"; }, sp: [80, 200], r: [1.3, 2.6], life: [0.45, 0.35], grav: -60, dir: -Math.PI / 2, cone: 2.4, seed: ev.seed });
        } },
        hot: { dur: 1.1, draw: function (K, ev, e) {
          K.ring({ x: ev.cx, y: ev.cy, r0: 10, r1: 110, w0: 8, ink: "hot", cov: 0.88, dur: 0.5 });
          K.ring({ x: ev.cx, y: ev.cy, r0: 6, r1: 140, w0: 5, ink: "dusk", cov: 0.6, dur: 0.6, delay: 0.06 });
          burst(K, e, { ems: fires(K), n: 10, x: ev.cx, y: ev.cy, dMin: 40, dSpan: 80, fly: 1.05, seed: ev.seed, sMin: 0.8, sMax: 1.05 });
        } },
        fire: { dur: 1.4, draw: function (K, ev, e) {
          K.ring({ x: ev.cx, y: ev.cy, r0: 10, r1: 150, w0: 9, ink: "hot", cov: 0.9, dur: 0.5 });
          burst(K, e, { ems: fires(K), n: 20, x: ev.cx, y: ev.cy, dMin: 60, dSpan: 130, fly: 1.35, seed: ev.seed, sMin: 0.8, sMax: 1.08 });
        } },
        nova: { dur: 2.6, draw: function (K, ev, e) {
          K.flash(0.45, "hot");
          K.shake(ev.box, 0.7, 9);
          K.ring({ x: ev.cx, y: ev.cy, r0: 12, r1: ev.W * 0.7, w0: 12, ink: "hot", cov: 0.92, dur: 0.7 });
          for (var i = 0; i < 5; i++) {
            burst(K, e, { ems: fires(K), n: 13, x: ev.W * (0.1 + 0.2 * i), y: ev.cy, up: true, cone: 0.6, dMin: 150, dSpan: 240, fly: 2.2, stagger: 0.3, seed: ev.seed + i * 977, sMin: 0.82, sMax: 1.1 });
          }
        } },
        save: { dur: 2.4, draw: function (K, ev, e) {
          var r = K.rand(ev.seed ^ 0x5a5a), i, A = ev.area;
          for (i = 0; i < 6; i++) {
            var bx = A.x + A.w * (0.2 + r() * 0.6), by = A.y + A.h * (0.18 + r() * 0.58);
            burst(K, e - i * 0.18, { ems: fwEms(K), n: 14, x: bx, y: by, dMin: 60, dSpan: 130, fly: 1.35, seed: ev.seed + i * 131, sMin: 0.7, sMax: 1.05, calm: true });
          }
        } },
        miss: { dur: 1.2, draw: function (K, ev) {
          K.ring({ x: ev.cx, y: ev.cy, r0: 8, r1: 70, w0: 5, ink: "key", cov: 0.75, dur: 0.6 });
          K.spark({ x: ev.cx, y: ev.cy, n: 12, ink: function (q) { return q() < 0.5 ? "pop" : "night"; }, sp: [30, 90], r: [1.3, 2.6], life: [0.7, 0.4], grav: 520, seed: ev.seed });
        } }
      }
    },
    perk: {
      name: "Classic", builtin: true,
      by: "Today's REFUND and FIRE SALE sprays printed in riso: dollar bills and down arrows out of the cost buttons.",
      prep: function (K) {
        return K.emojiJobs([["bill", BILL, 30, ["good", "pop"], { sat: 1.5 }], ["down", DOWN, 26, ["hot", "dusk"], { sat: 2 }]]);
      },
      slots: {
        refund: { dur: 1.6, draw: function (K, ev, e) {
          burst(K, e, { ems: [K.st.bill], n: 20, x: ev.cx, y: ev.cy, dMin: 60, dSpan: 130, fly: 1.35, seed: ev.seed, sMin: 0.8, sMax: 1.08 });
        } },
        sale: { dur: 1.6, draw: function (K, ev, e) {
          burst(K, e, { ems: [K.st.down], n: 20, x: ev.cx, y: ev.cy, dMin: 60, dSpan: 130, fly: 1.35, seed: ev.seed, sMin: 0.8, sMax: 1.08 });
        } }
      }
    },
    goat: {
      name: "Classic", builtin: true,
      by: "Today's 82-0 goat, ball and trophy fireworks printed in riso, one burst at a time.",
      prep: prepFw,
      slots: {
        burst: { dur: 1.5, draw: function (K, ev, e) {
          var r = K.rand(ev.seed ^ 0x9e37);
          burst(K, e, { ems: fwEms(K), n: 14, x: ev.x + ev.w * (0.2 + r() * 0.6), y: ev.y + ev.h * (0.18 + r() * 0.58), dMin: 60, dSpan: 130, fly: 1.35, seed: ev.seed, sMin: 0.75, sMax: 1.05, calm: true });
        } }
      }
    }
  };

  /* ---- the registry: the looks are T82ART's; the built-ins register like the reel's do ---- */
  function builtins() {
    var A = window.T82ART;
    if (!A || A === listedIn || typeof A.add !== "function") return;
    listedIn = A;
    try {
      var kinds = A.KINDS || [];
      for (var k in CLASSIC) if (kinds.indexOf(k) >= 0 && (typeof A.get !== "function" || A.get(k, "classic") !== CLASSIC[k])) A.add(k, "classic", CLASSIC[k]);
    } catch (e) { /* the registry is the lab's convenience: the layer runs without it */ }
  }
  function artGet(kind, id) {
    var A = window.T82ART;
    if (!A || typeof A.get !== "function") return null;
    try { return A.get(kind, id); } catch (e) { return null; }
  }
  function packOf(kind, id) {
    var key = kind + ":" + id;
    if (PACKS.hasOwnProperty(key)) return PACKS[key];
    if (DEAD[key]) return null;
    var def = id === "classic" ? CLASSIC[kind] : artGet(kind, id);
    if (!def || typeof def !== "object" || !def.slots || typeof def.slots !== "object") return null;
    var K = Object.create(BASE);
    K.st = {}; K.kind = kind; K.id = id;
    PACKS[key] = { kind: kind, id: id, def: def, K: K, jobs: null, ji: 0, dead: false, builtin: def === CLASSIC[kind] };
    return PACKS[key];
  }
  function kill(pk, err) {
    if (pk.builtin) { pk.jobs = []; pk.ji = 0; warn("fx:" + pk.kind, "riso-fx: the built-in " + pk.kind + " threw:", err); return; }
    DEAD[pk.kind + ":" + pk.id] = true;
    pk.dead = true;
    freeCanvases(pk.K.st, shared());               // its own plates go; the sheets and tiles other looks share stay
    pk.K.st = {};
    delete PACKS[pk.kind + ":" + pk.id];
    warn("art:" + pk.kind + ":" + pk.id, "art " + pk.kind + ":" + pk.id + " is off for this session (classic plays instead):", err);
  }

  /* ---- prep: a pack's jobs, one per idle moment. In the idle pass the prep body (it lists the jobs) runs in a moment
     of its own, so the warm-ups can follow what the jobs print; a play that has to print now runs it with the first.
     A look with no prep has nothing to prime: it never joins the queue, and it is ready from the start. ---- */
  function pendingOf(pk) { return pk.dead ? 0 : !pk.jobs ? (typeof pk.def.prep === "function" ? 1 : 0) : pk.jobs.length - pk.ji; }
  function listJobs(pk) {
    try { var js = typeof pk.def.prep === "function" ? pk.def.prep(pk.K) : []; pk.jobs = Array.isArray(js) ? js : []; }
    catch (err) { kill(pk, err); }
  }
  function stepPack(pk) {
    if (pendingOf(pk) <= 0) return false;
    if (!pk.jobs) { listJobs(pk); if (pk.dead) return true; }
    try { if (pk.ji < pk.jobs.length) { var f = pk.jobs[pk.ji++]; if (typeof f === "function") f(); } }
    catch (err) { kill(pk, err); }
    return true;
  }
  // the next warm-up this pack wants before its first job, or -1: the emoji pair only ahead of emoji stages; the faces
  // only ahead of a dealt look (classic sets no type of its own)
  function warmFor(pk) {
    var emo = (pk.jobs || []).some(function (j) { return j && j.emo; });
    for (var i = 0; i < WARM.length; i++) if (!WARMED[i] && (i < 2 ? emo : !pk.builtin)) return i;
    return -1;
  }
  // what the idle pass did not reach runs now (prime avoids this: the moment should never pay for printing)
  function flush(pk) { for (var n = 0; pendingOf(pk) > 0 && n < 4000; n++) stepPack(pk); }
  function idleStep() {                            // one face warm-up ("warm") or one job (true); false when nothing is pending
    QUEUE = QUEUE.filter(function (p) { return !p.dead && pendingOf(p) > 0 && PACKS[p.kind + ":" + p.id] === p; });
    if (!QUEUE.length) return false;
    var pk = QUEUE[0], wi;
    if (!pk.jobs) { listJobs(pk); return true; }     // the prep body alone: it says what the jobs will print
    if (pk.ji === 0 && (wi = warmFor(pk)) >= 0) {   // a face's first canvas text costs up to ~60 ms: not inside a job
      var f = WARM[wi];
      WARMED[wi] = true;
      if (f[0] === "emoji") {                      // the emoji face's first glyph (the font loads), on a scrap canvas
        var c = cv(48, 48), x = c.getContext("2d");
        x.font = "40px " + EMOJI_FACE; x.fillText("\uD83D\uDD25", 0, 40); x.getImageData(0, 0, 1, 1); c.width = 0;
      } else if (f[0] === "separation") emoji("\uD83D\uDD25", 16, ["hot", "dusk"]);   // the separation's first run, tiny
      else { G.font = BASE.font(f[1], 40, f[0]); G.measureText("82"); }
      return "warm";
    }
    return stepPack(pk);
  }
  function idle(fn) { if (typeof requestIdleCallback === "function") requestIdleCallback(fn, { timeout: 200 }); else setTimeout(fn, 16); }
  function kick() {
    if (QA.manual || idleOn) return;
    idleOn = true;
    idle(function next() {
      var more = false;
      try { more = BASE && idleStep(); } catch (e) { more = false; }
      if (more && !QA.manual) idle(next); else idleOn = false;
    });
  }

  /* ---- the effects ---- */
  function evOf(el, o, kind, slot) {
    var r = o.rect || (el && el.getBoundingClientRect ? el.getBoundingClientRect() : null), x, y, w, h;
    if (r && ((+r.width || +r.w) || (+r.height || +r.h))) {
      x = r.left != null ? +r.left : +r.x || 0; y = r.top != null ? +r.top : +r.y || 0;
      w = r.width != null ? +r.width : +r.w || 0; h = r.height != null ? +r.height : +r.h || 0;
    } else { w = 0; h = 0; x = W / 2; y = H / 2; }
    var box = o.box || (el && el.closest ? el.closest(".hh-card, .reel-card, .board, .ticket, .ticket-actions") : null) || el || null;
    // area: the card the anchor sits in (the Heat Check's card around its verdict stamp, the results' board): the room
    // a celebration may fill, while x, y, w, h stay the element the beat answers
    var ar = box && box !== el && box.getBoundingClientRect ? box.getBoundingClientRect() : null;
    var area = ar && ar.width > w && ar.height > h ? { x: ar.left, y: ar.top, w: ar.width, h: ar.height } : { x: x, y: y, w: w, h: h };
    return { x: x, y: y, w: w, h: h, cx: x + w / 2, cy: y + h / 2, W: W, H: H, area: area,
      seed: o.seed != null ? (+o.seed >>> 0) : hash(kind + "/" + slot + "/" + (++seq)),
      label: o.label != null ? String(o.label) : el ? String(el.textContent || "").replace(/\s+/g, " ").trim() : "",
      big: !!o.big, el: el || null, box: box, m: num(o.m), ladder: ladderOf(o.ladder) };
  }
  // The Heat Check's numbers as the game has them (app.js reads HH_SEGMENTS; the owner retunes the ladder, so a pack
  // prints these, never its own): ev.m, the tier's multiplier, and ev.ladder, every tier's { label, m } in wheel order.
  // null when the caller gave none (a pack falls back to its own copy then).
  function num(v) { return typeof v === "number" && isFinite(v) ? v : null; }
  function ladderOf(l) {
    if (!Array.isArray(l)) return null;
    var out = [];
    for (var i = 0; i < l.length; i++) { var r = l[i]; if (!r || num(r.m) === null) return null; out.push({ label: String(r.label == null ? "" : r.label), m: r.m }); }
    return out.length ? out : null;
  }
  function durOf(sd) { return typeof sd.dur === "number" && sd.dur > 0 ? clamp(sd.dur, 0.1, 8) : 1; }
  function playable(kind, id, slot) {
    var pk = packOf(kind, id);
    if (!pk) return null;
    flush(pk);
    if (pk.dead) return null;
    var sd = pk.def.slots[slot];
    return sd && typeof sd.draw === "function" ? pk : null;
  }
  // a look that threw: the moment carries on in classic, from where it was
  function fallBack(fx) {
    var b = playable(fx.kind, "classic", fx.name);
    if (!b || b === fx.pk) { fx.dur = 0; return false; }
    fx.pk = b; fx.slot = b.def.slots[fx.name]; fx.id = "classic"; fx.dur = Math.max(durOf(fx.slot), fx.e + 0.05);
    return true;
  }
  function drawOne(fx, t, depth) {
    var e = t - fx.t0;
    if (e < 0 || e >= fx.dur) return;
    if (fx.pk.dead && !fallBack(fx)) return;
    fx.e = e; cur = fx; fx.pk.K.e = e;
    G.save();
    try { fx.slot.draw(fx.pk.K, fx.ev, e); G.restore(); cur = null; }
    catch (err) {
      cur = null;
      if (typeof G.reset === "function") G.reset(); else CV.width = CV.width;   // whatever state it left: a clean context
      G.setTransform(D, 0, 0, D, 0, 0);
      kill(fx.pk, err);
      if (!depth && fallBack(fx)) drawOne(fx, t, 1);
    }
  }
  function frame() {
    var t = now(), i, live = [];
    for (i = 0; i < FX.length; i++) if (t - FX[i].t0 < FX[i].dur) live.push(FX[i]);
    FX = live;
    var flashing = t - FLASH.t < FLASH_DUR;
    if (!FX.length && !flashing) { unflash(); park(); return false; }
    attach();
    G.setTransform(1, 0, 0, 1, 0, 0); G.globalAlpha = 1; G.globalCompositeOperation = "source-over";
    G.clearRect(0, 0, CV.width, CV.height);
    G.setTransform(D, 0, 0, D, 0, 0);
    for (i = 0; i < FX.length; i++) drawOne(FX[i], t, 0);
    if (t - FLASH.t < FLASH_DUR) drawFlash(t); else unflash();   // a page layer under the canvas: a flash fired this frame shows now
    if (!QA.manual) raf = requestAnimationFrame(tick);
    return true;
  }
  function tick() { raf = 0; frame(); }
  function loop() { if (!QA.manual && !raf) raf = requestAnimationFrame(tick); }

  function play(kind, slot, el, opts) {
    try {
      opts = opts || {};
      if (!SLOTS.hasOwnProperty(kind) || SLOTS[kind].indexOf(slot) < 0 || !document.body || !kit()) return 0;
      builtins();
      var id = typeof opts.id === "string" && opts.id ? opts.id : DEALT[kind] || "classic";
      var pk = playable(kind, id, slot) || playable(kind, "classic", slot);
      if (!pk) return 0;
      attach();
      var sd = pk.def.slots[slot];
      var fx = { kind: kind, id: pk.id, name: slot, pk: pk, slot: sd, ev: evOf(el, opts, kind, slot), t0: now(), dur: durOf(sd), e: 0, shook: [], flashed: false };
      FX.push(fx);
      if (typeof sd.hit === "function") {          // optional: once, as the beat starts (one-shots are safe in draw too)
        cur = fx;
        try { sd.hit(pk.K, fx.ev); } catch (err) { kill(pk, err); fallBack(fx); }
        cur = null;
      }
      loop();
      return Math.round(fx.dur * 1000);
    } catch (err) {
      cur = null;
      warn("fx:play", "riso-fx: play(" + kind + ", " + slot + ") failed:", err);
      return 0;
    }
  }
  // The prep goes in the order a run's moments come, not the order their files happen to arrive: a perk can land in
  // the draft, the Heat Check comes in or after the season, the 82-0 fireworks at its end. Within a kind classic goes
  // first: it is a few small jobs, and it is what stands in (app.js fxLook) until the dealt look is all printed. A
  // look primed later but needed sooner goes ahead (between two jobs).
  var RANK = { perk: 0, hot: 1, goat: 2 };
  function rankOf(pk) { return RANK[pk.kind] * 2 + (pk.builtin ? 0 : 1); }
  function prime(kind, id) {
    try {
      if (!SLOTS.hasOwnProperty(kind) || !kit()) return false;
      builtins();
      var pk = packOf(kind, typeof id === "string" && id ? id : "classic");
      if (!pk || pk.dead) return false;
      if (QUEUE.indexOf(pk) < 0 && pendingOf(pk) > 0) {   // a look with no prep (or all printed) has nothing to prime
        var at = QUEUE.length;
        while (at > 0 && rankOf(QUEUE[at - 1]) > rankOf(pk)) at--;
        QUEUE.splice(at, 0, pk);
      }
      // a look that leaves a slot out plays classic for it: classic is printed too, so that moment never pays either
      if (!pk.builtin && SLOTS[kind].some(function (s) { var sd = pk.def.slots[s]; return !sd || typeof sd.draw !== "function"; })) prime(kind, "classic");
      kick();
      return true;
    } catch (err) { return false; }
  }
  // whether a look's prep is all printed, so a play now pays nothing (app.js lets a primed classic stand in for a dealt
  // look still printing: its file just arrived)
  function ready(kind, id) {
    if (!SLOTS.hasOwnProperty(kind) || !BASE) return false;
    var pk = PACKS[kind + ":" + (typeof id === "string" && id ? id : "classic")];
    return !!pk && !pk.dead && pendingOf(pk) === 0;
  }
  function use(kind, id) {
    if (!SLOTS.hasOwnProperty(kind)) return;
    if (typeof id === "string" && /^[a-z0-9-]+$/.test(id)) DEALT[kind] = id; else delete DEALT[kind];
  }
  // One kind's beats end now, every look's prep kept: the Heat Check's card goes (SEE YOUR TEAM, BACK TO THE SEASON)
  // while what comes next (the results' 82-0 volley, the resumed reel's shells) still needs its printed plates. The
  // layer comes off when nothing else plays.
  function end(kind) {
    if (!SLOTS.hasOwnProperty(kind)) return false;
    var n = FX.length;
    FX = FX.filter(function (fx) { return fx.kind !== kind; });
    if (!FX.length) { FLASH.t = -1e9; unflash(); park(); }
    return FX.length < n;
  }
  function stop() {
    FX = []; cur = null; QUEUE = [];
    FLASH.t = -1e9;
    unflash(); TILES = {}; STAMPS = {};
    park();
    Object.keys(PACKS).forEach(function (k) { freeCanvases(PACKS[k].K.st, TILED); });   // the reel's tiles are the reel's
    PACKS = {};
    Object.keys(EMO).forEach(function (k) { [EMO[k].print].concat(EMO[k].plates || []).forEach(function (c) { if (c) { c.width = 0; c.height = 0; } }); });
    EMO = {};
    BASE = null;                                   // the theme is read again at the next effect (a lab switches themes)
  }

  // QA (docs/art-lab/qa.html, tools/art-qa.mjs): the bench's clock, frames on demand, the prep one step at a time
  var qa = {
    setup: function (o) {
      o = o || {};
      QA.clock = typeof o.clock === "function" ? o.clock : null;
      QA.manual = !!o.manual;
      if (QA.manual && raf) { cancelAnimationFrame(raf); raf = 0; }
    },
    frame: function () { return BASE ? frame() : false; },
    runJob: function () { return kit() ? idleStep() : false; },
    layer: function () { return CV; },
    state: function () {
      var packs = {}, plates = 0, eb = 0, en = 0, pend = 0, k;
      for (k in PACKS) {
        var b = canvasBytes(PACKS[k].K.st);
        plates += b;
        packs[k] = { pending: pendingOf(PACKS[k]), bytes: b, builtin: PACKS[k].builtin };
      }
      for (k in EMO) { en++; eb += EMO[k].bytes; }
      QUEUE.forEach(function (p) { pend += pendingOf(p); });
      return { running: FX.map(function (fx) { return { kind: fx.kind, id: fx.id, slot: fx.name, e: fx.e, dur: fx.dur }; }),
        layer: !!(CV && CV.parentNode), loop: !!raf, layerBytes: CV ? CV.width * CV.height * 4 : 0, plateBytes: plates, emojiBytes: eb,
        emoji: en, canvasBytes: plates + eb, packs: packs, pending: pend, off: Object.keys(DEAD), dealt: JSON.parse(JSON.stringify(DEALT)) };
    }
  };

  builtins();
  window.T82FX = { play: play, prime: prime, ready: ready, use: use, stop: stop, end: end, slots: JSON.parse(JSON.stringify(SLOTS)), qa: qa, version: "v67" };
})();
