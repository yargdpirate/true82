// node docs/reprint-lab/export/export-masthead.js [outdir] [json overrides]
// Exports the shipped look's masthead.png (LAB.image(rc, 300, 3), 900x252) and the link card og-image.png (1200x630)
// from the Reprint Lab's Heat Vice preset (+ overrides). v54. Since v57 the site's app icons are their own drawing,
// made for favicon scale by tools/icons.js; LAB.appIcon (the banner's icon, trimmed) stays the lab's quick preview.
// Needs Playwright (this machine: /Users/ggz/tennis-puzzle-prototypes/backdrop-studio/node_modules/playwright), the lab
// server on :8095 and the local site; see render.html. Review the PNGs, then copy them to the repo root.
const { chromium } = require("/Users/ggz/tennis-puzzle-prototypes/backdrop-studio/node_modules/playwright");
const fs = require("fs"), path = require("path");
(async () => {
  const outDir = process.argv[2] || ".", over = process.argv[3] || "{}";
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 600 }, deviceScaleFactor: 1 });
  p.on("pageerror", e => console.log("pageerror", String(e)));
  await p.goto("file://" + path.resolve(__dirname, "render.html"));
  await p.waitForFunction(() => window.DONE === true, null, { timeout: 120000 });
  const res = await p.evaluate(async (over) => {
    const vice = LAB.presets.filter(x => x.id === "team-nights-vice")[0].rc;
    const rc = LAB.recipe(Object.assign({}, vice, { motion: "none" }, JSON.parse(over)));
    const out = { masthead: (await LAB.image(rc, 300, 3)).url };
    const im = await LAB.image(rc, 600, 2), cd = im.canvas.getContext("2d").getImageData(1, 1, 1, 1).data;
    const og = document.createElement("canvas"); og.width = 1200; og.height = 630;
    const x = og.getContext("2d"); x.fillStyle = "rgb(" + cd[0] + "," + cd[1] + "," + cd[2] + ")"; x.fillRect(0, 0, 1200, 630);   // the stock as it printed
    const s = Math.min(1140 / im.w, 560 / im.h); x.imageSmoothingQuality = "high";
    x.drawImage(im.canvas, (1200 - im.w * s) / 2, (630 - im.h * s) / 2, im.w * s, im.h * s);
    out["og-image"] = og.toDataURL("image/png");
    return out;
  }, over);
  for (const k in res) { const f = path.join(outDir, k + ".png"); fs.writeFileSync(f, Buffer.from(res[k].split(",")[1], "base64")); console.log("saved", f); }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
