/* ---------- TRUE 82 LAB: button depth ----------
   Styles that print a button flat (neon, pill, stamp, ticket) can stand it on a base, so it reads as
   something to press (recipe key "btnDepth"):
     flat     as the style draws it
     stacked  two slabs under the face, like the masthead's stack depth: the button's own ink, then the
              palette's second ink (for Heat Vice: pink over aqua on the main action, aqua over pink on
              the secondaries). The button sinks into its base when pressed.
     keycap   one solid slab, the button's own ink pushed toward the shadow, and the same press
   Keycap, offset, halftone and sticker buttons already carry depth; they are left as they are.
   Colors come from the controls layer's family variables (--k-*) and the neon layer's second tube
   (--lab-neon2), so depth follows every palette. Rules sit under a seven-id boost: they restate the
   style's own shadow (glow included) with the base added, so they must outrank the neon amount layer. */
(function () {
  var LAB = window.LAB;
  LAB.SYS.btnDepth = [["flat", "Flat"], ["stacked", "Stacked"], ["keycap", "Keycap"]];
  LAB.SYS_DEFAULT.btnDepth = "flat";
  LAB.DEFAULT.btnDepth = "flat";

  var FLATS = { neon: 1, pill: 1, stamp: 1, ticket: 1 };
  function mix(a, pct, b) { return "color-mix(in srgb, " + a + " " + pct + "%, " + (b || "transparent") + ")"; }
  function rule(sel, body) { return sel + " { " + body + " }\n"; }
  function is(list) { return ":is(" + list.join(", ") + ")"; }

  LAB.component({ id: "button-depth", css: function (rc) {
    var d = rc.btnDepth || "flat";
    if (d === "flat" || !FLATS[rc.btn] || !LAB.CTL) return "";
    var F = LAB.CTL.FAM, NOT = LAB.CTL.NOT, PRESS = LAB.CTL.PRESS;
    var X = ':is(#lab-d#lab-d#lab-d#lab-d#lab-d#lab-d#lab-d, html)[data-btn="' + rc.btn + '"] ';
    var SHAPED = F.pri.concat(F.yes, F.no, F.good || [], F.sec);         // quiet and text buttons stay flat
    var A = X + is(SHAPED) + NOT + ":not(:disabled)";
    var neon = rc.btn === "neon", s = "";
    // the style's own light: neon keeps its glow under the base
    var glow = neon ? ", 0 0 0 1px " + mix("var(--k-neon)", 30) + ", 0 0 8px " + mix("var(--k-neon)", 60) + ", 0 0 20px -2px " + mix("var(--k-neon)", 45) + ", inset 0 0 9px " + mix("var(--k-neon)", 32) : "";
    var glowP = neon ? ", 0 0 0 1px " + mix("var(--k-neon)", 30) + ", 0 0 14px " + mix("var(--k-neon)", 60) + ", 0 0 32px -2px " + mix("var(--k-neon)", 45) + ", inset 0 0 9px " + mix("var(--k-neon)", 32) : "";
    // the slabs' inks: the button's own, then the other one (secondaries swap, so the pair reads both ways)
    var own = neon ? "var(--k-neon)" : "var(--k-edge)", second = neon ? "var(--lab-neon2, var(--t-offset))" : "var(--c-off, var(--t-offset))";
    s += rule(X + is(SHAPED) + NOT, "--dp-1: " + own + "; --dp-2: " + second + ";");
    s += rule(X + is(F.sec) + NOT, "--dp-2: " + (neon ? "var(--t-accent)" : "var(--k-edge)") + ";");
    if (d === "stacked") {
      s += rule(A, "box-shadow: 0 3px 0 0 var(--dp-1), 0 6px 0 0 var(--dp-2)" + glow + "; transform: none; transition: transform 70ms ease, box-shadow 70ms ease;");
      s += rule(A + PRESS, "transform: translateY(6px); box-shadow: 0 0 0 0 var(--dp-1), 0 0 0 0 var(--dp-2)" + glowP + ";");
    } else {
      var slab = mix(neon ? "var(--k-neon)" : "var(--k-face)", 50, "var(--t-shadow)");
      s += rule(A, "box-shadow: 0 5px 0 0 " + slab + glow + "; transform: none; transition: transform 70ms ease, box-shadow 70ms ease;");
      s += rule(A + PRESS, "transform: translateY(4px); box-shadow: 0 1px 0 0 " + slab + glowP + ";");
    }
    return s;
  } });
})();
