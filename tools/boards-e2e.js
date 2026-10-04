/* TRUE 82 — tools/boards-e2e.js: THE WHOLE ACCOUNT AND BOARDS PATH, END TO END.
   ─────────────────────────────────────────────────────────────────────────────
   WHAT THIS IS. Many different signed-in players finish many real games, in
   every mode, and their scores are followed all the way to a leaderboard row.
   It runs the REAL endpoint handlers (functions/api/{run,lb,me,name,claim}.js),
   the REAL SQL from migrations/0030 and 0031, the REAL Clerk verification in
   _lib/auth.js against a throwaway RS256 keypair, and the REAL engine replay in
   _lib/sim.js. Nothing here is a paraphrase of the shipped code.

   WHY IT IS NOT A SERVER. An earlier session verified the boards against a
   local `wrangler pages dev`, which proved the deployment but could not be
   committed, re-run, or trusted to behave the same twice. This runs in one node
   process in a few seconds, so it can live in test.js and fail on the day
   somebody breaks it. What it deliberately does NOT cover is the Workers
   runtime itself (the CPU ceiling, env var baking, ASSETS); that is checked
   against the deployed preview by hand, and the handoff records it.

   WHAT A RUN LOOKS LIKE. tools/daily-audit.js's bot drafts a real five on the
   real player data, and `newState` logs every action it takes, so `S.actions`
   IS the replayable log app.js would have sent. Vanilla Classic and Presti play
   their season out, so they carry the "ss" op exactly as app.js's
   seasonReelPlays() does; the Daily and any challenge board never do.

   THE LEDGER IS THE ORACLE. Every expectation below is computed from what the
   SERVER said it accepted, never from what this file intended to send. That is
   the whole point: a board is right when it shows exactly the runs the server
   verified and stored, and nothing else.

   Run:  node tools/boards-e2e.js            (report + assertions)
         node tools/boards-e2e.js --quiet    (assertions only)
   Exits nonzero on any failure. */
"use strict";

const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const { generateKeyPairSync, createSign } = require("crypto");

const ROOT = path.resolve(__dirname, "..");
// THE HARNESS MUST SCORE LIKE A BROWSER. app.js loads labels.json and calls
// T82.setLabels, so the v61 label taxes move the net it claims. A harness that
// skips them agrees with a server that also skips them, for the wrong reason,
// and that is exactly how the missing labels in _lib/sim.js survived until
// 2026-10-04 (26.7% of runs would have failed verification on the live site).
process.argv.push("--labels");                 // read by tools/daily-audit.js load()
const AUD = require(path.join(ROOT, "tools/daily-audit.js"));
const QUIET = process.argv.includes("--quiet");

let pass = 0, fail = 0;
const failures = [];
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else { fail++; failures.push(name); }
  console.log((ok ? "PASS" : "FAIL") + "  " + name +
    (ok ? "" : "\n      got  " + JSON.stringify(got) + "\n      want " + JSON.stringify(want)));
}
function say() { if (!QUIET) console.log.apply(console, arguments); }

/* ---------- a D1 binding over node:sqlite ----------
   Only the shapes the handlers actually use. The error text matters: run.js
   reads /UNIQUE/i and /official/i off the message to tell "already played today"
   from "duplicate id", and SQLite's own message carries both. */
function d1(db) {
  const norm = (a) => a.map((v) => (v === undefined ? null : v));
  function stmt(sql, args) {
    return {
      bind: (...a) => stmt(sql, norm(a)),
      async run() {
        const r = db.prepare(sql).run(...args);
        return { success: true, meta: { last_row_id: Number(r.lastInsertRowid), changes: Number(r.changes) } };
      },
      async all() { return { success: true, results: db.prepare(sql).all(...args), meta: {} }; },
      async first() { const r = db.prepare(sql).get(...args); return r === undefined ? null : r; }
    };
  }
  return { prepare: (sql) => stmt(sql, []) };
}

/* ---------- Clerk, minus Clerk ---------- */
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const PEM = publicKey.export({ type: "spki", format: "pem" });
const b64u = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function mintToken(clerkId) {
  const nowS = Math.floor(Date.now() / 1000);
  const h = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const p = b64u(JSON.stringify({ sub: clerkId, iat: nowS, nbf: nowS - 5, exp: nowS + 3600 }));
  const s = createSign("RSA-SHA256"); s.update(h + "." + p);
  return h + "." + p + "." + b64u(s.sign(privateKey));
}

const ORIGIN = "https://v69-boards.true82.pages.dev";
function req(method, url, token, body) {
  const headers = {};
  if (token) headers.authorization = "Bearer " + token;
  if (body !== undefined) headers["content-type"] = "application/json";
  return new Request(ORIGIN + url, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  });
}

async function main() {
  const env0 = AUD.load(ROOT);
  const T = env0.T82, DAILY = env0.T82DAILY;
  const bot = AUD.makeBot(env0, {});

  const db = new DatabaseSync(":memory:");
  for (const f of ["0030_accounts_min_v1.sql", "0031_runs_boards_v1.sql"]) {
    fs.readFileSync(path.join(ROOT, "migrations", f), "utf8")
      .split(";").map((x) => x.trim()).filter(Boolean).forEach((s) => db.exec(s));
  }

  /* ASSETS SERVES BY PATH, which matters more than it looks. The first version
     of this stub answered every request with site_data.json, so when _lib/sim.js
     began asking for /labels.json it got the wrong file and the harness could not
     tell. A stub loose enough to answer a question it was never asked is a stub
     that hides the next bug. */
  const ASSET_FILES = { "/site_data.json": "site_data.json", "/labels.json": "labels.json" };
  const env = {
    DB: d1(db),
    CLERK_JWT_KEY: PEM,
    AUTHORIZED_PARTIES: undefined,     // unset, the way a Preview environment is
    ASSETS: {
      fetch: async (url) => {
        const p = new URL(String(url)).pathname;
        const f = ASSET_FILES[p];
        if (!f) return new Response("not found", { status: 404 });
        return new Response(fs.readFileSync(path.join(ROOT, f)), {
          headers: { "content-type": "application/json" }
        });
      }
    }
  };

  const API = {};
  for (const m of ["run", "lb", "me", "name", "claim"]) {
    API[m] = await import(path.join(ROOT, "functions/api", m + ".js"));
  }
  const post = (mod, url, token, body) => API[mod].onRequestPost({ request: req("POST", url, token, body), env })
    .then((r) => r.json());
  const get = (mod, url, token) => API[mod].onRequestGet({ request: req("GET", url, token), env })
    .then((r) => r.json());

  /* ---------- play one real game, exactly as app.js would ---------- */
  function play(mode, ch, seed, opts) {
    opts = opts || {};
    const r = bot(mode, ch, seed);
    if (r.dead) return null;
    // app.js seasonReelPlays(): Classic and Presti play the season out; the
    // Daily (G.social) and any challenge board stay on the projection.
    const playsOut = (mode === "classic" || mode === "cap") && !ch && !opts.daily;
    const actions = r.S.actions.slice().concat(playsOut ? ["ss"] : []);
    const rp = T.replay({ mode: mode, seed: seed, actions: actions }, ch || null);
    if (!rp || !rp.ok) return null;
    return { mode, seed, actions, result: rp.result };
  }

  let runSeq = 0;
  function payload(g, run, opts) {
    opts = opts || {};
    const x = run.result;
    return {
      id: "00000000-0000-4000-c000-" + String(++runSeq).padStart(12, "0"),
      sid: g.sid,
      mode: run.mode, seed: run.seed, actions: run.actions,
      rngDraws: opts.cheatDraws !== undefined ? opts.cheatDraws : x.rngDraws,
      coreVersion: x.coreVersion, dataVersion: x.dataVersion,
      official: opts.official || undefined,
      claim: { wins: opts.cheatWins !== undefined ? opts.cheatWins : x.wins, net: x.net }
    };
  }

  /* ---------- THE LEDGER: what the server said it accepted ---------- */
  const LEDGER = [];
  async function submit(g, run, opts) {
    opts = opts || {};
    const res = await post("run", "/api/run", g && g.token, payload(g, run, opts));
    if (g && g.token && res.ok && res.stored && res.verified) {
      LEDGER.push({
        gm: g.key, shown: g.shown, mode: run.mode,
        wins: run.result.wins, net: run.result.net,
        budgetUsed: run.result.budgetUsed,
        official: res.officialRejected ? null : (opts.official || null)
      });
    }
    return res;
  }
  // the boards' own filters, restated here so an expectation is readable
  const L = (f) => LEDGER.filter(f);
  const byGm = (rows, pick, cmp) => {
    const best = new Map();
    rows.forEach((r) => { const p = pick(r); if (p === null || p === undefined) return;
      if (!best.has(r.shown) || cmp(p, best.get(r.shown)) < 0) best.set(r.shown, p); });
    return best;
  };
  const desc = (a, b) => b - a, asc = (a, b) => a - b;

  /* ---------- the GMs ----------
     Eight players on eight devices, the way eight phones would be. One keeps the
     default GM-<tag>; one tries a name the filter refuses; one plays only Pro;
     one only ever plays the Daily. */
  const GMS = [
    { key: "ava", clerk: "user_ava", name: "Ava Nine",  classic: 13, cap: 13, pro: 0,  chase: true,  dailies: [-9,-8,-7,-6,-5,-4,-3,-2,-1,0] },
    { key: "ben", clerk: "user_ben", name: "BenchMob",  classic: 12, cap: 12, pro: 0,  chase: true,  dailies: [-9,-8,-7,-4,-3,-1,0] },
    { key: "cy",  clerk: "user_cy",  name: null,        classic: 11, cap: 11, pro: 0,  chase: true,  dailies: [-2,-1,0] },
    { key: "dee", clerk: "user_dee", name: "Sh1t Lord", classic: 11, cap: 4,  pro: 0,  chase: false, dailies: [0] },
    { key: "eli", clerk: "user_eli", name: "Eli P",     classic: 4,  cap: 0,  pro: 12, chase: false, dailies: [] },
    { key: "fay", clerk: "user_fay", name: "Fay Ortiz", classic: 0,  cap: 14, pro: 0,  chase: false, dailies: [-1,0] },
    { key: "gus", clerk: "user_gus", name: "Gus",       classic: 3,  cap: 3,  pro: 0,  chase: false, dailies: [-5,-4,-3,-2,-1,0] },
    { key: "hal", clerk: "user_hal", name: "Hal 82",    classic: 0,  cap: 0,  pro: 0,  chase: false, dailies: [0] }
  ];
  GMS.forEach((g, i) => { g.sid = "sid" + g.key + String(i).repeat(4); g.token = mintToken(g.clerk); });

  const TODAY = DAILY.dayKey();
  const dayAt = (off) => DAILY.shiftKey(TODAY, off);

  /* ---------- sign everybody in, and name them ---------- */
  for (const g of GMS) {
    const me = await get("me", "/api/me", g.token);
    if (!me.ok || me.anonymous) { eq("sign-in: " + g.key + " resolves to an account", me, "an account"); return finish(); }
    g.tag = me.user.tag;
    await post("claim", "/api/claim", g.token, { sid: g.sid, daily: null });
    if (g.name) {
      const n = await post("name", "/api/name", g.token, { name: g.name });
      g.shown = n.name; g.filtered = !!n.filtered;
    } else g.shown = "GM-" + g.tag;
  }
  eq("v69 accounts: eight different Clerk ids get eight different accounts, each with its own unguessable tag",
    [new Set(GMS.map((g) => g.tag)).size, GMS.every((g) => /^[A-Z0-9]{4,5}$/.test(g.tag))], [8, true]);
  const dee = GMS.find((g) => g.key === "dee"), cy = GMS.find((g) => g.key === "cy");
  eq("v69 names: a clean name is kept, a refused one falls back to GM-<tag>, and no name at all is GM-<tag>",
    [GMS[0].shown, dee.shown === "GM-" + dee.tag, dee.filtered, cy.shown === "GM-" + cy.tag],
    ["Ava Nine", true, true, true]);

  /* ---------- everybody plays ---------- */
  let dead = 0;
  let gi = 0;
  for (const g of GMS) {
    gi++;
    for (const mode of ["classic", "cap", "pro"]) {
      const want = g[mode];
      let made = 0, step = 0;
      while (made < want && step < want * 40) {
        const seed = 6100000 + gi * 100000 + step * 13; step++;
        const run = play(mode, null, seed);
        if (!run) { dead++; continue; }
        const res = await submit(g, run);
        if (!res.ok || !res.stored || !res.verified) {
          eq("submit " + g.key + " " + mode, res, "stored and verified"); return finish();
        }
        made++;
      }
      eq("plays: " + g.key + " finished all " + want + " " + mode + " seasons, every one stored and verified",
        L((r) => r.gm === g.key && r.mode === mode && r.official === null).length, want);
    }
    // THE CHASE: a perfect Presti season is rare (about 3% of bot drafts), so
    // the GMs who are meant to reach the Cheapest board keep playing until they
    // get one. Everything about the run is ordinary; only the search is staged.
    if (g.chase) {
      let found = false;
      for (let step = 0; step < 500 && !found; step++) {
        const seed = 8800000 + gi * 200000 + step * 7;
        const run = play("cap", null, seed);
        if (!run || run.result.wins !== 82) continue;
        const res = await submit(g, run);
        found = !!(res.ok && res.stored && res.verified);
      }
      eq("the chase: " + g.key + " found and banked a perfect Presti season, with the money it cost",
        [found, L((r) => r.gm === g.key && r.mode === "cap" && r.wins === 82 && r.budgetUsed !== null).length > 0],
        [true, true]);
    }
    for (const off of g.dailies) {
      const key = dayAt(off), b = DAILY.boardFor(key);
      const run = play(b.base, b.ch, b.seed, { daily: true });
      if (!run) { dead++; continue; }
      const res = await submit(g, run, { official: key });
      if (!res.ok || !res.stored || !res.verified || res.officialRejected) {
        eq("daily " + g.key + " " + key + " stored as official", res, "stored, verified, official"); return finish();
      }
    }
    eq("dailies: " + g.key + " has one official Daily for each of the " + g.dailies.length + " days played",
      L((r) => r.gm === g.key && r.official !== null).length, g.dailies.length);
  }

  /* ---------- the people who should NOT reach a board ---------- */
  const anonSid = "sidanon0000";
  {
    const run = play("classic", null, 7700011);
    const res = await post("run", "/api/run", null, payload({ sid: anonSid }, run));
    eq("v69.1 anonymous: a signed-out season is accepted, verified and stored, and flagged anonymous",
      [res.ok, res.stored, res.verified, res.anonymous], [true, true, 1, true]);
  }
  {
    const run = play("classic", null, 7700033);
    const res = await submit(GMS[0], run, { cheatWins: 82 });
    eq("v69.1 the submission law: a run claiming an 82-0 it did not get stores UNVERIFIED, with the reason",
      [res.ok, res.stored, res.verified, res.why], [true, true, 0, "wins"]);
  }
  {
    const run = play("classic", null, 7700055);
    const res = await submit(GMS[0], run, { official: TODAY });
    eq("v69.1 the Daily is the server's: a random board posted as today's Daily is stored but refused as official",
      [res.ok, res.stored, res.verified, res.officialRejected], [true, true, 1, true]);
  }
  {
    const b = DAILY.boardFor(TODAY), g = GMS[0];
    const run = play(b.base, b.ch, b.seed, { daily: true });
    const res = await submit(g, run, { official: TODAY });
    eq("v69.1 one attempt a day: a second official run on the same day is answered honestly and not stored",
      [res.ok, res.alreadyToday, res.stored], [true, true, false]);
  }

  /* the one read seam the rest of the file shares */
  const board = (name, q, token) =>
    API.lb.onRequestGet({ request: req("GET", "/api/lb?board=" + name + (q || ""), token), env }).then((r) => r.json());

  /* ---------- THE BOARDS ---------- */
  const show = (title, rows, fmt) => {
    say("  " + title);
    rows.slice(0, 10).forEach((r) => say("    " + String(r.rank).padStart(3) + "  " + String(r.name).padEnd(18) + fmt(r)));
    if (!rows.length) say("    (empty)");
    say("");
  };
  say("\n================ THE BOARDS, as a phone would read them ================\n");

  const MIN_RUNS = API.lb.MIN_RUNS;

  /* 82-0 %, per mode. NOTE the board counts EVERY verified run in the mode,
     the Daily's included, because `runs` has no column saying which board a run
     was played on. The expectation below says so out loud rather than hiding it. */
  for (const mode of ["classic", "cap", "pro"]) {
    const r = await board("rate", "&mode=" + mode);
    show("82-0 % . " + mode, r.rows, (x) => (x.score * 100).toFixed(1) + "%  " + x.immortals + " of " + x.runs);
    const tally = new Map();
    L((x) => x.mode === mode && x.official === null).forEach((x) => {
      const t = tally.get(x.shown) || { runs: 0, imm: 0 };
      t.runs++; if (x.wins === 82) t.imm++;
      tally.set(x.shown, t);
    });
    const w = [...tally.entries()].filter(([, t]) => t.runs >= MIN_RUNS)
      .map(([name, t]) => ({ name, t, rate: t.imm / t.runs }))
      .sort((a, b) => (b.rate - a.rate) || (b.t.runs - a.t.runs))
      .map((x) => x.name + " " + x.t.imm + "/" + x.t.runs);
    eq("v69.1 board 82-0% (" + mode + "): exactly the GMs past the " + MIN_RUNS + "-season bar, in rate order, " +
       "with counts matching every verified season the server accepted in that mode",
      r.rows.map((x) => x.name + " " + x.immortals + "/" + x.runs), w);
  }

  {
    const r = await board("net");
    show("Best net . Classic", r.rows, (x) => (x.score > 0 ? "+" : "") + x.score.toFixed(2));
    const best = byGm(L((x) => x.mode === "classic" && x.official === null), (x) => x.net, desc);
    const w = [...best.entries()].sort((a, b) => b[1] - a[1]).map(([n, v]) => n + " " + v.toFixed(2));
    eq("v69.1 board Best net: every GM with a verified Classic season appears once, at their own best net, in order",
      r.rows.map((x) => x.name + " " + x.score.toFixed(2)), w);
  }

  {
    const r = await board("cheapest");
    show("Cheapest 82-0 . Presti", r.rows, (x) => "$" + x.score + "M");
    const best = byGm(L((x) => x.mode === "cap" && x.wins === 82 && x.budgetUsed !== null && x.official === null), (x) => x.budgetUsed, asc);
    const w = [...best.entries()].sort((a, b) => a[1] - b[1]).map(([n, v]) => n + " $" + v);
    eq("v69.1 board Cheapest 82-0: only perfect Presti seasons, cheapest first, one row per GM",
      r.rows.map((x) => x.name + " $" + x.score), w);
    eq("v69.1 board Cheapest 82-0 is not empty: the chase actually banked perfect Presti seasons to rank",
      r.rows.length >= 3, true);
  }

  {
    const r = await board("daily", "&day=" + TODAY);
    show("Today . " + TODAY, r.rows, (x) => x.score + "-" + (82 - x.score) + "  " + (x.net > 0 ? "+" : "") + x.net.toFixed(1));
    const mine = L((x) => x.official === TODAY).sort((a, b) => (b.wins - a.wins) || (b.net - a.net));
    eq("v69.1 board Today: every GM who played today's real Daily, best record first, and the refused random " +
       "board is not among them",
      r.rows.map((x) => x.name + " " + x.score), mine.map((x) => x.shown + " " + x.wins));
  }

  {
    const r = await board("streak");
    show("Daily streak", r.rows, (x) => x.score + (x.score === 1 ? " day" : " days") + "  (" + x.days + " played)");
    const w = GMS.filter((g) => g.dailies.length).map((g) => {
      const ds = g.dailies.slice().sort((a, b) => a - b);
      let best = 1, run = 1;
      for (let i = 1; i < ds.length; i++) { run = ds[i] === ds[i - 1] + 1 ? run + 1 : 1; if (run > best) best = run; }
      return { name: g.shown, best, days: ds.length };
    }).sort((a, b) => (b.best - a.best) || (b.days - a.days));
    eq("v69.1 board Streak: the longest CONSECUTIVE run of Dailies each GM played, a gap splitting it, computed " +
       "from the rows themselves and not from a counter",
      r.rows.map((x) => x.name + " " + x.score + "/" + x.days), w.map((x) => x.name + " " + x.best + "/" + x.days));
  }

  /* ---------- "and where am I?" ---------- */
  {
    const g = GMS[0];
    const plain = await board("net");
    const withMe = await board("net", "", g.token);
    const row = plain.rows.find((r) => r.name === g.shown);
    eq("v69.1 you are on it: a signed-in reader is told their own rank, and a signed-out reader is told nothing",
      [withMe.you && withMe.you.rank, row && row.rank, plain.you], [row.rank, row.rank, undefined]);
  }
  {
    const fresh = mintToken("user_newbie");
    await get("me", "/api/me", fresh);
    const r = await board("net", "", fresh);
    eq("v69.1 the newcomer: a signed-in player with no seasons is told they are not on the board, never a wrong rank",
      [r.ok, r.you, r.rows.length > 0], [true, { rank: null }, true]);
  }

  /* ---------- the unrankable really are unrankable ---------- */
  {
    const anonRows = db.prepare("SELECT COUNT(*) n FROM runs WHERE user_id IS NULL").get().n;
    const unver = db.prepare("SELECT COUNT(*) n FROM runs WHERE verified = 0").get().n;
    const names = [];
    for (const [b, q] of [["rate", "&mode=classic"], ["rate", "&mode=cap"], ["rate", "&mode=pro"],
                          ["net", ""], ["cheapest", ""], ["streak", ""], ["daily", "&day=" + TODAY]]) {
      names.push.apply(names, (await board(b, q)).rows.map((x) => x.name));
    }
    const known = new Set(GMS.map((g) => g.shown));
    eq("v69.1 nothing unrankable ranks: with " + anonRows + " anonymous and " + unver + " unverified rows in the " +
       "table, every name on every board belongs to a signed-in GM, and no internal id leaks",
      [anonRows > 0, unver > 0, names.length > 0, names.every((n) => known.has(n)),
       (await board("net")).rows.every((r) => r.uid === undefined)],
      [true, true, true, true, true]);
  }

  /* ---------- A DAILY IS NOT AN ORDINARY SEASON (v69.2) ----------
     These three were live defects, each measured here before the fix and pinned
     here after it. All three had one cause: a Daily stores under its BASE mode and
     the mode boards did not exclude it. */
  {
    const fay = GMS.find((g) => g.key === "fay");
    const netRows = (await board("net")).rows;
    const fayVanillaClassic = L((x) => x.gm === "fay" && x.mode === "classic" && x.official === null).length;
    const fayDailyClassic = L((x) => x.gm === "fay" && x.mode === "classic" && x.official !== null).length;
    eq("v69.2 a Daily is not a Classic season: Fay played ZERO vanilla Classic seasons and " + fayDailyClassic +
       " Classic-based Dailies, and she is NOT on the Classic Best net board (before the fix she was, because a " +
       "Daily stores under its base mode and nothing told them apart)",
      [fayVanillaClassic, fayDailyClassic > 0, netRows.some((r) => r.name === fay.shown)], [0, true, false]);

    const avaAll = L((x) => x.gm === "ava" && x.mode === "classic");
    const avaVanilla = avaAll.filter((x) => x.official === null);
    const avaRow = (await board("rate", "&mode=classic")).rows.find((r) => r.name === GMS[0].shown);
    eq("v69.2 and the streak no longer costs you your rate: Ava's 82-0% denominator is her " + avaVanilla.length +
       " ordinary seasons, not all " + avaAll.length + " including Dailies \u2014 before the fix, playing the Daily " +
       "every day LOWERED her perfection rate, so the board charged her for the habit the game wants",
      [avaRow && avaRow.runs, avaVanilla.length, avaAll.length > avaVanilla.length],
      [avaVanilla.length, avaVanilla.length, true]);

    eq("FINDING STILL OPEN \u2014 Pro reaches no best-score board: Best net is Classic only and Cheapest is Presti " +
       "only, so a Pro player's best season is shown nowhere. The fix is a per-mode best board (spec: BEST NET " +
       "behind YOU); it is a design call, not a defect, so it is recorded rather than asserted away",
      [L((x) => x.mode === "pro" && x.official === null).length > 0,
       (await board("net")).rows.length > 0], [true, true]);
  }

  /* ---------- ADOPTION: the signed-out 79-3 that counts (v69.2, the owner) ----------
     Three devices, three different stories, all of them played signed out first. */
  {
     const DEV = "siddevice00001";
     const day = dayAt(-20);                // far outside every GM's range above, so this
     const other = dayAt(-21);              // day's board holds only what adoption put there

     // three ordinary signed-out seasons on this device
     for (let i = 0; i < 3; i++) {
       const run = play("classic", null, 9500100 + i * 17);
       await post("run", "/api/run", null, payload({ sid: DEV }, run));
     }
     // and two signed-out attempts at the same Daily, the SECOND one better.
     // Seeded straight into the table: the point under test is the adoption
     // query's tie-break, and the engine cannot be asked to produce two
     // different records from one shared board on demand.
     const ins = db.prepare(
       `INSERT INTO runs (id,sid,user_id,mode,seed,verified,wins,net,official,created_ts)
        VALUES (?,?,NULL,'cap',1,1,?,?,?,?)`);
     ins.run("00000000-0000-4000-a000-0000000000a1", DEV, 60, 4.0, day, 1000);   // first, worse
     ins.run("00000000-0000-4000-a000-0000000000a2", DEV, 79, 19.0, day, 2000);  // later, better
     ins.run("00000000-0000-4000-a000-0000000000a3", DEV, 70, 9.0, other, 1500); // a second day
     ins.run("00000000-0000-4000-a000-0000000000a4", DEV, 81, 25.0, other, 500);  // unverified? no: earliest of `other`

     const anonBefore = db.prepare("SELECT COUNT(*) n FROM runs WHERE sid = ? AND user_id IS NULL").get(DEV).n;

     // FIRST account on the device: it adopts
     const first = { key: "ivy", token: mintToken("user_ivy"), sid: DEV };
     const meIvy = await get("me", "/api/me", first.token);
     first.tag = meIvy.user.tag;
     const nIvy = await post("name", "/api/name", first.token, { name: "Ivy Reed" });
     first.shown = nIvy.name;
     const claimIvy = await post("claim", "/api/claim", first.token, { sid: DEV, daily: null });

     const adoptedIds = db.prepare("SELECT id FROM runs WHERE sid = ? AND user_id IS NOT NULL ORDER BY id").all(DEV).map((r) => r.id);
     eq("v69.2 adoption: the first account on a device takes its signed-out seasons, and exactly ONE Daily per day",
       [claimIvy.ok, claimIvy.adopted && claimIvy.adopted.first,
        claimIvy.adopted && claimIvy.adopted.seasons, claimIvy.adopted && claimIvy.adopted.dailies],
       [true, true, 3, 2]);
     eq("v69.2 adoption takes the EARLIEST attempt at a day, never the best: the 60-22 stored first is adopted " +
        "and the better 79-3 stored later is left behind, so playing the Daily five times signed out and then " +
        "signing in gets you your first attempt, exactly as one attempt a day intends",
       [adoptedIds.includes("00000000-0000-4000-a000-0000000000a1"),
        adoptedIds.includes("00000000-0000-4000-a000-0000000000a2"),
        adoptedIds.includes("00000000-0000-4000-a000-0000000000a4"),
        adoptedIds.includes("00000000-0000-4000-a000-0000000000a3")],
       [true, false, true, false]);
     eq("v69.2 adoption reaches the board: the adopted Daily is on that day's board under the account's name",
       (await board("daily", "&day=" + day)).rows.map((r) => r.name + " " + r.score), [first.shown + " 60"]);

     // SECOND account on the same device: it adopts nothing
     const second = { token: mintToken("user_jon"), sid: DEV };
     const meJon = await get("me", "/api/me", second.token);
     const run = play("classic", null, 9500900);
     await post("run", "/api/run", null, payload({ sid: DEV }, run));   // another signed-out season
     const claimJon = await post("claim", "/api/claim", second.token, { sid: DEV, daily: null });
     eq("v69.2 one account per device: a second sign-in on the same browser adopts nothing, so a shared phone " +
        "cannot hand one player's seasons to another and runs cannot be laundered between accounts",
       [claimJon.ok, claimJon.adopted && claimJon.adopted.first,
        claimJon.adopted && claimJon.adopted.seasons, claimJon.adopted && claimJon.adopted.dailies],
       [true, false, 0, 0]);
     eq("v69.2 and the runs left on that device stay anonymous rather than falling to whoever signs in next",
       db.prepare("SELECT COUNT(*) n FROM runs WHERE sid = ? AND user_id IS NULL").get(DEV).n,
       anonBefore - 5 + 1);

     // a day the account ALREADY holds is never overwritten, and the UNIQUE index never fires
     const held = db.prepare("SELECT COUNT(*) n FROM runs WHERE user_id = ? AND official = ?")
       .get(db.prepare("SELECT id FROM users WHERE tag = ?").get(first.tag).id, day).n;
     eq("v69.2 adoption never doubles a day: the account holds exactly one row for an adopted day, so the " +
        "UNIQUE (user_id, official) index cannot be violated",
       held, 1);
  }


  /* ---------- the report ---------- */
  say("================ the table ================");
  const n = (sql) => db.prepare(sql).get().n;
  say("  runs:     " + n("SELECT COUNT(*) n FROM runs") +
      "    verified: " + n("SELECT COUNT(*) n FROM runs WHERE verified = 1") +
      "    rankable: " + n("SELECT COUNT(*) n FROM runs WHERE verified = 1 AND user_id IS NOT NULL"));
  say("  accounts: " + n("SELECT COUNT(*) n FROM users") +
      "    official Dailies: " + n("SELECT COUNT(*) n FROM runs WHERE official IS NOT NULL") +
      "    dead drafts skipped: " + dead);
  const v = db.prepare("SELECT verdict, COUNT(*) n FROM runs WHERE verified = 0 GROUP BY verdict").all();
  say("  refused:  " + (v.map((x) => (x.verdict || "none") + " x" + x.n).join(", ") || "none"));
  say("");

  finish();
  function finish() {
    console.log(pass + " passed, " + fail + " failed");
    if (fail) { console.log("failed: " + failures.join(" | ")); process.exitCode = 1; }
    db.close();
  }
}

main().catch((e) => { console.error("HARNESS THREW:", e); process.exitCode = 1; });
