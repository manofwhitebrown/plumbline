import test from 'node:test';
import assert from 'node:assert/strict';
import { setCanvasFactory } from '../src/render/canvasUtil.js';
import { paintBucketBody, paintLantern } from '../src/render/art/bucketArt.js';
import { buildRopeTile, drawRopeStrip, ROPE_P } from '../src/render/art/ropeArt.js';
import { FAMILIES, paintTile, paintGlyph, makeKit } from '../src/render/art/iconStyle.js';
import { draw, PART_KEYS, toDataURL } from '../src/render/partIcon.js';
import { createRope } from '../src/render/rope.js';

function fakeCtx(log = []) {
  const grad = { addColorStop: (...a) => log.push('stop' + a.join(',')) };
  const base = { createLinearGradient: () => grad, createRadialGradient: () => grad, createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), getTransform: () => ({ a: 2 }) };
  return new Proxy(base, {
    get(t, k) { if (k in t) return t[k]; return (...a) => { log.push(String(k) + a.map((v) => (typeof v === 'number' ? v.toFixed(2) : '')).join(',')); }; },
    set(t, k, v) { log.push('set' + String(k) + (typeof v === 'number' ? v.toFixed(2) : String(v))); return true; },
  });
}
const L = { bucketW: 300, bucketH: 220, pad: 10, rim: 16, tile: 56, rows: 3 };

test('bucket body and lantern paint deterministically and never throw', () => {
  setCanvasFactory(() => ({ width: 1, height: 1, getContext: () => fakeCtx() }));
  const a = [], b = [];
  paintBucketBody(fakeCtx(a), L); paintBucketBody(fakeCtx(b), L);
  assert.equal(a.join('|'), b.join('|')); assert.ok(a.length > 50);
  assert.doesNotThrow(() => { paintLantern(fakeCtx()); paintBucketBody(null, L); paintLantern(null); });
  setCanvasFactory(null);
});
test('rope strip stamps along the path in chunks, even for very long segments', () => {
  const log = [], ctx = fakeCtx(log), tile = { width: 22, height: 108 };
  drawRopeStrip(ctx, tile, [0, 0, 0], [0, 30, 200], 2, 0);
  const stamps = log.filter((l) => l.startsWith('drawImage')).length;
  assert.ok(stamps >= 1 + Math.ceil(170 / (ROPE_P * 2)), `stamps ${stamps}`);
  assert.doesNotThrow(() => { drawRopeStrip(ctx, null, [0], [0], 0, 0); drawRopeStrip(null, tile, [0, 0], [0, 5], 1, 0); drawRopeStrip(ctx, tile, [0, 0], [0, 0], 1, 0); });
});
test('rope tile builds as a placeholder when no canvas exists', () => {
  setCanvasFactory(() => null);
  assert.doesNotThrow(() => buildRopeTile());
  setCanvasFactory(null);
});
test('rope still draws at every strain level, snapped or not, with and without a tile', () => {
  const rope = createRope();
  for (const strain of [0, 0.5, 0.75, 0.95, 1]) assert.doesNotThrow(() => rope.draw(fakeCtx(), 180, -20, 180, 300, strain, 1234, 500));
  rope.reduceMotion = true; assert.doesNotThrow(() => rope.draw(fakeCtx(), 180, -20, 180, 300, 0.95, 1234, 500));
  rope.snap(); rope.update(200); assert.doesNotThrow(() => rope.draw(fakeCtx(), 180, -20, 180, 300, 1, 1500, 500));
});
test('five icon families use the agreed accent colours', () => {
  assert.deepEqual(['collector', 'processor', 'defense', 'engine', 'special'].map((f) => FAMILIES[f].tile), ['#f6c453', '#35d6c4', '#7aa6e8', '#e8884a', '#b48cff']);
  for (const f of Object.values(FAMILIES)) assert.equal(f.metal.length, 3);
});
test('all 26 part icons draw in every state without throwing', () => {
  assert.equal(PART_KEYS.length, 26);
  for (const k of PART_KEYS) for (const st of ['idle', 'firing', 'locked', 'selected']) assert.doesNotThrow(() => draw(fakeCtx(), k, 0, 0, 48, st), `${k} ${st}`);
  assert.doesNotThrow(() => draw(fakeCtx(), 'not_a_part', 0, 0, 24, 'idle'));
  assert.doesNotThrow(() => draw(null, 'hook', 0, 0, 24, 'idle'));
});
test('firing icons differ from idle ones and drawing is deterministic', () => {
  const run = (k, st) => { const l = []; draw(fakeCtx(l), k, 0, 0, 48, st); return l.join('|'); };
  for (const k of ['hook', 'prism', 'jackpot_chest']) { assert.notEqual(run(k, 'idle'), run(k, 'firing')); assert.equal(run(k, 'idle'), run(k, 'idle')); }
});
test('tile and glyph helpers tolerate any state', () => {
  assert.doesNotThrow(() => { paintTile(fakeCtx(), FAMILIES.unknown, 'weird'); paintGlyph(fakeCtx(), (g, k) => g.fill(), FAMILIES.engine, 'idle', 48); makeKit(fakeCtx(), FAMILIES.special, 'firing'); });
});
