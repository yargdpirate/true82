/* art/loss/brush.js: One Stroke. A sumi brush (magenta tuft, pale handle) paints a single calligraphic L: a pressed
   head, a drag down the stem, a square turn, the foot, a flick that sheds splatter. The ink starves along the pull
   (dry-brush hairs carved through it) and bleeds into the paper behind the brush (a magenta halftone halo); then the
   brush lifts away and the ink dries in coverage steps. One plate (the stroke at four coverages, its bleed at two),
   revealed by a live clip along the path. Beats (x k for a short moment): stem .02 to .12, foot .135 to .235, brush
   gone by .3; the exit is the last .12 to .34 s. */
(function () {
  "use strict";
  var PI = Math.PI, TAU = PI * 2, HP = 200, PW = 170, PH = 216, OX = 70, OY = 108, COV = [1, 0.72, 0.5, 0.3];
  var STEM = [[-0.225, -0.41, 0.19], [-0.222, -0.33, 0.17], [-0.218, -0.1, 0.155], [-0.212, 0.12, 0.155], [-0.21, 0.26, 0.165], [-0.21, 0.34, 0.18]];
  var FOOT = [[-0.21, 0.34, 0.18], [-0.1, 0.365, 0.175], [0.06, 0.365, 0.155], [0.22, 0.35, 0.14], [0.34, 0.33, 0.105], [0.4, 0.29, 0.06], [0.44, 0.21, 0.02]];
  function len(a, b) { return Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1])); }
  function dense(K, C, seed) {                          // samples: x, y, width, normal, distance
    var r = K.rand(seed), A = [], i, j, n, a, b, t, d = 0, nz = [];
    for (i = 0; i < 220; i++) nz.push(r() - 0.5);
    for (i = 0; i + 1 < C.length; i++) {
      a = C[i]; b = C[i + 1]; n = Math.max(1, Math.round(len(a, b) / 0.015));
      for (j = (i ? 1 : 0); j <= n; j++) { t = j / n; A.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t * t * (3 - 2 * t), 0, 0, 0]); }
    }
    for (i = 0; i < A.length; i++) {
      a = A[Math.max(0, i - 1)]; b = A[Math.min(A.length - 1, i + 1)]; t = len(a, b) || 1;
      A[i][3] = -(b[1] - a[1]) / t; A[i][4] = (b[0] - a[0]) / t;
      if (i) d += len(A[i], A[i - 1]);
      A[i][5] = d; A[i][2] *= 1 + 0.07 * (nz[i % 220] + nz[(i + 1) % 220]);
    }
    return A;
  }
  function strip(g, A, i1, sc) {                        // ribbon of samples 0..i1, clockwise
    var P = [], Q = [], i, a, area = 0, k;
    for (i = 0; i <= i1; i++) { a = A[i]; P.push([a[0] + a[3] * a[2] * sc / 2, a[1] + a[4] * a[2] * sc / 2]); Q.push([a[0] - a[3] * a[2] * sc / 2, a[1] - a[4] * a[2] * sc / 2]); }
    P = P.concat(Q.reverse());
    for (i = 0; i < P.length; i++) { k = P[(i + 1) % P.length]; area += P[i][0] * k[1] - k[0] * P[i][1]; }
    if (area < 0) P.reverse();
    for (i = 0; i < P.length; i++) g[i ? "lineTo" : "moveTo"](P[i][0], P[i][1]);
    g.closePath();
  }
  function cap(g, a, sc) { g.moveTo(a[0] + a[2] * sc / 2, a[1]); g.arc(a[0], a[1], a[2] * sc / 2, 0, TAU); }
  function upto(A, S) { var i = 0; while (i + 1 < A.length && A[i + 1][5] <= S) i++; return i; }
  function stroke(g, st, sc, S) {                       // the stroke up to distance S
    var A = st.A, B = st.B, n = A.length - 1, j, a = A[n];
    cap(g, A[0], sc);
    if (S < a[5]) { strip(g, A, Math.max(1, upto(A, S)), sc); cap(g, A[upto(A, S)], sc); return; }
    strip(g, A, n, sc); g.rect(a[0] - a[2] * sc / 2, a[1] - a[2] * sc / 2, a[2] * sc, a[2] * sc);       
    j = upto(B, S - a[5]); strip(g, B, Math.max(1, j), sc); cap(g, B[j], sc);
  }
  function ink(K, g, st) {                         // prep: tone, hairs carved, starving
    var r = K.rand(6107), A = st.A, B = st.B, i, k, p, gr, C, i0, o;
    g.translate(OX, OY); g.scale(HP, HP);
    g.fillStyle = K.tone(0.97); g.beginPath(); stroke(g, st, 1, 1e9); g.fill();
    g.globalCompositeOperation = "destination-out";
    for (k = 0; k < 20; k++) {                       
      C = k > 6 ? B : A; i0 = Math.floor((k > 6 ? 0.25 + 0.45 * r() : 0.45 + 0.4 * r()) * C.length); o = (r() - 0.5) * 0.84;
      g.strokeStyle = K.tone(0.95); g.lineWidth = (1.3 + 1.7 * r()) / HP; g.beginPath();
      for (i = i0; i < C.length; i++) { p = C[i]; g[i === i0 ? "moveTo" : "lineTo"](p[0] + p[3] * p[2] * o, p[1] + p[4] * p[2] * o); }
      g.stroke();
    }
    gr = g.createLinearGradient(0, -0.5, 0, 0.33); gr.addColorStop(0, K.tone(0)); gr.addColorStop(1, K.tone(0.14));
    g.save(); g.beginPath(); g.rect(-0.5, -0.6, 0.3, 1); g.clip(); g.fillStyle = gr; g.fillRect(-0.5, -0.6, 0.5, 1); g.restore();
    gr = g.createLinearGradient(-0.2, 0, 0.44, 0); gr.addColorStop(0, K.tone(0.14)); gr.addColorStop(1, K.tone(0.34));
    g.save(); g.beginPath(); g.rect(-0.21, 0.1, 0.7, 0.6); g.clip(); g.fillStyle = gr; g.fillRect(-0.21, 0.1, 0.7, 0.6); g.restore();
  }
  function halo(K, g, st, mul) {                        // prep: the bleed
    var i, w, A = st.A, B = st.B;
    g.translate(OX, OY); g.scale(HP, HP); g.lineJoin = "round"; g.lineCap = "round";
    for (w = 2.2; w >= 1.25; w -= 0.3) {
      g.strokeStyle = K.tone(0.17 * mul); g.lineWidth = 0.14 * w; g.beginPath();
      for (i = 0; i < A.length; i += 2) g[i ? "lineTo" : "moveTo"](A[i][0], A[i][1]);
      for (i = 0; i < B.length; i += 2) g.lineTo(B[i][0], B[i][1]);
      g.stroke();
    }
  }
  function brush(K, g, x, y, H) {                       // tuft and handle at the tip
    function quad(d0, d1, w0, w1, ink, cov) {
      var dx = 0.42, dy = -0.9, nx = 0.9, ny = 0.42;
      g.beginPath(); g.moveTo(x + (dx * d0 + nx * w0) * H, y + (dy * d0 + ny * w0) * H); g.lineTo(x + (dx * d1 + nx * w1) * H, y + (dy * d1 + ny * w1) * H);
      g.lineTo(x + (dx * d1 - nx * w1) * H, y + (dy * d1 - ny * w1) * H); g.lineTo(x + (dx * d0 - nx * w0) * H, y + (dy * d0 - ny * w0) * H);
      g.closePath(); g.fillStyle = K.pat(ink, cov, g); g.fill();
    }
    quad(0, 0.08, 0, 0.042, "key", 0.88); quad(0.08, 0.15, 0.042, 0.045, "key", 0.88); quad(0.15, 0.8, 0.03, 0.03, "light", 0.86);
  }
  T82ART.add("loss", "brush", {
    name: "One Stroke",
    by: "A sumi brush paints one calligraphic L: a pressed head, a dry-brush stem and foot, a splattering flick; the ink bleeds into the paper and dries away.",
    prep: function (K) {
      var st = K.st, jobs = [function () { st.A = dense(K, STEM, 91); st.B = dense(K, FOOT, 92); st.P = K.plate(PW, PH, 6107); },
        function () { K.screen(K.plate(8, 8, 1), "loss", function () {}); }, function () { K.screen(K.plate(8, 8, 2), "key", function () {}); },
        function () {
        var c = document.createElement("canvas"), x;        
        c.width = st.P.W; c.height = st.P.H; x = c.getContext("2d"); x.setTransform(st.P.k, 0, 0, st.P.k, 0, 0); ink(K, x, st); st.T = c;
        st.L = K.levels(st.P, "loss", function (g, cov) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = cov; g.drawImage(st.T, 0, 0); }, COV);
        st.Hh = K.levels(st.P, "key", function (g, cov) { halo(K, g, st, cov); }, [1, 0.55]);
        jobs.push.apply(jobs, st.L.jobs.concat(st.Hh.jobs));
      }];
      return jobs;
    },
    hit: function (K, E) {
      var B = K.box, H = B.y1 - B.y0, k = K.clamp(E.dur / 0.9, 0.36, 1), cy = (B.y0 + B.y1) / 2;
      K.flash(E.first ? 0.5 : 0.36); K.shake(Math.max(E.dur, 0.4), E.first ? 9 : 7);
      K.ring({ x: B.cx - 0.2 * H, y: cy - 0.4 * H, delay: 0.02 * k, dur: 0.3, r0: 6, r1: 0.35 * H, w0: 6, ink: "loss", cov: 0.86 });
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, f = K.fade(E, e), H = B.y1 - B.y0, c = K.clamp, i, p, a;
      if (f <= 0 || !st.L || !st.Hh) return;
      var A = st.A, F = st.B, Ls = A[A.length - 1][5], Lt = Ls + F[F.length - 1][5], k = c(E.dur / 0.9, 0.36, 1);
      var t0 = 0.02 * k, t1 = 0.12 * k, t2 = 0.135 * k, t3 = 0.235 * k, X = Math.min(0.34, Math.max(0.12, 0.3 * E.dur)), tE = Math.max(E.dur - X, t3 + 0.1), tS = t3 + 0.1 + 0.4 * (tE - t3 - 0.1);
      function dist(e) { return e <= t0 ? 0 : e < t1 ? Ls * K.ease.inOut((e - t0) / (t1 - t0)) : e < t2 ? Ls : Ls + (Lt - Ls) * Math.pow(c((e - t2) / (t3 - t2), 0, 1), 1.4); }
      var S = dist(e), drain = K.smooth(tS, tE, e), li = Math.min(3, Math.floor(drain * 3.999)), hi = drain < 0.5 ? 0 : 1;
      var cx = B.cx - 0.065 * H, cy = (B.y0 + B.y1) / 2, lift = c((e - t3) / (0.07 * k), 0, 1);
      g.save(); g.beginPath(); g.rect(0, K.top, K.w, K.h - K.top); g.clip();
      g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      g.save(); g.translate(cx, cy); g.scale(H, H);
      if (e > t0 && drain < 0.88) {                      // the bleed trails the brush
        g.save(); g.beginPath(); stroke(g, st, 2.4, dist(e - 0.07 * k)); g.clip();
        g.drawImage(st.Hh.at(hi), -OX / HP, -OY / HP, PW / HP, PH / HP); g.restore();
      }
      if (e > t0) {
        g.save(); g.beginPath(); stroke(g, st, 1.5, S); g.clip();
        g.drawImage(st.L.at(li), -OX / HP, -OY / HP, PW / HP, PH / HP); g.restore();
      }
      g.restore();
      if (lift < 1) {                                  
        if (e < t0) a = [A[0][0] + 0.25 * (t0 - e) / t0, A[0][1] - 0.5 * (t0 - e) / t0];
        else if (S < Ls) { a = A[upto(A, S)]; a = [a[0], a[1] - 0.02]; } else a = F[upto(F, S - Ls)];
        brush(K, g, cx + a[0] * H + 0.4 * H * lift * lift, cy + a[1] * H - 1.2 * H * lift * lift, H);
      }
      var r = K.rand(E.seed ^ 0x3d1);
      g.beginPath();
      for (i = 0; i < 16; i++) {                         // the splatter flies up and to the right, lands, and stays until the ink dries
        var an = -PI * (0.1 + 0.4 * r()), v = H * (0.6 + 1.7 * r()), life = 0.2 + 0.25 * r(), ag = e - t3 + 0.03 * k - 0.04 * r() * k, rd = H * (0.012 + 0.03 * r() * r());
        if (ag <= 0) continue;
        rd *= 1 - 0.9 * drain; if (rd < 1) continue; ag = Math.min(ag, life);
        a = cx + 0.44 * H + Math.cos(an) * v * ag * 0.55; p = cy + 0.21 * H + Math.sin(an) * v * ag * 0.6 + 2.6 * H * ag * ag;
        g.moveTo(a + rd, p); g.arc(a, p, rd, 0, TAU);
      }
      g.fillStyle = K.pat("loss", 0.84, g); g.fill();
      g.restore();
    }
  });
})();
