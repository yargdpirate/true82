/* ---------- TRUE 82 LAB: neon amount ----------
   How far the Neon button style spreads (recipe key "neon"; only with Buttons: Neon, on the night ground):
     accents  the neon button style as built: the main action and the votes glow, secondaries half-lit
     more     every button glows. The main action keeps the accent tube; secondary and quiet
              buttons get a second tube in the palette's other neon (Vice: aqua), so pink still leads
     max      more, plus the rest of the interface: sort chips, the selected player row, pills, a halo
              on the tags, card and tile edges, meters, heading glow, text links
   Buttons look the same on every surface (there are no paper-only variants), so this layer only
   decides how much of the interface is lit. Rules sit under a six-id boost to outrank the controls layer. */
(function () {
  var LAB = window.LAB;
  LAB.SYS.neon = [["accents", "Accents"], ["more", "More"], ["max", "Max"]];
  LAB.SYS_DEFAULT.neon = "accents";
  LAB.DEFAULT.neon = "accents";

  var X0 = ':is(#lab-n#lab-n#lab-n#lab-n#lab-n#lab-n, html)[data-btn="neon"]', X = X0 + " ";
  // since v51 the results tiles, the tag sheet and the reel card are ordinary cards and sheets
  var TILES = [".t-card", ".t-sheet", ".rr .rr-board", ".rr .bt-card", ".rr .twoway", ".rr .ledger", ".rr .rr-climb .climb", ".bt-sheet", ".reel-overlay.riso .reel-card"];
  function mix(a, pct, b) { return "color-mix(in srgb, " + a + " " + pct + "%, " + (b || "transparent") + ")"; }
  function rule(sel, body) { return sel + " { " + body + " }\n"; }
  function is(list) { return ":is(" + list.join(", ") + ")"; }
  function glow(c, a, b) { return "0 0 0 1px " + mix(c, 30) + ", 0 0 " + a + "px " + mix(c, 60) + ", 0 0 " + b + "px -2px " + mix(c, 45) + ", inset 0 0 9px " + mix(c, 32); }
  function halo(c, a, b) { return "0 0 0 1px " + mix(c, 35) + ", 0 0 " + a + "px " + mix(c, 62) + ", 0 0 " + b + "px -2px " + mix(c, 48); }
  function hue(hex) {
    var c = window.RISO.hexRGB(hex), r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
    if (!d) return -1;
    if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60; return h < 0 ? h + 360 : h;
  }
  function apart(a, b) { var x = hue(a), y = hue(b); if (x < 0 || y < 0) return true; var d = Math.abs(x - y); return Math.min(d, 360 - d) >= 40; }

  LAB.component({ id: "neon-amount", css: function (rc) {
    if (rc.btn !== "neon" || !LAB.CTL) return "";
    var C = LAB.color, r = LAB.rolesFor(rc);
    var F = LAB.CTL.FAM, NOT = LAB.CTL.NOT, PRESS = LAB.CTL.PRESS, lvl = rc.neon || "accents", night = (rc.ground || "night") === "night";
    var tilesDark = rc.card !== "paper", s = "";

    // the second tube: the palette's other neon, far enough from the accent in hue to read as a second color
    var plate = C.mix(r.ground, r.shadow, 0.28), neon2 = r.text;
    ["offset", "you", "sun"].some(function (k) { if (r[k] && apart(r[k], r.accent) && C.contrast(r[k], plate) >= 3.4) { neon2 = r[k]; return true; } return false; });
    s += rule(X0, "--lab-neon2: " + neon2 + ";");

    if (lvl === "accents" || !night) return s;       // the paper ground keeps the built amount

    // MORE: secondaries fully lit in the second tube, quiet buttons as thin tubes
    s += rule(X + is(F.sec) + NOT + ":not(.refunded):not(.firesale)", "--k-neon: var(--lab-neon2);");
    // quiet buttons get the same dark plate as every neon button, so they read on any surface
    s += rule(X + is(F.ghost) + NOT + ":not(:disabled)",
      "background: var(--c-plate); color: " + mix("var(--lab-neon2)", 70, "var(--t-light)") + "; border-width: 1.5px; border-color: var(--lab-neon2);" +
      " box-shadow: 0 0 0 1px " + mix("var(--lab-neon2)", 25) + ", 0 0 8px " + mix("var(--lab-neon2)", 45) + ", inset 0 0 6px " + mix("var(--lab-neon2)", 22) + ";" +
      " text-shadow: 0 0 6px " + mix("var(--lab-neon2)", 70) + ";");
    s += rule(X + is(F.ghost) + NOT + ":not(:disabled)" + PRESS, "background: " + mix("var(--lab-neon2)", 18, "var(--c-plate)") + "; color: var(--t-light); box-shadow: " + glow("var(--lab-neon2)", 12, 26) + ";");
    // bare text buttons (Exit run, Back, Change vote): a faint glow on the type
    s += rule(X + is(F.text), "text-shadow: 0 0 7px " + mix("var(--lab-neon2)", 60) + ";");
    if (lvl !== "max") return s;

    // MAX: the rest of the interface
    // sort chips: dim tubes, the active one lit in the accent
    s += rule(X + ".sort-chip:not(.active)", "background: transparent; color: " + mix("var(--lab-neon2)", 70, "var(--t-light)") + "; border: 1px solid " + mix("var(--lab-neon2)", 55) + "; box-shadow: 0 0 7px " + mix("var(--lab-neon2)", 28) + ";");
    s += rule(X + ".sort-chip.active", "background: var(--c-plate); color: " + mix("var(--t-accent)", 62, "var(--t-light)") + "; border: 1.5px solid var(--t-accent); box-shadow: " + glow("var(--t-accent)", 6, 14) + "; text-shadow: 0 0 6px " + mix("var(--t-accent)", 80) + ";");
    // pills that point somewhere (More players, Drag): accent tubes
    s += rule(X + is([".pool-cue", ".gate-drag"]), "background: var(--c-plate); color: " + mix("var(--t-accent)", 62, "var(--t-light)") + "; border: 1.5px solid var(--t-accent); box-shadow: " + glow("var(--t-accent)", 6, 16) + "; text-shadow: 0 0 6px " + mix("var(--t-accent)", 80) + ";");
    // tags: a halo in their own ink (yes gold, bad red)
    s += rule(X + is([".tchip:not(.anti)", ".bt-tag:not(.off):not(.add):not(.neg)", ".tm-tag", ".q-tag"]), "filter: drop-shadow(0 0 5px " + mix("var(--t-sun)", 55) + ");");
    s += rule(X + is([".tchip.anti", ".bt-tag.neg:not(.off)"]), "filter: drop-shadow(0 0 5px " + mix("var(--t-bad)", 55) + ");");
    // the picked row and the lineup tokens
    s += rule(X + ".player-row.sel", "box-shadow: inset 0 0 0 1.5px var(--t-accent), 0 0 18px " + mix("var(--t-accent)", 40) + ";");
    s += rule(X + is([".ls-token", ".lineup-slot .ls-token"]), "box-shadow: 0 0 8px " + mix("var(--lab-neon2)", 40) + ";");
    // card and tile edges: an accent tube round each surface
    var EDGES = [".ticket", ".traits-module", ".wrap .card", ".hh-card", ".rules-sheet", ".tray", ".plq-frame", ".board:not(.rr-board)"];
    if (tilesDark) EDGES = EDGES.concat(TILES);
    s += rule(X + is(EDGES), "box-shadow: inset 0 0 0 1.5px " + mix("var(--t-accent)", 75, "var(--t-text)") + ", 0 0 18px " + mix("var(--t-accent)", 32) + ";");
    // meters and headings: glow in their own color
    s += rule(X + is([".mpb-fill", ".hh-fill", ".tw-fill"]), "box-shadow: 0 0 10px " + mix("var(--t-accent)", 60) + ";");
    s += rule(X + is([".daily-tile .dt-title", ".gate-title", ".mp-id", ".hh-eyebrow", ".intro-title", ".ticket-fr", ".ticket-dec", ".rr-eyebrow", ".t-head"]), "text-shadow: 0 0 10px " + mix("currentColor", 55) + ", 0 0 22px " + mix("currentColor", 25) + ";");
    // links: a soft glow under the text
    s += rule(X + is([".pr-bref", ".pr-team", ".cl-link", ".content-page a:not(.btn)", ".site-links a"]), "text-shadow: 0 0 6px " + mix("var(--lab-neon2)", 45) + ";");
    return s;
  } });
})();
