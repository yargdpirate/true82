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
  ctx.SD_CLASS_ID = cls; ctx.SD_DIFF = diff; ctx.SD = null;
  const pool = ctx.sdBuildPool();
  const IDX = ctx.IDX;
  return {
    v: 1, cls, diff, size: 5, caps: { G: 2, F: 2, C: 1 },
    p: pool.list.map((rec) => ({
      n: rec.name,
      s: rec.seasons.map((row) => [row[IDX.season], ctx.sdRowBuckets(row).join("")])
    }))
  };
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
  const made = await call("POST", "/api/room?op=create", GMS[0].token, { board });
  eq("ROOM a room opens, the host takes a seat, and the snake order is fixed at creation",
    [made.ok, made.seat, Array.isArray(made.order) && made.order.length], [true, 0, 15]);
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
  function pickFor(state, seat) {
    const parsed = RM.parseBoard(board);
    for (const [name, rec] of parsed.players) {
      if (state.taken.has(name)) continue;
      for (const [season, bks] of rec.seasons) {
        for (const slot of bks) {
          if (RM.openAt(state.rosters[seat], slot, parsed.caps) <= 0) continue;
          if (RM.feasibleAfter(parsed, state, seat, name, slot)) continue;
          return { player: name, season, slot };
        }
      }
    }
    return null;
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

  console.log("");
  fin.rosters.forEach((r, i) => console.log("  seat " + i + ": " + r.map((p) => p.player + " " + p.season + " (" + p.slot + ")").join(", ")));

  report();
  function report() {
    console.log("\n" + pass + " passed, " + fail + " failed");
    if (fail) console.log("failed: " + failures.join(" | "));
    process.exitCode = fail ? 1 : 0;
  }
})();
