import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, makeEngine } from './run-helpers.js';
import { setDeps } from '../src/run/deps.js';
import { session } from '../src/run/session.js';
import { hardReset } from '../src/run/state.js';
import { recover } from '../src/run/recover.js';
import records from '../src/run/records.js';

test('full scripted session: start, 50 beats, haul, run:ended exactly once', () => {
  const t = setup();
  assert.equal(session.start().ok, true);
  assert.equal(t.count('run:started'), 1);
  t.loop.tick(50);
  assert.equal(t.count('run:events'), 50);
  assert.equal(session.getView().depth, 50);
  assert.equal(session.haul().ok, true);
  assert.equal(t.count('run:ended'), 1);
  const ended = t.seen.find((x) => x[0] === 'run:ended')[1];
  assert.equal(ended.outcome, 'hauled');
  assert.equal(ended.gold, 100);
  assert.equal(ended.kept, 100);
  assert.equal(ended.depth, 50);
  assert.equal(ended.newRecord, true);
  assert.equal(ended.bestBefore, 0);
  const goalShards = ended.goals.filter((g) => g.done).reduce((a, g) => a + g.reward, 0);
  assert.equal(ended.shardsEarned, 1 + 1 + goalShards, 'depth + record + goals');
  assert.equal(t.count('goal:done'), ended.goals.filter((g) => g.done).length);
  assert.deepEqual(ended.partsUsed, ['hook']);
  assert.equal(t.meta.gold(), 100);
  assert.equal(session.getView().status, 'hauled');
  t.off();
});

test('snap path pays goldKept from the engine, shards from depth', () => {
  const t = setup({ engine: { snapAt: 60 } });
  session.start();
  t.loop.tick(200);
  assert.equal(t.count('run:ended'), 1);
  const e = t.seen.find((x) => x[0] === 'run:ended')[1];
  assert.equal(e.outcome, 'snapped');
  assert.equal(e.gold, 120);
  assert.equal(e.kept, 36);
  assert.equal(t.meta.gold(), 36);
  assert.equal(t.loop.running, false, 'loop stopped');
  t.off();
});

test('double haul pays once, haul when idle does nothing, abort pays nothing', () => {
  let t = setup();
  assert.equal(session.haul().ok, false, 'nothing running');
  session.start(); t.loop.tick(10);
  assert.equal(session.haul().ok, true);
  assert.equal(session.haul().ok, false);
  assert.equal(t.count('run:ended'), 1);
  assert.equal(t.meta.gold(), 20);
  t.off();

  t = setup();
  session.start(); t.loop.tick(10);
  assert.equal(session.abort().ok, true);
  assert.equal(session.abort().ok, false);
  assert.equal(session.haul().ok, false, 'cannot haul after abort');
  t.loop.tick(5);
  assert.equal(t.meta.gold(), 0);
  assert.equal(t.count('run:ended'), 0);
  assert.equal(t.count('run:aborted'), 1);
  assert.equal(records.peekCheckpoint(), null);
  t.off();
});

test('start while running is ignored (double tap on Drop)', () => {
  const t = setup();
  assert.equal(session.start().ok, true);
  assert.equal(session.start().ok, false);
  assert.equal(t.count('run:started'), 1);
  t.off();
});

test('pause freezes the loop, resume continues, haul is ignored while paused', () => {
  const t = setup();
  session.start(); t.loop.tick(5);
  session.pause();
  t.loop.tick(5);
  assert.equal(session.getView().depth, 5);
  assert.equal(session.haul().ok, false);
  session.resume(); t.loop.tick(3);
  assert.equal(session.getView().depth, 8);
  t.off();
});

test('a faster rig plays faster', () => {
  const t = setup({ engine: { speed: 2 } });
  session.start();
  assert.ok(t.loop.beatMs < 450);
  t.off();
});

test('RECORD event is sent once when the old best is beaten', () => {
  const t = setup();
  records.recordDrop({ outcome: 'hauled', depth: 10, kept: 1, biomeId: 'clay' });
  session.start(); t.loop.tick(30);
  const records_ = t.seen.filter((x) => x[0] === 'run:events').flatMap((x) => x[1].events).filter((e) => e.t === 'RECORD');
  assert.equal(records_.length, 1);
  assert.equal(records_[0].depth, 11);
  t.off();
});

test('a throwing engine ends the drop safely and never freezes', () => {
  const t = setup({ engine: { throwAt: 4 } });
  session.start(); t.loop.tick(3);
  t.loop.tick(10);
  assert.equal(t.count('run:ended') <= 1, true);
  t.off();
});

test('crash recovery pays once as a snap and clears the checkpoint', () => {
  const t = setup();
  session.start(); t.loop.tick(25); // checkpoints at beat 10 and 20 (depth 20, gold 40)
  t.save.crash(); hardReset();      // page closed
  const paid = recover();
  assert.equal(paid.outcome, 'snapped');
  assert.equal(paid.depth, 20);
  assert.equal(paid.kept, 12);
  assert.equal(t.meta.gold(), 12);
  assert.equal(records.peekCheckpoint(), null);
  assert.equal(recover(), null, 'second time pays nothing');
  assert.equal(t.meta.gold(), 12);
  t.off();
});

test('start without engine or loop fails soft', () => {
  const t = setup();
  setDeps({ engine: null });
  const r = session.start();
  assert.equal(r.ok, false);
  assert.match(r.error, /not ready/);
  assert.equal(session.getView().status, 'idle');
  setDeps({ engine: makeEngine(), createLoop: null });
  assert.equal(session.start().ok, false);
  t.off();
});

test('engine that cannot make a run does not leave a stuck drop', () => {
  const t = setup();
  setDeps({ engine: { ...makeEngine(), createRun() { throw new Error('bad'); } } });
  assert.equal(session.start().ok, false);
  setDeps({ engine: makeEngine() });
  assert.equal(session.start().ok, true, 'can try again');
  t.off();
});
