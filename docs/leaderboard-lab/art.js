/* docs/leaderboard-lab/art.js  ----  LB.art: the seam onto the real riso engines.
   =============================================================================

   WHY THIS FILE EXISTS. Round one shipped eleven "art directions" and measured
   backgroundImage "none" on every sheet and every row, zero canvases in the board,
   and only four looks that even defined paint(). Not one of them reached an engine.
   The cause was distance: to put real ink on a row you had to read 3,300 lines of
   results-riso.js and reel-riso.js first, so nobody did, and eleven looks changed
   the font instead. This file closes that distance. A look author writes one line
   and gets ink the printer made.

       LB.art.wash(win, row, { ink: "offset", cov: 0.92, to: 0.78 });
       LB.art.scene(win, "skyline", sheet, { wins: 78, context: "THE DAILY" });

   WHAT IS REAL IN HERE, and this matters because round one faked it:
     - the halftone dots come from reel-riso.js's own screening pass (tone drawn as
       black alpha, screened per pixel into the ink's lattice, grained, then the ink
       starvation specks punched out). Not a CSS gradient pretending to be dots.
     - the paper is results-riso.js's makePaper, the same stock the results print and
       the season reel stand on.
     - the scenes are T82PRINT.print: a real riso banner, in real misregistration.
     - the treatments are the loss files' own draw(), run against a kit assembled to
       the same shape the reel hands them.

   THE ONE API SHAPE RULE. Every function takes the frame's window, document OR any
   element in it as its first argument and works out the rest. CONTRACT.md writes the
   signatures as (frameWin, ...) and lab.js already calls LB.art.paper(doc) and
   look.paint(doc, recipe) with a DOCUMENT, so insisting on one or the other would
   have broken a caller on day one. Pass whatever you have.

   -----------------------------------------------------------------------------
   HOW FAILING SOFT AND SILENT WAS ACTUALLY ENSURED (not asserted)
   -----------------------------------------------------------------------------
   1. ONE GATE, NOT MANY. Every public function routes its body through run(), which
      is a try/catch that returns the caller's stated fallback ("" or false or 0) on
      any throw. There is no path into an engine that is not inside it. So a renamed
      export, a moved art file, an iframe that is not loaded yet, a canvas the
      browser refuses, an art file that throws mid-draw, a theme token that is
      missing (readTheme THROWS by design when --t-print-paper is absent) all land
      in the same place: the board renders as plain markup.
   2. NOTHING IS LOGGED. No console call exists in this file. Grep it. Failures go
      into a 48-entry ring buffer instead, LB.art.trace(), so the lab's own console
      can show what did not paint without the browser console filling up. The
      engines keep their own one-warn-per-broken-look (T82ART's warn, the print's
      retire) and I deliberately do NOT suppress those: that single line is how a
      genuinely broken art file gets found, and it fires once per visit, not per row.
   3. FEATURE DETECTED, NOT ASSUMED. supported() repeats results-riso.js's own test
      (2d context, getImageData, ellipse, Float32Array) because the screening pass
      needs all four. A browser missing any of them gets "" from everything, which
      means plain markup, which is the requirement.
   4. SYNCHRONOUS-SAFE FROM A RENDER PASS. Nothing here awaits, blocks, or spins.
      When the art is in hand it paints during the call and returns the id. When it
      is not, the call returns "" immediately and the paint lands later:
        - art file not downloaded yet -> T82ART.load() (never rejects), repaint on
          arrival. T82ART.load is NOT gated by the iPhone-check: the gate only holds
          back ids the game dealt this run, and the lab deals nothing. Verified in
          art-core.js gateOf(): "if (!has(DEALT, key) || conn()) return 'go'".
        - element has zero size -> an rAF retry, capped at 90 frames, then given up
          silently. A 0x0 canvas is never created.
        - the display face has not landed -> paints now with K.ready, repaints once
          when T82PRINT.fonts() resolves, so canvas type is not measured in a
          fallback face.
      Every deferred callback re-checks that the element is still in its document and
      that the paint it was queued for is still the current one, so a removed row or
      a re-render that happened in between paints nothing.
   5. CALLED TWICE, ONE CANVAS. Canvases are slots, not appends. Each one carries
      data-lb-art="<slot>" and data-lb-key="<what it holds>"; a second call with the
      same key on the same element is a no-op, a different key repaints the canvas
      already there. Nothing stacks, and ten renders cost one canvas. clear(el) takes
      them all off again.
   6. DETERMINISTIC. No Math.random and no Date.now anywhere in this file: every seed
      is the caller's, or an FNV-1a hash of an id. season() is a tiny LCG. The one
      Math.random inside the engines is T82ART.deal()'s shuffle bag, which this file
      never calls, and T82PRINT's palette bag in app.js, which this file never calls
      either: spec() always names its own pal. The same recipe paints the same pixels.

   -----------------------------------------------------------------------------
   THE TRAP IN THE 43 "PRINT TREATMENTS", READ IT BEFORE YOU USE treat()
   -----------------------------------------------------------------------------
   The task calls kind "loss" a set of riso printing techniques, and it is, but I read
   all 43 `by:` lines and every single one of them draws the letter L or the word LOSS
   as its hero. That is the contract: "at least four in five variants keep the letter
   L as the anchor". So treat(win, "woodtype", row) stamps a wooden L on a
   leaderboard row, which says the fourth best GM in the world lost. That is a
   meaning bug, and on this game it is also a house-rule bug: no shaming, red and bad
   mean bad, one meaning per colour.

   So treat() is honest about what it is and LB.art.LETTER lists the 43 ids, all of
   them, as a warning rather than a menu. Use treat() where "a loss" IS the meaning:
   a run that did not qualify, the Daily you did not finish, the empty 82-0 Club.

   What the treatments are really worth on a board is their INK, and the ink is
   available without the letter: wash() and screen() reach the same screening pass
   the treatments draw through. wash() is the one a leaderboard wants, because its
   two knobs are both numbers off the board:
       cov  how much ink is on the row  (the score)
       to   how far the ink reaches     (the gap, the fill)
   Row one is 95% aqua all the way across. Row forty is 30% aqua stopping a third of
   the way. That is the rank drawn as ink, and it is the same gauge the results print
   already uses (D.fillX: colour fills to the win rate, the owner's own idea).

   -----------------------------------------------------------------------------
   THE OTHER THING NOBODY WOULD HAVE FOUND
   -----------------------------------------------------------------------------
   T82PRINT.print() does not just paint a picture. drawBannerTitle prints the RECORD
   in 148px display type in two inks off register, plus spec.context on the right. And
   spec.games (82 entries) is the ridge: every win lifts it, every loss drops it, the
   losses bead along it, and the colour fills only to the win rate. So
       LB.art.scene(win, "skyline", card, { wins: 78, games: g, context: "THE DAILY #412" })
   is not a background. It is the leader's season, their 78-4, and the board's name,
   printed as one riso banner. Nothing else in this file is as functional as that.

   AND THE TRAP UNDER IT: seven scenes are perfect: true (constellation, goatpeak,
   kintsugi, parade, rafters, summit, sunrise) and sceneFor() silently prints the LAKE
   instead unless the spec is 82-0. A look author asking for goatpeak at 74-8 would
   have got the lake and never known why. scene() detects a perfect scene and forces
   its spec to 82-0 so the picture the caller named is the picture that prints, which
   is also the right meaning: those seven belong to the 82-0 Club board and nothing
   else.

   -----------------------------------------------------------------------------
   Plain ES5. No libraries. No DOM work at load time. Nothing runs until called.
   ========================================================================== */

window.LB = window.LB || {};

LB.art = (function () {
  "use strict";

  var VERSION = "lb-art v1 (round two)";
  var TRACE = [], TRACE_MAX = 48;
  var SIZE_TRIES = 90;          // rAF frames to wait for an element to get a box, then give up
  var PREP_JOBS = 96;           // a treatment's prep jobs run synchronously; a bound so a bad file cannot spin
  var ATTR = "data-lb-art";     // the slot name
  var KEY = "data-lb-key";      // what the slot currently holds

  /* a note instead of a console line (rule 2 in the header) */
  function note(what, why) {
    TRACE.push(what + (why ? ": " + why : ""));
    if (TRACE.length > TRACE_MAX) TRACE.shift();
  }
  function msg(e) { return (e && (e.message || e.name)) ? String(e.message || e.name) : String(e); }

  /* THE ONE GATE. Every public function is run(label, fallback, body). */
  function run(label, fallback, body) {
    try { return body(); }
    catch (e) { note(label, msg(e)); return fallback; }
  }

  /* ---------- what am I holding ---------- */
  // a window, a document, or any element in one: all three arrive here.
  function winOf(x) {
    try {
      if (!x) return null;
      if (x.document && x.getComputedStyle) return x;                 // a window
      if (x.defaultView) return x.defaultView;                        // a document
      if (x.ownerDocument && x.ownerDocument.defaultView) return x.ownerDocument.defaultView;
      return null;
    } catch (e) { return null; }   // a cross-origin frame throws on touch
  }
  function docOf(x) {
    var w = winOf(x);
    if (w) return w.document;
    return (x && x.nodeType === 9) ? x : null;
  }
  // the element whose computed tokens the engines read. An element is best: a look may
  // override --t-* locally and the ink should follow it.
  function rootOf(x) {
    if (x && x.nodeType === 1) return x;
    var d = docOf(x);
    return d ? d.documentElement : null;
  }
  function eng(x, name) {
    var w = winOf(x);
    try { return (w && w[name]) ? w[name] : null; } catch (e) { return null; }
  }
  function dprOf(x) {
    var w = winOf(x);
    // the engines clamp to 1..2 (reel-riso dpr()). K.pat pins its dots to this, so a
    // different number here and there would make the dots swim.
    return Math.min(2, Math.max(1, (w && w.devicePixelRatio) || 1));
  }
  // results-riso.js supported(): the screening pass needs all four of these.
  function supported(x) {
    var d = docOf(x), w = winOf(x), c, g;
    if (!d || !w) return false;
    try {
      c = d.createElement("canvas");
      g = c.getContext && c.getContext("2d");
      return !!(g && g.getImageData && g.ellipse && w.Float32Array);
    } catch (e) { return false; }
  }

  /* ---------- deterministic seeds (no Math.random, no Date.now) ---------- */
  function hash(s) {                                   // FNV-1a, 32 bit
    var h = 2166136261, i;
    s = String(s === undefined || s === null ? "" : s);
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h >>> 0;
  }
  function lcg(seed) {
    var s = (seed >>> 0) || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function num(v, d) { var n = +v; return isFinite(n) ? n : d; }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* ---------- canvas slots: called twice, one canvas (rule 5) ---------- */
  function box(el) {
    try { var r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; }
    catch (e) { return { w: 0, h: 0 }; }
  }
  function alive(el) {
    try { return !!(el && el.ownerDocument && el.ownerDocument.contains(el)); } catch (e) { return false; }
  }
  function slotOf(el, slot) {
    var list, i;
    try { list = el.children || []; } catch (e) { return null; }
    for (i = 0; i < list.length; i++) {
      if (list[i].nodeName === "CANVAS" && list[i].getAttribute(ATTR) === slot) return list[i];
    }
    return null;
  }
  /* layer: "under" (behind the content), "over" (above it, never clickable) or
     "flow" (an ordinary block child, for art that IS content, like a month strip). */
  function mount(el, slot, layer, cssW, cssH, d) {
    var doc = el.ownerDocument, c = slotOf(el, slot), W = Math.max(1, Math.round(cssW * d)), H = Math.max(1, Math.round(cssH * d)), cs;
    if (!c) {
      c = doc.createElement("canvas");
      c.setAttribute(ATTR, slot);
      c.setAttribute("aria-hidden", "true");
      if (layer === "flow") { c.style.display = "block"; c.style.maxWidth = "100%"; }
      else {
        c.style.position = "absolute";
        c.style.left = "0"; c.style.top = "0";
        c.style.width = "100%"; c.style.height = "100%";
        c.style.pointerEvents = "none";
        c.style.zIndex = layer === "over" ? "2" : "0";
        // an absolute layer needs a positioned parent. Only touched when it is static,
        // so a look that positions the row itself is left alone.
        try {
          cs = el.ownerDocument.defaultView.getComputedStyle(el);
          if (cs && cs.position === "static") el.style.position = "relative";
        } catch (e) { /* a detached element: the layer still paints */ }
      }
      if (layer === "under" && el.firstChild) el.insertBefore(c, el.firstChild);
      else el.appendChild(c);
    }
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    if (layer === "flow") { c.style.width = Math.round(cssW) + "px"; c.style.height = Math.round(cssH) + "px"; }
    return c;
  }
  function ctxOf(c, d, wipe) {
    var g = c.getContext("2d");
    if (!g) return null;
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (wipe !== false) g.clearRect(0, 0, c.width, c.height);
    g.setTransform(d, 0, 0, d, 0, 0);     // from here on, draw in CSS px like the engines do
    return g;
  }
  function held(el, slot, key) {
    var c = slotOf(el, slot);
    return !!(c && c.getAttribute(KEY) === key);
  }
  function stamp(c, key) { try { c.setAttribute(KEY, key); } catch (e) {} }

  /* ---------- deferral: never block, always re-check (rule 4) ---------- */
  function nextFrame(win, fn) {
    try {
      if (win.requestAnimationFrame) { win.requestAnimationFrame(fn); return true; }
      win.setTimeout(fn, 16);
      return true;
    } catch (e) { return false; }
  }
  // el has no box yet (display:none, a sheet still animating open, a row in a
  // collapsed section): retry for SIZE_TRIES frames, then stop. Never creates a 0x0
  // canvas and never logs.
  function whenSized(el, fn) {
    var win = winOf(el), n = 0;
    if (!win) return false;
    function tick() {
      var b;
      if (!alive(el)) return;                    // removed while we waited: paint nothing
      b = box(el);
      if (b.w >= 1 && b.h >= 1) { fn(b); return; }
      if (++n > SIZE_TRIES) { note("size", "element never got a box"); return; }
      nextFrame(win, tick);
    }
    tick();
    return true;
  }
  // the art file. Registered -> true (paint during this call). Not -> ask for it and
  // repaint when it lands. T82ART.load never rejects and never loads twice.
  function whenLoaded(x, kind, id, fn) {
    var A = eng(x, "T82ART"), p;
    if (!A || !A.get) return false;
    try { if (A.get(kind, id)) return true; } catch (e) { return false; }
    if (!A.load) return false;
    try {
      p = A.load(kind, [id]);
      if (p && p.then) p.then(function () { run("load:" + kind + "/" + id, false, fn); }, function () {});
    } catch (e) { note("load", msg(e)); }
    return false;
  }
  // canvas type measured in a fallback face is the wrong width. Paint now, repaint once
  // when the display face lands. One listener per window, not per element.
  var FONTS = [];
  function whenFonts(x, fn) {
    var P = eng(x, "T82PRINT"), w = winOf(x), i, p;
    if (!P || !P.fonts || !w) return;
    for (i = 0; i < FONTS.length; i++) if (FONTS[i].w === w) { if (FONTS[i].done) return; FONTS[i].q.push(fn); return; }
    var rec = { w: w, done: false, q: [fn] };
    FONTS.push(rec);
    try {
      p = P.fonts(rootOf(x));
      if (p && p.then) p.then(function () {
        rec.done = true;
        var q = rec.q; rec.q = [];
        for (var j = 0; j < q.length; j++) run("fonts", false, q[j]);
      }, function () { rec.done = true; rec.q = []; });
      else rec.done = true;
    } catch (e) { rec.done = true; rec.q = []; }
  }

  /* ---------- fitting a picture to a box ---------- */
  function fit(sw, sh, dw, dh, how, focus) {
    var s, w, h, x, y;
    if (how === "stretch") return [0, 0, dw, dh];
    s = how === "contain" ? Math.min(dw / sw, dh / sh) : Math.max(dw / sw, dh / sh);
    w = sw * s; h = sh * s;
    x = (dw - w) / 2;
    y = focus === "top" ? 0 : focus === "bottom" ? (dh - h) : (dh - h) / 2;
    return [x, y, w, h];
  }

  /* =========================================================================
     THE PUBLIC SURFACE
     ========================================================================= */

  var api = {};

  api.VERSION = VERSION;

  /* every engine, named, so the lab console can say what is missing rather than
     showing a dull board with no explanation. */
  api.engines = function (x) {
    return run("engines", { canvas: false, print: false, reel: false, fx: false, art: false }, function () {
      var P = eng(x, "T82PRINT"), R = eng(x, "T82RISO"), F = eng(x, "T82FX"), A = eng(x, "T82ART");
      return {
        canvas: supported(x),
        print: !!(P && P.print && P.paper),
        reel: !!(R && R.kit && R.strip),
        fx: !!(F && F.play),
        art: !!(A && A.catalog && A.get)
      };
    });
  };

  /* CONTRACT.md: are the engines present in that window. The two a look needs are the
     print engine (paper, scenes) and the reel engine (the screening kit). T82ART and
     T82FX are extras: catalog() and hot() check for themselves. */
  api.ready = function (x) {
    return run("ready", false, function () {
      var e = api.engines(x);
      return !!(e.canvas && e.print && e.reel);
    });
  };

  /* The real riso stock, as a CSS background-image value ready for
     style.backgroundImage. lab.js already assigns the return straight through, so it
     comes back wrapped in url(), not bare. "" when anything is missing: the caller
     assigns "" and gets its own ground back. */
  api.paper = function (x) {
    return run("paper", "", function () {
      var P = eng(x, "T82PRINT");
      if (!P || !P.paper || !supported(x)) return "";
      var u = P.paper(rootOf(x));
      return (typeof u === "string" && u.length > 32) ? 'url("' + u + '")' : "";
    });
  };

  /* The engines' own read of the theme. readTheme THROWS when a token is missing (by
     design: a print in a half-themed page would be wrong, not dull), so this is the
     one call most likely to come back null, and it comes back null quietly.
     -> { rgb: {win,pop,loss,key,gold,night,dusk,light,stock,hot,good,you}, blend,
          disp, mono, filter, stock } */
  api.theme = function (x) {
    return run("theme", null, function () {
      var R = eng(x, "T82RISO"), P = eng(x, "T82PRINT"), root = rootOf(x), T = null, TP = null, out, k;
      if (R && R.theme) { try { T = R.theme(root); } catch (e) { note("theme:reel", msg(e)); } }
      if (P && P.theme) { try { TP = P.theme(root); } catch (e) { note("theme:print", msg(e)); } }
      if (!T && !TP) return null;
      out = { rgb: {}, blend: "", disp: "", mono: "", filter: "none", stock: null };
      if (T) {
        for (k in T.rgb) if (Object.prototype.hasOwnProperty.call(T.rgb, k)) out.rgb[k] = T.rgb[k].slice();
        out.blend = T.blend; out.disp = T.disp; out.mono = T.mono; out.stock = T.stock ? T.stock.slice() : null;
      }
      if (TP) {
        out.filter = TP.filter || "none";
        if (!out.blend) out.blend = TP.blend || "";
        if (!out.stock && TP.paper) out.stock = TP.paper.slice();
      }
      return out;
    });
  };

  /* The reel's ink order: ["win","pop","loss","key","gold","night","dusk","light",
     "stock","hot","good","you"]. These are the names every ink argument in this file
     takes, and they map onto the theme roles (win -> --t-win, pop -> --t-print-pop,
     hot -> --t-hot, you -> --t-you), so "the second ink" the owner named is
     ink "win" or ink "pop": both are #41C6EA. */
  api.inks = function (x) {
    return run("inks", [], function () {
      var R = eng(x, "T82RISO");
      return (R && R.inks && R.inks.slice) ? R.inks.slice() : [];
    });
  };

  /* one ink as a CSS colour, for the places a look needs the printer's own ink in
     plain CSS (a rule, a label, a border) rather than on a canvas. */
  api.ink = function (x, name, el) {
    return run("ink:" + name, "", function () {
      var T = api.theme(el || x), c = T && T.rgb ? T.rgb[name] : null;
      return c ? "rgb(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + ")" : "";
    });
  };

  /* "screen" on a dark card, "multiply" on paper. A look stacking its own ink in CSS
     wants this on mix-blend-mode so it agrees with the canvases. */
  api.blend = function (x) {
    return run("blend", "", function () {
      var T = api.theme(x);
      return T && T.blend ? T.blend : "";
    });
  };

  /* ids of a kind, alphabetical, as T82ART holds them right now.
       kind: "scene" | "loss" | "hot" | "dots" | "perk" | "goat"
       opts.perfect  true = only the 82-0 scenes, false = only the ordinary ones
       opts.on       true = only the ones the game actually deals
     The index lists every file without downloading any of it, so this is cheap and
     true even before a single art file has loaded. */
  api.catalog = function (x, kind, opts) {
    return run("catalog:" + kind, [], function () {
      var A = eng(x, "T82ART"), P = eng(x, "T82PRINT"), out = [], seen = {}, want, onlyOn;
      if (!A || !A.catalog) return [];
      opts = opts || {};
      want = typeof opts.perfect === "boolean" ? opts.perfect : null;
      onlyOn = opts.on === true;
      // the lake is the print engine's built-in scene: in T82PRINT.scenes(), not in the index.
      if (kind === "scene" && want !== true && P && P.scenes) {
        try {
          (P.scenes({ perfect: false }) || []).forEach(function (id) {
            if (id === "lake" && !seen[id]) { seen[id] = 1; out.push(id); }
          });
        } catch (e) { note("catalog:lake", msg(e)); }
      }
      (A.catalog(kind) || []).forEach(function (en) {
        if (!en || !en.id || seen[en.id]) return;
        if (onlyOn && en.on !== true) return;
        if (want !== null && !!en.perfect !== want) return;
        seen[en.id] = 1;
        out.push(en.id);
      });
      return out;
    });
  };

  /* the owner-facing label of each id ("Running Dry", "Leaded Glass"), for a lab
     chip. -> { id: name } */
  api.names = function (x, kind) {
    return run("names:" + kind, {}, function () {
      var A = eng(x, "T82ART"), out = {};
      if (!A || !A.catalog) return out;
      (A.catalog(kind) || []).forEach(function (en) { if (en && en.id) out[en.id] = String(en.name || en.id); });
      if (kind === "scene" && !out.lake) out.lake = "Lake";
      return out;
    });
  };

  /* ---------------------------------------------------------------------------
     SEASONS AND SPECS: what makes a scene carry a fact instead of a mood
     --------------------------------------------------------------------------- */

  /* 82 games, deterministic from (wins, seed), shaped like a season rather than a
     coin flip: a hot start, a wobble, a close. The point is the ridge. A straight
     line of wins and a real 74-8 print as different pictures, and the losses bead
     along the ridge where they happened, so two GMs on 74-8 get two different
     banners. Exactly `wins` entries are 1, always. */
  api.season = function (wins, seed) {
    return run("season", null, function () {
      var w = Math.max(0, Math.min(82, Math.round(num(wins, 0)))), r = lcg(hash("season/" + w + "/" + num(seed, 0))), g = [], i;
      var weight = [], order = [], ph = r() * 6.283, fq = 1 + Math.floor(r() * 3), prev = r();
      for (i = 0; i < 82; i++) {
        // a drifting form (one pole of smoothing) so losses come in runs the way a real
        // season does, plus a seeded swell so two GMs on the same record get two
        // different ridges, plus fresh noise so the runs are not in the same place.
        prev = prev * 0.55 + r() * 0.45;
        weight.push(prev + 0.18 * Math.sin((i / 82) * 6.283 * fq + ph) + r() * 0.35);
        order.push(i);
      }
      // the `wins` highest weights win; a stable sort by weight then index keeps it reproducible
      order.sort(function (a, b) { return weight[b] - weight[a] || a - b; });
      for (i = 0; i < 82; i++) g.push(0);
      for (i = 0; i < w; i++) g[order[i]] = 1;
      return g;
    });
  };

  /* a valid T82PRINT spec from plain board facts. Everything optional.
       wins    0..82                 the record the banner prints
       games   82 entries, or absent (then season() shapes one from wins and seed)
       seed    the grain, the crags, the ripples
       pal     "golden" | "dusk" | "night"   (named, never bagged: app.js's own
               resultsPrintPal() calls Math.random, which the lab may not)
       context the eyebrow on the right: "THE DAILY #412", "THIS WEEK", "82-0 CLUB"
       scene   the scene id
       names / roster  left EMPTY on purpose: the roster layer stacks five player
               names over the picture, which belongs on a results card, not under a
               leaderboard. Pass them if you want them. */
  api.spec = function (opts) {
    return run("spec", null, function () {
      var o = opts || {}, wins = Math.max(0, Math.min(82, Math.round(num(o.wins, 41))));
      var seed = (hash("spec/" + wins + "/" + num(o.seed, 0) + "/" + (o.scene || "")) >>> 0) || 7;
      var games = (o.games && o.games.length === 82) ? [].slice.call(o.games).map(function (g) { return g ? 1 : 0; })
        : (o.games === null ? null : api.season(wins, num(o.seed, 0)));
      var pal = (o.pal === "golden" || o.pal === "dusk" || o.pal === "night") ? o.pal : "night";
      var spec = {
        games: games, wins: wins, saved: null,
        context: typeof o.context === "string" ? o.context : "",
        names: o.names || [], roster: o.roster || [],
        net: typeof o.net === "string" ? o.net : "",
        comp: typeof o.comp === "string" ? o.comp : "",
        seed: seed, pal: pal
      };
      if (typeof o.scene === "string" && o.scene) spec.scene = o.scene;
      return spec;
    });
  };

  /* ---------------------------------------------------------------------------
     scene(): a real riso banner into an element
     ---------------------------------------------------------------------------
     T82PRINT.print() is synchronous and returns a canvas, so when the art file is in
     hand this paints during the render pass and returns the id it painted.

       opts.wins / games / seed / pal / context / names / roster   -> spec()
       opts.spec     a spec you built yourself; wins and friends are then ignored
       opts.fit      "cover" (default) | "contain" | "stretch"
       opts.focus    "center" (default) | "top" | "bottom"   where cover crops
       opts.width    the banner's own width in CSS px (default: the element's)
       opts.filter   false turns off the theme's print filter (default: on)
       opts.slot     name the canvas, so one element can hold two (default "scene")
       opts.layer    "under" (default) | "over" | "flow"
       opts.alpha    0..1 on the canvas, for a ground that must not fight the type

     -> the scene id painted now, or "" (not yet, or not possible). A deferred paint
        still lands; pass opts.done if you need to know. */
  api.scene = function (x, id, el, opts) {
    return run("scene:" + id, "", function () {
      var o = opts || {}, slot = o.slot || "scene", layer = o.layer || "under";
      var P = eng(x, "T82PRINT");
      if (!P || !P.print || !el || !supported(x)) return "";
      if (!whenLoaded(x, "scene", id, function () { api.scene(x, id, el, opts); })) return "";

      var A = eng(x, "T82ART");
      var perfect = false;
      try { perfect = !!(A && A.perfect && A.perfect("scene", id)); } catch (e) { perfect = false; }
      if (!perfect) { try { var def = A && A.get ? A.get("scene", id) : null; perfect = !!(def && def.perfect === true); } catch (e2) {} }

      var spec = o.spec || api.spec({
        wins: perfect ? 82 : o.wins, games: perfect ? null : o.games, seed: o.seed, pal: o.pal,
        context: o.context, names: o.names, roster: o.roster, net: o.net, comp: o.comp, scene: id
      });
      if (!spec) return "";
      spec.scene = id;
      // the seven perfect scenes print the LAKE instead unless the spec is 82-0.
      if (perfect) { spec.wins = 82; spec.games = null; }

      var key = "scene|" + id + "|" + spec.wins + "|" + spec.seed + "|" + spec.pal + "|" + (spec.context || "") + "|" + (o.fit || "cover") + "|" + (o.focus || "center");
      var painted = "";

      whenSized(el, function (b) {
        if (held(el, slot, key)) { painted = id; return; }
        var d = dprOf(x), cssW = Math.round(num(o.width, b.w)) || b.w;
        var out = P.print(spec, { root: rootOf(el), width: Math.round(cssW * d), dpr: d });
        if (!out || !out.print) { note("scene:" + id, "the print engine returned nothing"); return; }
        var c = mount(el, slot, layer, b.w, b.h, d), g = ctxOf(c, 1, true);   // drawImage works in device px
        if (!g) return;
        var r = fit(out.print.width, out.print.height, c.width, c.height, o.fit || "cover", o.focus || "center");
        if (o.alpha !== undefined) g.globalAlpha = clamp01(num(o.alpha, 1));
        g.drawImage(out.print, r[0], r[1], r[2], r[3]);
        c.style.filter = (o.filter === false) ? "" : (out.filter || "none");
        stamp(c, key);
        painted = out.scene || id;
        if (out.scene && out.scene !== id) note("scene:" + id, "printed " + out.scene + " instead");
        if (typeof o.done === "function") { try { o.done(painted); } catch (e) {} }
      });

      // the banner title is display type on canvas: remeasure it once the face lands
      whenFonts(x, function () {
        var c = slotOf(el, slot);
        if (c) c.removeAttribute(KEY);
        if (alive(el)) api.scene(x, id, el, opts);
      });
      return painted;
    });
  };

  /* ---------------------------------------------------------------------------
     treat(): one of the 43 print treatments, as the reel draws it
     ---------------------------------------------------------------------------
     READ THE HEADER FIRST. Every one of the 43 draws an L or the word LOSS. This is
     the right call where a loss is the meaning and the wrong call on a ranked row.

     A loss look is written for a moment in the reel, so it is given a kit, an event
     and a time. None of those exist outside a reel, so they are assembled here from
     the contract: the kit is T82RISO.kit() (the engines' own screening half) with the
     reel-only parts filled in, the event is built from opts, and one still frame is
     drawn at time e.

       opts.e        seconds into the moment (default 0.3: the contract says the hero
                     reads by 0.25 and the fade starts at dur - 0.2, so 0.3 of 1.05 is
                     the frame at full ink)
       opts.dur      the moment's length (default 1.05, the reel's mid hold)
       opts.seed     deterministic; defaults to a hash of the id
       opts.size     the hero's height in CSS px (default: the element's height)
       opts.x/y      the wound, in CSS px (default: the element's centre)
       opts.first    true makes the big first-loss variant of a look
       opts.lossNo   1..14
       opts.sub/sub2/city/date   the caption lines, for the looks that print them
       opts.veil     true also runs the look's veil (the dark wash; off by default,
                     it is written for a reel card and will flatten a row)
       opts.caption  true also runs the look's caption
       opts.cov      not forwarded: coverage is the look's own business
       opts.alpha / slot / layer ("over" by default) / fit as elsewhere

     -> the id painted, or "". */
  api.treat = function (x, id, el, opts) {
    return run("treat:" + id, "", function () {
      var o = opts || {}, slot = o.slot || "treat", layer = o.layer || "over";
      var R = eng(x, "T82RISO"), A = eng(x, "T82ART");
      if (!R || !R.kit || !el || !supported(x)) return "";
      if (!whenLoaded(x, "loss", id, function () { api.treat(x, id, el, opts); })) return "";
      var def = A && A.get ? A.get("loss", id) : null;
      if (!def || typeof def.draw !== "function") { note("treat:" + id, "no draw()"); return ""; }

      var e = num(o.e, 0.3), dur = Math.max(0.3, num(o.dur, 1.05));
      var seed = (num(o.seed, hash("treat/" + id)) >>> 0);
      var key = "treat|" + id + "|" + e.toFixed(3) + "|" + dur.toFixed(3) + "|" + seed + "|" + num(o.size, -1) + "|" + (o.veil ? 1 : 0) + "|" + (o.caption ? 1 : 0);
      var painted = "";

      whenSized(el, function (b) {
        if (held(el, slot, key)) { painted = id; return; }
        var d = dprOf(x), c = mount(el, slot, layer, b.w, b.h, d), g = ctxOf(c, d, true);
        if (!g) return;

        var K = R.kit(rootOf(el), g);     // throws when a token is missing: caught by run()
        var cache = c.__lbTreat && c.__lbTreat.id === id ? c.__lbTreat : null;

        K.g = g;
        K.w = b.w; K.h = b.h; K.top = 0;
        K.card = el; K.run = el;
        K.ready = o.ready !== false;
        // the reel-only half of the kit. A still frame has no rings, no spray, no
        // shake and no red flash, and a leaderboard must not flash red at all, so
        // these are no-ops rather than omissions: a look that calls one carries on.
        K.ring = function () {}; K.spark = function () {}; K.shake = function () {};
        K.flash = function () { return false; }; K.jolt = function () {};
        K.hitClassic = function () {}; K.caption = function () {};
        K.st = cache ? cache.st : {};

        var E = {
          t0: 0, dur: dur, first: !!o.first,
          lossNo: Math.max(1, Math.min(14, Math.round(num(o.lossNo, 1)))),
          lossRun: Math.max(1, Math.round(num(o.lossRun, 1))),
          prevStreak: Math.max(0, Math.round(num(o.prevStreak, 0))),
          x: num(o.x, b.w / 2), y: num(o.y, b.h / 2), seed: seed,
          sub: typeof o.sub === "string" ? o.sub : "",
          sub2: typeof o.sub2 === "string" ? o.sub2 : "",
          city: typeof o.city === "string" ? o.city : "",
          date: typeof o.date === "string" ? o.date : ""
        };

        // prep runs with K.box null (the contract), synchronously, once per element and
        // id: its jobs screen plates, which is the expensive part, and a lab repaints
        // on every recipe change.
        if (!cache && typeof def.prep === "function") {
          K.box = null;
          var jobs = def.prep(K), n = 0;
          if (jobs && jobs.length) {
            while (n < jobs.length && n < PREP_JOBS) { if (typeof jobs[n] === "function") jobs[n](); n++; }
            if (n >= PREP_JOBS) note("treat:" + id, "prep stopped at " + PREP_JOBS + " jobs");
          }
        }
        c.__lbTreat = { id: id, st: K.st };

        // K.box: the open span the hero lives in. The contract defines it off `size`
        // (the classic L's height): y0 = cy - 0.4 size, y1 = cy + 0.36 size. Given a
        // row or a card, the hero should fill it, so size is derived back out of the
        // box rather than guessed.
        var size = num(o.size, Math.min(b.h / 0.76, b.w * 0.95));
        var cx = num(o.cx, b.w / 2), cy = num(o.cy, b.h / 2);
        K.box = { x0: 0, y0: cy - 0.4 * size, x1: b.w, y1: cy + 0.36 * size, cx: cx, cy: cy, size: size, spanTop: 0, span: b.h };

        if (o.alpha !== undefined) g.globalAlpha = clamp01(num(o.alpha, 1));
        if (o.veil === true && def.veil && typeof def.veil === "function") {
          g.save(); try { def.veil(K, E, e); } catch (err) { note("treat:" + id + ":veil", msg(err)); } g.restore();
        }
        g.save();
        def.draw(K, E, e);      // a throw here lands in run(): the canvas is left as it is, the markup still reads
        g.restore();
        if (o.caption === true && typeof def.caption === "function") {
          g.save(); try { def.caption(K, E, e, K.box.cx, K.box.y1 + 26); } catch (err2) { note("treat:" + id + ":caption", msg(err2)); } g.restore();
        }
        stamp(c, key);
        painted = id;
        if (typeof o.done === "function") { try { o.done(id); } catch (e3) {} }
      });

      whenFonts(x, function () {
        var c = slotOf(el, slot);
        if (c) c.removeAttribute(KEY);
        if (alive(el)) api.treat(x, id, el, opts);
      });
      return painted;
    });
  };

  /* ---------------------------------------------------------------------------
     wash(): real halftone ink, as a number
     ---------------------------------------------------------------------------
     The one a leaderboard wants, and the only thing in this file with no equivalent
     in CSS. The dots are reel-riso.js's screening pass: tone drawn as black alpha,
     screened per pixel into the ink's own lattice and angle, grained, then the ink
     starvation specks punched back out. A CSS gradient cannot do any of that, which
     is why round one's "halftone" look measured backgroundImage: none.

     Both knobs are facts about the row:
       opts.ink   a reel ink name ("win" and "pop" are both the aqua #41C6EA,
                  "hot" is fire gold, "you" is the viewer, "loss" is red: ONE
                  MEANING PER COLOUR, and red still means bad)
       opts.cov   0..1  how much ink is on the row            <- the score
       opts.to    0..1  how far across the ink reaches        <- the gap / the fill
       opts.cov2  the coverage at the far end, for a fade from cov to cov2
       opts.dir   "x" (default) | "y"
       opts.from  0..1 where the ink starts (default 0)
       opts.soft  0..1 how much of the leading edge feathers (default 0.12)
       opts.seed  the grain and the starvation specks
       opts.slot / layer ("under" by default) / alpha

     -> true when it painted. */
  api.wash = function (x, el, opts) {
    var o = opts || {};
    var ink = typeof o.ink === "string" ? o.ink : "win";
    var cov = clamp01(num(o.cov, 0.8)), cov2 = clamp01(num(o.cov2, cov));
    var to = clamp01(num(o.to, 1)), from = clamp01(num(o.from, 0));
    var soft = clamp01(num(o.soft, 0.12)), dir = o.dir === "y" ? "y" : "x";
    return api.screen(x, el, function (g, w, h, K) {
      var i, n, t, c, a, b, span;
      if (to <= from) return;
      // 24 bands rather than a canvas gradient: a gradient's alpha is interpolated in
      // sRGB and the screen reads alpha as coverage, so bands keep the ink honest.
      n = (cov2 === cov && soft <= 0) ? 1 : 24;
      span = (dir === "x" ? w : h) * (to - from);
      a = (dir === "x" ? w : h) * from;
      for (i = 0; i < n; i++) {
        t = n === 1 ? 0 : i / (n - 1);
        c = cov + (cov2 - cov) * t;
        if (soft > 0 && t > 1 - soft) c *= (1 - t) / soft;     // the leading edge feathers out
        if (c <= 0.002) continue;
        b = a + span * (i / n);
        g.fillStyle = K.tone(c);
        if (dir === "x") g.fillRect(b, 0, Math.ceil(span / n) + 1, h);
        else g.fillRect(0, b, w, Math.ceil(span / n) + 1);
      }
    }, { ink: ink, slot: o.slot || ("wash-" + ink), layer: o.layer || "under", alpha: o.alpha, seed: o.seed,
         key: "wash|" + ink + "|" + cov.toFixed(3) + "|" + cov2.toFixed(3) + "|" + from.toFixed(3) + "|" + to.toFixed(3) + "|" + soft.toFixed(3) + "|" + dir });
  };

  /* ---------------------------------------------------------------------------
     screen(): anything you can draw, screened into real ink
     ---------------------------------------------------------------------------
     The general form under wash(), and the hole in round one's toolkit. You draw
     SHAPES IN BLACK ALPHA; the engine turns the alpha into that ink's halftone dots,
     grain and starvation.

       draw(g, w, h, K)   g is a 2d context in CSS px. Coverage is alpha: use
                          K.tone(0.7), not a colour. Everything else on K is the
                          engines' own kit (K.ease, K.clamp, K.rand, K.text,
                          K.font, K.rgb, K.pat, K.tile, K.lerp, K.smooth).
       opts.ink    a reel ink name (default "win")
       opts.seed   the grain and the specks; deterministic
       opts.key    give the slot a cache key, so a repaint with the same inputs is
                   free. Without one it repaints every call (correct, just not cheap).
       opts.slot / layer / alpha / wipe

     -> true when it painted. */
  api.screen = function (x, el, draw, opts) {
    return run("screen", false, function () {
      var o = opts || {}, slot = o.slot || "screen", layer = o.layer || "under";
      var R = eng(x, "T82RISO"), ok = false;
      if (!R || !R.kit || !el || typeof draw !== "function" || !supported(x)) return false;
      var key = o.key ? String(o.key) : null;

      whenSized(el, function (b) {
        if (key && held(el, slot, key)) { ok = true; return; }
        var d = dprOf(x), c = mount(el, slot, layer, b.w, b.h, d), g = ctxOf(c, 1, o.wipe !== false);
        if (!g) return;
        var K = R.kit(rootOf(el), g);
        var P = K.plate(b.w, b.h, (num(o.seed, hash("screen/" + slot)) >>> 0));
        // screenCanvas builds its own canvas at the plate size and hands it back fully
        // screened. Composing it in is one drawImage.
        var sc = K.screen(P, typeof o.ink === "string" ? o.ink : "win", function (sg) { draw(sg, b.w, b.h, K); });
        if (!sc) return;
        if (o.alpha !== undefined) g.globalAlpha = clamp01(num(o.alpha, 1));
        g.globalCompositeOperation = "source-over";
        g.drawImage(sc, 0, 0, c.width, c.height);
        if (key) stamp(c, key); else c.removeAttribute(KEY);
        ok = true;
      });
      return ok;
    });
  };

  /* ---------------------------------------------------------------------------
     strip(): a reel month strip
     ---------------------------------------------------------------------------
     T82RISO.strip() returns a finished, settled canvas synchronously: the ledger of
     wins and losses as stamped dots, in the dot set of your choice. On a leaderboard
     this is a row's whole season at a glance, and it is the one piece of art here
     that is content rather than ground, so it flows by default instead of layering.

       opts.games    82 entries, or a string of 0s and 1s, or a number of wins
       opts.wins     with no games: season(wins, seed) shapes one
       opts.dots     a dot set id from catalog(win, "dots"), or absent for classic
       opts.cssW     the strip's width in CSS px (default: the element's)
       opts.mi       the month index: it seeds the stamps' jitter
       opts.gi0/cl0  the first game's index and the losses before it
       opts.slot / layer ("flow" by default)

     -> true when it painted. */
  api.strip = function (x, el, opts) {
    return run("strip", false, function () {
      var o = opts || {}, slot = o.slot || "strip", layer = o.layer || "flow";
      var R = eng(x, "T82RISO"), ok = false;
      if (!R || !R.strip || !el || !supported(x)) return false;

      var games = o.games;
      if (typeof games === "string") games = games.split("").map(Number);
      if (!games || !games.length) games = api.season(o.wins, o.seed);
      if (!games) return false;
      games = [].slice.call(games).map(function (g) { return g ? 1 : 0; });

      var dots = typeof o.dots === "string" && o.dots ? o.dots : null;
      if (dots && !whenLoaded(x, "dots", dots, function () { api.strip(x, el, opts); })) return false;

      var key = "strip|" + games.join("") + "|" + (dots || "classic") + "|" + num(o.mi, 0) + "|" + num(o.cssW, -1);

      whenSized(el, function (b) {
        if (held(el, slot, key)) { ok = true; return; }
        var d = dprOf(x), cssW = Math.max(120, Math.round(num(o.cssW, b.w)));
        var src = R.strip({ root: rootOf(el), games: games, streaks: o.streaks || [], gi0: num(o.gi0, 0),
          cl0: num(o.cl0, 0), mi: num(o.mi, 0), cssW: cssW, d: d, dots: dots || undefined });
        if (!src || !src.width) { note("strip", "the reel engine returned nothing"); return; }
        var sw = src.width / d, sh = src.height / d;
        var c = mount(el, slot, layer, sw, sh, d), g = ctxOf(c, 1, true);
        if (!g) return;
        if (o.alpha !== undefined) g.globalAlpha = clamp01(num(o.alpha, 1));
        g.drawImage(src, 0, 0);
        stamp(c, key);
        ok = true;
      });
      return ok;
    });
  };

  /* ---------------------------------------------------------------------------
     hot(): one of the 8 heat effects, as a reward
     ---------------------------------------------------------------------------
     T82FX paints on its own full-page layer, over everything, aimed at an element. It
     is a BEAT, not a render: call it from a tap, never from a render pass, or the
     board will fire fireworks every time the recipe changes.

       id     from catalog(win, "hot"): arcade comicheat emojifire jam phoenix pulse
              solar thermo
       slot   "cold" | "warm" | "hot" | "fire" | "nova" | "save" | "miss"
              (T82FX.slots has the live list)
       el     what it plays over
     -> milliseconds it will run, 0 when it did not play. */
  api.hot = function (x, id, slot, el, opts) {
    return run("hot:" + id, 0, function () {
      var F = eng(x, "T82FX"), o = opts || {}, ms;
      if (!F || !F.play || !el) return 0;
      if (typeof id === "string" && id) {
        whenLoaded(x, "hot", id, function () { try { F.prime("hot", id); } catch (e) {} });
        try { F.prime("hot", id); } catch (e) {}
      }
      var call = {};
      for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) call[k] = o[k];
      if (typeof id === "string" && id) call.id = id;
      ms = +F.play("hot", slot, el, call) || 0;
      if (!ms) note("hot:" + id, "slot " + slot + " did not play");
      return ms;
    });
  };
  api.slots = function (x) {
    return run("slots", {}, function () {
      var F = eng(x, "T82FX");
      return (F && F.slots) ? F.slots : {};
    });
  };

  /* take every canvas this file put on an element back off. slot names one. */
  api.clear = function (el, slot) {
    return run("clear", false, function () {
      var kids, i, c, out = [];
      if (!el || !el.children) return false;
      kids = el.children;
      for (i = 0; i < kids.length; i++) {
        c = kids[i];
        if (c.nodeName === "CANVAS" && c.hasAttribute(ATTR) && (!slot || c.getAttribute(ATTR) === slot)) out.push(c);
      }
      for (i = 0; i < out.length; i++) {
        out[i].width = 0; out[i].height = 0;        // free the pixels, the way the engines do
        if (out[i].parentNode) out[i].parentNode.removeChild(out[i]);
      }
      return out.length > 0;
    });
  };

  /* the last 48 things that did not work, for the lab's own console. Nothing in this
     file ever reaches window.console. */
  api.trace = function () { return TRACE.slice(); };

  /* All 43 ids of the "loss" kind, every one of which draws an L or the word LOSS.
     This is a warning list, not a palette. See the header. */
  api.LETTER = ["bigtype", "blot", "brayer", "brush", "copier", "crumple", "drum", "extrude", "fold", "fountain",
    "gangrun", "ghosting", "headline", "knockout", "linescreen", "marbling", "melt", "misfeed", "moire", "opart",
    "overprint", "polaroid", "ransom", "receipt", "ripple", "rundry", "scratch", "seal", "separation", "setoff",
    "showthrough", "spill", "spray", "square", "squeegee", "stencil", "sticker", "tape", "tear", "testsheet",
    "trim", "typewriter", "woodtype"];

  /* The subset whose hero is a SURFACE accident over the whole frame rather than a
     letter standing alone, so the L is incidental and the ink is the point. Read off
     each file's own `by:` line. Still has an L in it: use these behind heavy type, at
     a low alpha, or cropped. If you want ink with no letter at all, use wash(). */
  api.SURFACE = ["copier", "ghosting", "linescreen", "marbling", "misfeed", "moire", "opart", "overprint",
    "ripple", "rundry", "separation", "setoff", "showthrough", "testsheet"];

  return api;
})();
