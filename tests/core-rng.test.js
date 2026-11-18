import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../src/core/rng.js';

test('same seed gives same sequence, different seed differs', () => {
  const a = makeRng(42), b = makeRng(42), c = makeRng(43);
  const sa = Array.from({ length: 20 }, () => a.next());
  const sb = Array.from({ length: 20 }, () => b.next());
  const sc = Array.from({ length: 20 }, () => c.next());
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  for (const x of sa) assert.ok(x >= 0 && x < 1);
});

test('string and bad seeds work', () => {
  assert.equal(makeRng('daily-2026').next(), makeRng('daily-2026').next());
  assert.equal(makeRng(NaN).next(), makeRng(0).next());
  assert.equal(makeRng(undefined).next(), makeRng(0).next());
});

test('int is inclusive and handles odd input', () => {
  const r = makeRng(1);
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(r.int(1, 3));
  assert.deepEqual([...seen].sort(), [1, 2, 3]);
  assert.ok([5, 6, 7].includes(r.int(7, 5)));
  assert.equal(r.int(4, 4), 4);
  assert.equal(Number.isFinite(r.int(NaN, NaN)), true);
});

test('pick and chance', () => {
  const r = makeRng(7);
  assert.equal(r.pick([]), undefined);
  assert.equal(r.pick(null), undefined);
  assert.ok(['a', 'b'].includes(r.pick(['a', 'b'])));
  assert.equal(r.chance(0), false);
  assert.equal(r.chance(1), true);
  assert.equal(r.chance(NaN), false);
});

test('weighted ignores zero, negative and bad weights', () => {
  const r = makeRng(9);
  for (let i = 0; i < 300; i++) {
    assert.equal(r.weighted([['a', 0], ['b', -5], ['c', 1], ['d', NaN]]), 'c');
  }
  assert.equal(r.weighted([]), undefined);
  assert.equal(r.weighted(null), undefined);
  assert.equal(r.weighted([['x', 0], ['y', 0]]), 'x');
  let a = 0;
  for (let i = 0; i < 4000; i++) if (r.weighted([['a', 3], ['b', 1]]) === 'a') a++;
  assert.ok(a > 2800 && a < 3200, 'about 75% a, got ' + a);
});

test('weighted always uses one random number (stable sequence)', () => {
  const a = makeRng(5), b = makeRng(5);
  a.weighted([]); a.weighted([['x', 0]]);
  b.next(); b.next();
  assert.equal(a.next(), b.next());
});
