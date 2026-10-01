/* art/loss/tear.js: The Rip. A sheet of the card's own paper (magenta) slaps on and tears open along an L: the rip zips
   down the stem and along the foot, white torn fibers and curled-back flaps line the gap, and the loss pink glows
   through it (a dot ramp: full in the middle of the gap, thinning toward the edge). It holds, then the tear heals
   back up from the top (a patch of paper zips over the glow, leaving a scar) and the sheet goes.
   Plates: two small screened jobs (the key patch, the pink glow, both just the gap's box), and two canvases printed with
   live K.pat in prep (the sheet with its hole; the white fibers, nested strokes of one lattice so a dot ramp, and the
   flaps), all clipped to the zip when drawn. Stretches with E.dur: the open hold; the zip shut is 0.15 to 0.3 s. */
(function () {
  "use strict";
  var U = 0.88, LX = 34, LY = 26, LH = 190, LW = 137, SW = 57, FH = 51, SS = 0.7, QX = LX - 12, QY = LY - 12, QW = LW + 24, QH = LH + 24;
  function ring(K, seed, amp, grow) {                      // the L's contour, torn: points every ~8 px, a spike now and then
    var r = K.rand(seed), n = [[0, 0], [SW, 0], [SW, LH - FH], [LW, LH - FH], [LW, LH], [0, LH]], out = [], i, j, a, b, k, t, m, dx, dy, d;
    for (i = 0; i < 6; i++) {
      a = n[i]; b = n[(i + 1) % 6]; k = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 8);
      for (j = 0; j < k; j++) {
        t = j / k; m = (r() - 0.5) * amp * 2 + (r() < 0.16 ? (r() < 0.5 ? -1 : 1) * amp * 1.7 : 0);
        dx = b[0] - a[0]; dy = b[1] - a[1]; d = Math.hypot(dx, dy);
        out.push([LX + a[0] + dx * t + dy / d * (m + grow) * (j ? 1 : 0.2), LY + a[1] + dy * t - dx / d * (m + grow) * (j ? 1 : 0.2)]);
      }
    }
    return out;
  }
  // add a polygon to the current path wound the way that sign says (+1 adds under the nonzero rule, -1 cuts a hole)
  function poly(g, p, sign) {
    var n = p.length, i, s = 0, q;
    for (i = 0; i < n; i++) s += p[i][0] * p[(i + 1) % n][1] - p[(i + 1) % n][0] * p[i][1];
    for (i = 0; i < n; i++) { q = p[(s * sign > 0) ? i : n - 1 - i]; g[i ? "lineTo" : "moveTo"](q[0], q[1]); }
    g.closePath();
  }
  function ragged(K) {                                     // the paper: a ragged rectangle
    var r = K.rand(9), p = [], x, y;
    for (x = 8; x < 196; x += 9) p.push([x, 6 + r() * 5]);
    for (y = 6; y < 238; y += 9) p.push([192 + r() * 4, y]);
    for (x = 196; x > 8; x -= 9) p.push([x, 234 + r() * 5]);
    for (y = 238; y > 6; y -= 9) p.push([8 + r() * 4, y]);
    return p;
  }
  var FL = [[2, 0, SW - 2, 0, SW - 8, -21, 7, -17], [LW, LH - FH + 2, LW, LH - 2, LW + 25, LH - 11, LW + 29, LH - FH + 9], [0, 4, 0, 42, -31, 31, -27, 0]];
  function flapAt(q, t0, t1, torn, grow) {                 // the stretch t0..t1 of a flap (fold to free edge) as a polygon; the free edge has a torn point
    function at(i, k, t) { return [LX + q[2 * i] + (q[2 * k] - q[2 * i]) * t, LY + q[2 * i + 1] + (q[2 * k + 1] - q[2 * i + 1]) * t]; }   // base i to tip k
    var u = at(0, 3, t1), v = at(1, 2, t1), out = [at(0, 3, t0), at(1, 2, t0), v], cx = 0, cy = 0, i;
    if (torn) out.push([(u[0] + v[0]) / 2 + (q[4] + q[6] - q[0] - q[2]) / 12, (u[1] + v[1]) / 2 + (q[5] + q[7] - q[1] - q[3]) / 12]);
    out.push(u);
    if (grow) {
      for (i = 0; i < out.length; i++) { cx += out[i][0] / out.length; cy += out[i][1] / out.length; }
      out = out.map(function (p) { return [cx + (p[0] - cx) * grow, cy + (p[1] - cy) * grow]; });
    }
    return out;
  }
  function zone(g, a, b) {                                 // add the L's stretch from progress a to b (rects) to the path
    var m = 15, y0, y1, x0, x1;
    if (b <= a) return;
    if (a < SS) {
      y0 = a <= 0 ? LY - m : LY + a / SS * LH; y1 = b >= SS ? LY + LH + m : LY + b / SS * LH;
      g.rect(LX - m, y0, SW + 2 * m, y1 - y0);
    }
    if (b > SS) {
      x0 = a <= SS ? LX + SW : LX + SW + (a - SS) / (1 - SS) * (LW - SW); x1 = b >= 1 ? LX + LW + m : LX + SW + (b - SS) / (1 - SS) * (LW - SW);
      g.rect(x0, LY + LH - FH - m, x1 - x0, FH + 2 * m);
    }
  }
  function pad(K) {                                        // a canvas for the whole sheet at U, its context scaled to sheet units (save()d for a clip)
    var c = document.createElement("canvas"), g;
    c.width = Math.round(204 * U * K.d); c.height = Math.round(244 * U * K.d); g = c.getContext("2d"); g.scale(U * K.d, U * K.d); g.save(); c.g = g;
    return c;
  }
  T82ART.add("loss", "tear", {
    name: "The Rip",
    by: "The card's paper rips open along an L, torn white edges curl back, the pink glows through, and the tear heals shut.",
    prep: function (K) {
      var st = K.st;
      return [
        function () {
          st.P = K.plate(QW * U, QH * U, 6113);
          st.sheet = ragged(K); st.hole = ring(K, 1, 3, 0); st.moat = FL.map(function (q) { return flapAt(q, 0, 1, true, 1.22); });
          st.rim = [ring(K, 2, 4.5, 1), ring(K, 3, 3, 3)];
        },
        function () {                                          // the patch: the gap's own paper, scarred where it will tear
          st.B = K.screen(st.P, "key", function (g) {
            g.scale(U, U); g.translate(-QX, -QY);
            g.beginPath(); poly(g, ring(K, 1, 3, 1), 1); g.fillStyle = K.tone(0.62); g.fill();
            g.globalCompositeOperation = "destination-out"; g.strokeStyle = K.tone(1); g.lineWidth = 2.4; g.lineJoin = "round";
            g.beginPath(); g.moveTo(LX + SW / 2, LY - 4); g.lineTo(LX + SW / 2 + 3, LY + LH * 0.4); g.lineTo(LX + SW / 2 - 3, LY + LH - FH / 2); g.lineTo(LX + SW + 20, LY + LH - FH / 2 + 2); g.lineTo(LX + LW + 4, LY + LH - FH / 2); g.stroke();
          });
        },
        function () {                                          // the glow: nested fills, coverage thinning toward the lips
          st.C = K.screen(st.P, "loss", function (g) {
            g.scale(U, U); g.translate(-QX, -QY);
            var L = [[3, 3, 0.4], [-3, 2.4, 0.45], [-9, 1.6, 0.55], [-16, 1, 0.9]], i;
            for (i = 0; i < 4; i++) { g.fillStyle = K.tone(L[i][2]); g.beginPath(); poly(g, ring(K, 1, L[i][1], L[i][0]), 1); g.fill(); }
          });
        },
        function () { st.S0 = pad(K); var g = st.S0.g; g.beginPath(); poly(g, st.sheet, 1); poly(g, st.hole, -1); for (var i = 0; i < 3; i++) poly(g, st.moat[i], -1); g.fillStyle = K.pat("key", 0.62, g); g.fill(); },
        function () {                                          // the fibers, as live strokes of one lattice on a canvas, kept off the gap and the flaps
          var R = st.R = pad(K), g = R.g, i, j;
          g.beginPath(); g.rect(-60, -60, 320, 360); poly(g, st.hole, 1); for (j = 0; j < 3; j++) poly(g, st.moat[j], 1); g.clip("evenodd");
          g.lineJoin = "round";
          for (i = 0; i < 2; i++) { g.lineWidth = [22, 14][i]; g.strokeStyle = K.pat("light", [0.25, 0.44][i], g); g.beginPath(); poly(g, st.rim[0], 1); g.stroke(); }
        },
        function () {
          var g = st.R.g, i, j;
          g.lineWidth = 7; g.strokeStyle = K.pat("light", 0.69, g); g.beginPath(); poly(g, st.rim[0], 1); g.stroke();
          g.lineWidth = 5; g.strokeStyle = K.pat("light", 0.5, g); g.beginPath(); poly(g, st.rim[1], 1); g.stroke();
          g.restore(); g.save();                               // the flaps print over the fibers: ink thickens toward the free edge
          for (j = 0; j < 3; j++) for (i = 0; i < 3; i++) { g.beginPath(); poly(g, flapAt(FL[j], i / 3, (i + 1) / 3, i === 2, 0), 1); g.fillStyle = K.pat("light", [0.44, 0.69, 0.94][i], g); g.fill(); }
          st.R.done = true;
        }
      ];
    },
    hit: function (K, E) {
      var B = K.box;
      K.flash(E.first ? 0.6 : 0.45); K.shake(Math.max(E.dur, 0.42), E.first ? 12 : 9);
      K.spark({ x: B.cx - 20, y: B.y0 + 6, n: 18, ink: "light", sp: [120, 420], r: [1, 2.6], life: [0.25, 0.25], grav: 1100, seed: E.seed, streak: true });
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, f = K.fade(E, e), i, j;
      if (!st.R || !st.R.done || f <= 0) return;
      var s = (B.y1 - B.y0) / LH, z = 1 + 0.12 * (1 - K.ease.out(e / 0.06)), eh = Math.floor(e * 12) / 12;
      var zd = K.clamp(E.dur * 0.25, 0.07, 0.14), tc = Math.max(zd + 0.07, E.dur - 0.5), hl = Math.min(0.24, (E.dur - tc) * 0.6), b = K.clamp((e - 0.02) / zd, 0, 1), a = K.clamp((e - tc) / hl, 0, 1);
      var u = K.clamp((e - tc - hl) / Math.max(0.08, E.dur - tc - hl), 0, 1), side = K.rand(E.seed ^ 61)() < 0.5 ? -1 : 1;   // healed, the sheet drops away like a torn-down poster
      var jx = 1.3 * Math.sin(eh * 51), jy = 1.3 * Math.cos(eh * 37), sh = Math.max(0, e - zd);
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      g.translate(B.cx + side * 50 * u * u, (B.y0 + B.y1) / 2 + 5 * K.smooth(0.2, E.dur, e) + 480 * u * u); g.scale(s * z, s * z); g.rotate(-0.05 + 0.03 * Math.exp(-sh * 5) * Math.sin(sh * 40) + side * 0.4 * u * u);   // the sheet shudders after the rip
      g.translate(-(LX + LW / 2), -(LY + LH / 2));
      g.drawImage(st.S0, 0, 0, 204, 244);                                                          // the sheet, with the gap and the flaps' moats cut out
      g.save(); g.beginPath(); zone(g, 0, a); zone(g, b, 1); g.clip(); g.drawImage(st.B, QX, QY, QW, QH); g.restore();
      g.save(); g.beginPath(); zone(g, a, b); g.clip();
      g.drawImage(st.C, QX + 3, QY + 2, QW, QH);
      g.drawImage(st.R, -2 + jx, -2 + jy, 204, 244);                                               // fibers and flaps; they boil on twos
      g.restore();
      if (b > 0 && b < 1 && a <= 0) {                       // the tip of the rip: a bright bar across the gap
        var x = b < SS ? LX : LX + SW + (b - SS) / (1 - SS) * (LW - SW), y = b < SS ? LY + b / SS * LH : LY + LH - FH;
        g.fillStyle = K.pat("light", 0.88, g);
        if (b < SS) g.fillRect(x - 6, y - 1.5, SW + 12, 3); else g.fillRect(x - 1.5, y - 6, 3, FH + 12);
      }
      g.restore();
    }
  });
})();
