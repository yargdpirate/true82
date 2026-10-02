/* art/loss/drum.js: Riso Drum. A fat ribbed drum (a cylinder seen side-on, its ribs rolling) crosses the card and the L
   prints behind it; a second drum in aqua comes back the other way and its plate lands off register, a crescent of
   shadow, the drum itself a lilac flare where it crosses the pink. A long moment keeps the press running: each pass
   prints heavier (pink 0.72 to 0.97, the aqua shadow widening). Then a last drum rolls in at the right and the sheet
   is fed into it, the aqua lagging. Plates (levels of one small plate): the L at three weights, its aqua crescent at
   three offsets. Drums are live: one strip of K.pat per rib, lit from the upper left. Passes are absolute (x q). */
(function () {
  "use strict";
  var PT = [[-62, -100], [-16, -100], [-16, 56], [62, 56], [62, 100], [-62, 100]], TAU = 6.2832;
  function Lp(g, ox, oy) { g.beginPath(); for (var i = 0; i < 6; i++) g[i ? "lineTo" : "moveTo"](ox + PT[i][0], oy + PT[i][1]); g.closePath(); }
  T82ART.add("loss", "drum", {
    name: "Riso Drum",
    by: "A ribbed drum crosses the card printing the L behind it, an aqua drum comes back and lands its plate off register, each pass heavier; a last drum eats the sheet.",
    prep: function (K) {
      var st = K.st, jobs = [];
      jobs.push(function () {
        var P = st.P = K.plate(130, 206, 8121);
        st.L = K.levels(P, "loss", function (g, c) { g.fillStyle = K.tone(c); Lp(g, 65, 103); g.fill(); }, [0.72, 0.86, 0.97]);
        st.A = K.levels(P, "pop", function (g, o) {
          g.fillStyle = K.tone(0.62); Lp(g, 65 + o, 103 + o * 0.85); g.fill();
          g.globalCompositeOperation = "destination-out"; g.strokeStyle = K.tone(1); g.fillStyle = K.tone(1); g.lineWidth = 1.2; Lp(g, 65, 103); g.fill(); g.stroke();
        }, [6, 10, 14]);
        jobs.push.apply(jobs, st.L.jobs.concat(st.A.jobs));
      });
      return jobs;
    },
    hit: function (K, E) {
      var B = K.box;
      K.spark({ x: B.x0 + 12, y: (B.y0 + B.y1) / 2, n: 12, ink: function (q) { return q() < 0.3 ? "pop" : "loss"; }, sp: [120, 360], r: [1, 2.6], life: [0.25, 0.3], grav: 600, seed: E.seed, streak: true });
      K.flash(E.first ? 0.55 : 0.4); K.shake(Math.max(E.dur, 0.42), E.first ? 9 : 7);
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, i, k;
      if (!st.A || !st.A[2]) return;
      var H = B.y1 - B.y0, s = H / 200, cx = B.cx, cy = (B.y0 + B.y1) / 2, R = 31 * s, W = B.x1 - B.x0;
      var w = Math.min(0.2, 0.3 * E.dur), T = E.dur - w, f = e > T ? K.clamp((E.dur - e) / (w * 0.5), 0, 1) : 1;
      if (f <= 0) return;
      var q = K.clamp((E.dur - 0.1) / 0.65, 0.3, 1), dp = 0.22 * q, sl = dp + 0.12 * q, n = K.clamp(Math.floor((T - 0.1) / sl), 2, 5), tN = n * sl - 0.12 * q;
      var xa = B.x0 - 1.2 * R, xb = B.x1 + 1.2 * R, kl = -1, p = 0, dn = 1, xc = xa, fd = T - 0.12 >= tN + 0.02, ux = K.clamp((e - T) / w, 0, 1), sh = fd ? ux * ux * W * 0.8 : 0;
      for (k = 0; k < n; k++) if (e >= k * sl) kl = k;
      if (kl >= 0) {
        p = K.clamp((e - kl * sl) / dp, 0, 1); dn = kl % 2 ? -1 : 1;
        var gp = p + 0.55 * Math.sin(TAU * p) / TAU; xc = dn > 0 ? xa + (xb - xa) * gp : xb - (xb - xa) * gp;
      }
      var xd = cx + 99 * s, xe = fd ? xd + (xb - xd) * (1 - K.ease.out(K.clamp((e - (T - 0.12)) / 0.12, 0, 1))) : 0;
      function img(c, x0, x1, dx) { // a plate, shown between two x, shifted by dx
        g.save(); g.beginPath(); g.rect(x0, B.spanTop - 20, x1 - x0, B.span + 40); g.clip();
        g.drawImage(c, cx - 65 * s + dx, cy - 103 * s, 130 * s, 206 * s); g.restore();
      }
      function wipe(c, j, pj, dx) { // the new coat behind the drum, the old coat ahead of it
        var xl = B.x0 - 60, xr = B.x1 + 60 + sh;
        if (j < 0) return;
        if (pj >= 1) { img(c[j], xl, fd && sh ? xd : xr, dx); return; }
        img(c[j], dn > 0 ? xl : xc, dn > 0 ? xc : xr, dx);
        if (j) img(c[j - 1], dn > 0 ? xc : xl, dn > 0 ? xr : xc, dx);
      }
      function drum(ink, x, d, roll) { // a ribbed cylinder: one strip of ink per rib, lit from the upper left
        var y0 = cy - 100 * s, h = 200 * s, D = TAU / 20, base = ((roll % D) + D) % D, a = -1.5708 - D + base, a0, a1, c, x0, x1;
        g.fillStyle = K.pat(ink, 0.22, g); g.fillRect(d > 0 ? x - R * 1.9 : x + R, y0 + 10 * s, R * 0.9, h - 20 * s);
        for (var j = 0; j < 12; j++, a += D) {
          a0 = Math.max(a, -1.5708); a1 = Math.min(a + D, 1.5708);
          if (a1 <= a0) continue;
          c = 0.2 + 0.68 * Math.pow(Math.max(0, Math.cos((a0 + a1) / 2 + 0.9)), 1.2);
          x0 = x + R * Math.sin(a0) + 0.5; x1 = x + R * Math.sin(a1) - 0.5;
          g.fillStyle = K.pat(ink, c, g); g.fillRect(x0, y0, x1 - x0, h);
        }
        g.fillStyle = K.pat(ink, 0.8, g); // the end flanges and the axle stubs
        g.fillRect(x - R * 1.15, y0 - 7 * s, R * 2.3, 7 * s); g.fillRect(x - R * 1.15, y0 + h, R * 2.3, 7 * s);
        g.fillRect(x - R * 0.24, y0 - 15 * s, R * 0.48, 8 * s); g.fillRect(x - R * 0.24, y0 + h + 7 * s, R * 0.48, 8 * s);
      }
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      var pj = kl % 2 ? 1 : p, ja = kl >= 1 ? Math.floor((kl - 1) / 2) : -1, pa = kl % 2 ? p : 1;
      wipe(st.L, kl >= 0 ? Math.floor(kl / 2) : -1, pj, sh);
      wipe(st.A, ja, pa, sh * 0.85);
      if (kl >= 0 && p > 0 && p < 1 && !(kl % 2)) {          // the wet ridge of ink at the drum's nip, where the L comes off it
        g.save(); g.beginPath(); for (i = 0; i < 6; i++) g[i ? "lineTo" : "moveTo"](cx + PT[i][0] * s, cy + PT[i][1] * s);
        g.closePath(); g.clip(); g.fillStyle = K.pat("light", 0.55, g); g.fillRect(xc - 6, cy - 100 * s, 6, 200 * s); g.restore();
      }
      if (kl >= 0 && p > 0 && p < 1) drum(kl % 2 ? "pop" : "loss", xc, dn, dn * (Math.abs(xc - (dn > 0 ? xa : xb)) / R));
      if (fd && e > T - 0.12) drum("loss", xe, -1, -((xb - xe) / R + sh / R));
      g.restore();
    }
  });
})();
