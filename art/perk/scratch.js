/* Scratch-Off, a Presti perk pack (art/CONTRACT-FX.md; a fresh id: the perks are luck, and luck is a lottery ticket). A
   ticket pops up out of the cost buttons and a coin scribbles across its silver foil in a zigzag (the ticket jittering
   on twos, flakes flicking off at each turn). The foil is a halftone dotted with carved $ marks, and the scratch cuts
   it away; what it uncovers is printed under it. refund: +$1 in white over a green field. sale: -$2 in gold over
   orange. The last scraps blow off with a ring, then the ticket is flicked up and away. Ticket, foil and prize are
   prepped sprites; the foil is scratched on a small canvas (destination-out). Inks: good + pop + light; hot + dusk. */
(function () {
  "use strict";
  var TAU = Math.PI * 2, DUR = 1.45, PW = 216, PH = 170, FW = 168, FH = 96, RV = 0.8, T0 = 0.18, T1 = 0.76, WX = -84, WY = -45;
  var SC = [[-6, 12], [176, 26], [-6, 50], [176, 64], [-6, 86], [176, 94]], SL = [], SLT = 0;
  function u1(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function co(g, m) { g.globalCompositeOperation = m; }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  for (var i = 1; i < SC.length; i++) { SL.push(Math.sqrt(Math.pow(SC[i][0] - SC[i - 1][0], 2) + Math.pow(SC[i][1] - SC[i - 1][1], 2))); SLT += SL[i - 1]; }
  // plates [ink, tone, dx, dy] screened a job each (P() the shared plate), then printed onto the first at their misses
  function press(K, P, L, done) {
    var cs = [], jobs = [];
    L.forEach(function (a, k) { jobs.push(function () { cs[k] = K.screen(a[4] ? a[4]() : P(), a[0], a[1]); }); });
    jobs.push(function () {
      var q = P(), T = document.createElement("canvas"), x, k;
      T.width = q.W; T.height = q.H; x = T.getContext("2d"); co(x, K.blend);
      for (k = 0; k < cs.length; k++) { x.drawImage(cs[k], Math.round(L[k][2] * K.d), Math.round(L[k][3] * K.d)); cs[k].width = 0; }
      done(T);
    });
    return jobs;
  }
  function body(g) { rr(g, 4, 4, 196, 150, 10); }
  function ticket(K, a, b, pl, pr) {                        // slab, window and stub notches carved, type and perforation; an edge crescent; a light bezel
    function slab(g) {
      var k;
      body(g); g.fillStyle = K.tone(0.93); g.fill(); co(g, "destination-out"); g.fillStyle = K.tone(1);
      rr(g, 18, 34, FW, FH, 5); g.fill();
      g.beginPath(); g.arc(4, 79, 8, 0, TAU); g.arc(200, 79, 8, 0, TAU); g.fill();
      for (k = 0; k < 20; k++) { g.beginPath(); g.arc(18 + 9 * k, 144, 1.8, 0, TAU); g.fill(); }
      K.text(g, "SCRATCH & WIN", 20, 21, { align: "left", font: K.font(900, 19, "disp"), base: "middle" });
    }
    return [[a, slab, 0, 0, pl], [a, function (g) { g.translate(-108, 0); slab(g); }, 108, 0, pr], [b, function (g) { g.save(); g.translate(4, 3); body(g); g.fillStyle = K.tone(0.85); g.fill(); g.restore(); co(g, "destination-out"); g.fillStyle = K.tone(1); body(g); g.fill(); }, 0, 0],
    ["light", function (g) { rr(g, 17, 33, FW + 2, FH + 2, 6); g.lineWidth = 2.4; g.strokeStyle = K.tone(0.9); g.stroke(); }, 0, 0]];
  }
  function word(K, g, s, x, y) { K.text(g, s, x, y, { font: K.font(900, 84, "disp"), base: "middle" }); }
  function prize(K, ink, txt, word1, edge, fa) {         // a tinted field, the win in a big word, its edge crescent
    return [[ink, function (g) { rr(g, 0, 0, FW, FH, 5); g.fillStyle = K.tone(fa); g.fill(); }, 0, 0],
      [txt, function (g) { g.fillStyle = K.tone(0.93); word(K, g, word1, FW / 2, FH / 2 + 3); }, 0, 0],
      [edge, function (g) { g.fillStyle = K.tone(0.85); word(K, g, word1, FW / 2 + 4, FH / 2 + 7); co(g, "destination-out"); g.fillStyle = K.tone(1); word(K, g, word1, FW / 2, FH / 2 + 3); }, 0, 0]];
  }
  function pen(e) {                                  // the scribble drawn so far, from its start to the coin
    var s = SLT * u1((e - T0) / (T1 - T0)), P = [SC[0]], k, q;
    for (k = 1; k < SC.length && s > 0; k++) { q = Math.min(1, s / SL[k - 1]); P.push([SC[k - 1][0] + (SC[k][0] - SC[k - 1][0]) * q, SC[k - 1][1] + (SC[k][1] - SC[k - 1][1]) * q]); s -= SL[k - 1]; }
    return P;
  }
  function cut(K, x, P, d, mode) {                   // the scribble as a fat round stroke on a small canvas
    co(x, mode); x.setTransform(d, 0, 0, d, 0, 0); x.lineWidth = 26; x.lineCap = x.lineJoin = "round"; x.strokeStyle = K.tone(1); x.beginPath();
    P.forEach(function (p, n) { x[n ? "lineTo" : "moveTo"](p[0], p[1]); });
    x.stroke();
  }
  function run(K, ev, e, c) {
    var g = K.g, S = K.st, d = K.d, cx = ev.cx, cy = ev.y - 90, u = u1(e / 0.15), up = u1((e - 1.12) / 0.28), eh = Math.floor(e * 12), k, P, x, fc, t, jx = e > T0 && e < RV ? (eh & 1 ? 1.6 : -1.6) : 0;
    if (!S.foil || !S.p0) return;
    g.save(); g.beginPath(); g.rect(0, 0, ev.W, ev.y + 3 - (up > 0 ? 3 : 0)); g.clip(); g.imageSmoothingEnabled = false; co(g, K.blend);
    g.translate(Math.round(cx + jx), Math.round(cy + (1 - K.ease.back(u)) * 150 - up * up * (ev.y + 260) - 7 * Math.sin(Math.PI * u1((e - RV) / 0.2)))); if (up > 0) g.rotate(-1.3 * up * up);
    P = pen(e);
    if (e < T0) g.drawImage(S.foil, WX, WY, FW, FH);
    else if (e < RV) {                               // one small canvas: black under the foil (it adds no light), the scratch cut through both, the prize painted behind
      fc = S.fc.getContext("2d"); fc.setTransform(1, 0, 0, 1, 0, 0); co(fc, "source-over"); fc.clearRect(0, 0, S.fc.width, S.fc.height);
      fc.fillStyle = K.tone(1); fc.fillRect(0, 0, S.fc.width, S.fc.height); fc.drawImage(S.foil, 0, 0);
      if (P.length > 1) cut(K, fc, P, d, "destination-out");
      co(fc, "destination-over"); fc.setTransform(1, 0, 0, 1, 0, 0); fc.drawImage(S[c.p], 0, 0);
      g.drawImage(S.fc, WX, WY, FW, FH);
    } else g.drawImage(S[c.p], WX, WY, FW, FH);
    g.drawImage(S[c.b], -102, -79, PW, PH);
    if (e > T0 && e < RV) {                          // the coin, tilting as it scrapes
      x = P[P.length - 1]; g.translate(WX + x[0], WY + x[1] + 2 * Math.sin(e * 70));
      g.beginPath(); g.arc(0, 0, 11, 0, TAU); g.lineWidth = 3.2; g.strokeStyle = K.pat("light", 0.95); g.stroke();
      g.beginPath(); g.arc(0, 0, 7.5, 0, TAU); g.fillStyle = K.pat(c.a, 0.9); g.fill();
    }
    g.restore();
    for (k = 1, t = 0; k < SC.length; k++) {         // flakes flick off at each turn
      t += SL[k - 1];
      if (k < SC.length - 1) K.spark({ x: cx + WX + SC[k][0], y: cy + WY + SC[k][1], n: 8, ink: c.fl, sp: [60, 200], r: [1.2, 2.4], life: [0.3, 0.2], grav: 500, dir: -Math.PI / 2, cone: 3.4, seed: ev.seed + k, delay: T0 + (T1 - T0) * t / SLT });
    }
    K.ring({ x: cx, y: ev.y - 14, r0: 8, r1: 80, w0: 5, ink: c.a, cov: 0.8, dur: 0.28, delay: 0.14 });
    K.ring({ x: cx, y: cy, r0: 10, r1: 170, w0: 9, ink: c.a, cov: 0.9, dur: 0.45, delay: RV });
    K.ring({ x: cx, y: cy, r0: 8, r1: 210, w0: 5, ink: c.b2, cov: 0.65, dur: 0.55, delay: RV + 0.05 });
    K.spark({ x: cx, y: cy + 5, n: 28, ink: c.fl, sp: [140, 420], r: [1.4, 3.2], life: [0.4, 0.3], grav: 600, dir: -Math.PI / 2, cone: 3.6, seed: ev.seed, delay: RV });
    if (e > RV) K.shake(ev.box, 0.4, 6);
  }
  function mix(a, b) { return function (q) { var v = q(); return v < 0.4 ? "light" : v < 0.7 ? a : b; }; }
  window.T82ART.add("perk", "scratch", {
    name: "Scratch-Off",
    by: "A lottery ticket pops out of the cost buttons and a coin scribbles off its silver foil: +$1 on green (a refund) or -$2 in gold (a fire sale).",
    prep: function (K) {
      var st = K.st, pt, pf, pl, pr, jobs = [function () { pt = K.plate(PW, PH, 7601); }, function () { pf = K.plate(FW, FH, 7602); }, function () { pl = K.plate(108, PH, 7603); }, function () { pr = K.plate(108, PH, 7604); }];
      function P1() { return pt; }
      function PL() { return pl; }
      function PR() { return pr; }
      function P2() { return pf; }
      function put(key) { return function (c) { st[key] = c; }; }
      jobs = jobs.concat(press(K, P1, ticket(K, "good", "pop", PL, PR), put("b0")), press(K, P1, ticket(K, "hot", "dusk", PL, PR), put("b1")),
        press(K, P2, [["light", function (g) {        // the foil: a silver halftone with a grid of carved $ marks
          var r, q;
          rr(g, 0, 0, FW, FH, 5); g.fillStyle = K.tone(0.55); g.fill(); co(g, "destination-out"); g.fillStyle = K.tone(1);
          g.font = K.font(900, 12, "disp"); g.textAlign = "center"; g.textBaseline = "middle";
          for (r = 0; r < 6; r++) for (q = 0; q < 10; q++) g.fillText("$", 9 + q * 17 + (r & 1) * 8, 8 + r * 15);
        }, 0, 0]], function (c) { st.foil = c; st.fc = document.createElement("canvas"); st.fc.width = c.width; st.fc.height = c.height; }),
        press(K, P2, prize(K, "good", "light", "+$1", "pop", 0.34), put("p0")), press(K, P2, prize(K, "dusk", "hot", "-$2", "dusk", 0.66), put("p1")));
      return jobs;
    },
    slots: {
      refund: { dur: DUR, draw: function (K, ev, e) { run(K, ev, e, { p: "p0", b: "b0", a: "good", b2: "pop", fl: mix("pop", "good") }); } },
      sale: { dur: DUR, draw: function (K, ev, e) { run(K, ev, e, { p: "p1", b: "b1", a: "hot", b2: "dusk", fl: mix("hot", "dusk") }); } }
    }
  });
})();
