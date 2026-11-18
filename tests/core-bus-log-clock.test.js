import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { bus } from '../src/core/bus.js';
import { log } from '../src/core/log.js';
import { now, elapsedSince, setTimeSource } from '../src/core/clock.js';

beforeEach(() => { bus.clear(); log.clear(); setTimeSource(null); });

test('bus: on, emit, off', () => {
  const seen = [];
  const off = bus.on('x', (p) => seen.push(p));
  bus.emit('x', 1);
  off();
  off(); // double off is fine
  bus.emit('x', 2);
  assert.deepEqual(seen, [1]);
});

test('bus: a throwing handler does not stop others or reach the emitter', () => {
  const seen = [];
  bus.on('x', () => { throw new Error('boom'); });
  bus.on('x', (p) => seen.push(p));
  assert.doesNotThrow(() => bus.emit('x', 5));
  assert.deepEqual(seen, [5]);
  assert.ok(log.recent().some((l) => l.level === 'error'));
});

test('bus: handlers may remove themselves while emitting; bad input is safe', () => {
  let n = 0;
  const off = bus.on('y', () => { n++; off(); });
  bus.on('y', () => { n++; });
  bus.emit('y');
  bus.emit('y');
  assert.equal(n, 3);
  assert.equal(typeof bus.on(null, null), 'function');
  assert.doesNotThrow(() => bus.emit('nobody'));
});

test('log: ring buffer keeps 200', () => {
  for (let i = 0; i < 250; i++) log.warn('line', i);
  const r = log.recent();
  assert.equal(r.length, 200);
  assert.ok(r[199].msg.endsWith('249'));
  assert.doesNotThrow(() => log.error({ circular: (() => { const o = {}; o.o = o; return o; })() }));
});

test('clock: never negative, capped, survives a clock that goes back', () => {
  let t = 1_000_000;
  setTimeSource(() => t);
  assert.equal(now(), 1_000_000);
  t = 1_005_000;
  assert.equal(elapsedSince(1_000_000), 5000);
  assert.equal(elapsedSince(1_000_000, 2000), 2000);
  assert.equal(elapsedSince(2_000_000), 0);       // future stamp
  assert.equal(elapsedSince(NaN), 0);
  assert.equal(elapsedSince('abc'), 0);
  t = 500_000;                                    // clock set back by a lot
  assert.ok(now() >= 1_005_000);
  t = 500_100;                                    // time keeps flowing forward
  assert.equal(now(), 1_005_100);
  setTimeSource(() => NaN);
  assert.ok(Number.isFinite(now()));
});
