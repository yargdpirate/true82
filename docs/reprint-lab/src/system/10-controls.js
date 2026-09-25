/* ---------- TRUE 82 LAB: the controls layer ----------
   Buttons, chips, badges, inputs and links, written against the site's real
   selectors and switched by data-* on the snapshot's <html>:
     html[data-btn="keycap|offset|stamp|ticket|sticker|pill|neon|halftone"]
       buttons (every family), inputs and links
     html[data-chip="keycap|ink|outline|stamp"]
       chips, tags and the small badges

   How it is built (three layers of custom properties):
     1. Context  --c-*  what surface a control sits on. The site (night or
        day, from the roles) or a paper slip (results slips, the tag sheet,
        the riso reel). Paper slips print the primary action in navy ink, the
        way the v50 SHARE button does.
     2. Family   --k-* (buttons) and --q-* (chips): primary, yes, no (danger),
        secondary, ghost, text, icon; for chips yes, bad, plain, on.
        One meaning per color: accent = the main action, sunflower = yes (YES
        votes, trait tags), bad = NO and bad traits, riso blue = your vote,
        paper slab = a secondary action, outline = a quiet one.
     3. Style    paints the shape from those variables only.
   Colors come only from var(--t-<role>) (through color-mix). Radii come from
   --t-r-btn and --t-r-chip, so html[data-corners] reshapes everything.

   A page hook marks any light surface on the night table (a paper card from
   the card layer, say) with data-lab-paper, so controls on it print in the
   paper context too.

   Specificity: every rule sits under :is(#lab-k#lab-k, ...), which lifts it
   to two ids and beats the site's own rules (the heaviest are one id and a few
   classes) without !important. Only paint is touched (background, color,
   border, shadow, radius, transform on press); never display, size or layout,
   so hidden states ([hidden], .gone) keep working. */
(function () {
  var LAB = window.LAB;
  var BOOST = "#lab-k#lab-k";
  function IS(list) { return ":is(" + [BOOST].concat(list).join(", ") + ")"; }
  function F(list) { return IS(list) + NOT; }                         // a shaped button
  function rule(sel, body) { return sel + " { " + body + " }\n"; }
  function mix(a, pct, b) { return "color-mix(in srgb, " + a + " " + pct + "%, " + (b || "transparent") + ")"; }

  /* ---------- selectors ---------- */
  // never shaped as buttons here: the Daily plaque, the Tribune, chips, tiles, and the text and icon families (styled on their own)
  var NOT = ":not(.daily-tile, .np-read, .np-underbtn, .np-bundle, .tchip, .bt-tag, .sort-chip, .bt-tile, .gate-back, .du-exit, .hh-skip, .bt-change, .cv-link, .t-link, .cap-info, .trait-info-btn, .rs-close, .strap-info)";
  var FAM = {
    // the main action (also the default for every decorated button)
    pri: ["button.presti-spin", "a.btn", ".confirm-btn", ".hh-btn", ".gate-play-btn", ".rs-got", ".reel-done", ".bt-done",
      ".act-next", ".qx-btn.qx-play", ".tm-again", ".dt-act-share", ".btn-primary", ".weekly-tile"],
    // YES votes: sunflower everywhere, the ballot's yes
    yes: [".tm-vb", ".vbtn.v-yes", ".bt-big.yes"],
    // NO votes and the danger family
    no: [".tm-vb.no", ".vbtn.v-no", ".bt-big.no"],
    // secondary actions
    sec: [".skip-btn", ".mp-rules-btn", "button.more-modes", "#againBtn", ".startover-btn", ".donate-btn", ".v-unsure",
      "a.rs-ref-btn", ".btn-dark", ".arena-chip", ".arena-duelbtn"],
    // quiet outline buttons
    ghost: [".daily-strip", ".dt-act-ghost", ".hh-charity", ".reel-skip", ".hh-btn.hh-bref", ".tm-vb.idk", ".tm-sharebar",
      ".bt-big.idk", ".qx-btn:not(.qx-play)", ".act-share", ".btn-ghost"],
    // bare text buttons
    text: [".gate-back", ".du-exit", ".hh-skip", ".bt-change", ".cv-link", ".t-link"],
    // round icon buttons
    icon: [".cap-info", ".trait-info-btn", ".rs-close", ".strap-info"]
  };
  var BTN = FAM.pri.concat(FAM.yes, FAM.no, FAM.sec, FAM.ghost);     // shaped buttons
  var PRESS = ":is(:active, .pressed, .flashed, .expanded)";            // pressed or chosen
  // paper surfaces: the v50 slips, the tag sheet, the riso reel, plus any surface the page hook below finds printed light on the night table
  var PAPER = ["[data-lab-paper]", ".rr .rr-board", ".rr .bt-card", ".rr .twoway", ".rr .ledger", ".rr .rr-climb .climb", ".bt-sheet", ".reel-overlay.riso .reel-card"];
  // the same, plus the whole site printed on paper (for styles that change their make on paper, like neon)
  var PAPER_ALL = PAPER.concat(['html[data-ground="day"] body']);
  LAB.CTL = { FAM: FAM, NOT: NOT, PRESS: PRESS, PAPER: PAPER };        // shared with system/50-neon.js

  var INPUT = [".pool-search", ".search-input", ".browse-sel", ".share-out", ".arena-input", ".year-sel:not(.year-wrap .year-sel)"];
  var LINK = [".site-foot a", ".site-links a", ".static-links a", ".content-page a:not(.btn)", ".pr-bref", ".pr-team", ".res-comp .cl-link",
    ".bref-credit a", ".gate-scout a", ".rs-link", ".rs-ref-body a", ".bt-foot a"];

  function B(style) { return 'html[data-btn="' + style + '"] '; }
  function C(style) { return 'html[data-chip="' + style + '"] '; }

  /* ---------- 1. context ---------- */
  // the recipe's roles, so a few choices can follow the palette (a clashing offset, the ink that reads on sunflower)
  function rolesFor(rc) {
    var id = rc.sysPalette && rc.sysPalette !== "match" && rc.sysPalette !== "today" ? rc.sysPalette : rc.palette;
    try { return LAB.roles(LAB.palettes[id], rc.ground || "night"); } catch (e) { return null; }
  }
  function dist(a, b) { var A = window.RISO.hexRGB(a), Bq = window.RISO.hexRGB(b); return Math.sqrt(Math.pow(A[0] - Bq[0], 2) + Math.pow(A[1] - Bq[1], 2) + Math.pow(A[2] - Bq[2], 2)); }

  function contextCSS(rc) {
    var s = "", r = rolesFor(rc || {}), K = LAB.color;
    // the misregistered offset under a face of nearly the same color would vanish: print it in the key ink instead
    var clash = function (c) { return r && dist(c, r.offset) < 110; };
    var offPri = clash(r && r.accent) ? "var(--t-text)" : "var(--t-offset)";
    var offYesSite = clash(r && r.sun) ? "var(--t-text)" : "var(--t-offset)", offYesPaper = clash(r && r.sun) ? "var(--t-ink)" : "var(--t-offset)";
    var offBadSite = clash(r && r.bad) ? "var(--t-text)" : "var(--t-offset)", offBadPaper = clash(r && r.bad) ? "var(--t-ink)" : "var(--t-offset)";
    // label on sunflower (yes) and on the bad fill when printed on paper: whichever of navy ink and paper reads better
    var yesInk = r && K.contrast(r.sun, r.ink) < K.contrast(r.sun, r.paper) ? "var(--t-paper)" : "var(--t-ink)";
    var badInkP = r && K.contrast(r.bad, r.ink) < 3.2 && K.contrast(r.bad, r.paper) > K.contrast(r.bad, r.ink) ? "var(--t-paper)" : "var(--t-ink)";
    // neon tubes must glow against their dark plate: take the first of these inks that stands off it
    var night = (rc.ground || "night") === "night";
    var tube = function (plate, names) {
      if (!r) return "var(--t-" + names[0] + ")";
      for (var i = 0; i < names.length; i++) if (r[names[i]] && K.contrast(r[names[i]], plate) >= 3.4) return "var(--t-" + names[i] + ")";
      return "var(--t-" + (night ? "text" : "ground") + ")";
    };
    var sitePlate = r ? (night ? K.mix(r.ground, r.shadow, 0.28) : r.text) : "#000000", paperPlate = r ? r.ink : "#000000";
    var neon = function (plate, which) {
      return "--c-neon-pri: " + tube(plate, ["accent", "sun", "offset", which]) + "; --c-neon-yes: " + tube(plate, ["sun", "accent", "offset", which]) +
        "; --c-neon-bad: " + tube(plate, ["bad", "offset", which]) + ";";
    };
    // an ink used as type (stamp labels, outline chips) must read on its surface: lift or deepen it through color-mix until it does
    // (bg: one hex or a list, all must pass; min: the contrast to reach, 4 by default)
    var readable = function (name, bg, toward, min) {
      if (!r || !r[name] || !bg) return "var(--t-" + name + ")";
      var bgs = [].concat(bg), need = min || 4, towardHex = toward === "light" ? r.light : r.shadow;
      var ok = function (c) { for (var i = 0; i < bgs.length; i++) if (K.contrast(c, bgs[i]) < need) return false; return true; };
      for (var t = 0; t <= 0.8; t += 0.1) {
        if (ok(K.mix(r[name], towardHex, t))) return t < 0.05 ? "var(--t-" + name + ")" : mix("var(--t-" + name + ")", Math.round(100 - t * 100), "var(--t-" + toward + ")");
      }
      return mix("var(--t-" + name + ")", 20, "var(--t-" + toward + ")");
    };
    // chip labels sit on a tint of their own ink (outline 24%, stamp 20%) over the row: small type, so 4.5:1 against that tinted plate
    var tinted = function (ink, grounds) { return r ? grounds.map(function (g) { return K.mix(r[g], r[ink], 0.24); }) : null; };
    var chipTones = function (grounds, yes, bad, toward) {
      return "--c-yes-ctone: " + readable(yes, tinted("sun", grounds), toward, 4.5) + "; --c-bad-ctone: " + readable(bad, tinted("bad", grounds), toward, 4.5) + ";";
    };
    // a label printed ON a fill (small type: aim for 4.5:1): the first palette ink that reads, else the better of ink and paper pushed toward black or white until it does
    var labelOn = function (bg, names) {
      if (!r || !bg) return "var(--t-" + names[0] + ")";
      for (var i = 0; i < names.length; i++) if (r[names[i]] && K.contrast(r[names[i]], bg) >= 4.5) return "var(--t-" + names[i] + ")";
      var best = K.contrast(r.ink, bg) >= K.contrast(r.paper, bg) ? "ink" : "paper";
      var toward = K.lum(r[best]) < K.lum(bg) ? "shadow" : "light";
      for (var t = 0.1; t <= 0.9; t += 0.1) if (K.contrast(K.mix(r[best], r[toward], t), bg) >= 4.5) return mix("var(--t-" + best + ")", Math.round(100 - t * 100), "var(--t-" + toward + ")");
      return "var(--t-" + toward + ")";
    };
    var badLab = labelOn(r && r.bad, ["ink", "paper", "bad-ink", "text", "ground"]);
    var goodLab = labelOn(r && r.good, ["ink", "paper", "text", "ground"]);
    var siteTones = night ?
      "--c-pri-tone: " + readable("accent", r && r.ground, "light") + "; --c-yes-tone: " + readable("sun", r && r.ground, "light") + "; --c-bad-tone: " + readable("bad", r && r.ground, "light") + ";" :
      "--c-pri-tone: var(--t-text); --c-yes-tone: " + readable("sun-ink", r && r.ground, "shadow") + "; --c-bad-tone: " + readable("bad-ink", r && r.ground, "shadow") + ";";
    siteTones += night ? chipTones(["ground", "ground-2"], "sun", "bad", "light") : chipTones(["ground", "ground-2"], "sun-ink", "bad-ink", "shadow");
    var paperTones = "--c-yes-tone: " + readable("sun-ink", r && r.paper, "shadow") + "; --c-bad-tone: " + readable("bad-ink", r && r.paper, "shadow") + ";" +
      chipTones(["paper", "paper-2"], "sun-ink", "bad-ink", "shadow");
    // secondary buttons print on a paper slab, unless the palette's accent is itself paper colored (then a dark well)
    var sheet = r && r.paper && dist(r.accent, r.paper) < 90 && (rc.ground || "night") === "night" ?
      "--c-sheet: var(--t-ground-3); --c-sheet-ink: var(--t-text); --c-sheet-edge: " + mix("var(--t-ground-3)", 60, "var(--t-shadow)") + "; --c-sheet-bd: var(--t-line);" :
      "--c-sheet: var(--t-paper); --c-sheet-ink: var(--t-ink); --c-sheet-edge: var(--t-paper-2); --c-sheet-bd: transparent;";
    s += rule("html[data-btn]",
      "--c-bg: var(--t-ground); --c-fg: var(--t-text); --c-fg2: var(--t-text-2); --c-line: var(--t-line); --c-well: var(--t-ground-3);" +
      "--c-pri: var(--t-accent); --c-pri-hi: var(--t-accent-hi); --c-pri-edge: var(--t-accent-edge); --c-pri-ink: var(--t-accent-ink);" + siteTones +
      // yes is sunflower everywhere (the ballot's yes), so a palette's YES never changes color between screens
      "--c-yes: var(--t-sun); --c-yes-hi: " + mix("var(--t-sun)", 70, "var(--t-light)") + "; --c-yes-edge: var(--t-sun-edge); --c-yes-ink: " + yesInk + ";" +
      "--c-bad: var(--t-bad); --c-bad-edge: var(--t-bad-edge); --c-bad-ink: var(--t-bad-ink); --c-bad-lab: " + badLab + "; --c-good-lab: " + goodLab + ";" +
      sheet +
      "--c-plate: " + mix("var(--t-ground)", 72, "var(--t-shadow)") + "; --c-plate-ink: var(--t-text);" +
      "--c-ring: var(--t-text); --c-off: var(--t-offset); --c-dis: var(--t-text-2);" +
      "--c-off-pri: " + offPri + "; --c-off-yes: " + offYesSite + "; --c-off-bad: " + offBadSite + ";" + neon(sitePlate, night ? "text" : "ground"));
    // the whole site printed on paper
    s += rule('html[data-btn][data-ground="day"]',
      "--c-sheet: var(--t-paper); --c-sheet-bd: var(--t-text);" +
      "--c-plate: var(--t-text); --c-plate-ink: var(--t-ground); --c-ring: var(--t-text);");
    // light surfaces (paper slips, paper cards): buttons look exactly as they do everywhere else. Only what a
    // see-through control prints straight onto the surface follows it, so outline labels, chip text and
    // field text stay readable. (No paper-only faces, plates or flat-ink variants: owner's call, 2026-09-25.)
    var paper = "--c-bg: var(--t-paper); --c-fg: var(--t-ink); --c-fg2: var(--t-ink-2); --c-line: color-mix(in srgb, var(--t-line-paper) 26%, var(--t-paper)); --c-well: var(--t-paper-2);" +
      paperTones + "--c-ring: var(--t-ink); --c-dis: var(--t-ink-2);";
    s += rule("html[data-btn] " + IS(PAPER), paper);
    return s;
  }

  /* ---------- 2. button families ---------- */
  function famCSS(pre) {
    var s = "", A = pre + F(BTN) + ", " + pre + IS(FAM.icon);
    s += rule(A, "--k-face: var(--c-pri); --k-hi: var(--c-pri-hi); --k-edge: var(--c-pri-edge); --k-ink: var(--c-pri-ink); --k-tone: var(--c-pri-tone);" +
      "--k-neon: var(--c-neon-pri); --k-off: var(--c-off-pri); --k-bd: transparent;");
    s += rule(pre + F(FAM.yes), "--k-face: var(--c-yes); --k-hi: var(--c-yes-hi); --k-edge: var(--c-yes-edge); --k-ink: var(--c-yes-ink); --k-tone: var(--c-yes-tone); --k-neon: var(--c-neon-yes); --k-off: var(--c-off-yes);");
    var BAD = "--k-face: var(--c-bad); --k-hi: " + mix("var(--c-bad)", 78, "var(--t-light)") + "; --k-edge: var(--c-bad-edge); --k-ink: var(--c-bad-ink); --k-tone: var(--c-bad-tone); --k-neon: var(--c-neon-bad); --k-off: var(--c-off-bad);";
    s += rule(pre + F(FAM.no), BAD);
    s += rule(pre + F(FAM.sec), "--k-face: var(--c-sheet); --k-hi: " + mix("var(--c-sheet)", 80, "var(--t-light)") + "; --k-edge: var(--c-sheet-edge); --k-ink: var(--c-sheet-ink); --k-tone: var(--c-fg);" +
      "--k-neon: var(--c-plate-ink); --k-bd: var(--c-sheet-bd); --k-off: var(--c-off);");
    s += rule(pre + F(FAM.ghost), "--k-face: transparent; --k-hi: transparent; --k-edge: transparent; --k-ink: var(--c-fg); --k-tone: var(--c-fg2);" +
      "--k-neon: " + mix("var(--c-plate-ink)", 70) + "; --k-bd: var(--c-line);");
    // the Presti reroll flashes (state classes sit outside :is() so they outrank any style's family tweaks)
    s += rule(pre + F([".skip-btn"]) + ".firesale", BAD);
    s += rule(pre + F([".skip-btn"]) + ".refunded", "--k-face: var(--t-good); --k-hi: " + mix("var(--t-good)", 88, "var(--t-light)") + "; --k-edge: " + mix("var(--t-good)", 60, "var(--t-shadow)") + "; --k-ink: var(--c-good-lab); --k-tone: var(--t-good); --k-neon: var(--t-good);");
    return s;
  }

  /* shared by every style except keycap */
  function sharedCSS(st) {
    var s = "", P = B(st), A = P + F(BTN);
    // text buttons: no chrome in any style
    s += rule(P + IS(FAM.text), "background: none; border: 0; box-shadow: none; text-shadow: none; color: var(--c-fg2); transform: none;");
    s += rule(P + IS(FAM.text) + ":active", "color: var(--c-pri-tone); transform: none; box-shadow: none;");
    s += rule(P + IS([".du-exit", ".gate-back"]), "color: var(--c-fg);");
    // corners, transitions
    s += rule(A, "border-radius: var(--t-r-btn); transition: transform 80ms ease, box-shadow 80ms ease, background-color 120ms ease, color 120ms ease, filter 120ms ease;");
    s += rule(A + ":focus-visible", "outline: 2px solid var(--c-ring); outline-offset: 3px;");
    s += rule(P + IS(FAM.text) + ":focus-visible", "outline: 2px solid var(--c-ring); outline-offset: 2px; border-radius: 3px;");
    // the elite share: a sunflower ring instead of the pulsing offset
    s += rule(P + F(["#shareTeamBtn.elite-result"]), "animation: none; outline: 2px solid var(--t-sun); outline-offset: 3px;");
    return s;
  }
  /* disabled: every style, printed flat and dashed so it reads as off */
  var DISABLED = "background: " + mix("var(--c-fg)", 7) + "; color: " + mix("var(--c-dis)", 85) + "; border: 1.5px dashed " + mix("var(--c-fg)", 28) + ";" +
    "box-shadow: none; text-shadow: none; transform: none; filter: none; cursor: not-allowed; -webkit-mask: none; mask: none; outline: 0;";
  function disabledCSS(st) {
    return rule(B(st) + F(BTN.concat(FAM.icon)) + ":disabled", DISABLED);
  }
  /* icon buttons (the i discs, the sheet close): round, per style */
  function iconCSS(st, body, pressed) {
    var P = B(st), I = P + IS(FAM.icon);
    return rule(I, "border-radius: 50%; " + body) + rule(I + ":not(:disabled)" + ":is(:active, [aria-expanded=true])", pressed) +
      rule(P + IS([".rs-close"]), "border-radius: var(--t-r-btn);") + rule(I + ":focus-visible", "outline: 2px solid var(--c-ring); outline-offset: 2px;");
  }

  /* ---------- 3. button styles ---------- */
  var STYLES = {};

  // KEYCAP: today's extruded shape. Tokens already recolor it; only the
  // families the decorator flattened into amber keycaps get their own look back.
  STYLES.keycap = function () {
    var P = B("keycap"), s = "";
    s += rule(P + F(BTN), "border-radius: var(--t-r-btn);");
    s += rule(P + F([".vbtn", ".bt-big", ".tm-vb", ".act-next", ".qx-btn", ".v-unsure", ".act-share", ".mp-rules-btn"]), "border-radius: calc(var(--t-r-btn) * 1.6);");
    // ghosts: outline, no extrusion (they were authored this way; presti-spin painted over them)
    s += rule(P + F(FAM.ghost),
      "background: transparent; color: var(--c-fg); border: 1.5px solid var(--c-line); box-shadow: none;");
    s += rule(P + F([".dt-act-ghost", ".daily-strip", ".tm-vb.idk", ".bt-big.idk"]), "border-style: dashed; color: var(--c-fg2);");
    s += rule(P + F(FAM.ghost) + ":not(:disabled)" + PRESS, "transform: translateY(1px); box-shadow: none; color: var(--c-pri-tone); border-color: var(--c-pri-tone);");
    s += rule(P + IS(FAM.text), "background: none; border: 0; box-shadow: none; color: var(--c-fg2); transform: none;");
    s += rule(P + IS([".du-exit", ".gate-back"]), "color: var(--c-fg);");
    s += rule(P + IS(FAM.text) + ":active", "color: var(--c-pri-tone); transform: none; box-shadow: none;");
    // YES is sunflower in every style (one meaning per color): today's YES keycaps used the accent
    var YESK = P + F([".tm-vb", ".vbtn.v-yes"]) + ":not(.no, .idk)";
    s += rule(YESK, "background: linear-gradient(180deg, var(--k-hi) 0%, var(--k-face) 55%, var(--k-face) 100%); color: var(--k-ink);" +
      "box-shadow: inset 0 1px 0 " + mix("var(--t-light)", 40) + ", 0 4px 0 var(--k-edge), 0 8px 12px -6px " + mix("var(--t-shadow)", 60) + ";");
    s += rule(YESK + ":not(:disabled)" + PRESS, "transform: translateY(3px); box-shadow: inset 0 1px 0 " + mix("var(--t-light)", 25) + ", 0 1px 0 var(--k-edge), 0 3px 6px -4px " + mix("var(--t-shadow)", 60) + ";");
    // secondary keycaps (Skip team, Skip era, How to play, a price) print as a paper slab, so the accent keycap is the one next step.
    // Painted from --k-*, so the Presti refund and fire-sale flashes (famCSS) still recolor them. The results print keeps its own buttons.
    var SEC = P + F(FAM.sec) + ":is(.presti-spin, .more-modes):not(.rr *):not(:disabled)";
    s += rule(SEC, "background: linear-gradient(180deg, var(--k-hi) 0%, var(--k-face) 48%, var(--k-face) 100%); color: var(--k-ink);" +
      "box-shadow: inset 0 0 0 1.5px var(--k-bd), inset 0 1px 0 " + mix("var(--t-light)", 45) + ", 0 5px 0 0 var(--k-edge), 0 7px 9px -3px " + mix("var(--t-shadow)", 50) + ";");
    s += rule(SEC + PRESS, "transform: translateY(4px);" +
      "box-shadow: inset 0 0 0 1.5px var(--k-bd), inset 0 1px 0 " + mix("var(--t-light)", 35) + ", 0 1px 0 0 var(--k-edge), 0 2px 4px -2px " + mix("var(--t-shadow)", 45) + ";");
    // "Play TRUE 82" on the explainer pages printed its label in the ground color (cream on a light keycap by day)
    s += rule(P + F(["a.btn"]), "color: var(--spin-ink, var(--t-accent-ink));");
    // the riso reel skip: the keycap gradient used to paint under navy type
    s += rule(P + F([".reel-overlay.riso .reel-skip"]), "border-color: var(--t-ink); color: var(--t-ink);");
    s += disabledCSS("keycap");
    return s;
  };

  // OFFSET: a flat ink face on a hard misregistered shadow (the v50 SHARE button).
  STYLES.offset = function () {
    var st = "offset", P = B(st), A = P + F(BTN), s = sharedCSS(st);
    s += rule(A, "background: var(--k-face); color: var(--k-ink); border: 0; box-shadow: 4px 4px 0 var(--k-off); text-shadow: none; transform: none;");
    s += rule(P + F(FAM.sec), "box-shadow: inset 0 0 0 1.5px var(--k-bd), 4px 4px 0 var(--k-off);");
    s += rule(P + F(FAM.ghost), "background: transparent; color: var(--k-ink); box-shadow: inset 0 0 0 1.5px var(--k-bd);");
    s += rule(P + F([".dt-act-ghost", ".daily-strip", ".tm-vb.idk", ".bt-big.idk"]), "box-shadow: none; border: 1.5px dashed var(--c-line); color: var(--c-fg2);");
    s += rule(A + ":not(:disabled)" + PRESS, "transform: translate(4px, 4px); box-shadow: 0 0 0 var(--k-off);");
    s += rule(P + F(FAM.sec) + ":not(:disabled)" + PRESS, "box-shadow: inset 0 0 0 1.5px var(--k-bd), 0 0 0 var(--k-off);");
    s += rule(P + F(FAM.ghost) + ":not(:disabled)" + PRESS, "transform: translate(1px, 1px); background: " + mix("var(--c-fg)", 10) + "; box-shadow: inset 0 0 0 1.5px var(--c-fg); color: var(--c-fg);");
    s += iconCSS(st, "background: var(--k-face); color: var(--k-ink); border: 0; box-shadow: 2px 2px 0 var(--k-off);", "transform: translate(2px, 2px); box-shadow: 0 0 0 var(--k-off);");
    s += disabledCSS(st);
    return s;
  };

  // STAMP: a rubber stamp. Ink outline with a second hairline inside, clear
  // face; pressing (or choosing) fills it with the ink.
  STYLES.stamp = function () {
    var st = "stamp", P = B(st), A = P + F(BTN), s = sharedCSS(st);
    s += rule(A, "background: transparent; color: var(--k-tone); border: 2px solid var(--k-tone); box-shadow: none; text-shadow: none; transform: none;" +
      "outline: 1px solid " + mix("var(--k-tone)", 75) + "; outline-offset: -5px;");
    s += rule(P + F(FAM.ghost), "border: 1.5px dashed " + mix("var(--k-tone)", 70) + "; outline: 0; color: var(--c-fg2);");
    s += rule(A + ":not(:disabled)" + PRESS, "background: var(--k-tone); color: var(--c-bg); outline-color: " + mix("var(--c-bg)", 60) + "; transform: rotate(-1deg) scale(0.98);");
    s += rule(P + F(FAM.ghost) + ":not(:disabled)" + PRESS, "background: " + mix("var(--c-fg)", 12) + "; color: var(--c-fg); border-color: var(--c-fg); transform: none;");
    s += rule(A + ":focus-visible", "outline: 2px solid var(--c-ring); outline-offset: 3px;");
    s += iconCSS(st, "background: transparent; color: var(--k-tone); border: 2px solid var(--k-tone); box-shadow: none;", "background: var(--k-tone); color: var(--c-bg); transform: none;");
    s += disabledCSS(st);
    return s;
  };

  // TICKET: notched ends (a mask bites a half circle from each end) and a
  // dashed perforation just inside each end, like a tear-off stub.
  STYLES.ticket = function () {
    var st = "ticket", P = B(st), A = P + F(BTN), s = sharedCSS(st);
    var m = "var(--t-shadow)";
    var mask = "radial-gradient(circle var(--k-n) at 0 50%, transparent 96%, " + m + ") left / 51% 100% no-repeat, " +
      "radial-gradient(circle var(--k-n) at 100% 50%, transparent 96%, " + m + ") right / 51% 100% no-repeat";
    var perf = "linear-gradient(var(--k-perf) 55%, transparent 0) left calc(var(--k-n) + 4px) top 3px / 1.5px 6px repeat-y, " +
      "linear-gradient(var(--k-perf) 55%, transparent 0) right calc(var(--k-n) + 4px) top 3px / 1.5px 6px repeat-y";
    // every ticket gets the bites; the wide ones also get the tear lines (small ones would cut through their label)
    // the label keeps clear of the bites and the tear lines: side padding = bite + tear line inset + 6px (the ticket sets its own margins)
    s += rule(A, "--k-n: 5px; --k-perf: transparent; --k-tear: 0px; background: " + perf + ", var(--k-face); color: var(--k-ink); border: 0; box-shadow: none; text-shadow: none; transform: none;" +
      "-webkit-mask: " + mask + "; mask: " + mask + "; border-radius: var(--t-r-btn);" +
      "padding-left: calc(var(--k-n) + var(--k-tear) + 6px); padding-right: calc(var(--k-n) + var(--k-tear) + 6px);");
    s += rule(P + F(FAM.sec), "box-shadow: inset 0 0 0 1.5px var(--k-bd);");
    s += rule(P + F(FAM.ghost), "background: " + perf + "; color: var(--k-ink); box-shadow: inset 0 0 0 1.5px var(--c-line);");
    s += rule(P + F([".btn-block", ".confirm-btn", ".vbtn", ".bt-big", ".act-next", ".qx-btn", ".act-share", ".v-unsure", ".gate-play-btn", ".hh-btn", ".hh-charity",
      ".rs-got:not(.rs-ref-btn)", "#againBtn", ".tm-sharebar", ".tm-vb:not(.idk)", ".bt-done", ".tm-again"]), "--k-n: 8px; --k-tear: 5.5px; --k-perf: " + mix("var(--k-ink)", 38) + ";");
    // a long label wraps inside the tear lines instead of running across them
    s += rule(P + F([".qx-btn", ".tm-sharebar", ".hh-charity", ".act-share", ".v-unsure"]), "white-space: normal; text-wrap: balance;");
    s += rule(A + ":not(:disabled)" + PRESS, "background-color: " + mix("var(--k-face)", 84, "var(--t-shadow)") + "; transform: translateY(1px);");
    s += rule(P + F(FAM.ghost) + ":not(:disabled)" + PRESS, "background-color: " + mix("var(--c-fg)", 12) + "; color: var(--c-fg); box-shadow: inset 0 0 0 1.5px var(--c-fg);");
    s += rule(A + ":focus-visible", "outline: 0; box-shadow: inset 0 0 0 2.5px var(--c-ring);");
    s += iconCSS(st, "background: var(--k-face); color: var(--k-ink); border: 1.5px dashed " + mix("var(--k-ink)", 45) + "; box-shadow: none;", "background: " + mix("var(--k-face)", 84, "var(--t-shadow)") + "; transform: translateY(1px);");
    s += disabledCSS(st);
    return s;
  };

  // STICKER: a die-cut vinyl sticker. Face, a thick paper-white edge, a soft drop.
  STYLES.sticker = function () {
    var st = "sticker", P = B(st), A = P + F(BTN), s = sharedCSS(st);
    var edge = mix("var(--t-paper)", 55, "var(--t-light)");
    s += rule(A, "--k-cut: " + edge + "; background: linear-gradient(170deg, " + mix("var(--t-light)", 22) + ", transparent 42%), var(--k-face); color: var(--k-ink); border: 0; text-shadow: none; transform: none;" +
      "box-shadow: 0 0 0 3px var(--k-cut), 0 5px 9px -2px " + mix("var(--t-shadow)", 55) + ", 0 1px 2px 3px " + mix("var(--t-shadow)", 22) + ";");
    s += rule(P + F(FAM.sec), "--k-face: var(--c-well); --k-ink: var(--c-fg);");
    s += rule(P + F(FAM.ghost), "background: transparent; color: var(--k-ink); box-shadow: inset 0 0 0 2px var(--c-line);");
    s += rule(P + F([".dt-act-ghost", ".daily-strip", ".tm-vb.idk", ".bt-big.idk"]), "box-shadow: none; border: 2px dashed var(--c-line); color: var(--c-fg2);");
    s += rule(A + ":not(:disabled)" + PRESS, "transform: translateY(2px) scale(0.985); box-shadow: 0 0 0 3px var(--k-cut), 0 1px 2px " + mix("var(--t-shadow)", 55) + ";");
    s += rule(P + F(FAM.ghost) + ":not(:disabled)" + PRESS, "background: " + mix("var(--c-fg)", 12) + "; box-shadow: inset 0 0 0 2px var(--c-fg); color: var(--c-fg);");
    s += iconCSS(st, "background: var(--k-face); color: var(--k-ink); border: 0; box-shadow: 0 0 0 2px " + edge + ", 0 3px 5px -1px " + mix("var(--t-shadow)", 55) + ";",
      "transform: translateY(1px); box-shadow: 0 0 0 2px " + edge + ", 0 1px 1px " + mix("var(--t-shadow)", 55) + ";");
    s += disabledCSS(st);
    return s;
  };

  // PILL: fully round, flat and calm.
  STYLES.pill = function () {
    var st = "pill", P = B(st), A = P + F(BTN), s = sharedCSS(st);
    s += rule(A, "border-radius: 999px; background: var(--k-face); color: var(--k-ink); border: 0; box-shadow: none; text-shadow: none; transform: none;");
    s += rule(P + F(FAM.sec), "--k-face: var(--c-well); --k-ink: var(--c-fg);");
    s += rule(P + F(FAM.ghost), "background: transparent; color: var(--k-ink); box-shadow: inset 0 0 0 1.5px var(--c-line);");
    s += rule(A + ":not(:disabled)" + PRESS, "background-color: " + mix("var(--k-face)", 82, "var(--t-shadow)") + "; transform: scale(0.97);");
    s += rule(P + F(FAM.ghost) + ":not(:disabled)" + PRESS, "background: " + mix("var(--c-fg)", 12) + "; color: var(--c-fg); box-shadow: inset 0 0 0 1.5px var(--c-fg);");
    s += rule(P + IS([".rs-close"]), "border-radius: 50%;");
    s += iconCSS(st, "background: var(--k-face); color: var(--k-ink); border: 0; box-shadow: none;", "background: " + mix("var(--k-face)", 82, "var(--t-shadow)") + "; transform: scale(0.94);");
    s += rule(P + IS([".rs-close"]), "border-radius: 50%;");
    s += disabledCSS(st);
    return s;
  };

  // NEON: a dark plate, a bright tube round the edge, a glow on the type.
  // The vote is read by shape, not only by hue: YES is a lit panel (the tube
  // filled with light, dark type), NO an outline tube on a plate tinted with
  // the bad color, the secondary family a dimmer tube so the votes lead.
  // Neon looks the same on every surface, paper included.
  STYLES.neon = function () {
    var st = "neon", P = B(st), A = P + F(BTN), s = sharedCSS(st);
    var glow = function (a, b) { return "0 0 0 1px " + mix("var(--k-neon)", 30) + ", 0 0 " + a + "px " + mix("var(--k-neon)", 60) + ", 0 0 " + b + "px -2px " + mix("var(--k-neon)", 45) + ", inset 0 0 9px " + mix("var(--k-neon)", 32); };
    var halo = function (a, b) { return "0 0 0 1px " + mix("var(--k-neon)", 35) + ", 0 0 " + a + "px " + mix("var(--k-neon)", 62) + ", 0 0 " + b + "px -2px " + mix("var(--k-neon)", 48); };
    s += rule(A, "background: var(--c-plate); color: " + mix("var(--k-neon)", 62, "var(--t-light)") + "; border: 1.5px solid var(--k-neon); transform: none;" +
      "box-shadow: " + glow(8, 20) + "; text-shadow: 0 0 6px " + mix("var(--k-neon)", 85) + ", 0 0 14px " + mix("var(--k-neon)", 45) + ";");
    // secondary (Skip, How to play, UNSURE): half-lit, so the main action and the votes lead
    s += rule(P + F(FAM.sec), "--k-neon: " + mix("var(--c-plate-ink)", 50, "var(--c-plate)") + ";");
    // YES: the lit panel. The tube color fills the face (it reads on the plate, so the plate reads on it)
    var YES = P + F(FAM.yes) + ":not(.no, .idk)";
    s += rule(YES, "background: radial-gradient(120% 95% at 50% 30%, " + mix("var(--k-neon)", 72, "var(--t-light)") + ", var(--k-neon) 72%); color: var(--c-plate);" +
      "border: 1.5px solid " + mix("var(--k-neon)", 55, "var(--t-light)") + "; text-shadow: none; box-shadow: " + halo(10, 26) + ";");
    // NO: an outline tube on a plate washed with the bad color
    s += rule(P + F(FAM.no), "background: " + mix("var(--k-neon)", 24, "var(--c-plate)") + "; border: 2px solid var(--k-neon);");
    s += rule(P + F(FAM.ghost), "background: transparent; color: var(--c-fg); border: 1px solid " + mix("var(--c-fg)", 35) + "; box-shadow: none; text-shadow: none;");
    s += rule(A + ":not(:disabled)" + PRESS, "background: " + mix("var(--k-neon)", 22, "var(--c-plate)") + "; color: var(--t-light); box-shadow: " + glow(14, 32) + "; transform: scale(0.98);");
    // a chosen vote keeps its face and gets a second tube round it
    var RING = "0 0 0 2px var(--c-plate), 0 0 0 4px " + mix("var(--k-neon)", 80, "var(--t-light)") + ", ";
    s += rule(YES + ":not(:disabled)" + PRESS, "background: radial-gradient(120% 95% at 50% 30%, " + mix("var(--k-neon)", 60, "var(--t-light)") + ", var(--k-neon) 72%); color: var(--c-plate); box-shadow: " + RING + halo(16, 34) + ";");
    s += rule(P + F(FAM.no) + ":not(:disabled)" + PRESS, "background: " + mix("var(--k-neon)", 36, "var(--c-plate)") + "; box-shadow: " + RING + glow(14, 32) + ";");
    s += rule(P + F(FAM.ghost) + ":not(:disabled)" + PRESS, "background: transparent; color: var(--t-accent); border-color: var(--t-accent); box-shadow: 0 0 10px " + mix("var(--t-accent)", 45) + "; text-shadow: 0 0 6px " + mix("var(--t-accent)", 70) + ";");
    s += iconCSS(st, "background: var(--c-plate); color: " + mix("var(--k-neon)", 62, "var(--t-light)") + "; border: 1.5px solid var(--k-neon); box-shadow: " + glow(6, 14) + "; text-shadow: 0 0 5px var(--k-neon);",
      "background: " + mix("var(--k-neon)", 25, "var(--c-plate)") + "; transform: scale(0.95);");
    s += disabledCSS(st);
    return s;
  };

  // HALFTONE: the face printed as a dot screen that thickens toward the
  // bottom, a key-ink rim and a misregistered offset.
  STYLES.halftone = function () {
    var st = "halftone", P = B(st), A = P + F(BTN), s = sharedCSS(st);
    var dots = "radial-gradient(circle at 50% 50%, var(--k-dot) 0 1.15px, transparent 1.55px) 0 0 / 4px 4px";
    var fade = "linear-gradient(180deg, var(--k-face) 8%, " + mix("var(--k-face)", 0) + " 88%)";
    s += rule(A, "--k-dot: " + mix("var(--k-edge)", 80, "var(--k-face)") + "; background: " + fade + ", " + dots + ", var(--k-face); color: var(--k-ink); text-shadow: none; transform: none;" +
      "border: 2px solid var(--k-rim, var(--k-edge)); box-shadow: 3px 3px 0 var(--k-off);");
    s += rule(P + F(FAM.sec), "--k-rim: var(--c-sheet-ink); --k-dot: " + mix("var(--c-sheet-ink)", 38, "var(--k-face)") + ";");
    s += rule(P + F(FAM.ghost), "--k-dot: " + mix("var(--c-fg)", 22) + "; background: linear-gradient(180deg, var(--c-bg) 25%, " + mix("var(--c-bg)", 0) + "), " + dots + "; color: var(--k-ink); border: 1.5px solid var(--c-line); box-shadow: none;");
    s += rule(A + ":not(:disabled)" + PRESS, "transform: translate(3px, 3px); box-shadow: 0 0 0 var(--k-off); background-size: auto, 3px 3px, auto;");
    s += rule(P + F(FAM.ghost) + ":not(:disabled)" + PRESS, "transform: translate(1px, 1px); border-color: var(--c-fg); color: var(--c-fg);");
    s += iconCSS(st, "--k-dot: " + mix("var(--k-edge)", 80, "var(--k-face)") + "; background: " + fade + ", " + dots + ", var(--k-face); color: var(--k-ink); border: 1.5px solid var(--k-edge); box-shadow: 2px 2px 0 var(--k-off);",
      "transform: translate(2px, 2px); box-shadow: 0 0 0 var(--k-off);");
    s += disabledCSS(st);
    return s;
  };

  /* ---------- fixes every style needs, and the ballot's tag tiles ---------- */
  function fixesCSS(st) {
    var P = B(st), s = "";
    // the reel's DONE lost its side padding to the keycap decorator (label touched the edges)
    s += rule(P + F([".reel-done"]), "padding-left: 18px; padding-right: 18px;");
    // the Heat Check result buttons had the same problem (authored 26px sides)
    s += rule(P + F([".hh-btn"]), "padding-left: 20px; padding-right: 20px;");
    // tag tiles in the Add a tag sheet: the label was tokenized as a paper hairline and printed nearly invisible
    s += rule(P + IS([".bt-tile"]), "color: var(--t-ink); border-radius: calc(var(--t-r-btn) * 1.6);");
    s += rule(P + IS([".bt-tile"]) + ":focus-visible", "outline: 3px solid var(--t-ink); outline-offset: 3px;");
    var T = P + IS([".bt-tile"]), TP = T + ":active";
    var body = {
      offset: ["background: var(--t-paper); border: 1.5px solid var(--t-ink); box-shadow: 3px 3px 0 var(--t-offset);", "transform: translate(3px, 3px); box-shadow: 0 0 0 var(--t-offset); background: " + mix("var(--t-sun)", 30, "var(--t-paper)") + ";"],
      stamp: ["background: transparent; border: 2px solid var(--t-ink); outline: 1px solid " + mix("var(--t-ink)", 55) + "; outline-offset: -5px;", "background: var(--t-ink); color: var(--t-paper); outline-color: " + mix("var(--t-paper)", 50) + ";"],
      ticket: ["background: var(--t-paper-2); border: 1.5px dashed " + mix("var(--t-ink)", 50) + ";", "background: " + mix("var(--t-sun)", 30, "var(--t-paper-2)") + "; transform: translateY(1px);"],
      sticker: ["background: var(--t-paper-2); border: 0; box-shadow: 0 0 0 3px " + mix("var(--t-paper)", 55, "var(--t-light)") + ", 0 4px 8px -2px " + mix("var(--t-shadow)", 40) + ";", "transform: translateY(1px); box-shadow: 0 0 0 3px " + mix("var(--t-paper)", 55, "var(--t-light)") + ", 0 1px 2px " + mix("var(--t-shadow)", 40) + ";"],
      pill: ["background: " + mix("var(--t-ink)", 7) + "; border: 0; border-radius: 18px;", "background: " + mix("var(--t-sun)", 35) + "; transform: scale(0.98);"],
      // the tag sheet is paper: neon prints its tiles as ink outlines there (see STYLES.neon)
      neon: ["background: var(--t-paper); border: 1.5px solid var(--t-ink); box-shadow: none;", "transform: translateY(1px); background: " + mix("var(--t-sun)", 30, "var(--t-paper)") + ";"],
      halftone: ["background: radial-gradient(circle, " + mix("var(--t-ink)", 16) + " 0 1px, transparent 1.4px) 0 0 / 4px 4px, var(--t-paper); border: 1.5px solid var(--t-ink); box-shadow: 3px 3px 0 var(--t-offset);", "transform: translate(3px, 3px); box-shadow: 0 0 0 var(--t-offset);"]
    }[st];
    if (body) { s += rule(T, body[0]); s += rule(TP, body[1]); }
    if (st === "neon") s += rule(P + IS([".bt-tile.neg"]), "border: 2px solid var(--t-bad);");
    return s;
  }

  /* ---------- chips and tags ---------- */
  function chipFamCSS() {
    var s = "", pre = "html[data-chip] ";
    // yes chips: accent on the site, sunflower on paper
    s += rule(pre + IS([".bt-tag", ".tchip", ".tm-tag", ".q-tag"]), "--q-face: var(--c-yes); --q-hi: var(--c-yes-hi); --q-edge: var(--c-yes-edge); --q-ink: var(--c-yes-ink); --q-tone: var(--c-yes-ctone);");
    // bad chips: the label is the one that reads on the bad fill (4.5:1), since every style prints them solid
    s += rule(pre + IS([".bt-tag.neg", ".tchip.anti"]), "--q-face: var(--c-bad); --q-hi: var(--c-bad); --q-edge: var(--c-bad-edge); --q-ink: var(--c-bad-lab); --q-tone: var(--c-bad-ctone);");
    s += rule(pre + IS([".sort-chip", ".five-chip", ".r-chip", ".cap-season", ".pool-cue", ".gate-drag", ".slot-badge", ".ds-pill", ".bt-pill", ".cap-row .cap-cost", ".sk-chip"]),
      "--q-face: var(--c-well); --q-hi: var(--c-well); --q-edge: var(--c-line); --q-ink: var(--c-fg); --q-tone: var(--c-fg2);");
    s += rule(pre + IS([".sort-chip.active", ".r-chip.chip-active", ".ds-pill.ds-off", ".ls-swap", ".ls-pos"]),
      "--q-face: var(--c-pri); --q-hi: var(--c-pri-hi); --q-edge: var(--c-pri-edge); --q-ink: var(--c-pri-ink); --q-tone: var(--c-pri-tone);");
    s += rule(pre + IS([".r-chip.chip-none"]), "--q-face: var(--c-bad); --q-edge: var(--c-bad-edge); --q-ink: var(--c-bad-ink); --q-tone: var(--c-bad-tone);");
    s += rule(pre + IS([".slot-badge"]), "--q-face: var(--t-metal); --q-ink: var(--c-bg); --q-tone: var(--t-metal);");
    s += rule(pre + IS([".rr .bt-card .slot-badge"]), "--q-face: var(--t-ink); --q-ink: var(--t-paper); --q-tone: var(--t-ink);");
    s += rule(pre + IS([".hot-pick .slot-badge"]), "--q-face: var(--t-bad); --q-ink: var(--c-bad-lab); --q-tone: var(--c-bad-tone);");
    s += rule(pre + IS([".sk-chip"]), "--q-face: " + mix("var(--t-accent-ink)", 82) + "; --q-ink: var(--t-accent-hi); --q-tone: currentColor;");
    s += rule(pre + IS([".bt-pill"]), "--q-tone: var(--c-fg);");
    return s;
  }
  function chipStyle(st) {
    var P = C(st), s = "";
    var ALLC = [".bt-tag", ".tchip", ".sort-chip", ".five-chip", ".r-chip", ".tm-tag", ".q-tag"];
    s += rule(P + IS(ALLC), "border-radius: var(--t-r-chip);");
    s += rule(P + IS([".bt-tag.mine"]) + "::after", "border-radius: calc(var(--t-r-chip) + 4px);");
    s += rule(P + IS([".bt-tag"]) + ":focus-visible", "outline: 3px solid var(--c-ring); outline-offset: 3px;");
    s += rule(P + IS([".tchip", ".sort-chip"]) + ":focus-visible", "outline: 2px solid var(--c-ring); outline-offset: 2px;");
    if (st === "keycap") {
      s += rule(P + IS([".bt-tag.add"]), "border-radius: var(--t-r-chip);");
      // trait chips print in the yes ink (sunflower), like the ballot's tags
      s += rule(P + IS([".tchip:not(.anti)", ".tm-tag", ".q-tag"]), "background: linear-gradient(180deg, var(--q-hi), var(--q-face)); color: var(--q-ink); border-color: var(--q-edge);");
      s += rule(P + IS([".tchip:not(.anti)"]), "box-shadow: inset 0 1px 0 " + mix("var(--t-light)", 40) + ", 0 2px 0 var(--q-edge), 0 5px 10px -8px var(--t-shadow);");
      s += rule(P + IS([".tchip:not(.anti)"]) + PRESS, "box-shadow: inset 0 1px 0 " + mix("var(--t-light)", 30) + ", 0 0 0 var(--q-edge);");
      return s + badgeStyle(st);
    }
    // everything flat unless the style says otherwise
    s += rule(P + IS([".bt-tag", ".tchip"]), "transform: none;");
    s += rule(P + IS([".bt-tag.mine"]) + "::after", "inset: -5px;");
    if (st === "ink") {
      s += rule(P + IS([".bt-tag", ".tchip", ".tm-tag", ".q-tag"]), "background: var(--q-face); color: var(--q-ink); border: 0; box-shadow: none;");
      s += rule(P + IS([".bt-tag", ".tchip"]) + PRESS, "transform: translateY(1px); background: " + mix("var(--q-face)", 84, "var(--t-shadow)") + "; box-shadow: none;");
      s += rule(P + IS([".bt-tag.off"]), "background: transparent; color: var(--q-tone); box-shadow: inset 0 0 0 1.5px " + mix("var(--q-tone)", 55) + ";");
      s += rule(P + IS([".bt-tag.off"]) + PRESS, "background: " + mix("var(--q-face)", 30) + "; box-shadow: inset 0 0 0 1.5px var(--q-tone);");
      s += rule(P + IS([".sort-chip"]), "background: var(--q-face); color: var(--q-ink); border: 0;");
      s += rule(P + IS([".sort-chip.active"]), "font-weight: 700;");
      s += rule(P + IS([".five-chip"]), "background: var(--q-face); border: 0;");
      s += rule(P + IS([".r-chip"]), "background: var(--q-face); color: var(--q-ink); border: 0;");
      s += rule(P + IS([".r-chip.chip-pending", ".r-chip.chip-disputed"]), "color: var(--q-tone);");
      s += rule(P + IS([".ls-token:not(.is-open)"]), "border-color: var(--t-metal); box-shadow: none;");
    }
    if (st === "outline") {
      s += rule(P + IS([".bt-tag", ".tchip", ".tm-tag", ".q-tag"]), "background: " + mix("var(--q-face)", 24) + "; color: var(--q-tone); border: 0; box-shadow: inset 0 0 0 1.5px var(--q-edge);");
      s += rule(P + IS([".bt-tag"]), "box-shadow: inset 0 0 0 2px var(--q-edge);");
      // pressed or opened: the chip fills with its ink (a denser tint put the label under 4:1)
      s += rule(P + IS([".bt-tag", ".tchip"]) + PRESS, "background: var(--q-face); color: var(--q-ink); box-shadow: inset 0 0 0 2px var(--q-edge); transform: translateY(1px);");
      s += rule(P + IS([".bt-tag.off"]), "background: transparent; color: " + mix("var(--q-tone)", 72) + "; box-shadow: none; border: 1.5px dashed " + mix("var(--q-edge)", 70) + ";");
      s += rule(P + IS([".sort-chip"]), "background: transparent; color: var(--c-fg2); border: 1px solid var(--c-line);");
      s += rule(P + IS([".sort-chip.active"]), "background: " + mix("var(--q-face)", 16) + "; color: var(--q-tone); border: 1.5px solid var(--q-face); font-weight: 700;");
      s += rule(P + IS([".five-chip"]), "background: transparent; border: 1px solid var(--c-line);");
      s += rule(P + IS([".r-chip"]), "background: transparent; color: var(--q-tone); border: 1.5px solid var(--q-edge);");
      s += rule(P + IS([".r-chip.chip-active"]), "border-color: var(--q-face); color: var(--q-face);");
      s += rule(P + IS([".r-chip.chip-none"]), "border-color: var(--q-face); color: var(--q-face);");
      s += rule(P + IS([".ls-token:not(.is-open)"]), "background: " + mix("var(--t-metal)", 18) + "; color: var(--c-fg); border: 2px solid var(--t-metal);");
    }
    if (st === "stamp") {
      var TWO = "outline: 1px solid " + mix("var(--q-tone)", 70) + "; outline-offset: -4px;";
      s += rule(P + IS([".bt-tag", ".tchip", ".tm-tag", ".q-tag"]), "background: " + mix("var(--q-face)", 20) + "; color: var(--q-tone); border: 2px solid var(--q-tone); box-shadow: none; transform: rotate(-1.2deg);");
      s += rule(P + IS([".bt-tag"]), TWO + " padding-left: 11px; padding-right: 11px;");
      s += rule(P + IS([".bt-tag:nth-child(even)", ".tchip:nth-child(even)"]), "transform: rotate(1deg);");
      s += rule(P + IS([".bt-tag", ".tchip"]) + PRESS, "background: var(--q-tone); color: var(--c-bg); outline-color: " + mix("var(--c-bg)", 55) + "; transform: rotate(0deg) scale(0.97);");
      s += rule(P + IS([".bt-tag.off"]), "background: transparent; color: " + mix("var(--q-tone)", 70) + "; border: 1.5px dashed " + mix("var(--q-tone)", 55) + "; outline: 0;");
      s += rule(P + IS([".sort-chip"]), "background: transparent; color: var(--c-fg2); border: 1.5px solid " + mix("var(--c-fg2)", 60) + ";");
      s += rule(P + IS([".sort-chip.active"]), "background: " + mix("var(--q-face)", 18) + "; color: var(--q-tone); border: 2px solid var(--q-tone); font-weight: 700; transform: rotate(-2deg);");
      s += rule(P + IS([".five-chip"]), "background: transparent; border: 1.5px solid var(--c-fg2);");
      s += rule(P + IS([".r-chip"]), "background: transparent; color: var(--q-tone); border: 2px solid var(--q-tone); transform: rotate(-1.5deg);");
      s += rule(P + IS([".r-chip.chip-active", ".r-chip.chip-none"]), "border-color: var(--q-face); color: var(--q-face); outline: 1px solid " + mix("var(--q-face)", 60) + "; outline-offset: -5px;");
      s += rule(P + IS([".ls-token:not(.is-open)"]), "background: transparent; color: var(--c-fg); border: 2px solid var(--t-metal); box-shadow: inset 0 0 0 2px var(--c-bg), inset 0 0 0 3px var(--t-metal);");
    }
    // bad chips print solid in every style (red = bad at a glance next to the ON tags); the outline and stamp looks stay on ON and plain chips
    if (st === "outline" || st === "stamp") {
      var BADC = P + IS([".bt-tag.neg:not(.off)", ".tchip.anti"]);
      s += rule(BADC, st === "stamp" ?
        "background: var(--q-face); color: var(--q-ink); border: 2px solid var(--q-edge); outline: 1px solid " + mix("var(--q-ink)", 45) + "; outline-offset: -4px; box-shadow: none;" :
        "background: var(--q-face); color: var(--q-ink); box-shadow: inset 0 0 0 2px var(--q-edge);");
      s += rule(BADC + PRESS, "background: " + mix("var(--q-face)", 84, "var(--t-shadow)") + "; color: var(--q-ink);");
    }
    // the "+" tag and the ? badge keep their meaning in every style
    s += rule(P + IS([".bt-tag.add"]), "background: transparent; color: var(--c-fg); border: 2px dashed " + mix("var(--c-fg)", 50) + "; box-shadow: none; outline: 0; transform: none;");
    s += rule(P + IS([".bt-tag.add"]) + PRESS, "background: " + mix("var(--c-fg)", 10) + "; transform: translateY(1px);");
    s += rule(P + IS([".bt-tag.q"]) + "::before", "border-radius: 50%; transform: none;");
    return s + badgeStyle(st);
  }

  /* badges ride the chip switch */
  function badgeStyle(st) {
    var P = C(st), s = "";
    var SMALL = [".slot-badge", ".ds-pill", ".sk-chip", ".cap-season", ".year-face:not(.year-fixed)"];
    s += rule(P + IS(SMALL), "border-radius: var(--t-r-chip);");
    s += rule(P + IS([".cap-row .cap-cost"]), "border-radius: calc(var(--t-r-chip) + 3px);");
    s += rule(P + IS([".bt-pill", ".pool-cue", ".gate-drag"]), "border-radius: calc(var(--t-r-chip) * 3);");
    if (st === "keycap") return s;
    // the price box follows its surface (gold on the night table, key ink on a paper card)
    s += rule(P + IS([".cap-row .cap-cost .cc-amt"]), "color: var(--c-pri-tone);");
    s += rule(P + IS([".cap-row .cap-cost .cc-tag"]), "color: var(--c-fg2);");
    if (st === "ink") {
      s += rule(P + IS([".slot-badge", ".ds-pill.ds-off", ".cap-season"]), "background: var(--q-face); color: var(--q-ink); border-color: transparent; box-shadow: none; text-shadow: none;");
      s += rule(P + IS([".cap-season"]), "color: var(--c-fg);");
      s += rule(P + IS([".bt-pill"]), "background: var(--t-ink); color: var(--t-paper); border-color: var(--t-ink);");
      s += rule(P + IS([".pool-cue", ".gate-drag"]), "background: var(--t-accent); color: var(--t-accent-ink); border-color: var(--t-accent);");
      s += rule(P + IS([".cap-row .cap-cost"]), "background: var(--c-well); border-color: transparent;");
      s += rule(P + IS([".player-row.sel .cap-cost"]), "background: " + mix("var(--t-accent)", 22, "var(--c-well)") + "; border-color: var(--t-accent);");
      s += rule(P + IS([".ls-swap"]), "background: var(--t-accent); color: var(--t-accent-ink); border-color: var(--t-accent);");
    }
    if (st === "outline") {
      s += rule(P + IS([".slot-badge", ".ds-pill.ds-off", ".cap-season", ".sk-chip"]), "background: transparent; color: var(--q-tone); border: 1px solid var(--q-tone); box-shadow: none; text-shadow: none;");
      s += rule(P + IS([".sk-chip"]), "color: inherit; border-color: currentColor; opacity: 0.9;");
      s += rule(P + IS([".pool-cue", ".gate-drag"]), "border-color: var(--t-accent);");
      s += rule(P + IS([".ls-swap:not(.is-moving):not(.is-here)"]), "background: var(--c-bg);");
    }
    if (st === "stamp") {
      s += rule(P + IS([".slot-badge", ".ds-pill.ds-off", ".cap-season"]), "background: transparent; color: var(--q-tone); border: 1.5px solid var(--q-tone); box-shadow: none; text-shadow: none; transform: rotate(-2deg);");
      s += rule(P + IS([".bt-pill"]), "border-width: 2px; outline: 1px solid " + mix("var(--c-fg)", 60) + "; outline-offset: -5px; transform: rotate(-1.5deg);");
      s += rule(P + IS([".cap-row .cap-cost"]), "border: 1.5px solid var(--t-metal); box-shadow: none; outline: 1px solid " + mix("var(--t-metal)", 55) + "; outline-offset: -4px;");
      s += rule(P + IS([".player-row.sel .cap-cost"]), "border-color: var(--t-accent); outline-color: " + mix("var(--t-accent)", 60) + ";");
      s += rule(P + IS([".pool-cue", ".gate-drag"]), "border: 1.5px solid var(--t-accent);");
    }
    return s;
  }

  /* ---------- inputs (ride the button switch) ---------- */
  function inputCSS(st) {
    var P = B(st), I = P + IS(INPUT), s = "";
    var face = P + IS([".year-face:not(.year-fixed)"]);
    if (st === "keycap") {
      s += rule(I, "border-radius: var(--t-r-btn);");
      return s;
    }
    s += rule(I, "background-color: var(--c-well); color: var(--c-fg); border: 1.5px solid var(--c-line); border-radius: var(--t-r-btn); box-shadow: none;");
    s += rule(I + ":focus", "outline: 0; border-color: var(--c-pri-tone); box-shadow: 0 0 0 3px " + mix("var(--c-pri-tone)", 28) + ";");
    s += rule(face, "border-radius: var(--t-r-btn);");
    if (st === "offset" || st === "halftone") {
      s += rule(I, "background-color: var(--c-bg); border: 2px solid var(--c-fg); box-shadow: 3px 3px 0 var(--c-off);");
      s += rule(I + ":focus", "box-shadow: 1px 1px 0 var(--c-off), 0 0 0 3px " + mix("var(--c-pri-tone)", 30) + "; transform: translate(2px, 2px);");
      s += rule(face, "border: 1.5px solid " + mix("var(--c-fg)", 55) + "; box-shadow: 2px 2px 0 " + mix("var(--c-off)", 80) + ";");
    }
    if (st === "stamp") {
      s += rule(I, "background-color: transparent; border: 2px solid var(--c-fg); outline: 1px solid " + mix("var(--c-fg)", 45) + "; outline-offset: -5px;");
      s += rule(I + ":focus", "outline: 1px solid var(--c-pri-tone); outline-offset: -5px; border-color: var(--c-pri-tone);");
      s += rule(face, "background: transparent; border: 1.5px solid " + mix("var(--c-fg)", 60) + ";");
    }
    if (st === "ticket") {
      s += rule(I, "background-color: var(--c-well); border: 1.5px dashed " + mix("var(--c-fg)", 45) + ";");
      s += rule(face, "border-style: dashed;");
    }
    if (st === "sticker") {
      s += rule(I, "border: 0; box-shadow: 0 0 0 2px " + mix("var(--t-paper)", 55, "var(--t-light)") + ", 0 3px 6px -1px " + mix("var(--t-shadow)", 50) + ";");
      s += rule(I + ":focus", "box-shadow: 0 0 0 2px var(--c-pri-tone), 0 3px 6px -1px " + mix("var(--t-shadow)", 50) + ";");
    }
    if (st === "pill") {
      s += rule(I, "border-radius: 999px; border-color: transparent; padding-left: 14px;");
      s += rule(P + IS([".share-out"]), "border-radius: 16px; padding-left: 12px;");
      s += rule(face, "border-radius: 999px; padding-left: 9px; padding-right: 9px;");
    }
    if (st === "neon") {
      s += rule(I, "background-color: var(--c-plate); color: var(--c-plate-ink); border: 1px solid " + mix("var(--t-accent)", 55) + "; box-shadow: 0 0 8px " + mix("var(--t-accent)", 22) + ";");
      s += rule(I + ":focus", "border-color: var(--t-accent); box-shadow: 0 0 0 1px " + mix("var(--t-accent)", 40) + ", 0 0 14px " + mix("var(--t-accent)", 50) + ";");
      s += rule(face, "border-color: " + mix("var(--t-accent)", 50) + "; box-shadow: 0 0 6px " + mix("var(--t-accent)", 25) + ";");
    }
    s += rule(P + IS([".pool-search", ".search-input"]) + "::placeholder", "color: var(--c-fg2);");
    return s;
  }

  /* ---------- links (ride the button switch) ---------- */
  function linkCSS(st) {
    var P = B(st), L = P + IS(LINK), s = "";
    if (st === "keycap") return s;
    var under = { offset: "var(--t-offset)", halftone: "var(--t-offset)", stamp: "currentColor", ticket: "var(--t-offset)", sticker: "var(--t-accent)", pill: "var(--t-accent)", neon: "var(--t-accent)" }[st];
    s += rule(L, "text-decoration-line: underline; text-decoration-color: " + mix(under, 70) + "; text-decoration-thickness: 1.5px; text-underline-offset: 3px;");
    if (st === "stamp") s += rule(L, "text-decoration-style: solid; text-decoration-color: " + mix("currentColor", 55) + ";");
    if (st === "ticket") s += rule(L, "text-decoration-style: dashed;");
    if (st === "neon") s += rule(L, "text-shadow: 0 0 8px " + mix("var(--t-accent)", 40) + ";");
    s += rule(L + ":active", "color: var(--c-pri-tone);");
    s += rule(L + ":focus-visible", "outline: 2px solid var(--c-ring); outline-offset: 2px; border-radius: 2px;");
    return s;
  }

  /* ---------- runtime: find light surfaces on the night table ----------
     Card styles (another layer) can print panels on paper. A control sitting on
     a light surface on a dark ground switches to the paper context, so its ink
     reads (navy key, sunflower yes) instead of night colors on cream. */
  var CONTROLS = "button, a.btn, a.qx-btn, a.act-share, a.tm-again, a.donate-btn, a.hh-btn, a.rs-got, input, select, textarea, " +
    ".slot-badge, .q-tag, .tm-tag, .r-chip, .bt-pill, .ds-pill, .cap-cost, .cap-season, .year-face";
  function lumOf(css) {
    var m = /rgba?\(([^)]+)\)/.exec(css || ""); if (!m) return null;
    var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
    if (p.length > 3 && p[3] < 0.6) return null;                     // see-through: keep walking up
    var lin = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2]);
  }
  LAB.pageHooks = LAB.pageHooks || [];
  LAB.pageHooks.push(function (doc, rc) {
    var old = doc.querySelectorAll("[data-lab-paper]");
    for (var i = 0; i < old.length; i++) old[i].removeAttribute("data-lab-paper");
    if (!rc || rc.sysPalette === "today" || (rc.ground || "night") !== "night") return;
    var win = doc.defaultView, seen = [];
    doc.querySelectorAll(CONTROLS).forEach(function (el) {
      var n = el.parentElement;
      while (n && n !== doc.body && n !== doc.documentElement) {
        if (!/^(BUTTON|A|LABEL)$/.test(n.tagName)) {
          var L = lumOf(win.getComputedStyle(n).backgroundColor);
          if (L !== null) { if (L > 0.42 && n.offsetWidth >= 140 && seen.indexOf(n) < 0) seen.push(n); break; }
        }
        n = n.parentElement;
      }
    });
    seen.forEach(function (n) { n.setAttribute("data-lab-paper", ""); });
  });

  /* ---------- register ---------- */
  LAB.component({
    id: "controls",
    css: function (rc) {
      var st = STYLES[rc.btn] ? rc.btn : "keycap", ch = rc.chip || "keycap", s = "";
      s += contextCSS(rc);
      s += famCSS("html[data-btn] ");
      s += STYLES[st]();
      s += fixesCSS(st);
      s += inputCSS(st);
      s += linkCSS(st);
      s += chipFamCSS();
      s += chipStyle(["keycap", "ink", "outline", "stamp"].indexOf(ch) >= 0 ? ch : "keycap");
      return s;
    }
  });
})();
