import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFS, ALL_KEYS } from '../src/render/models/defs.js';
import { bakeFrameNow, hashPixels } from '../src/render/models/bake.js';
import { planBake, sliceBudgetMs, MAX_ATLAS_BYTES } from '../src/render/models/plan.js';
import { gridFor, createAtlas } from '../src/render/models/atlas.js';
import { createModels } from '../src/render/models/index.js';
import { models as shared } from '../src/render/models/index.js';

// a tiny fake canvas so tests need no real canvas library
function fakeCanvas(w, h) {
  const data = new Uint8ClampedArray(w * h * 4);
  return { width: w, height: h, getContext: () => ({ createImageData: (a, b) => ({ data: new Uint8ClampedArray(a * b * 4), width: a, height: b }), putImageData: (img, x, y) => { data[0] = img.data[3]; }, }) };
}

test('every model builds under 400 triangles with outward-facing convex gems', () => {
  for (const k of ALL_KEYS) {
    const d = DEFS[k], m = d.build(1, d.size === 'bucket' ? { aspect: 1.2, tilt: d.tilt, part: d.part } : undefined);
    assert.ok(m.triCount > 0 && m.triCount < 400, `${k} has ${m.triCount}`);
    assert.ok(Number.isFinite(m.radius) && m.radius > 0.3);
  }
});
test('same seed gives the same pixels, a different seed gives different ones', () => {
  const d = DEFS.ore, a = bakeFrameNow(d, d.build(3), 40, 40, 2, 2, d.frames), b = bakeFrameNow(d, d.build(3), 40, 40, 2, 2, d.frames), c = bakeFrameNow(d, d.build(4), 40, 40, 2, 2, d.frames);
  assert.equal(hashPixels(a), hashPixels(b)); assert.notEqual(hashPixels(a), hashPixels(c));
});
test('every gem tier has pixels, a clear edge and its own silhouette', () => {
  const sil = [];
  for (let t = 1; t <= 6; t++) {
    const d = DEFS['gem:' + t], px = bakeFrameNow(d, d.build(1), 48, 48, 2, 0, d.frames);
    let solid = 0, w = 0; const cols = new Set();
    for (let i = 0; i < 48 * 48; i++) if (px[i * 4 + 3] > 200) { solid++; cols.add(i % 48); }
    assert.ok(solid > 400, `tier ${t} too small`);
    sil.push(solid + ':' + cols.size);
  }
  assert.equal(new Set(sil).size, 6);
});
test('sprites never touch the border (no clipping)', () => {
  for (const k of ALL_KEYS.filter((k) => DEFS[k].size === 'item')) {
    const d = DEFS[k], px = bakeFrameNow(d, d.build(1), 40, 40, 2, 1, d.frames);
    for (let i = 0; i < 40; i++) for (const j of [0, 39]) { assert.ok(px[(j * 40 + i) * 4 + 3] < 40, k + ' top/bottom'); assert.ok(px[(i * 40 + j) * 4 + 3] < 40, k + ' sides'); }
  }
});
test('hazard rock has a warm rim (red channel beats blue near its edge)', () => {
  const d = DEFS['hazard:rock'], px = bakeFrameNow(d, d.build(1), 64, 64, 2, 0, d.frames); let r = 0, b = 0;
  for (let i = 0; i < 64 * 64; i++) if (px[i * 4 + 3] > 100) { r += px[i * 4]; b += px[i * 4 + 2]; }
  assert.ok(r > b);
});
test('plan stays inside the memory budget and low quality is smaller', () => {
  const hi = planBake(ALL_KEYS, 82, 'high', { w: 544, h: 464 }), lo = planBake(ALL_KEYS, 82, 'low', { w: 544, h: 464 });
  assert.ok(hi.bytes <= MAX_ATLAS_BYTES); assert.ok(lo.bytes < hi.bytes);
  const huge = planBake(ALL_KEYS, 300, 'high', { w: 900, h: 800 }); assert.ok(huge.bytes <= MAX_ATLAS_BYTES);
});
test('slice budget backs off when the game is slow', () => {
  assert.ok(sliceBudgetMs(30) < sliceBudgetMs(16)); assert.ok(sliceBudgetMs(16) <= 6); assert.ok(sliceBudgetMs(NaN) > 0);
});
test('atlas grid packs sprites without overlap', () => {
  const g = gridFor(82, 82, 100); assert.ok(g && g.cols * g.rowsTotal >= 100);
  const a = createAtlas(2048, fakeCanvas); a.declare(30, 30, 50); const seen = new Set();
  for (let i = 0; i < 50; i++) { const s = a.reserve(30, 30); assert.ok(s); const k = s.page === s.page && s.x + ',' + s.y; assert.ok(!seen.has(k)); seen.add(k); }
  assert.equal(a.reserve(30, 30), null);
});
test('registry bakes in slices, wraps frame numbers and returns null before ready', () => {
  const m = createModels({ auto: false, makeCanvas: fakeCanvas });
  assert.equal(m.bake(['gem:1', 'ore'], 40, 'high'), true);
  assert.equal(m.getSprite('gem:1', 0), null); assert.equal(m.ready(), false);
  let guard = 0; while (m.step(2) > 0 && guard++ < 5000);
  assert.equal(m.ready(), true); assert.ok(m.getSprite('gem:1', 0).w === 40);
  assert.equal(m.getSprite('gem:1', 0), m.getSprite('gem:1', m.frameCount('gem:1')));
  m.setEnabled(false); assert.equal(m.getSprite('gem:1', 0), null); assert.equal(m.ready(), false);
});
test('missing canvas API means null sprites and no throw', () => {
  const m = createModels({ auto: false, makeCanvas: () => null });
  assert.equal(m.bake(null, 40), false); assert.equal(m.getSprite('gem:1', 0), null); assert.equal(m.ready(), false); assert.equal(m.step(5), 0);
  assert.equal(shared.getSprite('nope', 1), null);
});
