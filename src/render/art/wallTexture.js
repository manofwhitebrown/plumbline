// wallTexture(biomeId, layer): the wall picture the depth layer (DEPTH-1) asks for.
// Returns a 160 x 192 canvas: crisp stone with the biome's details, lit from the left, tiles top to bottom,
// mid-dark with no vignette (the depth layer adds fog, shade and lantern light itself).
// Built lazily once per biome and cached. Returns null when no canvas exists, so the caller falls back.
import { makeCanvas } from '../canvasUtil.js';
import { paintWallLayer } from './wallArt.js';
import { BIOME_IDS } from '../palette.js';

export const WALL_TEX_W = 160;
export const WALL_TEX_H = 192;
const cache = new Map();

export function wallTexture(biomeId, layer = 0) {
  const id = BIOME_IDS.includes(biomeId) ? biomeId : 'clay', key = id + '|' + (layer ? 1 : 0);
  if (cache.has(key)) return cache.get(key);
  let out = null;
  try {
    const c = makeCanvas(WALL_TEX_W, WALL_TEX_H), g = c && c.getContext && c.getContext('2d');
    if (g) {
      // layer 0 = near wall (crisp, lit); other layers = the softer far look
      const ok = paintWallLayer(g, WALL_TEX_W, WALL_TEX_H, id, layer ? 'far' : 'near', 'high', 2); // sampled every 2 px: about 4x cheaper than full detail
      out = ok ? c : null;
    }
  } catch (e) { out = null; }
  cache.set(key, out);
  return out;
}

// Frees every cached texture (the game calls this when the renderer is destroyed).
export function disposeWallTextures() {
  for (const c of cache.values()) { if (c) { c.width = 1; c.height = 1; } }
  cache.clear();
}
