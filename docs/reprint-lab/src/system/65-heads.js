/* ---------- TRUE 82 LAB: section headers ----------
   Since v51 every section header on the site is one component, <h2 class="t-head" data-head="...">,
   with six variants (docs/STYLE-GUIDE.md): eyebrow (small caps label), rule (label with a hairline to
   the edge), bar (display face with an accent bar), title (big display title in the accent), banner
   (a gold band), tab (a folder tab on the card below). app.js picks each context's variant in HEADS.
   This setting (recipe key "heads") shows one variant everywhere, the same as ?heads=<variant> on the
   site: a page hook sets data-head on every .t-head and puts the built one back for "As built". It works
   with "Today's site" colors too. */
(function () {
  var LAB = window.LAB;
  LAB.SYS.heads = [["built", "As built"], ["eyebrow", "Eyebrow"], ["rule", "Rule"], ["bar", "Bar"], ["title", "Title"], ["banner", "Banner"], ["tab", "Tab"]];
  LAB.SYS_DEFAULT.heads = "built";
  LAB.DEFAULT.heads = "built";
  var VARIANTS = LAB.SYS.heads.map(function (o) { return o[0]; });

  LAB.pageHooks = LAB.pageHooks || [];
  LAB.pageHooks.push(function (doc, rc) {
    var want = rc && VARIANTS.indexOf(rc.heads) > 0 ? rc.heads : null;
    doc.querySelectorAll(".t-head").forEach(function (h) {
      if (!h.hasAttribute("data-lab-head")) h.setAttribute("data-lab-head", h.getAttribute("data-head") || "");
      var v = want || h.getAttribute("data-lab-head");
      if (v) h.setAttribute("data-head", v); else h.removeAttribute("data-head");
    });
  });
})();
