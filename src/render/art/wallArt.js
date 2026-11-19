// Builds one well wall layer for a biome. Nothing here throws: on any failure you get a partial or empty sprite.
//   'far'  : full-width stone + faint detail, dark and soft (parallax 0.5)
//   'mid'  : full-width detail only, transparent (parallax 0.75)
//   'near' : narrow strip (left and right edge frames side by side), crisp and lit (parallax 1)
//   'glow' : full-width light only, drawn additive and pulsed
import { paintStoneBody } from './wallBase.js';
import { paintDetail, hasGlow } from './wallBiomes.js';
import { registerArt } from './registry.js';
import { BIOME_IDS } from '../palette.js';

export { hasGlow };
export const LAYER_SCALE = { far: 0.5, mid: 0.5, glow: 0.5, near: 1 }; // sprite resolution vs dpr

export function paintWallLayer(g, w, h, id, layer, quality = 'high') {
  try {
    if (layer === 'far' || layer === 'near') paintStoneBody(g, w, h, id, layer, quality);
    if (layer === 'glow') paintDetail(g, w, h, id, 'far', 'glow', quality);
    else if (layer === 'mid') paintDetail(g, w, h, id, 'mid', 'base', quality);
    else paintDetail(g, w, h, id, layer, 'base', quality);
    return true;
  } catch (e) { return false; }
}

// Art lab entries: each biome, far / mid over far / near strip / glow.
for (const id of BIOME_IDS) {
  const lab = (name, w, paint) => registerArt({ name: `wall ${id} ${name}`, group: 'well textures', w, h: 208, paint });
  lab('far', 180, (c, w, h, q) => paintWallLayer(c, w, h, id, 'far', q));
  lab('far+mid+glow', 180, (c, w, h, q) => { paintWallLayer(c, w, h, id, 'far', q); paintWallLayer(c, w, h, id, 'mid', q); c.globalCompositeOperation = 'lighter'; paintWallLayer(c, w, h, id, 'glow', q); c.globalCompositeOperation = 'source-over'; });
  lab('near strips', 50, (c, w, h, q) => paintWallLayer(c, w, h, id, 'near', q));
}
