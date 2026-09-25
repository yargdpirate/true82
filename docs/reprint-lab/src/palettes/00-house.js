/* ---------- TRUE 82 LAB: house palettes (and the palette schema) ----------
   LAB.palette({ id, name, group, blurb, stock, darkMode, inks, map, sys })
   inks: slot -> Riso swatch key (see RISO.SWATCH) or a hex string.
     key  the main ink (the wordmark)      a, b, c  the other drums, in order
     On dark stock the key must be a light ink (it prints last, on top).
   map:  masthead role -> slot (roles in banner.js). Unmapped roles use DEFAULT_MAP.
   stock: the paper this palette wants by default (RISO.STOCKS key).
   darkMode: on dark stock, "normal" (opaque inks) or "screen" (glowing fluorescent inks).
   group: "House", "Team nights" or "Riso classics" (the console groups by it).
   sys: the site colors this palette implies, for both grounds (system/00-theme.js
     turns them into every --t-<role>):
       night = the site on a dark ground, day = the whole site printed on paper.
     Every palette gives all 24 keys for both grounds:
       ground ground2 ground3 line          page, panels, wells, rules
       text text2                           text on the ground (>= 7:1 and >= 4.5:1)
       accent accentHi accentEdge accentInk the primary action keycap: face, top, extrusion, letters (>= 4.5:1)
       metal offset                         ornament lines; the misregistration ink
       bad badEdge badInk                   NO, losses, bad traits (badInk on paper >= 4.5:1)
       good you                             positive; the "you" marker
       paper paper2 ink ink2                the paper world: slips, wells, ink text (ink on paper >= 7:1)
       sun sunEdge sunInk                   the paper world's yes keycap (ink reads on it)
     One meaning per color: accent is never red, bad is always red, good is green.
   Palettes are listed in load order (files alphabetical), best first. */
(function () {
  var P = window.LAB.palette, R = window.RISO;

  // Stocks some palettes want that the engine's book lacks (added only if missing).
  var MORE_STOCKS = {
    purple: { name: "Purple",  paper: "#211436", fibre: "#3A2A5C", fleck: "#57468A", dark: true },
    teal:   { name: "Teal",    paper: "#0C2427", fibre: "#1D4448", fleck: "#33666A", dark: true }
  };
  for (var sk in MORE_STOCKS) if (R && R.STOCKS && !R.STOCKS[sk]) R.STOCKS[sk] = MORE_STOCKS[sk];

  // Gold Standard reads today's colors from the theme (LAB.TODAY), which loads after
  // the palettes, so its sys is a pair of getters with a literal fallback.
  var TODAY_FALLBACK = {
    night: { ground: "#101418", ground2: "#1A2027", ground3: "#232B34", line: "#6E5530", text: "#E8E4D8", text2: "#9AA0A6",
      accent: "#FFB52E", accentEdge: "#9E5A0F", accentHi: "#F8B647", accentInk: "#2A1A05", metal: "#B98A4F",
      offset: "#FF48B0", bad: "#E2654E", good: "#3FAE5A", you: "#0078BF", paper: "#F4ECDD", ink: "#232A4E", sun: "#FFB511" },
    day: { ground: "#EFE7D6", ground2: "#F7F1E4", ground3: "#E4D9C2", line: "#C8B894", text: "#232A4E", text2: "#5B5E73",
      accent: "#FFB511", accentEdge: "#C7870A", accentHi: "#FFD266", accentInk: "#232A4E", metal: "#9E7A45",
      offset: "#FF48B0", bad: "#F65058", good: "#00875A", you: "#0078BF", paper: "#FBF6EC", ink: "#232A4E", sun: "#FFB511" }
  };
  // extra fills the keys TODAY leaves out; over replaces TODAY's own value (used by day only).
  function todaySys(nightExtra, dayExtra, dayOver) {
    function build(g, extra, over) {
      var src = (window.LAB.TODAY && window.LAB.TODAY[g]) || TODAY_FALLBACK[g], o = {}, k;
      for (k in src) o[k] = src[k];
      for (k in extra) if (!o[k]) o[k] = extra[k];
      for (k in over || {}) o[k] = over[k];
      return o;
    }
    return { get night() { return build("night", nightExtra); }, get day() { return build("day", dayExtra, dayOver); } };
  }

  P({ id: "printshop", name: "Print Shop", group: "House",
    blurb: "The v50 results drum: navy key, fluorescent pink offsets, sunflower, riso blue, on cream.",
    stock: "cream", inks: { key: "navy", a: "fluopink", b: "sunflower", c: "blue" },
    map: { word: "key", word82: "key", depth: "a", shade: "c", body: "b", line: "key", glow: "a", accent: "c", frame: "key", tag: "a", back: "c" },
    sys: {
      night: {
        ground: "#141A33", ground2: "#24293F", ground3: "#313549", line: "#5D544E", text: "#F4ECDD", text2: "#A9ACC4",
        accent: "#FFB511", accentHi: "#FFCF64", accentEdge: "#B97F06", accentInk: "#232A4E", metal: "#B79B6E", offset: "#FF48B0",
        bad: "#FF5E66", badEdge: "#A63D42", badInk: "#4F1D20", good: "#33A065", you: "#3790D8", paper: "#F4ECDD",
        paper2: "#E5DED3", ink: "#232A4E", ink2: "#545770", sun: "#FFB511", sunEdge: "#C7870A", sunInk: "#8A5D00" },
      day: {
        ground: "#F2EADA", ground2: "#FBF6EC", ground3: "#E7DDC8", line: "#CDBF9F", text: "#232A4E", text2: "#555A74",
        accent: "#232A4E", accentHi: "#3A4272", accentEdge: "#E0348E", accentInk: "#FBF6EC", metal: "#9E7A45", offset: "#FF48B0",
        bad: "#FF5E66", badEdge: "#B8323B", badInk: "#4F1D20", good: "#007C53", you: "#0078BF", paper: "#FBF6EC",
        paper2: "#ECE8E1", ink: "#232A4E", ink2: "#5B5E73", sun: "#FFB511", sunEdge: "#C7870A", sunInk: "#8A5D00" } } });

  P({ id: "goldstandard", name: "Gold Standard", group: "House",
    blurb: "Today's site, printed: chalk and amber on the night table.",
    stock: "ink", darkMode: "normal", inks: { key: "#ECE6D6", a: "#FFB52E", b: "#B98A4F", c: "#6E5530" },
    map: { word: "key", word82: "key", depth: "c", shade: "c", body: "a", line: "b", glow: "a", accent: "b", frame: "b", tag: "b", back: "c" },
    // night is exactly LAB.TODAY.night (read when the theme asks, since system/ loads after palettes/),
    // plus the literals today's CSS uses for the keys TODAY leaves out. Day is LAB.TODAY.day with a
    // maple keycap (amber can't be read as heading text on paper) and a deeper green.
    sys: todaySys({ paper2: "#EAE2D1", ink2: "#5B5E73", badEdge: "#B8323B", badInk: "#2A0703", sunEdge: "#C7870A", sunInk: "#8A5D00" },
      { paper2: "#EFE7D6", ink2: "#5B5E73", badEdge: "#B8323B", badInk: "#4A0E12", sunEdge: "#C7870A", sunInk: "#8A5D00" },
      { accent: "#7A4A12", accentHi: "#94622A", accentEdge: "#4A2A08", accentInk: "#FFD27A", good: "#007A50", bad: "#FF5C63" }) });

  P({ id: "vice", name: "Vice", group: "Team nights",
    blurb: "Heat Vice nights: fluorescent pink keys and aqua glow on midnight.",
    stock: "midnight", darkMode: "screen", inks: { key: "#F7F3FF", a: "fluopink", b: "aqua", c: "violet" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "a", line: "b", glow: "b", accent: "c", frame: "b", tag: "b", back: "c" },
    sys: {
      night: {
        ground: "#16122B", ground2: "#26223A", ground3: "#332F47", line: "#534176", text: "#F7F3FF", text2: "#A6A2B3",
        accent: "#FF48B0", accentHi: "#FF88CC", accentEdge: "#7A2559", accentInk: "#2B0620", metal: "#9D7AD2", offset: "#41C6EA",
        bad: "#FF5A4E", badEdge: "#A63B33", badInk: "#4C1B17", good: "#32A66E", you: "#7A89FA", paper: "#FDF2F7",
        paper2: "#EEE3EB", ink: "#2A1B4A", ink2: "#64577A", sun: "#FFB511", sunEdge: "#BF880D", sunInk: "#8C6409" },
      day: {
        ground: "#FBEEF4", ground2: "#FDF7FA", ground3: "#EADDE6", line: "#D1C4D2", text: "#2A1B4A", text2: "#645579",
        accent: "#D41F84", accentHi: "#DB4398", accentEdge: "#8E0F57", accentInk: "#FFFFFF", metal: "#8467C0", offset: "#12A5CC",
        bad: "#FF4B3E", badEdge: "#B8362D", badInk: "#451411", good: "#0A7F4B", you: "#4A4FD6", paper: "#FFF8FB",
        paper2: "#F0E9EF", ink: "#2A1B4A", ink2: "#6A5D7F", sun: "#FFB511", sunEdge: "#BF880D", sunInk: "#8C6409" } } });
})();
