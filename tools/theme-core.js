/* ---------- TRUE 82 THEME CORE ----------
   The one source of the site's colors, fonts and radii (docs/STYLE-GUIDE.md).

   A look is a set of BASE ROLES (about 40 colors, each with one meaning). Every other
   shade the site uses is a named RECIPE over those roles, so a new look only sets the
   roles and every shade follows. build() turns roles into every token; block() prints
   the :root theme block that sits at the top of styles.css.

   Used by:
     node tools/theme.js         prints or rewrites the theme block in styles.css
     test.js                     fails when styles.css's theme block drifts from this file
     the Reprint Lab             applies any look to the real screens with the same recipes

   Rules the rest of the code keeps (test.js enforces them):
     - no color or font literal anywhere in styles.css outside the theme block
     - opaque colors are var(--t-name); see-through ones rgb(var(--t-name-rgb) / .3)
     - fonts are var(--t-disp), var(--t-body), var(--t-mono) (var(--t-serif) is the Tribune's)
   Plain ES5, no dependencies: it runs in node and in the browser (window.T82THEME). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.T82THEME = factory();
})(this, function () {
  "use strict";

  /* ---- base roles: what a look sets. Today's values are the live site. ---- */
  var ROLES = [
    ["surfaces"],
    ["ground", "#16122B", "the page"],
    ["ground-2", "#26223A", "panels and cards"],
    ["ground-3", "#332F47", "wells, hovers, pressed rows"],
    ["overlay", "#0A0813", "scrims behind sheets and overlays"],
    ["paper", "#FDF2F7", "light paper (the Tribune's newsprint)"],
    ["paper-2", "#EEE3EB", "darker paper"],
    ["lines"],
    ["line", "#332F47", "hairlines and borders on the ground"],
    ["rule", "#534176", "bronze rules: the header, tickets, fields"],
    ["line-paper", "#2A1B4A", "hairlines on paper"],
    ["text"],
    ["text", "#F7F3FF", "primary text"],
    ["text-2", "#A6A2B3", "secondary text"],
    ["label", "#9D7AD2", "small caps labels and eyebrows"],
    ["ink", "#2A1B4A", "text on paper"],
    ["ink-2", "#64577A", "secondary text on paper"],
    ["brand and action"],
    ["accent", "#FF48B0", "the main action and the brand"],
    ["accent-hi", "#FF88CC", "the accent's pale highlight"],
    ["accent-edge", "#7A2559", "keycap edge under an accent face"],
    ["accent-ink", "#2B0620", "text printed on an accent face"],
    ["metal", "#9D7AD2", "bronze ornament: frames, pips, rails"],
    ["meaning (one meaning per color)"],
    ["bad", "#FF5A4E", "NO, a bad trait, danger"],
    ["bad-edge", "#A63B33", "keycap edge under a bad face"],
    ["bad-ink", "#4C1B17", "text printed on a bad face"],
    ["hot", "#FFD54A", "fire gold, a gain: the hot pick, bonuses, the Heat Check boost, the fire sale"],
    ["good", "#32A66E", "good news, money coming in"],
    ["you", "#7A89FA", "you: your vote, your marker"],
    ["offset", "#41C6EA", "the second ink: misregistered offsets and highlights"],
    ["sun", "#FFB511", "yes: tags that are on, the paper world's yes"],
    ["sun-edge", "#BF880D", "keycap edge under a sun face"],
    ["sun-ink", "#8C6409", "deep sun text"],
    ["the game"],
    ["win", "#41C6EA", "a win: reel coins, the season strip"],
    ["loss", "#FF48B0", "a loss: reel rings, the season strip"],
    ["the season print (results-riso.js, reel-riso.js)"],
    ["print-paper", "#16122B", "the stock the season prints on (dark: the inks glow, like screen print on black card)"],
    ["print-key", "#D41F84", "the key ink: sky, water, ticks, month labels"],
    ["print-pop", "#41C6EA", "the second ink: offsets, ridges, rims"],
    ["print-sun", "#FFB511", "the light of a winning season"],
    ["print-dusk", "#FFB511", "the light of a middling season"],
    ["print-night", "#9D7AD2", "the light of a losing season"],
    ["neutral effects"],
    ["shadow", "#000000", "drop shadows, inner shadows"],
    ["light", "#FFFFFF", "highlights and sheens"]
  ];

  /* ---- named shades: [name, role, percent, partner, what it is]
     value = color-mix(in srgb, role percent%, partner), computed here so the CSS never needs color-mix. */
  var SHADES = [
    ["accent-face", "accent", 72, "accent-edge", "keycap face: the accent pushed toward its edge"],
    ["accent-glow", "accent-hi", 58, "accent", "gold light between the accent and its highlight: focus rings, hot meter steps"],
    ["good-soft", "good", 33, "text-2", "good as text on the ground (calm, not neon)"],
    ["good-top", "good", 80, "ground", "green keycap top"],
    ["good-face", "good", 70, "shadow", "green keycap face"],
    ["good-edge", "good", 46, "shadow", "green keycap edge"],
    ["good-ink", "good", 18, "shadow", "text on a green keycap"],
    ["bad-soft", "bad", 84, "text-2", "bad as text and quiet marks on the ground"],
    ["bad-top", "bad", 91, "light", "red keycap top"],
    ["bad-face", "bad", 63, "bad-edge", "red keycap face"],
    ["bad-hi", "bad", 71, "light", "light red: money going out"],
    ["warn", "bad", 29, "accent", "orange: money running low"],
    ["hot-hi", "hot", 88, "light", "the hot pick's name and bonus"],
    ["hot-glow", "hot", 67, "accent-hi", "the fire bonus meter"],
    ["text-3", "text-2", 42, "ground-3", "the dimmest text: disabled"],
    ["off-face", "rule", 39, "ground-2", "a disabled keycap"],
    ["off-edge", "rule", 51, "ground-3", "a disabled keycap's rim"],
    ["off-ink", "rule", 80, "text-2", "a disabled keycap's label"],
    ["overlay-warm", "overlay", 90, "accent", "the Heat Check's warm scrim"],
    ["metal-deep", "metal", 53, "ground", "bronze in shadow"],
    ["metal-dark", "metal", 40, "shadow", "bronze in deep shadow"],
    ["news-ink", "overlay", 88, "metal", "the Tribune's newsprint ink"],
    ["news-ink-2", "ground-2", 70, "metal", "the Tribune's secondary ink"],
    ["news-red", "bad-edge", 74, "bad", "the Tribune's stamp red"]
  ];

  /* ---- type, shape and fixed effects ---- */
  var FONTS = [
    ["disp", "\"Big Shoulders Display\", \"Barlow Condensed\", \"Arial Narrow\", sans-serif", "display: numbers, titles, buttons"],
    ["body", "\"Rubik\", system-ui, sans-serif", "running text"],
    ["mono", "\"Space Mono\", ui-monospace, monospace", "data, labels, eyebrows"],
    ["serif", "Georgia, \"Times New Roman\", serif", "the Tribune only (retiring)"]
  ];
  var SHAPE = [
    ["r-btn", "14px", "button corners"],
    ["r-card", "18px", "card corners (sheets round their top by twice this, at least 14px)"],
    ["r-chip", "999px", "chip and tag corners"],
    // the type scale: every shared piece sizes its text from these
    ["fs-hero", "64px", "the season record"],
    ["fs-num", "40px", "a card's hero number"],
    ["fs-title", "27px", "sheet and screen titles"],
    ["fs-head", "17px", "section headers in the display face"],
    ["fs-name", "17px", "a player or item name"],
    ["fs-body", "16px", "running text"],
    ["fs-small", "13px", "notes and secondary lines"],
    ["fs-data", "12px", "mono data: box scores, seasons, counts"],
    ["fs-label", "10.5px", "eyebrows and small caps labels"]
  ];
  // an optional filter a look can put on the season print (none today)
  var EFFECTS = [
    ["print-blend", "screen", "how inks meet the print stock: screen (light on dark stock) or multiply (ink on paper)"],
    ["print-filter", "none", "an extra CSS filter on the on-screen print (the poster applies it too)"]
  ];
  // never themed: fire is fire, a basketball is orange, a mask is only its alpha
  var FX = [
    ["fire-core", "#FFFFFF"], ["fire-1", "#FFE07A"], ["fire-2", "#FF9A24"], ["fire-3", "#E0531A"],
    ["fire-glow", "#FF8A1E"], ["fire-halo", "#FFD54A"],
    ["ball-hi", "#FFCB84"], ["ball", "#E8802A"], ["ball-lo", "#A64E10"], ["ball-seam", "#6E3208"], ["ball-net", "#E6E0D2"], ["ball-rim", "#E0531A"],
    ["mask", "#000000"]
  ];
  // names older code and grafted modes may still use: they read the roles, so they theme too
  var LEGACY = [
    ["ink", "ground"], ["tunnel", "ground-2"], ["tunnel-2", "ground-3"], ["chalk", "text"], ["chalk-dim", "text-2"],
    ["maple", "metal"], ["maple-line", "rule"], ["amber", "accent"], ["whistle", "bad-soft"], ["ok", "good-soft"]
  ];

  /* ---- color math (sRGB, the same as CSS color-mix in srgb) ---- */
  function rgb(hex) {
    var h = String(hex).replace(/^#/, "");
    if (h.length === 3) h = h.replace(/(.)/g, "$1$1");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function hex(c) {
    return "#" + c.map(function (x) { var v = Math.max(0, Math.min(255, Math.round(x))); return (v < 16 ? "0" : "") + v.toString(16); }).join("").toUpperCase();
  }
  function mix(a, pct, b) { var A = rgb(a), B = rgb(b), t = pct / 100; return hex([A[0] * t + B[0] * (1 - t), A[1] * t + B[1] * (1 - t), A[2] * t + B[2] * (1 - t)]); }

  function roleList() { return ROLES.filter(function (r) { return r.length > 1; }); }
  function today() { var o = {}; roleList().forEach(function (r) { o[r[0]] = r[1]; }); return o; }

  /* roles (any subset; the rest fall back to today's) -> every color token */
  function build(roles) {
    var base = today(), out = {}, k;
    for (k in roles || {}) if (roles[k] && base.hasOwnProperty(k)) base[k] = String(roles[k]).toUpperCase();
    for (k in base) out[k] = base[k];
    SHADES.forEach(function (s) { out[s[0]] = mix(out[s[1]], s[2], out[s[3]]); });
    return out;
  }
  /* every custom property a look sets: colors, their channel twins, fonts, radii */
  function vars(roles, fonts, shape) {
    var c = build(roles), v = {}, k;
    for (k in c) { v["--t-" + k] = c[k]; v["--t-" + k + "-rgb"] = rgb(c[k]).join(" "); }
    FONTS.forEach(function (f) { v["--t-" + f[0]] = (fonts && fonts[f[0]]) || f[1]; });
    SHAPE.forEach(function (s) { v["--t-" + s[0]] = (shape && shape[s[0]]) || s[1]; });
    EFFECTS.forEach(function (e) { v["--t-" + e[0]] = (shape && shape[e[0]]) || e[1]; });
    return v;
  }

  var BEGIN = "/* ==== THEME: generated by tools/theme.js from tools/theme-core.js. Do not edit by hand. ==== */";
  var END = "/* ==== END THEME ==== */";
  function pad(s, n) { s = String(s); while (s.length < n) s += " "; return s; }
  /* the :root block for styles.css */
  function block(roles, fonts, shape) {
    var c = build(roles), L = [BEGIN, ":root {"];
    ROLES.forEach(function (r) {
      if (r.length === 1) { L.push("  /* " + r[0] + " */"); return; }
      L.push("  " + pad("--t-" + r[0] + ": " + c[r[0]] + ";", 30) + "/* " + r[2] + " */");
    });
    L.push("  /* named shades: a recipe over the roles, computed by tools/theme-core.js */");
    SHADES.forEach(function (s) {
      L.push("  " + pad("--t-" + s[0] + ": " + c[s[0]] + ";", 30) + "/* " + s[1] + " " + s[2] + "% + " + s[3] + ": " + s[4] + " */");
    });
    L.push("  /* channels, for see-through colors: rgb(var(--t-name-rgb) / .3) */");
    var names = Object.keys(c), line = "";
    names.forEach(function (n, i) {
      var d = "--t-" + n + "-rgb: " + rgb(c[n]).join(" ") + ";";
      if ((line + " " + d).length > 118) { L.push("  " + line.trim()); line = ""; }
      line += " " + d;
    });
    if (line) L.push("  " + line.trim());
    L.push("  /* type */");
    FONTS.forEach(function (f) { L.push("  " + pad("--t-" + f[0] + ": " + ((fonts && fonts[f[0]]) || f[1]) + ";", 64) + "/* " + f[2] + " */"); });
    L.push("  /* shape */");
    SHAPE.forEach(function (s) { L.push("  " + pad("--t-" + s[0] + ": " + ((shape && shape[s[0]]) || s[1]) + ";", 30) + "/* " + s[2] + " */"); });
    L.push("  /* effects */");
    EFFECTS.forEach(function (e) { L.push("  --t-" + e[0] + ": " + ((shape && shape[e[0]]) || e[1]) + ";  /* " + e[2] + " */"); });
    L.push("  /* fixed effects: never themed */");
    L.push("  " + FX.map(function (f) { return "--fx-" + f[0] + ": " + f[1] + ";"; }).join(" ").replace(/(.{1,110})(\s|$)/g, "$1\n  ").trim());
    L.push("  /* older names (old code, grafted modes): they read the roles, so they theme too */");
    L.push("  " + LEGACY.map(function (a) { return "--" + a[0] + ": var(--t-" + a[1] + ");"; }).join(" ").replace(/(.{1,110})(\s|$)/g, "$1\n  ").trim());
    L.push("  --disp: var(--t-disp); --body: var(--t-body); --mono: var(--t-mono);");
    L.push("}", END);
    return L.join("\n");
  }

  return {
    ROLES: ROLES, SHADES: SHADES, FONTS: FONTS, SHAPE: SHAPE, EFFECTS: EFFECTS, FX: FX, LEGACY: LEGACY, BEGIN: BEGIN, END: END,
    roles: roleList, today: today, build: build, vars: vars, block: block, mix: mix, rgb: rgb, hex: hex
  };
});
