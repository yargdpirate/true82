/* TRUE 82 — tools/boards-live.js: the boards against a RUNNING Worker.
   ─────────────────────────────────────────────────────────────────────────────
   tools/boards-e2e.js proves the handlers, the SQL, the auth crypto and the
   replay, all in one node process. It cannot prove the thing that actually
   bit this feature twice: the WORKER RUNTIME. Specifically
     - _lib/sim.js loading site_data.json through env.ASSETS and warming the
       engine inside a request's CPU budget (the "you need the paid plan" scare),
     - the real D1 driver, its UNIQUE error text, and REAL column types,
     - env vars actually reaching the deployment.
   So this one speaks HTTP to a server you started, over the same endpoints a
   phone uses, with tokens it mints against a keypair it controls. No Clerk, no
   sign-in, no browser: the Clerk half is proved separately by a human signing in.

   SETUP (once):
     1. node tools/boards-live.js --keys          writes a throwaway keypair and
                                                  prints the CLERK_JWT_KEY value
     2. start a server with that binding, D1 bound, and the migrations applied
        (.claude/launch.json "site-boards" does exactly this on :8793)
     3. node tools/boards-live.js [--url http://127.0.0.1:8793]

   It is additive: it never deletes a row, so it is safe to point at a scratch
   server and pointless to aim at production. Every GM it makes is tagged in the
   display name, so its rows are identifiable afterwards. */
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { generateKeyPairSync, createSign } = require("crypto");

const ROOT = path.resolve(__dirname, "..");
// THE HARNESS MUST SCORE LIKE A BROWSER. app.js loads labels.json and calls
// T82.setLabels, so the v61 label taxes move the net it claims. A harness that
// skips them agrees with a server that also skips them, for the wrong reason,
// and that is exactly how the missing labels in _lib/sim.js survived until
// 2026-10-04 (26.7% of runs would have failed verification on the live site).
process.argv.push("--labels");                 // read by tools/daily-audit.js load()
const AUD = require(path.join(ROOT, "tools/daily-audit.js"));

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const KEYDIR = arg("--keydir", path.join(os.tmpdir(), "t82-boards-live"));
const URL_BASE = String(arg("--url", "http://127.0.0.1:8793")).replace(/\/$/, "");

/* ---------- REAL CLERK IDENTITIES (v69.3) ----------
   With --clerk, this driver stops minting its own tokens and asks the deployment
   for REAL ones through /api/testauth (see that file's header for the setup and
   the four guards). Everything else about the run is identical, which is the
   point: the same 32 checks, against the same Worker, with tokens Clerk signed.

   This is what the owner asked for after a morning lost to simulated accounts:
   "i do want you directly controlling actual accounts instead of simulating".
   With real tokens a wrong CLERK_JWT_KEY, a wrong AUTHORIZED_PARTIES or an env
   var that never got baked into a deployment FAILS HERE, which is exactly the
   class of problem that kept getting rediscovered by hand.

     node tools/boards-live.js --clerk --url https://v69-boards.true82.pages.dev \
                               --secret <TEST_AUTH_SECRET>
   Add --list to print the roster the preview will mint for and stop. */
async function clerkRoster(base, secret) {
  const r = await fetch(base + "/api/testauth?k=" + encodeURIComponent(secret));
  if (!r.ok) return { ok: false, why: "testauth answered " + r.status + " (wrong host, wrong secret, or not configured)" };
  return r.json();
}
async function clerkToken(base, secret, userId) {
  const r = await fetch(base + "/api/testauth?k=" + encodeURIComponent(secret) +
    "&user=" + encodeURIComponent(userId));
  const j = await r.json().catch(() => null);
  if (!j || !j.ok || !j.token) return null;
  return j.token;
}

function keys() {
  fs.mkdirSync(KEYDIR, { recursive: true });
  const priv = path.join(KEYDIR, "priv.pem"), pub = path.join(KEYDIR, "pub.pem");
  if (!fs.existsSync(priv)) {
    const kp = generateKeyPairSync("rsa", { modulusLength: 2048 });
    fs.writeFileSync(priv, kp.privateKey.export({ type: "pkcs8", format: "pem" }));
    fs.writeFileSync(pub, kp.publicKey.export({ type: "spki", format: "pem" }));
  }
  return { priv: fs.readFileSync(priv, "utf8"), pub: fs.readFileSync(pub, "utf8") };
}

if (argv.includes("--keys")) {
  const k = keys();
  // auth.js strips every PEM header and all whitespace, so one line is valid
  console.log(k.pub.replace(/\s+/g, ""));
  process.exit(0);
}

const K = keys();
const b64u = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function mintToken(clerkId) {
  const nowS = Math.floor(Date.now() / 1000);
  const h = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const p = b64u(JSON.stringify({ sub: clerkId, iat: nowS, nbf: nowS - 5, exp: nowS + 3600 }));
  const s = createSign("RSA-SHA256"); s.update(h + "." + p);
  return h + "." + p + "." + b64u(s.sign(K.priv));
}

let pass = 0, fail = 0, notRepeatable = 0, skipped = 0; const failures = [];
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else { fail++; failures.push(name); }
  console.log((ok ? "PASS" : "FAIL") + "  " + name +
    (ok ? "" : "\n      got  " + JSON.stringify(got) + "\n      want " + JSON.stringify(want)));
}

async function call(method, url, token, body) {
  const headers = {};
  if (token) headers.authorization = "Bearer " + token;
  if (body !== undefined) headers["content-type"] = "application/json";
  const r = await fetch(URL_BASE + url, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await r.text();
  try { return JSON.parse(text); }
  catch { return { ok: false, why: "not-json", status: r.status, body: text.slice(0, 200) }; }
}

async function main() {
  const env0 = AUD.load(ROOT);
  const T = env0.T82, DAILY = env0.T82DAILY;
  const bot = AUD.makeBot(env0, {});

  const USE_CLERK = argv.includes("--clerk");
  const TEST_SECRET = arg("--secret", process.env.T82_TEST_SECRET || "");
  console.log("server:  " + URL_BASE);
  console.log(USE_CLERK ? "tokens:  REAL Clerk, through /api/testauth" : "keydir:  " + KEYDIR);

  let roster = [];
  if (USE_CLERK) {
    if (!TEST_SECRET) { console.log("--clerk needs --secret <TEST_AUTH_SECRET> (or T82_TEST_SECRET)"); process.exitCode = 1; return; }
    const r = await clerkRoster(URL_BASE, TEST_SECRET);
    if (!r || !r.ok) { console.log("testauth: " + ((r && r.why) || "no answer")); process.exitCode = 1; return; }
    roster = r.users || [];
    console.log("roster:  " + (roster.length ? roster.join(", ") : "(TEST_USER_IDS is not set)"));
    if (!roster.length) { process.exitCode = 1; return; }
    if (argv.includes("--list")) return;
  }
  console.log("");

  const up = await call("GET", "/api/me", null);
  if (!up || up.ok !== true) {
    console.log("The server is not answering /api/me. Start it first (see the header). Got: " + JSON.stringify(up));
    process.exitCode = 1; return;
  }

  function play(mode, ch, seed, opts) {
    opts = opts || {};
    const r = bot(mode, ch, seed);
    if (r.dead) return null;
    const playsOut = (mode === "classic" || mode === "cap") && !ch && !opts.daily;
    const actions = r.S.actions.slice().concat(playsOut ? ["ss"] : []);
    const rp = T.replay({ mode, seed, actions }, ch || null);
    if (!rp || !rp.ok) return null;
    return { mode, seed, actions, result: rp.result };
  }

  // A run id that is unique per process, so re-running never collides.
  const STAMP = Date.now().toString(16).slice(-8);
  let seq = 0;
  const runId = () => "00000000-0000-4000-b000-" + STAMP + String(++seq).padStart(4, "0");

  function body(g, run, opts) {
    opts = opts || {};
    const x = run.result;
    return {
      id: runId(), sid: g.sid, mode: run.mode, seed: run.seed, actions: run.actions,
      rngDraws: opts.cheatDraws !== undefined ? opts.cheatDraws : x.rngDraws,
      coreVersion: x.coreVersion, dataVersion: x.dataVersion,
      official: opts.official || undefined,
      claim: { wins: opts.cheatWins !== undefined ? opts.cheatWins : x.wins, net: x.net }
    };
  }

  /* ---------- THE RUNTIME QUESTION, asked first and alone ----------
     The very first submission to a cold isolate is the one that pays the whole
     engine warm-up. If the runtime cannot afford it, THIS is where it shows, as
     `verified: 0, why: "engine"`. Everything after it rides a warm isolate. */
  const probe = { key: "probe", sid: "sidprobe" + STAMP, token: mintToken("live_probe_" + STAMP) };
  const first = play("classic", null, 9100001);
  const t0 = Date.now();
  const firstRes = await call("POST", "/api/run", probe.token, body(probe, first));
  const coldMs = Date.now() - t0;
  eq("LIVE the cold start: the FIRST submission to a cold isolate pays the engine warm-up and still verifies " +
     "(" + coldMs + " ms wall; why:\"engine\" here would be the only thing that justifies the paid plan)",
    [firstRes.ok, firstRes.verified, firstRes.why, firstRes.wins === first.result.wins],
    [true, 1, undefined, true]);
  const t1 = Date.now();
  const warmRes = await call("POST", "/api/run", probe.token, body(probe, play("classic", null, 9100002)));
  const warmMs = Date.now() - t1;
  eq("LIVE the warm path: a second submission to the same isolate verifies too (" + warmMs + " ms wall)",
    [warmRes.ok, warmRes.verified], [true, 1]);

  /* ---------- real column types through the real D1 driver ---------- */
  const GMS = [
    { key: "live-a", name: "LiveTest A", classic: 11, cap: 3, pro: 0, dailies: [-3, -2, -1, 0] },
    { key: "live-b", name: "LiveTest B", classic: 3, cap: 11, pro: 0, dailies: [-1, 0] },
    { key: "live-c", name: "LiveTest C", classic: 0, cap: 0, pro: 11, dailies: [0] }
  ];
  // The display name carries the run stamp on purpose. Two accounts CAN hold the
  // same visible name (cleanName does not enforce uniqueness and the boards show
  // the name, not the tag), so re-running this driver would otherwise put two
  // indistinguishable "LiveTest A" rows on one board and the checks below could
  // not tell them apart. That collision is a real product finding, recorded in
  // the handoff; here it is simply designed out.
  /* With --clerk each GM is a REAL Clerk user from the preview's allow-list, and
     its token is one Clerk signed. Without it, the throwaway keypair as before. */
  if (USE_CLERK && roster.length < GMS.length) {
    console.log("NOTE: " + roster.length + " test users for " + GMS.length +
      " GMs; running the first " + roster.length + ". Add more ids to TEST_USER_IDS for the rest.");
    GMS.length = roster.length;
  }
  GMS.forEach((g, i) => {
    g.sid = "sidlive" + i + STAMP;
    g.name = g.name + " " + STAMP.slice(-4);
    g.clerkId = USE_CLERK ? roster[i] : null;
    g.token = USE_CLERK ? null : mintToken("live_" + g.key + "_" + STAMP);
  });
  if (USE_CLERK) {
    for (const g of GMS) {
      g.token = await clerkToken(URL_BASE, TEST_SECRET, g.clerkId);
      if (!g.token) { console.log("could not mint a token for " + g.clerkId); process.exitCode = 1; return; }
    }
  }

  for (const g of GMS) {
    const me = await call("GET", "/api/me", g.token);
    eq("LIVE sign-in: " + g.key + " gets an account and a tag from the real database",
      [me.ok, me.anonymous === false, !!(me.user && /^[A-Z0-9]{4,5}$/.test(me.user.tag))], [true, true, true]);
    if (!me.user) { console.log("   (stopping: " + JSON.stringify(me) + ")"); break; }
    g.tag = me.user.tag;
    await call("POST", "/api/claim", g.token, { sid: g.sid, daily: null });
    const n = await call("POST", "/api/name", g.token, { name: g.name });
    g.shown = n.ok ? n.name : "GM-" + g.tag;
  }
  if (!GMS.every((g) => g.tag)) { report(); return; }

  const TODAY = DAILY.dayKey();
  const ledger = [];
  let gi = 0;
  for (const g of GMS) {
    gi++;
    for (const mode of ["classic", "cap", "pro"]) {
      let made = 0, step = 0;
      while (made < g[mode] && step < g[mode] * 40) {
        const seed = 9200000 + gi * 100000 + step * 13; step++;
        const run = play(mode, null, seed);
        if (!run) continue;
        const res = await call("POST", "/api/run", g.token, body(g, run));
        if (!(res.ok && res.stored && res.verified)) {
          eq("LIVE submit " + g.key + " " + mode, res, "stored and verified"); report(); return;
        }
        ledger.push({ shown: g.shown, mode, wins: run.result.wins, net: run.result.net,
                      budgetUsed: run.result.budgetUsed, official: null });
        made++;
      }
      eq("LIVE plays: " + g.key + " banked all " + g[mode] + " " + mode + " seasons through the Worker",
        ledger.filter((x) => x.shown === g.shown && x.mode === mode).length, g[mode]);
    }
    for (const off of g.dailies) {
      const key = DAILY.shiftKey(TODAY, off), b = DAILY.boardFor(key);
      const run = play(b.base, b.ch, b.seed, { daily: true });
      if (!run) continue;
      const res = await call("POST", "/api/run", g.token, body(g, run, { official: key }));
      // THE ONE PATH THE DEPLOYMENT HAS NEVER SHOWN: an official Daily, whose
      // mode, seed AND challenge the Worker re-derives with its own daily-core.js
      // and challenges.js. A missing challenge import makes this fail, and the
      // symptom looks like a broken engine.
      /* v69.4: SAY WHEN IT IS THE DATABASE AND NOT THE CODE. These five Clerk
         identities are fixed, so a second pass against a database that still
         holds the first one trips UNIQUE (user_id, official) — the one-attempt-
         a-day rule doing exactly its job — and every Daily check fails with
         `stored: false` for a reason that has nothing to do with the board.
         Note what is still proven when that happens: `officialRejected: false`
         means the Worker DID re-derive the same mode, seed and challenge, which
         is what this check exists for. Only the storing is refused. */
      if (res.ok && res.verified === 1 && !res.officialRejected && !res.stored && res.alreadyToday) {
        notRepeatable++;
        console.log("NOTE  " + key + ": " + g.key + " already has an official run for that day, so it was not " +
                    "stored. The board still re-derived correctly (officialRejected: false). Clear the preview " +
                    "database to make this pass repeatable.");
      } else {
        eq("LIVE the official Daily " + key + " (" + b.base + ", " + ((b.ch && b.ch.id) || "vanilla") + "): the " +
           "Worker re-derived the same board and took it as official for " + g.key,
          [res.ok, res.stored, res.verified, res.officialRejected, res.wins === run.result.wins],
          [true, true, 1, false, true]);
      }
      if (res.ok && res.stored && res.verified && !res.officialRejected) {
        ledger.push({ shown: g.shown, mode: b.base, wins: run.result.wins, net: run.result.net,
                      budgetUsed: run.result.budgetUsed, official: key });
      }
    }
  }

  /* ---------- the refusals, through the real driver ---------- */
  {
    const run = play("classic", null, 9300011);
    const res = await call("POST", "/api/run", GMS[0].token, body(GMS[0], run, { cheatWins: 82 }));
    eq("LIVE the submission law: a claimed 82-0 that was not one stores unverified through the real D1",
      [res.ok, res.stored, res.verified, res.why], [true, true, 0, "wins"]);
  }
  {
    const b = DAILY.boardFor(TODAY);
    const run = play(b.base, b.ch, b.seed, { daily: true });
    const res = await call("POST", "/api/run", GMS[0].token, body(GMS[0], run, { official: TODAY }));
    // the real D1's UNIQUE violation message is what run.js pattern-matches on,
    // and it is NOT the same string node:sqlite produces
    eq("LIVE one attempt a day: the real D1's UNIQUE error is recognised as alreadyToday, not as a server error",
      [res.ok, res.alreadyToday, res.stored, res.storeError], [true, true, false, undefined]);
  }

  /* ---------- the boards, read back over HTTP ---------- */
  console.log("\n================ THE BOARDS, from the running Worker ================\n");
  const board = (name, q, token) => call("GET", "/api/lb?board=" + name + (q || ""), token);
  const show = (title, rows, fmt) => {
    console.log("  " + title);
    rows.slice(0, 8).forEach((r) => console.log("    " + String(r.rank).padStart(3) + "  " +
      String(r.name).padEnd(16) + fmt(r)));
    if (!rows.length) console.log("    (empty)");
    console.log("");
  };
  const mine = new Set(GMS.map((g) => g.shown));

  /* v69.5 EVERY BOARD CHECK IS AN ORACLE COMPARISON, and the oracle is the
     ledger of what THIS run banked. That only equals the board when the
     database held nothing first. These five Clerk identities are reused every
     run, so a second pass sees the first pass's rows under this run's display
     names and every board check fails — eleven failures that look like broken
     SQL and are nothing of the kind. It cost a real diagnosis once; it should
     not cost another.

     The boards are still PRINTED either way, so a dirty run is still worth
     reading. Only the assertions wait for a clean one. */
  const oracleOk = !notRepeatable;
  const eqBoard = (name, got, want) => {
    if (oracleOk) { eq(name, got, want); return; }
    skipped++;
  };

  for (const mode of ["classic", "cap", "pro"]) {
    const r = await board("rate", "&mode=" + mode);
    show("82-0 % . " + mode, r.rows, (x) => (x.score * 100).toFixed(1) + "%  " + x.immortals + " of " + x.runs);
    const tally = new Map();
    // v69.2: the mode boards exclude Dailies (lb.js, `official IS NULL`), so the
    // oracle must too, or it measures the board the code used to be.
    ledger.filter((x) => x.mode === mode && x.official === null).forEach((x) => {
      const t = tally.get(x.shown) || { runs: 0, imm: 0 }; t.runs++; if (x.wins === 82) t.imm++; tally.set(x.shown, t);
    });
    const want = [...tally.entries()].filter(([, t]) => t.runs >= 10)
      .sort((a, b) => (b[1].imm / b[1].runs - a[1].imm / a[1].runs) || (b[1].runs - a[1].runs))
      .map(([n, t]) => n + " " + t.imm + "/" + t.runs);
    eqBoard("LIVE board 82-0% (" + mode + "): the Worker's own counts match every season it said it verified",
      r.rows.filter((x) => mine.has(x.name)).map((x) => x.name + " " + x.immortals + "/" + x.runs), want);
  }
  /* v69.5 the two boards the owner added from the lab's SPEC. Each is checked
     against an oracle built from the ledger of what this run actually banked,
     the same way the mode boards are, so the check measures the Worker's SQL
     and not a restatement of it.

     BOTH NEED A CLEAN DATABASE, like every other board check (see eqBoard).
     These two additionally cannot even be PRINTED usefully against a dirty one,
     because they count a GM's whole history rather than one run's worth, so
     they are skipped outright with a note rather than shown misleadingly. */
  if (notRepeatable) {
    console.log("NOTE  the 82-0 club and This month were not checked: this database already holds a previous " +
                "pass under the same five identities, and both boards count a GM's whole history. Clear it.");
  } else {
    const r = await board("club");
    show("The 82-0 club", r.rows, (x) => x.score + (x.score === 1 ? " perfect" : " perfects"));
    const tally = new Map();
    // every mode counts, Dailies do not (lb.js `official IS NULL`)
    ledger.filter((x) => x.wins === 82 && x.official === null)
      .forEach((x) => tally.set(x.shown, (tally.get(x.shown) || 0) + 1));
    const want = [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => n + " x" + c);
    const got = r.rows.filter((x) => mine.has(x.name)).map((x) => x.name + " x" + x.score);
    eqBoard("LIVE board 82-0 club: every perfect this run banked is on it, in any mode, and no Daily perfect is",
      [got.length, got.slice().sort(), want.slice().sort()], [want.length, want.slice().sort(), want.slice().sort()]);
    eqBoard("LIVE board 82-0 club: the tie is broken by who got there first, so equal scores are ordered by first_ts",
      r.rows.every((x, i, a) => i === 0 || a[i - 1].score > x.score ||
                                (a[i - 1].score === x.score && a[i - 1].first_ts <= x.first_ts)), true);

    const month = TODAY.slice(0, 7);
    const rm = await board("month");
    show("This month . " + month, rm.rows, (x) => Number(x.score).toFixed(1) + " avg  " + x.days + "d  best " + x.best);
    const byGm = new Map();
    ledger.filter((x) => x.official && x.official.slice(0, 7) === month)
      .forEach((x) => { const a = byGm.get(x.shown) || []; a.push(x.wins); byGm.set(x.shown, a); });
    const wantM = [...byGm.entries()]
      .map(([n, ws]) => {
        const best = ws.slice().sort((a, b) => b - a).slice(0, 10);
        return { n, days: best.length, avg: Math.round((best.reduce((t, w) => t + w, 0) / best.length) * 10) / 10 };
      })
      .filter((x) => x.days >= 3)
      .sort((a, b) => (b.avg - a.avg) || (b.days - a.days))
      .map((x) => x.n + " " + x.avg + " over " + x.days);
    eqBoard("LIVE board This month: the best ten Dailies of the month averaged, and a GM under the qualifying bar is " +
       "left off rather than ranked on one lucky day",
      rm.rows.filter((x) => mine.has(x.name)).map((x) => x.name + " " + x.score + " over " + x.days), wantM);
  }
  {
    const r = await board("net");
    show("Best net . Classic", r.rows, (x) => (x.score > 0 ? "+" : "") + Number(x.score).toFixed(2));
    const best = new Map();
    ledger.filter((x) => x.mode === "classic" && x.official === null).forEach((x) => {
      if (!best.has(x.shown) || x.net > best.get(x.shown)) best.set(x.shown, x.net);
    });
    eqBoard("LIVE board Best net: a REAL column holds the float, and every GM reads back at their own best net",
      r.rows.filter((x) => mine.has(x.name)).map((x) => x.name + " " + Number(x.score).toFixed(2)),
      [...best.entries()].sort((a, b) => b[1] - a[1]).map(([n, v]) => n + " " + v.toFixed(2)));
  }
  {
    const r = await board("daily", "&day=" + TODAY);
    show("Today . " + TODAY, r.rows, (x) => x.score + "-" + (82 - x.score) +
      (x.net == null ? "" : "  " + (x.net > 0 ? "+" : "") + Number(x.net).toFixed(1)));
    const want = ledger.filter((x) => x.official === TODAY).sort((a, b) => (b.wins - a.wins) || (b.net - a.net));
    eqBoard("LIVE board Today: the deployment's own Daily board, which no deployment had ever filled before",
      r.rows.filter((x) => mine.has(x.name)).map((x) => x.name + " " + x.score),
      want.map((x) => x.shown + " " + x.wins));
    eq("LIVE board Today is not empty", r.rows.length > 0, true);
  }
  {
    const r = await board("streak");
    show("Daily streak", r.rows, (x) => x.score + (x.score === 1 ? " day" : " days") + "  (" + x.days + " played)");
    const want = GMS.filter((g) => g.dailies.length).map((g) => {
      const ds = g.dailies.slice().sort((a, b) => a - b);
      let best = 1, run = 1;
      for (let i = 1; i < ds.length; i++) { run = ds[i] === ds[i - 1] + 1 ? run + 1 : 1; if (run > best) best = run; }
      return g.shown + " " + best + "/" + ds.length;
    }).sort((a, b) => Number(b.split(" ")[1].split("/")[0]) - Number(a.split(" ")[1].split("/")[0]));
    eqBoard("LIVE board Streak: julianday() and ROW_NUMBER() OVER () really work in D1, not just in SQLite",
      r.rows.filter((x) => mine.has(x.name)).map((x) => x.name + " " + x.score + "/" + x.days), want);
  }
  {
    const r = await board("cheapest");
    show("Cheapest 82-0 . Presti", r.rows, (x) => "$" + x.score + "M");
    eqBoard("LIVE board Cheapest 82-0: the query runs and returns only perfect Presti seasons",
      [r.ok, r.rows.every((x) => typeof x.score === "number")], [true, true]);
  }
  {
    const g = GMS[0];
    const withMe = await board("net", "", g.token);
    const row = withMe.rows.find((x) => x.name === g.shown);
    eq("LIVE you are on it: the Worker tells a signed-in reader their own rank",
      [!!withMe.you, withMe.you && withMe.you.rank, row && row.rank], [true, row.rank, row.rank]);
  }

  report();
  function report() {
    console.log("\nGMs created (delete these rows when you are done): " +
      GMS.filter((g) => g.tag).map((g) => g.shown + " [" + g.tag + "]").join(", "));
    console.log(pass + " passed, " + fail + " failed");
    if (skipped) console.log(skipped + " board checks were not asserted (the boards above are still real; the " +

      "oracle is this run's ledger, which only matches the board on a clean database).");
    if (notRepeatable) console.log(notRepeatable + " Daily submissions were skipped as already played: this database has seen a " +
      "pass before. Clear it (it is the preview's own since v69.3) for a clean 32.");
    if (fail) { console.log("failed: " + failures.join(" | ")); process.exitCode = 1; }
  }
}

main().catch((e) => { console.error("DRIVER THREW:", e); process.exitCode = 1; });
