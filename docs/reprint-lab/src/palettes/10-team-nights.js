/* ---------- TRUE 82 LAB: team nights ----------
   Palettes after classic NBA uniforms. Schema: see 00-house.js. Best first.
   One meaning per color in every palette: accent = the primary action (never red),
   bad = red for NO and losses, good = green, you = the "you" marker,
   offset = the misregistration ink, sun = the paper world's yes. */
(function () {
  var P = window.LAB.palette;
  P({ id: "showtime", name: "Showtime", group: "Team nights",
    blurb: "Lakers Showtime: gold keys on Forum purple at night, purple keys on gold by day.",
    stock: "purple", darkMode: "normal", inks: { key: "sunflower", a: "violet", b: "melon", c: "#F6EFE0" },
    map: { word: "key", word82: "key", depth: "a", shade: "a", body: "key", line: "c", glow: "key", accent: "a", frame: "key", tag: "c", back: "a" },
    sys: {
      night: {
        ground: "#1B1030", ground2: "#2A203C", ground3: "#372D46", line: "#69513F", text: "#F6EEDC", text2: "#A79E9E",
        accent: "#FDB927", accentHi: "#FED273", accentEdge: "#7A5919", accentInk: "#2A1450", metal: "#C9A052", offset: "#A77BFF",
        bad: "#FF5C63", badEdge: "#A63C40", badInk: "#4C1C1E", good: "#37A163", you: "#4B92E0", paper: "#F7EFDC",
        paper2: "#E9E0D2", ink: "#2A1450", ink2: "#68567A", sun: "#FDB927", sunEdge: "#BE8B1D", sunInk: "#805E13" },
      day: {
        ground: "#F5EACB", ground2: "#FCF6E6", ground3: "#E5D9C1", line: "#CCBFB2", text: "#2A1450", text2: "#624F72",
        accent: "#552583", accentHi: "#704897", accentEdge: "#2E1150", accentInk: "#FDB927", metal: "#A07A2C", offset: "#8A55E6",
        bad: "#FF454B", badEdge: "#B83236", badInk: "#421213", good: "#12804A", you: "#1F66C9", paper: "#FFF9EC",
        paper2: "#F0E9E1", ink: "#2A1450", ink2: "#6A597F", sun: "#FDB927", sunEdge: "#BE8B1D", sunInk: "#8B6615" } } });

  P({ id: "fiesta", name: "Fiesta", group: "Team nights",
    blurb: "Spurs fiesta: turquoise keys, fiesta pink and orange on silver and black.",
    stock: "black", darkMode: "screen", inks: { key: "#EEF0F0", a: "fluored", b: "turquoise", c: "orange" },
    map: { word: "key", word82: "b", depth: "b", shade: "c", body: "c", line: "key", glow: "a", accent: "a", frame: "b", tag: "b", back: "c" },
    sys: {
      night: {
        ground: "#111214", ground2: "#202223", ground3: "#2E2F31", line: "#55585C", text: "#EEF0F0", text2: "#9EA0A1",
        accent: "#16C4B2", accentHi: "#68D9CD", accentEdge: "#0D5E56", accentInk: "#03211D", metal: "#A7ADB3", offset: "#FF4C7C",
        bad: "#FF4A3D", badEdge: "#A63028", badInk: "#451410", good: "#5DA044", you: "#3E98DC", paper: "#F4F3EE",
        paper2: "#E4E4DF", ink: "#15171A", ink2: "#58595A", sun: "#16C4B2", sunEdge: "#119386", sunInk: "#0C6C62" },
      day: {
        ground: "#E8E9E6", ground2: "#F6F6F3", ground3: "#D7D8D6", line: "#BEBFBD", text: "#141619", text2: "#545557",
        accent: "#007F72", accentHi: "#299389", accentEdge: "#004C44", accentInk: "#FFFFFF", metal: "#7D848B", offset: "#E8336C",
        bad: "#FF473F", badEdge: "#B8332D", badInk: "#421210", good: "#277F2A", you: "#1F6FC0", paper: "#F8F8F5",
        paper2: "#E8E8E6", ink: "#141619", ink2: "#585A5B", sun: "#1CC4B2", sunEdge: "#159386", sunInk: "#0F6C62" } } });

  P({ id: "wineandgold", name: "Wine and Gold", group: "Team nights",
    blurb: "Cavs wine and gold: gold keys on wine at night, wine keys by day.",
    stock: "oxblood", darkMode: "normal", inks: { key: "sunflower", a: "cranberry", b: "melon", c: "#F5E9D6" },
    map: { word: "key", word82: "key", depth: "a", shade: "a", body: "key", line: "c", glow: "key", accent: "a", frame: "key", tag: "c", back: "a" },
    sys: {
      night: {
        ground: "#241013", ground2: "#331F21", ground3: "#3F2C2D", line: "#63472C", text: "#F6EBDD", text2: "#AA9C94",
        accent: "#FDBB30", accentHi: "#FED378", accentEdge: "#7B5919", accentInk: "#3A0D1A", metal: "#B08A4A", offset: "#E0507A",
        bad: "#FF6A3D", badEdge: "#A64528", badInk: "#522214", good: "#4F9E66", you: "#5593CC", paper: "#F7EEDF",
        paper2: "#EBDED2", ink: "#4A1024", ink2: "#7A4E58", sun: "#FDBB30", sunEdge: "#BE8C24", sunInk: "#805F18" },
      day: {
        ground: "#F4E9DA", ground2: "#FCF6EE", ground3: "#E6D8CB", line: "#D2BEB6", text: "#4A1024", text2: "#794C57",
        accent: "#6F1D33", accentHi: "#864154", accentEdge: "#3E0A1A", accentInk: "#FDBB30", metal: "#9A7430", offset: "#C8466E",
        bad: "#FF4F32", badEdge: "#B83924", badInk: "#47160E", good: "#147C44", you: "#1E6AC8", paper: "#FFF8EE",
        paper2: "#F2E8E0", ink: "#4A1024", ink2: "#805661", sun: "#FDBB30", sunEdge: "#BE8C24", sunInk: "#8B671A" } } });

  P({ id: "banner", name: "Banner", group: "Team nights",
    blurb: "Celtics banners: green keys over the parquet at night, gold for every banner.",
    stock: "court", inks: { key: "#0A6236", a: "green", b: "brightgold", c: "brown" },
    map: { word: "key", word82: "key", depth: "a", shade: "c", body: "b", line: "key", glow: "a", accent: "a", frame: "key", tag: "key", back: "c" },
    sys: {
      night: {
        ground: "#1A140E", ground2: "#241B13", ground3: "#30251A", line: "#62492B", text: "#F4EBD8", text2: "#A69E8F",
        accent: "#2DB36A", accentHi: "#77CE9E", accentEdge: "#195633", accentInk: "#03170B", metal: "#B98A4F", offset: "#E0B04A",
        bad: "#FF5C4D", badEdge: "#A63C32", badInk: "#4C1C17", good: "#79963B", you: "#488FCC", paper: "#F4EBD8",
        paper2: "#E4DECB", ink: "#09321D", ink2: "#45624D", sun: "#F2C14E", sunEdge: "#B6913B", sunInk: "#7A6228" },
      day: {
        ground: "#EAD7B0", ground2: "#F6EBD4", ground3: "#DEC89C", line: "#B99A66", text: "#072918", text2: "#3C513C",
        accent: "#0B7A40", accentHi: "#328F5F", accentEdge: "#08552D", accentInk: "#F6EEDA", metal: "#8E6630", offset: "#C9901C",
        bad: "#FF473E", badEdge: "#B8332D", badInk: "#421210", good: "#44700D", you: "#1E5FB8", paper: "#FBF4E4",
        paper2: "#EAE6D6", ink: "#072918", ink2: "#4A6150", sun: "#F2C14E", sunEdge: "#B6913B", sunInk: "#7A6228" } } });

  P({ id: "creamcity", name: "Cream City", group: "Team nights",
    blurb: "Bucks green and cream, with a Great Lakes blue offset.",
    stock: "cream", inks: { key: "#0E4A2C", a: "blue", b: "ivy", c: "flatgold" },
    map: { word: "key", word82: "key", depth: "a", shade: "c", body: "b", line: "key", glow: "a", accent: "a", frame: "key", tag: "a", back: "c" },
    sys: {
      night: {
        ground: "#0E1D15", ground2: "#1E2B22", ground3: "#2C372E", line: "#5B5B44", text: "#F2E8D3", text2: "#A09F8F",
        accent: "#EEE1C6", accentHi: "#FFF8EA", accentEdge: "#9C8D6C", accentInk: "#0E4A2C", metal: "#B9A77E", offset: "#3CC47F",
        bad: "#FF6255", badEdge: "#A64037", badInk: "#4F1E1A", good: "#479866", you: "#3792D3", paper: "#F3E9D4",
        paper2: "#E3DCC7", ink: "#0C3520", ink2: "#415F4A", sun: "#F2C14E", sunEdge: "#B6913B", sunInk: "#7A6228" },
      day: {
        ground: "#F0E6CF", ground2: "#FAF4E6", ground3: "#DED7C1", line: "#C2C1AB", text: "#0A2F1C", text2: "#3F5A46",
        accent: "#0E6B3A", accentHi: "#35835A", accentEdge: "#07401F", accentInk: "#F6EEDC", metal: "#9C8A5E", offset: "#1F9A5A",
        bad: "#FF544C", badEdge: "#B83C37", badInk: "#4A1816", good: "#407716", you: "#1F6FC0", paper: "#FBF6EA",
        paper2: "#EAE8DC", ink: "#0A2F1C", ink2: "#4C6655", sun: "#F2C14E", sunEdge: "#B6913B", sunInk: "#7A6228" } } });

  P({ id: "thecity", name: "The City", group: "Team nights",
    blurb: "Warriors The City: gold keys on royal blue at night, royal keys on gold by day.",
    stock: "butter", inks: { key: "lake", a: "sunflower", b: "blue", c: "federalblue" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "a", line: "key", glow: "a", accent: "b", frame: "key", tag: "key", back: "a" },
    sys: {
      night: {
        ground: "#101E4A", ground2: "#202D55", ground3: "#2E3A5E", line: "#635B4E", text: "#F7F3E6", text2: "#ABACB2",
        accent: "#FFC72C", accentHi: "#FFDB76", accentEdge: "#796120", accentInk: "#13285E", metal: "#C9A553", offset: "#5B8CFF",
        bad: "#FF5A5F", badEdge: "#A63B3E", badInk: "#4C1B1C", good: "#3EA469", you: "#4E9F94", paper: "#F7F3E6",
        paper2: "#E7E5DC", ink: "#13285E", ink2: "#4D5C81", sun: "#FFC72C", sunEdge: "#BF9521", sunInk: "#816416" },
      day: {
        ground: "#F6ECC9", ground2: "#FDF7E4", ground3: "#E4DCC0", line: "#C8C4B2", text: "#112556", text2: "#4B5873",
        accent: "#1D428A", accentHi: "#41609D", accentEdge: "#0E244F", accentInk: "#FFC72C", metal: "#9C7A28", offset: "#E0A200",
        bad: "#FF525F", badEdge: "#B83B44", badInk: "#4A181C", good: "#157F42", you: "#0F8F86", paper: "#FFFAEA",
        paper2: "#EEEBE0", ink: "#112556", ink2: "#52607E", sun: "#FFC72C", sunEdge: "#BF9521", sunInk: "#816416" } } });

  P({ id: "tealera", name: "Teal Era", group: "Team nights",
    blurb: "90s Hornets: purple keys and teal pinstripes on a deep teal night.",
    stock: "teal", darkMode: "normal", inks: { key: "mint", a: "violet", b: "#F2F7F6", c: "lightteal" },
    map: { word: "key", word82: "key", depth: "a", shade: "c", body: "c", line: "b", glow: "key", accent: "a", frame: "key", tag: "key", back: "c" },
    sys: {
      night: {
        ground: "#0B2327", ground2: "#1B3235", ground3: "#293F42", line: "#385E5F", text: "#EEF7F5", text2: "#9CABAB",
        accent: "#A283FF", accentHi: "#C3AEFF", accentEdge: "#5A36B8", accentInk: "#1A0B3D", metal: "#6FA6A4", offset: "#2FD0D2",
        bad: "#FF6159", badEdge: "#A63F3A", badInk: "#4F1E1C", good: "#669E41", you: "#4D92FA", paper: "#F1F7F5",
        paper2: "#E2E7E9", ink: "#1E1446", ink2: "#5D587B", sun: "#2FD0D2", sunEdge: "#239C9E", sunInk: "#1A7274" },
      day: {
        ground: "#E2F0ED", ground2: "#F4FAF8", ground3: "#D2DEE0", line: "#BBC4CC", text: "#1D1446", text2: "#585678",
        accent: "#5B2DC2", accentHi: "#754FCC", accentEdge: "#402088", accentInk: "#FFFFFF", metal: "#5E8E8E", offset: "#009AA3",
        bad: "#FF473F", badEdge: "#B8332D", badInk: "#421210", good: "#2F7F1E", you: "#2F5FD0", paper: "#F6FBFA",
        paper2: "#E7EBED", ink: "#1D1446", ink2: "#5E597C", sun: "#2BC4C6", sunEdge: "#209395", sunInk: "#186C6D" } } });

  P({ id: "sunburst", name: "Purple Sunburst", group: "Team nights",
    blurb: "93 Suns: an orange sunburst over deep purple, sunflower rays.",
    stock: "purple", darkMode: "screen", inks: { key: "#FFF1DE", a: "orange", b: "sunflower", c: "purple" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "b", line: "key", glow: "b", accent: "a", frame: "b", tag: "b", back: "c" },
    sys: {
      night: {
        ground: "#150F2E", ground2: "#251F3B", ground3: "#332D46", line: "#4B3D75", text: "#FFF3E3", text2: "#ABA1A2",
        accent: "#FF7A1F", accentHi: "#FFA96D", accentEdge: "#7A3B16", accentInk: "#2A0E00", metal: "#8E76CC", offset: "#FFB511",
        bad: "#FF4668", badEdge: "#A62E44", badInk: "#45131C", good: "#3CA369", you: "#4999DB", paper: "#FFF4E4",
        paper2: "#F0E4D9", ink: "#24124A", ink2: "#665678", sun: "#FF8A2E", sunEdge: "#BF6823", sunInk: "#8C4C19" },
      day: {
        ground: "#FAEBDA", ground2: "#FFF7EC", ground3: "#E9DACE", line: "#CFC0BD", text: "#24124A", text2: "#645375",
        accent: "#BF4A08", accentHi: "#C96730", accentEdge: "#7A2D02", accentInk: "#FFFFFF", metal: "#6A4FA8", offset: "#E8A200",
        bad: "#FF416B", badEdge: "#B82F4D", badInk: "#42111C", good: "#12844A", you: "#1F68D2", paper: "#FFF8EF",
        paper2: "#F0E8E3", ink: "#24124A", ink2: "#66577C", sun: "#FF8A2E", sunEdge: "#BF6823", sunInk: "#8C4C19" } } });

  P({ id: "emerald", name: "Emerald City", group: "Team nights",
    blurb: "Sonics green and gold: gold keys on a forest night.",
    stock: "forest", darkMode: "normal", inks: { key: "#F4ECD2", a: "sunflower", b: "green", c: "kellygreen" },
    map: { word: "key", word82: "a", depth: "b", shade: "b", body: "a", line: "key", glow: "a", accent: "c", frame: "a", tag: "a", back: "b" },
    sys: {
      night: {
        ground: "#0E2119", ground2: "#1E2F27", ground3: "#2C3C32", line: "#5B5834", text: "#F2EEDA", text2: "#A7AA9B",
        accent: "#FFC426", accentHi: "#FFD972", accentEdge: "#796016", accentInk: "#0B2E1C", metal: "#B99B55", offset: "#2FBF71",
        bad: "#FF6257", badEdge: "#A64039", badInk: "#4F1E1B", good: "#719A48", you: "#4A90D1", paper: "#F4EEDA",
        paper2: "#E4E1CD", ink: "#103422", ink2: "#45604D", sun: "#FFC426", sunEdge: "#BF931D", sunInk: "#816313" },
      day: {
        ground: "#EEF0E0", ground2: "#F8F9F0", ground3: "#DCE0D0", line: "#C1C9B9", text: "#0C2E1D", text2: "#465F4F",
        accent: "#0E7A45", accentHi: "#358F63", accentEdge: "#064A29", accentInk: "#FFF6DA", metal: "#8F7630", offset: "#E0A800",
        bad: "#FF544C", badEdge: "#B83C37", badInk: "#4A1816", good: "#487F11", you: "#1E68C8", paper: "#FBFBF3",
        paper2: "#EAEDE4", ink: "#0C2E1D", ink2: "#4E6758", sun: "#FFC426", sunEdge: "#BF931D", sunInk: "#816313" } } });

  P({ id: "dynasty", name: "Dynasty", group: "Team nights",
    blurb: "Bulls dynasty: red and black, white keys, six trophies of gold.",
    stock: "black", darkMode: "normal", inks: { key: "#F5F2EE", a: "brightred", b: "red", c: "granite" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "a", line: "key", glow: "a", accent: "b", frame: "a", tag: "a", back: "c" },
    sys: {
      night: {
        ground: "#0E0E10", ground2: "#1E1E20", ground3: "#2C2C2D", line: "#62502A", text: "#F5F2EE", text2: "#A2A09E",
        accent: "#F5F2EE", accentHi: "#FFFFFF", accentEdge: "#8A8A8E", accentInk: "#111114", metal: "#C9A04A", offset: "#E8333C",
        bad: "#FF5A36", badEdge: "#A63B23", badInk: "#4A1A10", good: "#3BA262", you: "#4595E6", paper: "#F5F2EE",
        paper2: "#E5E2DF", ink: "#111114", ink2: "#555555", sun: "#FFB511", sunEdge: "#BF880D", sunInk: "#815C08" },
      day: {
        ground: "#F2F0EB", ground2: "#FCFBF8", ground3: "#E0DEDA", line: "#C5C3C0", text: "#111114", text2: "#555455",
        accent: "#18181B", accentHi: "#3A3A3F", accentEdge: "#000000", accentInk: "#F5F2EE", metal: "#A67C2E", offset: "#D6182F",
        bad: "#FF4826", badEdge: "#B8341B", badInk: "#42130A", good: "#157F42", you: "#1C6FD0", paper: "#FFFFFF",
        paper2: "#EEEEEF", ink: "#111114", ink2: "#58585B", sun: "#FFB511", sunEdge: "#BF880D", sunInk: "#8C6409" } } });

  P({ id: "garden", name: "Garden", group: "Team nights",
    blurb: "Knicks at the Garden: orange keys on royal blue, silver lines.",
    stock: "bond", inks: { key: "lake", a: "orange", b: "skyblue", c: "lightgray" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "a", line: "key", glow: "a", accent: "b", frame: "key", tag: "a", back: "b" },
    sys: {
      night: {
        ground: "#0D1A33", ground2: "#1D2940", ground3: "#2B364B", line: "#4C586A", text: "#F4F1EA", text2: "#A1A4A8",
        accent: "#FF8A2A", accentHi: "#FFB375", accentEdge: "#79441B", accentInk: "#2A1400", metal: "#9AA3AE", offset: "#4C8FFF",
        bad: "#FF566D", badEdge: "#A63847", badInk: "#4C1A21", good: "#3EA069", you: "#9D7AFA", paper: "#F6F3EC",
        paper2: "#E6E5E2", ink: "#0C2858", ink2: "#4C6080", sun: "#FF8A2A", sunEdge: "#BF6820", sunInk: "#8C4C17" },
      day: {
        ground: "#ECF1F7", ground2: "#F9FBFD", ground3: "#DAE1EA", line: "#BFC9D7", text: "#0C2755", text2: "#455B7E",
        accent: "#1552A8", accentHi: "#3A6EB6", accentEdge: "#0B2F66", accentInk: "#FFFFFF", metal: "#7A8592", offset: "#F07A1A",
        bad: "#FF506D", badEdge: "#B83A4E", badInk: "#4A1720", good: "#147C44", you: "#7A3FC4", paper: "#FBFCFD",
        paper2: "#EAEDF1", ink: "#0C2755", ink2: "#4E6283", sun: "#FFB81C", sunEdge: "#BF8A15", sunInk: "#8C650F" } } });

  P({ id: "mountain", name: "Mountain", group: "Team nights",
    blurb: "96 Jazz: purple mountains, a copper sunset and snowcap teal.",
    stock: "midnight", darkMode: "normal", inks: { key: "#F3EEE8", a: "copper", b: "lightteal", c: "violet" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "b", line: "key", glow: "a", accent: "a", frame: "b", tag: "a", back: "c" },
    sys: {
      night: {
        ground: "#191430", ground2: "#28233E", ground3: "#353049", line: "#4D4373", text: "#F3EEF4", text2: "#A5A0AD",
        accent: "#E88C52", accentHi: "#F0B48F", accentEdge: "#70442E", accentInk: "#2A1206", metal: "#8C7DC4", offset: "#39BFCF",
        bad: "#FF4D6A", badEdge: "#A63245", badInk: "#47161E", good: "#46A06A", you: "#6E8EC7", paper: "#F6F1EA",
        paper2: "#E8E2DF", ink: "#291E53", ink2: "#62587C", sun: "#E88C52", sunEdge: "#AE693E", sunInk: "#804D2D" },
      day: {
        ground: "#ECE8F1", ground2: "#F8F6FB", ground3: "#DCD8E5", line: "#C5C0D2", text: "#2A1F55", text2: "#5B527D",
        accent: "#B35A25", accentHi: "#BF7448", accentEdge: "#6E3310", accentInk: "#FFFFFF", metal: "#6C5CA8", offset: "#0C98A8",
        bad: "#FF4E70", badEdge: "#B83851", badInk: "#47161F", good: "#13824A", you: "#2F62D0", paper: "#FBF9FC",
        paper2: "#ECEAF0", ink: "#2A1F55", ink2: "#645B83", sun: "#E88C52", sunEdge: "#AE693E", sunInk: "#804D2D" } } });

  P({ id: "peachtree", name: "Peachtree", group: "Team nights",
    blurb: "Hawks peach nights: peach keys, black and a little gold.",
    stock: "blush", inks: { key: "black", a: "pink", b: "apricot", c: "flatgold" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "b", line: "key", glow: "b", accent: "c", frame: "key", tag: "a", back: "b" },
    sys: {
      night: {
        ground: "#16110F", ground2: "#26211E", ground3: "#342E2B", line: "#675332", text: "#FBEFE6", text2: "#A99F99",
        accent: "#FFA27A", accentHi: "#FFC3A9", accentEdge: "#7A4E3B", accentInk: "#2B120A", metal: "#C9A45C", offset: "#FF6F8E",
        bad: "#FF4A4A", badEdge: "#A63030", badInk: "#451414", good: "#469E66", you: "#5893D1", paper: "#FBEDE4",
        paper2: "#ECDED5", ink: "#1E1411", ink2: "#605550", sun: "#FDB927", sunEdge: "#BE8B1D", sunInk: "#805E13" },
      day: {
        ground: "#F8E4D8", ground2: "#FDF3EC", ground3: "#E7D3C8", line: "#CCBAB0", text: "#1E1411", text2: "#5F524D",
        accent: "#1E1411", accentHi: "#3A2A24", accentEdge: "#000000", accentInk: "#FFB08E", metal: "#9C7630", offset: "#E8506E",
        bad: "#FF4646", badEdge: "#B83232", badInk: "#421212", good: "#157F45", you: "#1F62C4", paper: "#FFF7F2",
        paper2: "#EFE7E2", ink: "#1E1411", ink2: "#625855", sun: "#FDB927", sunEdge: "#A87400", sunInk: "#8B6615" } } });

  P({ id: "vancouver", name: "Vancouver", group: "Team nights",
    blurb: "95 Grizzlies: teal keys, bronze and a red claw on a dark teal night.",
    stock: "teal", darkMode: "normal", inks: { key: "#F3EEE4", a: "copper", b: "turquoise", c: "brightred" },
    map: { word: "key", word82: "b", depth: "a", shade: "c", body: "a", line: "key", glow: "b", accent: "c", frame: "b", tag: "b", back: "c" },
    sys: {
      night: {
        ground: "#0C1F21", ground2: "#1C2D2F", ground3: "#2A3A3A", line: "#4D4838", text: "#F1EDE4", text2: "#9FA39E",
        accent: "#1DBFB3", accentHi: "#6CD5CE", accentEdge: "#105E59", accentInk: "#03201D", metal: "#9C7A55", offset: "#E08A4A",
        bad: "#FF5A52", badEdge: "#A63B35", badInk: "#4C1B19", good: "#6C994A", you: "#568FCC", paper: "#F3EEE4",
        paper2: "#E3E1D7", ink: "#10302F", ink2: "#4A605D", sun: "#1DBFB3", sunEdge: "#168F86", sunInk: "#106962" },
      day: {
        ground: "#E7EEEA", ground2: "#F6F9F7", ground3: "#D6DFDB", line: "#BCC7C4", text: "#0F2D2C", text2: "#465E5C",
        accent: "#00766E", accentHi: "#298C85", accentEdge: "#004640", accentInk: "#FFFFFF", metal: "#8A6A45", offset: "#C0652A",
        bad: "#FF534F", badEdge: "#B83C39", badInk: "#4A1817", good: "#497F12", you: "#2C5FC8", paper: "#FAFBF8",
        paper2: "#EAEDEA", ink: "#0F2D2C", ink2: "#506664", sun: "#1DBFB3", sunEdge: "#168F86", sunInk: "#106962" } } });

  P({ id: "dinosaur", name: "Dinosaur", group: "Team nights",
    blurb: "95 Raptors: violet keys, a red dinosaur and silver on black.",
    stock: "black", darkMode: "normal", inks: { key: "#F3F0F6", a: "fluored", b: "violet", c: "granite" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "b", line: "key", glow: "a", accent: "a", frame: "b", tag: "a", back: "c" },
    sys: {
      night: {
        ground: "#121016", ground2: "#222026", ground3: "#2F2D33", line: "#56575E", text: "#F3F0F6", text2: "#A29FA5",
        accent: "#A47DFF", accentHi: "#C4ABFF", accentEdge: "#4F3D7A", accentInk: "#170A33", metal: "#A9ADB6", offset: "#F0386B",
        bad: "#FF6B4A", badEdge: "#A64630", badInk: "#522218", good: "#3CA369", you: "#4297DB", paper: "#F4F2F6",
        paper2: "#E5E3E8", ink: "#1F1535", ink2: "#5F576F", sun: "#B89AFF", sunEdge: "#8A74BF", sunInk: "#65558C" },
      day: {
        ground: "#EDECEF", ground2: "#F9F8FA", ground3: "#DDDBE0", line: "#C4C1CA", text: "#1F1535", text2: "#5D566D",
        accent: "#7443D9", accentHi: "#8A61DF", accentEdge: "#512F98", accentInk: "#FFFFFF", metal: "#7F848E", offset: "#E0305A",
        bad: "#FF4822", badEdge: "#B83418", badInk: "#421309", good: "#157F44", you: "#1D6FD1", paper: "#FAF9FB",
        paper2: "#EBE9ED", ink: "#1F1535", ink2: "#615970", sun: "#B89AFF", sunEdge: "#8A74BF", sunInk: "#65558C" } } });

  P({ id: "pinstripe", name: "Pinstripe", group: "Team nights",
    blurb: "90s Magic: electric blue pinstripes, black and silver, a gold star.",
    stock: "bond", inks: { key: "black", a: "blue", b: "cornflower", c: "lightgray" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "a", line: "key", glow: "b", accent: "b", frame: "a", tag: "a", back: "b" },
    sys: {
      night: {
        ground: "#0D1420", ground2: "#1D242F", ground3: "#2B313C", line: "#464F5C", text: "#F2F5F8", text2: "#A0A4AA",
        accent: "#2E9BEA", accentHi: "#77BEF1", accentEdge: "#184B72", accentInk: "#04192B", metal: "#8C98A6", offset: "#B7C3D0",
        bad: "#FF5A5A", badEdge: "#A63B3B", badInk: "#4C1B1B", good: "#40A66C", you: "#9D7BFF", paper: "#F7F9FB",
        paper2: "#E6EAED", ink: "#0B1E3A", ink2: "#526074", sun: "#FFC24A", sunEdge: "#BF9238", sunInk: "#816226" },
      day: {
        ground: "#F1F4F8", ground2: "#FFFFFF", ground3: "#DFE3E9", line: "#C3C9D2", text: "#0B1E3A", text2: "#505E73",
        accent: "#0077C0", accentHi: "#298DCA", accentEdge: "#005386", accentInk: "#FFFFFF", metal: "#8A96A3", offset: "#8E9AA8",
        bad: "#FF454D", badEdge: "#B83237", badInk: "#421214", good: "#167F42", you: "#6A3FC8", paper: "#FFFFFF",
        paper2: "#EEEFF1", ink: "#0B1E3A", ink2: "#546275", sun: "#FFC24A", sunEdge: "#BF9238", sunInk: "#8C6B29" } } });

  P({ id: "rainbow", name: "Rainbow Skyline", group: "Team nights",
    blurb: "80s Nuggets: a rainbow skyline over the Rockies, yellow keys on navy.",
    stock: "bond", inks: { key: "mediumblue", a: "brightred", b: "yellow", c: "kellygreen" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "b", line: "key", glow: "b", accent: "c", frame: "key", tag: "a", back: "b" },
    sys: {
      night: {
        ground: "#0F1934", ground2: "#1F2841", ground3: "#2D354C", line: "#54565F", text: "#F6F4EC", text2: "#A3A5AA",
        accent: "#FFD426", accentHi: "#FFE372", accentEdge: "#79661A", accentInk: "#13204A", metal: "#A8A193", offset: "#FF7F3F",
        bad: "#FF5765", badEdge: "#A63942", badInk: "#4C1A1E", good: "#52A051", you: "#A97BE0", paper: "#F7F5EF",
        paper2: "#E7E7E4", ink: "#192758", ink2: "#525B7E", sun: "#FFD426", sunEdge: "#BF9F1D", sunInk: "#776311" },
      day: {
        ground: "#F4F3EE", ground2: "#FDFCF8", ground3: "#E2E3E2", line: "#C8CACF", text: "#182553", text2: "#50597B",
        accent: "#2250B5", accentHi: "#456CC1", accentEdge: "#12306E", accentInk: "#FFFFFF", metal: "#7A7266", offset: "#F0662E",
        bad: "#FF5161", badEdge: "#B83A46", badInk: "#4A171C", good: "#1C7F37", you: "#7B42C8", paper: "#FDFCF8",
        paper2: "#EDEDEC", ink: "#182553", ink2: "#576181", sun: "#FFD426", sunEdge: "#BF9F1D", sunInk: "#816C13" } } });

  P({ id: "pinwheel", name: "Pinwheel", group: "Team nights",
    blurb: "Blazers pinwheel: red and black stripes, silver keys, Rip City.",
    stock: "bond", inks: { key: "black", a: "brightred", b: "lightgray", c: "fluored" },
    map: { word: "key", word82: "a", depth: "a", shade: "b", body: "a", line: "key", glow: "c", accent: "c", frame: "key", tag: "a", back: "b" },
    sys: {
      night: {
        ground: "#1C1315", ground2: "#261C1E", ground3: "#383031", line: "#4F4E52", text: "#F2F0EE", text2: "#A5A0A0",
        accent: "#C8CDD2", accentHi: "#E9ECEF", accentEdge: "#6E747A", accentInk: "#111114", metal: "#8E959C", offset: "#E23A3E",
        bad: "#FF6B4A", badEdge: "#A64630", badInk: "#522218", good: "#3BA262", you: "#4492E0", paper: "#F3F1EE",
        paper2: "#E3E1DF", ink: "#141216", ink2: "#575557", sun: "#FFC94A", sunEdge: "#BF9738", sunInk: "#816626" },
      day: {
        ground: "#E9E7E3", ground2: "#F7F6F3", ground3: "#D8D6D3", line: "#BEBCBA", text: "#141216", text2: "#545254",
        accent: "#2A2A2E", accentHi: "#4A4A50", accentEdge: "#000000", accentInk: "#F2F0EE", metal: "#6E747A", offset: "#E03A3E",
        bad: "#FF4822", badEdge: "#B83418", badInk: "#421309", good: "#157F42", you: "#1C6FD0", paper: "#FAF9F7",
        paper2: "#EAE9E7", ink: "#141216", ink2: "#59575A", sun: "#FFC94A", sunEdge: "#BF9738", sunInk: "#816626" } } });

  P({ id: "bigd", name: "Big D", group: "Team nights",
    blurb: "80s Mavericks: royal blue keys and kelly green on a Texas night.",
    stock: "sky", inks: { key: "mediumblue", a: "kellygreen", b: "blue", c: "lightgray" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "b", line: "key", glow: "a", accent: "a", frame: "key", tag: "a", back: "b" },
    sys: {
      night: {
        ground: "#0B1D1A", ground2: "#1B2C29", ground3: "#293936", line: "#3F594E", text: "#F1F5F2", text2: "#9EA7A4",
        accent: "#5B9BFF", accentHi: "#94BEFF", accentEdge: "#2356B0", accentInk: "#06193A", metal: "#7FA38E", offset: "#5CC75A",
        bad: "#FF5A5A", badEdge: "#A63B3B", badInk: "#4C1B1B", good: "#7C9A3D", you: "#A07CFF", paper: "#F2F6F3",
        paper2: "#E2E8E8", ink: "#0E2A52", ink2: "#4D627E", sun: "#7CD66A", sunEdge: "#5DA150", sunInk: "#44763A" },
      day: {
        ground: "#E4EEE6", ground2: "#F5F9F5", ground3: "#D3DEDA", line: "#B9C6C8", text: "#0D284F", text2: "#445A75",
        accent: "#1F63C9", accentHi: "#437CD2", accentEdge: "#16458D", accentInk: "#FFFFFF", metal: "#5F8A70", offset: "#3E9E3A",
        bad: "#FF525A", badEdge: "#B83B41", badInk: "#471719", good: "#537F0F", you: "#6A3FC8", paper: "#FAFCFB",
        paper2: "#E9EDEF", ink: "#0D284F", ink2: "#4E637F", sun: "#7CD66A", sunEdge: "#5DA150", sunInk: "#44763A" } } });
})();
