// [PERF-1] Texture memory budget. Counts the canvases that are still ALIVE after a long dive through the biomes
// (a rebuilt canvas that was let go does not count), at a mid-range phone size: 360x800 css px at dpr 2.
// Budget: the Drop scene stays under 24 MB; the Home scene is measured on its own (the screens never live together).
import test from 'node:test';
import assert from 'node:assert/strict';
import v8 from 'node:v8';
import vm from 'node:vm';
import { createCanvas } from '@napi-rs/canvas';
import { setCanvasFactory } from '../src/render/canvasUtil.js';

v8.setFlagsFromString('--expose-gc');
const gc = vm.runInNewContext('gc');
const MB = 1024 * 1024;
export const BUDGET = { totalMB: 24, depthMB: 9, modelsMB: 7.5, flatMB: 1, biggestMB: 4.1, homeMB: 6.5 };
const rec = [];
function group(chain) { return chain.startsWith('depth') ? 'depth' : chain.startsWith('models') ? 'models' : /^(well|polish)/.test(chain) ? 'flat' : 'other'; }
function mk(w, h) {
  const c = createCanvas(w, h);
  const chain = new Error().stack.split('\n').map((s) => (s.match(/src\/render\/([^:)]*)/) || [])[1]).filter((f) => f && f !== 'canvasUtil.js')[0] || '?';
  rec.push({ ref: new WeakRef(c), w, h, g: group(chain), chain });
  return c;
}
globalThis.OffscreenCanvas = function OffscreenCanvas(w, h) { return mk(w, h); };
setCanvasFactory(mk);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function liveBytes() { await sleep(30); gc(); await sleep(30); gc(); const out = { total: 0, depth: 0, models: 0, flat: 0, other: 0, biggest: 0, n: 0 }; for (const c of rec) if (c.ref.deref()) { const b = c.w * c.h * 4; out.total += b; out[c.g] += b; out.biggest = Math.max(out.biggest, b); out.n++; } return out; }

const { createRenderer } = await import('../src/render/index.js');
const { models } = await import('../src/render/models/index.js');
const { createHomeScene } = await import('../src/render/homeScene.js');
const W = 360, H = 800, DPR = 2, DEPTH = { clay: 40, magma: 580, void: 850, abyss: 1200 };
const cells = () => [0, 1, 2, 3].map(() => [null, null, null, null, null]);

test('perf: Drop scene texture memory stays inside 24 MB after a dive through the biomes', async () => {
  const r = createRenderer(createCanvas(W * DPR, H * DPR), { quality: 'high', reduceMotion: false });
  r.resize(W, H, DPR);
  for (const b of Object.keys(DEPTH)) {
    r.setRun({ status: 'running', depth: DEPTH[b], gold: 0, strain: 20, maxStrain: 100, biomeId: b, combo: 3 }, { cols: 5, rows: 4, cells: cells() });
    for (let i = 0; i < 110; i++) r.frame(23, 0.5);
  }
  let g = 0; while (models.step(200) > 0 && g++ < 500);
  for (let i = 0; i < 30; i++) r.frame(23, 0.5);
  const m = await liveBytes();
  const mb = (x) => (x / MB).toFixed(2) + ' MB';
  const info = 'total ' + mb(m.total) + ' depth ' + mb(m.depth) + ' models ' + mb(m.models) + ' flat ' + mb(m.flat) + ' other ' + mb(m.other) + ' biggest ' + mb(m.biggest);
  assert.ok(m.total <= BUDGET.totalMB * MB, 'over the 24 MB budget: ' + info);
  assert.ok(m.depth <= BUDGET.depthMB * MB, 'walls (depth layer) over budget: ' + info);
  assert.ok(m.models <= BUDGET.modelsMB * MB, 'baked models over budget: ' + info);
  assert.ok(m.flat <= BUDGET.flatMB * MB, 'the flat well and polish wall strips must be freed while depth covers them: ' + info);
  assert.ok(m.biggest <= BUDGET.biggestMB * MB, 'one canvas is too big: ' + info);
  assert.ok(r.debugStats().covered >= 90, 'the depth layer covered the well for the whole dive');
  r.destroy();
});
test('perf: Home scene stays under 6.5 MB at dpr 2 on a big phone, and the 8 crew size', () => {
  for (const [w, h] of [[360, 800], [430, 932]]) {
    const hs = createHomeScene({ crew: 8 }); hs.resize(w, h, 2); hs.frame(1.2);
    assert.ok(hs.memoryBytes() <= BUDGET.homeMB * MB, 'home ' + w + 'x' + h + ': ' + (hs.memoryBytes() / MB).toFixed(2) + ' MB');
    hs.destroy();
  }
});
