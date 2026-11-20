// Front layer, part 1: grass ground, dirt path, grass tufts, crates and barrels. Coordinates are in scene space.
import { makePrng } from './prng.js';
const TAU = 6.2832;
function barrel(g, x, y, s) {
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x, y, 11 * s, 3.4 * s, 0, 0, TAU); g.fill();
  const bg = g.createLinearGradient(x - 9 * s, 0, x + 9 * s, 0); bg.addColorStop(0, '#2c1a10'); bg.addColorStop(0.55, '#7a4a28'); bg.addColorStop(1, '#4a2b18');
  g.fillStyle = bg; g.beginPath(); g.moveTo(x - 8 * s, y - 18 * s); g.quadraticCurveTo(x - 11 * s, y - 9 * s, x - 8.5 * s, y - 1 * s); g.lineTo(x + 8.5 * s, y - 1 * s); g.quadraticCurveTo(x + 11 * s, y - 9 * s, x + 8 * s, y - 18 * s); g.closePath(); g.fill();
  g.fillStyle = '#9a7a40'; g.fillRect(x - 10 * s, y - 14 * s, 20 * s, 1.8 * s); g.fillRect(x - 10 * s, y - 6 * s, 20 * s, 1.8 * s);
  g.fillStyle = '#5a3a20'; g.beginPath(); g.ellipse(x, y - 18 * s, 8 * s, 2.6 * s, 0, 0, TAU); g.fill(); g.fillStyle = '#2a1a10'; g.beginPath(); g.ellipse(x, y - 18 * s, 6 * s, 1.8 * s, 0, 0, TAU); g.fill();
}
function crate(g, x, y, s) {
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x, y, 13 * s, 3.4 * s, 0, 0, TAU); g.fill();
  g.fillStyle = '#6a4426'; g.fillRect(x - 11 * s, y - 17 * s, 22 * s, 17 * s); g.fillStyle = '#8c5e34'; g.fillRect(x - 11 * s, y - 17 * s, 22 * s, 3 * s);
  g.strokeStyle = '#2f1d11'; g.lineWidth = 1.2; g.strokeRect(x - 11 * s, y - 17 * s, 22 * s, 17 * s); g.beginPath(); g.moveTo(x - 11 * s, y - 17 * s); g.lineTo(x + 11 * s, y); g.moveTo(x + 11 * s, y - 17 * s); g.lineTo(x - 11 * s, y); g.stroke();
}
export function paintGround(g, L, w) {
  const h = L.h, ox = (w - L.w) / 2, gy = L.horizon + 40, rnd = makePrng(91), cx = L.wellCx + ox, u = L.u;
  const gr = g.createLinearGradient(0, gy, 0, h); gr.addColorStop(0, '#3a3a2c'); gr.addColorStop(0.15, '#2a2420'); gr.addColorStop(1, '#0c0812');
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, gy + 6); for (let x = 0; x <= w; x += 8) g.lineTo(x, gy + 3 * Math.sin(x * 0.05) + 3 * Math.sin(x * 0.13)); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
  const pg = g.createLinearGradient(0, gy, 0, h); pg.addColorStop(0, 'rgba(120,84,52,0.55)'); pg.addColorStop(1, 'rgba(70,48,32,0.75)');
  g.fillStyle = pg; g.beginPath(); g.moveTo(cx - 26 * u, gy + 2); g.quadraticCurveTo(cx - 40 * u, L.wellCy, cx - w * 0.2, h); g.lineTo(cx + w * 0.2, h); g.quadraticCurveTo(cx + 44 * u, L.wellCy, cx + 26 * u, gy + 2); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(30,18,12,0.35)'; g.lineWidth = 1.4; for (const k of [-0.07, 0.07]) { g.beginPath(); g.moveTo(cx + k * 200 * 0.2, gy + 4); g.quadraticCurveTo(cx + k * 400, L.wellCy + 40, cx + k * w * 1.5, h); g.stroke(); }
  for (let i = 0; i < 60; i++) { const y = gy + 10 + rnd() * (h - gy - 10), x = cx + (rnd() - 0.5) * (30 + (y - gy) * 0.7); g.fillStyle = rnd() < 0.5 ? 'rgba(200,170,130,0.25)' : 'rgba(20,12,8,0.35)'; g.beginPath(); g.ellipse(x, y, 1.6 + rnd() * 2, 1 + rnd(), 0, 0, TAU); g.fill(); }
  const cols = ['#2f4a2c', '#3f5a30', '#566a38', '#243a28'];
  for (let i = 0; i < 190; i++) {
    const y = gy + 6 + Math.pow(rnd(), 0.8) * (h - gy - 6), x = rnd() * w, sc = (0.6 + (y - gy) / (h - gy)) * u, hh = (4 + rnd() * 6) * sc;
    if (Math.abs(x - cx) < 22 * u + (y - gy) * 0.1 && rnd() < 0.8) continue;
    g.strokeStyle = cols[(rnd() * 4) | 0]; g.lineWidth = 1.2; g.beginPath();
    for (let b = -1; b <= 1; b++) { g.moveTo(x, y); g.quadraticCurveTo(x + b * 1.5 * sc, y - hh * 0.6, x + b * 3.2 * sc, y - hh); }
    g.stroke();
  }
  barrel(g, L.w * 0.06 + ox, L.wellCy - 20 * u, 0.85 * u); crate(g, L.w * 0.06 + ox + 22 * u, L.wellCy - 14 * u, 0.8 * u); crate(g, L.w * 0.95 + ox, L.wellCy - 24 * u, 0.8 * u); barrel(g, L.w * 0.95 + ox - 20 * u, L.wellCy - 18 * u, 0.75 * u);
}
