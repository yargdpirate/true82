/* ---------- TRUE 82 Reprint Lab: Evolution presets ----------
   Thesis: keep what TRUE 82 already is (the gold hoop, the dark arena, the
   amber keycap) and print it with the riso language of the v50 results
   page. Looks the owner could ship next week: familiar, but more crafted. */
(function () {
  window.LAB.presets = (window.LAB.presets || []).concat([
    { id: "evolution-gold-press", name: "Gold Press",
      line: "Today's site, pulled off the press.",
      note: "Your colors and keycaps, now printed: halftone gold keys with a pink edge, a letterpress logo with a gold 82 over court lines.",
      rc: { palette: "goldstandard", sysPalette: "match", wl: "classic", ground: "night", btn: "halftone", card: "tunnel", chip: "keycap", corners: "soft", texture: "grain", disp: "match",
        layout: "inline", font: "barlow900", font82: "match", ink82: "a", shape: "straight", lines: "one", wordTex: "solid",
        depth: "extrude", depthDist: 0.7, depthAng: 60, concept: "hoop-star", iconStyle: "print", iconDepth: "match", iconScale: 1,
        backdrop: "court", adds: ["star", "pips"], reg: 1.2, starve: 0.2, grain: 0.5, motion: "print" } },

    { id: "evolution-night-shift", name: "Night Shift",
      line: "The results paper, pinned over a navy arena.",
      note: "The v50 results inks carried up the page: a cream masthead print with the hoop rising like a sun, sunflower keycaps, navy panels.",
      rc: { palette: "printshop", sysPalette: "match", ground: "night", btn: "keycap", card: "tunnel", chip: "ink", corners: "soft", texture: "grain", disp: "match",
        layout: "iconfirst", font: "barlow900", font82: "match", ink82: "word", shape: "straight", lines: "one", wordTex: "solid",
        depth: "extrude", depthDist: 0.5, depthAng: 35, concept: "hoop-sunrise", iconStyle: "print", iconDepth: "match", iconScale: 1,
        backdrop: "none", adds: ["star"], reg: 1.2, starve: 0.3, grain: 0.6, motion: "print" } },

    // (Game Program was cut: it was Gold Press with outline cards, too close to tell apart.)

    { id: "evolution-wine-gold", name: "Wine and Gold",
      line: "The whole name in gold, on a wine night.",
      note: "The gold goes from the 82 to the whole name, stamped over a cranberry block. Warm wine panels, gold keys with a cranberry edge.",
      rc: { palette: "wineandgold", sysPalette: "match", ground: "night", btn: "offset", card: "tunnel", chip: "keycap", corners: "soft", texture: "grain", disp: "match",
        layout: "inline", font: "barlow900", font82: "match", ink82: "word", shape: "straight", lines: "one", wordTex: "solid",
        depth: "extrude", depthDist: 0.5, depthAng: 35, concept: "hoop-star", iconStyle: "print", iconDepth: "match", iconScale: 1,
        backdrop: "none", adds: ["star", "pips"], reg: 1.2, starve: 0.15, grain: 0.5, motion: "print" } }
  ]);
})();
