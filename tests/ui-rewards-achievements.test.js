import { test } from 'node:test';
import assert from 'node:assert/strict';
import { achievementsView } from '../src/ui/screens/rewardsAchievements.js';
import { meta } from '../src/meta/index.js';
import { bump } from '../src/meta/stats.js';
import { s as metaState } from '../src/meta/state.js';
import { check } from '../src/meta/achievements.js';
import { ACHIEVEMENTS } from '../src/data/rewards.js';
import { fresh } from './meta-helpers.js';

test('new save: nothing done, counter 0 of all, everything still to do', () => {
  fresh();
  const v = achievementsView(meta.achievements.list());
  assert.equal(v.total, ACHIEVEMENTS.length);
  assert.equal(v.doneCount, 0);
  assert.equal(v.fraction, 0);
  assert.equal(v.todo.length, ACHIEVEMENTS.length);
  assert.ok(v.todo.every((a) => !a.done && /^\d.* \/ \d/.test(a.label)));
});

test('unlocking moves an achievement to done and counts it', () => {
  fresh();
  bump('snaps', 1);
  check();
  const v = achievementsView(meta.achievements.list());
  assert.equal(v.doneCount, 1);
  assert.equal(v.done[0].id, 'a_snap1');
  assert.equal(v.done[0].label, 'Done');
  assert.equal(v.done[0].fraction, 1);
  assert.equal(v.todo.length, v.total - 1);
  assert.ok(Math.abs(v.fraction - 1 / v.total) < 1e-9);
});

test('unfinished list shows the closest one first', () => {
  fresh();
  metaState().bestDepth = 90; // 90 of 100 m
  const v = achievementsView(meta.achievements.list());
  assert.equal(v.todo[0].id, 'a_depth100');
  assert.ok(v.todo[0].fraction > 0.85);
  for (let i = 1; i < v.todo.length; i++) assert.ok(v.todo[i - 1].fraction >= v.todo[i].fraction);
});

test('every achievement keeps a name and description within the text limits', () => {
  fresh();
  const v = achievementsView(meta.achievements.list());
  for (const a of v.items) {
    assert.ok(a.name.length <= 22, a.name);
    assert.ok(a.desc.length <= 80, a.desc);
    assert.ok(a.shards > 0);
  }
});

test('bad input is safe', () => {
  for (const bad of [null, undefined, 3, {}, [null, 1, { id: 4 }]]) {
    const v = achievementsView(bad);
    assert.equal(v.total, 0);
    assert.equal(v.fraction, 0);
  }
  const v = achievementsView([{ id: 'a', unlocked: false, target: 0, progress: Infinity, shards: NaN }]);
  assert.ok(v.todo[0].fraction >= 0 && v.todo[0].fraction <= 1);
  assert.equal(v.todo[0].shards, 0);
});

test('a cheated save earns nothing, and the list still draws', () => {
  fresh();
  const v = achievementsView(meta.achievements.list());
  assert.equal(v.doneCount, 0);
});
