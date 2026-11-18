// Small shared helpers for the polish layers. Pure, never throw.
import { smoothstep, clamp, clamp01, fin } from '../../feel/spring.js';
import { biomePalette, BIOME_IDS } from '../palette.js';

export { smoothstep, clamp, clamp01, fin };
export const POLISH_CAP = 120;        // hard cap for all polish particles together
export const BLEND_M = 15;            // metres before a biome edge where the colour starts to blend
export const BIOME_EDGES = [100, 250, 450, 700, 1000]; // end depth of clay, quartz, amber, magma, void

// From the biome id and the depth: which biome comes next and how far (0..1) the blend is.
export function blendInfo(biomeId, depth) {
  const i = BIOME_IDS.indexOf(biomeId);
  const d = fin(depth);
  if (i < 0 || i >= BIOME_EDGES.length) return { to: null, t: 0 };
  const edge = BIOME_EDGES[i];
  return { to: BIOME_IDS[i + 1], t: smoothstep(edge - BLEND_M, edge, d) };
}

// A tiny deterministic random stream (visual only).
export function makeRng(seed) {
  let s = (fin(seed, 1) >>> 0) || 1;
  const r = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.range = (a, b) => a + (b - a) * r();
  return r;
}

// An offscreen canvas, or null when the platform has none (tests, old browsers).
export function makeCanvas(factory, w, h) {
  try {
    const W = Math.max(1, Math.min(4096, Math.round(fin(w, 1)))), H = Math.max(1, Math.min(4096, Math.round(fin(h, 1))));
    if (typeof factory === 'function') { const c = factory(W, H); return c && c.getContext ? c : null; }
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(W, H);
    if (typeof document !== 'undefined' && document.createElement) { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }
  } catch (e) { /* no offscreen canvas */ }
  return null;
}

// '#rrggbb' -> 'rgba(r,g,b,a)'. Used only when building cached sprites, never per frame.
export function rgba(hex, a) {
  const h = typeof hex === 'string' && /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#ffffff';
  return 'rgba(' + parseInt(h.slice(1, 3), 16) + ',' + parseInt(h.slice(3, 5), 16) + ',' + parseInt(h.slice(5, 7), 16) + ',' + a + ')';
}
export { biomePalette, BIOME_IDS };
