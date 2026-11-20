// INTEGRATE-1: renders the canvas Home scene at 8 crew (and 3) to PNG. node tools/home-sheet.js [--out dir]
import { mkdirSync, writeFileSync } from 'node:fs';
const { createCanvas } = await import('@napi-rs/canvas');
const i = process.argv.indexOf('--out'), OUT = i < 0 ? 'tmp/home-sheet' : process.argv[i + 1];
const { setCanvasFactory } = await import('../src/render/canvasUtil.js');
setCanvasFactory((w, h) => createCanvas(w, h));
globalThis.document = { createElement: () => createCanvas(1, 1) };
const { createHomeScene } = await import('../src/render/homeScene.js');
mkdirSync(OUT, { recursive: true });
const sizes = [[320, 568], [360, 640], [430, 932]], shots = [];
for (const [w, h] of sizes) for (const crew of [8, 3]) { const s = createHomeScene({ crew, reduceMotion: true }); s.resize(w, h, 1); s.frame(0.5); shots.push({ c: s.canvas, w, h }); }
const gap = 6, W = shots.reduce((a, s) => a + s.w + gap, -gap), H = Math.max(...shots.map((s) => s.h)), sheet = createCanvas(W, H), g = sheet.getContext('2d');
g.fillStyle = '#000'; g.fillRect(0, 0, W, H); let x = 0; for (const s of shots) { g.drawImage(s.c, x, 0); x += s.w + gap; }
writeFileSync(OUT + '/home.png', sheet.toBuffer('image/png')); console.log('wrote', OUT + '/home.png');
process.exit(0);
