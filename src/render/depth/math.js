// Pure maths for the depth layer: biome lookup, camera clamps, the perspective slice table. No canvas here.
import { BIOME_ORDER, BIOME_EDGES, BLEND_M, GEOM, OV, TEX_W, TEX_H, SLICE_MAX } from './constants.js';

export const fin = (x, d = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const clamp01 = (x) => (x > 0 ? (x < 1 ? x : 1) : 0);
export function smoothstep(a, b, x) { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); }
export const wrap = (x, p) => ((x % p) + p) % p;
export function hash01(a, b = 0) { // cheap deterministic 0..1
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 374761393) + Math.imul((b | 0) + 0x7f4a7c15, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Which biome a world depth belongs to (0..5), and how far (0..1) it has blended toward the next one.
export function biomeIndexAt(z) {
  const d = fin(z);
  let i = 0;
  while (i < BIOME_EDGES.length && d >= BIOME_EDGES[i]) i++;
  return i;
}
export function blendAt(z) {
  const d = fin(z), i = biomeIndexAt(d);
  if (i >= BIOME_EDGES.length) return 0;
  return smoothstep(BIOME_EDGES[i] - BLEND_M, BIOME_EDGES[i], d);
}
export function biomeIndexOf(id) { const i = BIOME_ORDER.indexOf(id); return i < 0 ? 0 : i; }

// Next edge at or after depth z (Infinity if none).
export function nextEdge(z) { const i = biomeIndexAt(z); return i < BIOME_EDGES.length ? BIOME_EDGES[i] : Infinity; }

// Camera clamps. Hard limits from the brief: 6 px, 1.5 degrees (and a 3 percent zoom).
export function clampCam(c, caps) {
  c.dx = clamp(fin(c.dx), -caps.shakePx, caps.shakePx);
  c.dy = clamp(fin(c.dy), -caps.shakePx, caps.shakePx);
  c.roll = clamp(fin(c.roll), -caps.rollDeg, caps.rollDeg);
  c.zoom = clamp(fin(c.zoom, 1), 1, caps.zoomMax);
  return c;
}

// Geometry of the shaft for a screen of w x h.
export function shaftGeom(w, h) {
  const W = Math.max(1, fin(w, 360)), H = Math.max(1, fin(h, 640));
  const yv = Math.max(H * GEOM.vanishK, H + OV + 40), yRef = H * GEOM.refK;
  return { W, H, yv, yRef, A: (yv - yRef) * GEOM.dRef };
}

// Inner edge of the wall (distance from the screen edge) at row y.
export function wallWidth(y, g) {
  const w0 = g.W * GEOM.w0K, w1 = g.W * GEOM.wFarK;
  const t = clamp01(fin(y) / (g.H * 1.05));
  return w0 + (w1 - w0) * (1 - Math.pow(1 - t, GEOM.curve));
}

// Screen row of a feature that sits `dz` metres below the camera plane (dz > 0). Far = larger dz = lower on screen.
export function rowOf(dz, g) { return g.yv - g.A / Math.max(0.05, dz); }

export function makeSliceTable(cap = SLICE_MAX) {
  return {
    n: 0, sliceH: 6, level: 0,
    y: new Float32Array(cap),      // top row of the slice (CSS px, layer space starts at -OV)
    h: new Float32Array(cap),      // slice height
    wI: new Float32Array(cap),     // wall inner width
    zq: new Float32Array(cap),     // A / (yv - ymid): metres below the camera plane, minus nothing
    rq0: new Float32Array(cap),    // rpm * A / (yv - ytop): texture row offset of the slice top (before the depth term)
    srcH: new Float32Array(cap),   // texture rows the slice covers (always <= TEX_H)
    srcW: new Float32Array(cap),   // texture columns the slice shows (level 0 texels)
    mip: new Uint8Array(cap),
  };
}

// Fill the table in place. Slices run from y = -OV to y = H + OV in steps of sliceH.
export function buildSliceTable(t, w, h, sliceH) {
  const g = shaftGeom(w, h), step = Math.max(2, Math.round(fin(sliceH, 6)));
  let n = 0, y = -OV;
  const cap = t.y.length;
  while (y < g.H + OV && n < cap) {
    const hh = Math.min(step, g.H + OV - y), ym = y + hh / 2, yb = y + hh;
    const q0 = g.A / (g.yv - y), q1 = g.A / (g.yv - yb);
    const sh = GEOM.rpm * (q1 - q0);
    const wi = wallWidth(ym, g);
    const hs = (g.yv - ym) / (g.yv - g.yRef);                 // screen px per texel across, 1 on the reference row
    t.y[n] = y; t.h[n] = hh; t.wI[n] = wi; t.zq[n] = q0 + (q1 - q0) / 2; t.rq0[n] = GEOM.rpm * q0;
    t.srcH[n] = Math.min(TEX_H, sh);
    t.srcW[n] = clamp(wi / hs, 16, TEX_W);
    const rate = t.srcH[n] / hh;                                // texels per pixel down the wall
    t.mip[n] = rate < 1.5 ? 0 : rate < 3 ? 1 : 2;
    n++; y += hh;
  }
  t.n = n; t.sliceH = step;
  return t;
}

// Texture rows where slice i starts, for depth d (m). Rows are in 0..TEX_H; the source is read as [u0, u0 + srcH) from a texture stored twice.
export function sliceStart(t, i, depth, sideOffset = 0) {
  return wrap(GEOM.rpm * (fin(depth) - GEOM.dRef) + t.rq0[i] + sideOffset, TEX_H);
}

// World depth (m) of the middle of slice i when the camera is at depth d.
export function sliceDepth(t, i, depth) { return fin(depth) - GEOM.dRef + t.zq[i]; }
