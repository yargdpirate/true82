/* ---------- TRUE 82 LAB: wordmark faces ----------
   Every face is a Google Font. `css` is the family=... fragment for the
   Google Fonts request (the lab builds one request from all of them).
   group: how the console groups them.
   Every face here was checked to render as itself (LAB.fontRenders), not a fallback.
   Figures that are shorter than the caps (old-style figures in Playfair, Pacifico) are scaled up to cap
   height by the layout, so "82" always stands as tall as "TRUE".
   display: false marks a masthead-only face: fine as a big wordmark, unreadable as a site heading (neon
   tube lines, a built-in 3D shade, a signature script). The site's Display type list and the display
   face ("Match the wordmark") skip it: LAB.displayFonts() lists the faces a heading may use and
   LAB.displayFace(rc) resolves rc.disp (banner.js). */
(function () {
  var F = window.LAB.font;
  // House
  F({ id: "barlow", name: "Barlow Condensed", family: "Barlow Condensed", weight: 700, css: "Barlow+Condensed:ital,wght@0,500;0,600;0,700;0,800;0,900;1,700;1,900", group: "House", note: "Today's display face" });
  F({ id: "plexmono", name: "IBM Plex Mono", family: "IBM Plex Mono", weight: 600, css: "IBM+Plex+Mono:wght@400;500;600;700", group: "House", note: "Today's data face" });
  F({ id: "dmserif", name: "DM Serif Display", family: "DM Serif Display", weight: 400, css: "DM+Serif+Display:ital@0;1", group: "House", note: "The v50 value serif" });
  // Athletic block
  F({ id: "barlow900", name: "Barlow Condensed Black", family: "Barlow Condensed", weight: 900, css: "", group: "Athletic", note: "Today's face, heavier" });
  F({ id: "bigshoulders", name: "Big Shoulders", family: "Big Shoulders Display", weight: 900, css: "Big+Shoulders+Display:wght@700;800;900", group: "Athletic", note: "Chicago park-district signage" });
  F({ id: "anton", name: "Anton", family: "Anton", weight: 400, css: "Anton", group: "Athletic", note: "Tall poster grotesk" });
  F({ id: "bebas", name: "Bebas Neue", family: "Bebas Neue", weight: 400, css: "Bebas+Neue", group: "Athletic" });
  F({ id: "oswald", name: "Oswald", family: "Oswald", weight: 700, css: "Oswald:wght@500;700", group: "Athletic" });
  F({ id: "graduate", name: "Graduate", family: "Graduate", weight: 400, css: "Graduate", group: "Athletic", note: "Varsity block, the letterman jacket" });
  F({ id: "alfaslab", name: "Alfa Slab One", family: "Alfa Slab One", weight: 400, css: "Alfa+Slab+One", group: "Athletic", note: "Jersey slab" });
  F({ id: "bowlby", name: "Bowlby One SC", family: "Bowlby One SC", weight: 400, css: "Bowlby+One+SC", group: "Athletic", note: "Fat arena caps" });
  F({ id: "teko", name: "Teko", family: "Teko", weight: 600, css: "Teko:wght@500;600;700", group: "Athletic", note: "Scoreboard condensed" });
  F({ id: "sixcaps", name: "Six Caps", family: "Six Caps", weight: 400, css: "Six+Caps", group: "Athletic", note: "Ultra-condensed" });
  F({ id: "kanit", name: "Kanit Black Italic", family: "Kanit", weight: 900, style: "italic", css: "Kanit:ital,wght@1,800;1,900", group: "Athletic", note: "Sneaker-box italic" });
  F({ id: "russo", name: "Russo One", family: "Russo One", weight: 400, css: "Russo+One", group: "Athletic" });
  F({ id: "staatliches", name: "Staatliches", family: "Staatliches", weight: 400, css: "Staatliches", group: "Athletic" });
  F({ id: "ultra", name: "Ultra", family: "Ultra", weight: 400, css: "Ultra", group: "Athletic", note: "Fat college slab, the letterman sweater" });
  F({ id: "protest", name: "Protest Strike", family: "Protest Strike", weight: 400, css: "Protest+Strike", group: "Athletic", note: "Tall arena-poster grotesk" });
  // Retro and fun
  F({ id: "shrikhand", name: "Shrikhand", family: "Shrikhand", weight: 400, css: "Shrikhand", group: "Retro", note: "70s italic display" });
  F({ id: "righteous", name: "Righteous", family: "Righteous", weight: 400, css: "Righteous", group: "Retro", note: "70s streamline" });
  F({ id: "monoton", name: "Monoton", family: "Monoton", weight: 400, css: "Monoton", group: "Retro", note: "Neon tube lines", display: false });
  F({ id: "bungee", name: "Bungee", family: "Bungee", weight: 400, css: "Bungee", group: "Retro", note: "Vertical signage" });
  F({ id: "bungeeshade", name: "Bungee Shade", family: "Bungee Shade", weight: 400, css: "Bungee+Shade", group: "Retro", note: "Built-in 3D shade", display: false });
  F({ id: "bungeeinline", name: "Bungee Inline", family: "Bungee Inline", weight: 400, css: "Bungee+Inline", group: "Retro" });
  F({ id: "titan", name: "Titan One", family: "Titan One", weight: 400, css: "Titan+One", group: "Retro", note: "Soft and round" });
  F({ id: "rubikmono", name: "Rubik Mono One", family: "Rubik Mono One", weight: 400, css: "Rubik+Mono+One", group: "Retro" });
  F({ id: "unbounded", name: "Unbounded", family: "Unbounded", weight: 900, css: "Unbounded:wght@700;900", group: "Retro", note: "Wide and loud" });
  F({ id: "dela", name: "Dela Gothic One", family: "Dela Gothic One", weight: 400, css: "Dela+Gothic+One", group: "Retro" });
  F({ id: "racing", name: "Racing Sans One", family: "Racing Sans One", weight: 400, css: "Racing+Sans+One", group: "Retro", note: "Motorsport italic" });
  F({ id: "chango", name: "Chango", family: "Chango", weight: 400, css: "Chango", group: "Retro", note: "Fat 70s ABA bubble" });
  F({ id: "jersey10", name: "Jersey 10", family: "Jersey 10", weight: 400, css: "Jersey+10", group: "Retro", note: "Pixel scoreboard lamps" });
  // Script (Vice nights)
  F({ id: "yellowtail", name: "Yellowtail", family: "Yellowtail", weight: 400, css: "Yellowtail", group: "Script", note: "Neon script; pair with a block 82" });
  F({ id: "pacifico", name: "Pacifico", family: "Pacifico", weight: 400, css: "Pacifico", group: "Script" });
  F({ id: "mrdafoe", name: "Mr Dafoe", family: "Mr Dafoe", weight: 400, css: "Mr+Dafoe", group: "Script", note: "Brush signature", display: false });
  F({ id: "knewave", name: "Knewave", family: "Knewave", weight: 400, css: "Knewave", group: "Script", note: "Brush italic, a coach's marker" });
  F({ id: "sansita", name: "Sansita Swashed", family: "Sansita Swashed", weight: 900, css: "Sansita+Swashed:wght@900", group: "Script", note: "70s sports script with swashes" });
  // Serif
  F({ id: "abril", name: "Abril Fatface", family: "Abril Fatface", weight: 400, css: "Abril+Fatface", group: "Serif", note: "Fat Didone" });
  F({ id: "fraunces", name: "Fraunces Black", family: "Fraunces", weight: 900, css: "Fraunces:opsz,wght@144,900", group: "Serif", note: "Soft, wonky, warm" });
  F({ id: "playfair", name: "Playfair Black", family: "Playfair Display", weight: 900, css: "Playfair+Display:ital,wght@0,900;1,900", group: "Serif" });
  // Stencil and grit
  F({ id: "sairastencil", name: "Saira Stencil", family: "Saira Stencil One", weight: 400, css: "Saira+Stencil+One", group: "Stencil", note: "Equipment-crate stencil" });
  F({ id: "blackops", name: "Black Ops One", family: "Black Ops One", weight: 400, css: "Black+Ops+One", group: "Stencil" });
  F({ id: "rubikdirt", name: "Rubik Dirt", family: "Rubik Dirt", weight: 400, css: "Rubik+Dirt", group: "Stencil", note: "Worn rubber stamp" });
})();
