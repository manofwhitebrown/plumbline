import test from 'node:test';
import assert from 'node:assert/strict';
import { computePayout, shardsFor, SHARD_CAP_PER_DROP } from '../src/run/payout.js';
import { createTally, addEvents } from '../src/run/tally.js';

test('hauled run keeps all the gold', () => {
  const p = computePayout({ outcome: 'hauled', gold: 212, depth: 143, bestBefore: 100 });
  assert.equal(p.kept, 212);
  assert.equal(p.newRecord, true);
  assert.equal(p.shardsEarned, 2 + 1);
  assert.equal(p.summary.text, 'You reached 143 m and hauled 212 gold.');
});

test('snapped run keeps only goldKept, never more than earned', () => {
  const p = computePayout({ outcome: 'snapped', gold: 100, goldKept: 30, depth: 80, bestBefore: 200 });
  assert.equal(p.kept, 30);
  assert.equal(p.newRecord, false);
  assert.match(p.summary.text, /snapped at 80 m/);
  assert.equal(computePayout({ outcome: 'snapped', gold: 10, goldKept: 999, depth: 1 }).kept, 10);
});

test('shards: depth + goals + record, with a cap', () => {
  const goals = [{ done: true, reward: 2 }, { done: false, reward: 3 }];
  assert.equal(shardsFor({ depth: 120, goals, newRecord: true }), 2 + 2 + 1);
  assert.equal(shardsFor({ depth: 1e9, goals, newRecord: true }), SHARD_CAP_PER_DROP);
  assert.equal(computePayout({ outcome: 'hauled', gold: 1, depth: 1e12, goals }).shardsEarned, SHARD_CAP_PER_DROP);
});

test('cheated runs get no record and no shards', () => {
  const p = computePayout({ outcome: 'hauled', gold: 50, depth: 500, bestBefore: 10, cheated: true });
  assert.equal(p.newRecord, false);
  assert.equal(p.shardsEarned, 0);
});

test('payout survives garbage', () => {
  const p = computePayout({ outcome: 'weird', gold: NaN, goldKept: -5, depth: Infinity, bestBefore: 'x', goals: 7, partsInRig: null });
  assert.equal(p.outcome, 'hauled');
  assert.equal(p.kept, 0);
  assert.equal(p.depth, 0);
  assert.ok(Number.isFinite(p.shardsEarned));
  assert.ok(!/NaN|Infinity|undefined/.test(p.summary.text));
  assert.ok(computePayout().summary.text.length > 0);
});

test('summary has biggest gem, best combo and parts used', () => {
  const t = createTally();
  addEvents(t, [
    { t: 'FIRE', partId: 'hook' }, { t: 'FIRE', partId: 'hook' }, { t: 'FIRE', partId: 'net' },
    { t: 'COLLECT', item: { kind: 'gem', tier: 2, value: 3 }, combo: 2 },
    { t: 'COLLECT', item: { kind: 'gem', tier: 4, value: 27 }, combo: 5 },
    { t: 'COLLECT', item: { kind: 'ore', tier: 5, value: 9 }, combo: 6 },
    { t: 'HAZARD', absorbedBy: null }, { t: 'HAZARD', absorbedBy: { r: 0, c: 0 } },
  ]);
  const p = computePayout({ outcome: 'hauled', gold: 10, depth: 60, tally: t, partsInRig: ['hook', 'net', 'hook'] });
  assert.deepEqual(p.summary.biggestGem, { tier: 4, value: 27 });
  assert.equal(p.summary.bestCombo, 6);
  assert.deepEqual(p.partsUsed, ['hook', 'net']);
  assert.deepEqual(p.summary.parts, [{ id: 'hook', fires: 2 }, { id: 'net', fires: 1 }]);
  assert.equal(t.hazardHits, 1);
});
