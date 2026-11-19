// Seeded 2D noise: value noise, fbm, ridged, and cellular (Worley). All pure, no allocation per call.
import { hash2 } from './prng.js';

const smooth = (t) => t * t * (3 - 2 * t);

// Smooth value noise, 0..1. Set period (in lattice cells) to make it tile.
export function valueNoise(x, y, seed = 1, period = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = smooth(x - xi), fy = smooth(y - yi);
  let x0 = xi, y0 = yi, x1 = xi + 1, y1 = yi + 1;
  if (period > 0) { x0 = wrap(x0, period); x1 = wrap(x1, period); y0 = wrap(y0, period); y1 = wrap(y1, period); }
  const a = hash2(x0, y0, seed), b = hash2(x1, y0, seed);
  const c = hash2(x0, y1, seed), d = hash2(x1, y1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
function wrap(v, p) { return ((v % p) + p) % p; }

// Fractal noise: stacked octaves. Tiles when period > 0 (period doubles per octave).
export function fbm(x, y, seed = 1, octaves = 4, period = 0) {
  let sum = 0, amp = 0.5, norm = 0, f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(x * f, y * f, seed + o * 101, period ? period * f : 0);
    norm += amp; amp *= 0.5; f *= 2;
  }
  return sum / norm;
}

// Ridged noise: sharp bright lines where the base noise crosses 0.5. Good for veins.
export function ridged(x, y, seed = 1, octaves = 3, period = 0) {
  let sum = 0, amp = 0.5, norm = 0, f = 1;
  for (let o = 0; o < octaves; o++) {
    const n = valueNoise(x * f, y * f, seed + o * 53, period ? period * f : 0);
    const r = 1 - Math.abs(n * 2 - 1);
    sum += amp * r * r; norm += amp; amp *= 0.5; f *= 2;
  }
  return sum / norm;
}

// Cellular noise. Returns F1 and F2-F1 in `out` (distance to nearest point, and edge-ness).
// Small values of edge (F2-F1) mean "on a crack between cells". Tiles when period > 0.
export function worley(x, y, seed = 1, period = 0, out = { f1: 0, edge: 0, id: 0 }) {
  const xi = Math.floor(x), yi = Math.floor(y);
  let f1 = 9, f2 = 9, id = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      let cx = xi + i, cy = yi + j;
      const wx = period > 0 ? wrap(cx, period) : cx;
      const wy = period > 0 ? wrap(cy, period) : cy;
      const px = cx + hash2(wx, wy, seed), py = cy + hash2(wx, wy, seed + 7919);
      const dx = px - x, dy = py - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < f1) { f2 = f1; f1 = d; id = hash2(wx, wy, seed + 31); } else if (d < f2) f2 = d;
    }
  }
  out.f1 = f1; out.edge = f2 - f1; out.id = id;
  return out;
}
