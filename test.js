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
  eq("POOL3: the manifest's new section is exactly the pool, no orphan boards", CH.CHALLENGES.slice(cut).map(c => c.id).sort(), P3.slice().sort());
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

// ---------- v55 THE REDRAFTED on the real player data (skipped when site_data.json is absent) ----------
// The owner's "redraftables", ported from the accounts-test archive: every class derives from the data,
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
