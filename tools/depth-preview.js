// DEPTH-1 preview tool. Renders the REAL renderer (with the depth layer wired in) to PNG so a human can look at it.
//   node tools/depth-preview.js [--out dir] [--sizes 360x640,430x932] [--biomes clay,quartz] [--flat] [--pulse] [--bench]
// Needs the dev-only package @napi-rs/canvas:  npm i --no-save @napi-rs/canvas   (it is not a shipped dependency)
// --flat    renders the old flat well (quality 'low') for a before/after comparison
// --bench   times the depth layer alone (update + drawWalls + drawForeground) on the CPU canvas and prints p50/p95
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

let napi;
try { napi = await import('@napi-rs/canvas'); } catch (e) { console.error('depth-preview: install the dev-only canvas first:  npm i --no-save @napi-rs/canvas'); process.exit(1); }
const { createCanvas } = napi;

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i < 0 ? def : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const OUT = opt('out', 'tmp/depth-preview'), FLAT = !!opt('flat', false), PULSE = !!opt('pulse', false), BENCH = !!opt('bench', false);
const SIZES = String(opt('sizes', '360x640,430x932')).split(',').map((s) => s.split('x').map(Number));
const BIOMES = String(opt('biomes', 'clay,quartz,amber,magma,void,abyss')).split(',');
const RANGE = { clay: [0, 100], quartz: [100, 250], amber: [250, 450], magma: [450, 700], void: [700, 1000], abyss: [1000, 1400] };
const FRACS = [0.05, 0.3, 0.55, 0.85, 0.985];

// Off-screen canvases for the renderer and for polish (it looks for OffscreenCanvas).
globalThis.OffscreenCanvas = function OffscreenCanvas(w, h) { return createCanvas(w, h); };
const { setCanvasFactory } = await import('../src/render/canvasUtil.js');
setCanvasFactory((w, h) => createCanvas(w, h));
const { createRenderer } = await import('../src/render/index.js');
const { createDepth } = await import('../src/render/depth/index.js');
const { slotDepth } = await import('../src/render/depth/foreground.js');
const NOFG = !!opt('nofg', false);
const DZ = [1.9, 2.6, 1.9, 3.2, 1.7];
// move a requested depth to the nearest silhouette slot so every sheet frame shows one (use --nofg to keep exact depths)
function withSilhouette(depth, i) { const side = i % 2; let k = Math.floor(depth / 22) - 1, z = slotDepth(side, k); while (z - DZ[i] < depth) z = slotDepth(side, ++k); return z - DZ[i]; }

mkdirSync(OUT, { recursive: true });
const HAZ = { clay: ['rock'], quartz: ['rock', 'bat'], amber: ['bat', 'root'], magma: ['root', 'steam'], void: ['steam', 'void'], abyss: ['rock', 'bat', 'root', 'steam', 'void'] };
function lanesFor(biome, beat, cols) {
  const out = [];
  for (let c = 0; c < cols; c++) {
    const h = ((beat * 7 + c * 13) % 11) / 11;
    if (h < 0.3) out.push({ kind: 'hazard', tier: 1, hazard: HAZ[biome][(beat + c) % HAZ[biome].length] });
    else if (h < 0.85) out.push({ kind: 'gem', tier: 1 + ((beat + c) % 5) });
    else out.push({ kind: 'empty', tier: 1 });
  }
  return out;
}

function lum(d, o) { return (0.2126 * d[o] + 0.7152 * d[o + 1] + 0.0722 * d[o + 2]) / 255; }
// mean luminance and standard deviation of the lane band (between the wall margin and the other margin), below the bucket
export function laneStats(canvas, x0, x1, y0, y1, dpr) {
  const g = canvas.getContext('2d'), X0 = Math.round(x0 * dpr), Y0 = Math.round(y0 * dpr), w = Math.round((x1 - x0) * dpr), h = Math.round((y1 - y0) * dpr);
  const d = g.getImageData(X0, Y0, w, h).data; let s = 0, s2 = 0, n = 0;
  for (let i = 0; i < d.length; i += 4 * 3) { const v = lum(d, i); s += v; s2 += v * v; n++; }
  const m = s / n; return { mean: m, std: Math.sqrt(Math.max(0, s2 / n - m * m)) };
}

async function renderFrame(biome, depth, W, H, dpr, cols, flat, pulse) {
  const canvas = createCanvas(Math.round(W * dpr), Math.round(H * dpr));
  const r = createRenderer(canvas, { quality: flat ? 'low' : 'high', reduceMotion: false });
  r.resize(W, H, dpr);
  const rig = { cols, rows: 3, cells: [[null, null, null, null, null], [null, null, null, null, null], ['hook', 'hook', 'hook', 'hook', 'hook']].map((row) => row.slice(0, cols)) };
  const view = (d, strain) => ({ status: 'running', depth: d, gold: 0, strain, maxStrain: 100, biomeId: biome, combo: 3 });
  r.setRun(view(depth, 20), rig);
  const BEAT_MS = 450; let beat = 0, acc = 0, d = depth;
  r.pushEvents([{ t: 'RUN_START' }]); r.setRun(view(depth, 20), rig);
  for (let step = 0; step < 150; step++) { // ~2.4 s: enough for items to fill the lanes and the textures to build
    acc += 16;
    if (acc >= BEAT_MS) { acc -= BEAT_MS; beat++; d += 1; r.pushEvents([{ t: 'BEAT', i: beat, depth: d, speed: 1 }, { t: 'SPAWN', i: beat, lanes: lanesFor(biome, beat, cols) }, { t: 'STRAIN', value: 20, max: 100, delta: 0 }]); }
    r.frame(16, Math.min(0.999, acc / BEAT_MS));
  }
  if (pulse) { r.pushEvents([{ t: 'COLLECT', lane: 0, item: { kind: 'gem', tier: 4 }, gold: 5, combo: 4, r: 2, c: 0 }]); for (let i = 0; i < 4; i++) r.frame(16, acc / BEAT_MS); }
  return { canvas, r };
}

if (BENCH) {
  const [W, H] = SIZES[0], dpr = 1, c = createCanvas(W, H), ctx = c.getContext('2d');
  const Q = String(opt('quality', 'high')); const dl = createDepth({ quality: Q, govern: false }); dl.resize(W, H, dpr); // governor off: we want the raw cost
  const lanes = new Float32Array(5); for (let i = 0; i < 5; i++) lanes[i] = 180 + (i - 2) * 56;
  const st = { depth: 40, biomeId: 'clay', strain01: 0.3, danger: 0.2, speed: 1, bucket: { x: 180, y: 240 }, lanes, laneCount: 5, arriveY: 330, w: W, h: H, time: 0 };
  const times = [];
  for (let f = 0; f < 900; f++) {
    st.depth += 0.035; st.time += 16; st.strain01 = 0.3 + 0.2 * Math.sin(f / 70);
    if (f % 40 === 0) dl.pushEvents([{ t: 'COLLECT', lane: f % 5, item: { tier: 1 + (f % 5) } }]);
    const t0 = performance.now(); dl.update(16, st); ctx.save(); dl.drawWalls(ctx, st); dl.drawForeground(ctx, st); ctx.restore(); const t1 = performance.now();
    if (f >= 300) times.push(t1 - t0);
  }
  times.sort((a, b) => a - b);
  const q = (p) => times[Math.min(times.length - 1, Math.floor(p * times.length))].toFixed(2);
  console.log(`depth layer alone (${Q}), ${W}x${H}, CPU canvas (not a phone): p50 ${q(0.5)} ms  p95 ${q(0.95)} ms  p99 ${q(0.99)} ms  max ${times[times.length - 1].toFixed(2)} ms`);
  console.log(JSON.stringify(dl.debug()));
  process.exit(0);
}

for (const [W, H] of SIZES) {
  const dpr = 1;
  for (const biome of BIOMES) {
    const [lo, hi] = RANGE[biome]; const frames = [];
    for (let fi = 0; fi < FRACS.length; fi++) { const f = FRACS[fi]; let depth = lo + (hi - lo) * f; if (!NOFG && !FLAT) depth = withSilhouette(depth, fi); frames.push({ depth, ...(await renderFrame(biome, depth, W, H, dpr, 5, FLAT, PULSE)) }); }
    const sheet = createCanvas(W * frames.length + 8 * (frames.length - 1), H), g = sheet.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, sheet.width, sheet.height);
    frames.forEach((fr, i) => g.drawImage(fr.canvas, i * (W + 8), 0));
    const name = `${biome}-${W}x${H}${FLAT ? '-flat' : ''}${PULSE ? '-pulse' : ''}.png`;
    writeFileSync(join(OUT, name), sheet.toBuffer('image/png'));
    const stats = frames.map((fr) => laneStats(fr.canvas, W * 0.3, W * 0.7, H * 0.5, H * 0.8, dpr)).map((s) => `${s.mean.toFixed(3)}/${s.std.toFixed(3)}`).join('  ');
    console.log(name, 'lane-band mean/std per depth:', stats);
  }
}
