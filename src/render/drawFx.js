// Draws rings, chain threads, haul streaks and screen flash. ([INTEGRATE-1] the milestone line is the cinematic's.)
import { tileCx, tileCy } from './layout.js';
import { easeOut } from './safe.js';

export function drawFx(ctx, sc, bucketOffY) {
  const L = sc.L;
  // rings (shockwaves, shield blocks, part pulses)
  const rings = sc.rings.items;
  for (let i = 0; i < rings.length; i++) {
    const r = rings[i]; if (!r.alive) continue;
    const k = 1 - r.life / r.max;
    ctx.globalAlpha = 1 - k; ctx.strokeStyle = r.color; ctx.lineWidth = r.w * (1 - k * 0.6);
    ctx.beginPath(); ctx.arc(r.x, r.y + (r.follow ? bucketOffY : 0), r.r0 + (r.r1 - r.r0) * easeOut(k), 0, 6.2832); ctx.stroke();
  }
  // chain threads: a glowing arc between two tiles
  const th = sc.threads.items;
  ctx.lineCap = 'round';
  for (let i = 0; i < th.length; i++) {
    const t = th[i]; if (!t.alive) continue;
    const x1 = tileCx(L, t.c), y1 = tileCy(L, t.r) + bucketOffY, x2 = tileCx(L, t.c2), y2 = tileCy(L, t.r2) + bucketOffY;
    const k = 1 - t.life / 120, mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - 12;
    ctx.globalAlpha = (1 - k) * 0.9; ctx.strokeStyle = '#ffe3a1'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#fff'; ctx.stroke();
  }
  // haul streaks (golden lines rising)
  const ss = sc.streaks.items;
  ctx.strokeStyle = '#ffe3a1'; ctx.lineWidth = 2;
  for (let i = 0; i < ss.length; i++) {
    const s = ss[i]; if (!s.alive) continue;
    ctx.globalAlpha = Math.min(1, s.life / 200) * 0.8; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x, s.y + s.len); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function drawFlash(ctx, sc) {
  if (sc.flashA <= 0.01) return;
  ctx.globalAlpha = sc.flashA; ctx.fillStyle = sc.flashColor; ctx.fillRect(0, 0, sc.L.w, sc.L.h); ctx.globalAlpha = 1;
}
