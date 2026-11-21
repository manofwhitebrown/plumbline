import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuality, RECOVER, SLOW_WINDOW_MS } from '../src/render/quality.js';

const feed = (q, ms, totalMs) => { for (let t = 0; t < totalMs; t += ms) q.sample(ms); };
function slowDown(q) { feed(q, 40, SLOW_WINDOW_MS * 8); } // enough slow time to walk the whole ladder

test('quality: an automatic drop to low comes back after a long calm time', () => {
  const log = []; const q = createQuality('high', (l) => log.push(l));
  q.registerLayer('a', { importance: 1 }); q.registerLayer('b', { importance: 2 });
  slowDown(q); assert.equal(q.level, 'low');
  feed(q, 16, RECOVER.calmMs - 1000); assert.equal(q.level, 'low', 'not yet');
  feed(q, 16, 2000); assert.equal(q.level, 'high');
  assert.ok(q.layerState().every((l) => l.active), 'layers are back');
});
test('quality: a failed raise doubles the wait', () => {
  const q = createQuality('high'); q.registerLayer('a', { importance: 1 });
  slowDown(q); feed(q, 16, RECOVER.calmMs + 500); assert.equal(q.level, 'high');
  slowDown(q); assert.equal(q.level, 'low');
  feed(q, 16, RECOVER.calmMs + 500); assert.equal(q.level, 'low', 'twice as long now');
  feed(q, 16, RECOVER.calmMs); assert.equal(q.level, 'high');
});
test('quality: a hand-picked low never comes back by itself; junk and hidden-tab frames do nothing', () => {
  const q = createQuality('high'); q.set('low', true); feed(q, 16, RECOVER.calmMs * 3); assert.equal(q.level, 'low');
  const r = createQuality('high'); slowDown(r); r.sample(NaN); r.sample(900); feed(r, 16, 5000); assert.equal(r.level, 'low');
  const s = createQuality('high'); slowDown(s); s.setAuto(); assert.equal(s.level, 'high');
});
