/* TRUE 82: the home screen's QA (v59, "Halftone v2"). Needs the local site with its API and D1 (the
   site-api2 entry in .claude/launch.json, :8790) and Playwright (the draft-chime.js copy by default).
     node tools/home-qa.js widths   320/375/390/440 in Chromium and WebKit: no sideways scroll, where the
                                    vote buttons land, and that no home button got the 3D decorator's skin
     node tools/home-qa.js frames   the vote reward frozen at set moments (one vote, then the fifth)
     node tools/home-qa.js flow     five votes (YES, NO, IDK, YES, NO), Finish, then Keep going opens /bonuses/ (v60)
                                    with the count carried on and none of the five calls dealt again
     node tools/home-qa.js calm     prefers-reduced-motion: the end state at once, nothing running
     node tools/home-qa.js played   the Daily door once today's run is in (a fake local record, removed after)
   Screenshots land in $OUT (default: /tmp/t82-home-qa). Votes go to the LOCAL D1 only. */
const PW = process.env.PLAYWRIGHT || "/Users/ggz/tennis-puzzle-prototypes/backdrop-studio/node_modules/playwright";
const { chromium, webkit } = require(PW);
const OUT = process.env.OUT || "/tmp/t82-home-qa";
const BASE = process.env.BASE || "http://localhost:8790/";
require("fs").mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function ready(page) {
  await page.waitForSelector("#traitsModule:not([hidden])", { timeout: 15000 });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await sleep(300);
}
async function measure(page) {
  return page.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.top + scrollY), Math.round(b.bottom + scrollY)]; };
    const decorated = [...document.querySelectorAll(".hm button")].filter((b) => b.classList.contains("presti-spin")).map((b) => b.id || b.className);
    return { sw: document.documentElement.scrollWidth, iw: innerWidth, tag: r(".hm-tag"), classic: r("#startClassic"), poll: r(".hm-card"), yes: r("#tmYes"), archive: r("#dailyArchiveBtn"), decorated };
  });
}
(async () => {
  const which = process.argv[2] || "all";
  const report = {};
  if (which === "all" || which === "widths") {
    for (const [name, eng] of [["chromium", chromium], ["webkit", webkit]]) {
      const browser = await eng.launch();
      for (const w of [320, 375, 390, 440]) {
        const page = await browser.newPage({ viewport: { width: w, height: w === 375 ? 667 : 844 }, deviceScaleFactor: 2 });
        await page.goto(BASE + "?qa=" + w);
        await ready(page);
        report[name + "@" + w] = await measure(page);
        await page.screenshot({ path: `${OUT}/${name}-${w}.png`, fullPage: true });
        await page.close();
      }
      await browser.close();
    }
  }
  if (which === "all" || which === "frames") {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
    await page.goto(BASE + "?qa=frames");
    await ready(page);
    const card = await page.$(".hm-card");
    const box = await card.boundingBox();
    for (const [label, idx, last, t] of [["n1-080", 0, false, 80], ["n1-200", 0, false, 200], ["n1-380", 0, false, 380], ["n1-600", 0, false, 600],
                                       ["n5-120", 4, true, 120], ["n5-300", 4, true, 300], ["n5-520", 4, true, 520]]) {
      await page.evaluate(({ idx, last, t }) => {
        document.getAnimations().forEach((a) => a.cancel());
        document.querySelectorAll(".hm-burst,.hm-spray").forEach((n) => n.remove());
        const row = document.getElementById("tmDots");
        [...row.children].forEach((m, k) => { m.className = k <= idx ? "on" : ""; });
        TM.n = idx + 1;
        tmPrint(row, row.children[idx], last);
        void row.offsetWidth;
        document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; });
      }, { idx, last, t });
      await page.screenshot({ path: `${OUT}/frame-${label}.png`, clip: { x: box.x + box.width - 170, y: box.y - 40, width: 180, height: 110 } });
    }
    await browser.close();
  }
  if (which === "all" || which === "flow") {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 2 });
    await page.goto(BASE + "?qa=flow");
    await ready(page);
    const shotCard = async (label) => {
      const c = await page.$(".hm-poll");
      await c.scrollIntoViewIfNeeded();
      await sleep(80);
      await c.screenshot({ path: `${OUT}/flow-${label}.png` });
    };
    await shotCard("0-ask");
    const plan = ["tmYes", "tmNo", "tmIdk", "tmYes", "tmNo"];
    for (let k = 0; k < plan.length; k++) {
      await page.click("#" + plan[k]);
      await page.waitForSelector("#tmRes:not([hidden])", { timeout: 8000 });
      await sleep(1100);
      const st = await page.evaluate(() => ({ tally: document.getElementById("tmTally").textContent, you: document.getElementById("tmYou").textContent, next: document.getElementById("tmNext").textContent, dia: document.getElementById("tmDots").getAttribute("aria-label"), err: document.getElementById("tmErr").hidden ? "" : document.getElementById("tmErr").textContent, url: location.href }));
      report["vote" + (k + 1)] = st;
      await shotCard(`${k + 1}-result`);
      await sleep(400);   // the server's 1.2s vote fence
      await page.click("#tmNext");
      await sleep(500);
    }
    report.done = await page.evaluate(() => ({ title: document.getElementById("tmDoneT").textContent, doneShown: !document.getElementById("tmDone").hidden, url: location.href }));
    await shotCard("6-done");
    const five = await page.evaluate(() => TM.qs.map((q) => q.id));
    let deal = "";
    page.on("request", (r) => { if (r.url().includes("op=session") && r.url().includes("/api/traits")) deal = decodeURIComponent(r.url()); });
    await Promise.all([page.waitForNavigation({ timeout: 10000 }), page.click("#tmAgain")]);
    await page.waitForSelector("#qcard", { timeout: 15000 });
    await sleep(700);
    report.again = await page.evaluate(() => ({ url: location.pathname + location.search, count: document.getElementById("pbCount").textContent,
      q: document.querySelector("#qcard .q").textContent }));
    report.again.skipsTheFive = five.every((id) => deal.indexOf(id) >= 0);
    await page.screenshot({ path: `${OUT}/flow-7-bonuses.png` });
    await browser.close();
  }
  if (which === "all" || which === "calm") {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(BASE + "?qa=calm");
    await ready(page);
    await page.click("#tmIdk");
    await page.waitForSelector("#tmRes:not([hidden])");
    await sleep(60);
    report.calm = await page.evaluate(() => ({ bursts: document.querySelectorAll(".hm-burst,.hm-spray").length, rolling: document.getElementById("tmBar").classList.contains("is-rolling"),
      running: document.getAnimations().filter((a) => a.playState === "running").map((a) => a.animationName), pct: document.getElementById("tmTally").textContent }));
    await browser.close();
  }
  if (which === "all" || which === "played") {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 2 });
    await page.goto(BASE + "?qa=played");
    await ready(page);
    const info = await page.evaluate(() => { const key = T82DAILY.dayKey(); const b = T82DAILY.boardFor(key); return { key, num: b.num }; });
    await page.evaluate(({ key, num }) => {
      localStorage.setItem("t82_daily1", JSON.stringify({ official: { [key]: { num, wins: 64, net: 8.2, five: [], nonce: "qa" } }, archive: {}, streak: { count: 3, lastKey: key } }));
    }, info);
    await page.reload();
    await ready(page);
    const d = await page.$("#homeDaily");
    await d.screenshot({ path: `${OUT}/daily-played.png` });
    report.played = await page.evaluate(() => document.getElementById("homeDaily").innerText);
    await page.evaluate(() => localStorage.removeItem("t82_daily1"));
    await browser.close();
  }
  console.log(JSON.stringify(report, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
