/* art/loss/receipt.js: Receipt. A thermal printer feeds a receipt out of a slot at the top of the span, line by line
   (the print head's bright edge leads): TRUE 82, LOSS, a giant L, TOTAL -1 W, a barcode. It sways, the paper is torn
   off at the slot (a jagged top edge shows), and the strip curls up into a roll as it spins away off the card.
   Plates (one fixed 156 x 292 plate, two screened jobs): the loss-pink print, and a violet sheet knocked out under
   every mark so the print stays pure pink; the sheet sits a few px off register. Stretches with E.dur: the feed's
   second half and the hold; the tear leaves 0.25 to 0.45 s before the end, accelerating off the card. */
(function () {
  "use strict";
  var W = 166, H = 290, X0 = 8, PW = 150, TOP = 9, MX = X0 + PW / 2, U = 0.8;   // the plate holds the geometry below at 0.8 (the draw shows it at about 1.05)
  function sheet(K, g) {                                   // the paper: a torn top (hidden in the slot), a toothed bottom
    var r = K.rand(311), x, i;
    g.beginPath(); g.moveTo(X0, 6);
    for (x = X0; x <= X0 + PW; x += 6) g.lineTo(x, 1 + r() * 8);
    g.lineTo(X0 + PW, H - 9);
    for (x = X0 + PW, i = 0; x >= X0; x -= 7, i++) g.lineTo(x, H - (i % 2 ? 1 : 9));
    g.closePath();
  }
  function lPath(K, g, x, y, h) {                          // one closed contour: sharp elbow and toe, a hair of wobble
    var r = K.rand(77), w = h * 0.74, sw = h * 0.3, fh = h * 0.27;
    var P = [[0, 0], [sw, 0], [sw - 1.5, h - fh], [w, h - fh], [w, h], [0, h]];
    g.beginPath(); g.moveTo(x, y);
    for (var i = 1; i <= 6; i++) {
      var a = P[i - 1], b = P[i % 6], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 13), t;
      for (var j = 1; j <= n; j++) {
        t = j / n;
        g.lineTo(x + a[0] + (b[0] - a[0]) * t + (j < n ? (r() - 0.5) * 2 : 0), y + a[1] + (b[1] - a[1]) * t + (j < n ? (r() - 0.5) * 2 : 0));
      }
    }
    g.closePath();
  }
  // every mark of the print; o = 0 lays the ink, o > 0 lays the same marks fattened (the sheet's knockout)
  function mark(K, g, o) {
    var q = o / 2, r = K.rand(5), x, i, w;
    var ink = o ? K.tone(1) : K.tone(0.97);
    g.fillStyle = ink; g.strokeStyle = ink; g.lineWidth = o; g.lineJoin = "round"; g.textAlign = "center";
    g.font = K.font(800, 30, "disp"); g.fillText("TRUE 82", MX, 42); if (o) g.strokeText("TRUE 82", MX, 42);
    for (x = 22; x < 144; x += 8) { g.fillRect(x - q, 49 - q, 5 + o, 2 + o); g.fillRect(x - q, 240 - q, 5 + o, 2 + o); }
    g.font = K.font(700, 14, "mono");
    g.textAlign = "left"; g.fillText("TOTAL", 22, 257); if (o) g.strokeText("TOTAL", 22, 257);
    g.textAlign = "right"; g.fillText("-1 W", 144, 257); if (o) g.strokeText("-1 W", 144, 257);
    for (x = 22; x < 142;) { w = 1 + Math.floor(r() * 3) * 1.6; g.fillRect(x - q, 263 - q, w + o, 16 + o); x += w + 1.8 + r() * 2.2; }
    lPath(K, g, MX - 64, 56, 176);
    if (o) { g.fill(); g.stroke(); return; }
    var gr = g.createLinearGradient(0, 56, 0, 232);      // the deposit is light at the top and heavy at the foot
    gr.addColorStop(0, K.tone(0.78)); gr.addColorStop(0.7, K.tone(0.95)); gr.addColorStop(1, K.tone(0.98));
    g.fillStyle = gr; g.fill();
  }
  // the strip in n bands, curled up from its foot: each band's height shrinks by cos(angle); a tube ends it
  function strip(K, g, st, can, ox, oy, len, c) {
    var k = st.P.k * U, n = 12, bh = len / n, y = 0, i, th;
    if (c <= 0) { g.drawImage(can, 0, 0, W * k, len * k, ox, oy, W, len); return y + len; }
    for (i = 0; i < n; i++) {
      var a = (i + 0.5) / n, a0 = 1 - 0.62 * c, ch;
      th = a > a0 ? (a - a0) / (1 - a0) * 1.75 * c : 0; ch = bh * Math.cos(th);
      if (ch < 0.8) break;
      g.drawImage(can, 0, Math.floor(i * bh * k), W * k, Math.ceil(bh * k), ox, oy + y, W, ch + 0.4); y += ch;
    }
    return y;
  }
  function spot(K, E) {
    var B = K.box, hh = B.y1 - B.y0, yt = Math.max(B.y0 - 0.1 * hh, K.top + 14);
    return { x: B.cx, yt: yt, s: (B.y1 + 3 - yt) / (H - TOP), side: K.rand(E.seed ^ 31)() < 0.5 ? -1 : 1 };
  }
  T82ART.add("loss", "receipt", {
    name: "Receipt",
    by: "A thermal printer feeds a receipt with a giant L out of a slot, the paper is torn off and curls away.",
    // the tempo dial (art/tempo.json): phase "exit" begins at 0.606 of E.dur, where the paper is torn off and curls away (dur - X, X = clamp(0.28 dur + 0.12, 0.2, 0.45): 0.636 s of 1.05 s; 0.735 of 1.7 s)
    phases: { exit: 0.606 },
    prep: function (K) {
      var st = K.st;
      return [
        function () { st.P = K.plate(W * U, H * U, 4203); },
        function () {                                          // the shadow: only the sliver the sheet does not cover
          st.sd = K.screen(st.P, "key", function (g) {
            g.scale(U, U);
            sheet(K, g); g.fillStyle = K.tone(0.8); g.fill();
            g.globalCompositeOperation = "destination-out"; g.translate(-7, -12); sheet(K, g); g.fill();
          });
        },
        function () { st.ink = K.screen(st.P, "loss", function (g) { g.scale(U, U); mark(K, g, 0); }); },
        function () {
          st.sh = K.screen(st.P, "night", function (g) {
            g.scale(U, U);
            sheet(K, g); g.fillStyle = K.tone(0.44); g.fill();
            g.globalCompositeOperation = "destination-out"; mark(K, g, 4.5);
          });
        }
      ];
    },
    hit: function (K, E) {
      var S = spot(K, E);
      K.flash(E.first ? 0.6 : 0.42); K.shake(Math.max(E.dur, 0.4), E.first ? 9 : 6);
      K.ring({ x: E.x, y: E.y, dur: 0.34, r0: 6, r1: E.first ? 150 : 100, w0: 8, ink: "loss", cov: 0.8 });
      K.spark({ x: S.x, y: S.yt, n: 14, ink: "light", sp: [90, 330], r: [1, 2.4], life: [0.2, 0.2], grav: 900, seed: E.seed });
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, f = K.fade(E, e), S = spot(K, E), s = S.s;
      if (!st.ink || !st.sh || !st.sd || f <= 0) return;
      var F1 = K.clamp(E.dur * 0.4, 0.07, 0.12), X = K.clamp(0.28 * E.dur + 0.12, 0.2, 0.45), tT = Math.max(F1 + 0.03, E.dur - X), p = K.clamp((e - tT) / (E.dur - tT), 0, 1);
      var a = K.ease.out(K.clamp(e / F1, 0, 1)) * 0.78, b = K.clamp((e - F1) / Math.max(0.03, tT - F1 - 0.06), 0, 1) * 0.22;
      var len = Math.min(H, TOP + Math.ceil((H - TOP) * Math.min(1, a + b) / 11) * 11);   // line feed: 11 px steps
      var fl = K.smooth(0, 0.1, p), c = K.smooth(0.06, 0.72, p), er = Math.max(0, e - F1);
      var rot = 0.05 * Math.exp(-er * 1.6) * Math.sin(er * 9) * (1 - fl) + S.side * (0.07 * fl + 2.5 * p * p);
      var oy = TOP + fl * (len - TOP) / 2;                  // pivot: the slot while it hangs, the strip's middle once free
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      var lipY = S.yt - 5 * s - 18 * (1 - K.ease.out(e / 0.05)) - 90 * K.smooth(0.1, 0.7, p);   // the slot retracts once the paper is torn off
      lipY = Math.max(K.top + 2, lipY);
      g.fillStyle = K.pat("night", 0.78, g); g.fillRect(S.x - PW * s * 0.68, lipY, PW * s * 1.36, 9 * s);
      g.fillStyle = K.pat("light", 0.88, g); g.fillRect(S.x - PW * s * 0.68, lipY + 9 * s - 1.6, PW * s * 1.36, 1.6);   // the lip's lit edge
      g.fillStyle = K.pat("loss", 0.88, g); g.fillRect(S.x + PW * s * 0.5, lipY + 2.5 * s, 7 * s, 4 * s);              // the ready light
      g.save();
      if (p <= 0.05) { g.beginPath(); g.rect(0, S.yt, K.w, K.h); g.clip(); }
      g.translate(S.x + S.side * 330 * p * p, S.yt + (oy - TOP) * s + 12 * s * fl - 30 * p);
      g.rotate(rot); g.scale(s, s); g.translate(-MX, -oy);
      strip(K, g, st, st.sd, 11, 9, len, c);                // the tonal shadow plate, a block off to one side
      var ye = strip(K, g, st, st.sh, 4, -3, len, c);       // the sheet misses the print by (4, -3)
      strip(K, g, st, st.ink, 0, 0, len, c);
      if (c > 0.02) {                                       // the roll the foot curls into
        var d = 6 + 26 * c, j;
        for (j = 0; j < 3; j++) {
          g.fillStyle = K.pat("night", [0.55, 0.88, 0.62][j], g);
          g.fillRect(X0 + 3, ye - d / 2 + j * d / 3, PW - 6, d / 3 + 0.4);
        }
      }
      if (e < tT && len < H) { g.fillStyle = K.pat("light", 0.88, g); g.fillRect(X0 - 6, len - 1.5, PW + 12, 3.2); }   // the print head
      g.restore(); g.restore();
    }
  });
})();
