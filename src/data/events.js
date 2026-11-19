// ENCOUNTERS: surprises in the well. All numbers live here. Time is counted in steps (about 0.8 s).
// An encounter is announced `warnSteps` ahead. It never starts in the first 25 m, never overlaps another,
// and a dangerous one never starts when the rope is nearly gone (mercy).
export const ENCOUNTER_RULES = Object.freeze({
  firstDepth: 25,          // never before this depth (metres)
  gapSteps: [31, 50],      // steps between two encounters (about 25 to 40 s)
  warnSteps: 3,            // the warning comes this many steps ahead
  mercyStrain: 0.85,       // no dangerous encounter above this share of max strain
  mercyCooldown: 6,        // ...and not for this many steps after the rope was that tight
  retrySteps: 4,           // when nothing fits right now, look again after this many steps
  clearOfGuardian: 30,     // keep this many metres away from a guardian
  clearOfBoon: 2,          // and this many steps from a boon pick
});

export const ENCOUNTERS = Object.freeze({
  gem_vein: Object.freeze({
    id: 'gem_vein', name: 'Gem Vein', warn: 'Gem Vein ahead!', weight: 26, minDepth: 25, danger: false,
    rows: 2, minLevel: 2,                // every column holds a gem of the best level of this Biome (at least this level)
    done: 'A rich vein!',
  }),
  cave_in: Object.freeze({
    id: 'cave_in', name: 'Cave-In', warn: 'Cave-In! Brace!', weight: 20, minDepth: 40, danger: true,
    rows: 3, hazardsPerRow: 2, hazardsPerRowDeep: 3, deepFrom: 500, strainFactor: 0.8, // dangers cost 80% of normal
    oreInGaps: true,                     // the free columns hold ore, so a cave-in pays when you hold on
    done: 'You held on.',
  }),
  merchant: Object.freeze({
    id: 'merchant', name: 'Merchant Lantern', warn: 'A Merchant Lantern glows ahead.', weight: 12, minDepth: 60, danger: false,
    costPct: 0.1,                        // 10% of the gold in the bucket
    reliefPct: 0.2,                      // the relief option takes this share of max strain off
    boonRarity: { common: 0, rare: 80, legendary: 20 },
    minGold: 10,
    done: 'A fair deal.',
  }),
  echo_chamber: Object.freeze({
    id: 'echo_chamber', name: 'Echo Chamber', warn: 'Echo Chamber! Gold counts double.', weight: 18, minDepth: 30, danger: false,
    steps: 8, goldMult: 2,
    done: 'The echo fades.',
  }),
  rope_weevil: Object.freeze({
    id: 'rope_weevil', name: 'Rope Weevil', warn: 'Rope Weevil! Brace scares it off.', weight: 14, minDepth: 80, danger: true,
    steps: 8, gnawPct: 0.012,            // eats this share of the max strain every step
    maxGnawPct: 0.1,                     // ...up to 10% in all
    floorPct: 0.03,                      // it never leaves less than this much room above the current strain
    done: 'The weevil is gone.',
  }),
  treasure_alcove: Object.freeze({
    id: 'treasure_alcove', name: 'Treasure Alcove', warn: 'Treasure Alcove! Grab the marked gems.', weight: 10, minDepth: 100, danger: false,
    rows: 4, marks: 3, need: 2, level: 3, // three marked gems rise; grab two for a free relic
    done: 'A free relic!',
  }),
});

export const ENCOUNTER_IDS = Object.freeze(Object.keys(ENCOUNTERS));
