/* art/loss/sticker.js: Slap Sticker. A die-cut L sticker (pink vinyl, a white halftone die-cut border, a slanted gloss
   band, a magenta drop shadow) slaps onto the card from close up with a squash, a corner of the foot already curling
   up off the backing. It hangs (the curl creeps and flutters on twos), then the peel runs from that corner across the
   whole sticker like a page being turned, the flipped back (white dust, a bright crease) lifting away off the card.
   One screened job (the pink face); the sticker (shadow, border, face, gloss) is baked once from K.pat and the face
   plate, and each frame the stuck part and the live flap are composed on an offscreen scratch so the flap occludes
   what it covers. Stretches with E.dur: the hang and its creep; the peel is 0.2 to 0.55 s, absolute. */
(function () {
  "use strict";
  var W = 137, H = 190, BW = 9, PW = W + 10, PH = H + 10, CW = 440, CH = 370, OX = CW / 2, OY = CH / 2, PHI = 0.45, BX = 90, BY = 115;
  var NX = Math.cos(PHI), NY = Math.sin(PHI), TOE = 108, PTS = [[-68.5, -95], [-11.5, -95], [-11.5, 44], [68.5, 44], [68.5, 95], [-68.5, 95]];
  function lp(g) { g.beginPath(); for (var i = 0; i < 6; i++) g[i ? "lineTo" : "moveTo"](PTS[i][0], PTS[i][1]); g.closePath(); }
  function body(K, g, ink, cov) {                          // the L with its die-cut border, in the ink's halftone
    g.fillStyle = K.pat(ink, cov, g); g.strokeStyle = g.fillStyle; g.lineJoin = "round"; g.lineWidth = 2 * BW; lp(g); g.stroke(); g.fill();
  }
  function half(g, t) { g.rotate(PHI); g.beginPath(); g.rect(-300, -300, 300 + t, 600); g.clip(); g.rotate(-PHI); }   // the side of the fold that is still stuck
  function bake(K, st) {                                   // the whole sticker, once: shadow, border, pink face, gloss band (180 x 230 css px, centered)
    var c = document.createElement("canvas"), g;
    c.width = Math.round(2 * BX * K.d); c.height = Math.round(2 * BY * K.d); g = c.getContext("2d"); g.scale(K.d, K.d); g.translate(BX, BY);
    g.save(); g.translate(6, 7); body(K, g, "key", 0.66); g.restore();
    body(K, g, "light", 0.8); g.drawImage(st.L, -W / 2 - 5, -H / 2 - 5, PW, PH);
    g.save(); lp(g); g.clip(); g.rotate(-0.62);
    g.fillStyle = K.pat("light", 0.72, g); g.fillRect(-300, -52, 600, 13); g.fillRect(-300, -30, 600, 4.5); g.restore();
    return c;
  }
  function paint(K, st, s, tilt, t) {
    var S = st.S, g = S.getContext("2d"), d = K.d;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S.width, S.height);
    g.setTransform(d, 0, 0, d, 0, 0); g.translate(OX, OY); g.rotate(tilt); g.scale(s, s);
    g.save(); half(g, t); g.drawImage(st.B, -BX, -BY, 2 * BX, 2 * BY);                              // the sticker, as far as it is stuck
    if (t < TOE) {                                                                                  // the flap: the peeled part, turned over across the fold
      g.save(); g.transform(1 - 2 * NX * NX, -2 * NX * NY, -2 * NX * NY, 1 - 2 * NY * NY, 2 * t * NX, 2 * t * NY);
      g.globalCompositeOperation = "destination-out"; g.fillStyle = K.tone(1); g.strokeStyle = K.tone(1); g.lineJoin = "round"; g.lineWidth = 2 * BW; lp(g); g.stroke(); g.fill();
      g.globalCompositeOperation = "source-over"; body(K, g, "light", 0.34); g.restore();
      g.globalCompositeOperation = "source-atop"; g.rotate(PHI);                                    // the crease: thin bright ink along the fold, a dim band behind it
      g.fillStyle = K.pat("light", 0.56, g); g.fillRect(t - 13, -300, 13, 600);
      g.fillStyle = K.pat("light", 0.9, g); g.fillRect(t - 3.2, -300, 3.2, 600);
    }
    g.restore();
  }
  function bounds(s, tilt, t) {                            // the scratch's box (css px) that holds the stuck sticker and its flap
    var xs = [], ys = [], ca = Math.cos(tilt), sa = Math.sin(tilt), i, x, y, k, q;
    for (i = 0; i < 4; i++) {
      x = i % 2 ? 88 : -88; y = i < 2 ? -115 : 115;
      for (k = 0; k < 2; k++) {
        q = k ? 2 * (t - x * NX - y * NY) : 0;                                                      // the corner, and its mirror across the fold
        xs.push(OX + s * ((x + q * NX) * ca - (y + q * NY) * sa)); ys.push(OY + s * ((x + q * NX) * sa + (y + q * NY) * ca));
      }
    }
    var x0 = Math.max(0, Math.floor(Math.min.apply(null, xs)) - 3), y0 = Math.max(0, Math.floor(Math.min.apply(null, ys)) - 3);
    return [x0, y0, Math.min(CW, Math.ceil(Math.max.apply(null, xs)) + 3) - x0, Math.min(CH, Math.ceil(Math.max.apply(null, ys)) + 3) - y0];
  }
  T82ART.add("loss", "sticker", {
    name: "Slap Sticker",
    by: "A die-cut L sticker slaps on with a squash and a curling corner, hangs a beat, then peels off from that corner and flies away.",
    prep: function (K) {
      var st = K.st;
      return [
        function () { st.P = K.plate(PW, PH, 5521); },
        function () {
          st.L = K.screen(st.P, "loss", function (g) {
            var i, gr = g.createLinearGradient(0, 5, 0, 5 + H); gr.addColorStop(0, K.tone(0.88)); gr.addColorStop(1, K.tone(0.98));
            g.translate(5 + W / 2, 5 + H / 2); g.fillStyle = gr; lp(g); g.fill();
          });
        },
        function () { st.B = bake(K, st); },
        function () { var c = document.createElement("canvas"); c.width = Math.round(CW * K.d); c.height = Math.round(CH * K.d); st.S = c; }
      ];
    },
    hit: function (K, E) {
      K.flash(E.first ? 0.6 : 0.42); K.shake(Math.max(E.dur, 0.4), E.first ? 10 : 7);
      K.ring({ x: E.x, y: E.y, dur: 0.34, r0: 6, r1: E.first ? 150 : 100, w0: 8, ink: "loss", cov: 0.8 });
    },
    draw: function (K, E, e) {
      var st = K.st, B = K.box, g = K.g, f = K.fade(E, e);
      if (!st.B || !st.S || f <= 0) return;
      var s = (B.y1 - B.y0) / (H + 2 * BW), eh = Math.floor(e * 12) / 12, X = K.clamp(E.dur * 0.45, 0.2, 0.55), tp = Math.max(0.1, E.dur - X);
      var tau = K.clamp((e - tp) / (E.dur - tp), 0, 1), r = K.clamp((tau - 0.5) / 0.5, 0, 1);
      var z = 1 + 0.35 * (1 - K.ease.out(e / 0.06)), q = K.clamp(e / 0.08, 0, 1);
      var curl = 18 + 20 * K.smooth(0.1, tp, e) + 2.2 * Math.sin(eh * 47) * (1 - tau);                  // the corner creeps up and flutters while it hangs
      var t = tau > 0 ? K.lerp(TOE - curl, -TOE - 4, Math.pow(tau, 1.6)) : TOE - curl;
      var tq = tau > 0 ? Math.round(t * 2) / 2 : Math.round(t / 1.5) * 1.5;   // the hang repaints in coarse steps (a pixel or two of curl), the peel in fine ones
      if (tq + "/" + s !== st.tq) { paint(K, st, s, -0.1, tq); st.tq = tq + "/" + s; }
      var sq = 1 + 0.12 * Math.sin(Math.min(1, e / 0.1) * Math.PI) * (e < 0.1 ? 1 : 0);
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      g.translate(B.cx - r * r * 170, (B.y0 + B.y1) / 2 - 60 * r * r); g.rotate(-r * r * 0.9); g.scale(z * sq, z / sq);
      var bx = bounds(s, -0.1, tq), d = K.d;
      g.drawImage(st.S, bx[0] * d, bx[1] * d, bx[2] * d, bx[3] * d, bx[0] - OX, bx[1] - OY, bx[2], bx[3]);
      g.restore();
    }
  });
})();
