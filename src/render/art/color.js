// Colour helpers. Work in plain [r,g,b] arrays; build strings only when asked.
const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

export function hexToRgb(hex) {
  const h = String(hex || '#000000').replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0');
  return [parseInt(f.slice(0, 2), 16) || 0, parseInt(f.slice(2, 4), 16) || 0, parseInt(f.slice(4, 6), 16) || 0];
}
export function rgbToCss(c, a = 1) {
  return a >= 1 ? `rgb(${clamp255(c[0])},${clamp255(c[1])},${clamp255(c[2])})`
    : `rgba(${clamp255(c[0])},${clamp255(c[1])},${clamp255(c[2])},${Math.max(0, a).toFixed(3)})`;
}
export function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
export function lighten(c, t) { return mix(c, [255, 244, 224], t); } // toward warm white, never pure white
export function darken(c, t) { return mix(c, [2, 1, 8], t); }        // toward ink, never pure black
export function rgbToHsl(c) {
  const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
// Mixes two colours through HSL (keeps saturation; better for rainbows and glows).
export function mixHsl(a, b, t) {
  const A = rgbToHsl(a), B = rgbToHsl(b);
  let dh = B[0] - A[0];
  if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  return hslToRgb(A[0] + dh * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
// Builds a palette ramp: n colours from dark to light through the given stops (hex or rgb).
export function ramp(stops, n = 16) {
  const s = stops.map((c) => (typeof c === 'string' ? hexToRgb(c) : c));
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = n === 1 ? 0 : (i / (n - 1)) * (s.length - 1);
    const k = Math.min(s.length - 2, Math.floor(p));
    out.push(mix(s[k], s[k + 1] || s[k], p - k));
  }
  return out;
}
// Reads a ramp at 0..1 without allocating.
export function rampAt(r, t) { return r[Math.max(0, Math.min(r.length - 1, Math.round(t * (r.length - 1))))]; }
