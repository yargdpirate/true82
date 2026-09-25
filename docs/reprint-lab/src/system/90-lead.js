/* ---------- TRUE 82 LAB: the lead's cross-cutting patches ----------
   Small fixes found in the final QA sweep that sit between owners' files.
   Everything is computed from the recipe's roles, so it holds in every palette. */
(function () {
  var LAB = window.LAB, C = LAB.color;
  function hue(hex) {
    var c = window.RISO.hexRGB(hex), r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
    if (!d) return -1;
    if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60; return h < 0 ? h + 360 : h;
  }
  function near(a, b, deg) { var x = hue(a), y = hue(b); if (x < 0 || y < 0) return false; var d = Math.abs(x - y); return Math.min(d, 360 - d) < deg; }
  function rolesFor(rc) { return LAB.roles(LAB.palettes[rc.sysPalette && rc.sysPalette !== "match" && rc.sysPalette !== "today" ? rc.sysPalette : rc.palette], rc.ground || "night"); }

  LAB.component({ id: "lead-patches", css: function (rc) {
    var r = rolesFor(rc), s = "";
    // 1. Good news on the reel (the streak line, SWEPT) is small type on paper. The site prints it in a deep pink;
    //    a palette's bright offset is too faint, and where the offset is red it reads as a loss. Use a deepened
    //    offset, or fire gold when the offset sits next to the bad red.
    var newsBase = near(r.offset, r.bad, 38) ? r.sun : r.offset;
    var news = C.ensure(newsBase, r.paper, 4.5, r.ink);
    s += "html[data-btn] .reel-overlay.riso .riso-streak:not(.dead):not(.cold), html[data-btn] .reel-overlay.riso .riso-swept { color: " + news + "; border-color: " + news + "; }\n";
    s += "html[data-btn] [data-kit-ghost] .riso-streak, html[data-btn] [data-kit-ghost] .riso-swept { color: var(--t-text); border-color: var(--t-text); }\n";

    // 2. The hot pick is the best pick (a bonus), so it wears fire gold, not the NO red. Re-point the bad roles on
    //    the hot pick's own marks only; the trait tags inside keep the real red for bad traits.
    var hot = r.sun, hotInk = C.ensure(r["sun-ink"] || r.sun, r.paper, 4.5, r.ink), hotEdge = r["sun-edge"] || r.sun;
    // (the results page also carries its own scarlet as --rr-scar*, resolved on .rr, so those are re-pointed too)
    var HOTV = "--t-bad: " + hot + "; --t-bad-ink: " + hotInk + "; --t-bad-edge: " + hotEdge + "; --s-p-bad: " + hotInk + "; --c-bad: " + hot + "; --c-bad-edge: " + hotEdge + "; --c-bad-lab: " + C.inkOn(hot, r.ink, r.paper) + "; --c-bad-ink: " + hotInk + ";" +
      " --rr-scar: " + hot + "; --rr-scar-edge: " + hotEdge + "; --rr-scar-deep: " + hotInk + ";";
    s += "html[data-btn] .rr .bt-card.hot-pick { --t-bad: " + hot + "; --rr-scar: " + hot + "; --rr-scar-edge: " + hotEdge + "; --rr-scar-deep: " + hotInk + "; }\n";
    s += "html[data-btn] .rr .bt-card.hot-pick > * { --t-bad: " + r.bad + "; --rr-scar: " + r.bad + "; --rr-scar-edge: " + r["bad-edge"] + "; --rr-scar-deep: " + r["bad-ink"] + "; }\n";
    s += "html[data-btn] .rr .hot-pick .pr-name, html[data-btn] .rr .hot-pick .bt-val, html[data-btn] .rr .hot-pick .slot-badge, html[data-btn] .rr .hot-pick .hot-bonus, html[data-btn] .rr .big-label .net-bonus { " + HOTV + " }\n";

    // 3. Text printed on the results paper in the good green or the "you" blue: the night palette's versions are
    //    too light on cream, so deepen them to 4.5:1 inside the results page.
    s += "html[data-btn] .rr { --t-good: " + C.ensure(r.good, r.paper, 4.5, r.ink) + "; --t-you: " + C.ensure(r.you, r.paper, 4.5, r.ink) + "; }\n";

    // 4. The Daily plaque title on paper cards: the site's 0.85 opacity washes the gold out.
    s += "html[data-card=\"paper\"] .daily-tile .dt-title { opacity: 1; }\n";
    return s;
  } });
})();
