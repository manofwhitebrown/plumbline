import test from 'node:test';
import assert from 'node:assert/strict';
import { createRenderer } from '../src/render/index.js';
import { EVENT_NAMES } from '../src/render/effects.js';
import { createScene } from '../src/render/scene.js';
import { createEffects } from '../src/render/effects.js';
import { createParticles } from '../src/render/particles.js';
import { createFloaters } from '../src/render/floaters.js';
import { createCamera } from '../src/render/camera.js';
import { createBucket } from '../src/render/bucket.js';
import { createRope } from '../src/render/rope.js';
import { createVignette } from '../src/render/vignette.js';
import { createQuality } from '../src/render/quality.js';
import { createPool } from '../src/render/pool.js';

// The CONTRACT event list (section 5).
const CONTRACT = ['RUN_START', 'BEAT', 'SPAWN', 'FIRE', 'CHAIN', 'COLLECT', 'MISS', 'HAZARD', 'STRAIN', 'BIOME', 'MILESTONE', 'SNAP', 'HAUL', 'RECORD'];

function setup() {
  const sc = createScene(), particles = createParticles(), floaters = createFloaters(), camera = createCamera();
  const bucket = createBucket(), rope = createRope(), vignette = createVignette();
  const well = { setBiome() {} };
  const fx = createEffects({ sc, particles, floaters, camera, rope, bucket, well, vignette });
  return { sc, particles, floaters, camera, bucket, rope, fx };
}

test('every contract event has a handler', () => {
  const { fx } = setup();
  for (const n of CONTRACT) { assert.ok(EVENT_NAMES.includes(n), n); assert.equal(typeof fx.handlers[n], 'function', n); }
});
test('events with missing or bad fields never throw', () => {
  const { fx } = setup();
  for (const n of CONTRACT) { fx.handle({ t: n }); fx.handle({ t: n, lane: NaN, r: 'x', c: null, item: null, from: null, to: 5, gold: Infinity, combo: -1, value: NaN, max: 0 }); }
  fx.handle(null); fx.handle(undefined); fx.handle({}); fx.handle({ t: 'NOPE' }); fx.handle(7);
});
test('spawn then collect schedules the item and later lands it', () => {
  const { sc, fx } = setup();
  fx.handle({ t: 'BEAT', i: 1, depth: 1, speed: 1 });
  fx.handle({ t: 'SPAWN', i: 1, lanes: [{ kind: 'gem', tier: 2, value: 3 }, { kind: 'empty' }, { kind: 'hazard', hazard: 'bat', tier: 1 }] });
  assert.equal(sc.items.live, 2);
  fx.handle({ t: 'COLLECT', lane: 0, item: { tier: 2 }, gold: 5, combo: 3, r: 2, c: 0 });
  const it = sc.items.items.find((o) => o.alive && o.lane === 0);
  assert.equal(it.out, 1);
});
test('snap and haul are one-shot', () => {
  const { sc, fx, camera } = setup();
  fx.handle({ t: 'SNAP' }); fx.handle({ t: 'SNAP' });
  assert.ok(sc.snapped);
  fx.handle({ t: 'RUN_START' });
  assert.ok(!sc.snapped);
  fx.handle({ t: 'HAUL' }); assert.ok(sc.hauled);
  camera.update(16); assert.ok(Math.abs(camera.x) <= 6 && Math.abs(camera.y) <= 6);
});
test('reduce motion: no shake and no slow motion', () => {
  const { sc, fx, camera } = setup();
  sc.reduceMotion = true; camera.reduceMotion = true;
  fx.handle({ t: 'SNAP' });
  assert.equal(sc.slowT, 0); assert.equal(sc.timeScale, 1);
  camera.update(16); assert.equal(camera.x, 0);
});
test('flashes are limited to 3 per second under reduce motion', () => {
  const { sc, fx } = setup();
  sc.reduceMotion = true; let shown = 0;
  for (let i = 0; i < 10; i++) { sc.flashA = 0; sc.time = i * 100; fx.handle({ t: 'RECORD' }); if (sc.flashA > 0) shown++; }
  assert.ok(shown <= 3, 'shown ' + shown);
});
test('camera shake is capped at 6 px', () => {
  const c = createCamera(); c.shake(100);
  let max = 0; for (let i = 0; i < 50; i++) { c.update(5); max = Math.max(max, Math.abs(c.x), Math.abs(c.y)); }
  assert.ok(max <= 6.01);
});
test('particles obey the 300 cap and pools do not grow', () => {
  const p = createParticles();
  for (let i = 0; i < 10000; i++) p.emit(0, 0, 0, 1, 1, 5000, 2, '#fff');
  assert.ok(p.count <= 300); assert.equal(p.pool.items.length, 300);
  p.setCap(100); p.clear(); for (let i = 0; i < 500; i++) p.emit(0, 0, 0, 1, 1, 5000, 2, '#fff'); assert.ok(p.count <= 100);
  const f = createFloaters(); for (let i = 0; i < 5000; i++) f.add('+1', 0, 0, 16, '#fff'); assert.equal(f.pool.items.length, 24);
  const q = createPool(5, () => ({})); for (let i = 0; i < 10000; i++) { const o = q.acquire(); if (i % 2) q.release(o); } assert.equal(q.items.length, 5);
});
test('vignette pulses only above 75% strain and speeds up', () => {
  const v = createVignette();
  v.setStrain(0.5); assert.equal(v.heartHz(), 0);
  v.setStrain(0.76); const a = v.heartHz(); v.setStrain(1); const b = v.heartHz();
  assert.ok(a >= 1.4 && b > a);
  v.setStrain(NaN); assert.equal(v.heartHz(), 0);
});
test('quality: hidden tab (huge dt) does not trigger low; user choice sticks', () => {
  const q = createQuality('high'); for (let i = 0; i < 20; i++) q.sample(5000); assert.equal(q.level, 'high');
  q.set('high', true); for (let i = 0; i < 300; i++) q.sample(40); assert.equal(q.level, 'high');
});
test('renderer survives a context-free canvas and bad input', () => {
  const r = createRenderer({ getContext: () => null }, { reduceMotion: true });
  r.resize(NaN, -5, 99); r.setRun(null, null); r.setRun({ depth: NaN }, { cols: 9, rows: 0, cells: 'x' });
  r.pushEvents(null); r.pushEvents([null, { t: 'SPAWN', lanes: 'bad' }]); r.frame(NaN, 5); r.frame(1e9, -1);
  const s = r.safeRect(); assert.ok(s.top === 88 && s.bottom >= s.top);
  r.setQuality('low'); r.destroy(); r.destroy(); r.frame(16, 0); r.pushEvents([{ t: 'SNAP' }]);
});
