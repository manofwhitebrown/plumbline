// Idle rules: nothing animates when Reduce motion is on (Home) or the tab is hidden (Drop renderer). [FINISH-3]
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { setCanvasFactory } from '../src/render/canvasUtil.js';
globalThis.OffscreenCanvas = function OffscreenCanvas(w, h) { return createCanvas(w, h); };
setCanvasFactory((w, h) => createCanvas(w, h));
const { createRenderer } = await import('../src/render/index.js');
const { createHomeScene } = await import('../src/render/homeScene.js');

test('Home scene with Reduce motion never asks for another animation frame', () => {
  let asked = 0;
  const prevR = globalThis.requestAnimationFrame, prevC = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = () => { asked++; return 1; };
  globalThis.cancelAnimationFrame = () => {};
  try {
    const s = createHomeScene({ crew: 3, quality: 'high', reduceMotion: true, canvas: createCanvas(360, 400) });
    s.resize && s.resize(360, 400, 1);
    s.start(); s.start();
    assert.equal(asked, 0, 'start() under Reduce motion draws once and schedules nothing');
    s.setReduceMotion(false); s.start();
    assert.equal(asked, 1, 'without Reduce motion it runs');
    s.setReduceMotion(true);
    s.destroy();
  } finally { globalThis.requestAnimationFrame = prevR; globalThis.cancelAnimationFrame = prevC; }
});

test('Drop renderer does no drawing work while hidden', () => {
  const cv = createCanvas(360, 640);
  const r = createRenderer(cv, { quality: 'high', reduceMotion: false });
  r.resize(360, 640, 1);
  r.setRun({ status: 'running', depth: 40, gold: 0, strain: 10, maxStrain: 100, biomeId: 'clay', combo: 0 }, { cols: 4, rows: 3, cells: [[null, null, null, null], [null, null, null, null], [null, null, null, null]] });
  r.frame(16, 0.5);
  const calls = { n: 0 };
  const ctx = cv.getContext('2d');
  const orig = ctx.fillRect.bind(ctx);
  ctx.fillRect = (...a) => { calls.n++; return orig(...a); };
  r.setHidden(true);
  for (let i = 0; i < 5; i++) r.frame(16, 0.5);
  assert.equal(calls.n, 0, 'no canvas drawing while hidden');
  r.setHidden(false);
  r.frame(16, 0.5);
  assert.ok(calls.n > 0, 'drawing resumes when shown');
  ctx.fillRect = orig;
});
