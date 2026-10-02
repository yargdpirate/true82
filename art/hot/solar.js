/* Stellar, a Heat Check pack (art/CONTRACT-FX.md): the tiers are stellar classes, halftone stars whose ink climbs the
   temperature scale. Three stars are printed once in prep (radial tone ramps, so the dots shrink outward, and a lattice
   of corona dots) and blitted; rays, flare loops, rings and debris are live plates (source-over: a screen blend per fill
   is what costs). cold: a violet dwarf goes out. warm: an orange star on its orbit. hot: a gold sun throws flare loops.
   fire: a white-gold sun and rays. nova: the star implodes, rings and star debris cross the screen (flash, shake), a
   ring nebula is left. save: dust spirals into a new star, a constellation lights. miss: a star blows off its shell. */
(function () {
 "use strict";
 var PI=Math.PI, TAU=PI*2, sin=Math.sin, cos=Math.cos, A=window.T82ART;
 var NOVAS=[["hot", 0, .8, .88], ["light", 0, .5, .75], ["dusk", .55, 1, .8]];
 // the stars: name, R, sheet side, plates [ink, tone ramp (radius in R, alpha, ...), lattice (r0, r1 in R, pitch, dot)]
 var STARS=[["w", 20, 100, [["dusk", [0, .92, .55, .88, 1, .5, 1.3, 0]], ["loss", [0, 0, .55, 0, .66, .75, 1, .7, 1.2, 0], [1.5, 2.4, 7, 2.6]]]],
  ["h", 42, 190, [["hot", [0, .94, .8, .9, 1, .7, 1.1, .25, 1.35, 0]], ["dusk", [0, 0, .4, .2, .65, .85, 1, .85, 1.25, .3, 1.45, 0]], ["loss", 0, [1.45, 2.2, 10, 3.4]]]],
  ["f", 56, 224, [["hot", [0, .94, .8, .9, 1, .72, 1.1, .3, 1.4, 0]], ["light", [0, .66, .4, .62, .55, 0]], ["dusk", [0, 0, .5, .3, .75, .88, 1, .88, 1.3, .3, 1.5, 0]], ["loss", 0, [1.4, 1.95, 13, 4.2]]]]];
 function k01(v) { return v<0?0:v>1?1:v; }
 function mix(a, b, t) { return a+(b-a)*t; }
 function pop(K, p) { return p<=0?.4:p>=1?1:.4+.6*K.ease.back(p); }
 function tw(e) { return Math.floor(e*12)/12; }
 // one plate: ink nm at cov, a hair off register (its drum's miss); lay builds the path; eo evenodd, lw a stroke's width
 function plate(K, nm, cov, lay, eo, lw) {
  var g=K.g, r=K.reg(nm);
  if (cov<.07) return;
  g.save(); g.translate(r[0], r[1]); g.beginPath(); lay(g);
  if (lw) { g.lineWidth=lw; g.lineCap=g.lineJoin="round"; g.strokeStyle=K.pat(nm, cov, g); g.stroke(); }
  else { g.fillStyle=K.pat(nm, cov, g); g.fill(eo?"evenodd":"nonzero"); }
  g.restore();
 }
 function ring(g, x, y, r0, r1) { g.moveTo(x+r1, y); g.arc(x, y, r1, 0, TAU); if (r0>.5) { g.moveTo(x+r0, y); g.arc(x, y, r0, 0, TAU); } }
 function sun(K, x, y, R, m, S) { S.forEach(function (b) { plate(K, b[0], b[3]*m, function (g) { ring(g, x, y, R*b[1], R*b[2]); }, 1); }); }
 // rings of dots r0..r1, fat inside and fine outside (rm < 0: the other way round), handed to put(dx, dy, radius)
 function lat(r0, r1, sp, rm, m, put) {
  var nr=Math.max(1, Math.round((r1-r0)/sp)), k, n, i, r, q, a;
  for (k=0; k<nr; k++) {
   r=r0+(k+.5)*(r1-r0)/nr; n=Math.max(6, Math.round(TAU*r/sp)); q=Math.abs(rm)*Math.pow(rm<0?(k+1)/nr:1-k/nr, .9)*m;
   if (q>.8) for (i=0; i<n; i++) { a=(i+(k%2)*.5)/n*TAU; put(cos(a)*r, sin(a)*r, q); }
  }
 }
 function nebula(K, ink, x, y, r0, r1, sp, rm, m) { var L=[]; lat(r0, r1, sp, rm, m, function (dx, dy, q) { L.push(x+dx, y+dy, q); }); K.dots(K.g, ink, .95, L); }
 function spiral(K, x, y, q, n, R0, R1, sq, ink, r) { // dust streaming in to (x, y) as q runs 0..1
  var L=[], i, u, p, rr, a;
  for (i=0; i<n; i++) { u=i/n; p=k01(q*1.25-u*.25); rr=(R0+R1*u)*(1-p*p); a=i%3*TAU/3+u*5+p*4; L.push(x+cos(a)*rr, y+sin(a)*rr*sq, r*(1-p*.4)); }
  K.dots(K.g, ink, .95, L);
 }
 function ko(K, ev) { var g=K.g; g.save(); g.globalCompositeOperation="destination-out"; g.fillRect(ev.x-7, ev.y+5, ev.w+14, ev.h-10); g.restore(); }
 function shock(K, ink, e, x, y, r1, w0, cov, dur, dl) { // an expanding band of ink (the kit's ring, source-over)
  var p=(e-(dl||0))/dur;
  if (p>=0&&p<=1) plate(K, ink, cov*(1-p*.8), function (g) { g.arc(x, y, 12+(r1-12)*K.ease.out(p), 0, TAU); }, 0, w0*(1-p)+1);
 }
 function spk(g, x, y, R, rot, w) { // a four-point star, concave edges
  g.moveTo(x+cos(rot)*R, y+sin(rot)*R);
  for (var i=1, a; i<=4; i++) { a=rot+i*PI/2; g.quadraticCurveTo(x+cos(a-PI/4)*R*w, y+sin(a-PI/4)*R*w, x+cos(a)*R, y+sin(a)*R); }
 }
 function stars(K, ink, cov, L, w) { plate(K, ink, cov, function (g) { L.forEach(function (q) { spk(g, q[0], q[1], q[2], q[3]||0, w||.2); }); }); }
 function loops(K, x, y, R, P, e, t0, h0, w, m, tt) { // flare loops on the limb, tapering at the feet: a wide orange one under a narrow gold one
  var H=P.map(function (a, i) { return h0*sin(PI*Math.pow(k01((e-t0-i*.06)/.7), .75)); });
  [["dusk", .62, w], ["hot", .88, w*.45]].forEach(function (c) {
   plate(K, c[0], c[1]*m, function (g) {
    P.forEach(function (a0, j) {
     var a=a0+.07*sin(tt*9+j), nx=cos(a), ny=sin(a), bx=x+nx*R*.96, by=y+ny*R*.96, h=H[j], i, t, s, cx, cy, hw, Q=[];
     if (h<3) return;
     for (i=0; i<=10; i++) {
      t=i/10; s=sin(PI*t); cx=bx+nx*h*s-ny*h*.7*(t-.5); cy=by+ny*h*s+nx*h*.7*(t-.5); hw=c[2]*(.25+.75*s)/2;
      i?g.lineTo(cx+nx*hw, cy+ny*hw):g.moveTo(cx+nx*hw, cy+ny*hw); Q.push(cx-nx*hw, cy-ny*hw);
     }
     for (i=Q.length-2; i>=0; i -= 2) g.lineTo(Q[i], Q[i+1]);
     g.closePath();
    });
   });
  });
 }
 function spikes(g, x, y, r0, r1, n, rot, wd, ph) { // every other one of n pointed rays, root half-angle wd
  for (var i=ph, a; i<n; i += 2) {
   a=rot+i/n*TAU;
   g.moveTo(x+cos(a-wd)*r0, y+sin(a-wd)*r0); g.lineTo(x+cos(a)*r1, y+sin(a)*r1); g.lineTo(x+cos(a+wd)*r0, y+sin(a+wd)*r0); g.closePath();
  }
 }
 function glints(K, ev, e, t0, t1, n, seed) { // a starfield of twinkles on twos, each in and out inside t0..t1
  var r=K.rand(seed), i, b, u, L=[], R, X, Y;
  for (i=0; i<n; i++) {
   b=t0+r()*(t1-t0)*.5; R=5+r()*9; u=k01((e-b)/((t1-t0)*.5)); X=r()*ev.W; Y=r()*ev.H;
   if (u>0&&u<1) L.push([X, Y, R*sin(PI*u)*(.6+.4*Math.abs(sin(tw(e)*13+i*2.3)))]);
  }
  stars(K, "light", .9, L);
 }
 function blit(K, nm, x, y, s, a) { // a prepped star: a straight copy at scale 1, scaled in its pop and exit
  var g=K.g, d=K.d, S=K.st[nm], c=S&&S.c;
  if (!c||!(a>.02)||!(s>.05)) return;
  g.save(); g.globalAlpha=a;
  if (s===1) { g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(c, Math.round(x*d-c.width/2), Math.round(y*d-c.height/2)); }
  else { g.imageSmoothingEnabled=false; g.translate(x, y); g.scale(s, s); g.drawImage(c, -S.w/2, -S.w/2, S.w, S.w); }
  g.restore();
 }
 A.add("hot", "solar", {
  name: "Stellar",
  by: "Halftone stars up the temperature scale: a dwarf going out, an orange star, a gold sun with flare loops, a white-gold sun with rays, a supernova of rings.",
  prep: function (K) {
   var jobs=[];
   STARS.forEach(function (S) {
    var R=S[1], W=S[2], pl=[], P=null;
    S[3].forEach(function (it) {
     jobs.push(function () {
      P=P||K.plate(W, W, W*7);
      pl.push(K.screen(P, it[0], function (g) {
       var c=W/2, s=it[1], z, i, gr;
       if (s) { z=s[s.length-2]; gr=g.createRadialGradient(c, c, 0, c, c, R*z); for (i=0; i<s.length; i += 2) gr.addColorStop(s[i]/z, "rgba(0,0,0,"+s[i+1]+")"); g.fillStyle=gr; g.fillRect(0, 0, W, W); }
       if (it[2]) { g.fillStyle="#000"; g.beginPath(); lat(it[2][0]*R, it[2][1]*R, it[2][2], it[2][3], 1, function (dx, dy, q) { g.moveTo(c+dx+q, c+dy); g.arc(c+dx, c+dy, q, 0, TAU); }); g.fill(); }
      }));
     });
    });
    jobs.push(function () {
     var cn=document.createElement("canvas"), x, r;
     cn.width=P.W; cn.height=P.H; x=cn.getContext("2d"); x.globalCompositeOperation=K.blend;
     pl.forEach(function (c, i) { r=K.reg(S[3][i][0]); x.drawImage(c, Math.round(r[0]*P.k), Math.round(r[1]*P.k)); c.width=0; });
     K.st[S[0]]={ c: cn, w: W };
    });
   });
   return jobs;
  },
  slots: {
   cold: { dur: .9, draw: function (K, ev, e) {
    var x=ev.cx, y=ev.cy-38, R=18, p=e/.13, z=k01((e-.62)/.28), yy=y, sx=1, sy=1, q, c;
    if (e<.13) { yy=y-100*(1-p*p); sx=.9; sy=1.14; }
    else if (e<.19) { sx=1.24; sy=.8; yy=y+3; }
    else { q=k01((e-.19)/.2); sx=1.24-.24*K.ease.elastic(q); sy=.8+.2*K.ease.elastic(q); }
    yy += 40*z*z; c=k01(1.1-e*1.1+.12*sin(tw(e)*70))*(1-z);
    shock(K, "pop", e, x, y+20, 62, 4, .75, .4, .13);
    nebula(K, "pop", x, yy, R*1.5, R*2.9, 7, 2.2, c);
    plate(K, "night", .88*(1-z*.5), function (g) { g.ellipse(x, yy, R*sx, R*sy, 0, 0, TAU); });
    plate(K, "pop", .62*c, function (g) { g.ellipse(x-R*.22, yy-R*.22, R*.6*sx, R*.6*sy, 0, 0, TAU); });
    stars(K, "light", .88, e>.2&&e<.6&&Math.floor(e*12)%3?[[x+30, yy-24, 11*(1-z)]]:[]);
   } },
   warm: { dur: .9, draw: function (K, ev, e) {
    var x=ev.cx, y=ev.cy-30, s=pop(K, e/.14), z=k01((e-.62)/.28), m=1-z, L=70*K.ease.out(k01(e/.2))*(1+.1*sin(tw(e)*37))*m, a=e*7-1, ox=68*s*cos(a), oy=22*s*sin(a);
    shock(K, "dusk", e, x, y, 104, 6, .75, .5);
    plate(K, "night", .88*m, function (g) { g.ellipse(x, y, 68*s, 22*s, -.5, 0, TAU); }, 0, 2.6);
    blit(K, "w", x, y, s*(1-.5*z), m);
    stars(K, "dusk", .88*m, [[x, y, L]], .16); stars(K, "hot", .88*m, [[x, y, L*.55, PI/4]], .16);
    K.dots(K.g, "loss", .95, [x+ox*.878+oy*.479, y-ox*.479+oy*.878, 5*m]);
    ko(K, ev);
   } },
   hot: { dur: 1.1, draw: function (K, ev, e) {
    var x=ev.cx, y=ev.cy-40, s=pop(K, e/.14), z=k01((e-.82)/.28), m=1-z;
    shock(K, "hot", e, x, y, 132, 8, .88, .45); shock(K, "dusk", e, x, y, 164, 5, .6, .55, .07);
    blit(K, "h", x, y, s*(1-.3*z), m);
    loops(K, x, y, 42*s*(1-.3*z), [-2.4, -.75, .45], e, .06, 68, 26, m, tw(e));
    ko(K, ev);
   } },
   fire: { dur: 1.4, draw: function (K, ev, e) {
    var x=ev.cx, y=ev.cy-50, s=pop(K, e/.15), z=k01((e-1.05)/.35), m=1-z, tt=tw(e), R=56*s*(1-.25*z);
    K.shake(ev.box, .5, 6);
    glints(K, ev, e, .1, 1.3, 12, ev.seed ^ 3);
    plate(K, "dusk", .5*m, function (g) { spikes(g, x, y, R*1.3, R*3.4*(1-z), 8, tt*.4, .15, 0); });
    plate(K, "hot", .5*m, function (g) { spikes(g, x, y, R*1.3, R*3*(1-z), 8, tt*.4, .15, 1); });
    shock(K, "hot", e, x, y, 180, 8, .9, .5); shock(K, "dusk", e, x, y, 220, 5, .65, .6, .08);
    blit(K, "f", x, y, s*(1-.25*z), m);
    loops(K, x, y, R, [-2.6, -2, -1.3, -.6, .1, .7], e, .05, 92, 30, m, tt);
    ko(K, ev);
   } },
   nova: { dur: 2.4, draw: function (K, ev, e) {
    var x=ev.cx, y=ev.cy, B=.3, a=e-B, i, q, R, m, p, an, r, D=[[], [], [], []], t, v, d, w=k01((a-.35)/.6);
    if (e<B) { // the star falls in on itself, dust streaming in
     q=e/B; blit(K, "f", x, y, mix(1.2, .1, q*q), 1); spiral(K, x, y, q, 40, 60, 190, 1, "hot", 2.6);
     return;
    }
    K.flash(.6, "hot"); K.shake(ev.box, 1.1, 12);
    m=1-k01((a-.3)/.9); R=126*K.ease.out(k01(a/.4))*(1-.5*w); q=K.ease.out(k01(a/.4))*m;
    glints(K, ev, e, .5, 2.2, 16, ev.seed ^ 3);
    if (w<1) {
     plate(K, "dusk", .55*(1-w), function (g) { spikes(g, x, y, 70, 560, 8, a*.35, .13, 0); });
     plate(K, "hot", .55*(1-w), function (g) { spikes(g, x, y, 70, 520, 8, a*.35, .13, 1); });
    }
    [["light", 280, 18, .8, 0], ["hot", 420, 22, .85, .03], ["dusk", 540, 18, .75, .12], ["loss", 660, 12, .65, .2]].forEach(function (c, k) { shock(K, c[0], a, x, y, c[1], c[2], c[3], .8+k*.12, c[4]); });
    sun(K, x, y, R, m, NOVAS);
    stars(K, "hot", .88*m, [[x, y, 250*q]], .12); stars(K, "light", .8*m, [[x, y, 125*q, a*.5]], .12);
    q=k01((a-.45)/1.6);
    if (q>0&&q<1) { v=K.ease.out(q); nebula(K, "loss", x, y, mix(90, 330, v)-60, mix(90, 330, v), 30, -6.4, 1-q); }
    r=K.rand(ev.seed+8);
    for (i=0; i<26; i++) {
     an=r()*TAU; v=mix(260, 900, r()); d=r()*.12; t=a-d; q=4+r()*r()*11;
     if (t>0&&t<1.5) { p=v*(1-Math.exp(-3*t))/3; D[i%4].push([x+cos(an)*p, y+sin(an)*p+140*t*t, q*(1-t/1.5*.6), an*3+t*(i%2?4:-4)]); }
    }
    ["hot", "dusk", "light", "loss"].forEach(function (c, k) { stars(K, c, .9, D[k]); });
    K.spark({ x: x, y: y, n: 16, ink: function (q2) { var v2=q2(); return v2<.25?"light":v2<.65?"hot":"dusk"; }, sp: [380, 980], r: [1.3, 3.4], life: [.6, .6], grav: 500, seed: ev.seed+3, streak: true, e: a });
    stars(K, "light", .88, [[x, y-52, 46*(1-k01((a-1)/1.1))*(1+.12*sin(tw(e)*40))]], .16); // the pulsar left behind
   } },
   save: { dur: 2.2, draw: function (K, ev, e) {
    var C=ev.area, x=ev.cx, y=C.y+C.h*.3, big=ev.big, tt=tw(e), B=.5, a=e-B, m=1-k01((e-1.8)/.4), i, q, S=[], p, rr, n=big?9:6;
    if (e<B) { spiral(K, x, y, e/B, 54, 40, 200, .8, "night", 2.8); return; } // dust spirals in to a point: the new star's cloud
    if (big) K.flash(.45, "hot");
    K.shake(ev.box, .5, big?9:6);
    shock(K, "hot", a, x, y, big?230:190, 9, .9, .55); shock(K, "loss", a, x, y, big?280:230, 6, .7, .65, .08);
    blit(K, "f", x, y, (big?1:.8)*pop(K, a/.16), m);
    q=(big?190:130)*K.ease.out(k01(a/.35))*m;
    stars(K, "hot", .88*m, [[x, y, q]], .13); stars(K, "light", .88*m, [[x, y, q*.4, PI/4]], .14);
    for (i=0; i<n; i++) { // the constellation: a zigzag of stars across the card, lit one by one
     p=k01((e-B-.25-i*.1)/.16); rr=k01((e-1.5-i*.04)/.2);
     if (p>0&&rr<1) S.push([C.x+C.w*(.08+.84*i/(n-1)), C.y+C.h*(.52+(i%2?-.1:.1)+.03*sin(i*2.3)), (11+5*(i%3))*pop(K, p)*(1-rr)*(.7+.3*Math.abs(sin(tt*13+i*2)))]);
    }
    stars(K, "dusk", .88, S.map(function (s) { return [s[0]+1, s[1]+1, s[2]*1.5]; }), .14); stars(K, "light", .88, S, .18);
    plate(K, "night", .88*m, function (g) { S.forEach(function (s, j) { if (j) { g.moveTo(S[j-1][0], S[j-1][1]); g.lineTo(s[0], s[1]); } }); }, 0, 2.4);
   } },
   miss: { dur: 1.2, draw: function (K, ev, e) {
    var x=ev.cx, y=ev.cy-100, B=.24, a=e-B, m=1-k01((e-.85)/.3), q, R, o;
    if (e<B) { // a shudder, the star dimming
     blit(K, "h", x+(Math.floor(e*24)%2?1.5:-1.5), y, .8, 1-.4*e/B);
     return;
    }
    q=k01(a/.85); R=mix(8, 100, K.ease.out(q)); o=m*(1-q*.6);
    shock(K, "pop", a, x, y, 70, 6, .85, .4);
    nebula(K, "pop", x, y, R-26, R, 12, -4.6, o); nebula(K, "night", x, y, R*.6-22, R*.6, 10, -3.8, o);
    plate(K, "night", .5*o, function (g) { ring(g, x, y, R-9, R+5); }, 1);
    sun(K, x, y, 10*(1-q*.5)+2, 1-k01((e-.7)/.22), [["light", 0, 1, .88], ["pop", 1, 1.7, .5]]);
   } }
  }
 });
})();
