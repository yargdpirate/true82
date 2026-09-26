/* ---------- TRUE 82 Reprint Lab: team nights presets ----------
   Complete looks after classic NBA uniforms. Each one commits to its era:
   the masthead face, icon, depth and backdrop, and the site's buttons,
   cards, chips, corners and type all serve one idea.
     Heat Vice        neon script on midnight, a sunrise hoop on a neon grid, glowing buttons
     Fiesta           Spurs turquoise and pink on black, confetti (no rays), offset buttons
     Showtime         Lakers home gold: gold paper site, purple keycaps, ticket cards, a trophy band
     Purple Sunburst  93 Suns: a streaking ball over rays, orange halftone buttons
     Rainbow Skyline  80s Nuggets on white paper: rainbow stripes and a mountain sunrise */
(function () {
  window.LAB.presets = (window.LAB.presets || []).concat([
    // v53 (owner: "more neon, less riso and hand-drawn, closer to the ball icon"): the name is lit neon tubes in the
    // icon's own inks (a pink script TRUE, an aqua 82), on a smooth stock; the icon keeps its print and stacked depth.
    { id: "team-nights-vice", name: "Heat Vice", line: "A neon sign over a South Beach sunset.",
      note: "Pink and aqua on midnight, like the Vice jerseys: the name in neon tubes over a neon grid, a ball rising through the net. Glowing buttons stand on a stacked pink and aqua base; wins print aqua and losses pink, and the votes and tags follow them; upright Big Shoulders type.",
      rc: { neon: "more", btnDepth: "stacked", wl: "swap", votes: "wl", palette: "vice", ground: "night", layout: "inline", font: "yellowtail", font82: "bigshoulders", ink82: "a",
        wordTex: "neon", neonInk: "icon", tooth: 0,
        depth: "stack", concept: "hoop-sunrise", iconStyle: "print", backdrop: "grid", adds: ["star"],
        btn: "neon", card: "outline", chip: "ink", corners: "round", texture: "none", disp: "bigshoulders", body: "rubik", mono: "spacemono" } },
    // No rays behind the name: the pink 82 sat on pink-red rays and turned to a smudge at header size.
    { id: "team-nights-fiesta", name: "Fiesta", line: "Spurs fiesta: turquoise, pink and confetti.",
      note: "Turquoise ink with a pink offset on every button, on black like the 90s Spurs. The masthead throws confetti around a pink 82 and a sticker star.",
      rc: { palette: "fiesta", ground: "night", layout: "inline", font: "shrikhand", ink82: "a",
        depth: "stack", concept: "star-ball", iconStyle: "sticker", backdrop: "none", adds: ["confetti"],
        btn: "offset", card: "outline", chip: "ink", corners: "round", texture: "none", disp: "shrikhand", body: "dmsans", mono: "dmmono" } },
    { id: "team-nights-showtime", name: "Showtime", line: "Forum gold, purple keys, a trophy in lights.",
      note: "The Lakers home gold: the whole site on gold paper, with purple keycaps and ticket cards. The masthead is a purple band with a polished gold trophy under spotlights.",
      rc: { palette: "showtime", ground: "day", layout: "inline", font: "kanit", wordTex: "shine",
        depth: "extrude", concept: "trophy", iconStyle: "print", backdrop: "rays", adds: [], starve: 0.2, grain: 0.4,
        btn: "keycap", card: "ticket", chip: "keycap", corners: "soft", texture: "none", disp: "anton", body: "barlow", mono: "plexmono" } },
    { id: "team-nights-sunburst", name: "Purple Sunburst", line: "A streaking ball over a desert sunburst.",
      note: "The 93 Suns: an orange ball streaks across sunflower rays. Orange halftone buttons with a sunflower offset, on deep purple.",
      rc: { palette: "sunburst", ground: "night", layout: "inline", font: "racing", shape: "slant",
        depth: "extrude", concept: "comet", iconStyle: "print", backdrop: "rays", adds: [],
        btn: "halftone", card: "flat", chip: "ink", corners: "soft", texture: "none", disp: "racing", body: "worksans", mono: "jetbrains" } },
    { id: "team-nights-rainbow", name: "Rainbow Skyline", line: "Rockies sunrise, printed on white paper.",
      note: "The 80s Nuggets on white paper: blue type, a red offset, rainbow stripes and a mountain sunrise. The whole site goes to paper.",
      rc: { palette: "rainbow", ground: "day", layout: "inline", font: "righteous",
        depth: "stack", concept: "sunset-ridge", iconStyle: "print", backdrop: "none", adds: ["stripes"],
        btn: "offset", card: "paper", chip: "stamp", corners: "round", texture: "none", disp: "righteous", body: "dmsans", mono: "plexmono" } }
  ]);
})();
