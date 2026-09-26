/* ---------- TRUE 82 LAB: the banner composer ----------
   Turns a recipe into a riso print of the masthead. Everything is a registry
   so concepts, palettes, fonts, layouts and additions can be added by
   separate files:

     LAB.palette({ id, name, group, blurb, stock, darkMode, inks: { key, a, b, c }, map: {...}, sys: {...} })
     LAB.font({ id, name, family, weight, style, note })
     LAB.layout({ id, name, vh, place(A) -> boxes, frame(A)?, after(A)? })
     LAB.concept({ id, name, blurb, draw(K) })
     LAB.addition({ id, name, group, when: 'back' | 'front', draw(A) })

   Roles. Every mark on the print belongs to a role; the palette's map sends
   each role to one of its inks (slots key, a, b, c):
     word    the wordmark face            word82  the "82" when printed apart
     depth   extrusions, offsets, echoes  shade   halftone shadows and tones
     body    the icon's main mass         line    the icon's drawn lines
     glow    auras, rays, highlights      accent  a third icon color
     frame   layout frames and rules      tag     the tagline and small type
     back    backdrops (sky, sun, court)

   Concept contract (the icon lives in a 100 x 100 box, y down):
     draw(K) calls K.part(partName, fn) for each part, where partName is one of
       'body' | 'line' | 'shade' | 'glow' | 'accent' | 'paper'
     'paper' knocks through every ink (true paper-white gaps).
     fn(g, S) draws in local units with g (a 2D context already transformed).
     Use S.fill(g) and S.stroke(g, width) instead of g.fill() / g.stroke(), so
     icon styles (line art, neon, stamp...) can reinterpret the geometry.
     Use S.tone(a) and S.lin / S.rad (stops are [offset, tone]) for tone.
     S.style is the icon style id; S.rnd() is a seeded random; S.t is 0; S.dark is true
     on dark stock (paper knocks then print dark, and light inks sit on top).
     Everything a concept draws must stay inside the 100 x 100 box, except
     glow, which may bleed to about 30 units outside it.

   Wordmark recipe values (LAB.OPTIONS lists them with plain names for the console):
     depth    flat | offset | block | extrude | 3d-shade | fade | shadow | echo | stack | outline | split | chrome
                offset    a solid copy of the word in the depth ink, overprinted (the riso offset)
                block     the same copy with the face knocked out of it (clean two-color block)
                extrude   real block letters: a solid extrusion, face knocked out with a paper hairline
                3d-shade  the extrusion lit from above: walls facing the light print as a light tint
                fade      the extrusion falls away into halftone dots
                shadow    a soft halftone drop shadow in the shade ink
                echo      three copies stepping back, each cut from the next by a paper gap
                stack     three hollow outlines stepping back, plus an outline around the face
                outline   the face as an outline, filled with the depth ink off register
                split     a split fountain: the key ink at the top melts into the depth ink below
                chrome    80s chrome: sky half, paper horizon, striped ground half, block shadow
     depthDist 0..1 (how far), depthAng degrees (0 = right, 90 = down)
     shape    straight | slant | arch | vertical | bridge | rise | wave
                arch      letters on a curve, turned to follow it     vertical  jersey arch: upright letters on a curve
                bridge    flat baseline, tops rising to the middle   rise      letters grow left to right
     lines    one | two   (two: the name over a big 82, both lines the same width)
     wordTex  solid | ramp | inline | bulbs | pinstripe | lines | shine | distress | neon | glow
                inline    a paper hairline inside every letter       shine     two paper glints across the face (a light ink on dark stock)
                neon      (v53) not printed: the letters are lit glass tubes along their outlines, drawn over the print
                          after it is composed (a glow in the ink, the tube, a pale core), no screen, no depth
                glow      (v53) not printed: solid lit letters, a pale core in the ink with the ink's glow around it
     neonInk  print | icon   (v53, neon words only) print: the word's and the 82's inks; icon: the icon's body and line
                inks (the ball and the hoop), so the sign matches the mark
     ink82    word | a | b | outline
     iconDepth match | none | offset | block | extrude | shadow   (match: the word's depth, as close as the icon allows)
     tooth    0..2, the paper's fibres (was "texture", which is now the site's texture; a number there still works)

   Layout boxes (place(A) returns them; scene is 1000 wide, vh tall):
     vh, word {x, y, w, h, align?: 'left'|'right', lines?: 'two', circle?: {cx, cy, r, band, span, side: 'top'|'bottom'}},
     wordShape (overrides the recipe shape; 'circle' sets the word around box.word.circle),
     icon {x, y, s}, tag {x, y, w, h, arc?: {cx, cy, r, side, span}, knock?: true},
     lockup {order: 'word-icon' | 'icon-word', gap}  (after the word is fit, pack word and icon tightly and center them),
     wordPaper: true  (the face is paper: the layout knocks A.word.full and the face ink is not printed),
     wordRole: '<role>'  (print the face in another role, e.g. 'body' for lamp letters),
     backClip(g)  (a framed layout's window: builds a path; backdrops stay inside it instead of fading at the plate edges).
   place(A) may read A.wordAspect (width over height of the stacked two-line word with its depth, set only when
   rc.lines is 'two'), to size the scene so a two-line lockup fills the plate.
   After place, the icon is kept on the plate by its real ink bounds and depth (a tall icon or a big iconScale
   shrinks to fit), and a lockup counts a backdrop disc wider than the icon (LAB.backdropReach) as icon width.
   The word is fit to its box using the real ink bounds of every glyph, the shape and the depth, so nothing overflows.
   A.word (after place) has: glyphs, size, bounds, reach (bounds with depth), full(g, grow) (face plus depth,
   for knocks), face(g, which) (the face with its surface), sil(which)(g, dx, dy, grow).
   LAB.kit has shared drawing helpers for layouts and additions: isolate, spaced, arcText, ribbon.
*/
(function () {
  "use strict";
  var R = window.RISO, TAU = Math.PI * 2;
  var LAB = window.LAB = window.LAB || {};
  LAB.palettes = LAB.palettes || {}; LAB.fonts = LAB.fonts || {}; LAB.layouts = LAB.layouts || {};
  LAB.concepts = LAB.concepts || {}; LAB.additions = LAB.additions || {};
  LAB.order = LAB.order || { palettes: [], fonts: [], layouts: [], concepts: [], additions: [] };
  function reg(kind, def) { if (!LAB[kind][def.id]) LAB.order[kind].push(def.id); LAB[kind][def.id] = def; return def; }
  LAB.palette = function (d) { return reg("palettes", d); };
  LAB.font = function (d) { return reg("fonts", d); };
  LAB.layout = function (d) { return reg("layouts", d); };
  LAB.concept = function (d) { return reg("concepts", d); };
  LAB.addition = function (d) { return reg("additions", d); };

  var ROLES = ["word", "word82", "depth", "shade", "body", "line", "glow", "accent", "frame", "tag", "back"];
  var DEFAULT_MAP = { word: "key", word82: "key", depth: "a", shade: "a", body: "b", line: "key", glow: "a", accent: "a", frame: "key", tag: "a", back: "a" };

  /* ---- the default recipe ---- */
  LAB.DEFAULT = {
    palette: "printshop", stock: "auto", darkMode: "auto",
    layout: "inline", font: "barlow", font82: "match", ink82: "word", word: "TRUE 82", track: 0.04, shape: "straight", lines: "one", wordTex: "solid", neonInk: "print",
    depth: "offset", depthDist: 0.5, depthAng: 35,
    concept: "hoop-star", iconStyle: "print", iconDepth: "match", iconScale: 1,
    backdrop: "none", adds: ["star"], tagline: "THE 82-0 CHASE",
    reg: 1.2, regDir: 30, pitch: 2.4, grain: 1, starve: 1, tooth: 1, screen: "dot",
    motion: "none", seed: 7
  };
  // The paper's tooth (0..2) is "tooth"; older recipes carried it as a number in "texture" (now the site's texture).
  LAB.recipe = function (r) {
    var o = {}, k; for (k in LAB.DEFAULT) o[k] = LAB.DEFAULT[k]; for (k in (r || {})) if (r[k] !== undefined) o[k] = r[k];
    if (typeof o.texture === "number") { if (!r || r.tooth == null) o.tooth = o.texture; o.texture = LAB.DEFAULT.texture; }
    if (!Array.isArray(o.adds)) o.adds = []; return o;
  };

  // Every value of the wordmark keys, with a plain name (for the console).
  LAB.OPTIONS = {
    depth: [["flat", "Flat"], ["offset", "Offset"], ["block", "Block"], ["extrude", "Extrude"], ["3d-shade", "Lit 3D"], ["fade", "Fade"], ["shadow", "Soft shadow"],
      ["echo", "Echo"], ["stack", "Stack"], ["outline", "Outline"], ["split", "Split ink"], ["chrome", "Chrome"]],
    wordTex: [["solid", "Solid"], ["ramp", "Halftone ramp"], ["inline", "Inline"], ["bulbs", "Bulbs"], ["pinstripe", "Pinstripe"], ["lines", "Racing lines"], ["shine", "Shine"], ["distress", "Worn"],
      ["neon", "Neon tubes"], ["glow", "Neon glow"]],
    shape: [["straight", "Straight"], ["slant", "Slant"], ["arch", "Arch"], ["vertical", "Jersey arch"], ["bridge", "Bridge"], ["rise", "Rise"], ["wave", "Wave"]],
    iconDepth: [["match", "Match word"], ["none", "None"], ["offset", "Offset"], ["block", "Block"], ["extrude", "Extrude"], ["shadow", "Soft shadow"]]
  };

  /* ---- fonts ---- */
  var measureCtx = null;
  function mctx() { if (!measureCtx) measureCtx = R.cv(8, 8).getContext("2d"); return measureCtx; }
  function fontCSS(f, size) { return (f.style || "normal") + " " + (f.weight || 700) + " " + (+size).toFixed(2) + "px \"" + f.family + "\", \"Arial Narrow\", sans-serif"; }
  var fontWait = {};
  LAB.loadFont = function (f) {
    if (!f) return Promise.resolve();
    var key = fontCSS(f, 100);
    if (fontWait[key]) return fontWait[key];
    fontWait[key] = new Promise(function (res) {
      if (!document.fonts || !document.fonts.load) { res(); return; }
      var done = false, fin = function () { if (!done) { done = true; res(); } };
      document.fonts.load(key, "TRUE82").then(fin, fin);
      setTimeout(fin, 4000);
    });
    return fontWait[key];
  };
  LAB.fontList = function () { return LAB.order.fonts.map(function (id) { return LAB.fonts[id]; }); };
  // Faces a site heading may use (a face with display: false is masthead-only), and the heading face a
  // recipe asks for: rc.disp, or the wordmark's face for "match", falling back to Barlow Condensed when
  // that face is masthead-only or unknown.
  LAB.displayFonts = function () { return LAB.fontList().filter(function (f) { return f && f.display !== false; }); };
  LAB.displayFace = function (rc) {
    var id = rc && rc.disp && rc.disp !== "match" ? rc.disp : rc && rc.font, f = LAB.fonts[id];
    return f && f.display !== false ? f : LAB.fonts.barlow;
  };
  // True when the face itself renders (not a fallback): compares against two different fallbacks.
  LAB.fontRenders = function (f) {
    var m = mctx(), s = "TRUE 82", w = [];
    ["monospace", "serif"].forEach(function (fb) { m.font = (f.style || "normal") + " " + (f.weight || 700) + " 40px \"" + f.family + "\", " + fb; w.push(m.measureText(s).width); });
    return Math.abs(w[0] - w[1]) < 0.01;
  };
  var capCache = {};
  function capHeight(f) {                             // cap height as a fraction of the font size
    var k = f.family + "|" + f.weight + "|" + f.style;
    if (capCache[k]) return capCache[k];
    var m = mctx(); m.font = fontCSS(f, 100);
    var mt = m.measureText("H"), v = (mt.actualBoundingBoxAscent || 70) / 100;
    if (!(v > 0.2 && v < 1.5)) v = 0.7;
    if (LAB.fontRenders(f)) capCache[k] = v;
    return v;
  }

  /* ---- scratch canvases and shared drawing helpers ---- */
  // Scratch canvases. Drawing scratches are GPU canvases (fast bitmap copies); pass cpu = true for one
  // that will be read back with getImageData.
  var pool = [];
  function takeScratch(w, h, cpu) {
    cpu = !!cpu;
    for (var i = 0; i < pool.length; i++) if (pool[i].cpu === cpu && pool[i].c.width === w && pool[i].c.height === h) {
      var s = pool.splice(i, 1)[0], x = s.x;
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = "source-over"; x.shadowBlur = 0; x.shadowColor = "rgba(0,0,0,0)";
      x.shadowOffsetX = 0; x.shadowOffsetY = 0; x.clearRect(0, 0, w, h); x.fillStyle = "#000"; x.strokeStyle = "#000"; x.lineJoin = "round"; x.lineCap = "round";
      return s;
    }
    var c = R.cv(w, h), cx = c.getContext("2d", cpu ? { willReadFrequently: true } : undefined);
    cx.fillStyle = "#000"; cx.strokeStyle = "#000"; cx.lineJoin = "round"; cx.lineCap = "round";
    return { c: c, x: cx, cpu: cpu };
  }
  function giveScratch(s) { pool.push(s); if (pool.length > 8) pool.shift(); }
  // Draw fn into a private canvas (same size and transform as g), then lay the result onto g with g's
  // current composite mode. Effects inside fn (destination-in, knocks) touch only what fn drew.
  function isolate(g, fn) {
    var s = takeScratch(g.canvas.width, g.canvas.height);
    s.x.setTransform(g.getTransform());
    fn(s.x, s);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.shadowBlur = 0; g.shadowColor = "rgba(0,0,0,0)"; g.drawImage(s.c, 0, 0); g.restore();
    giveScratch(s);
  }
  // Letterspaced single-line text fit to a box. o: { font (css family), weight, size, track (x size), align, maxW, grow (stroke width, for knocks) }
  function spaced(g, text, x, y, o) {
    o = o || {};
    var size = o.size || 20, fam = o.font || "\"IBM Plex Mono\", monospace", wt = o.weight || 600, tr = o.track == null ? 0.3 : o.track, i, w = 0;
    g.font = wt + " " + size + "px " + fam; g.textBaseline = o.baseline || "middle"; g.textAlign = "left";
    for (i = 0; i < text.length; i++) w += g.measureText(text[i]).width + (i < text.length - 1 ? size * tr : 0);
    if (o.maxW && w > o.maxW) { var k = o.maxW / w; size *= k; w = o.maxW; g.font = wt + " " + size + "px " + fam; }
    var cx = o.align === "left" ? x : o.align === "right" ? x - w : x - w / 2;
    if (o.grow) { g.lineWidth = o.grow; g.lineJoin = "round"; }
    for (i = 0; i < text.length; i++) { g.fillText(text[i], cx, y); if (o.grow) g.strokeText(text[i], cx, y); cx += g.measureText(text[i]).width + size * tr; }
    return { w: w, size: size };
  }
  // Text on a circle. o: { cx, cy, r (baseline radius), side: 'top' (reads clockwise over the top) | 'bottom'
  // (reads left to right under the bottom, upright), size, font, weight, track, span (max radians) }
  function arcText(g, text, o) {
    var size = o.size || 20, fam = o.font || "\"IBM Plex Mono\", monospace", wt = o.weight || 600, tr = o.track == null ? 0.25 : o.track, i, L = 0, ws = [];
    g.font = wt + " " + size + "px " + fam;
    for (i = 0; i < text.length; i++) { ws.push(g.measureText(text[i]).width); L += ws[i] + (i < text.length - 1 ? size * tr : 0); }
    if (o.span && L / o.r > o.span) { var k = o.span * o.r / L; size *= k; L *= k; for (i = 0; i < ws.length; i++) ws[i] *= k; g.font = wt + " " + size + "px " + fam; }
    g.textAlign = "center"; g.textBaseline = "alphabetic";
    var s = -L / 2;
    for (i = 0; i < text.length; i++) {
      var a = (s + ws[i] / 2) / o.r;
      g.save();
      if (o.side === "bottom") { g.translate(o.cx + Math.sin(a) * o.r, o.cy + Math.cos(a) * o.r); g.rotate(-a); }
      else { g.translate(o.cx + Math.sin(a) * o.r, o.cy - Math.cos(a) * o.r); g.rotate(a); }
      g.fillText(text[i], 0, 0); if (o.grow) { g.lineWidth = o.grow; g.lineJoin = "round"; g.strokeText(text[i], 0, 0); } g.restore();
      s += ws[i] + size * tr;
    }
    return { size: size, span: L / o.r };
  }
  // A ribbon banner: a band from x0 to x1 (centerline at y at the ends) that sags by `sag` in the middle
  // (0: straight), height h, with folded tails behind both ends. Returns path builders and the text arc.
  function ribbon(o) {
    var x0 = o.x0, x1 = o.x1, y = o.y, h = o.h, sag = o.sag || 0, tail = o.tail == null ? h * 0.9 : o.tail, drop = h * 0.42, fold = h * 0.5;
    var hw = (x1 - x0) / 2, mx = (x0 + x1) / 2, curved = Math.abs(sag) > 0.5;
    var Rr = curved ? (hw * hw + sag * sag) / (2 * sag) : 0, cy = y + sag - Rr, th = curved ? Math.asin(hw / Rr) : 0;
    function band(g) {
      g.beginPath();
      if (!curved) { g.rect(x0, y - h / 2, x1 - x0, h); return; }
      // canvas angle for a point at angle t from straight down: PI/2 - t
      g.arc(mx, cy, Rr - h / 2, Math.PI / 2 + th, Math.PI / 2 - th, true);
      g.arc(mx, cy, Rr + h / 2, Math.PI / 2 - th, Math.PI / 2 + th, false);
      g.closePath();
    }
    function end(g, side, fn) {                     // local frame at one end: x outward along the band, y down (away from the center)
      var t = side * th, px = curved ? mx + Math.sin(t) * Rr : (side > 0 ? x1 : x0), py = curved ? cy + Math.cos(t) * Rr : y;
      g.save(); g.translate(px, py); g.rotate(curved ? -t : 0); if (side < 0) g.scale(-1, 1);
      fn(g); g.restore();
    }
    function tails(g) {
      [-1, 1].forEach(function (sd) {
        end(g, sd, function (q) {
          q.moveTo(-fold, -h / 2 + drop); q.lineTo(tail, -h / 2 + drop); q.lineTo(tail - h * 0.32, drop); q.lineTo(tail, h / 2 + drop); q.lineTo(-fold, h / 2 + drop); q.closePath();
        });
      });
    }
    function folds(g) {
      [-1, 1].forEach(function (sd) { end(g, sd, function (q) { q.moveTo(0, h / 2); q.lineTo(0, h / 2 + drop); q.lineTo(-fold, h / 2); q.closePath(); }); });
    }
    return {
      band: band, tails: function (g) { g.beginPath(); tails(g); }, folds: function (g) { g.beginPath(); folds(g); },
      arc: curved ? { cx: mx, cy: cy, r: Rr, span: 2 * th } : null, mid: { x: mx, y: y + sag }, h: h
    };
  }
  LAB.kit = { isolate: isolate, spaced: spaced, arcText: arcText, ribbon: ribbon, scratch: takeScratch, release: giveScratch };

  /* ---- glyph layout ---- */
  // Returns the laid-out word: glyphs with position, font and transform, its size and real ink bounds.
  // opt: { reach: [rx, ry] depth vector as a fraction of the size, pad: margin as a fraction of the size }
  function layoutWord(rc, box, shapeOverride, opt) {
    opt = opt || {};
    var fA = LAB.fonts[rc.font] || LAB.fonts.barlow, fB = rc.font82 === "match" ? fA : (LAB.fonts[rc.font82] || fA);
    var text = String(rc.word == null || rc.word === "" ? "TRUE 82" : rc.word), split = text.search(/\d/), m = mctx(), i;
    var shape = shapeOverride || rc.shape || "straight", S = 100, track = +rc.track || 0;
    var circle = shape === "circle" && box.circle;
    var two = !circle && (box.lines || rc.lines) === "two" && split > 0;
    var parts = [];
    for (i = 0; i < text.length; i++) parts.push({ ch: text[i], f: split >= 0 && i >= split ? fB : fA, is82: split >= 0 && i >= split, scale: 1 });
    function trim(l) { while (l.length && l[0].ch === " ") l = l.slice(1); while (l.length && l[l.length - 1].ch === " ") l = l.slice(0, -1); return l; }
    var lines = (two ? [parts.slice(0, split), parts.slice(split)] : [parts]).map(trim).filter(function (l) { return l.length; });
    m.textAlign = "center"; m.textBaseline = "alphabetic";
    function measure(p) {
      var sz = S * p.scale; p.size = sz; p.dy = 0;
      if (p.ch === " ") { p.adv = sz * 0.28; p.l = p.r = p.asc = p.desc = 0; p.blank = true; return; }
      m.font = fontCSS(p.f, sz); var mt = m.measureText(p.ch);
      p.adv = mt.width; p.l = mt.actualBoundingBoxLeft || mt.width / 2; p.r = mt.actualBoundingBoxRight || mt.width / 2;
      p.asc = mt.actualBoundingBoxAscent || sz * 0.7; p.desc = mt.actualBoundingBoxDescent || 0;
    }
    function lineW(l) { var w = 0; l.forEach(function (p, j) { w += p.adv + (j < l.length - 1 ? track * p.size : 0); }); return w; }
    lines.forEach(function (l) { l.forEach(measure); });
    if (two) {                                        // the 82 line grows until both lines share one width
      var k2 = R.clamp(lineW(lines[0]) / Math.max(1, lineW(lines[1])), 1.2, 2.6);
      lines[1].forEach(function (p) { p.scale *= k2; measure(p); });
    }
    // figures stand as tall as the caps (old-style and short figures in some faces)
    lines.forEach(function (l) { l.forEach(function (p) {
      if (p.blank || !/\d/.test(p.ch)) return;
      var cap = capHeight(p.f) * p.size, hh = p.asc + p.desc;
      if (hh > 0 && hh < cap * 0.86) { var d0 = p.desc; p.scale *= Math.min(1.5, cap / hh); measure(p); p.dy = -p.desc; p.asc += p.desc; p.desc = 0; if (!d0) p.dy = 0; }
    }); });
    // straight layout, each line centered on x = 0, first baseline at y = 0
    var G = [], base = 0;
    lines.forEach(function (l, li) {
      var asc = 0, desc = 0;
      l.forEach(function (p) { if (!p.blank) { asc = Math.max(asc, p.asc); desc = Math.max(desc, p.desc); } });
      if (li) base += asc + Math.max(6, 0.12 * capHeight(fA) * S);
      var w = lineW(l), x = -w / 2, n = l.length;
      l.forEach(function (p, j) {
        if (!p.blank) G.push({ p: p, line: li, cx: x + p.adv / 2, by: base, u: w ? (x + p.adv / 2) / (w / 2) : 0, lw: w, asc: asc, rot: 0, sx: 1, sy: 1, skew: 0 });
        x += p.adv + (j < n - 1 ? track * p.size : 0);
      });
      base += desc;
    });
    // shapes
    var k = 1, ox = 0, oy = 0;
    if (circle) {
      var C = box.circle, cap0 = capHeight(fA), ks = C.band / (cap0 * S), L = 0, r0 = C.r;
      var l0 = parts.filter(function (p) { return true; });
      l0 = trim(l0);
      l0.forEach(function (p, j) { L += (p.adv + (j < l0.length - 1 ? track * p.size : 0)) * ks; });
      if (C.span && L / r0 > C.span) ks *= C.span * r0 / L, L = C.span * r0;
      G = []; var s = -L / 2;
      l0.forEach(function (p, j) {
        var a = (s + p.adv * ks / 2) / r0;
        if (!p.blank) {
          if (C.side === "bottom") G.push({ p: p, cx: C.cx + Math.sin(a) * r0, by: C.cy + Math.cos(a) * r0, rot: -a, sx: 1, sy: 1, skew: 0, ks: ks });
          else G.push({ p: p, cx: C.cx + Math.sin(a) * r0, by: C.cy - Math.cos(a) * r0, rot: a, sx: 1, sy: 1, skew: 0, ks: ks });
        }
        s += (p.adv + (j < l0.length - 1 ? track * p.size : 0)) * ks;
      });
    } else G.forEach(function (q) {
      var shp = shape;
      if (two && q.line > 0 && (shp === "arch" || shp === "vertical" || shp === "bridge")) shp = "straight";   // the arch rides the top line, jersey style
      var u = q.u, Rr = q.lw * (box.archK || 1.15), am = Math.min(1.4, q.lw / 2 / Rr), drop = Rr - Math.cos(am) * Rr;
      if (shp === "slant") q.skew = -0.21;
      else if (shp === "arch") { var a = q.cx / Rr; q.cx = Math.sin(a) * Rr; q.by = q.by - drop + Rr - Math.cos(a) * Rr; q.rot = a; }   // ends sit on the baseline, the middle rises
      else if (shp === "vertical") { var xx = R.clamp(q.cx / Rr, -0.95, 0.95); q.by = q.by - drop + Rr - Math.sqrt(1 - xx * xx) * Rr; }
      else if (shp === "bridge") { q.sy = 1 + 0.34 * (1 - u * u); }
      else if (shp === "rise") { q.sy = 0.8 + 0.4 * (u + 1) / 2; }
      else if (shp === "taper") { q.sy = 1 - 0.34 * (u + 1) / 2; q.by -= q.asc * (1 - q.sy) / 2; }   // shrinks toward the tip, centered (the pennant)
      else if (shp === "wave") { q.by += Math.sin(u * 3.1) * q.asc * 0.09; q.rot = Math.cos(u * 3.1) * 0.05; }
    });
    // real ink bounds of every glyph, through its transform
    function corners(q, kk, ox2, oy2) {
      var p = q.p, sc = (q.ks || 1), pts = [[-p.l, -p.asc], [p.r, -p.asc], [p.r, p.desc], [-p.l, p.desc]], out = [];
      var c = Math.cos(q.rot), s2 = Math.sin(q.rot);
      pts.forEach(function (pt) {
        var x = pt[0] * q.sx * sc, y = pt[1] * q.sy * sc; x += q.skew * y;
        out.push([(q.cx + x * c - y * s2) * kk + ox2, (q.by + x * s2 + y * c) * kk + oy2]);
      });
      return out;
    }
    function bbox(list) {
      var b = [1e9, 1e9, -1e9, -1e9];
      list.forEach(function (q) { corners(q, 1, 0, 0).forEach(function (pt) { b[0] = Math.min(b[0], pt[0]); b[1] = Math.min(b[1], pt[1]); b[2] = Math.max(b[2], pt[0]); b[3] = Math.max(b[3], pt[1]); }); });
      return b;
    }
    var fb = bbox(G), sizeAvg = 0, wsum = 0;
    G.forEach(function (q) { sizeAvg += q.p.size * (q.ks || 1) * q.p.adv; wsum += q.p.adv; });
    sizeAvg = wsum ? sizeAvg / wsum : S;
    if (!circle) {
      var rx = (opt.reach ? opt.reach[0] : 0) * sizeAvg, ry = (opt.reach ? opt.reach[1] : 0) * sizeAvg, pad = (opt.pad || 0) * sizeAvg;
      var ux0 = Math.min(fb[0], fb[0] + rx) - pad, uy0 = Math.min(fb[1], fb[1] + ry) - pad, ux1 = Math.max(fb[2], fb[2] + rx) + pad, uy1 = Math.max(fb[3], fb[3] + ry) + pad;
      var bw = Math.max(1, ux1 - ux0), bh = Math.max(1, uy1 - uy0);
      k = Math.min(box.w / bw, box.h / bh);
      if (box.maxSize) k = Math.min(k, box.maxSize / S);
      var free = box.w - bw * k;
      ox = box.x + (box.align === "left" ? 0 : box.align === "right" ? free : free / 2) - ux0 * k;
      oy = box.y + (box.h - bh * k) / 2 - uy0 * k;
    }
    var glyphs = G.map(function (q) {
      var p = q.p, sz = p.size * (q.ks || 1) * k, cx = q.cx * k + ox, by = q.by * k + oy;
      return { ch: p.ch, x: cx - p.adv * (q.ks || 1) * k / 2, y: by, w: p.adv * (q.ks || 1) * k, rot: q.rot, sx: q.sx, sy: q.sy, skew: q.skew,
        font: fontCSS(p.f, sz), is82: p.is82, size: sz, dy: p.dy * (q.ks || 1) * k,
        box: (function () { var cs = corners(q, k, ox, oy), b = [1e9, 1e9, -1e9, -1e9]; cs.forEach(function (pt) { b[0] = Math.min(b[0], pt[0]); b[1] = Math.min(b[1], pt[1]); b[2] = Math.max(b[2], pt[0]); b[3] = Math.max(b[3], pt[1]); }); return b; })() };
    });
    var W = { glyphs: glyphs, size: sizeAvg * k, box: box, shape: shape, lines: lines.length, aspect: bw / bh };
    W.boundsOf = function (which) {
      var b = [1e9, 1e9, -1e9, -1e9];
      W.glyphs.forEach(function (gl) { if ((which === "true" && gl.is82) || (which === "82" && !gl.is82)) return; b[0] = Math.min(b[0], gl.box[0]); b[1] = Math.min(b[1], gl.box[1]); b[2] = Math.max(b[2], gl.box[2]); b[3] = Math.max(b[3], gl.box[3]); });
      if (b[0] > b[2]) return { x: box.x, y: box.y, w: 0, h: 0 };
      return { x: b[0], y: b[1], w: b[2] - b[0], h: b[3] - b[1] };
    };
    W.bounds = W.boundsOf("all");
    return W;
  }
  function shiftWord(W, dx, dy) {
    W.glyphs.forEach(function (gl) { gl.x += dx; gl.y += dy; gl.box[0] += dx; gl.box[2] += dx; gl.box[1] += dy; gl.box[3] += dy; });
    W.bounds.x += dx; W.bounds.y += dy; if (W.reach) { W.reach.x += dx; W.reach.y += dy; }
  }
  // Draw glyphs offset by (dx, dy); how: 'fill' | 'stroke' | 'grow' (fill plus a stroke of width lw);
  // which: 'all' | 'true' | '82'.
  function drawWord(g, W, dx, dy, how, which, lw) {
    W.glyphs.forEach(function (gl) {
      if (which === "true" && gl.is82) return;
      if (which === "82" && !gl.is82) return;
      g.save();
      g.translate(gl.x + gl.w / 2 + dx, gl.y + dy);
      if (gl.rot) g.rotate(gl.rot);
      if (gl.skew) g.transform(1, 0, gl.skew, 1, 0, 0);
      if (gl.sx !== 1 || gl.sy !== 1) g.scale(gl.sx, gl.sy);
      g.font = gl.font; g.textAlign = "center"; g.textBaseline = "alphabetic";
      var y0 = gl.dy || 0;
      if (how === "stroke") { g.lineWidth = lw || W.size * 0.04; g.lineJoin = "round"; g.strokeText(gl.ch, 0, y0); }
      else if (how === "grow") { g.fillText(gl.ch, 0, y0); if (lw > 0) { g.lineWidth = lw; g.lineJoin = "round"; g.strokeText(gl.ch, 0, y0); } }
      else g.fillText(gl.ch, 0, y0);
      g.restore();
    });
  }

  /* ---- the job: collect draws per ink plate ---- */
  function Job(rc, pal) {
    this.rc = rc; this.pal = pal; this.plates = {}; this.keys = [];
    this.map = {}; var k; for (k in DEFAULT_MAP) this.map[k] = DEFAULT_MAP[k]; for (k in (pal.map || {})) this.map[k] = pal.map[k];
    this.slots = ["key", "a", "b", "c", "d"].filter(function (s) { return pal.inks[s]; });
  }
  Job.prototype.slotOf = function (role) {
    var s = this.map[role] || "key";
    if (!this.pal.inks[s]) s = "key";
    return s;
  };
  // put(role, fn, opt): opt.flat (hard threshold), opt.lines (line screen)
  Job.prototype.put = function (role, fn, opt) {
    var slot = role === "*" ? "*" : this.slotOf(role);
    var targets = slot === "*" ? this.slots : [slot], self = this;
    targets.forEach(function (s) {
      var key = s + (opt && opt.flat ? "|f" : "") + (opt && opt.lines ? "|l" : "");
      if (!self.plates[key]) { self.plates[key] = { slot: s, flat: !!(opt && opt.flat), lines: !!(opt && opt.lines), fns: [] }; self.keys.push(key); }
      self.plates[key].fns.push(fn);
    });
  };
  Job.prototype.putSlot = function (slot, fn, opt) {
    if (!this.pal.inks[slot]) return;
    var key = slot + (opt && opt.flat ? "|f" : "");
    if (!this.plates[key]) { this.plates[key] = { slot: slot, flat: !!(opt && opt.flat), lines: false, fns: [] }; this.keys.push(key); }
    this.plates[key].fns.push(fn);
  };
  // A knock through every plate (paper-white), applied in draw order.
  Job.prototype.knockAll = function (fn) { var self = this; this.keys.forEach(function (k) { self.plates[k].fns.push(function (g) { R.knock(g, fn); }); }); };

  /* ---- icon kit ---- */
  function makeStyle(rc, mode, rnd) {
    var st = rc.iconStyle, flatish = st === "flat" || st === "stamp" || st === "sticker" || st === "cut";
    var S = {
      style: st, mode: mode, t: 0, rnd: rnd, dark: !!(rc._darkStock),
      fill: function (g) {
        if (mode === "sil") { g.fill(); return; }
        if (st === "line" || st === "neon") { g.lineWidth = S.lineW; g.stroke(); return; }
        g.fill();
      },
      stroke: function (g, w) {
        g.lineWidth = (w || 2) * (mode === "sil" ? 1.2 : st === "line" ? 1.1 : 1);
        g.stroke();
      },
      tone: function (a) {
        if (mode === "sil") return R.tone(a > 0.12 ? 1 : 0);
        if (flatish) return R.tone(a >= 0.3 ? 1 : 0);
        return R.tone(a);
      },
      lin: function (g, x0, y0, x1, y1, stops) { return R.lgrad(g, x0, y0, x1, y1, mode === "sil" ? [[0, 1], [1, 1]] : stops); },
      rad: function (g, x, y, r0, r1, stops) { return R.rgrad(g, x, y, r0, r1, mode === "sil" ? [[0, 1], [1, 1]] : stops); },
      lineW: 3.2
    };
    return S;
  }
  // Run a concept into the job, placed in box {x, y, s}. mode: 'print' | 'sil' (silhouette into one role).
  function runConcept(job, concept, box, mode, silRole, silOpt, offset) {
    var rc = job.rc, st = rc.iconStyle, rnd = R.mulberry((rc.seed || 7) * 31 + 5);
    var S = makeStyle(rc, mode, rnd), rot = st === "stamp" ? -0.07 : 0;
    var flatish = st === "flat" || st === "stamp" || st === "sticker" || st === "cut";
    function wrap(fn) {
      return function (g) {
        g.save();
        g.translate(box.x + (offset ? offset[0] : 0), box.y + (offset ? offset[1] : 0));
        g.scale(box.s / 100, box.s / 100);
        if (rot) { g.translate(50, 50); g.rotate(rot); g.translate(-50, -50); }
        g.fillStyle = S.tone(1); g.strokeStyle = S.tone(1); g.lineJoin = "round"; g.lineCap = "round";
        if (st === "neon" && mode !== "sil") { g.shadowColor = "rgba(0,0,0,0.55)"; g.shadowBlur = 7 * Math.abs(g.getTransform().a); }
        fn(g, S);
        g.restore();
      };
    }
    var K = {
      part: function (name, fn) {
        if (mode === "sil") {
          if (name === "body" || name === "line" || name === "accent") job.put(silRole, wrap(fn), silOpt);
          return;
        }
        if (name === "paper") { job.knockAll(wrap(fn)); return; }
        if ((st === "line" || st === "neon") && name === "shade") return;
        var role = name === "body" ? "body" : name === "line" ? "line" : name === "shade" ? "shade" : name === "glow" ? "glow" : "accent";
        job.put(role, wrap(fn), { flat: flatish && name !== "glow", lines: st === "cut" && (name === "shade" || name === "body") ? false : st === "woodcut" && name !== "line" });
      }
    };
    concept.draw(K);
  }

  /* ---- depth: shared by the word and the icon ---- */
  // How far each treatment reaches, as a fraction of the thing's size (font size or icon size).
  function depthLen(mode, dist) {
    dist = dist == null ? 0.5 : +dist;
    switch (mode) {
      case "offset": return 0.01 + dist * 0.06;
      case "block": return 0.02 + dist * 0.1;
      case "outline": return 0.02 + dist * 0.08;
      case "extrude": case "fade": case "3d-shade": return 0.03 + dist * 0.17;
      case "shadow": return 0.02 + dist * 0.09;
      case "echo": return 0.09 + dist * 0.24;
      case "stack": return 0.08 + dist * 0.2;
      case "chrome": return 0.015 + dist * 0.06;
      default: return 0;
    }
  }
  function depthVec(mode, dist, ang) { var a = (ang == null ? 35 : +ang) * Math.PI / 180, L = depthLen(mode, dist); return [Math.cos(a) * L, Math.sin(a) * L]; }
  LAB.depthVec = depthVec;

  // Stamp a silhouette along (vx, vy) scene units, far end first, one device pixel per step, on whole
  // pixels. The silhouette is rasterized once; each step is a bitmap copy. each(g, t, stamp): t = 1 at the far end.
  function sweep(g, sil, bb, vx, vy, each, hard) {
    var tr = g.getTransform(), k = Math.abs(tr.a) || 1, cw = g.canvas.width, ch = g.canvas.height;
    var src = takeScratch(cw, ch);
    src.x.setTransform(tr); sil(src.x, 0, 0, 0);
    var pad = 8, x0 = Math.max(0, Math.floor(bb.x * k + tr.e - pad)), y0 = Math.max(0, Math.floor(bb.y * k + tr.f - pad));
    var x1 = Math.min(cw, Math.ceil((bb.x + bb.w) * k + tr.e + pad)), y1 = Math.min(ch, Math.ceil((bb.y + bb.h) * k + tr.f + pad)), w = x1 - x0, h = y1 - y0;
    if (hard && w > 0 && h > 0) {                     // hard edges: every stamp pixel is fully in or out
      var c = takeScratch(cw, ch, true); c.x.drawImage(src.c, x0, y0, w, h, 0, 0, w, h);
      var img = c.x.getImageData(0, 0, w, h), dd = img.data;
      for (var j = 3; j < dd.length; j += 4) dd[j] = dd[j] >= 110 ? 255 : 0;
      src.x.setTransform(1, 0, 0, 1, 0, 0); src.x.clearRect(x0, y0, w, h); src.x.putImageData(img, x0, y0);
      giveScratch(c);
    }
    var n = Math.max(1, Math.ceil(Math.max(Math.abs(vx), Math.abs(vy)) * k));
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    if (w > 0 && h > 0) for (var i = n; i >= 1; i--) {
      var t = i / n, ox = Math.round(vx * k * t), oy = Math.round(vy * k * t);
      each(g, t, function () { g.drawImage(src.c, x0, y0, w, h, x0 + ox, y0 + oy, w, h); });
    }
    g.restore();
    giveScratch(src);
  }
  // The lit 3D extrusion. The depth grows along each wall in the direction of the letter edge that made it,
  // so the gradient of "how deep" at a pixel gives that wall's facing. Walls facing the light print light.
  // Returns an alpha mask per device size (cached, so a second plate can reuse it).
  function shade3dMask(g, sil, bb, vx, vy, cache, litTone) {
    var tr = g.getTransform(), k = Math.abs(tr.a) || 1, cw = g.canvas.width, ch = g.canvas.height, key = cw + "x" + ch;
    if (cache[key]) return cache[key];
    var s = takeScratch(cw, ch), x = s.x;
    x.setTransform(tr);
    sweep(x, sil, bb, vx, vy, function (q, t, stamp) {
      q.globalCompositeOperation = "destination-out"; q.globalAlpha = 1; stamp();
      q.globalCompositeOperation = "source-over"; q.globalAlpha = 0.2 + 0.8 * t; stamp();
    }, true);
    var X0 = Math.max(0, Math.floor(Math.min(bb.x, bb.x + vx) * k + tr.e - 6)), Y0 = Math.max(0, Math.floor(Math.min(bb.y, bb.y + vy) * k + tr.f - 6));
    var X1 = Math.min(cw, Math.ceil(Math.max(bb.x + bb.w, bb.x + bb.w + vx) * k + tr.e + 6)), Y1 = Math.min(ch, Math.ceil(Math.max(bb.y + bb.h, bb.y + bb.h + vy) * k + tr.f + 6));
    var w = X1 - X0, h = Y1 - Y0, out = { X0: X0, Y0: Y0, w: w, h: h, mask: null };
    if (w > 0 && h > 0) {
      var c = takeScratch(cw, ch, true);
      c.x.drawImage(s.c, X0, Y0, w, h, 0, 0, w, h);
      var d = c.x.getImageData(0, 0, w, h).data, T = new Float32Array(w * h), i, L = Math.sqrt(vx * vx + vy * vy) || 1;
      giveScratch(c);
      for (i = 0; i < w * h; i++) { var a = d[i * 4 + 3]; T[i] = a < 30 ? -1 : (a / 255 - 0.2) / 0.8; }
      var px = -vy / L, py = vx / L, sgn = vx > 0.001 ? -1 : 1, D = Math.max(2, Math.round(k * 1.6)), M = new Uint8Array(w * h), yy, xx;
      var lit0 = Math.round(255 * litTone);
      for (yy = 0; yy < h; yy++) for (xx = 0; xx < w; xx++) {
        i = yy * w + xx; var t0 = T[i]; if (t0 < 0) continue;
        var far = t0 + 0.35;                          // outside the extrusion counts as deeper
        var xr = xx + D < w ? T[i + D] : -1, xl = xx - D >= 0 ? T[i - D] : -1, yd = yy + D < h ? T[i + D * w] : -1, yu = yy - D >= 0 ? T[i - D * w] : -1;
        var gx = (xr < 0 ? far : xr) - (xl < 0 ? far : xl), gy = (yd < 0 ? far : yd) - (yu < 0 ? far : yu), gm = Math.sqrt(gx * gx + gy * gy);
        if (gm < 1e-4) { M[i] = 255; continue; }
        var v = (gx * px + gy * py) / gm * sgn, lt = R.clamp((v + 0.12) / 0.5, 0, 1); lt = lt * lt * (3 - 2 * lt);
        M[i] = Math.round(255 - (255 - lit0) * lt);
      }
      out.mask = M;
    }
    giveScratch(s);
    cache[key] = out;
    return out;
  }
  function paintMask(g, m) {
    if (!m.mask) return;
    var img = g.createImageData(m.w, m.h), d = img.data, M = m.mask;
    for (var i = 0; i < M.length; i++) d[i * 4 + 3] = M[i];
    isolate(g, function (x) { x.putImageData(img, m.X0, m.Y0); });
  }

  // sil(g, dx, dy, grow) draws the silhouette in solid black, shifted and optionally grown by `grow`
  // scene units. bb: its scene bounds. size: its size in scene units. o: { faceKnock, role }
  function applyDepth(job, mode, sil, bb, size, rc, o) {
    o = o || {};
    if (!mode || mode === "flat" || mode === "none") return;
    var v = depthVec(mode, rc.depthDist, rc.depthAng), vx = v[0] * size, vy = v[1] * size;
    var role = o.role || (mode === "shadow" ? "shade" : "depth"), gap = size * 0.014, knock = o.faceKnock !== false;
    function knockFace(g, grow) { R.knock(g, function (g2) { sil(g2, 0, 0, grow); }); }
    if (mode === "offset") { job.put(role, function (g) { sil(g, vx, vy, 0); if (o.faceKnock) knockFace(g, 0); }); return; }
    if (mode === "block") { job.put(role, function (g) { sil(g, vx, vy, 0); if (knock) knockFace(g, o.keyline != null ? o.keyline : gap * 0.35); }); return; }
    if (mode === "extrude") {
      job.put(role, function (g) { isolate(g, function (x) { sweep(x, sil, bb, vx, vy, function (q, t, stamp) { stamp(); }); }); if (knock) knockFace(g, gap * 0.5); });
      return;
    }
    if (mode === "fade") {
      job.put(role, function (g) {
        isolate(g, function (x) {
          sweep(x, sil, bb, vx, vy, function (q, t, stamp) {
            q.globalCompositeOperation = "destination-out"; q.globalAlpha = 1; stamp();
            q.globalCompositeOperation = "source-over"; q.globalAlpha = 0.03 + 0.97 * Math.pow(1 - t, 0.75); stamp();
          });
        });
        if (knock) knockFace(g, gap * 0.5);
      });
      return;
    }
    if (mode === "3d-shade") {
      var cache = {};
      job.put(role, function (g) { paintMask(g, shade3dMask(g, sil, bb, vx, vy, cache, 0.3)); if (knock) knockFace(g, gap * 0.5); });
      return;
    }
    if (mode === "shadow") {
      job.put(role, function (g) {
        var k = Math.abs(g.getTransform().a) || 1, far = 20000;
        g.save(); g.shadowColor = "rgba(0,0,0,0.85)"; g.shadowBlur = size * 0.07 * k;
        g.shadowOffsetX = (vx + far) * k; g.shadowOffsetY = vy * k;
        sil(g, -far, 0, 0); g.restore();
        if (knock) knockFace(g, 0);
      });
      return;
    }
    if (mode === "echo") {
      var n = 3;
      job.put(role, function (g) {
        isolate(g, function (x) {
          for (var i = n; i >= 1; i--) {
            var f = i / n;
            R.knock(x, function (x2) { sil(x2, vx * f, vy * f, gap * 1.1); });
            x.globalAlpha = 1 - (i - 1) * 0.18; sil(x, vx * f, vy * f, 0); x.globalAlpha = 1;
          }
          R.knock(x, function (x2) { sil(x2, 0, 0, gap * 1.1); });
        });
      });
      return;
    }
    if (mode === "stack") {
      var n2 = 3, lw = size * 0.026;
      job.put(role, function (g) {
        isolate(g, function (x) {
          for (var i = n2; i >= 0; i--) {
            var f = i / n2, g0 = i ? 0 : gap * 1.3;
            R.knock(x, function (x2) { sil(x2, vx * f, vy * f, g0 + lw + gap * 1.2); });
            sil(x, vx * f, vy * f, g0 + lw);
            R.knock(x, function (x2) { sil(x2, vx * f, vy * f, g0); });
          }
        });
      });
      return;
    }
  }
  // The icon cannot do the word-only treatments; it takes the closest one.
  var ICON_DEPTH = { outline: "offset", split: "block", chrome: "block" };

  /* ---- surfaces: what the face is made of (drawn inside an isolated canvas) ---- */
  function surface(x, W, t, which) {
    var b = W.boundsOf(which || "all"), s = W.size;
    if (!t || t === "solid") return;
    x.save();
    if (t === "bulbs") {                      // marquee bulbs: keep only a grid of dots inside the letters
      x.globalCompositeOperation = "destination-in"; x.beginPath();   // (printed on a flat plate: every lamp solid and lit)
      var p = s * 0.085, r = p * 0.43, y, xx;
      for (y = b.y + p * 0.5; y < b.y + b.h + p; y += p) for (xx = b.x + p * 0.5; xx < b.x + b.w + p; xx += p) { x.moveTo(xx + r, y); x.arc(xx, y, r, 0, TAU); }
      x.fill();
    } else if (t === "pinstripe") {
      x.globalCompositeOperation = "destination-out";
      for (var x2 = b.x + s * 0.05; x2 < b.x + b.w + 10; x2 += s * 0.11) x.fillRect(x2, b.y - 20, s * 0.018, b.h + 40);
    } else if (t === "ramp") {                // the face fades into a halftone ramp
      x.globalCompositeOperation = "destination-in";
      x.fillStyle = R.vgrad(x, b.y, b.y + b.h, [[0, 1], [0.42, 1], [1, 0.22]]); x.fillRect(b.x - 40, b.y - 40, b.w + 80, b.h + 80);
    } else if (t === "lines") {               // three hairline cuts across the face, the 70s racing stripe
      x.globalCompositeOperation = "destination-out";
      for (var i = 0; i < 3; i++) x.fillRect(b.x - 10, b.y + b.h * (0.56 + i * 0.12), b.w + 20, s * 0.028);
    } else if (t === "shine") {               // two glints on the upper left of every letter, like light on enamel
      x.globalCompositeOperation = "destination-out";   // (on dark stock the build prints a light ink into these cuts)
      glints(x, W, which, 0);
    } else if (t === "inline") {              // a paper hairline inside every letter, following its shape
      var d1 = s * 0.032, lw = s * 0.016, q = takeScratch(x.canvas.width, x.canvas.height);
      q.x.setTransform(x.getTransform());
      drawWord(q.x, W, 0, 0, "stroke", which || "all", 2 * (d1 + lw));
      q.x.globalCompositeOperation = "destination-out"; drawWord(q.x, W, 0, 0, "stroke", which || "all", 2 * d1);
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "destination-out"; x.drawImage(q.c, 0, 0);
      giveScratch(q);
    } else if (t === "distress") {
      x.globalCompositeOperation = "destination-out";
      var rd = R.mulberry(99);
      for (var j = 0; j < 520; j++) { var dx = b.x + rd() * b.w, dy = b.y + rd() * b.h, dr = s * (0.004 + Math.pow(rd(), 3) * 0.05); x.globalAlpha = 0.5 + rd() * 0.5; R.circle(x, dx, dy, dr); x.fill(); }
    }
    x.restore();
  }
  // Keep x only where a mask built letter by letter is: fn(m, box) paints the mask for one glyph's ink box
  // [x0, y0, x1, y1] (so bands such as the chrome horizon follow each letter, on any shape and on both lines).
  function glyphMask(x, W, fn) {
    var m = takeScratch(x.canvas.width, x.canvas.height);
    m.x.setTransform(x.getTransform());
    W.glyphs.forEach(function (gl) { m.x.save(); fn(m.x, gl.box); m.x.restore(); });
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "destination-in"; x.drawImage(m.c, 0, 0); x.restore();
    giveScratch(m);
  }
  // The shine's two glints on the upper left of every letter (stroked; grow widens them, for trapping).
  function glints(x, W, which, grow) {
    W.glyphs.forEach(function (gl) {
      if ((which === "true" && gl.is82) || (which === "82" && !gl.is82)) return;
      var gb = gl.box, gw = gb[2] - gb[0], gh = gb[3] - gb[1], L = gh * 0.2;
      x.save(); x.translate(gb[0] + gw * 0.2, gb[1] + gh * 0.2); x.rotate(-0.95); x.lineCap = "round";
      x.lineWidth = gl.size * 0.035 + (grow || 0); x.beginPath(); x.moveTo(-L / 2, 0); x.lineTo(L / 2, 0); x.stroke();
      x.lineWidth = gl.size * 0.018 + (grow || 0); x.beginPath(); x.moveTo(-L * 0.28, gl.size * 0.05); x.lineTo(L * 0.28, gl.size * 0.05); x.stroke();
      x.restore();
    });
  }
  function faceFill(g, W, which, tex) {
    if (!tex || tex === "solid") { drawWord(g, W, 0, 0, "fill", which); return; }
    isolate(g, function (x) { drawWord(x, W, 0, 0, "fill", which); surface(x, W, tex, which); });
  }

  /* ---- the paper meets the site's ground ----
     The site header prints the plate straight onto its ground color. When the stock is close to that ground
     (and on the same side, light or dark), the plate prints on the ground's exact color, so it never shows
     as a lighter or darker box in the header. A stock far from the ground (a cream slip on the night site)
     is left alone: it is meant to read as paper. */
  function headerGround(rc) {
    if (!LAB.roles || rc.sysPalette === "today") return null;
    var pal = LAB.palettes[rc.sysPalette && rc.sysPalette !== "match" ? rc.sysPalette : rc.palette];
    if (!pal || !pal.sys) return null;
    try { var g = LAB.roles(pal, rc.ground || "night").ground; return /^#[0-9a-f]{6}$/i.test(g) ? g : null; } catch (e) { return null; }
  }
  function matchGround(stock, rc) {
    var g = headerGround(rc); if (!g || !stock || !stock.paper) return stock;
    var P = R.hexRGB(stock.paper), Q = R.hexRGB(g), d = Math.sqrt(Math.pow(P[0] - Q[0], 2) + Math.pow(P[1] - Q[1], 2) + Math.pow(P[2] - Q[2], 2));
    if (d < 0.5 || d > 34 || (R.lum(Q) < 0.3) !== !!stock.dark) return stock;
    return Object.assign({}, stock, { paper: g.toUpperCase(), matched: stock.paper });
  }

  /* ---- the icon's silhouette, its real ink, and keeping it on the plate ---- */
  // Draw the concept's silhouette (body, line and accent parts) in solid black into g, placed in box ib.
  // fat: extra stroke in icon units (true: the sticker's die-cut border).
  function drawIconSil(concept, rc, g, ib, dx, dy, fat) {
    var S = makeStyle(rc, "sil", R.mulberry(1)), fw = fat === true ? 9 : (+fat || 0);
    concept.draw({ part: function (name, fn) {
      if (name !== "body" && name !== "line" && name !== "accent") return;
      g.save(); g.translate(ib.x + dx, ib.y + dy); g.scale(ib.s / 100, ib.s / 100);
      if (rc.iconStyle === "stamp") { g.translate(50, 50); g.rotate(-0.07); g.translate(-50, -50); }
      g.lineJoin = "round"; g.lineCap = "round"; g.fillStyle = "#000"; g.strokeStyle = "#000";
      var S2 = Object.create(S);
      S2.fill = function (gg) { gg.fill(); if (fw) { gg.lineWidth = fw; gg.stroke(); } };
      S2.stroke = function (gg, w) { gg.lineWidth = (w || 2) * 1.2 + fw; gg.stroke(); };
      fn(g, S2);
      g.restore();
    } });
  }
  // The concept's real ink bounds in its 100 box (glow left out: it may bleed by design). Cached.
  var inkCache = {};
  function iconInk(concept, rc) {
    var key = concept.id + "|" + rc.iconStyle + "|" + (rc._darkStock ? 1 : 0) + "|" + rc.seed;
    if (inkCache[key]) return inkCache[key];
    var N = 200, s = takeScratch(N, N, true), out = { x0: 0, y0: 0, x1: 100, y1: 100 };
    try {
      drawIconSil(concept, rc, s.x, { x: 50, y: 50, s: 100 }, 0, 0, rc.iconStyle === "sticker");
      var dd = s.x.getImageData(0, 0, N, N).data, x0 = N, y0 = N, x1 = -1, y1 = -1, x, y;
      for (y = 0; y < N; y++) for (x = 0; x < N; x++) if (dd[(y * N + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 >= 0) out = { x0: x0 - 50, y0: y0 - 50, x1: x1 + 1 - 50, y1: y1 + 1 - 50 };
    } catch (e) { /* a concept that cannot draw a silhouette keeps its box */ }
    giveScratch(s);
    return (inkCache[key] = out);
  }
  // Keep the icon's ink and its depth inside the plate (margin m): a tall icon, or one grown by iconScale,
  // shrinks to the plate's height around its center, then moves back inside. vec: the depth as a fraction
  // of the icon size. keepX: leave x alone (a lockup packs it after).
  function fitIcon(ib, ink, vec, vw, vh, m, keepX) {
    function ext() {
      return { t: ib.y + ib.s * (ink.y0 / 100 + Math.min(0, vec[1])), b: ib.y + ib.s * (ink.y1 / 100 + Math.max(0, vec[1])),
        l: ib.x + ib.s * (ink.x0 / 100 + Math.min(0, vec[0])), r: ib.x + ib.s * (ink.x1 / 100 + Math.max(0, vec[0])) };
    }
    var e = ext(), k = Math.min(1, (vh - 2 * m) / Math.max(1, e.b - e.t));
    if (!keepX) k = Math.min(k, (vw - 2 * m) / Math.max(1, e.r - e.l));
    if (k < 1) { var cx = ib.x + ib.s / 2, cy = ib.y + ib.s / 2; ib.s *= k; ib.x = cx - ib.s / 2; ib.y = cy - ib.s / 2; e = ext(); }
    if (e.t < m) ib.y += m - e.t; else if (e.b > vh - m) ib.y -= e.b - (vh - m);
    if (!keepX) { if (e.l < m) ib.x += m - e.l; else if (e.r > vw - m) ib.x -= e.r - (vw - m); }
    return ib;
  }

  /* ---- build the whole print ---- */
  LAB.build = function (rcIn) {
    var rc = LAB.recipe(rcIn), pal = LAB.palettes[rc.palette] || LAB.palettes[LAB.order.palettes[0]];
    var lay = LAB.layouts[rc.layout] || LAB.layouts.inline, concept = LAB.concepts[rc.concept] || null;
    var job = new Job(rc, pal), rnd = R.mulberry((rc.seed || 7) * 977);
    var stockKey = rc.stock === "auto" ? (pal.stock || "cream") : rc.stock;
    var stock = matchGround(R.STOCKS[stockKey] || R.STOCKS.cream, rc);
    rc._darkStock = !!stock.dark;           // concepts read it as S.dark
    var A = { rc: rc, pal: pal, job: job, stock: stock, rnd: rnd, R: R, kit: LAB.kit, put: function (role, fn, opt) { job.put(role, fn, opt); }, putSlot: function (slot, fn, opt) { job.putSlot(slot, fn, opt); }, knockAll: function (fn) { job.knockAll(fn); }, has: function (id) { return rc.adds.indexOf(id) >= 0; } };
    // A layout that sizes itself to a two-line word (the name over a big 82) reads A.wordAspect: the width over
    // the height of that stacked word with its depth, measured before place().
    var d = rc.depth || "flat";
    var reachV = d === "split" ? [0, 0] : d === "chrome" ? depthVec("block", rc.depthDist * 0.6, rc.depthAng) : depthVec(d, rc.depthDist, rc.depthAng);
    var padW = d === "shadow" ? 0.07 : d === "stack" ? 0.06 : 0.01;
    if (rc.lines === "two") { var W0 = layoutWord(rc, { x: 0, y: 0, w: 4000, h: 1000 }, null, { reach: reachV, pad: padW }); if (W0.lines > 1) A.wordAspect = W0.aspect; }
    var boxes = lay.place(A, rc);          // { vh, word: {x,y,w,h}, icon: {x,y,s} | null, tag: {x,y,w,h} | null, ... }
    A.boxes = boxes; A.vw = 1000; A.vh = boxes.vh;
    var hasIcon = !!(concept && boxes.icon && rc.concept !== "none");
    if (hasIcon && rc.iconScale && rc.iconScale !== 1) {
      var ic = boxes.icon, ns = ic.s * rc.iconScale; boxes.icon = { x: ic.x + (ic.s - ns) / 2, y: ic.y + (ic.s - ns) / 2, s: ns };
    }
    // the icon's depth, as a fraction of its size (the icon takes the closest treatment the word has)
    var idepth = hasIcon ? (rc.iconDepth === "match" ? (ICON_DEPTH[d] || d) : rc.iconDepth) : "none";
    var iconVec = idepth && idepth !== "none" && idepth !== "flat" && rc.iconStyle !== "neon" ? depthVec(idepth, rc.depthDist, rc.depthAng).map(function (v) { return v * 0.85; }) : [0, 0];
    if (rc.iconStyle === "sticker") iconVec = [Math.max(iconVec[0], 0.035), Math.max(iconVec[1], 0.05)];
    // a backdrop disc centered on the icon (the sun, the sunset stripes) counts as the icon's ink: it stays on
    // the plate, and in a lockup a disc wider than the icon is part of the icon's width
    var discR0 = hasIcon && rc.backdrop && rc.backdrop !== "none" && LAB.backdropReach ? LAB.backdropReach(rc.backdrop) : 0;
    var iconInkB = hasIcon ? iconInk(concept, rc) : null, fitInk = iconInkB;
    if (discR0) fitInk = { x0: Math.min(iconInkB.x0, 50 - 100 * discR0), y0: Math.min(iconInkB.y0, 50 - 100 * discR0), x1: Math.max(iconInkB.x1, 50 + 100 * discR0), y1: Math.max(iconInkB.y1, 50 + 100 * discR0) };
    if (hasIcon) boxes.icon = fitIcon(Object.assign({}, boxes.icon), fitInk, iconVec, 1000, boxes.vh, 12, !!boxes.lockup);
    var discK = boxes.lockup ? Math.max(0, discR0 - 0.5) : 0;
    if (discK && boxes.word) boxes.word = Object.assign({}, boxes.word, { w: Math.max(boxes.word.w * 0.6, boxes.word.w - 2 * discK * boxes.icon.s), x: boxes.lockup.order === "icon-word" ? boxes.word.x + 2 * discK * boxes.icon.s : boxes.word.x });
    // the word, laid out once (fonts must be loaded before build), fit with room for its depth
    var W = null;
    if (boxes.word) {
      if (A.has("speed") && boxes.lockup && boxes.lockup.order !== "icon-word") { var bw0 = boxes.word; boxes.word = Object.assign({}, bw0, { x: bw0.x + bw0.w * 0.14, w: bw0.w * 0.86 }); }
      W = layoutWord(rc, boxes.word, boxes.wordShape, { reach: reachV, pad: padW });
      W.tex = rc.wordTex || "solid";
      var bnd = W.bounds, rv = [reachV[0] * W.size, reachV[1] * W.size];
      W.reach = { x: Math.min(bnd.x, bnd.x + rv[0]), y: Math.min(bnd.y, bnd.y + rv[1]), w: bnd.w + Math.abs(rv[0]), h: bnd.h + Math.abs(rv[1]) };
      W.depth = d; W.vec = rv;
      // pack word and icon into one lockup, centered
      if (boxes.lockup && hasIcon) {
        var lk = boxes.lockup, ib0 = boxes.icon, gap0 = lk.gap == null ? 26 : lk.gap;
        var over = W.reach.w + gap0 + ib0.s * (1 + 2 * discK) - 952;
        if (over > 0) {                                 // the icon (grown by iconScale) gives way so the lockup stays on the plate
          var ns2 = Math.max(ib0.s * 0.55, ib0.s - over / (1 + 2 * discK)); ib0.y += (ib0.s - ns2) / 2; ib0.s = ns2;
        }
        var iw = ib0.s * (1 + 2 * discK), ipad = ib0.s * discK;
        var lead = lk.order !== "icon-word" && A.has("speed") ? Math.min(W.size * 0.7, Math.max(0, 952 - (W.reach.w + gap0 + iw))) : 0;   // room for speed lines
        var tot = lead + W.reach.w + gap0 + iw, x0 = Math.max(24, (1000 - tot) / 2);
        if (lk.order === "icon-word") { ib0.x = x0 + ipad; shiftWord(W, x0 + iw + gap0 - W.reach.x, 0); }
        else { shiftWord(W, x0 + lead - W.reach.x, 0); ib0.x = x0 + lead + W.reach.w + gap0 + ipad; }
        A.lockup = { x: x0, w: tot };
      }
      W.silOf = function (which) { return function (g, dx, dy, grow) { drawWord(g, W, dx, dy, grow ? "grow" : "fill", which, (grow || 0) * 2); }; };
      W.sil = W.silOf;
      W.face = function (g, which) { faceFill(g, W, which || "all", W.tex); };
      // the face plus everything its depth covers, for knocks (grow: extra margin in scene units)
      W.full = function (g, grow) {
        grow = grow || 0;
        var silG = function (x, dx, dy) { drawWord(x, W, dx, dy, grow ? "grow" : "fill", "all", grow * 2); };
        isolate(g, function (x) {
          silG(x, 0, 0);
          if (d === "offset" || d === "block" || d === "outline") silG(x, rv[0], rv[1]);
          else if (d === "extrude" || d === "fade" || d === "3d-shade" || d === "echo" || d === "stack" || d === "chrome") {
            var bb = { x: W.bounds.x - grow, y: W.bounds.y - grow, w: W.bounds.w + grow * 2, h: W.bounds.h + grow * 2 };
            sweep(x, function (q, dx, dy) { silG(q, dx, dy); }, bb, rv[0], rv[1], function (q, t, stamp) { stamp(); });
            if (d === "stack") silG(x, rv[0], rv[1]);
          }
        });
      };
    }
    A.word = W;
    A.iconSil = hasIcon ? function (g, dx, dy, grow) { runSil(g, dx || 0, dy || 0, grow ? grow * 2 * 100 / boxes.icon.s : 0); } : null;
    // backdrops and back additions
    if (rc.backdrop && rc.backdrop !== "none" && LAB.additions["bd-" + rc.backdrop]) LAB.additions["bd-" + rc.backdrop].draw(A);
    if (lay.frame) lay.frame(A);
    rc.adds.forEach(function (id) { var dd = LAB.additions[id]; if (dd && dd.when === "back") dd.draw(A); });
    // the icon
    // draw the concept silhouette straight into g (used inside other plates' draws). fat: extra stroke in icon units
    function runSil(g, dx, dy, fat) { drawIconSil(concept, rc, g, boxes.icon, dx, dy, fat); }
    if (hasIcon) {
      var ib = boxes.icon;
      if (rc.iconStyle === "sticker") {
        // die-cut border: a fat silhouette knocked through every plate, then its shadow
        var fat = function (g) { runSil(g, 0, 0, true); };
        job.put("shade", function (g) { g.save(); g.translate(ib.s * 0.035, ib.s * 0.05); fat(g); g.restore(); R.knock(g, function (g2) { fat(g2); }); });
        job.knockAll(function (g) { fat(g); });
      }
      if (idepth && idepth !== "none" && idepth !== "flat" && rc.iconStyle !== "neon") {
        var isz = ib.s * 0.85, ibb = { x: ib.x - ib.s * 0.04, y: ib.y - ib.s * 0.04, w: ib.s * 1.08, h: ib.s * 1.08 };
        applyDepth(job, idepth, function (g, dx, dy, grow) { runSil(g, dx, dy, grow ? grow * 2 * 100 / ib.s : 0); }, ibb, isz, rc, { faceKnock: idepth !== "offset" });
      }
      runConcept(job, concept, ib, "print");
    }
    // the wordmark. v53: a neon word ("Neon tubes" / "Neon glow") is not printed at all; LAB.print lights it
    // over the composed print (drawNeonWord), in the inks its roles map to
    var neon = null;
    if (W && (W.tex === "neon" || W.tex === "glow")) {
      var nFace = boxes.wordRole || "word", nHas82 = W.glyphs.some(function (gl) { return gl.is82; }), nTrue = W.glyphs.some(function (gl) { return !gl.is82; });
      var n82 = rc.ink82 === "a" ? "glow" : rc.ink82 === "b" ? "body" : rc.ink82 === "word" || rc.ink82 === "outline" || !rc.ink82 ? nFace : "word82";
      if (rc.neonInk === "icon") { nFace = "body"; n82 = "line"; }   // the sign in the icon's own two inks (Vice: a pink TRUE, an aqua 82)
      neon = { style: W.tex, parts: nHas82 && nTrue && n82 !== nFace
        ? [{ which: "true", rgb: R.inkRGB(pal.inks[job.slotOf(nFace)]) }, { which: "82", rgb: R.inkRGB(pal.inks[job.slotOf(n82)]) }]
        : [{ which: "all", rgb: R.inkRGB(pal.inks[job.slotOf(nFace)]) }] };
      W = null;                                   // nothing below prints it
    }
    if (W) {
      // paper letters (the layout knocks them out); on dark stock paper is dark, so they print in the key ink instead
      var tex = W.tex, faceRole = boxes.wordRole || "word", paper = !!boxes.wordPaper && !stock.dark, b = W.bounds;
      var has82 = W.glyphs.some(function (gl) { return gl.is82; });
      var faceOpt = tex === "bulbs" ? { flat: true } : undefined;   // lamps print solid (no screen), so they stay lit at header size
      if (d === "outline") {
        job.put("depth", function (g) { drawWord(g, W, W.vec[0], W.vec[1], "fill", "all"); if (paper) R.knock(g, function (g2) { drawWord(g2, W, 0, 0, "fill", "all"); }); });
        if (!paper) job.put(faceRole, function (g) { drawWord(g, W, 0, 0, "stroke", "all", W.size * 0.045); });
      } else if (d === "split") {                // a split fountain: key on top melting into the depth ink below
        if (!paper) job.put(faceRole, function (g) { isolate(g, function (x) { drawWord(x, W, 0, 0, "fill", "all"); surface(x, W, tex); x.globalCompositeOperation = "destination-in"; x.fillStyle = R.vgrad(x, b.y, b.y + b.h, [[0, 1], [0.28, 1], [0.72, 0], [1, 0]]); x.fillRect(b.x - 50, b.y - 50, b.w + 100, b.h + 100); }); });
        job.put("depth", function (g) { isolate(g, function (x) { drawWord(x, W, 0, 0, "fill", "all"); surface(x, W, tex); x.globalCompositeOperation = "destination-in"; x.fillStyle = R.vgrad(x, b.y, b.y + b.h, [[0, 0], [0.28, 0], [0.72, 1], [1, 1]]); x.fillRect(b.x - 50, b.y - 50, b.w + 100, b.h + 100); }); });
      } else if (d === "chrome") {
        // 80s chrome, letter by letter: the face ink solid at the top melting into a saturated sky ink at the
        // horizon, a hard paper horizon line, the depth ink below cut by widening paper stripes, a block shadow
        // set off by a paper keyline, and a thin rim in the face ink. Solid ink where it counts, so the name
        // still reads at header size.
        var HZ = 0.54, hl = W.size * 0.032, rim = W.size * 0.017;
        var skyRole = ["body", "glow", "accent", "line", "tag"].filter(function (r) { return job.slotOf(r) !== job.slotOf(faceRole) && job.slotOf(r) !== job.slotOf("depth"); })[0] || null;
        applyDepth(job, "block", W.silOf("all"), b, W.size, Object.assign({}, rc, { depthDist: rc.depthDist * 0.6 }), { faceKnock: true, role: "shade", keyline: W.size * 0.026 });
        var sky = function (stops) {
          return function (m, bx) { var y0 = bx[1], hz = y0 + (bx[3] - y0) * HZ; m.fillStyle = R.vgrad(m, y0, hz, stops); m.fillRect(bx[0] - 2, y0 - 30, bx[2] - bx[0] + 4, hz - y0 + 30); };
        };
        job.put(faceRole, function (g) {
          isolate(g, function (x) {
            drawWord(x, W, 0, 0, "fill", "all");
            glyphMask(x, W, sky(skyRole ? [[0, 1], [0.4, 1], [0.92, 0.1], [1, 0]] : [[0, 1], [1, 1]]));
            drawWord(x, W, 0, 0, "stroke", "all", rim);
          });
        });
        if (skyRole) job.put(skyRole, function (g) {
          isolate(g, function (x) { drawWord(x, W, 0, 0, "fill", "all"); glyphMask(x, W, sky([[0, 0], [0.3, 0], [0.78, 1], [1, 1]])); });
        });
        job.put("depth", function (g) {
          isolate(g, function (x) {
            drawWord(x, W, 0, 0, "fill", "all");
            glyphMask(x, W, function (m, bx) {
              var y1 = bx[3] + 20, top = bx[1] + (bx[3] - bx[1]) * HZ + hl, x0 = bx[0] - 2, w = bx[2] - bx[0] + 4, yy = top + W.size * 0.075, st = 0;
              m.fillRect(x0, top, w, y1 - top);
              m.save(); m.globalCompositeOperation = "destination-out";
              while (yy < y1) { var th = W.size * (0.011 + st * 0.009); m.fillRect(x0, yy, w, th); yy += th + W.size * Math.max(0.03, 0.068 - st * 0.01); st++; }
              m.restore();
            });
          });
        });
      } else {
        var fk = d !== "offset" || !!boxes.wordPaper || !!boxes.wordRole;   // a face in another ink never overprints its depth
        var split82 = !paper && rc.ink82 && rc.ink82 !== "word" && has82 && W.glyphs.some(function (gl) { return !gl.is82; });
        if (split82) {
          var r82 = rc.ink82 === "a" ? "glow" : rc.ink82 === "b" ? "body" : rc.ink82 === "outline" ? null : "word82";
          var depthRole = d === "shadow" ? "shade" : "depth";
          applyDepth(job, d, W.silOf("true"), W.boundsOf("true"), W.size, rc, { faceKnock: fk });
          var same = r82 && job.slotOf(r82) === job.slotOf(depthRole);
          applyDepth(job, d, W.silOf("82"), W.boundsOf("82"), W.size, rc, { faceKnock: r82 ? true : fk, role: same ? faceRole : undefined });
          job.put(faceRole, function (g) { faceFill(g, W, "true", tex); }, faceOpt);
          if (r82) job.put(r82, function (g) { faceFill(g, W, "82", tex); }, faceOpt);
          else job.put(faceRole, function (g) { drawWord(g, W, 0, 0, "stroke", "82", W.size * 0.05); });
        } else {
          applyDepth(job, d, W.silOf("all"), b, W.size, rc, { faceKnock: fk });
          if (!paper) job.put(faceRole, function (g) { faceFill(g, W, "all", tex); }, faceOpt);
        }
      }
    }
    // Shine on dark stock: a glint cut to the paper prints dark, a black scratch. Print the lightest other
    // ink into the cuts instead (a cream glint on gold letters), trapped a hair wider, only on the letters.
    if (W && W.tex === "shine" && stock.dark && d !== "outline" && d !== "chrome") {
      var subsets = [["all", job.slotOf(faceRole)]];
      if (rc.ink82 && rc.ink82 !== "word" && rc.ink82 !== "outline" && has82 && W.glyphs.some(function (gl) { return !gl.is82; }))
        subsets = [["true", job.slotOf(faceRole)], ["82", job.slotOf(rc.ink82 === "a" ? "glow" : rc.ink82 === "b" ? "body" : "word82")]];
      subsets.forEach(function (sub) {
        var gSlot = null, gLum = -1;
        job.slots.forEach(function (sl) { if (sl === sub[1]) return; var l = R.lum(R.inkRGB(pal.inks[sl])); if (l > gLum) { gLum = l; gSlot = sl; } });
        if (gSlot) job.putSlot(gSlot, function (g) {
          isolate(g, function (x) {
            glints(x, W, sub[0], W.size * 0.008);
            x.globalCompositeOperation = "destination-in"; drawWord(x, W, 0, 0, "fill", sub[0]);
          });
        });
      });
    }
    if (neon) W = A.word;                         // the word is still the layout's (additions and after() read it)
    rc.adds.forEach(function (id) { var dd = LAB.additions[id]; if (dd && dd.when !== "back") dd.draw(A); });
    if (lay.after) lay.after(A);
    return { rc: rc, pal: pal, job: job, stock: stock, vh: boxes.vh, boxes: boxes, word: W, neon: neon };
  };

  /* ---- a neon word, lit over the composed print (v53) ----
     "neon": glass tubes along each letter's outline: a wide soft glow in the ink, the tube, a pale core.
     "glow": solid lit letters: the ink's glow, the letter in the ink, a pale core inset. No halftone, no
     misregistration: a sign, not a print. k is device pixels per scene unit (shadows ignore the transform). */
  function drawNeonWord(ctx, B, k) {
    var W = B.word, N = B.neon;
    if (!W || !N) return;
    ctx.save();
    ctx.setTransform(k, 0, 0, k, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    N.parts.forEach(function (part) {
      var c = part.rgb, rgba = function (a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; };
      var core = "rgb(" + c.map(function (v) { return Math.round(v + (255 - v) * 0.72); }).join(",") + ")";
      var s = W.size;
      if (N.style === "glow") {
        ctx.shadowColor = rgba(0.9); ctx.shadowBlur = s * 0.26 * k; ctx.fillStyle = rgba(1);
        drawWord(ctx, W, 0, 0, "fill", part.which);
        ctx.shadowBlur = s * 0.09 * k; drawWord(ctx, W, 0, 0, "fill", part.which);
        ctx.shadowBlur = 0; ctx.fillStyle = core;
        isolate(ctx, function (x) {                // the pale core, inset from the letter's edge by the ink
          x.fillStyle = core; drawWord(x, W, 0, 0, "fill", part.which);
          x.globalCompositeOperation = "destination-out"; x.strokeStyle = "#000"; drawWord(x, W, 0, 0, "stroke", part.which, s * 0.07);
        });
      } else {
        ctx.fillStyle = rgba(0.1); drawWord(ctx, W, 0, 0, "fill", part.which);                       // the glass inside
        ctx.shadowColor = rgba(0.95); ctx.shadowBlur = s * 0.34 * k; ctx.strokeStyle = rgba(0.75);
        drawWord(ctx, W, 0, 0, "stroke", part.which, s * 0.07);
        ctx.shadowBlur = s * 0.1 * k; ctx.strokeStyle = rgba(1); drawWord(ctx, W, 0, 0, "stroke", part.which, s * 0.05);
        ctx.shadowBlur = 0; ctx.strokeStyle = core; drawWord(ctx, W, 0, 0, "stroke", part.which, s * 0.017);
      }
    });
    ctx.restore();
  }

  /* ---- print it ---- */
  function fontsFor(rc) {
    var list = [LAB.fonts[rc.font], rc.font82 !== "match" ? LAB.fonts[rc.font82] : null, LAB.fonts.plexmono, LAB.fonts.barlow].filter(Boolean);
    return Promise.all(list.map(LAB.loadFont));
  }
  function slotIndex(pal, s) { return ["key", "a", "b", "c", "d"].indexOf(s); }
  // Paper, grain and starvation depend only on size, seed, stock and the print knobs, so re-prints in the
  // lab (most toggles change none of them) reuse the last plates. Two entries, only for plates up to ~4 Mpx.
  var plateCache = [];
  function plateFor(o) {
    var key = [o.W, o.vh, o.seed, o.pitch, o.d, o.stock.paper, o.stock.fibre, o.texture, o.grain, o.starve, o.screen, o.feather].join("|");
    for (var i = 0; i < plateCache.length; i++) if (plateCache[i].key === key) { var hit = plateCache.splice(i, 1)[0]; plateCache.unshift(hit); hit.P.screen = o.screen || "dot"; return hit.P; }
    var P = R.plate(o);
    if (P.W * P.H <= 4200000) { plateCache.unshift({ key: key, P: P }); if (plateCache.length > 2) plateCache.pop(); }
    return P;
  }
  // opts: { cssW, dpr }. Returns a print: { P, layers, reg, draw(ctx, t), canvasW, canvasH }
  LAB.print = function (rcIn, opts) {
    var rc = LAB.recipe(rcIn);
    return fontsFor(rc).then(function () {
      var B = LAB.build(rc), d = opts.dpr || 1, W = Math.round(opts.cssW * d);
      var P = plateFor({ W: W, vw: 1000, vh: B.vh, seed: rc.seed, pitch: rc.pitch * d, d: d, stock: B.stock, texture: rc.tooth == null ? 1 : +rc.tooth, grain: rc.grain, starve: rc.starve, screen: rc.screen, feather: true });
      B.job.P = P;
      var darkMode = rc.darkMode === "auto" ? (B.pal.darkMode || "normal") : rc.darkMode;
      var order = B.job.keys.slice();
      if (P.stock.dark) order.sort(function (a, b) { return (B.job.plates[a].slot === "key") - (B.job.plates[b].slot === "key"); });
      var layers = order.map(function (k) {
        var pl = B.job.plates[k], si = slotIndex(B.pal, pl.slot);
        var saveScreen = P.screen; if (pl.lines) P.screen = "line";
        var L = R.layer(P, B.pal.inks[pl.slot], si + (pl.lines ? 3 : 0), function (g) { pl.fns.forEach(function (f) { g.save(); f(g); g.restore(); }); }, pl.flat);
        P.screen = saveScreen;
        L.si = si;
        return L;
      });
      var base = R.registration(6, rc.reg, rc.regDir, d, rc.seed);
      var regs = layers.map(function (L) { return base[L.si] || [0, 0]; });
      var out = { rc: rc, B: B, P: P, layers: layers, reg: regs, darkMode: darkMode, w: P.W, h: P.H };
      out.draw = function (ctx, t, reveal) {
        var rr = regs, clips = null;
        if (t != null && rc.motion === "breathe") rr = regs.map(function (r, i) { return i === 0 && !r[0] ? r : [r[0] + Math.sin(t * 0.9 + i * 1.7) * 0.9 * d, r[1] + Math.cos(t * 0.7 + i * 2.3) * 0.7 * d]; });
        if (t != null && rc.motion === "boil") { var f = Math.floor(t * 8), rb = R.mulberry(f * 131 + 7); rr = regs.map(function (r) { return [r[0] + (rb() - 0.5) * 1.6 * d, r[1] + (rb() - 0.5) * 1.6 * d]; }); }
        if (reveal != null) {
          clips = layers.map(function (L, i) { var p = R.clamp((reveal - i * 0.22) / 0.55, 0, 1); p = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; return p <= 0 ? 0 : [0, 0, Math.ceil(P.W * p), P.H]; });
        }
        R.compose(ctx, P, layers, rr, clips, darkMode);
        if (B.neon && (reveal == null || reveal >= 0.55 + 0.22 * layers.length)) drawNeonWord(ctx, B, P.W / 1000);   // the sign lights once the print is down
      };
      return out;
    });
  };
  // Mount into a canvas with motion. Returns a controller.
  LAB.mount = function (canvas, rcIn, opts) {
    var ctl = { alive: true, raf: 0, pr: null };
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ctl.ready = LAB.print(rcIn, opts).then(function (pr) {
      if (!ctl.alive) return pr;
      ctl.pr = pr;
      canvas.width = pr.w; canvas.height = pr.h;
      canvas.style.aspectRatio = pr.w + " / " + pr.h;
      var ctx = canvas.getContext("2d"), t0 = performance.now() / 1000, mo = pr.rc.motion;
      function frame() {
        if (!ctl.alive) return;
        var t = performance.now() / 1000 - t0;
        if (mo === "print") { pr.draw(ctx, null, t / 1.6 * (0.55 + 0.22 * pr.layers.length)); if (t < 1.8) ctl.raf = requestAnimationFrame(frame); return; }
        pr.draw(ctx, t, null);
        if (mo === "breathe" || mo === "boil") ctl.raf = requestAnimationFrame(frame);
      }
      if (reduced || mo === "none") pr.draw(ctx, null, null); else frame();
      return pr;
    });
    ctl.replay = function () { if (ctl.pr && ctl.alive) { cancelAnimationFrame(ctl.raf); var c = canvas.getContext("2d"), t0 = performance.now() / 1000, pr = ctl.pr; (function f() { var t = performance.now() / 1000 - t0; pr.draw(c, null, t / 1.6 * (0.55 + 0.22 * pr.layers.length)); if (t < 1.8 && ctl.alive) ctl.raf = requestAnimationFrame(f); else pr.draw(c, pr.rc.motion === "none" ? null : t, null); })(); } };
    ctl.destroy = function () { ctl.alive = false; cancelAnimationFrame(ctl.raf); };
    return ctl;
  };
  // A still image of the print (for page mocks and export).
  LAB.image = function (rcIn, cssW, dpr, type) {
    return LAB.print(rcIn, { cssW: cssW, dpr: dpr || 2 }).then(function (pr) {
      var c = R.cv(pr.w, pr.h); pr.draw(c.getContext("2d"), null, null);
      return { url: c.toDataURL(type || "image/png"), w: pr.w, h: pr.h, canvas: c, dark: pr.P.stock.dark, paper: pr.P.stock.paper };
    });
  };

  // The app icon (v53; the owner: "love the comet icon as config'd but cut out the blank space around it so it's a
  // tight crop"): the recipe's icon alone (its star or sparkle kept, no backdrop), printed large, trimmed to its ink
  // and centered on a square of the stock with a thin margin. px: the square's side in pixels.
  LAB.appIcon = function (rcIn, px, margin) {
    var rc = LAB.recipe(rcIn), m = margin == null ? 0.05 : margin;
    var mk = Object.assign({}, rc, { layout: "mark", backdrop: "none", adds: rc.adds.filter(function (a) { return a === "star" || a === "sparkle"; }), motion: "none" });
    if (!mk.concept || mk.concept === "none") mk.concept = "hoop-star";
    return LAB.print(mk, { cssW: 420, dpr: 2 }).then(function (pr) {
      var c = R.cv(pr.w, pr.h), x = c.getContext("2d", { willReadFrequently: true });
      pr.draw(x, null, null);
      var d = x.getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height;
      var paper = [d[(W + 1) * 4], d[(W + 1) * 4 + 1], d[(W + 1) * 4 + 2]];   // the stock as it printed (a corner), not its nominal hex
      var x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (var yy = 0; yy < H; yy++) for (var xx = 0; xx < W; xx++) {
        var i = (yy * W + xx) * 4;
        if (Math.max(Math.abs(d[i] - paper[0]), Math.abs(d[i + 1] - paper[1]), Math.abs(d[i + 2] - paper[2])) > 48) {
          if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy;
        }
      }
      if (x1 < 0) { x0 = 0; y0 = 0; x1 = W - 1; y1 = H - 1; }
      var bw = x1 - x0 + 1, bh = y1 - y0 + 1, side = Math.max(bw, bh) / (1 - 2 * m);
      var out = R.cv(px, px), o = out.getContext("2d"), k = px / side;
      o.fillStyle = "rgb(" + paper.join(",") + ")"; o.fillRect(0, 0, px, px);
      o.imageSmoothingEnabled = true; o.imageSmoothingQuality = "high";
      o.drawImage(c, x0, y0, bw, bh, (px - bw * k) / 2, (px - bh * k) / 2, bw * k, bh * k);
      return { url: out.toDataURL("image/png"), w: px, h: px, canvas: out, paper: "rgb(" + paper.join(",") + ")" };
    });
  };

  LAB.ROLES = ROLES; LAB.DEFAULT_MAP = DEFAULT_MAP; LAB.layoutWord = layoutWord; LAB.drawWord = drawWord;
})();
