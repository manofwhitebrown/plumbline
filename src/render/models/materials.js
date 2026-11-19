// Materials: glass, metal, wood, stone, emissive. Colours go in as '#rrggbb' and are stored linear.
function lin(hex) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (v / 255) * (v / 255));
  return c;
}
const BASE = { kind: 'solid', metal: 0, spec: 0.3, shin: 30, env: 0.12, f0: 0.04, rim: 0.25, grain: 0, gs: 1, bump: 0, er: 0, twoSided: false,
  interior: 0.8, refr: 0.12, disp: 0, tr: 1, tg: 1, tb: 1, body: 1, envBase: 0.1, rainbow: 0, shading: 2, rimTint: null, rimAll: false, contrast: 0.8, reflTint: 0.55 };

export function material(kind, hex, o = {}) {
  const c = lin(hex);
  return Object.assign({}, BASE, { kind, r: c[0], g: c[1], b: c[2] }, o);
}
// Translucent gem: the far side shows through the near side, bent by the face angle.
export function glass(hex, o = {}) {
  const c = lin(hex), t = (k) => Math.min(1.1, 0.1 + Math.pow(k, 0.45) * 0.95);
  return material('glass', hex, Object.assign({ spec: 2.4, shin: 90, env: 1.1, f0: 0.07, rim: 0.5, tr: t(c[0]), tg: t(c[1]), tb: t(c[2]), shading: 0 }, o));
}
export function metal(hex, o = {}) { return material('solid', hex, Object.assign({ metal: 0.92, spec: 1.1, shin: 48, env: 0.85, f0: 0.85, rim: 0.2, shading: 2 }, o)); }
export function wood(hex, o = {}) { return material('solid', hex, Object.assign({ spec: 0.18, shin: 16, env: 0.05, grain: 0.35, gs: 7, bump: 0.05, rim: 0.2 }, o)); }
export function stone(hex, o = {}) { return material('solid', hex, Object.assign({ spec: 0.08, shin: 10, env: 0.03, grain: 0.5, gs: 3.4, bump: 0.12, rim: 0.3 }, o)); }
export function emissive(hex, o = {}) { return material('solid', hex, Object.assign({ er: 1.6, spec: 0, env: 0, rim: 0, shading: 1 }, o)); }
