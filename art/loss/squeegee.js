/* art/loss/squeegee.js: Pull. Screen printing: an aqua screen frame slaps down over the card, its emulsion a faint aqua
   dot field with an L-shaped window of bare stock, a fat pink bead of ink along the top. A squeegee (aqua blade and bar)
   pulls the bead down, the L printing behind the blade, the bead eaten as it goes. In a long moment the blade flips and
   pulls back up as the print stroke, the L going from a light flood to full ink. The blade lifts away, then the screen
   peels off: the print's ink stretches up after it into threads that snap column by column.
   Plates (3 short jobs): the L light, the L dense with edge ridges. All else is live K.pat. The exit takes the last .12 to .85 s. */
(function () {
  "use strict";
  var PW = 150, PH = 224, OX = 75, OY = 112, PT = [[-62, -100], [-12, -100], [-12, 60], [62, 60], [62, 100], [-62, 100]];
  function id(v) { return v; }
  function Lp(g, X, Y, add) {                           // the L, one contour; X, Y map plate px to wherever it is drawn
    var i;
    if (!add) g.beginPath();
    for (i = 0; i < 6; i++) g[i ? "lineTo" : "moveTo"](X(OX + PT[i][0]), Y(OY + PT[i][1]));
    g.closePath();
  }
  function plate(K, g, hi, lo, ridge) {                 // heavy where the pull began, thinning toward the foot
    var gr = g.createLinearGradient(0, OY - 100, 0, OY + 100);
    gr.addColorStop(0, K.tone(hi)); gr.addColorStop(1, K.tone(lo));
    Lp(g, id, id); g.fillStyle = gr; g.fill();
    if (ridge) { g.lineWidth = 3.2; g.strokeStyle = K.tone(0.35); g.stroke(); }
  }
  T82ART.add("loss", "squeegee", {
    name: "Pull",
    by: "A screen frame slaps down over an L-shaped window, a squeegee pulls a bead of pink ink across it and the L prints behind the blade, then the screen peels off and the ink snaps up after it in threads.",
    prep: function (K) {
      var st = K.st;
      return [
        function () { st.P = K.plate(PW, PH, 3319); },
        function () { st.lt = K.screen(st.P, "loss", function (g) { plate(K, g, 0.72, 0.5, 0); }); },
        function () { st.dn = K.screen(st.P, "loss", function (g) { plate(K, g, 0.99, 0.86, 1); }); }
      ];
    },
    hit: function (K, E) {
      var B = K.box;
      K.spark({ x: B.cx, y: B.y0, n: 12, ink: function (q) { return q() < 0.3 ? "pop" : "loss"; }, sp: [120, 360], r: [1, 3], life: [0.25, 0.3], grav: 900, seed: E.seed, streak: true });
      K.flash(E.first ? 0.55 : 0.4); K.shake(Math.max(E.dur, 0.42), E.first ? 9 : 7);
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, i, x;
      if (!st.dn) return;
      var H = B.y1 - B.y0, s = H / 200, cx = B.cx, cy = (B.y0 + B.y1) / 2, W = B.x1 - B.x0;
      var w = Math.min(0.2, 0.3 * E.dur), T = E.dur - w, f = e > T ? (E.dur - e) / w : 1;
      if (f <= 0) return;
      var q = K.clamp((E.dur - 0.1) / 0.65, 0.3, 1), two = T > 0.85, ts = 0.05 * q, t1 = ts * 0.7, d1 = 0.2 * q;
      var t2 = t1 + d1 + 0.07, d2 = 0.26, tl = two ? t2 + d2 : t1 + d1;
      var xe = K.clamp(T - tl - 0.16, 0.12, 0.85), u = K.clamp((e - (T - xe)) / xe, 0, 1);
      var p1 = K.clamp((e - t1) / d1, 0, 1), p2 = two ? K.clamp((e - t2) / d2, 0, 1) : 0;
      var ih = Math.min(0.48 * H, W / 2 - 14), yT = B.y0 - 0.045 * H, yB = B.y1 + 0.015 * H, ft = 0.04 * H, e1 = p1 * p1 * (3 - 2 * p1), e2 = p2 * p2 * (3 - 2 * p2);
      var dir = p2 > 0 || e >= t2 && two ? -1 : 1, yb = dir > 0 ? yT + (yB - yT) * e1 : yB - (yB - yT) * e2;
      var bt = dir > 0 ? 0.09 * H * (1 - (two ? 0.45 : 0.92) * p1) : 0.05 * H * (1 - p2), lv = K.clamp((e - tl) / 0.09, 0, 1);
      function X(v) { return cx + (v - OX) * s; }
      function Y(v) { return cy + (v - OY) * s; }
      function band(img, y0, y1) {                       // the print, through a clip across the frame
        if (y1 <= y0) return;
        g.save(); g.beginPath(); g.rect(B.x0, y0, W, y1 - y0); g.clip();
        g.drawImage(img, X(0), Y(0), PW * s, PH * s); g.restore();
      }
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      var lf = u * u, sc = 1 + 0.5 * lf, dy = -0.55 * H * lf, zs = e < ts ? 1.2 - 0.2 * (e / ts) * (e / ts) : 1;
      if (u > 0) {                                       // the screen peels up toward you with the print stuck to it: a pale ghost stays, threads snap
        var r = K.rand(E.seed ^ 5151), n = 7, tx, by = cy + (B.y1 - cy) * sc + dy;
        g.beginPath(); g.rect(B.x0, B.spanTop - 14, W, B.span + 14); g.clip();
        Lp(g, X, Y); g.fillStyle = K.pat("loss", 0.19, g); g.fill();
        g.lineWidth = Math.max(2.4, 0.016 * H); g.strokeStyle = K.pat("loss", 0.88, g); g.beginPath();
        for (i = 0; i < n; i++) {
          tx = cx + (i + 0.5) / n * 124 * s - 62 * s;
          if (u < 0.35 + 0.55 * r()) { g.moveTo(tx, B.y1 - 1); g.lineTo(cx + (tx - cx) * sc, by + 2); }
        }
        g.stroke();
        for (i = 0; i < n; i++) { tx = cx + (i + 0.5) / n * 124 * s - 62 * s; g.beginPath(); g.arc(tx, B.y1 + 1, 2.4 + 2 * r(), 0, 6.3); g.fillStyle = K.pat("loss", 0.88, g); g.fill(); }
      }
      g.save(); g.translate(cx, cy + dy); g.scale(sc * zs, sc * zs); g.translate(-cx, -cy);
      if (two && p2 > 0) { band(st.lt, yT - 6, yb); band(st.dn, yb, yB + 6); }
      else band(two ? st.lt : st.dn, yT - 6, p1 > 0 ? yb : yT - 6);
      g.beginPath(); g.rect(cx - ih - ft, yT - ft, 2 * (ih + ft), yB - yT + 2 * ft); g.rect(cx - ih, yT, 2 * ih, yB - yT);
      g.fillStyle = K.pat("pop", 0.7, g); g.fill("evenodd");
      g.beginPath(); g.rect(cx - ih, yT, 2 * ih, yB - yT); Lp(g, X, Y, 1);
      g.fillStyle = K.pat("pop", 0.17, g); g.fill("evenodd");
      if (e < tl + 0.09) {                               // the squeegee: the bead rides ahead of the blade, the bar behind
        var bx = cx - ih - 0.05 * H, bw = 2 * ih + 0.1 * H, ox = lv * lv * W * 0.7, oy = -lv * 0.3 * H;
        g.save(); g.translate(ox, oy); g.rotate(lv * 0.25);
        if (bt > 1.5 && lv < 1) {
          g.beginPath(); g.moveTo(bx + 0.05 * H, yb);
          for (x = 0.05 * H; x <= bw - 0.05 * H; x += 7) g.lineTo(bx + x, yb + dir * bt * (0.72 + 0.28 * Math.sin(x * 0.19)));
          g.lineTo(bx + bw - 0.05 * H, yb); g.closePath();
          g.fillStyle = K.pat("loss", 0.86, g); g.fill();
        }
        g.fillStyle = K.pat("pop", 0.5, g); g.fillRect(bx, dir > 0 ? yb - 0.17 * H : yb + 0.035 * H, bw, 0.135 * H);
        g.fillStyle = K.pat("pop", 0.88, g); g.fillRect(bx, dir > 0 ? yb - 0.035 * H : yb, bw, 0.035 * H);
        g.restore();
      }
      g.restore(); g.restore();
    }
  });
})();
