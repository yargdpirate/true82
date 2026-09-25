/* ---------- TRUE 82 LAB concept: the comet ----------
   A ball near the top of its arc, dragging three racing stripes behind it
   in three inks. The stripes follow the flight path, taper to nothing and
   break down into halftone dots as they fade, so the trail is made of the
   print itself. Flat styles break the stripes into dashes instead. */
(function () {
  var R = window.RISO, PI = Math.PI;
  var BX = 68, BY = 31, BR = 21;                   // the ball, at the head
  // the flight path, head to tail: a quadratic that steepens toward the tail
  var H = [BX, BY], C = [34, 40], T = [3, 97];
  function at(t) { var u = 1 - t; return [u * u * H[0] + 2 * u * t * C[0] + t * t * T[0], u * u * H[1] + 2 * u * t * C[1] + t * t * T[1]]; }
  function nrm(t) {                                // unit normal, pointing up and left of the path
    var u = 1 - t, dx = 2 * u * (C[0] - H[0]) + 2 * t * (T[0] - C[0]), dy = 2 * u * (C[1] - H[1]) + 2 * t * (T[1] - C[1]), L = Math.sqrt(dx * dx + dy * dy);
    return [dy / L, -dx / L];
  }
  // one stripe: the band between offsets d0 and d1 (in ball radii), from t0 to t1, tapering to the tail
  var STRIPES = [[-0.98, -0.4], [-0.3, 0.3], [0.4, 0.98]];
  function taper(t) { return Math.max(0, 1 - Math.pow(t, 1.6)); }
  function band(g, d0, d1, t0, t1) {
    var N = 36, i, t, p = at(t0), n = nrm(t0), w = taper(t0) * BR;
    g.moveTo(p[0] + n[0] * d0 * w, p[1] + n[1] * d0 * w);
    for (i = 0; i <= N; i++) { t = t0 + (t1 - t0) * i / N; p = at(t); n = nrm(t); w = taper(t) * BR; g.lineTo(p[0] + n[0] * d1 * w, p[1] + n[1] * d1 * w); }
    for (i = N; i >= 0; i--) { t = t0 + (t1 - t0) * i / N; p = at(t); n = nrm(t); w = taper(t) * BR; g.lineTo(p[0] + n[0] * d0 * w, p[1] + n[1] * d0 * w); }
    g.closePath();
  }
  function flatish(S) { return S.style === "flat" || S.style === "stamp" || S.style === "sticker" || S.style === "cut"; }
  function la(S) { return S.style === "line" || S.style === "neon"; }
  var DASH = [[0, 0.34], [0.4, 0.53], [0.59, 0.67], [0.73, 0.78], [0.83, 0.86]];
  function stripe(g, S, k) {
    var s = STRIPES[k];
    g.beginPath();
    if (S.mode === "sil") { band(g, s[0], s[1], 0, 0.3); S.fill(g); return; }
    if (la(S)) {                                   // line art: each stripe becomes one speed line down its middle
      var m = (s[0] + s[1]) / 2, i, t, p, n, w;
      for (i = 0; i <= 30; i++) { t = 0.2 + 0.62 * i / 30 - k * 0.04; p = at(t); n = nrm(t); w = taper(t) * BR * m; if (i) g.lineTo(p[0] + n[0] * w, p[1] + n[1] * w); else g.moveTo(p[0] + n[0] * w, p[1] + n[1] * w); }
      S.stroke(g, 2.6);
      return;
    }
    if (flatish(S)) DASH.forEach(function (d, j) { if (k === 1 || j < 4) band(g, s[0], s[1], d[0] + k * 0.02, d[1] + k * 0.02); });
    else band(g, s[0], s[1], 0, 0.96);
    g.fillStyle = S.lin(g, H[0], H[1], T[0], T[1], [[0, 1], [0.22, 0.95], [0.55, 0.5], [0.85, 0.12], [1, 0]]);
    S.fill(g);
  }
  function ball(g) { R.circle(g, BX, BY, BR); }

  window.LAB.concept({
    id: "comet", name: "Comet", blurb: "A ball at the top of its arc, three racing stripes breaking into halftone behind it.",
    draw: function (K) {
      K.part("glow", function (g, S) {                  // the top stripe, and the coma around the head
        stripe(g, S, 0);
        if (!la(S)) { R.circle(g, BX, BY, BR + 10); g.fillStyle = S.rad(g, BX + 4, BY - 3, BR, BR + 10, [[0, 0.55], [1, 0]]); g.fill(); }
      });
      K.part("body", function (g, S) { stripe(g, S, 1); });
      K.part("accent", function (g, S) { stripe(g, S, 2); });
      K.part("paper", function (g, S) {                 // a clean gap between the head and its trail
        if (la(S)) return;
        R.circle(g, BX, BY, BR + 2.4); g.fill();
      });
      K.part("body", function (g, S) { g.fillStyle = S.tone(1); ball(g); S.fill(g); });
      K.part("glow", function (g, S) {                  // pink over the sunflower warms the ball to orange
        if (la(S)) return;
        ball(g); g.fillStyle = S.rad(g, BX + 6, BY - 8, 3, BR * 1.35, [[0, 0.15], [1, 0.7]]); g.fill();
      });
      K.part("shade", function (g, S) {                 // lit from the front of its flight; the trailing side falls off
        ball(g); g.fillStyle = S.lin(g, BX + BR * 0.6, BY - BR * 0.6, BX - BR * 0.8, BY + BR * 0.8, [[0, 0], [0.45, 0.06], [0.75, 0.42], [1, 0.7]]); S.fill(g);
      });
      K.part("line", function (g, S) {
        g.save(); ball(g); g.clip();
        R.seam(g, BX, BY, BR, 0.62); S.stroke(g, 2.8);
        g.restore();
        ball(g); S.stroke(g, 3);
      });
    }
  });
})();
