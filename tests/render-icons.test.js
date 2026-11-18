import test from 'node:test';
import assert from 'node:assert/strict';
import { draw, toDataURL, normalizeId, hasGlyph, PART_KEYS } from '../src/render/partIcon.js';

// A fake canvas context that accepts any call.
function fakeCtx() {
  const calls = [];
  return new Proxy({}, {
    get(t, k) {
      if (k === 'calls') return calls;
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop() {} });
      return (...a) => { calls.push(k); };
    },
    set() { return true; },
  });
}
test('26 parts have glyphs, ids are forgiving', () => {
  assert.equal(PART_KEYS.length, 26);
  for (const k of PART_KEYS) assert.ok(hasGlyph(k), k);
  assert.equal(normalizeId('Oil Can'), 'oilcan');
  assert.equal(normalizeId('spike_guard'), 'spikeguard');
  assert.equal(normalizeId(null), '');
});
test('draw never throws on bad input', () => {
  const g = fakeCtx();
  for (const id of [...PART_KEYS, 'nope', null, undefined, 5]) for (const s of ['idle', 'firing', 'locked', 'selected', 'bad', undefined]) draw(g, id, 0, 0, 40, s);
  draw(null, 'hook', 0, 0, 40); draw(g, 'hook', NaN, 0, 40); draw(g, 'hook', 0, 0, -5); draw(g, 'hook', 0, 0, Infinity);
  assert.ok(g.calls.length > 100);
});
test('toDataURL fails soft without a canvas', () => {
  assert.equal(toDataURL('hook', 48), '');
  assert.equal(toDataURL(null, NaN), '');
});
