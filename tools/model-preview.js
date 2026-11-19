// Dev-only: renders every baked model to PNG contact sheets so a person can look at them.
// Usage: node tools/model-preview.js [outDir] [keyFilter]      (needs the @napi-rs/canvas dev dependency)
import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { DEFS, ALL_KEYS } from '../src/render/models/defs.js';
import { bakeFrameNow } from '../src/render/models/bake.js';

const out = process.argv[2] || 'preview-out', filter = process.argv[3] || '';
mkdirSync(out, { recursive: true });
const keys = ALL_KEYS.filter((k) => k.includes(filter));
const BG = { dark: '#0d1220', clay: '#2a1d17', void: '#120a24' };

function sprite(key, px, frame, frames, ss) {
  const d = DEFS[key], mesh = d.build(1, d.size === 'bucket' ? { aspect: 248 / 208, tilt: d.tilt } : undefined);
  const w = d.size === 'bucket' ? Math.round(px * 1.2) : px, h = d.size === 'bucket' ? Math.round(px * 1.0) : px;
  return { px: bakeFrameNow(d, mesh, w, h, ss, frame, frames), w, h };
}
function blit(ctx, s, x, y) {
  const c = createCanvas(s.w, s.h), g = c.getContext('2d'), id = g.createImageData(s.w, s.h);
  id.data.set(s.px); g.putImageData(id, 0, 0); ctx.drawImage(c, x, y);
}

const t0 = Date.now();
for (const px of [24, 48, 96]) for (const [bgName, bg] of Object.entries(BG)) {
  const cols = px === 96 ? 8 : 12, rows = keys.length, cell = px + 6;
  const cv = createCanvas(cols * cell + 90, rows * (px * (DEFS.bucket && keys.includes('bucket') ? 1 : 1) + 8) + 10), ctx = cv.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, cv.width, cv.height); ctx.fillStyle = '#8d97b8'; ctx.font = '11px sans-serif';
  keys.forEach((key, r) => {
    const d = DEFS[key], frames = Math.min(d.frames, cols), y = r * (px + 8) + 6;
    ctx.fillText(key, 4, y + px / 2);
    for (let f = 0; f < frames; f++) blit(ctx, sprite(key, px, Math.floor((f / frames) * d.frames), d.frames, 2), 90 + f * cell, y);
  });
  writeFileSync(`${out}/sheet-${px}-${bgName}.png`, cv.toBuffer('image/png'));
}
console.log('wrote sheets to', out, 'in', Date.now() - t0, 'ms');
