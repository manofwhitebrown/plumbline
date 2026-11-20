// Home surface art: layout helpers (pure), crew slots, fireflies, dust, and the two cached layers.
// Back layer: sky, moon, hills, village, mine cart. Front layer: ground, props, stone well, winch, lantern.
import { makePrng } from './prng.js';
import { paintSky } from './homeSky.js';
import { paintGround } from './homeGround.js';
import { paintWell, paintWinch } from './homeWell.js';
import { LOOK_COUNT } from './crewLooks.js';
export { drawCrew } from './crewDraw.js';
export const MAX_CREW = 8;
export const MARGIN = 12; // layers are this much wider on each side so parallax never shows an edge
export const INK = '#070a12', GOLD = '#f6c453', BRASS = '#d9b26a';

export function homeLayout(w, h) {
  w = Math.max(120, Number(w) || 360); h = Math.max(160, Number(h) || 640);
  const u = Math.max(0.8, Math.min(1.3, Math.min(w, h * 0.5625) / 360));
  const wellCx = w / 2, wellCy = h * 0.68, wellRx = Math.min(w * 0.22, 110 * u), wellRy = wellRx * 0.3, post = wellRx * 1.12, beamY = wellCy - wellRx * 0.62, drumY = beamY + 9, drumR = 6.5;
  return { w, h, u, horizon: h * 0.5, wellCx, wellCy, wellRx, wellRy, winchX: wellCx, beamY, post, drumY, drumR,
    crankX: wellCx - post - 10, crankR: 9, bucketW: Math.max(28, wellRx * 0.4), bucketY: wellCy - wellRy * 1.05 - Math.max(28, wellRx * 0.4) * 0.5,
    lanternX: wellCx + post + 8, lanternY: beamY + 26, crewY: wellCy + wellRy * 0.5 };
}
// Crew stand either side of the winch, two rows deep. Even index left, odd right; index 0 is the crank turner. Deterministic.
export function crewSlots(n, L) {
  const c = Math.max(0, Math.min(MAX_CREW, Math.floor(Number(n)) || 0)), out = [], rnd = makePrng(77), u = L.u;
  const dx = [26, 26, 42, 42, 58, 58, 74, 74], back = [0, 0, 1, 1, 0, 0, 1, 1];
  for (let i = 0; i < c; i++) {
    const side = i % 2 === 0 ? -1 : 1, b = back[i], x = L.wellCx + side * (L.post + dx[i] * u) + (rnd() - 0.5) * 4, y = L.crewY - b * 11 * u + (rnd() - 0.5) * 2;
    out.push({ x: Math.max(16 * u, Math.min(L.w - 16 * u, x)), y, s: u * (b ? 0.92 : 1), phase: rnd() * 6.28, side, face: -side, look: i % LOOK_COUNT });
  }
  return out;
}
// Firefly i at time t (seconds): slow lissajous drift. Pure, no allocation (writes into out).
export function fireflyAt(i, t, L, out) {
  const r = makePrng(1000 + i), a = r(), b = r(), c = r(), d = r();
  out.x = L.w * (0.1 + 0.8 * a) + Math.sin(t * (0.1 + c * 0.12) + b * 6.28) * 22;
  out.y = L.wellCy - L.h * (0.04 + 0.26 * b) + Math.cos(t * (0.08 + d * 0.1) + a * 6.28) * 14;
  out.a = 0.35 + 0.35 * Math.sin(t * (0.6 + d * 0.5) + c * 6.28);
  return out;
}
// Dust mote i drifting through the lantern light. Pure, no allocation.
export function dustAt(i, t, L, out) {
  const r = makePrng(2000 + i), a = r(), b = r(), c = r(), R = L.wellRx * 0.9;
  out.x = L.lanternX + (a - 0.5) * 2 * R + Math.sin(t * (0.2 + c * 0.2) + b * 6.28) * 10;
  out.y = L.lanternY - 30 + ((b * 100 + t * (3 + c * 4)) % 100) * 1.1;
  const dx = (out.x - L.lanternX) / R; out.a = Math.max(0, (1 - dx * dx)) * 0.5 * (0.6 + 0.4 * Math.sin(t * 0.9 + a * 6.28));
  return out;
}
export function paintBack(g, L, wide) { paintSky(g, L, wide); }
export function paintFront(g, L, wide) {
  paintGround(g, L, wide);
  g.save(); g.translate((wide - L.w) / 2, 0); paintWell(g, L); paintWinch(g, L); g.restore();
}
// Soft glow dot used for the lantern halo and the fireflies (painted once).
export function paintGlow(g, s, rgb) {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, `rgba(${rgb},0.95)`); r.addColorStop(0.3, `rgba(${rgb},0.4)`); r.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = r; g.fillRect(0, 0, s, s);
}
