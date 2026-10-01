/* Stamped, a Presti perk pack (art/CONTRACT-FX.md). A clerk stamps the board twice. refund: a wooden stamp block (a
   bullseye knob seen from above) comes down on the cost buttons and bites an aqua REFUND, lifts, comes down again and
   bites it in money green a drum's miss off, ink beading off the rim. sale: the same two strikes spell FIRE SALE in
   orange then gold, the gold one scorched: corners burnt away, the orange glowing through as an ember rim, flames
   licking the bites, embers rising. Block down 0 to 0.1 s, strikes at 0.1 and 0.4 (the heavy one: flash, shake), hold,
   then the print peels off by its top corner and drops behind the buttons by 1.3 s. Prepped in bands: each strike's
   impression (ink pooled at the rim, worn rubber, an uneven press, its tilt printed in) and both struck as one sheet,
   so a frame is a straight copy. Live: blocks, drips, flames, sparks. Inks: pop + good; dusk + hot. */
(function () {
  "use strict";
  var TAU = Math.PI * 2, PW = 332, PH = 164, CX = 166, CY = 82, DUR = 1.3, T1 = 0.1, T2 = 0.4;
  var BITES = [[303, 126, 40, 1.1], [10, 15, 34, 2.3], [306, 16, 25, 4.1], [140, 134, 22, 5.2], [64, 135, 15, 6.3]];
  var FL = [[-128, -46], [-146, -20], [120, -46], [142, -26], [124, 48], [148, 22], [-14, 54]];
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function blob(g, b, d) {                         // a burnt bite: a ragged blob, the same for both strikes
    var i, a, q;
    g.beginPath();
    for (i = 0; i < 28; i++) {
      a = i / 28 * TAU; q = (b[2] - d) * (0.78 + 0.17 * Math.sin(3 * a + b[3]) + 0.1 * Math.sin(7 * a + b[3] * 2) + 0.07 * Math.sin(13 * a + b[3] * 3));
      g.lineTo(b[0] + Math.cos(a) * q, b[1] + Math.sin(a) * q);
    }
    g.closePath(); g.fill();
  }
  // one strike's tone: a rim, a rule, the word (ink pooled at its edges: a full stroke round a lighter fill), worn
  // rubber, the burnt bites, all tilted; then an uneven press that eases off toward the lower left
  function strike(K, g, o) {
    var r = K.rand(o.seed), i, m, px, y;
    g.save(); g.translate(CX, CY); g.rotate(o.tilt); g.translate(-158, -70);
    g.strokeStyle = g.fillStyle = K.tone(1); g.lineJoin = "round";
    g.lineWidth = 9; rr(g, 14.5, 16, 287, 108, 7); g.stroke();
    g.lineWidth = 2.4; rr(g, 26, 27.5, 264, 85, 3); g.stroke();
    g.font = K.font(900, 100, "disp"); m = g.measureText(o.word);
    px = Math.min(24400 / m.width, 6400 / (m.actualBoundingBoxAscent || 72));
    g.font = K.font(900, px, "disp"); m = g.measureText(o.word);
    g.textAlign = "center"; y = 70 + m.actualBoundingBoxAscent / 2;
    g.fillStyle = K.tone(0.84); g.fillText(o.word, 158, y);
    g.lineWidth = 2.2; g.strokeStyle = K.tone(1); g.strokeText(o.word, 158, y);
    g.globalCompositeOperation = "destination-out";
    for (i = 0; i < 34; i++) { g.globalAlpha = 0.4 + r() * 0.5; g.beginPath(); g.ellipse(14 + r() * 288, 14 + r() * 112, 1 + r() * 3.2, 0.7 + r() * 1.5, r() * 3, 0, TAU); g.fill(); }
    g.globalAlpha = 1;
    if (o.bite != null) BITES.forEach(function (b) { blob(g, b, o.bite); });
    g.restore();
    var gr = g.createLinearGradient(0, PH, PW, 0);
    gr.addColorStop(0, "rgba(0,0,0," + o.k * 0.78 + ")"); gr.addColorStop(1, "rgba(0,0,0," + o.k + ")");
    g.globalCompositeOperation = "destination-in"; g.fillStyle = gr; g.fillRect(0, 0, PW, PH);
  }
  function imp(K, g, can, t, e, x, y) {              // a straight copy, squashed for a moment as the strike bites
    var k = 1 - K.ease.out((e - t) / 0.2);
    if (!can || e < t) return;
    g.save(); g.imageSmoothingEnabled = false; g.translate(x, y); if (k > 0.01) g.scale(1 + 0.07 * k, 1 - 0.08 * k);
    g.drawImage(can, -CX, -CY, PW, PH);
    g.restore();
  }
  // the stamp block seen from above: a rim of wood, a bullseye knob; it comes down fast (z falls to 1), holds squashed
  // for two frames, lifts away and fades
  function block(K, g, ink, t, e, x, y, rot) {
    if (e < t - 0.1 || e > t + 0.2) return;
    var u = (e - t + 0.1) / 0.1, v = (e - t - 0.05) / 0.15, z = 1, a = 1, sy = 1;
    if (e < t) { z = 1 + 0.4 * (1 - u * u); a = 0.3 + 0.7 * u; rot += 0.12 * (1 - u); }
    else if (e < t + 0.05) sy = 0.95;
    else { z = 1 + 0.35 * v * v; a = 1 - v; }
    g.save(); g.globalAlpha *= a;
    g.translate(x, y); g.rotate(rot); g.scale(z, z * sy);
    rr(g, -164, -70, 328, 140, 11); g.lineWidth = 8; g.strokeStyle = K.pat(ink, 0.55, g); g.stroke();
    g.beginPath(); g.arc(0, 0, 42, 0, TAU); g.lineWidth = 7; g.strokeStyle = K.pat("light", 0.85, g); g.stroke();
    g.beginPath(); g.arc(0, 0, 23, 0, TAU); g.fillStyle = K.pat("light", 0.55, g); g.fill();
    g.restore();
  }
  function flame(K, g, x, y, w, h, lean, ink, cov) {   // a leaf of flame with a curling tip
    g.beginPath(); g.moveTo(x - w, y);
    g.bezierCurveTo(x - w * 1.15, y - h * 0.4, x - w * 0.1, y - h * 0.5, x + lean, y - h);
    g.bezierCurveTo(x + w * 0.2, y - h * 0.5, x + w * 1.2, y - h * 0.4, x + w, y);
    g.closePath(); g.fillStyle = K.pat(ink, cov, g); g.fill();
  }
  function inkOf(a, b) { return function (q) { var v = q(); return v < 0.2 ? "light" : v < 0.6 ? a : b; }; }
  function go(K, ev, e, c) {
    var g = K.g, st = K.st, X = Math.round(ev.cx), Y = Math.round(ev.y - 96), hw = 150;
    var u = K.clamp((e - 0.92) / 0.38, 0, 1), px = X - hw, py = Y - 60, eh = Math.floor(e * 12) / 12, i, kids = ev.box && ev.box.children, ink = inkOf(c.a, c.b);
    if (e >= T1) K.shake(ev.box, 0.3, 5);
    if (e >= T2) { K.flash(0.18, c.b); for (i = 0; kids && i < kids.length; i++) K.shake(kids[i], 0.4, 8); }
    g.save(); g.beginPath(); g.rect(0, 0, ev.W, ev.y + 4); g.clip();           // nothing prints over the buttons' labels
    g.globalAlpha = K.fade({ dur: DUR }, e);
    g.save();
    if (u > 0) { g.translate(px, py + 300 * u * u); g.rotate(0.5 * u * u); g.translate(-px, -py); }
    if (e < T2) imp(K, g, st[c.pa], T1, e, X - 8, Y + 6);
    else imp(K, g, st[c.pb], T2, e, X, Y);
    block(K, g, c.a, T1, e, X, Y, c.tilt);
    block(K, g, c.b, T2, e, X, Y, c.tilt);
    if (c.burn && e > T2) {                                                    // flames lick the burnt bites
      for (i = 0; i < FL.length; i++) {
        var gi = K.clamp((e - T2 - 0.05 - i * 0.025) / 0.1, 0, 1), h = (36 + 14 * Math.sin(eh * 43 + i * 2.1)) * gi, w = 10 + 2.5 * Math.sin(eh * 29 + i);
        if (gi <= 0) continue;
        flame(K, g, X + FL[i][0], Y + FL[i][1], w, h, 6 * Math.sin(eh * 37 + i), "dusk", 0.88);
        flame(K, g, X + FL[i][0], Y + FL[i][1], w * 0.5, h * 0.58, 3 * Math.sin(eh * 31 + i), "hot", 0.9);
      }
    } else if (e > T2 + 0.08 && !c.burn) {                                     // wet ink beads and runs off the rim
      g.fillStyle = K.pat(c.b, 0.9, g);
      for (i = 0; i < 4; i++) {
        var d = [-96, -34, 40, 104][i], len = K.ease.out((e - T2 - 0.08 - i * 0.05) / 0.4) * (16 + 9 * ((i * 7) % 3)), y0 = Y + 54;
        if (len <= 0) continue;
        g.beginPath(); g.moveTo(X + d - 2.2, y0); g.lineTo(X + d - 1.4, y0 + len); g.arc(X + d, y0 + len, 3, Math.PI, 0, true); g.lineTo(X + d + 2.2, y0); g.fill();
      }
    }
    g.restore();
    [[-hw, Math.PI, T1, 9, 80, 300], [hw, 0, T1, 9, 80, 300], [-hw, Math.PI, T2, 13, 120, 420], [hw, 0, T2, 13, 120, 420], [0, -Math.PI / 2, T2, 12, 100, 360]].forEach(function (q, j) {
      K.spark({ x: X + q[0], y: q[1] < -1 ? Y - 56 : Y, n: q[3], ink: ink, sp: [q[4], q[5]], r: [1.3, 3.4], life: [0.3, 0.28], grav: 520, dir: q[1], cone: 2.4, seed: ev.seed + j * 3, delay: q[2] });
    });
    if (c.burn) K.spark({ x: X, y: Y - 40, n: 16, ink: inkOf("dusk", "hot"), sp: [30, 120], r: [1, 2.2], life: [0.5, 0.4], grav: -170, dir: -Math.PI / 2, cone: 3, seed: ev.seed + 11, delay: T2 + 0.06 });
    g.restore();
  }
  var R = { a: "pop", b: "good", pa: "ra", pb: "rb", tilt: -0.05 }, S = { a: "dusk", b: "hot", pa: "sa", pb: "sb", tilt: 0.045, burn: 1 };
  window.T82ART.add("perk", "stamps", {
    name: "Stamped",
    by: "A wooden stamp comes down twice on the cost buttons: an aqua then a green REFUND; an orange then a gold FIRE SALE, its second strike burnt at the edge.",
    prep: function (K) {
      var st = K.st, jobs = [];
      // one impression screened in six bands (each job a few ms): a band starts on a whole number of the ink's screen
      // cells, so the dots run on across the joins
      function shot(key, ink, draw) {
        function job(i) {
          jobs.push(function () {
            var d = K.d, S = K.tile(ink, 0.5).width, rows = Math.round(PH * d), per = S * Math.ceil(rows / S / 6), y0 = i * per, c;
            if (y0 >= rows) return;
            c = K.screen(K.plate(PW, Math.min(per, rows - y0) / d, 6200 + i + key.length), ink, function (g) { g.translate(0, -y0 / d); draw(g); });
            if (!i) { st[key] = document.createElement("canvas"); st[key].width = Math.round(PW * d); st[key].height = rows; }
            st[key].getContext("2d").drawImage(c, 0, y0); c.width = 0;
          });
        }
        jobs.push(function () { K.tile(ink, 0.5); });
        for (var i = 0; i < 6; i++) job(i);
      }
      function pair(k, w, ink1, ink2, tilt, o1, o2) {  // two strikes: the first alone (it shows until the second lands), then both struck as one sheet
        shot(k + "a", ink1, function (g) { strike(K, g, { word: w, seed: o1[0], k: o1[1], tilt: tilt - 0.01, bite: o1[2] }); });
        shot(k + "b", ink2, function (g) { strike(K, g, { word: w, seed: o2[0], k: o2[1], tilt: tilt + 0.01, bite: o2[2] }); });
        jobs.push(function () { var x = st[k + "b"].getContext("2d"); x.globalCompositeOperation = K.blend; x.drawImage(st[k + "a"], Math.round(-8 * K.d), Math.round(6 * K.d)); });
      }
      pair("r", "REFUND", "pop", "good", R.tilt, [11, 0.5], [12, 1]);
      pair("s", "FIRE SALE", "dusk", "hot", S.tilt, [13, 0.65, 7], [14, 1, 0]);
      return jobs;
    },
    slots: {
      refund: { dur: DUR, draw: function (K, ev, e) { go(K, ev, e, R); } },
      sale: { dur: DUR, draw: function (K, ev, e) { go(K, ev, e, S); } }
    }
  });
})();
