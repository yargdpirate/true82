/* Coin Drop, a Presti perk pack (art/CONTRACT-FX.md). refund: coins rain onto the cost buttons spinning on their edge
   (green face, aqua edge a drum's miss under it), bounce, the hero coin first with two rings and a jolt, then each
   turns edge-on and slots into its button. sale: a gold price tag ($$$) slams down, catches fire and burns down to -$2
   (an ember edge, flames on twos), the stub drops through the row and the buttons flare. All prepped sprites.
   Inks: good + pop + light; hot + dusk + light. */
(function () {
  "use strict";
  var FX = [0.05, 0.67, 0.12, 0.74, 0.19, 0.81, 0.26, 0.88, 0.33, 0.95, 0.09, 0.9], TAU = Math.PI * 2, G = 3000, DUR = 1.45, TW = 150, TH = 100, M = 12, N = 13;
  function u1(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function co(g, m) { g.globalCompositeOperation = m; }
  function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); }
  function leaf(g, x, y, w, h, l) {
    g.beginPath(); g.moveTo(x - w, y); g.bezierCurveTo(x - w * 1.15, y - h * 0.4, x - w * 0.1, y - h * 0.5, x + l, y - h);
    g.bezierCurveTo(x + w * 0.2, y - h * 0.5, x + w * 1.2, y - h * 0.4, x + w, y); g.closePath();
  }
  function tx(K, g, s, x, y, px) { K.text(g, s, x, y, { font: K.font(900, px, "disp"), base: "middle" }); }
  function tgp(g, x, y) { g.beginPath(); g.moveTo(x, y + 30); g.lineTo(x + 30, y); g.lineTo(x + TW, y); g.lineTo(x + TW, y + TH); g.lineTo(x + 30, y + TH); g.lineTo(x, y + TH - 30); g.closePath(); }
  // a sprite in prep: plates [ink, tone, dx, dy] screened a job each, then printed onto the first at their misses
  function press(K, st, key, w, h, seed, L) {
    var P, cs = [], jobs = [function () { P = K.plate(w, h, seed); }];
    L.forEach(function (a, i) { jobs.push(function () { cs[i] = K.screen(P, a[0], a[1]); }); });
    jobs.push(function () {
      var x = cs[0].getContext("2d"), i;
      co(x, K.blend);
      for (i = 1; i < cs.length; i++) { x.drawImage(cs[i], Math.round(L[i][2] * K.d), Math.round(L[i][3] * K.d)); cs[i].width = 0; }
      st[key] = cs[0];
    });
    return jobs;
  }
  function cpl(K, R) {                     // an aqua crescent for the edge, the face, a light rim and $
    var T = Math.max(3, R * 0.2), c = R + 10;
    return [["pop", function (g) { g.fillStyle = K.tone(0.85); circ(g, c + R * 0.1, c + T, R); g.fill(); co(g, "destination-out"); circ(g, c, c, R); g.fill(); }, 0, 0],
      ["good", function (g) { g.fillStyle = K.tone(0.93); circ(g, c, c, R); g.fill(); }, 0, 0],
      ["light", function (g) { g.strokeStyle = K.tone(0.92); g.lineWidth = R > 20 ? 2.6 : 2; circ(g, c, c, R * 0.74); g.stroke(); tx(K, g, "$", c, c + 1, R * 1.1); }, 0, 0]];
  }
  function fpl(K, l) {
    function f(w, h, k) { return function (g) { leaf(g, 20, 64, w, h, l * k); g.fillStyle = K.tone(0.9); g.fill(); }; }
    return [["dusk", f(13, 58, 1), 0, 0], ["hot", f(8, 42, 0.7), 1, -1], ["light", f(3.4, 22, 0.4), 1.5, -1.5]];
  }
  // a coin's height above the floor at age t, its bounces so far: dropped from H at speed v0, back at 0.45 each time
  function drop(t, H, v0) {
    var tf = (Math.sqrt(v0 * v0 + 2 * G * H) - v0) / G, v, T, n;
    if (t < tf) return [H - v0 * t - G * t * t / 2, 0, 0, tf];
    v = (v0 + G * tf) * 0.45; t -= tf;
    for (n = 1; n < 4; n++, v *= 0.45) { T = 2 * v / G; if (t < T) return [v * t - G * t * t / 2, n, t, tf]; t -= T; }
    return [0, 4, 9, tf];
  }
  function coin(K, x, FY, R, c, sq, h) {          // a sprite turned on its edge: scaled across by the turn, down by the squash
    var big = R > 24, rb = big ? 36 : 19, tb = Math.max(3, rb * 0.2), k = R / rb, kx = k * Math.max(0.12, c < 0 ? -c : c) * (1 + 0.16 * sq), ky = k * (1 - 0.22 * sq);
    K.g.drawImage(big ? K.st.cb : K.st.cs, x - (rb + 10) * kx, FY - h - (2 * rb + tb + 10) * ky, (2 * rb + 20) * kx, (2 * rb + 20 + tb) * ky);
  }
  function fl(K, x, y, w, h, i, eh) { var k = w / 13, m = h / 58; K.g.drawImage(K.st["f" + ((i + eh) & 1)], x - 20 * k, y - 64 * m, 40 * k, 70 * m); }
  function nz(x) { return 6 * Math.sin(x * 0.21 + 1.1) + 4 * Math.sin(x * 0.47 + 0.4) + 2 * Math.sin(x * 1.1); }
  function rg(K, x, y, r1, w, ink, cov, dur, dl) { K.ring({ x: x, y: y, r0: 8, r1: r1, w0: w, ink: ink, cov: cov, dur: dur, delay: dl }); }
  function spk(K, ev, ink, x, y, n, v, grav, sd, dl, life, st) { K.spark({ x: x, y: y, n: n, ink: ink, sp: v, r: [1.2, 2.8], life: life, grav: grav, dir: -Math.PI / 2, cone: 2.7, seed: ev.seed + sd, delay: dl, streak: st }); }
  function mix(a, b) { return function (q) { var v = q(); return v < 0.2 ? "light" : v < 0.6 ? a : b; }; }
  window.T82ART.add("perk", "coins", {
    name: "Coin Drop",
    by: "Coins bounce onto the cost buttons and slot in; a gold price tag catches fire and burns down to -$2.",
    prep: function (K) {
      var st = K.st;
      function carve(g) {
        co(g, "destination-out"); g.fillStyle = K.tone(1);
        tx(K, g, "$$$", M + 90, M + 32, 40);
        tx(K, g, "-$2", M + 90, M + 74, 58);
        circ(g, M + 15, M + TH / 2, 7); g.fill();
      }
      function slab(a) { return function (g) { tgp(g, M, M); g.fillStyle = K.tone(a); g.fill(); carve(g); }; }
      return press(K, st, "cb", 92, 100, 7301, cpl(K, 36)).concat(press(K, st, "cs", 58, 62, 7302, cpl(K, 19)),
        press(K, st, "tag", TW + 2 * M, TH + 2 * M, 7303, [["hot", slab(0.93), 0, 0], ["dusk", slab(0.76), 4, -3]]),
        press(K, st, "f0", 40, 70, 7304, fpl(K, 5)), press(K, st, "f1", 40, 70, 7305, fpl(K, -5)));
    },
    slots: {
      refund: { dur: DUR, draw: function (K, ev, e) {
        var g = K.g, r = K.rand(ev.seed ^ 0xc01), i, L = [], FY = ev.y - 1;
        g.save(); g.beginPath(); g.rect(0, 0, ev.W, ev.y + 3); g.clip(); g.imageSmoothingEnabled = false; co(g, K.blend);
        for (i = 0; i < N; i++) {
          var R = i ? 15 + 7 * r() : 36, H = i ? 130 + 190 * r() : 150, v0 = i ? 320 : 650, d = i ? 0.04 + 0.3 * r() : 0, w0 = i ? 11 + 10 * r() : 9, ph = r() * TAU, f = FX[i - 1] + (r() - 0.5) * 0.04, vx = (r() - 0.5) * 70;
          L.push({ R: R, H: H, v0: v0, d: d, w0: w0, ph: ph, vx: vx, ex: i ? 0.85 + 0.22 * r() : 1.02, T: drop(0, H, v0)[3],
            x0: i ? ev.x + R + (ev.w - 2 * R) * f : ev.cx });
        }
        for (i = N - 1; i >= 0; i--) {
          var o = L[i], t = e - o.d, s, q, sink = 0, c, sq = 0;
          if (t < 0) continue;
          s = drop(t, o.H, o.v0);
          c = Math.cos(o.ph + o.w0 * t); if (s[1] >= 3) c = 1; else if (s[1]) c += (1 - c) * u1((t - o.T) / 0.45);
          if (s[1] && s[2] < 0.05) sq = 1 - s[2] / 0.05;
          q = u1((e - o.ex) / 0.32);
          if (q > 0) { c *= 1 - u1(q / 0.3); sink = Math.pow(u1((q - 0.25) / 0.75), 2) * (2.4 * o.R + 16); }
          coin(K, o.x0 + (s[1] ? o.vx * (t - o.T) : 0), FY, o.R, c, sq, s[0] - sink);
        }
        g.restore();
        for (i = 1; i < N; i++) rg(K, L[i].x0, FY, 24, 3, "light", 0.8, 0.22, L[i].d + L[i].T);
        rg(K, ev.cx, FY, 150, 8, "good", 0.9, 0.45, L[0].T);
        rg(K, ev.cx, FY, 190, 5, "pop", 0.6, 0.55, L[0].T + 0.05);
        spk(K, ev, mix("pop", "good"), ev.cx, FY - 6, 24, [150, 420], 800, 0, L[0].T, [0.35, 0.3], 1);
        if (e > L[0].T) K.shake(ev.box, 0.4, 6);
      } },
      sale: { dur: DUR, draw: function (K, ev, e) {
        var g = K.g, S = K.st, d = K.d, eh = Math.floor(e * 12), yc = ev.y - 112, cx = ev.cx, i, x, y, q, pb = u1((e - 0.14) / 0.62), yf = -62 + 58 * pb, FY = ev.y, ew = 0;
        var u = u1(e / 0.12), sq = e < 0.12 ? 0 : 1 - u1((e - 0.12) / 0.3), fu = u1((e - 0.85) / 0.23), fv = u1((e - 0.14) / 0.1) * (1 - u1((e - 0.74) / 0.14));
        var sc = e < 0.12 ? 1.45 - 0.45 * u : 1 + 0.2 * sq, ink = mix("hot", "dusk");
        g.save(); g.beginPath(); g.rect(0, 0, ev.W, FY + 3); g.clip(); g.imageSmoothingEnabled = false;
        if (fu < 1 && S.tag) {
          g.save(); g.translate(cx, yc - 150 * (1 - u * u) + 330 * fu * fu); g.scale(sc, e < 0.12 ? sc : 1 - 0.18 * sq);
          for (x = -75; x < 75; x += 3) {                           // the paper below the burn edge, a strip at a time
            y = Math.max(-TH / 2, yf + nz(x)); q = Math.round((y + TH / 2 + M) * d);
            if (y < TH / 2) g.drawImage(S.tag, Math.round((x + TW / 2 + M) * d), q, Math.round(3 * d), S.tag.height - q, x, y, 3, TH / 2 + M - y);
          }
          if (pb > 0 && fu < 0.5) {                                  // the ember edge, on the paper only (the corner is cut)
            co(g, K.blend); g.beginPath();
            for (x = -75; x <= 75; x += 5) { y = yf + nz(x) + 2; if (x < -75 + Math.max(0, -20 - y)) continue; g[ew ? "lineTo" : "moveTo"](x, y); ew = 1; }
            g.lineWidth = 6; g.strokeStyle = K.pat("dusk", 0.9); g.stroke(); g.lineWidth = 3; g.strokeStyle = K.pat("hot", 0.95); g.stroke();
          }
          if (fv > 0) for (i = 0; i < 9; i++) { x = -68 + 17 * i; fl(K, x, yf + nz(x), (11 + 3 * Math.sin(eh * 2 + i)) * fv, (32 + 18 * Math.sin(eh * 2.6 + i * 2.3) + 8 * (i % 3)) * fv, i, eh); }
          g.restore();
          if (fu > 0.05) {                                           // tapered streaks over the falling stub
            g.beginPath(); for (i = -2; i <= 2; i++) { y = yc + 330 * fu * fu - 12; g.moveTo(cx + i * 26 - 3, y); g.lineTo(cx + i * 26 + 3, y); g.lineTo(cx + i * 26, y - 30 - 50 * fu); g.closePath(); }
            co(g, K.blend); g.fillStyle = K.pat("hot", 0.9); g.fill();
          }
        }
        for (i = 0; i < 3; i++) {                                    // the buttons flare once the price has dropped
          var fb = u1((e - 1.02) / 0.1) * (1 - u1((e - 1.2) / 0.22)), bx = ev.x + ev.w * (1 + 2 * i) / 6;
          if (fb > 0) { fl(K, bx - 14, FY + 2, 14 * fb, (50 + 12 * Math.sin(eh * 3 + i)) * fb, i, eh); fl(K, bx + 12, FY + 2, 11 * fb, (36 + 10 * Math.sin(eh * 3.3 + i)) * fb, i + 1, eh); }
        }
        g.restore();
        rg(K, cx, FY, 160, 9, "hot", 0.9, 0.45, 1.0);
        rg(K, cx, FY, 200, 5, "dusk", 0.65, 0.55, 1.05);
        rg(K, cx, yc + 50, 90, 5, "light", 0.7, 0.3, 0.12);
        spk(K, ev, ink, cx, yc - 40, 18, [30, 120], -160, 0, 0.16, [0.55, 0.4], 0);
        spk(K, ev, ink, cx, FY, 22, [150, 400], 700, 5, 1.0, [0.35, 0.3], 1);
        if (e > 1.0) K.shake(ev.box, 0.4, 6);
      } }
    }
  });
})();
