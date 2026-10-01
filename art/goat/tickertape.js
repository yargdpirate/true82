/* Ticker Tape, an 82-0 goat pack (art/CONTRACT-FX.md; art/CONCEPTS.md "82-0"): a parade's paper cannon, printed in the
   house inks. Each burst is one popper: a starburst and a spray of dots at the muzzle, then four crepe streamers unroll
   from it (a ribbon that trails its own flight, twisting, so its printed width swings thin to wide, full ink at the
   head, lighter toward the tail) and thirty-odd bits of paper (strips, hole-punch discs, triangles) spin, flip and
   flutter down. One stock of three inks drawn from pairs per burst (pink + aqua + white, gold + orange + pink, violet
   + pink + aqua, etc.): each ink one path, one fill, one drum offset (K.reg), so overlaps mix and edges fringe. The
   paper dissolves by halftone coverage in steps, ink by ink, never alpha. Pure in e. Done by 1.8 s. */
(function () {
  "use strict";
  var TAU = Math.PI * 2, N = 12, NC = 18, NR = 2, PX = 0, PY = 0;
  var SETS = [["loss", "pop", "light"], ["hot", "dusk", "loss"], ["night", "loss", "pop"], ["hot", "loss", "light"], ["pop", "light", "key"], ["dusk", "hot", "light"]];
  function k01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function cvg(e, j) {                             // an ink's coverage: full, then stepping down to nothing (0 = gone)
    var p = (e - 1.3 - 0.14 * j) / 0.26;
    return p < 0 ? 0.88 : p < 0.34 ? 0.62 : p < 0.67 ? 0.4 : p < 1 ? 0.2 : 0;
  }
  function at(o, t) {                              // a flying bit of paper: launch velocity with drag, falling at its terminal speed
    var m = (1 - Math.exp(-o.k * t)) / o.k;
    PX = o.cx + o.vx * m; PY = o.cy + (o.vy - o.vt) * m + o.vt * t;
  }
  function band(g, A, i0, i1) {                    // one ribbon band as one polygon: down its left edge, back up its right
    var i;
    g.moveTo(A.LX[i0], A.LY[i0]);
    for (i = i0 + 1; i <= i1; i++) g.lineTo(A.LX[i], A.LY[i]);
    for (i = i1; i >= i0; i--) g.lineTo(A.RX[i], A.RY[i]);
    g.closePath();
  }
  window.T82ART.add("goat", "tickertape", {
    name: "Ticker Tape",
    by: "A paper cannon in house inks: crepe streamers twist out and bits of confetti spin and flutter down, dissolving in halftone steps.",
    slots: {
      burst: { dur: 1.8, draw: function (K, ev, e) {
        var g = K.g, r = K.rand(ev.seed ^ 0x7a9e), set = SETS[(r() * SETS.length) | 0], i, j, n;
        var cx = ev.x + ev.w * (0.14 + 0.72 * r()), cy = ev.y + ev.h * (0.22 + 0.5 * r()), up = -Math.PI / 2 + (r() - 0.5) * 0.7;
        var P = [], R = [];
        function fly(o, ang, s, k, vt) { o.cx = cx; o.cy = cy; o.vx = Math.cos(ang) * s; o.vy = Math.sin(ang) * s; o.k = k; o.vt = vt; return o; }
        for (i = 0; i < NR; i++) {                   // the streamers: a head in flight, a ribbon behind it
          var s = fly({}, up + (r() - 0.5) * 1.8, 380 + 250 * r(), 1.9, 96 + 50 * r());
          s.ink = i % 3; s.ph = r() * TAU; s.A = 8 + 7 * r(); s.Wm = 5.5 + 1.5 * r(); s.d = 0.03 * i;
          R.push(s);
        }
        for (i = 0; i < NC; i++) {                   // the confetti
          var c = fly({}, up + (r() - 0.5) * 2.7, 160 + 380 * Math.pow(r(), 0.6), 2.2, 70 + 90 * r());
          c.ink = (r() * 3) | 0; c.d = 0.14 * r(); c.ty = r(); c.sz = 1.15 + 0.8 * r(); c.w = 9 + 9 * r(); c.f = r() * TAU; c.th = r() * TAU; c.sp = (r() - 0.5) * 9; c.sw = 6 + 12 * r(); c.sf = 2 + 2 * r(); c.sp0 = r() * TAU;
          P.push(c);
        }
        if (e < 0.24) {                              // a ring of dots printed outward
          var rp = e / 0.24, rl = [];
          for (i = 0; i < 20; i++) rl.push(cx + Math.cos(i * TAU / 20) * (4 + 44 * K.ease.out(rp)), cy + Math.sin(i * TAU / 20) * (4 + 44 * K.ease.out(rp)), 3.4 * (1 - rp) + 0.8);
          K.dots(g, set[2], 0.88, rl);
        }
        K.spark({ x: cx, y: cy, n: 8, ink: function (q) { return set[(q() * 3) | 0]; }, sp: [120, 320], r: [1.3, 2.8], life: [0.25, 0.25], grav: 160, dir: up, cone: 2.8, seed: ev.seed, e: e });
        g.save(); g.globalCompositeOperation = K.blend;
        if (e < 0.22) {                              // the pop: a ten-point starburst at the muzzle
          var sr = 46 * (1 - e / 0.22) + 6;
          g.beginPath();
          for (i = 0; i < 20; i++) { var sa = up + i / 20 * TAU, sd = i % 2 ? sr * 0.46 : sr; g.lineTo(cx + Math.cos(sa) * sd, cy + Math.sin(sa) * sd); }
          g.closePath(); g.fillStyle = K.pat(set[2], 0.86, g); g.fill();
        }
        for (n = 0; n < NR; n++) {                   // every ribbon's two edges, once a frame
          var s2 = R[n], tt = e - s2.d, bx = [], by = [];
          s2.on = tt > 0 && cvg(e, s2.ink) > 0;
          if (!s2.on) continue;
          s2.LX = []; s2.LY = []; s2.RX = []; s2.RY = [];
          for (i = 0; i <= N; i++) { at(s2, Math.max(0, tt - i * 0.085)); bx.push(PX); by.push(PY); }
          for (i = 0; i <= N; i++) {
            var i0 = Math.max(i - 1, 0), i1 = Math.min(i + 1, N), dx = bx[i0] - bx[i1], dy = by[i0] - by[i1], ln = Math.sqrt(dx * dx + dy * dy);
            if (ln < 0.3) { dx = 0; dy = -1; ln = 1; }
            var nx = -dy / ln, ny = dx / ln, wv = s2.A * Math.sin(i * 0.95 - tt * 6.5 + s2.ph) * Math.min(1, i / 4) * k01(tt * 3), x = bx[i] + nx * wv, y = by[i] + ny * wv;
            var w = s2.Wm * (0.12 + 0.88 * Math.abs(Math.cos(i * 0.8 + tt * 4.5 + s2.ph))) * (1 - 0.5 * i / N) * k01(tt * 7);
            s2.LX.push(x + nx * w); s2.LY.push(y + ny * w); s2.RX.push(x - nx * w); s2.RY.push(y - ny * w);
          }
        }
        for (j = 0; j < 3; j++) {
          var cv = cvg(e, j), reg = K.reg(set[j]);
          if (cv <= 0) continue;
          var disc = [];
          g.save(); g.translate(reg[0], reg[1]);
          g.beginPath();
          for (i = 0; i < NC; i++) {                 // bits of paper: strips, hole-punch discs, triangles, flipping as they fall
            var p = P[i], t = e - 0.02 - p.d;
            if (p.ink !== j || t <= 0) continue;
            at(p, t);
            var fx = 1 - Math.exp(-3 * t), x2 = PX + Math.sin(TAU * p.sf * t + p.sp0) * p.sw * fx, y2 = PY;
            var fl = Math.max(0.22, Math.abs(Math.cos(p.w * t + p.f))), th = p.th + p.sp * t * (1 - 0.5 * fx), co = Math.cos(th), si = Math.sin(th), sz = p.sz;
            if (p.ty < 0.26) { var hw = 6.5 * sz * fl, hh = 2.8 * sz; g.moveTo(x2 - hw * co + hh * si, y2 - hw * si - hh * co); g.lineTo(x2 + hw * co + hh * si, y2 + hw * si - hh * co); g.lineTo(x2 + hw * co - hh * si, y2 + hw * si + hh * co); g.lineTo(x2 - hw * co - hh * si, y2 - hw * si + hh * co); g.closePath(); }
            else if (p.ty < 0.72) disc.push(x2 + reg[0], y2 + reg[1], 3.4 * sz * (0.55 + 0.45 * fl));
            else { var rt = 6 * sz; g.moveTo(x2 + co * rt * fl, y2 + si * rt); g.lineTo(x2 + Math.cos(th + 2.1) * rt * fl, y2 + Math.sin(th + 2.1) * rt); g.lineTo(x2 + Math.cos(th + 4.2) * rt * fl, y2 + Math.sin(th + 4.2) * rt); g.closePath(); }
          }
          for (n = 0; n < NR; n++) if (R[n].on && R[n].ink === j) band(g, R[n], 0, N / 2);   // the streamers' heads
          g.fillStyle = K.pat(set[j], cv, g); g.fill();
          g.beginPath();
          for (n = 0; n < NR; n++) if (R[n].on && R[n].ink === j) band(g, R[n], N / 2, N);   // their tails, lighter
          g.fillStyle = K.pat(set[j], Math.max(0.16, cv * 0.62), g); g.fill();
          g.restore();
          K.dots(g, set[j], cv, disc);
        }
        g.restore();
      } }
    }
  });
})();
