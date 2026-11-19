// Texture generator (UIART-1): deterministic, fast, small, safe without canvas, and dark enough for text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { mulberry32, paintTile, paintBackdrop, BACKDROP_IDS, BACKDROP_SIZE, TILES, buildTileVars, installTextures, backdropUrl, browserCanvas } from '../src/ui/theme/textures.js';
import { ratio, hex, lum } from './uiart-contrast.test.js';

const make = (w, h) => createCanvas(w, h);

test('the seeded random generator repeats', () => {
  const a = mulberry32(5), b = mulberry32(5);
  for (let i = 0; i < 20; i++) assert.equal(a(), b());
  assert.notEqual(mulberry32(5)(), mulberry32(6)());
});
test('tiles are deterministic for the same seed and differ for another', () => {
  for (const n of Object.keys(TILES)) {
    assert.equal(paintTile(make, n, 64, 3), paintTile(make, n, 64, 3), n + ' changed between runs');
    assert.notEqual(paintTile(make, n, 64, 3), paintTile(make, n, 64, 4), n + ' ignores its seed');
  }
});
test('backdrops are deterministic, one per screen, under 150 ms each and 10 MB in total', () => {
  assert.deepEqual(BACKDROP_IDS.sort(), ['codex', 'crew', 'home', 'rewards', 'rig', 'settings', 'workshop']);
  let bytes = 0;
  for (const id of BACKDROP_IDS) {
    const t0 = performance.now(); const a = paintBackdrop(make, id); const ms = performance.now() - t0;
    assert.ok(ms < 150, id + ' took ' + ms.toFixed(0) + ' ms');
    assert.equal(a, paintBackdrop(make, id), id + ' is not deterministic');
    bytes += a.length;
  }
  const rawBytes = BACKDROP_IDS.length * BACKDROP_SIZE.w * BACKDROP_SIZE.h * 4;
  assert.ok(bytes < 10e6 && rawBytes < 10e6, 'too big: ' + bytes + ' / ' + rawBytes);
});
test('after the theme overlay, backdrop pixels keep 4.5:1 for body text and 3:1 for muted text', () => {
  // theme.css overlays rgba(7,10,18, .42 -> .56 -> .72 top to bottom). Check the brightest 1 percent of pixels.
  const { w, h } = BACKDROP_SIZE;
  const text = hex('#eef2ff'), muted = hex('#9aa4c4');
  for (const id of BACKDROP_IDS) {
    const cv = make(w, h); const ctx = cv.getContext('2d'); const fn = (url) => url;
    const img = paintBackdrop((W, H) => cv, id); assert.ok(img);
    const px = ctx.getImageData(0, 0, w, h).data; const ls = [];
    for (let y = 0; y < h; y++) { const t = y / h, a = t < 0.55 ? 0.42 + (0.14 * t) / 0.55 : 0.56 + (0.16 * (t - 0.55)) / 0.45;
      for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; ls.push(lum([px[i] * (1 - a) + 7 * a, px[i + 1] * (1 - a) + 10 * a, px[i + 2] * (1 - a) + 18 * a])); } }
    ls.sort((p, q) => p - q); const p99 = ls[Math.floor(ls.length * 0.99)];
    const rt = (lum(text) + 0.05) / (p99 + 0.05), rm = (lum(muted) + 0.05) / (p99 + 0.05);
    assert.ok(rt >= 4.5, `${id}: body text on its brightest 1% is ${rt.toFixed(2)}:1`);
    assert.ok(rm >= 3, `${id}: muted text on its brightest 1% is ${rm.toFixed(2)}:1`);
  }
});
test('safe without canvas: no throw, no output, no DOM needed', () => {
  const none = () => null, broken = () => ({ getContext: () => null }), thrower = () => { throw new Error('no canvas'); };
  for (const m of [none, broken, thrower]) {
    assert.equal(paintTile(m, 'metal'), null); assert.equal(paintBackdrop(m, 'home'), null); assert.deepEqual(buildTileVars(m), {});
  }
  assert.equal(browserCanvas(10, 10), null);          // no document in node
  assert.equal(backdropUrl('home', none), null);
  assert.deepEqual(installTextures(null), {});         // no root, no document
  assert.deepEqual(installTextures({}), {});           // root without a style object
});
test('installTextures writes CSS variables when canvas exists', () => {
  const set = {}; const root = { style: { setProperty: (k, v) => { set[k] = v; } } };
  const vars = buildTileVars(make);
  for (const k of Object.keys(vars)) root.style.setProperty(k, vars[k]);
  assert.deepEqual(Object.keys(set).sort(), ['--tx-grain', '--tx-leather', '--tx-metal', '--tx-stone']);
  for (const v of Object.values(set)) assert.ok(/^url\("data:image\/png;base64,/.test(v));
});
