/* Riso Emoji, a Presti perk pack (art/CONTRACT-FX.md; art/CONCEPTS.md "Presti perks"): a matched pair at the cost
   buttons, each a two-ink slam and a flight of riso emoji. refund: a big $ slams over the buttons in money green with
   its aqua plate off register, then dollar bills flutter up out of the row (sway, tilt, a turn), two with wings
   flying highest. sale: a big down arrow slams in fire gold over orange and plunges, price tags pop up out of the row
   with an arrow printed on each and flames licking their foot, hang a beat, then drop: the price falls. Exits fade by
   1.4 s. Inks: good + pop (+ light sparks) for money; hot + dusk + loss for the sale. */
(function () {
  "use strict";
  var TAU = Math.PI * 2;
  function k01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function pop(K, p) { return p <= 0 ? 0.55 : 0.55 + 0.45 * K.ease.back(p); }
  function inks(a, b, c) { return function (q) { var v = q(); return v < 0.25 ? a : v < 0.6 ? b : c; }; }
  // the hero's two plates: the shape in ink a, then again in ink b a drum's miss behind (one offset for the moment)
  function slam(K, a, ca, b, cb, dx, dy, path) {
    var g = K.g;
    g.save(); g.globalCompositeOperation = K.blend;
    g.save(); g.translate(dx, dy); path(g); g.fillStyle = K.pat(b, cb); g.fill(); g.restore();
    path(g); g.fillStyle = K.pat(a, ca); g.fill();
    g.restore();
  }
  function arrow(g, x, y, w, h, rot) {            // one cut contour: shaft, then a wide head pointing down
    var sw = w * 0.38, hh = h * 0.46, c = Math.cos(rot), s = Math.sin(rot);
    var pts = [[-sw / 2, -h / 2], [sw / 2, -h / 2], [sw / 2, h / 2 - hh], [w / 2, h / 2 - hh], [0, h / 2], [-w / 2, h / 2 - hh], [-sw / 2, h / 2 - hh]];
    g.beginPath();
    pts.forEach(function (p, i) { var px = x + p[0] * c - p[1] * s, py = y + p[0] * s + p[1] * c; if (i) g.lineTo(px, py); else g.moveTo(px, py); });
    g.closePath();
  }
  // the slam's scale: in from 1.6x in 0.1 s, a squash held two frames, a back-ease settle
  function slamScale(K, e) { return e < 0.1 ? 1.6 - 0.75 * (e / 0.1) * (e / 0.1) : e < 0.14 ? 0.85 : 0.85 + 0.15 * K.ease.back(k01((e - 0.14) / 0.2)); }
  window.T82ART.add("perk", "emojicash", {
    name: "Riso Emoji",
    by: "Riso emoji at the cost buttons: a green $ slam and dollar bills fluttering up; a gold arrow slam and price tags that drop in flames.",
    prep: function (K) {
      return K.emojiJobs([["bill", "\uD83D\uDCB5", 40, ["good", "pop"], { sat: 1.5 }], ["wing", "\uD83D\uDCB8", 46, ["good", "pop"], { sat: 1.7 }],
        ["tag", "\uD83C\uDFF7\uFE0F", 46, ["hot", "dusk", "loss"], { sat: 2.5 }], ["flame", "\uD83D\uDD25", 26, ["hot", "dusk", "loss"], { sat: 1.3 }]]);
    },
    slots: {
      refund: { dur: 1.4, draw: function (K, ev, e) {
        var S = K.st, g = K.g, r = K.rand(ev.seed), i, cx = ev.cx, top = ev.y, fade = k01((1.4 - e) / 0.3);
        K.ring({ x: cx, y: ev.cy, r0: 10, r1: 150, w0: 8, ink: "good", cov: 0.9, dur: 0.45 });
        K.ring({ x: cx, y: ev.cy, r0: 8, r1: 190, w0: 5, ink: "pop", cov: 0.6, dur: 0.55, delay: 0.06 });
        K.spark({ x: cx, y: top, n: 24, ink: inks("light", "pop", "good"), sp: [140, 380], r: [1.2, 2.6], life: [0.35, 0.35], grav: 420, dir: -Math.PI / 2, cone: 2.2, seed: ev.seed, streak: true });
        if (e < 0.9) {           // the hero: a big $ in money green, its aqua plate off register
          var sc = slamScale(K, e), lift = e > 0.4 ? 40 * K.ease.inOut((e - 0.4) / 0.5) : 0, a = k01((0.9 - e) / 0.25);
          g.save(); g.globalAlpha = a; g.translate(cx, top - 54 - lift); g.scale(sc, sc);
          K.text(g, "$", 5, 4, { ink: "pop", cov: 0.62, font: K.font(900, 110, "disp"), base: "middle" });
          K.text(g, "$", 0, 0, { ink: "good", cov: 0.88, font: K.font(900, 110, "disp"), base: "middle" });
          g.restore();
        }
        for (i = 0; i < 11; i++) {                    // the bills: out of the row, fluttering up
          var winged = i < 2, d = 0.03 * i + (winged ? 0.12 : 0), t = e - d, p = t / (winged ? 1.15 : 1.25);
          var x0 = ev.x + ev.w * (winged ? 0.3 + 0.4 * i : 0.08 + 0.84 * r()), H = winged ? 420 + 60 * r() : 150 + 170 * r(), ph = r() * TAU, f = 1.3 + r() * 0.8;
          if (p <= 0 || p >= 1) continue;
          var x = x0 + (winged ? (i ? 60 : -60) * p : 18 * Math.sin(TAU * f * t + ph)), y = ev.cy - H * K.ease.out(p);
          var rot = winged ? (i ? 0.35 : -0.35) : 0.38 * Math.sin(TAU * f * t + ph + 0.7), turn = winged ? 1 : 0.74 + 0.26 * Math.abs(Math.cos(TAU * f * 0.8 * t + ph));
          var s0 = p < 0.12 ? pop(K, p / 0.12) : 1;
          K.sprite(g, winged ? S.wing : S.bill, x, y, [s0 * turn, s0], rot, (p > 0.72 ? (1 - p) / 0.28 : 1) * (winged ? 1 : fade + (1 - fade) * 0.5));
        }
      } },
      sale: { dur: 1.4, draw: function (K, ev, e) {
        var S = K.st, g = K.g, r = K.rand(ev.seed ^ 0x5a1e), i, cx = ev.cx, top = ev.y, eh = Math.floor(e * 12) / 12;
        K.shake(ev.box, 0.4, 5);
        K.ring({ x: cx, y: ev.cy, r0: 10, r1: 160, w0: 9, ink: "hot", cov: 0.9, dur: 0.45 });
        K.ring({ x: cx, y: ev.cy, r0: 8, r1: 200, w0: 5, ink: "dusk", cov: 0.65, dur: 0.55, delay: 0.06 });
        K.spark({ x: cx, y: top, n: 26, ink: inks("light", "hot", "dusk"), sp: [140, 400], r: [1.2, 2.8], life: [0.35, 0.35], grav: 500, dir: -Math.PI / 2, cone: 2.4, seed: ev.seed, streak: true });
        if (e < 0.95) {                               // the hero: a big down arrow, gold over orange, that plunges
          var sc = slamScale(K, e), drop = e > 0.5 ? 260 * Math.pow((e - 0.5) / 0.45, 2) : 0, a = k01((0.95 - e) / 0.2);
          g.save(); g.globalAlpha = a; g.translate(cx, top - 70 + drop); g.scale(sc * (e > 0.5 ? 0.92 : 1), sc * (e > 0.5 ? 1.12 : 1));
          slam(K, "hot", 0.88, "dusk", 0.7, 6, -5, function (q) { arrow(q, 0, 0, 92, 104, 0); });
          g.restore();
        }
        for (i = 0; i < 7; i++) {                     // the tags: pop up, hang, then fall: the price drops
          var t = e - 0.06 - 0.035 * i, x0 = ev.x + ev.w * (0.08 + 0.84 * (i + 0.5) / 7 + (r() - 0.5) * 0.06), H = 120 + 130 * r(), ph = r() * TAU;
          var fall = t > 0.62 ? t - 0.62 : 0, up = k01(t / 0.32), sw = 0.32 * Math.sin(TAU * 1.6 * t + ph) * (1 - up * 0.5);
          if (t <= 0 || fall > 0.7) continue;
          var x = x0 + (x0 - cx) * 0.25 * up, y = ev.cy - H * K.ease.out(up) + 900 * fall * fall, s0 = t < 0.12 ? pop(K, t / 0.12) : 1, a2 = k01((0.7 - fall) / 0.2);
          if (fall > 0.04) {                          // speed lines above a falling tag
            g.save(); g.globalCompositeOperation = K.blend; g.globalAlpha = a2; g.strokeStyle = K.pat("hot", 0.9); g.lineWidth = 2; g.lineCap = "round"; g.beginPath();
            for (var j = -1; j <= 1; j++) { g.moveTo(x + j * 9, y - 30); g.lineTo(x + j * 9, y - 30 - 1800 * fall * fall * 0.12 - 10); }
            g.stroke(); g.restore();
          }
          K.sprite(g, S.tag, x, y, s0, sw, a2);
          g.save(); g.globalAlpha = a2;                // the price's own arrow, printed on the tag
          slam(K, "loss", 0.88, "hot", 0.6, 2, -2, function (q) { arrow(q, x + Math.cos(sw) * 4, y + 3, 17 * s0, 21 * s0, sw); });
          g.restore();
          K.sprite(g, S.flame, x - 9 + Math.sin(sw) * 18, y + 19, (s0 * (0.9 + 0.12 * Math.sin(eh * 37 + i))), sw * 0.5, a2);
        }
      } }
    }
  });
})();
