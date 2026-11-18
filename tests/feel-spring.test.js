import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSpring, createSpring2, createColorSpring, smoothDamp, damp, smoothstep, clamp01 } from '../src/feel/spring.js';

function run(s, target, ms, step) { const n = Math.round(ms / step); for (let i = 0; i < n; i++) s.update(target, ms / n); return s; }

test('spring settles on the target and never overshoots', () => {
  const s = createSpring(0, 150);
  let max = 0;
  for (let i = 0; i < 400; i++) { s.update(10, 16); max = Math.max(max, s.value); }
  assert.ok(Math.abs(s.value - 10) < 0.01);
  assert.ok(max <= 10 + 1e-9);
  assert.equal(s.settled(0.02), true);
});

test('spring never overshoots going down either', () => {
  const s = createSpring(5, 100);
  let min = 5;
  for (let i = 0; i < 400; i++) { s.update(-3, 16); min = Math.min(min, s.value); }
  assert.ok(min >= -3 - 1e-9);
});

test('frame-rate independent: 30, 60 and 144 fps land together', () => {
  const vals = [33.3333, 16.6667, 6.9444].map((step) => run(createSpring(0, 200), 1, 300, step).value);
  assert.ok(Math.max(...vals) - Math.min(...vals) < 0.03, JSON.stringify(vals));
});

test('one huge dt does not explode', () => {
  const s = createSpring(0, 100);
  s.update(5, 1e9);
  assert.ok(Number.isFinite(s.value) && s.value <= 5 && s.value > 2.5); // dt is capped at 250 ms
  s.update(5, -50); s.update(5, NaN);
  assert.ok(Number.isFinite(s.value));
});

test('bad input is ignored', () => {
  const s = createSpring(NaN, NaN);
  assert.equal(s.value, 0);
  s.update(undefined, 16); s.update('x', 16); s.update(Infinity, 16);
  assert.ok(Number.isFinite(s.value) && Number.isFinite(s.vel));
  assert.equal(smoothstep(NaN, 1, 0.5), 0);
  assert.equal(clamp01(NaN), 0);
  assert.equal(Number.isFinite(damp(NaN, NaN, NaN, NaN)), true);
});

test('maxSpeed caps velocity', () => {
  const s = createSpring(0, 20, { maxSpeed: 5 });
  s.update(1000, 16);
  assert.ok(Math.abs(s.vel) <= 5 + 1e-9);
});

test('vectors and colours follow and stay in range', () => {
  const v = createSpring2(0, 0, 100);
  for (let i = 0; i < 100; i++) v.update(4, -2, 16);
  assert.ok(Math.abs(v.x - 4) < 0.05 && Math.abs(v.y + 2) < 0.05);
  const c = createColorSpring(0, 0, 0, 100);
  for (let i = 0; i < 100; i++) c.update(400, -50, 128, 16);
  assert.ok(c.r <= 255 && c.g >= 0);
  assert.match(c.toCss(), /^rgb\(\d+,\d+,\d+\)$/);
});

test('smoothDamp writes into the out object', () => {
  const out = { value: 0, vel: 0 };
  const r = smoothDamp(0, 1, 0, 100, 16, out);
  assert.equal(r, out);
  assert.ok(out.value > 0 && out.value < 1);
});

test('damp moves toward the target', () => {
  assert.ok(damp(0, 1, 10, 100) > 0.5);
  assert.equal(damp(2, 2, 10, 100), 2);
});
