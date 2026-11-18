// Hanging roots, crystals and embers on the well sides (middle parallax layer).
import { hash01 } from './rand.js';

const CHUNK = 150;

// Draws decor for the visible range. scroll = pixels. side strips are 'sideW' wide.
export function drawDecor(ctx, biomeId, w, h, scroll, sideW, alpha, t) {
  if (alpha <= 0.01) return;
  ctx.globalAlpha = alpha;
  const first = Math.floor(scroll / CHUNK) - 1, last = Math.floor((scroll + h) / CHUNK) + 1;
  for (let k = first; k <= last; k++) {
    for (let side = 0; side < 2; side++) {
      const hs = hash01(k * 2 + side + 91);
      if (hs < 0.4) continue;
      const y = k * CHUNK - scroll + hash01(k * 5 + side) * (CHUNK - 40);
      const x = side === 0 ? sideW * 0.9 : w - sideW * 0.9, dir = side === 0 ? 1 : -1;
      const size = 22 + hash01(k * 3 + side + 7) * 40;
      if (biomeId === 'quartz') crystal(ctx, x, y, size, dir, '#bcd0ff', '#5d7bb8', t, k);
      else if (biomeId === 'void') crystal(ctx, x, y, size * 0.8, dir, '#c9a8ff', '#6a3fe0', t, k);
      else if (biomeId === 'abyss') crystal(ctx, x, y, size * 0.9, dir, '#ff9ad0', '#9a2a80', t, k);
      else if (biomeId === 'magma') ember(ctx, x, y, size, dir, t, k);
      else root(ctx, x, y, size, dir, biomeId === 'amber' ? '#a9783a' : '#6b4a2c', t, k);
    }
  }
  ctx.globalAlpha = 1;
}

function root(ctx, x, y, len, dir, col, t, k) {
  const sw = Math.sin(t / 900 + k) * 3;
  ctx.beginPath(); ctx.moveTo(x - dir * 8, y); ctx.bezierCurveTo(x + dir * 10, y + len * 0.3, x + dir * 22 + sw, y + len * 0.6, x + dir * 12 + sw * 1.5, y + len * 1.1);
  ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.strokeStyle = col; ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.stroke();
}
function crystal(ctx, x, y, s, dir, light, dark, t, k) {
  const glint = 0.5 + 0.5 * Math.sin(t / 700 + k * 2);
  for (let i = 0; i < 3; i++) {
    const ox = dir * i * s * 0.28, h2 = s * (1 - i * 0.22);
    ctx.beginPath(); ctx.moveTo(x + ox - 7, y + i * 6); ctx.lineTo(x + ox + 7, y + i * 6); ctx.lineTo(x + ox + dir * 4, y + i * 6 + h2); ctx.closePath();
    ctx.fillStyle = dark; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = light; ctx.globalAlpha *= 0.9; ctx.stroke(); ctx.globalAlpha /= 0.9;
  }
  ctx.fillStyle = light; ctx.globalAlpha *= 0.4 + 0.5 * glint; ctx.fillRect(x - 1, y + s * 0.4, 2, 2); ctx.globalAlpha /= 0.4 + 0.5 * glint;
}
function ember(ctx, x, y, s, dir, t, k) {
  ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y); ctx.lineTo(x + dir * 3, y + s * 0.8); ctx.closePath(); ctx.fillStyle = '#3a130d'; ctx.fill();
  const p = (t / 1400 + k * 0.37) % 1;
  ctx.fillStyle = '#ff9a5a'; ctx.globalAlpha *= 1 - p; ctx.beginPath(); ctx.arc(x + dir * 3, y + s * 0.8 + p * 40, 2.6 * (1 - p * 0.5), 0, 6.2832); ctx.fill(); ctx.globalAlpha /= (1 - p) || 1;
  ctx.fillStyle = '#ff6a3a'; ctx.fillRect(x + dir * 3 - 1, y + s * 0.65, 2, 3);
}
