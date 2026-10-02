/* Heating Up, a Heat Check pack (art/CONTRACT-FX.md): the announcer's call in block-shadow riso type (a plate an ink, off
   register) under a hoop. A ball falls in at the heat label: cold clanks off the rim, warm swishes, hot trails flames, on
   fire singes the net, the nova's net burns away; the save bursts it into flaming balls, the miss clanks. */
(function () {
  "use strict";
  var M = Math, TAU = M.PI * 2;
  var W = {
    cold: { l: "COLD", px: 54, f: "pop", s: [["night", 5]] },
    warm: { l: "HEATING UP", px: 54, f: "dusk", s: [["key", 5]] },
    hot: { l: "HE'S HOT", px: 82, f: "hot", s: [["dusk", 6]] },
    fire: { l: "ON FIRE", px: 124, f: "hot", s: [["dusk", 6], ["loss", 12]] },
    nova1: { l: "NET'S", px: 118, f: "light", s: [["hot", 7], ["loss", 14]] },
    nova2: { l: "ON FIRE", px: 118, f: "light", s: [["hot", 7], ["loss", 14]] },
    save1: { l: "IT'S", px: 112, f: "light", s: [["hot", 7], ["dusk", 14]] },
    save2: { l: "GOOD", px: 112, f: "light", s: [["hot", 7], ["dusk", 14]] },
    miss: { l: "NO GOOD", px: 58, f: "loss", s: [["night", 5]] }
  };
  var BALL = "\uD83C\uDFC0", WARMB = ["dusk", "hot", "key"], COLDB = ["pop", "light", "night"], SAT = { sat: 1.3 };
  function k01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function hsh(a, b) { var v = M.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - M.floor(v); }

  function flame(g, x, y, ang, w, h, ln) {
    var ax = M.cos(ang), ay = M.sin(ang), q = w / 2, i, u, v, F = [0, -1, 0.3, -0.95, 0.55, -0.65, 0.8, -0.28, 1, 0, 0.8, 0.28, 0.55, 0.65, 0.3, 0.95, 0, 1, -0.3, 0.6, -0.42, 0, -0.3, -0.6];
    for (i = 0; i < F.length; i += 2) {
      u = F[i] * (F[i] < 0 ? q : h); v = F[i + 1] * q + (F[i] > 0 ? ln * F[i] * F[i] : 0);
      if (i) g.lineTo(x + ax * u - ay * v, y + ay * u + ax * v); else g.moveTo(x + ax * u - ay * v, y + ay * u + ax * v);
    }
    g.closePath();
  }
  function flames(K, L) {
    var g = K.g, i, k, Y = [["loss", 0.8, 1.08, 1.1], ["dusk", 0.86, 1, 1], ["hot", 0.88, 0.62, 0.68], ["light", 0.8, 0.3, 0.36]];
    if (!L.length) return;
    g.save();
    for (k = 0; k < 4; k++) {
      g.beginPath();
      for (i = 0; i < L.length; i++) flame(g, L[i][0], L[i][1], L[i][2], L[i][3] * Y[k][2], L[i][4] * Y[k][3], L[i][5] * Y[k][2]);
      g.fillStyle = K.pat(Y[k][0], Y[k][1], g); g.fill();
    }
    g.restore();
  }
  function blit(K, E, x, y, s, rot) {
    var g = K.g, m = g.getTransform();
    g.save(); g.imageSmoothingEnabled = false;
    if (!rot && s === 1) { g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(E.print, M.round(m.a * (x - E.w / 2)), M.round(m.d * (y - E.h / 2))); }
    else { g.translate(x, y); if (rot) g.rotate(rot); g.scale(s, s); g.drawImage(E.print, -E.w / 2, -E.h / 2, E.w, E.h); }
    g.restore();
  }
  function call(K, ev, keys, y, e, t0, tx) {
    var p = k01((e - t0) / 0.11), fall = e > tx ? (e - tx) * (e - tx) : 0, f = 1, n = keys.length, i, E, s;
    if (e < t0) return;
    for (i = 0; i < n; i++) { E = K.st[keys[i]]; if (!E || !E.print) return; f = M.min(f, (ev.area.w - 12) / E.w); }
    s = f * (1 + 0.4 * (1 - K.ease.out(p)));
    for (i = 0; i < n; i++) blit(K, K.st[keys[i]], ev.cx + 240 * fall, y + (i - (n - 1) / 2) * 0.84 * W[keys[i]].px * s + 1500 * fall, s, fall * 2.2);
  }
  function bpos(P, t) {
    var u = t - P.ta, rx = P.hx - P.rx * 0.85;
    if (P.brick && u > 0) return [rx + P.brick[0] * u, P.hy - P.brick[1] * u + 0.5 * P.brick[2] * u * u];
    return [(P.brick ? rx : P.hx) + P.vx * u, P.hy - 0.5 * P.g * (P.ta * P.ta - t * t)];
  }
  function dots(K, ink, D) {
    var g = K.g, i;
    if (!D.length) return;
    g.save(); g.beginPath();
    for (i = 0; i < D.length; i += 3) { g.moveTo(D[i] + D[i + 2], D[i + 1]); g.arc(D[i], D[i + 1], D[i + 2], 0, TAU); }
    g.fillStyle = K.pat(ink, 0.88, g); g.fill(); g.restore();
  }
  function trail(K, L, P, pos, e, n, dt, br, tf) {
    var i, t, q, r, A = [], B = [];
    for (i = 1; i <= n; i++) {
      t = e - i * dt;
      if (t < 0) continue;
      q = pos(t);
      if (q[1] > 900 || q[0] < -60) continue;
      (i < n / 3 ? A : B).push(q[0], q[1], br * 0.7 * (1 - i / (n + 2)));
      if (tf && i % 2) { r = pos(t + 0.02); L.push([q[0], q[1], M.atan2(q[1] - r[1], q[0] - r[0]), br * (1.7 - i / n), br * (3.2 - i * 3 / n), M.sin(M.floor(e * 12) * 2 + i) * br * 0.5]); }
    }
    dots(K, P.ti[0], A); dots(K, P.ti[1], B);
  }
  function hoop(K, P, e, L, rim) {
    var g = K.g, R = 5, N = 7, rx = P.rx, dy = P.nh / (R - 1), nd = [], i, k, x, y, bt, sw, ln, u = e - P.ta, a, b, c, d, pd = [], pe = [];
    for (k = 0; k < R; k++) for (i = 0; i < N; i++) {
      sw = u > 0 ? M.sin(u * 17 + k) * M.exp(-u * 4) * 6 * k / (R - 1) : 0;
      x = P.hx + (i / (N - 1) * 2 - 1) * rx * (1 - 0.42 * k / (R - 1)) + sw; y = P.hy + rim + k * dy;
      bt = P.nb && (P.nb > 1 || k >= R - 2) ? P.ta + 0.2 + (R - 1 - k) * P.rx * 0.0016 + hsh(i, k) * 0.08 : 1e9;
      nd.push({ x: x, y: y, b: bt });
      ln = k ? 0.42 : 0.9;
      if (P.nb === 3 && e > bt && e < bt + 0.4) {
        c = (e - bt) / 0.4;
        for (a = 0; a < 8; a++) { d = M.sqrt(c) * (12 + 44 * hsh(a, i + k)); b = a + i * 3 + k; (a % 2 ? pd : pe).push(x + M.cos(b) * d, y + M.sin(b) * d, 3 * (1 - c) + 0.5); }
      } else if (P.nb < 3 && e > bt && e < bt + ln) L.push([x, y, -M.PI / 2, P.fw * (0.7 + 0.5 * hsh(k, i)), P.fh * (1 - (e - bt) / ln * 0.6) * (0.7 + 0.5 * hsh(i, k + 3)), M.sin(M.floor(e * 12) * 2 + i * 3) * P.fw * 0.4]);
    }
    dots(K, "light", pd); dots(K, "hot", pe);
    g.save(); g.beginPath();
    for (k = 0; k < R - 1; k++) for (i = 0; i < N - 1; i++) {
      a = nd[k * N + i]; b = nd[k * N + i + 1]; c = nd[(k + 1) * N + i]; d = nd[(k + 1) * N + i + 1];
      if (e < M.min(a.b, d.b) + 0.08) { g.moveTo(a.x, a.y); g.lineTo(d.x, d.y); }
      if (e < M.min(b.b, c.b) + 0.08) { g.moveTo(b.x, b.y); g.lineTo(c.x, c.y); }
    }
    g.lineWidth = 2.4; g.strokeStyle = K.pat("light", 0.88, g); g.stroke();
    g.restore();
    blit(K, K.st["f" + rx], P.hx, P.hy + rim, 1, 0);
  }
  // as the eye sees a ball drop through: the rim's back half, the ball (trail, flames), the net, the rim's front half
  function jam(K, ev, e, P) {
    var cx = ev.cx, cy = ev.cy, L = [], N = [], i, j, t, b, u, A = ev.area, u0 = e - P.ta;
    var rim = P.brick && u0 > 0 ? M.sin(u0 * 40) * 3 * M.exp(-u0 * 7) : 0;
    P.hx = cx; P.hy = P.top != null ? A.y + P.top : cy + P.hyo; P.vx = 260 / P.ta;
    if (e > P.ta && P.sh) K.shake(ev.box, 0.5, P.sh);
    if (e > P.ta && P.fl) K.flash(P.fl, "hot");
    function pos(t) { return bpos(P, t); }
    blit(K, K.st["b" + P.rx], P.hx, P.hy + rim, 1, 0);
    trail(K, L, P, pos, e, P.trail, P.dt, P.br, P.tf);
    b = bpos(P, e);
    if (e > 0 && b[1] < ev.H + 60) K.sprite(K.g, K.st[P.ball], b[0], b[1], 1, 0, 1);
    if (P.fan) for (j = 0; j < 6; j++) {
      u = e - P.ta - 0.1 - j * 0.07;
      if (u < 0) continue;
      var ang = -M.PI / 2 + (j - 2.5) * 0.42, vv = 560 + 60 * (j % 2), fn = function (t) { return [P.hx + M.cos(ang) * vv * t, P.hy + M.sin(ang) * vv * t + 600 * t * t]; };
      trail(K, L, P, fn, u, 7, 0.022, 16, 1);
      b = fn(u); if (b[1] < ev.H + 40) K.sprite(K.g, K.st.bh, b[0], b[1], 1, 0, 1);
    }
    flames(K, L);
    hoop(K, P, e, N, rim);
    flames(K, N);
    call(K, ev, P.word, (P.aw ? A.y : cy) + P.wy, e, P.ta, P.dur - 0.3);
    if (e > P.ta) {
      for (i = 0; i < 2; i++) if (!i || P.r2) K.ring({ x: P.hx, y: P.hy, r0: 8, r1: P.rx * (2.2 + i * 0.7), w0: P.rx * (0.12 - i * 0.05) + 3, ink: i ? P.r2 : P.pk, cov: 0.88, dur: 0.5, delay: P.ta + i * 0.06 });
      K.spark({ x: P.hx, y: P.hy + P.rx * 0.3, n: M.round(P.rx * 0.3), ink: function (q) { var v = q(); return v < 0.3 ? "light" : v < 0.65 ? "hot" : P.pk; }, sp: [120, 360], r: [1.2, 2.8], life: [0.4, 0.3], grav: 400, seed: ev.seed, delay: P.ta});
      if (P.em) K.spark({ x: P.hx, y: P.hy + P.nh * 0.6, n: P.em, ink: "dusk", sp: [20, 90], r: [1, 2.2], life: [0.9, 0.7], grav: -90, dir: -M.PI / 2, cone: 2.4, seed: ev.seed + 9, delay: P.ta + 0.3 });
    }
  }
  var T = {
    cold: { ball: "bc", word: ["cold"], rx: 32, hyo: -66, wy: 66, ta: 0.32, g: 1800, trail: 12, ti: ["light", "pop"], brick: [-170, 250, 1800], pk: "pop" },
    warm: { ball: "bw", word: ["warm"], rx: 38, hyo: -66, wy: 68, ta: 0.28, g: 3600, trail: 12, ti: ["dusk", "loss"], pk: "dusk" },
    hot: { ball: "bh", word: ["hot"], rx: 44, hyo: -68, wy: 76, ta: 0.25, g: 4200, trail: 14, tf: 1, ti: ["hot", "dusk"], pk: "hot", r2: "dusk" },
    fire: { ball: "bf", word: ["fire"], rx: 54, hyo: -72, wy: 88, ta: 0.22, g: 5000, trail: 16, tf: 1, ti: ["hot", "dusk"], nb: 1, fh: 56, fw: 22, pk: "hot", r2: "loss", sh: 6, em: 20 },
    nova: { ball: "bn", word: ["nova1", "nova2"], rx: 100, hyo: -90, wy: 142, ta: 0.2, g: 6000, trail: 18, tf: 1, big: 1, ti: ["light", "hot"], nb: 2, fh: 80, fw: 33, pk: "hot", r2: "loss", sh: 11, fl: 0.5, em: 24 },
    save: { ball: "bn", word: ["save1", "save2"], rx: 92, top: 118, aw: 1, wy: 335, ta: 0.2, g: 6000, trail: 18, tf: 1, big: 1, ti: ["light", "hot"], nb: 3, fan: 1, pk: "hot", r2: "pop", sh: 8, fl: 0.4 },
    miss: { ball: "bc", word: ["miss"], rx: 32, top: 215, aw: 1, wy: 322, ta: 0.25, g: 2600, trail: 12, ti: ["light", "pop"], brick: [540, 300, 1500], pk: "loss" }
  };
  Object.keys(T).forEach(function (k) {
    var p = T[k];
    p.nh = p.rx * 1.25; p.br = M.round(p.rx * 0.43); p.dt = p.big ? 0.018 : 0.014;
  });
  function beat(id, dur) { T[id].dur = dur; return { dur: dur, draw: function (K, ev, e) { jam(K, ev, e, T[id]); } }; }

  window.T82ART.add("hot", "jam", {
    name: "Heating Up",
    by: "The announcer's call in block-shadow type over a hoop: a flaming ball, and the nova's net burns away.",
    prep: function (K) {
      var jobs = [], st = K.st, RX = {};
      function merge(k, w, h, parts, inks) { // the plates, each off register, onto one sheet
        var c = document.createElement("canvas"), g = c.getContext("2d");
        c.width = w * k; c.height = h * k; g.globalCompositeOperation = K.blend;
        parts.forEach(function (pj, j) { var r = K.reg(inks[j]); pj.forEach(function (q) { g.drawImage(q[0], M.round(r[0] * k) + q[1] * k, M.round(r[1] * k)); q[0].width = 0; }); });
        return { print: c, w: w, h: h };
      }
      Object.keys(W).forEach(function (key) {
        var w = W[key], px = w.px, D = w.s[w.s.length - 1][1], pad = 10, n = M.ceil(w.l.length * px / 380), P = [], X = [], wd, ht, gl, out = [], inks = [w.f], k = 0;
        function plate(ink, j, src, done) { // each part of the word's plate in its own job
          var i;
          function one(i) {
            jobs.push(function () {
              (out[j] = out[j] || []).push([K.screen(P[i], ink, function (g) { g.globalAlpha = 0.96; g.drawImage(src(), X[i] * k, 0, P[i].W, P[i].H, 0, 0, P[i].W / k, ht); }), X[i]]);
              if (i === n - 1 && done) done();
            });
          }
          for (i = 0; i < n; i++) one(i);
        }
        jobs.push(function () {
          var c = document.createElement("canvas").getContext("2d"), g, i;
          c.font = K.font(700, px, "disp");
          wd = M.ceil(c.measureText(w.l).width + D + pad * 2 + px * 0.14); ht = M.ceil(px * 0.84 + D + pad * 2);
          for (i = 0; i <= n; i++) X[i] = M.round(wd * i / n);
          k = K.d;
          gl = document.createElement("canvas"); gl.width = wd * k; gl.height = ht * k; g = gl.getContext("2d");
          g.setTransform(k, 0, 0, k, 0, 0); g.transform(1, 0, -0.14, 1, 0.14 * ht, 0);
          g.font = K.font(700, px, "disp"); g.lineJoin = "round"; g.lineWidth = px * 0.06; g.fillStyle = g.strokeStyle = "#000";
          g.fillText(w.l, pad, pad + px * 0.74); g.strokeText(w.l, pad, pad + px * 0.74); g.getImageData(0, 0, 1, 1);
        });
        function mk(i) { jobs.push(function () { P[i] = K.plate(X[i + 1] - X[i], ht, key.length * 977 + key.charCodeAt(1) + i); }); }
        for (var q = 0; q < n; q++) mk(q);
        plate(w.f, 0, function () { return gl; });
        w.s.forEach(function (sh, j) { // an extrusion: the glyph copied out k steps, less the nearer copies
          var k0 = j ? w.s[j - 1][1] : 0, tc = null, a;
          inks.push(sh[0]);
          function copies(from, to, knock) { // a few copies a job, read back so the job pays for its drawing
            jobs.push(function () {
              var g, i;
              if (!tc) { tc = document.createElement("canvas"); tc.width = gl.width; tc.height = gl.height; }
              g = tc.getContext("2d"); g.globalCompositeOperation = knock ? "destination-out" : "source-over"; g.globalAlpha = knock ? 1 : 0.96;
              for (i = from; i <= to; i++) g.drawImage(gl, i * 0.9 * k, i * 0.9 * k);
              g.getImageData(0, 0, 1, 1);
            });
          }
          for (a = k0 + 1; a <= sh[1]; a += 5) copies(a, M.min(a + 4, sh[1]));
          for (a = 0; a <= k0; a += 5) copies(a, M.min(a + 4, k0), 1);
          plate(sh[0], j + 1, function () { return tc; }, function () { tc.width = 0; });
        });
        jobs.push(function () { st[key] = merge(k, wd, ht, out, inks); P = gl = null; });
      });
      Object.keys(T).forEach(function (id) { RX[T[id].rx] = 1; });
      Object.keys(RX).forEach(function (rx) { // a rim in two halves, dusk, the front with a gold lip
        rx = +rx;
        jobs.push(function () {
          var q = rx * 0.22, w = 2 * rx + 14, h = 2 * q + 16, P = K.plate(w, h, rx), lw = M.max(3.5, rx * 0.06), PI = M.PI;
          function arc(ink, l, a0, a1) { return [[K.screen(P, ink, function (g) { g.lineWidth = l; g.strokeStyle = K.tone(0.95); g.beginPath(); g.ellipse(w / 2, h / 2, rx, q, 0, a0, a1); g.stroke(); }), 0]]; }
          st["b" + rx] = merge(P.k, P.W / P.k, P.H / P.k, [arc("dusk", lw, PI, TAU)], ["dusk"]);
          st["f" + rx] = merge(P.k, P.W / P.k, P.H / P.k, [arc("dusk", lw, 0, PI), arc("hot", lw / 2, 0.15, PI - 0.15)], ["dusk", "hot"]);
        });
      });
      return jobs.concat(K.emojiJobs([["bc", BALL, 30, COLDB, SAT], ["bw", BALL, 36, WARMB, SAT], ["bh", BALL, 44, WARMB, SAT], ["bf", BALL, 52, WARMB, SAT], ["bn", BALL, 96, WARMB, SAT]]));
    },
    slots: {
      cold: beat("cold", 0.9), warm: beat("warm", 0.9), hot: beat("hot", 1.1), fire: beat("fire", 1.4), nova: beat("nova", 2.4),
      save: beat("save", 2.2), miss: beat("miss", 1.2)
    }
  });
})();
