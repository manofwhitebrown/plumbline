import test from 'node:test';
import assert from 'node:assert/strict';
import { createRenderer } from '../src/render/index.js';
import * as partIcon from '../src/render/partIcon.js';
import { BIOME_IDS, biomePalette, tierColors, ropeTint } from '../src/render/palette.js';
import { createQuality } from '../src/render/quality.js';
import { createPool } from '../src/render/pool.js';

test('renderer has every contract function', () => {
  const r = createRenderer({}, {});
  for (const k of ['resize', 'setRun', 'pushEvents', 'frame', 'setQuality', 'destroy', 'safeRect']) assert.equal(typeof r[k], 'function');
  r.destroy(); r.destroy();
});
test('partIcon exports', () => {
  assert.equal(typeof partIcon.draw, 'function');
  assert.equal(typeof partIcon.toDataURL, 'function');
});
test('palette complete', () => {
  for (const id of BIOME_IDS) { const p = biomePalette(id); for (const k of ['top', 'bottom', 'wall', 'crack', 'mote', 'glow']) assert.ok(p[k], id + k); }
  for (let t = 1; t <= 6; t++) assert.ok(tierColors(t).base);
  assert.ok(ropeTint(NaN)); assert.ok(ropeTint(5));
});
test('quality drops after 2s of slow frames', () => {
  const q = createQuality('high');
  for (let i = 0; i < 200; i++) q.sample(30);
  assert.equal(q.level, 'low');
});
test('pool never grows', () => {
  const p = createPool(10, () => ({}));
  for (let i = 0; i < 10000; i++) p.acquire();
  assert.equal(p.items.length, 10);
});
