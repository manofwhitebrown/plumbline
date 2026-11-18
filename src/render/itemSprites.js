// Pre-drawn item pictures (gems, ore, relic, hazards). Drawn once per size.
import { makeSprite } from './canvasUtil.js';
import { TIER_COLORS, PRISM, hazardColors } from './palette.js';

function poly(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }
function fillPoly(g, pts, a, b) {
  const gr = g.createLinearGradient(pts[0], pts[1], pts[pts.length - 2], pts[pts.length - 1]);
  gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; poly(g, pts); g.fill();
}

// Gem with 5 facets. c = {base, light, dark}.
export function paintGem(g, S, c, tier) {
  const m = S * 0.1, w = S - m * 2, cx = S / 2;
  const top = m + w * 0.12, mid = m + w * 0.38, bot = S - m;
  const L = m, R = S - m, tl = m + w * 0.22, tr = S - m - w * 0.22;
  g.shadowColor = c.base; g.shadowBlur = S * 0.18;
  poly(g, [tl, top, tr, top, R, mid, cx, bot, L, mid]); g.fillStyle = c.dark; g.fill();
  g.shadowBlur = 0;
  fillPoly(g, [tl, top, cx, top, cx, mid, L, mid], c.light, c.base);        // upper left
  fillPoly(g, [cx, top, tr, top, R, mid, cx, mid], c.base, c.light);        // upper right
  fillPoly(g, [L, mid, cx, mid, cx, bot], c.base, c.dark);                  // lower left
  fillPoly(g, [cx, mid, R, mid, cx, bot], c.dark, c.base);                  // lower right
  if (tier >= 4) { fillPoly(g, [cx - w * 0.16, top, cx + w * 0.16, top, cx + w * 0.1, mid, cx - w * 0.1, mid], '#ffffff', c.light); g.globalAlpha = 0.5; g.fill(); g.globalAlpha = 1; }
  g.lineWidth = Math.max(1, S * 0.04); g.lineJoin = 'round'; g.strokeStyle = 'rgba(255,255,255,0.7)';
  poly(g, [tl, top, tr, top, R, mid, cx, bot, L, mid]); g.stroke();
  g.beginPath(); g.moveTo(L, mid); g.lineTo(R, mid); g.moveTo(cx, top); g.lineTo(cx, bot);
  g.lineWidth = Math.max(0.6, S * 0.02); g.strokeStyle = 'rgba(255,255,255,0.25)'; g.stroke();
}

export function paintOre(g, S) {
  const cx = S / 2, cy = S / 2, r = S * 0.4;
  g.beginPath();
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.2832, rr = r * (0.82 + 0.18 * Math.sin(i * 2.3 + 1)); g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.9); }
  g.closePath();
  const gr = g.createLinearGradient(0, 0, S, S); gr.addColorStop(0, '#8a8f9c'); gr.addColorStop(1, '#3a3e4a'); g.fillStyle = gr; g.fill();
  g.lineWidth = S * 0.03; g.strokeStyle = 'rgba(255,255,255,0.25)'; g.stroke();
  g.beginPath(); g.moveTo(S * 0.28, S * 0.62); g.lineTo(S * 0.45, S * 0.45); g.lineTo(S * 0.58, S * 0.55); g.lineTo(S * 0.74, S * 0.34);
  g.lineWidth = S * 0.09; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#f6c453'; g.stroke();
  g.lineWidth = S * 0.03; g.strokeStyle = '#fff3c4'; g.stroke();
}

export function paintRelic(g, S) {
  const x = S * 0.12, w = S * 0.76, top = S * 0.22, body = S * 0.5;
  g.beginPath(); g.moveTo(x, body); g.lineTo(x, top + S * 0.12); g.quadraticCurveTo(x, top - S * 0.04, S / 2, top - S * 0.04); g.quadraticCurveTo(x + w, top - S * 0.04, x + w, top + S * 0.12); g.lineTo(x + w, body); g.closePath();
  g.fillStyle = '#b06a30'; g.fill();
  g.fillStyle = '#8a4a20'; g.fillRect(x, body, w, S * 0.3);
  g.fillStyle = '#f6c453'; g.fillRect(x - 1, body - S * 0.04, w + 2, S * 0.08); g.fillRect(x + w * 0.2, top, S * 0.07, S * 0.58); g.fillRect(x + w * 0.8 - S * 0.07, top, S * 0.07, S * 0.58);
  g.fillStyle = '#ffe3a1'; g.fillRect(S / 2 - S * 0.06, body - S * 0.08, S * 0.12, S * 0.18);
  g.lineWidth = S * 0.03; g.strokeStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(x + 2, top + S * 0.1); g.quadraticCurveTo(S / 2, top - S * 0.02, x + w - 2, top + S * 0.1); g.stroke();
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
export function buildItemSprites(S, dpr) {
  const mk = (fn) => makeSprite(S, S, dpr, fn);
  const out = { size: S, gems: [null], prism: [], ore: mk((g) => paintOre(g, S)), relic: mk((g) => paintRelic(g, S)),
    rock: mk((g) => paintRock(g, S)), bats: [0, 1, 2].map((w) => mk((g) => paintBat(g, S, w))), root: mk((g) => paintRoot(g, S)),
    voidOrb: mk((g) => paintVoid(g, S)), warn: makeSprite(S * 1.5, S * 1.5, dpr, (g) => paintWarn(g, S * 1.5)) };
  for (let t = 1; t <= 5; t++) out.gems.push(mk((g) => paintGem(g, S, TIER_COLORS[t], t)));
  for (let i = 0; i < PRISM.length; i += 2) out.prism.push(mk((g) => paintGem(g, S, PRISM[i], 6)));
  return out;
}
