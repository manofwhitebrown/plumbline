// All the numbers of the drop engine live here, so they are easy to tune.
// Change a number, run `npm test`, and the balance test shows what it did.
export const ENGINE = Object.freeze({
  baseBeatMs: 800,          // length of one beat in milliseconds (first drop: 50-70 s never hauling, 40-58 s hauling at 80%)
  baseSpeed: 1,             // metres per beat
  tierValues: Object.freeze([1, 3, 9, 27, 81, 243]), // gem tiers 1..6 (used when a part changes a tier)
  relicFactor: 3,           // relicBonus turns a gem into a relic worth 3x
  minSpeed: 0.05,           // the bucket never stops or goes up
  maxSpeed: 20,
  // Strain per beat = strainBase + strainPerMeter * depth (then times mods.strainMult)
  strainBase: 0.35,
  strainPerMeter: 0.0016,
  // Gold maths
  depthBonusDiv: 200,       // depthBonus(d) = 1 + d / 200
  comboStep: 0.1,           // each combo step adds +10%
  comboCap: 10,             // ... up to 10 steps (so x2 at most)
  // Milestones and limits
  milestoneEvery: 50,       // metres
  maxBeats: 3000,           // headless runs stop here (safety net)
  maxExtraItems: 12,        // split copies allowed per beat
  maxTriggerDepth: 3,       // how deep parts may trigger parts
  peekMax: 16,              // most rows peekNext may return
  slopeWindow: 8,           // beats used to estimate strain slope
  // Safe ranges for mods (anything outside is clamped)
  limits: Object.freeze({
    maxStrain: [10, 1e6], keepOnSnap: [0, 0.6], goldMult: [0, 1e12],
    strainMult: [0, 100], luck: [0, 1], startDepth: [0, 1e6],
    speedMult: [0.1, 10], cheatGoldMult: [0, 1e12],
  }),
  // Used only when the biome data has no hazard strain for a hazard
  fallbackHazardStrain: Object.freeze({ rock: 3, bat: 4, root: 6, steam: 5, void: 4 }),
});

export const DEFAULT_MODS = Object.freeze({
  maxStrain: 100, keepOnSnap: 0.3, goldMult: 1, strainMult: 1, luck: 0,
  startDepth: 0, cols: 4, rows: 3, unlockedParts: ['hook'], twist: null, cheat: null,
});
