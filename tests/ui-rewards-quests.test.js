import { test } from 'node:test';
import assert from 'node:assert/strict';
import { questsView, questClaimMessage } from '../src/ui/screens/rewardsQuests.js';
import { meta } from '../src/meta/index.js';
import { completeAll } from '../src/meta/quests.js';
import { fresh, DAY } from './meta-helpers.js';

test('three quests, all active on a new day, with bars at zero', () => {
  fresh();
  const v = questsView(meta.quests.list());
  assert.equal(v.total, 3);
  assert.ok(v.items.every((q) => q.state === 'active' && q.fraction === 0 && /^0 \/ /.test(q.label) && q.shards > 0));
  assert.equal(v.doneCount, 0);
  assert.equal(v.sub, 'New quests every day.');
});

test('finished quests are ready, claiming turns them into claimed, with shards paid', () => {
  fresh();
  completeAll();
  let v = questsView(meta.quests.list());
  assert.ok(v.items.every((q) => q.state === 'ready' && q.fraction === 1));
  assert.match(v.sub, /ready to claim/);
  const q = v.items[0];
  const before = meta.shards();
  const res = meta.quests.claim(q.id);
  assert.equal(res.ok, true);
  assert.equal(meta.shards() - before, q.shards);
  assert.equal(questClaimMessage(res).text, 'Quest done: +' + q.shards + ' Shards');
  v = questsView(meta.quests.list());
  assert.equal(v.items.find((x) => x.id === q.id).state, 'claimed');
  assert.equal(v.claimed, 1);
  assert.equal(v.doneCount, 3);
  for (const x of v.items) meta.quests.claim(x.id);
  assert.equal(questsView(meta.quests.list()).sub, 'All done. New quests tomorrow.');
});

test('quests rotate on a new day', () => {
  const clock = fresh();
  completeAll();
  for (const x of meta.quests.list()) meta.quests.claim(x.id);
  clock.advance(DAY);
  const v = questsView(meta.quests.list());
  assert.equal(v.claimed, 0);
  assert.equal(v.total, 3);
});

test('claim failures explain why', () => {
  fresh();
  const id = meta.quests.list()[0].id;
  assert.equal(questClaimMessage(meta.quests.claim(id)).text, 'Not finished yet. Keep going.');
  assert.equal(questClaimMessage(meta.quests.claim('nope')).text.startsWith('That quest is gone'), true);
  completeAll();
  meta.quests.claim(id);
  assert.equal(questClaimMessage(meta.quests.claim(id)).text, 'You already claimed that quest.');
  assert.equal(questClaimMessage(null).text, "Couldn't claim the quest. Try again.");
  assert.equal(questClaimMessage({ ok: false, error: 'weird' }).ok, false);
});

test('toast lines stay under 60 characters', () => {
  for (const m of [questClaimMessage({ ok: true, shards: 14 }), questClaimMessage({ ok: false, error: 'No such quest' }), questClaimMessage({ ok: false, error: 'Already claimed' })]) assert.ok(m.text.length <= 60, m.text);
});

test('bad input gives an empty, safe view', () => {
  for (const bad of [null, undefined, 3, 'x', {}, [null, 4, { id: 7 }]]) {
    const v = questsView(bad);
    assert.equal(v.total, 0);
    assert.equal(v.sub, 'No quests right now.');
  }
  const v = questsView([{ id: 'a', text: 'x', target: 0, progress: NaN, shards: -2 }, { id: 'b', target: 5, progress: 99 }]);
  assert.ok(v.items.every((q) => Number.isFinite(q.fraction) && q.fraction >= 0 && q.fraction <= 1 && q.shards >= 0));
});

test('big numbers stay short', () => {
  const v = questsView([{ id: 'a', text: 'Earn 1M Gold', target: 1e6, progress: 123456, shards: 12 }]);
  assert.equal(v.items[0].label, '123K / 1M');
  assert.ok(v.items[0].label.length <= 20);
});
