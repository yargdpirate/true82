/* TRUE 82 — cookieless analytics client.
   No cookies, no localStorage, no device storage of any kind. The only identity is an
   in-memory random session id that dies on reload / tab-close. Every visit is a fresh
   "session" by design — the price of staying out of the consent bucket. */
(function () {
  "use strict";
  if (typeof window === "undefined") return;

  var ENDPOINT = "/api/event";
  var sid = (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : "s-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  var startTs = Date.now();

  // session aggregates, derived by watching events so session_end is self-contained
  var gamesPlayed = 0, maxRound = 0, ended = false;

  function viewportBucket() {
    var w = window.innerWidth || 0;
    return w < 600 ? "sm" : (w < 1024 ? "md" : "lg");
  }

  function post(payload, beacon) {
    payload.sid = sid;
    payload.t = Date.now(); // client ts; the server stamps the authoritative ts
    try {
      if (beacon && navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([JSON.stringify(payload)], { type: "application/json" }));
        return;
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
    var p = props ? Object.assign({}, props) : {};
    p.name = name;
    if (name === "game_start") gamesPlayed += 1;
    if (name === "round_advance" && p.round > maxRound) maxRound = p.round;
    post(p, false);
  }

  function end() {
    if (ended) return;
    ended = true;
    post({
      name: "session_end",
      duration: Date.now() - startTs,
      games_played: gamesPlayed,
      max_round: maxRound
    }, true);
  }

  // single guarded global for app.js to call
  window.t82track = track;

  // session_start as early as the script runs
  track("session_start", { referrer: document.referrer || "", viewport: viewportBucket() });

  // flush on the way out. pagehide is the reliable mobile signal; visibility is a backstop.
  // Trades a little duration accuracy (a tab-away counts as leaving) for reliable capture.
  window.addEventListener("pagehide", end);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") end();
  });
})();
