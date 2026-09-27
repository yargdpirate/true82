/* TRUE 82 ART BOT, round 2: motion capture in, live moving art out.
   The owner on the first reel (2026-09-26): riso for all of them, neon kept as the other look; the dribble
   head-on like Mixamo shows it, turned into crossovers and a between-the-legs for the guard; a hoop for the slam,
   the block and the alley-oop, with someone attacking the rim on the block and the arms changed at the end of
   the dunk; joy dropped; and "we have to put these characters in basketball clothes because right now they look
   like fembots". Mixamo's motion is the starting point, not the ground truth.
   What this file does, per scene: loads the Mixamo figures (their X Bot body), dresses each in a generated
   uniform (a loose jersey with a number, baggy shorts to the knee, socks, high-tops, a headband, wristbands) and
   squares the shoulders; poses them from the capture with three changes laid on top (a mirrored copy of the
   motion blended in, two-bone arm reaching for rims and balls, a vertical stretch of a jump); builds the hoop
   (rim, glass, net that gives when the ball goes through) and the ball (seams, spin); then renders each moment
   as layer masks (an ID pass at twice the size, no antialiasing, averaged down) plus a lit shade pass, and prints
   them in the styles below with plain 2D canvas. Driven by artbot.mjs (Playwright); frames go back to node
   through window.__saveFrame. Inks come from the site's theme (tools/theme-core.js). */
import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

THREE.ColorManagement.enabled = false;
let W = 720, H = 720, S = 1;   // S scales the styles' pixel sizes (their numbers are tuned at 540)
const FPS = 24, BALL_R = 12, G = 980;
let INK = null;

const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgba = (h, a) => { const c = hexRgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
const mix = (a, b, t) => { const x = hexRgb(a), y = hexRgb(b); return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
function canvas(w = W, h = H) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/* ---------- renderer, scene, the two passes ---------- */
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(26, 1, 5, 1e5);
const key = new THREE.DirectionalLight(0xffffff, 2.5), fill = new THREE.DirectionalLight(0xffffff, 1.5), amb = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(key, fill, amb, key.target, fill.target);
let idRT = null, idBuf = null;
function setSize(px) {
  W = H = px; S = px / 540; renderer.setSize(W, H);
  if (idRT) idRT.dispose();
  idRT = new THREE.WebGLRenderTarget(W * 2, H * 2, { samples: 0, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
  idBuf = new Uint8Array(W * 2 * H * 2 * 4);
}
const readC = document.createElement("canvas");
function grab() { readC.width = W; readC.height = H; const g = readC.getContext("2d", { willReadFrequently: true }); g.drawImage(renderer.domElement, 0, 0); return g.getImageData(0, 0, W, H).data; }

// The layers every scene can print. Figure layers repeat per cast member (a = the hero, b = the rival).
const LAYERS = ["skinA", "kitA", "pantsA", "trimA", "numA", "skinB", "kitB", "pantsB", "trimB", "numB", "ball", "seam", "rim", "net", "board", "mark"];
const LID = {}; LAYERS.forEach((n, i) => (LID[n] = i + 1));
const idColor = (id) => new THREE.Color((id * 8) / 255, 0, 0);
const SHADE = new THREE.MeshLambertMaterial({ color: 0xffffff });
const SHADE_DIM = new THREE.MeshLambertMaterial({ color: 0x777777 });
function tagMesh(m, layer, opts = {}) {   // a mesh's two materials: its flat ID and its shade
  m.userData.idMat = opts.idMat || new THREE.MeshBasicMaterial({ color: idColor(LID[layer]) });
  if (opts.glass) { m.userData.idMat.depthWrite = false; m.renderOrder = -1; }
  m.userData.shadeMat = opts.noShade ? null : (opts.shade || SHADE);
  m.userData.layer = layer; m.frustumCulled = false;
  return m;
}
function idTexture(w, h, base, draw) {   // a flat ID map: every texel is one layer's ID color (nearest, no mips)
  const c = canvas(w, h), g = c.getContext("2d");
  g.fillStyle = `rgb(${LID[base] * 8},0,0)`; g.fillRect(0, 0, w, h);
  draw(g, (layer) => `rgb(${LID[layer] * 8},0,0)`);
  const t = new THREE.CanvasTexture(c); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace;
  return t;
}
// One moment: every layer's coverage (0..255, W*H) and the lit shade.
function passes() {
  const meshes = []; scene.traverse((o) => { if (o.isMesh && o.visible && o.userData.idMat) meshes.push(o); });
  const hide = [];
  meshes.forEach((m) => (m.material = m.userData.idMat));
  renderer.setRenderTarget(idRT); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
  renderer.readRenderTargetPixels(idRT, 0, 0, W * 2, H * 2, idBuf); renderer.setRenderTarget(null);
  meshes.forEach((m) => { if (m.userData.shadeMat) m.material = m.userData.shadeMat; else { m.visible = false; hide.push(m); } });
  renderer.render(scene, camera);
  const sh = grab(); hide.forEach((m) => (m.visible = true));
  const L = {}; LAYERS.forEach((n) => (L[n] = null));
  const W2 = W * 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = y * W + x;
    for (let k = 0; k < 4; k++) {
      const sx = x * 2 + (k & 1), sy = y * 2 + (k >> 1), r = idBuf[((H * 2 - 1 - sy) * W2 + sx) * 4];
      const id = Math.round(r / 8);
      if (!id || id > LAYERS.length) continue;
      const n = LAYERS[id - 1]; if (!L[n]) L[n] = new Uint8Array(W * H);
      L[n][o] += 63;
    }
  }
  const shade = new Uint8Array(W * H);
  for (let i = 0, j = 0; i < W * H; i++, j += 4) shade[i] = (sh[j] + sh[j + 1] + sh[j + 2]) / 3;
  const Z = new Uint8Array(W * H);
  LAYERS.forEach((n) => { if (!L[n]) L[n] = Z; });
  return { L, shade };
}

/* ---------- the figure: a Mixamo body, dressed ---------- */
const LOADER = new FBXLoader();
const SIDES = ["Left", "Right"];
const other = (n) => (n.startsWith("Left") ? "Right" + n.slice(4) : n.startsWith("Right") ? "Left" + n.slice(5) : n);

async function makeFigure(url, o) {
  const obj = await LOADER.loadAsync(url);
  const clip = obj.animations.slice().sort((a, b) => b.duration - a.duration)[0];   // some exports carry an empty take first
  const mixer = new THREE.AnimationMixer(obj); mixer.clipAction(clip).play();
  const B = {}, order = [];
  obj.traverse((n) => { if (n.isBone) { const k = n.name.replace(/^mixamorig:?/, ""); if (!B[k]) { B[k] = n; order.push(k); } } });   // the animated joint (a same-named leaf under it is the skin's)
  let surface = null; const skins = [];
  obj.traverse((m) => { if (m.isSkinnedMesh) { m.frustumCulled = false; skins.push(m); if (/Surface/.test(m.name)) surface = m; } });   // the X Bot is a body with holes at the joints and rings that fill them: both are skin
  // rest pose, before any animation: local rotations and model-space rotations (for the mirror)
  const R = {};
  const restQ = {}; order.forEach((k) => (restQ[k] = B[k].quaternion.clone()));
  order.forEach((k) => { const p = B[k].parent; const pk = p && p.isBone ? p.name.replace(/^mixamorig:?/, "") : null; R[k] = (pk && R[pk] ? R[pk].clone() : new THREE.Quaternion()).multiply(restQ[k]); });
  const parentOf = {}; order.forEach((k) => { const p = B[k].parent; parentOf[k] = p && p.isBone ? p.name.replace(/^mixamorig:?/, "") : null; });
  // a basketball body: squarer shoulders, a slightly smaller head (the X Bot's proportions read as a mannequin)
  SIDES.forEach((s) => B[s + "Arm"].position.multiplyScalar(o.shoulders || 1.24));
  B.Head.scale.setScalar(o.head || 0.93);
  const root = new THREE.Group(); root.add(obj); scene.add(root);
  const fig = { obj, root, clip, mixer, B, order, R, parentOf, surface, o, layer: o.layer || "A", mods: [] };
  skins.sort((a, b) => (b === surface) - (a === surface)).forEach((m) => dress(fig, m, m === surface));   // the body first: it sets the jersey's hang
  return fig;
}

// The uniform. Every piece is a shell of the body's own skin, pushed out and re-weighted, so it moves with
// the capture: a jersey that hangs straight from the chest (it hides the X Bot's waist), shorts that flare to
// the knee and swing with the thigh, high socks, high-tops, a headband and wristbands. The jersey carries a
// number (front and back) through a flat ID map projected in the rest pose.
function dress(fig, sm, main) {
  const g = sm.geometry, P = g.attributes.position, N = g.attributes.normal, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
  const names = sm.skeleton.bones.map((b) => b.name.replace(/^mixamorig:?/, "")), bi = {}; names.forEach((n, i) => (bi[n] = i));
  const idx = g.index ? g.index.array : null, nTri = idx ? idx.length / 3 : P.count / 3, vi = (t, k) => (idx ? idx[t * 3 + k] : t * 3 + k);
  const dom = new Array(P.count);
  for (let i = 0; i < P.count; i++) { let b = 0, w = -1; for (let k = 0; k < 4; k++) { const ww = SW.getComponent(i, k); if (ww > w) { w = ww; b = SI.getComponent(i, k); } } dom[i] = names[b]; }
  const p = (i) => V(P.getX(i), P.getY(i), P.getZ(i)), n = (i) => V(N.getX(i), N.getY(i), N.getZ(i));
  const L = fig.layer, num = fig.o.number || "82";
  // rest landmarks (model space, cm): hips joint 104, legs at x = +-8.2 from 97.5 (hip) to 53.2 (knee)
  const HIPJ = { Left: V(8.2, 97.5, 0), Right: V(-8.2, 97.5, 0) }, KNEE = { Left: V(8.2, 53.2, 0.3), Right: V(-8.2, 53.2, 0.3) };
  const isSide = (d, s) => d.startsWith(s);
  // welded vertex ids (the FBX body is a triangle soup): what an edge band needs to know its neighbors
  const wid = new Int32Array(P.count), wmap = new Map();
  for (let i = 0; i < P.count; i++) { const k = Math.round(P.getX(i) * 50) + "," + Math.round(P.getY(i) * 50) + "," + Math.round(P.getZ(i) * 50); if (!wmap.has(k)) wmap.set(k, wmap.size); wid[i] = wmap.get(k); }
  // the triangles of a region within `depth` rings of its edge (only edge points where `where(y)` holds)
  function band(pick, depth, where) {
    const inT = new Uint8Array(nTri), inW = new Uint8Array(wmap.size), outW = new Uint8Array(wmap.size), dist = new Int16Array(wmap.size).fill(99);
    for (let t = 0; t < nTri; t++) { const v3 = [vi(t, 0), vi(t, 1), vi(t, 2)]; inT[t] = v3.every(pick) ? 1 : 0; v3.forEach((v) => ((inT[t] ? inW : outW)[wid[v]] = 1)); }
    for (let i = 0; i < P.count; i++) if (inW[wid[i]] && outW[wid[i]] && where(P.getY(i), P.getX(i), P.getZ(i))) dist[wid[i]] = 0;
    for (let d = 0; d < depth; d++) for (let t = 0; t < nTri; t++) if (inT[t]) {
      const w3 = [wid[vi(t, 0)], wid[vi(t, 1)], wid[vi(t, 2)]]; if (w3.some((w) => dist[w] === d)) w3.forEach((w) => { if (dist[w] > d + 1) dist[w] = d + 1; });
    }
    return (t) => inT[t] && [0, 1, 2].some((k) => dist[wid[vi(t, k)]] < depth);
  }
  function build(layer, pick, move, reweight, mat, triOK) {
    const pos = [], nrm = [], si = [], sw = [], uv = [], mv = new Map();
    const at = (i) => { if (!mv.has(i)) mv.set(i, move(i)); return mv.get(i); };
    for (let t = 0; t < nTri; t++) {
      const a = vi(t, 0), b = vi(t, 1), c = vi(t, 2);
      if (triOK ? !triOK(t) : (!pick(a) || !pick(b) || !pick(c))) continue;
      const side = (N.getZ(a) + N.getZ(b) + N.getZ(c)) >= 0 ? 0 : 1;   // the jersey's number map: front or back half
      for (const i of [a, b, c]) {
        const q = at(i); pos.push(q.x, q.y, q.z); nrm.push(N.getX(i), N.getY(i), N.getZ(i));
        let w = [SW.getComponent(i, 0), SW.getComponent(i, 1), SW.getComponent(i, 2), SW.getComponent(i, 3)], s4 = [SI.getComponent(i, 0), SI.getComponent(i, 1), SI.getComponent(i, 2), SI.getComponent(i, 3)];
        if (reweight) [s4, w] = reweight(i, s4, w);
        si.push(...s4); sw.push(...w);
        uv.push(side ? 0.75 - q.x / 100 : 0.25 + q.x / 100, (q.y - 88) / 64);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
    geo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    const m = new THREE.SkinnedMesh(geo, SHADE); m.bind(sm.skeleton, sm.bindMatrix); sm.parent.add(m);
    tagMesh(m, layer, mat || {}); return m;
  }
  tagMesh(sm, "skin" + L);
  // THE JERSEY: torso and the tank straps; hangs straight below the chest to the hem, a scoop at the neck
  const inJersey = (i) => {
    const d = dom[i], y = P.getY(i), x = Math.abs(P.getX(i));
    if (/^Spine/.test(d) || (d === "Neck" && y < 147)) return !(y > 145.5 && P.getZ(i) > 2 && x < 6.5);   // a shallow crew neck
    if (d === "Hips" || /UpLeg$/.test(d)) return y >= 98;   // the hem goes all the way round, over the hip bones too
    if (/Shoulder$/.test(d)) return x < 14.5;   // the pecs and the traps ride the clavicles
    return false;
  };
  const zc = -1;
  if (main) {   // the chest's outline (radius by angle, smoothed): the jersey hangs straight down from it
    const chest = new Float32Array(36);
    for (let i = 0; i < P.count; i++) if (inJersey(i) && P.getY(i) > 124 && P.getY(i) < 140) {
      const a = Math.atan2(P.getX(i), P.getZ(i) - zc), r = Math.hypot(P.getX(i), P.getZ(i) - zc), k = ((Math.round(a / (Math.PI / 18)) % 36) + 36) % 36;
      chest[k] = Math.max(chest[k], r);
    }
    for (let pass = 0; pass < 3; pass++) { const c2 = chest.slice(); for (let k = 0; k < 36; k++) chest[k] = Math.max(c2[k], (c2[(k + 35) % 36] + 2 * c2[k] + c2[(k + 1) % 36]) / 4); }
    fig.chestR = (a) => { const f = (((a / (Math.PI / 18)) % 36) + 36) % 36, k = Math.floor(f), u = f - k; return lerp(chest[k], chest[(k + 1) % 36], u); };
    fig.numTex = idTexture(512, 256, "kit" + L, (gg, col) => {
      gg.fillStyle = col("num" + L); gg.textAlign = "center"; gg.textBaseline = "middle";
      gg.font = "900 48px Impact, 'Arial Black', sans-serif"; gg.fillText(num, 128, 256 * (1 - (128 - 88) / 64));   // chest
      gg.font = "900 92px Impact, 'Arial Black', sans-serif"; gg.fillText(num, 384, 256 * (1 - (120 - 88) / 64));   // back
    });
  }
  const chestR = fig.chestR, numTex = fig.numTex;
  const jerseyAt = (i, extra = 0) => {
    const q = p(i), y = q.y, a = Math.atan2(q.x, q.z - zc), r = Math.hypot(q.x, q.z - zc);
    const hang = smooth(138, 124, y), flare = 0.9 * smooth(126, 98, y), over = 1.9 * smooth(108, 99, y);   // over: the hem always outside the shorts
    const r2 = Math.max(r + 1.3 + over, lerp(r + 1.3 + over, chestR(a) + 1.3 + flare + over, hang)) + extra;
    return V(r2 * Math.sin(a), y - (y < 99 ? 1.5 : 0), zc + r2 * Math.cos(a));
  };
  build("kit" + L, inJersey, (i) => jerseyAt(i), null, { idMat: new THREE.MeshBasicMaterial({ map: numTex }) });
  build("trim" + L, inJersey, (i) => jerseyAt(i, 0.45), null, null, band(inJersey, 1, (y) => y > 118));   // piping: arm holes and the neck
  // THE SHORTS: hips and thighs down past the knee; the hem swings with the thigh (the shin's share of weight moves up)
  const inShorts = (i) => { const d = dom[i], y = P.getY(i); return (d === "Hips" && y < 109) || /UpLeg$/.test(d) || (/Leg$/.test(d) && !/UpLeg$/.test(d) && y > 50); };
  const shortsAt = (i, extra = 0) => {
    const q = p(i), s = q.x >= 0 ? "Left" : "Right", a = HIPJ[s], b = KNEE[s], ab = b.clone().sub(a), u = clamp(q.clone().sub(a).dot(ab) / ab.lengthSq(), -0.4, 1.25);
    const ax = a.clone().add(ab.clone().multiplyScalar(u)), d = q.clone().sub(ax), r = d.length() || 1;
    const R2 = lerp(10.5, 13.6, clamp(u, 0, 1.1)) + extra, leg = ax.add(d.multiplyScalar(Math.max(r + 1.6 + extra, R2) / r));
    const cyl = (() => { const a2 = Math.atan2(q.x, q.z - zc), rr = Math.hypot(q.x, q.z - zc), band = smooth(92, 101, q.y);
      const r3 = Math.max(rr + 2, lerp(rr + 2, chestR(a2) + 1.2, band)); return V(r3 * Math.sin(a2), q.y, zc + r3 * Math.cos(a2)); })();
    const w = smooth(97, 86, q.y);
    return cyl.lerp(leg, w).add(V(0, q.y > 104 ? 1.2 : 0, 0));
  };
  const toThigh = (i, s4, w) => {
    const y = P.getY(i); if (y > 75) return [s4, w];
    const side = P.getX(i) >= 0 ? "Left" : "Right", up = bi[side + "UpLeg"], lo = bi[side + "Leg"];
    let moved = 0; const w2 = w.slice();
    for (let k = 0; k < 4; k++) if (s4[k] === lo) { moved += w2[k]; w2[k] = 0; }
    let put = false; for (let k = 0; k < 4; k++) if (s4[k] === up) { w2[k] += moved; put = true; }
    if (!put) { let k0 = w2.indexOf(Math.min(...w2)); s4 = s4.slice(); s4[k0] = up; w2[k0] = moved; }
    return [s4, w2];
  };
  build("pants" + L, inShorts, (i) => shortsAt(i), toThigh);
  build("trim" + L, inShorts, (i) => shortsAt(i, 0.45), toThigh, null, band(inShorts, 3, (y) => y < 70));   // the stripe at the hem
  // SOCKS, HIGH-TOPS, HEADBAND, WRISTBANDS: the trim
  const along = (i, dd) => p(i).add(n(i).multiplyScalar(dd));
  build("trim" + L, (i) => /Leg$/.test(dom[i]) && !/UpLeg$/.test(dom[i]) && P.getY(i) > 13 && P.getY(i) < 33, (i) => along(i, 0.55));
  build("trim" + L, (i) => /Foot$|ToeBase$/.test(dom[i]) || (/Leg$/.test(dom[i]) && !/UpLeg$/.test(dom[i]) && P.getY(i) <= 14), (i) => {
    const q = along(i, 1.5); if (q.y < 2) q.y -= 1.2; q.x += (q.x > 0 ? 1 : -1) * 0.8; return q;
  });
  if (main) {   // THE HEADBAND: an ellipse fitted to the head at the brow, a rigid ring on the head joint
    let xm = 0, z0 = 1e9, z1 = -1e9;
    for (let i = 0; i < P.count; i++) if (dom[i] === "Head" && P.getY(i) > 169 && P.getY(i) < 173) { xm = Math.max(xm, Math.abs(P.getX(i))); z0 = Math.min(z0, P.getZ(i)); z1 = Math.max(z1, P.getZ(i)); }
    const ring = new THREE.CylinderGeometry(1, 1, 4.2, 40, 1, true); ring.scale(xm + 0.9, 1, (z1 - z0) / 2 + 0.9); ring.translate(0, 171, (z0 + z1) / 2);
    const head = fig.B.Head, s0 = head.scale.clone(); head.scale.set(1, 1, 1); fig.obj.updateMatrixWorld(true);
    ring.applyMatrix4(head.matrixWorld.clone().invert()); head.scale.copy(s0); fig.obj.updateMatrixWorld(true);   // placed against the unscaled head
    const band = tagMesh(new THREE.Mesh(ring, SHADE), "trim" + L); band.userData.idMat.side = THREE.DoubleSide; head.add(band);
  }
  SIDES.forEach((s) => {
    const hx = s === "Left" ? 71.3 : -71.3;
    build("trim" + L, (i) => dom[i] === s + "ForeArm" && Math.abs(P.getX(i) - hx) < 7.5, (i) => along(i, 0.9));
  });
}

/* ---------- posing: the capture, then the scene's changes ---------- */
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const mirrorQ = (q) => new THREE.Quaternion(q.x, -q.y, -q.z, q.w);
function modelQs(fig) {   // every animated joint's rotation in the figure's own space
  const Q = {};
  fig.order.forEach((k) => { const pk = fig.parentOf[k]; Q[k] = (pk ? Q[pk].clone() : new THREE.Quaternion()).multiply(fig.B[k].quaternion); });
  return Q;
}
function setModelQs(fig, Q) {
  fig.order.forEach((k) => { const pk = fig.parentOf[k]; fig.B[k].quaternion.copy(pk ? Q[pk].clone().invert().multiply(Q[k]) : Q[k]); });
}
// The mirror image of the current pose (left and right swapped), blended in by w: a right-hand dribble becomes
// a left-hand one, and the blend between them is the crossover's weight shift.
function mirrorBlend(fig, w) {
  if (w <= 0) return;
  const Q = modelQs(fig), M = {};
  fig.order.forEach((k) => {
    const c = other(k); if (!Q[c]) { M[k] = Q[k]; return; }
    const d = Q[c].clone().multiply(fig.R[c].clone().invert());
    M[k] = mirrorQ(d).multiply(fig.R[k]);
  });
  const out = {}; fig.order.forEach((k) => (out[k] = Q[k].clone().slerp(M[k], w)));
  setModelQs(fig, out);
  const h = fig.B.Hips.position; h.x = lerp(h.x, -h.x, w);
}
// Two-bone reach (shoulder, elbow, wrist) for the wrist to `target` (world), the elbow bending toward `pole`.
function reach(fig, side, target, pole, w) {
  if (w <= 0) return;
  const up = fig.B[side + "Arm"], lo = fig.B[side + "ForeArm"], end = fig.B[side + "Hand"];
  fig.root.updateMatrixWorld(true);
  const a = up.getWorldPosition(V()), b = lo.getWorldPosition(V()), c = end.getWorldPosition(V());
  const l1 = a.distanceTo(b), l2 = b.distanceTo(c);
  const tgt = c.clone().lerp(target, w), d = tgt.clone().sub(a), dist = clamp(d.length(), Math.abs(l1 - l2) + 0.1, (l1 + l2) * 0.998); d.normalize();
  const cosA = clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  const pd = pole.clone().sub(a); pd.sub(d.clone().multiplyScalar(pd.dot(d))); if (pd.lengthSq() < 1e-6) pd.set(0, -1, 0); pd.normalize();
  const elbow = a.clone().add(d.clone().multiplyScalar(cosA * l1)).add(pd.multiplyScalar(sinA * l1));
  const wrist = a.clone().add(d.clone().multiplyScalar(dist));
  turn(up, b.clone().sub(a).normalize(), elbow.clone().sub(a).normalize());
  fig.root.updateMatrixWorld(true);
  const b2 = lo.getWorldPosition(V()), c2 = end.getWorldPosition(V());
  turn(lo, c2.clone().sub(b2).normalize(), wrist.clone().sub(b2).normalize());
  fig.root.updateMatrixWorld(true);
}
function turn(bone, from, to) {   // rotate a joint in world space so `from` points along `to`
  const dq = new THREE.Quaternion().setFromUnitVectors(from, to);
  const pw = bone.parent.getWorldQuaternion(new THREE.Quaternion()), bw = bone.getWorldQuaternion(new THREE.Quaternion());
  bone.quaternion.copy(pw.invert().multiply(dq.multiply(bw)));
  bone.updateMatrixWorld(true);
}
// Pose a figure at scene time t: the capture at the scene's clock, then its changes in order.
function pose(fig, t) {
  const ct = fig.rest ? 0 : clamp(fig.clock(t), 0, fig.clip.duration - 1e-4);
  if (!fig.rest) fig.mixer.setTime(ct);
  if (fig.jump) {   // a jump stretched (or shrunk) above standing height, the approach and landing untouched
    const h = fig.B.Hips.position, s = fig.jump; h.y = s.base + Math.max(0, h.y - s.base) * s.k + Math.min(0, h.y - s.base);
    if (s.kz) h.z = s.z0 + (h.z - s.z0) * s.kz;
  }
  fig.root.updateMatrixWorld(true);
  fig.mods.forEach((m) => m(fig, t, ct));
  fig.root.updateMatrixWorld(true);
}
const wpos = (fig, bone) => fig.B[bone].getWorldPosition(V());
function palm(fig, side) {   // the palm's center and the direction it faces (world)
  const h = wpos(fig, side + "Hand"), m = wpos(fig, side + "HandMiddle1"), ix = wpos(fig, side + "HandIndex1"), pk = wpos(fig, side + "HandPinky1");
  const c = h.clone().lerp(m, 0.55), across = ix.clone().sub(pk), along = m.clone().sub(h);
  const nrm = across.cross(along).normalize(); if (side === "Left") nrm.negate();
  return { c, n: nrm };
}
const inHand = (fig, side) => { const pm = palm(fig, side); return pm.c.add(pm.n.multiplyScalar(BALL_R + 1.5)); };

/* ---------- the hoop and the ball ---------- */
function makeHoop(at, facing) {   // `at` the rim's center, `facing` the unit direction from the glass toward the shooter
  const g = new THREE.Group(); scene.add(g);
  const rim = tagMesh(new THREE.Mesh(new THREE.TorusGeometry(23, 1.5, 10, 64), SHADE), "rim"); rim.rotation.x = Math.PI / 2; g.add(rim);
  const neck = tagMesh(new THREE.Mesh(new THREE.BoxGeometry(6, 2.5, 16), SHADE), "rim"); neck.position.set(0, -0.5, -30); g.add(neck);
  const board = tagMesh(new THREE.Mesh(new THREE.BoxGeometry(183, 107, 2), SHADE_DIM), "board", { glass: true, noShade: true }); board.position.set(0, 107 / 2 - 15, -39.5); g.add(board);
  const frame = (w, h, cx, cy, z, th) => [[0, h / 2, w, th], [0, -h / 2, w, th], [-w / 2, 0, th, h], [w / 2, 0, th, h]].forEach(([x, y, ww, hh]) => {
    const m = tagMesh(new THREE.Mesh(new THREE.BoxGeometry(ww, hh, 1.2), SHADE), "mark"); m.position.set(cx + x, cy + y, z); g.add(m);
  });
  frame(183, 107, 0, 107 / 2 - 15, -38.2, 3.5);   // the glass's edge
  frame(59, 45, 0, 22.5, -38.2, 3.5);   // the shooter's square, its bottom on the rim's height
  const net = tagMesh(new THREE.Mesh(new THREE.BufferGeometry(), SHADE), "net"); g.add(net);
  g.position.copy(at); g.rotation.y = Math.atan2(facing.x, facing.z); g.updateMatrixWorld(true);
  const hoop = { g, rim, net, at: at.clone(), facing: facing.clone().normalize(), whip: [] };
  hoop.local = (p) => g.worldToLocal(p.clone());
  netShape(hoop, null, 0);
  return hoop;
}
// The net: 12 cords in a diamond weave over five rings. It opens around the ball, drags down as the ball goes
// through, and snaps back with a little swing.
function netShape(hoop, ballLocal, since) {
  const rings = [[0, 23], [-11, 20.5], [-22, 17.5], [-33, 15], [-42, 13.5]], nC = 12, cords = [];
  const ringAt = (k) => {
    let [y, r] = rings[k];
    if (ballLocal && ballLocal.y < 4 && ballLocal.y > -60 && Math.hypot(ballLocal.x, ballLocal.z) < 26) {
      const near = Math.exp(-Math.pow((ballLocal.y - y) / 12, 2));
      r = Math.max(r, lerp(r, BALL_R + 1.5, near)); y -= 7 * near * (k / 4);
    }
    if (since != null && since > 0) y -= 9 * (k / 4) * Math.exp(-since / 0.16) * Math.cos(since * 22) * (since < 0.02 ? since / 0.02 : 1);
    return [y, r];
  };
  const R = rings.map((_, k) => ringAt(k));
  for (let k = 0; k < rings.length - 1; k++) for (let j = 0; j < nC; j++) for (const dj of [-0.5, 0.5]) {
    const a0 = ((j + (k % 2) * 0.5) / nC) * Math.PI * 2, a1 = ((j + (k % 2) * 0.5 + dj) / nC) * Math.PI * 2;
    cords.push([V(R[k][1] * Math.cos(a0), R[k][0], R[k][1] * Math.sin(a0)), V(R[k + 1][1] * Math.cos(a1), R[k + 1][0], R[k + 1][1] * Math.sin(a1))]);
  }
  const parts = cords.map(([a, b]) => { const c = new THREE.CylinderGeometry(0.55, 0.55, a.distanceTo(b), 5, 1, true); const m = new THREE.Matrix4(); const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); m.compose(a.clone().add(b).multiplyScalar(0.5), q, V(1, 1, 1)); c.applyMatrix4(m); return c; });
  const pos = [], nrm = [];
  parts.forEach((c) => { const ci = c.toNonIndexed(); pos.push(...ci.attributes.position.array); nrm.push(...ci.attributes.normal.array); c.dispose(); ci.dispose(); });
  hoop.net.geometry.dispose(); const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  hoop.net.geometry = geo;
}
function makeBall() {
  const tex = idTexture(512, 256, "ball", (g, col) => {   // the seams in an equirectangular map: a cross of great circles and the two curves
    g.strokeStyle = col("seam"); g.lineWidth = 7;
    g.beginPath(); g.moveTo(0, 128); g.lineTo(512, 128); g.stroke();
    [128, 384].forEach((x) => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); });
    [0, 256].forEach((x0) => { g.beginPath(); for (let u = 0; u <= 256; u += 4) { const y = 128 + 88 * Math.cos(((u / 256) * 2 - 1) * Math.PI * 0.5) * (x0 ? 1 : -1); u ? g.lineTo(x0 + u, y) : g.moveTo(x0 + u, y); } g.stroke(); });
  });
  const m = tagMesh(new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 32, 20), SHADE), "ball", { idMat: new THREE.MeshBasicMaterial({ map: tex }) });
  scene.add(m); m.visible = false; return m;
}

/* ---------- camera and light ---------- */
function aim(pos, target, fov) {
  camera.fov = fov || 26; camera.position.copy(pos); camera.lookAt(target); camera.updateProjectionMatrix();
  const d = pos.clone().sub(target).normalize(), right = V().crossVectors(d, V(0, 1, 0)).normalize(), r = pos.distanceTo(target);
  key.position.copy(target).add(d.clone().multiplyScalar(r)).add(right.clone().multiplyScalar(-r * 0.8)).add(V(0, r * 0.9, 0)); key.target.position.copy(target);
  fill.position.copy(target).add(d.clone().multiplyScalar(-r)).add(right.clone().multiplyScalar(r * 0.6)).add(V(0, r * 0.4, 0)); fill.target.position.copy(target);
}
const orbit = (target, az, el, dist) => { const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el); return target.clone().add(V(Math.sin(a) * Math.cos(e) * dist, Math.sin(e) * dist, Math.cos(a) * Math.cos(e) * dist)); };
const screen = (p) => { const q = p.clone().project(camera); return { x: (q.x * 0.5 + 0.5) * W, y: (-q.y * 0.5 + 0.5) * H, z: q.z }; };

/* ---------- ball flights ---------- */
// A thrown ball from p0 at t0 landing on p1 at t1 under gravity (a lob, a pass, a shot).
function lob(p0, t0, p1, t1) { const T = t1 - t0, v = p1.clone().sub(p0).sub(V(0, -0.5 * G * T * T, 0)).divideScalar(T); return (t) => { const d = t - t0; return p0.clone().add(v.clone().multiplyScalar(d)).add(V(0, -0.5 * G * d * d, 0)); }; }
// A free ball from p with velocity v at t0: gravity, the floor (bounces that lose a little each time), no walls.
function loose(p, v, t0, bounce = 0.62, drag = 0.8) {
  const segs = []; let P0 = p.clone(), V0 = v.clone(), T0 = t0;
  for (let k = 0; k < 6; k++) {
    const a = -0.5 * G, b = V0.y, c = P0.y - BALL_R, disc = b * b - 4 * a * c, tb = (-b - Math.sqrt(Math.max(0, disc))) / (2 * a);
    segs.push({ P0: P0.clone(), V0: V0.clone(), T0, T1: T0 + tb });
    P0 = P0.clone().add(V0.clone().multiplyScalar(tb)); P0.y = BALL_R; V0 = V(V0.x * drag, -(V0.y - G * tb) * bounce, V0.z * drag); T0 += tb;
    if (Math.abs(V0.y) < 40) { segs.push({ P0: P0.clone(), V0: V(V0.x, 0, V0.z), T0, T1: 1e9, roll: true }); break; }
  }
  return (t) => { const s = segs.find((x) => t <= x.T1) || segs[segs.length - 1], d = t - s.T0; const q = s.P0.clone().add(s.V0.clone().multiplyScalar(d)); if (!s.roll) q.y += -0.5 * G * d * d; return q; };
}

/* ---------- the scenes ---------- */
// Each scene: its cast (with clocks and changes), the hoop, the ball's plan, the camera, its length and the
// key moment (the beat the ceremony will sync to the chime's last note, about 1.3 s in).
const SCENES = {
  // debug: the dressed body in its rest pose, turning (front, three-quarter, side, back)
  async tpose(sc) {
    const hero = await makeFigure(sc.raw + "dribble.fbx", { layer: "A", number: "82" });
    hero.rest = true; hero.clock = () => 0;
    if (sc.hideSkin) hero.obj.traverse((m) => { if (m.isMesh && /^skin/.test(m.userData.layer || "")) m.visible = false; });
    sc.cast = [hero]; sc.ballAt = () => null; sc.len = 2; sc.key = 99;
    sc.cameraAt = (t) => ({ pos: orbit(V(0, 125, 0), [0, 35, 90, 180][Math.min(3, Math.floor(t * 2))], 4, 330), target: V(0, 125, 0), fov: 26 });
  },
  // THE CROSSOVER (guard). Mixamo's dribble, head-on. Four dribbles a loop: right hand, a crossover to the left,
  // left hand (the capture's mirror image), then between the legs back to the right. Loops seamlessly.
  async crossover(sc) {
    const hero = await makeFigure(sc.raw + "dribble.fbx", { layer: "A", number: "82" });
    const P = 0.7;   // one dribble
    hero.clock = (t) => ((t % 2.1) + 2.1) % 2.1;
    const wAt = (t) => { const b = Math.floor(t / P), u = t / P - b; return b === 0 ? 0 : b === 1 ? smooth(0.12, 0.62, u) : b === 2 ? 1 : 1 - smooth(0.12, 0.62, u); };
    hero.mods.push((f, t) => mirrorBlend(f, wAt(t)));
    const cast = [hero];
    // the ball: in the dribbling hand from the catch (u 0.52) to the push (u 0.24), in flight between
    const side = (t) => (wAt(t) < 0.5 ? "Right" : "Left");
    const REL = 0.22, CAT = 0.52, plan = [];
    for (let b = 0; b < 4; b++) {
      const t0 = b * P + REL, t1 = b * P + CAT;
      pose(hero, t0); const s0 = b === 0 || b === 3 ? (b === 3 ? "Left" : "Right") : b === 1 ? "Right" : "Left", p0 = inHand(hero, s0);
      const toes = wpos(hero, "LeftToeBase").add(wpos(hero, "RightToeBase")).multiplyScalar(0.5);
      pose(hero, t1); const s1 = b === 0 ? "Right" : b === 1 ? "Left" : b === 2 ? "Left" : "Right", p1 = inHand(hero, s1);
      let fl;
      if (b === 1) fl = toes.clone().add(V(0, 0, 16));                 // the crossover: low, in front, across
      else if (b === 3) { pose(hero, (t0 + t1) / 2); const l = wpos(hero, "LeftToeBase"), r = wpos(hero, "RightToeBase"); fl = l.add(r).multiplyScalar(0.5).add(V(0, 0, -4)); }   // between the legs
      else fl = p0.clone().lerp(p1, 0.5).add(p0.clone().sub(toes).setY(0).normalize().multiplyScalar(4));
      fl.y = BALL_R;
      plan.push({ t0, t1, p0, p1, fl });
    }
    sc.ballAt = (t) => {
      const k = plan.find((q) => t >= q.t0 && t <= q.t1);
      if (!k) return { p: inHand(hero, side(t)) };
      const d0 = k.p0.y - BALL_R, d1 = k.p1.y - BALL_R, tb = k.t0 + (k.t1 - k.t0) * d0 / (d0 + d1);
      if (t <= tb) return { p: k.p0.clone().lerp(k.fl, (t - k.t0) / (tb - k.t0)) };
      return { p: k.fl.clone().lerp(k.p1, (t - tb) / (k.t1 - tb)) };
    };
    sc.spin = (t, dt, v) => v.length() > 1 ? { axis: V().crossVectors(V(0, 1, 0), v).normalize(), rate: v.length() / BALL_R } : null;
    const T = V(0, 72, 32);
    sc.cameraAt = (t) => { const sway = 5 * Math.sin((t / 2.8) * Math.PI * 2); return { pos: orbit(T.clone().add(V(sway, 0, 0)), -6, 7, 470), target: T.clone().add(V(sway * 0.6, 0, 0)), fov: 26 }; };
    sc.len = 2.8; sc.key = 0.95; sc.loop = true; sc.cast = cast;
  },

  // THE SLAM (forward). Mixamo's Jump Attack: a huge leap, both hands overhead. The rim sits where the ball comes
  // down; the hands bring the ball in (both hands on it), throw it down through the rim, hang on the rim a beat,
  // let go, and land in the crouch with the arms flexed out instead of on the floor.
  async slam(sc) {
    const hero = await makeFigure(sc.raw + "jump-attack.fbx", { layer: "A", number: "82" });
    const T0 = 0.1; hero.clock = (t) => t + T0;
    const cast = [hero];
    // the ball: gathered in front of the chest through the crouch, then it rides between the hands overhead (the
    // capture's hands are too far apart to hold it: they come in to it)
    const mid = (t) => {
      pose(hero, t); const over = wpos(hero, "LeftHand").add(wpos(hero, "RightHand")).multiplyScalar(0.5);
      const q = hero.B.Hips.getWorldQuaternion(new THREE.Quaternion()), fw = V(0, 0, 1).applyQuaternion(q); fw.y = 0; fw.normalize();
      const chest = wpos(hero, "Spine2").add(fw.multiplyScalar(26)).add(V(0, -8, 0));
      return chest.lerp(over, smooth(0.42, 0.72, t));
    };
    const SLAM = 1.13;   // scene time the ball leaves the hands, just over the rim
    const pS = mid(SLAM).add(V(0, 6, 0)), pS2 = mid(SLAM + 1 / FPS).add(V(0, 6, 0)), vS = pS2.clone().sub(pS).multiplyScalar(FPS);
    const rimC = pS.clone().add(V(0, -26, 10)); rimC.x = pS.x;
    const hoop = makeHoop(rimC, V(0, 0, -1));
    // after the slam: the ball drops into the net, the net holds it a beat (0.1 s), then it falls out the far side,
    // bounces low and rolls off under the glass, clear of him
    const NET = 0.1, pNet = rimC.clone().add(V(0, -30, 6)), ballOut = loose(pNet, V(vS.x * 0.15, -140, 170), SLAM + NET, 0.36, 0.75);
    const ballFree = (t) => t < SLAM + NET ? pS.clone().lerp(pNet, Math.pow(smooth(SLAM, SLAM + NET, t), 0.7)) : ballOut(t);
    // hands: on the ball until the slam, on the rim for a beat, then back to the capture, then the flex
    const grip = (t, s) => { const c = mid(t).add(V(0, 6, 0)), across = V(s === "Left" ? 1 : -1, 0, 0); return c.clone().add(across.multiplyScalar(BALL_R + 3)); };
    const handPath = {};   // precomputed so the pose changes don't feed back into the ball
    for (let i = 0; i <= Math.ceil(2.4 * FPS); i++) { const t = i / FPS; handPath[i] = { Left: grip(t, "Left"), Right: grip(t, "Right") }; }
    const rimGrip = (s) => rimC.clone().add(V(s === "Left" ? 9 : -9, 2, -21));
    hero.mods.push((f, t) => {
      const i = Math.round(t * FPS), sh = (s) => wpos(f, s + "Arm");
      SIDES.forEach((s) => {
        const out = V(s === "Left" ? 1 : -1, 0, 0);
        const hold = t < SLAM ? smooth(0.2, 0.55, t) : 0, hang = smooth(SLAM - 0.02, SLAM + 0.05, t) * (1 - smooth(SLAM + 0.16, SLAM + 0.26, t));
        const flex = smooth(1.55, 1.8, t);
        if (hold > 0 && handPath[i]) reach(f, s, handPath[i][s], sh(s).add(out.clone().multiplyScalar(40)).add(V(0, -30, -20)), hold);
        if (hang > 0) reach(f, s, rimGrip(s), sh(s).add(out.clone().multiplyScalar(45)).add(V(0, -10, -25)), hang);
        if (flex > 0) { const c = sh(s); reach(f, s, c.clone().add(out.clone().multiplyScalar(26)).add(V(0, 26, 8)), c.clone().add(out.clone().multiplyScalar(40)).add(V(0, -25, 0)), flex); }
      });
    });
    sc.ballAt = (t) => t < SLAM ? { p: handPath[Math.round(t * FPS)] ? handPath[Math.round(t * FPS)].Left.clone().lerp(handPath[Math.round(t * FPS)].Right, 0.5) : mid(t) } : { p: ballFree(t) };
    sc.hoop = hoop; sc.slamT = SLAM;
    // the camera rides up with him to the rim and comes back down for the landing (hips smoothed over 0.4 s)
    const hipsAt = []; for (let i = 0; i <= Math.ceil(2.4 * FPS); i++) { pose(hero, i / FPS); hipsAt.push(wpos(hero, "Hips")); }
    const hipsSm = (t) => { const i = Math.round(t * FPS), a = Math.max(0, i - 5), b = Math.min(hipsAt.length - 1, i + 5), m = V(); for (let k = a; k <= b; k++) m.add(hipsAt[k]); return m.divideScalar(b - a + 1); };
    sc.cameraAt = (t) => {
      const w = smooth(0.4, 0.9, t) * (1 - smooth(1.3, 1.75, t)), h = hipsSm(t);
      const tg = h.clone().add(V(0, 28, 0)).lerp(rimC.clone().add(V(0, -38, -34)), w); tg.x = lerp(h.x, rimC.x, 0.5);
      return { pos: orbit(tg, -68 + 10 * smooth(0, 2.3, t), 4, lerp(470, 610, w)), target: tg, fov: 26 };
    };
    sc.len = 2.3; sc.key = SLAM; sc.cast = cast;
  },

  // THE BLOCK (center). Mixamo's Defender leaps in and swats; a rival (Jump Attack, the jump cut down to a human
  // one) goes up with the ball for the tomahawk and gets it sent away. The hoop behind the defender.
  async block(sc) {
    const hero = await makeFigure(sc.raw + "defender.fbx", { layer: "A", number: "82" });
    const rival = await makeFigure(sc.raw + "jump-attack.fbx", { layer: "B", number: "00" });
    const TC = 1.25;   // scene time of the swat
    const tA = 0.93, tD = 0.3;   // the capture's moment for each: the rival's ball overhead, the defender's hand up
    rival.clock = (t) => t - TC + tA; hero.clock = (t) => t - TC + tD;
    rival.jump = { base: 92, k: 0.36, z0: 0, kz: 0.55 };
    // the rival's ball between his hands (they come in to hold it), until the swat
    const mid = (t) => { pose(rival, t); return wpos(rival, "LeftHand").add(wpos(rival, "RightHand")).multiplyScalar(0.5).add(V(0, 6, 0)); };
    const rivalBall = {}; for (let i = 0; i <= Math.ceil(2.6 * FPS); i++) rivalBall[i] = mid(i / FPS);
    const at = (t) => rivalBall[clamp(Math.round(t * FPS), 0, Math.ceil(2.6 * FPS))].clone();
    rival.mods.push((f, t) => {
      if (t > TC + 0.02) return;
      const c = at(t), hold = smooth(0.15, 0.45, t) * (1 - smooth(TC - 0.01, TC + 0.02, t));
      SIDES.forEach((s) => { const out = V(s === "Left" ? 1 : -1, 0, 0); reach(f, s, c.clone().add(out.clone().multiplyScalar(BALL_R + 3)), wpos(f, s + "Arm").add(out.multiplyScalar(40)).add(V(0, -30, -20)), hold); });
    });
    // place the defender: the capture is a spinning side leap with both arms up, the left hand highest at the
    // swat. Turn him so the leap comes straight at the rival (out from under the hoop), set him a little deeper
    // than the rival so the bodies pass side by side, and put the left hand on top of the ball at the swat.
    const bC = at(TC);
    pose(hero, TC - tD); const h0 = wpos(hero, "Hips"); pose(hero, TC); const h1 = wpos(hero, "Hips"), lead = h1.clone().sub(h0);
    hero.root.rotation.y = Math.PI - Math.atan2(lead.x, lead.z); hero.root.updateMatrixWorld(true);
    pose(hero, TC); const hand = palm(hero, "Left").c;
    hero.root.position.add(bC.clone().add(V(20, BALL_R + 8, 24)).sub(hand)); hero.root.updateMatrixWorld(true);   // a long arm to the ball
    // before his leap he waits in his stance, bouncing a little (the capture starts mid-air otherwise)
    hero.mods.unshift((f, t) => { if (t < TC - tD) { f.B.Hips.position.y += 2.2 * Math.sin(t * 9); f.root.updateMatrixWorld(true); } });
    hero.mods.push((f, t) => {
      const w = smooth(TC - 0.2, TC - 0.02, t) * (1 - smooth(TC + 0.04, TC + 0.2, t)); if (w <= 0) return;
      const c = at(Math.min(t, TC)).add(V(0, BALL_R + 3, -5));
      reach(f, "Left", c, wpos(f, "LeftArm").add(V(30, -30, 0)), w);
    });
    const hoop = makeHoop(bC.clone().add(V(0, 26, 62)), V(0, 0, -1));
    // after the swat: sent away, up and back toward the rival's side
    pose(hero, TC - 1 / FPS); const p0 = palm(hero, "Left").c; pose(hero, TC + 1 / FPS); const p1 = palm(hero, "Left").c;
    const swat = p1.clone().sub(p0).multiplyScalar(FPS / 2), away = V(swat.x * 0.3 - 90, 240, -640);
    const flight = loose(bC, away, TC, 0.5, 0.7);
    sc.ballAt = (t) => ({ p: t <= TC ? at(t) : flight(t) });
    sc.cast = [hero, rival]; sc.hoop = hoop; sc.burstAt = bC;
    const rimY = bC.y + 26;
    sc.cameraAt = (t) => { const tg = V(bC.x + 10, (rimY + 30) * 0.5 + 8, bC.z + 8); return { pos: orbit(tg, -80 + 10 * smooth(0, 2.4, t), 4, lerp(640, 590, smooth(0, 1.4, t))), target: tg, fov: 26 }; };
    sc.len = 2.05; sc.key = TC;
  },

  // THE ALLEY-OOP (forward). Mixamo's Football Catch, the jump stretched: the lob comes in from off the frame,
  // one hand takes it at the top and flushes it straight down through the rim, hangs a beat, lets go.
  async oop(sc) {
    const hero = await makeFigure(sc.raw + "football-catch.fbx", { layer: "A", number: "82" });
    const T0 = 0.35; hero.clock = (t) => t + T0;
    hero.jump = { base: 93, k: 1.55 };
    const CATCH = 1.5 - T0, FLUSH = CATCH + 0.13;
    pose(hero, CATCH); const pc = inHand(hero, "Right"), face = (() => { const q = hero.B.Hips.getWorldQuaternion(new THREE.Quaternion()); const f = V(0, 0, 1).applyQuaternion(q); f.y = 0; return f.normalize(); })();
    const rimC = pc.clone().add(face.clone().multiplyScalar(26)).add(V(0, -30, 0));
    const hoop = makeHoop(rimC, face.clone().negate());
    const pIn = pc.clone().add(face.clone().multiplyScalar(-330)).add(V(-60, 60, 180)).setY(pc.y + 40);
    const pass = lob(pIn, CATCH - 0.62, pc, CATCH);
    const flushAt = (t) => pc.clone().lerp(rimC.clone().add(V(0, 8, 0)), smooth(CATCH, FLUSH, t));
    const NET = 0.09, pNet = rimC.clone().add(V(0, -30, 0)).add(face.clone().multiplyScalar(6));
    const out = loose(pNet, V(0, -150, 0).add(face.clone().multiplyScalar(160)), FLUSH + NET, 0.36, 0.75);
    const free = (t) => t < FLUSH + NET ? rimC.clone().add(V(0, 8, 0)).lerp(pNet, Math.pow(smooth(FLUSH, FLUSH + NET, t), 0.7)) : out(t);
    hero.mods.push((f, t) => {
      const w = smooth(CATCH - 0.12, CATCH, t) * (1 - smooth(FLUSH + 0.14, FLUSH + 0.28, t)); if (w <= 0) return;
      const target = t < FLUSH ? flushAt(t).add(face.clone().multiplyScalar(-BALL_R - 2)).add(V(0, 4, 0)) : rimC.clone().add(face.clone().multiplyScalar(-22)).add(V(0, 3, 0));
      reach(f, "Right", target, wpos(f, "RightArm").add(V(0, -30, 0)).add(face.clone().multiplyScalar(-30)), w);
    });
    sc.ballAt = (t) => ({ p: t < CATCH - 0.62 ? null : t < CATCH ? pass(t) : t < FLUSH ? flushAt(t) : free(t) });
    sc.cast = [hero]; sc.hoop = hoop;
    const hipsAt = []; for (let i = 0; i <= Math.ceil(2 * FPS); i++) { pose(hero, i / FPS); hipsAt.push(wpos(hero, "Hips")); }
    const hipsSm = (t) => { const i = Math.round(t * FPS), a = Math.max(0, i - 5), b = Math.min(hipsAt.length - 1, i + 5), m = V(); for (let k = a; k <= b; k++) m.add(hipsAt[k]); return m.divideScalar(b - a + 1); };
    sc.cameraAt = (t) => {
      const w = smooth(0.5, 1.0, t) * (1 - smooth(1.45, 1.75, t)), h = hipsSm(t);
      const tg = h.clone().add(V(0, 30, 0)).lerp(rimC.clone().add(V(0, -45, 0)).add(face.clone().multiplyScalar(-35)), w);
      return { pos: orbit(tg, 22 + 6 * smooth(0, 2, t), 4, lerp(480, 580, w)), target: tg, fov: 26 };
    };
    sc.len = 1.75; sc.key = FLUSH;
  }
};

/* ---------- 2D helpers ---------- */
function tint(mask, color, alpha = 1, gain = 1) {
  const c = canvas(), g = c.getContext("2d"), im = g.createImageData(W, H), [r, gg, b] = hexRgb(color);
  for (let i = 0, j = 0; i < W * H; i++, j += 4) { const a = Math.min(255, mask[i] * gain * alpha); if (a) { im.data[j] = r; im.data[j + 1] = gg; im.data[j + 2] = b; im.data[j + 3] = a; } }
  g.putImageData(im, 0, 0); return c;
}
function union(...ms) { const u = new Uint8Array(W * H); ms.forEach((m) => { for (let i = 0; i < u.length; i++) if (m[i] > u[i]) u[i] = m[i]; }); return u; }
function edgesOf(mask, w = 2) {   // pixels of `mask` next to a pixel outside it
  w = Math.max(1, Math.round(w)); const e = new Uint8Array(W * H);
  for (let y = w; y < H - w; y++) for (let x = w; x < W - w; x++) {
    const i = y * W + x; if (mask[i] < 128) continue;
    if (mask[i - w] < 128 || mask[i + w] < 128 || mask[i - w * W] < 128 || mask[i + w * W] < 128) e[i] = 255;
  }
  return e;
}
function seam(a, b, w = 2) {   // pixels of `a` within w of `b` (and of `b` within w of `a`): where two layers meet
  w = Math.max(1, Math.round(w * S)); const e = new Uint8Array(W * H);
  for (let y = w; y < H - w; y++) for (let x = w; x < W - w; x++) {
    const i = y * W + x, ia = a[i] > 100, ib = b[i] > 100; if (!ia && !ib) continue;
    const o = ia ? b : a; if (o[i - w] > 100 || o[i + w] > 100 || o[i - w * W] > 100 || o[i + w * W] > 100) e[i] = 1;
  }
  return e;
}
function halftone(g, o) {   // a rotated dot screen; o.dens(i) in 0..1 per pixel index
  const ang = (o.angle * Math.PI) / 180, ca = Math.cos(ang), sa = Math.sin(ang), cell = o.cell, R = Math.hypot(W, H) / 2 + cell, p = new Path2D();
  for (let v = -R; v < R; v += cell) for (let u = -R; u < R; u += cell) {
    const x = W / 2 + u * ca - v * sa, y = H / 2 + u * sa + v * ca, sx = Math.round(x - (o.dx || 0)), sy = Math.round(y - (o.dy || 0));
    if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
    const d = o.dens(sy * W + sx); if (d <= 0.02) continue;
    const rr = cell * (o.max || 0.56) * Math.sqrt(Math.min(1, d));
    p.moveTo(x + rr, y); p.arc(x, y, rr, 0, Math.PI * 2);
  }
  g.fillStyle = o.ink; g.fill(p);
}

/* ---------- the styles ---------- */
// Figure inks: the hero in the site's pink with an aqua kit; the rival in aqua with a white (away) kit.
const figInks = () => ({ A: { skin: INK.accent, kit: INK.offset, trim: INK.light, num: null }, B: { skin: INK.offset, kit: INK.light, trim: INK.accent, num: INK.accent } });
const STYLES = {
  // RISO: a three-drum print on black. Each ink its own screen angle and its own misregistration; skin in pink,
  // the kit in aqua with the number knocked out of it, the trim in white, the ball and the rim in gold, the net
  // and the glass in thin white. Drawn on twos (12 new prints a second) with a hair of wobble, fluorescent bleed,
  // paper tooth, a floor pool of dots under the players, and a burst at the key moment.
  riso(f, i, g, st, sc) {
    const k = i - (i % 2), R = rng(1000 + k), jit = () => Math.round((R() * 2 - 1) * S);
    if (st.last && st.lastK === k) { g.drawImage(st.last, 0, 0); return; }
    const out = canvas(), o = out.getContext("2d"), L = f.L, fi = figInks(), sh = (p) => f.shade[p] / 255;
    o.fillStyle = "#000"; o.fillRect(0, 0, W, H); o.globalCompositeOperation = "screen";
    const d1 = { x: 5 * S + jit(), y: -4 * S + jit() }, d2 = { x: jit(), y: jit() }, d3 = { x: -3 * S + jit(), y: 3 * S + jit() };
    // the floor pool: a soft ellipse of aqua dots under each player's feet
    if (f.pools) f.pools.forEach((pl) => halftone(o, { ink: INK.offset, angle: 75, cell: 7 * S, dx: d1.x, dy: d1.y, max: 0.5, dens: (p) => { const x = p % W, y = (p / W) | 0, e = Math.pow((x - pl.x) / pl.rx, 2) + Math.pow((y - pl.y) / pl.ry, 2); return e < 1 ? 0.45 * (1 - e) * pl.a : 0; } }));
    // the burst: rings of gold dots from the rim (or the ball) at the key moment
    if (f.burst && f.burst.a > 0) {   // the impact: a starburst of fine gold dots, thin rays inside a thin ring
      const b = f.burst;
      halftone(o, { ink: INK.hot, angle: 45, cell: 4 * S, dx: d3.x, dy: d3.y, max: 0.55, dens: (p) => {
        const x = p % W, y = (p / W) | 0, r = Math.hypot(x - b.x, y - b.y); if (r < 40 * S || r > b.r + 20 * S) return 0;
        const ray = Math.pow(Math.max(0, Math.cos(Math.atan2(y - b.y, x - b.x) * 9)), 14), ring = Math.exp(-Math.pow((r - b.r) / (7 * S), 2));
        return b.a * Math.max(ray * (1 - r / (b.r + 20 * S)) * 1.2, ring * 0.8);
      } });
    }
    // the hoop: glass faint, marks and net thin white, rim gold
    halftone(o, { ink: INK.light, angle: 15, cell: 3.4 * S, dx: d2.x, dy: d2.y, max: 0.5, dens: (p) => (L.board[p] > 100 ? 0.04 : 0) + (L.mark[p] + L.net[p] > 90 ? 0.5 + 0.4 * sh(p) : 0) });
    halftone(o, { ink: INK.hot, angle: 45, cell: 3.4 * S, dx: d3.x, dy: d3.y, dens: (p) => (L.rim[p] > 90 ? 0.8 + 0.2 * sh(p) : 0) });
    ["B", "A"].forEach((who) => {
      const ink = fi[who], sk = L["skin" + who], kt = L["kit" + who], pt = L["pants" + who], tr = L["trim" + who], nm = L["num" + who], cut = seam(kt, pt, 2);
      halftone(o, { ink: ink.skin, angle: 15, cell: 4.4 * S, dx: d2.x, dy: d2.y, dens: (p) => (sk[p] > 100 ? 0.18 + 0.82 * sh(p) : 0) });
      halftone(o, { ink: ink.kit, angle: 75, cell: 4.4 * S, dx: d1.x, dy: d1.y, dens: (p) => (cut[p] ? 0 : kt[p] > 100 ? 0.3 + 0.7 * sh(p) : pt[p] > 100 ? 0.22 + 0.6 * sh(p) : 0) });
      if (ink.num) halftone(o, { ink: ink.num, angle: 45, cell: 3.2 * S, dx: d2.x, dy: d2.y, dens: (p) => (nm[p] > 100 ? 0.95 : 0) });
      halftone(o, { ink: ink.trim, angle: 45, cell: 3.2 * S, dx: d3.x, dy: d3.y, dens: (p) => (tr[p] > 100 ? 0.5 + 0.5 * sh(p) : 0) });
    });
    halftone(o, { ink: INK.hot, angle: 45, cell: 3.6 * S, dx: d3.x, dy: d3.y, dens: (p) => (L.ball[p] > 100 ? 0.55 + 0.45 * sh(p) : L.seam[p] > 100 ? 0.05 : 0) });
    // fluorescent bleed: the print, blurred and screened back at a low level
    o.globalCompositeOperation = "source-over";
    const bleed = canvas(), bg = bleed.getContext("2d"); bg.filter = `blur(${7 * S}px)`; bg.drawImage(out, 0, 0);
    o.globalCompositeOperation = "screen"; o.globalAlpha = 0.62; o.drawImage(bleed, 0, 0); o.globalAlpha = 1;
    o.globalCompositeOperation = "source-over"; o.fillStyle = "rgba(0,0,0,0.5)";
    for (let n = 0; n < 3200 * S * S; n++) o.fillRect((R() * W) | 0, (R() * H) | 0, 1 + (R() < 0.2), 1);
    st.last = out; st.lastK = k; g.drawImage(out, 0, 0);
  },
  // NEON: every piece of the picture is a tube. The outline of each layer (the jersey, the shorts, the skin, the
  // shoes, the number) in its own color with a hot core and a glow, a faint fill, light trails behind whatever
  // moves; the rim a gold tube, the glass and net thin white ones.
  neon(f, i, g, st, sc) {
    const L = f.L, fi = figInks();
    if (!st.trail) { st.trail = canvas(); st.tg = st.trail.getContext("2d"); }
    const tube = (mask, ink, w, a = 1) => tint(edgesOf(mask, w), ink, a);
    const pic = canvas(), pg = pic.getContext("2d"); pg.globalCompositeOperation = "lighter";
    pg.drawImage(tube(L.mark, INK.offset, 1, 0.55), 0, 0);
    pg.drawImage(tint(L.net, INK.light, 0.5), 0, 0);
    pg.drawImage(tint(L.rim, INK.hot, 1), 0, 0);
    ["B", "A"].forEach((who) => {
      const ink = fi[who], sk = L["skin" + who], kt = L["kit" + who], pt = L["pants" + who], tr = L["trim" + who], nm = L["num" + who];
      pg.drawImage(tint(union(sk, kt, pt, tr), ink.skin, 0.1), 0, 0);
      pg.drawImage(tube(sk, ink.skin, 2 * S), 0, 0);
      pg.drawImage(tube(kt, ink.kit, 2 * S), 0, 0);
      pg.drawImage(tube(pt, ink.kit, 2 * S), 0, 0);
      pg.drawImage(tube(tr, INK.light, Math.max(1, 1.5 * S), 0.9), 0, 0);
      pg.drawImage(tube(nm, ink.num || INK.light, Math.max(1, 1.5 * S), 0.95), 0, 0);
    });
    pg.drawImage(tint(L.ball, INK.hot, 1), 0, 0); pg.drawImage(tint(L.seam, "#000000", 1), 0, 0);
    const tg = st.tg; tg.globalCompositeOperation = "source-over"; tg.fillStyle = "rgba(0,0,0,0.2)"; tg.fillRect(0, 0, W, H);
    tg.globalCompositeOperation = "lighter"; tg.globalAlpha = 0.5; tg.drawImage(pic, 0, 0); tg.globalAlpha = 1;
    g.globalCompositeOperation = "source-over"; g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "lighter";
    g.filter = `blur(${8 * S}px)`; g.drawImage(st.trail, 0, 0); g.drawImage(pic, 0, 0); g.filter = `blur(${3 * S}px)`; g.drawImage(pic, 0, 0); g.filter = "none";
    g.drawImage(pic, 0, 0);
    if (f.burst && f.burst.a > 0) { const b = f.burst; g.strokeStyle = rgba(INK.hot, 0.8 * b.a); g.lineWidth = 3 * S; g.filter = `blur(${2 * S}px)`; g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.stroke(); g.filter = "none"; }
  }
};

STYLES.chrono = function (f, i, g, st, sc) {
  // CHRONO: Marey's chronophotograph. Every third moment stays on the plate, aqua at the start to pink now (the
  // rival white to aqua), so the move draws its own arc; the ball leaves a gold dotted path; the hoop in white.
  const L = f.L, n = Math.max(1, sc.n - 1);
  const figs = ["A", "B"].map((w) => union(L["skin" + w], L["kit" + w], L["pants" + w], L["trim" + w]));
  if (!st.plates) { st.plates = []; st.dots = []; }
  if (i % 3 === 0) { st.plates.push({ i: st.clock || i, m: figs }); if (st.plates.length > (sc.loop ? 8 : 40)) st.plates.shift(); }
  if (f.bp && i % 2 === 0) { st.dots.push({ x: f.bp.x, y: f.bp.y }); if (st.dots.length > (sc.loop ? 14 : 60)) st.dots.shift(); }
  st.clock = (st.clock || i) + 1;
  g.globalCompositeOperation = "source-over"; g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "screen";
  g.drawImage(tint(union(L.mark, L.net, L.rim), INK.light, 0.55), 0, 0);
  const now = st.plates.length ? st.plates[st.plates.length - 1].i : i;
  st.plates.forEach((pl, k) => {
    const u = st.plates.length > 1 ? k / (st.plates.length - 1) : 1;
    pl.m.forEach((m, w) => g.drawImage(tint(m, w ? mix(INK.light, INK.offset, u) : mix(INK.offset, INK.accent, u), 0.2 + 0.4 * u), 0, 0));
  });
  g.globalCompositeOperation = "source-over";   // the current moment prints opaque, in pure inks, over its trail
  ["B", "A"].forEach((w) => {
    const k = w === "B" ? 1 : 0, kit = union(L["kit" + w], L["pants" + w]);
    g.drawImage(tint(L["skin" + w], k ? INK.offset : INK.accent, 1), 0, 0);
    g.drawImage(tint(kit, k ? INK.light : INK.offset, 1), 0, 0);
    g.drawImage(tint(L["num" + w], k ? INK.accent : "#000000", 1), 0, 0);
    g.drawImage(tint(L["trim" + w], "#ffffff", 1), 0, 0);
    g.drawImage(tint(edgesOf(figs[k], 1), "#ffffff", 0.75), 0, 0);
  });
  g.globalCompositeOperation = "screen";
  g.fillStyle = INK.hot; st.dots.forEach((d, k) => { g.beginPath(); g.arc(d.x, d.y, (k === st.dots.length - 1 ? 6 : 2.4) * S, 0, Math.PI * 2); g.fill(); });
  g.drawImage(tint(L.ball, INK.hot, 1), 0, 0);
};

/* ---------- the run: build the scene, pose every moment, print every style, hand frames to node ---------- */
async function build(id, raw) {
  scene.children.slice().forEach((c) => { if (c !== key && c !== fill && c !== amb && c !== key.target && c !== fill.target) scene.remove(c); });
  const sc = { id, raw: raw || "raw/", hideSkin: /nude$/.test(id) };
  await SCENES[id.replace(/nude$/, "")](sc);
  sc.ball = makeBall();
  return sc;
}
function frame(sc, t, prev) {
  sc.cast.forEach((f) => pose(f, t));
  const bp = sc.ballAt(t), p = bp && bp.p;
  sc.ball.visible = !!p;
  if (p) {
    if (prev && prev.p) {   // spin: roll with the ball's travel
      const v = p.clone().sub(prev.p).multiplyScalar(FPS);
      if (v.length() > 5) { const ax = V().crossVectors(V(0, 1, 0), v).normalize(); if (ax.lengthSq() > 0) sc.ball.rotateOnWorldAxis(ax, (v.length() / FPS) / BALL_R); }
    }
    sc.ball.position.copy(p);
  }
  if (sc.hoop) {
    const bl = p ? sc.hoop.local(p) : null;
    if (bl && bl.y < 0 && Math.hypot(bl.x, bl.z) < 23 && sc.hoop.through == null) sc.hoop.through = t;
    netShape(sc.hoop, bl, sc.hoop.through != null ? t - sc.hoop.through : null);
  }
  const cam = sc.cameraAt(t); aim(cam.pos, cam.target, cam.fov);
  const f = passes();
  // the floor pools: under each player's feet, shrinking as he leaves the floor
  f.pools = sc.cast.map((fig) => {
    const hp = wpos(fig, "Hips"), foot = Math.min(wpos(fig, "LeftToeBase").y, wpos(fig, "RightToeBase").y), air = clamp(foot / 120, 0, 1);
    const c = screen(V(hp.x, 0, hp.z)), e = screen(V(hp.x + 60, 0, hp.z)), rx = Math.max(30 * S, Math.abs(e.x - c.x) * 1.3) * (1 - 0.4 * air);
    return { x: c.x, y: c.y, rx, ry: rx * 0.22, a: 1 - 0.6 * air };
  });
  // the burst: rings out of the rim (or the ball) for 0.45 s after the key moment
  const since = t - sc.key;
  if (!sc.loop && since >= 0 && since < 0.45) { const at = sc.burstAt ? screen(sc.burstAt) : sc.hoop ? screen(sc.hoop.at) : p ? screen(p) : { x: W / 2, y: H / 2 }; f.burst = { x: at.x, y: at.y, r: (40 + 420 * Math.pow(since / 0.45, 0.6)) * S, a: 1 - since / 0.45 }; }
  f.bp = p ? screen(p) : null;
  return { f, bp };
}
async function run(id, inks, styles, px, raw) {
  INK = inks; setSize(px || 720);
  const sc = await build(id, raw);
  const n = Math.round(sc.len * FPS), st = {}; styles.forEach((s) => (st[s] = {})); sc.n = n;
  const out = canvas(), g = out.getContext("2d");
  let prev = null;
  if (sc.loop) for (let i = 0; i < n; i++) {   // a loop warms its styles up on one pass (trails, plates), then records the next
    const { f, bp } = frame(sc, i / FPS, prev); prev = bp ? { p: sc.ball.position.clone() } : null;
    for (const s of styles) { g.save(); STYLES[s](f, i, g, st[s], sc); g.restore(); }
  }
  for (const s of styles) if (st[s].plates) st[s].clock = n;
  for (let i = 0; i < n; i++) {
    const { f, bp } = frame(sc, i / FPS, prev); prev = bp ? { p: sc.ball.position.clone() } : null;
    for (const s of styles) { g.save(); STYLES[s](f, i, g, st[s], sc); g.restore(); await window.__saveFrame(id, s, i, out.toDataURL("image/png")); }
  }
  return { frames: n, len: sc.len, key: sc.key, loop: !!sc.loop };
}
// A debug print of one moment: every layer in a flat color, for checking the uniform, the hoop and the ball.
async function look(id, times, px, raw) {
  INK = { accent: "#FF48B0", offset: "#41C6EA", hot: "#FFD54A", light: "#FFFFFF" }; setSize(px || 540);
  const sc = await build(id, raw), cols = { skinA: "#FF48B0", kitA: "#41C6EA", pantsA: "#2a8fb0", trimA: "#FFFFFF", numA: "#1a1030", skinB: "#9b6bff", kitB: "#dddddd", pantsB: "#aaaaaa", trimB: "#FF48B0", numB: "#FF48B0", ball: "#FFD54A", seam: "#7a4a00", rim: "#ff8a00", net: "#bbbbbb", board: "#223", mark: "#8899aa" };
  const shots = []; let prev = null;
  for (let i = 0, t = 0; i < Math.round(sc.len * FPS); i++, t = i / FPS) {
    const want = times.some((x) => Math.abs(x - t) < 0.5 / FPS);
    const { f, bp } = frame(sc, t, prev); prev = bp ? { p: sc.ball.position.clone() } : null;
    if (!want) continue;
    const c = canvas(), g = c.getContext("2d"); g.fillStyle = "#111"; g.fillRect(0, 0, W, H);
    ["board", "mark", "net", "rim", "skinB", "kitB", "pantsB", "trimB", "numB", "skinA", "kitA", "pantsA", "trimA", "numA", "ball", "seam"].forEach((n) => g.drawImage(tint(f.L[n], cols[n], 1), 0, 0));
    const sh = tint(f.shade, "#ffffff", 0.25); g.globalCompositeOperation = "multiply"; g.globalCompositeOperation = "source-over";
    g.fillStyle = "#fff"; g.font = `${14 * S}px monospace`; g.fillText(t.toFixed(2) + "s", 8, 18 * S);
    shots.push(c.toDataURL("image/png"));
  }
  return { shots, len: sc.len, key: sc.key };
}
window.ARTBOT = { run, look, STYLES: Object.keys(STYLES), SCENES: Object.keys(SCENES) };
window.ARTBOT_READY = true;
