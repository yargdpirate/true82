import fs from "node:fs"; import path from "node:path"; import http from "node:http"; import { createRequire } from "node:module";
const require = createRequire(import.meta.url), here = path.dirname(new URL(import.meta.url).pathname);
const { chromium } = require(process.env.PLAYWRIGHT || "/Users/ggz/tennis-puzzle-prototypes/backdrop-studio/node_modules/playwright");
const moves = JSON.parse(fs.readFileSync(path.join(here, "moves.json"), "utf8"));
const server = http.createServer((q, r) => { const p = path.join(here, decodeURIComponent(q.url.split("?")[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "content-type": p.endsWith(".js") ? "text/javascript" : p.endsWith(".html") ? "text/html" : "application/octet-stream" }); fs.createReadStream(p).pipe(r); });
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] }), pg = await b.newPage(), errs = [];
pg.on("pageerror", (e) => errs.push(String(e))); pg.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await pg.goto(`http://127.0.0.1:${server.address().port}/artbot.html`);
await pg.waitForFunction(() => window.ARTBOT_READY, null, { timeout: 60000 }).catch(() => { console.log(errs.join("\n")); process.exit(1); });
for (const m of moves) {
  if (process.argv.includes("--sheets")) {
    const url = await pg.evaluate((m) => window.ARTBOT.contact(Object.assign({}, m, { url: m.file }), 16), m);
    fs.mkdirSync(path.join(here, "sheets"), { recursive: true });
    fs.writeFileSync(path.join(here, "sheets", m.id + ".png"), Buffer.from(url.split(",")[1], "base64"));
  }
  const r = await pg.evaluate((m) => window.ARTBOT.inspect(Object.assign({}, m, { url: m.file }), {}), m).catch((e) => ({ err: String(e).slice(0, 300) }));
  console.log(m.id, r.err || (r.duration.toFixed(2) + "s height " + r.height.toFixed(0) + " bones " + r.bones.length + " " + r.bones.filter((x) => /Hand$|Head$|Hips|Toe/.test(x)).join(",")));
}
if (errs.length) console.log(errs.slice(0, 5).join("\n"));
await b.close(); server.close();
