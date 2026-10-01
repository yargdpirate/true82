/* Riso Emoji, a Heat Check pack (art/CONTRACT-FX.md): every beat is emoji printed as riso separations (K.emoji), each
   tier claiming more screen and more ink than the last. cold: an ice cube drops by the label, squashes, shivers, sinks.
   warm: a thermometer pops up, heat puffs rise. hot: a flame bursts from the meter with a ring of small ones. fire: a
   storm of flames spirals over the card, the card jolts. nova: meteors, then a volcano rises and erupts flames to the
   top (flash, shake). save: goat, ball and trophy shells, the GOAT last. miss: a cold face frosts over and falls.
   Inks: hot + dusk + loss for fire, pop + night + light for ice. */
(function () {
  "use strict";
  var TAU = Math.PI * 2;
  var FIRE = "\uD83D\uDD25", ICE = "\uD83E\uDDCA", THERMO = "\uD83C\uDF21\uFE0F", COMET = "\u2604\uFE0F", VOLCANO = "\uD83C\uDF0B";
  var GOAT = "\uD83D\uDC10", BALL = "\uD83C\uDFC0", CUP = "\uD83C\uDFC6", FROZE = "\uD83E\uDD76";
  var HOT = ["hot", "dusk", "loss"], ICY = ["pop", "night", "light"];
  function k01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function pop(K, p) { return p <= 0 ? 0.55 : 0.55 + 0.45 * K.ease.back(p); }            // lands from .55 with a ~10% overshoot
  function out(p) { return p >= 1 ? 0 : p <= 0 ? 1 : 1 - p; }
  function spr(K, em, x, y, s, r, a) { K.sprite(K.g, em, x, y, s, r, a); }
  function sparkInk(a, b) { return function (q) { return q() < 0.3 ? a : b; }; }
  // one emoji flown from (x, y) by (dx, dy) on a cubic ease; s0..1 pop, a spin, a fade over its last 30%
  function fly(K, em, x, y, dx, dy, p, sc, rot) {
    if (p <= 0 || p >= 1) return;
    var k = 1 - Math.pow(1 - p, 3), a = p < 0.08 ? p / 0.08 : p > 0.7 ? (1 - p) / 0.3 : 1;
    spr(K, em, x + dx * k, y + dy * k, sc * (p < 0.15 ? pop(K, p / 0.15) : 1), rot * k, a);
  }
  // a shell of riso emoji: n of one emoji, evenly round to radius R with drag, drooping, upright once popped (a
  // straight copy is the cheap print); life in seconds
  function shell(K, em, x, y, R, n, t, life, seed) {
    if (t <= 0 || t >= life) return;
    var r = K.rand(seed), i, d = 1 - Math.exp(-5.5 * t), p = t / life, a = p > 0.68 ? (1 - p) / 0.32 : 1, a0 = r() * TAU;
    for (i = 0; i < n; i++) {
      var ang = a0 + i / n * TAU, rr = R * (0.92 + r() * 0.16);
      spr(K, em, x + Math.cos(ang) * rr * d, y + Math.sin(ang) * rr * d + 64 * t * t, t < 0.14 ? pop(K, t / 0.14) : 1, t < 0.14 ? (r() - 0.5) * (0.14 - t) * 4 : 0, a);
    }
  }
  var A = window.T82ART;
  A.add("hot", "emojifire", {
    name: "Riso Emoji",
    by: "Riso emoji: an ice cube, a thermometer, a flame, a storm of flames, meteors and a volcano, goat fireworks, a frosting face.",
    prep: function (K) {
      var list = [["ice", ICE, 54, ICY, 1.1], ["thermo", THERMO, 46, ["loss", "light", "key"], 1.2], ["f24", FIRE, 24, HOT, 1.3],
        ["f34", FIRE, 34, HOT, 1.3], ["f64", FIRE, 64, HOT, 1.3], ["comet", COMET, 54, ["dusk", "hot", "loss"], 1.2],
        ["volcano", VOLCANO, 128, ["dusk", "loss", "key"], 1.2], ["goat", GOAT, 38, ["light", "pop", "loss"], 1], ["ball", BALL, 34, ["dusk", "hot", "key"], 1.2],
        ["cup", CUP, 36, ["hot", "gold", "dusk"], 1.2], ["goatBig", GOAT, 64, ["light", "pop", "loss"], 1], ["froze", FROZE, 64, ICY, 1.2]];
      return K.emojiJobs(list.map(function (it) { return [it[0], it[1], it[2], it[3], { sat: it[4] }]; }));
    },
    slots: {
      cold: { dur: 0.9, draw: function (K, ev, e) {
        var S = K.st, land = 0.15, rest = ev.cy - 12, x = Math.max(34, ev.x - 30), y, s = 1, a = 1;
        if (e < land) { var p = e / land; y = rest - 120 * (1 - p * p); s = p > 0.7 ? [0.9, 1.16] : 1; }
        else if (e < land + 0.05) { s = [1.2, 0.8]; y = rest + 5; }
        else { var q = k01((e - land - 0.05) / 0.2); s = [1.2 - 0.2 * K.ease.elastic(q), 0.8 + 0.2 * K.ease.elastic(q)]; y = rest; }
        if (e > 0.32 && e < 0.66) x += (Math.floor(e * 12) % 2 ? 1.6 : -1.6);
        if (e > 0.66) { var z = (e - 0.66) / 0.24; y += 46 * z * z; a = out(z); }
        K.ring({ x: x, y: rest + 18, r0: 10, r1: 58, w0: 4, ink: "pop", cov: 0.75, dur: 0.4, e: e - land });
        K.spark({ x: x, y: rest + 16, n: 14, ink: sparkInk("light", "pop"), sp: [70, 170], r: [1, 2.2], life: [0.28, 0.25], grav: 600, dir: -Math.PI / 2, cone: 3.6, seed: ev.seed, e: e - land });
        spr(K, S.ice, x, y, s, -0.06, a);
      } },
      warm: { dur: 0.9, draw: function (K, ev, e) {
        var S = K.st, x = Math.min(ev.W - 34, ev.x + ev.w + 22), y0 = ev.cy - 6, p = k01(e / 0.22), y = y0 + 30 - 58 * K.ease.back(p), a = 1;
        var rot = -0.32 + 0.14 * Math.sin(Math.floor(e * 12) * 1.7) * out(e / 0.7);
        if (e > 0.68) { var z = (e - 0.68) / 0.22; y += 70 * z * z; a = out(z); }
        K.ring({ x: ev.cx, y: ev.cy, r0: 10, r1: 86, w0: 5, ink: "hot", cov: 0.7, dur: 0.5 });
        K.spark({ x: ev.cx - 16, y: ev.y, n: 9, ink: sparkInk("dusk", "hot"), sp: [30, 80], r: [1.4, 2.8], life: [0.5, 0.3], grav: -120, dir: -Math.PI / 2, cone: 1.2, seed: ev.seed });
        K.spark({ x: x - 4, y: y - 10, n: 7, ink: sparkInk("loss", "hot"), sp: [30, 70], r: [1.2, 2.4], life: [0.45, 0.25], grav: -150, dir: -Math.PI / 2, cone: 1, seed: ev.seed + 5, e: e - 0.18 });
        spr(K, S.thermo, x, y, p < 1 ? pop(K, p) : 1, rot, a);
      } },
      hot: { dur: 1.1, draw: function (K, ev, e) {
        var S = K.st, i, x = ev.cx, base = ev.y + 6, eh = Math.floor(e * 12) / 12, a = 1, sc = 1;
        K.ring({ x: x, y: ev.cy, r0: 12, r1: 124, w0: 8, ink: "hot", cov: 0.88, dur: 0.45 });
        K.ring({ x: x, y: ev.cy, r0: 8, r1: 152, w0: 5, ink: "dusk", cov: 0.6, dur: 0.55, delay: 0.07 });
        K.spark({ x: x, y: ev.cy, n: 18, ink: sparkInk("light", "hot"), sp: [160, 380], r: [1.1, 2.6], life: [0.3, 0.3], grav: 500, seed: ev.seed, streak: true });
        for (i = 0; i < 7; i++) fly(K, i % 2 ? S.f24 : S.f34, x, ev.cy, Math.cos(i / 7 * TAU - 1.3) * 86, Math.sin(i / 7 * TAU - 1.3) * 70 - 26, (e - 0.04 - i * 0.02) / 0.95, 1, 0.3);
        if (e > 0.88) { var z = (e - 0.88) / 0.22; sc = 1 - 0.3 * z; a = out(z); }
        var sx = 1 + 0.05 * Math.sin(eh * 41), sy = 1 + 0.07 * Math.sin(eh * 29 + 1), s0 = e < 0.16 ? pop(K, e / 0.16) : 1;
        spr(K, S.f64, x, base - 34 * sy * s0 * sc, [sx * s0 * sc, sy * s0 * sc], 0.05 * Math.sin(eh * 17), a);
      } },
      fire: { dur: 1.4, draw: function (K, ev, e) {
        var S = K.st, i, x = ev.cx, y = ev.cy, eh = Math.floor(e * 12) / 12;
        K.shake(ev.box, 0.5, 6);
        K.ring({ x: x, y: y, r0: 12, r1: 176, w0: 9, ink: "hot", cov: 0.9, dur: 0.5 });
        K.ring({ x: x, y: y, r0: 8, r1: 210, w0: 6, ink: "dusk", cov: 0.65, dur: 0.6, delay: 0.08 });
        K.spark({ x: x, y: y, n: 30, ink: function (q) { var v = q(); return v < 0.2 ? "light" : v < 0.6 ? "hot" : "dusk"; }, sp: [200, 520], r: [1.2, 3], life: [0.35, 0.35], grav: 400, seed: ev.seed, streak: true });
        for (i = 0; i < 20; i++) {
          var p = (e - (i % 5) * 0.04) / 1.2;
          if (p <= 0 || p >= 1) continue;
          var ang = i / 20 * TAU + 2.3 * p, rad = 24 + (i % 2 ? 150 : 118) * K.ease.out(p), a = p > 0.72 ? (1 - p) / 0.28 : 1;
          spr(K, i % 3 ? S.f34 : S.f24, x + Math.cos(ang) * rad, y + Math.sin(ang) * rad * 0.82 - 70 * p, p < 0.12 ? pop(K, p / 0.12) : 1 + 0.04 * Math.sin(eh * 31 + i), 0.25 * Math.cos(ang), a);
        }
        var z = k01((e - 1.05) / 0.3), s0 = e < 0.16 ? pop(K, e / 0.16) : 1 - 0.25 * z;
        spr(K, S.f64, x, ev.y - 26, [s0 * (1 + 0.05 * Math.sin(eh * 37)), s0 * (1 + 0.07 * Math.sin(eh * 23))], 0, out(z));
      } },
      nova: { dur: 2.4, draw: function (K, ev, e) {
        var S = K.st, W = ev.W, H = ev.H, i, r = K.rand(ev.seed ^ 0x2b), vx = W / 2, vy, cy = H - 92, er = 0.62;
        K.ring({ x: ev.cx, y: ev.cy, r0: 14, r1: 230, w0: 11, ink: "hot", cov: 0.92, dur: 0.5 });
        K.spark({ x: ev.cx, y: ev.cy, n: 26, ink: sparkInk("light", "hot"), sp: [240, 560], r: [1.2, 3], life: [0.3, 0.3], grav: 300, seed: ev.seed, streak: true });
        for (i = 0; i < 5; i++) {                      // meteors, dotted tails behind in two plates
          var t0 = 0.03 + i * 0.07, p = (e - t0) / 0.5, sx = W * (0.55 + r() * 0.75), sy = -60 - r() * 120, dx = -W * 0.95, dy = H * (0.42 + r() * 0.2);
          if (p <= 0 || p >= 1) continue;
          var mx = sx + dx * p, my = sy + dy * p, j, c;
          for (c = 0; c < 2; c++) {
            K.g.save(); K.g.globalCompositeOperation = K.blend; K.g.fillStyle = K.pat(c ? "dusk" : "hot", 0.9); K.g.beginPath();
            for (j = 1; j < 9; j++) { var q = p - j * 0.035, tx = sx + dx * q + c * 3, ty = sy + dy * q - c * 3, tr = (c ? 5 : 6.5) * (1 - j / 10); if (q > 0) { K.g.moveTo(tx + tr, ty); K.g.arc(tx, ty, tr, 0, TAU); } }
            K.g.fill(); K.g.restore();
          }
          spr(K, S.comet, mx, my, 1, 0, 1);
        }
        if (e > 0.34) {
          var u = k01((e - 0.34) / 0.26), sink = e > 1.95 ? (e - 1.95) / 0.45 : 0;
          vy = H + 70 - 150 * K.ease.back(u) + 190 * sink * sink;
          if (e >= er) { K.flash(0.55, "hot"); K.shake(ev.box, 0.9, 11); }
          K.ring({ x: vx, y: cy, r0: 20, r1: W * 0.95, w0: 14, ink: "hot", cov: 0.92, dur: 0.75, e: e - er });
          K.ring({ x: vx, y: cy, r0: 12, r1: W * 1.15, w0: 8, ink: "loss", cov: 0.7, dur: 0.85, e: e - er - 0.08 });
          K.spark({ x: vx, y: cy - 30, n: 50, ink: function (q) { var v = q(); return v < 0.25 ? "light" : v < 0.65 ? "hot" : "dusk"; }, sp: [380, 980], r: [1.3, 3.4], life: [0.6, 0.6], grav: 900, dir: -Math.PI / 2, cone: 1.1, seed: ev.seed + 3, streak: true, e: e - er });
          var rf = K.rand(ev.seed ^ 0x77);               // the plume, thrown to the top and falling back
          for (i = 0; i < 26; i++) {
            var lt = e - er - (i % 2) * 0.32 - rf() * 0.12, ang = -Math.PI / 2 + (rf() - 0.5) * 0.9, sp = 700 + rf() * 620, sc = 0.85 + rf() * 0.25;
            if (lt <= 0 || lt > 1.5) continue;
            var fx = vx + Math.cos(ang) * sp * lt * 0.75, fy = cy - 40 + Math.sin(ang) * sp * lt + 760 * lt * lt;
            spr(K, i % 3 ? S.f34 : S.f64, fx, fy, lt < 0.1 ? pop(K, lt / 0.1) * sc : sc, Math.cos(ang) * 0.6, lt > 1.15 ? (1.5 - lt) / 0.35 : 1);
          }
          spr(K, S.volcano, vx, vy, 1, 0, 1);
        }
      } },
      save: { dur: 2.2, draw: function (K, ev, e) {
        var S = K.st, r = K.rand(ev.seed ^ 0x51), i, n = ev.big ? 6 : 5, ems = [S.cup, S.ball, S.goat], A = ev.area;   // the card, around the stamp
        for (i = 0; i < n; i++) {
          var t0 = i * 0.15, last = i === n - 1, bx = A.x + A.w * (last ? 0.5 : 0.2 + 0.6 * (i % 2 ? 1 - i / (n - 1) : i / (n - 1)) + (r() - 0.5) * 0.08);
          var by = A.y + A.h * (last ? 0.3 : 0.14 + r() * 0.34), lx = bx + (r() - 0.5) * 50, ly = A.y + A.h * 0.96, u = (e - t0) / 0.34, em = last ? S.goat : ems[i % 3];
          if (u > 0 && u < 1) {
            var k = K.ease.out(u), hx = lx + (bx - lx) * k, hy = ly + (by - ly) * k;
            K.spark({ x: hx, y: hy + 8, n: 10, ink: sparkInk("light", "hot"), sp: [10, 40], r: [1, 2], life: [0.18, 0.14], grav: 260, dir: Math.PI / 2, cone: 0.8, seed: ev.seed + i, e: (e - t0) % 0.2 });
            spr(K, em, hx, hy, 0.72, 0, 1);
          }
          var bt = e - t0 - 0.34;
          if (bt > 0) {
            K.ring({ x: bx, y: by, r0: 6, r1: last ? 156 : 112, w0: 6, ink: last ? "hot" : i % 2 ? "pop" : "loss", cov: 0.85, dur: 0.45, e: bt });
            K.spark({ x: bx, y: by, n: last ? 30 : 16, ink: sparkInk("light", last ? "hot" : "pop"), sp: [140, 320], r: [1, 2.4], life: [0.4, 0.35], grav: 260, seed: ev.seed + 40 + i, e: bt });
            shell(K, em, bx, by, last ? 124 : 88, last ? 12 : 10, bt, 2.2 - t0 - 0.34, ev.seed + 90 + i);
            if (last) spr(K, S.goatBig, bx, by - 6 * K.ease.out(k01(bt / 0.4)), bt < 0.16 ? pop(K, bt / 0.16) : 1, 0, out(k01((bt - 1.05) / 0.3)));
          }
        }
      } },
      miss: { dur: 1.2, draw: function (K, ev, e) {
        var S = K.st, x = Math.min(ev.W - 38, ev.x + ev.w + 46), rest = ev.cy - 2, land = 0.14, y, s = 1, a = 1, i, f = k01((e - 0.22) / 0.6), g = K.g;
        if (e < land) { var p = e / land; y = rest - 100 * (1 - p * p); s = [0.92, 1.12]; }
        else if (e < land + 0.05) { y = rest + 4; s = [1.16, 0.84]; }
        else { y = rest; s = 1; }
        if (e > 0.3 && e < 0.92) x += Math.floor(e * 12) % 2 ? 1.4 : -1.4;
        if (e > 0.94) { var z = (e - 0.94) / 0.26; y += 90 * z * z; a = out(z); }
        spr(K, S.froze, x, y, s, 0, a);
        if (f > 0 && a > 0) {
          g.save(); g.globalCompositeOperation = K.blend; g.globalAlpha = a;
          g.fillStyle = K.pat("pop", 0.12 + 0.3 * f);
          g.beginPath(); g.arc(x, y, 30, 0, TAU); g.fill();
          g.strokeStyle = K.pat("light", 0.92); g.lineCap = "round"; g.lineWidth = 2.2;
          g.beginPath();
          for (i = 0; i < 7; i++) {
            var an = i / 7 * TAU + 0.4, L = 8 + 26 * K.ease.out(f), cx = Math.cos(an), sy = Math.sin(an), bx = x + cx * (30 + L * 0.55), by = y + sy * (30 + L * 0.55);
            g.moveTo(x + cx * 30, y + sy * 30); g.lineTo(x + cx * (30 + L), y + sy * (30 + L));
            g.moveTo(bx, by); g.lineTo(bx + Math.cos(an + 0.7) * L * 0.35, by + Math.sin(an + 0.7) * L * 0.35);
            g.moveTo(bx, by); g.lineTo(bx + Math.cos(an - 0.7) * L * 0.35, by + Math.sin(an - 0.7) * L * 0.35);
          }
          g.stroke(); g.restore();
        }
        K.spark({ x: x, y: y - 40, n: 12, ink: sparkInk("light", "pop"), sp: [20, 60], r: [1, 2], life: [0.8, 0.3], grav: 90, seed: ev.seed, e: e - 0.2 });
      } }
    }
  });
})();
