/* TRUE 82 — functions/_lib/sim.js: the engine, server-side.
   ─────────────────────────────────────────────────────────────────────────────
   v69.1. The same sim-core.js the browser runs, imported into the Worker so a
   submitted run can be REPLAYED and its claim recomputed. Nothing a client says
   about its own score is ever stored; only this file's recomputation is.

   THE COST, MEASURED (2026-10-03, this machine):
     JSON.parse(site_data.json)  ~15 ms
     T82.initData(data)          ~96 ms   <- builds the pools and indexes
     one replay, warm           ~0.04 ms
   So it is ALL cold start. A Worker isolate serves many requests, so the 111 ms
   is paid once per isolate and every verification after it is free — but the
   unlucky request that pays it needs more than Workers Free's 10 ms CPU ceiling.
   Verified boards therefore need the Workers Paid plan. Without it `engine()`
   returns null, runs store unverified, and unverified runs never reach a board:
   the boards go quiet rather than wrong.

   The handle is cached in module scope deliberately — that IS the warm path. */
import T82 from "../../sim-core.js";
/* LOAD-BEARING IMPORT, and it looks removable. daily-core.js resolves a day's
   challenge through `coreForId`, which reads the GLOBAL `T82CH` that
   challenges.js installs on load — the browser has it because challenges.js is
   in the page's script chain. Without this import the Worker's registry is
   undefined, every board "fails soft to vanilla cap" (daily-core.js:79), and the
   server derives a DIFFERENT board than the browser played: every Daily on a
   challenge day would replay wrong, fail verification and never rank. The
   symptom would look like the engine being broken, not like a missing import.
   test.js compares the server's board against the browser's for 120 days. */
import "../../challenges.js";
import T82DAILY from "../../daily-core.js";
import { mintSeed } from "./dayseed.js";

/* The Daily's board for a day, derived HERE rather than taken from the client.
   daily-core.js is the same file the browser runs and needs no DOM, so the
   server reproduces the day's mode, seed and challenge exactly. That is what
   stops the obvious cheat: playing an easy random board and submitting it as
   today's Daily. run.js checks the submitted mode and seed against this.

   v69.4: THE SEED IS MINTED, NOT DERIVED, for every day dayseed.js speaks for —
   the same function /api/day serves the browser from, so the two agree by
   construction rather than by two files staying in step.

   IT DELIBERATELY DOES NOT CALL daily-core's setSeeds(). A Worker reuses one
   isolate across requests and across PLAYERS, so installing a per-request map
   into daily-core's module scope would let one request's seeds answer the next
   one's questions. The override is applied to the returned object instead, which
   owns nothing shared. Keep it that way.

   `env` is now required. With no DAILY_SECRET and no DAILY_PINS, mintSeed
   returns null for every day and this is byte-for-byte the old behaviour. */
export async function dailyBoard(env, dayKey) {
  try {
    const b = T82DAILY.boardFor(dayKey);
    if (!b || b.key !== dayKey) return null;
    const minted = await mintSeed(env, dayKey);
    return minted === null ? b : Object.assign({}, b, { seed: minted });
  } catch { return null; }
}

let ready = null;
let ROWS = null;              // name -> Map(season -> row), built by engine()

/** One player's row for one season, or null. Needs engine() to have run. */
export function rowFor(name, season) {
  if (!ROWS) return null;
  const m = ROWS.get(String(name));
  return (m && m.get(Number(season))) || null;
}

/** The initialised engine, or null if it could not be loaded. Never throws. */
export function engine(context) {
  if (ready) return ready;
  ready = (async () => {
    try {
      const { env, request } = context;
      if (!env || !env.ASSETS) return null;
      const origin = new URL(request.url).origin;
      const res = await env.ASSETS.fetch(new URL("/site_data.json", origin));
      if (!res || !res.ok) return null;
      const data = await res.json();
      T82.initData(data);
      if (!T82.t || !T82.t.IDX) return null;

      /* THE LABEL TAXES ARE PART OF THE SCORE (v69.2). app.js loads labels.json
         in every browser (loadLabels(), app.js) and calls T82.setLabels, and the
         v61 label taxes then move the engine's net. Without this the Worker
         replayed a DIFFERENT engine from the one the player played on, so the
         client's honest claim and the server's honest recomputation disagreed
         and the run stored verified = 0 and could never reach a board.

         MEASURED on 900 bot drafts across the three modes (2026-10-04): the net
         differs on 26.7% of runs and the record on 20.2% (Classic 11%, Presti
         23%, Pro 27%). So better than a quarter of every real season would have
         been silently dropped from every board, with the symptom "the boards are
         quiet" and no error anywhere.

         Why nobody caught it: every harness, including this session's first two,
         ran its client side WITHOUT labels too, so both sides agreed for the
         wrong reason. That is the repo's own trap (handoff 0000002b, trap five),
         and it caught the next person as well. tools/boards-e2e.js and
         tools/boards-live.js now load labels on the client side exactly as a
         browser does, which is what makes this a test rather than a story.

         Fail-soft: no labels.json, or an unreadable one, leaves the engine
         scoring as it did before rather than refusing to start. That reopens the
         mismatch, so it is logged by its absence, not silently papered over:
         labelsReady() below is what /api/run can be asked about. */
      try {
        const lab = await env.ASSETS.fetch(new URL("/labels.json", origin));
        if (lab && lab.ok) T82.setLabels(await lab.json());
      } catch { /* scores as it did before; see above */ }

      /* v70.4 A NAME-AND-SEASON INDEX, for the draft room.
         Everything else here replays a (mode, seed, actions) log, where rows
         are resolved from the ticket the draft dealt. A room's roster has no
         tickets — it is a list of (player, season) a person chose — so it needs
         a direct lookup, and the engine's own POOLS are keyed by franchise and
         decade, not by name. Built once, from the same payload the engine was
         initialised with, so it cannot disagree with it. */
      try {
        const IDX = T82.t.IDX, byName = new Map();
        for (const row of (data.players || [])) {
          const nm = row[IDX.name];
          let m = byName.get(nm);
          if (!m) { m = new Map(); byName.set(nm, m); }
          /* a season can appear twice for a traded player; the engine's own
             convention is the row with the most minutes, so keep that one */
          const prev = m.get(row[IDX.season]);
          if (!prev || (row[IDX.mp] || 0) > (prev[IDX.mp] || 0)) m.set(row[IDX.season], row);
        }
        ROWS = byName;
      } catch { ROWS = null; }

      return T82;
    } catch {
      return null;
    }
  })();
  ready.then((v) => { if (!v) ready = null; }).catch(() => { ready = null; });
  return ready;
}

/* The server's own account of a run. `claim` is what the client said; it is
   compared, never trusted, and never stored. Returns:
     { ok:true,  result }                 the replay agreed
     { ok:false, why }                    it did not, or could not run
   `why: "engine"` is the only answer that means "we could not check", and it is
   the one case a run keeps its unverified row for a later read to re-check. */
export async function verify(context, payload) {
  const T = await engine(context);
  if (!T) return { ok: false, why: "engine" };
  try {
    const out = T.verifyRun(payload);
    if (!out || !out.ok) return { ok: false, why: (out && out.why) || "replay" };
    return { ok: true, result: out.result };
  } catch (e) {
    return { ok: false, why: "replay-threw" };
  }
}

/** The dataset stamp the engine is holding, for the update-day rule. */
export async function dataVersion(context) {
  const T = await engine(context);
  try { return T && T.t ? T.t.dataVersion : null; } catch { return null; }
}

/** Did the engine actually get the label taxes? The one question worth asking
    the deployment when boards go quiet: a `false` here means every run whose
    five triggers a tax will fail verification (see engine() above). */
export async function labelsReady(context) {
  const T = await engine(context);
  try { return !!(T && T.labelsReady && T.labelsReady()); } catch { return false; }
}

/* ---------- SCORING A FINISHED DRAFT ROOM (v70.4) ----------
   The Redraft's own verdict, computed here instead of in a browser. Each seat's
   five (player, season, slot) become rows and bucket slots, and the engine
   projects the season exactly as app.js `sdFinish` does.

   NO PER-GAME REALIZATION, which is the owner's 2026-08-05 ruling for this mode
   ("the luck spread was reading as verdict"): the record comes straight off the
   projected net. That is also why the seed below is a CONSTANT and not a clock
   reading — app.js passes `Date.now()`, which looks alarming and changes
   nothing, verified across four seeds. A constant makes the room's result
   reproducible, which a shared result has to be: three people are going to
   compare it.

   The engine is the SAME one /api/run verifies with, labels and all, so a room
   is scored on the terms every other board already uses. */
export async function scoreRosters(context, rosters) {
  const T = await engine(context);
  if (!T || !ROWS) return null;
  const IDX = T.t.IDX;
  const out = [];
  for (let seat = 0; seat < rosters.length; seat++) {
    const rows = [], slots = [];
    for (const p of rosters[seat]) {
      const row = rowFor(p.player, p.season);
      if (!row) return null;                       // an unresolvable roster is not a score
      rows.push(row); slots.push(p.slot);
    }
    if (!rows.length) { out.push({ seat, wins: 0, net: 0, five: [] }); continue; }
    try {
      const S = T.newState("classic", 82000 + seat, null);
      const e = T.engine(S, rows, slots);
      out.push({
        seat, wins: e.winTally, losses: 82 - e.winTally,
        net: Math.round(e.net * 100) / 100,
        five: rows.map((r, i) => ({ name: r[IDX.name], season: r[IDX.season], slot: slots[i] }))
      });
    } catch { return null; }
  }
  /* the podium: wins, then net, then seat order, the same tiebreak sdFinish uses */
  const rank = out.slice().sort((a, b) => (b.wins - a.wins) || (b.net - a.net) || (a.seat - b.seat));
  rank.forEach((t, i) => { t.place = i + 1; });
  return out;
}
