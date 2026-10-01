/* Money Printer, a Presti perk pack (art/CONTRACT-FX.md; art/CONCEPTS.md "Presti perks"). One riso duplicator, two
   papers. A chunky machine (a colored lid, a drum window with spinning wedges, three buttons) drops onto the cost
   buttons from above, squashes, rings, and runs: brrr, it shakes on twos and throws ten sheets out of its lid slot in a
   fountain that arcs out over the board and falls back behind the buttons; then it shoves off to the right.
   refund: green bills, each with an aqua seal, out of a green machine with an aqua lid. sale: gold FIRE SALE flyers
   (-$2) out of a gold machine with an orange lid. Machines and paper are prepped sheets (ramped coverage, carved, a
   second ink off register), drawn as straight copies; the spokes are live. Inks: good + pop + light; hot + dusk. */
(function () {
  "use strict";
  var TAU = Math.PI * 2, DUR = 1.6;
  var GEO = { m: [280, 134, 123, 120], b: [76, 46, 38, 23], f: [80, 102, 40, 51] };   // each sheet: size and anchor, with an 8 px margin
  function u1(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function co(g, m) { g.globalCompositeOperation = m; }
  function poly(g, p) { g.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function ramp(g, w, h, a) {                      // an uneven press: tone eases off toward the lower right
    var gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0," + a + ")");
    co(g, "destination-in"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }
  function txt(K, g, s, x, y, w) {                 // display type fitted to a width, centered on y
    g.font = K.font(900, 100, "disp"); var px = 100 * w / g.measureText(s).width;
    K.text(g, s, x, y + px * 0.36, { font: K.font(900, px, "disp") });
  }
  function mach(K, g, role) {                      // the machine, 230 x 118: body, then lid and stripe, then buttons and rim in light
    var i;
    g.fillStyle = K.tone(0.92);
    if (role === 0) {
      g.beginPath(); poly(g, [10, 36, 220, 36, 228, 44, 228, 112, 2, 112, 2, 44]); g.fill();
      co(g, "destination-out"); g.beginPath(); g.arc(62, 78, 30, 0, TAU); g.fill(); g.fillRect(132, 56, 70, 8);
      ramp(g, 230, 118, 0.6);
    } else if (role === 1) {
      g.beginPath(); poly(g, [16, 16, 214, 16, 224, 36, 6, 36]); poly(g, [226, 62, 254, 54, 260, 62, 226, 78]); g.fill(); g.fillRect(2, 104, 226, 8);
      co(g, "destination-out"); g.fillRect(84, 22, 62, 6);
    } else {
      g.lineWidth = 3.5; g.strokeStyle = K.tone(0.9); g.beginPath(); g.arc(62, 78, 32, 0, TAU); g.stroke(); g.fillRect(18, 18, 194, 3);
      g.beginPath(); poly(g, [232, 50, 262, 40, 264, 50, 236, 60]); g.fill();
      for (i = 0; i < 3; i++) { g.beginPath(); g.arc(140 + i * 26, 86, 7, 0, TAU); g.fill(); }
    }
  }
  function bill(K, g, role) {                      // a bill, 60 x 30: green with a carved rule, an aqua seal
    if (role === 0) {
      g.fillStyle = K.tone(0.92); rr(g, 0, 0, 60, 30, 3); g.fill();
      co(g, "destination-out"); g.lineWidth = 1.8; rr(g, 4.5, 4.5, 51, 21, 2); g.stroke();
    } else { g.fillStyle = K.tone(0.92); g.beginPath(); g.ellipse(30, 15, 9, 7, 0, 0, TAU); g.fill(); }
  }
  function flyer(K, g, role) {                     // a flyer, 64 x 86: gold paper, FIRE SALE and -$2 carved out of it
    g.fillStyle = K.tone(role ? 0.8 : 0.92); rr(g, 0, 0, 64, 86, 3); g.fill(); co(g, "destination-out");
    if (role) g.fillRect(6, 6, 52, 74);                 // the second ink is only a printed border round the paper
    else { txt(K, g, "FIRE", 32, 20, 48); txt(K, g, "SALE", 32, 44, 48); g.fillRect(8, 60, 48, 2); txt(K, g, "-$2", 32, 73, 34); }
  }
  function put(K, g, n, x, y, rot, sx, sy) {       // a prepped sheet drawn at its anchor, a straight copy at rest
    var o = GEO[n.charAt(0)];
    g.save(); g.imageSmoothingEnabled = false; g.translate(x, y); if (rot) g.rotate(rot); if (sx !== 1 || sy !== 1) g.scale(sx, sy);
    g.drawImage(K.st[n], -o[2], -o[3], o[0], o[1]);
    g.restore();
  }
  function run(K, ev, e, c) {
    var g = K.g, X = Math.round(ev.cx), by = Math.round(ev.y - 6), u = u1(e / 0.12), sq = Math.sin(u1((e - 0.12) / 0.1) * Math.PI), v = u1((e - 0.95) / 0.45), i;
    var mx = X + (e > 0.2 && e < 0.9 ? (Math.floor(e * 12) % 2 ? 2 : -2) : 0) + 760 * v * v, my = by - 420 * (1 - u * u);
    if (e >= 0.12) K.shake(ev.box, 0.4, 6);
    K.ring({ x: X, y: by - 4, r0: 20, r1: 200, w0: 9, ink: c.a, cov: 0.9, dur: 0.45, delay: 0.12 });
    K.spark({ x: X, y: by - 8, n: 16, ink: function (q) { return q() < 0.25 ? "light" : q() < 0.6 ? c.a : c.b; }, sp: [140, 420], r: [1.2, 3], life: [0.3, 0.25], grav: 700, dir: -Math.PI / 2, cone: 3.4, seed: ev.seed, delay: 0.12, streak: 1 });
    g.save(); g.beginPath(); g.rect(0, 0, ev.W, ev.y + 4); g.clip(); g.globalAlpha = K.fade({ dur: DUR }, e);
    for (i = 0; i < c.n; i++) {                                                // sheets thrown from the lid slot, falling back behind the buttons
      var r = K.rand(ev.seed + i * 13), t = e - 0.16 - 0.04 * i, sp = (r() - 0.5) * 10, vx = c.vs ? (r() - 0.5) * c.vs : (i % 2 ? 1 : -1) * (110 + r() * 170), vy = -(560 + r() * 300);
      if (t > 0) put(K, g, c.p, X + vx * t + 9 * Math.sin(t * 10 + i), by - 92 + vy * t + 850 * t * t, sp * t * 0.5, c.f + (1 - c.f) * Math.abs(Math.cos(sp * t * 1.2)), 1);
    }
    g.save(); g.translate(mx, my);                                              // the machine: it lands squashed, runs, shoves off
    put(K, g, c.m, 0, 0, 0, 1 + 0.12 * sq, 1 - 0.12 * sq);
    g.save(); g.beginPath(); g.arc(-53, -34, 27, 0, TAU); g.clip(); g.fillStyle = K.pat(c.b, 0.85, g);   // the drum turns: bands scroll through its window
    for (i = -1; i < 5; i++) g.fillRect(-82, -62 + i * 14 - Math.floor(e * 12) * 5 % 14, 58, 6);
    g.restore();
    if (e > 0.2 && e < 0.9 && Math.floor(e * 12) % 2) {                          // brrr: speed lines either side
      g.beginPath();
      for (i = 0; i < 3; i++) { g.moveTo(-138 - i * 6, -52 + i * 22); g.lineTo(-122, -52 + i * 22); g.moveTo(138 + i * 6, -52 + i * 22); g.lineTo(122, -52 + i * 22); }
      g.lineWidth = 3; g.strokeStyle = K.pat(c.b, 0.9, g); g.stroke();
    }
    g.restore(); g.restore();
  }
  var R = { a: "good", b: "pop", m: "m0", p: "b", f: 0.12, n: 10, vs: 400 }, S = { a: "hot", b: "dusk", m: "m1", p: "f", f: 0.7, n: 8, vs: 0 };
  window.T82ART.add("perk", "moneyprint", {
    name: "Money Printer",
    by: "A riso duplicator drops onto the cost buttons and throws green bills or gold FIRE SALE flyers out of its lid in a fountain.",
    prep: function (K) {
      var st = K.st, jobs = [], P = {}, D = { m: [264, 118], b: [60, 30], f: [64, 86] };
      Object.keys(D).forEach(function (k, i) { jobs.push(function () { P[k] = K.plate(D[k][0] + 16, D[k][1] + 16, 6300 + i); }); });
      [["m0", mach, ["good", "pop", "light"], [0, [3, -2], [-1, 1]]], ["m1", mach, ["hot", "dusk", "light"], [0, [3, -2], [-1, 1]]], ["b", bill, ["good", "pop"], [0, 0]], ["f", flyer, ["hot", "dusk"], [0, [4, -3]]]].forEach(function (a) {
        var cs = [];                                // each ink's plate, then all of them printed onto the first as one sheet
        a[2].forEach(function (ink, i) { jobs.push(function () { cs[i] = K.screen(P[a[0].charAt(0)], ink, function (g) { g.translate(8, 8); a[1](K, g, i); }); }); });
        jobs.push(function () {
          var x = cs[0].getContext("2d"), i, f;
          x.globalCompositeOperation = K.blend;
          for (i = 1; i < cs.length; i++) { f = a[3][i] || [0, 0]; x.drawImage(cs[i], Math.round(f[0] * K.d), Math.round(f[1] * K.d)); cs[i].width = 0; }
          st[a[0]] = cs[0];
        });
      });
      return jobs;
    },
    slots: {
      refund: { dur: DUR, draw: function (K, ev, e) { run(K, ev, e, R); } },
      sale: { dur: DUR, draw: function (K, ev, e) { run(K, ev, e, S); } }
    }
  });
})();
