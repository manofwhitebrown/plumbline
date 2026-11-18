import test from 'node:test';
import assert from 'node:assert/strict';
import biomes from '../src/data/biomes.js';
import { LIMITS, checkLimit } from './integration-layout-helpers.js';

test('biome names fit 12 characters', () => {
  checkLimit('biome name', biomes.list().map((b) => [b.id, b.name]), LIMITS.biomeName);
});
test('biome names stay short at every depth, even far below the last biome', () => {
  const depths = [0, 1, 99, 100, 249, 250, 449, 450, 699, 700, 999, 1000, 5000, 20000, 99999, 1e6, 1e9, 1e300, Infinity, NaN, -5];
  const pairs = [];
  for (const d of depths) {
    pairs.push([`byDepth(${d})`, biomes.byDepth(d).name]);
    pairs.push([`byDepth(${d}) id`, biomes.byDepth(d).id]);
  }
  for (const id of biomes.ids) for (const level of [0, 1, 50, 200, 1000]) pairs.push([`byId(${id}, ${level})`, biomes.byId(id, level).name]);
  checkLimit('biome name', pairs.filter(([w]) => !w.endsWith(' id')), LIMITS.biomeName);
});
