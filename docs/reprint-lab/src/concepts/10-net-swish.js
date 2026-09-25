/* ---------- TRUE 82 LAB concept: the swish ----------
   The net a split second after a perfect shot: the rim seen from a little
   above, the net pinched at the waist and its skirt flaring out as the ball
   drops clean through. The net is a real tube of cords: a diamond lattice
   wrapped on a surface of revolution, so the strands bunch at the edges and
   the back of the net shows through the front in a lighter ink. A few tapered
   motion lines give it the snap. */
(function () {
  var R = window.RISO, PI = Math.PI;

  var CX = 50, RIM_Y = 19, RIM_R = 36, E = 0.23, TUBE = 6.4;   // rim: center, radius, ellipse ratio, tube thickness
  // the net's profile: radius and height along t (0 at the rim, 1 at the bottom), a cubic in (r, y)
  var PR = [[33.5, 21], [17, 44], [12, 63], [34, 82]];
  function bez(p, t) { var u = 1 - t; return u * u * u * p[0] + 3 * u * u * t * p[1] + 3 * u * t * t * p[2] + t * t * t * p[3]; }
  // the skirt swings to the right and its right side kicks up (tilt), the whip of the swish
  function prof(t) { return { r: bez([PR[0][0], PR[1][0], PR[2][0], PR[3][0]], t), y: bez([PR[0][1], PR[1][1], PR[2][1], PR[3][1]], t), cx: CX + 8 * Math.pow(t, 2.2), tilt: -0.3 * Math.pow(t, 3) }; }
  // a point on the net: phi around the tube (0 faces the viewer), t down its length
  function pt(phi, t) { var p = prof(t); return [p.cx + p.r * Math.sin(phi), p.y + E * p.r * Math.cos(phi) + p.tilt * p.r * Math.sin(phi)]; }

  var N = 12, TW = 5.5 * PI / N;                               // strands per family; the twist makes the two families meet at the bottom
  // stroke one family of strands; side: +1 front, -1 back. Cords thin as they turn away round the tube,
  // so the net reads round instead of piling up in blobs at its edges.
  function strands(g, S, side, w, sign) {
    var M = 60, i, k;
    for (i = 0; i < N; i++) {
      var p0 = (i + (sign > 0 ? 0 : 0.5)) / N * 2 * PI, prev = null;
      for (k = 0; k <= M; k++) {
        var t = k / M, phi = p0 + sign * TW * t, c = Math.cos(phi) * side, q = pt(phi, t);
        if (prev && c > -0.02 && prev.c > -0.02) {
          var cc = Math.max(0, (c + prev.c) / 2);
          g.beginPath(); g.moveTo(prev.q[0], prev.q[1]); g.lineTo(q[0], q[1]); S.stroke(g, w * (0.5 + 0.5 * Math.sqrt(cc)));
        }
        prev = { q: q, c: c };
      }
    }
  }
  function bottomEdge(g, side) {                               // the loops along the bottom of the net
    var M = 48, k, run = false;
    for (k = 0; k <= M; k++) {
      var phi = -PI + k / M * 2 * PI, q = pt(phi, 1), vis = Math.cos(phi) * side >= -0.02;
      if (vis) { if (run) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); run = true; } else run = false;
    }
  }
  function netOutline(g) {                                     // the net's silhouette, for its tone
    var M = 40, k, p;
    g.beginPath();
    for (k = 0; k <= M; k++) { p = pt(-PI / 2, k / M); if (k) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
    for (k = 0; k <= 24; k++) { var q = pt(-PI / 2 + k / 24 * PI, 1); g.lineTo(q[0], q[1]); }
    for (k = M; k >= 0; k--) { p = pt(PI / 2, k / M); g.lineTo(p[0], p[1]); }
    g.closePath();
  }
  function ring(g) {                                           // the rim: a tube of even width seen from above
    g.beginPath();
    g.ellipse(CX, RIM_Y, RIM_R + TUBE / 2, E * RIM_R + TUBE / 2, 0, 0, 2 * PI);
    g.moveTo(CX + RIM_R - TUBE / 2, RIM_Y);
    g.ellipse(CX, RIM_Y, RIM_R - TUBE / 2, Math.max(0.5, E * RIM_R - TUBE / 2), 0, 2 * PI, 0, true);
  }
  function rimFront(g) {                                       // the near half of the rim, which hides the net's top
    g.beginPath();
    g.ellipse(CX, RIM_Y, RIM_R + TUBE / 2 + 0.6, E * RIM_R + TUBE / 2 + 0.6, 0, 0, PI);
    g.ellipse(CX, RIM_Y, RIM_R - TUBE / 2 - 0.6, Math.max(0.5, E * RIM_R - TUBE / 2 - 0.6), 0, PI, 0, true);
    g.closePath();
  }
  // a tapered motion line along a quadratic curve: thick at the start, a point at the end
  function taper(g, x0, y0, cx, cy, x1, y1, w) {
    var M = 18, i, L = [], Rr = [];
    for (i = 0; i <= M; i++) {
      var t = i / M, u = 1 - t;
      var x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1;
      var dx = 2 * u * (cx - x0) + 2 * t * (x1 - cx), dy = 2 * u * (cy - y0) + 2 * t * (y1 - cy), d = Math.sqrt(dx * dx + dy * dy) || 1;
      var hw = w / 2 * Math.pow(1 - t, 0.9) * (0.35 + 0.65 * Math.min(1, t * 5 + 0.2));
      L.push([x - dy / d * hw, y + dx / d * hw]); Rr.push([x + dy / d * hw, y - dx / d * hw]);
    }
    g.beginPath(); g.moveTo(L[0][0], L[0][1]);
    for (i = 1; i <= M; i++) g.lineTo(L[i][0], L[i][1]);
    for (i = M; i >= 0; i--) g.lineTo(Rr[i][0], Rr[i][1]);
    g.closePath();
  }

  window.LAB.concept({
    id: "net-swish", name: "Swish", blurb: "The net a split second after a perfect shot, cords flaring. The sound of 82-0.",
    draw: function (K) {
      K.part("glow", function (g, S) {                        // the pop: light bursting out of the net's skirt
        R.ellipse(g, CX + 2, 52, 60, 58);
        g.fillStyle = S.rad(g, CX + 2, 52, 10, 58, [[0, 0.34], [0.5, 0.16], [1, 0]]); g.fill();
      });
      K.part("shade", function (g, S) {
        // the inside of the net: darkest under the rim, lifting toward the skirt
        netOutline(g); g.fillStyle = S.lin(g, 0, 22, 0, 92, [[0, 0.46], [0.35, 0.2], [0.7, 0.08], [1, 0.02]]); S.fill(g);
        // the back of the net, seen through the front
        strands(g, S, -1, 1.7, 1); strands(g, S, -1, 1.7, -1);
        if (S.mode !== "sil") R.knock(g, function (g2) { ring(g2); g2.fill(); });
      });
      K.part("line", function (g, S) {
        strands(g, S, 1, 2.5, 1); strands(g, S, 1, 2.5, -1);
        if (S.mode !== "sil") R.knock(g, function (g2) { rimFront(g2); g2.fill(); });
        ring(g); S.stroke(g, 2.2);
      });
      K.part("body", function (g, S) { ring(g); S.fill(g); });
      K.part("accent", function (g, S) {                      // motion lines riding off the flare
        taper(g, 29, 46, 20, 62, 21, 82, 5); S.fill(g);
        taper(g, 19, 51, 11, 65, 12, 81, 4); S.fill(g);
        taper(g, 11, 57, 4, 67, 5, 78, 3); S.fill(g);
      });
    }
  });
})();
