// cinematics/common.js: shared helpers for the overlay moments.
import { clamp01 } from '../../feel/spring.js';
import { ease, seg } from '../../ui/motion/easing.js';
import { TOKENS } from '../palette.js';

export { clamp01, ease, seg, TOKENS };

// Wrap a callback so it runs at most once (skip, Reduce motion and normal end can all reach it).
export function once(fn) { let done = false; return (...a) => { if (done) return undefined; done = true; return typeof fn === 'function' ? fn(...a) : undefined; }; }

export function rgba(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return 'rgba(255,255,255,' + a + ')';
  const n = parseInt(m[1], 16);
  return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}

// Soft radial glow, cheap and bounded.
export function glow(ctx, x, y, r, hex, a) {
  if (a <= 0.002 || r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(hex, a)); g.addColorStop(1, rgba(hex, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

export function bucketGlyph(ctx, x, y, s, lit) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#2a3555'; ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.4); ctx.lineTo(s * 0.5, -s * 0.4); ctx.lineTo(s * 0.38, s * 0.45); ctx.lineTo(-s * 0.38, s * 0.45); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8d97b8'; ctx.fillRect(-s * 0.52, -s * 0.46, s * 1.04, s * 0.1);
  glow(ctx, 0, -s * 0.05, s * 1.4, TOKENS.goldSoft, 0.35 * lit);
  ctx.fillStyle = 'rgba(255,227,161,' + (0.4 + 0.6 * lit) + ')'; ctx.beginPath(); ctx.arc(0, -s * 0.05, s * 0.09, 0, 6.2832); ctx.fill();
  ctx.restore();
}
