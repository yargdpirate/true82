/* TRUE 82 — accounts.js: the account lane's client (v69).
   ─────────────────────────────────────────────────────────────────────────────
   WHAT THIS IS. Sign in, have a name, keep your Dailies. That is the whole
   feature. No boards, no runs, no duels, no leagues, no Arena — those live on
   origin/accounts-test and are the owner's item 17, still later.

   THE FAIL-SOFT LAW (ACCOUNTS.md §0, law 1 — anonymous-first, forever). No
   keys configured, lane off, Clerk down, Clerk's monthly cap reached, D1 sulking,
   localStorage unavailable: the game plays EXACTLY as it does today and this
   file requests nothing. Auth can only ever add capability. Nothing below may
   throw into app.js.

   THE LANE SWITCH. The button renders only where laneOn() says so: any
   localhost (so `wrangler pages dev` just works), any URL carrying ?acct=1 (the
   owner's own switch — lets him try it on the real site from his phone without
   launching it for everyone), or ACCT_LIVE = true. THE LIVE FLIP IS THAT ONE
   BOOLEAN. Until it flips, true82.net loads this file, renders nothing, and
   never requests a byte from Clerk. This is deliberately NOT done through
   index.html's #t82-live-hide block: a CSS hide would still download Clerk, and
   it can't tell localhost from production.

   THE EMAIL IS NEVER OURS. The sheet shows which address you signed in with by
   reading the live Clerk session in this browser. It is never sent to /api/*,
   and D1 has no column for it — Clerk stays the identity of record.

   THE STUBS AT THE BOTTOM ARE LOAD-BEARING. app.js:3748 and app.js:3766 call
   T82ACC.fetchDaily() and T82ACC.fetchWeekly() with NO try/catch around them:

       if (window.T82ACC) T82ACC.fetchDaily().then(function (d) { ... });

   Defining T82ACC without those two methods throws a TypeError in the middle of
   renderIntro() and THE HOME SCREEN NEVER RENDERS. They resolve to null, which
   both call sites already handle on their first line. Do not remove them until
   /api/daily and /api/weekly actually ship on this lane.

   CLERK SETUP. Paste the two values from Clerk Dashboard -> API keys into
   CONFIG. The publishable key is client-safe by design. The two-script CDN load
   below is the form the live docs document as of 2026-10-03 (@clerk/ui@1 then
   @clerk/clerk-js@6) — the UI bundle is separate, and omitting it is what makes
   openSignIn() throw "not loaded with Ui components". The major is PINNED: an
   unpinned @latest lets a breaking Clerk release reach the site unannounced. */
(function (g) {
  "use strict";

  var ACCT_LIVE = false;                      // <- THE LIVE FLIP (see the header)

  var CONFIG = {
    // The owner's Clerk DEVELOPMENT instance (2026-10-03). Both values are
    // client-safe by design and ship to every browser inside this file; the
    // secret key is never used anywhere in this repo, because verification is
    // offline against the public key in CLERK_JWT_KEY. Swap these two for the
    // production instance's pair at the live flip.
    CLERK_FRONTEND_API: "https://ruling-sturgeon-1691.clerk.accounts.dev",
    CLERK_PUBLISHABLE_KEY: "pk_test_cnVsaW5nLXN0dXJnZW9uLTE2OTEuY2xlcmsuYWNjb3VudHMuZGV2JA"
  };
  var CLERK_UI_MAJOR = "1", CLERK_JS_MAJOR = "6";

  var SID_KEY = "t82:sid";                    // this lane's own device namespace
  var DAILY_KEY = "t82_daily1";               // daily-core.js's local record

  /* ---------- tiny helpers (nothing here may throw) ---------- */
  function ls(k) { try { return g.localStorage ? g.localStorage.getItem(k) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { if (g.localStorage) g.localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function uuid4() {
    try { if (g.crypto && g.crypto.randomUUID) return g.crypto.randomUUID(); } catch (e) {}
    return "xxxxxxxxxxxx4xxxyxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16);
    });
  }

  /* A stable device id for this browser. NOT the retention cookie (t82_rid) and
     NOT the traits voter hash — see functions/api/claim.js for why those two are
     deliberately out of reach. */
  function sid() {
    var s = ls(SID_KEY);
    if (s && /^[A-Za-z0-9_-]{4,64}$/.test(s)) return s;
    s = uuid4().replace(/-/g, "").slice(0, 24);
    lsSet(SID_KEY, s);
    return s;
  }

  /* The local Daily record, read straight from localStorage rather than through
     T82DAILY.getState() — getState() follows a ?day= test day to its own test
     key, and a test board must never be claimed as real history. */
  function localDaily() {
    try {
      var raw = ls(DAILY_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || typeof o !== "object") return null;
      return { official: o.official || {}, streak: o.streak || { count: 0, lastKey: "" } };
    } catch (e) { return null; }
  }

  function laneOn() {
    try {
      var h = String(g.location.hostname || "");
      if (h === "localhost" || h === "127.0.0.1" || h === "[::1]" || /\.localhost$/.test(h)) return true;
      if (/[?&]acct=1(&|$)/.test(String(g.location.search || ""))) return true;
    } catch (e) {}
    return ACCT_LIVE;
  }
  function configured() { return !!(CONFIG.CLERK_FRONTEND_API && CONFIG.CLERK_PUBLISHABLE_KEY); }

  /* ---------- Clerk (two scripts, majors pinned; no-op without keys) ---------- */
  var clerkReady = null;
  function loadScript(src, attrs) {
    return new Promise(function (resolve) {
      var s = document.createElement("script");
      s.src = src; s.defer = true; s.crossOrigin = "anonymous";
      if (attrs) for (var k in attrs) s.setAttribute(k, attrs[k]);
      s.onload = function () { resolve(true); };
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);
    });
  }
  function initClerk() {
    if (clerkReady) return clerkReady;
    if (!configured() || !laneOn()) return (clerkReady = Promise.resolve(null));
    var base = CONFIG.CLERK_FRONTEND_API.replace(/\/$/, "");
    clerkReady = loadScript(base + "/npm/@clerk/ui@" + CLERK_UI_MAJOR + "/dist/ui.browser.js")
      .then(function () {
        return loadScript(base + "/npm/@clerk/clerk-js@" + CLERK_JS_MAJOR + "/dist/clerk.browser.js",
          { "data-clerk-publishable-key": CONFIG.CLERK_PUBLISHABLE_KEY });
      })
      .then(function (ok) {
        if (!ok || !g.Clerk || !g.Clerk.load) return null;
        return g.Clerk.load({ ui: { ClerkUI: g.__internal_ClerkUICtor } })
          .then(function () { return g.Clerk; })
          .catch(function () { return null; });
      })
      .then(function (c) {
        if (c) {
          try { c.addListener(function () { onAuthChanged(); }); } catch (e) {}
          onAuthChanged();
        }
        return c;
      })
      .catch(function () { return null; });
    return clerkReady;
  }

  function token() {
    return initClerk().then(function (c) {
      if (!c || !c.session) return null;
      return c.session.getToken().catch(function () { return null; });
    }).catch(function () { return null; });
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

  var meCache = null;
  function me(force) {
    if (meCache && !force) return Promise.resolve(meCache);
    return authedFetch("/api/me").then(function (r) { return (meCache = r); });
  }

  /* ---------- the claim: hand the device's Dailies to the account ---------- */
  var claimed = false;
  function claim() {
    if (claimed) return Promise.resolve(null);
    claimed = true;
    return authedFetch("/api/claim", {
      method: "POST",
      body: JSON.stringify({ sid: sid(), daily: localDaily() })
    }).catch(function () { return null; });
  }

  function onAuthChanged() {
    var signedIn = false;
    try { signedIn = !!(g.Clerk && (g.Clerk.isSignedIn || g.Clerk.user)); } catch (e) {}
    if (!signedIn) { meCache = null; claimed = false; renderButton(null); return; }
    claim().then(function () { return me(true); }).then(renderButton).catch(function () {});
  }

  function signIn() {
    return initClerk().then(function (c) {
      if (!c) return false;
      // Clerk THROWS from openSignIn() when a session already exists. That is
      // not a failure and must never be shown as one: it means the player IS
      // signed in and something downstream lost track. Re-read /api/me instead.
      if (clerkSession()) return refresh().then(function () { return true; });
      try { c.openSignIn(); return true; } catch (e) { return false; }
    });
  }
  function signOut() {
    return initClerk().then(function (c) {
      if (!c || !c.signOut) return false;
      meCache = null; claimed = false;
      return c.signOut().then(function () { renderButton(null); return true; }).catch(function () { return false; });
    });
  }
  function setName(name) {
    return authedFetch("/api/name", { method: "POST", body: JSON.stringify({ name: name }) })
      .then(function (r) { if (r && r.ok) { meCache = null; } return r; });
  }

  /* ---------- submitting a finished run, and reading the boards ----------
     THE SUBMISSION LAW: this never sends a score. It sends {mode, seed,
     actions} and a `claim` derived from REPLAYING the run through sim-core —
     the same engine the server will use — so the claim matches the server's
     verification by construction. Hot Hand theatre, overlay timing and share
     massaging cannot desync it, because none of them touch the action log.

     Anonymous runs are submitted too: they store with the device sid and no
     user, so signing in later adopts them. They can never rank. */
  var SUBMITTED = {}, LAST_SUBMIT = null;

  function submitRun(run) {
    try {
      if (!run || !run.mode || run.mode === "kaman") return;
      if (!laneOn() || !configured()) return;        // dormant lane: nothing leaves the browser
      if (!g.T82 || !g.T82.replay) return;
      var once = run.mode + "|" + run.seed + "|" + (run.actions || []).length;
      if (SUBMITTED[once]) return;                   // one submission per finished game
      SUBMITTED[once] = 1;

      // the challenge the run was played under, re-derived the way app.js did:
      // the Daily's own board first, the weekly registry as a fallback.
      var ch = null;
      try {
        if (run.dayKey && g.T82DAILY && g.T82DAILY.boardFor) {
          var b = g.T82DAILY.boardFor(run.dayKey);
          if (b && b.key === run.dayKey) ch = b.ch || null;
        }
        if (!ch && run.chId && g.T82CH && g.T82CH.byId) ch = g.T82CH.byId[run.chId] || null;
      } catch (e) {}

      var rp = g.T82.replay({ mode: run.mode, seed: run.seed, actions: (run.actions || []).slice() }, ch);
      if (!rp || !rp.ok || !rp.result) return;       // a run we cannot replay, we do not post
      var r = rp.result;

      return authedFetch("/api/run", {
        method: "POST",
        body: JSON.stringify({
          id: uuid4(), sid: sid(),
          mode: run.mode, seed: run.seed, actions: (run.actions || []).slice(),
          rngDraws: r.rngDraws, coreVersion: r.coreVersion, dataVersion: r.dataVersion,
          official: run.official || undefined,
          claim: { wins: r.wins, net: r.net }
        })
      }).then(function (res) { LAST_SUBMIT = res; return res; });
    } catch (e) { /* fail-soft: the game never notices */ }
  }

  function board(name, opts) {
    opts = opts || {};
    var q = "?board=" + encodeURIComponent(name || "daily");
    if (opts.mode) q += "&mode=" + encodeURIComponent(opts.mode);
    if (opts.day) q += "&day=" + encodeURIComponent(opts.day);
    return authedFetch("/api/lb" + q);
  }

  /* ---------- THE BOARDS (v69.1) ----------
     Five, the owner's list. Plain on purpose: the art bots restyle later, so
     this invests in the thing they cannot add afterwards — being correct, being
     fast to read on a phone, and telling you where YOU are. */
  var BOARDS = [
    { key: "daily",    tab: "Today",    fmt: function (r) { return r.score + "-" + (82 - r.score) + (r.net != null ? " \u00B7 " + signed(r.net) : ""); } },
    { key: "streak",   tab: "Streak",   fmt: function (r) { return r.score + (r.score === 1 ? " day" : " days"); } },
    { key: "rate",     tab: "82-0 %",   modes: true,
      fmt: function (r) { return (r.score * 100).toFixed(1) + "% \u00B7 " + r.immortals + " of " + r.runs; } },
    // v69.5 the owner's two picks from the lab's SPEC
    { key: "club",     tab: "82-0 club", modes: "all",
      fmt: function (r) { return r.score + (r.score === 1 ? " perfect" : " perfects"); } },
    // terse on purpose: at 375px the full "66.3 avg - 4 days - best 81" pushed
    // the GM's name to "LiveTe...", and a board you cannot read a name on is
    // not a board. `best` is still in the row for whoever wants it later.
    { key: "month",    tab: "This month", modes: "all",
      fmt: function (r) { return r.score.toFixed(1) + " avg \u00B7 " + r.days + "d"; } },
    // v69.6 personal: the row's name IS the day and its rank IS the placement,
    // so the ordinary renderer reads "3  2026-10-09  74-8 of 51"
    { key: "mydays",   tab: "Your days",
      fmt: function (r) { return r.score + "-" + (82 - r.score) + " of " + r.field; } },
    { key: "cheapest", tab: "Cheapest", fmt: function (r) { return "$" + r.score + "M"; } },
    { key: "net",      tab: "Best net", modes: true, fmt: function (r) { return signed(r.score); } }
  ];
  var BOARD_MODES = [["classic", "Classic"], ["cap", "Presti"], ["pro", "Pro"]];
  var BOARD_MODES_ALL = [["all", "All"]].concat(BOARD_MODES);
  /* v69.6 EACH BOARD REMEMBERS ITS OWN SCOPE. One shared `mode` could not work
     once some boards read across every mode and others cannot: the club wants
     to open on All (its whole argument is that there is no denominator), the
     82-0 % board has no All to open on (a rate across modes is three different
     denominators added together), and switching tabs should not silently
     change what you are looking at. */
  var boardState = { key: "daily", modeFor: { rate: "classic", net: "classic", club: "all", month: "all" } };
  function modeOf(def) { return boardState.modeFor[def.key] || "classic"; }
  function modesFor(def) { return def.modes === "all" ? BOARD_MODES_ALL : BOARD_MODES; }

  function signed(n) {
    var v = Math.round((n || 0) * 10) / 10;
    return (v > 0 ? "+" : "") + v.toFixed(1);
  }

  function boardsHtml(def, data) {
    var head = '<div class="rs-head"><h2 class="rs-title">Boards</h2>' +
      '<button class="rs-close" id="acctClose" type="button" aria-label="Close">\u00D7</button></div>';
    var tabs = '<div class="lb-tabs" role="tablist">' + BOARDS.map(function (b) {
      return '<button class="lb-tab tm-flat' + (b.key === boardState.key ? ' on' : '') + '" data-board="' + b.key +
        '" type="button" role="tab" aria-selected="' + (b.key === boardState.key) + '">' + esc(b.tab) + '</button>';
    }).join("") + '</div>';
    var cur = modeOf(def);
    var modes = def.modes ? '<div class="lb-tabs lb-modes">' + modesFor(def).map(function (m) {
      return '<button class="lb-tab tm-flat' + (m[0] === cur ? ' on' : '') + '" data-mode="' + m[0] +
        '" type="button">' + esc(m[1]) + '</button>';
    }).join("") + '</div>' : "";

    var body;
    if (!data) body = '<p class="acct-p" id="lbLoading">Reading the board\u2026</p>';
    else if (!data.ok) body = '<p class="acct-p">The board didn\u2019t load. Your play is unaffected.</p>';
    else if (!data.rows || !data.rows.length) {
      body = data.why === "sign-in"
        ? '<p class="acct-p">Sign in and your Dailies will show up here.</p>'          // v69.6 personal board
        : '<p class="acct-p">Nobody has made this board yet.</p>' + whyEmpty(def, data);
    } else {
      body = '<ol class="lb-list">' + data.rows.map(function (r) {
        var mine = data.you && data.you.rank === r.rank;
        return '<li class="lb-row' + (mine ? ' lb-you' : '') + '">' +
          '<span class="lb-rank">' + r.rank + '</span>' +
          '<span class="lb-name">' + esc(r.name) + '</span>' +
          '<span class="lb-score">' + def.fmt(r) + '</span></li>';
      }).join("") + '</ol>';
      if (data.you && !data.you.rank) body += '<p class="acct-fine">You\u2019re not on this board yet.</p>';
    }
    var note = data && data.note ? '<p class="acct-fine">' + esc(data.note) + '</p>' : "";
    return head + '<div class="rs-scroll">' + tabs + modes + '<div id="lbBody">' + body + '</div>' + note + '</div>';
  }

  function whyEmpty(def, data) {
    if (def.key === "rate" && data.minRuns) {
      return '<p class="acct-fine">Needs ' + data.minRuns + ' finished seasons in this mode to qualify.</p>';
    }
    return '<p class="acct-fine">Verified seasons only \u2014 sign in before you play and yours will count.</p>';
  }

  function openBoards() {
    var existing = document.getElementById("acctOverlay");
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    PREV_FOCUS = PREV_FOCUS || document.activeElement;
    var ov = document.createElement("div");
    ov.className = "rules-overlay";
    ov.id = "acctOverlay";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-modal", "true");
    ov.setAttribute("aria-label", "Boards");
    var def = defFor(boardState.key);
    ov.innerHTML = '<div class="rules-sheet acct-sheet plq-frame">' + boardsHtml(def, null) + '</div>';
    document.body.appendChild(ov);
    document.body.classList.add("rules-open");
    ov.addEventListener("click", function (ev) { if (ev.target === ov) closeSheet(); });
    document.addEventListener("keydown", escListener);
    wireBoards();
    loadBoard();
  }
  function defFor(k) { for (var i = 0; i < BOARDS.length; i++) if (BOARDS[i].key === k) return BOARDS[i]; return BOARDS[0]; }

  /* THE DAY IS THE PLAYER'S, NOT THE SERVER'S (v69.2). /api/lb's daily board
     defaults to the UTC date, but a run's `official` key is whatever
     T82DAILY.dayKey() said in THIS browser, which is device-local midnight (the
     Wordle convention, daily-core.js). Those disagree for the whole American
     evening: from 5pm Pacific and 8pm Eastern until local midnight, UTC is
     already tomorrow, so the board asked for a day nobody had played and came
     back EMPTY for every US player at exactly the hours they play. Measured on
     2026-10-04: 7 hours a day in Los Angeles, 4 in New York, which covers the
     10/20-10/22 influencer window. So the client names the day it played and the
     server's utcDay() stays only as the no-JS fallback. */
  function todayKey() {
    try { if (g.T82DAILY && g.T82DAILY.dayKey) return g.T82DAILY.dayKey(); } catch (e) {}
    return null;
  }

  function loadBoard() {
    var def = defFor(boardState.key);
    var opts = def.modes ? { mode: modeOf(def) } : {};
    if (def.key === "daily") opts.day = todayKey();
    return board(def.key, opts).then(function (data) {
      var sheet = document.querySelector("#acctOverlay .rules-sheet");
      if (!sheet) return;
      sheet.innerHTML = boardsHtml(def, data);
      wireBoards();
    });
  }

  function wireBoards() {
    var close = document.getElementById("acctClose");
    if (close) close.addEventListener("click", closeSheet);
    var ov = document.getElementById("acctOverlay");
    if (!ov) return;
    ov.querySelectorAll("[data-board]").forEach(function (b) {
      b.addEventListener("click", function () { boardState.key = b.getAttribute("data-board"); loadBoard(); });
    });
    ov.querySelectorAll("[data-mode]").forEach(function (b) {
      b.addEventListener("click", function () {
        boardState.modeFor[boardState.key] = b.getAttribute("data-mode");   // per board, v69.6
        loadBoard();
      });
    });
  }

  /* ---------- the header button (the 44px slot v65 reserved) ---------- */
  function slot() { try { return document.querySelector(".hm-acct"); } catch (e) { return null; } }

  /* The account face, the owner's call (v69): one quiet white standard glyph in
     the top right of the start screen, outlined when signed out and filled when
     signed in. No tag, no gold, no avatar image — the button's whole job is to
     say "you are logged in" at a glance; the sheet says who. */
  function faceSvg(filled) {
    return '<svg viewBox="0 0 24 24" width="22" height="22" ' +
      (filled ? 'fill="currentColor" stroke="none"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"') +
      ' aria-hidden="true" focusable="false">' +
      '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  }

  function renderButton(info) {
    var host = slot();
    if (!host) return;
    var user = info && info.ok && !info.anonymous ? info.user : null;
    host.removeAttribute("aria-hidden");
    host.innerHTML = '<button class="acct-btn tm-flat' + (user ? ' acct-btn-in' : '') + '" id="acctBtn" type="button" ' +
      'aria-haspopup="dialog" aria-label="' + (user ? 'Your account, signed in' : 'Sign in') + '">' + faceSvg(!!user) + '</button>';
    var btn = document.getElementById("acctBtn");
    if (btn) btn.addEventListener("click", function () { openSheet(info); });
  }

  /* The email comes from CLERK, in this browser, and goes nowhere else: it is
     never posted to the game's API and there is no column for it in D1 (see
     SECURITY.md). The owner wanted the sheet to confirm which address you
     signed in with; reading it from the live Clerk session does that without
     the game ever holding it. */
  /* Clerk's own view: is there a live session in this browser? A SEPARATE
     question from "did the server accept it", and the two really can disagree —
     a missing or malformed CLERK_JWT_KEY makes the server answer anonymous while
     Clerk is perfectly happy. That state used to look like a broken button. */
  function clerkSession() {
    try { return !!(g.Clerk && (g.Clerk.isSignedIn || g.Clerk.user)); } catch (e) { return false; }
  }

  function clerkEmail() {
    try {
      var u = g.Clerk && g.Clerk.user;
      if (!u) return null;
      return (u.primaryEmailAddress && u.primaryEmailAddress.emailAddress) ||
        (u.emailAddresses && u.emailAddresses[0] && u.emailAddresses[0].emailAddress) || null;
    } catch (e) { return null; }
  }

  /* The sheet reuses the shared overlay component (.rules-overlay / .rules-sheet
     plq-frame / .rs-head / .rs-close / .rs-scroll) rather than forking it —
     the style law's point. Only .acct-* is new. */
  var PREV_FOCUS = null;
  function closeSheet() {
    var ov = document.getElementById("acctOverlay");
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    document.body.classList.remove("rules-open");
    document.removeEventListener("keydown", escListener);
    if (PREV_FOCUS && PREV_FOCUS.focus) { try { PREV_FOCUS.focus(); } catch (e) {} }
    PREV_FOCUS = null;
  }
  function escListener(ev) { if (ev.key === "Escape" || ev.keyCode === 27) closeSheet(); }

  function sheetHtml(info) {
    var user = info && info.ok && !info.anonymous ? info.user : null;
    var claimedInfo = info && info.claimed;
    var limbo = !user && clerkSession();
    var head = '<div class="rs-head"><h2 class="rs-title">' + (user ? "Your account" : limbo ? "Almost there" : "Sign in") +
      '</h2><button class="rs-close" id="acctClose" type="button" aria-label="Close">×</button></div>';
    if (limbo) {
      // Signed in at Clerk, not confirmed by the game. Offering "Sign in" here
      // would be a lie: openSignIn() cannot even open while a session is live.
      // This is what a missing or malformed CLERK_JWT_KEY looks like to a player.
      var em = clerkEmail();
      return head + '<div class="rs-scroll">' +
        '<p class="acct-p">You\u2019re signed in' + (em ? ' as <span class="acct-email">' + esc(em) + '</span>' : '') +
        ', but the game couldn\u2019t confirm it just now. Your play is unaffected \u2014 nothing is lost.</p>' +
        '<button class="t-btn" data-size="sm" id="acctRetry" type="button">Try again</button>' +
        '<button class="t-btn" data-kind="quiet" data-size="sm" id="acctOut" type="button">Sign out</button>' +
        '<p class="acct-fine">If this keeps happening it is the site\u2019s problem, not yours.</p>' +
        '</div>';
    }
    if (!user) {
      return head + '<div class="rs-scroll">' +
        '<p class="acct-p">Playing signed out works exactly the same. An account keeps your ' +
        'Daily record and your streak when you switch phones or clear your browser — right now they live ' +
        'only in this browser.</p>' +
        '<button class="t-btn" data-size="sm" id="acctSignIn" type="button">Sign in</button>' +
        '<button class="t-btn" data-kind="quiet" data-size="sm" id="acctBoards" type="button">See the boards</button>' +
        '<p class="acct-fine">You need to be 13 or older to make an account. We store your name and a tag; ' +
        'your email stays with our sign-in provider and never reaches the game’s database.</p>' +
        '</div>';
    }
    var email = clerkEmail();
    return head + '<div class="rs-scroll">' +
      '<p class="acct-p">You\u2019re signed in.</p>' +
      '<label class="acct-label">Signed in with</label>' +
      (email ? '<p class="acct-email">' + esc(email) + '</p>'
             : '<p class="acct-email">' + esc(user.tag) + '</p>') +
      (claimedInfo && claimedInfo.days
        ? '<p class="acct-p">Keeping <strong>' + claimedInfo.days + '</strong> ' +
          (claimedInfo.days === 1 ? "day" : "days") + ' of your Dailies' +
          (claimedInfo.streak ? ' and a ' + claimedInfo.streak + '-day streak' : '') + '.</p>'
        : '') +
      '<label class="acct-label" for="acctName">Display name</label>' +
      '<input class="acct-input" id="acctName" type="text" maxlength="20" autocomplete="off" ' +
        'spellcheck="false" value="' + esc(user.name || "") + '">' +
      '<p class="acct-fine" id="acctNameMsg">3 to 20 characters. Letters, numbers, spaces and . _ - ’</p>' +
      '<button class="t-btn" data-size="sm" id="acctBoards" type="button">See the boards</button>' +
      '<button class="t-btn" data-kind="quiet" data-size="sm" id="acctSave" type="button">Save name</button>' +
      '<button class="t-btn" data-kind="quiet" data-size="sm" id="acctOut" type="button">Sign out</button>' +
      '<p class="acct-fine">13 or older. Your email stays with our sign-in provider and never reaches the ' +
      'game’s database.</p>' +
      '</div>';
  }

  function openSheet(info) {
    if (document.getElementById("acctOverlay")) return;
    PREV_FOCUS = document.activeElement;
    var ov = document.createElement("div");
    ov.className = "rules-overlay";
    ov.id = "acctOverlay";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-modal", "true");
    ov.setAttribute("aria-label", "Account");
    ov.innerHTML = '<div class="rules-sheet acct-sheet plq-frame">' + sheetHtml(info) + '</div>';
    document.body.appendChild(ov);
    document.body.classList.add("rules-open");
    ov.addEventListener("click", function (ev) { if (ev.target === ov) closeSheet(); });
    document.addEventListener("keydown", escListener);
    wire();
    try { document.getElementById("acctClose").focus(); } catch (e) {}
  }

  function wire() {
    var close = document.getElementById("acctClose");
    if (close) close.addEventListener("click", closeSheet);
    var go = document.getElementById("acctSignIn");
    if (go) go.addEventListener("click", function () {
      go.disabled = true;
      signIn().then(function (ok) { if (ok) closeSheet(); else { go.disabled = false; go.textContent = "Sign-in unavailable"; } });
    });
    var retry = document.getElementById("acctRetry");
    if (retry) retry.addEventListener("click", function () {
      retry.disabled = true; retry.textContent = "Checking\u2026";
      refresh().then(function (info) {
        closeSheet();
        if (info && info.ok && !info.anonymous) openSheet(info);
      });
    });
    var boards = document.getElementById("acctBoards");
    if (boards) boards.addEventListener("click", openBoards);
    var out = document.getElementById("acctOut");
    if (out) out.addEventListener("click", function () { out.disabled = true; signOut().then(closeSheet); });
    var save = document.getElementById("acctSave"), input = document.getElementById("acctName");
    if (save && input) save.addEventListener("click", function () {
      save.disabled = true;
      setName(input.value).then(function (r) {
        var msg = document.getElementById("acctNameMsg");
        if (r && r.ok) {
          input.value = r.name;
          if (msg) msg.textContent = r.filtered ? "That one didn’t pass — saved as " + r.name + "." : "Saved.";
          refresh();
        } else if (msg) { msg.textContent = "Couldn’t save that. Try again."; }
        save.disabled = false;
      });
    });
  }

  /* ---------- the test door (v69.5) ----------
     A plain centred link above everything, so the boards can be opened without
     going through the account face first. The owner asked for it to exercise
     the accounts and the score recording; it is a TESTING affordance and says
     so, and the styling is deliberately nothing.

     It is behind laneOn(), like every other part of this file, so it cannot
     appear on true82.net while ACCT_LIVE is false — on a preview that means
     `?acct=1`. When the real entry point is designed this is the first thing to
     delete; nothing else references it. */
  function testDoor() {
    try {
      if (document.getElementById("lbTestDoor")) return;
      var bar = document.createElement("div");
      bar.id = "lbTestDoor";
      bar.setAttribute("style", "text-align:center;padding:8px 12px;font-size:14px");
      var a = document.createElement("a");
      a.href = "#";
      a.id = "lbTestDoorLink";
      a.textContent = "Leaderboards";
      a.addEventListener("click", function (e) { e.preventDefault(); openBoards(); });
      bar.appendChild(a);
      document.body.insertBefore(bar, document.body.firstChild);
    } catch (e) {}
  }

  /* ---------- boot ---------- */
  function boot() {
    if (!laneOn()) return;                   // true82.net today: render nothing, request nothing
    testDoor();                              // v69.5: the plain link to the boards
    renderButton(null);                      // the signed-out button appears immediately
    if (!configured()) return;               // no keys yet: the button opens the sheet and says so
    me().then(renderButton).catch(function () {});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  /* refresh() re-reads /api/me and redraws the button; open() opens the sheet.
     Both are real API, not test hooks: the spec's "claim your profile" prompt
     (ACCOUNTS.md §1 — on the results screen after a strong run, never as a wall)
     is a call to open(), and anything that changes the account calls refresh(). */
  function refresh() { return me(true).then(function (info) { renderButton(info); return info; }).catch(function () { return null; }); }
  function open(info) { if (info) { openSheet(info); return Promise.resolve(info); } return me().then(function (i) { openSheet(i); return i; }); }

  g.T82ACC = {
    initClerk: initClerk, token: token, authedFetch: authedFetch,
    me: me, signIn: signIn, signOut: signOut, setName: setName, claim: claim,
    refresh: refresh, open: open,
    sid: sid, localDaily: localDaily, laneOn: laneOn, email: clerkEmail, CONFIG: CONFIG,

    submitRun: submitRun, board: board, boards: openBoards, lastSubmit: function () { return LAST_SUBMIT; },

    /* LOAD-BEARING STUBS — read the header before touching these.
       app.js calls both unguarded; they must exist and must not throw.
       (submitRun is real as of v69.1; these two are still stubs because
       /api/daily and /api/weekly do not exist on this lane.) */
    fetchDaily: function () { return Promise.resolve(null); },
    fetchWeekly: function () { return Promise.resolve(null); }
  };
})(typeof window !== "undefined" ? window : globalThis);
