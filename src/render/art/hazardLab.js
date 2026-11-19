// Art lab entries for hazards (only the lab imports this file).
import { registerArt } from './registry.js';
import { paintRockModel, paintBatModel, paintRootModel } from './hazardModelsA.js';
import { paintSteamModel, paintSteamRing, paintVoidModel, paintVoidDots } from './hazardModelsB.js';

for (const S of [24, 48, 96]) {
  registerArt({ name: `rock ${S}px`, group: 'hazards', w: S, h: S, paint: (g, w) => paintRockModel(g, w) });
  for (const f of [0, 1, 2]) registerArt({ name: `bat wing ${f} ${S}px`, group: 'hazards', w: S, h: S, paint: (g, w) => paintBatModel(g, w, f) });
  registerArt({ name: `root ${S}px`, group: 'hazards', w: S, h: S, paint: (g, w) => paintRootModel(g, w) });
  registerArt({ name: `steam ${S}px`, group: 'hazards', w: S, h: S, paint: (g, w) => { paintSteamModel(g, w, 1); paintSteamRing(g, w); } });
  registerArt({ name: `void orb ${S}px`, group: 'hazards', w: S, h: S, paint: (g, w) => { paintVoidModel(g, w); paintVoidDots(g, w); } });
}
