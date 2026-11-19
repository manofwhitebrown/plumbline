import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bezier, ease, seg, DUR } from '../src/ui/motion/easing.js';
import { createRunner } from '../src/ui/motion/timeline.js';
import { createDirector, PRIORITY } from '../src/ui/motion/director.js';

function moment(id, over) {
  const log = [];
  const m = {
    id, priority: PRIORITY.small, dedupeMs: 0, log,
    make() { return { id, durationMs: 400, update: (t) => log.push('u' + Math.round(t)), finish: () => log.push('final') }; },
    ...over,
  };
  return m;
}
const run = (d, ms) => { for (let i = 0; i < ms / 16; i++) d.tick(16); };

test('easing hits 0 and 1, is monotonic, and settle overshoots less than 4 percent', () => {
  for (const k of ['linear', 'out', 'inOut', 'in', 'settle']) {
    assert.equal(ease[k](0), 0); assert.ok(Math.abs(ease[k](1) - 1) < 1e-6);
  }
  let prev = -1; for (let i = 0; i <= 100; i++) { const v = ease.out(i / 100); assert.ok(v >= prev - 1e-9); prev = v; }
  let max = 0; for (let i = 0; i <= 100; i++) max = Math.max(max, ease.settle(i / 100));
  assert.ok(max <= 1.04);
  assert.ok(Math.abs(bezier(0.25, 0.1, 0.25, 1)(0.5) - 0.8) < 0.02); // CSS "ease" at 0.5
  assert.equal(ease.out(NaN), 0);
  assert.ok(DUR.ui <= 400);
});

test('seg clamps and handles zero length', () => {
  assert.equal(seg(-5, 0, 100), 0); assert.equal(seg(500, 0, 100), 1); assert.equal(seg(10, 10, 0), 1);
});

test('runner: reduce motion finishes instantly with the final state', () => {
  const m = moment('a'); const r = createRunner(m.make(), { reduce: true }); let how = null;
  r.start((h) => { how = h; });
  assert.equal(how, 'reduced'); assert.deepEqual(m.log, ['final']);
});

test('runner: skip applies the final state once; tick after end does nothing', () => {
  const m = moment('a'); const r = createRunner(m.make()); r.start(); r.tick(50); r.skip(); r.skip(); r.tick(50);
  assert.equal(m.log.filter((x) => x === 'final').length, 1); assert.equal(r.state, 'skipped');
});

test('runner: speed scales time, huge dt is capped', () => {
  const m = moment('a'); const r = createRunner(m.make(), { speed: 2 }); r.start(); r.tick(100);
  assert.equal(r.time, 200); r.tick(1e9); assert.ok(r.time <= 400);
});

test('director: moments never overlap and run in priority then arrival order', () => {
  const order = []; const d = createDirector();
  const mk = (id, pr) => moment(id, { priority: pr, make() { return { id, durationMs: 100, update() {}, start: () => order.push('s' + id), finish: () => order.push('f' + id) }; } });
  d.play(mk('first', PRIORITY.small));
  d.play(mk('low', PRIORITY.small)); d.play(mk('high', PRIORITY.reward)); d.play(mk('mid', PRIORITY.reward));
  run(d, 1000);
  assert.deepEqual(order, ['sfirst', 'ffirst', 'shigh', 'fhigh', 'smid', 'fmid', 'slow', 'flow']);
});

test('director: a much higher priority cuts the running moment short, with its final state', () => {
  const a = moment('a', { priority: PRIORITY.small }); const b = moment('b', { priority: PRIORITY.big });
  const d = createDirector(); d.play(a); d.tick(32); d.play(b);
  assert.ok(a.log.includes('final')); assert.equal(d.current.id, 'b');
});

test('director: no double plays inside the dedupe window or while queued', () => {
  const d = createDirector(); const m = moment('x', { dedupeMs: 800 });
  assert.equal(d.play(m), true); assert.equal(d.play(m), false);
  run(d, 500); assert.equal(d.play(m), false); run(d, 500); assert.equal(d.play(m), true);
});

test('director: skipGroup skips running and queued members, others stay', () => {
  const d = createDirector(); const a = moment('a', { group: 'g' }), b = moment('b', { group: 'g' }), c = moment('c', { group: 'h' });
  d.play(a); d.play(b); d.play(c); d.skipGroup('g');
  assert.ok(a.log.includes('final') && b.log.includes('final')); assert.equal(d.current.id, 'c');
});

test('director: reduce motion plays everything instantly in order, no audio or haptics', () => {
  let sounds = 0; const d = createDirector({ reduce: true, audio: () => sounds++, haptic: () => sounds++ });
  const a = moment('a'), b = moment('b'); d.play(a); d.play(b);
  assert.deepEqual(a.log, ['final']); assert.deepEqual(b.log, ['final']);
  assert.equal(d.current, null); assert.equal(d.pending, 0); assert.equal(sounds, 0);
});

test('director: a throwing moment does not block the queue; dispose leaves nothing pending', () => {
  const d = createDirector(); const bad = moment('bad', { make() { throw new Error('x'); } }); const ok = moment('ok');
  d.play(bad); d.play(ok); assert.equal(d.current.id, 'ok');
  d.dispose(); assert.equal(d.current, null); assert.equal(d.pending, 0);
});
