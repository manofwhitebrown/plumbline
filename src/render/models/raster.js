// Z-buffered triangle rasteriser. Works on a "target": { w, h, z: Float32Array(w*h) }.
// For every covered pixel that passes the depth test it calls cb(i, l0, l1, l2, z),
// where l0..l2 are the barycentric weights of the three corners (they add up to 1).
// A pixel counts as covered when its centre is inside or exactly on the edge, so shared edges leave no gaps.
export function createTarget(w, h) {
  return {
    w, h,
    z: new Float32Array(w * h),      // depth for pass A (solid things and glass backs)
    zb: new Float32Array(w * h),     // depth for pass B (glass fronts)
    c: new Float32Array(w * h * 4),  // pass A colour (rgb) + coverage (a)
    o: new Float32Array(w * h * 3),  // pass B colour
    og: new Uint8Array(w * h),       // 1 where pass B wrote
  };
}

export function clearTarget(t) {
  t.z.fill(-1e9); t.zb.fill(-1e9); t.c.fill(0); t.og.fill(0);
}

// yMin..yMax (exclusive) limits the rows drawn, so a frame can be baked in slices.
// writeDepth/useZ pick which depth buffer is used (false = pass A, true = pass B).
export function rasterTri(t, x0, y0, z0, x1, y1, z1, x2, y2, z2, yMin, yMax, passB, cb) {
  const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  if (area > -1e-9 && area < 1e-9) return 0;
  const inv = 1 / area, W = t.w, zbuf = passB ? t.zb : t.z;
  let minX = Math.floor(Math.min(x0, x1, x2)), maxX = Math.ceil(Math.max(x0, x1, x2));
  let minY = Math.floor(Math.min(y0, y1, y2)), maxY = Math.ceil(Math.max(y0, y1, y2));
  if (minX < 0) minX = 0; if (maxX > W) maxX = W;
  if (minY < yMin) minY = yMin; if (maxY > yMax) maxY = yMax;
  if (minX >= maxX || minY >= maxY) return 0;
  // edge functions: e0 = weight of corner 0, etc. Each is linear in x and y.
  const a0 = (y1 - y2) * inv, b0 = (x2 - x1) * inv, c0 = (x1 * y2 - x2 * y1) * inv;
  const a1 = (y2 - y0) * inv, b1 = (x0 - x2) * inv, c1 = (x2 * y0 - x0 * y2) * inv;
  const dz1 = z1 - z0, dz2 = z2 - z0;
  const EPS = -1e-6;
  let count = 0;
  for (let y = minY; y < maxY; y++) {
    const py = y + 0.5;
    let l0 = a0 * (minX + 0.5) + b0 * py + c0;
    let l1 = a1 * (minX + 0.5) + b1 * py + c1;
    for (let x = minX; x < maxX; x++, l0 += a0, l1 += a1) {
      const l2 = 1 - l0 - l1;
      if (l0 < EPS || l1 < EPS || l2 < EPS) continue;
      const z = z0 + l1 * dz1 + l2 * dz2;
      const i = y * W + x;
      if (z <= zbuf[i]) continue;
      zbuf[i] = z; count++;
      cb(i, l0, l1, l2, z, x, y);
    }
  }
  return count;
}
