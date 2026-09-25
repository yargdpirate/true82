/* ---------- TRUE 82 LAB: the lead's cross-cutting patches ----------
   Small fixes found in the QA sweeps that sit between owners' files.
   Everything is computed from the recipe's roles, so it holds in every palette.
   (Since v51 the site colors the hot pick from --t-hot and the reel from --t-win / --t-loss /
   --t-print-pop itself, so the v50 patches that re-pointed the red roles are gone.) */
(function () {
  var LAB = window.LAB, C = LAB.color;

  LAB.component({ id: "lead-patches", css: function (rc) {
    var r = LAB.rolesFor(rc), s = "", card = r["print-paper"], dark = C.lum(card) < 0.35, to = dark ? "#FFFFFF" : r.ink;
    // 1. The reel's small type (the streak line in the win color, a dead or cold streak in the loss color, SWEPT in
    //    the pop ink) sits on the reel card: lift or deepen each ink until it reads at 4.5:1 there. The coins keep the
    //    true inks; only this type moves.
    var win = C.ensure(r.win, card, 4.5, to), loss = C.ensure(r.loss, card, 4.5, to), pop = C.ensure(r["print-pop"], card, 4.5, to);
    s += "html[data-btn] .reel-overlay .riso-streak:not(.dead):not(.cold) { color: " + win + "; }\n";
    s += "html[data-btn] .reel-overlay .riso-streak:is(.dead, .cold) { color: " + loss + "; }\n";
    s += "html[data-btn] .reel-overlay .riso-swept { color: " + pop + "; border-color: " + pop + "; }\n";
    s += "html[data-btn] [data-kit-ghost] .riso-streak, html[data-btn] [data-kit-ghost] .riso-swept { color: var(--t-text); border-color: var(--t-text); }\n";

    // 2. The Daily plaque title on paper cards: the site's 0.85 opacity washes the gold out.
    s += "html[data-card=\"paper\"] .daily-tile .dt-title { opacity: 1; }\n";
    return s;
  } });
})();
