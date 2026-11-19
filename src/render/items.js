// Draws things that rise past the bucket. Uses pre-drawn sprites, so each draw is cheap.
import { buildItemSprites, disposeItemSprites } from './itemSprites.js';
import { spriteKey } from './art/atlas.js';
import { pickSizeIdx, BASE_IDX, GLINT_FRAMES } from './art/itemAtlas.js';
import { PRISM_STEPS } from './palette.js';
import { clamp01 } from './safe.js';

export const KINDS = { gem: 1, ore: 2, hazard: 3, relic: 4 };

export function createItems() {
  let sp = null, lastSize = 0, lastDpr = 1, low = false, reduce = false;
  function build() { disposeItemSprites(sp); sp = lastSize ? buildItemSprites(lastSize, lastDpr, low) : null; }
  // Draws one atlas sprite (gem, ore, relic) centred at x,y with side s.
  function drawArt(ctx, kind, tier, scale, x, y, s, frame) {
    const art = sp.art; if (!art) return false;
    const idx = pickSizeIdx(art.sizes, scale);
    // animation frames only exist at the main size; other sizes use frame 0
    const f = idx === BASE_IDX ? frame : 0;
    return art.atlas.draw(ctx, spriteKey(kind, tier, 'any', idx, f), x - s / 2, y - s / 2, s, s);
  }
  return {
    get size() { return sp ? sp.size : 0; },
    rebuild(size, dpr) { lastSize = Math.max(16, Math.round(size)); lastDpr = dpr; build(); },
    setLow(v) { v = !!v; if (v !== low) { low = v; build(); } },
    setReduceMotion(v) { reduce = !!v; },
    destroy() { disposeItemSprites(sp); sp = null; },
    // Draw one item. (x, y) is its centre. scale 1 = normal. fade 0..1. t = time in ms. seed = tiny per-item number.
    draw(ctx, kind, tier, hazard, x, y, scale, fade, t, seed) {
      if (!sp || fade <= 0.01) return;
      const S = sp.size, s = S * scale;
      let img = null;
      if (kind === 'gem') {
        const ti = Math.max(1, Math.min(6, Math.floor(tier) || 1));
        const animate = !low && !reduce && ti >= 5; // void swirl and prism rainbow: 5 steps a second, never a flash
        const frame = animate ? (((Math.floor(t / 200 + seed * 8) % 8) + 8) % 8) : 0;
        ctx.globalAlpha = fade;
        drawArt(ctx, 'gem', ti, scale, x, y, s, frame);
        if (!low && !reduce) { // glint sweeps across every ~3 s (pre-rendered band, already masked by the gem shape)
          const k = (((t / 3200 + seed * 0.37) % 1) + 1) % 1;
          if (k < 0.3) { ctx.globalAlpha = fade * Math.sin((k / 0.3) * Math.PI); drawArt(ctx, 'glint', ti, 1, x, y, s, Math.min(GLINT_FRAMES - 1, Math.floor((k / 0.3) * GLINT_FRAMES))); }
        }
        ctx.globalAlpha = 1; return;
      } else if (kind === 'ore' || kind === 'relic') {
        ctx.globalAlpha = fade; drawArt(ctx, kind, 0, scale, x, y, s, 0); ctx.globalAlpha = 1; return;
      } else if (kind === 'hazard') {
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
      ctx.globalAlpha = 1;
    },
  };
}
