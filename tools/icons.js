/* ---------- TRUE 82 app icons (v57) ----------
   node tools/icons.js            writes icon.svg and docs/icons/*.svg, then rasterizes (with Playwright, if it is
                                  there) favicon.ico (16, 32, 48), apple-touch-icon.png (180), icon-192.png,
                                  icon-512.png and icon-mask.png (512, maskable) at the repo root.
   PLAYWRIGHT=<path to the playwright module> overrides where it is found.

   The owner (2026-09-26): the app icon must work at favicon scale, "more featuring of the ball and blockier
   emphasis lines ... follow best practices, it can deviate from the banner logo as long as it's in the spirit".
   So there are three drawings, not one icon shrunk:
     small   (16, 32, the SVG favicon): drawn on a 16px grid (32 units a pixel). A 12px ball, the two cross seams
             2px thick, the rim 2px across the ball's foot. Nothing thinner than a pixel, three inks.
     medium  (48): the side seams join, the rim gets its bright core.
     large   (180, 192, 512): the ball threaded through the hoop (the back arc behind it, the front arc in front),
             four blocky rays and the banner's star, a soft neon glow. Full bleed for the home screen (iOS and
             Android draw their own corners); a rounded tile for the manifest's "any"; the maskable one keeps
             everything inside the 80% safe circle.
   Inks come from the theme (tools/theme-core.js): the ground, the accent ball, the offset (second ink) hoop and
   rays, and a light core mixed from the offset. A new look re-run here re-inks the icons. */
const fs = require("fs"), path = require("path");
const T = require("./theme-core.js");
const REPO = path.resolve(__dirname, "..");
const R = T.build({});
const C = { ground: R.ground, ink: R.ground, ball: R.accent, hoop: R.offset, core: T.mix(R.offset, 32, R.light) };

const P = (x, y) => x.toFixed(1) + " " + y.toFixed(1);
// a basketball's seams around (0,0), radius r: n = 2 (the cross) or 4 (plus the side curves)
function seams(r, n, tilt, w) {
  const q = (x, y) => P(x * r, y * r);
  let d = `M${q(-0.07, -1)} C${q(0.17, -0.34)} ${q(-0.17, 0.34)} ${q(0.07, 1)} M${q(-1, 0.05)} C${q(-0.4, -0.13)} ${q(0.4, 0.19)} ${q(1, -0.03)}`;
  if (n > 2) d += ` M${q(-0.6, -0.82)} Q${q(-0.1, 0)} ${q(-0.6, 0.82)} M${q(0.6, -0.82)} Q${q(0.1, 0)} ${q(0.6, 0.82)}`;
  return `<g transform="rotate(${tilt})"><path d="${d}" fill="none" stroke="${C.ink}" stroke-width="${w}" stroke-linecap="round"/></g>`;
}
// blocky rays: wedges from r0 to r1 at the given angles (degrees, 0 = right, -90 = up)
function rays(cx, cy, r0, r1, list, width) {
  return list.map(deg => {
    const a = deg * Math.PI / 180, w = width * Math.PI / 180, pt = (r, t) => P(cx + Math.cos(t) * r, cy + Math.sin(t) * r);
    return `<path d="M${pt(r0, a - w * 0.55)} L${pt(r1, a - w)} L${pt(r1, a + w)} L${pt(r0, a + w * 0.55)} Z" fill="${C.hoop}"/>`;
  }).join("");
}
function star(cx, cy, r) {
  let d = "";
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.46 : r; d += (i ? "L" : "M") + P(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  return `<path d="${d}Z" fill="${C.hoop}"/>`;
}
const hoopBack = (cx, cy, rx, ry, w) => `<path d="M${P(cx - rx, cy)} A ${rx} ${ry} 0 0 1 ${P(cx + rx, cy)}" fill="none" stroke="${C.hoop}" stroke-width="${w}" stroke-linecap="round"/>`;
function hoopFront(cx, cy, rx, ry, w, core) {
  const d = `M${P(cx - rx, cy)} A ${rx} ${ry} 0 0 0 ${P(cx + rx, cy)}`;
  return `<path d="${d}" fill="none" stroke="${C.hoop}" stroke-width="${w}" stroke-linecap="round"/>` +
    (core ? `<path d="${d}" fill="none" stroke="${C.core}" stroke-width="${core}" stroke-linecap="round"/>` : "");
}
const svg = (body, defs) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs ? "<defs>" + defs + "</defs>" : ""}${body}</svg>\n`;
const GLOW = `<filter id="g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>`;
const small = (n, seamW, rimW, core) => svg(`<rect width="512" height="512" rx="96" fill="${C.ground}"/>` +
  `<circle cx="256" cy="224" r="192" fill="${C.ball}"/>` +
  `<g transform="translate(256 224)">${seams(192, n, -20, seamW)}</g>` + hoopFront(256, 368, 206, 64, rimW, core));
function large() {           // the large mark on a 512 square, centered on its ink
  const y = 26;
  return rays(256, 250 + y, 176, 240, [-152, -121, -59, -28], 11) + star(256, 62 + y, 38) +
    hoopBack(256, 352 + y, 206, 50, 36) +
    `<circle cx="256" cy="${250 + y}" r="164" fill="${C.ball}" opacity=".55" filter="url(#g)"/>` +
    `<circle cx="256" cy="${250 + y}" r="158" fill="${C.ball}"/>` +
    `<g transform="translate(256 ${250 + y})">${seams(158, 4, -20, 26)}</g>` +
    hoopFront(256, 352 + y, 206, 50, 36, 9);
}
const SVGS = {
  small: small(2, 58, 60, 0),
  medium: small(4, 40, 48, 12),
  large: svg(`<rect width="512" height="512" fill="${C.ground}"/>` + large(), GLOW),
  tile: svg(`<rect width="512" height="512" rx="112" fill="${C.ground}"/>` + large(), GLOW),
  maskable: svg(`<rect width="512" height="512" fill="${C.ground}"/><g transform="translate(256 256) scale(.78) translate(-256 -256)">` + large() + "</g>", GLOW)
};
fs.mkdirSync(path.join(REPO, "docs/icons"), { recursive: true });
Object.keys(SVGS).forEach(k => fs.writeFileSync(path.join(REPO, "docs/icons", k + ".svg"), SVGS[k]));
fs.writeFileSync(path.join(REPO, "icon.svg"), SVGS.small);   // the SVG favicon: the small drawing
console.log("wrote icon.svg and docs/icons/{" + Object.keys(SVGS).join(",") + "}.svg");

// ICO: a directory of PNG images (every browser since IE Vista reads PNG entries)
function ico(pngs) {
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let off = head.length;
  pngs.forEach((p, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(p.size >= 256 ? 0 : p.size, e); head.writeUInt8(p.size >= 256 ? 0 : p.size, e + 1);
    head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3); head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(p.buf.length, e + 8); head.writeUInt32LE(off, e + 12); off += p.buf.length;
  });
  return Buffer.concat([head].concat(pngs.map(p => p.buf)));
}
let pw = null;
try { pw = require(process.env.PLAYWRIGHT || "/Users/ggz/tennis-puzzle-prototypes/backdrop-studio/node_modules/playwright"); } catch (e) {}
if (!pw) { console.log("no Playwright here: the SVGs are written; rasterize them where it is (PLAYWRIGHT=<path>)"); process.exit(0); }
(async () => {
  const b = await pw.chromium.launch();
  const page = await b.newPage({ viewport: { width: 600, height: 600 }, deviceScaleFactor: 1 });
  async function png(name, size) {
    const src = "data:image/svg+xml;base64," + Buffer.from(SVGS[name]).toString("base64");
    await page.setContent(`<html><body style="margin:0;background:transparent"><img id="i" src="${src}" width="${size}" height="${size}" style="display:block"></body></html>`);
    await page.waitForFunction(() => document.getElementById("i").complete);
    return (await page.$("#i")).screenshot({ omitBackground: true });
  }
  const out = (f, buf) => { fs.writeFileSync(path.join(REPO, f), buf); console.log("wrote", f, buf.length + " bytes"); };
  out("favicon.ico", ico([{ size: 16, buf: await png("small", 16) }, { size: 32, buf: await png("small", 32) }, { size: 48, buf: await png("medium", 48) }]));
  out("apple-touch-icon.png", await png("large", 180));
  out("icon-192.png", await png("tile", 192));
  out("icon-512.png", await png("tile", 512));
  out("icon-mask.png", await png("maskable", 512));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
