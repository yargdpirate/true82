/* TRUE 82 ART BOT: motion capture in, live moving art out.
   Loads a Mixamo FBX (with skin), samples its animation at 24 fps, renders two masks per frame with three.js
   (a flat body and ball mask, and a lit shade pass), then prints the sequence in several styles with plain 2D
   canvas. Impressionistic on purpose: silhouettes, light and ink, never anatomy. Driven by artbot.mjs
   (Playwright): frames go back to node through window.__saveFrame. Inks come from the site's theme. */
import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

const W = 540, H = 540, FPS = 24;
let INK = null;

const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgba = (h, a) => { const c = hexRgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
const mix = (a, b, t) => { const x = hexRgb(a), y = hexRgb(b); return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
function canvas(w = W, h = H) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/* ---------- three.js: the figure and its two passes ---------- */
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(26, W / H, 1, 1e6);
const key = new THREE.DirectionalLight(0xffffff, 2.6), rim = new THREE.DirectionalLight(0xffffff, 1.7), amb = new THREE.AmbientLight(0xffffff, 0.18);
scene.add(key, rim, amb, key.target, rim.target);
const maskMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const shadeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
const ballMask = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const readC = canvas(), readG = readC.getContext("2d", { willReadFrequently: true });
function grab() { readG.clearRect(0, 0, W, H); readG.drawImage(renderer.domElement, 0, 0); return readG.getImageData(0, 0, W, H).data; }

let M = null;   // the loaded move
async function load(move) {
  if (M) { scene.remove(M.obj); scene.remove(M.ball); M = null; }   // the last move's ball goes with it
  const obj = await new FBXLoader().loadAsync(move.url);
  const clip = obj.animations.slice().sort((x, y) => y.duration - x.duration)[0];   // some exports carry an empty take first
  const mixer = new THREE.AnimationMixer(obj), action = mixer.clipAction(clip);
  action.play();
  const meshes = [], bones = {};
  obj.traverse((o) => {
    if (o.isMesh) { meshes.push(o); o.frustumCulled = false; }
    if (o.isBone) bones[o.name.replace(/^mixamorig:?/, "")] = o;
  });
  scene.add(obj);
  const at = (t) => { mixer.setTime(Math.min(t, clip.duration - 1e-4)); obj.updateMatrixWorld(true); };
  const wp = (b) => (bones[b] ? bones[b].getWorldPosition(new THREE.Vector3()) : null);
  at(0);
  const top = wp("HeadTop_End") || wp("Head"), foot = wp("LeftToeBase") || wp("LeftFoot");
  const height = Math.max(1, top.y - foot.y + 12);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(height * 0.068, 24, 16), ballMask);
  ball.visible = false; scene.add(ball);
  M = { obj, clip, mixer, meshes, bones, at, wp, height, ball, move, t0: move.trim ? move.trim[0] : 0, t1: move.trim ? move.trim[1] : clip.duration };
  // THE BALL. Modes: held (both, right, left) with an optional release on its own arc from the hand's real
  // velocity; a dribble (bounces to the floor between the hand's high points); incoming (flies in to the hand at
  // b.contact, then is caught and held, or swatted away). Sizes and gravity scale from Mixamo's ~178 cm body.
  const b = move.ball || { hold: "none" }, U = 178, G = 980;
  const side = b.side || (b.hold === "both" ? "both" : b.hold === "left" ? "left" : "right");
  const held = (sd) => {
    const r = wp("RightHandMiddle1") || wp("RightHand"), l = wp("LeftHandMiddle1") || wp("LeftHand");
    if (sd === "right") { const h = wp("RightHand"); return r.clone().add(r.clone().sub(h).multiplyScalar(0.9)); }
    if (sd === "left") { const h = wp("LeftHand"); return l.clone().add(l.clone().sub(h).multiplyScalar(0.9)); }
    return r.clone().add(l).multiplyScalar(0.5);
  };
  const handAt = (t) => { at(t); return held(side); };
  const path = [];
  let floorY = Infinity;
  for (let t = 0; t <= clip.duration; t += 1 / 60) {
    at(t); path.push({ t, p: held(side) });
    floorY = Math.min(floorY, (wp("LeftToeBase") || wp("LeftFoot")).y, (wp("RightToeBase") || wp("RightFoot")).y);
  }
  ball.geometry.dispose(); ball.geometry = new THREE.SphereGeometry(U * 0.068, 24, 16);
  const rad = U * 0.068, floor = floorY - 9 + rad * 0.95;   // the toe joints ride ~9 cm above the sole
  const contacts = [];   // the dribble's hand contacts: local highs of the hand, at least 0.25 s apart
  if (b.hold === "dribble") for (let k = 2; k < path.length - 2; k++) {
    const y = path[k].p.y;
    if (y >= path[k - 1].p.y && y >= path[k + 1].p.y && y > path[k - 2].p.y && y > path[k + 2].p.y && (!contacts.length || path[k].t - contacts[contacts.length - 1].t > 0.25)) contacts.push(path[k]);
  }
  M.contacts = contacts.map((c) => +c.t.toFixed(2));
  M.ballAt = (t) => {
    if (b.hold === "none") return null;
    if (b.hold === "dribble") {
      let k = 0; while (k < contacts.length && contacts[k].t <= t) k++;
      if (k === 0 || k === contacts.length) return handAt(t);
      const c0 = contacts[k - 1], c1 = contacts[k], u = (t - c0.t) / (c1.t - c0.t), hp = handAt(t);
      const top = u < 0.5 ? c0.p.y : c1.p.y, y = floor + (top - floor) * Math.abs(Math.cos(Math.PI * u));
      return new THREE.Vector3(c0.p.x + (c1.p.x - c0.p.x) * u, y, c0.p.z + (c1.p.z - c0.p.z) * u).lerp(new THREE.Vector3(hp.x, y, hp.z), 0.35);
    }
    if (b.hold === "catch" || b.hold === "swat") {
      const tc = b.contact, fl = b.flight || 0.5;
      if (t < tc - fl) return null;
      if (t <= tc) {   // the pass (or the shot) arriving: a flat arc from b.from (in body lengths, world axes) to the hand
        const hc = handAt(tc), p0 = hc.clone().add(new THREE.Vector3(b.from[0] * U, b.from[1] * U, b.from[2] * U)), u = (t - (tc - fl)) / fl;
        at(t); return p0.clone().lerp(hc, u).add(new THREE.Vector3(0, Math.sin(Math.PI * u) * U * (b.arc || 0.12), 0));
      }
      if (b.hold === "catch") return handAt(t);
      const hc = handAt(tc), dt = t - tc, v = new THREE.Vector3(b.away[0] * U, b.away[1] * U, b.away[2] * U);
      at(t); return hc.clone().add(v.multiplyScalar(dt)).add(new THREE.Vector3(0, -0.5 * G * dt * dt, 0));
    }
    if (b.release == null || t <= b.release) return handAt(t);
    if (!M.rel) {   // freeze the release once: position and velocity from the last 1/24 s before it
      const p0 = handAt(b.release - 1 / FPS), p1 = handAt(b.release);
      const v = p1.clone().sub(p0).multiplyScalar(FPS * (b.boost || 1.25));
      if (b.lift) v.y += b.lift * U;
      M.rel = { p: p1, v };
    }
    const dt = t - b.release;
    at(t);
    const q = M.rel.p.clone().add(M.rel.v.clone().multiplyScalar(dt)).add(new THREE.Vector3(0, -0.5 * G * dt * dt, 0));
    if (q.y < floor) {   // one bounce off the floor, then it keeps rolling away
      const vy = M.rel.v.y, a = -0.5 * G, c = M.rel.p.y - floor, disc = vy * vy - 4 * a * c, tb = (-vy - Math.sqrt(Math.max(0, disc))) / (2 * a);
      const hit = M.rel.p.clone().add(M.rel.v.clone().multiplyScalar(tb)).add(new THREE.Vector3(0, -0.5 * G * tb * tb, 0)), d2 = dt - tb;
      const vb = new THREE.Vector3(M.rel.v.x * 0.7, -(vy - G * tb) * 0.55, M.rel.v.z * 0.7);
      return hit.add(vb.clone().multiplyScalar(d2)).add(new THREE.Vector3(0, -0.5 * G * d2 * d2, 0)).setY(Math.max(floor, hit.y + vb.y * d2 - 0.5 * G * d2 * d2));
    }
    return q;
  };
  M.rel = null;
  // framing: every bone and the ball over the whole move, seen from the move's angle
  const box = new THREE.Box3();
  for (let k = 0; k <= 30; k++) {
    const t = M.t0 + (M.t1 - M.t0) * (k / 30);
    const bp = M.ballAt(t); M.at(t);
    Object.values(bones).forEach((bn) => box.expandByPoint(bn.getWorldPosition(new THREE.Vector3())));
    if (bp && !move.ballOffFrame) box.expandByPoint(bp);
  }
  box.expandByScalar(height * 0.09);
  const c = box.getCenter(new THREE.Vector3()), r = box.getBoundingSphere(new THREE.Sphere()).radius;
  const az = THREE.MathUtils.degToRad(move.az || 0), el = THREE.MathUtils.degToRad(move.el == null ? 6 : move.el);
  const d = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  const dist = (r / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * (move.zoom || 0.84);
  camera.position.copy(c).add(d.clone().multiplyScalar(dist)); camera.lookAt(c);
  camera.near = dist / 50; camera.far = dist * 50; camera.updateProjectionMatrix();
  // light from the camera's upper left (key) and from behind (rim)
  const right = new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 1, 0)).normalize();
  key.position.copy(c).add(d.clone().multiplyScalar(r * 3)).add(right.clone().multiplyScalar(-r * 2)).add(new THREE.Vector3(0, r * 2.5, 0)); key.target.position.copy(c);
  rim.position.copy(c).add(d.clone().multiplyScalar(-r * 3)).add(right.clone().multiplyScalar(r * 1.2)).add(new THREE.Vector3(0, r, 0)); rim.target.position.copy(c);
  return M;
}
// One moment: the body mask, the ball mask and the lit shade, each W*H bytes.
function passes(t) {
  const bp = M.ballAt(t); M.at(t);
  if (bp) { M.ball.position.copy(bp); M.ball.visible = true; } else M.ball.visible = false;
  M.meshes.forEach((m) => { m.userData.mat = m.userData.mat || m.material; m.material = maskMat; });
  M.ball.material = ballMask;
  renderer.render(scene, camera);
  const A = grab();
  M.meshes.forEach((m) => (m.material = shadeMat));
  const bv = M.ball.visible; M.ball.visible = false;
  renderer.render(scene, camera);
  const B = grab(); M.ball.visible = bv;
  const body = new Uint8Array(W * H), ball = new Uint8Array(W * H), shade = new Uint8Array(W * H);
  for (let i = 0, j = 0; i < W * H; i++, j += 4) { body[i] = A[j]; ball[i] = A[j + 1] > A[j] ? A[j + 1] : 0; shade[i] = body[i] > 20 ? Math.min(255, (B[j] + B[j + 1] + B[j + 2]) / 3) : 0; }
  return { body, ball, shade, bp: bp ? bp.clone().project(camera) : null };
}

/* ---------- 2D helpers ---------- */
function tint(mask, color, alpha = 1, gain = 1) {
  const c = canvas(), g = c.getContext("2d"), im = g.createImageData(W, H), [r, gg, b] = hexRgb(color);
  for (let i = 0, j = 0; i < W * H; i++, j += 4) { const a = Math.min(255, mask[i] * gain * alpha); if (a) { im.data[j] = r; im.data[j + 1] = gg; im.data[j + 2] = b; im.data[j + 3] = a; } }
  g.putImageData(im, 0, 0); return c;
}
function edges(mask, w = 2) {
  const e = new Uint8Array(W * H);
  for (let y = w; y < H - w; y++) for (let x = w; x < W - w; x++) {
    const i = y * W + x;
    if (mask[i] < 128) continue;
    if (mask[i - w] < 128 || mask[i + w] < 128 || mask[i - w * W] < 128 || mask[i + w * W] < 128) e[i] = 255;
  }
  return e;
}
function halftone(g, f, o) {   // a rotated dot screen; o.dens(i) in 0..1 per pixel index
  const ang = (o.angle * Math.PI) / 180, ca = Math.cos(ang), sa = Math.sin(ang), cell = o.cell, R = Math.hypot(W, H) / 2 + cell;
  const p = new Path2D();
  for (let v = -R; v < R; v += cell) for (let u = -R; u < R; u += cell) {
    const x = W / 2 + u * ca - v * sa, y = H / 2 + u * sa + v * ca;
    const sx = Math.round(x - (o.dx || 0)), sy = Math.round(y - (o.dy || 0));
    if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
    const dns = o.dens(sy * W + sx);
    if (dns <= 0.02) continue;
    const rr = cell * 0.56 * Math.sqrt(Math.min(1, dns));
    p.moveTo(x + rr, y); p.arc(x, y, rr, 0, Math.PI * 2);
  }
  g.fillStyle = o.ink; g.fill(p);
}

/* ---------- the styles ---------- */
const STYLES = {
  // RISO VICE: the site's duotone print. Pink body (denser where lit), aqua misregistered offset, gold ball,
  // paper tooth, a new drawing every second frame (12 a second) with a hair of registration wobble.
  riso(seq, i, g, st) {
    const k = i - (i % 2), f = seq[k], R = rng(1000 + k), jx = Math.round(R() * 2 - 1), jy = Math.round(R() * 2 - 1);
    g.globalCompositeOperation = "source-over"; g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "screen";
    halftone(g, f, { ink: INK.offset, angle: 75, cell: 7, dx: 6 + jx, dy: -5 + jy, dens: (p) => (f.body[p] > 100 ? 0.22 + 0.25 * (f.shade[p] / 255) : 0) });
    halftone(g, f, { ink: INK.accent, angle: 15, cell: 6, dx: jx, dy: jy, dens: (p) => (f.body[p] > 100 ? 0.16 + 0.84 * (f.shade[p] / 255) : 0) });
    halftone(g, f, { ink: INK.hot, angle: 45, cell: 5, dx: jx, dy: jy, dens: (p) => (f.ball[p] > 100 ? 0.95 : 0) });
    g.globalCompositeOperation = "source-over"; g.fillStyle = "rgba(0,0,0,0.55)";
    for (let n = 0; n < 2600; n++) g.fillRect((R() * W) | 0, (R() * H) | 0, 1 + (R() < 0.2), 1);
  },
  // NEON: a pink tube around the figure with a hot core, aqua light trails left behind by everything that moves.
  neon(seq, i, g, st) {
    const f = seq[i];
    if (!st.trail) { st.trail = canvas(); st.tg = st.trail.getContext("2d"); }
    const tg = st.tg;
    tg.globalCompositeOperation = "source-over"; tg.fillStyle = "rgba(0,0,0,0.17)"; tg.fillRect(0, 0, W, H);
    tg.globalCompositeOperation = "lighter";
    tg.drawImage(tint(edges(f.body, 2), INK.offset, 0.55), 0, 0);
    tg.drawImage(tint(f.ball, INK.hot, 0.5), 0, 0);
    g.globalCompositeOperation = "source-over"; g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "lighter";
    g.filter = "blur(9px)"; g.drawImage(st.trail, 0, 0); g.filter = "none"; g.drawImage(st.trail, 0, 0);
    g.drawImage(tint(f.body, INK.accent, 0.1), 0, 0);
    const tube = tint(edges(f.body, 3), INK.accent, 1);
    g.filter = "blur(7px)"; g.drawImage(tube, 0, 0); g.drawImage(tube, 0, 0); g.filter = "none";
    g.drawImage(tube, 0, 0); g.drawImage(tint(edges(f.body, 1), INK.accentHi, 0.9), 0, 0);
    const ball = tint(f.ball, INK.hot, 1);
    g.filter = "blur(8px)"; g.drawImage(ball, 0, 0); g.filter = "none"; g.drawImage(ball, 0, 0);
  },
  // CHRONO: Marey's chronophotograph. Every third moment stays on the plate, aqua at the start to pink now,
  // so the move draws its own arc; the ball leaves a gold dotted path.
  chrono(seq, i, g, st) {
    g.globalCompositeOperation = "source-over"; g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "screen";
    const n = seq.length - 1;
    for (let k = 0; k < i; k += 3) g.drawImage(tint(seq[k].body, mix(INK.offset, INK.accent, k / n), 0.2 + 0.35 * (k / Math.max(1, i))), 0, 0);
    const f = seq[i];
    g.drawImage(tint(f.body, INK.accentHi, 0.92), 0, 0);
    g.drawImage(tint(edges(f.body, 1), "#ffffff", 0.7), 0, 0);
    g.fillStyle = INK.hot;
    for (let k = 0; k <= i; k += 2) { const b = seq[k].bp; if (b) { g.beginPath(); g.arc((b.x * 0.5 + 0.5) * W, (-b.y * 0.5 + 0.5) * H, k === i ? 7 : 2.6, 0, Math.PI * 2); g.fill(); } }
  },
  // SUNSET: the synthwave poster. A striped sun and a neon grid; the player is a pure black cutout with an aqua rim.
  sunset(seq, i, g, st) {
    if (!st.bg) {
      st.bg = canvas(); const b = st.bg.getContext("2d");
      const sky = b.createLinearGradient(0, 0, 0, H * 0.72);
      sky.addColorStop(0, INK.ground); sky.addColorStop(0.55, mix(INK.ground, INK.accent, 0.35)); sky.addColorStop(1, mix(INK.accent, INK.hot, 0.25));
      b.fillStyle = sky; b.fillRect(0, 0, W, H * 0.72);
      const cx = W / 2, cy = H * 0.5, r = W * 0.3, sun = b.createLinearGradient(0, cy - r, 0, cy + r);
      sun.addColorStop(0, INK.hot); sun.addColorStop(0.55, mix(INK.hot, INK.accent, 0.6)); sun.addColorStop(1, INK.accent);
      b.save(); b.beginPath(); b.arc(cx, cy, r, 0, Math.PI * 2); b.clip(); b.fillStyle = sun; b.fillRect(cx - r, cy - r, 2 * r, 2 * r);
      b.globalCompositeOperation = "destination-out";
      for (let k = 0; k < 7; k++) { const y = cy + r * (0.05 + k * 0.14), h = 2 + k * 2.2; b.fillRect(cx - r, y, 2 * r, h); }
      b.restore();
      b.globalCompositeOperation = "destination-over"; b.fillStyle = sky; b.fillRect(0, 0, W, H * 0.72); b.globalCompositeOperation = "source-over";
      const hz = H * 0.72; b.fillStyle = INK.overlay; b.fillRect(0, hz, W, H - hz);
      b.strokeStyle = rgba(INK.accent, 0.8); b.lineWidth = 1.5; b.shadowColor = INK.accent; b.shadowBlur = 8;
      for (let k = -12; k <= 12; k++) { b.beginPath(); b.moveTo(W / 2 + k * 8, hz); b.lineTo(W / 2 + k * 90, H); b.stroke(); }
      for (let k = 0; k < 9; k++) { const y = hz + Math.pow(k / 8, 2.2) * (H - hz); b.beginPath(); b.moveTo(0, y); b.lineTo(W, y); b.stroke(); }
      b.shadowBlur = 0; b.fillStyle = rgba(INK.accentHi, 0.9); b.fillRect(0, hz - 1, W, 2);
    }
    const f = seq[i];
    g.globalCompositeOperation = "source-over"; g.drawImage(st.bg, 0, 0);
    g.drawImage(tint(f.body, INK.overlay, 1, 1.4), 0, 0);
    g.drawImage(tint(f.ball, INK.overlay, 1, 1.4), 0, 0);
    const rimC = tint(edges(f.body, 2), INK.offset, 1);
    g.globalCompositeOperation = "lighter"; g.filter = "blur(4px)"; g.drawImage(rimC, 0, 0); g.filter = "none"; g.drawImage(rimC, 0, 0);
    g.drawImage(tint(edges(f.ball, 2), INK.hot, 1), 0, 0);
  },
  // DOTS: the arena board. The figure in lit pink dots on a dark field of unlit ones; the ball in gold.
  dots(seq, i, g, st) {
    const f = seq[i], cell = 9;
    g.globalCompositeOperation = "source-over"; g.fillStyle = "#07060f"; g.fillRect(0, 0, W, H);
    const lit = canvas(), lg = lit.getContext("2d"), off = new Path2D(), pink = new Path2D(), gold = new Path2D();
    for (let y = cell / 2; y < H; y += cell) for (let x = cell / 2; x < W; x += cell) {
      const p = (y | 0) * W + (x | 0), bd = f.body[p], bl = f.ball[p];
      if (bl > 100) { gold.moveTo(x + 3.9, y); gold.arc(x, y, 3.9, 0, 7); }
      else if (bd > 100) { const r = 1.4 + 2.7 * (0.3 + 0.7 * f.shade[p] / 255); pink.moveTo(x + r, y); pink.arc(x, y, r, 0, 7); }
      else { off.moveTo(x + 1.3, y); off.arc(x, y, 1.3, 0, 7); }
    }
    g.fillStyle = rgba(INK.line, 0.9); g.fill(off);
    lg.fillStyle = INK.accent; lg.fill(pink); lg.fillStyle = INK.hot; lg.fill(gold);
    g.globalCompositeOperation = "lighter"; g.filter = "blur(6px)"; g.drawImage(lit, 0, 0); g.filter = "none"; g.drawImage(lit, 0, 0);
  },
  // VHS: a 1986 broadcast. Lit silhouette, pink and aqua pulled apart, scanlines, a tracking tear now and then.
  vhs(seq, i, g, st) {
    const f = seq[i], R = rng(4242 + i);
    g.globalCompositeOperation = "source-over"; g.fillStyle = "#0a0816"; g.fillRect(0, 0, W, H);
    const lit = canvas(), lg = lit.getContext("2d"), im = lg.createImageData(W, H), c = hexRgb(INK.accentHi);
    for (let p = 0, j = 0; p < W * H; p++, j += 4) { const s = f.shade[p] / 255, a = f.body[p]; if (a) { im.data[j] = c[0] * (0.35 + 0.65 * s); im.data[j + 1] = c[1] * (0.35 + 0.65 * s); im.data[j + 2] = c[2] * (0.35 + 0.65 * s); im.data[j + 3] = a; } }
    lg.putImageData(im, 0, 0); lg.drawImage(tint(f.ball, INK.hot), 0, 0);
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = 0.85; g.drawImage(tint(f.body, INK.accent, 0.8), -6, 0); g.drawImage(tint(f.body, INK.offset, 0.8), 6, 0); g.globalAlpha = 1;
    g.filter = "blur(0.7px)"; g.drawImage(lit, 0, 0); g.filter = "none";
    g.globalCompositeOperation = "source-over";
    if (i % 17 > 12) {   // the tracking tear
      const y0 = (R() * (H - 60)) | 0, hh = 18 + ((R() * 40) | 0), band = g.getImageData(0, y0, W, hh);
      g.putImageData(band, ((R() - 0.5) * 34) | 0, y0);
      g.fillStyle = "rgba(255,255,255,0.12)"; for (let n = 0; n < 500; n++) g.fillRect((R() * W) | 0, y0 + ((R() * hh) | 0), 2 + ((R() * 6) | 0), 1);
    }
    g.fillStyle = "rgba(0,0,0,0.33)"; for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
    g.fillStyle = "rgba(255,255,255,0.08)"; for (let n = 0; n < 900; n++) g.fillRect((R() * W) | 0, (R() * H) | 0, 1, 1);
    g.fillStyle = rgba("#ffffff", 0.82); g.font = "bold 18px monospace"; g.fillText("PLAY ▶", 22, 36);
  }
};

/* ---------- the run: sample, print every style, hand frames to node ---------- */
async function run(move, inks, styles) {
  INK = inks;
  await load(move);
  const n = Math.max(2, Math.round((M.t1 - M.t0) * FPS)), seq = [];
  for (let i = 0; i < n; i++) seq.push(passes(M.t0 + i / FPS));
  const out = canvas(), g = out.getContext("2d");
  const report = { frames: n, duration: M.t1 - M.t0, height: M.height, styles: [] };
  for (const s of styles) {
    const st = {};
    for (let i = 0; i < n; i++) {
      g.save(); STYLES[s](seq, i, g, st); g.restore();
      await window.__saveFrame(move.id, s, i, out.toDataURL("image/png"));
    }
    report.styles.push(s);
  }
  return report;
}
// A quick look at one move before the full run: its duration, the bones it has, a few contact frames.
async function inspect(move, inks) {
  INK = inks;
  await load(move);
  return { duration: M.clip.duration, height: M.height, bones: Object.keys(M.bones).slice(0, 80) };
}
// A contact sheet: n moments across the whole clip (or the trim), body in pink with the ball in gold, times stamped.
async function contact(move, n = 16) {
  INK = { accent: "#FF48B0", hot: "#FFD54A" };
  await load(move);
  const cols = 4, rows = Math.ceil(n / cols), cw = 180, ch = 180, sheet = canvas(cols * cw, rows * ch), g = sheet.getContext("2d");
  g.fillStyle = "#111"; g.fillRect(0, 0, sheet.width, sheet.height);
  for (let k = 0; k < n; k++) {
    const t = M.t0 + (M.t1 - M.t0 - 0.001) * (k / (n - 1)), f = passes(t);
    const c = canvas(), cg = c.getContext("2d");
    cg.drawImage(tint(f.body, "#FF48B0"), 0, 0); cg.drawImage(tint(f.ball, "#FFD54A"), 0, 0);
    g.drawImage(c, (k % cols) * cw, ((k / cols) | 0) * ch, cw, ch);
    g.fillStyle = "#fff"; g.font = "13px monospace"; g.fillText(t.toFixed(2) + "s", (k % cols) * cw + 6, ((k / cols) | 0) * ch + 16);
  }
  return sheet.toDataURL("image/png");
}
window.ARTBOT = { run, inspect, contact, STYLES: Object.keys(STYLES) };
window.ARTBOT_READY = true;
