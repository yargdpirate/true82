#!/usr/bin/env node
/* TRUE 82: the weekly tag refresh (the owner's rule for the label taxes, v61; AGENT-HANDOFF 00000r).
   One command, safe to run unattended (a weekly scheduled task runs it):
     node tools/labels-refresh.js            refresh, check, and commit + push to c-code-clean when every check passes
     node tools/labels-refresh.js --dry      refresh and check only; leaves the working tree as it found it
   Steps: be on c-code-clean with a clean tree and pull it; freeze the live tags (tools/labels-freeze.js, one read-only
   SELECT); stop if no tag changed; point index.html's <meta name="t82-labels"> at today; then the checks: node test.js,
   the balance week over week (tools/labels-balance.js --old: mean projected wins may not move more than 0.5, nor the
   82-0 projection rate more than 2 points, in Classic or Presti) and the Daily certification with the tags on
   (tools/daily-audit.js 120 pool3 --labels). All pass: commit "Tags refresh <date>" and push c-code-clean. Any fail:
   restore labels.json and index.html, commit nothing, and say why. It NEVER touches main: the owner says when.
   A tag refresh is data, not a build: BUILD_V and the code cache keys stay put (the Scoring Card's note shows the
   tags' date). */
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), { execFileSync } = require("child_process");
const ROOT = path.join(__dirname, "..");
const DRY = process.argv.includes("--dry");
const say = (m) => console.log(m);
const sh = (cmd, args, opts) => execFileSync(cmd, args, Object.assign({ cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 }, opts || {})).toString();
function fail(why) { say("REFRESH STOPPED: " + why); process.exit(1); }

// 1. the branch and a clean tree
const branch = sh("git", ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
if (branch !== "c-code-clean") fail("not on c-code-clean (on " + branch + ")");
const dirty = sh("git", ["status", "--porcelain", "--untracked-files=no"]).trim();
if (dirty) fail("the working tree has uncommitted changes:\n" + dirty);
if (!DRY) sh("git", ["pull", "--ff-only", "origin", "c-code-clean"]);

// 2. freeze
const labelsPath = path.join(ROOT, "labels.json"), indexPath = path.join(ROOT, "index.html");
const oldLabelsText = fs.readFileSync(labelsPath, "utf8"), oldIndex = fs.readFileSync(indexPath, "utf8");
const oldTmp = path.join(os.tmpdir(), "t82-labels-old.json");
fs.writeFileSync(oldTmp, oldLabelsText);
say(sh("node", ["tools/labels-freeze.js"]).trim());
const strip = (t) => { const o = JSON.parse(t); delete o.built; return JSON.stringify(o); };
const newLabelsText = fs.readFileSync(labelsPath, "utf8");
function restore() { fs.writeFileSync(labelsPath, oldLabelsText); fs.writeFileSync(indexPath, oldIndex); }
if (strip(newLabelsText) === strip(oldLabelsText)) { restore(); say("No tag changed since the last refresh. Nothing to ship."); process.exit(0); }

// what moved, in words
function flat(t) { const o = JSON.parse(t), m = new Map(); Object.keys(o.p).forEach((n) => Object.keys(o.p[n]).forEach((y) => { const c = o.p[n][y]; for (let i = 0; i + 1 < c.length; i += 2) m.set(n + "~" + y + "~" + o.traits[parseInt(c[i], 36)], c[i + 1]); })); return m; }
const A = flat(oldLabelsText), B = flat(newLabelsText);
let added = 0, removed = 0, settled = 0, unsettled = 0;
B.forEach((v, k) => { if (!A.has(k)) added++; else if (A.get(k) !== v) (v === "y" ? settled++ : unsettled++); });
A.forEach((v, k) => { if (!B.has(k)) removed++; });
say(`tags: ${added} new, ${removed} gone, ${settled} settled from "?", ${unsettled} back to "?"`);

// 3. the version the pages ask for
const d = new Date(), ver = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + "-tags";
const idx = oldIndex.replace(/(<meta name="t82-labels" content=")[^"]*(">)/, "$1" + ver + "$2");
if (idx === oldIndex) { restore(); fail('index.html has no <meta name="t82-labels">'); }
fs.writeFileSync(indexPath, idx);

// 4. the checks
try {
  const t = sh("node", ["test.js"]);
  const line = t.trim().split("\n").pop();
  if (!/ 0 failed/.test(line)) { restore(); fail("node test.js: " + line); }
  say("test.js: " + line);
} catch (e) { restore(); fail("node test.js failed:\n" + String(e.stdout || e.message).split("\n").filter((l) => /FAIL/.test(l)).join("\n")); }
const jsonOut = path.join(os.tmpdir(), "t82-balance.json");
say(sh("node", ["tools/labels-balance.js", "--old", oldTmp], { env: Object.assign({}, process.env, { JSON_OUT: jsonOut }) }).trim());
const bal = JSON.parse(fs.readFileSync(jsonOut, "utf8"));
for (const m of ["classic", "cap"]) {
  const r = bal[m];
  if (!r) continue;
  const dw = r.wins[1] - r.wins[0], dp = 100 * (r.perfect[1] - r.perfect[0]) / r.lineups;
  if (Math.abs(dw) > 0.5 || Math.abs(dp) > 2) { restore(); fail(`${m}: the week's tags move mean wins ${dw.toFixed(2)} and 82-0 projections ${dp.toFixed(1)} points (the bar is 0.5 and 2): a person should look first`); }
}
try { sh("node", ["tools/daily-audit.js", "120", "pool3", "--labels"]); say("daily-audit pool3 --labels: all boards PASS"); }
catch (e) { restore(); fail("the Daily certification failed with the new tags:\n" + String(e.stdout || "").split("\n").filter((l) => /FAIL/.test(l)).slice(0, 10).join("\n")); }

// 5. ship to the branch (never main)
if (DRY) { restore(); say("Dry run: every check passed; nothing committed."); process.exit(0); }
sh("git", ["add", "labels.json", "index.html"]);
sh("git", ["commit", "-m", `Tags refresh ${ver.slice(0, 8)}: ${added} new, ${removed} gone, ${settled} settled\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`]);
sh("git", ["push", "origin", "c-code-clean"]);
say(`Committed and pushed to c-code-clean (not main). The tags go live when the owner says "push to main".`);
