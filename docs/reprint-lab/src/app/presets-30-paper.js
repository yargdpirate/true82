/* ---------- TRUE 82 Reprint Lab: paper presets ----------
   Thesis: "Printed on paper". The day ground: the whole site as a riso
   print, the natural next step from the v50 results page. Each look is one
   idea carried through the masthead and every button, card and chip.
   Note: the recipe key "texture" is shared by the system texture (grain,
   dots) and the masthead's paper tooth, so these looks set the system one. */
(function () {
  window.LAB.presets = (window.LAB.presets || []).concat([
    // The v50 results drum, everywhere, on the day ground.
    { id: "paper-press-proof", name: "Press Proof",
      line: "The results drum, printed on every page.",
      note: "The v50 results print is now the whole site: cream stock, navy ink, pink offsets. Look at the crop marks and color bar on the masthead, the blue dot shadow under the name, and the buttons printed with a pink offset.",
      rc: { palette: "printshop", stock: "auto", layout: "inline", font: "barlow900", depth: "offset", depthDist: 0.5, depthAng: 35,
        concept: "ball-sun", iconStyle: "print", backdrop: "none", adds: ["marks", "colorbar", "halftone-drop"],
        reg: 1.6, regDir: 30, motion: "print",
        sysPalette: "match", ground: "day", btn: "offset", card: "paper", chip: "stamp", corners: "square", texture: "grain",
        disp: "match", body: "barlow", mono: "plexmono" } },

    // Two drums only: riso blue and fluorescent pink on white bond.
    { id: "paper-split-fountain", name: "Split Fountain",
      line: "Two drums: blue melting into pink.",
      note: "A two-color riso zine on white stock. The name is a split fountain, blue at the top melting into fluorescent pink; buttons print as halftone dots and cards as ink outlines.",
      rc: { palette: "pinkblue", stock: "auto", layout: "stacked", font: "anton", depth: "split",
        concept: "hoop-sunrise", iconStyle: "print", backdrop: "none", adds: [],
        reg: 1.4, regDir: 30, motion: "print",
        sysPalette: "match", ground: "day", btn: "halftone", card: "outline", chip: "outline", corners: "square", texture: "dots",
        disp: "match", body: "barlow", mono: "plexmono" } },

    // An old fight-night ticket: black wood type on peach stock.
    { id: "paper-admit-one", name: "Admit One",
      line: "Black wood type on peach ticket stock.",
      note: "Old ticket stock: black slab letters on peach paper. The masthead, the buttons and the cards are tear-off tickets with notched ends and perforations.",
      rc: { palette: "peachtree", stock: "auto", layout: "ticket", font: "alfaslab", depth: "block", wordTex: "inline",
        concept: "ball-classic", iconStyle: "print", backdrop: "none", adds: [],
        motion: "print",
        sysPalette: "match", ground: "day", btn: "ticket", card: "ticket", chip: "stamp", corners: "soft", texture: "grain",
        disp: "match", body: "barlow", mono: "courierprime" } },

    // A varsity crest, green and gold, on brown kraft. Laid out wide (trophy in laurels beside the name,
    // the tagline on a ribbon) so the header prints it full width: the shield layout printed the name too small.
    { id: "paper-kraft-crest", name: "Kraft Crest",
      line: "Green and gold on brown kraft paper.",
      note: "The whole site on kraft paper, with cream slips pasted on. The masthead is a varsity crest: a trophy in laurels, the name in green slab letters, the tagline on a ribbon.",
      rc: { palette: "banner", stock: "auto", layout: "iconfirst", font: "graduate", depth: "block",
        concept: "trophy", iconStyle: "print", iconScale: 1, backdrop: "none", adds: ["laurel", "ribbon"],
        grain: 1.3, starve: 1.3, motion: "print",
        sysPalette: "match", ground: "day", btn: "offset", card: "paper", chip: "stamp", corners: "soft", texture: "grain",
        disp: "match", body: "barlow", mono: "plexmono" } }
  ]);
})();
