/* Comic Heat, a Heat Check pack (art/CONTRACT-FX.md): a comic page in riso. Each beat is a sticker cut as one contour (ring
   of one ink a hair off register, a gap of stock, a body, counted Ben-Day dots, lettering over a shadow plate), printed
   once in prep and blitted as a straight copy; speed lines, flames, borders and sparks are live. cold: a thought cloud.
   warm: a speech balloon over heat squiggles. hot: a burst on flame tongues. fire: a card-wide burst, speed lines, a
   panel border. nova: the whole screen one panel, KA-BOOM in a white-hot core. save: a burst frames the stamp under a
   narrator box. miss: WOMP falls. Exits punch the print out in coverage steps. */
(function () {
 "use strict";
 var PI = Math.PI, TAU = PI*2, sin = Math.sin, cos = Math.cos, fl = Math.floor, A = window.T82ART;
 function k01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
 function pop(K, p) { return p <= 0 ? .4 : p >= 1 ? 1 : .4+.6*K.ease.back(p); }
 function tw(e) { return fl(e*12)/12; }
 function fade(e, d) { return e > d-.2 ? k01((d-e)/.2) : 1; }
 function jig(e, a) { return e > .2 ? (fl(e*12)%2 ? a : -a) : 0; }
 function burst(K, cx, cy, R, r, n, rot, seed, sx, sy, wob, w2, jt) {
  var q = K.rand(seed), b = K.rand(w2 || 1), a = [], i, t, v, j = jt == null ? 1 : jt;
  for (i = 0; i < n*2; i++) {
   t = rot+i*PI/n+(q()-.5)*.1; v = (i%2 ? r*(1+(q()-.4)*.22*j) : R*(1+(q()-.5)*.32*j-.04*j))+(b()-.5)*(wob || 0);
   a.push(cx+cos(t)*v*sx, cy+sin(t)*v*sy);
  }
  return { p: a, c: [cx, cy] };
 }
 function oval(cx, cy, rx, ry, bump, n, tip) {
  var a = [], i, t, d, ta = tip ? Math.atan2((tip[1]-cy)/ry, (tip[0]-cx)/rx) : 0, put = 0;
  for (i = 0; i < 72; i++) {
   t = i/72*TAU;
   if (tip) { d = Math.abs(((t-ta+3*PI)%TAU+TAU)%TAU-PI); if (d < .2) { if (!put) { a.push(tip[0], tip[1]); put = 1; } continue; } }
   d = 1+bump*(Math.sqrt(Math.abs(sin(t*n/2)))-.75);
   a.push(cx+cos(t)*rx*d, cy+sin(t)*ry*d);
  }
  return { p: a, c: [cx, cy] };
 }
 function box(cx, cy, w, h) { return { p: [cx-w+3, cy-h, cx+w, cy-h-3, cx+w-3, cy+h, cx-w, cy+h+3], c: [cx, cy] }; }
 function flame(x, y, w, h, lean, ph) {
  var L = [], R = [], i, t, c, hw, u;
  for (i = 0; i <= 10; i++) {
   t = i/10; u = Math.min(1, t/.22); c = x+lean*t*t+sin(t*5+ph)*w*.15*t;
   hw = w/2*Math.pow(1-t, .85)*Math.sqrt(1-(1-u)*(1-u))*(1+.22*sin(t*7+ph*1.3));
   L.push(c-hw, y-h*t); R.unshift(c+hw, y-h*t);
  }
  for (i = 0; i < R.length; i += 2) L.push(R[i], R[i+1]);
  return L;
 }
 function star(x, y, R) { var a = [], i; for (i = 0; i < 8; i++) a.push(x+cos(i*PI/4)*R*(i%2 ? .24 : 1), y+sin(i*PI/4)*R*(i%2 ? .24 : 1)); return a; }
 function grow(S, d) {
  var p = S.p, o = [], i, dx, dy, l;
  for (i = 0; i < p.length; i += 2) { dx = p[i]-S.c[0]; dy = p[i+1]-S.c[1]; l = Math.sqrt(dx*dx+dy*dy) || 1; o.push(p[i]+dx/l*d, p[i+1]+dy/l*d); }
  return o;
 }
 function plate(K, g, nm, cov, P, o) {
  var r = K.reg(nm), i, j, p; o = o || {};
  if (cov < .07) return;
  g.save(); g.translate(r[0]+(o.dx || 0), r[1]+(o.dy || 0)); g.beginPath();
  for (i = 0; i < P.length; i++) { p = P[i]; g.moveTo(p[0], p[1]); for (j = 2; j < p.length; j += 2) g.lineTo(p[j], p[j+1]); g.closePath(); }
  g.fillStyle = o.pat || K.pat(nm, cov, g);
  if (o.pat) o.pat.setTransform(g.getTransform().inverse());
  g.fill(o.eo ? "evenodd" : "nonzero"); g.restore();
 }
 function sticker(K, g, S, c, hole) {
  var ring = [], body = [], i, n = Math.round(c[5]*K.d), t, x, k;
  for (i = 0; i < S.length; i++) { ring.push(grow(S[i], c[2]+c[1]), grow(S[i], c[2])); body.push(S[i].p); }
  if (c[0]) plate(K, g, c[0], .88, ring, { eo: true, dx: 3, dy: 2 });
  if (hole) body.push(hole);
  plate(K, g, c[3], .88, body, { eo: !!hole });
  if (!c[4]) return;
  t = document.createElement("canvas"); t.width = t.height = n; x = t.getContext("2d"); x.fillStyle = K.pat(c[4], .9, x);
  for (k = 0; k < 5; k++) { x.beginPath(); x.arc(k < 4 ? (k & 1)*n : n/2, k < 4 ? (k >> 1)*n : n/2, c[6]*K.d, 0, TAU); x.fill(); }
  plate(K, g, c[4], .9, body, { pat: x.createPattern(t, "repeat"), eo: !!hole });
 }
 function word(K, g, s, x, y, px, maxW, rot, sh, so, fc) {
  var r, i, w;
  g.font = K.font(800, px, "disp"); w = g.measureText(s).width; if (w > maxW) px *= maxW/w;
  g.save(); g.translate(x, y); g.rotate(rot); g.transform(1, 0, -.14, 1, 0, 0); g.font = K.font(800, px, "disp"); g.textAlign = "center"; g.textBaseline = "middle";
  for (i = 0; i < 2; i++) {
   r = K.reg(i ? fc : sh); g.save(); g.translate(r[0]+(i ? 0 : so), r[1]+(i ? 0 : so));
   g.fillStyle = K.pat(i ? fc : sh, i ? .92 : .88, g); g.fillText(s, 0, 0); g.restore();
  }
  g.restore();
 }
 function mk(K, w, h) { var c = document.createElement("canvas"), g; c.width = Math.round(w*K.d); c.height = Math.round(h*K.d); g = c.getContext("2d"); g.scale(K.d, K.d); return { c: c, g: g, w: w, h: h }; }
 function blit(K, S, x, y, s, a) {
  var g = K.g, d = K.d;
  if (!S || !(a > .01) || !(s > .02)) return;
  g.save(); g.globalAlpha = a;
  if (s === 1) { g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(S.c, Math.round((x-S.w/2)*d), Math.round((y-S.h/2)*d)); }
  else { g.imageSmoothingEnabled = false; g.translate(x, y); g.scale(s, s); g.drawImage(S.c, -S.w/2, -S.h/2, S.w, S.h); }
  g.restore();
 }
 function punch(K, c, x, y, w, h) {
  var g = K.g;
  if (c < .07) return;
  g.save(); g.globalCompositeOperation = "destination-out"; g.fillStyle = K.pat("light", c, g); g.fillRect(x, y, w, h); g.restore();
 }
 function lines(K, nm, cov, cx, cy, r0, r1, n, w, rot, seed) {
  var q = K.rand(seed), P = [], i, a, l, c, s;
  for (i = 0; i < n; i++) {
   a = rot+i/n*TAU+(q()-.5)*.1; l = r1*(.7+q()*.3); c = cos(a); s = sin(a);
   P.push([cx+c*r0, cy+s*r0, cx+c*l-s*w, cy+s*l+c*w, cx+c*l+s*w, cy+s*l-c*w]);
  }
  plate(K, K.g, nm, cov, P);
 }
 function flames(K, L, ph, k) {
  var a = [], b = [], i, f;
  for (i = 0; i < L.length; i++) {
   f = L[i]; a.push(flame(f[0], f[1], f[2], f[3]*k, f[4]*sin(ph+i*2), ph+i));
   b.push(flame(f[0], f[1], f[2]*.5, f[3]*.6*k, f[4]*.5*sin(ph+i*2), ph+i+1));
  }
  plate(K, K.g, "loss", .84, a); plate(K, K.g, "hot", .88, b);
 }
 function frame(K, x0, y0, x1, y1, w, nm) {
  plate(K, K.g, nm, .88, [[x0, y0, x1, y0-2, x1+1, y1, x0-1, y1+2], [x0+w, y0+w, x0+w+1, y1-w, x1-w, y1-w+1, x1-w, y0+w]], { eo: true });
 }
 function ring(K, x, y, r1, w0, nm, dur) { K.ring({ x: x, y: y, r0: 10, r1: r1, w0: w0, ink: nm, cov: .9, dur: dur }); }
 function dust(K, ev, x, y, n, sp, grav, ink, e, dir, cone, fast) {
  K.spark({ x: x, y: y, n: n, ink: ink, sp: sp, r: [1.2, 3.2], life: [.45, .4], grav: grav, dir: dir, cone: cone, seed: ev.seed, streak: fast, e: e });
 }
 function sparkle(K, L, e) {
  var a = [], b = [], i, s;
  for (i = 0; i < L.length; i++) { s = (fl(e*12)+i)%3 ? 1 : .7; a.push(star(L[i][0], L[i][1], L[i][2]*s)); b.push(star(L[i][0], L[i][1], L[i][2]*s*.5)); }
  plate(K, K.g, "hot", .9, a); plate(K, K.g, "light", .92, b);
 }
 function sheets(K) {
  var jobs = [], st = K.st, i;
  function job(name, w, h, f) { jobs.push(function () { var S = st[name] = mk(K, w, h); f(S.g, w/2, h/2); }); }
  function bubble(name, w, h, s, c, t, tx, ty, px, mw, rot, sh, so, fc) {
   job(name, w, h, function (g) { if (s.length) sticker(K, g, s, c); word(K, g, t, tx, ty, px, mw, rot, sh, so, fc || "light"); });
  }
  bubble("cold", 150, 100, [oval(82, 34, 60, 31, .3, 7), oval(46, 74, 7, 7, 0, 0), oval(30, 90, 4.2, 4.2, 0, 0)], ["pop", 3.5, 2.5, "night", "pop", 7, 1.5], "BRR", 82, 35, 36, 99, -.05, "pop", 3);
  bubble("warm", 180, 110, [oval(90, 40, 66, 34, 0, 0, [134, 94])], ["hot", 3.5, 2.5, "dusk", "hot", 8, 1.8], "WARM!", 90, 41, 44, 104, -.06, "loss", 3.5);
  [0, 1].forEach(function (v) {
   job("hot" + v, 310, 210, function (g, cx, cy) {
    sticker(K, g, [burst(K, cx, cy, 104, 64, 11, .2, 5, 1.2, .82, 4, 20+v)], ["hot", 4, 3, "dusk", "hot", 9, 2.6]);
    word(K, g, "HOT!", cx, cy+2, 84, 190, -.1, "loss", 3.5, "light");
   });
   job("fire" + v, 372, 280, function (g, cx, cy) {
    sticker(K, g, [burst(K, cx, cy, 152, 90, 14, .1, 7, 1.02, .78, 5, 30+v)], ["loss", 6, 3.5, "dusk", "hot", 11, 3.4]);
    word(K, g, "ON FIRE!", cx, cy+3, 108, 270, -.1, "loss", 4, "light");
   });
  });
  job("nova", 400, 470, function (g, cx, cy) {
   sticker(K, g, [burst(K, cx, cy, 262, 150, 17, .2, 11, 1, .98, 0, 1)], [0, 0, 0, "loss", "dusk", 16, 5.2]);
   sticker(K, g, [burst(K, cx, cy, 206, 118, 15, .05, 9, 1.02, .96, 0, 1)], ["hot", 6, 4, "dusk", "hot", 14, 4.6]);
   sticker(K, g, [burst(K, cx, cy, 148, 124, 19, .3, 4, 1.02, .96, 0, 1, .3)], ["hot", 5, 3, "light", "hot", 12, 2.2]);
   word(K, g, "KA-", cx-40, cy-56, 118, 170, -.1, "dusk", 5, "loss"); word(K, g, "BOOM!", cx+2, cy+48, 160, 250, -.1, "dusk", 6, "loss");
  });
  bubble("cap", 270, 66, [box(135, 33, 118, 24)], ["hot", 4, 3, "night"], "SUPERNOVA", 135, 34, 36, 220, 0, "night", 0);
  job("save", 360, 200, function (g, cx, cy) {
   sticker(K, g, [burst(K, cx, cy, 96, 62, 12, .15, 6, 1.55, .7, 0, 1)], ["loss", 4, 3, "hot", "dusk", 10, 3], [cx-72, cy-29, cx+72, cy-29, cx+72, cy+29, cx-72, cy+29]);
  });
  ["HE CATCHES FIRE!", "THE PERFECT SEASON!"].forEach(function (t, j) { bubble("nar" + j, 300, 52, [box(150, 26, 138, 20)], ["hot", 4, 3, "night"], t, 150, 27, 28, 250, 0, "night", 0); });
  for (i = 0; i < 4; i++) bubble("mw" + i, 70, 96, [], 0, "WOMP".charAt(i), 35, 48, 78, 66, [-.12, .08, -.05, .14][i], "night", 4, "loss");
  return jobs;
 }
 A.add("hot", "comicheat", {
  name: "Comic Heat",
  by: "A comic page in riso ink: a thought cloud, a speech balloon, a jagged burst, a card-wide starburst, then the whole screen as one KA-BOOM panel.",
  prep: sheets,
  slots: {
   cold: { dur: .9, draw: function (K, ev, e) {
    var s = pop(K, e/.14), z = k01((e-.6)/.3), x = ev.cx+47+(e > .18 && e < .6 ? (fl(e*24)%2 ? 1.8 : -1.8) : 0), y = ev.cy-60+36*z*z;
    ring(K, ev.cx, ev.cy, 70, 4, "pop", .4);
    dust(K, ev, x, y+20, 10, [10, 50], 70, "light", e-.2, PI/2, 2.4);
    blit(K, K.st.cold, x, y, s, 1); punch(K, .85*z, x-80, y-60, 160, 120);
   } },
   warm: { dur: .9, draw: function (K, ev, e) {
    var s = pop(K, e/.14), z = k01((e-.62)/.28), x = ev.cx-50, y = ev.cy-59-22*z, g = K.g, i, j, x0, ph = tw(e)*17;
    g.save(); g.lineCap = g.lineJoin = "round"; g.lineWidth = 4.4; g.beginPath();
    for (i = 0; i < 3; i++) for (j = 0; j <= 10; j++) { x0 = ev.cx+(i-1)*17+sin(j*.95+ph+i*2)*5*(.35+j/10); if (j) g.lineTo(x0, ev.cy-24-46*j/10); else g.moveTo(x0, ev.cy-24); }
    g.strokeStyle = K.pat("hot", .88, g); g.stroke(); g.restore();
    ring(K, ev.cx, ev.cy, 90, 5, "dusk", .45);
    blit(K, K.st.warm, x, y, s, 1); punch(K, .85*z, x-95, y-60, 190, 120);
   } },
   hot: { dur: 1.1, draw: function (K, ev, e) {
    var s = pop(K, e/.14), eh = tw(e), z = k01((e-.84)/.26), cx = ev.cx, cy = ev.cy-26;
    lines(K, "loss", .88, cx, cy, 128*s, 190, 12, 3.6, eh*3, ev.seed+3);
    flames(K, [[cx-62, cy-30, 52, 86, -16], [cx+6, cy-54, 64, 120, 8], [cx+66, cy-28, 48, 82, 18]], eh*7, s*(1-.7*z));
    blit(K, K.st["hot" + (fl(e*8) & 1)], cx, cy, s, 1); punch(K, .85*z, cx-160, cy-140, 320, 280);
    ring(K, cx, cy, 150, 7, "hot", .45);
   } },
   fire: { dur: 1.4, draw: function (K, ev, e) {
    var s = pop(K, e/.15), eh = tw(e), z = k01((e-1.05)/.35), x = ev.cx, y = ev.cy-6, C = ev.area, i, f = [], a, fr = 12*(1-K.ease.out(k01((e-.04)/.12))), ex = 1-.65*z*z;
    K.shake(ev.box, .5, 7);
    lines(K, "dusk", .7, x, y, 150*ex, 320, 8, 5.5, eh*2.4, ev.seed+3); lines(K, "hot", .7, x, y, 170*ex, 300, 5, 3.5, eh*2.4+.2, ev.seed+9);
    for (i = 0; i < 6; i++) { a = -PI*(.1+.8*i/5); f.push([x+cos(a)*130*ex, y+sin(a)*85*ex, 56+(i%3)*8, 105+40*Math.abs(sin(i*2.1)), cos(a)*36]); }
    flames(K, f, eh*7, s*ex);
    if (z < 1) frame(K, C.x-8+fr, C.y-8+fr, C.x+C.w+8-fr, C.y+C.h+8-fr, 6, "hot");
    blit(K, K.st["fire" + (fl(e*8) & 1)], x+jig(e, 2), y, s*ex, fade(e, 1.4));
    ring(K, x, y, 190, 9, "hot", .5); dust(K, ev, x, y, 8, [200, 480], 400, "hot", e, 0, 0, 1);
   } },
   nova: { dur: 2.4, draw: function (K, ev, e) {
    var s = pop(K, e/.2), eh = tw(e), z = k01((e-1.8)/.6), x = ev.cx, y = ev.cy-30, W = ev.W, H = ev.H, ex = 1-.7*z*z, i, L = [], fr = 20*(1-K.ease.out(k01(e/.14)));
    K.flash(.55, "hot"); K.shake(ev.box, 1, 12);
    lines(K, "dusk", .7, x, y, 120+380*z*z, 580, 6, 9, eh*2.1, ev.seed+3); lines(K, "loss", .7, x, y, 140+380*z*z, 520, 5, 5, eh*2.1+.2, ev.seed+9);
    blit(K, K.st.nova, x+jig(e, 2.5), y+jig(e+.04, 2.5), s*ex, fade(e, 2.4));
    if (e > .34 && z < .9) blit(K, K.st.cap, x, y+150, pop(K, (e-.34)/.12), 1);
    frame(K, fr+5+W/2*(1-ex), fr+5+H/2*(1-ex), W-5-fr-W/2*(1-ex), H-5-fr-H/2*(1-ex), 7, "hot");
    for (i = 0; i < 8; i++) L.push([x+cos(i*2.4+.5)*(150+50*(i%3)), y+sin(i*2.4+.5)*(200+40*(i%2)), 12+6*(i%3)]);
    if (e > .3 && z < 1) sparkle(K, L, e);
    ring(K, x, y, 330, 12, "hot", .6);
   } },
   save: { dur: 2.2, draw: function (K, ev, e) {
    var s = pop(K, e/.16), z = k01((e-1.75)/.45), cx = ev.cx, cy = ev.cy, C = ev.area, eh = tw(e), ny = Math.min(ev.H-34, C.y+C.h+36), L = [], i, nz = pop(K, (e-.3)/.12);
    K.shake(ev.box, .5, ev.big ? 9 : 6);
    if (ev.big) { K.flash(.45, "hot"); if (z < 1) frame(K, C.x-6, C.y-6, C.x+C.w+6, C.y+C.h+6, 6, "hot"); }
    lines(K, "loss", .7, cx, cy, 130, 300, ev.big ? 12 : 8, 4, eh*2, ev.seed+3);
    ring(K, cx, cy, 220, 9, "hot", .55);
    blit(K, K.st.save, cx, cy, s, fade(e, 2.2)); punch(K, .85*z, cx-182, cy-102, 364, 204);
    if (e > .3) { blit(K, K.st[ev.big ? "nar1" : "nar0"], cx, ny, nz, fade(e, 2.2)); punch(K, .85*z, cx-152, ny-28, 304, 56); }
    for (i = 0; i < 6; i++) L.push([cx+[-160, 150, -125, 170, -40, 60][i], cy+[-60, -70, 70, 50, -98, 100][i], [16, 20, 12, 14, 12, 14][i]]);
    if (e > .15 && z < 1) sparkle(K, L, e);
    dust(K, ev, cx, cy, 30, [200, 480], 400, "hot", e, 0, 0, 1);
   } },
   miss: { dur: 1.2, draw: function (K, ev, e) {
    var cx = ev.cx, cy = ev.cy, z = k01((e-.9)/.3), rest = Math.min(cy+92, ev.H-62), i, p;
    K.shake(ev.box, .4, 4);
    dust(K, ev, cx, cy+14, 12, [10, 50], 200, "loss", e-.1, PI/2, 1.2);
    for (i = 0; i < 4; i++) {
     p = (e-.1-i*.09)/.3;
     if (p > 0) blit(K, K.st["mw" + i], cx+(i-1.5)*50, cy-10+(rest+[0, 10, 18, 28][i]-cy+10)*K.ease.bounce(p)+420*z*z, 1, fade(e, 1.2));
    }
   } }
  }
 });
})();
