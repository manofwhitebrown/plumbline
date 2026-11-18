import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyView, claimButtonView, claimMessage, announce, ALREADY_TEXT, CLAIM_FAIL_TEXT } from '../src/ui/screens/rewardsDaily.js';
import { meta } from '../src/meta/index.js';
import { fresh, DAY } from './meta-helpers.js';

test('new save: day 1 ready, today is the first slot, 7 slots', () => {
  fresh();
  const v = dailyView(meta.daily.state());
  assert.equal(v.slots.length, 7);
  assert.equal(v.canClaim, true);
  assert.equal(v.day, 1);
  assert.deepEqual(v.slots.filter((s) => s.isToday).map((s) => s.day), [1]);
  assert.equal(v.slots[0].status, 'next');
  assert.ok(v.slots.slice(1).every((s) => s.status === 'upcoming'));
  const b = claimButtonView(v);
  assert.equal(b.disabled, false);
  assert.equal(b.label, 'Claim Day 1');
  assert.match(b.sub, /Shards/);
  assert.match(b.sub, /Gold/);
});

test('after claiming: slot is claimed and highlighted, button says come back tomorrow', () => {
  const clock = fresh();
  const res = meta.daily.claim();
  const v = dailyView(meta.daily.state());
  assert.equal(v.canClaim, false);
  assert.deepEqual(v.slots.filter((s) => s.isToday).map((s) => s.day), [1]);
  assert.equal(v.slots[0].status, 'claimed');
  const b = claimButtonView(v);
  assert.equal(b.disabled, true);
  assert.equal(b.label, 'Claimed');
  assert.match(b.sub, /Come back tomorrow/);
  assert.match(b.sub, /\d/);          // a countdown
  assert.equal(b.reason, ALREADY_TEXT);
  assert.ok(res.ok);
  clock.advance(DAY);
  const v2 = dailyView(meta.daily.state());
  assert.equal(v2.canClaim, true);
  assert.equal(v2.day, 2);
  assert.deepEqual(v2.slots.filter((s) => s.isToday).map((s) => s.day), [2]);
  assert.equal(v2.slots[0].status, 'claimed');
});

test('a full week shows 7 claimed, then the week starts over', () => {
  const clock = fresh();
  for (let i = 0; i < 7; i++) { meta.daily.claim(); if (i < 6) clock.advance(DAY); }
  let v = dailyView(meta.daily.state());
  assert.ok(v.slots.every((s) => s.status === 'claimed'));
  assert.deepEqual(v.slots.filter((s) => s.isToday).map((s) => s.day), [7]);
  clock.advance(DAY);
  v = dailyView(meta.daily.state());
  assert.equal(v.canClaim, true);
  assert.equal(v.day, 1);
  assert.ok(v.slots.every((s) => s.status !== 'claimed'));
});

test('clock moved back: nothing to claim, we just show what meta says', () => {
  const clock = fresh();
  meta.daily.claim();
  clock.advance(-3 * DAY);
  const v = dailyView(meta.daily.state());
  assert.equal(v.canClaim, false);
  assert.equal(claimButtonView(v).disabled, true);
  assert.equal(meta.daily.claim().ok, false);
});

test('bad state gives a safe view with no ready claim', () => {
  for (const bad of [null, undefined, 5, 'x', {}, { rewards: [null, 5, {}] }, { streak: NaN, day: 'q', nextInMs: -9 }]) {
    const v = dailyView(bad);
    assert.ok(v.slots.every((s) => Number.isFinite(s.shards) && Number.isFinite(s.gold)));
    assert.ok(v.day >= 1 && v.day <= 7);
    assert.ok(v.nextInMs >= 0);
    assert.doesNotMatch(claimButtonView(v).sub, /NaN|undefined/);
  }
});

test('claim message: success names day and rewards, under 60 characters', () => {
  const m = claimMessage({ ok: true, day: 3, shards: 10, gold: 300 });
  assert.equal(m.ok, true);
  assert.equal(m.kind, 'ok');
  assert.equal(m.text, 'Day 3 claimed: +10 Shards, +300 Gold');
  assert.ok(claimMessage({ ok: true, day: 7, shards: 50, gold: 999.9e39 }).text.length <= 60);
  assert.equal(claimMessage({ ok: true }).text, 'Claimed: a reward');
});

test('claim message: failures explain why', () => {
  assert.equal(claimMessage({ ok: false, error: 'Already claimed today' }).text, ALREADY_TEXT);
  assert.equal(claimMessage({ ok: false, error: 'boom' }).text, CLAIM_FAIL_TEXT);
  for (const bad of [null, undefined, 3, {}]) assert.equal(claimMessage(bad).ok, false);
  for (const t of [ALREADY_TEXT, CLAIM_FAIL_TEXT]) assert.ok(t.length <= 60);
});

test('announce: toast always shown; success makes the toast kind ok; nothing throws', () => {
  const seen = [];
  announce((t, k) => seen.push([t, k]), { ok: true, kind: 'ok', text: 'Yes' });
  announce((t, k) => seen.push([t, k]), { ok: false, kind: 'warn', text: 'No' });
  assert.deepEqual(seen, [['Yes', 'ok'], ['No', 'warn']]);
  assert.doesNotThrow(() => announce(() => { throw new Error('x'); }, { ok: true, kind: 'ok', text: 'a' }));
  assert.doesNotThrow(() => announce(null, { ok: false, kind: 'warn', text: 'a' }));
});

test('real claim then real message matches what meta paid', () => {
  fresh();
  const before = meta.gold();
  const res = meta.daily.claim();
  const m = claimMessage(res);
  assert.equal(m.ok, true);
  assert.ok(meta.gold() - before >= res.gold);
  const again = claimMessage(meta.daily.claim());
  assert.equal(again.ok, false);
  assert.equal(again.text, ALREADY_TEXT);
});
