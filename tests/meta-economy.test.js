import { test } from 'node:test';
import assert from 'node:assert/strict';
import { costOf, bulkCost, maxAffordable, milestoneMult, nextMilestone } from '../src/meta/economy.js';

test('milestone doublings at owned = 0, 9, 10, 24, 25, 99, 100, 300', () => {
  const expect = { 0: 1, 9: 1, 10: 2, 24: 2, 25: 4, 99: 8, 100: 16, 300: 64 };
  for (const [owned, mult] of Object.entries(expect)) assert.equal(milestoneMult(Number(owned)), mult, `owned ${owned}`);
});

test('cost is base x 1.15^owned, rounded up', () => {
  assert.equal(costOf(50, 0), 50);
  assert.equal(costOf(50, 9), Math.ceil(50 * Math.pow(1.15, 9)));
  assert.equal(costOf(50, 10), Math.ceil(50 * Math.pow(1.15, 10)));
  for (const owned of [24, 25, 99, 100, 300]) {
    const c = costOf(1000, owned);
    assert.ok(Number.isFinite(c) && c >= 1000, `owned ${owned}`);
  }
});

test('cost never goes backwards as owned grows', () => {
  let prev = 0;
  for (let o = 0; o <= 300; o++) { const c = costOf(15, o); assert.ok(c >= prev); prev = c; }
});

test('bulk cost equals buying one at a time', () => {
  for (const owned of [0, 9, 24, 99]) {
    for (const n of [1, 10, 25]) {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += costOf(50, owned + i);
      const bulk = bulkCost(50, owned, n);
      assert.ok(Math.abs(bulk - sum) <= n, `owned ${owned}, n ${n}: ${bulk} vs ${sum}`); // rounding only
    }
  }
  assert.equal(bulkCost(50, 5, 0), 0);
});

test('max affordable is exact and safe', () => {
  assert.equal(maxAffordable(50, 0, 49), 0);
  assert.equal(maxAffordable(50, 0, 50), 1);
  for (const gold of [100, 1000, 12345, 1e7]) {
    const n = maxAffordable(50, 3, gold);
    assert.ok(bulkCost(50, 3, n) <= gold);
    assert.ok(bulkCost(50, 3, n + 1) > gold);
  }
  assert.equal(maxAffordable(50, 0, NaN), 0);
  assert.equal(maxAffordable(50, 0, -5), 0);
  assert.equal(maxAffordable(50, 0, Infinity), 0);
});

test('bad input stays finite', () => {
  for (const bad of [NaN, -1, undefined, null, Infinity]) {
    assert.ok(Number.isFinite(costOf(50, bad)));
    assert.ok(Number.isFinite(milestoneMult(bad)));
  }
});

test('next milestone progress', () => {
  assert.deepEqual(nextMilestone(0), { at: 10, remaining: 10, progress: 0 });
  assert.equal(nextMilestone(5).progress, 0.5);
  assert.equal(nextMilestone(10).at, 25);
  assert.equal(nextMilestone(300).at, null);
  assert.equal(nextMilestone(300).progress, 1);
});
