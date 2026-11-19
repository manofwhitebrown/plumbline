import test from 'node:test';
import assert from 'node:assert/strict';
import { setCanvasFactory } from '../src/render/canvasUtil.js';
import { paintGemModel, paintGlint, gemFrames, GEMS } from '../src/render/art/gemModels.js';
import { paintOreModel, paintRelicModel } from '../src/render/art/oreRelic.js';
import { buildItemAtlas, pickSizeIdx, SIZE_SCALES, BASE_IDX, GLINT_FRAMES } from '../src/render/art/itemAtlas.js';
import { spriteKey } from '../src/render/art/atlas.js';

// Fake 2D context that records calls, so painters can run without a real canvas.
function fakeCtx(log = []) {
  const grad = { addColorStop: (...a) => log.push('stop' + a.join(',')) };
  const base = { createLinearGradient: () => grad, createRadialGradient: () => grad };
  return new Proxy(base, {
    get(t, k) { if (k in t) return t[k]; return (...a) => { log.push(String(k) + a.map((v) => (typeof v === 'number' ? v.toFixed(2) : '')).join(',')); }; },
    set(t, k, v) { log.push('set' + String(k) + (typeof v === 'number' ? v.toFixed(2) : String(v))); return true; },
  });
}
const fakeCanvasFactory = () => (w, h) => ({ width: w, height: h, getContext: () => fakeCtx() });

test('all six gem tiers paint, are deterministic and differ from each other', () => {
  const logs = [];
  for (let tier = 1; tier <= 6; tier++) {
    const a = [], b = [];
    paintGemModel(fakeCtx(a), 48, tier, 0); paintGemModel(fakeCtx(b), 48, tier, 0);
    assert.equal(a.join('|'), b.join('|'), `tier ${tier} deterministic`);
    assert.ok(a.length > 20, `tier ${tier} draws something`);
    logs.push(a.join('|'));
  }
  assert.equal(new Set(logs).size, 6, 'each tier has its own shape');
});
test('animated tiers have 8 distinct frames, others 1', () => {
  assert.equal(gemFrames(5), 8); assert.equal(gemFrames(6), 8);
  for (const t of [1, 2, 3, 4]) assert.equal(gemFrames(t), 1);
  for (const t of [5, 6]) { const f0 = [], f3 = []; paintGemModel(fakeCtx(f0), 48, t, 0); paintGemModel(fakeCtx(f3), 48, t, 3); assert.notEqual(f0.join('|'), f3.join('|')); }
});
test('glint, ore, relic paint safely and tolerate a missing context', () => {
  for (let t = 1; t <= 6; t++) assert.doesNotThrow(() => paintGlint(fakeCtx(), 40, t, 0.5));
  assert.doesNotThrow(() => { paintOreModel(fakeCtx(), 40); paintRelicModel(fakeCtx(), 40); });
  assert.doesNotThrow(() => { paintGemModel(null, 40, 3, 0); paintOreModel(null, 40); paintRelicModel(null, 40); paintGlint(null, 40, 2, 0.5); });
  assert.doesNotThrow(() => paintGemModel(fakeCtx(), 40, 99, 0)); // out-of-range tier is clamped
  assert.equal(Object.keys(GEMS).length, 6);
});
test('size picking chooses the smallest step that is big enough', () => {
  const all = SIZE_SCALES.map((_, i) => i);
  assert.equal(SIZE_SCALES[pickSizeIdx(all, 1)], 1);
  assert.equal(SIZE_SCALES[pickSizeIdx(all, 0.7)], 0.8);
  assert.equal(SIZE_SCALES[pickSizeIdx(all, 9)], 1.5);
  assert.equal(SIZE_SCALES[pickSizeIdx([1, 3, 5], 0.9)], 1);
});
test('high atlas has 6 sizes, animation frames and glints; low has 3 sizes and none', () => {
  setCanvasFactory(fakeCanvasFactory());
  const hi = buildItemAtlas(44, 2, false), lo = buildItemAtlas(44, 2, true);
  assert.equal(hi.sizes.length, 6); assert.equal(lo.sizes.length, 3);
  for (let i = 0; i < 6; i++) assert.ok(hi.atlas.has(spriteKey('gem', 1, 'any', i, 0)));
  for (let f = 0; f < 8; f++) { assert.ok(hi.atlas.has(spriteKey('gem', 5, 'any', BASE_IDX, f))); assert.ok(hi.atlas.has(spriteKey('gem', 6, 'any', BASE_IDX, f))); }
  for (let f = 0; f < GLINT_FRAMES; f++) assert.ok(hi.atlas.has(spriteKey('glint', 4, 'any', BASE_IDX, f)));
  assert.ok(hi.atlas.has(spriteKey('ore', 0, 'any', 0, 0)) && hi.atlas.has(spriteKey('relic', 0, 'any', 5, 0)));
  assert.equal(lo.atlas.has(spriteKey('gem', 5, 'any', BASE_IDX, 1)), false);
  assert.equal(lo.atlas.has(spriteKey('glint', 1, 'any', BASE_IDX, 0)), false);
  assert.ok(lo.atlas.bytes < hi.atlas.bytes);
  hi.destroy(); lo.destroy();
  assert.equal(hi.atlas.size, 0);
  setCanvasFactory(null);
});
test('atlas stays small: at most 8 MB at DPR 2 for a 60 px item (4 MB for typical 22-45 px), DPR 3 is capped to the same', () => {
  setCanvasFactory(fakeCanvasFactory());
  const a = buildItemAtlas(60, 2, false); assert.ok(a.atlas.bytes <= 8 * 1048576, `got ${a.atlas.bytes}`); a.destroy();
  const b = buildItemAtlas(60, 3, false); assert.ok(b.atlas.bytes <= 8 * 1048576); b.destroy();
  setCanvasFactory(null);
});
test('building the atlas without a canvas does not throw', () => {
  setCanvasFactory(() => null);
  assert.doesNotThrow(() => { const a = buildItemAtlas(44, 2, false); a.destroy(); });
  setCanvasFactory(null);
});
