/* TRUE 82: render THE REDRAFTED's draft-night sound (app.js sdShowSound, v58) to a WAV, to hear it without
   playing a draft. It runs the exact functions from app.js in headless Chromium's OfflineAudioContext.
     node tools/draft-chime.js out.wav [double]
   Needs Playwright (PLAYWRIGHT=<path to its package>; defaults to the tennis project's copy). */
const fs = require("fs"), path = require("path");
const PW = process.env.PLAYWRIGHT || "/Users/ggz/tennis-puzzle-prototypes/backdrop-studio/node_modules/playwright";
const { chromium } = require(PW);
const out = process.argv[2] || "draft-chime.wav", double = process.argv[3] === "double";
const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
function grab(name) {                       // one top-level function's source, by brace matching
  const a = app.indexOf("function " + name + "(");
  if (a < 0) throw new Error("no " + name);
  let i = app.indexOf("{", a), depth = 0;
  for (; i < app.length; i++) { if (app[i] === "{") depth++; else if (app[i] === "}" && --depth === 0) break; }
  return app.slice(a, i + 1);
}
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const b64 = await page.evaluate(async ({ src, double }) => {
    eval(src + "; window.sdNoise = sdNoise; window.sdShowSound = sdShowSound;");
    const T = double ? { hit: 0.96, fly: 1.98, end: 2.4 } : { hit: 0.6, fly: 1.56, end: 1.96 };
    const rate = 44100, ctx = new OfflineAudioContext(1, Math.ceil(rate * (T.end + 1.4)), rate);
    window.sdShowSound(T.hit, T.fly, T.end, ctx);
    const buf = await ctx.startRendering(), d = buf.getChannelData(0);
    let peak = 0; for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
    const n = d.length, bytes = new Uint8Array(44 + n * 2), v = new DataView(bytes.buffer);
    const str = (o, s) => { for (let k = 0; k < s.length; k++) v.setUint8(o + k, s.charCodeAt(k)); };
    str(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); str(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, "data"); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 32767, true);
    let s = ""; for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
    return JSON.stringify({ wav: btoa(s), peak: peak, secs: n / rate });
  }, { src: grab("sdNoise") + "\n" + grab("sdShowSound"), double });
  await browser.close();
  const r = JSON.parse(b64);
  fs.writeFileSync(out, Buffer.from(r.wav, "base64"));
  console.log("wrote " + out + " (" + r.secs.toFixed(2) + "s, peak " + r.peak.toFixed(2) + ")");
})().catch((e) => { console.error(e); process.exit(1); });
