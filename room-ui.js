/* TRUE 82 — THE DRAFT ROOM, client (v70)
   ─────────────────────────────────────────────────────────────────────────────
   Three people, one snake draft, one exhaustible pool. The draft itself is the
   one THE REDRAFTED has shipped since v55; this screen only adds the parts a
   shared draft needs — a room code, who is in which seat, whose turn it is, a
   clock, and a pick that goes to the server instead of straight into memory.

   DELIBERATELY PLAIN. The owner asked for the backend to be right first and
   said quick and dirty was fine for the screen, so this reuses the existing
   components (.t-btn, .acct-p, .lb-*) and adds almost no styling of its own.
   None of it is on the style system's critical path and all of it is behind
   the account lane, so it cannot reach true82.net while ACCT_LIVE is false.

   THE HOST BUILDS THE BOARD. `sdBuildPool()` in app.js already produces exactly
   the pool the single-player mode drafts from; this serialises it and posts it
   once, at creation. Every seat then drafts from the server's stored copy. See
   functions/_lib/room.js for why it works that way.

   IT POLLS. Two seconds while it is your turn or the draft is live, and the
   server only sends moves after the sequence number we already hold, so the
   common poll is an empty array. */
(function (g) {
  "use strict";
  var POLL_MS = 2000;
  var S = null;          // { id, seat, board, view, timer, poll }
  var MOUNT = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function laneOn() {
    try { return !!(g.T82ACC && g.T82ACC.laneOn ? g.T82ACC.laneOn() : null); } catch (e) { return false; }
  }
  function api(method, url, body) {
    return g.T82ACC && g.T82ACC.authedFetch
      ? g.T82ACC.authedFetch(url, body === undefined ? { method: method } :
          { method: method, body: JSON.stringify(body) })
      : Promise.resolve({ ok: false, why: "no-account-lane" });
  }

  /* ---------- the board the host posts ---------- */
  function buildBoardJson(cls, diff) {
    g.SD_CLASS_ID = cls; g.SD_DIFF = diff; g.SD = null;
    var pool = g.sdBuildPool();
    var IDX = g.IDX;
    return {
      v: 1, cls: cls, diff: diff, size: 5, caps: { G: 2, F: 2, C: 1 },
      p: pool.list.map(function (rec) {
        return {
          n: rec.name,
          v: Math.round((g.valueOf ? g.valueOf(rec.best) : 0) * 100) / 100,
          s: rec.seasons.map(function (row) { return [row[IDX.season], g.sdRowBuckets(row).join("")]; })
        };
      })
    };
  }

  /* ---------- the shell ---------- */
  function overlay() {
    var ov = document.getElementById("rmOverlay");
    if (ov) return ov;
    ov = document.createElement("div");
    ov.className = "rules-overlay";
    ov.id = "rmOverlay";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-modal", "true");
    ov.innerHTML = '<div class="rules-sheet" id="rmSheet"></div>';
    document.body.appendChild(ov);
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    return ov;
  }
  function sheet() { return document.getElementById("rmSheet"); }
  function close() {
    stopPoll();
    var ov = document.getElementById("rmOverlay");
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    S = null;
  }
  function head(title) {
    return '<div class="rs-head"><h2 class="rs-title">' + esc(title) + '</h2>' +
      '<button class="rs-close" id="rmClose" type="button" aria-label="Close">×</button></div>';
  }
  function draw(html) {
    overlay();
    sheet().innerHTML = html;
    var c = document.getElementById("rmClose");
    if (c) c.addEventListener("click", close);
  }

  /* ---------- the lobby ---------- */
  function renderLobby(msg) {
    var classes = (g.sdOrderAll ? g.sdOrderAll() : ["2016"]).slice(0, 24);
    draw(head("Draft room") +
      '<div class="rs-scroll">' +
        (msg ? '<p class="acct-p">' + esc(msg) + "</p>" : "") +
        '<p class="acct-p">Three GMs, one board, every pick exclusive.</p>' +
        '<p class="acct-fine">Class</p>' +
        '<select id="rmClass">' + classes.map(function (c) {
          return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("") + "</select>" +
        '<p class="acct-fine">Board</p>' +
        '<select id="rmDiff"><option value="pro">Pro · the real draft class</option>' +
        '<option value="pickup">Pickup · the short list</option></select>' +
        '<p class="acct-fine">Pace</p>' +
        '<select id="rmPace"><option value="live">Live · 90 seconds a pick</option>' +
        '<option value="slow">Slow · 8 hours a pick</option></select>' +
        '<p><button class="t-btn" id="rmCreate" type="button">Open a room</button></p>' +
        '<hr>' +
        '<p class="acct-fine">Or join one</p>' +
        '<input id="rmCode" maxlength="6" placeholder="ROOM CODE" autocapitalize="characters" spellcheck="false">' +
        ' <button class="t-btn" data-kind="quiet" id="rmJoin" type="button">Join</button>' +
      "</div>");

    document.getElementById("rmCreate").addEventListener("click", function () {
      var btn = this; btn.disabled = true; btn.textContent = "Opening…";
      var cls = document.getElementById("rmClass").value;
      var diff = document.getElementById("rmDiff").value;
      var pace = document.getElementById("rmPace").value;
      var go = function () {
        var board;
        try { board = buildBoardJson(cls, diff); }
        catch (e) { renderLobby("Could not build that board."); return; }
        api("POST", "/api/room?op=create", { board: board, pace: pace }).then(function (r) {
          if (!r || !r.ok) { renderLobby(why(r)); return; }
          S = { id: r.id, seat: r.seat, board: board };
          poll(true);
        });
      };
      // PRO boards need the real draft file, which app.js fetches lazily
      if (g.sdLoadDrafts) g.sdLoadDrafts().then(go, go); else go();
    });
    document.getElementById("rmJoin").addEventListener("click", function () {
      var code = String(document.getElementById("rmCode").value || "").toUpperCase().trim();
      if (code.length !== 6) { renderLobby("A room code is six characters."); return; }
      this.disabled = true;
      api("POST", "/api/room?op=join", { id: code }).then(function (r) {
        if (!r || !r.ok) { renderLobby(why(r)); return; }
        S = { id: code, seat: r.seat, board: null };
        poll(true);
      });
    });
  }
  function why(r) {
    var m = {
      "room-full": "That room already has three GMs.",
      "no-room": "No room with that code.",
      "already-started": "That draft has already started.",
      "sign-in": "Sign in first — a room is a list of people.",
      "board-cannot-field-three-teams": "That class cannot field three legal teams.",
      "board-too-small": "That class is too small for three GMs."
    };
    return (r && m[r.why]) || (r && r.detail) || "That did not work.";
  }

  /* ---------- the draft ---------- */
  function stopPoll() { if (S && S.poll) { clearTimeout(S.poll); S.poll = null; } }
  function poll(first) {
    if (!S) return;
    var url = "/api/room?id=" + encodeURIComponent(S.id) + (S.board ? "" : "&board=1");
    api("GET", url).then(function (v) {
      if (!S) return;
      if (!v || !v.ok) { renderLobby(why(v)); return; }
      if (!S.board && v.board) { try { S.board = JSON.parse(v.board); } catch (e) {} }
      if (v.seat != null) S.seat = v.seat;
      S.view = v;
      renderRoom();
      stopPoll();
      if (!v.done) S.poll = setTimeout(poll, POLL_MS);
    });
    if (first) draw(head("Draft room") + '<div class="rs-scroll"><p class="acct-p">Opening…</p></div>');
  }

  function taken(v) {
    var t = {};
    (v.moves || []).forEach(function (m) { t[m.player] = m.seat; });
    return t;
  }
  function openAt(roster, slot) {
    var caps = { G: 2, F: 2, C: 1 }, used = 0;
    (roster || []).forEach(function (p) { if (p.slot === slot) used++; });
    return caps[slot] - used;
  }

  function renderRoom() {
    var v = S.view, mine = S.seat, yours = v.turn === mine && !v.done;
    var secs = v.deadline ? Math.max(0, Math.round((v.deadline - v.now) / 1000)) : null;
    var tk = taken(v);

    var hdr = '<p class="acct-p">Room <b>' + esc(v.id) + "</b> · " + esc(v.cls) + " · " +
      esc(v.diff) + " · " + esc(v.pace || "") + "</p>" +
      '<p class="acct-fine">' + (v.members || []).length + " of " + v.seats + " seats · you are seat " +
      (mine == null ? "—" : mine + 1) + "</p>";

    if ((v.members || []).length < v.seats) {
      draw(head("Draft room") + '<div class="rs-scroll">' + hdr +
        '<p class="acct-p">Waiting for ' + (v.seats - v.members.length) + " more. Share the code: <b>" +
        esc(v.id) + "</b></p></div>");
      return;
    }

    var turnLine = v.done
      ? '<p class="acct-p"><b>The draft is done.</b></p>'
      : '<p class="acct-p">' + (yours ? "<b>Your pick</b>" : "Seat " + (v.turn + 1) + " is on the clock") +
        " · pick " + (v.at + 1) + " of 15" +
        (secs != null ? " · " + secs + "s" : "") + "</p>";

    var rosters = '<div class="rm-rosters">' + (v.rosters || []).map(function (r, i) {
      return '<p class="acct-fine"><b>Seat ' + (i + 1) + (i === mine ? " (you)" : "") + "</b>: " +
        (r.length ? r.map(function (p) { return esc(p.player) + " " + p.season + " (" + p.slot + ")"; }).join(", ")
                  : "—") + "</p>";
    }).join("") + "</div>";

    var log = (v.moves || []).slice(-4).reverse().map(function (m) {
      return '<p class="acct-fine">' + (m.seq + 1) + ". seat " + (m.seat + 1) + " — " + esc(m.player) +
        " " + m.season + (m.auto ? " (the clock picked)" : "") + "</p>";
    }).join("");

    var list = "";
    if (yours && S.board) {
      var rows = [];
      S.board.p.forEach(function (p) {
        if (tk[p.n] != null) return;
        p.s.forEach(function (sn) {
          sn[1].split("").forEach(function (slot) {
            if (openAt(v.rosters[mine], slot) <= 0) return;
            rows.push({ n: p.n, season: sn[0], slot: slot, v: p.v || 0 });
          });
        });
      });
      rows.sort(function (a, b) { return (b.v - a.v) || (a.n < b.n ? -1 : 1); });
      list = '<ol class="lb-list">' + rows.slice(0, 60).map(function (r) {
        return '<li class="lb-row"><span class="lb-name">' + esc(r.n) + " " + r.season + "</span>" +
          '<span class="lb-score"><button class="t-btn" data-kind="quiet" data-size="sm" data-pick="' +
          esc(r.n) + "|" + r.season + "|" + r.slot + '" type="button">' + r.slot + "</button></span></li>";
      }).join("") + "</ol>";
      if (!rows.length) list = '<p class="acct-p">No legal pick left for your roster.</p>';
    }

    draw(head("Draft room") + '<div class="rs-scroll">' + hdr + turnLine + rosters +
         (log ? '<hr>' + log : "") + (list ? '<hr>' + list : "") + "</div>");

    sheet().querySelectorAll("[data-pick]").forEach(function (b) {
      b.addEventListener("click", function () {
        var bits = b.getAttribute("data-pick").split("|");
        sheet().querySelectorAll("[data-pick]").forEach(function (x) { x.disabled = true; });
        stopPoll();
        api("POST", "/api/room?op=move", {
          id: S.id, seq: S.view.at, player: bits[0], season: +bits[1], slot: bits[2]
        }).then(function (r) {
          /* `behind` is not an error: somebody (or the clock) moved first.
             Redraw from the truth and carry on. */
          if (r && !r.ok && r.why !== "behind" && r.detail) {
            var p = document.createElement("p");
            p.className = "acct-fine"; p.textContent = r.detail;
            sheet().appendChild(p);
          }
          poll();
        });
      });
    });
  }

  /* ---------- the way in ---------- */
  function open() { if (laneOn()) renderLobby(); }
  function door() {
    try {
      if (!laneOn() || document.getElementById("rmTestDoor")) return;
      var bar = document.getElementById("lbTestDoor");
      if (!bar) return;
      var sep = document.createTextNode(" · ");
      var a = document.createElement("a");
      a.href = "#"; a.id = "rmTestDoor"; a.textContent = "Draft room";
      a.addEventListener("click", function (e) { e.preventDefault(); open(); });
      bar.appendChild(sep); bar.appendChild(a);
    } catch (e) {}
  }
  function boot() { setTimeout(door, 0); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  g.T82RM = { open: open, close: close };
})(typeof globalThis !== "undefined" ? globalThis : this);
