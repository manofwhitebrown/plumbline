// Shared helpers for faceted gems: facet fill lit from the top-left, rings of facets, rim, glow.
import { hexToRgb, mix, lighten, darken, rgbToCss } from './color.js';
import { softGlow, contactShadow, LIGHT, facetLight } from './shapes.js';

export function gemPal(c) { return { base: hexToRgb(c.base), light: hexToRgb(c.light), dark: hexToRgb(c.dark) }; }
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const TAU = Math.PI * 2;

// Traces a flat polygon [x,y,...] (no fill).
export function tracePoly(g, p) { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); }

// Fills one flat facet. b = 0..1 how much it faces the light. The gradient runs from its lit side to its dark side.
export function facet(g, p, b, pal, spread = 0.2) {
  let cx = 0, cy = 0; const n = p.length / 2;
  for (let i = 0; i < p.length; i += 2) { cx += p[i]; cy += p[i + 1]; }
  cx /= n; cy /= n;
  let r = 0; for (let i = 0; i < p.length; i += 2) r = Math.max(r, Math.hypot(p[i] - cx, p[i + 1] - cy));
  const gr = g.createLinearGradient(cx + LIGHT.x * r, cy + LIGHT.y * r, cx - LIGHT.x * r, cy - LIGHT.y * r);
  gr.addColorStop(0, rgbToCss(mix(pal.dark, pal.light, clamp01(b + spread))));
  gr.addColorStop(1, rgbToCss(mix(pal.dark, pal.light, clamp01(b - spread))));
  g.fillStyle = gr; tracePoly(g, p); g.fill();
}

// Ring of facets between two polygons with the same number of corners (outer A, inner B).
export function ringFacets(g, A, B, cx, cy, pal, bias = 0, spread = 0.2) {
  const n = A.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const mx = (A[i * 2] + A[j * 2]) / 2 - cx, my = (A[i * 2 + 1] + A[j * 2 + 1]) / 2 - cy;
    facet(g, [A[i * 2], A[i * 2 + 1], A[j * 2], A[j * 2 + 1], B[j * 2], B[j * 2 + 1], B[i * 2], B[i * 2 + 1]], clamp01(facetLight(Math.atan2(my, mx)) + bias), pal, spread);
  }
}
// Regular polygon points. rx, ry radii, rot start angle (radians).
export function ngon(cx, cy, rx, ry, n, rot) {
  const p = []; for (let i = 0; i < n; i++) { const a = rot + (i / n) * TAU; p.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry); }
  return p;
}
// Soft coloured glow and tiny contact shadow behind a gem.
export function underGlow(g, S, pal, strength = 1) {
  softGlow(g, S * 0.5, S * 0.54, S * 0.5, pal.base, 0.34 * strength); // radius 0.5 S so it fades to nothing at the sprite edge
  contactShadow(g, S * 0.5, S * 0.91, S * 0.26, S * 0.055, 0.3);
}
// Crisp edge: a dark outline, then a bright rim light on the lit (top-left) edge.
export function edgeAndRim(g, S, pal, trace) {
  g.save(); g.lineJoin = 'round';
  trace(g); g.lineWidth = Math.max(1, S * 0.035); g.strokeStyle = rgbToCss(darken(pal.dark, 0.55), 0.85); g.stroke();
  trace(g);
  const gr = g.createLinearGradient(S * 0.15, S * 0.1, S * 0.8, S * 0.9);
  gr.addColorStop(0, rgbToCss(lighten(pal.light, 0.6), 0.95)); gr.addColorStop(0.5, rgbToCss(lighten(pal.light, 0.3), 0.25)); gr.addColorStop(1, rgbToCss(pal.dark, 0.0));
  g.lineWidth = Math.max(0.8, S * 0.022); g.strokeStyle = gr; g.stroke();
  g.restore();
}
// A small white specular dot and streak.
export function specular(g, x, y, r, a = 0.9) {
  g.save(); g.fillStyle = `rgba(255,250,240,${a})`;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.globalAlpha = a * 0.6; g.beginPath(); g.ellipse(x + r * 1.8, y + r * 1.4, r * 0.55, r * 0.55, 0, 0, TAU); g.fill();
  g.restore();
}
