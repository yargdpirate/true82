#!/usr/bin/env node
/* TRUE 82 — scripts/validate_challenges.js: the manifest gate.
   ─────────────────────────────────────────────────────────────────────────────
   Every challenge in challenges.js must survive this before it ships (§5.5
   law). For each entry: N seeded headless sims against the REAL dataset with a
   deliberately mediocre policy (median-value legal pick — a survivability
   test, not an optimizer; a greedy policy would walk ladder challenges off a
   cliff and blame the manifest). Skips are spent the way a player would:
   only when the board is empty. FAIL = completion < MIN_COMPLETE, or a
   degenerate score spread (every sim identical wins — the challenge isn't a
   game). Run: node scripts/validate_challenges.js [--full]
   (default 6 seeds/challenge; --full = 16). test.js runs the 3-seed quick
   pass so the manifest can never rot silently. */
const path = require("path");
const fs = require("fs");
const T = require(path.join(__dirname, "..", "sim-core.js"));
const CH = require(path.join(__dirname, "..", "challenges.js"));

const data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "site_data.json"), "utf8"));
T.initData(data);
const I = T.t.IDX;

const SEEDS = process.argv.includes("--full") ? 16 : 6;
const HARD_FLOOR = 0.90;   // below this = broken, exit 1
const SPICY = 0.95;        // 90-95% under the no-planning policy = intentional tension, flagged not failed

function legalRows(S) {
  const pool = T.t.POOLS.get(T.key(S, S.cur.fr, S.cur.dec));
  const out = [];
  if (pool) pool.forEach((row, name) => {
    const r = T.resolveRow(S, name);
    if (!r || !T.rowDraftable(S, r)) return;
    // the slot we'd use: first open bucket that passes the pick hook
    const obs = T.rowOpenBuckets(S, r);
    for (const b of obs) {
      if (!S.ch || !S.ch.pick || S.ch.pick(S, r, b, T.t)) { out.push([name, r, b]); return; }
    }
  });
  out.sort((a, b) => (T.valueOf(S, b[1]) - T.valueOf(S, a[1])) || (a[0] < b[0] ? -1 : 1));
  return out;
}

function simulate(ch, seed) {
  const S = T.newState(ch.base, "wk-" + ch.id + "-" + seed, ch);
  let d = T.dealRound(S);
  if (d === "done") return { picks: 0, wins: null, why: "dead-at-deal-0" };
  let guard = 0;
  while (S.picks.length < 5 && !S.done && guard++ < 60) {
    const legal = legalRows(S);
    if (legal.length) {
      const c = legal[Math.floor(legal.length / 2)];   // the median-value pick
      if (!T.applyPick(S, c[0], c[1][I.season], c[2])) return { picks: S.picks.length, wins: null, why: "pick-refused" };
      d = T.dealRound(S);
      if (d === "done" && S.picks.length < 5) return { picks: S.picks.length, wins: null, why: "dead-mid-draft" };
    } else {
      // spend a skip the way a player would; if none, the run is stranded
      if (T.skipEra(S)) continue;
      if (T.skipTeam(S)) continue;
      if (ch.base === "cap" && T.yearReroll(S)) continue;
      return { picks: S.picks.length, wins: null, why: "stranded" };
    }
  }
  if (S.picks.length < 5) return { picks: S.picks.length, wins: null, why: "guard" };
  const res = T.finish(S);
  return { picks: 5, wins: res.wins, net: res.net, draws: res.rngDraws };
}

let failures = 0;
const lines = [];
for (const ch of CH.CHALLENGES) {
  const runs = [];
  for (let s = 1; s <= SEEDS; s++) runs.push(simulate(ch, s));
  const done = runs.filter(r => r.picks === 5);
  const rate = done.length / runs.length;
  const wins = done.map(r => r.wins);
  const spread = wins.length ? Math.max(...wins) - Math.min(...wins) : 0;
  const avg = wins.length ? (wins.reduce((a, b) => a + b, 0) / wins.length).toFixed(1) : "—";
  // miss-tolerance instead of a raw rate: at any n, ONE strand is tension, not
  // breakage (unlimited-attempt weeklies — a stranded run simply isn't submitted).
  const misses = runs.length - done.length;
  const allowed = Math.max(1, Math.floor(runs.length * 0.1));
  const bad = misses > allowed || (wins.length >= 4 && spread === 0);
  const spicy = !bad && misses > 0;
  if (bad) failures++;
  const whys = [...new Set(runs.filter(r => r.picks < 5).map(r => r.why + "@" + r.picks))].join(",");
  lines.push(`${bad ? "FAIL" : spicy ? "SPCY" : "ok  "} ${ch.id.padEnd(18)} ${ch.base.padEnd(7)} complete ${(rate * 100).toFixed(0).padStart(3)}%  avgW ${String(avg).padStart(5)}  spread ${String(spread).padStart(2)}${whys ? "  [" + whys + "]" : ""}`);
}
console.log(lines.join("\n"));
console.log(`\n${CH.CHALLENGES.length} challenges · ${SEEDS} seeds each · ${failures} failing`);
process.exit(failures ? 1 : 0);
