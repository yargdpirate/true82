/* TRUE 82 — league-ui.js: the League screen (Phase E client).
   Correspondence-slow by nature (weekly cadence) — no polling; every action
   refetches truth (the house pattern). Depends on globals: el/app/esc,
   DATA_READY/PENDING_FN (app.js), newGame, T82ACC, T82CH.
   Entry: T82LGUI.route(id) from ?league= deep links; T82LGUI.lobby() to found
   one. Settlement is server-side ON READ — opening the league IS the cron. */
(function (g) {
  "use strict";
  var L = { id: null, m: null };

  function authed(url, opts) {
    opts = opts || {};
    return g.T82ACC.token().then(function (tok) {
      opts.headers = opts.headers || {};
      if (tok) opts.headers.authorization = "Bearer " + tok;
      if (opts.body && !opts.headers["content-type"]) opts.headers["content-type"] = "application/json";
      return fetch(url, opts).then(function (r) { return r.json(); });
    }).catch(function () { return { ok: false, why: "network" }; });
  }
  function shell(inner) {
    app().innerHTML = '<section class="ticket league">' +
      '<div class="duel-top"><button class="startover-btn" id="lgBack" type="button">\u2039 Go 82\u20130</button></div>' + inner + "</section>";
    var b = el("lgBack");
    if (b) b.addEventListener("click", function () { history.replaceState(null, "", location.pathname); renderIntro(); });
  }
  function signIn(msg) {
    shell('<h2 class="duel-h">' + esc(msg) + '</h2><p class="duel-sub">Leagues run on GM tags.</p>' +
      '<button class="btn btn-primary btn-block" id="lgSignIn">Sign in</button>');
    el("lgSignIn").addEventListener("click", function () { g.T82ACC.signIn(); });
  }

  function route(id) {
    L.id = id;
    shell('<p class="duel-wait">Opening the league office\u2026</p>');
    g.T82ACC.initClerk().then(function () {
      authed("/api/league/" + id).then(function (m) { L.m = m; render(); });
    });
  }
  function refresh() { return authed("/api/league/" + L.id).then(function (m) { L.m = m; render(); }); }
  function act(action, body) {
    authed("/api/league/" + L.id + "/" + action, { method: "POST", body: JSON.stringify(body || {}) })
      .then(function (r) { if (!r || !r.ok) alert("Nope: " + ((r && r.why) || "network")); return refresh(); });
  }

  function lobby() {
    shell('<h2 class="duel-h">\uD83C\uDFC6 Found a league</h2>' +
      '<p class="duel-sub">3\u201320 GMs. Round-robin head-to-head, one shared board a week, one attempt each. Best record lifts the trophy.</p>' +
      '<input class="arena-input lg-name" id="lgName" maxlength="40" placeholder="League name">' +
      '<p class="eyebrow">Format</p><div class="duel-actions" id="lgFmt">' +
      ["all", "classic", "cap", "pro"].map(function (f, i) {
        return '<button class="btn duel-act lg-fmt' + (i === 0 ? " on" : "") + '" data-f="' + f + '">' +
          (f === "all" ? "Everything" : f === "cap" ? "Presti only" : f.charAt(0).toUpperCase() + f.slice(1) + " only") + "</button>";
      }).join("") + "</div>" +
      '<p class="eyebrow">Season</p><div class="duel-actions" id="lgRnd">' +
      '<button class="btn duel-act lg-rnd on" data-r="1">Single round robin</button>' +
      '<button class="btn duel-act lg-rnd" data-r="2">Double</button></div>' +
      '<p class="eyebrow">Pace</p><div class="duel-actions" id="lgPace">' +
      '<button class="btn duel-act lg-pace on" data-p="0">Weekly \u00B7 Mondays</button>' +
      '<button class="btn duel-act lg-pace" data-p="1">Fast \u00B7 advance when everyone plays</button></div>' +
      '<button class="btn btn-primary btn-block presti-spin" id="lgCreate">Create league</button>');
    function pickIn(sel) {
      Array.prototype.forEach.call(document.querySelectorAll(sel), function (b) {
        b.addEventListener("click", function () {
          Array.prototype.forEach.call(document.querySelectorAll(sel), function (x) { x.classList.remove("on"); });
          b.classList.add("on");
        });
      });
    }
    pickIn(".lg-fmt"); pickIn(".lg-rnd"); pickIn(".lg-pace");
    el("lgCreate").addEventListener("click", function () {
      var fmt = (document.querySelector(".lg-fmt.on") || {}).getAttribute ? document.querySelector(".lg-fmt.on").getAttribute("data-f") : "all";
      var rnd = parseInt((document.querySelector(".lg-rnd.on") || { getAttribute: function () { return "1"; } }).getAttribute("data-r"), 10);
      var pace = (document.querySelector(".lg-pace.on") || { getAttribute: function () { return "0"; } }).getAttribute("data-p") === "1";
      authed("/api/league", { method: "POST", body: JSON.stringify({ name: el("lgName").value, format: fmt, rounds: rnd, fastAdvance: pace }) })
        .then(function (r) {
          if (!r || !r.ok) return r && r.why === "auth" ? signIn("Sign in to found a league") : alert("Couldn't create: " + ((r && r.why) || "network"));
          history.pushState(null, "", "?league=" + r.id);
          route(r.id);
        });
    });
  }

  function standingsHtml(m) {
    if (!m.standings || !m.standings.length) return "";
    return '<div class="section"><p class="eyebrow">Standings</p>' + m.standings.map(function (s) {
      var me = m.youAre === s.seat;
      return '<div class="arena-lbrow' + (me ? " lg-me" : "") + '"><span class="arena-rank">' + s.rank + "</span>" +
        '<span class="arena-who">GM ' + esc(s.tag || "????") + (s.name ? " \u00B7 " + esc(s.name) : "") + "</span>" +
        '<span class="arena-val">' + s.w + "-" + s.d + "-" + s.l + " \u00B7 " + s.pf + "</span></div>";
    }).join("") + "</div>";
  }

  function render() {
    var m = L.m;
    if (!m || !m.ok) {
      if (m && m.why === "auth") return signIn("Sign in to open this league");
      if (m && m.why === "no-league") return shell('<h2 class="duel-h">No such league</h2>');
      if (m && m.why === "not-a-member") return shell('<h2 class="duel-h">Members only</h2><p class="duel-sub">This season already started without you. Brutal.</p>');
      return shell('<h2 class="duel-h">League office unreachable</h2>');
    }
    var head = '<div class="duel-head"><span class="eyebrow">LEAGUE \u00B7 ' + esc(m.format === "all" ? "ALL FORMATS" : m.format.toUpperCase()) +
      (m.rounds === 2 ? " \u00B7 2RR" : "") + '</span></div><h2 class="duel-h">' + esc(m.name) + "</h2>";

    if (m.status === "forming") {
      var isMember = m.youAre !== null;
      var body = '<p class="duel-sub">' + m.members.length + " GM" + (m.members.length === 1 ? "" : "s") + " in. " +
        (m.members.length < m.minPlayers ? "Need " + m.minPlayers + "+ to tip off." : "Ready when the commissioner is.") + "</p>" +
        '<div class="section"><p class="eyebrow">The room</p>' + m.members.map(function (x) {
          return '<div class="arena-lbrow"><span class="arena-who">GM ' + esc(x.tag || "????") + (x.name ? " \u00B7 " + esc(x.name) : "") + "</span></div>";
        }).join("") + "</div>" +
        '<p class="duel-sub">Week 1 preview: <b>' + esc(m.previewChallenge.name) + "</b> \u2014 " + esc(m.previewChallenge.blurb) + "</p>" +
        '<p class="duel-link">' + esc(m.link) + '</p><button class="btn btn-block more-modes" id="lgCopy">Copy invite link</button>' +
        (!isMember ? '<button class="btn btn-primary btn-block presti-spin" id="lgJoin">Join this league</button>' : "") +
        (m.commissioner ? '<button class="btn btn-primary btn-block presti-spin" id="lgStart"' +
          (m.members.length < m.minPlayers ? " disabled" : "") + ">Start the season \u00B7 opens Monday</button>" : "");
      shell(head + body);
      var cp = el("lgCopy");
      if (cp) cp.addEventListener("click", function () {
        if (navigator.clipboard) navigator.clipboard.writeText(m.link).catch(function () { prompt("Copy:", m.link); });
        else prompt("Copy:", m.link);
      });
      var jn = el("lgJoin"); if (jn) jn.addEventListener("click", function () { act("join"); });
      var st = el("lgStart"); if (st) st.addEventListener("click", function () { act("start"); });
      return;
    }

    if (m.status === "complete") {
      var ch = m.champion;
      shell(head + '<div class="duel-banner done">\uD83C\uDFC6 ' +
        (ch ? "GM " + esc(ch.tag || "????") + " \u2014 LEAGUE CHAMPION" : "SEASON COMPLETE") +
        (ch && m.youAre === ch.seat ? '<span class="duel-line">That\u2019s you. Hang the banner.</span>' : "") +
        "</div>" + standingsHtml(m));
      return;
    }

    // active
    var top;
    if (m.week === 0) {
      var days = Math.max(1, Math.ceil((m.startsInS || 0) / 86400));
      top = '<div class="duel-banner them">Season opens in ' + days + (days === 1 ? " day" : " days") + "</div>" +
        '<p class="duel-sub">Week 1: <b>' + esc(m.previewChallenge.name) + "</b> \u2014 " + esc(m.previewChallenge.blurb) + "</p>";
    } else {
      var mu = m.matchup || {};
      var mine = mu.yourRun, theirs = mu.oppRun;
      var days2 = Math.max(1, Math.ceil((m.endsInS || 0) / 86400));
      top = '<div class="duel-banner ' + (mine ? "them" : "you") + '">WEEK ' + m.week + " of " + m.seasonWeeks +
        '<span class="duel-line">' + esc(m.challenge.name) + " \u00B7 " + days2 + (days2 === 1 ? " day" : " days") + " left</span></div>" +
        '<p class="duel-sub">' + esc(m.challenge.blurb) + "</p>" +
        (mu.bye ? '<p class="duel-sub"><b>Bye week.</b> Rest the legs, scout the room.</p>'
          : '<div class="lg-matchup">You vs <b>GM ' + esc(mu.oppTag || "????") + "</b>" +
            (mine ? " \u00B7 you: " + mine.wins + "W" : "") + (theirs ? " \u00B7 them: " + theirs.wins + "W" : theirs === null && mine ? " \u00B7 them: waiting" : "") + "</div>") +
        (!mu.bye && !mine
          ? '<button class="btn btn-primary btn-block presti-spin" id="lgPlay">\uD83C\uDFC0 Play your matchup \u00B7 one attempt</button>'
          : !mu.bye ? '<p class="duel-fine">Locked in. ' + (m.fastAdvance ? "Week advances the moment everyone\u2019s in." : "Board closes when the week does.") + "</p>" : "");
    }
    shell(head + top + standingsHtml(m));
    var pl = el("lgPlay");
    if (pl) pl.addEventListener("click", function () {
      var launch = function () {
        newGame(m.challenge.base, m.seed, g.T82CH.byId[m.challenge.id]);
        if (g.G) g.G.league = { id: m.id, week: m.week };
      };
      if (typeof DATA_READY !== "undefined" && DATA_READY) launch();
      else { PENDING_FN = launch; pl.disabled = true; pl.textContent = "Loading players\u2026"; }
    });
  }

  g.T82LGUI = { route: route, lobby: lobby };
})(typeof window !== "undefined" ? window : globalThis);
