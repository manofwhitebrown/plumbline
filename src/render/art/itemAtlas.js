// Packs every gem, ore and relic sprite into an atlas: 6 size steps per sprite, plus animation frames
// (void swirl, prism rainbow) and glint frames. Built once per layout size. Low quality: 3 sizes, no animation, no glint.
import { createAtlas, spriteKey } from './atlas.js';
import { paintGemModel, paintGlint, gemFrames } from './gemModels.js';
import { paintOreModel, paintRelicModel } from './oreRelic.js';
import { paintRockModel, paintBatModel, paintRootModel } from './hazardModelsA.js';
import { paintSteamModel, paintSteamRing, paintVoidModel, paintVoidDots, paintWarnModel } from './hazardModelsB.js';

export const SIZE_SCALES = [0.5, 0.65, 0.8, 1, 1.25, 1.5]; // 6 sizes: lanes use 1, flying to the bucket shrinks
export const BASE_IDX = 3;
export const GLINT_FRAMES = 5;
const LOW_IDX = [1, 3, 5];

// Chooses which size step to draw for a wanted scale (smallest step that is not smaller than asked).
export function pickSizeIdx(sizes, scale) {
  for (let i = 0; i < sizes.length; i++) if (SIZE_SCALES[sizes[i]] >= scale - 0.001) return sizes[i];
  return sizes[sizes.length - 1];
}

export function buildItemAtlas(S, dpr, low = false) {
  const atlas = createAtlas({ sheetSize: low ? 512 : 1024, overflowSize: 512, dpr: Math.min(2, Math.max(1, dpr || 1)), pad: 2 });
  const sizes = low ? LOW_IDX.slice() : SIZE_SCALES.map((_, i) => i);
  for (const idx of sizes) {
    const Ss = Math.max(12, Math.round(S * SIZE_SCALES[idx]));
    for (let tier = 1; tier <= 6; tier++) {
      const frames = !low && idx === BASE_IDX ? gemFrames(tier) : 1; // animation frames only at the main size
      for (let f = 0; f < frames; f++) atlas.add(spriteKey('gem', tier, 'any', idx, f), Ss, Ss, (g) => paintGemModel(g, Ss, tier, f));
    }
    atlas.add(spriteKey('ore', 0, 'any', idx, 0), Ss, Ss, (g) => paintOreModel(g, Ss));
    atlas.add(spriteKey('relic', 0, 'any', idx, 0), Ss, Ss, (g) => paintRelicModel(g, Ss));
  }
  if (!low) {
    const Sb = Math.max(12, Math.round(S));
    for (let tier = 1; tier <= 6; tier++) for (let f = 0; f < GLINT_FRAMES; f++) {
      atlas.add(spriteKey('glint', tier, 'any', BASE_IDX, f), Sb, Sb, (g) => paintGlint(g, Sb, tier, (f + 0.5) / GLINT_FRAMES));
    }
  }
  // Hazards: main size only. Keys: spriteKey('hz', 0, name, BASE_IDX, frame).
  const Sh = Math.max(12, Math.round(S)), hk = (name, f = 0) => spriteKey('hz', 0, name, BASE_IDX, f);
  atlas.add(hk('rock'), Sh, Sh, (g) => paintRockModel(g, Sh));
  for (let f = 0; f < 3; f++) atlas.add(hk('bat', f), Sh, Sh, (g) => paintBatModel(g, Sh, f)); // 3 wing frames, also on low
  atlas.add(hk('root'), Sh, Sh, (g) => paintRootModel(g, Sh));
  for (let f = 0; f < (low ? 1 : 3); f++) atlas.add(hk('steam', f), Sh, Sh, (g) => paintSteamModel(g, Sh, low ? 1 : f));
  atlas.add(hk('steamRing'), Sh, Sh, (g) => paintSteamRing(g, Sh));
  atlas.add(hk('void'), Sh, Sh, (g) => paintVoidModel(g, Sh));
  atlas.add(hk('voidDots'), Sh, Sh, (g) => paintVoidDots(g, Sh));
  const Sw = Math.round(Sh * 1.5); atlas.add(hk('warn'), Sw, Sw, (g) => paintWarnModel(g, Sw));
  return { atlas, sizes, low, destroy: () => atlas.destroy() };
}
