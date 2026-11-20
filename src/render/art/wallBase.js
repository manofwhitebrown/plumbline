// Stone body of a well wall. A small height map (fbm / Worley / ridged) is lit from the top-left,
// darkened in cracks (ambient occlusion), tinted by glowing seams, then smoothed up to tile size.
// It tiles top to bottom. Cheap: the map is 1/4 size (1/8 on low quality).
import { fbm, ridged, worley } from './noise.js';
import { hexToRgb, mix, darken, lighten } from './color.js';
import { seedFrom } from './prng.js';
import { makeCanvas } from '../canvasUtil.js';
import { biomePalette } from '../palette.js';

const cell = { f1: 0, edge: 0, id: 0 };
const sstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

// Vertical period (lattice cells) per biome: bigger = finer stone.
export const PERIOD = { clay: 4, quartz: 3, amber: 3, magma: 4, void: 2, abyss: 3 };
// Glow colour of seams per biome (null = no glowing seams).
export const SEAM = { clay: null, quartz: [143, 180, 255], amber: [255, 180, 74], magma: [255, 106, 42], void: [154, 98, 255], abyss: [214, 72, 154] };

// Fills out.h (0..1 height), out.em (0..1 glow seam), out.ao (0..1 crack darkness) at noise coords u,v.
export function sampleStone(id, u, v, seed, P, out) {
  const P2 = P * 2, k = out.k || 1; // k widens thin lines when the map is coarse
  const sc = (m) => Math.round(P * m) / P; // frequency multiplier snapped so the period stays a whole number of cells
  if (id !== 'clay') { // warp the coordinates so cracks wander instead of making straight polygons
    const wu = (fbm(u * 2, v * 2, seed + 20, 2, 0, P2) - 0.5) * 0.5, wv = (fbm(u * 2 + 5, v * 2 + 5, seed + 21, 2, 0, P2) - 0.5) * 0.5;
    u += wu; v += wv;
  }
  switch (id) {
    case 'quartz': {
      out.h = fbm(u, v, seed, 4, 0, P) * 0.8 + 0.2 * ridged(u * 2, v * 2, seed + 4, 2, 0, P2);
      const band = Math.abs(fbm(u * sc(1.2), v * sc(1.2), seed + 9, 3, 0, Math.round(P * 1.2)) - 0.5); // thin bright vein where noise crosses 0.5
      out.em = 1 - sstep(0.004 * k, 0.03 * k, band);
      worley(u * sc(1.5), v * sc(1.5), seed + 2, 0, cell, Math.round(P * 1.5));
      out.ao = (1 - sstep(0.0, 0.06 * k, cell.edge)) * 0.45; break;
    }
    case 'amber': {
      worley(u * 2, v * 2, seed + 3, 0, cell, P2);
      out.h = fbm(u, v, seed, 4, 0, P) * 0.55 + (1 - Math.min(1, cell.f1)) * 0.45;
      out.em = sstep(0.55, 0.9, fbm(u * 2, v * 2, seed + 8, 3, 0, P2)) * 0.5;
      out.ao = (1 - sstep(0.0, 0.14, cell.edge)) * 0.7; break;
    }
    case 'magma': {
      worley(u * 2, v * 2, seed + 5, 0, cell, P2);
      const crack = 1 - sstep(0.012 * k, 0.07 * k, cell.edge);
      out.h = fbm(u, v, seed, 4, 0, P) * 0.8 - crack * 0.3 + 0.2;
      out.em = crack * (0.55 + 0.45 * fbm(u * 3, v * 3, seed + 6, 2, 0, P * 3));
      out.ao = crack * 0.5 + (1 - sstep(0.02, 0.2, cell.edge)) * 0.25; break;
    }
    case 'void': {
      worley(u * 2, v * 2, seed + 7, 0, cell, P2);
      const crack = 1 - sstep(0.004 * k, 0.03 * k, cell.edge);
      out.h = 0.35 + fbm(u, v, seed, 4, 0, P) * 0.3;
      out.em = Math.min(1, crack * 0.9 + sstep(0.55, 0.95, fbm(u, v, seed + 12, 3, 0, P)) * 0.18);
      out.ao = (1 - sstep(0.0, 0.06 * k, cell.edge)) * 0.4; break;
    }
    case 'abyss': {
      worley(u * 2, v * 2, seed + 11, 0, cell, P2);
      const crack = 1 - sstep(0.004 * k, 0.025 * k, cell.edge);
      out.h = fbm(u, v, seed, 4, 0, P) * 0.75 + 0.1;
      out.em = crack * 0.7;
      out.ao = (1 - sstep(0.0, 0.12, cell.edge)) * 0.5; break;
    }
    default: { // clay: packed earth with fine grain
      out.h = fbm(u, v, seed, 5, 0, P) * 0.85 + 0.15 * fbm(u * 6, v * 6, seed + 1, 2, 0, P * 6);
      out.em = 0;
      worley(u * sc(1.5), v * sc(1.5), seed + 3, 0, cell, Math.round(P * 1.5));
      out.ao = (1 - sstep(0.0, 0.07, cell.edge)) * 0.35;
    }
  }
}

// layer: 'far' (darker, softer, desaturated, falls off toward the sides) or 'near' (crisp, lit).
// Draws into g over the box 0,0,w,h. Returns false if no canvas could be made.
export function paintStoneBody(g, w, h, id, layer, quality, stepOverride = 0) {
  const near = layer === 'near', f = stepOverride > 0 ? stepOverride : quality === 'low' ? 8 : near ? (w * h <= 48000 ? 1 : 2) : 2;
  const lw = Math.max(2, Math.ceil(w / f)), lh = Math.max(2, Math.round(h / f));
  const small = makeCanvas(lw, lh), sg = small && small.getContext('2d');
  if (!sg || !sg.createImageData) return false;
  const pal = biomePalette(id), P = PERIOD[id] || 4, seed = seedFrom('stone:' + id);
  const lo = darken(hexToRgb(pal.wallDark), 0.25), hi = lighten(hexToRgb(pal.wall), 0.12);
  const seam = SEAM[id] || null, far = !near;
  const H = new Float32Array(lw * lh), EM = new Float32Array(lw * lh), AO = new Float32Array(lw * lh);
  const o = { h: 0, em: 0, ao: 0, k: f >= 4 ? 4 : f >= 2 ? 2 : 1 }, scale = P / lh; // noise units per low-res pixel
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    sampleStone(id, x * scale, y * scale, seed, P, o);
    const i = y * lw + x; H[i] = o.h; EM[i] = o.em; AO[i] = o.ao;
  }
  const img = sg.createImageData(lw, lh), d = img.data;
  const relief = (far ? 1.6 : 3.2) * (id === 'quartz' ? 1.3 : 1);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const i = y * lw + x;
    const xa = Math.max(0, x - 1), xb = Math.min(lw - 1, x + 1), ya = (y + lh - 1) % lh, yb = (y + 1) % lh;
    const slope = H[yb * lw + xb] - H[ya * lw + xa]; // rises toward bottom-right = faces the light
    let s = 0.5 + (H[i] - 0.5) * 0.7 + slope * relief;
    s = Math.max(0, Math.min(1, s));
    let c = mix(lo, hi, s);
    c = darken(c, AO[i] * 0.7);
    if (far) { // far wall: duller and darker, light falls off toward the sides
      const gray = (c[0] + c[1] + c[2]) / 3, side = (x / lw) * 2 - 1;
      c = mix(c, [gray, gray, gray], 0.35);
      c = darken(c, (id === 'clay' ? 0.12 : 0.22) + 0.3 * side * side);
    }
    if (seam && EM[i] > 0.01) {
      const e = EM[i] * (far ? (id === 'quartz' ? 0.16 : 0.32) : 0.9);
      c = [c[0] + seam[0] * e, c[1] + seam[1] * e * 0.9, c[2] + seam[2] * e * 0.8];
    }
    const p = i * 4;
    d[p] = c[0] > 255 ? 255 : c[0]; d[p + 1] = c[1] > 255 ? 255 : c[1]; d[p + 2] = c[2] > 255 ? 255 : c[2]; d[p + 3] = 255;
  }
  sg.putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in g) g.imageSmoothingQuality = 'high';
  g.drawImage(small, 0, 0, lw, lh, 0, 0, w, h);
  small.width = 1; small.height = 1; // free the scratch canvas now
  return true;
}
