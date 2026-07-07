/* TRUE 82 — arena-ui.js: the Arena (profile page, Phase D2b · spec §9/§15.1).
   ─────────────────────────────────────────────────────────────────────────────
   One screen, zero polish debt, everything fail-soft PER SECTION: the five
   data fetches (/api/me, three /api/lb boards, /api/weekly) run in parallel
   and each section renders independently — a dead board strip never blanks
   the banner. Anonymous visitors get the global boards plus a sign-in card
   (with the local unclaimed-run count — the funnel); lb is public by design.
   Needs no site data, so the Arena opens instantly even before the big
   payload lands. Depends on globals: el/app/esc (app.js), T82ACC, T82DUI. */
(function (g) {
  "use strict";

  var A = { me: null, daily: null, weekly: null, immortals: null, wk: null, editing: false };

  function authed(url, opts) {
    opts = opts || {};
    return g.T82ACC.token().then(function (tok) {
      opts.headers = opts.headers || {};
      if (tok) opts.headers.authorization = "Bearer " + tok;
      if (opts.body && !opts.headers["content-type"]) opts.headers["content-type"] = "application/json";
      return fetch(url, opts).then(function (r) { return r.json(); });
    }).catch(function () { return { ok: false, why: "network" }; });
  }

  function route() {
    if (g.T82DUI) g.T82DUI.stop();
    shell('<p class="duel-wait">Opening the Arena\u2026</p>');
    g.T82ACC.initClerk().then(function () {
      Promise.all([
        authed("/api/me"),
        authed("/api/lb?board=daily"),
        authed("/api/lb?board=weekly"),
        authed("/api/lb?board=immortals"),
        g.T82ACC.fetchWeekly()
      ]).then(function (r) {
        A.me = r[0]; A.daily = r[1]; A.weekly = r[2]; A.immortals = r[3]; A.wk = r[4];
        render();
      });
    });
  }

  function shell(inner) {
    app().innerHTML =
      '<section class="ticket arena">' +
        '<div class="duel-top"><button class="startover-btn" id="arenaBack" type="button">\u2039 Go 82\u20130</button></div>' +
        inner +
      "</section>";
    var b = el("arenaBack");
    if (b) b.addEventListener("click", function () { renderIntro(); });
  }

  // ---- pieces ----
  function bannerHtml() {
    var me = A.me;
    if (!me || !me.ok) return '<p class="duel-sub">The Arena desk is unreachable \u2014 boards below may still load.</p>';
    if (me.anonymous) {
      var n = (g.T82ACC.ledger() || []).length;
      return '<div class="arena-banner anon"><p class="arena-tag">GM \u2014\u2014\u2014\u2014</p>' +
        '<p class="duel-sub">Every run needs a name on it. Sign in to claim yours' +
        (n ? " \u2014 <b>" + n + " run" + (n === 1 ? "" : "s") + "</b> on this device waiting to count" : "") + ".</p>" +
        '<button class="btn btn-primary btn-block" id="arenaSignIn">Sign in</button></div>';
    }
    var u = me.user || {};
    var since = u.since ? new Date(u.since).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : null;
    var nameLine = A.editing
      ? '<span class="arena-editrow"><input class="arena-input" id="arenaNameInput" maxlength="24" value="' + esc(u.name || "") + '">' +
        '<button class="duel-slot" id="arenaNameSave">Save</button></span>'
      : '<span class="arena-name">' + esc(u.name || "Unnamed GM") +
        ' <button class="startover-btn arena-pencil" id="arenaNameEdit" type="button">\u270E</button></span>';
    var chips = [];
    if (me.yourMove) chips.push("\u2694\uFE0F " + me.yourMove + " duel" + (me.yourMove === 1 ? "" : "s") + " on your move");
    if (since) chips.push("GM since " + since);
    return '<div class="arena-banner"><p class="arena-tag">GM ' + esc(u.tag || "????") + "</p>" + nameLine +
      (chips.length ? '<p class="arena-chips">' + chips.map(esc).join(" \u00B7 ") + "</p>" : "");
  }

  function fmtRow(r, i) {
    var who = "GM " + esc(r.tag || "????") + (r.name ? " \u00B7 " + esc(r.name) : "");
    var val = r.metric != null ? "\u00D7 " + r.metric
      : (r.wins != null ? r.wins + "\u2013" + (82 - r.wins) + (r.net != null ? " \u00B7 " + (r.net >= 0 ? "+" : "") + Number(r.net).toFixed(1) : "") : "");
    return '<div class="arena-lbrow"><span class="arena-rank">' + (r.rank || i + 1) + "</span><span class=\"arena-who\">" + who +
      '</span><span class="arena-val">' + val + "</span></div>";
  }
  function boardStrip(title, sub, b) {
    var body;
    if (!b || !b.ok) body = '<p class="duel-fine">Board unavailable.</p>';
    else if (!b.top || !b.top.length) body = '<p class="duel-fine">Nobody on this board yet. First mover advantage is real.</p>';
    else {
      body = b.top.slice(0, 3).map(fmtRow).join("");
      if (b.me && b.me.rank) body += '<p class="arena-merank">you: #' + b.me.rank +
        (b.me.outOf ? " of " + b.me.outOf : "") + (b.me.pct != null ? " \u00B7 top " + b.me.pct + "%" : "") + "</p>";
    }
    return '<div class="section arena-board"><p class="eyebrow">' + esc(title) + "</p>" +
      (sub ? '<p class="arena-boardsub">' + esc(sub) + "</p>" : "") + body + "</div>";
  }

  function ledgerHtml() {
    var me = A.me;
    if (!me || !me.ok || me.anonymous) return "";
    var agg = (me.aggregates && me.aggregates.byMode) || [];
    var rows = agg.filter(function (m) { return m.mode !== "kaman"; }).map(function (m) {
      var label = m.mode === "cap" ? "Presti" : m.mode.charAt(0).toUpperCase() + m.mode.slice(1);
      return '<div class="arena-lbrow"><span class="arena-who">' + esc(label) + "</span>" +
        '<span class="arena-val">' + m.games + " run" + (m.games === 1 ? "" : "s") + " \u00B7 best " + m.best + "W</span></div>";
    }).join("");
    var picked = (me.mostPicked || []).map(function (p) { return esc(p.name) + " \u00D7" + p.n; }).join(" \u00B7 ");
    if (!rows && !picked) return "";
    return '<div class="section"><p class="eyebrow">Your ledger</p>' + rows +
      (picked ? '<p class="arena-picked">Most drafted: ' + picked + "</p>" : "") + "</div>";
  }

  function render() {
    var wkName = A.wk && A.wk.ok ? A.wk.name : null;
    shell(
      bannerHtml() +
      '<button class="btn btn-primary btn-block presti-spin arena-duelbtn" id="arenaDuel">\u2694\uFE0F Duel a friend</button>' +
      boardStrip("Today's board", null, A.daily) +
      boardStrip("This week" + (wkName ? " \u2014 " + wkName : ""), A.wk && A.wk.ok ? A.wk.blurb : null, A.weekly) +
      boardStrip("The Immortals", "most 82\u20130 seasons, all time", A.immortals) +
      ledgerHtml()
    );
    var si = el("arenaSignIn");
    if (si) si.addEventListener("click", function () { g.T82ACC.signIn(); });
    var duel = el("arenaDuel");
    if (duel) duel.addEventListener("click", function () { if (g.T82DUI) g.T82DUI.lobby(); });
    var ed = el("arenaNameEdit");
    if (ed) ed.addEventListener("click", function () { A.editing = true; render(); var inp = el("arenaNameInput"); if (inp) inp.focus(); });
    var sv = el("arenaNameSave");
    if (sv) sv.addEventListener("click", function () {
      var inp = el("arenaNameInput");
      var name = inp ? inp.value : "";
      authed("/api/name", { method: "POST", body: JSON.stringify({ name: name }) }).then(function (r) {
        A.editing = false;
        if (r && r.ok) {
          if (A.me && A.me.user) A.me.user.name = r.name;
          render();
        } else { render(); }
      });
    });
  }

  g.T82ARENA = { route: route };
})(typeof window !== "undefined" ? window : globalThis);
