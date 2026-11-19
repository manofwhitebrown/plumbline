import test from 'node:test';
import assert from 'node:assert/strict';
import { mat4Identity, mat4Mul, mat4RotY, mat4RotX, mat4Translate, mat4Scale, mat4Point, mat4Dir, vcross, vnorm } from '../src/render/models/math.js';

const near = (a, b, e = 1e-5) => assert.ok(Math.abs(a - b) < e, `${a} vs ${b}`);

test('identity leaves a point alone', () => {
  const o = new Float32Array(3); mat4Point(mat4Identity(), 1, 2, 3, o);
  assert.deepEqual([...o], [1, 2, 3]);
});
test('rotating 90 degrees around y sends +z to +x', () => {
  const o = new Float32Array(3); mat4Point(mat4RotY(Math.PI / 2), 0, 0, 1, o);
  near(o[0], 1); near(o[1], 0); near(o[2], 0);
});
test('mat4Mul applies the right matrix first, and may write into its own input', () => {
  const m = mat4Mul(mat4Translate(5, 0, 0), mat4Scale(2, 2, 2)), o = new Float32Array(3);
  mat4Point(m, 1, 1, 1, o); assert.deepEqual([...o], [7, 2, 2]);
  const a = mat4RotX(0.3); mat4Mul(a, a, a); const b = mat4Mul(mat4RotX(0.3), mat4RotX(0.3));
  for (let i = 0; i < 16; i++) near(a[i], b[i]);
});
test('directions ignore the move part', () => {
  const o = new Float32Array(3); mat4Dir(mat4Translate(9, 9, 9), 0, 1, 0, o);
  assert.deepEqual([...o], [0, 1, 0]);
});
test('cross product and normalise', () => {
  assert.deepEqual(vcross([1, 0, 0], [0, 1, 0]), [0, 0, 1]);
  near(vnorm([3, 0, 4])[0], 0.6);
});
