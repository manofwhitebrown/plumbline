// Paints one tileable stretch of well wall (bricks and rock) for a biome.
import { hash01 } from './rand.js';
import { BIOME_IDS } from './palette.js';

export const TILE_H = 208;

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) * f), g = Math.min(255, ((n >> 8) & 255) * f), b = Math.min(255, (n & 255) * f);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

export function paintWallTile(g, w, pal, biomeId) {
  const seed = (BIOME_IDS.indexOf(biomeId) + 1) * 977;
  const rowH = TILE_H / 8;
  g.fillStyle = pal.wallDark; g.fillRect(0, 0, w, TILE_H);
  for (let row = 0; row < 8; row++) {
    let x = -((row % 2) * 30) - hash01(seed + row) * 20;
    let i = 0;
    while (x < w) {
      const bw = 48 + hash01(seed + row * 31 + i) * 34, f = 0.8 + hash01(seed + row * 17 + i * 3) * 0.5;
      const y = row * rowH;
      g.fillStyle = shade(pal.wall, f); g.beginPath();
      if (g.roundRect) g.roundRect(x + 1, y + 1, bw - 2, rowH - 2, 4); else g.rect(x + 1, y + 1, bw - 2, rowH - 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x + 3, y + 2, bw - 6, 2); // top light
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x + 3, y + rowH - 4, bw - 6, 2);  // bottom shade
      x += bw; i++;
    }
  }
  for (let k = 0; k < 140; k++) { // speckle
    g.fillStyle = hash01(seed + k * 5) > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.18)';
    g.fillRect(hash01(seed + k * 3 + 1) * w, hash01(seed + k * 7 + 2) * TILE_H, 1 + hash01(k) * 2, 1 + hash01(k + 9) * 2);
  }
  // glowing cracks (wrapped so the tile joins up top to bottom)
  const n = 5;
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let k = 0; k < n; k++) {
    let x = hash01(seed + k * 41) * w, y = hash01(seed + k * 43) * TILE_H;
    for (const wy of [0, -TILE_H, TILE_H]) {
      g.beginPath(); g.moveTo(x, y + wy);
      let cx = x, cy = y;
      for (let s = 0; s < 4; s++) { cx += (hash01(seed + k * 9 + s) - 0.5) * 36; cy += 12 + hash01(seed + k * 11 + s) * 16; g.lineTo(cx, cy + wy); }
      g.lineWidth = 3; g.strokeStyle = pal.crack; g.globalAlpha = 0.14; g.stroke();
      g.lineWidth = 1; g.globalAlpha = 0.5; g.stroke(); g.globalAlpha = 1;
    }
  }
}
