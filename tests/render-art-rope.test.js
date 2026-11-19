import test from 'node:test';
import assert from 'node:assert/strict';
import { setCanvasFactory } from '../src/render/canvasUtil.js';
import { paintRopeTile, getRopeTiles, destroyRopeTiles, ROPE_STAGES, ROPE_TW, ROPE_TH } from '../src/render/art/ropeArt.js';
import { paintLantern, getLantern, destroyLantern, LANTERN_FRAMES } from '../src/render/art/lanternArt.js';
import { createRope } from '../src/render/rope.js';

function fakeCtx(log = []) {
  const grad = { addColorStop: (...a) => log.push('stop' + a.join(',')) };
  const base = { createLinearGradient: () => grad, createRadialGradient: () => grad };
  return new Proxy(base, {
    get(t, k) { if (k in t) return t[k]; return (...a) => { log.push(String(k) + a.map((v) => (typeof v === 'number' ? v.toFixed(2) : String(v))).join(',')); }; },
    set(t, k, v) { log.push('set' + String(k) + (typeof v === 'number' ? v.toFixed(2) : String(v))); return true; },
  });
}
const fakeFactory = (w, h) => ({ width: w, height: h, getContext: () => fakeCtx() });

test('rope tile: same seed gives the same drawing, every stage paints', () => {
  for (const s of ROPE_STAGES) {
    const a = [], b = [];
    paintRopeTile(fakeCtx(a), ROPE_TW, ROPE_TH, s, 7); paintRopeTile(fakeCtx(b), ROPE_TW, ROPE_TH, s, 7);
    assert.ok(a.length > 20); assert.deepEqual(a, b);
  }
  const x = [], y = [];
  paintRopeTile(fakeCtx(x), ROPE_TW, ROPE_TH, 'calm'); paintRopeTile(fakeCtx(y), ROPE_TW, ROPE_TH, 'hot');
  assert.notDeepEqual(x, y, 'hot looks different from calm');
});

test('rope tiles: built per pixel ratio, cached, freed on destroy, null without canvas', () => {
  setCanvasFactory(fakeFactory);
  const t = getRopeTiles(2);
  assert.equal(t.calm.width, ROPE_TW * 2); assert.equal(t.hot.height, ROPE_TH * 2);
  assert.equal(getRopeTiles(2), t, 'cached');
  assert.notEqual(getRopeTiles(1), t, 'new pixel ratio, new tiles');
  destroyRopeTiles();
  setCanvasFactory(() => null);
  assert.equal(getRopeTiles(1), null);
  setCanvasFactory(null);
});

test('rope draws at every strain, on low quality, snapped, and without canvas, never throwing', () => {
  for (const factory of [fakeFactory, () => null]) {
    setCanvasFactory(factory); destroyRopeTiles();
    for (const low of [false, true]) {
      const r = createRope(); r.low = low; r.dpr = 2;
      for (const s of [0, 0.3, 0.6, 0.8, 0.95, 1, NaN, -3, 9]) assert.doesNotThrow(() => r.draw(fakeCtx(), 100, -20, 100, 200, s, 1234, 57.5));
      r.snap(); r.update(100);
      assert.doesNotThrow(() => r.draw(fakeCtx(), 100, -20, 100, 200, 1, 2000, 10));
      const out = { x: 0, y: 0 }; assert.equal(r.sample(0.5, out), true);
    }
  }
  setCanvasFactory(null);
});

test('lantern: four flame frames that differ, cached, freed, null without canvas', () => {
  const logs = [0, 1, 2, 3].map((f) => { const l = []; paintLantern(fakeCtx(l), 18, 30, f); return l.join('|'); });
  assert.equal(new Set(logs).size, LANTERN_FRAMES, 'every frame is different');
  setCanvasFactory(fakeFactory);
  const l = getLantern(2);
  assert.equal(l.frames.length, LANTERN_FRAMES); assert.equal(getLantern(2), l);
  destroyLantern();
  setCanvasFactory(() => null);
  assert.equal(getLantern(1), null);
  setCanvasFactory(null);
});
