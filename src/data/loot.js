// What rises past the bucket. Each table is a list of [item, weight] pairs,
// ready for rng.weighted(). The items are shared and frozen: copy them before changing.
import { byId, shiftTiersUp } from './biomes.js';

// Base value of a gem by tier. The biome gold factor is applied on top.
export const TIER_VALUE = Object.freeze([0, 1, 3, 9, 27, 81, 243]); // index = tier
const ORE_FACTOR = 0.5;    // ore pays half of a gem of the same tier
const RELIC_FACTOR = 3;    // relics pay three times a gem
const LUCK_SHIFT_MAX = 0.6; // full luck moves 60% of the odds up one tier
const RELIC_LUCK_BOOST = 2; // full luck triples the relic chance

const cache = new Map();

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function money(tier, factor, goldFactor) {
  return Math.round(TIER_VALUE[tier] * factor * goldFactor * 100) / 100;
}

function buildTable(def, luck) {
  const shifted = shiftTiersUp(def.tierWeights, luck * LUCK_SHIFT_MAX);
  const total = def.mix.empty + def.mix.gem + def.mix.ore + def.mix.hazard;
  const table = [];
  const add = (item, w) => { if (w > 0 && Number.isFinite(w)) table.push([Object.freeze(item), w]); };

  add({ kind: 'empty', tier: 1, value: 0 }, def.mix.empty);

  for (let i = 0; i < 6; i++) {
    const tier = i + 1;
    add({ kind: 'gem', tier, value: money(tier, 1, def.goldFactor) }, def.mix.gem * shifted[i] / 100);
  }
  // Ore is one tier lower than a gem, so it stays cheap.
  for (let i = 0; i < 6; i++) {
    const tier = Math.max(1, i);
    add({ kind: 'ore', tier, value: money(tier, ORE_FACTOR, def.goldFactor) }, def.mix.ore * shifted[i] / 100);
  }
  const hazardTotal = Object.values(def.hazardWeights).reduce((a, b) => a + b, 0) || 1;
  for (const name of Object.keys(def.hazardWeights)) {
    const item = { kind: 'hazard', tier: 1, hazard: name, value: 0 };
    if (name === 'bat') item.drifts = true; // bats may hop to a side lane next beat
    add(item, def.mix.hazard * def.hazardWeights[name] / hazardTotal);
  }
  const relicChance = def.relicChance * (1 + luck * (RELIC_LUCK_BOOST - 1));
  if (relicChance > 0) {
    const tier = Math.min(6, 2 + def.index); // amber 4, magma 5, void 6 ... capped at 6
    add({ kind: 'relic', tier, value: money(tier, RELIC_FACTOR, def.goldFactor) }, total * relicChance);
  }
  return table;
}

// loot.table('amber', 0.3) or loot.table(biomeDef, 0.3).
// Luck is 0..1. Tables are cached by luck in steps of 0.05, so this never allocates after warm-up.
export function table(biome, luck = 0) {
  const def = typeof biome === 'object' && biome && biome.tierWeights ? biome : byId(biome);
  const step = Math.round(clamp01(luck) * 20);
  const key = def.id + ':' + def.level + ':' + step;
  let t = cache.get(key);
  if (!t) {
    t = buildTable(def, step / 20);
    if (t.length === 0) t = [[Object.freeze({ kind: 'empty', tier: 1, value: 0 }), 1]];
    Object.freeze(t);
    if (cache.size > 2000) cache.clear();
    cache.set(key, t);
  }
  return t;
}

export function totalWeight(t) {
  let sum = 0;
  for (const pair of t) sum += pair[1];
  return sum;
}

export const loot = { table, totalWeight, TIER_VALUE };
export default loot;
