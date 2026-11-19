// Per-biome vector detail drawn over the stone body. mode 'base' paints solid detail;
// mode 'glow' paints only the light-giving parts (used for the pulsing additive pass).
// Same seed in both modes, so shapes line up. a = overall strength (far layers use less).
import { makePrng, seedFrom } from './prng.js';
import { wrapY, makeCracks, strokeFissures, strokeGlowCracks, crystalCluster, resinPocket, pocketHalo, honeyDrip, star } from './wallShapes.js';
import { softGlow } from './shapes.js';

const GLOW_RGB = { amber: [255, 170, 60], magma: [255, 106, 42], void: [154, 98, 255], abyss: [214, 72, 154], quartz: [143, 180, 255] };
export function hasGlow(id) { return id !== 'clay'; }

function bricks(g, w, h, rng, a) {
  const rows = Math.max(4, Math.round(h / 26)), rowH = h / rows;
  g.lineCap = 'butt';
  for (let r = 0; r < rows; r++) { // dark mortar line with a light lip under it
    g.fillStyle = `rgba(8,3,0,${0.5 * a})`; g.fillRect(0, r * rowH - 1, w, 2.4);
    g.fillStyle = `rgba(255,214,170,${0.08 * a})`; g.fillRect(0, r * rowH + 1.4, w, 1);
  }
  for (let r = 0; r < rows; r++) {
    let x = -rng() * 40 - (r % 2) * 26;
    while (x < w) {
      const bw = 38 + rng() * 34, y = r * rowH, t = rng();
      g.fillStyle = t > 0.5 ? `rgba(255,206,160,${(0.03 + rng() * 0.07) * a})` : `rgba(10,4,0,${(0.08 + rng() * 0.16) * a})`;
      g.fillRect(x + 1, y + 2, bw - 2, rowH - 3);
      g.fillStyle = `rgba(8,3,0,${0.5 * a})`; g.fillRect(x - 1, y, 2.4, rowH); // vertical joint
      g.fillStyle = `rgba(255,224,180,${0.1 * a})`; g.fillRect(x + 2, y + 2, bw - 4, 1.2); // top light
      if (rng() < 0.12) { g.strokeStyle = `rgba(8,3,0,${0.6 * a})`; g.lineWidth = 1; g.beginPath(); const cx = x + bw * (0.3 + rng() * 0.4); g.moveTo(cx, y + 3); g.lineTo(cx + 4, y + rowH * 0.5); g.lineTo(cx - 2, y + rowH - 3); g.stroke(); }
      x += bw;
    }
  }
}
function rootStub(g, x, y, len, dir) { // a root poking out of a mortar line
  g.save(); g.lineCap = 'round';
  const draw = (wd, col) => { g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + dir * len * 0.5, y + len * 0.4, x + dir * len, y + len * 0.25); g.stroke(); };
  draw(5, 'rgba(20,10,4,0.85)'); draw(3.4, 'rgb(104,74,42)'); draw(1, 'rgb(170,130,80)');
  g.restore();
}
function dustPuffs(g, w, h, rng, n) {
  for (let i = 0; i < n; i++) softGlow(g, rng() * w, rng() * h, 14 + rng() * 22, [217, 180, 143], 0.05 + rng() * 0.05);
}

// Dispatch. layer: 'far' | 'near' | 'mid'. Draws into g over a w x h tile.
export function paintDetail(g, w, h, id, layer, mode, quality) {
  const rng = makePrng(seedFrom('detail:' + id + ':' + layer));
  const far = layer !== 'near', a = far ? 0.55 : 1, low = quality === 'low';
  const cnt = (n) => Math.max(1, Math.round(n * (layer === 'near' ? 1 : layer === 'mid' ? 0.4 : 0.6) * (w / 360 > 0.4 ? 1 : 0.5) * (low ? 0.6 : 1)));
  if (mode === 'glow') { glowPass(g, w, h, id, rng, far); return; }
  switch (id) {
    case 'clay':
      bricks(g, w, h, rng, a);
      if (!far) for (let i = 0; i < 3; i++) rootStub(g, rng() * w, rng() * h, 12 + rng() * 14, rng() < 0.5 ? -1 : 1);
      dustPuffs(g, w, h, rng, 3); break;
    case 'quartz':
      for (let i = 0; i < cnt(6); i++) { const x = rng() * w, y = rng() * h; wrapY(g, h, (c) => crystalCluster(c, x, y, (far ? 26 : 38) + rng() * 12, makePrng(i * 7 + 1), [84, 128, 226], far ? 0.6 : 1)); } break;
    case 'amber':
      for (let i = 0; i < cnt(5); i++) { const x = rng() * w, y = rng() * h, rx = 4 + rng() * 5, ry = rx * (0.7 + rng() * 0.4), sd = i * 11 + 3; wrapY(g, h, (c) => { c.globalAlpha = far ? 0.6 : 0.9; resinPocket(c, x, y, rx, ry, makePrng(sd), true); c.globalAlpha = 1; }); }
      if (!far) for (let i = 0; i < cnt(3); i++) { const x = rng() * w, y = rng() * h, len = 14 + rng() * 22; wrapY(g, h, (c) => honeyDrip(c, x, y, len)); } break;
    case 'magma': {
      const cr = makeCracks(rng, w, h, cnt(7), 16);
      wrapY(g, h, (c) => { strokeFissures(c, cr, a); strokeGlowCracks(c, cr, [255, 106, 42], 0.5 * a); }); break; }
    case 'void': {
      for (let i = 0; i < 3; i++) { const x = rng() * w, y = rng() * h; wrapY(g, h, (c) => { c.save(); c.translate(x, y); c.scale(2.2, 1); softGlow(c, 0, 0, 40 + 20 * (i % 2), i % 2 ? [110, 70, 220] : [70, 60, 170], 0.1 * a); c.restore(); }); }
      for (let i = 0; i < cnt(18); i++) { const x = rng() * w, y = rng() * h, r = 0.5 + rng() * 1.1; wrapY(g, h, (c) => star(c, x, y, r, [201, 168, 255], 0.55 * a)); }
      const cr = makeCracks(rng, w, h, cnt(3), 18); wrapY(g, h, (c) => strokeGlowCracks(c, cr, [154, 98, 255], 0.35 * a, 0.8)); break; }
    default: { // abyss: worn bricks, a dim crystal, a dim crack, a few stars
      bricks(g, w, h, rng, 0.14 * a);
      for (let i = 0; i < cnt(2); i++) { const x = rng() * w, y = rng() * h; wrapY(g, h, (c) => crystalCluster(c, x, y, 22, makePrng(i + 40), [120, 70, 170], 0.45 * a)); }
      for (let i = 0; i < cnt(8); i++) { const x = rng() * w, y = rng() * h; wrapY(g, h, (c) => star(c, x, y, 0.7, [255, 154, 208], 0.4 * a)); }
      const cr = makeCracks(rng, w, h, cnt(3), 16); wrapY(g, h, (c) => strokeGlowCracks(c, cr, [214, 72, 154], 0.3 * a, 0.8));
    }
  }
}

// The additive pass: only things that give light. Drawn with 'lighter' and a slow pulse in well.js.
function glowPass(g, w, h, id, rng, far) {
  const col = GLOW_RGB[id]; if (!col) return;
  const n = (k) => Math.max(1, Math.round(k * (far ? 0.7 : 1)));
  if (id === 'amber') { for (let i = 0; i < n(6); i++) { const x = rng() * w, y = rng() * h, r = 20 + rng() * 22; wrapY(g, h, (c) => pocketHalo(c, x, y, r, 0.2)); } return; }
  if (id === 'quartz') { for (let i = 0; i < n(8); i++) { const x = rng() * w, y = rng() * h; wrapY(g, h, (c) => softGlow(c, x, y, 16 + rng() * 10, col, 0.22)); } return; }
  const cr = makeCracks(rng, w, h, n(id === 'magma' ? 8 : 4), 17);
  wrapY(g, h, (c) => strokeGlowCracks(c, cr, col, id === 'magma' ? 0.75 : 0.55, 1));
  if (id === 'magma') for (let i = 0; i < n(6); i++) { const x = rng() * w, y = rng() * h; wrapY(g, h, (c) => softGlow(c, x, y, 26, col, 0.14)); }
}
