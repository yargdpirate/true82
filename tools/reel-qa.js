/* TRUE 82: the reel's pixel check (v64.1). Since v64.1 a month strip redoes only the rect where a stamp is still moving;
   ?risofull=1 makes it redraw the whole strip every frame (the pre-v64.1 way). This drives a scripted two-month reel
   (wins, losses, a 10-game streak, a two-row month, three instant stamps) on a mocked clock and a hand-driven
   requestAnimationFrame, both ways, after a warm-up run (a fresh WebKit renders the L's first frames differently on its
   first run, whatever the code), and hashes every byte of every strip and fx canvas on all 630 frames.
     node tools/reel-qa.js                 Chromium
     ENGINE=webkit node tools/reel-qa.js   WebKit
   Needs the local site (a wrangler pages dev entry in .claude/launch.json, e.g. site-api3 on :8791; BASE overrides)
   and Playwright (the draft-chime.js copy; PLAYWRIGHT overrides). Exit 1 on any differing frame. */
"use strict";
const PWm = require(process.env.PLAYWRIGHT || "/Users/ggz/tennis-puzzle-prototypes/backdrop-studio/node_modules/playwright"); const engine = PWm[process.env.ENGINE || "chromium"];
const BASE = process.env.BASE || "http://localhost:8791/";
const SCRIPT = `async (old) => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  if (old) { (0, eval)(old); }
  let T = 100000; const realNow = performance.now.bind(performance);
  performance.now = () => T;
  let rafCb = null; window.requestAnimationFrame = (cb) => { rafCb = cb; return 1; }; window.cancelAnimationFrame = () => {};
  document.body.insertAdjacentHTML("beforeend", '<div id="ovX" class="reel-overlay" style="position:fixed;left:0;top:0;width:340px;height:640px;z-index:9999">' +
    '<div class="reel-card" style="position:relative;width:340px;height:640px"><div class="reel-head"><span class="reel-run" id="reelRun">0-0</span></div>' +
    '<div class="reel-row" id="mr0"><div class="reel-grid" style="width:320px"></div></div>' +
    '<div class="reel-row" id="mr1"><div class="reel-grid" style="width:320px"></div></div></div></div>');
  const ov = document.getElementById("ovX");
  const R = window.T82RISO.create(ov, {}, {});
  if (!R) return { err: "no reel" };
  await sleep(3000);                       // the L's plate (320ms + the face) is ready in every run before any loss
  const card = ov.querySelector(".reel-card");
  const hash = (c) => { const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let h = 2166136261 >>> 0; for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 16777619) >>> 0; } return h.toString(16) + ":" + c.width + "x" + c.height; };
  const frames = [];
  function frame(n) { for (let i = 0; i < n; i++) { T += 16.7; if (rafCb) { const f = rafCb; rafCb = null; f(T); } const strips = [...ov.querySelectorAll("canvas.riso-strip")].map(hash); const fx = ov.querySelector("canvas.riso-fx"); frames.push(strips.join(",") + "|" + (fx ? hash(fx) : "")); } }
  const rows = [document.getElementById("mr0"), document.getElementById("mr1")];
  // month 0: 15 games; month 1: 16 games (two rows at this width)
  const m0 = [1,1,1,0,1,1,1,1,0,0,1,1,1,1,1], m1 = [1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,1];
  let gi = 0, cw = 0, cl = 0, streak = 0, prev = 0, lossRun = 0;
  function play(row, mi, games, instantFrom) {
    R.openMonth(row, mi, games.length); frame(2);
    games.forEach((w, idx) => {
      if (w) { cw++; streak++; lossRun = 0; } else { cl++; prev = streak; streak = 0; lossRun++; }
      const info = { gi: gi, cw: cw, cl: cl, streak: w ? streak : 0, prevStreak: prev, lossRun: lossRun, pace: 0.6, city: "Boston", date: "Nov 3", instant: instantFrom != null && idx >= instantFrom };
      const hold = R.stamp(row, idx, !!w, info);
      gi++;
      frame(Math.max(4, Math.min(40, Math.round((hold || 150) / 16.7))));
    });
    R.closeMonth(row, mi, games.filter(Boolean).length, games.filter((x) => !x).length);
    frame(100);                              // everything settles (drips 1.27s, the L's hold)
  }
  play(rows[0], 0, m0);
  play(rows[1], 1, m1, 13);                  // the last three of month 1 stamped instant (the skip path)
  R.destroy();
  performance.now = realNow;
  return { frames: frames.length, list: frames };
}`;
(async () => {
  const b = await engine.launch();
  const runs = {};
  for (const [label, url, old] of [["warmup", BASE, null], ["full", BASE + "?risofull=1", null], ["dirty", BASE, null]]) {
    const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(url);
    await page.waitForFunction(() => !!window.T82RISO);
    await page.evaluate(() => document.fonts && document.fonts.ready);
    runs[label] = await page.evaluate(eval(SCRIPT), old);
    await ctx.close();
  }
  await b.close();
  const A = runs.full.list, B = runs.dirty.list;
  const diff = A.map((x, k) => (x !== B[k] ? k : -1)).filter((k) => k >= 0);
  console.log(JSON.stringify({ engine: process.env.ENGINE || "chromium", frames: A.length + "/" + B.length, differing: diff.length, first: diff[0] === undefined ? -1 : diff[0] }));
  process.exit(diff.length || A.length !== B.length || A.length < 600 ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
