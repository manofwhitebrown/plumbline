// GUARDIANS: four big fights at fixed depths. All numbers live here. Time is counted in steps (about 0.8 s).
// A guardian fills the shaft with a pattern of dangers. Marked gems (weak points) rise in columns your rig can reach.
// Grab a weak point to hurt it. Chains and wide collectors hurt it more. It never snaps the rope in one step.
export const GUARDIAN_RULES = Object.freeze({
  warnSteps: 3,            // announced this many steps ahead
  crawl: 0.25,             // metres per step during the fight (the shaft is blocked)
  noJumpFrom: 0.8,         // from below this share of max strain...
  noJumpCap: 0.97,         // ...one step can never take the rope past this share
  weakEvery: 2,            // a wave of weak points every this many steps
  chainBonus: 0.25,        // +25% hit for each chain link in the step
  chainCap: 3,
  reachBonus: 0.12,        // +12% hit for each extra column the collectors reach
  chip: 1.2,               // every other gem you grab chips this much
  windDownSteps: 2,        // quiet steps after the guardian falls
  afterBoon: true,         // a win offers a Rare or Legendary boon
});

const g = (o) => Object.freeze({ ...o, reward: Object.freeze(o.reward) });

export const GUARDIANS = Object.freeze([
  g({
    id: 'stone_warden', name: 'Stone Warden', depth: 250, steps: 14, hp: 100, weakDmg: 18, hazard: 'rock', hazardPct: 0.016, strainPerStep: 0.004,
    pattern: 'wall', gapWidth: 2, wallEvery: 3,
    reward: { shards: 4, coreDust: 1, relicBias: 0.1 },
    intro: 'A wall of stone fills the shaft.',
    tip: 'Hit the marked gems. Slip through the gaps.',
  }),
  g({
    id: 'amber_weaver', name: 'Amber Weaver', depth: 500, steps: 14, hp: 130, weakDmg: 18, hazard: 'root', hazardPct: 0.014, strainPerStep: 0.005,
    pattern: 'web',
    reward: { shards: 6, coreDust: 2, relicBias: 0.2 },
    intro: 'Threads of amber cross the shaft.',
    tip: 'The threads cross. Watch where they meet.',
  }),
  g({
    id: 'magma_maw', name: 'Magma Maw', depth: 750, steps: 14, hp: 160, weakDmg: 18, hazard: 'steam', hazardPct: 0.014, strainPerStep: 0.006,
    pattern: 'jaws',
    reward: { shards: 9, coreDust: 3, relicBias: 0.3 },
    intro: 'Hot jaws open and close.',
    tip: 'The jaws snap shut in turns.',
  }),
  g({
    id: 'void_eye', name: 'Void Eye', depth: 1000, steps: 14, hp: 200, weakDmg: 18, hazard: 'void', hazardPct: 0.013, strainPerStep: 0.007,
    pattern: 'orbit',
    reward: { shards: 14, coreDust: 5, relicBias: 0.45 },
    intro: 'A cold eye watches from the dark.',
    tip: 'Its orbs circle the shaft.',
  }),
]);

// After the last fixed guardian, the abyss repeats the Void Eye every this many metres.
export const ABYSS_GUARDIAN_EVERY = 500;
export function guardianById(id) { return GUARDIANS.find((x) => x.id === id) || null; }
// The guardian that guards depth d, or null. Depth 250 -> Stone Warden. Past 1000, every 500 m -> Void Eye (stronger).
export function guardianAt(depthMark) {
  const f = GUARDIANS.find((x) => x.depth === depthMark);
  if (f) return f;
  if (depthMark > 1000 && (depthMark - 1000) % ABYSS_GUARDIAN_EVERY === 0) {
    const level = (depthMark - 1000) / ABYSS_GUARDIAN_EVERY;
    const v = GUARDIANS[3];
    return Object.freeze({ ...v, depth: depthMark, hp: Math.round(v.hp * (1 + 0.12 * level)), name: v.name, abyss: level });
  }
  return null;
}
// All depth marks up to and including `upTo`, ascending.
export function guardianMarks(upTo) {
  const out = GUARDIANS.map((x) => x.depth).filter((d) => d <= upTo);
  for (let d = 1500; d <= upTo; d += ABYSS_GUARDIAN_EVERY) out.push(d);
  return out;
}
