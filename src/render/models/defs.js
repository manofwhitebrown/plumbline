// The list of baked models: how to build each one and how it turns.
import { gemHexCrystal, gemStepCut, gemTeardrop, gemBrilliant, gemVoid, gemPrism } from './gems.js';
import { propOre, propChest, propHook, propBucket, propRock, propVoidOrb } from './props.js';

const TILT = (20 * Math.PI) / 180;
const GEM = { frames: 12, tilt: TILT, fill: 0.86, size: 'item' };
const PROP = { frames: 10, tilt: TILT, fill: 0.84, size: 'item' };

// period = how much of a turn one loop covers (symmetric shapes repeat sooner). swing = side-to-side instead of a full turn.
export const DEFS = {
  'gem:1': { ...GEM, frames: 10, build: gemHexCrystal, period: Math.PI / 3 },
  'gem:2': { ...GEM, build: gemStepCut, period: Math.PI },
  'gem:3': { ...GEM, frames: 8, build: gemTeardrop },
  'gem:4': { ...GEM, build: gemBrilliant, period: Math.PI / 4 },
  'gem:5': { ...GEM, frames: 16, build: gemVoid },
  'gem:6': { ...GEM, build: gemPrism, swing: 0.6 },
  ore: { ...PROP, build: propOre },
  chest: { ...PROP, frames: 8, build: propChest, swing: 0.45 },
  hook: { ...PROP, frames: 8, build: propHook, swing: 0.5 },
  'hazard:rock': { ...PROP, frames: 8, build: propRock },
  'hazard:void': { ...PROP, frames: 1, build: propVoidOrb }, // a sphere looks the same from every side
  // the bucket is two layers: wood (under the rig tiles) and brass trim (over them). Both share one camera.
  bucket: { frames: 1, tilt: 0.1, fill: 1, size: 'bucket', ss: 1, build: propBucket, period: 0, part: 'body' },
  'bucket:trim': { frames: 1, tilt: 0.1, fill: 1, size: 'bucket', ss: 1, build: propBucket, period: 0, part: 'trim' },
};
export const ALL_KEYS = Object.keys(DEFS);
