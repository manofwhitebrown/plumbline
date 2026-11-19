// Adds up the boons into one small object of numbers (`fx`). Pure. Called when a boon is picked.
import { boonById, AFFINITY, TAG_PARTS, SYNERGIES, CAPS } from '../../data/boons.js';

const SCALED = new Set(['gold', 'gem', 'ore', 'big', 'strain', 'hazard', 'luck', 'combo', 'cd', 'maxStrain', 'keep', 'relic', 'chainGold', 'famGold', 'coolPerGem']);
const NUMS = ['gold', 'gem', 'ore', 'big', 'strain', 'hazard', 'luck', 'speed', 'combo', 'comboGrace', 'wide', 'second', 'ward', 'hazGold', 'cd',
  'braceCharges', 'surgeCharges', 'flare', 'maxStrain', 'keep', 'relic', 'chainGold', 'coolPerGem'];

export function emptyFx() {
  const fx = { famGold: {}, synergies: [] };
  for (const k of NUMS) fx[k] = 0;
  return fx;
}

// How many parts in the rig match a tag. `rig` is the engine's clean rig.
export function countAffinity(rig, tag) {
  const list = TAG_PARTS[tag];
  if (!list || !rig || !Array.isArray(rig.cells)) return 0;
  let n = 0;
  for (const row of rig.cells) for (const id of row) if (id && list.indexOf(id) >= 0) n++;
  return n;
}

export function affinityMap(rig) {
  const out = {};
  for (const tag of Object.keys(TAG_PARTS)) out[tag] = countAffinity(rig, tag);
  return out;
}

// Strength multiplier for a boon in this rig.
export function strength(boon, aff) {
  let best = 0;
  for (const t of boon.tags) best = Math.max(best, aff && aff[t] ? aff[t] : 0);
  return 1 + AFFINITY.step * Math.min(AFFINITY.maxParts, best);
}

function add(fx, key, v, k) {
  if (key === 'famGold') {
    for (const f of Object.keys(v)) fx.famGold[f] = (fx.famGold[f] || 0) + v[f] * (v[f] > 0 ? k : 1);
    return;
  }
  const scaled = SCALED.has(key) && v > 0 ? v * k : v;
  fx[key] = (fx[key] || 0) + scaled;
}

// ids: boon ids picked so far. aff: affinityMap(rig). Returns a fresh fx.
export function computeFx(ids, aff) {
  const fx = emptyFx();
  const tagCount = {};
  for (const id of ids) {
    const b = boonById(id);
    if (!b) continue;
    const k = strength(b, aff);
    for (const key of Object.keys(b.fx)) add(fx, key, b.fx[key], k);
    for (const t of b.tags) tagCount[t] = (tagCount[t] || 0) + 1;
  }
  for (const t of Object.keys(tagCount)) {
    if (tagCount[t] >= 2 && SYNERGIES[t]) {
      fx.synergies.push(t);
      for (const key of Object.keys(SYNERGIES[t].fx)) add(fx, key, SYNERGIES[t].fx[key], 1);
    }
  }
  for (const key of NUMS) {
    const cap = CAPS[key];
    if (cap !== undefined) fx[key] = Math.min(cap, fx[key]);
  }
  fx.strain = Math.max(-0.5, fx.strain);
  fx.speed = Math.max(-0.5, Math.min(CAPS.speed, fx.speed));
  for (const f of Object.keys(fx.famGold)) fx.famGold[f] = Math.min(CAPS.famGold, fx.famGold[f]);
  return fx;
}
