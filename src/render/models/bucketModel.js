// The bucket: a staved wooden barrel with brass hoops, a rim and two side ears.
// part 'body' = wood only (drawn under the rig tiles), 'trim' = brass only (drawn over them), 'all' = both (used to fit the camera).
import { createMesh } from './mesh.js';
import { ring, band, cap, torus } from './shapes.js';
import { wood, metal, material } from './materials.js';

export function propBucket(seed = 1, o = {}) {
  const part = o.part || 'all', aspect = o.aspect || 248 / 208, tilt = o.tilt || 0.2443;
  const rTop = 0.92, rBot = 0.8, halfW = 1.17, m = createMesh(); // halfW includes the side ears
  const wA = m.mat(wood('#7a4a24', { grain: 0.3, spec: 0.22 })), wB = m.mat(wood('#6a3f1e', { grain: 0.3, spec: 0.22 })), inner = m.mat(material('solid', '#120a06', { spec: 0 }));
  const brass = m.mat(metal('#e0aa3e', { spec: 1.3, shin: 50 }));
  const halfH = Math.max(0.3, (2 * halfW / aspect - (rTop + rBot) * Math.sin(tilt)) / (2 * Math.cos(tilt)));
  const prof = [[rBot, -halfH], [rBot + 0.05, -halfH * 0.45], [rTop - 0.02, halfH * 0.3], [rTop, halfH * 0.88]];
  const N = 14, rings = prof.map(([r, y]) => ring(m, N, r, y));
  m.inside(0, 0, 0);
  if (part !== 'trim') {
    for (let k = 0; k < rings.length - 1; k++) for (let i = 0; i < N; i++) m.quad(rings[k][i], rings[k][(i + 1) % N], rings[k + 1][(i + 1) % N], rings[k + 1][i], i % 2 ? wA : wB, 0, (prof[k][1] + prof[k + 1][1]) / 2, 0);
    cap(m, rings[rings.length - 1].slice().reverse(), inner, 0, -1, 0);
    cap(m, rings[0], wB, 0, 1, 0);
  }
  if (part !== 'body') {
    const hoop = (y, r) => { // a brass band around the barrel
      const a = ring(m, N, r + 0.045, y - 0.09), b = ring(m, N, r + 0.06, y), c = ring(m, N, r + 0.045, y + 0.09);
      band(m, a, b, brass, 0, y, 0); band(m, b, c, brass, 0, y, 0);
    };
    const radAt = (y) => rBot + ((y + halfH) / (2 * halfH)) * (rTop - rBot);
    hoop(-halfH * 0.62, radAt(-halfH * 0.62)); hoop(halfH * 0.22, radAt(halfH * 0.22));
    const top = halfH * 0.88, r1 = ring(m, N, rTop + 0.02, top - 0.12), r2 = ring(m, N, rTop + 0.1, top + 0.02), r3 = ring(m, N, rTop + 0.02, top + 0.06);
    band(m, r1, r2, brass, 0, top, 0); band(m, r2, r3, brass, 0, top, 0);
    cap(m, r3, inner, 0, -1, 0);
    for (const s of [-1, 1]) torus(m, s * (rTop + 0.12), top - 0.1, 0.09, 0.032, 7, 4, brass);
  }
  return m.finish(24);
}
