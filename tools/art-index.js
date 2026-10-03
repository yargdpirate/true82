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
   name, or that takes a built-in's id (the classic L and dots, the lake).
   Part two (art/CONTRACT-FX.md): art/hot, art/perk and art/goat (the riso FX layer's packs) are listed the same way,
   and a scene whose def says perfect: true (a literal true, read without running the file) is an 82-0 scene: its
   entry carries perfect: true, so the game deals it only for an 82-0 season, from its own bag.
   The owner's picks (2026-10-02): "off" may name a built-in too ("perk/classic": it still stands in for a look that is
   not there, but no bag deals it; the index hands that list to T82ART.index), and art/tempo.json is his speed dial:
   { "loss/crumple": { "from": "exit", "x": 1.3 }, ... } plays that look 1.3 times as fast from the phase its def names
   exit (phases: { exit: 0.36 }, a literal object of plain numbers, read without running the file), or from 0, the
   whole moment. Each valid line rides the look's entry (tempo: { from, x }); the engine warps the moment's clock. A line
   that names no file, a phase the def does not declare, or an x outside 1 to 3 is skipped with a warning, and
   test.js fails until it is fixed (tempoErrors()). Removing a line restores the look's own pace.
   v68: removing a look for good is one command, node tools/art-remove.js <kind>/<id> (it deletes the file and every
   line that names it, then runs this). A file deleted by hand never stops this from writing the index: a line in
   art/enabled.json or art/tempo.json that names a look no longer there is reported (check() and test.js name it and
   the fix) and otherwise ignored. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..");
const KINDS = ["loss", "dots", "scene", "hot", "perk", "goat"];
const BUILTIN = { loss: ["classic"], dots: ["classic"], scene: ["lake"], hot: ["classic"], perk: ["classic"], goat: ["classic"] };   // they live inside the engines (riso-fx.js's classic looks too)
const BUDGET = { loss: 10, dots: 6, scene: 16, hot: 14, perk: 10, goat: 8 };   // KB of unminified source (law 6; part two's budgets)
const BUDGET_PERFECT = 20;                                                     // an 82-0 scene: more inks, more layers, its live motion
const INDEX = "art-index.js", ENABLED = "art/enabled.json", TEMPO = "art/tempo.json", MANIFEST = path.join(__dirname, "cache-keys.json");
const TEMPO_KINDS = ["loss"];                                                  // the kinds whose moments the dial can speed up (the reel's)
const ART_FILE = /^art\/(loss|dots|scene|hot|perk|goat)\/[^/]+\.js$/;
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

// Law 5 (ES5, like the engines). A file in newer syntax passes Chromium and today's Safari but is a SyntaxError on an
// older iPhone (the first iPhone SE stops at iOS 15): there the whole file never registers. This walks the file's
// tokens (comments, strings and regex literals read as such) and names each newer form with its line: let/const,
// arrows, template strings, classes and the other reserved words, spread and rest, ?. and ??, **, default and
// destructured parameters, destructuring, shorthand and computed object keys, for...of, generators and async,
// trailing commas in calls, binary/octal/BigInt/separated numbers, \u{...}, regex flags past g/i/m, lookbehind and
// named groups. The engines pass it as they are.
function es5(src) {
  const out = [], toks = [], at = (i) => src.slice(0, i).split("\n").length;
  const bad = (i, what) => { if (out.length < 6) out.push("line " + at(i) + ": " + what); };
  const P = ["...", "?.", "??=", "??", "=>", "**=", "**", "||=", "&&=", ">>>=", "===", "!==", ">>>", "<<=", ">>=", "==", "!=", "<=", ">=",
    "&&", "||", "++", "--", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "<<", ">>"];
  const NEW = { "...": "spread or rest (...)", "?.": "optional chaining (?.)", "??": "?? (nullish)", "??=": "??=", "=>": "an arrow function (=>)",
    "**": "the ** operator", "**=": "**=", "||=": "||=", "&&=": "&&=" };
  const RESERVED = /^(?:let|const|class|enum|export|extends|import|super|yield)$/;
  const EXPR = /^(?:return|typeof|instanceof|in|of|new|delete|void|throw|case|yield|await)$/;   // an expression follows these
  const STMT = /^(?:if|for|while|switch|catch|function|with|do|else|try|finally|var|break|continue)$/;
  const name0 = (ch) => /[A-Za-z_$\\]/.test(ch) || ch > "\x7f", name1 = (ch) => /[\w$\\]/.test(ch) || ch > "\x7f";
  let i = 0;
  while (i < src.length) {
    const c = src[i], d = src[i + 1], prev = toks[toks.length - 1];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "/" && d === "/") { const e = src.indexOf("\n", i); i = e < 0 ? src.length : e; continue; }
    if (c === "/" && d === "*") { const e = src.indexOf("*/", i + 2); i = e < 0 ? src.length : e + 2; continue; }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < src.length && src[j] !== c && (c === "`" || src[j] !== "\n")) j += src[j] === "\\" ? 2 : 1;
      if (c === "`") bad(i, "a template string (`...`)");
      else if (/\\u\{/.test(src.slice(i, j))) bad(i, "a \\u{...} escape");
      toks.push({ t: "s", v: c, i }); i = j + 1; continue;
    }
    if (c === "/" && (!prev || (prev.t === "p" && !/^(?:\)|\]|\+\+|--)$/.test(prev.v)) || (prev.t === "n" && (EXPR.test(prev.v) || /^(?:do|else)$/.test(prev.v))))) {
      let j = i + 1, cls = false;
      for (; j < src.length && src[j] !== "\n"; j++) {
        if (src[j] === "\\") { j++; continue; }
        if (src[j] === "[") cls = true; else if (src[j] === "]") cls = false; else if (src[j] === "/" && !cls) break;
      }
      const body = src.slice(i + 1, j);
      let k = j + 1;
      while (k < src.length && name1(src[k])) k++;
      const flags = src.slice(j + 1, k);
      if (/[^gim]/.test(flags)) bad(i, "the regex flag " + flags.replace(/[gim]/g, "") + " (ES5 has g, i and m)");
      if (/(?:^|[^\\])\(\?<[=!]/.test(body)) bad(i, "a regex lookbehind, (?<= or (?<! (Safari 16.4)");
      else if (/(?:^|[^\\])\(\?<[A-Za-z_$]/.test(body)) bad(i, "a named regex group (?<name>)");
      toks.push({ t: "r", v: "/", i }); i = k; continue;
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(d))) {
      let j = i;
      while (j < src.length && (name1(src[j]) || src[j] === "." || (/[+-]/.test(src[j]) && /^[0-9.]+[eE]$/.test(src.slice(i, j))))) j++;
      const num = src.slice(i, j);
      if (/^0[bBoO]/.test(num)) bad(i, "a binary or octal literal (" + num + ")");
      else if (/_/.test(num)) bad(i, "a numeric separator (" + num + ")");
      else if (/n$/.test(num)) bad(i, "a BigInt (" + num + ")");
      toks.push({ t: "#", v: num, i }); i = j; continue;
    }
    if (name0(c)) {
      let j = i;
      while (j < src.length && name1(src[j])) j++;
      if (/\\u\{/.test(src.slice(i, j))) bad(i, "a \\u{...} escape");
      toks.push({ t: "n", v: src.slice(i, j), i }); i = j; continue;
    }
    let p = P.find((s) => src.startsWith(s, i)) || c;
    if (p === "?." && /[0-9]/.test(src[i + 2] || "")) p = "?";               // a ? .5 : 1 is a conditional
    toks.push({ t: "p", v: p, i }); i += p.length;
  }
  // the second pass: each token in its place. A brace is an object after an operator or an expression keyword,
  // otherwise a block; a paren after function (or a function's name) or catch holds parameters
  const stack = [];
  const after = (o) => { for (let k = o, n = 0; k < toks.length; k++) { n += toks[k].v === "(" ? 1 : toks[k].v === ")" ? -1 : 0; if (!n) return toks[k + 1] && toks[k + 1].v; } return null; };
  for (let k = 0; k < toks.length; k++) {
    const T = toks[k], B = toks[k - 1], N = toks[k + 1], top = stack[stack.length - 1], v = T.v;
    const key = top && top.c === "obj" && B && B.t === "p" && (B.v === "{" || B.v === ",");   // where an object's key goes
    if (T.t === "p" && NEW[v]) bad(T.i, NEW[v]);
    if (T.t === "n") {
      if (RESERVED.test(v) && !(B && B.t === "p" && B.v === ".") && !(key && N && N.v === ":")) bad(T.i, "\"" + v + "\" (a reserved word in ES5)");
      if (v === "async" && N && N.t === "n" && N.v === "function") bad(T.i, "an async function");
      if (v === "of" && top && top.c === "for" && B && ((B.t === "n" && B.v !== "var") || B.v === "]" || B.v === "}")) bad(T.i, "for...of");
      if (v === "function" && N && N.v === "*") bad(T.i, "a generator (function*)");
      if (v === "var" && N && (N.v === "{" || N.v === "[")) bad(N.i, "a destructuring var");
    }
    if (key) {
      if (T.v === "[") bad(T.i, "a computed key ([...]: in an object)");
      else if (T.v === "*") bad(T.i, "a generator method");
      else if (T.t === "n" && STMT.test(v)) { /* a statement in a block read as an object (case 1: { if (x) ... }) */ }
      else if ((T.t === "n" || T.t === "s" || T.t === "#") && N && N.v === "(" && after(k + 1) === "{") bad(T.i, "a shorthand method (" + v + "() {...})");
      else if (T.t === "n" && N && (N.v === "," || N.v === "}")) bad(T.i, "a shorthand property ({ " + v + " })");
    }
    if (T.t !== "p") continue;
    if (v === "," && N && N.v === ")") bad(T.i, "a trailing comma before )");
    if (top && top.c === "par" && (v === "{" || v === "[" || v === "=")) bad(T.i, v === "=" ? "a default parameter" : "a destructured parameter");
    if (v === "{") {
      const obj = B && ((B.t === "p" && !/^(?:\)|\]|\}|;|\{|=>)$/.test(B.v)) || (B.t === "n" && EXPR.test(B.v)));
      stack.push({ c: obj ? "obj" : "blk" });
    } else if (v === "(") {
      const B2 = toks[k - 2], fn = B && B.t === "n" && !(B2 && B2.v === ".") && (/^(?:function|catch)$/.test(B.v) || (B2 && B2.v === "function"));
      stack.push({ c: fn ? "par" : B && B.v === "for" ? "for" : "grp" });
    } else if (v === "[") stack.push({ c: B && (B.t === "n" || B.t === "s" || B.v === ")" || B.v === "]") && !(B.t === "n" && EXPR.test(B.v)) ? "idx" : "arr" });
    else if (v === "}" || v === ")" || v === "]") {
      const s = stack.pop();
      if (v === "]" && s && s.c === "arr" && N && N.v === "=" ) bad(T.i, "a destructuring assignment ([...] =)");
    }
  }
  return out;
}

// one variant file: what T82ART.add says about it, read without running it
function read(kind, base) { return parse(fs.readFileSync(path.join(ROOT, "art", kind, base), "utf8"), kind, base); }
function parse(src, kind, base) {
  const rel = "art/" + kind + "/" + base, id = base.replace(/\.js$/, ""), errors = [], L = lex(src);
  const f = { kind, id, rel, name: null, perfect: false, bytes: Buffer.byteLength(src, "utf8"), errors,
    dash: L.strs.some((s) => /\u2014/.test(s.val) || /\\u2014/i.test(s.raw)) };
  if (!ID.test(id)) errors.push(rel + ": the file's name is the variant's id: lowercase letters, digits and hyphens only");
  if (BUILTIN[kind].indexOf(id) >= 0) errors.push(rel + ": \"" + id + "\" is a built-in's id (it lives in the engine); pick another name");
  es5(src).forEach((p) => errors.push(rel + ": " + p + " is not ES5 (law 5: an iPhone on iOS 15 or older cannot parse the file, so the look never loads there)"));
  if (/\.builtin\s*=[^=]/.test(L.code)) errors.push(rel + ": builtin is the engines' own flag (the classic L and dots, the lake); a variant never sets it");
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
  if (keyIn(L, open, "builtin", () => true) === true) errors.push(rel + ": builtin is the engines' own flag (the classic L and dots, the lake); a variant never sets it");
  f.perfect = perfectIn(L, open);
  if (f.perfect && kind !== "scene") errors.push(rel + ": perfect: true is for scenes only (an 82-0 print, art/CONTRACT-FX.md)");
  f.phases = phasesIn(L, open);
  if (f.phases === false) { f.phases = null; errors.push(rel + ": phases must be a literal object of plain numbers, each a fraction of the moment from 0 to 1 (phases: { exit: 0.62 })"); }
  return f;
}
// the object's own name: "..." (depth 1 only, so a nested { name } inside a layer never counts)
function nameIn(L, open) { return keyIn(L, open, "name", valueAt); }
// part two: perfect: true at depth 1 (a literal true; anything else is an ordinary scene)
function perfectIn(L, open) { return keyIn(L, open, "perfect", (L2, at, code, from) => /^\s*:\s*true\b/.test(code.slice(from))) === true; }
// the owner's dial (art/tempo.json) names a phase of the look: phases: { exit: 0.62, ding: 0.4 } at depth 1, each the
// fraction of the moment's hold where that phase begins. null: none declared; false: not a literal of plain numbers
function phasesIn(L, open) {
  const r = keyIn(L, open, "phases", (L2, at, code, from) => {
    const m = /^\s*:\s*\{([^{}]*)\}/.exec(code.slice(from));
    if (!m) return false;
    const out = {}, body = m[1].trim();
    if (!body) return out;
    for (const part of body.split(",")) {
      const kv = /^\s*(?:([A-Za-z_$][\w$]*)|"([^"]*)"|'([^']*)')\s*:\s*([0-9]*\.?[0-9]+)\s*$/.exec(part);
      if (!kv) return false;
      const v = +kv[4];
      if (!(v >= 0 && v <= 1)) return false;
      out[kv[1] || kv[2] || kv[3]] = v;
    }
    return out;
  });
  return r == null ? null : r;
}
// the def's own key (depth 1 only), handed to read(L, at, code, the offset just after the key)
function keyIn(L, open, key, read) {
  const code = L.code, at = {}, bare = new RegExp("^" + key + "\\s*:");
  L.strs.forEach((s) => { at[s.at] = s; });
  let depth = 0, prev = "";
  for (let i = open; i < code.length; i++) {
    if (at[i]) {
      if (depth === 1 && (prev === "{" || prev === ",") && /^\s*:/.test(code.slice(at[i].end)) && at[i].val === key) return read(L, at, code, at[i].end);
      i = at[i].end - 1; prev = '"'; continue;
    }
    const c = code[i];
    if (c === "{" || c === "[" || c === "(") depth++;
    else if (c === "}" || c === "]" || c === ")") { if (--depth === 0) return null; }
    else if (depth === 1 && (prev === "{" || prev === ",") && bare.test(code.slice(i, i + key.length + 8))) return read(L, at, code, i + key.length);
    if (!/\s/.test(c)) prev = c;
  }
  return null;
}
function valueAt(L, at, code, from) {
  const m = /^\s*:\s*/.exec(code.slice(from));
  const s = m && at[from + m[0].length];
  return s && s.raw[0] !== "`" ? s.val : null;
}

// every variant file on disk, in a fixed order (KINDS: loss, dots, scene, hot, perk, goat; then by id)
function scan() {
  const out = [];
  KINDS.forEach((kind) => {
    const dir = path.join(ROOT, "art", kind);
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).filter((b) => /\.js$/.test(b) && fs.statSync(path.join(dir, b)).isFile()).sort().forEach((b) => out.push(read(kind, b)));
  });
  return out;
}
function offList(files, errors, stale, given) {
  const p = path.join(ROOT, ENABLED);
  if (!given && !fs.existsSync(p)) return [];
  let o = given || null;
  if (!o) { try { o = JSON.parse(fs.readFileSync(p, "utf8")); } catch (err) { errors.push(ENABLED + " is not valid JSON: " + err.message); return []; } }
  const off = o && Array.isArray(o.off) ? o.off : null;
  if (!off) { errors.push(ENABLED + " needs an \"off\" list of \"<kind>/<id>\" (it may be empty)"); return []; }
  off.forEach((k) => {
    if (builtinKey(k)) return;                   // a built-in the owner cut: it lives in the engine, no file behind it
    // a look removed by hand: harmless (it switches nothing off), reported so the line goes too
    if (!files.some((f) => f.kind + "/" + f.id === k)) (stale || errors).push(ENABLED + " turns off \"" + k + "\", but there is no art/" + k + ".js (a removed look): delete that line (node tools/art-remove.js does it)");
  });
  return off;
}
// "perk/classic": a built-in's own id (BUILTIN), which enabled.json may switch off but no file stands behind
function builtinKey(k) { const p = String(k).split("/"); return p.length === 2 && KINDS.indexOf(p[0]) >= 0 && BUILTIN[p[0]].indexOf(p[1]) >= 0; }
// art/tempo.json, the owner's speed dial: -> { dial: { "kind/id": { from, x } } (the valid lines), errors: [...] }
function tempoOf(files, given) {
  const p = path.join(ROOT, TEMPO), dial = {}, errors = [];
  if (!given && !fs.existsSync(p)) return { dial, errors };
  let o = given || null;
  if (!o) { try { o = JSON.parse(fs.readFileSync(p, "utf8")); } catch (err) { errors.push(TEMPO + " is not valid JSON: " + err.message); return { dial, errors }; } }
  if (!o || typeof o !== "object" || Array.isArray(o)) { errors.push(TEMPO + " must be an object of \"<kind>/<id>\": { \"from\": <phase or 0>, \"x\": <speed> }"); return { dial, errors }; }
  Object.keys(o).forEach((k) => {
    if (k === "about") return;
    const v = o[k], kind = k.split("/")[0], f = files.find((x) => x.kind + "/" + x.id === k);
    const bad = (why) => errors.push(TEMPO + " \"" + k + "\": " + why);
    if (TEMPO_KINDS.indexOf(kind) < 0) return bad("only a loss look's moment has a dial (" + TEMPO_KINDS.join(", ") + ")");
    if (!f) return bad("there is no art/" + k + ".js (a removed look): delete that line (node tools/art-remove.js does it)");
    if (!v || typeof v !== "object" || Array.isArray(v)) return bad("write { \"from\": \"<phase>\" or 0, \"x\": 1.3 }");
    if (typeof v.x !== "number" || !(v.x >= 1 && v.x <= 3)) return bad("x is the speed from that phase on, a number from 1 to 3 (1.3 = 30% faster; the reel's hold is fixed, so a look can only speed up)");
    if (v.from !== 0 && (typeof v.from !== "string" || !ID.test(v.from))) return bad("from is a phase the look's def declares, or 0 (the whole moment)");
    if (v.from !== 0 && !(f.phases && Object.prototype.hasOwnProperty.call(f.phases, v.from)))
      return bad("the look declares no phase \"" + v.from + "\"" + (f.phases && Object.keys(f.phases).length ? " (it has " + Object.keys(f.phases).join(", ") + ")" : " (its def has no phases: { " + v.from + ": <fraction> })"));
    dial[k] = { from: v.from, x: v.x };
  });
  return { dial, errors };
}
// given: art/tempo.json's content instead of the file's (test.js)
function tempoErrors(given) { return tempoOf(scan(), given).errors; }
function loadManifest() { return JSON.parse(fs.readFileSync(MANIFEST, "utf8")); }
// the manifest with exactly the art files on disk (new ones join with an empty key, deleted ones leave); the art
// entries sit together at the end, in the index's order
function syncManifest(m, files) {
  const out = {};
  Object.keys(m.files).forEach((k) => { if (!ART_FILE.test(k)) out[k] = m.files[k]; });
  files.forEach((f) => { out[f.rel] = m.files[f.rel] || { key: "", sha: "" }; });
  return Object.assign({}, m, { files: out });
}
function text(entries, offB) {
  const rows = entries.map((e) => "    { kind: " + JSON.stringify(e.kind) + ", id: " + JSON.stringify(e.id) + ", name: " + JSON.stringify(e.name) +
    ", file: " + JSON.stringify(e.file) + ", on: " + e.on + (e.perfect ? ", perfect: true" : "") +
    (e.tempo ? ", tempo: { from: " + JSON.stringify(e.tempo.from) + ", x: " + e.tempo.x + " }" : "") + " }");
  const tail = offB && offB.length ? "], { off: " + JSON.stringify(offB) + " });\n" : "]);\n";
  return "/* GENERATED by node tools/art-index.js from art/<kind>/ (loss, dots, scene, hot, perk, goat): never hand-edit\n" +
    "   (art/CONTRACT.md, art/CONTRACT-FX.md). One entry per variant file; \"on\" = the game deals it (art/enabled.json lists\n" +
    "   the ones that are off; the lab shows them all); \"perfect\" = an 82-0 scene, dealt from its own bag. Each file's\n" +
    "   ?v= key is the cache-key manifest's: node tools/cache-keys.js --stamp <key> rewrites it. \"tempo\" = the owner's speed\n" +
    "   dial (art/tempo.json); \"off\" after the list = built-ins no bag deals (they still stand in). */\n" +
    "(function () {\n  \"use strict\";\n  if (typeof T82ART === \"undefined\" || !T82ART || !T82ART.index) return;\n" +
    (rows.length ? "  T82ART.index([\n" + rows.join(",\n") + "\n  " + tail : "  T82ART.index([" + tail) + "})();\n";
}
// what the index and the manifest should be, from the files on disk (over.enabled: art/enabled.json's content instead
// of the file's, for test.js)
function build(over) {
  const files = scan(), errors = [], stale = [];
  files.forEach((f) => f.errors.forEach((e) => errors.push(e)));
  const off = offList(files, errors, stale, over && over.enabled), m = syncManifest(loadManifest(), files), T = tempoOf(files);
  const entries = files.filter((f) => !f.errors.length).map((f) => ({ kind: f.kind, id: f.id, name: f.name,
    file: f.rel + "?v=" + m.files[f.rel].key, on: off.indexOf(f.kind + "/" + f.id) < 0, perfect: f.perfect === true,
    tempo: T.dial[f.kind + "/" + f.id] || null }));
  const offB = off.filter(builtinKey);
  return { files, errors, stale, entries, manifest: m, text: text(entries, offB), tempoErrors: T.errors };
}
function check(over) {
  const b = build(over), findings = b.errors.concat(b.stale), have = loadManifest().files;
  b.files.forEach((f) => { if (!have[f.rel]) findings.push(f.rel + " is not in tools/cache-keys.json: run node tools/art-index.js"); });
  Object.keys(have).forEach((k) => { if (ART_FILE.test(k) && !b.files.some((f) => f.rel === k)) findings.push("tools/cache-keys.json keys " + k + " but the file is gone: run node tools/art-index.js"); });
  const p = path.join(ROOT, INDEX), now = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
  if (now !== b.text) findings.push(INDEX + (now == null ? " is missing" : " is out of date") + ": run node tools/art-index.js" + (b.errors.length ? " after fixing the files above" : ""));
  return findings;
}
function write() {
  const b = build();
  if (b.errors.length) { console.error(b.errors.join("\n") + "\n\nart index: not written (fix the files above)"); process.exit(1); }
  if (b.tempoErrors.length) console.error(b.tempoErrors.join("\n") + "\nart tempo: the lines above are skipped (those looks play at their own pace) until fixed");
  if (b.stale.length) console.error(b.stale.join("\n") + "\nart enabled: the lines above switch nothing off (their looks are gone); the index is written without them");
  const mText = JSON.stringify(b.manifest, null, 2) + "\n";
  if (fs.readFileSync(MANIFEST, "utf8") !== mText) fs.writeFileSync(MANIFEST, mText);
  const p = path.join(ROOT, INDEX);
  const changed = !fs.existsSync(p) || fs.readFileSync(p, "utf8") !== b.text;
  if (changed) fs.writeFileSync(p, b.text);
  const perfects = b.entries.filter((e) => e.perfect).length;
  const per = KINDS.map((k) => b.entries.filter((e) => e.kind === k).length + " " + k).join(", ") + (perfects ? " (" + perfects + " of them 82-0)" : "");
  const unkeyed = b.entries.filter((e) => /\?v=$/.test(e.file)).length;
  console.log("art index: " + per + (changed ? " (art-index.js rewritten)" : " (no change)") +
    (unkeyed ? "; " + unkeyed + " new file(s) need a key: node tools/cache-keys.js --stamp <key>" : ""));
}

if (require.main === module) {
  if (process.argv.indexOf("--check") > 0) {
    const f = check().concat(tempoErrors());
    if (f.length) { console.log(f.join("\n")); process.exit(1); }
    console.log("art index: current (every art file listed and keyed in the manifest, nothing stale)");
  } else write();
}
// a file's size budget in KB (law 6): its kind's, or an 82-0 scene's
function budgetOf(f) { return f.kind === "scene" && f.perfect ? BUDGET_PERFECT : BUDGET[f.kind]; }
module.exports = { check, build, scan, parse, lex, es5, text, budgetOf, tempoOf, tempoErrors, KINDS, BUILTIN, BUDGET, BUDGET_PERFECT, INDEX, TEMPO_KINDS };
