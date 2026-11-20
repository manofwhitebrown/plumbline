// Home surface art (GFX-1 part 9): pure layout helpers plus painters for the two cached layers.
// Dusk well mouth: sky and far hills (back layer), stone rim, winch and rope posts (front layer).
// Colours match the splash in index.html: ink #070a12, gold #f6c453, brass #d9b26a.
import { makePrng } from './prng.js';

export const MAX_CREW = 8;
export const MARGIN = 12; // layers are this much wider on each side so parallax never shows an edge
export const INK = '#070a12', GOLD = '#f6c453', BRASS = '#d9b26a';

export function homeLayout(w, h) {
  w = Math.max(120, Number(w) || 360); h = Math.max(160, Number(h) || 640);
  const wellCx = w / 2, wellCy = h * 0.68, wellRx = Math.min(w * 0.36, 150), wellRy = wellRx * 0.3;
  return { w, h, horizon: h * 0.5, wellCx, wellCy, wellRx, wellRy, winchX: wellCx, beamY: wellCy - h * 0.2, post: wellRx * 0.82,
    lanternX: wellCx + wellRx * 0.98, lanternY: wellCy - h * 0.06, crewY: wellCy + wellRy * 0.9 };
}
// Where crew stand: alternate left/right of the well, further out as the crew grows. Deterministic.
export function crewSlots(n, L) {
  const c = Math.max(0, Math.min(MAX_CREW, Math.floor(Number(n)) || 0)), out = [], rnd = makePrng(77);
  // Rings step outward from the rim but never past the screen edge; outer rings stand a little behind (higher, smaller).
  const base = L.wellRx * 1.1, step = Math.max(0, L.w / 2 - 20 - base) / 3;
  for (let i = 0; i < c; i++) {
    const side = i % 2 === 0 ? -1 : 1, ring = Math.floor(i / 2), jitter = (rnd() - 0.5) * 6;
    out.push({ x: L.wellCx + side * (base + ring * step) + jitter, y: L.crewY - ring * 5 + (rnd() - 0.5) * 3, s: 1 - ring * 0.08, phase: rnd() * 6.28, side });
  }
  return out;
}
// Firefly i at time t (seconds): slow lissajous drift inside the scene. Pure, no allocation (writes into out).
export function fireflyAt(i, t, L, out) {
  const r = makePrng(1000 + i), a = r(), b = r(), c = r(), d = r();
  out.x = L.w * (0.1 + 0.8 * a) + Math.sin(t * (0.1 + c * 0.12) + b * 6.28) * 22;
  out.y = L.wellCy - L.h * (0.04 + 0.26 * b) + Math.cos(t * (0.08 + d * 0.1) + a * 6.28) * 14;
  out.a = 0.35 + 0.35 * Math.sin(t * (0.6 + d * 0.5) + c * 6.28); // slow twinkle, well under 3 Hz
  return out;
}

function skyGrad(g, w, h, hz) {
  const s = g.createLinearGradient(0, 0, 0, hz + h * 0.1);
  s.addColorStop(0, '#0a0e22'); s.addColorStop(0.45, '#2a2250'); s.addColorStop(0.8, '#8a4a52'); s.addColorStop(1, '#e0905a');
  g.fillStyle = s; g.fillRect(0, 0, w, h);
}
export function paintBack(g, L, wide) {
  const w = wide, h = L.h, rnd = makePrng(31);
  skyGrad(g, w, h, L.horizon);
  for (let i = 0; i < 70; i++) { const y = rnd() * L.horizon * 0.85, a = 0.25 + 0.6 * (1 - y / L.horizon); g.fillStyle = `rgba(255,244,220,${a.toFixed(2)})`; const sz = rnd() < 0.12 ? 1.6 : 0.9; g.fillRect(rnd() * w, y, sz, sz); }
  const mg = g.createRadialGradient(w * 0.22, h * 0.14, 0, w * 0.22, h * 0.14, w * 0.3); mg.addColorStop(0, 'rgba(255,230,190,0.22)'); mg.addColorStop(1, 'rgba(255,230,190,0)');
  g.fillStyle = mg; g.fillRect(0, 0, w, h * 0.5);
  // two hill ranges (sum of seeded sines: smooth and deterministic)
  const ranges = [{ y: L.horizon + 4, amp: 18, col: '#2a1c3c' }, { y: L.horizon + 30, amp: 26, col: '#150f24' }];
  for (const r of ranges) {
    const p1 = rnd() * 6.28, p2 = rnd() * 6.28, p3 = rnd() * 6.28; g.fillStyle = r.col; g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 6) g.lineTo(x, r.y - r.amp * (0.5 + 0.28 * Math.sin(x * 0.011 + p1) + 0.16 * Math.sin(x * 0.027 + p2) + 0.08 * Math.sin(x * 0.06 + p3)));
    g.lineTo(w, h); g.closePath(); g.fill();
  }
  const gr = g.createLinearGradient(0, L.horizon + 40, 0, h); gr.addColorStop(0, '#120c1e'); gr.addColorStop(1, INK); g.fillStyle = gr; g.fillRect(0, L.horizon + 40, w, h);
}
export function paintFront(g, L, wide) {
  const rnd = makePrng(53), ox = (wide - L.w) / 2, cx = L.wellCx + ox, cy = L.wellCy;
  // the dark mouth of the well
  g.fillStyle = '#04050a'; g.beginPath(); g.ellipse(cx, cy, L.wellRx, L.wellRy, 0, 0, 6.2832); g.fill();
  // stone rim: back stones first (dim), then the lit front stones
  const N = 30;
  for (const front of [false, true]) for (let i = 0; i < N; i++) {
    const a = (i / N) * 6.2832, sn = Math.sin(a); if ((sn > 0) !== front) continue;
    const x = cx + Math.cos(a) * L.wellRx * 1.04, y = cy + sn * L.wellRy * 1.1, lit = front ? 0.55 + 0.35 * Math.max(0, Math.cos(a)) : 0.22;
    const k = lit * (0.85 + rnd() * 0.3);
    g.fillStyle = `rgb(${(96 * k + 16) | 0},${(82 * k + 14) | 0},${(74 * k + 14) | 0})`;
    g.beginPath(); g.ellipse(x, y + (front ? 5 : 0), L.wellRx * 0.1, L.wellRy * 0.34, a * 0.2, 0, 6.2832); g.fill();
    if (front) { g.fillStyle = 'rgba(255,214,160,0.16)'; g.fillRect(x - L.wellRx * 0.07, y + 1, L.wellRx * 0.14, 1.4); }
  }
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.ellipse(cx, cy + L.wellRy * 1.9, L.wellRx * 1.2, L.wellRy * 0.5, 0, 0, 6.2832); g.fill(); // ground shadow
  // winch: two wooden posts and a crossbeam with brass caps
  const px = L.post, top = L.beamY;
  for (const sx of [-1, 1]) { const x = cx + sx * px; g.fillStyle = '#2a1a10'; g.fillRect(x - 5, top, 10, cy - top + 4); g.fillStyle = '#4a2f1c'; g.fillRect(x - 5, top, 3.2, cy - top + 4); g.fillStyle = BRASS; g.fillRect(x - 6, top + 8, 12, 3); }
  g.fillStyle = '#2f1d11'; g.fillRect(cx - px - 8, top - 6, px * 2 + 16, 11); g.fillStyle = '#563622'; g.fillRect(cx - px - 8, top - 6, px * 2 + 16, 3.4);
  g.fillStyle = BRASS; g.beginPath(); g.arc(cx, top + 1, 8, 0, 6.2832); g.fill(); g.fillStyle = '#6b5128'; g.beginPath(); g.arc(cx, top + 1, 3.4, 0, 6.2832); g.fill(); // pulley
}
// A crew member silhouette: head + body, feet at (x, y). Stays in one dark colour so it reads at 6% width.
export function drawCrew(g, x, y, s, sway) {
  s *= 1.35; // bigger than life so they read at a glance; a warm edge on the lantern side separates them from the dark ground
  g.fillStyle = '#05060c'; g.strokeStyle = 'rgba(255,190,110,0.5)'; g.lineWidth = 1.3;
  g.beginPath(); g.arc(x + sway * 0.6, y - 31 * s, 5.4 * s, 0, 6.2832); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(x - 7 * s, y); g.lineTo(x - 5 * s + sway * 0.4, y - 25 * s); g.lineTo(x + 5 * s + sway * 0.4, y - 25 * s); g.lineTo(x + 7 * s, y); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(x + 5 * s + sway * 0.4, y - 25 * s); g.lineTo(x + 7 * s, y); g.stroke();
}
// Soft glow dot used for the lantern halo and the fireflies (painted once).
export function paintGlow(g, s, rgb) {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, `rgba(${rgb},0.95)`); r.addColorStop(0.3, `rgba(${rgb},0.4)`); r.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = r; g.fillRect(0, 0, s, s);
}
