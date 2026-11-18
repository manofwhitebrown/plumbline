import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, update, finalize, rewardOf } from '../src/run/goals.js';
import { GOAL_SHARD_CAP } from '../src/data/goals.js';

function seeded(seed) {
  let a = seed >>> 0;
  return { next() { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; } };
}

test('goals are never impossible or silly for best depth 0, 150, 1500', () => {
  for (const best of [0, 150, 1500, -4, NaN, undefined, 1e9]) {
    for (let seed = 1; seed <= 60; seed++) {
      const goals = generate({ bestDepth: best, rng: seeded(seed) });
      assert.equal(goals.length, 3, `3 goals for best ${best}`);
      assert.equal(new Set(goals.map((g) => g.kind)).size, 3, 'different kinds');
      const b = Number.isFinite(best) && best > 0 ? best : 0;
      for (const g of goals) {
        assert.ok(Number.isFinite(g.target) && g.target > 0, `${g.kind} target`);
        assert.ok(g.reward >= 1 && g.reward <= 4);
        assert.ok(!/NaN|undefined|Infinity/.test(g.text), g.text);
        if (g.kind === 'depth') assert.ok(g.target <= Math.max(70, b * 1.15), `depth target ${g.target} for best ${best}`);
        if (g.kind === 'depth') assert.ok(g.target >= 30);
        if (g.kind === 'haulStrain') { assert.ok(g.target <= b * 0.65 + 10); assert.ok(g.target > 0, 'not trivial'); }
        if (g.kind === 'cleanRope') assert.ok(g.target <= b * 0.65 + 10);
        if (g.kind === 'combo') assert.ok(g.target >= 3 && g.target <= 40);
        if (g.kind === 'gems') assert.ok(g.tier >= 1 && g.tier <= 5);
      }
    }
  }
});

test('new players only get goals they can reach with a starter rig', () => {
  const kinds = new Set();
  for (let seed = 1; seed < 40; seed++) generate({ bestDepth: 0, rng: seeded(seed) }).forEach((g) => kinds.add(g.kind));
  assert.deepEqual([...kinds].sort(), ['combo', 'depth', 'gems']);
});

test('depth, gems and combo goals finish and report once', () => {
  const goals = [
    { id: 'depth', kind: 'depth', target: 50, progress: 0, reward: 1, done: false },
    { id: 'gems', kind: 'gems', tier: 2, target: 2, progress: 0, reward: 2, done: false },
    { id: 'combo', kind: 'combo', target: 4, progress: 0, reward: 1, done: false },
  ];
  const gem = (tier, combo) => ({ t: 'COLLECT', item: { kind: 'gem', tier }, combo });
  let done = update(goals, [gem(1, 1), gem(2, 2)], { depth: 20 });
  assert.equal(done.length, 0);
  assert.equal(goals[1].progress, 1, 'tier 1 does not count');
  done = update(goals, [gem(3, 4)], { depth: 55 });
  assert.deepEqual(done.map((g) => g.id).sort(), ['combo', 'depth', 'gems']);
  assert.equal(update(goals, [gem(3, 9)], { depth: 99 }).length, 0, 'never finishes twice');
  assert.equal(rewardOf(goals), 4);
});

test('haulStrain needs a haul, enough depth and low strain', () => {
  const g = () => [{ id: 'h', kind: 'haulStrain', target: 40, strainBelow: 55, reward: 3, done: false, progress: 0 }];
  let a = g(); update(a, [], { depth: 100, strain: 10 }); assert.equal(a[0].done, false, 'not done before hauling');
  assert.equal(finalize(a, { outcome: 'hauled', depth: 100, strain: 30 }).length, 1);
  a = g(); assert.equal(finalize(a, { outcome: 'hauled', depth: 10, strain: 5 }).length, 0, 'too shallow');
  a = g(); assert.equal(finalize(a, { outcome: 'hauled', depth: 100, strain: 80 }).length, 0, 'too much strain');
  a = g(); assert.equal(finalize(a, { outcome: 'snapped', depth: 100, strain: 100 }).length, 0, 'snap fails it');
});

test('cleanRope fails after too many hazard hits', () => {
  const g = [{ id: 'c', kind: 'cleanRope', target: 60, maxHits: 1, hits: 0, progress: 0, reward: 2, done: false, failed: false }];
  const hit = { t: 'HAZARD', absorbedBy: null };
  update(g, [hit], { depth: 10 }); assert.equal(g[0].failed, false);
  update(g, [hit, { t: 'HAZARD', absorbedBy: { r: 1, c: 1 } }], { depth: 20 });
  assert.equal(g[0].failed, true);
  assert.equal(update(g, [], { depth: 500 }).length, 0);
});

test('goals shrug off bad input', () => {
  assert.equal(update(null, null, null).length, 0);
  assert.equal(update([null, {}], [null, {}], {}).length, 0);
  assert.equal(finalize(undefined).length, 0);
  assert.equal(rewardOf(null), 0);
  assert.deepEqual(generate({ rng: { next: () => NaN } }).length, 3);
});

test('goal rewards are capped', () => {
  const many = Array.from({ length: 20 }, () => ({ done: true, reward: 5 }));
  assert.equal(rewardOf(many), GOAL_SHARD_CAP);
});
