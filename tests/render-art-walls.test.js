import test from 'node:test';
import assert from 'node:assert/strict';
import { setCanvasFactory } from '../src/render/canvasUtil.js';
import { paintWallLayer, hasGlow } from '../src/render/art/wallArt.js';
import { sampleStone, PERIOD } from '../src/render/art/wallBase.js';
import { fbm, worley } from '../src/render/art/noise.js';
import { BIOME_IDS } from '../src/render/palette.js';

// A fake 2D context that records every call so we can check determinism without a real canvas.
function fakeCtx(log) {
  const grad = { addColorStop: (...a) => log.push('stop' + a.join(',')) };
  const base = { createLinearGradient: () => grad, createRadialGradient: () => grad, createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) };
  return new Proxy(base, {
    get(t, k) { if (k in t) return t[k]; return (...a) => { log.push(String(k) + a.map((v) => (typeof v === 'number' ? v.toFixed(3) : '')).join(',')); }; },
    set(t, k, v) { log.push('set' + String(k) + (typeof v === 'number' ? v.toFixed(3) : String(v))); return true; },
  });
}
function run(id, layer, q) { const log = []; setCanvasFactory((w, h) => ({ width: w, height: h, getContext: () => fakeCtx(log) })); const ok = paintWallLayer(fakeCtx(log), 120, 208, id, layer, q); setCanvasFactory(null); return { ok, log: log.join('|') }; }

test('every biome and layer paints without throwing and is deterministic', () => {
  for (const id of BIOME_IDS) for (const layer of ['far', 'mid', 'near', 'glow']) for (const q of ['high', 'low']) {
    const a = run(id, layer, q), b = run(id, layer, q);
    assert.equal(a.ok, true, `${id} ${layer} ${q}`);
    assert.equal(a.log, b.log, `${id} ${layer} ${q} must be identical`);
    assert.ok(a.log.length > 0 || layer === 'glow');
  }
});
test('painting with no canvas available does not throw', () => {
  setCanvasFactory(() => null);
  assert.doesNotThrow(() => paintWallLayer(fakeCtx([]), 100, 208, 'clay', 'far', 'high'));
  setCanvasFactory(null);
});
test('different biomes look different', () => {
  assert.notEqual(run('magma', 'far', 'high').log, run('void', 'far', 'high').log);
});
test('only clay has no glow pass', () => {
  assert.equal(hasGlow('clay'), false);
  for (const id of BIOME_IDS.filter((b) => b !== 'clay')) assert.equal(hasGlow(id), true);
});
test('stone height maps tile top to bottom for every biome', () => {
  const o = { h: 0, em: 0, ao: 0, k: 1 }, o2 = { h: 0, em: 0, ao: 0, k: 1 };
  for (const id of BIOME_IDS) {
    const P = PERIOD[id];
    for (const [u, v] of [[0.3, 0.7], [1.1, 2.2], [2.6, 0.1]]) {
      sampleStone(id, u, v, 5, P, o); sampleStone(id, u, v + P, 5, P, o2);
      assert.ok(Math.abs(o.h - o2.h) < 1e-9 && Math.abs(o.em - o2.em) < 1e-9, `${id} must wrap in y`);
      assert.ok(o.h >= -0.5 && o.h <= 1.5 && o.em >= 0 && o.em <= 1.2 && o.ao >= 0 && o.ao <= 1);
    }
  }
});
test('noise can wrap vertically only', () => {
  assert.ok(Math.abs(fbm(0.3, 0.4, 1, 3, 0, 4) - fbm(0.3, 4.4, 1, 3, 0, 4)) < 1e-9);
  assert.notEqual(fbm(0.3, 0.4, 1, 3, 0, 4), fbm(4.3, 0.4, 1, 3, 0, 4));
  assert.ok(Math.abs(worley(0.3, 0.4, 1, 0, undefined, 4).f1 - worley(0.3, 4.4, 1, 0, undefined, 4).f1) < 1e-9);
});
