/* TRUE 82: QA for the results screen and the vote room (v60). Needs the local site with its API and D1
   (a wrangler pages dev entry in .claude/launch.json, e.g. site-api3 on :8791) and Playwright (the draft-chime.js copy).
     node tools/results-qa.js results [w]   a Classic season auto-drafted to results; full-page shot + the Scoring Card's box
     node tools/results-qa.js sheet [w]     the "+" tag sheet: open it, add a tile, take one off; the card follows, votes post
     node tools/results-qa.js hint [w]      v63's printed "+" hint: on the first card only, on every results screen, and a
                                            real "+" tap still opens the tag sheet
     node tools/results-qa.js room [w]      /bonuses/ from the home card (n=5): five votes, frames of the stamp (the vote
                                            reply held back, animations frozen), the count and diamonds, no sideways scroll
   Screenshots land in $OUT (default: /tmp/t82-results-qa). Votes go to the LOCAL D1 only. */
const PW = process.env.PLAYWRIGHT || "/Users/ggz/tennis-puzzle-prototypes/backdrop-studio/node_modules/playwright";
const { chromium } = require(PW);
const OUT = process.env.OUT || "/tmp/t82-results-qa";
const BASE = process.env.BASE || "http://127.0.0.1:8791/";
require("fs").mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Play a season to the results screen: the best (or worst) legal pick each round, the reel skipped.
async function toResults(page, o) {
  o = o || {};
  await page.goto(BASE);
  await page.waitForFunction(() => typeof DATA_READY !== "undefined" && DATA_READY, null, { timeout: 30000 });
  await page.evaluate((o) => {
    newGame(o.mode || "classic");
  }, o);
  for (let r = 0; r < 5; r++) {
    await sleep(700);
    const ok = await page.evaluate((worst) => {
      let best = null, bv = worst ? 1e9 : -1e9;
      document.querySelectorAll(".player-row[data-name]").forEach((n) => {
        const name = n.getAttribute("data-name"), row = resolveRow(name);
        if (!row || pickBlock(row)) return;
        const v = row[IDX.bpm_star];
        if (worst ? v < bv : v > bv) { bv = v; best = name; }
      });
      if (!best) return false;
      G.selected = best;
      confirmPick(rowOpenBuckets(resolveRow(best)).filter((b) => bucketLegal(resolveRow(best), b))[0]);
      return true;
    }, !!o.worst);
    if (!ok) throw new Error("no legal pick in round " + (r + 1));
  }
  for (let i = 0; i < 60; i++) {
    await sleep(250);
    const st = await page.evaluate(() => {
      const skip = document.querySelector(".reel-skip, .reel-done");
      if (skip) { skip.click(); return "skip"; }
      return document.querySelector('[data-result-section="roster"]') ? "results" : "";
    });
    if (st === "results") break;
  }
  await page.waitForSelector('[data-result-section="roster"]', { timeout: 20000 });
  await sleep(o.settle == null ? 3000 : o.settle);
}

async function results(w) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: w, height: 740 }, deviceScaleFactor: 2 });
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await toResults(page);
  await page.screenshot({ path: `${OUT}/results-${w}.png`, fullPage: true });
  const r = await page.evaluate(() => {
    const L = document.querySelector(".ledger"), t = document.querySelector(".ledger-row.total");
    const lb = L.getBoundingClientRect(), tb = t.getBoundingClientRect(), cs = getComputedStyle(L);
    return { ledgerClips: cs.overflow === "hidden", totalInside: tb.bottom <= lb.bottom + 0.5, sw: document.documentElement.scrollWidth, iw: innerWidth };
  });
  console.log(JSON.stringify(r));
  await browser.close();
}

async function sheet(w) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: w, height: 740 }, deviceScaleFactor: 2 });
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  const posts = [];
  page.on("request", (r) => { if (r.method() === "POST" && r.url().includes("/api/traits")) posts.push(JSON.parse(r.postData()).response); });
  await toResults(page, { settle: 3500 });
  const cardTags = () => page.evaluate(() => document.querySelector('.bt-tags[data-bt]').innerText.replace(/\s+/g, " "));
  const before = await cardTags();
  await page.evaluate(() => document.querySelector(".rr .bt-card .bt-tag.add").click());
  await sleep(700);
  await page.screenshot({ path: `${OUT}/sheet-open-${w}.png` });
  const addId = await page.evaluate(() => document.querySelector("#btSheet .bt-tog:not(.is-lit)").getAttribute("data-trait"));
  await page.click(`#btSheet .bt-tog[data-trait="${addId}"]`);
  await sleep(1800);
  const remId = await page.evaluate((a) => [...document.querySelectorAll("#btSheet .bt-tog.is-lit:not(.is-implied)")].map((t) => t.getAttribute("data-trait")).filter((t) => t !== a)[0], addId);
  await page.click(`#btSheet .bt-tog[data-trait="${remId}"]`);
  await sleep(1800);
  await page.screenshot({ path: `${OUT}/sheet-after-${w}.png` });
  const st = await page.evaluate(({ addId, remId }) => ({
    added: document.querySelector(`#btSheet .bt-tog[data-trait="${addId}"]`).classList.contains("is-lit"),
    removed: !document.querySelector(`#btSheet .bt-tog[data-trait="${remId}"]`).classList.contains("is-lit"),
    tally: document.querySelector(`#btSheet .bt-tog[data-trait="${addId}"] .bt-tog-tally`).textContent,
    overflow: [...document.querySelectorAll("#btSheet .bt-tog")].filter((t) => t.querySelector(".bt-tag").getBoundingClientRect().right > t.getBoundingClientRect().right).length
  }), { addId, remId });
  st.cardBefore = before; st.cardAfter = await cardTags(); st.posts = posts;
  console.log(JSON.stringify(st, null, 1));
  await browser.close();
}

async function hint(w) {
  // v63: the "+" hint is printed on the first card (no timers, no scroll logic, nothing that retires): it is there on
  // every results screen, only on the first card, and a real "+" tap still opens the tag sheet.
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: w, height: 667 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await toResults(page, { settle: 600 });
  const first = await page.evaluate(() => [...document.querySelectorAll(".rr .bt-card")].map((c) => !!c.querySelector(".bt-hint")));
  await page.evaluate(() => { const c = document.querySelector(".rr .bt-card"); c.scrollIntoView({ block: "start" }); window.scrollBy(0, -12); });
  await sleep(500);
  await page.screenshot({ path: `${OUT}/hint-${w}.png` });
  await page.evaluate(() => document.querySelector(".rr .bt-card .bt-tag.add").click());
  await sleep(500);
  const sheetOpen = await page.evaluate(() => !!document.querySelector(".bt-sheet.on"));
  await toResults(page, { settle: 600 });
  const again = await page.evaluate(() => !!document.querySelector(".rr .bt-card .bt-hint"));
  console.log(JSON.stringify({ hintOnCards: first, sheetOpensFromPlus: sheetOpen, hintOnNextScreen: again,
    sideways: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1) }));
  await browser.close();
}

async function room(w) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: w, height: 760 }, deviceScaleFactor: 2 });
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  let hold = true;
  await page.route("**/api/traits", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    while (hold) await sleep(50);
    return route.continue();
  });
  await page.goto(BASE + "bonuses/?src=home_more&n=5");
  await page.waitForSelector("#qcard [data-v]", { timeout: 20000 });
  await sleep(700);
  await page.screenshot({ path: `${OUT}/room-0-${w}.png` });
  await page.click('#qcard [data-v="yes"]');
  for (const t of [90, 180, 320]) {                    // the first vote's stamp, frozen, while its reply is held
    await page.evaluate((t) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; }), t);
    await page.screenshot({ path: `${OUT}/room-stamp-${t}-${w}.png` });
  }
  await page.evaluate(() => document.getAnimations().forEach((a) => a.play()));
  hold = false;
  const answers = ["yes", "no", "unsure", "yes", "no"];
  for (let i = 0; i < 5; i++) {
    if (i) { await page.waitForSelector("#qcard [data-v]", { timeout: 20000 }); await sleep(250); await page.click(`#qcard [data-v="${answers[i]}"]`); }
    await page.waitForSelector(".pb-res", { timeout: 20000 });
    await sleep(i === 4 ? 1600 : 900);
    if (i < 4) await page.click("#nextBtn");
  }
  await page.screenshot({ path: `${OUT}/room-done-${w}.png` });
  console.log(JSON.stringify(await page.evaluate(() => ({ count: document.getElementById("pbCount").textContent,
    diamonds: [...document.querySelectorAll("#pbDias i")].filter((i) => i.classList.contains("on")).length,
    head: document.getElementById("pbDoneHead") && document.getElementById("pbDoneHead").textContent,
    sw: document.documentElement.scrollWidth, iw: innerWidth }))));
  await browser.close();
}

(async () => {
  const which = process.argv[2] || "results", w = +(process.argv[3] || 375);
  if (which === "results") await results(w);
  else if (which === "sheet") await sheet(w);
  else if (which === "hint") await hint(w);
  else if (which === "room") await room(w);
  else throw new Error("unknown check: " + which);
})().catch((e) => { console.error(e); process.exit(1); });
