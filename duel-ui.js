/* TRUE 82 — duel-ui.js: the Duel Draft screen (Phase D2).
   ─────────────────────────────────────────────────────────────────────────────
   A correspondence client over duel-core + /api/match*. The rendering law
   mirrors the server's validation law: the client REBUILDS the match from
   (mode, seed, ops) via T82DUEL.replayMatch on every state change and renders
   that — the same state machine that validates the move draws the screen, so
   they cannot disagree. GETs poll with If-None-Match every 5s while the tab
   is visible (304s are near-free); any successful action forces a truth
   refetch. `why:"raced"` self-heals the same way (RUNBOOK row exists).

   Entry points: T82DUI.route(id) — from boot's ?duel=<id> routing;
   T82DUI.lobby() — create-a-duel flow from the intro. T82DUI.stop() kills the
   poll (renderIntro calls it). Depends on globals: el/app/esc (app.js),
   CRESTS (app.js), T82, T82DUEL, T82ACC. Everything fail-soft. */
(function (g) {
  "use strict";

  var DUI = { id: null, meta: null, M: null, etag: null, timer: null, busy: false, armResign: false };
  var POLL_MS = 5000;

  function authed(url, opts) {
    opts = opts || {};
    return g.T82ACC.token().then(function (tok) {
      opts.headers = opts.headers || {};
      if (tok) opts.headers.authorization = "Bearer " + tok;
      if (opts.body && !opts.headers["content-type"]) opts.headers["content-type"] = "application/json";
      return fetch(url, opts);
    });
  }

  function toast(msg) {
    var t = document.createElement("div");
    t.className = "duel-toast"; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add("on"); }, 10);
    setTimeout(function () { t.classList.remove("on"); setTimeout(function () { t.remove(); }, 300); }, 2200);
  }

  // ---- data loop ----
  function fetchMatch(force) {
    var opts = { headers: {} };
    if (!force && DUI.etag) opts.headers["if-none-match"] = DUI.etag;
    return authed("/api/match/" + DUI.id, opts).then(function (r) {
      if (r.status === 304) return null;                       // nothing changed
      DUI.etag = r.headers.get("etag");
      return r.json();
    }).catch(function () { return { ok: false, why: "network" }; });
  }
  function rebuild(meta) {
    DUI.meta = meta;
    DUI.M = null;
    if (meta.ok && meta.seed != null) {
      var rp = g.T82DUEL.replayMatch({ mode: meta.mode, seed: meta.seed, ops: meta.ops || [] });
      if (rp.ok) DUI.M = rp.M;
    }
  }
  function refresh(force) {
    return fetchMatch(force).then(function (meta) {
      if (meta === null) return;                                // 304
      rebuild(meta);
      render();
    });
  }
  function schedule() {
    clearTimeout(DUI.timer);
    DUI.timer = setTimeout(function () {
      if (!DUI.id) return;
      var live = DUI.meta && (DUI.meta.status === "active" || DUI.meta.status === "open");
      if (live && document.visibilityState === "visible") refresh(false).then(schedule);
      else schedule();
    }, POLL_MS);
  }
  function stop() { clearTimeout(DUI.timer); DUI.id = null; DUI.etag = null; DUI.meta = null; DUI.M = null; }

  function act(action, body) {
    if (DUI.busy) return;
    DUI.busy = true;
    authed("/api/match/" + DUI.id + "/" + action, { method: "POST", body: JSON.stringify(body || {}) })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        DUI.busy = false;
        if (res && res.ok) {
          if (action === "rematch" && res.id) {                 // walk into the new match, roles swapped
            history.replaceState(null, "", "?duel=" + res.id);
            DUI.id = res.id; DUI.etag = null;
            toast("Rematch on — their move first.");
          }
          return refresh(true);
        }
        var why = (res && res.why) || "network";
        if (why === "raced" || why.slice(0, 13) === "state-corrupt") { toast("Board moved — resyncing"); return refresh(true); }
        if (why === "not-your-turn") { toast("Not your move"); return refresh(true); }
        if (why === "quip-throttle") { toast("One quip per turn"); return; }
        toast("Nope: " + why);
      })
      .catch(function () { DUI.busy = false; toast("Network hiccup — try again"); });
  }

  // ---- shells ----
  function shell(inner) {
    app().innerHTML =
      '<section class="ticket duel">' +
        '<div class="duel-top"><button class="startover-btn" id="duelBack" type="button">\u2039 Go 82\u20130</button></div>' +
        inner +
      "</section>";
    var back = el("duelBack");
    if (back) back.addEventListener("click", function () { stop(); history.replaceState(null, "", location.pathname); renderIntro(); });
  }
  function card(title, body, actionsHtml) {
    shell('<h2 class="duel-h">' + esc(title) + "</h2>" + body + (actionsHtml || ""));
  }

  // ---- screens ----
  function route(id) {
    stop();
    DUI.id = id;
    shell('<p class="duel-wait">Loading the table\u2026</p>');
    g.T82ACC.initClerk().then(function () {
      refresh(true).then(schedule);
    });
  }

  function lobby() {
    shell(
      '<h2 class="duel-h">\u2694\uFE0F Duel a friend</h2>' +
      '<p class="duel-sub">One shared table. Strict alternation. One jersey per person \u2014 for both of you. Correspondence pace: rapid-fire or weeks apart.</p>' +
      '<button class="btn btn-primary btn-block presti-spin" id="duelClassic">\uD83C\uDFC0 Classic duel</button>' +
      '<button class="btn btn-primary btn-block presti-spin" id="duelCap">\uD83D\uDC10 Presti duel \u00B7 independent $50 caps</button>' +
      '<p class="duel-fine">You create, they get the link, you move first. Rematch swaps it.</p>'
    );
    function create(mode) {
      authed("/api/match", { method: "POST", body: JSON.stringify({ mode: mode }) })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (!res || !res.ok) {
            if (res && res.why === "auth") return signInCard("Sign in to start a duel");
            return toast("Couldn't create: " + ((res && res.why) || "network"));
          }
          history.pushState(null, "", "?duel=" + res.id);
          route(res.id);
        })
        .catch(function () { toast("Network hiccup — try again"); });
    }
    el("duelClassic").addEventListener("click", function () { create("classic"); });
    el("duelCap").addEventListener("click", function () { create("cap"); });
  }

  function signInCard(msg) {
    card(msg, '<p class="duel-sub">Duels ride on your GM tag \u2014 takes ten seconds.</p>',
      '<button class="btn btn-primary btn-block" id="duelSignIn">Sign in</button>');
    el("duelSignIn").addEventListener("click", function () { g.T82ACC.signIn(); });
  }

  function shareCard() {
    var link = "https://true82.net/?duel=" + DUI.id;
    card("Waiting for your rival",
      '<p class="duel-sub">Send this \u2014 the link is the invite:</p>' +
      '<p class="duel-link" id="duelLink">' + esc(link) + "</p>",
      '<button class="btn btn-primary btn-block" id="duelCopy">Copy link</button>');
    el("duelCopy").addEventListener("click", function () {
      var done = function () { toast("Copied"); };
      if (navigator.share) navigator.share({ title: "TRUE 82 duel", url: link }).then(done).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(link).then(done).catch(function () { prompt("Copy:", link); });
      else prompt("Copy:", link);
    });
  }

  function joinCard() {
    var m = DUI.meta;
    card("You've been challenged",
      '<p class="duel-sub">' + esc((m.opponent && m.opponent.tag) ? "GM " + m.opponent.tag : "A rival") +
      " wants a " + (m.mode === "cap" ? "Presti" : "Classic") + " duel. One table, alternating picks, one jersey per person.</p>",
      '<button class="btn btn-primary btn-block presti-spin" id="duelJoin">Join the duel</button>');
    el("duelJoin").addEventListener("click", function () { act("join"); });
  }

  // ---- the match screen ----
  function oppLabel() {
    var o = DUI.meta.opponent;
    return o && o.tag ? "GM " + o.tag : "your rival";
  }
  function myQuipUsedThisTurn() {
    var m = DUI.meta, turnIdx = (m.ops || []).length;
    return (m.quips || []).some(function (q) { return q.u === m.youAre && q.turnIdx === turnIdx; });
  }
  function rosterCol(idx, label) {
    var M = DUI.M, P = M.players[idx];
    var rows = P.picks.map(function (p) {
      var yr = "\u2019" + String(p.row[g.T82.t.IDX.season]).slice(2);
      return '<div class="duel-rrow"><b>' + esc(p.slot) + "</b> " + esc(p.row[g.T82.t.IDX.name]) + " " + yr +
        (M.mode === "cap" && p.cost != null ? ' <span class="duel-cost">$' + p.cost + "</span>" : "") + "</div>";
    }).join("");
    for (var i = P.picks.length; i < 5; i++) rows += '<div class="duel-rrow open">\u2014</div>';
    var meta = M.mode === "cap"
      ? "$" + P.budget + " left"
      : P.teamSkips + "+" + P.eraSkips + " skips";
    return '<div class="duel-col"><p class="eyebrow">' + esc(label) + '</p>' + rows +
      '<p class="duel-colmeta">' + esc(meta) + "</p></div>";
  }

  function render() {
    var m = DUI.meta;
    if (!DUI.id) return;
    if (!m || !m.ok) {
      if (m && m.why === "auth") return signInCard("Sign in to open this duel");
      if (m && m.why === "no-match") return card("No such duel", '<p class="duel-sub">The link may be mistyped \u2014 or the table got swept.</p>');
      if (m && m.why === "not-in-match") return card("Private table", '<p class="duel-sub">This duel already has its two GMs.</p>');
      return card("Can't reach the table", '<p class="duel-sub">Network trouble \u2014 it retries on its own.</p>');
    }
    if (m.status === "open") return m.youAre === 0 ? shareCard() : joinCard();
    var M = DUI.M;
    if (!M) return card("Corrupted table", '<p class="duel-sub">This match no longer replays \u2014 likely a core version change. It stays in the record books as-is.</p>');

    var live = m.status === "active";
    var mover = M.turn, mine = m.youAre === mover && live;
    var S = M.S;

    // header + banner
    var modeChip = m.mode === "cap" ? "PRESTI DUEL" : m.mode.toUpperCase() + " DUEL";
    var banner;
    if (live) banner = mine
      ? '<div class="duel-banner you">YOUR MOVE</div>'
      : '<div class="duel-banner them">Waiting for ' + esc(oppLabel()) + '\u2026</div>';
    else {
      var meW = M.result ? M.result[m.youAre] : null, thW = M.result ? M.result[1 - m.youAre] : null;
      var verdict;
      if (m.status === "complete") {
        if (M.winner === null) verdict = (meW && meW.wins >= 82 && thW && thW.wins >= 82) ? "\uD83C\uDFC6\uD83C\uDFC6 CO-IMMORTALS" : "DRAW";
        else verdict = M.winner === m.youAre ? "\uD83C\uDFC6 YOU WIN" : esc(oppLabel()).toUpperCase() + " WINS";
      } else if (m.status === "resigned") {
        verdict = m.youWon === true ? "THEY RESIGNED \u2014 YOU WIN" : m.youWon === false ? "YOU RESIGNED" : "RESIGNED";
      } else if (m.status === "archived") {
        verdict = m.youWon === true ? "WON BY FORFEIT" : m.youWon === false ? "LOST BY FORFEIT" : "ARCHIVED";
      } else verdict = esc(String(m.status).toUpperCase());
      banner = '<div class="duel-banner done">' + verdict +
        (meW ? '<span class="duel-line">You ' + meW.wins + "\u2013" + meW.losses +
          (thW ? " \u00B7 " + esc(oppLabel()) + " " + thW.wins + "\u2013" + thW.losses : "") + "</span>" : "") + "</div>";
    }

    // board card
    var crest = (g.CRESTS || {})[S.cur.fr + "|" + S.cur.dec];
    var board = live
      ? '<div class="duel-board">' +
          (crest ? '<img class="duel-crest" alt="" src="' + crest + '">' : "") +
          '<div><b>' + esc(S.cur.fr) + "</b> \u00B7 " + S.cur.dec + "s" +
          (S.fireSale ? ' <span class="duel-fire">\uD83D\uDD25 FIRE SALE</span>' : "") + "</div></div>"
      : "";

    // ticket rows (the mover's board — shared table, no hidden info)
    var rowsHtml = "";
    if (live) {
      var list = g.T82DUEL.draftable(M, mover);
      if (list.length) {
        rowsHtml = '<div class="duel-pool">' + list.map(function (r, i) {
          var years = r.seasons.length > 1
            ? '<select class="year-sel duel-year" data-i="' + i + '">' + r.seasons.map(function (y) {
                return '<option value="' + y + '"' + (y === r.season ? " selected" : "") + ">\u2019" + String(y).slice(2) + "</option>";
              }).join("") + "</select>"
            : '<span class="duel-yr">\u2019' + String(r.season).slice(2) + "</span>";
          var cost = r.cost != null ? '<span class="duel-cost">$' + r.cost + "</span>" : "";
          var slots = mine ? r.slots.map(function (sl) {
            return '<button class="duel-slot" data-i="' + i + '" data-slot="' + sl + '">' + sl + "</button>";
          }).join("") : "";
          return '<div class="duel-prow"><span class="duel-pname">' + esc(r.name) + "</span>" + years + cost +
            '<span class="duel-slots">' + slots + "</span></div>";
        }).join("") + "</div>";
      } else {
        rowsHtml = '<p class="duel-sub">' + (mine
          ? "No legal pick on this board for you."
          : "No legal pick here for " + esc(oppLabel()) + ".") + "</p>";
      }
      DUI._list = list;
    }

    // action row
    var actions = "";
    if (mine) {
      var skipLabel = M.mode === "cap" ? " \u00B7 $1" : "";
      var canTeam = M.mode === "cap" ? S.budget > 1 : M.players[mover].teamSkips > 0;
      var canEra = M.mode === "cap" ? S.budget > 1 : M.players[mover].eraSkips > 0;
      actions = '<div class="duel-actions">' +
        '<button class="btn duel-act" id="duelSkipT"' + (canTeam ? "" : " disabled") + ">Skip team" + skipLabel + "</button>" +
        '<button class="btn duel-act" id="duelSkipE"' + (canEra ? "" : " disabled") + ">Skip era" + skipLabel + "</button>" +
        (M.mode === "cap" ? '<button class="btn duel-act" id="duelSkipY">Skip yrs \u00B7 $1</button>' : "") +
        (DUI._list && DUI._list.length === 0 ? '<button class="btn btn-primary duel-act" id="duelFS">FORCED SKIP \u00B7 free</button>' : "") +
        "</div>";
    }

    // quips
    var feed = (m.quips || []).slice(-4).map(function (q) {
      var who = q.u === m.youAre ? "You" : oppLabel();
      return '<div class="duel-quip"><b>' + esc(who) + ":</b> \u201C" + esc(g.T82DUEL.QUIPS[q.qid] || "\u2026") + "\u201D</div>";
    }).join("");
    var quipBar = live
      ? '<div class="duel-quips">' + feed +
          (myQuipUsedThisTurn()
            ? '<p class="duel-fine">Quip spent \u2014 next turn.</p>'
            : '<button class="startover-btn" id="duelQuipBtn" type="button">\uD83D\uDCAC Talk trash</button><div class="duel-qgrid" id="duelQGrid" hidden></div>')
        + "</div>"
      : (feed ? '<div class="duel-quips">' + feed + "</div>" : "");

    // terminal actions
    var terminal = "";
    if (!live) {
      terminal = '<div class="duel-actions">' +
        '<button class="btn btn-primary presti-spin duel-act" id="duelRematch">Rematch \u00B7 they move first</button></div>';
    }
    var resign = live ? '<p class="duel-fine"><button class="startover-btn" id="duelResign" type="button">' +
      (DUI.armResign ? "Tap again to resign" : "Resign") + "</button></p>" : "";

    shell(
      '<div class="duel-head"><span class="eyebrow">' + modeChip + "</span> <span class=\"duel-vs\">vs " + esc(oppLabel()) + "</span></div>" +
      banner + board + rowsHtml + actions +
      '<div class="duel-rosters">' + rosterCol(m.youAre, "You") + rosterCol(1 - m.youAre, oppLabel()) + "</div>" +
      quipBar + terminal + resign
    );

    // wire
    if (mine) {
      Array.prototype.forEach.call(document.querySelectorAll(".duel-slot"), function (b) {
        b.addEventListener("click", function () {
          var i = parseInt(b.getAttribute("data-i"), 10), r = DUI._list[i];
          var sel = document.querySelector('.duel-year[data-i="' + i + '"]');
          var season = sel ? parseInt(sel.value, 10) : r.season;
          act("move", { op: "k:" + r.name + "|" + season + "|" + b.getAttribute("data-slot") });
        });
      });
      var st = el("duelSkipT"), se = el("duelSkipE"), sy = el("duelSkipY"), fsb = el("duelFS");
      if (st) st.addEventListener("click", function () { act("move", { op: "st" }); });
      if (se) se.addEventListener("click", function () { act("move", { op: "se" }); });
      if (sy) sy.addEventListener("click", function () { act("move", { op: "yr" }); });
      if (fsb) fsb.addEventListener("click", function () { act("move", { op: "fs" }); });
    }
    var qb = el("duelQuipBtn");
    if (qb) qb.addEventListener("click", function () {
      var grid = el("duelQGrid");
      if (grid.hidden) {
        grid.innerHTML = g.T82DUEL.QUIPS.map(function (q, qi) {
          return '<button class="duel-qchip" data-q="' + qi + '">' + esc(q) + "</button>";
        }).join("");
        Array.prototype.forEach.call(grid.querySelectorAll(".duel-qchip"), function (b) {
          b.addEventListener("click", function () { act("quip", { qid: parseInt(b.getAttribute("data-q"), 10) }); });
        });
      }
      grid.hidden = !grid.hidden;
    });
    var rem = el("duelRematch");
    if (rem) rem.addEventListener("click", function () { act("rematch"); });
    var rs = el("duelResign");
    if (rs) rs.addEventListener("click", function () {
      if (!DUI.armResign) { DUI.armResign = true; render(); setTimeout(function () { DUI.armResign = false; }, 3000); return; }
      DUI.armResign = false;
      act("resign");
    });
  }

  g.T82DUI = { route: route, lobby: lobby, stop: stop };
})(typeof window !== "undefined" ? window : globalThis);
