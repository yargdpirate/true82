/* Phoenix, a Heat Check pack (art/CONTRACT-FX.md): sparks gather into a firebird printed in three plates (pink outer
   feathers, orange inner ones, a gold core, each a hair off register), every feather a leaf cut from one contour. cold: an
   ash bird that crumbles. warm: embers gather into a fledgling. hot: the bird unfurls and rises. fire: bigger, on a
   stepped halftone sun. nova: a giant bird erupts at one corner and sweeps the whole screen (flash, shake). save: the
   bird rises over the verdict stamp, rings of ink. miss: the bird burns out into ash. */
(function () {
  "use strict";
  var PI = Math.PI, TAU = PI * 2, sin = Math.sin, cos = Math.cos, A = window.T82ART, HW = [], N = 8, h;
  for (h = 0; h <= N; h++) HW.push(Math.pow(sin(PI * Math.pow(h / N, 0.8)), 0.8));
  var TX = 0, TY = 0, TS = 1, CR = 1, SR = 0;      // the bird's place: baked into every point, so the canvas keeps no turned or scaled
  // transform (a screen pattern pinned under one prints about 1.5x slower)
  function at(g, x, y, mv) {
    var px = TX + TS * (CR * x - SR * y), py = TY + TS * (SR * x + CR * y);
    if (mv) g.moveTo(px, py); else g.lineTo(px, py);
  }
  function k01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function mix(a, b, t) { return a + (b - a) * t; }
  function sm(t) { t = k01(t); return t * t * (3 - 2 * t); }
  // one feather: a leaf from (x, y) heading (dx, dy), len long, wid wide, the centerline bowed by curl (an open path)
  function blade(g, x, y, dx, dy, len, wid, curl) {
    var i, t, cx, cy, hw, nx = -dy, ny = dx, R = [];
    if (len < 1.5) return;
    for (i = 0; i <= N; i++) {
      t = i / N; cx = x + dx * len * t + nx * curl * len * t * t; cy = y + dy * len * t + ny * curl * len * t * t; hw = wid / 2 * HW[i];
      at(g, cx + nx * hw, cy + ny * hw, !i);
      R.push(cx - nx * hw, cy - ny * hw);
    }
    for (i = R.length - 2; i >= 0; i -= 2) at(g, R[i], R[i + 1]);
    g.closePath();
  }
  function ball(g, x, y, r) { var i, a; for (i = 0; i < 14; i++) { a = -i / 14 * TAU; at(g, x + cos(a) * r, y + sin(a) * r, !i); } g.closePath(); }
  // the bird's feathers, in a frame whose origin is the chest: cb(x, y, dx, dy, len, wid, curl). o: p wings (0 down, 1 up),
  // u unfurl (0 to 1), w the clock (the tail's wave), k how far the wing tips bow
  function skel(o, cb) {
    var i, s, u, a, gr, L, sp = mix(0.96, 1.4, o.p), a0 = mix(-0.35, 1.2, o.p), b;
    for (s = -1; s <= 1; s += 2) {
      for (i = 0; i < 11; i++) {                    // eleven feathers fanned from the shoulder: the odd ones are the short coverts
        u = i / 10; a = a0 - sp * u; gr = sm(o.u * 1.6 - u * 0.5); L = 152 * (1 - 0.4 * Math.pow(u, 1.2));
        if (i % 2) { if (!o.lod) cb(s * 14, -8, s * cos(a), -sin(a), L * 0.52 * gr, 28, -s * o.k * 0.6); }
        else cb(s * 14, -8, s * cos(a), -sin(a), L * gr, 19, -s * o.k);
      }
    }
    for (i = o.lod ? 1 : 0; i < (o.lod ? 6 : 7); i++) {
      b = i - 3; a = b * 0.27 + sin(o.w * 5 + i * 1.3) * 0.06; gr = sm(o.u * 1.7 - 0.3 - Math.abs(b) * 0.1);
      cb(0, 20, sin(a), cos(a), (190 - 20 * Math.abs(b)) * gr, 23 - 2.5 * Math.abs(b), b * 0.06 + sin(o.w * 6 + i * 0.9) * 0.13);
    }
    cb(0, -38, 0, 1, 82 * sm(o.u * 3), 40, 0);
  }
  // the bird in its three plates, outer to inner: pink rim, orange middle, gold core, each at its ink's registration. Printed
  // source-over on the layer (the layer meets the screen in the blend), so the zones are dots of one ink over dots of the
  // last: an overprint dither that stays orange and gold, never a white pile
  function bird(K, g, o) {
    var i, f, r, P = o.inks, cov, hu = sm(o.u * 3), c, hx = o.hx || 1;
    CR = cos(o.r); SR = sin(o.r); TS = o.s;
    for (i = 0; i < 3 + (o.inks.length > 3 ? 1 : 0); i++) {
      cov = o.cov[i] * o.m;
      if (cov < 0.2 || !P[i]) continue;
      f = [1, 0.7, 0.42, 0.2][i]; r = K.reg(P[i]);
      TX = o.x + r[0] + o.dx * i; TY = o.y + r[1] + o.dy * i;
      g.save();
      g.beginPath();
      skel(o, function (x, y, dx, dy, L, W, c) { blade(g, x, y, dx, dy, L * f, W * f, c); });
      ball(g, -8 * hx, -57, 14.5 * f * hu);
      if (i === 0) for (c = 0; c < 3; c++) blade(g, -2 * hx, -68, hx * sin(0.35 + c * 0.4), -cos(0.35 + c * 0.4), [40, 48, 32][c] * hu, 12, 0.12 * hx);
      if (i === 2) { for (c = 0; c < 4; c++) { r = hx < 0 ? 3 - c : c; at(g, hx * [-19, -46, -31, -19][r], [-63, -51, -50.5, -49][r], !c); } g.closePath(); }
      g.fillStyle = K.pat(P[i], cov, g); g.fill(); g.restore();
    }
    TX = o.x; TY = o.y;     // the eye: bare stock
    g.save(); g.globalCompositeOperation = "destination-out"; g.fillStyle = K.tone(1); g.beginPath();
    g.arc(TX + TS * (CR * -12 * hx - SR * -60), TY + TS * (SR * -12 * hx + CR * -60), 3 * TS, 0, TAU); g.fill(); g.restore();
  }
  // the points sparks fly to: along every feather, in the world
  function tips(o, r) {
    var T = [], q = { p: o.p, u: 1, w: o.w, k: o.k }, cs = cos(o.r), sn = sin(o.r);
    skel(q, function (x, y, dx, dy, L, W, c) {
      var t = 0.45 + 0.55 * r(), lx = x + dx * L * t - dy * c * L * t * t, ly = y + dy * L * t + dx * c * L * t * t;
      T.push([o.x + o.s * (cs * lx - sn * ly), o.y + o.s * (sn * lx + cs * ly)]);
    });
    return T;
  }
  function sparks(K, o, e, t0, t1, n, R, seed, inks) {      // dots spiral in from a ring of radius R and become the bird, each trailing two
    var u = (e - t0) / (t1 - t0), r = K.rand(seed), T, L = {}, i, d, q, a, rr, t, k, c, j, rad, z;
    if (u <= 0 || u >= 1) return;
    T = tips(o, K.rand(seed ^ 5));
    for (i = 0; i < n; i++) {
      t = T[(r() * T.length) | 0]; a = r() * TAU; rr = R * (0.55 + 0.9 * r()); d = r() * 0.35; c = inks[i % inks.length]; rad = 2.4 + 1.2 * ((r() * 3) | 0);
      for (j = 0; j < 3; j++) {
        z = u - j * 0.045; if (z <= d) continue;
        q = Math.pow(k01((z - d) / (1 - d)), 1.7); k = 1 - q;
        (L[c] = L[c] || []).push(t[0] + cos(a + 2.4 * k) * rr * k, t[1] + sin(a + 2.4 * k) * rr * k * 0.8, rad - j * 0.9);
      }
    }
    for (c in L) K.dots(K.g, c, 0.95, L[c]);
  }
  function embers(K, at, o, e, t0, n, life, seed, inks) {  // dots shed from the tail as the bird flies, falling behind it
    var r = K.rand(seed), L = {}, j, te, age, P, c, x, v;
    for (j = 0; j < n; j++) {
      te = t0 + j * life / n; age = e - te; v = r(); x = (r() - 0.5) * 60 * o.s;
      if (age <= 0 || age >= life) continue;
      P = at(te); c = inks[j % inks.length];
      (L[c] = L[c] || []).push(P.x + x + (v - 0.5) * 70 * age, P.y + 120 * o.s + r() * 40 * o.s - 40 * age + 240 * age * age, age < life * 0.4 ? 2.8 : age < life * 0.75 ? 1.9 : 1.1);
    }
    for (c in L) K.dots(K.g, c, 0.95, L[c]);
  }
  // a halftone sun: rings of dots, big near the middle and small at the rim (the dot-size ramp), over the arc a0..a1
  function halo(K, x, y, R, m, a0, a1, ink) {
    var L = {}, ring, n, i, rr, c, ang, px, py, W = K.g.canvas.width / K.d;
    m = Math.ceil(m * 6) / 6;
    if (m <= 0.02) return;
    for (ring = 0; ring < 5; ring++) {
      rr = R * (0.45 + 0.55 * ring / 4) * (0.5 + 0.5 * m); n = Math.round((a1 - a0) * rr / 27); c = ink[ring < 2 ? 0 : ring < 4 ? 1 : 2];
      for (i = 0; i <= n; i++) {
        ang = a0 + (a1 - a0) * (i + (ring % 2) * 0.5) / (n || 1); px = x + cos(ang) * rr; py = y + sin(ang) * rr;
        if (px > -6 && px < W + 6 && py > -6) (L[c] = L[c] || []).push(px, py, Math.max(0.8, (5 - ring * 0.7) * m));
      }
    }
    for (c in L) K.dots(K.g, c, 0.88, L[c]);
  }
  // the whole bird for a beat: sparks gather, it unfurls, flaps on twos, rises along the path, then flies off (or sinks) as
  // its coverage drains. c: dur, ex (the exit), tg (the sparks arrive), tf (unfurled), x0 y0 x1 y1 (rise), pos(e) (a path
  // instead), s, r, fl (flaps a second), p (wing range), inks, cov, n R (sparks), fly (the exit's travel), em (embers)
  function life(K, ev, e, c) {
    var tm = c.dur - c.ex, t0 = c.tg * 0.45, tt = Math.floor((e - t0) * 12) / 12, out = k01((e - tm) / c.ex), o, P;
    function at(t) {
      var q = K.ease.out(k01((t - t0) / (tm - t0))), oo = k01((t - tm) / c.ex), Q = c.pos ? c.pos(t) : [mix(c.x0, c.x1, q), mix(c.y0, c.y1, q), c.r || 0];
      return { x: Q[0], y: Q[1] - c.fly * oo * oo, r: Q[2] };
    }
    P = at(e);
    o = { x: P.x, y: P.y, s: c.s, r: P.r, p: mix(c.p[0], c.p[1], 0.5 + 0.5 * cos(TAU * c.fl * tt)), u: k01((e - t0) / (c.tf - t0)) * (c.um || 1), w: e, k: 0.22, inks: c.inks, cov: c.cov, lod: c.lod, hx: c.hx,
      dx: 2.2 * c.s, dy: -1.6 * c.s, m: (0.3 + 0.7 * sm((e - t0) / (c.tg - t0 + 0.05))) * (1 - 0.9 * out) };
    if (e > t0) bird(K, K.g, o);
    sparks(K, o, e, 0, c.tg + 0.12, c.n, c.R, ev.seed + 3, c.sp || c.inks);
    if (c.em) embers(K, at, o, e, c.tg, c.em, 0.55, ev.seed + 9, c.sp || c.inks);
    return o;
  }
  var HOT = ["loss", "dusk", "hot"];
  A.add("hot", "phoenix", {
    name: "Phoenix",
    by: "Sparks gather into a riso firebird that unfurls, rises with the tier, and sweeps the whole screen at supernova.",
    slots: {
      cold: { dur: 0.9, draw: function (K, ev, e) {
        life(K, ev, e, { dur: 0.9, ex: 0.3, tg: 0.25, tf: 0.4, x0: ev.cx, y0: ev.cy - 50, x1: ev.cx, y1: ev.cy - 70, s: 0.52, fl: 0.7, p: [0.05, 0.3], inks: ["pop", "night"], cov: [0.72, 0.66], n: 14, sp: ["pop", "night"], R: 70, fly: -60 });
        K.spark({ x: ev.cx, y: ev.cy - 50, n: 18, ink: function (q) { return q() < 0.4 ? "light" : "pop"; }, sp: [20, 80], r: [1.2, 2.4], life: [0.55, 0.3], grav: 380, dir: PI / 2, cone: 2.8, seed: ev.seed, e: e - 0.55 });
      } },
      warm: { dur: 0.9, draw: function (K, ev, e) {
        life(K, ev, e, { dur: 0.9, ex: 0.3, tg: 0.3, tf: 0.55, x0: ev.cx, y0: ev.cy - 40, x1: ev.cx, y1: ev.cy - 90, s: 0.55, um: 0.8, fl: 1.2, p: [0.25, 0.8], inks: ["loss", "dusk"], cov: [0.66, 0.74], n: 18, R: 90, fly: 260, sp: ["dusk", "loss", "hot"] });
      } },
      hot: { dur: 1.1, draw: function (K, ev, e) {
        K.ring({ x: ev.cx, y: ev.cy - 80, r0: 12, r1: 150, w0: 8, ink: "hot", cov: 0.88, dur: 0.45, e: e - 0.3 });
        life(K, ev, e, { dur: 1.1, ex: 0.3, tg: 0.3, tf: 0.5, x0: ev.cx, y0: ev.cy - 30, x1: ev.cx, y1: ev.cy - 115, s: 0.72, fl: 1.5, p: [0.2, 0.95], inks: HOT, cov: [0.8, 0.86, 0.9], n: 30, R: 110, fly: 420, em: 12 });
      } },
      fire: { dur: 1.3, draw: function (K, ev, e) {
        var up = k01((e - 0.95) / 0.35);
        K.shake(ev.box, 0.5, 6);
        halo(K, ev.cx, ev.cy - 130, 180, K.ease.out(k01(e / 0.5)) * (1 - up), PI * 0.85, PI * 2.15, ["hot", "dusk", "loss"]);
        K.ring({ x: ev.cx, y: ev.cy - 100, r0: 12, r1: 210, w0: 8, ink: "hot", cov: 0.9, dur: 0.5, e: e - 0.32 });
        life(K, ev, e, { dur: 1.3, ex: 0.35, tg: 0.32, tf: 0.55, x0: ev.cx, y0: ev.cy - 10, x1: ev.cx, y1: ev.cy - 140, s: 0.92, lod: 1, fl: 1.5, p: [0.25, 0.95], inks: HOT, cov: [0.82, 0.88, 0.9], n: 28, R: 150, fly: 560, em: 8 });
        K.spark({ x: ev.cx, y: ev.cy - 100, n: 16, ink: function (q) { return q() < 0.3 ? "light" : "hot"; }, sp: [200, 480], r: [1.2, 3], life: [0.35, 0.35], grav: 400, seed: ev.seed, streak: true, e: e - 0.32 });
      } },
      nova: { dur: 2.4, draw: function (K, ev, e) {
        var W = ev.W, H = ev.H, gx = W * 0.3, gy = H * 0.7, ex = 0.5, g = 1 - k01((e - 1.6) / 0.5);
        if (e >= ex) { K.flash(0.55, "hot"); K.shake(ev.box, 1, 11); }
        halo(K, gx, gy, 250, K.ease.out(k01(e / 0.55)) * g, 0, TAU, ["hot", "dusk", "loss"]);
        K.ring({ x: gx, y: gy, r0: 14, r1: W * 1.1, w0: 11, ink: "hot", cov: 0.92, dur: 0.7, e: e - ex });
        life(K, ev, e, { dur: 2.4, ex: 0.45, tg: ex, tf: 0.9, s: 1.15, lod: 1, hx: -1, fl: 1.4, p: [0.25, 0.95], inks: ["loss", "dusk", "hot", "light"], cov: [0.82, 0.88, 0.9, 0.92], n: 30, R: 300, fly: 0, em: 6, sp: ["hot", "dusk", "loss", "light"],
          pos: function (t) { var q = Math.pow(k01((t - 0.55) / 1.4), 1.6); return [mix(gx, W * 1.2, q), mix(gy, -H * 0.12, q) - 70 * sin(PI * q), 0.12 + 0.4 * q]; } });
        K.spark({ x: gx, y: gy - 40, n: 20, ink: function (q) { var v = q(); return v < 0.25 ? "light" : v < 0.65 ? "hot" : "dusk"; }, sp: [380, 980], r: [1.3, 3.4], life: [0.6, 0.6], grav: 700, seed: ev.seed + 3, streak: true, e: e - ex });
      } },
      save: { dur: 2.0, draw: function (K, ev, e) {
        var s = ev.big ? 0.98 : 0.8, hy = ev.cy - 40 - 190 * s, up = k01((e - 1.55) / 0.45);
        if (ev.big && e > 0.3) K.flash(0.45, "hot");
        K.shake(ev.box, 0.5, ev.big ? 9 : 6);
        halo(K, ev.cx, hy + 40, 170 * s + 40, K.ease.out(k01((e - 0.3) / 0.6)) * (1 - up), PI * 0.85, PI * 2.15, ["hot", "dusk", "loss"]);
        K.ring({ x: ev.cx, y: ev.cy, r0: 10, r1: 190, w0: 8, ink: "hot", cov: 0.9, dur: 0.55, e: e - 0.3 });
        life(K, ev, e, { dur: 2.0, ex: 0.4, tg: 0.4, tf: 0.7, x0: ev.cx, y0: ev.cy - 20, x1: ev.cx, y1: hy, s: s, lod: 1, fl: 1.4, p: [0.25, 0.95], inks: HOT, cov: [0.82, 0.88, 0.9], n: 28, R: 160, fly: 600, em: 8 });
        K.spark({ x: ev.cx, y: ev.cy, n: 18, ink: function (q) { return q() < 0.3 ? "light" : "hot"; }, sp: [160, 420], r: [1.2, 3], life: [0.5, 0.4], grav: 340, seed: ev.seed + 4, streak: true, e: e - 0.35 });
      } },
      miss: { dur: 1.2, draw: function (K, ev, e) {
        var k = k01((e - 0.28) / 0.6), cool = e > 0.4, out = k01((e - 0.95) / 0.25), o;
        o = { x: ev.cx, y: ev.cy - 140 + 60 * k * k, s: 0.62, r: 0.1 * sin(k * 9) * (1 - k), p: mix(0.85, 0, sm(k)), u: sm(e / 0.1) * (1 - 0.7 * sm((e - 0.3) / 0.6)), w: e, k: 0.22,
          inks: cool ? ["loss", "night", "key"] : HOT, cov: cool ? [0.72, 0.6, 0.5] : [0.8, 0.86, 0.9], m: (1 - 0.9 * out), dx: 1.4, dy: -1 };
        bird(K, K.g, o);
        K.spark({ x: ev.cx, y: ev.cy - 100, n: 26, ink: function (q) { return q() < 0.5 ? "night" : "loss"; }, sp: [10, 90], r: [1.2, 2.8], life: [0.7, 0.4], grav: 360, seed: ev.seed, e: e - 0.25 });
        K.spark({ x: ev.cx, y: ev.cy - 70, n: 16, ink: "key", sp: [10, 60], r: [1.2, 2.4], life: [0.7, 0.4], grav: 300, seed: ev.seed + 8, e: e - 0.4 });
      } }
    }
  });
})();
