// The daily twist must really change the numbers that reach the engine.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, T0, DAY } from './meta-helpers.js';
import { meta } from '../src/meta/index.js';
import { getMods } from '../src/meta/mods.js';
import { TWIST_IDS } from '../src/data/rewards.js';
import { getTwist } from '../src/engine/twists.js';

test('every daily twist id in the meta data exists in the engine twists', () => {
  for (const id of TWIST_IDS) assert.ok(getTwist(id), 'missing twist: ' + id);
});

test('twist off: mods are the plain numbers', () => {
  fresh();
  meta.init && meta.init();
  meta.daily.setTwist(false);
  const m = getMods();
  assert.equal(m.twist, null);
  assert.equal(m.maxStrain, 100);
  assert.equal(m.luck, 0);
});

test('twist on: for some day the numbers differ from the plain ones, and stay finite', () => {
  const clock = fresh();
  meta.init && meta.init();
  let changed = 0;
  for (let d = 0; d < TWIST_IDS.length; d++) {
    clock.setNow(T0 + d * DAY);
    meta.daily.setTwist(false);
    const plain = getMods();
    meta.daily.setTwist(true);
    const m = getMods();
    assert.ok(m.twist && getTwist(m.twist), 'twist id is real');
    for (const k of ['maxStrain', 'keepOnSnap', 'goldMult', 'strainMult', 'luck', 'startDepth']) {
      assert.ok(Number.isFinite(m[k]), k + ' must be finite');
    }
    assert.ok(m.maxStrain >= 20 && m.maxStrain <= 1000);
    assert.ok(m.keepOnSnap <= 0.6 + 1e-9);
    assert.equal(m.cheat, null);
    if (['maxStrain', 'goldMult', 'strainMult', 'luck', 'startDepth', 'gemRate', 'hazardRate', 'oreRate', 'speedBonus', 'hazardGold', 'relicBonus']
      .some((k) => m[k] !== plain[k])) changed++;
  }
  assert.equal(changed, TWIST_IDS.length, 'every twist must change something');
});
