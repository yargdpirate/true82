#!/usr/bin/env node
/* TRUE 82 art index (v67, the art variants; art/CONTRACT.md). Every variant is one file, art/<kind>/<id>.js, that
   calls T82ART.add(kind, id, { name: ... }). This writes art-index.js, the game's list of the whole library (so a
   phone knows every look without downloading any of them), and keeps every art file in the cache-key manifest, so
   each one is cached for a year under its own key and a changed one gets a new key like any other file.
     node tools/art-index.js           write art-index.js; add new art files to tools/cache-keys.json, drop deleted ones
     node tools/art-index.js --check   the index is current (test.js runs it): every art file listed, nothing stale
   The order after adding or editing variants (the stamp and this file agree on every key):
     1. node tools/art-index.js             lists them (a new file joins the manifest with an empty key)
     2. node tools/cache-keys.js --stamp K  keys every changed file: the variants, then art-index.js, which names them
     3. node tools/art-index.js --check     passes: the stamp rewrote the index's keys exactly as step 1 would write them
   A look the game should stop dealing (the lab still shows it): add "<kind>/<id>" to "off" in art/enabled.json and
   run step 1. It fails loudly on a file whose id is not its name, whose kind is not its folder, that has no literal
   name, or that takes a built-in's id (the classic L and dots, the lake). */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..");
const KINDS = ["loss", "dots", "scene"];
const BUILTIN = { loss: ["classic"], dots: ["classic"], scene: ["lake"] };   // they live inside the engines
const BUDGET = { loss: 10, dots: 6, scene: 16 };                              // KB of unminified source (law 6)
const INDEX = "art-index.js", ENABLED = "art/enabled.json", MANIFEST = path.join(__dirname, "cache-keys.json");
const ART_FILE = /^art\/(loss|dots|scene)\/[^/]+\.js$/;
const ID = /^[a-z0-9-]+$/;

// Comments become spaces (offsets stay put) and every string literal is listed with its value, so a comment that
// mentions T82ART.add, or a caption with a brace in it, cannot fool the reader.
function lex(src) {
  let code = "", i = 0;
  const strs = [];
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && (d === "/" || d === "*")) {
      const e = d === "/" ? src.indexOf("\n", i) : src.indexOf("*/", i + 2);
      const end = e < 0 ? src.length : d === "/" ? e : e + 2;
      code += src.slice(i, end).replace(/[^\n]/g, " "); i = end; continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < src.length && src[j] !== c && src[j] !== "\n") j += src[j] === "\\" ? 2 : 1;
      const raw = src.slice(i, j + 1);
      let val = raw.slice(1, -1);
      if (c !== "`") { try { val = vm.runInNewContext(raw); } catch (err) { /* keep the raw text */ } }
      strs.push({ at: i, end: j + 1, raw, val: String(val) });
      code += raw; i = j + 1; continue;
    }
    code += c; i++;
  }
  return { code, strs };
}

// one variant file: what T82ART.add says about it, read without running it
function read(kind, base) { return parse(fs.readFileSync(path.join(ROOT, "art", kind, base), "utf8"), kind, base); }
function parse(src, kind, base) {
  const rel = "art/" + kind + "/" + base, id = base.replace(/\.js$/, ""), errors = [], L = lex(src);
  const f = { kind, id, rel, name: null, bytes: Buffer.byteLength(src, "utf8"), errors,
    dash: L.strs.some((s) => /\u2014/.test(s.val) || /\\u2014/i.test(s.raw)) };
  if (!ID.test(id)) errors.push(rel + ": the file's name is the variant's id: lowercase letters, digits and hyphens only");
  if (BUILTIN[kind].indexOf(id) >= 0) errors.push(rel + ": \"" + id + "\" is a built-in's id (it lives in the engine); pick another name");
  // T82ART.add(...), window.T82ART.add(...), or a local name for it (var A = window.T82ART; A.add(...))
  const names = ["T82ART"], alias = /\b([A-Za-z_$][\w$]*)\s*=\s*[^;,=][^;,]*\bT82ART\b/g;
  let a;
  while ((a = alias.exec(L.code))) if (names.indexOf(a[1]) < 0) names.push(a[1]);
  const who = "(?:" + names.map((n) => n.replace(/\$/g, "\\$")).join("|") + ")";
  const calls = L.code.match(new RegExp("(?:^|[^\\w$.]|\\bwindow\\.)" + who + "\\.add\\s*\\(", "g")) || [];
  if (calls.length !== 1) { errors.push(rel + ": calls T82ART.add " + calls.length + " times; a variant file calls it exactly once"); return f; }
  const m = new RegExp("(?:^|[^\\w$.]|\\bwindow\\.)" + who + "\\.add\\s*\\(\\s*([\"'])([^\"'\\\\\\n]*)\\1\\s*,\\s*([\"'])([^\"'\\\\\\n]*)\\3\\s*,\\s*(\\{|[A-Za-z_$][\\w$]*)").exec(L.code);
  if (!m) { errors.push(rel + ": write T82ART.add(\"" + kind + "\", \"" + id + "\", { name: \"...\", ... }) with the kind and id as plain strings"); return f; }
  if (m[2] !== kind) errors.push(rel + ": registers kind \"" + m[2] + "\" but sits in art/" + kind + "/");
  if (m[4] !== id) errors.push(rel + ": registers id \"" + m[4] + "\" but its file is " + base + " (the id is the file's name)");
  let open = m[5] === "{" ? m.index + m[0].length - 1 : -1;
  if (open < 0) {   // T82ART.add(kind, id, DEF) with var DEF = { ... } earlier in the file
    const d = new RegExp("\\b" + m[5].replace(/\$/g, "\\$") + "\\s*=\\s*\\{").exec(L.code);
    if (d) open = d.index + d[0].length - 1;
  }
  if (open < 0) { errors.push(rel + ": T82ART.add's third argument must be an object literal (or a var set to one in this file)"); return f; }
  f.name = nameIn(L, open);
  if (f.name == null) errors.push(rel + ": the def needs name: \"...\" as a plain string (the lab's label, 2 or 3 words)");
  else if (!f.name.trim()) errors.push(rel + ": the def's name is empty");
  return f;
}
// the object's own name: "..." (depth 1 only, so a nested { name } inside a layer never counts)
function nameIn(L, open) {
  const code = L.code, at = {};
  L.strs.forEach((s) => { at[s.at] = s; });
  let depth = 0, prev = "";
  for (let i = open; i < code.length; i++) {
    if (at[i]) {
      if (depth === 1 && (prev === "{" || prev === ",") && /^\s*:/.test(code.slice(at[i].end)) && at[i].val === "name") return valueAt(L, at, code, at[i].end);
      i = at[i].end - 1; prev = '"'; continue;
    }
    const c = code[i];
    if (c === "{" || c === "[" || c === "(") depth++;
    else if (c === "}" || c === "]" || c === ")") { if (--depth === 0) return null; }
    else if (depth === 1 && (prev === "{" || prev === ",") && /^name\s*:/.test(code.slice(i, i + 12))) return valueAt(L, at, code, i + 4);
    if (!/\s/.test(c)) prev = c;
  }
  return null;
}
function valueAt(L, at, code, from) {
  const m = /^\s*:\s*/.exec(code.slice(from));
  const s = m && at[from + m[0].length];
  return s && s.raw[0] !== "`" ? s.val : null;
}

// every variant file on disk, in a fixed order (loss, dots, scene; then by id)
function scan() {
  const out = [];
  KINDS.forEach((kind) => {
    const dir = path.join(ROOT, "art", kind);
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).filter((b) => /\.js$/.test(b) && fs.statSync(path.join(dir, b)).isFile()).sort().forEach((b) => out.push(read(kind, b)));
  });
  return out;
}
function offList(files, errors) {
  const p = path.join(ROOT, ENABLED);
  if (!fs.existsSync(p)) return [];
  let o = null;
  try { o = JSON.parse(fs.readFileSync(p, "utf8")); } catch (err) { errors.push(ENABLED + " is not valid JSON: " + err.message); return []; }
  const off = o && Array.isArray(o.off) ? o.off : null;
  if (!off) { errors.push(ENABLED + " needs an \"off\" list of \"<kind>/<id>\" (it may be empty)"); return []; }
  off.forEach((k) => { if (!files.some((f) => f.kind + "/" + f.id === k)) errors.push(ENABLED + " turns off \"" + k + "\", but there is no art/" + k + ".js"); });
  return off;
}
function loadManifest() { return JSON.parse(fs.readFileSync(MANIFEST, "utf8")); }
// the manifest with exactly the art files on disk (new ones join with an empty key, deleted ones leave); the art
// entries sit together at the end, in the index's order
function syncManifest(m, files) {
  const out = {};
  Object.keys(m.files).forEach((k) => { if (!ART_FILE.test(k)) out[k] = m.files[k]; });
  files.forEach((f) => { out[f.rel] = m.files[f.rel] || { key: "", sha: "" }; });
  return Object.assign({}, m, { files: out });
}
function text(entries) {
  const rows = entries.map((e) => "    { kind: " + JSON.stringify(e.kind) + ", id: " + JSON.stringify(e.id) + ", name: " + JSON.stringify(e.name) +
    ", file: " + JSON.stringify(e.file) + ", on: " + e.on + " }");
  return "/* GENERATED by node tools/art-index.js from art/loss, art/dots and art/scene: never hand-edit (art/CONTRACT.md).\n" +
    "   One entry per variant file; \"on\" = the game deals it (art/enabled.json lists the ones that are off; the lab shows\n" +
    "   them all). Each file's ?v= key is the cache-key manifest's: node tools/cache-keys.js --stamp <key> rewrites it. */\n" +
    "(function () {\n  \"use strict\";\n  if (typeof T82ART === \"undefined\" || !T82ART || !T82ART.index) return;\n" +
    (rows.length ? "  T82ART.index([\n" + rows.join(",\n") + "\n  ]);\n" : "  T82ART.index([]);\n") + "})();\n";
}
// what the index and the manifest should be, from the files on disk
function build() {
  const files = scan(), errors = [];
  files.forEach((f) => f.errors.forEach((e) => errors.push(e)));
  const off = offList(files, errors), m = syncManifest(loadManifest(), files);
  const entries = files.filter((f) => !f.errors.length).map((f) => ({ kind: f.kind, id: f.id, name: f.name,
    file: f.rel + "?v=" + m.files[f.rel].key, on: off.indexOf(f.kind + "/" + f.id) < 0 }));
  return { files, errors, entries, manifest: m, text: text(entries) };
}
function check() {
  const b = build(), findings = b.errors.slice(), have = loadManifest().files;
  b.files.forEach((f) => { if (!have[f.rel]) findings.push(f.rel + " is not in tools/cache-keys.json: run node tools/art-index.js"); });
  Object.keys(have).forEach((k) => { if (ART_FILE.test(k) && !b.files.some((f) => f.rel === k)) findings.push("tools/cache-keys.json keys " + k + " but the file is gone: run node tools/art-index.js"); });
  const p = path.join(ROOT, INDEX), now = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
  if (now !== b.text) findings.push(INDEX + (now == null ? " is missing" : " is out of date") + ": run node tools/art-index.js" + (b.errors.length ? " after fixing the files above" : ""));
  return findings;
}
function write() {
  const b = build();
  if (b.errors.length) { console.error(b.errors.join("\n") + "\n\nart index: not written (fix the files above)"); process.exit(1); }
  const mText = JSON.stringify(b.manifest, null, 2) + "\n";
  if (fs.readFileSync(MANIFEST, "utf8") !== mText) fs.writeFileSync(MANIFEST, mText);
  const p = path.join(ROOT, INDEX);
  const changed = !fs.existsSync(p) || fs.readFileSync(p, "utf8") !== b.text;
  if (changed) fs.writeFileSync(p, b.text);
  const per = KINDS.map((k) => b.entries.filter((e) => e.kind === k).length + " " + k).join(", ");
  const unkeyed = b.entries.filter((e) => /\?v=$/.test(e.file)).length;
  console.log("art index: " + per + (changed ? " (art-index.js rewritten)" : " (no change)") +
    (unkeyed ? "; " + unkeyed + " new file(s) need a key: node tools/cache-keys.js --stamp <key>" : ""));
}

if (require.main === module) {
  if (process.argv.indexOf("--check") > 0) {
    const f = check();
    if (f.length) { console.log(f.join("\n")); process.exit(1); }
    console.log("art index: current (every art file listed and keyed in the manifest, nothing stale)");
  } else write();
}
module.exports = { check, build, scan, parse, lex, KINDS, BUILTIN, BUDGET, INDEX };
