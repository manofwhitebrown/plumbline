// Pre-drawn item pictures. Everything is now built by art/itemAtlas.js (gems, ore, relic and hazards).
import { buildItemAtlas } from './art/itemAtlas.js'; // [GFX-1]

// Build everything for one size. Returns { size, art } where art.atlas holds all the sprites.
export function buildItemSprites(S, dpr, low = false) { return { size: S, art: buildItemAtlas(S, dpr, low) }; }
export function disposeItemSprites(sp) { if (sp && sp.art) sp.art.destroy(); }
