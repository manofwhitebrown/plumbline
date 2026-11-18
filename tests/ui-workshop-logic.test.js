import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupParts, partCardState, combosForPart, failText, FAMILIES } from '../src/ui/screens/workshopParts.js';
import { upgradeState, pips } from '../src/ui/screens/workshopUpgrades.js';

test('parts group by family and ignore bad rows', () => {
  const g = groupParts([{ id: 'a', family: 'collector' }, { id: 'b', family: 'weird' }, null, { family: 'engine' }, { id: 'c', family: 'engine' }]);
  assert.deepEqual(Object.keys(g), FAMILIES);
  assert.equal(g.collector.length, 1);
  assert.equal(g.special.length, 1);
  assert.equal(g.engine.length, 1);
  assert.deepEqual(groupParts(null).collector, []);
});

test('part card states', () => {
  const buyable = partCardState({ id: 'magnet', name: 'Magnet', state: 'buyable', cost: 40, count: 0, max: 1 }, 100);
  assert.equal(buyable.canBuy, true);
  assert.equal(buyable.line, '40 Gold');
  const poor = partCardState({ id: 'magnet', name: 'Magnet', state: 'poor', cost: 40, count: 0, max: 1 }, 15);
  assert.equal(poor.canBuy, false);
  assert.equal(poor.reason, 'Need 25 more Gold');
  const locked = partCardState({ id: 'net', state: 'locked', reason: 'Earn 200 Gold in total', cost: 260 }, 0);
  assert.equal(locked.canBuy, false);
  assert.equal(locked.line, 'Earn 200 Gold in total');
  const owned = partCardState({ id: 'hook', state: 'owned', count: 1, max: 1 }, 0);
  assert.equal(owned.line, 'Owned');
  const two = partCardState({ id: 'hook', state: 'owned', count: 2, max: 2 }, 0);
  assert.equal(two.line, 'Owned 2 of 2');
  const copy = partCardState({ id: 'hook', state: 'buyable', count: 1, max: 2, cost: 5 }, 9);
  assert.equal(copy.buyLabel, 'Buy copy');
});

test('bad part input is safe', () => {
  for (const bad of [null, undefined, 3, {}, { state: 'weird', cost: NaN }]) {
    const st = partCardState(bad, NaN);
    assert.equal(st.canBuy, false);
    assert.ok(!/NaN|undefined|null/.test(JSON.stringify(st)));
  }
});

test('combos that name a part', () => {
  const combos = [{ id: 'x', name: 'Wide Net', desc: 'A Splitter with a Net on each side.' }, { id: 'y', name: 'Safe Dive', desc: 'Shield and Anchor.' }];
  assert.deepEqual(combosForPart({ name: 'Net' }, combos).map((c) => c.id), ['x']);
  assert.deepEqual(combosForPart({ name: 'Drill' }, combos), []);
  assert.deepEqual(combosForPart(null, combos), []);
  assert.deepEqual(combosForPart({ name: 'Net' }, null), []);
});

test('failed buy text is never empty', () => {
  assert.equal(failText({ ok: false, error: 'Not enough Gold' }), 'Not enough Gold');
  assert.ok(failText(null).length > 0);
  assert.equal(failText({ error: '  ' }, 'Try later'), 'Try later');
});

test('upgrade states', () => {
  const info = { id: 'rope', name: 'Stronger Rope', currency: 'gold', level: 2, max: 8, cost: 484, canAfford: false, canBuy: false, locked: false, now: '+20 max Strain', next: '+30 max Strain' };
  const st = upgradeState(info, { gold: 400 });
  assert.equal(st.reason, 'Need 84 more Gold');
  assert.equal(st.canBuy, false);
  const rich = upgradeState({ ...info, canAfford: true, canBuy: true }, { gold: 1e6 });
  assert.equal(rich.canBuy, true);
  const locked = upgradeState({ ...info, locked: true, reason: 'Reach 50 m Depth first' }, {});
  assert.equal(locked.reason, 'Reach 50 m Depth first');
  const maxed = upgradeState({ ...info, level: 8, maxed: true }, {});
  assert.equal(maxed.canBuy, false);
  assert.equal(maxed.buyLabel, 'Maxed');
  assert.equal(maxed.next, '');
  const shards = upgradeState({ ...info, currency: 'shards', canAfford: false }, { shards: 5 });
  assert.match(shards.reason, /Shards$/);
});

test('level pips', () => {
  assert.deepEqual(pips(2, 4), [true, true, false, false]);
  assert.equal(pips(0, 99).length, 12);
  assert.deepEqual(pips(NaN, NaN), [false]);
});

test('upgrade bad input is safe', () => {
  for (const bad of [null, undefined, 1, {}, { level: NaN, max: 'x', cost: Infinity }]) {
    const st = upgradeState(bad, null);
    assert.ok(!/NaN|Infinity|undefined/.test(JSON.stringify(st)));
  }
});
