// Old entry kept for compatibility: now paints the procedural far wall (see art/wallArt.js).
import { paintWallLayer } from './art/wallArt.js';

export const TILE_H = 208;

export function paintWallTile(g, w, pal, biomeId) {
  paintWallLayer(g, w, TILE_H, biomeId, 'far', 'high');
}
