// Hazards: steam (layered puffs + pulsing warning ring), void orb (dark sphere, violet horizon ring, orbiting dots), warn glow.
import { softGlow } from './shapes.js';
import { RIM, rimStroke, dangerGlow } from './hazardRim.js';
import { makePrng } from './prng.js';
import { TAU } from './gemFacets.js';

// Steam puffs: three layers of defined, round clouds (grey back, white middle, bright front) with a hot orange base.
// frame (0..2) shifts the puffs a little so the cloud billows.
function puff(g, x, y, r, col, a) {
  const gr = g.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.05, x, y, r);
  gr.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${a})`); gr.addColorStop(0.72, `rgba(${col[0] - 22},${col[1] - 18},${col[2] - 8},${a * 0.92})`); gr.addColorStop(1, `rgba(${col[0] - 40},${col[1] - 34},${col[2] - 18},0)`);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
export function paintSteamModel(g, S, frame = 0) {
  try {
    const sh = (frame - 1) * S * 0.025;
    dangerGlow(g, S, 0.6);
    softGlow(g, S * 0.5, S * 0.78, S * 0.26, RIM, 0.45); // hot base: it burns
    const back = [[0.3, 0.62, 0.17], [0.7, 0.6, 0.18], [0.5, 0.42, 0.2], [0.5, 0.74, 0.16]];
    const mid = [[0.38, 0.55, 0.16], [0.62, 0.52, 0.15], [0.5, 0.36, 0.15], [0.45, 0.68, 0.14], [0.6, 0.68, 0.13]];
    const front = [[0.43, 0.46, 0.11], [0.58, 0.42, 0.1], [0.5, 0.58, 0.11]];
    back.forEach((p, i) => puff(g, S * p[0] + (i % 2 ? sh : -sh), S * p[1] - sh * 0.6, S * p[2], [158, 170, 192], 0.85));
    mid.forEach((p, i) => puff(g, S * p[0] + (i % 2 ? -sh : sh) * 1.3, S * p[1] + sh * (i % 3 - 1) * 0.5, S * p[2], [226, 233, 246], 0.95));
    front.forEach((p, i) => puff(g, S * p[0] + sh * (i - 1), S * p[1] - sh, S * p[2], [255, 255, 255], 1));
  } catch (e) { /* keep partial sprite */ }
}
// Warning ring (the game pulses its opacity).
export function paintSteamRing(g, S) {
  try {
    const t = (c) => { c.beginPath(); c.arc(S / 2, S / 2, S * 0.42, 0, TAU); };
    g.save(); g.setLineDash([S * 0.09, S * 0.06]);
    rimStroke(g, S * 0.7, t); g.restore();
  } catch (e) { /* keep partial sprite */ }
}

// Void orb: near-black sphere, thin violet event-horizon ring, and a faint red-orange outer rim (danger).
export function paintVoidModel(g, S) {
  try {
    const c = S / 2;
    softGlow(g, c, c, S * 0.5, [120, 70, 255], 0.35);
    const sph = g.createRadialGradient(c - S * 0.07, c - S * 0.08, S * 0.02, c, c, S * 0.3);
    sph.addColorStop(0, '#2a1450'); sph.addColorStop(0.5, '#0a0418'); sph.addColorStop(1, '#000');
    g.fillStyle = sph; g.beginPath(); g.arc(c, c, S * 0.3, 0, TAU); g.fill();
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(154,98,255,0.28)'; g.lineWidth = S * 0.09; g.beginPath(); g.arc(c, c, S * 0.36, 0, TAU); g.stroke(); // ring glow
    g.strokeStyle = 'rgb(176,128,255)'; g.lineWidth = S * 0.04; g.beginPath(); g.arc(c, c, S * 0.36, 0, TAU); g.stroke();
    const tilt = g.createLinearGradient(c - S * 0.4, c - S * 0.1, c + S * 0.4, c + S * 0.1); // lensing arc, brighter on the lit side
    tilt.addColorStop(0, 'rgba(255,255,255,0.95)'); tilt.addColorStop(0.5, 'rgba(255,255,255,0.1)'); tilt.addColorStop(1, 'rgba(255,255,255,0.7)');
    g.strokeStyle = tilt; g.lineWidth = S * 0.012; g.beginPath(); g.arc(c, c, S * 0.36, Math.PI * 1.05, Math.PI * 1.6); g.stroke();
    rimStroke(g, S, (c2) => { c2.beginPath(); c2.arc(c, c, S * 0.43, 0, TAU); });
  } catch (e) { /* keep partial sprite */ }
}
// Three glowing dots on the orbit; the game rotates this sprite.
export function paintVoidDots(g, S) {
  try {
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + i * TAU / 3, x = S / 2 + Math.cos(a) * S * 0.45, y = S / 2 + Math.sin(a) * S * 0.45;
      softGlow(g, x, y, S * 0.07, [201, 168, 255], 0.9); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, S * 0.02, 0, TAU); g.fill();
    }
  } catch (e) { /* keep partial sprite */ }
}
// Red-orange warning glow under every hazard (the game pulses its opacity).
export function paintWarnModel(g, S) {
  try {
    const gr = g.createRadialGradient(S / 2, S / 2, S * 0.2, S / 2, S / 2, S * 0.5);
    gr.addColorStop(0, 'rgba(255,92,60,0)'); gr.addColorStop(0.7, 'rgba(255,92,60,0.4)'); gr.addColorStop(1, 'rgba(255,92,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
  } catch (e) { /* keep partial sprite */ }
}
