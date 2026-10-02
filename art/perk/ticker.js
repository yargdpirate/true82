/* Ticker, a Presti perk pack (art/CONTRACT-FX.md). refund: three bands of green ticker tape (perforated, +$1M carved
   out, a white arrow up, an aqua underline a drum's miss off) slam across the board from alternating sides, crawl, and a
   big +$1M pops over them before they zip away. sale: a price chart draws itself over a dot grid, climbs in zigzags
   (the area a dot-size ramp), peaks, plunges to the floor in flames, -$2 slams in, then it sinks into the buttons.
   Tape, chart and flames are prepped sprites. Inks: good + pop + light; hot + dusk + light. */
(function () {
  "use strict";
  var TAU = Math.PI * 2, DUR = 1.45, TILE = 140, BH = 30, DW = 336, CH = 160, NS = 6;
  var PT = [[0, 0.78], [0.09, 0.64], [0.16, 0.72], [0.25, 0.5], [0.33, 0.6], [0.42, 0.36], [0.5, 0.45], [0.58, 0.22], [0.66, 0.3], [0.72, 0.1], [0.76, 0.18], [0.8, 0.5], [0.84, 0.58], [0.88, 0.97], [1, 0.99]];
  var TT = [0.04, 0.075, 0.11, 0.145, 0.18, 0.215, 0.25, 0.285, 0.32, 0.36, 0.42, 0.48, 0.51, 0.58, 0.65];
  function u1(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function co(g, m) { g.globalCompositeOperation = m; }
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
  function tx(K, g, s, x, y, px, cov) { K.text(g, s, x, y, { cov: cov, spacing: 3, font: K.font(900, px, "disp"), base: "middle" }); }
  function flamePlates(K, l) {
    function f(w, h, k) { return function (g) { leaf(g, 20, 64, w, h, l * k); g.fillStyle = K.tone(0.9); g.fill(); }; }
    return [["dusk", f(13, 58, 1), 0, 0], ["hot", f(8, 42, 0.7), 1, -1], ["light", f(3.4, 22, 0.4), 1.5, -1.5]];
  }
  function fl(K, x, y, w, h, i, eh) { var k = w / 13, m = h / 58; K.g.drawImage(K.st["f" + ((i + eh) & 1)], x - 20 * k, y - 64 * m, 40 * k, 70 * m); }
  function lab(K, s, x, y, sc, a, b, px) {          // a word in two inks, the second a drum's miss behind
    var g = K.g;
    if (sc < 0.04) return;
    g.save(); g.translate(x, y); g.scale(sc, sc);
    K.text(g, s, 5, 5, { ink: b, cov: 0.7, font: K.font(900, px, "disp"), base: "middle" });
    K.text(g, s, 0, 0, { ink: a, cov: 0.92, font: K.font(900, px, "disp"), base: "middle" });
    g.restore();
  }
  function rg(K, x, y, r1, w, ink, cov, dur, dl) { K.ring({ x: x, y: y, r0: 8, r1: r1, w0: w, ink: ink, cov: cov, dur: dur, delay: dl }); }
  function mix(a, b) { return function (q) { var v = q(); return v < 0.2 ? "light" : v < 0.6 ? a : b; }; }
  window.T82ART.add("perk", "ticker", {
    name: "Ticker",
    by: "Green ticker tape reading +$1M slams across the board; a gold price chart climbs, peaks and crashes in flames to -$2.",
    prep: function (K) {
      var st = K.st, pt, pl, ps = [], sd = 0, sw = 0, jobs = [function () {
        sd = K.tile("dusk", 0.5).width * Math.ceil(DW * K.d / NS / K.tile("dusk", 0.5).width); sw = sd / K.d;   // strips a whole number of screen cells wide
      }, function () { pt = K.plate(TILE, 40, 7501); }, function () { pl = K.plate(40, 70, 7502); }];
      function trace(g, o) { g.beginPath(); PT.forEach(function (p, n) { g[n ? "lineTo" : "moveTo"](p[0] * DW + o, p[1] * CH + o); }); }
      function chart(i, line) {       // strip i: the area as one tone ramp with its shadow line (dusk); the line (hot)
        return function (g) {
          var r = g.createLinearGradient(0, 0, 0, CH), o = line ? 0 : 3;
          r.addColorStop(0, K.tone(0.1)); r.addColorStop(1, K.tone(0.66));
          g.translate(-i * sw, 0); trace(g, o);
          if (!line) { g.lineTo(DW, CH); g.lineTo(0, CH); g.closePath(); g.fillStyle = r; g.fill(); trace(g, o); }
          g.lineJoin = "round"; g.lineWidth = line ? 4.5 : 6; g.strokeStyle = K.tone(0.95); g.stroke();
        };
      }
      function put(i) { return function (c) { var a = st.area; if (!a) { a = st.area = document.createElement("canvas"); a.width = sd * NS; a.height = Math.round(CH * K.d); } a.getContext("2d").drawImage(c, i * sd, 0); c.width = 0; }; }
      function band(g) { g.beginPath(); g.rect(-2, 2, TILE + 4, BH); }
      function pa(g) {
        var i;
        band(g); g.fillStyle = K.tone(0.93); g.fill(); co(g, "destination-out"); g.fillStyle = K.tone(1);
        for (i = 0; i < 14; i++) { g.beginPath(); g.arc(5 + 10 * i, 7, 2.2, 0, TAU); g.arc(5 + 10 * i, 27, 2.2, 0, TAU); g.fill(); }
        tx(K, g, "+$1M", 45, 18, 28, 1);
      }
      function pb(g) { g.save(); g.translate(0, 4); band(g); g.fillStyle = K.tone(0.85); g.fill(); g.restore(); co(g, "destination-out"); g.fillStyle = K.tone(1); band(g); g.fill(); }
      function pc(g) { g.fillStyle = K.tone(0.92); g.beginPath(); g.moveTo(100, 9); g.lineTo(110, 26); g.lineTo(90, 26); g.closePath(); g.fill(); }
      jobs = jobs.concat(press(K, function () { return pt; }, [["good", pa, 0, 0], ["pop", pb, 0, 0], ["light", pc, 0, 0]], function (c) { st.tile = c; }),
        press(K, function () { return pl; }, flamePlates(K, 5), function (c) { st.f0 = c; }), press(K, function () { return pl; }, flamePlates(K, -5), function (c) { st.f1 = c; }));
      function plate(i) { return function () { return ps[i]; }; }
      function mk(i) { return [function () { ps[i] = K.plate(sw, CH, 7510 + i); }]; }
      for (var i = 0; i < NS; i++) jobs = jobs.concat(mk(i), press(K, plate(i), [["dusk", chart(i, 0), 0, 0], ["hot", chart(i, 1), 0, 0]], put(i)));
      return jobs;
    },
    slots: {
      refund: { dur: DUR, draw: function (K, ev, e) {
        var g = K.g, S = K.st, W = ev.W, d = K.d, len = W + TILE, i, x, x0, x1, xl, t0, dir, top, qi, qo, h;
        if (!S.tile) return;
        g.save(); g.beginPath(); g.rect(0, 0, W, ev.y + 3); g.clip(); g.imageSmoothingEnabled = false; co(g, K.blend);
        for (i = 0; i < 3; i++) {                       // the bottom tape first, from alternating sides: in fast, a slow crawl, out faster
          dir = i === 1 ? 1 : -1; t0 = 0.05 * (2 - i); top = ev.y - 50 - 42 * (2 - i);
          qi = u1((e - t0) / 0.2); qo = u1((e - t0 - 0.98) / 0.3); h = -70 + dir * 70 * u1((e - t0 - 0.2) / 0.8);
          xl = qo > 0 ? h + ((dir < 0 ? -len : W) - h) * qo * qo : (dir < 0 ? W : -len) + (h - (dir < 0 ? W : -len)) * K.ease.out(qi);
          x0 = Math.max(0, xl); x1 = Math.min(W, xl + len);
          if (x1 <= x0) continue;
          g.save(); g.beginPath(); g.rect(x0, top - 2, x1 - x0, 42); g.clip();
          for (x = xl + Math.floor((x0 - xl) / TILE) * TILE; x < x1; x += TILE) g.drawImage(S.tile, Math.round(x * d) / d, top - 2, TILE, 40);
          g.restore();
        }
        g.restore();
        lab(K, "+$1M", ev.cx, ev.y - 176, (e < 0.22 ? 0 : 0.55 + 0.45 * K.ease.back((e - 0.22) / 0.14)) * (1 - Math.pow(u1((e - 1.0) / 0.2), 2)), "light", "good", 62);
        for (i = 0; i < 3; i++) rg(K, ev.cx, ev.y - 50 - 42 * i + 15, 70 + 80 * i, 6, i ? "pop" : "good", 0.8, 0.4, 0.2 - 0.05 * i);
        K.spark({ x: ev.cx, y: ev.y - 90, n: 26, ink: mix("pop", "good"), sp: [140, 400], r: [1.4, 3.2], life: [0.4, 0.3], grav: 600, dir: -Math.PI / 2, cone: 3.4, seed: ev.seed, delay: 0.24, streak: true });
        if (e > 0.2) K.shake(ev.box, 0.4, 6);
      } },
      sale: { dur: DUR, draw: function (K, ev, e) {
        var g = K.g, S = K.st, d = K.d, cw = Math.min(ev.w - 8, DW), sc = cw / DW, x0 = ev.cx - cw / 2, y0 = ev.y - 176, fy = y0 + CH, eh = Math.floor(e * 12), i, k = 0, n, m, q, a, X, Y, F = [];
        var sink = Math.pow(u1((e - 1.2) / 0.22), 2), fv = 1 - u1((e - 1.15) / 0.15), cr = TT[13];
        function px(p) { return x0 + p[0] * cw; }
        function py(p) { return y0 + p[1] * CH; }
        if (!S.f0 || !S.area || e < TT[0]) return;
        for (i = 0; i < PT.length; i++) if (e >= TT[i]) k = i;
        n = PT[k]; m = PT[Math.min(k + 1, PT.length - 1)]; q = k < PT.length - 1 ? u1((e - TT[k]) / (TT[k + 1] - TT[k])) : 0;
        n = [x0 + (n[0] + (m[0] - n[0]) * q) * cw, y0 + (n[1] + (m[1] - n[1]) * q) * CH];                  // the pen's tip
        g.save(); g.beginPath(); g.rect(0, 0, ev.W, ev.y + 3); g.clip(); g.translate(0, sink * (CH + 40)); co(g, K.blend);
        for (X = 0; x0 + 20 * X < Math.min(x0 + cw, n[0] + 40); X++) for (Y = 0; Y <= 8; Y++) F.push(x0 + 20 * X, y0 + 20 * Y, 1.3);   // the grid, ahead of the pen
        K.dots(g, "dusk", 0.85, F);
        X = Math.max(1, Math.min(S.area.width, Math.round((n[0] - x0) / sc * d)));      // the chart: the prepped sheet, up to the pen
        g.imageSmoothingEnabled = false; g.drawImage(S.area, 0, 0, X, S.area.height, x0, y0, X / d * sc, CH);
        K.dots(g, "light", 0.95, [n[0], n[1], 4.2]);
        for (i = 10; i < 14; i++) { a = u1((e - TT[i]) / 0.08) * fv; if (a > 0) fl(K, px(PT[i]), py(PT[i]), 9 * a, (34 + 10 * Math.sin(eh * 2 + i)) * a, i, eh); }
        if (e > cr && fv > 0) for (i = 0; i < 3; i++) fl(K, px(PT[13]) - 26 + 26 * i, fy, 15 * fv, (60 + 36 * (i & 1) + 12 * Math.sin(eh * 2.3 + i)) * u1((e - cr) / 0.1) * fv, i, eh);
        g.restore();
        if (e > cr) lab(K, "-$2", x0 + 0.27 * cw, y0 + 0.3 * CH + sink * (CH + 40), (e < cr + 0.1 ? 1.5 - 5 * (e - cr) : 1) * (1 - sink), "hot", "dusk", 66);
        rg(K, px(PT[13]), fy, 170, 9, "hot", 0.9, 0.45, cr); rg(K, px(PT[13]), fy, 210, 5, "dusk", 0.65, 0.55, cr + 0.05);
        K.spark({ x: px(PT[13]), y: fy, n: 24, ink: mix("hot", "dusk"), sp: [150, 420], r: [1.2, 2.8], life: [0.4, 0.3], grav: 700, dir: -Math.PI / 2, cone: 2.8, seed: ev.seed, delay: cr, streak: true });
        if (e > cr) K.shake(ev.box, 0.4, 6);
      } }
    }
  });
})();
