// Canvas shape helpers: rounded polygons, soft glow, inner shadow, bevel, rim light.
// Every function is safe: a missing ctx or bad numbers do nothing.
import { rgbToCss } from './color.js';

// Fixed light from the top-left. Everything in the game is lit from here.
export const LIGHT = { x: -0.6, y: -0.8 };

// Traces a polygon (flat [x,y,x,y...] array) with rounded corners. Does not fill.
export function roundedPoly(ctx, pts, r = 2) {
  const n = pts.length / 2;
  if (!ctx || n < 3) return;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const px = pts[((i + n - 1) % n) * 2], py = pts[((i + n - 1) % n) * 2 + 1];
    const cx = pts[i * 2], cy = pts[i * 2 + 1];
    const nx = pts[((i + 1) % n) * 2], ny = pts[((i + 1) % n) * 2 + 1];
    const l1 = Math.hypot(cx - px, cy - py) || 1, l2 = Math.hypot(nx - cx, ny - cy) || 1;
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const ax = cx + ((px - cx) / l1) * rr, ay = cy + ((py - cy) / l1) * rr;
    const bx = cx + ((nx - cx) / l2) * rr, by = cy + ((ny - cy) / l2) * rr;
    if (i === 0) ctx.moveTo(ax, ay); else ctx.lineTo(ax, ay);
    ctx.quadraticCurveTo(cx, cy, bx, by);
  }
  ctx.closePath();
}

// Rounded rectangle path (no reliance on ctx.roundRect, which old WebViews lack).
export function roundRectPath(ctx, x, y, w, h, r) {
  if (!ctx) return;
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Soft round glow (radial gradient). Colour is an [r,g,b] array.
export function softGlow(ctx, x, y, radius, rgb, alpha = 0.5) {
  if (!ctx || !(radius > 0)) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, rgbToCss(rgb, alpha));
  g.addColorStop(0.45, rgbToCss(rgb, alpha * 0.35));
  g.addColorStop(1, rgbToCss(rgb, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

// Linear gradient across a box, lit from the top-left (light stop first, dark last).
export function litGradient(ctx, x, y, w, h, light, mid, dark) {
  const g = ctx.createLinearGradient(x - LIGHT.x * w * 0.5, y - LIGHT.y * h * 0.5, x + LIGHT.x * w * 0.5 + w, y + LIGHT.y * h * 0.5 + h);
  g.addColorStop(0, rgbToCss(light)); g.addColorStop(0.5, rgbToCss(mid)); g.addColorStop(1, rgbToCss(dark));
  return g;
}

// Inner shadow: darkens the inside edge of the current path, keeps the fill. Call after filling.
export function innerShadow(ctx, w, h, alpha = 0.4, blur = 3) {
  if (!ctx) return;
  ctx.save();
  ctx.clip();
  ctx.shadowColor = `rgba(2,1,8,${alpha})`;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = -LIGHT.x * 2; ctx.shadowOffsetY = -LIGHT.y * 2;
  ctx.lineWidth = blur * 2;
  ctx.strokeStyle = 'rgba(2,1,8,1)';
  ctx.strokeRect(-blur * 2, -blur * 2, w + blur * 4, h + blur * 4);
  ctx.restore();
}

// Bevel: a bright line on the lit edges and a dark line on the shaded edges of a rounded rect.
export function bevelRect(ctx, x, y, w, h, r, light, dark, lw = 1) {
  if (!ctx) return;
  ctx.save();
  ctx.lineWidth = lw;
  roundRectPath(ctx, x + lw / 2, y + lw / 2, w - lw, h - lw, r);
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, rgbToCss(light, 0.9)); g.addColorStop(0.5, rgbToCss(light, 0.08));
  g.addColorStop(0.55, rgbToCss(dark, 0.08)); g.addColorStop(1, rgbToCss(dark, 0.85));
  ctx.strokeStyle = g; ctx.stroke();
  ctx.restore();
}

// Rim light: a thin bright stroke along the top-left of the current path.
export function rimLight(ctx, x, y, w, h, rgb, alpha = 0.8, lw = 1.2) {
  if (!ctx) return;
  ctx.save();
  const g = ctx.createLinearGradient(x, y, x + w * 0.7, y + h * 0.7);
  g.addColorStop(0, rgbToCss(rgb, alpha)); g.addColorStop(0.6, rgbToCss(rgb, 0));
  ctx.lineWidth = lw; ctx.strokeStyle = g; ctx.stroke();
  ctx.restore();
}

// Contact shadow: a small dark ellipse under a sprite.
export function contactShadow(ctx, cx, cy, rx, ry, alpha = 0.35) {
  if (!ctx) return;
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(2,1,8,${alpha})`); g.addColorStop(1, 'rgba(2,1,8,0)');
  ctx.fillStyle = g; ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

// Normal-style shading for a flat facet: brightness 0..1 from the facet's facing angle.
export function facetLight(angleRad) {
  const nx = Math.cos(angleRad), ny = Math.sin(angleRad);
  const d = nx * LIGHT.x + ny * LIGHT.y; // -1..1, 1 = faces the light
  return Math.max(0, Math.min(1, 0.5 + d * 0.5));
}
