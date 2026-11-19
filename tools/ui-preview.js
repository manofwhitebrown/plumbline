// UI preview (UIART-1, dev only). Renders PNGs of the icon set to /tmp/ui-preview or the folder in argv[2].
// Usage: node tools/ui-preview.js icons [outDir]
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ICONS, iconAliases } from '../src/ui/icons.js';

const out = process.argv[3] || '/tmp/ui-preview';
mkdirSync(out, { recursive: true });

async function drawSvg(ctx, svg, x, y, size, color) {
  const src = svg.replace(/currentColor/g, color).replace('<svg ', `<svg width="${size}" height="${size}" `);
  const img = await loadImage(Buffer.from(src));
  ctx.drawImage(img, x, y, size, size);
}

export async function iconSheet(file = out + '/icons.png') {
  const ids = Object.keys(ICONS).filter((k) => !(k in iconAliases));
  const cell = 96, cols = 10, rows = Math.ceil(ids.length / cols);
  const cv = createCanvas(cols * cell, rows * cell + 8);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#10162a'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
  for (let i = 0; i < ids.length; i++) {
    const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
    const big = ids[i].startsWith('illo');
    await drawSvg(ctx, ICONS[ids[i]], x + 20, y + 8, 56, '#f2d68b');
    ctx.fillStyle = '#8d97b8'; ctx.fillText(ids[i], x + cell / 2, y + 84);
  }
  writeFileSync(file, cv.toBuffer('image/png'));
  return file;
}

if (process.argv[2] === 'icons') iconSheet().then((f) => console.log('wrote', f));

// ---- Backdrops and material tiles ----
import { BACKDROP_IDS, paintBackdrop, paintTile, TILES } from '../src/ui/theme/textures.js';
const make = (w, h) => createCanvas(w, h);

export async function backdropSheet(file = out + '/backdrops.png') {
  const W = 270, H = 480, pad = 8, n = BACKDROP_IDS.length;
  const cv = createCanvas(n * (W + pad) + pad, H + 2 * pad + 30 + 150);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#070a12'; ctx.fillRect(0, 0, cv.width, cv.height);
  for (let i = 0; i < n; i++) {
    const id = BACKDROP_IDS[i];
    const t0 = performance.now();
    const url = paintBackdrop(make, id);
    const ms = Math.round(performance.now() - t0);
    const img = await loadImage(url);
    const x = pad + i * (W + pad);
    ctx.drawImage(img, x, pad, W, H);
    // the same dark overlay the theme puts over text areas
    ctx.fillStyle = 'rgba(7,10,18,.55)'; ctx.fillRect(x, pad + H - 0, W, 0);
    ctx.fillStyle = '#eef2ff'; ctx.font = '13px sans-serif'; ctx.fillText(`${id} (${ms} ms, ${Math.round(url.length / 1024)} KB)`, x, H + pad + 20);
    // tiles row
  }
  let tx = pad;
  for (const name of Object.keys(TILES)) {
    const img = await loadImage(paintTile(make, name));
    for (let k = 0; k < 2; k++) ctx.drawImage(img, tx + k * 128, H + pad + 34);
    ctx.fillStyle = '#eef2ff'; ctx.fillText(name, tx, H + pad + 34 + 142); tx += 270;
  }
  writeFileSync(file, cv.toBuffer('image/png'));
  return file;
}
if (process.argv[2] === 'backdrops') backdropSheet().then((f) => console.log('wrote', f));
