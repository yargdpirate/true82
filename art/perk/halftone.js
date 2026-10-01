/* Halftone Type, a Presti perk pack (art/CONTRACT-FX.md; art/CONCEPTS.md "Presti perks"). The word is made of dots:
   REFUND (one line) or FIRE and SALE (two) is sampled once into a coarse grid and every cell becomes a Ben-Day dot whose
   size is how much letter is under it, shrinking down the letter (a dot-size ramp). Under the dots, a second ink: the
   same word again as a fine-screened plate a drum's miss off. A wave of dots pops in from the middle of the word
   (back-eased, so the letters overshoot and settle), a ripple of swelling runs through them while they hold, then they
   rain down behind the buttons, the plate dropping with them. A ring and a jolt at the first pop; a clip at the
   buttons' top edge keeps their labels clear. refund: green dots over aqua. sale: gold over orange. About 1.4 s. */
(function () {
  "use strict";
  var TAU = Math.PI * 2, DUR = 1.4, COLS = 32, CELL = 9;
  function u1(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  // lines: [word, tallest cap in css px]. Drawn once at 1 px a css px and read per cell: the dots as [x, y, radius in cells,
  // when it pops in, when it falls, its place on the wave] (the cells with next to no letter in them left out), and
  // the layout of the lines (word, size, baseline) for the plate under them
  function sample(K, lines) {
    var W = COLS * CELL, c = document.createElement("canvas"), g, i, j, m, d, cap = [], px = [], tot = 0, rows, y, lay = [], A = [];
    c.width = W; c.height = 420; g = c.getContext("2d", { willReadFrequently: true });
    g.font = K.font(900, 100, "disp");
    lines.forEach(function (ln, k) {
      m = g.measureText(ln[0]); d = m.actualBoundingBoxAscent || 72;
      px.push(Math.min(100 * (W - 3 * CELL) / m.width, 100 * ln[1] / d)); cap.push(d * px[k] / 100); tot += cap[k] + (k ? CELL * 1.5 : 0);
    });
    rows = Math.ceil(tot / CELL) + 2; y = (rows * CELL - tot) / 2;
    g.fillStyle = "#000"; g.textAlign = "center";
    lines.forEach(function (ln, k) { g.font = K.font(900, px[k], "disp"); y += (k ? CELL * 1.5 : 0) + cap[k]; g.fillText(ln[0], W / 2, y); lay.push([ln[0], px[k], y]); });
    var a = g.getImageData(0, 0, W, rows * CELL).data;
    function cov(cx, cy) {                                  // the letter's share of the cell centered on (cx, cy) px
      var s = 0, x, yy, x0 = Math.round(cx - CELL / 2), y0 = Math.round(cy - CELL / 2);
      for (yy = y0; yy < y0 + CELL; yy++) for (x = x0; x < x0 + CELL; x++) s += x >= 0 && x < W && yy >= 0 && yy < rows * CELL ? a[(yy * W + x) * 4 + 3] : 0;
      return s / (CELL * CELL * 255);
    }
    for (j = 0; j < rows; j++) for (i = 0; i < COLS; i++) {
      d = cov((i + 0.5) * CELL, (j + 0.5) * CELL);
      if (d > 0.12) {
        m = Math.sqrt((i + 0.5 - COLS / 2) * (i + 0.5 - COLS / 2) / (COLS * COLS / 4) + (j + 0.5 - rows / 2) * (j + 0.5 - rows / 2) / (rows * rows / 4)) / 1.42;
        A.push(i + 0.5, j + 0.5, 0.5 * Math.sqrt(d * (0.5 + 0.5 * (1 - j / rows))), 0.03 + m * 0.22, 0.8 + 0.1 * (A.length * 7919 % 97) / 97 + (1 - m) * 0.05, m);
      }
    }
    c.width = 0;
    return { rows: rows, A: A, lay: lay };
  }
  function run(K, ev, e, k, ink) {
    var g = K.g, G = K.st[k], L = G.A, W = COLS * CELL, H = G.rows * CELL, left = Math.round(ev.cx - W / 2), top = Math.round(ev.y - 40 - H), i, t, u, s, r, f, y, fb = e - 0.8;
    if (e >= 0.1) K.shake(ev.box, 0.35, 5);
    K.ring({ x: ev.cx, y: top + H / 2, r0: 20, r1: 230, w0: 9, ink: ink, cov: 0.9, dur: 0.5, delay: 0.04 });
    g.save(); g.beginPath(); g.rect(0, 0, ev.W, ev.y + 4); g.clip(); g.globalAlpha = K.fade({ dur: DUR }, e);
    if (e > 0.12 && G.b) {                                  // the plate under the dots: it wipes in from the middle, and drops with them
      u = u1((e - 0.12) / 0.2);
      g.save(); g.beginPath(); g.rect(left + W / 2 - W / 2 * u, 0, W * u, ev.y + 4); g.clip(); g.imageSmoothingEnabled = false;
      g.drawImage(G.b, left, top + (fb > 0 ? 1200 * fb * fb : 0), W, H);
      g.restore();
    }
    g.beginPath();
    for (i = 0; i < L.length; i += 6) {                     // each dot: pops in on the wave (back-eased), swells with the ripple, falls at the end
      t = (e - L[i + 3]) * 7.2;
      if (t <= 0) continue;
      if (t < 1) { u = t - 1; s = 1 + u * u * (2.7 * u + 1.7); } else s = 1 + 0.07 * Math.sin(e * 24 - L[i + 5] * 12);
      f = e - L[i + 4]; y = top + L[i + 1] * CELL;
      if (f > 0) { y += 1200 * f * f; s *= 1 - f * 2.4; }
      r = CELL * L[i + 2] * s * 0.96;
      if (r > 0.4) { g.moveTo(left + L[i] * CELL + r, y); g.arc(left + L[i] * CELL, y, r, 0, TAU); }
    }
    g.fillStyle = K.pat(ink, 0.88, g); g.fill();
    g.restore();
  }
  window.T82ART.add("perk", "halftone", {
    name: "Halftone Type",
    by: "REFUND and FIRE SALE built from Ben-Day dots: a wave of dots pops in over a second-ink plate, ripples, and rains down.",
    prep: function (K) {
      var st = K.st, jobs = [];
      function under(key, ink) {                          // the second ink: the word again, fine-screened, in five bands that start on whole screen cells
        jobs.push(function () { K.tile(ink, 0.5); });
        function band(i) {
          jobs.push(function () {
            var d = K.d, S = K.tile(ink, 0.5).width, G = st[key], W = COLS * CELL, rows = Math.round(G.rows * CELL * d), per = S * Math.ceil(rows / S / 5), y0 = i * per, c;
            if (y0 >= rows) return;
            c = K.screen(K.plate(W, Math.min(per, rows - y0) / d, 6400 + i), ink, function (g) {
              g.translate(0, -y0 / d); g.fillStyle = K.tone(ink === "pop" ? 0.42 : 0.62); g.textAlign = "center";
              G.lay.forEach(function (l) { g.font = K.font(900, l[1], "disp"); g.fillText(l[0], W / 2 + 6, l[2] + 5); });
            });
            if (!i) { G.b = document.createElement("canvas"); G.b.width = Math.round(W * d); G.b.height = rows; }
            G.b.getContext("2d").drawImage(c, 0, y0); c.width = 0;
          });
        }
        for (var i = 0; i < 5; i++) band(i);
      }
      jobs.push(function () { st.r = sample(K, [["REFUND", 112]]); }, function () { st.s = sample(K, [["FIRE", 78], ["SALE", 78]]); });
      under("r", "pop"); under("s", "dusk");
      return jobs;
    },
    slots: {
      refund: { dur: DUR, draw: function (K, ev, e) { run(K, ev, e, "r", "good"); } },
      sale: { dur: DUR, draw: function (K, ev, e) { run(K, ev, e, "s", "hot"); } }
    }
  });
})();
