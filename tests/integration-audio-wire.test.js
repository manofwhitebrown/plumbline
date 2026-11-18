import test from 'node:test';
import assert from 'node:assert/strict';
import { bus } from '../src/core/bus.js';
import { audio } from '../src/audio/index.js';
import { wireAudio, unwireAudio, initOnFirstGesture } from '../src/audio/wire.js';
import { installFakeAudio } from './integration-helpers-fake-audio.js';

test('game events reach audio, and bad ones are harmless', () => {
  audio._reset();
  bus.clear();
  const fake = installFakeAudio();
  audio.init();
  wireAudio();
  const ctx = fake.last();
  const before = ctx.started.length;
  bus.emit('run:started', { view: { biomeId: 'quartz' } });
  assert.equal(audio._debug().parts.music.current(), 'quartz');
  bus.emit('run:events', {
    events: [{ t: 'COLLECT', lane: 0, item: { kind: 'gem', tier: 2, value: 3 }, gold: 3, combo: 1, r: 0, c: 0 }],
    view: { strain: 10, maxStrain: 100 },
  });
  assert.ok(ctx.started.length > before);
  assert.doesNotThrow(() => {
    bus.emit('run:events', null);
    bus.emit('run:events', {});
    bus.emit('run:started', null);
    bus.emit('run:ended', undefined);
    bus.emit('achievement:unlocked', { id: 'x' });
    bus.emit('codex:new', { id: 'y' });
  });
  assert.equal(audio._debug().strain01, 0);
  unwireAudio();
  const n = ctx.started.length;
  ctx.currentTime += 1;
  bus.emit('achievement:unlocked', {});
  assert.equal(ctx.started.length, n);
  fake.restore();
  audio._reset();
});

test('wiring twice does not double the sounds', () => {
  audio._reset();
  bus.clear();
  const fake = installFakeAudio();
  audio.init();
  wireAudio();
  wireAudio();
  const ctx = fake.last();
  const before = ctx.started.length;
  bus.emit('achievement:unlocked', {});
  const once = ctx.started.length - before;
  unwireAudio();
  wireAudio();
  ctx.currentTime += 1;
  const b2 = ctx.started.length;
  bus.emit('achievement:unlocked', {});
  assert.equal(ctx.started.length - b2, once);
  unwireAudio();
  fake.restore();
  audio._reset();
});

test('audio unlocks on the first tap only', () => {
  audio._reset();
  const fake = installFakeAudio();
  const listeners = {};
  const target = {
    addEventListener: (n, f) => (listeners[n] = f),
    removeEventListener: (n) => delete listeners[n],
  };
  initOnFirstGesture(target);
  assert.equal(fake.last(), null);
  listeners.pointerdown();
  assert.ok(fake.last());
  assert.equal(audio._debug().ready, true);
  assert.equal(Object.keys(listeners).length, 0);
  assert.equal(typeof initOnFirstGesture(null), 'function');
  fake.restore();
  audio._reset();
});
