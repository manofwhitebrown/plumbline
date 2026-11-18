import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { runSteps, callInit } from '../src/core/boot.js';
import { installGlobalErrorHandlers, _resetErrors } from '../src/core/errors.js';
import { wireSenses } from '../src/core/wiring.js';
import { bus } from '../src/core/bus.js';
import { log } from '../src/core/log.js';

beforeEach(() => { bus.clear(); log.clear(); _resetErrors(); });

test('boot: steps run in order; a failing step is skipped', async () => {
  const order = [];
  const r = await runSteps([
    { name: 'a', run: async () => { order.push('a'); } },
    { name: 'b', run: () => { throw new Error('x'); } },
    { name: 'c', run: () => { order.push('c'); } },
    null,
    { name: 'bad' }
  ]);
  assert.deepEqual(order, ['a', 'c']);
  assert.deepEqual(r, { ok: false, failed: ['b'], fatal: null });
});

test('boot: a critical failure stops everything', async () => {
  const order = [];
  const r = await runSteps([
    { name: 'ui', critical: true, run: () => { throw new Error('no'); } },
    { name: 'after', run: () => order.push('after') }
  ]);
  assert.equal(r.ok, false);
  assert.equal(r.fatal, 'ui');
  assert.deepEqual(order, []);
  assert.deepEqual(await runSteps(null), { ok: true, failed: [], fatal: null });
});

test('callInit: calls init when present, never throws', async () => {
  let n = 0;
  assert.equal(await callInit({ init: () => n++ }, 'm'), true);
  assert.equal(await callInit({ default: { init() { n++; } } }, 'm'), true);
  assert.equal(await callInit({}, 'm'), false);
  assert.equal(await callInit(null, 'm'), false);
  assert.equal(await callInit({ init() { throw new Error('boom'); } }, 'm'), false);
  assert.equal(n, 2);
});

function fakeWindow() {
  const h = {};
  return { h, addEventListener: (n, f) => { h[n] = f; }, removeEventListener: (n) => { delete h[n]; } };
}

test('errors: shows a friendly message, rate limits, ignores noise', () => {
  const w = fakeWindow();
  let t = 0; const shown = [];
  const off = installGlobalErrorHandlers(w, { notify: (m) => shown.push(m), now: () => t });
  w.h.error({ error: new Error('boom'), message: 'boom' });
  w.h.error({ error: new Error('again') });            // too soon
  w.h.error({});                                      // a broken image: ignored
  w.h.error({ message: 'ResizeObserver loop limit exceeded' });
  assert.equal(shown.length, 1);
  assert.ok(!/undefined|null|NaN|Error/.test(shown[0]));
  t += 6000;
  w.h.unhandledrejection({ reason: 'nope' });
  w.h.unhandledrejection({ reason: undefined });
  assert.equal(shown.length, 2);
  assert.ok(log.recent().filter((l) => l.level === 'error').length >= 3);
  off();
  assert.equal(w.h.error, undefined);
});

test('errors: a throwing notify never escapes; bad target is safe', () => {
  const w = fakeWindow();
  installGlobalErrorHandlers(w, { notify: () => { throw new Error('ui broke'); } });
  assert.doesNotThrow(() => w.h.error({ error: new Error('x') }));
  assert.equal(typeof installGlobalErrorHandlers(null), 'function');
});

test('wiring: events go to audio and buzz; strain is a fraction', () => {
  const audioCalls = [], buzzes = [];
  const audio = { onEvents: (e, v) => audioCalls.push(['events', e.length]), setBiome: (id) => audioCalls.push(['biome', id]), setStrain: (v) => audioCalls.push(['strain', v]) };
  const off = wireSenses({ bus, audio, buzz: (k) => buzzes.push(k) });
  bus.emit('run:started', { view: { biomeId: 'clay' } });
  bus.emit('run:events', { events: [{ t: 'COLLECT' }, { t: 'BIOME', id: 'quartz' }, { t: 'STRAIN', value: 80, max: 100 }, { t: 'SNAP' }, { t: 'RECORD' }], view: { strain: 50, maxStrain: 100 } });
  assert.deepEqual(buzzes, ['collect', 'warn', 'snap', 'record']);
  assert.deepEqual(audioCalls.find((c) => c[0] === 'biome' && c[1] === 'quartz'), ['biome', 'quartz']);
  assert.ok(audioCalls.some((c) => c[0] === 'strain' && c[1] === 0.5));
  bus.emit('run:events', { events: 'nope' });         // bad payloads are ignored
  bus.emit('run:events');
  off();
  const before = buzzes.length;
  bus.emit('run:events', { events: [{ t: 'COLLECT' }] });
  assert.equal(buzzes.length, before);
});

test('wiring: a broken audio module cannot break the run', () => {
  const audio = { onEvents() { throw new Error('audio'); }, setBiome() {}, setStrain() {} };
  wireSenses({ bus, audio, buzz() {} });
  assert.doesNotThrow(() => bus.emit('run:events', { events: [{ t: 'COLLECT' }], view: {} }));
});
