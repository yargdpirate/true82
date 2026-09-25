/* ---------- TRUE 82 LAB concept: the classic ball ----------
   A crisp basketball turned three quarters to the viewer: the seams are real
   curves on a sphere (two great circles and the two side circles of an eight
   panel ball), projected and tapered toward the edge so the ball reads round.
   A pink overprint warms the sunflower to orange, a halftone core shadow
   models the form, and two tapered spin arcs ride the shoulder. */
(function () {
  var R = window.RISO, PI = Math.PI;

  // rotation: yaw about y, then pitch about x, then roll about z (screen: x right, y down, z to the viewer)
  function rot(yaw, pitch, roll) {
    var a = Math.cos(yaw), b = Math.sin(yaw), c = Math.cos(pitch), d = Math.sin(pitch), e = Math.cos(roll), f = Math.sin(roll);
    var Ry = [[a, 0, b], [0, 1, 0], [-b, 0, a]], Rx = [[1, 0, 0], [0, c, -d], [0, d, c]], Rz = [[e, -f, 0], [f, e, 0], [0, 0, 1]];
    function mul(A, B) { var o = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], i, j, k; for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) for (k = 0; k < 3; k++) o[i][j] += A[i][k] * B[k][j]; return o; }
    return mul(Rz, mul(Rx, Ry));
  }
  function ap(M, v) { return [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]]; }
  // the eight panel seams on a unit sphere
  var SIDE = 0.6, RHO = Math.sqrt(1 - SIDE * SIDE);
  var CURVES = [
    function (t) { return [Math.cos(t), 0, Math.sin(t)]; },                       // equator
    function (t) { return [0, Math.cos(t), Math.sin(t)]; },                       // meridian
    function (t) { return [SIDE, RHO * Math.cos(t), RHO * Math.sin(t)]; },        // side circles
    function (t) { return [-SIDE, RHO * Math.cos(t), RHO * Math.sin(t)]; }
  ];
  // stroke the visible half of every seam, thinning toward the limb
  function seams(g, S, cx, cy, r, M, w) {
    var N = 140, i, k;
    for (k = 0; k < CURVES.length; k++) {
      var prev = ap(M, CURVES[k](0));
      for (i = 1; i <= N; i++) {
        var p = ap(M, CURVES[k](i / N * 2 * PI)), a = prev, b = p;
        prev = p;
        if (a[2] <= 0 && b[2] <= 0) continue;
        if (a[2] <= 0 || b[2] <= 0) {           // clip at the limb
          var u = a[2] / (a[2] - b[2]), m = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, 0];
          if (a[2] <= 0) a = m; else b = m;
        }
        var z = Math.max(0, (a[2] + b[2]) / 2), ww = w * (0.42 + 0.58 * Math.sqrt(z));
        g.beginPath(); g.moveTo(cx + a[0] * r, cy + a[1] * r); g.lineTo(cx + b[0] * r, cy + b[1] * r); S.stroke(g, ww);
      }
    }
  }
  // a tapered crescent riding a circle: from angle a0 to a1, inner radius ri, max thickness th
  function swoosh(g, cx, cy, ri, a0, a1, th) {
    var N = 40, i, t, a, T;
    g.beginPath();
    for (i = 0; i <= N; i++) { t = i / N; a = a0 + (a1 - a0) * t; T = th * Math.pow(Math.sin(PI * t), 0.8) * (0.55 + 0.45 * (1 - t)); var rr = ri + T; if (i) g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    for (i = N; i >= 0; i--) { t = i / N; a = a0 + (a1 - a0) * t; g.lineTo(cx + Math.cos(a) * ri, cy + Math.sin(a) * ri); }
    g.closePath();
  }

  var CX = 46, CY = 54, BR = 37, M = rot(-0.5, 0.42, -0.2);
  var FLAT = { flat: 1, stamp: 1, sticker: 1, cut: 1 };

  window.LAB.concept({
    id: "ball-classic", name: "Classic ball", blurb: "A crisp ball turned to the light: real seams, a spin arc and a halftone core shadow.",
    draw: function (K) {
      K.part("glow", function (g, S) {                    // the pink overprint that warms the ball to orange, and a faint aura
        R.circle(g, CX, CY, BR + 14); g.fillStyle = S.rad(g, CX, CY, BR, BR + 14, [[0, 0.24], [1, 0]]); g.fill();
        // heavier on the shadow side, so the turn of the ball goes warm, not green, where the shade ink lands
        if (S.style === "line" || S.style === "neon") return;
        R.circle(g, CX, CY, BR + 0.5); g.fillStyle = S.rad(g, CX - BR * 0.42, CY - BR * 0.46, 0, BR * 1.62, [[0, 0.36], [0.45, 0.5], [0.8, 0.8], [1, 0.86]]); g.fill();
      });
      K.part("body", function (g, S) { R.circle(g, CX, CY, BR); S.fill(g); });
      K.part("shade", function (g, S) {                   // light from the upper left; the core shadow sits inside the far edge
        if (FLAT[S.style]) {                              // the flat styles get a clean crescent instead of a ramp
          g.save(); R.circle(g, CX, CY, BR); g.clip();
          g.beginPath(); g.rect(CX - BR - 2, CY - BR - 2, 2 * BR + 4, 2 * BR + 4);
          g.arc(CX - BR * 0.2, CY - BR * 0.25, BR * 1.02, 0, 2 * PI, true);
          g.fillStyle = S.tone(1); S.fill(g); g.restore();
          return;
        }
        R.circle(g, CX, CY, BR);
        g.fillStyle = S.rad(g, CX - BR * 0.42, CY - BR * 0.46, 0, BR * 1.62, [[0, 0], [0.34, 0.02], [0.56, 0.26], [0.76, 0.78], [0.9, 0.6], [1, 0.48]]);
        S.fill(g);
      });
      K.part("line", function (g, S) {
        seams(g, S, CX, CY, BR, M, 4.2);
        R.circle(g, CX, CY, BR); S.stroke(g, 3.6);
      });
      K.part("accent", function (g, S) {                  // spin arcs over the shoulder
        swoosh(g, CX, CY, BR + 5.5, -PI * 0.62, -PI * 0.05, 5.2); S.fill(g);
        swoosh(g, CX, CY, BR + 13, -PI * 0.5, -PI * 0.16, 3.6); S.fill(g);
      });
    }
  });
})();
