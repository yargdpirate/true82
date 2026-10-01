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
// pieces exist, and the section header component). POOL3 (2026-09-26) adds ten
// more: the third daily rotation's shape and copy, the price hook's no-op
// default, and 20 quick bot drafts on each of its 200 boards (about 12 seconds);
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
eq("ballot: a tag you add joins the settled group with your ring (a bad one still sits after the good ones, v63)",
  tagsOf({ open: { "Clutch": "q1" }, mine: { "Hunted": "yes" } }), ["CLUTCH:q", "HUNTED:on*"]);
eq("ballot (v63, the owner: positives followed by negatives): the good tags, settled then '?', then the bad ones, settled then '?'",
  tagsOf({ settled: { "Off-Court Knucklehead": 1, "Iso Defender": 1 }, open: { "Clutch": "q1", "Hunted": "q2" } }), ["ISO-D:on", "CLUTCH:q", "KNUCK:on", "HUNTED:q"]);
eq("ballot: vote ids match op=roster and the scout backfill (accents fold)",
  [ctx.ballotQid("Luka Don\u010di\u0107", 2024, "hunted"), ctx.ballotQid("Shaquille O'Neal", 2000, "clutch")],
  ["luka-don-i-2024-hunted", "shaquille-o-neal-2000-clutch"]);
const t1 = ctx.ballotTally({ mode: "counts", yes: 1, no: 0, unsure: 0 }, { status: "unresolved", votes_needed: 24 }, "yes", null);
const t2 = ctx.ballotTally({ mode: "pct", yes: 440, no: 372, unsure: 0 }, { status: "disputed" }, "no", { qualify_yes_share: 0.62 });
eq("ballot: tally words, pill, and no big percent off one vote",
  [t1.big, t1.line, t1.pill, t2.big, t2.line, t2.pill],
  [false, "1 vote so far \u00B7 1 yes, 0 no \u00B7 you said yes", "24 more votes settle it", true,
    "812 people have voted \u00B7 54% say yes \u00B7 you said no", "Disputed \u00B7 flips at 62%"]);
// v60 THE TAG SHEET (the "+"): every trait the "+" offers plus any other tag on the card, each lit only when the tag
// is on his card for you, and its last line says what a tap does (a tap is the vote; no YES/NO step).
const sheetOf = (card) => ctx.ballotSheetTiles(Object.assign({ eng: "", settled: {}, open: {}, split: {}, qids: {}, mine: {} }, card));
const sh1 = sheetOf({ eng: "3PT", settled: { "Playmaker": 1, "Championship #1": 1, "Clutch": 1 }, open: { "Team Defender": "q1" },
  mine: { "Hunted": "yes", "Rim Protector": "no", "Clutch": "no" } });
eq("tag sheet: every core trait is offered, TITLE #1, BALL-POUND and FOUL-MERCH included, lit only when on his card for you",
  [sh1.length, ctx.BALLOT_TRAITS.every(T => T.pick), sh1.filter(s => s.lit).map(s => s.T.chip)], [18, true, ["3PT", "PLAY", "TEAM-D", "TITLE #1", "HUNTED"]]);
const actOf = (list, chip) => list.filter(s => s.T.chip === chip)[0].act;
eq("tag sheet: each tile says what a tap does",
  ["3PT", "PLAY", "TEAM-D", "CLUTCH", "RIM-P", "GRAVITY"].map(c => actOf(sh1, c)),
  ["The engine\u2019s call \u00B7 tap to dispute", "On his card \u00B7 tap to remove", "Unsettled \u00B7 tap to take it off",
    "You took it off \u00B7 tap to put it back", "Tap to add", "Tap to add"]);
const g3 = sheetOf({ eng: "3PT", settled: { "Super Three-Point Shooter": 1 } }).filter(s => s.T.chip === "3PT")[0];
eq("tag sheet: a disputed engine chip reads as yours to take back; under a settled GRAVITY, 3PT's tile stays put, carried",
  [actOf(sheetOf({ eng: "GRAVITY", mine: { "Super Three-Point Shooter": "no" } }), "GRAVITY"), !!g3 && g3.lit, !!g3 && !!g3.implied, g3 && g3.act],
  ["You disputed it \u00B7 tap to agree", true, true, "Comes with GRAVITY"]);
eq("tag sheet: tile copy has zero em-dashes (copy law)", [].concat(...[sh1].map(l => l.map(s => s.act))).some(l => l.includes(EM)), false);
const ballotCopy = [].concat(...ctx.BALLOT_TRAITS.map(T => [T.chip, T.q, T.d || ""]), [t1.line, t1.pill, t2.line, t2.pill]);
eq("ballot: trait copy and tally words have zero em-dashes (copy law)", ballotCopy.some(l => l.includes(EM)), false);
// v53 (owner: "ADD DEFINITIONS TO TRAITS"): every trait carries its one-line definition, and the
// glossary and the pool legend print it
eq("trait definitions: every trait has one, and the glossary and the pool legend show it",
  [ctx.BALLOT_TRAITS.filter(T => !(T.d && T.d.length > 12)).map(T => T.chip),
    ctx.BALLOT_TRAITS.every(T => ctx.traitGlossaryHtml(null).includes(ctx.esc(T.d)))],
  [[], true]);
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

// ---------- v56 THE DAILY ARCHIVE: history is pinned, and a replay never claims the day ----------
// The archive replays every past board from its date. POOL is a per-day hash and POOL2 a rotation modulo its
// length, so editing either (or SEED_NS, or EPOCH) would silently rewrite old boards: this pin fails first.
// New boards go in a POOL3 with its own start date.
{
  const dctx = { Math, Date, console, JSON, URLSearchParams };
  vm.createContext(dctx);
  vm.runInContext(fs.readFileSync("challenges.js", "utf8"), dctx);
  vm.runInContext(fs.readFileSync("daily-core.js", "utf8"), dctx);
  const D = dctx.T82DAILY, hist = [];
  for (let k = D.EPOCH; k <= "2026-09-26"; k = D.shiftKey(k, 1)) { const b = D.boardFor(k); hist.push(b.num + ":" + (b.ch ? b.ch.id : b.base) + ":" + b.seed); }
  eq("daily archive: boards #1 to #77 rebuild exactly as dealt (POOL, POOL2, SEED_NS and EPOCH are history)",
    [hist.length, D.hash32(hist.join("|")), hist[76]], [77, 3976625062, "77:heliocentric:1893317855"]);
  let mem = null;
  D._setStore({ get: () => mem, set: (o) => { mem = JSON.parse(JSON.stringify(o)); return true; } });
  D.recordArchive("2026-09-20", 71, 60, 5.2);
  D.recordArchive("2026-09-20", 71, 55, 3.1);
  D.recordArchive("2026-09-20", 71, 58, 4, false);
  eq("daily archive: a replay keeps the best record and counts runs, never touching official or the streak",
    [D.archiveFor("2026-09-20"), D.officialFor("2026-09-20"), D.streakFor("2026-09-21")], [{ num: 71, wins: 60, net: 5.2, runs: 2 }, null, 0]);
}

// ---------- POOL3 (2026-09-26): the third rotation, 200 new boards from #79 (2026-09-28) ----------
// Shape pins for the rotation and its copy, the price hook's no-op default, and a quick playability
// smoke test (node tools/daily-audit.js 300 pool3 is the full certification).
{
  const pctx = { Math, Date, console, JSON, URLSearchParams };
  vm.createContext(pctx);
  vm.runInContext(fs.readFileSync("challenges.js", "utf8"), pctx);
  vm.runInContext(fs.readFileSync("daily-core.js", "utf8"), pctx);
  const D = pctx.T82DAILY, CH = pctx.T82CH, P3 = D.POOL3 || [];
  const cut = CH.CHALLENGES.findIndex(c => c.id === "small_ball_five") + 1;
  const OLD = new Set(CH.CHALLENGES.slice(0, cut).map(c => c.id));
  const EARLIER = new Set(D.POOL.filter(p => p.id).map(p => p.id).concat(D.POOL2));
  eq("POOL3: exactly 200 unique ids", [P3.length, new Set(P3).size], [200, 200]);
  eq("POOL3: every id is in the manifest and new (not in POOL, POOL2 or the 99 entries shipped before it)",
    P3.filter(id => !CH.byId[id] || OLD.has(id) || EARLIER.has(id)), []);
  // v66: the special days' boards sit after the pool in the manifest, each pinned to its date by OVERRIDES
  const SPECIAL = Object.keys(D.OVERRIDES).filter(k => k >= D.START3).map(k => D.OVERRIDES[k]).filter(id => P3.indexOf(id) < 0);
  eq("POOL3: the manifest's new section is exactly the pool and the special days, no orphan boards",
    CH.CHALLENGES.slice(cut).map(c => c.id).sort(), P3.concat(SPECIAL).sort());
  eq("POOL3: every id has daily copy, s and g", P3.filter(id => !(D.DAILY_COPY[id] && D.DAILY_COPY[id].s && D.DAILY_COPY[id].g)), []);
  const DASH = /[–—]/;
  eq("POOL3: zero em or en dashes in every new name, blurb, s and g (copy law)",
    P3.filter(id => { const c = CH.byId[id] || {}, d = D.DAILY_COPY[id] || {}; return DASH.test([c.name, c.blurb, d.s, d.g].join(" ")); }), []);
  const pre = D.shiftKey(D.START3, -1), wrap = D.shiftKey(D.START3, P3.length);
  const i2 = (D.dayNum(pre) - D.dayNum(D.START2)) % D.POOL2.length;
  eq("POOL3: starts 2026-09-28 (#79) after the last pinned day; #78 is still POOL2; day 200 wraps to the top",
    [D.START3, D.dayNum(D.START3), D.START3 > "2026-09-26", D.boardFor(D.START3).ch.id, D.boardFor(pre).ch.id, D.POOL2[i2], D.boardFor(wrap).ch.id],
    ["2026-09-28", 79, true, P3[0], "expansion_class", "expansion_class", P3[0]]);
  const b79 = D.boardFor(D.START3);
  eq("POOL3: a POOL3 day carries its own copy to the status row and the gate", [b79.short, b79.gate], [D.DAILY_COPY[P3[0]].s, D.DAILY_COPY[P3[0]].g]);
  const bases = P3.map(id => CH.byId[id].base);
  eq("POOL3: never the same base mode three days running, the wrap included",
    bases.filter((b, i) => b === bases[(i + 1) % bases.length] && b === bases[(i + 2) % bases.length]).length, 0);
  // the price(row,t) hook: absent means a multiplier of exactly 1, so every other board prices and draws as before
  const T = ctx.T82, st = () => T.newState("cap", 4242, null), a = st(), b = st(), c = st(), V = [1.5, 3, 5.5, 8, 12];
  const pa = V.map(v => T.capCost(a, v, 1)), pb = V.map(v => T.capCost(b, v, 1, undefined)), pc = V.map(v => T.capCost(c, v, 1, 1));
  eq("POOL3 price hook: no multiplier prices and draws exactly as before", [pb, pc, b.rng.n, c.rng.n], [pa, pa, a.rng.n, a.rng.n]);
  if (fs.existsSync("site_data.json")) {
    const AUD = require("./tools/daily-audit.js");
    const env = AUD.load(__dirname), bot = AUD.makeBot(env, {}), dead = [];
    env.T82DAILY.POOL3.forEach(id => {
      const ch = env.T82CH.byId[id];
      for (let g = 1; g <= 20; g++) if (bot(ch.base, ch, 555000 + g * 7).dead) { dead.push(id); break; }
    });
    eq("POOL3: 20 quick bot drafts on every board, zero dead runs", dead, []);
  }
}

// ---------- v66 THE SPECIAL DAYS and THE TEST DAY ----------
// Opening Night (10/20), Doubleheader (10/21) and Primetime (10/22) take their dates from POOL3 without moving any other
// day, each dealing only its franchises' star eras on a chosen seed. A test build's ?day= moves "today" only.
{
  const pctx = { Math, Date, console, JSON, URLSearchParams };
  vm.createContext(pctx);
  vm.runInContext(fs.readFileSync("challenges.js", "utf8"), pctx);
  vm.runInContext(fs.readFileSync("daily-core.js", "utf8"), pctx);
  const D = pctx.T82DAILY, CH = pctx.T82CH, P3 = D.POOL3;
  const at = k => { const b = D.boardFor(k); return [b.num, b.ch && b.ch.id, b.base, b.name]; };
  const p3 = k => P3[(D.dayNum(k) - D.dayNum(D.START3)) % P3.length];
  eq("special days: #101 Opening Night, #102 Doubleheader, #103 Primetime, all Classic",
    ["2026-10-20", "2026-10-21", "2026-10-22"].map(at),
    [[101, "opening_night", "classic", "Opening Night"], [102, "doubleheader", "classic", "Doubleheader"], [103, "primetime", "classic", "Primetime"]]);
  eq("special days: every other day keeps its POOL3 board (the rotation does not shift)",
    ["2026-10-19", "2026-10-23", "2026-11-01", "2027-04-15"].map(k => D.boardFor(k).ch.id), ["2026-10-19", "2026-10-23", "2026-11-01", "2027-04-15"].map(p3));
  eq("special days: the franchises dealt (Sonics years count for the Thunder in the data)",
    ["opening_night", "doubleheader", "primetime"].map(id => CH.byId[id].deal().frs),
    [["CELTICS", "PISTONS", "76ERS", "KNICKS", "THUNDER", "SPURS"], ["TIMBERWOLVES", "HEAT", "WARRIORS", "LAKERS"], ["CAVALIERS", "76ERS", "NUGGETS", "THUNDER"]]);
  const DASH = /[–—]/;
  eq("special days: copy for the status row and the gate, no em or en dashes",
    ["opening_night", "doubleheader", "primetime"].filter(id => { const c = CH.byId[id], d = D.DAILY_COPY[id] || {}; return !d.s || !d.g || DASH.test([c.name, c.blurb, d.s, d.g].join(" ")); }), []);
  // the launch week's three Classic nights (after 10/19's Classic Board Meeting) are the owner's deliberate exception
  const days = [], bases = []; for (let k = D.START3, i = 0; i < P3.length; k = D.shiftKey(k, 1), i++) { days.push(k); bases.push(D.boardFor(k).base); }
  const LAUNCH = ["2026-10-20", "2026-10-21", "2026-10-22"];
  eq("the schedule as it will play (POOL3 plus the special days): never the same base mode three days running, the launch week excepted",
    bases.filter((b, i) => i >= 2 && b === bases[i - 1] && b === bases[i - 2] && ![days[i], days[i - 1], days[i - 2]].some(k => LAUNCH.includes(k))).length, 0);
  const real = D.dayKey();
  D.setTestDay("2026-10-20");
  const during = [D.dayKey(), D.dayKey(new Date(2026, 0, 5, 12).getTime()), D.boardFor(D.dayKey()).ch.id];
  D.setTestDay("not-a-day"); const bad = D.dayKey();
  D.setTestDay(null);
  eq("the test day: moves today only (an explicit date is untouched), ignores a malformed day, and clears",
    [during, bad, D.dayKey()], [["2026-10-20", "2026-01-05", "opening_night"], real, real]);
  if (fs.existsSync("site_data.json")) {
    const AUD = require("./tools/daily-audit.js");
    const env = AUD.load(__dirname), bot = AUD.makeBot(env, {}), dead = [];
    ["opening_night", "doubleheader", "primetime"].forEach(id => {
      const ch = env.T82CH.byId[id];
      for (let g = 1; g <= 60; g++) if (bot(ch.base, ch, 911000 + g * 11).dead) { dead.push(id); break; }
    });
    eq("special days: 60 quick bot drafts on each board, zero dead runs", dead, []);
    // the star eras: every ticket dealt, and every skip, stays on the board's list (sim-core allow.pairs); a deep cut
    // only in rounds 2 and 3
    const off = [];
    ["opening_night", "doubleheader", "primetime"].forEach(id => {
      const ch = env.T82CH.byId[id], star = ch.deal.star, deep = ch.deal.deep;
      const okAt = (k, round) => star.indexOf(k) >= 0 || ((round === 2 || round === 3) && deep.indexOf(k) >= 0);
      for (let sd = 1; sd <= 150; sd++) {
        const S = env.T82.newState("classic", 424200 + sd * 17, ch);
        if (env.T82.dealRound(S) === "done") { off.push(id + " nodeal"); break; }
        const seen = [[S.cur.fr + "|" + S.cur.dec, 1]];
        for (let r = 2; r <= 5; r++) {
          env.T82.dealRound(S); seen.push([S.cur.fr + "|" + S.cur.dec, r]);
          if (r === 2) { env.T82.skipTeam(S); seen.push([S.cur.fr + "|" + S.cur.dec, r]); }
          if (r === 3) { env.T82.skipEra(S); seen.push([S.cur.fr + "|" + S.cur.dec, r]); }
        }
        seen.forEach(([k, r]) => { if (!okAt(k, r)) off.push(id + " " + k + " round " + r); });
      }
    });
    eq("special days: 150 seeded deals with skips each, every ticket a star era (a deep cut only in rounds 2 and 3)", off, []);
    eq("special days: two team skips, one era skip", ["opening_night", "doubleheader", "primetime"].map(id => { const S = env.T82.newState("classic", 1, env.T82CH.byId[id]); return [S.teamSkips, S.eraSkips]; }),
      [[2, 1], [2, 1], [2, 1]]);
    // the path of a player who never skips (the best value each round, as the slots allow): everyone's, day by day
    const D2 = env.T82DAILY, path = k => { const b = D2.boardFor(k), T = env.T82, S = T.newState(b.base, b.seed, b.ch), tk = []; T.dealRound(S);
      for (let r = 0; r < 5; r++) { tk.push(S.cur.fr + "|" + S.cur.dec); let best = null;
        env.t.POOLS.get(T.key(S, S.cur.fr, S.cur.dec)).forEach((r0, nm) => { if (S.drafted.has(nm)) return; const row = T.resolveRow(S, nm);
          if (!row || !T.rowDraftable(S, row) || !T.rowOpenBuckets(S, row).length) return; if (!best || T.valueOf(S, row) > best.v) best = { nm, v: T.valueOf(S, row), b: T.rowOpenBuckets(S, row)[0] }; });
        T.applyPick(S, best.nm, null, best.b); if (r < 4) T.dealRound(S); }
      return tk; };
    const P20 = path("2026-10-20"), P21 = path("2026-10-21"), P22 = path("2026-10-22");
    eq("special days: the chosen paths (a no-skip player's five tickets)", [P20, P21, P22], [
      ["CELTICS|2000", "PISTONS|1970", "SPURS|2020", "KNICKS|1990", "THUNDER|2010"],
      ["LAKERS|1990", "WARRIORS|1980", "TIMBERWOLVES|2010", "HEAT|2000", "WARRIORS|2020"],
      ["76ERS|1980", "THUNDER|1970", "CAVALIERS|2010", "NUGGETS|2020", "76ERS|2000"]]);
    eq("special days: each path carries exactly one deep cut, in round 2", [[P20, "opening_night"], [P21, "doubleheader"], [P22, "primetime"]].map(([p, id]) =>
      p.map((k, i) => env.T82CH.byId[id].deal.deep.indexOf(k) >= 0 ? i + 1 : 0).filter(Boolean)), [[2], [2], [2]]);
  }
  eq("special days: only 10/20, 10/21 and 10/22 carry a chosen seed; every other day's seed is its date's hash",
    [D.boardFor("2026-10-20").seed, D.boardFor("2026-10-21").seed, D.boardFor("2026-10-22").seed, D.boardFor("2026-10-23").seed === D.seedFor("2026-10-23"), Object.keys(D.SEED_OVERRIDES).sort()],
    [2696998625, 3675641764, 2501072727, true, ["2026-10-20", "2026-10-21", "2026-10-22"]]);
  eq("special days: both open their list on OBPM (the stars lead each ticket); every other board keeps its default",
    [CH.byId.opening_night.sortMode, CH.byId.doubleheader.sortMode, CH.byId.primetime.sortMode, CH.CHALLENGES.filter(c => c.sortMode).map(c => c.id).sort()],
    ["obpm", "obpm", "obpm", ["doubleheader", "opening_night", "primetime"]]);
  {
    // the OBPM and DBPM sorts rank a cameo (under 500 minutes) after every real season
    const X = vm.runInContext("IDX", ctx), mk = (name, ob, mp) => { const r = []; r[X.name] = name; r[X.obpm] = ob; r[X.dbpm] = ob; r[X.mp] = mp; return r; };
    const rows = [mk("Cameo", 9.5, 60), mk("Star", 6.1, 2800), mk("Starter", 1.2, 1900), mk("Short", 3, 499)];
    vm.runInContext("G = { sortMode: 'obpm' };", ctx);
    ctx.__rows = rows; vm.runInContext("sortPoolRows(__rows);", ctx);
    eq("the OBPM sort: a 60-minute +9.5 and a 499-minute +3 rank after the real seasons", rows.map(r => r[X.name]), ["Star", "Starter", "Cameo", "Short"]);
    vm.runInContext("G = null;", ctx);
  }
  const app = fs.readFileSync("app.js", "utf8");
  eq("the test day is set only off true82.net (app.js checks the host before reading ?day=)",
    /if \(!window\.T82DAILY \|\| !T82DAILY\.setTestDay \|\| !offLiveHost\(\)\) return null;/.test(app), true);
}

// ---------- v55 THE REDRAFTED on the real player data (skipped when site_data.json is absent) ----------
// The owner's "redraftables", ported from the accounts-test archive: every class derives from the data,
// v61: the shipped labels.json (tools/labels-freeze.js) loads into the engine and matches the game's names
if (fs.existsSync("labels.json")) {
  const lbl = JSON.parse(fs.readFileSync("labels.json", "utf8"));
  ctx.lblReal = lbl;
  const Q = vm.runInContext(`(function () {
    var ok = T82.setLabels(lblReal), k = T82.labelsOf("Kawhi Leonard", 2019) || {}, l = T82.labelsOf("Luka Don\u010Di\u0107", 2024) || {};
    var r = [ok, k["iso-defender"], l["playmaker"]];
    T82.setLabels(null);
    return r;
  })()`, ctx);
  eq("labels.json: the frozen tags load, and stars resolve by the game's own spelling (Kawhi 2019 ISO-D, Doncic 2024 PLAY)", Q, [true, "y", "y"]);
}

// every board can field three legal teams in both difficulties, and a full computer draft always finishes.
if (fs.existsSync("site_data.json")) {
  const rctx = { window: {}, navigator: {}, location: { search: "" }, document: ctx.document, performance: ctx.performance,
    setTimeout: () => 0, requestAnimationFrame: () => 0, Math, console: { log() {}, info() {}, warn() {}, error() {} } };
  vm.createContext(rctx);
  vm.runInContext(core, rctx);
  vm.runInContext(code, rctx);
  rctx.initDataInput = JSON.parse(fs.readFileSync("site_data.json", "utf8"));
  vm.runInContext("initData(initDataInput); DATA_READY = true; sdDeriveClasses();", rctx);
  // v58: PRO boards are the real drafts (redraft-drafts.json), as the browser loads them
  rctx.draftsInput = JSON.parse(fs.readFileSync("redraft-drafts.json", "utf8")).c;
  vm.runInContext("SD_DRAFTS = draftsInput;", rctx);
  const R = vm.runInContext(`(function () {
    var ids = sdOrderAll(), top = function (id) { SD_CLASS_ID = id; SD_DIFF = "pickup"; SD = null; return sdBoardOrder(sdBuildPool().list).map(function (p) { return p.name; }); };
    var names = function (id) { SD_CLASS_ID = id; SD_DIFF = "pro"; SD = null; return sdBuildPool().list.map(function (p) { return p.name; }); };
    var bad = [];
    ids.forEach(function (id) { ["pickup", "pro"].forEach(function (d) {
      SD_CLASS_ID = id; SD_DIFF = d; SD = null; var pool = sdBuildPool();
      if (pool.list.length < SD_CFG.rosterSize * 3 || sdClassViable(pool)) bad.push(id + ":" + d);
    }); });
    var drafts = ["1984", "2003", "1976", "2016", "2021"].map(function (id) {
      SD_CLASS_ID = id; SD_DIFF = "pro"; SD = null; SD = sdFresh();
      while (SD.at < SD.seq.length) { var gi = SD.seq[SD.at], c = sdAiChoose(gi); if (!c) break; sdApplyPick(gi, c.name, c.row, c.b); SD.at++; }
      return SD.rosters.every(function (r) { var n = { G: 0, F: 0, C: 0 }; r.forEach(function (p) { n[p.slot]++; }); return r.length === 5 && n.G === 2 && n.F === 2 && n.C === 1; });
    });
    var copy = ids.map(function (id) { return SD_CLASSES[id].label + " " + SD_CLASSES[id].blurb; }).join(" ");
    return { n: ids.length, lo: ids[ids.length - 1], hi: ids[0], c84: top("1984").slice(0, 6), bird: names("1978").indexOf("Larry Bird") >= 0,
      jokic: names("2014").indexOf("Nikola Joki\\u0107") >= 0, pav: names("2003").indexOf("Sasha Pavlovi\\u0107") >= 0, bad: bad, drafts: drafts,
      em: copy.indexOf("\\u2014") >= 0 };
  })()`, rctx);
  eq("redrafted: every class derives from the data (1974 to 2025, 50+ classes); the 1984 offset smoke test holds",
    [R.n >= 50, R.lo, R.hi, ["Michael Jordan", "Hakeem Olajuwon", "Charles Barkley", "John Stockton"].every(n => R.c84.indexOf(n) >= 0)], [true, "1974", "2025", true]);
  eq("redrafted: redshirts and spellings land (Bird in 1978, Jokic in 2014, Pavlovic in 2003)", [R.bird, R.jokic, R.pav], [true, true, true]);
  eq("redrafted: every class fields three legal teams in both difficulties", R.bad, []);
  eq("redrafted: a full computer draft always finishes with 2 G, 2 F, 1 C a team", R.drafts, [true, true, true, true, true]);
  eq("redrafted: class labels and blurbs have zero em-dashes (copy law)", R.em, false);
  // v58 THE REAL DRAFT on PRO: the real first round in pick order (a pick with no playable season keeps its slot,
  // greyed), then the productive later picks and the undrafted; PICKUP untouched; a failed fetch falls back.
  const RD = vm.runInContext(`(function () {
    function pro(id) { SD_CLASS_ID = id; SD_DIFF = "pro"; SD = null; return sdBuildPool(); }
    function order(id) { return sdBoardOrder(pro(id).list).map(function (p) { return p.pick + ":" + p.name; }); }
    var p84 = pro("1984"), p86 = pro("1986"), p14 = pro("2014"), p96 = pro("1996");
    var sizes = sdOrderAll().every(function (id) {
      var pool = pro(id), r1 = SD_DRAFTS[id].r1.length;
      var inR1 = pool.list.filter(function (p) { return p.r1; }).length + pool.ghosts.length;
      return pool.real === 1 && inR1 === r1 && pool.r1max === SD_DRAFTS[id].r1[r1 - 1][0];
    });
    var seasonsAfter = sdOrderAll().every(function (id) {
      return pro(id).list.every(function (p) { return p.seasons.every(function (r) { return r[IDX.season] >= +id + 1 && r[IDX.mp] >= 785; }); });
    });
    var jok = p14.byName.get("Nikola Joki\\u0107"), ben = p96.byName.get("Ben Wallace");
    SD_CLASS_ID = "2016"; SD_DIFF = "pickup"; SD = null; var pick16 = sdBuildPool();
    var saved = SD_DRAFTS; SD_DRAFTS = false; SD_POOLS = {};
    var fb = pro("1984"), fbOk = !fb.real && fb.list.length >= 15 && !sdClassViable(fb);
    SD_DRAFTS = saved; SD_POOLS = {};
    return { top84: order("1984").slice(0, 5), stockton: p84.byName.get("John Stockton") && p84.byName.get("John Stockton").pick,
      bias: p86.ghosts.some(function (g) { return g.pick === 2 && g.name === "Len Bias"; }) && !p86.byName.has("Len Bias"),
      jokic: jok ? [jok.pick, jok.r1] : null, ben: ben ? [ben.pick, ben.r1] : null, sizes: sizes, after: seasonsAfter,
      pickup: !pick16.real && pick16.list.length === SD_CLASSES["2016"].names.length, fallback: fbOk };
  })()`, rctx);
  eq("redrafted PRO: the real 1984 draft in pick order (Olajuwon, Bowie, Jordan, Perkins, Barkley; Stockton at 16)",
    [RD.top84, RD.stockton], [["1:Hakeem Olajuwon", "2:Sam Bowie", "3:Michael Jordan", "4:Sam Perkins", "5:Charles Barkley"], 16]);
  eq("redrafted PRO: every class carries its whole real first round (greyed slots included), seasons only after the draft",
    [RD.sizes, RD.after], [true, true]);
  eq("redrafted PRO: a pick with no playable season keeps his slot greyed (Len Bias, 1986 #2)", RD.bias, true);
  eq("redrafted PRO: the steals and the undrafted join (Jokic 2014 #41, Ben Wallace 1996 undrafted)", [RD.jokic, RD.ben], [[41, 0], [null, 0]]);
  eq("redrafted PRO: PICKUP is unchanged, and a failed draft fetch falls back to the whole-class board", [RD.pickup, RD.fallback], [true, true]);
  // v58 the gate's front: PRO's draft of the day (a fixed rotation over every class, one story line each) and
  // PICKUP's most fun drafts (every named headliner is on that class's PICKUP board)
  const HEAD = { "1984": ["Michael Jordan", "Hakeem Olajuwon", "Charles Barkley", "John Stockton"], "1996": ["Kobe Bryant", "Allen Iverson", "Steve Nash", "Ray Allen"],
    "2003": ["LeBron James", "Dwyane Wade", "Carmelo Anthony", "Chris Bosh"], "2009": ["Stephen Curry", "James Harden", "Blake Griffin", "DeMar DeRozan"],
    "2011": ["Kawhi Leonard", "Kyrie Irving", "Klay Thompson", "Jimmy Butler"], "2018": ["Luka Don\u010di\u0107", "Shai Gilgeous-Alexander", "Trae Young", "Jalen Brunson"],
    "1998": ["Dirk Nowitzki", "Vince Carter", "Paul Pierce", "Rashard Lewis"], "2014": ["Nikola Joki\u0107", "Joel Embiid", "Zach LaVine", "Marcus Smart"] };
  rctx.HEAD = HEAD;
  const FR = vm.runInContext(`(function () {
    var ids = sdOrderAll().slice().sort(), rot = SD_DOTD_ORDER.slice().sort();
    var whys = ids.map(function (id) { return SD_DRAFT_WHY[id] || ""; });
    var heads = SD_PICKUP_FEATURED.map(function (f) {
      SD_CLASS_ID = f.id; SD_DIFF = "pickup"; SD = null;
      var names = sdBuildPool().list.map(function (p) { return p.name; });
      return (HEAD[f.id] || []).length === 4 && HEAD[f.id].every(function (n) { return names.indexOf(n) >= 0; });
    });
    return { perm: JSON.stringify(ids) === JSON.stringify(rot), days: [sdDraftOfDay("2026-09-26"), sdDraftOfDay("2026-09-27"), sdDraftOfDay("2026-11-17"), sdDraftOfDay("2026-09-25")],
      whys: whys.every(function (w) { return w.length > 20 && w.length <= 130 && w.indexOf("\\u2014") < 0 && w.indexOf("\\u2013") < 0; }),
      feats: SD_PICKUP_FEATURED.length, heads: heads.every(Boolean), featEm: SD_PICKUP_FEATURED.some(function (f) { return f.who.indexOf("\\u2014") >= 0; }) };
  })()`, rctx);
  eq("redrafted gate: the draft of the day rotates over every class once (1984 on 2026-09-26, 2014 next, back to 1984 after 52 days)",
    [FR.perm, FR.days], [true, ["1984", "2014", "1984", "2025"]]);
  eq("redrafted gate: every PRO class has a story line (no em dashes, one breath)", FR.whys, true);
  eq("redrafted gate: PICKUP's most fun drafts name only headliners on those boards", [FR.feats, FR.heads, FR.featEm], [8, true, false]);
  // v58 THE PICK IS IN: the show's words, and the roster card's landing marks (the show itself is browser-only)
  const PS = vm.runInContext(`(function () {
    SD_CLASS_ID = "1984"; SD_DIFF = "pro"; SD = sdFresh();
    var pool = sdBuildPool(), a = pool.byName.get("Michael Jordan"), b = pool.byName.get("John Stockton");
    sdApplyPick(0, a.name, a.best, "G"); sdApplyPick(0, b.name, b.best, "G");
    SD.landing = { gi: 0, names: [a.name, b.name], until: Date.now() + 5000 };
    var card = sdRosterCardHtml(0), marks = (card.match(/is-landing/g) || []).length;
    SD.landing = null;
    return { ords: [1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 41, 57, 60, 112].map(sdOrdinal).join(" "), marks: marks,
      named: card.indexOf('data-name="Michael Jordan"') >= 0 && card.indexOf('data-gi="0"') >= 0, quiet: sdRosterCardHtml(0).indexOf("is-landing") < 0 };
  })()`, rctx);
  eq("redrafted show: ordinals read right (the pick of 15, the real draft's pick)", PS.ords, "1st 2nd 3rd 4th 11th 12th 13th 21st 22nd 23rd 41st 57th 60th 112th");
  eq("redrafted show: both halves of a snake double land together, once, in named slots", [PS.marks, PS.named, PS.quiet], [2, true, true]);
}

// ---------- v58.4 THE LEDGER ADDS UP: one row per term of the engine's score, on every kind of board ----------
// The results ledger must show every term the engine charged or paid, so its rows sum to the score. The 200 new
// Dailies pay bonuses through negative taxes (Five-Out, Board Money, Win Now) and The Mid-Range charges per extra
// shooter; before v58.4 those got no row, and the shooter and usage lines printed the default targets on boards
// that move them. The copy reads the board's own settings, with plain punctuation.
{
  const L = vm.runInContext(`(function () {
    var keepG = G, keepSC = SC;
    SC = Object.assign({}, SC, { SPACERS_REQ: 3, USAGE_BUDGET: 110, AGE_VET_YEAR: 12, RIM_TOP20: 0.9 });
    function pick(n, usg, ht) { var r = []; r[IDX.name] = n; r[IDX.season] = 2000; r[IDX.usage] = usg; r[IDX.ht] = ht; return { row: r }; }
    var SIZE0 = { gBar: 74, fcBar: 78, gAmt: 2, fcAmt: 2, smallG: [], smallFC: [], gTax: 0, fcTax: 0, tax: 0 };   // v63: the engine's size settings
    function run(cfg, e) {
      G = { ch: cfg ? { id: "t", cfg: cfg } : null, picks: [["Dennis Rodman", 10.2, 78], ["Charles Barkley", 30.4, 78], ["Rod Strickland", 22.1, 74],
        ["Mark Price", 25.3, 72], ["Brad Daugherty", 22.6, 84]].map(function (x) { return pick(x[0], x[1], x[2]); }) };
      e = Object.assign({ sumV: 30.5, sumUsage: 104.2, usageTax: 0, usageBudget: 120, usageRate: 0.3, usageOver: 0, sumSp: 3, spacingTax: 0, spacingBonus: 0,
        backDefTax: 0, backDefTier: 0, wingDefTax: 0, wingDefTier: 0, rimDefTax: 0, glassTax: 0, creatorTax: 0, ageTax: 0, vetCount: 0, labelRows: [], labelTax: 0,
        size: SIZE0, smallGTax: 0, smallFCTax: 0, sizeTax: 0 }, e);
      e.labelTax = e.labelRows.reduce(function (a, r) { return a + r.amt; }, 0);
      e.score = e.sumV - e.usageTax - e.spacingTax + e.spacingBonus - e.backDefTax - e.wingDefTax - e.rimDefTax - e.glassTax - e.creatorTax - e.ageTax - e.labelTax - e.sizeTax;
      e.net = e.score - BASELINE;
      var html = resultsLedgerHtml(e), amts = [], re = /class="ledger-amt[^"]*">([^<]*)</g, m;
      while ((m = re.exec(html))) amts.push(parseFloat(m[1].replace("\u2212", "-").replace("\u2713 ", "")));
      var total = amts.slice(0, -1).reduce(function (a, b) { return a + b; }, 0);
      return { adds: Math.abs(total - e.score) < 0.051, text: html.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"'), dash: /[\u2013\u2014]/.test(html) };
    }
    var out = {
      plain: run(null, { usageTax: 2.1, sumUsage: 127, usageOver: 7, sumSp: 2, spacingTax: 1.5, backDefTax: 2, backDefTier: 33, wingDefTax: 3, wingDefTier: 20,
        rimDefTax: 2, glassTax: 3, creatorTax: 2, ageTax: 1, vetCount: 2 }),
      surplus: run(null, { sumSp: 4.5, spacingBonus: 1.5 }),
      paint: run({ RIM_TOP20: 2.5, RIM_D_TAX: 5 }, { rimDefTax: 5 }),
      fiveOut: run({ RIM_TOP20: 2, RIM_D_TAX: -3 }, { rimDefTax: -3 }),
      boardMoney: run({ GLASS_LOW: 99, GLASS_DIRE: 4.4, GLASS_TAX_DIRE: 0, GLASS_TAX_LOW: -3 }, { glassTax: -3 }),
      winNow: run({ AGE_VET_YEAR: 10, AGE_VET_FREE: 2, AGE_TAX: -4 }, { ageTax: -4, vetCount: 3 }),
      midRange: run({ SPACERS_REQ: 1, SPACING_TAX: 2, SPACING_BONUS: -1.5 }, { sumSp: 3, spacingBonus: -3 }),
      gunslingers: run({ USAGE_RATE: 0, SPACERS_REQ: 5, SPACING_TAX: 2.5 }, { sumSp: 3, spacingTax: 5 }),
      creator: run({ CREATOR_TAX: -2 }, { creatorTax: -2 }),
      tightBall: run({ USAGE_BUDGET: 100 }, { usageBudget: 100, sumUsage: 110.7, usageOver: 10.7, usageTax: 3.21 }),
      labels: run(null, { labelsOn: true, labelsBuilt: "2026-09-27T12:00:00Z", rimDefTax: 2, creatorTax: 2, labelRows: [{ id: "iso", amt: 2, who: [] },
        { id: "clutch", amt: 1, who: [] }, { id: "knuck", amt: 2, who: [0, 1] }, { id: "switch", amt: -1, who: [0, 2, 3] }, { id: "cut", amt: -1, who: [2, 1, 4] },
        { id: "stick", amt: 2, who: [0, 4] }, { id: "statpad", amt: 1, who: [2] }] }),
      ballOver: run(null, { sumUsage: 142.3, usageOver: 22.3, usageTax: 6, usageCap: 6, usageCapped: true }),
      ballAlphas: run(null, { sumUsage: 131, usageOver: 11, usageTax: 3.3, usageCap: 6, title1: [3, 1] }),
      ballOff: run({ USAGE_RATE: 0 }, { usageRate: 0, sumUsage: 150.2 }),
      size: run(null, { smallGTax: 2, smallFCTax: 2, sizeTax: 4, size: Object.assign({}, SIZE0, { smallG: [2, 3], smallFC: [0, 1], gTax: 2, fcTax: 2, tax: 4 }) })
    };
    G = keepG; SC = keepSC;
    return out;
  })()`, ctx);
  const names = Object.keys(L);
  eq("results ledger: the rows add up to the score on every kind of board (credits, charges and moved targets)",
    names.filter((k) => !L[k].adds), []);
  eq("results ledger: bonuses paid through a negative tax get a credit row (Five-Out, Board Money, Win Now, a creator board)",
    [/Five-out bonus/.test(L.fiveOut.text), /Glass bonus/.test(L.boardMoney.text), /Veteran bonus/.test(L.winNow.text), /Creator bonus/.test(L.creator.text)],
    [true, true, true, true]);
  eq("results ledger: the targets are the board's own (The Mid-Range's 1 shooter, Gunslingers' 5, The Triangle's ball of 100, Win Now's 10th season, Paint Police's +2.5 bar)",
    [/target of 1\b/.test(L.midRange.text), /3 of 5 required/.test(L.gunslingers.text), /can share 100\b/.test(L.tightBall.text), /10th season/.test(L.winNow.text),
      /\+2\.5 DBPM/.test(L.paint.text), /2 of 3 required/.test(L.plain.text), /can share 120\b/.test(L.plain.text), /12th season/.test(L.plain.text)],
    [true, true, true, true, true, true, true, true]);
  eq("results ledger: no em or en dashes in any row (the copy law)", names.filter((k) => L[k].dash), []);
  eq("results ledger: the label rows print with their names and their note (v61)",
    [/No ISO-D/.test(L.labels.text), /Two knuckleheads \(D\. Rodman, C\. Barkley\)\. They.ll start hanging out/.test(L.labels.text),
      /Three switchable defenders \(D\. Rodman, R\. Strickland, M\. Price\)/.test(L.labels.text), /A playmaker \(R\. Strickland\) and two off-ball scorers \(C\. Barkley, B\. Daugherty\)/.test(L.labels.text),
      /nobody is tagged RIM-P/.test(L.labels.text), /nobody is tagged PLAY/.test(L.labels.text), /tags as of Sep 27/.test(L.labels.text), /tagged RIM-P/.test(L.plain.text),
      /Dueling Banjos/.test(L.labels.text),
      /The ball sticks\s+Two players who hold the ball \(D\. Rodman, B\. Daugherty\)\. It goes in and it does not come out\./.test(L.labels.text),
      /Stat padding\s+A stat padder \(R\. Strickland\)\. Karma for your stat padding sins\./.test(L.labels.text)],
    [true, true, true, true, true, true, true, false, false, true, true]);
  eq("results ledger: one ball names the biggest ball users and the board's share, reads under the budget and off boards plainly; the size rows name the small men (v63)",
    [/One ball\s+Your five use 142 of the ball \(C\. Barkley 30, M\. Price 25, B\. Daugherty 23\)\. A five can share 120; each point past it costs 0\.3, never more than 6\. The stars figure it out, but somebody still has to set the screens\./.test(L.ballOver.text),
      /One ball\s+Your five use 127 of the ball \(C\. Barkley 30, M\. Price 25, B\. Daugherty 23\)\. A five can share 120; each point past it costs 0\.3\. Somebody has to set a screen\./.test(L.plain.text) &&
        /One ball\s+Your five use 131 of the ball \(.*\)\. A five can share 120; each point past it costs 0\.3, never more than 6\. Took the alphas some time to figure out how to play together and not just alongside each other\./.test(L.ballAlphas.text),
      /One ball\s+Your five use 104 of the ball, inside the 120 a five can share\./.test(L.surplus.text),
      /One ball\s+Off on today.s board: your five use 150 of the ball, free\./.test(L.ballOff.text),
      /Two small guards\s+Both guards 6'2" or shorter \(R\. Strickland 6'2", M\. Price 6'0"\)\. One small guard can hide; two get posted up and shot over\./.test(L.size.text),
      /Small frontcourt\s+Two frontcourt players 6'6" or shorter \(D\. Rodman 6'6", C\. Barkley 6'6"\)\. One undersized big is fine; two, and the other team lives on the offensive glass\./.test(L.size.text),
      /small guards|Small frontcourt|20-point|Too short/.test(L.plain.text)],
    [true, true, true, true, true, true, false]);
}

// v63 ONE BALL and SIZE BY UNIT (sim-core oneBall, sizeUnits, the engine): a five shares 120 of usage free and pays 0.3
// a point past it (a board moves either); points do not count, only usage; two guards 6'2" or shorter cost 2 and two or
// more F/C 6'6" or shorter cost 2 (by the slot he plays; a missing height never counts; a board's 0 turns either off; a
// partial five pays once two small men share a unit); the score adds them up; the 20-point rule and its chip are gone.
{
  const R = vm.runInContext(`(function () {
    function row(n, usg, ht) { var r = []; r[IDX.name] = n; r[IDX.season] = 2000; r[IDX.bpm_star] = 2; r[IDX.usage] = usg; r[IDX.sp] = 0; r[IDX.dbpm] = 0;
      r[IDX.obpm] = 0; r[IDX.rpg] = 5; r[IDX.apg] = 5; r[IDX.ppg] = 30; r[IDX.ht] = ht; return r; }
    function five(usgs, hts) { return usgs.map(function (u, i) { return row("p" + i, u, hts ? hts[i] : 80); }); }
    var slots = ["G", "G", "F", "F", "C"], BASE = { RIM_TOP20: 0.9, RIM_D_TAX: 2 };
    function eng(rows, cfg, sl) { return T82.engine({ ch: { cfg: Object.assign({}, BASE, cfg || {}) } }, rows, sl || slots); }
    function r2(x) { return Math.round(x * 1000) / 1000; }
    var out = {};
    out.ball = [[30, 28, 26, 22, 14], [30, 28, 26, 22, 24], [40, 38, 36, 34, 30]].map(function (u) { return r2(eng(five(u)).usageTax); });
    out.ballBoards = [r2(eng(five([30, 28, 26, 22, 14]), { USAGE_BUDGET: 100 }).usageTax), eng(five([40, 38, 36, 34, 30]), { USAGE_RATE: 0 }).usageTax,
      r2(eng(five([30, 28, 26, 22, 24]), { USAGE_BUDGET: 110, USAGE_RATE: 0.09375 }).usageTax)];
    out.ballNoPpg = eng(five([20, 20, 20, 20, 20])).usageTax;
    out.ballCap = [eng(five([40, 38, 36, 34, 30]), { USAGE_CAP: 12 }).usageTax, r2(eng(five([40, 38, 36, 34, 30]), { USAGE_BUDGET: 110, USAGE_RATE: 0.4, USAGE_CAP: 10 }).usageTax)];
    out.size = [[74, 74, 80, 80, 84], [74, 75, 80, 80, 84], [73, 0, 80, 80, 84], [76, 76, 78, 78, 84], [76, 76, 78, 79, 84], [76, 76, 78, 77, 76], [74, 74, 78, 78, 78]]
      .map(function (h) { return eng(five([20, 20, 20, 20, 20], h)).sizeTax; });
    out.sizeBoards = [eng(five([20, 20, 20, 20, 20], [74, 74, 78, 78, 84]), { SMALL_G_TAX: 0 }).sizeTax, eng(five([20, 20, 20, 20, 20], [74, 74, 78, 78, 84]), { SMALL_FC_TAX: 0 }).sizeTax];
    out.sizeSlot = eng(five([20, 20, 20, 20, 20], [74, 80, 74, 78, 84])).sizeTax;
    out.partial = [T82.sizeUnits({ ch: null }, five([1, 1], [72, 73]), ["G", "G"]).tax, T82.sizeUnits({ ch: null }, five([1], [72]), ["G"]).tax];
    var e = eng(five([40, 38, 36, 34, 30], [74, 74, 78, 78, 84]));
    out.adds = Math.abs(e.sumV - e.usageTax - e.spacingTax + e.spacingBonus - e.backDefTax - e.wingDefTax - e.rimDefTax - e.glassTax - e.creatorTax - e.ageTax - e.labelTax - e.sizeTax - e.score) < 1e-9;
    out.parts = [e.usageBudget, e.usageRate, e.usageOver, e.smallGTax, e.smallFCTax, e.usageCap, e.usageCapped];
    out.gone = [typeof T82.scorersAndSize, typeof scorerChipHtml, typeof trayFitHtml, "oneBallTax" in e, "shortTax" in e];
    return out;
  })()`, ctx);
  eq("one ball: 120 of usage is free, each point past it costs 0.3, never more than 6 (130 costs 3, five alphas at 178 cost 6, v63.1)", R.ball, [0, 3, 6]);
  eq("one ball: a board moves the budget or the rate (The Triangle's 100; a usage-off board; Volume Merchants' old 110 at 0.09375)", R.ballBoards, [6, 0, 1.875]);
  eq("one ball: points never count, only usage (five 30-point scorers who use 20 each pay nothing)", R.ballNoPpg, 0);
  eq("one ball: a board lifts the cap (Tax Season 12, The Luxury Tax 10)", R.ballCap, [12, 10]);
  eq("size by unit: two guards 6'2\" or shorter cost 2, 6'3\" does not, a missing height never counts; two or more F/C 6'6\" or shorter cost 2, three still 2; both units 4",
    R.size, [2, 0, 0, 2, 0, 2, 4]);
  eq("size by unit: a board's 0 turns either off; the unit is the slot he plays (a 6'2\" forward is a small big); a partial five pays once two small guards are in",
    [R.sizeBoards, R.sizeSlot, R.partial], [[2, 2], 2, [2, 0]]);
  eq("one ball and size: the score adds them up and the engine reports its settings", [R.adds, R.parts], [true, [120, 0.3, 58, 2, 2, 6, true]]);
  eq("the 20-point rule is gone: no scorersAndSize, no 20+ chip, no tray warning lines, no oneBallTax or shortTax", R.gone, ["undefined", "undefined", "undefined", false, false]);
}

// v63 THE BOARD AND THE TRAY: a height turns red only when every legal open slot would make the pick the second small
// man in his unit (never in Pro; plain on the Do-Over board); v63.1: no ball meter in the tray (the owner removed it).
{
  const B = vm.runInContext(`(function () {
    var keepG = G, keepMode = MODE, keepResolve = resolveRow, keepBlock = pickBlock, sel = null;
    function row(n, usg, ht, g, f, c) { var r = []; r[IDX.name] = n; r[IDX.season] = 2000; r[IDX.bpm_star] = 2; r[IDX.usage] = usg; r[IDX.sp] = 0; r[IDX.dbpm] = 0;
      r[IDX.obpm] = 0; r[IDX.rpg] = 5; r[IDX.apg] = 5; r[IDX.ppg] = 10; r[IDX.ht] = ht; r[IDX.g_pct] = g; r[IDX.f_pct] = f; r[IDX.c_pct] = c; return r; }
    var out = {};
    MODE = "classic";
    G = { ch: null, mode: "classic", screen: "draft", filled: { G: 1, F: 0, C: 0 }, picks: [{ row: row("zz small one", 30, 72, 100, 0, 0), slot: "G" }] };
    function red(r) { return /is-small/.test(heightTag(r)); }
    out.guard = [red(row("zz small guard", 20, 73, 100, 0, 0)), red(row("zz small wing", 20, 73, 60, 40, 0)), red(row("zz tall guard", 20, 75, 100, 0, 0))];
    G.filled = { G: 2, F: 1, C: 0 }; G.picks.push({ row: row("zz guard two", 20, 77, 100, 0, 0), slot: "G" }, { row: row("zz small four", 20, 76, 0, 100, 0), slot: "F" });
    out.big = [red(row("zz small forward", 20, 77, 0, 100, 0)), red(row("zz big forward", 20, 80, 0, 100, 0))];
    out.why = /a second small big costs 2/.test(heightTag(row("zz small forward", 20, 77, 0, 100, 0)));
    MODE = "pro"; out.pro = heightTag(row("zz small forward", 20, 77, 0, 100, 0));
    MODE = "classic"; out.sd = heightTag(row("zz small forward", 20, 77, 0, 100, 0), true);
    out.noMeter = [typeof trayBallHtml, /tray-ball/.test(trayHtml.toString())];   // v63.1: the owner removed the meter
    resolveRow = keepResolve; pickBlock = keepBlock; G = keepG; MODE = keepMode;
    return out;
  })()`, ctx);
  eq("board heights: red only when every legal open slot makes him the second small guard (a G/F who can play forward is not red; 6'3\" is not)", B.guard, [true, false, false]);
  eq("board heights: the second small frontcourt player is red and says why; a 6'8\" forward is not; Pro shows no height; the Do-Over board shows it plain",
    [B.big, B.why, B.pro, B.sd], [[true, false], true, "", " · 6'5\""]);
  eq("the tray has no ball meter (v63.1, the owner: \"remove the usage bar on classic draft\")", B.noMeter, ["undefined", false]);
}

// v63: a board whose own rule forces a short five turns both size units off; a board that forces a five of volume
// scorers keeps the old gentle usage tax; the boards that twist the usage tax restate the twist against the new normal;
// Tax Holiday turns every fit rule off; no board carries v62's ONEBALL_* or SHORT_* keys.
{
  const bctx = { Math, Date, console, JSON, URLSearchParams };
  vm.createContext(bctx);
  vm.runInContext(fs.readFileSync("challenges.js", "utf8"), bctx);
  const by = bctx.T82CH.byId, cfgOf = (id, k) => (by[id] && by[id].cfg ? by[id].cfg[k] : undefined);
  const stale = Object.keys(by).filter((id) => by[id].cfg && Object.keys(by[id].cfg).some((k) => /^(ONEBALL_|SHORT_)/.test(k)));
  eq("boards (v63): the short boards turn both size units off, Height Cap keeps them; Volume Merchants keeps 110 at 0.09375; the usage twists; Tax Holiday; no stale keys",
    [["short_kings", "small_ball_apoc", "small_blind", "small_ball_five", "tax_holiday"].map((id) => [cfgOf(id, "SMALL_G_TAX"), cfgOf(id, "SMALL_FC_TAX")]),
      cfgOf("height_cap", "SMALL_G_TAX"), [cfgOf("volume_scorers", "USAGE_BUDGET"), cfgOf("volume_scorers", "USAGE_RATE")],
      [cfgOf("luxury_tax", "USAGE_BUDGET"), cfgOf("luxury_tax", "USAGE_RATE"), cfgOf("the_triangle", "USAGE_BUDGET"), cfgOf("superteam", "USAGE_BUDGET"),
        cfgOf("tax_season", "USAGE_RATE"), cfgOf("tax_season", "SMALL_G_TAX"), cfgOf("tax_holiday", "USAGE_RATE")], stale],
    [[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], undefined, [110, 0.09375], [110, 0.4, 100, 105, 0.6, 4, 0], []]);
}

// v61 THE LABEL TAXES (sim-core labelTaxes and engine): a role nobody fills costs net and a "?" fills it; the
// knuckleheads and the two credits read settled tags only; a board can switch one off; the rim and creator taxes
// fire only when the stats and the tags agree (never a board's bonus); no tags file, no label taxes.
{
  const TR = ["three-point-shooter", "super-three-point-shooter", "rim-pressurer", "off-ball-scorer", "tough-shot-maker", "playmaker",
    "iso-defender", "team-defender", "switchable-defender", "rim-protector", "clutch", "championship-number-one", "hunted",
    "ball-stopper", "ball-pounder", "foul-merchant", "stat-padder", "off-court-knucklehead"];
  const code = (o) => Object.keys(o).map((t) => TR.indexOf(t).toString(36) + o[t]).join("");
  ctx.lblInput = { v: 1, built: "2026-09-27T00:00:00Z", traits: TR, p: {
    "stopper": { "2000": code({ "iso-defender": "y", "clutch": "y", "switchable-defender": "y", "off-court-knucklehead": "y" }) },
    "maybe": { "2000": code({ "iso-defender": "u", "switchable-defender": "y", "off-court-knucklehead": "y" }) },
    "bigman": { "2000": code({ "rim-protector": "u", "team-defender": "y", "switchable-defender": "y", "off-court-knucklehead": "u" }) },
    "passer": { "2000": code({ "playmaker": "y", "off-ball-scorer": "y", "rim-pressurer": "y", "tough-shot-maker": "y" }) },
    "cutter": { "2000": code({ "off-ball-scorer": "y" }) },
    "cutter two": { "2000": code({ "off-ball-scorer": "y" }) },
    "jose calderon": { "2000": code({ "playmaker": "u" }) },
    "alpha one": { "2000": code({ "championship-number-one": "y", "playmaker": "y" }) },
    "alpha two": { "2000": code({ "championship-number-one": "y" }) },
    "alpha maybe": { "2000": code({ "championship-number-one": "u" }) },
    "holder one": { "2000": code({ "ball-stopper": "y" }) }, "holder two": { "2000": code({ "ball-pounder": "y" }) },
    "holder both": { "2000": code({ "ball-stopper": "y", "ball-pounder": "y" }) },
    "hunted one": { "2000": code({ "hunted": "y" }) }, "hunted two": { "2000": code({ "hunted": "y" }) }, "hunted maybe": { "2000": code({ "hunted": "u" }) },
    "whistle one": { "2000": code({ "foul-merchant": "y" }) }, "whistle two": { "2000": code({ "foul-merchant": "y" }) },
    "padder": { "2000": code({ "stat-padder": "y" }) }, "padder two": { "2000": code({ "stat-padder": "y" }) }, "padder maybe": { "2000": code({ "stat-padder": "u" }) } } };
  const R = vm.runInContext(`(function () {
    T82.setLabels(lblInput);
    function row(n, dbpm) { var r = []; r[IDX.name] = n; r[IDX.season] = 2000; r[IDX.bpm_star] = 2; r[IDX.usage] = 20; r[IDX.sp] = 0; r[IDX.dbpm] = dbpm || 0;
      r[IDX.obpm] = 0; r[IDX.rpg] = 5; r[IDX.apg] = 5; return r; }
    function ids(names, cfg) { return T82.labelTaxes({ ch: cfg ? { cfg: cfg } : null }, names.map(function (n) { return row(n); })).rows.map(function (r) { return r.id + (r.amt > 0 ? "+" : "") + r.amt; }); }
    var S = { ch: { cfg: { RIM_TOP20: 0.9, RIM_D_TAX: 2, USAGE_RATE: 0, USAGE_BUDGET: 999 } } }, slots = ["G", "G", "F", "F", "C"];
    var eng = function (names, st) { return T82.engine(st || S, names.map(function (n) { return row(n); }), slots); };
    var out = {
      none: ids(["nobody a", "nobody b", "nobody c", "nobody d", "nobody e"]),
      maybeFills: ids(["maybe", "nobody b"]).indexOf("iso+2") < 0,
      knuck2: ids(["stopper", "maybe"]).filter(function (x) { return /^knuck/.test(x); }),
      knuckMaybe: ids(["stopper", "bigman"]).filter(function (x) { return /^knuck/.test(x); }),
      switch3: ids(["stopper", "maybe", "bigman"]).filter(function (x) { return /^switch/.test(x); }),
      cutSame: ids(["passer"]).filter(function (x) { return /^cut/.test(x); }),
      cutPair: ids(["passer", "cutter"]).filter(function (x) { return /^cut/.test(x); }),
      cutTrio: ids(["passer", "cutter", "cutter two"]).filter(function (x) { return /^cut/.test(x); }),
      boardOff: ids(["nobody a"], { LBL_ISO_TAX: 0 }).indexOf("iso+2") < 0,
      rimStat: eng(["nobody a", "nobody b", "nobody c", "nobody d", "nobody e"]).rimDefTax,
      rimTag: eng(["nobody a", "nobody b", "nobody c", "nobody d", "bigman"]).rimDefTax,
      fiveOut: eng(["nobody a", "nobody b", "nobody c", "nobody d", "bigman"], { ch: { cfg: { RIM_TOP20: 0.9, RIM_D_TAX: -3 } } }).rimDefTax,
      scoreSum: (function () { var e = eng(["stopper", "maybe", "bigman", "passer", "cutter"]); return Math.abs(e.sumV - e.usageTax - e.spacingTax + e.spacingBonus - e.backDefTax - e.wingDefTax - e.rimDefTax - e.glassTax - e.creatorTax - e.ageTax - e.labelTax - e.sizeTax - e.score) < 1e-9 && e.labelRows.length > 0; })(),
      folded: !!T82.labelsOf("Jos\u00E9 Calder\u00F3n", 2000),
      // v62.1 the Dueling Banjos Tax: two settled TITLE #1s cost 2; a "?" never counts; a board's 0 turns it off
      banjo: [ids(["alpha one", "alpha two"]).filter(function (x) { return /^banjo/.test(x); }),
        T82.labelTaxes({ ch: null }, [row("alpha one"), row("alpha maybe"), row("alpha two")]).title1],
      pairs: (function () {
        function only(list, re, cfg) { return ids(list, cfg).filter(function (x) { return re.test(x); }); }
        return [only(["holder one", "holder two"], /^stick/), only(["holder both", "nobody a"], /^stick/), only(["hunted one", "hunted two"], /^hunted/),
          only(["hunted one", "hunted maybe"], /^hunted/), only(["whistle one", "whistle two"], /^foul/), only(["padder"], /^statpad/),
          only(["padder", "padder two"], /^statpad/), only(["padder maybe"], /^statpad/),
          only(["holder one", "holder two", "hunted one", "hunted two", "whistle one", "whistle two", "padder"], /^(stick|hunted|foul|statpad)/,
            { LBL_STICK_TAX: 0, LBL_HUNTED_TAX: 0, LBL_FOUL_TAX: 0, LBL_STATPAD_TAX: 0 })];
      })(),
      banjoBoard: (function () {
        var keepG = G, keepMode = MODE, o = {};
        MODE = "classic"; G = { ch: null, screen: "draft", picks: [] };
        G.picks = [{ row: row("alpha one") }];
        o.offBoard = !/TITLE #1/.test(boardTagsHtml(row("alpha two")) + boardTagsHtml(row("alpha one")));   // v63.1: it no longer charges, so it leaves the board
        G.picks = [{ row: row("alpha one") }, { row: row("alpha two") }];
        o.trayQuiet = !/Banjo|Tag taxes/.test(trayRolesHtml() || "");   // v63: the tray keeps the roles only; the bill is the Scoring Card's
        // v63 the badge order and the "?": positives first, then negatives; a "?" role tag shows like a settled one
        function chips(n) { var m, re = />([A-Z0-9#+ -]+)<\\/button>/g, h = boardTagsHtml(row(n)), o2 = []; while ((m = re.exec(h))) o2.push(m[1]); return o2; }
        o.order = [chips("stopper"), chips("bigman"), chips("maybe")];
        o.noMaybe = !/is-maybe|\\?/.test(boardTagsHtml(row("bigman")) + boardTagsHtml(row("maybe")));
        G = keepG; MODE = keepMode;
        return o;
      })()
    };
    T82.setLabels(null);
    var e0 = eng(["nobody a", "nobody b", "nobody c", "nobody d", "nobody e"]);
    out.failSoft = [e0.labelTax, e0.labelRows.length, e0.labelsOn, e0.rimDefTax];
    return out;
  })()`, ctx);
  eq("label taxes: a lineup with no tags pays every role (ISO-D 2, CLUTCH 1, TEAM-D 1, RIM+ 1, TSHOT 1)", R.none, ["iso+2", "clutch+1", "teamd+1", "rimplus+1", "tshot+1"]);
  eq("label taxes: a '?' fills a role; knuckleheads count settled tags only (two cost 2, a '?' third does not count)", [R.maybeFills, R.knuck2, R.knuckMaybe], [true, ["knuck+2"], []]);
  eq("label taxes: switch everything needs three settled SWITCH; the cutters credit needs a playmaker and two other off-ball scorers; a board can switch a tax off",
    [R.switch3, R.cutSame, R.cutPair, R.cutTrio, R.boardOff], [["switch-1"], [], [], ["cut-1"], true]);
  eq("label taxes: the rim tax fires only when the stats and the tags agree (a RIM-P '?' clears it; a Five-Out bonus is still paid)",
    [R.rimStat, R.rimTag, R.fiveOut], [2, 0, -3]);
  eq("label taxes: the score adds the rows up; names fold accents (Calderon); no tags file, no label taxes", [R.scoreSum, R.folded, R.failSoft], [true, true, [0, 0, false, 2]]);
  eq("dueling banjos (v63.1): two settled TITLE #1s no longer charge on their own; the engine names the settled ones for the one-ball row ('?' never counts)", R.banjo, [[], [0, 2]]);
  eq("the Simmons pairs (v62.2): two who hold the ball cost 2 (one player with both tags counts once), two hunted 2 (a '?' never counts), two foul merchants 1, every stat padder 1 (a '?' never counts), a board's 0 turns them off",
    R.pairs, [["stick+2"], [], ["hunted+2"], [], ["foul+1"], ["statpad+1"], ["statpad+2"], [], []]);
  eq("TITLE #1 on the board (v63.1): gone with the Banjos charge; the tray stays quiet (v63: the Scoring Card has the bill)",
    [R.banjoBoard.offBoard, R.banjoBoard.trayQuiet], [true, true]);
  eq("board badges (v63): positives first, then negatives, in the results cards' order; a '?' role tag shows plain (it fills its role); a '?' reputation stays hidden",
    [R.banjoBoard.order, R.banjoBoard.noMaybe], [[["ISO-D", "CLUTCH", "KNUCK"], ["TEAM-D", "RIM-P"], ["ISO-D", "KNUCK"]], true]);
}

// v64 THE THIRD PLAYTEST (the owner's voice notes, 2026-09-28): the draft bar's diamonds carry the count (PICK N OF 5
// for screen readers only), a quiet HOW TO PLAY, Presti without the "skips" line and without tags (board and tray), the
// bank's flip, DID WE GET ONE WRONG? under the Scoring Card, the home card's bigger diamonds and the vote room's stamp.
{
  const V = vm.runInContext(`(function () {
    var keepG = G, keepMode = MODE, keepDoc = document, keepST = setTimeout, o = {};
    MODE = "cap"; G = { ch: null, screen: "draft", picks: [], budget: 50, meterMax: 50, round: 1 };
    var panel = modePanelHtml();
    o.presti = [/SKIPS/.test(panel), /mp-row2/.test(panel), /class="mp-rules tm-flat"/.test(panel), /presti-spin|mp-rules-btn|t-btn/.test(panel),
      /id="bankAmt"/.test(panel), /bankDed/.test(panel)];
    MODE = "classic"; G = { ch: null, screen: "draft", picks: [], round: 1 };
    var cpanel = modePanelHtml(), bar = draftUtilityHtml();
    o.classic = [/TAP THE YEAR/.test(cpanel), /class="mp-rules tm-flat"/.test(cpanel), /class="du-count sr-only"[^>]*aria-live="polite"/.test(bar)];
    // Presti is drafted from memory: its card builder prints no tags, and the tray names no tag roles (Pro was already so)
    MODE = "cap"; G = { ch: null, screen: "draft", picks: [{}, {}, {}], round: 4 };
    o.tags = [/boardTagsHtml\\(/.test(String(capRowHtml)), trayRolesHtml(), /inkPrint\\(pips, pips\\.children\\[n - 1\\], "dia"\\)/.test(String(draftInk))];
    o.fix = ledgerFixHtml("Sep 28");
    // THE FLIP on a stand-in bank: a spend flips to the transaction in red and drains the meter; a re-render mid-flip keeps
    // it without a second slam; then the neon comes back and the balance counts down to the new amount; a refund flips green
    var timers = {}, tid = 0;
    setTimeout = function (fn) { timers[++tid] = fn; return tid; };
    clearTimeout = function (id) { delete timers[id]; };
    setInterval = function (fn) { timers[++tid] = fn; return tid; };
    clearInterval = function (id) { delete timers[id]; };
    function cls() { var s = {}; return { add: function () { for (var i = 0; i < arguments.length; i++) s[arguments[i]] = 1; },
      remove: function () { for (var i = 0; i < arguments.length; i++) delete s[arguments[i]]; },
      toggle: function (c, on) { if (on === undefined) on = !s[c]; if (on) s[c] = 1; else delete s[c]; return on; },
      contains: function (c) { return !!s[c]; }, list: function () { return Object.keys(s).filter(function (c) { return /flip|down|up|slam/.test(c); }).sort(); } }; }
    var box = { classList: cls() }, amt = { innerHTML: "", classList: cls(), offsetWidth: 1, closest: function () { return box; } }, fill = { style: {} };
    document = { getElementById: function (id) { return id === "bankAmt" ? amt : id === "bankFill" ? fill : null; },
      querySelector: function () { return null; }, addEventListener: function () {} };
    function txt() { return amt.innerHTML.replace(/<[^>]+>/g, ""); }
    MODE = "cap"; G = { budget: 41, bankShown: 50, meterMax: 50, picks: [{}] };
    tickBank();
    o.flip = [txt(), box.classList.list(), amt.classList.contains("bank-slam"), fill.style.width, G.bankShown];
    amt.classList.remove("bank-slam");
    tickBank();
    o.again = [txt(), amt.classList.contains("bank-slam")];
    var hold = G.bankFlipT; timers[hold](); delete timers[hold];
    for (var n = 0; n < 8 && G.bankAnim; n++) timers[G.bankAnim]();
    o.counted = [txt(), G.bankShown, box.classList.list()];
    Object.keys(timers).forEach(function (id) { var f = timers[id]; delete timers[id]; f(); });
    o.settled = box.classList.list();
    G.budget = 42; tickBank();
    o.refund = [txt(), box.classList.list()];
    document = keepDoc; setTimeout = keepST; MODE = keepMode; G = keepG;
    return o;
  })()`, ctx);
  eq("v64 Presti's panel: no SALARY CAP · SKIPS line (no empty status row), the quiet HOW TO PLAY (a plain .mp-rules, never the neon kinds), the bank, no corner chip",
    V.presti, [false, false, true, false, true, false]);
  eq("v64 the draft bar: Classic keeps its status line and the quiet HOW TO PLAY; PICK N OF 5 is for screen readers only (still announced)",
    V.classic, [true, true, true]);
  eq("v64 Presti hides the tags: its cards print none, the tray names no tag roles; a pick's diamond rings the big-diamond size",
    V.tags, [false, "", true]);
  eq("v64 DID WE GET ONE WRONG?: the question in two inks, the + and a tag to vote, the arrow button, the frozen-tags date",
    [/pb-ink" data-ink="DID WE GET ONE WRONG\?"/.test(V.fix), /tap <b>\+<\/b> to add a tag, or tap a tag to vote/.test(V.fix), /id="ledgerFixBtn"/.test(V.fix),
      /\u2191/.test(V.fix), /tags as of Sep 28\. Votes count from the next weekly update/.test(V.fix)], [true, true, true, true, true]);
  eq("v64 the bank's flip: a $9M pick flips the bank red to \u2212$9M with a slam and drains the meter to 82%, the balance still $50M underneath",
    V.flip, ["\u2212$9M", ["bank-down", "bank-flip"], true, "82%", 50]);
  eq("v64 the bank's flip: a re-render mid-flip keeps the transaction and does not slam again", V.again, ["\u2212$9M", false]);
  eq("v64 the bank's flip: the neon comes back and the balance counts down to $41M; then the flash clears; a refund flips green to +$1M",
    [V.counted, V.settled, V.refund], [["$41M", 41, ["bank-down"]], [], ["+$1M", ["bank-flip", "bank-up"]]]);
  const BONUSES = fs.readFileSync("bonuses/index.html", "utf8");
  eq("v64 styles: the home card's diamonds at 13px (12px at 320), the draft's big diamonds, the bank's one ink and its flip, the stamp shared from styles.css (not the page), no corner chip",
    [/\.hm-dia\.ink-dias > i \{ width: 13px; height: 13px; \}/.test(STYLES), /\.hm-dia\.ink-dias > i \{ width: 12px; height: 12px; \}/.test(STYLES),
      /\.du-pips\.ink-dias > span \{ width: clamp\(15px, 5vw, 21px\)/.test(STYLES), /\.mp-bank \{\n  --bank-ink: var\(--t-offset\);/.test(STYLES),
      /\.mp-bank\.bank-flip\.bank-down \{/.test(STYLES), /\.pb-stamp\{/.test(STYLES) && !/\.pb-stamp\{/.test(BONUSES), /mpb-delta/.test(STYLES)],
    [true, true, true, true, true, true, false]);
}

// v64.1 THE SPEED PASS: the versioned files are cached for a year (_headers), so every reference must carry the file's
// key and a changed file must get a new key (node tools/cache-keys.js --stamp <key>), or returning players keep the
// old file; the vote card deals in one request (featured=1); the reel's strips redo only the moving rect (checked
// pixel for pixel against the whole-strip path in the browser, ?risofull=1) and the giant L prints in idle moments.
{
  const CK = require("./tools/cache-keys.js");
  eq("v64.1 cache keys: every immutable file matches its stamped key, every page asks for it with that key, and _headers caches exactly those files",
    CK.check(), []);
  const TMJS = String(vm.runInContext("tmSessionLoader", ctx));
  eq("v64.1 the vote card: one request deals the card with the featured call pinned server-side (no op=featured round trip first)",
    [/featured=1/.test(TMJS), /op=featured/.test(TMJS)], [true, false]);
  const REEL = fs.readFileSync("reel-riso.js", "utf8");
  eq("v64.1 the reel: strips redo only the moving rect (with the whole-strip QA switch), and the L prints level by level (on demand when a loss needs one first)",
    [/function dirtyRect\(S, t\)/.test(REEL), /risofull=1/.test(REEL), /function Llevel\(ink, i\)/.test(REEL), /requestIdleCallback/.test(REEL), !/function buildL\(/.test(REEL)],
    [true, true, true, true, true]);
}

// v67 THE ART VARIANTS (art-core.js, tools/art-index.js, art/CONTRACT.md): the owner wants many looks for the reel's
// giant L, its win and loss dots and the results mountain, ten in a row all different, at no cost on an iPhone SE.
// Each look is one small file that this device's shuffle bag deals; the bags, the QA switch and the game's wiring are
// pure, so they are pinned here (the downloads themselves are browser-only).
{
  const ART_CORE = fs.readFileSync("art-core.js", "utf8");
  // one visit to the site: art-core.js in a fresh sandbox; the disk persists across visits like a phone's storage
  const visit = (disk, host, search) => {
    const c = { Math, JSON, console, location: { hostname: host == null ? "localhost" : host, search: search || "" } };
    if (disk === "private") c.localStorage = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } };
    else if (disk) c.localStorage = { getItem: (k) => (k in disk ? disk[k] : null), setItem: (k, v) => { if (disk.full) throw new Error("full"); disk[k] = String(v); } };
    vm.createContext(c);
    vm.runInContext(ART_CORE, c);
    return c.T82ART;
  };
  const entry = (kind, id, on) => ({ kind, id, name: id, file: "art/" + kind + "/" + id + ".js?v=t", on: on !== false });
  const library = (A, ids, more) => { A.index(ids.map((id) => entry("loss", id)).concat(more || [])); A.add("loss", "classic", { builtin: true }); return A; };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const SEVEN = ["a", "b", "c", "d", "e", "f", "g"];

  // a season plays 1 to 4 looks of a peek of 4, in order; the bag must hold across seasons and visits
  let cycles = true, twice = 0;
  for (let trial = 0; trial < 80; trial++) {
    const disk = {}, seq = [];
    for (let season = 0; season < 14; season++) {
      const A = library(visit(disk), SEVEN), d = A.deal("loss", 4);
      d.slice(0, 1 + (trial + season) % 4).forEach((id) => { A.used("loss", id); seq.push(id); });
    }
    for (let i = 0; i + 8 <= seq.length; i += 8) if (new Set(seq.slice(i, i + 8)).size !== 8) cycles = false;
    for (let i = 1; i < seq.length; i++) if (seq[i] === seq[i - 1]) twice++;
  }
  eq("art bags: every enabled look (the built-in classic too) plays once before any repeats, across refills and visits; never the same look twice running",
    [cycles, twice], [true, 0]);
  let lastFirst = 0, aheadFirst = 0;
  for (let t = 0; t < 150; t++) {
    const disk = {}, A = library(visit(disk), ["a", "b"]), whole = A.deal("loss", 3);
    whole.slice(0, 3).forEach((id) => A.used("loss", id));                 // the cycle runs out and the next begins
    if (library(visit(disk), ["a", "b"]).deal("loss", 1)[0] === whole[2]) lastFirst++;
    const ahead = library(visit({}), ["a", "b", "c"]).deal("loss", 12);   // cycles of 4 drawn ahead for a long peek
    if (ahead[4] === ahead[3] || ahead[8] === ahead[7]) aheadFirst++;
  }
  eq("art bags: a refill never starts with the look that played last (also when a long peek draws cycles ahead)", [lastFirst, aheadFirst], [0, 0]);
  {
    const disk = {}, A = library(visit(disk), SEVEN), p1 = A.deal("loss", 5), p2 = A.deal("loss", 5), p3 = library(visit(disk), SEVEN).deal("loss", 5);
    A.used("loss", p1[0]);
    const after = A.deal("loss", 4);
    A.used("loss", p1[2]);                                                    // the reel skipped p1[1] (its file never came)
    const skipped = A.deal("loss", 3);
    eq("art bags: deal only peeks (twice in a row, and on the next visit, the same looks); used takes the look that played, and a skipped look keeps its place",
      [same(p1, p2), same(p2, p3), same(after, p1.slice(1, 5)), same(skipped, [p1[1], p1[3], p1[4]])], [true, true, true, true]);
  }
  {
    const disk = {}, ids = ["a", "b", "c", "d"];
    let A = library(visit(disk), ids, [entry("loss", "x", false)]), seen = new Set();
    for (let n = 0; n < 30; n++) { const d = A.deal("loss", 3); d.forEach((id) => seen.add(id)); A.used("loss", d[0]); }
    A = library(visit(disk), ["a", "c", "d"], [entry("loss", "b", false)]);   // b switched off, x deleted: both leave the bag
    const later = [];
    for (let n = 0; n < 12; n++) { const d = A.deal("loss", 2); later.push(...d); A.used("loss", d[0]); }
    eq("art bags: a look that is off is never dealt, and one switched off or deleted later leaves a stored bag at once",
      [seen.has("x"), later.includes("b") || later.includes("x"), new Set(later).size], [false, false, 4]);
    const d2 = {}, B = library(visit(d2), ["a", "b", "c"]), cyc = B.deal("loss", 3);
    B.used("loss", cyc[0]);
    const grown = library(visit(d2), ["a", "b", "c", "n"]).deal("loss", 4);   // the cycle's 3 left, plus the new one
    let leads = 0;
    for (let t = 0; t < 120; t++) {   // a bag drawn when only the built-in existed (14 cycles of one), then the library ships
      const d3 = {}, C = visit(d3);
      C.add("loss", "classic", { builtin: true }); C.deal("loss", 14);
      const seq = library(visit(d3), SEVEN).deal("loss", 24);
      if (seq[8] === "classic" && seq[16] === "classic") leads++;
    }
    eq("art bags: a look added mid-cycle joins the cycle in progress (a growing library shows up next season), and a look already shown waits; " +
      "cycles drawn before the library grew are redrawn (the classic L does not lead every one)",
      [grown.includes("n"), grown.includes(cyc[0]), new Set(grown).size, leads < 24], [true, false, 4, true]);
  }
  {
    const P = visit("private"), d = library(P, SEVEN).deal("loss", 3);
    P.used("loss", d[0]);
    const full = { "t82-art-bag-loss": JSON.stringify({ k: ["a", "b"], b: [["a", "b"]] }) }, F = library(visit(full), ["a", "b"]);
    full.full = true;                                                         // the stored bag can no longer be written
    const f1 = F.deal("loss", 1)[0]; F.used("loss", f1);
    eq("art bags: private mode (storage refused) and a full disk keep a working bag in memory for the visit",
      [d.length, same(P.deal("loss", 2), d.slice(1, 3)), F.deal("loss", 1)[0] !== f1], [3, true, true]);
  }
  const forcedOn = (host, q, kind) => visit({}, host, q).forced(kind || "loss");
  eq("art QA: ?art= is ignored on true82.net and www.true82.net, and honored on a test build (a+b in turn, an escaped + too, the other kinds)",
    [forcedOn("true82.net", "?art=loss:seal"), forcedOn("www.true82.net", "?art=loss:seal"), forcedOn("WWW.True82.net", "?art=loss:seal"),
      forcedOn("localhost", "?art=loss:seal+drip,dots:balls"), forcedOn("t82.pages.dev", "?x=1&art=dots:balls,loss:seal%2Bdrip&y=2"),
      forcedOn("localhost", "?art=dots:balls"), forcedOn("localhost", "?art=loss:seal,dots:balls,scene:skyline", "scene"), forcedOn("localhost", "?art=loss:BAD!")],
    [null, null, null, ["seal", "drip"], ["seal", "drip"], null, ["skyline"], null]);

  // the game's wiring (app.js): a run deals its looks at the draft's start, the reel and the print use that deal
  // (in a browser window is the global; here the engine is a global only, so the reel's window.T82 check gets a hand)
  const wiring = (A) => { ctx.window.T82ART = A; ctx.T82ART = A; ctx.window.T82 = ctx.T82; try { return vm.runInContext(`(function () {
      var keepG = G, keepMode = MODE, out = {};
      function run(mode, g) { MODE = mode; G = g; artDealRun(); return G.art ? [G.art.loss, G.art.dots, G.art.scene] : null; }
      out.classic = run("classic", { ch: null }); out.reel = artReelOpts();
      var keepST = setTimeout; setTimeout = function (fn) { fn(); return 0; };   // onUse books the look just after the frame
      out.reel.onUse("loss", out.classic[0][0]); setTimeout = keepST; out.afterUse = T82ART.deal("loss", 13);
      out.presti = run("cap", { ch: null }); out.daily = run("classic", { ch: null, social: { key: "k" } });
      out.pro = run("pro", { ch: null }); out.board = run("classic", { ch: { id: "t" } }); out.kaman = run("kaman", { ch: null });
      G = { art: { loss: [], dots: null, scene: "skyline" } }; out.early = resultsPrintScene(); T82ART.add("scene", "skyline", {}); out.settled = resultsPrintScene();
      G = { art: { loss: [], dots: null, scene: "skyline" } }; out.ready = resultsPrintScene();
      G = keepG; MODE = keepMode;
      return out;
    })()`, ctx); } finally { delete ctx.window.T82ART; delete ctx.T82ART; delete ctx.window.T82; } };
  const kit = (host, q) => { const A = library(visit({}, host, q), ["a", "b", "c", "d", "e"], [entry("dots", "balls"), entry("scene", "skyline")]);
    A.add("dots", "classic", { builtin: true }); A.add("scene", "lake", { builtin: true }); return A; };
  const W = wiring(kit("true82.net", "?art=loss:seal+drip,scene:skyline")), shape = (r) => r && [r[0].length, !!r[1], !!r[2]];
  eq("art wiring: a Classic or Presti run deals 14 loss looks, a dot set and a scene; the Daily, Pro and the boards (no reel) only a scene; Kaman nothing",
    [shape(W.classic), shape(W.presti), shape(W.daily), shape(W.pro), shape(W.board), W.kaman], [[14, true, true], [14, true, true], [0, false, true], [0, false, true], [0, false, true], null]);
  eq("art wiring: the reel gets the run's loss looks in play order and its dot set; a look that plays leaves the bag (onUse); true82.net ignores ?art=",
    [W.reel && same(W.reel.loss, W.classic[0]), W.reel && W.reel.dots === W.classic[1], same(W.afterUse, W.classic[0].slice(1)), W.classic[0].includes("seal")],
    [true, true, true, false]);
  const Q = wiring(kit("preview.true82.pages.dev", "?art=loss:seal+drip,scene:skyline"));
  eq("art wiring: a test build's ?art= wins (loss:seal+drip plays seal, drip, seal...); the dot set still comes from the bag",
    [Q.classic[0].slice(0, 4), Q.classic[0].length, Q.classic[2], ["balls", "classic"].includes(Q.classic[1])], [["seal", "drip", "seal", "drip"], 14, "skyline", true]);
  eq("art wiring: the print's scene is settled once a run (one still loading prints the lake and stays in the bag; a Heat Check reprint keeps it)",
    [W.early, W.settled, W.ready], [null, null, "skyline"]);
  eq("art wiring: without art-core.js nothing changes (no deal on the run, the reel's create() and the print's spec exactly as before)",
    vm.runInContext(`(function () { var keepG = G, keepMode = MODE; G = { ch: null }; MODE = "classic"; artDealRun();
      var r = [G.art === undefined, artReelOpts(), resultsPrintScene()]; G = keepG; MODE = keepMode; return r; })()`, ctx),
    [true, null, null]);
  const APP = fs.readFileSync("app.js", "utf8");
  eq("art wiring: the deal runs where a draft begins (newGame), the reel passes it to T82RISO.create, the spec carries the scene, the print marks it used",
    [/analyticsTrack\("game_start", startEvent\);\n  artDealRun\(\);/.test(APP), /T82RISO\.create\(ov, season, artOpts\)/.test(APP), /if \(scene\) spec\.scene = scene;/.test(APP),
      /T82ART\.used\("scene", RESULTS_PRINT_SPEC\.scene\)/.test(APP), /if \(seasonReelPlays\(\)\) \{\n    T82\.armSeasonSim\(G\);/.test(APP)],
    [true, true, true, true, true]);

  // the library on disk (tools/art-index.js): listed, keyed, named right, small, and in the copy law
  const AI = require("./tools/art-index.js"), FILES = AI.scan();
  eq("art index: art-index.js is current (every art file listed and keyed in tools/cache-keys.json, nothing stale; run node tools/art-index.js)", AI.check(), []);
  eq("art files: each one's id is its file's name and its kind is its folder (art/<kind>/<id>.js), with a plain-string name",
    FILES.filter((f) => f.errors.length).map((f) => f.errors.join("; ")), []);
  const bad = [AI.parse('T82ART.add("loss", "sea1", { name: "x" });', "loss", "seal.js"), AI.parse('T82ART.add("dots", "seal", { name: "x" });', "loss", "seal.js"),
    AI.parse('T82ART.add("loss", "seal", { by: "no name" });', "loss", "seal.js"), AI.parse('T82ART.add("loss", "classic", { name: "x" });', "loss", "classic.js")];
  eq("art files: the index fails loudly on a wrong id, a wrong kind, a missing name, or a built-in's id", bad.map((f) => f.errors.length > 0), [true, true, true, true]);
  eq("art files: each one is under its size budget (a loss look 10 KB, a dot set 6 KB, a scene 16 KB; art/CONTRACT.md law 6)",
    FILES.filter((f) => f.bytes > AI.BUDGET[f.kind] * 1024).map((f) => f.rel + " is " + (f.bytes / 1024).toFixed(1) + " KB"), []);
  eq("art files: zero em-dashes in their strings (copy law)", FILES.filter((f) => f.dash).map((f) => f.rel), []);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
