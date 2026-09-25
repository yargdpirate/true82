#!/usr/bin/env node
/* node tools/theme.js            rewrite the theme block at the top of styles.css from tools/theme-core.js
   node tools/theme.js --check    exit 1 if styles.css's theme block differs from what theme-core.js builds
   node tools/theme.js --print    print the block without touching styles.css
   To change a color: edit its role (or a shade's recipe) in tools/theme-core.js, then run this.
   Never hand-edit the block in styles.css; test.js fails when it drifts. */
"use strict";
const fs = require("fs"), path = require("path");
const T = require("./theme-core.js");
const FILE = path.join(__dirname, "..", "styles.css");

const want = T.block();
if (process.argv.includes("--print")) { console.log(want); process.exit(0); }
const css = fs.readFileSync(FILE, "utf8");
const a = css.indexOf(T.BEGIN), b = css.indexOf(T.END);
if (a < 0 || b < a) { console.error("styles.css has no theme block markers (" + T.BEGIN + ")"); process.exit(2); }
const have = css.slice(a, b + T.END.length);
if (process.argv.includes("--check")) {
  if (have !== want) { console.error("styles.css theme block is out of date: run node tools/theme.js"); process.exit(1); }
  console.log("theme block is current"); process.exit(0);
}
if (have === want) { console.log("theme block already current"); process.exit(0); }
fs.writeFileSync(FILE, css.slice(0, a) + want + css.slice(b + T.END.length));
console.log("rewrote the theme block in styles.css");
