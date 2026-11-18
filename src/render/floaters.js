// Pooled floating text ("+12", "x3 combo"). Rises with ease-out and fades.
import { createPool } from './pool.js';
import { easeOut } from './safe.js';

const FONTS = [];
for (let s = 10; s <= 40; s += 2) FONTS[s] = `800 ${s}px system-ui, -apple-system, "Segoe UI", sans-serif`;
function fontFor(size) { const s = Math.max(10, Math.min(40, Math.round(size / 2) * 2)); return FONTS[s]; }

export function createFloaters(max = 24) {
  const pool = createPool(max, () => ({ text: '', x: 0, y: 0, rise: 40, life: 0, max: 1, size: 16, color: '#fff', font: FONTS[16] }));
  return {
    pool,
    get count() { return pool.live; },
    clear() { pool.clear(); },
    add(text, x, y, size, color, rise = 44, life = 900) {
      const f = pool.acquire();
      f.text = String(text); f.x = x; f.y = y; f.size = size; f.font = fontFor(size);
      f.color = color; f.rise = rise; f.life = life; f.max = life;
      return f;
    },
    update(dtMs) {
      const items = pool.items;
      for (let i = 0; i < items.length; i++) { const f = items[i]; if (f.alive) { f.life -= dtMs; if (f.life <= 0) pool.release(f); } }
    },
    draw(ctx) {
      const items = pool.items;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < items.length; i++) {
        const f = items[i];
        if (!f.alive) continue;
        const t = 1 - f.life / f.max;
        ctx.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
        ctx.font = f.font;
        const y = f.y - easeOut(t) * f.rise;
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(7,10,18,0.75)'; ctx.strokeText(f.text, f.x, y);
        ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, y);
      }
      ctx.globalAlpha = 1;
    },
  };
}
