#!/usr/bin/env node
/* TRUE 82 — THREE ACCOUNTS THROUGH ONE SNAKE DRAFT, against a running Worker.
   ─────────────────────────────────────────────────────────────────────────────
   The sibling of tools/boards-live.js, for /api/room. No UI anywhere: this is
   the backend test the owner asked for before anything is wired to a screen.

     node tools/room-live.js --url http://127.0.0.1:8798 [2016] [--pickup]
     node tools/room-live.js --clerk --url <preview> --secret <TEST_AUTH_SECRET>

   IT PROVES, IN THIS ORDER:
     1. a room opens, three accounts take three seats, a fourth is refused
     2. a seat that moves out of turn is refused, and told whose turn it is
     3. TWO SEATS MOVING AT THE SAME INSTANT: exactly one lands, the other is
        told it is behind and handed the log. This is the check the whole
        schema design exists to pass, and only a harness can provoke it.
     4. an illegal pick is refused by the SERVER even though the board came
        from a client: already taken, wrong slot for that season, a full slot
     5. fifteen picks complete, nobody is drafted twice, every roster is legal
     6. the server's derived rosters match the log, read back cold */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const os = require("os");
const { generateKeyPairSync, createSign } = require("crypto");
const ROOT = path.join(__dirname, "..");

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const URL_BASE = String(arg("--url", "http://127.0.0.1:8798")).replace(/\/$/, "");
const CLASS = argv.find((a) => /^\d{4}$/.test(a)) || "2016";
const DIFF = argv.includes("--pickup") ? "pickup" : "pro";
const USE_CLERK = argv.includes("--clerk");
const SECRET = arg("--secret", process.env.T82_TEST_SECRET || "");
const KEYDIR = arg("--keydir", path.join(os.tmpdir(), "t82-boards-live"));

let pass = 0, fail = 0; const failures = [];
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else { fail++; failures.push(name); }
  console.log((ok ? "PASS" : "FAIL") + "  " + name +
    (ok ? "" : "\n      got  " + JSON.stringify(got) + "\n      want " + JSON.stringify(want)));
}

/* ---------- tokens: the same two paths boards-live has ---------- */
function keys() {
  fs.mkdirSync(KEYDIR, { recursive: true });
  const priv = path.join(KEYDIR, "priv.pem"), pub = path.join(KEYDIR, "pub.pem");
  if (!fs.existsSync(priv)) {
    const kp = generateKeyPairSync("rsa", { modulusLength: 2048 });
    fs.writeFileSync(priv, kp.privateKey.export({ type: "pkcs8", format: "pem" }));
    fs.writeFileSync(pub, kp.publicKey.export({ type: "spki", format: "pem" }));
  }
  return { priv: fs.readFileSync(priv, "utf8") };
}
const K = keys();
const b64u = (b) => Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function mintToken(clerkId) {
  const n = Math.floor(Date.now() / 1000);
  const h = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const p = b64u(JSON.stringify({ sub: clerkId, iat: n, nbf: n - 5, exp: n + 3600 }));
  const s = createSign("RSA-SHA256"); s.update(h + "." + p);
  return h + "." + p + "." + b64u(s.sign(K.priv));
}
async function clerkToken(userId) {
  const r = await fetch(URL_BASE + "/api/testauth?k=" + encodeURIComponent(SECRET) +
                        "&user=" + encodeURIComponent(userId));
  const j = await r.json().catch(() => null);
  return j && j.ok ? j.token : null;
}

async function call(method, url, token, body) {
  const headers = {};
  if (token) headers.authorization = "Bearer " + token;
  if (body !== undefined) headers["content-type"] = "application/json";
  const r = await fetch(URL_BASE + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { ok: false, why: "not-json", status: r.status, body: t.slice(0, 200) }; }
}

/* ---------- the board, built the way the host's browser builds it ---------- */
function buildBoard(cls, diff) {
  const core = fs.readFileSync(path.join(ROOT, "sim-core.js"), "utf8");
  const code = fs.readFileSync(path.join(ROOT, "app.js"), "utf8")
    .replace('if (typeof document !== "undefined" && document.getElementById) { boot(); }', "");
  const ctx = {
    window: {}, navigator: {}, location: { search: "" },
    document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
                addEventListener() {}, createElement: () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} },
                setAttribute() {}, appendChild() {} }) },
    performance: { now: () => 0 }, setTimeout: () => 0, clearTimeout: () => 0,
    requestAnimationFrame: () => 0, console: { log() {}, info() {}, warn() {}, error() {} }, Math
  };
  vm.createContext(ctx);
  vm.runInContext(core, ctx); vm.runInContext(code, ctx);
  ctx.initDataInput = JSON.parse(fs.readFileSync(path.join(ROOT, "site_data.json"), "utf8"));
  vm.runInContext("initData(initDataInput); DATA_READY = true; sdDeriveClasses();", ctx);
  ctx.draftsInput = JSON.parse(fs.readFileSync(path.join(ROOT, "redraft-drafts.json"), "utf8")).c;
  vm.runInContext("SD_DRAFTS = draftsInput;", ctx);
  /* THE LABEL TAXES ARE PART OF THE SCORE (v69.2). The Worker loads labels.json
     into its engine, and so does every browser; a harness that skips them
     scores on a DIFFERENT engine and agrees with nothing. This is the repo's
     own trap — handoff 0000002b, trap five — and it has caught two sessions. */
  try {
    const lab = JSON.parse(fs.readFileSync(path.join(ROOT, "labels.json"), "utf8"));
    ctx.labelsInput = lab;
    vm.runInContext("T82.setLabels(labelsInput);", ctx);
  } catch (e) { console.log("NOTE: labels.json did not load; scores will not match the Worker"); }
  ctx.SD_CLASS_ID = cls; ctx.SD_DIFF = diff; ctx.SD = null;
  const pool = ctx.sdBuildPool();
  const IDX = ctx.IDX;
  LOCAL = ctx;
  return {
    v: 1, cls, diff, size: 5, caps: { G: 2, F: 2, C: 1 },
    p: pool.list.map((rec) => ({
      n: rec.name,
      v: Math.round(ctx.valueOf(rec.best) * 100) / 100,
      s: rec.seasons.map((row) => [row[IDX.season], ctx.sdRowBuckets(row).join(""),
                                   Math.round(ctx.valueOf(row) * 100) / 100])
    }))
  };
}

let LOCAL = null;     // the sandbox buildBoard used, kept for the score cross-check

/* What a BROWSER would put on the screen for this roster: the same engine call
   app.js sdFinish makes, with labels loaded. If the Worker's verdict and this
   ever disagree, the room is showing three people a record none of them would
   have seen in the single-player mode. */
function scoreLocally(rosters) {
  const T = LOCAL.T82, IDX = LOCAL.IDX;
  const byName = new Map();
  for (const row of (LOCAL.initDataInput && LOCAL.initDataInput.players) || []) {
    const nm = row[IDX.name];
    let m = byName.get(nm); if (!m) { m = new Map(); byName.set(nm, m); }
    const prev = m.get(row[IDX.season]);
    if (!prev || (row[IDX.mp] || 0) > (prev[IDX.mp] || 0)) m.set(row[IDX.season], row);
  }
  return rosters.map((roster, seat) => {
    const rows = roster.map((p) => (byName.get(p.player) || new Map()).get(p.season));
    if (rows.some((r) => !r)) return null;
    const S = T.newState("classic", 82000 + seat, null);
    const e = T.engine(S, rows, roster.map((p) => p.slot));
    return { seat, wins: e.winTally, net: Math.round(e.net * 100) / 100 };
  });
}

(async function main() {
  const RM = await import("../functions/_lib/room.js");
  console.log("server:  " + URL_BASE);
  console.log("class:   " + CLASS + " (" + DIFF + ")");
  console.log("tokens:  " + (USE_CLERK ? "REAL Clerk, through /api/testauth" : "the throwaway keypair"));

  const board = buildBoard(CLASS, DIFF);
  console.log("board:   " + board.p.length + " players\n");

  const STAMP = Date.now().toString(16).slice(-8);
  const GMS = [{ k: "room-a" }, { k: "room-b" }, { k: "room-c" }, { k: "room-d" }];
  if (USE_CLERK) {
    const rr = await fetch(URL_BASE + "/api/testauth?k=" + encodeURIComponent(SECRET));
    const roster = (await rr.json().catch(() => null) || {}).users || [];
    if (roster.length < 4) { console.log("need 4 TEST_USER_IDS for the fourth-seat check; have " + roster.length); process.exitCode = 1; return; }
    for (let i = 0; i < GMS.length; i++) GMS[i].token = await clerkToken(roster[i]);
    if (GMS.some((g) => !g.token)) { console.log("could not mint tokens"); process.exitCode = 1; return; }
  } else {
    GMS.forEach((g) => { g.token = mintToken(g.k + "_" + STAMP); });
  }

  /* 1. open the room and fill it */
  const PACE = argv.includes("--slow") ? "slow" : "live";
  const PICK_MS = Number(arg("--pickms", 0)) || undefined;
  const made = await call("POST", "/api/room?op=create", GMS[0].token,
    { board, pace: PACE, pickMs: PICK_MS });
  eq("ROOM a room opens, the host takes a seat, the snake order is fixed at creation, and the clock is set",
    [made.ok, made.seat, Array.isArray(made.order) && made.order.length, made.pace,
     made.pickMs === (PICK_MS || (PACE === "slow" ? 8 * 3600 * 1000 : 90 * 1000))],
    [true, 0, 15, PACE, true]);
  if (!made.ok) { report(); return; }
  const id = made.id;

  const j1 = await call("POST", "/api/room?op=join", GMS[1].token, { id });
  const j2 = await call("POST", "/api/room?op=join", GMS[2].token, { id });
  const j3 = await call("POST", "/api/room?op=join", GMS[3].token, { id });
  eq("ROOM three accounts take three seats and a FOURTH is refused, not silently seated",
    [j1.ok, j1.seat, j2.ok, j2.seat, j3.ok, j3.why], [true, 1, true, 2, false, "room-full"]);
  const rejoin = await call("POST", "/api/room?op=join", GMS[1].token, { id });
  eq("ROOM joining twice is idempotent: the same seat back, never a second one",
    [rejoin.ok, rejoin.seat, rejoin.already], [true, 1, true]);

  /* 2. out of turn */
  const st0 = await call("GET", "/api/room?id=" + id, GMS[0].token);
  const wrongSeat = [0, 1, 2].find((s) => s !== st0.turn);
  const bad = await call("POST", "/api/room?op=move", GMS[wrongSeat].token,
    { id, player: board.p[0].n, season: board.p[0].s[0][0], slot: board.p[0].s[0][1][0] });
  eq("ROOM a seat that moves out of turn is refused with a reason, not a 500",
    [bad.ok, bad.why, bad.detail], [false, "illegal", "not your turn"]);

  /* a legal move for the seat on the clock, chosen from the board itself */
  /* Takes the most VALUABLE legal option rather than the first one. Not a
     nicety: drafting the first name alphabetically fills three rosters with
     rookie seasons and scores 2-80, which makes the verdict unreadable and
     hides any real regression in it behind noise. */
  /* Takes the most valuable legal (player, SEASON) pair. Not a nicety: picking
     the first legal thing fills three rosters with rookie years and scores
     2-80, which buries any real change in the verdict under noise. */
  function pickFor(state, seat) {
    const parsed = RM.parseBoard(board);
    let best = null;
    for (const [name, rec] of parsed.players) {
      if (state.taken.has(name)) continue;
      for (const [season, bks] of rec.seasons) {
        const v = (rec.seasonVal && rec.seasonVal.get(season)) ?? rec.v ?? -1;
        if (best && v <= best.v) continue;
        for (const slot of bks) {
          if (RM.openAt(state.rosters[seat], slot, parsed.caps) <= 0) continue;
          if (RM.feasibleAfter(parsed, state, seat, name, slot)) continue;
          best = { player: name, season, slot, v };
          break;
        }
      }
    }
    return best;
  }
  const stateFrom = (v) => RM.deriveState(made.order, v.moves || []);

  /* 3. THE RACE: both other seats fire at the clock seat's turn, together */
  {
    const v = await call("GET", "/api/room?id=" + id, GMS[0].token);
    const st = RM.deriveState(made.order, v.moves);
    const seat = st.seat;
    const tokenForSeat = (s) => GMS[[0, j1.seat, j2.seat].indexOf(s)].token;
    const m = pickFor(st, seat);
    const [r1, r2] = await Promise.all([
      call("POST", "/api/room?op=move", tokenForSeat(seat), { id, seq: st.at, ...m }),
      call("POST", "/api/room?op=move", tokenForSeat(seat), { id, seq: st.at, ...m })
    ]);
    const wins = [r1, r2].filter((x) => x.ok).length;
    const behind = [r1, r2].filter((x) => !x.ok && (x.why === "behind" || x.why === "illegal")).length;
    eq("ROOM TWO MOVES AT ONCE: exactly one lands and the other is turned away with the log, never both",
      [wins, behind], [1, 1]);
  }

  /* 4. illegal picks the SERVER must refuse even though the board came from a client */
  {
    const v = await call("GET", "/api/room?id=" + id, GMS[0].token);
    const st = RM.deriveState(made.order, v.moves);
    const tokenForSeat = (s) => GMS[[0, j1.seat, j2.seat].indexOf(s)].token;
    const tok = tokenForSeat(st.seat);
    const alreadyTaken = v.moves[0];
    const dupe = await call("POST", "/api/room?op=move", tok,
      { id, player: alreadyTaken.player, season: alreadyTaken.season, slot: alreadyTaken.slot });
    const ghost = await call("POST", "/api/room?op=move", tok,
      { id, player: "Nobody At All", season: 2020, slot: "G" });
    const m = pickFor(st, st.seat);
    const wrongSlot = "GFC".split("").find((s) => s !== m.slot);
    const slotErr = await call("POST", "/api/room?op=move", tok,
      { id, player: m.player, season: m.season, slot: wrongSlot });
    eq("ROOM the server refuses a player already drafted, a player not on the board, and a season that does " +
       "not qualify at the slot — all three with the board it was handed, not one it derived",
      [dupe.why, dupe.detail, ghost.detail, slotErr.ok],
      ["illegal", "already drafted", "that player is not on this board", false]);
  }

  /* 5. play it out */
  let guard = 0;
  while (guard++ < 40) {
    const v = await call("GET", "/api/room?id=" + id, GMS[0].token);
    const st = RM.deriveState(made.order, v.moves);
    if (st.done) break;
    const tokenForSeat = (s) => GMS[[0, j1.seat, j2.seat].indexOf(s)].token;
    const m = pickFor(st, st.seat);
    if (!m) { eq("ROOM a legal move exists at pick " + (st.at + 1), false, true); break; }
    const res = await call("POST", "/api/room?op=move", tokenForSeat(st.seat), { id, seq: st.at, ...m });
    if (!res.ok) { eq("ROOM move " + (st.at + 1) + " landed", res, "ok"); break; }
  }

  /* 6. read it back cold and check the whole thing */
  const fin = await call("GET", "/api/room?id=" + id, GMS[0].token);
  const names = fin.moves.map((m) => m.player);
  const shapes = fin.rosters.map((r) => {
    const n = { G: 0, F: 0, C: 0 };
    r.forEach((p) => n[p.slot]++);
    return r.length + ":" + n.G + n.F + n.C;
  });
  eq("ROOM fifteen picks, nobody drafted twice, three legal 2G/2F/1C rosters, and the room closes itself",
    [fin.moves.length, new Set(names).size, shapes, fin.done, fin.state],
    [15, 15, ["5:221", "5:221", "5:221"], true, "done"]);
  eq("ROOM the seats took the turns the stored snake order said they would",
    fin.moves.map((m) => m.seat), made.order);
  const after = await call("POST", "/api/room?op=move", GMS[0].token,
    { id, player: board.p[0].n, season: board.p[0].s[0][0], slot: board.p[0].s[0][1][0] });
  eq("ROOM a move after the draft is over is refused", [after.ok, after.detail], [false, "the draft is over"]);

  /* THE VERDICT. A room that does not end in a result is not a game, and this
     is the one piece the single-player Redraft had and the room did not. */
  const scored = await call("GET", "/api/room?id=" + id + "&score=1", GMS[0].token);
  const v = scored.verdict || [];
  eq("ROOM a finished draft is SCORED: three projected seasons, a place each, and no ties on the podium",
    [Array.isArray(v) ? v.length : 0,
     v.every((t) => Number.isInteger(t.wins) && t.wins >= 0 && t.wins <= 82),
     v.every((t) => t.five.length === 5),
     v.map((t) => t.place).sort().join("")],
    [3, true, true, "123"]);
  /* the same room scored twice must give the same answer: three people are
     going to compare it, so it cannot wobble */
  /* THE CROSS-CHECK THAT MATTERS: the Worker's verdict against what a browser
     with labels loaded would compute for the same five. */
  const local = scoreLocally(fin.rosters);
  eq("ROOM the Worker's verdict is the record a BROWSER would show for the same rosters \u2014 same engine, " +
     "labels and all, so a room is scored on the terms every other board uses",
    v.map((t) => t.seat + ":" + t.wins + ":" + t.net).sort(),
    (local || []).filter(Boolean).map((t) => t.seat + ":" + t.wins + ":" + t.net).sort());

  const again = await call("GET", "/api/room?id=" + id + "&score=1", GMS[1].token);
  eq("ROOM the verdict is reproducible \u2014 scoring the same finished room twice gives the same records",
    (again.verdict || []).map((t) => t.seat + ":" + t.wins + ":" + t.net),
    v.map((t) => t.seat + ":" + t.wins + ":" + t.net));
  {
    const open2 = await call("POST", "/api/room?op=create", GMS[0].token, { board, pace: "slow" });
    const mid = await call("GET", "/api/room?id=" + open2.id + "&score=1", GMS[0].token);
    eq("ROOM the verdict is only offered once the draft is OVER, so a poll mid-draft never pays for it",
      mid.verdict, undefined);
  }

  console.log("");
  fin.rosters.forEach((r, i) => {
    const t = v.find((x) => x.seat === i) || {};
    console.log("  seat " + i + ": " + (t.wins != null ? t.wins + "-" + t.losses + "  net " +
      (t.net > 0 ? "+" : "") + t.net + "  #" + t.place + "   " : "") +
      r.map((p) => p.player + " " + p.season + " (" + p.slot + ")").join(", "));
  });

  /* 7. THE CLOCK, in a room of its own with a one-second pick. An abandoned
     seat must not freeze the other two, and the catch-up has to run on a plain
     READ — there is no scheduler, so if looking at the room does not advance
     it, nothing ever will. */
  console.log("");
  const fast = await call("POST", "/api/room?op=create", GMS[0].token, { board, pace: "live", pickMs: 1000 });
  await call("POST", "/api/room?op=join", GMS[1].token, { id: fast.id });
  await call("POST", "/api/room?op=join", GMS[2].token, { id: fast.id });
  const before = await call("GET", "/api/room?id=" + fast.id, GMS[0].token);
  eq("ROOM the clock is reported with the room, so a client can draw it without guessing",
    [before.pickMs, typeof before.deadline === "number", before.deadline > before.now], [1000, true, true]);

  await new Promise((r) => setTimeout(r, 2600));
  const after1 = await call("GET", "/api/room?id=" + fast.id, GMS[0].token);
  eq("ROOM NOBODY PICKED AND THE CLOCK RAN OUT: a plain read auto-picks for the seat, more than once if more " +
     "than one deadline passed, and the draft moves on instead of freezing",
    [after1.at >= 2, after1.moves.filter((m) => m.auto).length >= 2, after1.done], [true, true, false]);

  /* and the auto-picks must be legal picks, not just rows */
  const dupes = after1.moves.map((m) => m.player);
  eq("ROOM an auto-pick obeys the same rules a person does: never a duplicate, always into an open slot",
    [new Set(dupes).size, dupes.length], [dupes.length, dupes.length]);

  /* a seat that comes BACK mid-draft can still play */
  {
    const v = await call("GET", "/api/room?id=" + fast.id, GMS[0].token);
    const st = RM.deriveState(JSON.parse(JSON.stringify(fast.order)), v.moves);
    if (!st.done) {
      const tokenForSeat = (sx) => GMS[sx].token;
      const m = pickFor(st, st.seat);
      const back = await call("POST", "/api/room?op=move", tokenForSeat(st.seat), { id: fast.id, ...m });
      eq("ROOM a seat that comes back after the clock picked for it can still take its next turn",
        [back.ok === true || back.why === "behind"], [true]);
    }
  }

  /* the slow pace must NOT auto-pick on the same timescale */
  const slow = await call("POST", "/api/room?op=create", GMS[0].token, { board, pace: "slow" });
  await call("POST", "/api/room?op=join", GMS[1].token, { id: slow.id });
  await call("POST", "/api/room?op=join", GMS[2].token, { id: slow.id });
  await new Promise((r) => setTimeout(r, 1500));
  const slowView = await call("GET", "/api/room?id=" + slow.id, GMS[0].token);
  eq("ROOM a SLOW room sits on its eight-hour clock and auto-picks nothing: the two paces are really different",
    [slowView.pace, slowView.pickMs, slowView.at, slowView.deadline - slowView.now > 7 * 3600 * 1000],
    ["slow", 8 * 3600 * 1000, 0, true]);

  report();
  function report() {
    console.log("\n" + pass + " passed, " + fail + " failed");
    if (fail) console.log("failed: " + failures.join(" | "));
    process.exitCode = fail ? 1 : 0;
  }
})();
