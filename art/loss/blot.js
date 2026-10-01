/* art/loss/blot.js: Ink Blot. A fat glob of pink ink is flung in from the upper left (a smeared ellipse) and splats on
   the card as a blot in the shape of an L: its contour wobbles like a wet edge, ragged fingers (longest on the side
   it was thrown toward) shoot out of it with beads on their tips, and a spatter of satellite drops (a few aqua) lands
   around it in a ring. The ink bleeds into the paper: halftone bands of falling coverage creep out from the edge and
   an aqua plate sits off register. It dries like a coffee ring: the core thins to dust while a heavy rim holds the L.
   Then the blot sinks into the card (the rim thins, the drops shrink away). All live K.pat fills, no prep.
   Beats (x k for a short moment): throw 0 to .045, splat .045 to .12, bleed to .6; the soak runs from mid-hold,
   the sink takes the last .12 to .38 s. */
(function () {
  "use strict";
  var PI = Math.PI, TAU = PI * 2, DX = 0.62, DY = 0.78;                  // the throw's direction (toward the lower right)
  function shape(K) {                                   // the L's outline as samples every .02 H, with smoothed outward normals and wobble
    var r = K.rand(8113), P = [[-0.32, -0.5], [-0.05, -0.5], [-0.05, 0.27], [0.34, 0.27], [0.34, 0.5], [-0.32, 0.5]], S = [], i, j, n, a, b, l, q, m, v;
    for (i = 0; i < 6; i++) {
      a = P[i]; b = P[(i + 1) % 6]; l = Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1])); n = Math.round(l / 0.02);
      for (j = 0; j < n; j++) S.push({ x: a[0] + (b[0] - a[0]) * j / n, y: a[1] + (b[1] - a[1]) * j / n, nx: (b[1] - a[1]) / l, ny: -(b[0] - a[0]) / l });
    }
    n = S.length;
    for (q = 0; q < 3; q++) {                           // smooth the normals over a few samples: soft corners, no hair
      m = S.map(function (s, k) { var u = S[(k + n - 2) % n], w = S[(k + 2) % n], x = u.nx + s.nx * 2 + w.nx, y = u.ny + s.ny * 2 + w.ny, d = Math.sqrt(x * x + y * y) || 1; return [x / d, y / d]; });
      for (i = 0; i < n; i++) { S[i].nx = m[i][0]; S[i].ny = m[i][1]; }
    }
    var f1 = r() * TAU, f2 = r() * TAU, nz = [];
    for (i = 0; i < n; i++) nz.push(r() - 0.5);
    for (i = 0; i < n; i++) {
      v = (nz[(i + n - 2) % n] + nz[(i + n - 1) % n] + nz[i] + nz[(i + 1) % n] + nz[(i + 2) % n]) / 5;
      S[i].w = 0.014 * Math.sin(i / n * TAU * 6 + f1) + 0.009 * Math.sin(i / n * TAU * 17 + f2) + 0.04 * v;
    }
    var F = [], used = [], t, ok, k;                    // the fingers: where they stand, which way, how long, whether they carry a bead
    for (t = 0; t < 60 && F.length < 12; t++) {
      i = Math.floor(r() * n); ok = true;
      for (k = 0; k < used.length; k++) if (Math.min(Math.abs(used[k] - i), n - Math.abs(used[k] - i)) < 9) ok = false;
      if (!ok) continue;
      used.push(i); a = Math.atan2(S[i].ny, S[i].nx) + (r() - 0.5) * 0.7;
      v = Math.cos(a) * DX + Math.sin(a) * DY;
      F.push({ i: i, dx: Math.cos(a), dy: Math.sin(a), l: (0.05 + 0.13 * r()) * (1 + 0.9 * Math.max(0, v)), hw: 0.022 + 0.022 * r(), br: 0.016 + 0.02 * r() });
    }
    return { S: S, F: F };
  }
  function ring(g, S, H, sc, off, gw) {                 // one closed contour of the blot, grown by off (H) along the normals, scaled about the middle
    for (var i = 0; i < S.length; i++) g[i ? "lineTo" : "moveTo"]((S[i].x + S[i].nx * (S[i].w * gw + off)) * H * sc, (S[i].y + S[i].ny * (S[i].w * gw + off)) * H * sc);
    g.closePath();
  }
  T82ART.add("loss", "blot", {
    name: "Ink Blot",
    by: "A glob of pink ink is flung from the upper left and splats into an L-shaped blot: ragged beaded fingers, a ring of satellite drops, halftone bleed creeping into the paper off an off-register aqua plate; it dries as a coffee ring (a thin core, a heavy rim) and sinks into the card.",
    hit: function (K, E) {
      var B = K.box, H = B.y1 - B.y0, k = K.clamp(E.dur / 0.9, 0.36, 1), y = (B.y0 + B.y1) / 2;
      K.flash(E.first ? 0.55 : 0.4); K.shake(Math.max(E.dur, 0.4), E.first ? 11 : 8);
      K.ring({ x: B.cx, y: y, delay: 0.045 * k, dur: 0.36, r0: 10, r1: 0.85 * H, w0: 8, ink: "loss", cov: 0.8 });
      K.ring({ x: B.cx, y: y, delay: 0.07 * k, dur: 0.4, r0: 6, r1: 1.0 * H, w0: 4, ink: "pop", cov: 0.6 });
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, f = K.fade(E, e), H = B.y1 - B.y0, c = K.clamp, i, j, p, a, F, S;
      if (f <= 0) return;
      if (!st.b) st.b = shape(K);
      S = st.b.S; F = st.b.F;
      var k = c(E.dur / 0.9, 0.36, 1), tT = 0.045 * k, X = Math.min(0.38, Math.max(0.12, 0.3 * E.dur)), tE = Math.max(E.dur - X, tT + 0.2);
      var tS = tT + 0.12 + 0.5 * (tE - tT - 0.12), u = c((e - tE) / X, 0, 1), u2 = u * u, soak = K.smooth(tS, tE, e);
      var gb = K.ease.back(c((e - tT) / (0.07 * k), 0, 1)), gf = K.ease.out(c((e - tT - 0.01) / (0.08 * k), 0, 1)), sc = (0.4 + 0.6 * gb) * (1 - 0.05 * u2);
      var spread = 1 + 0.5 * K.ease.out(c((e - tT) / 0.6, 0, 1)), cx = B.cx, cy = (B.y0 + B.y1) / 2, r = K.rand(E.seed ^ 0x6b17);
      g.save(); g.beginPath(); g.rect(0, K.top, K.w, K.h - K.top); g.clip();
      g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      g.translate(cx, cy);
      if (e < tT + 0.005) {                              // the throw: a smeared glob, and the drops it sheds behind it
        p = c(e / tT, 0, 1); a = -1.4 * H * (1 - p * p);
        g.save(); g.translate(DX * a, DY * a); g.rotate(Math.atan2(DY, DX)); g.beginPath(); g.ellipse(0, 0, 0.3 * H, 0.1 * H, 0, 0, TAU);
        for (i = 1; i < 4; i++) { g.moveTo(-0.3 * H - i * 0.14 * H + 0.03 * H, 0); g.arc(-0.3 * H - i * 0.14 * H, (i % 2 ? 1 : -1) * 0.03 * H, 0.025 * H, 0, TAU); }
        g.fillStyle = K.pat("loss", 0.84, g); g.fill(); g.restore();
      }
      if (e >= tT) {
        g.save(); g.beginPath(); g.rect(-K.w, -K.h, 2 * K.w, 2 * K.h); ring(g, S, H, sc, 0, gf); g.clip("evenodd");   // the aqua plate, off register: only where the blot is not
        g.translate(0.045 * H, -0.035 * H); g.beginPath(); ring(g, S, H, sc, 0, gf);
        g.fillStyle = K.pat("pop", 0.62 * (1 - 0.6 * soak) * (1 - u2), g); g.fill(); g.restore();
        var bands = [[0.0, 0.025, 0.62], [0.025, 0.05, 0.44], [0.05, 0.08, 0.31], [0.08, 0.115, 0.19]];
        if (e > tT + 0.06 * k) for (i = 0; i < 4; i++) {   // the bleed: rings of falling coverage creeping into the paper
          g.beginPath(); ring(g, S, H, sc, bands[i][1] * spread, gf); ring(g, S, H, sc, bands[i][0] * spread, gf);
          g.fillStyle = K.pat("loss", bands[i][2] * (1 - u2), g); g.fill("evenodd");
        }
        g.beginPath(); ring(g, S, H, sc, 0, gf); ring(g, S, H, sc, -0.07 - 0.03 * u2, gf);   // the rim
        g.fillStyle = K.pat("loss", 0.88 * (1 - 0.9 * u2), g); g.fill("evenodd");
        g.beginPath(); ring(g, S, H, sc, -0.07 - 0.03 * u2, gf);                              // the core, drying to dust
        g.fillStyle = K.pat("loss", Math.max(0.1, 0.84 * (1 - 0.88 * soak)) * (1 - u2), g); g.fill();
        g.beginPath();                                   // fingers with beads, and the spatter ring: all one pink path, the last few drops aqua
        for (i = 0; i < F.length; i++) {
          var s = S[F[i].i], b0x = (s.x + s.nx * s.w) * H * sc, b0y = (s.y + s.ny * s.w) * H * sc, l = F[i].l * H * gf * (1 - u2), hw = F[i].hw * H, tx = b0x + F[i].dx * l, ty = b0y + F[i].dy * l;
          var ax = b0x - F[i].dy * hw, ay = b0y + F[i].dx * hw, bx = b0x + F[i].dy * hw, by = b0y - F[i].dx * hw;
          if ((tx - ax) * (by - ay) - (ty - ay) * (bx - ax) < 0) { p = ax; ax = bx; bx = p; p = ay; ay = by; by = p; }
          g.moveTo(ax, ay); g.lineTo(tx, ty); g.lineTo(bx, by); g.closePath();
          if (F[i].l > 0.1) { var br = F[i].br * H * gf * (1 - u2), px = tx + F[i].dx * (br + 0.014 * H), py = ty + F[i].dy * (br + 0.014 * H); g.moveTo(px + br, py); g.arc(px, py, br, 0, TAU); }
        }
        var ap = [];
        for (j = 0; j < 30; j++) {                       // satellites: thrown out on rays, biggest near the blot, landing in the first .13 s
          var an = r() * TAU, R = (0.42 + 0.5 * r() * r() + 0.1 * r()) * H, t0 = tT + (0.01 + 0.07 * r()) * k, off = tS + r() * (tE - tS + X * 0.7), rd = H * (0.007 + 0.034 * Math.pow(1 - (R / H - 0.4) / 0.62, 2) * r());
          var bias = 1 + 0.35 * (Math.cos(an) * DX + Math.sin(an) * DY);
          if (e < t0) continue;
          var q = K.ease.out(c((e - t0) / (0.07 * k), 0, 1)), sx = Math.cos(an) * R * bias * q, sy = Math.sin(an) * R * bias * q, rr = rd * (1 - c((e - off) / 0.25, 0, 1));
          sx = c(sx, -cx + 5, K.w - cx - 5); if (rr < 0.4) continue;
          if (j % 5 === 4) ap.push([sx, sy, rr]); else { g.moveTo(sx + rr, sy); g.arc(sx, sy, rr, 0, TAU); }
        }
        g.fillStyle = K.pat("loss", 0.84, g); g.fill();
        if (ap.length) { g.beginPath(); for (i = 0; i < ap.length; i++) { g.moveTo(ap[i][0] + ap[i][2], ap[i][1]); g.arc(ap[i][0], ap[i][1], ap[i][2], 0, TAU); } g.fillStyle = K.pat("pop", 0.72, g); g.fill(); }
      }
      g.restore();
    }
  });
})();
