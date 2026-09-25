#!/usr/bin/env node
/* ---------- TRUE 82 STYLE FIX ----------
   Puts a graft (a new mode's CSS or page) on the theme in one pass:

     node tools/stylefix.js new-mode.css            show what would change
     node tools/stylefix.js new-mode.css --write    apply it (the old file is kept as .bak)
     node tools/stylefix.js page.html --write       the same, for a page's <style> blocks and style="" attributes

   Every color literal becomes the nearest theme token (var(--t-name), or
   rgb(var(--t-name-rgb) / a) when see-through) and every font stack becomes
   var(--t-disp), var(--t-body) or var(--t-mono). A color that lands far from
   every token ("off by" more than ~10) is a sign the mode wants a shade the
   theme does not have yet: add a recipe to SHADES in tools/theme-core.js,
   run node tools/theme.js, and use the new token.
   JavaScript is reported, not rewritten: canvas code cannot read var(), so it
   reads the tokens with getComputedStyle (see results-riso.js readTheme). */
"use strict";
const fs = require("fs"), path = require("path");
const LAW = require("./style-law.js");

const HEX = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b/g;
const NAMED_WORD = /\b(white|black|red|green|blue|yellow|orange|purple|pink|gray|grey|gold|silver|navy|teal|cyan|magenta|lime|maroon|olive|aqua|fuchsia|brown|crimson|tomato|salmon|coral|ivory|beige|tan|khaki|indigo|violet|orchid|chocolate|firebrick)\b/gi;
const COLOR_PROPS = /^(?:color|background(?:-color|-image)?|border(?:-(?:top|right|bottom|left|block|inline))?(?:-color)?|outline(?:-color)?|box-shadow|text-shadow|fill|stroke|stop-color|flood-color|caret-color|accent-color|text-decoration(?:-color)?|column-rule(?:-color)?|filter|-webkit-text-fill-color|-webkit-text-stroke(?:-color)?|--[a-z0-9-]+)$/i;

function fixValue(prop, val, notes) {
  if (/^font(-family)?$/i.test(prop)) {
    if (/^\s*(var\(--t-(disp|body|mono|serif)\)|inherit|initial|unset)\s*$/.test(val)) return val;
    const token = LAW.suggestFont(val);
    if (prop.toLowerCase() === "font-family") { notes.push(val.trim() + " -> " + token); return " " + token; }
    // font shorthand: keep style/weight/size/line-height, swap the family
    const m = val.match(/^(\s*(?:(?:italic|normal|oblique|small-caps|bold|bolder|lighter|\d{3})\s+)*[\d.]+(?:px|em|rem|%)(?:\/[\d.]+(?:px|em|rem|%)?)?\s+)(.+)$/i);
    if (m && !/var\(--t-/.test(m[2])) { notes.push(m[2].trim() + " -> " + token); return m[1] + token; }
    return val;
  }
  let out = val;
  // functions first (rgb/rgba/hsl/hsla/color-mix), innermost-safe: walk balanced calls
  out = out.replace(/\b(?:rgba?|hsla?|color-mix)\([^()]*(?:\([^()]*\)[^()]*)*\)/gi, call => {
    if (/^rgba?\(\s*var\(--t-[a-z0-9-]+-rgb\)/i.test(call)) return call;
    const s = LAW.suggest(call);
    if (!s || !s.use) return call;
    notes.push(call + " -> " + s.use + (s.de > 0.5 ? "  (off by " + s.de.toFixed(1) + ")" : ""));
    return s.use;
  });
  out = out.replace(HEX, h => {
    const s = LAW.suggest(h);
    if (!s || !s.use) return h;
    notes.push(h + " -> " + s.use + (s.de > 0.5 ? "  (off by " + s.de.toFixed(1) + ")" : ""));
    return s.use;
  });
  if (COLOR_PROPS.test(prop)) {
    out = out.replace(/var\([^)]*\)|url\([^)]*\)/g, m => m.replace(/[a-z]/gi, c => "\u0001" + c)).replace(NAMED_WORD, w => {
      const s = LAW.suggest(w);
      if (!s || !s.use) return w;
      notes.push(w + " -> " + s.use);
      return s.use;
    }).replace(/\u0001/g, "");
  }
  return out;
}
function fixCSS(css, notes) {
  // leave comments alone; rewrite declarations
  const parts = css.split(/(\/\*[\s\S]*?\*\/)/);
  return parts.map((p, i) => i % 2 ? p : p.replace(/([a-zA-Z-][a-zA-Z0-9-]*)(\s*:\s*)([^;{}]+)/g, (m, prop, colon, val) => {
    if (/^(?:https?|data)$/i.test(prop)) return m;
    return prop + colon + fixValue(prop, val, notes);
  })).join("");
}
function fixHTML(html, notes) {
  html = html.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, a, css, b) => a + fixCSS(css, notes) + b);
  html = html.replace(/(\sstyle=")([^"]*)(")/gi, (m, a, css, b) => a + fixCSS(css, notes) + b);
  html = html.replace(/\s(fill|stroke|stop-color)="(#[0-9a-fA-F]{3,8})"/g, (m, attr, hex) => {
    const s = LAW.suggest(hex);
    if (!s || !s.use) return m;
    notes.push(attr + '="' + hex + '" -> style="' + attr + ":" + s.use + '"');
    return ' style="' + attr + ":" + s.use + '"';
  });
  return html;
}

if (require.main === module) {
  const args = process.argv.slice(2), write = args.includes("--write"), files = args.filter(a => !a.startsWith("--"));
  if (!files.length) { console.log("usage: node tools/stylefix.js <file.css|file.html> [--write]"); process.exit(2); }
  let changed = 0;
  files.forEach(f => {
    const src = fs.readFileSync(f, "utf8"), notes = [];
    if (/\.js$/.test(f)) {
      const found = LAW.check([f]);
      console.log(f + ": JavaScript is reported, not rewritten (canvas code reads tokens with getComputedStyle)");
      found.forEach(x => console.log("  " + LAW.format(x)));
      return;
    }
    const out = /\.html?$/.test(f) ? fixHTML(src, notes) : fixCSS(src, notes);
    console.log(f + ": " + (notes.length ? notes.length + " change(s)" : "already on the theme"));
    notes.forEach(n => console.log("  " + n));
    if (write && out !== src) { fs.writeFileSync(f + ".bak", src); fs.writeFileSync(f, out); changed++; }
  });
  if (write) console.log(changed ? "written (originals kept as .bak). Run node tools/style-law.js to confirm." : "nothing to write");
  else console.log("dry run: add --write to apply");
}
module.exports = { fixCSS, fixHTML };
