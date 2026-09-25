/* ---------- TRUE 82 LAB: the component layer ----------
   Component styles (buttons, cards, chips, corners, textures, the paper
   ground) are CSS written against the site's real selectors and switched by
   data-* attributes on the snapshot's <html>:
     html[data-btn="offset"]   html[data-card="paper"]   html[data-chip="ink"]
     html[data-corners="round"] html[data-texture="grain"] html[data-ground="day"]
   Each file registers generators:  LAB.component({ id, css: function (rc) { return "..." } })
   Colors always come from role variables (--t-<role>), never literals, so
   every component works in every palette. Radii come from --t-r-btn,
   --t-r-card, --t-r-chip. The paper texture arrives as --t-paper-tex.
   With the "Today's site" color setting, no component CSS is applied. */
(function () {
  var LAB = window.LAB, R = window.RISO;
  LAB.comp = LAB.comp || [];
  LAB.component = function (def) { LAB.comp = LAB.comp.filter(function (c) { return c.id !== def.id; }); LAB.comp.push(def); return def; };
  LAB.componentCSS = function (rc) {
    return LAB.comp.map(function (c) {
      try { return "/* " + c.id + " */\n" + (c.css(rc) || ""); } catch (e) { console.error("[lab] component " + c.id, e); return ""; }
    }).join("\n");
  };
  // :is() helper for selector lists
  LAB.is = function (list) { return ":is(" + list.join(", ") + ")"; };

  // Paper texture for surfaces: a small tile of the riso paper, tinted by the ground.
  var texCache = {};
  LAB.textureURL = function (rc) {
    var roles = LAB.roles(LAB.palettes[rc.sysPalette && rc.sysPalette !== "match" && rc.sysPalette !== "today" ? rc.sysPalette : rc.palette], rc.ground || "night");
    var key = (rc.texture || "none") + roles.paper + roles.ground;
    if (texCache[key]) return texCache[key];
    var st = { name: "tex", paper: roles.paper, fibre: LAB.color.mix(roles.paper, roles.ink, 0.35), fleck: LAB.color.mix(roles.paper, roles.ink, 0.55), dark: false };
    var P = R.plate({ W: 360, vw: 1000, vh: 1000, seed: 11, stock: st, texture: 1.2 });
    texCache[key] = P.paper.toDataURL("image/jpeg", 0.82);
    return texCache[key];
  };

  // Hooks that run after a snapshot is themed (e.g. re-inking the riso canvases).
  LAB.pageHooks = LAB.pageHooks || [];
})();
