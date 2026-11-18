import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLoop } from '../src/core/loop.js';

// A fake clock and a fake frame scheduler so tests are exact.
function rig(extra = {}) {
  let t = 0;
  let queued = null;
  const beats = [], frames = [];
  const loop = createLoop({
    beatMs: 100, now: () => t,
    raf: (f) => { queued = f; return 1; },
    caf: () => { queued = null; },
    onBeat: () => beats.push(t),
    onFrame: (dt, a) => frames.push([dt, a]),
    ...extra
  });
  const advance = (ms) => { t += ms; const f = queued; queued = null; if (f) f(t); };
  return { loop, beats, frames, advance, hasFrame: () => queued !== null };
}

test('fixed step: beats come every beatMs and alpha shows progress', () => {
  const r = rig();
  r.loop.start();
  r.advance(50);
  assert.equal(r.beats.length, 0);
  assert.ok(Math.abs(r.frames.at(-1)[1] - 0.5) < 1e-9);
  r.advance(60);
  assert.equal(r.beats.length, 1);
  assert.ok(Math.abs(r.frames.at(-1)[1] - 0.1) < 1e-9);
});

test('dt is clamped to 250 ms (a long stall does not fire a pile of beats)', () => {
  const r = rig();
  r.loop.start();
  r.advance(60_000);
  assert.equal(r.beats.length, 2);
  assert.equal(r.frames.at(-1)[0], 250);
});

test('a too-small beat cannot cause a spiral of death', () => {
  const r = rig({ beatMs: 16 });
  r.loop.start();
  r.advance(250);
  assert.ok(r.beats.length <= 8);
  const a = r.frames.at(-1)[1];
  assert.ok(a >= 0 && a <= 1);
});

test('pause, resume, stop', () => {
  const r = rig();
  r.loop.start();
  assert.equal(r.loop.isRunning(), true);
  r.advance(100);
  r.loop.pause();
  assert.equal(r.loop.isRunning(), false);
  assert.equal(r.hasFrame(), false);
  r.loop.pause();                       // double pause is fine
  r.loop.resume();
  assert.equal(r.loop.isRunning(), true);
  const before = r.beats.length;
  r.advance(100);                       // no jump from the paused time
  assert.equal(r.beats.length, before + 1);
  r.loop.stop();
  assert.equal(r.loop.isRunning(), false);
  r.loop.resume();                      // resume after stop does nothing
  assert.equal(r.loop.isRunning(), false);
});

test('start twice does not double the speed', () => {
  const r = rig();
  r.loop.start(); r.loop.start();
  r.advance(100);
  assert.equal(r.beats.length, 1);
});

test('errors in callbacks are caught and the loop keeps going', () => {
  let n = 0;
  const r = rig({ onBeat: () => { n++; throw new Error('boom'); }, onFrame: () => { throw new Error('frame'); } });
  r.loop.start();
  assert.doesNotThrow(() => { r.advance(100); r.advance(100); });
  assert.equal(n, 2);
  assert.equal(r.hasFrame(), true);
});

test('setBeatMs validates and changes speed', () => {
  const r = rig();
  r.loop.start();
  r.loop.setBeatMs(NaN); r.loop.setBeatMs(-4); r.loop.setBeatMs(0);   // ignored
  r.advance(100);
  assert.equal(r.beats.length, 1);
  r.loop.setBeatMs(50);
  r.advance(100);
  assert.equal(r.beats.length, 3);
  r.loop.setBeatMs(1);                                                  // clamped to 16 ms
  r.advance(32);
  assert.equal(r.beats.length, 5);
});

test('no callbacks at all is fine; bad beatMs falls back', () => {
  const r = rig({ onBeat: null, onFrame: null, beatMs: 'nope' });
  r.loop.start();
  assert.doesNotThrow(() => r.advance(1000));
});

test('time going backwards is harmless', () => {
  const r = rig();
  r.loop.start();
  r.advance(100);
  r.advance(-50);
  assert.ok(r.frames.at(-1)[0] >= 0);
});
