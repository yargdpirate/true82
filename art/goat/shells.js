/* Fireworks, an 82-0 goat pack (art/CONTRACT-FX.md; art/CONCEPTS.md "82-0"): one riso firework shell, fired in the
   game's sequences. A shell climbs on a dotted trail, bursts with a small white core and a ring, then a chrysanthemum
   of stars drags its tapering trails out while fast and droops (ink a), the stars' heads turning to ink b as they burn, an inner
   peony of ink d inside, a smoke of key dots behind; at the end every star crackles in white and dies. Coverage, not
   alpha, fades the trails. Each shell draws a seeded four-ink set built from pairs (gold and orange, pink and magenta,
   aqua and violet, gold and pink, white and aqua). big (82-0 itself): wider shells, more stars. Done by 1.85 s. */
(function () {
  "use strict";
  var TAU = Math.PI * 2;
  var SETS = [["hot", "dusk", "light", "loss"], ["loss", "key", "light", "pop"], ["pop", "night", "light", "loss"], ["hot", "loss", "light", "dusk"], ["light", "pop", "hot", "loss"]];
  function k01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function dots(K, g, ink, cov, list) { K.dots(g, ink, cov, list); }   // stamped marks: a shell prints hundreds a frame
  window.T82ART.add("goat", "shells", {
    name: "Fireworks",
    by: "Riso firework shells: halftone chrysanthemums in four inks, tapering trails, a peony inside, white crackle at the end.",
    slots: {
      burst: { dur: 1.85, draw: function (K, ev, e) {
        var g = K.g, r = K.rand(ev.seed ^ 0x82f0), set = SETS[(r() * SETS.length) | 0], big = ev.big ? 1.2 : 1;
        var cx = ev.x + ev.w * (0.16 + 0.68 * r()), cy = ev.y + ev.h * (0.12 + 0.46 * r());
        var R = Math.max(56, Math.min(120, Math.min(ev.w, ev.h || ev.w) * 0.3)) * (0.8 + 0.4 * r()) * big, N = Math.round(22 * big), tb = 0.32, t = e - tb, i;
        var lx = cx + (r() - 0.5) * 40, ly = cy + R * 0.9 + 70, head = [], tail = [], peony = [], crack = [];
        g.save(); g.globalCompositeOperation = K.blend;
        if (t < 0) {                                   // the climb: a white head and a dotted trail falling behind it
          var u = K.ease.out(e / tb), hx = lx + (cx - lx) * u, hy = ly + (cy - ly) * u;
          for (i = 1; i < 7; i++) { var q = K.ease.out(Math.max(0, e - i * 0.03) / tb); tail.push(lx + (cx - lx) * q, ly + (cy - ly) * q + i * 2, 2.4 - i * 0.3); }
          dots(K, g, set[3], 0.9, tail);
          dots(K, g, "light", 0.95, [hx, hy, 2.8]);
          g.restore();
          return;
        }
        if (t < 0.12) dots(K, g, "light", 0.75, [cx, cy, R * 0.26 * (1 - t / 0.12) + 2]);   // the core, gone in a blink
        K.ring({ x: cx, y: cy, r0: 4, r1: R * 0.55, w0: 4, ink: "light", cov: 0.85, dur: 0.26, e: t });
        if (t < 0.9) {                                 // smoke: a few soft key dots hang where it burst and sink
          var sm = k01(t / 0.9), rs = K.rand(ev.seed ^ 0x5e), smoke = [];
          for (i = 0; i < 9; i++) { var sa = rs() * TAU, sd = R * (0.1 + 0.3 * rs()) * (0.5 + sm); smoke.push(cx + Math.cos(sa) * sd, cy + Math.sin(sa) * sd + 18 * sm, (3.5 + 3.5 * rs()) * (1 + 0.6 * sm)); }
          dots(K, g, "key", 0.38 - 0.26 * sm, smoke);
        }
        var d = 1 - Math.exp(-3.2 * t), drop = 0.42 * R * t * t, trails = t < 0.62;
        if (trails) { g.fillStyle = K.pat(set[0], [0.9, 0.78, 0.62][Math.floor(t / 0.21)]); g.beginPath(); }
        for (i = 0; i < N; i++) {                      // the chrysanthemum: tapering trails, heads after
          var th = (i + r() * 0.6) / N * TAU, m = 0.88 + r() * 0.24, die = 1.12 + 0.24 * r(), ck = 0.72 + 0.36 * r(), cs = r();
          if (t > die) continue;
          var c = Math.cos(th), s = Math.sin(th), rr = R * m * d, x = cx + c * rr, y = cy + s * rr + drop;
          var t2 = Math.max(0, t - 0.15), r2 = R * m * (1 - Math.exp(-3.2 * t2)), x2 = cx + c * r2, y2 = cy + s * r2 + 0.42 * R * t2 * t2, w = 2.6 * (1 - 0.5 * t / die);
          if (trails) { g.moveTo(x - s * w, y + c * w); g.lineTo(x + s * w, y - c * w); g.lineTo(x2, y2); g.closePath(); }   // only while fast: a slow star's trail is a dot
          head.push(x, y, 2.6 - 1.1 * t / die);
          if (t > ck && t < ck + 0.14) {               // crackle: three white specks spit from the head, once
            var cp = (t - ck) / 0.14;
            for (var j = 0; j < 3; j++) { var ca = cs * TAU + j * 2.1; crack.push(x + Math.cos(ca) * 9 * cp, y + Math.sin(ca) * 9 * cp, 1.5 * (1 - cp) + 0.5); }
          }
        }
        if (trails) g.fill();
        dots(K, g, t < 0.42 ? set[0] : set[1], 0.95, head);
        if (t < 0.85) {                                // the peony inside, in the fourth ink
          var pd = 1 - Math.exp(-4 * t), pn = Math.round(13 * big);
          for (i = 0; i < pn; i++) { var pa = (i + 0.5) / pn * TAU; peony.push(cx + Math.cos(pa) * R * 0.5 * pd, cy + Math.sin(pa) * R * 0.5 * pd + drop * 0.7, 2.3 * (1 - t / 0.85) + 0.6); }
          dots(K, g, set[3], 0.92, peony);
        }
        dots(K, g, set[2], 0.95, crack);
        g.restore();
      } }
    }
  });
})();
