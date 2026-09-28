#!/usr/bin/env node
/* TRUE 82: the label taxes' balance check (v61). Scores every real draft on record twice, without and with the
   frozen tags (labels.json), and reports how often each tax and credit fires and how the records move.
     node tools/labels-balance.js           reads the real drafts from the live D1 through wrangler (READ-ONLY SELECT)
     node tools/labels-balance.js <file>    reads them from a saved JSON result of that query (re-runs, offline)
     --old <labels file>                    "before" scores with that older labels.json instead of no tags (a weekly
                                            refresh's week-over-week check); JSON_OUT=<file> writes the numbers
   Standard boards only (Classic, Presti, Pro with no Daily or challenge twist): a board's own tax settings live in
   challenges.js and would need its run's board to score. Projected records (the engine's own), not realized seasons. */
"use strict";
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const ROOT = path.join(__dirname, "..");
const WRANGLER = process.env.WRANGLER || "/private/tmp/claude-501/-Users-ggz-true82/e9c38d0a-5a5c-4f39-bde5-b87ab002875b/scratchpad/wr/node_modules/.bin/wrangler";
const SQL = "SELECT run_id, mode, ordinal, player, season, slot, source, challenge FROM events WHERE name = 'draft_pick' AND run_id IS NOT NULL AND mode IN ('classic','cap','pro')";

const oi = process.argv.indexOf("--old");
const oldLabels = oi > 0 ? JSON.parse(fs.readFileSync(process.argv[oi + 1], "utf8")) : null;
const args = process.argv.slice(2).filter((a, i, all) => a !== "--old" && all[i - 1] !== "--old");
let picks;
if (args[0]) picks = JSON.parse(fs.readFileSync(args[0], "utf8"));
else {
  const out = execFileSync(WRANGLER, ["d1", "execute", "true82", "--remote", "--json", "--command", SQL],
    { cwd: require("os").tmpdir(), maxBuffer: 1 << 30, stdio: ["ignore", "pipe", "ignore"] }).toString();
  picks = JSON.parse(out)[0].results;
  if (process.env.SAVE) fs.writeFileSync(process.env.SAVE, JSON.stringify(picks));
}

const T = require(path.join(ROOT, "sim-core.js"));
const t = T.initData(JSON.parse(fs.readFileSync(path.join(ROOT, "site_data.json"), "utf8")));
const IDX = t.IDX, labels = JSON.parse(fs.readFileSync(path.join(ROOT, "labels.json"), "utf8"));
// the exact engine row for a pick: its franchise's pool, that player, that season
const byFr = new Map();
t.POOL_YEARS.forEach((names, key) => {
  const fr = key.split("|")[0];
  names.forEach((rows, name) => rows.forEach((r) => byFr.set(fr + "|" + name + "|" + r[IDX.season], r)));
});
const runs = new Map();
for (const p of picks) {
  if (p.challenge) continue;
  if (!runs.has(p.run_id)) runs.set(p.run_id, { mode: p.mode, picks: [] });
  runs.get(p.run_id).picks.push(p);
}
const lineups = [];
let unresolved = 0;
runs.forEach((r) => {
  const ps = r.picks.sort((a, b) => a.ordinal - b.ordinal);
  const seen = new Set(), rows = [], slots = [];
  for (const p of ps) {
    if (seen.has(p.ordinal)) continue;
    seen.add(p.ordinal);
    const row = byFr.get(p.source + "|" + p.player + "|" + p.season);
    if (!row) { unresolved++; return; }
    rows.push(row); slots.push(p.slot);
  }
  if (rows.length === 5 && slots.filter((s) => s === "G").length === 2 && slots.filter((s) => s === "F").length === 2) lineups.push({ mode: r.mode, rows, slots });
});

function score(tags) {
  T.setLabels(tags || null);
  return lineups.map((l) => T.engine({ ch: null }, l.rows, l.slots));
}
const before = score(oldLabels), after = score(labels);
if (oldLabels) console.log("before = the older labels.json (" + (oldLabels.built || "?") + "), after = this one (" + (labels.built || "?") + ")\n");
const MODE = { classic: "Classic", cap: "Presti", pro: "Pro" };
const pct = (a, b) => (b ? (100 * a / b).toFixed(1) + "%" : "-");
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
console.log(`real drafts on standard boards: ${lineups.length} complete lineups (${unresolved} runs skipped: a pick not on the current board data)\n`);
const report = {};
["classic", "cap", "pro", "all"].forEach((m) => {
  const ix = lineups.map((l, i) => i).filter((i) => m === "all" || lineups[i].mode === m);
  if (!ix.length) return;
  const b = ix.map((i) => before[i]), a = ix.map((i) => after[i]);
  const dw = ix.map((i) => after[i].winTally - before[i].winTally);
  const fires = {};
  a.forEach((e) => e.labelRows.forEach((r) => { fires[r.id] = (fires[r.id] || 0) + 1; }));
  const rimCleared = ix.filter((i) => before[i].rimDefTax > 0 && after[i].rimDefTax === 0).length;
  const creatorCleared = ix.filter((i) => before[i].creatorTax > 0 && after[i].creatorTax === 0).length;
  const R = report[m] = {
    lineups: ix.length,
    wins: [mean(b.map((e) => e.winTally)), mean(a.map((e) => e.winTally))],
    net: [mean(b.map((e) => e.net)), mean(a.map((e) => e.net))],
    perfect: [b.filter((e) => e.winTally >= 82).length, a.filter((e) => e.winTally >= 82).length],
    anyTax: a.filter((e) => e.labelRows.some((r) => r.amt > 0)).length,
    anyCredit: a.filter((e) => e.labelRows.some((r) => r.amt < 0)).length,
    down3: dw.filter((d) => d <= -3).length, up: dw.filter((d) => d > 0).length, same: dw.filter((d) => d === 0).length,
    worst: Math.min.apply(null, dw), best: Math.max.apply(null, dw),
    fires, rimCleared, creatorCleared
  };
  console.log(`${m === "all" ? "ALL STANDARD BOARDS" : MODE[m]} (${R.lineups} lineups)`);
  console.log(`  projected wins, mean: ${R.wins[0].toFixed(2)} -> ${R.wins[1].toFixed(2)} (${(R.wins[1] - R.wins[0]).toFixed(2)}); net ${R.net[0].toFixed(2)} -> ${R.net[1].toFixed(2)}`);
  console.log(`  82-0 projections: ${R.perfect[0]} -> ${R.perfect[1]} (${pct(R.perfect[0], R.lineups)} -> ${pct(R.perfect[1], R.lineups)})`);
  console.log(`  records: ${pct(R.same, R.lineups)} unchanged, ${pct(R.up, R.lineups)} up, ${pct(R.lineups - R.same - R.up, R.lineups)} down (${pct(R.down3, R.lineups)} down 3+ wins); range ${R.worst} to +${R.best}`);
  console.log(`  any label tax: ${pct(R.anyTax, R.lineups)}; any credit: ${pct(R.anyCredit, R.lineups)}`);
  console.log("  fires: " + ["iso", "clutch", "teamd", "rimplus", "tshot", "knuck", "switch", "cut"].map((k) => k + " " + pct(fires[k] || 0, R.lineups)).join(", "));
  console.log(`  a tag cleared the stat rim tax on ${pct(rimCleared, R.lineups)} of lineups, the creator tax on ${pct(creatorCleared, R.lineups)}\n`);
});
if (process.env.JSON_OUT) fs.writeFileSync(process.env.JSON_OUT, JSON.stringify(report, null, 1));
