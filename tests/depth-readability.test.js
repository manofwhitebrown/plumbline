// Pixel check with the real renderer: the lane band must be at least as calm as the flat well and not much darker.
// Needs the dev-only canvas package (npm i --no-save @napi-rs/canvas); skipped when it is not installed.
import { test } from 'node:test';
import assert from 'node:assert/strict';

let napi = null;
try { napi = await import('@napi-rs/canvas'); } catch (e) { /* skipped below */ }

function stats(c, W, H) {
  const g = c.getContext('2d'), x0 = Math.round(W * 0.3), w = Math.round(W * 0.4), y0 = Math.round(H * 0.55), h = Math.round(H * 0.25);
  const d = g.getImageData(x0, y0, w, h).data; let s = 0, s2 = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) { const v = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; s += v; s2 += v * v; n++; }
  const m = s / n; return { mean: m, std: Math.sqrt(Math.max(0, s2 / n - m * m)) };
}

test('lane band: depth is not busier and not much darker than the flat well', { skip: !napi && 'dev-only @napi-rs/canvas not installed', timeout: 120000 }, async () => {
  const { createCanvas } = napi;
  globalThis.OffscreenCanvas = function OffscreenCanvas(w, h) { return createCanvas(w, h); };
  const { setCanvasFactory } = await import('../src/render/canvasUtil.js');
  setCanvasFactory((w, h) => createCanvas(w, h));
  const { createRenderer } = await import('../src/render/index.js');
  const rig = { cols: 5, rows: 3, cells: [[null, null, null, null, null], [null, null, null, null, null], ['hook', 'hook', 'hook', 'hook', 'hook']] };
  for (const [W, H] of [[360, 640], [430, 932]]) for (const [b, dep] of [['clay', 50], ['quartz', 180], ['magma', 560], ['void', 850], ['abyss', 1200]]) {
    const res = {};
    for (const q of ['low', 'high']) {
      const c = createCanvas(W, H), r = createRenderer(c, { quality: q }); r.resize(W, H, 1);
      r.pushEvents([{ t: 'RUN_START' }]); r.setRun({ status: 'running', depth: dep, strain: 20, maxStrain: 100, biomeId: b, combo: 0 }, rig);
      for (let i = 0; i < 150; i++) r.frame(16, 0.2);
      res[q] = stats(c, W, H); r.destroy();
    }
    assert.ok(res.high.std <= res.low.std * 1.15 + 0.004, `${b} ${W}x${H}: busier ${res.high.std} vs ${res.low.std}`);
    assert.ok(res.high.mean >= res.low.mean * 0.5, `${b} ${W}x${H}: too dark ${res.high.mean} vs ${res.low.mean}`);
  }
});
