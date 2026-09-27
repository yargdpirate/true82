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
  const mixer = null;   // clips are sampled by hand (applyPlan)
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
  const fig = { obj, root, clip, mixer, B, order, R, parentOf, surface, o, layer: o.layer || "A", mods: [], clips: { main: clip }, binds: {} };
  fig.binds.main = bindClip(fig, clip);
  skins.sort((a, b) => (b === surface) - (a === surface)).forEach((m) => dress(fig, m, m === surface));   // the body first: it sets the jersey's hang
  if (o.debugJoints) skins.forEach((m) => { if (m !== surface) tagMesh(m, "skinB"); });
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
  if (!main) {   // the joint pieces: the ball at the neck is wider than the neck; slim it into the neck
    for (let i = 0; i < P.count; i++) if (dom[i] === "Neck" || (dom[i] === "Head" && P.getY(i) < 152)) { P.setX(i, P.getX(i) * 0.8); P.setZ(i, -3 + (P.getZ(i) + 3) * 0.8); }
    P.needsUpdate = true;
  }
  // THE JERSEY: torso and the tank straps; hangs straight below the chest to the hem, a scoop at the neck
  const inJersey = (i) => {
    const d = dom[i], y = P.getY(i), x = Math.abs(P.getX(i));
    if (/^Spine/.test(d) || (d === "Neck" && y < 146)) return true;   // up to the neck: a clean crew collar
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
    const hung = V(r2 * Math.sin(a), y - (y < 99 ? 1.5 : 0), zc + r2 * Math.cos(a)), laid = q.clone().add(n(i).multiplyScalar(1.5 + extra));
    return laid.lerp(hung, smooth(141, 131, y));   // up at the collar the cloth lies on the skin along its normal: no skin pokes through
  };
  build("kit" + L, inJersey, (i) => jerseyAt(i));
  build("trim" + L, inJersey, (i) => jerseyAt(i, 0.45), null, null, band(inJersey, 1, (y, x) => y > 118 && Math.abs(x) > 12.5));   // piping at the arm holes only
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
function bend(bone, axis, ang) {   // turn a joint by `ang` about a world axis
  const dq = new THREE.Quaternion().setFromAxisAngle(axis, ang), pw = bone.parent.getWorldQuaternion(new THREE.Quaternion()), bw = bone.getWorldQuaternion(new THREE.Quaternion());
  bone.quaternion.copy(pw.invert().multiply(dq.multiply(bw))); bone.updateMatrixWorld(true);
}
function curl(fig, side, fingers, amt) {   // fold fingers into the palm (each joint by a share of amt radians)
  fig.root.updateMatrixWorld(true);
  const pm = palm(fig, side);
  fingers.forEach((fn) => [1, 2, 3].forEach((k) => {
    const b = fig.B[side + "Hand" + fn + k], c = fig.B[side + "Hand" + fn + (k + 1)]; if (!b || !c) return;
    const d = wpos(fig, side + "Hand" + fn + (k + 1)).sub(wpos(fig, side + "Hand" + fn + k)).normalize(), ax = V().crossVectors(d, pm.n).normalize();
    if (ax.lengthSq() > 0.5) bend(b, ax, (fn === "Thumb" ? 0.5 : 1) * amt * (k === 1 ? 0.9 : 0.7));
  }));
}
function turnW(bone, from, to, w) {   // turn a joint in world space so `from` points along `to`, by weight w
  const dq = new THREE.Quaternion().setFromUnitVectors(from, to), q = new THREE.Quaternion().slerp(dq, w);
  const pw = bone.parent.getWorldQuaternion(new THREE.Quaternion()), bw = bone.getWorldQuaternion(new THREE.Quaternion());
  bone.quaternion.copy(pw.invert().multiply(q.multiply(bw))); bone.updateMatrixWorld(true);
}
// A hand onto a ball: the finger pads (the middle finger's second joint) on the contact point, the palm turned to
// the ball's center, so the ball rides the fingertips (the owner: "should be on his fingertips").
function handOn(fig, side, contact, ballC, w, pole) {
  const wrist = contact.clone().add(V(0, 7, 0));
  for (let it = 0; it < 2; it++) {
    reach(fig, side, wrist, pole, w);
    if (ballC) { const pm = palm(fig, side); turnW(fig.B[side + "Hand"], pm.n, ballC.clone().sub(pm.c).normalize().add(V(0, -1, 0)).normalize(), w); fig.root.updateMatrixWorld(true); }   // the palm down, onto the ball
    wrist.add(contact.clone().sub(wpos(fig, side + "HandMiddle2")).multiplyScalar(0.9));
  }
}
function turn(bone, from, to) {   // rotate a joint in world space so `from` points along `to`
  const dq = new THREE.Quaternion().setFromUnitVectors(from, to);
  const pw = bone.parent.getWorldQuaternion(new THREE.Quaternion()), bw = bone.getWorldQuaternion(new THREE.Quaternion());
  bone.quaternion.copy(pw.invert().multiply(dq.multiply(bw)));
  bone.updateMatrixWorld(true);
}
// Pose a figure at scene time t: the capture at the scene's clock, then its changes in order.
function pose(fig, t) {
  const ct = fig.rest ? 0 : fig.clock(t);
  if (!fig.rest) applyPlan(fig, fig.plan ? fig.plan(t) : [{ name: "main", t: ct, w: 1 }]);
  if (fig.shift) { fig.root.position.copy(fig.home).add(fig.shift(t)); }
  if (fig.jump && (fig.jumpUntil == null || t < fig.jumpUntil)) {   // a jump stretched (or shrunk) above standing height, the approach and landing untouched
    const h = fig.B.Hips.position, s = fig.jump; h.y = s.base + Math.max(0, h.y - s.base) * s.k + Math.min(0, h.y - s.base);
    if (s.kz) h.z = s.z0 + (h.z - s.z0) * s.kz;
  }
  fig.root.updateMatrixWorld(true);
  fig.mods.forEach((m) => m(fig, t, ct));
  fig.root.updateMatrixWorld(true);
}
// Weighted clips on one body: [{ name, t, w }] with the weights summing to 1. Sampled here and written to every
// joint every frame (three.js's mixer skips a joint whose value did not change, which let the changes laid on top
// of a held pose pile up from frame to frame).
function bindClip(fig, clip) {
  return clip.tracks.map((tr) => { const dot = tr.name.lastIndexOf("."), bone = fig.B[tr.name.slice(0, dot).replace(/^mixamorig:?/, "")], prop = tr.name.slice(dot + 1);
    return bone && (prop === "quaternion" || prop === "position") ? { bone, prop, it: tr.createInterpolant() } : null; }).filter(Boolean);
}
function applyPlan(fig, plan) {
  const vals = new Map(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  plan.forEach((e) => {
    if (e.w <= 0) return;
    const clip = fig.clips[e.name], t = clamp(e.t, 0, clip.duration - 1e-4);
    fig.binds[e.name].forEach((b) => {
      const v = Array.from(b.it.evaluate(t)), key = b.bone.id + b.prop, cur = vals.get(key);
      if (!cur) { vals.set(key, { b, v, w: e.w }); return; }
      const u = e.w / (cur.w + e.w);
      if (b.prop === "quaternion") { qa.fromArray(cur.v).slerp(qb.fromArray(v), u); cur.v = qa.toArray(); } else for (let k = 0; k < 3; k++) cur.v[k] += (v[k] - cur.v[k]) * u;
      cur.w += e.w;
    });
  });
  vals.forEach(({ b, v }) => (b.prop === "quaternion" ? b.bone.quaternion.fromArray(v) : b.bone.position.fromArray(v)));
}
// Another capture for the same body (Mixamo's skeleton names match): only its hips carry position.
async function addClip(fig, url) {
  const obj = await LOADER.loadAsync(url);
  const clip = obj.animations.slice().sort((a, b) => b.duration - a.duration)[0];
  clip.tracks = clip.tracks.filter((tr) => !/\.position$/.test(tr.name) || /Hips\.position$/.test(tr.name));
  return clip;
}
function useClip(fig, name, clip) { fig.clips[name] = clip; fig.binds[name] = bindClip(fig, clip); }
// A clip moved and turned so that at its time tA the hips stand at { x, z } facing yaw (the figure's own space).
function rebase(clip, tA, to) {
  const c = clip.clone(), pt = c.tracks.find((tr) => /Hips\.position$/.test(tr.name)), qt = c.tracks.find((tr) => /Hips\.quaternion$/.test(tr.name));
  const p0 = pt.createInterpolant().evaluate(tA).slice(), q0 = new THREE.Quaternion().fromArray(qt.createInterpolant().evaluate(tA).slice());
  const f0 = V(0, 0, 1).applyQuaternion(q0), dq = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), to.yaw - Math.atan2(f0.x, f0.z));
  for (let i = 0; i < pt.values.length; i += 3) { const v = V(pt.values[i] - p0[0], 0, pt.values[i + 2] - p0[2]).applyQuaternion(dq); pt.values[i] = to.x + v.x; pt.values[i + 2] = to.z + v.z; }
  const q = new THREE.Quaternion(); for (let i = 0; i < qt.values.length; i += 4) { q.fromArray(qt.values, i); dq.clone().multiply(q).toArray(qt.values, i); }
  return c;
}
function hipsLocal(fig, t) { pose(fig, t); const h = fig.B.Hips, f = V(0, 0, 1).applyQuaternion(h.quaternion); return { x: h.position.x, y: h.position.y, z: h.position.z, yaw: Math.atan2(f.x, f.z) }; }
// The move, then its celebration: the capture until tB, a crossfade of `fade` into the celebration clip from its
// time c0 (moved to where he stands, turned to face yawWorld: the camera). The jump stretch stops at tB.
function thenCelebrate(fig, name, raw, tB, fade, c0, yawWorld) {
  const at = hipsLocal(fig, tB), yaw = yawWorld == null ? at.yaw : yawWorld - fig.root.rotation.y;
  useClip(fig, name, rebase(raw, c0, { x: at.x, z: at.z, yaw }));
  const clock = fig.clock;
  fig.plan = (t) => { const w = smooth(tB, tB + fade, t), P = []; if (w < 1) P.push({ name: "main", t: clock(t), w: 1 - w }); if (w > 0) P.push({ name, t: c0 + Math.max(0, t - tB), w }); return P; };
  fig.jumpUntil = tB;
}
// Where a figure's joints go over the whole scene, sampled finely before any change is laid on (pure lookups after).
function track(fig, len, names) {
  const dt = 1 / 120, n = Math.ceil(len / dt) + 2, out = {}; names.forEach((k) => (out[k] = []));
  const mods = fig.mods; fig.mods = [];
  for (let i = 0; i <= n; i++) { pose(fig, i * dt); names.forEach((k) => out[k].push(k === "fwd" ? (() => { const q = fig.B.Hips.getWorldQuaternion(new THREE.Quaternion()); const f = V(0, 0, 1).applyQuaternion(q); f.y = 0; return f.normalize(); })() : wpos(fig, k))); }
  fig.mods = mods;
  return (k, t) => { const a = out[k], x = clamp(t / dt, 0, a.length - 1.001), i = Math.floor(x); return a[i].clone().lerp(a[i + 1], x - i); };
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
  const rimG = new THREE.Group(); rimG.position.set(0, 0, -23); g.add(rimG);   // the rim and net hinge at the rim's back: a dunk bends it down
  const rim = tagMesh(new THREE.Mesh(new THREE.TorusGeometry(23, 1.5, 10, 64), SHADE), "rim"); rim.rotation.x = Math.PI / 2; rim.position.z = 23; rimG.add(rim);
  const neck = tagMesh(new THREE.Mesh(new THREE.BoxGeometry(6, 2.5, 16), SHADE), "rim"); neck.position.set(0, -0.5, -30); g.add(neck);
  const board = tagMesh(new THREE.Mesh(new THREE.BoxGeometry(183, 107, 2), SHADE_DIM), "board", { glass: true, noShade: true }); board.position.set(0, 107 / 2 - 15, -39.5); g.add(board);
  const frame = (w, h, cx, cy, z, th) => [[0, h / 2, w, th], [0, -h / 2, w, th], [-w / 2, 0, th, h], [w / 2, 0, th, h]].forEach(([x, y, ww, hh]) => {
    const m = tagMesh(new THREE.Mesh(new THREE.BoxGeometry(ww, hh, 1.2), SHADE), "mark"); m.position.set(cx + x, cy + y, z); g.add(m);
  });
  frame(183, 107, 0, 107 / 2 - 15, -38.2, 3.5);   // the glass's edge
  frame(59, 45, 0, 22.5, -38.2, 3.5);   // the shooter's square, its bottom on the rim's height
  const net = tagMesh(new THREE.Mesh(new THREE.BufferGeometry(), SHADE), "net"); net.position.z = 23; rimG.add(net);
  g.position.copy(at); g.rotation.y = Math.atan2(facing.x, facing.z); g.updateMatrixWorld(true);
  const hoop = { g, rimG, rim, net, at: at.clone(), facing: facing.clone().normalize(), whip: [] };
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
  // debug: a close-up of the neck and collarbones (the joint rings tinted as the rival's skin)
  async neck(sc) {
    const hero = await makeFigure(sc.raw + "dribble.fbx", { layer: "A", number: "82", debugJoints: true });
    hero.rest = true; hero.clock = () => 0;
    sc.cast = [hero]; sc.ballAt = () => null; sc.len = 2; sc.key = 99;
    sc.cameraAt = (t) => ({ pos: orbit(V(0, 140, 0), [0, 25, 60, 0][Math.min(3, Math.floor(t * 2))], [8, 8, 8, 40][Math.min(3, Math.floor(t * 2))], 150), target: V(0, 140, 0), fov: 26 });
  },
  // debug: the dressed body in its rest pose, turning (front, three-quarter, side, back)
  async tpose(sc) {
    const hero = await makeFigure(sc.raw + "dribble.fbx", { layer: "A", number: "82" });
    hero.rest = true; hero.clock = () => 0;
    if (sc.hideSkin) hero.obj.traverse((m) => { if (m.isMesh && /^skin/.test(m.userData.layer || "")) m.visible = false; });
    sc.cast = [hero]; sc.ballAt = () => null; sc.len = 2; sc.key = 99;
    sc.cameraAt = (t) => ({ pos: orbit(V(0, 125, 0), [0, 35, 90, 180][Math.min(3, Math.floor(t * 2))], 4, 330), target: V(0, 125, 0), fov: 26 });
  },
  // THE CROSSOVER (guard). The owner on reel 2: "should probably not rotate. his body hold still and have him dribble
  // between his legs, behind both his legs, and in front of his legs. he should dribble rapidly with a stylized teal
  // trail ... the ball ... should be on his fingertips". The references (Kyrie's combos, behind-the-back drills): a
  // wide low stance, head up, a hard low pound, the hand on top of the ball, the off arm out. Mixamo's dribble is held
  // at its low point and squared to the camera; both arms are driven through the combo (two-bone reach, the hand
  // turned onto the ball so the finger pads take it); then he lets the last one go and shrugs (Mixamo's Shrugging).
  async crossover(sc) {
    const hero = await makeFigure(sc.raw + "dribble.fbx", { layer: "A" });
    const shrugRaw = await addClip(hero, sc.raw + "shrugging.fbx");
    hero.clock = () => 0.28;   // the capture's low point, held: the stance
    pose(hero, 0);
    { const q = hero.B.Hips.getWorldQuaternion(new THREE.Quaternion()), f = V(0, 0, 1).applyQuaternion(q); hero.root.rotation.y = -Math.atan2(f.x, f.z); hero.root.updateMatrixWorld(true); }
    pose(hero, 0);
    const H = wpos(hero, "Hips"), FL = wpos(hero, "LeftToeBase"), FR = wpos(hero, "RightToeBase"), mid = FL.clone().add(FR).multiplyScalar(0.5);
    const sg = { Left: 1, Right: -1 }, at = (dx, y, dz) => V(H.x + dx, y, H.z + dz);
    const top = (s) => at(sg[s] * 28, 51, 30), pound = (s) => at(sg[s] * 31, BALL_R, 30);   // a low pound: the arm hangs nearly straight to the ball
    const cross = at(0, BALL_R, 40), legs = V(mid.x, BALL_R, mid.z - 4), back = V(H.x, BALL_R, Math.min(FL.z, FR.z) - 18);
    const legsIn = at(22, 50, 34), legsOut = at(-31, 50, 12), backIn = at(-25, 51, 4), backOut = at(29, 51, 16);
    const T = 0.27;
    const steps = [
      { a: "Right", b: "Right", F: pound("Right") }, { a: "Right", b: "Right", F: pound("Right") },
      { a: "Right", b: "Left", F: cross },                                   // in front: the crossover
      { a: "Left", b: "Left", F: pound("Left"), E: legsIn },
      { a: "Left", b: "Right", F: legs, E: legsOut },                        // between the legs
      { a: "Right", b: "Right", F: pound("Right"), E: backIn },
      { a: "Right", b: "Left", F: back, E: backOut },                        // behind both legs
      { a: "Left", b: "Left", F: pound("Left") },
      { a: "Left", b: "Right", F: cross },                                   // and back across
      { a: "Right", b: "Right", F: pound("Right") },
      { a: "Right", b: null, F: pound("Right") }                             // the last one he lets go
    ];
    const P = [top("Right")];
    steps.forEach((st, k) => {
      st.t0 = k * T; st.t1 = (k + 1) * T; st.S = P[k]; st.E = st.E || (st.b ? top(st.b) : null); P.push(st.E);
      const d1 = st.S.distanceTo(st.F), d2 = st.E ? st.F.distanceTo(st.E) : d1;
      st.uD = 0.08 + 0.84 * d1 / (d1 + d2);
      st.at = (u) => u <= st.uD ? st.S.clone().lerp(st.F, Math.pow(u / st.uD, 1.25)) : st.E.clone().lerp(st.F, Math.pow(1 - (u - st.uD) / (1 - st.uD), 1.25));
    });
    const last = steps[steps.length - 1], tFloor = last.t0 + T * last.uD;
    const away = loose(last.F.clone(), V(-150, 520, 300), tFloor, 0.55, 0.8);
    sc.ballAt = (t) => {
      const k = Math.floor(t / T);
      if (k < steps.length - 1) { const st = steps[Math.max(0, k)]; return { p: st.at(clamp((t - st.t0) / T, 0, 1)) }; }
      return { p: t < tFloor ? last.S.clone().lerp(last.F, Math.pow(clamp((t - last.t0) / (tFloor - last.t0), 0, 1), 1.25)) : away(t) };
    };
    // who holds the ball when: the pusher from his catch to the release (a third of the way down), the receiver from
    // a third of the way up to the top
    const contacts = { Left: [], Right: [] };
    steps.forEach((st, k) => {
      const start = k ? steps[k - 1].tCatch : 0;
      st.tRel = st.t0 + T * 0.35 * st.uD; st.tCatch = st.b ? st.t0 + T * (1 - 0.32 * (1 - st.uD)) : null;
      contacts[st.a].push([start, st.tRel]);
    });
    const ballTop = (t) => sc.ballAt(t).p.clone().add(V(0, BALL_R, 0));
    const ready = (s) => at(sg[s] * 20, 60, 50);   // the off arm out in front of him, low: the arm bar
    const handAt = (s, t) => {
      const on = contacts[s].find(([a, b]) => t >= a && t <= b);
      if (on) return { p: ballTop(t), on: true };
      const past = contacts[s].filter(([a, b]) => b < t).pop(), next = contacts[s].find(([a]) => a > t);
      const t0 = past ? past[1] : 0, p0 = past ? ballTop(t0) : ready(s), rd = ready(s);
      let q;
      if (next && next[0] - t0 < 0.55) { const u = smooth(t0, next[0], t); q = p0.clone().lerp(ballTop(next[0]), u); q.y += 9 * Math.sin(Math.PI * u); }
      else if (t < t0 + 0.25) q = p0.clone().lerp(rd, smooth(t0, t0 + 0.25, t));
      else if (!next || t < next[0] - 0.3) q = rd;
      else q = rd.clone().lerp(ballTop(next[0]), smooth(next[0] - 0.3, next[0], t));
      return { p: q, on: false, near: !!(next && next[0] - t < 0.12) };
    };
    const TB = (steps.length - 1) * T + 0.1, W = (t) => 1 - smooth(TB, TB + 0.3, t);
    hero.mods.push((f, t) => {
      const w = W(t); if (w <= 0) return;
      f.B.Hips.position.y -= 2.2 * w * Math.exp(-Math.pow(((t % T) - 0.05) / 0.05, 2));   // a little pump on every push; otherwise he holds still
      f.root.updateMatrixWorld(true);
      bend(f.B.Spine1, V(1, 0, 0), 0.1 * w); bend(f.B.Spine2, V(1, 0, 0), 0.05 * w); bend(f.B.Neck, V(1, 0, 0), -0.55 * w);   // down in the stance, head up
      f.root.updateMatrixWorld(true);
      const bp = sc.ballAt(t).p;
      ["Right", "Left"].forEach((s) => {
        const h = handAt(s, t), sh = wpos(f, s + "Arm");
        const pole = sh.clone().add(V(sg[s] * 50, -28, h.p.z < H.z + 8 ? -24 : 12));   // behind the back the elbow goes back
        handOn(f, s, h.p, h.on || h.near ? bp : null, w, pole);
      });
    });
    thenCelebrate(hero, "shrug", shrugRaw, TB, 0.35, 0.25, null);
    sc.cast = [hero]; sc.trail = true;
    sc.len = TB + 1.3; sc.key = 6 * T;
    const tg = at(0, 74, 16);
    sc.cameraAt = () => ({ pos: orbit(tg, 0, 6, 455), target: tg, fov: 26 });
  },

  // THE SLAM (forward): a one-hand tomahawk. The owner: the hoop "shifted right", "arms should be extended at the
  // apex" as the ball goes into the cylinder, "let his hands drop to his sides then have him do a celebration", and
  // "crazy stylized visual flair" when it goes in. The references (LeBron's and Ja Morant's tomahawks): cocked high
  // behind the head on an extended arm at the top of the jump, chopped forward over the front of the rim, the arm
  // finishing extended over the cylinder; the rim in front of the shoulder, a little under it. Mixamo's Jump Attack
  // carries the body; the arm is driven; then Mixamo's Roar, turned to the camera.
  async slam(sc) {
    const hero = await makeFigure(sc.raw + "jump-attack.fbx", { layer: "A" });
    const roarRaw = await addClip(hero, sc.raw + "roar.fbx");
    const T0 = 0.1; hero.clock = (t) => t + T0;
    const TR = track(hero, 2.6, ["RightArm", "LeftArm", "Head", "Hips", "Spine2", "fwd"]);
    let apex = 0.9, best = -1e9; for (let t = 0.6; t < 1.3; t += 1 / 120) { const y = TR("Hips", t).y; if (y > best) { best = y; apex = t; } }
    const DUNK = apex + 0.02, CHOP = DUNK - 0.13, COCK = DUNK - 0.3;
    const F = TR("fwd", DUNK), UP = V(0, 1, 0), RA = 62, rad = THREE.MathUtils.degToRad;
    const dirAt = (th) => F.clone().multiplyScalar(Math.cos(th)).add(UP.clone().multiplyScalar(Math.sin(th)));
    const thCock = rad(122), thDunk = rad(-17);
    const ballDunk = TR("RightArm", DUNK).add(dirAt(thDunk).multiplyScalar(RA)), rimC = ballDunk.clone().add(V(0, -8, 0));
    const hoop = makeHoop(rimC, F.clone().negate());
    const chest = (t) => TR("Spine2", t).add(TR("fwd", t).multiplyScalar(26)).add(V(0, -8, 0));
    const over = (t) => TR("Head", t).add(V(0, 26, 0)).add(TR("fwd", t).multiplyScalar(6));
    const cock = (t) => TR("RightArm", t).add(dirAt(thCock).multiplyScalar(RA));
    const chop = (t) => { const u = smooth(CHOP, DUNK, t); return TR("RightArm", t).add(dirAt(lerp(thCock, thDunk, u * u * (1.6 - 0.6 * u))).multiplyScalar(RA)); };
    const held = (t) => t < 0.42 ? chest(t) : t < 0.62 ? chest(t).lerp(over(t), smooth(0.42, 0.62, t)) : t < COCK + 0.12 ? over(t).lerp(cock(t), smooth(0.62, COCK + 0.12, t)) : t < CHOP ? cock(t) : chop(t);
    const IN = 0.07, NET = 0.08, pNet = rimC.clone().add(V(0, -30, 0)).add(F.clone().multiplyScalar(5));
    const out = loose(pNet, V(0, -150, 0).add(F.clone().multiplyScalar(140)), DUNK + IN + NET, 0.36, 0.75);
    sc.ballAt = (t) => ({ p: t <= DUNK ? held(t) : t < DUNK + IN ? ballDunk.clone().lerp(rimC.clone().add(V(0, -8, 0)), (t - DUNK) / IN)
      : t < DUNK + IN + NET ? rimC.clone().add(V(0, -8, 0)).lerp(pNet, smooth(DUNK + IN, DUNK + IN + NET, t)) : out(t) });
    const TB = 1.62, FADE = 0.35, side = (s) => V().crossVectors(UP, F).normalize().multiplyScalar(s === "Left" ? 1 : -1);
    hero.mods.push((f, t) => {
      const b = sc.ballAt(t).p, drop = smooth(DUNK + 0.18, DUNK + 0.42, t) * (1 - smooth(TB, TB + FADE, t));
      SIDES.forEach((s) => {
        const sh = wpos(f, s + "Arm"), sd = side(s);
        const both = smooth(0.12, 0.4, t) * (1 - smooth(0.58, 0.7, t));   // both hands on the ball through the gather and the raise
        if (both > 0) reach(f, s, b.clone().add(sd.clone().multiplyScalar(BALL_R + 3)), sh.clone().add(sd.clone().multiplyScalar(40)).add(V(0, -30, 0)).add(F.clone().multiplyScalar(-20)), both);
        if (s === "Right") {
          const one = smooth(0.58, 0.7, t) * (1 - smooth(DUNK, DUNK + 0.03, t));   // behind the ball: cocked, then the chop
          if (one > 0) { const behind = b.clone().sub(sh).normalize(); reach(f, s, b.clone().sub(behind.multiplyScalar(BALL_R + 4)), sh.clone().add(sd.clone().multiplyScalar(40)).add(V(0, -20, 0)), one); }
          const rim = smooth(DUNK - 0.01, DUNK + 0.04, t) * (1 - smooth(DUNK + 0.16, DUNK + 0.26, t));   // then on the rim, the arm out over the cylinder
          if (rim > 0) reach(f, s, rimC.clone().add(F.clone().multiplyScalar(-21)).add(sd.clone().multiplyScalar(5)).add(V(0, 3, 0)), sh.clone().add(sd.clone().multiplyScalar(40)).add(V(0, -10, 0)), rim);
        } else {
          const bal = smooth(0.6, 0.75, t) * (1 - smooth(DUNK + 0.2, DUNK + 0.35, t));   // the free arm forward for balance
          if (bal > 0) reach(f, s, sh.clone().add(F.clone().multiplyScalar(34)).add(sd.clone().multiplyScalar(8)).add(V(0, -28, 0)), sh.clone().add(sd.clone().multiplyScalar(40)).add(V(0, -30, 0)), bal);
        }
        if (drop > 0) { const hp = wpos(f, "Hips"); reach(f, s, hp.clone().add(sd.clone().multiplyScalar(26)).add(V(0, -8, 0)), sh.clone().add(sd.clone().multiplyScalar(30)).add(V(0, -20, 0)).add(F.clone().multiplyScalar(-25)), drop); }   // his hands drop to his sides
      });
    });
    const camAz = (t) => -68 + 10 * smooth(0, 3.7, t);
    thenCelebrate(hero, "roar", roarRaw, TB, FADE, 1.05, THREE.MathUtils.degToRad(camAz(3.7)));
    sc.cast = [hero]; sc.hoop = hoop;
    sc.impacts = [{ t: DUNK + 0.05, at: rimC.clone(), kind: "dunk", power: 1 }];
    sc.trailWin = [[CHOP - 0.02, DUNK + IN], [DUNK + IN + NET, 9]];
    sc.slowmo = [{ t0: DUNK - 0.03, t1: DUNK + 0.2, speed: 0.3 }];
    sc.len = TB + 2.05; sc.key = DUNK + 0.05;
    const TH = track(hero, sc.len, ["Hips"]), HS = (t) => { const m = V(); for (let k = -6; k <= 6; k++) m.add(TH("Hips", clamp(t + k / 60, 0, sc.len))); return m.divideScalar(13); };
    sc.cameraAt = (t) => {
      const w = smooth(0.4, 0.85, t) * (1 - smooth(DUNK + 0.25, DUNK + 0.7, t)), h = HS(t);
      const tg = h.clone().add(V(0, 30, 0)).lerp(rimC.clone().add(V(0, -40, 0)).add(F.clone().multiplyScalar(-40)), w);
      return { pos: orbit(tg, camAz(t), 4, lerp(500, 600, w)), target: tg, fov: 26 };
    };
  },

  // THE BLOCK (center). The owner: the one blocked "shorter and deemphasized visually - like only a quiet outline",
  // the blocker "should leap in from out of the right side of the frame", an impact. The references: blocks come at or
  // above the rim's height, a foot or two in front of it, the blocker straight up with the arm fully extended. Mixamo's
  // Defender (its spinning leap stretched and flown in from off the frame), a quiet rival (Jump Attack cut to a human
  // jump, at 90%) going up for a tomahawk; then the finger wag, Mixamo's No, turned to the camera.
  async block(sc) {
    const hero = await makeFigure(sc.raw + "defender.fbx", { layer: "A" });
    const wagRaw = await addClip(hero, sc.raw + "no-finger-wag.fbx");
    const rival = await makeFigure(sc.raw + "jump-attack.fbx", { layer: "B" });
    rival.quiet = true; rival.root.scale.setScalar(0.9); rival.root.updateMatrixWorld(true);
    const TC = 1.15, tA = 0.93, tD = 0.3, IN = 0.5;
    rival.clock = (t) => t - TC + tA;
    rival.jump = { base: 92, k: 0.36, z0: 0, kz: 0.55 };
    const RT = track(rival, 2.8, ["LeftHand", "RightHand"]);
    const at = (t) => RT("LeftHand", t).add(RT("RightHand", t)).multiplyScalar(0.5).add(V(0, 6, 0));   // his ball, between his hands
    rival.mods.push((f, t) => {
      if (t > TC + 0.02) return;
      const c = at(t), hold = smooth(0.15, 0.45, t) * (1 - smooth(TC - 0.01, TC + 0.02, t));
      SIDES.forEach((s) => { const out = V(s === "Left" ? 1 : -1, 0, 0); reach(f, s, c.clone().add(out.clone().multiplyScalar(BALL_R + 3)), wpos(f, s + "Arm").add(out.multiplyScalar(40)).add(V(0, -30, -20)), hold); });
    });
    const bC = at(TC), rimC = bC.clone().add(V(0, -18, 50));   // the rim just past the ball and under it: he was about to put it in
    const hoop = makeHoop(rimC, V(0, 0, -1));
    hero.clock = (t) => t < TC ? clamp((t - (TC - IN)) / IN, 0, 1) * tD : tD + (t - TC);   // his leap: the capture's first 0.3 s over IN
    pose(hero, TC - IN); const h0 = wpos(hero, "Hips"); pose(hero, TC); const h1 = wpos(hero, "Hips"), lead = h1.clone().sub(h0);
    hero.root.rotation.y = Math.PI - Math.atan2(lead.x, lead.z); hero.root.updateMatrixWorld(true);   // the leap comes straight at the rival
    pose(hero, TC); const shL = wpos(hero, "LeftArm");
    hero.root.position.add(bC.clone().add(V(-10, -54, 22)).sub(shL)); hero.root.updateMatrixWorld(true);   // the left shoulder under the ball, rim side, nearer the camera: straight up
    hero.home = hero.root.position.clone();
    hero.shift = (t) => V(0, 0, 230 * Math.pow(1 - smooth(TC - IN, TC - 0.03, t), 1.25));   // flown in from off the right of the frame
    hero.mods.push((f, t) => {
      const w = smooth(TC - 0.24, TC - 0.03, t) * (1 - smooth(TC + 0.05, TC + 0.25, t)); if (w <= 0) return;
      reach(f, "Left", at(Math.min(t, TC)).add(V(0, BALL_R + 2, -4)), wpos(f, "LeftArm").add(V(32, -20, 10)), w);
    });
    const flight = loose(bC, V(-70, 330, -620), TC, 0.5, 0.7);   // sent back out, high
    sc.ballAt = (t) => ({ p: t <= TC ? at(t) : flight(t) });
    const TB = TC + 0.42, camAz = (t) => -84 + 8 * smooth(0, 3.5, t);
    thenCelebrate(hero, "wag", wagRaw, TB, 0.35, 0.45, THREE.MathUtils.degToRad(camAz(3.5)));
    hero.mods.push((f, t) => {   // Mutombo's wag: the hand up beside his head, the index up and the rest curled, side to side
      const w = smooth(TB + 0.25, TB + 0.5, t); if (w <= 0) return;
      const head = wpos(f, "Head"), q = f.B.Hips.getWorldQuaternion(new THREE.Quaternion()), fw = V(0, 0, 1).applyQuaternion(q).setY(0).normalize(), rt = V().crossVectors(fw, V(0, 1, 0)).normalize();
      const wag = Math.sin((t - TB) * Math.PI * 2 * 2.6) * 7;
      reach(f, "Right", head.clone().add(rt.clone().multiplyScalar(24 + wag)).add(V(0, 12, 0)).add(fw.clone().multiplyScalar(14)), wpos(f, "RightArm").add(rt.clone().multiplyScalar(30)).add(V(0, -30, 0)), w);
      const hand = f.B.RightHand; turnW(hand, wpos(f, "RightHandMiddle1").sub(wpos(f, "RightHand")).normalize(), V(0, 1, 0), w);   // the hand points up
      curl(f, "Right", ["Middle", "Ring", "Pinky", "Thumb"], 1.25 * w);
    });
    sc.cast = [hero, rival]; sc.hoop = hoop;
    sc.impacts = [{ t: TC, at: bC.clone(), kind: "block", power: 1 }];
    sc.trailWin = [[TC, 9]];
    sc.slowmo = [{ t0: TC - 0.03, t1: TC + 0.18, speed: 0.3 }];
    sc.len = TB + 1.9; sc.key = TC;
    const TH = track(hero, sc.len, ["Hips"]);
    const tg = V(bC.x + 8, (rimC.y + 20) * 0.5 + 10, bC.z - 8);
    sc.cameraAt = (t) => { const late = smooth(TC + 0.35, TC + 1.1, t), hp = TH("Hips", clamp(t, 0, sc.len)); const tg2 = tg.clone().lerp(V(hp.x, 102, hp.z), late); return { pos: orbit(tg2, camAz(t), 4, lerp(620, 520, late)), target: tg2, fov: 26 }; };
  },

  // THE ALLEY-OOP (forward). The owner: "he needs to dunk with two hands and needs to really grab the ball briefly and
  // shove it downwards and in. currently it's like a tip in. and needs a celebration". Mixamo's Football Catch with the
  // jump stretched: the lob in from off the frame, both hands take it overhead, a beat of grip, shoved down through
  // the rim, a beat on the rim; then the Luka jump, arms spread (Mixamo's Joyful Jump), turned to the camera.
  async oop(sc) {
    const hero = await makeFigure(sc.raw + "football-catch.fbx", { layer: "A" });
    const joyRaw = await addClip(hero, sc.raw + "joyful-jump.fbx");
    const T0 = 0.35; hero.clock = (t) => t + T0;
    hero.jump = { base: 93, k: 1.55 };
    const TR = track(hero, 2.4, ["RightArm", "LeftArm", "Head", "Hips", "fwd"]);
    const CATCH = 1.5 - T0, GRIP = CATCH + 0.1, FLUSH = GRIP + 0.1;
    const F = TR("fwd", CATCH), UP = V(0, 1, 0);
    const C = TR("RightArm", CATCH).lerp(TR("LeftArm", CATCH), 0.5).add(V(0, 58, 0)).add(F.clone().multiplyScalar(10));   // both hands overhead
    const rimC = C.clone().add(F.clone().multiplyScalar(34)).add(V(0, -44, 0));
    const hoop = makeHoop(rimC, F.clone().negate());
    const pIn = C.clone().add(F.clone().multiplyScalar(-340)).add(V(-60, 70, 170)), pass = lob(pIn, CATCH - 0.62, C, CATCH);
    const gripAt = (t) => C.clone().add(TR("Head", t).sub(TR("Head", CATCH))).add(F.clone().multiplyScalar(-6 * smooth(CATCH, GRIP, t)));   // held overhead, drawn back a touch
    const shoveAt = (t) => gripAt(GRIP).lerp(rimC.clone().add(V(0, 6, 0)), Math.pow(smooth(GRIP, FLUSH, t), 1.4));
    const IN = 0.07, NET = 0.08, pNet = rimC.clone().add(V(0, -30, 0)).add(F.clone().multiplyScalar(4));
    const out = loose(pNet, V(0, -150, 0).add(F.clone().multiplyScalar(150)), FLUSH + IN + NET, 0.36, 0.75);
    sc.ballAt = (t) => ({ p: t < CATCH - 0.62 ? null : t < CATCH ? pass(t) : t < GRIP ? gripAt(t) : t <= FLUSH ? shoveAt(t)
      : t < FLUSH + IN ? rimC.clone().add(V(0, 6, 0)).lerp(rimC.clone().add(V(0, -8, 0)), (t - FLUSH) / IN)
      : t < FLUSH + IN + NET ? rimC.clone().add(V(0, -8, 0)).lerp(pNet, smooth(FLUSH + IN, FLUSH + IN + NET, t)) : out(t) });
    const TB = 1.58, FADE = 0.28, side = (s) => V().crossVectors(UP, F).normalize().multiplyScalar(s === "Left" ? 1 : -1);
    hero.mods.push((f, t) => {
      const b = sc.ballAt(t).p, drop = smooth(FLUSH + 0.2, FLUSH + 0.42, t) * (1 - smooth(TB, TB + FADE, t));
      SIDES.forEach((s) => {
        const sh = wpos(f, s + "Arm"), sd = side(s);
        const hold = smooth(CATCH - 0.1, CATCH - 0.01, t) * (1 - smooth(FLUSH, FLUSH + 0.04, t));   // both hands on it: the grab and the shove
        if (hold > 0 && b) reach(f, s, b.clone().add(sd.clone().multiplyScalar(BALL_R + 2.5)).add(F.clone().multiplyScalar(-3)), sh.clone().add(sd.clone().multiplyScalar(40)).add(V(0, -10, 0)).add(F.clone().multiplyScalar(-25)), hold);
        const rim = smooth(FLUSH - 0.01, FLUSH + 0.04, t) * (1 - smooth(FLUSH + 0.16, FLUSH + 0.26, t));   // both hands on the rim a beat
        if (rim > 0) reach(f, s, rimC.clone().add(F.clone().multiplyScalar(-21)).add(sd.clone().multiplyScalar(10)).add(V(0, 3, 0)), sh.clone().add(sd.clone().multiplyScalar(40)), rim);
        if (drop > 0) { const hp = wpos(f, "Hips"); reach(f, s, hp.clone().add(sd.clone().multiplyScalar(26)).add(V(0, -8, 0)), sh.clone().add(sd.clone().multiplyScalar(30)).add(V(0, -20, 0)).add(F.clone().multiplyScalar(-25)), drop); }
      });
    });
    const camAz = (t) => 22 + 6 * smooth(0, 2.9, t);
    thenCelebrate(hero, "joy", joyRaw, TB, FADE, 0.3, THREE.MathUtils.degToRad(camAz(2.9)));
    sc.cast = [hero]; sc.hoop = hoop;
    sc.impacts = [{ t: FLUSH + 0.04, at: rimC.clone(), kind: "dunk", power: 0.9 }];
    sc.trailWin = [[0, CATCH], [GRIP, FLUSH + IN], [FLUSH + IN + NET, 9]];
    sc.slowmo = [{ t0: FLUSH - 0.03, t1: FLUSH + 0.18, speed: 0.3 }];
    sc.len = TB + 1.3; sc.key = FLUSH + 0.04;
    const TH = track(hero, sc.len, ["Hips"]), HS = (t) => { const m = V(); for (let k = -6; k <= 6; k++) m.add(TH("Hips", clamp(t + k / 60, 0, sc.len))); return m.divideScalar(13); };
    sc.cameraAt = (t) => {
      const w = smooth(0.5, 1.0, t) * (1 - smooth(FLUSH + 0.25, FLUSH + 0.6, t)), h = HS(t);
      const tg = h.clone().add(V(0, 30, 0)).lerp(rimC.clone().add(V(0, -45, 0)).add(F.clone().multiplyScalar(-35)), w);
      return { pos: orbit(tg, camAz(t), 4, lerp(480, 580, w)), target: tg, fov: 26 };
    };
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

/* ---------- impacts, trails, quiet outlines: shared pieces ---------- */
// Each impact is seeded once: manga focus lines, sparks, the spikes of a comic burst. Ages run in real (frame) time,
// so the effects hit at full speed while the picture runs in slow motion.
function fxBits(im) {
  if (im.bits) return im.bits;
  const R = rng(im.seed || 7), bits = { lines: [], sparks: [], spikes: [], bolts: [] };
  for (let k = 0; k < 48; k++) bits.lines.push({ a: R() * Math.PI * 2, r0: 0.52 + R() * 0.38, w: 0.003 + R() * 0.009 });
  for (let k = 0; k < 70; k++) { const a = -Math.PI / 2 + (R() - 0.5) * Math.PI * 1.8, v = 380 + R() * 900; bits.sparks.push({ vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: 1.4 + R() * 3.4, c: R() < 0.5 ? "hot" : R() < 0.5 ? "offset" : "light" }); }
  for (let k = 0; k < 20; k++) bits.spikes.push(0.6 + R() * 0.4);
  for (let k = 0; k < 8; k++) bits.bolts.push({ a: (k / 8) * Math.PI * 2 + R() * 0.6, len: 0.55 + R() * 0.5, seed: (R() * 1e6) | 0 });
  return (im.bits = bits);
}
// The vector shapes of every live impact, in the given inks: the burst, two shockwaves, focus lines, sparks.
function fxShapes(g, fx, pal, parts = "slfk") {
  fx.forEach((e) => {
    const a = e.age, P = e.power, b = e.bits, x = e.x, y = e.y;
    if (parts.includes("s") && a < 0.24) {   // the burst: a jagged comic star behind the play
      const r = (70 + 300 * Math.pow(a / 0.24, 0.5)) * S * P, al = 1 - a / 0.24;
      g.fillStyle = rgba(pal.star, 0.95 * al); g.beginPath();
      b.spikes.forEach((k, j) => { const ang = (j / b.spikes.length) * Math.PI * 2 + e.spin, rr = j % 2 ? r * 0.4 : r * k, px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr; j ? g.lineTo(px, py) : g.moveTo(px, py); });
      g.closePath(); g.fill();
    }
    if (parts.includes("l") && a < 0.42) {   // focus lines: thin wedges from the frame's edge toward the impact
      const al = (1 - a / 0.42) * 0.9, D = Math.hypot(W, H); g.fillStyle = rgba(pal.lines, al);
      b.lines.forEach((l) => { const r0 = l.r0 * D * 0.5 * (0.75 + 0.25 * (1 - a / 0.42)), w = l.w * Math.PI; g.beginPath(); g.moveTo(x + Math.cos(l.a) * r0, y + Math.sin(l.a) * r0); g.lineTo(x + Math.cos(l.a - w) * D, y + Math.sin(l.a - w) * D); g.lineTo(x + Math.cos(l.a + w) * D, y + Math.sin(l.a + w) * D); g.closePath(); g.fill(); });
    }
    if (parts.includes("f")) [[0.5, 1100, pal.ring1, 12], [0.64, 720, pal.ring2, 7]].forEach(([life, reach, ink, w0]) => {   // shockwaves
      if (a >= life) return; const u = a / life, r = (30 + reach * (1 - Math.pow(1 - u, 3))) * S;
      g.strokeStyle = rgba(ink, (1 - u) * 0.95); g.lineWidth = Math.max(1, w0 * (1 - u) * S * P); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
    });
    if (parts.includes("k") && a < 0.85) {   // sparks: streaks flying out under gravity
      g.lineCap = "round";
      b.sparks.forEach((sp) => {
        const X = (t) => x + sp.vx * t * S * P, Y = (t) => y + (sp.vy * t + 0.5 * 1500 * t * t) * S * P, t0 = Math.max(0, a - 0.04);
        g.strokeStyle = rgba(pal.sparks[sp.c], 1 - a / 0.85); g.lineWidth = Math.max(1, sp.s * S * (1 - 0.6 * a / 0.85));
        g.beginPath(); g.moveTo(X(t0), Y(t0)); g.lineTo(X(a), Y(a)); g.stroke();
      });
    }
  });
}
// Lightning from the impact (neon): jagged, redrawn every other frame so it flickers.
function fxBolts(g, fx, ink, i) {
  fx.forEach((e) => {
    if (e.age >= 0.32) return;
    e.bits.bolts.forEach((bo) => {
      const R = rng(bo.seed + (i >> 1) * 7919), len = bo.len * (180 + 260 * e.power) * S; let x = e.x, y = e.y, a = bo.a;
      g.strokeStyle = rgba(ink, 1 - e.age / 0.32); g.lineWidth = 2.2 * S; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 9; k++) { a += (R() - 0.5) * 1.1; const st = len / 9; x += Math.cos(a) * st; y += Math.sin(a) * st; g.lineTo(x, y); }
      g.stroke();
    });
  });
}
// The ball's trail: a tapered ribbon through its last tenth of a second (the owner: "a stylized teal trail").
function ribbon(g, pts, width, ink, alpha) {
  if (!pts || pts.length < 2) return;
  g.lineCap = "round"; g.lineJoin = "round";
  for (let k = 1; k < pts.length; k++) { const u = k / (pts.length - 1); g.strokeStyle = rgba(ink, alpha * Math.pow(u, 0.8)); g.lineWidth = Math.max(1, width * Math.pow(u, 1.1)); g.beginPath(); g.moveTo(pts[k - 1].x, pts[k - 1].y); g.lineTo(pts[k].x, pts[k].y); g.stroke(); }
}
function halftoneFrom(g, src, o) {   // a halftone of a drawn canvas, its alpha as the density
  const d = src.getContext("2d").getImageData(0, 0, W, H).data;
  halftone(g, Object.assign({}, o, { dens: (p) => (d[p * 4 + 3] / 255) * (o.gain || 1) }));
}
function quietMask(L, who) { return union(L["skin" + who], L["kit" + who], L["pants" + who], L["trim" + who]); }

/* ---------- the styles ---------- */
// Figure inks: the hero in the site's pink with an aqua kit; the rival (when not quiet) in aqua with the road white.
const figInks = () => ({ A: { skin: INK.accent, kit: INK.offset, trim: INK.light }, B: { skin: INK.offset, kit: INK.light, trim: INK.accent } });
const STYLES = {
  // RISO: a three-drum print on black. Each ink its own screen angle and misregistration; skin pink, the kit aqua,
  // the trim white, the ball and rim gold, the net and glass thin white; a quiet rival is a thin dotted outline. Drawn
  // on twos with a hair of wobble, fluorescent bleed, paper tooth, a spotlight of dots under the feet, the ball's
  // teal trail; on an impact the paper floods pink, the drums jump out of register, and a gold burst, shockwaves,
  // focus lines and sparks print over it.
  riso(f, i, g, st, sc) {
    const hit = f.fx.length && f.fx.some((e) => e.age < 0.2);
    const k = hit ? i : i - (i % 2), R = rng(1000 + k), kick = hit ? 3 : 1, jit = () => Math.round((R() * 2 - 1) * S * kick);
    if (st.last && st.lastK === k) { g.drawImage(st.last, 0, 0); return; }
    const out = canvas(), o = out.getContext("2d"), L = f.L, fi = figInks(), sh = (p) => f.shade[p] / 255;
    o.fillStyle = "#000"; o.fillRect(0, 0, W, H); o.globalCompositeOperation = "screen";
    const d1 = { x: 5 * S * kick + jit(), y: -4 * S * kick + jit() }, d2 = { x: jit(), y: jit() }, d3 = { x: -3 * S * kick + jit(), y: 3 * S * kick + jit() };
    const flash = f.fx.reduce((m, e) => Math.max(m, e.age < 0.12 ? (1 - e.age / 0.12) * e.power : 0), 0);
    if (flash > 0) halftone(o, { ink: INK.accent, angle: 15, cell: 6 * S, dx: d2.x, dy: d2.y, max: 0.6, dens: () => 0.42 * flash });
    if (f.pools) f.pools.forEach((pl) => halftone(o, { ink: INK.offset, angle: 75, cell: 7 * S, dx: d1.x, dy: d1.y, max: 0.5, dens: (p) => { const x = p % W, y = (p / W) | 0, e = Math.pow((x - pl.x) / pl.rx, 2) + Math.pow((y - pl.y) / pl.ry, 2); return e < 1 ? 0.45 * (1 - e) * pl.a : 0; } }));
    if (f.fx.length) {   // the impact, printed: burst and sparks in gold, shockwaves pink and aqua, focus lines white
      const c1 = canvas(), g1 = c1.getContext("2d"); fxShapes(g1, f.fx, { star: "#ffffff", lines: "#ffffff", ring1: "#ffffff", ring2: "#ffffff", sparks: { hot: "#ffffff", offset: "#ffffff", light: "#ffffff" } }, "s");
      halftoneFrom(o, c1, { ink: INK.hot, angle: 45, cell: 5 * S, dx: d3.x, dy: d3.y, max: 0.62 });
      const c2 = canvas(), g2 = c2.getContext("2d"); fxShapes(g2, f.fx, { star: "#fff", lines: "#fff", ring1: "#fff", ring2: "#fff", sparks: {} }, "l");
      halftoneFrom(o, c2, { ink: INK.light, angle: 15, cell: 3.4 * S, dx: d2.x, dy: d2.y, max: 0.55 });
      const c3 = canvas(), g3 = c3.getContext("2d"); fxShapes(g3, f.fx, { star: "#fff", lines: "#fff", ring1: "#fff", ring2: "#fff", sparks: {} }, "f");
      halftoneFrom(o, c3, { ink: INK.accent, angle: 75, cell: 4 * S, dx: d1.x, dy: d1.y, max: 0.6 });
      fxShapes(o, f.fx, { sparks: { hot: INK.hot, offset: INK.offset, light: INK.light } }, "k");
    }
    halftone(o, { ink: INK.light, angle: 15, cell: 3.4 * S, dx: d2.x, dy: d2.y, max: 0.5, dens: (p) => (L.board[p] > 100 ? 0.04 : 0) + (L.mark[p] + L.net[p] > 90 ? 0.5 + 0.4 * sh(p) : 0) });
    halftone(o, { ink: INK.hot, angle: 45, cell: 3.4 * S, dx: d3.x, dy: d3.y, dens: (p) => (L.rim[p] > 90 ? 0.8 + 0.2 * sh(p) : 0) });
    ["B", "A"].forEach((who) => {
      if (f.quiet[who]) { const e = edgesOf(quietMask(L, who), 1.4 * S); halftone(o, { ink: INK.light, angle: 45, cell: 2.6 * S, dx: d2.x, dy: d2.y, max: 0.5, dens: (p) => (e[p] ? 0.42 : 0) }); return; }
      const ink = fi[who], sk = L["skin" + who], kt = L["kit" + who], pt = L["pants" + who], tr = L["trim" + who], cut = seam(kt, pt, 2);
      halftone(o, { ink: ink.skin, angle: 15, cell: 4.4 * S, dx: d2.x, dy: d2.y, dens: (p) => (sk[p] > 100 ? 0.18 + 0.82 * sh(p) : 0) });
      halftone(o, { ink: ink.kit, angle: 75, cell: 4.4 * S, dx: d1.x, dy: d1.y, dens: (p) => (cut[p] ? 0 : kt[p] > 100 ? 0.3 + 0.7 * sh(p) : pt[p] > 100 ? 0.22 + 0.6 * sh(p) : 0) });
      halftone(o, { ink: ink.trim, angle: 45, cell: 3.2 * S, dx: d3.x, dy: d3.y, dens: (p) => (tr[p] > 100 ? 0.5 + 0.5 * sh(p) : 0) });
    });
    if (f.trail && f.trail.length > 1) { const c4 = canvas(), g4 = c4.getContext("2d"); ribbon(g4, f.trail, 2 * BALL_R * f.ballPx * 0.9, "#ffffff", 1); halftoneFrom(o, c4, { ink: INK.offset, angle: 75, cell: 3.2 * S, dx: d1.x, dy: d1.y, max: 0.6 }); }
    halftone(o, { ink: INK.hot, angle: 45, cell: 3.6 * S, dx: d3.x, dy: d3.y, dens: (p) => (L.ball[p] > 100 ? 0.55 + 0.45 * sh(p) : L.seam[p] > 100 ? 0.05 : 0) });
    o.globalCompositeOperation = "source-over";   // fluorescent bleed, then paper tooth
    const bleed = canvas(), bg = bleed.getContext("2d"); bg.filter = `blur(${7 * S}px)`; bg.drawImage(out, 0, 0);
    o.globalCompositeOperation = "screen"; o.globalAlpha = 0.62; o.drawImage(bleed, 0, 0); o.globalAlpha = 1;
    o.globalCompositeOperation = "source-over"; o.fillStyle = "rgba(0,0,0,0.5)";
    for (let n = 0; n < 3200 * S * S; n++) o.fillRect((R() * W) | 0, (R() * H) | 0, 1 + (R() < 0.2), 1);
    st.last = out; st.lastK = k; g.drawImage(out, 0, 0);
  },
  // NEON: every piece a tube. Each layer's outline in its ink with a hot core and a glow, a faint fill, light trails
  // behind whatever moves, the ball's aqua trail; a quiet rival is one dim thin tube. On an impact: a white bloom,
  // lightning out of the rim, shockwaves, focus streaks and sparks.
  neon(f, i, g, st, sc) {
    const L = f.L, fi = figInks();
    if (!st.trail) { st.trail = canvas(); st.tg = st.trail.getContext("2d"); }
    const tube = (mask, ink, w, a = 1) => tint(edgesOf(mask, w), ink, a);
    const pic = canvas(), pg = pic.getContext("2d"); pg.globalCompositeOperation = "lighter";
    pg.drawImage(tube(L.mark, INK.offset, 1, 0.55), 0, 0);
    pg.drawImage(tint(L.net, INK.light, 0.5), 0, 0);
    pg.drawImage(tint(L.rim, INK.hot, 1), 0, 0);
    ["B", "A"].forEach((who) => {
      if (f.quiet[who]) { pg.drawImage(tube(quietMask(L, who), INK.light, 1, 0.38), 0, 0); return; }
      const ink = fi[who], sk = L["skin" + who], kt = L["kit" + who], pt = L["pants" + who], tr = L["trim" + who];
      pg.drawImage(tint(union(sk, kt, pt, tr), ink.skin, 0.1), 0, 0);
      pg.drawImage(tube(sk, ink.skin, 2 * S), 0, 0);
      pg.drawImage(tube(kt, ink.kit, 2 * S), 0, 0);
      pg.drawImage(tube(pt, ink.kit, 2 * S), 0, 0);
      pg.drawImage(tube(tr, INK.light, Math.max(1, 1.5 * S), 0.9), 0, 0);
    });
    if (f.trail && f.trail.length > 1) { pg.globalCompositeOperation = "lighter"; ribbon(pg, f.trail, 2 * BALL_R * f.ballPx * 0.8, INK.offset, 0.9); ribbon(pg, f.trail, 2 * BALL_R * f.ballPx * 0.25, "#ffffff", 0.7); }
    pg.drawImage(tint(L.ball, INK.hot, 1), 0, 0); pg.drawImage(tint(L.seam, "#000000", 1), 0, 0);
    const tg = st.tg; tg.globalCompositeOperation = "source-over"; tg.fillStyle = "rgba(0,0,0,0.2)"; tg.fillRect(0, 0, W, H);
    tg.globalCompositeOperation = "lighter"; tg.globalAlpha = 0.5; tg.drawImage(pic, 0, 0); tg.globalAlpha = 1;
    g.globalCompositeOperation = "source-over"; g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "lighter";
    g.filter = `blur(${8 * S}px)`; g.drawImage(st.trail, 0, 0); g.drawImage(pic, 0, 0); g.filter = `blur(${3 * S}px)`; g.drawImage(pic, 0, 0); g.filter = "none";
    g.drawImage(pic, 0, 0);
    if (f.fx.length) {
      const fxc = canvas(), fg = fxc.getContext("2d"); fg.globalCompositeOperation = "lighter";
      fxShapes(fg, f.fx, { star: INK.hot, lines: INK.accentHi, ring1: INK.hot, ring2: INK.accent, sparks: { hot: INK.hot, offset: INK.offset, light: "#ffffff" } }, "lfk");
      fxBolts(fg, f.fx, INK.offset, i); fxBolts(fg, f.fx.map((e) => Object.assign({}, e, { bits: Object.assign({}, e.bits, { bolts: e.bits.bolts.map((b) => Object.assign({}, b, { seed: b.seed + 1 })) }) })), "#ffffff", i);
      g.filter = `blur(${6 * S}px)`; g.drawImage(fxc, 0, 0); g.filter = "none"; g.drawImage(fxc, 0, 0);
      const flash = f.fx.reduce((m, e) => Math.max(m, e.age < 0.1 ? (1 - e.age / 0.1) * e.power : 0), 0);
      if (flash > 0) { g.globalCompositeOperation = "lighter"; g.fillStyle = rgba("#ffffff", 0.35 * flash); g.fillRect(0, 0, W, H); }
    }
  }
};

STYLES.chrono = function (f, i, g, st, sc) {
  // CHRONO: Marey's chronophotograph. Every third moment stays on the plate, aqua at the start to pink now, so the
  // move draws its own arc; the current moment prints opaque in pure inks; the ball's teal trail and dotted gold
  // path; a quiet rival only as an outline. On an impact the plate flashes and that moment stays burned in.
  const L = f.L;
  const figs = ["A", "B"].map((w) => (f.quiet[w] ? null : union(L["skin" + w], L["kit" + w], L["pants" + w], L["trim" + w])));
  if (!st.plates) { st.plates = []; st.dots = []; }
  if (i % 3 === 0) { st.plates.push({ m: figs }); if (st.plates.length > (sc.loop ? 8 : 34)) st.plates.shift(); }
  if (f.fx.some((e) => e.age === 0)) st.burn = figs[0];
  if (f.bp && i % 2 === 0) { st.dots.push({ x: f.bp.x, y: f.bp.y }); if (st.dots.length > (sc.loop ? 14 : 60)) st.dots.shift(); }
  g.globalCompositeOperation = "source-over"; g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "screen";
  g.drawImage(tint(union(L.mark, L.net, L.rim), INK.light, 0.55), 0, 0);
  st.plates.forEach((pl, k) => {
    const u = st.plates.length > 1 ? k / (st.plates.length - 1) : 1;
    pl.m.forEach((m, w) => { if (m) g.drawImage(tint(m, w ? mix(INK.light, INK.offset, u) : mix(INK.offset, INK.accent, u), 0.2 + 0.4 * u), 0, 0); });
  });
  if (st.burn) g.drawImage(tint(st.burn, INK.accentHi, 0.55), 0, 0);   // the dunk's moment, burned into the plate
  if (f.trail && f.trail.length > 1) ribbon(g, f.trail, 2 * BALL_R * f.ballPx * 0.8, INK.offset, 0.85);
  g.globalCompositeOperation = "source-over";   // the current moment prints opaque, in pure inks, over its trail
  ["B", "A"].forEach((w) => {
    if (f.quiet[w]) { g.drawImage(tint(edgesOf(quietMask(L, w), 1), "#ffffff", 0.45), 0, 0); return; }
    const k = w === "B" ? 1 : 0, kit = union(L["kit" + w], L["pants" + w]);
    g.drawImage(tint(L["skin" + w], k ? INK.offset : INK.accent, 1), 0, 0);
    g.drawImage(tint(kit, k ? INK.light : INK.offset, 1), 0, 0);
    g.drawImage(tint(L["trim" + w], "#ffffff", 1), 0, 0);
    g.drawImage(tint(edgesOf(figs[k], 1), "#ffffff", 0.75), 0, 0);
  });
  g.globalCompositeOperation = "screen";
  if (f.fx.length) { fxShapes(g, f.fx, { ring1: INK.light, ring2: INK.accent, sparks: { hot: INK.hot, offset: INK.offset, light: "#ffffff" } }, "fk"); const flash = f.fx.reduce((m, e) => Math.max(m, e.age < 0.08 ? (1 - e.age / 0.08) * e.power : 0), 0); if (flash > 0) { g.fillStyle = rgba(INK.accentHi, 0.22 * flash); g.fillRect(0, 0, W, H); } }
  g.fillStyle = INK.hot; st.dots.forEach((d, k) => { g.beginPath(); g.arc(d.x, d.y, (k === st.dots.length - 1 ? 6 : 2.4) * S, 0, Math.PI * 2); g.fill(); });
  g.drawImage(tint(L.ball, INK.hot, 1), 0, 0);
};

/* ---------- the run: build the scene, pose every moment, print every style, hand frames to node ---------- */
async function build(id, raw) {
  scene.children.slice().forEach((c) => { if (c !== key && c !== fill && c !== amb && c !== key.target && c !== fill.target) scene.remove(c); });
  const sc = { id, raw: raw || "raw/", hideSkin: /nude$/.test(id) };
  await SCENES[id.replace(/nude$/, "")](sc);
  sc.ball = makeBall();
  sc.impacts = (sc.impacts || []).map((im, k) => Object.assign({ seed: 99 + k * 31, spin: k * 0.37 }, im));
  return sc;
}
// Scene time for every frame: real time, except the slow motion around an impact (0.3x for a fifth of a second).
function frameTimes(sc) {
  const out = []; let t = 0;
  while (t < sc.len - 1e-9 && out.length < 5000) {
    out.push(t); let sp = 1;
    (sc.slowmo || []).forEach((m) => { sp = Math.min(sp, lerp(1, m.speed, smooth(m.t0 - 0.05, m.t0, t) * (1 - smooth(m.t1, m.t1 + 0.1, t)))); });
    t += sp / FPS;
  }
  return out;
}
function frame(sc, t, i, prev) {
  sc.cast.forEach((fig) => pose(fig, t));
  const bp = sc.ballAt(t), p = bp && bp.p;
  sc.ball.visible = !!p;
  if (p) {
    if (prev && prev.p) {   // spin: roll with the ball's travel
      const v = p.clone().sub(prev.p).multiplyScalar(FPS);
      if (v.length() > 5) { const ax = V().crossVectors(V(0, 1, 0), v).normalize(); if (ax.lengthSq() > 0) sc.ball.rotateOnWorldAxis(ax, (v.length() / FPS) / BALL_R); }
    }
    sc.ball.position.copy(p);
  }
  // the live impacts, aged in real time from the frame they land on
  const fx = sc.impacts.filter((im) => im.frame != null && i >= im.frame && (i - im.frame) / FPS < 0.9).map((im) => ({ im, age: (i - im.frame) / FPS }));
  if (sc.hoop) {
    const bl = p ? sc.hoop.local(p) : null;
    if (bl && bl.y < 0 && Math.hypot(bl.x, bl.z) < 23 && sc.hoop.through == null) sc.hoop.through = t;
    netShape(sc.hoop, bl, sc.hoop.through != null ? t - sc.hoop.through : null);
    const dunk = fx.find((e) => e.im.kind === "dunk");   // the rim bends down under the dunk and shudders back
    sc.hoop.rimG.rotation.x = dunk ? 0.11 * dunk.im.power * Math.exp(-dunk.age / 0.2) * Math.cos(dunk.age * 38) : 0;
  }
  const cam = sc.cameraAt(t); aim(cam.pos, cam.target, cam.fov);
  const f = passes();
  f.pools = sc.cast.filter((fig) => !fig.quiet).map((fig) => {   // spotlights under the feet, shrinking as he leaves the floor
    const hp = wpos(fig, "Hips"), foot = Math.min(wpos(fig, "LeftToeBase").y, wpos(fig, "RightToeBase").y), air = clamp(foot / 120, 0, 1);
    const c = screen(V(hp.x, 0, hp.z)), e = screen(V(hp.x + 60, 0, hp.z)), rx = Math.max(30 * S, Math.abs(e.x - c.x) * 1.3) * (1 - 0.4 * air);
    return { x: c.x, y: c.y, rx, ry: rx * 0.22, a: 1 - 0.6 * air };
  });
  f.quiet = {}; sc.cast.forEach((fig) => { if (fig.quiet) f.quiet[fig.layer] = true; });
  f.fx = fx.map((e) => { const s0 = screen(e.im.at); return { x: s0.x, y: s0.y, age: e.age, power: e.im.power, kind: e.im.kind, bits: fxBits(e.im), spin: e.im.spin }; });
  f.shake = fx.reduce((m, e) => { const a = 11 * S * e.im.power * Math.exp(-e.age / 0.1), R = rng(7 + i * 13); return { dx: m.dx + (R() - 0.5) * 2 * a, dy: m.dy + (R() - 0.5) * 2 * a }; }, { dx: 0, dy: 0 });
  // the trail: the ball's last tenth of a second, sampled finely in scene time (fast moves only)
  f.trail = null; f.ballPx = 1;
  if (p) {
    const s0 = screen(p), s1 = screen(p.clone().add(camera.up.clone().multiplyScalar(BALL_R))); f.ballPx = Math.max(1, Math.abs(s1.y - s0.y)) / BALL_R;
    const pts = []; for (let k = 12; k >= 0; k--) { const q = sc.ballAt(Math.max(0, t - k * 0.009)); if (q && q.p) pts.push(screen(q.p)); }
    const len = pts.reduce((m, q, k) => (k ? m + Math.hypot(q.x - pts[k - 1].x, q.y - pts[k - 1].y) : 0), 0);
    const inWin = !sc.trailWin || sc.trailWin.some(([a, b]) => t >= a && t <= b);   // only the real speed: not a ball simply carried
    if (inWin && (sc.trail || len > 60 * S) && len > 6 * S) f.trail = pts;
  }
  f.bp = p ? screen(p) : null;
  return { f, bp };
}
async function run(id, inks, styles, px, raw) {
  INK = inks; setSize(px || 720);
  const sc = await build(id, raw), times = frameTimes(sc), n = times.length, st = {}; styles.forEach((s) => (st[s] = {})); sc.n = n;
  sc.impacts.forEach((im) => (im.frame = times.findIndex((t) => t >= im.t - 1e-6)));
  const out = canvas(), g = out.getContext("2d"), shook = canvas(), sg = shook.getContext("2d");
  let prev = null;
  for (let i = 0; i < n; i++) {
    const { f, bp } = frame(sc, times[i], i, prev); prev = bp ? { p: sc.ball.position.clone() } : null;
    for (const s of styles) {
      g.save(); STYLES[s](f, i, g, st[s], sc); g.restore();
      let src = out;
      if (Math.abs(f.shake.dx) + Math.abs(f.shake.dy) > 0.5) { sg.fillStyle = "#000"; sg.fillRect(0, 0, W, H); sg.drawImage(out, f.shake.dx, f.shake.dy); src = shook; }
      await window.__saveFrame(id, s, i, src.toDataURL("image/png"));
    }
  }
  return { frames: n, len: n / FPS, key: sc.key, loop: !!sc.loop };
}
// A debug print of chosen moments: every layer in a flat color, for checking the uniform, the hoop and the ball.
async function look(id, times, px, raw) {
  INK = { accent: "#FF48B0", accentHi: "#FF88CC", offset: "#41C6EA", hot: "#FFD54A", light: "#FFFFFF" }; setSize(px || 540);
  const sc = await build(id, raw), cols = { skinA: "#FF48B0", kitA: "#41C6EA", pantsA: "#2a8fb0", trimA: "#FFFFFF", numA: "#1a1030", skinB: "#9b6bff", kitB: "#dddddd", pantsB: "#aaaaaa", trimB: "#FF48B0", numB: "#FF48B0", ball: "#FFD54A", seam: "#7a4a00", rim: "#ff8a00", net: "#bbbbbb", board: "#223", mark: "#8899aa" };
  const ts = frameTimes(sc); sc.impacts.forEach((im) => (im.frame = ts.findIndex((t) => t >= im.t - 1e-6)));
  const shots = []; let prev = null;
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i], want = times.some((x) => Math.abs(x - t) < 0.5 / FPS && !times.some((y) => y !== x && Math.abs(y - t) < Math.abs(x - t)));
    const { f, bp } = frame(sc, t, i, prev); prev = bp ? { p: sc.ball.position.clone() } : null;
    if (want && window.DEBUG_HEAD) { const hf = sc.cast[0], P3 = (v) => v.toArray().map((x) => x.toFixed(0)).join(","); console.error("t", t.toFixed(2), "ball", sc.ball.visible ? P3(sc.ball.position) : "-", "Lsh", P3(wpos(hf, "LeftArm")), "Lwr", P3(wpos(hf, "LeftHand")), "Lpad", P3(wpos(hf, "LeftHandMiddle2")), "Rsh", P3(wpos(hf, "RightArm")), "Rwr", P3(wpos(hf, "RightHand")), "Rpad", P3(wpos(hf, "RightHandMiddle2"))); }
    if (!want || shots.some((s0) => s0.t === times.find((x) => Math.abs(x - t) < 0.5 / FPS))) continue;
    const c = canvas(), g = c.getContext("2d"); g.fillStyle = "#111"; g.fillRect(0, 0, W, H);
    ["board", "mark", "net", "rim", "skinB", "kitB", "pantsB", "trimB", "numB", "skinA", "kitA", "pantsA", "trimA", "numA", "ball", "seam"].forEach((nm) => g.drawImage(tint(f.L[nm], cols[nm], 1), 0, 0));
    if (f.trail) ribbon(g, f.trail, 2 * BALL_R * f.ballPx * 0.8, "#41C6EA", 0.8);
    if (f.fx.length) fxShapes(g, f.fx, { star: "#FFD54A", lines: "#ffffff", ring1: "#FFD54A", ring2: "#FF48B0", sparks: { hot: "#FFD54A", offset: "#41C6EA", light: "#fff" } });
    g.fillStyle = "#fff"; g.font = `${14 * S}px monospace`; g.fillText(t.toFixed(2) + "s", 8, 18 * S);
    shots.push({ t: times.find((x) => Math.abs(x - t) < 0.5 / FPS), u: c.toDataURL("image/png") });
  }
  return { shots: shots.map((s0) => s0.u), len: sc.len, key: sc.key };
}
window.ARTBOT = { run, look, STYLES: Object.keys(STYLES), SCENES: Object.keys(SCENES) };
window.ARTBOT_READY = true;
