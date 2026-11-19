// Art lab entries for gems, ore and relic (only the lab imports this file, the game does not).
import { registerArt } from './registry.js';
import { paintGemModel, paintGlint, gemFrames } from './gemModels.js';
import { paintOreModel, paintRelicModel } from './oreRelic.js';

const NAMES = ['quartz hexagon', 'emerald step-cut', 'amber teardrop', 'ruby brilliant', 'void shard', 'prism'];
for (let tier = 1; tier <= 6; tier++) {
  for (const S of [24, 48, 96]) registerArt({ name: `gem ${tier} ${NAMES[tier - 1]} ${S}px`, group: 'gems', w: S, h: S, paint: (g, w) => paintGemModel(g, w, tier, 0) });
  if (gemFrames(tier) > 1) for (const f of [2, 4, 6]) registerArt({ name: `gem ${tier} frame ${f}`, group: 'gems', w: 96, h: 96, paint: (g, w) => paintGemModel(g, w, tier, f) });
  registerArt({ name: `gem ${tier} glint`, group: 'gems', w: 96, h: 96, paint: (g, w) => { paintGemModel(g, w, tier, 0); paintGlint(g, w, tier, 0.5); } });
}
for (const S of [24, 48, 96]) {
  registerArt({ name: `ore ${S}px`, group: 'ore and relic', w: S, h: S, paint: (g, w) => paintOreModel(g, w) });
  registerArt({ name: `relic ${S}px`, group: 'ore and relic', w: S, h: S, paint: (g, w) => paintRelicModel(g, w) });
}
