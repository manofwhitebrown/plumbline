// Art lab entries: rope tile, lantern, and all 26 part icons in 4 states (only the lab imports this file).
import { registerArt } from './registry.js';
import { paintLantern } from './bucketArt.js';
import { ROPE_P, buildRopeTile } from './ropeArt.js';
import { draw, PART_KEYS } from '../partIcon.js';

registerArt({ name: 'lantern', group: 'bucket', w: 20, h: 30, paint: (g) => paintLantern(g) });
registerArt({ name: 'rope twist tile', group: 'bucket', w: 11, h: ROPE_P * 3, paint: (g) => { const t = buildRopeTile(); if (t) g.drawImage(t, 0, 0, 11, ROPE_P * 3); } });
for (const k of PART_KEYS) {
  for (const st of ['idle', 'firing', 'locked']) registerArt({ name: `icon ${k} ${st}`, group: 'part icons', w: 96, h: 96, paint: (g) => draw(g, k, 0, 0, 96, st) });
  registerArt({ name: `icon ${k} 24px`, group: 'part icons', w: 24, h: 24, paint: (g) => draw(g, k, 0, 0, 24, 'idle') });
}
