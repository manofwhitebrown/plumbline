import test from 'node:test';
import assert from 'node:assert/strict';
import { setCanvasFactory } from '../src/render/canvasUtil.js';
import * as artKit from '../src/render/art/index.js';
import { disposeWallTextures, WALL_TEX_W, WALL_TEX_H } from '../src/render/art/wallTexture.js';
import { BIOME_IDS } from '../src/render/palette.js';

function fakeCtx() {
  const grad = { addColorStop() {} };
  const base = { createLinearGradient: () => grad, createRadialGradient: () => grad, createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) };
  return new Proxy(base, { get(t, k) { return k in t ? t[k] : () => {}; }, set() { return true; } });
}
test('the art kit exposes wallTexture where the depth layer looks for it', () => {
  assert.equal(typeof artKit['wallTexture'], 'function');
});
test('wallTexture gives a 160 x 192 canvas for every biome, cached, and frees on dispose', () => {
  setCanvasFactory((w, h) => ({ width: w, height: h, getContext: () => fakeCtx() }));
  disposeWallTextures();
  for (const id of BIOME_IDS) {
    const a = artKit.wallTexture(id, 0), b = artKit.wallTexture(id, 0);
    assert.ok(a && a.width === WALL_TEX_W && a.height === WALL_TEX_H, id);
    assert.equal(a, b, 'cached: no second build');
  }
  assert.ok(artKit.wallTexture('clay', 1));
  assert.ok(artKit.wallTexture('not-a-biome', 0), 'unknown biome falls back to clay');
  disposeWallTextures(); setCanvasFactory(null);
});
test('wallTexture returns null without a canvas and never throws', () => {
  setCanvasFactory(() => null); disposeWallTextures();
  assert.doesNotThrow(() => assert.equal(artKit.wallTexture('magma', 0), null));
  disposeWallTextures(); setCanvasFactory(null);
});
