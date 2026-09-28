#!/usr/bin/env node
/* TRUE 82: freeze the player tags into labels.json, the copy the scoring engine and every draft board read (v61,
   the label taxes; AGENT-HANDOFF 00000r). The tags move as votes land; the game must not, so each release ships a
   frozen copy (refresh it weekly, then bump LABELS_V in app.js and the cache keys).

     node tools/labels-freeze.js            reads the live D1 (true82) through wrangler, READ-ONLY (one SELECT)
     node tools/labels-freeze.js --local <sqlite file>   the same from a local D1 copy (tests, offline)

   Precedence is the live label service's (functions/api/traits.js op=labels): a settled crowd ruling beats a desk
   ruling beats the scout; a disputed crowd tally, or a scout "unsure" with nothing above it, is "u" (a "?" on the
   card); a "does not qualify" at any layer keeps the lower layers out. Only core traits, only active questions, only
   player-seasons that exist in site_data.json (names matched with accents folded, the way the engine looks them up).
   Output: { v, built, traits: [ids], p: { "folded name": { "season": "<trait index base36><y|u>..." } } } */
"use strict";
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const ROOT = path.join(__dirname, "..");
// wrangler: $WRANGLER, else an old session's local copy if it is still there, else npx wrangler@4 (signed in on the
// owner's Mac; /private/tmp copies can vanish)
const WR_LOCAL = "/private/tmp/claude-501/-Users-ggz-true82/e9c38d0a-5a5c-4f39-bde5-b87ab002875b/scratchpad/wr/node_modules/.bin/wrangler";
const WRANGLER = process.env.WRANGLER || (fs.existsSync(WR_LOCAL) ? WR_LOCAL : null);
function wrangler(args, opts) {
  return WRANGLER ? wrangler(args, opts) : execFileSync("npx", ["--yes", "wrangler@4"].concat(args), opts);
}
const TRAITS = ["three-point-shooter", "super-three-point-shooter", "rim-pressurer", "off-ball-scorer", "tough-shot-maker", "playmaker",
  "iso-defender", "team-defender", "switchable-defender", "rim-protector", "clutch", "championship-number-one", "hunted",
  "ball-stopper", "ball-pounder", "foul-merchant", "stat-padder", "off-court-knucklehead"];
const SQL = `SELECT q.player_name n, q.season s, q.trait_id t, c.status cs, e.verdict ev, sc.verdict sv
  FROM trait_questions_v1 q
  JOIN traits_v1 tr ON tr.id = q.trait_id
  LEFT JOIN trait_consensus_v1 c ON c.question_id = q.id
  LEFT JOIN trait_editorial_v1 e ON e.question_id = q.id
  LEFT JOIN trait_scout_v1 sc ON sc.question_id = q.id
  WHERE tr.status = 'core' AND q.status = 'active' AND q.season IS NOT NULL
    AND (c.status IN ('qualifies','does_not_qualify','disputed') OR e.verdict IS NOT NULL OR sc.verdict IS NOT NULL)`;
function fold(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }

function readRows() {
  const i = process.argv.indexOf("--local");
  if (i > 0) {
    const out = execFileSync("sqlite3", ["-json", process.argv[i + 1], SQL.replace(/\s+/g, " ")], { maxBuffer: 1 << 28 }).toString();
    return out.trim() ? JSON.parse(out) : [];
  }
  const out = wrangler(["d1", "execute", "true82", "--remote", "--json", "--command", SQL.replace(/\s+/g, " ")],
    { cwd: require("os").tmpdir(), maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }).toString();
  const res = JSON.parse(out);
  if (!res[0] || !res[0].success) throw new Error("the D1 query failed");
  return res[0].results;
}

const rows = readRows();
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "site_data.json"), "utf8"));
const C = {}; data.meta.cols.forEach((c, k) => { C[c] = k; });
const inGame = new Set(data.players.map((r) => fold(r[C.name]) + "~" + r[C.season]));
const state = new Map();                    // "folded~season" -> Map(trait -> "y" | "u")
let unmatched = 0, blocked = 0;
for (const r of rows) {
  const t = TRAITS.indexOf(r.t);
  if (t < 0) continue;
  const key = fold(r.n) + "~" + r.s;
  if (!inGame.has(key)) { unmatched++; continue; }
  let v = null;
  if (r.cs === "disputed") v = "u";
  else if (r.cs === "qualifies") v = "y";
  else if (r.cs === "does_not_qualify") v = null;
  else if (r.ev === "qualifies") v = "y";
  else if (r.ev === "does_not_qualify") v = null;
  else if (r.sv === "yes") v = "y";
  else if (r.sv === "unsure") v = "u";
  if (!v) { blocked++; continue; }
  if (!state.has(key)) state.set(key, new Map());
  state.get(key).set(t, v);
}
const p = {};
let tags = 0, yes = 0;
[...state.keys()].sort().forEach((key) => {
  const cut = key.lastIndexOf("~"), name = key.slice(0, cut), season = key.slice(cut + 1);
  const m = state.get(key);
  const code = [...m.keys()].sort((a, b) => a - b).map((t) => { tags++; if (m.get(t) === "y") yes++; return t.toString(36) + m.get(t); }).join("");
  (p[name] = p[name] || {})[season] = code;
});
const out = { v: 1, built: new Date().toISOString(), source: process.argv.includes("--local") ? "local D1 copy" : "D1 true82 (live)", traits: TRAITS, p };
const file = path.join(ROOT, "labels.json");
fs.writeFileSync(file, JSON.stringify(out));
console.log(`labels.json: ${state.size} player-seasons, ${tags} tags (${yes} settled yes, ${tags - yes} "?"), ` +
  `${(fs.statSync(file).size / 1024).toFixed(0)} KB; ${unmatched} rows name a season not in the game, ${blocked} ruled out`);
