// Draws things that rise past the bucket. Uses pre-drawn sprites, so each draw is cheap.
import { buildItemSprites } from './itemSprites.js';
import { PRISM_STEPS } from './palette.js';
import { clamp01 } from './safe.js';

export const KINDS = { gem: 1, ore: 2, hazard: 3, relic: 4 };

export function createItems() {
  let sp = null;
  return {
    get size() { return sp ? sp.size : 0; },
    rebuild(size, dpr) { sp = buildItemSprites(Math.max(16, Math.round(size)), dpr); },
    // Draw one item. (x, y) is its centre. scale 1 = normal. fade 0..1. t = time in ms. seed = tiny per-item number.
    draw(ctx, kind, tier, hazard, x, y, scale, fade, t, seed) {
      if (!sp || fade <= 0.01) return;
      const S = sp.size, s = S * scale;
      let img = null;
      if (kind === 'gem') {
        const ti = Math.max(1, Math.min(6, Math.floor(tier) || 1));
        img = ti === 6 ? sp.prism[Math.floor(t / 120 + seed) % sp.prism.length] : sp.gems[ti];
      } else if (kind === 'ore') img = sp.ore;
      else if (kind === 'relic') img = sp.relic;
      else if (kind === 'hazard') {
        if (sp.warn) { // red warning rim: pulses fast so it reads in under 200 ms
          ctx.globalAlpha = fade * (0.7 + 0.3 * Math.sin(t / 110 + seed));
          ctx.drawImage(sp.warn, x - s * 0.75, y - s * 0.75, s * 1.5, s * 1.5);
        }
        if (hazard === 'bat') img = sp.bats[Math.floor(t / 110 + seed) % 4 === 3 ? 1 : Math.floor(t / 110 + seed) % 4 % 3];
        else if (hazard === 'root') {
          ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t / 420 + seed) * 0.12); ctx.globalAlpha = fade;
          if (sp.root) ctx.drawImage(sp.root, -s / 2, -s / 2, s, s); ctx.restore(); ctx.globalAlpha = 1; return;
        } else if (hazard === 'void') {
          ctx.globalAlpha = fade; if (sp.voidOrb) ctx.drawImage(sp.voidOrb, x - s / 2, y - s / 2, s, s);
          ctx.strokeStyle = 'rgba(201,168,255,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath();
          ctx.arc(x, y, s * (0.5 + 0.06 * Math.sin(t / 160 + seed)), t / 300, t / 300 + 4); ctx.stroke(); ctx.globalAlpha = 1; return;
        } else if (hazard === 'steam') {
          ctx.fillStyle = '#e8eef8';
          for (let i = 0; i < 3; i++) { const p = (t / 700 + i / 3 + seed) % 1; ctx.globalAlpha = fade * 0.55 * (1 - p); ctx.beginPath(); ctx.arc(x + Math.sin(p * 6 + i) * s * 0.12, y - p * s * 0.3, s * (0.18 + p * 0.22), 0, 6.2832); ctx.fill(); }
          ctx.globalAlpha = 1; return;
        } else img = sp.rock;
      }
      if (!img) return;
      ctx.globalAlpha = fade;
      ctx.drawImage(img, x - s / 2, y - s / 2, s, s);
      if (kind === 'gem') { // slow glint that slides across the face
        const k = ((t / 1600 + seed * 0.37) % 1);
        if (k < 0.35) {
          const g = Math.sin((k / 0.35) * Math.PI), gx = x - s * 0.25 + k * s * 1.4, gy = y - s * 0.3 + k * s * 0.3, r = s * 0.12 * g;
          ctx.globalAlpha = fade * g; ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.moveTo(gx, gy - r * 2); ctx.lineTo(gx + r * 0.4, gy - r * 0.4); ctx.lineTo(gx + r * 2, gy); ctx.lineTo(gx + r * 0.4, gy + r * 0.4);
          ctx.lineTo(gx, gy + r * 2); ctx.lineTo(gx - r * 0.4, gy + r * 0.4); ctx.lineTo(gx - r * 2, gy); ctx.lineTo(gx - r * 0.4, gy - r * 0.4); ctx.closePath(); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },
  };
}
