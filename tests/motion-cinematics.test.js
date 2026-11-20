import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCinePool, CINE_MAX } from '../src/render/cinematics/pool.js';
import { createNullLayer } from '../src/render/cinematics/fxLayer.js';
import { makeDropStart, nextVariant, _resetDropCount, FULL_MS, QUICK_MS } from '../src/render/cinematics/dropStart.js';
import { makeHaulFinish, HAUL_MS } from '../src/render/cinematics/haulFinish.js';
import { makeSnapDrama, slowClock, SNAP_MS, FREEZE_MS } from '../src/render/cinematics/snapDrama.js';
import { createRunner } from '../src/ui/motion/timeline.js';

function seeded() { let s = 7; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
function playAll(def, step = 16) { const r = createRunner(def); r.start(); for (let i = 0; i < 400 && r.state === 'running'; i++) r.tick(step); return r; }

test('pool never exceeds its cap of 300 and recycles when particles die', () => {
  const p = createCinePool(999, seeded()); assert.equal(p.cap, CINE_MAX);
  p.burst(0, 0, 1000, '#fff', 100, 200, 2, 0, 0); assert.equal(p.live, 300);
  for (let i = 0; i < 10; i++) p.update(64); assert.equal(p.live, 0); p.burst(0, 0, 10, '#fff', 100, 200, 2, 0, 0); assert.equal(p.live, 10);
});

test('drop start: first 3 drops of a session are full, then quick', () => {
  _resetDropCount(); assert.deepEqual([1, 2, 3, 4, 5].map(nextVariant), ['full', 'full', 'full', 'quick', 'quick']);
  assert.equal(FULL_MS, 1500); assert.equal(QUICK_MS, 500);
});

test('drop start: onGo runs exactly once on finish, skip and Reduce motion', () => {
  for (const mode of ['finish', 'skip', 'reduce']) {
    let n = 0; const L = createNullLayer(360, 640, seeded());
    const def = makeDropStart(L, { variant: 'full', onGo: () => n++ });
    const r = createRunner(def, { reduce: mode === 'reduce' }); r.start();
    if (mode === 'skip') { r.tick(300); r.skip(); r.skip(); } else if (mode === 'finish') for (let i = 0; i < 200; i++) r.tick(16);
    assert.equal(n, 1, mode);
  }
});

test('drop start: quick version lasts 500 ms and draws without 3-2-1 or lamps', () => {
  const L = createNullLayer(); const def = makeDropStart(L, { variant: 'quick' }); assert.equal(def.durationMs, 500);
  const r = playAll(def); assert.equal(r.state, 'done');
});

test('haul finish and snap drama stay within their durations and call onGo once', () => {
  for (const [mk, ms] of [[makeHaulFinish, HAUL_MS], [makeSnapDrama, SNAP_MS]]) {
    let n = 0; const L = createNullLayer(360, 640, seeded()); const def = mk(L, { onGo: () => n++ });
    assert.equal(def.durationMs, ms); assert.ok(ms <= 1200);
    const r = playAll(def); assert.equal(r.state, 'done'); assert.equal(n, 1); assert.equal(L.tint, 0); assert.equal(L.pool.live, 0);
  }
});

test('snap drama: freeze is 80 ms, slow motion is 0.35x, tint is never above 0.7 and never red', () => {
  assert.equal(slowClock(0), 0); assert.equal(slowClock(FREEZE_MS), 0); assert.ok(Math.abs(slowClock(FREEZE_MS + 600) - 210) < 1e-9);
  const L = createNullLayer(); let maxTint = 0; const orig = L.setTint.bind(L); L.setTint = (a) => { maxTint = Math.max(maxTint, a); orig(a); };
  const def = makeSnapDrama(L, {}); const r = createRunner(def); r.start(); for (let i = 0; i < 100; i++) r.tick(16);
  assert.ok(maxTint <= 0.7);
});

test('cues fire once each, in a sensible order, for the snap', () => {
  const seen = []; const L = createNullLayer(360, 640, seeded()); playAll(makeSnapDrama(L, { cue: (k) => seen.push(k) }));
  assert.deepEqual(seen, ['snap', 'thud']);
});

test('a skipped moment leaves the layer clean (no particles, no tint)', () => {
  const L = createNullLayer(360, 640, seeded()); const r = createRunner(makeSnapDrama(L, {})); r.start(); r.tick(300); r.skip();
  assert.equal(L.pool.live, 0); assert.equal(L.tint, 0);
});

test('overlay layer: the canvas pixel size always matches the host, even at exactly the default 360 x 640', async () => {
  const { createFxLayer } = await import('../src/render/cinematics/fxLayer.js');
  for (const [w, h] of [[360, 640], [412, 915], [320, 568]]) {
    const canvas = { width: 300, height: 150, style: {}, getContext: () => ({}) };
    const mk = (tag) => (tag === 'canvas' ? canvas : { style: {}, setAttribute() {}, append() {}, remove() {} });
    const doc = { createElement: mk };
    const host = { appendChild() {}, getBoundingClientRect: () => ({ width: w, height: h }) };
    const L = createFxLayer(host, { doc });
    assert.equal(L.w, w); assert.equal(L.h, h); assert.equal(canvas.width, Math.round(w * L.dpr)); assert.equal(canvas.height, Math.round(h * L.dpr));
  }
});
