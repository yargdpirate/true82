/* ---------- THE LEADERBOARD LAB: THE BOARDS (docs/leaderboard-lab/boards.js, v1) ----------
   LB.boards owns two things and nothing else: the SLATE (which boards exist, in which order, with
   which segments) and the MARKUP of the board sheet. It never touches the DOM, never reads
   LB.recipe, never fetches: lab.js hands it a recipe and a data object and gets back one HTML string.

   It renders the real components so the site's own CSS does the work. The sheet is the shared overlay
   (.rules-overlay / .rules-sheet.acct-sheet.plq-frame / .rs-head / .rs-title / .rs-close / .rs-scroll),
   the tabs are .lb-tabs > .lb-tab.tm-flat, the list is ol.lb-list > li.lb-row > .lb-rank / .lb-name /
   .lb-score, and your own row adds .lb-you. New parts use the names reserved in CONTRACT.md:
   .lb-crowd .lb-sub .lb-tag .lb-ghost .lb-window .lb-lead .lb-seg .lb-more .lb-chip .lb-empty.
   Everything finer than that is a data-* attribute, so looks.js can hook a part without us minting a
   class name that collides with its CSS.

   .tm-flat ON EVERY TAB IS LOAD-BEARING, NOT DECORATION. app.js's document-wide button decorator
   (BTN3D_EXCLUDE, app.js:780) adds .presti-spin to any <button> that is not excluded, and look.css's
   button.presti-spin rule is specificity-boosted with #lab-k#lab-k so it beats both .lb-tab and
   .lb-tab.on. Without tm-flat every tab renders as the same gold keycap, the selected one loses its
   accent border, and the only remaining signal is aria-selected. That is a live defect in the shipped
   sheet (SPEC.md, "Must fix" 2) and nothing in this lab can judge a tab until it is off.

   TWO SLATES, so the owner can flip and see what changed:
     "spec"     the seven boards SPEC.md argues for. Five front tabs (TODAY, MONTH, STREAK, 82-0, YOU);
                PRESTI BY COST sits behind the 82-0 tab as its second view; BEST NET and OUTDRAFTED
                are reached from the bottom of YOU. One control row, 44px tabs, nowrap.
     "shipped"  today's five, rendered the way accounts.js boardsHtml renders them, bugs included and
                marked in the comments, because the comparison is the whole point of having it here.

   WHAT lab.js WIRES (every control is a plain attribute on a plain element, no handlers in here):
     [data-board="<id>"]      set recipe.board to that id        (tabs, the 82-0 view switch, YOU's links)
     [data-around="1"|"0"]    set recipe.around                  (TODAY's "Around you" / "Top of the board")
     [data-scope="<id>"]      set recipe.scope                   (the one optional second row)
     select[data-mode]        display only: there is no mode key in the recipe, and CONTRACT.md says
                              those are all the keys there are. The select exists so the owner can judge
                              a mode picker INSIDE one board instead of a second row on every board.
   ES5, no libraries, no Math.random, no Date.now, no em-dashes. Everything here is deterministic from
   the recipe and the data it is handed. */
(function () {
  "use strict";
  var win = window;
  win.LB = win.LB || {};

  /* ---------------- small helpers ---------------- */

  /* Our own esc(), because every single piece of data that reaches a string here is interpolated and
     the fake rows contain apostrophes and a name with a space by design. */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fmtInt(n) {
    var s = String(Math.abs(Math.round(Number(n) || 0))), out = "", i;
    for (i = 0; i < s.length; i++) out += (i > 0 && (s.length - i) % 3 === 0 ? "," : "") + s.charAt(i);
    return (Number(n) < 0 ? "-" : "") + out;
  }
  function ordinal(n) {
    var v = Math.round(Number(n) || 0), t = v % 100, d = v % 10;
    var suf = (t >= 11 && t <= 13) ? "th" : d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th";
    return fmtInt(v) + suf;
  }
  function plural(n, pair) { return (Math.abs(Number(n) || 0) === 1 ? pair[0] : pair[1]); }
  function find(list, id) {
    var i;
    for (i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function has(list, v) {
    var i;
    for (i = 0; i < (list || []).length; i++) if (list[i] === v) return true;
    return false;
  }

  /* The percentile is a CEILING or it is nothing. Never a floor, never "bottom X%", and never at all
     under about 30 GMs, where "Top 3%" of 31 players is one person dressed up as precision. */
  function ceilingPct(rank, field) {
    if (!rank || !field || field < 30) return null;
    var pct = Math.ceil((rank / field) * 100);
    if (pct > 50) return null;
    return "Top " + Math.max(1, pct) + "%";
  }

  var MODE_NAME = { classic: "Classic", cap: "Presti", pro: "Pro" };
  var ALL_MODES = ["classic", "cap", "pro"];
  var SCOPE_NAME = { today: "Today", week: "This week", month: "This month", all: "All time" };

  /* ---------------- the spec slate: seven boards ----------------
     tab    the one word on the tab (CSS uppercases it). Five front tabs have to total one row at 320px.
     unit   what the field count counts, singular and plural: "4,412 GMs", "41 perfect seasons".
     ranked false on a membership list and on YOU: there is no rank integer to print, so the rank
            column stays empty and holds its 3.5ch so the names still line up.
     views  the two views behind ONE tab, switched by a text button in the list header. views[0] is the
            view when recipe.around is true, views[1] when it is false (no new recipe key).
     pair   a sibling BOARD id that shares this tab (the 82-0 Club and Presti by cost are one tab).
     behind the front board this one lives under, for the title and the back link (BEST NET, OUTDRAFTED).
     join   what would put YOU on this board, for the honest "not on it" sentence.
     fills  what fills the board, for the empty state. Never a countdown, never a date to beat. */
  var SPEC = [
    { id: "today", tab: "Today", title: "Today's board", front: true, ranked: true,
      unit: ["GM", "GMs"], scopes: [], modes: [], views: ["around", "top"], scoreSub: true,
      note: "One attempt a day. Everybody drafted the same five tickets, and the server replayed every row on this list.",
      join: "One season of today's Daily puts you on it.",
      fills: "A new board arrives every morning, so this one is never more than a day old." },

    { id: "month", tab: "Month", title: "This month", front: true, ranked: true,
      unit: ["GM", "GMs"], scopes: [], modes: [], views: [],
      note: "Your ten best Dailies this month, added up. A wrecked day is dropped, not counted. The total is always out of ten days, so a row reads 3 of 10 days until you have ten.",
      join: "The first Daily you finish this month starts your ten.",
      fills: "Ten days of Dailies is a full card, and a wrecked day is dropped rather than counted." },

    { id: "streak", tab: "Streak", title: "Daily streak", front: true, ranked: true,
      unit: ["GM", "GMs"], scopes: [], modes: [], views: [],
      /* The streak is a patch you earned, never a leash: the board states a count and attaches nothing
         to it. A lapsed streak just shows the new number, with no comment anywhere. */
      note: "Days in a row with a verified Daily. A count, and nothing hangs on it.",
      join: "Play a Daily and your streak reads 1 day.",
      fills: "Days in a row, counted off your verified Dailies. Nothing else goes into it." },

    { id: "club", tab: "82-0", title: "The 82-0 Club", front: true, ranked: false,
      unit: ["perfect season", "perfect seasons"], scopes: [], modes: [], views: [],
      pair: "cheapest", pairTab: "Presti by cost", chipSub: true,
      note: "Every verified 82-0 season, newest first. No ranking and no limit on members: the bar is the only thing you have to clear.",
      away: "You are not in the Club yet.", join: "One verified 82-0 season is the whole bar, in any mode.",
      fills: "Every mode counts here, and there is no limit on how many GMs get in." },

    { id: "cheapest", tab: "By cost", title: "Presti by cost", front: false, ranked: true,
      unit: ["GM", "GMs"], scopes: [], modes: [], views: [],
      behind: "club", pair: "club", pairTab: "All of the Club", backTo: "Back to the Club", scoreSub: true,
      note: "Least money spent on a verified 82-0 in Presti. Dailies and challenge boards are left out, so a fire sale day cannot own it. The cheapest anybody has managed is $38M.",
      join: "One verified 82-0 in Presti puts you on it, at whatever it cost you.",
      fills: "The Club list has every perfect season in it, priced or not." },

    { id: "you", tab: "You", title: "Your card", front: true, ranked: false, card: true,
      unit: ["", ""], scopes: [], modes: [], views: [],
      links: ["net", "outdrafted"],
      note: "Your own numbers. Nothing on this card is ranked against anybody.",
      join: "",
      fills: "" },

    { id: "net", tab: "Best net", title: "Best net", front: false, ranked: true,
      unit: ["GM", "GMs"], scopes: ["week", "month", "all"], scope: "month", modes: ALL_MODES, views: [],
      behind: "you", backTo: "Back to your card",
      note: "The average of a GM's three best net ratings in the span above, three seasons to qualify. Three good seasons, not one lucky night. Dailies are left out.",
      join: "Three finished seasons in this mode would put you on it.",
      fills: "Three seasons inside the span, and the best three of them are what count." },

    { id: "outdrafted", tab: "Outdrafted", title: "Outdrafted", front: false, ranked: true,
      unit: ["GM", "GMs"], scopes: ["week", "month", "all"], scope: "month", modes: ALL_MODES, views: [],
      behind: "you", backTo: "Back to your card",
      note: "How far your five beat the obvious five from the same tickets. Your best five seasons in the span above, averaged, five seasons to qualify.",
      join: "Five finished seasons in this mode in this span would put you on it.",
      fills: "It arrives after launch week, and it backfills every season already played." }
  ];

  /* ---------------- the shipped slate: today's five ----------------
     Rendered exactly as accounts.js boardsHtml renders them, including the three things SPEC.md says
     are wrong, because the owner cannot judge a change he cannot see next to the thing it replaces:
       1. the rate board costs EVERY board a second row of three mode tabs, both rows wrapping;
       2. a GM past the fetched page is told "You are not on this board yet";
       3. a signed-out player with a finished season is told nothing at all.
     The notes are lb.js's own note strings, word for word, except that one em-dash becomes a full stop:
     no string in this lab may carry one. */
  var SHIPPED = [
    { id: "today", tab: "Today", title: "Today's board", front: true, ranked: true, unit: ["GM", "GMs"],
      scopes: [], modes: [], views: [], note: "One attempt a day. The first one counts." },
    { id: "streak", tab: "Streak", title: "Daily streak", front: true, ranked: true, unit: ["GM", "GMs"],
      scopes: [], modes: [], views: [], note: "Longest run of consecutive Dailies played, verified." },
    { id: "rate", tab: "82-0 %", title: "82-0 rate", front: true, ranked: true, unit: ["GM", "GMs"],
      scopes: [], modes: ALL_MODES, views: [], minRuns: 10,
      note: "Share of ordinary seasons that went 82-0. Needs 10 seasons in the mode to qualify. Dailies have their own boards." },
    { id: "cheapest", tab: "Cheapest", title: "Cheapest 82-0", front: true, ranked: true, unit: ["GM", "GMs"],
      scopes: [], modes: [], views: [], note: "Least money spent on a perfect Presti season." },
    { id: "net", tab: "Best net", title: "Best net rating", front: true, ranked: true, unit: ["GM", "GMs"],
      scopes: [], modes: [], views: [], note: "Highest net rating on a Classic season." }
  ];

  /* ---------------- the slate ---------------- */

  function slate(recipe) {
    recipe = recipe || {};
    var list = recipe.slate === "shipped" ? SHIPPED : SPEC;
    var def = find(list, recipe.board) || list[0];
    return { list: list, front: frontOf(list), def: def, id: def.id, shipped: list === SHIPPED };
  }
  function frontOf(list) {
    var out = [], i;
    for (i = 0; i < list.length; i++) if (list[i].front) out.push(list[i]);
    return out;
  }
  /* Which scope is live: the recipe's, if this board offers it, else the board's own default. */
  function scopeOf(def, recipe) {
    if (!def.scopes || def.scopes.length < 2) return def.scope || (def.scopes || [])[0] || null;
    if (has(def.scopes, recipe.scope)) return recipe.scope;
    return def.scope || def.scopes[0];
  }

  /* ---------------- the two-control-row rule ----------------
     AT MOST TWO ROWS OF CONTROLS, EVER, AND WHY IT IS A RULE AND NOT A PREFERENCE.

     The sheet is 88vh tall and the head eats 44px of it. At 320px the content column is about 292px
     wide, and .lb-tabs wraps, so every control that will not fit becomes a whole new line above the
     first rank. Today's sheet spends five board tabs AND three mode tabs on that column and reaches
     three lines of controls before a single rank is visible: the owner's complaint about clutter is
     measurable, not a matter of taste. A board you have to scroll to read is a board nobody reads, and
     on the one morning this feature exists for (10/20, a link from a video, a cold phone) the first
     screen is the only screen.

     So the budget is two rows and both have to earn it:
       row 1  THE TABS. They earn it because they are how you leave the board you are on. Five labels,
              nowrap, 44px tall (Apple asks 44, Material asks 48; 32px with a 6px gap on five adjacent
              controls is where mis-taps live). Five is the ceiling, and raising the height is only
              affordable because there is one row instead of two.
       row 2  THE SCOPE SEGMENT, and only on the boards where the window genuinely changes the answer
              (BEST NET and OUTDRAFTED: 30 days or all time is the whole argument about them). A board
              with one scope gets no row.

     Everything else is not allowed a row:
       a second VIEW of the same board  -> one text button in the list header (.lb-more), labelled with
                                           where it goes rather than what is selected.
       the three MODES                  -> a <select> inside the two boards that need it, plus a chip on
                                           the row in the 82-0 Club. Three modes serving one board must
                                           never cost every board a row.
       getting BACK from a board behind -> one text button under the note.
     If a new axis ever appears, it becomes a chip or a text button, or it does not ship. */

  function tabsHtml(sl, recipe) {
    var selected = sl.def.front ? sl.def.id : (sl.def.pair || sl.def.behind || sl.def.id);   /* a board behind another lights its parent tab, never nothing */
    /* Inline layout only, no colour: nowrap is the thing SPEC.md asks the lab to PROVE at 320px, and
       44px is the tap target it argues for. The shipped slate keeps its wrapping 32px tabs so the two
       sit side by side. Layout and size are free here; colour and type are tokens or nothing. */
    /* NOT nowrap. .lb-tab is white-space: nowrap with no flex property, so a five-tab
       row cannot shrink OR wrap and .rs-scroll turns it into a horizontal scroller at
       320px, which hides the last tab behind a gesture nobody is told about. Wrapping
       to two short rows is the honest failure. */
    var fit = sl.shipped ? "" : ' style="flex-wrap:wrap"';
    var tall = sl.shipped ? "" : ' style="min-height:44px"';
    return '<div class="lb-tabs" role="tablist" aria-label="Boards"' + fit + '>' +
      sl.front.map(function (b) {
        var on = b.id === selected;
        return '<button class="lb-tab tm-flat' + (on ? " on" : "") + '" type="button" role="tab"' +
          ' aria-selected="' + (on ? "true" : "false") + '" data-board="' + esc(b.id) + '"' + tall + '>' +
          esc(b.tab) + '</button>';
      }).join("") + '</div>';
  }

  /* The second row, where a board has earned one. Reuses .lb-tabs for its layout and marks itself
     .lb-seg, the way the shipped sheet marks its mode row .lb-modes. */
  function segHtml(def, recipe) {
    if (!def.scopes || def.scopes.length < 2) return "";
    var live = scopeOf(def, recipe);
    return '<div class="lb-tabs lb-seg" role="group" aria-label="Window">' +
      def.scopes.map(function (s) {
        var on = s === live;
        return '<button class="lb-tab tm-flat' + (on ? " on" : "") + '" type="button"' +
          ' aria-pressed="' + (on ? "true" : "false") + '" data-scope="' + esc(s) + '"' +
          ' style="min-height:44px">' + esc(SCOPE_NAME[s] || s) + '</button>';
      }).join("") + '</div>';
  }

  /* A text button. The label says where it goes, not what is selected, so one tap needs no reading. */
  function moreBtn(label, attrs) {
    return '<button class="t-btn tm-flat lb-more" data-kind="text" type="button" ' + attrs + '>' +
      esc(label) + '</button>';
  }

  /* The list's own header line: the denominator on the left, the one switch on the right. This is the
     line that saves a whole control row, so it holds at most two things. */
  function leadStyle(how) {
    return ' style="display:flex;align-items:baseline;gap:10px;width:100%;justify-content:' + how + '"';
  }

  function leadHtml(def, recipe, data, showCount) {
    var left = "", right = "";
    if (showCount && data && data.field) left = fmtInt(data.field) + " " + plural(data.field, def.unit);

    if (def.views && def.views.length === 2) {
      /* TODAY: one tap between the window on you and the top of the board. */
      right = recipe.around
        ? moreBtn("Top of the board", 'data-around="0"')
        : moreBtn("Around you", 'data-around="1"');
    } else if (def.pair) {
      right = moreBtn(def.pairTab, 'data-board="' + esc(def.pair) + '"');
    } else if (def.modes && def.modes.length > 1) {
      /* The three modes live HERE, inside the one board that needs them. Not a row. */
      right = '<select class="acct-input lb-chip" data-mode aria-label="Mode"' +
        // 16px and 44px are not taste: iOS Safari zooms the whole viewport when a
        // form control under 16px is tapped, which ends the 320px test the owner is
        // running. lab.css states the same rule for the console's own controls.
        ' style="width:auto;min-height:44px;padding:4px 8px;font-size:16px">' +
        def.modes.map(function (m) {
          return '<option value="' + esc(m) + '"' + (m === "classic" ? " selected" : "") + '>' +
            esc(MODE_NAME[m] || m) + '</option>';
        }).join("") + '</select>';
    }
    if (!left && !right) return "";
    return '<div class="lb-lead" data-part="head"' + leadStyle(left ? "space-between" : "flex-end") + '>' +
      (left ? '<span class="lb-sub t-meta">' + esc(left) + '</span>' : "") + right + '</div>';
  }

  /* ---------------- rows ---------------- */

  /* Which display names appear more than once. This is why the #TAG toggle exists: two GMs who both
     called themselves Gray are indistinguishable to everyone but themselves, and auth.js stores the
     default name as the literal "GM-" + tag, so a player can take another player's default byte for
     byte. The owner's call was to print the tag on your own row always and on any name that repeats,
     which is what this does rather than tagging all 82 rows. */
  function dupeNames(rows) {
    var seen = {}, dupe = {}, i, k;
    for (i = 0; i < rows.length; i++) {
      k = String(rows[i].name == null ? "" : rows[i].name).toLowerCase();
      if (seen[k]) dupe[k] = true; else seen[k] = true;
    }
    return dupe;
  }

  function rowHtml(r, ctx) {
    var mine = !!r.you;
    var ghost = mine && !ctx.signedIn;                /* yours, but no name is on the board yet */
    var cls = "lb-row" + (mine ? (ghost ? " lb-ghost" : " lb-you") : "");
    var key = String(r.name == null ? "" : r.name).toLowerCase();
    var name = ghost ? "Your season" : r.name;
    /* A ghost row is a player with no account, so it has no tag: the tag is minted
       by the server when the account is made (auth.js makeTag). Printing one beside
       "Your season" would advertise the exact thing the row is asking them to go and
       get. */
    var tag = !ghost && ctx.showTag && r.tag && (mine || ctx.dupe[key]) ? r.tag : null;
    var chip = r.chip || r.mode || (ctx.chipSub ? r.sub : null);
    /* THE SCORE COLUMN IS THE RECORD, ALWAYS. Where data.js sends a second number that qualifies the
       score itself (the net tie-break on a Daily, the cap left on a cheapest row), it belongs in the
       score column after a middle dot, not beside the name: on a Daily nine rows read 81-1 and the
       tie-break is the only thing telling them apart, so it has to sit where the eye already is. A sub
       that qualifies the GM instead ("3 of 10 days") stays beside the name. */
    var sub = (ctx.chipSub || ctx.scoreSub) ? null : r.sub;
    var score = ctx.scoreSub && r.sub ? r.score + " \u00B7 " + r.sub : r.score;
    return '<li class="' + cls + '"' + (mine ? ' data-row="' + (ghost ? "ghost" : "you") + '"' : "") + '>' +
      '<span class="lb-rank">' + (ctx.ranked ? esc(r.rank) : "") + '</span>' +
      '<span class="lb-name">' + esc(name) +
        (tag ? ' <span class="lb-tag t-meta">#' + esc(tag) + '</span>' : "") +
        (chip ? ' <span class="t-chip lb-chip" data-size="sm" data-tone="plain">' + esc(chip) + '</span>' : "") +
        (sub ? ' <span class="lb-sub t-meta">' + esc(sub) + '</span>' : "") +
      '</span>' +
      '<span class="lb-score">' + esc(score) + '</span></li>';
  }

  /* The gap between two ranks that are not neighbours. Stated as a count of GMs, never as a distance
     to close: it is there so the window does not pretend rank 2 sits under rank 1. */
  function gapHtml(n) {
    return '<li class="lb-row" data-row="gap">' +
      '<span class="lb-rank">…</span>' +
      '<span class="lb-name"><span class="lb-sub t-meta">' + fmtInt(n) + " " +
        plural(n, ["GM", "GMs"]) + ' between</span></span>' +
      '<span class="lb-score"></span></li>';
  }

  /* THE AROUND YOU WINDOW is one list, not two: the leader is the first row, the gap row says what is
     skipped, and the window follows. data.js builds that sequence (leader pinned, then the rows either
     side of you), so the gap is read off the ranks themselves and the window works the same way
     whatever the shape of the slice. */
  function listHtml(def, recipe, data, ctx) {
    var rows = data.rows || [], out = [], prev = null, i, r;
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      if (r.you && !ctx.signedIn && !recipe.hasRun) continue;   /* no run, so no row: never invent one */
      if (ctx.ranked && prev != null && r.rank > prev + 1) out.push(gapHtml(r.rank - prev - 1));
      out.push(rowHtml(r, ctx));
      prev = ctx.ranked ? r.rank : null;
    }
    /* Derived from the rows actually emitted, never from the recipe: data.js windows
       every ranked board, not only the ones with two views, and looks.js reads the
       ABSENCE of .lb-window as "this list starts at rank 1". Computing it from the
       recipe made the two disagree on most boards. */
    var windowed = ctx.ranked && rows.length > 1 && rows[1] && rows[0] &&
      typeof rows[1].rank === "number" && typeof rows[0].rank === "number" &&
      rows[1].rank > rows[0].rank + 1;
    return '<ol class="lb-list' + (windowed ? " lb-window" : "") + '"' +
      (windowed ? ' data-part="window"' : "") + '>' + out.join("") + '</ol>';
  }

  /* YOU is not a list of GMs, it is a card of your own numbers. Same row component so it reads the
     same, with the rank column empty: there is nobody here to rank you against. */
  function cardHtml(data) {
    var rows = data.rows || [];
    if (!rows.length) return "";
    return '<ol class="lb-list" data-part="card">' + rows.map(function (r) {
      return '<li class="lb-row">' +
        '<span class="lb-rank"></span>' +
        '<span class="lb-name">' + esc(r.name) +
          (r.sub ? ' <span class="lb-sub t-meta">' + esc(r.sub) + '</span>' : "") + '</span>' +
        '<span class="lb-score">' + esc(r.score) + '</span></li>';
    }).join("") + '</ol>';
  }

  /* ---------------- the states, each one its own sentence ----------------
     These are five different facts and they must never blur into each other:
       on the board          your row, marked, in place. Nothing else to say.
       ranked, past the page "412th of 4,412". A real rank, pinned as a row. This is the state that
                             replaces "You are not on this board yet", which the shipped sheet shows to
                             most of its audience because lb.js resolves `you` from the fetched page.
       not on it at all      the honest sentence, plus the one thing that would put you on it.
       signed out, with a run the ghost: your real number, where it would sit, one plain invitation.
       signed out, no run    an invitation and no number anywhere. There is nothing to rank yet. */

  function pinnedHtml(def, recipe, data) {
    var you = data.you, outOf = you.outOf || data.field || 0;
    var pct = ceilingPct(you.rank, outOf);
    var line = ordinal(you.rank) + " of " + fmtInt(outOf) + " " + plural(outOf, def.unit) + ".";
    if (pct) line += " " + pct + ".";
    var last = lastRank(data.rows);
    var gap = last != null && you.rank > last + 1 ? you.rank - last - 1 : 0;
    return '<ol class="lb-list lb-window" data-part="pinned">' +
      (gap ? gapHtml(gap) : "") +
      '<li class="lb-row lb-you" data-row="pinned">' +
        '<span class="lb-rank">' + esc(you.rank) + '</span>' +
        '<span class="lb-name">You</span>' +
        '<span class="lb-score">' + esc(you.score) + '</span></li></ol>' +
      '<p class="acct-p" data-part="pinned-line">You are ' + esc(line) + '</p>';
  }
  function lastRank(rows) {
    var i;
    for (i = (rows || []).length - 1; i >= 0; i--) if (rows[i].rank != null) return rows[i].rank;
    return null;
  }

  function awayHtml(def) {
    return '<div class="lb-ghost" data-part="away">' +
      '<p class="acct-p">' + esc(def.away || "You are not on this board.") + '</p>' +
      (def.join ? '<p class="acct-fine">' + esc(def.join) + '</p>' : "") + '</div>';
  }

  /* THE GHOST LINE: a signed-out player who just finished a season. The strongest honest reason to make
     an account in the whole game, and the easiest thing in the world to get wrong. It states a number
     they already earned and where it already stands, then says plainly what an account adds. It never
     hides the number, never blurs it, never locks it, never counts down, and never implies the season
     was wasted: the season happened, the server can check it, and the only thing missing is a name. */
  var GHOST_FINE = "Boards show verified seasons with a name on them. An account puts your name on that row.";

  /* WHERE THE GHOST'S NUMBER COMES FROM, because this is the one place the lab could tell a lie.
     Every board in lb.js filters `user_id IS NOT NULL`, so a signed-out player genuinely has no row,
     and data.js is right to hand back `you: null` for them. But the standing itself is real and the
     game can already work it out signed out: /api/percentile needs no account. So rather than invent a
     number here, boards.js asks data.js for the SAME board, seed and field with the one flag flipped,
     and takes only its `you`. That is literally what making an account would do, which is what the line
     claims. If data.js is not loaded, or the recipe gives no rank, there is no number and the copy says
     so instead of guessing. */
  function ghostStanding(def, recipe, data) {
    if (data && data.you && data.you.rank) return data.you;
    if (!recipe.hasRun || !recipe.youRank) return null;
    if (!win.LB.data || !win.LB.data.board) return null;
    var asIf = {}, k;
    for (k in recipe) if (Object.prototype.hasOwnProperty.call(recipe, k)) asIf[k] = recipe[k];
    asIf.signedIn = true;
    asIf.empty = false;        /* the question is what their season scored, not what the board shows */
    try {
      var d = win.LB.data.board(def.id, asIf);
      return d && d.you && d.you.rank ? d.you : null;
    } catch (e) { return null; }
  }

  function ghostHtml(def, recipe, data, inList, empty) {
    var you = ghostStanding(def, recipe, data);
    var score = you && you.score != null ? you.score : null;
    /* On an empty board there is no rank to take, so the number stands on its own. This is the line
       the debut morning actually needs: the board is bare and their season would open it. */
    var rank = empty ? 0 : (you && you.rank);
    var outOf = empty ? 0 : ((you && you.outOf) || (data && data.field) || 0);
    var head, fine, part = "ghost", row = "";

    if (def.ranked === false && !def.card) {
      /* THE CLUB IS A MEMBERSHIP LIST. Its score column is a date, so "Oct 17 is already yours" would
         be gibberish, and there is no rank to be in line for. The bar is the only fact that matters. */
      head = "Nothing of yours is in the Club yet.";
      fine = "The Club lists verified 82-0 seasons with a name on them. An account is how yours gets in.";
    } else if (def.card) {
      /* YOUR CARD is the one surface that works with no account at all: it reads this browser. */
      head = "Your card works with no account at all.";
      fine = "An account is what puts your seasons on the other boards beside everybody else\u2019s.";
    } else if (score != null && rank && outOf) {
      /* The row is only printed here when the list did not already print it: the number appears once. */
      if (!inList) {
        row = '<ol class="lb-list lb-window" data-part="ghost-row">' +
          '<li class="lb-row lb-ghost" data-row="ghost">' +
            '<span class="lb-rank">' + esc(rank) + '</span>' +
            '<span class="lb-name">Your season</span>' +
            '<span class="lb-score">' + esc(score) + '</span></li></ol>';
      }
      head = esc(score) + " is already yours. On this board it sits " + esc(ordinal(rank)) +
        " of " + esc(fmtInt(outOf)) + " " + esc(plural(outOf, def.unit)) + ".";
      fine = GHOST_FINE;
    } else if (score != null) {
      /* A real number and nothing to measure it against yet: debut morning, an empty board. */
      head = esc(score) + " is already yours. Nobody has posted here yet, so it would open the board.";
      fine = GHOST_FINE;
    } else if (recipe.hasRun) {
      /* A finished season, but no number on the wire for this board (it is empty, or this board asks
         for something that season was not). Say that, and never make a rank up to fill the hole. */
      head = "Your season is not on this board yet.";
      fine = GHOST_FINE;
    } else {
      /* No run at all. There is nothing to rank, so the line is an invitation and carries no number. */
      part = "invite";
      head = "Nothing of yours is here yet.";
      fine = "Finish a season and the game works out where it lands. Playing never needs an account.";
    }
    return '<div class="lb-ghost" data-part="' + part + '">' + row +
      '<p class="acct-p">' + head + '</p><p class="acct-fine">' + fine + '</p></div>';
  }

  function emptyHtml(def, recipe, data) {
    var why = (data && data.emptyWhy) || "Nobody has made this board yet.";
    return '<div class="lb-empty" data-part="empty">' +
      '<p class="acct-p">' + esc(why) + '</p>' +
      (def.fills ? '<p class="acct-fine">' + esc(def.fills) + '</p>' : "") + '</div>';
  }

  /* ---------------- the spec sheet ---------------- */

  function specBody(sl, recipe, data) {
    var def = sl.def, rows = (data && data.rows) || [];
    var empty = !!recipe.empty || !rows.length;
    var ctx = {
      ranked: def.ranked !== false,
      signedIn: !!recipe.signedIn,
      showTag: !!recipe.showTag,
      chipSub: !!def.chipSub,
      scoreSub: !!def.scoreSub,
      dupe: dupeNames(rows)
    };
    var out = tabsHtml(sl, recipe) + segHtml(def, recipe);

    /* The crowd line is a fact about the ROOM and never about the player. data.js hands us null to
       suppress it under its own sample floor, because "Half the room finished under 70-12" out of four
       players is not a fact, it is arithmetic. The crowd line already names the field, so when it is
       showing, the header line drops the count and carries only the switch: one number, printed once. */
    var crowd = !empty && !def.card && recipe.crowd && data && data.crowd;
    if (crowd) out += '<p class="lb-crowd acct-fine">' + esc(data.crowd) + '</p>';
    if (!empty && !def.card) out += leadHtml(def, recipe, data, !crowd);

    if (empty) {
      out += emptyHtml(def, recipe, data);
    } else if (def.card) {
      out += cardHtml(data);
    } else {
      out += listHtml(def, recipe, data, ctx);
    }

    /* Where you stand. Exactly one of these, never two: they are different facts and a sheet that
       prints two of them has told the player something untrue about at least one. */
    var inList = !empty && onPage(rows, data && data.you);
    if (!recipe.signedIn) {
      out += ghostHtml(def, recipe, data, inList, empty);
    } else if (def.card) {
      /* Your own card, signed in: every row on it is already yours. Nothing to add. */
      out += "";
    } else if (empty) {
      /* A board with nothing on it ranks nobody, so no standing is printed over the empty state:
         "Nobody has posted today's board yet" and "You are 9th of 4,412" cannot both be true. */
      out += "";
    } else if (data && data.you && data.you.rank) {
      if (!inList) out += pinnedHtml(def, recipe, data);
    } else if (!inList) {
      out += awayHtml(def);
    }

    var note = (data && data.note) || def.note;
    if (note) out += '<p class="acct-fine" data-part="note">' + esc(note) + '</p>';

    /* The two boards that come off the front live at the bottom of YOUR CARD, which is where a GM
       lands when their rank is poor and the only place a single best night belongs. */
    if (def.links && def.links.length) {
      out += '<div class="lb-lead" data-part="links"' + leadStyle("flex-start") + '>' +
        def.links.map(function (id) {
          var b = find(sl.list, id);
          return b ? moreBtn(b.title, 'data-board="' + esc(b.id) + '"') : "";
        }).join("") + '</div>';
    }
    if (def.behind) {
      out += '<div class="lb-lead" data-part="back"' + leadStyle("flex-start") + '>' +
        moreBtn(def.backTo || "Back to the boards", 'data-board="' + esc(def.behind) + '"') + '</div>';
    }
    return out;
  }

  /* Is the viewer's own row among the rows we are showing? Either data.js flagged it, or its rank
     matches the one data.you reports. */
  function onPage(rows, you) {
    var i;
    rows = rows || [];
    for (i = 0; i < rows.length; i++) {
      if (rows[i].you) return true;
      if (you && rows[i].rank === you.rank) return true;
    }
    return false;
  }

  /* ---------------- the shipped sheet, reproduced ----------------
     accounts.js boardsHtml, as it renders today. Kept deliberately faithful: this is the control arm,
     and a flattering copy of it would make every change in the spec slate look better than it is. */
  function shippedBody(sl, recipe, data) {
    var def = sl.def, rows = (data && data.rows) || [];
    var empty = !!recipe.empty || !rows.length;
    var out = tabsHtml(sl, recipe);

    /* ROW TWO, FOR ONE BOARD'S BENEFIT. Three mode tabs under five board tabs, both rows wrapping:
       at 320px this is where the sheet reaches three lines of controls before a single rank. */
    if (def.modes && def.modes.length > 1) {
      out += '<div class="lb-tabs lb-modes">' + def.modes.map(function (m) {
        var on = m === "classic";
        return '<button class="lb-tab tm-flat' + (on ? " on" : "") + '" type="button" data-mode="' +
          esc(m) + '">' + esc(MODE_NAME[m] || m) + '</button>';
      }).join("") + '</div>';
    }

    if (empty) {
      out += '<p class="acct-p">Nobody has made this board yet.</p>' +
        '<p class="acct-fine">' + (def.minRuns
          ? "Needs " + def.minRuns + " finished seasons in this mode to qualify."
          /* accounts.js writes an em-dash here; no string in this lab may carry one. */
          : "Verified seasons only. Sign in before you play and yours will count.") + '</p>';
    } else {
      out += '<ol class="lb-list">' + rows.map(function (r) {
        var mine = !!r.you && !!recipe.signedIn;
        return '<li class="lb-row' + (mine ? " lb-you" : "") + '">' +
          '<span class="lb-rank">' + esc(r.rank) + '</span>' +
          '<span class="lb-name">' + esc(r.name) + '</span>' +
          '<span class="lb-score">' + esc(r.score) + '</span></li>';
      }).join("") + '</ol>';
      /* THE LIVE BUG, ON PURPOSE. lb.js resolves `you` with a find() over the fetched page, so a GM at
         rank 83 or lower comes back {rank: null} and is told they do not exist, directly under a season
         they were proud of. On a Daily after the debut that is most of the audience. */
      if (recipe.signedIn && !onPage(rows, data && data.you)) {
        out += '<p class="acct-fine">You’re not on this board yet.</p>';
      }
    }
    /* And a signed-out player who just finished a season is told nothing at all: there is no branch for
       them in the shipped sheet. That silence is what the ghost line costs or saves. */
    var note = (data && data.note) || def.note;
    if (note) out += '<p class="acct-fine">' + esc(note) + '</p>';
    return out;
  }

  /* ---------------- the sheet ---------------- */

  function render(recipe, data) {
    recipe = recipe || {};
    data = data || { rows: [] };
    var sl = slate(recipe);
    var def = sl.def;

    /* The sheet is named "Boards" while you are on one of the front tabs, and names the board itself
       when you are somewhere the tabs cannot show, which is the only wayfinding those two boards need
       and costs no row. The shipped sheet keeps its plain .rs-title, which misses the display face that
       head("sheet", ...) gives every other sheet on the site. */
    var title = def.front || sl.shipped ? "Boards" : def.title;
    var h2 = sl.shipped
      ? '<h2 class="rs-title">' + esc(title) + '</h2>'
      : '<h2 class="t-head rs-title" data-head="title">' + esc(title) + '</h2>';
    var head = '<div class="rs-head">' + h2 +
      '<button class="rs-close" type="button" aria-label="Close">×</button></div>';
    var body = sl.shipped ? shippedBody(sl, recipe, data) : specBody(sl, recipe, data);

    /* role="dialog" and the label, like the real sheet, but no aria-modal: on the lab's stage this is
       the page's content and there is nothing behind it to shut out. */
    return '<div class="rules-overlay" role="dialog" aria-label="Boards" data-slate="' +
      esc(recipe.slate === "shipped" ? "shipped" : "spec") + '" data-board="' + esc(def.id) + '">' +
      '<div class="rules-sheet acct-sheet plq-frame">' + head +
      '<div class="rs-scroll">' + body + '</div></div></div>';
  }

  win.LB.boards = {
    slate: slate,
    render: render,
    /* what lab.js wires, in one place so it never has to read this file to find out */
    WIRE: { board: "data-board", around: "data-around", scope: "data-scope", mode: "data-mode" }
  };
})();
