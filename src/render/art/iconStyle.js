// Shared hero style for the 26 part icons, in unit space (-1..1): a dark bevelled tile, a family accent,
// 3-tone metal for the glyph, a drop shadow and a rim light, and a soft glow when firing.
export const FAMILIES = {
  collector: { tile: '#f6c453', metal: ['#fff0c0', '#e0a93f', '#8a5a16'], accent: '#e8444f' },  // gold
  processor: { tile: '#35d6c4', metal: ['#d2fff8', '#3fc2b4', '#136a64'], accent: '#8ff5e6' },  // teal
  defense:   { tile: '#7aa6e8', metal: ['#e6f0ff', '#7fa6e0', '#2c4f8a'], accent: '#a8c8ff' },  // steel blue
  engine:    { tile: '#e8884a', metal: ['#ffe0c4', '#e8884a', '#7a3512'], accent: '#ffb454' },  // copper
  special:   { tile: '#b48cff', metal: ['#f2e8ff', '#a678ff', '#4a2f90'], accent: '#d9b8ff' },  // violet
  unknown:   { tile: '#8d97b8', metal: ['#e0e6f8', '#8d97b8', '#3a4466'], accent: '#b8c2e0' },
};
const R = 0.34; // tile corner radius

function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
const hexA = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;

// The tile: deep ink body tinted by the family, inner bevel, accent ring and glow, accent pip at the bottom.
export function paintTile(g, fam, state) {
  const locked = state === 'locked', firing = state === 'firing';
  const body = g.createLinearGradient(-1, -1, 1, 1);
  body.addColorStop(0, locked ? '#222838' : '#1d2742'); body.addColorStop(1, locked ? '#0c0f18' : '#0a0e1c');
  rr(g, -0.92, -0.92, 1.84, 1.84, R); g.fillStyle = body; g.fill();
  if (!locked) { // family colour bleeding in from the top
    const tint = g.createRadialGradient(0, -0.55, 0.05, 0, -0.1, 1.15);
    tint.addColorStop(0, hexA(fam.tile, firing ? 0.5 : 0.26)); tint.addColorStop(1, hexA(fam.tile, 0));
    rr(g, -0.92, -0.92, 1.84, 1.84, R); g.fillStyle = tint; g.fill();
  }
  g.lineWidth = 0.06; // inner bevel: light top-left, dark bottom-right
  const bev = g.createLinearGradient(-0.9, -0.9, 0.9, 0.9);
  bev.addColorStop(0, 'rgba(255,255,255,0.4)'); bev.addColorStop(0.45, 'rgba(255,255,255,0.04)'); bev.addColorStop(0.55, 'rgba(0,0,0,0.05)'); bev.addColorStop(1, 'rgba(0,0,0,0.65)');
  rr(g, -0.89, -0.89, 1.78, 1.78, R - 0.03); g.strokeStyle = bev; g.stroke();
  if (!locked) { // accent ring and pip
    g.lineWidth = 0.035; g.strokeStyle = hexA(fam.tile, firing ? 0.9 : 0.42); rr(g, -0.8, -0.8, 1.6, 1.6, R - 0.1); g.stroke();
    g.fillStyle = fam.tile; rr(g, -0.2, 0.76, 0.4, 0.07, 0.035); g.fill();
  }
  g.lineWidth = state === 'firing' ? 0.1 : 0.05; // outer edge
  g.strokeStyle = firing ? '#fff3c4' : state === 'selected' ? '#f6c453' : 'rgba(0,0,0,0.55)';
  rr(g, -0.92, -0.92, 1.84, 1.84, R); g.stroke();
}

// Kit passed to the glyph painters: { metal (3-tone gradient), light, dark, accent }. solid = one flat colour (for the rim pass).
export function makeKit(g, fam, state, solid) {
  if (solid) return { metal: solid, light: solid, dark: solid, accent: solid };
  const m = g.createLinearGradient(-0.6, -0.6, 0.6, 0.6), b = state === 'firing' ? 0.18 : 0;
  m.addColorStop(0, fam.metal[0]); m.addColorStop(0.5, fam.metal[1]); m.addColorStop(1, fam.metal[2]);
  return { metal: m, light: fam.metal[0], dark: fam.metal[2], accent: fam.accent, boost: b };
}

// Draws the glyph with depth: a light copy nudged up-left (rim light), then the real glyph with a soft drop shadow.
// sc = device pixels per unit, so the shadow is the same fraction of the icon at any size.
export function paintGlyph(g, painter, fam, state, sc) {
  const d = 0.032;
  g.save(); g.translate(-d, -d * 1.1); painter(g, makeKit(g, fam, state, fam.metal[0])); g.restore();
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = Math.max(0, sc * 0.07); g.shadowOffsetX = sc * 0.03; g.shadowOffsetY = sc * 0.06;
  painter(g, makeKit(g, fam, state));
  g.restore();
}

// Soft glow behind the glyph; strong when firing. Drawn additively inside the tile.
export function paintFiringGlow(g, fam) {
  g.save(); rr(g, -0.92, -0.92, 1.84, 1.84, R); g.clip();
  g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(0, 0, 0.05, 0, 0, 1.0);
  gr.addColorStop(0, hexA(fam.tile, 0.55)); gr.addColorStop(0.5, hexA(fam.tile, 0.18)); gr.addColorStop(1, hexA(fam.tile, 0));
  g.fillStyle = gr; g.fillRect(-1, -1, 2, 2); g.restore();
}
