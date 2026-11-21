import test from 'node:test';
import v8 from 'node:v8';
import vm from 'node:vm';
const REAL_RANDOM = Math.random;
import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { setCanvasFactory } from '../src/render/canvasUtil.js';
globalThis.OffscreenCanvas = function OffscreenCanvas(w, h) { return createCanvas(w, h); };
setCanvasFactory((w, h) => createCanvas(w, h));
const { createRenderer } = await import('../src/render/index.js');
const { createHomeScene } = await import('../src/render/homeScene.js');
const hook = await import('../src/render/cosmeticsHook.js');
const { cosmeticById } = await import('../src/data/cosmetics.js');
const { computeLayout, createLayout } = await import('../src/render/layout.js');

v8.setFlagsFromString('--expose-gc');
const gc = vm.runInNewContext('gc');
const look = (id) => cosmeticById(id).look;
const EMPTY_RIG = { cols: 4, rows: 3, cells: [[null, null, null, null], [null, null, null, null], [null, null, null, null]] };

function frameOf(quality, strain, looks) {
  hook.setLooks(looks);
  let seed = 7; Math.random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; // same sparks every time
  const cv = createCanvas(360, 640);
  const r = createRenderer(cv, { quality, reduceMotion: true });
  r.resize(360, 640, 1);
  r.setRun({ status: 'running', depth: 40, gold: 0, strain, maxStrain: 100, biomeId: 'clay', combo: 0 }, EMPTY_RIG);
  for (let i = 0; i < 4; i++) r.frame(16, 0.5);
  const data = cv.getContext('2d').getImageData(0, 0, 360, 640).data;
  r.destroy();
  return data;
}
function diffIn(a, b, x0, y0, x1, y1) {
  let n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * 360 + x) * 4; if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 6) n++; }
  return n;
}

test('hook3 render: a worn bucket, rope and well change the Drop picture; plain looks change nothing', () => {
  const base = frameOf('high', 10, {});
  const same = frameOf('high', 10, { bucket: look('bkt_oak'), rope: look('rp_hemp'), well: look('wl_dusk') });
  assert.equal(diffIn(base, same, 0, 0, 360, 640), 0, 'free looks are the plain game');
  const L = createLayout(); computeLayout(L, 360, 640, 1, 4, 3);
  const b = frameOf('high', 10, { bucket: look('bkt_gilded') });
  assert.ok(diffIn(base, b, L.cx - L.bucketW / 2, L.top, L.cx + L.bucketW / 2, L.top + L.bucketH) > 200, 'bucket changed');
  assert.equal(diffIn(base, b, 0, 0, 360, Math.floor(L.top) - 14), 0, 'nothing changed above the bucket');
  const w = frameOf('high', 10, { well: look('wl_teal') });
  assert.ok(diffIn(base, w, 0, 100, 60, 600) > 1000, 'well walls changed');
});

test('hook3 render: the tile plate inside the bucket is never tinted', () => {
  const L = createLayout(); computeLayout(L, 360, 640, 1, 4, 3);
  const base = frameOf('high', 10, {}), b = frameOf('high', 10, { bucket: look('bkt_gilded') });
  const x0 = Math.ceil(L.cx - L.bucketW / 2 + L.pad + 8), x1 = Math.floor(L.cx + L.bucketW / 2 - L.pad - 8);
  const y0 = Math.ceil(L.top + L.rim + 8), y1 = Math.floor(L.top + L.rim + L.tile * L.rows - 4);
  const n = diffIn(base, b, x0, y0, x1, y1), area = (x1 - x0) * (y1 - y0);
  assert.ok(n / area < 0.04, 'plate area unchanged, changed share ' + (n / area).toFixed(3));
});

test('hook3 render: the rope tint fades as Strain rises so the warning colours stay', () => {
  const calm0 = frameOf('high', 5, {}), calm1 = frameOf('high', 5, { rope: look('rp_ember') });
  const hot0 = frameOf('high', 92, {}), hot1 = frameOf('high', 92, { rope: look('rp_ember') });
  assert.ok(diffIn(calm0, calm1, 170, 0, 190, 90) > 20, 'tinted when calm');
  assert.equal(diffIn(hot0, hot1, 170, 0, 190, 90), 0, 'no tint near a snap');
});

test('hook3 render: low quality skips the full-screen well wash but keeps the small tints', () => {
  const L = createLayout(); computeLayout(L, 360, 640, 1, 4, 3);
  const base = frameOf('low', 10, {}), w = frameOf('low', 10, { well: look('wl_teal') }), b = frameOf('low', 10, { bucket: look('bkt_gilded') });
  assert.equal(diffIn(base, w, 0, 100, 60, 600), 0, 'no wash on low');
  assert.ok(diffIn(base, b, L.cx - L.bucketW / 2, L.top, L.cx + L.bucketW / 2, L.top + L.bucketH) > 100, 'bucket tint stays');
});

test('hook3 render: no per-frame allocation (gradients are built once; heap stays flat)', () => {
  hook.setLooks({ bucket: look('bkt_gilded'), rope: look('rp_ember'), well: look('wl_teal') });
  const cv = createCanvas(360, 640), ctx = cv.getContext('2d');
  let grads = 0;
  for (const k of ['createLinearGradient', 'createRadialGradient']) { const o = ctx[k].bind(ctx); ctx[k] = (...a) => { grads++; return o(...a); }; }
  const L = createLayout(); computeLayout(L, 360, 640, 1, 4, 3);
  const home = { wellCx: 180, wellCy: 400, wellRx: 80, wellRy: 24, drumY: 300, drumR: 6.5, bucketW: 32, bucketY: 380 };
  const rope = { sample(u, out) { out.x = 180; out.y = u * 300; return true; } };
  const one = () => { hook.well(ctx, 360, 640); hook.rope(ctx, rope, 0.2); hook.bucket(ctx, L, 1000, 3, 0.1); hook.homeWell(ctx, home); hook.homeLive(ctx, home, 2); };
  one(); const first = grads;
  assert.ok(first >= 1 && first <= 2, 'built once: ' + first);
  for (let i = 0; i < 200; i++) one(); // warm up
  // [FIX-1] Flaky before: heapUsed was read with no garbage collection, so short-lived garbage from 20000 frames counted
  // as growth whenever a big collection had not run yet (6.9 MB against a 6 MB limit on a slow or busy machine).
  // Now: collect first, measure only what is still alive afterwards, and take the best of 3 rounds. A real leak
  // (something kept per frame) grows every round; the gradient counter below still catches a gradient built per frame.
  const settle = () => { gc(); gc(); return process.memoryUsage().heapUsed; };
  let grew = Infinity;
  for (let k = 0; k < 3; k++) {
    const before = settle();
    for (let i = 0; i < 20000; i++) one();
    grew = Math.min(grew, settle() - before);
  }
  assert.equal(grads, first, 'no new gradients per frame');
  assert.ok(grew < 2 * 1024 * 1024, 'heap kept ' + grew + ' bytes after 20000 frames (best of 3)');
});

test('hook3 render: Home scene draws with Looks and keeps its memory the same', () => {
  globalThis.document = { createElement: () => createCanvas(10, 10) };
  const mk = () => { const s = createHomeScene({ crew: 3, quality: 'high', reduceMotion: true }); s.resize(360, 640, 1); return s; };
  hook.setLooks({});
  const a = mk(), da = a.canvas.getContext('2d').getImageData(0, 0, 360, 640).data, mem = a.memoryBytes();
  hook.setLooks({ well: look('wl_moss'), rope: look('rp_blue'), bucket: look('bkt_copper') });
  const b = mk(), db = b.canvas.getContext('2d').getImageData(0, 0, 360, 640).data;
  let n = 0; for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 6) n++;
  assert.ok(n > 500, 'Home picture changed: ' + n);
  assert.equal(b.memoryBytes(), mem, 'no new textures');
  a.destroy(); b.destroy(); hook.setLooks({}); delete globalThis.document;
});

test('hook3 render: the preview paints and bad input never throws', () => {
  const cv = createCanvas(200, 140), ctx = cv.getContext('2d');
  hook.paintPreview(ctx, 200, 140, { bucket: cosmeticById('bkt_gilded'), rope: cosmeticById('rp_star'), well: cosmeticById('wl_rose') });
  hook.paintPreview(ctx, 200, 140, null); hook.paintPreview(null, 1, 1, {});
  hook.bucket(ctx, null, 0, 0, 0); hook.rope(ctx, null, 0); hook.rope(ctx, {}, 0); hook.well(null, 1, 1); hook.homeWell(ctx, null); hook.homeLive(null, null, 0);
  assert.ok(true);
});
