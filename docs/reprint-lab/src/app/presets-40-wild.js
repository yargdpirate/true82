/* ---------- TRUE 82 Reprint Lab: wild card presets ----------
   The maximal looks: arena signage printed on the riso drum. Each one takes a
   single object from the building (the scoreboard, the marquee, the chrome)
   and carries it through every screen: the masthead, the display type, the
   buttons and the cards all tell one story.
   Cut after review, to keep the list short and every look distinct: Riso Neon
   (the same neon site as Heat Vice) and Sunburst (the same site as Press Proof). */
(function () {
  window.LAB.presets = (window.LAB.presets || []).concat([
    // Center-hung scoreboard: lamp letters beside a lit scoreboard, 82 gold lamps under the name, LED pixel
    // headings, lamp-dot buttons, dark panels. Inline, not the scoreboard panel layout: that plate is 2.38
    // wide, so the header printed it at 220px and the lamp letters turned to speckle.
    { id: "wild-scoreboard", name: "Center Hung", line: "Lamps on the arena scoreboard.",
      note: "The name in scoreboard lamps beside a lit scoreboard, with a row of 82 gold lamps under it. Headings print in LED pixels and every button is lamp dots.",
      rc: { palette: "emerald", layout: "inline", font: "bigshoulders", depth: "extrude", wordTex: "bulbs", concept: "scoreboard",
        iconDepth: "none", adds: ["star", "pips"], starve: 0.4, grain: 0.6,
        ground: "night", btn: "halftone", card: "tunnel", chip: "ink", corners: "square", texture: "none", disp: "jersey10", mono: "jetbrains" } },
    // Theater marquee: bulb letters in a bulb frame, changeable-letter headings, admit-one tickets.
    // Red and black (the Dynasty inks), so it no longer shares Purple Sunburst's colors.
    { id: "wild-marquee", name: "Marquee", line: "Your name in lights over the door.",
      note: "A theater marquee in red and black: white bulbs, a red extrusion, a red bulb frame. Buttons and cards are admit-one tickets.",
      rc: { palette: "dynasty", layout: "marquee", font: "bungee", depth: "extrude", wordTex: "bulbs", concept: "star-ball",
        adds: [], starve: 0.4, grain: 0.6,
        ground: "night", btn: "ticket", card: "ticket", chip: "stamp", corners: "round", texture: "grain", disp: "staatliches" } },
    // 80s chrome: chrome wordmark over a sunset grid, italic headings, copper buttons with a teal offset.
    { id: "wild-chrome", name: "Chrome", line: "80s chrome over a copper sunset grid.",
      note: "A chrome wordmark and a streaking ball over a glowing grid. Copper buttons with a teal offset, outlined cards.",
      rc: { palette: "mountain", layout: "inline", font: "kanit", shape: "slant", depth: "chrome", concept: "comet", backdrop: "grid",
        adds: ["star"], pitch: 1.8, starve: 0.3, grain: 0.5, ground: "night", btn: "offset", card: "outline", chip: "keycap", corners: "soft", texture: "none" } }
  ]);
})();
