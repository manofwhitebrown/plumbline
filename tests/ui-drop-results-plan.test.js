import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeResult, titleText, snapText, depthText, comboText, revealPlan, visibleAt } from '../src/ui/logic/resultsPlan.js';

const snapped = {
  outcome: 'snapped', gold: 100, kept: 30, depth: 142, bestBefore: 100, newRecord: true, shardsEarned: 3,
  goals: [{ text: 'Reach 100 m', done: true, reward: 1 }, { text: 'Collect 5 gems', done: false, reward: 2 }],
  partsUsed: ['hook'],
  summary: { text: 'The rope snapped at 142 m.', biggestGem: { tier: 3, value: 9 }, bestCombo: 6, gems: 8, parts: [{ id: 'hook', fires: 40 }] },
};

test('normalize keeps good data', () => {
  const r = normalizeResult(snapped);
  assert.equal(r.snapped, true);
  assert.equal(r.lost, 70);
  assert.equal(r.goalsDone, 1);
  assert.equal(r.shards, 3);
  assert.equal(r.parts[0].fires, 40);
  assert.equal(titleText(r), 'The rope snapped!');
  assert.equal(snapText(r), 'kept 30 · lost 70');
  assert.equal(depthText(r), '142 m');
  assert.equal(comboText(6), 'Best Combo x6');
});

test('a haul keeps it all and the title is cheerful', () => {
  const r = normalizeResult({ outcome: 'hauled', gold: 50, kept: 50, depth: 60 });
  assert.equal(titleText(r), 'Hauled!');
  assert.equal(snapText(r), 'Kept it all');
  assert.equal(r.lost, 0);
});

test('normalize survives garbage', () => {
  for (const bad of [null, undefined, 3, 'x', [], { gold: NaN, kept: -5, depth: Infinity, goals: 'no', summary: 7, partsUsed: [1, null] }]) {
    const r = normalizeResult(bad);
    assert.ok(!/NaN|Infinity|undefined/.test(JSON.stringify(r)), JSON.stringify(r));
    assert.ok(r.summaryText.length > 0);
    assert.ok(r.kept <= r.gold);
  }
});

test('kept can never be more than collected', () => {
  assert.equal(normalizeResult({ outcome: 'snapped', gold: 10, kept: 99 }).kept, 10);
});

test('reveal plan runs about 2.5 s and ends with the buttons', () => {
  const plan = revealPlan(normalizeResult(snapped), false);
  assert.equal(plan[0].id, 'title');
  assert.equal(plan[plan.length - 1].id, 'buttons');
  assert.ok(plan[plan.length - 1].at >= 2300 && plan[plan.length - 1].at <= 2700);
  assert.ok(plan.some((s) => s.id === 'record'));
  for (let i = 1; i < plan.length; i++) assert.ok(plan[i].at >= plan[i - 1].at);
});

test('plan leaves out empty parts', () => {
  const ids = revealPlan(normalizeResult({ outcome: 'hauled', gold: 5, kept: 5, depth: 3 }), false).map((s) => s.id);
  for (const gone of ['record', 'shards', 'goals', 'best', 'parts']) assert.equal(ids.includes(gone), false, gone);
});

test('reduce motion shows everything at once', () => {
  const plan = revealPlan(normalizeResult(snapped), true);
  assert.equal(visibleAt(plan, 0).length, plan.length);
});

test('visibleAt grows with time and ignores bad time', () => {
  const plan = revealPlan(normalizeResult(snapped), false);
  assert.deepEqual(visibleAt(plan, 0), ['title']);
  assert.ok(visibleAt(plan, 1000).includes('gold'));
  assert.equal(visibleAt(plan, 99999).length, plan.length);
  assert.deepEqual(visibleAt(plan, NaN), ['title']);
  assert.deepEqual(visibleAt(null, 100), []);
});

test('a snap with no gold says so in plain words', () => {
  assert.equal(snapText(normalizeResult({ outcome: 'snapped', gold: 0, kept: 0, depth: 50 })), 'No Gold to lose');
});
