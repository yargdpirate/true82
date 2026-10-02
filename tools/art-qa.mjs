#!/usr/bin/env node
/* TRUE 82 art QA (v67): renders and measures any art variant (art/CONTRACT.md) in one command, so an author sees the
   work at phone size and checks it against the contract's budgets before anyone else looks.

     node tools/art-qa.mjs loss <id>        the loss moment in three moments, frames cropped to the card at fixed times;
                                            its frame, prep and canvas costs at 4x throttle against classic's
     node tools/art-qa.mjs dots <id>        a settled 70-12 ledger (T82RISO.strip beside the live reel: they must match),
                                            a win and a loss mid-stamp at 4x size; moving and settled costs vs classic
     node tools/art-qa.mjs scene <id>       banners for 82-0, 64-18, 41-41, 20-62 in each of its lights, the 64-18
                                            poster, the reveal; bake and reveal costs against lake's in the same light
     node tools/art-qa.mjs all [kind]       every variant (art-index.js, plus files not indexed yet), the built-ins too,
                                            an index.html of every sheet and number, and rows of all of them side by side
     node tools/art-qa.mjs baseline         the built-ins alone (classic, classic, lake): the reference numbers
     node tools/art-qa.mjs hot|perk|goat <id>   an FX pack (art/CONTRACT-FX.md) on the game's own screens: every slot's
                                            frames, its frame and prep costs at 4x against the absolute budgets;
                                            <id> classic for the built-in, all for every pack of the kind side by side
     node tools/art-qa.mjs finish loss      when each loss look's moment is over: the last frame with any of its ink on
                                            the card (hero, veil, caption, sprays) in the mid moment (1.05 s hold) and
                                            the first loss after a streak (1.70 s), the owner's speed dial applied (and
                                            today's pace beside each dialed look); a table, quickest first
   Options:
     --out DIR       where it all lands (default <tmp>/t82-art-qa/<mode>[-<id>]): report.json, index.html, the PNGs
     --webkit        also run each variant in WebKit, unthrottled: console errors and fallbacks (Safari-only breakage)
     --throttle N    the CPU slowdown for the timing passes (default 4: a stand-in well below an iPhone SE)
     --reps N        timing repetitions, each on a fresh page (default 2)
     --quick         pictures only, no timing pass
     --root DIR      serve the engines and art from another checkout (the bench page still comes from this repo):
                     the live code's classic, say, for a regression check (engines without the hooks get a stand-in)
     --port N        the static server's port (default: a free one)
     --timeout S     seconds one picture step may take before the variant is dropped as hung (default 90; timing x3)
     --no-tempo      finish: every look at its own pace (the dial off), for the record of today's pace
   Exit 1 when a variant fails a budget or a check (never for baseline). Needs Playwright 1.6x with Chromium (WebKit
   for --webkit); PLAYWRIGHT overrides its path. It drives docs/art-lab/qa.html (window.T82QA).

   What it checks beside the budgets: the variant registered and actually printed (onUse named it, the engine had it
   playing, it was not switched off for throwing; a scene printed itself, not the lake); no console errors and no
   engine warnings (the engines warn when they retire a variant that threw); a dot set's live ledger matches strip()
   pixel for pixel (ink outside its declared reach leaves stale dots behind); a hang drops the variant, not the run.

   How it measures: the budgets are ratios to the built-in, measured the same way in the same run. Pictures run
   unthrottled on the bench clock (opts.clock and opts.manual), so a frame at e = 0.35 s is the same frame every run.
   Timing runs on a fresh page per repetition, CPU throttled through CDP, every look warmed once, the built-in measured
   before and after the variants and pooled ("noise" is how far its two runs differ). A frame's ms is one frame() plus
   finishing its pixels (T82QA reads one pixel from each canvas: Chromium otherwise defers the drawing and pays for
   several frames at once). A loss moment's "alone" figure is its frame less a floor moment that draws nothing. A prep
   job's ms is its median over every reel that ran it. Contract numbers: KB = 1024 bytes, MB = 1024 KB. */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import os from "os";
import http from "http";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const PW = require(process.env.PLAYWRIGHT || "/Users/ggz/tennis-puzzle-prototypes/backdrop-studio/node_modules/playwright");
const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const KINDS = ["loss", "dots", "scene"];
const BUILTIN = { loss: "classic", dots: "classic", scene: "lake" };
const KB = 1024, MB = 1024 * 1024;
// art/CONTRACT.md, the laws, 6 (Budgets)
const BUDGET = {
  // jobMax: each prep job against classic's longest (iPhones have no requestIdleCallback: a job runs on a 16 ms timer
  // between the reel's frames, so it must fit beside one)
  loss: { frameAvg: 1.5, frameP95: 2, jobMax: 1.5, prepTotal: 1.5, canvasBytes: 12 * MB, fileBytes: 10 * KB },
  dots: { frame: 1.5, settled: 1.5, fileBytes: 6 * KB },
  scene: { bake: 1.25, reveal: 1.25, fileBytes: 16 * KB },
  perfect: { bake: 1.5, reveal: 1.25, fileBytes: 20 * KB }        // art/CONTRACT-FX.md: a perfect scene prints 82-0 only
};
// the loss moment's fixed times (seconds after the slam); each case adds its last frame and one just after it ends
const LOSS_TIMES = [0, 0.05, 0.1, 0.18, 0.25, 0.35, 0.5, 0.7, 0.9, 1.1, 1.3];
const LOSS_CASES = ["streak", "mid", "late"];
// the read check's frame: e = 0.25 s, or in a moment too short for that (late: 0.29 s, the game's fastest heavy loss)
// its last frame at full ink, before K.fade's 0.2 s fade-out starts
const readTime = (dur) => Math.min(0.25, Math.max(0.07, Math.round((dur - 0.2) * 100) / 100));
const WIN_TIMES = [0, 0.03, 0.06, 0.1, 0.15, 0.24];
const DROP_TIMES = [0, 0.05, 0.1, 0.2, 0.35, 0.6, 1.0, 1.5];
const REVEAL_TIMES = [0.1, 0.4, 0.8, 1.3, 1.8, 2.3, 2.8, 3.4];
const LEDGER_WIN = 9, LEDGER_LOSS = 10;          // the 10th straight win and the loss that ends it (T82QA.LEDGER)
const ENGINE_WARN = /\[t82\]|T82(PRINT|RISO|ART)\b/;           // how the engines and art-core word their warnings
let T_RENDER = 90000, T_TIME = 270000;            // ms a page may take to answer one step before the variant is dropped

/* ---------- the command line ---------- */
const opt = { out: null, webkit: false, throttle: 4, reps: 2, quick: false, port: 0, root: REPO };
const pos = [];
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === "--out") opt.out = path.resolve(process.argv[++i]);
  else if (a === "--webkit") opt.webkit = true;
  else if (a === "--throttle") opt.throttle = Math.max(1, +process.argv[++i] || 1);
  else if (a === "--reps") opt.reps = Math.max(1, Math.round(+process.argv[++i] || 1));
  else if (a === "--quick") opt.quick = true;
  else if (a === "--port") opt.port = +process.argv[++i] || 0;
  else if (a === "--root") opt.root = path.resolve(process.argv[++i]);
  else if (a === "--timeout") { T_RENDER = Math.max(5, +process.argv[++i] || 90) * 1000; T_TIME = T_RENDER * 3; }
  else if (a === "--no-tempo") opt.noTempo = true;
  else if (a === "-h" || a === "--help") usage(0);
  else pos.push(a);
}
function usage(code) {
  const src = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
  console.log(src.slice(src.indexOf("/*") + 2, src.indexOf("*/")).split("\n").slice(0, 32).join("\n"));
  process.exit(code);
}
const MODE = pos[0];
if (!MODE || !["loss", "dots", "scene", "all", "baseline", "hot", "perk", "goat", "finish"].includes(MODE)) usage(2);
if (MODE === "finish" && pos[1] !== "loss") { console.error("art-qa: finish measures the loss looks: node tools/art-qa.mjs finish loss"); process.exit(2); }
if (["hot", "perk", "goat"].includes(MODE) && !/^[a-z0-9-]+$/.test(pos[1] || "")) { console.error("art-qa: " + MODE + " needs a pack id ([a-z0-9-]+), classic or all"); process.exit(2); }
if (KINDS.includes(MODE) && !/^[a-z0-9-]+$/.test(pos[1] || "")) { console.error("art-qa: " + MODE + " needs a variant id ([a-z0-9-]+)"); process.exit(2); }
if (MODE === "all" && pos[1] && !KINDS.includes(pos[1])) { console.error("art-qa: all takes a kind: loss, dots or scene"); process.exit(2); }
const OUT = opt.out || path.join(os.tmpdir(), "t82-art-qa", MODE + (pos[1] ? "-" + pos[1] : ""));
fs.mkdirSync(OUT, { recursive: true });

/* ---------- small things ---------- */
const sum = (a) => a.reduce((x, y) => x + y, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);
const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.round(p * (s.length - 1)))]; };
const r2 = (v) => (v == null || !isFinite(v) ? null : Math.round(v * 100) / 100);
const fmtMs = (v) => (v == null ? "n/a" : v.toFixed(v < 10 ? 2 : 1) + " ms");
const fmtX = (v) => (v == null ? "n/a" : v.toFixed(2) + "x");
const fmtB = (v) => (v == null ? "n/a" : v >= MB ? (v / MB).toFixed(1) + " MB" : (v / KB).toFixed(1) + " KB");
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const dataURL = (buf, type) => "data:" + (type || "image/png") + ";base64," + Buffer.from(buf).toString("base64");
const fromDataURL = (u) => Buffer.from(u.slice(u.indexOf(",") + 1), "base64");
function stats(a) { return { n: a.length, avg: r2(mean(a)), p95: r2(pct(a, 0.95)), max: r2(a.length ? Math.max(...a) : 0) }; }
function fileOf(kind, id) { const f = path.join(opt.root, "art", kind, id + ".js"); return fs.existsSync(f) ? f : null; }
function log(s) { process.stdout.write(s + "\n"); }

/* ---------- the static server: the bench page from this repo, everything else from --root ---------- */
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".jpg": "image/jpeg", ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8" };
function serve(root, port) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      let p;
      try { p = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch (e) { res.writeHead(400); res.end(); return; }
      if (p.endsWith("/")) p += "index.html";
      const base = p.startsWith("/docs/art-lab/") ? REPO : root, f = path.join(base, path.normalize(p));
      if (!f.startsWith(base + path.sep)) { res.writeHead(403); res.end(); return; }
      fs.readFile(f, (err, data) => {
        if (err) { res.writeHead(404, { "Content-Type": "text/plain" }); res.end("not found"); return; }
        res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" });
        res.end(data);
      });
    });
    srv.on("error", reject);
    srv.listen(port || 0, "127.0.0.1", () => resolve({ port: srv.address().port, close: () => new Promise((r) => { srv.close(r); if (srv.closeAllConnections) srv.closeAllConnections(); }) }));
  });
}

/* ---------- the live engines, before the art hooks: a stand-in so the harness still runs (and can measure the live
   code's classic for a regression check). They read performance.now and requestAnimationFrame, so the shim points both
   at the bench clock and hands frame() the captured callback. Prep is the old idle chain (no runJob): it waits it out.
   Only ever injected when the probe finds no hooks. ---------- */
function legacyShims(need) {
  var Q = window.T82QA, BUILTINS = { loss: { classic: { name: "Classic L", builtin: true } }, dots: { classic: { name: "Classic", builtin: true } },
    scene: { lake: { name: "Lake", builtin: true, lights: ["golden", "dusk", "night"] } } };
  if (need.art) {
    var reg = { loss: {}, dots: {}, scene: {} }, idx = [];
    window.T82ART = { __shim: true,
      add: function (k, id, d) { reg[k][id] = d; }, get: function (k, id) { return reg[k] && reg[k][id] || null; },
      index: function (l) { idx = l || []; }, catalog: function (k) { return idx.filter(function (e) { return e.kind === k; }); },
      load: function (k, ids) { return Promise.resolve(ids.filter(function (id) { return !!reg[k][id]; })); },
      deal: function () { return []; }, used: function () {}, forced: function () { return null; } };
    Object.keys(BUILTINS).forEach(function (k) { Object.keys(BUILTINS[k]).forEach(function (id) { reg[k][id] = BUILTINS[k][id]; }); });
  }
  function onClock(clockFn) {
    var cb = { f: null };
    performance.now = function () { return clockFn() * 1000; };
    window.requestAnimationFrame = function (f) { cb.f = f; return 1; };
    window.cancelAnimationFrame = function () { cb.f = null; };
    return function () { var f = cb.f; cb.f = null; if (f) f(clockFn() * 1000); };
  }
  if (need.reel) {
    var create = window.T82RISO.create;
    window.T82RISO.create = function (ov, season, opts) {
      if (!opts || !opts.clock) return create(ov, season, opts);
      var frame = onClock(opts.clock), R = create(ov, season, opts), born = Q.now();
      if (!R) return R;
      R.frame = frame;
      R.qa = { runJob: function () { return false; }, state: function () { return { prepped: Q.now() - born > 1500, pending: 0, canvasBytes: 0 }; } };
      var stamp = R.stamp, first = true;
      R.stamp = function (row, idx, win, info) {
        if (first && opts.onUse) opts.onUse("dots", "classic");   // as the engine does: once, at the season's first stamp
        first = false;
        var h = stamp.apply(R, arguments);
        if (!win && !info.instant && info.cl <= 14 && opts.onUse) opts.onUse("loss", "classic");
        return h;
      };
      return R;
    };
  }
  if (need.print) {
    var mount = window.T82PRINT.mount;
    window.T82PRINT.mount = function (host, spec, opts) {
      if (!opts || !opts.clock) return mount(host, spec, opts);
      var frame = onClock(opts.clock), M = mount(host, spec, opts);
      if (M) M.frame = frame;
      return M;
    };
  }
}

/* ---------- the in-page routines (they run inside docs/art-lab/qa.html, on window.T82QA) ---------- */
// a loss moment for the pictures: prep, the games before it settled, then the slam; frames follow with stepTo
async function pgLossStart({ id, kase }) {
  const Q = window.T82QA, C = Q.CASES[kase];
  const h = Q.reel({ games: C.games, loss: [id], dots: Q.BUILTIN.dots, pace: C.pace, hold: true });
  window.__qa = h;
  const pr = await Q.prep(h);
  h.instantTo(C.gi); h.frame();
  Q.anims.finish();                                   // the months' fade-ins are over by the time a loss lands
  const rect = h.rect(), s = h.stamp(false);
  window.__qaT0 = s.t0;
  return { rect, hold: s.hold, jobs: pr.jobs.length, info: s.info, uses: h.uses.slice() };
}
// move the bench to e seconds after the stamp, on the 60 fps grid, and draw a frame exactly at e
function pgStepTo(e) {
  const Q = window.T82QA, h = window.__qa, t = window.__qaT0 + e, fr = h.until(t);
  const last = fr.length ? fr[fr.length - 1].t : h.__last;
  if (last == null || Math.abs(last - t) > 1e-9) { Q.clock.t = t; h.frame(); }
  h.__last = t;
  Q.anims.scrub();
  const st = h.R.qa ? h.R.qa.state() || {} : {};
  return { uses: h.uses.slice(), playing: st.playing || null, off: st.off || [] };
}
// a loss moment for the clock: prep (each job timed), the games before it, the slam, every frame of the moment timed
async function pgLossTime({ id, kase }) {
  const Q = window.T82QA, C = Q.CASES[kase];
  const h = Q.reel({ games: C.games, loss: [id], dots: Q.BUILTIN.dots, pace: C.pace, hold: true });   // jolts on the bench clock
  const pr = await Q.prep(h);
  h.instantTo(C.gi); h.frame(); h.frame();
  const st = () => (h.R.qa ? h.R.qa.state() || {} : {});
  let peak = Math.max(pr.peak || 0, st().canvasBytes || 0);
  const s = h.stamp(false), end = s.t0 + s.hold / 1000 + 0.1, frames = [];
  while (Q.clock.t < end - 1e-9) {
    h.until(Math.min(end, Q.clock.t + 1 / 60)).forEach((f) => frames.push(f.ms));
    peak = Math.max(peak, st().canvasBytes || 0);
  }
  const after = st().canvasBytes || 0, off = st().off || [];
  h.destroy();
  return { jobs: pr.jobs, stampMs: s.ms, hold: s.hold, frames, peak, after, off, uses: h.uses.slice() };
}
// When a loss moment is over (the finish mode): the moment played on the bench clock at 60 fps from its slam to the end
// of its hold, and after every frame the card's effects canvas (the veil, the rings and sprays, the hero, the caption:
// everything the moment prints) is read for ink; the last frame with any is its finish. The sprays move frame by frame
// (their state carries over), so the scan runs forward, and a frame's read stops at its first inked pixel: only the
// clean frames after the finish are read whole. tempo: false plays the look at its own pace (the dial off). hero: the
// look's own picture alone (a bench copy of it with no veil, no caption and no slam; the dial still applies), which
// tells a look that has left the card from one still holding its last pose into the hold's closing fade; that pass also
// finds when the picture stops moving (still: the last frame that differs from the one before it, read on a sampled
// grid of pixels, before the classic closing fade, K.fade's last 0.2 s, starts on the look's own clock).
async function pgFinish({ id, kase, tempo, hero }) {
  const Q = window.T82QA, C = Q.CASES[kase], A = window.T82ART, tempo0 = A && A.tempo, look = id;
  if (hero) {
    const def = A.get("loss", look), copy = {}, alias = "qa-hero-" + look;
    for (const k in def) copy[k] = def[k];
    copy.veil = false; copy.caption = false; copy.hit = function () {};
    A.add("loss", alias, copy);
    if (tempo0) A.tempo = function (k, i) { return tempo0.call(A, k, i === alias ? look : i); };   // the copy keeps the look's dial
    id = alias;
  }
  const h = Q.reel({ games: C.games, loss: [id], dots: Q.BUILTIN.dots, pace: C.pace, hold: true, tempo });
  try {
    await Q.prep(h);
    h.instantTo(C.gi); h.frame();
    Q.anims.finish();
    const fxc = h.card.querySelector("canvas.riso-fx"), s = h.stamp(false), dur = s.hold / 1000;
    let last = -1, dial = null, seen = false, still = 0, prev = null, fade = dur - 0.2;
    for (let k = 0; k / 60 < dur + 1e-9; k++) {
      Q.clock.t = s.t0 + k / 60;
      h.frame();
      const st = h.R.qa ? h.R.qa.state() || {} : {};
      if (st.playing && st.playing.indexOf(id) >= 0) seen = true;
      if (st.tempo && st.tempo.length && !dial) {
        dial = st.tempo[0];
        const a = dial.at * dur;                      // the closing fade on the real clock: e' = dur - 0.2 under the dial
        if (fade > a) fade = a + (fade - a) / dial.x;
      }
      if (!fxc || !fxc.width) continue;
      const px = new Uint32Array(fxc.getContext("2d").getImageData(0, 0, fxc.width, fxc.height).data.buffer);
      if (hero && k / 60 < fade - 1e-9) {             // a sampled print of the frame (every 4th pixel of every 4th row)
        let hsh = 2166136261 >>> 0;
        for (let y = 0; y < fxc.height; y += 4) for (let x = 0, i = y * fxc.width; x < fxc.width; x += 4, i += 4) hsh = Math.imul(hsh ^ px[i], 16777619) >>> 0;
        if (prev !== null && hsh !== prev) still = k / 60;
        prev = hsh;
      }
      for (let i = 0; i < px.length; i++) if (px[i] !== 0) { last = k / 60; break; }
    }
    const off = h.R.qa ? (h.R.qa.state() || {}).off || [] : [];
    return { dur, last, still, dial, played: seen || id === Q.BUILTIN.loss, off, uses: h.uses.slice() };
  } finally { h.destroy(); if (tempo0) A.tempo = tempo0; }
}
// the ledger, played live to the end and settled; each month's live strip against the same month reprinted by strip()
async function pgLedger({ id, live }) {
  const Q = window.T82QA;
  const h = Q.reel({ games: Q.LEDGER, loss: [Q.BUILTIN.loss], dots: id, pace: 1, live, hold: true });
  window.__qa = h;
  await Q.prep(h);
  h.play(Q.LEDGER.length);
  h.until(Q.clock.t + 2.5);
  Q.anims.finish();
  const cs = getComputedStyle(document.documentElement);
  const months = [...h.acts.querySelectorAll(".reel-act")].map((row, mi) => {
    const c = row.querySelector("canvas.riso-strip"), gw = row.querySelector(".reel-grid").clientWidth;   // layout()'s width
    if (!c) return { mi, error: "no strip canvas" };
    let re = null, err = null, diff = null;
    try {
      re = window.T82RISO.strip({ games: c.getAttribute("data-games"), streaks: (c.getAttribute("data-streaks") || "").split(",").map(Number),
        gi0: +c.getAttribute("data-gi0"), cl0: +c.getAttribute("data-cl0"), mi, cssW: gw, d: 2, dots: id });
    } catch (e) { err = String(e && e.message || e); }
    if (re && re.width === c.width && re.height === c.height) {
      const a = c.getContext("2d").getImageData(0, 0, c.width, c.height).data, b = re.getContext("2d").getImageData(0, 0, re.width, re.height).data;
      diff = 0;
      for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) diff++;
    }
    return { mi, w: c.width, h: c.height, cssW: c.getBoundingClientRect().width, strip: re ? re.toDataURL("image/png") : null,
      stripSize: re ? re.width + "x" + re.height : null, diff, error: err };
  });
  const off = h.R.qa ? (h.R.qa.state() || {}).off || [] : [];
  return { months, uses: h.uses.slice(), off, paper: cs.getPropertyValue("--t-print-paper").trim(), blend: cs.getPropertyValue("--t-print-blend").trim() || "screen" };
}
// scroll one month of the settled ledger into the card and give its rect (the screenshot is the live DOM)
function pgMonthRect(mi) {
  const row = window.__qa.acts.querySelectorAll(".reel-act")[mi];
  row.scrollIntoView({ block: "nearest" });
  const r = row.getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height };
}
// one stamp mid-flight: the ledger settled up to gi, then gi stamped live (losses light: no loss moment over it)
async function pgStampStart({ id, live, gi }) {
  const Q = window.T82QA;
  if (window.__qa) window.__qa.destroy();
  const h = Q.reel({ games: Q.LEDGER, loss: [Q.BUILTIN.loss], dots: id, pace: 1, clOffset: 14, live, hold: true });
  window.__qa = h;
  h.instantTo(gi); h.frame();
  Q.anims.finish();
  const s = h.stamp(false);
  window.__qaT0 = s.t0;
  return { cell: h.cell(gi), win: s.win };
}
// the moving ledger and the settled print, timed
async function pgDotsTime({ id, live }) {
  const Q = window.T82QA;
  const h = Q.reel({ games: Q.LEDGER, loss: [Q.BUILTIN.loss], dots: id, pace: 1, clOffset: 14, live, hold: true });
  await Q.prep(h);
  const frames = h.play(Q.LEDGER.length).concat(h.until(Q.clock.t + 1.6));
  const rows = [...h.acts.querySelectorAll("canvas.riso-strip")].map((c, mi) => ({ games: c.getAttribute("data-games"),
    streaks: (c.getAttribute("data-streaks") || "").split(",").map(Number), gi0: +c.getAttribute("data-gi0"), cl0: +c.getAttribute("data-cl0"), mi,
    cssW: c.parentNode.clientWidth }));
  const uses = h.uses.slice();
  h.destroy();
  const settled = [];
  for (let k = 0; k < 3; k++) {
    const t = Q.now();
    rows.forEach((r) => window.T82RISO.strip({ games: r.games, streaks: r.streaks, gi0: r.gi0, cl0: r.cl0, mi: r.mi, cssW: r.cssW, d: 2, dots: id }));
    settled.push(Q.now() - t);
  }
  return { busy: frames.filter((f) => f.busy).map((f) => f.ms), all: frames.length, settled, uses };
}
// every banner the scene prints, as the page shows it, and which scene printed each (a scene that throws prints the
// lake); an engine that does not say is checked against lake's print of the same season instead
async function pgBanners({ id, lights, records }) {
  const Q = window.T82QA, out = [];
  for (const w of records || Q.RECORDS) for (const pal of lights) {
    const spec = Q.printSpec(Q.record(w), { scene: id, pal }), t = Q.now(), b = Q.banner(spec), c = b.canvas;
    out.push({ w, pal, ms: Q.now() - t, scene: b.scene, url: c.toDataURL("image/png"), size: c.width + "x" + c.height });
  }
  let sameAsLake = null;
  if (out[0].scene) sameAsLake = id !== Q.BUILTIN.scene && out.some((x) => x.scene !== id);
  else if (id !== Q.BUILTIN.scene) {
    const g = Q.record((records || Q.RECORDS)[0] === 82 ? 82 : 64), a = window.T82PRINT.print(Q.printSpec(g, { scene: id, pal: lights[0] }), { width: 750, dpr: 2 }).print;
    const b = window.T82PRINT.print(Q.printSpec(g, { scene: Q.BUILTIN.scene, pal: lights[0] }), { width: 750, dpr: 2 }).print;
    const A = a.getContext("2d").getImageData(0, 0, a.width, a.height).data, B = b.getContext("2d").getImageData(0, 0, b.width, b.height).data;
    let d = 0;
    if (A.length === B.length) for (let i = 0; i < A.length; i += 4) if (A[i] !== B[i] || A[i + 1] !== B[i + 1] || A[i + 2] !== B[i + 2]) d++;
    sameAsLake = A.length === B.length && d === 0;
  }
  return { banners: out, sameAsLake };
}
async function pgPoster({ id, pal, w }) {
  const Q = window.T82QA;
  return Q.poster(Q.printSpec(Q.record(w || 64), { scene: id, pal }));
}
// the banner mounted on the page, deferred, then played on the bench clock (frames follow with pgRevealTo)
async function pgRevealStart({ id, pal, w }) {
  const Q = window.T82QA;
  const m = Q.mountPrint(Q.printSpec(Q.record(w || 64), { scene: id, pal }), {});
  window.__qp = m;
  await new Promise((r) => setTimeout(r, 120));      // the engine rebuilds once its faces land
  m.M.play();
  window.__qpT0 = Q.clock.t;
  m.frame();
  return m.rect();
}
function pgRevealTo(e) {
  const m = window.__qp, t = window.__qpT0 + e;
  m.until(t);
  if (Math.abs(window.T82QA.clock.t - t) > 1e-9) { window.T82QA.clock.t = t; m.frame(); }
  window.T82QA.clock.t = t;
  return true;
}
// a perfect scene's live motion (art/CONTRACT-FX.md): the mounted print on the bench clock to e seconds after play(),
// every 60 fps frame drawn; on = what frame() said last (true while the reveal or the live motion still runs); a
// checksum of the print's pixels, so the harness can tell motion from a still
function pgLiveTo(e) {
  const Q = window.T82QA, m = window.__qp, t = window.__qpT0 + e;
  let on = null;
  while (Q.clock.t < t - 1e-9) { Q.clock.t = Math.min(t, Q.clock.t + 1 / 60); on = m.M.frame(); }
  let sum = 0;
  m.host.querySelectorAll("canvas").forEach((c) => {
    if (!c.width || !c.height) return;
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    for (let i = 0; i < d.length; i += 4) sum = (sum * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13 + d[i + 3]) >>> 0;
  });
  return { on, sum };
}
async function pgSceneTime({ id, pal, records, live }) {
  const Q = window.T82QA, bake = [], printed = [];
  for (const w of records || Q.RECORDS) {
    const spec = Q.printSpec(Q.record(w), { scene: id, pal }), t = Q.now();
    const out = window.T82PRINT.print(spec, { width: 750, dpr: 2 });
    bake.push(Q.now() - t);
    if (out.scene) printed.push(out.scene);
  }
  const m = Q.mountPrint(Q.printSpec(Q.record((records || Q.RECORDS).length === 1 ? records[0] : 64), { scene: id, pal }), {});
  await new Promise((r) => setTimeout(r, 120));
  m.M.play();
  const frames = m.until(Q.clock.t + 3.4).map((f) => f.ms);
  const liveFrames = live ? m.until(Q.clock.t + live).map((f) => f.ms) : [];   // a perfect scene's few seconds of motion
  const mountMs = m.mountMs;
  if (m.M.scene) printed.push(m.M.scene);
  m.destroy();
  return { bake, frames, liveFrames, mountMs, printed };
}

/* ---------- the browser ---------- */
let BASE = "", SHIM = null, browser = null, ctx = null, small = null;
// the 320 px phone (an iPhone SE of the first kind): one context, made when first needed, on the same engine as ctx
function ctxSmall() { return small || (small = ctx.browser().newContext({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2 })); }
const OPEN = new Set();                            // the bench pages open now (a variant that hangs leaves its own behind)
async function closeOpen() { for (const p of [...OPEN]) await p.close().catch(() => {}); }
async function bench(c, o) {
  o = o || {};
  const page = await c.newPage(), note = { errors: [], warnings: [] };
  OPEN.add(page); page.on("close", () => OPEN.delete(page));
  page.on("console", (m) => {
    const t = m.type(), s = m.text();
    if (SHIM && SHIM.art && /Failed to load resource.*404/.test(s)) return;    // art-core.js and art-index.js are not there yet
    if (/Canvas2D: Multiple readback operations/.test(s)) return;                // the bench's own one-pixel reads (T82QA settle)
    if (t === "error") note.errors.push(s); else if (t === "warning") note.warnings.push(s);
  });
  page.on("pageerror", (e) => note.errors.push(String(e && (e.stack || e.message) || e).split("\n").slice(0, 3).join(" | ")));
  await page.goto(BASE + "docs/art-lab/qa.html");
  await page.waitForFunction(() => window.T82QA, null, { timeout: 15000 });
  await page.evaluate(() => window.T82QA.ready);
  if (SHIM && (SHIM.art || SHIM.reel || SHIM.print)) await page.evaluate(legacyShims, SHIM);
  if (o.throttle > 1 && o.cdp !== false) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: o.throttle });
  }
  page.__note = note;
  return page;
}
function takeNotes(page) { const n = page.__note, out = { errors: n.errors.slice(), warnings: n.warnings.slice() }; n.errors.length = 0; n.warnings.length = 0; return out; }
async function loadVariant(page, kind, id) {
  const f = fileOf(kind, id);
  return page.evaluate(({ kind, id, file }) => window.T82QA.load(kind, id, file), { kind, id, file: f ? "/art/" + kind + "/" + id + ".js" : null });
}
async function shot(page, r, pad) {
  pad = pad || 0;
  const vp = page.viewportSize(), x = Math.max(0, r.x - pad), y = Math.max(0, r.y - pad);
  const clip = { x, y, width: Math.min(vp.width - x, r.width + pad * 2), height: Math.min(vp.height - y, r.height + pad * 2) };
  return page.screenshot({ clip, animations: "allow", caret: "hide" });
}

/* ---------- contact sheets: laid out on the bench page itself, so they wear the site's faces and tokens ---------- */
let sheetCtx = {};
async function sheet(file, o) {
  const dsf = o.dsf || 1;
  if (!sheetCtx[dsf]) sheetCtx[dsf] = await browser.newContext({ viewport: { width: 400, height: 400 }, deviceScaleFactor: dsf });
  const page = await sheetCtx[dsf].newPage();
  await page.goto(BASE + "docs/art-lab/qa.html");
  await page.evaluate(() => window.T82QA.ready);
  const cell = (c) => '<figure class="s-cell"><figcaption class="s-lab">' + esc(c.label) + (c.sub ? ' <span class="s-sub">' + esc(c.sub) + "</span>" : "") + "</figcaption>" +
    '<div class="s-img"' + (c.paper ? ' style="background:' + esc(c.paper) + '"' : "") + ">" +
    '<img src="' + c.src + '" style="width:' + c.w + "px;" + (c.h ? "height:" + c.h + "px;" : "") + (c.pixelated ? "image-rendering:pixelated;" : "") +
    (c.blend ? "mix-blend-mode:" + esc(c.blend) + ";" : "") + '"></div></figure>';
  const html = '<div class="s-sheet"><h1 class="s-title">' + esc(o.title) + "</h1>" + (o.sub ? '<p class="s-note">' + esc(o.sub) + "</p>" : "") +
    o.sections.map((s) => (s.title ? '<h2 class="s-h2">' + esc(s.title) + "</h2>" : "") + (s.note ? '<p class="s-note">' + esc(s.note) + "</p>" : "") +
      '<div class="s-grid" style="grid-template-columns:repeat(' + s.cols + ', auto)">' + s.cells.map(cell).join("") + "</div>").join("") + "</div>";
  await page.evaluate((html) => {
    document.body.innerHTML = html;
    const st = document.createElement("style");
    st.textContent = ".s-sheet { padding: 14px; display: inline-block; background: var(--t-ground); color: var(--t-text); }" +
      ".s-title { font-family: var(--t-disp); font-weight: 700; font-size: 34px; letter-spacing: 0.04em; margin: 0 0 2px; text-transform: uppercase; }" +
      ".s-h2 { font-family: var(--t-disp); font-weight: 700; font-size: 24px; letter-spacing: 0.05em; margin: 16px 0 6px; text-transform: uppercase; color: var(--t-label); }" +
      ".s-note { font-family: var(--t-mono); font-size: 13px; line-height: 1.45; color: var(--t-text-2); margin: 0 0 8px; max-width: 1040px; }" +
      ".s-grid { display: grid; gap: 12px 10px; justify-content: start; align-items: start; }" +
      ".s-cell { margin: 0; } .s-img { display: inline-block; line-height: 0; } .s-img img { display: block; }" +
      ".s-lab { font-family: var(--t-mono); font-weight: 700; font-size: 20px; color: var(--t-text); margin: 0 0 4px; }" +
      ".s-sub { font-weight: 400; font-size: 15px; color: var(--t-text-2); }";
    document.head.appendChild(st);
    document.body.style.margin = "0";
  }, html);
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
  const box = await page.evaluate(() => { const r = document.querySelector(".s-sheet").getBoundingClientRect(); return { width: Math.ceil(r.width), height: Math.ceil(r.height) }; });
  await page.setViewportSize({ width: Math.max(320, box.width), height: Math.min(16000, Math.max(200, box.height)) });
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: box.width, height: Math.min(16000, box.height) } });
  await page.close();
  return file;
}

/* ---------- loss ---------- */
async function lossRender(id, dir, o) {
  const res = { cases: {}, images: [], uses: [], errors: [], warnings: [], frames: {} };
  for (const kase of LOSS_CASES) {
    const page = await bench(ctx);
    const L = await loadVariant(page, "loss", id);
    if (!L.ok) { res.loadError = L.error || "did not register"; Object.assign(res, takeNotes(page)); await page.close(); return res; }
    res.def = L.def;
    const st = await ev(page, pgLossStart, { id, kase }, T_RENDER), dur = st.hold / 1000;
    const readAt = readTime(dur), rowAt = dur - 0.2 >= 0.35 ? 0.35 : readAt;
    const times = LOSS_TIMES.filter((e) => e < dur - 0.02).map((e) => [e, "e = " + e.toFixed(2)]);
    if (!times.some((x) => x[0] === readAt)) times.push([readAt, "e = " + readAt.toFixed(2) + " (read)"]);
    times.sort((a, b) => a[0] - b[0]);
    times.push([Math.max(0, dur - 1 / 60), "last " + (dur - 1 / 60).toFixed(2)], [dur + 0.1, "after +0.10"]);   // the last frame a 60 fps phone shows
    const cells = [];
    let uses = [], seen = false, off = [];
    for (const [e, label] of times) {
      const sr = await ev(page, pgStepTo, e, T_RENDER);
      uses = sr.uses; off = sr.off;
      if (!sr.playing || sr.playing.includes(id)) seen = seen || e < dur;   // an engine without state() is taken at its onUse
      if (o.shots === false) continue;
      const png = await shot(page, st.rect, 4);
      cells.push({ src: dataURL(png), label, w: Math.round(st.rect.width + 8) });
      if (e === rowAt) res.frames[kase] = png;                                   // the side-by-side row's frame
      if (e === readAt) {                                                        // the read check's frame, at full pixels
        const ff = path.join(dir, "loss-" + id + "-" + kase + "-e" + String(Math.round(readAt * 100)).padStart(3, "0") + ".png");
        fs.writeFileSync(ff, png);
        res.full = (res.full || []).concat([ff]);
      }
    }
    const notes = takeNotes(page);
    res.errors.push(...notes.errors.map((s) => kase + ": " + s)); res.warnings.push(...notes.warnings.map((s) => kase + ": " + s));
    // played: onUse named it, the engine had it playing mid-moment, and it was not switched off for throwing
    res.cases[kase] = { hold: st.hold, uses, off, played: uses.includes("loss:" + id) && seen && !off.includes("loss:" + id), caption: st.info && [st.info.city, st.info.date].join(" ") };
    res.uses.push(...uses);
    await page.close();
    if (o.shots === false) continue;
    const C = { streak: "the season's first loss, after 12 straight", mid: "loss 5 of a 76-6 year, low in the card", late: "loss 14 of a 20-62 year, at the game's fastest pace (its read frame: e = " + readAt.toFixed(2) + ")" }[kase];
    const file = path.join(dir, "loss-" + id + "-" + kase + ".png");
    await sheet(file, { title: "loss \u00B7 " + id + " \u00B7 " + kase, sub: C + "; the moment holds " + dur.toFixed(2) + " s. Frames at e seconds after the slam, cropped to the card (375 x 812 phone).",
      sections: [{ cols: 3, cells }] });
    res.images.push(file);
  }
  if (o.shots === false || res.loadError) return res;
  // the smallest phone the owner checks: each moment's read frame (e = 0.25 s; the fast one's last full-ink frame) at 320 x 568
  const cells = [];
  for (const kase of LOSS_CASES) {
    const page = await bench(await ctxSmall());
    await loadVariant(page, "loss", id);
    const st = await ev(page, pgLossStart, { id, kase }, T_RENDER), readAt = readTime(st.hold / 1000);
    await ev(page, pgStepTo, readAt, T_RENDER);
    cells.push({ src: dataURL(await shot(page, st.rect, 4)), label: kase, sub: "e = " + readAt.toFixed(2), w: Math.round(st.rect.width + 8) });
    const notes = takeNotes(page);
    res.errors.push(...notes.errors.map((x) => "320: " + x)); res.warnings.push(...notes.warnings.map((x) => "320: " + x));
    await page.close();
  }
  const f320 = path.join(dir, "loss-" + id + "-320.png");
  await sheet(f320, { title: "loss \u00B7 " + id + " \u00B7 320 wide", sub: "The three moments at their read frame (e = 0.25 s; the 0.29 s moment just before its fade) on a 320 x 568 phone: is it an L (or LOSS) at a glance?", sections: [{ cols: 3, cells }] });
  res.images.push(f320);
  return res;
}
/* ---------- the timing driver: a fresh throttled page per repetition; every variant loaded and warmed once, then
   measured in the order built-in, variants, built-in (the built-in's two runs pool, so drift over the pass evens out).
   A variant that hangs or breaks its page is dropped with the reason, and the pass carries on in a fresh page. ---------- */
async function ev(page, fn, arg, ms) {
  let timer;
  const late = new Promise((res, rej) => { timer = setTimeout(() => rej(new Error("no answer after " + Math.round(ms / 1000) + " s (an endless loop?)")), ms); });
  try { return await Promise.race([page.evaluate(fn, arg), late]); } finally { clearTimeout(timer); }
}
async function timingPass(kind, ids, reps, o) {
  const got = {}, bad = {}, notes = {}, defs = {};
  ids.forEach((id) => { got[id] = []; notes[id] = { errors: [], warnings: [] }; });
  const note = (page, id) => { const n = takeNotes(page); notes[id].errors.push(...n.errors.map((x) => "timing: " + x)); notes[id].warnings.push(...n.warnings.map((x) => "timing: " + x)); };
  const drop = async (page, id, e) => { bad[id] = "timing: " + String(e && e.message || e); await page.close().catch(() => {}); };
  for (let rep = 0; rep < reps; rep++) {
    const order = [ids[0], ...ids.slice(1), ids[0]];
    let page = null, k = 0;
    while (k < order.length) {
      if (!page) {
        page = await bench(ctx, { throttle: opt.throttle });
        if (o.setup) await o.setup(page);
        for (const id of ids) {
          if (bad[id]) continue;
          try {
            const L = await loadVariant(page, kind, id);
            if (!L.ok) { bad[id] = L.error || "did not register"; continue; }
            defs[id] = L.def;
            await o.measure(page, id, L.def, true);                 // warm: JIT and first-use caches
            note(page, id);
          } catch (e) { await drop(page, id, e); page = null; break; }
        }
        if (!page) continue;
      }
      const id = order[k++];
      if (bad[id]) continue;
      try { got[id].push(await o.measure(page, id, defs[id], false)); note(page, id); }
      catch (e) { await drop(page, id, e); page = null; }
    }
    if (page) await page.close();
  }
  return { got, bad, notes };
}
const spread = (a) => (a.length > 1 ? r2((Math.max(...a) - Math.min(...a)) / mean(a)) : null);

// The floor: a moment that draws nothing (no veil, hero, caption or hit), so what is left of a frame is the ledger
// and the engine. A moment's own cost is its frame less the floor; the report shows it beside the whole frame.
const FLOOR = "qa-floor";
async function lossTiming(ids, reps) {
  const floor = !SHIM.reel, all = floor ? ids.concat([FLOOR]) : ids;
  const P = await timingPass("loss", all, reps, {
    setup: floor ? (page) => page.evaluate((id) => window.T82ART.add("loss", id, { name: "QA floor", draw: function () {}, veil: false, caption: false, hit: function () {} }), FLOOR) : null,
    measure: async (page, id, def, warm) => {
      const out = [];
      for (const kase of warm ? ["late"] : LOSS_CASES) out.push(await ev(page, pgLossTime, { id, kase }, T_TIME));
      return out;
    }
  });
  const out = {};
  all.forEach((id) => {
    const runs = P.got[id], flat = [].concat(...runs), frames = [].concat(...flat.map((r) => r.frames)), jobs = [].concat(...flat.map((r) => r.jobs));
    const totals = flat.map((r) => sum(r.jobs)), off = [...new Set([].concat(...flat.map((r) => r.off || [])))];
    // each job by its place in the list, the median over every reel that ran it (one GC pause is not the job's cost)
    const byJob = [];
    flat.forEach((r) => r.jobs.forEach((ms, j) => { (byJob[j] = byJob[j] || []).push(ms); }));
    const jobMed = byJob.map((a) => pct(a, 0.5));
    out[id] = { loadError: P.bad[id] || (runs.length ? null : "not measured"), frame: stats(frames),
      jobs: { n: flat.length ? jobs.length / flat.length : 0, max: r2(jobMed.length ? Math.max(...jobMed) : 0), rawMax: r2(jobs.length ? Math.max(...jobs) : 0), list: jobMed.map(r2) },
      prepTotal: r2(pct(totals, 0.5)), stampMs: r2(mean(flat.map((r) => r.stampMs))), canvasPeak: Math.max(0, ...flat.map((r) => r.peak || 0)),
      canvasAfter: Math.max(0, ...flat.map((r) => r.after || 0)), off, noise: spread(runs.map((rs) => mean([].concat(...rs.map((r) => r.frames))))),
      errors: P.notes[id].errors, warnings: P.notes[id].warnings };
  });
  if (floor && out[FLOOR] && !out[FLOOR].loadError) {
    const f = out[FLOOR].frame.avg, b = out[ids[0]] && out[ids[0]].frame.avg;
    ids.forEach((id) => { if (out[id] && !out[id].loadError) out[id].moment = { avg: r2(out[id].frame.avg - f), ratio: b > f ? r2((out[id].frame.avg - f) / (b - f)) : null, floor: f }; });
  }
  delete out[FLOOR];
  return out;
}
function lossVerdict(id, mIn, b, render, bytes) {
  let m = mIn;
  const B = BUDGET.loss, v = [];
  const ratio = (a, c) => (a != null && c ? a / c : null);
  if (m && (m.off || []).includes("loss:" + id)) m = null;                 // it threw: the numbers are classic's, not its own
  if (m && b && id !== BUILTIN.loss) {
    v.push(budget("frameAvg", "frame avg \u2264 1.5x classic", m.frame.avg, b.frame.avg, ratio(m.frame.avg, b.frame.avg), B.frameAvg, "ms"));
    v.push(budget("frameP95", "frame p95 \u2264 2x classic", m.frame.p95, b.frame.p95, ratio(m.frame.p95, b.frame.p95), B.frameP95, "ms"));
    v.push(budget("prepTotal", "prep total \u2264 1.5x classic", m.prepTotal, b.prepTotal, ratio(m.prepTotal, b.prepTotal), B.prepTotal, "ms"));
    v.push(budget("jobMax", "each prep job \u2264 1.5x classic's longest (its median)", m.jobs.max, b.jobs.max, ratio(m.jobs.max, b.jobs.max), B.jobMax, "ms"));
  }
  if (m) {
    v.push(abs("canvas", "canvases \u2264 12 MB", m.canvasPeak, B.canvasBytes, "bytes", id === BUILTIN.loss));
  }
  if (bytes != null) v.push(abs("file", "file \u2264 10 KB", bytes, B.fileBytes, "bytes"));
  if (render && id !== BUILTIN.loss) {
    const missed = LOSS_CASES.filter((k) => !render.cases[k] || !render.cases[k].played);
    const threw = LOSS_CASES.filter((k) => render.cases[k] && render.cases[k].off.includes("loss:" + id));
    v.push({ key: "played", label: "it played in all three moments", value: render.loadError ? "did not load" : threw.length ? "threw and fell back to classic in " + threw.join(", ") : missed.length ? "classic played in " + missed.join(", ") : "yes", pass: !missed.length && !render.loadError });
  }
  return v;
}
function budget(key, label, value, base, ratio, limit, unit) { return { key, label, value: r2(value), base: r2(base), ratio: r2(ratio), limit, unit, pass: ratio == null ? null : ratio <= limit }; }
function abs(key, label, value, limit, unit, ref) {
  const over = value != null && value > limit;
  return { key, label: label + (ref && over ? " (the built-in is over: it sets the reference)" : ""), value: unit === "bytes" ? value : r2(value), limit, unit, pass: value == null || ref ? null : !over };
}

/* ---------- dots ---------- */
async function dotsRender(id, dir, o) {
  const res = { images: [], uses: [], errors: [], warnings: [], months: [] };
  const page = await bench(ctx);
  const L = await loadVariant(page, "dots", id);
  if (!L.ok) { res.loadError = L.error || "did not register"; Object.assign(res, takeNotes(page)); await page.close(); return res; }
  res.def = L.def;
  const live = L.def && L.def.live, reach = (L.def && L.def.reach) || { w: 1.7, l: 3.4 };
  const led = await ev(page, pgLedger, { id, live }, T_RENDER);
  res.uses.push(...led.uses);
  res.off = led.off;
  res.months = led.months.map((m) => ({ mi: m.mi, diff: m.diff, size: m.w + "x" + m.h, stripSize: m.stripSize, error: m.error }));
  const liveShots = [];
  if (o.shots !== false) for (let mi = 0; mi < led.months.length; mi++) {
    const r = await ev(page, pgMonthRect, mi, T_RENDER);
    liveShots.push({ png: await shot(page, r), w: Math.round(r.width) });
  }
  // a win and a loss, mid-stamp, at four times their size
  const stampCells = { win: [], loss: [] };
  for (const [which, gi, times] of [["win", LEDGER_WIN, WIN_TIMES.concat([(live && live.w || 0.24) + 0.4])], ["loss", LEDGER_LOSS, DROP_TIMES.concat([(live && live.l || 1.5) + 0.6])]]) {
    const st = await ev(page, pgStampStart, { id, live, gi }, T_RENDER);
    const half = Math.ceil(Math.max(4.2, (which === "win" ? reach.w : reach.l) + 0.8) * st.cell.R);
    for (let k = 0; k < times.length; k++) {
      await ev(page, pgStepTo, times[k], T_RENDER);
      if (o.shots === false) continue;
      const png = await shot(page, { x: st.cell.x - half, y: st.cell.y - half, width: half * 2, height: half * 2 });
      stampCells[which].push({ src: dataURL(png), label: k === times.length - 1 ? "settled" : "e = " + times[k].toFixed(2), w: half * 2 * 4, pixelated: true });
    }
  }
  const notes = takeNotes(page);
  res.errors.push(...notes.errors); res.warnings.push(...notes.warnings);
  await page.close();
  if (o.shots === false) return res;
  const MO = ["OCT", "NOV", "DEC", "JAN", "FEB", "MAR", "APR"], ledCells = [];
  led.months.forEach((m, i) => {
    ledCells.push({ src: m.strip || "", label: MO[i] + " strip()", sub: m.diff == null ? (m.error || "size " + m.stripSize + " vs " + m.w + "x" + m.h) : m.diff ? m.diff + " px differ" : "matches live", w: Math.round(m.cssW), paper: led.paper, blend: led.blend });
    ledCells.push({ src: liveShots[i] ? dataURL(liveShots[i].png) : "", label: MO[i] + " live reel", w: liveShots[i] ? liveShots[i].w : 0 });
  });
  const file = path.join(dir, "dots-" + id + ".png");
  await sheet(file, { title: "dots \u00B7 " + id, sub: "A 70-12 year: streaks of 10, 20 and 30, loss runs of 2 and 3. Left: each month printed settled by T82RISO.strip; right: the live reel after the season played out (they must match: ink outside the set's reach leaves stale dots in the live strip).",
    sections: [{ title: "the settled ledger", cols: 2, cells: ledCells },
      { title: "a win mid-stamp (the 10th straight), 4x", note: "Cropped to the stamp's reach; the frames at e seconds after the stamp.", cols: 4, cells: stampCells.win },
      { title: "a loss mid-stamp (a light one), 4x", cols: 4, cells: stampCells.loss }] });
  res.images.push(file);
  res.frames = { ledger: liveShots[1] ? liveShots[1].png : null };
  return res;
}
async function dotsTiming(ids, reps) {
  const P = await timingPass("dots", ids, reps, { measure: (page, id, def) => ev(page, pgDotsTime, { id, live: def && def.live }, T_TIME) });
  const out = {};
  ids.forEach((id) => {
    const runs = P.got[id];
    out[id] = { loadError: P.bad[id] || (runs.length ? null : "not measured"), frame: stats([].concat(...runs.map((r) => r.busy))),
      settled: r2(pct([].concat(...runs.map((r) => r.settled)), 0.5)), noise: spread(runs.map((r) => mean(r.busy))),
      errors: P.notes[id].errors, warnings: P.notes[id].warnings };
  });
  return out;
}
function dotsVerdict(id, m, b, render, bytes) {
  const B = BUDGET.dots, v = [];
  if (m && b && id !== BUILTIN.dots) {
    v.push(budget("frame", "moving strip frame \u2264 1.5x classic", m.frame.avg, b.frame.avg, b.frame.avg ? m.frame.avg / b.frame.avg : null, B.frame, "ms"));
    v.push(budget("settled", "settled strip \u2264 1.5x classic", m.settled, b.settled, b.settled ? m.settled / b.settled : null, B.settled, "ms"));
  }
  if (bytes != null) v.push(abs("file", "file \u2264 6 KB", bytes, B.fileBytes, "bytes"));
  if (render && render.months && render.months.length) {
    const bad = render.months.filter((x) => x.diff !== 0);
    v.push({ key: "reach", label: "the live ledger matches strip() (ink inside reach, still by the end of live)", value: bad.length ? bad.map((x) => ["OCT", "NOV", "DEC", "JAN", "FEB", "MAR", "APR"][x.mi] + " " + (x.diff == null ? "unmatched" : x.diff + " px")).join(", ") : "all 7 months", pass: !bad.length });
  }
  if (render && id !== BUILTIN.dots) {
    const threw = (render.off || []).includes("dots:" + id), used = render.uses.includes("dots:" + id);
    v.push({ key: "played", label: "the reel printed with it", value: render.loadError ? "did not load" : threw ? "threw: the season went classic" : used ? "yes" : "no onUse(dots, " + id + ")", pass: used && !threw && !render.loadError });
  }
  return v;
}

/* ---------- scene ---------- */
async function sceneRender(id, dir, o) {
  const res = { images: [], uses: [], errors: [], warnings: [] };
  const page = await bench(ctx);
  const L = await loadVariant(page, "scene", id);
  if (!L.ok) { res.loadError = L.error || "did not register"; Object.assign(res, takeNotes(page)); await page.close(); return res; }
  res.def = L.def;
  const lights = (L.def && Array.isArray(L.def.lights) && L.def.lights.length ? L.def.lights : ["golden", "dusk", "night"]);
  const perfect = !!(L.def && L.def.perfect), records = perfect ? [82] : null, w = perfect ? 82 : 64;
  res.lights = lights; res.perfect = perfect;
  const b = await ev(page, pgBanners, { id, lights, records }, T_RENDER);
  res.sameAsLake = b.sameAsLake;
  const poster = await ev(page, pgPoster, { id, pal: lights[0], w }, T_RENDER);
  const reveal = [];
  const rect = await ev(page, pgRevealStart, { id, pal: lights[0], w }, T_RENDER);
  for (const e of REVEAL_TIMES) {
    await ev(page, pgRevealTo, e, T_RENDER);
    if (o.shots !== false) reveal.push({ src: dataURL(await shot(page, rect)), label: "e = " + e.toFixed(1), w: 375 });
  }
  // a perfect scene that declares live: its motion after the reveal, then the still it must come to rest on
  const liveDur = perfect && L.def && L.def.live && +L.def.live.dur > 0 ? +L.def.live.dur : 0, liveCells = [];
  if (liveDur) {
    const end = REVEAL_TIMES[REVEAL_TIMES.length - 1], times = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((k) => Math.round((end + liveDur * k) * 100) / 100), sums = [];
    times.push(Math.round((end + liveDur + 1) * 100) / 100, Math.round((end + liveDur + 1.6) * 100) / 100);
    let on = null;
    for (const e of times) {
      const r = await ev(page, pgLiveTo, e, T_RENDER);
      sums.push(r.sum); on = r.on;
      if (o.shots !== false) liveCells.push({ src: dataURL(await shot(page, rect)), label: "e = " + e.toFixed(1), sub: e > end + liveDur ? "after" : "live", w: 375 });
    }
    const n = sums.length;
    res.live = { dur: liveDur, moved: new Set(sums.slice(0, n - 2)).size > 1, still: sums[n - 1] === sums[n - 2], running: on };
  }
  const notes = takeNotes(page);
  res.errors.push(...notes.errors); res.warnings.push(...notes.warnings);
  await page.close();
  res.posterMs = poster ? r2(poster.ms) : null;
  if (!poster) res.errors.push("the poster failed (T82PRINT.poster gave no blob)");
  if (o.shots === false) return res;
  if (poster) { const pf = path.join(dir, "scene-" + id + "-poster-" + w + "-" + (82 - w) + ".jpg"); fs.writeFileSync(pf, fromDataURL(poster.url)); res.images.push(pf); }
  // each banner at the phone's real pixels (375 css px at 2x), for a close look; the sheet is the overview
  res.banners = b.banners.map((x) => {
    const bf = path.join(dir, "scene-" + id + "-" + x.w + "-" + (82 - x.w) + "-" + x.pal + ".png");
    fs.writeFileSync(bf, fromDataURL(x.url));
    return bf;
  });
  const cells = b.banners.map((x) => ({ src: x.url, label: x.w + "\u2013" + (82 - x.w), sub: x.pal + (x.scene && x.scene !== id ? " (printed " + x.scene + ")" : ""), w: 375 }));
  const file = path.join(dir, "scene-" + id + ".png");
  await sheet(file, { title: "scene \u00B7 " + id + (perfect ? " (perfect: 82-0 only)" : ""), sub: "The results banner at the phone's width (375 px), one row per record, one column per light; the full-size PNGs sit beside this sheet. " + (b.sameAsLake ? "WARNING: the lake printed instead (it fell back)." : ""),
    sections: [{ cols: lights.length, cells }, { title: "the reveal (" + w + "-" + (82 - w) + ", " + lights[0] + ")", note: "Frames at e seconds after play().", cols: 2, cells: reveal }].concat(liveCells.length ? [{ title: "the live motion (" + liveDur + " s, then still)", note: "After the reveal; the last two frames must match (a still print).", cols: 2, cells: liveCells }] : []) });
  res.images.unshift(file);
  res.frames = { banner: fromDataURL(b.banners[perfect ? 0 : Math.min(b.banners.length - 1, lights.length)].url) };   // 64-18 (or 82-0) in its first light
  return res;
}
// the built-in is timed in each variant's first light too, so a ratio compares the same painting
async function sceneTiming(ids, reps, pals, perfect, lives) {
  perfect = perfect || {}; lives = lives || {};
  const P = await timingPass("scene", ids, reps, { measure: (page, id) => ev(page, pgSceneTime, { id, pal: pals[id], records: perfect[id] ? [82] : null, live: lives[id] || 0 }, T_TIME) });
  const out = {};
  ids.forEach((id) => {
    const runs = P.got[id], fell = [...new Set([].concat(...runs.map((r) => r.printed || [])).filter((x) => x !== id))];
    if (fell.length && !P.bad[id]) P.bad[id] = "the timing pass printed " + fell.join(", ") + " instead";   // its numbers would be lake's
    out[id] = { loadError: P.bad[id] || (runs.length ? null : "not measured"), bake: r2(pct(runs.map((r) => mean(r.bake)), 0.5)), mount: r2(pct(runs.map((r) => r.mountMs), 0.5)),
      frame: stats([].concat(...runs.map((r) => r.frames))), live: stats([].concat(...runs.map((r) => r.liveFrames || []))), noise: spread(runs.map((r) => mean(r.bake))), errors: P.notes[id].errors, warnings: P.notes[id].warnings };
  });
  return out;
}
function sceneVerdict(id, m, b, render, bytes) {
  const pf = !!(render && render.perfect), B = pf ? BUDGET.perfect : BUDGET.scene, v = [];
  if (m && b && id !== BUILTIN.scene) {
    v.push(budget("bake", "banner bake \u2264 " + B.bake + "x lake" + (pf ? " (82-0)" : ""), m.bake, b.bake, b.bake ? m.bake / b.bake : null, B.bake, "ms"));
    v.push(budget("reveal", "reveal frame \u2264 " + B.reveal + "x lake", m.frame.avg, b.frame.avg, b.frame.avg ? m.frame.avg / b.frame.avg : null, B.reveal, "ms"));
  }
  if (bytes != null) v.push(abs("file", "file \u2264 " + B.fileBytes / KB + " KB", bytes, B.fileBytes, "bytes"));
  if (render && id !== BUILTIN.scene) v.push({ key: "printed", label: "it printed (not lake's fallback)", value: render.loadError ? "did not load" : render.sameAsLake ? "the lake printed instead" : "yes", pass: !render.loadError && render.sameAsLake === false });
  if (render && render.live) {                    // art/CONTRACT-FX.md: a perfect scene's live frames, then a still
    if (m && m.live && m.live.n) v.push(abs("live", "live frame \u2264 12 ms avg (its few seconds)", m.live.avg, 12, "ms"));
    v.push({ key: "liveMoved", label: "the live motion moves after the reveal", value: render.live.moved ? "yes" : "the print did not change", pass: !!render.live.moved });
    v.push({ key: "liveStill", label: "then it stops on a still frame", value: render.live.still ? "yes" : "still moving " + (render.live.dur + 1.6).toFixed(1) + " s after the reveal", pass: !!render.live.still });
  }
  return v;
}

/* ---------- WebKit: the same render routines, no pictures, for Safari-only breakage ---------- */
async function webkitErrors(targets) {
  const out = {};
  let wb;
  try { wb = await PW.webkit.launch(); } catch (e) { targets.forEach((t) => { out[t.kind + ":" + t.id] = ["WebKit did not launch: " + e.message]; }); return out; }
  const wctx = await wb.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  const saved = ctx;
  ctx = wctx;
  for (const t of targets) {
    try {
      const r = await ({ loss: lossRender, dots: dotsRender, scene: sceneRender })[t.kind](t.id, OUT, { shots: false });
      // and it must actually print in WebKit: not classic's or lake's fallback
      const fell = t.id === BUILTIN[t.kind] ? [] : t.kind === "loss" ? LOSS_CASES.filter((k) => !r.cases[k] || !r.cases[k].played).map((k) => "classic played in " + k)
        : t.kind === "dots" ? ((r.off || []).includes("dots:" + t.id) || !r.uses.includes("dots:" + t.id) ? ["the season printed classic"] : [])
        : r.sameAsLake ? ["the lake printed instead"] : [];
      out[t.kind + ":" + t.id] = r.errors.concat(r.warnings.filter((w) => ENGINE_WARN.test(w)).map((w) => "warning: " + w), r.loadError ? ["did not load: " + r.loadError] : [], r.loadError ? [] : fell);
    } catch (e) { out[t.kind + ":" + t.id] = ["the WebKit pass threw: " + String(e && e.message || e).split("\n")[0]]; await closeOpen(); }
  }
  ctx = saved;
  await wb.close();
  return out;
}

/* ---------- the FX kinds (art/CONTRACT-FX.md): hot, perk and goat packs on the riso FX layer (riso-fx.js) ----------
   Each slot plays on the game's own screen, which the bench builds from the game's classes with the anchor where the
   game puts it (T82QA.fx): the heat label mid-screen for a tier, the verdict stamp for the save and no save (the save
   spreads over ev.area, the stamp's card), the three cost buttons near the bottom for a perk, the results' W/L box for 82-0, whose burst plays
   as the game fires it (fireGoats: nine bursts 0.18 s apart, so up to nine on screen at once). A contact sheet per
   pack (a row per slot, the frames across its dur, then one after it: the layer must be gone), each slot's middle
   frame at full pixels and at 320 wide, the timing at the throttle (every 60 fps frame of each slot with its pixels
   finished, each prep job from a cold page, the plates' canvas bytes), console errors, and in WebKit that it printed
   itself. The budgets are absolute (CONTRACT-FX "Budgets"). `<kind> all` checks every pack of the kind, side by side. */
const FX_KINDS = ["hot", "perk", "goat"];
const FX_SLOTS = { hot: ["cold", "warm", "hot", "fire", "nova", "save", "miss"], perk: ["refund", "sale"], goat: ["burst"] };
const FX_BUDGET = { frameAvg: 8, frameP95: 16, jobMs: 25, plateBytes: 16 * MB, fileBytes: { hot: 14 * KB, perk: 10 * KB, goat: 8 * KB } };
const FX_FRAMES = 10;                              // frames per slot on the sheet, spread over its dur
const fxPlan = (kind) => (kind === "goat" ? [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => [i * 0.18, 400 + i]) : null);
async function pgFxStart(a) {
  const s = await window.T82QA.fx.start(a.kind, a.id, a.slot, { plan: a.plan });
  return { durs: s.durs, jobs: s.jobs, warm: s.warm || [], rect: s.rect, end: s.end, state: s.state };
}
function pgFxTo(e) { const r = window.T82QA.fx.to(e); return { ms: r.ms, on: r.on, running: r.state.running, off: r.state.off, layer: r.state.layer, loop: r.state.loop }; }
function pgFxRun(end) {
  const r = window.T82QA.fx.run(end);
  return { frames: r.frames, plates: r.plates, layer: r.layer, idle: !r.after.layer && !r.after.loop && !r.after.running.length };
}
async function fxRender(kind, id, dir, o) {
  const res = { images: [], errors: [], warnings: [], slots: {}, full: [], frames: {} };
  const page = await bench(ctx);
  const L = id === "classic" ? { ok: true, def: null } : await loadVariant(page, kind, id);
  if (!L.ok) { res.loadError = L.error || "did not register"; Object.assign(res, takeNotes(page)); await page.close(); return res; }
  res.def = L.def || await page.evaluate(({ kind }) => { const d = window.T82ART && T82ART.get(kind, "classic"); return d ? { name: d.name, by: d.by } : null; }, { kind });
  const rows = [];
  for (const slot of FX_SLOTS[kind]) {
    const st = await ev(page, pgFxStart, { kind, id, slot, plan: fxPlan(kind) }, T_RENDER), cells = [];
    const times = [];
    for (let k = 0; k < FX_FRAMES; k++) times.push(Math.round(st.end * (k + 0.5) / FX_FRAMES * 100) / 100);
    times.push(Math.round((st.end + 0.1) * 100) / 100);
    let played = false, off = [], gone = null;
    for (let k = 0; k < times.length; k++) {
      const r = await ev(page, pgFxTo, times[k], T_RENDER);
      off = r.off;
      if (k < times.length - 1 && r.running.some((x) => x.id === id && x.kind === kind)) played = true;
      if (k === times.length - 1) gone = !r.layer && !r.loop;
      if (o.shots === false) continue;
      const png = await page.screenshot({ animations: "allow", caret: "hide" });
      cells.push({ src: dataURL(png), label: k === times.length - 1 ? "after" : "e " + times[k].toFixed(2), w: 170 });
      if (k === Math.floor(FX_FRAMES * 0.4)) {          // the slot's hold, at full pixels, for a close look
        const ff = path.join(dir, "fx-" + kind + "-" + id + "-" + slot + ".png");
        fs.writeFileSync(ff, png);
        res.full.push(ff);
        res.frames[slot] = png;
      }
    }
    res.slots[slot] = { durs: st.durs, end: st.end, played: played && !off.includes(kind + ":" + id), off, gone };
    if (o.shots !== false) rows.push({ title: slot + " · " + (st.durs[0] / 1000).toFixed(2) + " s" + (st.durs.length > 1 ? " × " + st.durs.length + " (the game's sequence)" : ""), cols: times.length, cells });
  }
  const notes = takeNotes(page);
  res.errors.push(...notes.errors); res.warnings.push(...notes.warnings);
  await page.close();
  if (o.shots === false) return res;
  const file = path.join(dir, "fx-" + kind + "-" + id + ".png");
  await sheet(file, { title: kind + " · " + id, sub: "Each slot on the game's own screen (375 x 812), frames spread over its dur, then one after it (the layer must be gone). " +
    (kind === "goat" ? "The burst fires as fireGoats does: nine, 0.18 s apart, in the W/L box." : kind === "perk" ? "The anchor is the three cost buttons." : "Tiers at the heat label; the save and no save at the verdict stamp (the save fills its card, ev.area)."), sections: rows });
  res.images.push(file);
  // the smallest phone: each slot's hold frame at 320 x 568
  const small320 = await bench(await ctxSmall()), cells = [];
  if (id !== "classic") await loadVariant(small320, kind, id);
  for (const slot of FX_SLOTS[kind]) {
    const st = await ev(small320, pgFxStart, { kind, id, slot, plan: fxPlan(kind) }, T_RENDER), e = Math.round(st.end * (Math.floor(FX_FRAMES * 0.4) + 0.5) / FX_FRAMES * 100) / 100;
    await ev(small320, pgFxTo, e, T_RENDER);
    cells.push({ src: dataURL(await small320.screenshot({ animations: "allow", caret: "hide" })), label: slot, sub: "e " + e.toFixed(2), w: 160 });
  }
  const n320 = takeNotes(small320);
  res.errors.push(...n320.errors.map((x) => "320: " + x)); res.warnings.push(...n320.warnings.map((x) => "320: " + x));
  await small320.close();
  const f320 = path.join(dir, "fx-" + kind + "-" + id + "-320.png");
  await sheet(f320, { title: kind + " · " + id + " · 320 wide", sub: "Each slot's hold frame on a 320 x 568 phone.", sections: [{ cols: cells.length, cells }] });
  res.images.push(f320);
  return res;
}
// a fresh throttled page per rep; the first slot's prep is the cold one (a new page, as in the game); each slot then
// plays every 60 fps frame of its dur
async function fxTiming(kind, id, reps) {
  const out = { slots: {}, jobs: [], coldJobs: [], warm: [], plates: 0, layer: 0, idle: true, errors: [], warnings: [] };
  const byJob = [];
  for (let rep = 0; rep < reps; rep++) {
    const page = await bench(ctx, { throttle: opt.throttle });
    try {
      if (id !== "classic") { const L = await loadVariant(page, kind, id); if (!L.ok) { out.loadError = L.error || "did not register"; break; } }
      let first = true;
      for (const slot of FX_SLOTS[kind]) {
        const st = await ev(page, pgFxStart, { kind, id, slot, plan: fxPlan(kind) }, T_TIME);
        st.jobs.forEach((ms, j) => { (byJob[j] = byJob[j] || []).push(ms); });
        if (first && rep === 0) out.coldJobs = st.jobs.map(r2);
        if (st.warm.length) out.warm.push(...st.warm.map(r2));   // the engine's once-a-page warm-ups: reported, not the pack's
        first = false;
        const r = await ev(page, pgFxRun, st.end, T_TIME);
        const s = out.slots[slot] || (out.slots[slot] = { frames: [] });
        s.frames.push(...r.frames);
        out.plates = Math.max(out.plates, r.plates); out.layer = Math.max(out.layer, r.layer);
        if (!r.idle) out.idle = false;
      }
      const n = takeNotes(page);
      out.errors.push(...n.errors.map((x) => "timing: " + x)); out.warnings.push(...n.warnings.map((x) => "timing: " + x));
    } catch (e) { out.loadError = "timing: " + String(e && e.message || e).split("\n")[0]; }
    await page.close().catch(() => {});
  }
  out.jobs = byJob.map((a) => r2(pct(a, 0.5)));          // each job's median over every prep that ran it
  Object.keys(out.slots).forEach((k) => { out.slots[k] = stats(out.slots[k].frames); });
  return out;
}
function fxVerdict(kind, id, m, render, bytes) {
  const B = FX_BUDGET, v = [];
  if (m && !m.loadError) {
    FX_SLOTS[kind].forEach((slot) => {
      const s = m.slots[slot];
      if (!s) return;
      v.push(abs("avg-" + slot, slot + ": frame avg ≤ 8 ms", s.avg, B.frameAvg, "ms"));
      v.push(abs("p95-" + slot, slot + ": frame p95 ≤ 16 ms", s.p95, B.frameP95, "ms"));
    });
    v.push(abs("jobMs", "each prep job ≤ 25 ms (its median)", m.jobs.length ? Math.max(...m.jobs) : 0, B.jobMs, "ms"));
    v.push(abs("plates", "the pack's plates ≤ 16 MB", m.plates, B.plateBytes, "bytes"));
    v.push({ key: "idle", label: "idle costs nothing: the layer and its loop are gone after every slot", value: m.idle ? "yes" : "the layer stayed", pass: !!m.idle });
  }
  if (bytes != null) v.push(abs("file", "file ≤ " + B.fileBytes[kind] / KB + " KB", bytes, B.fileBytes[kind], "bytes"));
  if (render && !render.loadError) {
    const missed = FX_SLOTS[kind].filter((s) => !render.slots[s] || !render.slots[s].played);
    if (id !== "classic") v.push({ key: "played", label: "every slot printed itself (not classic's fallback)", value: missed.length ? "classic played " + missed.join(", ") : "yes", pass: !missed.length });
    const stuck = FX_SLOTS[kind].filter((s) => render.slots[s] && render.slots[s].gone === false);
    v.push({ key: "gone", label: "the layer is off the page once the slot ends", value: stuck.length ? "still up after " + stuck.join(", ") : "yes", pass: !stuck.length });
  } else if (render) v.push({ key: "played", label: "it loaded", value: render.loadError, pass: false });
  return v;
}
async function fxMain() {
  const t0 = Date.now(), kind = MODE, srv = await serve(opt.root, opt.port);
  BASE = "http://127.0.0.1:" + srv.port + "/";
  browser = await PW.chromium.launch();
  ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  let report;
  try {
    const ids = [];
    if (pos[1] === "all") {
      ids.push("classic");
      const lister = await bench(ctx);
      (await lister.evaluate((k) => (window.T82ART && T82ART.catalog ? T82ART.catalog(k) : []).map((e) => e.id), kind)).forEach((x) => { if (!ids.includes(x)) ids.push(x); });
      await lister.close();
      const dir = path.join(opt.root, "art", kind);
      if (fs.existsSync(dir)) fs.readdirSync(dir).filter((f) => /^[a-z0-9-]+\.js$/.test(f)).map((f) => f.slice(0, -3)).forEach((x) => { if (!ids.includes(x)) ids.push(x); });
    } else {
      if (pos[1] !== "classic" && !fileOf(kind, pos[1])) throw new Error("there is no " + kind + " pack " + pos[1] + ": no art/" + kind + "/" + pos[1] + ".js under " + opt.root);
      ids.push(pos[1]);
    }
    log("art-qa: " + kind + " " + ids.join(", ") + "; out " + OUT);
    const dir = path.join(OUT, kind), variants = [];
    fs.mkdirSync(dir, { recursive: true });
    for (const id of ids) {
      log("art-qa: " + kind + " " + id + ": pictures");
      let R, m = null;
      try { R = await fxRender(kind, id, dir, {}); } catch (e) { R = { loadError: "the bench could not finish it: " + String(e && e.message || e).split("\n")[0], errors: [], warnings: [], images: [], slots: {}, full: [] }; await closeOpen(); }
      if (!opt.quick) {
        log("art-qa: " + kind + " " + id + ": timing at " + opt.throttle + "x, " + opt.reps + " reps");
        try { m = await fxTiming(kind, id, opt.reps); } catch (e) { m = { loadError: "the timing pass failed: " + String(e && e.message || e).split("\n")[0], errors: [], warnings: [] }; await closeOpen(); }
      }
      const f = id === "classic" ? null : fileOf(kind, id), bytes = f ? fs.statSync(f).size : null;
      const budgets = fxVerdict(kind, id, m, R, bytes);
      const errors = [].concat(R.errors || [], m && m.errors || [], R.loadError ? ["did not load: " + R.loadError] : [], m && m.loadError ? [m.loadError] : []);
      const warnings = [].concat(R.warnings || [], m && m.warnings || []);
      budgets.push({ key: "errors", label: "no console errors", value: errors.length, pass: errors.length === 0 });
      const retired = warnings.filter((w) => ENGINE_WARN.test(w));
      budgets.push({ key: "warnings", label: "no engine warnings (a throw retires it)", value: retired.length, pass: retired.length === 0 });
      const parts = [];
      if (m && !m.loadError) {
        parts.push(FX_SLOTS[kind].map((s) => m.slots[s] ? s + " " + fmtMs(m.slots[s].avg) + "/" + fmtMs(m.slots[s].p95) : s + " n/a").join(", ") + " (avg/p95)");
        parts.push("prep " + m.jobs.length + " jobs, max " + fmtMs(m.jobs.length ? Math.max(...m.jobs) : 0) + " (cold page " + fmtMs(m.coldJobs.length ? Math.max(...m.coldJobs) : 0) + "; the engine's warm-ups, once a page, max " + fmtMs(m.warm.length ? Math.max(...m.warm) : 0) + ")", "plates " + fmtB(m.plates) + ", layer " + fmtB(m.layer));
      }
      if (bytes != null) parts.push(fmtB(bytes));
      parts.push(errors.length + " errors");
      const def = R.def || {};
      const v = { kind, id, builtin: id === "classic", name: def.name || id, by: def.by || "", file: f, fileBytes: bytes, budgets, timing: m,
        render: { slots: R.slots }, errors, warnings, images: R.images || [], full: R.full || [], frames: R.frames || {}, summary: parts.join("; "), notes: [] };
      variants.push(v);
    }
    if (opt.webkit) {
      log("art-qa: WebKit pass");
      let wb = null;
      try { wb = await PW.webkit.launch(); } catch (e) { variants.forEach((v) => { v.webkitErrors = ["WebKit did not launch: " + e.message]; }); }
      if (wb) {
        const saved = ctx;
        ctx = await wb.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
        for (const v of variants) {
          try {
            const r = await fxRender(kind, v.id, dir, { shots: false });
            const fell = v.id === "classic" || r.loadError ? [] : FX_SLOTS[kind].filter((s) => !r.slots[s] || !r.slots[s].played).map((s) => "classic played " + s);
            v.webkitErrors = r.errors.concat(r.warnings.filter((w) => ENGINE_WARN.test(w)).map((w) => "warning: " + w), r.loadError ? ["did not load: " + r.loadError] : [], fell);
          } catch (e) { v.webkitErrors = ["the WebKit pass threw: " + String(e && e.message || e).split("\n")[0]]; await closeOpen(); }
        }
        ctx = saved;
        await wb.close();
      }
      variants.forEach((v) => { const e = v.webkitErrors || []; v.budgets.push({ key: "webkit", label: "WebKit: no errors, and it printed itself", value: e.length ? e.length + " problems" : "clean", pass: e.length === 0 }); });
    }
    variants.forEach((v) => { v.pass = !v.budgets.some((x) => x.pass === false); });
    const rows = [];
    if (variants.length > 1) {                          // every pack side by side: each slot's hold frame
      const f = path.join(OUT, "row-" + kind + ".png");
      await sheet(f, { title: "every " + kind + " pack", sub: "Each pack's hold frame, a row per slot.", sections: FX_SLOTS[kind].map((s) => ({ title: s, cols: variants.length,
        cells: variants.filter((v) => v.frames[s]).map((v) => ({ src: dataURL(v.frames[s]), label: v.id, w: 170 })) })) });
      rows.push(f);
    }
    variants.forEach((v) => { delete v.frames; });
    report = { tool: "tools/art-qa.mjs", when: new Date().toISOString(), mode: MODE + " " + pos[1], root: opt.root, engine: "riso-fx " + kind, throttle: opt.throttle, reps: opt.reps,
      quick: opt.quick, seconds: Math.round((Date.now() - t0) / 1000), budgets: FX_BUDGET, passed: variants.filter((v) => v.pass).length, failed: variants.filter((v) => !v.pass).length, rows, variants };
    fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 1));
    const idx = writeIndex(report);
    log("");
    variants.forEach((v) => {
      log((v.pass ? "PASS " : "FAIL ") + kind + " " + v.id + (v.builtin ? " (built-in)" : "") + ": " + v.summary);
      v.budgets.filter((b) => b.pass === false).forEach((b) => log("     FAIL " + b.label + ": " + fmtNum(b.value, b.unit)));
      v.errors.slice(0, 4).forEach((e) => log("     error: " + e.slice(0, 200)));
      v.images.forEach((f) => log("     " + f));
    });
    rows.forEach((f) => log("row: " + f));
    log("report: " + path.join(OUT, "report.json"));
    log("index:  " + idx + "  (" + report.seconds + " s)");
  } finally {
    for (const k in sheetCtx) await sheetCtx[k].close().catch(() => {});
    if (small) await Promise.resolve(small).then((c) => c.close()).catch(() => {});
    await browser.close().catch(() => {});
    await srv.close();
  }
  process.exit(report.variants.some((v) => !v.pass) ? 1 : 0);
}

/* ---------- the report ---------- */
function themeBlock() {
  const css = fs.readFileSync(path.join(REPO, "styles.css"), "utf8"), m = css.match(/:root\s*\{[\s\S]*?\n\}/);
  return m ? m[0] : "";
}
function writeIndex(report) {
  const rel = (f) => path.relative(OUT, f).split(path.sep).join("/");
  const chip = (b) => '<li class="' + (b.pass === false ? "bad" : b.pass ? "ok" : "na") + '"><b>' + (b.pass === false ? "FAIL" : b.pass ? "PASS" : "n/a") + "</b> " + esc(b.label) +
    ": " + esc(b.ratio != null ? fmtX(b.ratio) + " (" + fmtNum(b.value, b.unit) + " vs " + fmtNum(b.base, b.unit) + ")" : fmtNum(b.value, b.unit)) + "</li>";
  const card = (v) => '<section class="v" id="' + esc(v.kind + "-" + v.id) + '"><h2>' + esc(v.kind + " \u00B7 " + v.id) + (v.builtin ? " <small>built-in</small>" : "") +
    ' <span class="' + (v.pass === false ? "bad" : "ok") + '">' + (v.pass === false ? "FAIL" : "PASS") + "</span></h2>" +
    (v.name ? "<p><b>" + esc(v.name) + "</b>" + (v.by ? " \u00B7 " + esc(v.by) : "") + "</p>" : "") +
    '<ul class="b">' + v.budgets.map(chip).join("") + "</ul>" +
    '<p class="m">' + esc(v.summary) + "</p>" +
    (v.notes && v.notes.length ? '<p class="m">' + v.notes.map(esc).join("<br>") + "</p>" : "") +
    (v.errors.length || v.warnings.length ? '<ul class="e">' + v.errors.concat(v.warnings.map((w) => "warning: " + w), (v.webkitErrors || []).map((w) => "WebKit: " + w)).slice(0, 12).map((e) => "<li>" + esc(e) + "</li>").join("") + "</ul>" : "") +
    (v.full && v.full.length ? '<p class="m">full size: ' + v.full.map((f) => '<a href="' + esc(rel(f)) + '">' + esc(path.basename(f, ".png").replace(v.kind + "-" + v.id + "-", "")) + "</a>").join(" \u00B7 ") + "</p>" : "") +
    v.images.map((f) => '<a href="' + esc(rel(f)) + '"><img loading="lazy" src="' + esc(rel(f)) + '" alt=""></a>').join("") + "</section>";
  const rows = (report.rows || []).map((f) => '<a href="' + esc(rel(f)) + '"><img src="' + esc(rel(f)) + '" alt=""></a>').join("");
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    "<title>Art QA \u00B7 TRUE 82</title>" +
    '<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700&family=Rubik:wght@400;600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">' +
    "<style>" + themeBlock() +
    "body { margin: 0; background: var(--t-ground); color: var(--t-text); font-family: var(--t-body); }" +
    "main { max-width: 760px; margin: 0 auto; padding: 16px 16px 60px; }" +
    "h1 { font-family: var(--t-disp); font-size: 34px; letter-spacing: 0.04em; margin: 0; text-transform: uppercase; }" +
    "h2 { font-family: var(--t-disp); font-size: 24px; letter-spacing: 0.04em; margin: 0 0 4px; text-transform: uppercase; }" +
    "h2 small { font-size: 14px; color: var(--t-text-2); } p { margin: 4px 0; font-size: 14px; }" +
    ".meta, .m { font-family: var(--t-mono); font-size: 12px; color: var(--t-text-2); }" +
    ".v { border-top: 1px solid var(--t-line); padding: 14px 0; } .v img, .rows img { display: block; width: 100%; height: auto; margin: 8px 0; }" +
    "ul { margin: 6px 0; padding: 0; list-style: none; font-family: var(--t-mono); font-size: 12px; } li { padding: 2px 0; }" +
    ".ok { color: var(--t-good); } .bad { color: var(--t-bad); } .na { color: var(--t-text-2); } h2 .ok, h2 .bad { font-size: 18px; } .e li { color: var(--t-bad); }" +
    "</style></head><body><main><h1>Art QA</h1>" +
    '<p class="meta">' + esc(report.when + " \u00B7 " + report.mode + " \u00B7 Chromium, " + report.throttle + "x CPU throttle for the timings, " + report.reps + " reps \u00B7 " + report.engine) + "</p>" +
    '<p class="meta">' + esc(report.passed + " pass, " + report.failed + " fail") + "</p>" +
    (rows ? '<section class="rows"><h2>Side by side</h2>' + rows + "</section>" : "") +
    report.variants.map(card).join("") + "</main></body></html>";
  const f = path.join(OUT, "index.html");
  fs.writeFileSync(f, html);
  return f;
}
function fmtNum(v, unit) { return unit === "bytes" ? fmtB(v) : unit === "ms" ? fmtMs(v) : String(v); }

/* ---------- the run ---------- */
/* ---------- finish: when each loss look's moment is over (the owner, 2026-10-02: "we need to standardize the animation
   time; after making my changes, which is the quickest finishing animation?"). Unthrottled: it reads pictures, not
   costs. Every loss look (classic, the index, files not indexed yet) in the mid moment and the first loss after a
   streak, with the speed dial art-index.js carries; a dialed look is measured at today's pace too. ---------- */
const FINISH_CASES = [["mid", "mid moment"], ["streak", "first loss"]];
async function finishMain() {
  const t0 = Date.now(), srv = await serve(opt.root, opt.port);
  BASE = "http://127.0.0.1:" + srv.port + "/";
  browser = await PW.chromium.launch();
  ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  const rows = [];
  try {
    const lister = await bench(ctx);
    const list = await lister.evaluate(() => window.T82QA.list("loss"));
    await lister.close();
    const dir = path.join(opt.root, "art", "loss");
    fs.readdirSync(dir).filter((f) => /^[a-z0-9-]+\.js$/.test(f)).map((f) => f.slice(0, -3))
      .filter((id) => !list.some((e) => e.id === id)).forEach((id) => list.push({ id, name: id, on: true, unindexed: true }));
    log("art-qa: finish, " + list.length + " loss looks" + (opt.noTempo ? " at their own pace (--no-tempo)" : ", the speed dial applied") + "; out " + OUT);
    let page = null;
    for (const v of list) {
      const row = { id: v.id, name: v.name, on: v.on !== false, unindexed: !!v.unindexed, dial: null, finish: {}, hero: {}, still: {}, today: {}, holds: {}, played: true, errors: [] };
      try {
        if (!page) page = await bench(ctx);
        const L = await loadVariant(page, "loss", v.id);
        if (!L.ok) throw new Error(L.error || "did not register");
        if (L.def && L.def.name) row.name = L.def.name;
        for (const [kase] of FINISH_CASES) {
          const r = await ev(page, pgFinish, { id: v.id, kase, tempo: opt.noTempo ? false : undefined }, T_RENDER);
          row.finish[kase] = r.last < 0 ? null : r2(r.last); row.holds[kase] = r2(r.dur);
          if (r.dial) row.dial = r.dial;
          if (!r.played || r.off.indexOf("loss:" + v.id) >= 0) row.played = false;
          const hr = await ev(page, pgFinish, { id: v.id, kase, tempo: opt.noTempo ? false : undefined, hero: true }, T_RENDER);
          row.hero[kase] = hr.last < 0 ? null : r2(hr.last); row.still[kase] = r2(hr.still);
        }
        if (row.dial) for (const [kase] of FINISH_CASES) {
          const r = await ev(page, pgFinish, { id: v.id, kase, tempo: false }, T_RENDER);
          row.today[kase] = r.last < 0 ? null : r2(r.last);
        }
        const n = takeNotes(page);
        row.errors.push(...n.errors, ...n.warnings.filter((w) => ENGINE_WARN.test(w)));
      } catch (e) {
        row.errors.push(String(e && e.message || e));
        if (page) await page.close().catch(() => {});
        page = null;
      }
      rows.push(row);
      log("art-qa: finish " + v.id + "  " + FINISH_CASES.map(([k]) => (row.finish[k] == null ? "n/a" : row.finish[k].toFixed(2) + " s")).join(" / ") +
        "  (the picture " + FINISH_CASES.map(([k]) => (row.hero[k] == null ? "n/a" : row.hero[k].toFixed(2) + " s")).join(" / ") + ")" +
        (row.dial ? "  dial x" + row.dial.x : "") + (row.errors.length ? "  (" + row.errors[0] + ")" : ""));
    }
    if (page) await page.close();
  } finally {
    await browser.close().catch(() => {});
    await srv.close();
  }
  const key = (r) => (r.finish.mid == null ? 1e9 : r.finish.mid) + (r.hero.mid == null ? 1e9 : r.hero.mid) / 1e3 + (r.finish.streak == null ? 1e9 : r.finish.streak) / 1e6;
  rows.sort((a, b) => key(a) - key(b) || a.id.localeCompare(b.id));
  const holds = rows.find((r) => r.holds.mid) || { holds: {} };
  const s = (v) => (v == null ? "n/a" : v.toFixed(2));
  const head = ["#", "look", "mid " + (holds.holds.mid || 1.05).toFixed(2) + " s", "first " + (holds.holds.streak || 1.7).toFixed(2) + " s",
    "picture", "", "still", "", "the owner's dial (today's pace: mid / first)"];
  const body = rows.map((r, i) => [String(i + 1), r.name + " (" + r.id + ")" + (r.on ? "" : " [cut]") + (r.unindexed ? " [not indexed]" : "") + (r.played ? "" : " [did not play]"),
    s(r.finish.mid), s(r.finish.streak), s(r.hero.mid), s(r.hero.streak), s(r.still.mid), s(r.still.streak),
    r.dial ? "x" + r.dial.x + " from " + (r.dial.at ? Math.round(r.dial.at * 100) + "% of the hold" : "the slam") + " (" + s(r.today.mid) + " / " + s(r.today.streak) + ")" : "-"]);
  const w = head.map((h, i) => Math.max(h.length, ...body.map((b) => b[i].length)));
  const line = (c) => c.map((x, i) => (i === 1 || i === 8 ? x.padEnd(w[i]) : x.padStart(w[i]))).join("  ").replace(/\s+$/, "");
  const table = ["When each loss moment is over, in seconds after the slam (quickest first; each pair: the mid moment, then the first loss).",
    "mid / first: the last frame with any of the moment's ink on the card (the picture, the veil, the caption, the slam's rings",
    "and sprays). picture: the look's own picture alone (a look that leaves the card ends early; one that holds its last pose",
    "fades out with the hold). still: when that picture stops moving (before the hold's closing fade; 0.00: it never moves).", "",
    line(head), ...body.map(line)].join("\n");
  log("\n" + table + "\n");
  fs.writeFileSync(path.join(OUT, "finish.txt"), table + "\n");
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ mode: "finish", tempo: !opt.noTempo, cases: FINISH_CASES, rows, seconds: Math.round((Date.now() - t0) / 1000) }, null, 2));
  log("art-qa: " + path.join(OUT, "finish.txt") + "  (" + Math.round((Date.now() - t0) / 1000) + " s)");
  process.exit(rows.some((r) => r.errors.length) ? 1 : 0);
}
async function main() {
  if (MODE === "finish") return finishMain();      // when each loss look's moment is over (the owner's standard)
  if (FX_KINDS.includes(MODE)) return fxMain();    // the FX layer's packs run on their own bench (below the scene's)
  const t0 = Date.now();
  const srv = await serve(opt.root, opt.port);
  BASE = "http://127.0.0.1:" + srv.port + "/";
  browser = await PW.chromium.launch();
  ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  let report;
  try {
    // what the engines can do: the hooks, or the legacy stand-in
    const probe = await bench(ctx);
    const caps = await probe.evaluate(() => window.T82QA.caps());
    await probe.close();
    SHIM = { art: !caps.art, reel: caps.reel && !caps.reelHooks, print: caps.print && !caps.printHooks };
    const engine = SHIM.art || SHIM.reel || SHIM.print
      ? "LEGACY ENGINES (shimmed: " + Object.keys(SHIM).filter((k) => SHIM[k]).join(", ") + "; no prep jobs, no canvas counts)"
      : "reel " + caps.reelVersion + ", print " + caps.printVersion + ", " + caps.index + " indexed variants";
    if (!caps.fonts) log("art-qa: WARNING the theme's faces did not load (offline?): type prints in a fallback face");
    log("art-qa: " + engine + "; out " + OUT);

    // the targets
    const lister = await bench(ctx);
    const lists = {};
    for (const k of KINDS) lists[k] = await lister.evaluate((k) => window.T82QA.list(k), k);
    await lister.close();
    const targets = [];
    if (KINDS.includes(MODE) && pos[1] !== BUILTIN[MODE] && !fileOf(MODE, pos[1]) && !lists[MODE].some((e) => e.id === pos[1])) {
      throw new Error("there is no " + MODE + " variant " + pos[1] + ": no art/" + MODE + "/" + pos[1] + ".js under " + opt.root + ", and art-index.js does not list it");
    }
    if (KINDS.includes(MODE)) targets.push({ kind: MODE, id: pos[1] });
    else if (MODE === "all") (pos[1] ? [pos[1]] : KINDS).forEach((k) => {
      lists[k].forEach((e) => targets.push({ kind: k, id: e.id }));
      // a file an author has not indexed yet (node tools/art-index.js) is checked too, and the report says so
      const dir = path.join(opt.root, "art", k);
      if (fs.existsSync(dir)) fs.readdirSync(dir).filter((f) => /^[a-z0-9-]+\.js$/.test(f)).map((f) => f.slice(0, -3))
        .filter((id) => !lists[k].some((e) => e.id === id)).forEach((id) => targets.push({ kind: k, id }));
    });
    else KINDS.forEach((k) => targets.push({ kind: k, id: BUILTIN[k] }));
    const variants = [], rowsIn = { loss: [], dots: [], scene: [] };
    for (const kind of KINDS) {
      const mine = targets.filter((t) => t.kind === kind).map((t) => t.id);
      if (!mine.length) continue;
      // the built-in is always timed (every budget is a ratio to it); it is pictured and reported in all and baseline
      const ids = [BUILTIN[kind], ...mine.filter((id) => id !== BUILTIN[kind])];
      const show = MODE === "all" || MODE === "baseline" ? ids : mine;
      const renders = {};
      for (const id of show) {
        const dir = path.join(OUT, kind);
        fs.mkdirSync(dir, { recursive: true });
        log("art-qa: " + kind + " " + id + ": pictures");
        try { renders[id] = await ({ loss: lossRender, dots: dotsRender, scene: sceneRender })[kind](id, dir, {}); }
        catch (e) {
          const msg = String(e && e.message || e).split("\n")[0];
          renders[id] = { loadError: "the bench could not finish it: " + msg, errors: [], warnings: [], images: [], uses: [], cases: {} };
          await closeOpen();
        }
      }
      let timing = {};
      if (!opt.quick) try {
        log("art-qa: " + kind + ": timing " + ids.join(", ") + " at " + opt.throttle + "x, " + opt.reps + " reps");
        if (kind === "loss") timing = await lossTiming(ids, opt.reps);
        else if (kind === "dots") timing = await dotsTiming(ids, opt.reps);
        else {
          const pals = {}, perfect = {}, key = (id) => pals[id] + (perfect[id] ? "+82" : "");
          ids.forEach((id) => { pals[id] = (renders[id] && renders[id].lights || ["golden"])[0]; perfect[id] = !!(renders[id] && renders[id].perfect); });
          const lives = {};
          ids.forEach((id) => { lives[id] = renders[id] && renders[id].live ? renders[id].live.dur : 0; });
          timing = await sceneTiming(ids, opt.reps, pals, perfect, lives);
          // lake again for every painting a variant is timed in that the plain run did not cover (its first light; a
          // perfect scene's 82-0), so each ratio compares the same picture
          const L = BUILTIN.scene, need = [...new Set(ids.filter((id) => id !== L).map(key).filter((k) => k !== key(L)))];
          for (const k of need) {
            const p = k.replace("+82", ""), tl = await sceneTiming([L], opt.reps, { [L]: p }, { [L]: /\+82$/.test(k) });
            timing[L + "@" + k] = tl[L];
          }
          ids.forEach((id) => { if (timing[id]) timing[id].painting = key(id); });
        }
      } catch (e) {
        const msg = String(e && e.message || e).split("\n")[0];
        ids.forEach((id) => { timing[id] = { loadError: "the timing pass failed: " + msg, errors: [], warnings: [] }; });
        await closeOpen();
      }
      for (const id of show) {
        const R = renders[id] || null, m = timing[id] || null, f = id === BUILTIN[kind] ? null : fileOf(kind, id);
        let b = timing[BUILTIN[kind]] || null;
        if (kind === "scene" && m && m.painting && timing[BUILTIN.scene + "@" + m.painting]) b = timing[BUILTIN.scene + "@" + m.painting];
        const bytes = f ? fs.statSync(f).size : null;
        const verdict = ({ loss: lossVerdict, dots: dotsVerdict, scene: sceneVerdict })[kind](id, m && !m.loadError ? m : null, b, R, bytes);
        const errors = [].concat(R ? R.errors : [], m ? m.errors : [], R && R.loadError ? ["did not load: " + R.loadError] : [], m && m.loadError ? ["did not load (timing): " + m.loadError] : []);
        const warnings = [].concat(R ? R.warnings : [], m && m.warnings ? m.warnings : []);
        verdict.push({ key: "errors", label: "no console errors", value: errors.length, pass: errors.length === 0 });
        // the engines warn when they retire a variant that threw (it falls back to the built-in for the visit); a
        // browser's own warnings are listed in the report but pass
        const retired = warnings.filter((w) => ENGINE_WARN.test(w));
        verdict.push({ key: "warnings", label: "no engine warnings (a throw retires it)", value: retired.length, pass: retired.length === 0 });
        const entry = lists[kind].find((e) => e.id === id) || {};
        const def = R && R.def || {};
        const v = { kind, id, builtin: id === BUILTIN[kind], on: entry.on !== false, name: def.name || entry.name || id, by: def.by || "", file: f, fileBytes: bytes,
          budgets: verdict, timing: m, render: R ? { cases: R.cases, months: R.months, lights: R.lights, perfect: R.perfect, sameAsLake: R.sameAsLake, posterMs: R.posterMs, uses: R.uses, off: R.off, live: R.live } : null,
          errors, warnings, images: R ? R.images : [], full: R && (R.banners || R.full) || [] };
        v.pass = !verdict.some((x) => x.pass === false);
        v.notes = [];
        if (!v.builtin && !lists[kind].some((e) => e.id === id)) v.notes.push("not in art-index.js yet (node tools/art-index.js): the game cannot deal it");
        if (!v.builtin && entry.on === false) v.notes.push("off in art/enabled.json: the lab shows it, the game does not deal it");
        verdict.filter((x) => x.pass === null && / is over/.test(x.label)).forEach((x) => v.notes.push(x.label.replace(/ \(the built-in.*$/, "") + ": " + fmtNum(x.value, x.unit) + " (the built-in is over; it sets the reference)"));
        v.summary = summarize(kind, v, b);
        variants.push(v);
        if (R && R.frames) rowsIn[kind].push({ id, frames: R.frames, played: R.cases ? Object.fromEntries(Object.keys(R.cases).map((k) => [k, id === BUILTIN.loss || R.cases[k].played])) : null });
      }
    }
    // WebKit
    if (opt.webkit) {
      log("art-qa: WebKit pass");
      const wk = await webkitErrors(variants.map((v) => ({ kind: v.kind, id: v.id })));
      variants.forEach((v) => {
        const e = wk[v.kind + ":" + v.id] || [];
        v.webkitErrors = e;
        v.budgets.push({ key: "webkit", label: "WebKit: no errors, and it printed itself", value: e.length ? e.length + " problems" : "clean", pass: e.length === 0 });
        if (e.length) v.pass = false;
      });
    }
    // the rows: every variant of a kind side by side (the contract's "10 in a row")
    const rows = [];
    if (MODE === "all" || MODE === "baseline") {
      for (const kind of KINDS) {
        const list = rowsIn[kind];
        if (list.length < 2 && MODE !== "baseline") continue;
        if (!list.length) continue;
        const f = path.join(OUT, "row-" + kind + ".png");
        if (kind === "loss") {
          for (const k of LOSS_CASES) {
            const fk = path.join(OUT, "row-loss-" + k + ".png");
            await sheet(fk, { title: "every loss \u00B7 " + k, sub: "Each variant's frame at e = 0.35 s (the 0.29 s moment: its read frame).", sections: [{ cols: 4, cells: list.filter((x) => x.frames[k]).map((x) => ({ src: dataURL(x.frames[k]), label: x.id, sub: x.played && x.played[k] === false ? "(classic played)" : "", w: 260 })) }] });
            rows.push(fk);
          }
        } else if (kind === "dots") {
          await sheet(f, { title: "every dot set", sub: "November of the 70-12 ledger, settled, in the live reel.", sections: [{ cols: 2, cells: list.filter((x) => x.frames.ledger).map((x) => ({ src: dataURL(x.frames.ledger), label: x.id, w: 339 })) }] });
          rows.push(f);
        } else {
          await sheet(f, { dsf: 2, title: "every scene", sub: "64-18 in each scene's first light.", sections: [{ cols: 2, cells: list.map((x) => ({ src: dataURL(x.frames.banner), label: x.id, w: 375 })) }] });
          rows.push(f);
        }
      }
    }
    report = { tool: "tools/art-qa.mjs", when: new Date().toISOString(), mode: MODE + (pos[1] ? " " + pos[1] : ""), root: opt.root, engine, caps,
      throttle: opt.throttle, reps: opt.reps, quick: opt.quick, seconds: Math.round((Date.now() - t0) / 1000), budgets: BUDGET,
      passed: variants.filter((v) => v.pass).length, failed: variants.filter((v) => !v.pass).length, rows, variants };
    fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 1));
    const idx = writeIndex(report);
    // the short human summary
    log("");
    variants.forEach((v) => {
      log((v.pass ? "PASS " : "FAIL ") + v.kind + " " + v.id + (v.builtin ? " (built-in)" : "") + ": " + v.summary);
      v.budgets.filter((b) => b.pass === false).forEach((b) => log("     FAIL " + b.label + ": " + (b.ratio != null ? fmtX(b.ratio) + " (" + fmtNum(b.value, b.unit) + " vs " + fmtNum(b.base, b.unit) + ")" : fmtNum(b.value, b.unit))));
      v.errors.slice(0, 4).forEach((e) => log("     error: " + e.slice(0, 200)));
      v.notes.forEach((n) => log("     note: " + n));
      v.images.forEach((f) => log("     " + f));
    });
    rows.forEach((f) => log("row: " + f));
    log("report: " + path.join(OUT, "report.json"));
    log("index:  " + idx + "  (" + report.seconds + " s)");
  } finally {
    for (const k in sheetCtx) await sheetCtx[k].close().catch(() => {});
    await browser.close().catch(() => {});
    await srv.close();
  }
  const bad = report.variants.some((v) => !v.pass) && MODE !== "baseline";
  process.exit(bad ? 1 : 0);
}
function summarize(kind, v, b) {
  const m = v.timing, parts = [];
  if (kind === "loss") {
    if (m && !m.loadError) parts.push("frame " + fmtMs(m.frame.avg) + " avg, " + fmtMs(m.frame.p95) + " p95, " + fmtMs(m.frame.max) + " max" +
      (m.moment ? " (the moment alone " + fmtMs(m.moment.avg) + (v.builtin || m.moment.ratio == null ? "" : ", " + fmtX(m.moment.ratio) + " classic's") + "; the floor " + fmtMs(m.moment.floor) + ")" : ""),
      "prep " + Math.round(m.jobs.n) + " jobs, max " + fmtMs(m.jobs.max) + ", total " + fmtMs(m.prepTotal), "canvases " + fmtB(m.canvasPeak) + " (after " + fmtB(m.canvasAfter) + ")", "stamp " + fmtMs(m.stampMs));
    if (v.render && v.render.cases) parts.push("holds " + LOSS_CASES.map((k) => v.render.cases[k] ? (v.render.cases[k].hold / 1000).toFixed(2) + " s" : "?").join("/"));
  } else if (kind === "dots") {
    if (m && !m.loadError) parts.push("moving frame " + fmtMs(m.frame.avg) + " avg, " + fmtMs(m.frame.p95) + " p95 (" + m.frame.n + " frames)", "settled season " + fmtMs(m.settled));
  } else if (m && !m.loadError) parts.push("bake " + fmtMs(m.bake) + (m.painting ? " (" + m.painting.replace("+82", ", 82-0") + ")" : ""), "mount " + fmtMs(m.mount), "reveal frame " + fmtMs(m.frame.avg) + " avg, " + fmtMs(m.frame.p95) + " p95" +
    (m.live && m.live.n ? "; live frame " + fmtMs(m.live.avg) + " avg, " + fmtMs(m.live.p95) + " p95" : ""));
  if (v.fileBytes != null) parts.push(fmtB(v.fileBytes));
  if (m && m.noise != null) parts.push("noise \u00B1" + Math.round(m.noise * 50) + "%");
  parts.push(v.errors.length + " errors");
  return parts.join("; ");
}

main().catch((e) => { console.error("art-qa: " + (process.env.DEBUG ? e && e.stack : e && e.message || e)); process.exit(1); });
