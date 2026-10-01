/* art/loss/woodtype.js: Wood Type. A fat slab L cut in wood zooms down onto the card inked solid, presses with a squash
   (ink squeezed past its edges), lifts away toward you and leaves the impression: the edges heavy, the middle starved,
   the end-grain rings carved through, a worn corner. The impression dries pale and is gone by dur.
   Beats: drop 0 to .075, press to tL (.1 to .34), lift .13 s, dry until the fade (it stretches), fade (.2 s, less in a short moment).
   Plates: loss face (prepped, grain), loss impression (4 drying levels); the rim, the squeeze, the key shadow and the lift
   are live K.pat strokes and fills (prep jobs must stay under about 8 ms: a destination-out stroke costs 0.25 ms each). */
(function () {
  "use strict";
  var W = 176, H = 220, OX = 14, OY = 10, CX = 89, CY = 110, BY = 210;
  // the glyph, 150 x 200: a Clarendon L (slab serifs, filleted). Start (6,0); [x, y] a line, [x, y, cx, cy] a quad.
  var G = [[98, 0], [98, 13], [88, 13], [78, 13, 78, 27], [78, 160], [84, 166, 78, 166], [120, 166], [130, 157, 130, 166],
    [130, 130], [150, 130], [150, 200], [6, 200], [6, 186], [22, 186], [30, 186, 30, 176], [30, 26], [30, 13, 22, 13], [6, 13], [6, 0]];

  // the glyph's outline as points, its edges wavering by amp px along the normal; nicks = worn bites [arc position, depth]
  function outline(K, amp, seed, nicks) {
    var r = K.rand(seed), a0 = r() * 6, a1 = r() * 6, P = [[6, 0]], S = [0], c = [6, 0], j, i, n, t, t1, q, x, y, s = 0, px = 6, py = 0;
    for (j = 0; j < G.length; j++) {
      q = G[j]; n = Math.max(2, Math.ceil(Math.hypot(q[0] - c[0], q[1] - c[1]) / 7));
      for (i = 1; i <= n; i++) {
        t = i / n; t1 = 1 - t;
        x = q.length > 2 ? t1 * t1 * c[0] + 2 * t * t1 * q[2] + t * t * q[0] : c[0] + (q[0] - c[0]) * t;
        y = q.length > 2 ? t1 * t1 * c[1] + 2 * t * t1 * q[3] + t * t * q[1] : c[1] + (q[1] - c[1]) * t;
        s += Math.hypot(x - px, y - py); px = x; py = y; P.push([x, y]); S.push(s);
      }
      c = [q[0], q[1]];
    }
    P.pop(); S.pop();
    var N = P.length, out = [];
    for (i = 0; i < N; i++) {
      var A = P[(i + N - 1) % N], B = P[(i + 1) % N], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, d = amp * (0.6 * Math.sin(S[i] * 0.09 + a0) + 0.4 * Math.sin(S[i] * 0.23 + a1));
      for (j = 0; j < nicks.length; j++) d -= nicks[j][1] * Math.exp(-Math.pow((S[i] - nicks[j][0]) / 9, 2));
      out.push([P[i][0] + dy / L * d, P[i][1] - dx / L * d]);
    }
    return out;
  }
  function path(g, pts, ox, oy) {
    g.beginPath();
    for (var i = 0; i < pts.length; i++) g.lineTo(pts[i][0] + ox, pts[i][1] + oy);
    g.closePath();
  }
  // The grain is its own violet plate, printed over the letter inside its outline at draw time: plank lines a little off the
  // vertical, uneven in width and depth, and a knot of rings. (Carving it out of each print cost 4 ms a job: canvas calls
  // cost 25 to 250 microseconds each at 4x, a gradient fill over the letter 4 ms, so the texture is built once.)
  function grainPlate(K, g) {
    var r = K.rand(77), x = OX - 2, w, k, kn = g.createRadialGradient(0, 0, 0, 0, 0, 30);
    while (x < OX + 154) {
      w = 1.3 + r() * r() * 3.4; g.fillStyle = K.tone(0.5 + 0.5 * r());
      g.fillRect(x, OY - 6, w, 110); g.fillRect(x + (r() - 0.5) * 2.6, OY + 104, w, 112);
      x += 4.5 + r() * r() * 11;
    }
    for (k = 0; k < 5; k++) { kn.addColorStop((2 + k * 5.4) / 30, K.tone(0)); kn.addColorStop((2 + k * 5.4) / 30, K.tone(0.95)); kn.addColorStop((3.5 + k * 5.4) / 30, K.tone(0.95)); kn.addColorStop((3.5 + k * 5.4) / 30, K.tone(0)); }
    g.translate(OX + 84, OY + 112); g.scale(1, 2.3); g.fillStyle = kn; g.fillRect(-30, -30, 60, 60);
  }

  T82ART.add("loss", "woodtype", {
    name: "Wood Type",
    by: "A fat wooden slab L presses down inked solid, lifts, and leaves the grainy impression, heavy at the edges, that dries pale.",
    prep: function (K) {
      var st = K.st, jobs;
      st.pts = outline(K, 1, 5, [[150, 4], [470, 3.5]]);
      st.rng = outline(K, 1.3, 9, []);
      jobs = [
        function () { st.P = K.plate(W, H, 6113); },
        function () { st.face = K.screen(st.P, "loss", function (g) { g.fillStyle = K.tone(0.93); path(g, st.pts, OX, OY); g.fill(); }); },
        function () { st.grn = K.screen(st.P, "night", function (g) { grainPlate(K, g); }); },
        function () {
          st.imp = K.levels(st.P, "loss", function (g, c) { g.fillStyle = K.tone(0.66 * c); path(g, st.pts, OX, OY); g.fill(); }, [1, 0.7, 0.46, 0.26]);
          jobs.push.apply(jobs, st.imp.jobs);
        }
      ];
      return jobs;
    },
    hit: function (K, E) {
      var B = K.box;
      K.spark({ x: B.cx + (E.seed % 2 ? 20 : -20), y: B.y1 - 10, n: 22, ink: function (q) { return q() < 0.25 ? "key" : "loss"; }, sp: [140, 420], r: [1.2, 3.6], life: [0.28, 0.3], grav: 1200, seed: E.seed, streak: true });
      K.flash(E.first ? 0.6 : 0.42);
      K.shake(Math.max(E.dur, 0.42), E.first ? 10 : 8);
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, B = K.box, w = Math.min(0.2, 0.3 * E.dur), f = e > E.dur - w ? Math.max(0, (E.dur - e) / w) : 1;
      if (!st.imp || !st.grn || f <= 0) return;
      var T = E.dur - w, q = Math.min(1, T / 0.3), s = K.clamp((B.y1 - B.y0) / 200, 0.45, 1.3), cx = B.cx, cy = (B.y0 + B.y1) / 2, by = cy + 100 * s, tilt = -0.05;
      var tc = Math.min(0.075, 0.28 * T), tL = Math.min(K.clamp(0.1 + 0.12 * E.dur, 0.1, 0.34), 0.62 * T), tl = Math.min(0.13, 0.42 * T), lu = K.clamp((e - tL) / tl, 0, 1);
      function put(can, ax, ay, sx, sy, rot, ox, oy) {
        g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
        g.translate(ax, ay); g.rotate(rot); g.scale(sx, sy); g.drawImage(can, -ox, -oy, W, H); g.restore();
      }
      function glyph(ax, ay, sx, sy, rot, gy) {       // the live ink, in glyph coordinates: the glyph's (75, gy) at (ax, ay)
        g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
        g.translate(ax, ay); g.rotate(rot); g.scale(sx, sy); g.translate(-75, -(gy || 200));
      }
      function grain(ax, ay, sx, sy, rot, gy) {       // the violet grain plate, printed inside the letter's outline
        glyph(ax, ay, sx, sy, rot, gy); path(g, st.pts, 0, 0); g.clip();
        g.translate(75, 100); g.rotate(-0.05); g.translate(-75, -100); g.drawImage(st.grn, -OX, -OY, W, H); g.restore();
      }
      if (e < tc) {                                   // the drop: the inked type comes down at you, speeding up
        var u = e / tc, z = 1.55 - 0.55 * u * u;
        put(st.face, cx, cy, z * s, z * s * 1.06, tilt + 0.05 * (1 - u), CX, CY); grain(cx, cy, z * s, z * s * 1.06, tilt + 0.05 * (1 - u), 100);
        return;
      }
      var dt = e - tc, k = dt < 0.045 * q ? 1 : Math.max(0, 1 - (dt - 0.045 * q) / (0.1 * q)), o = K.ease.out(dt / (0.1 * q));
      var lv = Math.min(3, Math.floor(K.smooth(tL + tl, E.dur - 0.05, e) * 4));
      if (lu > 0) {                                   // the key shadow: a crescent of the first miss, out past the edge
        glyph(cx, by, s, s, tilt); g.beginPath(); g.rect(-100, -100, 400, 400); path(g, st.pts, 0, 0); g.clip("evenodd");
        g.translate(5, 4); path(g, st.pts, 0, 0); g.fillStyle = K.pat("key", 0.7, g); g.fill(); g.restore();
      }
      var qx = lu > 0 ? 1 : 1 + 0.07 * k, qy = lu > 0 ? 1 : 1 - 0.08 * k;   // the block's squash while it presses: the rim squashes with it
      glyph(cx, by, s * qx * (lu > 0 ? 1 : 0.985 + 0.015 * o), s * qy * (lu > 0 ? 1 : 0.985 + 0.015 * o), tilt);   // the squeeze and the rim: ink pooled at the edge, half of it out past it, thinning as it dries
      path(g, st.rng, 0, 0); g.lineWidth = lu > 0 ? 10 : 11 * o; g.lineJoin = "round"; g.strokeStyle = K.pat("loss", 0.88 - 0.1 * lv, g); g.stroke(); g.restore();
      if (lu > 0) { put(st.imp.at(lv), cx, by, s, s, tilt, CX, BY); grain(cx, by, s, s, tilt); }
      if (lu === 0) { put(st.face, cx, by, (1 + 0.07 * k) * s, (1 - 0.08 * k) * s, tilt, CX, BY); grain(cx, by, (1 + 0.07 * k) * s, (1 - 0.08 * k) * s, tilt); return; }
      if (lu < 1) {                                   // the block, lifted toward you and away from the wound, its ink thinning out
        var l2 = lu * lu, zz = 1 + 0.5 * l2;
        glyph(cx, by + (E.y > B.cy ? -1 : 1) * 0.2 * B.size * l2, zz * s, zz * s, tilt - 0.12 * l2);
        path(g, st.pts, 0, 0); g.fillStyle = K.pat("loss", 0.88 - 0.55 * lu, g); g.fill(); g.restore();
      }
    }
  });
})();
