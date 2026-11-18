// Rope strain maths.
import { ENGINE } from '../data/engine.js';
import { fin } from './safe.js';

// Strain added every beat just for being this deep.
export function strainPerBeat(depth) {
  return ENGINE.strainBase + ENGINE.strainPerMeter * Math.max(0, fin(depth, 0, 'depth'));
}

// The whole change in strain for one beat (can be negative if parts cool the rope).
export function beatStrainDelta(depth, mods, biomeFactor, hazardStrain, flat, adjust) {
  const base = strainPerBeat(depth) * mods.strainMult * biomeFactor;
  return fin(base + flat + hazardStrain + adjust, 0, 'strain delta');
}

// True when the rope has reached its limit.
export function isSnap(strain, maxStrain) {
  return strain >= maxStrain;
}
