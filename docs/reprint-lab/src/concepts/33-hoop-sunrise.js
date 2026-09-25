/* ---------- TRUE 82 LAB concept: hoop sunrise ----------
   The rim, seen straight on, is the horizon. The ball comes up through it
   like the sun: the top half in open sky with a fan of rays, the bottom half
   seen through the net. The rim's back edge passes behind the ball and its
   front edge in front, so the ball is really going through. */
(function () {
  var R = window.RISO, PI = Math.PI;
  var BX = 50, BY = 50, BR = 25;                   // the ball
  var RX = 50, RY = 57, RRX = 41, RRY = 6.2;       // the rim ellipse
  var NB = 95, NTL = RX - RRX + 3, NTR = RX + RRX - 3, NBL = 31, NBR = 69; // the net

  function la(S) { return S.style === "line" || S.style === "neon"; }
  function flatish(S) { return S.style === "flat" || S.style === "stamp" || S.style === "sticker" || S.style === "cut"; }
  function ball(g) { R.circle(g, BX, BY, BR); }
  function rays(g, r0, r1) {                         // a fan of wedges over the horizon
    var n = 9, i, a0, a1, span = PI / n;
    g.beginPath();
    for (i = 0; i < n; i++) {
      var a = PI + span * (i + 0.5), w = span * 0.29;
      a0 = a - w; a1 = a + w;
      g.moveTo(BX + Math.cos(a0) * r0, BY + Math.sin(a0) * r0);
      g.lineTo(BX + Math.cos(a0) * r1, BY + Math.sin(a0) * r1);
      g.arc(BX, BY, r1, a0, a1);
      g.lineTo(BX + Math.cos(a1) * r0, BY + Math.sin(a1) * r0);
      g.arc(BX, BY, r0, a1, a0, true);
      g.closePath();
    }
  }
  function netLx(y) { var t = (y - RY) / (NB - RY); return NTL + (NBL - NTL) * Math.pow(t, 0.8); }
  function netRx(y) { var t = (y - RY) / (NB - RY); return NTR + (NBR - NTR) * Math.pow(t, 0.8); }
  function netShape(g) {
    g.beginPath(); g.moveTo(NTL, RY);
    for (var k = 1; k <= 16; k++) { var y = RY + (NB - RY) * k / 16; g.lineTo(netLx(y), y); }
    for (k = 16; k >= 0; k--) { var y2 = RY + (NB - RY) * k / 16; g.lineTo(netRx(y2), y2); }
    g.closePath();
  }
  function netLines(g) {
    // a diamond lattice: strands leaning each way from the rim, crossing in the middle, ending in little loops
    var n = 5, i, k, steps = 12;
    function pt(u, t) { var y = RY + 3 + (NB - RY - 3) * t; return [netLx(y) + (netRx(y) - netLx(y)) * u, y]; }
    g.beginPath();
    for (i = 0; i <= n; i++) {
      for (var dir = -1; dir <= 1; dir += 2) {
        var u0 = i / n, started = false;
        for (k = 0; k <= steps; k++) {
          var t = k / steps, u = u0 + dir * t * (1 / n) * 2;
          if (u < -0.001 || u > 1.001) break;
          var p = pt(u, t);
          if (started) g.lineTo(p[0], p[1]); else { g.moveTo(p[0], p[1]); started = true; }
        }
      }
    }
    for (i = 0; i < n; i++) {                        // the bottom loops, sagging between the strands
      var a = pt(i / n, 1), b = pt((i + 1) / n, 1);
      g.moveTo(a[0], a[1]); g.quadraticCurveTo((a[0] + b[0]) / 2, NB + 3, b[0], b[1]);
    }
  }
  function rimBack(g) { g.beginPath(); g.ellipse(RX, RY, RRX, RRY, 0, PI, 2 * PI); }
  function rimFront(g) { g.beginPath(); g.ellipse(RX, RY, RRX, RRY, 0, 0, PI); }

  window.LAB.concept({
    id: "hoop-sunrise", name: "Hoop sunrise", blurb: "The rim is the horizon: a ball sun rises through the net under a fan of rays.",
    draw: function (K) {
      K.part("glow", function (g, S) {                  // the rays, fading out into the sky
        g.save(); g.beginPath(); g.rect(-30, -30, 160, RY - 1 + 30); g.clip();
        rays(g, BR + 5, BR + 31);
        g.fillStyle = S.rad(g, BX, BY, BR + 5, BR + 31, flatish(S) ? [[0, 1], [1, 1]] : [[0, 1], [0.55, 0.7], [1, 0.08]]); S.fill(g);
        if (!la(S)) { R.circle(g, BX, BY, BR + 5); g.fillStyle = S.rad(g, BX, BY, BR, BR + 5, [[0, 0.5], [1, 0.15]]); g.fill(); }
        g.restore();
      });
      K.part("shade", function (g, S) {                 // the inside of the net, deep at the rim
        netShape(g); g.fillStyle = S.lin(g, 0, RY, 0, NB, [[0, 0.5], [1, 0.1]]); S.fill(g);
      });
      K.part("line", function (g, S) { rimBack(g); S.stroke(g, 3.6); });
      K.part("paper", function (g, S) {                 // inks are see-through: clear the ball's place so the back rim hides behind it
        ball(g); g.fill();
      });
      K.part("body", function (g, S) { ball(g); S.fill(g); });
      K.part("glow", function (g, S) {                  // the pink warms the sun where it's low
        if (la(S)) return;
        ball(g); g.fillStyle = S.lin(g, 0, BY - BR, 0, BY + BR, [[0, 0.04], [0.45, 0.3], [0.62, 0.62], [1, 0.9]]); g.fill();
      });
      K.part("shade", function (g, S) {                 // the half inside the net falls to shadow
        g.save(); ball(g); g.clip();
        g.beginPath(); g.rect(0, RY, 100, 50); g.fillStyle = S.lin(g, 0, RY, 0, BY + BR, [[0, 0.34], [1, 0.12]]); S.fill(g);
        g.restore();
      });
      K.part("paper", function (g, S) {                 // seams cut to paper, like the results sun
        if (la(S)) return;
        g.save(); ball(g); g.clip(); g.lineWidth = 2.8; g.lineCap = "round"; R.seam(g, BX, BY, BR, 0.32); g.stroke(); g.restore();
      });
      K.part("line", function (g, S) {
        if (la(S)) { g.save(); ball(g); g.clip(); R.seam(g, BX, BY, BR, 0.32); S.stroke(g, 2.2); g.restore(); ball(g); S.stroke(g, 2.4); }
        netLines(g); S.stroke(g, 1.9);
        rimFront(g); S.stroke(g, 4.2);
        // the rim's two ends, a touch heavier where it bends away
        R.ellipse(g, RX - RRX + 0.6, RY, 2.3, 2.6); S.fill(g); R.ellipse(g, RX + RRX - 0.6, RY, 2.3, 2.6); S.fill(g);
      });
    }
  });
})();
