import test from 'node:test';
import assert from 'node:assert/strict';
import { slotsFor, slotsKey, chaseLines } from '../src/ui/logic/chaseModel.js';
import { normalizeResult, revealPlan } from '../src/ui/logic/resultsPlan.js';

test('pill slots: always three, unused ones hidden, bad data safe', () => {
  const s = slotsFor([{ id: 'best', text: '40 m to your best', tone: 'even' }, { id: 'ghost', text: '10 Gold ahead of your best', tone: 'good' }]);
  assert.equal(s.length, 3); assert.deepEqual(s.map((x) => x.hidden), [false, false, true]);
  assert.equal(s[1].tone, 'good');
  assert.deepEqual(slotsFor(null).map((x) => x.hidden), [true, true, true]);
  const w = slotsFor([null, 5, { text: 12 }, { id: 'a', text: 'x'.repeat(200), tone: 'purple' }, { text: 'ok' }]);
  assert.equal(w.length, 3); assert.ok(w.every((x) => x.hidden), 'only the first three entries count, and they were all bad');
  const t = slotsFor([{ id: 'a', text: 'x'.repeat(200), tone: 'purple' }])[0]; assert.ok(t.text.length <= 40); assert.equal(t.tone, 'even');
});

test('the key changes only when what is shown changes', () => {
  const a = slotsFor([{ id: 'best', text: 'A', tone: 'even' }]), b = slotsFor([{ id: 'best', text: 'A', tone: 'even' }]), c = slotsFor([{ id: 'best', text: 'B', tone: 'even' }]);
  assert.equal(slotsKey(a), slotsKey(b)); assert.notEqual(slotsKey(a), slotsKey(c));
});

test('results lines come from the chase block, trimmed, and are empty when missing', () => {
  assert.deepEqual(chaseLines({ nearMiss: { text: 'Only 6 m from your best!' }, tip: { text: 'Rope Mender would have kept you 14 more Gold.' } }), { near: 'Only 6 m from your best!', tip: 'Rope Mender would have kept you 14 more Gold.' });
  assert.deepEqual(chaseLines(null), { near: '', tip: '' }); assert.deepEqual(chaseLines({ nearMiss: 5, tip: [] }), { near: '', tip: '' });
});

test('the Results plan adds a chase step only when there is something to say, and old payloads are unchanged', () => {
  const base = { outcome: 'snapped', gold: 100, kept: 30, depth: 50 };
  const none = revealPlan(normalizeResult(base), false).map((s) => s.id);
  assert.ok(!none.includes('chase'));
  const withNear = normalizeResult({ ...base, chase: { nearMiss: { text: 'Only 6 m from your best!' }, tip: null } });
  const ids = revealPlan(withNear, false).map((s) => s.id);
  assert.ok(ids.includes('chase')); assert.ok(ids.indexOf('chase') > ids.indexOf('summary') && ids.indexOf('chase') < ids.indexOf('buttons'));
  assert.equal(revealPlan(withNear, true).find((s) => s.id === 'chase').at, 0, 'Reduce motion shows it at once');
  assert.equal(withNear.chase.near, 'Only 6 m from your best!'); assert.equal(withNear.chase.tip, '');
  assert.doesNotThrow(() => normalizeResult({ chase: 'nope' }));
});
