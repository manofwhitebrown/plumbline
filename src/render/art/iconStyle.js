// The hero look for the 26 part icons: a dark bevelled tile, a family accent, a 3-tone shaded glyph
// with a rim of light, and a soft glow when the part fires. Works on any glyph painter (unit space -1..1).
import { makeCanvas } from '../canvasUtil.js';
import { roundRectPath } from './shapes.js';

// metal = light, mid, dark. tile = top and bottom of the dark tile. Families by role.
export const FAMILIES = {
  collector: { accent: '#f0b840', metal: ['#fff2c4', '#f0b840', '#9a6418'], tile: ['#2d2a30', '#12131f'] },
  processor: { accent: '#3cd0c0', metal: ['#d8fff6', '#3cd0c0', '#177a78'], tile: ['#1b3036', '#0c1620'] },
  defense:   { accent: '#82a8e4', metal: ['#e6f0ff', '#82a8e4', '#3a5c96'], tile: ['#212c42', '#0e1424'] },
  engine:    { accent: '#e8863e', metal: ['#ffe2c4', '#e8863e', '#8e4216'], tile: ['#33261f', '#150f14'] },
  special:   { accent: '#a87cff', metal: ['#f1e6ff', '#a87cff', '#5a34a8'], tile: ['#2a2248', '#110d24'] },
  unknown:   { accent: '#9aa6c8', metal: ['#e8ecf8', '#9aa6c8', '#515c80'], tile: ['#262c44', '#10131f'] },
};

function tilePath(g, size, inset) {
  const m = size * 0.035 + inset;
  roundRectPath(g, m, m, size - 2 * m, size - 2 * m, size * 0.2 - inset);
}

// The tile: dark body, accent glow at the bottom, inner bevel, accent rim.
export function paintTile(g, size, F, state) {
  const firing = state === 'firing', locked = state === 'locked';
  const body = g.createLinearGradient(0, 0, size, size);
  body.addColorStop(0, locked ? '#2c3146' : F.tile[0]); body.addColorStop(1, locked ? '#10131f' : F.tile[1]);
  tilePath(g, size, 0); g.fillStyle = body; g.fill();
  if (!locked) {
    const glow = g.createRadialGradient(size / 2, size * 1.0, 1, size / 2, size * 1.0, size * 0.75);
    glow.addColorStop(0, hexA(F.accent, firing ? 0.55 : 0.26)); glow.addColorStop(1, hexA(F.accent, 0));
    tilePath(g, size, 0); g.fillStyle = glow; g.fill();
  }
  const lw = Math.max(1, size * 0.03);
  const bev = g.createLinearGradient(0, 0, size, size);
  bev.addColorStop(0, 'rgba(255,255,255,0.3)'); bev.addColorStop(0.5, 'rgba(255,255,255,0.04)'); bev.addColorStop(1, 'rgba(0,0,0,0.55)');
  tilePath(g, size, lw * 1.3); g.lineWidth = lw; g.strokeStyle = bev; g.stroke();
  tilePath(g, size, 0); g.lineWidth = Math.max(1, size * 0.028);
  g.strokeStyle = locked ? 'rgba(160,170,200,0.3)' : hexA(firing ? '#fff3c4' : F.accent, firing ? 1 : 0.8); g.stroke();
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Paints the whole icon into g (css px, already scaled by dpr). Returns false when there is no canvas
// for the scratch layers, so the caller can fall back to the flat drawing.
export function paintHeroIcon(g, size, dpr, glyph, F, state) {
  const px = Math.max(8, Math.round(size * dpr));
  const A = makeCanvas(px, px), R = makeCanvas(px, px);
  const ga = A && A.getContext && A.getContext('2d'), gr = R && R.getContext && R.getContext('2d');
  if (!ga || !gr) return false;
  paintTile(g, size, F, state);
  const k = px / 2 * 0.86;
  ga.setTransform(k, 0, 0, k, px / 2, px / 2);                    // glyph space: -1..1
  const metal = ga.createLinearGradient(-0.6, -0.7, 0.6, 0.7);
  metal.addColorStop(0, F.metal[0]); metal.addColorStop(0.5, F.metal[1]); metal.addColorStop(1, F.metal[2]);
  try { glyph(ga, { metal, light: F.metal[0], dark: F.tile[1], accent: F.accent }); } catch (e) { /* keep what was drawn */ }
  ga.setTransform(1, 0, 0, 1, 0, 0); ga.globalCompositeOperation = 'source-atop';   // 3-tone shading on the glyph only
  const lit = ga.createLinearGradient(0, 0, px * 0.75, px * 0.85);
  lit.addColorStop(0, 'rgba(255,255,255,0.4)'); lit.addColorStop(0.5, 'rgba(255,255,255,0)');
  ga.fillStyle = lit; ga.fillRect(0, 0, px, px);
  const shade = ga.createLinearGradient(px * 0.3, px * 0.25, px, px);
  shade.addColorStop(0.45, 'rgba(8,4,20,0)'); shade.addColorStop(1, 'rgba(8,4,20,0.55)');
  ga.fillStyle = shade; ga.fillRect(0, 0, px, px);
  ga.globalCompositeOperation = 'source-over';
  gr.drawImage(A, 0, 0);                                           // rim light: the lit top-left edge only
  gr.globalCompositeOperation = 'destination-out'; gr.drawImage(A, 1.3 * dpr, 1.6 * dpr);
  gr.globalCompositeOperation = 'source-in'; gr.fillStyle = 'rgba(255,250,235,0.95)'; gr.fillRect(0, 0, px, px);
  g.save();
  if (state === 'locked') g.globalAlpha = 0.4;
  if (state === 'firing') { g.shadowColor = F.accent; g.shadowBlur = size * 0.22; g.drawImage(A, 0, 0, size, size); g.shadowBlur = 0; }
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = size * 0.05; g.shadowOffsetY = size * 0.03;
  g.drawImage(A, 0, 0, size, size);
  g.restore();
  g.save(); g.globalAlpha = state === 'locked' ? 0.3 : 0.85; g.drawImage(R, 0, 0, size, size); g.restore();
  if (state === 'locked') { // small padlock
    const s = size; g.fillStyle = '#c9d2ee'; roundRectPath(g, s * 0.4, s * 0.5, s * 0.2, s * 0.17, s * 0.03); g.fill();
    g.beginPath(); g.arc(s * 0.5, s * 0.5, s * 0.07, Math.PI, 0); g.lineWidth = s * 0.035; g.strokeStyle = '#c9d2ee'; g.stroke();
  }
  if (state === 'selected') { tilePath(g, size, -size * 0.01); g.lineWidth = Math.max(1.2, size * 0.035); g.strokeStyle = 'rgba(246,196,83,0.85)'; g.stroke(); }
  return true;
}
