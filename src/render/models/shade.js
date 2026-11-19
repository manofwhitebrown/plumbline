// Lighting. All colours are linear (squared sRGB); the final step takes a square root.
// Lights live in VIEW space, so as a model turns its facets sweep through the key light and flash.
export const KEY = norm3(-0.55, 0.65, 0.52);          // direction TO the key light (top-left, in front)
const RIM = norm3(0.75, 0.35, -0.55);                 // rim light comes from behind-right
const FILLD = norm3(0.6, -0.4, 0.5);                  // weak cool fill from low right
const HALF = norm3(KEY[0], KEY[1], KEY[2] + 1);       // half vector for the specular highlight
const KEY_COL = [1.0, 0.93, 0.8], RIM_COL = [0.5, 0.68, 1.0], FILL_COL = [0.2, 0.28, 0.5];
const SKY_AMB = [0.2, 0.22, 0.3], GROUND_AMB = [0.1, 0.075, 0.06];

function norm3(x, y, z) { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; }

// ---- tiny procedural sky (a bright well mouth above, dark warm stone below) ----
const LUT = new Float32Array(129 * 3);
(function buildLut() {
  const stops = [ // elevation -1..1 -> colour
    [-1.0, 0.05, 0.035, 0.03], [-0.5, 0.2, 0.12, 0.06], [-0.1, 0.1, 0.09, 0.11],
    [0.2, 0.3, 0.34, 0.5], [0.6, 0.65, 0.75, 0.95], [1.0, 1.0, 1.05, 1.15]];
  for (let i = 0; i <= 128; i++) {
    const e = i / 64 - 1; let k = 0; while (k < stops.length - 2 && e > stops[k + 1][0]) k++;
    const a = stops[k], b = stops[k + 1], f = (e - a[0]) / (b[0] - a[0]);
    for (let c = 0; c < 3; c++) LUT[i * 3 + c] = a[c + 1] + (b[c + 1] - a[c + 1]) * f;
  }
})();

// Sample the sky in direction (dx, dy, dz). Writes linear rgb into out. (No Math.pow: this runs for millions of pixels.)
export function envSample(dx, dy, dz, out) {
  const i = Math.max(0, Math.min(127, Math.floor((dy * 0.5 + 0.5) * 128))) * 3;
  let r = LUT[i], g = LUT[i + 1], b = LUT[i + 2];
  const sb = dx * KEY[0] + dy * KEY[1] + dz * KEY[2];
  if (sb > 0.2) {
    const s2 = sb * sb, s4 = s2 * s2, s8 = s4 * s4, s = s8 * s4 * s2 * 1.7 + s2 * sb * 0.12; // sb^14 and sb^3
    r += s * KEY_COL[0]; g += s * KEY_COL[1]; b += s * KEY_COL[2];
  }
  const strip = 1 - Math.abs(dy - 0.28) * 9; // a thin bright window band: makes crisp reflections on flat facets
  if (strip > 0 && dz > -0.3) { const s = strip * 0.75 * (0.6 + 0.4 * dx); r += s; g += s * 0.97; b += s * 0.92; }
  const rm = dx * RIM[0] + dy * RIM[1] + dz * RIM[2];
  if (rm > 0.3) { const q = rm * rm, q4 = q * q, s = q4 * q4 * 0.8; r += s * RIM_COL[0]; g += s * RIM_COL[1]; b += s * RIM_COL[2]; } // rm^8
  out[0] = r; out[1] = g; out[2] = b;
}

// x^shin from a small table with linear steps (Math.pow is slow in the inner loop).
const POW = new Map();
export function specPow(x, shin) {
  let t = POW.get(shin);
  if (!t) { t = new Float32Array(1026); for (let i = 0; i < 1026; i++) t[i] = Math.pow(Math.min(1, i / 1024), shin); POW.set(shin, t); }
  if (x <= 0) return 0; if (x >= 1) return 1;
  const f = x * 1024, i = f | 0; return t[i] + (t[i + 1] - t[i]) * (f - i);
}

// ---- value noise (stone grain, wood) ----
function hash3(x, y, z) { let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
export function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = x - xi, fy = y - yi, fz = z - zi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u), l(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u), v),
    l(l(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u), l(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u), v), w);
}

const env = [0, 0, 0];
// Light a normal (view space) on a normal solid surface. (px,py,pz) = object-space position for textures.
export function shadeSurface(m, nx, ny, nz, px, py, pz, out) {
  let r = m.r, g = m.g, b = m.b;
  if (m.grain > 0) {
    const n = noise3(px * m.gs, py * m.gs, pz * m.gs) * 1.5 - 0.75;
    const k = 1 + n * m.grain; r *= k; g *= k; b *= k;
    nx += n * m.bump; ny += n * m.bump * 0.7; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
  }
  const ndl = Math.max(0, nx * KEY[0] + ny * KEY[1] + nz * KEY[2]);
  const ndv = nz > 0 ? nz : 0, ndf = Math.max(0, nx * FILLD[0] + ny * FILLD[1] + nz * FILLD[2]);
  const hemi = ny * 0.5 + 0.5, diff = 1 - m.metal;
  const ar = GROUND_AMB[0] + (SKY_AMB[0] - GROUND_AMB[0]) * hemi, ag = GROUND_AMB[1] + (SKY_AMB[1] - GROUND_AMB[1]) * hemi, ab = GROUND_AMB[2] + (SKY_AMB[2] - GROUND_AMB[2]) * hemi;
  let lr = (ar + KEY_COL[0] * ndl * 1.25 + FILL_COL[0] * ndf) * diff, lg = (ag + KEY_COL[1] * ndl * 1.25 + FILL_COL[1] * ndf) * diff, lb = (ab + KEY_COL[2] * ndl * 1.25 + FILL_COL[2] * ndf) * diff;
  lr *= r; lg *= g; lb *= b;
  const ndh = nx * HALF[0] + ny * HALF[1] + nz * HALF[2];
  const sp = ndh > 0 && ndl > 0 ? specPow(ndh, m.shin) * m.spec : 0;
  const rx = 2 * nz * nx, ry = 2 * nz * ny, rz = 2 * nz * nz - 1;
  const inv = 1 - ndv, f5 = inv * inv * inv * inv * inv, fres = m.f0 + (1 - m.f0) * f5;
  const ek = m.env * fres;
  if (ek > 0.004) envSample(rx, ry, rz, env); else { env[0] = env[1] = env[2] = 0; }
  const tr = 1 + (r - 1) * m.metal, tg = 1 + (g - 1) * m.metal, tb = 1 + (b - 1) * m.metal;
  const rim = inv * inv * inv * m.rim * (m.rimAll ? 1 : 0.35 + 0.65 * Math.max(0, nx * RIM[0] + ny * RIM[1] + nz * RIM[2]));
  const rc = m.rimTint || RIM_COL;
  out[0] = lr + sp * tr + env[0] * ek * tr + rim * rc[0] + m.er * r;
  out[1] = lg + sp * tg + env[1] * ek * tg + rim * rc[1] + m.er * g;
  out[2] = lb + sp * tb + env[2] * ek * tb + rim * rc[2] + m.er * b;
}

// The inside of a glass gem (its far faces seen through the front): rich body colour with internal reflections.
export function shadeInterior(m, nx, ny, nz, out) {
  nx = -nx; ny = -ny; nz = -nz; // flip so it faces the viewer
  const ndl = Math.max(0, nx * KEY[0] + ny * KEY[1] + nz * KEY[2]), ndv = Math.max(0, nz);
  envSample(2 * ndv * nx, 2 * ndv * ny, 2 * ndv * nz - 1, env);
  const k = 0.16 + 1.0 * ndl, e = m.interior;
  out[0] = m.r * k + env[0] * m.r * e + m.er * m.r;
  out[1] = m.g * k + env[1] * m.g * e + m.er * m.g;
  out[2] = m.b * k + env[2] * m.b * e + m.er * m.b;
}

const rb = [0, 0, 0];
export function rainbow(h, out) { // hue 0..1 -> rgb (linear-ish)
  h = (h - Math.floor(h)) * 6; const f = h - Math.floor(h), i = Math.floor(h);
  const q = 1 - f; let r, g, b;
  switch (i % 6) { case 0: r = 1; g = f; b = 0; break; case 1: r = q; g = 1; b = 0; break; case 2: r = 0; g = 1; b = f; break; case 3: r = 0; g = q; b = 1; break; case 4: r = f; g = 0; b = 1; break; default: r = 1; g = 0; b = q; }
  out[0] = r * r; out[1] = g * g; out[2] = b * b; return out;
}

// Per-facet numbers for the near side of a glass gem: out = under(offset) * mul + add, for each colour channel.
// A flat facet has the same numbers for every pixel, so they are worked out once per facet.
export const GF = { mul: new Float32Array(3), add: new Float32Array(3), ox: new Float32Array(3), oy: new Float32Array(3), split: false };
export function glassConsts(m, nx, ny, nz, px, py, pz, pix, F = GF) {
  const ndl = Math.max(0, nx * KEY[0] + ny * KEY[1] + nz * KEY[2]), ndv = nz > 0 ? nz : 0;
  const ndh = nx * HALF[0] + ny * HALF[1] + nz * HALF[2];
  envSample(2 * ndv * nx, 2 * ndv * ny, 2 * ndv * nz - 1, env);
  const inv = 1 - ndv, f5 = inv * inv * inv * inv * inv, fres = m.f0 + (1 - m.f0) * f5;
  const off = m.refr * pix, dsp = m.disp; // how far the view bends through the stone, and how much colours split
  F.split = dsp > 0;
  for (let c = 0; c < 3; c++) { const k = off * (1 + dsp * (c - 1)); F.ox[c] = nx * k; F.oy[c] = -ny * k; }
  let tr = m.tr, tg = m.tg, tb = m.tb, er = 1, eg = 1, eb = 1;
  if (m.rainbow > 0) {
    rainbow(nx * 0.9 + ny * 0.55 + px * 0.3 + pz * 0.2, rb);
    const k = m.rainbow; tr *= 1 + (rb[0] * 1.5 - 1) * k; tg *= 1 + (rb[1] * 1.5 - 1) * k; tb *= 1 + (rb[2] * 1.5 - 1) * k;
    er = 1 + (rb[0] * 2 - 1) * k; eg = 1 + (rb[1] * 2 - 1) * k; eb = 1 + (rb[2] * 2 - 1) * k;
  }
  const lum = (env[0] + env[1] + env[2]) * 0.3333, cont = 1 - m.contrast * 0.55 + m.contrast * 0.9 * Math.min(1.3, lum);
  const tint = m.reflTint, body = (0.06 + 0.5 * ndl) * m.body, ek = fres * m.env + m.envBase;
  er *= 1 + (Math.sqrt(m.r) - 1) * tint; eg *= 1 + (Math.sqrt(m.g) - 1) * tint; eb *= 1 + (Math.sqrt(m.b) - 1) * tint;
  const sp = ndh > 0 ? specPow(ndh, m.shin) * m.spec : 0, rim = inv * inv * inv * m.rim;
  F.mul[0] = tr * cont; F.mul[1] = tg * cont; F.mul[2] = tb * cont;
  F.add[0] = m.r * body + env[0] * ek * er + sp + rim * RIM_COL[0];
  F.add[1] = m.g * body + env[1] * ek * eg + sp + rim * RIM_COL[1];
  F.add[2] = m.b * body + env[2] * ek * eb + sp + rim * RIM_COL[2];
  return F;
}
