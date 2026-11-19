// A mesh is vertices + triangles + one material per triangle.
// Build it with createMesh(), add parts, then call finish() to get fast typed arrays and normals.
import { vcross, vnorm } from './math.js';

export function createMesh() {
  const pos = [], tris = [], tmat = [], mats = [];
  let cx = 0, cy = 0, cz = 0; // "inside" point: used to flip any triangle that faces inward
  const api = {
    // Register a material and get its small id.
    mat(m) { let i = mats.indexOf(m); if (i < 0) { i = mats.length; mats.push(m); } return i; },
    // Where the inside of the part you are adding is. Triangles are turned to face away from it.
    inside(x, y, z) { cx = x; cy = y; cz = z; return api; },
    vert(x, y, z) { pos.push(x, y, z); return pos.length / 3 - 1; },
    get vertCount() { return pos.length / 3; },
    get triCount() { return tris.length / 3; },
    // One triangle. If (hx,hy,hz) is given it overrides the inside point for this triangle.
    tri(a, b, c, mat, hx = cx, hy = cy, hz = cz) {
      const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
      const e1 = [pos[b * 3] - ax, pos[b * 3 + 1] - ay, pos[b * 3 + 2] - az];
      const e2 = [pos[c * 3] - ax, pos[c * 3 + 1] - ay, pos[c * 3 + 2] - az];
      const n = vcross(e1, e2);
      if (n[0] * n[0] + n[1] * n[1] + n[2] * n[2] < 1e-12) return api; // skip zero-area triangles
      const mx = (ax + pos[b * 3] + pos[c * 3]) / 3 - hx, my = (ay + pos[b * 3 + 1] + pos[c * 3 + 1]) / 3 - hy, mz = (az + pos[b * 3 + 2] + pos[c * 3 + 2]) / 3 - hz;
      if (n[0] * mx + n[1] * my + n[2] * mz < 0) tris.push(a, c, b, mat); else tris.push(a, b, c, mat);
      return api;
    },
    quad(a, b, c, d, mat, hx, hy, hz) { api.tri(a, b, c, mat, hx, hy, hz); return api.tri(a, c, d, mat, hx, hy, hz); },
    // A flat polygon (convex) as a fan from its first point.
    poly(ids, mat, hx, hy, hz) { for (let i = 1; i < ids.length - 1; i++) api.tri(ids[0], ids[i], ids[i + 1], mat, hx, hy, hz); return api; },
    // Join two rings of vertices (each ordered by angle around the y axis) with triangles.
    // The rings may have different point counts; this zips them by angle.
    stitch(ringA, ringB, mat, hx, hy, hz, closed = true) {
      const ang = (id) => { const a = Math.atan2(pos[id * 3 + 2], pos[id * 3]); return a < 0 ? a + 6.283185307 : a; };
      const A = ringA, B = ringB, na = A.length, nb = B.length;
      let ia = 0, ib = 0;
      // start both rings at the point with the smallest angle
      const first = (R) => { let best = 0; for (let i = 1; i < R.length; i++) if (ang(R[i]) < ang(R[best])) best = i; return best; };
      const oa = first(A), ob = first(B);
      const getA = (i) => A[(oa + i) % na], getB = (i) => B[(ob + i) % nb];
      const aa = (i) => { const v = ang(getA(i)) - ang(getA(0)); return v < 0 ? v + 6.283185307 : v; };
      const bb = (i) => { const v = ang(getB(i)) - ang(getB(0)); return v < 0 ? v + 6.283185307 : v; };
      const aAt = (i) => (i >= na ? 6.283185307 : aa(i)), bAt = (i) => (i >= nb ? 6.283185307 : bb(i));
      let guard = 0;
      while ((ia < na || ib < nb) && guard++ < 200) {
        const nextA = ia < na ? aAt(ia + 1) : 9, nextB = ib < nb ? bAt(ib + 1) : 9;
        if (ia < na && (nextA <= nextB || ib >= nb)) { api.tri(getA(ia), getA(ia + 1), getB(ib), mat, hx, hy, hz); ia++; }
        else { api.tri(getB(ib), getB(ib + 1), getA(ia), mat, hx, hy, hz); ib++; }
      }
      return api;
    },
    // Turn the lists into typed arrays and work out normals.
    // creaseDeg: edges sharper than this stay hard; softer edges are smoothed. 0 = fully faceted.
    finish(creaseDeg = 0) { return finishMesh(pos, tris, mats, creaseDeg); },
  };
  return api;
}

function finishMesh(posList, triList, mats, creaseDeg) {
  const nv = posList.length / 3, nt = triList.length / 4;
  const p = new Float32Array(posList), t = new Uint16Array(nt * 3), m = new Uint8Array(nt);
  const fn = new Float32Array(nt * 3), area = new Float32Array(nt), n = new Float32Array(nt * 9);
  const adj = Array.from({ length: nv }, () => []);
  for (let i = 0; i < nt; i++) {
    const a = triList[i * 4], b = triList[i * 4 + 1], c = triList[i * 4 + 2];
    t[i * 3] = a; t[i * 3 + 1] = b; t[i * 3 + 2] = c; m[i] = triList[i * 4 + 3];
    const e1 = [p[b * 3] - p[a * 3], p[b * 3 + 1] - p[a * 3 + 1], p[b * 3 + 2] - p[a * 3 + 2]];
    const e2 = [p[c * 3] - p[a * 3], p[c * 3 + 1] - p[a * 3 + 1], p[c * 3 + 2] - p[a * 3 + 2]];
    const cr = vcross(e1, e2); area[i] = Math.sqrt(cr[0] * cr[0] + cr[1] * cr[1] + cr[2] * cr[2]);
    vnorm(cr, cr); fn[i * 3] = cr[0]; fn[i * 3 + 1] = cr[1]; fn[i * 3 + 2] = cr[2];
    adj[a].push(i); adj[b].push(i); adj[c].push(i);
  }
  const cosC = Math.cos((creaseDeg * Math.PI) / 180);
  for (let i = 0; i < nt; i++) {
    for (let k = 0; k < 3; k++) {
      const v = t[i * 3 + k]; let sx = 0, sy = 0, sz = 0;
      for (const j of adj[v]) {
        const d = fn[i * 3] * fn[j * 3] + fn[i * 3 + 1] * fn[j * 3 + 1] + fn[i * 3 + 2] * fn[j * 3 + 2];
        if (j === i || d >= cosC - 1e-6) { sx += fn[j * 3] * area[j]; sy += fn[j * 3 + 1] * area[j]; sz += fn[j * 3 + 2] * area[j]; }
      }
      const l = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1;
      n[i * 9 + k * 3] = sx / l; n[i * 9 + k * 3 + 1] = sy / l; n[i * 9 + k * 3 + 2] = sz / l;
    }
  }
  // bounding radius around the origin (used for sanity checks and framing)
  let rad = 0; for (let i = 0; i < nv; i++) rad = Math.max(rad, Math.hypot(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]));
  return { p, t, m, fn, n, mats, vertCount: nv, triCount: nt, radius: rad };
}
