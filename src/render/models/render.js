// Draws one mesh into a target. A frame is drawn in slices of rows so a bake can be spread over many game frames:
//   pass A  = solid triangles and the far side of glass  (rows y0..y1)
//   pass B  = near side of glass, which looks through to pass A  (rows y0..y1)
// Pass B must only start after pass A has finished the whole frame.
import { mat4RotX, mat4RotY, mat4Mul, mat4Dir, mat4Point } from './math.js';
import { rasterTri } from './raster.js';
import { shadeSurface, shadeInterior, glassConsts, GF } from './shade.js';

const scratch = new WeakMap();
const col = new Float32Array(3), c0 = new Float32Array(3), c1 = new Float32Array(3), c2 = new Float32Array(3), und = new Float32Array(3);
const M = new Float32Array(16), RX = new Float32Array(16), RY = new Float32Array(16);

// cam = { angle, tilt, sc (pixels per unit), cx, cy }. Fills screen positions and view-space normals.
export function prepare(mesh, cam) {
  let P = scratch.get(mesh);
  if (!P) {
    P = { sx: new Float32Array(mesh.vertCount), sy: new Float32Array(mesh.vertCount), sz: new Float32Array(mesh.vertCount),
      n: new Float32Array(mesh.triCount * 9), fn: new Float32Array(mesh.triCount * 3), tmp: new Float32Array(3) };
    scratch.set(mesh, P);
  }
  mat4Mul(mat4RotX(cam.tilt, RX), mat4RotY(cam.angle, RY), M);
  for (let i = 0; i < mesh.vertCount; i++) {
    mat4Point(M, mesh.p[i * 3], mesh.p[i * 3 + 1], mesh.p[i * 3 + 2], P.tmp);
    P.sx[i] = cam.cx + P.tmp[0] * cam.sc; P.sy[i] = cam.cy - P.tmp[1] * cam.sc; P.sz[i] = P.tmp[2];
  }
  for (let i = 0; i < mesh.triCount * 3; i++) mat4Dir(M, mesh.n[i * 3], mesh.n[i * 3 + 1], mesh.n[i * 3 + 2], P.n, i * 3);
  for (let i = 0; i < mesh.triCount; i++) mat4Dir(M, mesh.fn[i * 3], mesh.fn[i * 3 + 1], mesh.fn[i * 3 + 2], P.fn, i * 3);
  P.sc = cam.sc; P.cam = cam;
  return P;
}

// ---- per-pixel callbacks (module state keeps them allocation-free) ----
const S = { T: null, P: null, mesh: null, mat: null, t: 0, a: 0, b: 0, c: 0, flip: 1, interior: false, y: 0 };

function normalAt(l0, l1, l2, o) {
  const n = S.P.n, k = S.t * 9, f = S.flip;
  let x = (n[k] * l0 + n[k + 3] * l1 + n[k + 6] * l2) * f, y = (n[k + 1] * l0 + n[k + 4] * l1 + n[k + 7] * l2) * f, z = (n[k + 2] * l0 + n[k + 5] * l1 + n[k + 8] * l2) * f;
  const l = Math.hypot(x, y, z) || 1; o[0] = x / l; o[1] = y / l; o[2] = z / l;
}
const nn = [0, 0, 0];
function objPos(l0, l1, l2, o) {
  const p = S.mesh.p, a = S.a * 3, b = S.b * 3, c = S.c * 3;
  o[0] = p[a] * l0 + p[b] * l1 + p[c] * l2; o[1] = p[a + 1] * l0 + p[b + 1] * l1 + p[c + 1] * l2; o[2] = p[a + 2] * l0 + p[b + 2] * l1 + p[c + 2] * l2;
}
const pp = [0, 0, 0];

function put(i, r, g, b) { const c = S.T.c, k = i * 4; c[k] = r; c[k + 1] = g; c[k + 2] = b; c[k + 3] = 1; }

function cbPhong(i, l0, l1, l2) {
  normalAt(l0, l1, l2, nn); objPos(l0, l1, l2, pp);
  if (S.interior) shadeInterior(S.mat, nn[0], nn[1], nn[2], col); // it flips the far-side normal itself
  else shadeSurface(S.mat, nn[0], nn[1], nn[2], pp[0], pp[1], pp[2], col);
  put(i, col[0], col[1], col[2]);
}
function cbGouraud(i, l0, l1, l2) { put(i, c0[0] * l0 + c1[0] * l1 + c2[0] * l2, c0[1] * l0 + c1[1] * l1 + c2[1] * l2, c0[2] * l0 + c1[2] * l1 + c2[2] * l2); }
function cbFlat(i) { put(i, c0[0], c0[1], c0[2]); }

function shadeCorner(k, outArr) { // light one corner of the current triangle
  const n = S.P.n, f = S.flip, o = k * 3, base = S.t * 9 + o, v = [S.a, S.b, S.c][k] * 3, p = S.mesh.p;
  if (S.interior) shadeInterior(S.mat, n[base] * f, n[base + 1] * f, n[base + 2] * f, outArr);
  else shadeSurface(S.mat, n[base] * f, n[base + 1] * f, n[base + 2] * f, p[v], p[v + 1], p[v + 2], outArr);
}

// Draw rows y0..y1 of pass A.
export function drawPassA(mesh, P, T, y0, y1) {
  S.T = T; S.P = P; S.mesh = mesh;
  for (let t = 0; t < mesh.triCount; t++) {
    const mat = mesh.mats[mesh.m[t]], fz = P.fn[t * 3 + 2], glassTri = mat.kind === 'glass';
    if (glassTri && fz > 0) continue;               // near side of glass belongs to pass B
    if (!glassTri && fz <= 0 && !mat.twoSided) continue; // solid faces turned away are hidden
    S.t = t; S.mat = mat; S.a = mesh.t[t * 3]; S.b = mesh.t[t * 3 + 1]; S.c = mesh.t[t * 3 + 2];
    S.flip = fz > 0 ? 1 : (glassTri ? 1 : -1); S.interior = glassTri;
    let cb = cbPhong;
    if (mat.shading === 0 || mat.shading === 1) {
      if (mat.shading === 0) { // flat: one colour for the whole face, lit at its centre
        const nx = P.fn[t * 3] * S.flip, ny = P.fn[t * 3 + 1] * S.flip, nz = P.fn[t * 3 + 2] * S.flip;
        const p = mesh.p, a = S.a * 3, b = S.b * 3, c = S.c * 3;
        if (S.interior) shadeInterior(mat, nx, ny, nz, c0);
        else shadeSurface(mat, nx, ny, nz, (p[a] + p[b] + p[c]) / 3, (p[a + 1] + p[b + 1] + p[c + 1]) / 3, (p[a + 2] + p[b + 2] + p[c + 2]) / 3, c0);
        cb = cbFlat;
      } else { shadeCorner(0, c0); shadeCorner(1, c1); shadeCorner(2, c2); cb = cbGouraud; }
    }
    rasterTri(T, P.sx[S.a], P.sy[S.a], P.sz[S.a], P.sx[S.b], P.sy[S.b], P.sz[S.b], P.sx[S.c], P.sy[S.c], P.sz[S.c], y0, y1, false, cb);
  }
}

// pass B pixel: look through the glass at pass A, bent by the face normal
function under(T, x, y, dx, dy, c, o) {
  let sx = Math.round(x + dx), sy = Math.round(y + dy);
  if (sx < 0 || sy < 0 || sx >= T.w || sy >= T.h || T.c[(sy * T.w + sx) * 4 + 3] === 0) { sx = x; sy = y; }
  return T.c[(sy * T.w + sx) * 4 + c];
}
function glassPixel(i, x, y, F) {
  const T = S.T, o = T.o, k = i * 3;
  if (F.split) { for (let c = 0; c < 3; c++) o[k + c] = under(T, x, y, F.ox[c], F.oy[c], c) * F.mul[c] + F.add[c]; }
  else { const sx = Math.round(x + F.ox[1]), sy = Math.round(y + F.oy[1]); let xx = sx, yy = sy;
    if (sx < 0 || sy < 0 || sx >= T.w || sy >= T.h || T.c[(sy * T.w + sx) * 4 + 3] === 0) { xx = x; yy = y; }
    const q = (yy * T.w + xx) * 4; o[k] = T.c[q] * F.mul[0] + F.add[0]; o[k + 1] = T.c[q + 1] * F.mul[1] + F.add[1]; o[k + 2] = T.c[q + 2] * F.mul[2] + F.add[2]; }
  T.og[i] = 1;
}
function cbGlass(i, l0, l1, l2, z, x, y) { // smooth glass: numbers worked out per pixel
  normalAt(l0, l1, l2, nn); objPos(l0, l1, l2, pp);
  glassPixel(i, x, y, glassConsts(S.mat, nn[0], nn[1], nn[2], pp[0], pp[1], pp[2], S.P.sc));
}
function cbGlassRainbow(i, l0, l1, l2, z, x, y) { // flat facet whose colour still changes across it (prism)
  objPos(l0, l1, l2, pp);
  glassPixel(i, x, y, glassConsts(S.mat, nn[0], nn[1], nn[2], pp[0], pp[1], pp[2], S.P.sc));
}
function cbGlassFlat(i, l0, l1, l2, z, x, y) { glassPixel(i, x, y, GF); } // faceted gem: numbers worked out once per facet

export function drawPassB(mesh, P, T, y0, y1) {
  S.T = T; S.P = P; S.mesh = mesh;
  for (let t = 0; t < mesh.triCount; t++) {
    const mat = mesh.mats[mesh.m[t]];
    if (mat.kind !== 'glass' || P.fn[t * 3 + 2] <= 0) continue;
    S.t = t; S.mat = mat; S.a = mesh.t[t * 3]; S.b = mesh.t[t * 3 + 1]; S.c = mesh.t[t * 3 + 2]; S.flip = 1;
    let cb = cbGlass;
    if (mat.shading === 0) {
      nn[0] = P.fn[t * 3]; nn[1] = P.fn[t * 3 + 1]; nn[2] = P.fn[t * 3 + 2];
      if (mat.rainbow > 0) cb = cbGlassRainbow;
      else {
        const p = mesh.p, a = S.a * 3, b = S.b * 3, c = S.c * 3;
        glassConsts(mat, nn[0], nn[1], nn[2], (p[a] + p[b] + p[c]) / 3, (p[a + 1] + p[b + 1] + p[c + 1]) / 3, (p[a + 2] + p[b + 2] + p[c + 2]) / 3, P.sc, GF); cb = cbGlassFlat;
      }
    }
    rasterTri(T, P.sx[S.a], P.sy[S.a], P.sz[S.a], P.sx[S.b], P.sy[S.b], P.sz[S.b], P.sx[S.c], P.sy[S.c], P.sz[S.c], y0, y1, true, cb);
  }
}

// Shrink by `ss` (box filter on premultiplied alpha) into Uint8 rgba. Rows oy0..oy1 of the output.
export function resolve(T, ss, out, ow, oy0, oy1) {
  const inv = 1 / (ss * ss), W = T.w;
  for (let oy = oy0; oy < oy1; oy++) {
    for (let ox = 0; ox < ow; ox++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let dy = 0; dy < ss; dy++) for (let dx = 0; dx < ss; dx++) {
        const i = (oy * ss + dy) * W + ox * ss + dx, al = T.c[i * 4 + 3];
        if (al === 0) continue;
        if (T.og[i]) { r += T.o[i * 3]; g += T.o[i * 3 + 1]; b += T.o[i * 3 + 2]; } else { r += T.c[i * 4]; g += T.c[i * 4 + 1]; b += T.c[i * 4 + 2]; }
        a += 1;
      }
      const k = (oy * ow + ox) * 4;
      if (a === 0) { out[k] = out[k + 1] = out[k + 2] = out[k + 3] = 0; continue; }
      out[k] = enc(r / a); out[k + 1] = enc(g / a); out[k + 2] = enc(b / a); out[k + 3] = Math.round(a * inv * 255);
    }
  }
}
// Soft shoulder so hot highlights roll off instead of going flat white, then square root (gamma 2).
function enc(v) { if (v < 0) v = 0; else if (v > 0.75) v = 0.75 + 0.25 * (1 - Math.exp(-(v - 0.75) / 0.25)); return Math.round(Math.sqrt(v) * 255); }
