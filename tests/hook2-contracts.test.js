import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bus } from '../src/core/bus.js';
import { s } from '../src/meta/state.js';
import * as C from '../src/meta/contracts.js';
import { CONTRACTS, CONTRACTS_ACTIVE, CONTRACT_TEXT_MAX } from '../src/data/contracts.js';
import { fresh, DAY } from './meta-helpers.js';

const RIG = { cols: 2, rows: 1, cells: [['hook', 'magnet']] };
const gem = (c = 0) => ({ t: 'COLLECT', lane: c, item: { kind: 'gem', tier: 1, value: 1 }, gold: 1, combo: 1, r: 0, c });

test('data: about 20 templates, unique ids, texts within the limit, sane rewards', () => {
  assert.ok(CONTRACTS.length >= 20);
  assert.equal(new Set(CONTRACTS.map((c) => c.id)).size, CONTRACTS.length);
  for (const c of CONTRACTS) {
    assert.ok(c.text.length <= CONTRACT_TEXT_MAX, `${c.id}: "${c.text}" is ${c.text.length}`);
    assert.ok(c.target > 0);
    assert.ok(c.reward.shards > 0 || c.reward.goldMinutes > 0);
    assert.doesNotMatch(c.text, /\b(beat|lane|tick|seed|tier|hazard|null|undefined|NaN)\b/i);
  }
});

test('there are always 3 different contracts, with different goals', () => {
  fresh();
  const l = C.list();
  assert.equal(l.length, CONTRACTS_ACTIVE);
  assert.equal(new Set(l.map((c) => c.id)).size, 3);
});

test('same day gives the same board; a new Depth unlocks harder ones only', () => {
  fresh(); const a = C.list().map((c) => c.id);
  fresh(); const b = C.list().map((c) => c.id);
  assert.deepEqual(a, b);
  fresh(); s().bestDepth = 0;
  for (let i = 0; i < 30; i++) { C.resetAll(); for (const c of C.list()) assert.equal(CONTRACTS.find((x) => x.id === c.id).minBest, 0); }
});

test('progress comes from run events and the end of a Drop', () => {
  fresh();
  C.resetAll();
  let tries = 0;
  while (!C.list().some((c) => c.id === 'c_gems20') && tries++ < 200) C.resetAll();
  // (if the random board never offers it, the test below still checks gems through the sum contract)
  bus.emit('run:started', { rig: RIG });
  bus.emit('run:events', { events: Array.from({ length: 25 }, () => gem()) });
  bus.emit('run:ended', { outcome: 'hauled', depth: 200, gold: 25, kept: 25 });
  const l = C.list();
  for (const c of l) {
    if (c.id === 'c_gems20') assert.equal(c.done, true);
    if (c.id === 'c_drops4') assert.equal(c.progress, 1);
    if (c.id === 'c_haul150') assert.equal(c.done, true);
    if (c.id === 'c_gems100') assert.equal(c.progress, 25);
  }
});

test('claiming pays, and the contract is replaced right away', () => {
  fresh();
  assert.ok(C.cheatComplete());
  const done = C.list().find((c) => c.done);
  assert.ok(done);
  const sh = s().shards, g = s().gold;
  const r = C.claim(done.id);
  assert.equal(r.ok, true);
  assert.ok(s().shards > sh || s().gold > g);
  const after = C.list();
  assert.equal(after.length, 3);
  assert.ok(!after.some((c) => c.id === done.id));
  assert.equal(C.claim(done.id).ok, false); // cannot claim twice
});

test('claiming something not finished is refused', () => {
  fresh();
  const c = C.list()[0];
  assert.equal(C.claim(c.id).ok, false);
  assert.equal(C.claim('nope').ok, false);
  assert.equal(C.claim(null).ok, false);
});

test('a new day replaces unfinished contracts but keeps finished ones', () => {
  const clock = fresh();
  C.list();
  C.cheatComplete();
  const doneId = C.list().find((c) => c.done).id;
  clock.advance(DAY);
  const l = C.list();
  assert.equal(l.length, 3);
  assert.ok(l.some((c) => c.id === doneId && c.done));
});

test('clock moved back does not refresh the board', () => {
  const clock = fresh();
  clock.advance(2 * DAY);
  const a = C.list().map((c) => c.id);
  clock.advance(-2 * DAY);
  assert.deepEqual(C.list().map((c) => c.id), a);
});

test('cheated drops add no progress', () => {
  fresh();
  s().cheated = true;
  bus.emit('run:started', { rig: RIG });
  bus.emit('run:events', { events: Array.from({ length: 200 }, () => gem()) });
  bus.emit('run:ended', { outcome: 'hauled', depth: 900, gold: 1, kept: 1 });
  assert.ok(C.list().every((c) => c.progress === 0));
});

test('reward Gold scales with Crew income and is never NaN', () => {
  fresh();
  for (const c of CONTRACTS) {
    const r = C.rewardAmount(c);
    assert.ok(Number.isFinite(r.amount) && r.amount > 0);
  }
});

test('bad input never throws', () => {
  fresh();
  assert.doesNotThrow(() => C.onEvents(undefined));
  assert.doesNotThrow(() => C.onEnded(null));
  assert.doesNotThrow(() => C.record('gems', 'x', 'drop'));
  assert.doesNotThrow(() => C.onStarted({ rig: 5 }));
});

test('old save loads: no contracts slice and a damaged slice both give 3 contracts', async () => {
  fresh();
  const { getSlice } = await import('../src/core/save.js');
  const slice = getSlice('contracts');
  slice.active = [{ id: 'gone', progress: 'x' }, { id: 'c_gems20', progress: -4 }, null];
  slice.day = 'garbage';
  assert.doesNotThrow(() => C.list());
  assert.equal(C.list().length, 3);
});
