/* TRUE 82 — accounts.js: the client's accounts layer (Phase D).
   ─────────────────────────────────────────────────────────────────────────────
   Everything here is FAIL-SOFT: no Clerk keys configured → the game runs
   exactly as before, and every finished run still gets a UUID in the local
   ledger so signing in LATER claims the history (§14.1). No banners, no
   nagging — localStorage here is strictly-necessary session bookkeeping.

   THE SUBMISSION LAW (why this file is small): the client never submits UI
   state. It REPLAYS its own finished game headlessly through sim-core
   (T82.replay) and submits the replay's result — wins, net, rngDraws — so the
   claim matches the server's verify BY CONSTRUCTION. Hot Hand timing, overlay
   theater, share-text massaging: none of it can desync a submission.

   CLERK SETUP (RUNBOOK §1.1): paste the two values below from
   Clerk Dashboard → API keys. Until then, everything runs anonymous. */
(function (g) {
  "use strict";

  var CONFIG = {
    CLERK_FRONTEND_API: "https://caring-grub-37.clerk.accounts.dev",
    CLERK_PUBLISHABLE_KEY: "pk_test_Y2FyaW5nLWdydWItMzcuY2xlcmsuYWNjb3VudHMuZGV2JA"
  };

  var LEDGER_KEY = "t82:runs", LEDGER_CAP = 200, SID_KEY = "t82:sid";
  // a stable device session id ([A-Za-z0-9_-]{4,64} per run.js) — lets /api/claim
  // stitch by sid even if the runId ledger is lost
  function sid() {
    try {
      var s = localStorage.getItem(SID_KEY);
      if (s && /^[A-Za-z0-9_-]{4,64}$/.test(s)) return s;
      s = uuid4().replace(/-/g, "").slice(0, 24);
      localStorage.setItem(SID_KEY, s);
      return s;
    } catch (e) { return null; }
  }
  function ledger() {
    try { return JSON.parse(localStorage.getItem(LEDGER_KEY) || "[]"); } catch (e) { return []; }
  }
  function remember(uuid) {
    try {
      var l = ledger(); l.push(uuid);
      if (l.length > LEDGER_CAP) l = l.slice(-LEDGER_CAP);
      localStorage.setItem(LEDGER_KEY, JSON.stringify(l));
    } catch (e) {}
  }

  function uuid4() {
    if (g.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16);
    });
  }

  // ---- Clerk (two-script snippet per RUNBOOK §1.1; no-op without keys) ----
  var clerkReady = null;
  function initClerk() {
    if (clerkReady) return clerkReady;
    if (!CONFIG.CLERK_FRONTEND_API || !CONFIG.CLERK_PUBLISHABLE_KEY) {
      return (clerkReady = Promise.resolve(null));
    }
    clerkReady = new Promise(function (resolve) {
      // clerk-js@6 ships its own UI — one script, no separate @clerk/ui, no
      // ui: argument to load() (the old "not loaded with Ui components" throw).
      var base = CONFIG.CLERK_FRONTEND_API.replace(/\/$/, "");
      var s = document.createElement("script");
      s.src = base + "/npm/@clerk/clerk-js@6/dist/clerk.browser.js";
      s.async = true;
      s.setAttribute("data-clerk-publishable-key", CONFIG.CLERK_PUBLISHABLE_KEY);
      s.onload = function () {
        if (!g.Clerk) return resolve(null);
        g.Clerk.load()
          .then(function () { resolve(g.Clerk); onSignedIn(); })
          .catch(function () { resolve(null); });
      };
      s.onerror = function () { resolve(null); };
      document.head.appendChild(s);
    });
    return clerkReady;
  }
  function token() {
    return initClerk().then(function (c) {
      if (!c || !c.session) return null;
      return c.session.getToken().catch(function () { return null; });
    });
  }
  function authedFetch(url, opts) {
    opts = opts || {};
    return token().then(function (tok) {
      opts.headers = opts.headers || {};
      if (tok) opts.headers.authorization = "Bearer " + tok;
      if (opts.body && !opts.headers["content-type"]) opts.headers["content-type"] = "application/json";
      return fetch(url, opts).then(function (r) { return r.json(); });
    }).catch(function () { return { ok: false, why: "network" }; });
  }

  // sign-in just happened (or page loaded signed-in): stitch the ledger (§14.1)
  var claimed = false;
  function onSignedIn() {
    if (claimed) return; claimed = true;
    var ids = ledger();
    authedFetch("/api/claim", { method: "POST", body: JSON.stringify({ runIds: ids, sid: sid() }) })
      .then(function () {});   // fire-and-forget; officials never upgrade (server law)
  }

  // ---- run submission: replay locally, submit core truth ----
  function submitRun() {
    try {
      var G = g.G;
      if (!G || !G.actions || G.mode === "kaman") return;         // kaman never submits
      if (G._submitted) return;                                   // once per game
      G._submitted = true;
      var ch = G.weekly && g.T82CH ? g.T82CH.byId[G.weekly.challengeId] : null;
      var rp = g.T82.replay({ mode: G.mode, seed: G.seed, actions: G.actions.slice() }, ch);
      if (!rp || !rp.ok || !rp.result) return;
      var id = uuid4();
      // THE DIALECT (frozen by test.js §14b against run.js's readers): flat body,
      // official is the string "daily" + top-level label, weekly is boolean true +
      // top-level challengeId. run.js derives the week server-side and re-mints the
      // daily seed itself — the client's copies are checked, never trusted.
      var body = {
        id: id, sid: sid(), mode: G.mode, seed: G.seed,
        actions: G.actions.slice(), rngDraws: rp.result.rngDraws,   // the canonical post-HH count (replay's result — there is no rp.S)
        dataVersion: g.T82.t.dataVersion,
        claim: { wins: rp.result.wins, net: rp.result.net }
      };
      if (G.official && G.official.label) { body.official = "daily"; body.label = G.official.label; }
      else if (G.league && G.league.id) { body.official = "league"; body.leagueId = G.league.id; }
      else if (G.weekly && G.weekly.challengeId) { body.weekly = true; body.challengeId = G.weekly.challengeId; }
      authedFetch("/api/run", { method: "POST", body: JSON.stringify(body) })
        .then(function (r) {
          if (r && r.ok && !r.dedup) remember(id);
          var chip = document.getElementById("runStatus");
          if (!chip || !r) return;
          if (!r.ok) { chip.textContent = ""; return; }         // fail-soft: no scary strings on the results screen
          var std = r.official || r.weekly;
          if (r.league) { chip.textContent = "Locked in \u2014 league week " + r.league.week; return; }
          if (r.dedup) chip.textContent = "Already saved";
          else if (std && std.already) chip.textContent = "Already counted today" + (std.rank ? " — #" + std.rank + " of " + std.outOf : "");
          else if (std && std.rank) chip.textContent = "Counted — #" + std.rank + " of " + std.outOf + (r.weekly ? " this week" : " today");
          else if (r.note === "sign-in-to-count") chip.textContent = "Saved — sign in to make it count";
          else chip.textContent = r.verified ? "Saved" : "Saved (unverified)";
        });
    } catch (e) { /* fail-soft: the game never notices */ }
  }

  // ---- daily / weekly fetchers (tiny, cached per page-load) ----
  var dailyCache = null, weeklyCache = null;
  function fetchDaily() {
    if (dailyCache) return Promise.resolve(dailyCache);
    return authedFetch("/api/daily").then(function (r) { return (dailyCache = r); });
  }
  function fetchWeekly() {
    if (weeklyCache) return Promise.resolve(weeklyCache);
    return authedFetch("/api/weekly").then(function (r) { return (weeklyCache = r); });
  }

  g.T82ACC = { initClerk: initClerk, token: token, submitRun: submitRun,
    fetchDaily: fetchDaily, fetchWeekly: fetchWeekly, ledger: ledger,
    signIn: function () { initClerk().then(function (c) { if (c) c.openSignIn(); }); },
    CONFIG: CONFIG };
})(typeof window !== "undefined" ? window : globalThis);
