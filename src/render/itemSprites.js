// Pre-drawn item pictures (gems, ore, relic, hazards). Drawn once per size.
import { makeSprite } from './canvasUtil.js';
import { hazardColors } from './palette.js';
import { buildItemAtlas } from './art/itemAtlas.js'; // [GFX-1] gems, ore, relic live in an atlas now

function poly(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }
function fillPoly(g, pts, a, b) {
  const gr = g.createLinearGradient(pts[0], pts[1], pts[pts.length - 2], pts[pts.length - 1]);
  gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; poly(g, pts); g.fill();
}

export function paintRock(g, S) {
  const c = hazardColors('rock');
  const p = [0.15, 0.62, 0.22, 0.3, 0.45, 0.14, 0.72, 0.22, 0.88, 0.5, 0.78, 0.82, 0.4, 0.88];
  const pts = p.map((v) => v * S);
  fillPoly(g, pts, c.light, c.dark);
  g.lineWidth = S * 0.04; g.lineJoin = 'round'; g.strokeStyle = '#2a2d36'; poly(g, pts); g.stroke();
  g.beginPath(); g.moveTo(S * 0.45, S * 0.14); g.lineTo(S * 0.5, S * 0.5); g.lineTo(S * 0.4, S * 0.88); g.moveTo(S * 0.5, S * 0.5); g.lineTo(S * 0.88, S * 0.5);
  g.lineWidth = S * 0.025; g.strokeStyle = 'rgba(0,0,0,0.35)'; g.stroke();
}

// wing = 0 up, 1 mid, 2 down
export function paintBat(g, S, wing) {
  const c = hazardColors('bat'), cx = S / 2, cy = S * 0.5;
  const wy = [-0.3, 0, 0.26][wing] * S;
  g.fillStyle = c.base;
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(cx, cy - S * 0.05);
    g.quadraticCurveTo(cx + s * S * 0.25, cy + wy - S * 0.22, cx + s * S * 0.46, cy + wy);
    g.lineTo(cx + s * S * 0.36, cy + wy + S * 0.04); g.lineTo(cx + s * S * 0.28, cy + wy + S * 0.14); g.lineTo(cx + s * S * 0.16, cy + wy + S * 0.06);
    g.lineTo(cx + s * S * 0.08, cy + S * 0.14); g.closePath(); g.fill();
  }
  g.beginPath(); g.ellipse(cx, cy + S * 0.02, S * 0.12, S * 0.17, 0, 0, 6.2832); g.fillStyle = c.dark; g.fill();
  g.beginPath(); g.moveTo(cx - S * 0.1, cy - S * 0.13); g.lineTo(cx - S * 0.07, cy - S * 0.26); g.lineTo(cx - S * 0.01, cy - S * 0.15); g.moveTo(cx + S * 0.1, cy - S * 0.13); g.lineTo(cx + S * 0.07, cy - S * 0.26); g.lineTo(cx + S * 0.01, cy - S * 0.15); g.fillStyle = c.dark; g.fill();
  g.fillStyle = '#ff4d5e'; g.fillRect(cx - S * 0.075, cy - S * 0.02, S * 0.05, S * 0.04); g.fillRect(cx + S * 0.025, cy - S * 0.02, S * 0.05, S * 0.04);
}

export function paintRoot(g, S) {
  const c = hazardColors('root');
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(S * 0.5, S * 0.9); g.bezierCurveTo(S * 0.15, S * 0.7, S * 0.85, S * 0.45, S * 0.4, S * 0.1);
  g.lineWidth = S * 0.2; g.strokeStyle = c.dark; g.stroke(); g.lineWidth = S * 0.13; g.strokeStyle = c.base; g.stroke();
  g.lineWidth = S * 0.04; g.strokeStyle = c.light; g.stroke();
  g.beginPath(); g.moveTo(S * 0.42, S * 0.7); g.lineTo(S * 0.18, S * 0.62); g.moveTo(S * 0.62, S * 0.5); g.lineTo(S * 0.84, S * 0.42);
  g.lineWidth = S * 0.06; g.strokeStyle = c.base; g.stroke();
}

export function paintVoid(g, S) {
  const cx = S / 2, gr = g.createRadialGradient(cx, cx, S * 0.04, cx, cx, S * 0.4);
  gr.addColorStop(0, '#000'); gr.addColorStop(0.6, '#14052e'); gr.addColorStop(0.9, '#6a2cff'); gr.addColorStop(1, '#c9a8ff');
  g.beginPath(); g.arc(cx, cx, S * 0.4, 0, 6.2832); g.fillStyle = gr; g.fill();
  g.beginPath(); g.arc(cx, cx, S * 0.4, 0, 6.2832); g.lineWidth = S * 0.04; g.strokeStyle = '#d9c4ff'; g.stroke();
}

// Red warning glow, drawn under every hazard.
export function paintWarn(g, S) {
  const gr = g.createRadialGradient(S / 2, S / 2, S * 0.18, S / 2, S / 2, S * 0.5);
  gr.addColorStop(0, 'rgba(255,77,94,0.0)'); gr.addColorStop(0.7, 'rgba(255,77,94,0.45)'); gr.addColorStop(1, 'rgba(255,77,94,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
}

// Build everything for one size. Returns a plain object of canvases (or null entries).
// [GFX-1] Gems, ore and relic come from the atlas (art/itemAtlas.js); hazards are still drawn here.
export function buildItemSprites(S, dpr, low = false) {
  const mk = (fn) => makeSprite(S, S, dpr, fn);
  const out = { size: S, art: buildItemAtlas(S, dpr, low),
    rock: mk((g) => paintRock(g, S)), bats: [0, 1, 2].map((w) => mk((g) => paintBat(g, S, w))), root: mk((g) => paintRoot(g, S)),
    voidOrb: mk((g) => paintVoid(g, S)), warn: makeSprite(S * 1.5, S * 1.5, dpr, (g) => paintWarn(g, S * 1.5)) };
  return out;
}
export function disposeItemSprites(sp) { if (sp && sp.art) sp.art.destroy(); }
