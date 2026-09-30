#!/usr/bin/env node
/* TRUE 82 daily crowd model (v66.4, dev tool, not shipped to the site). How alike do real players' fives come out on a
   Daily played by everyone on the same rolls? A crowd of simulated players plays the board: 40% casual (they read the
   first five rows of the list and take the biggest name that fits), 40% fans (the first twelve rows, the names they
   rate, their own taste as noise), 20% experts (the whole list by the game's value, their own read as noise); a weak
   best option makes some of each skip. "Fame" is what a casual fan knows today: a career's best scoring season if it
   reached 1995, modern MVPs up big, the older legends by name (a list below), everyone else of old down 8. It is rough
   (it rates Dale Ellis and Bob McAdoo as known names), so read its numbers as directions. Built for the special days
   (AGENT-HANDOFF 000000) after the owner saw "everyone is going to have the exact same team".
     node tools/daily-crowd.js crowd DAY [N]           the crowd on DAY's board and seed: distinct fives, the most common
                                                       five's share, how many players two random fives share, records
     node tools/daily-crowd.js search DAY N EVAL MUSTS  seeds for DAY's board: the no-skip path must carry each MUST (a
                                                       comma list of "A|1990/B|2000" alternatives) and exactly one deep
                                                       cut (the board's deal.deep); the first EVAL are scored by a
                                                       300-player crowd; the best meeting the targets (most common five
                                                       <= 15%, share <= 2.3 of 5, 82-0 3-12%) print first
   Label taxes are on (as the site scores). A search of 30,000 seeds and 60 crowds takes a few minutes. */
// A crowd model for a Daily: how alike do real players' fives come out? Casual players see only the first rows of the
// list and take the biggest name that fits; fans take the name they rate highest (fame, their own taste as noise);
// experts pick by the game's value (with their own read as noise). A weak best option makes some players skip.
// Usage: node crowd.js DAY [sort=obpm|min] [seed] [N]
process.argv.push("--labels");
const AUD = require("./daily-audit.js"); const env = AUD.load(require("path").join(__dirname, ".."));
const { T82, t } = env, I = t.IDX, D = env.T82DAILY;
const src = require("fs").readFileSync(require("path").join(__dirname, "..", "challenges.js"), "utf8"); const MVPS = eval("({" + /var MVPS = \{([\s\S]*?)\};/.exec(src)[1] + "})");
const last = new Map(); env.data.players.forEach(r => last.set(r[I.name], Math.max(last.get(r[I.name]) || 0, r[I.season])));
// fame as a casual fan knows it today: the best scoring season of a career that reached the '90s, MVPs of that era up
// big; before that, only the true legends (a 29-point Kiki Vandeweghe or an MVP Bob McAdoo is a deep cut now)
const LEGENDS = { "Kareem Abdul-Jabbar": 1, "Magic Johnson": 1, "Larry Bird": 1, "Julius Erving": 1, "Moses Malone": 1, "Isiah Thomas": 1, "George Gervin": 1, "Patrick Ewing": 1, "Dennis Rodman": 1, "Kevin McHale": 1, "James Worthy": 1, "Dominique Wilkins": 1 };
const fame = new Map(); env.data.players.forEach(r => { if (r[I.mp] < 1000) return; const nm = r[I.name], modern = last.get(nm) >= 1995;
  const f = r[I.ppg] + (MVPS[nm] && modern ? 8 : 0) + (LEGENDS[nm] ? 10 : 0) + (modern ? 0 : -8); if (!fame.has(nm) || fame.get(nm) < f) fame.set(nm, f); });
if (false) { void (["Kiki Vandeweghe", "Bob McAdoo", "Mark Aguirre", "Magic Johnson", "LeBron James", "DeMar DeRozan", "Kevin Garnett", "Dejounte Murray", "George Gervin"].map(n => n + " " + (fame.get(n) || 0).toFixed(0)).join(", ")); process.exit(0); }
const CAPN = { G: 2, F: 2, C: 1 };
let rs = 991; const rnd = () => (rs = (rs * 1103515245 + 12345) % 2147483648) / 2147483648;
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
let ch, seed, sort;
function listed(S) {   // the list as the app orders it, each row at its default season
  const k = T82.key(S, S.cur.fr, S.cur.dec), yrs = t.POOL_YEARS.get(k), out = [];
  if (!yrs) return out;
  yrs.forEach((arr, name) => {
    if (S.drafted.has(name)) return;
    const elig = arr.filter(r => T82.rowDraftable(S, r)); if (!elig.length) return;
    let row;
    if (sort === "obpm") { const real = elig.filter(r => r[I.mp] >= 500); const pool = real.length ? real : elig; row = pool.reduce((a, r) => r[I.obpm] > a[I.obpm] ? r : a); }
    else row = elig.reduce((a, r) => T82.valueOf(S, r) > T82.valueOf(S, a) ? r : a);
    S.yearByName[name] = row[I.season];
    const bks = T82.rowOpenBuckets(S, row); delete S.yearByName[name];
    if (!bks.length) return;
    const mp = Math.max(...arr.map(r => r[I.mp])), ob = row[I.mp] >= 500 ? row[I.obpm] : row[I.obpm] - 1000;
    out.push({ name, row, bks, mp, ob, v: T82.valueOf(S, row), f: fame.get(name) || 0 });
  });
  out.sort(sort === "obpm" ? (a, b) => b.ob - a.ob : (a, b) => b.mp - a.mp);
  return out;
}
function playOne(kind) {
  const S = T82.newState("classic", seed, ch), taste = {}; T82.dealRound(S);
  const skipOdds = kind === "casual" ? 0.35 : kind === "fan" ? 0.5 : 0.7;
  for (let r = 0; r < 5; r++) {
    let c = listed(S);
    const view = kind === "casual" ? c.slice(0, 5) : kind === "fan" ? c.slice(0, 12) : c;
    const score = x => kind === "expert" ? x.v + gauss() * 0.8 : x.f + (taste[x.name] = taste[x.name] ?? gauss() * 3);
    let best = view.reduce((a, x) => (!a || score(x) > score(a)) ? x : a, null);
    // a weak ticket: a known-name threshold for fans, a value one for experts
    const weak = best && (kind === "expert" ? best.v < 3 : best.f < 20);
    if (weak && rnd() < skipOdds) { if (T82.skipTeam(S) || T82.skipEra(S)) { r--; continue; } }
    if (!best) { if (!(T82.skipTeam(S) || T82.skipEra(S))) return null; r--; continue; }
    const need = {}; ["G", "F", "C"].forEach(k => need[k] = CAPN[k] - S.filled[k]);
    const bk = best.bks.slice().sort((a, b) => need[a] - need[b])[0];
    S.yearByName[best.name] = best.row[I.season];
    if (!T82.applyPick(S, best.name, best.row[I.season], bk)) return null;
    if (S.picks.length < 5) T82.dealRound(S);
  }
  return { five: S.picks.map(p => p.row[I.name]).sort(), wins: T82.finish(S).wins, tk: S.picks.map(p => p.fr + "|" + p.dec).join(">") };
}

function evalCrowd(ch0, seed0, sort0, N) {
  ch = ch0; seed = seed0; sort = sort0; rs = 991;
  const crowd = [];
  for (let i = 0; i < N; i++) { const kind = i % 10 < 4 ? "casual" : i % 10 < 8 ? "fan" : "expert"; const r = playOne(kind); if (r) crowd.push(r); }
  const counts = new Map(); crowd.forEach(r => { const k = r.five.join(", "); counts.set(k, (counts.get(k) || 0) + 1); });
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  let ov = 0; for (let i = 0; i < 2000; i++) { const a = crowd[Math.floor(rnd() * crowd.length)], c = crowd[Math.floor(rnd() * crowd.length)]; ov += a.five.filter(x => c.five.includes(x)).length; }
  const wins = crowd.map(r => r.wins).sort((a, b) => a - b), q = p => wins[Math.floor(p * (wins.length - 1))];
  const pc = new Map(); crowd.forEach(r => r.five.forEach(n => pc.set(n, (pc.get(n) || 0) + 1)));
  return { n: crowd.length, fives: counts.size, topShare: Math.round(100 * top[0][1] / crowd.length), share: +(ov / 2000).toFixed(2),
    w10: q(.1), w50: q(.5), w90: q(.9), perfect: Math.round(100 * wins.filter(w => w >= 82).length / wins.length), paths: new Set(crowd.map(r => r.tk)).size,
    most: [...pc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, k]) => n + " " + Math.round(100 * k / crowd.length) + "%").join(", "), topFive: top[0][0] };
}

const [cmd, day, a3, a4, a5] = process.argv.slice(2).filter(x => x !== "--labels");
if (!cmd || !day || !D.validKey(day)) { console.log("usage: node tools/daily-crowd.js crowd DAY [N] | search DAY N EVAL MUSTS"); process.exit(1); }
const board = D.boardFor(day), bch = board.ch;
if (!bch) { console.log(day + " has no challenge board"); process.exit(1); }
if (cmd === "crowd") {
  const m = evalCrowd(bch, board.seed, bch.sortMode || "min", +(a3 || 900));
  console.log(day, "#" + board.num, board.name, "seed", board.seed, JSON.stringify(m, null, 1));
} else if (cmd === "search") {
  const deep = (bch.deal && bch.deal.deep) || [], MUST = (a5 || "").split(",").filter(Boolean).map(m => m.split("/"));
  const CAPN = { G: 2, F: 2, C: 1 };
  const path = seed => { const S = T82.newState("classic", seed, bch), tk = []; if (T82.dealRound(S) === "done") return null;
    for (let r = 0; r < 5; r++) { tk.push(S.cur.fr + "|" + S.cur.dec); let best = null;
      t.POOLS.get(T82.key(S, S.cur.fr, S.cur.dec)).forEach((r0, name) => { if (S.drafted.has(name)) return; const row = T82.resolveRow(S, name);
        if (!row || !T82.rowDraftable(S, row)) return; const bks = T82.rowOpenBuckets(S, row); if (bks.length && (!best || T82.valueOf(S, row) > best.v)) best = { name, bks, v: T82.valueOf(S, row) }; });
      if (!best) return null; const need = {}; ["G", "F", "C"].forEach(k => need[k] = CAPN[k] - S.filled[k]);
      if (!T82.applyPick(S, best.name, null, best.bks.slice().sort((x, y) => need[x] - need[y])[0])) return null;
      if (S.picks.length < 5 && T82.dealRound(S) === "done") return null; }
    return tk; };
  const cand = [];
  for (let i = 0; i < +(a3 || 20000); i++) { const seed = T82.seedOf("t82d1|" + day + "|search|" + i), tk = path(seed); if (!tk) continue;
    if (deep.length && tk.filter(k => deep.includes(k)).length !== 1) continue;
    if (MUST.some(alts => !tk.some(k => alts.includes(k)))) continue;
    cand.push({ seed, path: tk.join(" > ") }); }
  console.log(cand.length, "paths qualify");
  const res = cand.slice(0, +(a4 || 60)).map(c => Object.assign(c, evalCrowd(bch, c.seed, bch.sortMode || "min", 300)));
  const ok = res.filter(r => r.topShare <= 15 && r.share <= 2.3 && r.perfect >= 3 && r.perfect <= 12);
  console.log(ok.length, "meet the targets");
  (ok.length ? ok : res).sort((x, y) => (x.share - y.share) || (x.topShare - y.topShare)).slice(0, 6).forEach(r => console.log(JSON.stringify(r)));
}
