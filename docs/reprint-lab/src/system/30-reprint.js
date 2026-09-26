/* ---------- TRUE 82 LAB: reprint the season print and the reel ----------
   The site prints three things with its own riso engines (results-riso.js and reel-riso.js,
   loaded from the repo, never copied): THE SHAPE OF A SEASON on the results page (#rrPrint:
   img.rr-print-canvas under img.rr-print-names, the roster), the season reel's month strips
   (img.riso-strip) and its effects layer (img.riso-fx; the Heat Check sits on top of the reel).
   A snapshot freezes them as <img data-snap-canvas> in today's inks.

   Since v51 the engines read every ink, the stock and both faces from the theme tokens, and the
   page keeps what they printed from:
     #rrPrint[data-spec]            the print's recipe (JSON: record, games, seed, roster...)
     img.riso-strip[data-games]     a month's games ("1101..."), data-streaks, data-gi0, data-cl0
   so this hook reprints both with the real engines, reading the theme from the snapshot's own
   <html> (the look's tokens are already set there): T82PRINT.print(spec, { root }) and
   T82RISO.strip({ root, ... }). A print caught mid-reveal is reprinted finished.

   The effects layer (the flying ink, the rings, the giant L) is a moment, not data: each pixel is
   matched to the ink or overprint it was (win, the pop ink, loss, over the veil of the stock) and
   swapped for the same in the look's inks, stock and blend (screen on a dark stock, multiply on
   paper); its alpha is kept.

   Work runs in small tasks off the apply call (one plate per task), newest first, and every result
   is cached by the look's print tokens and the frozen image, so flipping back to a look is instant.
   "Today's site" reprints too, in the site's own tokens. */
(function () {
  "use strict";
  var LAB = window.LAB;
  if (!LAB) return;
  var MONTH_START = [0, 5, 20, 35, 50, 61, 76];

  /* ---- small helpers ---- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function now() { return window.performance && performance.now ? performance.now() : Date.now(); }
  function fnv(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; } return h; }
  // a cheap fingerprint of a (large) data URI
  function fp(s) { s = String(s || ""); return s.length + ":" + fnv(s.slice(0, 200) + s.slice(Math.floor(s.length / 2), Math.floor(s.length / 2) + 400) + s.slice(-400)).toString(36); }
  function parseColor(s) {
    s = String(s || "").trim();
    var m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (m) { var h = m[1].length === 3 ? m[1].replace(/(.)/g, "$1$1") : m[1]; return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
    m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    return m ? [+m[1], +m[2], +m[3]] : null;
  }
  function cssW(img, fallback) {
    var sm = /width:\s*([\d.]+)px/.exec(img.getAttribute("style") || "");
    return Math.round(sm ? parseFloat(sm[1]) : (img.getBoundingClientRect().width || fallback));
  }

  /* ---- the theme the engines will read, as a cache key ---- */
  var PRINT_TOKENS = ["print-paper", "print-key", "print-pop", "print-sun", "print-dusk", "print-night", "win", "loss", "light", "shadow", "print-blend", "print-filter", "disp", "mono"];
  function tokens(doc) {
    var cs = doc.defaultView.getComputedStyle(doc.documentElement), o = {};
    PRINT_TOKENS.forEach(function (n) { o[n] = cs.getPropertyValue("--t-" + n).trim(); });
    return o;
  }
  function themeKey(doc) { var t = tokens(doc); return fnv(PRINT_TOKENS.map(function (n) { return t[n]; }).join("|")).toString(36); }

  /* ---- type: the look's display and mono faces must be declared in THIS document (the canvases live here) ---- */
  var fontLinks = {};
  function ensureFontCSS(css) {
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
    var waits = [ensureFontCSS("Barlow+Condensed:wght@400;600;700"), ensureFontCSS("IBM+Plex+Mono:wght@400;500;600;700"),
      ensureFontCSS("Big+Shoulders+Display:wght@700;800;900"), ensureFontCSS("Space+Mono:wght@400;700")];   // the shipped site's faces (v52)
    if (rc && rc.sysPalette !== "today") {
      var df = LAB.displayFace ? LAB.displayFace(rc) : null, mf = LAB.MONO && LAB.MONO[rc.mono || "plexmono"];
      if (df && df.css) waits.push(ensureFontCSS(df.css));
      if (mf && mf.css) waits.push(ensureFontCSS(mf.css));
    }
    return Promise.all(waits);
  }

  /* ---- jobs: one at a time, newest first, dropped when nobody wants them any more ---- */
  var cache = {}, order = [], queue = [], busy = false, CAP = 90;
  var stats = { jobs: 0, dropped: 0, results: [], strips: [], fx: [] };
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
    try { e.make(done, alive); } catch (err) { console.error("[lab] reprint", err); done(null); }
  }
  // a job that went stale mid-way gives its slot back and can be asked for again
  function abandon(key, done) { var e = cache[key]; delete cache[key]; stats.dropped++; if (e) { e.targets = []; } done(null); }

  /* ================= the results print ================= */
  function reprintResults(img, doc, rc, tk) {
    var host = img.closest ? img.closest("[data-spec]") : null, spec;
    try { spec = JSON.parse(host.getAttribute("data-spec")); } catch (e) { spec = null; }
    if (!spec || !window.T82PRINT || !window.T82PRINT.print) return;
    var names = host.querySelector("img.rr-print-names"), w = cssW(img, 342), W = clamp(Math.round(w * 2), 64, 1240);
    if (names && names.__labOrig == null) names.__labOrig = names.getAttribute("src") || "";
    var key = "print|" + tk + "|" + fnv(host.getAttribute("data-spec")).toString(36) + "|" + W;
    request(key, img, function (done, alive) {
      var t0 = now();
      fontsFor(rc).then(function () { return window.T82PRINT.fonts(doc.documentElement); }).then(function () {
        if (!alive() || themeKey(doc) !== tk) { abandon(key, done); return; }
        var out = window.T82PRINT.print(spec, { root: doc.documentElement, width: W, dpr: 2 });
        var url = JSON.stringify([out.print.toDataURL("image/jpeg", 0.9), out.names.toDataURL("image/png")]);
        log(stats.results, { ms: Math.round(now() - t0), w: W });
        done(url);
      }).catch(function (e) { console.error("[lab] reprint results", e); done(null); });
    }, function (both) {
      var u = JSON.parse(both);
      img.setAttribute("src", u[0]);
      if (names) { names.__labWant = key; names.setAttribute("src", u[1]); }
    });
  }

  /* ================= the reel's month strips ================= */
  function reprintStrip(img, doc, rc, tk) {
    var games = img.getAttribute("data-games");
    if (!games || !window.T82RISO || !window.T82RISO.strip) { reinkFx(img, doc, tk); return; }
    var gi0 = +img.getAttribute("data-gi0") || 0, cl0 = +img.getAttribute("data-cl0") || 0;
    var streaks = String(img.getAttribute("data-streaks") || "").split(",").map(Number);
    var mi = MONTH_START.indexOf(gi0);
    if (mi < 0) { mi = 0; while (mi < 6 && MONTH_START[mi + 1] <= gi0) mi++; }
    var w = cssW(img, 300);
    var key = "strip|" + tk + "|" + games + "|" + streaks.join(",") + "|" + gi0 + "|" + cl0 + "|" + w;
    request(key, img, function (done, alive) {
      var t0 = now();
      fontsFor(rc).then(function () {
        if (!alive() || themeKey(doc) !== tk) { abandon(key, done); return; }
        var c = window.T82RISO.strip({ root: doc.documentElement, games: games, streaks: streaks, gi0: gi0, cl0: cl0, mi: mi, cssW: w, d: 2 });
        log(stats.strips, { ms: Math.round(now() - t0), n: games.length });
        done(c.toDataURL("image/png"));
      }).catch(function (e) { console.error("[lab] reprint strip", e); done(null); });
    }, function (url) { img.setAttribute("src", url); });
  }

  /* ================= the effects layer: pixel re-inking =================
     A pixel of the effects layer is ink (win, pop, loss, or an overprint of them, laid down with the
     stock's blend) paled toward the stock by the loss veil, at some alpha. Each pixel is matched to the
     nearest point on the line from an ink combination to the stock, then swapped for the same combination
     in the look's inks, paled the same way toward the look's stock; its alpha is kept. */
  var W8 = [0.8, 1, 0.7];                                  // channel weights for matching (the eye cares most for green)
  function blendFn(mode) {
    return mode === "multiply" ? function (a, b) { return [a[0] * b[0] / 255, a[1] * b[1] / 255, a[2] * b[2] / 255]; }
      : function (a, b) { return [255 - (255 - a[0]) * (255 - b[0]) / 255, 255 - (255 - a[1]) * (255 - b[1]) / 255, 255 - (255 - a[2]) * (255 - b[2]) / 255]; };
  }
  var COMBOS = [["win"], ["pop"], ["loss"], ["win", "pop"], ["win", "loss"], ["pop", "loss"], ["win", "pop", "loss"]];
  function combos(inks, blend) {
    var f = blendFn(blend), start = blend === "multiply" ? [255, 255, 255] : [0, 0, 0];
    return COMBOS.map(function (names) { var c = start; names.forEach(function (n) { c = f(c, inks[n]); }); return c; });
  }
  function fxMap(doc) {
    var S = LAB.SITE, t = tokens(doc), col = function (v, fb) { return parseColor(v) || parseColor(fb); };
    var srcBlend = "screen", dstBlend = t["print-blend"] === "multiply" ? "multiply" : t["print-blend"] === "screen" ? "screen" : "screen";
    var src = { win: col(S.win), pop: col(S["print-pop"]), loss: col(S.loss) }, dst = { win: col(t.win, S.win), pop: col(t["print-pop"], S["print-pop"]), loss: col(t.loss, S.loss) };
    return { src: combos(src, srcBlend), dst: combos(dst, dstBlend), paperS: col(S["print-paper"]), paperT: col(t["print-paper"], S["print-paper"]) };
  }
  // the nearest point to c on the line from ink s to paper p: [how far along (0 = ink, 1 = paper), weighted miss]
  function onLine(c, s, p) {
    var num = 0, den = 0, k, d, e, err = 0, t;
    for (k = 0; k < 3; k++) { d = p[k] - s[k]; num += W8[k] * (c[k] - s[k]) * d; den += W8[k] * d * d; }
    t = den ? clamp(num / den, 0, 1) : 0;
    for (k = 0; k < 3; k++) { e = c[k] - (s[k] + (p[k] - s[k]) * t); err += W8[k] * e * e; }
    return [t, err];
  }
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
  function remapImage(src, map) {
    return pixels(src).then(function (px) {
      var c = document.createElement("canvas"); c.width = px.w; c.height = px.h;
      var g = c.getContext("2d"), img = g.createImageData(px.w, px.h), o = img.data, s = px.data, memo = {}, any = false, i, a, pk;
      var P = map.paperS, T = map.paperT;
      for (i = 0; i < s.length; i += 4) {
        a = s[i + 3];
        if (!a) continue;
        any = true;
        pk = (s[i] << 16) | (s[i + 1] << 8) | s[i + 2];
        var out = memo[pk];
        if (!out) {
          var col = [s[i], s[i + 1], s[i + 2]], best = -1, bt = 1, bd = 1e12, j, f;
          // the bare stock (the veil) is a point of its own
          var dp = W8[0] * (col[0] - P[0]) * (col[0] - P[0]) + W8[1] * (col[1] - P[1]) * (col[1] - P[1]) + W8[2] * (col[2] - P[2]) * (col[2] - P[2]);
          bd = dp;
          for (j = 0; j < map.src.length; j++) { f = onLine(col, map.src[j], P); if (f[1] < bd) { bd = f[1]; best = j; bt = f[0]; } }
          if (best < 0) out = T;
          else {
            var q = map.src[best], tt = map.dst[best];
            // keep half the pixel's miss (anti-aliasing, soft edges) as a shift
            out = [0, 1, 2].map(function (k) { var miss = col[k] - (q[k] + (P[k] - q[k]) * bt); return clamp(Math.round(tt[k] + (T[k] - tt[k]) * bt + miss * 0.5), 0, 255); });
          }
          memo[pk] = out;
        }
        o[i] = out[0]; o[i + 1] = out[1]; o[i + 2] = out[2]; o[i + 3] = a;
      }
      if (!any) return null;                            // an empty layer stays as it is
      g.putImageData(img, 0, 0);
      return c.toDataURL("image/png");
    });
  }
  function reinkFx(img, doc, tk) {
    var key = "fx|" + tk + "|" + fp(img.__labOrig);
    request(key, img, function (done, alive) {
      var t0 = now();
      if (!alive() || themeKey(doc) !== tk) { abandon(key, done); return; }
      remapImage(img.__labOrig, fxMap(doc)).then(function (url) {
        log(stats.fx, { ms: Math.round(now() - t0), empty: !url });
        done(url || img.__labOrig);
      }, function () { done(null); });
    }, function (url) { img.setAttribute("src", url); });
  }

  /* ================= the hook ================= */
  function restore(img) {
    img.__labWant = null;
    if (img.__labOrig != null && img.getAttribute("src") !== img.__labOrig) img.setAttribute("src", img.__labOrig);
  }
  function hook(doc, rc) {
    if (!doc || !doc.documentElement) return;
    // every look reprints, "Today's site" too: the snapshots were frozen in earlier inks, and today's tokens are the
    // site's own (the theme block the snapshot wears)
    var tk = themeKey(doc);
    doc.querySelectorAll("img[data-snap-canvas]").forEach(function (img) {
      if (img.__labOrig == null) img.__labOrig = img.getAttribute("src") || "";
      if (!img.__labOrig || !/^data:/.test(img.__labOrig)) return;
      var cls = img.classList;
      if (cls.contains("rr-print-canvas")) reprintResults(img, doc, rc, tk);
      else if (cls.contains("riso-strip")) reprintStrip(img, doc, rc, tk);
      else if (cls.contains("riso-fx")) reinkFx(img, doc, tk);
      // img.rr-print-names is printed with its print
    });
  }
  LAB.pageHooks = LAB.pageHooks || [];
  LAB.pageHooks = LAB.pageHooks.filter(function (h) { return !h.__labReprint; });
  hook.__labReprint = true;
  LAB.pageHooks.push(hook);

  // for the console and for checks: LAB.reprint.stats, LAB.reprint.drum("vice", "night")
  LAB.reprint = { drum: function (id, g) { return LAB.drum(id, g || "night"); }, stats: stats, cache: cache, tokens: tokens,
    clear: function () { cache = LAB.reprint.cache = {}; order = []; queue = []; pixCache = {}; pixOrder = []; } };
})();
