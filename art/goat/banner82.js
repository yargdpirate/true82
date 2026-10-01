/* Banner Night, an 82-0 goat pack (art/CONTRACT-FX.md): a championship banner in a firework. In about half the shells
   a pole drops into the burst and a swallowtail cloth unrolls past its length and snaps back (82-0 and a star in white,
   a lilac overprint trim, a magenta shadow plate a drum's miss behind), swings, flutters on twos, glints, furls up; the
   pole falls and crackles out. The chrysanthemum prints behind it: a star the cloth hides is not printed. Cloth pairs:
   pink + aqua, aqua + pink, orange + gold, pink + violet, on a 4 x 2 lattice. Done by 1.55 s. */
(function () {
  "use strict";
  var TAU = Math.PI * 2;
  var SETS = [["loss", "pop", "hot", "light"], ["pop", "loss", "loss", "light"], ["dusk", "hot", "loss", "hot"], ["loss", "night", "pop", "light"]];
  function k01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  window.T82ART.add("goat", "banner82", {
    name: "Banner Night",
    by: "Shells that hang a championship banner: an 82-0 swallowtail cloth unrolls in the burst, a firework printed behind it, then it furls away.",
    prep: function (K) {
      return [function () {                
        var P = K.plate(56, 36, 8201);
        K.st.t = { plates: [K.screen(P, "light", function (g) { g.fillStyle = K.tone(0.95); g.font = K.font(800, 26, "disp"); g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("82-0", 28, 19); })], reg: [K.reg("light")], w: 56, h: 36, ox: 0, oy: 0 };
      }];
    },
    slots: {
      burst: { dur: 1.55, draw: function (K, ev, e) {
        var g = K.g, r = K.rand(ev.seed ^ 0xba82), set = SETS[(r() * SETS.length) | 0], i, N, ph = r() * TAU, a0 = r() * TAU;
        var bw = Math.max(52, Math.min(68, ev.w * 0.19)), bh = bw * 1.5, nt = bh * 0.16, PW = bw / 2 + 9;
        var R = Math.max(82, Math.min(140, Math.min(ev.w, ev.h || ev.w) * 0.38)) * (0.86 + 0.3 * r());
        var ban = r() < 0.55, cell = (r() * 8) | 0, jx = (r() - 0.5) * 6, jy = (r() - 0.5) * 6;
        N = ban ? 14 : 22;
        var cx = ban ? ev.x + ev.w * (0.17 + 0.22 * (cell % 4)) + jx : ev.x + ev.w * (0.15 + 0.7 * r());
        var cy = ev.y + ev.h * (ban ? 0.27 + 0.2 * (cell >> 2) : 0.2 + 0.42 * r()) + (ban ? jy : 0), top = cy - bh * 0.52;
        var eh = Math.floor(e * 12) / 12, u = k01(e / 0.1), uf = K.ease.back(k01((e - 0.06) / 0.28)), fu = k01((e - 1.05) / 0.2);
        var oy = top - 70 * (1 - u * u) + (e > 1.19 ? 1500 * (e - 1.19) * (e - 1.19) : 0);
        var h = ban ? Math.max(0, bh * uf * (1 - fu * fu)) : 0, hw = bw / 2 * (0.6 + 0.4 * k01(uf)), A = 3 + 7 * k01(1 - (e - 0.2) / 0.5), yn = h - nt * k01(h / bh);
        var rot = e > 0.12 ? 0.14 * Math.exp(-4 * (e - 0.12)) * Math.sin(15 * (e - 0.12)) + (e > 0.5 ? 0.035 * Math.sin(eh * 5.5 + ph) : 0) : 0, c = Math.cos(rot), s = Math.sin(rot);
        function wv(y) { return A * Math.sin(y * 0.085 - eh * 8 + ph) * (y / bh); }
        function pt(x, y, first) { var X = cx + x * c - y * s, Y = oy + x * s + y * c; if (first) g.moveTo(X, Y); else g.lineTo(X, Y); }
        function shape(w, y0, yc, yn2) {
          var k, y;
          for (k = 0; k <= 6; k++) { y = y0 + (yc - y0) * k / 6; pt(-w + wv(y), y, k === 0); }
          pt(wv(yn2), yn2);
          for (k = 6; k >= 0; k--) { y = y0 + (yc - y0) * k / 6; pt(w + wv(y), y); }
          g.closePath();
        }
        function poly(n, x, y, ro, ri, an) { for (var k = 0; k < n; k++) pt(x + wv(y) + Math.cos(an + k * TAU / n) * (k % 2 ? ri : ro), y + Math.sin(an + k * TAU / n) * (k % 2 ? ri : ro), k === 0); g.closePath(); }
        function plate(ink, cov, fn, rule) {        
          var q = K.reg(ink);
          g.save(); g.translate(q[0], q[1]); g.beginPath(); fn(); g.fillStyle = K.pat(ink, cov, g); g.fill(rule || "nonzero"); g.restore();
        }
        function dring(r1, dur, dl, ink, sz) {
          var p = (e - dl) / dur, L = [], k, an, rr = 5 + (r1 - 5) * K.ease.out(p);
          if (p < 0 || p >= 1) return;
          for (k = 0; k < 28; k++) { an = a0 + k / 28 * TAU; L.push(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, sz * (1 - p) + 0.8); }
          K.dots(g, ink, 0.9, L);
        }
        g.save(); g.globalCompositeOperation = K.blend;
        dring(R * 0.62, 0.26, 0, "light", 3.6); dring(R * 1.05, 0.44, 0.05, set[2], 3.2);
        if (e < 0.1) K.dots(g, "light", 0.8, [cx, cy, R * 0.2 * (1 - e / 0.1) + 3]);
        if (e < 1.35) {
          var d = 1 - Math.exp(-3.1 * e), drop = 0.4 * R * e * e, h0 = [], h1 = [], crack = [], t2 = Math.max(0, e - 0.15), r2 = 1 - Math.exp(-3.1 * t2), tr = e < 0.85;
          var bx0 = cx - hw - 4, bx1 = cx + hw + 4, by1 = oy + h + 4, hid = h > 4;
          if (tr) g.beginPath();
          for (i = 0; i < N; i++) {
            var th = (i + r() * 0.5) / N * TAU + a0, m = 0.86 + r() * 0.28, die = 0.85 + 0.3 * r(), co = Math.cos(th), si = Math.sin(th);
            if (e > die + 0.14) continue;
            var x = cx + co * R * m * d, y = cy + si * R * m * d + drop, w = 3.2 * (1 - 0.4 * e / die);
            if (hid && x > bx0 && x < bx1 && y > oy - 4 && y < by1) continue;
            if (e > die) { var cp = (e - die) / 0.14; for (var j = 0; j < 3; j++) crack.push(x + Math.cos(th * 3 + j * 2.1) * 12 * cp, y + Math.sin(th * 3 + j * 2.1) * 12 * cp, 1.8 * (1 - cp) + 0.5); continue; }
            if (tr) { g.moveTo(x - si * w, y + co * w); g.lineTo(x + si * w, y - co * w); g.lineTo(cx + co * R * m * r2, cy + si * R * m * r2 + 0.4 * R * t2 * t2); g.closePath(); }
            (e > 0.4 && i % 2 ? h1 : h0).push(x, y, 3.4 - 1.4 * e / die);
          }
          if (tr) { g.fillStyle = K.pat(set[2], e < 0.3 ? 0.88 : 0.72, g); g.fill(); }
          K.dots(g, set[2], 0.95, h0); K.dots(g, set[3], 0.95, h1); K.dots(g, "light", 0.95, crack);
        }
        if (ban && e < 1.4) {
          plate("light", 0.9, function () { pt(-PW, -3, 1); pt(PW, -3); pt(PW, 3); pt(-PW, 3); g.closePath(); });
          K.dots(g, "hot", 0.9, [cx - PW * c, oy - PW * s, 5.5, cx + PW * c, oy + PW * s, 5.5]);
        } else if (ban) {
          var kp = (e - 1.4) / 0.14, pl = [];
          for (i = 0; i < 8; i++) pl.push(cx + Math.cos(i * 0.8 + a0) * PW * (i % 2 ? 0.5 : 1) * (0.4 + kp), oy + Math.sin(i * 0.8 + a0) * 16 * kp, 3 * (1 - kp) + 0.5);
          K.dots(g, "light", 0.95, pl);
        }
        if (h > 4) {
          plate("key", 0.7, function () {
            var k;
            for (k = 0; k <= 6; k++) pt(hw + wv(h * k / 6) + 6, h * k / 6 + 5, k === 0);
            for (k = 6; k >= 0; k--) pt(hw + wv(h * k / 6), h * k / 6);
            g.closePath();
            pt(hw + wv(h) + 6, h + 5, 1); pt(wv(yn) + 6, yn + 5); pt(-hw + wv(h) + 6, h + 5); pt(-hw + wv(h), h); pt(wv(yn), yn); pt(hw + wv(h), h); g.closePath();
          });
          plate(set[0], 0.84, function () { shape(hw, 0, h, yn); });
          if (h > 30) plate(set[1], 0.88, function () { shape(hw, 0, h, yn); shape(hw - 5.5, 7, h - 8, yn - 5); }, "evenodd");
          var ty = bh * 0.56, sy = bh * 0.22, gp = k01((e - 0.46) / 0.12), gq = k01((e - 0.76) / 0.12);
          if (h > bh * 0.36) {
            plate("light", 0.9, function () {
              poly(10, 0, sy, bw * 0.13, bw * 0.06, -Math.PI / 2);
              if (h > bh * 0.8) { if (gp > 0 && gp < 1) poly(8, 0.3 * bw, 0.1 * bh, 10 * Math.sin(Math.PI * gp), 2, 0); if (gq > 0 && gq < 1) poly(8, -0.28 * bw, 0.76 * bh, 9 * Math.sin(Math.PI * gq), 2, 0); }
            });
            if (h > bh * 0.72 && K.st.t) K.sprite(g, K.st.t, cx + wv(ty) * c - ty * s, oy + wv(ty) * s + ty * c, Math.round(bw * 0.4) / 26, rot, 1);
          }
        }
        g.restore();
      } }
    }
  });
})();
