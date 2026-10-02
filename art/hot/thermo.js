/* Redline, a Heat Check pack (art/CONTRACT-FX.md): a printed thermometer, violet glass over a magenta shadow plate, a white
   scale, a mercury column that climbs the tiers and changes ink (aqua, pink, pink and gold, orange and gold, white-hot) and a
   big reading in the display face. Live plates, source-over (a screen blend per fill is what costs). cold: it drops, shivers.
   warm: it pops up, the mercury lifts. hot: taller, heat haze and a corona of dots. fire: the full card, the mercury throbbing
   in the redline, the glass cracking. nova: a screen-tall tube, the mercury runs off the top, the glass bursts top to bottom
   (flash, shake): shards, rings, a rain of mercury. save: six pop their tops. miss: the mercury plunges, goes aqua, it tips. */
(function () {
 "use strict";
 var PI=Math.PI, TAU=PI*2, sin=Math.sin, cos=Math.cos, A=window.T82ART;
 var IC=[["pop", 1]], IW=[["loss", 1]], IH=[["loss", 1], ["hot", .45]], IF=[["dusk", 1], ["hot", .5]], IN=[["hot", 1], ["light", .5]];
 function k01(v) { return v<0?0:v>1?1:v; }
 function mix(a, b, t) { return a+(b-a)*t; }
 function pop(K, p) { return p<=0?.4:p>=1?1:.4+.6*K.ease.back(p); }
 function tw(e) { return Math.floor(e*12)/12; }
 // one plate: ink nm at cov, a hair off register (its drum's miss); lay builds the path; eo evenodd, lw a stroke's width
 var Q=null; // while a list: plates wait to be merged by ink (one fill for six thermometers)
 function flush(K) {
  var q=Q, k={}, o=[];
  Q=null;
  q.forEach(function (p) { var id=p[0]+p[1]+p[3]+p[4]; if (!k[id]) o.push(k[id]={ p: p, L: [] }); k[id].L.push(p[2]); });
  o.forEach(function (c) { plate(K, c.p[0], c.p[1], function (g) { c.L.forEach(function (f) { f(g); }); }, c.p[3], c.p[4]); });
 }
 function plate(K, nm, cov, lay, eo, lw) {
  var g=K.g, r;
  if (cov<.07) return;
  if (Q) { Q.push([nm, cov, lay, eo, lw]); return; }
  r=K.reg(nm);
  g.save(); g.translate(r[0], r[1]); g.beginPath(); lay(g);
  if (lw) { g.lineWidth=lw; g.lineCap=g.lineJoin="round"; g.strokeStyle=K.pat(nm, cov, g); g.stroke(); }
  else { g.fillStyle=K.pat(nm, cov, g); g.fill(eo?"evenodd":"nonzero"); }
  g.restore();
 }
 function ring(g, x, y, r0, r1) { g.moveTo(x+r1, y); g.arc(x, y, r1, 0, TAU); if (r0>.5) { g.moveTo(x+r0, y); g.arc(x, y, r0, 0, TAU); } }
 function sun(K, x, y, R, m, S) { S.forEach(function (b) { plate(K, b[0], b[3]*m, function (g) { ring(g, x, y, R*b[1], R*b[2]); }, 1); }); }
 // rings of dots r0..r1, fat inside and fine outside, as live marks: the halftone corona round a bulb
 function nebula(K, ink, x, y, r0, r1, sp, rm, m) {
  var L=[], nr=Math.max(1, Math.round((r1-r0)/sp)), k, n, i, r, q, a;
  for (k=0; k<nr; k++) {
   r=r0+(k+.5)*(r1-r0)/nr; n=Math.max(6, Math.round(TAU*r/sp)); q=rm*Math.pow(1-k/nr, .9)*m;
   if (q>.8) for (i=0; i<n; i++) { a=(i+(k%2)*.5)/n*TAU; L.push(x+cos(a)*r, y+sin(a)*r, q); }
  }
  K.dots(K.g, ink, .95, L);
 }
 function ko(K, ev) { var g=K.g; g.save(); g.globalCompositeOperation="destination-out"; g.fillRect(ev.x-7, ev.y+5, ev.w+14, ev.h-10); g.restore(); }
 function shock(K, ink, e, x, y, r1, w0, cov, dur, dl) { // an expanding band of ink (the kit's ring, source-over)
  var p=(e-(dl||0))/dur;
  if (p>=0&&p<=1) plate(K, ink, cov*(1-p*.8), function (g) { g.arc(x, y, 12+(r1-12)*K.ease.out(p), 0, TAU); }, 0, w0*(1-p)+1);
 }
 function glass(g, x, yb, H, R, w) { // the glass: tube and bulb as one contour
  var th=Math.acos(w/R);
  g.moveTo(x-w, yb-Math.sqrt(R*R-w*w)); g.lineTo(x-w, yb-H+w); g.arc(x, yb-H+w, w, PI, TAU); g.lineTo(x+w, yb-Math.sqrt(R*R-w*w)); g.arc(x, yb, R, -th, PI+th); g.closePath();
 }
 // a thermometer, bulb at (x, y), the tube H tall. o: w, R (half widths), lvl (the mercury, 0..1), ink (its plates: ink, width), m (coverage),
 // sx, sy (a squash), rot (about the bulb), crack (0..1), red (the redline band's coverage)
 function th(K, x, y, H, o) {
  var sx=o.sx||1, sy=o.sy||1, w=(o.w||11)*sx, R=(o.R||20)*sx, h=H*sy, m=o.m==null?1:o.m, g=K.g, U=h-R-w*2, c=o.crack||0, wl=w*.45, i, yy;
  var top=y-R*.6-U*Math.min(1.04, Math.max(0, o.lvl)), rl=y-R*.6-U*.76;
  g.save();
  if (o.rot) { g.translate(x, y); g.rotate(o.rot); g.translate(-x, -y); }
  if (o.tk!==0) plate(K, "key", .6*m, function (g) { g.save(); g.translate(w*.35, w*.35); glass(g, x, y, h, R, w); g.restore(); });
  (o.ink||IW).forEach(function (n) {
   var q=n[1], wi=Math.max(.5, (w-1.2*wl)*q), rb=Math.max(.5, (R-1.25*wl)*q);
   plate(K, n[0], .88*m, function (g) { g.arc(x+wl*.2, y, rb, 0, TAU); g.moveTo(x+wl*.2-wi, y); g.lineTo(x+wl*.2-wi, top+wi); g.arc(x+wl*.2, top+wi, wi, PI, TAU); g.lineTo(x+wl*.2+wi, y); g.closePath(); });
  });
  plate(K, "night", .88*m, function (g) { glass(g, x, y, h, R, w); glass(g, x+wl*.2, y, h-wl, Math.max(1, R-wl), Math.max(1, w-.9*wl)); }, 1);
  plate(K, "light", .88*m, function (g) {
   g.rect(x-w+wl*.3, y-h+w*1.6, wl*.45, h-R-w*2.6);
   if (o.tk!==0) for (i=0; i<=10; i++) { yy=y-R*.6-U*i/10; g.rect(x+w+5, yy-2, i%5?9:18, 4); }
  });
  if (o.tk!==0) plate(K, "loss", (o.red==null?.5:o.red)*m, function (g) { g.rect(x-w-12, rl-U*.24, 6, U*.24+2); });
  if (o.jag) { // a broken stump: teeth cut into the top
   g.globalCompositeOperation="destination-out"; g.beginPath(); g.moveTo(x-w-6, y-h-6);
   for (i=0; i<=6; i++) g.lineTo(x-w-6+(2*w+12)*i/6, y-h+6+(i%2?0:16));
   g.lineTo(x+w+6, y-h-6); g.fill();
  }
  if (c>0) { // cracks carved through the glass
   g.globalCompositeOperation="destination-out"; g.lineWidth=2.6; g.lineJoin="round"; g.beginPath();
   [0, 1].forEach(function (k) {
    var y0=y-h+w*2+30+k*80, T=[0, .35, .6, 1], J=[0, 7, -4, 6], j;
    for (j=0; j<4; j++) { var px=x-w-3+(2*w+6)*T[j]*c, py=y0+J[j]*c*(k?-1:1); j?g.lineTo(px, py):g.moveTo(px, py); }
   });
   g.stroke();
  }
  g.restore();
 }
 function num(K, x, y, px, v, ink, m) { // the reading, in the display face
  var g=K.g, r=K.reg(ink);
  if (m<.1) return;
  g.save(); g.font=K.font(800, px, "disp"); g.textAlign="center"; g.textBaseline="middle";
  g.translate(K.reg("key")[0]+3, K.reg("key")[1]+3); g.fillStyle=K.pat("key", .8*m, g); g.fillText(Math.round(v)+"\u00B0", x, y);
  g.translate(r[0]-K.reg("key")[0]-3, r[1]-K.reg("key")[1]-3); g.fillStyle=K.pat(ink, .92*m, g); g.fillText(Math.round(v)+"\u00B0", x, y); g.restore();
 }
 function spk(g, x, y, R, w) { g.moveTo(x+R, y); for (var i=1, a; i<=4; i++) { a=i*PI/2; g.quadraticCurveTo(x+cos(a-PI/4)*R*w, y+sin(a-PI/4)*R*w, x+cos(a)*R, y+sin(a)*R); } }
 function stars(K, ink, cov, L) { plate(K, ink, cov, function (g) { L.forEach(function (q) { spk(g, q[0], q[1], q[2], .2); }); }); }
 function tri(g, x, y, R, a) { g.moveTo(x+cos(a)*R, y+sin(a)*R); g.lineTo(x+cos(a+2.3)*R*.8, y+sin(a+2.3)*R*.8); g.lineTo(x+cos(a+4.2)*R, y+sin(a+4.2)*R); }
 function spikes(g, x, y, r0, r1, n, rot, wd, ph) { // every other one of n pointed rays, root half-angle wd
  for (var i=ph, a; i<n; i += 2) {
   a=rot+i/n*TAU;
   g.moveTo(x+cos(a-wd)*r0, y+sin(a-wd)*r0); g.lineTo(x+cos(a)*r1, y+sin(a)*r1); g.lineTo(x+cos(a+wd)*r0, y+sin(a+wd)*r0); g.closePath();
  }
 }
 function puff(K, x, y, e, n, seed, ink) { K.spark({ x: x, y: y, n: n, ink: ink, sp: [30, 90], r: [1.4, 3], life: [.5, .3], grav: -110, dir: -PI/2, cone: 1.1, seed: seed, e: e }); }
 function sprayer(K, x, y, n, inks, sp, e, seed, dir, cone, grav) { K.spark({ x: x, y: y, n: n, ink: function (q) { return inks[(q()*inks.length) | 0]; }, sp: sp, r: [2, 5.4], life: [.8, .6], grav: grav, dir: dir, cone: cone, seed: seed, e: e }); }
 function side(ev) { return Math.min(ev.W-40, ev.cx+72); }
 function nx(ev, px) { return Math.max(ev.cx-90, 22+px*.78); }
 A.add("hot", "thermo", {
  name: "Redline",
  by: "A printed thermometer whose mercury climbs the tiers and changes ink, then bursts its glass at supernova in shards, rings and a rain of mercury.",
  slots: {
   cold: { dur: .9, draw: function (K, ev, e) {
    var x=side(ev), y=ev.cy+30, p=e/.14, z=k01((e-.62)/.28), yy=y, sx=1, sy=1, q, b=sin(PI*k01((e-.28)/.3));
    if (e<.14) { yy=y-140*(1-p*p); sx=.85; sy=1.2; }
    else if (e<.2) { sx=1.25; sy=.8; }
    else { q=k01((e-.2)/.2); sx=1.25-.25*K.ease.elastic(q); sy=.8+.2*K.ease.elastic(q); }
    yy += 50*z*z; x += e>.3&&e<.62?(Math.floor(e*12)%2?1.5:-1.5):0;
    shock(K, "pop", e, x, y+14, 60, 4, .75, .4, .14);
    th(K, x, yy, 125, { w: 11, R: 20, lvl: .04+.1*b, ink: IC, m: 1-z, sx: sx, sy: sy, red: .3 });
    if (e>.14) num(K, nx(ev, 44), ev.cy-4+40*z*z, 44, -14+7*b, "pop", 1-z);
    K.spark({ x: x, y: y+10, n: 10, ink: function (r) { return r()<.4?"light":"pop"; }, sp: [40, 120], r: [1, 2.2], life: [.4, .3], grav: 300, dir: -PI/2, cone: 2.4, seed: ev.seed, e: e-.14 });
   } },
   warm: { dur: .9, draw: function (K, ev, e) {
    var x=side(ev), y=ev.cy+34, s=pop(K, e/.16), z=k01((e-.62)/.28), L=.36*K.ease.back(k01((e-.1)/.4));
    shock(K, "loss", e, x, y, 92, 6, .75, .5);
    th(K, x, y, 190, { w: 13, R: 24, lvl: L, ink: IW, m: 1-z, sx: s, sy: s, red: .4 });
    num(K, nx(ev, 52), ev.cy-4+40*z*z, 52*s, mix(40, 74, L/.36), "loss", 1-z);
    puff(K, x, y-150*s, e-.3, 8, ev.seed, function (r) { return r()<.4?"hot":"loss"; });
   } },
   hot: { dur: 1.1, draw: function (K, ev, e) {
    var x=side(ev), y=ev.cy+40, s=pop(K, e/.14), z=k01((e-.82)/.28), m=1-z, L=.68*K.ease.back(k01((e-.08)/.3));
    shock(K, "hot", e, x, y, 120, 8, .88, .45); shock(K, "dusk", e, x, y, 150, 5, .6, .55, .07);
    nebula(K, "hot", x, y, 38*s, 66*s, 9, 3.2, m);
    th(K, x+(e>.3&&e<.85?(Math.floor(e*12)%2?1:-1):0), y, 260, { w: 15, R: 28, lvl: L, ink: IH, m: m, sx: s, sy: s, red: .5 });
    num(K, nx(ev, 60), ev.cy-4+40*z*z, 60*s, mix(70, 106, L/.68), "hot", m);
    puff(K, x, y-250*s, e-.3, 12, ev.seed, function (r) { return r()<.3?"light":"hot"; });
   } },
   fire: { dur: 1.4, draw: function (K, ev, e) {
    var x=side(ev), y=ev.cy+62, s=pop(K, e/.15), z=k01((e-1.05)/.35), m=1-z, tt=tw(e), L=e<.45?K.ease.back(k01((e-.05)/.4)):.96+.05*sin(tt*53);
    K.shake(ev.box, .5, 6);
    shock(K, "hot", e, x, y, 180, 9, .9, .5); shock(K, "dusk", e, x, y, 230, 6, .65, .6, .08);
    nebula(K, "hot", x, y, 46*s, 82*s, 11, 3.8, m);
    th(K, x+(e>.3?(Math.floor(e*12)%2?2:-2):0), y, 400, { w: 18, R: 33, lvl: L, ink: IF, m: m, sx: s, sy: s, crack: k01((e-.5)/.4), red: e>.4&&Math.floor(e*12)%2?.88:.6 });
    num(K, nx(ev, 64), ev.cy-4+40*z*z, 64*s, e<.5?mix(100, 212, Math.min(1, L)):212, "hot", m);
    puff(K, x, y-380*s, e-.35, 16, ev.seed, function (r) { return r()<.3?"light":"hot"; });
   } },
   nova: { dur: 2.4, draw: function (K, ev, e) {
    var W=ev.W, H=ev.H, x=ev.cx, y=H-58, yt=66, TH=y-yt, B=.5, a=e-B, q=k01((e-.1)/.4), i, r, S=[], t, an, v, m, z, rise=1-k01(e/.16);
    if (e<B) { // the tube whips up from below and the mercury runs to the top
     nebula(K, "hot", x, y, 50, 60+100*q, 14, 4, 1);
     th(K, x+(Math.floor(e*24)%2?q*3:-q*3), y+160*rise*rise, TH, { w: 20, R: 36, lvl: 1.04*q*q, ink: IN, sy: 1+.15*rise, red: .88 });
     return;
    }
    K.flash(.6, "hot"); K.shake(ev.box, 1.1, 12);
    m=1-k01((a-1.5)/.8); z=k01((a-1.55)/.35);
    if (a<.7) plate(K, "hot", .5*(1-a/.7), function (g) { spikes(g, x, yt+14, 30, 420, 10, a*.3, .13, 0); });
    sun(K, x, yt+14, 130*K.ease.out(k01(a/.3)), 1-k01((a-.3)/.5), [["hot", 0, .6, .88], ["light", 0, .3, .8], ["dusk", .6, 1, .75]]);
    [["light", 300, 22, .8, 0], ["hot", 440, 26, .85, .04], ["loss", 560, 20, .7, .12], ["dusk", 700, 14, .6, .22]].forEach(function (c, k) { shock(K, c[0], a, x, yt+14, c[1], c[2], c[3], .8+k*.12, c[4]); });
    shock(K, "hot", a, x, y, 220, 14, .8, .6, .1);
    r=K.rand(ev.seed ^ 5); // the glass bursts, top to bottom: shards thrown out sideways along the whole tube
    for (i=0; i<26; i++) {
     var py=yt+r()*TH, dl=(py-yt)/TH*.22, sd=r()<.5?-1:1, sz=14+r()*20, ro=r()*TAU;
     t=a-dl; an=(r()-.5)*1.6; v=180+r()*480;
     if (t>0&&t<1.7) S.push([x+sd*cos(an)*v*t*.8+(r()-.5)*20, py+sin(an)*v*t*.5+560*t*t, sz*(1-t/1.7*.5), ro+sd*9*t]);
    }
    plate(K, "night", .88, function (g) { S.forEach(function (s) { tri(g, s[0], s[1], s[2], s[3]); }); });
    plate(K, "light", .88, function (g) { S.forEach(function (s) { tri(g, s[0]-2, s[1]-2, s[2]*.5, s[3]+.2); }); });
    th(K, x, y+90*z*z, 84, { w: 20, R: 36, lvl: .5+.3*sin(tw(e)*31), ink: IN, m: m, tk: 0, jag: 1 });
    sprayer(K, x, yt+14, 70, ["hot", "loss", "light"], [200, 760], a, ev.seed+1, -PI/2, 3.8, 900);
    sprayer(K, x, y-30, 50, ["hot", "light", "dusk"], [300, 800], a-.1, ev.seed+2, -PI/2, 1.1, 800);
    [.2, .5, .8].forEach(function (f, k) { sprayer(K, W*f, -10, 28, ["loss", "hot"], [60, 260], a-.15-k*.1, ev.seed+3+k, PI/2, 1.2, 300); });
   } },
   save: { dur: 2.2, draw: function (K, ev, e) {
    var C=ev.area, big=ev.big, n=big?8:6, i, j, k, x, t0, lv, d, top, y=C.y+C.h-30, Hh=big?250:210, z=k01((e-1.85)/.35), S=[], B=[[], []], r, an, v, ag;
    if (big) K.flash(.45, "hot");
    K.shake(ev.box, .5, big?9:6);
    Q=[];
    for (i=0; i<n; i++) {
     k=i%(n/2); x=i<n/2?C.x+24+k*34:C.x+C.w-24-k*34; t0=.08*(n/2-1-k)+.04*(i<n/2?0:1); d=e-t0-.32;
     lv=d<0?K.ease.out(k01((e-t0)/.32)):.62+.38*Math.max(0, 1-d*2)+.03*sin(tw(e)*47+i);
     top=y-8-(Hh-40)*Math.min(1, lv);
     th(K, x, y+60*z*z, Hh, { w: 9, R: 16, lvl: lv, ink: big?IN:IH, m: 1-z, tk: 0 });
     if (d>0&&d<1.4&&z<1) {
      ag=d%.45; shock(K, "hot", ag, x, top, 56, 6, .85, .4); S.push([x, top-18-14*sin(ag*12), 9+5*sin(d*9+i)]);
      r=K.rand(ev.seed+i);
      for (j=0; j<10; j++) { an=-PI/2+(r()-.5)*1.5; v=140+r()*280; B[j%3?0:1].push(x+cos(an)*v*ag, top+sin(an)*v*ag+300*ag*ag, (1.6+r()*2.4)*(1-ag/.45)); }
     }
    }
    flush(K); stars(K, "light", .9, S); K.dots(K.g, "hot", .95, B[0]); K.dots(K.g, "light", .95, B[1]);
   } },
   miss: { dur: 1.2, draw: function (K, ev, e) {
    var x=Math.min(ev.W-40, ev.x+ev.w+62), y=ev.cy+28, q=K.ease.out(k01((e-.12)/.3)), z=k01((e-.85)/.35), tip=K.ease.inOut(k01((e-.4)/.45)), m=1-z;
    th(K, x+60*tip*tip, y+70*tip*tip, 170, { lvl: mix(.72, .03, q)+(e>.4?0:.02*sin(e*90)), ink: q>.45?IC:IW, m: m, rot: .5*tip, crack: k01((e-.3)/.25) });
    K.spark({ x: x, y: y-40, n: 10, ink: function (r) { return r()<.5?"light":"pop"; }, sp: [30, 90], r: [1.2, 2.4], life: [.7, .3], grav: 200, seed: ev.seed, e: e-.3 });
   } }
  }
 });
})();
