/* TRUE 82 — cookieless analytics client.
   No cookies, no localStorage, no device storage of any kind. The only identity is an
   in-memory random session id that dies on reload / tab-close. Every visit is a fresh
   "session" by design — the price of staying out of the consent bucket.

   Analytics v2 adds one in-memory run id so starts, finishes, explicit Start over
   clicks, and real page exits can be separated without creating a durable identity.
   `run_state` is a local-only control message: app.js uses it to keep the latest
   round/team/era/Presti spend available for a page-exit beacon without an extra D1
   write on every UI interaction. */
(function () {
  "use strict";
  if (typeof window === "undefined") return;

  var ENDPOINT = "/api/event";
  var sid = uid("s");
  var startTs = Date.now();

  // Session aggregates, derived by watching events so session_end is self-contained.
  // gamesPlayed includes Kaman because "games initiated" is the one requested Kaman
  // metric. All other Kaman game events are suppressed below.
  var gamesPlayed = 0, maxRound = 0, ended = false;
  var activeRun = null;

  function uid(prefix) {
    return (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  }

  function viewportBucket() {
    var w = window.innerWidth || 0;
    return w < 600 ? "sm" : (w < 1024 ? "md" : "lg");
  }

  function copy(o) {
    var out = {}, k;
    if (!o) return out;
    for (k in o) if (Object.prototype.hasOwnProperty.call(o, k)) out[k] = o[k];
    return out;
  }

  function mergeRun(p) {
    if (!activeRun || !p) return;
    ["mode", "round", "franchise", "decade", "player_spend", "reroll_spend",
     "budget_used", "roster_value"].forEach(function (k) {
      if (p[k] !== undefined && p[k] !== null && p[k] !== "") activeRun[k] = p[k];
    });
  }

  function post(payload, beacon) {
    payload.sid = sid;
    payload.t = Date.now(); // client ts; the server stamps the authoritative ts
    try {
      if (beacon && navigator.sendBeacon) {
        var sent = navigator.sendBeacon(ENDPOINT, new Blob([JSON.stringify(payload)], { type: "application/json" }));
        if (sent) return;
      }
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  function track(name, props) {
    var p = props ? copy(props) : {};

    // Local-only state refresh. This never reaches /api/event and therefore adds
    // no analytics write cost while still making a later page-exit useful.
    if (name === "run_state") {
      mergeRun(p);
      return;
    }

    p.name = name;

    if (name === "game_start") {
      gamesPlayed += 1;
      p.run_id = uid("r");
      if (p.mode === "kaman") {
        // Kaman is intentionally represented only in initiated-game counts.
        post(p, false);
        activeRun = null;
        return;
      }
      activeRun = { run_id: p.run_id, mode: p.mode || "?" };
      mergeRun(p);
      post(p, false);
      return;
    }

    // No Kaman outcomes, funnel, replay, share, or newspaper events.
    if (p.mode === "kaman") return;

    if (activeRun) {
      p.run_id = activeRun.run_id;
      mergeRun(p);
    }
    if (name === "round_advance" && p.round > maxRound) maxRound = p.round;

    post(p, false);

    if (name === "game_complete" || name === "run_abandon") activeRun = null;
  }

  function abandonActiveRun() {
    if (!activeRun) return;
    var p = copy(activeRun);
    p.name = "run_abandon";
    p.reason = "page_exit";
    post(p, true);
    activeRun = null;
  }

  function end(realExit) {
    // visibilitychange fires for ordinary tab switches. Only pagehide is treated as
    // a true run abandonment; if visibility fired first, pagehide can still send it.
    if (realExit) abandonActiveRun();
    if (ended) return;
    ended = true;
    post({
      name: "session_end",
      duration: Date.now() - startTs,
      games_played: gamesPlayed,
      max_round: maxRound
    }, true);
  }

  // If the user comes back and keeps playing, allow one more session_end to fire on the
  // next exit with updated totals (otherwise the most engaged users are undercounted).
  // The dashboard de-dupes by taking MAX per session id.
  function reopen() { ended = false; }

  // Single guarded globals for app.js and production diagnosis.
  window.t82track = track;
  window.t82AnalyticsDebug = function () {
    return { sid: sid, gamesPlayed: gamesPlayed, maxRound: maxRound, activeRun: activeRun ? copy(activeRun) : null };
  };

  // session_start as early as the script runs
  track("session_start", { referrer: document.referrer || "", viewport: viewportBucket() });

  // pagehide is the true navigation/close signal. visibility is session-duration
  // bookkeeping only and deliberately does NOT mark the active run abandoned.
  window.addEventListener("pagehide", function () { end(true); });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") end(false);
    else reopen();
  });
  // bfcache restore (iOS back-navigation) re-shows the page without re-running the script.
  window.addEventListener("pageshow", function (e) { if (e.persisted) reopen(); });
})();
