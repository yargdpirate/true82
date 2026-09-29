#!/usr/bin/env node
/* TRUE 82 cache keys (v64.1, the speed pass). The files in tools/cache-keys.json are served with a year-long,
   immutable browser cache (_headers), so a returning player's phone never asks for them again: the page opens from
   what it already has. That works only while every reference carries ?v=<key> and a changed file gets a new key;
   otherwise returning players keep the old file. The manifest records each file's key and its content's fingerprint,
   and test.js runs check() on every build.
     node tools/cache-keys.js            check: each file's fingerprint, and every reference to it carries its key
     node tools/cache-keys.js --stamp K  give every file whose content CHANGED the key K (and key any bare reference):
                                         rewrites the references in the pages below and records the new fingerprints
   A file joins by adding it to the manifest (key and sha may start empty) and running --stamp. HTML pages and
   labels.json (the weekly tag refresh rewrites it) are never on the list; they keep revalidating. */
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const ROOT = path.join(__dirname, "..");
const MANIFEST = path.join(__dirname, "cache-keys.json");
// every file that may reference a listed file (app.js holds site_data.json's key)
const PAGES = ["index.html", "404.html", "bonuses/index.html", "traits/index.html", "faq/index.html", "how-it-works/index.html",
  "can-you-go-82-0/index.html", "what-is-bpm/index.html", "docs/style-guide.html", "app.js"];

function sha(file) { return crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, file))).digest("hex").slice(0, 16); }
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
// a quoted reference: "file", "/file", "file?v=KEY" or "/file?v=KEY" (a mention in prose or a comment is not quoted)
function refRe(file) { return new RegExp("([\"'])(/?)" + esc(file) + "(?:\\?v=([A-Za-z0-9._-]*))?(?=[\"'])", "g"); }
function load() { return JSON.parse(fs.readFileSync(MANIFEST, "utf8")); }

function check() {
  const m = load(), findings = [];
  Object.keys(m.files).forEach((file) => {
    const want = m.files[file];
    if (!fs.existsSync(path.join(ROOT, file))) { findings.push(file + " is in tools/cache-keys.json but not in the repo"); return; }
    if (sha(file) !== want.sha) findings.push(file + " changed since its key " + want.key + " was stamped: run node tools/cache-keys.js --stamp <new key>");
    let seen = 0;
    PAGES.forEach((page) => {
      const src = fs.readFileSync(path.join(ROOT, page), "utf8");
      let r;
      const re = refRe(file);
      while ((r = re.exec(src))) {
        seen++;
        if (r[3] !== want.key) findings.push(page + " asks for " + file + (r[3] ? "?v=" + r[3] : " with no key") + " (its key is " + want.key + ")");
      }
    });
    if (!seen) findings.push(file + " is in tools/cache-keys.json but no page references it");
  });
  // _headers gives exactly these files the year-long immutable cache
  const H = fs.readFileSync(path.join(ROOT, "_headers"), "utf8"), immutable = {};
  const rule = /^\/(\S+)\n\s+Cache-Control:\s*public, max-age=31536000, immutable\s*$/gm;
  let h;
  while ((h = rule.exec(H))) immutable[h[1]] = 1;
  Object.keys(m.files).forEach((file) => { if (!immutable[file]) findings.push("_headers gives " + file + " no immutable Cache-Control rule"); });
  Object.keys(immutable).forEach((file) => { if (!m.files[file]) findings.push("_headers caches " + file + " for a year but tools/cache-keys.json does not key it"); });
  return findings;
}

function stamp(key) {
  if (!/^[A-Za-z0-9._-]+$/.test(key || "")) { console.error("usage: node tools/cache-keys.js --stamp <key>  (letters, digits, . _ -)"); process.exit(2); }
  const m = load(), changed = [];
  Object.keys(m.files).forEach((file) => {
    const now = sha(file), entry = m.files[file];
    if (now !== entry.sha || !entry.key) { entry.key = key; entry.sha = now; changed.push(file); }
    PAGES.forEach((page) => {
      const p = path.join(ROOT, page), src = fs.readFileSync(p, "utf8");
      const out = src.replace(refRe(file), (all, q, slash) => q + slash + file + "?v=" + entry.key);
      if (out !== src) fs.writeFileSync(p, out);
    });
  });
  fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + "\n");
  console.log(changed.length ? "stamped " + key + " on: " + changed.join(", ") : "no file changed; every reference now carries its key");
}

if (require.main === module) {
  const i = process.argv.indexOf("--stamp");
  if (i > 0) stamp(process.argv[i + 1]);
  const f = check();
  if (f.length) { console.log(f.join("\n")); process.exit(1); }
  console.log("cache keys: every file matches its key and every reference carries it");
}
module.exports = { check, stamp, PAGES };
