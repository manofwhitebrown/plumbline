import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { setCanvasFactory } from '../src/render/canvasUtil.js';
import { homeLayout, crewSlots, fireflyAt, MAX_CREW } from '../src/render/art/homeArt.js';
import { createHomeScene, FIREFLIES } from '../src/render/homeScene.js';
import { createQuality, SLOW_MS, SLOW_WINDOW_MS } from '../src/render/quality.js';

test('home layout: well is inside the screen and below the horizon, for phone and laptop sizes', () => {
  for (const [w, h] of [[360, 640], [430, 932], [480, 900], [320, 568]]) {
    const L = homeLayout(w, h);
    assert.ok(L.wellCx - L.wellRx > 0 && L.wellCx + L.wellRx < w, 'well fits ' + w);
    assert.ok(L.wellCy > L.horizon && L.wellCy < h * 0.9 && L.beamY > 0 && L.crewY < h);
  }
  assert.ok(Number.isFinite(homeLayout(NaN, undefined).w)); // junk in, sane layout out
});
test('crew grows with the count, is capped at 8, is deterministic and stays on screen', () => {
  const L = homeLayout(360, 640);
  assert.equal(crewSlots(0, L).length, 0); assert.equal(crewSlots(3, L).length, 3); assert.equal(crewSlots(99, L).length, MAX_CREW); assert.equal(crewSlots(-4, L).length, 0);
  assert.deepEqual(crewSlots(5, L), crewSlots(5, L));
  for (const s of crewSlots(8, L)) assert.ok(s.x > 0 && s.x < 360, 'crew inside: ' + s.x);
  assert.deepEqual(crewSlots(3, L).map((s) => s.x), crewSlots(8, L).slice(0, 3).map((s) => s.x), 'adding crew never moves the existing ones');
});
test('fireflies drift slowly inside the scene and twinkle gently', () => {
  const L = homeLayout(360, 640), o = { x: 0, y: 0, a: 0 };
  for (let i = 0; i < FIREFLIES.high; i++) for (let t = 0; t < 60; t += 1.3) { fireflyAt(i, t, L, o); assert.ok(o.x > -30 && o.x < 390 && o.y > 0 && o.y < L.wellCy + 20 && o.a >= -0.05 && o.a <= 0.75); }
  const a = fireflyAt(2, 3, L, { x: 0, y: 0, a: 0 }), b = fireflyAt(2, 3, L, { x: 0, y: 0, a: 0 }); assert.deepEqual(a, b);
});
test('home scene is safe without a canvas or document, and destroy frees layers', () => {
  setCanvasFactory(() => null);
  const s = createHomeScene({ crew: 2 }); s.resize(360, 640, 2); s.setCrew(5); s.setQuality('low'); s.setReduceMotion(true); s.start(); s.frame(0.5);
  assert.equal(s.crew, 5); assert.equal(s.memoryBytes(), 0); s.destroy(); s.resize(100, 100, 1); // no throw after destroy
});
test('home scene draws with a canvas, stays under 8 MB at dpr 2, low uses less', () => {
  setCanvasFactory((w, h) => createCanvas(w, h)); globalThis.document = { createElement: () => createCanvas(10, 10) };
  try {
    const hi = createHomeScene({ crew: 4 }); hi.resize(430, 932, 2); hi.frame(1.2);
    const lo = createHomeScene({ crew: 4, quality: 'low' }); lo.resize(430, 932, 2); lo.frame(1.2);
    assert.ok(hi.memoryBytes() < 8 * 1024 * 1024, 'memory ' + hi.memoryBytes()); assert.ok(lo.memoryBytes() < hi.memoryBytes());
    assert.ok(hi.canvas.toBuffer('image/png').length > 5000, 'something was painted');
    hi.destroy(); assert.equal(hi.memoryBytes(), 0); lo.destroy();
  } finally { delete globalThis.document; }
});
test('quality: layers go off one at a time, least important first, then low; user high restores all', () => {
  const log = []; let lvl = null; const q = createQuality('high', (l) => { lvl = l; });
  q.registerLayer('b-trim', { importance: 2, cost: 5, off: () => log.push('off b'), on: () => log.push('on b') });
  q.registerLayer('a-extras', { importance: 1, cost: 3, off: () => log.push('off a'), on: () => log.push('on a') });
  q.registerLayer('c-thrower', { importance: 3, cost: 1, off: () => { throw new Error('bad layer'); } });
  const slowWindow = () => { for (let ms = 0; ms <= SLOW_WINDOW_MS + 100; ms += SLOW_MS + 4) q.sample(SLOW_MS + 4); };
  slowWindow(); assert.deepEqual(log, ['off a']); assert.equal(q.level, 'high');
  slowWindow(); assert.deepEqual(log, ['off a', 'off b']);
  slowWindow(); assert.equal(q.level, 'high', 'a throwing layer is still counted as off, never breaks the loop');
  slowWindow(); assert.equal(q.level, 'low'); assert.equal(lvl, 'low');
  q.set('high', true); assert.equal(q.level, 'high'); assert.ok(log.includes('on a') && log.includes('on b'));
  assert.ok(q.layerState().every((l) => l.active));
});
test('quality: without layers it behaves as before (low after 2 s), fast frames and hidden tabs never downgrade', () => {
  const q = createQuality('high'); for (let i = 0; i < 400; i++) q.sample(16); assert.equal(q.level, 'high');
  for (let i = 0; i < 20; i++) q.sample(1000); assert.equal(q.level, 'high', 'hidden-tab frames are ignored');
  for (let i = 0; i < 100; i++) q.sample(30); assert.equal(q.level, 'low');
  const locked = createQuality('high'); locked.set('high', true); for (let i = 0; i < 200; i++) locked.sample(40); assert.equal(locked.level, 'high', 'a player choice is never overridden');
});
