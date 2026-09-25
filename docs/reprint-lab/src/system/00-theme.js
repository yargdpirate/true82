/* ---------- TRUE 82 LAB: the system theme ----------
   A palette's `sys` gives a few base colors per ground; this file expands
   them into every role the tokenized site CSS reads (--t-<role>, see
   SPEC-roles.md), and applies a whole recipe (colors, fonts, component
   styles) to a document.

   sys: {
     night: { ground, ground2, text, text2, accent, offset, metal, bad, good, you, paper, ink, sun, line?, linePaper?, accentInk? },
     day:   { ...same keys, for a site printed on paper... }
   }
   Missing keys fall back to the palette's inks, then to today's values. */
(function () {
  var R = window.RISO, LAB = window.LAB;
  function rgb(h) { return R.hexRGB(h); }
  function hex(c) { return R.rgbHex(c); }
  function mix(a, b, t) { var A = rgb(a), B = rgb(b); return hex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]); }
  function lum(h) { return R.lum(rgb(h)); }
  function contrast(a, b) { var x = lum(a), y = lum(b); if (x < y) { var t = x; x = y; y = t; } return (x + 0.05) / (y + 0.05); }
  function inkOn(bg, dark, light) { return contrast(bg, dark) >= contrast(bg, light) ? dark : light; }
  function ensure(fg, bg, min, towards) { var c = fg, i = 0; while (contrast(c, bg) < min && i < 12) { c = mix(c, towards, 0.18); i++; } return c; }
  LAB.color = { mix: mix, lum: lum, contrast: contrast, inkOn: inkOn, ensure: ensure };

  // Today's site, as base colors (Gold Standard reproduces the live look).
  var TODAY = {
    night: { ground: "#101418", ground2: "#1A2027", ground3: "#232B34", line: "#6E5530", text: "#E8E4D8", text2: "#9AA0A6",
      accent: "#FFB52E", accentEdge: "#9E5A0F", accentHi: "#F8B647", accentInk: "#2A1A05", metal: "#B98A4F",
      offset: "#FF48B0", bad: "#E2654E", good: "#3FAE5A", you: "#0078BF", paper: "#F4ECDD", ink: "#232A4E", sun: "#FFB511" },
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

  /* base -> every role */
  LAB.roles = function (pal, ground) {
    var b = base(pal, ground), night = ground !== "day", r = {};
    r.ground = b.ground;
    r["ground-2"] = b.ground2 || mix(b.ground, b.text, night ? 0.06 : 0.04);
    r["ground-3"] = b.ground3 || mix(b.ground, b.text, night ? 0.12 : 0.1);
    r.overlay = night ? mix(b.ground, "#000000", 0.55) : mix(b.ink || b.text, "#000000", 0.35);
    r.paper = b.paper;
    r["paper-2"] = b.paper2 || mix(b.paper, b.ink, 0.07);
    r.line = b.line || mix(b.ground, b.metal, 0.5);
    // Full-strength ink, like every role: the site CSS keeps each hairline's own alpha
    // (color-mix(var(--t-line-paper) 24%, transparent)), so diluting here would print it twice as faint.
    r["line-paper"] = b.linePaper || b.ink;
    r.text = ensure(b.text, b.ground, 7, night ? "#FFFFFF" : "#000000");
    r["text-2"] = ensure(b.text2 || mix(b.text, b.ground, 0.35), b.ground, 4.5, night ? "#FFFFFF" : "#000000");
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
    r.shadow = night ? "#000000" : mix(b.ink || "#000000", "#000000", 0.5);
    r.light = "#FFFFFF";
    return r;
  };

  /* ---- system options (the console reads these) ---- */
  LAB.SYS = {
    ground: [["night", "Night"], ["day", "Paper"]],
    btn: [["keycap", "Keycap"], ["offset", "Riso offset"], ["stamp", "Stamp"], ["ticket", "Ticket"], ["sticker", "Sticker"], ["pill", "Pill"], ["neon", "Neon"], ["halftone", "Halftone"]],
    card: [["tunnel", "Night panel"], ["paper", "Paper slip"], ["outline", "Ink outline"], ["ticket", "Ticket"], ["flat", "Flat tint"]],
    chip: [["keycap", "Keycap"], ["ink", "Solid ink"], ["outline", "Outline"], ["stamp", "Stamp"]],
    corners: [["square", "Square"], ["soft", "Soft"], ["round", "Round"]],
    texture: [["none", "None"], ["grain", "Paper grain"], ["dots", "Halftone"]],
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
  LAB.SYS_DEFAULT = { ground: "night", btn: "keycap", card: "tunnel", chip: "keycap", corners: "soft", texture: "none", disp: "match", body: "barlow", mono: "plexmono", sysPalette: "match" };
  for (var sk in LAB.SYS_DEFAULT) LAB.DEFAULT[sk] = LAB.SYS_DEFAULT[sk];
  // Old recipes (saved state, favorites, pasted codes, dev page URLs) can carry the tooth as a number in
  // "texture": move it to "tooth" (it is the newer intent, so it wins), and let an unknown site texture
  // fall back to the default.
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

  /* The CSS custom properties for a recipe: role colors, fonts, radii. */
  LAB.themeVars = function (rc) {
    var palId = rc.sysPalette && rc.sysPalette !== "match" ? rc.sysPalette : rc.palette;
    var pal = LAB.palettes[palId], roles = LAB.roles(pal, rc.ground || "night"), v = {}, k;
    for (k in roles) v["--t-" + k] = roles[k];
    var df = LAB.displayFace ? LAB.displayFace(rc) : (rc.disp && rc.disp !== "match" ? LAB.fonts[rc.disp] : LAB.fonts[rc.font]);
    if (df) { v["--t-disp"] = "\"" + df.family + "\", \"Barlow Condensed\", \"Arial Narrow\", sans-serif"; v["--t-disp-weight"] = String(df.weight || 700); v["--t-disp-style"] = df.style || "normal"; }
    var bf = LAB.BODY[rc.body || "barlow"]; if (bf) v["--t-body"] = "\"" + bf.family + "\", system-ui, sans-serif";
    var mf = LAB.MONO[rc.mono || "plexmono"]; if (mf) v["--t-mono"] = "\"" + mf.family + "\", ui-monospace, monospace";
    var cr = { square: [0, 0, 0], soft: [5, 8, 4], round: [14, 18, 999] }[rc.corners || "soft"] || [5, 8, 4];
    v["--t-r-btn"] = cr[0] + "px"; v["--t-r-card"] = cr[1] + "px"; v["--t-r-chip"] = (cr[2] === 999 ? 999 : Math.max(0, cr[2])) + "px";
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
