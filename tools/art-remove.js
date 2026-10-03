#!/usr/bin/env node
/* TRUE 82: remove an art look for good (v68). The owner (2026-10-02): every look should be "easily removable (by a
   relatively dumb model) ... without breaking anything". This is that one step.

     node tools/art-remove.js loss/seal                 remove one look (the file and every line that names it)
     node tools/art-remove.js loss/seal dots/balls      several at once
     node tools/art-remove.js loss/seal --key K         stamp the cache keys with K (default: one derived from the
                                                        date and the looks, e.g. 20261002-rm-loss-seal)
     node tools/art-remove.js loss/seal --dry-run       print what it would do and change nothing

   A look is "<kind>/<id>": its file is art/<kind>/<id>.js (art/loss/seal.js is loss/seal; "art/loss/seal.js" and
   "loss:seal" are read the same way). What it does, in order, and it stops at the first thing that goes wrong:
     1. checks every name first: an unknown kind or id, or a built-in, refuses the whole run (nothing changes)
     2. deletes art/<kind>/<id>.js
     3. removes its line from art/tempo.json (the owner's speed dial), its entry from art/enabled.json's "off" list and
        its entry from art/ledger.json (the reviewers' notes), where it has one
     4. node tools/art-index.js (regenerates art-index.js and drops the file from tools/cache-keys.json)
     5. bumps BUILD_V in app.js (the footer law: a client cache-key change ships with a new build number)
     6. node tools/cache-keys.js --stamp <key> (re-keys art-index.js and app.js on every page)
     7. node tools/art-index.js --check and node test.js
     8. prints what it did and what to commit
   It never touches git: you commit (it prints the exact files and command). If any step fails it puts every file back
   as it was, deleted look included, and says what failed: a removal is all or nothing.

   The built-ins (classic in loss, dots, hot, perk and goat; lake in scene) live inside the engines, not in a file, and
   the game needs them as the fallback for every other look: this refuses them. To stop the game dealing a built-in
   (or any look, while keeping its file and the lab's view of it), add "<kind>/<id>" to the "off" list in
   art/enabled.json and run node tools/art-index.js. */
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), crypto = require("crypto");
const ROOT = path.join(__dirname, "..");
const AI = require("./art-index.js");
const ENABLED = "art/enabled.json", TEMPO = "art/tempo.json", LEDGER = "art/ledger.json", APP = "app.js";
const ID = /^[a-z0-9-]+$/;
const BUILTIN_WHERE = { loss: "reel-riso.js", dots: "reel-riso.js", scene: "results-riso.js", hot: "riso-fx.js", perk: "riso-fx.js", goat: "riso-fx.js" };

const abs = (rel) => path.join(ROOT, rel);
const read = (rel) => fs.readFileSync(abs(rel), "utf8");
const exists = (rel) => fs.existsSync(abs(rel));

// "loss/seal", "loss:seal", "art/loss/seal.js", "./art/loss/seal.js" -> { kind, id } (null when it is not that shape)
function nameOf(arg) {
  const m = /^(?:\.\/)?(?:art\/)?([a-z]+)[\/:]([^\/:]+?)(?:\.js)?$/.exec(String(arg || "").trim());
  return m ? { kind: m[1], id: m[2] } : null;
}

// Pure: what a run would do with these names. -> { looks: [{ kind, id, key, rel }], refused: [{ arg, why }] }
function plan(args) {
  const looks = [], refused = [], seen = {};
  args.forEach((arg) => {
    const n = nameOf(arg);
    if (!n) return refused.push({ arg, why: "write a look as <kind>/<id>, e.g. loss/seal (its file is art/loss/seal.js)" });
    if (AI.KINDS.indexOf(n.kind) < 0) return refused.push({ arg, why: "\"" + n.kind + "\" is not a kind of look (" + AI.KINDS.join(", ") + ")" });
    if (AI.BUILTIN[n.kind].indexOf(n.id) >= 0) {
      return refused.push({ arg, why: n.kind + "/" + n.id + " is a built-in: it lives inside " + BUILTIN_WHERE[n.kind] + ", not in a file, and it is what " +
        "the game plays whenever another look is missing, so it cannot be removed. To stop the game dealing it, add \"" + n.kind + "/" + n.id +
        "\" to the \"off\" list in art/enabled.json and run node tools/art-index.js" });
    }
    const rel = "art/" + n.kind + "/" + n.id + ".js";
    if (!ID.test(n.id) || !exists(rel)) {
      const dir = abs("art/" + n.kind), have = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^[a-z0-9-]+\.js$/.test(f)).map((f) => f.slice(0, -3)).sort() : [];
      return refused.push({ arg, why: "there is no " + rel + " (the " + n.kind + " looks are: " + (have.join(" ") || "none") + ")" });
    }
    const key = n.kind + "/" + n.id;
    if (seen[key]) return;
    seen[key] = 1;
    looks.push({ kind: n.kind, id: n.id, key, rel });
  });
  return { looks, refused };
}

// art/tempo.json without these looks' lines, in its own one-line-per-look style
function tempoWithout(src, keys) {
  const o = JSON.parse(src), out = [], dropped = [];
  Object.keys(o).forEach((k) => {
    if (keys.indexOf(k) >= 0) { dropped.push(k); return; }
    const v = o[k];
    const one = v && typeof v === "object" && !Array.isArray(v)
      ? "{ " + Object.keys(v).map((x) => JSON.stringify(x) + ": " + JSON.stringify(v[x])).join(", ") + " }" : JSON.stringify(v);
    out.push("  " + JSON.stringify(k) + ": " + one);
  });
  return { text: "{\n" + out.join(",\n") + "\n}\n", dropped };
}
// art/enabled.json without these looks in "off" (the file's own layout: JSON.stringify with 2 spaces)
function enabledWithout(src, keys) {
  const o = JSON.parse(src), dropped = [];
  if (o && Array.isArray(o.off)) o.off = o.off.filter((k) => { if (keys.indexOf(k) >= 0) { dropped.push(k); return false; } return true; });
  return { text: JSON.stringify(o, null, 2) + "\n", dropped };
}
// art/ledger.json without these looks, in any of the shapes the lab reads (docs/art-lab/lab.js normLedger): a list of
// { kind, id } or { key: "kind/id" }, an object keyed "kind/id" or "kind:id" (or under "ledger"), or kind -> list/object
function ledgerWithout(src, keys) {
  const dropped = [], is = (kind, id) => keys.indexOf(kind + "/" + id) >= 0;
  const keyOf = (v) => { if (!v || typeof v !== "object") return null; if (v.kind && v.id) return v.kind + "/" + v.id; const k = v.key || v.ref; return typeof k === "string" ? k.replace(":", "/") : null; };
  function list(a) { return a.filter((v) => { const k = keyOf(v); if (k && keys.indexOf(k) >= 0) { dropped.push(k); return false; } return true; }); }
  function obj(o) {
    Object.keys(o).forEach((k) => {
      const v = o[k];
      if (/^[a-z]+[\/:][a-z0-9-]+$/.test(k)) { const kk = k.replace(":", "/"); if (keys.indexOf(kk) >= 0) { dropped.push(kk); delete o[k]; } }
      else if (AI.KINDS.indexOf(k) >= 0 && v && typeof v === "object") {
        if (Array.isArray(v)) o[k] = v.filter((x) => { if (x && x.id && is(k, x.id)) { dropped.push(k + "/" + x.id); return false; } return true; });
        else Object.keys(v).forEach((id) => { if (is(k, id)) { dropped.push(k + "/" + id); delete v[id]; } });
      }
    });
    return o;
  }
  let j = JSON.parse(src);
  if (Array.isArray(j)) j = list(j);
  else if (j && typeof j === "object") {
    let hit = false;
    ["variants", "entries", "looks"].forEach((f) => { if (Array.isArray(j[f])) { j[f] = list(j[f]); hit = true; } });
    if (!hit) { if (j.ledger && typeof j.ledger === "object" && !Array.isArray(j.ledger)) obj(j.ledger); else if (Array.isArray(j.ledger)) j.ledger = list(j.ledger); else obj(j); }
  }
  return { text: JSON.stringify(j, null, 2) + "\n", dropped };
}

// a fresh cache key: the date and the looks (letters, digits, . _ -), never one the manifest already uses
function deriveKey(looks, now) {
  const d = now || new Date(), p = (n) => (n < 10 ? "0" : "") + n;
  const day = "" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
  let key = day + "-rm-" + looks.map((l) => l.kind + "-" + l.id).join("-");
  if (key.length > 48) key = day + "-rm-" + looks.length + "-looks-" + crypto.createHash("sha1").update(looks.map((l) => l.key).join(",")).digest("hex").slice(0, 6);
  let used = {};
  try { const m = JSON.parse(read("tools/cache-keys.json")).files; Object.keys(m).forEach((f) => { used[m[f].key] = 1; }); } catch (err) { used = {}; }
  let k = key, n = 2;
  while (used[k]) k = key + "-" + n++;
  return k;
}
// BUILD_V "v68" -> "v68.1", "v68.1" -> "v68.2" (the footer law, app.js)
function nextBuild(v) {
  const m = /^v(\d+)(?:\.(\d+))?$/.exec(v);
  return m ? "v" + m[1] + "." + ((m[2] ? +m[2] : 0) + 1) : null;
}
// every place a removed look is still named in prose or a comment (harmless: listed so a person can tidy them)
function mentions(looks) {
  const hits = [], skip = /^(?:node_modules|\.git|\.wrangler|art\/(?:loss|dots|scene|hot|perk|goat)|docs\/history)(?:\/|$)/;
  const pats = looks.map((l) => ({ l, re: new RegExp("(?:art\\/" + l.kind + "\\/" + l.id + "\\.js|\\b" + l.kind + "[\\/:]" + l.id + "\\b)") }));
  (function walk(dir) {
    fs.readdirSync(abs(dir || ".")).forEach((f) => {
      const rel = dir ? dir + "/" + f : f;
      // the generated files are already current; test.js and this tool use look names only as examples
      if (skip.test(rel) || ["art-index.js", "tools/cache-keys.json", "test.js", "tools/art-remove.js"].indexOf(rel) >= 0) return;
      const st = fs.statSync(abs(rel));
      if (st.isDirectory()) return walk(rel);
      if (!/\.(?:js|mjs|html|md|json|css)$/.test(f) || st.size > 2e6) return;
      const lines = read(rel).split("\n");
      lines.forEach((line, i) => pats.forEach((p) => { if (p.re.test(line)) hits.push(rel + ":" + (i + 1) + " (" + p.l.key + ")"); }));
    });
  })("");
  return hits;
}

function run(cmd, args) {
  const r = cp.spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status == null ? 1 : r.status, signal: r.signal, out: (r.stdout || "") + (r.stderr || ""), cmd };
}

function main(argv) {
  const ids = [], o = { key: null, dry: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--key") o.key = argv[++i];
    else if (argv[i] === "--dry-run") o.dry = true;
    else if (argv[i] === "-h" || argv[i] === "--help") { console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].replace(/^#!.*\n\/\* ?/, "")); return 0; }
    else ids.push(argv[i]);
  }
  if (!ids.length) { console.error("usage: node tools/art-remove.js <kind>/<id> [<kind>/<id> ...] [--key K] [--dry-run]   (e.g. loss/seal; --help for more)"); return 2; }
  if (o.key != null && !/^[A-Za-z0-9._-]+$/.test(o.key)) { console.error("--key: letters, digits, . _ - only"); return 2; }
  const P = plan(ids);
  if (P.refused.length) {
    console.error("art-remove: nothing was changed.\n" + P.refused.map((r) => "  " + r.arg + ": " + r.why).join("\n"));
    return 2;
  }
  const keys = P.looks.map((l) => l.key), key = o.key || deriveKey(P.looks);
  const appSrc = read(APP), bm = /var BUILD_V = "([^"]+)";/.exec(appSrc), build = bm ? nextBuild(bm[1]) : null;
  const done = [];
  console.log("art-remove: " + keys.join(", ") + (o.dry ? " (dry run: nothing changes)" : ""));
  if (o.dry) {
    P.looks.forEach((l) => console.log("  would delete " + l.rel));
    [[TEMPO, tempoWithout], [ENABLED, enabledWithout], [LEDGER, ledgerWithout]].forEach(([rel, fn]) => {
      if (!exists(rel)) return;
      const r = fn(read(rel), keys);
      if (r.dropped.length) console.log("  would take " + r.dropped.join(", ") + " out of " + rel);
    });
    console.log("  would run node tools/art-index.js, set BUILD_V " + (bm ? bm[1] + " -> " + build : "(not found)") + " in app.js, run node tools/cache-keys.js --stamp " + key +
      ", node tools/art-index.js --check and node test.js");
    return 0;
  }
  // Every file this can touch, as it is now: anything that fails puts them all back (nothing is ever left half done)
  const touch = P.looks.map((l) => l.rel).concat([TEMPO, ENABLED, LEDGER, "art-index.js", "tools/cache-keys.json", APP], require("./cache-keys.js").PAGES)
    .filter((rel, i, a) => a.indexOf(rel) === i);
  const before = {};
  touch.forEach((rel) => { before[rel] = exists(rel) ? fs.readFileSync(abs(rel)) : null; });
  const restore = () => touch.forEach((rel) => {
    if (before[rel] == null) { if (exists(rel)) fs.unlinkSync(abs(rel)); }
    else if (!exists(rel) || !fs.readFileSync(abs(rel)).equals(before[rel])) fs.writeFileSync(abs(rel), before[rel]);
  });
  const stop = (step, r) => {
    restore();
    const lines = r.out.split("\n").filter((x) => x.trim()), fails = lines.filter((x) => /^FAIL\b/.test(x));
    console.error("art-remove: STOPPED at " + step + ", and put every file back as it was (nothing changed).\n" +
      (fails.length ? fails : lines.slice(-15)).slice(0, 30).join("\n") +
      (step === "node test.js" ? "\n\nIf node test.js fails without the removal too, fix that first (or run node test.js to see the whole run)." : ""));
    return 1;
  };
  try {
    // 2. the files
    P.looks.forEach((l) => { fs.unlinkSync(abs(l.rel)); done.push("deleted " + l.rel); });
    // 3. every line that names them
    [[TEMPO, tempoWithout, "its speed-dial line"], [ENABLED, enabledWithout, "its \"off\" entry"], [LEDGER, ledgerWithout, "its reviewers' entry"]].forEach(([rel, fn, what]) => {
      if (!exists(rel)) return;
      const r = fn(read(rel), keys);
      if (!r.dropped.length) return;
      fs.writeFileSync(abs(rel), r.text);
      done.push("took " + r.dropped.join(", ") + " out of " + rel + " (" + what + ")");
    });
  } catch (err) { return stop("removing the files", { out: String(err && err.message || err) }); }
  // 4. the index (and the manifest)
  let r = run("index", [path.join("tools", "art-index.js")]);
  if (r.code) return stop("node tools/art-index.js", r);
  done.push("regenerated art-index.js and dropped the file from tools/cache-keys.json (" + r.out.trim().split("\n").pop() + ")");
  // 5. the build number
  if (bm && build) { fs.writeFileSync(abs(APP), appSrc.replace(bm[0], 'var BUILD_V = "' + build + '";')); done.push("BUILD_V " + bm[1] + " -> " + build + " in app.js (the footer law)"); }
  else done.push("BUILD_V not found in app.js: bump it by hand (the footer law)");
  // 6. the keys
  r = run("stamp", [path.join("tools", "cache-keys.js"), "--stamp", key]);
  if (r.code) return stop("node tools/cache-keys.js --stamp " + key, r);
  const stampLine = r.out.trim().split("\n")[0];
  done.push(stampLine.replace(/^stamped/, "stamped the key"));
  // 7. the checks (test.js on Node 24 can die with a segfault, exit 139, no FAIL line: a known flake, so once more)
  r = run("check", [path.join("tools", "art-index.js"), "--check"]);
  if (r.code) return stop("node tools/art-index.js --check", r);
  done.push("node tools/art-index.js --check: current");
  r = run("test", ["test.js"]);
  if (r.code && !/FAIL/.test(r.out)) r = run("test", ["test.js"]);
  if (r.code) return stop("node test.js", r);
  done.push("node test.js: " + ((/\n(\d+ passed, \d+ failed)/.exec(r.out) || [])[1] || "passed"));
  // 8. the report
  console.log(done.map((d) => "  done: " + d).join("\n"));
  const left = mentions(P.looks);
  if (left.length) console.log("\nStill named in comments or docs (harmless; tidy them if you like):\n" + left.slice(0, 40).map((x) => "  " + x).join("\n") + (left.length > 40 ? "\n  ... and " + (left.length - 40) + " more" : ""));
  // what to commit: exactly the files this run changed (the deleted looks included)
  const changed = touch.filter((rel) => before[rel] == null ? exists(rel) : !exists(rel) || !fs.readFileSync(abs(rel)).equals(before[rel]));
  const others = ((/^stamped \S+ on: (.*)$/.exec(stampLine) || [])[1] || "").split(", ").filter((f) => f && changed.indexOf(f) < 0);
  const msg = "Remove art look" + (keys.length > 1 ? "s " : " ") + keys.join(", ") + " (key " + key + (build ? ", " + build : "") + ")";
  console.log("\nWhat to commit (exactly the files this changed):\n" + changed.map((x) => "  " + x).join("\n") +
    "\n\n  git add -A -- " + changed.join(" ") + "\n  git commit -m \"" + msg + "\"" +
    (others.length ? "\n\nNote: the stamp also keyed files that had changed before this run: " + others.join(", ") + ". Commit them in the same commit (their new keys are in the files above)." : ""));
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { plan, nameOf, tempoWithout, enabledWithout, ledgerWithout, deriveKey, nextBuild };
