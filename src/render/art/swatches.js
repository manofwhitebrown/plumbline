// Toolkit swatches: show what each noise type looks like (used by the art lab).
import { registerArt } from './registry.js';
import { fbm, ridged, worley } from './noise.js';

function fill(ctx, w, h, fn) {
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = Math.max(0, Math.min(255, fn(x, y) * 255)), i = (y * w + x) * 4;
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}
const cell = { f1: 0, edge: 0, id: 0 };
registerArt({ name: 'noise: fbm', group: 'toolkit', w: 96, h: 96, paint: (c, w, h, q) => fill(c, w, h, (x, y) => fbm(x / 16, y / 16, 1, q === 'low' ? 2 : 5, 6)) });
registerArt({ name: 'noise: ridged', group: 'toolkit', w: 96, h: 96, paint: (c, w, h) => fill(c, w, h, (x, y) => ridged(x / 20, y / 20, 2, 3, 5)) });
registerArt({ name: 'noise: worley cracks', group: 'toolkit', w: 96, h: 96, paint: (c, w, h) => fill(c, w, h, (x, y) => Math.min(1, worley(x / 16, y / 16, 3, 6, cell).edge * 3)) });
