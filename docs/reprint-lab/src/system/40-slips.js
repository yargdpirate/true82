/* ---------- TRUE 82 LAB: results tiles ----------
   The v50 results page prints every section on a slip of light paper, and the
   tag sheet slides up on the same paper. In dark looks that reads as white
   tiles. This setting (recipe key "slips") re-inks those tiles from the
   palette's own night colors:
     match  the look's own cards (default): see LAB.slipsMode
     paper  the v50 light paper
     dim    the paper pulled toward the ground: still paper, far less glare
     night  the palette's dark panel with light ink, on a dark paper stock
     tint   a dark panel washed with the palette's accent (Vice goes plum)
     glow   a dark tile with a glowing edge in the palette's accent (neon)
     clear  no fill: an outline on the ground
   It works with "Today's site" colors too (they use today's roles). The season
   print keeps its paper in "dim"; in the dark schemes it is printed as a
   negative so it sits in the tile. The season reel card follows too (its coin
   strips stop multiplying so the coins print on the dark card).
   pages.js injects LAB.slipsCSS(rc) as its own style block, after the others. */
(function () {
  var LAB = window.LAB, R = window.RISO;
  LAB.SYS.slips = [["match", "Match cards"], ["paper", "Paper"], ["dim", "Dim paper"], ["night", "Night"], ["tint", "Tinted"], ["glow", "Neon"], ["clear", "Outline"]];
  LAB.SYS_DEFAULT.slips = "match";
  LAB.DEFAULT.slips = "match";
  // "match" (the default): the tiles are simply the look's cards. Paper only when the look's cards are paper
  // (or the whole site is printed on paper), and today's colors keep today's paper.
  LAB.slipsMode = function (rc) {
    var m = rc.slips || "match";
    if (m !== "match") return m;
    if (rc.sysPalette === "today" || (rc.ground || "night") === "day") return "paper";
    return { paper: "paper", outline: "clear", tunnel: "night", flat: "night", ticket: "night" }[rc.card || "tunnel"] || "night";
  };

  function rolesFor(rc) {
    if (rc.sysPalette === "today") return LAB.roles(LAB.palettes.goldstandard, "night");
    return LAB.roles(LAB.palettes[rc.sysPalette && rc.sysPalette !== "match" ? rc.sysPalette : rc.palette], rc.ground || "night");
  }
  var texCache = {};
  function stockTex(bg, ink) {                        // the riso paper generator, at this tile's color
    var key = bg + ink;
    if (texCache[key]) return texCache[key];
    var C = LAB.color, dark = C.lum(bg) < 0.25;
    var st = { name: "tile", paper: bg, fibre: C.mix(bg, ink, dark ? 0.22 : 0.3), fleck: C.mix(bg, ink, dark ? 0.35 : 0.5), dark: dark };
    var P = R.plate({ W: 360, vw: 1000, vh: 1000, seed: 23, stock: st, texture: dark ? 0.8 : 1.1 });
    texCache[key] = P.paper.toDataURL("image/jpeg", 0.82);
    return texCache[key];
  }

  LAB.slipsCSS = function (rc) {
    var mode = LAB.slipsMode(rc);
    if (mode === "paper") return "";
    var C = LAB.color, r = rolesFor(rc), bg, bg2, ink, ink2, line, edge = "", tex;
    if (mode === "dim") {
      bg = C.mix(r.paper, r.ground, 0.3); bg2 = C.mix(bg, r.ground, 0.12);
      ink = C.ensure(r.ink, bg, 7, "#000000"); ink2 = C.ensure(C.mix(ink, bg, 0.3), bg, 4.5, "#000000");
    } else if (mode === "night") {
      bg = r["ground-2"]; bg2 = r["ground-3"];
      ink = C.ensure(r.text, bg, 7, "#FFFFFF"); ink2 = C.ensure(r["text-2"], bg, 4.5, "#FFFFFF");
    } else if (mode === "tint") {
      bg = C.mix(r.ground, r.accent, 0.17); bg2 = C.mix(bg, r.ground, 0.35);
      ink = C.ensure(r.text, bg, 7, "#FFFFFF"); ink2 = C.ensure(C.mix(r.text, bg, 0.3), bg, 4.5, "#FFFFFF");
    } else if (mode === "glow") {
      bg = C.mix(r["ground-2"], r.ground, 0.5); bg2 = r["ground-3"];
      ink = C.ensure(r.text, bg, 7, "#FFFFFF"); ink2 = C.ensure(r["text-2"], bg, 4.5, "#FFFFFF");
      edge = "box-shadow: inset 0 0 0 1.5px " + r.accent + ", 0 0 14px " + C.mix(r.accent, r.ground, 0.45) + ";";
    } else {                                          // clear
      bg = r.ground; bg2 = r["ground-2"];
      ink = C.ensure(r.text, bg, 7, "#FFFFFF"); ink2 = C.ensure(r["text-2"], bg, 4.5, "#FFFFFF");
      edge = "box-shadow: inset 0 0 0 1.5px " + C.mix(r.text, r.ground, 0.55) + ";";
    }
    var dark = C.lum(bg) < 0.25;
    line = C.mix(ink, bg, dark ? 0.62 : 0.72);
    tex = mode === "clear" ? "none" : "url(" + stockTex(bg, ink) + ")";
    // text inks that must read on this tile: the palette's night inks on dark tiles, deepened ones on dim paper
    var fit = function (c) { return C.ensure(c, bg, 4.5, dark ? "#FFFFFF" : "#000000"); };
    var good = fit(r.good), you = fit(r.you), accent = fit(r.accent), metal = fit(r.metal), bad = fit(r.bad), hot = fit(r.sun);
    var roleVars =
      "--t-paper: " + bg + "; --t-paper-2: " + bg2 + "; --t-ink: " + ink + "; --t-ink-2: " + ink2 + "; --t-line-paper: " + line + ";" +
      "--t-good: " + good + "; --t-you: " + you + ";" +
      "--s-p-accent: " + accent + "; --s-p-metal: " + metal + "; --s-p-bad: " + bad + "; --s-p-good: " + good + ";" +
      "--rr-paper: " + tex + ";";
    // three ids of specificity: beats the component layers' two-id boost without !important
    var A = ":is(#lab-q#lab-q#lab-q, html)[data-slips] ", s = "";
    // the results page and the tag sheet (which slides up outside it)
    s += A + ".rr, " + A + ".bt-sheet, " + A + ".reel-overlay.riso .reel-card { " + roleVars + " }\n";
    s += A + ".bt-sheet, " + A + ".reel-overlay.riso .reel-card { background-color: " + bg + " !important; background-image: " + tex + " !important; color: " + ink + "; }\n";
    // the reel's loss effects layer carries a paper-colored veil (the card sagging): printed as a negative it
    // becomes a dark veil on a dark card, and the giant L stays red
    if (dark) s += A + ".reel-overlay.riso .riso-strip { mix-blend-mode: normal; }\n" + A + ".reel-overlay.riso .riso-fx { filter: invert(1) hue-rotate(180deg) brightness(1.35) saturate(1.3); }\n";
    if (mode === "clear") {
      s += A + ":is(.rr .rr-board, .rr .bt-card, .rr .twoway, .rr .rr-climb .climb, .rr .ledger) { background-color: transparent; background-image: none; " + edge + " }\n";
    }
    // the hot pick keeps its fire gold, bright enough for this tile
    s += A + ".rr .hot-pick .pr-name, " + A + ".rr .hot-pick .bt-val, " + A + ".rr .hot-pick .hot-bonus, " + A + ".rr .big-label .net-bonus { --t-bad-ink: " + hot + "; --s-p-bad: " + hot + "; --rr-scar-deep: " + hot + "; }\n";
    // the season print: dim keeps its paper; the dark schemes print it as a negative so it belongs in the tile
    if (mode === "dim") s += A + ".rr .rr-print-canvas { filter: brightness(0.86) saturate(1.05); }\n";
    else s += A + ".rr .rr-print-canvas { filter: invert(0.94) hue-rotate(180deg) saturate(1.25) brightness(1.08); border-radius: 3px; }\n";
    if (dark) {
      // labels printed in paper color on the table, and hollow tags inked for paper
      s += A + ".rr .rr-eyebrow { color: " + r.text + "; }\n";
      s += A + ".rr .bt-tag.off:not(.neg) { color: " + fit(r.sun) + "; }\n" + A + ".rr .bt-tag.off.neg { color: " + bad + "; }\n";
      // the reel's loss inks (dead or cold streak, the losses in the record) were deep reds for paper
      s += A + ".reel-overlay.riso .riso-streak.dead, " + A + ".reel-overlay.riso .riso-streak.cold, " + A + ".reel-overlay.riso .reel-run i, " + A + ".reel-overlay.riso .reel-final-rec i { color: " + bad + "; }\n";
      if (rc.sysPalette === "today") {
        // today's colors have no button layer, so re-ink the site's own navy buttons and the keys that borrow navy
        s += A + ".rr #shareTeamBtn.presti-spin, " + A + ".bt-sheet .bt-done, " + A + ".reel-overlay.riso .reel-done { background: " + r.accent + "; border-color: " + r.accent + "; color: " + r["accent-ink"] + "; }\n";
        s += A + ".rr .bt-tag:not(.off):not(.add), " + A + ".bt-sheet .bt-big.yes, " + A + ".bt-sheet .bt-big.no { color: " + r.ink + "; }\n";
      }
    }
    // drop shadows made for paper on a dark table read as smudges on dark tiles
    if (dark) s += A + ":is(.rr .rr-board, .rr .bt-card, .rr .twoway, .rr .rr-climb .climb, .rr .ledger) { box-shadow: inset 0 0 0 1px " + C.mix(ink, bg, 0.82) + (edge ? ", " + edge.replace("box-shadow: ", "").replace(";", "") : "") + "; }\n";
    return s;
  };
})();
