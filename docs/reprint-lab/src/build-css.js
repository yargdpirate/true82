// node build-css.js : tokenize the repo's styles.css with the audit role map.
// Writes lab/build/site.tok.css, lab/build/role-entries.json (the browser index)
// and lab/build/tok-decisions.json (every literal -> role decision, for QA and the role report).
const fs = require("fs"), path = require("path");
const SP = path.resolve(__dirname, "../..");
const T = require("./tokenize.js");
const entries = [];
for (const f of fs.readdirSync(path.join(SP, "audit")).filter(f => f.endsWith(".json")).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(SP, "audit", f), "utf8"));
  (d.entries || []).forEach(e => entries.push(e));
}
// role-fixes.json overrides the audit: its entries go first, in file order (the index lets earlier entries win).
const fixes = path.join(SP, "lab/src/role-fixes.json");
let nFix = 0;
if (fs.existsSync(fixes)) { const fx = JSON.parse(fs.readFileSync(fixes, "utf8")); nFix = fx.length; entries.unshift(...fx); }
const index = new T.Index(entries);
const css = fs.readFileSync("/Users/ggz/true82/styles.css", "utf8");
const stats = { n: 0, all: [] };
const out = T.tokenizeCSS(css, index, { src: "styles.css", stats });
// SVG presentation attributes that app.js writes (fill="#2A1A05" ...) cannot hold var(). Each known color is
// re-stated as a zero-specificity rule keyed by the attribute value: like the attribute, any real rule still wins.
const svgRules = {};
entries.forEach(e => {
  const p = String(e.prop || "").toLowerCase(), m = p.match(/^svg (fill|stroke|stop-color|flood-color) attr/);
  if (!m || !e.role || e.role === "fixed" || !/^#[0-9a-f]{3,8}$/i.test(String(e.value).trim())) return;
  const v = String(e.value).trim(), key = m[1] + "|" + v.toLowerCase();
  if (svgRules[key]) return;
  svgRules[key] = ":where([" + m[1] + "=\"" + v + "\" i]) { " + m[1] + ": " + T.tokenizeValue(v, index, { sel: "svg-attr", prop: m[1] }, { n: 0, all: stats.all }) + "; }";
});
const svgBlock = Object.keys(svgRules).length ? "\n\n/* ---- lab: SVG color attributes written by app.js, re-stated so role variables reach them (zero specificity, like the attribute) ---- */\n" + Object.values(svgRules).join("\n") + "\n" : "";
fs.writeFileSync(path.join(SP, "lab/build/site.tok.css"), out.css + svgBlock);
// the browser index: entries for inline <style> blocks and attributes
fs.writeFileSync(path.join(SP, "lab/build/role-entries.json"), JSON.stringify(entries.map(e => ({ src: e.src, line: e.line, sel: e.sel, prop: e.prop, value: e.value, role: e.role }))));
fs.writeFileSync(path.join(SP, "lab/build/tok-decisions.json"), JSON.stringify(stats.all.map(d => ({ src: "styles.css", line: d.line, sel: d.sel, prop: d.prop, lit: d.lit, role: d.role, how: d.how }))));
const literals = (css.match(T.COLOR_RE) || []).length;
console.log("svg attribute rules:", Object.keys(svgRules).length);
console.log("role fixes:", nFix, " literals in styles.css:", literals, "tokenized:", stats.n, "by:", JSON.stringify({ line: stats.line, spv: stats.spv, fix: stats.fix, value: stats.value, hex: stats.hex, guess: stats.guess }));
stats.all.filter(d => d.how !== "line").forEach(d => console.log("  " + d.how.toUpperCase(), d.lit, "->", d.role, "|", String(d.sel || "").replace(/\s+/g, " ").slice(0, 60), d.prop, "line", d.line));
const left = (out.css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/var\(--t-[a-z0-9-]+, (#[0-9A-F]{6}|rgb\([^)]*\))\)/g, "").match(T.COLOR_RE) || []);
const fixed = stats.all.filter(d => d.role === "fixed").length;
console.log("literals left outside comments:", left.length, "(role fixed:", fixed + ")", left.slice(0, 30).join(" "));
