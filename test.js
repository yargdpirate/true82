// TRUE 82 — headless logic test harness (no browser needed).
// Run:  node test.js   (from the repo root; expects app.js + sim-core.js beside it)
// Covers: career position buckets, chargeReroll refund/fire-sale slices + blocking,
// effCost fire-sale floor, capRoll bargain decay (monotonic, rip-offs invariant),
// lineup swap legality + doLineupMove/doLineupSwap state, FORCE_CLUTCH/prefersReduce
// flags, and the crest load-race regression. Run this BEFORE and AFTER any change
// to game logic in app.js. 66 checks (six pin the riso reel's pacing, flash
// limit and copy rules, including the v51 one-end-time pacing; ten pin the
// v50 tag ballot's card logic, vote ids and tally words; five pin v51 fix-list
// rules: one spelling of trait codes (app.js and the Bonuses page), the ballot
// question's highlight, the results comp line and the GOAT Climb marker on
// realized wins; the last four
// are the v51 style law: no color or font outside the theme block, the shared
// pieces exist, and the section header component);
// exits nonzero on any failure.

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

// v48 riso reel (reel-riso.js): cosmetic, but these three are promises.
vm.runInContext(fs.readFileSync("reel-riso.js", "utf8"), ctx);
const RISO = ctx.window.T82RISO;
let minFlashHold = Infinity;
for (let n = 1; n <= 82; n++) if (RISO.heavy(n)) for (const st of [0, 4, 31]) minFlashHold = Math.min(minFlashHold, RISO.holdFor(n, st));
eq("riso reel: red-flash losses come under 3 per second (photosensitivity line)", 1000 / (minFlashHold + 48) < 3, true);
eq("riso reel: the loss that ends a real streak holds longest", RISO.holdFor(1, 31) > Math.max(RISO.holdFor(1, 0), RISO.holdFor(2, 0), RISO.holdFor(20, 0)), true);
eq("riso reel: the red flash has its own speed limit, under 1.5 a second at any pace", 1 / RISO.flashGap < 1.5, true);
// v51 reel pacing: every record finishes at the same moment; 78-82 wins take the natural, slowest pace
const season = (w, lossesFirst) => { const g = []; for (let i = 0; i < 82; i++) g.push(1); let l = 82 - w;
  for (let i = lossesFirst ? 0 : 81; l > 0; i += lossesFirst ? 1 : -1) { g[i] = 0; l--; } return g; };
const spread = w => { const g = []; for (let i = 0; i < 82; i++) g.push(Math.floor((i + 1) * w / 82) > Math.floor(i * w / 82) ? 1 : 0); return g; };
const seasons = [season(82), season(78, false), spread(78), spread(60), spread(41), season(26, true), season(0, true)];
eq("reel pacing: every record finishes at the same moment",
  seasons.map(g => Math.round(ctx.reelNaturalMs(g, RISO.holdFor) * ctx.reelPace(g, RISO.holdFor))), seasons.map(() => ctx.REEL_END_MS));
eq("reel pacing: 78-82 wins play at the natural (slowest) pace or slower; worse seasons run faster",
  [ctx.reelPace(spread(78), RISO.holdFor) >= 0.97, ctx.reelPace(season(82), RISO.holdFor) > 1, ctx.reelPace(spread(41), RISO.holdFor) < 0.8], [true, true, true]);
const EM = String.fromCharCode(0x2014);
const lossLines = [{ cl: 1, prevStreak: 31 }, { cl: 1, prevStreak: 0 }, { cl: 3, lossRun: 2 }, { cl: 4, lossRun: 1 }]
  .map(i => RISO.lossCopy(Object.assign({ city: "Orlando", date: "Dec 23" }, i)).join(" "));
eq("riso reel: loss copy has zero em-dashes (copy law)", lossLines.some(l => l.includes(EM)), false);

// v50 tag ballot (app.js): the card's tag logic, the vote id, and the tally
// words are pure, so they are pinned here. The owner's rules: three states
// (on / ? / off), a NO on a settled tag stays visible, gravity implies 3PT,
// the engine's own chip can be disputed but never removed, zero em-dashes.
const tagsOf = (card) => ctx.ballotTagModel(Object.assign({ eng: "", settled: {}, open: {}, split: {}, qids: {}, mine: {} }, card))
  .tags.map(t => t.T.chip + ":" + t.state + (t.mine ? "*" : ""));
eq("ballot: settled first, then unsettled, in trait order",
  tagsOf({ settled: { "Playmaker": 1, "Three-Point Shooter": 1 }, open: { "Clutch": "q1" } }), ["3PT:on", "PLAY:on", "CLUTCH:q"]);
eq("ballot: a NO on a settled tag leaves it hollow and ringed",
  tagsOf({ settled: { "Playmaker": 1 }, mine: { "Playmaker": "no" } }), ["PLAY:off*"]);
eq("ballot: a NO on an unsettled tag sends it back to the picker",
  ctx.ballotTagModel({ eng: "", settled: {}, open: { "Clutch": "q1" }, split: {}, qids: {}, mine: { "Clutch": "no" } }).reopen.map(T => T.chip), ["CLUTCH"]);
eq("ballot: settled gravity hides 3PT; unsettled gravity does not",
  [tagsOf({ eng: "3PT", settled: { "Super Three-Point Shooter": 1 } }), tagsOf({ eng: "3PT", open: { "Super Three-Point Shooter": "g" } })],
  [["GRAVITY:on"], ["3PT:on", "GRAVITY:q"]]);
eq("ballot: the engine's chip survives a NO as unsettled, never removed",
  tagsOf({ eng: "GRAVITY", mine: { "Super Three-Point Shooter": "no" } }), ["GRAVITY:q*"]);
eq("ballot: a crowd split marks a settled tag unsettled",
  tagsOf({ settled: { "Clutch": 1 }, split: { "Clutch": "q2" } }), ["CLUTCH:q"]);
eq("ballot: a tag you add joins the settled group with your ring",
  tagsOf({ open: { "Clutch": "q1" }, mine: { "Hunted": "yes" } }), ["HUNTED:on*", "CLUTCH:q"]);
eq("ballot: vote ids match op=roster and the scout backfill (accents fold)",
  [ctx.ballotQid("Luka Don\u010di\u0107", 2024, "hunted"), ctx.ballotQid("Shaquille O'Neal", 2000, "clutch")],
  ["luka-don-i-2024-hunted", "shaquille-o-neal-2000-clutch"]);
const t1 = ctx.ballotTally({ mode: "counts", yes: 1, no: 0, unsure: 0 }, { status: "unresolved", votes_needed: 24 }, "yes", null);
const t2 = ctx.ballotTally({ mode: "pct", yes: 440, no: 372, unsure: 0 }, { status: "disputed" }, "no", { qualify_yes_share: 0.62 });
eq("ballot: tally words, pill, and no big percent off one vote",
  [t1.big, t1.line, t1.pill, t2.big, t2.line, t2.pill],
  [false, "1 vote so far \u00B7 1 yes, 0 no \u00B7 you said yes", "24 more votes settle it", true,
    "812 people have voted \u00B7 54% say yes \u00B7 you said no", "Disputed \u00B7 flips at 62%"]);
const ballotCopy = [].concat(...ctx.BALLOT_TRAITS.map(T => [T.chip, T.q, T.d || ""]), [t1.line, t1.pill, t2.line, t2.pill]);
eq("ballot: trait copy and tally words have zero em-dashes (copy law)", ballotCopy.some(l => l.includes(EM)), false);
// v51 fix list: one spelling of the trait codes, the ballot question, the comp line, the climb.
eq("trait codes: one spelling everywhere (the pool and legend read the ballot's chips; retired names stay readable)",
  [ctx.BALLOT_TRAITS.every(T => ctx.traitCardAbbr(T.name) === T.chip), ctx.traitCardAbbr("Clutch"), ctx.traitCardAbbr("Wing Defender")],
  [true, "CLUTCH", "WING-D"]);
// the Bonuses page keeps its own copy of the codes (it does not load app.js): it must match the ballot too
const tagAbbrSrc = (fs.readFileSync("bonuses/index.html", "utf8").match(/var TAG_ABBR = (\{[\s\S]*?\});/) || [])[1];
const bonusAbbr = tagAbbrSrc ? vm.runInNewContext("(" + tagAbbrSrc + ")") : {};
eq("trait codes: the Bonuses page spells every live trait exactly like the ballot",
  ctx.BALLOT_TRAITS.filter(T => bonusAbbr[T.name] !== T.chip).map(T => T.name), []);
const qOf = id => ctx.ballotQuestionHtml({ season: 2016, name: "Pedro Huertas" }, ctx.BALLOT_TRAITS.find(T => T.id === id));
eq("ballot: the question highlights only the trait words; the article sits outside, tied by a no-break space",
  [qOf("off-ball-scorer"), qOf("hunted")],
  ['Was 2016 Huertas an\u00A0<mark class="">off-ball scorer</mark>?', 'Was 2016 Huertas <mark class="neg">hunted on defense</mark>?']);
const compText = w => ctx.resultsCompHtml(w).replace(/<[^>]+>/g, "");
eq("results comp: no phrase more than one win below the ladder (3-79, 41-41, 60-22); the rungs read true above it",
  [3, 41, 60, 61, 62, 70, 82].map(compText),
  ["", "", "", "Almost as good as the Beautiful Game Spurs", "Almost as good as the Bad Boy Pistons", "Almost as good as the Lob City Lineup", "Greatest of all GOATs"]);
eq("GOAT Climb: the marker rides the realized record, like the comp line (not the pre-season net)",
  [/climb-you below/.test(ctx.climbHtml({ winTally: 64, net: 0 })), /climb-you below/.test(ctx.climbHtml({ winTally: 50, net: 25 }))],
  [false, true]);

// ---------- v51 THE STYLE LAW: one theme, enforced (tools/style-law.js, docs/STYLE-GUIDE.md) ----------
// Colors and fonts are written only in styles.css's generated theme block; every
// other rule, page and script reads theme tokens. A finding names the token to use.
const LAW = require("./tools/style-law.js");
eq("style law: no color or font outside the theme block (run node tools/style-law.js for the fixes)", LAW.check().map(LAW.format), []);
const STYLES = fs.readFileSync("styles.css", "utf8");
const PIECES = [".t-btn", ".t-chip", ".t-card", ".t-sheet", ".t-backdrop", ".t-toast", ".t-head", ".t-num", ".t-title", ".t-mode",
  '.t-head[data-head="rule"]', '.t-head[data-head="bar"]', '.t-head[data-head="title"]', '.t-head[data-head="banner"]', '.t-head[data-head="tab"]',
  '.t-btn[data-kind="no"]', '.t-btn[data-kind="quiet"]', '.t-btn[data-kind="text"]', '.t-chip[data-tone="bad"]', '.t-chip[data-tone="plain"]'];
eq("style law: the shared pieces every mode builds from are all in styles.css", PIECES.filter(p => STYLES.indexOf(p) < 0), []);
const HEAD_VARIANTS = ["eyebrow", "rule", "bar", "title", "banner", "tab"];
eq("section headers: every HEADS context names a real variant",
  Object.keys(ctx.HEADS).filter(k => HEAD_VARIANTS.indexOf(ctx.HEADS[k]) < 0), []);
eq("section headers: head() builds one component with the context's variant",
  [ctx.head("results", "Your five"), ctx.head("sheet", "Add a tag", { cls: "bt-h" }), ctx.head("nope", "X", { tag: "h3" })],
  ['<h2 class="t-head" data-head="' + ctx.HEADS.results + '">Your five</h2>', '<h2 class="t-head bt-h" data-head="' + ctx.HEADS.sheet + '">Add a tag</h2>',
    '<h3 class="t-head" data-head="eyebrow">X</h3>']);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
