// The six gem tiers. Each generator returns a finished mesh (under 400 triangles).
// Every tier has its own silhouette so they stay easy to tell apart (also for colour-blind players):
//   1 tall pointed hexagonal crystal   2 wide flat step-cut (octagon)   3 teardrop with a speck inside
//   4 round brilliant, pointed below   5 spiky three-horned void gem    6 triangular prism (end-on triangle)
import { createMesh } from './mesh.js';
import { ring, band, cap, apex, lathe, ball } from './shapes.js';
import { glass, emissive, material } from './materials.js';
import { prng } from './prng.js';

const DEG = Math.PI / 180;

// 1. Hexagonal crystal (quartz): a column with stepped, pointed ends.
export function gemHexCrystal() {
  const m = createMesh(), g = m.mat(glass('#9fb4ff', { shading: 0, interior: 1.1 }));
  m.inside(0, 0.05, 0);
  const b0 = ring(m, 6, 0.46, -0.5), b1 = ring(m, 6, 0.5, -0.3), t0 = ring(m, 6, 0.5, 0.38), t1 = ring(m, 6, 0.3, 0.7);
  apex(m, b0, -0.92, g); band(m, b0, b1, g); band(m, b1, t0, g); band(m, t0, t1, g); apex(m, t1, 1.02, g);
  return m.finish(0);
}

// 2. Step-cut (emerald): a long octagon with flat stair-step facets.
function octagon(m, a, b, c, y) { // points in turning order (x toward z)
  return [[a, -(b - c)], [a, b - c], [a - c, b], [-(a - c), b], [-a, b - c], [-a, -(b - c)], [-(a - c), -b], [a - c, -b]].map(([x, z]) => m.vert(x, y, z));
}
export function gemStepCut() {
  const m = createMesh(), g = m.mat(glass('#46e3a3', { shading: 0, interior: 1.0 }));
  m.inside(0, 0, 0);
  const rings = [octagon(m, 0.86, 0.6, 0.22, 0.4), octagon(m, 0.74, 0.5, 0.2, 0.28), octagon(m, 0.84, 0.58, 0.22, 0.1), octagon(m, 0.9, 0.62, 0.23, 0.0),
    octagon(m, 0.9, 0.62, 0.23, -0.06), octagon(m, 0.76, 0.5, 0.19, -0.26), octagon(m, 0.6, 0.38, 0.15, -0.46), octagon(m, 0.36, 0.18, 0.08, -0.64), octagon(m, 0.2, 0.06, 0.03, -0.74)];
  // the top (table) is smaller than the first step; rebuild it as a separate small ring for a flat top
  const table = octagon(m, 0.5, 0.28, 0.12, 0.46);
  band(m, table, rings[0], g); cap(m, table, g);
  for (let i = 0; i < rings.length - 1; i++) band(m, rings[i], rings[i + 1], g);
  cap(m, rings[rings.length - 1], g);
  return m.finish(0);
}

// 3. Teardrop amber with a dark speck trapped inside. Smooth.
export function gemTeardrop(seed = 7) {
  const rnd = prng(seed), m = createMesh(), g = m.mat(glass('#ffb454', { shading: 2, shin: 60, interior: 1.2, refr: 0.2, env: 0.9 }));
  const prof = []; // from the bottom up
  for (let i = 12; i >= 0; i--) { const a = (i / 12) * Math.PI; prof.push([0.82 * Math.sin(a) * Math.sin(a / 2), Math.cos(a) * 0.96]); }
  lathe(m, prof, 12, g);
  const dark = m.mat(material('solid', '#3a1a08', { spec: 0.6, shin: 20, env: 0.1 }));
  ball(m, 0.1 + rnd() * 0.06, -0.12 + rnd() * 0.1, 0.04, 0.09, 0.17, 0.07, 4, 6, dark);
  return m.finish(60);
}

// 4. Round brilliant (ruby): table, star and kite facets above, a pointed pavilion below.
export function gemBrilliant() {
  const m = createMesh(), g = m.mat(glass('#ff3f5f', { shading: 0, interior: 0.9, spec: 3, envBase: 0.04, reflTint: 0.8 }));
  m.inside(0, 0, 0);
  const T = ring(m, 8, 0.44, 0.38), S = ring(m, 8, 0.72, 0.24, 22.5 * DEG), Ga = ring(m, 16, 0.94, 0.04), Gb = ring(m, 16, 0.94, -0.03), P = ring(m, 8, 0.46, -0.5, 22.5 * DEG);
  cap(m, T, g); m.stitch(T, S, g); m.stitch(S, Ga, g); band(m, Ga, Gb, g); m.stitch(Gb, P, g); apex(m, P, -0.95, g);
  return m.finish(0);
}

// 5. Void gem: dark glass with three long horns (each at a different height) and a glowing core.
export function gemVoid() {
  const m = createMesh(), g = m.mat(glass('#4a2a9a', { shading: 0, interior: 1.5, tr: 1.15, tg: 1.0, tb: 1.2, rim: 1.0, spec: 3.2 }));
  const core = m.mat(emissive('#b583ff', { er: 1.5, shading: 1 }));
  m.inside(0, 0, 0);
  const radii = [1.0, 0.46, 0.92, 0.44, 1.02, 0.46, 0.9, 0.44], ys = [0.34, 0.02, -0.28, -0.02, 0.4, 0.02, -0.34, -0.02];
  const eq = []; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2; eq.push(m.vert(Math.cos(a) * radii[i], ys[i], Math.sin(a) * radii[i])); }
  apex(m, eq, 0.95, g); apex(m, eq, -0.9, g);
  ball(m, 0, 0.02, 0, 0.17, 0.21, 0.17, 4, 6, core);
  return m.finish(0);
}

// 6. Triangular prism with rainbow dispersion. Swings side to side so its triangular end stays in view.
export function gemPrism() {
  const m = createMesh(), g = m.mat(glass('#eef2ff', { shading: 0, interior: 0.9, disp: 0.9, rainbow: 0.85, refr: 0.22, tr: 1.05, tg: 1.05, tb: 1.05, spec: 3 }));
  m.inside(0, 0, 0);
  const tri = (s, z) => [[0, 0.9 * s], [-0.8 * s, -0.5 * s], [0.8 * s, -0.5 * s]].map(([x, y]) => m.vert(x, y - 0.04, z));
  const f2 = tri(0.66, 0.7), f1 = tri(1, 0.42), b1 = tri(1, -0.42), b2 = tri(0.66, -0.7);
  band(m, f2, f1, g); band(m, f1, b1, g); band(m, b1, b2, g); cap(m, f2, g); cap(m, b2, g);
  return m.finish(0);
}
