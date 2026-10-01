/* Riso Emoji Shells, an 82-0 goat pack (art/CONTRACT-FX.md; art/CONCEPTS.md "82-0"): every shell of the volley is made
   of riso emoji (K.emoji: each one a two or three ink separation off its own register), none ever a raw glyph.
   Beats: a riso basketball is the shell, it climbs from the box's floor on a braided two-ink dotted trail (0.28 s); at
   the top it bursts: a white core blinks, two rings print, an outer ring of goats and trophies is thrown out on dotted
   trails with a drag and a droop, an inner ring of balls behind it, and (one shell in two) a giant GOAT or TROPHY
   (96 px, three inks) pops at the center inside a halftone sunburst, rocks on twos, holds, then drops like a trophy
   dropped. Each emoji dies the way a star does: three white specks crackle off it and it is gone, nothing fades by
   alpha. Inks: light + pop + loss (goat), hot + gold + dusk (trophy), dusk + hot + key (ball). Done by 1.7 s. */
(function () {
  "use strict";
  var TAU = Math.PI * 2;
  var GOAT = "🐐", BALL = "🏀", CUP = "🏆";
  var TRAIL = [["hot", "dusk"], ["light", "pop"], ["loss", "hot"], ["pop", "night"]];
  function k01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function pop(K, p) { return p <= 0 ? 0.5 : 0.5 + 0.5 * K.ease.back(p); }
  window.T82ART.add("goat", "emojigoat", {
    name: "Riso Emoji Shells",
    by: "Riso emoji shells: a basketball climbs, bursts into rings of goats and trophies on dotted trails, and a giant goat or trophy pops in a halftone sunburst.",
    prep: function (K) {
      var G3 = ["light", "pop", "loss"], C3 = ["hot", "gold", "dusk"], B3 = ["dusk", "hot", "key"];
      return K.emojiJobs([["goat", GOAT, 38, G3], ["cup", CUP, 38, C3, { sat: 1.2 }], ["ball", BALL, 32, B3, { sat: 1.2 }],
        ["goatB", GOAT, 96, G3], ["cupB", CUP, 96, C3, { sat: 1.2 }]]);
    },
    slots: {
      burst: { dur: 1.7, draw: function (K, ev, e) {
        var S = K.st, g = K.g, r = K.rand(ev.seed ^ 0x6047), i;
        var R = Math.max(70, Math.min(124, Math.min(ev.w, ev.h || ev.w) * 0.32)) * (0.86 + 0.3 * r());
        var cx = ev.x + ev.w * (0.22 + 0.56 * r()), cy = ev.y + ev.h * (0.16 + 0.42 * r()), tr = TRAIL[(r() * TRAIL.length) | 0];
        var hv = r(), hero = hv < 0.26 ? S.goatB : hv < 0.52 ? S.cupB : null, tb = 0.28, t = e - tb, a0 = r() * TAU, lx = cx + (r() - 0.5) * 70;
        var list = [], ly = Math.min(cy + R + 130, ev.y + ev.h + 30);
        if (t < 0) {                                   // the shell: a basketball climbing on a braided two-ink dotted trail
          var u = K.ease.out(e / tb), l2 = [];
          for (i = 1; i < 10; i++) {
            var q = K.ease.out(Math.max(0, e - i * 0.026) / tb), w = Math.sin(i * 1.3 + e * 24) * 4.5 * q;
            list.push(lx + (cx - lx) * q + w, ly + (cy - ly) * q + i * 2.5, 3.6 - i * 0.3);
            l2.push(lx + (cx - lx) * q - w, ly + (cy - ly) * q + i * 2.5, 3.2 - i * 0.28);
          }
          K.dots(g, tr[0], 0.9, list); K.dots(g, tr[1], 0.9, l2);
          K.sprite(g, S.ball, lx + (cx - lx) * u, ly + (cy - ly) * u, 1, e * 16, 1);
          return;
        }
        if (t < 0.1) K.dots(g, "light", 0.8, [cx, cy, R * 0.2 * (1 - t / 0.1) + 3]);   // the core, gone in a blink
        function dring(r1, dur, dl, ink, sz) {         // a ring of dots printed outward
          var p = (t - dl) / dur, L = [], k, an, rr = 5 + (r1 - 5) * K.ease.out(p);
          if (p < 0 || p >= 1) return;
          for (k = 0; k < 26; k++) { an = a0 + k / 26 * TAU; L.push(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, sz * (1 - p) + 0.8); }
          K.dots(g, ink, 0.9, L);
        }
        dring(R * 0.62, 0.28, 0, "light", 3.6); dring(R * 1.02, 0.44, 0.05, tr[1], 3.2);
        var eh = Math.floor(t * 12) / 12, d = 1 - Math.exp(-4.2 * t), drop = 0.42 * R * t * t, trail = [], crack = [], fall = t - 0.88;
        if (hero && t < 0.9) {                         // the sunburst behind the hero: fourteen halftone rays, turning on twos
          var rp = K.ease.out(k01(t / 0.25)) * k01((0.9 - t) / 0.2), ro = R * 0.6 * rp, ri = 34 * rp, ra = a0 + eh * 0.5;
          g.save(); g.globalCompositeOperation = K.blend; g.beginPath();
          for (i = 0; i < 14; i++) {
            var an = ra + i / 14 * TAU, c1 = Math.cos(an - 0.09), s1 = Math.sin(an - 0.09), c2 = Math.cos(an + 0.09), s2 = Math.sin(an + 0.09);
            g.moveTo(cx + c1 * ri, cy + s1 * ri); g.lineTo(cx + c1 * ro, cy + s1 * ro); g.lineTo(cx + c2 * ro, cy + s2 * ro); g.lineTo(cx + c2 * ri, cy + s2 * ri); g.closePath();
          }
          g.fillStyle = K.pat(hero === S.goatB ? "loss" : "dusk", 0.56, g); g.fill();
          g.restore();
        }
        function piece(em, th, rr, die, rot) {         // one emoji of a ring: pops, flies out, droops, crackles, dies
          var x = cx + Math.cos(th) * rr * d, y = cy + Math.sin(th) * rr * d + drop;
          if (t >= die) {
            var cp = (t - die) / 0.14;
            if (cp < 1) for (var n = 0; n < 3; n++) { var ca = th * 3 + n * 2.1; crack.push(x + Math.cos(ca) * 13 * cp, y + Math.sin(ca) * 13 * cp, 1.8 * (1 - cp) + 0.5); }
            return;
          }
          if (t < 0.42) for (var m = 1; m < 5; m++) { var dd = 1 - Math.exp(-4.2 * Math.max(0, t - m * 0.032)); trail.push(cx + Math.cos(th) * rr * dd, cy + Math.sin(th) * rr * dd + 0.42 * R * t * t, 2.8 - m * 0.45); }
          K.sprite(g, em, x, y, t < 0.14 ? pop(K, t / 0.14) : 1, rot * Math.exp(-14 * t), 1);
        }
        for (i = 0; i < (hero ? 4 : 5); i++) piece(S.ball, a0 + 0.5 + i / (hero ? 4 : 5) * TAU, R * (0.42 + r() * 0.1), 0.72 + 0.26 * r(), (r() - 0.5) * 1.4);
        for (i = 0; i < 7; i++) piece(i % 2 ? S.cup : S.goat, a0 + i / 7 * TAU + (r() - 0.5) * 0.2, R * (0.92 + r() * 0.2), 0.92 + 0.28 * r(), (r() - 0.5) * 1.1);
        K.dots(g, tr[0], 0.9, trail);
        if (hero) {                                    // the hero: pops, rocks on twos, holds, then drops
          if (fall < 0.44) K.sprite(g, hero, cx, cy + (fall > 0 ? 900 * fall * fall : 0), t < 0.2 ? pop(K, t / 0.2) : 1, fall > 0 ? 2.4 * fall : 0.13 * Math.exp(-6 * t) * Math.sin(eh * 23 + a0), 1);
          else if (fall < 0.6) {
            var hp = (fall - 0.44) / 0.16, hy = cy + 900 * 0.44 * 0.44, pl = [];
            for (i = 0; i < 7; i++) pl.push(cx + Math.cos(i * 0.9 + a0) * 40 * hp, hy + Math.sin(i * 0.9 + a0) * 40 * hp, 3.6 * (1 - hp) + 0.6);
            K.dots(g, "light", 0.9, pl);
          }
        }
        K.dots(g, "light", 0.95, crack);
      } }
    }
  });
})();
