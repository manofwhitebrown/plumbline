// Twisted rope: a small pre-rendered tile (3 strands wound diagonally, lit from the left) is stamped along the
// rope path, so the rope looks twisted and the texture can scroll as the bucket goes down. No allocation per frame.
import { makeSprite } from '../canvasUtil.js';

export const ROPE_W = 9;      // rope thickness in css px
export const ROPE_P = 18;     // one full twist, in css px
const TILE_DPR = 2;           // rope is thin: a fixed 2x tile is plenty
const STRANDS = [[ '#f0cf86', '#c8984a', '#6a4616' ], [ '#e4c076', '#b98a40', '#5e3e12' ], [ '#d9b36a', '#ad7f38', '#563810' ]]; // light / mid / shade per strand

// Paints one strand band across the tile (a slanted, rounded, cylinder-shaded stripe).
function strand(g, y0, t, cols) {
  const w = ROPE_W + 2, sl = 5.5;
  const gr = g.createLinearGradient(0, y0, 0, y0 + t + sl);
  gr.addColorStop(0, cols[2]); gr.addColorStop(0.28, cols[0]); gr.addColorStop(0.62, cols[1]); gr.addColorStop(1, cols[2]);
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(0.5, y0 + 0.6); g.quadraticCurveTo(w / 2, y0 + sl * 0.5 - 0.8, w - 0.5, y0 + sl);
  g.lineTo(w - 0.5, y0 + sl + t); g.quadraticCurveTo(w / 2, y0 + t + sl * 0.5 + 0.6, 0.5, y0 + t); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,244,210,0.55)'; g.lineWidth = 0.7; // highlight along the top edge of the strand
  g.beginPath(); g.moveTo(1, y0 + 1); g.quadraticCurveTo(w / 2, y0 + sl * 0.5 - 0.4, w - 1, y0 + sl + 0.6); g.stroke();
}

export function buildRopeTile() {
  return makeSprite(ROPE_W + 2, ROPE_P * 3, TILE_DPR, (g, w, h) => {
    g.fillStyle = '#2c1b0b'; g.fillRect(0, 0, w, h); // deep gaps between strands
    const t = ROPE_P / 3 - 1.2;
    for (let n = -2; n < 9; n++) for (let k = 0; k < 3; k++) strand(g, n * ROPE_P / 3 + 0 * k, t, STRANDS[(n + 9) % 3]);
    const side = g.createLinearGradient(0, 0, w, 0); // round the whole rope: lit left, shaded right
    side.addColorStop(0, 'rgba(255,240,200,0.22)'); side.addColorStop(0.35, 'rgba(255,240,200,0)'); side.addColorStop(0.7, 'rgba(10,4,0,0.12)'); side.addColorStop(1, 'rgba(10,4,0,0.55)');
    g.fillStyle = side; g.fillRect(0, 0, w, h);
  });
}

// Stamps the tile along the points (xs, ys), n+1 of them. scroll moves the twist downward as the bucket descends.
export function drawRopeStrip(ctx, tile, xs, ys, n, scroll, width = ROPE_W + 2) {
  if (!tile || !ctx) return;
  const k = tile.height / (ROPE_P * 3);                     // tile pixels per css px
  let v = (((-scroll * 0.5) % ROPE_P) + ROPE_P) % ROPE_P;   // texture position along the rope
  for (let i = 0; i < n; i++) {
    const dx = xs[i + 1] - xs[i], dy = ys[i + 1] - ys[i], len = Math.hypot(dx, dy);
    if (len < 0.01) continue;
    ctx.save(); ctx.translate(xs[i], ys[i]); ctx.rotate(Math.atan2(dy, dx) - Math.PI / 2);
    let done = 0;
    while (done < len - 0.001) { // a segment can be longer than 2 twists on big screens: stamp in chunks
      const chunk = Math.min(len - done, ROPE_P * 2), sy = (v % ROPE_P);
      ctx.drawImage(tile, 0, sy * k, tile.width, chunk * k, -width / 2, done, width, chunk + 0.7);
      done += chunk; v += chunk;
    }
    ctx.restore();
  }
}
