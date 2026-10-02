/* art/loss/spray.js: Spray Tag. A spray can tags the L in one fast stroke (down the stem, across the foot, a flick off the
   toe): a pink core, overspray as a halftone ramp and flecks, an aqua block shadow off register. Paint runs in drips; then
   the wet L slides off in ragged columns. Plates (screened in small bands): pink stem and foot, the aqua shadow of each.
   Can, nozzle mist, drips and columns are live. The stroke is absolute (x q for a short moment); the exit is the last .06 to .2 s. */
(function () {
  "use strict";
  var PW = 200, PH = 272, OX = 100, OY = 125, TAU = 6.2832;
  var SP = [[38, 25], [84, 25], [84, 225], [38, 225]], FP = [[84, 181], [162, 181], [162, 225], [84, 225]];
  var SE = [[38, 25, 84, 25], [84, 25, 84, 181], [38, 25, 38, 225], [38, 225, 84, 225]], FE = [[84, 181, 162, 181], [162, 181, 162, 225], [84, 225, 162, 225]];
  var SB = [[8, 0, 112, 70], [8, 70, 112, 70], [8, 140, 112, 70], [8, 210, 112, 70]], FB = [[60, 120, 140, 40], [60, 160, 140, 40], [60, 200, 140, 40], [60, 240, 140, 40]];
  function poly(g, p, dx, dy) { g.beginPath(); for (var i = 0; i < p.length; i++) g[i ? "lineTo" : "moveTo"](p[i][0] + dx, p[i][1] + dy); g.closePath(); }
  var CP = [[41, 28], [81, 28], [81, 184], [159, 184], [159, 222], [41, 222]];   // the core, a little inside the L: the mist is the edge
  function core(g, x0, x1) { g.save(); g.beginPath(); g.rect(x0, 0, x1 - x0, PH); g.clip(); poly(g, CP, 0, 0); g.fill(); g.restore(); }
  function bez(t) { var u = 1 - t; return [u * u * 146 + 2 * u * t * 192 + t * t * 186, u * u * 203 + 2 * u * t * 204 + t * t * 140]; }
  function flick(g) {
    g.beginPath();
    for (var t = 0; t <= 1; t += 0.025) { var p = bez(t), r = 10.5 * Math.pow(1 - t, 0.75) + 1.4; g.moveTo(p[0] + r, p[1]); g.arc(p[0], p[1], r, 0, TAU); }
    g.fill();
  }
  function mist(K, g, spr, E, dx, dy, a0, R, seed) {
    var r = K.rand(seed), i, j, n, t, x, y, rr;
    for (i = 0; i < E.length; i++) {
      n = Math.max(1, Math.round(Math.sqrt(Math.pow(E[i][2] - E[i][0], 2) + Math.pow(E[i][3] - E[i][1], 2)) / 6.4));
      for (j = 0; j <= n; j++) {
        t = j / n; x = E[i][0] + (E[i][2] - E[i][0]) * t + dx + (r() - 0.5) * 5; y = E[i][1] + (E[i][3] - E[i][1]) * t + dy + (r() - 0.5) * 5;
        rr = R * (0.8 + r() * 0.4); g.globalAlpha = a0 * (0.6 + r() * 0.8); g.drawImage(spr, x - rr, y - rr, 2 * rr, 2 * rr);
      }
    }
    g.globalAlpha = 1;
  }
  function dist(x, y, a, b, c, d) { var p = Math.max(a - x, 0, x - c), q = Math.max(b - y, 0, y - d); return Math.sqrt(p * p + q * q); }
  function flecks(K, g, n, dx, dy, seed) {
    var r = K.rand(seed), k = 0, tries = 0, x, y, d;
    g.fillStyle = K.tone(1);
    while (k < n && tries++ < 5000) {
      x = 8 + r() * (PW - 16); y = 8 + r() * (PH - 40);
      d = Math.min(dist(x, y, 38 + dx, 25 + dy, 84 + dx, 225 + dy), dist(x, y, 84 + dx, 181 + dy, 162 + dx, 225 + dy));
      if (d < 6 || r() > Math.exp(-(d - 6) / 11)) continue;
      g.beginPath(); g.arc(x, y, 0.7 + r() * r() * 1.8, 0, TAU); g.fill(); k++;
    }
  }
  function drips(K, E, g, tt, T, t4) {
    var r = K.rand(E.seed ^ 0x77), i, x, len, ts, du, p, wd, y, a = [48, 70, 94, 114, 134, 155], L = [40, 22, 30, 15, 26, 13];
    g.beginPath();
    for (i = 0; i < 6; i++) {
      x = a[i] + (r() - 0.5) * 8; len = L[i] * (0.8 + r() * 0.4); ts = t4 + 0.02 + r() * 0.08; wd = 3.2 + r() * 2;
      du = K.clamp((T - ts) * 0.85, 0.12, 1.4); p = K.clamp((tt - ts) / du, 0, 1); p = 1 - (1 - p) * (1 - p);
      if (p <= 0) continue;
      y = 222 + len * p;
      g.moveTo(x - wd, 222); g.lineTo(x - wd * 0.45, y - wd); g.lineTo(x + wd * 0.45, y - wd); g.lineTo(x + wd, 222); g.closePath();
      g.moveTo(x + wd * 0.8, y - wd * 0.3); g.arc(x, y - wd * 0.3, wd * 0.8, 0, TAU);
    }
    g.fillStyle = K.pat("loss", 0.88, g); g.fill();
  }
  T82ART.add("loss", "spray", {
    name: "Spray Tag",
    by: "A spray can tags the L in one fast stroke (overspray, an aqua shadow, a flick off the toe); the paint drips, then slides off in columns.",
    prep: function (K) {
      var st = K.st, spr;
      function scr(P, ink, o, fn) { return K.screen(P, ink, function (g) { g.translate(-o[0], -o[1]); fn(g); }); }
      function stem(g) { g.fillStyle = K.tone(0.94); core(g, 0, 84); mist(K, g, spr, SE, 0, 0, 0.26, 21, 11); flecks(K, g, 90, 0, 0, 12); }
      function foot(g) {
        g.fillStyle = K.tone(0.94); core(g, 84, PW); flick(g); mist(K, g, spr, FE, 0, 0, 0.26, 21, 13);
        for (var t = 0.1; t < 1; t += 0.15) { var p = bez(t); mist(K, g, spr, [[p[0], p[1], p[0], p[1]]], 0, 0, 0.2, 13, 14 + t * 9); }
        flecks(K, g, 70, 0, 0, 15);
      }
      function shadow(g, ft) {
        g.fillStyle = K.tone(0.6); poly(g, ft ? FP : SP, 9, 8); g.fill();
        mist(K, g, spr, ft ? FE : SE, 9, 8, 0.13, 17, 61 + ft); flecks(K, g, 40, 9, 8, 62 + ft);
        g.globalCompositeOperation = "destination-out"; g.lineWidth = 1.4; g.strokeStyle = K.tone(1); g.fillStyle = K.tone(1);
        poly(g, SP, 0, 0); g.fill(); g.stroke(); poly(g, FP, 0, 0); g.fill(); g.stroke();
      }
      var jobs = [
        function () {
          st.P = K.plate(112, 70, 6113);
          var c = spr = document.createElement("canvas"), x, gr; c.width = c.height = Math.round(64 * K.d); x = c.getContext("2d"); x.scale(K.d, K.d);
          gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, K.tone(1)); gr.addColorStop(0.5, K.tone(0.5)); gr.addColorStop(1, K.tone(0));
          x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
        },
        function () { st.Q = K.plate(140, 40, 6114); }
      ];
      st.sp = []; st.sa = []; st.fp = []; st.fa = [];
      SB.forEach(function (b, i) {
        jobs.push(function () { st.sp[i] = scr(st.P, "loss", b, stem); }, function () { st.sa[i] = scr(st.P, "pop", b, function (g) { shadow(g, 0); }); });
      });
      FB.forEach(function (b, i) {
        jobs.push(function () { st.fp[i] = scr(st.Q, "loss", b, foot); }, function () { st.fa[i] = scr(st.Q, "pop", b, function (g) { shadow(g, 1); }); });
      });
      jobs.push(function () { st.cp = document.createElement("canvas"); st.cp.width = Math.round(PW * st.P.k); st.cp.height = Math.round(PH * st.P.k); });
      return jobs;
    },
    hit: function (K, E) {
      var B = K.box;
      K.spark({ x: B.cx - B.size * 0.2, y: B.y0, n: 14, ink: function (q) { return q() < 0.3 ? "pop" : "loss"; }, sp: [120, 380], r: [1, 2.6], life: [0.25, 0.3], grav: 700, seed: E.seed, streak: true });
      K.flash(E.first ? 0.55 : 0.4); K.shake(Math.max(E.dur, 0.42), E.first ? 8 : 6);
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, i;
      if (!st.cp) return;
      var H = B.y1 - B.y0, s = 0.9 * H / 200, cx = B.cx, cy = (B.y0 + B.y1) / 2 - 0.04 * H, u = K.clamp(s, 0.7, 1.15);
      var w = Math.min(0.2, 0.3 * E.dur), T = E.dur - w, f = e > T ? K.clamp((E.dur - e) / (w * 0.5), 0, 1) : 1;
      if (f <= 0) return;
      var q = K.clamp((E.dur - 0.1) / 0.65, 0.3, 1), t1 = 0.004, d1 = 0.085 * q, t2 = t1 + d1, d2 = 0.07 * q, t3 = t2 + d2, d3 = 0.045 * q, t4 = t3 + d3;
      var p1 = K.clamp((e - t1) / d1, 0, 1), p2 = K.clamp((e - t2) / d2, 0, 1), p3 = K.clamp((e - t3) / d3, 0, 1);
      var STEM = [], FOOT = [];
      SB.forEach(function (b, i) { STEM.push([st.sp[i], b], [st.sa[i], b]); });
      FB.forEach(function (b, i) { FOOT.push([st.fp[i], b], [st.fa[i], b]); });
      function X(x) { return cx + (x - OX) * s; }
      function Y(y) { return cy + (y - OY) * s; }
      function show(list, x1, y1) {
        g.save(); g.beginPath(); g.rect(X(0), Y(0), x1 * s, y1 * s); g.clip();
        for (var j = 0; j < list.length; j++) g.drawImage(list[j][0], X(list[j][1][0]), Y(list[j][1][1]), list[j][1][2] * s, list[j][1][3] * s);
        g.restore();
      }
      var ys = p1 >= 1 ? PH : 35 + 178 * p1, xs = p3 >= 1 ? PW : p3 > 0 ? 162 + 30 * p3 : 84 + 84 * p2;
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      var u2 = e > T ? K.clamp((e - T) / w, 0, 1) : 0;
      if (u2 <= 0) {
        show(STEM, PW, ys);
        if (p2 > 0) show(FOOT, xs, PH);
        g.save(); g.translate(cx, cy); g.scale(s, s); g.translate(-OX, -OY); drips(K, E, g, e, T, t4); g.restore();
      } else {
        var c = st.cp, cg = c.getContext("2d"), kk = st.P.k, r = K.rand(E.seed ^ 0x3c), NC = 22, cw = Math.round(PW * kk / NC), dl, dy, v, x0, x1;
        if (!st.baked) {
          st.baked = 1; cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, c.width, c.height); cg.globalCompositeOperation = K.blend;
          STEM.concat(FOOT).forEach(function (a) { cg.drawImage(a[0], Math.round(a[1][0] * kk), Math.round(a[1][1] * kk)); });
          cg.setTransform(kk, 0, 0, kk, 0, 0); drips(K, E, cg, T, T, t4);
        }
        g.save(); g.beginPath(); g.rect(B.x0, B.spanTop - 14, B.x1 - B.x0, B.span + 14); g.clip();
        for (i = 0; i < NC; i++) {
          dl = r() * 0.55; v = 0.7 + r() * 0.8; dy = H * 1.9 * v * Math.pow(K.clamp((u2 - dl) / (1 - dl), 0, 1), 2);
          x0 = i * cw; x1 = Math.min(c.width, x0 + cw);
          g.drawImage(c, x0, 0, x1 - x0, c.height, X(x0 / kk), Y(0) + dy, (x1 - x0) / kk * s, PH * s);
        }
        g.restore();
      }
      if (e < t4 + 0.14) {
        var tp = e < t2 ? [61, 25 + 178 * p1] : e < t3 ? [61 + 101 * p2, 203] : bez(p3), px = X(tp[0]), py = Y(tp[1]), o = K.clamp((e - t4) / (0.05 + 0.1 * q), 0, 1);
        if (o <= 0) {
          for (i = 2; i >= 0; i--) {
            g.beginPath(); g.arc(px, py, (7 + 5.5 * i) * u, 0, TAU); if (i) g.arc(px, py, (1.5 + 5.5 * i) * u, 0, TAU);
            g.fillStyle = K.pat("loss", 0.6 - 0.2 * i, g); g.fill("evenodd");
          }
        }
        g.save(); g.translate(px + (22 + 190 * o * o) * u, py + (12 - 70 * o * o) * u); g.rotate(0.5 - 0.5 * o); g.scale(u, u);
        g.fillStyle = K.pat("pop", 0.88, g); g.fillRect(0, -5, 11, 10); g.fillRect(11, -8, 14, 16);
        g.fillStyle = K.pat("pop", 0.5, g); g.beginPath(); g.moveTo(25, -8); g.lineTo(35, -14); g.lineTo(35, 14); g.lineTo(25, 8); g.closePath(); g.fillRect(35, -14, 60, 28); g.fill();
        g.fillStyle = K.pat("loss", 0.75, g); g.fillRect(50, -14, 26, 28);
        g.restore();
      }
      g.restore();
    }
  });
})();
