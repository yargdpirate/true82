/* art/loss/tape.js: Caution. Two strips of hazard tape (diagonal stripes, LOSS stenciled out of the pink) are slapped
   across the card to make an L: the stem swings down from above, the foot snaps in from the right and lies over its
   foot. They hold with a glossy edge, the toe peels up and flaps (twice in a long moment), then both are ripped off the card.
   Plates (two 62 x 190 / 142 x 62 plates, four screened jobs): the pink tape of each strip (stripes and letters carved
   out of the ink) and a tonal key shadow of each, a block off to one side, knocked out under the strip so the tape
   stays pure pink. Stretches with E.dur: the hold and the flap; the tear-off takes the last 0.1 to 0.35 s. */
(function () {
  "use strict";
  var SW = 48, PAD = 7, SL = 176, FL = 128, SX = 6.5, SY = 5.5, U = 1.25;      // strip width, plate margin, stem length, foot length, shadow
  // one strip in its own frame: x along it from the cut end (0), y across it (0..SW). far = the end style
  function outline(K, g, len, far, seed) {
    var r = K.rand(seed), y, i = 0;
    g.beginPath(); g.moveTo(0, 0);
    if (far === "tear") {                              // a torn end: a slanted ragged line
      for (y = 0; y <= SW; y += 4.5) g.lineTo(len - 9 + (y - SW / 2) * 0.34 - r() * 6, y);
    } else {                                           // a dispenser's teeth
      for (y = 0; y <= SW; y += 4) { g.lineTo(len - (i % 2 ? 0 : 4.5), y); i++; }
    }
    g.lineTo(0, SW); g.closePath();
  }
  // the tape's face: pink, the 45 degree stripes out of it, LOSS out of it, a crease out of it
  function face(K, g, len, far, seed, t0, t1, mask, cx) {
    var x, ch, i, r = K.rand(seed + 5);
    outline(K, g, len, far, seed);
    if (mask) { g.fillStyle = K.tone(0.6); g.fill(); return; }
    g.fillStyle = K.tone(0.95); g.fill();
    g.globalCompositeOperation = "destination-out"; g.fillStyle = K.tone(1);
    for (x = -SW; x < len; x += 17) {
      g.beginPath(); g.moveTo(x, SW); g.lineTo(x + 7, SW); g.lineTo(x + 7 + SW, 0); g.lineTo(x + SW, 0); g.closePath(); g.fill();
    }
    g.globalCompositeOperation = "source-over"; g.fillStyle = K.tone(0.95);
    g.fillRect(t0 - 2, 0, t1 - t0 + 4, SW);                // the lettering zone is solid
    g.globalCompositeOperation = "destination-out"; g.fillStyle = K.tone(1);
    g.font = K.font(900, 33, "disp"); g.textAlign = "center"; g.textBaseline = "middle";
    for (i = 0; i < 4; i++) { ch = "LOSS".charAt(i); g.fillText(ch, t0 + 7 + i * 14.5, SW / 2 + 1.5); }
    g.strokeStyle = K.tone(1); g.lineWidth = 2; g.beginPath();   // the crease the tape took when it was slapped
    g.moveTo(cx, 0); g.lineTo(cx + 5 + r() * 3, SW * 0.5); g.lineTo(cx - 2, SW); g.stroke();
    g.globalCompositeOperation = "source-over";
  }
  function strip(K, st, key, P, w, h, len, far, seed, t0, t1, vert) {      // the pink tape, then its shadow
    return [
      function () {
        st[key] = K.screen(P(), "loss", function (g) {
          g.scale(U, U); g.translate(PAD, vert ? PAD + SL : PAD); if (vert) g.rotate(-Math.PI / 2);
          face(K, g, len, far, seed, t0, t1, false, vert ? 152 : 108);
          if (vert) { g.globalCompositeOperation = "destination-out"; g.fillStyle = K.tone(1); g.fillRect(-2, -2, SW + 4, SW + 4); }   // the foot lies over the stem's foot
        });
      },
      function () {
        st[key + "s"] = K.screen(P(), "pop", function (g) {
          g.scale(U, U); g.translate(PAD, vert ? PAD + SL : PAD); if (vert) g.rotate(-Math.PI / 2);
          g.save(); g.translate(vert ? -SY : SX, vert ? SX : SY); face(K, g, len, far, seed, t0, t1, true, 0); g.restore();
          g.globalCompositeOperation = "destination-out"; g.fillStyle = K.tone(1);
          outline(K, g, len, far, seed); g.fill();
          if (vert) g.fillRect(-SY - 4, -4, SW + SY + 8, SW + SX + 8);       // none where the foot lies over the stem
        });
      }
    ];
  }
  // one strip's pose: the L is drawn in design units about its top left, scaled by s; (px, py) the pivot
  function pose(g, px, py, dx, dy, rot, sx, sy) {
    g.translate(px + dx, py + dy); g.rotate(rot); g.scale(sx, sy); g.translate(-px, -py);
  }
  function spot(K, E) {
    var B = K.box, s = (B.y1 - B.y0) / SL, r = K.rand(E.seed ^ 0x7a9e);
    return { s: s, ox: B.cx - FL * s / 2, oy: B.y0, tilt: (r() < 0.5 ? -1 : 1) * (0.03 + r() * 0.03) };
  }
  T82ART.add("loss", "tape", {
    name: "Caution Tape",
    by: "Two strips of hazard tape stenciled LOSS slap across the card in an L, the toe flaps once, and both are ripped away.",
    prep: function (K) {
      var st = K.st, P1 = function () { return st.P1; }, P2 = function () { return st.P2; };
      var jobs = [function () { st.P1 = K.plate((SW + 2 * PAD + SX) * U, (SL + 2 * PAD + SY) * U, 8101); st.P2 = K.plate((FL + 2 * PAD + SX) * U, (SW + 2 * PAD + SY) * U, 8102); }];
      return jobs.concat(strip(K, st, "a", P1, 0, 0, SL, "tear", 21, 78, 136, true), strip(K, st, "b", P2, 0, 0, FL, "saw", 33, 22, 82, false));
    },
    hit: function (K, E) {
      var S = spot(K, E), B = K.box;
      K.flash(E.first ? 0.55 : 0.4); K.shake(Math.max(E.dur, 0.4), E.first ? 11 : 8);
      K.ring({ x: E.x, y: E.y, dur: 0.34, r0: 6, r1: E.first ? 150 : 100, w0: 8, ink: "loss", cov: 0.8 });
      K.spark({ x: B.cx - FL * S.s * 0.3, y: B.y1 - 10, n: 12, ink: "light", sp: [120, 380], r: [1, 2.2], life: [0.18, 0.2], grav: 900, seed: E.seed });
    },
    draw: function (K, E, e) {
      var st = K.st, g = K.g, f = K.fade(E, e), S = spot(K, E), s = S.s, B = K.box, c = K.clamp;
      if (!st.a || !st.b || !st.as || !st.bs || f <= 0) return;
      var PW = SW + 2 * PAD + SX, PH = SL + 2 * PAD + SY, FW = FL + 2 * PAD + SX, FH = SW + 2 * PAD + SY;
      var X = Math.min(0.35, 0.25 * E.dur), tE = E.dur - X, tf = tE * 0.3, df = c(tE * 0.25, 0.1, 0.3);
      var p1 = c(e / 0.065, 0, 1), p2 = c((e - 0.035) / 0.06, 0, 1);          // the stem swings down; the foot snaps in
      var a1 = c((e - 0.065) / 0.1, 0, 1), a2 = c((e - 0.095) / 0.1, 0, 1);   // each lands with a squash and springs back
      var sq1 = Math.sin(a1 * Math.PI) * (1 - a1 * 0.4), sq2 = Math.sin(a2 * Math.PI) * (1 - a2 * 0.4);
      var er = Math.max(0, e - 0.1), wob = 0.045 * Math.exp(-er * 6) * Math.sin(er * 24);
      var u = c((e - tf) / df, 0, 1), flap = E.dur > 0.5 ? -0.5 * Math.sin(u * Math.PI) * (1 - 0.25 * u) : 0;
      var u2 = c((e - tE * 0.62) / df, 0, 1); if (E.dur > 0.9) flap -= 0.36 * Math.sin(u2 * Math.PI) * (1 - 0.25 * u2);   // a long moment: the toe flaps again, lower
      var cr = K.smooth(tf + df, tE, e), cr2 = cr * cr;                          // the glue gives: the free ends creep away
      var q = c((e - tE) / X, 0, 1), q2 = c((e - tE - X * 0.18) / (X * 0.82), 0, 1);   // the rip: the stem first
      g.save(); g.globalAlpha = f; g.globalCompositeOperation = K.blend;
      g.translate(S.ox + FL * s / 2, B.y0 + SL * s / 2); g.rotate(S.tilt); g.translate(-S.ox - FL * s / 2, -B.y0 - SL * s / 2);
      g.translate(S.ox, S.oy); g.scale(s, s);
      g.save();                                                                  // the stem pivots at its foot
      pose(g, SW / 2, SL, 45 * q * q + 6 * cr2, -SL * 0.95 * (1 - p1 * p1) - 260 * q * q, (1 - p1) * 0.32 + wob + 0.09 * cr2 + 0.45 * q * q,
        1 + 0.1 * sq1 + 0.06 * (1 - p1), 1 - 0.1 * sq1 + 0.3 * (1 - p1));
      g.drawImage(st.as, -PAD, -PAD, PW, PH); g.drawImage(st.a, -PAD, -PAD, PW, PH);
      g.restore(); g.save();                                                     // the foot pivots at its left end
      pose(g, SW / 2, SL - SW / 2, (FL * 1.5 + 40) * (1 - p2) + 300 * q2 * q2, -wob * 20 + 30 * Math.sin(flap) - 36 * q2 * q2, flap - wob - 0.2 * cr2 - 0.7 * q2 * q2,
        1 + 0.12 * sq2 + 0.18 * (1 - p2), 1 - 0.1 * sq2);
      g.drawImage(st.bs, -PAD, SL - SW - PAD, FW, FH); g.drawImage(st.b, -PAD, SL - SW - PAD, FW, FH);
      g.restore(); g.restore();
    }
  });
})();
