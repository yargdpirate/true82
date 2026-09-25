#!/usr/bin/env node
/* ---------- TRUE 82 STYLE LAW ----------
   The one style guide, enforced. test.js runs check() and fails on any finding;
   run it alone for a readable report:

     node tools/style-law.js               check the site, print every finding
     node tools/style-law.js path/a.css    check one file (a graft, say) the same way

   The law (docs/STYLE-GUIDE.md):
     1. Colors and fonts are written in ONE place: the theme block at the top of
        styles.css, generated from tools/theme-core.js. It must match the generator.
     2. Everywhere else, a color is a token: var(--t-name) when opaque,
        rgb(var(--t-name-rgb) / .3) when see-through. No hex, rgb(), hsl(),
        named colors or color-mix() (color-mix breaks older phones).
     3. A font is var(--t-disp), var(--t-body) or var(--t-mono) (var(--t-serif)
        belongs to the retiring Tribune). Canvas code reads the faces from the theme.
     4. Every token a rule reads exists in the theme block.
   Each finding names the nearest theme token, so the fix is one edit (or run
   node tools/stylefix.js <file> --write to apply the suggestions). */
"use strict";
const fs = require("fs"), path = require("path");
const T = require("./theme-core.js");
const ROOT = path.join(__dirname, "..");

/* ---- what the law covers ---- */
const CSS_FILES = ["styles.css"];
// browser JS that builds UI (canvas modules may use pure black, and only as a coverage mask)
const JS_FILES = ["app.js", "results-riso.js", "reel-riso.js", "analytics.js", "retention-client.js", "challenges.js", "daily-core.js", "sim-core.js"];
const MASK_OK = { "results-riso.js": 1, "reel-riso.js": 1 };
// pages: their <style> blocks and style="" attributes (<meta theme-color> and the favicon are browser chrome, not styles)
const HTML_FILES = ["index.html", "404.html", "bonuses/index.html", "traits/index.html", "faq/index.html", "how-it-works/index.html",
  "can-you-go-82-0/index.html", "what-is-bpm/index.html", "docs/style-guide.html"];

/* ---- color math, for "the nearest token" ---- */
function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function lab(c) {
  const r = lin(c[0]), g = lin(c[1]), b = lin(c[2]);
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const x = f((r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047), y = f(r * 0.2126729 + g * 0.7151522 + b * 0.0721750), z = f((r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
function dE(a, b) { const A = lab(a), B = lab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); }
const NAMED = { white: [255, 255, 255], black: [0, 0, 0], red: [255, 0, 0], green: [0, 128, 0], blue: [0, 0, 255], yellow: [255, 255, 0],
  orange: [255, 165, 0], purple: [128, 0, 128], pink: [255, 192, 203], gray: [128, 128, 128], grey: [128, 128, 128], gold: [255, 215, 0],
  silver: [192, 192, 192], navy: [0, 0, 128], teal: [0, 128, 128], cyan: [0, 255, 255], magenta: [255, 0, 255], lime: [0, 255, 0],
  maroon: [128, 0, 0], olive: [128, 128, 0], aqua: [0, 255, 255], fuchsia: [255, 0, 255], brown: [165, 42, 42], crimson: [220, 20, 60],
  tomato: [255, 99, 71], salmon: [250, 128, 114], coral: [255, 127, 80], ivory: [255, 255, 240], beige: [245, 245, 220], tan: [210, 180, 140],
  khaki: [240, 230, 140], indigo: [75, 0, 130], violet: [238, 130, 238], orchid: [218, 112, 214], chocolate: [210, 105, 30], firebrick: [178, 34, 34] };
function parseLit(s) {
  s = s.trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) { let h = m[1]; if (h.length <= 4) h = h.split("").map(c => c + c).join(""); const a = h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1; return { rgb: [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)), a }; }
  m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)$/);
  if (m) return { rgb: [+m[1], +m[2], +m[3]], a: m[4] == null ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : +m[4] };
  m = s.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*(?:[,/]\s*([\d.]+%?))?\s*\)$/);
  if (m) {
    const h = (+m[1] % 360) / 360, sat = +m[2] / 100, l = +m[3] / 100, q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat, pp = 2 * l - q;
    const hue = t => { t = (t + 1) % 1; return t < 1 / 6 ? pp + (q - pp) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? pp + (q - pp) * (2 / 3 - t) * 6 : pp; };
    return { rgb: [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)].map(v => Math.round(v * 255)), a: m[4] == null ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : +m[4] };
  }
  m = s.match(/^color-mix\(\s*in srgb\s*,\s*(#[0-9a-f]{3,8}|rgba?\([^)]*\))\s+([\d.]+)%\s*,\s*transparent\s*\)$/);
  if (m) { const inner = parseLit(m[1]); if (inner) return { rgb: inner.rgb, a: inner.a * (+m[2] / 100) }; }
  if (NAMED[s]) return { rgb: NAMED[s], a: 1 };
  return null;
}
let TOKENS = null;
function tokens() {
  if (TOKENS) return TOKENS;
  const b = T.build();
  TOKENS = Object.keys(b).map(k => ({ name: k, rgb: T.rgb(b[k]) }));
  return TOKENS;
}
// the token that best reproduces a literal, written the way the law wants it
function suggest(lit) {
  const p = parseLit(lit);
  if (!p) return null;
  if (p.a <= 0.001) return { use: "transparent", name: null, de: 0 };
  let best = null;
  tokens().forEach(t => { const d = dE(p.rgb, t.rgb); if (!best || d < best.de) best = { name: t.name, de: d }; });
  const a = +p.a.toFixed(3), alpha = String(a).replace(/^0\./, ".");
  best.use = a >= 0.999 ? "var(--t-" + best.name + ")" : "rgb(var(--t-" + best.name + "-rgb) / " + alpha + ")";
  return best;
}
const FONT_SUGGEST = [[/barlow condensed|arial narrow|condensed|oswald|anton|bebas|impact/i, "var(--t-disp)"],
  [/mono|courier|menlo|consolas/i, "var(--t-mono)"], [/georgia|times|serif(?!.*sans)/i, "var(--t-serif)"], [/./, "var(--t-body)"]];
function suggestFont(v) { for (const [re, t] of FONT_SUGGEST) if (re.test(v)) return t; return "var(--t-body)"; }

/* ---- scanning ---- */
const HEX = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b/g;
const FUNC = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix|color)\(/g;
const COLOR_PROPS = /^(?:color|background(?:-color|-image)?|border(?:-(?:top|right|bottom|left|block|inline))?(?:-color)?|outline(?:-color)?|box-shadow|text-shadow|fill|stroke|stop-color|flood-color|caret-color|accent-color|text-decoration(?:-color)?|column-rule(?:-color)?|filter|-webkit-text-fill-color|-webkit-text-stroke(?:-color)?|--[a-z0-9-]+)$/i;
function lineOf(src, i) { return src.slice(0, i).split("\n").length; }
function blankComments(src, js) {
  // keep offsets (and so line numbers) stable: comments become spaces
  let out = src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, " "));
  if (js) out = out.replace(/(^|[^:\\"'])\/\/[^\n]*/g, (m, p) => p + m.slice(p.length).replace(/[^\n]/g, " "));
  return out;
}
// every color literal in a CSS text (declarations only), with its property
function cssFindings(css, file, baseLine) {
  const out = [], src = blankComments(css, false);
  // declarations: prop: value (inside blocks or style attributes)
  const DECL = /([a-zA-Z-][a-zA-Z0-9-]*)\s*:\s*([^;{}]+)/g;
  let m;
  while ((m = DECL.exec(src))) {
    const prop = m[1], val = m[2], at = m.index + m[0].indexOf(val), line = (baseLine || 1) + lineOf(src, at) - 1;
    if (/^font(-family)?$/i.test(prop)) {
      const v = val.replace(/var\(--t-(disp|body|mono|serif)\)/g, "").replace(/\b(inherit|initial|unset)\b/g, "");
      const fam = prop.toLowerCase() === "font" ? v.replace(/^[^"'a-zA-Z]*?(?:(?:italic|normal|bold|bolder|lighter|oblique|small-caps|\d{3}|\d*\.?\d+(?:px|em|rem|%)(?:\/[\d.]+(?:px|em|rem|%)?)?)\s+)+/i, "") : v;
      if (/["'a-zA-Z]/.test(fam.replace(/var\([^)]*\)/g, "").trim())) out.push({ file, line, kind: "font", lit: val.trim(), fix: { use: suggestFont(val) } });
      continue;
    }
    if (!COLOR_PROPS.test(prop) && !/shadow|color|gradient/i.test(val)) continue;
    const noUrl = val.replace(/url\((?:[^()"']|"[^"]*"|'[^']*')*\)/g, "url()");
    let h;
    HEX.lastIndex = 0;
    while ((h = HEX.exec(noUrl))) out.push({ file, line, kind: "color", lit: h[0], fix: suggest(h[0]) });
    FUNC.lastIndex = 0;
    while ((h = FUNC.exec(noUrl))) {
      const start = h.index; let d = 0, e = start;
      for (; e < noUrl.length; e++) { if (noUrl[e] === "(") d++; else if (noUrl[e] === ")") { d--; if (!d) { e++; break; } } }
      const call = noUrl.slice(start, e);
      if (/^rgba?\(\s*var\(--t-[a-z0-9-]+-rgb\)\s*\/\s*[\d.]+%?\s*\)$/i.test(call)) continue;      // the law's see-through form
      out.push({ file, line, kind: "color", lit: call, fix: suggest(call) || (/color-mix/.test(call) ? { use: "a named shade: add a recipe to SHADES in tools/theme-core.js" } : null) });
    }
    const words = noUrl.replace(/var\([^)]*\)/g, " ").match(/[a-zA-Z]+/g) || [];
    words.forEach(w => { if (NAMED[w.toLowerCase()] && COLOR_PROPS.test(prop)) out.push({ file, line, kind: "color", lit: w, fix: suggest(w) }); });
  }
  return out;
}
function themeBlockOf(css) {
  const a = css.indexOf(T.BEGIN), b = css.indexOf(T.END);
  return a < 0 || b < a ? null : { a, b: b + T.END.length, text: css.slice(a, b + T.END.length) };
}
function checkCSSFile(rel, findings) {
  const css = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const blk = themeBlockOf(css);
  if (!blk) { findings.push({ file: rel, line: 1, kind: "theme", lit: "no theme block", fix: { use: "node tools/theme.js" } }); return; }
  if (blk.text !== T.block()) findings.push({ file: rel, line: lineOf(css, blk.a), kind: "theme", lit: "the theme block differs from tools/theme-core.js", fix: { use: "edit tools/theme-core.js, then node tools/theme.js" } });
  const before = css.slice(0, blk.a).replace(/[^\n]/g, " "), after = css.slice(blk.b);
  cssFindings(before + blk.text.replace(/[^\n]/g, " ") + after, rel, 1).forEach(f => findings.push(f));
  // rule 4: every token read is defined
  const defined = {};
  (blk.text.match(/--(?:t|fx)-[a-z0-9-]+(?=\s*:)/g) || []).forEach(n => defined[n] = 1);
  const used = (after.match(/var\(\s*--(?:t|fx)-[a-z0-9-]+/g) || []).map(s => s.replace(/var\(\s*/, ""));
  Array.from(new Set(used)).forEach(n => { if (!defined[n]) findings.push({ file: rel, line: lineOf(css, css.indexOf(n, blk.b)), kind: "token", lit: n + " is not in the theme", fix: { use: "a token from the theme block" } }); });
}
function checkJSFile(rel, findings) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return;
  const src = blankComments(fs.readFileSync(full, "utf8"), true);
  let m;
  HEX.lastIndex = 0;
  while ((m = HEX.exec(src))) {
    const q = src[m.index - 1];
    if (!/["'(\s,:=]/.test(q || "")) continue;                     // an id selector like "#app" never starts with a hex run AND a quote... keep literal-looking ones only
    if (MASK_OK[rel] && /^#000$/.test(m[0])) continue;
    out(rel, src, m.index, m[0]);
  }
  const F = /\b(?:rgba?|hsla?)\(\s*\d/g;
  while ((m = F.exec(src))) {
    const call = src.slice(m.index, src.indexOf(")", m.index) + 1);
    if (MASK_OK[rel] && /^rgba?\(\s*0\s*,\s*0\s*,\s*0\s*[,)]/.test(call)) continue;
    out(rel, src, m.index, call);
  }
  // fonts: no family names in font strings or font-family declarations
  const FONT = /font-family\s*:\s*['"]?[A-Z][^;'"]*|["'](?:\d{3}\s+)?(?:italic\s+)?[\d.]+px\s+["']?(?:Barlow|IBM Plex|Georgia|Arial|Helvetica|DM Serif)/g;
  while ((m = FONT.exec(src))) findings.push({ file: rel, line: lineOf(src, m.index), kind: "font", lit: m[0].slice(0, 60), fix: { use: "a theme face: var(--t-disp|body|mono) in CSS, or read --t-disp / --t-mono in canvas code" } });
  function out(file, s, i, lit) { findings.push({ file, line: lineOf(s, i), kind: "color", lit, fix: suggest(lit) }); }
}
function checkHTMLFile(rel, findings) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return;
  const html = fs.readFileSync(full, "utf8");
  let m;
  const STYLE = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  while ((m = STYLE.exec(html))) cssFindings(m[1], rel, lineOf(html, m.index + m[0].indexOf(m[1]))).forEach(f => findings.push(f));
  const ATTR = /\sstyle="([^"]*)"/gi;
  while ((m = ATTR.exec(html))) cssFindings(m[1], rel, lineOf(html, m.index)).forEach(f => findings.push(f));
  const SVG = /\s(fill|stroke|stop-color)="(#[0-9a-fA-F]{3,8})"/g;
  while ((m = SVG.exec(html))) findings.push({ file: rel, line: lineOf(html, m.index), kind: "color", lit: m[1] + "=" + m[2], fix: { use: 'style="' + m[1] + ':' + (suggest(m[2]) || {}).use + '"' } });
}

function check(onlyFiles) {
  const findings = [];
  if (onlyFiles && onlyFiles.length) {
    onlyFiles.forEach(f => {
      const rel = path.relative(ROOT, path.resolve(f));
      if (/\.css$/.test(f)) { const css = fs.readFileSync(f, "utf8"); cssFindings(css, rel, 1).forEach(x => findings.push(x)); }
      else if (/\.html?$/.test(f)) checkHTMLFile(rel, findings);
      else checkJSFile(rel, findings);
    });
    return findings;
  }
  CSS_FILES.forEach(f => checkCSSFile(f, findings));
  JS_FILES.forEach(f => checkJSFile(f, findings));
  HTML_FILES.forEach(f => checkHTMLFile(f, findings));
  return findings;
}
function format(f) {
  const fix = f.fix && f.fix.use ? "  ->  " + f.fix.use + (f.fix.de != null && f.fix.de > 0.5 ? "  (closest, off by " + f.fix.de.toFixed(1) + ")" : "") : "";
  return f.file + ":" + f.line + "  " + f.kind + "  " + f.lit + fix;
}
module.exports = { check, format, suggest, suggestFont, cssFindings, parseLit };

if (require.main === module) {
  const files = process.argv.slice(2).filter(a => !a.startsWith("--"));
  const found = check(files);
  if (!found.length) { console.log("style law: clean" + (files.length ? " (" + files.join(", ") + ")" : "")); process.exit(0); }
  found.forEach(f => console.log(format(f)));
  console.log("\n" + found.length + " finding(s). docs/STYLE-GUIDE.md explains the law; node tools/stylefix.js <file> --write applies the suggestions.");
  process.exit(1);
}
