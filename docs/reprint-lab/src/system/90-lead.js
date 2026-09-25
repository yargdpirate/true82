/* ---------- TRUE 82 LAB: the lead's cross-cutting patches ----------
   Small fixes found in final QA that sit between owners' files. */
(function () {
  var LAB = window.LAB;
  LAB.component({ id: "lead-patches", css: function () {
    // The riso reel's streak label and SWEPT stamp are small type on paper. The site prints them in a deep
    // pink; a palette's bright offset ink is too faint for 10px text, so pull it toward the ink.
    return "html[data-btn] .reel-overlay.riso .riso-streak:not(.dead):not(.cold), html[data-btn] .reel-overlay.riso .riso-swept" +
      " { color: color-mix(in srgb, var(--t-offset) 52%, var(--t-ink)); border-color: color-mix(in srgb, var(--t-offset) 52%, var(--t-ink)); }\n";
  } });
})();
