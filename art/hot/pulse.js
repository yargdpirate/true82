/* Heartbeat, a Heat Check pack (art/CONTRACT-FX.md): the Heat Check as a heart monitor, a pun on the game's own BPM. A beam
   sweeps a graph-paper strip and draws an ECG whose spikes, speed and ink climb the tiers (aqua, pink, pink and gold, orange
   and gold), its trail fading in coverage steps; a printed heart beats at each spike and a reading counts the BPM up. Live
   plates, source-over (a screen blend per fill is what costs). cold: one slow weak beat. warm: two. hot: three, taller, rings.
   fire: five spiking past the strip, the card jolting. nova: the strip sprints, then the heart fills the screen as nested
   halftone hearts, beating, flinging hearts and rings (flash, shake). save: the trace runs, a golden heart pumps over the
   stamp, hearts float up. miss: one weak beat, the flatline, the heart splits down a zigzag and falls. */
(function () {
 "use strict";
 var PI=Math.PI, TAU=PI*2, sin=Math.sin, cos=Math.cos, A=window.T82ART;
 function k01(v) { return v<0?0:v>1?1:v; }
 function mix(a, b, t) { return a+(b-a)*t; }
 function pop(K, p) { return p<=0?.4:p>=1?1:.4+.6*K.ease.back(p); }
 function tw(e) { return Math.floor(e*12)/12; }
 // one plate: ink nm at cov, a hair off register (its drum's miss); lay builds the path; eo evenodd, lw a stroke's width
 function plate(K, nm, cov, lay, eo, lw) {
  var g=K.g, r;
  if (cov<.07) return;
  r=K.reg(nm);
  g.save(); g.translate(r[0], r[1]); g.beginPath(); lay(g);
  if (lw) { g.lineWidth=lw; g.lineCap=g.lineJoin="round"; g.strokeStyle=K.pat(nm, cov, g); g.stroke(); }
  else { g.fillStyle=K.pat(nm, cov, g); g.fill(eo?"evenodd":"nonzero"); }
  g.restore();
 }
 function shock(K, ink, e, x, y, r1, w0, cov, dur, dl) { // an expanding band of ink (the kit's ring, source-over)
  var p=(e-(dl||0))/dur;
  if (p>=0&&p<=1) plate(K, ink, cov*(1-p*.8), function (g) { g.arc(x, y, 8+(r1-8)*K.ease.out(p), 0, TAU); }, 0, w0*(1-p)+1);
 }
 function ecg(u) { // one beat: the P wave, the QRS spike, the T wave
  if (u<.12) return 0;
  if (u<.2) return .12*sin(PI*(u-.12)/.08);
  if (u<.3) return 0;
  if (u<.34) return -.15*(u-.3)/.04;
  if (u<.4) return -.15+1.15*(u-.34)/.06;
  if (u<.46) return 1-1.35*(u-.4)/.06;
  if (u<.52) return -.35+.35*(u-.46)/.06;
  if (u<.62) return 0;
  if (u<.78) return .22*sin(PI*(u-.62)/.16);
  return 0;
 }
 function heart(g, x, y, s) {
  g.moveTo(x, y+s*.95);
  g.bezierCurveTo(x-s*1.25, y+s*.25, x-s*1.05, y-s*.85, x-s*.5, y-s*.85);
  g.bezierCurveTo(x-s*.2, y-s*.85, x, y-s*.65, x, y-s*.4);
  g.bezierCurveTo(x, y-s*.65, x+s*.2, y-s*.85, x+s*.5, y-s*.85);
  g.bezierCurveTo(x+s*1.05, y-s*.85, x+s*1.25, y+s*.25, x, y+s*.95);
 }
 // a printed heart: a magenta shadow plate, a body, a lighter core, a white glint
 function hrt(K, x, y, s, I, m) {
  plate(K, "key", .6*m, function (g) { heart(g, x+s*.14, y+s*.14, s); });
  plate(K, I[0], .88*m, function (g) { heart(g, x, y, s); });
  plate(K, I[1], .88*m, function (g) { heart(g, x, y-s*.05, s*.55); });
  plate(K, "light", .88*m, function (g) { g.ellipse(x-s*.55, y-s*.42, s*.17, s*.1, -.6, 0, TAU); });
 }
 // the big one: nested halftone hearts (pink, orange, gold, white), like the sun's rings; each ring is one heart minus the next, so no ink is printed twice
 function bigHeart(K, x, y, s, m) {
  var H=[[1, 0], [.78, .1], [.54, .17], [.26, .22]], I=[["loss", .84], ["dusk", .85], ["hot", .88], ["light", .9]];
  plate(K, "key", .6*m, function (g) { heart(g, x+s*.09, y+s*.09, s); heart(g, x, y, s); }, 1);
  H.forEach(function (c, i) {
   plate(K, I[i][0], I[i][1]*m, function (g) { heart(g, x, y+s*c[1]*.8, s*c[0]); if (i<3) heart(g, x, y+s*H[i+1][1]*.8, s*H[i+1][0]); }, 1);
  });
 }
 function halves(K, x, y, s, I, m, d, rot) { // the heart split down a zigzag, the halves parting
  var Z=[[0, -1.1], [.14, -.6], [-.12, -.2], [.16, .2], [-.08, .6], [0, 1.1]], g=K.g, h;
  for (h=-1; h<=1; h += 2) {
   g.save(); g.beginPath();
   (h<0?Z:Z.slice().reverse()).forEach(function (q, i) { i?g.lineTo(x+q[0]*s, y+q[1]*s):g.moveTo(x+q[0]*s, y+q[1]*s); });
   g.lineTo(x+h*3*s, h<0?y+1.1*s:y-1.1*s); g.lineTo(x+h*3*s, h<0?y-1.1*s:y+1.1*s); g.closePath(); g.clip();
   g.translate(x+h*d, y); g.rotate(h*rot); g.translate(-x, -y);
   hrt(K, x, y, s, I, m);
   g.restore();
  }
 }
 function yAt(c, x) { return c.y-(c.flat&&x>c.flat?0:c.A*(c.ramp?.2+.8*x/c.W:1)*ecg((((x-c.xs)/c.bw)%1+1)%1)); }
 // the trace: the beam at xc and the line it has drawn, in three passes of falling weight and coverage (the trail fades in steps), a shadow line under the first
 function trace(K, c, xc, m, head) {
  [[0, .3, 7, .88], [.3, .65, 5, .55], [.65, 1, 3.5, .32]].forEach(function (p, pi) {
   var xa=Math.max(-10, xc-c.L*p[1]), xb=Math.min(c.W+10, xc-c.L*p[0]);
   if (xb<=xa||(c.once&&pi)) return;
   if (c.once) { xa=-10; xb=c.W+10; p=[0, 1, 4.5, .7]; }
   (pi||c.once?[[c.i1, 0, 1]]:[[c.i2, 4, .7], [c.i1, 0, 1]]).forEach(function (q) {
    plate(K, q[0], p[3]*q[2]*m, function (g) { for (var x=xa; x<=xb+4; x += c.once?7:4) { var xx=Math.min(x, xb); x>xa?g.lineTo(xx, yAt(c, xx)+q[1]):g.moveTo(xx, yAt(c, xx)+q[1]); } }, 0, p[2]);
   });
  });
  if (head&&xc>0&&xc<c.W) plate(K, "light", .95*m, function (g) { g.arc(xc, yAt(c, xc), 7, 0, TAU); });
 }
 function panel(K, c, m) { // graph paper under the trace: ruled lines in violet
  var x0=26, x1=c.W-26, y0=c.y-c.A*1.2-12, y1=c.y+c.A*.55+12, i;
  plate(K, "night", .45*m, function (g) { for (i=x0; i<=x1; i += 22) g.rect(i, y0, 2, y1-y0); for (i=y0; i<=y1; i += 22) g.rect(x0, i, x1-x0, 2); });
 }
 function num(K, x, y, px, v, ink, m) { // the reading, in the display face, over a magenta shadow; BPM beneath
  var g=K.g, r=K.reg(ink), k=K.reg("key"), s=Math.round(v)+"";
  if (m<.1) return;
  g.save(); g.font=K.font(800, px, "disp"); g.textAlign="center"; g.textBaseline="middle";
  g.translate(k[0]+3, k[1]+3); g.fillStyle=K.pat("key", .8*m, g); g.fillText(s, x, y);
  g.translate(r[0]-k[0]-3, r[1]-k[1]-3); g.fillStyle=K.pat(ink, .92*m, g); g.fillText(s, x, y);
  g.font=K.font(700, 11, "mono"); g.fillStyle=K.pat(ink, .85*m, g); g.fillText("BPM", x, y+px*.52);
  g.restore();
 }
 function side(ev) { return Math.min(ev.W-40, ev.cx+78); }
 function nx(ev, px) { return Math.max(ev.cx-90, 22+px*.78); }
 function beat(c, e, sp, cb) { // the pulse (1 at an R spike, falling to 0 in .22 s) from where the beam is
  var p=0, k, tb, d, bx;
  for (k=0; k<9; k++) {
   bx=c.xs+(k+.4)*c.bw; tb=c.t0+(bx-26)/sp; d=e-tb;
   if (bx<26||bx>c.W-26||d<=0||(c.flat&&bx>c.flat)) continue;
   if (d<.22) p=Math.max(p, (1-d/.22)*(1-d/.22));
   if (cb&&d<.4) cb(tb);
  }
  return p;
 }
 // a beam sweeps the strip, a heart beats at the right, the reading counts at the left; -> the beat's pulse. c.cy: the row of the heart and reading
 function tier(K, ev, e, c) {
  var W=ev.W, sp=(W-52)/c.sd, xc=Math.min(W-26, 26+sp*(e-c.t0)), z=k01((e-c.d+.3)/.3), m=1-z, cy=c.cy!=null?c.cy:ev.cy, p, s, v;
  c.W=W; c.y=c.y||cy+66; c.xs=70; c.L=W-52+20;
  p=beat(c, e, sp, function (tb) { if (c.rings!==0) shock(K, c.i1, e, side(ev), cy-2, 20+c.hs*1.8, 5, .8, .38, tb); });
  if (c.panel!==0) panel(K, c, m*k01((e-.02)/.1));
  if (e>c.t0) trace(K, c, xc, m, e<c.t0+c.sd+.1);
  v=mix(c.b[0], c.b[1], K.ease.out(k01((e-c.t0)/c.sd)));
  if (c.num!==0) num(K, nx(ev, c.px), cy-4+40*z*z, c.px*pop(K, e/.14), v, c.i1, m);
  if (c.heart!==0) { s=c.hs*pop(K, e/.14)*(1+.26*p)*(1-.25*z)*(1+(c.grow||0)*k01(e/c.sd)); hrt(K, side(ev), cy-2, s, c.hi, m); }
  return p;
 }
 function minis(K, ev, e, x, y, n, t0, life, spread, up, seed, ink) { // small hearts flung up and drifting, one plate per ink
  var r=K.rand(seed), i, d, t, L=[[], []], v;
  for (i=0; i<n; i++) {
   t=e-t0-r()*.3; v=r(); d=(r()-.5)*2;
   if (t>0&&t<life) L[i%3?0:1].push([x+d*spread*(1-Math.exp(-3*t))/3*3+14*sin(t*6+i), y-up*(.35+v*.65)*(1-Math.exp(-2.6*t))+80*t*t, (6+v*9)*(1-.6*t/life)]);
  }
  [0, 1].forEach(function (k) { plate(K, ink[k], .88, function (g) { L[k].forEach(function (q) { heart(g, q[0], q[1], q[2]); }); }); });
 }
 A.add("hot", "pulse", {
  name: "Heartbeat",
  by: "A heart monitor in ink: the beam draws an ECG whose spikes, speed and color climb the tiers, a printed heart beats, the BPM counts up.",
  slots: {
   cold: { dur: .9, draw: function (K, ev, e) { tier(K, ev, e, { d: .9, t0: .08, sd: .62, A: 22, bw: 250, i1: "pop", i2: "night", hi: ["pop", "light"], hs: 15, px: 44, b: [34, 48] }); } },
   warm: { dur: .9, draw: function (K, ev, e) { tier(K, ev, e, { d: .9, t0: .06, sd: .5, A: 38, bw: 150, i1: "loss", i2: "night", hi: ["loss", "light"], hs: 19, px: 52, b: [50, 86] }); } },
   hot: { dur: 1.1, draw: function (K, ev, e) { tier(K, ev, e, { d: 1.1, t0: .05, sd: .55, A: 58, bw: 112, i1: "hot", i2: "loss", hi: ["loss", "hot"], hs: 25, px: 60, b: [70, 118] }); } },
   fire: { dur: 1.4, draw: function (K, ev, e) { K.shake(ev.box, .5, 6); tier(K, ev, e, { d: 1.4, t0: .05, sd: .6, A: 104, bw: 84, i1: "hot", i2: "dusk", hi: ["dusk", "hot"], hs: 33, px: 64, b: [100, 164] }); } },
   nova: { dur: 2.4, draw: function (K, ev, e) {
    var B=.55, a=e-B, W=ev.W, H=ev.H, cx=ev.cx, cy=ev.cy-30, s, m=1-k01((a-1.7)/.3), p, i, t;
    if (e<B) { tier(K, ev, e, { d: 9, t0: .03, sd: B-.06, A: 150, bw: 70, ramp: 1, i1: "hot", i2: "loss", hi: ["hot", "light"], hs: 38, px: 56, b: [100, 210], rings: 0, grow: .5 }); return; }
    K.flash(.6, "hot"); K.shake(ev.box, 1.1, 12);
    p=0; for (i=0; i<4; i++) { t=a-.1-i*.36; if (t>0&&t<.24) p=Math.max(p, (1-t/.24)*(1-t/.24)); if (t>-.02&&t<.44) shock(K, i%2?"loss":"hot", t, cx, cy, 170+190*(i===0), 14, .85, .44, 0); }
    s=128*pop(K, a/.2)*(1+.09*p)*(1-.3*k01((a-1.7)/.7));
    shock(K, "light", a, cx, cy, W*.9, 20, .8, .7, 0); shock(K, "hot", a, cx, cy, W*1.2, 26, .85, .85, .06);
    bigHeart(K, cx, cy+70*(1-m)*(1-m)*(1-m)+0, s, m);
    minis(K, ev, a, cx, cy, 30, .08, 1.5, 300, 330, ev.seed+5, ["hot", "loss"]);
    minis(K, ev, a, cx, cy, 16, .45, 1.5, 300, 300, ev.seed+6, ["light", "dusk"]);
    tier(K, ev, e, { d: 2.4, t0: .03, sd: B-.06, A: 150, bw: 70, ramp: 1, i1: "hot", i2: "loss", hi: ["hot", "light"], hs: 38, px: 64, b: [210, 210], rings: 0, heart: 0, num: 0, y: ev.H-90, panel: 0, once: 1 });
    var g=K.g; g.save(); g.globalCompositeOperation="destination-out"; g.fillRect(ev.x-7, ev.y+5, ev.w+14, ev.h-10); g.restore();
   } },
   save: { dur: 2.2, draw: function (K, ev, e) {
    var C=ev.area, big=ev.big, cx=ev.cx, cy=C.y+C.h*.38, B=.5, a=e-B, m=1-k01((e-1.8)/.4), p=0, i, t, s;
    if (e<B) { tier(K, ev, e, { d: 9, t0: .04, sd: B-.06, A: 90, bw: 84, i1: "hot", i2: "loss", hi: ["hot", "light"], hs: 30, px: 56, b: [100, 164], rings: 0, heart: 0, num: 0, y: cy+70 }); return; }
    if (big) K.flash(.45, "hot");
    K.shake(ev.box, .5, big?9:6);
    for (i=0; i<4; i++) { t=a-.1-i*.4; if (t>0&&t<.24) p=Math.max(p, (1-t/.24)*(1-t/.24)); if (t>-.02&&t<.44) shock(K, i%2?"loss":"hot", t, cx, cy, big?230:190, 10, .85, .44, 0); }
    s=(big?108:92)*pop(K, a/.18)*(1+.1*p)*(1-.3*(1-m));
    bigHeart(K, cx, cy, s, m);
    minis(K, ev, a, cx, cy+20, big?24:16, .1, 1.7, 260, 300, ev.seed+5, ["hot", "loss"]);
    tier(K, ev, e, { d: 2.2, t0: .04, sd: B-.06, A: 90, bw: 84, i1: "hot", i2: "loss", hi: ["hot", "light"], hs: 30, px: 56, b: [164, 164], rings: 0, heart: 0, num: 0, y: cy+70, panel: 0, once: 1 });
   } },
   miss: { dur: 1.2, draw: function (K, ev, e) {
    var x=side(ev), y=ev.cy-112, k=k01((e-.5)/.6), fall=k*k, m=1-k01((e-.95)/.25), I=e<.55?["pop", "light"]:["night", "pop"];
    tier(K, ev, e, { d: 1.2, t0: .05, sd: .55, A: 34, bw: 250, i1: "pop", i2: "night", hi: ["pop", "light"], hs: 30, px: 50, b: [58, 0], flat: 150, heart: 0, rings: 0, cy: ev.cy-110, y: ev.cy-52 });
    if (e<.5) hrt(K, x, y, 34*pop(K, e/.14)*(1+(e>.15&&e<.35?.2*(1-(e-.15)/.2):0)), I, 1);
    else halves(K, x, y+100*fall, 34, I, m, 3+26*k, .6*k);
   } }
  }
 });
})();
