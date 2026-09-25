// Palette design seeds. gen.js derives every missing sys key, checks contrast and writes lab/src/palettes/*.js.
// n = night seeds, d = day seeds. Any sys key may be given to override the derivation.
module.exports = [
  /* ================= HOUSE ================= */
  { file: "00-house", id: "printshop", name: "Print Shop", group: "House",
    blurb: "The v50 results drum: navy key, fluorescent pink offsets, sunflower, riso blue, on cream.",
    stock: "cream", inks: { key: "navy", a: "fluopink", b: "sunflower", c: "blue" },
    map: { word: "key", word82: "key", depth: "a", shade: "c", body: "b", line: "key", glow: "a", accent: "c", frame: "key", tag: "a", back: "c" },
    n: { ground: "#141A33", text: "#F4ECDD", accent: "#FFB511", accentInk: "#232A4E", accentEdge: "#B97F06", offset: "#FF48B0", metal: "#B79B6E",
         bad: "#FF5A62", good: "#3DBE78", you: "#3C9DEB", paper: "#F4ECDD", ink: "#232A4E", sun: "#FFB511", sunEdge: "#C7870A", sunInk: "#8A5D00" },
    d: { ground: "#F2EADA", ground2: "#FBF6EC", ground3: "#E7DDC8", line: "#CDBF9F", text: "#232A4E", text2: "#555A74", accent: "#FFB511", accentInk: "#232A4E", accentEdge: "#C7870A", accentHi: "#FFD266",
         offset: "#FF48B0", metal: "#9E7A45", bad: "#F65058", badEdge: "#B8323B", good: "#00875A", you: "#0078BF", paper: "#FBF6EC", ink: "#232A4E", ink2: "#5B5E73", sun: "#FFB511", sunEdge: "#C7870A", sunInk: "#8A5D00" } },

  { file: "00-house", id: "goldstandard", name: "Gold Standard", group: "House", today: true,
    blurb: "Today's site, printed: chalk and amber on the night table.",
    stock: "ink", darkMode: "normal", inks: { key: "#ECE6D6", a: "#FFB52E", b: "#B98A4F", c: "#6E5530" },
    map: { word: "key", word82: "key", depth: "c", shade: "c", body: "a", line: "b", glow: "a", accent: "b", frame: "b", tag: "b", back: "c" },
    // night = LAB.TODAY.night plus the literals today's CSS uses for the extra keys
    nExtra: { paper2: "#EAE2D1", ink2: "#5B5E73", badEdge: "#B8323B", badInk: "#3F1C16", sunEdge: "#C7870A", sunInk: "#8A5D00" },
    dExtra: { paper2: "#EFE7D6", ink2: "#5B5E73", badEdge: "#B8323B", badInk: "#6E1F24", sunEdge: "#C7870A", sunInk: "#8A5D00" },
    dOver: { accent: "#7A4A12", accentHi: "#94622A", accentEdge: "#4A2A08", accentInk: "#FFD27A", good: "#007A50" } },

  /* ================= TEAM NIGHTS ================= */
  { file: "00-house", id: "vice", name: "Vice", group: "Team nights",
    blurb: "Heat Vice nights: fluorescent pink keys and aqua glow on midnight.",
    stock: "midnight", darkMode: "screen", inks: { key: "#F7F3FF", a: "fluopink", b: "aqua", c: "violet" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "a", line: "b", glow: "b", accent: "c", frame: "b", tag: "b", back: "c" },
    n: { ground: "#16122B", text: "#F7F3FF", accent: "#FF48B0", accentInk: "#2B0620", offset: "#41C6EA", metal: "#9D7AD2",
         bad: "#FF6A3D", good: "#3FD08A", you: "#7C8CFF", paper: "#FDF2F7", ink: "#2A1B4A", sun: "#FF48B0" },
    d: { ground: "#FBEEF4", text: "#2A1B4A", accent: "#FF48B0", accentInk: "#2B0620", offset: "#12A5CC", metal: "#8467C0",
         bad: "#E5482A", good: "#0B8A52", you: "#4A4FD6", paper: "#FFF8FB", ink: "#2A1B4A", sun: "#FF48B0" } },

  { file: "10-team-nights", id: "fiesta", name: "Fiesta", group: "Team nights",
    blurb: "Spurs fiesta: turquoise keys, fiesta pink and orange on silver and black.",
    stock: "black", darkMode: "screen", inks: { key: "#EEF0F0", a: "fluored", b: "turquoise", c: "orange" },
    map: { word: "key", word82: "b", depth: "a", shade: "c", body: "b", line: "key", glow: "a", accent: "c", frame: "b", tag: "b", back: "c" },
    n: { ground: "#111214", text: "#EEF0F0", accent: "#16C4B2", accentInk: "#03211D", offset: "#FF4C7C", metal: "#A7ADB3",
         bad: "#FF4A3D", good: "#7BD35A", you: "#FF8A1F", paper: "#F4F3EE", ink: "#15171A", sun: "#16C4B2" },
    d: { ground: "#E8E9E6", ground2: "#F6F6F3", text: "#141619", accent: "#0BB5A3", accentInk: "#032521", offset: "#E8336C", metal: "#7D848B",
         bad: "#D7322B", good: "#2A8A2E", you: "#D56100", paper: "#F8F8F5", ink: "#141619", sun: "#0BB5A3" } },

  { file: "10-team-nights", id: "showtime", name: "Showtime", group: "Team nights",
    blurb: "Lakers Showtime: gold keys on Forum purple at night, purple keys on gold by day.",
    stock: "purple", darkMode: "normal", inks: { key: "sunflower", a: "violet", b: "melon", c: "#F6EFE0" },
    map: { word: "key", word82: "key", depth: "a", shade: "a", body: "key", line: "c", glow: "key", accent: "a", frame: "key", tag: "c", back: "a" },
    n: { ground: "#1B1030", text: "#F6EEDC", accent: "#FDB927", accentInk: "#2A1450", offset: "#A77BFF", metal: "#C9A052",
         bad: "#FF5C63", good: "#45C97C", you: "#55A6FF", paper: "#F7EFDC", ink: "#2A1450", sun: "#FDB927" },
    d: { ground: "#F5EACB", ground2: "#FCF6E6", text: "#2A1450", accent: "#552583", accentInk: "#FDB927", accentEdge: "#2E1150", offset: "#8A55E6", metal: "#A07A2C",
         bad: "#DA3339", good: "#12804A", you: "#1F66C9", paper: "#FFF9EC", ink: "#2A1450", sun: "#FDB927" } },

  { file: "10-team-nights", id: "tealera", name: "Teal Era", group: "Team nights",
    blurb: "90s Hornets: purple keys and teal pinstripes on a deep teal night.",
    stock: "teal", darkMode: "normal", inks: { key: "#F2F7F6", a: "violet", b: "mint", c: "lightteal" },
    map: { word: "key", word82: "b", depth: "a", shade: "c", body: "b", line: "key", glow: "b", accent: "a", frame: "b", tag: "b", back: "c" },
    n: { ground: "#0B2327", text: "#EEF7F5", accent: "#7A4FE3", accentInk: "#FFFFFF", accentEdge: "#3F2596", offset: "#2FD0D2", metal: "#6FA6A4",
         bad: "#FF6159", good: "#8EDC5A", you: "#FFC35C", paper: "#F1F7F5", ink: "#1E1446", sun: "#2FD0D2" },
    d: { ground: "#E2F0ED", ground2: "#F4FAF8", text: "#1D1446", accent: "#5B2DC2", accentInk: "#FFFFFF", offset: "#009AA3", metal: "#5E8E8E",
         bad: "#D93B35", good: "#2F7F1E", you: "#B26A00", paper: "#F6FBFA", ink: "#1D1446", sun: "#2BC4C6" } },

  { file: "10-team-nights", id: "sunburst", name: "Purple Sunburst", group: "Team nights",
    blurb: "93 Suns: an orange sunburst over deep purple, sunflower rays.",
    stock: "purple", darkMode: "screen", inks: { key: "#FFF1DE", a: "orange", b: "sunflower", c: "purple" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "b", line: "key", glow: "b", accent: "a", frame: "b", tag: "b", back: "c" },
    n: { ground: "#150F2E", text: "#FFF3E3", accent: "#FF7A1F", accentInk: "#2A0E00", offset: "#FFB511", metal: "#8E76CC",
         bad: "#FF4668", good: "#4FD68A", you: "#55B2FF", paper: "#FFF4E4", ink: "#24124A", sun: "#FF8A2E" },
    d: { ground: "#FAEBDA", ground2: "#FFF7EC", text: "#24124A", accent: "#F26A1B", accentInk: "#2A0E00", offset: "#E8A200", metal: "#6A4FA8",
         bad: "#D6244C", good: "#12844A", you: "#1F68D2", paper: "#FFF8EF", ink: "#24124A", sun: "#FF8A2E" } },

  { file: "10-team-nights", id: "mountain", name: "Mountain", group: "Team nights",
    blurb: "96 Jazz: purple mountains, a copper sunset and snowcap teal.",
    stock: "midnight", darkMode: "normal", inks: { key: "#F3EEE8", a: "copper", b: "lightteal", c: "violet" },
    map: { word: "key", word82: "a", depth: "c", shade: "c", body: "b", line: "key", glow: "a", accent: "a", frame: "b", tag: "a", back: "c" },
    n: { ground: "#191430", text: "#F3EEF4", accent: "#E88C52", accentInk: "#2A1206", offset: "#39BFCF", metal: "#8C7DC4",
         bad: "#FF4D6A", good: "#5ED88F", you: "#8DB6FF", paper: "#F6F1EA", ink: "#2A1F55", sun: "#E88C52" },
    d: { ground: "#ECE8F1", ground2: "#F8F6FB", text: "#2A1F55", accent: "#D0733A", accentInk: "#2A1206", offset: "#0C98A8", metal: "#6C5CA8",
         bad: "#D12B4B", good: "#13824A", you: "#2F62D0", paper: "#FBF9FC", ink: "#2A1F55", sun: "#E88C52" } },

  { file: "10-team-nights", id: "dinosaur", name: "Dinosaur", group: "Team nights",
    blurb: "95 Raptors: violet keys, a red dinosaur and silver on black.",
    stock: "black", darkMode: "normal", inks: { key: "#F3F0F6", a: "fluored", b: "violet", c: "granite" },
    map: { word: "key", word82: "a", depth: "b", shade: "c", body: "a", line: "key", glow: "a", accent: "b", frame: "b", tag: "a", back: "c" },
    n: { ground: "#121016", text: "#F3F0F6", accent: "#A47DFF", accentInk: "#170A33", offset: "#F0386B", metal: "#A9ADB6",
         bad: "#FF6B4A", good: "#4FD68A", you: "#4DB0FF", paper: "#F4F2F6", ink: "#1F1535", sun: "#B89AFF" },
    d: { ground: "#EDECEF", ground2: "#F9F8FA", text: "#1F1535", accent: "#7443D9", accentInk: "#FFFFFF", offset: "#E0305A", metal: "#7F848E",
         bad: "#D9482A", good: "#178A4A", you: "#1D6FD1", paper: "#FAF9FB", ink: "#1F1535", sun: "#B89AFF" } },

  { file: "10-team-nights", id: "emerald", name: "Emerald City", group: "Team nights",
    blurb: "Sonics green and gold: gold keys on a forest night.",
    stock: "forest", darkMode: "normal", inks: { key: "#F4ECD2", a: "sunflower", b: "green", c: "kellygreen" },
    map: { word: "key", word82: "a", depth: "b", shade: "b", body: "a", line: "key", glow: "a", accent: "c", frame: "a", tag: "a", back: "b" },
    n: { ground: "#0E2119", text: "#F2EEDA", accent: "#FFC426", accentInk: "#0B2E1C", offset: "#2FBF71", metal: "#B99B55",
         bad: "#FF6257", good: "#A6E36A", you: "#5AB0FF", paper: "#F4EEDA", ink: "#123A26", sun: "#FFC426" },
    d: { ground: "#EEF0E0", ground2: "#F8F9F0", text: "#0F3A24", accent: "#FFC426", accentInk: "#0B2E1C", accentEdge: "#B8860B", offset: "#10A05A", metal: "#8F7630",
         bad: "#D83A33", good: "#4E8A12", you: "#1E68C8", paper: "#FBFBF3", ink: "#0F3A24", sun: "#FFC426" } },

  { file: "10-team-nights", id: "rainbow", name: "Rainbow Skyline", group: "Team nights",
    blurb: "80s Nuggets: a rainbow skyline over the Rockies, yellow keys on navy.",
    stock: "bond", inks: { key: "mediumblue", a: "brightred", b: "yellow", c: "kellygreen" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "b", line: "key", glow: "b", accent: "c", frame: "key", tag: "a", back: "b" },
    n: { ground: "#0F1934", text: "#F6F4EC", accent: "#FFD426", accentInk: "#13204A", offset: "#FF7F3F", metal: "#6FA0E8",
         bad: "#FF4F5E", good: "#6CD36B", you: "#C08CFF", paper: "#F7F5EF", ink: "#1B2A5E", sun: "#FFD426" },
    d: { ground: "#F4F3EE", ground2: "#FDFCF8", text: "#1B2A5E", accent: "#FFD426", accentInk: "#1B2A5E", accentEdge: "#C79F00", offset: "#F0662E", metal: "#3F6FC0",
         bad: "#DA2F3F", good: "#1E8A3C", you: "#7B42C8", paper: "#FDFCF8", ink: "#1B2A5E", sun: "#FFD426" } },

  { file: "10-team-nights", id: "creamcity", name: "Cream City", group: "Team nights",
    blurb: "Bucks green and cream, with a Great Lakes blue offset.",
    stock: "cream", inks: { key: "#0E4A2C", a: "blue", b: "ivy", c: "flatgold" },
    map: { word: "key", word82: "key", depth: "a", shade: "c", body: "b", line: "key", glow: "a", accent: "a", frame: "key", tag: "a", back: "c" },
    n: { ground: "#0E1D15", text: "#F2E8D3", accent: "#EEE1C6", accentInk: "#0E4A2C", accentHi: "#FFF8EA", accentEdge: "#9C8D6C", offset: "#2F9BE6", metal: "#B9A77E",
         bad: "#FF6255", good: "#62D38E", you: "#FFC857", paper: "#F3E9D4", ink: "#0E3F26", sun: "#F2C14E" },
    d: { ground: "#F0E6CF", ground2: "#FAF4E6", text: "#0E3F26", accent: "#0E6B3A", accentInk: "#F6EEDC", accentEdge: "#07401F", offset: "#1F88D0", metal: "#9C8A5E",
         bad: "#D83A33", good: "#4C8C1A", you: "#B7791F", paper: "#FBF6EA", ink: "#0E3F26", sun: "#F2C14E" } },

  { file: "10-team-nights", id: "pinstripe", name: "Pinstripe", group: "Team nights",
    blurb: "90s Magic: electric blue pinstripes, black and silver, a gold star.",
    stock: "bond", inks: { key: "black", a: "blue", b: "cornflower", c: "lightgray" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "a", line: "key", glow: "b", accent: "b", frame: "a", tag: "a", back: "b" },
    n: { ground: "#0D1420", text: "#F2F5F8", accent: "#2E9BEA", accentInk: "#04192B", offset: "#B7C3D0", metal: "#8C98A6",
         bad: "#FF5A5A", good: "#52D58B", you: "#FFC24A", paper: "#F7F9FB", ink: "#0B1E3A", sun: "#FFC24A" },
    d: { ground: "#F1F4F8", ground2: "#FFFFFF", text: "#0B1E3A", accent: "#0077C0", accentInk: "#FFFFFF", offset: "#8E9AA8", metal: "#8A96A3",
         bad: "#D8323A", good: "#188A48", you: "#C98500", paper: "#FFFFFF", ink: "#0B1E3A", sun: "#FFC24A" } },

  { file: "10-team-nights", id: "garden", name: "Garden", group: "Team nights",
    blurb: "Knicks at the Garden: orange keys on royal blue, silver lines.",
    stock: "bond", inks: { key: "lake", a: "orange", b: "skyblue", c: "lightgray" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "a", line: "key", glow: "a", accent: "b", frame: "key", tag: "a", back: "b" },
    n: { ground: "#0D1A33", text: "#F4F1EA", accent: "#FF8A2A", accentInk: "#2A1400", offset: "#4C8FFF", metal: "#9AA3AE",
         bad: "#FF4F66", good: "#52D38A", you: "#FFE066", paper: "#F6F3EC", ink: "#0D2A5C", sun: "#FF8A2A" },
    d: { ground: "#ECF1F7", ground2: "#F9FBFD", text: "#0D2A5C", accent: "#F58426", accentInk: "#2A1400", offset: "#1E6FD9", metal: "#7A8592",
         bad: "#D22845", good: "#16874A", you: "#8A58C8", paper: "#FBFCFD", ink: "#0D2A5C", sun: "#FF8A2A" } },

  { file: "10-team-nights", id: "dynasty", name: "Dynasty", group: "Team nights",
    blurb: "Bulls dynasty: red and black, white keys, six trophies of gold.",
    stock: "black", darkMode: "normal", inks: { key: "#F5F2EE", a: "brightred", b: "red", c: "granite" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "a", line: "key", glow: "a", accent: "b", frame: "a", tag: "a", back: "c" },
    n: { ground: "#0E0E10", text: "#F5F2EE", accent: "#F5F2EE", accentInk: "#111114", accentHi: "#FFFFFF", accentEdge: "#8A8A8E", offset: "#E8333C", metal: "#C9A04A",
         bad: "#FF5A36", good: "#4CD07D", you: "#4DA6FF", paper: "#F5F2EE", ink: "#111114", sun: "#FFB511" },
    d: { ground: "#F2F0EB", ground2: "#FCFBF8", text: "#111114", accent: "#18181B", accentInk: "#F5F2EE", accentHi: "#3A3A3F", accentEdge: "#000000", offset: "#D6182F", metal: "#A67C2E",
         bad: "#D8452A", good: "#178A48", you: "#1C6FD0", paper: "#FFFFFF", ink: "#111114", sun: "#FFB511" } },

  { file: "10-team-nights", id: "banner", name: "Banner", group: "Team nights",
    blurb: "Celtics banners: green keys over the parquet at night, gold for every banner.",
    stock: "court", inks: { key: "#0A6236", a: "green", b: "brightgold", c: "brown" },
    map: { word: "key", word82: "key", depth: "a", shade: "c", body: "b", line: "key", glow: "a", accent: "a", frame: "key", tag: "key", back: "c" },
    n: { ground: "#1A140E", ground2: "#241B13", ground3: "#30251A", text: "#F4EBD8", accent: "#2DB36A", accentInk: "#03170B", offset: "#E0B04A", metal: "#B98A4F",
         bad: "#FF5C4D", good: "#B8E35A", you: "#5AB3FF", paper: "#F4EBD8", ink: "#0A3A22", sun: "#F2C14E" },
    d: { ground: "#EAD7B0", ground2: "#F6EBD4", ground3: "#DEC89C", line: "#B99A66", text: "#0A3A22", accent: "#0B7A40", accentInk: "#F6EEDA", offset: "#C9901C", metal: "#8E6630",
         bad: "#C8322B", good: "#4A7A0E", you: "#1E5FB8", paper: "#FBF4E4", ink: "#0A3A22", sun: "#F2C14E" } },

  { file: "10-team-nights", id: "wineandgold", name: "Wine and Gold", group: "Team nights",
    blurb: "Cavs wine and gold: gold keys on wine at night, wine keys by day.",
    stock: "oxblood", darkMode: "normal", inks: { key: "sunflower", a: "cranberry", b: "melon", c: "#F5E9D6" },
    map: { word: "key", word82: "key", depth: "a", shade: "a", body: "key", line: "c", glow: "key", accent: "a", frame: "key", tag: "c", back: "a" },
    n: { ground: "#241013", text: "#F6EBDD", accent: "#FDBB30", accentInk: "#3A0D1A", offset: "#E0507A", metal: "#B08A4A",
         bad: "#FF6A3D", good: "#6BD68A", you: "#6AB8FF", paper: "#F7EEDF", ink: "#4A1024", sun: "#FDBB30" },
    d: { ground: "#F4E9DA", ground2: "#FCF6EE", text: "#4A1024", accent: "#6F1D33", accentInk: "#FDBB30", accentEdge: "#3E0A1A", offset: "#C8466E", metal: "#9A7430",
         bad: "#E0452C", good: "#16874A", you: "#1E6AC8", paper: "#FFF8EE", ink: "#4A1024", sun: "#FDBB30" } },

  { file: "10-team-nights", id: "thecity", name: "The City", group: "Team nights",
    blurb: "Warriors The City: gold keys on royal blue at night, royal keys on gold by day.",
    stock: "butter", inks: { key: "lake", a: "sunflower", b: "blue", c: "federalblue" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "a", line: "key", glow: "a", accent: "b", frame: "key", tag: "key", back: "a" },
    n: { ground: "#101E4A", text: "#F7F3E6", accent: "#FFC72C", accentInk: "#13285E", offset: "#5B8CFF", metal: "#C9A553",
         bad: "#FF5A5F", good: "#52D88A", you: "#6FE3D4", paper: "#F7F3E6", ink: "#13285E", sun: "#FFC72C" },
    d: { ground: "#F6ECC9", ground2: "#FDF7E4", text: "#13285E", accent: "#1D428A", accentInk: "#FFC72C", accentEdge: "#0E244F", offset: "#E0A200", metal: "#9C7A28",
         bad: "#D8303D", good: "#178A48", you: "#0F8F86", paper: "#FFFAEA", ink: "#13285E", sun: "#FFC72C" } },

  { file: "10-team-nights", id: "pinwheel", name: "Pinwheel", group: "Team nights",
    blurb: "Blazers pinwheel: red and black stripes, silver keys, Rip City.",
    stock: "bond", inks: { key: "black", a: "brightred", b: "lightgray", c: "fluored" },
    map: { word: "key", word82: "a", depth: "a", shade: "b", body: "a", line: "key", glow: "c", accent: "c", frame: "key", tag: "a", back: "b" },
    n: { ground: "#18141A", ground2: "#221D24", text: "#F2F0EE", accent: "#C8CDD2", accentInk: "#111114", accentHi: "#E9ECEF", accentEdge: "#6E747A", offset: "#E23A3E", metal: "#8E959C",
         bad: "#FF6B4A", good: "#4CD07D", you: "#4DA6FF", paper: "#F3F1EE", ink: "#141216", sun: "#C8CDD2" },
    d: { ground: "#E9E7E3", ground2: "#F7F6F3", text: "#141216", accent: "#2A2A2E", accentInk: "#F2F0EE", accentHi: "#4A4A50", accentEdge: "#000000", offset: "#E03A3E", metal: "#6E747A",
         bad: "#D9482A", good: "#178A48", you: "#1C6FD0", paper: "#FAF9F7", ink: "#141216", sun: "#C8CDD2" } },

  { file: "10-team-nights", id: "vancouver", name: "Vancouver", group: "Team nights",
    blurb: "95 Grizzlies: teal keys, bronze and a red claw on a dark teal night.",
    stock: "teal", darkMode: "normal", inks: { key: "#F3EEE4", a: "copper", b: "turquoise", c: "brightred" },
    map: { word: "key", word82: "b", depth: "a", shade: "c", body: "a", line: "key", glow: "b", accent: "c", frame: "b", tag: "b", back: "c" },
    n: { ground: "#0C1F21", text: "#F1EDE4", accent: "#1DBFB3", accentInk: "#03201D", offset: "#E08A4A", metal: "#9C7A55",
         bad: "#FF5A52", good: "#9ADB6A", you: "#6BB3FF", paper: "#F3EEE4", ink: "#10302F", sun: "#1DBFB3" },
    d: { ground: "#E7EEEA", ground2: "#F6F9F7", text: "#10302F", accent: "#00A39A", accentInk: "#032421", offset: "#C0652A", metal: "#8A6A45",
         bad: "#D8322E", good: "#4F8A14", you: "#2C5FC8", paper: "#FAFBF8", ink: "#10302F", sun: "#1DBFB3" } },

  { file: "10-team-nights", id: "peachtree", name: "Peachtree", group: "Team nights",
    blurb: "Hawks peach nights: peach keys, black and a little gold.",
    stock: "blush", inks: { key: "black", a: "pink", b: "apricot", c: "flatgold" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "b", line: "key", glow: "b", accent: "c", frame: "key", tag: "a", back: "b" },
    n: { ground: "#16110F", text: "#FBEFE6", accent: "#FFA27A", accentInk: "#2B120A", offset: "#FF6F8E", metal: "#C9A45C",
         bad: "#FF4A4A", good: "#5FD68A", you: "#6BB3FF", paper: "#FBEDE4", ink: "#1E1411", sun: "#FFA27A" },
    d: { ground: "#F8E4D8", ground2: "#FDF3EC", text: "#1E1411", accent: "#FF9468", accentInk: "#2B120A", offset: "#E8506E", metal: "#9C7630",
         bad: "#C92A2A", good: "#157F45", you: "#1F62C4", paper: "#FFF7F2", ink: "#1E1411", sun: "#FFA27A" } },

  { file: "10-team-nights", id: "bigd", name: "Big D", group: "Team nights",
    blurb: "80s Mavericks: royal blue keys and kelly green on a Texas night.",
    stock: "sky", inks: { key: "mediumblue", a: "kellygreen", b: "blue", c: "lightgray" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "b", line: "key", glow: "a", accent: "a", frame: "key", tag: "a", back: "b" },
    n: { ground: "#0C1826", text: "#F1F5F2", accent: "#2B6FD6", accentInk: "#FFFFFF", accentEdge: "#16408A", offset: "#5CC75A", metal: "#8FA3B5",
         bad: "#FF5A5A", good: "#B6E35A", you: "#FFC857", paper: "#F2F6F3", ink: "#0E2A52", sun: "#7CD66A" },
    d: { ground: "#E4EEF2", ground2: "#F5F9FA", text: "#0E2A52", accent: "#1F63C9", accentInk: "#FFFFFF", offset: "#3E9E3A", metal: "#6F8699",
         bad: "#D8323A", good: "#5A8A10", you: "#B26A00", paper: "#FAFCFB", ink: "#0E2A52", sun: "#7CD66A" } },

  /* ================= RISO CLASSICS ================= */
  { file: "20-riso-classics", id: "pinkblue", name: "Pink and Blue", group: "Riso classics",
    blurb: "Fluorescent pink and riso blue: the two-drum classic.",
    stock: "bond", inks: { key: "blue", a: "fluopink", b: "fluopink", c: "blue" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "b", line: "key", glow: "a", accent: "b", frame: "key", tag: "a", back: "c" },
    n: { ground: "#0B1B30", text: "#F4F7FB", accent: "#FF48B0", accentInk: "#2B0620", offset: "#2F9BFF", metal: "#5C8FC8",
         bad: "#FF6A3D", good: "#3FD08A", you: "#8FD0FF", paper: "#F6F4F0", ink: "#05294A", sun: "#FF48B0" },
    d: { ground: "#F5F4F0", ground2: "#FFFFFF", text: "#05294A", accent: "#FF48B0", accentInk: "#2B0620", offset: "#0078BF", metal: "#5C82B0",
         bad: "#D9482A", good: "#12804A", you: "#0078BF", paper: "#FFFFFF", ink: "#05294A", sun: "#FF48B0" } },

  { file: "20-riso-classics", id: "tealorange", name: "Teal and Orange", group: "Riso classics",
    blurb: "Teal and fluorescent orange on white bond.",
    stock: "bond", inks: { key: "teal", a: "fluoorange", b: "fluoorange", c: "teal" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "b", line: "key", glow: "a", accent: "b", frame: "key", tag: "a", back: "c" },
    n: { ground: "#0A2224", text: "#F2F7F5", accent: "#FF8A6E", accentInk: "#2A0E07", offset: "#1FC3C2", metal: "#5E9C9A",
         bad: "#FF4A5E", good: "#8EDC5A", you: "#6FB6FF", paper: "#F5F4EF", ink: "#073B3F", sun: "#FF8A6E" },
    d: { ground: "#F4F3EE", ground2: "#FFFFFF", text: "#073B3F", accent: "#FF7A5E", accentInk: "#2A0E07", offset: "#00838A", metal: "#4F8A88",
         bad: "#CC2440", good: "#3F7F10", you: "#2A5FC4", paper: "#FFFFFF", ink: "#073B3F", sun: "#FF8A6E" } },

  { file: "20-riso-classics", id: "burgundyaqua", name: "Burgundy and Aqua", group: "Riso classics",
    blurb: "Burgundy and aqua on cream: soft, bookish, bright.",
    stock: "cream", inks: { key: "burgundy", a: "aqua", b: "aqua", c: "burgundy" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "b", line: "key", glow: "a", accent: "b", frame: "key", tag: "a", back: "c" },
    n: { ground: "#1E1119", text: "#F7ECF0", accent: "#5EC8E5", accentInk: "#2A0F1E", offset: "#D86AA2", metal: "#A77792",
         bad: "#FF6A3D", good: "#7EDC7A", you: "#FFC24A", paper: "#F6EEE2", ink: "#4E1F38", sun: "#5EC8E5" },
    d: { ground: "#F3EBDD", ground2: "#FBF7EF", text: "#4E1F38", accent: "#5EC8E5", accentInk: "#2A0F1E", accentEdge: "#2F8FAD", offset: "#914E72", metal: "#8E6A7E",
         bad: "#D23A2A", good: "#1E7F3E", you: "#A86400", paper: "#FDF9F2", ink: "#4E1F38", sun: "#5EC8E5" } },

  { file: "20-riso-classics", id: "violetmint", name: "Violet and Mint", group: "Riso classics",
    blurb: "Violet and mint: a pastel two-drum print, cool and dreamy.",
    stock: "bond", inks: { key: "purple", a: "mint", b: "mint", c: "violet" },
    map: { word: "key", word82: "a", depth: "a", shade: "c", body: "b", line: "key", glow: "a", accent: "b", frame: "key", tag: "a", back: "c" },
    n: { ground: "#18132A", text: "#F4F1FA", accent: "#82D8D5", accentInk: "#1C1236", offset: "#A98BE8", metal: "#8A7CB8",
         bad: "#FF5E6A", good: "#A6E36A", you: "#FFC857", paper: "#F5F3F8", ink: "#32205E", sun: "#82D8D5" },
    d: { ground: "#EFEDF4", ground2: "#FBFAFD", text: "#32205E", accent: "#82D8D5", accentInk: "#1C1236", accentEdge: "#3E9E9A", offset: "#765BA7", metal: "#7A6AA8",
         bad: "#D22F48", good: "#3F7F10", you: "#A86400", paper: "#FDFCFE", ink: "#32205E", sun: "#82D8D5" } }
];

/* ---- round 2: accent is also the site's heading/label text color (--amber, 61 uses),
   so night accents must read on the ground (>= 4.5) and day accents too (>= 3):
   by day the dark drum becomes the keycap and the bright ink becomes the paper yes (sun). ---- */
var PATCH = {
  printshop: { d: { accent: "#232A4E", accentInk: "#FBF6EC", accentHi: "#3A4272", accentEdge: "#E0348E" } },
  vice:      { d: { accent: "#D41F84", accentInk: "#FFFFFF", accentEdge: "#8E0F57" } },
  fiesta:    { d: { accent: "#007F72", accentInk: "#FFFFFF", accentEdge: "#004C44", sun: "#1CC4B2" } },
  sunburst:  { d: { accent: "#BF4A08", accentInk: "#FFFFFF", accentEdge: "#7A2D02" } },
  mountain:  { d: { accent: "#B35A25", accentInk: "#FFFFFF", accentEdge: "#6E3310" } },
  emerald:   { d: { accent: "#0E7A45", accentInk: "#FFF6DA", accentEdge: "#064A29", offset: "#E0A800" } },
  rainbow:   { d: { accent: "#2250B5", accentInk: "#FFFFFF", accentEdge: "#12306E" } },
  garden:    { d: { accent: "#1552A8", accentInk: "#FFFFFF", accentEdge: "#0B2F66", offset: "#F07A1A", you: "#7A3FC4" } },
  vancouver: { d: { accent: "#00766E", accentInk: "#FFFFFF", accentEdge: "#004640" } },
  peachtree: { d: { accent: "#1E1411", accentInk: "#FFB08E", accentHi: "#3A2A24", accentEdge: "#000000" } },
  pinkblue:  { d: { accent: "#CC1F7A", accentInk: "#FFFFFF", accentEdge: "#85104E" } },
  tealorange:{ d: { accent: "#00717A", accentInk: "#FFFFFF", accentEdge: "#00444A", offset: "#FF7A5E" } },
  burgundyaqua: { d: { accent: "#914E72", accentInk: "#FFFFFF", accentEdge: "#5A2A45", offset: "#2FA8CC" } },
  violetmint:   { d: { accent: "#6A4CA8", accentInk: "#FFFFFF", accentEdge: "#3E2A6E", offset: "#3FB8B4" } },
  tealera:   { n: { accent: "#A283FF", accentInk: "#1A0B3D", accentEdge: "#5A36B8" } },
  bigd:      { n: { accent: "#5B9BFF", accentInk: "#06193A", accentEdge: "#2356B0" } }
};
module.exports.forEach(function (p) {
  var P = PATCH[p.id]; if (!P) return;
  ["n", "d"].forEach(function (g) {
    if (!P[g]) return;
    for (var k in P[g]) p[g][k] = P[g][k];
    // a patched keycap re-derives its highlight unless the patch names one
    if (P[g].accent && !P[g].accentHi) delete p[g].accentHi;
  });
});


/* ---- round 3: "you" stays blue wherever blue is free (the v50 riso blue); where the
   accent is blue, "you" goes violet. Yellow "you" markers vanish on paper slips. ---- */
var PATCH3 = {
  tealera:   { n: { you: "#4F95FF" }, d: { you: "#2F5FD0" } },
  creamcity: { n: { you: "#3A9BE0", offset: "#3CC47F" }, d: { you: "#1F6FC0", offset: "#1F9A5A" } },
  pinstripe: { n: { you: "#9D7BFF" }, d: { you: "#6A3FC8" } },
  garden:    { n: { you: "#A07CFF" }, d: { you: "#7A3FC4" } },
  bigd:      { n: { you: "#A07CFF" }, d: { you: "#6A3FC8" } },
  burgundyaqua: { n: { you: "#6F8CFF" }, d: { you: "#2F5FD0" } },
  violetmint:   { n: { you: "#5A9BFF" }, d: { you: "#2F5FD0" } },
  pinwheel:  { n: { ground: "#1C1315", ground2: "#261C1E", sun: "#FFC94A" }, d: { sun: "#FFC94A" } }
};
module.exports.forEach(function (p) {
  var P = PATCH3[p.id]; if (!P) return;
  ["n", "d"].forEach(function (g) { if (P[g]) for (var k in P[g]) p[g][k] = P[g][k]; });
});

/* ---- round 4: masthead drums on dark stock. The key prints last and on top, so the
   team color has to come through the depth (the extrusion) and the icon body. ---- */
var MAST = {
  fiesta:   { map: { word: "key", word82: "b", depth: "b", shade: "c", body: "c", line: "key", glow: "a", accent: "a", frame: "b", tag: "b", back: "c" } },
  tealera:  { inks: { key: "mint", a: "violet", b: "#F2F7F6", c: "lightteal" },
              map: { word: "key", word82: "key", depth: "a", shade: "c", body: "c", line: "b", glow: "key", accent: "a", frame: "key", tag: "key", back: "c" } },
  mountain: { map: { word: "key", word82: "a", depth: "a", shade: "c", body: "b", line: "key", glow: "a", accent: "a", frame: "b", tag: "a", back: "c" } },
  dinosaur: { map: { word: "key", word82: "a", depth: "a", shade: "c", body: "b", line: "key", glow: "a", accent: "a", frame: "b", tag: "a", back: "c" } }
};
module.exports.forEach(function (p) { var M = MAST[p.id]; if (!M) return; if (M.inks) p.inks = M.inks; if (M.map) p.map = M.map; });
module.exports.forEach(function (p) { if (p.id === "printshop") p.n.text2 = "#A9ACC4"; });

/* ---- round 5: Big D gets its own prairie-green night (it read as Pinstripe), and Teal and
   Orange keys go teal at night too (coral keys sat too close to the red NO). ---- */
module.exports.forEach(function (p) {
  if (p.id === "bigd") {
    p.n.ground = "#0B1D1A"; p.n.metal = "#7FA38E"; delete p.n.ground2; delete p.n.ground3;
    p.d.ground = "#E4EEE6"; p.d.ground2 = "#F5F9F5"; p.d.metal = "#5F8A70";
  }
  if (p.id === "tealorange") {
    p.n.accent = "#35CFCB"; p.n.accentInk = "#042426"; delete p.n.accentHi; delete p.n.accentEdge;
    p.n.offset = "#FF7F66";
  }
});

/* ---- round 6: fixes after the art directors' review ----
   One meaning per color: YES (sun) is never the primary action's color and never near red;
   blue is only "you" (no blue offsets or ornament lines where you is blue). ---- */
var PATCH6 = {
  // Print Shop: the scarlet lifts a touch so the house navy reads on a NO at 4.6:1 (navy stays exact).
  printshop: { n: { bad: "#FF5E66" }, d: { bad: "#FF5E66" } },
  // Pink and Blue: pink is the action, sunflower the yes (a third drum, as on the v50 print),
  // riso blue only "you", the pink drum is the offset, ornament lines a pink-over-blue gray.
  // Night ground = the navy stock, so a masthead printed on navy has no box around it.
  // The NO turns from vermilion to scarlet, halfway between the pink keys and the sunflower yes.
  pinkblue:  { n: { ground: "#1A2140", sun: "#FFB511", offset: "#FF48B0", you: "#3094E6", metal: "#A39CB8", bad: "#FF5A4E" },
               d: { sun: "#FFB511", offset: "#FF48B0", metal: "#767083", bad: "#FF4B3E" } },
  // Vice: the keys stay pink, the yes goes sunflower (the sunset), so a YES is not a pink key; NO scarlet.
  vice:      { n: { sun: "#FFB511", bad: "#FF5A4E" }, d: { sun: "#FFB511", bad: "#FF4B3E" } },
  // Peachtree: Hawks legacy yellow for the yes (the peach yes melted into the peach stock).
  peachtree: { n: { sun: "#FDB927" }, d: { sun: "#FDB927", sunEdge: "#A87400" } },
  // Teal and Orange, Garden: a salmon or orange yes sat next to the red NO; amber keeps them apart.
  tealorange:{ n: { sun: "#FFB21E" }, d: { sun: "#FFB21E" } },
  garden:    { d: { sun: "#FFB81C" } },
  // Fiesta: blue is you (it was orange, next to the red NO).
  fiesta:    { n: { you: "#3F9BE0" }, d: { you: "#1F6FC0" } },
  // Rainbow Skyline: ornament lines a warm gray, not a second blue.
  rainbow:   { n: { metal: "#A8A193" }, d: { metal: "#7A7266" } }
};
module.exports.forEach(function (p) {
  var P = PATCH6[p.id]; if (!P) return;
  ["n", "d"].forEach(function (g) { if (P[g]) for (var k in P[g]) p[g][k] = P[g][k]; });
});

/* ---- round 6b: NO labels read at 4.5:1. The NO keycap prints badInk on bad (site) or ink on bad
   (paper slips), and those labels are small bold type. So: every bad is a bright red (hue kept,
   lifted until the paper ink reads on it, but not so light the fill fades into a day ground),
   the paper ink darkens a little where it still falls short, and badInk is the reddest dark
   that reaches 4.6:1 on the fill. ---- */
(function () {
  var H6 = require("./harness.js")(), C = H6.LAB.color, R6 = H6.RISO;
  function hue(hx) {
    var c = R6.hexRGB(hx).map(function (v) { return v / 255; }), mx = Math.max.apply(0, c), mn = Math.min.apply(0, c), d = mx - mn, h;
    if (!d) return 0;
    h = mx === c[0] ? ((c[1] - c[2]) / d) % 6 : mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4;
    h *= 60; return h < 0 ? h + 360 : h;
  }
  function hsl(h, l) { var a = Math.min(l, 1 - l); function k(n) { var q = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(q - 3, 9 - q, 1)); } return R6.rgbHex([k(0) * 255, k(8) * 255, k(4) * 255]); }
  function atLum(h, t) { var lo = 0.3, hi = 0.85; for (var i = 0; i < 30; i++) { var m = (lo + hi) / 2; if (C.lum(hsl(h, m)) < t) lo = m; else hi = m; } return hsl(h, hi); }
  function up(h) { return h.toUpperCase(); }
  module.exports.forEach(function (p) {
    if (p.today) return;
    ["n", "d"].forEach(function (g) {
      var s = p[g], night = g === "n";
      var L0 = C.lum(s.bad), needInk = 4.6 * (C.lum(s.ink) + 0.05) - 0.05;
      var hi = night ? 0.29 : Math.max(0.26, Math.min(0.28, (C.lum(s.ground) + 0.05) / 2.5 - 0.05));
      var t = Math.min(Math.max(L0, 0.26, needInk), Math.max(hi, L0));
      if (t > L0 + 0.004) s.bad = up(atLum(hue(s.bad), t));
      if (C.contrast(s.ink, s.bad) < 4.6) {
        var same = s.text === s.ink, ink = s.ink;
        for (var a = 0.02; C.contrast(ink, s.bad) < 4.6 && a <= 0.9; a += 0.02) ink = C.mix(s.ink, "#000000", a);
        s.ink = up(ink); if (same) s.text = s.ink;
      }
      var bi = s.bad;
      for (var b = 0.5; (C.contrast(bi, s.bad) < 4.6 || C.contrast(bi, s.paper) < 5) && b <= 1; b += 0.01) bi = C.mix(s.bad, "#000000", b);
      s.badInk = up(bi);
    });
  });
})();

/* Gold Standard: night is today's site; its NO label takes today's literal for text on a bad fill.
   Day lifts the scarlet so the navy label reads on it. */
module.exports.forEach(function (p) {
  if (p.id !== "goldstandard") return;
  p.nExtra.badInk = "#2A0703";
  p.dOver.bad = "#FF5C63"; p.dExtra.badInk = "#4A0E12";
});
