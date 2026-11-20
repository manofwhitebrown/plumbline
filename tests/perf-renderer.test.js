import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { setCanvasFactory } from '../src/render/canvasUtil.js';
import { GOV, TIERS } from '../src/render/governor.js';
globalThis.OffscreenCanvas = function OffscreenCanvas(w, h) { return createCanvas(w, h); };
setCanvasFactory((w, h) => createCanvas(w, h));
const { createRenderer } = await import('../src/render/index.js');
const { models } = await import('../src/render/models/index.js');

function make(quality) {
  const r = createRenderer(createCanvas(360, 640), { quality, reduceMotion: false });
  r.resize(360, 640, 1);
  r.setRun({ status: 'running', depth: 40, gold: 0, strain: 10, maxStrain: 100, biomeId: 'clay', combo: 0 }, { cols: 4, rows: 3, cells: [[null, null, null, null], [null, null, null, null], [null, null, null, null]] });
  return r;
}
const run = (r, ms, n) => { for (let i = 0; i < n; i++) r.frame(ms, 0.5); };

test('perf: in auto, frames a little over 20 ms lower the tier before the emergency ladder, and particles and baking follow', () => {
  const r = make('auto');
  r.debugBurst(1000); assert.ok(r.debugStats().particles <= 300, 'cap 300 at high');
  assert.equal(r.debugStats().tier, 'high'); assert.equal(models.enabled, true);
  run(r, 22, GOV.window + 2); // 22 ms is slow for the governor but under the 24 ms emergency line
  assert.equal(r.debugStats().tierStep, 1); assert.equal(r.debugStats().quality, 'high');
  run(r, 22, GOV.window * 2 + 4);
  const d = r.debugStats(); assert.equal(d.tierStep, 3, 'minimal after three slow windows'); assert.equal(d.quality, 'high');
  assert.equal(models.enabled, false, 'baking is off at reduced and below');
  for (let i = 0; i < 40; i++) r.frame(16, 0.5); // let old particles die
  r.debugBurst(1000); assert.ok(r.debugStats().particles <= Math.ceil(300 * TIERS[3].particles), 'particle cap shrinks with the tier: ' + r.debugStats().particles);
  r.destroy();
});
test('perf: a hand-picked quality is never overridden by the governor, and auto turns it back on', () => {
  const r = make('auto');
  r.setQuality('high'); run(r, 30, 200); assert.equal(r.debugStats().tierStep, 0); assert.equal(r.debugStats().quality, 'high');
  r.setQuality('auto'); run(r, 22, GOV.window + 2); assert.equal(r.debugStats().tierStep, 1, 'auto lets the governor work again');
  r.setQuality('low'); assert.equal(r.debugStats().quality, 'low'); r.debugBurst(1000);
  assert.ok(r.debugStats().particles <= Math.ceil(110 * TIERS[3].particles) + 1, 'low quality is the smallest cap');
  r.setQuality('auto'); assert.equal(r.debugStats().quality, 'high', 'auto after low starts fresh');
  r.destroy();
});
test('perf: the baker pauses when disabled and restarts when enabled; slice size shrinks as frames get slower', async () => {
  const { createModels } = await import('../src/render/models/index.js');
  const { sliceBudgetMs } = await import('../src/render/models/plan.js');
  assert.ok(sliceBudgetMs(30) < sliceBudgetMs(20) && sliceBudgetMs(20) < sliceBudgetMs(16));
  const m = createModels({ auto: false, makeCanvas: (w, h) => createCanvas(w, h) });
  assert.equal(m.bake(['gem:1', 'gem:2'], 41, 'high'), true);
  const left = m.step(1); assert.ok(left > 0, 'bake is spread over steps, a 1 ms slice never finishes it');
  m.setEnabled(false); assert.equal(m.getSprite('gem:1', 0), null);
  m.setEnabled(true); let guard = 0; while (m.step(50) > 0 && guard++ < 200); assert.ok(m.ready('gem:1'));
});
