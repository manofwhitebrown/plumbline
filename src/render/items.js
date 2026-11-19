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
  // Draws one hazard sprite from the atlas (main size).
  function art(ctx, name, x, y, w, h, frame) { const a = sp.art; return a ? a.atlas.draw(ctx, spriteKey('hz', 0, name, BASE_IDX, frame), x, y, w, h) : false; }
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
        const hz = hazard === 'bat' || hazard === 'root' || hazard === 'void' || hazard === 'steam' ? hazard : 'rock';
        const still = reduce; // Reduce motion: no flapping, swaying, spinning or pulsing
        ctx.globalAlpha = fade * (still ? 0.8 : 0.7 + 0.3 * Math.sin(t / 110 + seed)); // red warning glow, about 1.4 pulses a second
        art(ctx, 'warn', x - s * 0.75, y - s * 0.75, s * 1.5, s * 1.5, 0);
        ctx.globalAlpha = fade;
        if (hz === 'bat') {
          const step = still ? 1 : (((Math.floor(t / 110 + seed * 3) % 4) + 4) % 4); // wings: up, level, down, level
          art(ctx, 'bat', x - s / 2, y - s / 2, s, s, step === 3 ? 1 : step);
        } else if (hz === 'root') {
          ctx.save(); ctx.translate(x, y); if (!still) ctx.rotate(Math.sin(t / 420 + seed) * 0.12);
          art(ctx, 'root', -s / 2, -s / 2, s, s, 0); ctx.restore();
        } else if (hz === 'void') {
          art(ctx, 'void', x - s / 2, y - s / 2, s, s, 0);
          ctx.save(); ctx.translate(x, y); if (!still && !low) ctx.rotate(t / 700 + seed); // orbiting dots
          art(ctx, 'voidDots', -s / 2, -s / 2, s, s, 0); ctx.restore();
        } else if (hz === 'steam') {
          art(ctx, 'steam', x - s / 2, y - s / 2, s, s, still || low ? 0 : (((Math.floor(t / 340 + seed * 3) % 3) + 3) % 3));
          ctx.globalAlpha = fade * (still ? 0.8 : 0.55 + 0.45 * Math.sin(t / 260 + seed)); // warning ring pulses about 0.6 times a second
          art(ctx, 'steamRing', x - s / 2, y - s / 2, s, s, 0);
        } else art(ctx, 'rock', x - s / 2, y - s / 2, s, s, 0);
        ctx.globalAlpha = 1; return;
      }
      if (!img) return;
      ctx.globalAlpha = fade;
      ctx.drawImage(img, x - s / 2, y - s / 2, s, s);
      ctx.globalAlpha = 1;
    },
  };
}
