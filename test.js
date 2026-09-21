// TRUE 82 — headless logic test harness (no browser needed).
// Run:  node test.js   (from the repo root; expects app.js + sim-core.js beside it)
// Covers: career position buckets, chargeReroll refund/fire-sale slices + blocking,
// effCost fire-sale floor, capRoll bargain decay (monotonic, rip-offs invariant),
// lineup swap legality + doLineupMove/doLineupSwap state, FORCE_CLUTCH/prefersReduce
// flags, and the crest load-race regression. Run this BEFORE and AFTER any change
// to game logic in app.js. 41 checks; exits nonzero on any failure.

const fs = require("fs");
const vm = require("vm");

let core = fs.readFileSync("sim-core.js", "utf8");
let code = fs.readFileSync("app.js", "utf8");
// disarm the auto-boot line for headless testing
code = code.replace('if (typeof document !== "undefined" && document.getElementById) { boot(); }', "");

const ctx = {
  window: {},
  navigator: {},
  location: { search: "" },
  document: { getElementById: () => null, querySelector: () => null, addEventListener: () => {}, createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, setAttribute() {} }) },
  performance: { now: () => 0 },
  setTimeout: () => 0,
  requestAnimationFrame: () => 0,
  Math, console,
};
vm.createContext(ctx);
// sim-core.js defines T82 (the engine namespace); app.js reads it at load time,
// so the core must be evaluated into the sandbox first or app.js throws on line 1.
vm.runInContext(core, ctx);
vm.runInContext(code, ctx);

let pass = 0, fail = 0;
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log((ok ? "PASS" : "FAIL") + "  " + name + (ok ? "" : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`));
}
function approx(name, got, want, tol = 1e-9) {
  const ok = Math.abs(got - want) < tol;
  ok ? pass++ : fail++;
  console.log((ok ? "PASS" : "FAIL") + "  " + name + (ok ? "" : `  got=${got} want=${want}`));
}

// ---------- fake dataset ----------
const cols = ["name","season","team","pos","bpm_star","port","usage","sp","rim","pm","ppg","mp","rpg","apg","spg","bpg","g_pct","f_pct","c_pct","dbpm","ht","obpm"];
const I = {}; cols.forEach((c, i) => (I[c] = i));
function row(name, season, o = {}) {
  const r = new Array(cols.length).fill(0);
  r[I.name] = name; r[I.season] = season; r[I.team] = "TST";
  r[I.bpm_star] = o.bpm ?? 2; r[I.usage] = 20; r[I.mp] = 2000;
  r[I.g_pct] = o.g ?? 0; r[I.f_pct] = o.f ?? 0; r[I.c_pct] = o.c ?? 0;
  return r;
}
const rows = {
  pg91:   row("PG Man", 1991, { g: 100 }),
  pg95:   row("PG Man", 1995, { g: 100 }),
  wing91: row("Wing Guy", 1991, { g: 100 }),
  wing94: row("Wing Guy", 1994, { f: 100 }),
  big92:  row("Big Fella", 1992, { c: 100 }),
  big93:  row("Big Fella", 1993, { f: 100 }),
  tw91:   row("Tweener Nobody", 1991, { g: 15, f: 10, c: 5 }),
  tw93:   row("Tweener Nobody", 1993, { g: 1, f: 2, c: 19 }),
  cmb94:  row("Combo Forward", 1994, { f: 100 }),
  cmb96:  row("Combo Forward", 1996, { c: 100 }),
};
ctx.initDataInput = {
  meta: { cols, scoring: { REPLACEMENT: -2.0, net: "score - 3.98", NET_SD: 12 } },
  franchises: { TESTFR: ["TST"] },
  players: Object.values(rows),
};
vm.runInContext("initData(initDataInput)", ctx);

// ---------- 1. career-wide eligibility ----------
eq("career buckets: '91 guard season of a G+F career -> G/F", ctx.rowBuckets(rows.wing91), ["G", "F"]);
eq("career buckets: '92 center season of a C+F career -> F/C", ctx.rowBuckets(rows.big92), ["F", "C"]);
eq("career buckets: pure PG stays G", ctx.rowBuckets(rows.pg95), ["G"]);
eq("career buckets: sub-threshold career falls back to per-season maxes (G+C)", ctx.rowBuckets(rows.tw91), ["G", "C"]);

// ---------- 2. chargeReroll: 7.5% refund / 7.5% fire sale / 85% nothing ----------
const realRandom = Math.random;
function withRandom(seq, fn) { let q = seq.slice(); Math.random = () => (q.length ? q.shift() : realRandom()); try { return fn(); } finally { Math.random = realRandom; } }

ctx.G = { budget: 50, maxCap: 50, round: 1, fireSale: true, refundFlash: null, fireSaleFlash: null };
withRandom([0.05], () => vm.runInContext('chargeReroll("skipTeam")', ctx));
eq("refund slice (<0.075): budget unchanged", ctx.G.budget, 50);
eq("refund slice: refundFlash set", ctx.G.refundFlash, "skipTeam");
eq("refund slice: a pre-existing fire sale is wiped", ctx.G.fireSale, false);

ctx.G = { budget: 50, maxCap: 50, round: 1, fireSale: false, refundFlash: null, fireSaleFlash: null };
withRandom([0.10], () => vm.runInContext('chargeReroll("rerollYears")', ctx));
eq("fire-sale slice (0.075-0.15): $1 charged", ctx.G.budget, 49);
eq("fire-sale slice: fireSale active", ctx.G.fireSale, true);
eq("fire-sale slice: flash flagged", ctx.G.fireSaleFlash, "rerollYears");

ctx.G = { budget: 50, maxCap: 50, round: 1, fireSale: false, refundFlash: null, fireSaleFlash: null };
withRandom([0.5], () => vm.runInContext('chargeReroll("skipEra")', ctx));
eq("plain slice (>=0.15): $1 charged, no bonus", [ctx.G.budget, ctx.G.fireSale, ctx.G.refundFlash], [49, false, null]);

ctx.G = { budget: 5, maxCap: 50, round: 1, fireSale: false };
const blocked = vm.runInContext('chargeReroll("skipTeam")', ctx);
eq("reroll blocked when it would strand a pick", [blocked, ctx.G.budget], [false, 5]);

// ---------- 3. effCost: -$2 during fire sale, $1 floor ----------
ctx.G = { costByName: { A: 5, B: 1, C: 2 }, fireSale: false };
eq("effCost no sale", ctx.effCost("A"), 5);
ctx.G.fireSale = true;
eq("effCost sale: $5 -> $3", ctx.effCost("A"), 3);
eq("effCost sale: $1 floors at $1", ctx.effCost("B"), 1);
eq("effCost sale: $2 floors at $1", ctx.effCost("C"), 1);
eq("effCost unknown name -> null", ctx.effCost("Z"), null);

// ---------- 4. capRoll bargain decay ----------
const bargain = (decay) => withRandom([0.6, 0.5], () => ctx.capRoll(decay)); // forces the bargain branch, mid draw
approx("bargain decay 1.0 (fresh board): full discount mult", bargain(1), 0.675);
approx("bargain decay 0.65 (1 reroll): shallower discount", bargain(0.65), 1 - 0.325 * 0.65);
approx("bargain decay 0.4225 (2 rerolls): shallower still", bargain(0.4225), 1 - 0.325 * 0.4225);
approx("bargain decay 0 (limit): fair price", bargain(0), 1);
const gouge1 = withRandom([0.9, 0.5], () => ctx.capRoll(1));
const gouge0 = withRandom([0.9, 0.5], () => ctx.capRoll(0));
approx("rip-off band untouched by decay", gouge1, gouge0);

// ---------- 5. lineup move / swap legality and state ----------
ctx.G = {
  picks: [
    { row: rows.pg91, slot: "G" },
    { row: rows.wing94, slot: "F" },
    { row: rows.big92, slot: "C" },
  ],
  filled: { G: 1, F: 1, C: 1 },
  drafted: new Set(), moveIdx: null, selected: null, yearByName: {}, round: 3,
};
let t = ctx.swapTargetsFor(1); // Wing Guy (G/F career) at F
eq("Wing@F: open G is a legal move", t.open, { G: true });
eq("Wing@F: no legal player swaps (PG can't play F, Big can't... Wing can't play C)", t.picks, {});
eq("PG@G has zero legal moves (quiet ⇄ hidden)", ctx.pickHasMoves(0), false);
t = ctx.swapTargetsFor(2); // Big Fella (F/C) at C
eq("Big@C: open F is a legal move", t.open, { F: true });

ctx.doLineupMove(2, "F");
eq("move Big C->F: slot updated", ctx.G.picks[2].slot, "F");
eq("move Big C->F: filled counts follow", ctx.G.filled, { G: 1, F: 2, C: 0 });
eq("move clears the selection state", ctx.G.moveIdx, null);

ctx.G.picks.push({ row: rows.cmb96, slot: "C" }); // Combo Forward (F/C) at C
ctx.G.filled.C = 1;
t = ctx.swapTargetsFor(2); // Big (F/C) now at F
eq("Big@F <-> Combo@C is a legal two-way swap", t.picks, { 3: true });
ctx.doLineupSwap(2, 3);
eq("swap: slots exchanged", [ctx.G.picks[2].slot, ctx.G.picks[3].slot], ["C", "F"]);
eq("swap: filled counts unchanged", ctx.G.filled, { G: 1, F: 2, C: 1 });

// ---------- 6. clutch gate + animations flag ----------
eq("FORCE_CLUTCH off with clean URL", ctx.FORCE_CLUTCH, false);
eq("prefersReduce forced false (Windows fix)", ctx.prefersReduce(), false);
eq("reducedMotion forced false (Windows fix)", ctx.reducedMotion(), false);
eq("clutch threshold value is 81", ctx.CFG.GAMES_IN_SEASON - 1, 81);

// ---------- 7. crest load-race regression ----------
// simulate crests.json winning the race: merge logos FIRST, then run initData
ctx.CRESTS.TESTKEY = "data:image/webp;base64,abc";
ctx.CREST_POOL = ["decoy"];
vm.runInContext("initData(initDataInput)", ctx);   // site_data has NO crests key
eq("initData without crests must NOT wipe pre-merged logos", ctx.CRESTS.TESTKEY, "data:image/webp;base64,abc");
eq("initData resets the decoy pool", ctx.CREST_POOL, null);
ctx.initDataInput.crests = { INLINE: "data:x" };
vm.runInContext("initData(initDataInput)", ctx);   // legacy inline crests still merge
eq("initData WITH crests merges without losing earlier ones", [ctx.CRESTS.TESTKEY, ctx.CRESTS.INLINE], ["data:image/webp;base64,abc", "data:x"]);
delete ctx.initDataInput.crests;
ctx.G = null;
eq("refreshTicketArt: safe with no game", (ctx.refreshTicketArt(), "ok"), "ok");
ctx.G = { screen: "results", cur: { fr: "TESTFR", dec: 1990 } };
eq("refreshTicketArt: safe off the draft screen", (ctx.refreshTicketArt(), "ok"), "ok");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
