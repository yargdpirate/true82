// node build.js  ->  lab/dist/reprint-lab.html (full document, for the repo)
//                    lab/dist/reprint-lab.artifact.html (body-only, for the Artifact publish)
// Inlines every source in the dev loader's order, the tokenized site CSS, and
// the snapshots named in app/views.js, with large data: URIs deduplicated
// into one asset table.
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const SRC = __dirname, SP = path.resolve(SRC, "../.."), DIST = path.join(SP, "lab/dist");
fs.mkdirSync(DIST, { recursive: true });
const read = f => fs.readFileSync(f, "utf8");
const jsFiles = [];
["engine.js", "banner.js", "fonts.js", "layouts.js", "additions.js"].forEach(f => jsFiles.push(path.join(SRC, f)));
const extraDirs = fs.existsSync(path.join(SRC, "vendor")) ? ["vendor/"] : [];
["palettes/", "concepts/", "system/"].concat(extraDirs).forEach(d => {
  const dir = path.join(SRC, d);
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).filter(f => f.endsWith(".js")).sort().forEach(f => jsFiles.push(path.join(dir, f)));
});
// the dev loader's order puts vendor/ wherever the loader lists it; mirror loader.js DIRS if it has vendor
const loader = read(path.join(SRC, "dev/loader.js"));
const dirsMatch = loader.match(/var DIRS = \[([^\]]*)\]/);
if (dirsMatch) {
  const order = dirsMatch[1].split(",").map(s => s.trim().replace(/"/g, "")).filter(Boolean);
  jsFiles.sort((a, b) => {
    const ra = path.relative(SRC, a), rb = path.relative(SRC, b);
    const da = order.findIndex(o => ra.startsWith(o)), db = order.findIndex(o => rb.startsWith(o));
    const ca = da < 0 ? -1 : da, cb = db < 0 ? -1 : db;
    if (ca !== cb) return ca - cb;
    if (ca === -1) return 0;
    return ra < rb ? -1 : 1;
  });
}
const morePresets = fs.readdirSync(path.join(SRC, "app")).filter(f => /^presets-.*\.js$/.test(f)).sort().map(f => "app/" + f);
const appFiles = ["app/views.js"].concat(morePresets, ["app/presets.js", "app/pages.js", "app/console.js"]).map(f => path.join(SRC, f));

// snapshots used by the views
const views = read(path.join(SRC, "app/views.js"));
const names = Array.from(new Set((views.match(/snap:\s*"([^"]+)"/g) || []).map(s => s.match(/"([^"]+)"/)[1])));
const assets = {}, snaps = {};
let missing = [];
for (const n of names) {
  const f = path.join(SP, "snaps/tok", n + ".html");
  if (!fs.existsSync(f)) { missing.push(n); continue; }
  let h = read(f);
  h = h.replace(/<base href="[^"]*">/, "");
  h = h.replace(/(<img[^>]*class="brand-logo"[^>]*\ssrc=")[^"]*(")/g, "$1data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==$2");
  h = h.replace(/(<img[^>]*\ssrc=")\/?logo\.png(")/g, "$1data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==$2");
  h = h.replace(/<link rel="stylesheet" href="http:\/\/localhost:8091\/lab\/build\/site\.tok\.css" data-lab-site="?"?>/g, "<link data-lab-site>");
  h = h.replace(/(["'(]|&quot;)(data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]{2048,})/g, (m, q, uri) => {
    const id = crypto.createHash("sha1").update(uri).digest("hex").slice(0, 12);
    assets[id] = uri;
    return q + "lab-asset:" + id;
  });
  snaps[n] = h;
}
const siteCSS = read(path.join(SP, "lab/build/site.tok.css"));
const esc = s => JSON.stringify(s).replace(/<\//g, "<\\/").replace(new RegExp("\u2028", "g"), "\\u2028").replace(new RegExp("\u2029", "g"), "\\u2029");

// fonts: the lab's own + every masthead face
const fontsSrc = read(path.join(SRC, "fonts.js"));
const fams = Array.from(new Set((fontsSrc.match(/css: "([^"]+)"/g) || []).map(s => s.slice(6, -1)).filter(Boolean)));
const fontLinks = [];
for (let i = 0; i < fams.length; i += 12) fontLinks.push('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=' + fams.slice(i, i + 12).join("&family=") + '&display=swap">');
const labFonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=IBM+Plex+Mono:wght@400;600;700&display=swap">';

const devHTML = read(path.join(SRC, "dev/lab.html"));
const body = devHTML.split("<!--LAB-BODY-->")[1].split("<!--/LAB-BODY-->")[0];
const css = read(path.join(SRC, "app/lab.css"));
const scripts = jsFiles.concat(appFiles).map(f => "<script>/* " + path.relative(SRC, f) + " */\n" + read(f).replace(/<\/script/gi, "<\\/script") + "\n</script>").join("\n");
const logo = "data:image/png;base64," + fs.readFileSync("/Users/ggz/true82/logo.png").toString("base64");
const data = "<script>window.LAB_LOGO = " + esc(logo) + ";\nwindow.LAB_SITE_CSS = " + esc(siteCSS) + ";\nwindow.LAB_ASSETS = " + esc(assets) + ";\nwindow.LAB_SNAPS = " + esc(snaps) + ";\n</script>";
const boot = "<script>document.fonts && document.fonts.ready; (function start() { if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', start); return; } LAB.boot(); })();</script>";
const head = '<title>TRUE 82 Reprint Lab</title>\n<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' + labFonts + "\n" + fontLinks.join("\n") + "\n<style>\n" + css + "\n</style>";
const artifact = head + "\n" + body + "\n" + data + "\n" + scripts + "\n" + boot + "\n";
const full = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="robots" content="noindex">\n' + head + "\n</head>\n<body>\n" + body + "\n" + data + "\n" + scripts + "\n" + boot + "\n</body>\n</html>\n";
fs.writeFileSync(path.join(DIST, "reprint-lab.artifact.html"), artifact);
fs.writeFileSync(path.join(DIST, "reprint-lab.html"), full);
const kb = n => Math.round(n / 1024) + "KB";
console.log("scripts:", jsFiles.length + appFiles.length, "snapshots:", Object.keys(snaps).length, "missing:", missing.join(",") || "none");
console.log("assets:", Object.keys(assets).length, kb(Object.values(assets).join("").length), "snap html:", kb(Object.values(snaps).join("").length), "site css:", kb(siteCSS.length));
console.log("artifact:", kb(artifact.length), "full:", kb(full.length));
