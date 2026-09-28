#!/usr/bin/env node
/* TRUE 82 daily-mode playability audit (dev tool, not shipped to the site).
   Drives the REAL engine headlessly: newState -> dealRound -> greedy bot
   (fill the scarcest needed slot with the best value, spend skips only when
   a board is empty) -> finish. Ported from the owner's devtools audit.js
   (the 2026-07-18 POOL2 certification) with these changes:
     1. ROOT is this repo (tools/..), no sibling checkout needed.
     2. A dealRound that returns "done" before pick five is a DEAD run
        ("nodeal"): the app would show results with fewer than five picks.
        The old bot kept picking on the stale board and missed it.
     3. The year menu. A Classic or Pro player can always change a player's
        season with the menu under his name, so when a card's shown season
        breaks the day's rule the bot tries his other seasons on that board
        (Classic: the best legal one; Pro, which is blind: the first legal one
        in menu order). Presti seasons stay locked, as in the app. Boards
        without a season rule play exactly as before. --no-menu turns it off.
     4. New columns: ghost% (a pick sat in a slot only a same-name namesake
        played: the engine keys positions by name, this check by name and
        height), bite% (rounds where the rule made the bot's unconstrained
        favorite illegal: proof the rule changes the right pick; cfg-only
        boards change values instead, so read their wins and dnet), dnet
        (the average net the day's engine settings added to or took from the
        bot's finished five, against default settings: the weight of a cfg
        board, 0 for boards without cfg), lastC (5th percentile of legal
        centers when the center is the last open slot).
     5. pool2 and pool3 read daily-core.js's exported POOL2 and POOL3.
        Price-hook boards (price(row,t)) look bite-free here: the bot ignores
        prices, so read them in the app.

   Usage (from anywhere):
     node tools/daily-audit.js [N] [mode] [ids] [--no-menu] [--labels]   (--labels: score with labels.json, as the site does since v61)
       N        bot games per id (default 300)
       mode     all (default) | pool2 | pool3 | new | one ID | ids A,B,C
                pool3 is the certification mode: it prints PASS/FAIL per id and
                exits 1 if any id fails the bar.
   The bar (what POOL2 passed on 2026-07-18): dead% 0, median round-1 pool of
   at least 8, supC and minC above zero, and a record spread that is neither
   everyone 82-0 (p10 82) nor hopeless (p90 under 41). A rule that deliberately
   keeps the center slot shut until later rounds (Outside In) is judged on
   lastC instead of supC/minC, and says so in its verdict. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(process.env.TRUE82_ROOT || path.join(__dirname, ".."));

function load(root) {
  const ctx = { console };
  vm.createContext(ctx);
  ["sim-core.js", "challenges.js", "daily-core.js"].forEach(f =>
    vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f }));
  const data = JSON.parse(fs.readFileSync(path.join(root, "site_data.json"), "utf8"));
  const t = ctx.T82.initData(data);
  // v61: the label taxes score like the site when the frozen tags are loaded (--labels)
  if (process.argv.includes("--labels") && fs.existsSync(path.join(root, "labels.json")))
    ctx.T82.setLabels(JSON.parse(fs.readFileSync(path.join(root, "labels.json"), "utf8")));
  return { T82: ctx.T82, T82CH: ctx.T82CH, T82DAILY: ctx.T82DAILY, data, t };
}

// Person-level positions (name + height): the namesakes come apart.
function personBuckets(data, t) {
  const I = t.IDX, out = new Map(), rowsBy = new Map();
  data.players.forEach(r => {
    const k = r[I.name] + "|" + r[I.ht];
    let s = out.get(k);
    if (!s) { s = {}; out.set(k, s); rowsBy.set(k, []); }
    rowsBy.get(k).push(r);
    if (r[I.g_pct] >= 20) s.G = 1;
    if (r[I.f_pct] >= 20) s.F = 1;
    if (r[I.c_pct] >= 20) s.C = 1;
  });
  out.forEach((s, k) => {
    if (s.G || s.F || s.C) return;
    rowsBy.get(k).forEach(r => {
      const g = r[I.g_pct], f = r[I.f_pct], c = r[I.c_pct], m = Math.max(g, f, c);
      s[g === m ? "G" : (f === m ? "F" : "C")] = 1;
    });
  });
  return out;
}

function makeBot(env, opts) {
  const { T82, t } = env;
  const menu = !(opts && opts.noMenu);
  const I = t.IDX;
  const CAPN = { G: 2, F: 2, C: 1 };
  function legalBuckets(S, row) {
    if (!T82.rowDraftable(S, row)) return [];
    if (S.mode === "cap" && !T82.capAffordable(S, row)) return [];
    let bks = T82.rowOpenBuckets(S, row);
    if (S.ch && S.ch.pick) bks = bks.filter(b => S.ch.pick(S, row, b, t));
    return bks;
  }
  function draftables(S) {
    const key = T82.key(S, S.cur.fr, S.cur.dec);
    const pool = t.POOLS.get(key), yrs = t.POOL_YEARS.get(key);
    const out = [];
    if (!pool) return out;
    pool.forEach((row0, name) => {
      if (S.drafted.has(name)) return;
      const row = T82.resolveRow(S, name);
      if (!row) return;
      let bks = legalBuckets(S, row), use = row, season = null;
      if (!bks.length && menu && S.mode !== "cap" && S.ch && yrs && yrs.get(name)) {
        // the year menu: Classic takes the best legal season, blind Pro the first legal one
        let arr = yrs.get(name).slice();
        if (S.mode === "classic") arr.sort((a, b) => T82.valueOf(S, b) - T82.valueOf(S, a));
        const keep = S.yearByName[name];
        for (const r of arr) {
          if (r === row) continue;
          S.yearByName[name] = r[I.season];
          const b2 = legalBuckets(S, r);
          if (b2.length) { bks = b2; use = r; season = r[I.season]; break; }
        }
        if (keep === undefined) delete S.yearByName[name]; else S.yearByName[name] = keep;
      }
      if (!bks.length) return;
      out.push({ name, row: use, season, bks, cost: S.mode === "cap" ? (T82.effCost(S, name) || 0) : 0, v: T82.valueOf(S, use) });
    });
    return out;
  }
  // the same bot's choice on this board with the day's filter and pick rules
  // switched off (open slots and the bank still apply): if it differs from the
  // real choice, the rule changed the right pick this round
  function freeCands(S) {
    const pool = t.POOLS.get(T82.key(S, S.cur.fr, S.cur.dec));
    const out = [];
    if (!pool) return out;
    pool.forEach((row0, name) => {
      if (S.drafted.has(name)) return;
      const row = T82.resolveRow(S, name);
      if (!row) return;
      const bks = T82.rowOpenBuckets(S, row);
      if (!bks.length) return;
      if (S.mode === "cap" && !T82.capAffordable(S, row)) return;
      out.push({ name, row, season: null, bks, cost: S.mode === "cap" ? (T82.effCost(S, name) || 0) : 0, v: T82.valueOf(S, row) });
    });
    return out;
  }
  function choose(S, cands) {
    const nd = need(S), supply = { G: 0, F: 0, C: 0 };
    for (const c of cands) for (const b of c.bks) supply[b]++;
    const order = ["G", "F", "C"].filter(b => nd[b] > 0);
    let bucket = order.find(b => supply[b] <= nd[b] && supply[b] > 0);
    if (!bucket) bucket = order.slice().sort((a, b) => supply[a] - supply[b]).find(b => supply[b] > 0);
    if (!bucket) bucket = order.find(b => cands.some(c => c.bks.includes(b)));
    let picks = bucket ? cands.filter(c => c.bks.includes(bucket)) : [];
    if (!picks.length) { if (!cands[0]) return null; picks = [cands[0]]; bucket = cands[0].bks[0]; }
    picks.sort((a, b) => (b.v - a.v) || (a.cost - b.cost));
    return { c: picks[0], bucket, supply, nd };
  }
  function need(S) { const n = {}; for (const b of ["G", "F", "C"]) n[b] = CAPN[b] - (S.filled[b] || 0); return n; }
  return function playBot(base, ch, seed) {
    const S = T82.newState(base, seed, ch);
    const st = { skips: 0, zero: 0, pool1: null, supC1: null, minC: 99, lastC: null, bites: 0, rounds: 0, shutC1: false };
    if (T82.dealRound(S) === "done") return Object.assign(st, { dead: true, why: "nodeal", S });
    for (let r = 0; r < 5; r++) {
      let cands = draftables(S), guard = 0, sawZero = false;
      while (!cands.length && guard++ < 80) {
        sawZero = true;
        let did = false;
        if (S.mode === "cap") did = T82.yearReroll(S) || T82.skipTeam(S) || T82.skipEra(S);
        else did = T82.skipTeam(S) || T82.skipEra(S);
        if (!did) return Object.assign(st, { dead: true, why: "stuck", zero: 1, S });
        st.skips++;
        cands = draftables(S);
      }
      if (sawZero) st.zero = 1;
      const pick = choose(S, cands);
      if (!pick) return Object.assign(st, { dead: true, why: "noslot", S });
      const { supply, nd } = pick;
      const free = choose(S, freeCands(S));
      st.rounds++;
      if (free && (free.c.name !== pick.c.name || free.c.row !== pick.c.row)) st.bites++;
      // "shut": the rule closes the center slot this round for every player,
      // whatever the board (an order rule), so a zero here is by design
      const shut = nd.C > 0 && supply.C === 0 && S.ch && S.ch.pick && shutC(S);
      if (r === 0) { st.pool1 = cands.length; st.supC1 = supply.C; st.shutC1 = shut; }
      if (nd.C > 0 && !shut) st.minC = Math.min(st.minC, supply.C);
      if (nd.C > 0 && nd.G === 0 && nd.F === 0) st.lastC = supply.C;
      if (!T82.applyPick(S, pick.c.name, pick.c.season, pick.bucket))
        return Object.assign(st, { dead: true, why: "pickrej", S });
      if (S.picks.length < 5 && T82.dealRound(S) === "done")
        return Object.assign(st, { dead: true, why: "nodeal", zero: 1, S });
    }
    const res = T82.finish(S);
    // dnet: what the day's engine settings did to this same five (0 when the
    // board has no cfg): the bot ignores taxes, so this is the rule's weight
    const rows = S.picks.map(p => p.row), slots = S.picks.map(p => p.slot);
    const dnet = T82.engine(S, rows, slots).net - T82.engine({ ch: null }, rows, slots).net;
    return Object.assign(st, { dead: false, wins: res.wins, dnet, S });
  };
  // Does the rule refuse the C slot to every center-capable player in the data
  // right now? (true for order rules such as "guards first")
  function shutC(S) {
    if (!shutC.sample) {
      shutC.sample = [];
      t.POOL_YEARS.forEach(yrs => yrs.forEach(arr => arr.forEach(r => {
        const cb = t.CAREER_BUCKETS.get(r[I.name]);
        if (cb && cb.C && shutC.sample.length < 4000 && (r[I.season] * 7 + r[I.mp]) % 5 === 0) shutC.sample.push(r);
      })));
    }
    for (const r of shutC.sample) if (S.ch.pick(S, r, "C", t)) return false;
    return true;
  }
}

function pct(a, p) { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; }

function auditOne(env, playBot, pb, label, base, ch, N) {
  const I = env.t.IDX;
  let dead = 0, zero = 0, sk = 0, ghost = 0, bites = 0, rounds = 0, shut1 = 0, dnet = 0;
  const wins = [], pools = [], supC = [], minCs = [], lastCs = [], why = {};
  for (let i = 1; i <= N; i++) {
    const r = playBot(base, ch, 777000 + i * 13);
    if (r.pool1 != null) pools.push(r.pool1);
    if (r.supC1 != null) supC.push(r.supC1);
    if (r.shutC1) shut1++;
    if (r.minC < 99) minCs.push(r.minC);
    if (r.lastC != null) lastCs.push(r.lastC);
    sk += r.skips; if (r.zero) zero++;
    bites += r.bites; rounds += r.rounds;
    if (r.S && r.S.picks.some(p => { const b = pb.get(p.row[I.name] + "|" + p.row[I.ht]); return b && !b[p.slot]; })) ghost++;
    if (r.dead) { dead++; why[r.why] = (why[r.why] || 0) + 1; continue; }
    wins.push(r.wins);
    dnet += r.dnet;
  }
  return {
    label, base,
    dead: +(100 * dead / N).toFixed(dead && dead * 100 < N ? 1 : 0), zero: Math.round(100 * zero / N),
    skips: +(sk / N).toFixed(1), pool: pools.length ? pct(pools, 0.5) : 0,
    supC: shut1 > N / 2 ? "shut" : (supC.length ? pct(supC, 0.5) : 0),
    minC: minCs.length ? pct(minCs, 0.05) : "-", lastC: lastCs.length ? pct(lastCs, 0.05) : "-",
    ghost: Math.round(100 * ghost / N), bite: rounds ? Math.round(100 * bites / rounds) : 0,
    dnet: wins.length ? +(dnet / wins.length).toFixed(1) : 0,
    w10: wins.length ? pct(wins, 0.1) : "-", w50: wins.length ? pct(wins, 0.5) : "-", w90: wins.length ? pct(wins, 0.9) : "-",
    why
  };
}

function verdict(r) {
  const bad = [];
  if (r.dead > 0) bad.push("dead");
  if (!(r.pool >= 8)) bad.push("pool<8");
  if (r.supC === "shut") {                   // an order rule: judge the rounds where the center slot is open to anyone
    if (!(typeof r.minC === "number" && r.minC > 0) && !(typeof r.lastC === "number" && r.lastC > 0)) bad.push("minC=0");
  }
  else {
    if (!(r.supC > 0)) bad.push("supC=0");
    if (!(typeof r.minC === "number" && r.minC > 0)) bad.push("minC=0");
  }
  if (typeof r.w10 === "number" && r.w10 >= 82) bad.push("all-82");
  if (typeof r.w90 === "number" && r.w90 < 41) bad.push("hopeless");
  return bad;
}

function run(argv) {
  const noMenu = argv.includes("--no-menu");
  argv = argv.filter(a => a !== "--no-menu" && a !== "--labels");
  const N = parseInt(argv[0] || "300", 10);
  const mode = argv[1] || "all";
  const env = load(ROOT);
  const playBot = makeBot(env, { noMenu });
  const pb = personBuckets(env.data, env.t);
  const CH = env.T82CH, D = env.T82DAILY;
  let ids;
  if (mode === "pool2") ids = D.POOL2.slice();
  else if (mode === "pool3") ids = D.POOL3.slice();
  else if (mode === "new") {                 // everything appended after the 2026-07-18 manifest (it ends at small_ball_five)
    const cut = CH.CHALLENGES.findIndex(c => c.id === "small_ball_five") + 1;
    ids = CH.CHALLENGES.slice(cut).map(c => c.id);
  }
  else if (mode === "one") ids = [argv[2]];
  else if (mode === "ids") ids = String(argv[2] || "").split(",").filter(Boolean);
  else ids = CH.CHALLENGES.map(c => c.id);
  const rows = [];
  rows.push(auditOne(env, playBot, pb, "vanilla-classic", "classic", null, N));
  rows.push(auditOne(env, playBot, pb, "vanilla-cap", "cap", null, N));
  rows.push(auditOne(env, playBot, pb, "vanilla-pro", "pro", null, N));
  const vanillaN = rows.length;
  for (const id of ids) {
    const ch = CH.byId[id];
    if (!ch) { rows.push({ label: id, base: "?", missing: true }); continue; }
    rows.push(auditOne(env, playBot, pb, id, ch.base, ch, N));
  }
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad("mode", 22), pad("base", 8), pad("dead%", 6), pad("zero%", 6), pad("skips", 6), pad("pool", 5), pad("supC", 5), pad("minC", 5), pad("lastC", 6),
    pad("ghost%", 7), pad("bite%", 6), pad("dnet", 6), pad("wins p10/p50/p90", 17), mode === "pool3" ? "verdict" : "");
  let fails = 0;
  rows.forEach((r, i) => {
    if (r.missing) { console.log(pad(r.label, 22), "MISSING FROM THE MANIFEST"); fails++; return; }
    const v = i < vanillaN ? [] : verdict(r);
    if (v.length) fails++;
    const tail = mode === "pool3" && i >= vanillaN ? (v.length ? "FAIL " + v.join(",") : "PASS") : (v.length ? "(" + v.join(",") + ")" : "");
    console.log(pad(r.label, 22), pad(r.base, 8), pad(r.dead, 6), pad(r.zero, 6), pad(r.skips, 6), pad(r.pool, 5), pad(r.supC, 5), pad(r.minC, 5), pad(r.lastC, 6),
      pad(r.ghost, 7), pad(r.bite, 6), pad(r.dnet, 6), pad(r.w10 + "/" + r.w50 + "/" + r.w90, 17), tail, Object.keys(r.why).length ? JSON.stringify(r.why) : "");
  });
  console.log("\n" + (rows.length - vanillaN) + " ids audited at " + N + " bot games each" + (noMenu ? " (year menu off)" : "") + "; " + fails + " below the bar.");
  return fails;
}

module.exports = { load, makeBot, personBuckets, auditOne, verdict, run };

if (require.main === module) {
  const fails = run(process.argv.slice(2));
  process.exit(process.argv[3] === "pool3" && fails ? 1 : 0);
}
