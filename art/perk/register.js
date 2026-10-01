/* Cash Register, a Presti perk pack. refund: a green register pops up out of the cost buttons, its drawer slams out, ten
   bills fan out, a receipt ratchets out of its top and rips away. sale: a gold price gun fires five -$2 tags across the
   board, each slapping down with a ring, then they drop. Prepped sheets (ramped, carved, a second ink off register);
   bills and drawer live; a clip keeps the labels clear. Inks: good, pop, light; hot, dusk. */
(function () {
  "use strict";
  var TAU = Math.PI * 2, DUR = 1.5, AIM = [[.62, 150], [.12, 230], [.9, 300], [.3, 360], [.55, 270]];
  var GEO = { r: [216, 192, 108, 160], c: [120, 222, 60, 8], g: [206, 156, 69, 142], s: [136, 91, 68, 45.5] }; // each sheet: size and anchor, with an 8 px margin
  function u1(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function co(g, m) { g.globalCompositeOperation = m; }
  function poly(g, p) { g.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function ramp(g, w, h, a) { // an uneven press
    var gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0," + a + ")");
    co(g, "destination-in"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }
  function txt(K, g, s, x, y, w) { // type fitted to a width
    g.font = K.font(900, 100, "disp"); var px = 100 * w / g.measureText(s).width;
    K.text(g, s, x, y + px * .36, { font: K.font(900, px, "disp") });
  }
  function reg(K, g, ink) { // the register: body in good, keys in pop, display in light
    var i;
    if (ink === "good") {
      g.fillStyle = K.tone(.92); g.beginPath();
      poly(g, [52, 66, 52, 22, 62, 8, 138, 8, 148, 22, 148, 66]); poly(g, [40, 58, 160, 58, 190, 106, 10, 106]);
      poly(g, [10, 104, 190, 104, 190, 146, 184, 152, 16, 152, 10, 146]);
      g.fill(); co(g, "destination-out"); g.fillRect(62, 17, 76, 33);
      ramp(g, 200, 176, .6);
    } else if (ink === "pop") {
      g.fillStyle = K.tone(.92); g.fillRect(14, 104, 172, 3);
      for (i = 0; i < 15; i++) rr(g, 51 + (i % 5) * 21, 66 + ((i / 5) | 0) * 15.5, 15, 11, 2), g.fill();
    } else { g.fillStyle = K.tone(.8); g.fillRect(64, 9, 72, 3); K.text(g, "$", 100, 44, { font: K.font(900, 36, "disp"), cov: .95 }); }
  }
  function rcp(K, g, ink) { // light paper, REFUND on a green band
    var r = K.rand(52), i, x = 14, w;
    if (ink === "good") { g.fillStyle = K.tone(.92); g.fillRect(0, 6, 104, 40); return; }
    g.fillStyle = K.tone(.8); g.beginPath(); g.moveTo(0, 0); g.lineTo(104, 0);
    for (i = 0; i <= 13; i++) g.lineTo(104 - i * 8, 206 - (i % 2) * 7);
    g.fill(); co(g, "destination-out"); g.fillRect(0, 6, 104, 40);
    co(g, "source-over"); txt(K, g, "REFUND", 52, 26, 82);
    co(g, "destination-out");
    for (; x < 90; x += w + 1.5 + r() * 2.6) { w = 1.5 + r() * 3.2; g.fillRect(x, 64, w, 118); }
  }
  function gun(K, g, ink) { // nose right, a label roll on top
    g.fillStyle = K.tone(ink === "hot" ? .92 : .7); g.beginPath();
    poly(g, [6, 42, 16, 30, 132, 30, 136, 36, 182, 40, 184, 62, 136, 66, 132, 72, 16, 72, 6, 60]); poly(g, [46, 70, 98, 70, 86, 134, 36, 134]); poly(g, [106, 72, 122, 72, 116, 100, 106, 98]);
    g.moveTo(106, 28); g.arc(84, 28, 22, 0, TAU); g.fill();
    co(g, "destination-out"); g.lineWidth = 4; g.beginPath(); g.arc(84, 28, 13, 0, TAU); g.stroke();
    g.fillRect(170, 47, 14, 7);
    ramp(g, 190, 140, .68);
  }
  function tag(K, g, ink) { // a price tag, its hole and -$2 carved out
    g.fillStyle = K.tone(ink === "hot" ? .92 : .7); g.beginPath(); poly(g, [2, 37, 40, 2, 118, 2, 118, 73, 40, 73]); g.fill();
    co(g, "destination-out"); g.beginPath(); g.arc(36, 37, 5.6, 0, TAU); g.fill(); txt(K, g, "-$2", 80, 37, 56);
  }
  function put(K, g, n, x, y, rot, sx, sy) { // a sheet at its anchor
    var o = GEO[n];
    g.save(); g.imageSmoothingEnabled = false; g.translate(x, y); if (rot) g.rotate(rot); if (sx !== 1 || sy !== 1) g.scale(sx, sy);
    g.drawImage(K.st[n], -o[2], -o[3], o[0], o[1]);
    g.restore();
  }
  function bill(K, g, x, y, rot, sx) { // green, a white rule, an aqua seal
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(sx * 1.15, 1.15);
    rr(g, -26, -12, 52, 24, 3); g.fillStyle = K.pat("good", .88, g); g.fill();
    g.lineWidth = 1.6; rr(g, -22, -8, 44, 16, 2); g.strokeStyle = K.pat("light", .9, g); g.stroke();
    co(g, K.blend); g.beginPath(); g.ellipse(0, 0, 7, 5.5, 0, 0, TAU); g.fillStyle = K.pat("pop", .9, g); g.fill();
    g.restore();
  }
  function ink2(a, b) { return function (q) { var v = q(); return v < .25 ? "light" : v < .6 ? a : b; }; }
  function begin(K, g, ev, e) { g.save(); g.beginPath(); g.rect(0, 0, ev.W, ev.y + 4); g.clip(); g.globalAlpha = K.fade({ dur: DUR }, e); }
  function sink(e, t) { var u = u1((e - t) / .4); return 330 * u * u; }
  window.T82ART.add("perk", "register", {
    name: "Cash Register",
    by: "A green register throws bills and prints a REFUND receipt; a gold price gun fires -$2 tags.",
    prep: function (K) {
      var st = K.st, jobs = [], P = {}, D = { r: [200, 176], c: [104, 206], g: [190, 140], s: [120, 75] };
      Object.keys(D).forEach(function (k, i) { jobs.push(function () { P[k] = K.plate(D[k][0] + 16, D[k][1] + 16, 6100 + i); }); });
      [["r", reg, ["good", "pop", "light"], [0, [4, -3], [-1, 1]]], ["c", rcp, ["light", "good"], [0, [3, -2]]], ["g", gun, ["hot", "dusk"], [0, [7, -6]]], ["s", tag, ["hot", "dusk"], [0, [5, -4]]]].forEach(function (a) {
        var cs = []; // the inks' plates, printed onto the first
        a[2].forEach(function (ink, i) { jobs.push(function () { cs[i] = K.screen(P[a[0]], ink, function (g) { g.translate(8, 8); a[1](K, g, ink); }); }); });
        jobs.push(function () {
          var x = cs[0].getContext("2d"), i, f;
          x.globalCompositeOperation = K.blend;
          for (i = 1; i < cs.length; i++) { f = a[3][i]; x.drawImage(cs[i], Math.round(f[0] * K.d), Math.round(f[1] * K.d)); cs[i].width = 0; }
          st[a[0]] = cs[0];
        });
      });
      return jobs;
    },
    slots: {
      refund: { dur: DUR, draw: function (K, ev, e) {
        var g = K.g, X = Math.round(ev.cx), gy = Math.round(ev.y - 50), i, u = u1(e / .14);
        var dr = 30 * K.ease.back(u1((e - .15) / .1)), rise = (1 - K.ease.back(u)) * 200 + sink(e, 1.05), top = gy - 152 + rise;
        if (e >= .14) K.shake(ev.box, .4, 5);
        K.ring({ x: X, y: ev.y - 26, r0: 16, r1: 190, w0: 9, ink: "good", cov: .9, dur: .5, delay: .12 });
        begin(K, g, ev, e);
        if (e > .18) { // the receipt ratchets out of the top, hangs, rips away
          var L = Math.min(206, u1((e - .18) / .5) * 206, top - 12), v = u1((e - 1) / .4);
          g.save(); g.beginPath(); g.rect(0, 0, ev.W, top + 8); g.clip();
          put(K, g, "c", X, top + 8 - Math.floor(L / 7) * 7 - 330 * v * v, .5 * v * v, 1, 1);
          g.restore();
        }
        if (dr > .5) {
          g.save(); g.translate(0, rise * .4);
          g.beginPath(); poly(g, [X - 70, gy, X + 70, gy, X + 86, gy + dr, X - 86, gy + dr]); g.fillStyle = K.pat("pop", .6, g); g.fill();
          g.fillStyle = K.pat("good", .85, g);
          for (i = 0; i < 3; i++) g.fillRect(X - 56 + i * 48, gy + dr * .3, 38, dr * .55);
          g.fillStyle = K.pat("pop", .85, g); g.fillRect(X - 88, gy + dr, 176, 12);
          g.restore();
        }
        put(K, g, "r", X, gy + rise, 0, 1 - .07 * (1 - u), 1 + .12 * (1 - u));
        for (i = 0; i < 10; i++) {
          var r = K.rand(ev.seed + i * 7), t = e - .17 - .035 * i, vx = (i % 2 ? 1 : -1) * (70 + r() * 240), vy = -(380 + r() * 300), sp = (r() - .5) * 12;
          if (t > 0) bill(K, g, X + vx * t, gy + 10 + vy * t + 550 * t * t, sp * t * .5, Math.abs(Math.cos(sp * t * 1.3)) * .9 + .1);
        }
        g.restore();
      } },
      sale: { dur: DUR, draw: function (K, ev, e) {
        var g = K.g, i, X0 = Math.max(125, Math.round(ev.cx - 55)), by = Math.round(ev.y - 6), kk = 0, bl = -.4, sh = [];
        var span = Math.min(1, (ev.y - 90) / 400), rise = (1 - K.ease.back(u1(e / .14))) * 190 + sink(e, .9);
        for (i = 0; i < 5; i++) {
          var s = .16 + .14 * i, tx = ev.x + 40 + (ev.w - 80) * AIM[i][0], ty = Math.max(70, by - AIM[i][1] * span);
          sh.push({ s: s, tx: tx, ty: ty, a: K.clamp(Math.atan2(ty - (by - 110), tx - X0), -1.1, -.05) });
          if (e >= s - .05) bl = (i ? sh[i - 1].a : -.4) + (sh[i].a - (i ? sh[i - 1].a : -.4)) * u1((e - s + .05) / .05);
          if (e >= s && e < s + .08) kk = 10 * (1 - (e - s) / .08);
        }
        begin(K, g, ev, e);
        for (i = 0; i < 5; i++) {
          var o = sh[i], tt = e - o.s, f = u1(tt / .1), land = tt - .1, fall = e - (.92 + .04 * i), c = Math.cos(o.a), n = Math.sin(o.a);
          if (tt < 0) continue;
          var mx = X0 + 123 * c + 90 * n, my = by + 123 * n - 90 * c, fx = mx + (o.tx - mx) * K.ease.out(f), fy = my + (o.ty - my) * K.ease.out(f);
          var hit = land >= 0 && land < .12 ? 1 - land / .12 : 0, tr = (i % 2 ? .16 : -.14) * f;
          if (fall > 0) { fy += 4800 * fall * fall; tr += 1.2 * fall; }
          put(K, g, "s", fx, fy, tr, f < 1 ? .55 + .45 * f : 1 + .3 * hit, f < 1 ? 1 : 1 - .2 * hit);
          if (land >= 0) {
            K.ring({ x: o.tx, y: o.ty, r0: 6, r1: i < 4 ? 56 : 100, w0: 6, ink: "hot", cov: .9, dur: .32, delay: o.s + .1 });
            K.spark({ x: o.tx, y: o.ty, n: i < 4 ? 8 : 18, ink: ink2("hot", "dusk"), sp: [90, 300], r: [1.2, 2.8], life: [.3, .25], grav: 600, seed: ev.seed + i, delay: o.s + .1 });
            if (i === 0 || i === 4) (i ? [].slice.call(ev.box && ev.box.children || []) : [ev.box]).forEach(function (b) { K.shake(b, .3, i ? 8 : 4); });
          }
        }
        put(K, g, "g", X0 - kk * Math.cos(bl), by + rise - kk * Math.sin(bl), bl, 1, 1);
        g.restore();
      } }
    }
  });
})();
