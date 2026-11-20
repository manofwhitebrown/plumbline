// INTEGRATE-1: render-lab PNG sheet. Renders the REAL renderer for every biome with rope, bucket, a full rig,
// all five danger types, gems, and effects, then lays them out in one picture so a human can compare biomes.
//   node tools/render-sheet.js [--out dir] [--size 360x640] [--dpr 1] [--flat] [--parts]
// Needs the dev-only package @napi-rs/canvas (already in devDependencies).
//   one sheet per run: biomes-<size>.png (6 columns: clay..abyss), plus parts-<size>.png with --parts (all 26 parts).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const { createCanvas } = await import('@napi-rs/canvas');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const OUT = opt('out', 'tmp/render-sheet'), FLAT = !!opt('flat', false), PARTS = !!opt('parts', false);
const [W, H] = String(opt('size', '360x640')).split('x').map(Number), DPR = Number(opt('dpr', 1)) || 1;
globalThis.OffscreenCanvas = function OffscreenCanvas(w, h) { return createCanvas(w, h); };
const { setCanvasFactory } = await import('../src/render/canvasUtil.js');
setCanvasFactory((w, h) => createCanvas(w, h));
const { createRenderer } = await import('../src/render/index.js');
const { PART_KEYS } = await import('../src/render/partIcon.js');
mkdirSync(OUT, { recursive: true });
const BIOMES = ['clay', 'quartz', 'amber', 'magma', 'void', 'abyss'];
const DEPTH = { clay: 40, quartz: 170, amber: 350, magma: 580, void: 850, abyss: 1200 };
const HAZ = ['rock', 'bat', 'root', 'steam', 'void'];

function laneRow(beat, cols) { // every danger type shows up, plus gems of every level and one ore and one relic
  const out = [];
  for (let c = 0; c < cols; c++) {
    const k = (beat * 5 + c * 3) % 10;
    if (k < 3) out.push({ kind: 'hazard', tier: 1, hazard: HAZ[(beat + c) % 5] });
    else if (k < 8) out.push({ kind: 'gem', tier: 1 + ((beat + c) % 6) });
    else if (k === 8) out.push({ kind: 'ore', tier: 1 });
    else out.push({ kind: 'relic', tier: 3 });
  }
  return out;
}
function frame(biome, partsFrom, partsTo, strain) {
  const canvas = createCanvas(Math.round(W * DPR), Math.round(H * DPR));
  const r = createRenderer(canvas, { quality: FLAT ? 'low' : 'high', reduceMotion: false });
  r.resize(W, H, DPR);
  const cols = 5, rows = 4, cells = [];
  let n = partsFrom;
  for (let y = 0; y < rows; y++) { const row = []; for (let x = 0; x < cols; x++) row.push(n < partsTo ? PART_KEYS[n++] : null); cells.push(row); }
  const rig = { cols, rows, cells };
  const view = (d) => ({ status: 'running', depth: d, gold: 0, strain, maxStrain: 100, biomeId: biome, combo: 4 });
  let d = DEPTH[biome];
  r.setRun(view(d), rig); r.pushEvents([{ t: 'RUN_START' }]); r.setRun(view(d), rig);
  let beat = 0, acc = 0;
  for (let s = 0; s < 190; s++) {
    acc += 16;
    if (acc >= 450) { acc -= 450; beat++; d += 1; r.pushEvents([{ t: 'BEAT', i: beat, depth: d, speed: 1 }, { t: 'SPAWN', i: beat, lanes: laneRow(beat, cols) }, { t: 'STRAIN', value: strain, max: 100, delta: 0 }]); r.setRun(view(d), rig); }
    if (s === 150) r.pushEvents([{ t: 'COLLECT', lane: 1, item: { kind: 'gem', tier: 4 }, gold: 40, combo: 4, r: 3, c: 1 }, { t: 'FIRE', r: 3, c: 2, partId: 'hook' }, { t: 'CHAIN', from: { r: 3, c: 2 }, to: { r: 2, c: 2 } }]);
    r.frame(16, Math.min(0.999, acc / 450));
  }
  const dbg = r.debugStats();
  return { canvas, dbg };
}
function sheet(name, frames) {
  const gap = 6, s = createCanvas(frames.length * (W * DPR + gap) - gap, H * DPR), g = s.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, s.width, s.height);
  frames.forEach((f, i) => g.drawImage(f.canvas, i * (W * DPR + gap), 0));
  writeFileSync(join(OUT, name), s.toBuffer('image/png')); console.log('wrote', join(OUT, name));
}
const tag = `${W}x${H}${FLAT ? '-flat' : ''}`;
sheet(`biomes-${tag}.png`, BIOMES.map((b) => frame(b, 0, 20, b === 'magma' || b === 'abyss' ? 78 : 25)));
if (PARTS) sheet(`parts-${tag}.png`, [0, 20].map((from, i) => frame(['clay', 'void'][i], from, from + 20, 20)).concat([frame('amber', 6, 26, 20)]));
console.log('parts in game:', PART_KEYS.length);
process.exit(0);
