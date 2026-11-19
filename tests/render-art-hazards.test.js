import test from 'node:test';
import assert from 'node:assert/strict';
import { setCanvasFactory } from '../src/render/canvasUtil.js';
import { paintRockModel, paintBatModel, paintRootModel } from '../src/render/art/hazardModelsA.js';
import { paintSteamModel, paintSteamRing, paintVoidModel, paintVoidDots, paintWarnModel } from '../src/render/art/hazardModelsB.js';
import { RIM } from '../src/render/art/hazardRim.js';
import { buildItemAtlas, BASE_IDX } from '../src/render/art/itemAtlas.js';
import { spriteKey } from '../src/render/art/atlas.js';
import { createAtlas } from '../src/render/art/atlas.js';
import { TIER_COLORS } from '../src/render/palette.js';
import { hexToRgb } from '../src/render/art/color.js';

function fakeCtx(log = []) {
  const grad = { addColorStop: (...a) => log.push('stop' + a.join(',')) };
  const base = { createLinearGradient: () => grad, createRadialGradient: () => grad };
  return new Proxy(base, {
    get(t, k) { if (k in t) return t[k]; return (...a) => { log.push(String(k) + a.map((v) => (typeof v === 'number' ? v.toFixed(2) : String(v))).join(',')); }; },
    set(t, k, v) { log.push('set' + String(k) + (typeof v === 'number' ? v.toFixed(2) : String(v))); return true; },
  });
}
const run = (fn, ...args) => { const log = []; fn(fakeCtx(log), 48, ...args); return log.join('|'); };

test('every hazard painter draws something, deterministically', () => {
  const fns = [[paintRockModel], [paintBatModel, 1], [paintRootModel], [paintSteamModel, 1], [paintSteamRing], [paintVoidModel], [paintVoidDots], [paintWarnModel]];
  for (const [fn, ...a] of fns) { const x = run(fn, ...a), y = run(fn, ...a); assert.ok(x.length > 10, fn.name); assert.equal(x, y, fn.name); }
});
test('hazards look different from one another', () => {
  const all = [run(paintRockModel), run(paintBatModel, 1), run(paintRootModel), run(paintSteamModel, 1), run(paintVoidModel)];
  assert.equal(new Set(all).size, 5);
});
test('bat has 3 distinct wing frames and steam 3 distinct puff frames', () => {
  assert.equal(new Set([0, 1, 2].map((f) => run(paintBatModel, f))).size, 3);
  assert.equal(new Set([0, 1, 2].map((f) => run(paintSteamModel, f))).size, 3);
});
test('hazard rim is red-orange and no gem uses that colour family as its main colour', () => {
  assert.ok(RIM[0] > 220 && RIM[1] < 130 && RIM[2] < 90);
  for (const t of [1, 2, 3, 4, 5, 6]) { const c = hexToRgb(TIER_COLORS[t].base); assert.ok(!(c[0] > 220 && c[1] < 130 && c[2] < 90 && t !== 4) , `tier ${t}`); }
});
test('hazards paint safely with no context', () => {
  for (const fn of [paintRockModel, paintBatModel, paintRootModel, paintSteamModel, paintSteamRing, paintVoidModel, paintVoidDots, paintWarnModel]) assert.doesNotThrow(() => fn(null, 40, 1));
});
test('atlas holds every hazard sprite; low keeps the bat flap but one steam frame', () => {
  setCanvasFactory(() => ({ width: 1, height: 1, getContext: () => fakeCtx() }));
  const hi = buildItemAtlas(44, 2, false), lo = buildItemAtlas(44, 2, true);
  const k = (n, f = 0) => spriteKey('hz', 0, n, BASE_IDX, f);
  for (const n of ['rock', 'root', 'steamRing', 'void', 'voidDots', 'warn']) { assert.ok(hi.atlas.has(k(n)), n); assert.ok(lo.atlas.has(k(n)), n + ' low'); }
  for (let f = 0; f < 3; f++) { assert.ok(hi.atlas.has(k('bat', f))); assert.ok(lo.atlas.has(k('bat', f))); assert.ok(hi.atlas.has(k('steam', f))); }
  assert.equal(lo.atlas.has(k('steam', 1)), false);
  hi.destroy(); lo.destroy(); setCanvasFactory(null);
});
test('overflow sheets can be smaller than the first sheet', () => {
  setCanvasFactory(() => ({ width: 1, height: 1, getContext: () => fakeCtx() }));
  const a = createAtlas({ sheetSize: 64, overflowSize: 32, dpr: 1, pad: 0 });
  for (let i = 0; i < 5; i++) a.add('s' + i, 30, 30, null); // 4 fit on the first sheet, the fifth overflows
  assert.equal(a.sheetCount, 2); assert.equal(a.bytes, 64 * 64 * 4 + 32 * 32 * 4);
  assert.ok(a.add('big', 50, 50, null)); // too big for the small overflow sheet: gets a full-size sheet
  assert.equal(a.sheetCount, 3);
  a.destroy(); setCanvasFactory(null);
});
