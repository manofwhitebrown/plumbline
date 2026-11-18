import test from 'node:test';
import assert from 'node:assert/strict';
import { getTwist, todaysTwist, allTwists, applyTwist } from '../src/engine/twists.js';

const IDS = ['brittle_rope', 'gem_rain', 'hazard_fest', 'heavy_bucket', 'lucky_day', 'ore_flood', 'thin_air', 'deep_calling'];
const base = () => ({ maxStrain: 100, goldMult: 1, strainMult: 1, luck: 0, startDepth: 0, cols: 4, rows: 3 });

test('all 8 twists exist with a name and a one-line description', () => {
  assert.equal(allTwists().length, 8);
  for (const id of IDS) {
    const t = getTwist(id);
    assert.ok(t && t.name && t.desc && t.desc.length <= 90, id);
    assert.equal(t.id, id);
  }
});

test('twists change mods as described and never touch the input', () => {
  const m = base();
  const brittle = applyTwist(m, 'brittle_rope');
  assert.equal(brittle.maxStrain, 70);
  assert.ok(Math.abs(brittle.goldMult - 1.4) < 1e-9);
  assert.equal(m.maxStrain, 100);
  assert.ok(Math.abs(applyTwist(m, 'gem_rain').luck - 0.3) < 1e-9);
  const deep = applyTwist(m, 'deep_calling');
  assert.equal(deep.startDepth, 100);
  assert.ok(Math.abs(deep.strainMult - 1.3) < 1e-9);
  assert.equal(applyTwist({ ...m, startDepth: 250 }, 'deep_calling').startDepth, 250, 'never lowers a deeper start');
  const thin = applyTwist(m, 'thin_air');
  assert.ok(thin.strainMult < 1 && thin.gemRate < 1);
  assert.ok(applyTwist(m, 'hazard_fest').hazardRate > 1);
  assert.ok(applyTwist(m, 'hazard_fest').hazardGold > 0);
  assert.ok(applyTwist(m, 'ore_flood').oreRate > 1);
  assert.ok(applyTwist(m, 'heavy_bucket').speedBonus > 0);
  assert.ok(applyTwist(m, 'lucky_day').relicBonus > 0);
});

test('bad ids and bad mods are safe', () => {
  assert.equal(getTwist(null), null);
  assert.equal(getTwist('nope'), null);
  assert.equal(getTwist('toString'), null);
  assert.equal(applyTwist(null, 'gem_rain'), null);
  const m = base();
  assert.equal(applyTwist(m, 'nope'), m);
  assert.ok(Number.isFinite(applyTwist({ maxStrain: NaN }, 'brittle_rope').maxStrain));
});

test('todaysTwist: same date same twist, bad dates give null', () => {
  assert.equal(todaysTwist('2026-11-18'), todaysTwist('2026-11-18'));
  for (const bad of [null, undefined, 5, '', 'x', '2026-13-01', '2026-02-30', '18-11-2026']) assert.equal(todaysTwist(bad), null);
});

test('todaysTwist: every 8 days all 8 twists, and never the same twist two days running', () => {
  const start = Date.UTC(2026, 0, 1);
  let prev = null;
  const seen = new Map();
  for (let i = 0; i < 800; i++) {
    const d = new Date(start + i * 86400000).toISOString().slice(0, 10);
    const id = todaysTwist(d);
    assert.ok(IDS.includes(id), d);
    assert.notEqual(id, prev, 'repeat on ' + d);
    prev = id;
    seen.set(id, (seen.get(id) || 0) + 1);
  }
  for (const id of IDS) assert.ok(seen.get(id) >= 90 && seen.get(id) <= 110, id + ' ' + seen.get(id));
});
