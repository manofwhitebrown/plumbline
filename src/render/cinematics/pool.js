// cinematics/pool.js: a small particle pool for the overlay layer. Cap 300, no allocation per frame, deterministic with an injected rand.
export const CINE_MAX = 300;

export function createCinePool(max, rand) {
  const cap = Math.min(CINE_MAX, Math.max(0, max == null ? CINE_MAX : max | 0));
  const rnd = typeof rand === 'function' ? rand : Math.random;
  const items = [];
  for (let i = 0; i < cap; i++) items.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, g: 0, life: 0, max: 1, size: 2, color: '#fff', rot: 0, spin: 0, shape: 0 });
  let live = 0;
  const pool = {
    get live() { return live; }, get cap() { return cap; }, items, rnd,
    // shape: 0 dot, 1 streak (along velocity), 2 fibre (thin tilted bar), 3 glint (4-point star)
    emit(x, y, vx, vy, life, size, color, g, shape) {
      if (live >= cap) return null;
      for (let i = 0; i < cap; i++) {
        const p = items[i];
        if (p.on) continue;
        p.on = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.g = g || 0; p.life = life; p.max = life; p.size = size; p.color = color;
        p.rot = rnd() * 6.283; p.spin = (rnd() - 0.5) * 3; p.shape = shape || 0; live++; return p;
      }
      return null;
    },
    burst(x, y, n, color, speed, life, size, g, shape) {
      for (let i = 0; i < n; i++) {
        const a = rnd() * 6.2832, s = speed * (0.35 + rnd() * 0.65);
        if (!pool.emit(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.6 + rnd() * 0.5), size * (0.6 + rnd() * 0.8), color, g, shape)) break;
      }
    },
    update(dtMs) {
      const dt = Math.min(Math.max(dtMs || 0, 0), 64) / 1000;
      for (let i = 0; i < cap; i++) {
        const p = items[i];
        if (!p.on) continue;
        p.life -= dt * 1000;
        if (p.life <= 0) { p.on = false; live--; continue; }
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
      }
    },
    draw(ctx) {
      for (let i = 0; i < cap; i++) {
        const p = items[i];
        if (!p.on) continue;
        const a = Math.min(1, p.life / (p.max * 0.5));
        ctx.globalAlpha = a < 0 ? 0 : a; ctx.fillStyle = p.color; ctx.strokeStyle = p.color;
        if (p.shape === 1) { ctx.lineWidth = p.size; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05); ctx.stroke(); }
        else if (p.shape === 2) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size * 2.5, -0.5, p.size * 5, 1); ctx.restore(); }
        else if (p.shape === 3) { const s = p.size * 2; ctx.beginPath(); ctx.moveTo(p.x - s, p.y); ctx.lineTo(p.x, p.y - s * 0.25); ctx.lineTo(p.x + s, p.y); ctx.lineTo(p.x, p.y + s * 0.25); ctx.closePath(); ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x + s * 0.25, p.y); ctx.lineTo(p.x, p.y + s); ctx.lineTo(p.x - s * 0.25, p.y); ctx.closePath(); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.2832); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    },
    clear() { for (let i = 0; i < cap; i++) items[i].on = false; live = 0; },
  };
  return pool;
}
