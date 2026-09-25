// Derive complete sys for every palette, check contrast, and (with --write) emit lab/src/palettes/*.js
var fs = require("fs"), path = require("path");
var W = require("./harness.js")(), LAB = W.LAB, C = LAB.color, R = W.RISO;
var design = require("./design.js");
var KEYS = ["ground", "ground2", "ground3", "line", "text", "text2", "accent", "accentHi", "accentEdge", "accentInk", "metal", "offset",
  "bad", "badEdge", "badInk", "good", "you", "paper", "paper2", "ink", "ink2", "sun", "sunEdge", "sunInk"];
var mix = C.mix, con = C.contrast;
function ensure(fg, bg, min, towards) { var c = fg, i = 0; while (con(c, bg) < min && i < 40) { c = mix(c, towards, 0.08); i++; } return c; }
function up(h) { return h.toUpperCase(); }
// Shift a color's lightness (keeping hue) by the smallest amount that reads on both the ground and the paper.
function balance(c, g, p, A, B) {
  var best = c, bestScore = -1;
  for (var i = 0; i <= 40; i++) {
    var cands = i === 0 ? [c] : [mix(c, "#000000", i * 0.02), mix(c, "#FFFFFF", i * 0.02)];
    for (var j = 0; j < cands.length; j++) {
      var x = cands[j], a = con(x, g), b = con(x, p);
      if (a >= A && b >= B) return x;
      var sc = Math.min(a / A, b / B); if (sc > bestScore) { bestScore = sc; best = x; }
    }
  }
  return best;
}

function lightInk(o) { return o.accentInk && C.lum(o.accentInk) > C.lum(o.accent); }
function derive(s, night) {
  var o = {}, k; for (k in s) o[k] = s[k];
  var W_ = "#FFFFFF", K_ = "#000000";
  if (night) {
    o.ground2 = o.ground2 || mix(o.ground, o.text, 0.07);
    o.ground3 = o.ground3 || mix(o.ground, o.text, 0.13);
    o.line = o.line || mix(o.ground, o.metal, 0.45);
    o.text2 = o.text2 || ensure(mix(o.text, o.ground, 0.36), o.ground3, 4.6, o.text);
    o.accentHi = o.accentHi || mix(o.accent, W_, lightInk(o) ? 0.16 : 0.35);
    o.accentEdge = o.accentEdge || mix(mix(o.accent, o.ground, 0.25), K_, 0.38);
    o.badEdge = o.badEdge || mix(o.bad, K_, 0.35);
    o.good = balance(o.good, o.ground, o.paper, 4, 2.8);
    o.you = balance(o.you, o.ground, o.paper, 3.5, 2.8);
  } else {
    o.ground2 = o.ground2 || mix(o.ground, W_, 0.55);
    o.ground3 = o.ground3 || mix(o.ground, o.text, 0.08);
    o.line = o.line || mix(o.ground, o.text, 0.2);
    o.text2 = o.text2 || ensure(mix(o.text, o.ground, 0.3), o.ground3, 5, o.text);
    o.accentHi = o.accentHi || mix(o.accent, W_, lightInk(o) ? 0.16 : 0.4);
    o.accentEdge = o.accentEdge || mix(o.accent, K_, 0.3);
    o.badEdge = o.badEdge || mix(o.bad, K_, 0.28);
    o.good = ensure(ensure(o.good, o.paper, 4.5, K_), o.ground, 4, K_);
    o.you = ensure(ensure(o.you, o.paper, 3.6, K_), o.ground, 3.2, K_);
  }
  o.badInk = o.badInk || ensure(ensure(mix(o.bad, K_, 0.55), o.bad, 3.2, K_), o.paper, 5, K_);
  if (!o.accentInk) {
    var dk = mix(o.accent, K_, 0.84), lt = mix(o.accent, W_, 0.92);
    o.accentInk = con(dk, o.accent) >= con(lt, o.accent) ? ensure(dk, o.accent, 5, K_) : ensure(lt, o.accent, 5, W_);
  }
  o.paper2 = o.paper2 || mix(o.paper, o.ink, 0.07);
  o.ink2 = o.ink2 || ensure(mix(o.ink, o.paper, 0.3), o.paper2, 5, o.ink);
  o.sun = o.sun || o.accent;
  o.sunEdge = o.sunEdge || mix(o.sun, K_, 0.25);
  o.sunInk = o.sunInk || ensure(mix(o.sun, K_, 0.45), o.paper, 4.8, K_);
  var out = {}; KEYS.forEach(function (k) { if (!o[k]) throw new Error("missing " + k); out[k] = up(o[k]); });
  return out;
}

// Required (hard) and advisory (soft) checks. [a, b, min, label]
var HARD = [["text", "ground", 7], ["text2", "ground", 4.5], ["accentInk", "accent", 4.5], ["ink", "paper", 7], ["badInk", "paper", 4.5]];
function soft(night) {
  return [["text", "ground2", 7], ["text2", "ground2", 4.5], ["text2", "ground3", 4], ["ink2", "paper", 4.5], ["ink", "sun", 4.5], ["sunInk", "paper", 4.5],
    ["ink", "paper2", 7], ["accentInk", "accentHi", 3.5], ["badInk", "bad", 3], ["accentInk", "good", 3],
    ["good", "ground", night ? 4 : 3.5], ["you", "ground", 3], ["bad", "ground", night ? 3 : 2.7], ["offset", "ground", 1.8],
    ["good", "paper", night ? 2.8 : 4.5], ["you", "paper", night ? 2.8 : 3.5], ["bad", "paper", 2.4],
    night ? ["accent", "ground", 4.5] : ["accent", "ground", 3]];
}

var ORDER = ["printshop", "goldstandard", "vice", "showtime", "fiesta", "wineandgold", "banner", "creamcity", "thecity", "tealera", "sunburst",
  "emerald", "dynasty", "garden", "mountain", "peachtree", "vancouver", "dinosaur", "pinstripe", "rainbow", "pinwheel", "bigd",
  "pinkblue", "burgundyaqua", "tealorange", "violetmint"];
design.sort(function (a, b) { var i = ORDER.indexOf(a.id), j = ORDER.indexOf(b.id); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); });
var built = [];
design.forEach(function (p) {
  var sys = {};
  if (p.today) {
    sys.night = {}; sys.day = {};
    KEYS.forEach(function (k) { sys.night[k] = up(LAB.TODAY.night[k] || p.nExtra[k]); sys.day[k] = up((p.dOver || {})[k] || LAB.TODAY.day[k] || p.dExtra[k]); });
  } else { sys.night = derive(p.n, true); sys.day = derive(p.d, false); }
  built.push({ p: p, sys: sys });
});

// ---- report ----
var rows = [], fails = [];
built.forEach(function (b) {
  ["night", "day"].forEach(function (g) {
    var s = b.sys[g], hard = HARD.map(function (c) { return con(s[c[0]], s[c[1]]); });
    var sf = soft(g === "night").map(function (c) { var v = con(s[c[0]], s[c[1]]); if (v < c[2]) fails.push(b.p.id + "/" + g + " soft " + c[0] + "/" + c[1] + " " + v.toFixed(2) + " < " + c[2]); return v; });
    HARD.forEach(function (c, i) { if (hard[i] < c[2]) fails.push(b.p.id + "/" + g + " HARD " + c[0] + "/" + c[1] + " " + hard[i].toFixed(2) + " < " + c[2]); });
    rows.push([b.p.id, g].concat(hard.map(function (v) { return v.toFixed(1); })));
  });
});
if (process.argv.indexOf("--table") >= 0) {
  console.log("id/ground  text/gr  text2/gr  accInk/acc  ink/paper  badInk/paper");
  rows.forEach(function (r) { console.log((r[0] + "/" + r[1]).padEnd(22) + r.slice(2).map(function (v) { return String(v).padStart(8); }).join("  ")); });
}
console.log(fails.length ? fails.join("\n") : "all checks pass");

// ---- write ----
if (process.argv.indexOf("--write") >= 0) {
  var OUT = path.join(__dirname, "../lab/src/palettes/");
  var files = {};
  built.forEach(function (b) { (files[b.p.file] = files[b.p.file] || []).push(b); });
  function q(v) { return JSON.stringify(v); }
  function obj(o) { return "{ " + Object.keys(o).map(function (k) { return k + ": " + q(o[k]); }).join(", ") + " }"; }
  function sysLines(s, ind) {
    var parts = KEYS.map(function (k) { return k + ": " + q(s[k]); }), lines = [], cur = [];
    parts.forEach(function (x) { cur.push(x); if (cur.length === 6) { lines.push(cur.join(", ")); cur = []; } });
    if (cur.length) lines.push(cur.join(", "));
    return "{\n" + lines.map(function (l) { return ind + "  " + l; }).join(",\n") + " }";
  }
  function palJS(b) {
    var p = b.p, head = "  P({ id: " + q(p.id) + ", name: " + q(p.name) + ", group: " + q(p.group) + ",\n    blurb: " + q(p.blurb) + ",\n    stock: " + q(p.stock) +
      (p.darkMode ? ", darkMode: " + q(p.darkMode) : "") + ", inks: " + obj(p.inks) + ",\n    map: " + obj(p.map) + ",\n";
    if (p.today) {
      return head + "    // night is exactly LAB.TODAY.night (read when the theme asks, since system/ loads after palettes/),\n" +
        "    // plus the literals today's CSS uses for the keys TODAY leaves out. Day is LAB.TODAY.day with a\n" +
        "    // maple keycap (amber can't be read as heading text on paper) and a deeper green.\n" +
        "    sys: todaySys(" + obj(p.nExtra) + ",\n      " + obj(p.dExtra) + ",\n      " + obj(p.dOver) + ") });\n";
    }
    return head + "    sys: {\n      night: " + sysLines(b.sys.night, "      ") + ",\n      day: " + sysLines(b.sys.day, "      ") + " } });\n";
  }
  var HEADERS = {
    "00-house": fs.readFileSync(path.join(__dirname, "house-head.js"), "utf8"),
    "10-team-nights": "/* ---------- TRUE 82 LAB: team nights ----------\n   Palettes after classic NBA uniforms. Schema: see 00-house.js. Best first.\n   One meaning per color in every palette: accent = the primary action (never red),\n   bad = red for NO and losses, good = green, you = the \"you\" marker,\n   offset = the misregistration ink, sun = the paper world's yes. */\n(function () {\n  var P = window.LAB.palette;\n",
    "20-riso-classics": "/* ---------- TRUE 82 LAB: riso classics ----------\n   Pure two-drum risograph combinations. Schema: see 00-house.js. */\n(function () {\n  var P = window.LAB.palette;\n"
  };
  Object.keys(files).forEach(function (f) {
    var js = HEADERS[f] + files[f].map(palJS).join("\n") + "})();\n";
    fs.writeFileSync(OUT + f + ".js", js);
    console.log("wrote " + f + ".js (" + files[f].length + ")");
  });
  fs.writeFileSync(path.join(__dirname, "built.json"), JSON.stringify(built.map(function (b) { return { id: b.p.id, name: b.p.name, group: b.p.group, inks: b.p.inks, stock: b.p.stock, sys: b.sys }; }), null, 1));
}
