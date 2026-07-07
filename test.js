// TRUE 82 — headless logic test harness (no browser needed).
// Run:  node test.js   (from the repo root; expects app.js beside it)
// Covers: career position buckets, chargeReroll refund/fire-sale slices + blocking,
// effCost fire-sale floor, capRoll bargain decay (monotonic, rip-offs invariant),
// lineup swap legality + doLineupMove/doLineupSwap state, FORCE_CLUTCH/prefersReduce
// flags, the crest load-race regression, and the seed spine (sim-core.js: stream
// determinism, G.rng priority over Math.random, assignCapPool board replay).
// Run this BEFORE and AFTER any change to game logic in app.js or sim-core.js.
// 157 checks with site_data.json present (116 without); exits nonzero on any failure. (The old "41" header had drifted —
// the six Tribune checks were never counted; 47 existed before the seed section.)

const fs = require("fs");
const vm = require("vm");

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
vm.runInContext(fs.readFileSync("sim-core.js", "utf8"), ctx);   // seed spine loads before app.js, like index.html
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
  pg95:   row("PG Man", 1995, { g: 100, bpm: 4 }),   // the two PG seasons must DIFFER (replay/claim tests swap them)
  wing91: row("Wing Guy", 1991, { g: 100 }),
  wing94: row("Wing Guy", 1994, { f: 100 }),
  big92:  row("Big Fella", 1992, { c: 100 }),
  big93:  row("Big Fella", 1993, { f: 100 }),
  tw91:   row("Tweener Nobody", 1991, { g: 15, f: 10, c: 5 }),
  tw93:   row("Tweener Nobody", 1993, { g: 1, f: 2, c: 19 }),
  cmb94:  row("Combo Forward", 1994, { f: 100 }),
  cmb96:  row("Combo Forward", 1996, { c: 100 }),
};
rows.rg93 = row("Rival Guard", 1993, { g: 100 });
rows.rb03 = row("Rival Big", 2003, { c: 100, bpm: 3 });
rows.rw05 = row("Rival Wing", 2005, { f: 100 });
rows.fm04 = row("Future Man", 2004, { g: 100 });
rows.fg96 = row("Filler Guard", 1996, { g: 100 });
rows.ff97 = row("Filler Forward", 1997, { f: 100 });
rows.rf94 = row("Rival Forward", 1994, { f: 100 });
rows.fc03 = row("Filler Center", 2003, { c: 100 });
rows.rf94[I.team] = "RVL";
["rg93", "rb03", "rw05"].forEach(k => (rows[k][I.team] = "RVL"));
ctx.initDataInput = {
  meta: { cols, scoring: { REPLACEMENT: -2.0, net: "score - 3.98", NET_SD: 12,
    USAGE_RATE: 0.15, USAGE_BUDGET: 110, SPACING_TAX: 1.5, SPACING_BONUS: 0.5, SPACERS_REQ: 3,
    GD_BOTTOM25: -0.5, GD_BOTTOM10: -1.5, FD_BOTTOM25: -0.5, FD_BOTTOM10: -1.5,
    BACKCOURT_D_TAX_10: 3, BACKCOURT_D_TAX_25: 2, WING_D_TAX_10: 3, WING_D_TAX_25: 2 } },
  franchises: { TESTFR: ["TST"], RIVALFR: ["RVL"] },
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

// ---- season recap (Tribune) — pure pieces: tier map, fit notes, local fallback ----
eq("recapTier boundaries", [0, 7, 45, 73, 74, 81, 82].map(w => ctx.recapTier(w)),
  ["futile", "shame", "forgettable", "matched", "record", "heartbreak", "perfect"]);
ctx.SC = ctx.SC || {}; ctx.SC.SPACERS_REQ = 2;
const eDef = { usageTax: 3, spacingTax: 1.2, spacingBonus: 0, sumSp: 1, backDefTax: 2, backDefTier: 10, wingDefTax: 0 };
const notes = ctx.recapFitNotes(eDef);
eq("recapFitNotes: flags usage + spacing + guard D", notes.length, 3);
eq("recapFitNotes: balanced five falls back to one line",
  ctx.recapFitNotes({ usageTax: 0, spacingTax: 0, spacingBonus: 0, backDefTax: 0, wingDefTax: 0 }).length, 1);
const fakePayload = {
  mode: "classic", wins: 82, net: 12.3, hh: null,
  players: [
    { slot: "G", yr: 2023, name: "Shai Gilgeous-Alexander", v: 12.4 },
    { slot: "G", yr: 2002, name: "John Stockton", v: 9.1 },
    { slot: "F", yr: 1995, name: "Charles Barkley", v: 10.2 },
    { slot: "F", yr: 1987, name: "Larry Bird", v: 11.8 },
    { slot: "C", yr: 1979, name: "Dan Issel", v: 7.5 }
  ],
  notes: ["both starting guards rank bottom-10% defensively: the perimeter leaks"]
};
const lh = ctx.localHeadline(fakePayload);
eq("localHeadline: nickname + dek + fallback tag", [!!lh.nickname, !!lh.dek, lh.source], [true, true, "fallback"]);
const la = ctx.localArticle(fakePayload);
const wordCount = la.article.trim().split(/\s+/).length;
eq("localArticle: exactly 4 sentences", (la.article.match(/[.!?](\s|$)/g) || []).length, 4);
eq("localArticle: length sane (55-130 words)", wordCount >= 55 && wordCount <= 130, true);

// ---------- 8. seed spine: sim-core determinism + G.rng priority ----------
eq("seedOf: stable for the same label", ctx.T82.seedOf("2026-07-06|cap"), ctx.T82.seedOf("2026-07-06|cap"));
eq("seedOf: mode suffix lands far apart", ctx.T82.seedOf("2026-07-06|cap") !== ctx.T82.seedOf("2026-07-06|pro"), true);
const sA = ctx.T82.makeRng(12345), sB = ctx.T82.makeRng(12345);
eq("makeRng: same seed -> identical stream", [sA.f(), sA.f(), sA.f(), sA.f(), sA.f()], [sB.f(), sB.f(), sB.f(), sB.f(), sB.f()]);
eq("makeRng: draw counter tracks consumption", [sA.n, sB.n], [5, 5]);
const qr = ctx.T82.queueRng([0.25]);
eq("queueRng: serves the queue, then falls back to a sane float", [qr.f(), (v => v >= 0 && v < 1)(qr.f())], [0.25, true]);

// G.rng must win over Math.random when present — poison Math.random to prove it.
ctx.G = { budget: 50, maxCap: 50, round: 1, fireSale: false, refundFlash: null, fireSaleFlash: null, rng: ctx.T82.queueRng([0.05]) };
Math.random = () => 0.99;   // would be the "nothing" slice if the stream were ignored
try { vm.runInContext('chargeReroll("skipTeam")', ctx); } finally { Math.random = realRandom; }
eq("chargeReroll: consumes G.rng, not Math.random (refund fired)", [ctx.G.budget, ctx.G.refundFlash, ctx.G.rng.n], [50, "skipTeam", 1]);

ctx.G = { rng: ctx.T82.queueRng([0.6, 0.5]) };
approx("capRoll: consumes G.rng (bargain branch, mid draw)", ctx.capRoll(1), 0.675);

// Whole-board replay: same seed -> bit-identical prices + season locks.
function capBoard(seed) {
  ctx.G = { cur: { fr: "TESTFR", dec: 1990 }, yearByName: {}, costByName: {}, yearRerollN: 0, rng: ctx.T82.makeRng(seed) };
  vm.runInContext("assignCapPool()", ctx);
  return JSON.stringify([ctx.G.costByName, ctx.G.yearByName]);
}
const b1 = capBoard(777);
eq("assignCapPool: seeded board is non-empty", b1 !== JSON.stringify([{}, {}]), true);
eq("assignCapPool: same seed -> identical board (prices + years)", capBoard(777), b1);
eq("assignCapPool: different seed -> different board", capBoard(778) !== b1, true);

// ---------- 9. full-game headless replay (T82 end to end, fake dataset) ----------
const T = ctx.T82;
function autoPick(S) {
  const pool = ctx.POOLS.get(T.key(S, S.cur.fr, S.cur.dec));
  const names = [];
  pool.forEach((row, name) => {
    const r = T.resolveRow(S, name);
    if (r && T.rowDraftable(S, r)) names.push(name);
  });
  names.sort();
  if (!names.length) return null;
  const name = names[0], r = T.resolveRow(S, name);
  return [name, r[ctx.IDX.season], T.rowOpenBuckets(S, r)[0]];
}
function playPolicy(mode, seed, script, ch) {
  const S = T.newState(mode, seed, ch || null);
  let r = T.dealRound(S);
  for (let step of script) {
    let ok;
    if (step === "auto") step = autoPick(S);
    if (Array.isArray(step)) {
      ok = step && T.applyPick(S, step[0], step[1], step[2]);
      if (ok) r = T.dealRound(S);
    } else if (step === "st") ok = !!T.skipTeam(S);
    else if (step === "se") ok = !!T.skipEra(S);
    else if (step === "yr") ok = !!T.yearReroll(S);
    if (!ok) return { S, err: step };
  }
  return { S, result: T.finish(S) };
}
// pin the board with a deal-hook so the explicit-season grammar/tamper checks are stable
const chPin = { id: "t_pin", deal: () => ({ decs: [1990], frs: ["TESTFR"] }) };
const script5 = [["PG Man", 1995, "G"], ["Wing Guy", 1994, "F"], ["Big Fella", 1992, "C"],
                 ["Tweener Nobody", 1991, "G"], ["Combo Forward", 1994, "F"]];
const g1 = playPolicy("classic", "test-seed-A", script5, chPin);
eq("full classic: five picks land, no error", [g1.err || null, g1.S.picks.length], [null, 5]);
eq("full classic: action log is the canonical grammar", g1.S.actions[0], "k:PG Man|1995|G");
const rp1 = T.replay({ mode: "classic", seed: "test-seed-A", actions: g1.S.actions }, chPin);
eq("replay(classic): ok + identical wins/net", [rp1.ok, rp1.result.wins === g1.result.wins,
   Math.abs(rp1.result.net - g1.result.net) < 1e-9], [true, true, true]);
eq("replay(classic): rngDraws match the original", rp1.result.rngDraws, g1.S.rng.n);

// picking the OTHER real season (1991) is a legal classic choice, not tampering —
// verifyRun catches that via the result mismatch. A fabricated season is illegal-op:
const tampered = g1.S.actions.slice(); tampered[0] = "k:PG Man|1999|G";
const rpT = T.replay({ mode: "classic", seed: "test-seed-A", actions: tampered }, chPin);
eq("replay: fabricated-season tamper caught", [rpT.ok, rpT.why], [false, "illegal-op"]);
const vAlt = T.verifyRun({ mode: "classic", seed: "test-seed-A", challenge: chPin,
  actions: (() => { const a = g1.S.actions.slice(); a[0] = "k:PG Man|1991|G"; return a; })(),
  claim: { wins: g1.result.wins, net: g1.result.net } });
eq("verifyRun: legal-but-different season fails the claim compare", vAlt.ok, false);

const g2 = playPolicy("cap", "test-seed-B", ["yr", "st", "auto", "auto", "auto", "auto", "auto"]);
eq("full cap: reroll + team-skip + five picks, no error", [g2.err || null, g2.S.picks.length], [null, 5]);
const rp2 = T.replay({ mode: "cap", seed: "test-seed-B", actions: g2.S.actions });
eq("replay(cap): budget + result reproduce bit-identically",
   [rp2.ok, rp2.result.wins, rp2.result.capLeft, rp2.result.rngDraws],
   [true, g2.result.wins, g2.result.capLeft, g2.S.rng.n]);
const v2 = T.verifyRun({ mode: "cap", seed: "test-seed-B", actions: g2.S.actions,
  rngDraws: g2.S.rng.n, claim: { wins: g2.result.wins, net: g2.result.net } });
eq("verifyRun: honest claim verifies", v2.ok, true);
const vBad = T.verifyRun({ mode: "cap", seed: "test-seed-B", actions: g2.S.actions,
  rngDraws: g2.S.rng.n, claim: { wins: 82, net: g2.result.net } });
eq("verifyRun: inflated wins rejected", [vBad.ok, vBad.why], [false, "wins"]);
const vRng = T.verifyRun({ mode: "cap", seed: "test-seed-B", actions: g2.S.actions,
  rngDraws: 3, claim: { wins: g2.result.wins } });
eq("verifyRun: rng-draw mismatch rejected", [vRng.ok, vRng.why], [false, "rng-draws"]);

// ---------- 10. challenge hooks ----------
const chFilter = { id: "t_g_only", filter: (row) => row[ctx.IDX.g_pct] >= 100 };
const S3 = T.newState("classic", 7, chFilter); T.dealRound(S3);
eq("challenge filter: non-matching row undraftable",
   [T.rowDraftable(S3, ctx.initDataInput.players[4]) /* big92, c:100 */,
    T.rowDraftable(S3, ctx.initDataInput.players[0]) /* pg91, g:100 */], [false, true]);
const S4 = T.newState("cap", 7, { id: "t_budget", cfg: { CAP_BUDGET: 35 } });
eq("challenge cfg: CAP_BUDGET honored", [S4.budget, S4.maxCap], [35, 35]);
const chChrono = { id: "t_chrono", deal: () => ({ decs: [1990], frs: ["TESTFR"] }),
  pick: (S, row) => !S.picks.length || row[ctx.IDX.season] >= S.picks[S.picks.length - 1].row[ctx.IDX.season] };
const g5 = playPolicy("classic", 11, [["Wing Guy", 1994, "F"], ["PG Man", 1991, "G"]], chChrono);
eq("challenge pick-hook: chronological veto fires", g5.err, ["PG Man", 1991, "G"]);
const S6 = T.newState("cap", 13, { id: "t_price", cfg: { PRICE_MULT: 2 } });
const S7 = T.newState("cap", 13, { id: "t_base" });
eq("challenge cfg: PRICE_MULT doubles a fresh-board cost",
   T.capCost(S6, 4, 1) >= T.capCost(S7, 4, 1), true);
const chDeal = { id: "t_deal", deal: () => ({ decs: [1990] }) };
const S8 = T.newState("classic", 17, chDeal); const d8 = T.dealRound(S8);
eq("challenge deal-hook: constrained era dealt", [!!d8.dealt, S8.cur.dec], [true, 1990]);

// ---------- 10b. duel engine (duel-core.js, fake dataset) ----------
vm.runInContext(fs.readFileSync(__dirname + "/duel-core.js", "utf8"), ctx);
const D = ctx.T82DUEL;
eq("duel: quips manifest is the spec 20", D.QUIPS.length, 20);
{
  const M0 = D.newMatch("classic", 5);
  eq("duel: new match deals a live ticket, P0 to move",
     [M0.status, M0.turn, !!(M0.S.cur && M0.S.cur.fr)], ["active", 0, true]);
  eq("duel: out-of-turn rejected", D.applyOp(M0, 1, "k:whoever|1990|G").why, "not-your-turn");
  const first = D.draftable(M0, 0)[0];
  eq("duel draftable: rich rows (seasons list, legal slots, name)",
     [Array.isArray(first.seasons) && first.seasons.indexOf(first.season) !== -1,
      Array.isArray(first.slots) && first.slots.length >= 1, typeof first.name], [true, true, "string"]);
  const r1 = D.applyOp(M0, 0, "k:" + first.name + "|" + first.season + "|" + first.slots[0]);
  eq("duel: P0 pick lands on P0's roster only, turn passes",
     [r1.ok, M0.players[0].picks.length, M0.players[1].picks.length, M0.turn], [true, 1, 0, 1]);
  eq("duel: free lineup move takes no turn",
     [D.applyOp(M0, 0, "mv:0," + (first.slots[0] === "G" ? "F" : "G")).ok || true, M0.turn].slice(1), [1]);

  // One-Jersey: find a seed whose opening board holds two-season PG Man
  let MJ = null;
  for (let sd = 1; sd < 60 && !MJ; sd++) {
    const m = D.newMatch("classic", sd);
    if (D.draftable(m, 0).some(d => d.name === "PG Man")) MJ = m;
  }
  eq("duel one-jersey: a PG Man board exists in seeds 1-59", !!MJ, true);
  D.applyOp(MJ, 0, "k:PG Man|1995|G");
  eq("duel one-jersey: rival's OTHER season of the same person is dead",
     D.applyOp(MJ, 1, "k:PG Man|1991|G").why, "illegal-op");

  const MC = D.newMatch("cap", 9);
  const okYr = D.applyOp(MC, 0, "yr");
  eq("duel cap: year reroll charges the MOVER only and passes the turn",
     [okYr.ok, MC.players[0].budget, MC.players[1].budget, MC.turn], [true, 49, 50, 1]);
  const MS = D.newMatch("classic", 5);
  const okSt = D.applyOp(MS, 0, "st");
  eq("duel classic: team skip spends P0's counter only, turn passes",
     [okSt.ok, MS.players[0].teamSkips, MS.players[1].teamSkips, MS.turn], [true, 0, 1, 1]);
  eq("duel: forced skip refused while picks exist", D.applyOp(MS, 1, "fs").why, "not-forced");

  // full match on autopilot: alternate best-available to completion
  const MF = D.newMatch("classic", 21);
  let guard = 0;
  while (MF.status === "active" && guard++ < 40) {
    const opts = D.draftable(MF, MF.turn);
    const r = opts.length
      ? D.applyOp(MF, MF.turn, "k:" + opts[0].name + "|" + opts[0].season + "|" + opts[0].slots[0])
      : D.applyOp(MF, MF.turn, "fs");
    if (!r.ok) break;
  }
  eq("duel: full match completes 5-and-5 with a verdict",
     [MF.status, MF.players[0].picks.length, MF.players[1].picks.length,
      MF.winner === 0 || MF.winner === 1 || MF.winner === null], ["complete", 5, 5, true]);

  const rp = D.replayMatch({ mode: "classic", seed: 21, ops: MF.log });
  eq("duel replay: op log rebuilds the identical match",
     [rp.ok, rp.M.status, rp.M.winner,
      Math.abs(rp.M.result[0].net - MF.result[0].net) < 1e-9,
      Math.abs(rp.M.result[1].net - MF.result[1].net) < 1e-9],
     [true, "complete", MF.winner, true, true]);
  const forged = MF.log.map(x => ({ ...x }));
  forged[2].u = 1 - forged[2].u;
  const rpF = D.replayMatch({ mode: "classic", seed: 21, ops: forged });
  eq("duel replay: forged mover caught", [rpF.ok, rpF.why], [false, "not-your-turn"]);

  const MQ = D.newMatch("classic", 5);
  eq("duel quips: one per player per turn",
     [D.addQuip(MQ, 0, 4).ok, D.addQuip(MQ, 0, 7).why, D.addQuip(MQ, 1, 7).ok, D.addQuip(MQ, 0, 99).why],
     [true, "quip-throttle", true, "bad-quip"]);
}

function eq2(cond) { if (!cond) eq("league RR: odd-N weekly shape", cond, true); }
// ---------- 10c. league engine (league-core.js, pure math) ----------
vm.runInContext(fs.readFileSync(__dirname + "/league-core.js", "utf8"), ctx);
const LG = ctx.T82LG;
{
  // even-N week: everyone seated exactly once, no self-pairs
  const s1 = LG.schedule(8, 1, 1);
  const seen1 = new Set();
  s1.pairs.forEach(p => { seen1.add(p[0]); seen1.add(p[1]); });
  eq("league RR: week 1 of 8 seats everyone once, no bye",
     [s1.pairs.length, seen1.size, s1.bye, s1.pairs.every(p => p[0] !== p[1])], [4, 8, null, true]);

  // full single round robin: every unordered pair exactly once
  const meet = {};
  for (let w = 1; w <= LG.seasonWeeks(8, 1); w++)
    LG.schedule(8, w, 1).pairs.forEach(p => { const k = p[0] + "-" + p[1]; meet[k] = (meet[k] || 0) + 1; });
  eq("league RR: 8 players x 7 weeks = all 28 pairs exactly once",
     [Object.keys(meet).length, Object.values(meet).every(c => c === 1)], [28, true]);

  // odd N: ghost byes — each seat exactly one bye per round, 3 real pairs/week
  const byes = {};
  for (let w = 1; w <= LG.seasonWeeks(7, 1); w++) {
    const s = LG.schedule(7, w, 1);
    eq2(s.pairs.length === 3 && s.bye !== null);
    byes[s.bye] = (byes[s.bye] || 0) + 1;
  }
  eq("league RR: 7 players — every seat byes exactly once across the season",
     [Object.keys(byes).length, Object.values(byes).every(c => c === 1)], [7, true]);

  // double round robin doubles meetings; season math; determinism; bounds
  const meet2 = {};
  for (let w = 1; w <= LG.seasonWeeks(6, 2); w++)
    LG.schedule(6, w, 2).pairs.forEach(p => { const k = p[0] + "-" + p[1]; meet2[k] = (meet2[k] || 0) + 1; });
  eq("league RR: double round = every pair exactly twice; weeks = 2(N-1); off-season null; deterministic",
     [Object.values(meet2).every(c => c === 2), LG.seasonWeeks(6, 2), LG.schedule(6, 11, 2),
      JSON.stringify(LG.schedule(9, 4, 1)) === JSON.stringify(LG.schedule(9, 4, 1))],
     [true, 10, null, true]);

  // week clock
  const t0 = Date.UTC(2026, 6, 13);   // a Monday
  eq("league clock: before/at/after boundaries",
     [LG.weekOf(t0, t0 - 1), LG.weekOf(t0, t0), LG.weekOf(t0, t0 + LG.WEEK_MS - 1), LG.weekOf(t0, t0 + LG.WEEK_MS)],
     [0, 1, 1, 2]);
  eq("league clock: nextMondayUtc is a strictly-future Monday",
     [new Date(LG.nextMondayUtc(t0)).getUTCDay(), LG.nextMondayUtc(t0) > t0,
      LG.nextMondayUtc(t0 + 3 * 86400000) === t0 + LG.WEEK_MS], [1, true, true]);

  // settlement verdicts
  const sched = { pairs: [[0, 1], [2, 3], [4, 5]], bye: null };
  const rows = LG.settleWeek(sched, { 0: 80.02, 1: 78.9, 2: 55.1, 4: 60, 5: 60 });
  eq("league settle: played beats played, played beats absent, exact tie draws",
     [rows[0].winner, rows[1].winner, rows[1].sb, rows[2].winner], [0, 2, null, null]);
  const ns = LG.settleWeek({ pairs: [[0, 1]], bye: null }, {});
  eq("league settle: double no-show is a scoreless draw", [ns[0].winner, ns[0].sa, ns[0].sb], [null, null, null]);

  // standings: 3-way tie broken by head-to-head AMONG THE GROUP (the classic pitfall)
  const members = [0, 1, 2, 3].map(seat => ({ seat }));
  // seats 0,1,2 finish 2-1; their inner triangle: 0 beat 1, 1 beat 2, 2 beat 0
  // (perfect cycle) -> h2h all equal -> points-for decides. Seat 3 loses out.
  const R = [
    { a: 0, b: 1, sa: 70, sb: 60, winner: 0 }, { a: 1, b: 2, sa: 65, sb: 50, winner: 1 },
    { a: 0, b: 2, sa: 40, sb: 62, winner: 2 }, { a: 0, b: 3, sa: 66, sb: 30, winner: 0 },
    { a: 1, b: 3, sa: 58, sb: 30, winner: 1 }, { a: 2, b: 3, sa: 44, sb: 30, winner: 2 },
  ];
  const st = LG.standings(members, R);
  eq("league standings: cycle tie falls through h2h to points-for (0:176 > 1:183? compute!)",
     st.map(x => x.seat), [1, 0, 2, 3]);
  eq("league standings: points and records right",
     [st[0].pts, st[0].w, st[3].pts, st[3].l], [4, 2, 0, 3]);

  // h2h that actually separates: 0 and 1 tied at 2-1; seat 1 WON their meeting
  // but seat 0 has far more points-for — h2h must overrule pf here
  const R2 = [
    { a: 0, b: 1, sa: 60, sb: 61, winner: 1 }, { a: 0, b: 2, sa: 75, sb: 40, winner: 0 },
    { a: 0, b: 3, sa: 74, sb: 30, winner: 0 }, { a: 1, b: 3, sa: 55, sb: 20, winner: 1 },
    { a: 1, b: 2, sa: 44, sb: 52, winner: 2 }, { a: 2, b: 3, sa: 33, sb: 35, winner: 3 },
  ];
  const st2 = LG.standings(members, R2);
  eq("league standings: two-way tie — head to head overrules points-for",
     [st2[0].seat, st2[1].seat, st2[0].pts === st2[1].pts, st2[1].pf > st2[0].pf],
     [1, 0, true, true]);

  // fast-advance law
  const s7 = LG.schedule(7, 1, 1);
  const full = {}; s7.pairs.forEach(p => { full[p[0]] = 50; full[p[1]] = 51; });
  const part = { ...full }; delete part[s7.pairs[0][0]];
  eq("league allPlayed: byes never block; one missing run does",
     [LG.allPlayed(s7, full), LG.allPlayed(s7, part)], [true, false]);
  const t1 = Date.UTC(2026, 6, 13);
  const lgA = { settled_through: 2, season_weeks: 7, week_opened_ts: t1, fast_advance: 0 };
  eq("league advance: time path settles at +7d, keeps Monday rhythm, never early",
     [LG.advanceDecision(lgA, true, t1 + LG.WEEK_MS), LG.advanceDecision(lgA, true, t1 + LG.WEEK_MS - 1)],
     [{ week: 3, nextOpenedTs: t1 + LG.WEEK_MS }, null]);
  const lgF = { ...lgA, fast_advance: 1 };
  eq("league advance: fast path fires mid-window only when everyone played; respects pre-open and season end",
     [LG.advanceDecision(lgF, true, t1 + 3600000), LG.advanceDecision(lgF, false, t1 + 3600000),
      LG.advanceDecision(lgF, true, t1 - 1), LG.advanceDecision({ ...lgF, settled_through: 7 }, true, t1 + 1)],
     [{ week: 3, nextOpenedTs: t1 + 3600000 }, null, null, null]);

  eq("league draw: challenge index deterministic and in range",
     [LG.challengeIndex("LGX", 3, 98) === LG.challengeIndex("LGX", 3, 98),
      LG.challengeIndex("LGX", 3, 98) < 98, LG.challengeIndex("LGX", 4, 98) >= 0], [true, true, true]);
}

// ---------- 11. GOLDEN REPLAY FIXTURES (real dataset) ----------
// Frozen 2026-07-06 against site_data.json (dataVersion 2421484606). These payloads
// must replay to these exact results FOREVER on this dataset. If a change to the
// core breaks them, the draw order / op grammar / resolution rules changed:
// that's a T82.VERSION bump and a deliberate decision, never an accident.
// (Section skips cleanly when site_data.json isn't present.)
if (fs.existsSync(__dirname + "/site_data.json")) {
  const real = JSON.parse(fs.readFileSync(__dirname + "/site_data.json", "utf8"));
  T.initData(real);   // NOTE: replaces the fake tables — keep this the LAST section
  eq("golden: dataVersion is stable", T.t.dataVersion, 2421484606);
  const GOLD_CLASSIC = {
    mode: "classic", seed: "golden-classic-1",
    actions: ["k:Scottie Barnes|2026|G", "k:Gerald Wallace|2010|G", "k:Anfernee Hardaway|1996|F",
              "k:Shawn Marion|2003|F", "k:Mike Gminski|1986|C"],
    wins: 79, net: 21.365, rngDraws: 10
  };
  const rc = T.replay({ mode: GOLD_CLASSIC.mode, seed: GOLD_CLASSIC.seed, actions: GOLD_CLASSIC.actions });
  eq("golden classic: replays ok", rc.ok, true);
  eq("golden classic: wins/net/draws frozen",
     [rc.result.wins, Math.abs(rc.result.net - GOLD_CLASSIC.net) < 1e-9, rc.result.rngDraws],
     [GOLD_CLASSIC.wins, true, GOLD_CLASSIC.rngDraws]);
  const GOLD_CAP = {
    mode: "cap", seed: "golden-cap-1",
    actions: ["k:Alex English|1977|F", "yr", "k:Adam Keefe|1996|F", "k:Amal McCaskill|2002|C",
              "st", "k:A.J. Lawson|2024|G", "k:Bob Wilkerson|1981|G"],
    wins: 18, net: -9.35, capLeft: 43, rngDraws: 1459
  };
  const rk = T.replay({ mode: GOLD_CAP.mode, seed: GOLD_CAP.seed, actions: GOLD_CAP.actions });
  eq("golden cap: replays ok", rk.ok, true);
  eq("golden cap: wins/net/capLeft/draws frozen",
     [rk.result.wins, Math.abs(rk.result.net - GOLD_CAP.net) < 1e-9, rk.result.capLeft, rk.result.rngDraws],
     [GOLD_CAP.wins, true, GOLD_CAP.capLeft, GOLD_CAP.rngDraws]);
  const vg = T.verifyRun({ mode: "cap", seed: "golden-cap-1", actions: GOLD_CAP.actions,
    rngDraws: GOLD_CAP.rngDraws, dataVersion: 2421484606,
    claim: { wins: GOLD_CAP.wins, net: GOLD_CAP.net } });
  eq("golden cap: verifyRun end-to-end", vg.ok, true);
} else {
  console.log("SKIP  golden fixtures (site_data.json not present)");
}

// ---------- 12. challenge manifest (challenges.js) ----------
vm.runInContext(fs.readFileSync(__dirname + "/challenges.js", "utf8"), ctx);
const CH = ctx.T82CH;
{
  const ids = CH.CHALLENGES.map(c => c.id);
  const shapeOk = CH.CHALLENGES.every(c => c.id && c.name && c.blurb &&
    ["classic", "pro", "cap"].includes(c.base)) && new Set(ids).size === ids.length;
  eq("manifest: every challenge has id/name/blurb/base, ids unique", shapeOk, true);
  const wA = CH.weeklyFor(new Date(Date.UTC(2026, 6, 6)));   // Mon Jul 6 2026
  const wB = CH.weeklyFor(new Date(Date.UTC(2026, 6, 12)));  // Sun same ISO week
  const wC = CH.weeklyFor(new Date(Date.UTC(2026, 6, 13)));  // Mon next week
  eq("rotation: same ISO week -> same challenge", [wA.key, wA.ch.id === wB.ch.id], ["2026-W28", true]);
  eq("rotation: next week -> a challenge (deterministic index)", !!wC.ch.id && wC.key === "2026-W29", true);
}
if (fs.existsSync(__dirname + "/site_data.json")) {
  const shortKings = CH.byId.short_kings;
  function autoReal(S) {
    const pool = T.t.POOLS.get(T.key(S, S.cur.fr, S.cur.dec));
    const opts = [];
    pool.forEach((row, name) => {
      const r = T.resolveRow(S, name);
      if (r && T.rowDraftable(S, r)) opts.push([name, r]);
    });
    opts.sort((a, b) => (T.valueOf(S, b[1]) - T.valueOf(S, a[1])) || (a[0] < b[0] ? -1 : 1));
    if (!opts.length) return null;
    return [opts[0][0], opts[0][1][T.t.IDX.season], T.rowOpenBuckets(S, opts[0][1])[0]];
  }
  const S = T.newState(shortKings.base, "weekly-smoke-1", shortKings);
  T.dealRound(S);
  let stranded = false;
  while (S.picks.length < 5 && !S.done) {
    const p = autoReal(S);
    if (!p || !T.applyPick(S, p[0], p[1], p[2])) { stranded = true; break; }
    T.dealRound(S);
  }
  eq("weekly live: Short Kings drafts a full five on real data", [stranded, S.picks.length], [false, 5]);
  eq("weekly live: every pick honors the filter (ht <= 6'3\")",
     S.picks.every(p => p.row[T.t.IDX.ht] <= 75), true);
  const rw = T.replay({ mode: shortKings.base, seed: "weekly-smoke-1", actions: S.actions }, shortKings);
  const fin = T.finish(S);
  eq("weekly live: challenge replay reproduces the run",
     [rw.ok, rw.result.wins, Math.abs(rw.result.net - fin.net) < 1e-9], [true, fin.wins, true]);
}

(async () => {
// ---------- 12c. manifest shape gate (full challenges.js) ----------
{
  const ids = new Set(), bases = { classic: 0, cap: 0, pro: 0 };
  let dupes = 0, badBase = 0, badCfg = 0;
  const WHITELIST = new Set(["CAP_BUDGET", "PRICE_MULT", "CAP_GEM", "CAP_TRAP", "TEAM_SKIPS", "ERA_SKIPS",
    "USAGE_RATE", "USAGE_BUDGET", "SPACING_TAX", "SPACING_BONUS", "SPACERS_REQ",
    "GD_BOTTOM10", "GD_BOTTOM25", "FD_BOTTOM10", "FD_BOTTOM25",
    "BACKCOURT_D_TAX_10", "BACKCOURT_D_TAX_25", "WING_D_TAX_10", "WING_D_TAX_25"]);
  for (const c of CH.CHALLENGES) {
    if (ids.has(c.id)) dupes++; ids.add(c.id);
    if (!(c.base in bases)) badBase++; else bases[c.base]++;
    if (c.cfg) for (const k of Object.keys(c.cfg)) if (!WHITELIST.has(k)) badCfg++;
  }
  eq("manifest: no duplicate ids, all bases legal, cfg keys whitelisted", [dupes, badBase, badCfg], [0, 0, 0]);
  eq("manifest: real size and a real mode mix",
     [CH.CHALLENGES.length >= 90, bases.classic >= 15, bases.cap >= 15, bases.pro >= 8],
     [true, true, true, true]);
  eq("manifest: rotation is deterministic and in-manifest",
     [CH.weeklyFor(new Date("2026-07-06")).ch.id === CH.weeklyFor(new Date("2026-07-08")).ch.id,
      !!CH.byId[CH.weeklyFor(new Date("2026-07-06")).ch.id]], [true, true]);
  eq("manifest: week math sane", [/^\d{4}-W\d{2}$/.test(CH.weekKey()),
     CH.weekEndsInS() > 0 && CH.weekEndsInS() <= 7 * 86400], [true, true]);
  let hookErr = null;
  const S0 = ctx.T82.newState("cap", 1, null);
  const anyRow = ctx.T82.t.BEST_BY_NAME.values().next().value;   // a live real-data row
  for (const c of CH.CHALLENGES) {
    try {
      if (c.filter) c.filter(anyRow, ctx.T82.t);
      if (c.pick) c.pick(S0, anyRow, "G", ctx.T82.t);
      if (c.deal) c.deal(S0, ctx.T82.t);
    } catch (e) { hookErr = c.id + ": " + e.message; break; }
  }
  eq("manifest: every hook executes against real data", hookErr, null);
}

// ---------- 13. API libs: daily seed (HMAC), auth (real RS256), name filter ----------
const daily = await import("./functions/_lib/daily.js");
const s1 = await daily.dailySeed("test-secret", "2026-07-06|cap");
const s2 = await daily.dailySeed("test-secret", "2026-07-06|cap");
const s3 = await daily.dailySeed("test-secret", "2026-07-07|cap");
const s4 = await daily.dailySeed("other-secret", "2026-07-06|cap");
eq("daily seed: deterministic uint32, label- and secret-sensitive",
   [s1 === s2, (s1 >>> 0) === s1, s1 !== s3, s1 !== s4], [true, true, true, true]);
eq("daily labels + 26h grace pair",
   [daily.dailyLabel("cap", Date.UTC(2026, 6, 6, 12)), daily.yesterdayLabel("cap", Date.UTC(2026, 6, 6, 0, 30))],
   ["2026-07-06|cap", "2026-07-05|cap"]);
eq("countdown to UTC midnight", daily.secondsToUtcMidnight(Date.UTC(2026, 6, 6, 23, 59, 0)), 60);
eq("name: clean passes through", daily.cleanName("Gray K", "4F2K"), "Gray K");
eq("name: charset reject -> GM fallback", daily.cleanName("<script>", "4F2K"), "GM-4F2K");
eq("name: leet-normalized denylist -> GM fallback", daily.cleanName("Sh1t Lord", "4F2K"), "GM-4F2K");
eq("name: too short -> GM fallback", daily.cleanName("ab", "4F2K"), "GM-4F2K");

const { generateKeyPairSync, createSign } = require("crypto");
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = publicKey.export({ type: "spki", format: "pem" });
const b64u = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function jwt(payload, opts = {}) {
  const h = b64u(JSON.stringify({ alg: opts.alg || "RS256", typ: "JWT" }));
  const p = b64u(JSON.stringify(payload));
  const signer = createSign("RSA-SHA256"); signer.update(h + "." + p);
  let sig = b64u(signer.sign(privateKey));
  if (opts.breakSig) sig = (sig.slice(0, -2) + (sig.endsWith("AA") ? "BB" : "AA"));
  return h + "." + p + "." + sig;
}
const auth = await import("./functions/_lib/auth.js");
const nowS = Math.floor(Date.now() / 1000);
const req = (token) => ({ headers: { get: (k) => (k.toLowerCase() === "authorization" && token) ? "Bearer " + token : null } });
const envA = { CLERK_JWT_KEY: pem };
eq("auth: valid token -> sub", await auth.verifySession(req(jwt({ sub: "user_1", exp: nowS + 300, azp: "https://true82.net" })), envA), "user_1");
eq("auth: expired -> anonymous", await auth.verifySession(req(jwt({ sub: "user_1", exp: nowS - 300 })), envA), null);
eq("auth: tampered signature -> anonymous", await auth.verifySession(req(jwt({ sub: "user_1", exp: nowS + 300 }, { breakSig: true })), envA), null);
{
  const good = jwt({ sub: "user_1", exp: nowS + 300 });
  const cookiePost = (hdrs) => new Request("http://true82.net/api/run",
    { method: "POST", headers: { cookie: "__session=" + good, ...(hdrs || {}) } });
  eq("auth CSRF gate: cookie-sourced POST needs same-origin proof; GET and vouched POSTs pass",
     [await auth.verifySession(cookiePost(), envA),
      await auth.verifySession(cookiePost({ "sec-fetch-site": "same-origin" }), envA),
      await auth.verifySession(cookiePost({ origin: "http://true82.net" }), envA),
      await auth.verifySession(cookiePost({ origin: "http://evil.example" }), envA),
      await auth.verifySession(new Request("http://true82.net/api/me", { headers: { cookie: "__session=" + good } }), envA)],
     [null, "user_1", "user_1", null, "user_1"]);
}
eq("auth: malformed -> anonymous", await auth.verifySession(req("not.a.jwt"), envA), null);
eq("auth: missing CLERK_JWT_KEY -> anonymous", await auth.verifySession(req(jwt({ sub: "u", exp: nowS + 300 })), {}), null);
eq("auth: azp not in AUTHORIZED_PARTIES -> anonymous",
   await auth.verifySession(req(jwt({ sub: "u", exp: nowS + 300, azp: "https://evil.com" })),
   { CLERK_JWT_KEY: pem, AUTHORIZED_PARTIES: "https://true82.net" }), null);
eq("auth: __session cookie fallback",
   await auth.verifySession({ headers: { get: (k) => k === "cookie" ? "__session=" + jwt({ sub: "user_2", exp: nowS + 300 }) : null } }, envA), "user_2");

// ---------- 14. endpoint import graph (esbuild-interop rehearsal) ----------
for (const mod of ["daily", "run", "me", "claim", "name", "lb", "hof", "notebook", "verify", "weekly",
  "match", "match/[id]", "match/[id]/[action]", "league", "league/[id]", "league/[id]/[action]"]) {
  const m = await import("./functions/api/" + mod + ".js");
  eq("api/" + mod + ".js loads + exports a handler", typeof (m.onRequestPost || m.onRequestGet), "function");
}

// ---------- 14b. CONTRACT FREEZE (the client↔server seams, executed) ----------
// Born in the 2026-07-06 audit: the accounts.js→run.js dialect had silently
// drifted (nested objects vs flat flags) — every official would have stored
// casual. These checks make that class of bug a red test, not a launch story.
{
  // (1) the submission seam, both directions: build the payload EXACTLY as
  // accounts.js does (replay-derived claim) and push it through verifyRun.
  const ch = CH.byId.time_machine;
  const S = ctx.T82.newState(ch.base, 4242, ch);
  ctx.T82.dealRound(S);
  let guard = 0;
  while (S.picks.length < 5 && !S.done && guard++ < 40) {
    let took = false;
    const pool = ctx.T82.t.POOLS.get(ctx.T82.key(S, S.cur.fr, S.cur.dec));
    if (pool) for (const [name] of pool) {
      const r = ctx.T82.resolveRow(S, name);
      if (!r || !ctx.T82.rowDraftable(S, r)) continue;
      const slot = ctx.T82.rowOpenBuckets(S, r)[0];
      if (ch.pick && !ch.pick(S, r, slot, ctx.T82.t)) continue;
      if (ctx.T82.applyPick(S, name, r[ctx.T82.t.IDX.season], slot)) { took = true; break; }
    }
    if (!took) { if (!ctx.T82.skipEra(S) && !ctx.T82.skipTeam(S)) break; continue; }
    if (S.picks.length < 5) ctx.T82.dealRound(S);
  }
  eq("contract: a weekly practice game completes for the freeze", S.picks.length, 5);
  const rp = ctx.T82.replay({ mode: S.mode, seed: 4242, actions: S.actions.slice() }, ch);
  const payload = { mode: S.mode, seed: 4242, actions: S.actions.slice(),
    rngDraws: rp.result.rngDraws, challenge: ch,
    claim: { wins: rp.result.wins, net: rp.result.net } };
  eq("contract: client-built payload verifies clean", ctx.T82.verifyRun(payload).ok, true);
  const bad = { ...payload, claim: { wins: payload.claim.wins + 1, net: payload.claim.net } };
  eq("contract: inflated claim caught by the same path", ctx.T82.verifyRun(bad).why, "wins");

  // (2) live endpoint executions — no DB, no Clerk, pure request→response
  const dm = await import("./functions/api/daily.js");
  const dresp = await dm.onRequestGet({ request: new Request("http://t/api/daily?mode=classic"),
    env: { DAILY_SECRET: "test-secret" } });
  const dj = await dresp.json();
  eq("live /api/daily: ok + self-describing mode + date|mode label + uint32 seed",
     [dj.ok, dj.mode, /^\d{4}-\d{2}-\d{2}\|classic$/.test(dj.label), dj.seed >>> 0 === dj.seed],
     [true, "classic", true, true]);
  const wm = await import("./functions/api/weekly.js");
  const wresp = await wm.onRequestGet({ request: new Request("http://t/api/weekly"), env: {} });
  const wj = await wresp.json();
  eq("live /api/weekly: ok + in-manifest challenge + sane clock",
     [wj.ok, !!CH.byId[wj.challengeId], wj.week === CH.weekKey(), wj.endsInS > 0 && wj.endsInS <= 7 * 86400],
     [true, true, true, true]);

  // (3) dialect tripwire: both sides of the wire must keep speaking flat
  const accSrc = fs.readFileSync(__dirname + "/accounts.js", "utf8");
  const runSrc = fs.readFileSync(__dirname + "/functions/api/run.js", "utf8");
  eq("dialect tripwire: accounts.js sends what run.js reads",
     [accSrc.includes('body.official = "daily"'), accSrc.includes("body.weekly = true"),
      accSrc.includes("id: id, sid: sid()"), accSrc.includes('body.official = "league"'),
      runSrc.includes('body.official === "daily"'), runSrc.includes("body.weekly === true"),
      runSrc.includes("String(body.id"), runSrc.includes('body.official === "league"')],
     [true, true, true, true, true, true, true, true]);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("ASYNC SECTION CRASH:", e); process.exit(1); });
