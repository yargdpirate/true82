/* ---------- TRUE 82 LAB concept: the ticket stub ----------
   The draft ticket the game deals, tilted up and caught mid-tear: the stub
   swings open on its perforation, hinged at the bottom. Big 82 on the ticket,
   a star and a barcode on the stub, a sunburst of glow ink behind it like the
   golden ticket it is. The concave corners make it a ticket at any size. */
(function () {
  var R = window.RISO, PI = Math.PI;
  var X0 = -44, X1 = 42, Y0 = -22, Y1 = 22, TX = 17.5, CR = 5.2, HR = 1.35, NH = 9;
  var TILT = -0.2, OPEN = 0.13, CX = 50, CY = 51;
  var FONT = "700 40px \"Barlow Condensed\", \"Arial Narrow\", sans-serif";

  function holeYs() { var out = [], step = (Y1 - Y0) / NH; for (var k = 0; k < NH; k++) out.push(Y0 + step * (k + 0.5)); return out; }
  function main(g, keep) {                                 // the ticket, torn edge on the right
    if (!keep) g.beginPath();
    g.moveTo(X0 + CR, Y0); g.lineTo(TX, Y0);
    holeYs().forEach(function (y) { g.lineTo(TX, y - HR); g.arc(TX, y, HR, -PI / 2, PI / 2, true); });
    g.lineTo(TX, Y1); g.lineTo(X0 + CR, Y1);
    g.arc(X0, Y1, CR, 0, -PI / 2, true); g.lineTo(X0, Y0 + CR); g.arc(X0, Y0, CR, PI / 2, 0, true);
    g.closePath();
  }
  function stub(g, keep) {                                 // the stub, torn edge on the left
    if (!keep) g.beginPath();
    g.moveTo(TX, Y1); g.lineTo(X1 - CR, Y1);
    g.arc(X1, Y1, CR, PI, -PI / 2, false); g.lineTo(X1, Y0 + CR); g.arc(X1, Y0, CR, PI / 2, PI, false);
    g.lineTo(TX, Y0);
    holeYs().forEach(function (y) { g.lineTo(TX, y - HR); g.arc(TX, y, HR, -PI / 2, PI / 2, false); });
    g.closePath();
  }
  function onTicket(g, fn) { g.save(); g.translate(CX, CY); g.rotate(TILT); fn(g); g.restore(); }
  function onStub(g, fn) { g.save(); g.translate(CX, CY); g.rotate(TILT); g.translate(TX, Y1); g.rotate(OPEN); g.translate(-TX, -Y1); fn(g); g.restore(); }
  function ink82(g, how, lw) {
    g.font = FONT; g.textAlign = "center"; g.textBaseline = "alphabetic";
    var m = g.measureText("82"), asc = m.actualBoundingBoxAscent || 33, sx = Math.min(1.1, 38 / (m.width || 36));
    g.save(); g.translate(-13.5, asc / 2 + 0.4); g.scale(sx, 1);
    if (how === "stroke") { g.lineWidth = lw; g.lineJoin = "round"; g.strokeText("82", 0, 0); }
    else { g.fillText("82", 0, 0); g.lineWidth = 0.9; g.strokeText("82", 0, 0); }
    g.restore();
  }
  function frame(g) { R.roundRect(g, X0 + 4.2, Y0 + 4.2, TX - X0 - 8.4, Y1 - Y0 - 8.4, 1.6); }
  function barcode(g) {
    var w = [1.3, 0.6, 0.6, 1.8, 0.6, 1.1, 0.6, 1.5, 0.6, 0.6, 1.2], y = 5.2, x0 = 23.2, bw = 13.6;
    g.beginPath();
    w.forEach(function (h) { g.rect(x0, y, bw, h); y += h + 0.75; });
  }

  window.LAB.concept({
    id: "ticket-stub", name: "Ticket stub", blurb: "The draft ticket, tearing at the perforation. Big 82, a stub, a burst of light.",
    draw: function (K) {
      K.part("glow", function (g, S) {                     // the golden-ticket burst, fading out past the box
        var n = 18, i;
        g.save();                                          // the light stays behind the ticket, not on it
        g.beginPath(); g.rect(-40, -40, 180, 180);
        onTicket(g, function () { main(g, true); });
        onStub(g, function () { stub(g, true); });
        g.clip("evenodd");
        g.beginPath();
        for (i = 0; i < n; i++) {
          var a = i / n * PI * 2 + 0.08, d = i % 2 ? 0.05 : 0.085, r1 = i % 2 ? 60 : 72;
          g.moveTo(CX + Math.cos(a) * 14, CY + Math.sin(a) * 14);
          g.lineTo(CX + Math.cos(a - d) * r1, CY + Math.sin(a - d) * r1);
          g.lineTo(CX + Math.cos(a + d) * r1, CY + Math.sin(a + d) * r1);
          g.closePath();
        }
        g.fillStyle = S.rad(g, CX, CY, 20, 78, [[0, 0.66], [0.45, 0.36], [1, 0]]); g.fill();
        g.restore();
      });
      K.part("body", function (g, S) {
        onTicket(g, function () { main(g); S.fill(g); });
        onStub(g, function () { stub(g); S.fill(g); });
      });
      K.part("shade", function (g, S) {                    // the ticket bows a little toward the tear; the stub turns away from the light
        onTicket(g, function () { main(g); g.fillStyle = S.lin(g, X0, 0, TX, 0, [[0, 0.02], [0.6, 0.08], [1, 0.4]]); S.fill(g); });
        onStub(g, function () { stub(g); g.fillStyle = S.lin(g, TX, 0, X1, 0, [[0, 0.34], [0.4, 0.16], [1, 0.08]]); S.fill(g); });
      });
      K.part("paper", function (g) {                       // a keyline of bare paper around the 82
        onTicket(g, function () { ink82(g, "stroke", 4); });
      });
      K.part("line", function (g, S) {
        onTicket(g, function () {
          main(g); S.stroke(g, 2.2);
          frame(g); S.stroke(g, 0.9);
          ink82(g, "fill");
        });
        onStub(g, function () {
          stub(g); S.stroke(g, 2.2);
          R.star(g, 30, -7.5, 7.4, 3.1, 5); S.fill(g);
          if (S.style !== "line" && S.style !== "neon") { barcode(g); g.fill(); }
        });
      });
    }
  });
})();
