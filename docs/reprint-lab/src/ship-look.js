// node ship-look.js <export.json> <export.css>
// Ships a Reprint Lab look to the site (the README's "Shipping a look"):
//   1. its roles, fonts, corners and print blend go into tools/theme-core.js (then run node tools/theme.js);
//   2. its component layer (the lab's LAB.componentCSS for the recipe) becomes look.css at the repo root,
//      a GENERATED file (the one file allowed literals and color-mix: the style law covers styles.css).
// The export files come from the lab in a browser (dev lab.html, or the built reprint-lab.html):
//   const rc = LAB.recipe(LAB.decode("T82-...")), v = LAB.themeVars(rc);
//   export.json = { code: LAB.encode(rc), rc, roles: LAB.rolesFor(rc), fonts: { disp: v["--t-disp"], body: v["--t-body"],
//                   mono: v["--t-mono"] }, shape: { rbtn: v["--t-r-btn"], rcard: v["--t-r-card"], rchip: v["--t-r-chip"],
//                   blend: v["--t-print-blend"] } }
//   export.css  = LAB.componentCSS(rc)
//   the masthead: LAB.image(rc, 300, 3) -> masthead.png (the header shows it at 336px, 92% of a phone)
// Then every page's <html> carries the recipe's switches (data-btn, data-card, data-chip, data-corners,
// data-texture, data-ground) and loads /look.css after /styles.css.
// v53: phones before iOS 16.2 / Chrome 111 cannot read color-mix(). A plain fallback declaration in front would not
// help (a value with var() is only checked when used, so the later color-mix one still wins and then fails), so every
// rule that needs color-mix is followed by an @supports-not copy of just those declarations with each mix replaced by
// its larger part (a see-through mix under 70% by transparent). Placed right after its rule, the copy loses to every
// later rule exactly as the original does. `node ship-look.js --fallbacks` adds them to an existing look.css (once).
const fs = require("fs"), path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const FALLBACK_MARK = "each rule followed by a plain @supports-not copy for older phones";
const NO_MIX = "@supports not (color: color-mix(in srgb, red 50%, blue))";
function approxMix(v) {
  let prev;
  do {
    prev = v;
    v = v.replace(/color-mix\(in srgb,\s*((?:var\([^()]*\)|[^,()]+?))\s+([\d.]+)%,\s*((?:var\([^()]*\)|[^,()]+?))\s*\)/g, (m, a, p, b) => {
      p = +p; b = b.trim();
      if (b === "transparent") return p >= 70 ? a : "transparent";
      return p >= 50 ? a : b;
    });
  } while (v !== prev && /color-mix/.test(v));
  return v;
}
function oldPhoneFallbacks(css) {
  return css.replace(/([^{}]+)\{([^{}]*)\}/g, (m, sel, body) => {
    if (!/color-mix/.test(body)) return m;
    const decls = body.split(";").map(d => d.trim()).filter(d => /color-mix/.test(d)).map(d => {
      const i = d.indexOf(":"); return d.slice(0, i).trim() + ": " + approxMix(d.slice(i + 1)).trim();
    }).filter(d => !/color-mix/.test(d));
    if (!decls.length) return m;
    const clean = sel.replace(/\/\*[\s\S]*?\*\//g, "").trim();
    return m + " " + NO_MIX + " { " + clean + " { " + decls.join("; ") + "; } }";
  });
}
if (process.argv[2] === "--fallbacks") {
  const lp = path.join(REPO, "look.css");
  let lc = fs.readFileSync(lp, "utf8");
  if (lc.includes(FALLBACK_MARK)) { console.log("look.css already has its fallbacks"); process.exit(0); }
  lc = oldPhoneFallbacks(lc).replace(/(\d+) color-mix\(\) uses remain \(older phones skip them\)/, "$1 color-mix() uses remain, " + FALLBACK_MARK);
  fs.writeFileSync(lp, lc);
  console.log("look.css: fallbacks added");
  process.exit(0);
}
const [jsonPath, cssPath] = process.argv.slice(2);
if (!jsonPath || !cssPath) { console.error("usage: node ship-look.js <export.json> <export.css> | --fallbacks"); process.exit(1); }
const ex = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
let css = fs.readFileSync(cssPath, "utf8");
const KEEP = { hot: "#FFD54A" };   // owner's call (2026-09-25): hot is the fire-halo gold on the site, in every look

// 1. tools/theme-core.js
const tcPath = path.join(REPO, "tools/theme-core.js");
let tc = fs.readFileSync(tcPath, "utf8"), n = 0;
Object.keys(ex.roles).forEach(k => {
  const v = String(KEEP[k] || ex.roles[k]).toUpperCase();
  const re = new RegExp('(\\["' + k.replace(/-/g, "\\-") + '", ")#[0-9A-Fa-f]{6}(")');
  if (re.test(tc)) { tc = tc.replace(re, "$1" + v + "$2"); n++; }
});
const q = s => JSON.stringify(s).slice(1, -1);   // the font stack as it sits inside a JS string
[["disp", ex.fonts.disp], ["body", ex.fonts.body], ["mono", ex.fonts.mono]].forEach(([k, v]) => {
  if (v) tc = tc.replace(new RegExp('(\\["' + k + '", ")(?:[^"\\\\]|\\\\.)*(")'), "$1" + q(v) + "$2");
});
[["r-btn", ex.shape.rbtn], ["r-card", ex.shape.rcard], ["r-chip", ex.shape.rchip], ["print-blend", ex.shape.blend]].forEach(([k, v]) => {
  if (v) tc = tc.replace(new RegExp('(\\["' + k + '", ")[^"]*(")'), "$1" + v + "$2");
});
fs.writeFileSync(tcPath, tc);

// 2. look.css: the simple see-through mixes of a theme token become the site's own form (older phones read it);
// the rest (mixes of the lab's per-button variables) stay color-mix: phones before iOS 16.2 skip those declarations.
const before = (css.match(/color-mix/g) || []).length;
css = css.replace(/color-mix\(in srgb, var\(--t-([a-z0-9-]+)\) ([\d.]+)%, transparent\)/g, (m, name, pct) => "rgb(var(--t-" + name + "-rgb) / " + pct + "%)");
const after = (css.match(/color-mix/g) || []).length;
css = oldPhoneFallbacks(css);
const head = "/* ==== LOOK: generated by docs/reprint-lab/src/ship-look.js from the Reprint Lab. Do not edit by hand. ====\n" +
  "   Recipe: " + ex.code + "\n" +
  "   The shipped look's component layer (buttons, cards, chips, depth, neon), switched by the data-* attributes on\n" +
  "   each page's <html>. Colors come from the theme tokens in styles.css (tools/theme-core.js). To change the look,\n" +
  "   change it in the lab and ship it again. " + after + " color-mix() uses remain, " + FALLBACK_MARK + ". ==== */\n";
const glue = "\n/* ---- site glue: the masthead plate sits straight on the header (its paper is the ground) ---- */\n" +
  ".brand-logo { width: 336px; max-width: 92%; }\n";
fs.writeFileSync(path.join(REPO, "look.css"), head + css + glue);
console.log("roles set:", n, "| look.css:", Math.round((head + css + glue).length / 1024) + "KB | color-mix:", before, "->", after);
