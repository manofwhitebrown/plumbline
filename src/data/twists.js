// Daily twists as simple overlays on Mods. No logic here.
// Each overlay entry is  field: { add | mul | min | max : number }.
// Extra Mods fields used (all optional, default shown):
//   hazardRate 1, gemRate 1, oreRate 1 (spawn weights), hazardGold 0, speedBonus 0 (m per step).
export const TWIST_ORDER = [
  'brittle_rope', 'gem_rain', 'hazard_fest', 'heavy_bucket',
  'lucky_day', 'ore_flood', 'thin_air', 'deep_calling',
];

export const TWIST_DATA = {
  brittle_rope: {
    name: 'Brittle Rope', desc: 'The rope is weaker (-30 max Strain) but Gold pays 40% more.',
    overlay: { maxStrain: { add: -30 }, goldMult: { mul: 1.4 } },
  },
  gem_rain: {
    name: 'Gem Rain', desc: 'Better gems fall today.',
    overlay: { luck: { add: 0.3 } },
  },
  hazard_fest: {
    name: 'Danger Fest', desc: 'Many more dangers, but every danger you stop pays Gold.',
    overlay: { hazardRate: { mul: 1.6 }, hazardGold: { add: 4 }, goldMult: { mul: 1.1 } },
  },
  heavy_bucket: {
    name: 'Heavy Bucket', desc: 'The bucket sinks faster, and the rope feels it.',
    overlay: { speedBonus: { add: 0.5 }, strainMult: { mul: 1.15 }, goldMult: { mul: 1.1 } },
  },
  lucky_day: {
    name: 'Lucky Day', desc: 'A little more luck, more relics and a bit more Gold.',
    overlay: { luck: { add: 0.15 }, relicBonus: { add: 0.1 }, goldMult: { mul: 1.15 } },
  },
  ore_flood: {
    name: 'Ore Flood', desc: 'Ore everywhere, and fewer gems.',
    overlay: { oreRate: { mul: 2.5 }, gemRate: { mul: 0.8 } },
  },
  thin_air: {
    name: 'Thin Air', desc: 'The rope strains less, but fewer gems show up.',
    overlay: { strainMult: { mul: 0.7 }, gemRate: { mul: 0.6 } },
  },
  deep_calling: {
    name: 'Deep Calling', desc: 'Start at 100 m, with 30% more Strain.',
    overlay: { startDepth: { min: 100 }, strainMult: { mul: 1.3 } },
  },
};
