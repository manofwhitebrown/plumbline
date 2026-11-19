// The bucket lantern: a brass cage, warm glass and a flame in four pre-drawn flicker frames.
// Drawn once per device pixel ratio. Safe without canvas (returns null).
import { makeCanvas } from '../canvasUtil.js';

export const LANTERN_W = 18;
export const LANTERN_H = 30;
export const LANTERN_FRAMES = 4;
const LEAN = [0, 0.7, 0, -0.7];      // flame sways left and right
const TALL = [0, 1.2, 0.5, 1.6];     // and grows and shrinks a little

export function paintLantern(g, w, h, frame = 0) {
  const f = frame % LANTERN_FRAMES, cx = w / 2;
  // ring on top
  g.lineWidth = 1.5; g.strokeStyle = '#c99a3c'; g.beginPath(); g.arc(cx, 3.2, 2.6, Math.PI, 0); g.stroke();
  // cap
  const cap = g.createLinearGradient(0, 5, 0, 9); cap.addColorStop(0, '#ffe3a1'); cap.addColorStop(1, '#9a6e2a');
  g.fillStyle = cap; g.beginPath(); g.moveTo(cx - 2.5, 5.5); g.lineTo(cx + 2.5, 5.5); g.lineTo(w - 3, 10); g.lineTo(3, 10); g.closePath(); g.fill();
  // glass body, glowing from the flame
  const glass = g.createRadialGradient(cx, 18, 1, cx, 18, 9);
  glass.addColorStop(0, '#fff3c0'); glass.addColorStop(0.5, '#ffc45a'); glass.addColorStop(1, '#a8601c');
  g.fillStyle = glass; g.beginPath(); g.moveTo(4, 10); g.lineTo(w - 4, 10); g.lineTo(w - 3, 24); g.lineTo(3, 24); g.closePath(); g.fill();
  // flame
  const fh = 8 + TALL[f], lean = LEAN[f];
  g.fillStyle = '#ff9a2e'; g.beginPath(); g.moveTo(cx, 22.5); g.quadraticCurveTo(cx - 3.2, 18, cx + lean, 22.5 - fh); g.quadraticCurveTo(cx + 3.2, 18, cx, 22.5); g.fill();
  g.fillStyle = '#fff4c8'; g.beginPath(); g.moveTo(cx, 22.5); g.quadraticCurveTo(cx - 1.6, 19.5, cx + lean * 0.6, 22.5 - fh * 0.62); g.quadraticCurveTo(cx + 1.6, 19.5, cx, 22.5); g.fill();
  // cage bars and a rim of light on the left
  g.strokeStyle = 'rgba(70,44,12,0.85)'; g.lineWidth = 1;
  for (const x of [cx - 3.2, cx + 3.2]) { g.beginPath(); g.moveTo(x * 0.92 + cx * 0.08, 10); g.lineTo(x, 24); g.stroke(); }
  g.strokeStyle = '#d9a441'; g.lineWidth = 1.3;
  g.beginPath(); g.moveTo(4, 10); g.lineTo(3, 24); g.moveTo(w - 4, 10); g.lineTo(w - 3, 24); g.stroke();
  g.strokeStyle = 'rgba(255,240,190,0.7)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(3.6, 11); g.lineTo(2.8, 23); g.stroke();
  // base with two rivets
  const base = g.createLinearGradient(0, 24, 0, 28); base.addColorStop(0, '#e0b058'); base.addColorStop(1, '#6e4c1c');
  g.fillStyle = base; g.beginPath(); g.moveTo(2, 24); g.lineTo(w - 2, 24); g.lineTo(w - 4, 28); g.lineTo(4, 28); g.closePath(); g.fill();
  g.fillStyle = '#ffeab0'; g.fillRect(cx - 4.2, 25, 1, 1); g.fillRect(cx + 3.2, 25, 1, 1);
}

let cache = null;
// { frames:[canvas x4], w, h, dpr } or null without canvas.
export function getLantern(dpr = 1) {
  const d = Math.max(1, Math.min(3, Math.round(+dpr || 1)));
  if (cache && cache.dpr === d) return cache;
  destroyLantern();
  const frames = [];
  for (let f = 0; f < LANTERN_FRAMES; f++) {
    const c = makeCanvas(LANTERN_W * d, LANTERN_H * d), g = c && c.getContext && c.getContext('2d');
    if (!g) return null;
    g.scale(d, d);
    try { paintLantern(g, LANTERN_W, LANTERN_H, f); } catch (e) { /* keep partial */ }
    frames.push(c);
  }
  cache = { frames, w: LANTERN_W, h: LANTERN_H, dpr: d };
  return cache;
}
export function destroyLantern() {
  if (cache) for (const c of cache.frames) { if (c) { c.width = 1; c.height = 1; } }
  cache = null;
}
