// Shape helpers that add parts to a mesh. Angles run around the y axis (x toward z).
const TAU = Math.PI * 2;

// A ring of n points at height y. radius can be a number or fn(i, angle) -> radius. phase turns it.
export function ring(m, n, radius, y, phase = 0, squashZ = 1) {
  const ids = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * TAU, r = typeof radius === 'function' ? radius(i, a) : radius;
    ids.push(m.vert(Math.cos(a) * r, y, Math.sin(a) * r * squashZ));
  }
  return ids;
}

// Join ring a to ring b one-to-one (same point counts) with quads.
export function band(m, A, B, mat, hx, hy, hz) {
  const n = A.length;
  for (let i = 0; i < n; i++) m.quad(A[i], A[(i + 1) % n], B[(i + 1) % n], B[i], mat, hx, hy, hz);
}

// Close a ring with a flat cap (fan).
export function cap(m, ids, mat, hx, hy, hz) { m.poly(ids, mat, hx, hy, hz); }

// A point on the axis: used for pointed tops and bottoms.
export function apex(m, ids, y, mat, hx, hy, hz) {
  const a = m.vert(0, y, 0), n = ids.length;
  for (let i = 0; i < n; i++) m.tri(ids[i], ids[(i + 1) % n], a, mat, hx, hy, hz);
  return a;
}

// Surface of revolution. profile = [[radius, y], ...] bottom to top. Smooth shading by the crease angle.
// matFor(row) can pick a material per row of quads.
export function lathe(m, profile, segs, matOrFn, phase = 0) {
  const rings = profile.map(([r, y]) => (r < 1e-4 ? null : ring(m, segs, r, y, phase)));
  for (let k = 0; k < profile.length - 1; k++) {
    const mat = typeof matOrFn === 'function' ? matOrFn(k) : matOrFn, y = (profile[k][1] + profile[k + 1][1]) / 2;
    if (rings[k] && rings[k + 1]) band(m, rings[k], rings[k + 1], mat, 0, y, 0);
    else if (rings[k]) apex(m, rings[k], profile[k + 1][1], mat, 0, y, 0);
    else if (rings[k + 1]) apex(m, rings[k + 1], profile[k][1], mat, 0, y, 0);
  }
  return rings;
}

// Axis-aligned box centred at (cx, cy, cz) with half sizes (hx, hy, hz).
export function box(m, cx, cy, cz, hx, hy, hz, mat) {
  const v = [];
  for (let i = 0; i < 8; i++) v.push(m.vert(cx + (i & 1 ? hx : -hx), cy + (i & 2 ? hy : -hy), cz + (i & 4 ? hz : -hz)));
  m.inside(cx, cy, cz);
  m.quad(v[0], v[1], v[3], v[2], mat); m.quad(v[4], v[5], v[7], v[6], mat);
  m.quad(v[0], v[1], v[5], v[4], mat); m.quad(v[2], v[3], v[7], v[6], mat);
  m.quad(v[0], v[2], v[6], v[4], mat); m.quad(v[1], v[3], v[7], v[5], mat);
  return v;
}

// A small ball (lat/long sphere), scaled per axis.
export function ball(m, cx, cy, cz, rx, ry, rz, lat, lon, mat) {
  m.inside(cx, cy, cz);
  const rings = [];
  for (let j = 1; j < lat; j++) {
    const a = (j / lat) * Math.PI, y = Math.cos(a) * ry, r = Math.sin(a);
    const ids = []; for (let i = 0; i < lon; i++) { const t = (i / lon) * TAU; ids.push(m.vert(cx + Math.cos(t) * r * rx, cy + y, cz + Math.sin(t) * r * rz)); }
    rings.push(ids);
  }
  const top = m.vert(cx, cy + ry, cz), bot = m.vert(cx, cy - ry, cz);
  for (let j = 0; j < rings.length - 1; j++) band(m, rings[j], rings[j + 1], mat);
  for (let i = 0; i < lon; i++) { m.tri(rings[0][i], rings[0][(i + 1) % lon], top, mat); m.tri(rings[rings.length - 1][i], rings[rings.length - 1][(i + 1) % lon], bot, mat); }
}

// A tube swept along a path of [x, y] points that lies in the z = 0 plane. radii can be a number or fn(t).
export function tube(m, path, radiusAt, around, mat, closedEnds = true) {
  const rings = [];
  for (let k = 0; k < path.length; k++) {
    const p = path[k], a = path[Math.max(0, k - 1)], b = path[Math.min(path.length - 1, k + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const nx = -ty, ny = tx, r = typeof radiusAt === 'function' ? radiusAt(k / (path.length - 1)) : radiusAt, ids = [];
    for (let i = 0; i < around; i++) { const t = (i / around) * TAU, c = Math.cos(t) * r, s = Math.sin(t) * r; ids.push(m.vert(p[0] + nx * c, p[1] + ny * c, s)); }
    rings.push({ ids, p });
  }
  for (let k = 0; k < rings.length - 1; k++) band(m, rings[k].ids, rings[k + 1].ids, mat, (rings[k].p[0] + rings[k + 1].p[0]) / 2, (rings[k].p[1] + rings[k + 1].p[1]) / 2, 0);
  if (closedEnds) for (const [R, dirIdx] of [[rings[0], 0], [rings[rings.length - 1], 1]]) {
    const q = path[dirIdx ? path.length - 1 : 0], q2 = path[dirIdx ? path.length - 2 : 1];
    cap(m, R.ids, mat, q2[0], q2[1], 0); void q;
  }
  return rings;
}

// A flat ring (torus) in the z = 0 plane centred at (cx, cy).
export function torus(m, cx, cy, R, r, segs, around, mat) {
  const path = []; for (let i = 0; i <= segs; i++) { const a = (i / segs) * TAU; path.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
  path.pop();
  const rings = [];
  for (let k = 0; k < segs; k++) {
    const a = (k / segs) * TAU, ca = Math.cos(a), sa = Math.sin(a), ids = [];
    for (let i = 0; i < around; i++) { const t = (i / around) * TAU, rr = R + Math.cos(t) * r; ids.push(m.vert(cx + ca * rr, cy + sa * rr, Math.sin(t) * r)); }
    rings.push(ids);
  }
  for (let k = 0; k < segs; k++) band(m, rings[k], rings[(k + 1) % segs], mat, cx + Math.cos(((k + 0.5) / segs) * TAU) * R, cy + Math.sin(((k + 0.5) / segs) * TAU) * R, 0);
}
