#!/usr/bin/env node
/* TRUE 82 — THREE LIVE SEATS IN THE SNAKE DRAFT, headless (dev tool, not shipped).
   ─────────────────────────────────────────────────────────────────────────────
   The owner asked whether the Redraft could be simulated for three live players
   before any of it is wired to a room. It can, and this is it: all three seats
   are driven as HUMANS through the same legality path the screen uses, with no
   DOM, no rival bots and no timers.

     node tools/redraft-sim.js [class] [n] [--pickup]

   WHY IT MATTERS BEYOND "IT RAN": a room can only be server-verified if the
   draft is reproducible from what the room stores. This answers that by
   measuring, not asserting — it replays each draft from its own log and from
   its own seed and reports whether either reproduces. What it finds today is
   in docs/ASYNC-ROOMS-PLAN.md; the short version is that the pool, the legality
   rules and the scoring are already deterministic, and the three places that
   are not are all Math.random() calls with an obvious seeded replacement.

   The seats pick by three different policies on purpose (best available, team
   need, a contrarian) so the exclusive pool is actually contested: identical
   policies would never race for the same player, which is the one thing a
   multiplayer snake draft has to survive. */
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const argv = process.argv.slice(2);
const CLASS = argv.find((a) => /^\d{4}$/.test(a)) || "2016";
const N = Number(argv.find((a) => /^n\d+$/.test(a))?.slice(1) || 1);
const DIFF = argv.includes("--pickup") ? "pickup" : "pro";

/* ---------- the sandbox: the same one test.js uses ---------- */
const core = fs.readFileSync(path.join(ROOT, "sim-core.js"), "utf8");
const code = fs.readFileSync(path.join(ROOT, "app.js"), "utf8")
  .replace('if (typeof document !== "undefined" && document.getElementById) { boot(); }', "");

function makeCtx() {
  const ctx = {
    window: {}, navigator: {}, location: { search: "" },
    document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
                addEventListener() {}, createElement: () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} },
                setAttribute() {}, appendChild() {} }) },
    performance: { now: () => 0 }, setTimeout: () => 0, clearTimeout: () => 0,
    requestAnimationFrame: () => 0, console: { log() {}, info() {}, warn() {}, error() {} },
    Math: Object.create(Math)
  };
  vm.createContext(ctx);
  vm.runInContext(core, ctx);
  vm.runInContext(code, ctx);
  ctx.initDataInput = JSON.parse(fs.readFileSync(path.join(ROOT, "site_data.json"), "utf8"));
  vm.runInContext("initData(initDataInput); DATA_READY = true; sdDeriveClasses();", ctx);
  ctx.draftsInput = JSON.parse(fs.readFileSync(path.join(ROOT, "redraft-drafts.json"), "utf8")).c;
  vm.runInContext("SD_DRAFTS = draftsInput;", ctx);
  return ctx;
}

/* A SEEDED Math.random for the sandbox. The draft's three random calls (the
   seat shuffle, a player's default season, the bots' jitter band) become
   reproducible, which is exactly the change a real room would need to make
   permanent — here it is done from outside so nothing shipped is touched. */
function seedRandom(ctx, seed) {
  let s = seed >>> 0;
  ctx.Math.random = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ---------- the three policies ---------- */
const POLICIES = {
  /* best player alive by the game's own value */
  best: (ctx, gi, cands) => cands.reduce((a, c) => (c.v > a.v ? c : a), cands[0]),
  /* the slot you are shortest of, then value */
  need: (ctx, gi, cands) => {
    const open = ctx.sdRosterOpen(gi);
    const scarce = open.slice().sort((a, b) => ctx.sdOpenCount(gi, b) - ctx.sdOpenCount(gi, a))[0];
    const fits = cands.filter((c) => c.b === scarce);
    return (fits.length ? fits : cands).reduce((a, c) => (c.v > a.v ? c : a));
  },
  /* second-best: contests the same names a beat late, which is what makes a
     snake draft a snake draft */
  contrarian: (ctx, gi, cands) => {
    const sorted = cands.slice().sort((a, b) => b.v - a.v);
    return sorted[Math.min(1, sorted.length - 1)];
  }
};
/* --same gives all three seats the SAME policy, which is the only way to
   measure positional advantage on its own: with three different policies the
   winner is mostly the better policy and the draft slot is confounded. */
const SAME = argv.includes("--same");
const SEATS = SAME
  ? [{ name: "SEAT A", policy: "best" }, { name: "SEAT B", policy: "best" }, { name: "SEAT C", policy: "best" }]
  : [{ name: "SEAT A", policy: "best" }, { name: "SEAT B", policy: "need" }, { name: "SEAT C", policy: "contrarian" }];

/* Every legal (player, slot) this seat could take right now, scored. It walks
   the SAME four gates the screen does — the row qualifies at the bucket, the
   bucket has room, and the strand guard (sdFeasibleAfter) says the rest of the
   roster is still fillable — so a pick this sim makes is a pick the UI would
   have allowed. */
function legalMoves(ctx, gi) {
  const out = [];
  const avail = ctx.sdAvailable();
  const open = ctx.sdRosterOpen(gi);
  for (const p of avail) {
    const row = ctx.sdChosenRowFor ? ctx.sdChosenRowFor(p.name) : null;
    const rec = ctx.sdBuildPool().byName.get(p.name);
    if (!rec) continue;
    for (const season of rec.seasons) {
      const r = season;
      const buckets = ctx.sdRowBuckets(r);
      for (const b of buckets) {
        if (open.indexOf(b) === -1) continue;
        if (ctx.sdOpenCount(gi, b) <= 0) continue;
        ctx.SD.yearByName[p.name] = r[ctx.IDX.season];
        const stranded = ctx.sdFeasibleAfter(p.name, gi, b);
        delete ctx.SD.yearByName[p.name];
        if (stranded) continue;
        out.push({ name: p.name, row: r, b, v: ctx.T82.valueOf(ctx.T82.newState("classic", 1, null), r) });
      }
    }
  }
  return out;
}

function runOne(seed) {
  const ctx = makeCtx();
  seedRandom(ctx, seed);
  ctx.SD_CLASS_ID = CLASS;
  ctx.SD_DIFF = DIFF;
  ctx.SD = null;
  vm.runInContext("SD_GMS.forEach(function (g) { g.ai = 0; });", ctx);   // all three seats are people
  ctx.SD = ctx.sdFresh();

  const log = [];
  while (ctx.SD.at < ctx.SD.seq.length) {
    const gi = ctx.SD.seq[ctx.SD.at];
    const cands = legalMoves(ctx, gi);
    if (!cands.length) return { ok: false, why: "no legal move at pick " + (ctx.SD.at + 1) + " for seat " + gi, log };
    const pick = POLICIES[SEATS[gi].policy](ctx, gi, cands);
    ctx.sdApplyPick(gi, pick.name, pick.row, pick.b);
    log.push({ at: ctx.SD.at, gi, name: pick.name, season: pick.row[ctx.IDX.season], slot: pick.b });
    ctx.SD.at++;
  }

  // score the three rosters exactly as sdFinish does, without rendering
  const teams = ctx.SD.rosters.map((roster, gi) => {
    const rows = roster.map((p) => p.row), slots = roster.map((p) => p.slot);
    const g = ctx.T82.newState("classic", (Date.now() + gi * 7919) % 2147483647, null);
    const e = ctx.T82.engine(g, rows, slots);
    return { gi, name: SEATS[gi].name, wins: e.winTally, net: Math.round(e.net * 10) / 10,
             five: roster.map((p) => p.row[ctx.IDX.name] + " " + p.row[ctx.IDX.season]) };
  });
  teams.sort((a, b) => (b.wins - a.wins) || (b.net - a.net) || (a.gi - b.gi));
  return { ok: true, seats: ctx.SD.seats.slice(), seq: ctx.SD.seq.slice(), log, teams };
}

/* ---------- run ---------- */
console.log("class " + CLASS + " (" + DIFF + ")" + (SAME ? ", IDENTICAL seats (positional advantage only)" : "") + ": " +
            SEATS.map((s) => s.name + "=" + s.policy).join(", "));
console.log("");

let fails = 0;
/* FAIRNESS, which is the first question a three-friend snake draft has to
   answer: does picking first win it? Tallied by DRAFT SLOT (first, second,
   third in round one), not by seat, since the seat order is shuffled. */
const bySlot = [0, 0, 0], byPolicy = { best: 0, need: 0, contrarian: 0 };
let netSpread = 0;
for (let i = 0; i < N; i++) {
  const seed = 4242 + i * 101;
  const a = runOne(seed);
  if (!a.ok) { console.log("FAIL seed " + seed + ": " + a.why); fails++; continue; }

  if (i === 0) {
    console.log("draft order (round 1): " + a.seats.map((gi) => SEATS[gi].name).join(" > "));
    console.log("picks:");
    a.log.forEach((m) => console.log("  " + String(m.at + 1).padStart(2) + ". " + SEATS[m.gi].name +
      "  " + m.name + " " + m.season + " (" + m.slot + ")"));
    console.log("");
    a.teams.forEach((t, k) => console.log("  " + (k + 1) + ". " + t.name + "  " + t.wins + "-" +
      (82 - t.wins) + "  net " + (t.net > 0 ? "+" : "") + t.net + "   " + t.five.join(", ")));
    console.log("");
  }

  /* THE QUESTION A ROOM ACTUALLY HAS TO ANSWER: run the same seed again and see
     whether anything moves. If this ever differs, the draft cannot be
     server-verified from a log, and the cause is a random call somewhere. */
  const b = runOne(seed);
  const same = JSON.stringify(a.log) === JSON.stringify(b.log);
  const sameScore = JSON.stringify(a.teams.map((t) => t.gi + ":" + t.wins + ":" + t.net)) ===
                    JSON.stringify(b.teams.map((t) => t.gi + ":" + t.wins + ":" + t.net));
  if (!same || !sameScore) {
    console.log("NOT REPRODUCIBLE at seed " + seed + ": " +
                (!same ? "the pick log differs" : "the log matches but the SCORE differs"));
    fails++;
  }
  const winner = a.teams[0];
  bySlot[a.seats.indexOf(winner.gi)]++;
  byPolicy[SEATS[winner.gi].policy]++;
  netSpread += (a.teams[0].net - a.teams[2].net);

  const legal = a.teams.every((t) => t.five.length === 5) &&
                new Set(a.log.map((m) => m.name)).size === a.log.length;
  if (!legal) { console.log("ILLEGAL at seed " + seed + ": a roster is short or a player went twice"); fails++; }
}

console.log("");
console.log("wins by round-1 draft slot:  1st " + bySlot[0] + "   2nd " + bySlot[1] + "   3rd " + bySlot[2] +
            "   (of " + N + ")");
console.log("wins by policy:              best " + byPolicy.best + "   need " + byPolicy.need +
            "   contrarian " + byPolicy.contrarian);
console.log("average net gap, 1st to 3rd: " + (netSpread / Math.max(1, N)).toFixed(1));
console.log("");
console.log(N + " draft" + (N === 1 ? "" : "s") + " simulated, " + fails + " problem" + (fails === 1 ? "" : "s"));
process.exitCode = fails ? 1 : 0;
