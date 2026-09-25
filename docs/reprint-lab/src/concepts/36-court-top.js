/* ---------- TRUE 82 LAB concept: the half court ----------
   A half court from above, drawn like a coach's clipboard and printed flat:
   the floor in the accent ink, the painted key and center circle in the glow
   ink (the floor is cleared under them so they print clean), every court
   line cut to paper, and the ball in the air at the wing with its halftone
   shadow on the floor and a dashed shot line dropping into the rim. */
(function () {
  var R = window.RISO, PI = Math.PI;
  var X0 = 6, Y0 = 6, X1 = 94, Y1 = 94, CXc = 50;  // the court
  var FT = 1.76;                                   // units per foot across the 50 ft width
  var HY = Y1 - 5.25 * FT, BBY = Y1 - 4 * FT;      // the hoop and the backboard
  var KW = 16 * FT, KY = Y1 - 19 * FT, FR = 6 * FT; // the key and the free throw circle
  var TR = 23.75 * FT, CX3 = 3 * FT;               // the three point arc and its corner lines
  var BX = 28, BY = 31, BR = 12.5;                 // the ball, up in the air at the wing
  function la(S) { return S.style === "line" || S.style === "neon"; }

  function court(g) { R.roundRect(g, X0, Y0, X1 - X0, Y1 - Y0, 5); }
  function key(g) { g.beginPath(); g.rect(CXc - KW / 2, KY, KW, Y1 - KY); }
  function courtLines(g) {
    var cy = Math.sqrt(TR * TR - (CXc - X0 - CX3) * (CXc - X0 - CX3)), a = Math.atan2(-cy, -(CXc - X0 - CX3));
    g.beginPath();
    // key and free throw circle
    g.rect(CXc - KW / 2, KY, KW, Y1 - KY);
    g.moveTo(CXc + FR, KY); g.arc(CXc, KY, FR, 0, -PI, true);
    // the three: corner lines and the arc
    g.moveTo(X0 + CX3, Y1); g.lineTo(X0 + CX3, HY - cy);
    g.arc(CXc, HY, TR, a, -PI - a, false);
    g.lineTo(X1 - CX3, Y1);
    // the center circle, cut in half by the half court line
    g.moveTo(CXc + FR, Y0); g.arc(CXc, Y0, FR, 0, PI, false);
  }
  function shot(g) {                                // the ball's flight into the rim
    g.beginPath(); g.moveTo(BX + 9, BY + 8); g.quadraticCurveTo(62, 30, CXc + 0.6, HY - 4.5);
  }
  function ball(g) { R.circle(g, BX, BY, BR); }

  window.LAB.concept({
    id: "court-top", name: "Half court", blurb: "The half court from above, flat as a clipboard: paper lines, a painted key, a ball at the wing.",
    draw: function (K) {
      K.part("accent", function (g, S) { court(g); S.fill(g); });
      K.part("paper", function (g, S) {                 // clear the paint's place, so the key prints in its own ink
        if (la(S)) return;
        g.save(); court(g); g.clip(); key(g); g.fill(); R.circle(g, CXc, Y0, FR); g.fill(); g.restore();
      });
      K.part("glow", function (g, S) {                  // the painted key and the center circle
        g.save(); court(g); g.clip();
        key(g); S.fill(g);
        R.circle(g, CXc, Y0, FR); S.fill(g);
        g.restore();
      });
      K.part("line", function (g, S) {                  // the ball's shadow on the floor, in halftone
        if (S.mode === "sil" || la(S)) return;
        R.ellipse(g, BX + 6.5, BY + 15.5, BR * 0.9, BR * 0.5, -0.3); g.fillStyle = S.tone(0.5); g.fill();
      });
      K.part("paper", function (g, S) {                 // every court line cut to paper, and a gap around the ball
        if (la(S)) return;
        g.save(); court(g); g.clip();
        g.lineWidth = 2.3; g.lineCap = "butt"; courtLines(g); g.stroke();
        g.restore();
        R.circle(g, BX, BY, BR + 2.4); g.fill();
      });
      K.part("line", function (g, S) {
        if (la(S)) { g.save(); court(g); g.clip(); courtLines(g); S.stroke(g, 1.6); g.restore(); }
        g.beginPath(); g.moveTo(CXc - 5.4, BBY); g.lineTo(CXc + 5.4, BBY); S.stroke(g, 2.4);   // backboard
        R.circle(g, CXc, HY, 2.7); S.stroke(g, 1.8);                                            // rim
        g.save(); g.setLineDash([2.6, 2.4]); shot(g); S.stroke(g, 1.6); g.restore();
        court(g); S.stroke(g, 2.6);
      });
      K.part("body", function (g, S) { ball(g); S.fill(g); });
      K.part("glow", function (g, S) {
        if (la(S)) return;
        ball(g); g.fillStyle = S.rad(g, BX - 4, BY - 5, 2, BR * 1.3, [[0, 0.12], [1, 0.62]]); g.fill();
      });
      K.part("line", function (g, S) {
        g.save(); ball(g); g.clip(); R.seam(g, BX, BY, BR, 0.5); S.stroke(g, 2.1); g.restore();
        ball(g); S.stroke(g, 2.4);
      });
    }
  });
})();
