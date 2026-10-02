/* Jackpot, a Presti perk pack (art/CONTRACT-FX.md). Three slot reels pop up out of the three cost buttons, one over
   each, and spin their printed strips (a double hit trailing them) before landing left to right with a clunk and an
   overshoot. refund: they land $ $ $ (white $, green fringe, green frames, bulbs chasing); a payline flashes, rings
   and coins spray. sale: they land flames, which burst out of the three windows. Then the reels drop back into the
   buttons. Frames and strips are prepped sprites, scrolled by source rect (straight copies). Inks: good + pop +
   light; hot + dusk + light. About 1.45 s. */
(function () {
  "use strict";
  var TAU = Math.PI * 2, DUR = 1.45, UW = 94, UH = 124, CW = 68, CH = 84, LAND = [0.4, 0.62, 0.84], DT = [504, 672, 840];
  function u1(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function co(g, m) { g.globalCompositeOperation = m; }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function leaf(g, x, y, w, h, l) {
    g.beginPath(); g.moveTo(x - w, y); g.bezierCurveTo(x - w * 1.15, y - h * 0.4, x - w * 0.1, y - h * 0.5, x + l, y - h);
    g.bezierCurveTo(x + w * 0.2, y - h * 0.5, x + w * 1.2, y - h * 0.4, x + w, y); g.closePath();
  }
  // plates [ink, tone, dx, dy] screened a job each (P() the shared plate), then printed onto the first at their misses
  function press(K, P, L, done) {
    var cs = [], jobs = [];
    L.forEach(function (a, i) { jobs.push(function () { cs[i] = K.screen(P(), a[0], a[1]); }); });
    jobs.push(function () {
      var x = cs[0].getContext("2d"), i;
      co(x, K.blend);
      for (i = 1; i < cs.length; i++) { x.drawImage(cs[i], Math.round(L[i][2] * K.d), Math.round(L[i][3] * K.d)); cs[i].width = 0; }
      done(cs[0]);
    });
    return jobs;
  }
  // symbol k (0 target, 1 seven, 2 bar, 3 diamond, 4 star) centered in its 68 x 84 cell, offset (x, y), at coverage a
  function sym(K, g, k, x, y, a) {
    var i, r;
    x += CW / 2; y += CH / 2; g.fillStyle = K.tone(a);
    if (k < 2) { K.text(g, k ? "7" : "$", x, y + 2, { cov: a, font: K.font(900, k ? 74 : 80, "disp"), base: "middle" }); return; }
    g.beginPath();
    if (k === 2) for (i = 0; i < 3; i++) g.rect(x - 26, y - 25 + i * 18, 52, 12);
    else if (k === 3) { g.moveTo(x, y - 36); g.lineTo(x + 28, y); g.lineTo(x, y + 36); g.lineTo(x - 28, y); } else for (i = 0; i < 10; i++) { r = i & 1 ? 15 : 34; g.lineTo(x + Math.sin(i * TAU / 10) * r, y - Math.cos(i * TAU / 10) * r); }
    g.closePath(); g.fill();
  }
  function cell(K, k, ink, edge, tgt) {            // a decoy: the symbol and an edge crescent; the target: light over a crescent (a flame: three plates)
    if (tgt && edge === "dusk") return [["dusk", function (g) { leaf(g, 34, 74, 26, 66, 6); g.fillStyle = K.tone(0.9); g.fill(); }, 0, 0], ["hot", function (g) { leaf(g, 34, 74, 16, 48, 4); g.fillStyle = K.tone(0.92); g.fill(); }, 2, -2], ["light", function (g) { leaf(g, 34, 74, 7, 26, 2); g.fillStyle = K.tone(0.92); g.fill(); }, 3, -3]];
    return [[tgt ? "light" : ink, function (g) { sym(K, g, k, 0, 0, 0.92); }, 0, 0], [edge, function (g) { sym(K, g, k, 4, 3, 0.85); co(g, "destination-out"); sym(K, g, k, 0, 0, 1); }, 0, 0]];
  }
  function frame(K, a, b) {                         // the reel's body: window and bulbs carved, an edge crescent, a light bezel
    function body(g) { rr(g, 3, 3, 86, 116, 10); }
    return [[a, function (g) { body(g); g.fillStyle = K.tone(0.93); g.fill(); co(g, "destination-out"); g.fillStyle = K.tone(1); rr(g, 12, 28, CW, CH, 5); g.fill(); for (var i = 0; i < 5; i++) { g.beginPath(); g.arc(20 + 13 * i, 15, 3.4, 0, TAU); g.fill(); } }, 0, 0],
      [b, function (g) { g.save(); g.translate(4, 3); body(g); g.fillStyle = K.tone(0.85); g.fill(); g.restore(); co(g, "destination-out"); g.fillStyle = K.tone(1); body(g); g.fill(); }, 0, 0],
      ["light", function (g) { rr(g, 11, 27, CW + 2, CH + 2, 6); g.lineWidth = 2.4; g.strokeStyle = K.tone(0.9); g.stroke(); }, 0, 0]];
  }
  function flamePlates(K, l) {
    function f(w, h, k) { return function (g) { leaf(g, 20, 64, w, h, l * k); g.fillStyle = K.tone(0.9); g.fill(); }; }
    return [["dusk", f(13, 58, 1), 0, 0], ["hot", f(8, 42, 0.7), 1, -1], ["light", f(3.4, 22, 0.4), 1.5, -1.5]];
  }
  function win(K, S, key, s, dx, dy) {              // the strip as seen through a window at scroll s: straight copies, wrapping
    var d = K.d, g = K.g, H = S[key].height, h = Math.round(CH * d), y = ((Math.round(s * d) % H) + H) % H, n = Math.min(h, H - y);
    g.drawImage(S[key], 0, y, S[key].width, n, dx, dy, CW, n / d);
    if (n < h) g.drawImage(S[key], 0, 0, S[key].width, h - n, dx, dy + n / d, CW, (h - n) / d);
  }
  function fl(K, x, y, w, h, i, eh) { var k = w / 13, m = h / 58; K.g.drawImage(K.st["f" + ((i + eh) & 1)], x - 20 * k, y - 64 * m, 40 * k, 70 * m); }
  function run(K, ev, e, c) {
    var g = K.g, S = K.st, d = K.d, FY = ev.y, i, j, k, eh = Math.floor(e * 12), lit = [], wn = e > LAND[2] + 0.06, fv = u1((e - 0.92) / 0.12) * (1 - u1((e - 1.18) / 0.14));
    g.save(); g.beginPath(); g.rect(0, 0, ev.W, FY + 3); g.clip(); g.imageSmoothingEnabled = false; co(g, K.blend);
    for (i = 0; i < 3; i++) {
      var bx = ev.x + ev.w * (2 * i + 1) / 6, q = u1(e / LAND[i]), s = DT[i] * (1 - K.ease.back(q)), rise = u1((e - 0.04 * i) / 0.14), out = u1((e - 1.2 - 0.03 * i) / 0.22);
      var ux = Math.round(bx - UW / 2), uy = Math.round(FY - 8 - UH + (1 - K.ease.back(rise)) * (UH + 12) + out * out * (UH + 16) - (wn ? 6 * Math.sin(Math.PI * u1((e - LAND[2] - 0.06 - 0.04 * i) / 0.2)) : 0));
      if (!S[c.strip] || !S[c.fr]) continue;
      win(K, S, c.strip, s, ux + 12, uy + 28);
      if (q < 0.5) win(K, S, c.strip, s + 16, ux + 12, uy + 28);   // the double hit trailing a fast reel
      g.drawImage(S[c.fr], ux, uy, UW, UH);
      for (k = 0; k < 5; k++) if (wn ? ((eh >> 1) + k) & 1 : (eh + k) % 3 === 0) lit.push(ux + 20 + 13 * k, uy + 15, 3.3);
      if (wn && c.pay && (eh >> 1) & 1) { g.fillStyle = K.pat("light", 0.9); g.fillRect(ux + 12, uy + 28 + CH / 2 - 2, CW, 4); }
      if (fv > 0 && c.fire) for (j = 0; j < 3; j++) fl(K, ux + 22 + 25 * j, uy + 12, 13 * fv, (50 + 18 * Math.sin(eh * 2.1 + i * 3 + j) + 10 * (j & 1)) * fv, i + j, eh);
    }
    K.dots(g, "light", 0.95, lit);
    g.restore();
    for (i = 0; i < 3; i++) K.ring({ x: ev.x + ev.w * (2 * i + 1) / 6, y: FY - 20, r0: 8, r1: 60, w0: 5, ink: c.a, cov: 0.8, dur: 0.28, delay: LAND[i] });
    K.ring({ x: ev.cx, y: FY - 60, r0: 10, r1: 170, w0: 9, ink: c.a, cov: 0.9, dur: 0.45, delay: LAND[2] + 0.04 });
    K.ring({ x: ev.cx, y: FY - 60, r0: 8, r1: 210, w0: 5, ink: c.b, cov: 0.65, dur: 0.55, delay: LAND[2] + 0.1 });
    K.spark({ x: ev.cx, y: FY - 120, n: 26, ink: function (r) { var v = r(); return v < 0.25 ? "light" : v < 0.6 ? c.b : c.a; }, sp: [140, 380], r: [1.8, 4.2], life: [0.45, 0.3], grav: 620, dir: -Math.PI / 2, cone: 3, seed: ev.seed, delay: LAND[2] + 0.04, streak: true });
    if (e > LAND[2]) { K.shake(ev.box, 0.4, 6); K.flash(0.22, c.a); }
  }
  window.T82ART.add("perk", "jackpot", {
    name: "Jackpot",
    by: "Three slot reels pop out of the cost buttons and land $ $ $ (a refund) or three flames that burst into fire (a fire sale).",
    prep: function (K) {
      var st = K.st, pc, pf, pl, jobs = [function () { pc = K.plate(CW, CH, 7401); pf = K.plate(UW, UH, 7402); pl = K.plate(40, 70, 7403); }];
      function strip(key, ink, edge) {
        function put(k) { return function (c) { var S = st[key]; if (!S) { S = st[key] = document.createElement("canvas"); S.width = Math.round(CW * K.d); S.height = Math.round(5 * CH * K.d); } S.getContext("2d").drawImage(c, 0, Math.round(k * CH * K.d)); c.width = 0; }; }
        for (var k = 0; k < 5; k++) jobs = jobs.concat(press(K, function () { return pc; }, cell(K, k, ink, edge, !k), put(k)));
      }
      function one(key) { return function (c) { st[key] = c; }; }
      strip("sr", "good", "pop"); strip("ss", "hot", "dusk");
      jobs = jobs.concat(press(K, function () { return pf; }, frame(K, "good", "pop"), one("fr")), press(K, function () { return pf; }, frame(K, "hot", "dusk"), one("fs")),
        press(K, function () { return pl; }, flamePlates(K, 5), one("f0")), press(K, function () { return pl; }, flamePlates(K, -5), one("f1")));
      return jobs;
    },
    slots: {
      refund: { dur: DUR, draw: function (K, ev, e) { run(K, ev, e, { strip: "sr", fr: "fr", a: "good", b: "pop", pay: 1 }); } },
      sale: { dur: DUR, draw: function (K, ev, e) { run(K, ev, e, { strip: "ss", fr: "fs", a: "hot", b: "dusk", fire: 1 }); } }
    }
  });
})();
