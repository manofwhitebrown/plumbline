// Part glyphs, set B (defense, engine, special). Same rules as glyphsA.
import { stroke, circle, star4, TAU } from './glyphsA.js';
function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }

export const glyphsB = {
  plate(g, k) { // plate with rivets
    rr(g, -0.55, -0.42, 1.1, 0.84, 0.16); g.fillStyle = k.metal; g.fill(); stroke(g, 0.06, k.dark);
    g.fillStyle = k.light;
    for (const [x, y] of [[-0.38, -0.25], [0.38, -0.25], [-0.38, 0.25], [0.38, 0.25]]) { circle(g, x, y, 0.06); g.fill(); }
    rr(g, -0.25, -0.12, 0.5, 0.24, 0.08); stroke(g, 0.05, 'rgba(255,255,255,0.45)');
  },
  shield(g, k) { // heater shield
    g.beginPath(); g.moveTo(-0.5, -0.5); g.lineTo(0.5, -0.5); g.lineTo(0.5, 0.05); g.quadraticCurveTo(0.45, 0.4, 0, 0.62); g.quadraticCurveTo(-0.45, 0.4, -0.5, 0.05); g.closePath();
    g.fillStyle = k.metal; g.fill(); stroke(g, 0.07, k.dark);
    g.beginPath(); g.moveTo(0, -0.5); g.lineTo(0, 0.6); g.moveTo(-0.5, -0.1); g.lineTo(0.5, -0.1); stroke(g, 0.07, k.light);
  },
  oilcan(g, k) { // can with spout and drop
    rr(g, -0.5, -0.05, 0.62, 0.55, 0.1); g.fillStyle = k.metal; g.fill(); stroke(g, 0.05, k.dark);
    g.beginPath(); g.moveTo(0.1, 0.1); g.lineTo(0.5, -0.3); g.lineTo(0.62, -0.25); stroke(g, 0.1, k.metal);
    g.beginPath(); g.moveTo(-0.3, -0.05); g.quadraticCurveTo(-0.3, -0.35, -0.05, -0.38); stroke(g, 0.08, k.metal);
    g.beginPath(); g.moveTo(0.62, -0.1); g.quadraticCurveTo(0.76, 0.1, 0.62, 0.2); g.quadraticCurveTo(0.48, 0.1, 0.62, -0.1); g.fillStyle = k.accent; g.fill();
  },
  cooler(g, k) { // snowflake
    g.beginPath();
    for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; g.moveTo(Math.cos(a) * -0.6, Math.sin(a) * -0.6); g.lineTo(Math.cos(a) * 0.6, Math.sin(a) * 0.6); }
    stroke(g, 0.1, k.accent);
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3, ex = Math.cos(a) * 0.6, ey = Math.sin(a) * 0.6, ix = Math.cos(a) * 0.38, iy = Math.sin(a) * 0.38;
      g.moveTo(ix + Math.cos(a + 2.5) * 0.16, iy + Math.sin(a + 2.5) * 0.16); g.lineTo(ex * 0.65, ey * 0.65); g.lineTo(ix + Math.cos(a - 2.5) * 0.16, iy + Math.sin(a - 2.5) * 0.16);
    }
    stroke(g, 0.06, k.light); circle(g, 0, 0, 0.08); g.fillStyle = '#fff'; g.fill();
  },
  spikeguard(g, k) { // ring with spikes
    g.fillStyle = k.light;
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8; g.save(); g.rotate(a);
      g.beginPath(); g.moveTo(0.34, -0.1); g.lineTo(0.64, 0); g.lineTo(0.34, 0.1); g.closePath(); g.fill(); g.restore();
    }
    circle(g, 0, 0, 0.3); stroke(g, 0.16, k.metal);
  },
  sparerope(g, k) { // coil of rope
    for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(0, 0.2 - i * 0.2, 0.5 - i * 0.05, 0.22, 0, 0, TAU); stroke(g, 0.13, i === 1 ? k.light : k.metal); }
    g.beginPath(); g.moveTo(0.45, 0.2); g.quadraticCurveTo(0.7, 0.25, 0.62, 0.5); stroke(g, 0.1, k.metal);
    g.beginPath(); g.moveTo(-0.4, -0.18); g.quadraticCurveTo(-0.5, -0.55, -0.1, -0.5); stroke(g, 0.1, k.metal);
  },
  drill(g, k) { // spiral bit
    g.save(); g.rotate(0.35);
    g.beginPath(); g.moveTo(-0.28, -0.55); g.lineTo(0.28, -0.55); g.lineTo(0.28, -0.05); g.lineTo(0, 0.65); g.lineTo(-0.28, -0.05); g.closePath();
    g.fillStyle = k.metal; g.fill(); stroke(g, 0.05, k.dark);
    g.beginPath(); for (let i = 0; i < 4; i++) { const y = -0.4 + i * 0.22; g.moveTo(-0.28 + i * 0.05, y + 0.12); g.lineTo(0.28 - i * 0.05, y - 0.06); }
    stroke(g, 0.06, k.light); g.restore();
  },
  anchor(g, k) { // anchor
    circle(g, 0, -0.5, 0.1); stroke(g, 0.07, k.metal);
    g.beginPath(); g.moveTo(0, -0.4); g.lineTo(0, 0.55); g.moveTo(-0.25, -0.2); g.lineTo(0.25, -0.2); stroke(g, 0.12, k.metal);
    g.beginPath(); g.moveTo(-0.55, 0.15); g.quadraticCurveTo(-0.5, 0.58, 0, 0.58); g.quadraticCurveTo(0.5, 0.58, 0.55, 0.15); stroke(g, 0.12, k.metal);
    g.fillStyle = k.light;
    g.beginPath(); g.moveTo(-0.7, 0.2); g.lineTo(-0.4, 0.2); g.lineTo(-0.55, -0.05); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(0.7, 0.2); g.lineTo(0.4, 0.2); g.lineTo(0.55, -0.05); g.closePath(); g.fill();
  },
  metronome(g, k) { // pendulum body
    g.beginPath(); g.moveTo(-0.22, -0.6); g.lineTo(0.22, -0.6); g.lineTo(0.5, 0.55); g.lineTo(-0.5, 0.55); g.closePath();
    g.fillStyle = k.metal; g.fill(); stroke(g, 0.05, k.dark);
    g.beginPath(); g.moveTo(0, 0.4); g.lineTo(0.2, -0.45); stroke(g, 0.07, k.light);
    rr(g, 0.04, -0.12, 0.26, 0.16, 0.05); g.fillStyle = k.accent; g.fill();
  },
  battery(g, k) { // cell with bolt
    rr(g, -0.42, -0.5, 0.84, 1.05, 0.14); g.fillStyle = k.metal; g.fill(); stroke(g, 0.06, k.dark);
    rr(g, -0.16, -0.68, 0.32, 0.2, 0.05); g.fillStyle = k.light; g.fill();
    g.beginPath(); g.moveTo(0.1, -0.38); g.lineTo(-0.2, 0.08); g.lineTo(0, 0.08); g.lineTo(-0.1, 0.45); g.lineTo(0.24, -0.1); g.lineTo(0.04, -0.1); g.closePath();
    g.fillStyle = k.accent; g.fill();
  },
  lantern(g, k) { // lamp
    circle(g, 0, -0.62, 0.1); stroke(g, 0.06, k.metal);
    g.beginPath(); g.moveTo(-0.28, -0.4); g.lineTo(0.28, -0.4); g.lineTo(0.2, -0.52); g.lineTo(-0.2, -0.52); g.closePath(); g.fillStyle = k.metal; g.fill();
    rr(g, -0.3, -0.4, 0.6, 0.8, 0.18); g.fillStyle = 'rgba(255,214,120,0.55)'; g.fill(); stroke(g, 0.07, k.metal);
    g.beginPath(); g.moveTo(0, 0.2); g.quadraticCurveTo(0.2, 0, 0.05, -0.22); g.quadraticCurveTo(-0.2, 0, 0, 0.2); g.fillStyle = '#fff3c4'; g.fill();
    rr(g, -0.34, 0.38, 0.68, 0.14, 0.05); g.fillStyle = k.metal; g.fill();
  },
  compass(g, k) { // ring and needle
    circle(g, 0, 0, 0.55); g.fillStyle = 'rgba(10,16,30,0.55)'; g.fill(); stroke(g, 0.1, k.metal);
    g.beginPath(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; g.moveTo(Math.cos(a) * 0.4, Math.sin(a) * 0.4); g.lineTo(Math.cos(a) * 0.5, Math.sin(a) * 0.5); }
    stroke(g, 0.05, k.light);
    g.save(); g.rotate(0.6);
    g.beginPath(); g.moveTo(0, -0.42); g.lineTo(0.11, 0); g.lineTo(-0.11, 0); g.closePath(); g.fillStyle = '#ff4d5e'; g.fill();
    g.beginPath(); g.moveTo(0, 0.42); g.lineTo(0.11, 0); g.lineTo(-0.11, 0); g.closePath(); g.fillStyle = '#eef2ff'; g.fill(); g.restore();
    circle(g, 0, 0, 0.05); g.fillStyle = k.metal; g.fill();
  },
  jackpotchest(g, k) { // chest
    g.beginPath(); g.moveTo(-0.55, 0.05); g.lineTo(-0.55, -0.15); g.quadraticCurveTo(-0.55, -0.55, 0, -0.55); g.quadraticCurveTo(0.55, -0.55, 0.55, -0.15); g.lineTo(0.55, 0.05); g.closePath();
    g.fillStyle = '#9a5a2a'; g.fill(); stroke(g, 0.06, k.dark);
    rr(g, -0.55, 0.02, 1.1, 0.52, 0.06); g.fillStyle = '#7a431f'; g.fill(); stroke(g, 0.06, k.dark);
    g.fillStyle = k.metal; g.fillRect(-0.58, -0.02, 1.16, 0.1); g.fillRect(-0.3, -0.5, 0.1, 1.0); g.fillRect(0.2, -0.5, 0.1, 1.0);
    rr(g, -0.1, -0.06, 0.2, 0.22, 0.04); g.fillStyle = k.light; g.fill();
    g.fillStyle = '#fff'; star4(g, 0.5, -0.5, 0.18); g.fill();
  },
  echo(g, k) { // dot with double arcs
    circle(g, -0.4, 0, 0.12); g.fillStyle = k.light; g.fill();
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(-0.4, 0, 0.3 + i * 0.26, -0.8, 0.8); stroke(g, 0.1, i === 0 ? k.light : k.metal); }
  },
  fuse(g, k) { // dynamite with spark
    g.save(); g.rotate(-0.3); rr(g, -0.3, -0.05, 0.6, 0.62, 0.1); g.fillStyle = k.accent; g.fill(); stroke(g, 0.05, k.dark);
    g.fillStyle = k.light; g.fillRect(-0.3, 0.14, 0.6, 0.1); g.restore();
    g.beginPath(); g.moveTo(0.02, -0.12); g.quadraticCurveTo(0.2, -0.3, 0.02, -0.42); g.quadraticCurveTo(-0.12, -0.52, 0.1, -0.6); stroke(g, 0.07, '#d9c9a0');
    g.fillStyle = '#ffe3a1'; star4(g, 0.14, -0.66, 0.24); g.fill(); g.fillStyle = '#ff7a45'; star4(g, 0.14, -0.66, 0.12); g.fill();
  },
};
