import test from 'node:test';
import assert from 'node:assert/strict';
import { createTarget, clearTarget, rasterTri } from '../src/render/models/raster.js';

function cover(t, tri, passB = false) {
  const hit = new Set();
  rasterTri(t, ...tri, 0, t.h, passB, (i) => hit.add(i));
  return hit;
}
test('a right triangle covers about its area', () => {
  const t = createTarget(16, 16); clearTarget(t);
  const n = cover(t, [0, 0, 0, 10, 0, 0, 0, 10, 0]).size;
  assert.ok(n >= 45 && n <= 55, 'covered ' + n);
});
test('two triangles sharing an edge cover a square with no gaps', () => {
  const t = createTarget(16, 16); clearTarget(t);
  const a = cover(t, [2, 2, 0, 10, 2, 0, 10, 10, 0]), b = cover(t, [2, 2, 1, 10, 10, 1, 2, 10, 1]);
  assert.equal(new Set([...a, ...b]).size, 64);
});
test('nearer triangles win the z-buffer, in either draw order', () => {
  for (const order of [0, 1]) {
    const t = createTarget(8, 8); clearTarget(t); const win = new Map();
    const far = [0, 0, 1, 8, 0, 1, 0, 8, 1], near = [0, 0, 5, 8, 0, 5, 0, 8, 5];
    const draw = (tri, id) => rasterTri(t, ...tri, 0, 8, false, (i, l0, l1, l2, z) => win.set(i, id));
    if (order) { draw(far, 'far'); draw(near, 'near'); } else { draw(near, 'near'); draw(far, 'far'); }
    assert.equal(win.get(0), 'near');
  }
});
test('winding order does not matter and weights add up to one', () => {
  const t = createTarget(8, 8); clearTarget(t); let bad = 0, n = 0;
  rasterTri(t, 0, 0, 0, 0, 8, 0, 8, 0, 0, 0, 8, false, (i, a, b, c) => { n++; if (Math.abs(a + b + c - 1) > 1e-4) bad++; });
  assert.ok(n > 20); assert.equal(bad, 0);
});
test('row limits only draw the asked rows', () => {
  const t = createTarget(8, 8); clearTarget(t); const rows = new Set();
  rasterTri(t, 0, 0, 0, 8, 0, 0, 0, 8, 0, 2, 4, false, (i) => rows.add(Math.floor(i / 8)));
  assert.deepEqual([...rows].sort(), [2, 3]);
});
