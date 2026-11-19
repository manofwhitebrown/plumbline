// The rope texture: one tileable tile of a three-strand twisted rope, in three heat stages
// (calm, warm, red-hot). The rope draws the tile along its curve and scrolls it, so the twist crawls.
// Painted by code, once per device pixel ratio. Safe without canvas (returns null).
import { makePrng } from './prng.js';
import { makeCanvas } from '../canvasUtil.js';

export const ROPE_TW = 10;   // tile width in css px (the rope is this wide)
export const ROPE_TH = 24;   // tile height: one full twist of three strands

const STAGES = {
  calm: { core: '#241608', dark: '#6b4a22', base: '#c4a066', light: '#f1d79a', spec: '#fff6d8' },
  warm: { core: '#2a1206', dark: '#7a3a14', base: '#d98b3a', light: '#ffd08a', spec: '#fff0c8' },
  hot:  { core: '#5a1408', dark: '#a02a14', base: '#ff6a3c', light: '#ffc08a', spec: '#fff2d8' },
};
export const ROPE_STAGES = Object.keys(STAGES);

// One strand is a slanted capsule. It is drawn three times (once shifted up and once down) so it wraps.
function strand(g, yc, th, c, wobble) {
  for (const sy of [-ROPE_TH, 0, ROPE_TH]) {
    const y = yc + sy;
    const pass = (lw, color, dx, dy) => {
      g.beginPath(); g.moveTo(-3 + dx, y - 4.2 + dy); g.lineTo(ROPE_TW + 3 + dx, y + 4.2 + wobble + dy);
      g.lineWidth = lw; g.strokeStyle = color; g.stroke();
    };
    pass(th, c.dark, 0, 0.6);          // shadow side
    pass(th * 0.82, c.base, 0, -0.2);  // body
    pass(th * 0.46, c.light, -0.5, -1.3); // lit top-left
    pass(th * 0.14, c.spec, -0.9, -2.1);  // glint
  }
}

export function paintRopeTile(g, w, h, stage, seed = 7) {
  const c = STAGES[stage] || STAGES.calm, rnd = makePrng(seed);
  g.fillStyle = c.core; g.fillRect(0, 0, w, h);
  g.lineCap = 'round';
  const th = h / 3 + 1.6;
  for (let k = 0; k < 3; k++) strand(g, (k + 0.5) * (h / 3), th, c, rnd() * 0.6);
  // fine fibre lines along each strand, a little uneven
  g.lineWidth = 0.5;
  for (let k = 0; k < 3; k++) for (let j = 0; j < 4; j++) {
    const yc = (k + 0.5) * (h / 3) + (rnd() - 0.5) * 3;
    g.strokeStyle = j % 2 ? 'rgba(255,240,200,0.22)' : 'rgba(30,14,4,0.3)';
    g.beginPath(); g.moveTo(0, yc - 4 + rnd() * 2); g.lineTo(w, yc + 4 + rnd() * 2); g.stroke();
    if (k === 0) { g.beginPath(); g.moveTo(0, yc - 4 - h); g.lineTo(w, yc + 4 - h); g.stroke(); }
  }
  if (stage === 'hot') { // glowing cracks between the strands
    g.lineWidth = 1; g.strokeStyle = 'rgba(255,190,90,0.7)';
    for (let k = 0; k < 3; k++) { const y = k * (h / 3) + 1; g.beginPath(); g.moveTo(0, y - 3); g.lineTo(w, y + 4); g.stroke(); }
  }
  // round the rope: dark edges, a little light on the left
  const side = g.createLinearGradient(0, 0, w, 0);
  side.addColorStop(0, 'rgba(0,0,0,0.5)'); side.addColorStop(0.22, 'rgba(0,0,0,0)');
  side.addColorStop(0.7, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(0,0,0,0.6)');
  g.fillStyle = side; g.fillRect(0, 0, w, h);
}

let cache = null;
// { calm, warm, hot, tw, th, dpr } or null when there is no canvas.
export function getRopeTiles(dpr = 1) {
  const d = Math.max(1, Math.min(3, Math.round(+dpr || 1)));
  if (cache && cache.dpr === d) return cache;
  destroyRopeTiles();
  const out = { dpr: d, tw: ROPE_TW, th: ROPE_TH };
  for (const stage of ROPE_STAGES) {
    const c = makeCanvas(ROPE_TW * d, ROPE_TH * d);
    const g = c && c.getContext && c.getContext('2d');
    if (!g) { cache = null; return null; }
    g.scale(d, d);
    try { paintRopeTile(g, ROPE_TW, ROPE_TH, stage); } catch (e) { /* keep partial tile */ }
    out[stage] = c;
  }
  cache = out;
  return out;
}
export function destroyRopeTiles() {
  if (cache) for (const s of ROPE_STAGES) { const c = cache[s]; if (c) { c.width = 1; c.height = 1; } }
  cache = null;
}
