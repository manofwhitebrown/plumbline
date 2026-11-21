// ABILITIES (tap skills). All numbers live here. Time is counted in steps (one step is about 0.8 s).
// strainPct is a fraction of the rope's maximum strain, so it still matters when the rope is strong.
export const ABILITIES = Object.freeze({
  brace: Object.freeze({
    id: 'brace', name: 'Brace', key: '1', desc: 'Eases the rope and slows the descent for a moment.',
    strainPct: -0.06,          // takes 6% of the max off the strain
    effectSteps: 4,            // about 3 s of slow descent
    slowMult: 0.6,             // metres per step while braced
    cooldownSteps: 38,         // about 30 s
    charges: 1,
    scaresWeevil: true,
  }),
  surge: Object.freeze({
    id: 'surge', name: 'Surge', key: '2', desc: 'Gold counts double for a moment, but the rope pulls harder.',
    strainPct: 0.08,           // adds 8% of the max strain
    effectSteps: 5,            // about 4 s
    goldMult: 2,
    cooldownSteps: 38,         // about 30 s
    charges: 1,
  }),
  flare: Object.freeze({
    id: 'flare', name: 'Flare', key: '3', desc: 'Lights the way and clears the next row of dangers.',
    lookAhead: 8,              // steps it searches for a row with dangers
    cooldownSteps: 45,         // about 36 s
    charges: 1,
  }),
});

export const ABILITY_IDS = Object.freeze(['brace', 'surge', 'flare']);
export const START_ABILITIES = Object.freeze(['brace', 'surge']); // flare comes from a boon or an upgrade
export const MAX_COOLDOWN_CUT = 0.6;
