// Back layer: dusk gradient sky, stars, thin moon, three hill ranges, far village and mine cart.
import { makePrng } from './prng.js';
const TAU = 6.2832;
export function paintSky(g, L, w) {
  const h = L.h, hz = L.horizon, rnd = makePrng(31), u = L.u;
  const s = g.createLinearGradient(0, 0, 0, hz + h * 0.1);
  s.addColorStop(0, '#080b1e'); s.addColorStop(0.4, '#251f4e'); s.addColorStop(0.72, '#7a4560'); s.addColorStop(1, '#e8985a');
  g.fillStyle = s; g.fillRect(0, 0, w, h);
  const hg = g.createRadialGradient(w / 2, hz + 6, 0, w / 2, hz + 6, w * 0.7); hg.addColorStop(0, 'rgba(255,170,90,0.35)'); hg.addColorStop(1, 'rgba(255,170,90,0)');
  g.fillStyle = hg; g.fillRect(0, 0, w, hz + h * 0.15);
  for (let i = 0; i < 90; i++) {
    const y = rnd() * hz * 0.82, a = 0.22 + 0.7 * (1 - y / hz), big = rnd() < 0.1, sz = big ? 1.7 : 0.9, x = rnd() * w;
    g.fillStyle = `rgba(255,244,220,${a.toFixed(2)})`; g.fillRect(x, y, sz, sz);
    if (big) { g.fillStyle = `rgba(255,244,220,${(a * 0.4).toFixed(2)})`; g.fillRect(x - 2, y + 0.4, 5.6, 0.8); g.fillRect(x + 0.4, y - 2, 0.8, 5.6); }
  }
  const mx = w * 0.78, my = h * 0.12 + 14 * u, mr = 15 * u;
  const mg = g.createRadialGradient(mx, my, 0, mx, my, mr * 4); mg.addColorStop(0, 'rgba(255,232,190,0.28)'); mg.addColorStop(1, 'rgba(255,232,190,0)');
  g.fillStyle = mg; g.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
  g.save(); g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.clip(); g.fillStyle = '#ffe9c0'; g.beginPath(); g.rect(mx - mr, my - mr, mr * 2, mr * 2); g.arc(mx + mr * 0.5, my - mr * 0.12, mr * 0.9, 0, TAU); g.fill('evenodd'); g.restore();
  const ranges = [{ y: hz + 2, amp: 20, col: '#4a2f58' }, { y: hz + 22, amp: 24, col: '#2d1d40' }, { y: hz + 44, amp: 26, col: '#181027' }];
  ranges.forEach((r, k) => {
    const p1 = rnd() * 6.28, p2 = rnd() * 6.28, p3 = rnd() * 6.28, f = (x) => r.y - r.amp * (0.5 + 0.28 * Math.sin(x * 0.011 + p1) + 0.16 * Math.sin(x * 0.027 + p2) + 0.08 * Math.sin(x * 0.06 + p3));
    g.fillStyle = r.col; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 5) g.lineTo(x, f(x)); g.lineTo(w, h); g.closePath(); g.fill();
    if (k === 1) {
      for (let x = 20 * u, i = 0; x < w - 14; x += (16 + rnd() * 22) * u, i++) {
        const hw = (8 + rnd() * 7) * u, hh = (6 + rnd() * 6) * u, y = f(x) + 2;
        g.fillStyle = '#150e22'; g.fillRect(x, y - hh, hw, hh + 3); g.beginPath(); g.moveTo(x - 1.5, y - hh); g.lineTo(x + hw / 2, y - hh - hw * 0.5); g.lineTo(x + hw + 1.5, y - hh); g.closePath(); g.fill();
        if (i % 4 === 1) g.fillRect(x + hw * 0.7, y - hh - hw * 0.8, 2, hw * 0.5);
        if (rnd() < 0.65) { g.fillStyle = '#ffcf7a'; g.fillRect(x + hw * 0.3, y - hh * 0.6, 1.8, 2.2); }
      }
      const cx = w * 0.84, cy = f(cx) + 1; // mine cart on short rails
      g.strokeStyle = '#0f0a1a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(cx - 26 * u, cy + 2); g.lineTo(cx + 24 * u, cy + 2); g.stroke(); g.fillStyle = '#0f0a1a';
      g.beginPath(); g.moveTo(cx - 9 * u, cy - 10 * u); g.lineTo(cx + 9 * u, cy - 10 * u); g.lineTo(cx + 6.5 * u, cy); g.lineTo(cx - 6.5 * u, cy); g.closePath(); g.fill();
      g.beginPath(); g.arc(cx - 4.5 * u, cy + 0.6, 2.2 * u, 0, TAU); g.arc(cx + 4.5 * u, cy + 0.6, 2.2 * u, 0, TAU); g.fill();
      g.fillStyle = 'rgba(246,196,83,0.7)'; g.fillRect(cx - 5 * u, cy - 12 * u, 3 * u, 2 * u); g.fillRect(cx, cy - 11.6 * u, 3.4 * u, 1.6 * u);
      const tx = w * 0.16, ty = f(tx) + 2; g.strokeStyle = '#0f0a1a'; g.lineWidth = 2; g.beginPath(); g.moveTo(tx - 9 * u, ty); g.lineTo(tx, ty - 34 * u); g.lineTo(tx + 9 * u, ty); g.moveTo(tx - 5 * u, ty - 14 * u); g.lineTo(tx + 5 * u, ty - 14 * u); g.stroke(); // headframe
      g.beginPath(); g.arc(tx, ty - 34 * u, 4 * u, 0, TAU); g.stroke();
    }
    if (k < 2) { const m = g.createLinearGradient(0, r.y, 0, r.y + 36); m.addColorStop(0, 'rgba(255,170,120,0.10)'); m.addColorStop(1, 'rgba(255,170,120,0)'); g.fillStyle = m; g.fillRect(0, r.y - 10, w, 46); }
  });
}
