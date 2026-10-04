/* TRUE 82 — Leaderboard Lab: the console, the recipe, the codes and the stage.
   ─────────────────────────────────────────────────────────────────────────────
   WHAT THIS FILE IS. The integration point. data.js, looks.js, boards.js and
   surfaces.js each define one object on window.LB and touch nothing; this file
   builds the controls, holds the recipe, renders the phone, and turns a screen
   the owner likes into a T82- code he can paste back.

   THE PHONE IS THE REAL SITE, NOT A PICTURE OF IT. _headers sets
   X-Frame-Options: DENY on /*, so an <iframe src="/"> renders nothing even
   same-origin. The frame is therefore fed through srcdoc: fetch the real
   index.html, insert <base href="/"> so every relative URL still resolves,
   strip the three scripts a lab must not run, and hand the rest to the frame.
   app.js then boots for real inside it, with the real styles.css at its real
   stamped key, the real title art and the real theme tokens.

   WHY THE THREE SCRIPTS GO. analytics.js and retention-client.js would post lab
   fiddling into the events stream and set the 400-day retention cookie, which
   would be test traffic in his real numbers (the v60 decision). accounts.js is
   removed because the lab renders its OWN board markup from fake rows; leaving
   it in would also start a Clerk download on every reload.

   WHAT IS REAL AND WHAT IS NOT, stated plainly because the owner is judging it:
     start    the REAL home screen. Everything you see is the site.
     boards   REAL components (the sheet, the tabs, the rows) and REAL theme
              tokens, filled with FAKE rows. The layout is honest; the names and
              numbers are invented.
     results  a RECONSTRUCTION of the results card from the real class names. A
              real one cannot be captured without playing a season, so the
              surrounding furniture is approximate while the hook being judged is
              built exactly as it would ship. The warning line says so on screen.

   THE CODE. A starred screen encodes to T82-<hex of a compact record>. In the
   console: LAB.decode("T82-...") prints the recipe back, LAB.apply("T82-...")
   loads it. The field order is APPEND-ONLY, so a code starred today still
   decodes after new looks land. */
(function (g) {
  "use strict";

  var LB = g.LB = g.LB || {};

  /* ---------- the recipe: every key there is (CONTRACT.md) ---------- */
  var DEFAULT = {
    view: "boards",
    slate: "spec",
    board: "today",
    scope: "week",
    around: true,
    youRank: 9,
    field: 4412,
    rows: 12,
    empty: false,
    signedIn: true,
    hasRun: true,
    showTag: true,
    crowd: true,
    startLink: "quiet",
    postGame: "pct",
    look: "boxscore",
    width: 375,
    // 82 lands on a generous day whose top five all read 82-0. That is REAL (the
    // Daily's own tuning puts 3-12% of a field perfect, so 4,412 GMs means hundreds
    // of ties), and the slider is there to show it. But it is the least informative
    // first impression, so the default opens on an ordinary day instead.
    seed: 500,
    // the mode picker on the boards that carry one (82-0%, and the Club's cost view)
    mode: "classic",
    // ROUND TWO. How you GET to a board, which he disliked as a row of pills, and
    // whether the sheet sits on the real riso paper stock instead of a grey box.
    nav: "pills",
    paper: true
  };
  LB.DEFAULT = DEFAULT;

  function copy(o) { var r = {}; for (var k in o) if (o.hasOwnProperty(k)) r[k] = o[k]; return r; }
  function merge(dst, src) {
    if (!src) return dst;
    for (var k in DEFAULT) if (DEFAULT.hasOwnProperty(k) && src.hasOwnProperty(k)) dst[k] = src[k];
    return dst;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- the T82 code ----------
     Order is APPEND-ONLY: a new setting goes on the END, so every code ever
     starred still decodes and a missing trailing field keeps its default. */
  var ORDER = ["view", "slate", "board", "scope", "around", "youRank", "field", "rows",
    "empty", "signedIn", "hasRun", "showTag", "crowd", "startLink", "postGame", "look", "width", "seed", "mode", "nav", "paper"];

  function encode(rc) {
    var s = ORDER.map(function (k) {
      var v = rc[k];
      if (v === true) return "1";
      if (v === false) return "0";
      return String(v).replace(/\|/g, "");
    }).join("|");
    var out = "";
    for (var i = 0; i < s.length; i++) out += ("0" + s.charCodeAt(i).toString(16)).slice(-2);
    return "T82-" + out;
  }
  function decode(code) {
    try {
      var hex = String(code).replace(/^T82-/, "");
      if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2) return null;
      var s = "";
      for (var i = 0; i < hex.length; i += 2) s += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
      var parts = s.split("|"), rc = {};
      for (var j = 0; j < ORDER.length && j < parts.length; j++) {
        var k = ORDER[j], d = DEFAULT[k], v = parts[j];
        if (typeof d === "boolean") rc[k] = v === "1";
        else if (typeof d === "number") rc[k] = Number(v);
        else rc[k] = v;
      }
      return rc;
    } catch (e) { return null; }
  }

  var RC = load();
  function load() {
    var out = copy(DEFAULT);
    try {
      var raw = g.localStorage && g.localStorage.getItem("t82lb-rc");
      if (raw) merge(out, JSON.parse(raw));
    } catch (e) {}
    try {
      var h = String(g.location.hash || "").replace(/^#/, "");
      if (/^T82-/i.test(h)) merge(out, decode(h) || {});
    } catch (e) {}
    return out;
  }
  function save() { try { g.localStorage.setItem("t82lb-rc", JSON.stringify(RC)); } catch (e) {} }

  /* ---------- stars ---------- */
  function stars() { try { return JSON.parse(g.localStorage.getItem("t82lb-stars") || "[]"); } catch (e) { return []; } }
  function setStars(a) { try { g.localStorage.setItem("t82lb-stars", JSON.stringify(a)); } catch (e) {} }

  /* ---------- the control registry ----------
     One place, so a new setting is one row here and nothing else. */
  function lookIds() { return ((LB.looks && LB.looks.LIST) || []).map(function (l) { return [l.id, l.name]; }); }
  function navIds() { return ((LB.nav && LB.nav.LIST) || []).map(function (n) { return [n.id, n.name]; }); }
  function startIds() { return ((LB.surfaces && LB.surfaces.START) || []).map(function (s) { return [s.id, s.name]; }); }
  function postIds() { return ((LB.surfaces && LB.surfaces.POST) || []).map(function (s) { return [s.id, s.name]; }); }
  function slateList() {
    try {
      var sl = LB.boards && LB.boards.slate ? LB.boards.slate(RC) : null;
      return (sl && sl.list) || [];
    } catch (e) { return []; }
  }
  function boardIds() { return slateList().map(function (b) { return [b.id, b.tab || b.title || b.id]; }); }
  function scopesFor() {
    var list = slateList();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === RC.board) {
        return (list[i].scopes || []).map(function (s) { return [s, scopeLabel(s)]; });
      }
    }
    return [];
  }
  function scopeLabel(s) {
    return s === "today" ? "Today" : s === "week" ? "This week" : s === "month" ? "This month" : "All time";
  }

  var GROUPS = [
    { h: "The board", view: "boards", rows: [
      { k: "slate", t: "seg", label: "Which boards", opts: [["spec", "The new slate"], ["shipped", "Today's five"]],
        note: "Today's five is what is built right now. The new slate is what the research argues for." },
      { k: "board", t: "seg", label: "Open board", opts: boardIds },
      { k: "scope", t: "seg", label: "When", opts: scopesFor, note: "Only on boards that offer it." },
      { k: "around", t: "check", label: "Open on your neighbourhood", note: "Off opens at rank 1 instead." },
      { k: "crowd", t: "check", label: "Crowd line above the list" },
      { k: "showTag", t: "check", label: "Show the tag beside a name" }
    ] },
    { h: "Who is looking", rows: [
      { k: "signedIn", t: "check", label: "Signed in" },
      { k: "hasRun", t: "check", label: "Has finished a season",
        note: "Signed out WITH a season is the state that earns the account. Signed out with none must never invent a rank." },
      { k: "youRank", t: "range", label: "Your rank", min: 0, max: 400, step: 1, note: "0 means you are not on this board." },
      { k: "field", t: "range", label: "GMs on the board", min: 0, max: 2000, step: 1,
        note: "Under 30 the crowd line and the percentile go quiet, because nothing honest can be said about a distribution that small. Drag it down to see that." },
      { k: "rows", t: "range", label: "Rows shown", min: 0, max: 82, step: 1,
        note: "0 and 1 are real states, not edge cases: they are what the first viewers meet at 9am on debut day." },
      { k: "empty", t: "check", label: "Show the empty state" }
    ] },
    { h: "The look", view: "boards", rows: [
      { k: "look", t: "seg", label: "Art direction", opts: lookIds },
      { k: "nav", t: "seg", label: "How you get there", opts: navIds,
        note: "The pills are what he disliked. These are the alternatives." },
      { k: "paper", t: "check", label: "Riso paper under it",
        note: "The real stock the season print and the reel already use." }
    ] },
    { h: "After a game", view: "results", rows: [
      { k: "postGame", t: "seg", label: "The hook", opts: postIds }
    ] },
    { h: "Start screen link", view: "start", rows: [
      { k: "startLink", t: "seg", label: "The link", opts: startIds }
    ] },
    { h: "Shuffle", rows: [
      { k: "seed", t: "range", label: "Reshuffle the names", min: 1, max: 999, step: 1 }
    ] }
  ];

  function buildConsole() {
    var host = document.getElementById("labConsole");
    if (!host) return;
    /* THE CONTROL FOR WHAT YOU ARE LOOKING AT COMES FIRST. The console is about
       2,700px tall and "After a game" used to sit 2,286px down, under the whole
       board section. On a phone he was scrolling past two thousand pixels of
       controls for a tab he was not on, to reach the only control that changes
       the one he was, which reads exactly as "the after game portion doesn't
       even update any more at all": nothing he could reach changed it. Groups
       that belong to the open view sort to the top; untagged groups follow; the
       other views' groups go last rather than disappearing, because they are
       still worth having without switching tabs to find them. */
    var ordered = GROUPS.slice().sort(function (a, b) {
      var am = a.view === RC.view ? 0 : (a.view ? 2 : 1);
      var bm = b.view === RC.view ? 0 : (b.view ? 2 : 1);
      return am - bm;
    });
    var html = "";
    ordered.forEach(function (grp) {
      html += '<div class="lab-group"><div class="lab-group-h">' + esc(grp.h) + "</div>";
      grp.rows.forEach(function (r) {
        var opts = typeof r.opts === "function" ? r.opts() : r.opts;
        if (r.t === "seg" && (!opts || !opts.length)) return;    // a board with no scopes shows no row
        html += '<div class="lab-row" data-k="' + esc(r.k) + '"><label>' + esc(r.label) + "</label>";
        if (r.t === "seg") {
          html += '<div class="lab-seg">' + opts.map(function (o) {
            return '<button type="button" data-k="' + esc(r.k) + '" data-v="' + esc(o[0]) + '"' +
              (String(RC[r.k]) === String(o[0]) ? ' class="on"' : "") + ">" + esc(o[1]) + "</button>";
          }).join("") + "</div>";
        } else if (r.t === "check") {
          html += '<div class="lab-check"><input type="checkbox" id="lb-' + esc(r.k) + '" data-k="' + esc(r.k) + '"' +
            (RC[r.k] ? " checked" : "") + '><label for="lb-' + esc(r.k) + '">' + (RC[r.k] ? "on" : "off") + "</label></div>";
        } else if (r.t === "range") {
          html += '<div class="lab-range"><input type="range" data-k="' + esc(r.k) + '" min="' + r.min +
            '" max="' + r.max + '" step="' + r.step + '" value="' + esc(RC[r.k]) + '"><output>' + esc(RC[r.k]) + "</output></div>";
        }
        if (r.note) html += '<p class="lab-note">' + esc(r.note) + "</p>";
        html += "</div>";
      });
      html += "</div>";
    });
    host.innerHTML = html;

    host.querySelectorAll(".lab-seg button").forEach(function (b) {
      b.addEventListener("click", function () { set(b.getAttribute("data-k"), b.getAttribute("data-v")); });
    });
    host.querySelectorAll('input[type="checkbox"]').forEach(function (c) {
      c.addEventListener("change", function () { set(c.getAttribute("data-k"), c.checked); });
    });
    host.querySelectorAll('input[type="range"]').forEach(function (s) {
      s.addEventListener("input", function () {
        var out = s.parentNode.querySelector("output"); if (out) out.textContent = s.value;
      });
      s.addEventListener("change", function () { set(s.getAttribute("data-k"), Number(s.value)); });
    });
  }

  function set(k, v) {
    if (!DEFAULT.hasOwnProperty(k)) return;
    if (typeof DEFAULT[k] === "number" && typeof v === "string") v = Number(v);
    RC[k] = v;
    fixOrphans();
    save();
    buildConsole();
    buildViews();
    render();
  }

  /* A saved recipe, or a slate change, can leave the open board or the scope
     pointing at something this slate does not have. Silently falling back beats
     rendering an empty phone with no explanation. */
  function fixOrphans() {
    var ids = boardIds().map(function (x) { return x[0]; });
    if (ids.length && ids.indexOf(RC.board) === -1) RC.board = ids[0];
    var sc = scopesFor().map(function (x) { return x[0]; });
    if (sc.length && sc.indexOf(RC.scope) === -1) RC.scope = sc[0];
    var looks = lookIds().map(function (x) { return x[0]; });
    if (looks.length && looks.indexOf(RC.look) === -1) RC.look = looks[0];
    var st = startIds().map(function (x) { return x[0]; });
    if (st.length && st.indexOf(RC.startLink) === -1) RC.startLink = st[0];
    var po = postIds().map(function (x) { return x[0]; });
    if (po.length && po.indexOf(RC.postGame) === -1) RC.postGame = po[0];
    var nv = navIds().map(function (x) { return x[0]; });
    if (nv.length && nv.indexOf(RC.nav) === -1) RC.nav = nv[0];
  }

  /* THE STAMP COUNTS WHAT IS LOADED, so a stale copy says so itself. He reported
     "after game is unchanged" when the files on the server were already correct
     and his phone was holding the previous round from cache. A hand-bumped
     version number would have had the same problem (it ships in the same stale
     file); a COUNT of the modules actually in memory cannot lie, because round
     one had 11 looks and 6 after-game hooks and round two has 6 and 9. If the
     numbers below are not the ones in my message, the page is cached. */
  function stampLine() {
    var host = document.getElementById("labStamp");
    if (!host) return;
    var looks = ((LB.looks && LB.looks.LIST) || []).length;
    var navs = ((LB.nav && LB.nav.LIST) || []).length;
    var posts = ((LB.surfaces && LB.surfaces.POST) || []).length;
    var art = !!(LB.art && LB.art.ready);
    host.textContent = looks + " looks \u00B7 " + navs + " ways in \u00B7 " + posts +
      " after a game" + (art ? "" : " \u00B7 art module missing");
  }

  function buildViews() {
    var host = document.getElementById("labViews");
    if (!host) return;
    var views = [["start", "Start screen"], ["results", "After a game"], ["boards", "The boards"]];
    host.innerHTML = views.map(function (v) {
      return '<button type="button" data-view="' + v[0] + '" role="tab"' +
        (RC.view === v[0] ? ' class="on" aria-selected="true"' : ' aria-selected="false"') + ">" + esc(v[1]) + "</button>";
    }).join("");
    host.querySelectorAll("[data-view]").forEach(function (b) {
      b.addEventListener("click", function () { set("view", b.getAttribute("data-view")); });
    });
    var warn = document.getElementById("labWarn");
    if (warn) {
      warn.textContent = RC.view === "start"
        ? "This is the real home screen with the link added. Everything else on it is the site."
        : RC.view === "boards"
          ? "Real components and real colours, filled with invented names and numbers."
          : "The card around the hook is a close rebuild, not a capture. The hook itself is built as it would ship.";
    }
  }

  /* ---------- the phone ---------- */
  var framePage = null;

  function phoneWidths() {
    var host = document.getElementById("labWidths");
    if (host) {
      host.innerHTML = [320, 375, 390].map(function (w) {
        return '<button type="button" data-w="' + w + '"' + (RC.width === w ? ' class="on"' : "") + ">" + w + "px</button>";
      }).join("");
      host.querySelectorAll("[data-w]").forEach(function (b) {
        b.addEventListener("click", function () { set("width", Number(b.getAttribute("data-w"))); });
      });
    }
    var phone = document.getElementById("labPhone");
    if (phone) { phone.style.width = RC.width + "px"; phone.setAttribute("data-w", RC.width + "px"); }
  }

  function fetchPage() {
    if (framePage) return Promise.resolve(framePage);
    return fetch("/index.html", { cache: "no-cache" }).then(function (r) { return r.text(); }).then(function (html) {
      html = html.replace(/<head([^>]*)>/i, '<head$1><base href="/">');
      html = html.replace(/<script[^>]*src="(analytics|retention-client|accounts)\.js[^"]*"[^>]*>\s*<\/script>/gi, "");
      framePage = html;
      return html;
    }).catch(function () { return null; });
  }

  function mountFrame() {
    var f = document.getElementById("labFrame");
    if (!f) return Promise.resolve(null);
    return fetchPage().then(function (html) {
      if (!html) return null;
      return new Promise(function (resolve) {
        f.onload = function () { resolve(f.contentDocument); };
        f.srcdoc = html;
      });
    });
  }

  // app.js draws the home only after site_data.json lands, so wait for the node
  function waitFor(doc, sel, ms) {
    return new Promise(function (resolve) {
      var t0 = new Date().getTime();
      (function tick() {
        var n = null;
        try { n = doc.querySelector(sel); } catch (e) {}
        if (n) return resolve(n);
        if (new Date().getTime() - t0 > (ms || 8000)) return resolve(null);
        setTimeout(tick, 60);
      })();
    });
  }

  function styleTag(doc, id, css) {
    var s = doc.getElementById(id);
    if (!s) { s = doc.createElement("style"); s.id = id; doc.head.appendChild(s); }
    s.textContent = css || "";
    return s;
  }

  var renderSeq = 0;
  function render() {
    var mine = ++renderSeq;
    phoneWidths();
    return mountFrame().then(function (doc) {
      if (!doc || mine !== renderSeq) return;
      doc.documentElement.setAttribute("data-look", RC.look);
      var look = ((LB.looks && LB.looks.LIST) || []).filter(function (l) { return l.id === RC.look; })[0];
      /* ORDER MATTERS AND IT IS NOT ARBITRARY. The navigation and the look can
         both claim the same strip of screen (measured: the edge index and the
         gangrun density bar both want the right gutter) and they land at equal
         specificity, so whichever stylesheet comes last wins. The LOOK wins,
         because the look owns the board's picture of the field and the
         navigation owns the way in; a navigation that buries the look's one
         picture is the worse of the two failures. styleTag appends on first
         use, so this tag is created before "lab-nav" and would otherwise lose. */
      styleTag(doc, "lab-nav", "");                      // reserve the slot first
      styleTag(doc, "lab-look", look && look.css ? safe(look.css, RC) : "");
      if (RC.view === "start") return paintStart(doc, mine);
      if (RC.view === "results") return paintResults(doc, mine);
      return paintBoards(doc, mine);
    });
  }
  function safe(fn, a, b) { try { return fn(a, b) || ""; } catch (e) { return ""; } }

  function dataFor() {
    try { return LB.data && LB.data.board ? LB.data.board(RC.board, RC) : null; } catch (e) { return null; }
  }
  function surfaceFor(which) {
    var list = (LB.surfaces && LB.surfaces[which]) || [];
    var want = which === "START" ? RC.startLink : RC.postGame;
    for (var i = 0; i < list.length; i++) if (list[i].id === want) return list[i];
    return list[0] || null;
  }

  function paintStart(doc, mine) {
    return waitFor(doc, ".hm-top").then(function (top) {
      if (!top || mine !== renderSeq) return;
      doc.body.classList.remove("rules-open");
      var old = doc.getElementById("lbBoardMount");
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var v = surfaceFor("START");
      styleTag(doc, "lab-surface", v && v.css ? safe(v.css, RC) : "");
      var prev = doc.getElementById("lbStartLink");
      if (prev && prev.parentNode) prev.parentNode.removeChild(prev);

      /* THE ACCOUNT FACE HAS TO BE THERE OR THE CENTRING IS A LIE. accounts.js is
         stripped from the frame (see the header), so `.hm-acct` renders empty and
         the row lays out with one fewer item than the live site will have once
         ACCT_LIVE flips. Since the whole question being judged here is "is the
         link centred and does it crowd the logo", the slot gets the real face:
         the same 22px outline glyph accounts.js draws, in the same 44px box. */
      var acctSlot = top.querySelector(".hm-acct");
      if (acctSlot && !acctSlot.getAttribute("data-lab-face")) {
        acctSlot.setAttribute("data-lab-face", "1");
        acctSlot.removeAttribute("aria-hidden");
        acctSlot.innerHTML = '<button class="acct-btn tm-flat" type="button" aria-label="Your account">' +
          '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" ' +
          'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
          '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></button>';
      }

      if (!v) return;
      var wrap = doc.createElement("span");
      wrap.id = "lbStartLink";
      wrap.innerHTML = safe(v.html, RC);
      var acct = top.querySelector(".hm-acct");
      if (acct) top.insertBefore(wrap, acct); else top.appendChild(wrap);
      // the five-tap Kaman egg lives on .brand-art, not here, but a stray bubble
      // would still reach the home's handlers: stop it at the link.
      wrap.addEventListener("click", function (ev) { ev.stopPropagation(); ev.preventDefault(); });
    });
  }

  function paintBoards(doc, mine) {
    return waitFor(doc, "#app").then(function (app) {
      if (!app || mine !== renderSeq) return;
      styleTag(doc, "lab-surface", "");
      var prev = doc.getElementById("lbStartLink");
      if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
      var html = "";
      try { html = (LB.boards && LB.boards.render) ? LB.boards.render(RC, dataFor()) : ""; }
      catch (e) { html = errBox(e); }
      var old = doc.getElementById("lbBoardMount");
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var mount = doc.createElement("div");
      mount.id = "lbBoardMount";
      mount.innerHTML = html;
      doc.body.appendChild(mount);
      doc.body.classList.add("rules-open");
      applyNav(doc, mount);
      applyPaper(doc, mount);
      wireFrameControls(doc, mount);
      paintLook(doc);
    });
  }

  function paintResults(doc, mine) {
    return waitFor(doc, "#app").then(function (app) {
      if (!app || mine !== renderSeq) return;
      doc.body.classList.remove("rules-open");
      var old = doc.getElementById("lbBoardMount");
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var prev = doc.getElementById("lbStartLink");
      if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
      var v = surfaceFor("POST");
      var postData = LB.data && LB.data.board ? LB.data.board("today", RC) : null;
      styleTag(doc, "lab-surface", v && v.css ? safe(v.css, RC) : "");
      /* The post-game hooks all speak about "today's board" in their own copy, so
         they are handed the DAILY, not whatever board the Boards tab happens to have
         open. Feeding them the streak board put "13 days" through a card that prints
         a win-loss record. */
      app.innerHTML = resultsShell(v, postData);
      paintLook(doc);
      /* THE HOOK PAINTS TOO (the blocker three reviewers found). surfaces.js
         defines paint(doc, recipe, data) on eight of the nine post-game
         directions and nothing here called it, so every one of them rendered
         with ZERO canvases. That is round one's exact failure (four looks
         defined paint, none painted) relocated into a new file, and the only
         reason it was not caught twice is that the measurement was run on the
         boards tab. It runs AFTER innerHTML, so the markup it paints into
         exists; it is wrapped, because a hook that throws must not take the
         results screen with it. */
      if (v && v.paint) { try { v.paint(doc, RC, postData); } catch (e) {} }
    });
  }

  /* boards.js emits its controls as plain attributes and documents them in
     LB.boards.WIRE, deliberately holding no handlers of its own. Nothing was
     listening, so every in-frame control (the board tabs, AROUND YOU / TOP, the
     scope segment, the mode picker) was dead on the phone and the owner could
     only drive the lab from the console below. One delegated listener closes it. */
  function wireFrameControls(doc, mount) {
    var map = (LB.boards && LB.boards.WIRE) || {};
    mount.addEventListener("click", function (ev) {
      for (var key in map) {
        if (!map.hasOwnProperty(key)) continue;
        var node = ev.target;
        while (node && node !== mount) {
          if (node.getAttribute && node.hasAttribute(map[key])) {
            var raw = node.getAttribute(map[key]);
            if (typeof DEFAULT[key] === "boolean") set(key, raw === "" ? !RC[key] : raw === "true" || raw === "1");
            else if (raw !== "" && raw !== null) set(key, raw);
            return;
          }
          node = node.parentNode;
        }
      }
    });
    var sel = mount.querySelector("select[" + (map.mode || "data-mode") + "]");
    if (sel) sel.addEventListener("change", function () { set("mode", sel.value); });
  }

  /* ---------- ROUND TWO: the navigation, and the paper ----------
     nav.js owns how you GET to a board; boards.js owns the list. So the chosen
     navigation REPLACES the pill row boards.js emits rather than sitting beside
     it, and "pills" is simply the direction that reproduces what shipped, so
     "Compare with today" still means something. Absent nav.js, the pills stay:
     a missing module must never leave the board unreachable. */
  function applyNav(doc, mount) {
    var list = (LB.nav && LB.nav.LIST) || [];
    var def = null, i;
    for (i = 0; i < list.length; i++) if (list[i].id === RC.nav) def = list[i];
    doc.documentElement.setAttribute("data-nav", def ? def.id : "pills");
    styleTag(doc, "lab-nav", def && def.css ? safe(def.css, RC) : "");
    if (!def || !def.html) return;
    var slate = null;
    try { slate = LB.boards && LB.boards.slate ? LB.boards.slate(RC) : null; } catch (e) {}
    var markup = "";
    try { markup = def.html(RC, slate, dataFor()) || ""; } catch (e) { markup = ""; }
    if (!markup) return;                       // a direction that draws nothing keeps the pills
    var host = mount.querySelector(".lb-tabs");
    var box = doc.createElement("div");
    box.className = "lb-nav";
    box.setAttribute("data-nav-id", def.id);
    box.innerHTML = markup;
    if (host && host.parentNode) host.parentNode.replaceChild(box, host);
    else {
      var scroll = mount.querySelector(".rs-scroll");
      if (scroll) scroll.insertBefore(box, scroll.firstChild); else return;
    }
    // gestures, scroll sync, anything a click attribute cannot express. wire() is
    // called on a FRESH subtree every render, so listeners cannot accumulate.
    if (def.wire) { try { def.wire(doc, set); } catch (e) {} }
  }

  /* The sheet sits on the real riso stock the season print and the reel already
     use, rather than a flat grey box. One call, and it is a toggle because he
     should be able to see it on and off rather than take my word for it. */
  function applyPaper(doc, mount) {
    var sheet = mount.querySelector(".rules-sheet");
    if (!sheet) return;
    var url = "";
    if (RC.paper && LB.art && LB.art.paper) { try { url = LB.art.paper(doc) || ""; } catch (e) { url = ""; } }
    if (url) {
      sheet.style.backgroundImage = url;
      sheet.style.backgroundSize = "cover";
      sheet.setAttribute("data-paper", "1");
    } else {
      sheet.style.backgroundImage = "";
      sheet.removeAttribute("data-paper");
    }
  }

  function paintLook(doc) {
    var look = ((LB.looks && LB.looks.LIST) || []).filter(function (l) { return l.id === RC.look; })[0];
    if (look && look.paint) { try { look.paint(doc, RC); } catch (e) {} }
  }

  function errBox(e) {
    return '<div class="rules-overlay"><div class="rules-sheet acct-sheet plq-frame"><div class="rs-scroll">' +
      '<p class="acct-p">A lab module threw while rendering. That is a lab bug, not a design.</p>' +
      '<p class="acct-fine">' + esc(String((e && e.message) || e)) + "</p></div></div></div>";
  }


  /* ---------- THE GOAT CLIMB, rebuilt faithfully ----------
     The owner's hardest rule for round two: "after the game needs to retain the
     climb artwork it's using now... it's beautiful the way it is." Round one's
     results shell did not draw it at all, so every post-game variant was designed
     against a card that was missing the one thing it must not disturb.

     This is app.js climbHtml reproduced: the same twenty legends, the same
     geometry (FLOOR 62, LADDER_TOP 81, 200/11 px a win, a 15px compressed band
     from 81 to 82), the same class names (.climb, .climb-track, .climb-svg with
     .rail-path and .fill-path, .climb-pin/.climb-tag pairs with .comp on the
     nearest comparison, .climb-summit-cap, .climb-you with .cy-dot and
     .cy-label), so the site's own CSS styles it and a variant that mounts into it
     is mounting into the real thing.

     Worth seeing while designing: THE CLIMB IS ALREADY A LEADERBOARD. A vertical
     rail, pins for the greatest teams in history, and a marker for where this
     season sits among them. The board asks the same question about living
     players. */
  var CLIMB_LEGENDS = [
    ["Dream Team", 81], ["Redeem Team", 80], ["OG Death Lineup", 79], ["Hamptons 5", 78],
    ["Shaqobe Core", 77], ["OG Celts Big 3", 76], ["\u201908 Celts Big 3", 75], ["3-peat Bulls Core", 74],
    ["\u201916 Warriors", 73], ["\u201996 Bulls", 72], ["Lob City Lineup", 71], ["Prime Wilt Core", 70],
    ["\u201972 Lakers", 69], ["Fo' Fo' Fo' Co'", 68], ["\u201986 Celtics", 67], ["Heatles", 66],
    ["\u201916 Spurs", 65], ["The Last Shot Jazz", 64], ["Bad Boy Pistons", 63], ["Beautiful Game Spurs", 62]
  ];

  /* The geometry, exposed, so a post-game direction can put its own pins ON the
     rail instead of writing a caption underneath it. Round two's builders all
     mounted "climb" and all of them wrote a sentence; the whole point of that
     mount is that the ARTWORK becomes the way in, which needs the same yPct the
     legend pins use. */
  function climbGeom(wins) {
    var FLOOR = 62, TOP = 82, RX = 56, LADDER_TOP = 81, PX_PER_WIN = 200 / 11;
    var BAND_PX = 15, CLUSTER_PX = Math.round((LADDER_TOP - FLOOR) * PX_PER_WIN);
    var FLOOR_PX = BAND_PX + CLUSTER_PX;
    var below = wins < FLOOR;
    var TRACK_PX = FLOOR_PX + (below ? 50 : 14);
    var Y_TEAMTOP = BAND_PX / TRACK_PX * 100, Y_FLOOR = FLOOR_PX / TRACK_PX * 100;
    return {
      FLOOR: FLOOR, TOP: TOP, RX: RX, LADDER_TOP: LADDER_TOP,
      TRACK_PX: TRACK_PX, Y_TEAMTOP: Y_TEAMTOP, Y_FLOOR: Y_FLOOR, below: below,
      yPct: function (w) {
        if (w <= LADDER_TOP) return Y_TEAMTOP + (LADDER_TOP - w) / (LADDER_TOP - FLOOR) * (Y_FLOOR - Y_TEAMTOP);
        return (TOP - w) / (TOP - LADDER_TOP) * Y_TEAMTOP;
      }
    };
  }
  LB.climb = { LEGENDS: CLIMB_LEGENDS, geom: climbGeom };

  function climbShell(wins, inTrack) {
    var FLOOR = 62, TOP = 82, RX = 56;
    var LADDER_TOP = 81;                       // the top pin sets the scale
    var PX_PER_WIN = 200 / 11;
    var BAND_PX = 15, CLUSTER_PX = Math.round((LADDER_TOP - FLOOR) * PX_PER_WIN);
    var FLOOR_PX = BAND_PX + CLUSTER_PX;
    var below = wins < FLOOR;
    var TRACK_PX = FLOOR_PX + (below ? 50 : 14);
    var Y_TEAMTOP = BAND_PX / TRACK_PX * 100, Y_FLOOR = FLOOR_PX / TRACK_PX * 100;
    function yPct(w) {
      if (w <= LADDER_TOP) return Y_TEAMTOP + (LADDER_TOP - w) / (LADDER_TOP - FLOOR) * (Y_FLOOR - Y_TEAMTOP);
      return (TOP - w) / (TOP - LADDER_TOP) * Y_TEAMTOP;
    }
    var youY = below ? 0 : Math.max(0, Math.min(Y_FLOOR, yPct(wins)));
    var rank = 0, i;
    for (i = 0; i < CLIMB_LEGENDS.length; i++) if (CLIMB_LEGENDS[i][1] > wins) rank++;
    var compIdx = -1;
    if (!below && rank !== 0) {
      var best = Infinity;
      for (i = 0; i < CLIMB_LEGENDS.length; i++) {
        var dd = Math.abs(CLIMB_LEGENDS[i][1] - wins);
        if (dd < best) { best = dd; compIdx = i; }
      }
    }
    var pins = CLIMB_LEGENDS.map(function (L, n) {
      var y = yPct(L[1]).toFixed(2), isC = n === compIdx;
      return '<span class="climb-pin' + (isC ? " comp" : "") + '" style="top:' + y + '%"></span>' +
        '<span class="climb-tag' + (isC ? " comp" : "") + '" style="top:' + y + '%">' + esc(L[0]) + "</span>";
    }).join("");
    var fill = (!below && youY < Y_FLOOR)
      ? '<path class="fill-path" d="M' + RX + "," + youY.toFixed(2) + "L" + RX + "," + Y_FLOOR + '"/>' : "";
    var you = below
      ? '<div class="climb-you below" style="top:' + ((FLOOR_PX + 22) / TRACK_PX * 100).toFixed(2) + '%">' +
          '<span class="cy-arrow">\u25BC</span><span class="cy-label">YOUR FIVE</span></div>'
      : '<div class="climb-you" style="top:' + youY.toFixed(2) + '%">' +
          '<span class="cy-dot"></span><span class="cy-label">YOUR FIVE</span></div>';
    return '<div class="climb"><div class="goat-fw" aria-hidden="true"></div>' +
      '<div class="climb-track" style="height:' + TRACK_PX + 'px">' +
        '<svg class="climb-svg" viewBox="0 0 100 100" preserveAspectRatio="none">' +
          '<path class="rail-path" d="M' + RX + ",0L" + RX + "," + Y_FLOOR.toFixed(2) + '"/>' + fill + "</svg>" +
        pins +
        '<div class="climb-summit-cap">82\u20130</div>' +
        you +
        (inTrack || "") +          // a direction that paints ON the rail lands here
      "</div></div>";
  }

  /* A rebuild of the results card from app.js renderResults (around line 9305):
     .rr > .board.rr-board > .eyebrow, .rr-print > .big, .big-label, .res-comp,
     the share button, then the roster, the GOAT Climb, the Scoring Card,
     .actions > Run it back, the Tribune door and #runStatus. Every section the
     player scrolls past is here at its real depth, so "how far down is the hook"
     is honest; the section BODIES are stand-ins, which is what the warning line
     on the lab page says. The hook itself mounts exactly where it would ship. */
  /* The standing, by the owner's settled rule (DECISIONS.md): the rank always with
     the field size, and the percentile only above PCT_MIN_N and only in the top
     half. surfaces.js owns the implementation and this reads it, so there is one
     rule rather than two copies that drift apart. */
  function standingNow(data) {
    if (!RC.hasRun) return "";
    try {
      if (LB.surfaces && LB.surfaces.standing) return LB.surfaces.standing(RC, data) || "";
    } catch (e) {}
    return "";
  }

  function resultsShell(v, data) {
    /* THE RECORD ON THE CARD IS THE RECORD IN THE HOOK. The hook reads the
       viewer's own row out of the board data, so a hardcoded record here would
       put "76-6" on the card and "82-0 is on today's board" under it, and the
       owner would be judging a contradiction rather than a design. Both come
       from the same row; a viewer who is not on the board (youRank 0) falls back
       to an ordinary season. */
    var rec = "76–6", net = "+19.3";
    try {
      var mineRow = null, i;
      if (data && data.rows) for (i = 0; i < data.rows.length; i++) if (data.rows[i].you) mineRow = data.rows[i];
      if (mineRow && /^\d+-\d+$/.test(String(mineRow.score))) {
        rec = String(mineRow.score).replace("-", "–");
        if (mineRow.sub && /^[+-]/.test(String(mineRow.sub))) net = String(mineRow.sub);
      }
    } catch (e) {}
    var wins = parseInt(String(rec).split("–")[0], 10) || 76;
    var loss = 82 - wins;
    var hook = v && v.html ? safe(v.html, RC, data) : "";
    var at = v ? (v.mount || "after-comp") : "after-comp";
    var place = function (where) { return at === where ? hook : ""; };

    return '<div class="rr">' +
      '<section class="board rr-board" data-result-section="summary">' +
        '<p class="eyebrow">CLASSIC · YOUR SEASON</p>' +
        '<div class="rr-print"><div class="big">' + wins + "–" + loss + "</div></div>" +
        '<div class="big-label">net rating ' + net + "</div>" +
        /* THE REAL LINE, NOT A FROZEN "Top 12%". A hardcoded percentile here did
           two kinds of damage: it broke the standings rule he settled (the rank
           leads, the percentile only when the sample earned it), and because it
           sits directly under the record it made EVERY post-game direction read
           as "the percentile thing again", which is the one idea he had already
           ruled out as not being a hook at all. */
        '<div class="res-comp">Juggernaut territory' +
          (standingNow(data) ? ' <span class="comp-pct">\u2022 ' + esc(standingNow(data)) + '</span>' : '') +
        '</div>' +
        place("after-comp") +
        '<button class="btn btn-primary btn-block presti-spin rr-share" type="button">SHARE YOUR TEAM</button>' +
      "</section>" +
      '<section class="section traits-roster" data-result-section="roster">' +
        '<h2 class="t-head" data-head="eyebrow">Your five</h2>' +
        '<p class="acct-fine">(the five player cards sit here on the real screen)</p>' +
      "</section>" +
      '<section class="section rr-climb" data-result-section="goat_climb">' +
        '<h2 class="t-head" data-head="eyebrow">GOAT Climb</h2>' +
        climbShell(wins, place("climb")) + place("climb-foot") +
      "</section>" +
      '<section class="section"><h2 class="t-head" data-head="eyebrow">Scoring Card</h2>' +
        '<p class="acct-fine">(the ledger sits here)</p></section>' +
      '<div class="actions" data-result-section="replay">' +
        '<button class="btn btn-primary presti-spin" type="button">Run it back</button>' +
        place("actions") +
      "</div>" +
      '<div class="np-door-wrap"><button class="np-door tm-flat" type="button">See the Tribune article</button></div>' +
      '<p class="run-status" id="runStatus">' + place("bottom") + "</p>" +
      place("sheet") +
    "</div>";
  }

  /* ---------- the star bar ---------- */
  function labelFor(rc) {
    var bits = [];
    var look = ((LB.looks && LB.looks.LIST) || []).filter(function (l) { return l.id === rc.look; })[0];
    bits.push(rc.view === "start" ? "start link: " + rc.startLink
      : rc.view === "results" ? "after a game: " + rc.postGame
      : rc.board + (rc.scope ? " / " + rc.scope : ""));
    if (rc.view === "boards" && look) bits.push(look.name);
    if (!rc.signedIn) bits.push(rc.hasRun ? "signed out, has a season" : "signed out, brand new");
    return bits.join(" · ");
  }

  function paintCodes() {
    var list = document.getElementById("labCodeList"), note = document.getElementById("labCodeNote");
    var st = stars();
    if (note) {
      note.textContent = st.length
        ? st.length + (st.length === 1 ? " look starred." : " looks starred.") + " Copy them all and paste them to me."
        : "Star a screen you like and its code appears here.";
    }
    if (list) {
      list.innerHTML = st.map(function (s) {
        return '<div class="lab-code"><span>' + esc(s.code) + "</span><em>" + esc(s.label) + "</em></div>";
      }).join("");
    }
  }

  function fallbackCopy(text, done) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", "readonly");
      ta.style.position = "fixed"; ta.style.left = "-9999px";
      document.body.appendChild(ta); ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      done();
    } catch (e) {}
  }

  function wireBar() {
    var star = document.getElementById("labStar");
    if (star) star.addEventListener("click", function () {
      var code = encode(RC), st = stars();
      for (var i = 0; i < st.length; i++) if (st[i].code === code) { paintCodes(); return; }
      st.push({ code: code, label: labelFor(RC) });
      setStars(st); paintCodes();
      star.textContent = "Starred";
      setTimeout(function () { star.textContent = "Star this look"; }, 1200);
    });
    var copyBtn = document.getElementById("labCopy");
    if (copyBtn) copyBtn.addEventListener("click", function () {
      var text = stars().map(function (s) { return s.code + "   " + s.label; }).join("\n");
      var done = function () {
        copyBtn.textContent = "Copied";
        setTimeout(function () { copyBtn.textContent = "Copy all star codes"; }, 1200);
      };
      try {
        if (g.navigator && g.navigator.clipboard) g.navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
        else fallbackCopy(text, done);
      } catch (e) { fallbackCopy(text, done); }
    });
    var clear = document.getElementById("labClear");
    if (clear) clear.addEventListener("click", function () { setStars([]); paintCodes(); });

    // "Compare with today": the shipped five with no art direction on them.
    var cmp = document.getElementById("labCompare");
    if (cmp) cmp.addEventListener("click", function () {
      if (cmp.classList.contains("on")) {
        cmp.classList.remove("on");
        try { merge(RC, JSON.parse(g.localStorage.getItem("t82lb-before") || "{}")); } catch (e) {}
      } else {
        cmp.classList.add("on");
        try {
          g.localStorage.setItem("t82lb-before", JSON.stringify({
            slate: RC.slate, look: RC.look, around: RC.around, crowd: RC.crowd, showTag: RC.showTag
          }));
        } catch (e) {}
        RC.slate = "shipped"; RC.around = false; RC.crowd = false; RC.showTag = false;
        var looks = lookIds().map(function (x) { return x[0]; });
        RC.look = looks.indexOf("shipped") >= 0 ? "shipped" : (looks.indexOf("boxscore") >= 0 ? "boxscore" : RC.look);
      }
      fixOrphans(); save(); buildConsole(); buildViews(); render();
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    fixOrphans();
    buildViews();
    buildConsole();
    wireBar();
    paintCodes();
    stampLine();
    render();
  }

  g.LAB = {
    recipe: function () { return copy(RC); },
    set: set,
    encode: encode,
    decode: decode,
    apply: function (code) {
      var rc = decode(code);
      if (rc) { merge(RC, rc); fixOrphans(); save(); buildConsole(); buildViews(); render(); }
      return copy(RC);
    },
    stars: stars,
    render: render
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(typeof window !== "undefined" ? window : globalThis);
