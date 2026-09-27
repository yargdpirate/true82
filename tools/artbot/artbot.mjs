// TRUE 82 art bot driver: node artbot.mjs moves.json [style ...] [--only id]
// Serves this folder, opens artbot.html in headless Chromium (Playwright, the tennis copy), renders every move
// in every style to PNG frames, encodes each to an H.264 MP4 (ffmpeg-static, the tennis copy) on black, and
// writes gallery.json. Inks come from the site's theme (tools/theme-core.js), so the art matches the look.
import fs from "node:fs"; import path from "node:path"; import http from "node:http"; import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
const require = createRequire(import.meta.url);
const here = path.dirname(new URL(import.meta.url).pathname);
const TENNIS = "/Users/ggz/tennis-puzzle-prototypes/backdrop-studio/node_modules/";
const { chromium } = require(process.env.PLAYWRIGHT || TENNIS + "playwright");
const FFMPEG = process.env.FFMPEG || TENNIS + "ffmpeg-static/ffmpeg";
const THEME = require(process.env.T82_THEME || path.join(here, "..", "theme-core.js"));
const role = (n) => THEME.ROLES.find((r) => r[0] === n)[1];
const INKS = { accent: role("accent"), accentHi: role("accent-hi"), offset: role("offset"), hot: role("hot"), ground: role("ground"),
  overlay: role("overlay"), line: role("line"), light: role("light") };

const args = process.argv.slice(2), only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const movesFile = args.find((a) => a.endsWith(".json")) || "moves.json";
const moves = JSON.parse(fs.readFileSync(path.resolve(here, movesFile), "utf8")).filter((m) => !only || m.id === only);
const wanted = args.filter((a) => !a.endsWith(".json") && !a.startsWith("--") && a !== only);

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".fbx": "application/octet-stream" };
const server = http.createServer((req, res) => {
  const p = path.join(here, decodeURIComponent(req.url.split("?")[0]));
  if (!p.startsWith(here) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--js-flags=--max-old-space-size=4096"] });
const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await page.exposeFunction("__saveFrame", async (id, style, i, dataUrl) => {
  const dir = path.join(here, "out", id, style); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "f" + String(i).padStart(4, "0") + ".png"), Buffer.from(dataUrl.split(",")[1], "base64"));
});
await page.goto(base + "artbot.html");
await page.waitForFunction(() => window.ARTBOT_READY, null, { timeout: 60000 }).catch(() => { console.log(errs.join("\n")); process.exit(1); });
const styles = wanted.length ? wanted : await page.evaluate(() => window.ARTBOT.STYLES);
const gallery = [];
for (const m of moves) {
  const move = Object.assign({}, m, { url: base + m.file });
  const t = Date.now();
  let rep;
  try { rep = await page.evaluate(({ move, inks, styles }) => window.ARTBOT.run(move, inks, styles), { move, inks: INKS, styles }); }
  catch (e) { console.log("FAILED", m.id, String(e).slice(0, 400), errs.slice(-5).join("\n")); continue; }
  for (const s of styles) {
    const dir = path.join(here, "out", m.id, s), mp4 = path.join(here, "out", m.id, s + ".mp4");
    const r = spawnSync(FFMPEG, ["-y", "-loglevel", "error", "-framerate", "24", "-i", path.join(dir, "f%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p",
      "-crf", "22", "-preset", "slow", "-movflags", "+faststart", mp4]);
    if (r.status) console.log("ffmpeg failed", m.id, s, String(r.stderr).slice(0, 300));
    gallery.push({ id: m.id, label: m.label, pos: m.pos, style: s, file: `out/${m.id}/${s}.mp4`, bytes: fs.existsSync(mp4) ? fs.statSync(mp4).size : 0, frames: rep.frames });
  }
  console.log(m.id, rep.frames + " frames", (rep.duration).toFixed(2) + "s", "rendered in " + ((Date.now() - t) / 1000).toFixed(1) + "s");
}
fs.writeFileSync(path.join(here, "out", "gallery.json"), JSON.stringify(gallery, null, 1));
if (errs.length) console.log("page errors:\n" + errs.slice(0, 8).join("\n"));
await browser.close(); server.close();
