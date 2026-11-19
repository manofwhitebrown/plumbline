// Props: ore chunk, relic chest, brass hook, rock hazard, void orb. (The bucket is in bucketModel.js.)
import { createMesh } from './mesh.js';
import { box, ball, tube, torus } from './shapes.js';
import { stone, metal, wood, material } from './materials.js';
import { noise3 } from './shade.js';
import { prng } from './prng.js';
export { propBucket } from './bucketModel.js';

// Unit icosphere with `sub` rounds of splitting. Returns { v: [[x,y,z]], f: [[a,b,c]] }.
function icosphere(sub) {
  const t = (1 + Math.sqrt(5)) / 2;
  let v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
  let f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const norm = (p) => { const l = Math.hypot(p[0], p[1], p[2]); return [p[0] / l, p[1] / l, p[2] / l]; };
  v = v.map(norm);
  for (let s = 0; s < sub; s++) {
    const cache = new Map(), nf = [];
    const mid = (a, b) => { const k = a < b ? a + '_' + b : b + '_' + a; if (!cache.has(k)) { cache.set(k, v.length); v.push(norm([(v[a][0] + v[b][0]) / 2, (v[a][1] + v[b][1]) / 2, (v[a][2] + v[b][2]) / 2])); } return cache.get(k); };
    for (const [a, b, c] of f) { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
    f = nf;
  }
  return { v, f };
}

// A lumpy blob: icosphere pushed in and out by noise. Faces can pick a material by their centre.
function lump(m, sub, rad, squash, lumpy, freq, off, pickMat) {
  const { v, f } = icosphere(sub);
  const ids = v.map((p) => {
    const r = rad * (1 - lumpy + lumpy * 2 * noise3(p[0] * freq + off, p[1] * freq + off * 0.7, p[2] * freq + off * 1.3));
    return m.vert(p[0] * r, p[1] * r * squash, p[2] * r);
  });
  m.inside(0, 0, 0);
  for (const [a, b, c] of f) { const cen = [(v[a][0] + v[b][0] + v[c][0]) / 3, (v[a][1] + v[b][1] + v[c][1]) / 3, (v[a][2] + v[b][2] + v[c][2]) / 3]; m.tri(ids[a], ids[b], ids[c], pickMat(cen, a)); }
  return { v, ids };
}

// Ore chunk: grey rock with a band of gold running through it and a few nuggets.
export function propOre(seed = 3) {
  const rnd = prng(seed), m = createMesh();
  const rockA = m.mat(stone('#7d8393')), rockB = m.mat(stone('#686e7e')), gold = m.mat(metal('#f6c453', { metal: 1, spec: 1.4 }));
  const vn = [rnd() - 0.5, rnd() - 0.5, rnd() * 0.6 + 0.2]; const vl = Math.hypot(vn[0], vn[1], vn[2]); vn[0] /= vl; vn[1] /= vl; vn[2] /= vl;
  lump(m, 2, 0.86, 0.86, 0.2, 1.7, seed * 3.1, (c, a) => (Math.abs(c[0] * vn[0] + c[1] * vn[1] + c[2] * vn[2]) < 0.1 ? gold : (a % 3 ? rockA : rockB)));
  for (let k = 0; k < 4; k++) { // nuggets poking out of the surface
    let x = rnd() * 2 - 1, y = (rnd() * 2 - 1) * 0.8, z = rnd() * 2 - 1; const l = Math.hypot(x, y, z) || 1; x /= l; y /= l; z /= l;
    const cx = x * 0.84, cy = y * 0.76, cz = z * 0.84, s = 0.12 + rnd() * 0.05;
    m.inside(cx - x * 0.2, cy - y * 0.2, cz - z * 0.2);
    const o = [[s, 0, 0], [-s, 0, 0], [0, s * 1.3, 0], [0, -s * 0.6, 0], [0, 0, s], [0, 0, -s]].map((d) => m.vert(cx + d[0], cy + d[1], cz + d[2]));
    for (const [a, b] of [[0, 4], [4, 1], [1, 5], [5, 0]]) { m.tri(o[a], o[b], o[2], gold); m.tri(o[b], o[a], o[3], gold); }
  }
  return m.finish(38);
}

// Rock hazard: dark jagged rock with a hot red-orange rim so it always reads as dangerous.
export function propRock(seed = 5) {
  const m = createMesh(), rimTint = [1.0, 0.16, 0.03];
  const a = m.mat(stone('#474b5a', { rimTint, rim: 1.35, rimAll: true })), b = m.mat(stone('#363a48', { rimTint, rim: 1.35, rimAll: true }));
  lump(m, 1, 0.9, 0.82, 0.38, 1.3, seed * 2.3, (c, i) => (i % 2 ? a : b));
  return m.finish(30);
}

// Void orb hazard: a black sphere with a bright violet rim.
export function propVoidOrb() {
  const m = createMesh(), o = m.mat(material('solid', '#0b0420', { spec: 0.9, shin: 40, env: 0.25, f0: 0.3, rim: 2.4, rimAll: true, rimTint: [0.72, 0.4, 1.0], shading: 2 }));
  ball(m, 0, 0, 0, 0.9, 0.9, 0.9, 9, 14, o);
  return m.finish(80);
}

// Relic chest: wooden body, arched lid, brass straps and a lock plate.
export function propChest() {
  const m = createMesh(), W = m.mat(wood('#a9692e')), D = m.mat(wood('#7c4821')), B = m.mat(metal('#e0aa3e', { spec: 1.2 })), K = m.mat(material('solid', '#1a1008', { spec: 0 }));
  const HX = 0.9, HZ = 0.58, ARCY = -0.06, ARCH = 0.44;
  box(m, 0, -0.4, 0, HX, 0.3, HZ, W);
  box(m, 0, -0.66, 0, HX + 0.02, 0.05, HZ + 0.02, D);
  const slab = (x0, x1, grow, mat) => { // an arched slab of the lid between x0 and x1
    const arc = []; for (let i = 0; i <= 7; i++) { const a = (i / 7) * Math.PI; arc.push([Math.cos(a) * (HZ + grow), ARCY + Math.sin(a) * (ARCH + grow)]); }
    const L = arc.map(([z, y]) => m.vert(x0, y, z)), R = arc.map(([z, y]) => m.vert(x1, y, z));
    m.inside(0, ARCY - 0.1, 0);
    for (let i = 0; i < 7; i++) m.quad(L[i], L[i + 1], R[i + 1], R[i], mat);
    m.poly(L, mat); m.poly(R, mat);
  };
  slab(-HX, HX, 0, W);
  for (const x of [-0.5, 0.5]) { slab(x - 0.07, x + 0.07, 0.035, B); box(m, x, -0.4, 0, 0.07, 0.31, HZ + 0.035, B); }
  box(m, 0, -0.14, HZ + 0.03, 0.13, 0.15, 0.04, B); box(m, 0, -0.16, HZ + 0.07, 0.035, 0.07, 0.015, K);
  return m.finish(40);
}

// Brass hook with a ring on top. Shifted left so the whole thing is centred.
export function propHook() {
  const m = createMesh(), B = m.mat(metal('#f0b84a', { spec: 1.4, shin: 60, env: 1.0 })), SX = -0.42;
  const path = [[0, 0.58], [0, 0.34], [0, 0.1]];
  for (let i = 1; i <= 8; i++) { const a = Math.PI + (i / 8) * (Math.PI + 0.7); path.push([0.44 + Math.cos(a) * 0.44, 0.1 + Math.sin(a) * 0.44]); }
  const p2 = path.map(([x, y]) => [x + SX, y - 0.15]);
  tube(m, p2, (t) => (t < 0.7 ? 0.125 : 0.125 - (t - 0.7) * 0.3), 6, B);
  torus(m, SX, 0.7, 0.27, 0.09, 12, 6, B);
  return m.finish(70);
}
