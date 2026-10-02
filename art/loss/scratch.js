/* art/loss/scratch.js: Scratch-Off. A losing lottery scratcher: a violet halftone foil card with SCRATCH TO WIN and a
   pink border slaps down; a coin scribbles back and forth over it in five frantic rows and the foil comes away in
   rough strokes, leaving a magenta window with a big pink L in it; foil shavings fly and the coin is flicked off. A
   NOT A WINNER stamp slaps on (a long moment); then the card starts to rip from the bottom, the crack opening
   slowly like a hinge, and is torn in two and flung apart.
   Beats: slap 0 to .05, scratch 0 to .2 (.4 T in a short moment), stamp .45, the rip from .6 to the tear, the tear
   the last .12 s + the fade. All live: K.pat fills clipped to the scratched rows (clip, never an erased canvas); no prep.
   Inks: night (the foil), loss (the L, the border, the title), key (the window), light (coin, stamp, torn edge). */
(function () {
  "use strict";
  var NR = 5, TAU = Math.PI * 2;

  T82ART.add("loss", "scratch", {
    name: "Scratch-Off",
    by: "A violet foil lottery scratcher slaps down, a coin scribbles the foil away in five rows to reveal a big pink L, a NOT A WINNER stamp lands, then the card rips slowly open from the bottom and is torn in two.",
    // the tempo dial (art/tempo.json): phase "exit" begins at 0.571 of E.dur, where the card starts to rip (rs: fixed at 0.6 s in a 0.8 to 1.25 s moment, so its place in a 1.05 s one; 0.488 of 1.7 s)
    phases: { exit: 0.571 },
    hit: function (K, E) {
      var B = K.box, H = B.y1 - B.y0, tw = Math.min(B.x1 - B.x0 - 24, 1.0 * H);
      K.spark({ x: B.cx, y: (B.y0 + B.y1) / 2, n: 14, ink: function (q) { return q() < 0.6 ? "night" : "light"; }, sp: [120, 360], r: [1, 2.8], life: [0.25, 0.3], grav: 600, seed: E.seed, streak: true });
      K.flash(E.first ? 0.6 : 0.42);
      K.shake(Math.max(E.dur, 0.42), E.first ? 8 : 6);
      if (E.dur > 0.8) K.ring({ x: B.cx + 0.1 * tw, y: (B.y0 + B.y1) / 2 + 0.415 * H, delay: 0.45, dur: 0.3, r0: 8, r1: 64, w0: 5, ink: "loss", cov: 0.7 });
    },
    draw: function (K, E, e) {
      var g = K.g, B = K.box, w = Math.min(0.2, 0.3 * E.dur), f = e > E.dur - w ? Math.max(0, (E.dur - e) / w) : 1;
      if (f <= 0 || !K.ready) return;
      var H = B.y1 - B.y0, tw = Math.min(B.x1 - B.x0 - 24, 1.0 * H), th = 1.0 * H, T = E.dur - w, r = K.rand(E.seed ^ 0x5c4a), i, j, k, u;
      var ts = Math.min(0.2, 0.4 * T), te = Math.max(ts + 0.03, T - 0.12), away = E.y > B.cy ? -1 : 1;
      var rs = Math.max(0.6, te - 0.55), rip = E.dur > 0.8 && e > rs && te > rs + 0.05, ho = rip ? K.clamp((e - rs) / (te - rs), 0, 1) : 0, tr0 = rip ? rs : te;
      var Lh = 0.6 * th, Lw = 0.58 * Lh, sw = 0.27 * Lh, ft = 0.2 * Lh, wy = 0.005 * th;                  // the L and the window it sits in
      var wx0 = -Lw / 2 - 0.1 * Lh, wx1 = Lw / 2 + 0.1 * Lh, wy0 = wy - Lh / 2 - 0.07 * Lh, wy1 = wy + Lh / 2 + 0.07 * Lh, rh = (wy1 - wy0) / NR;
      var prog = K.clamp(e / ts, 0, 1) * NR, row = Math.min(NR - 1, Math.floor(prog)), fr = prog - row;
      var jit = [], hx = 0, hy = 0;
      for (i = 0; i < NR * 8; i++) jit.push((r() - 0.5) * 2);
      function swath(add) {                              // the scratched rows as one stepped polygon, the last row still growing
        var i, P = [], Q = [], yt, yb, xl, xr, dir, xh;
        if (!add) g.beginPath();
        if (e <= 0) return;
        for (i = 0; i <= row; i++) {
          dir = i % 2 ? -1 : 1; yt = wy0 + i * rh; yb = yt + rh; xl = wx0 + jit[i * 2] * 5; xr = wx1 + jit[i * 2 + 1] * 5;
          if (i === row) { xh = dir > 0 ? xl + (xr - xl) * fr : xr - (xr - xl) * fr; if (dir > 0) xr = xh + 8; else xl = xh - 8; hx = xh; hy = (yt + yb) / 2; }
          P.push([xl, yt + (i ? 0 : jit[20] * 3)], [xl + jit[i + 10] * 3, (yt + yb) / 2], [xl, yb]); Q.push([xr, yt], [xr + jit[i + 25] * 3, (yt + yb) / 2], [xr, yb]);
        }
        for (i = 0; i < P.length; i++) g[i ? "lineTo" : "moveTo"](P[i][0], P[i][1]);
        g.lineTo((P[P.length - 1][0] + Q[Q.length - 1][0]) / 2, P[P.length - 1][1] + jit[30] * 3);
        for (i = Q.length - 1; i >= 0; i--) g.lineTo(Q[i][0], Q[i][1]);
        g.closePath();
      }
      function card(g) {                                 // the whole card, in local coordinates (origin at its middle)
        var rr = 0.07 * th, k, v;
        function rrect() { g.beginPath(); g.moveTo(-tw / 2 + rr, -th / 2); g.lineTo(tw / 2 - rr, -th / 2); g.quadraticCurveTo(tw / 2, -th / 2, tw / 2, -th / 2 + rr); g.lineTo(tw / 2, th / 2 - rr); g.quadraticCurveTo(tw / 2, th / 2, tw / 2 - rr, th / 2); g.lineTo(-tw / 2 + rr, th / 2); g.quadraticCurveTo(-tw / 2, th / 2, -tw / 2, th / 2 - rr); g.lineTo(-tw / 2, -th / 2 + rr); g.quadraticCurveTo(-tw / 2, -th / 2, -tw / 2 + rr, -th / 2); g.closePath(); }
        rrect(); swath(true); g.fillStyle = K.pat("night", 0.78, g); g.fill("evenodd");    // the foil, where it is not scratched: the card with the scratched rows as a hole
        g.fillStyle = K.pat("loss", 0.88, g); g.font = K.font(700, 0.09 * th, "disp"); g.textAlign = "center"; g.textBaseline = "alphabetic";
        if ("letterSpacing" in g) g.letterSpacing = (0.012 * th) + "px";
        g.fillText("SCRATCH TO WIN", 0, -th / 2 + 0.125 * th); if ("letterSpacing" in g) g.letterSpacing = "0px";
        rrect(); g.lineWidth = 0.032 * th; g.strokeStyle = K.pat("loss", 0.88, g); g.stroke();
        swath(); g.fillStyle = K.pat("key", 0.5, g); g.fill();                                                                         // the window under the foil
        g.save(); swath(); g.clip();                                                                                              // and the L in it
        
        g.beginPath(); g.moveTo(-Lw / 2, wy - Lh / 2); g.lineTo(-Lw / 2 + sw, wy - Lh / 2); g.lineTo(-Lw / 2 + sw, wy + Lh / 2 - ft); g.lineTo(Lw / 2, wy + Lh / 2 - ft); g.lineTo(Lw / 2, wy + Lh / 2); g.lineTo(-Lw / 2, wy + Lh / 2); g.closePath();
        g.fillStyle = K.pat("loss", 0.88, g); g.fill(); g.restore();
        if (e > 0 && e < ts + 0.3) {                                                                                               // the coin (it is flicked off when the scratching is done) and the shavings
          if (e > ts) { v = e - ts; hx += v * 150; hy += 1500 * v * v; }
          g.beginPath(); g.ellipse(hx, hy, 0.058 * th * (e > ts ? Math.abs(Math.cos(v * 14)) * 0.8 + 0.2 : 1), 0.058 * th, 0, 0, TAU); g.fillStyle = K.pat("light", 0.84, g); g.fill();
          g.beginPath(); g.ellipse(hx, hy, 0.037 * th * (e > ts ? Math.abs(Math.cos(v * 14)) * 0.8 + 0.2 : 1), 0.037 * th, 0, 0, TAU); g.lineWidth = 2.4; g.strokeStyle = K.pat("night", 0.9, g); g.stroke();
          if (e < ts + 0.02) for (k = 0; k < 10; k++) { v = (e * 7 + k * 0.37) % 1; g.fillStyle = K.pat("night", 0.88, g); g.fillRect(hx - (k % 2 ? 1 : -1) * v * 40 * (0.4 + (k % 3) * 0.4), hy + v * v * 70 - 8 + k * 2, 4, 4); }
        }
        if (e > 0.45 && E.dur > 0.8) {                                                                                            // the stamp
          var a = (e - 0.45) / 0.06, z = a < 1 ? 1 + 0.9 * (1 - a) * (1 - a) : 1;
          g.save(); g.translate(0.1 * tw, 0.415 * th); g.rotate(-0.08); g.scale(z, z); g.font = K.font(700, 0.068 * th, "mono"); g.textAlign = "center";
          g.fillStyle = K.pat("light", 0.9, g); g.fillText("NOT A WINNER", 0, 0); g.lineWidth = 2.4; g.strokeStyle = g.fillStyle; g.strokeRect(-0.27 * tw, -0.07 * th, 0.54 * tw, 0.1 * th); g.restore();
        }
      }
      var cy = (B.y0 + B.y1) / 2, zz = e < 0.05 ? 1 + 0.3 * Math.pow(1 - e / 0.05, 2) : 1;
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      if (e < te && !rip) { g.translate(B.cx, cy); g.rotate(-0.03); g.scale(zz, zz); card(g); }
      else {                                              // torn in two along a jagged line: first a slow hinge at the top, then flung apart
        u = K.clamp((e - te) / 0.12 + 0.0001, 0, 1); u *= u;
        var tr = [], q = K.rand(E.seed ^ 77), op = 0.17 * ho * ho;
        for (i = 0; i <= 8; i++) tr.push([(q() - 0.5) * 0.14 * tw, -th / 2 - 8 + i * (th + 16) / 8]);
        for (k = -1; k <= 1; k += 2) {
          g.save(); g.translate(B.cx + k * u * 0.55 * tw, cy + away * u * 0.25 * th); g.rotate(-0.03 + k * u * 0.7);
          g.translate(tr[0][0], -th / 2); g.rotate(-k * op); g.translate(-tr[0][0], th / 2);
          g.beginPath(); g.moveTo(k * tw, tr[0][1]);
          for (i = 0; i < tr.length; i++) g.lineTo(tr[i][0], tr[i][1]);
          g.lineTo(k * tw, tr[8][1]); g.closePath(); g.clip();
          card(g);
          g.beginPath(); for (i = 0; i < tr.length; i++) g[i ? "lineTo" : "moveTo"](tr[i][0], tr[i][1]);   // the torn edge, paper white
          g.lineWidth = 3.2 * K.clamp((e - tr0) / 0.12, 0, 1) + 0.0001; g.lineJoin = "round"; g.strokeStyle = K.pat("light", 0.88, g); g.stroke();
          g.restore();
        }
      }
      g.restore();
    }
  });
})();
