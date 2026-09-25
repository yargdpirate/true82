/* ---------- TRUE 82 LAB: the surfaces layer ----------
   Cards, panels, frames, rows, sheets, overlays and toasts, the page ground,
   the header and footer, written against the site's real selectors and
   switched by data-* on the snapshot's <html>:
     html[data-card="tunnel|paper|outline|ticket|flat"]   every card-like surface
     html[data-texture="none|grain|dots"]                 paper grain or a halftone screen
     html[data-ground="night|day"]                        the day ground: the site printed on paper

   The five card styles:
     tunnel   today's dark panels (only corners and texture change)
     paper    every card is a slip of textured paper with a soft drop, inked in
              navy: the v50 results look everywhere. Inside a slip the site's
              night colors are re-pointed at the paper world (see PAPER_VARS).
     outline  transparent, a key-ink border and a small hard offset shadow
     ticket   the draft ticket: notched corners and a dashed perforation
     flat     one flat tint, no border, no shadow
   The v50 paper slips (results, the tag sheet, the riso reel) stay paper in
   every style; only their edge changes.

   Colors come only from var(--t-<role>) (through color-mix). Corners come
   from --t-r-card. Every rule sits under :is(#lab-s#lab-s, ...), which lifts
   it to two ids so it beats the site's #app-armored rules without
   !important. The v50 papers' grain is reprinted by 30-reprint.js.
   The riso canvases and the Tribune (.np-*) are never touched here.

   Two page hooks write a little state on the snapshot:
     html[data-lab-mast="band|slip"] + --s-mast-band, html[data-lab-mast-ink="light|dark"]
       the masthead plate is printed straight on the ground (no data-lab-mast),
       on a full-width band the blend can erase its paper into, or pasted on as a slip
     --s-paper-tex, --s-grain-d, --s-grain-n on <html>   seamless texture tiles
     [data-lab-disp] + --s-fs0, [data-lab-mono]   display and data faces fitted
       into the sizes the site set for Barlow Condensed (see typeCSS); a button
       whose label still runs long gets its own --s-dfit (data-lab-dfit) */
(function () {
  var LAB = window.LAB;
  var BOOST = "#lab-s#lab-s";
  function IS(list) { return ":is(" + [BOOST].concat(list).join(", ") + ")"; }
  function rule(sel, body) { return sel + " { " + body + " }\n"; }
  function mix(a, pct, b) { return "color-mix(in srgb, " + a + " " + pct + "%, " + (b || "transparent") + ")"; }
  function K(st) { return 'html[data-card="' + st + '"] '; }
  var DAY = 'html[data-card][data-ground="day"] ';

  function rolesFor(rc) {
    var id = rc.sysPalette && rc.sysPalette !== "match" && rc.sysPalette !== "today" ? rc.sysPalette : rc.palette;
    try { return LAB.roles(LAB.palettes[id], rc.ground || "night"); } catch (e) { return null; }
  }
  // the most of color c (mixed into `toward`) that still reads at `min` contrast on bg, in percent
  function deep(c, toward, bg, min) {
    var C = LAB.color;
    for (var p = 100; p > 20; p -= 4) if (C.contrast(C.mix(toward, c, p / 100), bg) >= min) return p;
    return 20;
  }

  /* ---------- selectors ---------- */
  var S = {
    // content cards on the page
    card: [".ticket", ".traits-module", ".board:not(.rr-board)", ".pick-card:not(.bt-card)", ".wrap .card", ".wrap .skel", ".error-box",
      ".reel-overlay:not(.riso) .reel-card", ".trait-legend"],
    // the brass plaques: Daily tile, run strap, gate insert, mode panels, rules sheet, today's twist, daily card
    frame: [".plq-frame"],
    // cards that sit inside another card
    nested: [".ticket .traits-module", ".ticket .plq-frame", ".plq-frame .plq-frame", ".wrap .card .controls"],
    row: [".player-row"],
    tray: [".tray"],
    page: ["main.content-page"],
    // the v50 paper: slips on the results table, the tag sheet, the riso reel
    slip: [".rr .rr-board", ".rr .bt-card", ".rr .twoway", ".rr .rr-climb .climb", ".rr .ledger"],
    sheet: [".bt-sheet"],
    reel: [".reel-overlay.riso .reel-card"],
    heat: [".hh-card"],
    toast: [".bt-toast", ".duel-toast"],
    // recessed wells inside cards (the site paints them in --ink)
    well: [".board-cell", ".rs-law", ".rs-ref", ".cap-tip", ".cap-bar", ".wrap .controls"]
  };

  /* ---------- texture layers (set on <html>, read by every surface) ----------
     Every tile is drawn seamless by the page hook below (tileURL), so it repeats
     with no seam:  --s-paper-tex  the paper slips' stock
                    --s-grain-d    the day ground's fibres (multiplied: they only deepen the ground, in its own hue)
                    --s-grain-n    the night fibres (neutral grey, soft-lit over the dark stock)
     The halftone screen prints full strength on the page ground and at half
     strength inside cards, so running text never sits on a busy grid. */
  var TILE = 400, TEX = TILE + "px";
  function textureCSS() {
    var s = "";
    s += rule("html[data-card]", "--s-dots: none; --s-dots-card: none; --s-dots-ink: none; --s-grain: none; --s-grain-blend: multiply; --s-dots-size: 6px 6px;" +
      "--s-ptex: var(--s-paper-tex, var(--t-paper-tex));");
    // halftone: a fine screen of the key ink; under running text (cards, paper slips) at about half strength
    s += rule('html[data-card][data-texture="dots"]',
      "--s-dots: radial-gradient(circle, " + mix("var(--t-text)", 11) + " 0 0.95px, transparent 1.35px);" +
      "--s-dots-card: radial-gradient(circle, " + mix("var(--t-text)", 5.5) + " 0 0.95px, transparent 1.35px);" +
      "--s-dots-ink: radial-gradient(circle, " + mix("var(--t-ink)", 7.5) + " 0 0.95px, transparent 1.35px);");
    // grain: on the day ground the fibres are multiplied in; at night a neutral grey
    // fibre tile is soft-lit over the dark stock, so the fibres read lighter and darker
    s += rule('html[data-card][data-texture="grain"]', "--s-grain: var(--s-grain-d, none); --s-grain-blend: multiply;");
    s += rule('html[data-card][data-texture="grain"][data-ground="night"]', "--s-grain: var(--s-grain-n, none); --s-grain-blend: soft-light;");
    return s;
  }
  // background declarations for a surface of color c ("site" surfaces get the grain multiplied in; paper is the grain)
  function bg(c, kind, extra) {
    var paper = kind === "paper";
    return "background-color: " + c + "; background-image: " + (paper ? "var(--s-dots-ink), var(--s-ptex)" : "var(--s-dots-card), var(--s-grain)") + (extra ? ", " + extra : "") + ";" +
      "background-size: var(--s-dots-size), " + TEX + (extra ? ", auto" : "") + "; background-position: 0 0; background-repeat: repeat, repeat" + (extra ? ", no-repeat" : "") + ";" +
      "background-blend-mode: normal, " + (paper ? "normal" : "var(--s-grain-blend)") + (extra ? ", normal" : "") + ";";
  }

  /* ---------- the paper world inside a slip ----------
     The site paints with a few aliases (--ink --tunnel --chalk --maple --amber ...)
     resolved once on :root, plus direct role reads. A paper slip re-points both
     at the paper roles, so every nested label, rule and well reads as ink on
     paper. Accent, metal, bad and good text are darkened (mixed toward the
     shadow ink) just enough to read on the paper; the percentages are worked out
     per palette. Keycap faces keep their accent (they read on paper already). */
  function paperDeepCSS(r) {
    var pa = 64, pm = 60, pb = 72, pg = 70;
    if (r) {
      pa = deep(r.accent, r.shadow, r.paper, 3.4); pm = deep(r.metal, r.shadow, r.paper, 3.2);
      pb = deep(r.bad, r.shadow, r.paper, 3.8); pg = deep(r.good, r.shadow, r.paper, 3.8);
    }
    return rule("html[data-card]",
      "--s-p-accent: " + mix("var(--t-accent)", pa, "var(--t-shadow)") + "; --s-p-metal: " + mix("var(--t-metal)", pm, "var(--t-shadow)") + ";" +
      "--s-p-bad: " + mix("var(--t-bad)", pb, "var(--t-shadow)") + "; --s-p-good: " + mix("var(--t-good)", pg, "var(--t-shadow)") + ";" +
      "--s-p-line: " + mix("var(--t-ink)", 16, "var(--t-paper)") + "; --s-root-ink: var(--t-ground);");
  }
  var PAPER_VARS =
    "color: var(--t-ink);" +
    "--ink: var(--t-paper-2); --tunnel: var(--t-paper); --tunnel-2: var(--s-p-line); --chalk: var(--t-ink); --chalk-dim: var(--t-ink-2);" +
    "--maple: var(--s-p-metal); --maple-line: color-mix(in srgb, var(--t-line-paper) 26%, var(--t-paper)); --amber: var(--s-p-accent); --whistle: var(--s-p-bad); --ok: var(--s-p-good);" +
    "--line: color-mix(in srgb, var(--t-line-paper) 26%, var(--t-paper)); --panel: var(--t-paper); --card: var(--t-paper); --ember: var(--s-p-bad); --plq-deep: var(--s-p-metal);" +
    "--t-ground: var(--t-paper); --t-ground-2: var(--t-paper); --t-ground-3: var(--t-paper-2); --t-text: var(--t-ink); --t-text-2: var(--t-ink-2);" +
    "--t-line: color-mix(in srgb, var(--t-line-paper) 26%, var(--t-paper)); --t-shadow: var(--t-ink);";
  // things inside a paper surface that were drawn for a dark ground: glows, black extrusions, white type
  function paperFx(P) {
    var s = "", I = function (l) { return P + IS(l); };
    s += rule(I([".daily-tile .dt-title", ".gate-title", ".mpb-amt", ".mp-bank.bank-low .mpb-amt", ".board .big-label .net-bonus", ".hot-pick .pr-v .hot-bonus", ".hot-pick .slot-badge",
      ".gate-tipoff .gate-pull", ".hh-eyebrow", ".hh-lever-hint", ".cy-arrow"]), "text-shadow: none;");
    // type the site inks straight from the accent, bad and good roles: the deep, paper-safe versions
    s += rule(I([".traits-module .tm-eyebrow", ".traits-module .tm-eyeb", ".traits-module .tm-res b", ".traits-module .tm-q:active", ".trait-legend-title", ".trait-legend-row b"]), "color: var(--s-p-accent);");
    s += rule(I([".traits-module .tm-res .neg", ".hot-pick .pr-name", ".hot-pick .pr-v .hot-bonus", ".board .big-label .net-bonus", ".mpb-delta.neg",
      ".mp-bank.bank-mid .mpb-amt", ".mp-bank.bank-down .mpb-amt"]), "color: var(--s-p-bad);");
    s += rule(I([".traits-module .tm-new", ".mp-bank.bank-up .mpb-amt", ".mpb-delta.pos"]), "color: var(--s-p-good);");
    s += rule(I([".traits-module .tm-new"]), "border-color: var(--s-p-good);");
    s += rule(I([".mpb-lab"]), "color: var(--s-p-accent);");
    s += rule(I([".mp-bank"]), "border-color: " + mix("var(--s-p-accent)", 60) + ";");
    s += rule(I([".mpb-meter"]), "border-color: " + mix("var(--s-p-accent)", 45) + "; background: " + mix("var(--t-ink)", 10) + ";");
    // the heat check, printed: offsets instead of glows, ink instead of white
    s += rule(I([".hh-name.hot"]), "color: var(--t-ink); text-shadow: 2px -1px 0 " + mix("var(--t-offset)", 75) + ";");
    s += rule(I([".hh-payline"]), "border-color: " + mix("var(--t-ink)", 30) + ";");
    s += rule(I([".hh-seg"]), "background: " + mix("var(--t-ink)", 10) + ";");
    s += rule(I([".hh-seg.fill.lvl0"]), "background: " + mix("var(--s-p-metal)", 45) + ";");
    s += rule(I([".hh-seg.fill.lvl1"]), "background: " + mix("var(--s-p-metal)", 75) + ";");
    s += rule(I([".hh-seg.fill.lvl2", ".hh-seg.fill.lvl3", ".hh-seg.fill.lvl4"]), "background: var(--t-sun);");
    s += rule(I([".hh-seg.lit", ".hh-seg.result"]), "background: var(--t-sun); box-shadow: 2px 2px 0 var(--t-ink);");
    s += rule(I([".hh-heatlabel.lvl2", ".hh-heatlabel.lvl3", ".hh-heatlabel.lvl4"]), "color: var(--t-ink); text-shadow: 2px -1px 0 " + mix("var(--t-offset)", 75) + ";");
    s += rule(I([".hh-stamp"]), "color: var(--t-ink); text-shadow: 2px -1.5px 0 " + mix("var(--t-offset)", 70) + ";");
    s += rule(I([".hh-stamp.miss"]), "color: var(--t-ink-2); text-shadow: none;");
    s += rule(I([".hh-net.over"]), "color: var(--t-ink); text-shadow: 2px -1.5px 0 " + mix("var(--t-offset)", 70) + ";");
    s += rule(I([".hh-thresh"]), "background: var(--t-ink); box-shadow: none;");
    s += rule(I([".hh-fill"]), "background: var(--t-sun);");
    s += rule(I([".hh-fill-bonus"]), "box-shadow: none;");
    // the hoop's net is drawn in chalk; on paper it prints in the second ink
    s += rule(I([".hh-hoop svg g"]), "stroke: " + mix("var(--t-ink)", 55) + ";");
    // the bank's low state, restated over the paper border and label above
    s += rule(I([".mp-bank.bank-low"]), "border-color: " + mix("var(--s-p-bad)", 60) + ";");
    s += rule(I([".mp-bank.bank-low .mpb-lab"]), "color: var(--s-p-bad);");
    return s;
  }

  /* ---------- masks and edges ---------- */
  var MK = "var(--t-text)";   // any opaque paint: masks read alpha only
  function notch(r) {
    var g = function (at, pos) { return "radial-gradient(circle at " + at + ", transparent " + r + "px, " + MK + " " + (r + 0.5) + "px) " + pos + " / 51% 51% no-repeat"; };
    var m = [g("0 0", "left top"), g("100% 0", "right top"), g("0 100%", "left bottom"), g("100% 100%", "right bottom")].join(", ");
    return "-webkit-mask: " + m + "; mask: " + m + ";";
  }
  // a torn-off edge: half-circle bites every `gap` px along the top
  function perfTop(r, gap) {
    var m = "radial-gradient(circle at 50% 0, transparent " + r + "px, " + MK + " " + (r + 0.5) + "px) 0 0 / " + gap + "px 100% repeat-x";
    return "-webkit-mask: " + m + "; mask: " + m + ";";
  }
  var NOMASK = "-webkit-mask: none; mask: none;";
  var DROP = "0 1px 0 " + mix("var(--t-shadow)", 28) + ", 0 12px 26px -16px " + mix("var(--t-shadow)", 80);
  var DROP_SM = "0 1px 0 " + mix("var(--t-shadow)", 22) + ", 0 5px 10px -7px " + mix("var(--t-shadow)", 70);
  var OFF = "4px 4px 0 " + mix("var(--t-text)", 34);
  var OFF_SM = "3px 3px 0 " + mix("var(--t-text)", 28);

  /* ---------- 1. TUNNEL: today's panels; corners and texture only ---------- */
  function tunnelCSS() {
    var P = K("tunnel"), s = "", I = function (l) { return P + IS(l); };
    s += rule(I(S.card.concat(S.frame)), "border-radius: var(--t-r-card);");
    s += rule(I([".ticket", ".board:not(.rr-board)", ".pick-card:not(.bt-card)", ".error-box", ".reel-overlay:not(.riso) .reel-card", ".trait-legend"]),
      "background-image: var(--s-dots-card), var(--s-grain); background-size: var(--s-dots-size), " + TEX + "; background-blend-mode: normal, var(--s-grain-blend);");
    s += rule(I([".plq-frame", "#app button.daily-tile"]), "background-image: var(--s-dots-card), var(--s-grain), radial-gradient(140% 120% at 50% 0%, " + mix("var(--t-accent-hi)", 9) + ", transparent 55%);" +
      "background-size: var(--s-dots-size), " + TEX + ", auto; background-blend-mode: normal, var(--s-grain-blend), normal;");
    s += rule(I([".traits-module"]), "background-image: var(--s-dots-card), var(--s-grain), linear-gradient(180deg, var(--t-ground-3), var(--t-ground-2));" +
      "background-size: var(--s-dots-size), " + TEX + ", auto; background-blend-mode: normal, var(--s-grain-blend), normal;");
    s += rule(I([".wrap .card"]), "background-image: var(--s-dots-card), var(--s-grain), linear-gradient(180deg, var(--t-ground-2), var(--t-ground-2));" +
      "background-size: var(--s-dots-size), " + TEX + ", auto; background-blend-mode: normal, var(--s-grain-blend), normal;");
    s += rule(I(S.row), "border-radius: calc(var(--t-r-card) * 0.6); background-image: var(--s-dots-card), var(--s-grain); background-size: var(--s-dots-size), " + TEX + "; background-blend-mode: normal, var(--s-grain-blend);");
    s += rule(I(S.tray), "background-image: var(--s-dots-card), var(--s-grain); background-size: var(--s-dots-size), " + TEX + "; background-blend-mode: normal, var(--s-grain-blend);");
    // content pages have no panel: on the halftone ground their text sits on the calmer screen (the grid lines up with the ground's)
    s += rule('html[data-card="tunnel"][data-texture="dots"] ' + IS(S.page), "background-color: var(--t-ground); background-image: var(--s-dots-card); background-size: var(--s-dots-size); background-attachment: fixed;");
    s += rule(I(S.toast), "border-radius: var(--t-r-card);");
    // the Heat Check and the 82-0 shot: today's panel, opaque, so the reel behind never reads through the type
    s += rule(I(S.heat), bg("var(--t-ground-2)", "site") + "border: 1px solid var(--t-line); border-top: 3px solid var(--t-metal); border-radius: var(--t-r-card);" +
      "padding: 18px 16px 20px; box-shadow: 0 18px 44px -18px " + mix("var(--t-shadow)", 70) + ";");
    return s;
  }

  /* ---------- 2. PAPER: every card a slip of paper ---------- */
  function paperCSS() {
    var P = K("paper"), s = "", I = function (l) { return P + IS(l); };
    var SLIPS = S.card.concat(S.frame, S.row, S.tray, S.page, S.heat);
    // (the kit's context wrappers, [data-kit-ghost], keep the night colors: they paint nothing)
    var GHOST = ":not([data-kit-ghost])";
    s += rule(I(SLIPS) + GHOST, PAPER_VARS);
    s += rule(I(S.card.concat(S.frame)), bg("var(--t-paper)", "paper") + "border: 0; border-radius: var(--t-r-card); box-shadow: " + DROP + ";");
    // the plaque's inner hairline prints as a thin ink rule; the rivets go (clutter on paper)
    s += rule(I([".plq-frame"]) + "::before", "border-color: " + mix("var(--t-ink)", 26) + "; border-radius: calc(var(--t-r-card) * 0.5);");
    s += rule(I([".plq-frame"]) + "::after", "display: none;");
    s += rule(I([".plq-slim"]) + "::before", "border-color: " + mix("var(--t-ink)", 16) + ";");
    // cards on cards: the second paper, pressed flat, with a hairline
    s += rule(I(S.nested), "background-image: linear-gradient(" + mix("var(--t-paper-2)", 70) + ", " + mix("var(--t-paper-2)", 70) + "), var(--s-dots-ink), var(--s-ptex);" +
      "background-size: auto, var(--s-dots-size), " + TEX + "; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--t-line-paper) 26%, var(--t-paper));");
    // wells inside slips (and the bonus vote tray): the second paper, flat
    s += rule(I([":is(" + SLIPS.join(", ") + ")" + GHOST + " :is(" + S.well.join(", ") + ")"]), "background: var(--t-paper-2); border-color: color-mix(in srgb, var(--t-line-paper) 26%, var(--t-paper));");
    s += rule(I([".wrap .card .controls"]), "border: 0; border-radius: calc(var(--t-r-card) * 1.1); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--t-line-paper) 26%, var(--t-paper));");
    // the poll card: its accent border and glow were drawn for the night
    s += rule(I([".traits-module"]), "border: 0;");
    // pool rows: small slips; the left bar marks the pick
    s += rule(I(S.row), bg("var(--t-paper)", "paper") + "border: 0; border-left: 3px solid transparent; border-radius: calc(var(--t-r-card) * 0.6); box-shadow: " + DROP_SM + ";");
    // states print as a wash over the grain (a background color would sit under the opaque tile)
    var wash = function (c) { return "background-image: linear-gradient(" + c + ", " + c + "), var(--s-dots-ink), var(--s-ptex); background-size: auto, var(--s-dots-size), " + TEX + ";"; };
    s += rule(I(S.row) + ":active", wash(mix("var(--t-ink)", 8)));
    s += rule(I([".player-row.sel"]), wash(mix("var(--t-sun)", 22)) + "border-left-color: var(--t-ink); box-shadow: 0 0 0 2px var(--t-ink), " + DROP_SM + ";");
    // rows you can't pick now: the slip stays paper (a see-through slip turns to a grey slab on the
    // night table), pressed flat in the second paper, with its type faded
    s += rule(I([".player-row.off"]), wash(mix("var(--t-paper-2)", 90)) + "opacity: 1; box-shadow: none;");
    s += rule(I([".player-row.off"]) + " > *", "opacity: 0.42;");
    // the draft tray: a paper strip along the bottom
    s += rule(I(S.tray), bg("var(--t-paper)", "paper") + "border-top: 0; box-shadow: 0 -1px 0 " + mix("var(--t-shadow)", 30) + ", 0 -12px 24px -14px " + mix("var(--t-shadow)", 80) + ";");
    // content pages: the page itself is a sheet of paper
    s += rule(I(S.page), bg("var(--t-paper)", "paper") + "border-radius: var(--t-r-card); box-shadow: " + DROP + "; margin: 14px auto 18px; padding: 18px 18px 22px; width: calc(100% - 24px);");
    // the heat check prints on a slip
    s += rule(I(S.heat), bg("var(--t-paper)", "paper") + "border-radius: var(--t-r-card); box-shadow: " + DROP + "; padding: 18px 16px 20px;");
    // toasts: a paper tag with ink type
    s += rule(I(S.toast), "background-color: var(--t-paper); background-image: var(--s-ptex); background-size: " + TEX + "; color: var(--t-ink); border: 0; border-radius: var(--t-r-card); box-shadow: " + DROP + ";");
    // inside the slips only: the glows and white type drawn for the dark ground
    s += paperFx(P + ":is(" + SLIPS.join(", ") + ")" + GHOST + " ");
    // buttons that paint their face with the site's amber alias keep the true accent face and dark label
    s += rule(P + ":is(" + SLIPS.join(", ") + ")" + GHOST + " " + IS([".qx-btn.qx-play", ".act-next", ".rs-got:not(.rs-ref-btn)", ".reel-done", ".confirm-btn", ".btn-primary", ".dt-act-share", ".cap-info"]),
      "--amber: var(--t-accent); --ink: var(--s-root-ink);");
    s += rule(I([".pick-card.hot-pick:not(.bt-card)"]), "box-shadow: 0 0 0 2px var(--t-bad), " + DROP + ";");
    return s;
  }

  /* ---------- 3. OUTLINE: key-ink line and a small hard offset ---------- */
  function outlineCSS() {
    var P = K("outline"), s = "", I = function (l) { return P + IS(l); };
    var LINE = "2px solid var(--t-text)";
    // see-through: the ground (and its texture) shows through
    s += rule(I(S.card.concat(S.frame)), "background: transparent; border: " + LINE + "; border-radius: var(--t-r-card); box-shadow: " + OFF + ";");
    s += rule(I([".plq-frame"]) + "::before", "display: none;");
    s += rule(I([".plq-frame"]) + "::after", "display: none;");
    s += rule(I(S.nested), "border-width: 1.5px; box-shadow: none;");
    // sheets over a scrim need a floor: the ground, not glass
    s += rule(I([".rules-sheet", ".reel-overlay:not(.riso) .reel-card"]), "background-color: var(--t-ground);");
    s += rule(I(S.row), "background: transparent; border: 1.5px solid " + mix("var(--t-text)", 75) + "; border-left-width: 1.5px;" +
      "border-radius: calc(var(--t-r-card) * 0.6); box-shadow: " + OFF_SM + ";");
    s += rule(I(S.row) + ":active", "background-color: " + mix("var(--t-text)", 8) + ";");
    s += rule(I([".player-row.sel"]), "border-color: var(--t-text); background-color: " + mix("var(--t-accent)", 12) + "; box-shadow: inset 4px 0 0 var(--t-accent), " + OFF_SM + ";");
    s += rule(I(S.tray), bg("var(--t-ground)", "site") + "border-top: 2px solid var(--t-text); box-shadow: 0 -4px 0 " + mix("var(--t-text)", 16) + ";");
    s += rule(I(S.page), "border: " + LINE + "; border-radius: var(--t-r-card); box-shadow: " + OFF + "; margin: 14px auto 18px; padding: 16px 16px 20px; width: calc(100% - 28px);");
    s += rule(I(S.heat), "border: " + LINE + "; border-radius: var(--t-r-card); box-shadow: " + OFF + "; padding: 18px 16px 20px; background-color: var(--t-ground);");
    s += rule(I(S.toast), "background: var(--t-ground); color: var(--t-text); border: " + LINE + "; border-radius: var(--t-r-card); box-shadow: " + OFF_SM + ";");
    // on the halftone ground the cards are solid ground, so the screen shows in the gutters, never under type
    var DOTS = 'html[data-card="outline"][data-texture="dots"] ';
    s += rule(DOTS + IS(S.card.concat(S.frame, S.row, S.page)), "background-color: var(--t-ground);");
    s += rule(DOTS + IS(S.row) + ":active", "background-color: " + mix("var(--t-text)", 8, "var(--t-ground)") + ";");
    s += rule(DOTS + IS([".player-row.sel"]), "background-color: " + mix("var(--t-accent)", 12, "var(--t-ground)") + ";");
    return s;
  }

  /* ---------- 4. TICKET: notched corners and a perforation ---------- */
  function ticketCSS() {
    var P = K("ticket"), s = "", I = function (l) { return P + IS(l); };
    var PERF = "outline: 1.5px dashed " + mix("var(--t-metal)", 60) + "; outline-offset: -5px;";
    s += rule(I(S.card.concat(S.frame)), bg("var(--t-ground-2)", "site") + "border: 0; border-radius: 0; box-shadow: none;" + notch(14) + PERF);
    s += rule(I([".traits-module"]), "background-color: var(--t-ground-3);");
    // the perforation runs 5px inside the edge: the cards the site packs tightly (9 to 11px) get
    // room for it, so a heading never sits on the dashes
    s += rule(I([".ticket"]), "padding: 14px 15px 13px;");
    s += rule(I([".plq-slim"]), "padding-top: 13px; padding-bottom: 13px;");
    s += rule(I([".plq-frame"]) + "::before", "display: none;");
    s += rule(I([".plq-frame"]) + "::after", "display: none;");
    s += rule(I(S.nested), notch(10) + "outline-offset: -4px; background-color: var(--t-ground-3);");
    s += rule(I([".ticket .plq-frame", ".plq-frame .plq-frame"]), "background-color: var(--t-ground);");
    s += rule(I([".wrap .card .controls"]), NOMASK + "border: 1.5px dashed " + mix("var(--t-metal)", 45) + "; border-radius: 0;");
    // rows: small stubs, the left edge a dashed tear line
    s += rule(I(S.row), bg("var(--t-ground-2)", "site") + "border: 0; border-left: 2px dashed " + mix("var(--t-metal)", 45) + "; border-radius: 0; box-shadow: none;" + notch(6));
    s += rule(I(S.row) + ":active", "background-color: var(--t-ground-3);");
    s += rule(I([".player-row.sel"]), "background-color: var(--t-ground-3); border-left: 3px dashed var(--t-accent);");
    // the tray is a ticket torn off along the top
    s += rule(I(S.tray), bg("var(--t-ground-2)", "site") + "border-top: 0; box-shadow: none;" + perfTop(4, 12));
    s += rule(I(S.page), bg("var(--t-ground-2)", "site") + notch(12) + PERF + "margin: 14px auto 18px; padding: 20px 20px 24px; width: calc(100% - 24px);");
    s += rule(I(S.heat), bg("var(--t-ground-2)", "site") + notch(12) + PERF + "padding: 22px 18px 22px;");
    s += rule(I(S.toast), notch(6) + "border-radius: 0; box-shadow: none;");
    return s;
  }

  /* ---------- 5. FLAT: one tint, nothing else ---------- */
  function flatCSS() {
    var P = K("flat"), s = "", I = function (l) { return P + IS(l); };
    var TINT = mix("var(--t-text)", 7, "var(--t-ground)"), TINT2 = mix("var(--t-text)", 12, "var(--t-ground)");
    s += rule(I(S.card.concat(S.frame)), bg(TINT, "site") + "border: 0; border-radius: var(--t-r-card); box-shadow: none; outline: 0;");
    s += rule(I([".plq-frame"]) + "::before", "display: none;");
    s += rule(I([".plq-frame"]) + "::after", "display: none;");
    s += rule(I(S.nested), "background-color: " + TINT2 + ";");
    s += rule(I([".rules-sheet", ".reel-overlay:not(.riso) .reel-card"]), "background-color: " + mix("var(--t-text)", 7, "var(--t-ground)") + ";");
    s += rule(I(S.row), bg(TINT, "site") + "border: 0; border-left: 3px solid transparent; border-radius: calc(var(--t-r-card) * 0.6); box-shadow: none;");
    s += rule(I(S.row) + ":active", "background-color: " + TINT2 + ";");
    s += rule(I([".player-row.sel"]), "background-color: " + mix("var(--t-accent)", 14, "var(--t-ground)") + "; border-left-color: var(--t-accent);");
    s += rule(I(S.tray), bg(TINT, "site") + "border-top: 0; box-shadow: none;");
    s += rule(I(S.page), bg(TINT, "site") + "border-radius: var(--t-r-card); margin: 14px auto 18px; padding: 16px 16px 20px; width: calc(100% - 24px);");
    s += rule(I(S.heat), bg(TINT, "site") + "border-radius: var(--t-r-card); padding: 18px 16px 20px;");
    s += rule(I(S.toast), "box-shadow: none; border-radius: var(--t-r-card);");
    return s;
  }

  /* ---------- the v50 paper (results slips, tag sheet, riso reel) in every style ---------- */
  function slipCSS() {
    var s = "", A = "html[data-card] ";
    // (their paper grain is reprinted in the palette's stock by 30-reprint.js; only the edge is ours)
    s += rule(A + IS(S.slip.concat(S.reel)), "border-radius: var(--t-r-card);");
    s += rule(A + IS(S.sheet), "border-radius: min(calc(var(--t-r-card) * 2), 22px) min(calc(var(--t-r-card) * 2), 22px) 0 0;");
    // outline: an ink rule round each slip and a hard offset under it
    s += rule(K("outline") + IS(S.slip.concat(S.reel)), "box-shadow: inset 0 0 0 2px var(--t-ink), " + OFF + ";");
    s += rule(K("outline") + IS([".rr .bt-card.hot-pick"]), "box-shadow: inset 0 0 0 2px var(--t-bad), " + OFF + ";");
    s += rule(K("outline") + IS(S.sheet), "box-shadow: inset 0 2px 0 var(--t-ink), 0 -4px 0 " + mix("var(--t-text)", 24) + ";");
    // ticket: notches and a perforation
    s += rule(K("ticket") + IS(S.slip.concat(S.reel)), notch(9) + "border-radius: 0; outline: 1.5px dashed " + mix("var(--t-ink)", 30) + "; outline-offset: -6px;");
    s += rule(K("ticket") + IS([".rr .bt-card.hot-pick"]), "outline-color: var(--t-bad); outline-style: solid; outline-width: 2px;");
    s += rule(K("ticket") + IS(S.sheet), perfTop(5, 14) + "border-radius: 0;");
    // flat: the paper, lying flat
    s += rule(K("flat") + IS(S.slip.concat(S.reel)), "box-shadow: none;");
    s += rule(K("flat") + IS([".rr .bt-card.hot-pick"]), "box-shadow: inset 0 0 0 2px var(--t-bad);");
    s += rule(K("flat") + IS(S.sheet), "box-shadow: 0 -1px 0 " + mix("var(--t-shadow)", 25) + ";");
    return s;
  }

  /* ---------- the day ground: everything printed on paper ---------- */
  function dayCSS() {
    var s = "", I = function (l) { return DAY + IS(l); };
    // glows and black extrusions were drawn for the dark: on paper they print as offsets or nothing
    s += paperFx(DAY);
    // today's panels on paper (the other card styles paint their own edges)
    var TUN = 'html[data-card="tunnel"][data-ground="day"] ';
    s += rule(TUN + IS([".pick-card.hot-pick:not(.bt-card)"]), "box-shadow: 0 0 0 2px var(--t-bad);");
    s += rule(TUN + IS([".traits-module"]), "box-shadow: " + DROP + ";");
    s += rule(TUN + IS([".plq-frame", "#app button.daily-tile"]), "box-shadow: inset 0 0 0 1px " + mix("var(--t-paper)", 60) + ", inset 0 0 0 4px " + mix("var(--t-metal)", 16) + ", 0 3px 10px -6px " + mix("var(--t-shadow)", 40) + ";");
    s += rule(TUN + IS([".wrap .card"]), "border-top-color: var(--t-line);");
    s += rule(I([".mp-bank", "#app .cap-mode-panel .mp-bank"]), "box-shadow: inset 0 1px 0 " + mix("var(--t-shadow)", 12) + ";");
    s += rule(I([".mpb-meter"]), "background: " + mix("var(--t-ink)", 10) + ";");
    s += rule(I([".cap-row .cap-cost"]), "box-shadow: 0 2px 0 " + mix("var(--t-shadow)", 18) + ";");
    // scrims: an ink wash, not a blackout
    s += rule(I([".rules-overlay"]), "background: " + mix("var(--t-ink)", 42) + ";");
    s += rule(I([".bt-backdrop"]), "background: " + mix("var(--t-ink)", 34) + ";");
    // the big moments (the season reel, the Heat Check, the 82-0 shot) keep the v50 contrast: a paper
    // card on a dark ink table, so the card lifts off the page like it does at night
    var deepInk = mix("var(--t-ink)", 70, "var(--t-shadow)");
    s += rule(I([".reel-overlay"]), "background: " + mix(deepInk, 84) + ";");
    s += rule(I([".hh-overlay"]), "background: radial-gradient(120% 90% at 50% 32%, " + mix("var(--t-ink)", 88) + ", " + mix(deepInk, 95) + ");");
    s += rule(I([".hh-overlay.hh-reveal"]), "background: radial-gradient(120% 90% at 50% 32%, var(--t-ink), " + deepInk + ");");
    // the close link sits on the table, not on the card
    s += rule(I([".hh-skip"]), "color: " + mix("var(--t-paper)", 78) + ";");
    // the v50 results table: the eyebrows were printed in paper color on the dark table
    s += rule(I([".rr .rr-eyebrow"]), "color: var(--t-text); text-shadow: 1px -1px 0 " + mix("var(--t-offset)", 45) + ";");
    s += rule(I([".rr .bref-credit"]), "color: var(--t-text-2);");
    // slips on paper: a lighter lift (the outline, ticket and flat edges keep their own)
    var LIFT = 'html[data-card][data-ground="day"]:is([data-card="tunnel"], [data-card="paper"]) ';
    s += rule(LIFT + IS(S.slip), "box-shadow: 0 1px 0 " + mix("var(--t-shadow)", 18) + ", 0 12px 24px -16px " + mix("var(--t-shadow)", 55) + ";");
    s += rule(LIFT + IS([".rr .bt-card.hot-pick"]), "box-shadow: 0 0 0 2px var(--t-bad), 0 12px 24px -16px " + mix("var(--t-shadow)", 55) + ";");
    s += rule(LIFT + IS([".reel-overlay.riso .reel-card"]), "box-shadow: 0 1px 0 " + mix("var(--t-shadow)", 18) + ", 0 18px 44px -18px " + mix("var(--t-shadow)", 60) + ";");
    s += rule(LIFT + IS([".bt-sheet"]), "box-shadow: 0 -1px 0 " + mix("var(--t-shadow)", 15) + ", 0 -14px 34px -10px " + mix("var(--t-shadow)", 35) + ";");
    // the "more players" cue: a ground-colored pill (with chip "ink" it is a solid accent pill: leave it)
    s += rule('html[data-card][data-ground="day"]:not([data-chip="ink"]) ' + IS([".pool-cue"]), "background: " + mix("var(--t-ground)", 92) + ";");
    return s;
  }

  /* ---------- the ground: texture on the page itself ---------- */
  function groundCSS() {
    var s = "";
    var bonus = "radial-gradient(120% 90% at 50% 0%, " + mix("var(--t-accent)", 5) + ", transparent 55%), repeating-linear-gradient(0deg, transparent 0 46px, " +
      mix("var(--t-line)", 2.2) + " 46px 47px), radial-gradient(140% 120% at 50% 110%, var(--t-ground), var(--t-ground) 60%)";
    // halftone screen on the ground, both grounds
    s += rule('html[data-card][data-texture="dots"] body', "background-image: var(--s-dots); background-size: var(--s-dots-size); background-attachment: fixed;");
    s += rule('html[data-card][data-texture="dots"] body:has(> .wrap)', "background-image: var(--s-dots), " + bonus + "; background-size: var(--s-dots-size), auto, auto, auto;");
    // paper grain on the ground: the day ground is paper; the night ground reads as dark stock
    s += rule('html[data-card][data-texture="grain"] body', "background-image: var(--s-grain); background-size: " + TEX + "; background-blend-mode: var(--s-grain-blend); background-attachment: fixed;");
    s += rule('html[data-card][data-texture="grain"] body:has(> .wrap)', "background-image: var(--s-grain), " + bonus + "; background-size: " + TEX + ", auto, auto, auto; background-blend-mode: var(--s-grain-blend), normal, normal, normal;");
    // the pool fade: the same ground, faded with a mask so the texture lines up
    s += rule('html[data-card]:is([data-texture="dots"], [data-texture="grain"]) body.drafting .pool-fade',
      "background-color: var(--t-ground); background-image: var(--s-dots), var(--s-grain); background-size: var(--s-dots-size), " + TEX + "; background-blend-mode: normal, var(--s-grain-blend); background-attachment: fixed;" +
      "-webkit-mask: linear-gradient(180deg, transparent, " + MK + " 82%); mask: linear-gradient(180deg, transparent, " + MK + " 82%);");
    s += rule('html[data-card][data-texture="grain"] body.drafting .pool-fade', "background-image: var(--s-grain); background-size: " + TEX + "; background-blend-mode: var(--s-grain-blend);");
    return s;
  }

  /* ---------- the header and the footer ---------- */
  function chromeCSS() {
    var s = "", A = "html[data-card] ";
    // the masthead plate: printed straight onto the ground or onto a full-width band of its own paper
    s += rule(A + IS([".site-head"]), "border-bottom-color: var(--t-line);");
    s += rule('html[data-card][data-lab-mast-ink="light"] ' + IS([".brand-logo"]), "mix-blend-mode: darken;");
    s += rule('html[data-card][data-lab-mast-ink="dark"] ' + IS([".brand-logo"]), "mix-blend-mode: lighten;");
    // the band runs the full width; its bottom border takes the band color too, so at tablet and
    // desktop widths no strip of the ground shows under the 560px header
    s += rule('html[data-card][data-lab-mast="band"] ' + IS([".site-head"]),
      "box-shadow: inset 0 0 0 100vmax var(--s-mast-band), 0 0 0 100vmax var(--s-mast-band); clip-path: inset(0 -100vmax); border-bottom-color: var(--s-mast-band);");
    s += rule('html[data-card][data-lab-mast="slip"] ' + IS([".brand-logo"]),
      "border-radius: 3px; box-shadow: 0 1px 0 " + mix("var(--t-shadow)", 30) + ", 0 10px 22px -12px " + mix("var(--t-shadow)", 75) + ";");
    // the footer: a quiet rule, readable type on both grounds
    s += rule(A + IS([".site-foot"]), "border-top-color: var(--t-line);");
    s += rule(DAY + IS([".site-foot .games-count", ".site-foot .foot-stats"]), "color: var(--t-text-2);");
    return s;
  }
  LAB.pageHooks = LAB.pageHooks || [];
  /* Seamless tiles: the engine's paper recipe (fibre clouds at three scales, fibres, flecks)
     drawn so the tile wraps. The cloud grids are padded with their own far edge before they
     are smoothed up, and every fibre and fleck is drawn again one tile over in each direction,
     so the right edge runs straight into the left one and the bottom into the top.
     st: { paper, fibre, fleck, speck, dark, cloud (how strong the fibre clouds are, 1 = the engine's) }.
     Colors here are image data for the generator, not paint. */
  var tiles = {};
  function tileURL(key, st, k, seed) {
    if (tiles[key]) return tiles[key];
    var R = window.RISO, W = TILE, rnd = R.mulberry((seed * 2654435761) >>> 0), c = R.cv(W, W), x = c.getContext("2d"), fb = R.hexRGB(st.fibre), i, N;
    var copies = function (fn) { for (var oy = -W; oy <= W; oy += W) for (var ox = -W; ox <= W; ox += W) fn(ox, oy); };
    x.fillStyle = st.paper; x.fillRect(0, 0, W, W);
    [[13.8, 0.11], [5.45, 0.075], [2.4, 0.05]].forEach(function (o) {
      var n = Math.round(W / o[0]), m = n + 2, p = R.cv(m, m), px = p.getContext("2d"), img = px.createImageData(m, m), a = [], j, u, v;
      for (j = 0; j < n * n; j++) a.push(Math.pow(rnd(), 1.9) * 255 * o[1] * k * (st.cloud == null ? 1 : st.cloud) * (st.dark ? 1.6 : 1));
      for (v = 0; v < m; v++) for (u = 0; u < m; u++) {
        j = (v * m + u) * 4;
        img.data[j] = fb[0]; img.data[j + 1] = fb[1]; img.data[j + 2] = fb[2];
        img.data[j + 3] = a[((v + n - 1) % n) * n + (u + n - 1) % n];
      }
      px.putImageData(img, 0, 0);
      x.imageSmoothingEnabled = true;
      var cell = W / n; x.drawImage(p, -cell, -cell, W + 2 * cell, W + 2 * cell);
    });
    x.strokeStyle = st.fibre;
    for (i = 0, N = Math.round(W * W / 2600 * k); i < N; i++) {
      var fx = rnd() * W, fy = rnd() * W, len = 5 + rnd() * 20, an = rnd() * Math.PI, dx = Math.cos(an) * len, dy = Math.sin(an) * len;
      x.globalAlpha = (0.01 + rnd() * 0.018) * (st.dark ? 3 : 1); x.lineWidth = 0.5 + rnd() * 0.7;
      x.beginPath(); copies(function (ox, oy) { x.moveTo(fx + ox, fy + oy); x.lineTo(fx + ox + dx, fy + oy + dy); }); x.stroke();
    }
    for (i = 0, N = Math.round(W * W / 520 * k); i < N; i++) {
      x.globalAlpha = (0.012 + rnd() * 0.03) * (st.dark ? 2 : 1); x.fillStyle = rnd() < 0.55 ? st.fleck : st.speck;
      var sx = rnd() * W, sy = rnd() * W, sr = 0.4 + rnd();
      x.beginPath(); copies(function (ox, oy) { x.moveTo(sx + ox + sr, sy + oy); x.arc(sx + ox, sy + oy, sr, 0, 2 * Math.PI); }); x.fill();
    }
    x.globalAlpha = 1;
    tiles[key] = c.toDataURL("image/jpeg", 0.86);
    return tiles[key];
  }
  // the paper slips' stock: the palette's paper with ink-tinted fibres (as LAB.textureURL, but seamless)
  function paperTile(r) {
    var C = LAB.color;
    return tileURL("p" + r.paper + r.ink, { paper: r.paper, fibre: C.mix(r.paper, r.ink, 0.35), fleck: C.mix(r.paper, r.ink, 0.55), speck: "#ffffff", dark: false }, 1.2, 11);
  }
  // the day ground's fibres: white where there is no fibre, so multiplied in they only deepen the
  // ground, and in its own hue; the clouds are kept low (on a light ground they read as smudges)
  function dayTile(r) {
    var C = LAB.color;
    return tileURL("d" + r.ground + r.ink, { paper: "#ffffff", fibre: C.mix(r.ground, "#000000", 0.4), fleck: C.mix(r.ground, r.ink, 0.6), speck: "#ffffff", dark: false, cloud: 0.45 }, 0.9, 17);
  }
  // the night fibres: mid grey with lighter fibres and darker flecks, soft-lit over any dark
  // surface it adds grain without tinting it
  function nightTile() {
    return tileURL("n", { paper: "#808080", fibre: "#aaaaaa", fleck: "#4c4c4c", speck: "#000000", dark: true }, 1.05, 23);
  }
  // page hook: the texture tiles, and what the masthead plate is printed on
  LAB.pageHooks.push(function (doc, rc, banner) {
    var html = doc.documentElement, st = html.style;
    ["--s-grain-n", "--s-grain-d", "--s-paper-tex", "--s-mast-band"].forEach(function (p) { st.removeProperty(p); });
    html.removeAttribute("data-lab-mast"); html.removeAttribute("data-lab-mast-ink");
    if (!rc || rc.sysPalette === "today") return;
    var r = rolesFor(rc); if (!r) return;
    try {
      st.setProperty("--s-paper-tex", "url(" + paperTile(r) + ")");
      if (rc.texture === "grain") {
        if (rc.ground === "day") st.setProperty("--s-grain-d", "url(" + dayTile(r) + ")");
        else st.setProperty("--s-grain-n", "url(" + nightTile() + ")");
      }
    } catch (e) {}
    if (!banner || !banner.paper) return;
    // The plate's paper vanishes under the blend (darken on a light plate, lighten on a dark one) only
    // where the header is darker (lighter) than it in every channel. So the header is the ground when
    // the plate's paper is near it, else the nearest role of the same darkness (a role the blend can
    // already erase into may sit further away), and that color is then pulled, channel by channel,
    // just past the plate's paper. If it had to move, it is painted as a full-width band.
    var R = window.RISO, C = LAB.color, P = R.hexRGB(banner.paper), dark = C.lum(banner.paper) < 0.3;
    var dist = function (h) { var Q = R.hexRGB(h); return Math.sqrt(Math.pow(P[0] - Q[0], 2) + Math.pow(P[1] - Q[1], 2) + Math.pow(P[2] - Q[2], 2)); };
    var past = function (h) { return R.rgbHex(R.hexRGB(h).map(function (q, j) { return dark ? Math.max(q, P[j]) : Math.min(q, P[j]); })); };
    var target = null;
    if (dist(r.ground) < 16) target = r.ground;
    else {
      var best = null, bd = 1e9;
      ["ground-2", "ground-3", "paper", "paper-2", "ink", "text"].forEach(function (k) {
        if ((C.lum(r[k]) < 0.3) !== dark) return;
        var d = dist(r[k]) * (past(r[k]) === R.rgbHex(R.hexRGB(r[k])) ? 0.45 : 1);
        if (d < bd) { bd = d; best = k; }
      });
      if (best && bd < 40) target = r[best];
    }
    if (!target) { html.setAttribute("data-lab-mast", "slip"); return; }       // a pasted-on slip
    html.setAttribute("data-lab-mast-ink", dark ? "dark" : "light");
    var band = past(target);
    if (band === R.rgbHex(R.hexRGB(r.ground))) return;                         // printed straight on the ground
    st.setProperty("--s-mast-band", band); html.setAttribute("data-lab-mast", "band");
  });

  /* ---------- the display face: fitting other faces into Barlow Condensed's sizes ----------
     The site sets its display sizes (and wide tracking) for a narrow face. A
     page hook tags every element set in the display type
     (data-lab-disp; "lit" when the site hard-codes "Barlow Condensed" instead
     of var(--disp), "small" when the face cannot hold the size) and records its
     size in --s-fs0; the CSS below scales it by the face's fit, sets the face's
     own weight (no faux bold) and style, and pulls the tracking in on wide and
     script faces. Hard-coded
     "IBM Plex Mono" gets the same treatment for the data face (data-lab-mono).
     METRICS: advance width and cap height of each face against Barlow
     Condensed 700, measured on "THE DAILY 76-6 BUCKS WIZARDS HOW TO PLAY". */
  var METRICS = { barlow: [1, 1], barlow900: [1.04, 1], bigshoulders: [1.04, 1.14], anton: [1.03, 1.23], bebas: [0.84, 1], oswald: [1.15, 1.16],
    graduate: [1.46, 1.07], alfaslab: [1.63, 1.11], bowlby: [1.59, 1.06], teko: [0.99, 0.91], sixcaps: [0.51, 1.2], kanit: [1.35, 0.91], russo: [1.47, 1],
    staatliches: [0.92, 1], ultra: [1.74, 1.03], protest: [1.19, 1.03], shrikhand: [1.55, 0.96], righteous: [1.37, 1], monoton: [1.63, 1.16], bungee: [1.5, 1.03],
    bungeeshade: [1.74, 1.04], bungeeinline: [1.5, 1.03], titan: [1.46, 1.01], rubikmono: [2.08, 1], unbounded: [1.85, 1.07], dela: [1.85, 1.04],
    racing: [1.28, 0.91], chango: [2.03, 1], jersey10: [0.92, 0.77], yellowtail: [1.35, 1.03], pacifico: [1.65, 1.26], mrdafoe: [1.21, 1],
    knewave: [1.27, 1.13], sansita: [1.56, 1.03], abril: [1.39, 1], fraunces: [1.4, 1], playfair: [1.47, 1.01], sairastencil: [1.39, 0.99],
    blackops: [1.49, 0.93], rubikdirt: [1.46, 1.01], dmserif: [1.27, 0.94], plexmono: [1.47, 1] };
  var measured = {};
  function metrics(id) {
    if (METRICS[id]) return METRICS[id];
    if (measured[id]) return measured[id];
    var f = LAB.fonts && LAB.fonts[id], base = LAB.fonts && LAB.fonts.barlow; if (!f || !base) return [1, 1];
    try {
      var txt = "THE DAILY 76-6 BUCKS WIZARDS HOW TO PLAY", c = document.createElement("canvas").getContext("2d");
      var spec = function (g) { return (g.style || "normal") + " " + (g.weight || 700) + " 100px \"" + g.family + "\""; };
      if (!document.fonts || !document.fonts.check(spec(f), txt)) return [1, 1];
      c.font = spec(base); var bw = c.measureText(txt).width, bc = c.measureText("H").actualBoundingBoxAscent;
      c.font = spec(f); var m = [c.measureText(txt).width / bw, c.measureText("H").actualBoundingBoxAscent / bc];
      if (m[0] > 0 && m[1] > 0) measured[id] = m;
      return m;
    } catch (e) { return [1, 1]; }
  }
  function dispId(rc) { if (LAB.displayFace) { var f = LAB.displayFace(rc); if (f && f.id) return f.id; } return rc.disp && rc.disp !== "match" ? rc.disp : rc.font; }
  function dispFit(id) {
    var m = metrics(id), w = m[0], c = m[1], script = LAB.fonts && LAB.fonts[id] && LAB.fonts[id].group === "Script";
    // scripts lose legibility faster than they gain width, so they shrink less
    var f = Math.min(w <= 1.06 ? 1 : Math.pow(1 / w, script ? 0.55 : 0.85), c <= 1.05 ? 1 : 1 / Math.pow(c, script ? 0.6 : 1));
    if (w < 0.96 && c < 0.96) f = Math.min(1.12, 1 / Math.max(w, c));   // a small face grows back to the house size
    if (w < 0.75) f = 1.2;                                               // an ultra-condensed poster face needs size to read
    return Math.max(0.56, Math.round(f * 100) / 100);
  }
  // faces that turn to blobs or hairlines at chip size: below SMALL px (after the fit) the house
  // face sets those labels instead; headings and buttons keep the display face
  var SMALL = 12, POOR_SMALL = { shrikhand: 1, graduate: 1, monoton: 1, bungeeshade: 1, bungeeinline: 1, rubikdirt: 1, sixcaps: 1, sairastencil: 1 };
  function poorSmall(id) { var f = LAB.fonts && LAB.fonts[id]; return !!(POOR_SMALL[id] || (f && f.group === "Script")); }
  function typeCSS(rc) {
    var id = dispId(rc), f = LAB.fonts && LAB.fonts[id], s = "";
    if (!f) return s;
    var m = metrics(id), fit = dispFit(id), script = f.group === "Script";
    var T = "html[data-card] " + IS(["[data-lab-disp]"]), TF = "html[data-card] " + IS(['[data-lab-disp]:not([data-lab-disp="small"])']);
    s += rule("html[data-card]", "--s-dfit: " + fit + ";");
    s += rule(T, "font-size: calc(var(--s-fs0, 1em) * var(--s-dfit));" + (id !== "barlow" ? " font-weight: var(--t-disp-weight, 700); font-style: var(--t-disp-style, normal); font-synthesis: none;" : ""));
    s += rule("html[data-card] " + IS(['[data-lab-disp="lit"]']), "font-family: var(--disp);");
    if (script) s += rule(TF, "letter-spacing: 0;");
    else if (m[0] > 1.2) s += rule(TF, "letter-spacing: 0.01em;");
    // tiny labels in a face that cannot hold them: the house face at the site's own size
    s += rule("html[data-card] " + IS(['[data-lab-disp="small"]']), "font-family: \"Barlow Condensed\", var(--body); font-size: var(--s-fs0, 1em); font-weight: 700; font-style: normal;");
    s += rule("html[data-card] " + IS(["[data-lab-mono]"]), "font-family: var(--mono);");
    return s;
  }
  function firstFamily(ff) { return String(ff || "").split(",")[0].replace(/["']/g, "").trim(); }
  /* One-line button labels: the fit is set for the average word, so a long label in a wide face
     (Bungee, Bowlby, Chango, Rubik Mono) can still run past its button, and a small face grown back
     (Jersey 10) can push one over. Once the face has loaded, each button whose label is wider than
     its box gets its own, smaller --s-dfit (a few passes, since only the display parts shrink). */
  var BTN = "button, a.btn, a.qx-btn, a.act-share, a.hh-btn, a.rs-got, .qx-btn";
  // the width of a button's label: its text and in-flow children (an absolutely placed layer, like
  // the share switch's hidden checkbox, spans the whole button and is not part of the label)
  function labelWidth(doc, win, b) {
    var L = 1e9, Rt = -1e9, kids = b.childNodes, rg = doc.createRange(), i, n, r, w;
    for (i = 0; i < kids.length; i++) {
      n = kids[i];
      if (n.nodeType === 3) { if (!/\S/.test(n.nodeValue)) continue; rg.selectNodeContents(n); r = rg.getBoundingClientRect(); w = r.width; }
      else if (n.nodeType === 1) {
        var cs = win.getComputedStyle(n);
        if (cs.position === "absolute" || cs.position === "fixed" || cs.display === "none") continue;
        r = n.getBoundingClientRect(); w = Math.max(r.width, n.scrollWidth || 0);
      } else continue;
      if (!w) continue;
      L = Math.min(L, r.left); Rt = Math.max(Rt, r.left + w);
    }
    return Rt > L ? Rt - L : 0;
  }
  // The label may use the button's padding down to EDGE px a side (a label that reaches into a wide
  // padding still sits inside the button); it never shrinks below FLOOR of the page's fit.
  var EDGE = 5, FLOOR = 0.7;
  function fitButtons(doc, fit) {
    var win = doc.defaultView, list = doc.body ? doc.body.querySelectorAll(BTN) : [], pass, i, min = fit * FLOOR;
    for (pass = 0; pass < 3; pass++) {
      var todo = [];
      for (i = 0; i < list.length; i++) {
        var b = list[i];
        if (!b.hasAttribute("data-lab-disp") && !b.querySelector('[data-lab-disp]:not([data-lab-disp="small"])')) continue;
        var cs = win.getComputedStyle(b); if (cs.display === "none") continue;
        var avail = b.clientWidth - Math.min(EDGE, parseFloat(cs.paddingLeft) || 0) - Math.min(EDGE, parseFloat(cs.paddingRight) || 0); if (avail <= 8) continue;
        var w = labelWidth(doc, win, b), cur = parseFloat(cs.getPropertyValue("--s-dfit")) || fit;
        if (w > avail + 0.5 && cur > min + 0.001) todo.push([b, Math.max(min, Math.floor(cur * avail / w * 0.985 * 1000) / 1000)]);
      }
      if (!todo.length) return;
      todo.forEach(function (t) { t[0].setAttribute("data-lab-dfit", ""); t[0].style.setProperty("--s-dfit", String(t[1])); });
    }
  }
  // wait for the display face (the lab adds its stylesheet just before the hooks run), then fit
  function whenFace(doc, fam, cb) {
    var token = doc.__labFit = {}, tries = 0;
    (function poll() {
      if (doc.__labFit !== token) return;
      var ok = false;
      try { if (doc.fonts) doc.fonts.forEach(function (ff) { if (ff.family.replace(/["']/g, "") === fam && ff.status === "loaded") ok = true; }); } catch (e) {}
      if (ok || ++tries > 24) { try { cb(); } catch (e) {} return; }
      try { if (doc.fonts) doc.fonts.load("20px \"" + fam + "\"").catch(function () {}); } catch (e) {}
      setTimeout(poll, 200);
    })();
  }
  LAB.pageHooks.push(function (doc, rc) {
    var tagged = doc.querySelectorAll("[data-lab-disp], [data-lab-mono], [data-lab-dfit]"), i;
    for (i = 0; i < tagged.length; i++) {
      tagged[i].removeAttribute("data-lab-disp"); tagged[i].removeAttribute("data-lab-mono");
      if (tagged[i].hasAttribute("data-lab-dfit")) { tagged[i].removeAttribute("data-lab-dfit"); tagged[i].style.removeProperty("--s-dfit"); }
    }
    doc.__labFit = null;
    if (!rc || rc.sysPalette === "today" || !doc.body) return;
    var id = dispId(rc), f = LAB.fonts && LAB.fonts[id]; if (!f) return;
    var fam = f.family, swapDisp = id !== "barlow", swapMono = (rc.mono || "plexmono") !== "plexmono";
    if (!swapDisp && !swapMono) return;
    var fit = dispFit(id), poor = poorSmall(id);
    var win = doc.defaultView, els = doc.body.querySelectorAll("*"), todo = [];
    for (i = 0; i < els.length; i++) {                       // read everything first, then write
      var el = els[i], tag = el.tagName;
      if (/^(svg|SVG|path|g|CANVAS|IMG|SCRIPT|STYLE|BR|INPUT|circle|rect|ellipse|line|text)$/.test(tag)) continue;
      var cs = win.getComputedStyle(el), first = firstFamily(cs.fontFamily);
      var pcs = el.parentElement ? win.getComputedStyle(el.parentElement) : null, pfirst = pcs ? firstFamily(pcs.fontFamily) : "";
      // every element set in the display face is tagged, even one that looks inherited: a size the
      // site set explicitly (equal to its parent's today) would not follow the parent's new size
      if (swapDisp && (first === fam || first === "Barlow Condensed")) todo.push([el, poor && parseFloat(cs.fontSize) * fit < SMALL ? "small" : first === fam ? "on" : "lit", cs.fontSize]);
      else if (swapMono && first === "IBM Plex Mono" && first !== pfirst) todo.push([el, "mono"]);
    }
    todo.forEach(function (t) {
      if (t[1] === "mono") { t[0].setAttribute("data-lab-mono", ""); return; }
      t[0].style.setProperty("--s-fs0", t[2]); t[0].setAttribute("data-lab-disp", t[1]);
    });
    if (swapDisp) whenFace(doc, fam, function () { fitButtons(doc, fit); });
  });

  /* ---------- register ---------- */
  LAB.component({
    id: "surfaces",
    css: function (rc) {
      var r = rolesFor(rc || {}), s = "";
      s += textureCSS();
      s += paperDeepCSS(r);
      s += tunnelCSS() + paperCSS() + outlineCSS() + ticketCSS() + flatCSS();
      s += slipCSS();
      s += groundCSS();
      s += dayCSS();
      s += chromeCSS();
      s += typeCSS(rc || {});
      return s;
    }
  });
})();
