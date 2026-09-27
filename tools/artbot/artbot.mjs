// TRUE 82 art bot driver, round 2:  node artbot.mjs [scene ...] [--styles riso,neon] [--px 720] [--look t1,t2,...]
// Serves this folder, opens artbot.html in headless Chromium (Playwright, the tennis copy), builds each scene,
// prints every style to PNG frames and encodes each to an H.264 MP4 on black (ffmpeg-static, the tennis copy),
// then writes out/gallery.json. --look prints flat-color layer checks at the given times instead (look/).
import fs from "node:fs"; import path from "node:path"; import http from "node:http"; import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
const require = createRequire(import.meta.url);
const here = path.dirname(new URL(import.meta.url).pathname);
const TENNIS = "/Users/ggz/tennis-puzzle-prototypes/backdrop-studio/node_modules/";
const { chromium } = require(process.env.PLAYWRIGHT || TENNIS + "playwright");
const FFMPEG = process.env.FFMPEG || TENNIS + "ffmpeg-static/ffmpeg";
const THEME = require(process.env.T82_THEME || path.join(here, "..", "theme-core.js"));
const role = (n) => THEME.ROLES.find((r) => r[0] === n)[1];
const INKS = { accent: role("accent"), accentHi: role("accent-hi"), offset: role("offset"), hot: role("hot"), ground: role("ground"), overlay: role("overlay"), line: role("line"), light: role("light") };
const args = process.argv.slice(2), opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const styles = opt("--styles", "riso,neon,chrono").split(","), px = +opt("--px", 720), lookAt = opt("--look", null);
const skip = new Set([opt("--styles"), opt("--px"), opt("--look")].filter(Boolean));
let ids = args.filter((a) => !a.startsWith("--") && !skip.has(a));

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".fbx": "application/octet-stream" };
const server = http.createServer((req, res) => {
  const p = path.join(here, decodeURIComponent(req.url.split("?")[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--js-flags=--max-old-space-size=6144"] });
const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errs.push(m.text()); });
await page.exposeFunction("__saveFrame", async (id, style, i, dataUrl) => {
  const dir = path.join(here, "out", id, style); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "f" + String(i).padStart(4, "0") + ".png"), Buffer.from(dataUrl.split(",")[1], "base64"));
});
await page.goto(base + "artbot.html");
if (process.env.DEBUG_HEAD) await page.evaluate(() => (window.DEBUG_HEAD = true));
await page.waitForFunction(() => window.ARTBOT_READY, null, { timeout: 60000 }).catch(() => { console.log(errs.join("\n")); process.exit(1); });
if (!ids.length) ids = await page.evaluate(() => window.ARTBOT.SCENES);
const gallery = fs.existsSync(path.join(here, "out", "gallery.json")) ? JSON.parse(fs.readFileSync(path.join(here, "out", "gallery.json"), "utf8")) : [];
for (const id of ids) {
  const t = Date.now();
  if (lookAt) {
    const r = await page.evaluate(([id, times, px]) => window.ARTBOT.look(id, times, px), [id, lookAt.split(",").map(Number), px]).catch((e) => ({ err: String(e) }));
    if (r.err) { console.log("FAILED", id, r.err.slice(0, 600), "\n" + errs.slice(-6).join("\n")); continue; }
    fs.mkdirSync(path.join(here, "look"), { recursive: true });
    r.shots.forEach((u, k) => fs.writeFileSync(path.join(here, "look", `${id}-${k}.png`), Buffer.from(u.split(",")[1], "base64")));
    console.log(id, "look", r.shots.length, "len", r.len, "key", r.key.toFixed(2), ((Date.now() - t) / 1000).toFixed(1) + "s");
    continue;
  }
  fs.rmSync(path.join(here, "out", id), { recursive: true, force: true });
  let rep;
  try { rep = await page.evaluate(([id, inks, styles, px]) => window.ARTBOT.run(id, inks, styles, px), [id, INKS, styles, px]); }
  catch (e) { console.log("FAILED", id, String(e).slice(0, 600), "\n" + errs.slice(-6).join("\n")); continue; }
  for (const s of styles) {
    const dir = path.join(here, "out", id, s), mp4 = path.join(here, "out", id, s + ".mp4");
    const r = spawnSync(FFMPEG, ["-y", "-loglevel", "error", "-framerate", "24", "-i", path.join(dir, "f%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "slow", "-movflags", "+faststart", mp4]);
    if (r.status) console.log("ffmpeg failed", id, s, String(r.stderr).slice(0, 300));
    const k = gallery.findIndex((x) => x.id === id && x.style === s); const row = { id, style: s, file: `out/${id}/${s}.mp4`, bytes: fs.existsSync(mp4) ? fs.statSync(mp4).size : 0, frames: rep.frames, len: rep.len, key: rep.key, loop: rep.loop };
    if (k >= 0) gallery[k] = row; else gallery.push(row);
  }
  console.log(id, rep.frames + " frames", rep.len.toFixed(2) + "s", "key " + rep.key.toFixed(2) + "s", "in " + ((Date.now() - t) / 1000).toFixed(1) + "s");
}
fs.mkdirSync(path.join(here, "out"), { recursive: true });
if (!lookAt) fs.writeFileSync(path.join(here, "out", "gallery.json"), JSON.stringify(gallery, null, 1));
if (errs.length) console.log("page messages:\n" + [...new Set(errs)].slice(0, 10).join("\n"));
await browser.close(); server.close();
