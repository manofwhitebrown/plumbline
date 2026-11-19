import test from 'node:test';
import assert from 'node:assert/strict';
import { makePrng, seedFrom } from '../src/render/art/prng.js';
import { valueNoise, fbm, ridged, worley } from '../src/render/art/noise.js';
import { hexToRgb, mix, lighten, darken, ramp, rampAt, hslToRgb, rgbToHsl } from '../src/render/art/color.js';
import { createPacker, spriteKey, createAtlas } from '../src/render/art/atlas.js';
import { setCanvasFactory } from '../src/render/canvasUtil.js';
import { facetLight, roundedPoly } from '../src/render/art/shapes.js';

test('prng is deterministic per seed', () => {
  const a = makePrng(5), b = makePrng(5), c = makePrng(6);
  assert.equal(a(), b()); assert.notEqual(a(), c());
  assert.equal(seedFrom('clay:far'), seedFrom('clay:far'));
  assert.notEqual(seedFrom('clay:far'), seedFrom('clay:mid'));
});
test('noise stays in 0..1, is deterministic and tiles', () => {
  for (let i = 0; i < 200; i++) {
    const x = i * 0.37, y = i * 0.91;
    for (const f of [valueNoise(x, y, 3), fbm(x, y, 3, 4), ridged(x, y, 3, 3)]) assert.ok(f >= 0 && f <= 1);
  }
  assert.equal(fbm(1.3, 2.7, 9), fbm(1.3, 2.7, 9));
  const P = 8;
  assert.ok(Math.abs(fbm(0.4, 0.6, 2, 3, P) - fbm(0.4 + P, 0.6 + P, 2, 3, P)) < 1e-9);
  assert.ok(Math.abs(worley(0.4, 0.6, 2, P).f1 - worley(0.4 + P, 0.6, 2, P).f1) < 1e-9);
});
test('worley edge is never negative', () => {
  for (let i = 0; i < 100; i++) assert.ok(worley(i * 0.31, i * 0.17, 4).edge >= 0);
});
test('colour helpers', () => {
  assert.deepEqual(hexToRgb('#ff8000'), [255, 128, 0]);
  assert.deepEqual(mix([0, 0, 0], [100, 100, 100], 0.5), [50, 50, 50]);
  const l = lighten([10, 10, 10], 1); assert.ok(l[0] < 256 && l[0] < 255 + 1 && !(l[0] === 255 && l[1] === 255 && l[2] === 255));
  const d = darken([200, 200, 200], 1); assert.ok(d[0] > 0);
  const r = ramp(['#000000', '#ffffff'], 5); assert.equal(r.length, 5); assert.equal(rampAt(r, 1)[0], 255);
  const back = hslToRgb(...rgbToHsl([200, 80, 40])); assert.ok(Math.abs(back[0] - 200) < 1);
});
test('packer never overlaps and reports full', () => {
  const p = createPacker(64, 64, 1);
  const boxes = [];
  for (let i = 0; i < 30; i++) { const b = p.place(15, 15); if (b) boxes.push(b); }
  assert.ok(boxes.length >= 9 && boxes.length < 30);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    assert.ok(a.x + 15 <= b.x || b.x + 15 <= a.x || a.y + 15 <= b.y || b.y + 15 <= a.y);
  }
  assert.equal(createPacker(10, 10).place(20, 5), null);
});
test('sprite keys are stable and distinct', () => {
  assert.equal(spriteKey('gem', 3, 'clay', 24), 'gem|3|clay|24|0');
  assert.notEqual(spriteKey('gem', 3, 'clay', 24), spriteKey('gem', 4, 'clay', 24));
  assert.notEqual(spriteKey('bat', 0, 'any', 32, 0), spriteKey('bat', 0, 'any', 32, 1));
});
test('atlas works without a canvas (placeholders) and frees on destroy', () => {
  setCanvasFactory(() => null);
  const a = createAtlas({ sheetSize: 64 });
  const r = a.add('x', 10, 10, () => { throw new Error('never called'); });
  assert.ok(r && r.w === 10);
  assert.equal(a.draw(null, 'x', 0, 0), false);
  a.destroy(); assert.equal(a.size, 0);
  setCanvasFactory(null);
});
test('facetLight and roundedPoly are safe', () => {
  const v = facetLight(Math.PI * 1.2); assert.ok(v >= 0 && v <= 1);
  assert.doesNotThrow(() => roundedPoly(null, [0, 0, 1, 1, 2, 0], 2));
});
