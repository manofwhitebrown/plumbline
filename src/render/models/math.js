// Small 3D maths for the model baker. A matrix is 16 numbers, row-major: m[row * 4 + col].
// Points are (x, y, z) with x right, y up, z toward the viewer.
const tmp = new Float32Array(16);

export function mat4Identity(o = new Float32Array(16)) {
  o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o;
}

// o = a * b (b is applied first, then a). Safe if o is the same array as a or b.
export function mat4Mul(a, b, o = new Float32Array(16)) {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      tmp[r * 4 + c] = a[r * 4] * b[c] + a[r * 4 + 1] * b[4 + c] + a[r * 4 + 2] * b[8 + c] + a[r * 4 + 3] * b[12 + c];
    }
  }
  for (let i = 0; i < 16; i++) o[i] = tmp[i];
  return o;
}

export function mat4RotX(rad, o = new Float32Array(16)) {
  mat4Identity(o); const c = Math.cos(rad), s = Math.sin(rad);
  o[5] = c; o[6] = -s; o[9] = s; o[10] = c; return o;
}
export function mat4RotY(rad, o = new Float32Array(16)) {
  mat4Identity(o); const c = Math.cos(rad), s = Math.sin(rad);
  o[0] = c; o[2] = s; o[8] = -s; o[10] = c; return o;
}
export function mat4RotZ(rad, o = new Float32Array(16)) {
  mat4Identity(o); const c = Math.cos(rad), s = Math.sin(rad);
  o[0] = c; o[1] = -s; o[4] = s; o[5] = c; return o;
}
export function mat4Translate(x, y, z, o = new Float32Array(16)) {
  mat4Identity(o); o[3] = x; o[7] = y; o[11] = z; return o;
}
export function mat4Scale(x, y, z, o = new Float32Array(16)) {
  mat4Identity(o); o[0] = x; o[5] = y; o[10] = z; return o;
}

// Write m * (x, y, z, 1) into out[i..i+2].
export function mat4Point(m, x, y, z, out, i = 0) {
  out[i] = m[0] * x + m[1] * y + m[2] * z + m[3];
  out[i + 1] = m[4] * x + m[5] * y + m[6] * z + m[7];
  out[i + 2] = m[8] * x + m[9] * y + m[10] * z + m[11];
  return out;
}
// Same but ignores the move part (for directions and normals).
export function mat4Dir(m, x, y, z, out, i = 0) {
  out[i] = m[0] * x + m[1] * y + m[2] * z;
  out[i + 1] = m[4] * x + m[5] * y + m[6] * z;
  out[i + 2] = m[8] * x + m[9] * y + m[10] * z;
  return out;
}

export function vdot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
export function vcross(a, b, o = [0, 0, 0]) {
  const x = a[1] * b[2] - a[2] * b[1], y = a[2] * b[0] - a[0] * b[2], z = a[0] * b[1] - a[1] * b[0];
  o[0] = x; o[1] = y; o[2] = z; return o;
}
export function vlen(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); }
export function vnorm(a, o = [0, 0, 0]) {
  const l = vlen(a) || 1; o[0] = a[0] / l; o[1] = a[1] / l; o[2] = a[2] / l; return o;
}
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
