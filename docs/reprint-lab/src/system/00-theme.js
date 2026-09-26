/* ---------- TRUE 82 LAB: the system theme ----------
   The site has ONE theme: tools/theme-core.js in the repo (window.T82THEME, loaded
   before this file). It names about 40 base roles (ground, text, label, accent, bad,
   hot, good, you, win, loss, the season-print inks...) and computes every shade the
   site CSS reads from them. A look here only has to set those roles; T82THEME.vars()
   turns them into every --t-* custom property (shades and rgb twins included), the
   same way node tools/theme.js writes the site's own :root block.

   A palette's `sys` gives a few base colors per ground; this file expands them into
   every site role:

   sys: {
     night: { ground, ground2, ground3?, line, hair?, text, text2, label?, accent, accentHi, accentEdge, accentInk,
              metal, offset, bad, badEdge, badInk, hot?, good, you, paper, paper2, ink, ink2, sun, sunEdge, sunInk, linePaper? },
     day:   { ...same keys, for a site printed on paper... }
   }
   `line` is the palette's rule (bronze on today's site); `hair` the hairline on the ground (derived when missing).
   Missing keys fall back to the palette's inks, then to today's values.

   Two roles follow the recipe, not the palette (LAB.rolesFor):
     win / loss     the "Wins and losses" setting (rc.wl): the look's own pair (accent wins, second ink loses),
                    red losses, or the classic sunflower and red
     print-paper    the stock the season prints on: the card it sits on (the look's card color), with
                    print-blend screen on a dark stock and multiply on paper */
(function () {
  var R = window.RISO, LAB = window.LAB, T = window.T82THEME;
  if (!T) throw new Error("[lab] tools/theme-core.js (window.T82THEME) must load before system/00-theme.js");
  function rgb(h) { return R.hexRGB(h); }
  function hex(c) { return R.rgbHex(c); }
  function mix(a, b, t) { var A = rgb(a), B = rgb(b); return hex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]); }
  function lum(h) { return R.lum(rgb(h)); }
  function contrast(a, b) { var x = lum(a), y = lum(b); if (x < y) { var t = x; x = y; y = t; } return (x + 0.05) / (y + 0.05); }
  function inkOn(bg, dark, light) { return contrast(bg, dark) >= contrast(bg, light) ? dark : light; }
  function ensure(fg, bg, min, towards) { var c = fg, i = 0; while (contrast(c, bg) < min && i < 12) { c = mix(c, towards, 0.18); i++; } return c; }
  function hsv(h) {
    var c = rgb(h), r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, hu = 0;
    if (d) { if (mx === r) hu = ((g - b) / d) % 6; else if (mx === g) hu = (b - r) / d + 2; else hu = (r - g) / d + 4; hu *= 60; if (hu < 0) hu += 360; }
    return { h: hu, c: d, v: mx };
  }
  function hueDist(a, b) { var d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }
  LAB.color = { mix: mix, lum: lum, contrast: contrast, inkOn: inkOn, ensure: ensure, hsv: hsv, hueDist: hueDist };

  // LAB.SITE is the site as it ships (tools/theme-core.js: Heat Vice since v52). SITE here is the v51 gold look,
  // frozen so Gold Standard, Gold Press and Print Shop keep meaning the gold site (day is the lab's own paper
  // version of it; the site has no day ground).
  LAB.SITE = T.today();
  var SITE = {"ground": "#101418", "ground-2": "#1A2027", "ground-3": "#232B34", "overlay": "#06080B", "paper": "#F4ECDD", "paper-2": "#E4D9C2", "line": "#232B34", "rule": "#6E5530", "line-paper": "#232A4E", "text": "#E8E4D8", "text-2": "#9AA0A6", "label": "#B98A4F", "ink": "#232A4E", "ink-2": "#5B5E73", "accent": "#FFB52E", "accent-hi": "#FCEEBB", "accent-edge": "#9E5A0F", "accent-ink": "#2A1A05", "metal": "#B98A4F", "bad": "#F55A41", "bad-edge": "#8C2317", "bad-ink": "#2B0D09", "hot": "#FFD54A", "good": "#68EE8E", "you": "#0078BF", "offset": "#FF48B0", "sun": "#FFB511", "sun-edge": "#C7870A", "sun-ink": "#8A5D00", "win": "#FFB511", "loss": "#F55A41", "print-paper": "#1A2027", "print-key": "#0078BF", "print-pop": "#FF48B0", "print-sun": "#FFB511", "print-dusk": "#FF6C2F", "print-night": "#00838A", "shadow": "#000000", "light": "#FFFFFF"};
  LAB.GOLD = SITE;
  var TODAY = {
    night: { ground: SITE.ground, ground2: SITE["ground-2"], ground3: SITE["ground-3"], overlay: SITE.overlay, hair: SITE.line, line: SITE.rule,
      text: SITE.text, text2: SITE["text-2"], label: SITE.label, accent: SITE.accent, accentEdge: SITE["accent-edge"], accentHi: SITE["accent-hi"],
      accentInk: SITE["accent-ink"], metal: SITE.metal, offset: SITE.offset, bad: SITE.bad, badEdge: SITE["bad-edge"], badInk: SITE["bad-ink"],
      hot: SITE.hot, good: SITE.good, you: SITE.you, paper: SITE.paper, paper2: SITE["paper-2"], ink: SITE.ink, ink2: SITE["ink-2"],
      linePaper: SITE["line-paper"], sun: SITE.sun, sunEdge: SITE["sun-edge"], sunInk: SITE["sun-ink"] },
    day: { ground: "#EFE7D6", ground2: "#F7F1E4", ground3: "#E4D9C2", line: "#C8B894", text: "#232A4E", text2: "#5B5E73",
      accent: "#FFB511", accentEdge: "#C7870A", accentHi: "#FFD266", accentInk: "#232A4E", metal: "#9E7A45",
      offset: "#FF48B0", bad: "#F65058", good: "#00875A", you: "#0078BF", paper: "#FBF6EC", ink: "#232A4E", sun: "#FFB511" }
  };
  LAB.TODAY = TODAY;

  // Base keys every ground needs; everything else is derived unless a palette's sys names it.
  var BASE_KEYS = ["ground", "text", "text2", "accent", "offset", "metal", "bad", "good", "you", "paper", "ink", "sun"];
  function base(pal, ground) {
    var t = TODAY[ground], src = pal && pal.sys && pal.sys[ground], b = {}, k;
    if (pal && pal.id === "goldstandard" && !src) { for (k in t) b[k] = t[k]; return b; }
    BASE_KEYS.forEach(function (key) { b[key] = t[key]; });
    if (pal && pal.inks && !src) {                               // derive from the inks when the palette has no sys
      var ink = function (s) { var v = pal.inks[s]; return v ? R.rgbHex(R.inkRGB(v)) : null; };
      var acc = ink(pal.map && pal.map.body) || ink("b") || ink("a");
      if (acc) b.accent = acc;
      if (ink("a")) b.offset = ink("a");
      if (ground === "day" && ink("key") && lum(ink("key")) < 0.2) { b.text = ink("key"); b.ink = ink("key"); }
    }
    if (src) for (k in src) b[k] = src[k];
    return b;
  }

  /* base -> every site role except the season print's inks */
  LAB.baseRoles = function (pal, ground) {
    var b = base(pal, ground), night = ground !== "day", r = {};
    r.ground = b.ground;
    r["ground-2"] = b.ground2 || mix(b.ground, b.text, night ? 0.06 : 0.04);
    r["ground-3"] = b.ground3 || mix(b.ground, b.text, night ? 0.12 : 0.1);
    r.overlay = b.overlay || (night ? mix(b.ground, "#000000", 0.55) : mix(b.ink || b.text, "#000000", 0.35));
    r.paper = b.paper;
    r["paper-2"] = b.paper2 || mix(b.paper, b.ink, 0.07);
    // the palette's line is the rule (bronze on today's site: the header, tickets, fields); hairlines on the
    // ground are quieter (today's are the well color at night)
    r.rule = b.line || mix(b.ground, b.metal, 0.5);
    r.line = b.hair || (night ? r["ground-3"] : r.rule);
    // Full-strength ink, like every role: the site CSS keeps each hairline's own alpha
    // (rgb(var(--t-line-paper-rgb) / .24)), so diluting here would print it twice as faint.
    r["line-paper"] = b.linePaper || b.ink;
    r.text = ensure(b.text, b.ground, 7, night ? "#FFFFFF" : "#000000");
    r["text-2"] = ensure(b.text2 || mix(b.text, b.ground, 0.35), b.ground, 4.5, night ? "#FFFFFF" : "#000000");
    // small caps labels and eyebrows: the palette's metal, lifted until it reads at 4.5:1 on the ground
    r.label = ensure(b.label || b.metal, b.ground, 4.5, night ? "#FFFFFF" : "#000000");
    r.ink = b.ink;
    r["ink-2"] = b.ink2 || mix(b.ink, b.paper, 0.32);
    r.accent = b.accent;
    r["accent-hi"] = b.accentHi || mix(b.accent, "#FFFFFF", 0.3);
    r["accent-edge"] = b.accentEdge || mix(b.accent, "#000000", 0.42);
    r["accent-ink"] = b.accentInk || inkOn(b.accent, night ? mix(b.ground, "#000000", 0.4) : b.ink, "#FFFFFF");
    r.metal = b.metal;
    r.bad = b.bad;
    r["bad-edge"] = b.badEdge || mix(b.bad, "#000000", 0.3);
    r["bad-ink"] = b.badInk || (night ? mix(b.bad, "#000000", 0.72) : mix(b.bad, "#000000", 0.28));
    r.good = b.good;
    r.you = b.you;
    r.offset = b.offset;
    r.sun = b.sun || b.accent;
    r["sun-edge"] = b.sunEdge || mix(r.sun, "#000000", 0.25);
    r["sun-ink"] = b.sunInk || mix(r.sun, "#000000", 0.48);
    // hot (the hot pick, bonuses, the Heat Check boost) is fire gold: a gain, never the NO red
    r.hot = b.hot || r.sun;
    r.shadow = night ? "#000000" : mix(b.ink || "#000000", "#000000", 0.5);
    r.light = "#FFFFFF";
    return r;
  };

  /* ---- the season print's drum: the site's riso inks -> the palette's ----
     site ink   what it prints                         the look's ink
     sun        the sun, a winning year's light         roles.sun, unless it is too close to the offset;
                                                        then the next bright ink of the palette
     pink       offsets, the sky band, the ridge tint,  roles.offset (a pale one prints heavier, so the
                loss beads, coin rims                   type in it still reads)
     blue       the record, sky, water, ridge          the palette's deep ink: its keycap color on paper
                                                        (day accent), else a drum ink, else "you"; it must
                                                        read on paper at 4:1 like today's riso blue, be cool
                                                        or dark (never the red of "bad"), and differ from
                                                        the offset and the sun; last resort roles.ink
     orange     the light in a 45-72% season           a warm drum ink that is none of the above, else sun
     teal       the light in a losing season           a cool drum ink that is none of the above, else sun
   Print Shop and Gold Standard are today's drum. A palette may pin any of these with
   pal.print = { blue: "violet", sun: "#FFB511", ... } (Riso swatch keys or hex). LAB.drum("vice", "night") shows it. */
  var TODAY_DRUM = { sun: SITE["print-sun"], pink: SITE["print-pop"], blue: SITE["print-key"], teal: SITE["print-night"], orange: SITE["print-dusk"] };
  var TODAY_PALETTES = { printshop: 1, goldstandard: 1 };
  function distinct(a, b) {                               // two inks read as two inks
    if (!a || !b) return true;
    var A = hsv(a), B = hsv(b), x = rgb(a), y = rgb(b);
    var dist = Math.sqrt((x[0] - y[0]) * (x[0] - y[0]) + (x[1] - y[1]) * (x[1] - y[1]) + (x[2] - y[2]) * (x[2] - y[2]));
    var lr = (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    return (A.c > 0.25 && B.c > 0.25 && hueDist(A.h, B.h) >= 30) || lr >= 1.5 || dist >= 110;
  }
  function apart(a, b) {                                  // the deep ink must not be a darker cut of the sun ink
    var A = hsv(a), B = hsv(b), lr = (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    return (A.c > 0.2 && B.c > 0.2 && hueDist(A.h, B.h) >= 30) || lr >= 2;
  }
  function pick(list, ok) { for (var i = 0; i < list.length; i++) if (list[i] && ok(list[i])) return list[i]; return null; }
  function inkHex(v) { try { return v ? hex(R.inkRGB(v)) : null; } catch (e) { return null; } }
  var drums = {};
  LAB.drum = function (palId, ground) {
    var dk = palId + "/" + ground;
    if (drums[dk]) return drums[dk];
    var pal = LAB.palettes[palId] || LAB.palettes.printshop || {}, N = LAB.baseRoles(pal, ground), D = LAB.baseRoles(pal, "day"), ov = pal.print || {};
    var paper = N.paper, out = {}, k;
    var drum = ["c", "a", "b", "key"].map(function (s) { return inkHex(pal.inks && pal.inks[s]); }).filter(Boolean);
    if (TODAY_PALETTES[pal.id]) { for (k in TODAY_DRUM) out[k] = TODAY_DRUM[k]; }
    else {
      out.pink = inkHex(ov.pink) || N.offset;
      var pinkMin = hsv(out.pink).c >= 0.5 ? 1.65 : 2.3;          // a fluorescent reads at less contrast than a grey
      for (var t0 = 0; t0 < 0.6 && contrast(out.pink, paper) < pinkMin; t0 += 0.1) out.pink = mix(out.pink, N.ink, 0.12);
      out.sun = inkHex(ov.sun) || pick([N.sun, N.accent].concat(drum, [D.sun]), function (c) {
        return lum(c) >= 0.18 && hsv(c).c >= 0.35 && contrast(c, paper) >= 1.25 && distinct(c, out.pink);
      }) || N.sun;
      var deepOK = function (c) {
        var H = hsv(c), L = lum(c);
        return (H.c >= 0.2 || (c === D.accent && L < 0.03)) && ((H.h >= 75 && H.h <= 335) || L < 0.06) && distinct(c, out.pink) && apart(c, out.sun);
      };
      out.blue = inkHex(ov.blue) || pick([D.accent].concat(drum, [D.you, N.you]).map(function (c) {
        if (!c || contrast(c, paper) < 2.2) return null;
        for (var t = 0; t <= 0.6 && contrast(c, paper) < 4; t += 0.1) c = mix(c, N.ink, 0.1);
        return contrast(c, paper) >= 4 ? c : null;
      }), deepOK) || N.ink;
      out.orange = inkHex(ov.orange) || pick(drum.concat([N.accent]), function (c) {
        var H = hsv(c);
        return (H.h <= 50 || H.h >= 335) && H.c >= 0.4 && lum(c) >= 0.15 && distinct(c, out.sun) && distinct(c, out.pink) && distinct(c, out.blue) && distinct(c, N.bad);
      }) || out.sun;
      out.teal = inkHex(ov.teal) || pick(drum.concat([N.you, D.you]), function (c) {
        var H = hsv(c), L = lum(c);
        return H.h >= 150 && H.h <= 285 && H.c >= 0.3 && L >= 0.06 && L <= 0.5 && distinct(c, out.blue) && distinct(c, out.pink) && distinct(c, out.sun);
      }) || out.sun;
    }
    return (drums[dk] = out);
  };

  /* every site role for a palette on a ground: the base roles, the drum, and the look's default win/loss pair */
  LAB.roles = function (pal, ground) {
    var r = LAB.baseRoles(pal, ground), d = LAB.drum(pal && pal.id, ground);
    r["print-key"] = d.blue; r["print-pop"] = d.pink; r["print-sun"] = d.sun; r["print-dusk"] = d.orange; r["print-night"] = d.teal;
    r["print-paper"] = ground === "day" ? r.paper : r["ground-2"];
    var wl = LAB.winLoss(r, pal && pal.id === "goldstandard" ? "classic" : "pair");
    r.win = wl.win; r.loss = wl.loss;
    return r;
  };

  /* ---- wins and losses ----
     pair     the look's own two inks: the accent wins, the second ink (the offset, else "you", else bad) loses
     swap     the same two inks the other way round (Heat Vice: aqua wins, pink losses, the owner's pick)
     red      the look's win, losses in a neon red (the bad role, lit up to glow on a dark card)
     classic  today's: sunflower wins, red losses
     A win is a bright, colorful ink: when the accent is a dark key ink or a neutral (a navy or black keycap
     on paper, a white marquee), the sunflower wins instead. A loss must read as a second color next to the
     win (hue apart, or clearly lighter or darker), and is never a green (green means good news). */
  function winInk(r) { var A = hsv(r.accent); return A.c >= 0.3 && lum(r.accent) >= 0.05 ? r.accent : r.sun; }
  LAB.winLoss = function (r, mode) {
    var night = lum(r.ground) < 0.35, win, loss;
    if (mode === "classic") return { win: r.sun, loss: r.bad };
    if (mode === "swap") { var pr = LAB.winLoss(r, "pair"); return { win: pr.loss, loss: pr.win }; }   // the second ink wins, the accent loses
    win = winInk(r);
    if (mode === "red") {
      loss = night ? ensure(r.bad, r["ground-2"], 4, "#FFFFFF") : r.bad;
      return { win: win, loss: loss };
    }
    var W = hsv(win);
    loss = pick([r.offset, r.you, r.bad], function (c) {
      var A = hsv(c);
      if (A.c > 0.25 && A.h >= 80 && A.h <= 170) return false;                          // any green reads as good news
      return (A.c > 0.2 && W.c > 0.2 && hueDist(A.h, W.h) >= 40) || contrast(c, win) >= 3;
    }) || r.bad;
    return { win: win, loss: loss };
  };

  /* ---- system options (the console reads these) ---- */
  LAB.SYS = {
    ground: [["night", "Night"], ["day", "Paper"]],
    btn: [["keycap", "Keycap"], ["offset", "Riso offset"], ["stamp", "Stamp"], ["ticket", "Ticket"], ["sticker", "Sticker"], ["pill", "Pill"], ["neon", "Neon"], ["halftone", "Halftone"]],
    card: [["tunnel", "Night panel"], ["paper", "Paper slip"], ["outline", "Ink outline"], ["ticket", "Ticket"], ["flat", "Flat tint"]],
    chip: [["keycap", "Keycap"], ["ink", "Solid ink"], ["outline", "Outline"], ["stamp", "Stamp"]],
    corners: [["square", "Square"], ["soft", "Soft"], ["round", "Round"]],
    texture: [["none", "None"], ["grain", "Paper grain"], ["dots", "Halftone"]],
    wl: [["pair", "Look pair"], ["swap", "Pair, swapped"], ["red", "Red losses"], ["classic", "Gold and red"]],
    body: [["barlow", "Barlow"], ["plexsans", "IBM Plex Sans"], ["worksans", "Work Sans"], ["atkinson", "Atkinson Hyperlegible"], ["dmsans", "DM Sans"], ["rubik", "Rubik"], ["publicsans", "Public Sans"]],
    mono: [["plexmono", "IBM Plex Mono"], ["jetbrains", "JetBrains Mono"], ["spacemono", "Space Mono"], ["dmmono", "DM Mono"], ["courierprime", "Courier Prime"]]
  };
  LAB.BODY = {
    barlow: { family: "Barlow", css: "Barlow:ital,wght@0,400;0,500;0,600;0,700;1,400" },
    plexsans: { family: "IBM Plex Sans", css: "IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400" },
    worksans: { family: "Work Sans", css: "Work+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400" },
    atkinson: { family: "Atkinson Hyperlegible", css: "Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400" },
    dmsans: { family: "DM Sans", css: "DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400" },
    rubik: { family: "Rubik", css: "Rubik:ital,wght@0,400;0,500;0,600;0,700;1,400" },
    publicsans: { family: "Public Sans", css: "Public+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400" }
  };
  LAB.MONO = {
    plexmono: { family: "IBM Plex Mono", css: "IBM+Plex+Mono:wght@400;500;600;700" },
    jetbrains: { family: "JetBrains Mono", css: "JetBrains+Mono:wght@400;500;600;700" },
    spacemono: { family: "Space Mono", css: "Space+Mono:wght@400;700" },
    dmmono: { family: "DM Mono", css: "DM+Mono:wght@400;500" },
    courierprime: { family: "Courier Prime", css: "Courier+Prime:wght@400;700" }
  };
  /* "texture" is the site texture (none | grain | dots). The masthead's paper tooth (0..2) used the same
     key, so the system default wiped it and every masthead printed on flat paper. The masthead's tooth
     now lives in "tooth"; keep its default before the system keys go in. */
  var bannerKnowsTooth = typeof LAB.DEFAULT.tooth === "number";
  if (!bannerKnowsTooth) LAB.DEFAULT.tooth = typeof LAB.DEFAULT.texture === "number" ? LAB.DEFAULT.texture : 1;
  LAB.SYS_DEFAULT = { ground: "night", btn: "keycap", card: "tunnel", chip: "keycap", corners: "soft", texture: "none", disp: "match", body: "barlow", mono: "plexmono",
    sysPalette: "match", wl: "pair" };
  for (var sk in LAB.SYS_DEFAULT) LAB.DEFAULT[sk] = LAB.SYS_DEFAULT[sk];
  // Old recipes (saved state, favorites, pasted codes, dev page URLs) can carry the tooth as a number in
  // "texture": move it to "tooth" (it is the newer intent, so it wins), and let an unknown site texture
  // fall back to the default. Keys this lab no longer reads (the v50 "Results tiles", say) are simply ignored.
  var TEXTURES = LAB.SYS.texture.map(function (o) { return o[0]; }), recipeBase = LAB.recipe, printing = 0;
  LAB.recipe = function (r) {
    if (r && r.texture != null && TEXTURES.indexOf(r.texture) < 0) {
      var c = {}, k, n = parseFloat(r.texture);
      for (k in r) if (k !== "texture") c[k] = r[k];
      if (!isNaN(n)) c.tooth = Math.max(0, Math.min(2, n));
      r = c;
    }
    var o = recipeBase(r);
    if (printing) o.texture = o.tooth;
    return o;
  };
  // Bridge while banner.js still hands rc.texture to the paper (it has no "tooth" of its own yet):
  // inside LAB.print, the recipe it reads carries the tooth in "texture". Turns itself off once
  // banner.js defines LAB.DEFAULT.tooth and reads rc.tooth.
  if (!bannerKnowsTooth && LAB.print) {
    var printBase = LAB.print;
    LAB.print = function () { printing++; try { return printBase.apply(this, arguments); } finally { printing--; } };
  }

  /* ---- a recipe's palette and its roles ---- */
  LAB.palIdOf = function (rc) { return rc.sysPalette && rc.sysPalette !== "match" && rc.sysPalette !== "today" ? rc.sysPalette : rc.palette; };
  // the color a card is painted in, per card style (the season print is printed on it)
  LAB.cardColor = function (rc, r) {
    var night = (rc.ground || "night") !== "day";
    if (!night || rc.card === "paper") return r.paper;
    if (rc.card === "outline") return r.ground;
    if (rc.card === "flat") return mix(r.ground, r.text, 0.07);
    return r["ground-2"];
  };
  LAB.rolesFor = function (rc) {
    if (rc.sysPalette === "today") { var o = {}, k; for (k in LAB.SITE) o[k] = LAB.SITE[k]; return o; }
    var r = LAB.roles(LAB.palettes[LAB.palIdOf(rc)], rc.ground || "night");
    var wl = LAB.winLoss(r, rc.wl || "pair");
    r.win = wl.win; r.loss = wl.loss;
    r["print-paper"] = LAB.cardColor(rc, r);
    return r;
  };

  /* The CSS custom properties for a recipe: every site token (roles, shades, rgb twins), fonts, radii. */
  LAB.themeVars = function (rc) {
    var roles = LAB.rolesFor(rc), fonts = {}, shape = {};
    var df = LAB.displayFace ? LAB.displayFace(rc) : (rc.disp && rc.disp !== "match" ? LAB.fonts[rc.disp] : LAB.fonts[rc.font]);
    if (df) fonts.disp = "\"" + df.family + "\", \"Barlow Condensed\", \"Arial Narrow\", sans-serif";
    var bf = LAB.BODY[rc.body || "barlow"]; if (bf) fonts.body = "\"" + bf.family + "\", system-ui, sans-serif";
    var mf = LAB.MONO[rc.mono || "plexmono"]; if (mf) fonts.mono = "\"" + mf.family + "\", ui-monospace, monospace";
    var cr = { square: [0, 0, 0], soft: [5, 8, 4], round: [14, 18, 999] }[rc.corners || "soft"] || [5, 8, 4];
    shape["r-btn"] = cr[0] + "px"; shape["r-card"] = cr[1] + "px"; shape["r-chip"] = (cr[2] === 999 ? 999 : Math.max(0, cr[2])) + "px";
    // a dark stock prints like fluorescent ink on black card (the inks add light); paper takes ink away
    shape["print-blend"] = lum(roles["print-paper"]) < 0.35 ? "screen" : "multiply";
    var v = T.vars(roles, fonts, shape);
    if (df) { v["--t-disp-weight"] = String(df.weight || 700); v["--t-disp-style"] = df.style || "normal"; }
    return v;
  };
  LAB.themeFontsCSS = function (rc) {
    var out = [], df = LAB.displayFace ? LAB.displayFace(rc) : (rc.disp && rc.disp !== "match" ? LAB.fonts[rc.disp] : LAB.fonts[rc.font]);
    if (df && df.css) out.push(df.css);
    if (LAB.BODY[rc.body] && rc.body !== "barlow") out.push(LAB.BODY[rc.body].css);
    if (LAB.MONO[rc.mono] && rc.mono !== "plexmono") out.push(LAB.MONO[rc.mono].css);
    return out;
  };
})();
