/* art/loss/polaroid.js: Instant Film. A polaroid flutters down onto the card and lands with a slap: a milky square, then
   the picture develops in five halftone steps, a studio shot of one giant pink L in a vignette (the picture's dots
   grow from nothing). The frame's marker scrawl is a sad face knocked out of the border. It is shaken, as you do (twice in a
   long moment), and then plucked up and off the card.
   Plates (a 128 x 128 window plate and a 158 x 186 frame plate, ten screened jobs): the pale frame (window and scrawl
   knocked out), a violet block shadow, the L in five levels (pink, coverage ramping from its lit corner) and the
   vignette in three (violet). The milk is live, five light steps. Stretches with E.dur: the develop (0.09 to 0.5 s),
   the shake and the sway; the pluck takes the last 0.1 to 0.35 s. */
(function () {
  "use strict";
  var FW = 150, FH = 178, WX = 11, WY = 11, WS = 128, TAU = Math.PI * 2, U = 1.25;      // the frame, the picture window in it
  var LV = [0.3, 0.5, 0.7, 0.88, 1], BV = [0.3, 0.62, 1];
  function lshape(g) {                                  // the L in the picture: one closed contour
    g.beginPath(); g.moveTo(26, 8); g.lineTo(61, 8); g.lineTo(60, 80); g.lineTo(102, 80); g.lineTo(102, 116); g.lineTo(26, 116); g.closePath();
  }
  function face(K, g) {                                 // a marker face on the border, knocked out of the frame (the stock shows)
    g.strokeStyle = K.tone(1); g.fillStyle = K.tone(1); g.lineCap = "round"; g.lineJoin = "round";
    g.lineWidth = 2.6; g.beginPath(); g.moveTo(88, 150); g.bezierCurveTo(80, 139, 62, 140, 62, 156); g.bezierCurveTo(63, 172, 86, 171, 88.5, 153); g.lineTo(87, 145); g.stroke();
    g.beginPath(); g.arc(70, 153, 1.9, 0, TAU); g.arc(81, 152, 1.9, 0, TAU); g.fill();
    g.lineWidth = 2.4; g.beginPath(); g.moveTo(68, 166); g.quadraticCurveTo(75.5, 159.5, 83, 165.5); g.stroke();
  }
  function spot(K, E) {
    var B = K.box, r = K.rand(E.seed ^ 0x901a), side = r() < 0.5 ? -1 : 1;
    var top = Math.max(B.spanTop == null ? 0 : B.spanTop + 2, K.top + 6, B.y0 - 18), bot = B.y1 + 2;
    return { s: (bot - top) / FH, x: B.cx, y: (top + bot) / 2, side: side, tilt: side * (0.045 + r() * 0.04) };
  }
  T82ART.add("loss", "polaroid", {
    name: "Instant Film",
    by: "A polaroid flutters down and slaps the card, the milky picture develops step by step into a studio shot of a giant L, it is shaken, then plucked off.",
    prep: function (K) {
      var st = K.st, jobs = [];
      jobs.push(function () {
        st.P = K.plate(WS * U, WS * U, 9101); st.Q = K.plate((FW + 8) * U, (FH + 8) * U, 9102);
        st.L = K.levels(st.P, "loss", function (g, m) {
          g.scale(U, U); var gr = g.createLinearGradient(26, 8, 102, 116);                      // the lit corner is heavy, the far corner thin
          gr.addColorStop(0, K.tone(0.97 * m)); gr.addColorStop(1, K.tone(0.7 * m));
          g.fillStyle = gr; lshape(g); g.fill();
        }, LV);
        st.B = K.levels(st.P, "night", function (g, m) {                       // the vignette: dots grow toward the corners
          g.scale(U, U); var gr = g.createRadialGradient(64, 62, 6, 64, 62, 92);
          gr.addColorStop(0, K.tone(0.2 * m)); gr.addColorStop(1, K.tone(0.66 * m));
          g.fillStyle = gr; g.fillRect(0, 0, WS, WS);
        }, BV);
        jobs.push.apply(jobs, st.L.jobs); jobs.push.apply(jobs, st.B.jobs);
      });
      jobs.push(function () {
        st.F = K.screen(st.Q, "light", function (g) {
          g.scale(U, U);
          g.fillStyle = K.tone(0.44); g.fillRect(0, 0, FW, FH);
          g.globalCompositeOperation = "destination-out"; g.fillStyle = K.tone(1); g.fillRect(WX, WY, WS, WS); face(K, g);
        });
      });
      jobs.push(function () {
        st.S = K.screen(st.Q, "night", function (g) {
          g.scale(U, U);
          g.fillStyle = K.tone(0.66); g.fillRect(7, 7, FW, FH);
          g.globalCompositeOperation = "destination-out"; g.fillStyle = K.tone(1); g.fillRect(0, 0, FW, FH);
        });
      });
      return jobs;
    },
    hit: function (K, E) {
      K.flash(E.first ? 0.55 : 0.4); K.shake(Math.max(E.dur, 0.4), E.first ? 11 : 8);
      K.ring({ x: E.x, y: E.y, dur: 0.34, r0: 6, r1: E.first ? 150 : 100, w0: 8, ink: "loss", cov: 0.8 });
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, f = K.fade(E, e), S = spot(K, E), s = S.s, c = K.clamp, B = K.box;
      if (!st.F || !st.S || !st.L || !st.B || f <= 0) return;
      var X = Math.min(0.35, 0.25 * E.dur), tE = E.dur - X, tN = c(E.dur * 0.3, 0.09, 0.5), pd = c((e - 0.04) / (tN - 0.04), 0, 1);
      var lv = Math.min(4, Math.floor(pd * 5 + (e > 0.02 ? 0.2 : 0))), bl = Math.min(2, Math.floor(pd * 3.2)), p = c(e / 0.08, 0, 1), q = c((e - tE) / X, 0, 1);
      var ts = Math.min(0.5, tE * 0.4), ts2 = ts + 0.45, two = ts2 + 0.35 <= tE, hop = c((e - 0.08) / 0.12, 0, 1), sq = Math.sin(c((e - 0.07) / 0.08, 0, 1) * Math.PI);
      function sh(t0, w) { return e > t0 && e < t0 + 0.35 ? Math.sin((e - t0) * w) * (1 - (e - t0) / 0.35) : 0; }    // a shake, as you do: one in a short moment, two in a long one
      var rot = S.tilt + S.side * 0.55 * (1 - p) * (1 - p) + (E.dur > 0.8 ? 0.1 * (sh(ts, 40) + (two ? sh(ts2, 40) : 0)) : 0)
        + 0.012 * Math.sin(e * 3.2) * p + S.side * 0.35 * q * q;
      var y = S.y - (B.y1 - B.y0 + 60) * (1 - p * p) - 7 * Math.sin(hop * Math.PI) - FH * s * 1.5 * q * q, x = S.x + S.side * 60 * (1 - p) * Math.sin(p * 5) + S.side * 40 * q * q + (E.dur > 0.8 ? 6 * (sh(ts, 31) + (two ? sh(ts2, 31) : 0)) : 0);
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      g.translate(x, y); g.rotate(rot); g.scale(s * (1 + 0.1 * (1 - p) + 0.12 * q + 0.03 * sq), s * (1 + 0.1 * (1 - p) + 0.12 * q - 0.04 * sq)); g.translate(-FW / 2, -FH / 2);
      g.drawImage(st.S, 0, 0, FW + 8, FH + 8);
      g.save(); g.translate(WX, WY);
      g.drawImage(st.B.at(bl), 0, 0, WS, WS); g.drawImage(st.L.at(lv), 0, 0, WS, WS);
      var milk = 0.62 - 0.62 * pd * 1.3;                                          // the milk the picture develops out of
      if (milk > 0.06) { g.fillStyle = K.pat("light", milk, g); g.fillRect(0, 0, WS, WS); }
      g.restore();
      g.drawImage(st.F, 0, 0, FW + 8, FH + 8);
      g.restore();
    }
  });
})();
