/* art/loss/trim.js: Trim. A freshly printed proof is on the cutting table: a pink L on a magenta sheet that is graded
   from dense at the top to thin at the foot (a split-fountain print), crop marks at the corners, the L printed past
   the bottom crop line (its bleed). A guillotine blade (bolted steel, a bright edge) drops and slices the sheet along
   the crop line (a bright cut, shavings), and the cut-off strip with the L's bleed falls away. The blade climbs out,
   then creeps down again over the sheet, which trembles as it nears; for the exit the blade chops through the stem:
   the sheet is cut in two and the halves are thrown apart (a ring on the cut).
   Plates (one 124 x 178 plate and two 190 x 100 ones, three screened jobs): the pink L with its bleed and the two halves
   of the magenta sheet (graded, the L's place knocked out of it, off register by 3 px). The crop marks, blade, cut
   lines and shavings are live. Stretches with E.dur: the creep and the tremble; the chop takes the last 0.1 to 0.35 s. */
(function () {
  "use strict";
  var SW = 190, SH = 200, TY = 178, CY = 96, MX = -3, MY = 2.5, U = 1.2, TAU = Math.PI * 2;   // plate, the trim line, the second cut, the sheet's miss
  var RX = 26, RY = 24, RW = 124, RH = 178;                                       // the L plate's window on the sheet
  function lpath(K, g, dx, dy) {                        // the L as one closed contour, its foot running on past the trim line
    var r = K.rand(53), P = [[30, 28], [74, 28], [73, 144], [146, 144], [146, SH + 1], [30, SH + 1]], i, j, n, a, b;
    g.beginPath(); g.moveTo(30 + dx, 28 + dy);
    for (i = 1; i <= 6; i++) {
      a = P[i - 1]; b = P[i % 6]; n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14);
      for (j = 1; j <= n; j++) g.lineTo(a[0] + dx + (b[0] - a[0]) * j / n + (j < n ? (r() - 0.5) * 1.6 : 0), a[1] + dy + (b[1] - a[1]) * j / n + (j < n ? (r() - 0.5) * 1.6 : 0));
    }
    g.closePath();
  }
  function paper(K, g, y) {                              // the magenta sheet (one half of it), dense at the top, thin at the foot; the L's place knocked out, 3 px off
    var gr = g.createLinearGradient(0, 0, 0, SH);
    gr.addColorStop(0, K.tone(0.66)); gr.addColorStop(1, K.tone(0.3));
    g.translate(0, -y); g.fillStyle = gr; g.fillRect(0, y, SW, SH / 2);
    g.globalCompositeOperation = "destination-out"; g.fillStyle = K.tone(1); lpath(K, g, -MX, -MY); g.fill();
  }
  function part(g, can, k, ox, oy, w, h, y0, y1) {      // the slice of a plate (w x h at ox, oy on the sheet) between y0 and y1
    var a = Math.max(y0, oy), b = Math.min(y1, oy + h);
    if (b > a) g.drawImage(can, 0, (a - oy) * k, w * k, (b - a) * k, ox, a, w, b - a);
  }
  function sheet(K, g, st, y0, y1) {                    // the sheet between y0 and y1: the paper, the L, the crop marks on that piece
    var k = st.P.k * U, q = st.Q.k;                  // device px per sheet unit: the L plate was printed at U
    part(g, st.b, q, 0, 0, SW, SH / 2, y0, y1); part(g, st.d, q, 0, SH / 2, SW, SH / 2, y0, y1); part(g, st.a, k, RX, RY, RW, RH, y0, y1);
    g.fillStyle = K.pat("light", 0.9, g); g.beginPath();
    [[14, 14, -1], [176, 14, 1]].forEach(function (c) {                          // the top corners' marks stay with the sheet's top
      if (y0 > 14) return;
      g.rect(c[2] > 0 ? c[0] + 3 : c[0] - 13, 12.7, 10, 2.6); g.rect(c[0] - 1.3, 2, 2.6, 10);
    });
    [[14, -1], [176, 1]].forEach(function (c) {                                  // the bottom ones are in the strip that is cut off
      if (y1 <= TY + 1) return;
      g.rect(c[1] > 0 ? c[0] + 3 : c[0] - 13, TY + 0.2, 10, 2.6); g.rect(c[0] - 1.3, TY + 3, 2.6, 10);
    });
    g.fill();
  }
  function blade(K, g, yb, sl) {                        // the guillotine blade: a bolted steel slab (half-tone body, a bright bevel), its edge slanted
    var x0 = -26, x1 = SW + 26, i, bx, by;
    g.fillStyle = K.pat("light", 0.46, g); g.beginPath();
    g.moveTo(x0, yb - 36); g.lineTo(x1, yb - 36 - sl); g.lineTo(x1, yb - sl); g.lineTo(x0, yb); g.closePath();
    for (i = 0; i < 3; i++) { bx = x0 + (x1 - x0) * (0.14 + 0.36 * i); by = yb - 19 - sl * (bx - x0) / (x1 - x0); g.moveTo(bx + 3.6, by); g.arc(bx, by, 3.6, 0, TAU); }
    g.fill("evenodd");
    g.fillStyle = K.pat("light", 0.88, g); g.beginPath();
    g.moveTo(x0, yb - 7); g.lineTo(x1, yb - 7 - sl); g.lineTo(x1, yb - sl); g.lineTo(x0, yb); g.closePath(); g.fill();
  }
  function spot(K, E) {
    var B = K.box, s = (B.y1 - B.y0) * 1.08 / TY, r = K.rand(E.seed ^ 0x7217), side = r() < 0.5 ? -1 : 1;
    return { s: s, ox: B.cx - SW * s / 2, oy: (B.y0 + B.y1) / 2 - TY * s / 2, side: side, tilt: side * (0.02 + r() * 0.025) };
  }
  function times(E) {                                    // the beats (seconds): the cut, the blade away, the chop; a short moment runs the first two at half speed
    var k = Math.min(1, Math.max(0.5, E.dur / 0.9)), X = Math.min(0.35, 0.25 * E.dur), tE = E.dur - X, tC = 0.04 * k;
    return { k: k, X: X, tE: tE, tC: tC, tR: tC + 0.21 * k, tB: Math.max(tC + 0.1 * k, tE) };
  }
  T82ART.add("loss", "trim", {
    name: "Trim",
    by: "A proof with a pink L sits on the cutting table; a guillotine blade drops and slices off the bleed, shavings drift, the blade creeps down again and chops the sheet in two.",
    prep: function (K) {
      var st = K.st;
      return [
        function () { st.P = K.plate(RW * U, RH * U, 7219); st.Q = K.plate(SW, SH / 2, 7220); },
        function () { st.a = K.screen(st.P, "loss", function (g) { g.scale(U, U); g.translate(-RX, -RY); g.fillStyle = K.tone(0.96); lpath(K, g, 0, 0); g.fill(); }); },
        function () { st.b = K.screen(st.Q, "key", function (g) { paper(K, g, 0); }); },
        function () { st.d = K.screen(st.Q, "key", function (g) { paper(K, g, SH / 2); }); }
      ];
    },
    hit: function (K, E) {
      var S = spot(K, E), t = times(E);
      K.flash(E.first ? 0.55 : 0.4); K.shake(Math.max(E.dur, 0.4), E.first ? 12 : 9);
      K.ring({ x: E.x, y: E.y, dur: 0.34, r0: 6, r1: E.first ? 150 : 100, w0: 8, ink: "loss", cov: 0.8 });
      K.ring({ x: K.box.cx, y: S.oy + (TY + 3) * S.s, delay: 0.04, dur: 0.3, r0: 8, r1: 62, w0: 5, ink: "light", cov: 0.7 });
      if (E.dur > 0.5) K.ring({ x: K.box.cx, y: S.oy + (CY + 3) * S.s, delay: t.tB + 0.045, dur: 0.3, r0: 8, r1: 80, w0: 5, ink: "loss", cov: 0.7 });
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, f = K.fade(E, e), S = spot(K, E), s = S.s, c = K.clamp, i, r = K.rand(E.seed ^ 0x3ba);
      if (!st.a || !st.b || f <= 0) return;
      var t = times(E), X = t.X, tC = t.tC, tR = t.tR, tB = t.tB, tk = t.k, ag = Math.max(0, e - tC - 0.012);
      var hi = Math.max(420, (S.oy - K.top) / s + 70);                           // where the blade parks: out of the card's view
      var p = c(e / tC, 0, 1), z = 1 + 0.12 * (1 - p) * (1 - p), sq = Math.sin(c((e - tC) / (0.1 * tk), 0, 1) * Math.PI);
      var a2 = c((e - tB - 0.045) / Math.max(0.05, X - 0.045), 0, 1), a2s = a2 * a2, y1 = TY + 3, y2 = CY + 3, yb, sl = 8;
      var tr = e > tR && e < tB + 0.045 ? 0.9 * K.smooth(tB - 0.55, tB, e) * (Math.floor(e * 24) % 2 ? 1 : -1) : 0;      // the sheet trembles as the blade comes back
      if (e < tC) yb = y1 - 330 * (1 - e / tC * e / tC);                       // the blade: down, held, lifting, then creeping back down
      else if (e < tR) { yb = y1 - hi * Math.pow(c((e - tC - 0.07 * tk) / (0.14 * tk), 0, 1), 1.4); }
      else if (e < tB) { yb = K.lerp(y1 - hi, y2 - 128, Math.pow(K.smooth(tR, tB, e), 1.5)); }
      else { var d = c((e - tB) / 0.045, 0, 1); yb = y2 - 128 + 128 * d * d - 330 * c((e - tB - 0.09) / 0.15, 0, 1); }   // and chopping
      g.save(); g.beginPath(); g.rect(0, K.top, K.w, K.h - K.top); g.clip();
      g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      g.translate(S.ox + SW * s / 2 + tr, S.oy + TY * s / 2); g.rotate(S.tilt); g.scale(s * z, s * z * (1 - 0.04 * sq)); g.translate(-SW / 2, -TY / 2);
      if (a2 <= 0) sheet(K, g, st, 0, e < tC + 0.012 ? SH : TY);
      else {                                                                  // chopped in two: the halves are thrown apart
        g.save(); g.translate(-110 * a2s * S.side, -70 * a2s - 14 * a2); g.rotate(-0.7 * a2s * S.side); sheet(K, g, st, 0, CY); g.restore();
        g.save(); g.translate(60 * a2s * S.side, 260 * a2s); g.rotate(0.35 * a2s * S.side); sheet(K, g, st, CY, TY); g.restore();
      }
      if (e >= tC + 0.012 && ag < 1.2) {                                      // the strip that was cut off, falling
        g.save(); g.translate(-26 * ag + 40 * ag * ag * S.side, 1300 * ag * ag); g.rotate(1.1 * ag * S.side);
        sheet(K, g, st, TY, SH); g.restore();
      }
      blade(K, g, yb, sl);
      if (e > tC && e < tC + 0.07 * tk) { g.fillStyle = K.pat("light", 0.88, g); g.fillRect(-8, TY - 1.3, SW + 16, 2.6); }   // the cut, bright
      if (e > tB + 0.045 && e < tB + 0.11) { g.fillStyle = K.pat("light", 0.88, g); g.fillRect(-8, CY - 1.3, SW + 16, 2.6); }
      for (i = 0; i < 16; i++) {                                              // shavings from the cut drift down
        var x0 = 14 + r() * 162, vx = (r() - 0.5) * 70, ph = r() * 6.28, sz = 2 + r() * 2.6, ink = r() < 0.5 ? "light" : "loss", ts = e - tC - 0.02 - r() * 0.12;
        if (ts <= 0 || a2 > 0) continue;
        g.save(); g.translate(x0 + vx * ts * 0.8 + 9 * Math.sin(ts * 6 + ph), TY + 30 * ts + 26 * (1 - Math.exp(-ts * 5)) - 8); g.rotate(ph + ts * 4);
        g.fillStyle = K.pat(ink, 0.88, g); g.fillRect(-sz, -sz * 0.5, sz * 2, sz); g.restore();
      }
      g.restore();
    }
  });
})();
