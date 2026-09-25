/* ---------- TRUE 82 LAB: riso classics ----------
   Pure two-drum risograph combinations. Schema: see 00-house.js. */
(function () {
  var P = window.LAB.palette;
  P({ id: "pinkblue", name: "Pink and Blue", group: "Riso classics",
    blurb: "Fluorescent pink and riso blue: the two-drum classic.",
    stock: "bond", inks: { key: "blue", a: "fluopink", b: "fluopink", c: "blue" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "b", line: "key", glow: "a", accent: "b", frame: "key", tag: "a", back: "c" },
    sys: {
      night: {
        ground: "#1A2140", ground2: "#29304D", ground3: "#363D58", line: "#585876", text: "#F4F7FB", text2: "#A6AAB8",
        accent: "#FF48B0", accentHi: "#FF88CC", accentEdge: "#7B265C", accentInk: "#2B0620", metal: "#A39CB8", offset: "#FF48B0",
        bad: "#FF5A4E", badEdge: "#A63B33", badInk: "#4C1B17", good: "#32A66E", you: "#3094E6", paper: "#F6F4F0",
        paper2: "#E5E6E4", ink: "#05294A", ink2: "#476178", sun: "#FFB511", sunEdge: "#BF880D", sunInk: "#8C6409" },
      day: {
        ground: "#F5F4F0", ground2: "#FFFFFF", ground3: "#E2E4E3", line: "#C5CBCF", text: "#05294A", text2: "#476178",
        accent: "#CC1F7A", accentHi: "#D4438F", accentEdge: "#85104E", accentInk: "#FFFFFF", metal: "#767083", offset: "#FF48B0",
        bad: "#FF5245", badEdge: "#B83B32", badInk: "#471713", good: "#12804A", you: "#0078BF", paper: "#FFFFFF",
        paper2: "#EEF0F2", ink: "#05294A", ink2: "#506980", sun: "#FFB511", sunEdge: "#BF880D", sunInk: "#8C6409" } } });

  P({ id: "burgundyaqua", name: "Burgundy and Aqua", group: "Riso classics",
    blurb: "Burgundy and aqua on cream: soft, bookish, bright.",
    stock: "cream", inks: { key: "burgundy", a: "aqua", b: "aqua", c: "burgundy" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "b", line: "key", glow: "a", accent: "b", frame: "key", tag: "a", back: "c" },
    sys: {
      night: {
        ground: "#1E1119", ground2: "#2D2028", ground3: "#3A2D35", line: "#5C3F4F", text: "#F7ECF0", text2: "#A99DA3",
        accent: "#5EC8E5", accentHi: "#96DBEE", accentEdge: "#305F6E", accentInk: "#2A0F1E", metal: "#A77792", offset: "#D86AA2",
        bad: "#FF6A3D", badEdge: "#A64528", badInk: "#522214", good: "#5B9E58", you: "#6B86F5", paper: "#F6EEE2",
        paper2: "#EAE0D6", ink: "#4E1F38", ink2: "#785363", sun: "#5EC8E5", sunEdge: "#4796AC", sunInk: "#346E7E" },
      day: {
        ground: "#F3EBDD", ground2: "#FBF7EF", ground3: "#E5DACF", line: "#D0C1BA", text: "#421A2F", text2: "#6F4F5B",
        accent: "#914E72", accentHi: "#A36A89", accentEdge: "#5A2A45", accentInk: "#FFFFFF", metal: "#8E6A7E", offset: "#2FA8CC",
        bad: "#FF5443", badEdge: "#B83C30", badInk: "#4A1813", good: "#1E7F3E", you: "#2F5FD0", paper: "#FDF9F2",
        paper2: "#F0E9E4", ink: "#421A2F", ink2: "#765865", sun: "#5EC8E5", sunEdge: "#4796AC", sunInk: "#346E7E" } } });

  P({ id: "tealorange", name: "Teal and Orange", group: "Riso classics",
    blurb: "Teal and fluorescent orange on white bond.",
    stock: "bond", inks: { key: "teal", a: "fluoorange", b: "fluoorange", c: "teal" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "b", line: "key", glow: "a", accent: "b", frame: "key", tag: "a", back: "c" },
    sys: {
      night: {
        ground: "#0A2224", ground2: "#1A3133", ground3: "#283E3F", line: "#305959", text: "#F2F7F5", text2: "#9EAAAA",
        accent: "#35CFCB", accentHi: "#7CE0DD", accentEdge: "#1A6664", accentInk: "#042426", metal: "#5E9C9A", offset: "#FF7F66",
        bad: "#FF5769", badEdge: "#A63944", badInk: "#4C1A1F", good: "#669E41", you: "#5B95D1", paper: "#F5F4EF",
        paper2: "#E4E6E2", ink: "#063034", ink2: "#436264", sun: "#FFB21E", sunEdge: "#BF8617", sunInk: "#8C6211" },
      day: {
        ground: "#F4F3EE", ground2: "#FFFFFF", ground3: "#E1E3DF", line: "#C4CBC8", text: "#052D30", text2: "#476364",
        accent: "#00717A", accentHi: "#29888F", accentEdge: "#00444A", accentInk: "#FFFFFF", metal: "#4F8A88", offset: "#FF7A5E",
        bad: "#FF506D", badEdge: "#B83A4E", badInk: "#4A1720", good: "#3F7F10", you: "#2A5FC4", paper: "#FFFFFF",
        paper2: "#EEF0F1", ink: "#052D30", ink2: "#4A6769", sun: "#FFB21E", sunEdge: "#BF8617", sunInk: "#8C6211" } } });

  P({ id: "violetmint", name: "Violet and Mint", group: "Riso classics",
    blurb: "Violet and mint: a pastel two-drum print, cool and dreamy.",
    stock: "bond", inks: { key: "purple", a: "mint", b: "mint", c: "violet" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "b", line: "key", glow: "a", accent: "b", frame: "key", tag: "a", back: "c" },
    sys: {
      night: {
        ground: "#18132A", ground2: "#272339", ground3: "#353045", line: "#4B426A", text: "#F4F1FA", text2: "#A5A1AF",
        accent: "#82D8D5", accentHi: "#AEE6E4", accentEdge: "#406869", accentInk: "#1C1236", metal: "#8A7CB8", offset: "#A98BE8",
        bad: "#FF5E6A", badEdge: "#A63D45", badInk: "#4F1D21", good: "#749F4A", you: "#5592F0", paper: "#F5F3F8",
        paper2: "#E7E4ED", ink: "#32205E", ink2: "#645585", sun: "#82D8D5", sunEdge: "#62A2A0", sunInk: "#426D6C" },
      day: {
        ground: "#EFEDF4", ground2: "#FBFAFD", ground3: "#E0DCE7", line: "#C8C3D4", text: "#2E1D56", text2: "#5F517E",
        accent: "#6A4CA8", accentHi: "#8269B6", accentEdge: "#3E2A6E", accentInk: "#FFFFFF", metal: "#7A6AA8", offset: "#3FB8B4",
        bad: "#FF506A", badEdge: "#B83A4C", badInk: "#4A171F", good: "#3F7F10", you: "#2F5FD0", paper: "#FDFCFE",
        paper2: "#EFECF2", ink: "#2E1D56", ink2: "#675B84", sun: "#82D8D5", sunEdge: "#62A2A0", sunInk: "#487775" } } });
})();
