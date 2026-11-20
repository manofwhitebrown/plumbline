// Pooled particles. Cap 300 (less on low quality or reduce motion).
import { createPool } from './pool.js';
import { rand } from './rand.js';

export const MAX_PARTICLES = 300;
// kinds: 0 spark, 1 dust, 2 glint (star), 3 ember, 4 steam, 5 fibre, 6 coin glint, 7 confetti, 8 shockwave ring
// Kinds 0-3 and 6-8 use pre-rendered sprites (art/fxSprites.js) when they exist; otherwise the flat shapes below.
const SPRITE = ['spark', 'dust', 'glint', 'ember', null, null, 'coin', 'confetti', 'ring'];
export function createParticles() {
  const pool = createPool(MAX_PARTICLES, () => ({ x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 0, life: 0, max: 1, size: 2, kind: 0, color: '#fff', spin: 0, rot: 0 }));
  let cap = MAX_PARTICLES;
  let sprites = null;
  const api = {
    pool,
    get count() { return pool.live; },
    setSprites(sp) { sprites = sp && sp.draw ? sp : null; },
    setCap(n) { cap = Math.max(0, Math.min(MAX_PARTICLES, n | 0)); },
    clear() { pool.clear(); },
    emit(kind, x, y, vx, vy, life, size, color, g = 0, drag = 0) {
      if (pool.live >= cap) return null; // full: skip, never recycle visible ones
      const p = pool.acquire();
      p.kind = kind; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life;
      p.size = size; p.color = color; p.g = g; p.drag = drag; p.spin = (rand() - 0.5) * 8; p.rot = rand() * 6.28;
      return p;
    },
    burst(x, y, n, color, speed = 120, kind = 0, life = 480, size = 2.4, g = 220) {
      for (let i = 0; i < n; i++) {
        const a = rand() * 6.2832, s = speed * (0.35 + rand() * 0.65);
        api.emit(kind, x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.6 + rand() * 0.5), size * (0.6 + rand() * 0.8), color, g, 1.6);
      }
    },
    update(dtMs) {
      const dt = Math.min(dtMs, 64) / 1000;
      const items = pool.items;
      for (let i = 0; i < items.length; i++) {
        const p = items[i];
        if (!p.alive) continue;
        p.life -= dt * 1000;
        if (p.life <= 0) { pool.release(p); continue; }
        const d = 1 - Math.min(0.95, p.drag * dt);
        p.vx *= d; p.vy = p.vy * d + p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
      }
    },
    draw(ctx) {
      const items = pool.items;
      for (let i = 0; i < items.length; i++) {
        const p = items[i];
        if (!p.alive) continue;
        const k = p.life / p.max; // 1 -> 0
        ctx.globalAlpha = p.kind === 8 ? k : (k > 0.5 ? 1 : k * 2);
        const sk = SPRITE[p.kind];
        if (sk && sprites) { // sprite path: one drawImage
          const px = p.kind === 8 ? p.size * (0.3 + (1 - k) * 1.5) : p.kind === 2 ? p.size * (0.6 + k) * 4 : p.kind === 1 ? p.size * (1.6 - k * 0.6) * 3 : p.size * 4;
          if (sprites.draw(ctx, sk, p.color, p.x, p.y, px, p.kind === 7 ? p.rot : 0)) continue;
        }
        ctx.fillStyle = p.color;
        if (p.kind === 8) { ctx.globalAlpha *= 0.8; ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.3 + (1 - k) * 0.75), 0, 6.2832); ctx.stroke(); }
        else if (p.kind === 7) { ctx.fillRect(p.x - p.size, p.y - p.size * 0.5, p.size * 2, p.size); }
        else if (p.kind === 6 || p.kind === 2) { // glint: little 4-point star
          const s = p.size * (0.6 + k);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - s * 2); ctx.lineTo(p.x + s * 0.4, p.y - s * 0.4); ctx.lineTo(p.x + s * 2, p.y);
          ctx.lineTo(p.x + s * 0.4, p.y + s * 0.4); ctx.lineTo(p.x, p.y + s * 2); ctx.lineTo(p.x - s * 0.4, p.y + s * 0.4);
          ctx.lineTo(p.x - s * 2, p.y); ctx.lineTo(p.x - s * 0.4, p.y - s * 0.4); ctx.closePath(); ctx.fill();
        } else if (p.kind === 4) { // steam: soft growing puff
          ctx.globalAlpha *= 0.35; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (2 - k), 0, 6.2832); ctx.fill();
        } else if (p.kind === 1) { // dust
          ctx.globalAlpha *= 0.55; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.6 - k * 0.6), 0, 6.2832); ctx.fill();
        } else if (p.kind === 5) { // fibre: tiny rotating line
          ctx.fillRect(p.x - p.size, p.y - 0.5, p.size * 2, 1);
        } else { // spark / ember
          ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
        }
      }
      ctx.globalAlpha = 1;
    },
  };
  return api;
}
