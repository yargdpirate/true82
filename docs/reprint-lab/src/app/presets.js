/* ---------- TRUE 82 Reprint Lab: presets ----------
   Complete looks (masthead + site system). The first one is what the lab
   opens on. More presets live in app/presets-*.js, each doing
   LAB.presets = (LAB.presets || []).concat([...]). Each: { id, name, line (one short line on the ticket), note (what
   to look at, shown after picking it), rc (a recipe; unspecified keys use
   LAB.DEFAULT) }. */
(function () {
  var list = [
    { id: "today-printed", name: "Today, printed", line: "The site as it is, masthead reprinted in riso.",
      note: "Your current colors and buttons. Only the masthead changes: the hoop, reprinted in chalk and amber, straight onto the night table.",
      rc: { palette: "goldstandard", sysPalette: "today", concept: "hoop-star", depth: "offset", font: "barlow" } },
    { id: "print-shop", name: "Print Shop", line: "The v50 results drum, everywhere.",
      note: "Navy, fluorescent pink and sunflower on cream, like the results page. Paper cards, offset buttons.",
      rc: { palette: "printshop", ground: "night", btn: "offset", card: "paper", chip: "keycap", concept: "ball-sun", depth: "offset", font: "barlow900", backdrop: "none", adds: ["star", "marks"] } }
  ];
  // Other preset files (app/presets-*.js) push onto LAB.presets; these house looks go first.
  window.LAB.presets = list.concat(window.LAB.presets || []);
})();
