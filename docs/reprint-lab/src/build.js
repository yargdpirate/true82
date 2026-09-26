// node build.js <snaps dir> [out dir]
//   -> <out dir>/reprint-lab.html           the full document (for the repo; out dir defaults to docs/reprint-lab/)
//   -> <out dir>/reprint-lab.artifact.html  body only (for the Artifact publish)
// Inlines the site's own theme and print engines (tools/theme-core.js, results-riso.js, reel-riso.js from the
// repo), every lab source in the dev loader's order, the repo's styles.css (since v51 the site's CSS reads every
// color, font and radius from --t-* tokens, so it is the lab's site CSS as it is), and the snapshots named in
// app/views.js (raw v51 captures: <base> stripped, the styles.css link swapped for <link data-lab-site>), with
// large data: URIs deduplicated into one asset table.
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const SRC = __dirname, REPO = path.resolve(SRC, "../../.."), LAB_DIR = path.resolve(SRC, "..");
const SNAPS = process.argv[2] || process.env.LAB_SNAPS;
const DIST = process.argv[3] || process.env.LAB_OUT || LAB_DIR;
if (!SNAPS || !fs.existsSync(SNAPS)) { console.error("usage: node build.js <snaps dir> [out dir]  (the raw snapshots: docs/reprint-lab/capture/v51/BRIEF.md)"); process.exit(1); }
fs.mkdirSync(DIST, { recursive: true });
const read = f => fs.readFileSync(f, "utf8");

// the site's own files first (the lab applies looks with the site's theme and reprints with its engines)
const siteFiles = ["tools/theme-core.js", "results-riso.js", "reel-riso.js"].map(f => path.join(REPO, f));
const jsFiles = [];
["engine.js", "banner.js", "fonts.js", "layouts.js", "additions.js"].forEach(f => jsFiles.push(path.join(SRC, f)));
["palettes/", "concepts/", "system/"].forEach(d => {
  const dir = path.join(SRC, d);
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).filter(f => f.endsWith(".js")).sort().forEach(f => jsFiles.push(path.join(dir, f)));
});
const morePresets = fs.readdirSync(path.join(SRC, "app")).filter(f => /^presets-.*\.js$/.test(f)).sort().map(f => "app/" + f);
const appFiles = ["app/views.js"].concat(morePresets, ["app/presets.js", "app/pages.js", "app/console.js"]).map(f => path.join(SRC, f));

// snapshots used by the views
const views = read(path.join(SRC, "app/views.js"));
const names = Array.from(new Set((views.match(/snap:\s*"([^"]+)"/g) || []).map(s => s.match(/"([^"]+)"/)[1])));
const GIF = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
const assets = {}, snaps = {};
let missing = [], noLink = [];
for (const n of names) {
  const f = path.join(SNAPS, n + ".html");
  if (!fs.existsSync(f)) { missing.push(n); continue; }
  let h = read(f);
  h = h.replace(/<base href="[^"]*">/, "");
  const before = h;
  h = h.replace(/<link rel="stylesheet" href="\/?styles\.css(\?[^"]*)?"[^>]*>/g, "<link data-lab-site>");
  h = h.replace(/\n?<link rel="stylesheet" href="\/?look\.css(\?[^"]*)?"[^>]*>/g, "");   // the shipped look is inlined once (LAB_LOOK_CSS)
  if (h === before) noLink.push(n);
  h = h.replace(/(<img[^>]*class="brand-logo"[^>]*\ssrc=")[^"]*(")/g, "$1" + GIF + "$2");
  h = h.replace(/(<img[^>]*\ssrc=")\/?logo\.png(")/g, "$1" + GIF + "$2");
  h = h.replace(/(["'(]|&quot;)(data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]{2048,})/g, (m, q, uri) => {
    const id = crypto.createHash("sha1").update(uri).digest("hex").slice(0, 12);
    assets[id] = uri;
    return q + "lab-asset:" + id;
  });
  snaps[n] = h;
}
// The frozen season prints are opaque PNGs of about half a megabyte each: carry them as JPEG (the site's own share
// poster is a JPEG too). macOS sips does the conversion; without it they stay PNG.
(function jpegPrints() {
  const ids = new Set();
  Object.values(snaps).forEach(h => { (h.match(/<img[^>]*class="rr-print-canvas"[^>]*>/g) || []).forEach(tag => { const m = tag.match(/lab-asset:([0-9a-f]{12})/); if (m) ids.add(m[1]); }); });
  const os = require("os"), cp = require("child_process"), tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lab-jpeg-"));
  let saved = 0;
  ids.forEach(id => {
    const uri = assets[id];
    if (!uri || !uri.startsWith("data:image/png;base64,")) return;
    const pin = path.join(tmp, id + ".png"), pout = path.join(tmp, id + ".jpg");
    try {
      fs.writeFileSync(pin, Buffer.from(uri.slice(22), "base64"));
      cp.execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "88", pin, "--out", pout], { stdio: "ignore" });
      const jpg = "data:image/jpeg;base64," + fs.readFileSync(pout).toString("base64");
      if (jpg.length < uri.length) { saved += uri.length - jpg.length; assets[id] = jpg; }
    } catch (e) { /* no sips: keep the PNG */ }
  });
  fs.rmSync(tmp, { recursive: true, force: true });
  if (ids.size) console.log("season prints as JPEG:", ids.size, "saved", Math.round(saved / 1024) + "KB");
})();
const siteCSS = read(path.join(REPO, "styles.css"));
const lookCSS = fs.existsSync(path.join(REPO, "look.css")) ? read(path.join(REPO, "look.css")) : "";
const esc = s => JSON.stringify(s).replace(/<\//g, "<\\/").replace(new RegExp(" ", "g"), "\\u2028").replace(new RegExp(" ", "g"), "\\u2029");

// fonts: the lab's own + every masthead face
const fontsSrc = read(path.join(SRC, "fonts.js"));
const fams = Array.from(new Set((fontsSrc.match(/css: "([^"]+)"/g) || []).map(s => s.slice(6, -1)).filter(Boolean)));
const fontLinks = [];
for (let i = 0; i < fams.length; i += 12) fontLinks.push('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=' + fams.slice(i, i + 12).join("&family=") + '&display=swap">');
const labFonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=IBM+Plex+Mono:wght@400;600;700&display=swap">';

const devHTML = read(path.join(SRC, "dev/lab.html"));
const body = devHTML.split("<!--LAB-BODY-->")[1].split("<!--/LAB-BODY-->")[0];
const css = read(path.join(SRC, "app/lab.css"));
const script = (f, label) => "<script>/* " + label + " */\n" + read(f).replace(/<\/script/gi, "<\\/script") + "\n</script>";
const scripts = siteFiles.map(f => script(f, "site: " + path.relative(REPO, f)))
  .concat(jsFiles.concat(appFiles).map(f => script(f, path.relative(SRC, f)))).join("\n");
const logo = "data:image/png;base64," + fs.readFileSync(path.join(REPO, "logo.png")).toString("base64");
const data = "<script>window.LAB_LOGO = " + esc(logo) + ";\nwindow.LAB_SITE_CSS = " + esc(siteCSS) + ";\nwindow.LAB_LOOK_CSS = " + esc(lookCSS) + ";\nwindow.LAB_ASSETS = " + esc(assets) + ";\nwindow.LAB_SNAPS = " + esc(snaps) + ";\n</script>";
const boot = "<script>document.fonts && document.fonts.ready; (function start() { if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', start); return; } LAB.boot(); })();</script>";
const head = '<title>TRUE 82 Reprint Lab</title>\n<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' + labFonts + "\n" + fontLinks.join("\n") + "\n<style>\n" + css + "\n</style>";
const artifact = head + "\n" + body + "\n" + data + "\n" + scripts + "\n" + boot + "\n";
const full = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="robots" content="noindex">\n' + head + "\n</head>\n<body>\n" + body + "\n" + data + "\n" + scripts + "\n" + boot + "\n</body>\n</html>\n";
fs.writeFileSync(path.join(DIST, "reprint-lab.artifact.html"), artifact);
fs.writeFileSync(path.join(DIST, "reprint-lab.html"), full);
const kb = n => Math.round(n / 1024) + "KB";
console.log("scripts:", siteFiles.length + jsFiles.length + appFiles.length, "snapshots:", Object.keys(snaps).length, "missing:", missing.join(",") || "none", "no styles.css link:", noLink.join(",") || "none");
console.log("assets:", Object.keys(assets).length, kb(Object.values(assets).join("").length), "snap html:", kb(Object.values(snaps).join("").length), "site css:", kb(siteCSS.length));
console.log("artifact:", kb(artifact.length), "full:", kb(full.length));
