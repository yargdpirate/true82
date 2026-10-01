/* art/loss/headline.js: Extra! Extra! A front page printed on pink newsprint (the FT's salmon, here the loss ink) spins
   in like a movie insert, stops dead and holds, crooked: a masthead, double rules, a giant L headline reversed out in
   white, AT and the city in a black bar, a halftone photo of a ball and a column of grey text, the fold across it. A
   white EXTRA! stamps its corner; then the page is whipped away spinning.
   Beats: spin .14 s (less in a short moment), stop with a squash, EXTRA! at .3 s (a long moment), whipped off the last
   .06 s + the fade (.2 s, less in a short moment). Plates: the paper with every letter knocked out (loss), the white L
   (light, a hair off register), the photo (night); the city and the stamp are live type (light). */
(function () {
  "use strict";
  var PW = 168, PH = 200, PX = 4, PY = 4, W = PW + 2 * PX, H = PH + 2 * PY, TAU = Math.PI * 2;   // the plate holds the page 1:1

  function ell(g) {                                             // the headline L, one contour: its stem a fat 23% of the page
    g.beginPath(); g.moveTo(8, 44); g.lineTo(46, 44); g.lineTo(46, 126); g.lineTo(90, 126); g.lineTo(90, 152); g.lineTo(8, 152); g.closePath();
  }
  function type(K, g) {                                         // the two lines of type, laid as a mask once (text is the dear part of a job)
    g.fillStyle = K.tone(1); g.textBaseline = "alphabetic";
    g.font = K.font(700, 15, "disp"); g.textAlign = "left"; g.fillText("THE DAILY LOSS", PX + 8, PY + 25);
    if ("letterSpacing" in g) g.letterSpacing = "0px";
    g.font = K.font(700, 31, "disp"); g.textAlign = "center"; g.fillText("AT", PX + 129, PY + 66);
  }
  function paper(K, g, mask) {
    var r = K.rand(77), i;
    g.translate(PX, PY);
    g.fillStyle = K.tone(0.82); g.beginPath();                   // the cut edge: straight runs a hair off true
    for (i = 0; i <= 11; i++) g.lineTo(i * PW / 11 + (i && i < 11 ? (r() - 0.5) * 2.4 : 0), (r() - 0.5) * 2.2);
    for (i = 1; i <= 13; i++) g.lineTo(PW + (r() - 0.5) * 2.4, i * PH / 13);
    for (i = 11; i >= 0; i--) g.lineTo(i * PW / 11 + (i && i < 11 ? (r() - 0.5) * 2.4 : 0), PH + (r() - 0.5) * 2.2);
    for (i = 12; i >= 1; i--) g.lineTo((r() - 0.5) * 2.4, i * PH / 13);
    g.closePath(); g.fill();
    g.globalCompositeOperation = "destination-out"; g.fillStyle = K.tone(1);
    g.fillRect(8, 30, PW - 16, 1.6); g.fillRect(8, 34, PW - 16, 3.4);    // the double rule
    ell(g); g.fill();                                            // the headline L, knocked out: the white plate prints in it
    g.fillRect(98, 74, 62, 50);                                  // the photo's window, cleared to the stock
    for (i = 0; i < 5; i++) g.fillRect(98, 131 + i * 6.4, 62 - (i % 3) * 3 - (i === 4 ? 26 : 0), 3);   // grey text lines
    g.fillRect(8, 160, PW - 16, 26);                             // the reverse bar for the city
    for (i = 0; i < 3; i++) g.fillRect(8 + i * (PW - 16) / 3, 191, (PW - 16) / 3 - 6, 3);
    g.fillStyle = K.tone(0.7); g.fillRect(6, 99, PW - 12, 1.5);  // the fold
    g.translate(-PX, -PY); g.drawImage(mask, 0, 0, W, H);        // the masthead and AT, knocked out
  }
  function photo(K, g) {
    var gr = g.createRadialGradient(121, 93, 2, 129, 101, 24), r = K.rand(5), i;
    g.translate(PX, PY);
    g.save(); g.beginPath(); g.rect(98, 74, 62, 50); g.clip();
    gr.addColorStop(0, K.tone(0.97)); gr.addColorStop(0.6, K.tone(0.5)); gr.addColorStop(1, K.tone(0.08));
    g.fillStyle = gr; g.beginPath(); g.arc(129, 99, 24, 0, TAU); g.fill();
    g.globalCompositeOperation = "destination-out"; g.strokeStyle = K.tone(1); g.lineWidth = 1.7;   // the seams
    g.beginPath(); g.moveTo(129, 74); g.lineTo(129, 124); g.moveTo(98, 99); g.lineTo(160, 99);
    g.moveTo(114, 82); g.quadraticCurveTo(129, 99, 114, 116); g.moveTo(144, 82); g.quadraticCurveTo(129, 99, 144, 116); g.stroke();
    g.restore();
  }

  T82ART.add("loss", "headline", {
    name: "Extra Extra",
    by: "A pink newsprint front page spins in, stops dead on a giant white L headline over AT and the city, a halftone ball photo and its text, an EXTRA stamp, then is whipped away.",
    prep: function (K) {
      var st = K.st;
      return [
        function () { st.P = K.plate(W, H, 2206); },
        function () {
          var k = st.P.k, m = st.mk = document.createElement("canvas"), x;
          m.width = Math.round(W * k); m.height = Math.round(H * k); x = m.getContext("2d"); x.scale(k, k); type(K, x);
        },
        band(0), band(1), band(2),
        function () { st.ph = K.screen(st.P, "night", function (g) { photo(K, g); }); },
        function () { st.wl = K.screen(st.P, "light", function (g) { g.translate(PX + 1.4, PY + 1.1); g.fillStyle = K.tone(0.95); ell(g); g.fill(); }); },
        function () {                                    // the three plates stacked once, so the page is one drawImage a frame
          var b = st.pg.getContext("2d");
          b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = K.blend; b.drawImage(st.ph, 0, 0); b.drawImage(st.wl, 0, 0);
          st.ph.width = 0; st.ph.height = 0; st.wl.width = 0; st.wl.height = 0; st.ok = 1;
        }
      ];
      // the page screens in three bands (a whole-page screen is one job too long for an iPhone), each joined into the first
      function band(i) {
        return function () {
          var k = st.P.k, y0 = Math.round(i * H / 3 * k) / k, y1 = Math.round((i + 1) * H / 3 * k) / k, x;
          var c = K.screen(st.P, "loss", function (g) { g.beginPath(); g.rect(0, y0, W, y1 - y0); g.clip(); paper(K, g, st.mk); });
          if (!i) { st.pg = c; return; }
          x = st.pg.getContext("2d"); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "source-over"; x.drawImage(c, 0, 0);
          c.width = 0; c.height = 0;
          if (i === 2) { st.mk.width = 0; st.mk.height = 0; }
        };
      }
    },
    hit: function (K, E) {
      var B = K.box;
      K.spark({ x: B.cx, y: (B.y0 + B.y1) / 2, n: 16, ink: function (q) { return q() < 0.5 ? "light" : "loss"; }, sp: [160, 420], r: [1.2, 3.2], life: [0.25, 0.3], grav: 600, seed: E.seed, streak: true });
      K.flash(E.first ? 0.6 : 0.42);
      K.shake(Math.max(E.dur, 0.42), E.first ? 9 : 7);
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, w = Math.min(0.2, 0.3 * E.dur), f = e > E.dur - w ? Math.max(0, (E.dur - e) / w) : 1;
      if (!st.ok || f <= 0 || !K.ready) return;
      var T = E.dur - w, sp = Math.min(0.14, 0.4 * T), s = K.clamp(Math.min(1.08 * (B.y1 - B.y0) / PH, 0.74 * (B.x1 - B.x0) / PW), 0.45, 1.4), cx = B.cx, cy = (B.y0 + B.y1) / 2;
      var te = E.dur - w - 0.06, away = E.y > B.cy ? -1 : 1, tilt = -0.045 + 0.05 * (e / E.dur - 0.3), u, z = 1, rot = tilt, sx = 1, sy = 1, x = cx, y = cy, a;
      if (e < sp) {                                       // the movie spin: from a small page, turning fast and slowing
        u = 1 - Math.pow(1 - e / sp, 2); z = 0.12 + 0.88 * u; rot = tilt + (1 - u) * TAU * 0.85; sx = 1 + 0.12 * (1 - u); sy = 1 - 0.1 * (1 - u);
      } else if (e < sp + 0.08) { u = Math.sin((e - sp) / 0.08 * Math.PI); sx = 1 + 0.06 * u; sy = 1 - 0.05 * u; }    // stops dead: a squash
      if (e > sp + 0.1) rot += 0.012 * Math.sin(Math.floor(e * 12) * 2.3);    // the held page boils on twos, like stop-motion paper
      if (e > te) {                                       // whipped away, spinning the other way
        u = K.clamp((e - te) / (E.dur - te), 0, 1); u *= u; y += away * u * B.size * 0.8; rot -= u * 1.5; z *= 1 - 0.35 * u; x += u * 40;
      }
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      g.translate(x, y); g.rotate(rot); g.scale(sx * z * s, sy * z * s); g.translate(-PW / 2, -PH / 2);
      g.save(); g.translate(-PX, -PY); g.drawImage(st.pg, 0, 0, W, H); g.restore();
      if (e > sp * 0.8) {                                 // the reversed city, live, in the black bar
        var c = String(E.city || "").toUpperCase();
        if (st.c !== c) {                                // the city's size, fitted to the bar once
          st.c = c; st.px = 21; g.font = K.font(700, 21, "disp"); var tw = g.measureText("AT " + c).width;
          if (tw > 140) st.px = 21 * 140 / tw;
        }
        g.font = K.font(700, st.px, "disp");
        g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillStyle = K.pat("light", 0.88, g);
        g.fillText("AT " + c, PW / 2, 178);
      }
      if (e > sp + 0.2 && E.dur > 0.6) {                  // the stamp
        a = (e - sp - 0.2) / 0.06; u = a < 1 ? 1 + 0.9 * (1 - a) * (1 - a) : 1;
        g.save(); g.translate(PW - 22, 8); g.rotate(0.32); g.scale(u, u);
        g.font = K.font(700, 23, "disp"); g.textAlign = "center"; g.fillStyle = K.pat("light", 0.9, g); g.fillText("EXTRA!", 0, 0);
        g.lineWidth = 2.4; g.strokeStyle = g.fillStyle; g.strokeRect(-33, -22, 66, 30); g.restore();
      }
      g.restore();
    }
  });
})();
