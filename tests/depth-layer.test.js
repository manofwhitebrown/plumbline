import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDepth } from '../src/render/depth/index.js';
import { CAM, LIGHT } from '../src/render/depth/constants.js';
import { makeFake, laneState } from './depth-fakes.js';

function warm(d, st, n = 200) { for (let i = 0; i < n; i++) { st.time += 16; d.update(16, st); } }
function make(opts) { const f = makeFake(); const d = createDepth({ govern: false, makeCanvas: f.mk, ...(opts || {}) }); d.resize(360, 640, 1); return { f, d }; }

test('draws once textures are ready, and the quality ladder changes the work', () => {
  const counts = {};
  for (const q of ['high', 'medium', 'low']) {
    const { f, d } = make({ quality: q }); const st = laneState(); warm(d, st);
    f.stats.drawImage = 0;
    const drew = d.drawWalls(f.ctx, st); d.drawForeground(f.ctx, st);
    counts[q] = { drew, calls: f.stats.drawImage, slices: d.debug().slices, blur: d.debug().blur };
  }
  assert.equal(counts.low.drew, false); assert.equal(counts.low.calls, 0, 'low draws nothing: the flat well stays');
  assert.equal(counts.high.drew, true); assert.equal(counts.medium.drew, true);
  assert.ok(counts.high.slices > counts.medium.slices, 'medium has fewer slices');
  assert.ok(counts.high.calls > counts.medium.calls);
  assert.equal(counts.high.blur, true); assert.equal(counts.medium.blur, false, 'no motion blur on medium');
});

test('setQuality switches live and Reduce motion falls back to the flat well', () => {
  const { f, d } = make({ quality: 'high' }); const st = laneState(); warm(d, st);
  assert.equal(d.drawWalls(f.ctx, st), true);
  d.setQuality('low'); assert.equal(d.drawWalls(f.ctx, st), false); assert.equal(d.active, false);
  d.setQuality('medium'); warm(d, st, 5); assert.equal(d.drawWalls(f.ctx, st), true);
  d.setQuality('nonsense'); assert.equal(d.debug().level, 'high');
  d.setReduceMotion(true); assert.equal(d.drawWalls(f.ctx, st), false); assert.equal(d.drawForeground(f.ctx, st), false);
  d.setReduceMotion(false); warm(d, st, 40); assert.equal(d.drawWalls(f.ctx, st), true);
});

test('hostile or missing state never throws', () => {
  const { f, d } = make({ quality: 'high' });
  const bad = [undefined, null, 5, 'x', [], {}, { depth: NaN, biomeId: 42, lanes: 'no', bucket: null }, { depth: Infinity, strain01: -Infinity, lanes: [NaN, NaN], laneCount: NaN, w: 0, h: -1 },
    { depth: 1e300, biomeId: 'nope', bucket: { y: NaN }, arriveY: NaN, danger: 'hot' }, laneState({ depth: -50 }), laneState({ biomeId: 'void', depth: 3 })];
  for (let i = 0; i < 300; i++) {
    const s = bad[i % bad.length];
    assert.doesNotThrow(() => { d.update(i % 7 === 0 ? NaN : 16, s); d.drawWalls(f.ctx, s); d.drawForeground(f.ctx, s); });
  }
  for (const e of [null, 3, {}, { t: 'COLLECT' }, { t: 'COLLECT', item: { tier: NaN }, lane: Infinity }, { t: 'HAZARD', strainDelta: NaN }, 'x']) assert.doesNotThrow(() => d.pushEvents([e]));
  assert.doesNotThrow(() => { d.pushEvents(null); d.pushEvents('x'); d.resize(NaN, NaN, NaN); d.resize(0, 0, 0); d.drawWalls(null, laneState()); d.drawForeground(undefined, laneState()); });
  d.destroy(); assert.doesNotThrow(() => { d.update(16, laneState()); d.drawWalls(f.ctx, laneState()); d.setQuality('high'); d.pushEvents([{ t: 'COLLECT' }]); });
});

test('works with no canvas support at all (nothing draws, nothing breaks)', () => {
  const d = createDepth({ quality: 'high', makeCanvas: () => null }); d.resize(360, 640, 1); const st = laneState();
  for (let i = 0; i < 60; i++) { d.update(16, st); assert.equal(d.drawWalls(makeFake().ctx, st), false); }
  assert.equal(d.active, false);
});

test('camera stays inside 6 px, 1.5 degrees and 3 percent under a storm of events, and is zero with Reduce motion', () => {
  const { d } = make({ quality: 'high' }); const st = laneState({ strain01: 1 }); warm(d, st, 20);
  let worst = { dx: 0, dy: 0, roll: 0, zoom: 1 };
  for (let i = 0; i < 2000; i++) {
    d.pushEvents([{ t: 'HAZARD', lane: i, strainDelta: 12 }, { t: 'COLLECT', lane: i % 5, item: { tier: 6 } }, { t: 'SNAP' }, { t: 'MILESTONE' }]);
    st.time += 16; st.strain01 = (i % 50) / 50; d.update(16, st);
    const c = d.debug().cam;
    worst.dx = Math.max(worst.dx, Math.abs(c.dx)); worst.dy = Math.max(worst.dy, Math.abs(c.dy)); worst.roll = Math.max(worst.roll, Math.abs(c.roll)); worst.zoom = Math.max(worst.zoom, c.zoom);
  }
  assert.ok(worst.dx <= CAM.shakePx && worst.dy <= CAM.shakePx, JSON.stringify(worst));
  assert.ok(worst.roll <= CAM.rollDeg && worst.zoom <= CAM.zoomMax);
  assert.ok(worst.dx > 0.5, 'the camera does move');
  d.setReduceMotion(true); d.update(16, st); const c = d.debug().cam; assert.deepEqual([c.dx, c.dy, c.roll, c.zoom], [0, 0, 0, 1]);
});

test('zero growth in pools and canvases over 10,000 updates and draws', () => {
  const { f, d } = make({ quality: 'high' }); const st = laneState(); warm(d, st, 400);
  const cap0 = d.debug().pool.cap, canv0 = f.stats.canvases;
  for (let i = 0; i < 10000; i++) {
    st.depth += 0.04; st.time += 16; st.strain01 = 0.5 + 0.5 * Math.sin(i / 90);
    if (i % 3 === 0) d.pushEvents([{ t: 'COLLECT', lane: i % 5, item: { tier: 1 + (i % 6) } }]);
    d.update(16, st); if (i % 2 === 0) { d.drawWalls(f.ctx, st); d.drawForeground(f.ctx, st); }
    const p = d.debug().pool; assert.ok(p.live <= p.cap);
  }
  const dbg = d.debug();
  assert.equal(dbg.pool.cap, cap0); assert.equal(dbg.pool.cap, LIGHT.pulseSlots);
  // moving 400 m crosses biome edges, so a few new textures may be built, but only a bounded handful: nothing per frame
  assert.ok(f.stats.canvases - canv0 < 80, `canvases grew by ${f.stats.canvases - canv0}`);
});

test('the layer steps down on its own when it is over budget, and only when governed', () => {
  let t = 0; const f = makeFake();
  const slow = () => { t += 9; return t; }; // every now() call costs 9 ms: far over budget
  const d = createDepth({ quality: 'high', makeCanvas: f.mk, now: slow }); d.resize(360, 640, 1); const st = laneState();
  for (let i = 0; i < 700; i++) { st.time += 16; d.update(16, st); d.drawWalls(f.ctx, st); d.drawForeground(f.ctx, st); }
  assert.equal(d.debug().level, 'low'); assert.equal(d.debug().demoted, true);
  const f2 = makeFake(); let t2 = 0;
  const d2 = createDepth({ quality: 'high', govern: false, makeCanvas: f2.mk, now: () => (t2 += 9) }); d2.resize(360, 640, 1);
  for (let i = 0; i < 700; i++) { st.time += 16; d2.update(16, st); d2.drawWalls(f2.ctx, st); }
  assert.equal(d2.debug().level, 'high');
});

test('a forced biome (cheat) off its depth still draws that biome without door rings', () => {
  const { f, d } = make({ quality: 'high' }); const st = laneState({ depth: 10, biomeId: 'magma' }); warm(d, st, 300);
  assert.equal(d.debug().forced, 3); assert.equal(d.drawWalls(f.ctx, st), true);
});

test('an injected wallTexture from the art kit is used when it returns a canvas', () => {
  const f = makeFake(); let asked = 0;
  const d = createDepth({ govern: false, makeCanvas: f.mk, wallTexture: (id, layer) => { asked++; return { width: 128, height: 256 }; } });
  d.resize(360, 640, 1); const st = laneState(); warm(d, st, 30);
  assert.ok(asked >= 1); assert.equal(d.drawWalls(f.ctx, st), true);
  const d2 = createDepth({ govern: false, makeCanvas: f.mk, wallTexture: () => { throw new Error('boom'); } }); d2.resize(360, 640, 1); warm(d2, st, 400); assert.equal(d2.drawWalls(f.ctx, st), true, 'a broken art function falls back to the built-in texture');
});
