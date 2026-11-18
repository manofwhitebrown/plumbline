import test from 'node:test';
import assert from 'node:assert/strict';
import { buildView, dangerLevel, idleView } from '../src/run/view.js';

const run = (s) => ({ state: { status: 'running', beat: 10, depth: 120, speed: 1, gold: 55, strain: 30, maxStrain: 100, combo: 3, biomeId: 'quartz', ...s } });
const riskInfo = () => ({ beatsToSnap: 40, goldAtRisk: 33, keepIfSnap: 22 });

test('view has every HUD field', () => {
  const v = buildView(run(), { riskInfo, bestDepth: 90, goals: [{ id: 'depth' }] });
  assert.equal(v.status, 'running');
  assert.equal(v.biome.name, 'Quartz');
  assert.equal(v.strain01, 0.3);
  assert.equal(v.dangerLevel, 0);
  assert.deepEqual(v.risk, { beatsToSnap: 40, goldAtRisk: 33, keepIfSnap: 22 });
  assert.equal(v.bestDepth, 90);
  assert.equal(v.nextBiomeIn, 130);
  assert.equal(v.goals.length, 1);
  assert.ok(v.biome.palette.top);
});

test('danger level thresholds', () => {
  assert.equal(dangerLevel(0.49), 0);
  assert.equal(dangerLevel(0.5), 1);
  assert.equal(dangerLevel(0.74), 1);
  assert.equal(dangerLevel(0.75), 2);
  assert.equal(dangerLevel(0.89), 2);
  assert.equal(dangerLevel(0.9), 3);
  assert.equal(dangerLevel(5), 3);
});

test('view clamps bad numbers and survives a throwing riskInfo', () => {
  const v = buildView(run({ depth: NaN, strain: Infinity, maxStrain: 0, gold: -4, combo: NaN, biomeId: 'zzz' }), { riskInfo: () => { throw new Error('boom'); } });
  assert.equal(v.depth, 0);
  assert.equal(v.biomeId, 'clay');
  assert.ok(v.strain01 <= 1 && v.strain01 >= 0);
  assert.equal(v.combo, 0);
  assert.equal(v.gold, 0);
  assert.equal(v.risk.beatsToSnap, 9999);
  for (const k of Object.keys(v)) assert.notEqual(typeof v[k], 'undefined');
});

test('idle view works with no run', () => {
  const v = idleView(42);
  assert.equal(v.status, 'idle');
  assert.equal(v.bestDepth, 42);
  assert.equal(buildView(undefined).depth, 0);
});

test('deep abyss view is finite', () => {
  const v = buildView(run({ depth: 1e9, biomeId: 'abyss' }), {});
  assert.equal(v.biomeId, 'abyss');
  assert.ok(Number.isFinite(v.nextBiomeIn));
});
