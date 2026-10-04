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
    seed: 500
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
    "empty", "signedIn", "hasRun", "showTag", "crowd", "startLink", "postGame", "look", "width", "seed"];

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
    { h: "The board", rows: [
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
      { k: "field", t: "range", label: "GMs on the board", min: 0, max: 20000, step: 100 },
      { k: "rows", t: "range", label: "Rows shown", min: 3, max: 40, step: 1 },
      { k: "empty", t: "check", label: "Show the empty state" }
    ] },
    { h: "The look", rows: [
      { k: "look", t: "seg", label: "Art direction", opts: lookIds }
    ] },
    { h: "The two new pieces", rows: [
      { k: "startLink", t: "seg", label: "Start screen link", opts: startIds },
      { k: "postGame", t: "seg", label: "After a game", opts: postIds }
    ] },
    { h: "Shuffle", rows: [
      { k: "seed", t: "range", label: "Reshuffle the names", min: 1, max: 999, step: 1 }
    ] }
  ];

  function buildConsole() {
    var host = document.getElementById("labConsole");
    if (!host) return;
    var html = "";
    GROUPS.forEach(function (grp) {
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
      styleTag(doc, "lab-surface", v && v.css ? safe(v.css, RC) : "");
      app.innerHTML = resultsShell(v, dataFor());
      paintLook(doc);
    });
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

  /* A rebuild of the results card from app.js renderResults (around line 9305):
     .rr > .board.rr-board > .eyebrow, .rr-print > .big, .big-label, .res-comp,
     the share button, then the roster, the GOAT Climb, the Scoring Card,
     .actions > Run it back, the Tribune door and #runStatus. Every section the
     player scrolls past is here at its real depth, so "how far down is the hook"
     is honest; the section BODIES are stand-ins, which is what the warning line
     on the lab page says. The hook itself mounts exactly where it would ship. */
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
        '<div class="res-comp">Juggernaut territory' +
          (RC.hasRun ? ' <span class="comp-pct">• Top 12%</span>' : "") + "</div>" +
        place("after-comp") +
        '<button class="btn btn-primary btn-block presti-spin rr-share" type="button">SHARE YOUR TEAM</button>' +
      "</section>" +
      '<section class="section traits-roster" data-result-section="roster">' +
        '<h2 class="t-head" data-head="eyebrow">Your five</h2>' +
        '<p class="acct-fine">(the five player cards sit here on the real screen)</p>' +
      "</section>" +
      '<section class="section rr-climb"><h2 class="t-head" data-head="eyebrow">GOAT Climb</h2>' +
        '<p class="acct-fine">(the climb sits here)</p></section>' +
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
