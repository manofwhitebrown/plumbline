import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crewCardState, crewQty, crewCost, cleanMode, modeLabel } from '../src/ui/screens/crewCard.js';

const base = { id: 'winch', name: 'Winch Hand', owned: 4, unlocked: true, cost: 100, cost10: 2000, maxBuy: 3, perSecond: 4, mult: 1,
  milestone: { at: 10, remaining: 6, progress: 0.4 }, manager: { owned: false, cost: 7500, canBuy: false, reason: 'Needs 10 Crew' } };

test('mode cleaning and labels', () => {
  assert.equal(cleanMode('10'), 10);
  assert.equal(cleanMode('max'), 'max');
  assert.equal(cleanMode('nope'), 1);
  assert.equal(cleanMode(undefined), 1);
  assert.equal(modeLabel('max'), 'Max');
  assert.equal(modeLabel(10), 'x10');
});

test('quantity and cost follow the toggle', () => {
  assert.equal(crewQty(base, 1), 1);
  assert.equal(crewQty(base, 10), 10);
  assert.equal(crewQty(base, 'max'), 3);
  assert.equal(crewQty({ ...base, maxBuy: 0 }, 'max'), 1);
  assert.equal(crewCost(base, 1), 100);
  assert.equal(crewCost(base, 10), 2000);
  const c3 = crewCost(base, 'max');
  assert.ok(c3 > 300 && c3 < 400);
});

test('buy is allowed with enough gold and explains when not', () => {
  const ok = crewCardState(base, 1, 500);
  assert.equal(ok.canBuy, true);
  assert.equal(ok.reason, '');
  const poor = crewCardState(base, 1, 80);
  assert.equal(poor.canBuy, false);
  assert.equal(poor.reason, 'Need 20 more Gold');
  const x10 = crewCardState(base, 10, 500);
  assert.equal(x10.canBuy, false);
  assert.match(x10.reason, /^Need 1\.5K more Gold$/);
  const max = crewCardState({ ...base, maxBuy: 0 }, 'max', 10);
  assert.equal(max.canBuy, false);
});

test('locked crew show the rule and no buy', () => {
  const st = crewCardState({ ...base, unlocked: false, reason: 'Reach 50 m Depth to unlock' }, 1, 1e9);
  assert.equal(st.locked, true);
  assert.equal(st.lockText, 'Reach 50 m Depth to unlock');
  assert.equal(st.canBuy, false);
});

test('milestone progress and manager reasons', () => {
  const st = crewCardState(base, 1, 0);
  assert.equal(st.progress, 0.4);
  assert.match(st.milestoneText, /6 more/);
  assert.equal(st.manager.reason, 'Needs 10 Crew');
  const top = crewCardState({ ...base, milestone: { at: null, remaining: 0, progress: 1 } }, 1, 0);
  assert.equal(top.progress, 1);
  const hired = crewCardState({ ...base, manager: { owned: true, cost: 1, canBuy: false } }, 1, 0);
  assert.equal(hired.manager.owned, true);
  assert.equal(hired.manager.reason, '');
});

test('bad input never throws and never shows NaN', () => {
  for (const bad of [null, undefined, 5, 'x', {}, { owned: NaN, cost: Infinity, perSecond: 'a' }]) {
    const st = crewCardState(bad, 'max', NaN);
    assert.ok(Number.isFinite(st.cost) || st.cost === 0);
    assert.ok(!/NaN|Infinity|undefined/.test(JSON.stringify(st)));
  }
});

test('huge numbers stay short', () => {
  const st = crewCardState({ ...base, owned: 1e12, cost: 1e300, cost10: 1e301, perSecond: 1e40, maxBuy: 0 }, 1, 5);
  assert.equal(st.canBuy, false);
  assert.ok(st.reason.length < 40);
});
